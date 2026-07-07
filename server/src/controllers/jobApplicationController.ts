import { Request, Response } from 'express';
import JobApplication, { JOB_STATUSES, JobStatus } from '../models/JobApplication';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

// Fields a student is allowed to set/update on an application.
const EDITABLE = [
  'company', 'role', 'location', 'workMode', 'jobUrl', 'salary', 'source',
  'appliedAt', 'contactName', 'contactEmail', 'nextAction', 'nextActionAt', 'notes',
] as const;

function pickEditable(body: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of EDITABLE) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

// GET /job-applications — all of the student's applications (client groups by status).
export const listApplications = async (req: Request, res: Response) => {
  try {
    const applications = await JobApplication.find({ tenantId: tId(req), studentId: uId(req) })
      .sort({ status: 1, order: 1, createdAt: -1 })
      .lean();
    const stats = JOB_STATUSES.reduce((acc, s) => {
      acc[s] = applications.filter((a) => a.status === s).length;
      return acc;
    }, {} as Record<string, number>);
    res.json({ applications, stats, total: applications.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list applications', error: String(err) });
  }
};

// POST /job-applications — add an application (defaults to the wishlist column).
export const createApplication = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.company || !b.role) return res.status(400).json({ message: 'company and role are required' });
    const status: JobStatus = JOB_STATUSES.includes(b.status) ? b.status : 'wishlist';
    // New card goes to the top of its column.
    const min = await JobApplication.findOne({ tenantId: tId(req), studentId: uId(req), status }).sort({ order: 1 }).lean();
    const order = (min?.order ?? 0) - 1;
    const appliedAt = status !== 'wishlist' && !b.appliedAt ? new Date() : b.appliedAt;
    const created = await JobApplication.create({
      ...pickEditable(b),
      tenantId: tId(req),
      studentId: uId(req),
      status,
      appliedAt,
      order,
    });
    res.status(201).json({ application: created });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create application', error: String(err) });
  }
};

// PATCH /job-applications/:id — edit fields.
export const updateApplication = async (req: Request, res: Response) => {
  try {
    const updated = await JobApplication.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId(req), studentId: uId(req) },
      { $set: pickEditable(req.body || {}) },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update application', error: String(err) });
  }
};

// PATCH /job-applications/:id/move — change status column (and optionally position).
export const moveApplication = async (req: Request, res: Response) => {
  try {
    const { status, order } = req.body || {};
    if (!JOB_STATUSES.includes(status)) return res.status(400).json({ message: 'invalid status' });
    const app = await JobApplication.findOne({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    const movedIntoApplied = app.status === 'wishlist' && status !== 'wishlist';
    app.status = status;
    if (typeof order === 'number') app.order = order;
    if (movedIntoApplied && !app.appliedAt) app.appliedAt = new Date();
    await app.save();
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: 'Failed to move application', error: String(err) });
  }
};

// DELETE /job-applications/:id
export const deleteApplication = async (req: Request, res: Response) => {
  try {
    const del = await JobApplication.findOneAndDelete({ _id: req.params.id, tenantId: tId(req), studentId: uId(req) });
    if (!del) return res.status(404).json({ message: 'Application not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete application', error: String(err) });
  }
};
