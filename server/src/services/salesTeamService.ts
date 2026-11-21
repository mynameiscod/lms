import mongoose from 'mongoose';
import User from '../models/User';
import Role from '../models/Role';
import Lead from '../models/Lead';
import FollowUpReminder from '../models/FollowUpReminder';
import {
  SalesTeam, DailyTeamReport, SalesAssignAlert, DayMetrics, Targets, TARGET_KEYS, RATINGS, Rating,
} from '../models/SalesTeam';
import { createNotifications } from '../notifications/notificationService';
import { istDay, istMinuteOfDay, istRange } from '../utils/istTime';
import { emitToUser } from '../realtime/userSocket';

/**
 * SALES TEAMS — the rules (models/SalesTeam.ts has the shape).
 *
 *   Teams      set up by the super admin (or a role given manage_sales_teams): one manager + members,
 *              one level, a member in one active team; a manager is never a member and vice versa.
 *   Reports    each member's day, counted from the CRM: calls, outcomes, WhatsApp, notes, follow-ups,
 *              stage moves, demos, seats, enrollments, untouched leads, speed to first call.
 *              "Today" is live; at 21:00 IST the day is saved, the manager is told, and at 23:55 the
 *              saved numbers are refreshed quietly so late work still counts. Past days read the saved copy.
 *   Notes      a member may add an end-of-day note (done / blockers / tomorrow), today or yesterday.
 *   Targets    optional daily targets per team, or per member.
 *   Review     the manager marks each report reviewed with a rating and a comment; the member is told.
 *   Alerts     whoever is assigned a lead gets an in-app alert at once (bell + live toast).
 */

export class SalesError extends Error {
  constructor(public http: number, message: string) { super(message); }
}

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const validId = (v: any) => mongoose.Types.ObjectId.isValid(String(v || ''));
const nameOf = (u: any) => [u?.firstName, u?.lastName === '-' ? '' : u?.lastName].filter(Boolean).join(' ').trim() || u?.email || 'User';
const SYSTEM_NOTE = '^(🤖|📞 AI call|📣|⚠️ No call or note)';
const WORK_TYPES = ['call', 'whatsapp', 'email', 'note', 'status_change', 'meeting'];
const OPEN_FOLLOWUP = ['scheduled', 'pending', 'missed'];

export const emptyMetrics = (): DayMetrics => ({
  newAssigned: 0, untouched: 0, leadsWorked: 0, calls: 0, connected: 0, notConnected: 0, talkSeconds: 0,
  whatsapp: 0, notes: 0, emails: 0, stageMoves: 0, followUpsDue: 0, followUpsDone: 0, followUpsMissed: 0,
  overdueNow: 0, demos: 0, seats: 0, enrollments: 0, avgFirstCallMin: null,
});

/* ═══════════════════════════════ Who is looking ═══════════════════════════════ */

export interface Viewer {
  userId: string;
  tenantId: string;
  isAdmin: boolean;
}

export async function managedTeams(tenantId: string, userId: string) {
  return SalesTeam.find({ tenantId: oid(tenantId), managerId: oid(userId), active: true }).lean();
}

export async function memberTeam(tenantId: string, userId: string) {
  return SalesTeam.findOne({ tenantId: oid(tenantId), memberIds: oid(userId), active: true }).lean();
}

/** The ids whose leads a manager sees as well as their own (middleware/leadScope.ts). */
export async function managedMemberIds(tenantId: string, userId: string): Promise<mongoose.Types.ObjectId[]> {
  if (!validId(tenantId) || !validId(userId)) return [];
  const teams = await SalesTeam.find({ tenantId: oid(tenantId), managerId: oid(userId), active: true }).select('memberIds').lean();
  return teams.flatMap((t: any) => t.memberIds || []);
}

async function teamForView(viewer: Viewer, teamId: string) {
  if (!validId(teamId)) throw new SalesError(404, 'Team not found.');
  const team: any = await SalesTeam.findOne({ _id: oid(teamId), tenantId: oid(viewer.tenantId), active: true }).lean();
  if (!team) throw new SalesError(404, 'Team not found.');
  if (!viewer.isAdmin && String(team.managerId) !== viewer.userId) throw new SalesError(403, 'Only this team\'s manager can see it.');
  return team;
}

/** A member's report can be opened by the member, their manager, or an admin. */
async function memberForView(viewer: Viewer, memberId: string) {
  if (!validId(memberId)) throw new SalesError(404, 'Member not found.');
  const team: any = await memberTeam(viewer.tenantId, memberId);
  if (viewer.userId === memberId || viewer.isAdmin) return team;
  if (team && String(team.managerId) === viewer.userId) return team;
  throw new SalesError(403, 'You can only see the reports of your own team.');
}

/* ═══════════════════════════════ Staff and teams (admin) ═══════════════════════════════ */

