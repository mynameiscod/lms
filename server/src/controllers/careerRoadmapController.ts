import { Request, Response } from 'express';
import CareerRoadmap from '../models/CareerRoadmap';
import {
  getActiveRoadmap, generateRoadmap, explainRoadmap, stalenessOf,
  RoadmapOutcome, RoadmapView,
} from '../services/careerRoadmapService';
import { getCareerContext } from '../services/careerContextService';

/**
 * Reading and generating a student's 90-day plan.
 *
 * NOTHING ABOUT THE PLAN COMES FROM THE REQUEST. Not the role, not the gaps, not the
 * capacity, not the student. Every one is resolved server-side from stored data, because a
 * request that could name its own target would let somebody generate a plan against the role
 * they already match, and one that could name its own capacity would let them claim a
 * roadmap built for two hours a day they never intend to spend. The generate endpoints
 * therefore take no parameters at all — there is nothing a caller could legitimately supply.
 *
 * Generation is explicit. No route here creates a plan as a side effect of reading one.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string =>
  String((req as any).user?.id || (req as any).user?._id || '');

/**
 * What a student is allowed to see.
 *
 * The generation report is a debugging artefact — minute-level budgets, drop counts and the
 * arithmetic behind them. Useful to an admin answering "why did this plan come out like
 * this", noise to the person following it. The parts a student needs to understand their own
 * plan — the explanation on every objective, what was deferred and why — are all here.
 */
const studentShape = (view: RoadmapView) => {
  const r = view.roadmap;
  return {
    available: true,
    currentDay: view.currentDay,
    currentWeek: view.currentWeek,
    completed: view.completed,
    outdated: view.outdated,
    outdatedReasons: view.outdatedReasons,
    roadmap: {
      id: String(r._id),
      role: { key: r.roleKey, name: r.roleName },
      policyVersion: r.policyVersion,
      roadmapVersion: r.roadmapVersion,
      startDate: r.startDate,
      endDate: r.endDate,
      roadmapDays: r.roadmapDays,
      weekCount: r.weekCount,
      generatedAt: r.generatedAt,
      planningConfidence: r.planningConfidence,
      capacity: {
        minutesPerDay: r.input.minutesPerDay,
        daysPerWeek: r.input.daysPerWeek,
        weeklyCapacityMinutes: r.capacity.weeklyCapacityMinutes,
        plannedMinutes: r.capacity.plannedMinutes,
      },
      basis: {
        readiness: r.input.readiness,
        coverage: r.input.coverage,
        careerStage: r.input.careerStage,
        entitlementLimited: r.input.entitlementLimited,
      },
      phases: r.phases,
      objectives: (r.objectives || []).map(o => ({
        skillKey: o.skillKey,
        skillName: o.skillName,
        workType: o.workType,
        plannedMinutes: o.plannedMinutes,
        phase: o.phase,
        week: o.week,
        sequence: o.sequence,
        reasonCode: o.reasonCode,
        targetLevel: o.targetLevel,
        explanation: o.explanation,
        origin: o.origin,
      })),
      deferred: r.deferred,
      summary: {
        objectives: (r.objectives || []).length,
        deferred: (r.deferred || []).length,
        skills: new Set((r.objectives || []).map(o => o.skillKey)).size,
      },
    },
  };
};

const shape = (outcome: RoadmapOutcome) =>
  outcome.available ? studentShape(outcome) : outcome;

/** GET /passport/me/roadmap — the caller's own plan, or why they do not have one. */
export const getMyRoadmap = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    res.json(shape(await getActiveRoadmap(tenantId, studentId)));
  } catch (e: any) {
    console.error('[career-roadmap] me:', e?.message || e);
    res.status(500).json({ message: 'Could not load your roadmap.' });
  }
};

/**
 * POST /passport/me/roadmap/generate — build the first plan.
 *
 * Safe to call twice: an active plan is returned as it stands rather than replaced, so a
 * double-clicked button cannot cost a student the plan they were halfway through.
 */
export const generateMyRoadmap = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const result = await generateRoadmap(tenantId, studentId, { actor: 'STUDENT' });
    if (!result.outcome.available) return res.status(400).json(result.outcome);

    res.json({ ...studentShape(result.outcome), created: result.created, refused: result.refused });
  } catch (e: any) {
    console.error('[career-roadmap] generate:', e?.message || e);
    res.status(500).json({ message: 'Could not build your roadmap.' });
  }
};

/**
 * POST /passport/me/roadmap/replan — replace the active plan with one built from today.
 *
 * The old plan is kept and marked superseded, never deleted: what a student was asked to do
 * in March is part of their record, and a replan that erased it would make progress
 * impossible to talk about.
 */
export const replanMyRoadmap = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const result = await generateRoadmap(tenantId, studentId, { actor: 'STUDENT', replan: true });
    if (!result.outcome.available) return res.status(400).json(result.outcome);

    // A finished programme is not replanned into another one. Renewal is a separate
    // decision, and making it here would quietly give away a second 90 days.
    if (result.refused === 'PROGRAM_WINDOW_COMPLETED') {
      return res.status(409).json({
        ...studentShape(result.outcome),
        refused: result.refused,
        message: 'This 90-day plan has finished. Starting another one is a renewal, not a replan.',
      });
    }

    res.json({ ...studentShape(result.outcome), created: result.created });
  } catch (e: any) {
    console.error('[career-roadmap] replan:', e?.message || e);
    res.status(500).json({ message: 'Could not rebuild your roadmap.' });
  }
};

/**
 * GET /passport/students/:studentId/roadmap — admin view.
 *
 * The whole document plus the workings and the history, so "why did these two students get
 * different plans?" is answerable from the same numbers the planner saw. Tenant-scoped: a
 * student id from another tenant resolves to nothing.
 */
export const getStudentRoadmap = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);

    const [active, history, context] = await Promise.all([
      CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' }),
      CareerRoadmap.find({ tenantId, studentId })
        .select('roleKey roleName status roadmapVersion policyVersion startDate endDate generatedAt generationReason planningConfidence supersededAt')
        .sort({ generatedAt: -1 }).limit(20).lean(),
      getCareerContext(tenantId, studentId),
    ]);

    if (!active) return res.json({ available: false, reason: 'NO_ROADMAP', history });

    res.json({
      available: true,
      roadmap: active,
      outdatedReasons: stalenessOf(active, context),
      workings: explainRoadmap(active),
      history,
    });
  } catch (e: any) {
    console.error('[career-roadmap] student:', e?.message || e);
    res.status(500).json({ message: 'Could not load that member’s roadmap.' });
  }
};
