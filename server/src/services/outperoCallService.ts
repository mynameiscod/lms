import crypto from 'crypto';
import mongoose from 'mongoose';
import OutperoCall from '../models/OutperoCall';
import Lead from '../models/Lead';
import FollowUpReminder from '../models/FollowUpReminder';
import * as settings from './settingsService';

/**
 * Outpero post-call webhook → the LMS (plan: docs/design/outpero-integration.md, Part B).
 *
 * POST /api/v1/public/outpero/calls/<token> — the token is a long random value per institute
 * (Leads → Outpero AI Calls), so a fake "call result" cannot be posted without it, and it says
 * which institute the call belongs to.
 *
 * Outpero's payload shape is not documented to us, so every field is looked up under the names it
 * plausibly uses, anywhere in the body, and every delivery is kept raw on the call — the mapping is
 * then confirmed against a real delivery. Repeated deliveries of one call (sent again once it is
 * classified) update it; nothing already done for that call is done twice.
 */

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const TOKEN_KEY = 'OUTPERO_WEBHOOK_TOKEN';
const MAX_RAW = 5;
const MAX_TRANSCRIPT = 60_000;

export class OutperoCallError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Token ─────────────────────────────────────────────────────────────────────

export function webhookUrlFor(token: string) {
  const base = (settings.getStr('API_PUBLIC_URL', '') || settings.getStr('FRONTEND_URL', 'https://platform.codebegun.com')).replace(/\/$/, '');
  return `${base}/api/v1/public/outpero/calls/${token}`;
}

/** The institute's webhook address; creates the token the first time. `rotate` replaces it. */
export async function webhookFor(tenantId: string, userId: string, rotate = false) {
  let token = settings.getStr(TOKEN_KEY, '', tenantId);
  if (!token || rotate) {
    token = crypto.randomBytes(24).toString('base64url');
    await settings.setMany([{ key: TOKEN_KEY, value: token }], userId, tenantId);
  }
  return { url: webhookUrlFor(token), rotated: rotate };
}

export const tenantForToken = (token: string) => (token && token.length >= 24 ? settings.tenantWithValue(TOKEN_KEY, token) : null);

// ── Reading Outpero's body ───────────────────────────────────────────────────

