import { processDueQueue } from '../services/partnerOutreachService';

// Check the outreach queue every 5 minutes. The service itself enforces the
// daily cap and the minimum gap between sends, so this interval just needs to
// be frequent enough to keep things moving.
export const PARTNER_OUTREACH_INTERVAL_MS = 5 * 60 * 1000;

export function startPartnerOutreachScheduler(): void {
  setInterval(async () => {
    try {
      await processDueQueue();
    } catch (err) {
      console.error('[PARTNER-OUTREACH-CRON] Error:', err);
    }
  }, PARTNER_OUTREACH_INTERVAL_MS);
  // Catch anything missed during downtime shortly after boot.
  setTimeout(() => processDueQueue().catch(console.error), 15_000);
  console.log(`🤝 Partner outreach sender scheduled every ${PARTNER_OUTREACH_INTERVAL_MS / 60000} minutes`);
}
