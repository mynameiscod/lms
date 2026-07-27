import { Request, Response } from 'express';
import crypto from 'crypto';
import TechBattle from '../models/TechBattle';
import BattleRegistration from '../models/BattleRegistration';
import Tenant from '../models/Tenant';
import { EmailService } from '../services/emailService';
import * as otp from '../services/assessmentOtpService';
import * as battle from '../services/battleService';
import * as settings from '../services/settingsService';
import { logger } from '../utils/logger';

const emailService = new EmailService();

const slugify = (s: string) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const isAdmin = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(String((req as any).user?.role || ''));
const publicBase = (tenantId: string) => settings.getStr('PUBLIC_SITE_URL', 'https://platform.codebegun.com', tenantId).replace(/\/+$/, '');
const examUrl = (tenantId: string, token: string) => `${publicBase(tenantId)}/battles/exam/${token}`;

async function tenantIdFromSlug(tenantSlug: string): Promise<string | null> {
  const t = await Tenant.findOne({ slug: String(tenantSlug || '').toLowerCase() }).select('_id').lean() as any;
  return t ? String(t._id) : null;
}

function doorOf(b: any, code?: string) {
  const c = code || 'public';
  return (b.doors || []).find((d: any) => d.code === c) || (b.doors || [])[0] || { code: 'public', label: 'Public', type: 'public' };
}

/** The battle a permanent marketing page should show right now: the live public battle
 *  currently accepting registrations (soonest start); else the next upcoming one. */
async function findCurrentBattle(tenantId: string) {
  const now = new Date();
  const battles = await TechBattle.find({ tenantId, status: 'live', visibility: 'public', endAt: { $gt: now } })
    .sort({ startAt: 1 }).lean() as any[];
  const regOpen = battles.filter(b => (!b.registerOpensAt || now >= new Date(b.registerOpensAt)) && (!b.registerClosesAt || now <= new Date(b.registerClosesAt)));
  return regOpen[0] || battles[0] || null;
}

// ─────────────────────────── PUBLIC ───────────────────────────

/** GET /public/:tenantSlug/battles — list live public battles. */
export const listPublicBattles = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return res.status(404).json({ message: 'Organization not found' });
    const now = new Date();
    const battles = await TechBattle.find({ tenantId, status: 'live', visibility: 'public' })
      .select('title slug bannerUrl description prize startAt endAt registerClosesAt')
      .sort({ startAt: 1 }).lean();
    res.json({ success: true, battles: battles.map((b: any) => ({ ...b, ended: b.endAt < now })) });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** GET /public/:tenantSlug/battles/:slug?door= — landing + register config. */
