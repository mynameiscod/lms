import mongoose from 'mongoose';
import PlacementCandidate, { PLACEMENT_STAGES, PlacementStage, EXPERIENCE_LEVELS } from '../models/PlacementCandidate';
import PlacementEvent from '../models/PlacementEvent';
import PlacementBooking from '../models/PlacementBooking';
import Tenant from '../models/Tenant';
import { normalizePhone, mobileError } from '../utils/phone';
import { sanitiseAttribution, mergeAttribution } from '../models/careerPilotAttribution';
import crypto from 'crypto';
import { sendByPurpose } from './purposeMessaging';

/**
 * Placement Program — Phase 1: the public form, the WhatsApp confirmation, and the admin list.
 */

export class PlacementError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const PLACEMENT_WELCOME_PURPOSE = 'PLACEMENT_PROGRAM_REGISTERED';

/** The secret in a candidate's own page link. Unguessable; never listed anywhere. */
export const newPortalToken = () => crypto.randomBytes(24).toString('base64url');

/** A tenant from the form's ?tenant= — an id or a slug (the ad links carry the slug). */
export async function resolveTenantId(raw: unknown): Promise<string | null> {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (mongoose.Types.ObjectId.isValid(v)) {
    const t = await Tenant.findById(v).select('_id').lean();
    if (t) return String(t._id);
  }
  const t = await Tenant.findOne({ slug: v.toLowerCase() }).select('_id').lean();
  return t ? String(t._id) : null;
}

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

/** Check a submission and return clean values. Pure, so it is tested without a database. */
export function validateRegistration(b: any): { values?: Record<string, any>; errors: string[] } {
  const errors: string[] = [];
  const name = clip(b?.name, 80);
  if (!name) errors.push('Name is required.');
  const mobErr = mobileError(b?.mobile);
  if (mobErr) errors.push(mobErr);
  const email = clip(b?.email, 120).toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('That email address does not look right.');
  const year = b?.graduationYear ? Number(b.graduationYear) : undefined;
  const thisYear = new Date().getFullYear();
  if (year !== undefined && (!Number.isInteger(year) || year < 1990 || year > thisYear + 6)) errors.push('Graduation year is not valid.');
  const experience = b?.experience ? String(b.experience) : undefined;
  if (experience && !(EXPERIENCE_LEVELS as readonly string[]).includes(experience)) errors.push('Choose your experience from the list.');
  if (errors.length) return { errors };
  return {
    errors,
    values: {
      name, mobile: normalizePhone(b.mobile), email,
      college: clip(b?.college, 120), degree: clip(b?.degree, 60), branch: clip(b?.branch, 80),
      graduationYear: year, experience, skills: clip(b?.skills, 300), targetRole: clip(b?.targetRole, 80), city: clip(b?.city, 60),
    },
  };
}

async function event(tenantId: any, candidateId: any, kind: string, message: string, data?: any, actorId?: string) {
  await PlacementEvent.create({
    tenantId, candidateId, kind, message, data,
    actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : undefined,
  }).catch((e) => console.error('[placement] event not recorded:', e?.message));
}

/**
 * The public form. One record per mobile: a repeat submission refreshes the profile and the
 * last-touch attribution (which ad brought them back) but never resets their stage.
 */
