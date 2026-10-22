import { createNotifications } from '../notifications/notificationService';
import { logger } from '../utils/logger';

/**
 * Help & Support notifications, through the platform's existing in-app notifications.
 *
 * NOTHING HERE MAY FAIL A TICKET OPERATION. Every send is fire-and-forget: the caller does not
 * await it, and any error is logged (redacted) and dropped. A member whose reply was saved must
 * never be told it failed because a notification could not be written.
 *
 * Messages never quote a ticket's text or an internal note — only the number and what happened —
 * so a notification shown on a shared screen gives nothing away.
 */
export type SupportEvent =
  | 'created' | 'assigned' | 'staff_replied' | 'info_requested' | 'resolved' | 'reopened' | 'incident_acknowledged';

export interface SupportNotice {
  event: SupportEvent;
  tenantId: string;
  ticketId: string;
  ticketNumber: string;
  /** Who to tell. Duplicates and the person who caused the event are removed. */
  to: string[];
  actorId?: string;
  /** Staff open tickets in the admin app; members in CareerPilot. */
  audience: 'member' | 'staff';
}

const TEXT: Record<SupportEvent, (n: string) => { title: string; body: string }> = {
  created:               n => ({ title: `Ticket ${n} received`, body: 'Our support team has your request.' }),
  assigned:              n => ({ title: `Ticket ${n} assigned to you`, body: 'A support ticket is waiting in your queue.' }),
  staff_replied:         n => ({ title: `New reply on ${n}`, body: 'Support has replied to your ticket.' }),
  info_requested:        n => ({ title: `${n} needs your reply`, body: 'Support needs more information to continue.' }),
  resolved:              n => ({ title: `${n} marked resolved`, body: 'If the problem is still there, you can reopen the ticket.' }),
  reopened:              n => ({ title: `${n} reopened`, body: 'The requester says the problem is not fixed.' }),
  incident_acknowledged: n => ({ title: `Update on ${n}`, body: 'Support is aware of an issue affecting several people and is working on it.' }),
};

export const ticketLink = (audience: 'member' | 'staff', ticketId: string) =>
  audience === 'member' ? `/careerpilot/support/tickets/${ticketId}` : `/admin/support/tickets/${ticketId}`;

/** Extra channels (email, WhatsApp) register here; see Phase 8. In-app always runs first. */
export type SupportChannel = (n: SupportNotice, text: { title: string; body: string }) => Promise<void>;
const channels: SupportChannel[] = [];
export const registerSupportChannel = (c: SupportChannel) => { channels.push(c); };
export const __clearSupportChannels = () => { channels.length = 0; };

export async function deliverSupportNotice(n: SupportNotice): Promise<void> {
  const to = [...new Set(n.to.map(String))].filter(id => id && id !== n.actorId);
  if (!to.length) return;
  const text = TEXT[n.event](n.ticketNumber);
  try {
    await createNotifications(n.tenantId, to, 'general', text.title, text.body, ticketLink(n.audience, n.ticketId));
  } catch (err: any) {
    logger.warn('[support] in-app notification failed', { event: n.event, ticketId: n.ticketId, error: err?.message });
  }
  for (const c of channels) {
    try { await c({ ...n, to }, text); } catch (err: any) {
      logger.warn('[support] notification channel failed', { event: n.event, ticketId: n.ticketId, error: err?.message });
    }
  }
}

/** Fire and forget. Returns nothing the caller could await by mistake. */
export function notifySupport(n: SupportNotice): void {
  void deliverSupportNotice(n).catch(() => undefined);
}
