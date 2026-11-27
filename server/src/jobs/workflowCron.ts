import { resumeDue } from '../services/workflow/engine';

/**
 * Workflow Builder: every minute, continue the runs whose wait is over (timers, demo reminders,
 * office opening) or whose question timed out. Job-runner process only (started in server.ts).
 */
const INTERVAL_MS = 60 * 1000;
let running = false;

export function startWorkflowScheduler(): void {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const n = await resumeDue();
      if (n) console.log(`[WORKFLOW] continued ${n} run(s)`);
    } catch (err: any) {
      console.error('[WORKFLOW] tick error:', err?.message);
    } finally { running = false; }
  };
  setTimeout(tick, 30_000);
  setInterval(tick, INTERVAL_MS);
  console.log('🔁 Workflow runs checked every minute');
}
