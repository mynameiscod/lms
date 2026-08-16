/**
 * The data integrity checks, against a real database.
 *
 * These cannot be written against mocked models, and not only because of the aggregations.
 * Half of what this service checks IS the database: whether a partial unique index exists,
 * whether it is unique, and whether a duplicate got in before it did. A fake model can be
 * told to report anything about its indexes, which would make the test a statement about the
 * fake rather than about the deployment the check exists to protect.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Payment from '../../models/Payment';
import CareerRoadmap from '../../models/CareerRoadmap';
import PassportInterview from '../../models/PassportInterview';
import PersonalizedAssessment from '../../models/PersonalizedAssessment';
import { RewardRedemption } from '../../models/RewardModels';
import { CoinLedger, CoinAccount } from '../../models/CoinModels';
import { CAREERPILOT_PRODUCT } from '../../services/careerPilotPopulation';
import {
  buildDataIntegrity, STALE_PAYMENT_HOURS, STUCK_INTERVIEW_HOURS, STUCK_REDEMPTION_MINUTES,
  SAMPLE_LIMIT,
} from '../../services/careerPilotDataIntegrityService';

const TENANT = '507f1f77bcf86cd799439aa1';
const OTHER  = '507f1f77bcf86cd799439bb2';

const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

let seq = 0;

const member = (passport: any = {}, tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `M${seq}`, lastName: 'Test',
    email: `di${seq}@example.com`, phone: `9700${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT',
    passport: { product: CAREERPILOT_PRODUCT, onboarded: true, ...passport },
  });
};

const paid = (studentId: any, tenantId = TENANT, over: any = {}) => {
  seq += 1;
  return Payment.create({
    tenantId, studentId, purpose: 'passport_membership', status: 'paid',
    amount: 49900, currency: 'INR', orderId: `order_di_${seq}`, ...over,
  });
};

/** A roadmap with every field Module 9 requires, so the model does the validating. */
const roadmap = (studentId: any, over: any = {}) => {
  seq += 1;
  return CareerRoadmap.create({
    tenantId: TENANT, studentId,
    roleKey: 'java_fullstack', roleName: 'Java Fullstack Developer',
    status: 'ACTIVE', policyVersion: 1,
    input: { daysPerWeek: 5, minutesPerDay: 60 },
    weekCount: 12, roadmapDays: 60,
    startDate: new Date(), endDate: daysAhead(84),
    generatedAt: new Date(), ...over,
  });
};

/** Every check for one code, whatever its area. */
const find = (r: any, code: string) => r.findings.find((f: any) => f.code === code);
const has = (r: any, code: string) => Boolean(find(r, code));

const ALL_MODELS = [
  User, Payment, CareerRoadmap, PassportInterview, PersonalizedAssessment,
  RewardRedemption, CoinLedger, CoinAccount,
] as any[];

beforeAll(async () => {
  await startMongo();
  await ensureIndexes(ALL_MODELS);
});
afterAll(stopMongo);
beforeEach(clearCollections);

// ── a healthy tenant ────────────────────────────────────────────────────────

describe('a tenant with nothing wrong', () => {
  it('reports no errors', async () => {
    const u = await member({ active: true, activatedAt: daysAgo(10), expiresAt: daysAhead(300) });
    await paid(u._id);
    await roadmap(u._id);

    const r = await buildDataIntegrity(TENANT);

    expect(r.counts.error).toBe(0);
    expect(r.complete).toBe(true);
  });

  it('says plainly that an empty tenant proves nothing', async () => {
    const r = await buildDataIntegrity(TENANT);

    expect(has(r, 'NO_MEMBERS')).toBe(true);
    expect(find(r, 'NO_MEMBERS').action).toMatch(/not the same as being proven correct/i);
  });

  it('does not invent findings for checks that found nothing', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await paid(u._id);

    const r = await buildDataIntegrity(TENANT);

    // A count of zero is not a finding. A screen listing every check that passed buries the
    // one that did not.
    expect(r.findings.every((f: any) => f.code === 'NO_MEMBERS' || f.count > 0)).toBe(true);
  });
});

