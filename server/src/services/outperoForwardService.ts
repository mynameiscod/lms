import mongoose from 'mongoose';
import Lead from '../models/Lead';
import * as settings from './settingsService';

/**
 * Sending leads to Outpero, the external AI calling agent ("Jyothi"), which calls every lead it
 * receives within seconds.
 *
 * Three modes, chosen by the institute's admin (Leads → Outpero AI calls), default OFF:
 *   off    — nothing leaves the LMS. (Connecting Meta forms directly inside Outpero needs nothing here.)
 *   manual — leads are sent only when an admin picks a group and presses Send.
 *   auto   — every new lead matching the source/course filters is sent as it arrives.
 *
 * Outpero contract (its "Instant leads" screen): POST <endpoint> with header X-Outpero-Lead-Secret
 * and JSON { lead_name, phone, course, ... }. 200 = queued, 401 = wrong secret, 422 = no phone.
 * Unknown keys are accepted, so lms_lead_id travels with the lead and can come back on the call.
 *
 * Delivery state lives on the lead (`lead.outpero`), and a one-minute job sends what is due —
 * so a restart, an Outpero outage or a bulk send of hundreds never loses or floods anything.
 */

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export class OutperoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export type OutperoMode = 'off' | 'manual' | 'auto';

export interface OutperoConfig {
  mode: OutperoMode;
  endpointUrl: string;
  secretSet: boolean;
  sources: string[];
  courses: string[];
  perMinute: number;
}

const list = (v: string) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function getConfig(tenantId: string): OutperoConfig {
  const mode = settings.getStr('OUTPERO_MODE', 'off', tenantId) as OutperoMode;
  return {
    mode: ['off', 'manual', 'auto'].includes(mode) ? mode : 'off',
    endpointUrl: settings.getStr('OUTPERO_ENDPOINT_URL', '', tenantId),
    secretSet: !!settings.getStr('OUTPERO_LEAD_SECRET', '', tenantId),
    sources: list(settings.getStr('OUTPERO_SOURCES', '', tenantId)),
    courses: list(settings.getStr('OUTPERO_COURSES', '', tenantId)),
    perMinute: Math.min(Math.max(settings.getNum('OUTPERO_PER_MINUTE', 5, tenantId), 1), 60),
  };
}

export async function saveConfig(tenantId: string, userId: string, input: {
  mode?: string; endpointUrl?: string; secret?: string; sources?: string[]; courses?: string[]; perMinute?: number;
}) {
  const mode = String(input.mode || 'off');
  if (!['off', 'manual', 'auto'].includes(mode)) throw new OutperoError('Choose Off, Manual or Automatic.');
  const url = String(input.endpointUrl || '').trim();
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) throw new OutperoError('The endpoint must be an https:// address (copy it from Outpero → Instant leads → POST TO).');
  const secret = input.secret === undefined ? '__UNCHANGED__' : String(input.secret).trim();
  if (secret !== '__UNCHANGED__' && secret && secret.length < 16) throw new OutperoError('That secret looks too short — copy the whole X-Outpero-Lead-Secret value.');
  if (mode !== 'off') {
    if (!url) throw new OutperoError('Add the Outpero endpoint before turning sending on.');
    const willHaveSecret = secret === '__UNCHANGED__' ? !!settings.getStr('OUTPERO_LEAD_SECRET', '', tenantId) : !!secret;
    if (!willHaveSecret) throw new OutperoError('Add the X-Outpero-Lead-Secret before turning sending on.');
  }
  const perMinute = Math.min(Math.max(Number(input.perMinute) || 5, 1), 60);
  await settings.setMany([
    { key: 'OUTPERO_MODE', value: mode },
    { key: 'OUTPERO_ENDPOINT_URL', value: url },
    { key: 'OUTPERO_LEAD_SECRET', value: secret },
    { key: 'OUTPERO_SOURCES', value: (input.sources || []).map(String).join(',') },
    { key: 'OUTPERO_COURSES', value: (input.courses || []).map(String).join(',') },
    { key: 'OUTPERO_PER_MINUTE', value: String(perMinute) },
  ], userId, tenantId);
  return getConfig(tenantId);
}

/** Outpero wants E.164; the LMS stores whatever the source gave (10 digits, 91…, +91…, spaces). */
export function toE164(phone: string): string | null {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith('91')) return `+${d}`;
  if (d.length === 11 && d.startsWith('0')) return `+91${d.slice(1)}`;
  if (d.length >= 11 && d.length <= 15) return `+${d}`;
  return null;
}

const courseOf = (lead: any) => (Array.isArray(lead.courseInterest) ? lead.courseInterest[0] : lead.courseInterest) || '';

/** Does this lead pass the admin's source/course filters? (Empty filter = everyone.) */
export function matchesFilters(lead: { source?: string; courseInterest?: string[] | string }, cfg: Pick<OutperoConfig, 'sources' | 'courses'>): boolean {
  if (cfg.sources.length && !cfg.sources.includes(String(lead.source || ''))) return false;
  if (cfg.courses.length) {
    const have = (Array.isArray(lead.courseInterest) ? lead.courseInterest : [lead.courseInterest]).map((c) => String(c || '').toLowerCase());
    if (!cfg.courses.some((c) => have.some((h) => h.includes(c.toLowerCase())))) return false;
  }
  return true;
}

