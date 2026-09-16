/**
 * The CareerPilot test-payment bypass, and the four things that must stop it.
 *
 * This activates a paid membership without taking money. It exists so checkout can be tested
 * while the same platform is running live hackathon registrations, so the tests that matter are
 * the refusals rather than the happy path: every one of these is a way it could activate a
 * membership it should not, and each is asserted separately so that removing a guard fails a
 * named test rather than quietly widening the hole.
 */

const payments: any[] = [];
let config: any = { tenantId: 't1', paymentMode: 'live', priceInr: 499, enabled: true };
const activated: string[] = [];

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: {
    // ensureConfig awaits findOne directly, with no .lean(), so the mock has to be awaitable
    // AND still answer .lean()/.select() for the call sites that chain.
    findOne: jest.fn(() => Object.assign(Promise.resolve(config), {
      lean: async () => config,
      select: () => ({ lean: async () => config }),
    })),
    findOneAndUpdate: jest.fn(async () => config),
    create: jest.fn(async () => config),
  },
}));
jest.mock('../models/Payment', () => ({
  __esModule: true,
  default: {
    create: jest.fn(async (doc: any) => { payments.push({ ...doc }); return doc; }),
    findOne: jest.fn((f: any) => ({
      lean: async () => payments.find(p => p.orderId === f.orderId && p.provider === f.provider) || null,
    })),
    findOneAndUpdate: jest.fn(async (f: any, u: any) => {
      const row = payments.find(p =>
        p.orderId === f.orderId && p.provider === f.provider &&
        p.purpose === f.purpose && p.status === f.status &&
        String(p.studentId) === String(f.studentId));
      if (!row) return null;
      Object.assign(row, u.$set);
      return row;
    }),
  },
}));
jest.mock('../services/passportActivationService', () => ({
  activateMembership: jest.fn(async (_t: string, s: string) => {
    activated.push(s);
    return { activated: true, expiresAt: new Date('2027-01-01') };
  }),
}));
jest.mock('../services/razorpayService', () => ({
  isConfigured: () => true,
  createOrder: jest.fn(async () => ({ id: 'order_real', amount: 49900, currency: 'INR', keyId: 'k' })),
  fetchPayment: jest.fn(),
}));

import { completeTestMembership } from '../controllers/passportController';

const run = async (body: any, studentId = 'stu1') => {
  const req: any = { body, tenantId: 't1', user: { id: studentId, tenantId: 't1' } };
  const res: any = {
    statusCode: 200, body: null as any,
    status(c: number) { this.statusCode = c; return this; },
    json(b: any) { this.body = b; return this; },
  };
  await completeTestMembership(req, res);
  return res;
};

const openTestOrder = (over: any = {}) => {
  const row = {
    tenantId: 't1', studentId: 'stu1', purpose: 'passport_membership', provider: 'test',
    orderId: 'test_stu1_123', status: 'created', amount: 49900, ...over,
  };
  payments.push(row);
  return row;
};

beforeEach(() => {
  payments.length = 0;
  activated.length = 0;
  config = { tenantId: 't1', paymentMode: 'test', priceInr: 499, enabled: true };
});

describe('it refuses unless the tenant is in test mode right now', () => {
  it('activates nothing when the tenant is live', async () => {
    config.paymentMode = 'live';
    openTestOrder();
    const res = await run({ orderId: 'test_stu1_123' });
    expect(res.statusCode).toBe(403);
    expect(activated).toHaveLength(0);
  });

  /** The switch is read at completion, not at order time, so flipping back stops it at once. */
  it('strands an order created in test mode once the tenant is switched back to live', async () => {
    openTestOrder();
    config.paymentMode = 'live';
    const res = await run({ orderId: 'test_stu1_123' });
    expect(res.statusCode).toBe(403);
    expect(activated).toHaveLength(0);
  });
});

describe('it refuses anything that is not its own test row', () => {
  it('will not settle a real Razorpay payment', async () => {
    payments.push({
      tenantId: 't1', studentId: 'stu1', purpose: 'passport_membership',
      provider: 'razorpay', orderId: 'order_real', status: 'created',
    });
    const res = await run({ orderId: 'order_real' });
    expect(res.statusCode).toBe(400);
    expect(activated).toHaveLength(0);
  });

  it('will not settle a hackathon payment, whatever its id', async () => {
    payments.push({
      tenantId: 't1', studentId: 'stu1', purpose: 'hackathon',
      provider: 'test', orderId: 'test_stu1_123', status: 'created',
    });
    const res = await run({ orderId: 'test_stu1_123' });
    expect(res.statusCode).toBe(404);
    expect(activated).toHaveLength(0);
  });

  it('will not settle another student’s order', async () => {
    openTestOrder({ studentId: 'someone-else' });
    const res = await run({ orderId: 'test_stu1_123' }, 'stu1');
    expect(res.statusCode).toBe(404);
    expect(activated).toHaveLength(0);
  });

  it('refuses an id that is not shaped like a test order', async () => {
    const res = await run({ orderId: 'pay_ABC123' });
    expect(res.statusCode).toBe(400);
    expect(activated).toHaveLength(0);
  });
});

describe('it activates exactly once', () => {
  it('activates the membership for an open test order', async () => {
    openTestOrder();
    const res = await run({ orderId: 'test_stu1_123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(activated).toEqual(['stu1']);
    expect(payments[0].status).toBe('paid');
  });

  /** A replayed request must not extend a membership a second time. */
  it('does not activate again when the same order is posted twice', async () => {
    openTestOrder();
    await run({ orderId: 'test_stu1_123' });
    const again = await run({ orderId: 'test_stu1_123' });
    expect(again.statusCode).toBe(200);
    expect(again.body.alreadyPaid).toBe(true);
    expect(activated).toEqual(['stu1']);
  });

  it('404s when there is no order at all', async () => {
    const res = await run({ orderId: 'test_stu1_999' });
    expect(res.statusCode).toBe(404);
    expect(activated).toHaveLength(0);
  });
});
