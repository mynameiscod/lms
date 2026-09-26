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
import { CAREER_STAGES } from './careerStageService';
import { foundationProgramDaysFor, programDaysFor, journeyDaysOf } from './foundationProgramLengthService';
import { inTeachingOrder } from '../data/contentBundlePolicy';
import { composeUnits, ComposerResult, SelectedUnit, StudentProfile, ComposableUnit } from './curriculumComposerService';
import { bridgePlanFor, BridgePlan } from '../data/stageBridgePolicy';
import { densityFor, unitsForDays } from '../data/learningDensityPolicy';
import { packIntoDays, DEFAULT_DAY_BUDGET_MINUTES, DEFAULT_MAX_UNITS_PER_DAY } from '../data/dayPackingPolicy';
import { loadCandidates, assertProductionEligible, CandidateSource } from './composerCandidateService';
import { sequencePredecessorOf, sequenceIndexOf } from '../data/courseSequencePolicy';

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
 * The bridging days: units from the earlier stage that teach what this learner is missing.
 *
 * Composed by the same composer, from the same production pool, under the same rules — it is a
 * short plan of Year-1 teaching, not a second kind of plan. Candidates are narrowed to units
 * that teach at least one of the unmet skills, so a bridge cannot wander into web development
 * because the learner happened to be weak on SQL.
 *
 * FAILS TO NOTHING. A bridge that cannot be composed returns no units and the learner gets the
 * plan they would have got before this existed. Being taught Year 2 too early is a worse
 * experience than being taught it on time; being given no plan at all is worse than both.
 */
/**
 * EVERY TOPIC THAT MUST BE PASSED THROUGH TO REACH THESE SKILLS.
 *
 * The bridge used to scope its candidates to units that TEACH a gapped skill, and that single
 * line was the whole of the sequencing bug. A learner gapped on arrays got the array units and
 * nothing else — so they were taught to traverse an array on day seventeen and write binary
 * search on day twenty-two without ever having met a loop, a conditional or a function, because
 * none of those three had been measured and so none of them could be 'wanted'.
 *
 * Filtering that hard also defeated the composer, which already orders by prerequisite and by
 * the authored teaching sequence: it cannot sequence through a topic that was removed from its
 * pool before it ran.
 *
 * So the scope is now the CLOSURE: the topics that teach the gapped skills, plus everything
 * earlier in their strand's authored sequence. Wanting T_ARRAYS therefore pulls in T_VARIABLES,
 * T_CONDITIONS, T_LOOPS and T_FUNCTIONS — which is Year 1's own ladder, in Year 1's own order.
 *
 * MILESTONES AND CAPSTONES ARE EXCLUDED. They carry the same skill tags, so they were being
 * drawn in — a fresh second-year met "Choosing Something Worth Building" on day nine, before
 * they could write a loop. They are the END of a year's work, not a step into the next one.
 */
const BRIDGE_EXCLUDED_TOPIC = /MILESTONE|CAPSTONE/i;

function bridgeTopics(units: ComposableUnit[], wanted: Set<string>): Set<string> {
  const teaching = new Set<string>();
  for (const u of units) {
    const topic = String(u.topicCode || '');
    if (!topic || BRIDGE_EXCLUDED_TOPIC.test(topic)) continue;
    if ((u.skillKeys || []).some(k => wanted.has(String(k)))) teaching.add(topic);
  }

  /* Walk each one back through its strand's sequence, so nothing is reached before its groundwork. */
  const closed = new Set<string>(teaching);
  for (const topic of teaching) {
    for (let prior = sequencePredecessorOf(topic); prior; prior = sequencePredecessorOf(prior)) {
      if (!BRIDGE_EXCLUDED_TOPIC.test(prior)) closed.add(prior);
    }
  }
  return closed;
}

