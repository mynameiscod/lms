/**
 * Employees, daily activity and expenses: the rules that matter, against a real database.
 * Identity numbers are stored encrypted; pay changes are recorded with the hike percentage;
 * a day can only be edited while open; an expense can never be approved by its own owner, and
 * walks the approval chain the institute chose.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Employee from '../../models/Employee';
import EmployeeFile from '../../models/EmployeeFile';
import * as svc from '../../services/employeeService';
import * as act from '../../services/employeeActivityService';
import * as exp from '../../services/employeeExpenseService';
import { decryptField } from '../../utils/fieldCrypto';

const T = String(new mongoose.Types.ObjectId());
const ADMIN = String(new mongoose.Types.ObjectId());
const today = () => svc.istDate();
const daysAgo = (n: number) => svc.istDate(new Date(Date.now() - n * 86_400_000));

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

const mkEmp = (o: any = {}) => svc.createEmployee(T, ADMIN, { firstName: 'Asha', lastName: 'Rao', workEmail: `asha${Math.random().toString(36).slice(2, 7)}@x.test`, ...o }, true);
const receipt = async (employeeId: string) => {
  const f: any = await EmployeeFile.create({ tenantId: new mongoose.Types.ObjectId(T), employeeId, kind: 'receipt', name: 'r.jpg', mime: 'image/jpeg', size: 10, storage: 'db', data: Buffer.from('x') });
  return { fileId: String(f._id), name: 'r.jpg' };
};

describe('employee records', () => {
  it('numbers employees EMP-0001, EMP-0002 and refuses a repeated work email', async () => {
    const a = await mkEmp({ workEmail: 'same@x.test' });
    const b = await mkEmp();
    expect([a.employeeCode, b.employeeCode]).toEqual(['EMP-0001', 'EMP-0002']);
    await expect(mkEmp({ workEmail: 'same@x.test' })).rejects.toThrow('already has that work email');
  });

  it('does not use up an employee id when the employee could not be saved', async () => {
    await expect(mkEmp({ gender: 'Robot' })).rejects.toThrow('not a valid gender');
    await expect(mkEmp({ firstName: '' })).rejects.toThrow('First name');
    await expect(mkEmp({ workMode: 'moon' })).rejects.toThrow('work mode');
    const first = await mkEmp();
    expect(first.employeeCode).toBe('EMP-0001');
    await expect(mkEmp({ workEmail: first.workEmail })).rejects.toThrow('already has that work email');
    expect((await mkEmp()).employeeCode).toBe('EMP-0002');
  });

  it('stores identity and bank numbers encrypted, and shows them only to those allowed', async () => {
    const e = await mkEmp({ sensitive: { pan: 'ABCDE1234F', bankAccountNumber: '123456789012', bankIfsc: 'HDFC0001234' } });
    const raw: any = await Employee.findById(e._id).lean();
    expect(raw.sensitive.pan).not.toContain('ABCDE');
    expect(decryptField(raw.sensitive.pan)).toBe('ABCDE1234F');
    const admin = svc.shapeEmployee(raw, { sensitive: true, hr: true });
    expect(admin.sensitive.pan).toBe('ABCDE1234F');
    const colleague = svc.shapeEmployee(raw, { sensitive: false, hr: true });
    expect(colleague.sensitive).toBeUndefined(); expect(colleague.currentCtc).toBeUndefined(); expect(colleague.compensationHistory).toBeUndefined();
    const self = svc.shapeEmployee(raw, { sensitive: false, self: true });
    expect(self.sensitive.pan).toBe('******234F'); expect(self.sensitive.bankAccountNumber).toBe('********9012'); expect(self.hrNotes).toBeUndefined();
  });

  it('leaves a stored number alone when the masked value comes back unchanged', async () => {
    const e = await mkEmp({ sensitive: { pan: 'ABCDE1234F' } });
    await svc.updateEmployee(T, ADMIN, String(e._id), { sensitive: { pan: '******234F' }, designation: 'Lead' }, { sensitive: true });
    const raw: any = await Employee.findById(e._id).lean();
    expect(decryptField(raw.sensitive.pan)).toBe('ABCDE1234F');
    expect(raw.designation).toBe('Lead');
  });

  it('records a hike with its percentage, and a promotion in the role history', async () => {
    const e = await mkEmp({ currentCtc: 400000, designation: 'Executive' });
    await svc.recordChange(T, ADMIN, String(e._id), { type: 'hike', newCtc: 460000, effectiveFrom: '2026-10-01', note: 'Annual' }, true);
    const after = await svc.recordChange(T, ADMIN, String(e._id), { type: 'promotion', designation: 'Team Lead' }, false);
    expect(after.currentCtc).toBe(460000);
    expect(after.compensationHistory.map((c: any) => [c.type, c.ctc, c.hikePercent])).toEqual([['joining', 400000, 0], ['hike', 460000, 15]]);
    expect(after.designation).toBe('Team Lead');
    expect(after.roleHistory.map((r: any) => r.type)).toEqual(['joining', 'promotion']);
    await expect(svc.recordChange(T, ADMIN, String(e._id), { newCtc: 1 }, false)).rejects.toThrow('not allowed to change pay');
  });

  it('refuses a reporting loop and a self-report', async () => {
    const boss = await mkEmp(); const mid = await mkEmp({ reportingManagerId: String(boss._id) });
    await expect(svc.updateEmployee(T, ADMIN, String(boss._id), { reportingManagerId: String(mid._id) }, { sensitive: false })).rejects.toThrow('reporting loop');
    await expect(svc.updateEmployee(T, ADMIN, String(boss._id), { reportingManagerId: String(boss._id) }, { sensitive: false })).rejects.toThrow('themselves');
    const leaf = await mkEmp({ reportingManagerId: String(mid._id) });
    expect((await svc.teamIds(T, String(boss._id))).sort()).toEqual([String(mid._id), String(leaf._id)].sort());
  });

  it('will not delete someone who has records, but exits them and can switch their login off', async () => {
    const e = await mkEmp();
    await act.checkIn(T, String(e._id), 'office');
    await expect(svc.deleteEmployee(T, String(e._id))).rejects.toThrow('Mark them as exited');
    const out = await svc.updateEmployee(T, ADMIN, String(e._id), { status: 'exited' }, { sensitive: false });
    expect(out.status).toBe('exited'); expect(out.exitDate).toBeTruthy();
  });
});

describe('daily activity', () => {
  it('walks check-in, tasks, submit, return, resubmit, approve', async () => {
    const e = await mkEmp(); const id = String(e._id);
    await act.checkIn(T, id, 'remote');
    await expect(act.submitLog(T, id, today())).rejects.toThrow('at least one task');
    await act.saveLog(T, id, today(), { tasks: [{ title: 'Called 30 leads', category: 'Calls', hours: 3.5 }, { title: 'Demo', hours: 2, status: 'done' }], blockers: 'CRM slow' });
    const day: any = await act.myDay(T, id, today());
    expect(day.totalHours).toBe(5.5);
    expect((await act.submitLog(T, id, today())).status).toBe('submitted');
    await expect(act.saveLog(T, id, today(), { summary: 'late edit' })).rejects.toThrow('submitted');
    const logId = String(day._id);
    await expect(act.reviewLog(T, { id: ADMIN, name: 'Boss' }, logId, 'return', '')).rejects.toThrow('what needs to change');
    expect((await act.reviewLog(T, { id: ADMIN, name: 'Boss' }, logId, 'return', 'Add hours for the demo')).status).toBe('returned');
    await act.saveLog(T, id, today(), { summary: 'fixed' });
    await act.submitLog(T, id, today());
    expect((await act.reviewLog(T, { id: ADMIN, name: 'Boss' }, logId, 'approve')).status).toBe('approved');
    await expect(act.saveLog(T, id, today(), { summary: 'again' })).rejects.toThrow('already approved');
  });

  it('refuses future days and days older than the edit window', async () => {
    const e = await mkEmp(); const id = String(e._id);
    await expect(act.saveLog(T, id, daysAgo(-2), { tasks: [{ title: 'x', hours: 1 }] })).rejects.toThrow('not happened yet');
    await expect(act.saveLog(T, id, daysAgo(10), { tasks: [{ title: 'x', hours: 1 }] })).rejects.toThrow('can be filled in for');
    expect((await act.saveLog(T, id, daysAgo(2), { tasks: [{ title: 'x', hours: 1 }] })).totalHours).toBe(1);
  });

  it('shows the board and counts missing working days in the history', async () => {
    const e = await mkEmp(); const id = String(e._id);
    await act.checkIn(T, id, 'office');
    const board = await act.dayBoard(T, { all: true });
    expect(board.find((b) => b.employeeId === id)?.state).toBe('checked_in');
    const hist = await act.myHistory(T, id, daysAgo(6), today());
    expect(hist).toHaveLength(7);
    expect(hist.find((h) => h.date === today())?.status).toBe('open');
  });
});

describe('expenses', () => {
  const policy = async (p: any) => svc.saveConfig(T, { expensePolicy: p });

  it('needs a receipt above the limit, and flags what an approver should look at', async () => {
    const e = await mkEmp(); const actor = { userId: ADMIN, name: 'Asha' };
    await expect(exp.createExpense(T, actor, e, { category: 'Travel', amount: 900 })).rejects.toThrow('Attach a receipt');
    const r = await receipt(String(e._id));
    const made = await exp.createExpense(T, actor, e, { category: 'Travel', amount: 900, receipts: [r], date: daysAgo(10) });
    expect(made.status).toBe('submitted'); expect(made.flags).toContain('backdated');
    await expect(exp.createExpense(T, actor, e, { category: 'Nonsense', amount: 10 })).rejects.toThrow('category');
    await expect(exp.createExpense(T, actor, e, { category: 'Travel', amount: 10, date: daysAgo(-1) })).rejects.toThrow('future');
    await expect(exp.createExpense(T, actor, e, { category: 'Travel', amount: 10, date: daysAgo(60) })).rejects.toThrow('days after');
  });

  it('manager approves first, then an approver; nobody approves their own; payment is accounts only', async () => {
    const manager = await mkEmp({ firstName: 'Manu' });
    await Employee.updateOne({ _id: manager._id }, { $set: { userId: new mongoose.Types.ObjectId() } });
    const mgr: any = await Employee.findById(manager._id).lean();
    const worker = await mkEmp({ firstName: 'Wendy', reportingManagerId: String(manager._id) });
    await Employee.updateOne({ _id: worker._id }, { $set: { userId: new mongoose.Types.ObjectId() } });
    const w: any = await Employee.findById(worker._id).lean();
    const made = await exp.createExpense(T, { userId: String(w.userId), name: 'Wendy' }, w, { category: 'Food & meals', amount: 300 });
    expect(made.stage).toBe('manager');

    const asManager: exp.Viewer = { userId: String(mgr.userId), name: 'Manu', employeeId: String(mgr._id), canApprove: false, canViewAll: false, canManage: false };
    const asApprover: exp.Viewer = { userId: ADMIN, name: 'Finance', canApprove: true, canViewAll: true, canManage: false };
    const asAccounts: exp.Viewer = { userId: ADMIN, name: 'Accounts', canApprove: false, canViewAll: true, canManage: true };
    const asWorker: exp.Viewer = { userId: String(w.userId), name: 'Wendy', employeeId: String(w._id), canApprove: true, canViewAll: true, canManage: true };

    expect((await exp.queue(T, asManager, { tab: 'mine' })).rows).toHaveLength(1);
    await expect(exp.actOn(T, asWorker, String(made._id), 'approve')).rejects.toThrow('your own');
    await expect(exp.actOn(T, asManager, String(made._id), 'reject', '')).rejects.toThrow('why you are rejecting');
    expect((await exp.actOn(T, asManager, String(made._id), 'approve', 'ok')).stage).toBe('approver');
    expect((await exp.queue(T, asManager, { tab: 'mine' })).rows).toHaveLength(0);
    const done = await exp.actOn(T, asApprover, String(made._id), 'approve');
    expect(done.status).toBe('approved');
    await expect(exp.markPaid(T, asApprover, [String(made._id)], {})).rejects.toThrow('cannot mark');
    expect((await exp.markPaid(T, asAccounts, [String(made._id)], { paymentMode: 'UPI', paymentRef: 'U1' })).paid).toBe(1);
    const csv = await exp.exportCsv(T, asAccounts, {});
    expect(csv).toContain('EMP-0002'); expect(csv).toContain('paid'); expect(csv).toContain('300.00');
    const sum = await exp.summary(T, asAccounts);
    expect(sum.byStatus.paid.total).toBe(300);
  });

  it('goes straight to approvers when the institute says so, and auto-approves small claims', async () => {
    const e = await mkEmp({ reportingManagerId: String((await mkEmp())._id) });
    await policy({ approvalMode: 'approvers', autoApproveBelow: 100 });
    const actor = { userId: ADMIN, name: 'Asha' };
    expect((await exp.createExpense(T, actor, e, { category: 'Travel', amount: 250 })).stage).toBe('approver');
    const small = await exp.createExpense(T, actor, e, { category: 'Travel', amount: 80 });
    expect(small.status).toBe('approved'); expect(small.trail.map((x: any) => x.action)).toContain('auto_approved');
  });

  it('lets an employee fix a rejected claim, which sends it back for approval, but not one already acted on', async () => {
    const e = await mkEmp(); const actor = { userId: ADMIN, name: 'Asha' };
    const made = await exp.createExpense(T, actor, e, { category: 'Other', amount: 50 });
    const approver: exp.Viewer = { userId: new mongoose.Types.ObjectId().toString(), name: 'F', canApprove: true, canViewAll: true, canManage: false };
    await exp.actOn(T, approver, String(made._id), 'reject', 'Wrong category');
    const fixed = await exp.updateExpense(T, actor, e, String(made._id), { category: 'Travel', amount: 60 });
    expect(fixed.status).toBe('submitted'); expect(fixed.category).toBe('Travel');
    await exp.actOn(T, approver, String(made._id), 'approve');
    await expect(exp.updateExpense(T, actor, e, String(made._id), { amount: 1 })).rejects.toThrow('already been acted on');
  });
});
