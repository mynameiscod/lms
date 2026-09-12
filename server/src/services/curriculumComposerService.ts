/**
 * Choosing which Learning Units a student is taught, and in what order.
 *
 * ── PURE, AND DELIBERATELY SO ─────────────────────────────────────────────────────────────
 *
 * No database, no clock, no randomness. Everything it needs is passed in and everything it
 * decides is returned. That is what makes "the same student always gets the same plan" a
 * property a test can hold rather than a claim — and it is the reason the ninety-day spine's
 * selector was written the same way.
 *
 * IT WRITES NOTHING. No DayPlan, no assignment, no student record. Composition is a decision;
 * persisting it is a separate act with its own approvals, and fusing the two would mean the
 * algorithm could not be exercised without changing somebody's plan.
 *
 * ── IT REUSES THE EXISTING VOCABULARY RATHER THAN INVENTING ONE ───────────────────────────
 *
 * Reasons are `AssignmentReason` from adaptiveCurriculumPolicy, states come from
 * `stateForScore`, direction filtering from `appliesToDirection`, and priority from
 * `STATE_ORDER`. A second taxonomy would mean two answers to "why am I learning this", and the
 * student-facing sentence already exists in `explainReason`.
 *
 * ── THE TWO DISTINCTIONS THE WHOLE FIRST YEAR RESTS ON ────────────────────────────────────
 *
 * NOT_EXPOSED IS NOT WEAK. A skill nobody has measured is unknown, not poor. It is taught from
 * the beginning, and it must never be reported as a diagnostic gap — telling a student they
 * scored badly on something they were never asked about is both false and discouraging.
 *
 * VERIFIED IS NOT REMOVED. A student who has demonstrated a skill still sees its units; they
 * are ranked last and marked MASTERY_VERIFIED, because a plan that silently deletes what
 * somebody already knows leaves them unable to tell mastery from an omission.
 */

import {
  AssignmentState, AssignmentReason, STATE_ORDER, stateForScore,
} from '../data/adaptiveCurriculumPolicy';
// Imported from the model that owns it, which is where adaptiveCurriculumPolicy takes it from.
import { SkillConfidence } from '../models/StudentSkillProfile';
import { appliesToDirection, DirectionStatus } from '../data/careerDirectionPolicy';
import {
  isSuitableFor, isInstructional,
  PrerequisiteOutcome, PrerequisiteResolution,
} from '../data/unitSuitabilityPolicy';
import { LearningUnitType, LearningUnitCategory } from '../models/CurriculumLearningUnit';
import {
  CompositionRole, COMPOSITION_ROLES, compositionRoleOf, isInstructionalRole,
  LearnerShape, learnerShapeOf, RoleAllocation, allocationFor,
  REALLOCATION_ORDER, PlanProgress, SchedulingReadiness, schedulingReadiness,
} from '../data/compositionShapePolicy';

/* ------------------------------------------------------------------ *
 * Inputs
 * ------------------------------------------------------------------ */

/** A unit the composer may choose. Structure only — no content, no persistence concerns. */
export interface ComposableUnit {
  unitCode: string;
  title: string;
  moduleCode: string;
  topicCode: string;
  /** Order within its topic, as authored. The teaching sequence. */
  displayOrder: number;
  skillKeys: string[];
  prerequisiteSkillKeys: string[];
  prerequisiteUnitCodes: string[];
  category: LearningUnitCategory;
  applicableDirections: string[];
  unitType: LearningUnitType;
  defaultDepth: string;
  mandatory: boolean;
  estimatedMinutes: number;
  /** Authored suitability. Absent means derived from unitType — see unitSuitabilityPolicy. */
  suitableStates?: AssignmentState[];
}

/** What is known about one skill. Absent from the map entirely means never measured. */
export interface SkillBelief {
  score: number | null;
  confidence: SkillConfidence | null;
}

export interface StudentProfile {
  /** Skill DNA. A key ABSENT means NOT_EXPOSED; a key present with score null means the same. */
  skills: Map<string, SkillBelief>;
  primaryDirection: string | null;
  directionStatus: DirectionStatus;
  /** Directions being sampled by a student who has not chosen. */
  explorationDirections?: string[];
}

/**
 * Resolves the shape a plan should have. The shipped implementation is `allocationFor`.
 *
 * Same signature, so the default IS the policy rather than a special case of it.
 */
export type CompositionPolicy = (
  shape: LearnerShape,
  stance: DirectionStatus,
  programDays: number,
) => RoleAllocation[];

export interface ComposerInput {
  candidates: ComposableUnit[];
  /** How many units to select. P7B will fix this at FOUNDATION_PROGRAM_DAYS; here it is free. */
  targetUnits: number;
  student: StudentProfile;
  /**
   * How the plan's shape is decided. Defaults to the shipped composition-shape policy.
   *
   * ── WHY THE COMPOSER TAKES ITS POLICY AS AN INPUT ───────────────────────────────────────
   *
   * This is not a hook added for one script. The composer is a pure function, and an allocation
   * is policy DATA rather than part of the algorithm: given the same student, candidates and
   * shape, the selection, suitability, prerequisite, breadth and duplication rules are identical
   * whichever allocation is in force. Naming the seam makes that separation explicit and gives
   * both the shipped policy and any policy under evaluation exactly the same code path.
   *
   * It also has to exist for curriculum work to be answerable at all. A curriculum expansion is
   * half new units and half a revised shape — proposing eight checkpoint units while every
   * learner shape allocates VERIFICATION a target of zero produces eight units nobody is ever
   * given, and a before/after comparison showing no change whatsoever. Measuring the proposal
   * requires composing against a shape that is not yet policy.
   *
   * IT CANNOT LOOSEN A RULE. An allocation only says how many of each role are wanted; every
   * safety property — suitability, prerequisites, breadth, no duplicates, determinism — is
   * enforced downstream and identically. A wrong policy here yields a badly shaped plan, never an
   * unsafe one.
   *
   * OMITTED IN PRODUCTION, which is how the default stays the only shape a student's plan is
   * built from.
   */
  compositionPolicy?: CompositionPolicy;
}

