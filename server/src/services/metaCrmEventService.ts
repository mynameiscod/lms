/**
 * Meta Conversions API — CRM lead-stage events ("Conversion Leads" integration).
 *
 * Spec followed (see docs/design/crm-lifecycle-redesign.md, Part E):
 *  - POST https://graph.facebook.com/<ver>/<DATASET_ID>/events
 *  - action_source "system_generated"; custom_data.event_source "crm";
 *    custom_data.lead_event_source = the CRM's name
 *  - user_data.lead_id = the 15–17 digit Meta leadgen id (unhashed, sent as a JSON number);
 *    phone and email, when sent, SHA-256 hashed
 *  - event_name = the CRM stage name (free text); send the initial lead stage too
 *  - event_time ≤ 7 days old at send time, and after the lead was created
 *
 * Only leads that came from Meta Lead Ads (have metaSubmissionIds) can be matched; others are
 * recorded as "skipped". Mode per institute (META_CRM_MODE): off → nothing is queued at all
 * (so switching on never back-sends history); test → sent with META_CRM_TEST_EVENT_CODE;
 * live → real events.
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import MetaCrmEvent from '../models/MetaCrmEvent';
import Lead from '../models/Lead';
import * as settings from './settingsService';
import { LeadMilestone } from '../config/leadMilestones';

export const META_GRAPH_VERSION = 'v27.0';
const MAX_AGE_MS = 7 * 24 * 3600_000;
/** A little inside Meta's 7-day limit, so a slow retry is not rejected for age. */
const SAFE_AGE_MS = MAX_AGE_MS - 2 * 3600_000;
const RETRY_MINUTES = [1, 5, 15, 60, 180, 720];
const BATCH = 50;

export const DEFAULT_EVENT_NAMES: Partial<Record<LeadMilestone | 'new', string>> = {
  new: 'Initial Lead',
  contacting: 'Contacting',
  connected: 'Connected',
  qualified: 'Qualified Lead',
  demo: 'Demo',
  seat_reserved: 'Seat Reserved',
  enrolled: 'Enrolled',
  nurture: 'Nurture',
  lost: 'Lost',
};

/** `milestones.qualifiedAt` → `qualified` */
const FIELD_TO_MILESTONE: Record<string, LeadMilestone> = {
  contactingAt: 'contacting', connectedAt: 'connected', qualifiedAt: 'qualified', demoAt: 'demo',
  seatReservedAt: 'seat_reserved', enrolledAt: 'enrolled', nurtureAt: 'nurture', lostAt: 'lost',
};

export type MetaCrmMode = 'off' | 'test' | 'live';
export function modeFor(tenantId: string): MetaCrmMode {
  const m = (settings.getStr('META_CRM_MODE', 'off', tenantId) || 'off').toLowerCase();
  return m === 'test' || m === 'live' ? m : 'off';
}

// ─────────────────────────── hashing / payload ───────────────────────────

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

/** Digits only, with India's 91 in front of a bare 10-digit mobile (Meta wants country code, no +). */
export function normalisePhone(raw?: string | null): string | null {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length < 8) return null;
  return digits.length === 10 ? '91' + digits : digits;
}
export function normaliseEmail(raw?: string | null): string | null {
  const e = String(raw || '').trim().toLowerCase();
  return e.includes('@') ? e : null;
}

/** The original Meta leadgen id of a lead (first submission). */
export function metaLeadIdOf(lead: any): string | null {
  const ids: string[] = (lead?.metaSubmissionIds || []).map(String).filter((s: string) => /^\d{10,20}$/.test(s));
  return ids[0] || null;
}

export function buildEvent(ev: { eventName: string; eventTime: Date; eventId: string }, lead: any, sourceName: string): Record<string, any> {
  const user_data: Record<string, any> = { lead_id: metaLeadIdOf(lead) };
  const ph = normalisePhone(lead.phone);
  const em = normaliseEmail(lead.email);
  if (ph) user_data.ph = [sha256(ph)];
  if (em) user_data.em = [sha256(em)];
  return {
    event_name: ev.eventName,
    event_time: Math.floor(new Date(ev.eventTime).getTime() / 1000),
    event_id: ev.eventId,
    action_source: 'system_generated',
    user_data,
    custom_data: { event_source: 'crm', lead_event_source: sourceName },
  };
}

/**
 * JSON body for Meta. lead_id is a 15–17 digit number — larger than JS can hold exactly — so it
 * is serialised as a string first and then written as a bare JSON number, digit for digit.
 */
