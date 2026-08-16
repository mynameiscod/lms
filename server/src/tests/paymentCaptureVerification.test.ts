/**
 * A valid signature is not a paid invoice.
 *
 * Razorpay's checkout signature proves a payment belongs to an order. It says nothing about
 * how much was captured — and Razorpay supports PARTIAL CAPTURE, so a ₹1 capture against a
 * ₹499 order is authentic, correctly signed, and must not unlock a 90-day membership.
 *
 * settlePayment used to activate on authenticity alone. These tests pin the gate that now
 * sits in front of it, and pin that it runs BEFORE the idempotency claim — validating
 * afterwards would mean a refused payment had already been written as paid.
 */

const findOneAndUpdate = jest.fn();
const findById = jest.fn();
const updateOne = jest.fn();
const activate = jest.fn();
const fetchPayment = jest.fn();

jest.mock('../models/Payment', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...a: any[]) => findOneAndUpdate(...a),
    findById: (...a: any[]) => findById(...a),
    updateOne: (...a: any[]) => updateOne(...a),
  },
}));
jest.mock('../services/passportActivationService', () => ({
  __esModule: true,
  activateMembership: (...a: any[]) => {
    activate(...a);
    return Promise.resolve({ expiresAt: new Date('2027-01-01') });
  },
}));
jest.mock('../services/razorpayService', () => ({
  __esModule: true,
  fetchPayment: (...a: any[]) => fetchPayment(...a),
  isConfigured: () => true,
  getPriceInr: () => 499,
  createOrder: jest.fn(),
  verifyPaymentSignature: () => true,
  verifyWebhookSignature: () => true,
}));
jest.mock('../services/assessmentEnrollmentService', () => ({ __esModule: true, unlockCandidatePlans: async () => [] }));
jest.mock('../services/feePaymentService', () => ({ __esModule: true, applyFeePayment: async () => {}, reverseFeePayment: async () => {} }));
jest.mock('../services/settingsService', () => ({ __esModule: true, getStr: (_k: string, d: string) => d, getNum: (_k: string, d: number) => d }));
jest.mock('../models/User', () => ({ __esModule: true, default: {} }));
jest.mock('../models/Fee', () => ({ __esModule: true, default: {} }));
jest.mock('../models/CurriculumEnrollment', () => ({ __esModule: true, default: {} }));

import { settlePayment, checkCapture } from '../controllers/paymentController';

/** A ₹499 membership order, exactly as the server created it. */
const order = (over: any = {}) => ({
  _id: 'pay1', tenantId: '507f1f77bcf86cd799439001', studentId: '507f1f77bcf86cd799439011',
  purpose: 'passport_membership', orderId: 'order_abc', amount: 49900, currency: 'INR',
  status: 'created', ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  // The claim succeeds by default, so any refusal below came from the capture gate.
  findOneAndUpdate.mockImplementation(async (_q: any, u: any) => ({ ...order(), ...u.$set }));
  findById.mockReturnValue({ lean: async () => order({ status: 'paid' }) });
  updateOne.mockResolvedValue({});
});

// ── the gate itself ─────────────────────────────────────────────────────────

describe('checking a capture against the order', () => {
  const expected = { amount: 49900, currency: 'INR', orderId: 'order_abc' };

  it('accepts the exact amount and currency', () => {
    expect(checkCapture(expected, { amount: 49900, currency: 'INR', orderId: 'order_abc' })).toEqual({ ok: true });
  });

  it('refuses an under-capture, however authentic', () => {
    // The whole finding: signed, genuine, and ₹1.
    expect(checkCapture(expected, { amount: 100, currency: 'INR', orderId: 'order_abc' }))
      .toEqual({ ok: false, reason: 'amount_mismatch' });
  });

  it('refuses an over-capture rather than quietly accepting it', () => {
    expect(checkCapture(expected, { amount: 99900, currency: 'INR', orderId: 'order_abc' }))
      .toEqual({ ok: false, reason: 'amount_mismatch' });
  });

  it('refuses a different currency', () => {
    // 499 of a stronger currency is not 499 rupees.
    expect(checkCapture(expected, { amount: 49900, currency: 'USD', orderId: 'order_abc' }))
      .toEqual({ ok: false, reason: 'currency_mismatch' });
  });

  it('accepts a currency that differs only in case', () => {
    expect(checkCapture(expected, { amount: 49900, currency: 'inr', orderId: 'order_abc' })).toEqual({ ok: true });
  });

  it('refuses a payment belonging to a different order', () => {
    expect(checkCapture(expected, { amount: 49900, currency: 'INR', orderId: 'order_someone_else' }))
      .toEqual({ ok: false, reason: 'wrong_order' });
  });

  it('refuses when the capture cannot be established at all', () => {
    // A failed lookup is not evidence that the amount was fine.
    expect(checkCapture(expected, null)).toEqual({ ok: false, reason: 'unverifiable' });
  });
});

