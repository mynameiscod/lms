/**
 * The student's ninety days, composed and persisted.
 *
 * ── THIS IS A JOIN, NOT AN ENGINE ─────────────────────────────────────────────────────────
 *
 * Two things already existed and had never been introduced to each other: `composeUnits`,
 * which chooses ninety Learning Units for one student, and `DayPlan`, which is how this
 * codebase has always stored a day of study. Everything here is the seam between them —
 * resolving each unit's activities, writing the days, and refusing to write anything that
 * would break the promise. No selection logic lives here; a second composer would be a second
 * answer to "what should this student learn", and the two would diverge within a release.
 *
 * ── NINETY IS CHECKED BEFORE ANYTHING IS WRITTEN ──────────────────────────────────────────
 *
 * `FOUNDATION_PROGRAM_DAYS` is a promise to the student, not a target. If the composer returns
 * eighty-seven units the correct outcome is a refusal with the reason, NOT an eighty-seven-day
 * journey — a short plan is indistinguishable from a complete one once it is in the database,
 * and the student is the last person who would notice. The check runs before the first write,
 * so a failure leaves nothing behind.
 *
 * ── WHY A PERSONALISED CURRICULUM CLONE ───────────────────────────────────────────────────
 *
 * DayPlan is unique on (curriculumId, dayNumber), so days belong to a curriculum rather than
 * to a student. The existing shape for per-student plans is a LearningCurriculum carrying
 * `personalizedFor`, and this reuses it exactly. What it does NOT reuse is
 * trackPersonalizationService's topic resizing, which shortens a plan for a strong candidate —
 * that is the behaviour Foundation exists to replace.
 *
 * ── IDEMPOTENT, AND RETRY-SAFE IN THE MIDDLE ──────────────────────────────────────────────
 *
 * Two students clicking twice, a retried request, a crash after day forty: all converge on one
 * journey of ninety days. The clone is found-or-created on a stable key, and the days are a
 * bulk upsert on (curriculumId, dayNumber) rather than an insert, so a half-written journey
 * completes rather than colliding. Composition is deterministic, so the second run writes the
 * same ninety days the first one did.
 */

import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import LearningContentLibrary from '../models/LearningContentLibrary';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import { foundationProgramDaysFor, journeyDaysOf } from './foundationProgramLengthService';
import { inTeachingOrder } from '../data/contentBundlePolicy';
import { composeUnits, ComposerResult, SelectedUnit, StudentProfile } from './curriculumComposerService';
import { packIntoDays, DEFAULT_DAY_BUDGET_MINUTES, DEFAULT_MAX_UNITS_PER_DAY } from '../data/dayPackingPolicy';
import { loadCandidates, assertProductionEligible, CandidateSource } from './composerCandidateService';

/** Marks a curriculum as a Foundation UNIT-engine journey. Lets one be found without guessing. */
export const FOUNDATION_JOURNEY_KIND = 'FOUNDATION_UNIT_JOURNEY_V1';

export interface JourneyBuildOptions {
  /**
   * Where candidates come from. PRODUCTION in every real call.
   *
   * Exposed only so engineering tests can compose against controlled inventory; the value is
   * recorded on the curriculum so a journey built from anything else is identifiable forever.
   */
  source?: CandidateSource;
  stageKey?: string;
  /** Units already given, in day order — the frozen days of a journey being recomposed. See ComposerInput.history. */
  history?: string[];
  /**
   * How many days this journey is. The tenant's setting when absent.
   *
   * Passed rather than read here so one request composes, checks and writes the same number even
   * if an admin changes the setting mid-flight — half a journey at each length is the one outcome
   * nobody could read.
   */
  programDays?: number;
  /**
   * How much work one day may hold, for a stage whose curriculum is larger than its programme.
   *
   * Foundation never reaches it: it composes one unit per day, so a day is that unit whatever this
   * says. See dayPackingPolicy.
   */
  dayBudgetMinutes?: number;
  maxUnitsPerDay?: number;
}

