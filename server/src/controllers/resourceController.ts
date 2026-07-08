import { Request, Response } from 'express';
import crypto from 'crypto';
import Resource, { ResourceVisibility } from '../models/Resource';
import ResourceRequest from '../models/ResourceRequest';
import ResourceAudit, { ResourceAuditAction } from '../models/ResourceAudit';
import User from '../models/User';
import * as bunny from '../services/bunnyStorageService';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const uRole = (req: Request) => (req as any).user?.role as string;
const uName = (req: Request) => {
  const u = (req as any).user || {};
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '';
};
const ipOf = (req: Request) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
const safeName = (s: string) => s.replace(/[^\w.\-]+/g, '_').slice(0, 120);

async function audit(req: Request, resource: any, action: ResourceAuditAction, meta?: any) {
  try {
    await ResourceAudit.create({
      tenantId: tId(req), resourceId: resource._id, resourceTitle: resource.title,
      actorId: uId(req) || undefined, actorName: uName(req), actorRole: uRole(req),
      action, meta, ip: ipOf(req),
    });
  } catch { /* audit is best-effort, never block */ }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /resources/admin — all resources for the tenant + pending-request counts.
export const listAdmin = async (req: Request, res: Response) => {
  try {
    const resources = await Resource.find({ tenantId: tId(req) }).sort({ createdAt: -1 }).lean();
    const pending = await ResourceRequest.aggregate([
      { $match: { tenantId: tId(req), status: 'requested' } },
      { $group: { _id: '$resourceId', n: { $sum: 1 } } },
    ]);
    const pendingMap: Record<string, number> = {};
    pending.forEach((p: any) => { pendingMap[String(p._id)] = p.n; });
    res.json({ resources: resources.map((r) => ({ ...r, pendingRequests: pendingMap[String(r._id)] || 0 })) });
  } catch (err) { res.status(500).json({ message: 'Failed to load resources', error: String(err) }); }
};

// POST /resources/admin — create a resource with uploaded file(s). multipart/form-data.
export const createResource = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ message: 'title is required' });
    if (!bunny.isBunnyStorageConfigured()) return res.status(400).json({ message: 'Bunny Storage is not configured. Add the Storage Zone + AccessKey in Platform Settings → Storage.' });

    const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
    const resource = await Resource.create({
      tenantId: tId(req), title: b.title, description: b.description,
      resourceType: b.resourceType || 'project',
      tags: arr(b.tags), techStack: arr(b.techStack),
      difficulty: b.difficulty || undefined, targetRole: b.targetRole || undefined,
      visibility: (['public', 'portal', 'approval'].includes(b.visibility) ? b.visibility : 'portal') as ResourceVisibility,
      status: 'draft', createdBy: uId(req), files: [],
    });

    const files = (req.files as Express.Multer.File[]) || [];
    for (const f of files) {
      const fileId = crypto.randomBytes(6).toString('hex');
      const storageKey = `resources/${tId(req)}/${resource._id}/${fileId}-${safeName(f.originalname)}`;
      await bunny.uploadFile(storageKey, f.buffer, f.mimetype);
      resource.files.push({
        fileId, fileName: f.originalname, storageKey, sizeBytes: f.size,
        mimeType: f.mimetype, version: 1, uploadedBy: uId(req) as any, uploadedAt: new Date(),
      } as any);
    }
    await resource.save();
    await audit(req, resource, 'upload', { files: files.map((f) => f.originalname) });
    res.status(201).json({ resource });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create resource', error: String(err) });
  }
};

