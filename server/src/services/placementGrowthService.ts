import crypto from 'crypto';
import mongoose from 'mongoose';
import PlacementCandidate, { IPlacementCandidate } from '../models/PlacementCandidate';
import PlacementEvent from '../models/PlacementEvent';
import PlacementBooking from '../models/PlacementBooking';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import WhatsAppBroadcast from '../models/WhatsAppBroadcast';
import * as settings from './settingsService';
import { sendTemplateTo } from './whatsAppTemplateService';
import { sendByPurpose } from './purposeMessaging';
import { PlacementError, newPortalToken, PLACEMENT_WELCOME_PURPOSE } from './placementProgramService';
import { PLACEMENT_STAGES } from '../models/PlacementCandidate';

/**
 * Placement Program — Phase 5: bring LMS students in, message a whole stage, and send the
 * outcomes that matter (paid, attended, selected) back to the ad platforms.
 */

const PUBLIC_BASE = () => (process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');
const portalLink = (token: string) => `${PUBLIC_BASE()}/placement-program/me/${token}`;

async function event(tenantId: any, candidateId: any, kind: string, message: string, data?: any, actorId?: string) {
  await PlacementEvent.create({
    tenantId, candidateId, kind, message, data,
    actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : undefined,
  }).catch((e) => console.error('[placement] event not recorded:', e?.message));
}

const tenMobile = (p: any) => String(p || '').replace(/\D/g, '').slice(-10);

// ── 1. Push LMS students in ──────────────────────────────────────────────────

/**
 * Add LMS students to the pipeline, with the fee charged or waived per student (the admin decides
 * for each one). One record per mobile, as for ad leads: a student who already registered from an ad
 * is linked to their LMS account rather than duplicated.
 */
export async function pushLmsStudents(tenantId: string, actorId: string, items: { userId: string; waiveFee?: boolean }[], notify: boolean) {
  const list = (Array.isArray(items) ? items : []).filter((i) => i?.userId && mongoose.Types.ObjectId.isValid(i.userId)).slice(0, 500);
  if (!list.length) throw new PlacementError('Choose at least one student.');
  const users = await User.find({ _id: { $in: list.map((i) => i.userId) }, tenantId, role: 'STUDENT' }).select('firstName lastName email phone').lean() as any[];
  const profiles = await StudentProfile.find({ tenantId, userId: { $in: users.map((u) => u._id) } })
    .select('userId education.degree').lean() as any[];
  const profileOf = new Map(profiles.map((p) => [String(p.userId), p]));
  const result = { added: 0, linked: 0, skipped: [] as { name: string; reason: string }[] };

  for (const u of users) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
    const mobile = tenMobile(u.phone);
    if (!/^[6-9]\d{9}$/.test(mobile)) { result.skipped.push({ name, reason: 'No valid mobile number on their account' }); continue; }
    const waive = !!list.find((i) => i.userId === String(u._id))?.waiveFee;
    const existing = await PlacementCandidate.findOne({ tenantId, mobile });
    if (existing) {
      if (!existing.userId) { existing.userId = u._id; await existing.save(); }
      await event(tenantId, existing._id, 'note', 'Linked to their LMS account', undefined, actorId);
      result.linked++;
      continue;
    }
    const deg = profileOf.get(String(u._id))?.education?.degree;
    const c = await PlacementCandidate.create({
      tenantId, userId: u._id, name, mobile, email: u.email || '', source: 'lms_push',
      college: deg?.college || '', degree: deg?.name || '', branch: deg?.branch || '', graduationYear: deg?.graduationYear,
      stage: 'registered', stageChangedAt: new Date(), portalToken: newPortalToken(),
      fee: waive ? { waived: true } : undefined,
    });
    await event(tenantId, c._id, 'submitted', `Added from the LMS${waive ? ' — interview fee waived' : ''}`, undefined, actorId);
    if (notify) {
      const wa = await sendByPurpose(tenantId, mobile, PLACEMENT_WELCOME_PURPOSE, [name.split(' ')[0]]).catch((e: any) => ({ ok: false, error: e?.message }));
      await event(tenantId, c._id, 'whatsapp', wa.ok ? 'WhatsApp welcome sent' : `WhatsApp welcome not sent: ${(wa as any).error}`);
    }
    result.added++;
  }
  const missing = list.length - users.length;
  if (missing > 0) result.skipped.push({ name: `${missing} selected account(s)`, reason: 'Not a student of this institute' });
  return result;
}

// ── 2. Message a whole stage ─────────────────────────────────────────────────

