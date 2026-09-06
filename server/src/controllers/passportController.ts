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
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import { resolveAssessedState } from '../services/memberAssessmentStateService';
import { ensureContent, poolMapOf, missionsForDay, clampSlots } from '../services/passportMissionService';
import { memberAxes } from '../services/careerStageService';
import PassportInterview from '../models/PassportInterview';
import { normalizePhone, mobileError } from '../utils/phone';

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
    // The allow-list is the whole security model for this endpoint, so a field absent from it
    // is silently discarded — a toggle that appears to save and changes nothing.
    const allowed = ['enabled', 'assessmentMode', 'onboardingFields', 'entitlements', 'priceInr', 'membershipMonths', 'roadmapDays', 'conceptLearningEnabled'];
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

    /**
     * HAS THIS MEMBER BEEN MEASURED — stated by the server, not inferred from the score.
     *
     * Mission Control inferred it from `careerScore`, and that is a DERIVED value:
     * careerScoreService deliberately writes nothing until role-readiness coverage reaches
     * 40%, because readiness over two skills of twenty-four is not a score worth
     * publishing. So a member who really had sat the skill assessment, but whose blueprint
     * is only thinly covered, had no careerScore — and the dashboard concluded they had
     * never been assessed and told them to go and take one. The same dead end as the
     * roadmap gate, reproduced one layer up.
     *
     * "Did they sit a paper" and "is there enough evidence for a headline number" are
     * different questions. This answers the first; careerScore answers the second.
     */
    const assessedState = await resolveAssessedState({
      tenantId,
      studentId: String(user?._id || userIdOf(req)),
      passport: user?.passport,
      categories: categoriesOf(await PassportAssessment.findOne({ tenantId }).lean() as any),
    });

    /**
     * XP and streak, because the screens that show them before activation had no source.
     *
     * Mission Control's locked view printed a hardcoded "0d" streak and an em dash for XP —
     * not a stale read, but literal text in the markup, because this payload never carried
     * the numbers. A member who had genuinely earned 100 XP and a one-day streak was shown
     * zero and nothing, on the very screen asking them to pay to "start earning". The two
     * cards next to them were live, which made the dead ones read as a broken page.
     *
     * Progress exists independently of membership — it is earned by doing the work, not by
     * paying — so it is reported whether or not the membership is active, and the screen
     * decides how to present it.
     */
    const progress = await PassportProgress
      .findOne({ tenantId, studentId: String(user?._id || userIdOf(req)) })
      .select('xp streak longestStreak').lean() as any;

    res.json({
      assessed: assessedState.assessed,
      progress: {
        xp: progress?.xp ?? 0,
        streak: progress?.streak ?? 0,
        longestStreak: progress?.longestStreak ?? 0,
      },
      assessedVia: assessedState.source,
      enabled: passportEnabled(tenantId, cfg),
      active,
      /**
       * `onboarded` is set to true by SIGNUP, so it answers "did they fill the join form",
       * not "are they ready to be assessed". Every consumer that wanted the second question
       * and asked this one got true for members who had never opened setup.
       *
       * `setupCompleted` is the honest marker: contextCompletedAt is written when the member
       * finishes /careerpilot/setup and chooses a role, which is the thing the assessment
       * actually requires. Stated by the server rather than inferred from the passport blob
       * below, so a client cannot get it subtly wrong.
       */
      onboarded: !!user?.passport?.onboarded,
      setupCompleted: !!user?.passport?.contextCompletedAt,
      passport: user?.passport || null,
      entitlements: cfg?.entitlements || [],
      entitled: entitlementMap(cfg?.entitlements as any, user?.passport),
      priceInr: cfg?.priceInr ?? 499,
      membershipMonths: cfg?.membershipMonths ?? 12,
      roadmapDays: cfg?.roadmapDays ?? 90,
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
        byDay.set(day, attempt ? missionsForDay(attempt, day, pools, content.journeyDays || 90, undefined, clampSlots((content as any).missionsPerDay)) : []);
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
 * PUT /passport/me — a member edits their own details.
 *
 * Email is deliberately NOT editable here. It is the login identity and the key the
 * signup funnel dedupes on; changing it from a profile screen would let someone walk
 * away from an account another person is already using.
 *
 * The phone IS editable, but carries the same one-number-one-account rule as signup —
 * otherwise the guard added there is trivially bypassed by registering with a spare
 * number and editing it afterwards.
 */
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    const b = req.body || {};

    const user: any = await User.findOne({ _id: studentId, tenantId });
    if (!user) return res.status(404).json({ message: 'Account not found' });

    const name = String(b.name ?? '').trim();
    if (name) {
      const [fn, ...rest] = name.split(' ');
      user.firstName = fn;
      user.lastName = rest.join(' ') || '-';
    }

    if (b.mobile !== undefined) {
      const err = mobileError(b.mobile);
      if (err) return res.status(400).json({ message: err });
      const mobile = normalizePhone(b.mobile);
      if (mobile !== user.phone) {
        const taken = await User.findOne({ phone: mobile, tenantId, _id: { $ne: studentId } }).select('_id').lean();
        if (taken) return res.status(409).json({ message: 'That mobile number already belongs to another account.' });
        user.phone = mobile;
      }
    }

    // Free-text and select fields the member owns. Capped because they are rendered on
    // the dashboard, the passport card and the admin list.
    user.passport = user.passport || {};
    const eduChanged = ['degree', 'branch', 'yearOfStudy'].some(k => b[k] !== undefined);
    for (const key of ['degree', 'branch', 'yearOfStudy', 'careerGoal', 'city'] as const) {
      if (b[key] === undefined) continue;
      user.passport[key] = String(b[key] || '').trim().slice(0, 120);
    }

    // Stage and background are a cached read of the fields just written, so they have to
    // be recomputed here. Without this, a member who corrected their degree kept the stage
    // that matched the OLD one — and nothing errored, the assessment and missions simply
    // went on fitting a student they no longer were. Same reasoning as the profile sync
    // service, which already does this for edits arriving from the LMS profile screen.
    if (eduChanged) {
      const derived = resolveCareerProfile({
        program: user.passport.program, branch: user.passport.branch, degree: user.passport.degree,
        yearOfStudy: user.passport.yearOfStudy,
        graduationYear: user.passport.graduationYear, graduationMonth: user.passport.graduationMonth,
        graduated: user.passport.graduated === true || /grad/i.test(String(user.passport.yearOfStudy || '')),
      });
      if (derived.stage) user.passport.stage = derived.stage;
      user.passport.background = derived.background;
      user.passport.stageComputedAt = derived.stageComputedAt;
      user.markModified('passport');
    }

    await user.save();
    res.json({
      success: true,
      profile: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        mobile: user.phone,
        degree: user.passport?.degree || '',
        branch: user.passport?.branch || '',
        yearOfStudy: user.passport?.yearOfStudy || '',
        careerGoal: user.passport?.careerGoal || '',
        city: user.passport?.city || '',
      },
    });
  } catch (e: any) {
    console.error('[passport] updateMyProfile:', e);
    res.status(500).json({ message: e.message || 'Could not save your profile' });
  }
};

