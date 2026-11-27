import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/projectStudioService';

/**
 * Project Studio — guided end-to-end projects. Students read and work on their own project;
 * staff write projects, release them to batches, review submissions and watch progress.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const t = (req: Request) => String((req as any).tenantId || '');
const u = (req: Request) => String((req as any).user?.id || '');
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.ProjectError ? e.status : 500;
    if (status === 500) console.error('[project-studio]', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong' : e.message });
  }
};

const staff = roleGuard(['manage_project_studio', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses']);

/* Student */
router.get('/me', wrap((req) => svc.myProject(t(req), u(req))));
router.post('/me/pick', wrap((req) => svc.pickProject(t(req), u(req), String(req.body?.templateId || ''))));
router.put('/me/repo', wrap((req) => svc.setRepo(t(req), u(req), String(req.body?.repoUrl || ''))));
router.post('/me/tasks/:taskId/submit', wrap((req) => svc.submitTask(t(req), u(req), req.params.taskId, req.body || {})));
router.post('/me/tasks/:taskId/self-check', wrap((req) => svc.selfCheck(t(req), u(req), req.params.taskId, req.body || {})));

/* Staff */
router.get('/admin/templates', staff, wrap((req) => svc.listTemplates(t(req))));
router.post('/admin/templates', staff, wrap((req) => svc.createTemplate(t(req), u(req), req.body || {})));
router.get('/admin/templates/:id', staff, wrap((req) => svc.getTemplate(t(req), req.params.id)));
router.put('/admin/templates/:id', staff, wrap((req) => svc.saveTemplate(t(req), u(req), req.params.id, req.body || {})));
router.post('/admin/templates/:id/duplicate', staff, wrap((req) => svc.duplicateTemplate(t(req), u(req), req.params.id)));
router.delete('/admin/templates/:id', staff, wrap((req) => svc.deleteTemplate(t(req), req.params.id)));
router.get('/admin/batches', staff, wrap((req) => svc.listBatches(t(req))));
router.get('/admin/progress', staff, wrap((req) => svc.progress(t(req), { batchId: String(req.query.batchId || '') || undefined, templateId: String(req.query.templateId || '') || undefined })));
router.get('/admin/review', staff, wrap((req) => svc.reviewQueue(t(req))));
router.get('/admin/enrollments/:id', staff, wrap((req) => svc.enrollmentDetail(t(req), req.params.id)));
router.post('/admin/enrollments/:id/tasks/:taskId/review', staff, wrap((req) => svc.reviewTask(t(req), u(req), req.params.id, req.params.taskId, req.body || {})));
router.post('/admin/enrollments/:id/reset', staff, wrap((req) => svc.resetEnrollment(t(req), u(req), req.params.id, String(req.body?.reason || ''))));

export default router;
