import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import LeadSubStage from '../models/LeadSubStage';
import Batch from '../models/Batch';
import User from '../models/User';
import LeadProbable, { PROBABLE_CHANCES } from '../models/LeadProbable';
import { SalesTeam } from '../models/SalesTeam';
import { milestoneFromLegacy } from '../config/leadMilestones';
import { istDay, istRange } from '../utils/istTime';
import { SalesError, Viewer } from './salesTeamService';

/**
 * LEAD REPORT — the Sales Teams view of leads by stage and sub-stage. Read-only on leads; the only thing
 * it writes is a "probable" mark (models/LeadProbable.ts).
 *
 *   Who        a member sees their own leads, a manager their team members' leads, the super admin (or
 *              manage_sales_teams) every team's members. Leads of people in no team are not in this report.
 *   New        leads assigned to the person on the chosen IST day (same rule as the daily report:
 *              assignment.assignedAt, or created that day when there is no assignment record). A lead
 *              created earlier and handed over that day is new to them too, and is flagged "Reassigned".
 *   Follow-ups open leads (not lost, not enrolled) whose next follow-up is today, and "overdue" ones whose
 *              follow-up was before today. The same rule as Leads → Follow-up queue, so the numbers agree.
 *   All        every unarchived lead the people own.
 *   Probables  leads marked as likely to join a batch, grouped by the batch's start date.
 *
 * Every tab returns the count of each stage and of each sub-stage inside it, worked out on the whole tab
 * (person, team and search applied; the stage being clicked is not), so the counts never move as you filter.
 */

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const validId = (v: any) => mongoose.Types.ObjectId.isValid(String(v || '')) && /^[a-f\d]{24}$/i.test(String(v || ''));
const nameOf = (u: any) => [u?.firstName, u?.lastName === '-' ? '' : u?.lastName].filter(Boolean).join(' ').trim() || u?.email || 'User';
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 50;
const EXPORT_MAX = 5000;

export const REPORT_VIEWS = ['new', 'followups', 'all', 'probables'] as const;
export type ReportView = typeof REPORT_VIEWS[number];
const NONE = 'none';

/* ═══════════════════════════════ Who is in the report ═══════════════════════════════ */

interface Scope {
  as: 'admin' | 'manager' | 'member';
  teams: { _id: string; name: string; color: string; members: { _id: string; name: string }[] }[];
  /** Everyone whose leads the viewer may see. */
  allIds: string[];
}

