import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentOtp from '../models/AssessmentOtp';
import LeadSourceConfig from '../models/LeadSourceConfig';
import * as settings from './settingsService';
import { EmailService } from './emailService';
import { getDecryptedTokens } from '../controllers/leadSourceConfigController';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import { buildSendComponents } from './whatsAppTemplateShape';
import { recordOutbound, renderTemplateBody } from './whatsAppChatStore';

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
export async function getWhatsAppCredentialCandidates(tenantId: string): Promise<WaCreds[]> {
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

  // 2) The platform number (Platform Settings values are mirrored to process.env) — ONLY for the
  //    platform owner. Another institute without its own WhatsApp connection sends nothing,
  //    rather than messaging its students from CodeBegun's number.
  if (settings.isPlatformOwner(tenantId)) {
    const envPid = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const envTok = process.env.WHATSAPP_ACCESS_TOKEN || '';
    if (envPid && envTok && !out.some((c) => c.phoneNumberId === envPid)) {
      out.push({ phoneNumberId: envPid, accessToken: envTok });
    }
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
// Resolved through the settings service (tenant → Platform Settings → env) so a template
// assigned on the WhatsApp Templates page applies to that tenant.
const otpTemplate = (tenantId?: string) => settings.getStr('WHATSAPP_OTP_TEMPLATE', '', tenantId);
const otpTemplateLang = (tenantId?: string) => settings.getStr('WHATSAPP_OTP_TEMPLATE_LANG', 'en', tenantId);
const otpTemplateHasButton = (tenantId?: string) => String(settings.getStr('WHATSAPP_OTP_TEMPLATE_BUTTON', 'true', tenantId)) !== 'false';

/**
 * The locally mirrored definition of a template, when there is one.
 *
 * Templates authored or synced on the WhatsApp Templates page carry their shape — variable
 * count, which button is the dynamic url one, whether the header is an image — so a send can
 * be built to fit instead of guessed from `_BUTTON` flags. A template that was only ever
 * typed into Platform Settings has no mirror, and the send keeps the old behaviour.
 */
async function findTemplateDef(tenantId: string | undefined, name: string, lang: string) {
  if (!tenantId || !name || !mongoose.isValidObjectId(tenantId)) return null;
  try {
    return await WhatsAppTemplate.findOne({ tenantId, name, language: lang, status: { $ne: 'DELETED' } }).lean();
  } catch { return null; }
}

export async function waPost(
  creds: { phoneNumberId: string; accessToken: string }, payload: any,
): Promise<{ ok: boolean; error?: string; errorCode?: number; messageId?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[whatsapp] send failed', res.status, err.slice(0, 400));
      // Extract Meta's human message (and its code, so the delivery log can explain it).
      let msg = err.slice(0, 200);
      let code: number | undefined;
      try { const j = JSON.parse(err)?.error; msg = j?.message || msg; code = typeof j?.code === 'number' ? j.code : undefined; } catch { /* keep raw */ }
      return { ok: false, error: msg, errorCode: code };
    }
    /* Meta's id for the message (wamid). Every later delivery report carries it; keeping it is the
       only way to know whether this message actually arrived. */
    const body: any = await res.json().catch(() => null);
    return { ok: true, messageId: body?.messages?.[0]?.id };
  } catch (e: any) {
    console.warn('[whatsapp] send error', e?.message);
    return { ok: false, error: e?.message || 'network error' };
  }
}

async function sendWhatsAppOtp(phone: string, code: string, message: string, creds: { phoneNumberId: string; accessToken: string }, tenantId?: string): Promise<boolean> {
  const to = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (!to) return false;

  // Preferred: approved Authentication template (works for cold recipients)
  const name = otpTemplate(tenantId);
  if (name) {
    const lang = otpTemplateLang(tenantId);
    const def = await findTemplateDef(tenantId, name, lang);
    let components: any[];
    if (def) {
      components = buildSendComponents(def as any, { body: [code], urlButtonParam: code });
    } else {
      components = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];
      // Auth templates carry an OTP "copy code" / one-tap button that echoes the code
      if (otpTemplateHasButton(tenantId)) {
        components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
      }
    }
    const r = await waPost(creds, {
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name, language: { code: lang }, components },
    });
    if (r.ok) return true;
  }

  // Fallback: plain text — only delivers if the user messaged us in the last 24h
  return (await waPost(creds, { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } })).ok;
}