/** Everyone who can be a manager or a member: staff of any role, active, not a demo account. */
export async function staffOptions(tenantId: string) {
  const users: any[] = await User.find({
    tenantId: oid(tenantId), isActive: { $ne: false }, 'lmsDemo.at': { $exists: false },
    $or: [{ role: { $in: ['TENANT_ADMIN', 'STAFF', 'INSTRUCTOR'] } }, { customRoleId: { $ne: null } }],
  }).select('firstName lastName email role customRoleId').sort({ firstName: 1 }).limit(2000).lean();
  const roleIds = [...new Set(users.map((u) => u.customRoleId).filter(Boolean).map(String))];
  const roles: any[] = roleIds.length ? await Role.find({ _id: { $in: roleIds.map(oid) } }).select('name').lean() : [];
  const roleName = new Map(roles.map((r) => [String(r._id), r.name]));
  const teams: any[] = await SalesTeam.find({ tenantId: oid(tenantId), active: true }).select('name managerId memberIds').lean();
  const inTeam = new Map<string, { teamId: string; team: string; as: 'manager' | 'member' }>();
  for (const t of teams) {
    inTeam.set(String(t.managerId), { teamId: String(t._id), team: t.name, as: 'manager' });
    for (const m of t.memberIds || []) inTeam.set(String(m), { teamId: String(t._id), team: t.name, as: 'member' });
  }
  return users.map((u) => ({
    _id: String(u._id),
    name: nameOf(u),
    email: u.email,
    role: u.customRoleId ? roleName.get(String(u.customRoleId)) || 'Custom role' : String(u.role).replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
    team: inTeam.get(String(u._id)) || null,
  }));
}

async function userCards(ids: any[]) {
  const users: any[] = ids.length ? await User.find({ _id: { $in: ids.map(oid) } }).select('firstName lastName email role customRoleId').lean() : [];
  return new Map(users.map((u) => [String(u._id), { _id: String(u._id), name: nameOf(u), email: u.email }]));
}

export async function listTeams(tenantId: string) {
  const teams: any[] = await SalesTeam.find({ tenantId: oid(tenantId), active: true }).sort({ name: 1 }).lean();
  const cards = await userCards(teams.flatMap((t) => [t.managerId, ...(t.memberIds || [])]));
  return teams.map((t) => ({
    _id: String(t._id), name: t.name, color: t.color,
    manager: cards.get(String(t.managerId)) || { _id: String(t.managerId), name: 'Removed user' },
    members: (t.memberIds || []).map((m: any) => cards.get(String(m)) || { _id: String(m), name: 'Removed user' }),
    defaultTargets: t.defaultTargets || null,
    memberTargets: (t.memberTargets || []).map((x: any) => ({ userId: String(x.userId), targets: x.targets })),
  }));
}

const COLORS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737', '#0B6E99', '#9C27B0'];

export async function saveTeam(tenantId: string, body: any, byId: string, teamId?: string) {
  const t = oid(tenantId);
  const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (name.length < 2) throw new SalesError(400, 'Give the team a name.');
  if (!validId(body.managerId)) throw new SalesError(400, 'Choose a manager.');
  const managerId = String(body.managerId);
  const memberIds = [...new Set((Array.isArray(body.memberIds) ? body.memberIds : []).map(String))].filter(validId) as string[];
  if (!memberIds.length) throw new SalesError(400, 'Add at least one member.');
  if (memberIds.includes(managerId)) throw new SalesError(400, 'The manager cannot also be a member of the team.');

  const staff = new Map((await staffOptions(tenantId)).map((s) => [s._id, s]));
  for (const id of [managerId, ...memberIds]) {
    if (!staff.has(id)) throw new SalesError(400, 'Only active staff of this institute can be in a team.');
  }
  // One level: a manager is never a member anywhere, a member never a manager, and a member is in one team.
  const others: any[] = await SalesTeam.find({ tenantId: t, active: true, ...(teamId ? { _id: { $ne: oid(teamId) } } : {}) }).select('name managerId memberIds').lean();
  for (const o of others) {
    const oMembers = (o.memberIds || []).map(String);
    if (oMembers.includes(managerId)) throw new SalesError(409, `${staff.get(managerId)!.name} is a member of ${o.name}, so cannot manage a team. A team is one level.`);
    for (const m of memberIds) {
      if (oMembers.includes(m)) throw new SalesError(409, `${staff.get(m)!.name} is already in ${o.name}. Remove them there first.`);
      if (String(o.managerId) === m) throw new SalesError(409, `${staff.get(m)!.name} manages ${o.name}, so cannot be a member. A team is one level.`);
    }
  }
  const color = typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : undefined;
  if (teamId) {
    const team = await SalesTeam.findOneAndUpdate(
      { _id: oid(teamId), tenantId: t, active: true },
      { $set: { name, managerId: oid(managerId), memberIds: memberIds.map(oid), ...(color ? { color } : {}) } },
      { new: true },
    );
    if (!team) throw new SalesError(404, 'Team not found.');
    return team;
  }
  const count = await SalesTeam.countDocuments({ tenantId: t });
  return SalesTeam.create({ tenantId: t, name, managerId: oid(managerId), memberIds: memberIds.map(oid), color: color || COLORS[count % COLORS.length], createdBy: byId ? oid(byId) : undefined });
}

