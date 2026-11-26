import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Tenant from '../models/Tenant';
import User from '../models/User';
import {
  adminOverview, createBatch, updateBatch, deleteBatch, listCourses, saveCourse, publicNextBatch, WebsiteBatchError,
} from '../services/websiteBatchService';

const fail = (res: Response, err: any, fallback: string) =>
  err instanceof WebsiteBatchError
    ? res.status(err.status).json({ success: false, message: err.message })
    : res.status(500).json({ success: false, message: err?.message || fallback });

async function who(req: AuthenticatedRequest) {
  const id = req.user?.id;
  if (!id) return { id: undefined, name: '' };
  const u: any = await User.findById(id).select('firstName lastName').lean().catch(() => null);
  return { id, name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '' };
}

// GET /website-batches
export const getOverview = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await adminOverview(req.tenantId!) }); }
  catch (err: any) { fail(res, err, 'Failed to load website batches'); }
};

// POST /website-batches
export const addBatch = async (req: AuthenticatedRequest, res: Response) => {
  try { res.status(201).json({ success: true, message: 'Batch added', data: await createBatch(req.tenantId!, await who(req), req.body || {}) }); }
  catch (err: any) { fail(res, err, 'Failed to add the batch'); }
};

// PUT /website-batches/:id
export const editBatch = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, message: 'Saved', data: await updateBatch(req.tenantId!, await who(req), req.params.id, req.body || {}) }); }
  catch (err: any) { fail(res, err, 'Failed to save the batch'); }
};

// DELETE /website-batches/:id
export const removeBatch = async (req: AuthenticatedRequest, res: Response) => {
  try { await deleteBatch(req.tenantId!, req.params.id); res.json({ success: true, message: 'Batch removed' }); }
  catch (err: any) { fail(res, err, 'Failed to remove the batch'); }
};

// GET /website-batches/courses
export const getCourses = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await listCourses(req.tenantId!) }); }
  catch (err: any) { fail(res, err, 'Failed to load courses'); }
};

// POST /website-batches/courses  { id?, key?, name?, active? }
export const putCourse = async (req: AuthenticatedRequest, res: Response) => {
  try { await saveCourse(req.tenantId!, req.body || {}); res.json({ success: true, message: 'Saved', data: await listCourses(req.tenantId!) }); }
  catch (err: any) { fail(res, err, 'Failed to save the course'); }
};

/**
 * GET /api/v1/public/:tenantSlug/next-batch[?course=java_full_stack] — read by the public website.
 * Read-only, no personal data; browsers and CDNs may keep it for 60 seconds.
 */
export const getPublicNextBatch = async (req: Request, res: Response) => {
  try {
    const tenant: any = await Tenant.findOne({ slug: String(req.params.tenantSlug || '').toLowerCase(), isActive: true }).select('_id').lean();
    if (!tenant) return res.status(404).json({ success: false, message: 'Not found', data: null });
    const data = await publicNextBatch(String(tenant._id), typeof req.query.course === 'string' ? req.query.course : undefined);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ success: true, message: 'OK', data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Something went wrong', data: null });
  }
};