/** Normalize a phone to WhatsApp's `to` format (digits, default India country code). */
export function normalizeTo(phone: string): string {
  let to = String(phone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (to.length === 10) to = '91' + to;
  return to;
}

// Generic notification template — required to reach recipients OUTSIDE the 24h session
// window (i.e. every battle registrant). Create + approve a template in Meta Business
// Manager with a single body variable {{1}} and set its name here (via Platform Settings
// or env). Without it, sends fall back to plain text, which Meta rejects for cold users.
/**
 * WHICH TEMPLATE, FOR WHICH PURPOSE.
 *
 * There was one global slot, WHATSAPP_NOTIFY_TEMPLATE, read straight from process.env — so
 * every business-initiated message had to be the SAME approved template. That is not merely
 * untidy: Meta validates parameter count against the named template and rejects a mismatch
 * with error 132000, and the one configured slot is a Tech Battle template taking two body
 * variables. Any caller needing three would have failed every send.
 *
 * Each purpose now resolves its own name, language and button shape, through the settings
 * service — so tenant override → Platform Settings → env, like every other credential, and a
 * college can point at its own approved templates. A purpose with nothing configured falls
 * back to the global slot, so what worked before this still works.
 */
type TemplateConfig = { name: string; lang: string; hasButton: boolean };

function templateConfig(purpose?: string, tenantId?: string): TemplateConfig {
  const scoped = (suffix: string): string => {
    if (!purpose) return '';
    return settings.getStr(`WHATSAPP_TEMPLATE_${purpose.toUpperCase()}${suffix}`, '', tenantId);
  };
  const name = scoped('') || settings.getStr('WHATSAPP_NOTIFY_TEMPLATE', '', tenantId);
  // Language and button belong to the template that was actually chosen. Reading them from
  // the global slot while sending a scoped template is how you get a template that exists in
  // en_US addressed as en, which fails with a message that names neither.
  const scopedName = !!scoped('');
  const lang = scoped('_LANG')
    || (scopedName ? 'en' : settings.getStr('WHATSAPP_NOTIFY_TEMPLATE_LANG', 'en', tenantId));
  const buttonRaw = scoped('_BUTTON')
    || (scopedName ? 'true' : settings.getStr('WHATSAPP_NOTIFY_TEMPLATE_BUTTON', 'true', tenantId));
  return { name, lang, hasButton: String(buttonRaw) !== 'false' };
}

const notifyTemplate = () => templateConfig().name;

/** Whether a notification template is configured at all. Callers use this to decide
 *  between a template send (reaches cold contacts) and free-form text (does not). */
export const hasNotifyTemplate = () => !!notifyTemplate();

/**
 * Send an approved WhatsApp template with an arbitrary number of body variables, and
 * optionally the variable suffix of a dynamic url button.
 *
 * `sendWhatsAppText` below flattens a whole message into a single {{1}}, which only fits
 * a template built as a generic carrier. A template like `battle_exam__reminder` — body
 * {{1}} name, {{2}} time, plus a button carrying each recipient's exam token — cannot be
 * expressed that way, so structured sends get their own entry point rather than
 * overloading the text one.
 *
 * Body variables reject newlines, tabs and runs of 4+ spaces; each is sanitized here so a
 * stray line break in a battle title cannot fail the whole send.
 */
export async function sendWhatsAppTemplate(
  tenantId: string,
  phone: string,
  opts: {
    body: string[];
    urlButtonParam?: string;
    /** Which approved template this is for. Falls back to the global slot when unset. */
    purpose?: string;
    /**
     * A dynamic image for the template's header.
     *
     * Meta FETCHES this from their own servers, so it has to be publicly reachable HTTPS —
     * an authenticated upload URL resolves to nothing for them and the send fails with a
     * media error that says little. Ignored unless the approved template actually declares an
     * image header; supplying one to a template without it is a parameter mismatch (132000).
     */
    headerImageUrl?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const to = normalizeTo(phone);
  if (!to) return { ok: false, error: 'invalid phone' };
  const tpl = templateConfig(opts.purpose, tenantId);
  if (!tpl.name) return { ok: false, error: 'No WhatsApp template configured (Platform Settings → Messaging).' };

  const candidates = await getWhatsAppCredentialCandidates(tenantId);
  if (!candidates.length) return { ok: false, error: 'WhatsApp is not configured for this tenant (set it in Platform Settings).' };

  // A template managed on the WhatsApp Templates page is sent to its real shape: extra values
  // dropped, the url param put on whichever button is dynamic, its stored image used as the
  // header when the caller has none.
  const def = await findTemplateDef(tenantId, tpl.name, tpl.lang);
  const clean = (s: string) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  const components: any[] = def ? buildSendComponents(def as any, opts) : [];
  if (!def) {
    // Header first — Meta requires components in the order the template declares them.
    if (opts.headerImageUrl && /^https:\/\//i.test(opts.headerImageUrl)) {
      components.push({ type: 'header', parameters: [{ type: 'image', image: { link: opts.headerImageUrl } }] });
    }
    components.push(
      { type: 'body', parameters: opts.body.map((v) => ({ type: 'text', text: clean(v) })) },
    );
    if (opts.urlButtonParam && tpl.hasButton) {
      components.push({
        type: 'button', sub_type: 'url', index: '0',
        parameters: [{ type: 'text', text: clean(opts.urlButtonParam) }],
      });
    }
  }

  let lastError: string | undefined;
  for (const creds of candidates) {
    const r = await waPost(creds, {
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: tpl.name, language: { code: tpl.lang }, components },
    });
    if (r.ok) {
      // Into the person's conversation, so the Chat tab shows the confirmation/reminder they got.
      await recordOutbound(tenantId, to, {
        kind: 'template', templateName: tpl.name, wamid: r.messageId, ok: true, source: 'system',
        body: def ? renderTemplateBody((def as any).body, opts.body) : opts.body.join(' · '),
      });
      return { ok: true };
    }
    lastError = r.error;
  }
  return { ok: false, error: lastError || 'send failed' };
}

/**
 * Send a WhatsApp message to a phone for a tenant. If a notification template is
 * configured (WHATSAPP_NOTIFY_TEMPLATE) it sends via template with the message as the
 * single body variable — this DELIVERS to cold recipients. Otherwise it falls back to
 * free-form text (only delivers inside the 24h window / to opted-in users).
 * Returns { ok, error? } with Meta's error message on failure.
 */
export async function sendWhatsAppText(
  tenantId: string,
  phone: string,
  message: string,
  opts?: {
    /**
     * Send genuine free-form text and do NOT route through the notification template.
     *
     * The template path here flattens a whole message into a single {{1}}, which only works
     * if the configured template happens to take exactly one variable. The configured one
     * takes two, so every fallback send failed with 132000 — the caller had already failed
     * its own template send, fell back to this, and failed again for an unrelated reason,
     * leaving two confusing errors in the log and nothing delivered.
     *
     * A caller that has ALREADY tried its own template wants the free-form path or nothing:
     * within the 24-hour service window it delivers, and outside it nothing was going to
     * arrive anyway. Guessing at another template's shape cannot help either case.
     */
    plainOnly?: boolean;
  }
): Promise<{ ok: boolean; error?: string }> {
  const to = normalizeTo(phone);
  if (!to) return { ok: false, error: 'invalid phone' };
  const candidates = await getWhatsAppCredentialCandidates(tenantId);
  if (!candidates.length) return { ok: false, error: 'WhatsApp is not configured for this tenant (set it in Platform Settings).' };

  const tpl = templateConfig(undefined, tenantId);
  // Template body variables reject newlines/tabs and >4 consecutive spaces — sanitize.
  const oneLine = String(message).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();

  let lastError: string | undefined;
  for (const creds of candidates) {
    const payload = (tpl.name && !opts?.plainOnly)
      ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl.name, language: { code: tpl.lang }, components: [{ type: 'body', parameters: [{ type: 'text', text: oneLine }] }] } }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } };
    const r = await waPost(creds, payload);
    if (r.ok) {
      await recordOutbound(tenantId, to, { kind: payload.type === 'template' ? 'template' : 'text', templateName: payload.type === 'template' ? tpl.name : undefined, wamid: r.messageId, ok: true, source: 'system', body: message });
      return { ok: true };
    }
    lastError = r.error;
  }
  return { ok: false, error: lastError || 'send failed' };
}