// ── settlement ──────────────────────────────────────────────────────────────

describe('settling a membership payment', () => {
  it('activates on an exact capture', async () => {
    fetchPayment.mockResolvedValue({ id: 'pay_x', amount: 49900, currency: 'INR', orderId: 'order_abc', status: 'captured' });

    const r = await settlePayment(order(), 'pay_x');

    expect(r.membershipActivated).toBe(true);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('does NOT activate on an under-capture', async () => {
    fetchPayment.mockResolvedValue({ id: 'pay_x', amount: 100, currency: 'INR', orderId: 'order_abc', status: 'captured' });

    const r = await settlePayment(order(), 'pay_x');

    expect(r.settled).toBe(false);
    expect(r.refused).toBe('amount_mismatch');
    expect(activate).not.toHaveBeenCalled();
  });

  it('does NOT mark the payment paid when the capture is refused', async () => {
    fetchPayment.mockResolvedValue({ id: 'pay_x', amount: 100, currency: 'INR', orderId: 'order_abc', status: 'captured' });

    await settlePayment(order(), 'pay_x');

    // The claim is one-way, so it must never run for a payment we are refusing — the row
    // stays `created` and a later full capture can still settle it.
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does NOT activate on a currency mismatch', async () => {
    fetchPayment.mockResolvedValue({ id: 'pay_x', amount: 49900, currency: 'USD', orderId: 'order_abc', status: 'captured' });

    const r = await settlePayment(order(), 'pay_x');

    expect(r.refused).toBe('currency_mismatch');
    expect(activate).not.toHaveBeenCalled();
  });

  it('does NOT activate when the payment names another order', async () => {
    fetchPayment.mockResolvedValue({ id: 'pay_x', amount: 49900, currency: 'INR', orderId: 'order_other', status: 'captured' });

    expect((await settlePayment(order(), 'pay_x')).refused).toBe('wrong_order');
    expect(activate).not.toHaveBeenCalled();
  });

  it('does NOT activate when Razorpay cannot be reached', async () => {
    fetchPayment.mockResolvedValue(null);

    expect((await settlePayment(order(), 'pay_x')).refused).toBe('unverifiable');
    expect(activate).not.toHaveBeenCalled();
  });

  it('compares against the ORDER, so a caller cannot supply its own expectation', async () => {
    // A hostile caller passing a matching "captured" figure still loses: the expectation
    // comes from the stored Payment, which no request can write.
    const r = await settlePayment(order({ amount: 49900 }), 'pay_x', undefined, {
      amount: 100, currency: 'INR', orderId: 'order_abc',
    });

    expect(r.refused).toBe('amount_mismatch');
    expect(fetchPayment).not.toHaveBeenCalled();   // the supplied figures were used, and refused
  });
});

// ── idempotency is unchanged ────────────────────────────────────────────────

describe('idempotency survives the new gate', () => {
  const captured = { id: 'pay_x', amount: 49900, currency: 'INR', orderId: 'order_abc', status: 'captured' };

  it('activates once when a webhook is replayed', async () => {
    fetchPayment.mockResolvedValue(captured);
    // The second settle finds the row already claimed.
    findOneAndUpdate
      .mockImplementationOnce(async (_q: any, u: any) => ({ ...order(), ...u.$set }))
      .mockImplementationOnce(async () => null);

    const first = await settlePayment(order(), 'pay_x');
    const second = await settlePayment(order(), 'pay_x');

    expect(first.membershipActivated).toBe(true);
    expect(second.alreadyPaid).toBe(true);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('activates once when verify and the webhook race', async () => {
    fetchPayment.mockResolvedValue(captured);
    let claimedOnce = false;
    findOneAndUpdate.mockImplementation(async (_q: any, u: any) => {
      if (claimedOnce) return null;                 // MongoDB picks exactly one winner
      claimedOnce = true;
      return { ...order(), ...u.$set };
    });

    const [a, b] = await Promise.all([
      settlePayment(order(), 'pay_x'),
      settlePayment(order(), 'pay_x'),
    ]);

    expect([a, b].filter(r => r.membershipActivated)).toHaveLength(1);
    expect([a, b].filter(r => r.alreadyPaid)).toHaveLength(1);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('still settles a purpose that carries no payment id to check', async () => {
    // Nothing to verify against means nothing to refuse — the claim alone governs, exactly
    // as it did before.
    const r = await settlePayment(order({ purpose: 'passport_membership' }), undefined);
    expect(r.membershipActivated).toBe(true);
  });
});
