import crypto from 'crypto';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { StudentRules, IStudentRules, InactivityAlert } from '../models/StudentRules';
import Attendance from '../models/Attendance';
import User from '../models/User';
import Batch from '../models/Batch';
import StudentProfile from '../models/StudentProfile';
import StudentActivityLog from '../models/StudentActivityLog';
import { computeProfileCompleteness, computeProfileMissing } from '../utils/profileCompleteness';
import { sendByPurpose, purposeTemplate, estimateCost } from './purposeMessaging';
import * as agreements from './agreementService';

/**
 * Student Rules (see models/StudentRules.ts): office QR attendance, inactivity alerts, profile gate.
 */

const IST_MS = 5.5 * 3600_000;
export const istDayKey = (d = new Date()) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
const istHHMM = (d = new Date()) => new Date(d.getTime() + IST_MS).toISOString().slice(11, 16);
const DAY_MS = 86_400_000;

export class RuleError extends Error {
  constructor(message: string, public code = 'RULE', public status = 400) { super(message); }
}

/* ── Settings ─────────────────────────────────────────────────────────────────────────────── */

const rulesCache = new Map<string, { doc: IStudentRules; at: number }>();
const RULES_TTL = 60_000;

export async function getRules(tenantId: string, fresh = false): Promise<IStudentRules> {
  const hit = rulesCache.get(tenantId);
  if (!fresh && hit && Date.now() - hit.at < RULES_TTL) return hit.doc;
  let doc = await StudentRules.findOne({ tenantId }).lean<IStudentRules>();
  if (!doc) {
    try {
      doc = (await StudentRules.create({ tenantId, qrSecret: crypto.randomBytes(32).toString('hex') })).toObject() as IStudentRules;
    } catch {
      doc = await StudentRules.findOne({ tenantId }).lean<IStudentRules>(); // created by a parallel request
    }
  }
  rulesCache.set(tenantId, { doc: doc!, at: Date.now() });
  return doc!;
}

/** What the admin page sees: everything except the signing secret. */
export function publicRules(r: IStudentRules) {
  const { qrSecret, ...rest } = r as any;
  return rest;
}

