import express, { Request } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as svc from '../services/employeeService';
import * as ce from '../services/companyExpenseService';
import { t, u, actorOf, wrap, nameOf, oneFile, permsOf } from './employeeHttp';

/**
 * The company expense ledger: what the institute spends. Anyone with an expense permission can
 * read it; recording, paying, recurring items and salaries need manage-expenses; approving needs
 * approve-expenses. Salary lines are shown one by one only to people who may see pay.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

async function viewerOf(req: Request): Promise<ce.Viewer> {
  const perms = await permsOf(actorOf(req));
  const canApprove = perms.has('approve_expenses');
  const canManage = perms.has('manage_expenses');
  const canViewAll = canApprove || canManage || perms.has('view_expenses');
  if (!canViewAll) throw new svc.EmployeeError('You do not have access to the company expenses.', 403);
  return { userId: u(req), name: await nameOf(req), canApprove, canManage, canViewAll, canSalary: perms.has('view_employee_sensitive') };
}

router.get('/ledger', wrap('company-expenses', async (req) => ce.ledger(t(req), await viewerOf(req), req.query as any)));
router.get('/summary', wrap('company-expenses', async (req) => ce.summary(t(req), await viewerOf(req), String(req.query.month || ''))));
router.get('/vendors', wrap('company-expenses', async (req) => { await viewerOf(req); return ce.vendors(t(req)); }));

router.get('/export', async (req, res) => {
  try {
    const csv = await ce.exportCsv(t(req), await viewerOf(req), req.query as any);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="company-expenses-${String(req.query.month || 'all')}.csv"`);
    res.send('﻿' + csv);
  } catch (e: any) {
    const status = e instanceof svc.EmployeeError ? e.status : 500;
    if (status === 500) console.error('[company-expenses] export', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Could not export' : e.message });
  }
});

// Recurring costs
router.get('/recurring', wrap('company-expenses', async (req) => { await viewerOf(req); return ce.listRecurring(t(req)); }));
router.post('/recurring', wrap('company-expenses', async (req) => ce.createRecurring(t(req), await viewerOf(req), req.body || {})));
router.post('/recurring/generate', wrap('company-expenses', async (req) => {
  const v = await viewerOf(req);
  if (!v.canManage) throw new svc.EmployeeError('You cannot add recurring expenses.', 403);
  return ce.generateRecurring(t(req), { userId: v.userId, name: v.name }, req.body?.month);
}));
router.post('/recurring/:id/pay-ahead', wrap('company-expenses', async (req) => ce.payAhead(t(req), await viewerOf(req), req.params.id, req.body || {})));
router.put('/recurring/:id', wrap('company-expenses', async (req) => ce.updateRecurring(t(req), await viewerOf(req), req.params.id, req.body || {})));
router.delete('/recurring/:id', wrap('company-expenses', async (req) => { await ce.deleteRecurring(t(req), await viewerOf(req), req.params.id); return { deleted: true }; }));

// Salaries
router.get('/salaries/preview', wrap('company-expenses', async (req) => ce.salaryPreview(t(req), await viewerOf(req), String(req.query.month || ''))));
router.post('/salaries/generate', wrap('company-expenses', async (req) => ce.generateSalaries(t(req), await viewerOf(req), req.body || {})));

// Bills and invoices
router.post('/invoice', oneFile('file'), wrap('company-expenses', async (req) => {
  const v = await viewerOf(req);
  if (!v.canManage) throw new svc.EmployeeError('You cannot attach bills.', 403);
  return svc.saveFile(t(req), null, u(req), 'invoice', (req as any).file);
}));
router.post('/pay', wrap('company-expenses', async (req) => ce.pay(t(req), await viewerOf(req), Array.isArray(req.body?.ids) ? req.body.ids : [], req.body || {})));
router.post('/', wrap('company-expenses', async (req) => ce.createEntry(t(req), await viewerOf(req), req.body || {})));
router.get('/:id', wrap('company-expenses', async (req) => ce.detail(t(req), await viewerOf(req), req.params.id)));
router.put('/:id', wrap('company-expenses', async (req) => ce.updateEntry(t(req), await viewerOf(req), req.params.id, req.body || {})));
router.delete('/:id', wrap('company-expenses', async (req) => { await ce.cancelEntry(t(req), await viewerOf(req), req.params.id, req.body?.note); return { cancelled: true }; }));
router.post('/:id/act', wrap('company-expenses', async (req) => ce.actOn(t(req), await viewerOf(req), req.params.id, String(req.body?.action || ''), req.body?.note)));
router.post('/:id/unpay', wrap('company-expenses', async (req) => { await ce.unpay(t(req), await viewerOf(req), req.params.id); return { reopened: true }; }));

export default router;
