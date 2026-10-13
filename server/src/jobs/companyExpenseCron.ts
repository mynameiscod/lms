import { loadAll } from '../services/settingsService';
import { generateRecurringForAll } from '../services/companyExpenseService';

/**
 * Adds each month's line for recurring costs (rent, subscriptions) once the day they fall on has
 * come. Checked every hour; adding a line twice is impossible, so repeated checks are harmless.
 * Runs in the job-runner process only (see server.ts).
 */
const INTERVAL_MS = 60 * 60_000;

export function startCompanyExpenseScheduler(): void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await loadAll(); const n = await generateRecurringForAll(); if (n) console.log(`💸 Added ${n} recurring expense line(s)`); }
    catch (err) { console.error('[COMPANY-EXPENSE-CRON] Error:', err); }
    finally { running = false; }
  };
  setInterval(tick, INTERVAL_MS);
  setTimeout(tick, 45_000);
  console.log('💸 Recurring company expenses scheduled hourly');
}
