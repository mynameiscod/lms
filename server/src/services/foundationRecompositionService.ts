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
  loadAssets, dayItems, dayTitle, UnitAssets,
} from './foundationJourneyService';
import { packIntoDays, DEFAULT_DAY_BUDGET_MINUTES, DEFAULT_MAX_UNITS_PER_DAY } from '../data/dayPackingPolicy';

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
      .select('dayNumber primaryUnitCode unitCodes items').sort({ dayNumber: 1 }).lean() as any,
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
  /** Every unit a day teaches, in order. A day written before packing existed carries its one. */
  const unitsOf = (day: any): string[] => {
    const codes = (day?.unitCodes || []).map((c: any) => String(c).toUpperCase()).filter(Boolean);
    if (codes.length) return codes;
    const one = String(day?.primaryUnitCode || '').toUpperCase();
    return one ? [one] : [];
  };

  const alreadyTaught = new Set(frozen.flatMap(d => unitsOf(byDay.get(d))));

  /**
   * THE FROZEN DAYS ARE THE COMPOSITION'S HISTORY.
   *
   * The composer replays them as already given — their teaching, their capacity, their open topics, the structure
   * they covered — and composes only the future that follows them. It used to compose a fresh day one and have the
   * stitch below cut whatever a new plan puts late, which is how a learner lost functions and arrays, or met them
   * in reverse, after a reassessment.
   */
  const history = frozen.flatMap(d => unitsOf(byDay.get(d)));
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

  /**
   * The future is arranged into the slots it has to fill, by the same rule that wrote the journey —
   * one unit per day wherever the composer supplied one per day, which is every Foundation plan.
   */
  const packed = packIntoDays(available.map(u => ({
    unitCode: u.unitCode, unitType: u.unitType, estimatedMinutes: u.estimatedMinutes, topicCode: u.topicCode,
  })), {
    days: futureSlots.length,
    budgetMinutes: opts.dayBudgetMinutes ?? DEFAULT_DAY_BUDGET_MINUTES,
    maxUnitsPerDay: opts.maxUnitsPerDay ?? DEFAULT_MAX_UNITS_PER_DAY,
  });
  if (!packed.ok) {
    return {
      ok: false,
      reason: `The new composition could not be arranged into the ${futureSlots.length} remaining `
        + `days (${packed.reason}), so the existing plan was left unchanged.`,
      frozenDays: frozen, rewrittenDays: [], unchangedFutureDays: [], totalDays: programDays,
    };
  }
  const byCode = new Map(available.map(u => [u.unitCode, u]));
  const planned = futureSlots.map((dayNumber, i) => ({
    dayNumber,
    units: packed.days[i].map(p => byCode.get(p.unitCode) as SelectedUnit),
  }));
  const sameUnit = (dayNumber: number, units: SelectedUnit[]) =>
    JSON.stringify(unitsOf(byDay.get(dayNumber))) === JSON.stringify(units.map(u => u.unitCode.toUpperCase()));

  /**
   * Activities for every day that needs them, resolved once, by the journey service itself.
   *
   * A day needs them when its unit changes, and also when its unit is unchanged but it holds no
   * activities — the state an earlier recomposition left days in before it rebuilt them. The
   * second case is a repair, which is what makes a retry converge on complete days rather than
   * preserving empty ones.
   */
  const needing = planned.filter(p => !sameUnit(p.dayNumber, p.units) || !(byDay.get(p.dayNumber)?.items || []).length);
  const assets = needing.length
    ? await loadAssets(tenantId, needing.flatMap(p => p.units.map(u => u.unitCode)))
    : new Map<string, UnitAssets>();

  const rewritten: number[] = [];
  const unchanged: number[] = [];
  const ops: any[] = [];

  for (const { dayNumber, units } of planned) {
    const filter = { curriculumId: curriculum._id, dayNumber };

    if (sameUnit(dayNumber, units)) {
      // The plan agreeing with itself. Reported apart from a rewrite so "nothing changed" is
      // legible as a real outcome rather than looking like the recomposition did not run.
      unchanged.push(dayNumber);
      if (!(byDay.get(dayNumber)?.items || []).length) {
        ops.push({ updateOne: { filter, update: { $set: { items: dayItems(units, assets) } } } });
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
            topicId: units[0].topicCode,
            primaryUnitCode: units[0].unitCode,
            unitCodes: units.map(u => u.unitCode),
            title: dayTitle(units),
            items: dayItems(units, assets),
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
      .select('dayNumber primaryUnitCode unitCodes').sort({ dayNumber: 1 }).lean() as any,
    CurriculumEnrollment.findOne({ tenantId, curriculumId: curriculum._id, studentId: sid })
      .select('completedDays currentDay').lean() as any,
  ]);

  const frozen = frozenDayNumbers(enrollment || {}, programDays);
  const frozenSet = new Set(frozen);
  const byDay = new Map<number, any>((existing as any[]).map(d => [d.dayNumber, d]));
  const futureSlots = Array.from({ length: programDays }, (_, i) => i + 1)
    .filter(d => !frozenSet.has(d));

  const unitsOfDay = (day: any): string[] => {
    const codes = (day?.unitCodes || []).map((c: any) => String(c).toUpperCase()).filter(Boolean);
    if (codes.length) return codes;
    const one = String(day?.primaryUnitCode || '').toUpperCase();
    return one ? [one] : [];
  };
  const alreadyTaught = new Set(frozen.flatMap(d => unitsOfDay(byDay.get(d))));

  // The same continuation recomposeFutureDays writes, so a preview can never promise a different future.
  const history = frozen.flatMap(d => unitsOfDay(byDay.get(d)));
  const { composition } = await composeFoundationJourney(tenantId, profile, { ...opts, history });
  const available = composition.units.filter(u => !alreadyTaught.has(u.unitCode.toUpperCase()));

  const packedPreview = packIntoDays(available.map(u => ({
    unitCode: u.unitCode, unitType: u.unitType, estimatedMinutes: u.estimatedMinutes, topicCode: u.topicCode,
  })), {
    days: futureSlots.length,
    budgetMinutes: opts.dayBudgetMinutes ?? DEFAULT_DAY_BUDGET_MINUTES,
    maxUnitsPerDay: opts.maxUnitsPerDay ?? DEFAULT_MAX_UNITS_PER_DAY,
  });

  const wouldChange: number[] = [];
  if (packedPreview.ok) {
    futureSlots.forEach((dayNumber, i) => {
      const day = packedPreview.days[i];
      if (!day) return;
      const next = day.map(p => p.unitCode.toUpperCase());
      if (JSON.stringify(unitsOfDay(byDay.get(dayNumber))) !== JSON.stringify(next)) wouldChange.push(dayNumber);
    });
  }

  return { wouldChange, frozenDays: frozen };
}
