import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Payment from '../models/Payment';
import User from '../models/User';
import Fee from '../models/Fee';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import * as razorpay from '../services/razorpayService';
import * as settings from '../services/settingsService';
import { applyFeePayment, reverseFeePayment } from '../services/feePaymentService';
import { unlockCandidatePlans } from '../services/assessmentEnrollmentService';
import { activateMembership } from '../services/passportActivationService';
import HackathonRegistration from '../models/HackathonRegistration';
import { settleRegistration } from './publicHackathonController';

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

    const result = await settlePayment(payment, razorpay_payment_id, razorpay_signature);
    res.json({ success: true, message: 'Payment successful!', data: result });
  } catch (e: any) {
    console.error('[payment] verifyPayment failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Verification failed' });
  }
};

/**
 * Razorpay webhook (public, raw body). Server-side fallback that unlocks the
 * plan on payment.captured even if the browser never reached /verify. Idempotent.
 */
/**
 * The same webhook, for a public hackathon registration.
 *
 * Kept here rather than on a second endpoint because Razorpay sends every event for the
 * account to one URL; a separate route would simply never be called. The verification is
 * identical and just as strict — the signature is checked against the tenant that owns the
 * order, and the captured amount comes from the signed body.
 */
async function handleHackathonWebhook(
  _req: Request, res: Response, event: any, orderId: string,
  raw: Buffer | string, signature: string,
): Promise<Response> {
  const reg = await HackathonRegistration.findOne({ 'payment.orderId': orderId });
  if (!reg) return res.status(200).json({ success: true, ignored: true });

  if (!razorpay.verifyWebhookSignature(reg.tenantId, raw, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const evType = String(event?.event || '');
  if (evType === 'payment.captured' || evType === 'order.paid') {
    const entity = event?.payload?.payment?.entity || {};
    const captured = entity.amount !== undefined
      ? { amount: Number(entity.amount), currency: String(entity.currency || ''), orderId: String(entity.order_id || '') }
      : undefined;
    // Idempotent, and it has to be: this and the browser's return trip both call it, in
    // whichever order they happen to arrive.
    await settleRegistration(reg, entity.id || reg.payment?.paymentId || '', undefined, captured);
  } else if (evType === 'payment.failed' && reg.status === 'pending_payment' && reg.payment) {
    // Frees the team's name and their members' numbers immediately, instead of making them
    // wait out the pending window before they can try again.
    reg.payment.status = 'failed';
    reg.status = 'cancelled';
    reg.cancelReason = 'Payment failed';
    await reg.save().catch(() => { /* the pending window releases it anyway */ });
  }
  return res.status(200).json({ success: true });
}

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
    /**
     * Not a fee payment — try the public hackathon funnel before giving up.
     *
     * Razorpay is configured with ONE webhook URL for the whole account, so every product
     * that takes money arrives here. A hackathon registration is not in the Payment ledger
     * (that ledger is student-scoped and a public registrant has no account), so it needs
     * its own lookup rather than being silently ignored — which would leave every paid team
     * sitting at `pending_payment` unless their browser happened to complete the return trip.
     */
    if (!payment) return handleHackathonWebhook(req, res, event, orderId, raw, signature);

    // Verify against the tenant that owns this order.
    if (!razorpay.verifyWebhookSignature(String(payment.tenantId), raw, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const evType = String(event?.event || '');
    if (evType === 'payment.captured' || evType === 'order.paid') {
      const entity = event?.payload?.payment?.entity || {};
      const paymentId = entity.id || payment.paymentId;
      // The body is signature-verified above, so these figures are as authentic as an API
      // lookup and cost nothing.
      const captured = entity.amount !== undefined
        ? { amount: Number(entity.amount), currency: String(entity.currency || ''), orderId: String(entity.order_id || '') }
        : undefined;
      await settlePayment(payment, paymentId, undefined, captured);
    }
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('[payment] webhook failed:', e);
    res.status(200).json({ success: true }); // 200 so Razorpay doesn't hammer retries on our bugs
  }
};

/**
 * Is this a path on our own site, and nothing else?
 *
 * One leading slash, not two, and no backslash after it — those are the two spellings of a
 * protocol-relative URL. Everything else that could carry a scheme or an authority is
 * refused rather than sanitised, because a redirect target is not worth being clever about.
 */
export function isSafeReturnPath(to: string): boolean {
  const v = String(to || '');
  if (!v.startsWith('/')) return false;
  if (v.startsWith('//') || v.startsWith('/' + String.fromCharCode(92))) return false;
  // Control characters can be used to smuggle a second header or confuse a parser.
  if (/[\r\n\t\0]/.test(v)) return false;
  return true;
}

/**
 * Public return URL for Razorpay REDIRECT-mode checkout. When the hosted checkout
 * finishes (esp. on mobile / incognito / popup-blocked where the in-page modal
 * handler can't fire), Razorpay redirects the browser here with the payment fields.
 * We settle idempotently (the webhook also does) and bounce the user back into the app.
 */
export const paymentReturn = async (req: Request, res: Response) => {
  const src: any = { ...(req.query || {}), ...(req.body || {}) };
  const orderId = String(src.razorpay_order_id || '');
  const paymentId = String(src.razorpay_payment_id || '');
  const signature = String(src.razorpay_signature || '');
  /**
   * Only same-origin app paths are allowed as the return target.
   *
   * `startsWith('/')` alone is not that check. `//evil.com` starts with a slash and is a
   * PROTOCOL-RELATIVE URL: the browser resolves it to https://evil.com, so a link to our
   * own payment-return endpoint would bounce the member to somebody else's site — carrying
   * our domain in the referrer, immediately after a payment, which is the most persuasive
   * possible moment to phish them. `/\evil.com` is the same trick with the other slash.
   */
  let to = String(src.to || '/passport');
  if (!isSafeReturnPath(to)) to = '/passport';

  try {
    if (orderId) {
      const payment = await Payment.findOne({ orderId });
      if (payment && paymentId && signature) {
        const ok = razorpay.verifyPaymentSignature(String(payment.tenantId), orderId, paymentId, signature);
        if (ok && payment.status !== 'paid') await settlePayment(payment, paymentId, signature);
      }
    }
  } catch (e: any) {
    console.error('[payment] return settle failed:', e?.message); // still redirect; webhook covers activation
  }
  return res.redirect(302, to);
};

const isAdmin = (req: AuthenticatedRequest) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF', 'INSTRUCTOR'].includes(String((req.user as any)?.role));

/** Admin: transactions ledger / reconciliation. */
export const listTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const filter: any = { tenantId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.purpose) filter.purpose = req.query.purpose;
    if (req.query.studentId) filter.studentId = req.query.studentId;
    const rows = await Payment.find(filter)
      .populate('studentId', 'firstName lastName email')
      .sort({ createdAt: -1 }).limit(500).lean();
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load transactions' });
  }
};

