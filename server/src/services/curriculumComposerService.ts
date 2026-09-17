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
import { isCoreModuleFor, appliesToDirection, DirectionStatus } from '../data/careerDirectionPolicy';
import {
  isSuitableFor, isInstructional, suitableStatesFor,
  PrerequisiteOutcome, PrerequisiteResolution,
  knownInstruction, standardEvidenceSatisfies,
} from '../data/unitSuitabilityPolicy';
import { LearningUnitType, LearningUnitCategory } from '../models/CurriculumLearningUnit';
import {
  CompositionRole, COMPOSITION_ROLES, compositionRoleOf, isInstructionalRole,
  LearnerShape, learnerShapeOf, RoleAllocation, allocationFor,
  REALLOCATION_ORDER, PlanProgress, SchedulingReadiness, schedulingReadiness,
} from '../data/compositionShapePolicy';
import {
  CourseStrand, SPINE_STRAND, COURSE_STRANDS, strandOf, strandIndex, sequenceIndexOf,
  sequencePredecessorOf, practicalBoundaries,
} from '../data/courseSequencePolicy';

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
  /**
   * What this learner has ALREADY been given, in the order they were given it: the frozen days of a journey being
   * recomposed. Empty for a new journey.
   *
   * ── A RECOMPOSITION IS A CONTINUATION, NOT A NEW DAY ONE ────────────────────────────────
   *
   * Recomposition used to compose a fresh ninety days for the updated learner, drop what was already taught, and
   * fill the future from what was left in the fresh plan's order. The fresh plan knew nothing of the frozen days:
   * it spent capacity as if none had been used, reserved spine topics the learner had already practised, and put
   * whatever a day-one plan puts late — functions, arrays — past the end of the future the stitch could fill.
   * Structural units were cut or scrambled while every count stayed correct.
   *
   * So the history is replayed before anything is chosen, exactly as if the plan had taken it: its units are
   * chosen, their teaching counts, their roles spend their budgets and count toward their floors, their topic blocks
   * are open where they were left. What remains to compose is the real future — the capacity this learner has left,
   * the structure they have not yet covered, for the learner the evidence now describes. History is never re-judged
   * and never moved. A history unit that is no longer a candidate (unpublished since, say) still occupies its day
   * and still satisfies what builds on it.
   */
  history?: string[];
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

  /**
   * Lessons left out because this learner reliably knows everything they teach, below the level the
   * learner is at — each with the weakest skill and score that established it.
   *
   * Reported rather than folded into `excluded`, whose reasons are persisted with assignments and
   * would have had to call these "not yet exposed", which is the opposite of the truth.
   */
  knownInstruction?: { unitCode: string; viaSkill: string; score: number; state: AssignmentState }[];
  /**
   * Every topic block the plan opened: where it began, the practical boundary it was heading for,
   * whether it got there, and each time it had to stop short and why. A sequencing record only.
   */
  topicBlocks?: TopicBlockReport[];
  /**
   * The course's structural requirements as they stood once history was accounted for, before the future was chosen.
   * Today the programming spine; each topic's requirement is reaching its first practical boundary.
   */
  structure?: StructuralRequirementReport[];
}

/**
 * Where one structural requirement stands for this learner at the start of the future.
 *
 * COVERED_BY_FROZEN_PLAN: the learner was already given its boundary. RESOLVED_BY_EVIDENCE: under the composer's
 * current evidence semantics nothing on the path to it still needs scheduling for this learner — a statement about
 * TODAY's treatment, not a promise that the requirement never appears again. REQUIRES_FUTURE_COVERAGE: the future
 * must reach it.
 */
export type StructuralCoverage = 'COVERED_BY_FROZEN_PLAN' | 'RESOLVED_BY_EVIDENCE' | 'REQUIRES_FUTURE_COVERAGE';

export interface StructuralRequirementReport {
  strand: CourseStrand;
  topicCode: string;
  /** The practical unit that meets the requirement, or null when the topic has none this learner could be given. */
  boundary: string | null;
  coverage: StructuralCoverage;
  /**
   * How measurement ranks the requirement for sequencing: the state-order index the composer opens it by (a partial
   * GUIDED or STANDARD reading on an unresolved requirement counts as untouched, as it does when topics are opened).
   * A later requirement may reach its boundary before an earlier one only when this ranks it strictly ahead.
   */
  sequencingRank: number;
}

/**
 * Why an ACTIVE block stopped. PAUSED_FOR_ROLE_CAPACITY: a continuation exists, but its role has no room left
 * in the allocation. NOT_READY: nothing on the path can be taken yet. INTERRUPTED: something else in the plan
 * opened another topic first.
 */
export type BlockStopReason = 'PAUSED_FOR_ROLE_CAPACITY' | 'NOT_READY' | 'INTERRUPTED';

/**
 * How a block ended. BOUNDARY_REACHED: its practical boundary was taken. ACTIVE_AT_END: the plan ended while it
 * was still being taught. PAUSED_AT_END: it paused for capacity and never resumed. ABANDONED: it stopped
 * because nothing on its path could be taken, and never resumed.
 */
export type BlockOutcome = 'BOUNDARY_REACHED' | 'ACTIVE_AT_END' | 'PAUSED_AT_END' | 'ABANDONED';

export interface TopicBlockReport {
  topicCode: string;
  strand: CourseStrand;
  /** The practical unit the block was teaching towards. */
  target: string;
  openedAt: number;
  /** Position at which the target was taken, or null when it never was. */
  reachedAt: number | null;
  /** Each stop, and the position at which the block next made progress (null: it never did). */
  stops: { at: number; reason: BlockStopReason; resumedAt: number | null }[];
  outcome?: BlockOutcome;
  /** The floor role a pull opened this block to keep, if any. */
  promisedFor?: CompositionRole;
  /** Whether the path to the boundary fitted the role capacity left when the block was opened. */
  fittedWhenOpened?: boolean;
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

  /**
   * SHARED-CORE AFFINITY. Term 4, and its position is the whole safety argument.
   *
   * Year 1 scopes almost nothing to SOFTWARE_BACKEND on purpose — Programming, C, DSA,
   * Databases and Developer Tools are UNIVERSAL because everybody needs them, and they are
   * also exactly the backend track. The consequence was that a software-focused student
   * allocated fifteen days to DIRECTION_LEARNING, found zero direction-scoped units, and had
   * that capacity reallocated into instruction that was not software. They chose a direction
   * and the plan answered with more of everything else.
   *
   * This prefers, among otherwise equal peers, the universal modules the student's direction
   * is actually built from. No unit is duplicated into a direction-labelled copy; one
   * curriculum is simply ordered differently per learner.
   *
   * BELOW state and mandatory, which is what makes it safe. It cannot re-teach a demonstrated
   * skill, cannot push the universal foundation behind optional material, and cannot satisfy
   * an unmet prerequisite — suitability and the prerequisite walk both run downstream of
   * ranking and are untouched. It reorders peers; it never promotes anything past a rule.
   *
   * ── AND IT APPLIES ONLY TO PRACTICAL WORK. MEASURED, NOT ASSUMED. ───────────────────────
   *
   * The first version applied it to every unit type, and the audit said plainly that it made
   * the software profile WORSE: concept units rose 67 -> 70 while practice fell 10 -> 8 and
   * projects 4 -> 3. Preferring core-module INSTRUCTION simply crowded out practical work from
   * elsewhere, which is the opposite of the complaint. A student who has demonstrated
   * programming does not need more programming lessons ranked higher; they need the practice,
   * debugging and projects that let them USE it.
   *
   * So the affinity is restricted to the three practical types. Instruction continues to be
   * ordered by state and category alone, exactly as it was before this change.
   */
  const PRACTICAL: LearningUnitType[] = ['PRACTICE', 'DEBUG', 'PROJECT'];
  const coreAffinity = PRACTICAL.includes(unit.unitType)
    && isCoreModuleFor(
      unit.moduleCode, student.primaryDirection, student.explorationDirections || [],
    );

