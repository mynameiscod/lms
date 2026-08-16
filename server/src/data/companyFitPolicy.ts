/**
 * COMPANY_FIT_V1 — how a student's measured skills are compared with one company's
 * expectations for one role.
 *
 * WHAT IS NOT HERE IS THE POINT. There is no second interpretation of Skill DNA in this
 * file: target scores, gap bands, what counts as sufficiently assessed, how a gap is ranked
 * and how confidence is derived all come from roleReadinessPolicy and are imported
 * unchanged. A company differs from a role in its WEIGHTS and TARGETS, not in what a score
 * means, and two policies that disagreed about "PROFICIENT" would produce two numbers a
 * student could not reconcile.
 *
 * So this file holds exactly the parts that are genuinely company-specific: the words used
 * to describe how ready somebody is, and the reasons a comparison could not be made.
 */

export const COMPANY_FIT_VERSION = 'COMPANY_FIT_V1';

/**
 * How ready, in words.
 *
 * Four bands, deliberately describing PREPARATION rather than outcome. None of them says
 * anything about being selected, because nothing this product measures predicts that: a
 * company's decision involves a role we do not see, a panel we do not know and a candidate
 * pool we cannot observe. "Near ready" is a claim about preparation we can defend.
 * "Likely to clear Amazon" is not, and would be the single most damaging sentence in the
 * product the first time it was wrong.
 */
export type FitClassification = 'EARLY' | 'DEVELOPING' | 'NEAR_READY' | 'READY';

export const FIT_CLASSIFICATIONS: FitClassification[] = ['EARLY', 'DEVELOPING', 'NEAR_READY', 'READY'];

/**
 * Where each band starts, as a percentage of the company's weighted requirements met.
 *
 * READY is 80 rather than 100 because the requirement targets are already the bar — a
 * student at target on everything scores 100, and demanding that before saying "ready"
 * would mean nobody ever was.
 */
export const FIT_BANDS: { min: number; classification: FitClassification }[] = [
  { min: 80, classification: 'READY' },
  { min: 65, classification: 'NEAR_READY' },
  { min: 40, classification: 'DEVELOPING' },
  { min: 0,  classification: 'EARLY' },
];

export const FIT_LABEL: Record<FitClassification, string> = {
  EARLY: 'Early preparation',
  DEVELOPING: 'Developing',
  NEAR_READY: 'Near ready',
  READY: 'Well prepared',
};

/**
 * Classify a fit percentage.
 *
 * NULL IN, NULL OUT. A student with nothing sufficiently measured against this company has
 * no classification — not EARLY. Saying "early preparation" to somebody we have simply
 * never assessed is a statement about them we have not earned, and it is exactly the case
 * §27 exists to protect.
 */
export function classifyFit(readiness: number | null): FitClassification | null {
  if (readiness === null || !Number.isFinite(readiness)) return null;
  return (FIT_BANDS.find(b => readiness >= b.min) || FIT_BANDS[FIT_BANDS.length - 1]).classification;
}

/**
 * Why a company fit could not be calculated. Distinct states, distinct fixes — and none of
 * them is a 0%, which would read as a finding about the student rather than about the
 * configuration.
 */
export type FitUnavailable =
  | 'COMPANY_NOT_FOUND'
  | 'ROLE_NOT_SELECTED'
  | 'PROFILE_NOT_CONFIGURED'
  | 'REQUIREMENTS_NOT_CONFIGURED';

export const FIT_UNAVAILABLE_MESSAGE: Record<FitUnavailable, string> = {
  COMPANY_NOT_FOUND: 'That company is not available yet.',
  ROLE_NOT_SELECTED: 'Choose a target role to see how you compare with this company.',
  PROFILE_NOT_CONFIGURED: 'Preparation for your target role is not configured for this company yet.',
  REQUIREMENTS_NOT_CONFIGURED: 'This company has no skill requirements configured yet.',
};

/**
 * How many companies a member may target at once.
 *
 * Small on purpose. A student following forty companies has not chosen anything, and the
 * screen that lists them stops being a plan and becomes a feed.
 */
export const MAX_TARGET_COMPANIES = 5;
