import { pollReplies } from '../services/partnerReplyService';

// Poll the outreach mailbox for partner replies every 10 minutes. The service
// only connects for tenants that enabled IMAP and still have partners awaiting a
// reply, so idle tenants cost nothing.
export const PARTNER_REPLY_INTERVAL_MS = 10 * 60 * 1000;

export function startPartnerReplyScheduler(): void {
  setInterval(async () => {
    try {
      await pollReplies();
    } catch (err) {
      console.error('[PARTNER-REPLY-CRON] Error:', err);
    }
  }, PARTNER_REPLY_INTERVAL_MS);
  // Catch replies that arrived during downtime shortly after boot.
  setTimeout(() => pollReplies().catch(console.error), 30_000);
  console.log(`📥 Partner reply poller scheduled every ${PARTNER_REPLY_INTERVAL_MS / 60000} minutes`);
}