// PATCH /resources/admin/:id — update metadata / visibility / status (publish/archive).
export const updateResource = async (req: Request, res: Response) => {
  try {
    const r = await Resource.findOne({ _id: req.params.id, tenantId: tId(req) });
    if (!r) return res.status(404).json({ message: 'Resource not found' });
    const b = req.body || {};
    const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined);
    for (const k of ['title', 'description', 'resourceType', 'difficulty', 'targetRole'] as const) if (b[k] !== undefined) (r as any)[k] = b[k];
    if (b.tags !== undefined) r.tags = arr(b.tags) || [];
    if (b.techStack !== undefined) r.techStack = arr(b.techStack) || [];
    if (b.visibility && ['public', 'portal', 'approval'].includes(b.visibility)) r.visibility = b.visibility;
    if (b.status && ['draft', 'published', 'archived'].includes(b.status)) {
      const was = r.status; r.status = b.status;
      if (b.status !== was) await audit(req, r, b.status === 'published' ? 'publish' : b.status === 'archived' ? 'archive' : 'update');
    }
    await r.save();
    res.json({ resource: r });
  } catch (err) { res.status(500).json({ message: 'Failed to update resource', error: String(err) }); }
};

// POST /resources/admin/:id/files — add more / new-version files.
export const addFiles = async (req: Request, res: Response) => {
  try {
    const r = await Resource.findOne({ _id: req.params.id, tenantId: tId(req) });
    if (!r) return res.status(404).json({ message: 'Resource not found' });
    const nextVersion = (r.files.reduce((m, f) => Math.max(m, f.version), 0) || 0) + 1;
    const files = (req.files as Express.Multer.File[]) || [];
    for (const f of files) {
      const fileId = crypto.randomBytes(6).toString('hex');
      const storageKey = `resources/${tId(req)}/${r._id}/${fileId}-${safeName(f.originalname)}`;
      await bunny.uploadFile(storageKey, f.buffer, f.mimetype);
      r.files.push({ fileId, fileName: f.originalname, storageKey, sizeBytes: f.size, mimeType: f.mimetype, version: nextVersion, uploadedBy: uId(req) as any, uploadedAt: new Date() } as any);
    }
    await r.save();
    await audit(req, r, 'update', { addedFiles: files.map((f) => f.originalname), version: nextVersion });
    res.json({ resource: r });
  } catch (err: any) { res.status(500).json({ message: err.message || 'Failed to add files', error: String(err) }); }
};

// DELETE /resources/admin/:id
export const deleteResource = async (req: Request, res: Response) => {
  try {
    const r = await Resource.findOne({ _id: req.params.id, tenantId: tId(req) });
    if (!r) return res.status(404).json({ message: 'Resource not found' });
    for (const f of r.files) await bunny.deleteFile(f.storageKey);
    await audit(req, r, 'delete');
    await ResourceRequest.deleteMany({ resourceId: r._id, tenantId: tId(req) });
    await r.deleteOne();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: 'Failed to delete resource', error: String(err) }); }
};

// GET /resources/admin/requests?status=requested
export const listRequests = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: tId(req) };
    if (req.query.status) filter.status = req.query.status;
    const requests = await ResourceRequest.find(filter).sort({ createdAt: -1 })
      .populate('resourceId', 'title resourceType').lean();
    res.json({ requests });
  } catch (err) { res.status(500).json({ message: 'Failed to load requests', error: String(err) }); }
};

// PATCH /resources/admin/requests/:id  { status: approved|rejected, reviewNote }
export const reviewRequest = async (req: Request, res: Response) => {
  try {
    const { status, reviewNote } = req.body || {};
    if (!['approved', 'rejected', 'revoked'].includes(status)) return res.status(400).json({ message: 'invalid status' });
    const reqDoc = await ResourceRequest.findOne({ _id: req.params.id, tenantId: tId(req) });
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    reqDoc.status = status; reqDoc.reviewNote = reviewNote; reqDoc.reviewedBy = uId(req) as any; reqDoc.reviewedAt = new Date();
    await reqDoc.save();
    const resource = await Resource.findById(reqDoc.resourceId);
    if (resource) await audit(req, resource, status === 'approved' ? 'approve' : status === 'revoked' ? 'revoke' : 'reject', { studentId: String(reqDoc.studentId), requestId: String(reqDoc._id) });
    res.json({ request: reqDoc });
  } catch (err) { res.status(500).json({ message: 'Failed to review request', error: String(err) }); }
};