const bool = (v: any, d: boolean) => (typeof v === 'boolean' ? v : d);
const num = (v: any, d: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
export const normalizeIp = (ip: string) => String(ip || '').trim().replace(/^::ffff:/, '');

export async function updateRules(tenantId: string, body: any, userId: string) {
  const cur = await getRules(tenantId, true);
  const a = body?.attendance || {};
  const i = body?.inactivity || {};
  const g = body?.profileGate || {};
  const ca = cur.attendance;
  const ci = cur.inactivity;
  const cg = cur.profileGate;

  const lateAfter = a.lateAfter === undefined ? ca.lateAfter : String(a.lateAfter || '').trim();
  if (lateAfter && !/^([01]\d|2[0-3]):[0-5]\d$/.test(lateAfter)) throw new RuleError('Late-after time must look like 09:30.');

  const networks = Array.isArray(a.networks)
    ? a.networks
        .map((n: any) => ({ ip: normalizeIp(n?.ip), label: String(n?.label || '').slice(0, 60), addedAt: n?.addedAt ? new Date(n.addedAt) : new Date() }))
        .filter((n: any) => /^[0-9a-f.:]{3,45}$/i.test(n.ip))
        .slice(0, 20)
    : ca.networks;

  const lat = a.officeLat === undefined ? ca.officeLat : a.officeLat === null || a.officeLat === '' ? undefined : Number(a.officeLat);
  const lng = a.officeLng === undefined ? ca.officeLng : a.officeLng === null || a.officeLng === '' ? undefined : Number(a.officeLng);
  if ((lat !== undefined && !(lat >= -90 && lat <= 90)) || (lng !== undefined && !(lng >= -180 && lng <= 180))) {
    throw new RuleError('The office location is not valid.');
  }

  const attendance = {
    enabled: bool(a.enabled, ca.enabled),
    sameNetworkAsScreen: bool(a.sameNetworkAsScreen, ca.sameNetworkAsScreen),
    savedNetworks: bool(a.savedNetworks, ca.savedNetworks),
    networks,
    location: bool(a.location, ca.location),
    officeLat: lat,
    officeLng: lng,
    radiusM: num(a.radiusM, ca.radiusM, 30, 2000),
    checkOut: bool(a.checkOut, ca.checkOut),
    minMinutesBeforeCheckOut: num(a.minMinutesBeforeCheckOut, ca.minMinutesBeforeCheckOut, 0, 600),
    lateAfter,
    onePhonePerStudent: bool(a.onePhonePerStudent, ca.onePhonePerStudent),
    qrSeconds: num(a.qrSeconds, ca.qrSeconds, 10, 120),
  };
  if (attendance.savedNetworks && !attendance.networks.length) throw new RuleError('Add at least one office network, or turn "Saved office networks" off.');
  if (attendance.location && (attendance.officeLat === undefined || attendance.officeLng === undefined)) {
    throw new RuleError('Set the office location first (use "Use my current location" while in the office), or turn the location check off.');
  }

  const inactivity = {
    enabled: bool(i.enabled, ci.enabled),
    studentAfterDays: num(i.studentAfterDays, ci.studentAfterDays, 0, 60),
    trainerAfterDays: num(i.trainerAfterDays, ci.trainerAfterDays, 0, 60),
    parentAfterDays: num(i.parentAfterDays, ci.parentAfterDays, 0, 60),
    sendHourIst: num(i.sendHourIst, ci.sendHourIst, 6, 21),
    skipSundays: bool(i.skipSundays, ci.skipSundays),
  };
  const profileGate = {
    enabled: bool(g.enabled, cg.enabled),
    requireParentMobile: bool(g.requireParentMobile, cg.requireParentMobile),
  };

  await StudentRules.updateOne(
    { tenantId },
    { $set: { attendance, inactivity, profileGate, updatedBy: new mongoose.Types.ObjectId(userId) } },
  );
  rulesCache.delete(tenantId);
  gateCache.clear();
  return publicRules(await getRules(tenantId, true));
}

/* ── QR screen ────────────────────────────────────────────────────────────────────────────── */

/**
 * The internet address each QR screen was seen on recently. An office without a fixed address
 * changes it from time to time; because the screen refreshes every few seconds, "same network as
 * the screen" always compares against today's address, with nothing for the admin to update.
 */
const screenIps = new Map<string, Map<string, number>>();
const SCREEN_FRESH_MS = 3 * 60_000;

function noteScreenIp(tenantId: string, ip: string) {
  let m = screenIps.get(tenantId);
  if (!m) { m = new Map(); screenIps.set(tenantId, m); }
  m.set(ip, Date.now());
  for (const [k, at] of m) if (Date.now() - at > SCREEN_FRESH_MS) m.delete(k);
}
function screenIpFresh(tenantId: string, ip: string) {
  const at = screenIps.get(tenantId)?.get(ip);
  return !!at && Date.now() - at <= SCREEN_FRESH_MS;
}
export function activeScreens(tenantId: string) {
  const m = screenIps.get(tenantId);
  return m ? [...m.entries()].filter(([, at]) => Date.now() - at <= SCREEN_FRESH_MS).map(([ip, at]) => ({ ip, at: new Date(at) })) : [];
}

const b64u = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const sign = (secret: string, payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);

function makeToken(r: IStudentRules, tenantId: string, batch: string, now = Date.now()) {
  const win = Math.floor(now / 1000 / r.attendance.qrSeconds);
  const payload = `${tenantId}.${batch}.${win}`;
  return `${b64u(payload)}.${sign(r.qrSecret, payload)}`;
}

function readToken(r: IStudentRules, tenantId: string, token: string): { batch: string } {
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) throw new RuleError('This is not an attendance QR code.', 'QR_INVALID');
  let payload = '';
  try { payload = Buffer.from(p, 'base64url').toString('utf8'); } catch { throw new RuleError('This is not an attendance QR code.', 'QR_INVALID'); }
  const [tid, batch, winStr] = payload.split('.');
  const expected = sign(r.qrSecret, payload);
  if (tid !== tenantId || expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    throw new RuleError('This QR code is not from your institute.', 'QR_INVALID');
  }
  const cur = Math.floor(Date.now() / 1000 / r.attendance.qrSeconds);
  const win = Number(winStr);
  // The code on screen now, or the one just before it (a scan that took a few seconds).
  if (!(win === cur || win === cur - 1)) throw new RuleError('This QR code has expired. Scan the code on the screen again.', 'QR_EXPIRED');
  return { batch };
}

