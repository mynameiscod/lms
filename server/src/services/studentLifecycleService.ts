import mongoose from 'mongoose';
import User from '../models/User';
import Batch from '../models/Batch';
import { getRules, accessRules, istDayKey } from './studentRulesService';
import { sendByPurpose, purposeTemplate } from './purposeMessaging';

/**
 * A student's life at the institute, after joining:
 *
 *  - Status: Active / Inactive / Discontinued / Course completed, each with a date, reason and note,
 *    and a history of every change. Completed keeps login; Inactive and Discontinued switch it off.
 *  - Access window: an LMS student can log in for N days (365 by default, Student Rules → Access)
 *    from the day they FIRST joined a batch. An admin can extend it to an exact date. After it ends
 *    login stops ("Your LMS access ended on …"); nothing is deleted.
 *  - Batch closing: a summary of how the batch ended, what happens to the students still in it
 *    (course completed / moved to another batch / left as they are), and the batch leaves every list.
 */

const DAY_MS = 86_400_000;
const IST_MS = 5.5 * 3600_000;

export class LifecycleError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/* ── Status ───────────────────────────────────────────────────────────────────────────────── */

export const STUDENT_STATUSES = ['active', 'inactive', 'discontinued', 'completed'] as const;
export type StudentStatus = typeof STUDENT_STATUSES[number];

export interface StatusInput { status: string; date?: string | Date; reason?: string; note?: string; source?: string }

/** Build the update for one status change (also used by batch closing). Throws on bad input. */
export function statusUpdate(input: StatusInput, by: string | undefined) {
  const status = input.status as StudentStatus;
  if (!STUDENT_STATUSES.includes(status)) throw new LifecycleError('Status must be active, inactive, discontinued or completed');
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 100) : '';
  if (status !== 'active' && !reason) throw new LifecycleError('Pick a reason');
  let at = input.date ? new Date(input.date) : new Date();
  if (isNaN(at.getTime())) at = new Date();
  if (at.getTime() > Date.now() + DAY_MS) throw new LifecycleError('Date cannot be in the future');
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  const byId = by && mongoose.isValidObjectId(by) ? new mongoose.Types.ObjectId(by) : undefined;

  const set: any = {
    studentStatus: status,
    studentStatusAt: at,
    studentStatusBy: byId,
    // Completed students keep their login until their access window ends.
    isActive: status === 'active' || status === 'completed',
  };
  const unset: any = {};
  if (status === 'active') { unset.studentStatusReason = 1; unset.studentStatusNote = 1; }
  else { set.studentStatusReason = reason; set.studentStatusNote = note; }
  if (status === 'inactive' || status === 'discontinued') { set.resetToken = null; set.resetTokenExpires = null; }

  const history = { status, at, reason: reason || undefined, note: note || undefined, by: byId, changedAt: new Date(), source: input.source };
  const update: any = { $set: set, $push: { studentStatusHistory: { $each: [history], $slice: -100 } } };
  if (Object.keys(unset).length) update.$unset = unset;
  return update;
}

export async function setStatus(tenantId: string, userId: string, input: StatusInput, by?: string) {
  if (!mongoose.isValidObjectId(userId)) throw new LifecycleError('User not found', 404);
  const target: any = await User.findOne({ _id: userId, tenantId }).select('role').lean();
  if (!target) throw new LifecycleError('User not found', 404);
  if (target.role !== 'STUDENT') throw new LifecycleError('Status applies to students only');
  return User.findByIdAndUpdate(userId, statusUpdate(input, by), { new: true });
}

/** Same status for several students at once (e.g. everyone who finished). */
export async function setStatusMany(tenantId: string, userIds: string[], input: StatusInput, by?: string) {
  const ids = [...new Set((userIds || []).map(String))].filter((id) => mongoose.isValidObjectId(id)).slice(0, 500);
  if (!ids.length) throw new LifecycleError('Pick at least one student');
  const update = statusUpdate(input, by);
  const r = await User.updateMany({ _id: { $in: ids }, tenantId, role: 'STUDENT' }, update);
  return { updated: r.modifiedCount };
}

/* ── Access window ────────────────────────────────────────────────────────────────────────── */

/** Students the access window applies to: LMS students in a batch (not LMS-demo or CareerPilot-only accounts). */
export const accessApplies = (u: any) => !!u && u.role === 'STUDENT' && !!u.batchId && !u.lmsDemo?.at;

/** The day the student first joined (batchJoinedDate resets on every move, so lmsJoinedAt wins). */
export const accessStartOf = (u: any): Date | null => {
  const d = u?.lmsJoinedAt || u?.batchJoinedDate || u?.createdAt;
  return d ? new Date(d) : null;
};

