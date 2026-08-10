import { Request, Response } from 'express';
import { resolveCareerProfile } from '../services/careerStageService';
import PassportConfig, { DEFAULT_ONBOARDING_FIELDS, DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import User from '../models/User';
import Payment from '../models/Payment';
import * as settings from '../services/settingsService';
import * as razorpay from '../services/razorpayService';
import { activateMembership } from '../services/passportActivationService';
import { settlePayment } from './paymentController';
import { membershipActive, entitlementMap } from '../services/passportEntitlementService';
import PassportProgress from '../models/PassportProgress';
import PassportAttempt from '../models/PassportAttempt';
import { ensureContent, poolMapOf, missionsForDay } from '../services/passportMissionService';
import { memberAxes } from '../services/careerStageService';
import PassportInterview from '../models/PassportInterview';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/** Master switch = the CareerPilot Config "Enable" toggle (read fresh). PASSPORT_ENABLED is
 *  only an OPTIONAL platform hard-kill — set it to 'false' to force Passport off globally. */
function passportEnabled(tenantId: string, cfg?: any): boolean {
  const hardOff = settings.getStr('PASSPORT_ENABLED', 'true', tenantId) === 'false';
  return !hardOff && !!(cfg?.enabled ?? false);
}

async function ensureConfig(tenantId: string) {
  let cfg = await PassportConfig.findOne({ tenantId });
  if (!cfg) {
    cfg = await PassportConfig.create({
      tenantId,
      onboardingFields: DEFAULT_ONBOARDING_FIELDS,
      entitlements: DEFAULT_ENTITLEMENTS,
    });
  }
  return cfg;
}

/** Admin: read the Passport config (seeds defaults on first open). */
export const getConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const cfg = await ensureConfig(tenantId);
    res.json({ config: cfg, platformEnabled: settings.getStr('PASSPORT_ENABLED', 'true', tenantId) !== 'false' });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load config' });
  }
};

/** Admin: update the Passport config. */
export const updateConfig = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    await ensureConfig(tenantId);
    const allowed = ['enabled', 'assessmentMode', 'onboardingFields', 'entitlements', 'priceInr', 'membershipMonths'];
    const $set: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) $set[k] = req.body[k];
    const cfg = await PassportConfig.findOneAndUpdate({ tenantId }, { $set }, { new: true });
    res.json({ config: cfg });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update config' });
  }
};

/** Student: my Passport status + the resolved entitlements (free/paid + active). */
export const getMyStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const cfg = await PassportConfig.findOne({ tenantId }).lean();
    const user = await User.findById(userIdOf(req)).select('passport firstName lastName email').lean() as any;
    const active = membershipActive(user?.passport);
    res.json({
      enabled: passportEnabled(tenantId, cfg),
      active,
      onboarded: !!user?.passport?.onboarded,
      passport: user?.passport || null,
      entitlements: cfg?.entitlements || [],
      entitled: entitlementMap(cfg?.entitlements as any, user?.passport),
      priceInr: cfg?.priceInr ?? 499,
      membershipMonths: cfg?.membershipMonths ?? 12,
      paymentAvailable: razorpay.isConfigured(tenantId),
      expiresAt: user?.passport?.expiresAt || null,
      shareSlug: user?.passport?.shareSlug || null,
      passwordSet: !!user?.passport?.passwordSet,
      email: user?.email || null,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load status' });
  }
};

/** Member sets/changes their own password so they can log in without WhatsApp OTP next time. */
export const setPassword = async (req: Request, res: Response) => {
  try {
    const password = String((req.body || {}).password || '');
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const user: any = await User.findById(userIdOf(req));
    if (!user) return res.status(404).json({ message: 'Account not found' });
    user.password = password; // hashed by the pre-save hook
    if (!user.passport) user.passport = {} as any;
    user.passport.passwordSet = true;
    await user.save();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to set password' });
  }
};