export async function removeTeam(tenantId: string, teamId: string) {
  if (!validId(teamId)) throw new SalesError(404, 'Team not found.');
  // Kept, not deleted: the saved daily reports still point at it.
  const r = await SalesTeam.updateOne({ _id: oid(teamId), tenantId: oid(tenantId), active: true }, { $set: { active: false } });
  if (!r.modifiedCount) throw new SalesError(404, 'Team not found.');
}

/* ═══════════════════════════════ Targets ═══════════════════════════════ */

function cleanTargets(raw: any): Targets | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Targets = {};
  for (const k of TARGET_KEYS) {
    const v = raw[k];
    if (v === '' || v === null || v === undefined) continue;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 0 || n > 1000) throw new SalesError(400, 'A target must be a number from 0 to 1000.');
    out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

export function targetsFor(team: any, userId: string): Targets | undefined {
  const own = (team?.memberTargets || []).find((x: any) => String(x.userId) === String(userId));
  return (own?.targets && Object.keys(own.targets).length ? own.targets : team?.defaultTargets) || undefined;
}

export async function saveTargets(viewer: Viewer, teamId: string, body: any) {
  const team: any = await teamForView(viewer, teamId);
  const set: any = {};
  const unset: any = {};
  if ('defaultTargets' in body) {
    const d = cleanTargets(body.defaultTargets);
    if (d) set.defaultTargets = d; else unset.defaultTargets = 1;
  }
  if (Array.isArray(body.memberTargets)) {
    const members = new Set((team.memberIds || []).map(String));
    set.memberTargets = body.memberTargets
      .filter((x: any) => members.has(String(x?.userId)))
      .map((x: any) => ({ userId: oid(x.userId), targets: cleanTargets(x.targets) }))
      .filter((x: any) => x.targets);
  }
  await SalesTeam.updateOne({ _id: team._id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  return SalesTeam.findById(team._id).lean();
}

/* ═══════════════════════════════ Counting a day ═══════════════════════════════ */

/** Every member's numbers for one IST day (or the part of it so far). */
export async function computeMetrics(tenantId: string, userIds: string[], day: string, now = new Date()): Promise<Map<string, DayMetrics>> {
  const out = new Map<string, DayMetrics>(userIds.map((id) => [id, emptyMetrics()]));
  if (!userIds.length) return out;
  const t = oid(tenantId);
  const ids = userIds.map(oid);
  const { start, end } = istRange(day, day);
  const cutoff = now < end ? now : end;

  const [acts, assigned, fus, miles] = await Promise.all([
    Lead.aggregate([
      { $match: { tenantId: t, activities: { $elemMatch: { createdBy: { $in: ids }, createdAt: { $gte: start, $lte: end } } } } },
      { $project: { activities: 1 } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdBy': { $in: ids }, 'activities.createdAt': { $gte: start, $lte: end } } },
      { $addFields: {
        a: '$activities',
        sys: { $regexMatch: { input: { $ifNull: ['$activities.description', ''] }, regex: SYSTEM_NOTE } },
      } },
      { $group: {
        _id: '$a.createdBy',
        calls: { $sum: { $cond: [{ $eq: ['$a.type', 'call'] }, 1, 0] } },
        connected: { $sum: { $cond: [{ $and: [{ $eq: ['$a.type', 'call'] }, { $eq: ['$a.callOutcome', 'connected'] }] }, 1, 0] } },
        notConnected: { $sum: { $cond: [{ $and: [{ $eq: ['$a.type', 'call'] }, { $gt: [{ $strLenCP: { $ifNull: ['$a.callOutcome', ''] } }, 0] }, { $ne: ['$a.callOutcome', 'connected'] }] }, 1, 0] } },
        talkSeconds: { $sum: { $cond: [{ $eq: ['$a.type', 'call'] }, { $ifNull: ['$a.callDuration', 0] }, 0] } },
        whatsapp: { $sum: { $cond: [{ $eq: ['$a.type', 'whatsapp'] }, 1, 0] } },
        emails: { $sum: { $cond: [{ $eq: ['$a.type', 'email'] }, 1, 0] } },
        notes: { $sum: { $cond: [{ $and: [{ $eq: ['$a.type', 'note'] }, { $not: ['$sys'] }] }, 1, 0] } },
        stageMoves: { $sum: { $cond: [{ $eq: ['$a.type', 'status_change'] }, 1, 0] } },
        worked: { $addToSet: { $cond: [{ $and: [{ $in: ['$a.type', WORK_TYPES] }, { $not: ['$sys'] }] }, '$_id', null] } },
      } },
    ]),
    Lead.find({ tenantId: t, assignedTo: { $in: ids }, 'assignment.assignedAt': { $gte: start, $lte: end } })
      .select('assignedTo assignment.assignedAt activities.type activities.createdBy activities.createdAt activities.description').lean(),
    FollowUpReminder.aggregate([
      { $match: { tenantId: t, assignedTo: { $in: ids }, $or: [{ scheduledAt: { $lte: end } }, { completedAt: { $gte: start, $lte: end } }] } },
      { $group: {
        _id: '$assignedTo',
        due: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', start] }, { $lte: ['$scheduledAt', end] }, { $ne: ['$status', 'cancelled'] }] }, 1, 0] } },
        done: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$completedAt', start] }, { $lte: ['$completedAt', end] }] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', start] }, { $lt: ['$scheduledAt', cutoff] }, { $in: ['$status', OPEN_FOLLOWUP] }] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $lt: ['$scheduledAt', cutoff] }, { $in: ['$status', OPEN_FOLLOWUP] }] }, 1, 0] } },
      } },
    ]),
    Lead.aggregate([
      { $match: { tenantId: t, assignedTo: { $in: ids }, $or: [
        { 'milestones.demoAt': { $gte: start, $lte: end } },
        { 'milestones.seatReservedAt': { $gte: start, $lte: end } },
        { 'milestones.enrolledAt': { $gte: start, $lte: end } },
      ] } },
      { $group: {
        _id: '$assignedTo',
        demos: { $sum: { $cond: [{ $and: [{ $gte: ['$milestones.demoAt', start] }, { $lte: ['$milestones.demoAt', end] }] }, 1, 0] } },
        seats: { $sum: { $cond: [{ $and: [{ $gte: ['$milestones.seatReservedAt', start] }, { $lte: ['$milestones.seatReservedAt', end] }] }, 1, 0] } },
        enrollments: { $sum: { $cond: [{ $and: [{ $gte: ['$milestones.enrolledAt', start] }, { $lte: ['$milestones.enrolledAt', end] }] }, 1, 0] } },
      } },
    ]),
  ]);

  for (const a of acts) {
    const m = out.get(String(a._id));
    if (!m) continue;
    Object.assign(m, {
      calls: a.calls, connected: a.connected, notConnected: a.notConnected, talkSeconds: Math.round(a.talkSeconds || 0),
      whatsapp: a.whatsapp, emails: a.emails, notes: a.notes, stageMoves: a.stageMoves,
      leadsWorked: (a.worked || []).filter(Boolean).length,
    });
  }
  const sysRe = new RegExp(SYSTEM_NOTE);
  const firstCalls = new Map<string, number[]>();
  for (const l of assigned as any[]) {
    const uid = String(l.assignedTo);
    const m = out.get(uid);
    if (!m) continue;
    m.newAssigned++;
    const since = new Date(l.assignment.assignedAt).getTime();
    const mine = (l.activities || []).filter((x: any) => String(x.createdBy) === uid && new Date(x.createdAt).getTime() >= since && new Date(x.createdAt) <= cutoff);
    if (!mine.some((x: any) => WORK_TYPES.includes(x.type) && !sysRe.test(x.description || ''))) m.untouched++;
    const call = mine.filter((x: any) => x.type === 'call').sort((x: any, y: any) => +new Date(x.createdAt) - +new Date(y.createdAt))[0];
    if (call) {
      const arr = firstCalls.get(uid) || [];
      arr.push((new Date(call.createdAt).getTime() - since) / 60000);
      firstCalls.set(uid, arr);
    }
  }
  for (const [uid, arr] of firstCalls) {
    const m = out.get(uid);
    if (m && arr.length) m.avgFirstCallMin = Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
  }
  for (const f of fus) {
    const m = out.get(String(f._id));
    if (m) Object.assign(m, { followUpsDue: f.due, followUpsDone: f.done, followUpsMissed: f.missed, overdueNow: f.overdue });
  }
  for (const x of miles) {
    const m = out.get(String(x._id));
    if (m) Object.assign(m, { demos: x.demos, seats: x.seats, enrollments: x.enrollments });
  }
  return out;
}

