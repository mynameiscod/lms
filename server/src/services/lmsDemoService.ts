import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import LmsDemoConfig, { ILmsDemoConfig, LMS_DEMO_DEFAULTS, LMS_DEMO_LIMITS } from '../models/LmsDemoConfig';
import { getPlatformOwnerTenant } from './settingsService';
import { jwtSecret } from '../config/secrets';
import { recordReEnquiry } from './leadReEnquiryService';

/**
 * LMS DEMO STUDENTS.
 *
 * Who: a prospective student trying the LMS before joining. CareerPilot is never part of it: the
 * account carries no `passport`, so every CareerPilot door (accountProduct.canUseCareerPilot)
 * stays shut and the LMS login works as for any student.
 *
 * Where: CodeBegun's own institute (the platform owner). The demo exists to sell, and the lead it
 * creates must land in the CRM the counsellors work from.
 *
 * What: every course on the LMS Demo screen, each enrolled with ALL days open. The demo LENGTH is
 * separate: when `lmsDemo.expiresAt` passes, the account can only reach the end screen
 * (middleware/auth.ts → lmsDemoMayReach).
 *
 * Kept apart from real users: the Users screen leaves them out (learnerAudience.LMS_USERS_FILTER)
 * and the LMS Demo screen lists them.
 */

export const DEMO_ENROLLED_BY = 'lms-demo';
export const DEMO_LEAD_SOURCE = 'lms_demo';
const DAY_MS = 86_400_000;

/* ─────────────────────────────── settings ─────────────────────────────── */

export async function getConfig(): Promise<ILmsDemoConfig> {
  const found = await LmsDemoConfig.findOne({ key: 'global' });
  if (found) return found;
  try {
    return await LmsDemoConfig.create({ key: 'global' });
  } catch (e: any) {
    if (e?.code === 11000) return (await LmsDemoConfig.findOne({ key: 'global' }))!;
    throw e;
  }
}

/** The institute demo students live in: CodeBegun's own. */
export function demoTenantId(): string | null {
  return getPlatformOwnerTenant();
}

const clamp = (n: any, lo: number, hi: number, dflt: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
};

export interface ConfigInput {
  enabled?: boolean;
  lengthDays?: number;
  aiPerDay?: number;
  courses?: { curriculumId: string; title?: string; blurb?: string; color?: string; active?: boolean }[];
  counsellorPhone?: string;
  counsellorWhatsApp?: string;
  endMessage?: string;
}

export async function saveConfig(input: ConfigInput, by: { id?: string; name?: string }): Promise<ILmsDemoConfig> {
  const cfg = await getConfig();
  if (typeof input.enabled === 'boolean') cfg.enabled = input.enabled;
  if (input.lengthDays !== undefined) cfg.lengthDays = clamp(input.lengthDays, LMS_DEMO_LIMITS.lengthDays.min, LMS_DEMO_LIMITS.lengthDays.max, LMS_DEMO_DEFAULTS.lengthDays);
  if (input.aiPerDay !== undefined) cfg.aiPerDay = clamp(input.aiPerDay, LMS_DEMO_LIMITS.aiPerDay.min, LMS_DEMO_LIMITS.aiPerDay.max, LMS_DEMO_DEFAULTS.aiPerDay);
  if (input.counsellorPhone !== undefined) cfg.counsellorPhone = String(input.counsellorPhone || '').trim().slice(0, 20);
  if (input.counsellorWhatsApp !== undefined) cfg.counsellorWhatsApp = String(input.counsellorWhatsApp || '').trim().slice(0, 20);
  if (input.endMessage !== undefined) cfg.endMessage = String(input.endMessage || '').trim().slice(0, 300);

  if (Array.isArray(input.courses)) {
    const tId = demoTenantId();
    const ids = input.courses.map(c => c.curriculumId).filter(id => mongoose.isValidObjectId(id));
    // Only Learning Plans of the demo institute: a demo enrollment is made in that institute.
    const plans = await LearningCurriculum.find({ _id: { $in: ids }, ...(tId ? { tenantId: tId } : {}) }).select('_id').lean();
    const ok = new Set(plans.map(p => String(p._id)));
    const seen = new Set<string>();
    cfg.courses = input.courses
      .filter(c => ok.has(String(c.curriculumId)) && !seen.has(String(c.curriculumId)) && seen.add(String(c.curriculumId)))
      .map((c, i) => ({
        curriculumId: new mongoose.Types.ObjectId(String(c.curriculumId)),
        title: String(c.title || '').trim().slice(0, 120) || undefined,
        blurb: String(c.blurb || '').trim().slice(0, 300) || undefined,
        color: String(c.color || '').trim().slice(0, 20) || undefined,
        order: i,
        active: c.active !== false,
      })) as any;
  }
  cfg.updatedBy = by.id;
  cfg.updatedByName = by.name;
  await cfg.save();
  return cfg;
}

