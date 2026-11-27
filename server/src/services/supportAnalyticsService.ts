import mongoose from 'mongoose';
import SupportTicket from '../models/SupportTicket';
import SupportChatSession from '../models/SupportChatSession';
import SupportSearchLog from '../models/SupportSearchLog';
import SupportIncident from '../models/SupportIncident';
import SupportRelease from '../models/SupportRelease';
import SupportConfiguration from '../models/SupportConfiguration';
import Tenant from '../models/Tenant';
import { SupportActor, can, ticketScope, pickAllowed, SUPPORT_MODULES } from '../data/supportPolicy';
import { mergeSupportConfig, EffectiveSupportConfig, audit } from './supportAccess';
import { SupportError, RequestCtx } from './supportTicketService';
import { notifySupport } from './supportNotify';

/**
 * Help & Support numbers. EVERY figure here is a MongoDB query over real tickets, chats and
 * searches in the caller's reach — nothing is estimated or filled in. A figure that depends on
 * something the organisation has not set (SLA targets, incident rules) is returned as null with
 * a flag saying why, never as a made-up default.
 *
 * Aggregation pipelines do not cast ids, so the scope's tenant id is turned into an ObjectId
 * here (see the production-script note: User.tenantId is an ObjectId and $match will not cast).
 */
const OPEN_STATES = ['open', 'in_progress', 'waiting_on_user'];
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const oid = (v: string) => new mongoose.Types.ObjectId(v);

export function analyticsScope(actor: SupportActor, q: any): Record<string, unknown> {
  if (!can(actor, 'viewCollege')) throw new SupportError(403, 'You do not have access to this.');
  const s: any = { ...ticketScope(actor) };
  if (s.tenantId) s.tenantId = oid(String(s.tenantId));
  else if (actor.allTenants && isId(q?.tenantId)) s.tenantId = oid(q.tenantId);
  return s;
}

export function rangeOf(q: any, now = new Date()): { from: Date; to: Date } {
  const to = q?.to && !isNaN(+new Date(q.to)) ? new Date(q.to) : now;
  const from = q?.from && !isNaN(+new Date(q.from)) ? new Date(q.from) : new Date(to.getTime() - 30 * 86_400_000);
  if (from > to) throw new SupportError(400, 'The start date is after the end date.');
  if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new SupportError(400, 'Choose a range of a year or less.');
  return { from, to };
}

const minutesBetween = { $divide: [{ $subtract: ['$b', '$a'] }, 60_000] };

async function configsFor(tenantIds: string[]): Promise<Map<string, EffectiveSupportConfig>> {
  const [own, base] = await Promise.all([
    SupportConfiguration.find({ tenantId: { $in: tenantIds.map(oid) } }).lean(),
    SupportConfiguration.findOne({ tenantId: null }).lean(),
  ]);
  const byTenant = new Map(own.map((c: any) => [String(c.tenantId), c]));
  return new Map(tenantIds.map(t => [t, mergeSupportConfig(byTenant.get(t), base)]));
}