/* ------------------------------------------------------------------ *
 * Outputs
 * ------------------------------------------------------------------ */

export interface SelectedUnit {
  unitCode: string;
  title: string;
  /** 1-based position in the composed sequence. Not a calendar day. */
  position: number;
  /** Why this unit, from the existing taxonomy. */
  reason: AssignmentReason;
  /**
   * The MEASURED state, from Skill DNA. Evidence about the student.
   *
   * Never the within-plan projection — see `scheduledAt`. This is the one a student is told.
   */
  state: AssignmentState;
  /**
   * The readiness this unit was SCHEDULED at, which may have come from the plan's own teaching.
   *
   * Reported so a plan can be audited, and named so it cannot be mistaken for the line above.
   * `scheduledOnProjection` says which of the two it was. Nothing may write this into a skill
   * profile, an assessment record, or anything shown to a student as their level.
   */
  scheduledAt: AssignmentState;
  /** True when `scheduledAt` came from the plan rather than from measurement. */
  scheduledOnProjection: boolean;
  /** The skill the reason is about, where one governs. */
  governingSkill: string | null;
  score: number | null;
  moduleCode: string;
  topicCode: string;
  unitType: LearningUnitType;
  /** The job this unit does in the journey. Derived, never stored. */
  role: CompositionRole;
  estimatedMinutes: number;
}

/** One bucket's capacity handed to another, because the first could not be filled. */
export interface Reallocation {
  from: CompositionRole;
  to: CompositionRole;
  units: number;
  reason: 'NO_SUITABLE_INVENTORY';
}

export type ComposerFailure = 'INSUFFICIENT_COMPOSER_READY_INVENTORY';

export interface ComposerResult {
  ok: boolean;
  code?: ComposerFailure;
  requestedDays: number;
  eligibleUnits: number;
  units: SelectedUnit[];
  /** Units filtered out before ranking, and why. Reported, never silent. */
  excluded: { unitCode: string; reason: AssignmentReason }[];
  /**
   * How every prerequisite of every selected unit was resolved.
   *
   * Three outcomes rather than one "unmet" list, because they need different actions and
   * different audiences: an author writes a missing unit, a student finishes a blocking one, and
   * a mastery resolution needs neither. Collapsing them is what made the prototype's report
   * unusable for either reader.
   */
  prerequisites: PrerequisiteOutcome[];

  /**
   * Units that could NOT be scheduled because something they build on is unavailable and the
   * student has not demonstrated it another way.
   *
   * A production composition must never schedule under this condition, so they are excluded and
   * named rather than quietly included.
   *
   * ── TWO CAUSES, AND THEY GO TO DIFFERENT PEOPLE ─────────────────────────────────────────
   *
   * `absent` names a prerequisite that does not exist in the curriculum at all. That is an
   * AUTHORING gap and an author fixes it by writing the unit.
   *
   * `unsuitable` names one that exists and is written, but was filtered out for THIS student —
   * almost always a DEBUG or PROJECT unit in front of a learner who has not reached the state it
   * serves. Nobody can fix that by writing anything; it is a sequencing property of the design,
   * and it is the number that says a beginner cannot reach the far end of a topic in one pass.
   *
   * They were one list until the audit made the difference matter: "two missing prerequisites"
   * reads as a small authoring backlog, and the true finding was that no beginner can reach any
   * unit sitting behind a debugging exercise.
   */
  blocked: { unitCode: string; absent: string[]; unsuitable: string[] }[];

  /** Kept for callers written against the prototype. Both causes, flattened. */
  unmetPrerequisites: { unitCode: string; missing: string[] }[];
  totalMinutes: number;

  /* ---- composition shape ---- */

  /** How much of the design this student has proven. Derived, never a profile name. */
  shape: LearnerShape;
  /** What the plan was asked to contain. */
  allocation: RoleAllocation[];
  /** What it actually contains. */
  composition: Record<CompositionRole, number>;
  /**
   * Capacity moved between buckets, and why.
   *
   * Reported rather than absorbed: "we could not give you anything to build, so you got more
   * debugging" is a decision a student and an author should both be able to see.
   */
  reallocations: Reallocation[];
  /**
   * Roles that finished below the floor the allocation set for them.
   *
   * A plan can be ninety units long and still not be the product that was promised. This is the
   * number that says so.
   */
  shapeViolations: { role: CompositionRole; min: number; actual: number }[];
}

/* ------------------------------------------------------------------ *
 * Ranking
 * ------------------------------------------------------------------ */

/**
 * The skill that decides a unit's fate, and the state it is in.
 *
 * A unit teaching several skills is governed by its WEAKEST measured one — the reason to teach
 * something is the gap it closes, and averaging would let a strong skill hide a weak one in the
 * same unit.
 *
 * Unmeasured skills do not win that contest. NOT_EXPOSED is not weakness, so it only governs
 * when nothing in the unit has been measured at all.
 */
function governingState(unit: ComposableUnit, skills: Map<string, SkillBelief>): {
  state: AssignmentState; skill: string | null; score: number | null;
} {
  let worst: { state: AssignmentState; skill: string; score: number | null } | null = null;

  for (const key of unit.skillKeys) {
    const belief = skills.get(key);
    if (!belief || belief.score === null || belief.score === undefined) continue;
    const state = stateForScore({ score: belief.score, confidence: belief.confidence });
    if (!worst || STATE_ORDER[state] < STATE_ORDER[worst.state]) {
      worst = { state, skill: key, score: belief.score };
    }
  }

  if (worst) return worst;
  return { state: 'NOT_EXPOSED', skill: unit.skillKeys[0] || null, score: null };
}

/**
 * Why this unit is in the plan, in the vocabulary the product already uses.
 *
 * Order matters here: a prerequisite is a prerequisite whatever the score, and a mastered skill
 * is reported as mastered rather than as foundation.
 */
