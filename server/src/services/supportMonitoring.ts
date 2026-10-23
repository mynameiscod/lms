import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import SupportErrorGroup, { ErrorKind, Severity, SEVERITIES } from '../models/SupportErrorGroup';
import SupportMetricCounter from '../models/SupportMetricCounter';
import SupportRelease from '../models/SupportRelease';
import SupportTicket from '../models/SupportTicket';
import SupportConfiguration from '../models/SupportConfiguration';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';
import { redactText } from '../utils/redact';
import { forwardToSentry } from './sentryForwarder';
import { supportHqTenantId } from './supportAccess';

/**
 * Technical monitoring for Help & Support: what went wrong, how often, where — grouped, counted
 * and linked to the tickets people raised about it.
 *
 * Captures are buffered in memory and written in batches (every few seconds), so recording a
 * problem never adds a database round trip to the request that hit it, and a burst of the same
 * error is one upsert, not a thousand inserts. Nothing in here throws to its caller.
 */

// ── Settings (engineering thresholds, configurable; not promises to anyone) ──

export const MONITORING_DEFAULTS = {
  slowRequestMs: 3000,
  slowQueryMs: 1000,
  alertPerHour: 20,
  severity: {
    exception: 'error', server_5xx: 'error', slow_request: 'info', client_error: 'warning', client_api: 'warning',
    ai_failure: 'warning', mongo_connection: 'critical', slow_query: 'info',
  } as Record<ErrorKind, Severity>,
};
let settings = { ...MONITORING_DEFAULTS, severity: { ...MONITORING_DEFAULTS.severity } };
let settingsLoadedAt = 0;

export async function refreshMonitoringSettings(force = false) {
  if (!force && Date.now() - settingsLoadedAt < 60_000) return settings;
  settingsLoadedAt = Date.now();
  try {
    const c: any = await SupportConfiguration.findOne({ tenantId: null }).select('monitoring').lean();
    const m = c?.monitoring || {};
    const sev = { ...MONITORING_DEFAULTS.severity };
    for (const [k, v] of Object.entries(m.severity || {})) if ((SEVERITIES as readonly string[]).includes(String(v)) && k in sev) (sev as any)[k] = v;
    settings = {
      slowRequestMs: m.slowRequestMs || MONITORING_DEFAULTS.slowRequestMs,
      slowQueryMs: m.slowQueryMs || MONITORING_DEFAULTS.slowQueryMs,
      alertPerHour: m.alertPerHour || MONITORING_DEFAULTS.alertPerHour,
      severity: sev,
    };
  } catch { /* keep the last good settings */ }
  return settings;
}
export const monitoringSettings = () => settings;

// ── Release ──────────────────────────────────────────────────────────────────

let releaseCache = '';
/** RELEASE_VERSION (set by the deploy), else GIT_SHA, else the server package version. */
export function releaseVersion(): string {
  if (releaseCache) return releaseCache;
  let pkg = 'unknown';
  try { pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version || pkg; } catch { /* keep unknown */ }
  releaseCache = String(process.env.RELEASE_VERSION || process.env.GIT_SHA || pkg).slice(0, 80);
  return releaseCache;
}
export const __resetRelease = () => { releaseCache = ''; };

/** Writes the running release once; the trend chart draws these as markers. */
export async function recordRelease(): Promise<void> {
  try { await SupportRelease.updateOne({ version: releaseVersion() }, { $setOnInsert: { deployedAt: new Date() } }, { upsert: true }); } catch { /* not worth failing a start */ }
}

// ── Routes and modules ───────────────────────────────────────────────────────

/** A path with its ids replaced, so /tickets/6ad9… and /tickets/6ae1… are one route. */
export function templatePath(p: string): string {
  return String(p || '').split('?')[0]
    .replace(/\/[a-f0-9]{24}(?=\/|$)/gi, '/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:uuid')
    .replace(/\/\d{2,}(?=\/|$)/g, '/:n')
    .replace(/\/[A-Za-z0-9_-]{32,}(?=\/|$)/g, '/:token')
    .slice(0, 300);
}