async function scopeFor(viewer: Viewer): Promise<Scope> {
  const t = oid(viewer.tenantId);
  const u = oid(viewer.userId);
  let teams: any[] = [];
  let as: Scope['as'] = 'member';
  if (viewer.isAdmin) { teams = await SalesTeam.find({ tenantId: t, active: true }).sort({ name: 1 }).lean(); as = 'admin'; }
  else {
    teams = await SalesTeam.find({ tenantId: t, managerId: u, active: true }).sort({ name: 1 }).lean();
    if (teams.length) as = 'manager';
  }
  if (as === 'member') {
    const own: any = await SalesTeam.findOne({ tenantId: t, memberIds: u, active: true }).lean();
    if (!own) throw new SalesError(403, 'The lead report is for sales team members, their managers and the super admin.');
    const me: any = await User.findById(u).select('firstName lastName email').lean();
    return { as, teams: [{ _id: String(own._id), name: own.name, color: own.color, members: [{ _id: viewer.userId, name: nameOf(me) }] }], allIds: [viewer.userId] };
  }
  const ids = [...new Set(teams.flatMap((x) => (x.memberIds || []).map(String)))];
  const users: any[] = ids.length ? await User.find({ _id: { $in: ids.map(oid) } }).select('firstName lastName email').lean() : [];
  const nm = new Map(users.map((x) => [String(x._id), nameOf(x)]));
  return {
    as,
    teams: teams.map((x) => ({
      _id: String(x._id), name: x.name, color: x.color,
      members: (x.memberIds || []).map(String).filter((id: string) => nm.has(id)).map((id: string) => ({ _id: id, name: nm.get(id)! }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    })),
    allIds: ids,
  };
}

/** The people the current filters narrow the report to (never wider than the scope). */
function pickPeople(scope: Scope, teamId?: string, userId?: string): string[] {
  let ids = scope.allIds;
  if (teamId && scope.as !== 'member') {
    const team = scope.teams.find((x) => x._id === teamId);
    if (!team) throw new SalesError(403, 'That team is not in your report.');
    ids = team.members.map((m) => m._id);
  }
  if (userId) {
    if (!ids.includes(userId)) throw new SalesError(403, 'That person is not in your report.');
    ids = [userId];
  }
  return ids;
}

/* ═══════════════════════════════ Stages ═══════════════════════════════ */

async function stageBook(tenantId: string) {
  const t = oid(tenantId);
  const [stages, subs]: [any[], any[]] = await Promise.all([
    LeadStage.find({ tenantId: t }).select('name color order isActive milestone category isLostStage').sort({ order: 1 }).lean(),
    LeadSubStage.find({ tenantId: t }).select('stageId name color order isActive').sort({ order: 1 }).lean(),
  ]);
  const closed = stages.filter((s) => ['lost', 'enrolled'].includes(milestoneFromLegacy(s))).map((s) => s._id);
  const enrolled = new Set(stages.filter((s) => milestoneFromLegacy(s) === 'enrolled').map((s) => String(s._id)));
  return { stages, subs, closed, enrolled };
}

/* ═══════════════════════════════ The report ═══════════════════════════════ */

export interface ReportQuery {
  view?: string; day?: string; teamId?: string; userId?: string; stageId?: string; subStageId?: string;
  due?: string; batchId?: string; q?: string; page?: string | number; exportAll?: boolean;
}

export async function leadReport(viewer: Viewer, query: ReportQuery) {
  const view: ReportView = (REPORT_VIEWS as readonly string[]).includes(String(query.view)) ? query.view as ReportView : 'new';
  const today = istDay();
  const day = query.day && DAY_RE.test(query.day) && query.day <= today ? query.day : today;
  const { start, end } = istRange(day, day);
  const { start: todayStart, end: todayEnd } = istRange(today, today);
  const scope = await scopeFor(viewer);
  const teamId = validId(query.teamId) ? String(query.teamId) : '';
  const userId = validId(query.userId) ? String(query.userId) : '';
  const people = pickPeople(scope, teamId, userId);
  const t = oid(viewer.tenantId);
  const book = await stageBook(viewer.tenantId);

  // The people + search, shared by every tab.
  const base: any = { tenantId: t, archivedAt: null, assignedTo: { $in: people.map(oid) } };
  const q = String(query.q || '').trim().slice(0, 80);
  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    base.$or = [{ name: re }, { phone: re }, { email: re }];
  }

  // Probables in the people's leads (a small set: read once, used by the tab and the badges).
  const probableRows: any[] = await LeadProbable.find({ tenantId: t }).lean();
  const probableByLead = new Map(probableRows.map((p) => [String(p.leadId), p]));
  const batchId = validId(query.batchId) ? String(query.batchId) : '';

  const open = { stageId: { $nin: book.closed } };
  const newFilter = {
    ...base,
    $and: [{ $or: [
      { 'assignment.assignedAt': { $gte: start, $lte: end } },
      { 'assignment.assignedAt': { $exists: false }, createdAt: { $gte: start, $lte: end } },
    ] }],
  };
  const dueToday = { ...base, ...open, nextFollowUp: { $gte: todayStart, $lte: todayEnd } };
  const overdue = { ...base, ...open, nextFollowUp: { $lt: todayStart } };
  const followAll = { ...base, ...open, nextFollowUp: { $lte: todayEnd } };
  const probableLeadIds = probableRows.filter((p) => !batchId || String(p.batchId) === batchId).map((p) => p.leadId);
  const probAll = { ...base, _id: { $in: probableRows.map((p) => p.leadId) } };

  const due = query.due === 'today' || query.due === 'overdue' ? query.due : '';
  const viewFilter: any =
    view === 'new' ? newFilter
      : view === 'followups' ? (due === 'today' ? dueToday : due === 'overdue' ? overdue : followAll)
        : view === 'probables' ? { ...base, _id: { $in: probableLeadIds } }
          : { ...base };

  // Stage / sub-stage filter (applies to the table only, not to the counts).
  const rowFilter: any = { ...viewFilter };
  const stageId = query.stageId === NONE ? NONE : validId(query.stageId) ? String(query.stageId) : '';
  const subStageId = query.subStageId === NONE ? NONE : validId(query.subStageId) ? String(query.subStageId) : '';
  if (stageId === NONE) rowFilter.stageId = null;
  else if (stageId) {
    rowFilter.stageId = oid(stageId);
    if (subStageId === NONE) rowFilter.subStageId = null;
    else if (subStageId) rowFilter.subStageId = oid(subStageId);
  }

  const sort: Record<string, 1 | -1> =
    view === 'new' ? { 'assignment.assignedAt': -1, createdAt: -1 }
      : view === 'followups' ? { nextFollowUp: 1 }
        : { updatedAt: -1 };
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = query.exportAll ? EXPORT_MAX : PAGE_SIZE;

  const [stageCounts, total, leads, tabCounts, memberCounts] = await Promise.all([
    Lead.aggregate([{ $match: viewFilter }, { $group: { _id: { s: '$stageId', ss: '$subStageId' }, n: { $sum: 1 } } }]),
    Lead.countDocuments(rowFilter),
    view === 'probables'
      ? Lead.find(rowFilter).select(ROW_FIELDS).populate('assignedTo', 'firstName lastName email').lean()
      : Lead.find(rowFilter).select(ROW_FIELDS).populate('assignedTo', 'firstName lastName email')
        .sort({ ...sort, _id: 1 }).skip(query.exportAll ? 0 : (page - 1) * limit).limit(limit).lean(),
    Promise.all([newFilter, dueToday, overdue, base, probAll].map((f) => Lead.countDocuments(f))),
    scope.as === 'member' ? Promise.resolve(null) : memberBreakdown(people, { newFilter, dueToday, overdue, base, probAll }),
  ]);

  // Probables sort by batch start, then the order they were marked, and page in memory (the set is small).
  let pageLeads: any[] = leads as any[];
  if (view === 'probables') {
    const p = (l: any) => probableByLead.get(String(l._id));
    pageLeads.sort((a, b) => (+p(a)?.batchStart || 0) - (+p(b)?.batchStart || 0) || (+p(a)?.createdAt || 0) - (+p(b)?.createdAt || 0));
    if (!query.exportAll) pageLeads = pageLeads.slice((page - 1) * limit, page * limit);
  }

  const stageById = new Map(book.stages.map((s) => [String(s._id), s]));
  const subById = new Map(book.subs.map((s) => [String(s._id), s]));
  const rows = pageLeads.map((l: any) => {
    const st = l.stageId ? stageById.get(String(l.stageId)) : null;
    const sub = l.subStageId ? subById.get(String(l.subStageId)) : null;
    const pr = probableByLead.get(String(l._id));
    const assignedAt = l.assignment?.assignedAt || null;
    const fu = l.nextFollowUp ? new Date(l.nextFollowUp) : null;
    return {
      leadId: String(l._id),
      name: l.name || 'Unnamed lead',
      phone: l.phone || '',
      email: l.email || '',
      source: l.source || '',
      course: (l.courseInterest || [])[0] || '',
      owner: l.assignedTo ? { _id: String(l.assignedTo._id), name: nameOf(l.assignedTo) } : null,
      stage: st ? { _id: String(st._id), name: st.name, color: st.color } : null,
      subStage: sub && (!st || String(sub.stageId) === String(st._id)) ? { _id: String(sub._id), name: sub.name, color: sub.color || null } : null,
      createdAt: l.createdAt || null,
      assignedAt,
      reassigned: view === 'new' && !!l.createdAt && new Date(l.createdAt) < start,
      nextFollowUp: fu,
      followUp: !fu ? null : fu < todayStart ? 'overdue' : fu <= todayEnd ? 'today' : 'upcoming',
      lastContactedAt: l.lastContactedAt || null,
      lastCallOutcome: l.lastCallOutcome || null,
      probable: pr ? probableView(pr, l.stageId && book.enrolled.has(String(l.stageId))) : null,
    };
  });

  const [nNew, nDue, nOver, nAll, nProb] = tabCounts as number[];
  return {
    view, day, today, live: day === today, as: scope.as,
    teams: scope.teams,
    filters: { teamId, userId, stageId, subStageId, due, batchId, q },
    tabs: { new: nNew, followups: nDue + nOver, dueToday: nDue, overdue: nOver, all: nAll, probables: nProb },
    stages: stageTree(book, stageCounts as any[]),
    total, page, pageSize: limit, pages: Math.max(1, Math.ceil(total / limit)),
    rows,
    members: memberCounts,
    batches: view === 'probables' ? await batchSummary(probableRows, probAll, book) : null,
  };
}

const ROW_FIELDS = 'name phone email source courseInterest assignedTo assignment.assignedAt stageId subStageId nextFollowUp lastContactedAt lastCallOutcome createdAt updatedAt';

function probableView(p: any, joined: boolean) {
  return {
    batchId: String(p.batchId), batchName: p.batchName, batchStart: p.batchStart, chance: p.chance,
    note: p.note || '', markedByName: p.markedByName || '', markedAt: p.updatedAt || p.createdAt, joined: !!joined,
  };
}

/** Each stage in pipeline order with its count, and the count of each of its sub-stages. */
function stageTree(book: Awaited<ReturnType<typeof stageBook>>, counts: { _id: { s?: any; ss?: any }; n: number }[]) {
  const byStage = new Map<string, { n: number; subs: Map<string, number> }>();
  for (const c of counts) {
    const s = c._id?.s ? String(c._id.s) : NONE;
    const ss = c._id?.ss ? String(c._id.ss) : NONE;
    const e = byStage.get(s) || { n: 0, subs: new Map() };
    e.n += c.n;
    e.subs.set(ss, (e.subs.get(ss) || 0) + c.n);
    byStage.set(s, e);
  }
  const out = book.stages
    .filter((s) => s.isActive !== false || byStage.has(String(s._id)))
    .map((s) => {
      const e = byStage.get(String(s._id));
      const subs = book.subs.filter((x) => String(x.stageId) === String(s._id) && (x.isActive !== false || e?.subs.has(String(x._id))))
        .map((x) => ({ _id: String(x._id), name: x.name, color: x.color || null, count: e?.subs.get(String(x._id)) || 0 }));
      // Leads in this stage whose sub-stage is empty or belongs to another stage.
      const known = new Set(subs.map((x) => x._id));
      let other = 0;
      for (const [k, n] of e?.subs || []) if (!known.has(k)) other += n;
      if (subs.length && other) subs.push({ _id: NONE, name: 'No sub-stage', color: null, count: other });
      return { _id: String(s._id), name: s.name, color: s.color, count: e?.n || 0, subStages: subs };
    });
  const loose = byStage.get(NONE);
  if (loose) out.push({ _id: NONE, name: 'No stage', color: '#94a3b8', count: loose.n, subStages: [] });
  // Stages the pipeline no longer has, but leads still sit in.
  for (const [k, e] of byStage) if (k !== NONE && !book.stages.some((s) => String(s._id) === k)) out.push({ _id: k, name: 'Removed stage', color: '#94a3b8', count: e.n, subStages: [] });
  return out;
}

/** The tab counts for each person, for a manager's or admin's "by member" strip. */
async function memberBreakdown(people: string[], f: Record<'newFilter' | 'dueToday' | 'overdue' | 'base' | 'probAll', any>) {
  const keys = ['new', 'dueToday', 'overdue', 'all', 'probables'] as const;
  const lists = await Promise.all([f.newFilter, f.dueToday, f.overdue, f.base, f.probAll].map((m) =>
    Lead.aggregate([{ $match: m }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }])));
  const out = new Map<string, Record<string, number>>(people.map((p) => [p, { new: 0, dueToday: 0, overdue: 0, all: 0, probables: 0 }]));
  lists.forEach((rows, i) => { for (const r of rows as any[]) { const e = out.get(String(r._id)); if (e) e[keys[i]] = r.n; } });
  return [...out.entries()].map(([userId, c]) => ({ userId, ...c }));
}

