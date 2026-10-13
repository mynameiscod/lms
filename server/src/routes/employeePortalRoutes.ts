import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as svc from '../services/employeeService';
import * as act from '../services/employeeActivityService';
import * as exp from '../services/employeeExpenseService';
import { t, u, wrap, nameOf, oneFile, employeeOfUser } from './employeeHttp';

/**
 * The employee portal: what an employee sees of themselves. Open to anyone whose login is linked
 * to an employee record, and to nobody else; everything here is about the signed-in person only.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

/** Is this login an employee? The menu asks, and never gets an error for "no". */
router.get('/exists', wrap('employee-portal', async (req) => {
  const me = await employeeOfUser(t(req), u(req));
  if (!me || me.status === 'exited') return { isEmployee: false };
  const reports = await svc.teamIds(t(req), String(me._id));
  return { isEmployee: true, portalOnly: !!me.portalOnly, name: [me.firstName, me.lastName].filter(Boolean).join(' '), hasTeam: reports.length > 0 };
}));

const needEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await employeeOfUser(t(req), u(req));
    if (!me) return res.status(403).json({ success: false, code: 'NOT_EMPLOYEE', message: 'Your login is not linked to an employee record. Ask your administrator.' });
    if (me.status === 'exited') return res.status(403).json({ success: false, code: 'EXITED', message: 'Your employee record is closed.' });
    (req as any).employee = me;
    next();
  } catch (e) { next(e); }
};
router.use(needEmployee);
const emp = (req: Request) => (req as any).employee;
const todayIst = () => svc.istDate();

router.get('/me', wrap('employee-portal', async (req) => {
  const me = emp(req);
  const cfg = await svc.getConfig(t(req));
  const manager: any = me.reportingManagerId ? await svc.getEmployee(t(req), String(me.reportingManagerId)).catch(() => null) : null;
  return {
    employee: svc.shapeEmployee(me, { sensitive: false, self: true }),
    managerName: manager ? [manager.firstName, manager.lastName].filter(Boolean).join(' ') : '',
    today: await act.myDay(t(req), String(me._id), todayIst()),
    todayDate: todayIst(),
    config: {
      expenseCategories: (cfg.expenseCategories || []).filter((c: any) => c.active !== false),
      activityCategories: cfg.activityCategories,
      expensePolicy: cfg.expensePolicy,
      activityPolicy: cfg.activityPolicy,
    },
  };
}));

router.put('/me', wrap('employee-portal', async (req) => {
  const e = await svc.updateSelf(t(req), String(emp(req)._id), req.body || {});
  return svc.shapeEmployee(e, { sensitive: false, self: true });
}));

router.post('/photo', oneFile('file'), wrap('employee-portal', async (req) => {
  const saved = await svc.saveFile(t(req), String(emp(req)._id), u(req), 'photo', (req as any).file);
  await svc.setPhoto(t(req), String(emp(req)._id), saved.fileId);
  return saved;
}));

// Daily activity
router.post('/checkin', wrap('employee-portal', (req) => act.checkIn(t(req), String(emp(req)._id), String(req.body?.workMode || 'office'))));
router.post('/checkout', wrap('employee-portal', (req) => act.checkOut(t(req), String(emp(req)._id))));
router.get('/history', wrap('employee-portal', (req) => {
  const to = String(req.query.to || todayIst());
  const from = String(req.query.from || new Date(new Date(to + 'T00:00:00Z').getTime() - 29 * 86_400_000).toISOString().slice(0, 10));
  return act.myHistory(t(req), String(emp(req)._id), from, to);
}));
router.get('/day/:date', wrap('employee-portal', (req) => act.myDay(t(req), String(emp(req)._id), req.params.date)));
router.put('/day/:date', wrap('employee-portal', (req) => act.saveLog(t(req), String(emp(req)._id), req.params.date, req.body || {})));
router.post('/day/:date/submit', wrap('employee-portal', (req) => act.submitLog(t(req), String(emp(req)._id), req.params.date)));

// Expenses
router.get('/expenses', wrap('employee-portal', (req) => exp.listMine(t(req), String(emp(req)._id), req.query as any)));
router.post('/expenses/receipt', oneFile('file'), wrap('employee-portal', (req) => svc.saveFile(t(req), String(emp(req)._id), u(req), 'receipt', (req as any).file)));
router.post('/expenses', wrap('employee-portal', async (req) => exp.createExpense(t(req), { userId: u(req), name: await nameOf(req) }, emp(req), req.body || {})));
router.put('/expenses/:id', wrap('employee-portal', async (req) => exp.updateExpense(t(req), { userId: u(req), name: await nameOf(req) }, emp(req), req.params.id, req.body || {})));
router.post('/expenses/:id/cancel', wrap('employee-portal', async (req) => { await exp.cancelExpense(t(req), { userId: u(req), name: await nameOf(req) }, emp(req), req.params.id); return { cancelled: true }; }));

export default router;
