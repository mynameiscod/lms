/**
 * Telling a team what just happened, and how to get back to it.
 *
 * THE FAULT THIS CLOSES. A registration created its code, stored it, and told nobody. The
 * confirmation email fired only on payment success, so a student whose payment failed — or
 * whose browser closed, or whose UPI app did not return — held a place for thirty minutes
 * with no way to reach it. Refilling the form told them they were already registered, because
 * their own abandoned attempt was holding their own details. The way back existed the whole
 * time: GET /hackathons/registration/:code. They were simply never given the code.
 *
 * SENT AT REGISTRATION, NOT ONLY AT PAYMENT. The moment a team is stored, the lead is told
 * where to pay and what holds their place.
 *
 * NEVER FATAL. A registration that is stored is a registration that happened; a mail server
 * having a bad afternoon must not undo it. Every send is caught and reported, never thrown.
 */
import { EmailService } from './emailService';
import { sendWhatsAppTemplate, sendWhatsAppText } from './assessmentOtpService';
import * as settings from './settingsService';

// One instance, matching how the controller already constructs it.
const emailService = new EmailService();

const esc = (s: string): string =>
  String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/**
 * Where a student goes to finish paying.
 *
 * The registration code is the whole address: it is unique, it is already the key the public
 * lookup accepts, and it avoids the characters people misread when reading it aloud — which
 * is what makes it safe to put in a URL somebody may retype from a phone screen.
 */
export function resumeUrl(tenantId: string, registrationCode: string): string {
  const base = settings.getStr('PUBLIC_SITE_URL', '', tenantId)
    || settings.getStr('CLIENT_URL', '', tenantId)
    || 'https://platform.codebegun.com';
  return `${base.replace(/\/+$/, '')}/hackathons/resume/${encodeURIComponent(registrationCode)}`;
}

const leadOf = (reg: any) =>
  (reg.members || []).find((m: any) => m.isLead) || (reg.members || [])[0] || null;

export interface NoticeResult { email: boolean; whatsapp: boolean; error?: string }

/**
 * "We have your team. Here is where you pay."
 *
 * Sent BEFORE money changes hands, which is the entire point — this is the message that
 * survives a closed browser.
 */
export async function sendPendingPaymentNotice(h: any, reg: any): Promise<NoticeResult> {
  const lead = leadOf(reg);
  if (!lead) return { email: false, whatsapp: false, error: 'no team lead' };

  const url = resumeUrl(reg.tenantId, reg.registrationCode);
  const out: NoticeResult = { email: false, whatsapp: false };

  if (lead.email) {
    const html = `
      <p>Hi ${esc(lead.name)},</p>
      <p>We have saved your team <b>${esc(reg.teamName)}</b> for <b>${esc(h.title)}</b>.
         Your place is <b>not confirmed until payment is complete</b>.</p>
      <p><a href="${esc(url)}"
            style="display:inline-block;background:#051D64;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">
         Complete payment — ₹${esc(String(reg.amountInr || h.feeInr))}</a></p>
      <p><b>Registration code:</b> ${esc(reg.registrationCode)}</p>
      <p>If the payment page closed or the payment failed, open the link above rather than
         filling the form again — it returns you to this same registration.</p>`;
    try {
      await emailService.sendGenericEmail(lead.email, `Finish your registration for ${h.title}`, html);
      out.email = true;
    } catch (e: any) { out.error = e?.message || 'email failed'; }
  }

  if (lead.mobile) out.whatsapp = await notifyWhatsApp(reg.tenantId, lead.mobile, [
    lead.name, reg.teamName, h.title,
  ], reg.registrationCode, `Hi ${lead.name}, your team "${reg.teamName}" is saved for ${h.title}. `
    + `Finish payment here: ${url} (code ${reg.registrationCode}). Your place is not confirmed until payment completes.`);

  return out;
}

/** "You are in." Sent on payment success, and now over WhatsApp as well as email. */
export async function sendConfirmedNotice(h: any, reg: any): Promise<NoticeResult> {
  const lead = leadOf(reg);
  if (!lead) return { email: false, whatsapp: false, error: 'no team lead' };
  const out: NoticeResult = { email: false, whatsapp: false };

  const when = (() => {
    try { return new Date(h.startAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }); }
    catch { return String(h.startAt || ''); }
  })();

  if (lead.email) {
    const roster = (reg.members || [])
      .map((m: any, i: number) => `<li>${esc(m.name)}${i === 0 ? ' <b>(team lead)</b>' : ''}</li>`).join('');
    const html = `
      <p>Hi ${esc(lead.name)},</p>
      <p>Your team <b>${esc(reg.teamName)}</b> is registered for <b>${esc(h.title)}</b>.</p>
      <p>
        <b>Registration code:</b> ${esc(reg.registrationCode)}<br/>
        <b>When:</b> ${esc(when)}<br/>
        ${h.venue ? `<b>Where:</b> ${esc(h.venue)}<br/>` : ''}
        <b>College:</b> ${esc(reg.college)}<br/>
        ${reg.amountInr ? `<b>Fee paid:</b> ₹${esc(String(reg.amountInr))}<br/>` : ''}
      </p>
      <p><b>Your team</b></p><ul>${roster}</ul>
      <p>Keep your registration code — you will be asked for it at the venue.</p>`;
    try {
      await emailService.sendGenericEmail(lead.email, `You're registered for ${h.title} 🎉`, html);
      out.email = true;
    } catch (e: any) { out.error = e?.message || 'email failed'; }
  }

  if (lead.mobile) out.whatsapp = await notifyWhatsApp(reg.tenantId, lead.mobile, [
    lead.name, reg.teamName, h.title,
  ], reg.registrationCode, `Hi ${lead.name}, your team "${reg.teamName}" is confirmed for ${h.title}. `
    + `Registration code: ${reg.registrationCode}. Bring it to the venue.`);

  return out;
}

/**
 * Template first, plain text second.
 *
 * Meta only delivers a business-initiated message outside the 24-hour service window if it
 * uses an approved template. A student registering has almost certainly not messaged us
 * first, so plain text would be accepted by the API and silently never arrive — the worst
 * possible failure, because everything looks fine from our side. The text send stays as a
 * fallback for the case where a template is not configured yet and the window happens to be
 * open, and its failure is not treated as an error.
 */
async function notifyWhatsApp(
  tenantId: string, mobile: string, bodyParams: string[], urlParam: string, plain: string,
): Promise<boolean> {
  try {
    const tpl = await sendWhatsAppTemplate(tenantId, mobile, { body: bodyParams, urlButtonParam: urlParam });
    if (tpl.ok) return true;
    const txt = await sendWhatsAppText(tenantId, mobile, plain);
    return txt.ok;
  } catch {
    return false;
  }
}
