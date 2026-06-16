import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import BatchOffering from '../models/BatchOffering';
import { effectiveItemsForDay, holidaySet } from '../controllers/batchOfferingController';
import { planDayForDate } from '../utils/planSchedule';
import { resolveModuleStatuses, itemDone, currentPlanDay } from '../controllers/enrollmentPlanController';
import { createNotifications } from '../notifications/notificationService';

const REMIND_HOUR = 7; // 07:00 local server time
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * For every active enrollment, find today's plan day, count its still-pending
 * activities (content + modules), and send a single in-app reminder per student
 * per day linking to /my-tasks.
 */
export async function fireDueReminders(): Promise<number> {
  const enrolls = await CurriculumEnrollment.find({ status: 'active' }).lean();
  const todayKey = dayKey(new Date());
  let sent = 0;

  for (const en of enrolls) {
    try {
      if (en.lastReminderOn && dayKey(new Date(en.lastReminderOn)) === todayKey) continue;

      const curriculum = await LearningCurriculum.findById(en.curriculumId).select('totalDays').lean();
      if (!curriculum) continue;
      const offering = en.offeringId ? await BatchOffering.findOne({ _id: en.offeringId }).lean() : null;
      const hSet = offering ? holidaySet(offering) : new Set<string>();

      const day = offering
        ? planDayForDate(offering.startDate, curriculum.totalDays, hSet)
        : currentPlanDay(en.startDate, curriculum.totalDays);
      if (!day) continue;

      const dp = await DayPlan.findOne({ curriculumId: en.curriculumId, dayNumber: day }).lean();
      if (!dp) continue;
      const items = effectiveItemsForDay(dp.items, offering, day);
      if (items.length === 0) continue;

      const moduleStatus = await resolveModuleStatuses(en.studentId.toString(), items);
      const pending = items.filter((it: any) => !itemDone(it, day, en.completedItems, moduleStatus));
      if (pending.length === 0) continue;

      await createNotifications(
        en.tenantId,
        [en.studentId.toString()],
        'general',
        `📅 ${pending.length} ${pending.length === 1 ? 'task' : 'tasks'} due today`,
        `You have ${pending.length} pending ${pending.length === 1 ? 'activity' : 'activities'} in "${en.curriculumTitle}" (Day ${day}). Open My Tasks to continue.`,
        '/my-tasks'
      );
      await CurriculumEnrollment.updateOne({ _id: en._id }, { $set: { lastReminderOn: new Date() } });
      sent++;
    } catch (e) {
      console.error('[due-reminder] enrollment failed', en._id, e);
    }
  }
  if (sent > 0) console.log(`🔔 Due reminders sent to ${sent} student(s)`);
  return sent;
}

/** Daily scheduler — fires once when local time reaches REMIND_HOUR. */
export function startDueReminderScheduler(): NodeJS.Timeout {
  let lastFired = '';
  const handle = setInterval(async () => {
    const now = new Date();
    const k = dayKey(now);
    if (now.getHours() === REMIND_HOUR && lastFired !== k) {
      lastFired = k;
      try { await fireDueReminders(); } catch (e) { console.error('[due-reminder] run failed', e); }
    }
  }, 60 * 1000);
  console.log(`🔔 Due-reminder scheduler started (fires daily at ${REMIND_HOUR}:00)`);
  return handle;
}
