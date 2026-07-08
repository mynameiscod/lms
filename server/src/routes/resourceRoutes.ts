import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/resourceController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } }); // 300 MB per file
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
