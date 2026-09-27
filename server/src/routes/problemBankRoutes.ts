import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/problemBankController';

/**
 * Problem Bank — the single store of runnable coding problems.
 * Authors (admins and instructors) manage it here; delivery to students comes in later phases.
 * Static routes are declared before `/:id` so they are never captured as an id.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']));

router.get('/meta', ctrl.meta);
router.get('/import/template', ctrl.importTemplate);
router.post('/import/preview', ctrl.importPreview);
router.post('/import/commit', ctrl.importCommit);
router.post('/ai/generate', rateLimit('problemBankAi'), ctrl.aiGenerate);
router.get('/ai/jobs/:jobId', ctrl.aiJob);
router.get('/migration', ctrl.migrationInfo);
router.post('/migration', ctrl.migrate);
router.post('/run', rateLimit('problemBankRun'), ctrl.run);
router.post('/fill-outputs', rateLimit('problemBankRun'), ctrl.fillOutputs);
router.post('/validate', ctrl.validate);

router.get('/problems', ctrl.list);
router.post('/problems', ctrl.create);
router.get('/problems/:id', ctrl.get);
router.put('/problems/:id', ctrl.update);
router.delete('/problems/:id', ctrl.remove);
router.post('/problems/:id/status', ctrl.setStatus);
router.post('/problems/:id/duplicate', ctrl.duplicate);
router.post('/problems/:id/promote', ctrl.promote);
router.post('/problems/:id/verify', ctrl.verify);
router.get('/problems/:id/verification', ctrl.verification);

export default router;