export async function summary(actor: SupportActor, q: any) {
  const scope = analyticsScope(actor, q);
  const { from, to } = rangeOf(q);
  const inRange = { ...scope, createdAt: { $gte: from, $lte: to } };

  const [current, period, firstResp, resolution, reopened, slaRows] = await Promise.all([
    SupportTicket.aggregate([
      { $match: { ...scope, status: { $in: OPEN_STATES } } },
      { $group: {
        _id: null,
        open: { $sum: 1 },
        unassigned: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$assigneeId', null] }, null] }, 1, 0] } },
        highCritical: { $sum: { $cond: [{ $in: ['$priority', ['high', 'critical']] }, 1, 0] } },
        waitingOnUser: { $sum: { $cond: [{ $eq: ['$status', 'waiting_on_user'] }, 1, 0] } },
        escalated: { $sum: { $cond: ['$escalated', 1, 0] } },
      } },
    ]),
    SupportTicket.aggregate([
      { $match: inRange },
      { $group: { _id: null, created: { $sum: 1 }, fromChat: { $sum: { $cond: [{ $eq: ['$source', 'ai_chat'] }, 1, 0] } } } },
    ]),
    SupportTicket.aggregate([
      { $match: { ...inRange, firstResponseAt: { $ne: null } } },
      { $project: { a: '$createdAt', b: '$firstResponseAt' } },
      { $group: { _id: null, avg: { $avg: minutesBetween }, n: { $sum: 1 } } },
    ]),
    SupportTicket.aggregate([
      { $match: { ...scope, resolvedAt: { $gte: from, $lte: to } } },
      { $project: { a: '$createdAt', b: '$resolvedAt' } },
      { $group: { _id: null, avg: { $avg: minutesBetween }, n: { $sum: 1 } } },
    ]),
    SupportTicket.countDocuments({ ...inRange, reopenCount: { $gt: 0 } }),
    SupportTicket.find(inRange).select('tenantId priority createdAt firstResponseAt resolvedAt status').limit(20_000).lean(),
  ]);

  // SLA compliance, only against targets the organisation set, per institute.
  const configs = await configsFor([...new Set(slaRows.map((t: any) => String(t.tenantId)))]);
  const now = Date.now();
  const sla = { first: { met: 0, missed: 0 }, resolution: { met: 0, missed: 0 } };
  let anyTarget = false;
  for (const t of slaRows as any[]) {
    const cfg = configs.get(String(t.tenantId));
    if (!cfg?.slaConfigured) continue;
    const check = (target: number | null, doneAt: Date | null, bucket: { met: number; missed: number }) => {
      if (target == null) return;
      anyTarget = true;
      const due = new Date(t.createdAt).getTime() + target * 60_000;
      if (doneAt) { if (new Date(doneAt).getTime() <= due) bucket.met++; else bucket.missed++; }
      else if (now > due) bucket.missed++;
    };
    check(cfg.firstResponseMinutes[t.priority as 'low'], t.firstResponseAt, sla.first);
    check(cfg.resolutionMinutes[t.priority as 'low'], t.resolvedAt, sla.resolution);
  }
  const pct = (b: { met: number; missed: number }) => (b.met + b.missed ? Math.round((b.met / (b.met + b.missed)) * 1000) / 10 : null);

  // The assistant, in the same reach and range.
  const chatMatch: any = { createdAt: { $gte: from, $lte: to } };
  if (scope.tenantId) chatMatch.tenantId = scope.tenantId;
  const chat = await SupportChatSession.aggregate([
    { $match: chatMatch },
    { $facet: {
      sessions: [{ $group: {
        _id: null, total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $ne: [{ $ifNull: ['$ticketId', null] }, null] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $gt: ['$failures', 0] }, 1, 0] } },
      } }],
      answers: [
        { $unwind: '$turns' }, { $match: { 'turns.role': 'assistant' } },
        { $group: { _id: null, answers: { $sum: 1 }, fallback: { $sum: { $cond: ['$turns.fallback', 1, 0] } },
          up: { $sum: { $cond: [{ $eq: ['$turns.helpful', true] }, 1, 0] } }, down: { $sum: { $cond: [{ $eq: ['$turns.helpful', false] }, 1, 0] } } } },
      ],
    } },
  ]);
  const s = chat[0]?.sessions[0] || { total: 0, resolved: 0, escalated: 0, failed: 0 };
  const a = chat[0]?.answers[0] || { answers: 0, fallback: 0, up: 0, down: 0 };
  const rate = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : null);
  const c = current[0] || { open: 0, unassigned: 0, highCritical: 0, waitingOnUser: 0, escalated: 0 };

  return {
    range: { from, to },
    current: { open: c.open, unassigned: c.unassigned, highCritical: c.highCritical, waitingOnUser: c.waitingOnUser, escalated: c.escalated },
    period: {
      created: period[0]?.created || 0,
      fromAssistant: period[0]?.fromChat || 0,
      reopened,
      resolved: resolution[0]?.n || 0,
      avgFirstResponseMinutes: firstResp[0] ? Math.round(firstResp[0].avg) : null,
      avgResolutionMinutes: resolution[0] ? Math.round(resolution[0].avg) : null,
    },
    sla: anyTarget ? { configured: true, firstResponsePct: pct(sla.first), resolutionPct: pct(sla.resolution), ...sla } : { configured: false },
    assistant: {
      sessions: s.total, resolved: s.resolved, escalated: s.escalated, failedSessions: s.failed,
      resolutionRate: rate(s.resolved, s.total), escalationRate: rate(s.escalated, s.total),
      answers: a.answers, fallbackAnswers: a.fallback, thumbsUp: a.up, thumbsDown: a.down,
    },
  };
}

