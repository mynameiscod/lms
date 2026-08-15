import { SkillTargetLevel, SkillImportance } from '../models/RoleSkillBlueprint';
import { SkillConfidence } from '../models/StudentSkillProfile';

/**
 * ROLE_READINESS_V1 — how a student's skills are compared with a role's requirements.
 *
 * Every threshold lives here. Scattering them is how two screens end up disagreeing about
 * whether somebody is on track, and neither the student nor the admin could tell which
 * one was right.
 *
 * THESE NUMBERS ARE PRODUCT POLICY, NOT SCIENCE. "Proficient means 75" is a decision we
 * made, not a fact about the world, and the version marker exists so it can change later
 * without pretending old results were computed the new way.
 *
 * NO AI. A comparison of two numbers does not need a language model, and using one would
 * make the result impossible to reproduce or defend.
 */

export const ROLE_READINESS_VERSION = 'ROLE_READINESS_V1';

/**
 * What each target level means as a score a student can be measured against.
 *
 * Spaced so the steps are meaningful rather than even: the distance from knowing nothing
 * to FOUNDATION is smaller than the distance from PROFICIENT to ADVANCED, which is where
 * real depth lives and where most candidates stop.
 */
export const TARGET_SCORE: Record<SkillTargetLevel, number> = {
  FOUNDATION: 40,
  WORKING: 60,
  PROFICIENT: 75,
  ADVANCED: 90,
};

export const targetScoreFor = (level: string): number =>
  TARGET_SCORE[level as SkillTargetLevel] ?? TARGET_SCORE.WORKING;

/**
 * What counts as enough evidence to draw a conclusion.
 *
 * MEDIUM or better. Module 7 deliberately keeps score and confidence apart, and this is
 * where that pays off: a 90 from a single question is real, reported, and not yet
 * something to build a readiness figure on.
 *
 * The simpler of the two options the brief allowed. A fractional contribution for LOW
 * confidence is defensible arithmetic and much harder to explain to somebody asking why
 * their number moved, and an explanation nobody follows is not really an explanation.
 */
export const SUFFICIENT_CONFIDENCE: SkillConfidence[] = ['MEDIUM', 'HIGH'];

export const isSufficientlyAssessed = (confidence?: string | null): boolean =>
  !!confidence && SUFFICIENT_CONFIDENCE.includes(confidence as SkillConfidence);

/**
 * Where a student stands on one required skill.
 *
 * LIMITED_EVIDENCE is separate from NOT_ASSESSED on purpose: one means we measured a
 * little and are not yet sure, the other means we never asked. Collapsing them would tell
 * a student to work on something they may already be good at.
 */
export type GapStatus =
  | 'NOT_ASSESSED'
  | 'LIMITED_EVIDENCE'
  | 'PRIORITY_GAP'
  | 'NEEDS_WORK'
  | 'ON_TRACK'
  | 'STRONG';

/**
 * Gap bands, in points below target.
 *
 * A gap is the distance to the requirement, not to perfection: a student at 72 against a
 * target of 60 has no gap at all, however far they are from 100.
 */
export const GAP_BANDS = {
  /** At or above target. */
  ON_TRACK: 0,
  /** Within reach — a nudge rather than a project. */
  NEEDS_WORK: 15,
};

/** How far above target counts as genuinely strong, rather than merely sufficient. */
export const STRONG_MARGIN = 10;

/**
 * Classify one required skill.
 *
 * STRONG requires HIGH confidence, not merely a high score. Calling a single lucky answer
 * a strength is the mistake that would make a student skip the thing they most need — the
 * one claim here with a real cost attached to being wrong.
 */
export function classifyGap(input: {
  studentScore: number | null;
  targetScore: number;
  confidence: string | null;
}): GapStatus {
  if (input.studentScore === null || !input.confidence) return 'NOT_ASSESSED';
  if (!isSufficientlyAssessed(input.confidence)) return 'LIMITED_EVIDENCE';

  const gap = input.targetScore - input.studentScore;

  if (gap <= 0) {
    return input.confidence === 'HIGH' && input.studentScore >= input.targetScore + STRONG_MARGIN
      ? 'STRONG'
      : 'ON_TRACK';
  }
  return gap <= GAP_BANDS.NEEDS_WORK ? 'NEEDS_WORK' : 'PRIORITY_GAP';
}