/**
 * What one day of the journey teaches, as the day is written.
 *
 * ONE DAY IS ONE OR MORE UNITS. Foundation composes exactly as many units as it has days, so every
 * day here holds one and the stored day is byte-for-byte what it always was. A stage with a larger
 * curriculum than its programme fits by packing — see dayPackingPolicy.
 */
export interface PackedDay {
  dayNumber: number;
  units: SelectedUnit[];
}

/** The activities of every unit on a day, in order, renumbered so the day reads as one sitting. */
export function dayItems(units: SelectedUnit[], assets: Map<string, UnitAssets>): any[] {
  const items: any[] = [];
  for (const unit of units) {
    for (const item of activitiesFor(unit, assets.get(unit.unitCode.toUpperCase()) || { content: [], quizzes: [], assignments: [] })) {
      items.push({ ...item, order: items.length });
    }
  }
  return items;
}

/** A day's title: the unit it teaches, or the units it joins. */
export const dayTitle = (units: SelectedUnit[]): string => units.map(u => u.title).join(' · ');

export interface JourneyResult {
  ok: boolean;
  reason?: string;
  curriculumId?: mongoose.Types.ObjectId;
  days: number;
  created: boolean;
  composition?: ComposerResult;
}

/* ------------------------------------------------------------------ *
 * One day's activities
 * ------------------------------------------------------------------ */

export interface UnitAssets {
  content: any[];
  quizzes: any[];
  assignments: any[];
}

/**
 * What a day is made of, in the order a student should meet it.
 *
 * Teaching first, in the content bundle's own order, then practice, then whatever measures the
 * day. That sequence is not invented here — `inTeachingOrder` already owns it, and the screen
 * and the day must agree about sequence or a student is told to practise before reading.
 *
 * ONLY THE UNIT'S OWN CONTENT. Inherited topic material is deliberately excluded: it is shared
 * with every sibling unit, so including it would put the same video on eleven different days.
 * That is also why inheritance cannot lift a unit past PARTIAL, and why a unit reaching a
 * student's plan at all means it owns what it needs.
 */
/*
 * EXPORTED FOR RECOMPOSITION, which must build a rewritten day exactly as this file builds a new
 * one. A second resolver would be a second answer to "what is on day 40", and the two would
 * disagree the first time either changed.
 */
export function activitiesFor(unit: Pick<SelectedUnit, 'title'>, assets: UnitAssets) {
  const items: any[] = [];
  let order = 0;

  for (const row of inTeachingOrder(assets.content)) {
    items.push({
      kind: 'content',
      contentId: row._id,
      contentTitle: String(row.title || unit.title),
      contentType: String(row.type),
      slot: 'anytime',
      // Teaching is required; practice is required; nothing here is optional reading.
      required: true,
      isGating: false,
      order: order++,
      estimatedDuration: Number(row.estimatedDuration) || 0,
    });
  }

  /**
   * Assessment last, and GATING.
   *
   * A checkpoint that a student can skip measures the students who did not need measuring. It
   * is the one activity on the day that holds the day open until it is done.
   */
  for (const q of assets.quizzes) {
    items.push({
      kind: 'quiz',
      sourceModel: 'Quiz',
      sourceId: q._id,
      contentTitle: String(q.title || `${unit.title} — checkpoint`),
      contentType: 'quiz',
      slot: 'anytime',
      required: true,
      isGating: true,
      order: order++,
      estimatedDuration: Number(q.totalTime) || 15,
    });
  }

  for (const a of assets.assignments) {
    items.push({
      kind: 'assignment',
      sourceModel: 'Assignment',
      sourceId: a._id,
      contentTitle: String(a.title || `${unit.title} — project`),
      contentType: 'assignment',
      slot: 'anytime',
      required: true,
      isGating: true,
      order: order++,
      estimatedDuration: Number(a.estimatedMinutes) || 60,
    });
  }

  return items;
}

