import { getPolicy, inCallingWindow, CALL_FROM_HOUR, CALL_TO_HOUR } from './outperoPolicyService';
import { purposeTemplate, sendByPurpose } from './purposeMessaging';
import { autoAssignLead } from './leadDistributionService';
import LeadStage from '../models/LeadStage';
import { recordStageTransition } from '../controllers/leadStageHistoryController';
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
  const lead: any = await Lead.findById(leadId).select('tenantId name phone source courseInterest createdBy outpero stageId aiFeedback archivedAt').lean();
  if (!lead || lead.outpero?.status !== 'pending' || lead.aiFeedback?.doNotContact || lead.archivedAt) return;
  const tenantId = String(lead.tenantId);
  if (getConfig(tenantId).mode === 'off') return; // switched off since it was queued — leave it waiting

  if (getPolicy(tenantId).enabled && !inCallingWindow()) return;
  const phone = toE164(lead.phone);
  const attempts = (lead.outpero?.attempts || 0) + 1;
  let r: { ok: boolean; status: number; message: string };
  if (!phone) r = { ok: false, status: 422, message: 'No valid phone number on this lead.' };
  else r = await post(tenantId, { lead_name: lead.name || '', phone, course: courseOf(lead), lms_lead_id: String(lead._id), source: lead.source || '' });

  // Retry only what may succeed later: network trouble, 429 and 5xx. A wrong secret or a missing phone will not fix itself.
  const retryable = !r.ok && (r.status === 0 || r.status === 429 || r.status >= 500) && attempts < MAX_ATTEMPTS && !!phone;
  const set: any = { 'outpero.attempts': attempts, 'outpero.httpStatus': r.status || 0 };
  let sentStage: any = null;
  if (r.ok) {
    // The lead now belongs to Outpero: show it as such ("With Outpero") until the call result comes back.
    const policy = getPolicy(tenantId);
    if (policy.enabled && policy.sentStageId && mongoose.isValidObjectId(policy.sentStageId) && String(policy.sentStageId) !== String(lead.stageId)) {
      sentStage = await LeadStage.findOne({ _id: policy.sentStageId, tenantId: lead.tenantId, isActive: true }).lean();
    }
    Object.assign(set, { 'outpero.status': 'sent', 'outpero.sentAt': new Date(), 'outpero.stageAtSend': sentStage ? sentStage._id : lead.stageId, 'outpero.lastError': '' });
    if (sentStage) set.stageId = sentStage._id;
  }
  else if (retryable) Object.assign(set, { 'outpero.status': 'pending', 'outpero.nextAttemptAt': new Date(Date.now() + RETRY_MINUTES[attempts - 1] * 60_000), 'outpero.lastError': r.message });
  else Object.assign(set, { 'outpero.status': 'failed', 'outpero.lastError': r.message });
  // Outpero will never call this lead: take it back out of the "With Outpero" stage.
  const goBack = !r.ok && !retryable && lead.outpero?.stageBefore && String(lead.stageId) === String(lead.outpero.stageAtSend);
  if (goBack) set.stageId = lead.outpero.stageBefore;

  const update: any = { $set: set };
  // The timeline records the outcome once — not every retry.
  if (r.ok || !retryable) {
    update.$push = { activities: {
      type: 'note', createdBy: lead.createdBy, createdAt: new Date(),
      description: r.ok ? '🤖 Sent to Outpero — Jyothi (AI) will call this lead.' : `🤖 Not sent to Outpero: ${r.message}`,
    } };
  }
  const moved = await Lead.updateOne({ _id: lead._id, 'aiFeedback.doNotContact': { $ne: true }, ...(sentStage || goBack ? { stageId: lead.stageId } : {}) }, update);
  if (goBack && moved.modifiedCount) {
    const prev: any = await LeadStage.findById(lead.outpero.stageBefore).select('name').lean();
    await recordStageTransition(lead._id, lead.stageId, lead.outpero.stageBefore, prev?.name || 'previous stage', lead.createdBy, lead.tenantId).catch(() => {});
  }
  if (sentStage && moved.modifiedCount) await recordStageTransition(lead._id, lead.stageId, sentStage._id, sentStage.name, lead.createdBy, lead.tenantId).catch(() => {});
}

/**
 * A lead that has waited too long for Outpero (never reached it, or no call result came back) is
 * given to a person by the normal round robin, with a note saying why. Without this a lead could
 * wait for ever for a result that is never coming.
 */
export async function assignOverdue(limit = 50): Promise<number> {
  const rows: any[] = await Lead.find({
    archivedAt: null, assignedTo: null, 'assignment.assignedTo': null,
    'outpero.status': { $in: ['pending', 'sent', 'failed'] },
    'aiFeedback.state': { $nin: ['awaiting_assignment'] },
  }).sort({ updatedAt: 1 }).limit(limit * 4).select('tenantId createdBy outpero createdAt updatedAt').lean();
  let n = 0;
  for (const l of rows) {
    if (n >= limit) break;
    const tenantId = String(l.tenantId);
    const policy = getPolicy(tenantId);
    if (!policy.enabled) continue;
    const since = new Date(l.outpero?.sentAt || l.outpero?.nextAttemptAt || l.createdAt).getTime();
    if (Date.now() - since < policy.fallbackHours * 3600_000) continue;
    const owner = await autoAssignLead(tenantId, String(l._id), true).catch(() => null);
    if (!owner) continue;
    n++;
    await Lead.updateOne({ _id: l._id }, { $push: { activities: { type: 'note', createdBy: l.createdBy, createdAt: new Date(), description: `🤖 No call result from Outpero within ${policy.fallbackHours} hours — assigned to a team member by round robin.` } } });
  }
  return n;
}