/** The courses a demo student gets, in order, with what the cards show. */
export async function demoCourses(cfg?: ILmsDemoConfig) {
  const c = cfg || (await getConfig());
  const active = (c.courses || []).filter(x => x.active).sort((a, b) => a.order - b.order);
  if (!active.length) return [];
  const plans = await LearningCurriculum.find({ _id: { $in: active.map(x => x.curriculumId) } })
    .select('title description totalDays targetCourse').lean<any[]>();
  const byId = new Map(plans.map(p => [String(p._id), p]));
  return active
    .filter(x => byId.has(String(x.curriculumId)))
    .map(x => {
      const p = byId.get(String(x.curriculumId));
      return {
        curriculumId: String(x.curriculumId),
        title: x.title || p.title,
        blurb: x.blurb || p.description || '',
        color: x.color || '',
        totalDays: p.totalDays || 0,
      };
    });
}

/* ─────────────────────────────── state ─────────────────────────────── */

export const isLmsDemo = (user: any): boolean => !!user?.lmsDemo?.at;

export interface DemoState {
  isDemo: boolean;
  active: boolean;
  ended: boolean;
  expiresAt: Date | null;
  /** Whole days left, counting today. 0 once ended. */
  daysLeft: number;
  endedEarly: boolean;
}

export function demoState(user: any, now = new Date()): DemoState {
  const d = user?.lmsDemo;
  if (!d?.at) return { isDemo: false, active: false, ended: false, expiresAt: null, daysLeft: 0, endedEarly: false };
  const expiresAt = d.endedAt && new Date(d.endedAt) < new Date(d.expiresAt) ? new Date(d.endedAt) : new Date(d.expiresAt);
  const ended = expiresAt.getTime() <= now.getTime();
  return {
    isDemo: true,
    active: !ended,
    ended,
    expiresAt,
    daysLeft: ended ? 0 : Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS)),
    endedEarly: !!d.endedAt,
  };
}

/* ─────────────────────────── accounts ─────────────────────────── */

const last10 = (phone: string) => String(phone || '').replace(/\D/g, '').slice(-10);
export const normalisePhone = (phone: string) => {
  const ten = last10(phone);
  return ten.length === 10 ? `+91${ten}` : '';
};

/** A login no real mailbox owns, for a demo student who gave no email. Unique per phone. */
const placeholderEmail = (phone: string) => `lmsdemo.${last10(phone)}@demo.codebegun.in`;

export interface DemoPerson {
  name: string;
  phone: string;
  email?: string;
  status?: string;
}

export class DemoError extends Error {
  constructor(public code: string, message: string, public http = 400) { super(message); }
}

/**
 * Find or create the demo account for a phone, and (re)open its demo.
 *
 * A returning phone gets the same account back, so a student never ends up with two. An account
 * that already exists for some other reason (a real student, staff, a CareerPilot member) is
 * NEVER turned into a demo: the person is told to use their own login instead.
 */
