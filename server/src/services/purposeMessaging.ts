import * as settings from './settingsService';
import { sendWhatsAppTemplate } from './assessmentOtpService';
import { getPurpose } from '../config/whatsappTemplatePurposes';

/**
 * Sending a system message over WhatsApp by PURPOSE, safely and with its cost in view.
 *
 * `sendWhatsAppTemplate` falls back to the global notify template when a purpose has none of
 * its own — right for the older call sites, wrong here: a practice reminder must never go out
 * dressed as a Tech Battle message. So these helpers check the purpose's own key first and
 * refuse when no template is assigned.
 *
 * WhatsApp is billed per message; email is not. The per-message rate is a setting because
 * Meta's price depends on the category and changes; the admin sees the estimate before sending.
 */

/** Default ₹ per Utility-category message in India. Override with WHATSAPP_COST_PER_MESSAGE_INR. */
const DEFAULT_COST_INR = 0.13;

export function waCostPerMessage(tenantId: string): number {
  const raw = settings.getStr('WHATSAPP_COST_PER_MESSAGE_INR', '', tenantId).trim();
  const v = Number(raw);
  return raw !== '' && Number.isFinite(v) && v >= 0 && v < 100 ? v : DEFAULT_COST_INR;
}

export const estimateCost = (tenantId: string, messages: number) =>
  Math.round(messages * waCostPerMessage(tenantId) * 100) / 100;

export function purposeTemplate(tenantId: string, purposeKey: string): string {
  const p = getPurpose(purposeKey);
  return p ? settings.getStr(p.settingsKey, '', tenantId) : '';
}

export async function sendByPurpose(tenantId: string, phone: string, purposeKey: string, body: string[], urlButtonParam?: string) {
  if (!purposeTemplate(tenantId, purposeKey)) {
    return { ok: false, error: `No WhatsApp template is assigned for this message (Admin → WhatsApp Templates → Where used).` };
  }
  if (!phone) return { ok: false, error: 'No phone number.' };
  return sendWhatsAppTemplate(tenantId, phone, { purpose: purposeKey, body, urlButtonParam });
}