export async function register(tenantId: string, body: any) {
  const { values, errors } = validateRegistration(body);
  if (!values) throw new PlacementError(errors[0]);
  const attribution = sanitiseAttribution(body?.attribution);

  const existing = await PlacementCandidate.findOne({ tenantId, mobile: values.mobile });
  let candidate;
  if (existing) {
    for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== '') (existing as any)[k] = v;
    if (attribution) existing.attribution = mergeAttribution(existing.attribution as any, attribution) as any;
    existing.submissions = (existing.submissions || 1) + 1;
    candidate = await existing.save();
    await event(tenantId, candidate._id, 'resubmitted', 'Submitted the form again', { utm: attribution?.last_touch });
  } else {
    candidate = await PlacementCandidate.create({
      tenantId, ...values, source: 'ad', attribution: attribution ? mergeAttribution(undefined, attribution) : undefined,
      stage: 'registered', stageChangedAt: new Date(), portalToken: newPortalToken(),
    });
    await event(tenantId, candidate._id, 'submitted', 'Submitted the form', { utm: attribution?.first_touch });
  }

  // The confirmation. Without an assigned template nothing is sent — and the timeline says so,
  // rather than everyone assuming a message went out.
  const first = values.name.split(' ')[0];
  const wa = await sendByPurpose(tenantId, values.mobile, PLACEMENT_WELCOME_PURPOSE, [first])
    .catch((e: any) => ({ ok: false, error: e?.message || 'send failed' }));
  await event(tenantId, candidate._id, 'whatsapp',
    wa.ok ? 'WhatsApp confirmation sent' : `WhatsApp confirmation not sent: ${(wa as any).error}`, { ok: wa.ok });

  /* The page link goes back only for a NEW record. Handing it out on a repeat submission would let
     anyone who types a candidate's mobile number open that candidate's page. */
  return { id: String(candidate._id), returning: !!existing, portalToken: existing ? undefined : candidate.portalToken };
}

export async function list(tenantId: string, q: { stage?: string; source?: string; search?: string; page?: number; limit?: number }) {
  const filter: any = { tenantId };
  if (q.stage && (PLACEMENT_STAGES as readonly string[]).includes(q.stage)) filter.stage = q.stage;
  if (q.source && ['ad', 'lms_push', 'manual'].includes(q.source)) filter.source = q.source;
  if (q.search) {
    const s = String(q.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = { $regex: s, $options: 'i' };
    filter.$or = [{ name: re }, { email: re }, { mobile: re }, { college: re }, { 'attribution.last_touch.utm_campaign': re }];
  }
  const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const [rows, total, byStage] = await Promise.all([
    PlacementCandidate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('name mobile email college degree branch graduationYear experience targetRole source stage stageChangedAt attribution.last_touch createdAt submissions').lean(),
    PlacementCandidate.countDocuments(filter),
    PlacementCandidate.aggregate([{ $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]),
  ]);
  return { rows, total, page, limit, byStage: Object.fromEntries(byStage.map((x: any) => [x._id, x.n])) };
}

export async function get(tenantId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new PlacementError('Not found', 404);
  const c = await PlacementCandidate.findOne({ _id: id, tenantId }).lean();
  if (!c) throw new PlacementError('Not found', 404);
  const [events, bookings] = await Promise.all([
    PlacementEvent.find({ candidateId: c._id }).sort({ createdAt: -1 }).limit(200).populate('actorId', 'firstName lastName').lean(),
    PlacementBooking.find({ candidateId: c._id }).sort({ startsAt: -1 }).limit(20).populate('interviewerId', 'name').lean(),
  ]);
  const { portalToken, ...candidate } = c as any; // the link is fetched on purpose, not shipped with every view
  return { candidate: { ...candidate, hasPortal: !!portalToken }, events, bookings };
}

export async function setStage(tenantId: string, id: string, stage: string, actorId: string, note?: string) {
  if (!(PLACEMENT_STAGES as readonly string[]).includes(stage)) throw new PlacementError('Unknown stage');
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c) throw new PlacementError('Not found', 404);
  const from = c.stage;
  if (from === stage) return c;
  c.stage = stage as PlacementStage;
  c.stageChangedAt = new Date();
  await c.save();
  await event(tenantId, c._id, 'stage', `Stage: ${from} → ${stage}${note ? ` — ${clip(note, 300)}` : ''}`, { from, to: stage }, actorId);
  return c;
}

export async function addNote(tenantId: string, id: string, text: string, actorId: string) {
  const message = clip(text, 1000);
  if (!message) throw new PlacementError('Note is empty');
  const c = await PlacementCandidate.findOne({ _id: id, tenantId }).select('_id');
  if (!c) throw new PlacementError('Not found', 404);
  await event(tenantId, c._id, 'note', message, undefined, actorId);
  return { ok: true };
}
