/**
 * Who counts as a CareerPilot member.
 *
 * The old rule was `passport: { $exists: true }`, and it excluded nobody: `passport` is a
 * nested path whose leaves carry defaults, so Mongoose materialises the subdocument on every
 * user it writes. Every ordinary LMS student satisfied it.
 *
 * That is a denominator bug, and a denominator bug is worse than a wrong number — it moves
 * every percentage on the screen at once, in the direction that flatters nothing and warns
 * about nothing. These tests fix the population against real documents, including the plain
 * student who caused the problem.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Payment from '../../models/Payment';
import {
  careerPilotMemberFilter, isCareerPilotMember, activeMemberFilter, expiredMemberFilter,
  freeMemberFilter, onboardedMemberFilter, paidMembershipPaymentFilter, CAREERPILOT_PRODUCT,
} from '../../services/careerPilotPopulation';
import { buildFunnel } from '../../services/passportFunnelService';

const TENANT = '507f1f77bcf86cd799439ee5';
const OTHER = '507f1f77bcf86cd799439ff6';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

let seq = 0;
let orderSeq = 0;

/** A user created exactly as the LMS creates one: no CareerPilot involvement at all. */
const plainStudent = (tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `Plain${seq}`, lastName: 'Student',
    email: `plain${seq}@example.com`, phone: `9500${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT', createdAt: daysAgo(20),
  });
};

/** A user created as the CareerPilot signup creates one. */
const careerPilotMember = (passport: any = {}, tenantId = TENANT) => {
  seq += 1;
  return User.create({
    tenantId, firstName: `Member${seq}`, lastName: 'CP',
    email: `cp${seq}@example.com`, phone: `9600${String(seq).padStart(6, '0')}`,
    password: 'x', role: 'STUDENT', createdAt: daysAgo(20),
    passport: { active: false, product: CAREERPILOT_PRODUCT, onboarded: true, ...passport },
  });
};

const paidFor = (studentId: any, tenantId = TENANT) => {
  orderSeq += 1;
  return Payment.create({
    tenantId, studentId, purpose: 'passport_membership', status: 'paid',
    amount: 149900, orderId: `order_pop_${orderSeq}`, createdAt: daysAgo(100),
  });
};

const countMembers = (tenantId = TENANT) =>
  User.countDocuments({ tenantId, ...careerPilotMemberFilter() });

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([User as any]);
});
afterAll(stopMongo);
beforeEach(async () => { await clearCollections(); seq = 0; orderSeq = 0; });

// ── the bug, and the fix ────────────────────────────────────────────────────

describe('an ordinary LMS student', () => {
  it('has a materialised passport subdocument — which is why $exists was useless', async () => {
    const u = await plainStudent();
    const raw: any = await User.findById(u._id).lean();

    // Not a hypothesis. The defaults really do create it.
    expect(raw.passport).toBeDefined();
    expect(raw.passport.active).toBe(false);
    // But nothing marks them as enrolled in anything.
    expect(raw.passport.product).toBeUndefined();
  });

  it('is excluded from the member population', async () => {
    await plainStudent();
    expect(await countMembers()).toBe(0);
  });

  it('is excluded even after the profile sync has written education onto them', async () => {
    // The sync used the same broken guard, so older records may carry these fields.
    const u = await plainStudent();
    await User.updateOne({ _id: u._id }, {
      $set: { 'passport.degree': 'B.Tech', 'passport.branch': 'CSE', 'passport.stage': 'placement' },
    });

    expect(await countMembers()).toBe(0);
  });

  it('is excluded by the in-memory predicate too', () => {
    expect(isCareerPilotMember({ active: false, onboarded: false, passwordSet: false })).toBe(false);
    expect(isCareerPilotMember({ degree: 'B.Tech', branch: 'CSE' })).toBe(false);
    expect(isCareerPilotMember(undefined)).toBe(false);
    expect(isCareerPilotMember(null)).toBe(false);
  });
});

describe('a genuine CareerPilot member', () => {
  it('is included from the moment they sign up, before verifying anything', async () => {
    await careerPilotMember();
    expect(await countMembers()).toBe(1);
  });

  it('is included on any single enrolment marker, for records that predate the product field', async () => {
    seq += 1;
    await User.create({
      tenantId: TENANT, firstName: 'Legacy', lastName: 'M', email: 'legacy@example.com',
      phone: '9700000001', password: 'x', role: 'STUDENT',
      passport: { active: false, verifiedAt: daysAgo(400) },      // no product field
    });
    seq += 1;
    await User.create({
      tenantId: TENANT, firstName: 'Legacy2', lastName: 'M', email: 'legacy2@example.com',
      phone: '9700000002', password: 'x', role: 'STUDENT',
      passport: { active: false, activatedAt: daysAgo(500) },
    });

    expect(await countMembers()).toBe(2);
  });

  it('is included when paid and active', async () => {
    const u = await careerPilotMember({ active: true, activatedAt: daysAgo(30), expiresAt: daysAhead(300) });
    await paidFor(u._id);
    expect(await countMembers()).toBe(1);
  });
});

// ── the cohorts stay apart ──────────────────────────────────────────────────

describe('the cohorts are not interchangeable', () => {
  let free: any; let active: any; let expired: any; let onboarded: any;

  beforeEach(async () => {
    free = await careerPilotMember();                                        // signed up, never paid
    active = await careerPilotMember({ active: true, activatedAt: daysAgo(10), expiresAt: daysAhead(300) });
    expired = await careerPilotMember({ active: true, activatedAt: daysAgo(400), expiresAt: daysAgo(5) });
    onboarded = await careerPilotMember({ contextCompletedAt: daysAgo(3) });
    await paidFor(active._id);
    await paidFor(expired._id);
    await plainStudent();                                                    // noise
  });

  it('counts every enrolled member, free or paid', async () => {
    expect(await countMembers()).toBe(4);
  });

  it('counts only live entitlements as active', async () => {
    const rows = await User.find({ tenantId: TENANT, ...activeMemberFilter() }).lean();
    expect(rows.map(r => String(r._id))).toEqual([String(active._id)]);
  });

  it('counts a lapsed membership as expired, and never a free member', async () => {
    const rows = await User.find({ tenantId: TENANT, ...expiredMemberFilter() }).lean();
    // The free member never activated anything, so they have not lost anything.
    expect(rows.map(r => String(r._id))).toEqual([String(expired._id)]);
  });

  it('counts members who never activated a membership as free', async () => {
    const rows = await User.find({ tenantId: TENANT, ...freeMemberFilter() }).lean();
    const ids = rows.map(r => String(r._id)).sort();
    expect(ids).toEqual([String(free._id), String(onboarded._id)].sort());
    // And the plain student is still not in it.
    expect(rows).toHaveLength(2);
  });

  it('counts finished onboarding separately from membership', async () => {
    const rows = await User.find({ tenantId: TENANT, ...onboardedMemberFilter() }).lean();
    expect(rows.map(r => String(r._id))).toEqual([String(onboarded._id)]);
  });

  it('answers "paid" from the payment ledger, not from the user document', async () => {
    // Activation can be granted by an admin without money changing hands, so revenue
    // questions are answered by what was actually collected.
    const paid = await Payment.countDocuments({ tenantId: TENANT, ...paidMembershipPaymentFilter() });
    expect(paid).toBe(2);
  });
});

// ── tenancy ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('never counts another tenant’s members', async () => {
    await careerPilotMember({}, TENANT);
    await careerPilotMember({}, OTHER);
    await careerPilotMember({}, OTHER);
    await plainStudent(OTHER);

    expect(await countMembers(TENANT)).toBe(1);
    expect(await countMembers(OTHER)).toBe(2);
  });
});

// ── the funnel denominator ──────────────────────────────────────────────────

describe('the funnel, with the corrected population', () => {
  it('no longer counts plain students as members', async () => {
    // Six plain students and four real members: the old rule reported ten.
    for (let i = 0; i < 6; i += 1) await plainStudent();
    await careerPilotMember({ verifiedAt: daysAgo(9) });
    await careerPilotMember({ verifiedAt: daysAgo(9) });
    await careerPilotMember();
    const paid = await careerPilotMember({ active: true, activatedAt: daysAgo(9), expiresAt: daysAhead(90) });
    await paidFor(paid._id);

    const { totals, counts, rows } = await buildFunnel(TENANT);

    expect(totals.members).toBe(4);
    expect(rows.every(r => r.email.startsWith('cp'))).toBe(true);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('reports percentages against the corrected denominator', async () => {
    for (let i = 0; i < 6; i += 1) await plainStudent();
    await careerPilotMember();                          // unverified
    await careerPilotMember({ verifiedAt: daysAgo(4) }); // no_assessment

    const { totals, counts } = await buildFunnel(TENANT);

    expect(totals.members).toBe(2);
    expect(counts.unverified).toBe(1);
    // 1 of 2, not 1 of 8. The old rule would have said 13%.
    expect(totals.unverifiedShare).toBe(50);
  });

  it('leaves revenue and paid counts untouched', async () => {
    for (let i = 0; i < 5; i += 1) await plainStudent();
    const a = await careerPilotMember({ active: true, activatedAt: daysAgo(5), expiresAt: daysAhead(90) });
    await paidFor(a._id);
    const b = await careerPilotMember({ activatedAt: daysAgo(400) });
    await paidFor(b._id);

    const { totals } = await buildFunnel(TENANT);

    // Money was never affected by the population bug — plain students have no payments —
    // and it must not move now either.
    expect(totals.paid).toBe(2);
    expect(totals.revenueInr).toBe(2998);
  });

  it('keeps stage precedence exactly as before', async () => {
    await plainStudent();
    const u = await careerPilotMember({ verifiedAt: daysAgo(30), careerScore: 61 });
    await Payment.create({
      tenantId: TENANT, studentId: u._id, purpose: 'passport_membership',
      status: 'created', amount: 149900, orderId: 'order_prec_1', createdAt: daysAgo(2),
    });

    const { counts, rows } = await buildFunnel(TENANT);

    // An abandoned checkout still outranks a score.
    expect(counts.checkout_abandoned).toBe(1);
    expect(counts.scored_unpaid).toBe(0);
    expect(rows[0].pendingAmountInr).toBe(1499);
  });

  it('still handles a larger mixed tenant', async () => {
    const users: any[] = [];
    for (let i = 0; i < 1200; i += 1) {
      const isMember = i % 3 !== 0;                      // two thirds are real members
      users.push({
        tenantId: i % 7 === 6 ? OTHER : TENANT,
        firstName: `Bulk${i}`, lastName: 'X',
        email: `bulkpop${i}@example.com`, phone: `9811${String(i).padStart(6, '0')}`,
        password: 'x', role: 'STUDENT', createdAt: daysAgo(45),
        passport: isMember
          ? { active: false, product: CAREERPILOT_PRODUCT, verifiedAt: daysAgo(20) }
          : undefined,                                   // a plain LMS student
      });
    }
    await User.insertMany(users);

    const a = await buildFunnel(TENANT);
    const b = await buildFunnel(OTHER);
    const expected = await countMembers(TENANT);

    expect(a.totals.members).toBe(expected);
    expect(a.totals.members + b.totals.members).toBeLessThan(1200);   // plain students excluded
    // Still exactly one stage per member, in both tenants.
    expect(Object.values(a.counts).reduce((x, y) => x + y, 0)).toBe(a.totals.members);
    expect(Object.values(b.counts).reduce((x, y) => x + y, 0)).toBe(b.totals.members);
  });
});