/** First value found under any of `names`, searched depth-first through the whole body. */
export function pick(obj: any, names: string[], depth = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined;
  for (const n of names) {
    const v = obj[n];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = pick(v, names, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);
const toDate = (v: unknown) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Transcript as one readable text, whether Outpero sends a string or a list of turns. */
function transcriptText(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v.slice(0, MAX_TRANSCRIPT);
  if (Array.isArray(v)) {
    return v.map((t: any) => {
      const who = t.role || t.speaker || t.from || '';
      const text = t.text || t.content || t.message || t.transcript || '';
      return who ? `${who}: ${text}` : String(text);
    }).join('\n').slice(0, MAX_TRANSCRIPT);
  }
  return JSON.stringify(v).slice(0, MAX_TRANSCRIPT);
}

export interface ParsedCall {
  callId?: string; leadIdHint?: string; phone?: string; status?: string; outcome?: string; summary?: string;
  hangupReason?: string; durationSec?: number; recordingUrl?: string; transcript?: string;
  variables: Record<string, unknown>; startedAt?: Date; endedAt?: Date;
}

export function parseCall(body: any): ParsedCall {
  const varsRaw = pick(body, ['extracted_variables', 'extractedVariables', 'variables', 'extracted', 'captured', 'collected_data']);
  const variables = varsRaw && typeof varsRaw === 'object' && !Array.isArray(varsRaw) ? { ...varsRaw } : {};
  const dur = Number(pick(body, ['duration', 'duration_seconds', 'durationSeconds', 'call_duration', 'billsec']));
  return {
    callId: str(pick(body, ['call_id', 'callId', 'call_sid', 'callSid', 'conversation_id', 'session_id', 'id'])),
    leadIdHint: str(pick(body, ['lms_lead_id', 'lmsLeadId'])) || str((variables as any).lms_lead_id),
    phone: str(pick(body, ['phone', 'to', 'to_number', 'customer_phone', 'customer_number', 'lead_phone', 'phone_number', 'number'])),
    status: str(pick(body, ['status', 'call_status', 'callStatus'])),
    outcome: str(pick(body, ['outcome', 'disposition', 'call_outcome', 'result'])),
    summary: str(pick(body, ['summary', 'call_summary', 'callSummary'])),
    hangupReason: str(pick(body, ['hangup_reason', 'hangupReason', 'end_reason', 'ended_reason', 'disconnect_reason'])),
    durationSec: Number.isFinite(dur) && dur >= 0 ? Math.round(dur > 10_000 ? dur / 1000 : dur) : undefined,
    recordingUrl: str(pick(body, ['recording_url', 'recordingUrl', 'recording', 'audio_url'])),
    transcript: transcriptText(pick(body, ['transcript', 'full_transcript', 'transcription', 'messages'])),
    variables,
    startedAt: toDate(pick(body, ['started_at', 'startedAt', 'start_time', 'startTime'])),
    endedAt: toDate(pick(body, ['ended_at', 'endedAt', 'end_time', 'endTime'])),
  };
}

// ── Reading what Jyothi captured ─────────────────────────────────────────────

const yes = (v: unknown) => /^(y|yes|true|1|agreed|ok|sure|haan|ha)$/i.test(String(v ?? '').trim());
const blankish = (v: unknown) => v === undefined || v === null || /^(|null|none|n\/a|na|no|not mentioned|unknown|-)$/i.test(String(v).trim());

/**
 * A date + time Jyothi heard ("2026-10-12" / "12 Oct" / "tomorrow" + "5 PM" / "17:30"), in IST.
 * Returns null when it cannot be read — the follow-up is then made for a person to confirm.
 */
export function readIstDateTime(dateV: unknown, timeV: unknown, now = new Date()): Date | null {
  const ds = String(dateV ?? '').trim().toLowerCase();
  const ts = String(timeV ?? '').trim().toLowerCase();
  if (!ds && !ts) return null;
  const istNow = new Date(now.getTime() + 5.5 * 3600_000);
  let y = istNow.getUTCFullYear(); let mo = istNow.getUTCMonth(); let d = istNow.getUTCDate();
  if (ds === 'tomorrow') { const t = new Date(Date.UTC(y, mo, d + 1)); y = t.getUTCFullYear(); mo = t.getUTCMonth(); d = t.getUTCDate(); }
  else if (ds && ds !== 'today') {
    const iso = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const dmy = ds.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (iso) { y = +iso[1]; mo = +iso[2] - 1; d = +iso[3]; }
    else if (dmy) { d = +dmy[1]; mo = +dmy[2] - 1; y = +dmy[3] < 100 ? 2000 + +dmy[3] : +dmy[3]; }
    else {
      const p = new Date(`${ds} ${y}`);
      if (Number.isNaN(p.getTime())) return null;
      mo = p.getMonth(); d = p.getDate();
    }
  }
  let hh = 11; let mm = 0;
  if (ts) {
    const m = ts.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
    if (!m) return null;
    hh = +m[1]; mm = +(m[2] || 0);
    if (m[3] === 'pm' && hh < 12) hh += 12;
    if (m[3] === 'am' && hh === 12) hh = 0;
    if (!m[3] && hh >= 1 && hh <= 7) hh += 12; // "5" on a sales call means 5 pm
  }
  if (hh > 23 || mm > 59 || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo, d, hh, mm) - 5.5 * 3600_000);
}

// ── Receiving a delivery ─────────────────────────────────────────────────────

async function matchLead(tenantId: string, p: ParsedCall): Promise<{ lead: any; by: 'lms_lead_id' | 'phone' } | null> {
  const tid = oid(tenantId);
  if (p.leadIdHint && mongoose.isValidObjectId(p.leadIdHint)) {
    const lead = await Lead.findOne({ _id: oid(p.leadIdHint), tenantId: tid }).select('name phone customFields createdBy assignedTo assignment aiCallAttempts aiSummary').lean();
    if (lead) return { lead, by: 'lms_lead_id' };
  }
  const ten = String(p.phone || '').replace(/\D/g, '').slice(-10);
  if (ten.length === 10) {
    const lead = await Lead.findOne({ tenantId: tid, phone: new RegExp(`${ten}$`) }).sort({ createdAt: -1 })
      .select('name phone customFields createdBy assignedTo assignment aiCallAttempts aiSummary').lean();
    if (lead) return { lead, by: 'phone' };
  }
  return null;
}

const owner = (lead: any) => lead.assignedTo || lead.assignment?.assignedTo || lead.createdBy;
const fmtDur = (s?: number) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : '');

