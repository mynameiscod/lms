import InterviewAssignment from '../models/InterviewAssignment';
import InterviewTemplate from '../models/InterviewTemplate';
import { createNotifications } from '../notifications/notificationService';

const REMIND_WINDOW_MIN = 30;   // notify students this many minutes before the slot
const TICK_MS = 5 * 60 * 1000;  // scan every 5 minutes

/**
 * Fire a single "starts soon" in-app reminder for every scheduled interview whose slot
 * falls inside the next REMIND_WINDOW_MIN minutes and that hasn't been reminded yet.
 * Idempotent via the notifiedBeforeStart flag.
 */
export async function fireInterviewReminders(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MIN * 60 * 1000);

  const due = await InterviewAssignment.find({
    mode: 'conversational',
    status: { $in: ['assigned', 'in_progress'] },
    notifiedBeforeStart: { $ne: true },
    scheduledAt: { $gte: now, $lte: windowEnd },
  }).lean();

  if (!due.length) return 0;

  // Batch template titles to avoid N queries.
  const titleById = new Map<string, string>();
  const tmpls = await InterviewTemplate.find({
    _id: { $in: due.map((a: any) => a.templateId) },
  }).select('title').lean();
  tmpls.forEach((t: any) => titleById.set(String(t._id), t.title));

  let sent = 0;
  for (const a of due) {
    try {
      const when = a.scheduledAt
        ? new Date(a.scheduledAt).toLocaleString('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })
        : '';
      const title = titleById.get(String(a.templateId)) || 'AI Interview';
      await createNotifications(
        String(a.tenantId), [String(a.studentId)], 'general',
        '🎤 Your AI Interview starts soon',
        `${title}${when ? ` at ${when}` : ''} — open "My Interviews" and click Join.`,
        '/my-interviews'
      );
      await InterviewAssignment.updateOne({ _id: a._id }, { $set: { notifiedBeforeStart: true } });
      sent++;
    } catch (e: any) { console.error('[interviewReminderCron] assignment failed:', e?.message); }
  }
  return sent;
}

/** Scheduler — scans every 5 minutes for slots opening within the next 30 minutes. */
export function startInterviewReminderScheduler(): NodeJS.Timeout {
  const handle = setInterval(async () => {
    try { const n = await fireInterviewReminders(); if (n) console.log(`🎤 Interview start-reminders sent: ${n}`); }
    catch (e: any) { console.error('[interviewReminderCron]', e?.message); }
  }, TICK_MS);
  console.log(`🎤 Interview start-reminder scheduler started (scans every ${TICK_MS / 60000}m, ${REMIND_WINDOW_MIN}m lead)`);
  return handle;
}
