/**
 * Which Learning Units suit a student in which skill state.
 *
 * ── WHY THIS EXISTS: WHAT THE AUDIT FOUND ─────────────────────────────────────────────────
 *
 * Across all 310 authored units, exactly one field varies between siblings of a topic:
 *
 *   defaultDepth          identical within a topic (inherited)
 *   category              identical within a topic (inherited)
 *   mandatory             identical within a topic (inherited)
 *   skillKeys             identical within a topic (inherited)
 *   applicableDirections  identical within a topic (inherited)
 *   unitType              VARIES — CONCEPT / PRACTICE / DEBUG / PROJECT
 *
 * `unitType` separates a debugging exercise from a project. It cannot separate one CONCEPT unit
 * from another, and that is the distinction the product decision turns on: "Why Repetition Needs
 * a Structure" and "Loops Inside Loops" are both CONCEPT / FOUNDATION / UNIVERSAL, and one suits
 * somebody who has never seen a loop while the other does not.
 *
 * So existing metadata is INSUFFICIENT, and the smallest honest fix is one optional field saying
 * which states a unit serves.
 *
 * ── OPTIONAL, WITH A DERIVATION, SO NOTHING IS MIGRATED ───────────────────────────────────
 *
 * `suitableStates` is absent on all 310 existing units and stays absent. When it is missing the
 * suitability is DERIVED from unitType, which is already correct for the coarse decision — a
 * verified student should skip instruction and keep debugging, practice and projects. An author
 * sets the field only where the derivation is too blunt, which is CONCEPT versus CONCEPT.
 *
 * A required field would have meant a 310-row migration writing a guess into every unit, and a
 * guess written down is indistinguishable from a decision.
 *
 * ── IT REUSES AssignmentState RATHER THAN INVENTING A SCALE ───────────────────────────────
 *
 * The states are the ones Skill DNA already produces. A second vocabulary would mean two answers
 * to "what does this student need", and the existing one is what every other adaptive path reads.
 */

import { AssignmentState, stateForScore, isConfidentEnough } from './adaptiveCurriculumPolicy';
import { LearningUnitType } from '../models/CurriculumLearningUnit';

/**
 * What each kind of unit is for, expressed as the states it serves.
 *
 * The shape of the table IS the product decision. Read down the CONCEPT row: instruction serves
 * somebody who has not met the idea or cannot yet do it, and stops serving somebody who has
 * demonstrated it. Read down PROJECT: application serves the competent and the strong, and is
 * wasted on somebody who has not been taught the thing yet.
 */
export const SUITABILITY_BY_TYPE: Record<LearningUnitType, AssignmentState[]> = {
  /** Teaching. For those who have not met it, or cannot yet do it. */
  CONCEPT: ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD'],

  /** Seeing it done. Useful once somebody has met the idea and before they are fluent. */
  WORKED_EXAMPLE: ['FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD'],

  /** Doing it. Pointless before exposure; valuable right through to keeping a skill sharp. */
  PRACTICE: ['GUIDED', 'STANDARD', 'REVISION'],

  /**
   * Diagnosing broken work. Valuable as soon as somebody has met the idea, and still valuable
   * when they are fluent — reading somebody else's fault is a different skill from writing.
   *
   * ── WHY GUIDED IS IN THIS LIST ──────────────────────────────────────────────────────────
   *
   * It began at STANDARD, on the reasoning that you must know what correct looks like before you
   * can find a fault. That is true of expert diagnosis and false of how these units are actually
   * written. Every one of the eighteen is authored as consolidation immediately after
   * instruction — "finding the cause rather than guessing", "diagnose a broken example without
   * changing it at random" — and the pseudocode one is taught before the student has written any
   * code at all. Those are beginner behaviours being corrected, not expert skills being extended.
   *
   * The curriculum said so structurally too: all fifteen affected topics place DEBUGGING BEFORE
   * PRACTICE, and fifteen PRACTICE units name a DEBUG unit as their prerequisite. With DEBUG
   * starting at STANDARD that is a deadlock, and a silent one — DEBUG needed a state only
   * practice could produce, and practice could not be scheduled until DEBUG had been. Neither was
   * ever schedulable, which is part of why no PRACTICE unit was selected for any of the nine
   * audit profiles.
   *
   * Widened, never narrowed: it still serves STANDARD, REVISION and VERIFIED, so the rule that a
   * strong learner gets application instead of re-instruction is untouched.
   */
  DEBUG: ['GUIDED', 'STANDARD', 'REVISION', 'VERIFIED'],

  /** Building something. The application a strong student should get INSTEAD of re-instruction. */
  PROJECT: ['STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'],

  /** Measuring. Suits anybody, because measuring is how a state is established in the first place. */
  CHECKPOINT: ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'],

  /** Revisiting. For somebody who has met it and needs it back, not for somebody meeting it. */
  REVIEW: ['REVISION', 'VERIFIED'],
};