function reasonFor(
  unit: ComposableUnit,
  state: AssignmentState,
  isPrerequisiteOfSelected: boolean,
  student: StudentProfile,
): AssignmentReason {
  if (isPrerequisiteOfSelected) return 'PREREQUISITE';
  if (state === 'VERIFIED') return 'MASTERY_VERIFIED';
  if (state === 'FOUNDATION_REQUIRED' || state === 'GUIDED' || state === 'REVISION') {
    return 'DIAGNOSTIC_GAP';
  }
  if (state === 'NOT_EXPOSED') {
    // Never measured. Not a gap, and saying so would be inventing a score.
    if (unit.category === 'EXPLORATION') return 'CAREER_EXPLORATION';
    if (unit.category === 'DIRECTION') {
      /**
       * Sampled, not committed to.
       *
       * A student who has chosen web is told a CSS unit serves their direction. A student who has
       * chosen nothing is told it is there to help them choose — which is true, and which avoids
       * the plan implying a decision they never made. The alternative was NOT_YET_EXPOSED, which
       * says nothing about why this particular unit is in front of them.
       */
      return student.primaryDirection ? 'STUDENT_DIRECTION' : 'CAREER_EXPLORATION';
    }
    if (unit.mandatory || unit.category === 'UNIVERSAL') return 'STANDARD_FOUNDATION';
    return 'NOT_YET_EXPOSED';
  }
  if (unit.category === 'DIRECTION') {
    return student.primaryDirection ? 'STUDENT_DIRECTION' : 'CAREER_EXPLORATION';
  }
  if (unit.category === 'EXPLORATION') return 'CAREER_EXPLORATION';
  return 'STANDARD_FOUNDATION';
}

/**
 * How urgently a unit should be taught. Lower sorts earlier.
 *
 * Four terms, in descending authority:
 *
 *   1. STATE       a measured gap outranks anything unmeasured, which outranks mastery.
 *   2. MANDATORY   the universal foundation is never pushed behind optional material.
 *   3. DIRECTION   material serving the student's chosen direction beats material that does not.
 *   4. CATEGORY    universal, then direction, then academic, then exploration, then enrichment.
 *
 * Deliberately NOT a weighted sum. A single number invites tuning it until the output looks
 * right, and then nobody can say why a unit ranked where it did. Lexicographic ordering means
 * every comparison has one reason, and the reason is legible.
 */
const CATEGORY_RANK: Record<LearningUnitCategory, number> = {
  UNIVERSAL: 0, DIRECTION: 1, ACADEMIC: 2, EXPLORATION: 3, ENRICHMENT: 4,
};

function priorityOf(unit: ComposableUnit, state: AssignmentState, student: StudentProfile): number[] {
  const servesDirection = student.primaryDirection
    ? appliesToDirection(unit.applicableDirections, student.primaryDirection)
      && (unit.applicableDirections || []).length > 0
    : false;

  return [
    STATE_ORDER[state],
    unit.mandatory ? 0 : 1,
    servesDirection ? 0 : 1,
    CATEGORY_RANK[unit.category] ?? 9,
  ];
}

const compareArrays = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

/* ------------------------------------------------------------------ *
 * Composition
 * ------------------------------------------------------------------ */

