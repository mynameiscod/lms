/**
 * How a measured skill becomes a teaching decision.
 *
 * ONE PLACE FOR EVERY THRESHOLD. The brief scatters numbers across a dozen sections; the
 * existing personalizer scattered three of them through a service. Both make the same question
 * unanswerable: "why did this student get four practice problems and that one get none?"
 * Everything numeric that shapes a plan lives here, so the answer is always one file.
 *
 * NO AI, NO CLOCK, NO RANDOMNESS. Pure functions over plain data, so the same profile produces
 * the same plan every time and a college can be told exactly how it was built.
 *
 * THIS DOES NOT MEASURE ANYTHING. Scores and confidence come from Skill DNA (skillDnaPolicy);
 * gap and priority come from roleReadinessPolicy. This file only decides what to TEACH given a
 * measurement somebody else made. Keeping that boundary is what stops a second, disagreeing
 * scoring engine from growing here.
 */

import type { SkillConfidence } from '../models/StudentSkillProfile';

export const ADAPTIVE_CURRICULUM_VERSION = 'ADAPTIVE_CURRICULUM_V1';

/** The feature flag every adaptive path is gated on. */
export const ADAPTIVE_FLAG = 'adaptiveSkillCurriculumV2';

/* ------------------------------------------------------------------ *
 * Assignment state — what this student needs from this topic
 * ------------------------------------------------------------------ */

/**
 * NOT_EXPOSED IS NOT A FAILURE, and is the reason this enum exists at all.
 *
 * A student who has never written a line of code has not scored zero at programming; nobody has
 * asked them. Telling them they "failed" a subject they have never met is both wrong and the
 * fastest way to lose a first-year. It is kept structurally distinct from FOUNDATION_REQUIRED,
 * which is a real measurement of a real gap.
 *
 * VERIFIED IS NOT REMOVAL. A mastered topic stays in the plan, marked, rather than being deleted
 * — see §18 of the brief and the note on retention below.
 *
 * NOT_RELEVANT is about the direction a student is heading in, never about their ability. It is
 * deliberately in this enum rather than expressed by absence, so a student can be shown WHY a
 * technology is not in their plan instead of simply never seeing it.
 */
export type AssignmentState =
  | 'NOT_EXPOSED'
  | 'FOUNDATION_REQUIRED'
  | 'GUIDED'
  | 'STANDARD'
  | 'REVISION'
  | 'VERIFIED'
  | 'ENRICHMENT'
  | 'NOT_RELEVANT'
  | 'LOCKED';

/** Ordering for display: what needs attention first. */
export const STATE_ORDER: Record<AssignmentState, number> = {
  FOUNDATION_REQUIRED: 0,
  NOT_EXPOSED: 1,
  GUIDED: 2,
  STANDARD: 3,
  LOCKED: 4,
  REVISION: 5,
  VERIFIED: 6,
  ENRICHMENT: 7,
  NOT_RELEVANT: 8,
};

/**
 * Score bands, from the brief.
 *
 * Read as "up to and including". A score of exactly 40 is GUIDED, not FOUNDATION_REQUIRED —
 * boundaries are stated once here rather than re-derived with < or <= at each call site, which
 * is how off-by-one differences between two screens start.
 */
export const SCORE_BANDS = {
  FOUNDATION_REQUIRED_MAX: 39,
  GUIDED_MAX: 59,
  STANDARD_MAX: 74,
  REVISION_MAX: 84,
} as const;

/**
 * Confidence low enough that a score should not yet drive teaching depth.
 *
 * A 90 from a single question is a real observation and is shown to the student, but building a
 * "skip this, you know it" decision on it risks skipping something they have never actually
 * demonstrated. Below this, the plan teaches and re-measures rather than assuming.
 */
export const CONFIDENT_ENOUGH_TO_SKIP: SkillConfidence[] = ['MEDIUM', 'HIGH'];

