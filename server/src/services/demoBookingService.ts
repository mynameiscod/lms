/**
 * CRM: Book a demo (2026-11-25).
 *
 * A visitor on the institute's website picks a demo slot, verifies their phone by OTP and books a seat.
 * A booking:
 *   1. takes a seat with one conditional update (never more bookings than seats),
 *   2. finds the lead by phone or email, or creates one (normal lead assignment then applies),
 *   3. books an online_demo Meeting on the lead, so the lead page, reminders, workflows, the no-show
 *      follow-up and the reports treat it like any other demo,
 *   4. for slots in our own live room, adds the visitor as a guest of the slot's live class (their
 *      personal /live/<token> link, join tracking and the starts-soon reminder come from Live Classes),
 *   5. moves the lead forward to the Demo stage when the institute has that switched on,
 *   6. sends the confirmation by WhatsApp and email.
 *
 * Each visitor gets a personal booking link (/demo-booking/<token>) to join, reschedule or cancel.
 * After a room slot ends, attendance is settled from the live room: attended, or no-show (which starts
 * the CRM's no-show follow-up and sends a "pick another time" message).
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import DemoSlot, { IDemoSlot } from '../models/DemoSlot';
import DemoBooking, { IDemoBooking } from '../models/DemoBooking';
import DemoBookingConfig, { DEMO_CONFIG_DEFAULTS } from '../models/DemoBookingConfig';
import Tenant from '../models/Tenant';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import Meeting from '../models/Meeting';
import LiveClass from '../models/LiveClass';
import LiveClassInvite from '../models/LiveClassInvite';
import User from '../models/User';
import { recordMeetingOutcome } from './leadDemoService';
import { recordReEnquiry } from './leadReEnquiryService';
import { changeStage } from './leadLifecycleService';
import { milestoneFromLegacy } from '../config/leadMilestones';
import { modulesForTenant } from '../middleware/moduleGate';
import { PUBLIC_BASE, joinLink } from './liveClassInviteService';
import { isHmsConfigured } from './hmsService';
import { buildIcs, istLabel, istToUtc } from '../data/placementSlotPolicy';
import { sendByPurpose } from './purposeMessaging';
import { EmailService } from './emailService';
import { createNotifications } from '../notifications/notificationService';
import { runWithTenant } from './requestContext';

export class DemoError extends Error {
  constructor(message: string, public status = 400, public code?: string) { super(message); }
}

const oid = (v: unknown) => new mongoose.Types.ObjectId(String(v));
const isOid = (v: unknown) => mongoose.Types.ObjectId.isValid(String(v ?? '')) && /^[a-f0-9]{24}$/i.test(String(v));
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const newToken = () => crypto.randomBytes(24).toString('base64url');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const firstName = (n: string) => (String(n || '').trim().split(/\s+/)[0] || 'there');

export const MAX_SLOTS_PER_CREATE = 120;
export const MAX_RESCHEDULES = 3;
/** The join button opens this long before the start. */
export const JOIN_OPENS_MIN = 10;
/** Room slots are settled this long after they end (late leave events from the live room). */
const SETTLE_AFTER_MIN = 15;

export const slugify = (s: string) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
export const bookingLink = (token: string) => `${PUBLIC_BASE()}/demo-booking/${token}`;
export const bookingPageLink = (tenantSlug: string, courseKey?: string) =>
  `${PUBLIC_BASE()}/book-demo/${tenantSlug}${courseKey ? `?course=${encodeURIComponent(courseKey)}` : ''}`;
const endsAt = (s: Pick<IDemoSlot, 'startsAt' | 'durationMin'>) => new Date(new Date(s.startsAt).getTime() + (s.durationMin || 60) * 60_000);

/* ── Settings ─────────────────────────────────────────────────────────────────────────────── */

export async function getConfig(tenantId: string) {
  const c: any = await DemoBookingConfig.findOne({ tenantId: oid(tenantId) }).lean();
  const out: any = { ...DEMO_CONFIG_DEFAULTS };
  if (c) for (const k of Object.keys(DEMO_CONFIG_DEFAULTS)) if (c[k] !== undefined && c[k] !== null) out[k] = c[k];
  return out as typeof DEMO_CONFIG_DEFAULTS;
}

export async function saveConfig(tenantId: string, input: any, userId: string) {
  const set: any = { updatedBy: isOid(userId) ? oid(userId) : undefined };
  if (input.moveToDemoStage !== undefined) set.moveToDemoStage = !!input.moveToDemoStage;
  const num = (k: string, min: number, max: number) => {
    if (input[k] === undefined || input[k] === '') return;
    const n = Math.round(Number(input[k]));
    if (!Number.isFinite(n) || n < min || n > max) throw new DemoError(`${k} must be between ${min} and ${max}`);
    set[k] = n;
  };
  num('defaultSeats', 1, 1000); num('defaultCutoffMin', 0, 7 * 24 * 60); num('defaultDurationMin', 10, 480); num('attendedMinutes', 1, 240);
  if (input.pageTitle !== undefined) set.pageTitle = clip(input.pageTitle, 120) || DEMO_CONFIG_DEFAULTS.pageTitle;
  if (input.pageSubtitle !== undefined) set.pageSubtitle = clip(input.pageSubtitle, 300);
  await DemoBookingConfig.updateOne({ tenantId: oid(tenantId) }, { $set: set }, { upsert: true, runValidators: true });
  return getConfig(tenantId);
}

/* ── Admin: slots ─────────────────────────────────────────────────────────────────────────── */