// ── money ───────────────────────────────────────────────────────────────────

describe('somebody paid and got nothing', () => {
  it('finds a paid membership with no entitlement', async () => {
    const u = await member({ active: false });
    await paid(u._id);

    const f = find(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT');

    expect(f.severity).toBe('ERROR');
    expect(f.count).toBe(1);
    expect(f.sample).toEqual([String(u._id)]);
  });

  it('finds a payer whose membership has lapsed', async () => {
    // Expired is entitlement they no longer hold — worth surfacing, and the action says to
    // check the payment date before assuming it is a defect.
    const u = await member({ active: true, expiresAt: daysAgo(3) });
    await paid(u._id);

    const f = find(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT');

    expect(f.count).toBe(1);
    expect(f.action).toMatch(/expired/i);
  });

  it('accepts an active membership with no end date as entitled', async () => {
    // No expiry means it has not expired. The separate never-expires check owns that concern.
    const u = await member({ active: true, expiresAt: null });
    await paid(u._id);

    expect(has(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT')).toBe(false);
  });

  it('ignores a payment that was never captured', async () => {
    const u = await member({ active: false });
    await paid(u._id, TENANT, { status: 'created' });

    expect(has(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT')).toBe(false);
  });

  it('ignores payments for something other than membership', async () => {
    const u = await member({ active: false });
    await paid(u._id, TENANT, { purpose: 'fee' });

    expect(has(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT')).toBe(false);
  });

  it('surfaces payments left unsettled, and points at the refusal log', async () => {
    const u = await member();
    await paid(u._id, TENANT, { status: 'created', createdAt: hoursAgo(STALE_PAYMENT_HOURS + 5) });

    const f = find(await buildDataIntegrity(TENANT), 'PAYMENTS_NEVER_SETTLED');

    expect(f.severity).toBe('INFO');   // abandoned checkouts are ordinary
    expect(f.action).toMatch(/refusing to settle/);
  });

  it('does not flag a checkout opened minutes ago', async () => {
    const u = await member();
    await paid(u._id, TENANT, { status: 'created', createdAt: hoursAgo(1) });

    expect(has(await buildDataIntegrity(TENANT), 'PAYMENTS_NEVER_SETTLED')).toBe(false);
  });
});

// ── entitlement ─────────────────────────────────────────────────────────────

describe('entitlement without an end', () => {
  it('finds a membership that never expires', async () => {
    const u = await member({ active: true, expiresAt: null });

    const f = find(await buildDataIntegrity(TENANT), 'MEMBERSHIP_NEVER_EXPIRES');

    expect(f.count).toBe(1);
    expect(f.sample).toEqual([String(u._id)]);
  });

  it('leaves an ordinary dated membership alone', async () => {
    await member({ active: true, expiresAt: daysAhead(90) });

    expect(has(await buildDataIntegrity(TENANT), 'MEMBERSHIP_NEVER_EXPIRES')).toBe(false);
  });
});

// ── the indexes the concurrency argument rests on ───────────────────────────

describe('the guarantees are really in this database', () => {
  it('passes when every unique index is built', async () => {
    const r = await buildDataIntegrity(TENANT);

    expect(has(r, 'MISSING_UNIQUE_INDEX')).toBe(false);
    expect(has(r, 'INDEX_NOT_UNIQUE')).toBe(false);
  });

  it('notices when the live-interview lock is gone', async () => {
    // A database restored from a dump runs this code with none of its guarantees. The code
    // cannot tell; this check can.
    await PassportInterview.collection.dropIndex('tenantId_1_studentId_1_live_unique');

    const f = find(await buildDataIntegrity(TENANT), 'MISSING_UNIQUE_INDEX');

    expect(f.severity).toBe('ERROR');
    expect(f.message).toMatch(/one live interview per member/);
    expect(f.action).toMatch(/two transcripts/);

    await PassportInterview.syncIndexes();
  });

  it('notices an index that exists but enforces nothing', async () => {
    await CareerRoadmap.collection.dropIndexes();
    // The same keys, without `unique`. It appears in every index listing and stops nothing.
    await CareerRoadmap.collection.createIndex({ tenantId: 1, studentId: 1 });

    const f = find(await buildDataIntegrity(TENANT), 'INDEX_NOT_UNIQUE');

    expect(f.severity).toBe('ERROR');
    expect(f.message).toMatch(/is not unique, so it enforces nothing/);

    await CareerRoadmap.collection.dropIndexes();
    await CareerRoadmap.syncIndexes();
  });
});

describe('duplicates that predate the index', () => {
  it('finds a member with two active roadmaps', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    // Insert underneath Mongoose so the unique index is the only thing that could object —
    // and it cannot, because these go in before it is rebuilt.
    await CareerRoadmap.collection.dropIndexes();
    await roadmap(u._id);
    await roadmap(u._id);

    const f = find(await buildDataIntegrity(TENANT), 'DUPLICATE_ACTIVE_ROADMAP');

    expect(f.severity).toBe('ERROR');
    expect(f.count).toBe(1);
    expect(f.sample).toEqual([String(u._id)]);
    // Deleting one of a member's two plans is a decision, not a cleanup.
    expect(f.action).toMatch(/Do not delete either/);

    // And this is why finding them matters: the unique index cannot be rebuilt while they
    // are there, so the migration that would prevent the NEXT collision refuses to apply
    // until somebody resolves this one.
    await expect(CareerRoadmap.syncIndexes()).rejects.toThrow(/E11000|duplicate key/i);

    await CareerRoadmap.deleteMany({ tenantId: TENANT });
    await CareerRoadmap.syncIndexes();
  });

  it('does not confuse a member’s successive roadmaps for duplicates', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await roadmap(u._id);
    await roadmap(u._id, { status: 'SUPERSEDED' });
    await roadmap(u._id, { status: 'SUPERSEDED' });

    expect(has(await buildDataIntegrity(TENANT), 'DUPLICATE_ACTIVE_ROADMAP')).toBe(false);
  });
});

// ── stuck work ──────────────────────────────────────────────────────────────

describe('work that stopped half way', () => {
  it('finds an interview still live after hours', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await PassportInterview.create({
      tenantId: TENANT, studentId: u._id, status: 'in_progress', live: true,
      createdAt: hoursAgo(STUCK_INTERVIEW_HOURS + 3),
    });

    const f = find(await buildDataIntegrity(TENANT), 'INTERVIEW_STUCK_LIVE');

    expect(f.count).toBe(1);
    // The cost is not the row, it is the lock the row holds.
    expect(f.action).toMatch(/blocks that member from starting another/);
  });

  it('leaves an interview somebody is still sitting alone', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await PassportInterview.create({
      tenantId: TENANT, studentId: u._id, status: 'in_progress', live: true, createdAt: hoursAgo(1),
    });

    expect(has(await buildDataIntegrity(TENANT), 'INTERVIEW_STUCK_LIVE')).toBe(false);
  });

  it('finds a redemption that died holding a member’s coins', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await RewardRedemption.create({
      tenantId: TENANT, studentId: u._id, rewardKey: 'VOUCHER', rewardName: 'Voucher',
      rewardType: 'VOUCHER', coinCost: 500, budgetCostPaise: 10000,
      status: 'PENDING', idempotencyKey: 'k1', budgetPeriod: '2026-08',
      requestedAt: new Date(Date.now() - (STUCK_REDEMPTION_MINUTES + 10) * 60_000),
      steps: { stock: 'CLAIMED', tenantBudget: 'CLAIMED', memberBudget: 'NONE', coins: 'CLAIMED' },
    });

    const f = find(await buildDataIntegrity(TENANT), 'REDEMPTION_STUCK');

    expect(f.severity).toBe('ERROR');
    expect(f.count).toBe(1);
    // Editing the document by hand skips the undo path that makes the release safe.
    expect(f.action).toMatch(/Do not edit the documents directly/);
  });

  it('ignores a redemption that is merely young', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await RewardRedemption.create({
      tenantId: TENANT, studentId: u._id, rewardKey: 'VOUCHER', rewardName: 'Voucher',
      rewardType: 'VOUCHER', coinCost: 500, budgetCostPaise: 10000,
      status: 'PENDING', idempotencyKey: 'k2', budgetPeriod: '2026-08',
      requestedAt: new Date(), steps: { stock: 'CLAIMED', tenantBudget: 'NONE', memberBudget: 'NONE', coins: 'NONE' },
    });

    expect(has(await buildDataIntegrity(TENANT), 'REDEMPTION_STUCK')).toBe(false);
  });

  it('ignores an old PENDING that never claimed anything', async () => {
    // Nothing was acquired, so nobody is out of pocket.
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await RewardRedemption.create({
      tenantId: TENANT, studentId: u._id, rewardKey: 'VOUCHER', rewardName: 'Voucher',
      rewardType: 'VOUCHER', coinCost: 500, budgetCostPaise: 10000,
      status: 'PENDING', idempotencyKey: 'k3', budgetPeriod: '2026-08',
      requestedAt: daysAgo(3),
      steps: { stock: 'NONE', tenantBudget: 'NONE', memberBudget: 'NONE', coins: 'NONE' },
    });

    expect(has(await buildDataIntegrity(TENANT), 'REDEMPTION_STUCK')).toBe(false);
  });
});

// ── the coin ledger ─────────────────────────────────────────────────────────

describe('the balance against the ledger', () => {
  const ledger = (studentId: any, coins: number, key: string, tenantId = TENANT) =>
    CoinLedger.create({ tenantId, studentId, eventKey: 'TEST', coins, balanceAfter: coins, idempotencyKey: key });

  it('passes when the balance is the sum of the ledger', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await ledger(u._id, 100, 'a'); await ledger(u._id, -30, 'b');
    await CoinAccount.create({ tenantId: TENANT, studentId: u._id, balance: 70 });

    expect(has(await buildDataIntegrity(TENANT), 'COIN_BALANCE_DRIFT')).toBe(false);
  });

  it('finds a balance that drifted from the ledger', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await ledger(u._id, 100, 'c');
    await CoinAccount.create({ tenantId: TENANT, studentId: u._id, balance: 250 });

    const f = find(await buildDataIntegrity(TENANT), 'COIN_BALANCE_DRIFT');

    expect(f.severity).toBe('ERROR');
    expect(f.sample).toEqual([String(u._id)]);
    // A drift is evidence of a failed write, not just a wrong number.
    expect(f.action).toMatch(/Investigate before correcting/);
  });

  it('finds a ledger with no account at all', async () => {
    // Coins were awarded and the balance that reads them does not exist.
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await ledger(u._id, 100, 'd');

    expect(has(await buildDataIntegrity(TENANT), 'COIN_BALANCE_DRIFT')).toBe(true);
  });
});

