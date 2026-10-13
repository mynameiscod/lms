/**
 * liveClassReminderCron — fires a single "class starts soon" reminder shortly before a live class
 * begins, to everyone it is for: students of its batches and everyone invited one by one (guests
 * included). In-app for LMS users, email for anyone with an email, WhatsApp for anyone with a
 * mobile once a template is assigned. Idempotent via reminderSent.
 */
import LiveClass from '../models/LiveClass';
import { expandBatches, sendInvites } from '../services/liveClassInviteService';

const REMIND_WINDOW_MIN = 20;      // remind when the class is within this many minutes
const TICK_MS = 5 * 60 * 1000;     // scan every 5 minutes

export async function fireLiveClassReminders(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MIN * 60 * 1000);

  const due = await LiveClass.find({
    status: 'scheduled',
    reminderSent: { $ne: true },
    scheduledAt: { $gte: now, $lte: windowEnd },
  });

  let sent = 0;
  for (const lc of due) {
    try {
      // Claimed first, so two server slots running this at once cannot both send.
      const claimed = await LiveClass.updateOne({ _id: lc._id, reminderSent: { $ne: true } }, { $set: { reminderSent: true } });
      if (!claimed.modifiedCount) continue;
      await expandBatches(lc);
      await sendInvites(lc, { kind: 'reminder', channels: { email: true, whatsapp: true }, onlyUnsent: true });
      sent++;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[liveClassReminderCron] failed for', String(lc._id), err?.message);
    }
  }
  return sent;
}

export function startLiveClassReminderScheduler(): void {
  setInterval(() => {
    fireLiveClassReminders().catch(() => {});
  }, TICK_MS);
  // eslint-disable-next-line no-console
  console.log('⏰ Live-class reminder scheduler started (every 5 min)');
}