// ── Sending ──────────────────────────────────────────────────────────────────

const RETRY_MINUTES = [1, 5, 15, 60];
const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;

async function post(tenantId: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; message: string }> {
  const url = settings.getStr('OUTPERO_ENDPOINT_URL', '', tenantId);
  const secret = settings.getStr('OUTPERO_LEAD_SECRET', '', tenantId);
  if (!url || !secret) return { ok: false, status: 0, message: 'Outpero is not connected (endpoint or secret missing).' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Outpero-Lead-Secret': secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const text = (await res.text().catch(() => '')).slice(0, 300);
    const message = res.ok ? 'Accepted — Jyothi will call.'
      : res.status === 401 ? 'Outpero refused the secret (401) — copy X-Outpero-Lead-Secret again, or it was rotated.'
      : res.status === 422 ? 'Outpero needs a phone number (422).'
      : `Outpero answered ${res.status}${text ? `: ${text}` : ''}`;
    return { ok: res.ok, status: res.status, message };
  } catch (e: any) {
    return { ok: false, status: 0, message: `Could not reach Outpero (${e?.name === 'TimeoutError' ? 'timed out' : e?.message || 'network error'}).` };
  }
}

/** Attempt one lead now and record the outcome on it. */
export async function sendLead(leadId: string): Promise<void> {
  const lead: any = await Lead.findById(leadId).select('tenantId name phone source courseInterest createdBy outpero').lean();
  if (!lead || lead.outpero?.status !== 'pending') return;
  const tenantId = String(lead.tenantId);
  if (getConfig(tenantId).mode === 'off') return; // switched off since it was queued — leave it waiting

  const phone = toE164(lead.phone);
  const attempts = (lead.outpero?.attempts || 0) + 1;
  let r: { ok: boolean; status: number; message: string };
  if (!phone) r = { ok: false, status: 422, message: 'No valid phone number on this lead.' };
  else r = await post(tenantId, { lead_name: lead.name || '', phone, course: courseOf(lead), lms_lead_id: String(lead._id), source: lead.source || '' });

  // Retry only what may succeed later: network trouble, 429 and 5xx. A wrong secret or a missing phone will not fix itself.
  const retryable = !r.ok && (r.status === 0 || r.status === 429 || r.status >= 500) && attempts < MAX_ATTEMPTS && !!phone;
  const set: any = { 'outpero.attempts': attempts, 'outpero.httpStatus': r.status || 0 };
  if (r.ok) Object.assign(set, { 'outpero.status': 'sent', 'outpero.sentAt': new Date(), 'outpero.lastError': '' });
  else if (retryable) Object.assign(set, { 'outpero.status': 'pending', 'outpero.nextAttemptAt': new Date(Date.now() + RETRY_MINUTES[attempts - 1] * 60_000), 'outpero.lastError': r.message });
  else Object.assign(set, { 'outpero.status': 'failed', 'outpero.lastError': r.message });

  const update: any = { $set: set };
  // The timeline records the outcome once — not every retry.
  if (r.ok || !retryable) {
    update.$push = { activities: {
      type: 'note', createdBy: lead.createdBy, createdAt: new Date(),
      description: r.ok ? '🤖 Sent to Outpero — Jyothi (AI) will call this lead.' : `🤖 Not sent to Outpero: ${r.message}`,
    } };
  }
  await Lead.updateOne({ _id: lead._id }, update);
}

/** Called for every new lead (Lead post-save hook). Only "automatic" mode acts. */
export async function onLeadCreated(doc: any): Promise<void> {
  const tenantId = String(doc.tenantId || '');
  if (!mongoose.isValidObjectId(tenantId)) return;
  const cfg = getConfig(tenantId);
  if (cfg.mode !== 'auto' || !cfg.endpointUrl || !cfg.secretSet) return;
  if (!matchesFilters(doc, cfg)) return;
  await Lead.updateOne({ _id: doc._id, 'outpero.status': { $exists: false } },
    { $set: { outpero: { status: 'pending', via: 'auto', attempts: 0, nextAttemptAt: new Date() } } });
  await sendLead(String(doc._id));
}

/** The one-minute job: send everything due, oldest first, spaced as queued. */
export async function processDue(limit = 30): Promise<number> {
  const due: any[] = await Lead.find({ 'outpero.status': 'pending', 'outpero.nextAttemptAt': { $lte: new Date() } })
    .sort({ 'outpero.nextAttemptAt': 1 }).limit(limit).select('_id').lean();
  for (const d of due) await sendLead(String(d._id)).catch((e) => console.error('[outpero] send failed', e?.message));
  return due.length;
}

// ── Manual / bulk sending ────────────────────────────────────────────────────

