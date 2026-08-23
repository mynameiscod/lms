import PassportAttempt from '../models/PassportAttempt';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import { AttemptLite } from './passportMissionService';
import { IPassportCategoryDef } from '../models/PassportAssessment';

/**
 * HAS THIS MEMBER BEEN MEASURED?
 *
 * Three screens asked that question by looking for a PassportAttempt row, which only the
 * legacy Career Readiness questionnaire creates. A member who sat the PERSONALISED skill
 * assessment has no such row — they have a PersonalizedAssessment and a Skill DNA profile —
 * so the roadmap, the daily missions and Mission Control all concluded they had never been
 * assessed at all.
 *
 * What that looked like from the member's side: finish the skill assessment, land on Role
 * Readiness showing a real measured score against their target role, click "Build My
 * Roadmap", and be told to take a free assessment first. Click "Go to Dashboard" and be
 * shown the same. The one instrument they had completed was invisible to the screens that
 * decide whether the product has anything to give them.
 *
 * The gate now asks about the member rather than about a collection. Either instrument
 * counts, because either one means somebody sat down and answered questions about
 * themselves — which is all those screens ever needed to know.
 *
 * WHY THE SYNTHESISED ATTEMPT IS SHAPED LIKE THE REAL ONE.
 *
 * `buildRoadmap` and `missionsForDay` were written against `AttemptLite` and are used by
 * paying members today. Rewriting them to take a union of two assessment models would
 * touch the code that generates every existing member's plan, to fix a gate. So the shape
 * stays and this fills it — from the member's own record, never invented.
 */

export type AssessedSource = 'attempt' | 'skill_dna';

export interface AssessedState {
  /** True when EITHER instrument has been completed. */
  assessed: boolean;
  source: AssessedSource | null;
  /** Real when it came from an attempt; synthesised when it came from Skill DNA. */
  attempt: AttemptLite | null;
  careerScore: number | null;
  level: string | null;
}

const NOT_ASSESSED: AssessedState = {
  assessed: false, source: null, attempt: null, careerScore: null, level: null,
};

/**
 * Category scores for a member measured by the skill assessment.
 *
 * BE HONEST ABOUT WHAT IS NOT KNOWN. Mission pools are keyed on the legacy categories
 * (career_clarity, aptitude, technical, communication, employability); Skill DNA is keyed
 * on skills. There is no mapping between them, and inventing one here would put a number
 * against "aptitude" that nothing ever measured — which then decides which missions the
 * member is served and reads, on their result page, as a finding.
 *
 * So every category gets the SAME score: the member's overall standing. `missionsForDay`
 * sorts these to pick the weakest area, and with a flat list that sort is a no-op and it
 * falls back to serving the pools in their configured order. The member gets a plan rather
 * than a locked screen, and nobody is told they are weak at something we never tested.
 *
 * The real fix is a skill-to-category mapping, or mission pools keyed on skills directly.
 * Until one exists, a flat profile is the truthful placeholder.
 */
function flatCategoryScores(
  categories: IPassportCategoryDef[],
  score: number,
): { key: string; label: string; score: number }[] {
  return categories.map(c => ({ key: c.key, label: c.label, score }));
}

export async function resolveAssessedState(opts: {
  tenantId: string;
  studentId: string;
  /** The member's `passport` subdocument — already loaded by every caller. */
  passport: any;
  /** This tenant's categories, so a synthesised profile matches its mission pools. */
  categories: IPassportCategoryDef[];
  /** Fallback pathway when the member has no cached one. */
  defaultPathway?: { key: string; label: string } | null;
}): Promise<AssessedState> {
  const { tenantId, studentId, passport } = opts;

  // The legacy attempt wins when it exists: it is a real measurement with real category
  // scores, and every member who has one behaves exactly as they did before this existed.
  const attempt: any = await PassportAttempt.findOne({ tenantId, studentId })
    .sort({ createdAt: -1 }).lean();
  if (attempt) {
    return {
      assessed: true,
      source: 'attempt',
      attempt: attempt as AttemptLite,
      careerScore: attempt.careerScore ?? null,
      level: attempt.level ?? null,
    };
  }

  /**
   * A SUBMITTED personalised assessment is the signal, not the presence of skill profiles.
   *
   * Profiles can also be written by other evidence — a quiz, a practice item — so a member
   * who never sat an assessment can accumulate a few. Sitting the paper is the deliberate
   * act these screens are actually asking about.
   */
  const sat = await PersonalizedAssessment.exists({ tenantId, studentId, status: 'SUBMITTED' });
  if (!sat) return NOT_ASSESSED;

  const careerScore = typeof passport?.careerScore === 'number' ? passport.careerScore : null;
  const pathwayKey = passport?.pathway || opts.defaultPathway?.key || '';

  return {
    assessed: true,
    source: 'skill_dna',
    attempt: {
      // Written by careerScoreService from role readiness. Null until enough of the
      // blueprint is covered to say anything, which is why 0 is the floor rather than a
      // claim — a plan still has to be buildable while coverage is thin.
      careerScore: careerScore ?? 0,
      categoryScores: flatCategoryScores(opts.categories, careerScore ?? 0),
      // The gap list lives in Skill DNA and is shown properly on Role Readiness. Repeating
      // a guess at it here would be a second, worse answer to a question already answered.
      weaknesses: [],
      pathway: pathwayKey,
      pathwayLabel: opts.defaultPathway?.label || '',
    },
    careerScore,
    level: passport?.level ?? null,
  };
}
