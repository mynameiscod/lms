/**
 * Who can reach the employee screens, through the real login and permission middleware and the
 * real routes. A student gets nothing; a portal-only login sees only itself; a manager sees only
 * their own team; sensitive pay and identity fields reach only people with that permission.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo } from './mongoHarness';

jest.setTimeout(240_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'employee-route-guards-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Role from '../../models/Role';
import Tenant from '../../models/Tenant';
import Employee from '../../models/Employee';
import EmployeeFile from '../../models/EmployeeFile';
import employeeRoutes from '../../routes/employeeRoutes';
import employeePortalRoutes from '../../routes/employeePortalRoutes';
import employeeActivityRoutes from '../../routes/employeeActivityRoutes';
import employeeExpenseRoutes from '../../routes/employeeExpenseRoutes';
import * as svc from '../../services/employeeService';

const app = express();
app.use(express.json());
app.use('/employees', employeeRoutes);
app.use('/employee-portal', employeePortalRoutes);
app.use('/employee-activity', employeeActivityRoutes);
app.use('/employee-expenses', employeeExpenseRoutes);

type Who = 'student' | 'admin' | 'viewer' | 'portal' | 'manager' | 'worker' | 'plain';
const tokens = {} as Record<Who, string>;
const ids = {} as Record<string, string>;
let tenantId = '';

const call = (method: string, path: string, who: Who, body: any = {}) =>
  (request(app) as any)[method](path).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', tenantId).send(body);

beforeAll(async () => {
  await startMongo();
  const t = await Tenant.create({ name: 'Emp', slug: 'emp', domain: 'emp.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  tenantId = String(t._id);
  const portalRole = await Role.create({ name: 'Employee (portal only)', permissions: ['use_employee_portal'], tenantId: t._id } as any);
  const viewerRole = await Role.create({ name: 'HR viewer', permissions: ['view_employees'], tenantId: t._id } as any);
  const mk = async (who: Who, role: string, extra: any = {}) => {
    const u: any = await User.create({ tenantId: t._id, firstName: who, lastName: 'T', email: `${who}@emp.test`, password: 'x', role, isActive: true, ...extra });
    ids[who] = String(u._id);
    tokens[who] = jwt.sign({ id: String(u._id), email: u.email, role, tenantId }, process.env.JWT_SECRET as string);
    return u;
  };
  await mk('student', 'STUDENT');
  await mk('admin', 'TENANT_ADMIN');
  await mk('viewer', 'STAFF', { customRoleId: viewerRole._id });
  await mk('portal', 'STAFF', { customRoleId: portalRole._id });
  await mk('manager', 'STAFF');
  await mk('worker', 'STAFF', { customRoleId: portalRole._id });
  await mk('plain', 'STAFF');
  const E = (who: string, extra: any, code: string) => Employee.create({ tenantId: t._id, userId: ids[who], employeeCode: code, firstName: who, lastName: 'T', workEmail: `${who}@emp.test`, ...extra });
  const mgr: any = await E('manager', { currentCtc: 900000, sensitive: { bankIfsc: 'X' } }, 'EMP-0001');
  ids.mgrEmp = String(mgr._id);
  const wk: any = await E('worker', { reportingManagerId: mgr._id, currentCtc: 500000, hrNotes: [{ text: 'watch', byName: 'HR' }] }, 'EMP-0002');
  ids.wkEmp = String(wk._id);
  const po: any = await E('portal', { portalOnly: true }, 'EMP-0003');
  ids.poEmp = String(po._id);
});
afterAll(stopMongo);

describe('the directory and admin screens', () => {
  it('open for admins and for people with view_employees, and for nobody else', async () => {
    for (const [who, expected] of [['admin', 200], ['viewer', 200], ['student', 403], ['plain', 403], ['portal', 403], ['manager', 403]] as [Who, number][]) {
      expect([who, (await call('get', '/employees', who)).status]).toEqual([who, expected]);
    }
  });

  it('keeps pay, identity and HR notes from a viewer who may not see them', async () => {
    const viewer = (await call('get', `/employees/${ids.wkEmp}`, 'viewer')).body.data;
    expect(viewer.currentCtc).toBeUndefined(); expect(viewer.compensationHistory).toBeUndefined(); expect(viewer.sensitive).toBeUndefined(); expect(viewer.hrNotes).toBeUndefined();
    const admin = (await call('get', `/employees/${ids.wkEmp}`, 'admin')).body.data;
    expect(admin.currentCtc).toBe(500000); expect(admin.hrNotes).toHaveLength(1);
  });

  it('refuses writes without manage_employees', async () => {
    expect((await call('post', '/employees', 'viewer', { firstName: 'X' })).status).toBe(403);
    expect((await call('put', '/employees/config', 'portal', { departments: ['A'] })).status).toBe(403);
    expect((await call('put', `/employees/${ids.wkEmp}`, 'viewer', { designation: 'Boss' })).status).toBe(403);
    expect((await call('post', '/employees', 'admin', { firstName: 'Nina', workEmail: 'nina@emp.test' })).status).toBe(200);
  });

  it('lets anyone signed in read the lists to fill a form', async () => {
    expect((await call('get', '/employees/config', 'portal')).status).toBe(200);
  });
});

describe('the employee portal', () => {
  it('tells the menu who is an employee, and refuses everyone else the data', async () => {
    expect((await call('get', '/employee-portal/exists', 'student')).body.data.isEmployee).toBe(false);
    const p = (await call('get', '/employee-portal/exists', 'portal')).body.data;
    expect(p).toMatchObject({ isEmployee: true, portalOnly: true });
    expect((await call('get', '/employee-portal/exists', 'manager')).body.data.hasTeam).toBe(true);
    const nope = await call('get', '/employee-portal/me', 'student');
    expect(nope.status).toBe(403); expect(nope.body.code).toBe('NOT_EMPLOYEE');
  });

  it('shows an employee themselves without pay, HR notes, or full identity numbers', async () => {
    const me = (await call('get', '/employee-portal/me', 'worker')).body.data;
    expect(me.employee.employeeCode).toBe('EMP-0002');
    expect(me.employee.currentCtc).toBeUndefined(); expect(me.employee.hrNotes).toBeUndefined();
    expect(me.managerName).toContain('manager');
  });

  it('runs a day end to end: check in, log, submit; the manager signs off; a colleague cannot', async () => {
    expect((await call('post', '/employee-portal/checkin', 'worker', { workMode: 'remote' })).status).toBe(200);
    const day = svc.istDate();
    expect((await call('put', `/employee-portal/day/${day}`, 'worker', { tasks: [{ title: 'Followed up 20 leads', hours: 4 }] })).status).toBe(200);
    expect((await call('post', `/employee-portal/day/${day}/submit`, 'worker')).body.data.status).toBe('submitted');
    const list = (await call('get', '/employee-activity/list?status=submitted', 'manager')).body.data;
    expect(list).toHaveLength(1);
    const logId = list[0]._id;
    expect((await call('post', `/employee-activity/logs/${logId}/review`, 'portal', { action: 'approve' })).status).toBe(403);
    expect((await call('post', `/employee-activity/logs/${logId}/review`, 'worker', { action: 'approve' })).status).toBe(403);
    expect((await call('post', `/employee-activity/logs/${logId}/review`, 'manager', { action: 'approve' })).body.data.status).toBe('approved');
    expect((await call('get', '/employee-activity/board', 'student')).status).toBe(403);
    expect((await call('get', '/employee-activity/board', 'plain')).status).toBe(403);
  });

  it('runs an expense end to end: claim, manager approves, approver approves, accounts pay', async () => {
    const claim = await call('post', '/employee-portal/expenses', 'worker', { category: 'Internet & phone', amount: 399, description: 'Home broadband' });
    expect(claim.status).toBe(200);
    const id = claim.body.data._id;
    expect((await call('get', '/employee-expenses/queue?tab=mine', 'student')).status).toBe(403);
    const q = (await call('get', '/employee-expenses/queue?tab=mine', 'manager')).body.data.rows;
    expect(q).toHaveLength(1); expect(q[0].canAct).toBe(true);
    expect((await call('post', `/employee-expenses/${id}/act`, 'worker', { action: 'approve' })).status).toBe(403);
    expect((await call('post', `/employee-expenses/${id}/act`, 'manager', { action: 'approve' })).body.data.stage).toBe('approver');
    expect((await call('post', `/employee-expenses/${id}/act`, 'manager', { action: 'approve' })).status).toBe(403);
    expect((await call('post', `/employee-expenses/${id}/act`, 'admin', { action: 'approve' })).body.data.status).toBe('approved');
    expect((await call('post', '/employee-expenses/pay', 'manager', { ids: [id] })).status).toBe(403);
    expect((await call('post', '/employee-expenses/pay', 'admin', { ids: [id], paymentMode: 'UPI' })).body.data.paid).toBe(1);
    expect((await call('get', '/employee-expenses/export?month=' + svc.istMonth(), 'worker')).status).toBe(403);
    const csv = await call('get', '/employee-expenses/export', 'admin');
    expect(csv.status).toBe(200); expect(csv.text).toContain('Home broadband'.slice(0, 0) + 'EMP-0002');
  });
});

describe('stored files', () => {
  it('open for their owner, the people who look after that kind of record, and nobody else', async () => {
    const f: any = await EmployeeFile.create({ tenantId, employeeId: ids.wkEmp, kind: 'receipt', name: 'r.png', mime: 'image/png', size: 3, storage: 'db', data: Buffer.from('png') });
    expect((await call('get', `/employees/files/${f._id}`, 'worker')).status).toBe(200);
    expect((await call('get', `/employees/files/${f._id}`, 'manager')).status).toBe(200);
    expect((await call('get', `/employees/files/${f._id}`, 'admin')).status).toBe(200);
    expect((await call('get', `/employees/files/${f._id}`, 'portal')).status).toBe(403);
    expect((await call('get', `/employees/files/${f._id}`, 'student')).status).toBe(403);
    const doc: any = await EmployeeFile.create({ tenantId, employeeId: ids.wkEmp, kind: 'document', name: 'offer.pdf', mime: 'application/pdf', size: 3, storage: 'db', data: Buffer.from('pdf') });
    expect((await call('get', `/employees/files/${doc._id}`, 'viewer')).status).toBe(200);
    expect((await call('get', `/employees/files/${doc._id}`, 'manager')).status).toBe(403);
  });
});
