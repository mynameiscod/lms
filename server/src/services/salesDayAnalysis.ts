import mongoose from 'mongoose';
import Lead from '../models/Lead';
import FollowUpReminder from '../models/FollowUpReminder';
import { DayMetrics } from '../models/SalesTeam';
import { istRange } from '../utils/istTime';

/**
 * SALES DAY ANALYSIS (v2) — one person's day, counted around leads.
 *
 * Why this exists: the first report counted raw timeline entries. Every press of the Call button
 * ("Call started (dialler opened)") was a call, the same lead showed up dozens of times, automatic
 * entries (drips, workflows, AI calls, "follow-up done") counted as the person's notes and messages,
 * and speed to call was one average. Here:
 *   • a CALL on a lead is grouped: entries on the same lead within 10 minutes of the call's start are
 *     one call; its outcome is the last recorded one; with none it is "outcome missing";
 *   • WHATSAPP is grouped the same way (opening WhatsApp three times is one message);
 *   • SYSTEM entries never count as the person's work (they still show, flagged, in the detail);
 *   • SPEED TO CALL is per lead: assigned to this person → their first call, in minutes;
 *   • FOLLOW-UPS are today's (due / done / missed) plus older ones still open; the automatic
 *     "call this new lead" tasks are left out, speed to call already measures that.
 */

export const GROUP_MS = 10 * 60 * 1000;
const SYSTEM_RE = /^(🤖|📞 AI call|📣|⚠️ No call or note|✅ Follow-up done|\[AUTO DRIP\]|AI call outcome)|\(broadcast\)|calls in a row without an answer/;
export const WORK_TYPES = new Set(['call', 'whatsapp', 'email', 'note', 'status_change', 'meeting']);
const OPEN_FOLLOWUP = ['scheduled', 'pending', 'missed', 'rescheduled'];

/** Written by the system on someone's behalf, not by the person. */
export function isSystemEntry(a: any): boolean {
  return SYSTEM_RE.test(String(a?.description || '')) || !!a?.metadata?.automation || !!a?.metadata?.workflowId;
}

export interface CallGroup { at: Date; leadId: string; outcome: string | null; talkSeconds: number; entries: number }

/** Entries of one kind on one lead → groups (a new group starts more than 10 minutes after the last group's start). */
export function groupEntries(entries: any[], leadId: string): CallGroup[] {
  const sorted = [...entries].sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt));
  const groups: CallGroup[] = [];
  for (const e of sorted) {
    const t = new Date(e.createdAt);
    const g = groups[groups.length - 1];
    if (g && +t - +g.at <= GROUP_MS) {
      if (e.callOutcome) g.outcome = String(e.callOutcome);
      g.talkSeconds += Number(e.callDuration) || 0;
      g.entries++;
    } else {
      groups.push({ at: t, leadId, outcome: e.callOutcome ? String(e.callOutcome) : null, talkSeconds: Number(e.callDuration) || 0, entries: 1 });
    }
  }
  return groups;
}

export interface LeadRow {
  leadId: string;
  name: string;
  phone: string;
  source: string;
  createdAt: Date | null;
  /** Assigned to this person on this day (a new lead for them). */
  isNew: boolean;
  assignedAt: Date | null;
  firstCallAt: Date | null;
  minutesToCall: number | null;
  /** Not called yet: minutes since assignment (live), or until the end of that day. */
  waitingMin: number | null;
  calls: number;
  connectedCalls: number;
  lastOutcome: string | null;
  outcomeMissing: number;
  whatsapp: number;
  notes: number;
  stageMoves: number;
  stage: { name: string; color: string } | null;
  nextFollowUp: Date | null;
  entries: { type: string; description: string; at: Date; callOutcome: string | null; callDuration: number | null; system: boolean }[];
}

export const emptyDayMetrics = (): DayMetrics => ({
  v: 2, calls: 0, leadsCalled: 0, connected: 0, notConnected: 0, outcomeMissing: 0, outcomes: {}, talkSeconds: 0,
  whatsapp: 0, leadsMessaged: 0, notes: 0, newAssigned: 0, calledWithin5: 0, calledWithin30: 0, calledLate: 0, notCalled: 0,
  avgFirstCallMin: null, leadsWorked: 0, stageMoves: 0, leadsMovedForward: 0, followUpsDue: 0, followUpsDone: 0,
  followUpsMissed: 0, carriedOver: 0, demos: 0, seats: 0, enrollments: 0,
});

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const inDay = (d: any, start: Date, end: Date) => !!d && new Date(d) >= start && new Date(d) <= end;

