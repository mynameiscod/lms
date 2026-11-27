import { processGamificationEvent } from './gamificationEngine';
import mongoose from 'mongoose';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import DayPlan from '../models/DayPlan';
import { XpLedger } from '../models/GamificationModels';
import { loadXpPricing, xpForTask, DEFAULT_PRICING, XpPricing } from './xpPricingService';

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

/**
 * The shipped day bonus. What a day actually pays is the FOUNDATION_DAY_COMPLETED rule's amount, which an
 * admin sets — read it from loadXpPricing(...).dayBonus. Kept for callers with no tenant to ask.
 */
export const FOUNDATION_DAY_BONUS_XP = 25;

/**
 * What a journey task pays. Priced by the tenant's price list (xpPricingService): a price an admin set on
 * the task itself, else its type's. Without a price list it uses the shipped defaults.
 */
export const xpForJourneyItem = (
  item: { kind?: string; contentType?: string; type?: string; contentId?: any; sourceId?: any },
  pricing: XpPricing = DEFAULT_PRICING,
): number => xpForTask(item, pricing);

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
    const pricing = await loadXpPricing(tenantId);
    for (const item of input.items || []) {
      if (!journeyItemFinished(item, dayNumber, input.completedItems, input.moduleStatus)) continue;
      const xp = xpForJourneyItem(item, pricing);
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
 * How far through their current journey a member is: days completed out of the journey's days.
 * The coder score's "Missions" part reads this; it used to read the retired mission roadmap, which
 * a journey member never writes to, so it stayed at 0 for them. Null when there is no journey.
 */
export async function journeyCompletion(tenantId: string, studentId: string): Promise<{ completedDays: number; totalDays: number } | null> {
  try {
    if (!mongoose.Types.ObjectId.isValid(studentId)) return null;
    const sid = new mongoose.Types.ObjectId(studentId);
    const enrollment: any = await CurriculumEnrollment.findOne({ tenantId, studentId: sid, enrolledBy: 'foundation-journey' })
      .sort({ createdAt: -1 }).select('curriculumId completedDays').lean();
    if (!enrollment?.curriculumId) return null;
    const totalDays = await DayPlan.countDocuments({ curriculumId: enrollment.curriculumId });
    if (!totalDays) return null;
    const completedDays = new Set((enrollment.completedDays || []).map(Number).filter((d: number) => d >= 1 && d <= totalDays)).size;
    return { completedDays, totalDays };
  } catch (e: any) {
    console.error('[foundation-journey-xp] completion:', e?.message || e);
    return null;
  }
}

export interface JourneyDayGoal { day: number; target: number; earned: number }

/**
 * Today's goal for a Foundation member: the journey day they are working on, not whatever XP happened to land today.
 *
 * TARGET: that day's tasks plus the day bonus — the figures the missions card shows. (The topic planner's missions,
 * which a Foundation member does not have, left it at "1 XP".)
 *
 * EARNED: only XP paid for THAT day's tasks and bonus, read from the ledger by the award's own key
 * (enrollment:day:task). Counting every XP point earned since midnight made a finished Day 1, credited this morning,
 * read as "today's goal reached" on a Day 2 not yet started.
 *
 * WHICH DAY: always the day the journey is on — the one the missions card shows. Finishing a day moves both to the
 * next day (at 0), as the student expects: the goal is the work in front of them, not the work behind.
 *
 * Null when the student has no Foundation journey or its day has no tasks — the caller keeps the topic goal.
 */
export async function journeyDayGoal(tenantId: string, studentId: string): Promise<JourneyDayGoal | null> {
  try {
    const sid = new mongoose.Types.ObjectId(studentId);
    const enrollment: any = await CurriculumEnrollment.findOne({ tenantId, studentId: sid, enrolledBy: 'foundation-journey' })
      .sort({ createdAt: -1 }).select('_id curriculumId currentDay').lean();
    if (!enrollment?.curriculumId) return null;

    // Always the day the journey is on — the same day the missions card shows, so the two never disagree.
    const day = Number(enrollment.currentDay) || 1;

    const plan: any = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber: day }).select('items').lean();
    if (!plan?.items?.length) return null;
    const pricing = await loadXpPricing(tenantId);
    const target = plan.items.reduce((t: number, it: any) => t + xpForJourneyItem(it, pricing), 0) + pricing.dayBonus;

    const prefix = `${String(enrollment._id)}:${day}`;
    // The day's awards: its bonus ("enrollment:day") and its tasks ("enrollment:day:task").
    const paid: any[] = await XpLedger.find({
      tenantId, studentId: sid, sourceType: 'foundation_journey',
      sourceId: { $regex: `^${prefix}(:|$)` },
    }).select('amount').lean() as any;
    const earned = paid.reduce((t, l) => t + (Number(l.amount) || 0), 0);
    return { day, target, earned };
  } catch (e: any) {
    console.error('[foundation-journey-xp] goal:', e?.message || e);
    return null;
  }
}
