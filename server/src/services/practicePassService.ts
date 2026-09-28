import mongoose from 'mongoose';
import {
  PracticePolicy, PracticeDay, PracticeStanding, PracticeReminderLog, PRACTICE_TASKS, PracticeTask, TaskCounts, IPracticePolicy,
} from '../models/PracticePass';
import { EmailService } from './emailService';
import { estimateCost, purposeTemplate, sendByPurpose, waCostPerMessage } from './purposeMessaging';

/**
 * Daily Practice Pass — the engine.
 *
 * A student's practice day is computed from what the labs already record:
 *   communication   a completed, evaluated Communication Lab recording of 20s or more
 *   coding_problem  a Problem Bank submission that passed at least one test
 *   assignment      an assignment submitted that day
 *   thinking_lab    a Thinking Lab daily challenge submitted or solved that day
 * Weekly offs, holidays and special days come from the batch calendar; approved leave from
 * leave requests. Days before the institute switched the pass on never count, so nobody is
 * judged on the months before the rule existed.
 */

export class PracticeError extends Error { constructor(message: string, public status = 400) { super(message); } }

const MIN_RECORDING_SECONDS = 20;
const DEFAULT_REQUIREMENTS: Required<TaskCounts> = { communication: 1, coding_problem: 1, assignment: 0, thinking_lab: 1 };
// Automatic reminders stay OFF unless an admin turns them on: every WhatsApp message costs money.
const DEFAULTS = { thresholdPct: 80, windowDays: 30, enforce: true, remindersEnabled: false };