export const getPublicBattle = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return res.status(404).json({ message: 'Organization not found' });
    // 'current' resolves to this week's active battle so a permanent marketing page never
    // needs editing — admin just creates next week's battle and the page follows.
    const b = req.params.slug === 'current'
      ? await findCurrentBattle(tenantId)
      : await TechBattle.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!b || b.status === 'draft') return res.json({ success: true, active: false, message: 'No active battle right now.' });
    const door = doorOf(b, req.query.door as string);
    const now = new Date();
    const registerOpen = (!b.registerOpensAt || now >= new Date(b.registerOpensAt)) &&
                         (!b.registerClosesAt || now <= new Date(b.registerClosesAt)) && b.endAt > now;
    res.json({
      success: true,
      battle: {
        title: b.title, slug: b.slug, bannerUrl: b.bannerUrl, description: b.description, prize: b.prize, rules: b.rules,
        startAt: b.startAt, endAt: b.endAt, registerOpen, tenantSlug: req.params.tenantSlug,
        fields: b.registrationFields || [],
        registrationMode: b.registrationMode || 'approval', proofNote: b.proofNote || '',
      },
      door: { code: door.code, label: door.label, type: door.type, needsAccessCode: !!door.accessCode, emailDomain: door.emailDomain || null },
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** POST /public/:tenantSlug/battles/:slug/register — self-serve register → issue token + send OTP. */
export const registerForBattle = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return res.status(404).json({ message: 'Organization not found' });
    // 'current' resolves to this week's live battle → the website can hardcode ONE URL forever.
    const b: any = req.params.slug === 'current'
      ? await findCurrentBattle(tenantId)
      : await TechBattle.findOne({ tenantId, slug: req.params.slug }).lean();
    if (!b || b.status !== 'live') return res.status(404).json({ message: 'No battle is open for registration right now.' });

    const now = new Date();
    if (b.registerOpensAt && now < new Date(b.registerOpensAt)) return res.status(403).json({ message: 'Registration has not opened yet.' });
    if ((b.registerClosesAt && now > new Date(b.registerClosesAt)) || now > new Date(b.endAt)) {
      return res.status(403).json({ message: 'Registration is closed for this battle.' });
    }

    // Accept the website's field names; keep every other field in `extra` (dob, gender,
    // qualification, branch, address, source, Q&A, consent…). `phone` is an alias for mobile.
    const { name, email, college, city, accessCode, doorCode, mobile: mobileField, phone, whatsapp, ...extra } = req.body || {};
    const mobileRaw = mobileField || phone;
    if (!name || !mobileRaw || !email) return res.status(400).json({ message: 'Name, mobile and email are required.' });

    const door = doorOf(b, doorCode);
    if (door.accessCode && String(accessCode || '').trim() !== door.accessCode) {
      return res.status(403).json({ message: 'Invalid access code for this college.' });
    }
    if (door.emailDomain && !String(email).toLowerCase().endsWith('@' + String(door.emailDomain).toLowerCase())) {
      return res.status(403).json({ message: `Only @${door.emailDomain} emails can register here.` });
    }

    // Proof uploads (approval mode)
    const files = ((req as any).files as any[]) || [];
    const uploadedFiles = files.map(f => ({ fieldName: f.fieldname, filePath: `/uploads/registrations/${f.filename}`, mimeType: f.mimetype, originalName: f.originalname }));

    const approvalMode = b.registrationMode === 'approval';
    const mob = String(mobileRaw).replace(/[^\d]/g, '');
    const wa = String(whatsapp || mobileRaw).replace(/[^\d]/g, '');
    let reg = await BattleRegistration.findOne({ battleId: b._id, mobile: mob });

    // Already fully in? (approved in approval mode, or verified in auto mode)
    if (reg && ((approvalMode && reg.reviewStatus === 'approved') || (!approvalMode && reg.verified))) {
      if (approvalMode) return res.json({ success: true, alreadyRegistered: true, message: 'You are already approved — check your email for the exam link.' });
      const r = await otp.sendOtp(tenantId, reg.examToken, mob);
      return res.json({ success: true, token: reg.examToken, alreadyRegistered: true, otp: r, message: 'You are already registered — verify to view your link.' });
    }

    if (!reg) {
      reg = new BattleRegistration({
        tenantId, battleId: b._id, battleSlug: b.slug, doorCode: door.code, doorLabel: door.label,
        name: String(name).trim(), mobile: mob, whatsapp: wa, email: String(email).toLowerCase().trim(),
        college: college || (door.type === 'college' ? door.label : ''), city, extra, uploadedFiles,
        examToken: crypto.randomBytes(16).toString('hex'),
        ipAddress: req.ip, userAgent: req.headers['user-agent'] || '',
      });
      await reg.save();
    } else if (uploadedFiles.length) {
      reg.uploadedFiles = uploadedFiles; await reg.save();
    }

    if (approvalMode) {
      // No OTP, no link yet — admin reviews the proofs and approves, then the link is sent.
      return res.status(201).json({ success: true, pending: true, message: "Registration received! We'll review your details and email your exam link once approved." });
    }
    const r = await otp.sendOtp(tenantId, reg.examToken, mob);
    res.status(201).json({ success: true, token: reg.examToken, otp: r, message: 'OTP sent. Verify to confirm your spot.' });
  } catch (e: any) {
    logger.error('registerForBattle failed', { error: e.message });
    res.status(500).json({ message: e.message });
  }
};

