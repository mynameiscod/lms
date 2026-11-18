import crypto from 'crypto';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import User from '../models/User';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import PendingLmsDemo from '../models/PendingLmsDemo';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import * as demo from '../services/lmsDemoService';
import { LMS_DEMO_FEATURES } from '../models/LmsDemoConfig';

/**
 * LMS DEMO: the public sign-up, the demo student's own screens, and the admin screen.
 * The rules live in services/lmsDemoService.ts; this file only speaks HTTP.
 */

const fail = (res: Response, e: any) => {
  if (e instanceof demo.DemoError) return res.status(e.http).json({ success: false, code: e.code, message: e.message });
  console.error('[lms-demo]', e);
  return res.status(500).json({ success: false, message: e?.message || 'Something went wrong' });
};
const who = (req: Request) => {
  const u: any = (req as any).user || {};
  return { id: String(u.id || ''), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '' };
};
/** The admin's name as people know it (the token carries only the email). */
const whoNamed = async (req: Request) => {
  const w = who(req);
  const u: any = w.id ? await User.findById(w.id).select('firstName lastName email').lean() : null;
  return { id: w.id, name: u ? [u.firstName, u.lastName === '-' ? '' : u.lastName].filter(Boolean).join(' ') || u.email : w.name };
};

/* ═══════════════════════════════ PUBLIC ═══════════════════════════════ */

/** What the /demo page shows before anyone signs up. */
export const publicInfo = async (_req: Request, res: Response) => {
  try {
    const cfg = await demo.getConfig();
    const courses = await demo.demoCourses(cfg);
    res.json({ success: true, data: { enabled: cfg.enabled && courses.length > 0 && !!demo.demoTenantId(), lengthDays: cfg.lengthDays, courses } });
  } catch (e) { fail(res, e); }
};