export const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const istDay = (d: Date | string) => new Date(new Date(d).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
const oid = (s: any) => (mongoose.isValidObjectId(String(s)) ? new mongoose.Types.ObjectId(String(s)) : s);
const col = (name: string) => mongoose.connection.collection(name);

/* ── Rules ────────────────────────────────────────────────────────────────────────────────── */

export interface EffectivePolicy {
  enabled: boolean;
  requirements: Required<TaskCounts>;
  thresholdPct: number;
  windowDays: number;
  enforce: boolean;
  exempt: boolean;
  startDate: string;
  enforceFrom: string;
  remindersEnabled: boolean;
}

export async function policiesFor(tenantId: string) {
  const all = await PracticePolicy.find({ tenantId }).lean();
  const tenant = all.find((p) => p.scope === 'tenant') || null;
  const byBatch = new Map(all.filter((p) => p.scope === 'batch').map((p) => [p.targetId, p]));
  const byStudent = new Map(all.filter((p) => p.scope === 'student').map((p) => [p.targetId, p]));
  return { tenant, byBatch, byStudent };
}

export function resolve(
  tenant: IPracticePolicy | null, batch?: IPracticePolicy | null, student?: IPracticePolicy | null,
): EffectivePolicy {
  const pick = <K extends keyof IPracticePolicy>(k: K, dflt: any) =>
    (student?.[k] ?? batch?.[k] ?? tenant?.[k] ?? dflt);
  // Requirements are taken as a whole from the most specific level that sets them.
  const req = (student?.requirements || batch?.requirements || tenant?.requirements || DEFAULT_REQUIREMENTS) as TaskCounts;
  const requirements = Object.fromEntries(PRACTICE_TASKS.map((t) => [t, Math.max(0, Number(req[t]) || 0)])) as Required<TaskCounts>;
  return {
    enabled: !!tenant?.startDate,
    requirements,
    thresholdPct: pick('thresholdPct', DEFAULTS.thresholdPct),
    windowDays: pick('windowDays', DEFAULTS.windowDays),
    enforce: pick('enforce', DEFAULTS.enforce),
    exempt: !!student?.exempt,
    startDate: tenant?.startDate || istToday(),
    enforceFrom: tenant?.enforceFrom || tenant?.startDate || istToday(),
    remindersEnabled: tenant?.remindersEnabled ?? DEFAULTS.remindersEnabled,
  };
}

/* ── Computing days ───────────────────────────────────────────────────────────────────────── */

interface StudentRow { _id: any; batchId?: any; batchJoinedDate?: Date; firstName?: string; lastName?: string; phone?: string }

/** Count each task per student per IST day, between two days inclusive, in one pass per source. */
async function gatherDone(studentIds: any[], from: string, to: string) {
  const ids = studentIds.map(oid);
  const idStr = studentIds.map(String);
  const fromDate = new Date(`${from}T00:00:00+05:30`);
  const toDate = new Date(`${addDays(to, 1)}T00:00:00+05:30`);
  const done = new Map<string, Map<string, Required<TaskCounts>>>();
  const bump = (sid: any, day: string, task: PracticeTask) => {
    const k = String(sid);
    if (!done.has(k)) done.set(k, new Map());
    const m = done.get(k)!;
    if (!m.has(day)) m.set(day, { communication: 0, coding_problem: 0, assignment: 0, thinking_lab: 0 });
    m.get(day)![task]++;
  };

  const [comm, coding, assigns, thinking] = await Promise.all([
    col('communicationattempts').find(
      { studentId: { $in: ids }, status: 'completed', createdAt: { $gte: fromDate, $lt: toDate } },
      { projection: { studentId: 1, createdAt: 1, practiceDate: 1, recordingDuration: 1, evaluation: 1 } },
    ).toArray(),
    col('problemsubmissions').find(
      { userId: { $in: idStr }, passed: { $gte: 1 }, 'context.product': { $in: ['lms', 'careerpilot'] }, createdAt: { $gte: fromDate, $lt: toDate } },
      { projection: { userId: 1, createdAt: 1 } },
    ).toArray(),
    col('submissions').find(
      { student: { $in: ids }, status: { $in: ['submitted', 'grading', 'graded', 'late'] }, submittedAt: { $gte: fromDate, $lt: toDate } },
      { projection: { student: 1, submittedAt: 1 } },
    ).toArray(),
    col('dailychallenges').find(
      { studentId: { $in: ids }, date: { $gte: from, $lte: to }, status: { $in: ['submitted', 'solved'] } },
      { projection: { studentId: 1, date: 1 } },
    ).toArray(),
  ]);
  for (const c of comm) {
    if ((c.recordingDuration || 0) < MIN_RECORDING_SECONDS) continue;
    if (c.evaluation?.overallScore === undefined && c.overriddenScore === undefined) continue;
    bump(c.studentId, istDay(c.createdAt), 'communication');
  }
  for (const s of coding) bump(s.userId, istDay(s.createdAt), 'coding_problem');
  for (const s of assigns) bump(s.student, istDay(s.submittedAt), 'assignment');
  for (const t of thinking) bump(t.studentId, t.date, 'thinking_lab');
  return done;
}

async function gatherLeave(studentIds: any[], from: string, to: string) {
  const rows = await col('leaverequests').find({
    studentId: { $in: studentIds.map(oid) }, status: 'approved',
    fromDate: { $lte: new Date(`${to}T23:59:59+05:30`) }, toDate: { $gte: new Date(`${from}T00:00:00+05:30`) },
  }, { projection: { studentId: 1, fromDate: 1, toDate: 1 } }).toArray();
  const leave = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = String(r.studentId);
    if (!leave.has(k)) leave.set(k, new Set());
    for (let d = istDay(r.fromDate); d <= istDay(r.toDate) && d <= to; d = addDays(d, 1)) leave.get(k)!.add(d);
  }
  return leave;
}

function excuseFor(day: string, batch: any, leave: Set<string> | undefined, startDay: string): any {
  if (day < startDay) return 'before_start';
  const off: number[] = Array.isArray(batch?.weeklyOffDays) ? batch.weeklyOffDays : [0];
  if (off.includes(weekday(day))) return 'weekly_off';
  if ((batch?.holidays || []).includes(day)) return 'holiday';
  if ((batch?.specialDays || []).some((s: any) => s.date === day)) return 'holiday';
  if (leave?.has(day)) return 'leave';
  return undefined;
}

