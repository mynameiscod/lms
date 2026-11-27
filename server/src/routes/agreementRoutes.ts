import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/agreementService';
import { forgetGate } from '../services/studentRulesService';

/**
 * Terms & agreements (services/agreementService.ts).
 *  - Admin: /agreements/admin/* — write the points, attach a document, choose who it is for, go live,
 *    see who accepted (with signatures).
 *  - Student: /agreements/mine, /agreements/:id/accept — open even while the profile gate holds them.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const MANAGE = roleGuard(['manage_agreements', 'manage_student_rules', 'manage_tenant_settings', 'manage_tenant']);
const t = (req: Request) => String((req as any).tenantId || '');
const u = (req: Request) => String((req as any).user?.id || (req as any).userId || '');
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req, res) }); } catch (e: any) {
    const invalid = e?.name === 'ValidationError' || e?.name === 'CastError';
    const status = e instanceof svc.AgreementError ? e.status : invalid ? 400 : 500;
    if (status === 500) console.error('[agreements]', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong. Please try again.' : e?.message });
  }
};

/* Documents: PDF / Word / images up to 10 MB, served from /uploads/agreements under a random name. */
const docDir = path.join(__dirname, '..', '..', 'uploads', 'agreements');
try { fs.mkdirSync(docDir, { recursive: true }); } catch { /* exists */ }
const ALLOWED = /\.(pdf|docx?|png|jpe?g)$/i;
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, docDir),
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.test(file.originalname)),
});
const oneDoc = (req: Request, res: Response, next: NextFunction) =>
  upload.single('file')(req, res, (err: any) => {
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 10 MB.' : err.message });
    next();
  });

/* ── Admin ── */
router.get('/admin', MANAGE, wrap((req) => svc.list(t(req))));
router.get('/admin/options', MANAGE, wrap((req) => svc.audienceOptions(t(req), String(req.query.q || ''))));
router.post('/admin/document', MANAGE, oneDoc, wrap(async (req) => {
  const f = (req as any).file;
  if (!f) throw new svc.AgreementError(400, 'Choose a PDF, Word document or image.');
  return { url: `/uploads/agreements/${f.filename}`, name: f.originalname, size: f.size };
}));
router.get('/admin/records/:acceptanceId', MANAGE, wrap((req) => svc.acceptanceRecord(t(req), req.params.acceptanceId)));
router.post('/admin', MANAGE, wrap((req) => svc.create(t(req), u(req), req.body || {})));
router.get('/admin/:id', MANAGE, wrap((req) => svc.get(t(req), req.params.id)));
router.put('/admin/:id', MANAGE, wrap((req) => svc.update(t(req), u(req), req.params.id, req.body || {})));
router.post('/admin/:id/status', MANAGE, wrap((req) => svc.setStatus(t(req), u(req), req.params.id, String(req.body?.status || ''))));
router.delete('/admin/:id', MANAGE, wrap((req) => svc.remove(t(req), req.params.id)));
router.get('/admin/:id/responses', MANAGE, wrap((req) => svc.responses(t(req), req.params.id)));

/* ── Student ── */
router.get('/mine', wrap((req) => svc.mine(t(req), u(req))));
router.get('/:id/my-record', wrap((req) => svc.myRecord(t(req), u(req), req.params.id)));
router.post('/:id/accept', wrap(async (req) => {
  const r = await svc.accept(t(req), u(req), req.params.id, req.body || {}, { ip: req.ip, userAgent: String(req.headers['user-agent'] || '') });
  forgetGate(t(req), u(req)); // the LMS opens at once if this was the last thing holding them
  return r;
}));

export default router;
