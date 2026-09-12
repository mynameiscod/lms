/**
 * Re-planning the days a student has not reached yet.
 *
 * ── WHAT MAY CHANGE, AND WHAT MAY NEVER ───────────────────────────────────────────────────
 *
 * A student learns, practises, is measured, and their Skill DNA moves. The plan should respond
 * — that is the whole point of personalisation continuing past day one. What it may not do is
 * rewrite history.
 *
 *   COMPLETED DAYS      never change. A student finished them; the record of what they
 *                       finished has to still describe what they did.
 *   THE CURRENT DAY     never changes. Somebody is part-way through it. Swapping the unit
 *                       under them mid-session loses their place and their work.
 *   FUTURE DAYS         are recomposed freely. Nobody has seen them.
 *
 * A day is frozen by POSITION, not by content. Completed day 12 stays day 12 with the unit it
 * had, whatever the new composition would prefer there.
 *
 * ── NINETY SURVIVES RECOMPOSITION ─────────────────────────────────────────────────────────
 *
 * The programme does not grow because a student struggled or shrink because they improved. So
 * recomposition fills exactly the slots it emptied: frozen days plus future days is ninety
 * before, and ninety after. If the new composition cannot fill every future slot, NOTHING is
 * written and the existing plan stands — a partially rewritten journey with a hole in it is
 * worse than a slightly stale one.
 *
 * ── EVIDENCE IS READ, NEVER WRITTEN ───────────────────────────────────────────────────────
 *
 * Nothing here writes SkillEvidence, a score, or a skill profile. Recomposition is downstream
 * of measurement in one direction only. The composer reports `scheduledAt` — the state a unit
 * was scheduled at, which may have come from the plan's own teaching — and that value must
 * never travel back into what the platform believes about a student. Teaching somebody loops
 * on day 20 is not evidence that they can write one.
 */

import mongoose from 'mongoose';
import DayPlan from '../models/DayPlan';
import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import { StudentProfile } from './curriculumComposerService';
import {
  composeFoundationJourney, FOUNDATION_JOURNEY_KIND, JourneyBuildOptions,
} from './foundationJourneyService';

export interface RecompositionResult {
  ok: boolean;
  reason?: string;
  /** Days left exactly as they were: everything completed, plus the one in progress. */
  frozenDays: number[];
  /** Days rewritten. Always disjoint from `frozenDays`. */
  rewrittenDays: number[];
  /** Future days whose unit is unchanged — the plan agreeing with itself, not a failure. */
  unchangedFutureDays: number[];
  totalDays: number;
}

/**
 * Which days may not be touched.
 *
 * Everything the student has completed, plus the day they are on. `currentDay` is included
 * even when it is not in `completedDays` — especially then, because that is precisely the day
 * somebody has open.
 */
export function frozenDayNumbers(enrollment: {
  completedDays?: number[]; currentDay?: number;
}): number[] {
  const frozen = new Set<number>((enrollment.completedDays || []).map(Number));
  const current = Number(enrollment.currentDay || 0);
  if (current >= 1) frozen.add(current);
  return [...frozen].filter(d => d >= 1 && d <= FOUNDATION_PROGRAM_DAYS).sort((a, b) => a - b);
}

/**
 * Recompose everything the student has not reached, leaving the rest untouched.
 *
 * `profile` is the CURRENT belief about the student, built by foundationProfileService from
 * Skill DNA. Passing it in rather than fetching it keeps this function honest about its
 * inputs: it cannot accidentally read a plan and call the result evidence.
 */