/** Step 1: name + phone in, OTP out. Nothing is created until the phone is proved. */
export const publicStart = async (req: Request, res: Response) => {
  try {
    const tId = demo.demoTenantId();
    const cfg = await demo.getConfig();
    if (!tId || !cfg.enabled) return res.status(503).json({ success: false, code: 'DEMO_OFF', message: 'The free demo is not open right now.' });
    const b = req.body || {};
    const phone = demo.normalisePhone(b.phone);
    const name = String(b.name || '').trim().replace(/\s+/g, ' ');
    const email = String(b.email || '').trim().toLowerCase();
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Enter your name.' });
    if (!phone) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email, or leave it empty.' });
    const token = `lmsdemo_${crypto.randomBytes(16).toString('hex')}`;
    await PendingLmsDemo.create({
      token, tenantId: tId, name: name.slice(0, 80), phone, email: email || undefined,
      status: b.status ? String(b.status).slice(0, 60) : undefined,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const otp = await sendOtp(tId, token, phone, email || undefined);
    res.json({ success: true, token, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e) { fail(res, e); }
};

export const publicResend = async (req: Request, res: Response) => {
  try {
    const pending: any = await PendingLmsDemo.findOne({ token: String(req.body?.token || '') }).lean();
    if (!pending) return res.status(404).json({ success: false, message: 'This sign-up has expired. Please start again.' });
    const otp = await sendOtp(pending.tenantId, pending.token, pending.phone, pending.email);
    res.json({ success: true, otp: { sent: otp.sent, channel: otp.channel, devCode: otp.devCode, throttledSeconds: otp.throttledSeconds } });
  } catch (e) { fail(res, e); }
};

/** Step 2: the code proves the phone; the account is made (or found) and the student is signed in. */
export const publicVerify = async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token || '');
    const pending: any = await PendingLmsDemo.findOne({ token }).lean();
    if (!pending) return res.status(404).json({ success: false, message: 'This sign-up has expired. Please start again.' });
    const r = await verifyOtp(token, String(req.body?.code || ''));
    if (r !== 'ok') {
      const msg = r === 'expired' ? 'That code has expired. Tap Resend.' : r === 'too_many_attempts' ? 'Too many wrong tries. Tap Resend for a new code.' : 'That code is not right. Check it and try again.';
      return res.status(400).json({ success: false, code: `OTP_${r.toUpperCase()}`, message: msg });
    }
    const { user } = await demo.createOrReuseDemoAccount(
      { name: pending.name, phone: pending.phone, email: pending.email, status: pending.status },
      { source: 'self' },
    );
    await PendingLmsDemo.deleteOne({ token });
    res.json({ success: true, ...(await demo.loginPayload(user)) });
  } catch (e) { fail(res, e); }
};

/** The one-tap link a counsellor sends: exchanges the link for a session. */
export const publicEnter = async (req: Request, res: Response) => {
  try {
    const uid = demo.readEntryToken(String(req.body?.t || ''));
    if (!uid) return res.status(400).json({ success: false, code: 'BAD_LINK', message: 'This demo link is not valid any more. Ask your counsellor for a new one.' });
    const user: any = await User.findOne({ _id: uid, 'lmsDemo.at': { $exists: true } });
    if (!user || user.isActive === false) return res.status(404).json({ success: false, code: 'BAD_LINK', message: 'This demo link is not valid any more.' });
    await demo.ensureDemoEnrollments(user);
    res.json({ success: true, ...(await demo.loginPayload(user)) });
  } catch (e) { fail(res, e); }
};

/* ═══════════════════════════════ DEMO STUDENT ═══════════════════════════════ */

/** Per enrollment: days, items, how much is done. */
async function progressFor(studentId: any) {
  const ens: any[] = await CurriculumEnrollment.find({ studentId, enrolledBy: demo.DEMO_ENROLLED_BY, status: { $in: ['active', 'paused', 'completed'] } })
    .select('curriculumId completedDays completedItems lastActivityAt xp timeSpentSeconds').lean();
  const ids = ens.map(e => e.curriculumId);
  const items = await DayPlan.aggregate([
    { $match: { curriculumId: { $in: ids } } },
    { $group: { _id: '$curriculumId', items: { $sum: { $size: { $ifNull: ['$items', []] } } }, days: { $sum: 1 } } },
  ]);
  const totals = new Map(items.map((x: any) => [String(x._id), x]));
  return new Map(ens.map(e => {
    const t: any = totals.get(String(e.curriculumId)) || { items: 0, days: 0 };
    const done = (e.completedItems || []).length;
    return [String(e.curriculumId), {
      enrollmentId: String(e._id),
      itemsDone: done,
      itemsTotal: t.items,
      daysDone: (e.completedDays || []).length,
      pct: t.items ? Math.min(100, Math.round((done / t.items) * 100)) : 0,
      lastActivityAt: e.lastActivityAt || null,
      xp: e.xp || 0,
      minutes: Math.round((e.timeSpentSeconds || 0) / 60),
    }];
  }));
}

/** Everything the demo student's screens need: the clock, the courses, the AI left, who to call. */
export const me = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById(who(req).id);
    if (!demo.isLmsDemo(user)) return res.json({ success: true, data: { isDemo: false } });
    const state = demo.demoState(user);
    const cfg = await demo.getConfig();
    if (state.active) await demo.ensureDemoEnrollments(user, cfg);
    const [list, start, prog, use] = await Promise.all([demo.demoCourses(cfg), demo.startCourse(cfg), progressFor(user._id), demo.demoUseLeft(user, cfg)]);
    const courses = [...(start ? [start] : []), ...list.filter(c => !start || c.curriculumId !== start.curriculumId)];
    const ai = use.ai;
    const features: Record<string, boolean> = {};
    for (const f of LMS_DEMO_FEATURES) features[f] = demo.featureOn(cfg, f);
    // The first visit of each day goes on the lead, so a counsellor sees the demo is being used.
    const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
    const lastSeen = user.lmsDemo.lastSeenAt ? new Date(new Date(user.lmsDemo.lastSeenAt).getTime() + 330 * 60_000).toISOString().slice(0, 10) : '';
    User.updateOne({ _id: user._id }, { $set: { 'lmsDemo.lastSeenAt': new Date() } }).catch(() => {});
    if (lastSeen !== today && state.active) demo.noteOnLead(user, 'Opened the LMS demo.');
    res.json({
      success: true,
      data: {
        isDemo: true,
        ...state,
        startedAt: user.lmsDemo.at,
        firstName: user.firstName,
        courses: courses.map(c => ({ ...c, ...(prog.get(c.curriculumId) || { enrollmentId: null, itemsDone: 0, itemsTotal: 0, daysDone: 0, pct: 0 }) })),
        ai,
        use,
        features,
        counsellor: { phone: cfg.counsellorPhone || '', whatsapp: cfg.counsellorWhatsApp || cfg.counsellorPhone || '', message: cfg.endMessage || '' },
        talkRequestedAt: user.lmsDemo.talkRequestedAt || null,
        moreTimeRequestedAt: user.lmsDemo.moreTimeRequestedAt || null,
      },
    });
  } catch (e) { fail(res, e); }
};

