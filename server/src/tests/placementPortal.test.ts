const cand: any = { _id: 'c1', tenantId: 't1', stage: 'payment_pending', fee: { status: 'created', orderId: 'order_1', amountInr: 500 } };
let claimCount = 0;

jest.mock('../models/PlacementCandidate', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(async (q: any) => (q['fee.orderId'] === cand.fee.orderId ? cand : null)),
    // Atomic claim: matches only while the fee is still 'created' for this order.
    findOneAndUpdate: jest.fn(async (q: any, u: any) => {
      if (cand.fee.status !== 'created' || q['fee.orderId'] !== cand.fee.orderId) return null;
      claimCount++;
      cand.fee.status = u.$set['fee.status'];
      if (u.$set.stage) cand.stage = u.$set.stage;
      return cand;
    }),
  },
}));
jest.mock('../models/PlacementEvent', () => ({ __esModule: true, default: { create: jest.fn(async () => ({})) } }));
jest.mock('../services/razorpayService', () => ({ fetchPayment: jest.fn(async () => ({ status: 'captured', amount: 50000, currency: 'INR' })) }));

import { mustPayFirst, settleFee } from '../services/placementPortalService';

describe('mustPayFirst', () => {
  const cfg: any = { paymentBeforeBooking: true, feeInr: 500 };
  it('requires payment when the switch is on and the fee is unpaid', () => {
    expect(mustPayFirst({ fee: {} } as any, cfg)).toBe(true);
  });
  it('lets them book when paid, waived, the switch is off, or there is no fee', () => {
    expect(mustPayFirst({ fee: { status: 'paid' } } as any, cfg)).toBe(false);
    expect(mustPayFirst({ fee: { waived: true } } as any, cfg)).toBe(false);
    expect(mustPayFirst({ fee: {} } as any, { ...cfg, paymentBeforeBooking: false })).toBe(false);
    expect(mustPayFirst({ fee: {} } as any, { ...cfg, feeInr: 0 })).toBe(false);
  });
});

describe('settleFee', () => {
  it('marks the fee paid exactly once even when the browser and the webhook both report it', async () => {
    const a = await settleFee('order_1', 'pay_1', { amount: 50000, currency: 'INR' });
    const b = await settleFee('order_1', 'pay_1', { amount: 50000, currency: 'INR' });
    expect(a).toMatchObject({ paid: true });
    expect(b).toMatchObject({ alreadyPaid: true });
    expect(claimCount).toBe(1);
    expect(cand.stage).toBe('paid');
  });

  it('refuses a payment whose amount does not match the fee', async () => {
    cand.fee = { status: 'created', orderId: 'order_2', amountInr: 500 };
    const r = await settleFee('order_2', 'pay_2', { amount: 100, currency: 'INR' });
    expect(r).toMatchObject({ refused: expect.any(String) });
    expect(cand.fee.status).toBe('created');
  });

  it('ignores an order it does not know', async () => {
    expect(await settleFee('order_unknown', 'pay_x')).toEqual({ found: false });
  });
});