export async function recomposeFutureDays(
  tenantId: string,
  studentId: mongoose.Types.ObjectId | string,
  profile: StudentProfile,
  opts: JourneyBuildOptions = {},
): Promise<RecompositionResult> {
  const sid = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
  const stageKey = opts.stageKey || 'foundation';

  const curriculum = await LearningCurriculum.findOne({
    tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean() as any;

  if (!curriculum) {
    return {
      ok: false, reason: 'This student has no Foundation journey to recompose.',
      frozenDays: [], rewrittenDays: [], unchangedFutureDays: [], totalDays: 0,
    };
  }

  const [existing, enrollment] = await Promise.all([
    DayPlan.find({ curriculumId: curriculum._id })
      .select('dayNumber primaryUnitCode').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);

  if ((existing as any[]).length !== FOUNDATION_PROGRAM_DAYS) {
    /**
     * Refused rather than repaired.
     *
     * A journey that is not ninety days is already broken, and recomposition is not the tool
     * for that — checkJourneyIntegrity says what is wrong and persistFoundationJourney rebuilds.
     * Quietly patching here would hide a fault whose cause nobody had looked at.
     */
    return {
      ok: false,
      reason: `The stored journey has ${(existing as any[]).length} days, not `
        + `${FOUNDATION_PROGRAM_DAYS}. Repair it before recomposing.`,
      frozenDays: [], rewrittenDays: [], unchangedFutureDays: [],
      totalDays: (existing as any[]).length,
    };
  }

  const frozen = frozenDayNumbers(enrollment || {});
  const frozenSet = new Set(frozen);

  const byDay = new Map<number, any>((existing as any[]).map(d => [d.dayNumber, d]));
  const futureSlots = Array.from({ length: FOUNDATION_PROGRAM_DAYS }, (_, i) => i + 1)
    .filter(d => !frozenSet.has(d));

  if (!futureSlots.length) {
    return {
      ok: true, frozenDays: frozen, rewrittenDays: [], unchangedFutureDays: [],
      totalDays: FOUNDATION_PROGRAM_DAYS,
    };
  }

  /**
   * Units the student has already been given. Never scheduled a second time.
   *
   * Without this a recomposition would happily re-teach day 12's unit on day 60, because the
   * fresh composition knows nothing about what the old plan already spent.
   */
  const alreadyTaught = new Set(
    frozen.map(d => String(byDay.get(d)?.primaryUnitCode || '').toUpperCase()).filter(Boolean),
  );

  const { composition } = await composeFoundationJourney(tenantId, profile, opts);

  /**
   * RELATIVE ORDER IS PRESERVED, which is what keeps prerequisites satisfied.
   *
   * The composer emits a sequence in which every unit's prerequisites appear earlier. Removing
   * the ones already taught and keeping the remainder in order cannot move a unit ahead of a
   * prerequisite: anything filtered out was taught in a frozen day, and anything kept stays
   * behind whatever preceded it.
   */
  const available = composition.units
    .filter(u => !alreadyTaught.has(u.unitCode.toUpperCase()));

  if (available.length < futureSlots.length) {
    /**
     * Nothing is written. The existing plan stands.
     *
     * A partially rewritten journey with a hole in it is worse than a slightly stale one, and
     * the student would be the one to discover it.
     */
    return {
      ok: false,
      reason: `Recomposition could only supply ${available.length} units for `
        + `${futureSlots.length} remaining days, so the existing plan was left unchanged. `
        + 'The journey is still ninety days.',
      frozenDays: frozen, rewrittenDays: [], unchangedFutureDays: [],
      totalDays: FOUNDATION_PROGRAM_DAYS,
    };
  }

  const rewritten: number[] = [];
  const unchanged: number[] = [];
  const ops: any[] = [];

  futureSlots.forEach((dayNumber, i) => {
    const unit = available[i];
    const before = String(byDay.get(dayNumber)?.primaryUnitCode || '').toUpperCase();

    if (before === unit.unitCode.toUpperCase()) {
      // The plan agreeing with itself. Reported apart from a rewrite so "nothing changed" is
      // legible as a real outcome rather than looking like the recomposition did not run.
      unchanged.push(dayNumber);
      return;
    }

    rewritten.push(dayNumber);
    ops.push({
      updateOne: {
        filter: { curriculumId: curriculum._id, dayNumber },
        update: {
          $set: {
            tenantId,
            topicId: unit.topicCode,
            primaryUnitCode: unit.unitCode,
            title: unit.title,
            /**
             * Activities are cleared and refilled lazily by the journey builder on next
             * persist, rather than resolved here. Recomposition decides WHICH unit a day
             * teaches; assembling a day's bundle is the journey service's job and duplicating
             * it here would give two places to fix an ordering bug.
             */
            items: [],
          },
        },
      },
    });
  });

  if (ops.length) await DayPlan.bulkWrite(ops, { ordered: false });

  return {
    ok: true,
    frozenDays: frozen,
    rewrittenDays: rewritten,
    unchangedFutureDays: unchanged,
    totalDays: FOUNDATION_PROGRAM_DAYS,
  };
}

/**
 * Would recomposition change anything? Answered without writing.
 *
 * Exists so a screen can say "your plan has been updated" truthfully, and so a scheduled job
 * can skip students whose plan the new evidence does not actually move.
 */
export async function previewRecomposition(
  tenantId: string,
  studentId: mongoose.Types.ObjectId | string,
  profile: StudentProfile,
  opts: JourneyBuildOptions = {},
): Promise<{ wouldChange: number[]; frozenDays: number[] }> {
  const sid = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
  const stageKey = opts.stageKey || 'foundation';

  const curriculum = await LearningCurriculum.findOne({
    tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean() as any;
  if (!curriculum) return { wouldChange: [], frozenDays: [] };

  const [existing, enrollment] = await Promise.all([
    DayPlan.find({ curriculumId: curriculum._id })
      .select('dayNumber primaryUnitCode').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);

  const frozen = frozenDayNumbers(enrollment || {});
  const frozenSet = new Set(frozen);
  const byDay = new Map<number, any>((existing as any[]).map(d => [d.dayNumber, d]));
  const futureSlots = Array.from({ length: FOUNDATION_PROGRAM_DAYS }, (_, i) => i + 1)
    .filter(d => !frozenSet.has(d));

  const alreadyTaught = new Set(
    frozen.map(d => String(byDay.get(d)?.primaryUnitCode || '').toUpperCase()).filter(Boolean),
  );

  const { composition } = await composeFoundationJourney(tenantId, profile, opts);
  const available = composition.units.filter(u => !alreadyTaught.has(u.unitCode.toUpperCase()));

  const wouldChange: number[] = [];
  futureSlots.forEach((dayNumber, i) => {
    const unit = available[i];
    if (!unit) return;
    if (String(byDay.get(dayNumber)?.primaryUnitCode || '').toUpperCase() !== unit.unitCode.toUpperCase()) {
      wouldChange.push(dayNumber);
    }
  });

  return { wouldChange, frozenDays: frozen };
}