/** "Talk to a counsellor": marks the lead hot, due for a call now, with what the student did. */
export const talk = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById(who(req).id);
    if (!demo.isLmsDemo(user)) return res.status(403).json({ success: false, message: 'Not a demo account.' });
    const prog = await progressFor(user._id);
    const done = [...prog.values()].reduce((a, p) => a + p.itemsDone, 0);
    const how = String(req.body?.via || '').slice(0, 20);
    await User.updateOne({ _id: user._id }, { $set: { 'lmsDemo.talkRequestedAt': new Date() } });
    await demo.noteOnLead(user, `📞 Asked to talk to a counsellor from the LMS demo${how ? ` (${how})` : ''}. Finished ${done} demo item${done === 1 ? '' : 's'}. Call now.`, { hot: true, followUpNow: true });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

export const moreTime = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findById(who(req).id);
    if (!demo.isLmsDemo(user)) return res.status(403).json({ success: false, message: 'Not a demo account.' });
    await User.updateOne({ _id: user._id }, { $set: { 'lmsDemo.moreTimeRequestedAt': new Date() } });
    await demo.noteOnLead(user, '⏳ Asked for more demo time.', { hot: true, followUpNow: true });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

/* ═══════════════════════════════ ADMIN ═══════════════════════════════ */

/** Settings, plus the Learning Plans that can be picked as demo courses. */
export const adminGetConfig = async (_req: Request, res: Response) => {
  try {
    const cfg = await demo.getConfig();
    const tId = demo.demoTenantId();
    const plans = tId
      ? await LearningCurriculum.find({ tenantId: tId, personalizedFor: null, isMasterTrack: { $ne: true }, journeyKind: { $in: [null, ''] } })
        .select('title totalDays isPublished targetCourse updatedAt').sort({ updatedAt: -1 }).limit(300).lean<any[]>()
      : [];
    const dayCounts = await DayPlan.aggregate([
      { $match: { curriculumId: { $in: plans.map(p => p._id) } } },
      { $group: { _id: '$curriculumId', days: { $sum: 1 }, items: { $sum: { $size: { $ifNull: ['$items', []] } } } } },
    ]);
    const dc = new Map(dayCounts.map((d: any) => [String(d._id), d]));
    res.json({
      success: true,
      data: {
        tenantId: tId,
        config: cfg,
        plans: plans.map(p => ({ _id: String(p._id), title: p.title, totalDays: p.totalDays, isPublished: !!p.isPublished, daysWithContent: dc.get(String(p._id))?.days || 0, items: dc.get(String(p._id))?.items || 0 })),
      },
    });
  } catch (e) { fail(res, e); }
};

export const adminSaveConfig = async (req: Request, res: Response) => {
  try {
    const cfg = await demo.saveConfig(req.body || {}, await whoNamed(req));
    res.json({ success: true, data: cfg });
  } catch (e) { fail(res, e); }
};

