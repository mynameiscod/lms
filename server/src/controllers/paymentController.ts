import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Payment from '../models/Payment';
import User from '../models/User';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import * as razorpay from '../services/razorpayService';
import { unlockCandidatePlans } from '../services/assessmentEnrollmentService';

/**
 * paymentController — Razorpay self-serve unlock of a candidate's full
 * personalized plan. Flow:
 *   1. POST /payments/order  → create a Razorpay order (status 'created')
 *   2. browser opens Razorpay checkout with the returned keyId + orderId
 *   3. POST /payments/verify → verify the handler signature, mark 'paid',
 *      unlock the student's preview plan(s)
 *   4. POST /payments/webhook (public) → server-side fallback that unlocks even
 *      if the browser dropped before step 3.
 */

const tenantOf = (req: AuthenticatedRequest): string => String((req as any).tenantId || req.user?.tenantId || '');

/** Price + whether checkout is available — drives the CTA label/state. */
export const getPaymentConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    res.json({
      success: true,
      data: { available: razorpay.isConfigured(tenantId), priceInr: razorpay.getPriceInr(tenantId), currency: 'INR' },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to load payment config', error: e.message });
  }
};

/** Create a Razorpay order for unlocking the student's full plan. */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.user?.id || '');
    if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!razorpay.isConfigured(tenantId)) {
      return res.status(503).json({ success: false, message: 'Online payment is not available yet. Please use “Talk to a mentor”.' });
    }

    // Optional enrollment context — validate it belongs to the student if given.
    const enrollmentId = String((req.body || {}).enrollmentId || '') || undefined;
    let enrollment: any = null;
    if (enrollmentId) {
      enrollment = await CurriculumEnrollment.findOne({ _id: enrollmentId, tenantId, studentId }).lean();
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    // Already fully unlocked? Nothing to charge for.
    const hasPreview = await CurriculumEnrollment.exists({ tenantId, studentId, previewOnly: true });
    if (!hasPreview) {
      return res.status(409).json({ success: false, message: 'Your plan is already unlocked.', data: { alreadyUnlocked: true } });
    }

    const priceInr = razorpay.getPriceInr(tenantId);
    const user = await User.findById(studentId).select('firstName lastName email phone').lean<any>();

    const order = await razorpay.createOrder(tenantId, priceInr, `unlock_${studentId.slice(-8)}_${Date.now().toString().slice(-8)}`, {
      purpose: 'learning_plan_unlock',
      studentId,
      ...(enrollmentId ? { enrollmentId } : {}),
    });

    await Payment.create({
      tenantId,
      studentId,
      enrollmentId,
      purpose: 'learning_plan_unlock',
      provider: 'razorpay',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
      notes: { priceInr },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        priceInr,
        name: 'CodeBegun',
        description: 'Unlock your full personalized plan',
        prefill: {
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
      },
    });
  } catch (e: any) {
    console.error('[payment] createOrder failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to start payment' });
  }
};

/** Verify the checkout signature and unlock the plan. */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.user?.id || '');
    if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment confirmation fields' });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id, tenantId, studentId });
    if (!payment) return res.status(404).json({ success: false, message: 'Order not found' });

    const ok = razorpay.verifyPaymentSignature(tenantId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!ok) {
      payment.status = 'failed';
      payment.paymentId = razorpay_payment_id;
      await payment.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const unlocked = await markPaidAndUnlock(payment, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, message: 'Payment successful — your full plan is unlocked!', data: { unlocked } });
  } catch (e: any) {
    console.error('[payment] verifyPayment failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Verification failed' });
  }
};

/**
 * Razorpay webhook (public, raw body). Server-side fallback that unlocks the
 * plan on payment.captured even if the browser never reached /verify. Idempotent.
 */
export const webhook = async (req: Request, res: Response) => {
  try {
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const raw: Buffer | string = (req as any).rawBody ?? (Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body));
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;

    let event: any;
    try { event = JSON.parse(text); } catch { return res.status(400).json({ success: false }); }

    const orderId =
      event?.payload?.payment?.entity?.order_id ||
      event?.payload?.order?.entity?.id;
    if (!orderId) return res.status(200).json({ success: true, ignored: true });

    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(200).json({ success: true, ignored: true });

    // Verify against the tenant that owns this order.
    if (!razorpay.verifyWebhookSignature(String(payment.tenantId), raw, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const evType = String(event?.event || '');
    if (evType === 'payment.captured' || evType === 'order.paid') {
      const paymentId = event?.payload?.payment?.entity?.id || payment.paymentId;
      await markPaidAndUnlock(payment, paymentId, undefined);
    }
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('[payment] webhook failed:', e);
    res.status(200).json({ success: true }); // 200 so Razorpay doesn't hammer retries on our bugs
  }
};

/** Mark a payment paid (idempotent) and unlock the student's preview plan(s). */
async function markPaidAndUnlock(payment: any, paymentId?: string, signature?: string): Promise<number> {
  if (payment.status === 'paid') return payment.unlockedPlans || 0;
  const unlocked = await unlockCandidatePlans(String(payment.tenantId), String(payment.studentId));
  payment.status = 'paid';
  if (paymentId) payment.paymentId = paymentId;
  if (signature) payment.signature = signature;
  payment.unlockedPlans = unlocked;
  payment.paidAt = new Date();
  await payment.save();
  return unlocked;
}
