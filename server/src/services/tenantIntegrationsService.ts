import mongoose from 'mongoose';
import * as settings from './settingsService';
import { SECRET_KEYS } from '../config/settingsRegistry';
import LeadSourceConfig from '../models/LeadSourceConfig';
import { EmailService } from './emailService';

/**
 * Settings → Integrations for an institute's own admin: its Razorpay, UPI, email sender and Meta
 * pixel. Before this only the platform administrator could set them (Platform Settings), so a
 * college could not take payments into its own account without asking CodeBegun.
 *
 * Only the keys below can be written here, always at the institute's own scope. Secrets are
 * write-only: the page sees "saved" and a masked tail, never the value.
 */

export class IntegrationsError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const INTEGRATION_GROUPS: { id: string; title: string; keys: string[] }[] = [
  { id: 'payments', title: 'Online payments (Razorpay) & UPI', keys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'UPI_ID'] },
  { id: 'email', title: 'Email sender', keys: ['EMAIL_SERVICE', 'EMAIL_FROM', 'SES_REGION', 'SES_ACCESS_KEY_ID', 'SES_SECRET_ACCESS_KEY', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'EMAIL_USER', 'EMAIL_PASSWORD', 'BREVO_API_KEY'] },
  { id: 'ads', title: 'Meta Pixel (ad conversions)', keys: ['META_PIXEL_ID', 'META_CAPI_ACCESS_TOKEN'] },
];
const WRITABLE = new Set(INTEGRATION_GROUPS.flatMap((g) => g.keys));

/** What the page shows for one key. `source: 'platform'` only ever appears for the platform owner. */
function describe(key: string, tenantId: string) {
  const own = settings.source(key, tenantId) === 'tenant';
  const isSecret = SECRET_KEYS.has(key);
  const value = own ? settings.get(key, tenantId) || '' : '';
  const platformValue = !own && settings.isPlatformOwner(tenantId) ? settings.get(key) || '' : '';
  return {
    key,
    secret: isSecret,
    set: own,
    value: isSecret ? '' : value,
    masked: isSecret && own ? settings.mask(value) : '',
    source: own ? 'own' : platformValue ? 'platform' : 'unset',
  };
}

export async function getIntegrations(tenantId: string) {
  const wa: any = await LeadSourceConfig.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).select('whatsApp.isConnected whatsApp.config.phoneNumberId').lean();
  const owner = settings.isPlatformOwner(tenantId);
  return {
    isPlatformOwner: owner,
    groups: INTEGRATION_GROUPS.map((g) => ({ id: g.id, title: g.title, fields: g.keys.map((k) => describe(k, tenantId)) })),
    whatsapp: { connected: !!wa?.whatsApp?.isConnected, phoneNumberId: wa?.whatsApp?.config?.phoneNumberId || null },
    razorpayWebhookUrl: `${(process.env.API_PUBLIC_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/$/, '')}/api/v1/payments/webhook`,
    status: {
      payments: !!(settings.getCredentialSet(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], tenantId).RAZORPAY_KEY_SECRET),
      whatsapp: !!wa?.whatsApp?.isConnected || owner,
    },
  };
}

/** Save the institute's own values. Blank secret = keep; "__CLEAR__" = remove the institute's value. */
export async function saveIntegrations(tenantId: string, userId: string, values: Record<string, unknown>) {
  const entries: { key: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(values || {})) {
    if (!WRITABLE.has(key)) throw new IntegrationsError(`${key} cannot be set here.`);
    const v = String(raw ?? '').trim();
    if (SECRET_KEYS.has(key) && v === '') continue;            // untouched secret
    entries.push({ key, value: v === '__CLEAR__' ? '' : v });
  }
  const keyId = entries.find((e) => e.key === 'RAZORPAY_KEY_ID')?.value;
  if (keyId && !/^rzp_(live|test)_[A-Za-z0-9]+$/.test(keyId)) throw new IntegrationsError('The Razorpay Key ID starts with rzp_live_ or rzp_test_.');
  const from = entries.find((e) => e.key === 'EMAIL_FROM')?.value;
  if (from && !/<?[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>?$/.test(from)) throw new IntegrationsError('Email From must look like: Your Institute <no-reply@yourdomain.com>');
  if (entries.length) await settings.setMany(entries, userId, tenantId);
  return getIntegrations(tenantId);
}

/** Check the institute's Razorpay keys against Razorpay without moving any money. */
export async function testRazorpay(tenantId: string) {
  const c = settings.getCredentialSet(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], tenantId);
  if (!c.RAZORPAY_KEY_ID || !c.RAZORPAY_KEY_SECRET) throw new IntegrationsError('Add the Key ID and Key secret first.');
  const auth = Buffer.from(`${c.RAZORPAY_KEY_ID}:${c.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders?count=1', { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(10_000) })
    .catch((e: any) => { throw new IntegrationsError(`Could not reach Razorpay (${e?.message || 'network'}).`, 502); });
  if (res.status === 401) throw new IntegrationsError('Razorpay refused these keys — check the Key ID and secret (and live vs test mode).', 400);
  if (!res.ok) throw new IntegrationsError(`Razorpay answered ${res.status}.`, 502);
  return { ok: true, mode: c.RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'live' : 'test' };
}

/** Send a test email to the admin using the institute's sender settings. */
export async function testEmail(tenantId: string, to: string) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new IntegrationsError('Enter an email address for the test.');
  try {
    await new EmailService(tenantId).sendTestEmail(to);
  } catch (e: any) {
    throw new IntegrationsError(`The email could not be sent: ${e?.message || 'check the sender settings'}.`, 502);
  }
  return { ok: true };
}
