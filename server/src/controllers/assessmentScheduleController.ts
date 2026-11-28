import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AssessmentSchedule from '../models/AssessmentSchedule';
import Assignment from '../models/Assignment';
import Quiz from '../models/Quiz';
import Batch from '../models/Batch';
import User from '../models/User';
import { allowedByRoleOrPermission } from '../middleware/roleGuard';
import { mergePolicy, DEFAULT_POLICY } from '../services/deadlinePolicyService';
import { notifyAssignedInBackground, AssignedTarget } from '../services/assessmentAssignNotify';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId = (req: Request): string => (req as any).user?.id || '';
const role = (req: Request): string => (req as any).user?.role || '';
const canManage = (req: Request) =>
  allowedByRoleOrPermission((req as any).user, ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'], ['manage_skill_assessment', 'create_quiz', 'edit_quiz', 'manage_assignments', 'manage_tenant']);

async function contentTitleOf(type: string, id: string): Promise<string> {
  try {
    if (type === 'assignment') return (await Assignment.findById(id).select('title').lean() as any)?.title || '';
    if (type === 'quiz') return (await Quiz.findById(id).select('title').lean() as any)?.title || '';
  } catch { /* ignore */ }
  return '';
}

/**
 * GET /assessment-schedules/students?search=
 * Students to pick from in "Assign → Specific students". Same permission as assigning itself, so a role
 * with only quiz/assignment permissions can pick a student (it used /activity/students, which needs
 * the Activity Logs or Reports permission).
 */
export const searchStudents = async (req: Request, res: Response) => {
  try {
    if (!(await canManage(req))) return res.status(403).json({ success: false, message: 'Not allowed' });
    const q: any = { tenantId: tenantId(req), role: 'STUDENT' };
    const s = String(req.query.search || '').trim().slice(0, 60);
    if (s) {
      const rx = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }
    const students = await User.find(q).select('firstName lastName email batchId').sort({ firstName: 1 }).limit(50).lean();
    res.json({ success: true, data: students });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load students' });
  }
};

/**
 * GET /assessment-schedules?contentType=&contentId=&batchId=
 * List schedule rows (which batches an assessment is delivered to, or what's on a batch).
 */
export const listSchedules = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tenantId(req) };
    if (req.query.contentType) filter.contentType = req.query.contentType;
    if (req.query.contentId) filter.contentId = req.query.contentId;
    if (req.query.batchId) filter.batchId = req.query.batchId;
    if (req.query.status) filter.status = req.query.status;
    const rows = await AssessmentSchedule.find(filter).sort({ dueAt: 1, createdAt: -1 }).lean();
    res.json({ schedules: rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list schedules', error: String(err) });
  }
};

/**
 * POST /assessment-schedules/assign
 * Body: { contentType, contentId, contentTitle?, policy?, batches: [{ batchId, batchName?,
 *         startAt?, dueAt?, latePolicy?, graceDays?, penaltyPct?, dueTime? }] }
 * Upserts one schedule row per batch — this is the reuse flow that replaces "Clone".
 */
