import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/problemBankController';
import * as sets from '../controllers/problemDeliveryController';
import * as apiClients from '../controllers/apiClientController';

/** Body limit for the two import routes: a 100 MB file, base64-encoded, plus headroom. */
export const IMPORT_BODY_LIMIT = '150mb';
/** Paths whose JSON body is parsed by this router rather than by app.ts. */
export const IMPORT_BODY_PATHS = /^\/api\/v1\/problem-bank\/import\/(preview|commit)\/?$/;

/** The app-wide JSON parser, skipped for the import paths so their larger limit can apply after login. */
export const jsonExceptImports = (appJson: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => (IMPORT_BODY_PATHS.test(req.path) ? next() : appJson(req, res, next));

/**
 * Problem Bank — the single store of runnable coding problems.
 * Authors (admins and instructors) manage it here; delivery to students comes in later phases.
 * Static routes are declared before `/:id` so they are never captured as an id.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_problem_bank', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']));

router.get('/meta', ctrl.meta);
router.get('/import/template', ctrl.importTemplate);
// Import files go up to 100 MB. The file travels base64-encoded (about a third larger) and the
// commit sends the parsed problems back, so these two routes get their own larger body limit;
// app.ts skips its 10 MB parser for them (IMPORT_BODY_PATHS).
const importBody = express.json({ limit: IMPORT_BODY_LIMIT });
router.post('/import/preview', importBody, ctrl.importPreview);
router.post('/import/commit', importBody, ctrl.importCommit);
router.post('/ai/generate', rateLimit('problemBankAi'), ctrl.aiGenerate);
router.get('/ai/jobs/:jobId', ctrl.aiJob);
router.get('/migration', ctrl.migrationInfo);
router.post('/migration', ctrl.migrate);
router.post('/run', rateLimit('problemBankRun'), ctrl.run);
router.post('/fill-outputs', rateLimit('problemBankRun'), ctrl.fillOutputs);
router.post('/validate', ctrl.validate);

// Problem sets — delivering bank problems to batches / CareerPilot.
router.get('/sets', sets.listSets);
router.post('/sets', sets.createSet);
router.get('/audience/batches', sets.audienceBatches);
router.get('/audience/users', sets.audienceUsers);
router.get('/sets/:id', sets.getSet);
router.put('/sets/:id', sets.updateSet);
router.delete('/sets/:id', sets.deleteSet);
router.get('/sets/:id/report', sets.setReport);
router.get('/sets/:id/learners/:userId/submissions', sets.learnerSubmissions);

// External API clients (keys for colleges, partners, Interview Pilot) — institute admins only.
const adminOnly = roleGuard(['manage_tenant', 'manage_tenant_settings']);
router.get('/api-clients', adminOnly, apiClients.list);
router.post('/api-clients', adminOnly, apiClients.create);
router.put('/api-clients/:id', adminOnly, apiClients.update);
router.post('/api-clients/:id/rotate', adminOnly, apiClients.rotate);
router.delete('/api-clients/:id', adminOnly, apiClients.remove);
router.get('/api-clients/:id/preview', adminOnly, apiClients.preview);

router.get('/problems', ctrl.list);
router.post('/problems', ctrl.create);
router.post('/problems/bulk-status', ctrl.bulkStatus);
router.get('/problems/:id', ctrl.get);
router.put('/problems/:id', ctrl.update);
router.delete('/problems/:id', ctrl.remove);
router.post('/problems/:id/status', ctrl.setStatus);
router.post('/problems/:id/duplicate', ctrl.duplicate);
router.post('/problems/:id/promote', ctrl.promote);
router.post('/problems/:id/verify', ctrl.verify);
router.get('/problems/:id/verification', ctrl.verification);

export default router;
