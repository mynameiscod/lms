/**
 * May THIS student open THIS assignment today, as far as their Foundation journey is concerned?
 *
 * ── WHY THE SERVER HAS TO ASK ─────────────────────────────────────────────────────────────
 *
 * A journey day's assignment is delivered as curriculum content, which by design bypasses the
 * assignment's own DRAFT status and date window. The day endpoint never sends a locked day's
 * activities, but a lock that holds only because an id was never sent is not a lock: anyone holding
 * the id could open, start and submit day fourteen's assignment on day one.
 *
 * ── THE RULE IS THE DAY'S RULE ────────────────────────────────────────────────────────────
 *
 * An assignment bound to a day of the student's own Foundation journey is open exactly when that day
 * is open under the ladder and membership My 90 Days enforces (data/journeyDayLadder). Completed days
 * stay open for review. An assignment on no day of their journey is not Foundation's to decide — every
 * other assignment workflow (batch schedules, learning plans, standalone assignments) is untouched.
 */

import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { foundationAccess } from './foundationAccessService';
import { JourneyDayRefusal, journeyDayRefusal } from '../data/journeyDayLadder';

/** Duplicated from foundationJourneyService on purpose: importing it would load the composer into every assignment request. */
const FOUNDATION_JOURNEY_KIND = 'FOUNDATION_UNIT_JOURNEY_V1';

export type FoundationAssignmentAccess =
  | { bound: false }
  | { bound: true; allowed: true; day: number }
  | { bound: true; allowed: false; day: number; reason: JourneyDayRefusal };

export async function foundationAssignmentAccess(
  tenantId: string, studentId: string, assignmentId: string,
): Promise<FoundationAssignmentAccess> {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(assignmentId)) return { bound: false };

  const journey = await LearningCurriculum.findOne({
    tenantId: String(tenantId),
    personalizedFor: new mongoose.Types.ObjectId(studentId),
    adaptiveStage: 'foundation',
    journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean() as any;
  if (!journey) return { bound: false };

  const days = (await DayPlan.find({
    curriculumId: journey._id,
    items: { $elemMatch: { kind: 'assignment', sourceId: new mongoose.Types.ObjectId(assignmentId) } },
  }).select('dayNumber').lean() as any[]).map(d => Number(d.dayNumber)).sort((a, b) => a - b);
  if (!days.length) return { bound: false };

  const [enrollment, access] = await Promise.all([
    CurriculumEnrollment.findOne({
      tenantId: String(tenantId), curriculumId: journey._id, studentId: new mongoose.Types.ObjectId(studentId),
    }).select('completedDays').lean() as any,
    foundationAccess(String(tenantId), String(studentId)),
  ]);
  const completed = new Set<number>(((enrollment?.completedDays || []) as number[]).map(Number));

  // Bound to more than one day would be an authoring fault; the assignment is open if any of its days is.
  let refused: { day: number; reason: JourneyDayRefusal } | null = null;
  for (const day of days) {
    const reason = journeyDayRefusal(day, completed, access);
    if (!reason) return { bound: true, allowed: true, day };
    if (!refused) refused = { day, reason };
  }
  return { bound: true, allowed: false, ...refused! };
}

/** What a refused student is told: the day and why, and nothing of the assignment itself. */
export const refusalBody = (access: Extract<FoundationAssignmentAccess, { allowed: false }>) => ({
  success: false,
  reason: access.reason,
  day: access.day,
  message: access.reason === 'MEMBERSHIP_REQUIRED'
    ? `Take membership to open day ${access.day} of your roadmap.`
    : `This assignment opens on day ${access.day} of your journey. Finish day ${access.day - 1} first.`,
});
