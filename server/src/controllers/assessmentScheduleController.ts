import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AssessmentSchedule from '../models/AssessmentSchedule';
import Assignment from '../models/Assignment';
import Quiz from '../models/Quiz';
import Batch from '../models/Batch';
import { mergePolicy, DEFAULT_POLICY } from '../services/deadlinePolicyService';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId = (req: Request): string => (req as any).user?.id || '';
const role = (req: Request): string => (req as any).user?.role || '';
const canManage = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(role(req));

async function contentTitleOf(type: string, id: string): Promise<string> {
  try {
    if (type === 'assignment') return (await Assignment.findById(id).select('title').lean() as any)?.title || '';
    if (type === 'quiz') return (await Quiz.findById(id).select('title').lean() as any)?.title || '';
  } catch { /* ignore */ }
  return '';
}

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
    if (!canManage(req)) return res.status(403).json({ message: 'Not allowed' });
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

    // Denormalize batch names for the ones we weren't given.
    const missingNameIds = batches.filter((b: any) => b.batchId && !b.batchName).map((b: any) => b.batchId);
    const nameMap: Record<string, string> = {};
    if (missingNameIds.length) {
      const found = await Batch.find({ _id: { $in: missingNameIds } }).select('name').lean();
      found.forEach((b: any) => { nameMap[String(b._id)] = b.name; });
    }

    const results = [];

    // Individual delivery: one row per content (batchId absent), studentIds accumulated.
    if (hasStudents) {
      const p = mergePolicy(DEFAULT_POLICY, policy);
      const row = await AssessmentSchedule.findOneAndUpdate(
        { contentType, contentId, batchId: null },
        { $set: {
            tenantId: tId, contentType, contentId, contentTitle: title, batchId: null,
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
      const row = await AssessmentSchedule.findOneAndUpdate(
        { contentType, contentId, batchId: b.batchId },
        {
          $set: {
            tenantId: tId,
            contentType, contentId, contentTitle: title,
            batchId: b.batchId,
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
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign', error: String(err) });
  }
};

/** PATCH /assessment-schedules/:id — change one batch's window / policy. */
export const updateSchedule = async (req: Request, res: Response) => {
  try {
    if (!canManage(req)) return res.status(403).json({ message: 'Not allowed' });
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
    if (!canManage(req)) return res.status(403).json({ message: 'Not allowed' });
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
    if (!canManage(req)) return res.status(403).json({ message: 'Not allowed' });
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
