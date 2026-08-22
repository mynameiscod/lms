import User from '../models/User';
import { calculateStudentRoleReadiness } from './roleReadinessService';
import { levelFor } from './passportScoringService';
import { COVERAGE_THRESHOLDS } from '../data/roleReadinessPolicy';

/**
 * WHERE THE CAREER SCORE COMES FROM.
 *
 * It used to come from the free Career Readiness questionnaire: roughly twenty questions,
 * half of them self-reported opinion ("How clear are you about the career you want?") and
 * the graded half generic aptitude ("25% of 200 is?"). That produced a number we sold a
 * ₹499 membership against and printed on a shareable card, and it did not measure whether
 * the member could do the job they were aiming at. It is not a number defensible to the
 * student, to a college, or to a hiring partner.
 *
 * Role readiness is. It is the member's measured skills weighted against a PUBLISHED
 * blueprint for the role they chose — the same instrument the gap list and the roadmap are
 * built from, so the score, the gaps and the plan finally agree with one another instead of
 * being three different opinions.
 *
 * WHY THIS IS ONE SMALL FILE AND NOT A REWRITE.
 *
 * `passport.careerScore` is read in more than twenty places — Mission Control, the paywall,
 * the public card, pathway rules, the funnel report. None of them need to change: they all
 * want "this member's score out of 100", and that is still what they get. Only what FEEDS
 * it moves. Changing the producer rather than the consumers is what makes this safe.
 *
 * WHAT WILL NOT HAPPEN HERE.
 *
 * It never lowers or clears a score it cannot replace. A member who has a legacy score and
 * has not yet sat a skill assessment keeps it, and keeps their access, until there is
 * something better to say about them. Silently zeroing a paying member's score because a
 * blueprint was unpublished that morning would lock them out of what they bought.
 */

/**
 * How much of the blueprint must be measured before readiness is a SCORE.
 *
 * Readiness is defined over whatever has been assessed, so two skills out of twenty-four
 * can produce a confident-looking 80 that describes almost nothing. Publishing that as a
 * Career Score would be worse than the questionnaire it replaced — at least that asked
 * everybody the same twenty questions.
 *
 * Borrowed from the readiness module's own MEDIUM threshold rather than chosen separately,
 * so "enough to be a score" and "enough to stop being LOW confidence" are the same line.
 * Two private opinions about sufficiency would eventually disagree, and the disagreement
 * would show up as a score that exists next to a panel saying it cannot be trusted.
 *
 * A PERCENTAGE, 0-100 — which is the unit `RoleReadinessResult.coverage` is in, not a
 * ratio. Comparing it against 0.34 would have let every member through.
 */
export const MIN_COVERAGE_FOR_SCORE = COVERAGE_THRESHOLDS.MEDIUM;

export type ScoreSource = 'role_readiness' | 'legacy_questionnaire';

export interface RefreshOutcome {
  updated: boolean;
  /** Why nothing was written. Present only when `updated` is false. */
  reason?: 'no-role' | 'unavailable' | 'not-enough-measured' | 'no-readiness';
  score?: number;
  level?: string;
  coverage?: number;
  confidence?: string;
}

/**
 * Recompute one member's Career Score from their role readiness.
 *
 * Called after a skill assessment is projected into Skill DNA, which is the only moment the
 * inputs actually change. Deliberately NOT called on read: a score that moved because a
 * dashboard was opened is a score nobody can explain, and it would make the number on the
 * public card disagree with the number in the funnel report depending on who looked last.
 *
 * Never throws. This is derived state hanging off a submission that has already been saved;
 * a failure here must cost the member nothing.
 */
export async function refreshCareerScoreFromReadiness(
  tenantId: string,
  studentId: string,
): Promise<RefreshOutcome> {
  const outcome = await calculateStudentRoleReadiness(tenantId, studentId).catch(() => null);

  if (!outcome) return { updated: false, reason: 'unavailable' };
  if (!outcome.available) {
    // A member who has not chosen a role, or whose blueprint is not published, is not a
    // member whose score is wrong — it is a member we have nothing new to say about.
    return { updated: false, reason: outcome.reason === 'ROLE_NOT_SELECTED' ? 'no-role' : 'unavailable' };
  }
  if (outcome.readiness === null) return { updated: false, reason: 'no-readiness' };
  if (outcome.coverage < MIN_COVERAGE_FOR_SCORE) {
    return { updated: false, reason: 'not-enough-measured', coverage: outcome.coverage };
  }

  const score = Math.max(0, Math.min(100, Math.round(outcome.readiness)));
  const level = levelFor(score);

  await User.updateOne(
    { _id: studentId, tenantId },
    {
      $set: {
        'passport.careerScore': score,
        'passport.level': level.key,
        // Which instrument produced this. Without it there is no way to tell a migrated
        // member from one still carrying a questionnaire score, and no way to answer
        // "why did my score change" six months from now.
        'passport.careerScoreSource': 'role_readiness' as ScoreSource,
        'passport.careerScoreAt': new Date(),
        'passport.careerScoreCoverage': outcome.coverage,
        'passport.careerScoreConfidence': outcome.confidence,
      },
    },
  );

  return {
    updated: true,
    score,
    level: level.key,
    coverage: outcome.coverage,
    confidence: outcome.confidence,
  };
}