export interface OtpSendResult {
  sent: boolean;
  channel: 'whatsapp' | 'email' | 'none';
  devCode?: string;       // present when no channel is configured, or for an allowlisted test number
  throttledSeconds?: number;
  /** True when the code was withheld deliberately because this is a configured test number. */
  testNumber?: boolean;
}

/**
 * Is this an allowlisted test mobile?
 *
 * Compared on digits alone so "+91 95735 16868", "9573516868" and "919573516868" all match
 * the same entry — a list that only worked for one formatting would fail silently and look
 * like the feature was off.
 */
function isTestNumber(tenantId: string, phone: string): boolean {
  const raw = settings.getStr('OTP_TEST_NUMBERS', '', tenantId);
  if (!raw.trim()) return false;
  const digits = (v: string) => String(v || '').replace(/\D/g, '').slice(-10);
  const target = digits(phone);
  if (!target) return false;
  return raw.split(',').map(s => digits(s)).filter(Boolean).includes(target);
}

/** Create (or refresh) and send an OTP for a submission token. */
const emailService = new EmailService();

export async function sendOtp(tenantId: string, token: string, phone: string, email?: string): Promise<OtpSendResult> {
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

  /**
   * Test numbers: return the code instead of sending it.
   *
   * Needed to exercise the signup funnel repeatedly without a phone in hand. Scoped to an
   * explicit list rather than a global switch, because a global one removes phone-ownership
   * verification for EVERY signup while it is on — anyone could register any email and read
   * the code out of the API response — and a temporary switch on a live product tends to
   * outlive the reason for it. An allowlist cannot leak onto a real member's signup no
   * matter how long it is left in place.
   *
   * Empty by default. Set OTP_TEST_NUMBERS in Platform Settings → Email to a comma-separated
   * list of the mobiles used for testing, and clear it when finished.
   */
  if (isTestNumber(tenantId, phone)) {
    console.warn(`[assessment-otp] TEST NUMBER ${phone} — code returned to the caller, not sent. `
      + `This bypasses phone verification for this number. Clear OTP_TEST_NUMBERS when testing is done.`);
    return { sent: false, channel: 'none', devCode: code, testNumber: true };
  }

  const message = `Your CodeBegun verification code is ${code}. It is valid for 10 minutes.`;
  const candidates = await getWhatsAppCredentialCandidates(tenantId);
  for (const creds of candidates) {
    const ok = await sendWhatsAppOtp(phone, code, message, creds, tenantId);
    if (ok) return { sent: true, channel: 'whatsapp' };
    // else try the next credential set (e.g. env fallback when the CRM token is dead)
  }

  /*
   * WhatsApp did not take it. Try email before giving up.
   *
   * This was the whole delivery path: one channel, and a candidate whose WhatsApp was on a
   * different number, or absent, or throttled by Meta that morning, simply could not sit the
   * exam. There was no second channel and no way for anyone to help them. The address is
   * already on the record and SES already works, so the fallback costs nothing and removes
   * most of the cases where somebody is stranded.
   */
  if (email) {
    try {
      const ok = await emailService.sendGenericEmail(
        email,
        `Your CodeBegun verification code is ${code}`,
        `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#0f172a">
           <p>Your verification code is:</p>
           <p style="font-size:30px;font-weight:800;letter-spacing:7px;margin:14px 0">${code}</p>
           <p style="color:#64748b;font-size:13px">It is valid for 10 minutes. We sent this by email
              because we could not reach your WhatsApp number. If you did not ask for it, ignore it.</p>
         </div>`,
      );
      if (ok) {
        console.warn(`[assessment-otp] WhatsApp failed for ${phone}; code sent to ${email} instead.`);
        return { sent: true, channel: 'email' };
      }
    } catch (e: any) {
      console.error('[assessment-otp] email fallback failed:', e?.message);
    }
  }

  /*
   * Nothing worked. The code is logged so somebody can still be helped by hand.
   *
   * NEVER RETURNED TO THE CALLER IN PRODUCTION. It used to be, as `devCode`, and the page showed
   * it — so typing any number WhatsApp could not reach (a fake one, or somebody else's that is not
   * on WhatsApp) put the code on screen and verified a phone nobody owned. Outside production it
   * is still returned, which is what local development needs. Test numbers are the allowlist above.
   */
  console.warn(`[assessment-otp] no channel delivered for tenant ${tenantId}; OTP for ${phone} = ${code}`);
  if (process.env.NODE_ENV === 'production') return { sent: false, channel: 'none' };
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