export async function createOrReuseDemoAccount(
  person: DemoPerson,
  opts: { source: 'self' | 'given'; by?: string; byName?: string; lengthDays?: number },
) {
  const tId = demoTenantId();
  if (!tId) throw new DemoError('NO_TENANT', 'The demo is not set up yet (no CodeBegun institute found).', 503);
  const cfg = await getConfig();
  const phone = normalisePhone(person.phone);
  if (!phone) throw new DemoError('BAD_PHONE', 'Enter a valid 10-digit mobile number.');
  const name = String(person.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (name.length < 2) throw new DemoError('BAD_NAME', 'Enter your name.');
  const email = String(person.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DemoError('BAD_EMAIL', 'Enter a valid email, or leave it empty.');

  const ten = last10(phone);
  const tenantOid = new mongoose.Types.ObjectId(tId);
  // The demo account for this phone, if one was made before.
  let user: any = await User.findOne({ tenantId: tenantOid, 'lmsDemo.at': { $exists: true }, phone: { $regex: ten + '$' } });

  if (!user) {
    // Any other account on this email is someone's real login. Never take it over.
    if (email) {
      const taken: any = await User.findOne({ email }).select('_id lmsDemo').lean();
      if (taken && !taken.lmsDemo) throw new DemoError('EMAIL_TAKEN', 'This email already has a CodeBegun account. Log in with it, or use a different email for the demo.', 409);
    }
    const [firstName, ...rest] = name.split(' ');
    const loginEmail = email || placeholderEmail(phone);
    const clash: any = await User.findOne({ email: loginEmail }).select('_id lmsDemo').lean();
    if (clash && !clash.lmsDemo) throw new DemoError('EMAIL_TAKEN', 'This email already has a CodeBegun account.', 409);
    user = new User({
      email: loginEmail,
      password: crypto.randomBytes(18).toString('base64url'), // never shown: demo students sign in by OTP or link
      firstName,
      lastName: rest.join(' ') || '-',
      role: 'STUDENT',
      tenantId: tenantOid,
      phone,
      isActive: true,
      profileComplete: false,
    } as any);
  }

  const now = new Date();
  const days = clamp(opts.lengthDays ?? cfg.lengthDays, LMS_DEMO_LIMITS.lengthDays.min, LMS_DEMO_LIMITS.lengthDays.max, LMS_DEMO_DEFAULTS.lengthDays);
  const prev = user.lmsDemo?.at ? user.lmsDemo.toObject?.() || user.lmsDemo : null;
  const stillOpen = prev && demoState(user, now).active;
  user.isActive = true;
  user.lmsDemo = {
    ...(prev || {}),
    at: prev?.at || now,
    // A returning student whose demo is still open keeps their end date; a new or ended one starts afresh
    // only when a team member gives it (a self sign-up after the end does not reopen it).
    expiresAt: stillOpen ? prev.expiresAt : (prev && opts.source === 'self' ? prev.expiresAt : new Date(now.getTime() + days * DAY_MS)),
    source: prev?.source || opts.source,
    by: opts.by || prev?.by,
    byName: opts.byName || prev?.byName,
    status: person.status ? String(person.status).slice(0, 60) : prev?.status,
    endedAt: stillOpen || opts.source === 'self' ? prev?.endedAt : undefined,
    endedBy: stillOpen || opts.source === 'self' ? prev?.endedBy : undefined,
  };
  await user.save();
  await ensureDemoEnrollments(user, cfg);
  const leadId = await syncDemoLead(user, { returning: !!prev, source: opts.source, byName: opts.byName });
  if (leadId && String(user.lmsDemo.leadId || '') !== String(leadId)) {
    await User.updateOne({ _id: user._id }, { $set: { 'lmsDemo.leadId': leadId } });
    user.lmsDemo.leadId = leadId;
  }
  return { user, returning: !!prev };
}

/**
 * Enroll a demo student in every demo course they are not in yet. Idempotent, and run again when
 * the student opens the demo, so a course the admin adds later reaches students already in a demo.
 */
export async function ensureDemoEnrollments(user: any, cfg?: ILmsDemoConfig): Promise<number> {
  const courses = await demoCourses(cfg);
  if (!courses.length) return 0;
  const existing = await CurriculumEnrollment.find({ studentId: user._id, curriculumId: { $in: courses.map(c => c.curriculumId) } })
    .select('curriculumId status').lean<any[]>();
  const have = new Set(existing.map(e => String(e.curriculumId)));
  // A course the student was in before and that was paused/dropped comes back open.
  const reopen = existing.filter(e => e.status !== 'active').map(e => e._id);
  if (reopen.length) await CurriculumEnrollment.updateMany({ _id: { $in: reopen } }, { $set: { status: 'active' } });
  let made = 0;
  for (const c of courses) {
    if (have.has(c.curriculumId)) continue;
    try {
      await CurriculumEnrollment.create({
        tenantId: String(user.tenantId),
        curriculumId: c.curriculumId,
        curriculumTitle: c.title,
        studentId: user._id,
        studentName: `${user.firstName} ${user.lastName === '-' ? '' : user.lastName}`.trim(),
        studentEmail: user.email,
        startDate: new Date(),
        enrolledBy: DEMO_ENROLLED_BY,
        previewOnly: false, // every day open: the demo's limit is its length, not its days
      });
      await LearningCurriculum.updateOne({ _id: c.curriculumId }, { $inc: { enrollmentCount: 1 } });
      made += 1;
    } catch (e: any) {
      if (e?.code !== 11000) throw e;
    }
  }
  return made;
}

/* ─────────────────────────── CRM ─────────────────────────── */

async function firstStageId(tenantOid: mongoose.Types.ObjectId) {
  let stage: any = await LeadStage.findOne({ tenantId: tenantOid, $or: [{ name: /new/i }, { order: 1 }] } as any).sort({ order: 1 }).select('_id').lean();
  if (!stage) stage = await LeadStage.findOne({ tenantId: tenantOid }).sort({ order: 1 }).select('_id').lean();
  return stage?._id as mongoose.Types.ObjectId | undefined;
}

async function anyAdminId(tenantOid: mongoose.Types.ObjectId) {
  const a: any = await User.findOne({ tenantId: tenantOid, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] }, 'lmsDemo.at': { $exists: false } }).select('_id').lean();
  return a?._id as mongoose.Types.ObjectId | undefined;
}

