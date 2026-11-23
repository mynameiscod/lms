import axios from 'axios';
import crypto from 'crypto';
import mongoose from 'mongoose';
import CallyzerCall from '../models/CallyzerCall';
import Lead from '../models/Lead';
import User from '../models/User';
import SystemSetting from '../models/SystemSetting';
import * as settings from './settingsService';
import * as bunny from './bunnyStorageService';
import { runWithTenant } from './requestContext';
import { onCallLogged } from './leadAutomationService';

/**
 * Callyzer → CRM. Callyzer is an app on each counsellor's phone that reads the call log and uploads
 * the recordings the phone makes (docs: https://developers.callyzer.co/v2.3/).
 *
 * Calls arrive two ways: Callyzer's webhook (a call log as the phone syncs it) and a sync job that
 * asks the API for recently synced calls (catches anything the webhook missed, and recordings,
 * which often arrive after the call log). Either way a call to or from one of our leads lands on
 * that lead; every other number is ignored and never stored.
 *
 * A counsellor who pressed Call in the CRM already has a "Call started" entry on the lead: the
 * phone call completes that entry (talk time, outcome, recording) instead of adding a second one.
 */

const oid = (id: any) => new mongoose.Types.ObjectId(String(id));

export const KEYS = {
  enabled: 'CALLYZER_ENABLED',
  env: 'CALLYZER_ENV',
  apiKey: 'CALLYZER_API_KEY',
  keepRecordings: 'CALLYZER_KEEP_RECORDINGS',
  webhookToken: 'CALLYZER_WEBHOOK_TOKEN',
  mediaKey: 'CALLYZER_MEDIA_KEY',
  employeeMap: 'CALLYZER_EMPLOYEE_MAP',
  cursor: 'CALLYZER_SYNC_CURSOR',
  lastSync: 'CALLYZER_LAST_SYNC',
  lastDelivery: 'CALLYZER_LAST_DELIVERY',
} as const;

const BASE_URL = {
  sandbox: 'https://sandbox.api.callyzer.co/api/v2.3',
  production: 'https://api1.callyzer.co/api/v2.3',
} as const;
export type CallyzerEnv = keyof typeof BASE_URL;

/** Callyzer's call date and time are in the account's timezone; ours is India. */
const TZ_OFFSET_MS = 5.5 * 3600_000;
/** How far apart a Call-button press and the phone's call may be and still be the same call. */
const CLICK_BEFORE_MS = 10 * 60_000;
const CLICK_AFTER_MS = 3 * 60_000;
const MAX_RECORDING_BYTES = 60 * 1024 * 1024;
const MAX_PAGES = 30;

export class CallyzerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface CallyzerConfig {
  enabled: boolean;
  env: CallyzerEnv;
  apiKeySet: boolean;
  keepRecordings: boolean;
  storageReady: boolean;
}

export function getConfig(tenantId: string): CallyzerConfig {
  const env = settings.getStr(KEYS.env, 'sandbox', tenantId);
  return {
    enabled: settings.getStr(KEYS.enabled, 'off', tenantId) === 'on',
    env: env === 'production' ? 'production' : 'sandbox',
    apiKeySet: !!settings.getStr(KEYS.apiKey, '', tenantId),
    keepRecordings: settings.getStr(KEYS.keepRecordings, 'on', tenantId) !== 'off',
    storageReady: bunny.isBunnyStorageConfigured(),
  };
}

export async function saveConfig(tenantId: string, userId: string, input: { enabled?: boolean; env?: string; apiKey?: string; keepRecordings?: boolean }) {
  const env = input.env === 'production' ? 'production' : 'sandbox';
  const apiKey = input.apiKey === undefined || input.apiKey === null ? '__UNCHANGED__' : String(input.apiKey).trim();
  if (apiKey !== '__UNCHANGED__' && apiKey && apiKey.length < 20) throw new CallyzerError('That API key looks too short. Copy the whole key from Callyzer → Connectors → API & Webhook → API Config.');
  const willHaveKey = apiKey === '__UNCHANGED__' ? !!settings.getStr(KEYS.apiKey, '', tenantId) : !!apiKey;
  if (input.enabled && !willHaveKey) throw new CallyzerError('Add the API key before switching the integration on.');
  const envChanged = env !== getConfig(tenantId).env;
  await settings.setMany([
    { key: KEYS.enabled, value: input.enabled ? 'on' : 'off' },
    { key: KEYS.env, value: env },
    { key: KEYS.apiKey, value: apiKey },
    { key: KEYS.keepRecordings, value: input.keepRecordings === false ? 'off' : 'on' },
    // A different Callyzer account (sandbox ↔ production) starts its own sync from now.
    ...(envChanged || (apiKey !== '__UNCHANGED__' && apiKey) ? [{ key: KEYS.cursor, value: '' }] : []),
  ], userId, tenantId);
  return getConfig(tenantId);
}

