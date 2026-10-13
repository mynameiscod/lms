/**
 * The company expense ledger against a real database: bills and who may approve them, recurring
 * rent that appears once a month and never twice, salaries made from the pay on each profile,
 * employee claims that join the ledger when paid, and salary lines hidden from people who may
 * not see pay.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Employee from '../../models/Employee';
import EmployeeFile from '../../models/EmployeeFile';
import CompanyExpense from '../../models/CompanyExpense';
import * as svc from '../../services/employeeService';
import * as ce from '../../services/companyExpenseService';
import * as exp from '../../services/employeeExpenseService';

const T = String(new mongoose.Types.ObjectId());
const id = () => String(new mongoose.Types.ObjectId());
const ACCOUNTS: ce.Viewer = { userId: id(), name: 'Accounts', canViewAll: true, canManage: true, canApprove: false, canSalary: false };
const APPROVER: ce.Viewer = { userId: id(), name: 'Owner', canViewAll: true, canManage: false, canApprove: true, canSalary: false };
const OWNER: ce.Viewer = { userId: id(), name: 'Founder', canViewAll: true, canManage: true, canApprove: true, canSalary: true };
const READER: ce.Viewer = { userId: id(), name: 'Reader', canViewAll: true, canManage: false, canApprove: false, canSalary: false };
const today = () => svc.istDate();
const thisMonth = () => svc.istMonth();

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => { await clearCollections(); });

const bill = (o: any = {}) => ce.createEntry(T, ACCOUNTS, { category: 'Software & subscriptions', vendor: 'Zoho', title: 'CRM seats', amount: 12000, ...o });

describe('bills and approval', () => {
  it('waits for an approver, except in categories that need none', async () => {
    const sw = await bill();
    expect(sw.status).toBe('pending'); expect(sw.kind).toBe('bill'); expect(sw.month).toBe(thisMonth());
    const rent = await bill({ category: 'Rent', vendor: 'Landlord', title: 'Office rent', amount: 45000 });
    expect(rent.status).toBe('approved');
    await expect(ce.createEntry(T, READER, { category: 'Rent', title: 'x', amount: 1 })).rejects.toThrow('cannot record');
  });

  it('checks the bill: category, amount, a name or a vendor, dates, tax', async () => {
    await expect(bill({ category: 'Pizza' })).rejects.toThrow('category');
    await expect(bill({ amount: 0 })).rejects.toThrow('amount');
    await expect(bill({ vendor: '', title: '' })).rejects.toThrow('what it was for');
    await expect(bill({ date: '2026-13-45' })).rejects.toThrow('date');
    await expect(bill({ gst: 99999999 })).rejects.toThrow('tax');
    await svc.saveConfig(T, { companyPolicy: { invoiceRequiredAbove: 5000 } });
    await expect(bill({ amount: 6000 })).rejects.toThrow('Attach the bill');
    const f: any = await EmployeeFile.create({ tenantId: T, kind: 'invoice', name: 'inv.pdf', mime: 'application/pdf', size: 3, storage: 'db', data: Buffer.from('x') });
    expect((await bill({ amount: 6000, invoices: [{ fileId: String(f._id) }] })).invoices).toHaveLength(1);
  });

  it('is approved by someone who may, who may be the person who recorded it only if the institute allows', async () => {
    const e = await ce.createEntry(T, OWNER, { category: 'Marketing & advertising', vendor: 'Meta', title: 'Ads', amount: 30000 });
    expect((await ce.actOn(T, OWNER, String(e._id), 'approve')).status).toBe('approved');
    const e2 = await ce.createEntry(T, OWNER, { category: 'Marketing & advertising', vendor: 'Meta', title: 'Ads 2', amount: 30000 });
    await svc.saveConfig(T, { companyPolicy: { allowSelfApproval: false } });
    await expect(ce.actOn(T, OWNER, String(e2._id), 'approve')).rejects.toThrow('your own entries');
    await expect(ce.actOn(T, ACCOUNTS, String(e2._id), 'approve')).rejects.toThrow('cannot approve');
    await expect(ce.actOn(T, APPROVER, String(e2._id), 'reject', '')).rejects.toThrow('why');
    expect((await ce.actOn(T, APPROVER, String(e2._id), 'reject', 'Duplicate of invoice 44')).status).toBe('rejected');
    // Fixing a rejected bill sends it back for approval.
    expect((await ce.updateEntry(T, ACCOUNTS, String(e2._id), { amount: 25000 })).status).toBe('pending');
  });

  it('is paid only once approved, and by accounts; payment can be undone', async () => {
    const e = await bill();
    await expect(ce.pay(T, ACCOUNTS, [String(e._id)], { paymentMode: 'UPI' }).then((r) => r.paid)).resolves.toBe(0);
    await ce.actOn(T, APPROVER, String(e._id), 'approve');
    await expect(ce.pay(T, APPROVER, [String(e._id)], {})).rejects.toThrow('cannot mark');
    expect((await ce.pay(T, ACCOUNTS, [String(e._id)], { paymentMode: 'UPI', paymentRef: 'U123', paidOn: today() })).paid).toBe(1);
    await expect(ce.updateEntry(T, ACCOUNTS, String(e._id), { amount: 1 })).rejects.toThrow('already paid');
    await ce.unpay(T, ACCOUNTS, String(e._id));
    expect((await ce.detail(T, ACCOUNTS, String(e._id))).status).toBe('approved');
  });

  it('records a bill that was already paid in one step, only for someone who may approve', async () => {
    await expect(bill({ recordAsPaid: true, paymentMode: 'Cash' })).rejects.toThrow('may record a bill as already paid');
    const paid = await ce.createEntry(T, OWNER, { category: 'Travel', title: 'Train tickets', vendor: 'IRCTC', amount: 2400, recordAsPaid: true, paymentMode: 'Card', paidOn: today() });
    expect(paid.status).toBe('paid'); expect(paid.paidOn).toBe(today());
  });

  it('changing an approved amount sends it back for approval', async () => {
    const e = await bill(); await ce.actOn(T, APPROVER, String(e._id), 'approve');
    expect((await ce.updateEntry(T, ACCOUNTS, String(e._id), { description: 'only a note' })).status).toBe('approved');
    expect((await ce.updateEntry(T, ACCOUNTS, String(e._id), { amount: 15000 })).status).toBe('pending');
  });
});

describe('recurring costs', () => {
  it('adds each month once the day has come, and never twice', async () => {
    const tmpl = await ce.createRecurring(T, ACCOUNTS, { title: 'Office rent', category: 'Rent', vendor: 'Landlord', amount: 45000, dayOfMonth: 5, startMonth: '2026-08' });
    const early = await ce.generateRecurring(T, { name: 'Schedule' }, '2026-10', '2026-10-03');
    expect(early.added).toBe(0);
    expect((await ce.generateRecurring(T, { name: 'Schedule' }, '2026-10', '2026-10-05')).added).toBe(1);
    expect((await ce.generateRecurring(T, { name: 'Schedule' }, '2026-10', '2026-10-20')).added).toBe(0);
    // A past month that was missed is filled in, once.
    expect((await ce.generateRecurring(T, { name: 'Schedule' }, '2026-09', '2026-10-20')).added).toBe(1);
    expect((await ce.generateRecurring(T, { name: 'Schedule' }, '2026-07', '2026-10-20')).added).toBe(0);
    const rows = await CompanyExpense.find({ recurringId: tmpl._id }).sort({ month: 1 }).lean();
    expect(rows.map((r: any) => [r.month, r.date, r.status, r.kind])).toEqual([['2026-09', '2026-09-05', 'approved', 'recurring'], ['2026-10', '2026-10-05', 'approved', 'recurring']]);
  });

  it('stops at the end month and when switched off', async () => {
    const t1 = await ce.createRecurring(T, ACCOUNTS, { title: 'Tool', category: 'Software & subscriptions', amount: 999, dayOfMonth: 1, startMonth: '2026-09', endMonth: '2026-09' });
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-10', '2026-10-10')).added).toBe(0);
    await ce.updateRecurring(T, ACCOUNTS, String(t1._id), { endMonth: '', active: false });
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-10', '2026-10-10')).added).toBe(0);
    await expect(ce.createRecurring(T, ACCOUNTS, { title: 'x', category: 'Rent', amount: 1, startMonth: '2026-10', endMonth: '2026-08' })).rejects.toThrow('end month');
    await expect(ce.createRecurring(T, ACCOUNTS, { title: 'x', category: 'Rent', amount: 1, dayOfMonth: 31, startMonth: '2026-10' })).rejects.toThrow('1 to 28');
  });
});

describe('salaries', () => {
  const person = (o: any) => Employee.create({ tenantId: T, employeeCode: `E${Math.random().toString(36).slice(2, 6)}`, firstName: 'P', status: 'active', ...o });

  it('are made from each profile, once a month, and need both permissions', async () => {
    await person({ firstName: 'Annual', currentCtc: 600000, payFrequency: 'annual', joiningDate: new Date('2026-01-01') });
    await person({ firstName: 'Monthly', currentCtc: 30000, payFrequency: 'monthly' });
    await person({ firstName: 'NoPay', currentCtc: 0 });
    await person({ firstName: 'Gone', currentCtc: 50000, status: 'exited' });
    await person({ firstName: 'Future', currentCtc: 40000, joiningDate: new Date('2027-03-01') });
    await expect(ce.salaryPreview(T, ACCOUNTS, '2026-10')).rejects.toThrow('both');
    const p = await ce.salaryPreview(T, OWNER, '2026-10');
    expect(p.rows.map((r) => [r.name, r.amount])).toEqual([['Annual', 50000], ['Monthly', 30000]]);
    expect(p.total).toBe(80000);
    expect((await ce.generateSalaries(T, OWNER, { month: '2026-10' })).added).toBe(2);
    expect((await ce.generateSalaries(T, OWNER, { month: '2026-10' })).added).toBe(0);
    const lines = await CompanyExpense.find({ kind: 'salary' }).lean();
    expect(lines.map((l: any) => [l.amount, l.status, l.category, l.month]).sort()).toEqual([[30000, 'approved', 'Salaries', '2026-10'], [50000, 'approved', 'Salaries', '2026-10']]);
  });

  it('can be adjusted before paying, for one person', async () => {
    const a: any = await person({ firstName: 'Adj', currentCtc: 120000, payFrequency: 'annual' });
    await ce.generateSalaries(T, OWNER, { month: '2026-10', amounts: { [String(a._id)]: 8500 } });
    const line: any = await CompanyExpense.findOne({ employeeId: a._id }).lean();
    expect(line.amount).toBe(8500);
    expect((await ce.updateEntry(T, OWNER, String(line._id), { amount: 9000 })).amount).toBe(9000);
  });

  it('are listed line by line only for people who may see pay, but counted in the totals for everyone', async () => {
    await person({ firstName: 'Secret', currentCtc: 240000 });
    await ce.generateSalaries(T, OWNER, { month: thisMonth() });
    await bill({ amount: 1000 });
    const asOwner = await ce.ledger(T, OWNER, { month: thisMonth() });
    expect(asOwner.rows.map((r: any) => r.kind).sort()).toEqual(['bill', 'salary']);
    const asReader = await ce.ledger(T, READER, { month: thisMonth() });
    expect(asReader.rows.map((r: any) => r.kind)).toEqual(['bill']);
    expect(asReader.hiddenSalaryLines).toBe(true);
    expect((await ce.ledger(T, READER, { kind: 'salary' })).rows).toEqual([]);
    const sum = await ce.summary(T, READER, thisMonth());
    expect(sum.byCategory.find((c) => c.category === 'Salaries')?.total).toBe(20000);
    expect(sum.salaryLinesHidden).toBe(true);
    expect((await ce.exportCsv(T, READER, {})).includes('Secret')).toBe(false);
    expect((await ce.exportCsv(T, OWNER, {})).includes('Secret')).toBe(true);
  });
});

describe('employee claims in the ledger', () => {
  it('appear when paid, once, and go when the payment is undone', async () => {
    const emp: any = await Employee.create({ tenantId: T, employeeCode: 'E1', firstName: 'Wendy', lastName: 'W', status: 'active' });
    const claim = await exp.createExpense(T, { userId: id(), name: 'Wendy' }, emp, { category: 'Travel', amount: 450 });
    const approver: exp.Viewer = { userId: id(), name: 'Fin', canApprove: true, canViewAll: true, canManage: true };
    await exp.actOn(T, approver, String(claim._id), 'approve');
    expect((await ce.ledger(T, OWNER, {})).rows).toHaveLength(0);
    await exp.markPaid(T, approver, [String(claim._id)], { paymentMode: 'UPI', paymentRef: 'R9' });
    await exp.markPaid(T, approver, [String(claim._id)], {});
    const rows = (await ce.ledger(T, OWNER, {})).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'reimbursement', category: 'Employee reimbursements', amount: 450, status: 'paid', employeeName: 'Wendy W', paymentRef: 'R9', canEdit: false, canPay: false });
    await expect(ce.updateEntry(T, OWNER, String(rows[0]._id), { amount: 1 })).rejects.toThrow('employee claim');
    await expect(ce.cancelEntry(T, OWNER, String(rows[0]._id))).rejects.toThrow('employee claim');
    await exp.reopenPaid(T, approver, String(claim._id));
    expect((await ce.ledger(T, OWNER, {})).rows).toHaveLength(0);
  });
});

describe('overdue', () => {
  const daysAgo = (n: number) => svc.istDate(new Date(Date.now() - n * 86_400_000));

  it('marks unpaid lines past their day as overdue, and clears it when paid', async () => {
    const late = await bill({ dueDate: daysAgo(5), amount: 1000 });
    const notYet = await bill({ dueDate: svc.istDate(new Date(Date.now() + 3 * 86_400_000)), amount: 2000 });
    await bill({ amount: 500 }); // no due date: never overdue
    await ce.createRecurring(T, ACCOUNTS, { title: 'Rent', category: 'Rent', amount: 45000, dayOfMonth: 1, startMonth: '2026-06' });
    await ce.generateRecurring(T, { name: 's' }, '2026-06', daysAgo(0));
    const rows = (await ce.ledger(T, READER, {})).rows;
    expect(rows.find((r: any) => r._id === String(late._id))).toMatchObject({ overdue: true, daysOverdue: 5, dueOn: daysAgo(5) });
    expect(rows.find((r: any) => r._id === String(notYet._id))).toMatchObject({ overdue: false, daysOverdue: 0 });
    const rent: any = rows.find((r: any) => r.kind === 'recurring');
    expect(rent.overdue).toBe(true);
    const only = (await ce.ledger(T, READER, { overdue: 'true' })).rows;
    expect(only.map((r: any) => r.kind).sort()).toEqual(['bill', 'recurring']);
    const s1 = await ce.summary(T, READER, svc.istMonth());
    expect(s1.overdue).toEqual({ count: 2, total: 46000 });
    expect(s1.dueSoon).toEqual({ count: 1, total: 2000 });
    await ce.actOn(T, APPROVER, String(late._id), 'approve');
    await ce.pay(T, ACCOUNTS, [String(late._id), rent._id], { paymentMode: 'Bank' });
    expect((await ce.summary(T, READER, svc.istMonth())).overdue).toEqual({ count: 0, total: 0 });
    expect((await ce.ledger(T, READER, { overdue: 'true' })).rows).toHaveLength(0);
  });
});

describe('costs paid every few months, and paid ahead', () => {
  const rows = async (tid: any) => (await CompanyExpense.find({ recurringId: tid }).sort({ month: 1 }).lean()).map((r: any) => [r.month, r.status, r.paymentRef || '']);

  it('adds a line only in the months it falls due when it is paid every four months', async () => {
    await ce.createRecurring(T, ACCOUNTS, { title: 'Rent (4-monthly)', category: 'Rent', amount: 180000, dayOfMonth: 1, everyMonths: 4, startMonth: '2026-06' });
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-07', '2026-12-01')).added).toBe(0);
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-09', '2026-12-01')).added).toBe(0);
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-10', '2026-12-01')).added).toBe(1);
    expect((await ce.generateRecurring(T, { name: 's' }, '2026-06', '2026-12-01')).added).toBe(1);
    await expect(ce.createRecurring(T, ACCOUNTS, { title: 'x', category: 'Rent', amount: 1, everyMonths: 5, startMonth: '2026-06' })).rejects.toThrow('every 1, 2, 3, 4, 6 or 12');
  });

  it('pays several months at once, under one payment, and never pays one twice', async () => {
    const m0 = svc.istMonth();
    const rent = await ce.createRecurring(T, ACCOUNTS, { title: 'Office rent', category: 'Rent', amount: 45000, dayOfMonth: 1, startMonth: m0 });
    await ce.generateRecurring(T, { name: 's' }, m0, `${m0}-28`); // this month is already in the ledger, unpaid
    const first = await ce.payAhead(T, ACCOUNTS, String(rent._id), { periods: 4, paymentMode: 'Bank', paymentRef: 'NEFT-77' });
    expect(first.covered).toHaveLength(4);
    expect(first.covered[0]).toBe(m0);
    const lines = await rows(rent._id);
    expect(lines).toHaveLength(4);
    expect(lines.every(([, st, ref]) => st === 'paid' && ref === 'NEFT-77')).toBe(true);
    const second = await ce.payAhead(T, ACCOUNTS, String(rent._id), { periods: 2, paymentRef: 'NEFT-78' });
    expect(second.covered).toHaveLength(2);
    const after = (x: string) => new Date(Date.UTC(Number(x.slice(0, 4)), Number(x.slice(5, 7)), 1)).toISOString().slice(0, 7);
    expect(second.covered[0]).toBe(after(first.covered[3]));
    expect(await rows(rent._id)).toHaveLength(6);
    // The ledger totals count each month once.
    expect((await ce.ledger(T, READER, { status: 'paid' })).totals.paid).toBe(6 * 45000);
  });

  it('steps by the billing interval, and stops at the end month', async () => {
    const m0 = svc.istMonth();
    const q = await ce.createRecurring(T, ACCOUNTS, { title: 'Quarterly fee', category: 'Rent', amount: 9000, dayOfMonth: 5, everyMonths: 3, startMonth: m0 });
    const r = await ce.payAhead(T, ACCOUNTS, String(q._id), { periods: 3 });
    const idx = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
    expect(r.covered.map((m, i) => idx(m) - idx(m0) - 3 * i)).toEqual([0, 0, 0]);
    const ended = await ce.createRecurring(T, ACCOUNTS, { title: 'Short lease', category: 'Rent', amount: 100, dayOfMonth: 1, startMonth: m0, endMonth: m0 });
    expect((await ce.payAhead(T, ACCOUNTS, String(ended._id), { periods: 5 })).covered).toEqual([m0]);
    await expect(ce.payAhead(T, ACCOUNTS, String(q._id), { periods: 0 })).rejects.toThrow('1 to 12');
  });

  it('needs someone who can approve when the category needs approval', async () => {
    const m0 = svc.istMonth();
    const sw = await ce.createRecurring(T, ACCOUNTS, { title: 'CRM yearly', category: 'Software & subscriptions', amount: 60000, dayOfMonth: 1, everyMonths: 12, startMonth: m0 });
    await expect(ce.payAhead(T, ACCOUNTS, String(sw._id), { periods: 1 })).rejects.toThrow('can approve');
    await expect(ce.payAhead(T, READER, String(sw._id), { periods: 1 })).rejects.toThrow('cannot record');
    expect((await ce.payAhead(T, OWNER, String(sw._id), { periods: 1, paymentRef: 'CARD-1' })).covered).toEqual([m0]);
  });
});

describe('reports', () => {
  it('summarise the month: spent, by category, by vendor, trend, and what is waiting', async () => {
    const a = await bill({ amount: 10000 });
    const b = await bill({ category: 'Rent', vendor: 'Landlord', title: 'Rent', amount: 40000 });
    await bill({ category: 'Marketing & advertising', vendor: 'Meta', title: 'Ads', amount: 5000 });
    await ce.actOn(T, APPROVER, String(a._id), 'approve');
    await ce.pay(T, ACCOUNTS, [String(a._id), String(b._id)], { paymentMode: 'Bank' });
    await ce.createRecurring(T, ACCOUNTS, { title: 'Internet', category: 'Internet & phone', amount: 1200, dayOfMonth: 1, startMonth: thisMonth() });
    const s = await ce.summary(T, READER, thisMonth());
    expect(s.spent).toBe(50000);
    expect(s.byStatus.paid).toEqual({ total: 50000, count: 2 });
    expect(s.byStatus.pending).toEqual({ total: 5000, count: 1 });
    expect(s.pendingApprovals).toBe(1);
    expect(s.recurringNotYetAdded).toBe(1);
    expect(s.byCategory.map((c) => c.category)).toEqual(['Rent', 'Software & subscriptions']);
    expect(s.topVendors[0]).toMatchObject({ vendor: 'Landlord', total: 40000 });
    expect(s.trend).toHaveLength(6); expect(s.trend[5]).toMatchObject({ month: thisMonth(), total: 50000 });
    const csv = await ce.exportCsv(T, READER, { month: thisMonth() });
    expect(csv.split('\n')).toHaveLength(4); expect(csv).toContain('Landlord');
  });

  it('search and filter the ledger', async () => {
    await bill({ vendor: 'Zoho', title: 'CRM' }); await bill({ vendor: 'Airtel', title: 'Broadband', category: 'Internet & phone' });
    expect((await ce.ledger(T, READER, { search: 'airt' })).rows).toHaveLength(1);
    expect((await ce.ledger(T, READER, { category: 'Software & subscriptions' })).rows).toHaveLength(1);
    expect((await ce.ledger(T, READER, { status: 'paid' })).rows).toHaveLength(0);
    expect((await ce.vendors(T))).toEqual(['Airtel', 'Zoho']);
  });
});