/**
 * Every demo student is a lead. An existing lead on the same phone is reused (and marked as having
 * enquired again) instead of creating a duplicate; a new one goes through the Lead save hook, which
 * auto-assigns it the way every other source is assigned.
 */
export async function syncDemoLead(user: any, ctx: { returning: boolean; source: 'self' | 'given'; byName?: string }) {
  try {
    const tenantOid = new mongoose.Types.ObjectId(String(user.tenantId));
    const ten = last10(user.phone || '');
    if (!ten) return undefined;
    const realEmail = String(user.email || '').endsWith('@demo.codebegun.in') ? undefined : user.email;
    const fullName = `${user.firstName} ${user.lastName === '-' ? '' : user.lastName}`.trim();
    const what = ctx.source === 'given' ? `Demo access given${ctx.byName ? ` by ${ctx.byName}` : ''}` : 'Started the free LMS demo';
    const existing: any = user.lmsDemo?.leadId
      ? await Lead.findOne({ _id: user.lmsDemo.leadId, tenantId: tenantOid })
      : await Lead.findOne({ tenantId: tenantOid, phone: { $regex: ten + '$' } });
    if (existing) {
      if (!ctx.returning) {
        await recordReEnquiry(String(tenantOid), existing._id, { channel: 'website', note: what });
      }
      return existing._id as mongoose.Types.ObjectId;
    }
    const [stageId, adminId] = await Promise.all([firstStageId(tenantOid), anyAdminId(tenantOid)]);
    if (!stageId) return undefined; // no pipeline yet: the demo still works, there is just no lead
    const createdBy = adminId || new mongoose.Types.ObjectId();
    const lead = await Lead.create({
      tenantId: tenantOid,
      name: fullName,
      phone: user.phone,
      email: realEmail,
      source: DEMO_LEAD_SOURCE,
      stageId,
      priority: 'warm',
      createdBy,
      sourceDetails: { platform: 'website', landingPage: 'lms_demo' },
      activities: [{ type: 'created', description: `${what}${user.lmsDemo?.status ? ` · ${user.lmsDemo.status}` : ''}`, createdBy, createdAt: new Date(), metadata: { source: DEMO_LEAD_SOURCE } }],
    } as any);
    return lead._id as mongoose.Types.ObjectId;
  } catch (e: any) {
    console.error('[lms-demo] lead sync failed:', e?.message);
    return undefined;
  }
}

