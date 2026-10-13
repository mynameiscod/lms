import express, { Request } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as svc from '../services/employeeService';
import * as act from '../services/employeeActivityService';
import { t, u, actorOf, wrap, nameOf, permsOf, employeeOfUser } from './employeeHttp';

/**
 * Daily activity, from the reviewer's side: who has started their day, what everyone did, and
 * sign-off. People with the review permission see everyone; a manager sees their own team.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

/** Who this person may look at. Nobody else's days are ever returned. */
async function scopeOf(req: Request): Promise<{ scope: act.Scope; all: boolean; canReview: boolean; myEmployeeId?: string }> {
  const perms = await permsOf(actorOf(req));
  const cfg = await svc.getConfig(t(req));
  const reviewer = perms.has('review_employee_activity') || perms.has('manage_employees');
  if (reviewer) return { scope: { all: true }, all: true, canReview: cfg.activityPolicy.reviewMode !== 'none', myEmployeeId: undefined };
  const me = await employeeOfUser(t(req), u(req));
  const ids = me ? await svc.teamIds(t(req), String(me._id)) : [];
  if (!ids.length) throw new svc.EmployeeError('You have no one reporting to you, and no review permission.', 403);
  return { scope: { all: false, ids }, all: false, canReview: cfg.activityPolicy.reviewMode === 'manager', myEmployeeId: String(me._id) };
}

router.get('/board', wrap('employee-activity', async (req) => act.dayBoard(t(req), (await scopeOf(req)).scope, String(req.query.date || ''))));
router.get('/list', wrap('employee-activity', async (req) => act.reviewList(t(req), (await scopeOf(req)).scope, req.query as any)));
router.get('/report', wrap('employee-activity', async (req) => act.monthlyReport(t(req), (await scopeOf(req)).scope, String(req.query.month || ''), req.query.department ? String(req.query.department) : undefined)));

router.get('/logs/:id', wrap('employee-activity', async (req) => {
  const { scope, canReview } = await scopeOf(req);
  const log = await act.logForReview(t(req), req.params.id);
  if (!act.inScope(scope, log.employeeId)) throw new svc.EmployeeError('You cannot see this day.', 403);
  return { ...log, canReview: canReview && log.employeeUserId !== u(req) };
}));

router.post('/logs/:id/review', wrap('employee-activity', async (req) => {
  const { scope, canReview } = await scopeOf(req);
  if (!canReview) throw new svc.EmployeeError('Reviewing is not switched on for you.', 403);
  const log = await act.logForReview(t(req), req.params.id);
  if (!act.inScope(scope, log.employeeId)) throw new svc.EmployeeError('You cannot review this day.', 403);
  if (log.employeeUserId === u(req)) throw new svc.EmployeeError('You cannot review your own day.', 403);
  return act.reviewLog(t(req), { id: u(req), name: await nameOf(req) }, req.params.id, String(req.body?.action || ''), req.body?.note);
}));

router.post('/logs/:id/reopen', wrap('employee-activity', async (req) => {
  const { scope, canReview } = await scopeOf(req);
  if (!canReview) throw new svc.EmployeeError('Reviewing is not switched on for you.', 403);
  const log = await act.logForReview(t(req), req.params.id);
  if (!act.inScope(scope, log.employeeId)) throw new svc.EmployeeError('You cannot reopen this day.', 403);
  return act.reopenLog(t(req), { id: u(req), name: await nameOf(req) }, req.params.id, req.body?.note);
}));

export default router;
