/**
 * Whether a tenant can serve the Foundation product at all.
 *
 * ── WHY THIS IS ASKED ─────────────────────────────────────────────────────────────────────
 *
 * Every Foundation learner is planned by the unit engine; that is the product, not a switch. A
 * tenant or database that was never provisioned with the certified Year-1 curriculum cannot give
 * them ninety days — and the old answer, silently falling back to the topic roadmap, showed a
 * first-year a 21- or 28-day plan as though it were theirs. The honest answer is NOT_CONFIGURED,
 * said out loud, and this is where it is decided.
 *
 * ── WHAT "CONFIGURED" MEANS ───────────────────────────────────────────────────────────────
 *
 * Two facts, both cheap counts on this tenant's own data:
 *
 *   - at least ninety PUBLISHED Foundation units — fewer cannot compose ninety distinct days, so a
 *     journey is impossible before the composer is even asked;
 *   - at least one active PRIMARY skill-evidence mapping — without one no skill check can be
 *     built, so no Skill DNA, so no journey is ever created.
 *
 * It is a floor, not a certification. Whether the published set is the certified one is what
 * provisioning and the production gate establish; this only stops a student being shown a plan
 * that cannot exist.
 */

import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import SkillEvidence from '../models/SkillEvidence';
import { foundationProgramDaysFor } from './foundationProgramLengthService';

export type FoundationNotConfiguredReason = 'NO_PRODUCTION_CURRICULUM' | 'NO_SKILL_CHECK';

export interface FoundationReadiness {
  configured: boolean;
  reason: FoundationNotConfiguredReason | null;
  /** PUBLISHED Foundation units in this tenant. The certified set is 338. */
  publishedUnits: number;
  /** Active PRIMARY skill-evidence mappings — what a skill check is built from. */
  skillCheckMappings: number;
  /** For an admin or operator; students are told something shorter. */
  message: string | null;
}

/**
 * Can this tenant serve a journey for this stage?
 *
 * ── WHY THE STAGE IS AN ARGUMENT ──────────────────────────────────────────────────────────
 *
 * Both counts below are per-stage questions that used to be asked only of Foundation. Once the
 * unit engine could serve `build`, asking the Foundation question about a second-year gave the
 * wrong answer twice over: it counted Foundation's published units, and it compared them against
 * Foundation's programme length. A tenant with 346 Foundation units and no Year-2 content at all
 * would have been reported ready to serve Year 2.
 *
 * Defaults to foundation, so every existing caller keeps its behaviour unchanged.
 */
export async function foundationReadiness(
  tenantId: string,
  stageKey: string = 'foundation',
): Promise<FoundationReadiness> {
  const stage = String(stageKey || 'foundation').toLowerCase().trim();
  const label = STAGE_LABEL[stage] || 'Foundation';

  /* A tenant on a longer programme needs more published units before it can compose one. */
  const programDays = await foundationProgramDaysFor(tenantId);
  const [publishedUnits, skillCheckMappings] = await Promise.all([
    CurriculumLearningUnit.countDocuments({ tenantId, stageKey: stage, status: 'PUBLISHED' }),
    SkillEvidence.countDocuments({ tenantId, active: true, contribution: 'PRIMARY' }),
  ]);

  if (publishedUnits < programDays) {
    return {
      configured: false, reason: 'NO_PRODUCTION_CURRICULUM', publishedUnits, skillCheckMappings,
      message: `This tenant has ${publishedUnits} published ${label} unit(s); a ${programDays}-day journey needs `
        + `at least ${programDays}. Run the provisioning for this tenant, or author the missing days.`,
    };
  }
  if (!skillCheckMappings) {
    return {
      configured: false, reason: 'NO_SKILL_CHECK', publishedUnits, skillCheckMappings,
      message: `This tenant has no skill-check questions mapped to skills, so no ${label} learner can be measured. `
        + 'Run the provisioning for this tenant.',
    };
  }
  return { configured: true, reason: null, publishedUnits, skillCheckMappings, message: null };
}

/** Stage keys to the word a person reads. Kept local: this file reports, it does not route. */
const STAGE_LABEL: Record<string, string> = { foundation: 'Foundation', build: 'Build' };

/**
 * What a learner is told when their institute's curriculum for their stage is not set up.
 *
 * Says neither "Foundation" nor "90 days" any more, and both omissions are deliberate: a
 * second-year told their Foundation curriculum was missing would reasonably think they had been
 * given the wrong year, and the length has been a per-tenant setting since long before this,
 * so the 90 was capable of being wrong even for a first-year.
 */
export const notConfiguredForStudent = (stageKey?: string | null): string =>
  `Your ${STAGE_LABEL[String(stageKey || 'foundation').toLowerCase().trim()] || 'Foundation'} `
  + 'curriculum has not been set up for your institute yet, so your journey cannot start. '
  + 'Nothing is wrong with your account — your CareerPilot admin needs to finish setting it up.';

/** Kept for callers that have no stage to hand. */
export const FOUNDATION_NOT_CONFIGURED_FOR_STUDENT = notConfiguredForStudent('foundation');
