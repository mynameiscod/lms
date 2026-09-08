/**
 * The adaptive plan, over HTTP.
 *
 * OWNERSHIP IS CHECKED, NOT ASSUMED. A student may read their own plan and nobody else's; every
 * other read requires a staff permission. The plan contains a per-skill diagnosis of somebody's
 * weaknesses, which is exactly the kind of thing that must not be reachable by changing an id in
 * a URL.
 *
 * THIN BY DESIGN. Every decision lives in a service; these handlers resolve identity, check
 * permission, call one function and shape a response. Adaptive logic inside a controller is the
 * thing the brief explicitly asks to avoid, and the reason is that it becomes unreachable from
 * every other entry point the moment a second one exists.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { generateAssignment, getActiveAssignment, assessReplanNeed } from '../services/studentCurriculumAssignmentService';
import { replanOnRequest, planHistory } from '../services/curriculumReplanningService';
import { contentGapReport } from '../services/adaptiveContentResolver';
import { resolveDirection, describeDirection } from '../services/careerDirectionService';
import { CAREER_DIRECTIONS } from '../data/careerDirectionPolicy';
import { STATE_ORDER } from '../data/adaptiveCurriculumPolicy';
import LearningCurriculum from '../models/LearningCurriculum';
import User from '../models/User';

const tenantOf = (req: Request): string => String((req as any).tenantId || (req as any).user?.tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * May this caller see this student's plan?
 *
 * A student sees their own. Anyone else needs an explicit permission — and "is staff" is not
 * enough on its own, because a skill-by-skill weakness profile is more sensitive than the
 * enrollment record beside it.
 */
function mayViewStudent(req: Request, studentId: string): boolean {
  if (userIdOf(req) === String(studentId)) return true;
  const perms: string[] = (req as any).user?.permissions || [];
  return perms.includes('view_student_skill_profile')
    || perms.includes('manage_student_skill_profile')
    || perms.includes('manage_curriculum');
}

const fail = (res: Response, code: number, message: string) =>
  res.status(code).json({ success: false, message });

/** GET /adaptive/directions — the picker's options. Public to any signed-in user. */
export const listDirections = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    directions: CAREER_DIRECTIONS.map(d => ({
      key: d.key, name: d.name, blurb: d.blurb, displayOrder: d.displayOrder,
    })),
  });
};

/** GET /adaptive/students/:studentId/direction — what we currently believe, and why. */
export const getDirection = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');

    const user = await User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any;
    if (!user) return fail(res, 404, 'Student not found.');

    const resolved = resolveDirection({
      selectedDirection: user.passport?.selectedDirection,
      primaryRole: user.passport?.primaryRole,
      preferredTechnologies: user.passport?.preferredTechnologies,
    });

    res.json({
      success: true,
      direction: resolved.direction ? { key: resolved.direction.key, name: resolved.direction.name } : null,
      status: resolved.status,
      explorationDirections: resolved.explorationDirections,
      basis: resolved.basis,
      message: describeDirection(resolved),
    });
  } catch (e: any) {
    console.error('[adaptive] getDirection:', e);
    res.status(500).json({ success: false, message: 'Could not read that direction.' });
  }
};

/** GET /adaptive/students/:studentId/plan/:curriculumId — the active plan. */
export const getPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');

    const assignment = await getActiveAssignment(tenantId, studentId, String(req.params.curriculumId)) as any;
    if (!assignment) {
      // Not an error: a student who has not been planned yet is a normal state, and the client
      // needs to tell the difference between that and a failure.
      return res.json({ success: true, plan: null, hasPlan: false });
    }
    res.json({ success: true, hasPlan: true, plan: shapePlan(assignment) });
  } catch (e: any) {
    console.error('[adaptive] getPlan:', e);
    res.status(500).json({ success: false, message: 'Could not load that plan.' });
  }
};

/**
 * POST /adaptive/students/:studentId/plan/:curriculumId/generate
 *
 * Explicit, never implicit. Reading a plan does not create one.
 */
export const generatePlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');

    const result = await generateAssignment({
      tenantId, studentId,
      curriculumId: String(req.params.curriculumId),
      replan: !!req.body?.replan,
      trigger: req.body?.replan ? 'MENTOR_OVERRIDE' : 'DIAGNOSTIC_COMPLETED',
    });

    if (result.refused) return fail(res, 409, refusalMessage(result.refused));

    res.json({
      success: true,
      created: result.created,
      plan: result.assignment ? shapePlan(result.assignment) : null,
      // Surfaced rather than logged: a plan with unteachable skills is a content to-do, and
      // hiding it makes the gap somebody else's surprise.
      contentGaps: result.contentGaps,
    });
  } catch (e: any) {
    console.error('[adaptive] generatePlan:', e);
    res.status(500).json({ success: false, message: 'Could not build that plan.' });
  }
};