/**
 * Send an approved template to every candidate in the chosen stages. `{name}` becomes each person's
 * first name and `{link}` their own page link. Logged as a WhatsApp broadcast, so it shows in Sent
 * history and every message in the Delivery log.
 */
export async function stageBroadcast(tenantId: string, actorId: string, body: { stages?: string[]; templateId?: string; values?: string[]; buttonParam?: string }) {
  const stages = (Array.isArray(body?.stages) ? body.stages : []).filter((s) => (PLACEMENT_STAGES as readonly string[]).includes(s));
  if (!stages.length) throw new PlacementError('Choose at least one stage.');
  const t = await WhatsAppTemplate.findOne({ _id: body?.templateId, tenantId });
  if (!t) throw new PlacementError('Choose a template.', 404);
  if (t.status !== 'APPROVED') throw new PlacementError(`That template is ${t.status} — Meta only sends approved templates.`);
  const candidates = await PlacementCandidate.find({ tenantId, stage: { $in: stages } });
  if (!candidates.length) throw new PlacementError('Nobody is in that stage right now.');
  if (candidates.length > 2000) throw new PlacementError('At most 2000 people per message.');
  const values = (Array.isArray(body?.values) ? body.values : []).map(String);

  const b = await WhatsAppBroadcast.create({
    tenantId, templateId: t._id, templateName: t.name, createdBy: mongoose.Types.ObjectId.isValid(actorId) ? actorId : undefined,
    audience: `Placement Program — ${stages.join(', ')} (${candidates.length})`, total: candidates.length,
  });

  (async () => {
    let sent = 0, failed = 0;
    const failures: { phone: string; error: string }[] = [];
    for (let k = 0; k < candidates.length; k++) {
      const c = candidates[k];
      if (!c.portalToken) { c.portalToken = newPortalToken(); await c.save().catch(() => undefined); }
      const fill = (v: string) => String(v || '').replace(/\{name\}/gi, c.name.split(' ')[0]).replace(/\{link\}/gi, portalLink(c.portalToken!));
      const r = await sendTemplateTo(tenantId, t, c.mobile, {
        body: values.map(fill), urlButtonParam: body?.buttonParam ? fill(body.buttonParam) : undefined,
        log: { source: 'broadcast', broadcastId: b._id, sentBy: actorId },
      });
      if (r.ok) sent++; else { failed++; if (failures.length < 50) failures.push({ phone: c.mobile, error: r.error || 'failed' }); }
      await event(tenantId, c._id, 'whatsapp', r.ok ? `WhatsApp "${t.name}" sent to the ${c.stage} stage` : `WhatsApp "${t.name}" not sent: ${r.error}`, undefined, actorId);
      if (k % 10 === 9 || k === candidates.length - 1) await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { sent, failed, failures } });
      await new Promise((ok) => setTimeout(ok, 120));
    }
    await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { sent, failed, failures, status: 'done', finishedAt: new Date() } });
  })().catch(async (e) => {
    console.error('[placement] stage broadcast failed', e);
    await WhatsAppBroadcast.updateOne({ _id: b._id }, { $set: { status: 'failed', finishedAt: new Date() } });
  });

  return { broadcastId: String(b._id), total: candidates.length };
}

// ── 3. Conversions back to the ad platforms ──────────────────────────────────

export type ConversionEvent = 'Purchase' | 'InterviewAttended' | 'Selected';
const sha = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

export function metaConfigured(tenantId: string) {
  const pixel = settings.getStr('META_PIXEL_ID', '', tenantId).trim();
  const token = settings.getStr('META_CAPI_ACCESS_TOKEN', '', tenantId).trim();
  return { configured: !!(pixel && token), pixelId: pixel ? `…${pixel.slice(-4)}` : '' };
}

/**
 * The event Meta's Conversions API receives. Personal data is SHA-256 hashed as Meta requires; the
 * click id (fbclid) from the ad is passed as `fbc` so the conversion is tied to the ad that caused it.
 * `event_id` makes a retry a duplicate Meta ignores, not a second conversion. Pure, so it is tested.
 */
