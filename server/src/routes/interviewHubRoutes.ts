import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/interviewHubService';

/**
 * Interview Hub — candidates' real interview experiences. Every signed-in user (LMS student or
 * CareerPilot member) can read the global pool and post their own; staff review, publish,
 * promote questions into the bank and invite people to share.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const tmpDir = path.join(process.cwd(), 'uploads', 'interview-hub-tmp');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.webm'}`),
  }),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^(audio|video)\//.test(file.mimetype)),
});

const t = (req: Request) => String((req as any).tenantId || '');
const u = (req: Request) => String((req as any).user?.id || '');
const role = (req: Request) => String((req as any).user?.role || '');
const isStaff = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(role(req));
const origin = (req: Request) => String(req.headers.origin || '') || undefined;
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req, res) }); } catch (e: any) {
    const status = e instanceof svc.HubError ? e.status : 500;
    if (status === 500) console.error('[interview-hub]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

const staff = roleGuard(['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_passport']);

// ── Admin (declared before /:id) ──
router.get('/admin/experiences', staff, wrap((req) => svc.adminList(t(req), req.query as any)));
router.put('/admin/experiences/:id', staff, wrap((req) => svc.moderate(t(req), u(req), req.params.id, req.body || {})));
router.delete('/admin/experiences/:id', staff, wrap((req) => svc.adminDelete(t(req), req.params.id)));
router.post('/admin/experiences/:id/promote', staff, wrap((req) => svc.promoteQuestions(t(req), req.params.id, req.body?.picks || [])));
router.get('/admin/sources', staff, wrap((req) => svc.inviteSources(t(req))));
router.post('/admin/invites', staff, wrap((req) => svc.createInvites(t(req), u(req), { ...(req.body || {}), origin: origin(req) })));
router.get('/admin/invites', staff, wrap((req) => svc.listInvites(t(req), req.query as any)));
router.post('/admin/invites/:id/remind', staff, wrap((req) => svc.remindInvite(t(req), req.params.id, req.body?.channels || ['email'], origin(req))));
router.post('/admin/invites/:id/cancel', staff, wrap((req) => svc.cancelInvite(t(req), req.params.id)));

// ── Candidate ──
router.get('/mine', wrap((req) => svc.mine(t(req), u(req))));
router.get('/mine/:id', wrap((req) => svc.getMine(t(req), u(req), req.params.id)));
router.get('/invites/:id', wrap((req) => svc.getInvite(t(req), u(req), req.params.id)));
router.post('/drafts', upload.fields([{ name: 'recording', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), wrap((req) => {
  const files = (req as any).files || {};
  return svc.createDraft(t(req), u(req), req.body || {}, { recording: files.recording?.[0], audio: files.audio?.[0] });
}));
router.put('/mine/:id', wrap((req) => svc.updateMine(t(req), u(req), req.params.id, req.body || {})));
router.delete('/mine/:id', wrap((req) => svc.deleteMine(t(req), u(req), req.params.id)));

// ── Reading the global pool ──
router.get('/feed', wrap((req) => svc.feed(t(req), req.query as any)));
router.get('/companies/:slug', wrap((req) => svc.companyView(t(req), req.params.slug)));
router.get('/experiences/:id', wrap((req) => svc.detail(t(req), u(req), req.params.id, isStaff(req))));
router.get('/experiences/:id/media', async (req, res) => {
  try { await svc.streamMedia(t(req), u(req), req.params.id, isStaff(req), res); } catch (e: any) {
    if (!res.headersSent) res.status(e instanceof svc.HubError ? e.status : 500).json({ success: false, message: e?.message || 'Could not play it' });
  }
});

export default router;