/**
 * Recompute days and standing for a set of students of one institute.
 * Upserts every day in the window (so a late approval of leave, or an admin rule change,
 * corrects history) and returns the standings.
 */
export async function recompute(tenantId: string, students: StudentRow[]) {
  if (!students.length) return [];
  const { tenant, byBatch, byStudent } = await policiesFor(tenantId);
  if (!tenant?.startDate) return [];
  const today = istToday();
  const maxWindow = Math.max(DEFAULTS.windowDays, tenant.windowDays || 0,
    ...Array.from(byBatch.values()).map((p) => p.windowDays || 0), ...Array.from(byStudent.values()).map((p) => p.windowDays || 0));
  const from = addDays(today, -(maxWindow - 1)) > tenant.startDate ? addDays(today, -(maxWindow - 1)) : tenant.startDate;

  const batchIds = Array.from(new Set(students.map((s) => String(s.batchId || '')).filter(Boolean)));
  const batches = await col('batches').find({ _id: { $in: batchIds.map(oid) } }, { projection: { weeklyOffDays: 1, holidays: 1, specialDays: 1, startDate: 1 } }).toArray();
  const batchMap = new Map(batches.map((b) => [String(b._id), b]));
  const [done, leave] = await Promise.all([gatherDone(students.map((s) => s._id), from, today), gatherLeave(students.map((s) => s._id), from, today)]);

  const dayOps: any[] = [];
  const standings: any[] = [];
  for (const s of students) {
    const sid = String(s._id);
    const bid = String(s.batchId || '');
    const pol = resolve(tenant, byBatch.get(bid), byStudent.get(sid));
    const batch = batchMap.get(bid);
    // A student counts from the later of: the pass starting, joining the batch, the batch starting.
    let startDay = pol.startDate;
    if (s.batchJoinedDate && istDay(s.batchJoinedDate) > startDay) startDay = istDay(s.batchJoinedDate);
    if (batch?.startDate && istDay(batch.startDate) > startDay) startDay = istDay(batch.startDate);
    const windowFrom = addDays(today, -(pol.windowDays - 1));
    const req = pol.requirements;
    const needed = PRACTICE_TASKS.filter((t) => req[t] > 0);

    let metDays = 0, countedDays = 0;
    const dayResults: { date: string; met: boolean; counted: boolean }[] = [];
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const got = done.get(sid)?.get(d) || { communication: 0, coding_problem: 0, assignment: 0, thinking_lab: 0 };
      const excused = pol.exempt ? 'exempt' : excuseFor(d, batch, leave.get(sid), startDay);
      const met = needed.length > 0 && needed.every((t) => got[t] >= req[t]);
      dayOps.push({ updateOne: {
        filter: { studentId: sid, date: d },
        update: { $set: { tenantId, batchId: bid, done: got, required: req, met, excused: excused || null, computedAt: new Date() } },
        upsert: true,
      } });
      // Today only counts once it is met — a student is not "missing" a day that is not over.
      const counted = !excused && d >= windowFrom && (d < today || met);
      if (counted) { countedDays++; if (met) metDays++; }
      dayResults.push({ date: d, met, counted: !excused && (d < today || met) });
    }

    // Streak: consecutive met working days back from today (today not yet met doesn't break it).
    let streak = 0;
    for (let i = dayResults.length - 1; i >= 0; i--) {
      const r = dayResults[i];
      if (!r.counted) continue; // excused days and an unfinished today neither extend nor break it
      if (r.met) streak++; else break;
    }
    const pct = countedDays ? Math.round((metDays / countedDays) * 1000) / 10 : 100;
    const yesterdayRow = [...dayResults].reverse().find((r) => r.date < today && r.counted);
    const enforced = pol.enforce && today >= pol.enforceFrom && !pol.exempt;
    // Give a new student a few days before a hold can bite.
    const onHold = enforced && countedDays >= 5 && pct < pol.thresholdPct;
    standings.push({
      tenantId, studentId: sid, batchId: bid, pct, metDays, countedDays, thresholdPct: pol.thresholdPct, streak,
      todayMet: !!dayResults.find((r) => r.date === today)?.met, missedYesterday: !!yesterdayRow && !yesterdayRow.met,
      onHold, exempt: pol.exempt, enforced,
    });
  }
  for (let i = 0; i < dayOps.length; i += 1000) await PracticeDay.bulkWrite(dayOps.slice(i, i + 1000), { ordered: false });

  const existing = new Map((await PracticeStanding.find({ studentId: { $in: standings.map((s) => s.studentId) } }).lean()).map((s) => [s.studentId, s]));
  await PracticeStanding.bulkWrite(standings.map((s) => {
    const prev: any = existing.get(s.studentId);
    return { updateOne: {
      filter: { studentId: s.studentId },
      update: { $set: {
        ...s,
        bestStreak: Math.max(prev?.bestStreak || 0, s.streak),
        holdSince: s.onHold ? (prev?.onHold ? prev.holdSince : new Date()) : null,
      } },
      upsert: true,
    } };
  }), { ordered: false });
  return standings;
}