export function buildMetaEvent(c: Pick<IPlacementCandidate, 'mobile' | 'email' | 'attribution'> & { _id: any }, name: ConversionEvent, at: Date, valueInr?: number) {
  const touch: any = (c.attribution as any)?.last_touch || (c.attribution as any)?.first_touch || {};
  const fbclid = String(touch.fbclid || '');
  const clickMs = touch.captured_at ? new Date(touch.captured_at).getTime() : at.getTime();
  return {
    event_name: name,
    event_time: Math.floor(at.getTime() / 1000),
    event_id: `pp-${c._id}-${name}`,
    action_source: name === 'Purchase' ? 'website' : 'system_generated',
    ...(name === 'Purchase' ? { event_source_url: touch.landing_page || `${PUBLIC_BASE()}/placement-program` } : {}),
    user_data: {
      ph: [sha(`91${c.mobile}`)],
      ...(c.email ? { em: [sha(c.email)] } : {}),
      external_id: [sha(String(c._id))],
      ...(fbclid ? { fbc: `fb.1.${clickMs}.${fbclid}` } : {}),
    },
    ...(valueInr ? { custom_data: { currency: 'INR', value: valueInr } } : {}),
  };
}

/** Fire-and-forget: never blocks or fails the action that triggered it. */
export async function sendMetaConversion(tenantId: string, candidateId: any, name: ConversionEvent, valueInr?: number) {
  try {
    if (!metaConfigured(tenantId).configured) return;
    const c = await PlacementCandidate.findById(candidateId).select('mobile email attribution').lean() as any;
    if (!c) return;
    const pixel = settings.getStr('META_PIXEL_ID', '', tenantId).trim();
    const token = settings.getStr('META_CAPI_ACCESS_TOKEN', '', tenantId).trim();
    const testCode = settings.getStr('META_CAPI_TEST_EVENT_CODE', '', tenantId).trim();
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [buildMetaEvent({ ...c, _id: candidateId }, name, new Date(), valueInr)], ...(testCode ? { test_event_code: testCode } : {}) }),
    });
    const ok = res.ok;
    const detail = ok ? '' : (await res.text().catch(() => '')).slice(0, 200);
    await event(tenantId, candidateId, 'note', ok ? `Meta conversion sent: ${name}` : `Meta conversion failed (${name}): ${detail}`);
  } catch (e: any) {
    console.error('[placement] Meta conversion error:', e?.message);
  }
}

/** Conversion names to create in Google Ads (Goals → Conversions → Import → Other data sources). */
export const GOOGLE_CONVERSION_NAMES: Record<ConversionEvent, string> = {
  Purchase: 'Placement Paid', InterviewAttended: 'Placement Interview Attended', Selected: 'Placement Selected',
};

const googleTime = (d: Date) => {
  const ist = new Date(d.getTime() + 330 * 60_000).toISOString().replace('T', ' ').slice(0, 19);
  return `${ist}+0530`;
};
const csvCell = (v: any) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/**
 * Google Ads offline-conversion upload file: one row per conversion for candidates who arrived with a
 * Google click id (gclid). Uploading it needs no API access — Google Ads → Goals → Conversions →
 * Uploads accepts this exact format.
 */
export async function googleConversionsCsv(tenantId: string, from?: string, to?: string) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86_400_000);
  const end = to ? new Date(new Date(to).getTime() + 86_400_000 - 1) : new Date();
  const cands = await PlacementCandidate.find({
    tenantId, $or: [{ 'attribution.last_touch.gclid': { $nin: [null, ''] } }, { 'attribution.first_touch.gclid': { $nin: [null, ''] } }],
  }).select('attribution fee').lean() as any[];
  const rows: string[][] = [];
  for (const c of cands) {
    const gclid = c.attribution?.last_touch?.gclid || c.attribution?.first_touch?.gclid;
    const inRange = (d?: Date) => d && d >= start && d <= end;
    if (c.fee?.status && ['paid', 'refunded'].includes(c.fee.status) && inRange(c.fee.paidAt ? new Date(c.fee.paidAt) : undefined)) {
      rows.push([gclid, GOOGLE_CONVERSION_NAMES.Purchase, googleTime(new Date(c.fee.paidAt)), String(c.fee.amountInr || 0), 'INR']);
    }
    const attended = await PlacementBooking.findOne({ candidateId: c._id, status: 'attended' }).select('scorecard endsAt').lean() as any;
    const attendedAt = attended ? new Date(attended.scorecard?.at || attended.endsAt) : undefined;
    if (inRange(attendedAt)) rows.push([gclid, GOOGLE_CONVERSION_NAMES.InterviewAttended, googleTime(attendedAt!), '', '']);
    const sel = await PlacementEvent.findOne({ candidateId: c._id, kind: 'stage', 'data.to': 'selected' }).sort({ createdAt: 1 }).select('createdAt').lean() as any;
    if (sel && inRange(new Date(sel.createdAt))) rows.push([gclid, GOOGLE_CONVERSION_NAMES.Selected, googleTime(new Date(sel.createdAt)), '', '']);
  }
  const header = ['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency'];
  return { csv: [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n', rows: rows.length };
}
