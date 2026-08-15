import { Request, Response } from 'express';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import AuditLog from '../models/AuditLog';
import {
  evaluateReassessmentEligibility, startReassessment,
} from '../services/reassessmentService';
import {
  evaluateRoadmapReplanNeed, getReassessmentResult,
} from '../services/replanRecommendationService';

/**
 * Skill check-ins, and the recommendation that follows one.
 *
 * THE STUDENT ASKS; THEY DO NOT SPECIFY. There is no parameter through which a caller can
 * name the skills to be tested, the question count, a score, or whether they are eligible.
 * All of it is resolved server-side — a request that could choose its own targets would let
 * somebody sit the paper they already know the answers to.
 *
 * NOTHING HERE REPLANS. The result of a check-in is a comparison and, at most, a
 * recommendation. The roadmap changes only through Module 9's existing replan endpoint, and
 * only when the student asks for it.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/reassessment/status */
export const getReassessmentStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    res.json(await evaluateReassessmentEligibility(tenantId, studentId));
  } catch (e: any) {
    console.error('[reassessment] status:', e?.message || e);
    res.status(500).json({ message: 'Could not check your skill check-in.' });
  }
};

/**
 * POST /passport/me/reassessment/start
 *
 * Safe to call twice: an open attempt is resumed rather than replaced, and the one-open-
 * attempt index arbitrates a genuine race.
 */
export const startMyReassessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const result = await startReassessment({ tenantId, studentId });

    if (!result.ok) {
      // Waiting out a cooldown is a normal state, not an error — 409 rather than 4xx noise.
      return res.status(result.blocker === 'MEMBERSHIP_REQUIRED' ? 403 : 409).json({
        code: result.blocker, message: result.message,
      });
    }

    res.status(result.resumed ? 200 : 201).json({
      attemptId: result.attemptId,
      resumed: !!result.resumed,
      targetSkills: result.targetSkills || [],
    });
  } catch (e: any) {
    console.error('[reassessment] start:', e?.message || e);
    res.status(500).json({ message: 'Could not start your skill check-in.' });
  }
};

/** GET /passport/me/reassessment/:attemptId/result — the frozen before/after comparison. */
export const getMyReassessmentResult = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);

    // Scoped to the caller, so an attempt id from elsewhere resolves to nothing.
    const result = await getReassessmentResult(tenantId, studentId, String(req.params.attemptId));
    if (!result) return res.status(404).json({ message: 'Check-in not found.' });
    if (!result.ok) return res.json({ ok: false, message: 'Your results are still being prepared.' });

    res.json(result);
  } catch (e: any) {
    console.error('[reassessment] result:', e?.message || e);
    res.status(500).json({ message: 'Could not load your results.' });
  }
};

/** GET /passport/me/reassessment/history — past check-ins, newest first. */
export const getMyReassessmentHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const rows = await PersonalizedAssessment.find({
      tenantId, studentId, status: 'SUBMITTED', purpose: 'REASSESSMENT',
    }).sort({ submittedAt: -1 }).limit(limit)
      .select('submittedAt targetSkillKeys beforeSnapshot afterSnapshot').lean() as any[];

    res.json({
      history: rows.map(r => ({
        attemptId: String(r._id),
        completedAt: r.submittedAt,
        targetSkillKeys: r.targetSkillKeys || [],
        // Each entry reports what THAT sitting found — frozen, not recomputed from today.
        readinessBefore: r.beforeSnapshot?.readiness ?? null,
        readinessAfter: r.afterSnapshot?.readiness ?? null,
      })),
    });
  } catch (e: any) {
    console.error('[reassessment] history:', e?.message || e);
    res.status(500).json({ message: 'Could not load your check-in history.' });
  }
};

/**
 * GET /passport/me/roadmap/replan-status
 *
 * Informational. The student may act on it, and when they do, Module 9 re-derives everything
 * from current state rather than trusting whatever this returned.
 */
export const getReplanStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    res.json(await evaluateRoadmapReplanNeed(tenantId, studentId));
  } catch (e: any) {
    console.error('[reassessment] replan status:', e?.message || e);
    res.status(500).json({ message: 'Could not check your roadmap.' });
  }
};

// ── admin ───────────────────────────────────────────────────────────────────

/** GET /passport/students/:studentId/reassessment — one member's check-in record. */
export const getStudentReassessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);

    const [status, replan, history] = await Promise.all([
      evaluateReassessmentEligibility(tenantId, studentId),
      evaluateRoadmapReplanNeed(tenantId, studentId),
      PersonalizedAssessment.find({ tenantId, studentId, status: 'SUBMITTED' })
        .sort({ submittedAt: -1 }).limit(20)
        .select('purpose submittedAt targetSkillKeys triggerReasons beforeSnapshot afterSnapshot')
        .lean() as any,
    ]);

    res.json({ status, replan, history });
  } catch (e: any) {
    console.error('[reassessment] admin:', e?.message || e);
    res.status(500).json({ message: 'Could not load that member’s check-ins.' });
  }
};

/**
 * POST /passport/students/:studentId/reassessment/override
 *
 * Opens a check-in before the cooldown has elapsed. It cannot bypass a missing first
 * assessment or a lapsed membership — those are missing prerequisites, not waiting periods —
 * and it is audited, because it is a deliberate act on somebody else's account.
 */
export const overrideReassessment = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    const adminId = String((req as any).user?.id || '');

    const result = await startReassessment({ tenantId, studentId, adminOverride: true });

    await AuditLog.create({
      tenantId, userId: adminId,
      action: 'careerpilot.reassessment.override',
      details: { studentId, ok: result.ok, blocker: result.blocker },
      timestamp: new Date(),
    } as any).catch(() => { /* a failed log must not undo the action */ });

    if (!result.ok) return res.status(409).json({ code: result.blocker, message: result.message });
    res.json({ attemptId: result.attemptId, resumed: !!result.resumed });
  } catch (e: any) {
    console.error('[reassessment] override:', e?.message || e);
    res.status(500).json({ message: 'Could not open a check-in for that member.' });
  }
};
