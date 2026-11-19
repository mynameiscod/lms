import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import LmsDemoConfig, { ILmsDemoConfig, LMS_DEMO_DEFAULTS, LMS_DEMO_LIMITS, LMS_DEMO_FEATURES, LmsDemoFeature } from '../models/LmsDemoConfig';
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
  mockPerDay?: number;
  commPerDay?: number;
  features?: Record<string, boolean>;
  content?: Partial<Record<'problemIds' | 'thinkingIds' | 'quizIds' | 'assignmentIds' | 'speakingIds' | 'interviewIds' | 'bookKeys', string[]>>;
  startCurriculumId?: string | null;
}

const ID_LISTS = ['problemIds', 'thinkingIds', 'quizIds', 'assignmentIds', 'speakingIds', 'interviewIds'] as const;
/** Valid, unique ObjectIds in the order given (at most 500 per list). */
const cleanIds = (v: any) => {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).map(String).filter(id => mongoose.isValidObjectId(id) && !seen.has(id) && !!seen.add(id)).slice(0, 500)
    .map(id => new mongoose.Types.ObjectId(id));
};

export async function saveConfig(input: ConfigInput, by: { id?: string; name?: string }): Promise<ILmsDemoConfig> {
  const cfg = await getConfig();
  if (typeof input.enabled === 'boolean') cfg.enabled = input.enabled;
  if (input.lengthDays !== undefined) cfg.lengthDays = clamp(input.lengthDays, LMS_DEMO_LIMITS.lengthDays.min, LMS_DEMO_LIMITS.lengthDays.max, LMS_DEMO_DEFAULTS.lengthDays);
  if (input.aiPerDay !== undefined) cfg.aiPerDay = clamp(input.aiPerDay, LMS_DEMO_LIMITS.aiPerDay.min, LMS_DEMO_LIMITS.aiPerDay.max, LMS_DEMO_DEFAULTS.aiPerDay);
  if (input.counsellorPhone !== undefined) cfg.counsellorPhone = String(input.counsellorPhone || '').trim().slice(0, 20);
  if (input.counsellorWhatsApp !== undefined) cfg.counsellorWhatsApp = String(input.counsellorWhatsApp || '').trim().slice(0, 20);
  if (input.endMessage !== undefined) cfg.endMessage = String(input.endMessage || '').trim().slice(0, 300);
  if (input.mockPerDay !== undefined) cfg.mockPerDay = clamp(input.mockPerDay, 0, LMS_DEMO_LIMITS.perDay.max, LMS_DEMO_DEFAULTS.mockPerDay);
  if (input.commPerDay !== undefined) cfg.commPerDay = clamp(input.commPerDay, 0, LMS_DEMO_LIMITS.perDay.max, LMS_DEMO_DEFAULTS.commPerDay);
  if (input.features && typeof input.features === 'object') {
    const f: any = {};
    for (const k of LMS_DEMO_FEATURES) f[k] = !!(input.features as any)[k];
    cfg.features = f;
    cfg.markModified('features');
  }
  if (input.content && typeof input.content === 'object') {
    const c: any = { ...((cfg.content as any)?.toObject?.() || cfg.content || {}) };
    for (const k of ID_LISTS) if ((input.content as any)[k] !== undefined) c[k] = cleanIds((input.content as any)[k]);
    if (input.content.bookKeys !== undefined) c.bookKeys = [...new Set((input.content.bookKeys || []).map(x => String(x).trim()).filter(Boolean))].slice(0, 100);
    cfg.content = c;
    cfg.markModified('content');
  }
  if (input.startCurriculumId !== undefined) {
    const id = input.startCurriculumId && mongoose.isValidObjectId(input.startCurriculumId) ? input.startCurriculumId : null;
    const tId = demoTenantId();
    const okPlan = id ? await LearningCurriculum.exists({ _id: id, ...(tId ? { tenantId: tId } : {}) }) : null;
    cfg.startCurriculumId = okPlan ? new mongoose.Types.ObjectId(id!) : null;
  }

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
  forgetCachedConfig();
  return cfg;
}

/** Is this feature switched on for demo students? My Learning Plan is always on. */
export const featureOn = (cfg: ILmsDemoConfig, f: LmsDemoFeature): boolean => !!(cfg.features as any)?.[f];

/** The items an admin chose for a feature, as strings, in order. */
export const chosen = (cfg: ILmsDemoConfig, list: 'problemIds' | 'thinkingIds' | 'quizIds' | 'assignmentIds' | 'speakingIds' | 'interviewIds' | 'bookKeys'): string[] =>
  (((cfg.content as any)?.[list]) || []).map(String);