/** Demo students, newest first, with what each has done. */
export const adminListStudents = async (req: Request, res: Response) => {
  try {
    const tId = demo.demoTenantId();
    if (!tId) return res.json({ success: true, data: { rows: [], counts: { all: 0, active: 0, ended: 0, talk: 0 } } });
    const q: any = { tenantId: new mongoose.Types.ObjectId(tId), 'lmsDemo.at': { $exists: true } };
    const search = String(req.query.search || '').trim();
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ firstName: re }, { lastName: re }, { email: re }, { phone: re }];
    }
    const users: any[] = await User.find(q).select('firstName lastName email phone lmsDemo isActive createdAt').sort({ 'lmsDemo.at': -1 }).limit(500).lean();
    const ids = users.map(u => u._id);
    const ens: any[] = await CurriculumEnrollment.find({ studentId: { $in: ids }, enrolledBy: demo.DEMO_ENROLLED_BY })
      .select('studentId completedItems completedDays lastActivityAt timeSpentSeconds').lean();
    const agg = new Map<string, { items: number; days: number; minutes: number; last: Date | null }>();
    for (const e of ens) {
      const k = String(e.studentId);
      const a = agg.get(k) || { items: 0, days: 0, minutes: 0, last: null };
      a.items += (e.completedItems || []).length;
      a.days += (e.completedDays || []).length;
      a.minutes += Math.round((e.timeSpentSeconds || 0) / 60);
      if (e.lastActivityAt && (!a.last || e.lastActivityAt > a.last)) a.last = e.lastActivityAt;
      agg.set(k, a);
    }
    const status = String(req.query.status || 'all');
    const all = users.map(u => {
      const st = demo.demoState(u);
      const a = agg.get(String(u._id)) || { items: 0, days: 0, minutes: 0, last: null };
      return {
        _id: String(u._id),
        name: `${u.firstName} ${u.lastName === '-' ? '' : u.lastName}`.trim(),
        phone: u.phone || '',
        email: String(u.email || '').endsWith('@demo.codebegun.in') ? '' : u.email,
        status: u.lmsDemo.status || '',
        source: u.lmsDemo.source,
        givenBy: u.lmsDemo.byName || '',
        startedAt: u.lmsDemo.at,
        expiresAt: st.expiresAt,
        active: st.active,
        daysLeft: st.daysLeft,
        endedEarly: st.endedEarly,
        lastSeenAt: u.lmsDemo.lastSeenAt || a.last || null,
        itemsDone: a.items,
        daysDone: a.days,
        minutes: a.minutes,
        talkRequestedAt: u.lmsDemo.talkRequestedAt || null,
        moreTimeRequestedAt: u.lmsDemo.moreTimeRequestedAt || null,
        leadId: u.lmsDemo.leadId ? String(u.lmsDemo.leadId) : null,
      };
    });
    const counts = { all: all.length, active: all.filter(r => r.active).length, ended: all.filter(r => !r.active).length, talk: all.filter(r => r.talkRequestedAt || r.moreTimeRequestedAt).length };
    const rows = all.filter(r => status === 'active' ? r.active : status === 'ended' ? !r.active : status === 'talk' ? (r.talkRequestedAt || r.moreTimeRequestedAt) : true);
    res.json({ success: true, data: { rows, counts } });
  } catch (e) { fail(res, e); }
};

/** Give a demo: make (or reopen) the account and hand back the one-tap link to send. */
export const adminGiveDemo = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const by = await whoNamed(req);
    const { user, returning } = await demo.createOrReuseDemoAccount(
      { name: b.name, phone: b.phone, email: b.email, status: b.status },
      { source: 'given', by: by.id, byName: by.name, lengthDays: b.lengthDays },
    );
    res.json({ success: true, data: { _id: String(user._id), returning, link: demo.demoEntryUrl(user), expiresAt: demo.demoState(user).expiresAt } });
  } catch (e) { fail(res, e); }
};

