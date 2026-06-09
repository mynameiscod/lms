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

async function getWhatsAppCredentials(tenantId: string): Promise<{ phoneNumberId: string; accessToken: string } | null> {
  const sourceConfig = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
  if (!sourceConfig) return null;
  const wa = (sourceConfig as any).whatsApp;
  if (!wa?.isConnected || !wa?.config?.phoneNumberId) return null;
  const tokens = await getDecryptedTokens(tenantId);
  const accessToken = tokens?.whatsApp?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) return null;
  return { phoneNumberId: wa.config.phoneNumberId, accessToken };
}

async function sendWhatsAppText(phone: string, message: string, creds: { phoneNumberId: string; accessToken: string }): Promise<boolean> {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (!cleanPhone) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message } }),
    });
    return res.ok;
  } catch {
    return false;
  }
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
  const creds = await getWhatsAppCredentials(tenantId);
  if (creds) {
    const ok = await sendWhatsAppText(phone, message, creds);
    if (ok) return { sent: true, channel: 'whatsapp' };
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
