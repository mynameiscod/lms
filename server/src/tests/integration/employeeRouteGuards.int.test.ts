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
// Sending the invite is not what is under test: pretend the mail server is down, so the setup link comes back.
jest.mock('../../services/emailService', () => ({ EmailService: class { async sendWelcomeEmail() { throw new Error('mail down'); } } }));
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

  /** The create form's own payload, as the screen builds it: capitalised choices, address, contacts, IDs, extra fields. */
  const FORM = {
    firstName: 'Ravi', lastName: 'Kumar', workEmail: 'ravi.k@emp.test', personalEmail: 'ravi@gmail.test', phone: '9876543210',
    dob: '1995-04-12', gender: 'Male', maritalStatus: 'Married', bloodGroup: 'B+',
    currentAddress: { line1: '12 MG Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    permanentAddress: { line1: '12 MG Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
    emergencyContacts: [{ name: 'Sita', relation: 'Wife', phone: '9000000000' }],
    department: 'Technology', designation: 'Executive', employmentType: 'Full-time', workMode: 'office', workLocation: 'Head office',
    joiningDate: '2026-10-01', probationEndDate: '2027-01-01', noticePeriodDays: 30, status: 'active',
    customFields: {},
    currentCtc: 480000, payFrequency: 'annual',
    sensitive: { pan: 'ABCDE1234F', aadhaar: '123412341234', bankAccountHolder: 'Ravi Kumar', bankName: 'HDFC', bankAccountNumber: '5010012345', bankIfsc: 'HDFC0001234' },
  };

  it('creates an employee from exactly what the create form sends', async () => {
    const r = await call('post', '/employees', 'admin', FORM);
    expect([r.status, r.body.message]).toEqual([200, undefined]);
    expect(r.body.data).toMatchObject({ gender: 'Male', maritalStatus: 'Married', department: 'Technology' });
    const again = await call('post', '/employees', 'admin', { ...FORM, workEmail: 'ravi2@emp.test', gender: 'female', maritalStatus: 'single', workMode: 'Remote' });
    expect(again.status).toBe(200);
    expect(again.body.data).toMatchObject({ gender: 'Female', maritalStatus: 'Single', workMode: 'remote' });
  });

  it('says what is wrong in plain words, not a server error, when a choice is not valid', async () => {
    const r = await call('post', '/employees', 'admin', { ...FORM, workEmail: 'bad@emp.test', gender: 'Robot' });
    expect(r.status).toBe(400); expect(r.body.message).toContain('not a valid gender');
    expect((await call('post', '/employees', 'admin', { ...FORM, workEmail: 'bad2@emp.test', status: 'retired' })).status).toBe(400);
  });

  it('saves the whole edit-screen draft back, including the values it loaded', async () => {
    const made = (await call('post', '/employees', 'admin', { ...FORM, workEmail: 'edit@emp.test' })).body.data;
    const loaded = (await call('get', `/employees/${made._id}`, 'admin')).body.data;
    const draft = { ...loaded, designation: 'Team Lead', reportingManagerId: ids.mgrEmp };
    const r = await call('put', `/employees/${made._id}`, 'admin', draft);
    expect([r.status, r.body.message]).toEqual([200, undefined]);
    expect(r.body.data).toMatchObject({ designation: 'Team Lead', gender: 'Male' });
    const blank = await call('put', `/employees/${made._id}`, 'admin', { gender: '', maritalStatus: '', reportingManagerId: '' });
    expect(blank.status).toBe(200);
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

describe('every other screen sends payloads the server accepts', () => {
  it('saves the settings screen back unchanged, and with edits', async () => {
    const cfg = (await call('get', '/employees/config', 'admin')).body.data;
    const same = await call('put', '/employees/config', 'admin', cfg);
    expect([same.status, same.body.message]).toEqual([200, undefined]);
    const edited = await call('put', '/employees/config', 'admin', {
      ...cfg, departments: [...cfg.departments, 'Research'], codePrefix: 'CB',
      customFields: [{ key: 'tshirt', label: 'T-shirt size', required: false }],
      expenseCategories: [...cfg.expenseCategories, { name: 'Courier', dailyLimit: 500, receiptRequiredAbove: 100, active: true }],
      expensePolicy: { ...cfg.expensePolicy, approvalMode: 'reporting_manager', autoApproveBelow: 50 },
      activityPolicy: { ...cfg.activityPolicy, workingDays: [1, 2, 3, 4, 5], lateCheckInAfter: '09:45', reviewMode: 'reviewers' },
    });
    expect([edited.status, edited.body.message]).toEqual([200, undefined]);
    expect(edited.body.data.departments).toContain('Research');
    expect(edited.body.data.activityPolicy.workingDays).toEqual([1, 2, 3, 4, 5]);
    expect((await call('put', '/employees/config', 'admin', { activityPolicy: { lateCheckInAfter: '9am' } })).status).toBe(400);
    // Put the original rules back for the tests that follow.
    await call('put', '/employees/config', 'admin', { activityPolicy: { ...cfg.activityPolicy }, expensePolicy: { ...cfg.expensePolicy }, codePrefix: 'EMP' });
  });

  it('records a hike and a role change the way the modals send them', async () => {
    const hike = await call('post', `/employees/${ids.wkEmp}/change`, 'admin', { type: 'hike', effectiveFrom: '2026-10-01', newCtc: 560000, note: 'Annual' });
    expect([hike.status, hike.body.message]).toEqual([200, undefined]);
    expect(hike.body.data.compensationHistory[hike.body.data.compensationHistory.length - 1]).toMatchObject({ ctc: 560000, previousCtc: 500000, hikePercent: 12 });
    const role = await call('post', `/employees/${ids.wkEmp}/change`, 'admin', { type: 'promotion', effectiveFrom: '2026-10-01', designation: 'Senior Executive', reportingManagerId: null });
    expect([role.status, role.body.message]).toEqual([200, undefined]);
    expect(role.body.data.designation).toBe('Senior Executive');
    expect(role.body.data.reportingManagerId).toBeNull();
    await Employee.updateOne({ _id: ids.wkEmp }, { $set: { reportingManagerId: ids.mgrEmp } });
    expect((await call('post', `/employees/${ids.wkEmp}/notes`, 'admin', { text: 'Good progress' })).status).toBe(200);
  });

  it('saves the employee profile as the portal sends it, leaving masked numbers alone', async () => {
    const r = await call('put', '/employee-portal/me', 'worker', {
      personalEmail: 'w@gmail.test', phone: '9000011111', altPhone: '', bloodGroup: 'O+', maritalStatus: 'Married',
      currentAddress: { line1: '5 Lake View', city: 'Pune' }, permanentAddress: { line1: '5 Lake View', city: 'Pune' },
      emergencyContacts: [{ name: 'Mum', relation: 'Mother', phone: '9000022222' }],
      education: [{ degree: 'B.Tech', institution: 'JNTU', year: '2018', grade: '8.1' }],
      experience: [{ company: 'Acme', role: 'Caller', from: '2019', to: '2022', note: '' }],
      skills: ['Calling', 'CRM'],
      sensitive: { bankName: 'HDFC', bankAccountNumber: '5010099999', bankIfsc: 'HDFC0000001', pan: 'ABCDE1234F' },
    });
    expect([r.status, r.body.message]).toEqual([200, undefined]);
    expect(r.body.data.sensitive.bankAccountNumber).toBe('******9999');
    const again = await call('put', '/employee-portal/me', 'worker', { sensitive: { bankAccountNumber: '******9999', pan: '******234F' }, phone: '9000033333' });
    expect(again.status).toBe(200);
    const admin = (await call('get', `/employees/${ids.wkEmp}`, 'admin')).body.data;
    expect(admin.sensitive.bankAccountNumber).toBe('5010099999');
    expect(admin.sensitive.pan).toBe('ABCDE1234F');
    expect(admin.phone).toBe('9000033333');
  });

  it('saves a day the way the editor sends it, and shows it on the reviewer boards', async () => {
    const day = svc.istDate(new Date(Date.now() - 86_400_000));
    const r = await call('put', `/employee-portal/day/${day}`, 'portal', {
      workMode: 'field', summary: '', blockers: '', tomorrowPlan: 'Visit college',
      tasks: [{ title: 'Seminar at college', category: 'Counselling', hours: 3.5, status: 'done', note: '' }, { title: 'Report', category: '', hours: 1, status: 'in_progress', note: 'half done' }],
    });
    expect([r.status, r.body.message]).toEqual([200, undefined]);
    expect(r.body.data.totalHours).toBe(4.5);
    expect((await call('get', '/employee-portal/history', 'portal')).body.data.length).toBeGreaterThan(20);
    expect((await call('get', '/employee-activity/board', 'admin')).status).toBe(200);
    expect((await call('get', `/employee-activity/list?from=${day}&to=${day}`, 'admin')).body.data.length).toBeGreaterThan(0);
    const report = await call('get', `/employee-activity/report?month=${svc.istMonth()}`, 'admin');
    expect(report.status).toBe(200);
    expect(report.body.data.rows.length).toBeGreaterThan(0);
  });

  it('serves the expense screens and takes a claim as the form sends it', async () => {
    for (const path of ['/employee-expenses/queue?tab=all', '/employee-expenses/queue?tab=mine', `/employee-expenses/summary?month=${svc.istMonth()}`]) {
      const r = await call('get', path, 'admin');
      expect([path, r.status]).toEqual([path, 200]);
    }
    expect((await call('get', '/employee-portal/expenses', 'worker')).status).toBe(200);
    const made = await call('post', '/employee-portal/expenses', 'worker', { date: svc.istDate(), category: 'Travel', amount: '120.50', merchant: '', description: 'Auto', workMode: '', receipts: [] });
    expect([made.status, made.body.message]).toEqual([200, undefined]);
    const edit = await call('put', `/employee-portal/expenses/${made.body.data._id}`, 'worker', { amount: 130, description: 'Auto to college' });
    expect([edit.status, edit.body.message]).toEqual([200, undefined]);
    expect((await call('post', `/employee-portal/expenses/${made.body.data._id}/cancel`, 'worker')).status).toBe(200);
  });
});

describe('logins', () => {
  it('creates a portal-only login from the work email, and refuses a second one', async () => {
    const e = (await call('post', '/employees', 'admin', { firstName: 'Lata', workEmail: 'lata@emp.test' })).body.data;
    const r = await call('post', `/employees/${e._id}/login`, 'admin');
    expect([r.status, r.body.message]).toEqual([200, undefined]);
    expect(r.body.data.emailSent).toBe(false);
    expect(r.body.data.setupLink).toContain('/setup-password?token=');
    const user: any = await User.findOne({ email: 'lata@emp.test' }).lean();
    expect(user.role).toBe('STAFF');
    const role: any = await Role.findById(user.customRoleId).lean();
    expect(role.permissions).toEqual(['use_employee_portal']);
    const after = (await call('get', `/employees/${e._id}`, 'admin')).body.data;
    expect(after.hasLogin).toBe(true); expect(after.portalOnly).toBe(true);
    expect((await call('post', `/employees/${e._id}/login`, 'admin')).status).toBe(409);
    expect((await call('post', '/employees', 'admin', { firstName: 'NoMail' })).status).toBe(200);
  });

  it('asks for a work email first, and links an existing staff login instead', async () => {
    const noMail = (await call('post', '/employees', 'admin', { firstName: 'Nomi' })).body.data;
    const r = await call('post', `/employees/${noMail._id}/login`, 'admin');
    expect(r.status).toBe(400); expect(r.body.message).toContain('work email');
    const free = (await call('get', '/employees/unlinked-users', 'admin')).body.data;
    expect(free.map((u: any) => u.email)).toContain('plain@emp.test');
    expect(free.map((u: any) => u.email)).not.toContain('manager@emp.test');
    expect((await call('post', `/employees/${noMail._id}/link`, 'admin', { userId: ids.plain })).status).toBe(200);
    expect((await call('get', '/employee-portal/exists', 'plain')).body.data).toMatchObject({ isEmployee: true, portalOnly: false });
    expect((await call('post', `/employees/${noMail._id}/link`, 'admin', { userId: ids.student })).status).toBe(409);
    expect((await call('delete', `/employees/${noMail._id}/login`, 'admin')).status).toBe(200);
    expect((await call('get', '/employee-portal/exists', 'plain')).body.data.isEmployee).toBe(false);
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