const readJson = <T>(key: string, tenantId: string, fallback: T): T => {
  try { return JSON.parse(settings.getStr(key, '', tenantId)) as T; } catch { return fallback; }
};
const writeJson = (key: string, tenantId: string, value: unknown) =>
  settings.setMany([{ key, value: JSON.stringify(value) }], undefined, tenantId).catch((e) => console.error('[callyzer] could not save', key, e?.message));

export interface SyncStatus { at: string; ok: boolean; message: string; received?: number; matched?: number; ignored?: number; running?: boolean }
export const lastSync = (tenantId: string) => readJson<SyncStatus | null>(KEYS.lastSync, tenantId, null);

/** Which header names the last webhook delivery carried (never their values) — to learn how Callyzer sends the secret. */
export interface DeliveryInfo { at: string; headerNames: string[]; employees: number; calls: number; matched: number }
export const lastDelivery = (tenantId: string) => readJson<DeliveryInfo | null>(KEYS.lastDelivery, tenantId, null);

// ── Webhook address ──────────────────────────────────────────────────────────

const publicBase = () => (settings.getStr('API_PUBLIC_URL', '') || settings.getStr('FRONTEND_URL', 'https://platform.codebegun.com')).replace(/\/$/, '');

export async function webhookFor(tenantId: string, userId: string, rotate = false) {
  let token = settings.getStr(KEYS.webhookToken, '', tenantId);
  if (!token || rotate) {
    token = crypto.randomBytes(24).toString('base64url');
    await settings.setMany([{ key: KEYS.webhookToken, value: token }], userId, tenantId);
  }
  return { url: `${publicBase()}/api/v1/public/callyzer/webhook/${token}`, rotated: rotate };
}

export const tenantForToken = (token: string) => (token && token.length >= 24 ? settings.tenantWithValue(KEYS.webhookToken, token) : null);

// ── Recording links ──────────────────────────────────────────────────────────
// The lead page plays a recording with a plain <audio src>, which cannot send a login. So the
// link itself is the permission: it carries a signature only the server can make, and only people
// who can open the lead ever see it.

async function mediaKey(tenantId: string): Promise<string> {
  let key = settings.getStr(KEYS.mediaKey, '', tenantId);
  if (!key) {
    key = crypto.randomBytes(32).toString('base64url');
    await settings.setMany([{ key: KEYS.mediaKey, value: key }], undefined, tenantId);
  }
  return key;
}
const sign = (key: string, callDocId: string) => crypto.createHmac('sha256', key).update(callDocId).digest('hex').slice(0, 32);

export async function recordingPathFor(tenantId: string, callDocId: string) {
  return `/api/v1/public/callyzer/recordings/${callDocId}/${sign(await mediaKey(tenantId), callDocId)}`;
}

/** The call behind a signed recording link, or null when the link is wrong. */
export async function callForRecordingLink(callDocId: string, sig: string) {
  if (!mongoose.isValidObjectId(callDocId) || !/^[a-f0-9]{32}$/.test(sig)) return null;
  const call: any = await CallyzerCall.findById(callDocId).select('tenantId recordingKey recordingUrl').lean();
  if (!call) return null;
  const key = settings.getStr(KEYS.mediaKey, '', String(call.tenantId));
  if (!key) return null;
  const want = Buffer.from(sign(key, callDocId));
  const got = Buffer.from(sig);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? call : null;
}

// ── Talking to Callyzer ──────────────────────────────────────────────────────
// One request per two seconds per account (their limit); a 429 waits and tries once more.

const nextSlot = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitTurn(tenantId: string) {
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(tenantId) || 0);
  nextSlot.set(tenantId, at + 2100);
  if (at > now) await sleep(at - now);
}

