import { processGamificationEvent } from './gamificationEngine';
import mongoose from 'mongoose';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';

/**
 * XP for the Foundation journey — each finished task, and the day as a whole.
 *
 * WHY THIS EXISTS. On the unit engine a member's daily work IS their journey day, but nothing on
 * that path paid CareerPilot XP: the only counter it touched was CurriculumEnrollment.xp, which no
 * CareerPilot screen reads. So the dashboard's XP bar, level, streak and leaderboard never moved
 * for the work the product asks of them every day.
 *
 * PRICED BY EFFORT (agreed with the product owner): watching or reading is light, practice more,
 * a checkpoint or a project most, and finishing every task of a day pays a bonus on top.
 *
 * PAID ONCE, WHENEVER IT IS NOTICED. Completion of a lesson is recorded when it is marked done;
 * completion of a checkpoint or project is DERIVED from its attempt or submission, which happens
 * in other modules. So rather than hook every one of those, this reconciles a day: whoever reads
 * the day (the player, the dashboard, a mark-done) calls it, and the gamification ledger's unique
 * key (enrollment + day + task) refuses anything already paid. Reconciling twice pays nothing more.
 *
 * NEVER BREAKS A PAGE. Errors are logged and swallowed — a missed award is repaired by the next
 * read, a failed day page is not.
 */

export const FOUNDATION_ACTIVITY_EVENT = 'FOUNDATION_ACTIVITY_COMPLETED';
export const FOUNDATION_DAY_EVENT = 'FOUNDATION_DAY_COMPLETED';

/** By content type, then by kind. Mock interviews pay 0 here: MOCK_INTERVIEW_COMPLETED already pays them. */
const XP_BY_TYPE: Record<string, number> = {
  video: 5, notes: 5, worked_example: 5, interactive_lesson: 5, interactive_activity: 5,
  practice_theory: 10, tech_qa: 10, behavioral_qa: 10, aptitude: 10,
  practice_coding: 15,
  quiz: 20,
  assignment: 30,
};
const XP_BY_KIND: Record<string, number> = { quiz: 20, assignment: 30, codeSnippet: 15, mockInterview: 0, content: 5 };

export const FOUNDATION_DAY_BONUS_XP = 25;

export const xpForJourneyItem = (item: { kind?: string; contentType?: string; type?: string }): number => {
  const kind = item.kind || 'content';
  if (kind === 'mockInterview') return 0;
  const type = item.contentType || item.type || '';
  if (type in XP_BY_TYPE) return XP_BY_TYPE[type];
  return XP_BY_KIND[kind] ?? 5;
};

/** Actually finished — unlike itemDone, an optional task counts only when it was really done. */
export const journeyItemFinished = (
  item: any, dayNumber: number,
  completedItems: Array<{ contentId: string; dayNumber: number }>,
  moduleStatus: Record<string, { attempted: boolean }>,
): boolean => {
  const kind = item.kind || 'content';
  if (kind === 'content') {
    return !!item.contentId && completedItems.some(ci => ci.contentId === String(item.contentId) && Number(ci.dayNumber) === dayNumber);
  }
  return !!item.sourceId && !!moduleStatus[String(item.sourceId)]?.attempted;
};

export interface JourneyDayXpInput {
  tenantId: string;
  studentId: string;
  enrollmentId: string;
  dayNumber: number;
  items: any[];
  completedItems: Array<{ contentId: string; dayNumber: number }>;
  moduleStatus: Record<string, { attempted: boolean }>;
  /** True when every required task of the day is done (the caller's own itemDone verdict). */
  dayComplete: boolean;
}

/** Award whatever this day has earned and not yet been paid. Returns the XP newly paid. */
export async function reconcileJourneyDayXp(input: JourneyDayXpInput): Promise<number> {
  const { tenantId, studentId, enrollmentId, dayNumber } = input;
  let paid = 0;
  try {
    for (const item of input.items || []) {
      if (!journeyItemFinished(item, dayNumber, input.completedItems, input.moduleStatus)) continue;
      const xp = xpForJourneyItem(item);
      if (xp <= 0) continue;
      const taskId = String(item._id || item.contentId || item.sourceId || '');
      if (!taskId) continue;
      const r = await processGamificationEvent({
        tenantId, studentId,
        eventKey: FOUNDATION_ACTIVITY_EVENT,
        sourceType: 'foundation_journey',
        sourceId: `${enrollmentId}:${dayNumber}:${taskId}`,
        xpOverride: xp,
        metadata: { dayNumber, kind: item.kind || 'content', type: item.contentType || null, title: item.contentTitle || null },
      });
      paid += r.awarded || 0;
    }
    if (input.dayComplete) {
      const r = await processGamificationEvent({
        tenantId, studentId,
        eventKey: FOUNDATION_DAY_EVENT,
        sourceType: 'foundation_journey',
        sourceId: `${enrollmentId}:${dayNumber}`,
        metadata: { dayNumber },
      });
      paid += r.awarded || 0;
    }
  } catch (e: any) {
    console.error('[foundation-journey-xp]', e?.message || e);
  }
  return paid;
}

/**
 * Today's XP target for a Foundation member: every task of the day their journey is on, plus the day bonus.
 *
 * The dashboard's "Today's goal" was the sum of the TOPIC planner's missions, floored at 1. A Foundation member
 * has none — their missions are the journey day's tasks — so the goal read "0 / 1 XP" and was "smashed" by the
 * first point earned. Null when the student has no Foundation journey, or it is finished: the caller keeps the
 * topic figure then.
 */
export async function journeyDayTargetXp(tenantId: string, studentId: string): Promise<number | null> {
  try {
    const enrollment: any = await CurriculumEnrollment.findOne({
      tenantId, studentId: new mongoose.Types.ObjectId(studentId), enrolledBy: 'foundation-journey',
    }).sort({ createdAt: -1 }).select('curriculumId currentDay').lean();
    if (!enrollment?.curriculumId) return null;
    const plan: any = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber: Number(enrollment.currentDay) || 1 })
      .select('items').lean();
    if (!plan?.items?.length) return null;
    return plan.items.reduce((t: number, it: any) => t + xpForJourneyItem(it), 0) + FOUNDATION_DAY_BONUS_XP;
  } catch (e: any) {
    console.error('[foundation-journey-xp] target:', e?.message || e);
    return null;
  }
}