/** Every asset belonging to the chosen units, fetched once rather than per day. Shared with recomposition. */
export async function loadAssets(tenantId: string, unitCodes: string[]): Promise<Map<string, UnitAssets>> {
  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const [content, quizzes, assignments] = await Promise.all([
    LearningContentLibrary.find({
      tenantId, isPublished: true, unitCode: { $in: unitCodes },
    }).select('_id type title estimatedDuration canonical createdAt unitCode').lean() as any,
    Quiz.find({ tenantId, unitCode: { $in: unitCodes } })
      .select('_id title totalTime unitCode').lean() as any,
    tenantOid
      ? Assignment.find({ tenant: tenantOid, unitCode: { $in: unitCodes } })
        .select('_id title unitCode').lean() as any
      : Promise.resolve([] as any),
  ]);

  const byUnit = new Map<string, UnitAssets>();
  const bucket = (code: string) => {
    const k = String(code).toUpperCase();
    if (!byUnit.has(k)) byUnit.set(k, { content: [], quizzes: [], assignments: [] });
    return byUnit.get(k)!;
  };

  for (const r of content as any[]) bucket(r.unitCode).content.push(r);
  for (const r of quizzes as any[]) bucket(r.unitCode).quizzes.push(r);
  for (const r of assignments as any[]) bucket(r.unitCode).assignments.push(r);

  return byUnit;
}

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

/**
 * Choose the ninety units, without writing anything.
 *
 * Separated from persistence so a plan can be previewed, audited and tested without a student
 * acquiring a journey as a side effect of somebody looking at one.
 */
export async function composeFoundationJourney(
  tenantId: string,
  profile: StudentProfile,
  opts: JourneyBuildOptions = {},
): Promise<{ candidates: number; composition: ComposerResult }> {
  const source = opts.source || 'PRODUCTION';
  const programDays = opts.programDays ?? await foundationProgramDaysFor(tenantId);
  const set = await loadCandidates(tenantId, source, opts.stageKey || 'foundation');

  // Refuses anything but PRODUCTION for a real build. The check is here rather than at the
  // call site so no future caller can forget it.
  if (source === 'PRODUCTION') assertProductionEligible(set);

  const composition = composeUnits({
    candidates: set.units,
    targetUnits: programDays,
    student: profile,
    history: opts.history,
  });

  return { candidates: set.units.length, composition };
}

/* ------------------------------------------------------------------ *
 * Persistence
 * ------------------------------------------------------------------ */

/** The one journey curriculum for this student, found or created. Stable key, so retries converge. */
async function findOrCreateJourney(
  tenantId: string,
  studentId: mongoose.Types.ObjectId,
  stageKey: string,
  source: CandidateSource,
  programDays: number,
): Promise<{ doc: any; created: boolean }> {
  const existing = await LearningCurriculum.findOne({
    tenantId, personalizedFor: studentId, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  });
  if (existing) return { doc: existing, created: false };

  const doc = await LearningCurriculum.create({
    tenantId,
    title: 'CareerPilot Foundation Journey',
    description: `${programDays} learning days, composed for this student from the Year-1 curriculum.`,
    totalDays: programDays,
    topics: [],
    isPublished: true,
    isMasterTrack: false,
    adaptiveStage: stageKey,
    personalizedFor: studentId,
    journeyKind: FOUNDATION_JOURNEY_KIND,
    /**
     * Recorded so a journey built from anything but PRODUCTION is identifiable forever.
     *
     * An engineering test composes against controlled inventory; if one of those ever reached a
     * real student, this is the field that says so, and no amount of later inspection of the
     * days themselves would have.
     */
    journeySource: source,
    createdBy: 'foundation-journey',
  } as any).catch((e: any) => {
    /**
     * Two triggers for one student can race here — a checkpoint landing as a diagnostic does,
     * or two server processes. The partial unique index on LearningCurriculum lets exactly one
     * create win; the loser adopts the winner's journey rather than failing or making a second.
     */
    if (e?.code !== 11000) throw e;
    return null;
  });

  if (!doc) {
    const winner = await LearningCurriculum.findOne({
      tenantId, personalizedFor: studentId, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
    });
    if (!winner) throw new Error('A concurrent journey create collided, but no journey was found.');
    return { doc: winner, created: false };
  }

  return { doc, created: true };
}