const STUDENT_FIELDS = { batchId: 1, batchJoinedDate: 1, firstName: 1, lastName: 1, phone: 1, tenantId: 1, email: 1 };

export async function lmsStudents(tenantId: string, extra: Record<string, any> = {}) {
  return col('users').find(
    { tenantId: oid(tenantId), role: 'STUDENT', isActive: { $ne: false }, batchId: { $ne: null }, ...extra },
    { projection: STUDENT_FIELDS },
  ).toArray() as Promise<any[]>;
}

export async function recomputeTenant(tenantId: string) {
  const students = await lmsStudents(tenantId);
  for (let i = 0; i < students.length; i += 200) await recompute(tenantId, students.slice(i, i + 200));
  return students.length;
}

export async function recomputeStudent(tenantId: string, studentId: string) {
  const s = await col('users').findOne({ _id: oid(studentId), role: 'STUDENT' }, { projection: STUDENT_FIELDS }) as any;
  if (!s || !s.batchId) return null;
  const [st] = await recompute(tenantId, [s]);
  return st || null;
}

/* ── Placement hold check ─────────────────────────────────────────────────────────────────── */

/**
 * Is this student on placement hold? Used by every placement entry point. Returns null when
 * the student is fine or the pass is off, else the message to show.
 */
export async function placementHoldReason(studentId: string): Promise<string | null> {
  const s: any = await PracticeStanding.findOne({ studentId: String(studentId) }).lean();
  if (!s || !s.onHold) return null;
  return `On placement hold: practice attendance is ${s.pct}% (needs ${s.thresholdPct}%). Complete the daily practice tasks to lift the hold.`;
}

/* ── Student view ─────────────────────────────────────────────────────────────────────────── */

const TASK_META: Record<PracticeTask, { label: string; link: string }> = {
  communication: { label: 'Communication Lab', link: '/ai-communication-lab' },
  coding_problem: { label: 'Coding problem', link: '/coding-practice' },
  assignment: { label: 'Assignment', link: '/assignments' },
  thinking_lab: { label: 'Thinking Lab', link: '/thinking-lab' },
};