/** Called for every new lead (Lead post-save hook). Only "automatic" mode acts. */
export async function onLeadCreated(doc: any): Promise<void> {
  const tenantId = String(doc.tenantId || '');
  if (!mongoose.isValidObjectId(tenantId)) return;
  const cfg = getConfig(tenantId);
  if (cfg.mode !== 'auto' || !cfg.endpointUrl || !cfg.secretSet) return;
  if (!matchesFilters(doc, cfg) || doc.aiFeedback?.doNotContact || doc.archivedAt) return;
  const queued = await Lead.updateOne({ _id: doc._id, 'outpero.status': { $exists: false } },
    { $set: { outpero: { status: 'pending', via: 'auto', attempts: 0, nextAttemptAt: new Date() } } });
  if (queued.modifiedCount) { await showAsWithOutpero(doc); await sendAfterHoursNotice(doc).catch((e) => console.error('[outpero] after-hours notice', e?.message)); }
  await sendLead(String(doc._id));
}

/**
 * The moment a new lead is handed to Outpero it shows as "With Outpero", not as a new lead nobody
 * has touched: calls only run 9 AM to 8 PM India time, so a lead that arrives at night would
 * otherwise sit as "New Lead" with no explanation until morning.
 */
async function showAsWithOutpero(doc: any): Promise<void> {
  const tenantId = String(doc.tenantId);
  const policy = getPolicy(tenantId);
  if (!policy.enabled || !policy.sentStageId || !mongoose.isValidObjectId(policy.sentStageId)) return;
  const target: any = await LeadStage.findOne({ _id: policy.sentStageId, tenantId: doc.tenantId, isActive: true }).lean();
  if (!target || String(doc.stageId) === String(target._id)) return;
  const inHours = inCallingWindow();
  const moved = await Lead.updateOne({ _id: doc._id, stageId: doc.stageId }, {
    $set: { stageId: target._id, 'outpero.stageAtSend': target._id, 'outpero.stageBefore': doc.stageId },
    ...(inHours ? {} : { $push: { activities: { type: 'note', createdBy: doc.createdBy, createdAt: new Date(), description: '🤖 With Outpero — calls run 9 AM to 8 PM (India time), so Jyothi (AI) will call this lead from 9 AM.' } } }),
  });
  if (moved.modifiedCount) await recordStageTransition(doc._id, doc.stageId, target._id, target.name, doc.createdBy, doc.tenantId).catch(() => {});
}

/**
 * A lead handed over outside calling hours is told on WhatsApp, once, that the team is away and
 * will call from 9 AM, so they are not left wondering. Needs a template assigned to the "after
 * hours" use (WhatsApp Templates, Where used); with none assigned nothing is sent and nothing is
 * written on the lead.
 */
export async function sendAfterHoursNotice(doc: any): Promise<void> {
  const tenantId = String(doc.tenantId);
  const policy = getPolicy(tenantId);
  if (!policy.enabled || inCallingWindow() || doc.aiFeedback?.doNotContact || !doc.phone) return;
  if (!purposeTemplate(tenantId, 'OUTPERO_AFTER_HOURS')) return;
  // Claim it first, so two runs can never both send.
  const claimed = await Lead.updateOne({ _id: doc._id, 'outpero.afterHoursNoticeAt': { $exists: false } }, { $set: { 'outpero.afterHoursNoticeAt': new Date() } });
  if (!claimed.modifiedCount) return;
  const hour = new Date(Date.now() + 330 * 60_000).getUTCHours();
  const when = hour >= CALL_TO_HOUR ? 'tomorrow morning' : 'this morning';
  const first = String(doc.name || '').trim().split(/\s+/)[0] || 'there';
  const r = await sendByPurpose(tenantId, String(doc.phone), 'OUTPERO_AFTER_HOURS', [first, when]);
  await Lead.updateOne({ _id: doc._id }, { $push: { activities: {
    type: 'whatsapp', createdBy: doc.createdBy, createdAt: new Date(),
    description: r.ok ? `📲 Told on WhatsApp that our team is away and will call ${when} from ${CALL_FROM_HOUR} AM.` : `📲 Could not send the after-hours WhatsApp message: ${(r as any).error || 'unknown error'}`,
  } } });
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
  const q: any = { 'aiFeedback.doNotContact': { $ne: true }, tenantId: oid(tenantId), phone: { $nin: [null, ''] }, archivedAt: null };
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
  const r = await Lead.updateMany({ tenantId: oid(tenantId), archivedAt: null, 'aiFeedback.doNotContact': { $ne: true }, 'outpero.status': 'failed', phone: { $nin: [null, ''] } },
    { $set: { 'outpero.status': 'pending', 'outpero.attempts': 0, 'outpero.nextAttemptAt': new Date() } });
  return { requeued: r.modifiedCount };
}
