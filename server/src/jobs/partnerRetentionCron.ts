import { runRetention } from '../services/partnerRetentionService';

// Daily retention pass: guarantee-expiry alerts + quarterly check-in reminders.
export const PARTNER_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startPartnerRetentionScheduler(): void {
  setInterval(async () => {
    try {
      await runRetention();
    } catch (err) {
      console.error('[PARTNER-RETENTION-CRON] Error:', err);
    }
  }, PARTNER_RETENTION_INTERVAL_MS);
  // Run once shortly after boot.
  setTimeout(() => runRetention().catch(console.error), 30_000);
  console.log('🤝 Partner retention reminders scheduled daily');
}