/** Saved numbers for past days; live numbers for today (and for a past day that was never saved). */
async function metricsForDay(tenantId: string, userIds: string[], day: string) {
  const today = istDay();
  const saved = day < today
    ? await DailyTeamReport.find({ tenantId: oid(tenantId), day, userId: { $in: userIds.map(oid) }, generatedAt: { $exists: true } }).lean()
    : [];
  const savedBy = new Map(saved.map((r: any) => [String(r.userId), r.metrics as DayMetrics]));
  const missing = userIds.filter((id) => !savedBy.has(id));
  const live = missing.length && day <= today ? await computeMetrics(tenantId, missing, day) : new Map<string, DayMetrics>();
  const out = new Map<string, DayMetrics>();
  for (const id of userIds) out.set(id, savedBy.get(id) || live.get(id) || emptyMetrics());
  return { metrics: out, live: day === today };
}

/* ═══════════════════════════════ Views ═══════════════════════════════ */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const pickDay = (d?: any) => {
  const today = istDay();
  const day = typeof d === 'string' && DAY_RE.test(d) ? d : today;
  if (day > today) throw new SalesError(400, 'That day has not happened yet.');
  return day;
};
const shiftDay = (day: string, n: number) => istDay(new Date(new Date(`${day}T12:00:00+05:30`).getTime() + n * 86400000));

