import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import FollowUpReminder from '../models/FollowUpReminder';
import StaffPresence from '../models/StaffPresence';
import { istRange, istDay } from '../utils/istTime';

/**
 * The Team Activity report: what each person did, how long they were actually working in the app, which of their
 * leads nobody has touched, and which follow-ups slipped. Calls and WhatsApp are counted from button presses (a
 * press is one call), completed in place when the person records the outcome, so nothing is counted twice.
 * Everything is derived from data already stored; nothing here writes.
 */

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const NOT_REACHED = ['not_answered', 'not_connected', 'busy', 'rejected', 'wrong_number', 'switched_off'];
/** Hours of the working day, used to show how much of it a person was active. */
export const WORK_DAY = { startHour: 10, endHour: 19 };
/** Activity types that count as working a lead (system entries such as "created" or "assignment" do not). */
const WORK_TYPES = ['call', 'whatsapp', 'note', 'email', 'status_change', 'stage_change', 'meeting'];

const isCall = { $eq: ['$activities.type', 'call'] };

export async function teamOverview(tenantId: string, from?: string, to?: string) {
  const tid = oid(tenantId);
  const { start, end, fromDay, toDay } = istRange(from, to);
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 24 * 3600 * 1000);

  const closedStages = await LeadStage.distinct('_id', { tenantId: tid, category: { $in: ['converted', 'lost'] } });

  const [acts, presence, coverage, fuRange, fuOverdue, speed] = await Promise.all([
    Lead.aggregate([
      { $match: { tenantId: tid, 'activities.createdAt': { $gte: start, $lte: end } } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdAt': { $gte: start, $lte: end }, 'activities.createdBy': { $ne: null } } },
      {
        $group: {
          _id: '$activities.createdBy',
          total: { $sum: 1 },
          calls: { $sum: { $cond: [isCall, 1, 0] } },
          callsWithOutcome: { $sum: { $cond: [{ $and: [isCall, { $ne: [{ $ifNull: ['$activities.callOutcome', null] }, null] }] }, 1, 0] } },
          connected: { $sum: { $cond: [{ $and: [isCall, { $eq: ['$activities.callOutcome', 'connected'] }] }, 1, 0] } },
          notReached: { $sum: { $cond: [{ $and: [isCall, { $in: ['$activities.callOutcome', NOT_REACHED] }] }, 1, 0] } },
          pendingOutcome: { $sum: { $cond: [{ $and: [isCall, { $eq: ['$activities.metadata.dialed', true] }] }, 1, 0] } },
          whatsapp: { $sum: { $cond: [{ $eq: ['$activities.type', 'whatsapp'] }, 1, 0] } },
          note: { $sum: { $cond: [{ $eq: ['$activities.type', 'note'] }, 1, 0] } },
          email: { $sum: { $cond: [{ $eq: ['$activities.type', 'email'] }, 1, 0] } },
          stageMoves: { $sum: { $cond: [{ $in: ['$activities.type', ['status_change', 'stage_change']] }, 1, 0] } },
          leads: { $addToSet: '$_id' },
          callLeads: { $addToSet: { $cond: [isCall, '$_id', null] } },
          firstAt: { $min: '$activities.createdAt' },
          lastAt: { $max: '$activities.createdAt' },
        },
      },
    ]),
    StaffPresence.find({ tenantId: tid, day: { $gte: fromDay, $lte: toDay } }).select('userId day activeSeconds firstSeenAt lastSeenAt').lean(),
    // The state right now, not in the range: who is sitting on leads nobody has worked.
    Lead.aggregate([
      { $match: { tenantId: tid, archivedAt: null, assignedTo: { $ne: null }, stageId: { $nin: closedStages } } },
      {
        $addFields: {
          lastWorked: {
            $max: {
              $map: {
                input: { $filter: { input: { $ifNull: ['$activities', []] }, cond: { $and: [{ $in: ['$$this.type', WORK_TYPES] }, { $ne: [{ $ifNull: ['$$this.createdBy', null] }, null] }] } } },
                in: '$$this.createdAt',
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          neverTouched: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$lastWorked', null] }, null] }, 1, 0] } },
          untouched24h: { $sum: { $cond: [{ $or: [{ $eq: [{ $ifNull: ['$lastWorked', null] }, null] }, { $lt: ['$lastWorked', staleCutoff] }] }, 1, 0] } },
        },
      },
    ]),
    FollowUpReminder.aggregate([
      { $match: { tenantId: tid, assignedTo: { $ne: null }, scheduledAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$assignedTo', due: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } } } },
    ]),
    FollowUpReminder.aggregate([
      { $match: { tenantId: tid, assignedTo: { $ne: null }, status: { $in: ['scheduled', 'pending', 'rescheduled'] }, scheduledAt: { $lt: now } } },
      { $group: { _id: '$assignedTo', overdue: { $sum: 1 } } },
    ]),
    // How fast new leads get their first call.
    Lead.aggregate([
      { $match: { tenantId: tid, createdAt: { $gte: start, $lte: end }, assignedTo: { $ne: null } } },
      { $project: { assignedTo: 1, createdAt: 1, firstCall: { $min: { $map: { input: { $filter: { input: { $ifNull: ['$activities', []] }, cond: { $eq: ['$$this.type', 'call'] } } }, in: '$$this.createdAt' } } } } },
      {
        $group: {
          _id: '$assignedTo',
          newLeads: { $sum: 1 },
          called: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$firstCall', null] }, null] }, 0, 1] } },
          avgMin: { $avg: { $cond: [{ $eq: [{ $ifNull: ['$firstCall', null] }, null] }, null, { $max: [0, { $divide: [{ $subtract: ['$firstCall', '$createdAt'] }, 60000] }] }] } },
        },
      },
    ]),
  ]);

  const byId = <T extends { _id: any }>(list: T[]) => { const m: Record<string, T> = {}; list.forEach((r) => { m[String(r._id)] = r; }); return m; };
  const A = byId(acts as any[]); const C = byId(coverage as any[]); const FR = byId(fuRange as any[]); const FO = byId(fuOverdue as any[]); const S = byId(speed as any[]);
  const P: Record<string, { activeSeconds: number; days: Set<string>; first?: Date; last?: Date }> = {};
  (presence as any[]).forEach((p) => {
    const k = String(p.userId);
    const e = P[k] || (P[k] = { activeSeconds: 0, days: new Set() });
    e.activeSeconds += p.activeSeconds || 0; e.days.add(p.day);
    if (p.firstSeenAt && (!e.first || p.firstSeenAt < e.first)) e.first = p.firstSeenAt;
    if (p.lastSeenAt && (!e.last || p.lastSeenAt > e.last)) e.last = p.lastSeenAt;
  });

  const ids = Array.from(new Set([...Object.keys(A), ...Object.keys(C), ...Object.keys(FR), ...Object.keys(FO), ...Object.keys(S), ...Object.keys(P)]));
  const users = await User.find({ _id: { $in: ids.map(oid) }, tenantId: tid }).select('firstName lastName email role isActive').lean();

  const rows = users
    .filter((u: any) => u.role !== 'STUDENT')
    .map((u: any) => {
      const k = String(u._id);
      const a: any = A[k] || {}; const c: any = C[k] || {}; const fr: any = FR[k] || {}; const sp: any = S[k] || {}; const p = P[k];
      return {
        userId: k,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email || '', role: u.role || '', active: u.isActive !== false,
        activeSeconds: p?.activeSeconds || 0, activeDays: p?.days.size || 0,
        firstSeenAt: p?.first || null, lastSeenAt: p?.last || null,
        total: a.total || 0,
        calls: a.calls || 0, callsWithOutcome: a.callsWithOutcome || 0, connected: a.connected || 0, notReached: a.notReached || 0,
        pendingOutcome: a.pendingOutcome || 0,
        leadsCalled: (a.callLeads || []).filter(Boolean).length,
        whatsapp: a.whatsapp || 0, note: a.note || 0, email_count: a.email || 0, stageMoves: a.stageMoves || 0,
        leadsTouched: (a.leads || []).length,
        firstActivityAt: a.firstAt || null, lastActivityAt: a.lastAt || null,
        assigned: c.assigned || 0, neverTouched: c.neverTouched || 0, untouched24h: c.untouched24h || 0,
        followUpsDue: fr.due || 0, followUpsDone: fr.done || 0, followUpsMissed: fr.missed || 0, followUpsOverdue: (FO[k] as any)?.overdue || 0,
        newLeads: sp.newLeads || 0, newLeadsCalled: sp.called || 0,
        avgFirstCallMin: sp.avgMin != null ? Math.round(sp.avgMin) : null,
      };
    })
    // The busiest first; people with nothing at all (but leads assigned) come last, which is the point of showing them.
    .sort((x, y) => (y.calls + y.total) - (x.calls + x.total) || y.assigned - x.assigned);

  const sum = (f: (r: any) => number) => rows.reduce((n, r) => n + f(r), 0);
  const totals = {
    activeSeconds: sum((r) => r.activeSeconds), total: sum((r) => r.total), calls: sum((r) => r.calls), connected: sum((r) => r.connected),
    leadsCalled: sum((r) => r.leadsCalled), whatsapp: sum((r) => r.whatsapp), note: sum((r) => r.note), stageMoves: sum((r) => r.stageMoves),
    assigned: sum((r) => r.assigned), neverTouched: sum((r) => r.neverTouched), untouched24h: sum((r) => r.untouched24h),
    followUpsOverdue: sum((r) => r.followUpsOverdue), pendingOutcome: sum((r) => r.pendingOutcome),
  };
  return { rows, totals, range: { from: fromDay, to: toDay, start, end }, workDay: WORK_DAY, today: istDay() };
}

/** One person, one day: when they were active, what they did and when, and which leads took their time. */
export async function teamPerson(tenantId: string, userId: string, day?: string) {
  const tid = oid(tenantId); const uid = oid(userId);
  const { start, end, fromDay } = istRange(day, day);

  const [pres, items, user] = await Promise.all([
    StaffPresence.findOne({ tenantId: tid, userId: uid, day: fromDay }).lean() as any,
    Lead.aggregate([
      { $match: { tenantId: tid, 'activities.createdAt': { $gte: start, $lte: end } } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdAt': { $gte: start, $lte: end }, 'activities.createdBy': uid } },
      { $sort: { 'activities.createdAt': 1 } },
      { $limit: 800 },
      { $project: { _id: 0, leadId: '$_id', leadName: '$name', phone: '$phone', type: '$activities.type', description: '$activities.description', callOutcome: '$activities.callOutcome', at: '$activities.createdAt', started: '$activities.metadata.dialed' } },
    ]),
    User.findOne({ _id: uid, tenantId: tid }).select('firstName lastName email role').lean() as any,
  ]);

  const secs: Record<string, number> = (pres?.leadSeconds as any) || {};
  const top = Object.entries(secs).filter(([k]) => /^[a-f0-9]{24}$/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const leads: any[] = top.length ? await Lead.find({ _id: { $in: top.map(([k]) => oid(k)) }, tenantId: tid }).select('name phone').lean() : [];
  const nameOf: Record<string, any> = {}; leads.forEach((l) => { nameOf[String(l._id)] = l; });

  return {
    day: fromDay,
    user: user ? { name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email, email: user.email, role: user.role } : null,
    presence: pres ? { slots: (pres.slots || []).slice().sort((a: number, b: number) => a - b), activeSeconds: pres.activeSeconds || 0, firstSeenAt: pres.firstSeenAt, lastSeenAt: pres.lastSeenAt } : { slots: [], activeSeconds: 0, firstSeenAt: null, lastSeenAt: null },
    activities: items,
    leadTime: top.map(([k, s]) => ({ leadId: k, name: nameOf[k]?.name || 'Lead', phone: nameOf[k]?.phone || '', seconds: s })),
    workDay: WORK_DAY,
  };
}