/**
 * The closure, cut down to what the bridge's days can actually hold.
 *
 * ── WHY THE CLOSURE ALONE WAS NOT ENOUGH ──────────────────────────────────────────────────
 *
 * The closure is the right set of topics and it is routinely far larger than the bridge. A
 * learner measured low on arrays alone has a 114-unit ladder behind them; their bridge is 15
 * units. The composer was handed all 114 in sequence order and filled its 15 from the front, so
 * the days went to hardware, decomposition and variables and the learner NEVER REACHED ARRAYS —
 * the one skill the bridge was built to teach. Measured: 0 of 1 gap taught.
 *
 * That is worse than no bridge at all. It spends a sixth of the programme re-teaching material
 * the learner was not measured as lacking, and still hands them Year 2 with the real gap open.
 *
 * ── WHAT THIS KEEPS AND WHAT IT DROPS ─────────────────────────────────────────────────────
 *
 * The topics that TEACH a gap are never dropped. They are why the bridge exists, and a bridge
 * that does not reach them has failed whatever else it covered.
 *
 * The run-up is then added BACKWARDS FROM THE GAP while the days allow, so the groundwork a
 * learner keeps is the groundwork nearest to what they are about to be taught. It stops at the
 * first topic that will not fit rather than skipping it for an older one that would — a run-up
 * with a hole in it is not a ladder, and arriving at functions having skipped loops is the
 * sequencing bug this whole closure was written to prevent.
 *
 * ── WHEN EVEN THE GAP TOPICS DO NOT FIT ───────────────────────────────────────────────────
 *
 * They are kept anyway and the composer covers what it can in sequence order. That case is a
 * learner whose ladder is 268 units against a 36-unit bridge — a total beginner, for whom no
 * selection rule and no cap is the answer. composeBridge says so in the log, because the honest
 * response is a conversation about Year 1 rather than a quietly truncated plan.
 */
export function bridgeTopicsWithinBudget(
  units: ComposableUnit[],
  wanted: Set<string>,
  maxUnits: number,
): { topics: Set<string>; laddersShort: boolean } {
  const closure = bridgeTopics(units, wanted);

  const teaching = new Set<string>();
  const sizeOf = new Map<string, number>();
  for (const u of units) {
    const topic = String(u.topicCode || '');
    if (!topic || BRIDGE_EXCLUDED_TOPIC.test(topic)) continue;
    if (closure.has(topic)) sizeOf.set(topic, (sizeOf.get(topic) || 0) + 1);
    if ((u.skillKeys || []).some(k => wanted.has(String(k)))) teaching.add(topic);
  }

  const kept = new Set<string>(teaching);
  let used = [...teaching].reduce((n, t) => n + (sizeOf.get(t) || 0), 0);

  /* Nearest the gap first: the last rung of the ladder earns its place before the first. */
  const rank = (t: string) => sequenceIndexOf(t) ?? Number.MAX_SAFE_INTEGER;
  const runUp = [...closure].filter(t => !teaching.has(t)).sort((a, b) => rank(b) - rank(a));
  for (const topic of runUp) {
    const size = sizeOf.get(topic) || 0;
    if (used + size > maxUnits) break;
    kept.add(topic);
    used += size;
  }

  return { topics: kept, laddersShort: used > maxUnits };
}

async function composeBridge(
  tenantId: string,
  source: CandidateSource,
  profile: StudentProfile,
  bridge: BridgePlan,
): Promise<SelectedUnit[]> {
  try {
    /*
     * ONE POOL, DRAWN FROM EVERY YEAR BEHIND THIS ONE.
     *
     * Year 2 borrows from Year 1 alone. Year 3 borrows from Year 2 AND Year 1, because a fresh
     * third-year may have done neither and the two gaps are different shapes — missing objects
     * is a Year-2 gap, missing loops is a Year-1 one, and a single source could serve only one
     * of them.
     *
     * Concatenated NEAREST FIRST, which is the order bridge days should be spent in: bring the
     * student up to the year immediately before this one, and reach further back only for what
     * that year itself stands on. A stage that serves nothing is skipped rather than failing the
     * bridge, so a tenant that has Year 1 but not Year 2 still gets a usable one.
     */
    const sets = [];
    for (const stage of bridge.sourceStages) {
      const one = await loadCandidates(tenantId, source, stage);
      if (source === 'PRODUCTION') assertProductionEligible(one);
      if (one.units.length) sets.push(one);
    }
    if (!sets.length) {
      console.warn(`[bridge] none of ${bridge.sourceStages.join(', ')} has units — no bridge`);
      return [];
    }
    const set = { ...sets[0], units: sets.flatMap(x => x.units) };
    const from = bridge.sourceStages.join(' then ');

    const wanted = new Set(bridge.skills);

    /*
     * THE BUDGET IS THE PLAN'S, AND IT IS IN UNITS.
     *
     * The bridge decides how much TEACHING the gaps imply and how many days that takes this
     * learner — a faster one covers the same ground in fewer days and keeps the rest for the
     * year they paid for. Recomputing the budget from the days here would undo that: it would
     * hand a fast learner the same days AND more units, which is how the bridge came to cost
     * everybody thirty days regardless.
     */
    const budget = bridge.units;

    /* Scoped to the budget, so the days land on the gap rather than running out before it. */
    const { topics, laddersShort } = bridgeTopicsWithinBudget(set.units, wanted, budget);
    const scoped = set.units.filter(u => topics.has(String(u.topicCode)));
    if (!scoped.length) {
      console.warn(`[bridge] ${from} teaches none of ${[...wanted].join(', ')} — no bridge`);
      return [];
    }
    if (laddersShort) {
      console.warn(
        `[bridge] ${[...wanted].join(', ')} needs more ${from} teaching than ${budget} units ` +
        `can hold — this learner is being bridged as far as the cap allows, but ${bridge.sourceStages[bridge.sourceStages.length - 1]} ` +
        `is the right programme for them.`,
      );
    }

    const out = composeUnits({
      candidates: scoped,
      targetUnits: budget,
      student: profile,
    });
    if (!out.ok || !out.units.length) {
      console.warn(`[bridge] could not compose ${bridge.days} days: ${out.code || 'no units'}`);
      return [];
    }
    console.log(`[bridge] ${out.units.length} days from ${from} for ${[...wanted].join(', ')}`);
    return out.units;
  } catch (e: any) {
    console.error('[bridge] failed, composing without one:', e?.message || e);
    return [];
  }
}