/** Admin: list Passport students. */
export const listStudents = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    // Everyone in the CareerPilot funnel, not only those who have paid. The filter was
    // 'passport.active': true, which made the screen a paid-member list — an admin could
    // add a member and never see them, because a manually created member starts inactive
    // and someone mid-funnel has not paid yet. Keyed on `product` so ordinary LMS
    // students, who have no CareerPilot record at all, stay out.
    const q: any = { tenantId, 'passport.product': { $exists: true, $ne: null } };
    if (req.query.search) {
      const s = String(req.query.search);
      q.$or = [{ firstName: { $regex: s, $options: 'i' } }, { lastName: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }
    // isActive is selected because the screen shows account status separately from
    // membership status — without it the Deactivated badge could never render.
    const rows = await User.find(q).select('firstName lastName email phone passport isActive createdAt').sort({ createdAt: -1 }).limit(500).lean();
    res.json({ students: rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list students' });
  }
};

/**
 * Admin: one member's written mission answers, newest first.
 *
 * The answers were being stored and read by nobody — no screen, no export, no AI. A
 * member writes the role they want and the gaps they see, and it went into a field that
 * had no reader. This is the reader.
 *
 * The mission TITLE is not stored beside the answer; it is regenerated by replaying
 * missionsForDay for the day the answer was written. That generator is deterministic in
 * (attempt, day, journeyDays), so the question that comes back is genuinely the one the
 * member was answering, and nothing has to be duplicated into the progress record to
 * keep them in sync. A mission whose title cannot be resolved — the pool was edited
 * since — still shows its answer rather than being dropped.
 */
export const listStudentAnswers = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId || '');

    const [user, progress] = await Promise.all([
      User.findOne({ _id: studentId, tenantId }).select('firstName lastName email passport').lean() as any,
      PassportProgress.findOne({ tenantId, studentId }).select('completed').lean() as any,
    ]);
    if (!user) return res.status(404).json({ message: 'Member not found' });

    const written = (progress?.completed || []).filter((c: any) => c.answer);
    if (!written.length) return res.json({ name: `${user.firstName || ''} ${user.lastName || ''}`.trim(), answers: [] });

    const [attempt, content] = await Promise.all([
      PassportAttempt.findOne({ tenantId, studentId }).sort({ createdAt: -1 }).lean() as any,
      ensureContent(tenantId),
    ]);
    const pools = poolMapOf(content.missionPools, memberAxes(user));

    // Regenerate each day once rather than per answer — three answers a day would
    // otherwise rebuild the same day three times.
    const byDay = new Map<number, any[]>();
    const missionsOn = (day: number) => {
      if (!byDay.has(day)) {
        byDay.set(day, attempt ? missionsForDay(attempt, day, pools, content.journeyDays || 90) : []);
      }
      return byDay.get(day)!;
    };

    const answers = written
      .map((c: any) => {
        const m = missionsOn(c.day).find(x => x.key === c.key);
        return {
          day: c.day,
          key: c.key,
          title: m?.title || '(mission no longer in the pool)',
          detail: m?.detail || '',
          category: m?.category || null,
          answer: c.answer,
          feedback: c.feedback || null,
          extract: c.extract || null,
          at: c.at,
        };
      })
      .sort((a: any, b: any) => b.day - a.day || String(a.key).localeCompare(String(b.key)));

    res.json({ name: `${user.firstName || ''} ${user.lastName || ''}`.trim(), email: user.email, answers });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load answers' });
  }
};

/**
 * GET /passport/students/:studentId/interviews — every mock interview this member has sat.
 *
 * The sessions were always stored; nothing read them outside the member's own account,
 * which meant the one artefact showing how a member actually PERFORMS — not what they
 * clicked — was invisible to the people coaching them. Transcript included, because the
 * score without the words behind it tells a reviewer nothing they can act on.
 */