/** One lead, one person, one day → the row and the bits that roll up into the day's numbers. */
export function analyseLead(lead: any, userId: string, start: Date, end: Date, now: Date) {
  const mine = (lead.activities || []).filter((a: any) => String(a.createdBy) === userId);
  const today = mine.filter((a: any) => inDay(a.createdAt, start, end));
  const work = today.filter((a: any) => !isSystemEntry(a));
  const callGroups = groupEntries(work.filter((a: any) => a.type === 'call'), String(lead._id));
  const waGroups = groupEntries(work.filter((a: any) => a.type === 'whatsapp'), String(lead._id));
  const notes = work.filter((a: any) => a.type === 'note').length;
  const stageMoves = work.filter((a: any) => a.type === 'status_change').length;

  const assignedRaw = lead.assignment?.assignedAt || (String(lead.assignedTo) === userId && inDay(lead.createdAt, start, end) ? lead.createdAt : null);
  const isNew = String(lead.assignedTo) === userId && inDay(assignedRaw, start, end);
  const assignedAt = isNew ? new Date(assignedRaw) : null;
  let firstCallAt: Date | null = null;
  if (assignedAt) {
    const firstCall = mine
      .filter((a: any) => a.type === 'call' && !isSystemEntry(a) && new Date(a.createdAt) >= assignedAt)
      .sort((x: any, y: any) => +new Date(x.createdAt) - +new Date(y.createdAt))[0];
    firstCallAt = firstCall ? new Date(firstCall.createdAt) : null;
  }
  const minutesToCall = assignedAt && firstCallAt ? Math.max(0, Math.round((+firstCallAt - +assignedAt) / 60000)) : null;
  const waitingMin = assignedAt && !firstCallAt ? Math.max(0, Math.round(((now < end ? +now : +end) - +assignedAt) / 60000)) : null;
  const last = callGroups[callGroups.length - 1];

  const row: LeadRow = {
    leadId: String(lead._id),
    name: lead.name || 'Lead',
    phone: lead.phone || '',
    source: lead.source || '',
    createdAt: lead.createdAt ? new Date(lead.createdAt) : null,
    isNew,
    assignedAt,
    firstCallAt,
    minutesToCall,
    waitingMin,
    calls: callGroups.length,
    connectedCalls: callGroups.filter((g) => g.outcome === 'connected').length,
    lastOutcome: last ? last.outcome || 'missing' : null,
    outcomeMissing: callGroups.filter((g) => !g.outcome).length,
    whatsapp: waGroups.length,
    notes,
    stageMoves,
    stage: lead.stageId && typeof lead.stageId === 'object' && lead.stageId.name ? { name: lead.stageId.name, color: lead.stageId.color || '#64748b' } : null,
    nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp) : null,
    entries: today
      .sort((x: any, y: any) => +new Date(y.createdAt) - +new Date(x.createdAt))
      .map((a: any) => ({ type: a.type, description: a.description, at: new Date(a.createdAt), callOutcome: a.callOutcome || null, callDuration: a.callDuration ?? null, system: isSystemEntry(a) })),
  };
  const worked = work.some((a: any) => WORK_TYPES.has(a.type));
  return { row, callGroups, waGroups, worked };
}

