import Employee from '../models/Employee';
import EmployeeDailyLog from '../models/EmployeeDailyLog';
import { EmployeeError, oid, validId, istDate, validDay, getConfig } from './employeeService';

/**
 * Daily activity: each working day an employee checks in (office, remote or field), notes what they
 * did, checks out, and submits the day. A manager or reviewer signs it off or sends it back.
 * Days are India dates (YYYY-MM-DD), so a log belongs to the day the person worked, not the server's.
 */

const WORK_MODES = ['office', 'remote', 'field', 'leave', 'holiday'];
const hhmmIst = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(11, 16);
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86_400_000).toISOString().slice(0, 10);
const weekday = (day: string) => new Date(day + 'T00:00:00Z').getUTCDay();
const round1 = (n: number) => Math.round(n * 10) / 10;

export function eachDay(from: string, to: string, cap = 400): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < cap; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The days in a range that are working days, and not in the future. */
const workingDaysIn = (days: string[], workingDays: number[], today: string) => days.filter((d) => d <= today && workingDays.includes(weekday(d)));

const cleanTasks = (v: unknown) => {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 40).map((t: any) => ({
    title: String(t?.title ?? '').trim().slice(0, 300),
    category: String(t?.category ?? '').trim().slice(0, 60),
    hours: Math.min(24, Math.max(0, Math.round((Number(t?.hours) || 0) * 4) / 4)),
    status: ['done', 'in_progress', 'blocked'].includes(t?.status) ? t.status : 'done',
    note: String(t?.note ?? '').trim().slice(0, 500),
  })).filter((t) => t.title);
};

async function getOrCreate(tenantId: string, employeeId: string, date: string) {
  const log = await EmployeeDailyLog.findOneAndUpdate(
    { tenantId: oid(tenantId), employeeId: oid(employeeId), date },
    { $setOnInsert: { tenantId: oid(tenantId), employeeId: oid(employeeId), date } },
    { upsert: true, new: true },
  );
  return log!;
}

/** May this day's log still be changed by the employee? */
async function assertEditable(tenantId: string, log: any, date: string) {
  const cfg = await getConfig(tenantId);
  const today = istDate();
  if (date > today) throw new EmployeeError('You cannot fill in a day that has not happened yet.');
  if (date < addDays(today, -Number(cfg.activityPolicy.editableDays))) throw new EmployeeError(`A day can be filled in for ${cfg.activityPolicy.editableDays} days. Ask your manager to reopen it.`);
  if (log && ['submitted', 'approved'].includes(log.status)) throw new EmployeeError(log.status === 'approved' ? 'This day is already approved.' : 'This day is submitted. Wait for the review, or ask to have it sent back.');
}

export async function checkIn(tenantId: string, employeeId: string, workMode: string) {
  const cfg = await getConfig(tenantId);
  const today = istDate();
  const log: any = await getOrCreate(tenantId, employeeId, today);
  if (['submitted', 'approved'].includes(log.status)) throw new EmployeeError('Today is already submitted.');
  if (!log.checkInAt) {
    const now = new Date();
    log.checkInAt = now;
    log.late = hhmmIst(now) > cfg.activityPolicy.lateCheckInAfter && !['leave', 'holiday'].includes(workMode);
  }
  log.workMode = WORK_MODES.includes(workMode) ? workMode : (log.workMode || 'office');
  await log.save();
  return log.toObject();
}

export async function checkOut(tenantId: string, employeeId: string) {
  const cfg = await getConfig(tenantId);
  const today = istDate();
  const log: any = await EmployeeDailyLog.findOne({ tenantId: oid(tenantId), employeeId: oid(employeeId), date: today });
  if (!log?.checkInAt && cfg.activityPolicy.requireCheckIn) throw new EmployeeError('Check in first.');
  const l: any = log || await getOrCreate(tenantId, employeeId, today);
  if (['submitted', 'approved'].includes(l.status)) throw new EmployeeError('Today is already submitted.');
  l.checkOutAt = new Date();
  await l.save();
  return l.toObject();
}