function reviewView(r: any) {
  return r?.review?.status === 'reviewed'
    ? { status: 'reviewed', rating: r.review.rating || null, comment: r.review.comment || '', byName: r.review.byName || '', at: r.review.at }
    : { status: 'pending' };
}
const hasNote = (r: any) => !!(r?.note && (r.note.done || r.note.blockers || r.note.tomorrow));
/** Review opens once the day is saved at 9 PM (or for any earlier day). */
const reviewOpen = (day: string) => day < istDay() || istMinuteOfDay() >= 21 * 60;

export async function teamDay(viewer: Viewer, teamId: string, dayRaw?: string) {
  const team: any = await teamForView(viewer, teamId);
  const day = pickDay(dayRaw);
  const memberIds = (team.memberIds || []).map(String);
  const [{ metrics, live }, reports, cards, pending] = await Promise.all([
    metricsForDay(viewer.tenantId, memberIds, day),
    DailyTeamReport.find({ tenantId: oid(viewer.tenantId), day, userId: { $in: memberIds.map(oid) } }).lean(),
    userCards([team.managerId, ...memberIds]),
    pendingReviews(viewer.tenantId, team),
  ]);
  const repBy = new Map(reports.map((r: any) => [String(r.userId), r]));
  const members = memberIds.map((id: string) => {
    const r: any = repBy.get(id);
    return {
      user: cards.get(id) || { _id: id, name: 'Removed user' },
      metrics: metrics.get(id),
      targets: (day < istDay() && r?.targets) || targetsFor(team, id) || null,
      hasNote: hasNote(r),
      review: reviewView(r),
    };
  });
  const totals = emptyMetrics();
  for (const m of members) for (const k of Object.keys(totals) as (keyof DayMetrics)[]) {
    if (k === 'avgFirstCallMin') continue;
    (totals as any)[k] += (m.metrics as any)?.[k] || 0;
  }
  const speeds = members.map((m) => m.metrics?.avgFirstCallMin).filter((x): x is number => typeof x === 'number');
  totals.avgFirstCallMin = speeds.length ? Math.round(speeds.reduce((s, x) => s + x, 0) / speeds.length) : null;
  return {
    team: { _id: String(team._id), name: team.name, color: team.color, manager: cards.get(String(team.managerId)), defaultTargets: team.defaultTargets || null },
    day, today: istDay(), live, reviewOpen: reviewOpen(day),
    totals, members, pending,
  };
}

/** Saved reports of past days the manager has not reviewed yet (last 14 days). */
async function pendingReviews(tenantId: string, team: any) {
  const today = istDay();
  const rows: any[] = await DailyTeamReport.find({
    tenantId: oid(tenantId), teamId: team._id, 'review.status': 'pending', generatedAt: { $exists: true },
    day: { $gte: shiftDay(today, -14), $lte: today }, userId: { $in: team.memberIds || [] },
  }).select('day userId').sort({ day: -1 }).lean();
  const filtered = rows.filter((r) => r.day < today || reviewOpen(r.day));
  return { count: filtered.length, days: [...new Set(filtered.map((r) => r.day))] };
}

