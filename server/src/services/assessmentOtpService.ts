import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentOtp from '../models/AssessmentOtp';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';

/**
 * OTP service for assessment registration — sends a 6-digit code over WhatsApp
 * (reusing the tenant's WhatsApp Cloud API credentials) and verifies it.
 *
 * If WhatsApp isn't configured for the tenant, the code is logged server-side
 * and returned as `devCode` so non-production environments still work.
 */

const OTP_TTL_MS = 10 * 60 * 1000;     // 10 minutes
const RESEND_THROTTLE_MS = 30 * 1000;  // 30s between sends
const MAX_ATTEMPTS = 5;

const hash = (code: string) => crypto.createHash('sha256').update(code).digest('hex');
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

type WaCreds = { phoneNumberId: string; accessToken: string };

/**
 * Ordered list of WhatsApp credential sets to try, most-specific first:
 *   1) the tenant's CRM Lead-Source WhatsApp connection
 *   2) the platform/env config (Platform Settings → Meta/WhatsApp)
 * We return ALL valid candidates (not just the first) so a stale/expired token
 * on one automatically falls back to the other — otherwise a dead CRM token
 * silently blocks every OTP even when Platform Settings is configured correctly.
 */
async function getWhatsAppCredentialCandidates(tenantId: string): Promise<WaCreds[]> {
  const out: WaCreds[] = [];

  // 1) Per-tenant WhatsApp connection (Lead Source config)
  try {
    const sourceConfig = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
    const wa = (sourceConfig as any)?.whatsApp;
    if (wa?.isConnected && wa?.config?.phoneNumberId) {
      const tokens = await getDecryptedTokens(tenantId);
      const accessToken = tokens?.whatsApp?.accessToken || '';
      if (accessToken) out.push({ phoneNumberId: wa.config.phoneNumberId, accessToken });
    }
  } catch { /* ignore — fall through to env */ }

  // 2) Platform/env config (Platform Settings values are mirrored to process.env)
  const envPid = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const envTok = process.env.WHATSAPP_ACCESS_TOKEN || '';
  if (envPid && envTok && !out.some((c) => c.phoneNumberId === envPid)) {
    out.push({ phoneNumberId: envPid, accessToken: envTok });
  }

  return out;
}

// OTP via an approved WhatsApp Authentication template. Required to message a
// candidate who hasn't opened a 24h session (i.e. every new lead) — plain text
// is rejected by Meta in that case. Configure with:
//   WHATSAPP_OTP_TEMPLATE       (template name, e.g. "cb_otp")  — enables template mode
//   WHATSAPP_OTP_TEMPLATE_LANG  (language code, default "en")
//   WHATSAPP_OTP_TEMPLATE_BUTTON ("false" to omit the copy-code button param)
// Read at call time so Platform Settings UI values (mirrored to process.env) apply.
const otpTemplate = () => process.env.WHATSAPP_OTP_TEMPLATE || '';
const otpTemplateLang = () => process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'en';
const otpTemplateHasButton = () => String(process.env.WHATSAPP_OTP_TEMPLATE_BUTTON || 'true') !== 'false';

async function waPost(creds: { phoneNumberId: string; accessToken: string }, payload: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[whatsapp] send failed', res.status, err.slice(0, 400));
      // Extract Meta's human message if present.
      let msg = err.slice(0, 200);
      try { msg = JSON.parse(err)?.error?.message || msg; } catch { /* keep raw */ }
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e: any) {
    console.warn('[whatsapp] send error', e?.message);
    return { ok: false, error: e?.message || 'network error' };
  }
}

async function sendWhatsAppOtp(phone: string, code: string, message: string, creds: { phoneNumberId: string; accessToken: string }): Promise<boolean> {
  const to = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!to) return false;

  // Preferred: approved Authentication template (works for cold recipients)
  if (otpTemplate()) {
    const components: any[] = [
      { type: 'body', parameters: [{ type: 'text', text: code }] },
    ];
    // Auth templates carry an OTP "copy code" / one-tap button that echoes the code
    if (otpTemplateHasButton()) {
      components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
    }
    const r = await waPost(creds, {
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: otpTemplate(), language: { code: otpTemplateLang() }, components },
    });
    if (r.ok) return true;
  }

  // Fallback: plain text — only delivers if the user messaged us in the last 24h
  return (await waPost(creds, { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } })).ok;
}

