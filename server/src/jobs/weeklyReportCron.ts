import mongoose from 'mongoose';
import WeeklyReportSetting from '../models/WeeklyReportSetting';
import Tenant from '../models/Tenant';
import { effectiveModules } from '../config/tenantModules';
import { resolveWeek } from '../services/weeklyReportService';
import { allBatchStudents, sendMany, Channel } from '../services/weeklyReportSender';
import { purposeTemplate } from '../services/purposeMessaging';

/**
 * Automatic weekly reports (2026-11-26). For every institute that switched it on (Weekly Reports →
 * "Send automatically every Monday"), from Monday 08:00 IST each active batch student gets last
 * week's report — once. Students with nothing that week, or already sent that week's report by
 * hand, are skipped.
 *
 * Once a week per institute: the run claims the week on WeeklyReportSetting.lastAutoWeek with a
 * conditional update first, so a restart or a second server cannot send it again. If the server
 * was down on Monday, the next check that week sends it.
 */

const SEND_FROM_HOUR_IST = 8;
const istNow = () => new Date(Date.now() + 5.5 * 3600_000);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

let running = false;

export async function runWeeklyReportTick(now: Date = istNow()): Promise<number> {
  if (mongoose.connection.readyState !== 1 || running) return 0;
  // Monday before 08:00 IST: wait, so the report goes out in the morning, not at midnight.
  if (now.getUTCDay() === 1 && now.getUTCHours() < SEND_FROM_HOUR_IST) return 0;
  running = true;
  let runs = 0;
  try {
    const { start } = resolveWeek();
    const weekKey = ymd(start);
    const due = await WeeklyReportSetting.find({ autoSend: true, lastAutoWeek: { $ne: weekKey } }).lean();
    for (const s of due) {
      const tenant: any = await Tenant.findById(s.tenantId).select('isActive status modules').lean().catch(() => null);
      if (!tenant || tenant.isActive === false || !effectiveModules(tenant.modules).weeklyReports) continue;
      // Claim the week before sending.
      const claim = await WeeklyReportSetting.updateOne(
        { _id: s._id, autoSend: true, lastAutoWeek: { $ne: weekKey } },
        { $set: { lastAutoWeek: weekKey, lastAutoAt: new Date() } },
      );
      if (!claim.modifiedCount) continue;
      let channels = (s.channels?.length ? s.channels : ['email']) as Channel[];
      if (!purposeTemplate(s.tenantId, 'WEEKLY_REPORT')) channels = channels.filter((c) => c !== 'whatsapp');
      if (!channels.length) channels = ['email'];
      try {
        const students = await allBatchStudents(s.tenantId);
        const r = await sendMany(s.tenantId, students.map((u: any) => String(u._id)), {
          weekStart: weekKey, channels, skipEmpty: true, skipAlreadySent: true, label: 'automatic Monday send',
        });
        await WeeklyReportSetting.updateOne({ _id: s._id }, {
          $set: { lastAutoResult: { sent: r.sent, failed: r.failed, skippedEmpty: r.skippedEmpty, skippedAlreadySent: r.skippedAlreadySent } },
        });
        runs++;
      } catch (e: any) {
        console.error('[WEEKLY REPORT] automatic send failed for', s.tenantId, e?.message);
      }
    }
  } finally {
    running = false;
  }
  return runs;
}

export function startWeeklyReportScheduler() {
  setTimeout(() => { runWeeklyReportTick().catch(() => undefined); }, 90_000);
  setInterval(() => { runWeeklyReportTick().catch((e) => console.error('[WEEKLY REPORT] tick', e?.message)); }, 10 * 60_000);
}
