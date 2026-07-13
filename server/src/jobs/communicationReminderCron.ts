/**
 * communicationReminderCron — a once-a-day in-app nudge for students who have an active
 * communication streak but haven't practised yet today, so they don't lose it. Targeted
 * (only engaged students), tenant-module-gated, and idempotent via lastRemindedDate.
 */
import CommunicationStreak from '../models/CommunicationStreak';
import Tenant from '../models/Tenant';
import { createNotifications } from '../notifications/notificationService';

const TICK_MS = 60 * 60 * 1000; // scan hourly

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function fireCommunicationReminders(): Promise<number> {
  const today = ymd(new Date());

  // Engaged students who kept a streak but haven't completed today and weren't reminded today
  const due = await CommunicationStreak.find({
    currentStreak: { $gte: 1 },
    lastCompletedDate: { $ne: today },
    lastRemindedDate: { $ne: today },
  }).select('tenantId studentId currentStreak').limit(2000).lean();
  if (!due.length) return 0;

  // Only remind tenants that still have the module enabled
  const tenantIds = [...new Set(due.map((d: any) => String(d.tenantId)))];
  const tenants = await Tenant.find({ _id: { $in: tenantIds } }).select('modules').lean();
  const enabled: Record<string, boolean> = {};
  tenants.forEach((t: any) => { enabled[String(t._id)] = t.modules?.aiCommunicationLab !== false; });

  let sent = 0;
  for (const s of due as any[]) {
    if (!enabled[String(s.tenantId)]) continue;
    try {
      await createNotifications(
        String(s.tenantId), [String(s.studentId)], 'general',
        '🎙 Keep your communication streak alive',
        `You're on a ${s.currentStreak}-day streak — complete today's 3-minute practice before midnight.`,
        '/ai-communication-lab'
      );
      await CommunicationStreak.updateOne({ _id: s._id }, { $set: { lastRemindedDate: today } });
      sent++;
    } catch { /* best-effort */ }
  }
  return sent;
}

export function startCommunicationReminderScheduler(): void {
  setInterval(() => { fireCommunicationReminders().catch(() => {}); }, TICK_MS);
  // eslint-disable-next-line no-console
  console.log('⏰ Communication-lab reminder scheduler started (hourly)');
}