async function hostOf(tenantId: string, hostId: unknown) {
  if (!isOid(hostId)) throw new DemoError('Pick who runs the demo');
  const u: any = await User.findOne({ _id: oid(hostId), tenantId: oid(tenantId), isActive: { $ne: false }, role: { $ne: 'STUDENT' } })
    .select('firstName lastName email').lean();
  if (!u) throw new DemoError('The host must be an active staff member of this institute');
  return { id: u._id as mongoose.Types.ObjectId, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Host' };
}

function validLink(raw: unknown): string {
  const s = clip(raw, 500);
  try { const u = new URL(s); if (u.protocol === 'https:' || u.protocol === 'http:') return s; } catch { /* below */ }
  throw new DemoError('Paste the full Google Meet or Zoom link, starting with https://');
}

/** Our own room needs Live Classes switched on for the institute and 100ms set up. */
async function assertRoomReady(tenantId: string) {
  const mods: any = await modulesForTenant(tenantId).catch(() => ({}));
  if (mods.liveClasses === false) throw new DemoError('Our own live room needs Live Classes switched on for this institute. Use an outside Meet or Zoom link instead.', 400, 'ROOM_UNAVAILABLE');
  if (!isHmsConfigured(tenantId)) throw new DemoError('Our own live room is not set up yet (100ms keys in Platform Settings → Live Classes). Use an outside Meet or Zoom link instead.', 400, 'ROOM_UNAVAILABLE');
}

async function liveClassFor(tenantId: string, slot: { title: string; description?: string; startsAt: Date; durationMin: number }, host: { id: any; name: string }, actorId: string) {
  const lc = await LiveClass.create({
    tenantId: oid(tenantId), title: slot.title, description: slot.description || 'Free demo booked from the website',
    mode: 'online', instructorId: host.id, instructorName: host.name, batchIds: [], openToInstitute: false,
    scheduledAt: slot.startsAt, durationMin: slot.durationMin, status: 'scheduled', createdBy: isOid(actorId) ? oid(actorId) : host.id,
  });
  return lc._id as mongoose.Types.ObjectId;
}

/** IST "YYYY-MM-DD" for a date. */
const istDay = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);

/**
 * The start times asked for: one date, or every chosen weekday from `date` until `repeat.until` (IST).
 * Weekdays are 0 = Sunday … 6 = Saturday.
 */
export function startTimes(input: { date: string; time: string; repeat?: { weekdays?: number[]; until?: string } | null }, now = new Date()): Date[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ''))) throw new DemoError('Pick a date');
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(input.time || ''));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new DemoError('Pick a start time');
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  const days: string[] = [];
  const weekdays = (input.repeat?.weekdays || []).map(Number).filter((n) => n >= 0 && n <= 6);
  if (input.repeat && weekdays.length) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.repeat.until || ''))) throw new DemoError('Pick the date the repeat ends');
    if (input.repeat.until! < input.date) throw new DemoError('The repeat must end on or after the first date');
    // Calendar dates only (UTC midnight of each date), so the weekday is the date's own weekday.
    for (let d = new Date(`${input.date}T00:00:00Z`); d.toISOString().slice(0, 10) <= input.repeat.until!; d = new Date(d.getTime() + 86_400_000)) {
      if (weekdays.includes(d.getUTCDay())) days.push(d.toISOString().slice(0, 10));
      if (days.length > MAX_SLOTS_PER_CREATE) throw new DemoError(`That makes more than ${MAX_SLOTS_PER_CREATE} slots. Choose a shorter period.`);
    }
    if (!days.length) throw new DemoError('None of the chosen weekdays fall in that period');
  } else days.push(input.date);
  const times = days.map((d) => istToUtc(d, minutes)).filter((t) => t.getTime() > now.getTime());
  if (!times.length) throw new DemoError('That time has already passed');
  return times;
}

export async function createSlots(tenantId: string, input: any, actorId: string) {
  const cfg = await getConfig(tenantId);
  const course = clip(input.course, 120);
  if (!course) throw new DemoError('Enter the course');
  const courseKey = slugify(input.courseKey || course);
  if (!courseKey) throw new DemoError('Enter a course name with letters or numbers');
  const title = clip(input.title, 160) || `Free demo: ${course}`;
  const description = clip(input.description, 1000);
  const durationMin = Math.round(Number(input.durationMin || cfg.defaultDurationMin));
  const seats = Math.round(Number(input.seats || cfg.defaultSeats));
  const cutoffMin = Math.round(Number(input.cutoffMin ?? cfg.defaultCutoffMin));
  if (!(durationMin >= 10 && durationMin <= 480)) throw new DemoError('Duration must be 10 to 480 minutes');
  if (!(seats >= 1 && seats <= 1000)) throw new DemoError('Seats must be 1 to 1000');
  if (!(cutoffMin >= 0 && cutoffMin <= 7 * 24 * 60)) throw new DemoError('Booking cutoff must be 0 minutes to 7 days');
  const joinMethod = input.joinMethod === 'link' ? 'link' : 'room';
  const meetingLink = joinMethod === 'link' ? validLink(input.meetingLink) : undefined;
  const host = await hostOf(tenantId, input.hostId);
  if (joinMethod === 'room') await assertRoomReady(tenantId);
  const times = startTimes(input);
  const seriesId = times.length > 1 ? crypto.randomBytes(8).toString('hex') : undefined;

  const created: any[] = [];
  for (const startsAt of times) {
    const base = { title, description, startsAt, durationMin };
    const liveClassId = joinMethod === 'room' ? await liveClassFor(tenantId, base, host, actorId) : undefined;
    created.push(await DemoSlot.create({
      tenantId: oid(tenantId), course, courseKey, ...base, seats, cutoffMin, hostId: host.id, hostName: host.name,
      joinMethod, meetingLink, liveClassId, status: 'open', seriesId, createdBy: isOid(actorId) ? oid(actorId) : host.id,
    }));
  }
  return created;
}

