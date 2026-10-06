import { fireDueReminders } from '../services/placementPortalService';

/**
 * Placement Program interview reminders: WhatsApp 24 hours and 1 hour before each booked interview.
 * Each reminder is claimed in the database before it is sent (see fireDueReminders), so the two
 * slots that overlap during a deploy cannot both send it.
 */
export function startPlacementReminderScheduler(): NodeJS.Timeout {
  let running = false;
  const handle = setInterval(async () => {
    if (running) return;
    running = true;
    try { await fireDueReminders(); } catch (e) { console.error('[placement-reminder] run failed', e); }
    finally { running = false; }
  }, 2 * 60 * 1000);
  console.log('🔔 Placement interview reminder scheduler started (every 2 min)');
  return handle;
}