// GET /resources/admin/:id/audit
export const getAudit = async (req: Request, res: Response) => {
  try {
    const events = await ResourceAudit.find({ tenantId: tId(req), resourceId: req.params.id }).sort({ at: -1 }).limit(500).lean();
    res.json({ events });
  } catch (err) { res.status(500).json({ message: 'Failed to load audit', error: String(err) }); }
};

// ─── Student ─────────────────────────────────────────────────────────────────

// GET /resources — resources visible to this student + their access status.
export const listForStudent = async (req: Request, res: Response) => {
  try {
    const resources = await Resource.find({ tenantId: tId(req), status: 'published', visibility: { $in: ['public', 'portal', 'approval'] } })
      .sort({ createdAt: -1 }).lean();
    const reqs = await ResourceRequest.find({ tenantId: tId(req), studentId: uId(req) }).lean();
    const reqMap: Record<string, string> = {};
    reqs.forEach((r) => { reqMap[String(r.resourceId)] = r.status; });
    const out = resources.map((r) => {
      let access: 'open' | 'requestable' | 'requested' | 'approved' | 'rejected';
      if (r.visibility === 'public' || r.visibility === 'portal') access = 'open';
      else {
        const s = reqMap[String(r._id)];
        access = s === 'approved' ? 'approved' : s === 'requested' ? 'requested' : s === 'rejected' ? 'rejected' : 'requestable';
      }
      // Never leak storageKey to the client.
      const files = (r.files || []).map((f: any) => ({ fileId: f.fileId, fileName: f.fileName, sizeBytes: f.sizeBytes, version: f.version }));
      return { ...r, files, access };
    });
    res.json({ resources: out });
  } catch (err) { res.status(500).json({ message: 'Failed to load resources', error: String(err) }); }
};

// POST /resources/:id/request  { note }
export const requestAccess = async (req: Request, res: Response) => {
  try {
    const r = await Resource.findOne({ _id: req.params.id, tenantId: tId(req), status: 'published' });
    if (!r) return res.status(404).json({ message: 'Resource not found' });
    if (r.visibility !== 'approval') return res.status(400).json({ message: 'This resource does not require approval.' });
    const u = await User.findById(uId(req)).select('firstName lastName').lean() as any;
    const doc = await ResourceRequest.findOneAndUpdate(
      { tenantId: tId(req), resourceId: r._id, studentId: uId(req) },
      { $set: { status: 'requested', note: (req.body?.note || '').slice(0, 500), studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), reviewNote: undefined, reviewedAt: undefined, reviewedBy: undefined } },
      { upsert: true, new: true }
    );
    await audit(req, r, 'request', { requestId: String(doc._id) });
    res.status(201).json({ request: doc });
  } catch (err) { res.status(500).json({ message: 'Failed to request access', error: String(err) }); }
};

async function canDownload(resource: any, req: Request): Promise<boolean> {
  if (resource.visibility === 'public' || resource.visibility === 'portal') return true;
  const reqDoc = await ResourceRequest.findOne({ tenantId: tId(req), resourceId: resource._id, studentId: uId(req) }).lean();
  return reqDoc?.status === 'approved';
}

// GET /resources/:id/download/:fileId — gated + audited streaming download.
export const download = async (req: Request, res: Response) => {
  try {
    const r = await Resource.findOne({ _id: req.params.id, tenantId: tId(req), status: 'published' });
    if (!r) return res.status(404).json({ message: 'Resource not found' });
    if (!(await canDownload(r, req))) return res.status(403).json({ message: 'You need approval to download this resource.' });
    const file = r.files.find((f) => f.fileId === req.params.fileId) || r.files[r.files.length - 1];
    if (!file) return res.status(404).json({ message: 'File not found' });

    const { stream, size } = await bunny.getFileStream(file.storageKey);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    if (size) res.setHeader('Content-Length', String(size));
    Resource.updateOne({ _id: r._id }, { $inc: { downloadCount: 1 } }).catch(() => {});
    await audit(req, r, 'download', { fileName: file.fileName, version: file.version });
    stream.on('error', () => { if (!res.headersSent) res.status(502).end(); });
    stream.pipe(res);
  } catch (err: any) { res.status(500).json({ message: err.message || 'Download failed', error: String(err) }); }
};