/** Store one webhook delivery and apply it to the lead. Returns what happened (for the response/log). */
export async function receiveCall(tenantId: string, body: any) {
  const p = parseCall(body || {});
  const callId = p.callId || crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex').slice(0, 24);
  const tid = oid(tenantId);

  const existing: any = await OutperoCall.findOne({ tenantId: tid, callId }).lean();
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({
    phone: p.phone, status: p.status, outcome: p.outcome, summary: p.summary, hangupReason: p.hangupReason,
    durationSec: p.durationSec, recordingUrl: p.recordingUrl, transcript: p.transcript, startedAt: p.startedAt, endedAt: p.endedAt,
  })) if (v !== undefined) set[k] = v;
  if (Object.keys(p.variables).length) set.variables = { ...(existing?.variables || {}), ...p.variables };

  let leadId = existing?.leadId ? String(existing.leadId) : null;
  let lead: any = null;
  if (!leadId) {
    const m = await matchLead(tenantId, p);
    if (m) { lead = m.lead; leadId = String(m.lead._id); set.leadId = m.lead._id; set.matchedBy = m.by; }
  } else {
    lead = await Lead.findOne({ _id: oid(leadId), tenantId: tid }).select('name phone customFields createdBy assignedTo assignment aiCallAttempts aiSummary').lean();
  }

  const call: any = await OutperoCall.findOneAndUpdate(
    { tenantId: tid, callId },
    { $set: set, $inc: { deliveries: 1 }, $push: { raw: { $each: [{ at: new Date(), body }], $slice: -MAX_RAW } } },
    { upsert: true, new: true },
  ).lean();

  const done: string[] = [];
  if (lead) done.push(...(await applyToLead(tenantId, call, lead)));
  return { callId, matched: !!lead, leadId, actions: done };
}

/** Everything the lead gains from this call; each step once per call (call.actions). */
async function applyToLead(tenantId: string, call: any, lead: any): Promise<string[]> {
  const did: string[] = [];
  const has = (a: string) => (call.actions || []).includes(a);
  const mark = async (a: string) => { did.push(a); await OutperoCall.updateOne({ _id: call._id }, { $addToSet: { actions: a } }); };
  const v = call.variables || {};
  const by = owner(lead);
  const leadQ = { _id: lead._id };

  // 1. Call log + timeline, on the first delivery.
  if (!has('logged')) {
    const connected = (call.durationSec || 0) > 5 && !/voicemail|no.?answer|busy|failed|not.?connected/i.test(`${call.status} ${call.hangupReason}`);
    await Lead.updateOne(leadQ, {
      $inc: { aiCallAttempts: 1 },
      $set: { aiCallStatus: connected ? 'answered' : 'not_answered' },
      $push: {
        aiCallLogs: {
          attemptNumber: (lead.aiCallAttempts || 0) + 1, callSid: call.callId,
          startedAt: call.startedAt || call.createdAt || new Date(), endedAt: call.endedAt, duration: call.durationSec,
          outcome: connected ? 'answered' : 'not_answered', recordingUrl: call.recordingUrl, transcript: call.transcript,
        },
        activities: {
          type: 'call', createdBy: by, createdAt: new Date(),
          description: `📞 AI call by Jyothi${call.durationSec ? ` — ${fmtDur(call.durationSec)}` : ''}${call.status ? ` — ${call.status}` : ''}${call.recordingUrl ? ` · recording: ${call.recordingUrl}` : ''}`,
        },
      },
    });
    await mark('logged');
  } else if (call.transcript || call.recordingUrl) {
    // A later delivery may bring the transcript/recording — keep the log current.
    await Lead.updateOne({ ...leadQ, 'aiCallLogs.callSid': call.callId }, {
      $set: { 'aiCallLogs.$.transcript': call.transcript, 'aiCallLogs.$.recordingUrl': call.recordingUrl, 'aiCallLogs.$.duration': call.durationSec },
    });
  }

  // 2. Summary + outcome, once the call is classified.
  if (!has('summary') && (call.summary || call.outcome)) {
    const set: any = {};
    if (call.summary && (!lead.aiSummary?.summary || lead.aiSummary?.generatedBy === 'outpero')) {
      set.aiSummary = { generatedAt: new Date(), summary: call.summary, generatedBy: 'outpero', keyInsights: [], suggestedNextAction: '' };
    }
    await Lead.updateOne(leadQ, {
      ...(Object.keys(set).length ? { $set: set } : {}),
      $push: { activities: { type: 'note', createdBy: by, createdAt: new Date(), description: `🤖 Jyothi: ${call.outcome ? `${call.outcome}. ` : ''}${call.summary || ''}`.slice(0, 2000) } },
    });
    await mark('summary');
  }

  // 3. Captured answers fill the lead's details — never overwriting what a person entered.
  const filled: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (blankish(val) || k === 'lms_lead_id') continue;
    const cf = lead.customFields || {};
    if (cf[k] === undefined || cf[k] === '') filled[`customFields.${k}`] = typeof val === 'object' ? JSON.stringify(val) : val;
  }
  if (Object.keys(filled).length) { await Lead.updateOne(leadQ, { $set: filled }); did.push('details'); }

  // 4. Demo booked on the call → a demo follow-up at that time (or for a person to confirm).
  if (!has('demo') && (!blankish(v.demo_date) || !blankish(v.demo_time))) {
    const at = readIstDateTime(v.demo_date, v.demo_time);
    await FollowUpReminder.create({
      tenantId: oid(tenantId), leadId: lead._id, assignedTo: by, createdBy: by, type: 'demo',
      title: `Demo with ${lead.name || 'lead'} (booked by Jyothi)`,
      description: `Asked for ${[v.demo_date, v.demo_time].filter(Boolean).join(' ')}${v.demo_mode ? ` · ${v.demo_mode}` : ''}.${at ? '' : ' Time could not be read — confirm with the lead.'}`,
      scheduledAt: at || new Date(Date.now() + 3600_000), reminderAt: at ? new Date(at.getTime() - 30 * 60_000) : undefined,
      meetingLocation: v.demo_mode ? String(v.demo_mode) : undefined, priority: 'high', status: 'scheduled',
    });
    await mark('demo');
  }

  // 5. Callback asked for (or a counsellor call wanted) → a call follow-up for the lead's owner.
  const wantsCounsellor = yes(v.counsellor_callback);
  if (!has('callback') && (!blankish(v.callback_date) || !blankish(v.callback_time) || wantsCounsellor)) {
    const at = readIstDateTime(v.callback_date, v.callback_time);
    await FollowUpReminder.create({
      tenantId: oid(tenantId), leadId: lead._id, assignedTo: by, createdBy: by, type: 'call',
      title: `Call ${lead.name || 'lead'} back${wantsCounsellor ? ' (counsellor requested)' : ''}`,
      description: `Requested on Jyothi's call${[v.callback_date, v.callback_time].some((x) => !blankish(x)) ? `: ${[v.callback_date, v.callback_time].filter((x) => !blankish(x)).join(' ')}` : ''}.${at || !(v.callback_date || v.callback_time) ? '' : ' Time could not be read — confirm.'}`,
      scheduledAt: at || new Date(Date.now() + 2 * 3600_000), reminderAt: at ? new Date(at.getTime() - 15 * 60_000) : undefined,
      priority: wantsCounsellor ? 'high' : 'medium', status: 'scheduled',
    });
    await mark('callback');
  }

  // 6. Not interested → the reason on the timeline; a person moves the stage (never automatic).
  if (!has('not_interested') && !blankish(v.not_interested_reason)) {
    await Lead.updateOne(leadQ, {
      $addToSet: { interestConcerns: 'other' },
      $push: { activities: { type: 'note', createdBy: by, createdAt: new Date(), description: `🤖 Jyothi: not interested — ${String(v.not_interested_reason).slice(0, 500)}. Move the lead to a lost stage if that is right.` } },
    });
    await mark('not_interested');
  }

  // 7. WhatsApp consent given on the call.
  if (!has('whatsapp_consent') && yes(v.whatsapp_consent)) {
    await Lead.updateOne(leadQ, { $set: { 'customFields.whatsapp_consent': 'yes' } });
    await mark('whatsapp_consent');
  }
  return did;
}