export async function memberDay(viewer: Viewer, memberId: string, dayRaw?: string) {
  const team: any = await memberForView(viewer, memberId);
  const day = pickDay(dayRaw);
  const t = oid(viewer.tenantId);
  const uid = oid(memberId);
  const { start, end } = istRange(day, day);
  const now = new Date();
  const cutoff = now < end ? now : end;
  const trendDays = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 6));

  const [{ metrics, live }, report, cards, timeline, followUps, trendSaved] = await Promise.all([
    metricsForDay(viewer.tenantId, [memberId], day),
    DailyTeamReport.findOne({ tenantId: t, day, userId: uid }).lean(),
    userCards([memberId, ...(team ? [team.managerId] : [])]),
    Lead.aggregate([
      { $match: { tenantId: t, activities: { $elemMatch: { createdBy: uid, createdAt: { $gte: start, $lte: end } } } } },
      { $project: { name: 1, phone: 1, activities: 1 } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdBy': uid, 'activities.createdAt': { $gte: start, $lte: end } } },
      { $sort: { 'activities.createdAt': -1 } },
      { $limit: 300 },
      { $project: { _id: 0, leadId: '$_id', leadName: '$name', phone: '$phone', type: '$activities.type', description: '$activities.description', callOutcome: '$activities.callOutcome', callDuration: '$activities.callDuration', at: '$activities.createdAt' } },
    ]),
    FollowUpReminder.find({ tenantId: t, assignedTo: uid, status: { $in: OPEN_FOLLOWUP }, scheduledAt: { $lt: cutoff } })
      .sort({ scheduledAt: 1 }).limit(50).select('leadId title scheduledAt status').populate('leadId', 'name phone').lean(),
    DailyTeamReport.find({ tenantId: t, userId: uid, day: { $in: trendDays }, generatedAt: { $exists: true } }).select('day metrics').lean(),
  ]);
  const trendBy = new Map(trendSaved.map((r: any) => [r.day, r.metrics]));
  if (trendDays.includes(istDay())) trendBy.set(istDay(), live ? metrics.get(memberId) : (await computeMetrics(viewer.tenantId, [memberId], istDay())).get(memberId));
  const leadsWorked = new Map<string, { leadId: string; name: string; phone: string; actions: number; last: Date }>();
  for (const a of timeline as any[]) {
    const k = String(a.leadId);
    const cur = leadsWorked.get(k) || { leadId: k, name: a.leadName, phone: a.phone, actions: 0, last: a.at };
    cur.actions++;
    leadsWorked.set(k, cur);
  }
  const r: any = report;
  return {
    user: cards.get(memberId),
    team: team ? { _id: String(team._id), name: team.name, color: team.color, manager: cards.get(String(team.managerId)) } : null,
    canReview: !!team && (viewer.isAdmin || String(team.managerId) === viewer.userId) && viewer.userId !== memberId,
    isSelf: viewer.userId === memberId,
    day, today: istDay(), live, reviewOpen: reviewOpen(day),
    metrics: metrics.get(memberId),
    targets: (day < istDay() && r?.targets) || (team ? targetsFor(team, memberId) : null) || null,
    note: r?.note && hasNote(r) ? { done: r.note.done || '', blockers: r.note.blockers || '', tomorrow: r.note.tomorrow || '', at: r.note.at } : null,
    noteEditable: viewer.userId === memberId && !!team && day >= shiftDay(istDay(), -1) && r?.review?.status !== 'reviewed',
    review: reviewView(r),
    timeline,
    leadsWorked: [...leadsWorked.values()],
    openFollowUps: followUps.map((f: any) => ({ _id: String(f._id), title: f.title, scheduledAt: f.scheduledAt, status: f.status, lead: f.leadId ? { _id: String(f.leadId._id), name: f.leadId.name, phone: f.leadId.phone } : null })),
    trend: trendDays.map((d) => ({ day: d, metrics: trendBy.get(d) || null })),
  };
}

/** The member's own recent days, with what the manager said. */
export async function myHistory(viewer: Viewer) {
  const rows: any[] = await DailyTeamReport.find({ tenantId: oid(viewer.tenantId), userId: oid(viewer.userId), day: { $gte: shiftDay(istDay(), -30) } })
    .sort({ day: -1 }).limit(30).lean();
  return rows.map((r) => ({ day: r.day, metrics: r.metrics || null, targets: r.targets || null, hasNote: hasNote(r), review: reviewView(r) }));
}

/* ═══════════════════════════════ Notes and reviews ═══════════════════════════════ */

export async function saveNote(viewer: Viewer, body: any) {
  const team: any = await memberTeam(viewer.tenantId, viewer.userId);
  if (!team) throw new SalesError(403, 'You are not in a sales team yet.');
  const day = pickDay(body.day);
  if (day < shiftDay(istDay(), -1)) throw new SalesError(400, 'You can write the note for today or yesterday only.');
  const clip = (v: any) => String(v || '').trim().slice(0, 2000);
  const note = { done: clip(body.done), blockers: clip(body.blockers), tomorrow: clip(body.tomorrow), at: new Date() };
  if (!note.done && !note.blockers && !note.tomorrow) throw new SalesError(400, 'Write at least one line.');
  const existing: any = await DailyTeamReport.findOne({ tenantId: oid(viewer.tenantId), userId: oid(viewer.userId), day }).select('review').lean();
  if (existing?.review?.status === 'reviewed') throw new SalesError(409, 'Your manager has already reviewed this day, so the note is locked.');
  await DailyTeamReport.updateOne(
    { tenantId: oid(viewer.tenantId), userId: oid(viewer.userId), day },
    { $set: { note }, $setOnInsert: { teamId: team._id, managerId: team.managerId, review: { status: 'pending' } } },
    { upsert: true },
  );
  return note;
}