/** End of the given IST calendar day, so "until 12 Dec" means all of 12 Dec in India. */
const endOfIstDay = (d: Date) => new Date(new Date(istDayKey(d)).getTime() + DAY_MS - 1 - IST_MS);

export function accessUntilOf(u: any, days: number): Date | null {
  if (u?.accessUntil) return new Date(u.accessUntil);
  const start = accessStartOf(u);
  return start ? endOfIstDay(new Date(start.getTime() + days * DAY_MS)) : null;
}

export const fmtDay = (d: Date) => {
  const [y, m, day] = istDayKey(d).split('-').map(Number);
  return `${day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`;
};

export const accessEndedMessage = (until: Date) => `Your LMS access ended on ${fmtDay(until)}. Contact the office to extend it.`;

/** Has this student's access window ended? `u` needs role, batchId, lmsDemo, lmsJoinedAt, batchJoinedDate, createdAt, accessUntil, tenantId. */
export async function accessEnded(u: any): Promise<{ ended: boolean; until: Date | null }> {
  if (!accessApplies(u) || !u.tenantId) return { ended: false, until: null };
  const days = accessRules(await getRules(String(u.tenantId))).days;
  const until = accessUntilOf(u, days);
  return { ended: !!until && until.getTime() < Date.now(), until };
}

/** The fields accessEnded needs, for .select(). */
export const ACCESS_FIELDS = 'role batchId lmsDemo lmsJoinedAt batchJoinedDate createdAt accessUntil tenantId';

/**
 * Extend (or change) one student's access to an exact date, or `until: null` to go back to the
 * default window. Every change is kept in accessHistory with the reason.
 */
export async function setAccess(tenantId: string, userId: string, until: string | null, reason: string, by?: string) {
  if (!mongoose.isValidObjectId(userId)) throw new LifecycleError('User not found', 404);
  const why = String(reason || '').trim().slice(0, 300);
  if (!why) throw new LifecycleError('Write why (e.g. "Student asked — placement still in progress")');
  const u: any = await User.findOne({ _id: userId, tenantId }).select(ACCESS_FIELDS).lean();
  if (!u) throw new LifecycleError('User not found', 404);
  if (u.role !== 'STUDENT') throw new LifecycleError('Access dates apply to students only');
  const days = accessRules(await getRules(tenantId)).days;
  const from = accessUntilOf(u, days) || undefined;
  const byId = by && mongoose.isValidObjectId(by) ? new mongoose.Types.ObjectId(by) : undefined;

  let to: Date | undefined;
  if (until) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(until))) throw new LifecycleError('Pick a date');
    to = endOfIstDay(new Date(`${until}T12:00:00+05:30`));
    if (isNaN(to.getTime())) throw new LifecycleError('Pick a date');
  }
  const entry = { from, to: to || accessUntilOf({ ...u, accessUntil: undefined }, days) || undefined, reason: why, by: byId, at: new Date() };
  const update: any = { $push: { accessHistory: { $each: [entry], $slice: -50 } } };
  if (to) update.$set = { accessUntil: to }; else update.$unset = { accessUntil: 1 };
  // Joined before lmsJoinedAt existed: pin the start now, so a later batch move cannot change it.
  if (!u.lmsJoinedAt && accessStartOf(u)) update.$set = { ...(update.$set || {}), lmsJoinedAt: accessStartOf(u) };
  return User.findByIdAndUpdate(userId, update, { new: true });
}

/** Add access info to rows of the Users list (students only). */
export async function withAccess<T extends Record<string, any>>(tenantId: string, users: T[]): Promise<(T & { accessEndsAt?: Date | null; accessStart?: Date | null })[]> {
  const days = accessRules(await getRules(tenantId)).days;
  return users.map((u) => (accessApplies(u) ? { ...u, accessStart: accessStartOf(u), accessEndsAt: accessUntilOf(u, days) } : u));
}

/**
 * Pin lmsJoinedAt for students who joined before it existed (their current batchJoinedDate is the
 * best record of when they joined). Idempotent; run at start-up and before each batch move.
 */
export async function pinJoinDates(filter: any = {}) {
  const r = await User.updateMany(
    { role: 'STUDENT', lmsJoinedAt: { $exists: false }, batchJoinedDate: { $exists: true, $ne: null }, ...filter },
    [{ $set: { lmsJoinedAt: '$batchJoinedDate' } }],
  );
  return r.modifiedCount;
}