/** POST /adaptive/students/:studentId/plan/:curriculumId/replan — the student asked. */
export const replanPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');

    const outcome = await replanOnRequest({
      tenantId, studentId, curriculumId: String(req.params.curriculumId),
    });
    res.json({ success: true, ...outcome });
  } catch (e: any) {
    console.error('[adaptive] replanPlan:', e);
    res.status(500).json({ success: false, message: 'Could not rebuild that plan.' });
  }
};

/** GET /adaptive/students/:studentId/plan/:curriculumId/replan-check — should they? */
export const checkReplan = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');

    const need = await assessReplanNeed(tenantId, studentId, String(req.params.curriculumId));
    res.json({ success: true, ...need });
  } catch (e: any) {
    console.error('[adaptive] checkReplan:', e);
    res.status(500).json({ success: false, message: 'Could not check that plan.' });
  }
};

/** GET /adaptive/students/:studentId/plan/:curriculumId/history — support and audit. */
export const getHistory = async (req: Request, res: Response) => {
  try {
    const studentId = String(req.params.studentId);
    if (!mayViewStudent(req, studentId)) return fail(res, 403, 'Not your plan.');
    const rows = await planHistory(tenantOf(req), studentId, String(req.params.curriculumId));
    res.json({ success: true, versions: rows });
  } catch (e: any) {
    console.error('[adaptive] getHistory:', e);
    res.status(500).json({ success: false, message: 'Could not load that history.' });
  }
};

/**
 * GET /adaptive/curricula/:curriculumId/content-gaps — staff only.
 *
 * The authoring to-do list: which skills this curriculum claims to teach and the library cannot.
 */
export const getContentGaps = async (req: Request, res: Response) => {
  try {
    const perms: string[] = (req as any).user?.permissions || [];
    if (!perms.includes('manage_curriculum') && !perms.includes('manage_learning_content')) {
      return fail(res, 403, 'You do not have permission to view content coverage.');
    }
    const tenantId = tenantOf(req);
    const curriculum = await LearningCurriculum.findOne({ _id: req.params.curriculumId, tenantId })
      .select('title topics').lean() as any;
    if (!curriculum) return fail(res, 404, 'Curriculum not found.');

    const skillKeys = (curriculum.topics || []).flatMap((t: any) => t.skillKeys || []);
    const report = await contentGapReport(tenantId, skillKeys);

    res.json({
      success: true,
      curriculum: curriculum.title,
      totalTopics: (curriculum.topics || []).length,
      mappedTopics: (curriculum.topics || []).filter((t: any) => (t.skillKeys || []).length).length,
      ...report,
    });
  } catch (e: any) {
    console.error('[adaptive] getContentGaps:', e);
    res.status(500).json({ success: false, message: 'Could not build that report.' });
  }
};

/* ------------------------------------------------------------------ *
 * Shaping
 * ------------------------------------------------------------------ */

/**
 * What the client receives.
 *
 * Topics are sorted for reading rather than returned in storage order, and every one carries its
 * reasonText — the answer to "why am I seeing this?" travels with the thing being explained
 * rather than requiring a second call, so no screen can render the plan without it.
 */
function shapePlan(a: any) {
  return {
    id: String(a._id),
    version: a.version,
    stage: a.stage,
    academicYear: a.academicYear,
    direction: a.selectedDirection || null,
    directionStatus: a.directionStatus,
    explorationDirections: a.explorationDirections || [],
    availability: a.availability,
    estimatedWeeks: a.estimatedWeeks,
    totalAssignedMinutes: a.totalAssignedMinutes,
    generatedAt: a.generatedAt,
    lastReplannedAt: a.lastReplannedAt || null,
    summary: summarize(a),
    modules: (a.moduleAssignments || []).map((m: any) => ({
      moduleCode: m.moduleCode,
      moduleName: m.moduleName,
      topics: [...(m.topicAssignments || [])]
        .sort((x: any, y: any) => (STATE_ORDER[x.state] ?? 99) - (STATE_ORDER[y.state] ?? 99)
          || String(x.title).localeCompare(String(y.title)))
        .map((t: any) => ({
          topicId: t.topicId,
          topicCode: t.topicCode,
          title: t.title,
          skillKeys: t.skillKeys,
          state: t.state,
          depth: t.contentDepth,
          practiceCount: t.practiceCount,
          contentIds: (t.assignedContentIds || []).map((id: any) => String(id)),
          mandatory: t.mandatory,
          locked: t.locked,
          lockedBy: t.lockedBy || null,
          why: t.reasonText,
          reason: t.reason,
          score: t.scoreAtAssignment ?? null,
        })),
    })),
  };
}

function summarize(a: any) {
  const counts: Record<string, number> = {};
  for (const m of a.moduleAssignments || []) {
    for (const t of m.topicAssignments || []) counts[t.state] = (counts[t.state] || 0) + 1;
  }
  return counts;
}

const refusalMessage = (code: string): string => {
  switch (code) {
    case 'CURRICULUM_NOT_FOUND': return 'That curriculum no longer exists.';
    default: return 'That plan could not be built.';
  }
};
