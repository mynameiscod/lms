import Employee from '../models/Employee';
import EmployeeExpense from '../models/EmployeeExpense';
import EmployeeFile from '../models/EmployeeFile';
import { EmployeeError, oid, validId, istDate, istMonth, validDay, getConfig } from './employeeService';
import { recordReimbursement, removeReimbursement } from './companyExpenseService';

/**
 * Employee expenses. An employee claims money they spent (one a day, or several), with receipts.
 * Someone approves it (their reporting manager, someone with the approve permission, or both in
 * turn: the institute chooses), and accounts mark it paid. Amounts are rupees.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayDiff = (a: string, b: string) => Math.round((new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86_400_000);
const fullName = (e: any) => [e?.firstName, e?.lastName].filter(Boolean).join(' ');

export interface Viewer {
  userId: string; name: string;
  /** The viewer's own employee record, if they have one. */
  employeeId?: string;
  canApprove: boolean; canViewAll: boolean; canManage: boolean;
}

async function directReportIds(tenantId: string, managerEmployeeId?: string): Promise<string[]> {
  if (!managerEmployeeId) return [];
  const rows: any[] = await Employee.find({ tenantId: oid(tenantId), reportingManagerId: oid(managerEmployeeId) }).select('_id').lean();
  return rows.map((r) => String(r._id));
}

// ── Claiming ─────────────────────────────────────────────────────────────────

async function checkReceipts(tenantId: string, employeeId: string, receipts: any) {
  if (!Array.isArray(receipts)) return [];
  const ids = receipts.map((r: any) => String(r?.fileId || r)).filter(validId).slice(0, 6);
  if (!ids.length) return [];
  const files: any[] = await EmployeeFile.find({ _id: { $in: ids.map(oid) }, tenantId: oid(tenantId), employeeId: oid(employeeId), kind: 'receipt' }).select('name').lean();
  if (files.length !== ids.length) throw new EmployeeError('One of the receipts could not be found. Upload it again.');
  return files.map((f) => ({ fileId: f._id, name: f.name }));
}

