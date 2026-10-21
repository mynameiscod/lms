/**
 * communicationReminderCron — a once-a-day in-app nudge for students who have an active
 * communication streak but haven't practised yet today, so they don't lose it. Targeted
 * (only engaged students), tenant-module-gated, and idempotent via lastRemindedDate.
 */
import CommunicationStreak from '../models/CommunicationStreak';
import Tenant from '../models/Tenant';
import { createNotifications } from '../notifications/notificationService';
import * as settings from '../services/settingsService';
import { sendWhatsAppTemplate } from '../services/assessmentOtpService';
import { studentsToRemind, coachToday } from '../services/communicationCoachService';
import CommunicationReminderLog from '../models/CommunicationReminderLog';

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

/**
 * Every evening (6 PM IST, not Sundays): everyone who has not done a Coach recording today gets a
 * free in-app reminder, and a WhatsApp too when the institute has assigned a template for it
 * (Admin → WhatsApp Templates → Where used), so nothing is spent until they choose to. One
 * reminder per student per day, remembered in CommunicationReminderLog so a restart never repeats it.
 */
const REMIND_FROM_HOUR_IST = 18;
export async function fireCoachReminders(): Promise<number> {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  if (ist.getUTCHours() < REMIND_FROM_HOUR_IST || ist.getUTCDay() === 0) return 0;
  const today = coachToday();
  const tenants = await Tenant.find({ 'modules.aiCommunicationLab': { $ne: false }, isActive: { $ne: false } }).select('_id').lean();
  let sent = 0;
  for (const t of tenants as any[]) {
    const tenantId = String(t._id);
    const due = await studentsToRemind(tenantId);
    if (!due.length) continue;
    const done = new Set((await CommunicationReminderLog.find({ tenantId, date: today }).select('studentId').lean()).map((r: any) => String(r.studentId)));
    const waOn = !!settings.getStr('WHATSAPP_TEMPLATE_COMMUNICATION_REMINDER', '', tenantId);
    for (const s of due) {
      if (done.has(s.studentId)) continue;
      try {
        await CommunicationReminderLog.create({ tenantId, studentId: s.studentId, date: today });
      } catch { continue; } // unique index: another tick already did this student
      await createNotifications(tenantId, [s.studentId], 'general', '🎙 Your speaking practice for today', `${s.status}. Ten minutes a day is what changes how you sound in interviews.`, '/ai-communication-lab').catch(() => {});
      if (waOn && s.phone) {
        await sendWhatsAppTemplate(tenantId, s.phone, { purpose: 'COMMUNICATION_REMINDER', body: [s.name, s.status] }).catch(() => undefined);
        await new Promise((ok) => setTimeout(ok, 150));
      }
      sent++;
    }
  }
  return sent;
}

export function startCommunicationReminderScheduler(): void {
  setInterval(() => { fireCommunicationReminders().catch(() => {}); fireCoachReminders().catch((e) => console.error('[coach-reminders]', e?.message)); }, TICK_MS);
  // eslint-disable-next-line no-console
  console.log('⏰ Communication-lab reminder scheduler started (hourly)');
}