export async function trends(actor: SupportActor, q: any) {
  const scope = analyticsScope(actor, q);
  const { from, to } = rangeOf(q);
  const day = (field: string) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: 'Asia/Kolkata' } });
  const [created, resolved, releases] = await Promise.all([
    SupportTicket.aggregate([{ $match: { ...scope, createdAt: { $gte: from, $lte: to } } }, { $group: { _id: day('$createdAt'), n: { $sum: 1 } } }]),
    SupportTicket.aggregate([{ $match: { ...scope, resolvedAt: { $gte: from, $lte: to } } }, { $group: { _id: day('$resolvedAt'), n: { $sum: 1 } } }]),
    SupportRelease.find({ deployedAt: { $gte: from, $lte: to } }).sort({ deployedAt: 1 }).lean(),
  ]);
  const days: string[] = [];
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let t = from.getTime(); t <= to.getTime() + 86_399_999; t += 86_400_000) { const d = fmt.format(new Date(t)); if (!days.includes(d)) days.push(d); }
  const c = new Map(created.map(r => [r._id, r.n])); const r = new Map(resolved.map(x => [x._id, x.n]));
  return {
    series: days.map(d => ({ day: d, created: c.get(d) || 0, resolved: r.get(d) || 0 })),
    releases: releases.map((x: any) => ({ version: x.version, day: fmt.format(new Date(x.deployedAt)), deployedAt: x.deployedAt })),
  };
}