// ── analytics ───────────────────────────────────────────────────────────────

describe('members the analytics cannot see', () => {
  it('finds someone with a plan but no enrolment marker', async () => {
    seq += 1;
    const u = await User.create({
      tenantId: TENANT, firstName: 'Ghost', lastName: 'Member',
      email: `ghost${seq}@example.com`, phone: `9800${String(seq).padStart(6, '0')}`,
      password: 'x', role: 'STUDENT',
    });
    await roadmap(u._id);

    const f = find(await buildDataIntegrity(TENANT), 'MEMBER_INVISIBLE_TO_ANALYTICS');

    expect(f.count).toBe(1);
    expect(f.sample).toEqual([String(u._id)]);
    // The damage is to every rate that uses the member total as its denominator.
    expect(f.action).toMatch(/denominator/);
  });

  it('counts a properly marked member as visible', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90) });
    await roadmap(u._id);

    expect(has(await buildDataIntegrity(TENANT), 'MEMBER_INVISIBLE_TO_ANALYTICS')).toBe(false);
  });
});

// ── tenant isolation ────────────────────────────────────────────────────────

describe('one tenant’s problems stay theirs', () => {
  it('does not report another tenant’s broken records', async () => {
    const theirs = await member({ active: false }, OTHER);
    await paid(theirs._id, OTHER);
    await member({ active: true, expiresAt: null }, OTHER);

    const r = await buildDataIntegrity(TENANT);

    expect(has(r, 'PAID_WITHOUT_ENTITLEMENT')).toBe(false);
    expect(has(r, 'MEMBERSHIP_NEVER_EXPIRES')).toBe(false);
  });

  it('does report them to the tenant they belong to', async () => {
    const theirs = await member({ active: false }, OTHER);
    await paid(theirs._id, OTHER);

    expect(has(await buildDataIntegrity(OTHER), 'PAID_WITHOUT_ENTITLEMENT')).toBe(true);
  });
});