  return [
    STATE_ORDER[state],
    unit.mandatory ? 0 : 1,
    servesDirection ? 0 : 1,
    coreAffinity ? 0 : 1,
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
  const { candidates, student } = input;
  const candidateCodes = new Set(candidates.map(u => u.unitCode));
  const history = [...new Set((input.history || []).map(c => String(c).toUpperCase()))];
  const historySet = new Set(history);
  /** History the pool no longer holds: it keeps its day and satisfies what builds on it, but is not composed. */
  const outsideHistory = history.filter(c => !candidateCodes.has(c));
  const targetUnits = input.targetUnits - outsideHistory.length;

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
    // What the learner has already been given is part of their curriculum, whatever their direction says now.
    if (!scoped || unit.mandatory || historySet.has(unit.unitCode)) { relevant.push(unit); continue; }

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

  /**
   * Lessons this learner reliably knows, below the level they are at. Decided ONCE, from measurement.
   *
   * A universal STANDARD learner sits in the beginner-type allocation, so its foundation and guided
   * instruction budgets were spent on first-exposure lessons for skills they had already shown. Those
   * lessons are not scheduled as ordinary instruction; their budget is left to reallocate to practice,
   * debugging, projects, direction and deeper instruction exactly as any unfillable bucket does.
   *
   * The rule lives in unitSuitabilityPolicy so the certifier judges plans by the same one. It reads
   * measured Skill DNA only — never the plan's projection — so teaching a topic can never talk the
   * composer into treating the learner as having arrived knowing it, and it is computed here rather
   * than per candidate, because it cannot change during composition.
   */
  const knownLessons = new Map<string, NonNullable<ReturnType<typeof knownInstruction>>>();
  for (const u of relevant) {
    const known = knownInstruction(u, student.skills);
    if (known) knownLessons.set(u.unitCode, known);
  }
  const isKnownLesson = (u: ComposableUnit): boolean => knownLessons.has(u.unitCode);

  /**
   * Whether this unit may be SELECTED now: suitable at the readiness the plan has reached, and not a
   * lesson this learner already knows. Suitability itself is untouched — `isSuitableFor` and every
   * authored `suitableStates` mean exactly what they meant — and a known lesson is still reported,
   * under `knownInstruction` on the result, rather than silently dropped.
   */
  const suitableNow = (u: ComposableUnit): boolean =>
    !isKnownLesson(u) && isSuitableFor(u, readinessOf(u).equivalentState);

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
  const chosen = new Set<string>(outsideHistory);
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
   * Has MEASUREMENT already carried the student past everything a prerequisite unit teaches?
   *
   * ── THE DEADLOCK THIS CLOSES ────────────────────────────────────────────────────────────
   *
   * A learner measured at REVISION (75–84) on a skill cannot be scheduled that skill's concept
   * units — instruction serves up to STANDARD, and re-teaching somebody who has demonstrated a
   * skill is exactly what suitability exists to prevent. Nor does mastery satisfy the concept as
   * a prerequisite, because mastery means VERIFIED. So every practice, debugging exercise and
   * project behind a concept unit was unschedulable AND unsatisfiable at once, and a learner
   * scoring 75–84 across the design was left twelve units in total.
   *
   * ── WHY THIS IS NOT A LOWER MASTERY THRESHOLD ───────────────────────────────────────────
   *
   * Nothing here says REVISION is VERIFIED, and it is reported under its own resolution so it
   * cannot be read as mastery. It asks a narrower question of the prerequisite UNIT: is every
   * skill it teaches measured, and is the weakest of them at an evidence-only state past the
   * highest state that unit serves? Then the unit has nothing left to teach this student, and
   * the reason it is not in the plan is evidence rather than absence.
   *
   * What that leaves untouched, by construction: STANDARD is never beyond a concept unit, so a
   * STANDARD learner is still taught; low confidence caps a score at STANDARD, so a thin result
   * satisfies nothing; an unmeasured skill anywhere in the unit refuses outright; and a practice
   * unit still serves REVISION, so a REVISION learner is scheduled the practice rather than
   * excused it. Only measured state is read — never the plan's own projection.
   */
  const TEACHING_LADDER: AssignmentState[] =
    ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];
  const EVIDENCE_BEYOND_TEACHING: AssignmentState[] = ['REVISION', 'VERIFIED', 'ENRICHMENT'];

