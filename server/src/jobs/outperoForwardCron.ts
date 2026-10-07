import { processDue } from '../services/outperoForwardService';

/**
 * Sends leads queued for Outpero (bulk sends spaced at the admin's per-minute rate, and retries
 * after an outage). New leads in automatic mode are sent at once by the Lead hook; this only
 * picks up what is due later. Runs in the job-runner process only (see server.ts).
 */
const INTERVAL_MS = 60_000;

export function startOutperoForwardScheduler(): void {
  let running = false;
  const tick = async () => {
    if (running) return; // a slow Outpero must not stack runs
    running = true;
    try { await processDue(); } catch (err) { console.error('[OUTPERO-CRON] Error:', err); } finally { running = false; }
  };
  setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 20_000);
  console.log('🤖 Outpero lead forwarder scheduled every minute');
}