export async function reviewMember(viewer: Viewer, memberId: string, body: any) {
  const team: any = await memberForView(viewer, memberId);
  if (!team) throw new SalesError(400, 'This person is not in a team.');
  if (viewer.userId === memberId) throw new SalesError(403, 'You cannot review your own report.');
  if (!viewer.isAdmin && String(team.managerId) !== viewer.userId) throw new SalesError(403, 'Only their manager can review this report.');
  const day = pickDay(body.day);
  if (!reviewOpen(day)) throw new SalesError(400, 'Today\'s report can be reviewed from 9 PM, once the day is saved.');
  const rating: Rating | undefined = (RATINGS as readonly string[]).includes(body.rating) ? body.rating : undefined;
  if (!rating) throw new SalesError(400, 'Choose a rating.');
  const comment = String(body.comment || '').trim().slice(0, 1000);
  const by: any = await User.findById(viewer.userId).select('firstName lastName email').lean();
  const t = oid(viewer.tenantId);
  // A day that was never saved (no 9 PM run yet for it) is saved now, so the review sits on real numbers.
  const exists: any = await DailyTeamReport.findOne({ tenantId: t, userId: oid(memberId), day }).select('generatedAt').lean();
  const set: any = { review: { status: 'reviewed', rating, comment, by: oid(viewer.userId), byName: nameOf(by), at: new Date() } };
  if (!exists?.generatedAt) {
    set.metrics = (await computeMetrics(viewer.tenantId, [memberId], day)).get(memberId);
    set.targets = targetsFor(team, memberId);
    set.generatedAt = new Date();
  }
  await DailyTeamReport.updateOne(
    { tenantId: t, userId: oid(memberId), day },
    { $set: set, $setOnInsert: { teamId: team._id, managerId: team.managerId } },
    { upsert: true },
  );
  const label = rating === 'good' ? 'Good' : rating === 'ok' ? 'OK' : 'Needs work';
  notify(viewer.tenantId, [memberId], `📝 Your report was reviewed: ${label}`, `${nameOf(by)} reviewed your day (${day})${comment ? `: "${comment.slice(0, 140)}"` : '.'}`, `/my-day?day=${day}`);
  return set.review;
}

/* ═══════════════════════════════ Admin overview ═══════════════════════════════ */

export async function overview(tenantId: string, dayRaw?: string) {
  const day = pickDay(dayRaw);
  const teams: any[] = await SalesTeam.find({ tenantId: oid(tenantId), active: true }).sort({ name: 1 }).lean();
  const allMembers = teams.flatMap((t) => (t.memberIds || []).map(String));
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 6));
  const [{ metrics, live }, cards, reviews] = await Promise.all([
    metricsForDay(tenantId, allMembers, day),
    userCards(teams.flatMap((t) => [t.managerId, ...(t.memberIds || [])])),
    DailyTeamReport.find({ tenantId: oid(tenantId), day: { $in: last7 }, userId: { $in: allMembers.map(oid) } }).select('day userId teamId review.status generatedAt').lean(),
  ]);
  const today = istDay();
  return {
    day, today, live,
    teams: teams.map((t) => {
      const ids = (t.memberIds || []).map(String);
      const totals = emptyMetrics();
      for (const id of ids) {
        const m: any = metrics.get(id);
        for (const k of Object.keys(totals) as (keyof DayMetrics)[]) if (k !== 'avgFirstCallMin') (totals as any)[k] += m?.[k] || 0;
      }
      const reviewGrid = last7.map((d) => {
        const rows = reviews.filter((r: any) => String(r.teamId) === String(t._id) && r.day === d && ids.includes(String(r.userId)));
        const reviewed = rows.filter((r: any) => r.review?.status === 'reviewed').length;
        const due = d < today || (d === today && reviewOpen(d)) ? ids.length : 0;
        return { day: d, reviewed, due };
      });
      return {
        _id: String(t._id), name: t.name, color: t.color,
        manager: cards.get(String(t.managerId)) || { _id: String(t.managerId), name: 'Removed user' },
        members: ids.map((id: string) => ({ user: cards.get(id) || { _id: id, name: 'Removed user' }, metrics: metrics.get(id) })),
        totals, reviewGrid,
      };
    }),
  };
}

/* ═══════════════════════════════ The 9 PM run ═══════════════════════════════ */

function notify(tenantId: string, userIds: string[], title: string, body: string, link: string) {
  if (!userIds.length) return;
  createNotifications(String(tenantId), userIds, 'general', title, body, link).catch((e: any) => console.error('[sales-teams] notify failed', e?.message));
  for (const u of userIds) emitToUser(u, 'notifications:new', { title });
}

/** Save every member's numbers for the day. With `announce`, tell each manager their reports are ready. */
export async function snapshotDay(day: string, opts: { announce: boolean }) {
  const teams: any[] = await SalesTeam.find({ active: true }).lean();
  let saved = 0;
  for (const team of teams) {
    try {
      const ids = (team.memberIds || []).map(String);
      if (!ids.length) continue;
      const metrics = await computeMetrics(String(team.tenantId), ids, day);
      for (const id of ids) {
        await DailyTeamReport.updateOne(
          { tenantId: team.tenantId, userId: oid(id), day },
          {
            $set: { metrics: metrics.get(id), targets: targetsFor(team, id), generatedAt: new Date(), teamId: team._id, managerId: team.managerId },
            $setOnInsert: { review: { status: 'pending' } },
          },
          { upsert: true },
        );
        saved++;
      }
      if (opts.announce) {
        notify(String(team.tenantId), [String(team.managerId)], `📊 ${team.name}: today's reports are ready`, `${ids.length} report${ids.length === 1 ? '' : 's'} to review for ${day}.`, `/my-team?team=${team._id}&day=${day}`);
      }
    } catch (e: any) {
      console.error('[sales-teams] snapshot failed for team', String(team._id), e?.message);
    }
  }
  return saved;
}

