/**
 * CRM: Book a demo — every 2 minutes: send due reminders (about 1 day and 1 hour before) and settle
 * slots that have ended (attendance from the live room, no-show follow-ups, "pick another time").
 * Both steps claim their rows first, so several server processes can run this safely.
 */
import { sendDueReminders, settleEndedSlots } from '../services/demoBookingService';

const TICK_MS = 2 * 60 * 1000;

export async function runDemoBookingTick(now = new Date()) {
  const reminders = await sendDueReminders(now).catch((e) => { console.error('[demo-booking] reminders failed', e?.message); return 0; });
  const settled = await settleEndedSlots(now).catch((e) => { console.error('[demo-booking] settle failed', e?.message); return 0; });
  return { reminders, settled };
}

export function startDemoBookingScheduler(): void {
  setInterval(() => { runDemoBookingTick().catch(() => undefined); }, TICK_MS);
  // eslint-disable-next-line no-console
  console.log('⏰ Book-a-demo scheduler started (every 2 min)');
}