export async function api<T = any>(tenantId: string, method: 'GET' | 'POST', path: string, body?: any): Promise<{ result: T; total_records?: number; message?: string }> {
  const cfg = getConfig(tenantId);
  const key = settings.getStr(KEYS.apiKey, '', tenantId);
  if (!key) throw new CallyzerError('The Callyzer API key is not set.');
  for (let attempt = 0; attempt < 2; attempt++) {
    await waitTurn(tenantId);
    try {
      const r = await axios.request({
        method, url: BASE_URL[cfg.env] + path, data: body ?? {},
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
      return r.data;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 429 && attempt === 0) {
        const wait = Math.min(Number(e.response.headers?.['retry-after']) || 3, 30);
        await sleep(wait * 1000);
        continue;
      }
      const msg = e?.response?.data?.message || e?.message || 'Callyzer did not answer';
      if (status === 401) throw new CallyzerError('Callyzer refused the API key (401). Generate a new key and paste it again.', 400);
      if (status === 403) throw new CallyzerError(`Callyzer said no (403): ${msg}`, 400);
      throw new CallyzerError(`Callyzer: ${msg}`, status && status < 500 ? 400 : 502);
    }
  }
  throw new CallyzerError('Callyzer is busy (too many requests). Try again in a minute.', 429);
}

// ── Reading a call ───────────────────────────────────────────────────────────

export interface NormCall {
  callyzerId: string;
  empName?: string; empNumber?: string;
  clientName?: string; clientNumber?: string;
  callType?: string;
  durationSec: number; ringingSec?: number;
  callAt?: Date;
  note?: string; crmStatus?: string;
  recordingUrl?: string;
}

const s = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined; };
export const last10 = (v?: string) => String(v || '').replace(/\D/g, '').slice(-10);

/** "2026-11-23" + "17:49:41", in Indian time → the moment. */
export function callMoment(date?: string, time?: string): Date | undefined {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').trim());
  if (!d) return undefined;
  const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time || '').trim()) || [];
  const ms = Date.UTC(+d[1], +d[2] - 1, +d[3], +(t[1] || 0), +(t[2] || 0), +(t[3] || 0)) - TZ_OFFSET_MS;
  return Number.isNaN(ms) ? undefined : new Date(ms);
}

/** One call log row, from the API (flat, with emp_*) or from the webhook (inside its employee). */
export function normalise(row: any, emp?: any): NormCall | null {
  const id = s(row?.id);
  if (!id) return null;
  const e = emp || row;
  return {
    callyzerId: id,
    empName: s(e.emp_name), empNumber: s(e.emp_number),
    clientName: s(row.client_name), clientNumber: s(row.client_number),
    callType: s(row.call_type),
    durationSec: num(row.duration) ?? 0,
    ringingSec: num(row.ringing_time),
    callAt: callMoment(row.call_date, row.call_time),
    note: s(row.note), crmStatus: s(row.crm_status),
    recordingUrl: /^https?:\/\//i.test(String(row.call_recording_url || row.recordingURL || '')) ? String(row.call_recording_url || row.recordingURL) : undefined,
  };
}

/** The webhook body: a list of employees, each with its call_logs. */
export function callsFromWebhook(body: any): NormCall[] {
  const emps = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : body && typeof body === 'object' ? [body] : [];
  const out: NormCall[] = [];
  for (const emp of emps) {
    const logs = Array.isArray(emp?.call_logs) ? emp.call_logs : Array.isArray(emp?.logs) ? emp.logs : [];
    for (const row of logs) {
      const c = normalise(row, emp);
      if (c) out.push(c);
    }
  }
  return out;
}

export type Direction = 'outgoing' | 'incoming' | 'missed';
export function directionOf(c: NormCall): Direction {
  const t = String(c.callType || '').toLowerCase();
  if (t.startsWith('out')) return 'outgoing';
  if (t.startsWith('in') && c.durationSec > 0) return 'incoming';
  return 'missed'; // Missed, Rejected, or an incoming call with no talk time
}

/** What a person would have picked in "How did the call go?". Missed incoming calls have none. */
export function autoOutcome(c: NormCall): 'connected' | 'not_answered' | undefined {
  const dir = directionOf(c);
  if (dir === 'missed') return undefined;
  return c.durationSec > 0 ? 'connected' : 'not_answered';
}

export const talkTime = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);