/** A line on the lead's timeline. Best effort: the demo never fails because the CRM did. */
export async function noteOnLead(user: any, description: string, opts: { hot?: boolean; followUpNow?: boolean } = {}) {
  try {
    const leadId = user?.lmsDemo?.leadId;
    if (!leadId) return;
    const lead: any = await Lead.findById(leadId).select('createdBy assignedTo priority').lean();
    if (!lead) return;
    const set: any = {};
    if (opts.hot) set.priority = 'hot';
    if (opts.followUpNow) set.nextFollowUp = new Date();
    await Lead.updateOne({ _id: leadId }, {
      ...(Object.keys(set).length ? { $set: set } : {}),
      $push: { activities: { type: 'note', description: description.slice(0, 600), createdBy: lead.assignedTo || lead.createdBy, createdAt: new Date(), metadata: { source: DEMO_LEAD_SOURCE } } },
    });
  } catch (e: any) {
    console.error('[lms-demo] lead note failed:', e?.message);
  }
}

/* ─────────────────────────── admin actions ─────────────────────────── */

export async function extendDemo(userId: string, days: number, by: string) {
  const user: any = await User.findOne({ _id: userId, 'lmsDemo.at': { $exists: true } });
  if (!user) throw new DemoError('NOT_FOUND', 'Demo student not found.', 404);
  const n = clamp(days, 1, LMS_DEMO_LIMITS.lengthDays.max, 1);
  const now = Date.now();
  const base = Math.max(now, new Date(user.lmsDemo.expiresAt).getTime());
  user.lmsDemo.expiresAt = new Date(base + n * DAY_MS);
  user.lmsDemo.endedAt = undefined;
  user.lmsDemo.endedBy = undefined;
  user.isActive = true;
  await user.save();
  await noteOnLead(user, `Demo extended by ${n} day${n === 1 ? '' : 's'}${by ? ` (${by})` : ''}.`);
  return user;
}

export async function endDemo(userId: string, by: string) {
  const user: any = await User.findOne({ _id: userId, 'lmsDemo.at': { $exists: true } });
  if (!user) throw new DemoError('NOT_FOUND', 'Demo student not found.', 404);
  user.lmsDemo.endedAt = new Date();
  user.lmsDemo.endedBy = by;
  await user.save();
  return user;
}

/** Clear a demo student's progress in the demo courses, so they can start over. Keeps the account and dates. */
export async function resetDemoProgress(userId: string): Promise<number> {
  const r = await CurriculumEnrollment.updateMany(
    { studentId: new mongoose.Types.ObjectId(userId), enrolledBy: DEMO_ENROLLED_BY },
    { $set: { completedDays: [], completedItems: [], currentDay: 1, xp: 0, timeSpentSeconds: 0, activityDates: [], startDate: new Date() }, $unset: { completedAt: 1, lastActivityAt: 1 } },
  );
  await User.updateOne({ _id: userId }, { $set: { 'lmsDemo.aiUsed': 0 } });
  return (r as any).modifiedCount || 0;
}