export interface SuitableUnit {
  unitType: LearningUnitType;
  /** Set by an author only where the type-derived default is too blunt. */
  suitableStates?: AssignmentState[];
}

/** The states this unit serves: authored where stated, derived from its type otherwise. */
export const suitableStatesFor = (unit: SuitableUnit): AssignmentState[] =>
  (unit.suitableStates && unit.suitableStates.length)
    ? unit.suitableStates
    : (SUITABILITY_BY_TYPE[unit.unitType] || SUITABILITY_BY_TYPE.CONCEPT);

export const isSuitableFor = (unit: SuitableUnit, state: AssignmentState): boolean =>
  suitableStatesFor(unit).includes(state);

/**
 * THE RULE THE PRODUCT DECISION RESTS ON.
 *
 * A VERIFIED student does not get every foundation unit again at a lower depth. Instruction
 * stops being suitable; debugging, projects and checkpoints keep serving them, and the capacity
 * that would have gone on re-teaching is spent on application instead.
 *
 * VERIFIED still is not REMOVED. The skill keeps units in the plan, they are still labelled
 * MASTERY_VERIFIED, and a student can still see that it was covered — what changes is that the
 * units are the ones worth their time.
 */
export const isInstructional = (unit: SuitableUnit): boolean =>
  unit.unitType === 'CONCEPT' || unit.unitType === 'WORKED_EXAMPLE';

/* ------------------------------------------------------------------ *
 * Prerequisites
 * ------------------------------------------------------------------ */

/**
 * How a unit's prerequisite was satisfied, or why it was not.
 *
 * The prototype treated a prerequisite that was not in the candidate pool as satisfied, which is
 * wrong in one specific and dangerous case: the unit is genuinely needed, nobody has authored
 * it, and the student has not demonstrated the capability another way. Scheduling the dependent
 * unit then teaches somebody something they are not ready for, and nothing reports it.
 */
export type PrerequisiteResolution =
  /** The prerequisite unit is in the plan, ordered before this one. */
  | 'SATISFIED_BY_PLAN'
  /** Not in the plan, but the student's Skill DNA verifies the capability it teaches. */
  | 'SATISFIED_BY_MASTERY'
  /**
   * Not in the plan and not mastered, but MEASURED past everything the unit teaches.
   *
   * Every skill of the prerequisite unit has a measured state, and the weakest is an evidence-only
   * state above the highest state that unit serves — a REVISION learner in front of a concept
   * unit, typically. The unit has nothing left to give them, so scheduling it would be re-teaching
   * and refusing its dependants would strand them. Deliberately not SATISFIED_BY_MASTERY: REVISION
   * is demonstrated, not verified, and the two must stay distinguishable in every report.
   */
  | 'SATISFIED_BY_EVIDENCE'
  /**
   * Not in the plan, but a SAME-TOPIC LESSON whose every skill is reliably measured STANDARD or above.
   *
   * Narrower and weaker than both resolutions above, and named apart so no report can mistake it for
   * either. STANDARD is "can do it with ordinary support" — not demonstrated past the lesson, and never
   * mastery. What it does establish is that the learner does not need that lesson to START practising
   * the topic, so a practice or debugging unit behind it is not refused. Only a lesson, only inside its
   * own topic, and only on confident evidence: a practical prerequisite, a cross-topic one, or a thinly
   * evidenced score never resolves this way. See `standardEvidenceSatisfies`.
   */
  | 'SATISFIED_BY_STANDARD_EVIDENCE'
  /** Not available and not verified. A production composition must never schedule under this. */
  | 'BLOCKED_MISSING_PREREQUISITE';

