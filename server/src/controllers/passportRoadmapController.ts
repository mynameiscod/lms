import { Request, Response } from 'express';
import { memberAxes } from '../services/careerStageService';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportAttempt from '../models/PassportAttempt';
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import { resolveAssessedState } from '../services/memberAssessmentStateService';
import { isEntitled } from '../services/passportEntitlementService';
import { ensureContent, poolMapOf, dayNumber, clampSlots } from '../services/passportMissionService';
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

    /**
     * EITHER instrument counts as being measured.
     *
     * This looked for a PassportAttempt, which only the legacy questionnaire writes — so a
     * member who sat the personalised skill assessment was told to go and take an
     * assessment, on the click straight after reading their measured role readiness. The
     * page even rendered their skill plan above the message telling them they had none.
     */
    const assessed = await resolveAssessedState({
      tenantId, studentId,
      passport: user?.passport,
      categories: categoriesOf(await PassportAssessment.findOne({ tenantId }).lean() as any),
      defaultPathway: content.pathways?.[0] || null,
    });
    if (!assessed.assessed) {
      return res.json({ needsAssessment: true, priceInr: cfg?.priceInr ?? 499 });
    }
    const attempt = assessed.attempt as any;

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
      slotsPerDay: clampSlots((content as any).missionsPerDay),
    });

    res.json({
      roadmap: entitled ? full : toPreview(full, 7),
      entitled,
      priceInr: cfg?.priceInr ?? 499,
      careerScore: assessed.careerScore,
      level: assessed.level,
      /**
       * When their access ends, so the screen can say so rather than let them discover it.
       *
       * The programme length and the membership length are different numbers and were never
       * meant to match: a paying member gets twelve months of access to the same 90-day
       * plan. That only becomes confusing when access is SHORTER than the plan — a demo
       * granted 30 days is shown a 90-day roadmap with nothing to say they cannot finish it.
       *
       * Sent unconditionally; the client decides whether it is worth showing, because only
       * it knows the plan length it ended up rendering.
       */
      accessExpiresAt: user?.passport?.expiresAt || null,
      /** Which instrument this plan was built from, so the screen can say so. */
      assessedVia: assessed.source,
    });
  } catch (e: any) {
    console.error('[passport] getRoadmap:', e);
    res.status(500).json({ message: e.message || 'Failed to load roadmap' });
  }
};