/** Admin: refund a paid payment (full or partial) and reverse the fee credit. */
export const refundPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const payment: any = await Payment.findOne({ _id: req.params.id, tenantId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status !== 'paid') return res.status(400).json({ success: false, message: 'Only a paid payment can be refunded' });
    if (!payment.paymentId) return res.status(400).json({ success: false, message: 'No gateway payment id to refund' });

    const paidInr = (payment.amount || 0) / 100;
    const amountInr = req.body?.amount ? Number(req.body.amount) : paidInr;
    if (!amountInr || amountInr <= 0 || amountInr > paidInr) {
      return res.status(400).json({ success: false, message: `Refund must be between ₹1 and ₹${paidInr}` });
    }
    const full = amountInr >= paidInr;

    const rf = await razorpay.refundPayment(tenantId, payment.paymentId, full ? undefined : amountInr);

    if ((payment.purpose === 'fee' || payment.purpose === 'fee_installment') && payment.feeId) {
      await reverseFeePayment({
        tenantId, feeId: String(payment.feeId), paymentRef: payment._id,
        amount: amountInr, installmentId: full ? payment.installmentId : undefined,
      });
    }

    payment.status = 'refunded';
    payment.refund = { refundId: rf.id, amount: amountInr, at: new Date(), by: req.user?.id as any, reason: req.body?.reason };
    await payment.save();
    res.json({ success: true, message: 'Refund initiated', data: { refundId: rf.id, amount: amountInr } });
  } catch (e: any) {
    console.error('[payment] refund failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Refund failed' });
  }
};

