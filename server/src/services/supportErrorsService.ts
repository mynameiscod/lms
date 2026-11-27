import mongoose from 'mongoose';
import SupportErrorGroup, { ERROR_KINDS, SEVERITIES } from '../models/SupportErrorGroup';
import SupportMetricCounter from '../models/SupportMetricCounter';
import SupportTicket from '../models/SupportTicket';
import SupportConfiguration from '../models/SupportConfiguration';
import { SupportActor, pickAllowed } from '../data/supportPolicy';
import { SupportError, RequestCtx, pageOf, cleanRoute } from './supportTicketService';
import { audit } from './supportAccess';
import { capture, count, templatePath, moduleForPath, MONITORING_DEFAULTS, refreshMonitoringSettings } from './supportMonitoring';
import { sentryEnabled } from './sentryForwarder';
import { redactText } from '../utils/redact';

/**
 * The /admin/errors side of monitoring (access: requireMonitor), and the intake for errors
 * reported by browsers. Reported tickets and detected errors stay separate lists; a group shows
 * the tickets it is linked to, and a ticket shows the groups it is linked to — nothing merges them.
 */
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => (list as readonly string[]).includes(String(v)) ? v as T : undefined;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const view = (g: any) => ({
  id: String(g._id), kind: g.kind, severity: g.severityOverride || g.severity, configuredSeverity: g.severity, severityOverride: g.severityOverride || null,
  title: g.title, message: g.message, route: g.route, module: g.module, topFrames: g.topFrames, count: g.count,
  firstSeen: g.firstSeen, lastSeen: g.lastSeen, firstRelease: g.firstRelease, lastRelease: g.lastRelease,
  status: g.status, collegeCount: (g.tenantIds || []).length, linkedTickets: (g.linkedTicketIds || []).length,
});

export async function listErrors(q: any) {
  const { page, limit } = pageOf(q, 100);
  const f: any = {};
  const kind = oneOf(ERROR_KINDS, q?.kind); if (kind) f.kind = kind;
  const status = oneOf(['open', 'resolved', 'ignored'] as const, q?.status); if (status) f.status = status;
  if (q?.module) f.module = String(q.module).slice(0, 40);
  const sev = oneOf(SEVERITIES, q?.severity);
  if (sev) f.$or = [{ severityOverride: sev }, { severityOverride: null, severity: sev }];
  if (q?.linked === 'true') f['linkedTicketIds.0'] = { $exists: true };
  if (q?.linked === 'false') f['linkedTicketIds.0'] = { $exists: false };
  const search = String(q?.q ?? '').trim().slice(0, 100);
  if (search) f.title = { $regex: escapeRegex(search), $options: 'i' };
  const sort: any = q?.sort === 'count' ? { count: -1 } : { lastSeen: -1 };
  const [rows, total] = await Promise.all([SupportErrorGroup.find(f).sort(sort).skip((page - 1) * limit).limit(limit).lean(), SupportErrorGroup.countDocuments(f)]);
  return { groups: rows.map(view), total, page, limit, sentry: sentryEnabled() };
}

export async function errorDetail(id: unknown) {
  if (!isId(id)) throw new SupportError(404, 'Not found.');
  const g: any = await SupportErrorGroup.findById(id).lean();
  if (!g) throw new SupportError(404, 'Not found.');
  const tickets = await SupportTicket.find({ _id: { $in: g.linkedTicketIds || [] } }).select('ticketNumber subject status createdAt').sort({ createdAt: -1 }).limit(50).lean();
  return {
    ...view(g),
    sampleRequestIds: (g.sampleRequestIds || []).slice(-10),
    tickets: tickets.map((t: any) => ({ id: String(t._id), ticketNumber: t.ticketNumber, subject: t.subject, status: t.status, createdAt: t.createdAt })),
  };
}

export async function updateError(actor: SupportActor, id: unknown, body: unknown, ctx: RequestCtx) {
  if (!isId(id)) throw new SupportError(404, 'Not found.');
  const b = pickAllowed(body, ['status', 'severityOverride'] as const);
  const set: any = {};
  if (b.status !== undefined) { const s = oneOf(['open', 'resolved', 'ignored'] as const, b.status); if (!s) throw new SupportError(400, 'Unknown status.'); set.status = s; }
  if (b.severityOverride !== undefined) {
    if (b.severityOverride === null || b.severityOverride === '') set.severityOverride = null;
    else { const s = oneOf(SEVERITIES, b.severityOverride); if (!s) throw new SupportError(400, 'Unknown severity.'); set.severityOverride = s; }
  }
  if (!Object.keys(set).length) throw new SupportError(400, 'Nothing to change.');
  const g = await SupportErrorGroup.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
  if (!g) throw new SupportError(404, 'Not found.');
  await audit({ actor, entity: 'config', entityId: (g as any)._id, tenantId: null, action: 'error_group_updated', requestId: ctx.requestId, changes: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, { to: v }])) });
  return view(g);
}

