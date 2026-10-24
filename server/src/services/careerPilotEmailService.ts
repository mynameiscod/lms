/**
 * The two emails a CareerPilot member gets:
 *   1. when the account is created (after the OTP is verified): a welcome that says where to sign in
 *   2. when a membership payment goes through: a receipt that says what was paid and until when
 *
 * Until now CareerPilot sent no email at all. Both are sent AFTER the thing they describe has already
 * succeeded and are never allowed to fail it: a signup or a payment must not roll back, error or even slow
 * down because a mail server was having a bad minute. Failures are logged and swallowed.
 *
 * Sent through EmailService for the member's own institute, so the institute's configured sender is used.
 * Branding: always "CareerPilot by CodeBegun".
 */
import { EmailService } from './emailService';

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const base = () => String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');
const rupees = (paise: number) => `₹${(Math.round(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const day = (d: Date | string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const dayTime = (d: Date | string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

const NAVY = '#0b2a6b'; const TEAL = '#0e8f99';

/** One look for both: navy header, a short body, one button. Inline styles only, because mail clients ignore the rest. */
function shell(title: string, bodyHtml: string, cta: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e9f2">
<tr><td style="background:${NAVY};padding:20px 24px;color:#ffffff"><div style="font-size:20px;font-weight:800;letter-spacing:.2px">CareerPilot</div><div style="font-size:12px;opacity:.85">by CodeBegun</div></td></tr>
<tr><td style="padding:26px 24px 8px"><h1 style="margin:0 0 12px;font-size:21px;color:${NAVY}">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:6px 24px 28px"><a href="${esc(cta.url)}" style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${esc(cta.label)}</a></td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;color:#6b7280;font-size:12px;border-top:1px solid #eef1f6">Questions? Open <b>Help &amp; Support</b> inside CareerPilot, or just reply to this email.<br>You are receiving this because you signed up for CareerPilot by CodeBegun.</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${html}</p>`;

export function registrationEmail(user: { firstName?: string; email?: string }) {
  const name = esc((user.firstName || 'there').trim() || 'there');
  const url = `${base()}/careerpilot/login`;
  // the title is escaped once, inside shell(): pass it raw
  const html = shell(`Welcome to CareerPilot, ${(user.firstName || 'there').trim() || 'there'}!`,
    p(`Your account is ready. Your mobile number is verified and you can sign in any time.`)
    + p(`<b>Sign in with:</b> ${esc(user.email || 'the email you registered with')}, or your WhatsApp OTP on the mobile number you gave us.`)
    + p(`Here is what to do first:`)
    + `<ol style="margin:0 0 14px;padding-left:20px;font-size:15px;line-height:1.7"><li>Finish your short setup, so we can build your plan around your goal.</li><li>Take the free skill assessment, about 10 minutes, to see where you stand.</li><li>Practise a little every day: a streak is what changes your interview results.</li></ol>`,
    { label: 'Open CareerPilot', url });
  const text = `Welcome to CareerPilot by CodeBegun, ${user.firstName || 'there'}!\n\nYour account is ready. Sign in at ${url} with ${user.email || 'your registered email'}, or use the WhatsApp OTP on your mobile number.\n\nFirst steps:\n1. Finish your short setup.\n2. Take the free skill assessment (about 10 minutes).\n3. Practise a little every day.\n\nQuestions? Open Help & Support inside CareerPilot, or reply to this email.`;
  return { subject: `Welcome to CareerPilot by CodeBegun, ${(user.firstName || '').trim() || 'there'}!`, html, text };
}

export interface ReceiptInput {
  user: { firstName?: string; email?: string };
  amountPaise: number; currency?: string; orderId?: string; paymentId?: string; paidAt?: Date | string; validUntil?: Date | string;
}

export function paymentEmail(r: ReceiptInput) {
  const name = esc((r.user.firstName || 'there').trim() || 'there');
  const amount = rupees(r.amountPaise);
  const paidAt = r.paidAt || new Date();
  const row = (k: string, v: string) => `<tr><td style="padding:7px 0;color:#6b7280;font-size:14px">${esc(k)}</td><td style="padding:7px 0;text-align:right;font-weight:600;font-size:14px">${esc(v)}</td></tr>`;
  const html = shell('Payment received. Your membership is active.',
    p(`Hi ${name}, thank you. We have received your payment and your CareerPilot membership is now active.`)
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;border-top:1px solid #eef1f6;border-bottom:1px solid #eef1f6">`
    + row('Amount paid', amount) + row('Paid on', dayTime(paidAt))
    + (r.validUntil ? row('Membership valid until', day(r.validUntil)) : '')
    + (r.paymentId ? row('Payment ID', r.paymentId) : '') + (r.orderId ? row('Order ID', r.orderId) : '')
    + `</table>`
    + p(`Everything is unlocked: your full daily plan, practice, mock interviews and your readiness tracking. Keep this email as your receipt.`),
    { label: 'Continue in CareerPilot', url: `${base()}/careerpilot` });
  const text = `Payment received. Your CareerPilot membership is active.\n\nHi ${r.user.firstName || 'there'}, thank you. We have received your payment.\n\nAmount paid: ${amount}\nPaid on: ${dayTime(paidAt)}\n${r.validUntil ? `Membership valid until: ${day(r.validUntil)}\n` : ''}${r.paymentId ? `Payment ID: ${r.paymentId}\n` : ''}${r.orderId ? `Order ID: ${r.orderId}\n` : ''}\nContinue: ${base()}/careerpilot\n\nKeep this email as your receipt. Questions? Reply to this email.`;
  return { subject: `Payment received: your CareerPilot membership is active (${amount})`, html, text };
}

/** Sent, never thrown: a failed email must not undo a signup or a payment. */
async function deliver(tenantId: string | undefined, to: string | undefined, mail: { subject: string; html: string; text: string }, label: string): Promise<boolean> {
  try {
    if (!to) return false;
    const ok = await new EmailService(tenantId).sendGenericEmail(to, mail.subject, mail.html, mail.text, undefined, { ignoreSuppression: true } as any);
    if (!ok) console.warn(`[careerpilot-email] ${label} to ${to} was not sent (the sender is not set up, or the server refused it)`);
    return ok;
  } catch (e: any) {
    console.error(`[careerpilot-email] ${label} to ${to} failed:`, e?.message);
    return false;
  }
}

export const sendRegistrationEmail = (user: any) =>
  deliver(user?.tenantId ? String(user.tenantId) : undefined, user?.email, registrationEmail(user || {}), 'registration email');

export const sendPaymentEmail = (user: any, payment: any, validUntil?: Date) =>
  deliver(user?.tenantId ? String(user.tenantId) : undefined, user?.email, paymentEmail({
    user, amountPaise: Number(payment?.amount || 0), currency: payment?.currency, orderId: payment?.orderId,
    paymentId: payment?.paymentId, paidAt: payment?.paidAt, validUntil,
  }), 'payment email');