export async function listSlots(tenantId: string, q: { scope?: string; from?: string; to?: string } = {}) {
  const filter: any = { tenantId: oid(tenantId) };
  const now = new Date();
  if (q.scope === 'past') filter.startsAt = { $lt: now };
  else if (q.scope !== 'all') filter.$or = [{ startsAt: { $gte: new Date(now.getTime() - 6 * 3600_000) } }];
  if (q.from || q.to) {
    filter.startsAt = { ...(filter.startsAt || {}) };
    if (q.from) filter.startsAt.$gte = new Date(q.from);
    if (q.to) filter.startsAt.$lte = new Date(q.to);
    delete filter.$or;
  }
  const slots: any[] = await DemoSlot.find(filter).sort({ startsAt: q.scope === 'past' ? -1 : 1 }).limit(500).lean();
  const counts = await DemoBooking.aggregate([
    { $match: { tenantId: oid(tenantId), slotId: { $in: slots.map((s) => s._id) } } },
    { $group: { _id: { slot: '$slotId', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const by: Record<string, Record<string, number>> = {};
  for (const c of counts) (by[String(c._id.slot)] ||= {})[c._id.status] = c.n;
  return slots.map((s) => ({ ...s, endsAt: endsAt(s), counts: { booked: 0, attended: 0, no_show: 0, cancelled: 0, ...(by[String(s._id)] || {}) } }));
}

async function slotOf(tenantId: string, id: string) {
  if (!isOid(id)) throw new DemoError('Slot not found', 404);
  const slot = await DemoSlot.findOne({ _id: oid(id), tenantId: oid(tenantId) });
  if (!slot) throw new DemoError('Slot not found', 404);
  return slot;
}

/** Change a slot. A new time moves every booking on it (their demo meetings too) and tells them. */
export async function updateSlot(tenantId: string, id: string, input: any, actorId: string) {
  const slot = await slotOf(tenantId, id);
  if (slot.status !== 'open') throw new DemoError('Only an open slot can be changed');
  const before = { startsAt: slot.startsAt, durationMin: slot.durationMin };
  if (input.title !== undefined) slot.title = clip(input.title, 160) || slot.title;
  if (input.description !== undefined) slot.description = clip(input.description, 1000);
  if (input.seats !== undefined) {
    const seats = Math.round(Number(input.seats));
    if (!(seats >= 1 && seats <= 1000)) throw new DemoError('Seats must be 1 to 1000');
    if (seats < slot.booked) throw new DemoError(`${slot.booked} people have already booked. Seats cannot be fewer than that.`);
    slot.seats = seats;
  }
  if (input.cutoffMin !== undefined) {
    const c = Math.round(Number(input.cutoffMin));
    if (!(c >= 0 && c <= 7 * 24 * 60)) throw new DemoError('Booking cutoff must be 0 minutes to 7 days');
    slot.cutoffMin = c;
  }
  if (input.hostId !== undefined && String(input.hostId) !== String(slot.hostId)) {
    const host = await hostOf(tenantId, input.hostId);
    slot.hostId = host.id; slot.hostName = host.name;
  }
  if (input.meetingLink !== undefined && slot.joinMethod === 'link') slot.meetingLink = validLink(input.meetingLink);
  if (input.durationMin !== undefined) {
    const d = Math.round(Number(input.durationMin));
    if (!(d >= 10 && d <= 480)) throw new DemoError('Duration must be 10 to 480 minutes');
    slot.durationMin = d;
  }
  if (input.date || input.time) {
    const [t] = startTimes({ date: input.date || istDay(slot.startsAt), time: input.time || '' });
    slot.startsAt = t;
  }
  await slot.save();
  if (slot.liveClassId) {
    await LiveClass.updateOne({ _id: slot.liveClassId, tenantId: slot.tenantId }, {
      $set: { title: slot.title, scheduledAt: slot.startsAt, durationMin: slot.durationMin, instructorId: slot.hostId, instructorName: slot.hostName,
        ...(String(before.startsAt) !== String(slot.startsAt) ? { reminderSent: false } : {}) },
    });
  }
  const moved = new Date(before.startsAt).getTime() !== new Date(slot.startsAt).getTime();
  if (moved) {
    const rows = await DemoBooking.find({ tenantId: slot.tenantId, slotId: slot._id, status: 'booked' });
    for (const b of rows) {
      await DemoBooking.updateOne({ _id: b._id }, { $set: { remindersSent: [] } });
      if (b.meetingId) await setMeeting(tenantId, b.meetingId, { status: 'rescheduled', scheduledAt: slot.startsAt, durationMinutes: slot.durationMin, remindedAt: null }, actorId);
      notify(tenantId, 'moved', b, slot);
    }
  }
  return slot;
}

/** Cancel a slot: every booking is cancelled, the demo meetings too, and each visitor gets a rebook link. */
export async function cancelSlot(tenantId: string, id: string, reason: string, actorId: string) {
  const slot = await slotOf(tenantId, id);
  if (slot.status === 'cancelled') return slot;
  if (slot.status === 'done') throw new DemoError('This demo has already happened');
  slot.status = 'cancelled';
  await slot.save();
  if (slot.liveClassId) await LiveClass.updateOne({ _id: slot.liveClassId, tenantId: slot.tenantId }, { $set: { status: 'cancelled' } });
  const rows = await DemoBooking.find({ tenantId: slot.tenantId, slotId: slot._id, status: 'booked' });
  const why = clip(reason, 300) || 'The institute cancelled this demo';
  for (const b of rows) {
    await DemoBooking.updateOne({ _id: b._id }, { $set: { status: 'cancelled', cancelledBy: 'institute' } });
    if (b.meetingId) await setMeeting(tenantId, b.meetingId, { status: 'cancelled', cancellationReason: why }, actorId);
    notify(tenantId, 'slot_cancelled', b, slot);
  }
  await DemoSlot.updateOne({ _id: slot._id }, { $set: { booked: 0 } });
  return slot;
}

/** Remove a slot nobody has booked. */
export async function deleteSlot(tenantId: string, id: string) {
  const slot = await slotOf(tenantId, id);
  const any = await DemoBooking.exists({ tenantId: slot.tenantId, slotId: slot._id });
  if (any) throw new DemoError('People have booked this slot. Cancel it instead, so they are told.');
  if (slot.liveClassId) await LiveClass.deleteOne({ _id: slot.liveClassId, tenantId: slot.tenantId, status: 'scheduled' });
  await DemoSlot.deleteOne({ _id: slot._id });
}

export async function slotAttendees(tenantId: string, id: string) {
  const slot = await slotOf(tenantId, id);
  const rows: any[] = await DemoBooking.find({ tenantId: slot.tenantId, slotId: slot._id }).sort({ createdAt: 1 }).lean();
  const leads: any[] = await Lead.find({ _id: { $in: rows.map((r) => r.leadId) }, tenantId: slot.tenantId })
    .select('name assignedTo stageId').populate('assignedTo', 'firstName lastName').populate('stageId', 'name color').lean();
  const leadBy = new Map(leads.map((l) => [String(l._id), l]));
  const invites: any[] = slot.liveClassId ? await LiveClassInvite.find({ _id: { $in: rows.map((r) => r.liveInviteId).filter(Boolean) } })
    .select('firstJoinedAt totalSeconds lastSeenAt').lean() : [];
  const invBy = new Map(invites.map((i) => [String(i._id), i]));
  return {
    slot: { ...slot.toObject(), endsAt: endsAt(slot) },
    attendees: rows.map((r) => {
      const l = leadBy.get(String(r.leadId));
      const inv = r.liveInviteId ? invBy.get(String(r.liveInviteId)) : null;
      const owner = l?.assignedTo ? [l.assignedTo.firstName, l.assignedTo.lastName].filter(Boolean).join(' ') : '';
      return {
        _id: r._id, name: r.name, phone: r.phone, email: r.email || '', status: r.status, cancelledBy: r.cancelledBy,
        leadId: r.leadId, owner, stage: l?.stageId ? { name: l.stageId.name, color: l.stageId.color } : null,
        bookedAt: r.createdAt, joinClickedAt: r.joinClickedAt, joinedRoomAt: inv?.firstJoinedAt || null,
        minutesInRoom: r.minutesInRoom ?? (inv ? minutesOf(inv) : null), source: r.utm?.source || '',
      };
    }),
  };
}

const minutesOf = (inv: any) => {
  if (!inv?.firstJoinedAt) return 0;
  const counted = Math.round((inv.totalSeconds || 0) / 60);
  // No leave event arrived (the tab was closed, the webhook missed): the time between first and last seen.
  const seen = inv.lastSeenAt ? Math.round((new Date(inv.lastSeenAt).getTime() - new Date(inv.firstJoinedAt).getTime()) / 60_000) : 0;
  return Math.max(counted, seen);
};

/** Mark one booking attended or no-show by hand (outside-link slots, or to correct the room's record). */
export async function markAttendance(tenantId: string, bookingId: string, status: string, actorId: string) {
  if (!['attended', 'no_show'].includes(status)) throw new DemoError('Mark attended or no-show');
  if (!isOid(bookingId)) throw new DemoError('Booking not found', 404);
  const b = await DemoBooking.findOne({ _id: oid(bookingId), tenantId: oid(tenantId) });
  if (!b) throw new DemoError('Booking not found', 404);
  if (b.status === 'cancelled') throw new DemoError('This booking was cancelled');
  const slot = await DemoSlot.findById(b.slotId);
  if (slot && new Date(slot.startsAt).getTime() > Date.now()) throw new DemoError('Attendance can be marked once the demo has started');
  if (b.status === status) return b;
  b.status = status as any;
  await b.save();
  if (b.meetingId) await setMeeting(tenantId, b.meetingId, { status: status === 'attended' ? 'completed' : 'no_show' }, actorId);
  return b;
}

/* ── Meetings ─────────────────────────────────────────────────────────────────────────────── */

/** Change a demo meeting and write the change onto the lead, exactly as the lead page's meeting edit does. */
async function setMeeting(tenantId: string, meetingId: any, set: Record<string, any>, actorId: string) {
  const before: any = await Meeting.findOne({ _id: meetingId, tenantId: String(tenantId) }).lean();
  if (!before) return;
  const update = { ...set };
  if (update.status === 'completed') update.completedAt = new Date();
  if (update.status === 'cancelled') update.cancelledAt = new Date();
  const meeting: any = await Meeting.findOneAndUpdate({ _id: meetingId, tenantId: String(tenantId) }, { $set: update }, { new: true });
  if (!meeting) return;
  const statusChanged = update.status && update.status !== before.status;
  const moved = update.scheduledAt && new Date(update.scheduledAt).getTime() !== new Date(before.scheduledAt).getTime();
  if (statusChanged || moved) {
    await recordMeetingOutcome(String(tenantId), meeting, before, String(actorId)).catch((e) => console.error('[demo-booking] lead update failed', e?.message));
  }
}

async function bookMeeting(tenantId: string, lead: any, slot: IDemoSlot, token: string, actorId: string) {
  const attendees = [String(slot.hostId), ...(lead.assignedTo ? [String(lead.assignedTo)] : [])];
  const meeting = await Meeting.create({
    tenantId: String(tenantId), leadId: lead._id, type: 'online_demo', title: slot.title,
    scheduledAt: slot.startsAt, durationMinutes: slot.durationMin, attendees: [...new Set(attendees)],
    meetingLink: bookingLink(token), notes: `Booked from the website (Book a demo). ${slot.joinMethod === 'room' ? 'Our live room' : 'Outside link'}.`,
    sendWhatsApp: false, sendEmail: false, createdBy: String(actorId),
  });
  await Lead.updateOne({ _id: lead._id, tenantId: oid(tenantId) }, {
    $push: { activities: {
      type: 'meeting', description: `Demo booked from the website: ${slot.title} on ${istLabel(new Date(slot.startsAt))} IST`,
      createdBy: actorId, createdAt: new Date(), metadata: { meetingId: String(meeting._id), status: 'scheduled', meetingType: 'online_demo' },
    } },
    $set: { demoBookedAt: slot.startsAt },
  });
  import('./workflow/engine').then((m) => m.onDemoBooked(String(tenantId), meeting.toObject())).catch((e) => console.error('[workflow] demo booked failed', e?.message));
  return meeting;
}

/* ── Leads ────────────────────────────────────────────────────────────────────────────────── */

async function findOrCreateLead(tenant: any, p: { name: string; phone: string; email: string; course: string; utm: any; pageUrl: string }) {
  const tenantId = String(tenant._id);
  const or: any[] = [{ phone: { $in: [p.phone, `+91${p.phone}`, `91${p.phone}`, `+91 ${p.phone}`] } }];
  if (p.email) or.push({ email: p.email });
  const existing: any = await Lead.findOne({ tenantId: tenant._id, $or: or }).select('_id assignedTo stageId').lean();
  const note = `Booked a demo from the website: ${p.course}.`;
  if (existing) {
    await Lead.updateOne({ _id: existing._id }, { $set: { archivedAt: null, 'customFields.phoneVerified': 'yes' }, $addToSet: { courseInterest: p.course } });
    await recordReEnquiry(tenantId, existing._id, { channel: 'website', note }).catch(() => undefined);
    return { lead: existing, isNew: false };
  }
  const stage = await LeadStage.findOne({ tenantId: tenant._id, isDefault: true }) || await LeadStage.findOne({ tenantId: tenant._id });
  if (!stage) throw new DemoError('Bookings are not open yet. Please contact the institute.', 503);
  const adminId = tenant.adminId;
  let pagePath = '';
  try { pagePath = p.pageUrl ? new URL(p.pageUrl, 'https://x.invalid').pathname : ''; } catch { /* none */ }
  const lead: any = await new Lead({
    tenantId: tenant._id, createdBy: adminId, name: p.name, phone: p.phone, email: p.email || undefined,
    source: 'website', priority: 'hot', stageId: stage._id, courseInterest: [p.course],
    sourceDetails: { platform: 'website', landingPage: pagePath, referrerUrl: p.pageUrl, formId: 'book-demo' },
    customFields: new Map(Object.entries({ phoneVerified: 'yes', bookedDemo: 'yes' })),
    utmParams: p.utm,
    activities: [{ type: 'created', description: `Hot lead from the website. ${note} Phone verified by WhatsApp OTP.`, createdBy: adminId, createdAt: new Date() }],
  }).save();
  // Lead assignment runs from the save hook; give it a moment so the demo meeting can include the owner.
  await new Promise((r) => setTimeout(r, 400));
  const fresh: any = await Lead.findById(lead._id).select('_id assignedTo stageId').lean();
  return { lead: fresh || lead, isNew: true };
}

/** Forward only: into the Demo stage from any stage before it (or from Lost, as they came back). */
async function moveToDemoStage(tenantId: string, leadId: any, actorId: string) {
  const tid = oid(tenantId);
  const stages: any[] = await LeadStage.find({ tenantId: tid, isActive: { $ne: false } }).sort({ order: 1 }).lean();
  const demo = stages.find((s) => milestoneFromLegacy(s) === 'demo');
  if (!demo) return;
  const lead: any = await Lead.findOne({ _id: leadId, tenantId: tid }).select('stageId').lean();
  const current = stages.find((s) => String(s._id) === String(lead?.stageId));
  const m = current ? milestoneFromLegacy(current) : 'new';
  if (['demo', 'seat_reserved', 'enrolled'].includes(m)) return;
  await changeStage({
    tenantId, leadId: String(leadId), stageId: String(demo._id), actor: { id: String(actorId), role: 'TENANT_ADMIN' },
    source: 'automation', note: 'Booked a demo from the website',
  }).catch((e) => console.error('[demo-booking] stage move failed', e?.message));
}

/* ── Public ───────────────────────────────────────────────────────────────────────────────── */

export async function tenantForBooking(slug: string) {
  const tenant: any = await Tenant.findOne({ slug: String(slug || '').toLowerCase(), isActive: true }).select('_id name slug adminId logo branding').lean();
  if (!tenant) throw new DemoError('This booking page does not exist.', 404);
  const mods: any = await modulesForTenant(String(tenant._id)).catch(() => ({}));
  if (!mods.crmDemoBooking) throw new DemoError('Demo booking is not open for this institute.', 404);
  return tenant;
}

const openSlotFilter = (tenantId: any, now = new Date()) => ({
  tenantId, status: 'open', startsAt: { $gt: now },
  $expr: { $and: [{ $lt: ['$booked', '$seats'] }, { $gt: ['$startsAt', { $add: [now, { $multiply: ['$cutoffMin', 60_000] }] }] }] },
});

const publicSlot = (s: any) => ({
  _id: s._id, course: s.course, courseKey: s.courseKey, title: s.title, description: s.description || '',
  startsAt: s.startsAt, durationMin: s.durationMin, seatsLeft: Math.max(0, s.seats - s.booked), seats: s.seats,
  hostName: s.hostName || '', joinMethod: s.joinMethod,
});

export async function publicCatalog(slug: string) {
  const tenant = await tenantForBooking(slug);
  const cfg = await getConfig(String(tenant._id));
  const until = new Date(Date.now() + 60 * 86_400_000);
  const slots: any[] = await DemoSlot.find({ ...openSlotFilter(tenant._id), startsAt: { $gt: new Date(), $lte: until } } as any)
    .sort({ startsAt: 1 }).limit(300).lean();
  const courses = new Map<string, string>();
  for (const s of slots) if (!courses.has(s.courseKey)) courses.set(s.courseKey, s.course);
  return {
    institute: { name: tenant.name, slug: tenant.slug, logo: tenant.branding?.logoUrl || tenant.logo || '' },
    page: { title: cfg.pageTitle, subtitle: cfg.pageSubtitle },
    courses: [...courses].map(([key, name]) => ({ key, name })),
    slots: slots.map(publicSlot),
  };
}

export interface BookInput {
  slotId: string; name: string; phone: string; email?: string; verificationToken: string;
  utm?: Record<string, string>; pageUrl?: string;
}

/**
 * Book a seat. `phone` must already be normalised and `spendProof` spends the visitor's OTP proof
 * (it returns null when the proof is missing or expired, and a function that gives it back).
 */
export async function book(slug: string, input: BookInput, spendProof: () => Promise<null | (() => Promise<unknown>)>) {
  const tenant = await tenantForBooking(slug);
  const tenantId = String(tenant._id);
  if (!isOid(input.slotId)) throw new DemoError('Pick a slot');
  const slot0: any = await DemoSlot.findOne({ _id: oid(input.slotId), tenantId: tenant._id }).lean();
  if (!slot0 || slot0.status !== 'open') throw new DemoError('This slot is no longer available. Please pick another.', 409, 'SLOT_GONE');

  const release = await spendProof();
  if (!release) throw new DemoError('Please verify your mobile number first.', 401, 'NOT_VERIFIED');

  try {
    // Already booked for this course: this is a reschedule (or the same slot again).
    const active = await DemoBooking.findOne({ tenantId: tenant._id, phone: input.phone, courseKey: slot0.courseKey, status: 'booked' });
    if (active) {
      if (String(active.slotId) === String(slot0._id)) return { booking: active, slot: slot0, already: true };
      const moved = await moveBooking(active, String(slot0._id), 'visitor');
      return { booking: moved.booking, slot: moved.slot, rescheduled: true };
    }

    const slot = await DemoSlot.findOneAndUpdate({ _id: slot0._id, ...openSlotFilter(tenant._id) } as any, { $inc: { booked: 1 } }, { new: true });
    if (!slot) {
      await release();
      const now0: any = await DemoSlot.findById(slot0._id).select('booked seats').lean();
      throw new DemoError(now0 && now0.booked >= now0.seats ? 'Sorry, that slot just filled up. Please pick another.' : 'Booking for that slot has closed. Please pick another.', 409, 'SLOT_GONE');
    }
    const giveSeatBack = () => DemoSlot.updateOne({ _id: slot._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } });

    let booking: IDemoBooking;
    try {
      const { lead } = await findOrCreateLead(tenant, { name: input.name, phone: input.phone, email: input.email || '', course: slot.course, utm: input.utm || {}, pageUrl: input.pageUrl || '' });
      const token = newToken();
      try {
        booking = await DemoBooking.create({
          tenantId: tenant._id, slotId: slot._id, courseKey: slot.courseKey, leadId: lead._id, name: input.name, phone: input.phone,
          email: input.email || undefined, token, status: 'booked', utm: input.utm || {}, pageUrl: input.pageUrl || undefined,
        });
      } catch (e: any) {
        if (e?.code === 11000) { // a second tab booked the same course a moment ago
          await giveSeatBack();
          const existing = await DemoBooking.findOne({ tenantId: tenant._id, phone: input.phone, courseKey: slot.courseKey, status: 'booked' });
          if (existing) return { booking: existing, slot: await DemoSlot.findById(existing.slotId).lean(), already: true };
        }
        throw e;
      }
      const actorId = String(slot.hostId);
      const meeting = await bookMeeting(tenantId, lead, slot, token, actorId);
      const set: any = { meetingId: meeting._id };
      if (slot.joinMethod === 'room' && slot.liveClassId) set.liveInviteId = await guestInvite(slot, booking);
      await DemoBooking.updateOne({ _id: booking._id }, { $set: set });
      Object.assign(booking, set);

      const cfg = await getConfig(tenantId);
      if (cfg.moveToDemoStage) await moveToDemoStage(tenantId, lead._id, actorId);
      if (lead.assignedTo) {
        createNotifications(tenantId, [String(lead.assignedTo)], 'general', '📅 Demo booked from the website',
          `${input.name} booked "${slot.title}" on ${istLabel(new Date(slot.startsAt))} IST.`, `/leads/${lead._id}`).catch(() => undefined);
      }
    } catch (e) {
      await giveSeatBack();
      throw e;
    }
    notify(tenantId, 'booked', booking, slot);
    return { booking, slot: slot.toObject() };
  } catch (e) {
    await release();
    throw e;
  }
}

/** The visitor as a guest of the slot's live class: their own join link, join tracking, the starts-soon reminder. */
async function guestInvite(slot: IDemoSlot, b: IDemoBooking) {
  const contactKey = b.email || `+91${b.phone}`;
  const inv: any = await LiveClassInvite.findOneAndUpdate(
    { liveClassId: slot.liveClassId, contactKey },
    { $setOnInsert: { tenantId: slot.tenantId, liveClassId: slot.liveClassId, kind: 'contact', contactKey, token: newToken() },
      $set: { name: b.name, email: b.email || undefined, phone: `+91${b.phone}` } },
    { upsert: true, new: true },
  );
  return inv._id as mongoose.Types.ObjectId;
}

async function dropGuestInvite(b: IDemoBooking) {
  if (b.liveInviteId) await LiveClassInvite.deleteOne({ _id: b.liveInviteId, firstJoinedAt: null }).catch(() => undefined);
}

export async function bookingByToken(token: string) {
  const t = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) throw new DemoError('This booking link is not valid.', 404);
  const booking = await DemoBooking.findOne({ token: t });
  if (!booking) throw new DemoError('This booking link is not valid.', 404);
  const slot = await DemoSlot.findById(booking.slotId);
  if (!slot) throw new DemoError('This booking link is not valid.', 404);
  return { booking, slot };
}

export async function publicBookingView(token: string) {
  const { booking, slot } = await bookingByToken(token);
  const tenant: any = await Tenant.findById(booking.tenantId).select('name slug branding logo').lean();
  const now = Date.now();
  const start = new Date(slot.startsAt).getTime();
  const end = endsAt(slot).getTime();
  const live = booking.status === 'booked' && slot.status === 'open';
  return {
    institute: { name: tenant?.name || '', slug: tenant?.slug || '', logo: tenant?.branding?.logoUrl || tenant?.logo || '' },
    name: booking.name, status: booking.status, cancelledBy: booking.cancelledBy || null,
    slot: { ...publicSlot(slot), status: slot.status, endsAt: endsAt(slot) },
    joinOpensAt: new Date(start - JOIN_OPENS_MIN * 60_000),
    canJoin: live && now >= start - JOIN_OPENS_MIN * 60_000 && now <= end,
    ended: now > end,
    canChange: live && now < start && booking.rescheduleCount < MAX_RESCHEDULES,
    canCancel: live && now < start,
    rebookUrl: tenant?.slug ? bookingPageLink(tenant.slug, slot.courseKey) : '',
  };
}

/** The link to send a visitor to when they press Join. */
export async function joinUrl(token: string) {
  const { booking, slot } = await bookingByToken(token);
  const view = await publicBookingView(token);
  if (!view.canJoin) {
    if (view.ended) throw new DemoError('This demo has ended.', 409, 'ENDED');
    if (booking.status !== 'booked' || slot.status !== 'open') throw new DemoError('This booking is no longer active.', 409, 'INACTIVE');
    throw new DemoError(`The join button opens ${JOIN_OPENS_MIN} minutes before the start.`, 409, 'NOT_YET');
  }
  await DemoBooking.updateOne({ _id: booking._id, joinClickedAt: null }, { $set: { joinClickedAt: new Date() } });
  if (slot.joinMethod === 'link') return slot.meetingLink!;
  const inv: any = booking.liveInviteId ? await LiveClassInvite.findById(booking.liveInviteId).select('token').lean() : null;
  if (!inv) throw new DemoError('Your join link could not be found. Please contact the institute.', 404);
  return joinLink(inv.token);
}

export async function cancelByVisitor(token: string) {
  const { booking, slot } = await bookingByToken(token);
  if (booking.status !== 'booked') return booking;
  if (new Date(slot.startsAt).getTime() <= Date.now()) throw new DemoError('This demo has already started and cannot be cancelled.');
  const done = await DemoBooking.findOneAndUpdate({ _id: booking._id, status: 'booked' }, { $set: { status: 'cancelled', cancelledBy: 'visitor' } }, { new: true });
  if (!done) return booking;
  await DemoSlot.updateOne({ _id: slot._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
  await dropGuestInvite(booking);
  if (booking.meetingId) await setMeeting(String(booking.tenantId), booking.meetingId, { status: 'cancelled', cancellationReason: 'Cancelled by the visitor from their booking link' }, String(slot.hostId));
  return done;
}

export async function rescheduleByVisitor(token: string, slotId: string) {
  const { booking } = await bookingByToken(token);
  if (booking.status !== 'booked') throw new DemoError('This booking is no longer active. Please book again.');
  if (booking.rescheduleCount >= MAX_RESCHEDULES) throw new DemoError('This booking has been moved too many times. Please contact the institute.');
  return moveBooking(booking, slotId, 'visitor');
}

/** Move a booking to another slot of the same institute: new seat first, then the old one is given back. */
async function moveBooking(booking: IDemoBooking, slotId: string, _by: 'visitor') {
  if (!isOid(slotId)) throw new DemoError('Pick a slot');
  const from = await DemoSlot.findById(booking.slotId);
  if (from && new Date(from.startsAt).getTime() <= Date.now()) throw new DemoError('This demo has already started and cannot be moved.');
  if (String(booking.slotId) === String(slotId)) return { booking, slot: from!.toObject() };
  const to = await DemoSlot.findOneAndUpdate({ _id: oid(slotId), ...openSlotFilter(booking.tenantId) } as any, { $inc: { booked: 1 } }, { new: true });
  if (!to) throw new DemoError('That slot is no longer available. Please pick another.', 409, 'SLOT_GONE');
  if (from) await DemoSlot.updateOne({ _id: from._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
  await dropGuestInvite(booking);
  booking.slotId = to._id as any;
  booking.courseKey = to.courseKey;
  booking.rescheduleCount += 1;
  booking.remindersSent = [];
  booking.liveInviteId = undefined;
  if (to.joinMethod === 'room' && to.liveClassId) booking.liveInviteId = await guestInvite(to, booking);
  await booking.save();
  if (booking.meetingId) {
    await setMeeting(String(booking.tenantId), booking.meetingId, {
      status: 'rescheduled', scheduledAt: to.startsAt, durationMinutes: to.durationMin, title: to.title, remindedAt: null,
      attendees: [String(to.hostId)],
    }, String(to.hostId));
  }
  notify(String(booking.tenantId), 'rescheduled', booking, to);
  return { booking, slot: to.toObject() };
}

/* ── Messages ─────────────────────────────────────────────────────────────────────────────── */

type Kind = 'booked' | 'rescheduled' | 'moved' | 'reminder' | 'slot_cancelled' | 'missed';

function emailHtml(kind: Kind, b: IDemoBooking, slot: any, instituteName: string, rebook: string) {
  const when = `${istLabel(new Date(slot.startsAt))} IST`;
  const link = bookingLink(b.token);
  const head: Record<Kind, string> = {
    booked: 'Your demo is booked', rescheduled: 'Your demo has been moved', moved: 'Your demo has a new time',
    reminder: 'Your demo is coming up', slot_cancelled: 'Your demo was cancelled', missed: 'We missed you at the demo',
  };
  const line: Record<Kind, string> = {
    booked: `You are booked for <b>${esc(slot.title)}</b> on <b>${esc(when)}</b> (${slot.durationMin} minutes).`,
    rescheduled: `Your demo is now <b>${esc(slot.title)}</b> on <b>${esc(when)}</b>.`,
    moved: `${esc(instituteName)} moved <b>${esc(slot.title)}</b> to <b>${esc(when)}</b>. If the new time does not suit you, pick another from your booking page.`,
    reminder: `<b>${esc(slot.title)}</b> starts on <b>${esc(when)}</b>. The join button on your booking page opens ${JOIN_OPENS_MIN} minutes before.`,
    slot_cancelled: `${esc(instituteName)} had to cancel <b>${esc(slot.title)}</b> on ${esc(when)}. Sorry about that. Please pick another time.`,
    missed: `<b>${esc(slot.title)}</b> on ${esc(when)} has ended and we did not see you there. Pick another time that suits you.`,
  };
  const button = ['slot_cancelled', 'missed'].includes(kind) ? { href: rebook, text: 'Pick another time' } : { href: link, text: 'Open my booking' };
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  <h2 style="color:#051D64;margin:0 0 12px">${head[kind]}</h2>
  <p>Hi ${esc(firstName(b.name))},</p>
  <p>${line[kind]}</p>
  ${['slot_cancelled', 'missed'].includes(kind) ? '' : `<p>The demo is online. You can join from your phone or computer, with no installation and no login.</p>`}
  <p style="margin:24px 0"><a href="${esc(button.href)}" style="background:#051D64;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${button.text}</a></p>
  ${['booked', 'rescheduled', 'moved'].includes(kind) ? `<p style="font-size:13px;color:#6b7280">From the same page you can reschedule or cancel. Please keep this link to yourself: it is your seat.</p>` : ''}
  <p style="font-size:13px;color:#6b7280">${esc(instituteName)}</p></div>`;
}

const SUBJECT: Record<Kind, (t: string) => string> = {
  booked: (t) => `Booked: ${t}`, rescheduled: (t) => `Moved: ${t}`, moved: (t) => `New time: ${t}`,
  reminder: (t) => `Reminder: ${t}`, slot_cancelled: (t) => `Cancelled: ${t}`, missed: (t) => `Missed: ${t}`,
};

/** Send the visitor a message by WhatsApp and email, in the background. Never throws. */
export function notify(tenantId: string, kind: Kind, b: IDemoBooking, slot: any): void {
  setImmediate(() => {
    runWithTenant(tenantId, async () => {
      const tenant: any = await Tenant.findById(tenantId).select('name slug').lean();
      const name = tenant?.name || 'The institute';
      const rebook = tenant?.slug ? bookingPageLink(tenant.slug, slot.courseKey) : bookingLink(b.token);
      const when = `${istLabel(new Date(slot.startsAt))} IST`;
      try {
        if (kind === 'booked' || kind === 'rescheduled' || kind === 'reminder') {
          await sendByPurpose(tenantId, b.phone, kind === 'reminder' ? 'DEMO_REMINDER' : 'DEMO_BOOKED', [firstName(b.name), slot.title, when, bookingLink(b.token)]);
        } else {
          const what = kind === 'moved' ? `your demo ${slot.title} has a new time: ${when}`
            : kind === 'slot_cancelled' ? `your demo ${slot.title} on ${when} was cancelled`
              : `we missed you at the demo ${slot.title} on ${when}`;
          await sendByPurpose(tenantId, b.phone, 'DEMO_UPDATE', [firstName(b.name), what, kind === 'moved' ? bookingLink(b.token) : rebook]);
        }
      } catch (e: any) { console.error('[demo-booking] WhatsApp failed', e?.message); }
      if (b.email) {
        try {
          const ics = ['booked', 'rescheduled', 'moved'].includes(kind) ? [{ filename: 'demo.ics', content: Buffer.from(buildIcs({
            uid: `demo-${b._id}@codebegun`, startsAt: new Date(slot.startsAt), endsAt: endsAt(slot), summary: slot.title,
            description: `Join, reschedule or cancel: ${bookingLink(b.token)}`, url: bookingLink(b.token),
          })) }] : undefined;
          await new EmailService().sendGenericEmail(b.email, SUBJECT[kind](slot.title), emailHtml(kind, b, slot, name, rebook), undefined, ics, { ignoreSuppression: true } as any);
        } catch (e: any) { console.error('[demo-booking] email failed', e?.message); }
      }
    }).catch(() => undefined);
  });
}

/* ── Jobs ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * Reminders: one about a day before and one about an hour before. Each is skipped when the booking
 * was made so close to the demo that it would arrive right after the confirmation. Claimed on the
 * booking first, so two servers never both send.
 */
export async function sendDueReminders(now = new Date()): Promise<number> {
  const soon: any[] = await DemoSlot.find({ status: 'open', startsAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 3600_000) } }).lean();
  let sent = 0;
  for (const slot of soon) {
    const left = new Date(slot.startsAt).getTime() - now.getTime();
    const kinds: { key: string; madeBefore: number }[] = [];
    if (left <= 24 * 3600_000 && left > 3 * 3600_000) kinds.push({ key: 'day', madeBefore: 20 * 3600_000 });
    if (left <= 65 * 60_000) kinds.push({ key: 'hour', madeBefore: 2 * 3600_000 });
    for (const k of kinds) {
      const rows = await DemoBooking.find({
        slotId: slot._id, status: 'booked', remindersSent: { $ne: k.key },
        createdAt: { $lte: new Date(new Date(slot.startsAt).getTime() - k.madeBefore) },
      });
      for (const b of rows) {
        const claimed = await DemoBooking.updateOne({ _id: b._id, remindersSent: { $ne: k.key } }, { $addToSet: { remindersSent: k.key } });
        if (!claimed.modifiedCount) continue;
        notify(String(slot.tenantId), 'reminder', b, slot);
        sent++;
      }
    }
  }
  return sent;
}

/**
 * After a slot ends: room slots get attendance from the live room (attended / no-show, which starts the
 * no-show follow-up and sends a "pick another time" message). If the host never started the room,
 * nobody is marked no-show. Outside-link slots are only closed; attendance there is marked by hand.
 */
export async function settleEndedSlots(now = new Date()): Promise<number> {
  const candidates: any[] = await DemoSlot.find({ status: 'open', settledAt: null, startsAt: { $lt: now } }).limit(200).lean();
  let settled = 0;
  for (const s of candidates) {
    if (endsAt(s).getTime() + SETTLE_AFTER_MIN * 60_000 > now.getTime()) continue;
    const claimed = await DemoSlot.updateOne({ _id: s._id, settledAt: null }, { $set: { settledAt: now, status: 'done' } });
    if (!claimed.modifiedCount) continue;
    settled++;
    if (s.joinMethod !== 'room' || !s.liveClassId) continue;
    const lc: any = await LiveClass.findById(s.liveClassId).select('startedAt status').lean();
    if (!lc?.startedAt) continue; // the room was never opened: not the visitors' fault
    const cfg = await getConfig(String(s.tenantId));
    const rows = await DemoBooking.find({ slotId: s._id, status: 'booked' });
    for (const b of rows) {
      const inv: any = b.liveInviteId ? await LiveClassInvite.findById(b.liveInviteId).lean() : null;
      const minutes = minutesOf(inv);
      const status = inv?.firstJoinedAt && minutes >= cfg.attendedMinutes ? 'attended' : 'no_show';
      await DemoBooking.updateOne({ _id: b._id, status: 'booked' }, { $set: { status, minutesInRoom: minutes } });
      if (b.meetingId) await setMeeting(String(s.tenantId), b.meetingId, { status: status === 'attended' ? 'completed' : 'no_show' }, String(s.hostId));
      if (status === 'no_show') notify(String(s.tenantId), 'missed', b, s);
    }
  }
  return settled;
}

/* ── Report ───────────────────────────────────────────────────────────────────────────────── */

export async function report(tenantId: string, q: { from?: string; to?: string } = {}) {
  const tid = oid(tenantId);
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 86_400_000);
  const slots: any[] = await DemoSlot.find({ tenantId: tid, startsAt: { $gte: from, $lte: to } }).select('_id course startsAt').lean();
  const ids = slots.map((s) => s._id);
  const slotBy = new Map(slots.map((s) => [String(s._id), s]));
  const rows: any[] = await DemoBooking.find({ tenantId: tid, slotId: { $in: ids } }).select('slotId leadId status utm').lean();
  const enrolledLeads = new Set((await Lead.find({ _id: { $in: rows.map((r) => r.leadId) }, tenantId: tid, 'milestones.enrolledAt': { $exists: true } }).select('_id').lean()).map((l: any) => String(l._id)));
  const blank = () => ({ bookings: 0, cancelled: 0, attended: 0, noShow: 0, enrolled: 0 });
  const total = blank();
  const byCourse: Record<string, any> = {};
  const bySource: Record<string, any> = {};
  const byHour: Record<string, any> = {};
  for (const r of rows) {
    const s = slotBy.get(String(r.slotId));
    const hour = s ? new Date(new Date(s.startsAt).getTime() + 330 * 60_000).getUTCHours() : -1;
    const keys = [[total], [byCourse[s?.course || '—'] ||= blank()], [bySource[r.utm?.source || 'direct'] ||= blank()], [byHour[String(hour)] ||= blank()]];
    for (const [b] of keys) {
      b.bookings++;
      if (r.status === 'cancelled') b.cancelled++;
      if (r.status === 'attended') b.attended++;
      if (r.status === 'no_show') b.noShow++;
      if (enrolledLeads.has(String(r.leadId))) b.enrolled++;
    }
  }
  const list = (o: Record<string, any>) => Object.entries(o).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.bookings - a.bookings);
  return { from, to, slots: slots.length, total, byCourse: list(byCourse), bySource: list(bySource), byHour: list(byHour).sort((a, b) => Number(a.key) - Number(b.key)) };
}