// ── For the Outpero page ─────────────────────────────────────────────────────

export async function recentCalls(tenantId: string, limit = 20) {
  const tid = oid(tenantId);
  const [rows, total, unmatched] = await Promise.all([
    OutperoCall.find({ tenantId: tid }).sort({ updatedAt: -1 }).limit(limit)
      .select('callId leadId matchedBy phone status outcome durationSec actions deliveries updatedAt variables').populate('leadId', 'name phone').lean(),
    OutperoCall.countDocuments({ tenantId: tid }),
    OutperoCall.countDocuments({ tenantId: tid, leadId: null }),
  ]);
  return {
    total, unmatched,
    rows: rows.map((c: any) => ({
      callId: c.callId, lead: c.leadId ? { _id: String(c.leadId._id), name: c.leadId.name, phone: c.leadId.phone } : null,
      matchedBy: c.matchedBy, phone: c.phone, status: c.status, outcome: c.outcome, durationSec: c.durationSec,
      actions: c.actions, deliveries: c.deliveries, at: c.updatedAt, variableKeys: Object.keys(c.variables || {}),
    })),
  };
}

/** The latest raw delivery — for confirming Outpero's field names against what really arrived. */
export async function latestRaw(tenantId: string) {
  const c: any = await OutperoCall.findOne({ tenantId: oid(tenantId) }).sort({ updatedAt: -1 }).select('raw callId').lean();
  return c ? { callId: c.callId, delivery: (c.raw || []).slice(-1)[0] || null } : null;
}