export async function breakdown(actor: SupportActor, q: any) {
  const scope = analyticsScope(actor, q);
  const { from, to } = rangeOf(q);
  const inRange = { ...scope, createdAt: { $gte: from, $lte: to } };
  const by = (field: string) => SupportTicket.aggregate([{ $match: inRange }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
  const [module, category, source, status, heat, unresolved, repeated] = await Promise.all([
    by('module'), by('category'), by('source'), by('status'),
    SupportTicket.aggregate([{ $match: inRange }, { $group: { _id: { t: '$tenantId', m: '$module' }, n: { $sum: 1 } } }]),
    SupportTicket.aggregate([{ $match: { ...scope, status: { $in: OPEN_STATES } } }, { $group: { _id: '$module', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    SupportTicket.aggregate([
      { $match: inRange },
      { $group: { _id: { m: '$module', c: '$category' }, n: { $sum: 1 }, people: { $addToSet: '$requesterId' }, last: { $max: '$createdAt' } } },
      { $project: { _id: 0, module: '$_id.m', category: '$_id.c', tickets: '$n', people: { $size: '$people' }, last: 1 } },
      { $match: { people: { $gte: 3 } } },
      { $sort: { people: -1, tickets: -1 } }, { $limit: 15 },
    ]),
  ]);
  const tenantIds = [...new Set(heat.map((h: any) => String(h._id.t)))];
  const names = new Map((await Tenant.find({ _id: { $in: tenantIds.map(oid) } }).select('name').lean()).map((t: any) => [String(t._id), t.name]));
  const colleges = tenantIds.map(id => ({ id, name: names.get(id) || 'Unknown', total: heat.filter((h: any) => String(h._id.t) === id).reduce((s: number, h: any) => s + h.n, 0) }))
    .sort((a, b) => b.total - a.total);
  const searchMatch: any = { resultCount: 0, createdAt: { $gte: from, $lte: to } };
  if (scope.tenantId) searchMatch.tenantId = scope.tenantId;
  const unanswered = await SupportSearchLog.aggregate([
    { $match: searchMatch },
    { $group: { _id: '$normalized', query: { $last: '$query' }, count: { $sum: 1 }, people: { $addToSet: '$userId' } } },
    { $project: { _id: 0, query: 1, count: 1, people: { $size: '$people' } } },
    { $sort: { count: -1 } }, { $limit: 10 },
  ]);
  const pairs = (rows: any[]) => rows.map(r => ({ key: r._id, count: r.n }));
  return {
    range: { from, to },
    byModule: pairs(module), byCategory: pairs(category), bySource: pairs(source), byStatus: pairs(status),
    byCollege: colleges,
    heatmap: { colleges: colleges.map(c => ({ id: c.id, name: c.name })), modules: [...SUPPORT_MODULES], cells: heat.map((h: any) => ({ tenantId: String(h._id.t), module: h._id.m, count: h.n })) },
    unresolvedByModule: pairs(unresolved),
    repeatedIssues: repeated,
    unansweredSearches: unanswered,
  };
}

// ── Possible shared incidents ────────────────────────────────────────────────

async function rulesFor(actor: SupportActor, scope: Record<string, unknown>) {
  const tenant = scope.tenantId ? String(scope.tenantId) : null;
  const [own, base] = await Promise.all([
    tenant ? SupportConfiguration.findOne({ tenantId: oid(tenant) }).lean() : null,
    SupportConfiguration.findOne({ tenantId: null }).lean(),
  ]);
  const cfg = mergeSupportConfig(own, base);
  const { minTickets, minDistinctUsers, windowMinutes } = cfg.incident;
  return minTickets && minDistinctUsers && windowMinutes ? { minTickets, minDistinctUsers, windowMinutes, tenant } : { tenant };
}

export async function incidents(actor: SupportActor, q: any) {
  const scope = analyticsScope(actor, q);
  const rules: any = await rulesFor(actor, scope);
  const incScope = rules.tenant ? { tenantId: oid(rules.tenant) } : (actor.allTenants ? {} : { tenantId: oid(actor.tenantId) });
  const confirmed = await SupportIncident.find({ ...incScope, status: 'confirmed' }).sort({ confirmedAt: -1 }).lean();
  if (!rules.windowMinutes) return { configured: false, possible: [], confirmed: confirmed.map(view) };

  const since = new Date(Date.now() - rules.windowMinutes * 60_000);
  const rows = await SupportTicket.aggregate([
    { $match: { ...scope, createdAt: { $gte: since } } },
    { $group: { _id: '$module', tickets: { $sum: 1 }, people: { $addToSet: '$requesterId' }, colleges: { $addToSet: '$tenantId' }, first: { $min: '$createdAt' } } },
    { $project: { _id: 0, module: '$_id', tickets: 1, people: { $size: '$people' }, colleges: { $size: '$colleges' }, first: 1 } },
    { $match: { tickets: { $gte: rules.minTickets }, people: { $gte: rules.minDistinctUsers } } },
    { $sort: { people: -1 } },
  ]);
  const confirmedModules = new Set(confirmed.map((c: any) => c.module));
  return {
    configured: true,
    rules: { minTickets: rules.minTickets, minDistinctUsers: rules.minDistinctUsers, windowMinutes: rules.windowMinutes },
    possible: rows.filter((r: any) => !confirmedModules.has(r.module)).map((r: any) => ({ ...r, label: 'Possible shared incident' })),
    confirmed: confirmed.map(view),
  };
}

const view = (i: any) => ({
  id: String(i._id), module: i.module, title: i.title, status: i.status, ticketCount: i.ticketCount, peopleCount: i.peopleCount,
  confirmedAt: i.confirmedAt, resolvedAt: i.resolvedAt, notifiedCount: i.notifiedCount, tenantId: i.tenantId ? String(i.tenantId) : null,
});

/**
 * A manager confirms a possible incident. Only then may members be told — once per ticket, and
 * the notice says only that support is aware and working on it.
 */
export async function confirmIncident(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  if (!can(actor, 'manage')) throw new SupportError(403, 'You do not have access to this.');
  const b = pickAllowed(body, ['module', 'title', 'tenantId', 'notify'] as const);
  const scope = analyticsScope(actor, { tenantId: b.tenantId });
  const found = await incidents(actor, { tenantId: b.tenantId });
  if (!found.configured) throw new SupportError(409, 'Set the incident rules in Support settings first.');
  const hit = found.possible.find((p: any) => p.module === b.module);
  if (!hit) throw new SupportError(409, 'There is no possible incident for that area right now.');
  const since = new Date(Date.now() - (found as any).rules.windowMinutes * 60_000);
  const tenantId = scope.tenantId ? (scope.tenantId as mongoose.Types.ObjectId) : null;
  const inc = await SupportIncident.create({
    tenantId, module: hit.module, title: String(b.title || `Problem affecting ${hit.module.replace(/_/g, ' ')}`).trim().slice(0, 200),
    windowStart: since, ticketCount: hit.tickets, peopleCount: hit.people, confirmedBy: actor.userId, confirmedAt: new Date(),
  });
  let notified = 0;
  if (b.notify !== false) {
    const tickets = await SupportTicket.find({ ...scope, module: hit.module, createdAt: { $gte: since }, status: { $in: OPEN_STATES } }).select('_id tenantId ticketNumber requesterId').limit(2000).lean();
    for (const t of tickets as any[]) {
      notifySupport({ event: 'incident_acknowledged', tenantId: String(t.tenantId), ticketId: String(t._id), ticketNumber: t.ticketNumber, to: [String(t.requesterId)], actorId: actor.userId, audience: 'member' });
      notified++;
    }
    await SupportIncident.updateOne({ _id: inc._id }, { $set: { notifiedCount: notified } });
  }
  await audit({ actor, entity: 'ticket', entityId: inc._id, tenantId, action: 'incident_confirmed', requestId: ctx.requestId, changes: { module: { to: hit.module }, notified: { to: notified } } });
  return { ...view(inc.toObject()), notifiedCount: notified };
}

export async function resolveIncident(actor: SupportActor, id: unknown, ctx: RequestCtx) {
  if (!can(actor, 'manage')) throw new SupportError(403, 'You do not have access to this.');
  if (!isId(id)) throw new SupportError(404, 'Incident not found.');
  const reach: any = actor.allTenants ? {} : { tenantId: oid(actor.tenantId) };
  const inc = await SupportIncident.findOneAndUpdate({ _id: id, ...reach, status: 'confirmed' }, { $set: { status: 'resolved', resolvedAt: new Date() } }, { new: true }).lean();
  if (!inc) throw new SupportError(404, 'Incident not found.');
  await audit({ actor, entity: 'ticket', entityId: (inc as any)._id, tenantId: (inc as any).tenantId, action: 'incident_resolved', requestId: ctx.requestId });
  return view(inc);
}

// ── Settings ─────────────────────────────────────────────────────────────────

const CONFIG_GROUPS = ['firstResponseMinutes', 'resolutionMinutes', 'reopen', 'incident', 'retention'] as const;

/** The configuration a manager edits: their institute's, or the platform default for the HQ. */
export async function getConfig(actor: SupportActor, q: any) {
  if (!can(actor, 'manage')) throw new SupportError(403, 'You do not have access to this.');
  const platform = actor.allTenants && q?.scope === 'platform';
  const doc: any = await SupportConfiguration.findOne({ tenantId: platform ? null : oid(actor.tenantId) }).lean();
  const out: any = { scope: platform ? 'platform' : 'institute' };
  for (const g of CONFIG_GROUPS) out[g] = doc?.[g] || {};
  return out;
}

const num = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || !Number.isInteger(n)) throw new SupportError(400, `Use a whole number between ${min} and ${max}, or leave it empty.`);
  return n;
};

export async function saveConfig(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  if (!can(actor, 'manage')) throw new SupportError(403, 'You do not have access to this.');
  const b = pickAllowed(body, [...CONFIG_GROUPS, 'scope'] as const) as any;
  const platform = actor.allTenants && b.scope === 'platform';
  const pr = (o: any) => ({ low: num(o?.low, 1, 525_600), medium: num(o?.medium, 1, 525_600), high: num(o?.high, 1, 525_600), critical: num(o?.critical, 1, 525_600) });
  const set: any = {
    firstResponseMinutes: pr(b.firstResponseMinutes),
    resolutionMinutes: pr(b.resolutionMinutes),
    reopen: {
      allowed: b.reopen?.allowed === true ? true : b.reopen?.allowed === false ? false : null,
      windowDays: num(b.reopen?.windowDays, 1, 365), maxReopens: num(b.reopen?.maxReopens, 0, 100),
    },
    incident: { minTickets: num(b.incident?.minTickets, 2, 10_000), minDistinctUsers: num(b.incident?.minDistinctUsers, 2, 10_000), windowMinutes: num(b.incident?.windowMinutes, 5, 43_200) },
    retention: { chatDays: num(b.retention?.chatDays, 1, 3650), attachmentDays: num(b.retention?.attachmentDays, 1, 3650) },
    updatedBy: oid(actor.userId),
  };
  const tenantId = platform ? null : oid(actor.tenantId);
  await SupportConfiguration.updateOne({ tenantId }, { $set: set }, { upsert: true, runValidators: true });
  await audit({ actor, entity: 'config', tenantId, action: 'saved', requestId: ctx.requestId, changes: Object.fromEntries(CONFIG_GROUPS.map(g => [g, { to: set[g] }])) });
  return getConfig(actor, { scope: platform ? 'platform' : 'institute' });
}