/** Probables per batch (soonest start first), with how many have already joined (lead now in an enrolled stage). */
async function batchSummary(probables: any[], visible: any, book: Awaited<ReturnType<typeof stageBook>>) {
  const leads: any[] = await Lead.find(visible).select('_id stageId').lean();
  const stageOf = new Map(leads.map((l) => [String(l._id), l.stageId ? String(l.stageId) : '']));
  const by = new Map<string, { batchId: string; name: string; startDate: Date; count: number; joined: number; high: number }>();
  for (const p of probables) {
    const lid = String(p.leadId);
    if (!stageOf.has(lid)) continue;
    const k = String(p.batchId);
    const e = by.get(k) || { batchId: k, name: p.batchName, startDate: p.batchStart, count: 0, joined: 0, high: 0 };
    e.count++;
    if (book.enrolled.has(stageOf.get(lid)!)) e.joined++;
    if (p.chance === 'high') e.high++;
    by.set(k, e);
  }
  return [...by.values()].sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
}

/* ═══════════════════════════════ Marking probables ═══════════════════════════════ */

/** Batches a lead can be marked for: active ones starting from two weeks ago onward. */
export async function probableBatches(viewer: Viewer) {
  const from = new Date(Date.now() - 14 * 86400000);
  const rows: any[] = await Batch.find({ tenantId: oid(viewer.tenantId), isActive: { $ne: false }, startDate: { $gte: from }, kind: { $ne: 'placement' } })
    .select('name startDate mode courseId').populate('courseId', 'title name').sort({ startDate: 1 }).limit(200).lean();
  return rows.map((b) => ({ _id: String(b._id), name: b.name, startDate: b.startDate, mode: b.mode || null, course: b.courseId?.title || b.courseId?.name || '' }));
}