export const isConfidentEnough = (c?: SkillConfidence | null): boolean =>
  !!c && CONFIDENT_ENOUGH_TO_SKIP.includes(c);

/**
 * Decide what a student needs from a skill they have been measured on.
 *
 * `score === null` means NO ROW EXISTS — nobody has measured this. That is NOT_EXPOSED, and it
 * is the distinction the whole first-year experience rests on.
 *
 * Low confidence deliberately caps the outcome at STANDARD: a thinly-evidenced high score gets
 * taught normally and measured again, rather than being trusted enough to skip. It is never
 * pushed DOWN to FOUNDATION_REQUIRED either — thin evidence is not evidence of weakness.
 */
export function stateForScore(input: {
  score: number | null;
  confidence: SkillConfidence | null;
}): AssignmentState {
  if (input.score === null || input.score === undefined) return 'NOT_EXPOSED';

  const raw: AssignmentState =
    input.score <= SCORE_BANDS.FOUNDATION_REQUIRED_MAX ? 'FOUNDATION_REQUIRED'
      : input.score <= SCORE_BANDS.GUIDED_MAX ? 'GUIDED'
        : input.score <= SCORE_BANDS.STANDARD_MAX ? 'STANDARD'
          : input.score <= SCORE_BANDS.REVISION_MAX ? 'REVISION'
            : 'VERIFIED';

  // Thin evidence may not buy a shortcut, but it must not manufacture a weakness either.
  if (!isConfidentEnough(input.confidence)) {
    return raw === 'REVISION' || raw === 'VERIFIED' ? 'STANDARD' : raw;
  }
  return raw;
}

/* ------------------------------------------------------------------ *
 * Depth — how much teaching a state earns
 * ------------------------------------------------------------------ */

/** Matches LearningContentLibrary.learningDepth so a state selects content directly. */
export type LearningDepth = 'FOUNDATION' | 'GUIDED' | 'STANDARD' | 'REVISION' | 'CHALLENGE';

export interface DepthPlan {
  depth: LearningDepth;
  /** Inclusive practice difficulty window, 1-4. */
  difficultyMin: number;
  difficultyMax: number;
  practiceCount: number;
  /** False when the student may skip this entirely without falling behind. */
  mandatory: boolean;
}

/**
 * What each state actually assigns.
 *
 * VERIFIED KEEPS ITS PLACE IN THE PLAN. Nothing is mandatory, but the topic remains visible with
 * an optional challenge — deleting it, as the current personalizer does at score >= 90, means a
 * student cannot see what they were excused from or prove they still know it. A plan that
 * silently drops what you are good at reads as a plan that lost your work.
 *
 * NOT_EXPOSED gets the same teaching as FOUNDATION_REQUIRED, because the need is identical: they
 * have to be taught it from the beginning. Only the LABEL differs, and only because telling
 * somebody they failed something nobody asked them about is a lie.
 */
export const DEPTH_BY_STATE: Record<AssignmentState, DepthPlan> = {
  NOT_EXPOSED:         { depth: 'FOUNDATION', difficultyMin: 1, difficultyMax: 2, practiceCount: 6, mandatory: true },
  FOUNDATION_REQUIRED: { depth: 'FOUNDATION', difficultyMin: 1, difficultyMax: 2, practiceCount: 6, mandatory: true },
  GUIDED:              { depth: 'GUIDED',     difficultyMin: 1, difficultyMax: 3, practiceCount: 5, mandatory: true },
  STANDARD:            { depth: 'STANDARD',   difficultyMin: 2, difficultyMax: 3, practiceCount: 4, mandatory: true },
  REVISION:            { depth: 'REVISION',   difficultyMin: 3, difficultyMax: 4, practiceCount: 2, mandatory: true },
  VERIFIED:            { depth: 'CHALLENGE',  difficultyMin: 3, difficultyMax: 4, practiceCount: 0, mandatory: false },
  ENRICHMENT:          { depth: 'CHALLENGE',  difficultyMin: 3, difficultyMax: 4, practiceCount: 3, mandatory: false },
  NOT_RELEVANT:        { depth: 'STANDARD',   difficultyMin: 2, difficultyMax: 3, practiceCount: 0, mandatory: false },
  LOCKED:              { depth: 'FOUNDATION', difficultyMin: 1, difficultyMax: 2, practiceCount: 0, mandatory: false },
};

