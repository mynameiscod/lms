import { runAutomationSweep } from '../services/leadAutomationService';

/** CRM automation sweep every 5 minutes (job-runner process only; started in server.ts). */
const INTERVAL_MS = 5 * 60 * 1000;
let running = false;

export function startLeadAutomationScheduler(io: any): void {
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runAutomationSweep(io); } catch (err: any) { console.error('[AUTOMATION] sweep error:', err?.message); } finally { running = false; }
  };
  setTimeout(tick, 45_000);
  setInterval(tick, INTERVAL_MS);
  console.log(`🤖 CRM automation sweep scheduled every ${INTERVAL_MS / 60000} minutes`);
}
