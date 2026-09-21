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
 * ── A REWRITTEN DAY IS A WHOLE DAY ────────────────────────────────────────────────────────
 *
 * Changing a day's unit without rebuilding its activities leaves a day that names a project and
 * offers nothing to submit. Worse than empty: the Assignment is delivered through the journey
 * day, so a project day with no activity item is also a project whose DRAFT assignment the
 * delivery rules no longer open. Every rewritten day is therefore rebuilt with the journey
 * service's own resolver — the same teaching, practice, checkpoint and submission bundle, in the
 * same order, gating activity last — so a recomposed day and a freshly built one cannot differ.
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
import { foundationProgramDaysFor, journeyDaysOf, DEFAULT_PROGRAM_DAYS } from './foundationProgramLengthService';
import { SelectedUnit, StudentProfile } from './curriculumComposerService';
import {
  composeFoundationJourney, FOUNDATION_JOURNEY_KIND, JourneyBuildOptions,
  loadAssets, activitiesFor, UnitAssets,
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

const NO_ASSETS: UnitAssets = { content: [], quizzes: [], assignments: [] };

/**
 * Which days may not be touched.
 *
 * Everything the student has completed, plus the day they are on. `currentDay` is included
 * even when it is not in `completedDays` — especially then, because that is precisely the day
 * somebody has open.
 */
export function frozenDayNumbers(enrollment: {
  completedDays?: number[]; currentDay?: number;
}, programDays: number = DEFAULT_PROGRAM_DAYS): number[] {
  const frozen = new Set<number>((enrollment.completedDays || []).map(Number));
  const current = Number(enrollment.currentDay || 0);
  if (current >= 1) frozen.add(current);
  // A day outside this journey cannot be frozen: it is a stale number, not a day somebody sat.
  return [...frozen].filter(d => d >= 1 && d <= programDays).sort((a, b) => a - b);
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
  }).select('_id totalDays').lean() as any;

  if (!curriculum) {
    return {
      ok: false, reason: 'This student has no Foundation journey to recompose.',
      frozenDays: [], rewrittenDays: [], unchangedFutureDays: [], totalDays: 0,
    };
  }

  const [existing, enrollment] = await Promise.all([
    DayPlan.find({ curriculumId: curriculum._id })
      .select('dayNumber primaryUnitCode items').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);

  const programDays = journeyDaysOf(curriculum, await foundationProgramDaysFor(tenantId));

  if ((existing as any[]).length !== programDays) {
    /**
     * Refused rather than repaired.
     *
     * A journey that is not its own length is already broken, and recomposition is not the tool
     * for that — checkJourneyIntegrity says what is wrong and persistFoundationJourney rebuilds.
     * Quietly patching here would hide a fault whose cause nobody had looked at.
     */
    return {
      ok: false,
      reason: `The stored journey has ${(existing as any[]).length} days, not `
        + `${programDays}. Repair it before recomposing.`,
      frozenDays: [], rewrittenDays: [], unchangedFutureDays: [],
      totalDays: (existing as any[]).length,
    };
  }

  const frozen = frozenDayNumbers(enrollment || {}, programDays);
  const frozenSet = new Set(frozen);

  const byDay = new Map<number, any>((existing as any[]).map(d => [d.dayNumber, d]));
  const futureSlots = Array.from({ length: programDays }, (_, i) => i + 1)
    .filter(d => !frozenSet.has(d));

  if (!futureSlots.length) {
    return {
      ok: true, frozenDays: frozen, rewrittenDays: [], unchangedFutureDays: [],
      totalDays: programDays,
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

  /**
   * THE FROZEN DAYS ARE THE COMPOSITION'S HISTORY.
   *
   * The composer replays them as already given — their teaching, their capacity, their open topics, the structure
   * they covered — and composes only the future that follows them. It used to compose a fresh day one and have the
   * stitch below cut whatever a new plan puts late, which is how a learner lost functions and arrays, or met them
   * in reverse, after a reassessment.
   */
  const history = frozen.map(d => String(byDay.get(d)?.primaryUnitCode || '').toUpperCase()).filter(Boolean);
  const { composition } = await composeFoundationJourney(tenantId, profile, { ...opts, history });

  /**
   * RELATIVE ORDER IS PRESERVED, which is what keeps prerequisites satisfied.
   *
   * The composer emits the history first and then the future, every unit's prerequisites earlier than it. Removing
   * what was already taught leaves exactly the future, in order.
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
      totalDays: programDays,
    };
  }

  const planned = futureSlots.map((dayNumber, i) => ({ dayNumber, unit: available[i] as SelectedUnit }));
  const sameUnit = (dayNumber: number, unit: SelectedUnit) =>
    String(byDay.get(dayNumber)?.primaryUnitCode || '').toUpperCase() === unit.unitCode.toUpperCase();

  /**
   * Activities for every day that needs them, resolved once, by the journey service itself.
   *
   * A day needs them when its unit changes, and also when its unit is unchanged but it holds no
   * activities — the state an earlier recomposition left days in before it rebuilt them. The
   * second case is a repair, which is what makes a retry converge on complete days rather than
   * preserving empty ones.
   */
  const needing = planned.filter(p => !sameUnit(p.dayNumber, p.unit) || !(byDay.get(p.dayNumber)?.items || []).length);
  const assets = needing.length
    ? await loadAssets(tenantId, needing.map(p => p.unit.unitCode))
    : new Map<string, UnitAssets>();
  const itemsFor = (unit: SelectedUnit) => activitiesFor(unit, assets.get(unit.unitCode.toUpperCase()) || NO_ASSETS);

  const rewritten: number[] = [];
  const unchanged: number[] = [];
  const ops: any[] = [];

  for (const { dayNumber, unit } of planned) {
    const filter = { curriculumId: curriculum._id, dayNumber };

    if (sameUnit(dayNumber, unit)) {
      // The plan agreeing with itself. Reported apart from a rewrite so "nothing changed" is
      // legible as a real outcome rather than looking like the recomposition did not run.
      unchanged.push(dayNumber);
      if (!(byDay.get(dayNumber)?.items || []).length) {
        ops.push({ updateOne: { filter, update: { $set: { items: itemsFor(unit) } } } });
      }
      continue;
    }

    rewritten.push(dayNumber);
    ops.push({
      updateOne: {
        filter,
        update: {
          $set: {
            tenantId,
            topicId: unit.topicCode,
            primaryUnitCode: unit.unitCode,
            title: unit.title,
            items: itemsFor(unit),
          },
        },
      },
    });
  }

  if (ops.length) await DayPlan.bulkWrite(ops, { ordered: false });

  return {
    ok: true,
    frozenDays: frozen,
    rewrittenDays: rewritten,
    unchangedFutureDays: unchanged,
    totalDays: programDays,
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
  }).select('_id totalDays').lean() as any;
  if (!curriculum) return { wouldChange: [], frozenDays: [] };
  /* The preview covers the journey this student has, at the length it was composed. */
  const programDays = journeyDaysOf(curriculum, await foundationProgramDaysFor(tenantId));

  const [existing, enrollment] = await Promise.all([
    DayPlan.find({ curriculumId: curriculum._id })
      .select('dayNumber primaryUnitCode').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);

  const frozen = frozenDayNumbers(enrollment || {}, programDays);
  const frozenSet = new Set(frozen);
  const byDay = new Map<number, any>((existing as any[]).map(d => [d.dayNumber, d]));
  const futureSlots = Array.from({ length: programDays }, (_, i) => i + 1)
    .filter(d => !frozenSet.has(d));

  const alreadyTaught = new Set(
    frozen.map(d => String(byDay.get(d)?.primaryUnitCode || '').toUpperCase()).filter(Boolean),
  );

  // The same continuation recomposeFutureDays writes, so a preview can never promise a different future.
  const history = frozen.map(d => String(byDay.get(d)?.primaryUnitCode || '').toUpperCase()).filter(Boolean);
  const { composition } = await composeFoundationJourney(tenantId, profile, { ...opts, history });
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