/** The "Start here" plan, with what its card shows. Null when none is set. */
export async function startCourse(cfg?: ILmsDemoConfig) {
  const c = cfg || (await getConfig());
  if (!c.startCurriculumId) return null;
  const p: any = await LearningCurriculum.findById(c.startCurriculumId).select('title description totalDays').lean();
  return p ? { curriculumId: String(p._id), title: p.title, blurb: p.description || '', color: '#359AAD', totalDays: p.totalDays || 0, start: true } : null;
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
  forgetDemoUserIds();
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
  const c0 = cfg || (await getConfig());
  const start = await startCourse(c0);
  const courses = [...(start ? [start] : []), ...(await demoCourses(c0)).filter(c => !start || c.curriculumId !== start.curriculumId)];
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
      if (ctx.source === 'given') {
        // A counsellor gave it: a plain line on the timeline, not an "enquired again".
        await Lead.updateOne({ _id: existing._id }, { $push: { activities: { type: 'note', description: `🎓 ${what}.`, createdBy: existing.assignedTo || existing.createdBy, createdAt: new Date(), metadata: { source: DEMO_LEAD_SOURCE } } } });
      } else if (!ctx.returning) {
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
  await User.updateOne({ _id: userId }, { $set: { 'lmsDemo.aiUsed': 0, 'lmsDemo.mockUsed': 0, 'lmsDemo.commUsed': 0 } });
  // Everything else the demo student tried, so the next visit starts clean. Only this account's own rows.
  const uid = String(userId); const oid = new mongoose.Types.ObjectId(uid);
  const wipe = async (path: string, filter: any, named?: string) => {
    try { const mod: any = await import(path); const M = named ? mod[named] : mod.default; if (M?.deleteMany) await M.deleteMany(filter); } catch { /* keep going */ }
  };
  await Promise.all([
    wipe('../models/ProblemSubmission', { userId: uid }),
    wipe('../models/DailyChallenge', { studentId: oid }),
    wipe('../models/QuizAttempt', { studentId: uid }),
    wipe('../models/Submission', { student: oid }),
    wipe('../models/CommunicationAttempt', { studentId: oid }),
    wipe('../models/InterviewAttempt', { studentId: oid }),
    wipe('../models/QuestionBook', { userId: uid }, 'BookProgress'),
    wipe('../models/MentorChat', { studentId: oid }),
  ]);
  return (r as any).modifiedCount || 0;
}

/* ─────────────────────────── daily allowances ─────────────────────────── */

const istDay = (d = new Date()) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);

/** What a demo student may use each day: AI questions, mock interviews, Communication Lab sessions. */
export type DemoUse = 'ai' | 'mock' | 'comm';
const USE_LIMIT: Record<DemoUse, 'aiPerDay' | 'mockPerDay' | 'commPerDay'> = { ai: 'aiPerDay', mock: 'mockPerDay', comm: 'commPerDay' };

/**
 * Take one use from a demo student's daily allowance. Real students are never limited here.
 * Returns ok=false (and nothing taken) when today's allowance is used up.
 */
export async function takeDemoUse(userId: string, kind: DemoUse): Promise<{ demo: boolean; ok: boolean; left: number; limit: number }> {
  const user: any = await User.findById(userId).select('lmsDemo').lean();
  if (!isLmsDemo(user)) return { demo: false, ok: true, left: -1, limit: -1 };
  const cfg: any = await getConfig();
  const limit = Number(cfg[USE_LIMIT[kind]] ?? 0);
  const dayKey = `lmsDemo.${kind}Day`, usedKey = `lmsDemo.${kind}Used`;
  const today = istDay();
  const lastDay = user.lmsDemo[`${kind}Day`];
  const used = lastDay === today ? Number(user.lmsDemo[`${kind}Used`] || 0) : 0;
  if (used >= limit) return { demo: true, ok: false, left: 0, limit };
  // Conditional update, so two requests sent at once cannot both take the last one.
  const r = await User.updateOne(
    lastDay === today ? { _id: userId, [dayKey]: today, [usedKey]: used } : { _id: userId, [dayKey]: lastDay ?? null },
    { $set: { [dayKey]: today, [usedKey]: used + 1 } },
  );
  if (!(r as any).modifiedCount) return { demo: true, ok: false, left: Math.max(0, limit - used - 1), limit };
  return { demo: true, ok: true, left: limit - used - 1, limit };
}

/** Kept for the study assistant. */
export const takeDemoAi = (userId: string) => takeDemoUse(userId, 'ai');

