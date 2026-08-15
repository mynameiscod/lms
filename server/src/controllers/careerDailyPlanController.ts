import { Request, Response } from 'express';
import PassportProgress from '../models/PassportProgress';
import User from '../models/User';
import { getTodaysPlan, DailyPlanUnavailableResult } from '../services/dailyMissionOrchestrator';
import { completeMissionOnce } from '../services/passportXpService';

/**
 * Today's CareerPilot plan, and completing a piece of it.
 *
 * THE SERVER DECIDES THE LIST. A caller sends a key and nothing else — not the minutes, not
 * the skill, not the objective, not the roadmap. Every one of those is re-derived from the
 * student's own active roadmap before anything is written, so a crafted request cannot
 * credit forty minutes against an objective it likes or claim work on somebody else's plan.
 *
 * COMPLETION IS NOT EVIDENCE. This path writes a completion record and lets the existing XP
 * and streak behaviour run. It does not touch StudentSkillProfile, StudentSkillEvidence or
 * anything Module 7 owns, and there is no field on this route through which it could.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/plan/today */
export const getMyDailyPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const plan = await getTodaysPlan(tenantId, studentId);
    if (!plan.available) {
      const un = plan as DailyPlanUnavailableResult;
      // A membership problem is an access answer; the rest are ordinary states of the
      // journey and not errors at all.
      return res.status(un.reason === 'MEMBERSHIP_REQUIRED' ? 403 : 200).json(un);
    }

    res.json(plan);
  } catch (e: any) {
    console.error('[career-plan] today:', e?.message || e);
    res.status(500).json({ message: 'Could not load today’s plan.' });
  }
};

/**
 * POST /passport/me/plan/complete — mark one of today's missions done.
 *
 * IDEMPOTENT. completeMissionOnce refuses a key it has already recorded, which is the same
 * guarantee the legacy daily missions rely on: a double-clicked button, a retried request
 * and a duplicated tab all produce one completion, one XP award and one unit of roadmap
 * progress.
 */
export const completeMyDailyMission = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const key = String(req.body?.key || '').trim();
    if (!key) return res.status(400).json({ message: 'Which mission?' });

    // Re-derived, not trusted. The mission must be on TODAY's plan for THIS student — which
    // simultaneously rejects another student's key, yesterday's key, a key from a superseded
    // roadmap, and any objective the roadmap does not currently schedule.
    const plan = await getTodaysPlan(tenantId, studentId);
    if (!plan.available) {
      const un = plan as DailyPlanUnavailableResult;
      return res.status(un.reason === 'MEMBERSHIP_REQUIRED' ? 403 : 409).json(un);
    }

    const mission = plan.missions.find(m => m.key === key);
    if (!mission) return res.status(400).json({ message: 'That mission is not on today’s plan.' });

    const user: any = await User.findOne({ _id: studentId, tenantId }).select('passport').lean();
    let progress = await PassportProgress.findOne({ tenantId, studentId });
    if (!progress) {
      progress = await PassportProgress.create({
        tenantId, studentId, startDate: user?.passport?.activatedAt || new Date(),
      });
    }

    /**
     * XP is INHERITED, not chosen.
     *
     * Passing 0 lets addXp apply the same default the existing mission path already uses.
     * Naming a number here would be introducing a new XP amount, which is explicitly future
     * work — gamification is not being redesigned by this module.
     */
    const newly = completeMissionOnce(progress, plan.roadmapDay, key, 0, new Date());

    if (newly) {
      // Traceability recorded at the moment of completion. Roadmap progress is attributed by
      // these ids and never by matching a display title, which would break the first time
      // somebody renamed a skill.
      const rec = progress.completed.find(c => c.key === key);
      if (rec) {
        rec.careerpilot = {
          roadmapId: mission.roadmapId,
          objectiveSequence: mission.objectiveSequence,
          skillKey: mission.skillKey,
          workType: mission.workType,
          // The server's own figure for this slice. A client-supplied duration would let
          // somebody complete the whole roadmap in one request.
          minutes: mission.plannedMinutes,
        };
      }
      await progress.save();
    }

    const after = await getTodaysPlan(tenantId, studentId);

    res.json({
      completed: true,
      // False on a retry. The mission is done either way, and nothing was awarded twice.
      newlyCompleted: newly,
      xp: progress.xp,
      streak: progress.streak,
      plan: after.available ? after : null,
    });
  } catch (e: any) {
    console.error('[career-plan] complete:', e?.message || e);
    res.status(500).json({ message: 'Could not record that. Please try again.' });
  }
};