export function composeUnits(input: ComposerInput): ComposerResult {
  const { candidates, targetUnits, student } = input;

  /* ---- 1. relevance ------------------------------------------------ */

  /**
   * A unit outside the student's direction is EXCLUDED, unless it is mandatory.
   *
   * Mandatory survives every filter by definition — Git does not stop mattering because somebody
   * chose AI. An exploring or undecided student keeps direction units for the directions they
   * are sampling, because breadth is the point of that state.
   */
  const exploring = new Set(
    (student.explorationDirections || []).map(d => String(d).toUpperCase()),
  );

  /**
   * UNDECIDED IS A VALID PLACE TO BE, AND IT STAYS ONE.
   *
   * A learner who has not chosen a direction used to receive no direction material at all: every
   * scoped non-mandatory unit was filtered out. For a beginner that barely showed, because the
   * universal foundation is enormous. For somebody who has proven that foundation it was fatal —
   * everything left that was new to them was direction-scoped, and their plan ran dry at 56 units.
   *
   * The wrong fix is to make them choose, or to quietly set a direction on their behalf. Neither
   * is true to what the product knows about them, and one of them writes a decision into a
   * student's profile that the student never made.
   *
   * So a learner with no chosen direction SAMPLES ACROSS ALL of them. Nothing is written to
   * `primaryDirection`, the units are explained as CAREER_EXPLORATION rather than as serving a
   * direction they never picked, and the breadth rule below stops the sampling from collapsing
   * into one area.
   */
  const samplingBreadth = !student.primaryDirection;

  const excluded: ComposerResult['excluded'] = [];
  const relevant: ComposableUnit[] = [];

  for (const unit of candidates) {
    const scoped = (unit.applicableDirections || []).length > 0;
    if (!scoped || unit.mandatory) { relevant.push(unit); continue; }

    const serves = appliesToDirection(unit.applicableDirections, student.primaryDirection)
      || unit.applicableDirections.some(d => exploring.has(String(d).toUpperCase()))
      // No direction chosen: every direction is on the table, subject to the breadth rule.
      || (samplingBreadth && exploring.size === 0);

    if (serves) relevant.push(unit);
    else excluded.push({ unitCode: unit.unitCode, reason: 'OUTSIDE_DIRECTION' });
  }
  /* ---- 2. rank ------------------------------------------------------ */

  /**
   * Every candidate by code, INCLUDING the ones the direction filter removed.
   *
   * A prerequisite dropped upstream is still a real unit whose skills can answer "has this
   * student already shown it". Looking only at the surviving set would report a mastered
   * prerequisite as an authoring gap.
   */
  const allByCode = new Map(candidates.map(u => [u.unitCode, u]));
  const byCode = new Map(relevant.map(u => [u.unitCode, u]));

  /**
   * The measured state of every relevant unit. Computed once, and it does NOT move.
   *
   * Ranking asks how urgent a unit is for this student, which is a fact about their diagnostic
   * and should not drift as the plan is built. Suitability asks whether they can do it YET, and
   * that does move — see the projection below. Keeping the two apart is what lets the order stay
   * stable while the gate opens.
   */
  const stateOf = new Map<string, ReturnType<typeof governingState>>();
  for (const u of relevant) stateOf.set(u.unitCode, governingState(u, student.skills));

  const roleOf = new Map<string, CompositionRole>();
  for (const u of relevant) roleOf.set(u.unitCode, compositionRoleOf(u));

  /**
   * Which area a direction unit counts towards when sampling.
   *
   * The inventory scopes units to overlapping sets — AI_ML and DATA name the same 21 units,
   * CLOUD_DEVOPS and CYBERSECURITY the same 8 — so counting per direction label would say five
   * areas exist where there are three distinct bodies of material. Taking the first label in
   * sorted order collapses each set to one stable name, which is what makes the breadth counts
   * mean something and keeps them identical between runs.
   */
  const familyOf = (u: ComposableUnit): string | null => {
    const dirs = (u.applicableDirections || []).map(d => String(d).toUpperCase()).sort();
    if (!dirs.length) return null;
    if (exploring.size) return dirs.find(d => exploring.has(d)) || dirs[0];
    return dirs[0];
  };

  /**
   * The total order. Every tie is broken, so two runs cannot disagree.
   *
   * The last term is the unit code, which is unique by construction — without a terminal
   * tie-break, two units identical on every other axis would order by whatever the array
   * happened to contain, and the plan would change between runs for no reason a student could see.
   */
  const ranked = [...relevant].sort((a, b) => {
    const byPriority = compareArrays(
      priorityOf(a, stateOf.get(a.unitCode)!.state, student),
      priorityOf(b, stateOf.get(b.unitCode)!.state, student),
    );
    if (byPriority) return byPriority;
    if (a.moduleCode !== b.moduleCode) return a.moduleCode.localeCompare(b.moduleCode);
    if (a.topicCode !== b.topicCode) return a.topicCode.localeCompare(b.topicCode);
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.unitCode.localeCompare(b.unitCode);
  });
  const rankIndex = new Map(ranked.map((u, i) => [u.unitCode, i]));

  /* ---- 2b. what the plan itself teaches ----------------------------- */

  /**
   * The student as the plan will have left them, not as they arrived.
   *
   * PRACTICE serves GUIDED and later; PROJECT serves STANDARD and later. A learner with nothing
   * measured is NOT_EXPOSED everywhere, so both were filtered as unsuitable before any allocation
   * could ask for them — which is why the audit found 37 practice units designed and 0 ever
   * selected. The composer was judging the student on day one and never noticing that the plan it
   * was building would teach them something.
   *
   * So teaching counts as it is scheduled. The ladder stops at STANDARD on purpose: REVISION and
   * VERIFIED assert that somebody has DEMONSTRATED a skill, and only measurement can establish
   * that. Projecting into them would let a plan claim mastery it had merely scheduled.
   */
  const progress = new Map<string, Set<PlanProgress>>();

  const noteTaught = (u: ComposableUnit) => {
    const role = roleOf.get(u.unitCode)!;
    const mark: PlanProgress | null =
      isInstructionalRole(role) ? 'TAUGHT'
        : role === 'PRACTICE' ? 'PRACTISED'
          : null;
    if (!mark) return;
    for (const key of u.skillKeys) {
      const set = progress.get(key) || new Set<PlanProgress>();
      set.add(mark);
      // Practising something the plan never taught still implies exposure to it.
      if (mark === 'PRACTISED') set.add('TAUGHT');
      progress.set(key, set);
    }
  };

  /**
   * How ready the plan has made the student for this unit.
   *
   * A SCHEDULING fact, not an assessment result. It never reaches `student.skills` — which is
   * read and never written for the whole of composition — and it is reported on the result under
   * its own name so nothing downstream can mistake it for a measurement.
   */
  const readinessOf = (u: ComposableUnit): SchedulingReadiness => {
    const governing = stateOf.get(u.unitCode)!;
    const key = governing.skill;
    return schedulingReadiness(governing.state, (key && progress.get(key)) || new Set<PlanProgress>());
  };

  const suitableNow = (u: ComposableUnit): boolean =>
    isSuitableFor(u, readinessOf(u).equivalentState);

  /* ---- 3. allocate --------------------------------------------------- */

  /**
   * The shape this student's journey should have, before a single unit is chosen.
   *
   * Derived from what they have proven against the whole design, never from a label — the audit's
   * nine profiles are fixtures and a real student arrives with a diagnostic.
   */
  const designSkills = [...new Set(candidates.flatMap(u => u.skillKeys))].sort();
  const shape = learnerShapeOf({ designSkills, skills: student.skills });
  const allocation = (input.compositionPolicy ?? allocationFor)(
    shape, student.directionStatus as any, targetUnits,
  );

  const budget = new Map<CompositionRole, number>(allocation.map(a => [a.role, a.target]));
  const reallocations: Reallocation[] = [];

  /* ---- 4. select ----------------------------------------------------- */

  /**
   * A unit is only taken once everything it builds on has been taken.
   *
   * Walked repeatedly rather than topologically sorted up front, because the ranking decides
   * WHICH units are wanted and the prerequisites only decide WHEN. Sorting first would let a
   * low-priority prerequisite drag its whole chain into a plan that did not want it.
   */
  const selected: ComposableUnit[] = [];
  const chosen = new Set<string>();
  const asPrerequisite = new Set<string>();
  const prerequisites: PrerequisiteOutcome[] = [];

  /**
   * Has the student already demonstrated what a missing prerequisite teaches?
   *
   * Checked against the prerequisite UNIT's skills where the unit is known, and against the
   * dependent unit's declared prerequisite skills otherwise. Either way the bar is VERIFIED:
   * anything less means the capability is assumed rather than shown, and assuming is what the
   * whole readiness programme exists to stop.
   */
  const masteredBy = (code: string, dependent: ComposableUnit): { skill: string; score: number } | null => {
    const prereqUnit = allByCode.get(code);
    const keys = prereqUnit?.skillKeys?.length
      ? prereqUnit.skillKeys
      : dependent.prerequisiteSkillKeys;

    for (const key of keys || []) {
      const belief = student.skills.get(key);
      if (!belief || belief.score === null || belief.score === undefined) continue;
      const state = stateForScore({ score: belief.score, confidence: belief.confidence });
      if (state === 'VERIFIED') return { skill: key, score: belief.score };
    }
    return null;
  };

  /**
   * Resolve one prerequisite into one of three outcomes.
   *
   * A MISSING PREREQUISITE IS NOT SATISFIED BY DEFAULT. The prototype treated anything outside
   * the pool as fine, which is wrong in the one case that matters: the unit is genuinely needed,
   * nobody authored it, and the student has not shown the capability. Scheduling the dependent
   * unit then teaches somebody something they are not ready for, silently.
   */
  /**
   * MASTERY SATISFIES A PREREQUISITE WHEREVER THE UNIT SITS.
   *
   * This used to ask about pool membership first: a prerequisite inside the pool was satisfied
   * only by being scheduled, and mastery was consulted only for units outside it. That made the
   * answer depend on where the prerequisite lived rather than on what the student could do, and
   * it produced a genuinely absurd result — a learner VERIFIED across the foundation could never
   * be given a project, because every project names a practice unit as its prerequisite and
   * practice is not suitable for somebody already fluent. The prerequisite was unschedulable and
   * unsatisfiable at once, so the project was simply unreachable by the people most ready for it.
   *
   * Asking about the student first is both correct and the P7A.1 semantics as written: in the
   * plan, or already demonstrated, or genuinely blocked.
   */
  const resolveOne = (u: ComposableUnit, code: string): PrerequisiteResolution => {
    if (chosen.has(code)) return 'SATISFIED_BY_PLAN';
    if (masteredBy(code, u)) return 'SATISFIED_BY_MASTERY';
    return 'BLOCKED_MISSING_PREREQUISITE';
  };

  const readyToTake = (u: ComposableUnit): boolean =>
    u.prerequisiteUnitCodes.every(c => resolveOne(u, c) !== 'BLOCKED_MISSING_PREREQUISITE');

  /**
   * Everything a unit depends on, however deep.
   *
   * Transitive rather than direct, because a chain resolves one link at a time: with A -> B -> C
   * and the gap at C, the composer takes A first, and A is only a DIRECT prerequisite of B. A
   * direct-only check would label B as a prerequisite and leave A explained as ordinary
   * foundation — the same unit described two different ways depending on chain depth.
   */
  const closureOf = (code: string, seen = new Set<string>()): Set<string> => {
    const u = byCode.get(code);
    if (!u) return seen;
    for (const dep of u.prerequisiteUnitCodes) {
      if (seen.has(dep) || !byCode.has(dep)) continue;
      seen.add(dep);
      closureOf(dep, seen);
    }
    return seen;
  };

  /** Readiness as it stood the moment each unit was taken, before its own teaching counted. */
  const readinessAtSelection = new Map<string, SchedulingReadiness>();

  /** How many direction units each sampled area has contributed so far. */
  const familyCount = new Map<string, number>();
  /** Running count per role, so phase 4a can see which floors are still unmet. */
  const roleCount = new Map<CompositionRole, number>();

  const take = (u: ComposableUnit, spendBudget: boolean) => {
    readinessAtSelection.set(u.unitCode, readinessOf(u));
    selected.push(u);
    chosen.add(u.unitCode);
    noteTaught(u);
    const role = roleOf.get(u.unitCode)!;
    roleCount.set(role, (roleCount.get(role) || 0) + 1);
    if (role === 'DIRECTION_LEARNING') {
      const fam = familyOf(u);
      if (fam) familyCount.set(fam, (familyCount.get(fam) || 0) + 1);
    }
    if (spendBudget) {
      /**
       * A pull whose bucket is empty is taken anyway, and does NOT rob another bucket.
       *
       * Borrowing from the bucket with the most left was tried and was clearly worse: early in a
       * plan the large budgets are direction and advanced material, so every prerequisite pull
       * drained them and both had nothing left by the time the walk reached them — an exploring
       * learner's career units went from five to none and a software learner's plan got WORSE.
       *
       * The honest reason is structural, not arithmetic. Prerequisite pulls are overwhelmingly
       * instruction, because reaching one practice unit means teaching its topic first, and each
       * topic is five to eight concept units deep. A plan cannot spend less on instruction than
       * its own prerequisite chains cost, whatever an allocation asks for, so making the pull
       * charge somebody is not a saving — it just moves the shortfall somewhere less visible.
       */
      budget.set(role, Math.max(0, (budget.get(role) || 0) - 1));
    }
  };

  /**
   * Hand an unfillable bucket's capacity to the next pedagogically valid one.
   *
   * NOT A FALLBACK — a pedagogical choice, and it is why REALLOCATION_ORDER is a table of
   * preferences rather than a loop over whatever has room. A plan that cannot find projects gives
   * that capacity to debugging and practice, because all three are applying what was taught;
   * answering "nothing to build" with "more reading" is the failure this whole layer exists to
   * prevent.
   *
   * Returns false when nothing anywhere can absorb it, which is the genuine inventory failure.
   */
  const reallocate = (): boolean => {
    const stuck = COMPOSITION_ROLES.filter(r => (budget.get(r) || 0) > 0);
    if (!stuck.length) return false;

    const canAbsorb = (to: CompositionRole) => ranked.some(u =>
      !chosen.has(u.unitCode) && roleOf.get(u.unitCode) === to
      && suitableNow(u) && readyToTake(u));

    const move = (from: CompositionRole, to: CompositionRole) => {
      const amount = budget.get(from) || 0;
      budget.set(from, 0);
      budget.set(to, (budget.get(to) || 0) + amount);
      const prior = reallocations.find(r => r.from === from && r.to === to);
      if (prior) prior.units += amount;
      else reallocations.push({ from, to, units: amount, reason: 'NO_SUITABLE_INVENTORY' });
    };

    // First choice: the pedagogically preferred destinations, in their stated order.
    for (const from of stuck) {
      for (const to of REALLOCATION_ORDER[from]) {
        if (canAbsorb(to)) { move(from, to); return true; }
      }
    }

    /**
     * Last resort: any role that can absorb it.
     *
     * REALLOCATION_ORDER lists four preferred destinations per role, not all eight, because the
     * point is to name the pedagogically sensible ones. But a preference list that does not
     * mention a role means capacity can strand beside inventory that could have used it — a plan
     * came back an exploration unit short with that unit sitting unselected and eligible. Falling
     * back to any absorbing role keeps the length promise; it is still recorded as a
     * reallocation, so a shape that only held because of a last-resort move is visible rather
     * than silently fine.
     */
    for (const from of stuck) {
      for (const to of COMPOSITION_ROLES) {
        if (to !== from && canAbsorb(to)) { move(from, to); return true; }
      }
    }
    return false;
  };

  /**
   * The breadth rule: sample areas evenly rather than exhausting whichever ranks first.
   *
   * Without it an undecided learner's whole direction allocation goes to web development, because
   * the inventory holds 38 web units against 21 for AI/data and 8 for cloud/cyber and M05 sorts
   * early. That is not exploration, it is a default chosen by module code — and it would be
   * indistinguishable, in the finished plan, from the student having picked web.
   *
   * So a direction unit may only be taken while its area is not ahead of the others. The minimum
   * is taken over areas that STILL HAVE something available, which is what makes the rule
   * self-healing: when cloud/cyber runs out of its eight units it stops holding the others back,
   * rather than stalling the plan. Recomputed once per selection, never per candidate, because
   * doing it inside the scan turned a linear search into a cubic one.
   */
  const breadthFloor = (): number | null => {
    if (!samplingBreadth) return null;
    const available = new Map<string, number>();
    for (const c of ranked) {
      if (chosen.has(c.unitCode) || roleOf.get(c.unitCode) !== 'DIRECTION_LEARNING') continue;
      const fam = familyOf(c);
      if (!fam || !suitableNow(c) || !readyToTake(c)) continue;
      available.set(fam, (available.get(fam) || 0) + 1);
    }
    if (!available.size) return null;
    return Math.min(...[...available.keys()].map(f => familyCount.get(f) || 0));
  };

  const withinBreadthOf = (u: ComposableUnit, floor: number | null): boolean => {
    if (floor === null || roleOf.get(u.unitCode) !== 'DIRECTION_LEARNING') return true;
    const fam = familyOf(u);
    return !fam || (familyCount.get(fam) || 0) <= floor;
  };

  /**
   * The nearest thing in a unit's prerequisite chain that CAN be taught right now.
   *
   * Transitive, so a chain resolves one link per pass: with A -> B -> C and the gap at A, this
   * returns A, then B, then C. Nothing unsuitable is ever returned, so a pull can never schedule
   * something the student is not ready for.
   */
  const pullTargetFor = (
    u: ComposableUnit, floor: number | null,
  ): ComposableUnit | undefined =>
    [...closureOf(u.unitCode)]
      .map(c => byCode.get(c)!)
      .filter(x => x && !chosen.has(x.unitCode) && suitableNow(x) && readyToTake(x)
        /**
         * THE BREADTH RULE BINDS PULLS TOO.
         *
         * Prerequisites are same-topic, so a practice unit in a direction topic drags that
         * direction's instruction in with it — and practice is chosen by rank, which favours the
         * largest direction. Exempting pulls from breadth let web development take 65% of an
         * undecided learner's direction capacity through the back door, with the breadth rule
         * looking like it was working on the units it did govern.
         *
         * A blocked pull is not a dead end: it means another area is behind, so the next pass
         * reaches for that one instead.
         */
        && withinBreadthOf(x, floor))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.unitCode.localeCompare(b.unitCode))[0];

  /* ---- 4a. keep the promises first ---------------------------------- */

  /**
   * SATISFY EVERY FLOOR BEFORE OPTIMISING ANYTHING.
   *
   * `min` is a promise about what a plan contains; `target` is what a good plan looks like. Fill
   * greedily by rank and the promises lose, every time, to whatever ranks higher — and the role
   * that loses is always the one ranked last, which is INTEGRATION. A mixed learner reached day
   * ninety having built nothing while all nine mini-projects were reachable.
   *
   * Reserving slots for unmet floors was tried first and is not enough on its own: a project
   * needs its practice unit pulled in first, so the single reserved slot was consumed by the
   * prerequisite and the project still missed the plan. The promise needs the whole chain, which
   * means it has to be made early, while there is room for it.
   *
   * ROLES ARE WALKED IN PEDAGOGICAL ORDER — instruction, then practice, then application, then
   * integration — because that is the order in which the plan's own teaching makes the later ones
   * possible. A project cannot be scheduled until something has taught and practised its skill,
   * and COMPOSITION_ROLES is already in that order.
   */
  /**
   * ROLE BY ROLE WAS WRONG. THE FLOORS ARE SATISFIED IN ROTATION.
   *
   * Walking the roles in order and finishing each one produced a block-structured plan: sixteen
   * foundation units, then nine guided, then two advanced — a first month of twenty-eight
   * instruction units and two practice, for every profile, with every project in the final third.
   * Every count in the report was correct and the journey was wrong.
   *
   * Rotating fixes it without a quota, because prerequisite structure does the pacing itself.
   * Early on the practical roles have nothing suitable — nothing has been taught yet — so they
   * are skipped and instruction fills the rotation. As teaching accumulates their units become
   * schedulable and the rotation picks them up naturally, which is the interleaving.
   *
   * The role chosen each pass is the one furthest below its floor IN PROPORTION to that floor, so
   * a role needing sixteen and a role needing two advance together rather than the larger one
   * monopolising the early plan. Ties break on allocation order, so two runs cannot disagree.
   */
  let guard = 0;
  while (guard++ <= targetUnits * 4 && selected.length < targetUnits) {
    const floor = breadthFloor();

    const shortfall = (a: RoleAllocation) => {
      const have = roleCount.get(a.role) || 0;
      return a.min > 0 && have < a.min ? (a.min - have) / a.min : 0;
    };

    const behind = allocation
      .filter(a => shortfall(a) > 0)
      .sort((x, y) => shortfall(y) - shortfall(x)
        || allocation.indexOf(x) - allocation.indexOf(y));

    if (!behind.length) break;

    let took = false;
    for (const a of behind) {
      const direct = ranked.find(u =>
        !chosen.has(u.unitCode)
        && roleOf.get(u.unitCode) === a.role
        && withinBreadthOf(u, floor)
        && suitableNow(u)
        && readyToTake(u));

      if (direct) { take(direct, true); took = true; break; }

      /**
       * Not teachable yet, so teach towards it.
       *
       * A project needs STANDARD, which the plan only reaches by teaching and then practising the
       * skill; until that happens the project is unsuitable, so nothing would ever pull in the
       * practice unit that makes it suitable. Reaching for a unit that cannot be taught YET is
       * how the promise gets kept — and only the takeable link is taken, so nothing unsuitable is
       * ever scheduled.
       */
      const aspirant = ranked.find(u =>
        !chosen.has(u.unitCode)
        && roleOf.get(u.unitCode) === a.role
        && withinBreadthOf(u, floor)
        && pullTargetFor(u, floor));

      const pulled = aspirant && pullTargetFor(aspirant, floor);
      if (pulled) {
        asPrerequisite.add(pulled.unitCode);
        take(pulled, true);
        took = true;
        break;
      }
    }

    // Nothing anywhere can advance a floor: the rest are unreachable from this inventory.
    if (!took) break;
  }

  /* ---- 4b. fill the rest by rank, within the allocation -------------- */

  while (selected.length < targetUnits) {
    const floor = breadthFloor();
    const affordable = (u: ComposableUnit) =>
      !chosen.has(u.unitCode)
      && (budget.get(roleOf.get(u.unitCode)!) || 0) > 0
      && withinBreadthOf(u, floor);

    /**
     * The best-ranked unit whose bucket still has room and which can be taught now.
     *
     * Ranking still decides WHICH unit — it is simply consulted within the allocation rather than
     * across the whole pool. That is the entire difference between this and the P7A composer, and
     * it is why the ordering rule could be kept intact.
     */
    /**
     * FINISH WHAT YOU STARTED BEFORE STARTING SOMETHING NEW.
     *
     * Ranking alone produced a first month of 28 concept units and 2 practice, for every profile,
     * with every project in the final third — the back-loaded journey the shape layer exists to
     * prevent, one level subtler than ninety CONCEPT units. Suitability was not the cause: by
     * day ten a beginner has been taught ten topics and the practice for them is schedulable. The
     * composer simply preferred another new topic every time, because NOT_EXPOSED outranks
     * everything and there is always another untouched topic.
     *
     * So a practical unit in a topic the plan has ALREADY OPENED is taken ahead of instruction in
     * a topic it has not. That is not a quota and adds no numbers to tune: it is the ordinary
     * teaching sequence the curriculum already encodes in its own `after` chains — teach it,
     * practise it, debug it, build with it, then move on.
     *
     * Every other rule still binds. The unit must be affordable within its bucket, suitable now,
     * ready on prerequisites and within the breadth rule; this only decides WHICH of the takeable
     * units goes next, and the practical roles remain capped by their own budgets, so preferring
     * them cannot run away with the plan.
     */
    const takeable = (u: ComposableUnit) => affordable(u) && suitableNow(u) && readyToTake(u);
    const openTopics = new Set(selected.map(u => u.topicCode));

    const followUp = ranked.find(u =>
      openTopics.has(u.topicCode)
      && !isInstructionalRole(roleOf.get(u.unitCode)!)
      && takeable(u));

    const next = followUp ?? ranked.find(takeable);

    if (next) {
      /**
       * Taken out of rank order to unblock something above it? Then it is a PREREQUISITE.
       *
       * A unit that merely happens to rank here is explained on its own merits. A unit pulled
       * forward because a higher-ranked unit depends on it is in the plan for a different
       * reason, and saying so is the difference between "this is foundation everybody covers"
       * and "this is here because the thing you actually need builds on it".
       */
      const pulledForward = ranked.some(higher =>
        higher.unitCode !== next.unitCode
        && !chosen.has(higher.unitCode)
        && rankIndex.get(higher.unitCode)! < rankIndex.get(next.unitCode)!
        && closureOf(higher.unitCode).has(next.unitCode));

      if (pulledForward) asPrerequisite.add(next.unitCode);
      take(next, true);
      continue;
    }

    /**
     * Nothing takeable has budget, so try to unblock something the allocation still wants.
     *
     * A unit whose bucket has room but whose prerequisite is not yet in the plan is not an
     * inventory failure — it is an ordering problem, and pulling the prerequisite solves it. The
     * second form reaches for units the plan cannot teach yet, for the same reason as in 4a.
     *
     * A pull SPENDS its bucket where that bucket has room. It was briefly free, on the reasoning
     * that it serves something else; the effect was that free units consumed plan length without
     * consuming allocation, so the plan filled up while buckets still held unspent budget. It is
     * never refused for want of budget — it simply stops being invisible.
     */
    const wanted = ranked.find(u => affordable(u) && suitableNow(u));
    let pulled = wanted && pullTargetFor(wanted, floor);

    if (!pulled) {
      const aspirant = ranked.find(u => affordable(u) && !suitableNow(u) && pullTargetFor(u, floor));
      pulled = aspirant && pullTargetFor(aspirant, floor);
    }

    if (pulled) {
      asPrerequisite.add(pulled.unitCode);
      take(pulled, true);
      continue;
    }

    if (!reallocate()) break;
  }

  /* ---- 5. reconcile -------------------------------------------------- */

  /** Every prerequisite of every selected unit, resolved against the finished plan. */
  for (const u of selected) {
    for (const code of u.prerequisiteUnitCodes) {
      const resolution = chosen.has(code)
        ? 'SATISFIED_BY_PLAN' as const
        : (masteredBy(code, u) ? 'SATISFIED_BY_MASTERY' as const : 'BLOCKED_MISSING_PREREQUISITE' as const);
      const mastery = resolution === 'SATISFIED_BY_MASTERY' ? masteredBy(code, u) : null;
      prerequisites.push({
        unitCode: u.unitCode,
        prerequisite: code,
        resolution,
        ...(mastery ? { viaSkill: mastery.skill, score: mastery.score } : {}),
      });
    }
  }

  /**
   * How many units this student could be taught AT ALL.
   *
   * Computed once at the end rather than accumulated during the walk. Scheduling readiness only
   * ever advances, so a unit teachable at any point is teachable at the end — which makes the
   * end-state answer both cheaper and correct, and independent of which phase of selection
   * happened to look at it. Accumulating inside the fill loop undercounted badly once floors were
   * satisfied in their own pass, because that pass never went through the loop.
   */
  const everSuitable = new Set<string>(
    relevant.filter(u => chosen.has(u.unitCode) || suitableNow(u)).map(u => u.unitCode),
  );

  /**
   * Units the direction filter kept but the student's state never had a use for.
   *
   * Judged at the END of the walk, against everything the plan taught. A unit reported here was
   * unsuitable even after three months of instruction, which is a real statement; reporting it
   * from the day-one state would have called a beginner's entire practice inventory unusable.
   */
  for (const u of relevant) {
    if (chosen.has(u.unitCode) || everSuitable.has(u.unitCode)) continue;
    const { equivalentState } = readinessOf(u);
    excluded.push({
      unitCode: u.unitCode,
      reason: equivalentState === 'VERIFIED' && isInstructional(u)
        ? 'MASTERY_VERIFIED' : 'NOT_YET_EXPOSED',
    });
  }

  /**
   * Units left out because something they build on is UNAVAILABLE and unproven.
   *
   * ── WHY THIS IS NOT SIMPLY `resolveOne` OVER THE LEFTOVERS ──────────────────────────────
   *
   * Selection stops the moment the plan is full, so most unchosen units were never considered at
   * all. `resolveOne` reports an in-pool prerequisite as BLOCKED whenever it is not `chosen`,
   * which is the right answer DURING selection (it cannot be taken yet) and the wrong one
   * afterwards (it could have been, had there been room). Reporting those said a healthy beginner
   * curriculum had 83 blocked units and 78 missing prerequisites, when the true figure was zero.
   *
   * ── TWO CAUSES, BECAUSE THEY GO TO DIFFERENT PEOPLE ─────────────────────────────────────
   *
   * `absent` is a prerequisite nobody ever wrote, and an author fixes it. `unsuitable` is one
   * that exists but this student could never reach, which no amount of authoring changes.
   */
  const blocked: ComposerResult['blocked'] = [];
  for (const u of relevant) {
    if (chosen.has(u.unitCode)) continue;
    const unavailable = u.prerequisiteUnitCodes.filter(c => !byCode.has(c) && !masteredBy(c, u));
    if (!unavailable.length) continue;
    blocked.push({
      unitCode: u.unitCode,
      absent: unavailable.filter(c => !allByCode.has(c)),
      unsuitable: unavailable.filter(c => allByCode.has(c)),
    });
  }
  const unmetPrerequisites = blocked
    .map(b => ({ unitCode: b.unitCode, missing: [...b.absent, ...b.unsuitable] }));

  /* ---- 6. did the shape survive? ------------------------------------- */

  const composition = Object.fromEntries(
    COMPOSITION_ROLES.map(r => [r, selected.filter(u => roleOf.get(u.unitCode) === r).length]),
  ) as Record<CompositionRole, number>;

  /**
   * A ninety-unit plan can still not be the product that was promised.
   *
   * `min` is the floor that makes a plan defensible, so a role finishing below it is reported
   * even when the plan is otherwise full. Without this the rebalancer could satisfy the length
   * and quietly hollow out the journey, which is the exact failure the shape layer was added to
   * catch — just one level subtler than ninety CONCEPT units.
   */
  const shapeViolations = allocation
    .filter(a => composition[a.role] < a.min)
    .map(a => ({ role: a.role, min: a.min, actual: composition[a.role] }));

  /* ---- 7. shape the result ------------------------------------------ */

  /**
   * Reported in SELECTION order, which is the teaching order.
   *
   * Instruction for a skill is what makes practice on it suitable, so the projection guarantees
   * the concept unit was taken first. The sequence therefore reads as a journey — teach, debug,
   * practise, build — rather than as ninety units sorted by urgency.
   */
  const units: SelectedUnit[] = selected.map((u, i) => {
    const s = stateOf.get(u.unitCode)!;
    const readiness = readinessAtSelection.get(u.unitCode)
      ?? { equivalentState: s.state, projected: false };
    return {
      unitCode: u.unitCode,
      title: u.title,
      position: i + 1,
      /**
       * The reason and the state both come from MEASUREMENT, never from the projection.
       *
       * This is the line that keeps a scheduling convenience out of what a student is told. A
       * plan that taught somebody loops on day three must not, on day nine, describe them as
       * having reached STANDARD in loops — they have attended, not demonstrated.
       */
      reason: reasonFor(u, s.state, asPrerequisite.has(u.unitCode), student),
      state: s.state,
      scheduledAt: readiness.equivalentState,
      scheduledOnProjection: readiness.projected,
      governingSkill: s.skill,
      score: s.score,
      moduleCode: u.moduleCode,
      topicCode: u.topicCode,
      unitType: u.unitType,
      role: roleOf.get(u.unitCode)!,
      estimatedMinutes: u.estimatedMinutes,
    };
  });

  const shapeFields = {
    shape,
    allocation,
    composition,
    reallocations,
    shapeViolations,
  };

  /**
   * An insufficient plan is a STRUCTURED REFUSAL, never a short plan.
   *
   * Returning forty units for a request of ninety is how a product ships a twenty-eight-day
   * roadmap sold as ninety days. The caller is told the number it asked for and the number that
   * exists, and decides what to do about it.
   */
  if (selected.length < targetUnits) {
    return {
      ok: false,
      code: 'INSUFFICIENT_COMPOSER_READY_INVENTORY',
      requestedDays: targetUnits,
      eligibleUnits: everSuitable.size,
      units,
      excluded,
      prerequisites,
      blocked,
      unmetPrerequisites,
      totalMinutes: units.reduce((n, u) => n + u.estimatedMinutes, 0),
      ...shapeFields,
    };
  }

  return {
    ok: true,
    requestedDays: targetUnits,
    eligibleUnits: everSuitable.size,
    units,
    excluded,
    prerequisites,
    blocked,
    unmetPrerequisites,
    totalMinutes: units.reduce((n, u) => n + u.estimatedMinutes, 0),
    ...shapeFields,
  };
}
