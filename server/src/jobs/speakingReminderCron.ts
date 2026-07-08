import SpeakingTask from '../models/SpeakingTask';
import SpeakingSubmission from '../models/SpeakingSubmission';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';

const REMIND_HOUR = 8; // ~08:00 local server time
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * For each active speaking task whose schedule includes today, send a single in-app
 * reminder to every student in its batch(es) who hasn't recorded today's occurrence.
 */
export async function fireSpeakingReminders(): Promise<number> {
  const tasks = await SpeakingTask.find({ status: 'active' }).lean();
  const now = new Date();
  const todayAbbr = DAY_ABBR[now.getDay()];
  const todayStr = ymd(now);
  let sent = 0;

  for (const t of tasks) {
    try {
      if (!(t.days || []).map((d: string) => d.slice(0, 3)).includes(todayAbbr)) continue;
      if (t.startDate && new Date(t.startDate) > now) continue;
      if (t.endDate && new Date(new Date(t.endDate).setHours(23, 59, 59, 999)) < now) continue;

      const filter: any = { tenantId: t.tenantId, role: 'STUDENT', isActive: { $ne: false } };
      if (t.batchIds && t.batchIds.length) filter.batchId = { $in: t.batchIds };
      const students = await User.find(filter).select('_id').lean();
      if (!students.length) continue;

      const doneRows = await SpeakingSubmission.find({ tenantId: t.tenantId, taskId: t._id, dueDate: todayStr }).select('studentId').lean();
      const done = new Set(doneRows.map((s: any) => String(s.studentId)));
      const missing = students.filter((s: any) => !done.has(String(s._id))).map((s: any) => String(s._id));
      if (missing.length) {
        await createNotifications(
          String(t.tenantId), missing, 'general',
          '🎤 Speaking task due today',
          `${t.title} — record your response in Speaking Practice.`,
          '/speaking-practice'
        );
        sent += missing.length;
      }
    } catch (e: any) { console.error('[speakingReminderCron] task failed:', e?.message); }
  }
  return sent;
}

/** Daily scheduler — fires once when local time reaches REMIND_HOUR. */
export function startSpeakingReminderScheduler(): NodeJS.Timeout {
  let lastFired = '';
  const handle = setInterval(async () => {
    const now = new Date();
    const k = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (now.getHours() === REMIND_HOUR && lastFired !== k) {
      lastFired = k;
      try { const n = await fireSpeakingReminders(); if (n) console.log(`🎤 Speaking reminders sent: ${n}`); }
      catch (e: any) { console.error('[speakingReminderCron]', e?.message); }
    }
  }, 5 * 60 * 1000);
  console.log(`🎤 Speaking-reminder scheduler started (fires daily at ${REMIND_HOUR}:00)`);
  return handle;
}
