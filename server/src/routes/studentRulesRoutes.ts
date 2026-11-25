import express, { Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { AuthenticatedRequest } from '../types';
import * as svc from '../services/studentRulesService';
import User from '../models/User';

/**
 * Student Rules — office QR attendance, inactivity alerts, profile gate (services/studentRulesService.ts).
 */
const router = express.Router();
router.use(authMiddleware);
router.use(tenantResolver);

const MANAGE = ['manage_student_rules', 'manage_tenant_settings', 'manage_tenant'];
const SCREEN = ['mark_attendance', ...MANAGE];

const uid = (req: AuthenticatedRequest) => String(req.user?.id || req.userId || '');
const fail = (res: Response, e: any) => {
  if (e instanceof svc.RuleError) return res.status(e.status).json({ success: false, code: e.code, message: e.message });
  console.error('[student-rules]', e?.message);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};

/* ── Admin settings ── */

router.get('/', roleGuard(MANAGE), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    res.json({ success: true, data: { rules: svc.publicRules(await svc.getRules(tenantId, true)), yourIp: svc.normalizeIp(req.ip || ''), screens: svc.activeScreens(tenantId) } });
  } catch (e) { fail(res, e); }
});

router.put('/', roleGuard(MANAGE), async (req: AuthenticatedRequest, res) => {
  try { res.json({ success: true, data: await svc.updateRules(req.tenantId!, req.body, uid(req)) }); } catch (e) { fail(res, e); }
});

/* ── QR screen (trainer's laptop / classroom TV) ── */

router.get('/attendance/qr', roleGuard(SCREEN), async (req: AuthenticatedRequest, res) => {
  try {
    const data = await svc.qrForScreen(req.tenantId!, String(req.query.batchId || '') || undefined, req.ip || '', String(req.query.origin || ''));
    res.json({ success: true, data });
  } catch (e) { fail(res, e); }
});

/* ── Student ── */

router.post('/attendance/check-in', async (req: AuthenticatedRequest, res) => {
  try {
    const { token, lat, lng, deviceId } = req.body || {};
    res.json({ success: true, data: await svc.checkIn(req.tenantId!, uid(req), { token, lat, lng, deviceId }, req.ip || '') });
  } catch (e) { fail(res, e); }
});

/** What the student app needs: today's attendance and whether the profile gate holds them. Always reachable. */
router.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const [attendance, profileGate, me] = await Promise.all([
      svc.myToday(tenantId, uid(req)),
      svc.profileGateStatus(tenantId, uid(req)),
      User.findById(uid(req)).select('role batchId lmsDemo').lean<any>(),
    ]);
    // The same people authMiddleware holds back: LMS students in a batch, not demo or CareerPilot-only accounts.
    const applies = me?.role === 'STUDENT' && !!me?.batchId && !me?.lmsDemo?.at;
    res.json({ success: true, data: { attendance, profileGate: { ...profileGate, enabled: profileGate.enabled && applies }, applies } });
  } catch (e) { fail(res, e); }
});

/* ── Inactivity ── */

router.get('/inactivity', roleGuard(MANAGE), async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const [plan, recent] = await Promise.all([svc.inactivityPlan(tenantId), svc.recentAlerts(tenantId)]);
    const { trainerMsgs, ...rest } = plan;
    res.json({
      success: true,
      data: { ...rest, trainerMsgs: trainerMsgs.map((m) => ({ trainer: m.trainer.name, students: m.students.length })), recent },
    });
  } catch (e) { fail(res, e); }
});

/** Send today's due messages now, instead of waiting for the morning run. */
router.post('/inactivity/run', roleGuard(MANAGE), async (req: AuthenticatedRequest, res) => {
  try { res.json({ success: true, data: await svc.runInactivity(req.tenantId!) }); } catch (e) { fail(res, e); }
});

export default router;
