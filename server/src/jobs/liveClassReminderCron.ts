/**
 * liveClassReminderCron — fires a single "class starts soon" reminder (in-app + email)
 * to a class's batch students shortly before it begins. Idempotent via reminderSent.
 */
import LiveClass from '../models/LiveClass';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';
import { EmailService } from '../services/emailService';

const REMIND_WINDOW_MIN = 20;      // remind when the class is within this many minutes
const TICK_MS = 5 * 60 * 1000;     // scan every 5 minutes

export async function fireLiveClassReminders(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMIND_WINDOW_MIN * 60 * 1000);

  const due = await LiveClass.find({
    status: 'scheduled',
    reminderSent: { $ne: true },
    scheduledAt: { $gte: now, $lte: windowEnd },
  }).lean();

  if (!due.length) return 0;

  const emailService = new EmailService();
  const frontendUrl = process.env.FRONTEND_URL || 'https://platform.codebegun.com';
  let sent = 0;

  for (const lc of due) {
    try {
      // Recipients = students of the class's batch (if any)
      const students = lc.batchId
        ? await User.find({ tenantId: lc.tenantId, batchId: lc.batchId, role: 'STUDENT', isActive: { $ne: false } })
            .select('_id email firstName')
            .lean()
        : [];

      const when = lc.scheduledAt
        ? new Date(lc.scheduledAt).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'medium', timeZone: 'Asia/Kolkata' })
        : '';
      const link = `${frontendUrl}/hms-classes`;

      if (students.length) {
        // In-app for everyone at once
        await createNotifications(
          String(lc.tenantId),
          students.map((s: any) => String(s._id)),
          'general',
          '🎥 Live class starts soon',
          `"${lc.title}"${when ? ` at ${when}` : ''} — open Live Classes and click Join.`,
          '/hms-classes'
        );

        // Email (best-effort, paced by the email service itself)
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1a5490">🎥 Your live class starts soon</h2>
            <p><strong>${lc.title}</strong></p>
            <p>Starts at <strong>${when}</strong> (${lc.durationMin} min).</p>
            <p><a href="${link}" style="display:inline-block;background:#1a5490;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">Join the class →</a></p>
            <p style="color:#6b7280;font-size:13px">Tip: use Chrome and allow camera/mic if the instructor brings you on stage.</p>
          </div>`;
        for (const s of students as any[]) {
          if (s.email) {
            emailService
              .sendGenericEmail(s.email, `Live class "${lc.title}" starts soon`, html)
              .catch(() => {});
          }
        }
      }

      await LiveClass.updateOne({ _id: lc._id }, { $set: { reminderSent: true } });
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