/* ── "Access ending" reminder (off by default) ────────────────────────────────────────────── */

export const ACCESS_PURPOSE = 'ACCESS_ENDING';

export async function accessReminderPlan(tenantId: string) {
  const rules = accessRules(await getRules(tenantId));
  const now = Date.now();
  const students = await User.find({
    tenantId, role: 'STUDENT', isActive: { $ne: false }, batchId: { $ne: null }, 'lmsDemo.at': { $exists: false },
  }).select(`${ACCESS_FIELDS} firstName lastName phone accessReminderFor`).lean<any[]>();
  const due = students
    .map((s) => ({ s, until: accessUntilOf(s, rules.days) }))
    .filter(({ s, until }) => until && until.getTime() > now && until.getTime() - now <= rules.reminderDaysBefore * DAY_MS
      && !(s.accessReminderFor && new Date(s.accessReminderFor).getTime() === until.getTime()))
    .map(({ s, until }) => ({ id: String(s._id), firstName: s.firstName || 'there', phone: s.phone || '', until: until!, daysLeft: Math.max(1, Math.ceil((until!.getTime() - now) / DAY_MS)) }));
  return { rules, due, template: !!purposeTemplate(tenantId, ACCESS_PURPOSE) };
}

/** Send today's reminders. Does nothing unless switched on AND a template is assigned. */
export async function runAccessReminders(tenantId: string) {
  const plan = await accessReminderPlan(tenantId);
  const res = { sent: 0, failed: 0, skipped: 0 };
  if (!plan.rules.reminderEnabled || !plan.template) return res;
  for (const d of plan.due) {
    if (!d.phone) { res.skipped++; continue; }
    const r = await sendByPurpose(tenantId, d.phone, ACCESS_PURPOSE, [d.firstName, fmtDay(d.until), String(d.daysLeft)]);
    if (r.ok) { res.sent++; await User.updateOne({ _id: d.id }, { $set: { accessReminderFor: d.until } }); } else res.failed++;
    await new Promise((ok) => setTimeout(ok, 150));
  }
  return res;
}

/* ── Batch closing ────────────────────────────────────────────────────────────────────────── */

const statusOf = (u: any): StudentStatus =>
  u.studentStatus === 'completed' && u.isActive !== false ? 'completed'
    : u.isActive === false ? (u.studentStatus === 'discontinued' ? 'discontinued' : 'inactive')
      : 'active';
const placedOf = (u: any) => ['placed', 'multiple_offers'].includes(u?.placement?.status);

async function batchOrThrow(tenantId: string, batchId: string) {
  if (!mongoose.isValidObjectId(batchId)) throw new LifecycleError('Batch not found', 404);
  const b: any = await Batch.findOne({ _id: batchId, tenantId }).lean();
  if (!b) throw new LifecycleError('Batch not found', 404);
  return b;
}

const batchStudents = (tenantId: string, batchId: string) =>
  User.find({ tenantId, role: 'STUDENT', batchId, 'lmsDemo.at': { $exists: false } })
    .select('firstName lastName email phone isActive studentStatus placement batchJoinedDate').lean<any[]>();

function countsOf(students: any[]) {
  const c = { total: students.length, completed: 0, placed: 0, discontinued: 0, inactive: 0, active: 0, moved: 0 };
  for (const s of students) {
    c[statusOf(s)]++;
    if (placedOf(s)) c.placed++;
  }
  return c;
}

/** What the Close batch form shows: the counts so far, every student, and the batches to move people to. */
export async function closePreview(tenantId: string, batchId: string) {
  const b = await batchOrThrow(tenantId, batchId);
  const students = await batchStudents(tenantId, batchId);
  const targets = await Batch.find({ tenantId, isActive: true, _id: { $ne: b._id }, kind: { $ne: 'placement' } })
    .select('name startDate endDate').sort({ startDate: -1 }).lean<any[]>();
  return {
    batch: { id: String(b._id), name: b.name, startDate: b.startDate, endDate: b.endDate, closedAt: b.closedAt || null },
    counts: countsOf(students),
    students: students.map((s) => ({
      id: String(s._id), name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), email: s.email, status: statusOf(s), placed: placedOf(s),
    })).sort((x, y) => x.name.localeCompare(y.name)),
    moveTargets: targets.map((t) => ({ id: String(t._id), name: t.name, startDate: t.startDate })),
  };
}

export interface CloseInput {
  closedOn?: string;
  notes?: string;
  discountedCount?: number | null;
  /** studentId → what happens to them. Students not listed stay as they are. */
  actions?: Record<string, 'complete' | 'move' | 'keep'>;
  moveTo?: string;
}