export function describe(c: NormCall, who?: string): string {
  const dir = directionOf(c);
  const from = who ? ` from ${who}'s phone` : '';
  const note = c.note ? ` Note: ${c.note.slice(0, 500)}` : '';
  if (dir === 'missed') return `📵 Missed call from the lead${from ? ` (to ${who}'s phone)` : ''}.${note}`;
  if (dir === 'incoming') return `📱 Incoming call · ${talkTime(c.durationSec)}${from}.${note}`;
  return c.durationSec > 0 ? `📱 Phone call · ${talkTime(c.durationSec)}${from}.${note}` : `📱 Phone call · not answered${from}.${note}`;
}

// ── Who is who ───────────────────────────────────────────────────────────────

/** Callyzer phone (last 10 digits) → staff user id, set by an admin; wins over the automatic match. */
export const employeeOverrides = (tenantId: string) => readJson<Record<string, string>>(KEYS.employeeMap, tenantId, {});

export async function saveEmployeeOverride(tenantId: string, userId: string, empNumber: string, staffId: string | null) {
  const ten = last10(empNumber);
  if (ten.length !== 10) throw new CallyzerError('That phone number is not valid.');
  const map = employeeOverrides(tenantId);
  if (staffId) {
    if (!mongoose.isValidObjectId(staffId)) throw new CallyzerError('Choose a staff member.');
    const ok = await User.exists({ _id: oid(staffId), tenantId: oid(tenantId), role: { $ne: 'STUDENT' } });
    if (!ok) throw new CallyzerError('That staff member was not found.');
    map[ten] = staffId;
  } else delete map[ten];
  await settings.setMany([{ key: KEYS.employeeMap, value: JSON.stringify(map) }], userId, tenantId);
  return map;
}

/** Staff phone (last 10 digits) → user, from the people's own profiles. */
async function staffByPhone(tenantId: string): Promise<Map<string, { id: string; name: string }>> {
  const users: any[] = await User.find({ tenantId: oid(tenantId), role: { $ne: 'STUDENT' }, phone: { $nin: [null, ''] } }).select('firstName lastName phone').lean();
  const m = new Map<string, { id: string; name: string }>();
  for (const u of users) {
    const ten = last10(u.phone);
    if (ten.length === 10 && !m.has(ten)) m.set(ten, { id: String(u._id), name: `${u.firstName || ''} ${u.lastName || ''}`.trim() });
  }
  return m;
}

async function resolver(tenantId: string) {
  const byPhone = await staffByPhone(tenantId);
  const overrides = employeeOverrides(tenantId);
  return (empNumber?: string): string | null => {
    const ten = last10(empNumber);
    if (ten.length !== 10) return null;
    return overrides[ten] || byPhone.get(ten)?.id || null;
  };
}

// ── Putting a call on its lead ───────────────────────────────────────────────

async function findLead(tenantId: string, c: NormCall, userId: string | null) {
  const ten = last10(c.clientNumber);
  if (ten.length !== 10) return null;
  const q: any = { tenantId: oid(tenantId), phone: new RegExp(`${ten}$`) };
  const sel = '_id createdBy assignedTo assignment';
  if (userId) {
    const mine = await Lead.findOne({ ...q, $or: [{ assignedTo: oid(userId) }, { 'assignment.assignedTo': oid(userId) }] }).sort({ createdAt: -1 }).select(sel).lean();
    if (mine) return mine;
  }
  return Lead.findOne(q).sort({ archivedAt: 1, createdAt: -1 }).select(sel).lean();
}

export interface IngestResult { received: number; matched: number; ignored: number }

/** Store and show a batch of calls. Calls whose other number is not a lead are dropped. */
export async function ingest(tenantId: string, calls: NormCall[], source: 'webhook' | 'api'): Promise<IngestResult> {
  const res: IngestResult = { received: calls.length, matched: 0, ignored: 0 };
  if (!calls.length) return res;
  const who = await resolver(tenantId);
  for (const c of calls) {
    try {
      const done = await ingestOne(tenantId, c, source, who);
      if (done) res.matched++; else res.ignored++;
    } catch (e: any) {
      console.error('[callyzer] call', c.callyzerId, e?.message);
      res.ignored++;
    }
  }
  return res;
}

async function ingestOne(tenantId: string, c: NormCall, source: 'webhook' | 'api', who: (n?: string) => string | null): Promise<boolean> {
  const tid = oid(tenantId);
  const existing: any = await CallyzerCall.findOne({ tenantId: tid, callyzerId: c.callyzerId }).lean();
  const userId = existing?.userId ? String(existing.userId) : who(c.empNumber);
  const lead: any = existing ? { _id: existing.leadId } : await findLead(tenantId, c, userId);
  if (!lead) return false;

  const $set: any = {
    leadId: lead._id, userId: userId ? oid(userId) : null,
    empNumber: c.empNumber, empName: c.empName, clientNumber: c.clientNumber, clientName: c.clientName,
    callType: c.callType, durationSec: c.durationSec, ringingSec: c.ringingSec, callAt: c.callAt,
    note: c.note, crmStatus: c.crmStatus, source: existing?.source || source,
  };
  if (c.recordingUrl) $set.recordingUrl = c.recordingUrl;
  for (const k of Object.keys($set)) if ($set[k] === undefined) delete $set[k];
  const call: any = await CallyzerCall.findOneAndUpdate(
    { tenantId: tid, callyzerId: c.callyzerId },
    { $set, $inc: { deliveries: 1 }, $setOnInsert: { tenantId: tid, callyzerId: c.callyzerId } },
    { upsert: true, new: true },
  ).lean();

  if (!call.activityId) await attach(tenantId, call, c);
  else await refreshActivity(tenantId, call, c);

  if (call.recordingUrl || c.recordingUrl) {
    const fresh: any = await CallyzerCall.findById(call._id).select('recordingUrl recordingKey recordingAttempts').lean();
    if (fresh?.recordingUrl && !fresh.recordingKey && getConfig(tenantId).keepRecordings && (fresh.recordingAttempts || 0) < 5) {
      void saveRecording(tenantId, call._id);
    }
  }
  return true;
}

/** First time we see this call: complete the matching Call-button entry, or add one. */
async function attach(tenantId: string, call: any, c: NormCall) {
  const tid = oid(tenantId);
  const actId = new mongoose.Types.ObjectId();
  // Claim the call first, so a webhook and the sync job arriving together never both add it.
  const claimed = await CallyzerCall.updateOne({ _id: call._id, activityId: null }, { $set: { activityId: actId } });
  if (!claimed.modifiedCount) return;

  const dir = directionOf(c);
  const outcome = autoOutcome(c);
  const recordingUrl = call.recordingUrl ? await recordingPathFor(tenantId, String(call._id)) : undefined;
  const userId = call.userId ? String(call.userId) : null;
  const at = c.callAt || new Date();
  const whoName = !userId ? c.empName : undefined;

  // 1) The counsellor pressed Call shortly before: that entry becomes this call.
  if (dir === 'outgoing') {
    const lead: any = await Lead.findOne({ _id: call.leadId, tenantId: tid }).select('activities').lean();
    const from = at.getTime() - CLICK_BEFORE_MS;
    const to = at.getTime() + CLICK_AFTER_MS;
    const candidates = (lead?.activities || []).filter((a: any) =>
      a.type === 'call' && (a.metadata?.dialed === true || a.metadata?.startedAt) && !a.metadata?.callyzerId &&
      (!userId || String(a.createdBy) === userId) &&
      new Date(a.createdAt).getTime() >= from && new Date(a.createdAt).getTime() <= to)
      .sort((x: any, y: any) => Math.abs(+new Date(x.createdAt) - at.getTime()) - Math.abs(+new Date(y.createdAt) - at.getTime()));
    for (const a of candidates) {
      const humanOutcome = !!a.callOutcome;
      const set: any = {
        'activities.$.callDuration': c.durationSec,
        'activities.$.metadata.callyzerId': c.callyzerId,
        'activities.$.metadata.callyzerCallId': String(call._id),
      };
      if (recordingUrl) set['activities.$.recordingUrl'] = recordingUrl;
      if (!humanOutcome) {
        set['activities.$.description'] = describe(c, whoName);
        set['activities.$.metadata.dialed'] = false;
        set['activities.$.metadata.startedAt'] = a.createdAt;
        set['activities.$.metadata.callyzerAutoOutcome'] = true;
        if (outcome) set['activities.$.callOutcome'] = outcome;
        if (outcome) set.lastCallOutcome = outcome;
      }
      if (outcome === 'connected') set.lastContactedAt = at;
      const r = await Lead.updateOne(
        { _id: call.leadId, tenantId: tid, activities: { $elemMatch: { _id: a._id, 'metadata.callyzerId': { $exists: false } } } },
        { $set: set },
      );
      if (r.modifiedCount) {
        await CallyzerCall.updateOne({ _id: call._id }, { $set: { activityId: a._id, matchedBy: 'click' } });
        if (!humanOutcome && outcome) onCallLogged(tenantId, call.leadId, outcome, a._id).catch(() => {});
        return;
      }
    }
  }

  // 2) Its own entry.
  const lead: any = await Lead.findOne({ _id: call.leadId, tenantId: tid }).select('createdBy assignedTo assignment').lean();
  const by = userId || lead?.assignedTo || lead?.assignment?.assignedTo || lead?.createdBy;
  const activity: any = {
    _id: actId, type: 'call', description: describe(c, whoName), createdBy: by, createdAt: at,
    callDuration: c.durationSec,
    metadata: { callyzerId: c.callyzerId, callyzerCallId: String(call._id), direction: dir, ...(outcome ? { callyzerAutoOutcome: true } : {}), ...(dir === 'missed' ? { automation: 'callyzer-missed' } : {}) },
  };
  if (outcome) activity.callOutcome = outcome;
  if (recordingUrl) activity.recordingUrl = recordingUrl;
  const update: any = { $push: { activities: activity } };
  if (dir !== 'missed') {
    update.$max = { 'telecallerMetrics.lastActionAt': at, ...(outcome === 'connected' ? { lastContactedAt: at } : {}) };
    update.$min = { 'telecallerMetrics.firstActionAt': at, ...(dir === 'outgoing' ? { 'telecallerMetrics.firstCallAt': at } : {}) };
    update.$inc = { 'telecallerMetrics.totalActions': 1 };
    if (outcome) update.$set = { lastCallOutcome: outcome };
  }
  await Lead.updateOne({ _id: call.leadId, tenantId: tid }, update);
  await CallyzerCall.updateOne({ _id: call._id }, { $set: { matchedBy: 'new' } });
  if (outcome) onCallLogged(tenantId, call.leadId, outcome, actId).catch(() => {});
}

/** A later delivery of a call already on the lead: the recording or talk time may be new. */
async function refreshActivity(tenantId: string, call: any, c: NormCall) {
  const set: any = {};
  if (call.recordingUrl) set['activities.$.recordingUrl'] = await recordingPathFor(tenantId, String(call._id));
  if (c.durationSec) set['activities.$.callDuration'] = c.durationSec;
  if (!Object.keys(set).length) return;
  await Lead.updateOne({ _id: call.leadId, tenantId: oid(tenantId), 'activities._id': call.activityId }, { $set: set });
}

// ── Recordings ───────────────────────────────────────────────────────────────

export const recordingKeyFor = (tenantId: string, callyzerId: string) => `callyzer-recordings/${tenantId}/${callyzerId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

/** Keep our own copy of the recording. Never blocks or fails the call itself. */
export async function saveRecording(tenantId: string, callDocId: any): Promise<boolean> {
  const call: any = await CallyzerCall.findById(callDocId).select('callyzerId recordingUrl recordingKey').lean();
  const fail = async (why: string) => { await CallyzerCall.updateOne({ _id: callDocId }, { $set: { recordingError: why }, $inc: { recordingAttempts: 1 } }).catch(() => {}); return false; };
  try {
    if (!call?.recordingUrl || call.recordingKey) return false;
    if (!bunny.isBunnyStorageConfigured()) return false;
    let r = await fetch(call.recordingUrl, { signal: AbortSignal.timeout(60_000) });
    if (r.status === 401 || r.status === 403) {
      // In case Callyzer's media links want the same key as the API.
      r = await fetch(call.recordingUrl, { headers: { Authorization: `Bearer ${settings.getStr(KEYS.apiKey, '', tenantId)}` }, signal: AbortSignal.timeout(60_000) });
    }
    if (!r.ok) return fail(`Callyzer recording answered ${r.status}`);
    if (Number(r.headers.get('content-length') || 0) > MAX_RECORDING_BYTES) return fail('The recording is larger than 60 MB.');
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > MAX_RECORDING_BYTES) return fail('The recording was empty or too large.');
    const key = recordingKeyFor(tenantId, call.callyzerId);
    await bunny.uploadFile(key, buf, r.headers.get('content-type') || 'audio/mpeg');
    await CallyzerCall.updateOne({ _id: callDocId }, { $set: { recordingKey: key }, $unset: { recordingError: '' } });
    return true;
  } catch (e: any) {
    console.error('[callyzer-recording]', e?.message);
    return fail(String(e?.message || 'failed').slice(0, 200));
  }
}

// ── Webhook ──────────────────────────────────────────────────────────────────

export async function receiveWebhook(tenantId: string, body: any, headers: Record<string, any>) {
  const calls = callsFromWebhook(body);
  const r = getConfig(tenantId).enabled ? await ingest(tenantId, calls, 'webhook') : { received: calls.length, matched: 0, ignored: calls.length };
  const emps = Array.isArray(body) ? body.length : body ? 1 : 0;
  void writeJson(KEYS.lastDelivery, tenantId, {
    at: new Date().toISOString(), employees: emps, calls: calls.length, matched: r.matched,
    headerNames: Object.keys(headers || {}).filter((h) => !/^(x-forwarded|x-real-ip|cf-|connection|accept-encoding|content-length)/i.test(h)).sort(),
  } satisfies DeliveryInfo);
  return r;
}

// ── Sync from the API ────────────────────────────────────────────────────────

/** Calls in a window, page by page. `by` = when the call happened or when the phone synced it. */
export async function fetchCalls(tenantId: string, fromSec: number, toSec: number, by: 'call' | 'synced'): Promise<NormCall[]> {
  const out: NormCall[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await api<any[]>(tenantId, 'POST', '/call-log/history', {
      [`${by === 'call' ? 'call' : 'synced'}_from`]: Math.floor(fromSec),
      [`${by === 'call' ? 'call' : 'synced'}_to`]: Math.floor(toSec),
      call_method: 'PhoneCall', call_mode: 'Voice',
      page_no: page, page_size: 100,
    });
    const rows = Array.isArray(r?.result) ? r.result : [];
    for (const row of rows) { const c = normalise(row); if (c) out.push(c); }
    if (rows.length < 100 || out.length >= Number(r?.total_records || 0)) break;
  }
  return out;
}

/** Calls that were answered but had no recording yet: ask Callyzer again (20 at a time). */
async function refreshMissingRecordings(tenantId: string): Promise<number> {
  const pending: any[] = await CallyzerCall.find({
    tenantId: oid(tenantId), durationSec: { $gt: 0 }, recordingUrl: { $in: [null, ''] },
    refreshAttempts: { $lt: 6 }, createdAt: { $gte: new Date(Date.now() - 48 * 3600_000) },
  }).sort({ createdAt: 1 }).limit(40).select('callyzerId').lean();
  let found = 0;
  for (let i = 0; i < pending.length; i += 20) {
    const chunk = pending.slice(i, i + 20);
    await CallyzerCall.updateMany({ _id: { $in: chunk.map((p) => p._id) } }, { $inc: { refreshAttempts: 1 } });
    const r = await api<any[]>(tenantId, 'POST', '/call-log/get', { unique_ids: chunk.map((p) => p.callyzerId) });
    const calls = (Array.isArray(r?.result) ? r.result : []).map((row: any) => normalise(row)).filter((c: NormCall | null): c is NormCall => !!c && !!c.recordingUrl);
    found += (await ingest(tenantId, calls, 'api')).matched;
  }
  return found;
}

/** Recordings whose copy failed or was not made yet. */
async function retryRecordingCopies(tenantId: string) {
  if (!getConfig(tenantId).keepRecordings || !bunny.isBunnyStorageConfigured()) return;
  const rows: any[] = await CallyzerCall.find({
    tenantId: oid(tenantId), recordingUrl: { $nin: [null, ''] }, recordingKey: { $in: [null, ''] }, recordingAttempts: { $lt: 5 },
    updatedAt: { $lte: new Date(Date.now() - 60_000) },
  }).limit(10).select('_id').lean();
  for (const r of rows) await saveRecording(tenantId, r._id);
}

const running = new Set<string>();

/** The regular sync: calls the phones synced since last time (with overlap), then the stragglers. */
export async function syncTenant(tenantId: string): Promise<SyncStatus> {
  if (running.has(tenantId)) return { at: new Date().toISOString(), ok: true, message: 'A sync is already running.', running: true };
  running.add(tenantId);
  const now = Math.floor(Date.now() / 1000);
  try {
    const cursor = Number(settings.getStr(KEYS.cursor, '', tenantId)) || 0;
    const from = cursor ? cursor - 30 * 60 : now - 3600;
    const calls = await fetchCalls(tenantId, from, now, 'synced');
    const r = await ingest(tenantId, calls, 'api');
    await settings.setMany([{ key: KEYS.cursor, value: String(now) }], undefined, tenantId);
    const more = await refreshMissingRecordings(tenantId).catch((e) => { console.error('[callyzer] refresh', e?.message); return 0; });
    await retryRecordingCopies(tenantId).catch(() => {});
    const status: SyncStatus = { at: new Date().toISOString(), ok: true, message: `Checked ${r.received} calls: ${r.matched} with leads${more ? `, ${more} recordings arrived` : ''}.`, ...r };
    await writeJson(KEYS.lastSync, tenantId, status);
    return status;
  } catch (e: any) {
    const status: SyncStatus = { at: new Date().toISOString(), ok: false, message: e?.message || 'Sync failed' };
    await writeJson(KEYS.lastSync, tenantId, status);
    return status;
  } finally {
    running.delete(tenantId);
  }
}

/** "Fetch the last N days" from the admin page — by call time, runs in the background. */
export function backfill(tenantId: string, days: number) {
  const d = Math.min(Math.max(Math.round(days) || 1, 1), 30);
  if (running.has(tenantId)) throw new CallyzerError('A sync is already running. Try again in a minute.', 409);
  running.add(tenantId);
  const now = Math.floor(Date.now() / 1000);
  void writeJson(KEYS.lastSync, tenantId, { at: new Date().toISOString(), ok: true, running: true, message: `Fetching the last ${d} day${d > 1 ? 's' : ''}…` });
  void runWithTenant(tenantId, async () => {
    try {
      const calls = await fetchCalls(tenantId, now - d * 86400, now, 'call');
      const r = await ingest(tenantId, calls, 'api');
      await writeJson(KEYS.lastSync, tenantId, { at: new Date().toISOString(), ok: true, message: `Last ${d} day${d > 1 ? 's' : ''}: ${r.received} calls checked, ${r.matched} with leads.`, ...r });
    } catch (e: any) {
      await writeJson(KEYS.lastSync, tenantId, { at: new Date().toISOString(), ok: false, message: e?.message || 'Fetch failed' });
    } finally {
      running.delete(tenantId);
    }
  });
  return { started: true, days: d };
}

/** Every institute with the integration switched on. Runs from the job runner every 10 minutes. */
export async function syncAll() {
  const rows: any[] = await SystemSetting.find({ key: KEYS.enabled, value: 'on', tenantId: { $ne: null } }).select('tenantId').lean();
  for (const row of rows) {
    const tenantId = String(row.tenantId);
    if (!getConfig(tenantId).enabled || !getConfig(tenantId).apiKeySet) continue;
    await runWithTenant(tenantId, () => syncTenant(tenantId)).catch((e) => console.error('[callyzer] sync', tenantId, e?.message));
  }
}

// ── For the admin page ───────────────────────────────────────────────────────

export async function testConnection(tenantId: string) {
  const r = await api<any[]>(tenantId, 'GET', '/employee/get', { page_no: 1, page_size: 1 });
  return { ok: true, employees: Number(r?.total_records ?? (Array.isArray(r?.result) ? r.result.length : 0)), env: getConfig(tenantId).env };
}

/** The phones registered in Callyzer, each with the staff member its calls are put under. */
export async function employees(tenantId: string) {
  const list: any[] = [];
  for (let page = 1; page <= 5; page++) {
    const r = await api<any[]>(tenantId, 'GET', '/employee/get', { page_no: page, page_size: 100 });
    const rows = Array.isArray(r?.result) ? r.result : [];
    list.push(...rows);
    if (rows.length < 100) break;
  }
  const byPhone = await staffByPhone(tenantId);
  const overrides = employeeOverrides(tenantId);
  const staff: any[] = await User.find({ tenantId: oid(tenantId), role: { $ne: 'STUDENT' }, isActive: { $ne: false } }).select('firstName lastName email phone role').sort({ firstName: 1 }).lean();
  const nameOf = new Map(staff.map((u) => [String(u._id), `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));
  return {
    staff: staff.map((u) => ({ _id: String(u._id), name: nameOf.get(String(u._id)), phone: u.phone || '' })),
    employees: list.map((e) => {
      const ten = last10(e.emp_number);
      const override = overrides[ten];
      const auto = byPhone.get(ten);
      const staffId = override || auto?.id || null;
      return {
        empName: e.emp_name, empNumber: e.emp_number, ten,
        recordingOn: !!e.is_call_recording_active, appUninstalled: !!e.device_preference?.is_app_uninstalled,
        lastCallAt: e.last_call_at || null, lastSyncAt: e.last_sync_req_at || null, appVersion: e.app_version || null,
        staffId, staffName: staffId ? nameOf.get(staffId) || 'Unknown user' : null, matchedBy: override ? 'admin' : auto ? 'profile' : null,
      };
    }),
  };
}

