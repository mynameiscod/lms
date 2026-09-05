import { WorkType } from './roadmapPolicy';

/**
 * CONCEPT_LEARNING_V1 — how a concept's ordered learning journey is defined and read.
 *
 * WHAT THIS MODULE IS FOR. Module 9 decides a student needs JAVA_OOP and how many minutes it
 * deserves; Module 10 decides which slice of that is today's. Neither answers the question a
 * student actually asks when a mission opens: what should I do FIRST, and what comes after it.
 * Until now the answer was "the lowest-priority resource mapped to this skill", every day,
 * forever — the orchestrator resolved one resource per skill+workType slot and had no memory
 * of what the student had already done, so a five-part journey was a single video on repeat.
 *
 * WHAT IT IS NOT. It does not decide whether a student needs a skill — that is the roadmap's
 * job and stays there. A learning unit is inert until a roadmap objective asks for its skill.
 *
 * NO AI, NO RANDOMNESS. Sequence is authored by an admin and read in order. The same student
 * on the same day gets the same step, which is what makes a refresh safe and a journey
 * something a person can be told about in advance.
 */

export const CONCEPT_LEARNING_VERSION = 'CONCEPT_LEARNING_V1';

/**
 * The curriculum vocabulary, which is deliberately richer than the roadmap's four verbs.
 *
 * An author needs to distinguish "watch this to get the idea" from "read the detail" from
 * "try it with me" — the roadmap does not, because it only budgets minutes. Keeping the two
 * vocabularies separate is what lets the journey read like a lesson plan without adding
 * planner concepts that Module 9 would then have to understand.
 */
export type LearningPhase =
  | 'UNDERSTAND'   // first contact — why this matters, what it is
  | 'LEARN'        // the substance
  | 'TRY'          // guided, with the answer visible
  | 'PRACTICE'     // unguided, on their own
  | 'CHECK'        // measured
  | 'APPLY'        // a larger piece of work using several ideas at once
  | 'REVIEW';      // consolidation, later

export const LEARNING_PHASES: LearningPhase[] = [
  'UNDERSTAND', 'LEARN', 'TRY', 'PRACTICE', 'CHECK', 'APPLY', 'REVIEW',
];

/**
 * Phase to roadmap work type. THE ONLY PLACE THIS MAPPING EXISTS.
 *
 * The roadmap enum is not extended to fit the curriculum vocabulary. Adding UNDERSTAND or
 * APPLY to WorkType would reach the planner, the policy shares, the mission labels, the
 * gamification rules and four sets of tests, to express something none of them need — they
 * budget minutes against a kind of work, and "watch an intro" and "read the notes" are the
 * same kind of work to a budget.
 *
 * So the journey speaks seven phases, the plan speaks four verbs, and this is the join.
 */
export const PHASE_WORK_TYPE: Record<LearningPhase, WorkType> = {
  UNDERSTAND: 'LEARN',
  LEARN:      'LEARN',
  TRY:        'PRACTICE',
  PRACTICE:   'PRACTICE',
  CHECK:      'ASSESS',
  APPLY:      'PRACTICE',
  REVIEW:     'REVIEW',
};

export const workTypeForPhase = (phase: string): WorkType =>
  PHASE_WORK_TYPE[phase as LearningPhase] || 'LEARN';

/** Every phase that satisfies a given roadmap objective, for resolver lookups. */
export const phasesForWorkType = (workType: string): LearningPhase[] =>
  LEARNING_PHASES.filter(p => PHASE_WORK_TYPE[p] === String(workType).toUpperCase());

/**
 * Publish lifecycle. Only PUBLISHED reaches a student.
 *
 * The point of the gate is that a journey is not useful half-written: a student served steps
 * 1 and 2 of a unit whose step 3 does not exist yet has been taught an introduction and then
 * abandoned, which is worse than never having started.
 */
export type LearningUnitStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export const LEARNING_UNIT_STATUSES: LearningUnitStatus[] = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'];

/**
 * What a unit must have before it may be published.
 *
 * REQUIRED checks block. ADVISORY checks are reported and do not, because concepts differ:
 * a video is the right way to open Polymorphism and the wrong way to teach SQL_JOINS, and a
 * gate that demanded one globally would push authors into making a video they did not need.
 *
 * Both lists are data rather than code so the policy can tighten without touching the
 * validator, and so an admin screen can render the same list the server enforces.
 */
export const PUBLISH_REQUIREMENTS = [
  { key: 'title',        label: 'Title',                       hint: 'The unit needs a name a student would recognise.' },
  { key: 'outcomes',     label: 'Learning outcomes',           hint: 'At least one — what the student can do afterwards.' },
  { key: 'skill',        label: 'Concept exists and is active', hint: 'The skillKey must resolve to a live skill.' },
  { key: 'steps',        label: 'At least one step',           hint: 'A journey with no steps teaches nothing.' },
  { key: 'learn_step',   label: 'At least one LEARN step',     hint: 'Something that explains the concept.' },
  { key: 'practice_step', label: 'At least one PRACTICE step', hint: 'Something the student does themselves.' },
  { key: 'sequence',     label: 'Sequence is valid',           hint: 'No duplicate or missing positions.' },
  { key: 'resources',    label: 'Referenced resources exist',  hint: 'Every step points at a resource that is present and active.' },
  { key: 'durations',    label: 'Required steps have a duration', hint: 'Minutes are how the plan budgets a step.' },
] as const;

export const PUBLISH_ADVISORIES = [
  { key: 'check_step',  label: 'A skill check',      hint: 'Without one, nothing this unit teaches becomes evidence.' },
  { key: 'review_step', label: 'Review material',    hint: 'Something to come back to later.' },
  { key: 'apply_step',  label: 'An applied piece',   hint: 'A project or larger exercise.' },
  { key: 'video',       label: 'A video',            hint: 'Optional — some concepts are better taught in writing.' },
] as const;

/**
 * Readiness, as a percentage of every check.
 *
 * Advisories count. A unit that clears the bar and nothing else reads 100% otherwise, which
 * would tell an author their sparse unit is finished — and the number exists precisely to say
 * how much better it could be.
 */
export const readinessPercent = (passedRequired: number, passedAdvisory: number): number =>
  Math.round(((passedRequired + passedAdvisory) /
    (PUBLISH_REQUIREMENTS.length + PUBLISH_ADVISORIES.length)) * 100);

/** What an admin list shows per concept. Richer than the old boolean "missing LEARN". */
export type ConceptReadinessStatus = 'NOT_CONFIGURED' | 'INCOMPLETE' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

/**
 * Why the resolver could not produce a step, so production can be asked how much content is
 * actually missing rather than inferred from complaints.
 */
export type LearningFallbackReason =
  | 'DISABLED'              // the tenant has not switched the layer on
  | 'NO_PUBLISHED_UNIT'     // nothing authored for this skill yet
  | 'NO_ELIGIBLE_STEP'      // a unit exists but nothing in it fits this objective today
  | 'UNIT_COMPLETE'         // every step that applies is done
  | 'RESOURCE_INACTIVE'     // the step's resource was retired underneath it
  | 'TARGETING_MISMATCH';   // audience or score window excludes this member

/**
 * How many steps of one unit may appear in a single day.
 *
 * One. The daily list is three missions across the whole plan, and a unit that filled all
 * three would turn a balanced day into a single subject — the roadmap deliberately spreads
 * work across two to four skills a week, and this must not undo that from below.
 */
export const MAX_STEPS_PER_UNIT_PER_DAY = 1;