export async function qrForScreen(tenantId: string, batchId: string | undefined, ip: string, origin: string) {
  const r = await getRules(tenantId);
  if (!r.attendance.enabled) throw new RuleError('Office attendance is switched off. Turn it on in Student Rules.', 'OFF');
  let batchName = 'All batches';
  let batch = 'all';
  if (batchId && batchId !== 'all') {
    if (!mongoose.isValidObjectId(batchId)) throw new RuleError('Unknown batch.');
    const b = await Batch.findOne({ _id: batchId, tenantId }).select('name').lean<any>();
    if (!b) throw new RuleError('Unknown batch.');
    batch = String(b._id);
    batchName = b.name;
  }
  noteScreenIp(tenantId, normalizeIp(ip));
  const base = /^https?:\/\/[a-z0-9.:-]+$/i.test(origin) ? origin : 'https://platform.codebegun.com';
  const url = `${base}/attendance/check-in?t=${encodeURIComponent(makeToken(r, tenantId, batch))}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  const periodMs = r.attendance.qrSeconds * 1000;
  const today = istDayKey();
  const dayStart = new Date(today);
  const query: any = { tenantId, date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + DAY_MS) }, method: 'qr' };
  if (batch !== 'all') query.batchId = batch;
  const [checkedIn, checkedOut] = await Promise.all([
    Attendance.countDocuments({ ...query, inTime: { $nin: [null, ''] } }),
    Attendance.countDocuments({ ...query, outTime: { $nin: [null, ''] } }),
  ]);
  return {
    svg, url, batchName,
    refreshInMs: periodMs - (Date.now() % periodMs),
    qrSeconds: r.attendance.qrSeconds,
    checkOut: r.attendance.checkOut,
    checkedIn, checkedOut,
    checks: { sameNetworkAsScreen: r.attendance.sameNetworkAsScreen, savedNetworks: r.attendance.savedNetworks, location: r.attendance.location },
  };
}

/* ── Student check-in ─────────────────────────────────────────────────────────────────────── */

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export interface CheckInInput { token: string; lat?: number; lng?: number; deviceId?: string }

export async function checkIn(tenantId: string, userId: string, input: CheckInInput, rawIp: string) {
  const r = await getRules(tenantId);
  const a = r.attendance;
  if (!a.enabled) throw new RuleError('Office attendance is switched off at your institute.', 'OFF');
  const { batch } = readToken(r, tenantId, input.token);

  const user = await User.findOne({ _id: userId, tenantId }).select('role firstName batchId placementBatchIds').lean<any>();
  if (!user || user.role !== 'STUDENT') throw new RuleError('Only students check in with the QR code.', 'NOT_STUDENT', 403);
  const myBatches = [user.batchId, ...(user.placementBatchIds || [])].filter(Boolean).map(String);
  let batchId: string;
  if (batch !== 'all') {
    if (!myBatches.includes(batch)) throw new RuleError('This QR code is for a different batch. Scan your own batch\'s code.', 'WRONG_BATCH');
    batchId = batch;
  } else {
    if (!user.batchId) throw new RuleError('You are not in a batch yet. Ask your trainer to add you.', 'NO_BATCH');
    batchId = String(user.batchId);
  }

  // Proof of being in the office — every check the admin turned on must pass.
  const ip = normalizeIp(rawIp);
  const proof: any = { at: new Date(), ip, deviceId: input.deviceId ? String(input.deviceId).slice(0, 64) : undefined };
  if (a.sameNetworkAsScreen && !screenIpFresh(tenantId, ip)) {
    throw new RuleError('Connect your phone to the office Wi-Fi (not mobile data), then scan again.', 'NOT_OFFICE_NETWORK', 403);
  }
  if (a.savedNetworks && !a.networks.some((n) => normalizeIp(n.ip) === ip)) {
    throw new RuleError('Connect your phone to the office Wi-Fi (not mobile data), then scan again.', 'NOT_OFFICE_NETWORK', 403);
  }
  if (a.location) {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new RuleError('Allow location access in your browser, then scan again. It is only used to confirm you are in the office.', 'NEED_LOCATION', 403);
    }
    const d = distanceM(lat, lng, a.officeLat!, a.officeLng!);
    if (d > a.radiusM) throw new RuleError(`You seem to be about ${d} m from the office. Check in from inside the office.`, 'TOO_FAR', 403);
    Object.assign(proof, { lat, lng, distanceM: d });
  }

  const day = istDayKey();
  const dayStart = new Date(day);
  const range = { $gte: dayStart, $lt: new Date(dayStart.getTime() + DAY_MS) };
  const now = new Date();
  const hhmm = istHHMM(now);

  const rec = await Attendance.findOne({ tenantId, studentId: userId, batchId, date: range });

  if (!rec || !rec.inTime) {
    if (a.onePhonePerStudent && proof.deviceId) {
      const other = await Attendance.findOne({ tenantId, date: range, 'checkIn.deviceId': proof.deviceId, studentId: { $ne: userId } }).select('_id').lean();
      if (other) throw new RuleError('This phone has already checked in another student today. Each student must scan with their own phone.', 'PHONE_USED', 403);
    }
    const late = !!a.lateAfter && hhmm > a.lateAfter;
    if (rec) {
      Object.assign(rec, { status: 'present', inTime: hhmm, method: 'qr', late, checkIn: proof, markedBy: userId });
      await rec.save();
    } else {
      await Attendance.create({ tenantId, studentId: userId, batchId, date: dayStart, status: 'present', inTime: hhmm, method: 'qr', late, checkIn: proof, markedBy: userId });
    }
    return { action: 'in' as const, time: hhmm, late, checkOutExpected: a.checkOut, name: user.firstName };
  }

  if (!a.checkOut) return { action: 'already' as const, time: rec.inTime, name: user.firstName, message: `You already checked in at ${rec.inTime}.` };
  if (rec.outTime) return { action: 'already' as const, time: rec.outTime, name: user.firstName, message: `You already checked out at ${rec.outTime}.` };

  const inAt = rec.checkIn?.at ? new Date(rec.checkIn.at).getTime() : null;
  if (inAt && now.getTime() - inAt < a.minMinutesBeforeCheckOut * 60_000) {
    const opens = istHHMM(new Date(inAt + a.minMinutesBeforeCheckOut * 60_000));
    throw new RuleError(`You checked in at ${rec.inTime}. Check-out opens at ${opens}.`, 'TOO_EARLY');
  }
  rec.outTime = hhmm;
  rec.checkOut = proof;
  await rec.save();
  return { action: 'out' as const, time: hhmm, inTime: rec.inTime, name: user.firstName };
}

/** Today's record for the student (the My Attendance banner). */
export async function myToday(tenantId: string, userId: string) {
  const r = await getRules(tenantId);
  if (!r.attendance.enabled) return { enabled: false };
  const dayStart = new Date(istDayKey());
  const rec = await Attendance.findOne({ tenantId, studentId: userId, date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + DAY_MS) } })
    .select('inTime outTime status late method').lean();
  return { enabled: true, checkOut: r.attendance.checkOut, record: rec || null };
}

/* ── Profile gate ─────────────────────────────────────────────────────────────────────────── */

const gateCache = new Map<string, { blocked: boolean; at: number }>();
const GATE_TTL = 60_000;

export async function profileGateStatus(tenantId: string, userId: string) {
  const r = await getRules(tenantId);
  const profileRule = !!r.profileGate.enabled;
  const [profile, mine] = await Promise.all([
    StudentProfile.findOne({ userId, tenantId }).lean<any>(),
    agreements.mine(tenantId, userId).catch(() => ({ pending: [] as any[] })),
  ]);
  const percent = computeProfileCompleteness(profile);
  const missing = computeProfileMissing(profile);
  const parentMissing = r.profileGate.requireParentMobile && !String(profile?.personalInfo?.parentMobile || '').trim();
  if (parentMissing) {
    const sec = missing.find((m) => m.section === 'Personal Info');
    if (sec) sec.fields.push('Parent / guardian mobile'); else missing.unshift({ section: 'Personal Info', fields: ['Parent / guardian mobile'] });
  }
  const profileComplete = percent >= 100 && !parentMissing;
  // Terms & agreements the admin marked "hold the LMS until accepted" hold the student here too.
  const blockingAgreements = (mine.pending || []).filter((a: any) => a.blockLms).map((a: any) => ({ id: a.id, title: a.title }));
  const enabled = profileRule || blockingAgreements.length > 0;
  const complete = (!profileRule || profileComplete) && blockingAgreements.length === 0;
  gateCache.set(`${tenantId}:${userId}`, { blocked: enabled && !complete, at: Date.now() });
  return {
    enabled, complete, profileRule, profileComplete, percent,
    missing: profileRule ? missing : [], requireParentMobile: r.profileGate.requireParentMobile, agreements: blockingAgreements,
  };
}

/** Forget the cached answer, e.g. right after the student accepts an agreement. */
export function forgetGate(tenantId: string, userId: string) { gateCache.delete(`${tenantId}:${userId}`); }

/** Called on every student request — cheap: one cached settings read, one cached profile read a minute. */
export async function profileGateBlocks(tenantId: string, userId: string): Promise<boolean> {
  const r = await getRules(tenantId);
  if (!r.profileGate.enabled) return (await agreements.blockingCount(tenantId, userId)) > 0;
  const hit = gateCache.get(`${tenantId}:${userId}`);
  if (hit && Date.now() - hit.at < GATE_TTL) return hit.blocked;
  const st = await profileGateStatus(tenantId, userId);
  return st.enabled && !st.complete;
}

const API = '/api/v1';
/** What a student with an incomplete profile can still reach: enough to log in and finish the profile. */
const GATE_OPEN = ['/auth', '/student-profile', '/oauth', '/student-rules/me', '/student-rules/attendance/check-in', '/agreements']; // check-in: being in class still counts; agreements: so they can be accepted
const GATE_READ = ['/tenants', '/system-settings', '/notifications', '/student-features', '/batch-modules', '/tenant-modules'];
const under = (path: string, prefix: string) => path === `${API}${prefix}` || path.startsWith(`${API}${prefix}/`);

export function profileGateAllows(method: string, originalUrl: string, userId: string) {
  const path = String(originalUrl || '').split('?')[0].replace(/\/+$/, '');
  if (GATE_OPEN.some((p) => under(path, p))) return true;
  if ((method === 'GET' || method === 'HEAD') && (path === `${API}/users/me/permissions` || path === `${API}/users/${userId}` || path === `${API}/users/me`)) return true;
  if ((method === 'GET' || method === 'HEAD') && GATE_READ.some((p) => under(path, p))) return true;
  return false;
}

/* ── Last active ──────────────────────────────────────────────────────────────────────────── */

const touched = new Map<string, number>();
/** Remember that a student used the LMS — at most one write per student per hour. */
export function touchLastActive(userId: string) {
  const last = touched.get(userId) || 0;
  if (Date.now() - last < 3600_000) return;
  touched.set(userId, Date.now());
  if (touched.size > 50_000) touched.clear();
  User.updateOne({ _id: userId }, { $set: { lmsLastActiveAt: new Date() } }).catch(() => undefined);
}

/* ── Inactivity ───────────────────────────────────────────────────────────────────────────── */

export interface InactiveStudent {
  studentId: string;
  name: string;
  firstName: string;
  phone: string;
  batchId: string;
  batchName: string;
  lastActiveAt: Date | null;
  lastActiveDay: string;
  daysInactive: number;
  parentName: string;
  parentMobile: string;
  trainers: { id: string; name: string; firstName: string; phone: string }[];
}

/** Every active student in a running batch, with how many days since they last used the LMS. */
export async function inactiveStudents(tenantId: string, minDays = 1): Promise<InactiveStudent[]> {
  const now = new Date();
  const batches = await Batch.find({ tenantId, isActive: { $ne: false }, $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date(now.getTime() - DAY_MS) } }] })
    .select('name instructors startDate').lean<any[]>();
  if (!batches.length) return [];
  const batchById = new Map(batches.map((b) => [String(b._id), b]));
  const students = await User.find({
    tenantId, role: 'STUDENT', isActive: true, batchId: { $in: batches.map((b) => b._id) },
    studentStatus: { $nin: ['inactive', 'discontinued'] }, 'lmsDemo.at': { $exists: false },
  }).select('firstName lastName phone batchId batchJoinedDate createdAt lmsLastActiveAt').lean<any[]>();
  if (!students.length) return [];

  // Students with no "last active" yet (before this feature): fall back to their last logged action.
  const unknown = students.filter((s) => !s.lmsLastActiveAt).map((s) => s._id);
  const lastLog = new Map<string, Date>();
  if (unknown.length) {
    const rows = await StudentActivityLog.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), userId: { $in: unknown } } },
      { $group: { _id: '$userId', at: { $max: '$createdAt' } } },
    ]);
    for (const r of rows) lastLog.set(String(r._id), r.at);
  }

  const today = istDayKey(now);
  const out: InactiveStudent[] = [];
  const trainerIds = new Set<string>();
  for (const s of students) {
    const b = batchById.get(String(s.batchId));
    const last: Date | null = s.lmsLastActiveAt || lastLog.get(String(s._id)) || null;
    // Never active: count from when they joined the batch (or the batch started), so a new student isn't "30 days inactive".
    const since: Date = last || s.batchJoinedDate || (b?.startDate && new Date(b.startDate) > new Date(s.createdAt) ? b.startDate : s.createdAt);
    if (new Date(since) > now) continue;
    const lastDay = istDayKey(new Date(since));
    const days = Math.round((new Date(today).getTime() - new Date(lastDay).getTime()) / DAY_MS);
    if (days < minDays) continue;
    (b?.instructors || []).forEach((t: any) => trainerIds.add(String(t)));
    out.push({
      studentId: String(s._id), name: `${s.firstName || ''} ${s.lastName || ''}`.trim(), firstName: s.firstName || 'there',
      phone: s.phone || '', batchId: String(s.batchId), batchName: b?.name || '', lastActiveAt: last, lastActiveDay: lastDay,
      daysInactive: days, parentName: '', parentMobile: '', trainers: [],
    });
  }
  if (!out.length) return out;

  const [profiles, trainers] = await Promise.all([
    StudentProfile.find({ tenantId, userId: { $in: out.map((o) => o.studentId) } }).select('userId personalInfo.mobileNumber personalInfo.parentName personalInfo.parentMobile').lean<any[]>(),
    User.find({ _id: { $in: [...trainerIds] }, tenantId, isActive: true }).select('firstName lastName phone').lean<any[]>(),
  ]);
  const profByUser = new Map(profiles.map((p) => [String(p.userId), p]));
  const trainerById = new Map(trainers.map((t) => [String(t._id), t]));
  for (const o of out) {
    const p = profByUser.get(o.studentId);
    if (!o.phone) o.phone = p?.personalInfo?.mobileNumber || '';
    o.parentName = p?.personalInfo?.parentName || '';
    o.parentMobile = p?.personalInfo?.parentMobile || '';
    const b = batchById.get(o.batchId);
    o.trainers = (b?.instructors || []).map((id: any) => trainerById.get(String(id))).filter(Boolean).map((t: any) => ({
      id: String(t._id), name: `${t.firstName || ''} ${t.lastName || ''}`.trim(), firstName: t.firstName || 'Trainer', phone: t.phone || '',
    }));
  }
  return out.sort((x, y) => y.daysInactive - x.daysInactive);
}

export const INACTIVITY_PURPOSES = {
  student: 'INACTIVITY_STUDENT',
  trainer: 'INACTIVITY_TRAINER',
  parent: 'INACTIVITY_PARENT',
} as const;

type Kind = keyof typeof INACTIVITY_PURPOSES;

/** Who would get what today — the preview on the admin page, and the plan the morning run follows. */
export async function inactivityPlan(tenantId: string) {
  const r = await getRules(tenantId);
  const cfg = r.inactivity;
  const thresholds = [cfg.studentAfterDays, cfg.trainerAfterDays, cfg.parentAfterDays].filter((d) => d > 0);
  const list = thresholds.length ? await inactiveStudents(tenantId, Math.min(...thresholds)) : [];
  const sent = list.length
    ? await InactivityAlert.find({ tenantId, studentId: { $in: list.map((s) => s.studentId) } }).select('studentId kind lastActiveDay').lean<any[]>()
    : [];
  const done = new Set(sent.map((x) => `${x.studentId}:${x.kind}:${x.lastActiveDay}`));
  const due = (s: InactiveStudent, kind: Kind, after: number) => after > 0 && s.daysInactive >= after && !done.has(`${s.studentId}:${kind}:${s.lastActiveDay}`);

  const rows = list.map((s) => ({
    ...s,
    due: {
      student: due(s, 'student', cfg.studentAfterDays) && !!s.phone,
      trainer: due(s, 'trainer', cfg.trainerAfterDays) && s.trainers.some((t) => t.phone),
      parent: due(s, 'parent', cfg.parentAfterDays) && !!s.parentMobile,
    },
    missing: {
      studentPhone: !s.phone,
      parentMobile: cfg.parentAfterDays > 0 && s.daysInactive >= cfg.parentAfterDays && !s.parentMobile,
      trainer: cfg.trainerAfterDays > 0 && s.daysInactive >= cfg.trainerAfterDays && !s.trainers.some((t) => t.phone),
    },
  }));

  // Trainers get ONE message listing their students, not one per student.
  const trainerMsgs = new Map<string, { trainer: InactiveStudent['trainers'][number]; students: typeof rows }>();
  for (const row of rows) {
    if (!row.due.trainer) continue;
    for (const t of row.trainers) {
      if (!t.phone) continue;
      const m = trainerMsgs.get(t.id) || { trainer: t, students: [] as typeof rows };
      m.students.push(row);
      trainerMsgs.set(t.id, m);
    }
  }
  const templates = {
    student: !!purposeTemplate(tenantId, INACTIVITY_PURPOSES.student),
    trainer: !!purposeTemplate(tenantId, INACTIVITY_PURPOSES.trainer),
    parent: !!purposeTemplate(tenantId, INACTIVITY_PURPOSES.parent),
  };
  const counts = {
    student: rows.filter((x) => x.due.student).length,
    trainer: trainerMsgs.size,
    parent: rows.filter((x) => x.due.parent).length,
  };
  const messages = (templates.student ? counts.student : 0) + (templates.trainer ? counts.trainer : 0) + (templates.parent ? counts.parent : 0);
  return { config: cfg, rows, trainerMsgs: [...trainerMsgs.values()], templates, counts, messages, costInr: estimateCost(tenantId, messages) };
}

async function record(tenantId: string, studentId: string, kind: Kind, lastActiveDay: string, daysInactive: number, ok: boolean, error?: string) {
  await InactivityAlert.updateOne(
    { tenantId, studentId, kind, lastActiveDay },
    { $set: { ok, error, daysInactive, sentAt: new Date() } },
    { upsert: true },
  ).catch(() => undefined);
}

const pause = () => new Promise((ok) => setTimeout(ok, 150));

/** Send today's due inactivity messages. Each message type is skipped while it has no template assigned. */
export async function runInactivity(tenantId: string) {
  const plan = await inactivityPlan(tenantId);
  const result = { student: 0, trainer: 0, parent: 0, failed: 0 };

  if (plan.templates.student) {
    for (const s of plan.rows.filter((x) => x.due.student)) {
      const r = await sendByPurpose(tenantId, s.phone, INACTIVITY_PURPOSES.student, [s.firstName, String(s.daysInactive)]);
      await record(tenantId, s.studentId, 'student', s.lastActiveDay, s.daysInactive, r.ok, r.error);
      r.ok ? result.student++ : result.failed++;
      await pause();
    }
  }
  if (plan.templates.parent) {
    for (const s of plan.rows.filter((x) => x.due.parent)) {
      const r = await sendByPurpose(tenantId, s.parentMobile, INACTIVITY_PURPOSES.parent, [s.parentName || 'Parent', s.name || s.firstName, String(s.daysInactive)]);
      await record(tenantId, s.studentId, 'parent', s.lastActiveDay, s.daysInactive, r.ok, r.error);
      r.ok ? result.parent++ : result.failed++;
      await pause();
    }
  }
  if (plan.templates.trainer) {
    const told = new Set<string>();
    for (const m of plan.trainerMsgs) {
      const names = m.students.map((s) => `${s.name || s.firstName} (${s.daysInactive}d)`);
      const shown = names.slice(0, 15).join(', ') + (names.length > 15 ? ` and ${names.length - 15} more` : '');
      const batchNames = [...new Set(m.students.map((s) => s.batchName).filter(Boolean))].join(', ');
      const r = await sendByPurpose(tenantId, m.trainer.phone, INACTIVITY_PURPOSES.trainer, [m.trainer.firstName, batchNames || 'your batch', String(m.students.length), shown]);
      r.ok ? result.trainer++ : result.failed++;
      for (const s of m.students) {
        if (told.has(s.studentId)) continue;
        told.add(s.studentId);
        await record(tenantId, s.studentId, 'trainer', s.lastActiveDay, s.daysInactive, r.ok, r.error);
      }
      await pause();
    }
  }
  return result;
}

export async function recentAlerts(tenantId: string, limit = 100) {
  const rows = await InactivityAlert.find({ tenantId }).sort({ sentAt: -1 }).limit(limit).populate('studentId', 'firstName lastName').lean<any[]>();
  return rows.map((r) => ({
    id: String(r._id), kind: r.kind, ok: r.ok, error: r.error, daysInactive: r.daysInactive, sentAt: r.sentAt,
    student: r.studentId ? `${r.studentId.firstName || ''} ${r.studentId.lastName || ''}`.trim() : '',
  }));
}

/** Tenants with inactivity alerts on — for the morning job. */
export async function inactivityTenants(): Promise<string[]> {
  const rows = await StudentRules.find({ 'inactivity.enabled': true }).select('tenantId').lean<any[]>();
  return rows.map((r) => String(r.tenantId));
}
