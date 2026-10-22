import User from '../models/User';
import { EmailService } from './emailService';
import { registerSupportChannel, ticketLink, SupportChannel } from './supportNotify';
import { logger } from '../utils/logger';

/**
 * E-mail for Help & Support notices, through the platform's existing EmailService (the provider,
 * sender and branding already configured for the institute — no new credentials).
 *
 * OFF unless SUPPORT_EMAIL_NOTIFICATIONS=true, so switching this feature on never starts mailing
 * members by surprise. The mail says what happened and links to the ticket; it never quotes the
 * ticket, a reply or an internal note.
 *
 * WhatsApp is deliberately not sent: business messages need approved templates. A WhatsApp
 * sender plugs in the same way — registerSupportChannel(fn) — once a template is approved.
 */
const appUrl = () => String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').replace(/\/+$/, '');
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const emailChannel: SupportChannel = async (n, text) => {
  const users = await User.find({ _id: { $in: n.to } }).select('email tenantId').lean();
  const link = appUrl() ? `${appUrl()}${ticketLink(n.audience, n.ticketId)}` : '';
  for (const u of users as any[]) {
    if (!u.email) continue;
    const html = `<p>${esc(text.body)}</p>${link ? `<p><a href="${esc(link)}">Open ticket ${esc(n.ticketNumber)}</a></p>` : `<p>Ticket ${esc(n.ticketNumber)}</p>`}`;
    const plain = `${text.body}\n${link || `Ticket ${n.ticketNumber}`}`;
    const ok = await new EmailService(String(u.tenantId)).sendGenericEmail(u.email, text.title, html, plain);
    if (!ok) logger.warn('[support] notification e-mail not sent', { event: n.event, ticketId: n.ticketId });
  }
};

export function registerSupportEmail(): boolean {
  if (process.env.SUPPORT_EMAIL_NOTIFICATIONS !== 'true') return false;
  registerSupportChannel(emailChannel);
  return true;
}
