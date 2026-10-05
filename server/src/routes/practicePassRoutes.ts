import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/practicePassService';

/**
 * Daily Practice Pass. Students read their own day; admins and instructors set the rules and
 * watch the standings. Turning the pass on or off is an institute-admin decision.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const t = (req: Request) => String((req as any).tenantId || '');
const u = (req: Request) => String((req as any).user?.id || '');
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req, res) }); } catch (e: any) {
    const status = e instanceof svc.PracticeError ? e.status : 500;
    if (status === 500) console.error('[practice-pass]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

const staff = roleGuard(['manage_practice_pass', 'manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses']);
const admin = roleGuard(['manage_practice_pass', 'manage_tenant', 'manage_tenant_settings']);

router.get('/me', wrap((req) => svc.myPractice(t(req), u(req))));

router.get('/admin/overview', staff, wrap((req) => svc.adminOverview(t(req))));
router.post('/admin/enable', admin, wrap((req) => svc.enable(t(req), u(req), Number(req.body?.graceDays ?? 7))));
router.post('/admin/disable', admin, wrap((req) => svc.disable(t(req))));
router.put('/admin/policy', staff, wrap((req) => svc.savePolicy(t(req), u(req), req.body || {})));
router.delete('/admin/policy/:scope/:targetId', staff, wrap((req) => svc.removeOverride(t(req), req.params.scope as any, req.params.targetId)));
router.get('/admin/standings', staff, wrap((req) => svc.standings(t(req), req.query as any)));
router.post('/admin/recompute', staff, wrap(async (req) => ({ students: await svc.recomputeTenant(t(req)) })));
router.get('/admin/students/:id', staff, wrap((req) => svc.studentCalendar(t(req), req.params.id)));
router.post('/admin/remind', staff, wrap((req) => svc.sendReminders(t(req), u(req), { ...(req.body || {}), origin: String(req.headers.origin || '') || undefined })));
router.get('/admin/reminders', staff, wrap((req) => svc.reminderHistory(t(req))));

export default router;