/** Everyone's day: per person, the numbers and (when asked) the lead rows. */
export async function analyseDay(tenantId: string, userIds: string[], day: string, opts: { rows?: boolean; now?: Date } = {}) {
  const now = opts.now || new Date();
  const out = new Map<string, { metrics: DayMetrics; rows: LeadRow[] }>(userIds.map((id) => [id, { metrics: emptyDayMetrics(), rows: [] }]));
  if (!userIds.length) return out;
  const t = oid(tenantId);
  const ids = userIds.map(oid);
  const { start, end } = istRange(day, day);
  const cutoff = now < end ? now : end;

  const [leads, fus, miles] = await Promise.all([
    Lead.find({
      tenantId: t,
      $or: [
        { activities: { $elemMatch: { createdBy: { $in: ids }, createdAt: { $gte: start, $lte: end } } } },
        { assignedTo: { $in: ids }, 'assignment.assignedAt': { $gte: start, $lte: end } },
        { assignedTo: { $in: ids }, 'assignment.assignedAt': { $exists: false }, createdAt: { $gte: start, $lte: end } },
      ],
    })
      .select("name phone source createdAt assignedTo assignment.assignedAt stageId nextFollowUp activities")
      .populate('stageId', 'name color')
      .lean(),
    FollowUpReminder.aggregate([
      { $match: {
        tenantId: t, assignedTo: { $in: ids },
        automationKey: { $not: /^first-contact:/ },
        $or: [{ scheduledAt: { $lte: end } }, { completedAt: { $gte: start, $lte: end } }],
      } },
      { $group: {
        _id: '$assignedTo',
        due: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', start] }, { $lte: ['$scheduledAt', end] }, { $ne: ['$status', 'cancelled'] }] }, 1, 0] } },
        done: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$completedAt', start] }, { $lte: ['$completedAt', end] }] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $and: [{ $gte: ['$scheduledAt', start] }, { $lt: ['$scheduledAt', cutoff] }, { $in: ['$status', OPEN_FOLLOWUP] }] }, 1, 0] } },
        carried: { $sum: { $cond: [{ $and: [{ $lt: ['$scheduledAt', start] }, { $in: ['$status', OPEN_FOLLOWUP] }] }, 1, 0] } },
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

  const speeds = new Map<string, number[]>();
  for (const lead of leads as any[]) {
    for (const userId of userIds) {
      const slot = out.get(userId)!;
      const { row, callGroups, waGroups, worked } = analyseLead(lead, userId, start, end, now);
      if (!worked && !row.isNew) continue;
      const m = slot.metrics;
      m.calls += callGroups.length;
      if (callGroups.length) m.leadsCalled++;
      for (const g of callGroups) {
        if (!g.outcome) m.outcomeMissing++;
        else {
          if (g.outcome === 'connected') m.connected++; else m.notConnected++;
          m.outcomes[g.outcome] = (m.outcomes[g.outcome] || 0) + 1;
        }
        m.talkSeconds += g.talkSeconds;
      }
      m.whatsapp += waGroups.length;
      if (waGroups.length) m.leadsMessaged++;
      m.notes += row.notes;
      m.stageMoves += row.stageMoves;
      if (row.stageMoves) m.leadsMovedForward++;
      if (worked) m.leadsWorked++;
      if (row.isNew) {
        m.newAssigned++;
        if (row.minutesToCall === null) m.notCalled++;
        else {
          if (row.minutesToCall <= 5) m.calledWithin5++;
          else if (row.minutesToCall <= 30) m.calledWithin30++;
          else m.calledLate++;
          const arr = speeds.get(userId) || [];
          arr.push(row.minutesToCall);
          speeds.set(userId, arr);
        }
      }
      if (opts.rows) slot.rows.push(row);
    }
  }
  for (const [uid, arr] of speeds) out.get(uid)!.metrics.avgFirstCallMin = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  for (const f of fus) {
    const m = out.get(String(f._id))?.metrics;
    if (m) Object.assign(m, { followUpsDue: f.due, followUpsDone: f.done, followUpsMissed: f.missed, carriedOver: f.carried });
  }
  for (const x of miles) {
    const m = out.get(String(x._id))?.metrics;
    if (m) Object.assign(m, { demos: x.demos, seats: x.seats, enrollments: x.enrollments });
  }
  // Rows: not called new leads first (longest waiting), then new leads by assignment, then the rest by last activity.
  for (const slot of out.values()) {
    slot.rows.sort((a, b) => {
      const rank = (r: LeadRow) => (r.isNew && r.firstCallAt === null ? 0 : r.isNew ? 1 : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (rank(a) === 0) return (b.waitingMin || 0) - (a.waitingMin || 0);
      if (rank(a) === 1) return +(a.assignedAt || 0) - +(b.assignedAt || 0);
      return +(b.entries[0]?.at || 0) - +(a.entries[0]?.at || 0);
    });
  }
  return out;
}