/**
 * Choose the ninety units, without writing anything.
 *
 * Separated from persistence so a plan can be previewed, audited and tested without a student
 * acquiring a journey as a side effect of somebody looking at one.
 */
/**
 * Turn a composed sequence into the days a student actually sees.
 *
 * ── WHY THIS IS SHARED ────────────────────────────────────────────────────────────────────
 *
 * The preview a non-member is shown is supposed to be EXACTLY what membership will generate —
 * the controller says so in its own comment. It was not. It composed the same units and then
 * numbered them `day: i + 1`, which was right only while exactly one unit was composed per day.
 *
 * Density broke that silently and in the worst direction: the stronger the student, the more
 * units per day, so a learner scoring above seventy composed 220 units for a 110-day programme,
 * failed a `units.length !== programDays` check written when the two were the same number, and
 * was told their roadmap "could not be prepared just now". The better they did, the more certain
 * the failure — which is why it looked like a membership bug rather than a composer one.
 *
 * One packer, used by both, so a preview cannot drift from the journey it is previewing again.
 */
export function packComposedDays(
  composition: ComposerResult,
  profile: StudentProfile,
  programDays: number,
  opts: { dayBudgetMinutes?: number; maxUnitsPerDay?: number } = {},
) {
  const density = densityFor(profile);
  const all = composition.units.map(u => ({
    unitCode: u.unitCode, unitType: u.unitType, estimatedMinutes: u.estimatedMinutes, topicCode: u.topicCode,
  }));
  const options = {
    days: programDays,
    /* The learner's own budget: somebody moving quickly can carry a longer day. */
    budgetMinutes: opts.dayBudgetMinutes ?? density.budgetMinutes ?? DEFAULT_DAY_BUDGET_MINUTES,
    maxUnitsPerDay: opts.maxUnitsPerDay ?? density.maxUnitsPerDay ?? DEFAULT_MAX_UNITS_PER_DAY,
  };

  const first = packIntoDays(all, options);
  if (first.ok || all.length <= programDays) return first;

  /**
   * ── THE PROGRAMME IS THE ADMIN'S DAYS. THE CONTENT FITS ITSELF INTO THEM. ───────────────
   *
   * Whether a given pile of units packs into a given number of days is not a simple matter of
   * arithmetic, because projects and checkpoints own a day each AND truncate the day in front of
   * them. Two compositions of the same size can differ: 280 units packed into 110 days while a
   * different 268 did not.
   *
   * So the number of units to compose cannot be calculated in advance, and tuning the density
   * until it happens to fit is tuning against one student's content. Density says how much to
   * AIM for; this trims to what the days will actually take.
   *
   * It matters because of what the alternative was. A failure here became "your roadmap could
   * not be prepared just now" — and it struck the strongest students, who are composed the most
   * units and are therefore likeliest to overflow. A learner must always get their days; what
   * varies is how much of the curriculum fits inside them.
   *
   * Trimmed from the END, so what is dropped is the material furthest down a sequence already
   * ordered by what this learner needs most.
   */
  let lo = programDays;
  let hi = all.length;
  let best = first;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const attempt = packIntoDays(all.slice(0, mid), options);
    if (attempt.ok) { best = attempt; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best;
}

export async function composeFoundationJourney(
  tenantId: string,
  profile: StudentProfile,
  opts: JourneyBuildOptions = {},
): Promise<{ candidates: number; composition: ComposerResult }> {
  const source = opts.source || 'PRODUCTION';
  const programDays = opts.programDays ?? await programDaysFor(tenantId, opts.stageKey);
  const set = await loadCandidates(tenantId, source, opts.stageKey || 'foundation');

  // Refuses anything but PRODUCTION for a real build. The check is here rather than at the
  // call site so no future caller can forget it.
  if (source === 'PRODUCTION') assertProductionEligible(set);

  /**
   * FUNDAMENTALS FIRST, FOR A LEARNER WHO DOES NOT HAVE THEM.
   *
   * Year 2 opens on objects, which is right for somebody who finished Year 1 and useless for
   * somebody who cannot yet write a function. Where the learner's own evidence shows the gap,
   * the plan opens with Year-1 teaching that closes it and then runs the stage they paid for.
   *
   * A returning Year-1 member has evidence on these skills and shows no gap, so they get no
   * bridge and open on day one of Year 2 exactly as before. That is the same rule, not a
   * special case — see stageBridgePolicy for why no "returning member" flag is involved.
   */
  const bridge = bridgePlanFor(profile, opts.stageKey, programDays);
  const bridgeUnits = bridge ? await composeBridge(tenantId, source, profile, bridge) : [];

  /**
   * The bridge days are handed to the stage composition as history — days already given — so it
   * plans the rest around them rather than teaching the same thing twice.
   *
   * `targetUnits` stays the WHOLE programme and is not reduced by the bridge. composeUnits
   * already subtracts history the candidate pool does not hold, which is every bridge unit,
   * because they are Year-1 units and this pool is Year 2. Subtracting here as well took the
   * thirty off twice and produced an eighty-day plan for a hundred-and-ten-day programme —
   * which the length check would then have refused, leaving the learner with no journey at all.
   */
  /**
   * HOW MANY UNITS, NOT HOW MANY DAYS.
   *
   * This asked for exactly one unit per day, which is why every day of every plan held one
   * topic however much the learner already knew. The number of units is now the learner's own
   * density times the programme length, and dayPackingPolicy — which has allowed three units
   * and a hundred minutes since it was written — draws the day boundaries.
   *
   * The programme length is untouched. Ninety days stays ninety days; what changes is how far
   * through the curriculum ninety days carries this particular learner.
   */
  const density = densityFor(profile);
  const rest = composeUnits({
    candidates: set.units,
    /*
     * The bridge comes OUT of the programme's budget, not on top of it. composeUnits already
     * subtracts history its pool does not hold — every bridge unit — so this is the WHOLE
     * plan's size. Adding the bridge again made the weakest learner's days the densest, which
     * is precisely backwards.
     */
    targetUnits: unitsForDays(programDays, density),
    student: profile,
    history: [...(opts.history || []), ...bridgeUnits.map(u => u.unitCode)],
  });

  if (!bridgeUnits.length) return { candidates: set.units.length, composition: rest };

  /*
   * `requestedDays` is restated as the whole programme because that is what was asked for; the
   * two compositions each answered for part of it, and a caller checking `units.length` against
   * it must see one number for one plan.
   */
  const composition: ComposerResult = {
    ...rest,
    requestedDays: programDays,
    units: [...bridgeUnits, ...rest.units],
  };

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

  /**
   * Named for the stage it teaches. Both of these were literals, so a Build journey was stored
   * as "CareerPilot Foundation Journey ... from the Year-1 curriculum" — wrong in the record an
   * admin reads when they are trying to work out what a student was given.
   */
  const label = CAREER_STAGES.find(s => s.key === String(stageKey))?.label || 'Foundation';
  const doc = await LearningCurriculum.create({
    tenantId,
    title: `CareerPilot ${label} Journey`,
    description: `${programDays} learning days, composed for this student from the ${label} curriculum.`,
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
  const programDays = opts.programDays ?? await programDaysFor(tenantId, opts.stageKey);

  const { composition } = await composeFoundationJourney(tenantId, profile, { ...opts, programDays });

  /**
   * THE INVARIANT, CHECKED BEFORE THE FIRST WRITE.
   *
   * Eighty-seven days is not a smaller success. Persisting it would put a plan in front of a
   * student that quietly breaks the one promise the programme makes, and nothing downstream
   * would ever flag it — the days would be contiguous, numbered from one, and wrong.
   */
  /*
   * THE PROMISE IS DAYS, AND THE CHECK IS NOW ON DAYS.
   *
   * This compared composed UNITS against days, which was the same number only because exactly
   * one unit was ever composed per day. With density it is not, so the check moved below the
   * packer: what must equal the programme length is the number of days packing produced.
   * Too few units to fill them is still a refusal, and still writes nothing.
   */
  if (!composition.ok || composition.units.length < programDays) {
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

  const packed = packComposedDays(composition, profile, programDays, opts);
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
