import Employee from '../models/Employee';
import EmployeeFile from '../models/EmployeeFile';
import CompanyExpense from '../models/CompanyExpense';
import RecurringExpense from '../models/RecurringExpense';
import { EmployeeError, oid, validId, istDate, istMonth, validDay, getConfig } from './employeeService';

/**
 * The company's expense ledger: every rupee the institute spends, however it arrived: a bill
 * someone recorded, a recurring cost (rent), a month's salary, or an employee's reimbursed claim.
 *
 * Money counts as spent once a line is approved; it is paid when accounts mark it so. Salary lines
 * name a person and their pay, so they are shown line by line only to people allowed to see pay;
 * everyone else sees them in the totals.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const fullName = (e: any) => [e?.firstName, e?.lastName].filter(Boolean).join(' ');
const monthOk = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const addMonths = (m: string, n: number) => { const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };

const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
const EVERY = [1, 2, 3, 4, 6, 12];

/** The day a line should be paid by: a bill its due date, a recurring or salary line its own day. */
export const dueOnOf = (r: { dueDate?: string; kind?: string; date: string }) => r.dueDate || (r.kind === 'recurring' || r.kind === 'salary' ? r.date : undefined);

/** Unpaid lines whose day has passed (the query form of dueOnOf, so reports and the list agree). */
const overdueFilter = (today: string) => ({
  status: { $in: ['pending', 'approved'] },
  $or: [
    { dueDate: { $lt: today, $nin: [null, ''] } },
    { kind: { $in: ['recurring', 'salary'] }, dueDate: { $in: [null, ''] }, date: { $lt: today } },
    { kind: { $in: ['recurring', 'salary'] }, dueDate: { $exists: false }, date: { $lt: today } },
  ],
});

const isOverdue = (r: any, today: string) => ['pending', 'approved'].includes(r.status) && !!dueOnOf(r) && (dueOnOf(r) as string) < today;
const daysLate = (r: any, today: string) => (isOverdue(r, today)
  ? Math.round((new Date(today + 'T00:00:00Z').getTime() - new Date((dueOnOf(r) as string) + 'T00:00:00Z').getTime()) / 86_400_000)
  : 0);

export interface Viewer {
  userId: string; name: string;
  canViewAll: boolean; canManage: boolean; canApprove: boolean;
  /** May see salary lines person by person (the see-pay permission). */
  canSalary: boolean;
}

export const SALARY_CATEGORY = 'Salaries';
export const REIMBURSEMENT_CATEGORY = 'Employee reimbursements';

// ── Rules from the institute's settings ──────────────────────────────────────

async function categoryRule(tenantId: string, name: string) {
  const cfg = await getConfig(tenantId);
  const cat = (cfg.companyCategories || []).find((c: any) => c.name === name);
  return { cfg, cat, skipApproval: !!cat?.skipApproval, active: cat ? cat.active !== false : false };
}

const trailEntry = (viewer: { userId?: string; name: string }, action: string, note?: string) =>
  ({ action, by: viewer.userId ? oid(viewer.userId) : undefined, byName: viewer.name, at: new Date(), note });

async function checkInvoices(tenantId: string, v: any) {
  if (!Array.isArray(v)) return [];
  const ids = v.map((r: any) => String(r?.fileId || r)).filter(validId).slice(0, 8);
  if (!ids.length) return [];
  const files: any[] = await EmployeeFile.find({ _id: { $in: ids.map(oid) }, tenantId: oid(tenantId), kind: 'invoice' }).select('name').lean();
  if (files.length !== ids.length) throw new EmployeeError('One of the attached bills could not be found. Upload it again.');
  return files.map((f) => ({ fileId: f._id, name: f.name }));
}

interface Fields {
  date: string; month: string; dueDate?: string; category: string; title: string; vendor: string; description: string;
  amount: number; gst: number; invoiceNumber: string; invoices: any[]; paymentMode: string;
}