async function leadInScope(viewer: Viewer, leadId: string) {
  if (!validId(leadId)) throw new SalesError(404, 'Lead not found.');
  const scope = await scopeFor(viewer);
  const lead: any = await Lead.findOne({ _id: oid(leadId), tenantId: oid(viewer.tenantId), archivedAt: null }).select('assignedTo stageId').lean();
  if (!lead) throw new SalesError(404, 'Lead not found.');
  if (!lead.assignedTo || !scope.allIds.includes(String(lead.assignedTo))) throw new SalesError(403, 'You can only mark leads of your own team.');
  return lead;
}

export async function markProbable(viewer: Viewer, leadId: string, body: any) {
  await leadInScope(viewer, leadId);
  if (!validId(body?.batchId)) throw new SalesError(400, 'Choose a batch.');
  const batch: any = await Batch.findOne({ _id: oid(body.batchId), tenantId: oid(viewer.tenantId) }).select('name startDate').lean();
  if (!batch) throw new SalesError(404, 'That batch was not found.');
  const chance = (PROBABLE_CHANCES as readonly string[]).includes(body?.chance) ? body.chance : 'medium';
  const me: any = await User.findById(oid(viewer.userId)).select('firstName lastName email').lean();
  const saved: any = await LeadProbable.findOneAndUpdate(
    { tenantId: oid(viewer.tenantId), leadId: oid(leadId) },
    {
      $set: {
        batchId: batch._id, batchName: batch.name, batchStart: batch.startDate, chance,
        note: String(body?.note || '').trim().slice(0, 500), markedBy: oid(viewer.userId), markedByName: nameOf(me),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return probableView(saved, false);
}

export async function unmarkProbable(viewer: Viewer, leadId: string) {
  await leadInScope(viewer, leadId);
  await LeadProbable.deleteOne({ tenantId: oid(viewer.tenantId), leadId: oid(leadId) });
  return { removed: true };
}