export function serialiseBody(data: Record<string, any>[], testEventCode?: string): string {
  const json = JSON.stringify({ data, ...(testEventCode ? { test_event_code: testEventCode } : {}) });
  return json.replace(/"lead_id":"(\d{10,20})"/g, '"lead_id":$1');
}

// ─────────────────────────── queueing ───────────────────────────

/**
 * Queue events for milestones a lead reached for the first time. `stampedPaths` are the keys
 * milestoneStamps() returned (`milestones.qualifiedAt`, ...). Never throws into the CRM.
 */
export async function enqueueMilestoneEvents(tenantId: string, lead: any, stampedPaths: string[], stage?: any): Promise<void> {
  try {
    if (!stampedPaths?.length) return;
    const mode = modeFor(tenantId);
    if (mode === 'off') return;
    const tid = new mongoose.Types.ObjectId(String(tenantId));
    const metaId = metaLeadIdOf(lead);
    const now = new Date();
    const leadCreated: Date = lead.sourceDetails?.metaLeadCreatedAt || lead.createdAt || now;

    const rows: { milestone: string; eventName: string; eventTime: Date }[] = [];
    // Meta asks for the initial lead stage too; send it once, if still inside the 7-day window.
    if (metaId && now.getTime() - new Date(leadCreated).getTime() < SAFE_AGE_MS) {
      rows.push({ milestone: 'new', eventName: DEFAULT_EVENT_NAMES.new!, eventTime: new Date(leadCreated) });
    }
    for (const path of stampedPaths) {
      const field = path.replace(/^milestones\./, '');
      const milestone = FIELD_TO_MILESTONE[field];
      if (!milestone) continue;
      const custom = stage && stage.milestone === milestone && stage.metaEventName ? String(stage.metaEventName).trim() : '';
      const at = lead.milestones?.[field] ? new Date(lead.milestones[field]) : now;
      // Meta discards an event timed before the lead existed.
      rows.push({ milestone, eventName: custom || DEFAULT_EVENT_NAMES[milestone] || milestone, eventTime: at < new Date(leadCreated) ? now : at });
    }

    for (const r of rows) {
      const eventId = `crm-${lead._id}-${r.milestone}`;
      await MetaCrmEvent.updateOne(
        { tenantId: tid, eventId },
        {
          $setOnInsert: {
            tenantId: tid, leadId: lead._id, milestone: r.milestone, eventName: r.eventName, eventId, eventTime: r.eventTime,
            mode, attempts: 0,
            ...(metaId
              ? { status: 'pending', nextAttemptAt: now }
              : { status: 'skipped', lastError: 'Not a Meta Lead Ads lead — Meta cannot match it' }),
          },
        },
        { upsert: true }
      ).catch((e: any) => { if (e?.code !== 11000) throw e; });
    }
  } catch (err: any) {
    console.error('[META-CRM] enqueue failed:', err?.message);
  }
}

// ─────────────────────────── sending ───────────────────────────

export interface SendOutcome { ok: boolean; status?: number; body?: string; error?: string; retryable: boolean }