/**
 * How much of the requirement a student has met, for the readiness average.
 *
 * CAPPED AT 1. Excellence in one skill must not offset absence in another: a candidate at
 * 100 on SQL and 0 on REST is not "average, therefore fine", they are missing REST. The
 * cap is what stops the weighted mean from saying otherwise.
 */
export function skillRatio(studentScore: number, targetScore: number): number {
  if (targetScore <= 0) return 1;
  return Math.min(1, Math.max(0, studentScore / targetScore));
}

/**
 * Importance as a ranking multiplier — for ORDERING gaps, never for the readiness score.
 *
 * The score already respects importance through the blueprint's own weight. This decides
 * which of two similar gaps a student should hear about first, and an essential skill
 * outranks an optional one at the same distance.
 */
export const IMPORTANCE_PRIORITY: Record<SkillImportance, number> = {
  ESSENTIAL: 1.5,
  IMPORTANT: 1.2,
  SUPPORTING: 1.0,
  OPTIONAL: 0.7,
};

export const importancePriority = (i: string): number =>
  IMPORTANCE_PRIORITY[i as SkillImportance] ?? 1.0;

/**
 * How urgently a gap deserves attention.
 *
 *   priority = (gap ÷ target) × weight × importance
 *
 * Proportional rather than absolute, so a 20-point gap against a FOUNDATION target ranks
 * above the same 20 points against ADVANCED — the first student is missing the basics,
 * the second is merely short of mastery.
 *
 * Only sufficiently-assessed gaps get one. An unassessed skill is not a known weakness and
 * must not sit at the top of a list of things to fix.
 */
export function priorityScore(input: {
  studentScore: number;
  targetScore: number;
  weight: number;
  importance: string;
}): number {
  const gap = Math.max(0, input.targetScore - input.studentScore);
  if (gap <= 0) return 0;
  const proportional = gap / (input.targetScore || 1);
  return Math.round(proportional * input.weight * importancePriority(input.importance) * 100) / 100;
}

/**
 * Coverage thresholds for role-level confidence, as a percentage of weighted blueprint.
 */
export const COVERAGE_THRESHOLDS = {
  MEDIUM: 40,
  HIGH: 75,
};

/**
 * HIGH confidence additionally requires most ESSENTIAL skills to be measured.
 *
 * Covering three quarters of a blueprint by weight while having measured two of seven
 * essentials is not a confident picture of a candidate — it is a confident picture of the
 * parts that happened to be easy to assess.
 */
export const ESSENTIAL_COVERAGE_FOR_HIGH = 0.7;

/**
 * How much to trust the readiness figure. Never derived from the figure itself: a
 * confidently-measured 30% is a real and useful finding, and treating low readiness as
 * low confidence would hide exactly the students who most need to know.
 */
export function roleConfidence(input: {
  coveragePercent: number;
  essentialTotal: number;
  essentialAssessed: number;
}): 'LOW' | 'MEDIUM' | 'HIGH' {
  const essentialRatio = input.essentialTotal > 0
    ? input.essentialAssessed / input.essentialTotal
    : 1;

  if (input.coveragePercent >= COVERAGE_THRESHOLDS.HIGH && essentialRatio >= ESSENTIAL_COVERAGE_FOR_HIGH) {
    return 'HIGH';
  }
  if (input.coveragePercent >= COVERAGE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/** Reading order: what to act on first, then what is fine, then what we have not measured. */
export const STATUS_ORDER: Record<GapStatus, number> = {
  PRIORITY_GAP: 0,
  NEEDS_WORK: 1,
  LIMITED_EVIDENCE: 2,
  NOT_ASSESSED: 3,
  ON_TRACK: 4,
  STRONG: 5,
};

/** Why readiness could not be calculated. Distinct states, distinct fixes. */
export type ReadinessUnavailable =
  | 'ROLE_NOT_SELECTED'
  | 'ROLE_BLUEPRINT_NOT_READY'
  | 'NO_EVIDENCE';