const MODULE_RULES: [RegExp, string][] = [
  [/\/auth\b|\/login|\/password|\/otp/, 'account'],
  [/\/payments?\b|\/membership|\/razorpay/, 'payment'],
  [/assessment|skill-check|placement-check/, 'assessment'],
  [/foundation-journey|\/journey|\/day-plan|enrollment-plan|\/plan\b/, 'plan'],
  [/roadmap/, 'roadmap'],
  [/thinking-lab/, 'thinking_lab'],
  [/communication|speaking/, 'communication'],
  [/interview/, 'interview'],
  [/playground/, 'playground'],
  [/coding|problem|judge|assignment/, 'coding'],
  [/practice|mission/, 'practice'],
  [/mentor/, 'mentor'],
  [/compan|opportunit|drive/, 'opportunities'],
  [/news/, 'news'],
  [/resume/, 'resume'],
  [/progress|leaderboard|coins|reward|gamification/, 'progress'],
  [/career-track/, 'career_tracks'],
];
/** The ticket module a path belongs to, so errors and tickets can be lined up by area. */
export function moduleForPath(p: string): string {
  const s = String(p || '').toLowerCase();
  for (const [re, m] of MODULE_RULES) if (re.test(s)) return m;
  return 'other';
}

// ── Capture ──────────────────────────────────────────────────────────────────

export interface CaptureInput {
  kind: ErrorKind;
  title: string;
  message?: string;
  route?: string;
  module?: string;
  frames?: string[];
  requestId?: string;
  tenantId?: string;
  /** Extra text that makes this a different group (e.g. an error name). */
  key?: string;
}

interface Pending {
  fingerprint: string; kind: ErrorKind; title: string; message: string; route?: string; module: string; frames: string[];
  n: number; requestIds: string[]; tenantIds: Set<string>; first: Date; last: Date;
}
const pending = new Map<string, Pending>();
/** Events per fingerprint in the current hour, for alert thresholds (single process). */
const hourly = new Map<string, { hour: number; n: number }>();
const forwardedAt = new Map<string, number>();

export const fingerprintOf = (kind: string, ...parts: (string | undefined)[]) =>
  crypto.createHash('sha1').update([kind, ...parts.map(p => p || '')].join('|')).digest('hex');

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function capture(e: CaptureInput): void {
  try {
    const title = redactText(e.title).slice(0, 200);
    const route = e.route ? templatePath(e.route) : undefined;
    const fp = fingerprintOf(e.kind, route, e.key || title);
    const now = new Date();
    const p = pending.get(fp) || {
      fingerprint: fp, kind: e.kind, title, message: redactText(e.message || '').slice(0, 1000), route,
      module: e.module || moduleForPath(route || ''), frames: (e.frames || []).slice(0, 3).map(f => redactText(f).slice(0, 300)),
      n: 0, requestIds: [], tenantIds: new Set<string>(), first: now, last: now,
    };
    p.n++; p.last = now;
    if (e.requestId && SAFE_ID.test(e.requestId) && p.requestIds.length < 20) p.requestIds.push(e.requestId);
    if (e.tenantId && /^[a-f0-9]{24}$/i.test(e.tenantId) && p.tenantIds.size < 20) p.tenantIds.add(e.tenantId);
    pending.set(fp, p);
    const h = Math.floor(Date.now() / 3_600_000);
    const c = hourly.get(fp);
    hourly.set(fp, c && c.hour === h ? { hour: h, n: c.n + 1 } : { hour: h, n: 1 });
    if (pending.size > 500) void flushMonitoring();
  } catch { /* never */ }
}

