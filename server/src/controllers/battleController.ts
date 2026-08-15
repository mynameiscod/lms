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
import { normalizePhone, mobileError } from '../utils/phone';
import { buildBattleConfirmationEmail } from '../services/battleEmailTemplate';

const emailService = new EmailService();

const slugify = (s: string) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
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
    // Normalised, not merely stripped. "+91 97435 45311" and "9743545311" are the same
    // person, and the duplicate check below only works if they produce the same string —
    // stripping alone left them as "919743545311" and "9743545311", which never matched.
    const mob = normalizePhone(mobileRaw);
    const mobErr = mobileError(mobileRaw);
    if (mobErr) return res.status(400).json({ message: mobErr });
    const wa = normalizePhone(whatsapp || mobileRaw) || mob;
    const emailNorm = String(email).toLowerCase().trim();

    // Match on mobile OR email: one person, one entry per battle. Deduping on mobile alone
    // let the same candidate back in with a second number on the same email address.
    let reg = await BattleRegistration.findOne({
      battleId: b._id,
      $or: [{ mobile: mob }, { email: emailNorm }],
    });

    /**
     * Already fully in? (approved in approval mode, or verified in auto mode)
     *
     * Both cases now hand back an OTP and the token, so the member can verify their number
     * and read their exam link off the screen. Approval mode used to answer "check your
     * email" and stop there — which strands everyone the confirmation email never reached.
     * That is not hypothetical: a provider rate limit silently dropped ~390 of 457 exam
     * links for the NEC battle, and with the only route to the link sitting in an undelivered
     * email there was no way for a student to recover it on their own.
     *
     * It gives nothing away: /verify already required a WhatsApp OTP to the registered
     * number before returning the url, so the same proof of identity still gates it.
     */
    if (reg && ((approvalMode && reg.reviewStatus === 'approved') || (!approvalMode && reg.verified))) {
      const r = await otp.sendOtp(tenantId, reg.examToken, mob);
      return res.json({
        success: true, token: reg.examToken, alreadyRegistered: true, otp: r,
        message: approvalMode
          ? 'You are already approved — verify your number to open your exam link.'
          : 'You are already registered — verify to view your link.',
      });
    }

    if (!reg) {
      reg = new BattleRegistration({
        tenantId, battleId: b._id, battleSlug: b.slug, doorCode: door.code, doorLabel: door.label,
        name: String(name).trim(), mobile: mob, whatsapp: wa, email: emailNorm,
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
    // Re-counted rather than read off the document: while the battle is live everyone
    // else is still finishing, so a rank stored at submit time is out of date the moment
    // the next person beats it.
    if (reg.submittedAt) {
      const rank = await battle.rankOf(String(reg.battleId), reg);
      return res.status(200).json({ score: reg.score, totalMarks: reg.totalMarks, percentage: Math.round(reg.percentage || 0), rank, alreadySubmitted: true });
    }

    const b = await TechBattle.findById(reg.battleId).lean() as any;
    const quiz = await battle.getBattleQuiz(b.quizId) as any;
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const raw = req.body?.answers ?? [];
    const answers: Array<{ questionId: string; selectedOptions: string[] }> = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([questionId, selectedOptions]) => ({ questionId, selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions] as any }));

    // Fetch every answered question in ONE query, then grade in memory. This used to be
    // `await Question.findById(...)` inside the loop — 50 sequential round-trips for a
    // 50-question paper, per student, and 5 million queries across a 100k battle.
    const Question = (await import('../models/Question')).default;
    const qDocs = await Question.find({ _id: { $in: answers.map(a => a.questionId).filter(Boolean) } });
    const qById = new Map(qDocs.map((q: any) => [String(q._id), q]));

    let obtained = 0;
    const graded: any[] = [];
    for (const a of answers) {
      const q = qById.get(String(a.questionId));
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

    // Rank is COUNTED, not written. The previous call here re-ranked every submitted
    // registration with one write each, so submission #100,000 waited on 100,000 writes
    // before it could answer. This is a single indexed count that costs the same for
    // the first entrant and the last.
    const liveRank = await battle.rankOf(String(reg.battleId), {
      score: obtained, timeSpentSec: timeSpent, submittedAt: now,
    });

    // The paper is already saved by this point, so nothing below may throw the request
    // into the catch — a candidate whose answers are safely stored must never be shown
    // "submission failed". The tenant slug is only used to build a redirect link, so a
    // lookup failure degrades the link, not the result.
    let tenantSlug: string | undefined;
    try {
      tenantSlug = (await Tenant.findById(reg.tenantId).select('slug').lean() as any)?.slug;
    } catch {
      logger.warn('submitBattleExam: tenant slug lookup failed', { tenantId: String(reg.tenantId) });
    }

    res.json({
      success: true, score: obtained, totalMarks: quiz.totalMarks, percentage: Math.round(percentage),
      passed, rank: liveRank, timeSpentSec: timeSpent,
      slug: b.slug, tenantSlug,
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

/** Exported so the exact production template can be rendered for a test send,
 *  rather than approving a real registrant just to see the email. */
export async function sendConfirmEmail(reg: any, b: any, url: string) {
  const html = buildBattleConfirmationEmail({
    name: reg.name,
    email: reg.email,
    battleTitle: b.title,
    startAt: b.startAt,
    examUrl: url,
  });
  await emailService.sendGenericEmail(reg.email, `You're Registered for ${b.title} 🎉`, html);
}

// ─────────────────────────── ADMIN ───────────────────────────

export const listBattles = async (req: Request, res: Response) => {
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
  const b = await TechBattle.findOne({ _id: req.params.id, tenantId: tenantOf(req) }).lean();
  if (!b) return res.status(404).json({ message: 'Not found' });
  res.json({ battle: b, publicBase: publicBase(tenantOf(req)) });
};

export const updateBattle = async (req: Request, res: Response) => {
  try {
    const allowed = ['title', 'quizId', 'bannerUrl', 'description', 'prize', 'rules', 'registerOpensAt', 'registerClosesAt', 'startAt', 'endAt', 'joinCutoffMins', 'visibility', 'doors', 'registrationFields', 'registrationMode', 'proofNote', 'proctoring', 'leaderboardPublished', 'status'];
    const $set: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) $set[k] = req.body[k];
    if (Array.isArray($set.doors)) {
      $set.doors = $set.doors.map((d: any) => ({ ...d, code: slugify(d.code || d.label), type: d.type || 'college' }));
      if (!$set.doors.some((d: any) => d.code === 'public')) $set.doors.unshift({ code: 'public', label: 'Public', type: 'public' });
    }
    const b = await TechBattle.findOneAndUpdate({ _id: req.params.id, tenantId: tenantOf(req) }, { $set }, { new: true });
    if (!b) return res.status(404).json({ message: 'Not found' });

    // Publishing the leaderboard is the moment the result becomes final, so freeze the
    // ranks onto the documents once — a single bulkWrite. During the live battle ranks
    // are counted on demand and never written, which is what keeps submit O(1).
    if ($set.leaderboardPublished === true) {
      const frozen = await battle.finalizeBattleRanks(String(b._id));
      return res.json({ battle: b, ranksFrozen: frozen });
    }
    res.json({ battle: b });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const getRegistrations = async (req: Request, res: Response) => {
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
      const phone = reg.whatsapp || reg.mobile;
      // An approved template is the only thing Meta delivers to someone who has never
      // messaged us, which is every registrant. Free-form text is kept only as the
      // fallback for installs with no template configured — there it reaches nobody
      // outside the 24h window, but it is no worse than sending nothing.
      wa = otp.hasNotifyTemplate()
        ? await otp.sendWhatsAppTemplate(reg.tenantId, phone, { body: [reg.name || 'there', `${when} IST`], urlButtonParam: reg.examToken })
        : await otp.sendWhatsAppText(reg.tenantId, phone,
            `You're approved for ${b.title}! Your exam opens on ${when} IST. Start here (unlocks at start): ${url} — one attempt, single device. — CodeBegun`);
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
    const reg = await BattleRegistration.findOneAndUpdate(
      { _id: req.params.regId, battleId: req.params.id, tenantId: tenantOf(req) },
      { $set: { reviewStatus: 'rejected', rejectionReason: req.body?.reason || '' } }, { new: true }
    );
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    res.json({ success: true, message: 'Rejected.' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const adminLeaderboard = async (req: Request, res: Response) => {
  const rows = await battle.getBattleLeaderboard(req.params.id, { door: req.query.door as string, college: req.query.college as string, limit: 200 });
  res.json({ leaderboard: rows });
};

export const exportRegistrations = async (req: Request, res: Response) => {
  // Sorted by the one shared ordering (score, then TIME, then who finished first), so
  // the exported rank column is derived from position here rather than from a stored
  // field that is only frozen once the battle is finalized.
  const rows = await BattleRegistration.find({ battleId: req.params.id, tenantId: tenantOf(req) })
    .sort(battle.BATTLE_SORT).lean();

  let seq = 0;
  const rankFor = (r: any) => (r.status === 'submitted' ? ++seq : '');

  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Rank', 'Name', 'Mobile', 'Email', 'College', 'Door', 'Status', 'Score', 'Total', 'Percentage', 'TimeSec', 'SubmittedAt'];
  const lines = rows.map((r: any) => [rankFor(r), r.name, r.mobile, r.email, r.college, r.doorLabel, r.status, r.score ?? '', r.totalMarks ?? '', r.percentage != null ? Math.round(r.percentage) : '', r.timeSpentSec ?? '', r.submittedAt ? new Date(r.submittedAt).toISOString() : ''].map(esc).join(','));
  const csv = [header.map(esc).join(','), ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="battle-${req.params.id}-registrations.csv"`);
  res.send(csv);
};

/** POST /battles/:id/broadcast — send a custom reminder to registrants (WhatsApp / email / both). */
export const broadcastBattle = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { message, channel = 'whatsapp', review = 'approved', includeLink } = req.body || {};
    // Only email carries the typed message — WhatsApp sends the approved template, whose
    // wording Meta fixes — so a WhatsApp-only reminder does not need one.
    if ((channel === 'email' || channel === 'both') && (!message || !String(message).trim())) {
      return res.status(400).json({ message: 'Message is required for email' });
    }

    const b = await TechBattle.findOne({ _id: req.params.id, tenantId }).lean() as any;
    if (!b) return res.status(404).json({ message: 'Battle not found' });

    const q: any = { battleId: req.params.id, tenantId };
    if (review === 'approved') q.reviewStatus = 'approved';
    else if (review === 'pending') q.reviewStatus = 'pending';
    // 'all' → everyone who registered
    const regs = await BattleRegistration.find(q).select('name email mobile whatsapp examToken').limit(5000).lean();

    const wantsWhatsApp = channel === 'whatsapp' || channel === 'both';

    /**
     * Refuse rather than report a number that means nothing.
     *
     * Without a template every one of these sends goes out as free-form text, which Meta
     * accepts and then silently drops for anyone outside the 24h window — i.e. every
     * registrant. That path returned "WhatsApp 5" for five messages nobody received.
     */
    if (wantsWhatsApp && !otp.hasNotifyTemplate()) {
      return res.status(400).json({
        message: 'No WhatsApp template is configured, so reminders cannot reach registrants — ' +
          'Meta only delivers approved templates to people who have not messaged you. ' +
          'Set WHATSAPP_NOTIFY_TEMPLATE in Platform Settings → Messaging, or send by email.',
      });
    }
    // "Sent to 0" reads like a success. In approval mode nobody is `approved` until an
    // admin says so, so the default audience is empty on a fresh battle — say that.
    if (!regs.length) {
      return res.status(400).json({ message: `No ${review === 'all' ? '' : review + ' '}registrations to send to — nothing was sent.` });
    }

    // The template's wording is fixed by Meta, so the admin's text drives email only; the
    // WhatsApp side carries the approved copy with this member's name, the start time and
    // their own exam link on the button.
    const when = b.startAt
      ? new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST'
      : 'the scheduled time';

    let wa = 0, em = 0; let waError: string | undefined;
    for (const r of regs as any[]) {
      const link = includeLink ? ` ${examUrl(tenantId, r.examToken)}` : '';
      const body = `${String(message).replace(/\{name\}/g, r.name || '')}${link}`;
      if (wantsWhatsApp) {
        const res2 = await otp.sendWhatsAppTemplate(tenantId, r.whatsapp || r.mobile, {
          body: [r.name || 'there', when],
          urlButtonParam: r.examToken,
        });
        if (res2.ok) wa++; else waError = waError || res2.error;
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
    const tenantId = tenantOf(req);
    const b = await TechBattle.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!b) return res.status(404).json({ message: 'Battle not found' });
    await BattleRegistration.deleteMany({ battleId: req.params.id, tenantId });
    res.json({ success: true, message: 'Battle and its registrations deleted.' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** GET /battles/available-quizzes — quizzes to pick from (reuse). */
export const availableQuizzes = async (req: Request, res: Response) => {
  const Quiz = (await import('../models/Quiz')).default;
  const rows = await Quiz.find({ tenantId: tenantOf(req) }).select('title totalQuestions totalMarks totalTime').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ quizzes: rows });
};