/**
 * Build and store this student's ninety days.
 *
 * Returns `ok: false` with a reason rather than throwing for the one failure a caller must
 * handle differently from a bug: not enough composer-eligible inventory to reach ninety. That
 * is an authoring state, not an error, and it has to be reportable on a screen.
 */
export async function persistFoundationJourney(
  tenantId: string,
  studentId: mongoose.Types.ObjectId | string,
  profile: StudentProfile,
  opts: JourneyBuildOptions = {},
): Promise<JourneyResult> {
  const sid = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
  const stageKey = opts.stageKey || 'foundation';
  const source = opts.source || 'PRODUCTION';
  /* Resolved once and passed on, so composing, checking and writing all use the same number. */
  const programDays = opts.programDays ?? await foundationProgramDaysFor(tenantId);

  const { composition } = await composeFoundationJourney(tenantId, profile, { ...opts, programDays });

  /**
   * THE INVARIANT, CHECKED BEFORE THE FIRST WRITE.
   *
   * Eighty-seven days is not a smaller success. Persisting it would put a plan in front of a
   * student that quietly breaks the one promise the programme makes, and nothing downstream
   * would ever flag it — the days would be contiguous, numbered from one, and wrong.
   */
  if (!composition.ok || composition.units.length !== programDays) {
    return {
      ok: false,
      reason: `The curriculum can only fill ${composition.units.length} of `
        + `${programDays} days for this student. A Foundation journey is exactly `
        + `${programDays} days, so nothing was written. `
        + (composition.code ? `Composer: ${composition.code}.` : ''),
      days: composition.units.length,
      created: false,
      composition,
    };
  }

  /**
   * The composed sequence becomes days. With one unit per composed day this is the identity, which is
   * what keeps every Foundation journey exactly as it was.
   */
  const packed = packIntoDays(composition.units.map(u => ({
    unitCode: u.unitCode, unitType: u.unitType, estimatedMinutes: u.estimatedMinutes, topicCode: u.topicCode,
  })), {
    days: programDays,
    budgetMinutes: opts.dayBudgetMinutes ?? DEFAULT_DAY_BUDGET_MINUTES,
    maxUnitsPerDay: opts.maxUnitsPerDay ?? DEFAULT_MAX_UNITS_PER_DAY,
  });
  if (!packed.ok) {
    return {
      ok: false,
      reason: `The composed curriculum could not be arranged into ${programDays} days `
        + `(${packed.reason}). Nothing was written.`,
      days: 0, created: false, composition,
    };
  }
  const byCode = new Map(composition.units.map(u => [u.unitCode, u]));
  const days: PackedDay[] = packed.days.map((day, i) => ({
    dayNumber: i + 1,
    units: day.map(p => byCode.get(p.unitCode)!),
  }));

  const { doc, created } = await findOrCreateJourney(tenantId, sid, stageKey, source, programDays);
  const assets = await loadAssets(tenantId, composition.units.map(u => u.unitCode));

  /**
   * Upsert, never insert.
   *
   * A crash after day forty leaves forty days behind. An insert would then collide on the
   * unique (curriculumId, dayNumber) index and the student would be stuck with half a journey
   * and an error on every retry; an upsert completes it.
   */
  const ops = days.map(({ dayNumber, units }) => ({
    updateOne: {
      filter: { curriculumId: doc._id, dayNumber },
      update: {
        $set: {
          tenantId,
          /* The day belongs to the topic it opens with; a packed day names the rest in its title. */
          topicId: units[0].topicCode,
          primaryUnitCode: units[0].unitCode,
          unitCodes: units.map(u => u.unitCode),
          title: dayTitle(units),
          items: dayItems(units, assets),
        },
        $setOnInsert: { curriculumId: doc._id, dayNumber },
      },
      upsert: true,
    },
  }));

  await DayPlan.bulkWrite(ops, { ordered: false });

  /**
   * Days beyond the programme's length are removed, which matters only on recomposition.
   *
   * Nothing here creates them, but a future policy change that shortened the programme would
   * otherwise leave orphans numbered 91 and up, and they would be served to the student as
   * part of the journey.
   */
  await DayPlan.deleteMany({
    curriculumId: doc._id, dayNumber: { $gt: programDays },
  });

  if (doc.totalDays !== programDays) {
    doc.totalDays = programDays;
    await doc.save();
  }

  return { ok: true, curriculumId: doc._id, days: programDays, created, composition };
}

