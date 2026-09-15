/**
 * Membership is what turns a Foundation learner's preview into their ninety days.
 *
 * Called at every point a membership starts — the online payment, an admin conversion, an admin
 * grant — so the full roadmap exists by the time the student looks, built from the same Skill DNA
 * their preview was built from. It goes through the production trigger, so a journey made here is
 * no different from one a skill check makes.
 *
 * Never throws and never blocks the membership: the payment or grant has already happened, and a
 * journey that could not be generated this second is generated the next time the student opens
 * their roadmap. A learner the unit engine does not plan is left alone.
 */

import mongoose from 'mongoose';

export async function generateJourneyOnMembership(tenantId: string, studentId: string): Promise<string> {
  // Nothing to plan against without a database — which is the case in unit tests of the payment
  // and grant handlers, where models are mocked and a real query would only hang.
  if (mongoose.connection.readyState !== 1) return 'SKIPPED';
  try {
    const { resolveCurriculumEngine } = await import('./curriculumEngineService');
    const engine = await resolveCurriculumEngine({ tenantId, studentId });
    if (engine.engine !== 'UNIT') return 'TOPIC';
    const { applyFoundationTrigger } = await import('./foundationJourneyTriggerService');
    const out = await applyFoundationTrigger({
      tenantId, studentId, trigger: 'SIGNIFICANT_MASTERY_CHANGE', stageKey: engine.stageKey || 'foundation',
    });
    console.log(`[foundation-journey] membership for ${studentId} → ${out.action}${out.reason ? ` (${out.reason})` : ''}`);
    return out.action;
  } catch (e: any) {
    console.error('[foundation-journey] membership generation failed:', e?.message || e);
    return 'FAILED';
  }
}