export async function recentCalls(tenantId: string, limit = 30) {
  const tid = oid(tenantId);
  const [rows, total, withRecording] = await Promise.all([
    CallyzerCall.find({ tenantId: tid }).sort({ callAt: -1 }).limit(limit)
      .populate('leadId', 'name phone').populate('userId', 'firstName lastName').lean(),
    CallyzerCall.countDocuments({ tenantId: tid }),
    CallyzerCall.countDocuments({ tenantId: tid, recordingUrl: { $nin: [null, ''] } }),
  ]);
  return {
    total, withRecording,
    rows: await Promise.all(rows.map(async (c: any) => ({
      _id: String(c._id),
      lead: c.leadId ? { _id: String(c.leadId._id), name: c.leadId.name, phone: c.leadId.phone } : null,
      counsellor: c.userId ? `${c.userId.firstName || ''} ${c.userId.lastName || ''}`.trim() : c.empName ? `${c.empName} (not matched)` : 'Not matched',
      direction: directionOf(c as any), durationSec: c.durationSec || 0, at: c.callAt || c.createdAt,
      matchedBy: c.matchedBy, recording: c.recordingKey ? 'saved' : c.recordingUrl ? 'callyzer' : c.durationSec > 0 ? 'waiting' : 'none',
      recordingError: c.recordingError || null,
      recordingUrl: c.recordingUrl ? await recordingPathFor(tenantId, String(c._id)) : null,
    }))),
  };
}