/** Top frames of a stack, without file system paths beyond the project. */
export const framesOf = (stack?: string) =>
  String(stack || '').split('\n').slice(1, 4).map(l => l.trim().replace(/\(?[A-Z]:\\[^)]*?(\\(src|dist)\\)/gi, '($2/').replace(/\(?\/[^)]*?\/(src|dist)\//g, '($1/'));

export function captureException(err: any, ctx: { method?: string; route?: string; requestId?: string; tenantId?: string } = {}) {
  const route = ctx.route ? `${ctx.method || ''} ${templatePath(ctx.route)}`.trim() : undefined;
  capture({
    kind: 'exception', title: `${err?.name || 'Error'}: ${String(err?.message || 'unknown').slice(0, 120)}`,
    message: String(err?.message || ''), route, frames: framesOf(err?.stack), requestId: ctx.requestId, tenantId: ctx.tenantId,
    module: moduleForPath(ctx.route || ''), key: `${err?.name}|${framesOf(err?.stack)[0] || ''}`,
  });
  count('exception');
}

// ── Counters ────────────────────────────────────────────────────────────────

const counters = new Map<string, number>();
const hourStart = (d = new Date()) => new Date(Math.floor(d.getTime() / 3_600_000) * 3_600_000);
export function count(key: string, n = 1) {
  const k = `${hourStart().toISOString()}|${key.slice(0, 60)}`;
  counters.set(k, (counters.get(k) || 0) + n);
}

export type AiFailureCause = 'timeout' | 'rate_limit' | 'auth' | 'not_configured' | 'error';
export function recordAiFailure(o: { provider?: string; module?: string; status?: number; cause?: AiFailureCause; message?: string }) {
  const cause: AiFailureCause = o.cause || (o.status === 429 ? 'rate_limit' : o.status === 401 || o.status === 403 ? 'auth' : 'error');
  count(`ai_failure:${cause}`);
  capture({
    kind: 'ai_failure', title: `AI ${cause.replace('_', ' ')}: ${o.provider || 'provider'} (${o.module || 'unknown'})`,
    message: o.message || '', module: o.module === 'support_assistant' ? 'other' : moduleForPath(o.module || ''),
    key: `${o.provider}|${o.module}|${cause}`,
  });
}

// ── Writing ─────────────────────────────────────────────────────────────────

let flushing: Promise<void> | null = null;

export function flushMonitoring(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const batch = [...pending.values()]; pending.clear();
      const counts = [...counters.entries()]; counters.clear();
      await refreshMonitoringSettings();
      for (const p of batch) await writeGroup(p);
      if (counts.length) {
        await SupportMetricCounter.bulkWrite(counts.map(([k, n]) => {
          const [hour, key] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
          return { updateOne: { filter: { hour: new Date(hour), key }, update: { $inc: { count: n } }, upsert: true } };
        }), { ordered: false });
      }
    } catch { /* monitoring must not fail anything */ } finally { flushing = null; }
  })();
  return flushing;
}

async function writeGroup(p: Pending) {
  const release = releaseVersion();
  const g: any = await SupportErrorGroup.findOneAndUpdate(
    { fingerprint: p.fingerprint },
    {
      $setOnInsert: { kind: p.kind, title: p.title, message: p.message, route: p.route, module: p.module, topFrames: p.frames, firstSeen: p.first, firstRelease: release, severity: settings.severity[p.kind] || 'error' },
      $set: { lastSeen: p.last, lastRelease: release },
      $inc: { count: p.n },
      ...(p.requestIds.length ? { $push: { sampleRequestIds: { $each: p.requestIds, $slice: -20 } } } : {}),
      ...(p.tenantIds.size ? { $addToSet: { tenantIds: { $each: [...p.tenantIds].map(t => new mongoose.Types.ObjectId(t)) } } } : {}),
    },
    { upsert: true, new: true },
  ).lean();
  if (!g) return;
  // A resolved problem that happens again is open again.
  if (g.status === 'resolved') await SupportErrorGroup.updateOne({ _id: g._id }, { $set: { status: 'open' } });

  // Reliable links: tickets that quoted one of these request ids.
  if (p.requestIds.length) {
    const tickets = await SupportTicket.find({ 'context.requestId': { $in: p.requestIds } }).select('_id').lean();
    if (tickets.length) await SupportErrorGroup.updateOne({ _id: g._id }, { $addToSet: { linkedTicketIds: { $each: tickets.map(t => t._id) } } });
  }

  const severity: Severity = g.severityOverride || g.severity;
  const inHour = hourly.get(p.fingerprint)?.n || 0;
  if (g.status !== 'ignored') {
    const due = !g.lastAlertAt || Date.now() - new Date(g.lastAlertAt).getTime() > 3_600_000;
    if (due && (severity === 'critical' || inHour >= settings.alertPerHour)) {
      await SupportErrorGroup.updateOne({ _id: g._id }, { $set: { lastAlertAt: new Date() } });
      void alertStaff(g, inHour, severity);
    }
    // Forward to Sentry: the first sighting, then at most every ten minutes per group.
    const last = forwardedAt.get(p.fingerprint) || 0;
    if (Date.now() - last > 600_000 && severity !== 'info') {
      forwardedAt.set(p.fingerprint, Date.now());
      void forwardToSentry({
        level: severity === 'critical' ? 'fatal' : severity === 'warning' ? 'warning' : 'error',
        message: g.title, fingerprint: p.fingerprint, release,
        tags: { kind: g.kind, module: g.module, route: g.route, request_id: p.requestIds[p.requestIds.length - 1] },
        extra: { count: g.count, message: g.message, topFrames: g.topFrames },
      });
    }
  }
}