// ── what the report is allowed to contain ───────────────────────────────────

describe('the payload', () => {
  it('carries ids and never contact details', async () => {
    const u = await member({ active: false });
    await paid(u._id);

    const body = JSON.stringify(await buildDataIntegrity(TENANT));

    // A diagnostic that returns emails and phone numbers is a bulk contact export under
    // another name — and this endpoint is reachable by anyone who can manage CareerPilot.
    expect(body).not.toContain('@example.com');
    expect(body).not.toContain(String((u as any).phone));
    expect(body).not.toContain(String((u as any).firstName));
    expect(body).toContain(String(u._id));
  });

  it('caps how many ids it returns', async () => {
    const made: any[] = [];
    for (let i = 0; i < SAMPLE_LIMIT + 5; i += 1) made.push(await member({ active: false }));
    for (const u of made) await paid(u._id);

    const f = find(await buildDataIntegrity(TENANT), 'PAID_WITHOUT_ENTITLEMENT');

    expect(f.count).toBe(SAMPLE_LIMIT + 5);          // the count is exact
    expect(f.sample.length).toBe(SAMPLE_LIMIT);      // the list is bounded
  });

  it('every finding says what to do about it', async () => {
    const u = await member({ active: false, expiresAt: null });
    await User.updateOne({ _id: u._id }, { $set: { 'passport.active': true } });
    await paid(u._id, TENANT, { status: 'created', createdAt: hoursAgo(48) });

    const r = await buildDataIntegrity(TENANT);

    expect(r.findings.length).toBeGreaterThan(0);
    for (const f of r.findings) {
      expect(f.action.length).toBeGreaterThan(20);
      expect(f.code).toBeTruthy();
    }
  });
});