export async function demoUseLeft(user: any, cfg?: any): Promise<Record<DemoUse, { left: number; limit: number }>> {
  const c: any = cfg || (await getConfig());
  const today = istDay();
  const one = (kind: DemoUse) => {
    const limit = Number(c[USE_LIMIT[kind]] ?? 0);
    const used = user?.lmsDemo?.[`${kind}Day`] === today ? Number(user.lmsDemo[`${kind}Used`] || 0) : 0;
    return { left: Math.max(0, limit - used), limit };
  };
  return { ai: one('ai'), mock: one('mock'), comm: one('comm') };
}

export async function demoAiLeft(user: any): Promise<{ left: number; limit: number }> {
  return (await demoUseLeft(user)).ai;
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

/* ─────────────────────────── per-request scope ─────────────────────────── */

let cfgCache: { at: number; cfg: ILmsDemoConfig } | null = null;
/** The settings, re-read at most every 20 s: every scoped request of a demo student asks for them. */
export async function cachedConfig(): Promise<ILmsDemoConfig> {
  if (cfgCache && Date.now() - cfgCache.at < 20_000) return cfgCache.cfg;
  const cfg = await getConfig();
  cfgCache = { at: Date.now(), cfg };
  return cfg;
}
/** Saving the settings must show at once, not after the cache runs out. */
export const forgetCachedConfig = () => { cfgCache = null; };

export interface LmsDemoScope {
  cfg: ILmsDemoConfig;
  on: (f: LmsDemoFeature) => boolean;
  /** Chosen ids for a list, as a Set of strings. */
  ids: (list: 'problemIds' | 'thinkingIds' | 'quizIds' | 'assignmentIds' | 'speakingIds' | 'interviewIds' | 'bookKeys') => Set<string>;
  /** The same, as ObjectIds in the admin's order. */
  oids: (list: 'problemIds' | 'thinkingIds' | 'quizIds' | 'assignmentIds' | 'speakingIds' | 'interviewIds' | 'bookKeys') => mongoose.Types.ObjectId[];
}

/**
 * The demo scope for a user, or null for every real account. Fails closed to null when no
 * database is connected (unit tests with a mocked mongoose), so it never changes a real student's path.
 */
export async function lmsDemoScopeFor(userId: any): Promise<LmsDemoScope | null> {
  try {
    if (!userId || mongoose.connection.readyState !== 1 || !mongoose.isValidObjectId(String(userId))) return null;
    const u: any = await User.findById(userId).select('lmsDemo.at').lean();
    if (!u?.lmsDemo?.at) return null;
    const cfg = await cachedConfig();
    const list = (k: string) => ((cfg.content as any)?.[k] || []).map(String) as string[];
    return {
      cfg,
      on: (f) => featureOn(cfg, f),
      ids: (k) => new Set(list(k)),
      oids: (k) => list(k).filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(id)),
    };
  } catch {
    return null;
  }
}

/**
 * Ids of every LMS demo student, for leaving them out of leaderboards, reports and trainer queues.
 * Cached for a minute; an empty list when there are none (so `$nin: []` changes nothing).
 */
let demoIdCache: { at: number; ids: mongoose.Types.ObjectId[] } | null = null;
export async function lmsDemoUserIds(): Promise<mongoose.Types.ObjectId[]> {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    if (demoIdCache && Date.now() - demoIdCache.at < 60_000) return demoIdCache.ids;
    const rows = await User.find({ 'lmsDemo.at': { $exists: true } }).select('_id').lean();
    demoIdCache = { at: Date.now(), ids: rows.map((r: any) => r._id) };
    return demoIdCache.ids;
  } catch {
    return [];
  }
}
export const forgetDemoUserIds = () => { demoIdCache = null; };

/** Quizzes and assignments placed on the days of the demo courses: a demo student may open those too. */
export async function demoCourseModuleIds(cfg: ILmsDemoConfig, kind: 'quiz' | 'assignment'): Promise<Set<string>> {
  const ids = [...(cfg.courses || []).filter(c => c.active).map(c => c.curriculumId), ...(cfg.startCurriculumId ? [cfg.startCurriculumId] : [])];
  if (!ids.length) return new Set();
  const days = await DayPlan.find({ curriculumId: { $in: ids } }).select('items.kind items.sourceId').lean<any[]>();
  const out = new Set<string>();
  for (const d of days) for (const it of d.items || []) if (it.kind === kind && it.sourceId) out.add(String(it.sourceId));
  return out;
}

/** A query clause that leaves LMS demo students out, for report and leaderboard queries: `{ [field]: { $nin: ids } }`, or `{}` when there are none. */
export async function notDemoStudents(field = 'studentId', asString = false): Promise<Record<string, any>> {
  const ids = await lmsDemoUserIds();
  return ids.length ? { [field]: { $nin: asString ? ids.map(String) : ids } } : {};
}
