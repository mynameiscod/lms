import { Request, Response } from 'express';
import { memberAxes } from '../services/careerStageService';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import { isEntitled } from '../services/passportEntitlementService';
import { ensureContent, poolMapOf, dayNumber } from '../services/passportMissionService';
import { curriculumFor } from '../services/curriculumService';
import { getOrCreateProgress } from '../services/passportXpService';
import { buildRoadmap, toPreview } from '../services/passportRoadmapService';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/**
 * GET /passport/roadmap — the member's full 90-day journey.
 *
 * Free (not yet a member) still gets a real roadmap, trimmed to the 7-day preview
 * window with `locked: true`, so the unlock CTA shows exactly what they're buying
 * rather than an empty page.
 */
export const getRoadmap = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);

    const [user, cfg, content] = await Promise.all([
      User.findById(studentId).select('passport').lean() as any,
      PassportConfig.findOne({ tenantId }).lean(),
      ensureContent(tenantId),
    ]);

    const attempt = await PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any;
    if (!attempt) {
      return res.json({ needsAssessment: true, priceInr: cfg?.priceInr ?? 499 });
    }

    const entitled = isEntitled(cfg?.entitlements as any, user?.passport, 'roadmap_full');

    // Only a paying member has a real journey clock; a free user previews from day 1.
    let startDate: Date | null = null;
    let currentDay = 1;
    let completedKeys = new Set<string>();
    if (entitled) {
      const progress = await getOrCreateProgress(tenantId, studentId, user?.passport?.activatedAt || new Date());
      startDate = progress.startDate;
      currentDay = dayNumber(progress.startDate, new Date());
      completedKeys = new Set(progress.completed.map(c => c.key));
    }

    const full = buildRoadmap({
      attempt, pools: poolMapOf(content.missionPools, memberAxes(user)), pathways: content.pathways,
      curriculum: await curriculumFor(tenantId, attempt?.pathway, user?.passport?.stage),
      stage: memberAxes(user).stage,
      totalDays: content.journeyDays || 90,
      startDate, currentDay, completedKeys,
    });

    res.json({
      roadmap: entitled ? full : toPreview(full, 7),
      entitled,
      priceInr: cfg?.priceInr ?? 499,
      careerScore: attempt.careerScore,
      level: attempt.level,
    });
  } catch (e: any) {
    console.error('[passport] getRoadmap:', e);
    res.status(500).json({ message: e.message || 'Failed to load roadmap' });
  }
};