async function spentOn(tenantId: string, employeeId: string, field: 'date' | 'month', value: string, excludeId?: string) {
  const rows: any[] = await EmployeeExpense.aggregate([
    { $match: { tenantId: oid(tenantId), employeeId: oid(employeeId), [field]: value, status: { $in: ['submitted', 'approved', 'paid'] }, ...(excludeId ? { _id: { $ne: oid(excludeId) } } : {}) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return rows[0]?.total || 0;
}

interface Checked { date: string; month: string; category: string; amount: number; merchant: string; description: string; workMode: string; receipts: any[]; flags: string[] }

async function check(tenantId: string, employee: any, body: any, excludeId?: string): Promise<Checked> {
  const cfg = await getConfig(tenantId);
  const policy = cfg.expensePolicy;
  const today = istDate();
  const date = String(body?.date || today);
  if (!validDay(date)) throw new EmployeeError('Choose the date you spent it.');
  if (date > today) throw new EmployeeError('An expense cannot be dated in the future.');
  if (dayDiff(today, date) > Number(policy.maxBackdateDays)) throw new EmployeeError(`Expenses can be claimed up to ${policy.maxBackdateDays} days after they were spent.`);
  const category = String(body?.category || '').trim();
  const cat = (cfg.expenseCategories || []).find((c: any) => c.active !== false && c.name === category);
  if (!cat) throw new EmployeeError('Choose an expense category from the list.');
  const amount = round2(Number(body?.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new EmployeeError('Enter the amount in rupees.');
  if (amount > 10_000_000) throw new EmployeeError('That amount looks too large. Check it.');
  const receipts = await checkReceipts(tenantId, String(employee._id), body?.receipts);
  const need = Number(cat.receiptRequiredAbove) > 0 ? Number(cat.receiptRequiredAbove) : Number(policy.receiptRequiredAbove);
  if (need > 0 && amount > need && !receipts.length) throw new EmployeeError(`Attach a receipt for any ${cat.name} claim above ₹${need}.`);
  const flags: string[] = [];
  const dailyLimit = Number(cat.dailyLimit) > 0 ? Number(cat.dailyLimit) : Number(policy.dailyLimit);
  if (dailyLimit > 0 && (await spentOn(tenantId, String(employee._id), 'date', date, excludeId)) + amount > dailyLimit) flags.push('over_daily_limit');
  const month = date.slice(0, 7);
  if (Number(policy.monthlyLimit) > 0 && (await spentOn(tenantId, String(employee._id), 'month', month, excludeId)) + amount > Number(policy.monthlyLimit)) flags.push('over_monthly_limit');
  if (dayDiff(today, date) > 7) flags.push('backdated');
  if (need > 0 && amount > need && !receipts.length) flags.push('no_receipt');
  const workMode = ['office', 'remote', 'field'].includes(body?.workMode) ? body.workMode : '';
  return { date, month, category, amount, merchant: String(body?.merchant || '').trim().slice(0, 120), description: String(body?.description || '').trim().slice(0, 1000), workMode, receipts, flags };
}

/** Who must act first on a fresh claim. */
async function firstStage(tenantId: string, employee: any): Promise<'manager' | 'approver'> {
  const cfg = await getConfig(tenantId);
  const mode = cfg.expensePolicy.approvalMode;
  if (mode === 'approvers') return 'approver';
  if (!employee.reportingManagerId) return 'approver';
  return 'manager';
}

export async function createExpense(tenantId: string, actor: { userId: string; name: string }, employee: any, body: any) {
  const c = await check(tenantId, employee, body);
  const cfg = await getConfig(tenantId);
  const auto = Number(cfg.expensePolicy.autoApproveBelow) > 0 && c.amount <= Number(cfg.expensePolicy.autoApproveBelow) && !c.flags.some((f) => f !== 'backdated');
  const stage = await firstStage(tenantId, employee);
  const doc: any = {
    tenantId: oid(tenantId), employeeId: employee._id, ...c,
    status: auto ? 'approved' : 'submitted', stage: auto ? 'done' : stage,
    trail: [{ action: 'submitted', by: oid(actor.userId), byName: actor.name, at: new Date() }],
  };
  if (auto) { doc.approvedAt = new Date(); doc.trail.push({ action: 'auto_approved', byName: 'Policy', at: new Date(), note: `Within the ₹${cfg.expensePolicy.autoApproveBelow} auto-approval limit` }); }
  const created: any = await EmployeeExpense.create(doc);
  return created.toObject();
}

/** An employee may change a claim nobody has acted on yet, or one that was rejected (which sends it back for approval). */
export async function updateExpense(tenantId: string, actor: { userId: string; name: string }, employee: any, id: string, body: any) {
  const e: any = await EmployeeExpense.findOne({ _id: oid(id), tenantId: oid(tenantId), employeeId: employee._id });
  if (!e) throw new EmployeeError('Expense not found', 404);
  const untouched = e.status === 'submitted' && !(e.trail || []).some((t: any) => !['submitted', 'edited'].includes(t.action));
  if (!untouched && e.status !== 'rejected') throw new EmployeeError('This claim has already been acted on and cannot be edited.', 409);
  const c = await check(tenantId, employee, { ...e.toObject(), ...body, receipts: body.receipts !== undefined ? body.receipts : e.receipts }, id);
  e.set({ ...c, flags: c.flags });
  if (e.status === 'rejected') { e.status = 'submitted'; e.stage = await firstStage(tenantId, employee); e.rejectionReason = ''; e.trail.push({ action: 'resubmitted', by: oid(actor.userId), byName: actor.name, at: new Date() }); }
  else e.trail.push({ action: 'edited', by: oid(actor.userId), byName: actor.name, at: new Date() });
  await e.save();
  return e.toObject();
}

export async function cancelExpense(tenantId: string, actor: { userId: string; name: string }, employee: any, id: string) {
  const e: any = await EmployeeExpense.findOne({ _id: oid(id), tenantId: oid(tenantId), employeeId: employee._id });
  if (!e) throw new EmployeeError('Expense not found', 404);
  if (!['submitted', 'rejected'].includes(e.status)) throw new EmployeeError('Only a claim that is waiting or was rejected can be cancelled.', 409);
  e.status = 'cancelled'; e.stage = 'done'; e.trail.push({ action: 'cancelled', by: oid(actor.userId), byName: actor.name, at: new Date() });
  await e.save();
}

export async function listMine(tenantId: string, employeeId: string, q: { month?: string; status?: string }) {
  const filter: any = { tenantId: oid(tenantId), employeeId: oid(employeeId) };
  if (q.month && /^\d{4}-\d{2}$/.test(q.month)) filter.month = q.month;
  if (q.status) filter.status = q.status;
  const rows: any[] = await EmployeeExpense.find(filter).sort({ date: -1, createdAt: -1 }).limit(300).lean();
  const sum = (st: string[]) => round2(rows.filter((r) => st.includes(r.status)).reduce((s, r) => s + r.amount, 0));
  return { rows: rows.map((r) => ({ ...r, _id: String(r._id) })), totals: { pending: sum(['submitted']), approved: sum(['approved']), paid: sum(['paid']), rejected: sum(['rejected']) } };
}

// ── Approving and paying ─────────────────────────────────────────────────────

export interface QueueQuery { tab?: 'mine' | 'all'; status?: string; employeeId?: string; month?: string; category?: string; department?: string; from?: string; to?: string; stage?: string }

/** Whether this viewer can approve this claim right now (and why not, if they cannot). */
async function approveRights(tenantId: string, viewer: Viewer, exp: any, ownerUserId?: string | null, ownerManagerId?: string | null) {
  if (exp.status !== 'submitted') return false;
  if (ownerUserId && ownerUserId === viewer.userId) return false; // never your own claim
  if (viewer.employeeId && String(exp.employeeId) === viewer.employeeId) return false;
  if (viewer.canApprove) return true;
  return exp.stage === 'manager' && !!viewer.employeeId && !!ownerManagerId && ownerManagerId === viewer.employeeId;
}

export async function queue(tenantId: string, viewer: Viewer, q: QueueQuery) {
  const reports = viewer.canViewAll ? null : await directReportIds(tenantId, viewer.employeeId);
  const filter: any = { tenantId: oid(tenantId) };
  // Whose claims may appear: everyone, or only the viewer's reports; then narrowed by the chosen employee and department.
  let allowed: string[] | null = reports;
  const narrow = (ids: string[]) => { allowed = allowed ? allowed.filter((i) => ids.includes(i)) : ids; };
  if (q.employeeId && validId(q.employeeId)) narrow([q.employeeId]);
  if (q.department) {
    const ids: any[] = await Employee.find({ tenantId: oid(tenantId), department: q.department }).select('_id').lean();
    narrow(ids.map((i) => String(i._id)));
  }
  if (allowed) filter.employeeId = { $in: (allowed as string[]).map(oid) };
  if (q.status) filter.status = q.status;
  if (q.stage) filter.stage = q.stage;
  if (q.month && /^\d{4}-\d{2}$/.test(q.month)) filter.month = q.month;
  if (q.category) filter.category = q.category;
  if (q.from && validDay(q.from)) filter.date = { ...(filter.date || {}), $gte: q.from };
  if (q.to && validDay(q.to)) filter.date = { ...(filter.date || {}), $lte: q.to };
  if (q.tab === 'mine') { filter.status = 'submitted'; }
  let rows: any[] = await EmployeeExpense.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const emps: any[] = await Employee.find({ _id: { $in: [...new Set(rows.map((r) => String(r.employeeId)))].map(oid) } }).select('firstName lastName employeeCode department userId reportingManagerId').lean();
  const byEmp = new Map(emps.map((e) => [String(e._id), e]));
  const out: any[] = [];
  for (const r of rows) {
    const e = byEmp.get(String(r.employeeId));
    const canAct = await approveRights(tenantId, viewer, r, e?.userId ? String(e.userId) : null, e?.reportingManagerId ? String(e.reportingManagerId) : null);
    if (q.tab === 'mine' && !canAct) continue;
    out.push({ ...r, _id: String(r._id), employeeId: String(r.employeeId), employeeName: fullName(e), employeeCode: e?.employeeCode, department: e?.department, canAct, canPay: viewer.canManage && r.status === 'approved' });
  }
  rows = out;
  const total = (st: string[]) => round2(rows.filter((r) => st.includes(r.status)).reduce((s, r) => s + r.amount, 0));
  return { rows, totals: { submitted: total(['submitted']), approved: total(['approved']), paid: total(['paid']), rejected: total(['rejected']) } };
}

export async function actOn(tenantId: string, viewer: Viewer, id: string, action: string, note?: string) {
  if (!['approve', 'reject'].includes(action)) throw new EmployeeError('Choose approve or reject.');
  const e: any = await EmployeeExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!e) throw new EmployeeError('Expense not found', 404);
  const owner: any = await Employee.findById(e.employeeId).select('userId reportingManagerId').lean();
  if (!(await approveRights(tenantId, viewer, e, owner?.userId ? String(owner.userId) : null, owner?.reportingManagerId ? String(owner.reportingManagerId) : null))) {
    throw new EmployeeError(String(owner?.userId) === viewer.userId ? 'You cannot approve your own expense.' : 'You cannot act on this expense right now.', 403);
  }
  const cfg = await getConfig(tenantId);
  const text = String(note || '').trim().slice(0, 1000);
  if (action === 'reject') {
    if (!text) throw new EmployeeError('Say why you are rejecting it. The employee will see this.');
    e.status = 'rejected'; e.stage = 'done'; e.rejectionReason = text;
    e.trail.push({ action: 'rejected', by: oid(viewer.userId), byName: viewer.name, at: new Date(), note: text });
  } else if (cfg.expensePolicy.approvalMode === 'manager_then_approver' && e.stage === 'manager' && !viewer.canApprove) {
    e.stage = 'approver';
    e.trail.push({ action: 'manager_approved', by: oid(viewer.userId), byName: viewer.name, at: new Date(), note: text });
  } else {
    e.status = 'approved'; e.stage = 'done'; e.approvedBy = oid(viewer.userId); e.approvedAt = new Date();
    e.trail.push({ action: 'approved', by: oid(viewer.userId), byName: viewer.name, at: new Date(), note: text });
  }
  await e.save();
  return e.toObject();
}

export async function markPaid(tenantId: string, viewer: Viewer, ids: string[], input: { paymentMode?: string; paymentRef?: string }) {
  if (!viewer.canManage) throw new EmployeeError('You cannot mark expenses paid.', 403);
  const list = (ids || []).filter(validId).slice(0, 200).map(oid);
  if (!list.length) throw new EmployeeError('Choose the expenses that were paid.');
  const now = new Date();
  const mode = String(input?.paymentMode || '').trim().slice(0, 40);
  const ref = String(input?.paymentRef || '').trim().slice(0, 80);
  const r = await EmployeeExpense.updateMany(
    { _id: { $in: list }, tenantId: oid(tenantId), status: 'approved' },
    { $set: { status: 'paid', paidAt: now, paidBy: oid(viewer.userId), paymentMode: mode, paymentRef: ref }, $push: { trail: { action: 'paid', by: oid(viewer.userId), byName: viewer.name, at: now, note: [mode, ref].filter(Boolean).join(' · ') } } },
  );
  // A paid claim is company money out: it joins the company ledger (once, however often this runs).
  if (r.modifiedCount) {
    const paid: any[] = await EmployeeExpense.find({ _id: { $in: list }, tenantId: oid(tenantId), status: 'paid', paidAt: now }).lean();
    for (const claim of paid) await recordReimbursement(tenantId, claim, { userId: viewer.userId, name: viewer.name });
  }
  return { paid: r.modifiedCount };
}

export async function reopenPaid(tenantId: string, viewer: Viewer, id: string) {
  if (!viewer.canManage) throw new EmployeeError('You cannot change a paid expense.', 403);
  const r = await EmployeeExpense.updateOne({ _id: oid(id), tenantId: oid(tenantId), status: 'paid' }, { $set: { status: 'approved', paidAt: null, paymentMode: '', paymentRef: '' }, $push: { trail: { action: 'unpaid', by: oid(viewer.userId), byName: viewer.name, at: new Date() } } });
  if (!r.matchedCount) throw new EmployeeError('That expense is not marked paid.', 404);
  await removeReimbursement(tenantId, oid(id));
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function summary(tenantId: string, viewer: Viewer, month?: string) {
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : istMonth();
  const reports = viewer.canViewAll ? null : await directReportIds(tenantId, viewer.employeeId);
  const match: any = { tenantId: oid(tenantId), month: m, status: { $in: ['submitted', 'approved', 'paid', 'rejected'] } };
  if (reports) match.employeeId = { $in: reports.map(oid) };
  const [byStatus, byCategory, byEmployee, pendingAll] = await Promise.all([
    EmployeeExpense.aggregate([{ $match: match }, { $group: { _id: '$status', total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    EmployeeExpense.aggregate([{ $match: { ...match, status: { $in: ['submitted', 'approved', 'paid'] } } }, { $group: { _id: '$category', total: { $sum: '$amount' }, n: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    EmployeeExpense.aggregate([{ $match: { ...match, status: { $in: ['submitted', 'approved', 'paid'] } } }, { $group: { _id: '$employeeId', total: { $sum: '$amount' }, n: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 25 }]),
    EmployeeExpense.countDocuments({ tenantId: oid(tenantId), status: 'submitted', ...(reports ? { employeeId: { $in: reports.map(oid) } } : {}) }),
  ]);
  const emps: any[] = await Employee.find({ _id: { $in: byEmployee.map((b: any) => b._id) } }).select('firstName lastName employeeCode department').lean();
  const name = new Map(emps.map((e) => [String(e._id), e]));
  return {
    month: m, pendingApprovals: pendingAll,
    byStatus: Object.fromEntries(byStatus.map((x: any) => [x._id, { total: round2(x.total), count: x.n }])),
    byCategory: byCategory.map((x: any) => ({ category: x._id, total: round2(x.total), count: x.n })),
    byEmployee: byEmployee.map((x: any) => ({ employeeId: String(x._id), name: fullName(name.get(String(x._id))), code: name.get(String(x._id))?.employeeCode, department: name.get(String(x._id))?.department, total: round2(x.total), count: x.n })),
  };
}

const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function exportCsv(tenantId: string, viewer: Viewer, q: QueueQuery) {
  const { rows } = await queue(tenantId, viewer, { ...q, tab: 'all' });
  const head = ['Date', 'Employee code', 'Employee', 'Department', 'Category', 'Merchant', 'Description', 'Amount (INR)', 'Status', 'Approved on', 'Paid on', 'Payment mode', 'Payment reference', 'Receipts', 'Flags'];
  const lines = [head.join(',')];
  for (const r of rows) {
    lines.push([r.date, r.employeeCode, r.employeeName, r.department, r.category, r.merchant, r.description, r.amount.toFixed(2), r.status,
      r.approvedAt ? istDate(new Date(r.approvedAt)) : '', r.paidAt ? istDate(new Date(r.paidAt)) : '', r.paymentMode, r.paymentRef, (r.receipts || []).length, (r.flags || []).join(' ')].map(csvCell).join(','));
  }
  return lines.join('\n');
}

export async function detail(tenantId: string, id: string) {
  if (!validId(id)) throw new EmployeeError('Expense not found', 404);
  const e: any = await EmployeeExpense.findOne({ _id: oid(id), tenantId: oid(tenantId) }).lean();
  if (!e) throw new EmployeeError('Expense not found', 404);
  const emp: any = await Employee.findById(e.employeeId).select('firstName lastName employeeCode department reportingManagerId userId').lean();
  return { expense: { ...e, _id: String(e._id), employeeId: String(e.employeeId) }, employee: emp ? { ...emp, _id: String(emp._id), name: fullName(emp) } : null };
}