// ── it never repairs ────────────────────────────────────────────────────────

describe('running the report changes nothing', () => {
  it('leaves every record exactly as it found it', async () => {
    const u = await member({ active: false, expiresAt: null });
    await User.updateOne({ _id: u._id }, { $set: { 'passport.active': true } });
    await paid(u._id);
    await roadmap(u._id);

    const before = {
      users: await User.find({ tenantId: TENANT }).lean(),
      payments: await Payment.find({ tenantId: TENANT }).lean(),
      roadmaps: await CareerRoadmap.find({ tenantId: TENANT }).lean(),
    };

    await buildDataIntegrity(TENANT);

    // "Fixing" a duplicate roadmap means choosing which of a member's plans to destroy. A
    // screen somebody opened to find out what was wrong must not do that.
    expect(await User.find({ tenantId: TENANT }).lean()).toEqual(before.users);
    expect(await Payment.find({ tenantId: TENANT }).lean()).toEqual(before.payments);
    expect(await CareerRoadmap.find({ tenantId: TENANT }).lean()).toEqual(before.roadmaps);
  });
});

// ── a failing check does not hide the others ────────────────────────────────

describe('when a check itself breaks', () => {
  it('reports the failure and still runs the rest', async () => {
    const u = await member({ active: true, expiresAt: null });
    const spy = jest.spyOn(RewardRedemption, 'countDocuments')
      .mockRejectedValueOnce(new Error('boom') as any);

    const r = await buildDataIntegrity(TENANT);

    expect(r.complete).toBe(false);
    expect(has(r, 'CHECK_FAILED')).toBe(true);
    // The point of not swallowing it: the other twelve checks still reported.
    expect(has(r, 'MEMBERSHIP_NEVER_EXPIRES')).toBe(true);
    expect(String(u._id)).toBeTruthy();

    spy.mockRestore();
  });
});
