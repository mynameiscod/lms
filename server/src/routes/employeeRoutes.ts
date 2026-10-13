import express, { Request } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/employeeService';
import { t, u, actorOf, wrap, nameOf, oneFile, permsOf, employeeOfUser } from './employeeHttp';

/**
 * Employees (admin side): directory, profile, job and pay history, documents, logins, and the
 * institute's own lists and rules. Seeing salary and identity numbers needs its own permission.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

const view = roleGuard(['view_employees', 'manage_employees']);
const manage = roleGuard(['manage_employees']);

/** The lists and rules (departments, expense categories ...) are not secret: any signed-in person may read them to fill a form. */
router.get('/config', wrap('employees', (req) => svc.getConfig(t(req))));
router.put('/config', manage, wrap('employees', (req) => svc.saveConfig(t(req), req.body || {})));

router.get('/summary', view, wrap('employees', (req) => svc.summary(t(req))));
router.get('/pick', view, wrap('employees', (req) => svc.pickList(t(req))));
router.get('/unlinked-users', manage, wrap('employees', (req) => svc.unlinkedUsers(t(req), String(req.query.search || ''))));

/** A stored file: its owner may read it, and so may anyone who looks after that kind of record. */
router.get('/files/:fileId', async (req: Request, res) => {
  try {
    const f = await svc.fileMeta(t(req), req.params.fileId);
    const perms = await permsOf(actorOf(req));
    const mine = await employeeOfUser(t(req), u(req));
    const owner = !!(mine && f.employeeId && String(mine._id) === String(f.employeeId));
    const owned: any = owner || !f.employeeId ? null : await (await import('../models/Employee')).default.findOne({ _id: f.employeeId, tenantId: svc.oid(t(req)) }).select('reportingManagerId').lean();
    const isManager = !!(mine && owned?.reportingManagerId && String(owned.reportingManagerId) === String(mine._id));
    const staff = f.kind === 'invoice'
      ? ['view_expenses', 'approve_expenses', 'manage_expenses'].some((k) => perms.has(k))
      : f.kind === 'receipt'
      ? ['view_expenses', 'approve_expenses', 'manage_expenses', 'manage_employees'].some((k) => perms.has(k)) || isManager
      : ['view_employees', 'manage_employees'].some((k) => perms.has(k)) || (f.kind === 'photo' && isManager);
    if (!owner && !staff) return res.status(403).json({ success: false, message: 'You cannot open this file.' });
    const bytes = await svc.fileBytes(f);
    res.setHeader('Content-Type', f.mime || 'application/octet-stream');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Content-Disposition', `inline; filename="${String(f.name || 'file').replace(/[^\w.\- ]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.end(bytes);
  } catch (e: any) {
    const status = e instanceof svc.EmployeeError ? e.status : 500;
    if (status === 500) console.error('[employees] file', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Could not load the file' : e.message });
  }
});

router.get('/', view, wrap('employees', (req) => svc.listEmployees(t(req), req.query as any)));

router.post('/', manage, wrap('employees', async (req) => {
  const perms = await permsOf(actorOf(req));
  return svc.createEmployee(t(req), u(req), req.body || {}, perms.has('view_employee_sensitive'));
}));

router.get('/:id', view, wrap('employees', async (req) => {
  const perms = await permsOf(actorOf(req));
  const e = await svc.getEmployee(t(req), req.params.id);
  return svc.shapeEmployee(e, { sensitive: perms.has('view_employee_sensitive'), hr: perms.has('manage_employees') });
}));

router.put('/:id', manage, wrap('employees', async (req) => {
  const perms = await permsOf(actorOf(req));
  const e = await svc.updateEmployee(t(req), u(req), req.params.id, req.body || {}, { sensitive: perms.has('view_employee_sensitive') }, !!req.body?.deactivateLogin);
  return svc.shapeEmployee(e, { sensitive: perms.has('view_employee_sensitive'), hr: true });
}));

router.delete('/:id', manage, wrap('employees', async (req) => { await svc.deleteEmployee(t(req), req.params.id); return { deleted: true }; }));

/** A hike, promotion, transfer or reporting change. */
router.post('/:id/change', manage, wrap('employees', async (req) => {
  const perms = await permsOf(actorOf(req));
  const e = await svc.recordChange(t(req), u(req), req.params.id, req.body || {}, perms.has('view_employee_sensitive'));
  return svc.shapeEmployee(e, { sensitive: perms.has('view_employee_sensitive'), hr: true });
}));

router.post('/:id/notes', manage, wrap('employees', async (req) => {
  await svc.addNote(t(req), { id: u(req), name: await nameOf(req) }, req.params.id, req.body?.text);
  return { added: true };
}));

// Logins
router.post('/:id/login', manage, wrap('employees', (req) => svc.createLogin(t(req), req.params.id, { email: req.body?.email })));
router.post('/:id/link', manage, wrap('employees', async (req) => { await svc.linkUser(t(req), req.params.id, String(req.body?.userId || '')); return { linked: true }; }));
router.delete('/:id/login', manage, wrap('employees', async (req) => { await svc.unlinkLogin(t(req), req.params.id, !!req.body?.deactivate || req.query.deactivate === 'true'); return { removed: true }; }));

// Documents and photo
router.post('/:id/files', manage, oneFile('file'), wrap('employees', async (req) => {
  await svc.getEmployee(t(req), req.params.id);
  const kind = req.body?.kind === 'photo' ? 'photo' : 'document';
  const saved = await svc.saveFile(t(req), req.params.id, u(req), kind, (req as any).file);
  if (kind === 'photo') await svc.setPhoto(t(req), req.params.id, saved.fileId);
  else await svc.attachDocument(t(req), req.params.id, u(req), saved.fileId, String(req.body?.documentType || 'Other'));
  return saved;
}));
router.delete('/:id/documents/:fileId', manage, wrap('employees', async (req) => { await svc.removeDocument(t(req), req.params.id, req.params.fileId); return { removed: true }; }));

export default router;