export async function saveLog(tenantId: string, employeeId: string, date: string, body: any) {
  if (!validDay(date)) throw new EmployeeError('Choose a valid date.');
  const existing: any = await EmployeeDailyLog.findOne({ tenantId: oid(tenantId), employeeId: oid(employeeId), date });
  await assertEditable(tenantId, existing, date);
  const log: any = existing || await getOrCreate(tenantId, employeeId, date);
  if (body.tasks !== undefined) log.tasks = cleanTasks(body.tasks);
  if (body.workMode !== undefined && WORK_MODES.includes(body.workMode)) log.workMode = body.workMode;
  for (const k of ['blockers', 'tomorrowPlan', 'summary'] as const) if (body[k] !== undefined) log[k] = String(body[k]).trim().slice(0, 2000);
  log.totalHours = round1((log.tasks || []).reduce((s: number, t: any) => s + (t.hours || 0), 0));
  if (log.status === 'returned') log.status = 'open';
  await log.save();
  return log.toObject();
}

export async function submitLog(tenantId: string, employeeId: string, date: string) {
  if (!validDay(date)) throw new EmployeeError('Choose a valid date.');
  const log: any = await EmployeeDailyLog.findOne({ tenantId: oid(tenantId), employeeId: oid(employeeId), date });
  if (!log) throw new EmployeeError('Add what you worked on first.');
  await assertEditable(tenantId, log, date);
  const cfg = await getConfig(tenantId);
  const off = ['leave', 'holiday'].includes(log.workMode);
  if (!off && !(log.tasks || []).length) throw new EmployeeError('Add at least one task before submitting.');
  if (!off && cfg.activityPolicy.requireCheckIn && !log.checkInAt && date === istDate()) throw new EmployeeError('Check in before you submit today.');
  log.status = cfg.activityPolicy.reviewMode === 'none' ? 'approved' : 'submitted';
  log.submittedAt = new Date();
  log.reviewNote = ''; log.reviewerUserId = undefined; log.reviewerName = ''; log.reviewedAt = undefined;
  if (log.status === 'approved') log.reviewedAt = new Date();
  await log.save();
  return log.toObject();
}

export async function myDay(tenantId: string, employeeId: string, date: string) {
  const log = await EmployeeDailyLog.findOne({ tenantId: oid(tenantId), employeeId: oid(employeeId), date }).lean();
  return log || { date, status: 'open', tasks: [], workMode: 'office', totalHours: 0 };
}

/** An employee's days in a range, with the working days they have not logged marked "missing". */
export async function myHistory(tenantId: string, employeeId: string, from: string, to: string) {
  if (!validDay(from) || !validDay(to) || from > to) throw new EmployeeError('Choose a valid date range.');
  const cfg = await getConfig(tenantId);
  const days = eachDay(from, to, 120);
  const logs: any[] = await EmployeeDailyLog.find({ tenantId: oid(tenantId), employeeId: oid(employeeId), date: { $in: days } }).lean();
  const by = new Map(logs.map((l) => [l.date, l]));
  const today = istDate();
  const working = new Set(workingDaysIn(days, cfg.activityPolicy.workingDays, today));
  return days.sort().reverse().map((d) => {
    const l = by.get(d);
    if (l) return { date: d, status: l.status, workMode: l.workMode, totalHours: l.totalHours, checkInAt: l.checkInAt, checkOutAt: l.checkOutAt, late: l.late, taskCount: (l.tasks || []).length, reviewNote: l.reviewNote, summary: l.summary };
    return { date: d, status: working.has(d) && d < today ? 'missing' : 'none', workMode: '', totalHours: 0, taskCount: 0 };
  });
}

// ── Review ───────────────────────────────────────────────────────────────────

/** Who the viewer may see: everyone ('all') or only these employees. */
export type Scope = { all: boolean; ids?: string[] };