export async function myPractice(tenantId: string, studentId: string) {
  const { tenant, byBatch, byStudent } = await policiesFor(tenantId);
  if (!tenant?.startDate) return { enabled: false };
  const user: any = await col('users').findOne({ _id: oid(studentId) }, { projection: { batchId: 1, role: 1 } });
  if (!user || user.role !== 'STUDENT' || !user.batchId) return { enabled: false };
  const standing = await recomputeStudent(tenantId, studentId);
  const pol = resolve(tenant, byBatch.get(String(user.batchId)), byStudent.get(String(studentId)));
  const today = istToday();
  const days = await PracticeDay.find({ studentId: String(studentId), date: { $gte: addDays(today, -(pol.windowDays - 1)) } }).sort({ date: 1 }).lean();
  const todayRow = days.find((d) => d.date === today);
  const tasks = PRACTICE_TASKS.filter((t) => pol.requirements[t] > 0).map((t) => ({
    task: t, ...TASK_META[t], required: pol.requirements[t], done: (todayRow?.done as any)?.[t] || 0,
  }));
  const needMore = standing && standing.countedDays
    // k more practice days in a row: (met + k) / (counted + k) >= threshold
    ? Math.max(0, Math.ceil((pol.thresholdPct / 100 * standing.countedDays - standing.metDays) / Math.max(0.01, 1 - pol.thresholdPct / 100)))
    : 0;
  return {
    enabled: true,
    today, todayExcused: todayRow?.excused || null,
    tasks,
    standing,
    policy: { thresholdPct: pol.thresholdPct, windowDays: pol.windowDays, enforceFrom: pol.enforceFrom, enforce: pol.enforce, exempt: pol.exempt },
    graceDaysLeft: today < pol.enforceFrom ? Math.round((Date.parse(pol.enforceFrom) - Date.parse(today)) / 86400000) : 0,
    daysToRecover: standing?.onHold ? needMore : 0,
    calendar: days.map((d) => ({ date: d.date, met: d.met, excused: d.excused || null, done: d.done, required: d.required })),
  };
}

/* ── Admin ────────────────────────────────────────────────────────────────────────────────── */

export async function adminOverview(tenantId: string) {
  const { tenant, byBatch, byStudent } = await policiesFor(tenantId);
  const batches = await col('batches').find({ tenantId: oid(tenantId) }, { projection: { name: 1, isActive: 1 } }).sort({ createdAt: -1 }).toArray();
  return {
    enabled: !!tenant?.startDate,
    tenant: tenant ? { ...tenant, effective: resolve(tenant) } : { effective: resolve(null) },
    batches: batches.map((b: any) => ({
      _id: String(b._id), name: b.name, isActive: b.isActive !== false,
      policy: byBatch.get(String(b._id)) || null,
      effective: resolve(tenant, byBatch.get(String(b._id))),
    })),
    students: Array.from(byStudent.values()),
    tasks: PRACTICE_TASKS.map((t) => ({ key: t, label: TASK_META[t].label })),
  };
}

export async function enable(tenantId: string, userId: string, graceDays: number) {
  const today = istToday();
  const existing = await PracticePolicy.findOne({ tenantId, scope: 'tenant', targetId: '' });
  const startDate = existing?.startDate || today;
  const enforceFrom = addDays(today, Math.max(0, Math.min(60, Number(graceDays) || 0)));
  await PracticePolicy.updateOne({ tenantId, scope: 'tenant', targetId: '' },
    { $set: { startDate, enforceFrom, updatedBy: userId, targetName: 'Institute default' }, $setOnInsert: { requirements: DEFAULT_REQUIREMENTS } },
    { upsert: true });
  await recomputeTenant(tenantId);
  return { startDate, enforceFrom };
}

export async function disable(tenantId: string) {
  await PracticePolicy.updateOne({ tenantId, scope: 'tenant', targetId: '' }, { $unset: { startDate: 1, enforceFrom: 1 } });
  await PracticeStanding.updateMany({ tenantId }, { $set: { onHold: false, enforced: false } });
  return { disabled: true };
}