export interface BulkFilter { stageIds?: string[]; sources?: string[]; courses?: string[]; includeAlreadySent?: boolean }

function bulkQuery(tenantId: string, f: BulkFilter) {
  const q: any = { tenantId: oid(tenantId), phone: { $nin: [null, ''] }, archivedAt: null };
  const stageIds = (f.stageIds || []).filter((s) => mongoose.isValidObjectId(s)).map(oid);
  if (stageIds.length) q.stageId = { $in: stageIds };
  if (f.sources?.length) q.source = { $in: f.sources };
  if (f.courses?.length) q.courseInterest = { $in: f.courses.map((c) => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) };
  // Never re-queue what is already waiting; leads already sent only when asked for.
  q['outpero.status'] = f.includeAlreadySent ? { $ne: 'pending' } : { $exists: false };
  return q;
}

export async function previewBulk(tenantId: string, f: BulkFilter) {
  const q = bulkQuery(tenantId, f);
  const [total, sample, alreadySent] = await Promise.all([
    Lead.countDocuments(q),
    Lead.find(q).select('name').sort({ createdAt: -1 }).limit(5).lean(),
    f.includeAlreadySent ? Promise.resolve(0) : Lead.countDocuments({ ...bulkQuery(tenantId, { ...f, includeAlreadySent: true }), 'outpero.status': { $in: ['sent', 'failed'] } }),
  ]);
  const perMinute = getConfig(tenantId).perMinute;
  return { total, alreadySent, sample: sample.map((s: any) => s.name), etaMinutes: Math.ceil(total / perMinute), perMinute };
}

/** Queue a group, spaced at the configured rate so Jyothi is not handed hundreds of calls at once. */
export async function startBulk(tenantId: string, f: BulkFilter) {
  const cfg = getConfig(tenantId);
  if (cfg.mode === 'off') throw new OutperoError('Sending is Off. Choose Manual or Automatic first.');
  if (!cfg.endpointUrl || !cfg.secretSet) throw new OutperoError('Connect Outpero (endpoint and secret) first.');
  const ids: any[] = await Lead.find(bulkQuery(tenantId, f)).select('_id').sort({ createdAt: 1 }).limit(5000).lean();
  if (!ids.length) throw new OutperoError('No leads match.');
  const gapMs = 60_000 / cfg.perMinute;
  const now = Date.now();
  await Lead.bulkWrite(ids.map((d, i) => ({
    updateOne: {
      filter: { _id: d._id, 'outpero.status': { $ne: 'pending' } },
      update: { $set: { outpero: { status: 'pending', via: 'bulk', attempts: 0, nextAttemptAt: new Date(now + i * gapMs) } } },
    },
  })));
  return { queued: ids.length, etaMinutes: Math.ceil(ids.length / cfg.perMinute) };
}

/** Stop a bulk send: everything still waiting is dropped (sent and failed leads keep their state). */
export async function cancelPending(tenantId: string) {
  const r = await Lead.updateMany({ tenantId: oid(tenantId), 'outpero.status': 'pending' }, { $unset: { outpero: '' } });
  return { cancelled: r.modifiedCount };
}

// ── Status & test ────────────────────────────────────────────────────────────

export async function stats(tenantId: string) {
  const tid = oid(tenantId);
  const [byStatus, failures, sentToday] = await Promise.all([
    Lead.aggregate([{ $match: { tenantId: tid, 'outpero.status': { $exists: true } } }, { $group: { _id: '$outpero.status', n: { $sum: 1 } } }]),
    Lead.find({ tenantId: tid, 'outpero.status': 'failed' }).sort({ updatedAt: -1 }).limit(10).select('name phone outpero.lastError updatedAt').lean(),
    Lead.countDocuments({ tenantId: tid, 'outpero.sentAt': { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
  ]);
  const counts: Record<string, number> = { pending: 0, sent: 0, failed: 0 };
  for (const b of byStatus as any[]) counts[b._id] = b.n;
  return {
    counts, sentToday,
    failures: failures.map((l: any) => ({ _id: String(l._id), name: l.name, phone: l.phone, error: l.outpero?.lastError, at: l.updatedAt })),
  };
}

/** Send one test lead (e.g. your own number) without touching any lead record. Jyothi will really call it. */
export async function testSend(tenantId: string, input: { name?: string; phone?: string }) {
  const phone = toE164(String(input.phone || ''));
  if (!phone) throw new OutperoError('Enter a valid mobile number for the test call.');
  return post(tenantId, { lead_name: String(input.name || 'Test lead').slice(0, 80), phone, course: 'Test', source: 'lms_test' });
}

/** Put failed leads back in the queue (after fixing the secret, say). */
export async function retryFailed(tenantId: string) {
  const r = await Lead.updateMany({ tenantId: oid(tenantId), 'outpero.status': 'failed', phone: { $nin: [null, ''] } },
    { $set: { 'outpero.status': 'pending', 'outpero.attempts': 0, 'outpero.nextAttemptAt': new Date() } });
  return { requeued: r.modifiedCount };
}