const scopeFilter = (scope: Scope) => (scope.all ? {} : { _id: { $in: (scope.ids || []).filter(validId).map(oid) } });
export const inScope = (scope: Scope, employeeId: string) => scope.all || (scope.ids || []).includes(String(employeeId));

export async function reviewList(tenantId: string, scope: Scope, q: { from?: string; to?: string; status?: string; employeeId?: string; department?: string }) {
  const today = istDate();
  const from = q.from && validDay(q.from) ? q.from : addDays(today, -7);
  const to = q.to && validDay(q.to) ? q.to : today;
  const emps: any[] = await Employee.find({ tenantId: oid(tenantId), ...scopeFilter(scope), ...(q.department ? { department: q.department } : {}) }).select('firstName lastName employeeCode department designation').lean();
  const ids = emps.map((e) => e._id).filter((id) => !q.employeeId || String(id) === q.employeeId);
  const filter: any = { tenantId: oid(tenantId), employeeId: { $in: ids }, date: { $gte: from, $lte: to } };
  if (q.status) filter.status = q.status;
  const logs: any[] = await EmployeeDailyLog.find(filter).sort({ date: -1, submittedAt: -1 }).limit(500).lean();
  const byEmp = new Map(emps.map((e) => [String(e._id), e]));
  return logs.map((l) => {
    const e = byEmp.get(String(l.employeeId));
    return { ...l, _id: String(l._id), employeeId: String(l.employeeId), employeeName: e ? [e.firstName, e.lastName].filter(Boolean).join(' ') : '', employeeCode: e?.employeeCode, department: e?.department, designation: e?.designation };
  });
}

export async function logForReview(tenantId: string, logId: string) {
  if (!validId(logId)) throw new EmployeeError('Log not found', 404);
  const log: any = await EmployeeDailyLog.findOne({ _id: oid(logId), tenantId: oid(tenantId) }).lean();
  if (!log) throw new EmployeeError('Log not found', 404);
  const e: any = await Employee.findById(log.employeeId).select('firstName lastName employeeCode department designation userId').lean();
  return { ...log, _id: String(log._id), employeeName: e ? [e.firstName, e.lastName].filter(Boolean).join(' ') : '', employeeCode: e?.employeeCode, employeeUserId: e?.userId ? String(e.userId) : null };
}

export async function reviewLog(tenantId: string, actor: { id: string; name: string }, logId: string, action: string, note?: string) {
  const log: any = await EmployeeDailyLog.findOne({ _id: oid(logId), tenantId: oid(tenantId) });
  if (!log) throw new EmployeeError('Log not found', 404);
  if (log.status !== 'submitted') throw new EmployeeError('Only a submitted day can be reviewed.');
  if (action === 'return' && !String(note || '').trim()) throw new EmployeeError('Say what needs to change when you send a day back.');
  if (!['approve', 'return'].includes(action)) throw new EmployeeError('Choose approve or return.');
  log.status = action === 'approve' ? 'approved' : 'returned';
  log.reviewerUserId = oid(actor.id); log.reviewerName = actor.name; log.reviewedAt = new Date(); log.reviewNote = String(note || '').trim().slice(0, 1000);
  await log.save();
  return log.toObject();
}

/** Re-open an approved day so the employee can correct it. */
export async function reopenLog(tenantId: string, actor: { id: string; name: string }, logId: string, note?: string) {
  const log: any = await EmployeeDailyLog.findOne({ _id: oid(logId), tenantId: oid(tenantId) });
  if (!log) throw new EmployeeError('Log not found', 404);
  log.status = 'returned'; log.reviewerUserId = oid(actor.id); log.reviewerName = actor.name; log.reviewedAt = new Date(); log.reviewNote = String(note || 'Reopened for correction').slice(0, 1000);
  await log.save();
  return log.toObject();
}

