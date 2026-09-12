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
  isSuitableFor, isInstructional, suitableStatesFor,
  PrerequisiteOutcome, PrerequisiteResolution,
} from '../data/unitSuitabilityPolicy';
import { LearningUnitType, LearningUnitCategory } from '../models/CurriculumLearningUnit';

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

export interface ComposerInput {
  candidates: ComposableUnit[];
  /** How many units to select. P7B will fix this at FOUNDATION_PROGRAM_DAYS; here it is free. */
  targetUnits: number;
  student: StudentProfile;
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
  /** The skill state that produced the reason, for auditing the decision. */
  state: AssignmentState;
  /** The skill the reason is about, where one governs. */
  governingSkill: string | null;
  score: number | null;
  moduleCode: string;
  topicCode: string;
  unitType: LearningUnitType;
  estimatedMinutes: number;
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
   */
  blocked: { unitCode: string; missing: string[] }[];

  /** Kept for callers written against the prototype. Derived from `blocked`. */
  unmetPrerequisites: { unitCode: string; missing: string[] }[];
  totalMinutes: number;
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
    if (unit.category === 'DIRECTION' && student.primaryDirection) return 'STUDENT_DIRECTION';
    if (unit.mandatory || unit.category === 'UNIVERSAL') return 'STANDARD_FOUNDATION';
    return 'NOT_YET_EXPOSED';
  }
  if (unit.category === 'DIRECTION' && student.primaryDirection) return 'STUDENT_DIRECTION';
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

  const excluded: ComposerResult['excluded'] = [];
  const relevant: ComposableUnit[] = [];

  for (const unit of candidates) {
    const scoped = (unit.applicableDirections || []).length > 0;
    if (!scoped || unit.mandatory) { relevant.push(unit); continue; }

    const serves = appliesToDirection(unit.applicableDirections, student.primaryDirection)
      || unit.applicableDirections.some(d => exploring.has(String(d).toUpperCase()));

    if (serves) relevant.push(unit);
    else excluded.push({ unitCode: unit.unitCode, reason: 'OUTSIDE_DIRECTION' });
  }

  /* ---- 1b. suitability --------------------------------------------- */

  /**
   * A unit the student's state has no use for is dropped, and instruction is where that bites.
   *
   * THE PRODUCT DECISION. A VERIFIED learner does not get every foundation unit again at a lower
   * depth: the CONCEPT units stop being suitable, and the capacity goes on debugging, projects
   * and checkpoints instead. Re-teaching somebody what they have demonstrated is the most
   * expensive way to waste a day of a ninety-day programme.
   *
   * VERIFIED IS STILL NOT REMOVED. The skill keeps units in the plan, they are still labelled
   * MASTERY_VERIFIED, and a student can still see the area was covered. What changes is that the
   * units are the ones worth their time.
   */
  const stateOf = new Map<string, ReturnType<typeof governingState>>();
  for (const u of relevant) stateOf.set(u.unitCode, governingState(u, student.skills));

  const eligible: ComposableUnit[] = [];
  for (const unit of relevant) {
    const { state } = stateOf.get(unit.unitCode)!;
    if (isSuitableFor(unit, state)) { eligible.push(unit); continue; }

    excluded.push({
      unitCode: unit.unitCode,
      // Suitability failure on instruction is exactly "you have shown this already".
      reason: state === 'VERIFIED' && isInstructional(unit) ? 'MASTERY_VERIFIED' : 'OUTSIDE_DIRECTION',
    });
  }

  /* ---- 2. rank ------------------------------------------------------ */

  /**
   * Every candidate by code, INCLUDING the ones filtered out.
   *
   * A prerequisite dropped for suitability is still a real unit whose skills can answer "has
   * this student already shown it". Looking only at the eligible set would report a mastered
   * prerequisite as an authoring gap.
   */
  const allByCode = new Map(candidates.map(u => [u.unitCode, u]));

  const byCode = new Map(eligible.map(u => [u.unitCode, u]));

  /**
   * The total order. Every tie is broken, so two runs cannot disagree.
   *
   * The last term is the unit code, which is unique by construction — without a terminal
   * tie-break, two units identical on every other axis would order by whatever the array
   * happened to contain, and the plan would change between runs for no reason a student could see.
   */
  const ranked = [...eligible].sort((a, b) => {
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

  /* ---- 3. select, respecting prerequisites -------------------------- */

  /**
   * A unit is only taken once everything it builds on has been taken.
   *
   * Walked repeatedly rather than topologically sorted up front, because the ranking decides
   * WHICH units are wanted and the prerequisites only decide WHEN. Sorting first would let a
   * low-priority prerequisite drag its whole chain into a plan that did not want it.
   *
   * A prerequisite outside the candidate pool does not block. The pool is filtered by readiness,
   * so a missing prerequisite usually means nobody has authored it yet — refusing to schedule
   * would turn an authoring gap into an empty plan. It is reported instead.
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
  const resolveOne = (u: ComposableUnit, code: string): PrerequisiteResolution => {
    if (byCode.has(code)) return chosen.has(code) ? 'SATISFIED_BY_PLAN' : 'BLOCKED_MISSING_PREREQUISITE';
    return masteredBy(code, u) ? 'SATISFIED_BY_MASTERY' : 'BLOCKED_MISSING_PREREQUISITE';
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

  while (selected.length < targetUnits) {
    const next = ranked.find(u => !chosen.has(u.unitCode) && readyToTake(u));

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
        && ranked.indexOf(higher) < ranked.indexOf(next)
        && closureOf(higher.unitCode).has(next.unitCode));

      if (pulledForward) asPrerequisite.add(next.unitCode);

      selected.push(next);
      chosen.add(next.unitCode);
      continue;
    }

    /**
     * Nothing is takeable, so pull in the missing prerequisite of the best blocked unit.
     *
     * This is what makes a prerequisite appear in a plan it would not otherwise have earned: it
     * is there because something the student DOES need depends on it, and it is labelled
     * PREREQUISITE rather than pretending it was chosen on its own merits.
     */
    const blocked = ranked.find(u => !chosen.has(u.unitCode));
    if (!blocked) break;

    const pulled = blocked.prerequisiteUnitCodes
      .filter(c => byCode.has(c) && !chosen.has(c))
      .map(c => byCode.get(c)!)
      .sort((a, b) => a.displayOrder - b.displayOrder)[0];

    if (!pulled) break;   // cycle, or nothing left that can be satisfied

    asPrerequisite.add(pulled.unitCode);
    selected.push(pulled);
    chosen.add(pulled.unitCode);
  }

  /* ---- 4. shape the result ------------------------------------------ */

  const units: SelectedUnit[] = selected.map((u, i) => {
    const s = stateOf.get(u.unitCode)!;
    return {
      unitCode: u.unitCode,
      title: u.title,
      position: i + 1,
      reason: reasonFor(u, s.state, asPrerequisite.has(u.unitCode), student),
      state: s.state,
      governingSkill: s.skill,
      score: s.score,
      moduleCode: u.moduleCode,
      topicCode: u.topicCode,
      unitType: u.unitType,
      estimatedMinutes: u.estimatedMinutes,
    };
  });

  /** Every prerequisite of every selected unit, resolved against the finished plan. */
  for (const u of selected) {
    for (const code of u.prerequisiteUnitCodes) {
      const resolution = byCode.has(code) && chosen.has(code)
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
   * Units left out because something they build on is unavailable and unproven.
   *
   * Named rather than silently dropped: this is an authoring gap with a student-visible
   * consequence, and it is the number that tells an author which missing unit is costing the
   * most plan.
   */
  const blockedMap = new Map<string, string[]>();
  for (const u of eligible) {
    if (chosen.has(u.unitCode)) continue;
    const missing = u.prerequisiteUnitCodes
      .filter(c => resolveOne(u, c) === 'BLOCKED_MISSING_PREREQUISITE');
    if (missing.length) blockedMap.set(u.unitCode, missing);
  }
  const blocked = [...blockedMap.entries()].map(([unitCode, missing]) => ({ unitCode, missing }));
  const unmetPrerequisites = blocked;

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
      eligibleUnits: eligible.length,
      units,
      excluded,
      prerequisites,
      blocked,
      unmetPrerequisites,
      totalMinutes: units.reduce((n, u) => n + u.estimatedMinutes, 0),
    };
  }

  return {
    ok: true,
    requestedDays: targetUnits,
    eligibleUnits: eligible.length,
    units,
    excluded,
    prerequisites,
    blocked,
    unmetPrerequisites,
    totalMinutes: units.reduce((n, u) => n + u.estimatedMinutes, 0),
  };
}