/** In-app notice to the support HQ's managers. Says what and how often — nothing about who. */
async function alertStaff(g: any, inHour: number, severity: Severity) {
  try {
    const hq = supportHqTenantId();
    if (!hq) return;
    const Role = mongoose.model('Role');
    const roles = await Role.find({ permissions: 'support_manager' }).select('_id').lean();
    const users = await User.find({ tenantId: hq, isActive: { $ne: false }, $or: [{ customRoleId: { $in: roles.map((r: any) => r._id) } }, { role: 'SUPER_ADMIN' }] }).select('_id').limit(50).lean();
    if (!users.length) return;
    await createNotifications(hq, users.map(u => String(u._id)), 'general',
      `${severity === 'critical' ? 'Critical' : 'Repeated'} problem: ${g.title}`.slice(0, 200),
      severity === 'critical' ? 'A critical problem was detected.' : `Seen ${inHour} times in the last hour.`,
      `/admin/support/errors/${g._id}`);
  } catch { /* an alert is never worth an error */ }
}

let timer: NodeJS.Timeout | null = null;
export function startMonitoring() {
  if (timer) return;
  void refreshMonitoringSettings(true);
  timer = setInterval(() => { void flushMonitoring(); }, 15_000);
  timer.unref?.();
}

export const __resetMonitoring = () => { pending.clear(); counters.clear(); hourly.clear(); forwardedAt.clear(); settingsLoadedAt = 0; settings = { ...MONITORING_DEFAULTS, severity: { ...MONITORING_DEFAULTS.severity } }; };

// ── Database ─────────────────────────────────────────────────────────────────

const OWN = new Set(['supporterrorgroups', 'supportmetriccounters']);
/**
 * Connection drops and slow operations, from the driver's own events. Needs monitorCommands on
 * the connection (config/database.ts). The started-command map is bounded so a stuck driver can
 * never grow it without limit.
 */
export function attachDbMonitoring(conn = mongoose.connection) {
  conn.on('error', (e: any) => { count('mongo_error'); capture({ kind: 'mongo_connection', title: `MongoDB error: ${e?.name || 'error'}`, message: String(e?.message || '').replace(/mongodb(\+srv)?:\/\/\S*/gi, '<uri>'), key: e?.name }); });
  conn.on('disconnected', () => { count('mongo_disconnected'); capture({ kind: 'mongo_connection', title: 'MongoDB disconnected', key: 'disconnected' }); });
  try {
    const client: any = conn.getClient();
    const started = new Map<number, { collection: string; name: string }>();
    client.on('commandStarted', (ev: any) => {
      const collection = String(ev.command?.[ev.commandName] ?? '');
      if (OWN.has(collection) || started.size > 5000) return;
      started.set(ev.requestId, { collection, name: ev.commandName });
    });
    client.on('commandSucceeded', (ev: any) => {
      const s = started.get(ev.requestId); started.delete(ev.requestId);
      if (!s || ev.duration < settings.slowQueryMs) return;
      count('slow_query');
      capture({ kind: 'slow_query', title: `Slow ${s.name} on ${s.collection}`, message: `${Math.round(ev.duration)} ms`, key: `${s.name}|${s.collection}` });
    });
    client.on('commandFailed', (ev: any) => { started.delete(ev.requestId); });
  } catch { /* not connected yet: connection events above still work */ }
}

// ── Reading (admin) ──────────────────────────────────────────────────────────

/** Groups a ticket is reliably linked to, and others in the same area around the same time. */
export async function errorsForTicket(t: { _id: unknown; module: string; createdAt: Date }) {
  const around = { $gte: new Date(new Date(t.createdAt).getTime() - 30 * 60_000), $lte: new Date(new Date(t.createdAt).getTime() + 30 * 60_000) };
  const [linked, nearby] = await Promise.all([
    SupportErrorGroup.find({ linkedTicketIds: t._id }).select('title kind count lastSeen status').limit(10).lean(),
    t.module !== 'other' ? SupportErrorGroup.find({ module: t.module, lastSeen: around, linkedTicketIds: { $ne: t._id }, status: { $ne: 'ignored' } }).select('title kind count lastSeen status').limit(5).lean() : [],
  ]);
  const v = (g: any) => ({ id: String(g._id), title: g.title, kind: g.kind, count: g.count, lastSeen: g.lastSeen, status: g.status });
  return { linked: linked.map(v), possiblyRelated: nearby.map(v) };
}

/** Links a new ticket to any group that saw the request id it carries. Fire and forget. */
export function linkTicket(ticketId: unknown, requestId?: string) {
  if (!requestId || !SAFE_ID.test(requestId)) return;
  void SupportErrorGroup.updateMany({ sampleRequestIds: requestId }, { $addToSet: { linkedTicketIds: ticketId } }).catch(() => undefined);
}