export interface PrerequisiteOutcome {
  unitCode: string;
  prerequisite: string;
  resolution: PrerequisiteResolution;
  /** The skill that carried a mastery resolution, for auditing it. */
  viaSkill?: string;
  score?: number | null;
}

/**
 * Whether a blocked prerequisite is an authoring problem or a student one.
 *
 * The two need different actions and different audiences: an author writes the missing unit; a
 * student is told what to finish first. Collapsing them into one "unmet" list is what made the
 * prototype's report unusable for either.
 */
export const isAuthoringGap = (o: PrerequisiteOutcome): boolean =>
  o.resolution === 'BLOCKED_MISSING_PREREQUISITE';

/* ------------------------------------------------------------------ *
 * Reliable STANDARD evidence — shared by the composer and certification
 * ------------------------------------------------------------------ */

/** A measured belief as both the composer and the certifier hold it. */
export interface MeasuredBelief {
  score: number | null | undefined;
  confidence: any;
  understandingOnly?: boolean;
}

const EVIDENCE_LADDER: AssignmentState[] =
  ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];
const STANDARD_OR_ABOVE: AssignmentState[] = ['STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];

/**
 * Every skill measured, every one STANDARD or above, every one confident enough — or null.
 *
 * Returns the WEAKEST such skill, because that is the one a report should name. One unmeasured skill,
 * one below STANDARD, or one resting on thin evidence refuses outright: absence is not knowledge, and
 * `stateForScore` caps a low-confidence score AT STANDARD — which is exactly why confidence is checked
 * here in its own right rather than read back out of the state.
 *
 * Reads Skill DNA and writes nothing. It projects no state and grants no mastery.
 */
export function reliableStandardEvidence(
  skillKeys: string[],
  skills: Map<string, MeasuredBelief>,
): { skill: string; score: number; state: AssignmentState } | null {
  if (!skillKeys.length) return null;
  let weakest: { skill: string; score: number; state: AssignmentState } | null = null;
  for (const key of skillKeys) {
    const belief = skills.get(key);
    if (!belief || belief.score === null || belief.score === undefined) return null;
    if (!isConfidentEnough(belief.confidence)) return null;
    const state = stateForScore({ score: belief.score, confidence: belief.confidence, understandingOnly: belief.understandingOnly });
    if (!STANDARD_OR_ABOVE.includes(state)) return null;
    if (!weakest || EVIDENCE_LADDER.indexOf(state) < EVIDENCE_LADDER.indexOf(weakest.state)) {
      weakest = { skill: key, score: belief.score, state };
    }
  }
  return weakest;
}

/** Just enough of a unit to judge evidence against it. Structural, so any unit shape fits. */
export interface EvidenceBearingUnit extends SuitableUnit {
  topicCode: string;
  skillKeys: string[];
  defaultDepth?: string;
}

/**
 * Does reliable STANDARD evidence satisfy this prerequisite for this dependent unit?
 *
 * All of: the prerequisite is a LESSON (CONCEPT or WORKED_EXAMPLE); it sits in the SAME topic as the
 * unit that needs it; it teaches at least one skill; and every one of those skills carries reliable
 * STANDARD+ evidence. A practice, debugging or project prerequisite is never satisfied this way —
 * compression removes lessons a learner does not need, never the work that makes learning stick — and
 * neither is a lesson in another topic, which may teach something this topic's evidence says nothing
 * about.
 */
export function standardEvidenceSatisfies(
  prerequisite: EvidenceBearingUnit | undefined,
  dependent: { topicCode: string },
  skills: Map<string, MeasuredBelief>,
): { skill: string; score: number; state: AssignmentState } | null {
  if (!prerequisite || !isInstructional(prerequisite)) return null;
  if (prerequisite.topicCode !== dependent.topicCode) return null;
  return reliableStandardEvidence(prerequisite.skillKeys, skills);
}

/**
 * The state a lesson's authored depth teaches to, when nobody authored its suitability.
 *
 * FOUNDATION depth is a first exposure: it teaches as far as a learner with a measured gap needs.
 * GUIDED is the second pass, STANDARD the ordinary working level. An unknown depth answers nothing,
 * and nothing is suppressed on a guess.
 */
const DEPTH_TEACHES_TO: Record<string, AssignmentState> = {
  FOUNDATION: 'FOUNDATION_REQUIRED',
  GUIDED: 'GUIDED',
  STANDARD: 'STANDARD',
  REVISION: 'REVISION',
  CHALLENGE: 'VERIFIED',
};

/**
 * A lesson that would only re-teach what this learner reliably knows, at or below the level they are at.
 *
 * ── THE DEFECT ────────────────────────────────────────────────────────────────────────────
 *
 * CONCEPT is suitable through STANDARD, and a learner measured STANDARD everywhere still lands in the
 * beginner-type allocation. So the composer spent that allocation's foundation and guided instruction
 * budgets on first-exposure lessons for skills the learner had already shown — 33 such days for a
 * universal STANDARD learner — while practice, debugging and direction work waited.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────────────────────
 *
 * Suppressed only when ALL of:
 *   1. it is a lesson (CONCEPT or WORKED_EXAMPLE);
 *   2. nobody authored its suitability — an author who wrote `suitableStates` decided who it serves,
 *      and that decision stands;
 *   3. every skill it teaches carries reliable STANDARD+ evidence (`reliableStandardEvidence`);
 *   4. the learner's weakest such skill is AT OR ABOVE the level the lesson's depth teaches to.
 *
 * Rule 4 is what keeps genuinely deeper instruction: a lesson whose depth teaches beyond what the
 * learner has shown — REVISION or CHALLENGE depth in front of a STANDARD learner — is kept. A lesson
 * at their level or below it (FOUNDATION, GUIDED or STANDARD depth for a reliable STANDARD learner)
 * only re-teaches what their evidence already establishes, and is not routinely scheduled. Lessons on
 * any skill they have NOT reliably shown are untouched. For REVISION and VERIFIED learners lessons are
 * already unsuitable, so this changes nothing for them — except where suitability was authored, which
 * rule 2 leaves alone.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────────────────────
 *
 * Not suitability: `SUITABILITY_BY_TYPE` and `suitableStates` are untouched and the unit stays suitable
 * by policy. Not a state, not evidence, not mastery, not a learner classification. It is a selection
 * rule the composer applies to its own candidates — and the certifier applies the same one.
 */
export function knownInstruction(
  unit: EvidenceBearingUnit,
  skills: Map<string, MeasuredBelief>,
): { skill: string; score: number; state: AssignmentState } | null {
  if (!isInstructional(unit)) return null;
  if (unit.suitableStates && unit.suitableStates.length) return null;
  const teachesTo = unit.defaultDepth ? DEPTH_TEACHES_TO[unit.defaultDepth] : undefined;
  if (!teachesTo) return null;
  const evidence = reliableStandardEvidence(unit.skillKeys, skills);
  if (!evidence) return null;
  return EVIDENCE_LADDER.indexOf(evidence.state) >= EVIDENCE_LADDER.indexOf(teachesTo) ? evidence : null;
}