export const listStudentInterviews = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.params.studentId || '');

    const [user, sessions] = await Promise.all([
      User.findOne({ _id: studentId, tenantId }).select('firstName lastName email').lean() as any,
      PassportInterview.find({ tenantId, studentId }).sort({ createdAt: -1 }).limit(30).lean() as any,
    ]);
    if (!user) return res.status(404).json({ message: 'Member not found' });

    res.json({
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      interviews: (sessions || []).map((s: any) => ({
        id: String(s._id),
        role: s.role,
        status: s.status,
        askedCount: s.askedCount,
        answers: (s.transcript || []).filter((t: any) => t.role === 'candidate').length,
        startedAt: s.startedAt,
        completedAt: s.completedAt || null,
        evaluation: s.evaluation || null,
        transcript: (s.transcript || []).map((t: any) => ({ role: t.role, text: t.text, at: t.at })),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load interviews' });
  }
};

/** Admin: manually convert/activate a student into Passport (the "Both" entry path). */
export const convertStudent = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { studentId } = req.body || {};
    const cfg = await ensureConfig(tenantId);
    const user = await User.findOne({ _id: studentId, tenantId }).select('_id').lean();
    if (!user) return res.status(404).json({ message: 'Student not found' });
    await activateMembership(tenantId, String(studentId));
    const fresh = await User.findById(studentId).select('passport').lean() as any;
    res.json({ message: 'Student activated for CareerPilot', passport: fresh?.passport });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to convert student' });
  }
};

/** Student: create a Razorpay order for the ₹499 Passport membership. */
export const createMembershipOrder = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Unauthorized' });
    const cfg = await ensureConfig(tenantId);
    if (!passportEnabled(tenantId, cfg)) return res.status(403).json({ message: 'CareerPilot is not available.' });
    if (!razorpay.isConfigured(tenantId)) {
      return res.status(503).json({ message: 'Online payment is not available yet. Please contact your mentor.' });
    }

    const user = await User.findById(studentId).select('passport firstName lastName email phone').lean() as any;
    if (membershipActive(user?.passport)) return res.status(409).json({ message: 'Your membership is already active.', alreadyActive: true });

    const priceInr = cfg.priceInr ?? 499;
    const order = await razorpay.createOrder(tenantId, priceInr, `pass_${studentId.slice(-8)}_${Date.now().toString().slice(-8)}`, {
      purpose: 'passport_membership', studentId,
    });

    await Payment.create({
      tenantId, studentId, purpose: 'passport_membership', provider: 'razorpay',
      target: { refModel: 'User', refId: studentId },
      orderId: order.id, amount: order.amount, currency: order.currency, status: 'created',
      notes: { priceInr, product: 'career_passport' },
    });

    res.json({
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: order.keyId, priceInr,
      name: 'CodeBegun CareerPilot',
      description: 'Unlock your full 90-day journey',
      prefill: {
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
        email: user?.email || '', contact: user?.phone || '',
      },
    });
  } catch (e: any) {
    console.error('[passport] createMembershipOrder:', e);
    res.status(500).json({ message: e.message || 'Failed to start payment' });
  }
};

/** Student: verify the checkout signature and activate the membership. */
export const verifyMembership = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment confirmation fields' });
    }
    const payment = await Payment.findOne({ orderId: razorpay_order_id, tenantId, studentId });
    if (!payment) return res.status(404).json({ message: 'Order not found' });

    const ok = razorpay.verifyPaymentSignature(tenantId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!ok) {
      payment.status = 'failed'; payment.paymentId = razorpay_payment_id; await payment.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }
    const result = await settlePayment(payment, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, message: 'Membership activated!', data: result });
  } catch (e: any) {
    console.error('[passport] verifyMembership:', e);
    res.status(500).json({ message: e.message || 'Verification failed' });
  }
};


// ── Career profile backfill ─────────────────────────────────────────────────

/**
 * Members who joined before staging existed have no graduation date, so they have no
 * stage and receive every question and every mission — correct, but generic.
 *
 * Asking is better than guessing. Defaulting them to 'placement' because it is the most
 * common buyer would silently mis-stage a first-year: they would be assessed on
 * internships they have not had and handed a plan about resumes. They are five active
 * members; one question answers it properly.
 */