/** POST /public/battles/verify — verify OTP → confirm registration, email the link. */
export const verifyBattleOtp = async (req: Request, res: Response) => {
  try {
    const { token, code } = req.body || {};
    const reg = await BattleRegistration.findOne({ examToken: token });
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    const result = await otp.verifyOtp(token, String(code || ''));
    if (result !== 'ok') {
      const msg = result === 'expired' ? 'Code expired — resend a new one.' : result === 'too_many_attempts' ? 'Too many attempts — resend a new code.' : 'Invalid code.';
      return res.status(400).json({ message: msg, reason: result });
    }
    if (!reg.verified) {
      reg.verified = true;
      await reg.save();
    }
    const b = await TechBattle.findById(reg.battleId).lean() as any;
    const url = examUrl(reg.tenantId, reg.examToken);
    // Email the link + time (best-effort, non-blocking).
    if (b) sendConfirmEmail(reg, b, url).catch(() => {});
    res.json({ success: true, verified: true, examUrl: url, startAt: b?.startAt, title: b?.title });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** POST /public/battles/resend — resend OTP. */
export const resendBattleOtp = async (req: Request, res: Response) => {
  try {
    const reg = await BattleRegistration.findOne({ examToken: req.body?.token });
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    const r = await otp.sendOtp(reg.tenantId, reg.examToken, reg.mobile);
    res.json({ success: true, otp: r });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** GET /public/battles/exam/:token — the time-gated exam (countdown / start / ended). */
export const getBattleExam = async (req: Request, res: Response) => {
  try {
    const reg = await BattleRegistration.findOne({ examToken: req.params.token });
    if (!reg) return res.status(404).json({ message: 'Invalid exam link.', code: 'NOT_FOUND' });
    if (reg.submittedAt) return res.status(403).json({ message: 'You have already submitted this exam.', code: 'ALREADY_SUBMITTED' });

    const b = await TechBattle.findById(reg.battleId).lean() as any;
    if (!b) return res.status(404).json({ message: 'Battle not found', code: 'NOT_FOUND' });
    // Access gate: approval mode needs admin approval; auto mode needs OTP verification.
    if (b.registrationMode === 'approval') {
      if (reg.reviewStatus === 'rejected') return res.status(403).json({ code: 'REJECTED', message: reg.rejectionReason || 'Your registration was not approved.' });
      if (reg.reviewStatus !== 'approved') return res.status(403).json({ code: 'NOT_APPROVED', message: 'Your registration is awaiting approval. You will be emailed once approved.' });
    } else if (!reg.verified) {
      return res.status(403).json({ message: 'Please verify your registration first.', code: 'NOT_VERIFIED' });
    }
    const now = new Date();
    if (now < new Date(b.startAt)) return res.status(403).json({ code: 'NOT_YET', message: 'The exam has not started yet.', startAt: b.startAt, title: b.title });
    if (now > new Date(b.endAt)) return res.status(403).json({ code: 'ENDED', message: 'This exam has ended.' });
    const cutoff = new Date(new Date(b.startAt).getTime() + (b.joinCutoffMins || 0) * 60000);
    if (!reg.startedAt && b.joinCutoffMins && now > cutoff) {
      return res.status(403).json({ code: 'JOIN_CLOSED', message: 'The join window for this exam has closed.' });
    }

    // Single-device lock
    const incoming = String(req.headers['x-session-id'] || '');
    if (reg.startedAt && reg.activeSessionId && incoming && reg.activeSessionId !== incoming &&
        reg.lastHeartbeat && (Date.now() - reg.lastHeartbeat.getTime()) < 45000) {
      return res.status(403).json({ code: 'ANOTHER_DEVICE', message: 'This exam is open on another device. Close it there first.' });
    }

    const quiz = await battle.getBattleQuiz(b.quizId) as any;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found', code: 'QUIZ_NOT_FOUND' });
    const questions = await battle.loadBattleQuestions(quiz, !!quiz.shuffleQuestions);

    res.json({
      candidate: { name: reg.name },
      title: b.title,
      startAt: b.startAt, endAt: b.endAt,
      startedAt: reg.startedAt || null,
      quiz: {
        title: quiz.title, timeLimit: quiz.totalTime, totalMarks: quiz.totalMarks, instructions: quiz.instructions || '',
        enableCamera: b.proctoring?.camera !== false && !!quiz.enableCamera,
        tabSwitchWarnings: b.proctoring?.tabSwitch !== false && quiz.tabSwitchWarnings !== false,
        warningCount: quiz.warningCount ?? 3, negativeMarking: !!quiz.negativeMarking,
      },
      questions,
    });
  } catch (e: any) { logger.error('getBattleExam failed', { error: e.message }); res.status(500).json({ message: e.message }); }
};

/** POST /public/battles/exam/:token/start — stamp startedAt, lock device. */
export const startBattleExam = async (req: Request, res: Response) => {
  try {
    const reg = await BattleRegistration.findOne({ examToken: req.params.token });
    if (!reg) return res.status(404).json({ message: 'Invalid link', code: 'NOT_FOUND' });
    if (reg.submittedAt) return res.status(403).json({ message: 'Already submitted', code: 'ALREADY_SUBMITTED' });
    const b = await TechBattle.findById(reg.battleId).lean() as any;
    const now = new Date();
    if (now < new Date(b.startAt)) return res.status(403).json({ code: 'NOT_YET', message: 'Not open yet.' });
    if (now > new Date(b.endAt)) return res.status(403).json({ code: 'ENDED', message: 'Ended.' });

    if (!reg.startedAt) { reg.startedAt = now; reg.status = 'started'; }
    reg.activeSessionId = String(req.body?.sessionId || '');
    reg.lastHeartbeat = now;
    await reg.save();

    const quiz = await battle.getBattleQuiz(b.quizId) as any;
    const examEnd = new Date(Math.min(reg.startedAt.getTime() + (quiz?.totalTime || 30) * 60000, new Date(b.endAt).getTime()));
    res.json({ success: true, startedAt: reg.startedAt, endsAt: examEnd });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** POST /public/battles/exam/:token/heartbeat. */
export const battleHeartbeat = async (req: Request, res: Response) => {
  try {
    await BattleRegistration.updateOne(
      { examToken: req.params.token },
      { $set: { lastHeartbeat: new Date(), activeSessionId: String(req.body?.sessionId || '') } }
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** POST /public/battles/exam/:token/submit — grade, store, rank. */
export const submitBattleExam = async (req: Request, res: Response) => {
  try {
    const reg = await BattleRegistration.findOne({ examToken: req.params.token });
    if (!reg) return res.status(404).json({ message: 'Invalid link', code: 'NOT_FOUND' });
    if (reg.submittedAt) return res.status(200).json({ score: reg.score, totalMarks: reg.totalMarks, percentage: Math.round(reg.percentage || 0), rank: reg.rank, alreadySubmitted: true });

    const b = await TechBattle.findById(reg.battleId).lean() as any;
    const quiz = await battle.getBattleQuiz(b.quizId) as any;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const raw = req.body?.answers ?? [];
    const answers: Array<{ questionId: string; selectedOptions: string[] }> = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([questionId, selectedOptions]) => ({ questionId, selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions] as any }));

    const Question = (await import('../models/Question')).default;
    let obtained = 0;
    const graded: any[] = [];
    for (const a of answers) {
      const q = await Question.findById(a.questionId);
      if (!q) continue;
      const sel = (Array.isArray(a.selectedOptions) ? a.selectedOptions : []).map((o: any) => String(o).trim());
      const { isCorrect, marksAwarded } = battle.gradeMcq(q, sel);
      obtained += marksAwarded;
      graded.push({ questionId: a.questionId, selectedOptions: sel, isCorrect, marksAwarded });
    }

    const now = new Date();
    const startedAt = reg.startedAt || now;
    const timeSpent = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const percentage = quiz.totalMarks > 0 ? (obtained / quiz.totalMarks) * 100 : 0;
    const passed = quiz.passPercentage ? percentage >= quiz.passPercentage : (quiz.passingMarks ? obtained >= quiz.passingMarks : false);

    reg.submittedAt = now; reg.status = 'submitted'; reg.timeSpentSec = timeSpent;
    reg.score = obtained; reg.totalMarks = quiz.totalMarks; reg.percentage = percentage; reg.passed = passed;
    reg.answers = graded;
    await reg.save();

    await battle.computeBattleRanks(String(reg.battleId));
    const fresh = await BattleRegistration.findById(reg._id).select('rank');

    res.json({
      success: true, score: obtained, totalMarks: quiz.totalMarks, percentage: Math.round(percentage),
      passed, rank: fresh?.rank ?? null, timeSpentSec: timeSpent,
      slug: b.slug, tenantSlug: (await Tenant.findById(reg.tenantId).select('slug').lean() as any)?.slug,
    });
  } catch (e: any) { logger.error('submitBattleExam failed', { error: e.message }); res.status(500).json({ message: e.message }); }
};

/** GET /public/:tenantSlug/battles/:slug/leaderboard?door=&college= */
export const getPublicLeaderboard = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return res.status(404).json({ message: 'Organization not found' });
    const b = await TechBattle.findOne({ tenantId, slug: req.params.slug }).lean() as any;
    if (!b) return res.status(404).json({ message: 'Battle not found' });
    if (!b.leaderboardPublished) {
      return res.json({ success: true, published: false, title: b.title, prize: b.prize, leaderboard: [] });
    }
    const rows = await battle.getBattleLeaderboard(String(b._id), { door: req.query.door as string, college: req.query.college as string, limit: 100 });
    res.json({ success: true, published: true, title: b.title, prize: b.prize, endAt: b.endAt, leaderboard: rows });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

async function sendConfirmEmail(reg: any, b: any, url: string) {
  const when = new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#1d4ed8">You're registered for ${b.title} 🎉</h2>
      <p>Hi ${reg.name}, your spot is confirmed.</p>
      <p><b>Exam opens:</b> ${when} IST</p>
      <p>Your personal exam link (it unlocks at the start time):</p>
      <p><a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open my exam</a></p>
      <p style="color:#64748b;font-size:13px">Keep this link private. One attempt, single device. Good luck!</p>
    </div>`;
  await emailService.sendGenericEmail(reg.email, `You're in — ${b.title}`, html);
  await BattleRegistration.updateOne({ _id: reg._id }, { $set: { 'remindersSent.confirm': true } });
}

// ─────────────────────────── ADMIN ───────────────────────────

export const listBattles = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const rows = await TechBattle.find({ tenantId: tenantOf(req) }).sort({ createdAt: -1 }).lean();
  const withCounts = await Promise.all(rows.map(async (b: any) => ({
    ...b,
    registrations: await BattleRegistration.countDocuments({ battleId: b._id }),
    submissions: await BattleRegistration.countDocuments({ battleId: b._id, status: 'submitted' }),
  })));
  res.json({ battles: withCounts });
};

export const createBattle = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const body = req.body || {};
    if (!body.title || !body.quizId || !body.startAt || !body.endAt) {
      return res.status(400).json({ message: 'title, quizId, startAt and endAt are required' });
    }
    let slug = slugify(body.slug || body.title);
    // ensure unique
    let n = 1; const baseSlug = slug;
    while (await TechBattle.exists({ tenantId, slug })) { slug = `${baseSlug}-${++n}`; }

    const doors = Array.isArray(body.doors) && body.doors.length
      ? body.doors.map((d: any) => ({ ...d, code: slugify(d.code || d.label), type: d.type || 'college' }))
      : [{ code: 'public', label: 'Public', type: 'public' }];
    if (!doors.some((d: any) => d.code === 'public')) doors.unshift({ code: 'public', label: 'Public', type: 'public' });

    const b = await TechBattle.create({
      tenantId, title: body.title, slug, quizId: body.quizId,
      bannerUrl: body.bannerUrl, description: body.description, prize: body.prize, rules: body.rules,
      registerOpensAt: body.registerOpensAt, registerClosesAt: body.registerClosesAt,
      startAt: body.startAt, endAt: body.endAt, joinCutoffMins: body.joinCutoffMins ?? 15,
      registrationMode: body.registrationMode || 'approval', proofNote: body.proofNote,
      visibility: body.visibility || 'public', doors, registrationFields: body.registrationFields || [],
      proctoring: body.proctoring || { camera: true, tabSwitch: true },
      status: body.status || 'live', createdBy: String((req as any).user?.id || ''),
    });
    res.status(201).json({ battle: b });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const getBattle = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const b = await TechBattle.findOne({ _id: req.params.id, tenantId: tenantOf(req) }).lean();
  if (!b) return res.status(404).json({ message: 'Not found' });
  res.json({ battle: b, publicBase: publicBase(tenantOf(req)) });
};

export const updateBattle = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const allowed = ['title', 'quizId', 'bannerUrl', 'description', 'prize', 'rules', 'registerOpensAt', 'registerClosesAt', 'startAt', 'endAt', 'joinCutoffMins', 'visibility', 'doors', 'registrationFields', 'registrationMode', 'proofNote', 'proctoring', 'leaderboardPublished', 'status'];
    const $set: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) $set[k] = req.body[k];
    if (Array.isArray($set.doors)) {
      $set.doors = $set.doors.map((d: any) => ({ ...d, code: slugify(d.code || d.label), type: d.type || 'college' }));
      if (!$set.doors.some((d: any) => d.code === 'public')) $set.doors.unshift({ code: 'public', label: 'Public', type: 'public' });
    }
    const b = await TechBattle.findOneAndUpdate({ _id: req.params.id, tenantId: tenantOf(req) }, { $set }, { new: true });
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ battle: b });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const getRegistrations = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const q: any = { battleId: req.params.id, tenantId: tenantOf(req) };
  if (req.query.door) q.doorCode = req.query.door;
  if (req.query.college) q.college = req.query.college;
  if (req.query.status) q.status = req.query.status;
  if (req.query.review) q.reviewStatus = req.query.review;
  const rows = await BattleRegistration.find(q).sort({ reviewStatus: 1, createdAt: -1 })
    .select('name mobile whatsapp email college city doorLabel verified reviewStatus rejectionReason uploadedFiles status score totalMarks percentage timeSpentSec rank submittedAt createdAt extra').limit(2000).lean();
  res.json({ registrations: rows });
};

/** Admin: approve a registration → mark approved + email the exam link. */
export const approveRegistration = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const reg = await BattleRegistration.findOne({ _id: req.params.regId, battleId: req.params.id, tenantId: tenantOf(req) });
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    reg.reviewStatus = 'approved'; reg.approvedAt = new Date(); reg.approvedBy = String((req as any).user?.id || '');
    await reg.save();
    const b = await TechBattle.findById(reg.battleId).lean() as any;
    const url = examUrl(reg.tenantId, reg.examToken);
    let wa: { ok: boolean; error?: string } = { ok: false };
    if (b) {
      // Send the link over BOTH channels — email (always) + WhatsApp (needs template for cold users).
      sendConfirmEmail(reg, b, url).catch(() => {});
      const when = new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
      const waMsg = `You're approved for ${b.title}! Your exam opens on ${when} IST. Start here (unlocks at start): ${url} — one attempt, single device. — CodeBegun`;
      wa = await otp.sendWhatsAppText(reg.tenantId, reg.whatsapp || reg.mobile, waMsg);
    }
    res.json({
      success: true, examUrl: url, whatsapp: wa,
      message: wa.ok ? 'Approved — exam link sent via email + WhatsApp.' : `Approved — link emailed. WhatsApp not sent: ${wa.error || 'unknown'}`,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** Admin: reject a registration (+ reason). */
export const rejectRegistration = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const reg = await BattleRegistration.findOneAndUpdate(
      { _id: req.params.regId, battleId: req.params.id, tenantId: tenantOf(req) },
      { $set: { reviewStatus: 'rejected', rejectionReason: req.body?.reason || '' } }, { new: true }
    );
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    res.json({ success: true, message: 'Rejected.' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const adminLeaderboard = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const rows = await battle.getBattleLeaderboard(req.params.id, { door: req.query.door as string, college: req.query.college as string, limit: 200 });
  res.json({ leaderboard: rows });
};

export const exportRegistrations = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const rows = await BattleRegistration.find({ battleId: req.params.id, tenantId: tenantOf(req) })
    .sort({ score: -1, timeSpentSec: 1 }).lean();
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Rank', 'Name', 'Mobile', 'Email', 'College', 'Door', 'Status', 'Score', 'Total', 'Percentage', 'TimeSec', 'SubmittedAt'];
  const lines = rows.map((r: any) => [r.rank ?? '', r.name, r.mobile, r.email, r.college, r.doorLabel, r.status, r.score ?? '', r.totalMarks ?? '', r.percentage != null ? Math.round(r.percentage) : '', r.timeSpentSec ?? '', r.submittedAt ? new Date(r.submittedAt).toISOString() : ''].map(esc).join(','));
  const csv = [header.map(esc).join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="battle-${req.params.id}-registrations.csv"`);
  res.send(csv);
};

/** POST /battles/:id/broadcast — send a custom reminder to registrants (WhatsApp / email / both). */
export const broadcastBattle = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const { message, channel = 'whatsapp', review = 'approved', includeLink } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ message: 'Message is required' });

    const b = await TechBattle.findOne({ _id: req.params.id, tenantId }).lean() as any;
    if (!b) return res.status(404).json({ message: 'Battle not found' });

    const q: any = { battleId: req.params.id, tenantId };
    if (review === 'approved') q.reviewStatus = 'approved';
    else if (review === 'pending') q.reviewStatus = 'pending';
    // 'all' → everyone who registered
    const regs = await BattleRegistration.find(q).select('name email mobile whatsapp examToken').limit(5000).lean();

    let wa = 0, em = 0; let waError: string | undefined;
    for (const r of regs as any[]) {
      const link = includeLink ? ` ${examUrl(tenantId, r.examToken)}` : '';
      const body = `${String(message).replace(/\{name\}/g, r.name || '')}${link}`;
      if (channel === 'whatsapp' || channel === 'both') {
        const res2 = await otp.sendWhatsAppText(tenantId, r.whatsapp || r.mobile, body); if (res2.ok) wa++; else waError = waError || res2.error;
      }
      if (channel === 'email' || channel === 'both') {
        const ok = await emailService.sendGenericEmail(r.email, `${b.title} — update`, `<div style="font-family:Arial,sans-serif">${body.replace(/\n/g, '<br>')}</div>`); if (ok) em++;
      }
    }
    res.json({
      success: true, recipients: regs.length, whatsappSent: wa, emailSent: em, whatsappError: waError,
      message: `Sent to ${regs.length}. WhatsApp ${wa}${em || channel !== 'whatsapp' ? `, Email ${em}` : ''}.${waError ? ` — WhatsApp issue: ${waError}` : ''}`,
    });
  } catch (e: any) { logger.error('broadcastBattle failed', { error: e.message }); res.status(500).json({ message: e.message }); }
};

/** DELETE /battles/:id — delete a battle and its registrations. */
export const deleteBattle = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const b = await TechBattle.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!b) return res.status(404).json({ message: 'Battle not found' });
    await BattleRegistration.deleteMany({ battleId: req.params.id, tenantId });
    res.json({ success: true, message: 'Battle and its registrations deleted.' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** GET /battles/available-quizzes — quizzes to pick from (reuse). */
export const availableQuizzes = async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
  const Quiz = (await import('../models/Quiz')).default;
  const rows = await Quiz.find({ tenantId: tenantOf(req) }).select('title totalQuestions totalMarks totalTime').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ quizzes: rows });
};