/** One POST to Meta. The token goes in a header, never the URL, so it cannot reach a log line. */
export async function postEvents(datasetId: string, token: string, body: string): Promise<SendOutcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(datasetId)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body,
      signal: ctrl.signal,
    });
    const text = (await res.text().catch(() => '')).slice(0, 1000);
    if (res.ok) return { ok: true, status: res.status, body: text, retryable: false };
    let msg = text;
    try { msg = JSON.parse(text)?.error?.message || text; } catch { /* keep text */ }
    return { ok: false, status: res.status, body: text, error: msg.slice(0, 500), retryable: res.status === 429 || res.status >= 500 };
  } catch (err: any) {
    return { ok: false, error: err?.name === 'AbortError' ? 'Meta did not answer in 20 s' : (err?.message || 'network error'), retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

function credentials(tenantId: string) {
  return {
    datasetId: settings.getCredential('META_CRM_DATASET_ID', tenantId).trim(),
    token: settings.getCredential('META_CRM_ACCESS_TOKEN', tenantId).trim(),
    testCode: settings.getStr('META_CRM_TEST_EVENT_CODE', '', tenantId).trim(),
    sourceName: settings.getStr('META_CRM_SOURCE_NAME', '', tenantId).trim() || 'CodeBegun LMS',
  };
}

/** Send one queued event and record the result on it. */
export async function sendEvent(ev: any): Promise<void> {
  const tenantId = String(ev.tenantId);
  const set = (fields: Record<string, any>) => MetaCrmEvent.updateOne({ _id: ev._id, status: 'pending' }, { $set: fields });
  const mode = modeFor(tenantId);
  if (mode === 'off') { await set({ status: 'skipped', lastError: 'Meta CRM events were switched off before this was sent', nextAttemptAt: null }); return; }

  const c = credentials(tenantId);
  if (!c.datasetId || !c.token) { await set({ status: 'failed', lastError: 'Dataset ID or access token not set (Meta sync page → Settings)', nextAttemptAt: null }); return; }
  if (mode === 'test' && !c.testCode) { await set({ status: 'failed', lastError: 'Test mode needs a test event code', nextAttemptAt: null }); return; }
  if (Date.now() - new Date(ev.eventTime).getTime() > SAFE_AGE_MS) {
    await set({ status: 'skipped', lastError: 'Older than Meta’s 7-day limit — not sent', nextAttemptAt: null });
    return;
  }

  const lead = await Lead.findOne({ _id: ev.leadId, tenantId: ev.tenantId }).select('phone email metaSubmissionIds').lean();
  if (!lead || !metaLeadIdOf(lead)) { await set({ status: 'skipped', lastError: 'Lead missing or has no Meta lead id', nextAttemptAt: null }); return; }

  const body = serialiseBody([buildEvent(ev, lead, c.sourceName)], mode === 'test' ? c.testCode : undefined);
  const out = await postEvents(c.datasetId, c.token, body);
  const attempts = (ev.attempts || 0) + 1;
  if (out.ok) {
    await set({ status: 'sent', sentAt: new Date(), attempts, httpStatus: out.status, response: out.body, lastError: '', nextAttemptAt: null, mode, ...(mode === 'test' ? { testEventCode: c.testCode } : {}) });
  } else if (out.retryable && attempts < RETRY_MINUTES.length) {
    await set({ attempts, httpStatus: out.status, response: out.body, lastError: out.error, nextAttemptAt: new Date(Date.now() + RETRY_MINUTES[attempts - 1] * 60_000) });
  } else {
    await set({ status: 'failed', attempts, httpStatus: out.status, response: out.body, lastError: out.error, nextAttemptAt: null });
  }
}

/** Job tick: send what is due, oldest first. */
export async function processDueMetaEvents(limit = BATCH): Promise<number> {
  const due = await MetaCrmEvent.find({ status: 'pending', nextAttemptAt: { $lte: new Date() } })
    .sort({ eventTime: 1 }).limit(limit).lean();
  for (const ev of due) {
    try { await sendEvent(ev); } catch (err: any) { console.error('[META-CRM] send error:', err?.message); }
  }
  return due.length;
}

/** Put failed events back in the queue (admin "Retry failed"). */
export async function retryFailed(tenantId: string): Promise<number> {
  const r = await MetaCrmEvent.updateMany(
    { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'failed' },
    { $set: { status: 'pending', attempts: 0, nextAttemptAt: new Date(), lastError: '' } }
  );
  return r.modifiedCount;
}

/**
 * Admin "Send test event": one event for a real Meta lead, always with the test event code, so
 * it shows under Events Manager → Test events and never counts as a real conversion.
 */
export async function sendTestEvent(tenantId: string, leadId?: string): Promise<{ ok: boolean; message: string; httpStatus?: number; response?: string }> {
  const c = credentials(tenantId);
  if (!c.datasetId || !c.token) return { ok: false, message: 'Set the dataset ID and access token first.' };
  if (!c.testCode) return { ok: false, message: 'Set a test event code first (Events Manager → the dataset → Test events).' };
  const tid = new mongoose.Types.ObjectId(tenantId);
  const filter: any = { tenantId: tid, 'metaSubmissionIds.0': { $exists: true } };
  if (leadId && mongoose.Types.ObjectId.isValid(leadId)) filter._id = leadId;
  const lead: any = await Lead.findOne(filter).sort({ createdAt: -1 }).select('phone email metaSubmissionIds').lean();
  if (!lead || !metaLeadIdOf(lead)) return { ok: false, message: 'No Meta Lead Ads lead found to test with.' };
  const ev = { eventName: 'Test CRM Event', eventTime: new Date(), eventId: `crm-test-${Date.now()}` };
  const out = await postEvents(c.datasetId, c.token, serialiseBody([buildEvent(ev, lead, c.sourceName)], c.testCode));
  return out.ok
    ? { ok: true, message: 'Meta accepted the test event. Check Events Manager → Test events.', httpStatus: out.status, response: out.body }
    : { ok: false, message: `Meta refused it: ${out.error}`, httpStatus: out.status, response: out.body };
}
