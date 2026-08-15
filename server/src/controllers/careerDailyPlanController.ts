import { Request, Response } from 'express';
import User from '../models/User';
import { getTodaysPlan, DailyPlanUnavailableResult } from '../services/dailyMissionOrchestrator';
import { completeCareerMission } from '../services/careerMissionCompletionService';
import { processGamificationEvent, evaluateRoadmapBadges } from '../services/gamificationEngine';

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
 * IDEMPOTENT, AND SAFE UNDER CONCURRENCY. The completion is claimed with a single
 * conditional update whose filter requires the key to be absent, so a double-clicked button,
 * a retried request and two tabs firing at once all produce one completion, one XP award and
 * one unit of roadmap progress — including when they arrive simultaneously.
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

    /**
     * One conditional update, so a race cannot award twice.
     *
     * Read-modify-write was not enough here: two simultaneous requests both loaded a
     * document with no completion, both added one, and both saved. The guard and the write
     * are now a single operation the database arbitrates.
     *
     * The traceability is written with the completion rather than after it — roadmap
     * progress is attributed by these ids and never by matching a display title, and the
     * minutes are the server's own figure for the slice, so a caller cannot claim to have
     * finished the whole roadmap in one request.
     */
    const outcome = await completeCareerMission({
      tenantId, studentId,
      day: plan.roadmapDay,
      key,
      trace: {
        roadmapId: mission.roadmapId,
        objectiveSequence: mission.objectiveSequence,
        skillKey: mission.skillKey,
        workType: mission.workType,
        minutes: mission.plannedMinutes,
      },
      startDate: user?.passport?.activatedAt,
    });

    /**
     * XP is decided by the gamification engine, not here.
     *
     * The amount is configurable per tenant, so this states what the student DID and the
     * engine resolves what it is worth, ledgers it and moves the streak. Raised only on a
     * genuinely new completion, and idempotent on the mission key besides — a retry that
     * slipped past the claim still could not pay twice.
     *
     * Roadmap progress, Skill DNA and readiness are all untouched by this call.
     */
    const award = outcome.newlyCompleted
      ? await processGamificationEvent({
          tenantId, studentId,
          eventKey: 'CAREER_MISSION_COMPLETED',
          sourceType: 'mission', sourceId: key,
          metadata: { skillKey: mission.skillKey, workType: mission.workType },
        })
      : null;

    // Roadmap progress may have crossed a badge threshold; checked only after real progress.
    const roadmapBadges = outcome.newlyCompleted
      ? await evaluateRoadmapBadges(tenantId, studentId)
      : [];

    const after = await getTodaysPlan(tenantId, studentId);

    res.json({
      completed: true,
      // False when another request got there first. The mission is done either way, and
      // nothing was awarded twice.
      newlyCompleted: outcome.newlyCompleted,
      xpAwarded: award?.awarded || 0,
      xp: award?.xpTotal ?? null,
      streak: award?.streak ?? null,
      badges: [...(award?.badges || []), ...roadmapBadges],
      streakBonus: award?.streakBonus,
      plan: after.available ? after : null,
    });
  } catch (e: any) {
    console.error('[career-plan] complete:', e?.message || e);
    res.status(500).json({ message: 'Could not record that. Please try again.' });
  }
};
