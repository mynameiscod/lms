import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/resourceController';

const router = express.Router();

// Large resource uploads (up to ~1 GB): stream to a temp file on disk (never buffer
// the whole file in memory), then the controller streams it up to Bunny and deletes it.
const tmpDir = path.join(process.cwd(), 'uploads', 'resource-tmp');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 1100 * 1024 * 1024 }, // ~1 GB per file
});
const ADMIN = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

router.use(authMiddleware, tenantMiddleware);

// ── Admin (defined before the /:id student routes so "admin" isn't captured) ──
router.get('/admin', ADMIN, ctrl.listAdmin);
router.post('/admin', ADMIN, upload.array('files', 10), ctrl.createResource);
router.get('/admin/requests', ADMIN, ctrl.listRequests);
router.patch('/admin/requests/:id', ADMIN, ctrl.reviewRequest);
router.get('/admin/:id/audit', ADMIN, ctrl.getAudit);
router.post('/admin/:id/files', ADMIN, upload.array('files', 10), ctrl.addFiles);
router.patch('/admin/:id', ADMIN, ctrl.updateResource);
router.delete('/admin/:id', ADMIN, ctrl.deleteResource);

// ── Student ──
router.get('/', ctrl.listForStudent);
router.post('/:id/request', ctrl.requestAccess);
router.get('/:id/download/:fileId', ctrl.download);

export default router;
