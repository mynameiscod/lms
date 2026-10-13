import express, { Request } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as svc from '../services/employeeService';
import * as exp from '../services/employeeExpenseService';
import { t, u, actorOf, wrap, nameOf, permsOf, employeeOfUser } from './employeeHttp';

/**
 * Expenses, from the approver's and accounts' side: the queue waiting for you, everything claimed,
 * approve or reject, mark paid, monthly totals and the CSV. Anyone with an employee record sees
 * their own team's claims; the permissions widen that to everyone.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

async function viewerOf(req: Request): Promise<exp.Viewer> {
  const perms = await permsOf(actorOf(req));
  const me = await employeeOfUser(t(req), u(req));
  const canApprove = perms.has('approve_expenses');
  const canManage = perms.has('manage_expenses');
  const canViewAll = canApprove || canManage || perms.has('view_expenses');
  if (!canViewAll && !me) throw new svc.EmployeeError('You do not have access to employee expenses.', 403);
  return { userId: u(req), name: await nameOf(req), employeeId: me ? String(me._id) : undefined, canApprove, canViewAll, canManage };
}

router.get('/queue', wrap('employee-expenses', async (req) => exp.queue(t(req), await viewerOf(req), req.query as any)));
router.get('/summary', wrap('employee-expenses', async (req) => exp.summary(t(req), await viewerOf(req), String(req.query.month || ''))));

router.get('/export', async (req, res) => {
  try {
    const viewer = await viewerOf(req);
    if (!viewer.canViewAll) throw new svc.EmployeeError('You cannot export expenses.', 403);
    const csv = await exp.exportCsv(t(req), viewer, req.query as any);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${String(req.query.month || 'all')}.csv"`);
    res.send('﻿' + csv);
  } catch (e: any) {
    const status = e instanceof svc.EmployeeError ? e.status : 500;
    if (status === 500) console.error('[employee-expenses] export', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Could not export' : e.message });
  }
});

router.post('/pay', wrap('employee-expenses', async (req) => exp.markPaid(t(req), await viewerOf(req), Array.isArray(req.body?.ids) ? req.body.ids : [], req.body || {})));

router.get('/:id', wrap('employee-expenses', async (req) => {
  const viewer = await viewerOf(req);
  const d = await exp.detail(t(req), req.params.id);
  const mine = d.employee && viewer.employeeId === String(d.employee._id);
  const myReport = d.employee && viewer.employeeId && String(d.employee.reportingManagerId || '') === viewer.employeeId;
  if (!viewer.canViewAll && !mine && !myReport) throw new svc.EmployeeError('You cannot see this expense.', 403);
  return d;
}));

router.post('/:id/act', wrap('employee-expenses', async (req) => exp.actOn(t(req), await viewerOf(req), req.params.id, String(req.body?.action || ''), req.body?.note)));
router.post('/:id/unpay', wrap('employee-expenses', async (req) => { await exp.reopenPaid(t(req), await viewerOf(req), req.params.id); return { reopened: true }; }));

export default router;