export const assignToBatches = async (req: Request, res: Response) => {
  try {
    if (!(await canManage(req))) return res.status(403).json({ message: 'Not allowed' });
    const tId = tenantId(req);
    const { contentType, contentId, policy, batches, students } = req.body || {};
    if (!['assignment', 'quiz'].includes(contentType) || !contentId) {
      return res.status(400).json({ message: 'contentType (assignment|quiz) and contentId are required' });
    }
    const hasBatches = Array.isArray(batches) && batches.length > 0;
    const hasStudents = Array.isArray(students) && students.length > 0;
    if (!hasBatches && !hasStudents) {
      return res.status(400).json({ message: 'Select at least one batch or student' });
    }
    const title = req.body.contentTitle || (await contentTitleOf(contentType, contentId));

    // Denormalize batch names for the ones we weren't given. (batches may be absent
    // when assigning to specific students only.)
    const missingNameIds = (hasBatches ? batches : []).filter((b: any) => b.batchId && !b.batchName).map((b: any) => b.batchId);
    const nameMap: Record<string, string> = {};
    if (missingNameIds.length) {
      const found = await Batch.find({ _id: { $in: missingNameIds } }).select('name').lean();
      found.forEach((b: any) => { nameMap[String(b._id)] = b.name; });
    }

    const results = [];

    // Individual delivery: one row per content (batchId absent), studentIds accumulated.
    // NOTE: filter fields (contentType/contentId/batchId) must NOT also appear in $set —
    // during an upsert-insert MongoDB treats that as a path conflict and errors.
    // Who is newly reached by this save — only they are emailed. A batch or student that was
    // already assigned (and active) is not told again when dates or the policy change.
    const fresh: AssignedTarget[] = [];

    if (hasStudents) {
      const p = mergePolicy(DEFAULT_POLICY, policy);
      const before: any = await AssessmentSchedule.findOne({ contentType, contentId, batchId: null }).select('status studentIds').lean();
      const already = new Set<string>(before?.status === 'active' ? (before.studentIds || []).map(String) : []);
      const newStudents = (students as any[]).map(String).filter(id => !already.has(id));
      if (newStudents.length) fresh.push({ studentIds: newStudents, startAt: req.body.startAt || null, dueAt: req.body.dueAt || null });
      const row = await AssessmentSchedule.findOneAndUpdate(
        { contentType, contentId, batchId: null },
        { $set: {
            tenantId: tId, contentTitle: title,
            studentIds: students,
            startAt: req.body.startAt ? new Date(req.body.startAt) : undefined,
            dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
            latePolicy: p.latePolicy, graceDays: p.graceDays, penaltyPct: p.penaltyPct, dueTime: p.dueTime,
            source: 'standalone', status: 'active', createdBy: userId(req),
        } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(row);
    }

    for (const b of (hasBatches ? batches : [])) {
      if (!b.batchId) continue;
      const p = mergePolicy(DEFAULT_POLICY, policy, b);
      const before: any = await AssessmentSchedule.findOne({ contentType, contentId, batchId: b.batchId }).select('status').lean();
      if (before?.status !== 'active') {
        fresh.push({ batchId: String(b.batchId), batchName: b.batchName || nameMap[String(b.batchId)] || undefined, startAt: b.startAt || null, dueAt: b.dueAt || null });
      }
      const row = await AssessmentSchedule.findOneAndUpdate(
        { contentType, contentId, batchId: b.batchId },
        {
          $set: {
            tenantId: tId,
            contentTitle: title,
            batchName: b.batchName || nameMap[String(b.batchId)] || undefined,
            startAt: b.startAt ? new Date(b.startAt) : undefined,
            dueAt: b.dueAt ? new Date(b.dueAt) : undefined,
            latePolicy: p.latePolicy, graceDays: p.graceDays, penaltyPct: p.penaltyPct, dueTime: p.dueTime,
            source: 'standalone',
            status: 'active',
            createdBy: userId(req),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(row);
    }
    res.json({ message: `Assigned to ${results.length} batch(es)`, schedules: results });
    // After the response: emailing a big batch is paced and takes a while.
    notifyAssignedInBackground(tId, contentType, String(contentId), fresh);
  } catch (err) {
    console.error('[assessment-schedules/assign] failed:', err);
    res.status(500).json({ message: 'Failed to assign', error: String((err as any)?.message || err) });
  }
};

/** PATCH /assessment-schedules/:id — change one batch's window / policy. */
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    if (!(await canManage(req))) return res.status(403).json({ message: 'Not allowed' });
    const allowed = ['startAt', 'dueAt', 'latePolicy', 'graceDays', 'penaltyPct', 'dueTime', 'status'];
    const $set: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) $set[k] = (k === 'startAt' || k === 'dueAt') && req.body[k] ? new Date(req.body[k]) : req.body[k];
    const row = await AssessmentSchedule.findOneAndUpdate(
      { _id: req.params.id, tenantId: tenantId(req) }, { $set }, { new: true }
    );
    if (!row) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ schedule: row });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update schedule', error: String(err) });
  }
};

/**
 * POST /assessment-schedules/extend
 * Body: { ids?: string[], contentType?, contentId?, batchId?, days }
 * Push dueAt forward by N days for a batch/cohort — the "extend deadline" lever.
 */
export const extendSchedules = async (req: Request, res: Response) => {
  try {
    if (!(await canManage(req))) return res.status(403).json({ message: 'Not allowed' });
    const days = Number(req.body.days);
    if (!days || Number.isNaN(days)) return res.status(400).json({ message: 'days is required' });
    const filter: any = { tenantId: tenantId(req) };
    if (Array.isArray(req.body.ids) && req.body.ids.length) filter._id = { $in: req.body.ids };
    else {
      if (req.body.contentType) filter.contentType = req.body.contentType;
      if (req.body.contentId) filter.contentId = req.body.contentId;
      if (req.body.batchId) filter.batchId = req.body.batchId;
    }
    const rows = await AssessmentSchedule.find(filter).select('_id dueAt');
    let n = 0;
    for (const r of rows) {
      if (!r.dueAt) continue;
      const d = new Date(r.dueAt); d.setDate(d.getDate() + days);
      await AssessmentSchedule.updateOne({ _id: r._id }, { $set: { dueAt: d } });
      n++;
    }
    res.json({ message: `Extended ${n} schedule(s) by ${days} day(s)`, updated: n });
  } catch (err) {
    res.status(500).json({ message: 'Failed to extend', error: String(err) });
  }
};

/** DELETE /assessment-schedules/:id — unassign an assessment from a batch. */
export const removeSchedule = async (req: Request, res: Response) => {
  try {
    if (!(await canManage(req))) return res.status(403).json({ message: 'Not allowed' });
    const r = await AssessmentSchedule.findOneAndDelete({ _id: req.params.id, tenantId: tenantId(req) });
    if (!r) return res.status(404).json({ message: 'Schedule not found' });
    res.json({ message: 'Unassigned' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove', error: String(err) });
  }
};

// Exported for reuse by student-facing resolvers.
export async function schedulesForBatch(tId: string, batchId: string) {
  return AssessmentSchedule.find({ tenantId: tId, batchId, status: 'active' }).lean();
}
export async function scheduleFor(tId: string, contentType: string, contentId: string, batchId: string) {
  return AssessmentSchedule.findOne({ tenantId: tId, contentType, contentId, batchId }).lean();
}

void mongoose;