export const getCareerProfileStatus = async (req: Request, res: Response) => {
  try {
    const User = (await import('../models/User')).default;
    const u: any = await User.findById(userIdOf(req)).select('passport').lean();
    const p = u?.passport || {};
    res.json({
      needed: !p.stage,
      stage: p.stage || null,
      program: p.program || null,
      graduationMonth: p.graduationMonth || null,
      graduationYear: p.graduationYear || null,
    });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** Member submits (or corrects) their program and graduation date; stage is re-derived. */
export const setCareerProfile = async (req: Request, res: Response) => {
  try {
    const { program, branch, graduationMonth, graduationYear, graduated } = req.body || {};
    const grad = graduated === true || graduated === 'true';

    // A member who is not graduated must give a usable date, otherwise we would store a
    // null stage and ask them again on the next screen.
    if (!grad) {
      const y = Number(graduationYear);
      if (!y || y < 2000 || y > 2100) {
        return res.status(400).json({ message: 'Please choose your expected graduation year.' });
      }
    }

    const derived = resolveCareerProfile({
      program, branch,
      graduationMonth: graduationMonth ? Number(graduationMonth) : null,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      graduated: grad,
    });

    const User = (await import('../models/User')).default;
    await User.updateOne({ _id: userIdOf(req) }, {
      $set: {
        'passport.program': program,
        'passport.branch': branch,
        'passport.graduationMonth': graduationMonth ? Number(graduationMonth) : undefined,
        'passport.graduationYear': graduationYear ? Number(graduationYear) : undefined,
        'passport.graduated': grad,
        'passport.stage': derived.stage,
        'passport.background': derived.background,
        'passport.stageComputedAt': derived.stageComputedAt,
      },
    });

    res.json({ success: true, stage: derived.stage, background: derived.background });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};


// ── Member management ───────────────────────────────────────────────────────

/**
 * Managing CareerPilot members.
 *
 * The rules that matter live here rather than in the UI, because a screen can be
 * bypassed and these decisions involve money:
 *
 *  - A member who has PAID is never hard-deleted. Their record is what a ₹499 payment
 *    points at; destroying it leaves an orphaned transaction and no way to prove what
 *    the money bought. Deactivation is reversible and loses nothing.
 *  - Hard delete exists only for records created in error, and only while they carry no
 *    payment and no assessment attempt.
 *  - A manually created member starts INACTIVE. Creating someone straight into an active
 *    paid membership would make `convert` — which is deliberately behind its own
 *    permission — trivially bypassable through the create form.
 */

export const createMember = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { firstName, lastName, email, phone } = req.body || {};
    const mail = String(email || '').trim().toLowerCase();

    if (!String(firstName || '').trim()) return res.status(400).json({ message: 'First name is required' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return res.status(400).json({ message: 'A valid email is required' });

    const User = (await import('../models/User')).default;
    if (await User.findOne({ email: mail })) {
      return res.status(409).json({ message: 'A user with that email already exists.' });
    }

    // The model requires a password. An admin-created member has not chosen one, so a
    // random unguessable value is stored and `passwordSet` stays false — the same shape
    // the public signup uses. They set a real password through the normal flow; this
    // placeholder can never be logged in with because nobody, including us, knows it.
    const placeholder = (await import('crypto')).randomBytes(24).toString('hex');

    const user: any = await User.create({
      tenantId, firstName: String(firstName).trim(), lastName: String(lastName || '').trim(),
      email: mail, phone: String(phone || '').trim(),
      password: placeholder,
      role: 'STUDENT', isActive: true,
      // Created inactive on purpose — granting membership is a separate, permissioned act.
      passport: { active: false, product: 'career_passport', onboarded: false, passwordSet: false },
    });

    res.status(201).json({ success: true, data: { _id: String(user._id), email: user.email } });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const User = (await import('../models/User')).default;
    const u: any = await User.findOne({ _id: req.params.userId, tenantId });
    if (!u) return res.status(404).json({ message: 'Member not found' });

    for (const k of ['firstName', 'lastName', 'phone'] as const) {
      if (req.body[k] !== undefined) u[k] = String(req.body[k]).trim();
    }
    // Email is the login identity, so a change must not collide with another account.
    if (req.body.email !== undefined) {
      const mail = String(req.body.email).trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return res.status(400).json({ message: 'A valid email is required' });
      const clash = await User.findOne({ email: mail, _id: { $ne: u._id } });
      if (clash) return res.status(409).json({ message: 'Another user already uses that email.' });
      u.email = mail;
    }
    await u.save();
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** Deactivate or restore. The reversible action, and the one to reach for by default. */
export const setMemberActive = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const active = req.body?.active !== false;
    const User = (await import('../models/User')).default;
    const r = await User.updateOne({ _id: req.params.userId, tenantId }, { $set: { isActive: active } });
    if (!r.matchedCount) return res.status(404).json({ message: 'Member not found' });
    res.json({ success: true, active });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};

/** Hard delete — refused for anyone who has paid or been assessed. */
export const deleteMember = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const User = (await import('../models/User')).default;
    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).lean();
    if (!u) return res.status(404).json({ message: 'Member not found' });

    const mongoose = (await import('mongoose')).default;
    const paid = await mongoose.connection.collection('payments')
      .countDocuments({ userId: u._id, purpose: 'passport_membership' })
      .catch(() => 0);
    const attempts = await mongoose.connection.collection('passportattempts')
      .countDocuments({ studentId: u._id })
      .catch(() => 0);

    if (paid > 0 || u.passport?.active) {
      return res.status(409).json({
        message: 'This member has paid for a membership, so the record cannot be deleted. Deactivate them instead — that is reversible and keeps the payment traceable.',
      });
    }
    if (attempts > 0) {
      return res.status(409).json({
        message: 'This member has completed an assessment. Deactivate rather than delete, so their result is not lost.',
      });
    }

    await User.deleteOne({ _id: u._id });
    res.json({ success: true, message: 'Member deleted' });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
};