export const depthFor = (state: AssignmentState): DepthPlan => DEPTH_BY_STATE[state];

/* ------------------------------------------------------------------ *
 * Why — explainability
 * ------------------------------------------------------------------ */

/**
 * Every assignment carries one of these. A student asking "why am I learning this?" gets an
 * answer built from real data, never a generated sentence.
 */
export type AssignmentReason =
  | 'DIAGNOSTIC_GAP'
  | 'NOT_YET_EXPOSED'
  | 'PREREQUISITE'
  | 'STANDARD_FOUNDATION'
  | 'STUDENT_DIRECTION'
  | 'CAREER_EXPLORATION'
  | 'MASTERY_VERIFIED'
  | 'MODULE_REASSESSMENT'
  | 'MENTOR_OVERRIDE'
  | 'PREREQUISITE_LOCKED'
  | 'OUTSIDE_DIRECTION';

/**
 * The student-facing sentence for a reason.
 *
 * A switch over real values rather than an AI call: these appear on every topic of every plan,
 * they must be identical for two students in the same situation, and they must never invent a
 * cause. `skillName` and `blockedBy` are interpolated by the caller.
 */
export function explainReason(reason: AssignmentReason, ctx: {
  skillName?: string;
  score?: number | null;
  blockedBy?: string;
  directionName?: string;
} = {}): string {
  const name = ctx.skillName || 'this topic';
  switch (reason) {
    case 'DIAGNOSTIC_GAP':
      return ctx.score != null
        ? `Your diagnostic showed a gap here — you scored ${ctx.score} on ${name}.`
        : `Your diagnostic showed a gap in ${name}.`;
    case 'NOT_YET_EXPOSED':
      return `You have not covered ${name} yet, so it starts from the beginning.`;
    case 'PREREQUISITE':
      return `${name} is needed before the topics you are aiming at.`;
    case 'STANDARD_FOUNDATION':
      return `${name} is part of the foundation every student covers.`;
    case 'STUDENT_DIRECTION':
      return ctx.directionName
        ? `${name} is part of ${ctx.directionName}, the direction you chose.`
        : `${name} is part of the direction you chose.`;
    case 'CAREER_EXPLORATION':
      return `A short look at ${name}, to help you find what you enjoy.`;
    case 'MASTERY_VERIFIED':
      return ctx.score != null
        ? `You have already shown you know ${name} — you scored ${ctx.score}. Nothing here is required.`
        : `You have already shown you know ${name}. Nothing here is required.`;
    case 'MODULE_REASSESSMENT':
      return `Revisited because a recent module assessment changed your score on ${name}.`;
    case 'MENTOR_OVERRIDE':
      return `Assigned by your mentor.`;
    case 'PREREQUISITE_LOCKED':
      return ctx.blockedBy
        ? `Locked until you finish ${ctx.blockedBy}, which ${name} builds on.`
        : `Locked until you finish what ${name} builds on.`;
    case 'OUTSIDE_DIRECTION':
      return ctx.directionName
        ? `Not part of ${ctx.directionName}, so it is optional for you.`
        : `Not part of your current direction, so it is optional for you.`;
    default:
      return `Assigned as part of your plan.`;
  }
}

/* ------------------------------------------------------------------ *
 * Pace — availability decides speed, never content
 * ------------------------------------------------------------------ */

/**
 * THE RULE THIS ENCODES: a student with less time takes longer. They do not learn less.
 *
 * It is the difference between a plan and a discount. Dropping required skills for a busy
 * student produces somebody who finishes sooner and cannot do the job — and they would have no
 * way of knowing that is what happened.
 */