export async function savePolicy(tenantId: string, userId: string, body: any) {
  const scope = body.scope;
  if (!['tenant', 'batch', 'student'].includes(scope)) throw new PracticeError('Unknown scope.');
  const targetId = scope === 'tenant' ? '' : String(body.targetId || '');
  if (scope !== 'tenant' && !mongoose.isValidObjectId(targetId)) throw new PracticeError('Choose a batch or student.');
  let targetName = 'Institute default';
  if (scope === 'batch') {
    const b: any = await col('batches').findOne({ _id: oid(targetId), tenantId: oid(tenantId) }, { projection: { name: 1 } });
    if (!b) throw new PracticeError('Batch not found.', 404);
    targetName = b.name;
  }
  if (scope === 'student') {
    const u: any = await col('users').findOne({ _id: oid(targetId), tenantId: oid(tenantId), role: 'STUDENT' }, { projection: { firstName: 1, lastName: 1, email: 1 } });
    if (!u) throw new PracticeError('Student not found.', 404);
    targetName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
  }
  const set: any = { updatedBy: userId, targetName, note: String(body.note || '').slice(0, 500) };
  const unset: any = {};
  const field = (k: string, v: any) => { if (v === null || v === undefined || v === '') unset[k] = 1; else set[k] = v; };
  if (body.requirements === null) unset.requirements = 1;
  else if (body.requirements) {
    const r = Object.fromEntries(PRACTICE_TASKS.map((t) => [t, Math.min(10, Math.max(0, Math.round(Number(body.requirements[t]) || 0)))]));
    if (!Object.values(r).some((v) => v > 0)) throw new PracticeError('Require at least one task per day.');
    set.requirements = r;
  }
  field('thresholdPct', body.thresholdPct === '' || body.thresholdPct === null || body.thresholdPct === undefined ? null : Math.min(100, Math.max(0, Number(body.thresholdPct))));
  field('windowDays', body.windowDays ? Math.min(180, Math.max(7, Number(body.windowDays))) : null);
  if (body.enforce !== undefined) field('enforce', body.enforce === null ? null : !!body.enforce);
  if (scope === 'student') field('exempt', body.exempt ? true : null);
  if (scope === 'tenant' && body.remindersEnabled !== undefined) set.remindersEnabled = !!body.remindersEnabled;
  await PracticePolicy.updateOne({ tenantId, scope, targetId }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { upsert: true });
  // Rules changed — recompute the affected students now so the numbers on screen are right.
  if (scope === 'student') await recomputeStudent(tenantId, targetId);
  else if (scope === 'batch') await recompute(tenantId, await lmsStudents(tenantId, { batchId: oid(targetId) }));
  else await recomputeTenant(tenantId);
  return { ok: true };
}

export async function removeOverride(tenantId: string, scope: 'batch' | 'student', targetId: string) {
  await PracticePolicy.deleteOne({ tenantId, scope, targetId });
  if (scope === 'student') await recomputeStudent(tenantId, targetId);
  else await recompute(tenantId, await lmsStudents(tenantId, { batchId: oid(targetId) }));
  return { ok: true };
}

export async function standings(tenantId: string, q: { batchId?: string; filter?: string }) {
  const f: any = { tenantId };
  if (q.batchId) f.batchId = q.batchId;
  if (q.filter === 'hold') f.onHold = true;
  if (q.filter === 'missed') f.missedYesterday = true;
  const rows = await PracticeStanding.find(f).sort({ pct: 1 }).limit(3000).lean();
  const users = await col('users').find({ _id: { $in: rows.map((r) => oid(r.studentId)) } }, { projection: { firstName: 1, lastName: 1, email: 1, phone: 1 } }).toArray();
  const um = new Map(users.map((u: any) => [String(u._id), u]));
  const batches = await col('batches').find({ tenantId: oid(tenantId) }, { projection: { name: 1 } }).toArray();
  const bm = new Map(batches.map((b: any) => [String(b._id), b.name]));
  const out = rows.map((r) => {
    const u: any = um.get(r.studentId) || {};
    return { ...r, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email, phone: u.phone, batchName: bm.get(r.batchId) || '' };
  });
  const all = await PracticeStanding.find({ tenantId, ...(q.batchId ? { batchId: q.batchId } : {}) }).select('pct onHold todayMet missedYesterday').lean();
  return {
    rows: out,
    summary: {
      students: all.length,
      onHold: all.filter((s) => s.onHold).length,
      doneToday: all.filter((s) => s.todayMet).length,
      missedYesterday: all.filter((s) => s.missedYesterday).length,
      avgPct: all.length ? Math.round(all.reduce((a, s) => a + s.pct, 0) / all.length) : 0,
    },
  };
}

