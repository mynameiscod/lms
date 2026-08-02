import { Request, Response } from 'express';
import PassportConfig, { DEFAULT_ONBOARDING_FIELDS, DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import User from '../models/User';
import Payment from '../models/Payment';
import * as settings from '../services/settingsService';
import * as razorpay from '../services/razorpayService';
import { activateMembership } from '../services/passportActivationService';
import { settlePayment } from './paymentController';
import { membershipActive, entitlementMap } from '../services/passportEntitlementService';

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
    const q: any = { tenantId, 'passport.active': true };
    if (req.query.search) {
      const s = String(req.query.search);
      q.$or = [{ firstName: { $regex: s, $options: 'i' } }, { lastName: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
    }
    const rows = await User.find(q).select('firstName lastName email phone passport createdAt').sort({ createdAt: -1 }).limit(500).lean();
    res.json({ students: rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to list students' });
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