export const PACE = {
  /** Never plan someone to 100% of stated time; the first bad week destroys the schedule. */
  UTILIZATION: 0.85,
  /** Fewer than this and a session is set-up cost with no learning in it. */
  MIN_SESSION_MINUTES: 30,
  /** More topics than this at once and nothing gets finished. */
  MAX_ACTIVE_TOPICS: 4,
  /** A week with real capacity may carry the full four. */
  WIDE_WEEK_MINUTES: 420,
  NARROW_WEEK_ACTIVE_TOPICS: 2,
} as const;

export interface Availability { hoursPerDay: number; daysPerWeek: number }

export interface PacePlan {
  weeklyCapacityMinutes: number;
  weeklyPlannableMinutes: number;
  activeTopicsPerWeek: number;
}

/**
 * Turn stated availability into a weekly budget.
 *
 * Clamped rather than trusted: a student who enters 24 hours a day has mistyped or is telling us
 * something about their optimism, and a plan built on it fails in week one.
 */
export function paceFor(a: Availability): PacePlan {
  const hours = Math.max(0.5, Math.min(12, Number(a.hoursPerDay) || 0));
  const days = Math.max(1, Math.min(7, Math.round(Number(a.daysPerWeek) || 0)));
  const weeklyCapacityMinutes = Math.round(hours * 60 * days);
  const weeklyPlannableMinutes = Math.round(weeklyCapacityMinutes * PACE.UTILIZATION);
  const activeTopicsPerWeek = weeklyPlannableMinutes >= PACE.WIDE_WEEK_MINUTES
    ? PACE.MAX_ACTIVE_TOPICS
    : Math.max(PACE.NARROW_WEEK_ACTIVE_TOPICS, PACE.MAX_ACTIVE_TOPICS - 1);
  return { weeklyCapacityMinutes, weeklyPlannableMinutes, activeTopicsPerWeek };
}

/**
 * How many weeks a set of assigned minutes will take at this pace.
 *
 * Reported, never used to trim the plan. If the honest answer is thirty weeks, the student is
 * told thirty weeks — shortening it by removing skills would be lying about what the job needs.
 */
export function weeksFor(totalMinutes: number, pace: PacePlan): number {
  if (totalMinutes <= 0) return 0;
  const perWeek = Math.max(1, pace.weeklyPlannableMinutes);
  return Math.max(1, Math.ceil(totalMinutes / perWeek));
}

/* ------------------------------------------------------------------ *
 * Replanning
 * ------------------------------------------------------------------ */

export type ReplanTrigger =
  | 'DIAGNOSTIC_COMPLETED'
  | 'MODULE_ASSESSMENT_COMPLETED'
  | 'PROJECT_EVALUATED'
  | 'SIGNIFICANT_MASTERY_CHANGE'
  | 'DIRECTION_CHANGED'
  | 'AVAILABILITY_CHANGED'
  | 'MENTOR_OVERRIDE';

/**
 * How far a score must move before the remaining plan is rebuilt.
 *
 * NOT AFTER EVERY QUESTION. A plan that reshuffles on each answer is one the student can never
 * learn to trust, and the churn costs more than the accuracy gains. Ten points is roughly one
 * band in SCORE_BANDS, which is the smallest movement that can actually change a teaching
 * decision — anything less would rewrite the plan without changing it.
 */
export const REPLAN_SCORE_DELTA = 10;

/** A state change always matters, whatever the score did. */
export function isSignificantChange(input: {
  beforeScore: number | null;
  afterScore: number | null;
  beforeState: AssignmentState;
  afterState: AssignmentState;
}): boolean {
  if (input.beforeState !== input.afterState) return true;
  if (input.beforeScore === null || input.afterScore === null) return input.beforeScore !== input.afterScore;
  return Math.abs(input.afterScore - input.beforeScore) >= REPLAN_SCORE_DELTA;
}