  const outgrownBy = (code: string): { skill: string; score: number; state: AssignmentState } | null => {
    const prereqUnit = allByCode.get(code);
    if (!prereqUnit || !prereqUnit.skillKeys.length) return null;

    let weakest: { skill: string; score: number; state: AssignmentState } | null = null;
    for (const key of prereqUnit.skillKeys) {
      const belief = student.skills.get(key);
      if (!belief || belief.score === null || belief.score === undefined) return null;
      const state = stateForScore({ score: belief.score, confidence: belief.confidence });
      if (!weakest || TEACHING_LADDER.indexOf(state) < TEACHING_LADDER.indexOf(weakest.state)) {
        weakest = { skill: key, score: belief.score, state };
      }
    }
    if (!weakest || !EVIDENCE_BEYOND_TEACHING.includes(weakest.state)) return null;

    const highestServed = Math.max(...suitableStatesFor(prereqUnit).map(s => TEACHING_LADDER.indexOf(s)));
    return TEACHING_LADDER.indexOf(weakest.state) > highestServed ? weakest : null;
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
  /**
   * A same-topic lesson whose every skill is reliably measured STANDARD or above.
   *
   * Asked LAST, after the plan, mastery and REVISION evidence, so a stronger resolution is never
   * reported as this weaker one. See `standardEvidenceSatisfies` for what it will and will not accept.
   */
  // Precomputed once for every prerequisite edge of every relevant unit: it reads only measured evidence,
  // which cannot change during composition, and `readyToTake` asks it from inside the ranking scans. A
  // learner with no reliable STANDARD evidence leaves the map empty and pays a single failed lookup.
  const standardEvidenceByDependent = new Map<string, Map<string, NonNullable<ReturnType<typeof standardEvidenceSatisfies>>>>();
  for (const u of relevant) {
    for (const code of u.prerequisiteUnitCodes) {
      const via = standardEvidenceSatisfies(allByCode.get(code), u, student.skills);
      if (!via) continue;
      if (!standardEvidenceByDependent.has(u.unitCode)) standardEvidenceByDependent.set(u.unitCode, new Map());
      standardEvidenceByDependent.get(u.unitCode)!.set(code, via);
    }
  }
  const standardEvidenceFor = (code: string, dependent: ComposableUnit) =>
    standardEvidenceByDependent.get(dependent.unitCode)?.get(code) ?? null;

  const resolveOne = (u: ComposableUnit, code: string): PrerequisiteResolution => {
    if (chosen.has(code)) return 'SATISFIED_BY_PLAN';
    if (masteredBy(code, u)) return 'SATISFIED_BY_MASTERY';
    if (outgrownBy(code)) return 'SATISFIED_BY_EVIDENCE';
    if (standardEvidenceFor(code, u)) return 'SATISFIED_BY_STANDARD_EVIDENCE';
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
  const walkClosure = (code: string, seen = new Set<string>()): Set<string> => {
    const u = byCode.get(code);
    if (!u) return seen;
    for (const dep of u.prerequisiteUnitCodes) {
      if (seen.has(dep) || !byCode.has(dep)) continue;
      seen.add(dep);
      walkClosure(dep, seen);
    }
    return seen;
  };
  // The prerequisite graph cannot change during composition, so each closure is walked once. Read-only.
  const closureMemo = new Map<string, Set<string>>();
  const closureOf = (code: string): Set<string> => {
    let c = closureMemo.get(code);
    if (!c) { c = walkClosure(code); closureMemo.set(code, c); }
    return c;
  };

  /* ---- 3b. topic blocks and course strands --------------------------- */

  /**
   * A TOPIC IS TAUGHT AS A BLOCK, UP TO THE POINT WHERE THE LEARNER DOES SOMETHING WITH IT.
   *
   * The floor rotation hands each pass to a different role, and each role's best-ranked unit sits in a
   * different topic, so a beginner's first month read files, arrays, Git, career, files, decomposition —
   * forty-six topic switches in ninety days, thirty single-day visits, and a forty-two-day wait between
   * a pseudocode lesson and its practice. Every count was right and the course was incoherent.
   *
   * So once a lesson opens a topic, the plan keeps teaching that topic towards its next practical
   * boundary (see courseSequencePolicy) before starting another. Nothing is forced: each step must be
   * within its role's budget, suitable now, ready on prerequisites and within the breadth rule, exactly
   * as any other take. When a step is not, the block stops, the reason is recorded, and the block is
   * resumed as soon as it can be — before anything new is opened. Reaching the boundary ends the block,
   * so a block is a stretch of teaching, never a topic's monopoly of the plan.
   */
  const topicUnits = new Map<string, ComposableUnit[]>();
  for (const u of relevant) {
    if (!topicUnits.has(u.topicCode)) topicUnits.set(u.topicCode, []);
    topicUnits.get(u.topicCode)!.push(u);
  }
  const topicOrder = [...topicUnits.keys()].sort();
  const boundariesOf = new Map<string, ComposableUnit[]>(
    topicOrder.map(t => [t, practicalBoundaries(topicUnits.get(t)!)]),
  );
  // A boundary this learner could ever be scheduled — judged at the most the plan can project. A learner
  // who has demonstrated beyond practice has no boundary to be taught towards, so no block is opened.
  const FULLY_TAUGHT = new Set<PlanProgress>(['TAUGHT', 'PRACTISED']);
  const attainable = new Set<string>(
    [...boundariesOf.values()].flat()
      .filter(a => isSuitableFor(a, schedulingReadiness(stateOf.get(a.unitCode)!.state, FULLY_TAUGHT).equivalentState))
      .map(a => a.unitCode),
  );
  const nextBoundary = (topic: string): ComposableUnit | undefined =>
    boundariesOf.get(topic)!.find(a => !chosen.has(a.unitCode) && attainable.has(a.unitCode));
  const firstBoundary = (topic: string): ComposableUnit | undefined => boundariesOf.get(topic)?.[0];

  const dependentsOf = new Map<string, ComposableUnit[]>();
  for (const u of relevant) {
    for (const p of u.prerequisiteUnitCodes) {
      if (!dependentsOf.has(p)) dependentsOf.set(p, []);
      dependentsOf.get(p)!.push(u);
    }
  }

  const spineSequence = (COURSE_STRANDS.find(x => x.strand === SPINE_STRAND)?.sequence || [])
    .filter(t => topicUnits.has(t));

  const moduleOfTopic = new Map(topicOrder.map(t => [t, topicUnits.get(t)![0].moduleCode]));
  const strandOfTopic = (topic: string): CourseStrand => strandOf(topic, moduleOfTopic.get(topic) || '');

  const blocks: TopicBlockReport[] = [];
  /** Unfinished blocks by topic, in the order they were opened. */
  const openBlocks = new Map<string, TopicBlockReport>();
  let activeTopic: string | null = null;
  const openedInStrand = new Map<CourseStrand, number>();
  let lastOpenedStrand: CourseStrand | null = null;
  const everOpened = new Set<string>();

  const stopBlock = (topic: string, reason: BlockStopReason) => {
    const b = openBlocks.get(topic);
    const last = b?.stops[b.stops.length - 1];
    // A block that stopped and has not made progress since is still in the same stop, not a new one.
    if (b && !(last && last.resumedAt === null)) b.stops.push({ at: selected.length, reason, resumedAt: null });
    if (activeTopic === topic) activeTopic = null;
  };

  /** Called for every unit taken, in every phase. Opens, continues, or completes a block. */
  const noteBlock = (u: ComposableUnit) => {
    const topic = u.topicCode;
    const open = openBlocks.get(topic);
    const pending = open?.stops[open.stops.length - 1];
    if (pending && pending.resumedAt === null) pending.resumedAt = selected.length;
    if (open && open.target === u.unitCode) {
      open.reachedAt = selected.length;
      openBlocks.delete(topic);
      if (activeTopic === topic) activeTopic = null;
      return;
    }
    if (!isInstructionalRole(roleOf.get(u.unitCode)!)) return;
    if (activeTopic && activeTopic !== topic) stopBlock(activeTopic, 'INTERRUPTED');
    if (open) { activeTopic = topic; return; }
    const target = nextBoundary(topic);
    if (!target) return;
    const strand = strandOfTopic(topic);
    const block: TopicBlockReport = {
      topicCode: topic, strand, target: target.unitCode, openedAt: selected.length, reachedAt: null, stops: [],
      fittedWhenOpened: pathFits(target),
    };
    blocks.push(block);
    openBlocks.set(topic, block);
    activeTopic = topic;
    everOpened.add(topic);
    openedInStrand.set(strand, (openedInStrand.get(strand) || 0) + 1);
    lastOpenedStrand = strand;
  };

  /** Readiness as it stood the moment each unit was taken, before its own teaching counted. */
  const readinessAtSelection = new Map<string, SchedulingReadiness>();

  /** How many direction units each sampled area has contributed so far. */
  const familyCount = new Map<string, number>();
  /** Running count per role, so phase 4a can see which floors are still unmet. */
  const roleCount = new Map<CompositionRole, number>();

  /** True while history is replayed: what was given is taken exactly as it was, never substituted. */
  let replayingHistory = false;
  const take = (wanted: ComposableUnit, spendBudget: boolean) => {
    const u = replayingHistory ? wanted : structuralOrder(wanted);
    readinessAtSelection.set(u.unitCode, readinessOf(u));
    selected.push(u);
    chosen.add(u.unitCode);
    noteTaught(u);
    noteBlock(u);
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

  /**
   * PARTIAL EVIDENCE COMPRESSES THE SPINE; IT NEVER REMOVES IT.
   *
   * State ranks first, and GUIDED and STANDARD rank after NOT_EXPOSED — right for unrelated material, wrong for the
   * programming spine. A learner whose one programming score put variables at GUIDED had every variables lesson
   * ranked behind every untouched topic, so variables never opened; conditions, loops, functions and arrays wait on
   * variables by sequence, and the unrelated topics took the capacity. A score of 30 kept the spine and 46 lost it.
   *
   * So a unit on the path to an UNRESOLVED spine topic's first practice — a topic the plan still owes teaching to,
   * exactly as the spine reservation counts it — competes for a turn as untouched material does, however far past
   * untouched the partial evidence puts it. Its role, depth, suitability and budget are its own: a GUIDED learner
   * still gets GUIDED instruction and less of it. A topic evidence has resolved is not on the reservation and is
   * ranked as before, and nothing is ever raised above FOUNDATION_REQUIRED or untouched material.
   */
  const priorityFor = (u: ComposableUnit): number[] => {
    const priority = priorityOf(u, stateOf.get(u.unitCode)!.state, student);
    if (priority[0] <= STATE_ORDER.NOT_EXPOSED || priority[0] >= STATE_ORDER.LOCKED) return priority;
    spineReserve();
    if (!spineNeeds.has(u.topicCode)) return priority;
    const first = firstBoundary(u.topicCode)!;
    if (first.unitCode !== u.unitCode && !closureOf(first.unitCode).has(u.unitCode)) return priority;
    return [STATE_ORDER.NOT_EXPOSED, ...priority.slice(1)];
  };

  /**
   * RESUME BEFORE REACHING FOR SOMETHING NEW — PULLS INCLUDED.
   *
   * A pull is how the plan teaches past an empty bucket. When the unit rank would pull towards can no longer be
   * reached before the plan ends, the first thing to pull towards instead is a block already paused: one whose
   * boundary's role has room, is suitable, and is finishable. The step is an ordinary pull; the breadth rule was
   * applied when the block opened. Without this a strong exploring learner's last ten days scattered one lesson each
   * across five direction topics and practised none of them.
   */
  const resumeByPull = (floor: number | null, wants: (target: ComposableUnit) => boolean): ComposableUnit | undefined => {
    for (const block of openBlocks.values()) {
      const target = byCode.get(block.target)!;
      if (!wants(target) || !suitableNow(target) || !finishable(target)) continue;
      const step = stepTowards(target, floor, false, true);
      // Exploration is sampling within its own allocation; a resumed pull never spends past it.
      if (step && (roleOf.get(step.unitCode) !== 'EXPLORATION' || (budget.get('EXPLORATION') || 0) > 0)) return step;
    }
    return undefined;
  };

  /** Record that the block a floor pull just advanced is being taught to keep that role's floor. */
  const promise = (pulled: ComposableUnit, role: CompositionRole) => {
    const block = openBlocks.get(pulled.topicCode);
    if (block && !block.promisedFor) block.promisedFor = role;
  };

  /**
   * Does what is left of the path to this boundary fit the capacity each role still has?
   *
   * Counts, per role, the untaken units on the path this learner would actually be scheduled — not lessons they
   * already know, not units their evidence has outgrown, not units they can never be given. A topic whose path
   * fits is opened before one whose path does not, so a block starts where it can finish rather than leaving a
   * lesson fragment behind. A preference, never a gate. Closures are precomputed; this is a count.
   */
  const pathNeeds = (target: ComposableUnit): Map<CompositionRole, number> => {
    const need = new Map<CompositionRole, number>();
    for (const code of [target.unitCode, ...closureOf(target.unitCode)]) {
      const x = byCode.get(code);
      if (!x || chosen.has(code) || isKnownLesson(x) || outgrownBy(code)) continue;
      if (!isSuitableFor(x, schedulingReadiness(stateOf.get(code)!.state, FULLY_TAUGHT).equivalentState)) continue;
      const role = roleOf.get(code)!;
      need.set(role, (need.get(role) || 0) + 1);
    }
    return need;
  };
  /**
   * THE PROGRAMMING SPINE KEEPS ITS PLACE IN THE QUEUE.
   *
   * A beginner's foundation-instruction target is 24. Reaching the first practice of variables, conditions, loops
   * and functions costs 17 of it, hardware 7, decomposition 6 and pseudocode 4. Opened in strand order with no
   * regard for what the spine still needs, orientation and thinking blocks spent that capacity first: conditions
   * reached practice on day 28, and loops and functions never did.
   *
   * So when a topic is judged for fit, the capacity still needed to bring each unresolved spine topic to its first
   * practice — its lessons and the debugging on that path — is treated as spoken for: all of it for a topic outside
   * the spine, and only the earlier spine topics' share for a topic on it. This is a
   * ranking preference only — a topic that does not fit is still opened when nothing that fits can be — and it
   * never touches a budget, a floor or a prerequisite. A topic whose path this learner no longer needs teaching
   * for (evidence has resolved it) reserves nothing, so no elementary instruction is pushed onto a measured learner.
   */
  let reserveAt = -1;

  const spineNeeds = new Map<string, Map<CompositionRole, number>>();
  const spineReserve = (): void => {
    if (reserveAt !== selected.length) {
      reserveAt = selected.length;
      spineNeeds.clear();
      for (const topic of spineSequence) {
        const first = firstBoundary(topic);
        if (!first || chosen.has(first.unitCode) || !attainable.has(first.unitCode)) continue;
        const need = pathNeeds(first);
        // Resolved by evidence: nothing on the path still needs teaching, so nothing is held for it.
        if (![...need.keys()].some(role => isInstructionalRole(role))) continue;
        spineNeeds.set(topic, need);
      }
    }
  };
  /**
   * Taking this practical unit leaves the unresolved spine's share of its role untouched. A unit that is itself on a
   * spine topic's first-practice path always may; so may anything when the spine is resolved or not owed that role.
   */
  const leavesSpineRoom = (u: ComposableUnit): boolean => {
    spineReserve();
    const role = roleOf.get(u.unitCode)!;
    let held = 0;
    for (const [topic, needs] of spineNeeds) {
      const first = firstBoundary(topic)!;
      if (first.unitCode === u.unitCode || closureOf(first.unitCode).has(u.unitCode)) return true;
      held += needs.get(role) || 0;
    }
    return (budget.get(role) || 0) - held >= 1;
  };
  /**
   * THE RESERVATION HOLDS CAPACITY, NOT ONLY A PLACE IN THE QUEUE.
   *
   * State ranks first, so a topic measured FOUNDATION_REQUIRED opens ahead of an untouched one. The Skill Check
   * measures six Foundation skills; a beginner who answers it wrongly has hardware, files, decomposition and
   * pseudocode all at FOUNDATION_REQUIRED, and those blocks spent the foundation-instruction capacity that the
   * reservation above only ranked for — variables reached practice, and conditions, loops and functions never
   * entered. Scoring badly on more foundation skills gave a learner less of the programming course.
   *
   * So instruction off an unresolved spine topic's path to its first practice does not spend what that path is
   * still owed — whenever a choice that does not is available. It binds only where the spine's hold is the reason:
   * a role with no hold on it, and a learner whose spine is resolved, are exactly as before. The spine's own units
   * still need their turn, suitability, prerequisites and budget; nothing is forced, and when no reserving choice
   * exists the choice is exactly what it was.
   */
  const onSpinePath = (u: ComposableUnit): boolean => {
    spineReserve();
    for (const topic of spineNeeds.keys()) {
      const first = firstBoundary(topic)!;
      if (first.unitCode === u.unitCode || closureOf(first.unitCode).has(u.unitCode)) return true;
    }
    return false;
  };
  const spineHeld = (role: CompositionRole): number => {
    spineReserve();
    let held = 0;
    for (const needs of spineNeeds.values()) held += needs.get(role) || 0;
    return held;
  };
  /**
   * Taking this unit would spend capacity its role holds for the unresolved spine. Practical roles too: a path to
   * first practice runs through its debugging exercise, and an unrelated debugging exercise that takes the last
   * application slot leaves arrays three lessons in and never practised.
   */
  const spendsSpineReserve = (u: ComposableUnit): boolean => {
    const role = roleOf.get(u.unitCode)!;
    if (onSpinePath(u)) return false;
    const held = spineHeld(role);
    return held > 0 && (budget.get(role) || 0) - held < 1;
  };
  const pathFits = (target: ComposableUnit, holdSpine = true): boolean => {
    const need = pathNeeds(target);
    spineReserve();
    // Outside the spine, everything the unresolved spine still needs is held. On an unresolved spine topic's path to
    // its first practice, only what the topics BEFORE it still need: an earlier topic is never made to wait for a later
    // one's share. A spine topic's LATER boundary is not that path — it holds the unresolved spine like anything else,
    // or variables' second practice spends what conditions, loops and functions were promised.
    const position = spineNeeds.has(target.topicCode) && firstBoundary(target.topicCode)?.unitCode === target.unitCode
      ? spineSequence.indexOf(target.topicCode) : -1;
    const held = new Map<CompositionRole, number>();
    for (const [topic, needs] of spineNeeds) {
      if (!holdSpine || (position >= 0 && spineSequence.indexOf(topic) >= position)) continue;
      for (const [role, n] of needs) held.set(role, (held.get(role) || 0) + n);
    }
    return [...need].every(([role, n]) => (budget.get(role) || 0) - (held.get(role) || 0) >= n)
      && [...need.values()].reduce((a, b) => a + b, 0) <= targetUnits - selected.length;
  };
  /** Whether what is left of the path to this unit can still be taught before the plan ends. */
  const finishable = (target: ComposableUnit): boolean =>
    [...pathNeeds(target).values()].reduce((a, b) => a + b, 0) <= targetUnits - selected.length;

  /**
   * The next step towards a boundary: the boundary itself when it can be taken, otherwise its earliest
   * takeable prerequisite. The same rules as any take.
   *
   * COHERENCE CONTROLS ORDER; IT DOES NOT OVERRIDE THE MIX. A step is taken only while its OWN role has room in
   * the allocation. A block never spends another role's capacity because its practice is still several
   * lessons away — letting it do so took an undecided learner's direction from eleven units to none, and a
   * @70 learner's practice from twenty-seven to eighteen. With no room the block PAUSES, the plan serves the
   * roles that do have room, and the block resumes before anything new is opened once its role has capacity.
   *
   * BREADTH: an OPEN block is sampled as a block. The breadth rule decides whether a direction topic may be
   * opened; once it is, its steps are not refused one lesson at a time for the family being ahead, which is
   * what turned sampling into a lesson from web, a lesson from AI, a lesson from cloud, and none of them
   * practised. The next opening still has to wait until the other families have caught up.
   */
  const stepTowards = (
    target: ComposableUnit, floor: number | null, needBudget: boolean, openBlock = false,
  ): ComposableUnit | undefined => {
    const ok = (x: ComposableUnit) => !chosen.has(x.unitCode) && suitableNow(x) && readyToTake(x)
      && (openBlock || withinBreadthOf(x, floor))
      && (!needBudget || (budget.get(roleOf.get(x.unitCode)!) || 0) > 0);
    if (ok(target)) return target;
    let best: ComposableUnit | undefined;
    for (const code of closureOf(target.unitCode)) {
      const x = byCode.get(code);
      if (!x || !ok(x)) continue;
      if (!best || x.displayOrder < best.displayOrder
        || (x.displayOrder === best.displayOrder && x.unitCode < best.unitCode)) best = x;
    }
    return best;
  };

  /** Continue the active block, or resume the earliest-opened stopped one. */
  const blockContinuation = (floor: number | null): ComposableUnit | undefined => {
    const order = activeTopic
      ? [activeTopic, ...[...openBlocks.keys()].filter(t => t !== activeTopic)]
      : [...openBlocks.keys()];
    for (const topic of order) {
      const block = openBlocks.get(topic)!;
      const target = byCode.get(block.target)!;
      // A block a floor pull opened continues as that pull — the standing rule, under which a pull is taken
      // whatever its bucket holds — but only while that floor is still unmet. Nothing else may spend past a role.
      const promise = block.promisedFor
        && (roleCount.get(block.promisedFor) || 0) < (allocation.find(x => x.role === block.promisedFor)?.min ?? 0);
      const step = stepTowards(target, floor, !promise, true);
      // An open block off the spine's path waits rather than spend what the unresolved spine is owed.
      if (step && spendsSpineReserve(step)) continue;
      if (step) return step;
      if (topic === activeTopic) {
        stopBlock(topic, stepTowards(target, floor, false, true) ? 'PAUSED_FOR_ROLE_CAPACITY' : 'NOT_READY');
      }
    }
    return undefined;
  };

  /**
   * THE COURSE HAS STRANDS, AND PROGRAMMING IS ITS SPINE.
   *
   * When a new topic has to be opened, measured priority still decides first — state, mandatory,
   * direction, category — so a learner's weakest area is never pushed behind the course's default order.
   * Among topics that priority cannot separate, the strand policy does: a topic whose authored predecessor
   * has not reached its first boundary waits; a topic being opened for the first time goes before a
   * return to a deeper boundary; programming alternates with the other strands so neither all the
   * pre-programming nor all the programming comes first; and the other strands take turns, the
   * foundation strands while they still have authored topics to teach.
   */
  /**
   * Is an EARLIER topic in this topic's authored sequence still unresolved for this learner — its first practice not
   * yet taken, attainable, and still needing teaching? Arrays is not opened ahead of loops and functions a beginner
   * has not reached; a learner whose evidence resolves loops is not held back by it.
   */
  const predecessorPending = (topic: string): boolean => {
    for (let prior = sequencePredecessorOf(topic); prior; prior = sequencePredecessorOf(prior)) {
      if (!topicUnits.has(prior)) continue;
      const first = firstBoundary(prior);
      if (!first || chosen.has(first.unitCode) || !attainable.has(first.unitCode)) continue;
      if ([...pathNeeds(first).keys()].some(role => isInstructionalRole(role))) return true;
    }
    return false;
  };
  /** Taking this unit would OPEN a topic ahead of an unresolved earlier topic in its sequence. */
  const opensOutOfOrder = (u: ComposableUnit): boolean =>
    isInstructionalRole(roleOf.get(u.unitCode)!) && !openBlocks.has(u.topicCode) && predecessorPending(u.topicCode);
  const strandHasSequenceLeft = (strand: CourseStrand): boolean => {
    const s = COURSE_STRANDS.find(x => x.strand === strand)!;
    return s.sequence.some(t => {
      const first = firstBoundary(t);
      return !!first && !chosen.has(first.unitCode) && attainable.has(first.unitCode);
    });
  };
  const openingKey = (topic: string, step: ComposableUnit, target: ComposableUnit): number[] => {
    const strand = strandOfTopic(topic);
    const spineTurn = lastOpenedStrand !== null && lastOpenedStrand !== SPINE_STRAND;
    return [
      ...priorityFor(step),
      predecessorPending(topic) ? 1 : 0,
      pathFits(target) ? 0 : 1,
      everOpened.has(topic) ? 1 : 0,
      (strand === SPINE_STRAND) === spineTurn ? 0 : 1,
      strand === SPINE_STRAND || strandHasSequenceLeft(strand) ? 0 : 1,
      openedInStrand.get(strand) || 0,
      strandIndex(strand),
      sequenceIndexOf(topic) ?? COURSE_STRANDS.length * 10,
      rankIndex.get(step.unitCode)!,
    ];
  };

  /** The best topic to open now, as the first instructional step towards its next boundary. */
  const openingFor = (
    floor: number | null, accept: (step: ComposableUnit, target: ComposableUnit) => boolean,
  ): { step: ComposableUnit; target: ComposableUnit } | undefined => {
    const best = (reserving: boolean) => {
      let found: { step: ComposableUnit; target: ComposableUnit; key: number[] } | undefined;
      for (const topic of topicOrder) {
        if (openBlocks.has(topic)) continue;
        const target = nextBoundary(topic);
        if (!target) continue;
        const step = stepTowards(target, floor, true, false);
        if (!step || !isInstructionalRole(roleOf.get(step.unitCode)!) || !accept(step, target)) continue;
        // A block is opened to be finished: off the spine's path, its whole path must fit beside the reservation.
        if (reserving && (spendsSpineReserve(step)
          || (!onSpinePath(step) && !pathFits(target) && pathFits(target, false)))) continue;
        const key = openingKey(topic, step, target);
        if (!found || compareArrays(key, found.key) < 0) found = { step, target, key };
      }
      return found;
    };
    // A topic that would spend the unresolved spine's capacity opens only when no topic that leaves it can.
    return best(true) ?? best(false);
  };

  /* ---- 3c. history ---------------------------------------------------- */

  /**
   * Replay what the learner has already been given, in order, as taken. See `ComposerInput.history`. Outside
   * history is already `chosen`; everything else is taken exactly as selection would take it, so budgets, floors,
   * teaching and open blocks all start from where the learner really is.
   */
  replayingHistory = true;
  for (const code of history) {
    const u = byCode.get(code);
    if (u && !chosen.has(code)) take(u, true);
  }
  replayingHistory = false;

  /**
   * Each structural requirement as it stands now, before the future is chosen. Read from the same reservation the
   * composer holds capacity by, so the report and the behaviour cannot disagree.
   */
  spineReserve();
  const structure: StructuralRequirementReport[] = spineSequence.map(topic => {
    const boundary = firstBoundary(topic);
    // Still owed teaching (the reservation holds it), or begun in history and not yet brought to its boundary.
    const begun = !!boundary && [...closureOf(boundary.unitCode)].some(c => chosen.has(c));
    const coverage: StructuralCoverage = boundary && chosen.has(boundary.unitCode) ? 'COVERED_BY_FROZEN_PLAN'
      : spineNeeds.has(topic) || (begun && attainable.has(boundary!.unitCode)) ? 'REQUIRES_FUTURE_COVERAGE'
        : 'RESOLVED_BY_EVIDENCE';
    const measured = boundary ? STATE_ORDER[stateOf.get(boundary.unitCode)!.state] : STATE_ORDER.NOT_EXPOSED;
    const sequencingRank = measured > STATE_ORDER.NOT_EXPOSED && measured < STATE_ORDER.LOCKED ? STATE_ORDER.NOT_EXPOSED : measured;
    return { strand: SPINE_STRAND, topicCode: topic, boundary: boundary?.unitCode ?? null, coverage, sequencingRank };
  });

  /**
   * THE STRUCTURE MUST FIT BEFORE THE PLAN ENDS.
   *
   * The reservation keeps capacity for the unresolved spine whenever there is a choice. But capacity can already be
   * spent before the future begins — a recomposition after a direction change hands a learner a smaller instruction
   * allocation than the one their frozen days were planned under — and a floor promise can still pull what the spine
   * was owed. Then conditions, loops or functions simply never fit, and the stitch cuts them.
   *
   * So once the days left are no more than what the unresolved requirements still need, the next step towards the
   * earliest of them is taken first, as a pull: whatever its bucket holds, on its own prerequisites and suitability.
   * It never adds a day and never moves one that is already planned; it decides what the remaining days are spent
   * on. Requirements evidence has resolved, or history has covered, are not owed anything.
   */
  /**
   * NO LATER REQUIREMENT AHEAD OF AN EARLIER ONE IT DEPENDS ON BY SEQUENCE.
   *
   * Opening a topic out of sequence is already refused while anything else can serve. But a pull taken for a floor,
   * or a step that continues a block, can still land on arrays while functions is owed and merely waiting for its
   * budget — and the deadline then brings functions in at the very end. So a unit on a later requirement's path is
   * exchanged for the next step towards an earlier requirement still owed, when there is one to take. Measurement
   * still decides: a later requirement the learner's evidence ranks strictly ahead (a weak area measured
   * FOUNDATION_REQUIRED) keeps its place, as it does when topics are opened.
   */
  const structuralRank = (topic: string): number => {
    const b = firstBoundary(topic);
    const measured = b ? STATE_ORDER[stateOf.get(b.unitCode)!.state] : STATE_ORDER.NOT_EXPOSED;
    return measured > STATE_ORDER.NOT_EXPOSED && measured < STATE_ORDER.LOCKED ? STATE_ORDER.NOT_EXPOSED : measured;
  };
  const structurallyOwed = (topic: string): ComposableUnit | undefined => {
    const b = firstBoundary(topic);
    if (!b || chosen.has(b.unitCode) || !attainable.has(b.unitCode)) return undefined;
    return spineNeeds.has(topic) || [...closureOf(b.unitCode)].some(c => chosen.has(c)) ? b : undefined;
  };
  const structuralOrder = (u: ComposableUnit): ComposableUnit => {
    const position = spineSequence.indexOf(u.topicCode);
    if (position <= 0) return u;
    const own = firstBoundary(u.topicCode);
    if (!own || chosen.has(own.unitCode) || (own.unitCode !== u.unitCode && !closureOf(own.unitCode).has(u.unitCode))) return u;
    spineReserve();
    for (const earlier of spineSequence.slice(0, position)) {
      const boundary = structurallyOwed(earlier);
      if (!boundary || structuralRank(u.topicCode) < structuralRank(earlier)) continue;
      const step = stepTowards(boundary, null, false, true);
      if (step) return step;
    }
    return u;
  };
  const structuralDue = (floor: number | null): ComposableUnit | undefined => {
    spineReserve();
    const owed = spineSequence
      .map(topic => ({ topic, boundary: structurallyOwed(topic) }))
      .filter(({ boundary }) => boundary);
    if (!owed.length) return undefined;
    const need = owed.reduce((n, o) => n + [...pathNeeds(o.boundary!).values()].reduce((a, b) => a + b, 0), 0);
    if (targetUnits - selected.length > need) return undefined;
    for (const { boundary } of owed) {
      const step = stepTowards(boundary!, floor, false, true);
      if (step) return step;
    }
    return undefined;
  };

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
  /** Pulls made on each role's behalf during the floor pass. Ordering only; see turnShortfall. */
  const pullTurns = new Map<CompositionRole, number>();

  let guard = 0;
  while (guard++ <= targetUnits * 4 && selected.length < targetUnits) {
    const floor = breadthFloor();
    const due = structuralDue(floor);
    if (due) { asPrerequisite.add(due.unitCode); take(due, true); continue; }

    const shortfall = (a: RoleAllocation) => {
      const have = roleCount.get(a.role) || 0;
      return a.min > 0 && have < a.min ? (a.min - have) / a.min : 0;
    };

    /**
     * A PULL IS A TURN.
     *
     * A pull takes a unit of SOME OTHER role — instruction, usually — on behalf of the role that
     * wanted it. Counted only by what was taken, the pulling role's own shortfall never moves, so
     * it stays furthest behind and wins every pass; and because the loop stops at the first role
     * that takes or pulls, every role after it in allocation order never gets a turn. That is how
     * an established learner spent fifteen days on direction instruction pulled for PRACTICE
     * while fourteen debugging exercises and projects were schedulable from day one.
     *
     * So ordering counts the pulls a role has made as turns it has had. `min` and `behind` are
     * untouched — a pull still does not satisfy a floor, and the role keeps its place in the
     * rotation until its own units are actually in the plan. It simply waits its turn behind a
     * role that has had fewer.
     */
    const turnShortfall = (a: RoleAllocation) =>
      (a.min - (roleCount.get(a.role) || 0) - (pullTurns.get(a.role) || 0)) / a.min;

    const behind = allocation
      .filter(a => shortfall(a) > 0)
      .sort((x, y) => turnShortfall(y) - turnShortfall(x)
        || allocation.indexOf(x) - allocation.indexOf(y));

    if (!behind.length) break;

    /**
     * PRACTICAL PROMISES BEFORE MORE SAMPLING, WHEN THEY CAN BE KEPT NOW.
     *
     * Continuing a block comes before the rotation — except a direction or exploration block whose role's floor is
     * already met, while an owed practical role has a unit this learner can take right now. Then the practical
     * promise is kept first. A learner measured past instruction is ready for debugging, projects and checkpoints from day one;
     * letting nine-lesson direction blocks run on after direction's floor was met put 29 of their 48 practical units
     * in the last month. Foundation and universal blocks are untouched, so a beginner's course reads as before.
     */
    const owedRoles = new Set(behind.map(b => b.role));
    const practicalNow = behind.some(b => !isInstructionalRole(b.role) && ranked.some(u => !chosen.has(u.unitCode)
      && roleOf.get(u.unitCode) === b.role && withinBreadthOf(u, floor) && suitableNow(u) && readyToTake(u)));
    const continued = blockContinuation(floor);
    const sampling = continued && ['DIRECTION_LEARNING', 'EXPLORATION'].includes(roleOf.get(continued.unitCode)!);
    if (continued && (!sampling || owedRoles.has(roleOf.get(continued.unitCode)!) || !practicalNow)) { take(continued, true); continue; }

    /**
     * TEACH, PRACTISE, THEN USE IT — BEFORE MOVING ON.
     *
     * A block ends at its practical boundary. If a practical role is still owed its floor and the topic just
     * taught has something of that role — its debugging exercise, its project, or the lesson that project
     * still needs — that comes next, while the topic is fresh. Without this, ties in the rotation always went
     * to opening more instruction, and every project and checkpoint slid to the last month.
     */
    if (selected.length) {
      const last = selected[selected.length - 1];
      const here = last.topicCode;
      const owedPractical = new Set(behind.map(b => b.role).filter(r => !isInstructionalRole(r)));
      let local: ComposableUnit | undefined;
      // What the topic just taught offers, and anything that was waiting on exactly the unit just taken — the
      // checkpoint a pull was teaching towards is usually in another topic.
      const candidates = [...(topicUnits.get(here) || []), ...(dependentsOf.get(last.unitCode) || [])];
      for (const u of candidates) {
        if (chosen.has(u.unitCode) || !owedPractical.has(roleOf.get(u.unitCode)!)) continue;
        if (u.topicCode !== here && !(suitableNow(u) && readyToTake(u) && withinBreadthOf(u, floor))) continue;
        const step = stepTowards(u, floor, true);
        // Only what the plan has already taught can be USED now: the unit itself must be takeable. Anything that still
        // needs a lesson first is new teaching, and the strand policy decides when that opens.
        if (step !== u || !leavesSpineRoom(u)) continue;
        if (step && (!local || rankIndex.get(step.unitCode)! < rankIndex.get(local.unitCode)!)) local = step;
      }
      if (local) {
        if (isInstructionalRole(roleOf.get(local.unitCode)!)) asPrerequisite.add(local.unitCode);
        take(local, true);
        continue;
      }
    }

    let took = false;
    for (const a of behind) {
      const servesTurn = (u: ComposableUnit) =>
        !chosen.has(u.unitCode)
        && roleOf.get(u.unitCode) === a.role
        && withinBreadthOf(u, floor)
        && suitableNow(u)
        && readyToTake(u);
      // Rank never opens a topic ahead of an unresolved earlier topic in its sequence while anything else serves.
      const byRank = ranked.find(u => servesTurn(u) && !opensOutOfOrder(u) && !spendsSpineReserve(u))
        ?? ranked.find(u => servesTurn(u) && !opensOutOfOrder(u)) ?? ranked.find(servesTurn);

      // Which unit serves this role's turn: a new topic chosen by the strand policy when it is instruction,
      // and otherwise the topic just taught when it has something of this role. Never a lower priority.
      let direct = byRank;
      if (byRank && isInstructionalRole(a.role)) {
        // The strand policy chooses across every instruction role still owed its floor, not within this one:
        // choosing per role opened a whole block of whichever topic that role ranked first, which put Git, AI
        // and career ahead of the first programming lesson for no reason but the rotation's turn order.
        // The one exception is the spine: when it is programming's turn, programming may open on any
        // instruction role's turn, so filling other floors never stalls the course's spine for a month.
        const owed = new Set(behind.map(b => b.role));
        const spineTurn = lastOpenedStrand !== null && lastOpenedStrand !== SPINE_STRAND;
        // And on the other strands' turn, a foundation strand with authored topics still to teach may open
        // while its role has allocation room, so orientation and thinking are not deferred behind every floor.
        // A role lends a turn only while it has one to lend: once its lent turns cover its floor it stops lending, so a
        // role owed a single unit (exploration, say) lends at most once and is never talked out of that unit for good.
        const spare = a.min - (roleCount.get(a.role) || 0) - (pullTurns.get(a.role) || 0) >= 1;
        const opening = openingFor(floor, step => {
          const role = roleOf.get(step.unitCode)!;
          const strand = strandOfTopic(step.topicCode);
          if (role === a.role) return true;
          if (!spare) return false;
          if (owed.has(role)) return true;
          if (spineTurn) return strand === SPINE_STRAND;
          return strand !== SPINE_STRAND && strandHasSequenceLeft(strand) && (budget.get(role) || 0) > 0;
        });
        if (opening && compareArrays(priorityFor(opening.step), priorityFor(byRank)) <= 0) {
          direct = opening.step;
          // Another role's topic opened on this role's turn: like a pull, that is a turn this role has had, or it
          // would stay furthest behind and keep lending its turn while the roles after it never got one.
          if (roleOf.get(direct.unitCode) !== a.role) pullTurns.set(a.role, (pullTurns.get(a.role) || 0) + 1);
        }
      } else if (byRank && selected.length) {
        const here = selected[selected.length - 1].topicCode;
        const local = ranked.find(u => u.topicCode === here && !chosen.has(u.unitCode)
          && roleOf.get(u.unitCode) === a.role && withinBreadthOf(u, floor) && suitableNow(u) && readyToTake(u));
        if (local && compareArrays(priorityFor(local), priorityFor(byRank)) <= 0) direct = local;
      }

      if (direct) { take(direct, true); took = true; break; }

      // A practical role with nothing takeable teaches towards a boundary of its own role, in strand order.
      const towards = openingFor(floor, (_step, target) => roleOf.get(target.unitCode) === a.role);
      if (towards) {
        asPrerequisite.add(towards.step.unitCode);
        take(towards.step, true);
        promise(towards.step, a.role);
        pullTurns.set(a.role, (pullTurns.get(a.role) || 0) + 1);
        took = true;
        break;
      }

      /**
       * Not teachable yet, so teach towards it.
       *
       * A project needs STANDARD, which the plan only reaches by teaching and then practising the
       * skill; until that happens the project is unsuitable, so nothing would ever pull in the
       * practice unit that makes it suitable. Reaching for a unit that cannot be taught YET is
       * how the promise gets kept — and only the takeable link is taken, so nothing unsuitable is
       * ever scheduled.
       */
      const aspires = (u: ComposableUnit) =>
        !chosen.has(u.unitCode)
        && roleOf.get(u.unitCode) === a.role
        && !isKnownLesson(u)            // never teach towards a lesson this learner already knows
        && withinBreadthOf(u, floor)
        && !!pullTargetFor(u, floor);
      // The same rule as the fill: when the unit rank would teach towards cannot be reached before the plan ends, reach
      // for the best-ranked one that can. A promise chased past day ninety keeps no promise at all.
      const rankAspirant = ranked.find(aspires);
      /**
       * A floor is owed ONE unit, so the pull reaches first for a promise whose next step fits the capacity left once
       * the unresolved programming spine's share is held, and does not open a topic out of its sequence. A beginner's
       * verification floor otherwise paid for its checkpoint with the four foundation lessons functions needed.
       */
      const pullFits = (u: ComposableUnit) => {
        const step = pullTargetFor(u, floor)!;
        if (!isInstructionalRole(roleOf.get(step.unitCode)!)) return true;
        const boundary = nextBoundary(step.topicCode);
        return !opensOutOfOrder(step) && (!boundary || pathFits(boundary));
      };
      spineReserve();
      const aspirant = (spineNeeds.size ? ranked.find(u => aspires(u) && finishable(u) && pullFits(u)) : undefined)
        ?? (rankAspirant && !finishable(rankAspirant)
          ? ranked.find(u => aspires(u) && finishable(u)) ?? rankAspirant
          : rankAspirant);

      const pulled = aspirant && pullTargetFor(aspirant, floor);
      if (pulled) {
        asPrerequisite.add(pulled.unitCode);
        take(pulled, true);
        promise(pulled, a.role);
        pullTurns.set(a.role, (pullTurns.get(a.role) || 0) + 1);
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
    const due = structuralDue(floor);
    if (due) { asPrerequisite.add(due.unitCode); take(due, true); continue; }
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
    const here = selected.length ? selected[selected.length - 1].topicCode : null;

    const continued = blockContinuation(floor);
    const followUp = continued ? undefined
      : (here && ranked.find(u => u.topicCode === here && !isInstructionalRole(roleOf.get(u.unitCode)!) && takeable(u)
        && leavesSpineRoom(u)))
        || ranked.find(u =>
          openTopics.has(u.topicCode)
          && !isInstructionalRole(roleOf.get(u.unitCode)!)
          && takeable(u)
          && leavesSpineRoom(u));

    let next = continued ?? followUp
      ?? ranked.find(u => takeable(u) && !opensOutOfOrder(u) && !spendsSpineReserve(u))
      ?? ranked.find(u => takeable(u) && !opensOutOfOrder(u)) ?? ranked.find(takeable);
    if (next && !continued && !followUp) {
      const opening = openingFor(floor, () => true);
      if (opening && compareArrays(priorityFor(opening.step), priorityFor(next)) <= 0) next = opening.step;
    }

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
    /**
     * Teach towards something the plan can still reach. A pull chain that the ninety days end in the middle of is a
     * lesson fragment — a strong learner's last nine days went to a CSS chain ten units long while an equally valid
     * seven-unit one sat unselected. Only when the unit rank would reach for cannot be finished is another chosen:
     * the best-ranked finishable one, and when nothing is finishable the choice is exactly what it was.
     */
    const rankWanted = ranked.find(u => affordable(u) && suitableNow(u));
    const wanted = rankWanted && !finishable(rankWanted)
      ? ranked.find(u => affordable(u) && suitableNow(u) && finishable(u)) ?? rankWanted
      : rankWanted;
    let pulled = (rankWanted && !finishable(rankWanted)
      ? resumeByPull(floor, target => (budget.get(roleOf.get(target.unitCode)!) || 0) > 0)
      : undefined) ?? (wanted && pullTargetFor(wanted, floor));

    if (!pulled) {
      // A known lesson is "not suitable now" only because it is suppressed; it is not something to
      // teach towards, so it is excluded here explicitly rather than mistaken for a future unit.
      const aspirant = ranked.find(u => affordable(u) && !isKnownLesson(u) && !suitableNow(u) && pullTargetFor(u, floor));
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
      const mastery = chosen.has(code) ? null : masteredBy(code, u);
      const evidence = chosen.has(code) || mastery ? null : outgrownBy(code);
      const standard = chosen.has(code) || mastery || evidence ? null : standardEvidenceFor(code, u);
      const resolution: PrerequisiteResolution = chosen.has(code) ? 'SATISFIED_BY_PLAN'
        : mastery ? 'SATISFIED_BY_MASTERY'
          : evidence ? 'SATISFIED_BY_EVIDENCE'
            : standard ? 'SATISFIED_BY_STANDARD_EVIDENCE'
              : 'BLOCKED_MISSING_PREREQUISITE';
      const via = mastery || evidence || standard;
      prerequisites.push({
        unitCode: u.unitCode,
        prerequisite: code,
        resolution,
        ...(via ? { viaSkill: via.skill, score: via.score } : {}),
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
  // Suitability as policy defines it — a known lesson is still suitable, only not selected — so this
  // count, and the exclusions reported from it, mean exactly what they meant before that rule existed.
  const suitableByPolicy = (u: ComposableUnit): boolean => isSuitableFor(u, readinessOf(u).equivalentState);
  const everSuitable = new Set<string>(
    relevant.filter(u => chosen.has(u.unitCode) || suitableByPolicy(u)).map(u => u.unitCode),
  );

  /**
   * Units the direction filter kept but the student's state never had a use for.
   *
   * Judged at the END of the walk, against everything the plan taught. A unit reported here was
   * unsuitable even after three months of instruction, which is a real statement; reporting it
   * from the day-one state would have called a beginner's entire practice inventory unusable.
   */
  for (const u of relevant) {
    // A suppressed known lesson is suitable by policy, so it never reaches here: it is reported under
    // `knownInstruction` instead. A lesson a VERIFIED learner has outgrown is unsuitable and is still
    // reported here as MASTERY_VERIFIED, exactly as before.
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
    const unavailable = u.prerequisiteUnitCodes.filter(c => !byCode.has(c) && !masteredBy(c, u) && !outgrownBy(c)
      && !standardEvidenceFor(c, u));
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
    // Only lessons the rule actually held back: suitable by policy, not chosen. One a REVISION or
    // VERIFIED learner has outgrown was never going to be scheduled and keeps its existing report.
    knownInstruction: [...knownLessons.entries()]
      .filter(([code]) => !chosen.has(code) && suitableByPolicy(byCode.get(code)!))
      .map(([unitCode, via]) => ({ unitCode, viaSkill: via.skill, score: via.score, state: via.state }))
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
    structure,
    topicBlocks: blocks.map(b => {
      const last = b.stops[b.stops.length - 1];
      const outcome: BlockOutcome = b.reachedAt !== null ? 'BOUNDARY_REACHED'
        : !last || last.resumedAt !== null ? 'ACTIVE_AT_END'
          : last.reason === 'NOT_READY' ? 'ABANDONED' : 'PAUSED_AT_END';
      return { ...b, outcome };
    }),
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
