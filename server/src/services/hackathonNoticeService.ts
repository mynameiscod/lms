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
const publicBase = (tenantId?: string): string =>
  (settings.getStr('PUBLIC_SITE_URL', '', tenantId)
    || settings.getStr('CLIENT_URL', '', tenantId)
    || 'https://platform.codebegun.com').replace(/\/+$/, '');

export function resumeUrl(tenantId: string, registrationCode: string): string {
  return `${publicBase(tenantId)}/hackathons/resume/${encodeURIComponent(registrationCode)}`;
}

/**
 * The poster Meta will fetch for the confirmation template's header.
 *
 * META FETCHES IT THEMSELVES, from their own servers, with no session and no headers of ours.
 * So a relative path, a localhost URL, or anything behind authentication resolves to nothing
 * for them and the send fails on media rather than on content. Only an absolute public https
 * URL is offered; anything else is dropped and the template goes out header-less, which the
 * approved template will reject — visibly, in the send result — rather than half-sending.
 */
function posterUrl(h: any): string | undefined {
  const raw = String(h?.bannerUrl || '').trim();
  if (!raw) return undefined;
  if (/^https:\/\//i.test(raw)) return raw;
  // A site-relative upload path is still usable IF the site itself is public https. Resolved
  // against the SAME base as the resume link — reading a different setting here is how a
  // banner silently produces no poster while the link in the same message works fine.
  const base = publicBase(String(h?.tenantId || ''));
  if (raw.startsWith('/') && /^https:\/\//i.test(base)) return `${base}${raw}`;
  return undefined;
}

const leadOf = (reg: any) =>
  (reg.members || []).find((m: any) => m.isLead) || (reg.members || [])[0] || null;

export interface NoticeResult {
  email: boolean;
  /** True when AT LEAST ONE WhatsApp message was delivered. */
  whatsapp: boolean;
  /** How many team members were messaged, and how many reached. Confirmation only. */
  whatsappSent?: number;
  whatsappTotal?: number;
  error?: string;
}

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

  if (lead.mobile) out.whatsapp = await notifyWhatsApp(reg.tenantId, lead.mobile, {
    purpose: 'HACKATHON_PENDING',
    // {{1}} name, {{2}} team, {{3}} hackathon. No image: an image header can push a template
    // from Utility into Marketing, and a Marketing template is withheld from anyone who has
    // opted out of marketing — which would silently drop the one message that must arrive.
    body: [lead.name, reg.teamName, h.title],
    urlButtonParam: reg.registrationCode,
  }, `Hi ${lead.name}, your team "${reg.teamName}" is saved for ${h.title}. `
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
    /**
     * THE POSTER LIVES HERE, NOT ON WHATSAPP.
     *
     * Meta classifies a template by what it carries, and an event poster advertising prizes
     * and a schedule is promotional material — enough to push a confirmation out of Utility,
     * where it is delivered to everyone, into Marketing, where anyone who has opted out of
     * marketing never receives it. Email has no such rule and no review, so the poster goes
     * out in full here while WhatsApp carries the part people actually read on the day.
     *
     * Wrapped in a link to the registration page, because a poster in an email is the thing
     * people tap. Width is capped inline — email clients ignore stylesheets, and an
     * uncapped 2000px banner is what makes a phone scroll sideways.
     */
    const poster = posterUrl(h);
    const posterHtml = poster
      ? `<p style="margin:0 0 20px"><a href="${esc(resumeUrl(reg.tenantId, reg.registrationCode))}">
           <img src="${esc(poster)}" alt="${esc(h.title)}"
                style="width:100%;max-width:560px;height:auto;border:0;border-radius:10px"/></a></p>`
      : '';

    const html = `
      ${posterHtml}
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

  /**
   * THE WHOLE TEAM IS TOLD, NOT ONLY THE LEAD.
   *
   * The lead is who we take payment from; they are not the only person who has to turn up on
   * the day with a code. Messaging one member and expecting them to relay the venue, the time
   * and the entry code to four others is how a team arrives incomplete — and it is the member
   * who never heard from us who blames us for it.
   *
   * ONE FAILURE MUST NOT STOP THE REST. Each send is independent and its own catch: one
   * member who typed their number wrong should not cost the other four their confirmation.
   *
   * Numbers are deduplicated first. Teams do enter the same handset twice (a shared phone, a
   * copy-paste), and two identical confirmations to one person reads as a system fault.
   */
  const poster = posterUrl(h);
  const venue = h.venue || 'To be announced';
  const seen = new Set<string>();
  const recipients = (reg.members || []).filter((m: any) => {
    const key = String(m?.mobile || '').replace(/\D/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results = await Promise.all(recipients.map((m: any) => notifyWhatsApp(reg.tenantId, m.mobile, {
    purpose: 'HACKATHON_CONFIRMED',
    // {{1}} name, {{2}} team, {{3}} hackathon, {{4}} code, {{5}} when, {{6}} venue.
    // Addressed to THIS member by name, so it reads as their own confirmation rather than a
    // forwarded copy of the lead's. A variable may not be empty — Meta rejects the send
    // outright rather than rendering a gap — so venue falls back to text.
    body: [m.name, reg.teamName, h.title, reg.registrationCode, when, venue],
    urlButtonParam: reg.registrationCode,
    headerImageUrl: poster,
  }, `Hi ${m.name}, your team "${reg.teamName}" is confirmed for ${h.title}. `
    + `Registration code: ${reg.registrationCode}. When: ${when}. Venue: ${venue}. Bring the code.`)));

  out.whatsappTotal = results.length;
  out.whatsappSent = results.filter(Boolean).length;
  // "Did anyone hear from us" — kept boolean so existing callers read the same as before.
  out.whatsapp = out.whatsappSent > 0;

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
  tenantId: string,
  mobile: string,
  tplOpts: { purpose: string; body: string[]; urlButtonParam?: string; headerImageUrl?: string },
  plain: string,
): Promise<boolean> {
  try {
    const tpl = await sendWhatsAppTemplate(tenantId, mobile, tplOpts);
    if (tpl.ok) return true;
    const txt = await sendWhatsAppText(tenantId, mobile, plain);
    return txt.ok;
  } catch {
    return false;
  }
}
