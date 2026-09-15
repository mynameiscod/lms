/**
 * Which live Foundation journeys a unit sits in — asked before a unit is taken out of the pool.
 *
 * ── WHY THE AUTHORING SCREEN HAS TO ASK ───────────────────────────────────────────────────
 *
 * A journey is written once and then only its future is recomposed. A unit an admin unpublishes or
 * archives is still on the days already written for students, and a composer that no longer has it
 * cannot schedule it the next time those plans update. Neither is wrong in itself — curricula are
 * corrected — but it must be a decision somebody made while looking at the number of students it
 * touches, not a side effect they discover from a support message.
 *
 * ── REACHED AND UPCOMING ──────────────────────────────────────────────────────────────────
 *
 * A day a student has completed, or is on, is history: it keeps its unit whatever happens to the
 * curriculum. An upcoming day is what an edit actually changes. The two are counted separately so
 * the confirmation can say which it is.
 */

import mongoose from 'mongoose';
import DayPlan from '../models/DayPlan';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { FOUNDATION_JOURNEY_KIND } from './foundationJourneyService';

export interface LiveJourneyUsage {
  /** Students whose Foundation journey schedules this unit on some day. */
  students: number;
  /** Days those students have not reached yet — what taking the unit out actually changes. */
  upcomingDays: number;
  /** Days already completed or current — history, which keeps the unit. */
  reachedDays: number;
}

const NONE: LiveJourneyUsage = { students: 0, upcomingDays: 0, reachedDays: 0 };

export async function liveJourneyUsage(tenantId: string, unitCode: string): Promise<LiveJourneyUsage> {
  const code = String(unitCode || '').trim().toUpperCase();
  if (!tenantId || !code) return { ...NONE };

  // Only journey days carry a primary unit, and the partial index on it keeps this one lookup.
  const days = await DayPlan.find({ primaryUnitCode: code }).select('curriculumId dayNumber').lean() as any[];
  if (!days.length) return { ...NONE };

  const curriculumIds = [...new Set(days.map(d => String(d.curriculumId)))]
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));
  const journeys = await LearningCurriculum.find({
    _id: { $in: curriculumIds }, tenantId, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id personalizedFor').lean() as any[];
  if (!journeys.length) return { ...NONE };

  const journeyIds = new Set(journeys.map(j => String(j._id)));
  const enrollments = await CurriculumEnrollment.find({ curriculumId: { $in: journeys.map(j => j._id) } })
    .select('curriculumId currentDay completedDays').lean() as any[];
  const progress = new Map(enrollments.map(e => [String(e.curriculumId), e]));

  let upcomingDays = 0;
  let reachedDays = 0;
  for (const d of days) {
    if (!journeyIds.has(String(d.curriculumId))) continue;
    const e = progress.get(String(d.curriculumId));
    const current = Number(e?.currentDay || 1);
    const completed = ((e?.completedDays || []) as any[]).map(Number).includes(Number(d.dayNumber));
    if (completed || Number(d.dayNumber) <= current) reachedDays++;
    else upcomingDays++;
  }

  return {
    students: new Set(journeys.map(j => String(j.personalizedFor))).size,
    upcomingDays,
    reachedDays,
  };
}
