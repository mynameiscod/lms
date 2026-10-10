import PassportConfig from '../models/PassportConfig';
import { roadmapV2For, resolveRoadmapV2 } from '../data/roadmapV2Policy';

/**
 * Is Roadmap V2 on for this learner in this stage, and with what daily study time?
 *
 * Returns null — V1, exactly as before V2 existed — when V2 is off for them, and also when the
 * setting cannot be read: a failed lookup must never cost a learner their roadmap, and V1 is the
 * behaviour every learner already had.
 */
export async function roadmapV2SettingFor(
  tenantId: string,
  studentId: string,
  stageKey: string,
): Promise<{ dailyMinutes: number; revisionDays: number } | null> {
  try {
    const cfg = await PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any;
    return roadmapV2For(cfg?.roadmapV2, studentId, stageKey)
      ? (({ dailyMinutes, revisionDays }) => ({ dailyMinutes, revisionDays }))(resolveRoadmapV2(cfg?.roadmapV2))
      : null;
  } catch (e: any) {
    console.error('[roadmap-v2] could not read the setting — composing with V1:', e?.message || e);
    return null;
  }
}