/* ------------------------------------------------------------------ *
 * Reading one back
 * ------------------------------------------------------------------ */

export interface JourneyIntegrity {
  exists: boolean;
  days: number;
  expected: number;
  missing: number[];
  duplicates: number[];
  daysWithoutUnit: number[];
  daysWithoutActivities: number[];
  ok: boolean;
}

/**
 * Does this student's stored journey still satisfy the invariant?
 *
 * Asked of the DATABASE rather than of the composer, because the two can disagree: content can
 * be unpublished, a unit archived, a day deleted by hand. The composer's promise covers what it
 * produced; this covers what is actually there, which is what a student will be served.
 */
export async function checkJourneyIntegrity(
  tenantId: string,
  studentId: mongoose.Types.ObjectId | string,
  stageKey = 'foundation',
): Promise<JourneyIntegrity> {
  const sid = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
  const curriculum = await LearningCurriculum.findOne({
    tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id totalDays').lean() as any;

  /* A journey is judged against its own length, not against whatever the tenant now sets. */
  const tenantDays = await foundationProgramDaysFor(tenantId);
  const expected = curriculum ? journeyDaysOf(curriculum, tenantDays) : tenantDays;

  const empty: JourneyIntegrity = {
    exists: false, days: 0, expected,
    missing: [], duplicates: [], daysWithoutUnit: [], daysWithoutActivities: [], ok: false,
  };
  if (!curriculum) return empty;

  const days = await DayPlan.find({ curriculumId: curriculum._id })
    .select('dayNumber primaryUnitCode items').sort({ dayNumber: 1 }).lean() as any[];

  const seen = new Map<number, number>();
  for (const d of days) seen.set(d.dayNumber, (seen.get(d.dayNumber) || 0) + 1);

  const missing: number[] = [];
  for (let n = 1; n <= expected; n++) if (!seen.has(n)) missing.push(n);

  const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([d]) => d);
  const daysWithoutUnit = days.filter(d => !d.primaryUnitCode).map(d => d.dayNumber);
  const daysWithoutActivities = days.filter(d => !(d.items || []).length).map(d => d.dayNumber);

  return {
    exists: true,
    days: days.length,
    expected,
    missing,
    duplicates,
    daysWithoutUnit,
    daysWithoutActivities,
    ok: days.length === expected
      && !missing.length && !duplicates.length && !daysWithoutUnit.length,
  };
}

/** Remove a journey entirely. Used by engineering tests to clean up after themselves. */
export async function deleteFoundationJourney(
  tenantId: string,
  studentId: mongoose.Types.ObjectId | string,
  stageKey = 'foundation',
): Promise<{ curricula: number; days: number }> {
  const sid = typeof studentId === 'string' ? new mongoose.Types.ObjectId(studentId) : studentId;
  const curricula = await LearningCurriculum.find({
    tenantId, personalizedFor: sid, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
  }).select('_id').lean() as any[];

  if (!curricula.length) return { curricula: 0, days: 0 };

  const ids = curricula.map(c => c._id);
  const days = await DayPlan.deleteMany({ curriculumId: { $in: ids } });
  await LearningCurriculum.deleteMany({ _id: { $in: ids } });

  return { curricula: ids.length, days: days.deletedCount ?? 0 };
}

/** The role each selected unit played, for reporting. Derived, never stored on the day. */
export const journeyShape = (composition: ComposerResult) => {
  const byRole: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const u of composition.units) {
    byRole[u.role] = (byRole[u.role] || 0) + 1;
    byType[u.unitType] = (byType[u.unitType] || 0) + 1;
  }
  return { byRole, byType };
};