/** Hourly counts for the last day or week: refusals, slow requests, AI failures, database trouble. */
export async function counters(q: any) {
  const hours = q?.range === '7d' ? 24 * 7 : 24;
  const since = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 - (hours - 1) * 3_600_000);
  const rows = await SupportMetricCounter.aggregate([
    { $match: { hour: { $gte: since } } },
    { $group: { _id: '$key', total: { $sum: '$count' }, byHour: { $push: { hour: '$hour', count: '$count' } } } },
    { $sort: { _id: 1 } },
  ]);
  return { since, hours, counters: rows.map(r => ({ key: r._id, total: r.total, byHour: r.byHour.sort((a: any, b: any) => +new Date(a.hour) - +new Date(b.hour)) })) };
}

export async function getMonitoringConfig() {
  const c: any = await SupportConfiguration.findOne({ tenantId: null }).select('monitoring').lean();
  return { saved: c?.monitoring || {}, defaults: MONITORING_DEFAULTS, sentry: sentryEnabled() };
}

export async function saveMonitoringConfig(actor: SupportActor, body: unknown, ctx: RequestCtx) {
  const b = pickAllowed(body, ['slowRequestMs', 'slowQueryMs', 'alertPerHour', 'severity'] as const) as any;
  const num = (v: unknown, min: number, max: number) => {
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new SupportError(400, `Use a whole number between ${min} and ${max}, or leave it empty.`);
    return n;
  };
  const severity: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.severity || {})) {
    if (!(ERROR_KINDS as readonly string[]).includes(k)) continue;
    if (v === null || v === '') continue;
    if (!(SEVERITIES as readonly string[]).includes(String(v))) throw new SupportError(400, 'Unknown severity.');
    severity[k] = String(v);
  }
  const set = { slowRequestMs: num(b.slowRequestMs, 200, 120_000), slowQueryMs: num(b.slowQueryMs, 50, 120_000), alertPerHour: num(b.alertPerHour, 1, 100_000), severity };
  await SupportConfiguration.updateOne({ tenantId: null }, { $set: { monitoring: set } }, { upsert: true });
  await refreshMonitoringSettings(true);
  await audit({ actor, entity: 'config', tenantId: null, action: 'monitoring_saved', requestId: ctx.requestId, changes: { monitoring: { to: set } } });
  return getMonitoringConfig();
}

// ── Browser reports ──────────────────────────────────────────────────────────

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Errors reported by the browser. Everything is cut down and redacted before it is grouped:
 * a message, the top of a stack, the page path (no query string) and, for failed API calls, the
 * API route template and status. Up to 10 events per report.
 */
export function ingestClientErrors(body: unknown, ctx: { tenantId?: string }) {
  const events = Array.isArray((body as any)?.events) ? (body as any).events.slice(0, 10) : [];
  let accepted = 0;
  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const e = pickAllowed(raw, ['type', 'message', 'stack', 'page', 'apiPath', 'method', 'status', 'requestId', 'release'] as const) as any;
    const page = cleanRoute(e.page);
    const message = redactText(String(e.message || '')).slice(0, 300);
    if (e.type === 'api') {
      const status = Number(e.status) || 0;
      if (status && status < 500) continue; // 4xx are answers, not faults
      const api = templatePath(String(e.apiPath || '').replace(/^https?:\/\/[^/]+/, ''));
      const method = /^(GET|POST|PUT|PATCH|DELETE)$/.test(String(e.method)) ? e.method : 'GET';
      count('client_api_failure');
      capture({
        kind: 'client_api', title: `${method} ${api} failed in the browser${status ? ` (${status})` : ' (network)'}`, route: `${method} ${api}`,
        module: moduleForPath(api || page || ''), requestId: SAFE_ID.test(String(e.requestId)) ? e.requestId : undefined, tenantId: ctx.tenantId, key: String(status || 'network'),
      });
    } else {
      if (!message) continue;
      count('client_error');
      const frames = String(e.stack || '').split('\n').slice(0, 4).map(l => redactText(l.trim()).replace(/https?:\/\/[^/\s]+/g, '').slice(0, 200)).filter(Boolean);
      capture({
        kind: 'client_error', title: `${e.type === 'react' ? 'Page crashed' : 'Browser error'}: ${message.slice(0, 120)}`, message,
        route: page, module: moduleForPath(page || ''), frames, tenantId: ctx.tenantId, key: `${message.slice(0, 80)}|${frames[0] || ''}`,
      });
    }
    accepted++;
  }
  return { accepted };
}

export const isObjectId = (v: unknown) => typeof v === 'string' && mongoose.isValidObjectId(v);