async function check(tenantId: string, body: any, current?: any): Promise<Fields & { skipApproval: boolean }> {
  const today = istDate();
  const date = String(body?.date ?? current?.date ?? today);
  if (!validDay(date)) throw new EmployeeError('Choose the date of the bill.');
  if (date > istDate(new Date(Date.now() + 40 * 86_400_000))) throw new EmployeeError('That date is too far in the future.');
  const dueDate = body?.dueDate === '' || body?.dueDate === null ? undefined : (body?.dueDate ?? current?.dueDate);
  if (dueDate && !validDay(dueDate)) throw new EmployeeError('Choose a valid due date.');
  const category = String(body?.category ?? current?.category ?? '').trim();
  const rule = await categoryRule(tenantId, category);
  if (!rule.cat || (!rule.active && category !== current?.category)) throw new EmployeeError('Choose a category from the list.');
  const amount = round2(Number(body?.amount ?? current?.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new EmployeeError('Enter the amount in rupees.');
  if (amount > 1_000_000_000) throw new EmployeeError('That amount looks too large. Check it.');
  const gst = round2(Number(body?.gst ?? current?.gst ?? 0)) || 0;
  if (gst < 0 || gst > amount) throw new EmployeeError('The tax amount cannot be more than the total.');
  const title = String(body?.title ?? current?.title ?? '').trim().slice(0, 160);
  const vendor = String(body?.vendor ?? current?.vendor ?? '').trim().slice(0, 120);
  if (!title && !vendor) throw new EmployeeError('Say what it was for, or who it was paid to.');
  const invoices = body?.invoices !== undefined ? await checkInvoices(tenantId, body.invoices) : (current?.invoices || []);
  const need = Number(rule.cfg.companyPolicy.invoiceRequiredAbove) || 0;
  if (need > 0 && amount > need && !invoices.length && current?.kind !== 'salary' && current?.kind !== 'reimbursement') throw new EmployeeError(`Attach the bill or invoice for anything above ₹${need}.`);
  return {
    date, month: date.slice(0, 7), dueDate, category, title, vendor, description: String(body?.description ?? current?.description ?? '').trim().slice(0, 1000),
    amount, gst, invoiceNumber: String(body?.invoiceNumber ?? current?.invoiceNumber ?? '').trim().slice(0, 60), invoices,
    paymentMode: String(body?.paymentMode ?? current?.paymentMode ?? '').trim().slice(0, 40), skipApproval: rule.skipApproval,
  };
}

/** Whether this viewer may approve this line themselves. */
async function mayApprove(tenantId: string, viewer: Viewer, line: any): Promise<boolean> {
  if (!viewer.canApprove) return false;
  if (String(line.createdBy || '') === viewer.userId) return !!(await getConfig(tenantId)).companyPolicy.allowSelfApproval;
  return true;
}

// ── Recording ────────────────────────────────────────────────────────────────

export async function createEntry(tenantId: string, viewer: Viewer, body: any) {
  if (!viewer.canManage) throw new EmployeeError('You cannot record company expenses.', 403);
  const f = await check(tenantId, body);
  const doc: any = { tenantId: oid(tenantId), kind: 'bill', ...f, createdBy: oid(viewer.userId), status: f.skipApproval ? 'approved' : 'pending', trail: [trailEntry(viewer, 'recorded')] };
  delete doc.skipApproval;
  if (f.skipApproval) doc.trail.push(trailEntry({ name: 'Policy' }, 'approved', `${f.category} needs no approval`));
  if (body?.recordAsPaid) {
    // Recorded after the money already went out: approve and pay in one go, if this person may.
    if (doc.status === 'pending') {
      if (!(await mayApprove(tenantId, viewer, doc))) throw new EmployeeError('Only someone who can approve may record a bill as already paid.', 403);
      doc.status = 'approved'; doc.trail.push(trailEntry(viewer, 'approved'));
    }
    const paidOn = String(body.paidOn || doc.date);
    if (!validDay(paidOn)) throw new EmployeeError('Choose the date it was paid.');
    doc.status = 'paid'; doc.paidOn = paidOn; doc.paymentRef = String(body.paymentRef || '').trim().slice(0, 80);
    doc.trail.push(trailEntry(viewer, 'paid', [doc.paymentMode, doc.paymentRef].filter(Boolean).join(' · ')));
  }
  const created: any = await CompanyExpense.create(doc);
  return created.toObject();
}

export async function updateEntry(tenantId: string, viewer: Viewer, id: string, body: any) {
  if (!viewer.canManage) throw new EmployeeError('You cannot change company expenses.', 403);
  const e: any = await CompanyExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Expense not found', 404);
  if (e.kind === 'reimbursement') throw new EmployeeError('A reimbursement comes from the employee claim and cannot be edited here.', 409);
  if (['paid', 'cancelled'].includes(e.status)) throw new EmployeeError(e.status === 'paid' ? 'This is already paid. Undo the payment first to change it.' : 'This was cancelled.', 409);
  const f = await check(tenantId, body, e.toObject());
  const wasApproved = e.status === 'approved';
  const changedMoney = f.amount !== e.amount || f.category !== e.category;
  const { skipApproval, ...fields } = f;
  e.set(fields);
  // Changing what was approved sends it back for approval, unless this category needs none.
  if (wasApproved && changedMoney && !skipApproval) e.status = 'pending';
  if (e.status === 'rejected') e.status = skipApproval ? 'approved' : 'pending';
  e.trail.push(trailEntry(viewer, 'edited'));
  await e.save();
  return e.toObject();
}

export async function cancelEntry(tenantId: string, viewer: Viewer, id: string, note?: string) {
  if (!viewer.canManage) throw new EmployeeError('You cannot cancel company expenses.', 403);
  const e: any = await CompanyExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Expense not found', 404);
  if (e.kind === 'reimbursement') throw new EmployeeError('Undo the payment of the employee claim instead.', 409);
  if (e.status === 'paid') throw new EmployeeError('This is already paid. Undo the payment first.', 409);
  e.status = 'cancelled'; e.trail.push(trailEntry(viewer, 'cancelled', String(note || '').slice(0, 300)));
  await e.save();
}

export async function actOn(tenantId: string, viewer: Viewer, id: string, action: string, note?: string) {
  if (!['approve', 'reject'].includes(action)) throw new EmployeeError('Choose approve or reject.');
  const e: any = await CompanyExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Expense not found', 404);
  if (e.status !== 'pending') throw new EmployeeError('Only an expense waiting for approval can be approved or rejected.', 409);
  if (!(await mayApprove(tenantId, viewer, e))) throw new EmployeeError(viewer.canApprove ? 'You recorded this one, and this institute does not let you approve your own entries.' : 'You cannot approve expenses.', 403);
  const text = String(note || '').trim().slice(0, 500);
  if (action === 'reject') {
    if (!text) throw new EmployeeError('Say why you are rejecting it.');
    e.status = 'rejected'; e.trail.push(trailEntry(viewer, 'rejected', text));
  } else { e.status = 'approved'; e.trail.push(trailEntry(viewer, 'approved', text)); }
  await e.save();
  return e.toObject();
}

export async function pay(tenantId: string, viewer: Viewer, ids: string[], input: { paymentMode?: string; paymentRef?: string; paidOn?: string }) {
  if (!viewer.canManage) throw new EmployeeError('You cannot mark expenses paid.', 403);
  const list = (ids || []).filter(validId).slice(0, 300).map(oid);
  if (!list.length) throw new EmployeeError('Choose the expenses that were paid.');
  const paidOn = input?.paidOn ? String(input.paidOn) : istDate();
  if (!validDay(paidOn)) throw new EmployeeError('Choose the date it was paid.');
  const mode = String(input?.paymentMode || '').trim().slice(0, 40);
  const ref = String(input?.paymentRef || '').trim().slice(0, 80);
  const r = await CompanyExpense.updateMany(
    { _id: { $in: list }, tenantId: oid(tenantId), status: 'approved', kind: { $ne: 'reimbursement' } },
    { $set: { status: 'paid', paidOn, ...(mode ? { paymentMode: mode } : {}), paymentRef: ref }, $push: { trail: trailEntry(viewer, 'paid', [mode, ref].filter(Boolean).join(' · ')) } },
  );
  return { paid: r.modifiedCount };
}

export async function unpay(tenantId: string, viewer: Viewer, id: string) {
  if (!viewer.canManage) throw new EmployeeError('You cannot change a paid expense.', 403);
  const r = await CompanyExpense.updateOne({ _id: oid(id), tenantId: oid(tenantId), status: 'paid', kind: { $ne: 'reimbursement' } }, { $set: { status: 'approved', paidOn: '' }, $push: { trail: trailEntry(viewer, 'unpaid') } });
  if (!r.matchedCount) throw new EmployeeError('That expense is not marked paid, or it is a reimbursement (undo the employee claim instead).', 404);
}

// ── Reading ──────────────────────────────────────────────────────────────────

export interface LedgerQuery { overdue?: string | boolean; month?: string; from?: string; to?: string; category?: string; kind?: string; status?: string; search?: string; employeeId?: string }

/** Salary lines name a person's pay: only people allowed to see pay get them line by line. */
const visibleFilter = (viewer: Viewer) => (viewer.canSalary ? {} : { kind: { $ne: 'salary' } });

export async function ledger(tenantId: string, viewer: Viewer, q: LedgerQuery) {
  const filter: any = { tenantId: oid(tenantId), ...visibleFilter(viewer) };
  if (monthOk(q.month)) filter.month = q.month;
  if (q.from && validDay(q.from)) filter.date = { ...(filter.date || {}), $gte: q.from };
  if (q.to && validDay(q.to)) filter.date = { ...(filter.date || {}), $lte: q.to };
  if (q.category) filter.category = q.category;
  if (q.kind && ['bill', 'recurring', 'salary', 'reimbursement'].includes(q.kind)) { if (q.kind === 'salary' && !viewer.canSalary) return { rows: [], totals: emptyTotals(), hiddenSalaryLines: true }; filter.kind = q.kind; }
  if (q.status) filter.status = q.status;
  if (q.employeeId && validId(q.employeeId)) filter.employeeId = oid(q.employeeId);
  const today = istDate();
  if (q.overdue === true || q.overdue === 'true') filter.$and = [overdueFilter(today)];
  const search = String(q.search || '').trim();
  if (search) { const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filter.$or = [{ title: re }, { vendor: re }, { description: re }, { invoiceNumber: re }, { category: re }]; }
  const rows: any[] = await CompanyExpense.find(filter).sort({ date: -1, createdAt: -1 }).limit(1000).lean();
  const empIds = [...new Set(rows.map((r) => String(r.employeeId || '')).filter(Boolean))];
  const emps: any[] = empIds.length ? await Employee.find({ _id: { $in: empIds.map(oid) } }).select('firstName lastName employeeCode').lean() : [];
  const byEmp = new Map(emps.map((e) => [String(e._id), e]));
  const out = rows.map((r) => {
    const e = r.employeeId ? byEmp.get(String(r.employeeId)) : null;
    return { ...r, _id: String(r._id), employeeId: r.employeeId ? String(r.employeeId) : undefined, employeeName: e ? fullName(e) : undefined, employeeCode: e?.employeeCode,
      dueOn: dueOnOf(r), overdue: isOverdue(r, today), daysOverdue: daysLate(r, today),
      canApprove: r.status === 'pending' && viewer.canApprove, canPay: r.status === 'approved' && viewer.canManage && r.kind !== 'reimbursement', canEdit: viewer.canManage && ['pending', 'approved', 'rejected'].includes(r.status) && r.kind !== 'reimbursement' };
  });
  const totals = emptyTotals();
  for (const r of out) { if (r.status in totals) (totals as any)[r.status] = round2((totals as any)[r.status] + r.amount); }
  return { rows: out, totals, hiddenSalaryLines: !viewer.canSalary };
}

const emptyTotals = () => ({ pending: 0, approved: 0, paid: 0, rejected: 0, cancelled: 0 });

export async function detail(tenantId: string, viewer: Viewer, id: string) {
  if (!validId(id)) throw new EmployeeError('Expense not found', 404);
  const e: any = await CompanyExpense.findOne({ _id: oid(id), tenantId: oid(tenantId), ...visibleFilter(viewer) }).lean();
  if (!e) throw new EmployeeError('Expense not found', 404);
  const emp: any = e.employeeId ? await Employee.findById(e.employeeId).select('firstName lastName employeeCode').lean() : null;
  return { ...e, _id: String(e._id), employeeName: emp ? fullName(emp) : undefined, employeeCode: emp?.employeeCode };
}

export async function vendors(tenantId: string): Promise<string[]> {
  const v: string[] = await CompanyExpense.distinct('vendor', { tenantId: oid(tenantId), vendor: { $nin: [null, ''] } });
  return v.sort((a, b) => a.localeCompare(b)).slice(0, 500);
}

/** The month at a glance: what was spent, on what, to whom, how it trends, and what is waiting. */
export async function summary(tenantId: string, viewer: Viewer, month?: string) {
  const m = monthOk(month) ? month : istMonth();
  const tid = oid(tenantId);
  // Totals count every line, salaries included: the amounts are company money. Line-by-line detail is what is restricted.
  const spent = { $in: ['approved', 'paid'] };
  const [byStatus, byCategory, byKind, vendorsTop, trend, pendingCount] = await Promise.all([
    CompanyExpense.aggregate([{ $match: { tenantId: tid, month: m, status: { $in: ['pending', 'approved', 'paid'] } } }, { $group: { _id: '$status', total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    CompanyExpense.aggregate([{ $match: { tenantId: tid, month: m, status: spent } }, { $group: { _id: '$category', total: { $sum: '$amount' }, n: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    CompanyExpense.aggregate([{ $match: { tenantId: tid, month: m, status: spent } }, { $group: { _id: '$kind', total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    CompanyExpense.aggregate([{ $match: { tenantId: tid, month: m, status: spent, vendor: { $nin: [null, ''] }, kind: { $ne: 'salary' } } }, { $group: { _id: '$vendor', total: { $sum: '$amount' }, n: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
    CompanyExpense.aggregate([{ $match: { tenantId: tid, month: { $gte: addMonths(m, -5), $lte: m }, status: spent } }, { $group: { _id: '$month', total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
    CompanyExpense.countDocuments({ tenantId: tid, status: 'pending' }),
  ]);
  const dueRecurring = await recurringDue(tenantId);
  const todayStr = istDate();
  const soon = istDate(new Date(Date.now() + 7 * 86_400_000));
  const [overdueAgg, soonAgg] = await Promise.all([
    CompanyExpense.aggregate([{ $match: { tenantId: tid, ...overdueFilter(todayStr) } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    CompanyExpense.aggregate([{ $match: { tenantId: tid, status: { $in: ['pending', 'approved'] }, dueDate: { $gte: todayStr, $lte: soon } } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
  ]);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
  const trendMap = new Map(trend.map((t: any) => [t._id, round2(t.total)]));
  return {
    month: m, label: monthLabel(m), pendingApprovals: pendingCount, recurringNotYetAdded: dueRecurring.length,
    overdue: { count: overdueAgg[0]?.n || 0, total: round2(overdueAgg[0]?.total || 0) },
    dueSoon: { count: soonAgg[0]?.n || 0, total: round2(soonAgg[0]?.total || 0) },
    byStatus: Object.fromEntries(byStatus.map((x: any) => [x._id, { total: round2(x.total), count: x.n }])),
    spent: round2(byCategory.reduce((s: number, x: any) => s + x.total, 0)),
    byCategory: byCategory.map((x: any) => ({ category: x._id, total: round2(x.total), count: x.n })),
    byKind: byKind.map((x: any) => ({ kind: x._id, total: round2(x.total), count: x.n })),
    topVendors: vendorsTop.map((x: any) => ({ vendor: x._id, total: round2(x.total), count: x.n })),
    trend: months.map((mm) => ({ month: mm, label: monthLabel(mm), total: trendMap.get(mm) || 0 })),
    salaryLinesHidden: !viewer.canSalary,
  };
}

// ── Recurring ────────────────────────────────────────────────────────────────

export async function listRecurring(tenantId: string) {
  const rows: any[] = await RecurringExpense.find({ tenantId: oid(tenantId) }).sort({ active: -1, title: 1 }).lean();
  return rows.map((r) => ({ ...r, _id: String(r._id) }));
}

async function checkRecurring(tenantId: string, body: any, current?: any) {
  const title = String(body?.title ?? current?.title ?? '').trim().slice(0, 160);
  if (!title) throw new EmployeeError('Name this recurring expense, for example "Office rent".');
  const category = String(body?.category ?? current?.category ?? '').trim();
  const rule = await categoryRule(tenantId, category);
  if (!rule.cat) throw new EmployeeError('Choose a category from the list.');
  const amount = round2(Number(body?.amount ?? current?.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new EmployeeError('Enter the monthly amount in rupees.');
  const dayOfMonth = Math.round(Number(body?.dayOfMonth ?? current?.dayOfMonth ?? 1));
  if (!(dayOfMonth >= 1 && dayOfMonth <= 28)) throw new EmployeeError('Choose a day from 1 to 28.');
  const everyMonths = Math.round(Number(body?.everyMonths ?? current?.everyMonths ?? 1));
  if (!EVERY.includes(everyMonths)) throw new EmployeeError('Choose how often it is paid: every 1, 2, 3, 4, 6 or 12 months.');
  const startMonth = String(body?.startMonth ?? current?.startMonth ?? istMonth());
  if (!monthOk(startMonth)) throw new EmployeeError('Choose the month it starts.');
  const endMonth = body?.endMonth === '' || body?.endMonth === null ? undefined : (body?.endMonth ?? current?.endMonth);
  if (endMonth && (!monthOk(endMonth) || endMonth < startMonth)) throw new EmployeeError('The end month must be the start month or later.');
  return { title, category, vendor: String(body?.vendor ?? current?.vendor ?? '').trim().slice(0, 120), amount, gst: round2(Number(body?.gst ?? current?.gst ?? 0)) || 0, dayOfMonth, everyMonths, startMonth, endMonth,
    paymentMode: String(body?.paymentMode ?? current?.paymentMode ?? '').trim().slice(0, 40), notes: String(body?.notes ?? current?.notes ?? '').trim().slice(0, 500), active: body?.active ?? current?.active ?? true };
}

export async function createRecurring(tenantId: string, viewer: Viewer, body: any) {
  if (!viewer.canManage) throw new EmployeeError('You cannot set up recurring expenses.', 403);
  const f = await checkRecurring(tenantId, body);
  const r: any = await RecurringExpense.create({ tenantId: oid(tenantId), ...f, createdBy: oid(viewer.userId) });
  return r.toObject();
}

export async function updateRecurring(tenantId: string, viewer: Viewer, id: string, body: any) {
  if (!viewer.canManage) throw new EmployeeError('You cannot change recurring expenses.', 403);
  const r: any = await RecurringExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!r) throw new EmployeeError('Recurring expense not found', 404);
  r.set(await checkRecurring(tenantId, body, r.toObject()));
  await r.save();
  return r.toObject();
}

export async function deleteRecurring(tenantId: string, viewer: Viewer, id: string) {
  if (!viewer.canManage) throw new EmployeeError('You cannot change recurring expenses.', 403);
  // Lines already made stay in the ledger; only the template goes.
  const r = await RecurringExpense.deleteOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!r.deletedCount) throw new EmployeeError('Recurring expense not found', 404);
}

/** The active templates that apply to a month and have no ledger line for it yet. */
async function recurringDue(tenantId: string, month = istMonth(), today = istDate()) {
  const templates: any[] = await RecurringExpense.find({ tenantId: oid(tenantId), active: true, startMonth: { $lte: month }, $or: [{ endMonth: { $exists: false } }, { endMonth: null }, { endMonth: '' }, { endMonth: { $gte: month } }] }).lean();
  if (!templates.length) return [];
  const made: any[] = await CompanyExpense.find({ tenantId: oid(tenantId), month, recurringId: { $in: templates.map((t) => t._id) } }).select('recurringId').lean();
  const have = new Set(made.map((m) => String(m.recurringId)));
  const day = Number(today.slice(8, 10));
  return templates.filter((t) => !have.has(String(t._id)) && (monthIndex(month) - monthIndex(t.startMonth)) % (t.everyMonths || 1) === 0 && (month < today.slice(0, 7) || t.dayOfMonth <= day));
}

/** Add this month's line for every recurring cost that has fallen due and has none yet. Safe to run any number of times. */
export async function generateRecurring(tenantId: string, viewer: { userId?: string; name: string }, month?: string, today = istDate()) {
  const m = monthOk(month) ? month : today.slice(0, 7);
  const due = await recurringDue(tenantId, m, today);
  let added = 0;
  for (const t of due) {
    const rule = await categoryRule(tenantId, t.category);
    const date = `${m}-${String(t.dayOfMonth).padStart(2, '0')}`;
    try {
      await CompanyExpense.create({
        tenantId: oid(tenantId), kind: 'recurring', date, month: m, category: t.category, title: t.title, vendor: t.vendor, amount: t.amount, gst: t.gst || 0,
        paymentMode: t.paymentMode, description: t.notes, recurringId: t._id, createdBy: viewer.userId ? oid(viewer.userId) : undefined,
        status: rule.skipApproval ? 'approved' : 'pending',
        trail: [trailEntry({ name: viewer.name }, 'recorded', `Recurring: ${t.title}`), ...(rule.skipApproval ? [trailEntry({ name: 'Policy' }, 'approved', `${t.category} needs no approval`)] : [])],
      });
      added++;
    } catch (e: any) { if (e?.code !== 11000) throw e; /* already there: another run got in first */ }
  }
  return { month: m, added };
}

/** The scheduled job: every institute with recurring costs. */
export async function generateRecurringForAll(): Promise<number> {
  const tenants: any[] = await RecurringExpense.distinct('tenantId', { active: true });
  let n = 0;
  for (const t of tenants) n += (await generateRecurring(String(t), { name: 'Recurring schedule' })).added;
  return n;
}

/**
 * Pay several periods of a recurring cost in one go (rent paid for four months at once): the
 * lines for the coming periods are added and marked paid together under one payment. A line that
 * already exists and is unpaid is paid; one already paid is skipped, so nothing is paid twice.
 */
export async function payAhead(tenantId: string, viewer: Viewer, id: string, input: { periods?: number; paymentMode?: string; paymentRef?: string; paidOn?: string }) {
  if (!viewer.canManage) throw new EmployeeError('You cannot record payments.', 403);
  const t: any = await RecurringExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) }).lean();
  if (!t) throw new EmployeeError('Recurring expense not found', 404);
  const periods = Math.round(Number(input?.periods));
  if (!(periods >= 1 && periods <= 12)) throw new EmployeeError('Choose how many payments to cover, from 1 to 12.');
  const paidOn = input?.paidOn ? String(input.paidOn) : istDate();
  if (!validDay(paidOn)) throw new EmployeeError('Choose the date it was paid.');
  const mode = String(input?.paymentMode || t.paymentMode || '').trim().slice(0, 40);
  const ref = String(input?.paymentRef || '').trim().slice(0, 80);
  const rule = await categoryRule(tenantId, t.category);
  const every = t.everyMonths || 1;
  const covered: string[] = [];
  const note = `Paid ahead with ${periods} payment${periods > 1 ? 's' : ''} of ${t.title}`;
  let m = t.startMonth > istMonth() ? t.startMonth : istMonth();
  // Begin at the first month this cost falls due, then step by its billing interval.
  while ((monthIndex(m) - monthIndex(t.startMonth)) % every !== 0) m = addMonths(m, 1);
  for (let guard = 0; covered.length < periods && guard < 60; guard++, m = addMonths(m, every)) {
    if (t.endMonth && m > t.endMonth) break;
    const existing: any = await CompanyExpense.findOne({ tenantId: oid(tenantId), recurringId: t._id, month: m });
    if (existing && ['paid', 'cancelled'].includes(existing.status)) continue;
    const line = existing || new CompanyExpense({
      tenantId: oid(tenantId), kind: 'recurring', date: `${m}-${String(t.dayOfMonth).padStart(2, '0')}`, month: m, category: t.category, title: t.title, vendor: t.vendor,
      amount: t.amount, gst: t.gst || 0, description: t.notes, recurringId: t._id, createdBy: oid(viewer.userId), status: rule.skipApproval ? 'approved' : 'pending',
      trail: [trailEntry(viewer, 'recorded', `Recurring: ${t.title}`)],
    });
    if (line.status === 'pending') {
      if (!(await mayApprove(tenantId, viewer, line))) throw new EmployeeError('Paying ahead needs someone who can approve this category. Ask an approver, or pay after it is approved.', 403);
      line.status = 'approved'; line.trail.push(trailEntry(viewer, 'approved'));
    }
    line.status = 'paid'; line.paidOn = paidOn; line.paymentMode = mode; line.paymentRef = ref;
    line.trail.push(trailEntry(viewer, 'paid', [mode, ref, note].filter(Boolean).join(' · ')));
    await line.save();
    covered.push(m);
  }
  return { covered, labels: covered.map(monthLabel) };
}

// ── Salaries ─────────────────────────────────────────────────────────────────

/** A month's pay for one person from the pay on their profile: annual pay is twelfths, monthly pay is as is. */
export const monthlyPay = (e: any) => round2(e.payFrequency === 'monthly' ? Number(e.currentCtc) : Number(e.currentCtc) / 12);

export async function salaryPreview(tenantId: string, viewer: Viewer, month?: string) {
  if (!viewer.canSalary || !viewer.canManage) throw new EmployeeError('Salaries need both the manage-expenses and the see-pay permissions.', 403);
  const m = monthOk(month) ? month : istMonth();
  const endOfMonth = `${m}-31`;
  const people: any[] = await Employee.find({ tenantId: oid(tenantId), status: { $ne: 'exited' }, currentCtc: { $gt: 0 } }).select('firstName lastName employeeCode department designation currentCtc payFrequency joiningDate').sort({ firstName: 1 }).lean();
  const existing: any[] = await CompanyExpense.find({ tenantId: oid(tenantId), kind: 'salary', month: m }).select('employeeId amount status').lean();
  const by = new Map(existing.map((x) => [String(x.employeeId), x]));
  const rows = people.filter((p) => !p.joiningDate || istDate(new Date(p.joiningDate)) <= endOfMonth).map((p) => {
    const ex = by.get(String(p._id));
    return { employeeId: String(p._id), name: fullName(p), code: p.employeeCode, department: p.department, designation: p.designation, amount: monthlyPay(p), alreadyAdded: !!ex, existingStatus: ex?.status };
  });
  return { month: m, label: monthLabel(m), rows, toAdd: rows.filter((r) => !r.alreadyAdded).length, total: round2(rows.filter((r) => !r.alreadyAdded).reduce((s, r) => s + r.amount, 0)) };
}

/** Add the month's salary line for each chosen person (everyone not yet added when none are named). Amounts can be adjusted afterwards. */
export async function generateSalaries(tenantId: string, viewer: Viewer, input: { month?: string; employeeIds?: string[]; amounts?: Record<string, number> }) {
  const preview = await salaryPreview(tenantId, viewer, input?.month);
  const chosen = Array.isArray(input?.employeeIds) && input.employeeIds.length ? new Set(input.employeeIds.map(String)) : null;
  const rule = await categoryRule(tenantId, SALARY_CATEGORY);
  if (!rule.cat) throw new EmployeeError('Add a "Salaries" category in the expense settings first.');
  const date = `${preview.month}-01`;
  const lastDay = new Date(Date.UTC(Number(preview.month.slice(0, 4)), Number(preview.month.slice(5, 7)), 0)).getUTCDate();
  let added = 0;
  for (const r of preview.rows) {
    if (r.alreadyAdded || (chosen && !chosen.has(r.employeeId))) continue;
    const override = Number(input?.amounts?.[r.employeeId]);
    const amount = Number.isFinite(override) && override > 0 ? round2(override) : r.amount;
    try {
      await CompanyExpense.create({
        tenantId: oid(tenantId), kind: 'salary', date: `${preview.month}-${String(Math.min(lastDay, 28)).padStart(2, '0')}`, month: preview.month, category: SALARY_CATEGORY,
        title: `Salary ${monthLabel(preview.month)}`, employeeId: oid(r.employeeId), amount, createdBy: oid(viewer.userId),
        status: rule.skipApproval ? 'approved' : 'pending',
        trail: [trailEntry(viewer, 'recorded', 'Monthly salary'), ...(rule.skipApproval ? [trailEntry({ name: 'Policy' }, 'approved', 'Salaries need no approval')] : [])],
      });
      added++;
    } catch (e: any) { if (e?.code !== 11000) throw e; }
  }
  void date;
  return { month: preview.month, added };
}

// ── Employee reimbursements ──────────────────────────────────────────────────

/** An employee's claim has been paid: it is company money out, so it joins the ledger. */
export async function recordReimbursement(tenantId: string, claim: any, payer: { userId: string; name: string }) {
  const emp: any = await Employee.findById(claim.employeeId).select('firstName lastName').lean();
  const paidOn = claim.paidAt ? istDate(new Date(claim.paidAt)) : istDate();
  try {
    await CompanyExpense.updateOne(
      { tenantId: oid(tenantId), sourceExpenseId: claim._id },
      { $setOnInsert: {
        tenantId: oid(tenantId), kind: 'reimbursement', date: claim.date, month: claim.date.slice(0, 7), category: REIMBURSEMENT_CATEGORY,
        title: `${claim.category}${claim.merchant ? ` · ${claim.merchant}` : ''}`, vendor: fullName(emp), description: claim.description || '', amount: claim.amount,
        employeeId: claim.employeeId, sourceExpenseId: claim._id, status: 'paid', paidOn, paymentMode: claim.paymentMode, paymentRef: claim.paymentRef,
        invoices: (claim.receipts || []).map((r: any) => ({ fileId: r.fileId, name: r.name })), createdBy: oid(payer.userId),
        trail: [trailEntry(payer, 'paid', 'Employee claim reimbursed')],
      } },
      { upsert: true },
    );
  } catch (e: any) { if (e?.code !== 11000) console.error('[company-expenses] reimbursement', e?.message); }
}

/** The claim's payment was undone: the ledger line goes with it. */
export async function removeReimbursement(tenantId: string, claimId: any) {
  await CompanyExpense.deleteOne({ tenantId: oid(tenantId), sourceExpenseId: claimId, kind: 'reimbursement' });
}

// ── Export ───────────────────────────────────────────────────────────────────

const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function exportCsv(tenantId: string, viewer: Viewer, q: LedgerQuery) {
  const { rows } = await ledger(tenantId, viewer, q);
  const head = ['Date', 'Month', 'Type', 'Category', 'What for', 'Paid to / vendor', 'Invoice no.', 'Amount (INR)', 'of which tax', 'Status', 'Paid on', 'Payment mode', 'Payment reference', 'Employee', 'Notes'];
  const lines = [head.join(',')];
  for (const r of rows) lines.push([r.date, r.month, r.kind, r.category, r.title, r.vendor, r.invoiceNumber, Number(r.amount).toFixed(2), Number(r.gst || 0).toFixed(2), r.status, r.paidOn, r.paymentMode, r.paymentRef, r.employeeName, r.description].map(csvCell).join(','));
  return lines.join('\n');
}