export async function studentCalendar(tenantId: string, studentId: string) {
  await recomputeStudent(tenantId, studentId);
  const days = await PracticeDay.find({ tenantId, studentId }).sort({ date: -1 }).limit(90).lean();
  const standing = await PracticeStanding.findOne({ studentId }).lean();
  return { standing, days };
}

/* ── Reminders ────────────────────────────────────────────────────────────────────────────── */

/** Students with work left today, for the evening reminder. */
export async function pendingToday(tenantId: string) {
  const { tenant, byBatch, byStudent } = await policiesFor(tenantId);
  if (!tenant?.startDate || tenant.remindersEnabled !== true) return [];
  const students = await lmsStudents(tenantId);
  await recompute(tenantId, students);
  const today = istToday();
  const days = await PracticeDay.find({ tenantId, date: today, met: false, excused: null }).lean();
  const byId = new Map(days.map((d) => [d.studentId, d]));
  return students.filter((s) => byId.has(String(s._id)) && s.phone).map((s) => {
    const pol = resolve(tenant, byBatch.get(String(s.batchId)), byStudent.get(String(s._id)));
    const d: any = byId.get(String(s._id));
    const left = PRACTICE_TASKS.filter((t) => pol.requirements[t] > (d.done?.[t] || 0)).map((t) => TASK_META[t].label);
    return { studentId: String(s._id), name: s.firstName || 'there', phone: s.phone, left };
  });
}

/* ── Admin-sent reminders ────────────────────────────────────────────────────────────────── */

export type ReminderAudience = 'pending_today' | 'missed_yesterday' | 'at_risk' | 'on_hold' | 'selected';

/** Who a reminder would reach, with what is left for each of them today. */
async function reminderTargets(tenantId: string, q: { audience: ReminderAudience; batchId?: string; studentIds?: string[] }) {
  const { tenant, byBatch, byStudent } = await policiesFor(tenantId);
  if (!tenant?.startDate) throw new PracticeError('Switch the Practice Pass on first.');
  const students = await lmsStudents(tenantId, q.batchId ? { batchId: oid(q.batchId) } : {});
  await recompute(tenantId, students);
  const today = istToday();
  const ids = students.map((s) => String(s._id));
  const [standings, days] = await Promise.all([
    PracticeStanding.find({ tenantId, studentId: { $in: ids } }).lean(),
    PracticeDay.find({ tenantId, date: today, studentId: { $in: ids } }).lean(),
  ]);
  const sm = new Map(standings.map((x) => [x.studentId, x]));
  const dm = new Map(days.map((x) => [x.studentId, x]));
  const picked = new Set((q.studentIds || []).map(String));
  return students.filter((s) => {
    const id = String(s._id);
    const st: any = sm.get(id);
    const d: any = dm.get(id);
    if (!st || st.exempt) return false;
    switch (q.audience) {
      case 'pending_today': return !!d && !d.met && !d.excused;
      case 'missed_yesterday': return !!st.missedYesterday;
      case 'at_risk': return !st.onHold && st.pct < st.thresholdPct;
      case 'on_hold': return !!st.onHold;
      case 'selected': return picked.has(id);
      default: return false;
    }
  }).map((s) => {
    const id = String(s._id);
    const pol = resolve(tenant, byBatch.get(String(s.batchId)), byStudent.get(id));
    const d: any = dm.get(id);
    const st: any = sm.get(id);
    const left = PRACTICE_TASKS.filter((t) => pol.requirements[t] > ((d?.done as any)?.[t] || 0)).map((t) => TASK_META[t].label);
    return {
      studentId: id, name: s.firstName || 'there', phone: s.phone || '', email: s.email || '', left,
      pct: st?.pct ?? 100, threshold: st?.thresholdPct ?? pol.thresholdPct, onHold: !!st?.onHold,
    };
  });
}

const escHtml = (x: string) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

