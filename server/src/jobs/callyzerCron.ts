import { loadAll } from '../services/settingsService';
import { syncAll } from '../services/callyzerService';

/**
 * Callyzer sync: every 10 minutes, ask Callyzer for the calls counsellors' phones synced since last
 * time (anything the webhook missed), and for recordings that arrived after their call log.
 * Runs in the job-runner process only (see server.ts).
 */
const INTERVAL_MS = 10 * 60_000;

export function startCallyzerScheduler(): void {
  let running = false;
  const tick = async () => {
    if (running) return; // Callyzer allows one request per two seconds: never stack runs
    running = true;
    try { await loadAll(); await syncAll(); } catch (err) { console.error('[CALLYZER-CRON] Error:', err); } finally { running = false; }
  };
  setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 45_000);
  console.log('📱 Callyzer call sync scheduled every 10 minutes');
}