/* ─────────────────────────── AI allowance ─────────────────────────── */

const istDay = (d = new Date()) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);

/**
 * Take one AI question from a demo student's daily allowance. Real students are never limited
 * here. Returns ok=false (and nothing taken) when today's allowance is used up.
 */
export async function takeDemoAi(userId: string): Promise<{ demo: boolean; ok: boolean; left: number; limit: number }> {
  const user: any = await User.findById(userId).select('lmsDemo').lean();
  if (!isLmsDemo(user)) return { demo: false, ok: true, left: -1, limit: -1 };
  const { aiPerDay } = await getConfig();
  const today = istDay();
  const used = user.lmsDemo.aiDay === today ? Number(user.lmsDemo.aiUsed || 0) : 0;
  if (used >= aiPerDay) return { demo: true, ok: false, left: 0, limit: aiPerDay };
  // Conditional update, so two questions sent at once cannot both take the last one.
  const r = await User.updateOne(
    user.lmsDemo.aiDay === today
      ? { _id: userId, 'lmsDemo.aiDay': today, 'lmsDemo.aiUsed': used }
      : { _id: userId, 'lmsDemo.aiDay': user.lmsDemo.aiDay ?? null },
    { $set: { 'lmsDemo.aiDay': today, 'lmsDemo.aiUsed': used + 1 } },
  );
  if (!(r as any).modifiedCount) return { demo: true, ok: false, left: Math.max(0, aiPerDay - used - 1), limit: aiPerDay };
  return { demo: true, ok: true, left: aiPerDay - used - 1, limit: aiPerDay };
}

export async function demoAiLeft(user: any): Promise<{ left: number; limit: number }> {
  const { aiPerDay } = await getConfig();
  const used = user?.lmsDemo?.aiDay === istDay() ? Number(user.lmsDemo.aiUsed || 0) : 0;
  return { left: Math.max(0, aiPerDay - used), limit: aiPerDay };
}

/* ─────────────────────────── links & sessions ─────────────────────────── */

/** A one-tap link that signs the demo student in. Valid until the demo ends (at least a day). */
export function demoEntryToken(user: any): string {
  const st = demoState(user);
  const secs = Math.max(DAY_MS, (st.expiresAt?.getTime() || Date.now()) - Date.now()) / 1000;
  return jwt.sign({ uid: String(user._id), typ: 'lms-demo-enter' }, jwtSecret(), { expiresIn: Math.ceil(secs) });
}

export function readEntryToken(token: string): string | null {
  try {
    const p: any = jwt.verify(String(token || ''), jwtSecret());
    return p?.typ === 'lms-demo-enter' && p.uid ? String(p.uid) : null;
  } catch {
    return null;
  }
}

export function demoEntryUrl(user: any): string {
  const base = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://lms.codebegun.com').replace(/\/$/, '');
  return `${base}/demo/enter?t=${encodeURIComponent(demoEntryToken(user))}`;
}

/** The standard LMS login payload, as authService.login returns it. */
export async function loginPayload(user: any) {
  const { permissionsOf } = await import('../middleware/roleGuard');
  const Tenant = (await import('../models/Tenant')).default;
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role, tenantId: user.tenantId, product: 'lms' },
    jwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any,
  );
  const permissions: string[] = await permissionsOf({ role: user.role, customRoleId: user.customRoleId, tenantId: user.tenantId });
  const tenant = await Tenant.findById(user.tenantId);
  return {
    token,
    user: {
      _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      role: user.role, tenantId: user.tenantId, customRoleId: null, customRoleName: null,
      isActive: true, batchId: null, product: 'lms', permissions, lmsDemo: true,
    },
    tenant,
  };
}