/** Who has started their day, and who has not (the board for one day). */
export async function dayBoard(tenantId: string, scope: Scope, date?: string) {
  const day = date && validDay(date) ? date : istDate();
  const emps: any[] = await Employee.find({ tenantId: oid(tenantId), status: { $nin: ['exited'] }, ...scopeFilter(scope) }).select('firstName lastName employeeCode department designation workMode').sort({ firstName: 1 }).lean();
  const logs: any[] = await EmployeeDailyLog.find({ tenantId: oid(tenantId), date: day, employeeId: { $in: emps.map((e) => e._id) } }).lean();
  const by = new Map(logs.map((l) => [String(l.employeeId), l]));
  return emps.map((e) => {
    const l = by.get(String(e._id));
    const state = !l ? 'not_started' : l.status !== 'open' ? l.status : l.checkOutAt ? 'checked_out' : l.checkInAt ? 'checked_in' : 'not_started';
    return { employeeId: String(e._id), name: [e.firstName, e.lastName].filter(Boolean).join(' '), code: e.employeeCode, department: e.department, designation: e.designation, state, workMode: l?.workMode || '', checkInAt: l?.checkInAt, checkOutAt: l?.checkOutAt, late: !!l?.late, totalHours: l?.totalHours || 0, taskCount: (l?.tasks || []).length, logId: l ? String(l._id) : null };
  });
}

/** A month at a glance, per employee: days worked, hours, late days, missing days. */
export async function monthlyReport(tenantId: string, scope: Scope, month: string, department?: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new EmployeeError('Choose a month like 2026-10.');
  const cfg = await getConfig(tenantId);
  const today = istDate();
  const from = `${month}-01`;
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const to = `${month}-${String(last).padStart(2, '0')}`;
  const days = eachDay(from, to);
  const working = workingDaysIn(days, cfg.activityPolicy.workingDays, today);
  const emps: any[] = await Employee.find({ tenantId: oid(tenantId), status: { $ne: 'exited' }, ...scopeFilter(scope), ...(department ? { department } : {}) }).select('firstName lastName employeeCode department designation joiningDate').sort({ firstName: 1 }).lean();
  const logs: any[] = await EmployeeDailyLog.find({ tenantId: oid(tenantId), date: { $gte: from, $lte: to }, employeeId: { $in: emps.map((e) => e._id) } }).select('employeeId date status totalHours late workMode').lean();
  const by = new Map<string, any[]>();
  for (const l of logs) { const k = String(l.employeeId); (by.get(k) || by.set(k, []).get(k)!).push(l); }
  return {
    month, workingDays: working.length, expectedHours: cfg.activityPolicy.expectedHours,
    rows: emps.map((e) => {
      const mine = by.get(String(e._id)) || [];
      const mineDays = new Set(mine.map((l) => l.date));
      const joined = e.joiningDate ? istDate(new Date(e.joiningDate)) : '0000-00-00';
      const expected = working.filter((d) => d >= joined);
      const counted = mine.filter((l) => !['leave', 'holiday'].includes(l.workMode));
      const hours = round1(counted.reduce((s, l) => s + (l.totalHours || 0), 0));
      return {
        employeeId: String(e._id), name: [e.firstName, e.lastName].filter(Boolean).join(' '), code: e.employeeCode, department: e.department, designation: e.designation,
        daysLogged: counted.length, daysApproved: mine.filter((l) => l.status === 'approved').length, daysPending: mine.filter((l) => l.status === 'submitted').length,
        daysReturned: mine.filter((l) => l.status === 'returned').length, daysOnLeave: mine.filter((l) => l.workMode === 'leave').length,
        remoteDays: mine.filter((l) => l.workMode === 'remote').length, fieldDays: mine.filter((l) => l.workMode === 'field').length,
        lateDays: mine.filter((l) => l.late).length, missingDays: expected.filter((d) => !mineDays.has(d)).length,
        totalHours: hours, avgHours: counted.length ? round1(hours / counted.length) : 0,
      };
    }),
  };
}