/** Fee payment availability + payable amounts for the student's Fee Details page. */
export const getFeePaymentInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.user?.id || '');
    if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const fee: any = await Fee.findOne({ tenantId, studentId }).lean();
    res.json({ success: true, data: {
      available: razorpay.isConfigured(tenantId),
      mode: settings.getStr('FEE_PAYMENT_MODE', 'full', tenantId),
      currency: 'INR',
      fee: fee ? {
        feeId: String(fee._id),
        totalAmount: fee.totalAmount || 0,
        paidAmount: fee.paidAmount || 0,
        dueAmount: fee.dueAmount || 0,
        status: fee.status,
        installments: (fee.installments || []).map((i: any) => ({ id: String(i._id), label: i.label, amount: i.amount, dueDate: i.dueDate, status: i.status })),
      } : null,
    }});
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Failed to load fee payment info' });
  }
};

/** Create a Razorpay order for a fee / installment. The amount is ALWAYS validated
 *  server-side against the Fee + FEE_PAYMENT_MODE — never trust the client amount. */
export const createFeeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = String(req.user?.id || '');
    if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!razorpay.isConfigured(tenantId)) return res.status(503).json({ success: false, message: 'Online payment is not available yet.' });

    const { feeId, installmentId } = req.body || {};
    const fee: any = feeId
      ? await Fee.findOne({ _id: feeId, tenantId, studentId })
      : await Fee.findOne({ tenantId, studentId });
    if (!fee) return res.status(404).json({ success: false, message: 'No fee record found' });

    const outstanding = Math.max(0, fee.dueAmount || 0);
    const mode = settings.getStr('FEE_PAYMENT_MODE', 'full', tenantId);

    let payable = 0; let instId: string | undefined; let purpose: 'fee' | 'fee_installment' = 'fee';
    if (installmentId) {
      const inst = (fee.installments || []).find((i: any) => String(i._id) === String(installmentId));
      if (!inst) return res.status(404).json({ success: false, message: 'Installment not found' });
      if (inst.status === 'paid') return res.status(409).json({ success: false, message: 'That installment is already paid' });
      payable = inst.amount; instId = installmentId; purpose = 'fee_installment';
    } else if (mode === 'installments') {
      const next = (fee.installments || []).find((i: any) => i.status !== 'paid');
      if (!next) return res.status(400).json({ success: false, message: 'No pending installment to pay' });
      payable = next.amount; instId = String(next._id); purpose = 'fee_installment';
    } else if (mode === 'partial') {
      payable = Number((req.body || {}).amount);
      if (!payable || payable <= 0) return res.status(400).json({ success: false, message: 'Enter an amount to pay' });
      if (payable > outstanding) return res.status(400).json({ success: false, message: `Amount exceeds the outstanding due (₹${outstanding})` });
    } else {
      payable = outstanding;
    }
    if (payable <= 0) return res.status(400).json({ success: false, message: 'Nothing is due right now.' });

    const user = await User.findById(studentId).select('firstName lastName email phone').lean<any>();
    const order = await razorpay.createOrder(tenantId, Math.round(payable), `fee_${studentId.slice(-6)}_${Date.now().toString().slice(-8)}`, {
      purpose, studentId, feeId: String(fee._id), ...(instId ? { installmentId: instId } : {}),
    });

    await Payment.create({
      tenantId, studentId, purpose,
      target: { refModel: 'Fee', refId: fee._id },
      feeId: fee._id, installmentId: instId,
      provider: 'razorpay', orderId: order.id, amount: order.amount, currency: order.currency,
      status: 'created', notes: { payableInr: payable, mode },
    });

    res.json({ success: true, data: {
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: order.keyId,
      payableInr: payable, name: 'CodeBegun', description: instId ? 'Fee installment' : 'Course fee',
      prefill: { name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '', email: user?.email || '', contact: user?.phone || '' },
    }});
  } catch (e: any) {
    console.error('[payment] createFeeOrder failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to start fee payment' });
  }
};

/**
 * Settle a payment exactly once, then run its purpose-specific side effect.
 * The created→paid transition is an ATOMIC claim so a racing verify + webhook
 * can't both apply the payment. On a side-effect failure the claim is released
 * (status back to 'created') so a retry can re-run it (side effects are idempotent).
 */
/**
 * What a settlement must match before anything is unlocked.
 *
 * `amount` and `currency` on the Payment record are copied from the order THE SERVER
 * CREATED — razorpayService.createOrder computes the paise from configured pricing and
 * hardcodes INR. Nothing a browser sends ever reaches them, so comparing against them is
 * comparing against our own intent rather than against the customer's claim.
 */
export interface CapturedPayment {
  amount: number;
  currency: string;
  orderId?: string;
}

export type SettleRefusal = 'amount_mismatch' | 'currency_mismatch' | 'wrong_order' | 'unverifiable';

