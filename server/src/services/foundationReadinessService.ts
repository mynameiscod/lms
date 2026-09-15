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
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

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

export async function foundationReadiness(tenantId: string): Promise<FoundationReadiness> {
  const [publishedUnits, skillCheckMappings] = await Promise.all([
    CurriculumLearningUnit.countDocuments({ tenantId, stageKey: 'foundation', status: 'PUBLISHED' }),
    SkillEvidence.countDocuments({ tenantId, active: true, contribution: 'PRIMARY' }),
  ]);

  if (publishedUnits < FOUNDATION_PROGRAM_DAYS) {
    return {
      configured: false, reason: 'NO_PRODUCTION_CURRICULUM', publishedUnits, skillCheckMappings,
      message: `This tenant has ${publishedUnits} published Foundation unit(s); a ninety-day journey needs the `
        + 'certified Year-1 curriculum. Run the Foundation provisioning for this tenant.',
    };
  }
  if (!skillCheckMappings) {
    return {
      configured: false, reason: 'NO_SKILL_CHECK', publishedUnits, skillCheckMappings,
      message: 'This tenant has no skill-check questions mapped to skills, so no Foundation learner can be measured. '
        + 'Run the Foundation provisioning for this tenant.',
    };
  }
  return { configured: true, reason: null, publishedUnits, skillCheckMappings, message: null };
}

/** What a learner is told when their institute's Foundation curriculum is not set up. */
export const FOUNDATION_NOT_CONFIGURED_FOR_STUDENT =
  'Your Foundation curriculum has not been set up for your institute yet, so your 90-day journey cannot start. '
  + 'Nothing is wrong with your account — your CareerPilot admin needs to finish setting it up.';