export async function closeBatch(tenantId: string, batchId: string, input: CloseInput, by?: string) {
  const b = await batchOrThrow(tenantId, batchId);
  if (b.closedAt && b.isActive === false) throw new LifecycleError('This batch is already closed.');
  let closedOn = input.closedOn ? new Date(`${input.closedOn}T12:00:00+05:30`) : new Date();
  if (isNaN(closedOn.getTime())) closedOn = new Date();
  if (closedOn.getTime() > Date.now() + DAY_MS) throw new LifecycleError('The closing date cannot be in the future.');

  const students = await batchStudents(tenantId, batchId);
  const mine = new Set(students.map((s) => String(s._id)));
  const actions = Object.entries(input.actions || {}).filter(([id, a]) => mine.has(id) && ['complete', 'move', 'keep'].includes(a));
  const toComplete = actions.filter(([, a]) => a === 'complete').map(([id]) => id);
  const toMove = actions.filter(([, a]) => a === 'move').map(([id]) => id);

  let target: any = null;
  if (toMove.length) {
    if (!input.moveTo || !mongoose.isValidObjectId(input.moveTo)) throw new LifecycleError('Pick the batch to move students to.');
    target = await Batch.findOne({ _id: input.moveTo, tenantId, isActive: true }).select('name').lean();
    if (!target || String(target._id) === String(b._id)) throw new LifecycleError('Pick an open batch (not this one) to move students to.');
  }

  if (toComplete.length) {
    await User.updateMany({ _id: { $in: toComplete }, tenantId },
      statusUpdate({ status: 'completed', date: closedOn, reason: 'Batch closed', note: `${b.name} closed`, source: 'batch_close' }, by));
  }
  if (toMove.length) {
    await pinJoinDates({ _id: { $in: toMove } }); // the access window keeps counting from the first join
    await User.updateMany({ _id: { $in: toMove }, tenantId }, { $set: { batchId: target._id, batchJoinedDate: new Date() } });
    await Batch.updateOne({ _id: target._id }, { $set: { updatedAt: new Date() } });
  }

  // Counts as the batch ended: everyone who was in it, with today's statuses; moved students counted once, as moved.
  const after = await User.find({ _id: { $in: [...mine] } }).select('isActive studentStatus placement').lean<any[]>();
  const counts = countsOf(after.filter((s) => !toMove.includes(String(s._id))));
  counts.total = students.length;
  counts.moved = toMove.length;
  counts.placed = after.filter(placedOf).length;

  const discounted = input.discountedCount === null || input.discountedCount === undefined || (input.discountedCount as any) === ''
    ? undefined : Math.max(0, Math.round(Number(input.discountedCount)) || 0);
  const closeReport = {
    closedOn,
    counts,
    movedTo: target ? [{ batchId: target._id, name: target.name, count: toMove.length }] : [],
    discountedCount: discounted,
    notes: String(input.notes || '').trim().slice(0, 4000) || undefined,
  };
  const byId = by && mongoose.isValidObjectId(by) ? new mongoose.Types.ObjectId(by) : undefined;
  await Batch.updateOne({ _id: b._id }, { $set: { isActive: false, closedAt: new Date(), closedBy: byId, closeReport } });
  return { closeReport, completed: toComplete.length, moved: toMove.length };
}

export async function reopenBatch(tenantId: string, batchId: string) {
  const b = await batchOrThrow(tenantId, batchId);
  if (!b.closedAt) throw new LifecycleError('This batch is not closed.');
  // The closing report stays on the batch; closedAt goes, so it shows as open again everywhere.
  await Batch.updateOne({ _id: b._id }, { $set: { isActive: true }, $unset: { closedAt: 1, closedBy: 1 } });
  return { ok: true };
}

/** Closed batches with their closing reports (Batches → Show closed batches). */
export async function closedBatches(tenantId: string) {
  const rows = await Batch.find({ tenantId, closedAt: { $exists: true } })
    .select('name startDate endDate closedAt closedBy closeReport courseId kind')
    .populate('closedBy', 'firstName lastName').populate('courseId', 'title').sort({ closedAt: -1 }).lean<any[]>();
  return rows.map((r) => ({
    _id: String(r._id), name: r.name, startDate: r.startDate, endDate: r.endDate, closedAt: r.closedAt, kind: r.kind,
    course: r.courseId?.title || '', closedBy: r.closedBy ? `${r.closedBy.firstName || ''} ${r.closedBy.lastName || ''}`.trim() : '',
    closeReport: r.closeReport || null,
  }));
}