/**
 * Does this capture actually pay for this order?
 *
 * A VALID SIGNATURE IS NOT A PAID INVOICE. It proves Razorpay issued the payment against
 * the order, and nothing about how much was captured — Razorpay supports partial capture,
 * so a ₹1 capture on a ₹499 order is authentic and signed and must not unlock a membership.
 *
 * Exact equality, deliberately. CareerPilot membership has no coupon, discount or partial
 * path: one order, one price, computed server-side. Fees are installments, but each
 * installment is its OWN order with its own server-created amount, so the same rule holds.
 * A tolerance would be a discount nobody approved.
 */
export function checkCapture(
  expected: { amount: number; currency: string; orderId: string },
  captured: CapturedPayment | null,
): { ok: true } | { ok: false; reason: SettleRefusal } {
  // Null means we could not ask Razorpay. Unverifiable is not the same as fine.
  if (!captured) return { ok: false, reason: 'unverifiable' };

  if (captured.orderId && String(captured.orderId) !== String(expected.orderId)) {
    return { ok: false, reason: 'wrong_order' };
  }
  if (String(captured.currency || '').toUpperCase() !== String(expected.currency || '').toUpperCase()) {
    return { ok: false, reason: 'currency_mismatch' };
  }
  // Under-capture is the real risk. An over-capture cannot happen through our checkout and
  // is refused too rather than quietly accepted.
  if (Number(captured.amount) !== Number(expected.amount)) {
    return { ok: false, reason: 'amount_mismatch' };
  }
  return { ok: true };
}

export async function settlePayment(
  payment: any,
  paymentId?: string,
  signature?: string,
  captured?: CapturedPayment,
): Promise<any> {
  /**
   * VERIFY BEFORE CLAIMING.
   *
   * The claim below is what makes settlement idempotent, and it is one-way: once the row
   * reads `paid` a retry returns the stored result rather than re-checking anything. So the
   * amount has to be settled first — validating after the claim would mean a refused
   * payment had already been marked paid.
   *
   * The webhook hands us the figures from its signed body. Verify and return hand us only
   * an id, so we ask Razorpay directly.
   */
  if (paymentId) {
    const seen = captured
      || await razorpay.fetchPayment(String(payment.tenantId), paymentId);
    const verdict = checkCapture(
      { amount: Number(payment.amount), currency: String(payment.currency || 'INR'), orderId: String(payment.orderId) },
      seen,
    );
    if (!verdict.ok) {
      // Left as `created`, never `paid`: nothing is unlocked, the row is not burned, and a
      // later full capture or a corrected webhook can still settle it.
      console.error(
        `[payment] refusing to settle ${payment.orderId}: ${(verdict as any).reason}`,
      );
      return { settled: false, refused: (verdict as any).reason };
    }
  }

  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'created' },
    { $set: { status: 'paid', paidAt: new Date(), ...(paymentId ? { paymentId } : {}), ...(signature ? { signature } : {}) } },
    { new: true }
  );
  if (!claimed) {
    const cur = await Payment.findById(payment._id).lean<any>();
    return { alreadyPaid: true, unlockedPlans: cur?.unlockedPlans };
  }
  try {
    if (claimed.purpose === 'learning_plan_unlock') {
      const unlocked = await unlockCandidatePlans(String(claimed.tenantId), String(claimed.studentId));
      await Payment.updateOne({ _id: claimed._id }, { $set: { unlockedPlans: unlocked } });
      return { unlocked };
    }
    if (claimed.purpose === 'fee' || claimed.purpose === 'fee_installment') {
      await applyFeePayment({
        tenantId: String(claimed.tenantId), studentId: String(claimed.studentId),
        amount: (claimed.amount || 0) / 100,   // paise → rupees
        paymentMethod: 'razorpay',
        feeId: claimed.feeId ? String(claimed.feeId) : undefined,
        installmentId: claimed.installmentId,
        transactionId: paymentId || claimed.paymentId,
        paymentRef: claimed._id as any,
      });
      return { feeApplied: true };
    }
    if (claimed.purpose === 'passport_membership') {
      const { expiresAt } = await activateMembership(String(claimed.tenantId), String(claimed.studentId));
      return { membershipActivated: true, expiresAt };
    }
    return {};
  } catch (e) {
    // Release the claim so the webhook/verify retry can re-apply (idempotently).
    await Payment.updateOne({ _id: claimed._id }, { $set: { status: 'created' } });
    throw e;
  }
}