/** Normalize a phone to WhatsApp's `to` format (digits, default India country code). */
function normalizeTo(phone: string): string {
  let to = String(phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (to.length === 10) to = '91' + to;
  return to;
}

// Generic notification template — required to reach recipients OUTSIDE the 24h session
// window (i.e. every battle registrant). Create + approve a template in Meta Business
// Manager with a single body variable {{1}} and set its name here (via Platform Settings
// or env). Without it, sends fall back to plain text, which Meta rejects for cold users.
const notifyTemplate = () => process.env.WHATSAPP_NOTIFY_TEMPLATE || '';
const notifyTemplateLang = () => process.env.WHATSAPP_NOTIFY_TEMPLATE_LANG || 'en';

/**
 * Send a WhatsApp message to a phone for a tenant. If a notification template is
 * configured (WHATSAPP_NOTIFY_TEMPLATE) it sends via template with the message as the
 * single body variable — this DELIVERS to cold recipients. Otherwise it falls back to
 * free-form text (only delivers inside the 24h window / to opted-in users).
 * Returns { ok, error? } with Meta's error message on failure.
 */
export async function sendWhatsAppText(tenantId: string, phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const to = normalizeTo(phone);
  if (!to) return { ok: false, error: 'invalid phone' };
  const candidates = await getWhatsAppCredentialCandidates(tenantId);
  if (!candidates.length) return { ok: false, error: 'WhatsApp is not configured for this tenant (set it in Platform Settings).' };

  const tpl = notifyTemplate();
  // Template body variables reject newlines/tabs and >4 consecutive spaces — sanitize.
  const oneLine = String(message).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();

  let lastError: string | undefined;
  for (const creds of candidates) {
    const payload = tpl
      ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl, language: { code: notifyTemplateLang() }, components: [{ type: 'body', parameters: [{ type: 'text', text: oneLine }] }] } }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } };
    const r = await waPost(creds, payload);
    if (r.ok) return { ok: true };
    lastError = r.error;
  }
  return { ok: false, error: lastError || 'send failed' };
}

export interface OtpSendResult {
  sent: boolean;
  channel: 'whatsapp' | 'none';
  devCode?: string;       // present only when no channel is configured (non-prod)
  throttledSeconds?: number;
}

/** Create (or refresh) and send an OTP for a submission token. */
export async function sendOtp(tenantId: string, token: string, phone: string): Promise<OtpSendResult> {
  const existing = await AssessmentOtp.findOne({ token });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_THROTTLE_MS) {
    return { sent: false, channel: 'none', throttledSeconds: Math.ceil((RESEND_THROTTLE_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000) };
  }

  const code = genCode();
  await AssessmentOtp.findOneAndUpdate(
    { token },
    { tenantId, token, phone, codeHash: hash(code), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    { upsert: true, new: true }
  );

  const message = `Your CodeBegun verification code is ${code}. It is valid for 10 minutes.`;
  const candidates = await getWhatsAppCredentialCandidates(tenantId);
  for (const creds of candidates) {
    const ok = await sendWhatsAppOtp(phone, code, message, creds);
    if (ok) return { sent: true, channel: 'whatsapp' };
    // else try the next credential set (e.g. env fallback when the CRM token is dead)
  }

  // No channel configured / send failed → expose code for dev/testing.
  console.warn(`[assessment-otp] WhatsApp unavailable for tenant ${tenantId}; OTP for ${phone} = ${code}`);
  return { sent: false, channel: 'none', devCode: code };
}

export type OtpVerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found';

/** Verify a submitted code against the stored OTP. */
export async function verifyOtp(token: string, code: string): Promise<OtpVerifyResult> {
  const otp = await AssessmentOtp.findOne({ token });
  if (!otp) return 'not_found';
  if (otp.expiresAt.getTime() < Date.now()) return 'expired';
  if (otp.attempts >= MAX_ATTEMPTS) return 'too_many_attempts';

  if (otp.codeHash !== hash(String(code).trim())) {
    otp.attempts += 1;
    await otp.save();
    return 'invalid';
  }

  await AssessmentOtp.deleteOne({ token }); // consume on success
  return 'ok';
}