/** GET /passport/me/profile — the editable view of the member's own details. */
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user: any = await User.findOne({ _id: userIdOf(req), tenantId: tenantOf(req) })
      .select('firstName lastName email phone passport').lean();
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.json({
      profile: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email, mobile: user.phone || '',
        degree: user.passport?.degree || '', branch: user.passport?.branch || '',
        yearOfStudy: user.passport?.yearOfStudy || '', careerGoal: user.passport?.careerGoal || '',
        city: user.passport?.city || '',
      },
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load your profile' });
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

    /**
     * Do not ask for what we can already work out.
     *
     * This prompt is a BACKFILL for members who joined before the academic-year question
     * existed. Degree plus year is a better answer than the graduation date it collects,
     * so when both are present the stage is derived and cached here and the member is
     * never shown the banner — which also removes the only route by which its
     * "I have already graduated" checkbox could contradict what they told us at signup.
     *
     * Only ever fills a stage that is missing; nothing recorded is overwritten.
     */
    let stage = p.stage || null;
    if (!stage && (p.degree || p.program) && p.yearOfStudy) {
      const derived = resolveCareerProfile({
        program: p.program, branch: p.branch, degree: p.degree, yearOfStudy: p.yearOfStudy,
        graduationYear: p.graduationYear, graduationMonth: p.graduationMonth,
        graduated: p.graduated === true,
      });
      if (derived.stage) {
        stage = derived.stage;
        await User.updateOne({ _id: userIdOf(req) }, {
          $set: {
            'passport.stage': derived.stage,
            'passport.background': derived.background,
            'passport.stageComputedAt': derived.stageComputedAt,
          },
        });
      }
    }

    res.json({
      needed: !stage,
      stage,
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

    const User = (await import('../models/User')).default;
    const userId = userIdOf(req);

    /**
     * Stage from COURSE POSITION where we have it, not from this form alone.
     *
     * This screen predates the academic-year question and used to re-derive the stage from
     * its own two fields only — no degree, no year — so whatever it computed silently
     * overwrote what the member had already told us at signup. A member whose record read
     * "B.Tech, 2nd Year" ticked "I have already graduated" here and was staged as a job
     * seeker, which handed them a JOB_SEEKER paper drawing on ADVANCED skills. The paper
     * could not be generated and the failure surfaced three screens later as a coverage
     * error naming a skill they had never chosen.
     *
     * resolveCareerProfile already prefers position over date; it just needs to be given
     * the position. Reading it back from the record is what makes the two screens agree
     * rather than race.
     */
    const existing: any = await User.findById(userId).select('passport.degree passport.yearOfStudy').lean();
    const degree = existing?.passport?.degree;
    const yearOfStudy = existing?.passport?.yearOfStudy;

    /**
     * "I have graduated" is not accepted against an academic year that says otherwise.
     *
     * The year is the more reliable of the two — it is a required question on the join
     * form, while this checkbox is an optional afterthought on a dismissible banner. A
     * member who really has graduated updates their year to "Graduated", which stages them
     * correctly through the ordinary path.
     */
    const yearSaysStudying = !!yearOfStudy && !/grad/i.test(String(yearOfStudy));
    const effectiveGraduated = grad && !yearSaysStudying;

    const derived = resolveCareerProfile({
      program, branch, degree, yearOfStudy,
      graduationMonth: graduationMonth ? Number(graduationMonth) : null,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      graduated: effectiveGraduated,
    });

    await User.updateOne({ _id: userId }, {
      $set: {
        'passport.program': program,
        'passport.branch': branch,
        'passport.graduationMonth': graduationMonth ? Number(graduationMonth) : undefined,
        'passport.graduationYear': graduationYear ? Number(graduationYear) : undefined,
        'passport.graduated': effectiveGraduated,
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

/**
 * POST /passport/members/:userId/grant — complimentary membership, on the record.
 *
 * WHY THIS EXISTS. Membership is set by a Razorpay payment and nothing else, so the only
 * way to produce a working demo account was to hand-edit `passport.active` in production.
 * That works, and it leaves nothing behind: no reason, no expiry, no way to tell a demo
 * from a customer six months later.
 *
 * ACCESS STILL RUNS THROUGH `active` + `expiresAt`. This deliberately does NOT introduce a
 * second notion of entitlement — every gate in the product keeps reading what it already
 * read, and a grant is simply a membership somebody did not pay for.
 *
 * TIME-BOXED BY DEFAULT. `membershipActive` already refuses an expired passport, so a grant
 * lapses on its own with no cron and no cleanup. A demo that never expires is how a
 * free-for-life account gets created by accident.
 */
export const grantMembership = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const User = (await import('../models/User')).default;

    /**
     * `> 0` matters as much as `isFinite`. An empty string and null both coerce to 0, which
     * previously survived the finite check and clamped to a ONE DAY grant — so a caller who
     * omitted the field got a demo that died tomorrow rather than the intended default.
     */
    const raw = Number(req.body?.days);
    const days = (Number.isFinite(raw) && raw > 0) ? Math.min(365, Math.round(raw)) : 30;
    const reason = String(req.body?.reason || '').trim().slice(0, 200);
    if (!reason) {
      return res.status(400).json({ message: 'Give a reason — it is what makes this grant auditable later.' });
    }

    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).select('passport firstName lastName').lean();
    if (!u) return res.status(404).json({ message: 'Member not found' });

    const now = new Date();

    /**
     * Never touch a CURRENT paying member.
     *
     * Granting over live paid access would rewrite `product` to the grant value and could
     * SHORTEN their expiry — turning a customer into a complimentary account that lapses
     * early, silently, and with no payment record to explain it.
     *
     * Expiry is judged here rather than reading `active` alone, because a lapsed member
     * keeps `active: true` — expiry is applied at read time by membershipActive. Checking
     * only the flag would refuse the very case this button is useful for: extending
     * somebody whose paid year has run out.
     */
    const paidStillRunning = u.passport?.product === 'career_passport'
      && u.passport?.active
      && (!u.passport?.expiresAt || new Date(u.passport.expiresAt).getTime() > now.getTime());

    if (paidStillRunning) {
      return res.status(409).json({
        message: 'This member has a paid membership that is still running. Granting over it would replace their paid access with a shorter complimentary one.',
      });
    }
    const expiresAt = new Date(now.getTime() + days * 86400000);
    const actor: any = (req as any).user || {};
    const byName = [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || 'admin';

    const set: any = {
      'passport.active': true,
      'passport.product': 'career_passport_grant',
      'passport.expiresAt': expiresAt,
      'passport.grant': { by: actor.id || actor._id, byName, at: now, reason, days },
    };
    // Preserved if they already had one: the journey clock is theirs, not this grant's.
    if (!u.passport?.activatedAt) set['passport.activatedAt'] = now;

    await User.updateOne({ _id: req.params.userId, tenantId }, { $set: set });

    /**
     * The journey needs a start date or the roadmap has no day 1. Upserted the same way a
     * paid activation does it, so a granted member is not a second kind of member with a
     * different set of rows behind them.
     */
    const PassportProgress = (await import('../models/PassportProgress')).default;
    const mongoose = (await import('mongoose')).default;
    await PassportProgress.updateOne(
      { tenantId, studentId: req.params.userId },
      { $setOnInsert: {
        tenantId, studentId: new mongoose.Types.ObjectId(req.params.userId),
        startDate: u.passport?.activatedAt || now,
      } },
      { upsert: true },
    );

    res.json({ success: true, granted: true, expiresAt, days, reason });
  } catch (e: any) {
    console.error('[passport] grant:', e?.message || e);
    res.status(500).json({ message: 'Could not grant access.' });
  }
};

/**
 * DELETE /passport/members/:userId/grant — take a complimentary membership back.
 *
 * Refuses a PAID membership outright. Revoking one here would look like an admin action
 * and leave a customer locked out with their payment still on file; a refund is a
 * different process and belongs nowhere near this button.
 */
export const revokeMembership = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const User = (await import('../models/User')).default;

    const u: any = await User.findOne({ _id: req.params.userId, tenantId }).select('passport').lean();
    if (!u) return res.status(404).json({ message: 'Member not found' });
    if (u.passport?.product === 'career_passport') {
      return res.status(409).json({ message: 'This is a paid membership and cannot be revoked here.' });
    }

    await User.updateOne(
      { _id: req.params.userId, tenantId },
      { $set: { 'passport.active': false }, $unset: { 'passport.grant': 1 } },
    );
    res.json({ success: true, revoked: true });
  } catch (e: any) {
    console.error('[passport] revoke grant:', e?.message || e);
    res.status(500).json({ message: 'Could not revoke access.' });
  }
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