function reminderEmail(t: { name: string; left: string[]; pct: number; threshold: number; onHold: boolean }, origin: string) {
  const tasks = t.left.length
    ? `<p>Still left today:</p><ul>${t.left.map((l) => `<li><b>${escHtml(l)}</b></li>`).join('')}</ul>`
    : '<p>Keep your daily practice going.</p>';
  const hold = t.onHold
    ? '<p style="background:#fef2f2;color:#991b1b;padding:10px 12px;border-radius:8px">Your placement support is <b>on hold</b>. Complete your daily practice to lift it.</p>'
    : '';
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 8px">Hi ${escHtml(t.name)}, your daily practice is waiting</h2>
  ${tasks}
  <p>Your practice attendance is <b>${t.pct}%</b>. Placement support needs <b>${t.threshold}%</b>.</p>
  ${hold}
  <p><a href="${origin}/my-practice" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open my practice</a></p>
  <p style="color:#64748b;font-size:12px">CodeBegun · Daily Practice Pass</p></div>`;
}

/**
 * Send, or with dryRun only count and price, a reminder. Nothing goes out unless an admin
 * presses Send; the dry run shows how many messages and roughly what WhatsApp will cost.
 */
export async function sendReminders(tenantId: string, userId: string, body: {
  audience: ReminderAudience; batchId?: string; studentIds?: string[]; channels: string[]; dryRun?: boolean; origin?: string;
}) {
  const channels = (body.channels || []).filter((c) => c === 'whatsapp' || c === 'email');
  if (!channels.length) throw new PracticeError('Choose Email, WhatsApp or both.');
  const targets = await reminderTargets(tenantId, body);
  const withPhone = targets.filter((t) => t.phone).length;
  const withEmail = targets.filter((t) => t.email).length;
  const waReady = !!purposeTemplate(tenantId, 'PRACTICE_REMINDER');
  const waMessages = channels.includes('whatsapp') && waReady ? withPhone : 0;
  const preview = {
    recipients: targets.length, withPhone, withEmail, whatsappTemplateReady: waReady,
    costPerMessageInr: waCostPerMessage(tenantId), estimatedCostInr: estimateCost(tenantId, waMessages),
    sample: targets.slice(0, 8).map((t) => ({ name: t.name, pct: t.pct, left: t.left })),
  };
  if (body.dryRun) return preview;
  if (!targets.length) throw new PracticeError('Nobody matches, so no reminder was sent.');
  if (channels.includes('whatsapp') && !waReady && !channels.includes('email')) {
    throw new PracticeError('No WhatsApp template is assigned for "Daily practice — evening reminder". Assign one in WhatsApp Templates, or send by email.');
  }
  const log = await PracticeReminderLog.create({
    tenantId, audience: body.audience, batchId: body.batchId, channels, total: targets.length,
    estimatedCostInr: preview.estimatedCostInr, createdBy: userId,
  });
  const origin = body.origin || 'https://platform.codebegun.com';
  (async () => {
    const mailer = new EmailService(tenantId);
    const c = { whatsappSent: 0, whatsappFailed: 0, emailSent: 0, emailFailed: 0 };
    for (const t of targets) {
      if (channels.includes('whatsapp') && waReady && t.phone) {
        const r = await sendByPurpose(tenantId, t.phone, 'PRACTICE_REMINDER', [t.name, t.left.join(', ') || 'your daily practice']);
        if (r.ok) c.whatsappSent++; else c.whatsappFailed++;
        await new Promise((ok) => setTimeout(ok, 150));
      }
      if (channels.includes('email') && t.email) {
        const subject = t.onHold ? 'Your placement support is on hold: practise today' : 'Your daily practice is waiting';
        const ok = await mailer.sendGenericEmail(t.email, subject, reminderEmail(t, origin)).catch(() => false);
        if (ok) c.emailSent++; else c.emailFailed++;
      }
    }
    await PracticeReminderLog.updateOne({ _id: log._id }, { $set: { ...c, status: 'done' } });
  })().catch((e) => console.error('[practice-pass] reminder send failed', e?.message));
  return { ...preview, logId: log._id, started: true };
}

export const reminderHistory = (tenantId: string) =>
  PracticeReminderLog.find({ tenantId }).sort({ createdAt: -1 }).limit(30).lean();