/** Morning nudge: yesterday's reports still waiting for review. */
export async function remindPendingReviews(day: string) {
  const rows: any[] = await DailyTeamReport.aggregate([
    { $match: { day, 'review.status': 'pending', generatedAt: { $exists: true } } },
    { $group: { _id: { tenantId: '$tenantId', managerId: '$managerId', teamId: '$teamId' }, n: { $sum: 1 } } },
  ]);
  for (const r of rows) {
    notify(String(r._id.tenantId), [String(r._id.managerId)], '⏰ Reports waiting for your review', `${r.n} report${r.n === 1 ? '' : 's'} from ${day} not reviewed yet.`, `/my-team?team=${r._id.teamId}&day=${day}`);
  }
  return rows.length;
}

/* ═══════════════════════════════ "A lead was assigned to you" ═══════════════════════════════ */

/** Alerts every assignment of the last few minutes once (any instance, any number of runs). */
export async function alertNewAssignments(now = new Date()) {
  const since = new Date(now.getTime() - 10 * 60_000);
  const leads: any[] = await Lead.find({ 'assignment.assignedAt': { $gte: since }, assignedTo: { $ne: null }, archivedAt: null })
    .select('tenantId name assignedTo assignment.assignedAt assignment.assignedBy').limit(500).lean();
  const byUser = new Map<string, { tenantId: string; leads: { _id: string; name: string }[] }>();
  for (const l of leads) {
    if (!l.assignment?.assignedAt) continue;
    // Someone who took a lead themselves needs no alert.
    if (l.assignment.assignedBy && String(l.assignment.assignedBy) === String(l.assignedTo)) continue;
    try {
      await SalesAssignAlert.create({ leadId: l._id, assignedAt: l.assignment.assignedAt });
    } catch (e: any) {
      if (e?.code === 11000) continue; // already alerted
      throw e;
    }
    const k = String(l.assignedTo);
    const cur = byUser.get(k) || { tenantId: String(l.tenantId), leads: [] };
    cur.leads.push({ _id: String(l._id), name: l.name || 'New lead' });
    byUser.set(k, cur);
  }
  for (const [userId, v] of byUser) {
    const one = v.leads.length === 1;
    const title = one ? `📞 New lead assigned: ${v.leads[0].name}` : `📞 ${v.leads.length} new leads assigned to you`;
    const body = one ? 'Call them now and log the call on the lead.' : `${v.leads.slice(0, 3).map((x) => x.name).join(', ')}${v.leads.length > 3 ? '…' : ''}. Call them now.`;
    const link = one ? `/leads/${v.leads[0]._id}` : '/follow-up-queue';
    createNotifications(v.tenantId, [userId], 'general', title, body, link).catch((e: any) => console.error('[sales-teams] assign alert failed', e?.message));
    emitToUser(userId, 'lead:assigned', { title, body, link, count: v.leads.length });
  }
  return byUser.size;
}

/* ═══════════════════════════════ Scheduler ═══════════════════════════════ */

/** Claims a run once across every API instance. */
async function claim(key: string) {
  try {
    await mongoose.connection.collection('salesjobruns').insertOne({ _id: key as any, at: new Date() });
    return true;
  } catch (e: any) {
    if (e?.code === 11000) return false;
    throw e;
  }
}

export function startSalesTeamScheduler() {
  const tick = async () => {
    try {
      await alertNewAssignments();
      const day = istDay();
      const min = istMinuteOfDay();
      if (min >= 21 * 60 && min < 21 * 60 + 30 && await claim(`snapshot:${day}`)) {
        const n = await snapshotDay(day, { announce: true });
        console.log(`📊 Sales teams: saved ${n} daily report(s) for ${day}`);
      }
      if (min >= 23 * 60 + 55 && await claim(`refresh:${day}`)) await snapshotDay(day, { announce: false });
      if (min >= 10 * 60 && min < 10 * 60 + 30 && await claim(`remind:${day}`)) await remindPendingReviews(shiftDay(day, -1));
    } catch (e: any) {
      console.error('[sales-teams] tick failed', e?.message);
    }
  };
  const h = setInterval(tick, 60 * 1000);
  h.unref?.();
  setTimeout(tick, 20 * 1000).unref?.();
  console.log('📊 Sales teams scheduler started (alerts every minute, reports 9 PM IST)');
  return h;
}