export const adminLink = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findOne({ _id: req.params.id, 'lmsDemo.at': { $exists: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Demo student not found.' });
    res.json({ success: true, data: { link: demo.demoEntryUrl(user) } });
  } catch (e) { fail(res, e); }
};

export const adminExtend = async (req: Request, res: Response) => {
  try {
    const u = await demo.extendDemo(req.params.id, Number(req.body?.days || 1), (await whoNamed(req)).name);
    res.json({ success: true, data: { expiresAt: demo.demoState(u).expiresAt } });
  } catch (e) { fail(res, e); }
};

export const adminEnd = async (req: Request, res: Response) => {
  try {
    await demo.endDemo(req.params.id, (await whoNamed(req)).name);
    res.json({ success: true });
  } catch (e) { fail(res, e); }
};

export const adminReset = async (req: Request, res: Response) => {
  try {
    const n = await demo.resetDemoProgress(req.params.id);
    res.json({ success: true, data: { courses: n } });
  } catch (e) { fail(res, e); }
};

/* ═══════════════════════════════ ADMIN: content pickers ═══════════════════════════════
 * What each demo feature shows is a list the admin ticks. Problems, Thinking Lab questions and books
 * come from the shared libraries (the CareerPilot demo plan searches are reused); quizzes,
 * assignments, speaking tasks and interviews belong to CodeBegun's institute, where demo students live.
 */
const PICK = 50;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageOf = (req: Request) => Math.max(1, Math.min(1000, Number(req.query.page) || 1));

async function tenantSearch(req: Request, kind: string) {
  const tId = demo.demoTenantId();
  if (!tId) return { total: 0, page: 1, hasMore: false, items: [] };
  const q = String(req.query.q || '').trim().slice(0, 80);
  const re = q ? new RegExp(escapeRe(q), 'i') : null;
  const page = pageOf(req);
  const tOid = new mongoose.Types.ObjectId(tId);
  let model: any; let f: any; let map: (r: any) => any; let sel: string;
  if (kind === 'quizzes') {
    model = (await import('../models/Quiz')).default;
    // Every live quiz, CareerPilot checkpoints included: the admin decides what a demo shows.
    f = { tenantId: tId, isActive: true, archivedAt: null, ...(re ? { title: re } : {}) };
    sel = 'title totalQuestions duration'; map = (r) => ({ id: String(r._id), title: r.title, category: [r.totalQuestions ? `${r.totalQuestions} questions` : '', r.duration ? `${r.duration} min` : ''].filter(Boolean).join(' · '), live: true });
  } else if (kind === 'assignments') {
    model = (await import('../models/Assignment')).default;
    f = { tenant: tOid, status: 'published', ...(re ? { title: re } : {}) };
    sel = 'title type difficulty'; map = (r) => ({ id: String(r._id), title: r.title, category: r.type, difficulty: r.difficulty, live: true });
  } else if (kind === 'speaking') {
    model = (await import('../models/CommunicationChallenge')).default;
    f = { tenantId: tOid, active: true, ...(re ? { title: re } : {}) };
    sel = 'title challengeType'; map = (r) => ({ id: String(r._id), title: r.title, category: String(r.challengeType || '').replace(/_/g, ' '), live: true });
  } else {
    model = (await import('../models/InterviewTemplate')).default;
    f = { tenantId: tOid, status: 'published', ...(re ? { title: re } : {}) };
    sel = 'title difficultyLevel totalDuration'; map = (r) => ({ id: String(r._id), title: r.title, category: r.totalDuration ? `${r.totalDuration} min` : '', difficulty: r.difficultyLevel, live: true });
  }
  const [rows, total] = await Promise.all([model.find(f).sort({ updatedAt: -1, _id: 1 }).skip((page - 1) * PICK).limit(PICK).select(sel).lean(), model.countDocuments(f)]);
  return { total, page, hasMore: page * PICK < total, items: (rows as any[]).map(map) };
}

/** GET /lms-demo/admin/options/:kind?q=&page=&difficulty=&type= */
export const adminOptions = async (req: Request, res: Response) => {
  try {
    const kind = String(req.params.kind);
    if (kind === 'problems' || kind === 'thinking' || kind === 'books') {
      const dp = await import('./demoPlanController');
      const fn = kind === 'problems' ? dp.searchDemoProblems : kind === 'thinking' ? dp.searchDemoThinking : dp.searchDemoBooks;
      return fn(req, res);
    }
    if (!['quizzes', 'assignments', 'speaking', 'interviews'].includes(kind)) return res.status(400).json({ success: false, message: 'Unknown list.' });
    res.json(await tenantSearch(req, kind));
  } catch (e) { fail(res, e); }
};

/** GET /lms-demo/admin/content — the chosen items of every list, with their names, in order. */
export const adminContent = async (_req: Request, res: Response) => {
  try {
    const cfg = await demo.getConfig();
    const c: any = cfg.content || {};
    const ids = (k: string) => ((c[k] || []) as any[]).map(String).filter(id => mongoose.isValidObjectId(id));
    const named = async (modelPath: string, list: string, sel: string, label: (r: any) => any, exportName = 'default') => {
      const order = ids(list);
      if (!order.length) return [];
      const Model = (await import(modelPath))[exportName];
      const rows: any[] = await Model.find({ _id: { $in: order } }).select(sel).lean();
      const by = new Map(rows.map(r => [String(r._id), r]));
      // An item deleted since it was chosen shows as missing, so the admin can take it out.
      return order.map(id => (by.has(id) ? { id, ...label(by.get(id)), live: true } : { id, title: 'Deleted item', live: false }));
    };
    const [problems, thinking, books, quizzes, assignments, speaking, interviews] = await Promise.all([
      named('../models/CodingProblem', 'problemIds', 'number title difficulty status', r => ({ title: r.title, number: r.number, difficulty: r.difficulty, live: r.status === 'published' })),
      named('../models/ThinkingQuestion', 'thinkingIds', 'number title type difficulty', r => ({ title: r.title, number: r.number, difficulty: r.difficulty, category: r.type })),
      named('../models/QuestionBook', 'bookKeys', 'title', r => ({ title: r.title }), 'QuestionBook'),
      named('../models/Quiz', 'quizIds', 'title', r => ({ title: r.title })),
      named('../models/Assignment', 'assignmentIds', 'title type difficulty', r => ({ title: r.title, category: r.type, difficulty: r.difficulty })),
      named('../models/CommunicationChallenge', 'speakingIds', 'title challengeType', r => ({ title: r.title, category: String(r.challengeType || '').replace(/_/g, ' ') })),
      named('../models/InterviewTemplate', 'interviewIds', 'title difficultyLevel', r => ({ title: r.title, difficulty: r.difficultyLevel })),
    ]);
    res.json({ success: true, data: { problems, thinking, books, quizzes, assignments, speaking, interviews } });
  } catch (e) { fail(res, e); }
};

/**
 * POST /lms-demo/lead/:leadId/give { lengthDays? } — "Give demo" on a CRM lead. Counsellors who work
 * leads can send a demo without the LMS Demo screen: the account is made from the lead's own name and
 * phone, tied to that lead, and the one-tap link comes back to copy or send on WhatsApp.
 */
export const leadGiveDemo = async (req: Request, res: Response) => {
  try {
    const tId = demo.demoTenantId();
    const Lead = (await import('../models/Lead')).default;
    const lead: any = mongoose.isValidObjectId(req.params.leadId) ? await Lead.findById(req.params.leadId).select('name phone email tenantId').lean() : null;
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
    if (!tId || String(lead.tenantId) !== String(tId)) return res.status(400).json({ success: false, message: 'Demos are given from CodeBegun\'s own CRM.' });
    if (String((req as any).tenantId || '') && String((req as any).tenantId) !== String(tId) && (req as any).user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Not your institute\'s lead.' });
    }
    const by = await whoNamed(req);
    const { user, returning } = await demo.createOrReuseDemoAccount(
      { name: lead.name, phone: lead.phone, email: lead.email },
      { source: 'given', by: by.id, byName: by.name, lengthDays: req.body?.lengthDays },
    );
    if (String(user.lmsDemo?.leadId || '') !== String(lead._id)) {
      await User.updateOne({ _id: user._id }, { $set: { 'lmsDemo.leadId': lead._id } });
    }
    res.json({ success: true, data: { link: demo.demoEntryUrl(user), returning, expiresAt: demo.demoState(user).expiresAt, name: lead.name, phone: lead.phone } });
  } catch (e) { fail(res, e); }
};
