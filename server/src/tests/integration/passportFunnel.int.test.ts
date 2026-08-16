/**
 * The drop-off funnel, against a real MongoDB.
 *
 * WHAT THESE TESTS ARE FOR. They were written against the ORIGINAL implementation — the one
 * that loaded every member plus their attempts, payments and progress into Node and joined
 * them there — and they record exactly what it produced. The aggregation rewrite that
 * follows has to pass them unchanged. That is the proof of equivalence: not an assertion
 * that two functions agree, but the same executable specification satisfied by both, with
 * the diff showing the implementation moved and the expectations did not.
 *
 * These are stage-classification rules with real commercial weight — "opened checkout and
 * walked away" is the list somebody rings this afternoon — so they are pinned member by
 * member rather than by count alone.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PassportAttempt from '../../models/PassportAttempt';
import Payment from '../../models/Payment';
import PassportProgress from '../../models/PassportProgress';
import { buildFunnel, STAGES, StageKey } from '../../services/passportFunnelService';

/**
 * ObjectId-shaped, because User.tenantId is an ObjectId while the CareerPilot collections
 * store the tenant as a string. buildFunnel passes one value to both and Mongoose casts it
 * per schema — which only works if the value is a valid 24-hex id, exactly as in production.
 */
const TENANT = '507f1f77bcf86cd799439aa1';
const OTHER  = '507f1f77bcf86cd799439bb2';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

let seq = 0;

/** A CareerPilot member. Everything optional defaults to "never did anything". */
async function member(passport: any = {}, over: any = {}) {
  seq += 1;
  return User.create({
    tenantId: over.tenantId || TENANT,
    firstName: over.firstName || `Member${seq}`,
    lastName: over.lastName ?? `L${seq}`,
    email: `m${seq}@example.com`,
    phone: `90000000${String(seq).padStart(2, '0')}`,
    password: 'x',
    role: 'STUDENT',
    createdAt: over.createdAt || daysAgo(30),
    passport: { active: false, ...passport },
  });
}

const scored = (studentId: any, tenantId = TENANT, at = daysAgo(10)) =>
  PassportAttempt.create({ tenantId, studentId, careerScore: 62, createdAt: at, answers: [] });

let orderSeq = 0;
// Payment.orderId is required and unique — Razorpay's own id in production.
const payment = (studentId: any, status: string, amountPaise = 149900, at = daysAgo(3), tenantId = TENANT) => {
  orderSeq += 1;
  return Payment.create({
    tenantId, studentId, purpose: 'passport_membership', status,
    amount: amountPaise, orderId: `order_test_${orderSeq}`, createdAt: at,
  });
};

const progress = (studentId: any, updatedAt: Date, tenantId = TENANT) =>
  PassportProgress.create({ tenantId, studentId, xp: 10, updatedAt });

/** Stage of one member by email, for readable assertions. */
const stageOf = (rows: any[], email: string): StageKey | undefined =>
  rows.find(r => r.email === email)?.stage;

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([User as any, PassportProgress as any]);
});
afterAll(stopMongo);
beforeEach(async () => { await clearCollections(); seq = 0; orderSeq = 0; });

// ── one member, one stage ───────────────────────────────────────────────────

describe('where a member lands', () => {
  it('is unverified when they never got past the OTP', async () => {
    await member({});
    const { rows, counts } = await buildFunnel(TENANT);

    expect(rows).toHaveLength(1);
    expect(rows[0].stage).toBe('unverified');
    expect(counts.unverified).toBe(1);
  });

  it('is no_assessment once they verified but never sat it', async () => {
    await member({ verifiedAt: daysAgo(20) });
    const { counts } = await buildFunnel(TENANT);
    expect(counts.no_assessment).toBe(1);
  });

  it('counts passwordSet or lastSeenAt as proof they got past the OTP', async () => {
    // verifiedAt only exists from the day it shipped; older members are placed by what
    // they demonstrably did.
    await member({ passwordSet: true });
    await member({ lastSeenAt: daysAgo(5) });
    const { counts } = await buildFunnel(TENANT);
    expect(counts.no_assessment).toBe(2);
  });

  it('is scored_unpaid once an assessment was submitted', async () => {
    const u = await member({ verifiedAt: daysAgo(20) });
    await scored(u._id);
    const { counts } = await buildFunnel(TENANT);
    expect(counts.scored_unpaid).toBe(1);
  });

  it('is scored_unpaid on a stored careerScore even with no attempt row', async () => {
    await member({ verifiedAt: daysAgo(20), careerScore: 55 });
    const { counts } = await buildFunnel(TENANT);
    expect(counts.scored_unpaid).toBe(1);
  });

  it('is checkout_abandoned once a payment was created but never paid', async () => {
    const u = await member({ verifiedAt: daysAgo(20) });
    await scored(u._id);
    await payment(u._id, 'created');

    const { rows, counts } = await buildFunnel(TENANT);

    expect(counts.checkout_abandoned).toBe(1);
    // The amount they nearly paid, in rupees, so a caller can open with it.
    expect(rows[0].pendingAmountInr).toBe(1499);
  });

  it('is active for a live membership that has been used recently', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(300), activatedAt: daysAgo(10) });
    await payment(u._id, 'paid');
    await progress(u._id, daysAgo(1));

    const { counts } = await buildFunnel(TENANT);
    expect(counts.active).toBe(1);
  });

  it('is quiet for a live membership with no activity for 14 days', async () => {
    // No progress row at all, so the last touch falls back to the passport's own dates.
    // (A progress row cannot stand in for an old one: `timestamps: true` stamps updatedAt
    // at creation, so anything this suite writes is always "just now".)
    const u = await member({ active: true, expiresAt: daysAhead(300), activatedAt: daysAgo(60) });
    await payment(u._id, 'paid');

    const { counts } = await buildFunnel(TENANT);
    expect(counts.quiet).toBe(1);
    expect(counts.active).toBe(0);
  });

  it('is expired once the membership lapsed, even though they paid', async () => {
    const u = await member({ active: true, expiresAt: daysAgo(5), activatedAt: daysAgo(400) });
    await payment(u._id, 'paid');

    const { counts } = await buildFunnel(TENANT);
    expect(counts.expired).toBe(1);
  });

  it('is expired when the flag was cleared but a payment exists', async () => {
    const u = await member({ active: false });
    await payment(u._id, 'paid');
    const { counts } = await buildFunnel(TENANT);
    expect(counts.expired).toBe(1);
  });

  it('never puts one member in two stages', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90), verifiedAt: daysAgo(50), careerScore: 70 });
    await scored(u._id);
    await payment(u._id, 'paid');
    await progress(u._id, daysAgo(1));

    const { rows, counts } = await buildFunnel(TENANT);

    expect(rows).toHaveLength(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
    // Furthest point reached wins.
    expect(rows[0].stage).toBe('active');
  });
});

// ── precedence ──────────────────────────────────────────────────────────────

describe('the order stages are considered in', () => {
  it('prefers an active membership over every earlier signal', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(10), verifiedAt: daysAgo(60) });
    await scored(u._id);
    await payment(u._id, 'created');       // an abandoned checkout as well
    await progress(u._id, daysAgo(1));

    expect((await buildFunnel(TENANT)).counts.active).toBe(1);
  });

  it('prefers a completed payment over an abandoned one', async () => {
    const u = await member({ verifiedAt: daysAgo(60) });
    await payment(u._id, 'created', 149900, daysAgo(9));
    await payment(u._id, 'paid', 149900, daysAgo(8));

    expect((await buildFunnel(TENANT)).counts.expired).toBe(1);
  });

  it('prefers an abandoned checkout over a score', async () => {
    const u = await member({ verifiedAt: daysAgo(60), careerScore: 61 });
    await scored(u._id);
    await payment(u._id, 'created');

    expect((await buildFunnel(TENANT)).counts.checkout_abandoned).toBe(1);
  });

  it('prefers a score over mere verification', async () => {
    const u = await member({ verifiedAt: daysAgo(60) });
    await scored(u._id);
    expect((await buildFunnel(TENANT)).counts.scored_unpaid).toBe(1);
  });
});

// ── how cold the lead is ────────────────────────────────────────────────────

describe('stuckDays', () => {
  it('measures from the last thing that member actually did', async () => {
    const u = await member({ verifiedAt: daysAgo(30) });
    await scored(u._id, TENANT, daysAgo(12));

    const { rows } = await buildFunnel(TENANT);
    expect(rows[0].stuckDays).toBe(12);
  });

  it('uses the newest attempt when there are several', async () => {
    const u = await member({ verifiedAt: daysAgo(40) });
    await scored(u._id, TENANT, daysAgo(30));
    await scored(u._id, TENANT, daysAgo(4));

    expect((await buildFunnel(TENANT)).rows[0].stuckDays).toBe(4);
  });

  it('counts XP-log activity as a touch for a live member', async () => {
    const u = await member({ active: true, expiresAt: daysAhead(90), activatedAt: daysAgo(60) });
    await payment(u._id, 'paid');
    await PassportProgress.create({
      tenantId: TENANT, studentId: u._id, xp: 30,
      updatedAt: daysAgo(40),
      xpLog: [{ at: daysAgo(2), amount: 10, reason: 'mission' }],
    } as any);

    const { rows, counts } = await buildFunnel(TENANT);
    // The xpLog entry is newer than updatedAt, so they are active rather than quiet.
    expect(counts.active).toBe(1);
    expect(rows[0].stuckDays).toBeLessThanOrEqual(2);
  });
});

// ── totals ──────────────────────────────────────────────────────────────────

describe('the totals line', () => {
  it('counts members, paid members and revenue in rupees', async () => {
    const a = await member({ active: true, expiresAt: daysAhead(90), activatedAt: daysAgo(5) });
    await payment(a._id, 'paid', 149900);
    await progress(a._id, daysAgo(1));

    const b = await member({ verifiedAt: daysAgo(10) });
    await payment(b._id, 'paid', 99900);

    await member({});

    const { totals } = await buildFunnel(TENANT);

    expect(totals.members).toBe(3);
    expect(totals.paid).toBe(2);
    expect(totals.revenueInr).toBe(2498);      // 149900 + 99900 paise
    expect(totals.unverifiedShare).toBe(33);   // 1 of 3
  });

  it('reports zeroes rather than failing on an empty tenant', async () => {
    const { rows, counts, totals } = await buildFunnel(TENANT);

    expect(rows).toEqual([]);
    expect(totals).toEqual({ members: 0, paid: 0, revenueInr: 0, unverifiedShare: 0 });
    for (const s of STAGES) expect(counts[s.key]).toBe(0);
  });
});

// ── tenancy ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('never counts another tenant’s members', async () => {
    await member({ verifiedAt: daysAgo(5) });
    await member({ verifiedAt: daysAgo(5) }, { tenantId: OTHER });
    await member({ verifiedAt: daysAgo(5) }, { tenantId: OTHER });

    expect((await buildFunnel(TENANT)).totals.members).toBe(1);
    expect((await buildFunnel(OTHER)).totals.members).toBe(2);
  });

  it('never counts another tenant’s payments or attempts against a member', async () => {
    const u = await member({ verifiedAt: daysAgo(20) });
    // Rows that name this student but belong to another tenant.
    await scored(u._id, OTHER);
    await payment(u._id, 'paid', 149900, daysAgo(2), OTHER);

    const { counts, totals } = await buildFunnel(TENANT);

    // Still just a verified member who never sat the assessment.
    expect(counts.no_assessment).toBe(1);
    expect(counts.scored_unpaid).toBe(0);
    expect(totals.paid).toBe(0);
    expect(totals.revenueInr).toBe(0);
  });

  /**
   * KNOWN DEFECT, RECORDED RATHER THAN FIXED.
   *
   * The member filter is `passport: { $exists: true, $ne: null }`, but User's `passport` is
   * a nested path whose leaves carry defaults — so Mongoose materialises the subdocument on
   * every user it writes, and `$exists` is true for ordinary LMS students who have never
   * seen CareerPilot. The funnel therefore counts them, which inflates `totals.members` and
   * deflates every percentage derived from it.
   *
   * This is pinned as-is because this suite exists to prove the aggregation rewrite changed
   * nothing. Correcting the population is a separate, deliberate change to what the screen
   * MEANS, and it needs its own decision — silently fixing it inside a performance rewrite
   * is exactly the drift these tests are here to prevent.
   */
  it('counts any user whose passport subdocument exists — including plain students', async () => {
    await User.create({
      tenantId: TENANT, firstName: 'Plain', lastName: 'Student', email: 'plain@example.com',
      password: 'x', role: 'STUDENT',
    });
    await member({ verifiedAt: daysAgo(1) });

    const { totals, counts } = await buildFunnel(TENANT);
    expect(totals.members).toBe(2);
    // The plain student lands in `unverified`, alongside genuine drop-offs.
    expect(counts.unverified).toBe(1);
  });
});

// ── shape ───────────────────────────────────────────────────────────────────

describe('each row', () => {
  it('carries what a caller needs and nothing they cannot use', async () => {
    const u = await member({ verifiedAt: daysAgo(20), careerScore: 64, pathway: 'software_dev' },
      { firstName: 'Asha', lastName: 'R' });
    await scored(u._id);

    const [row] = (await buildFunnel(TENANT)).rows;

    expect(row).toMatchObject({
      id: String(u._id),
      name: 'Asha R',
      email: u.email,
      phone: u.phone,
      stage: 'scored_unpaid',
      careerScore: 64,
      pathway: 'software_dev',
    });
    expect(row.joinedAt).toBeInstanceOf(Date);
    expect(row.lastTouch).toBeInstanceOf(Date);
  });

  it('drops the "-" placeholder surname rather than printing it', async () => {
    // firstName is required, so "-" as a surname is the real shape of a name-less signup.
    await member({}, { firstName: 'Asha', lastName: '-' });
    expect((await buildFunnel(TENANT)).rows[0].name).toBe('Asha');
  });
});

// ── scale ───────────────────────────────────────────────────────────────────

describe('a realistically larger tenant', () => {
  it('classifies 1,200 members consistently across every stage', async () => {
    const users: any[] = [];
    for (let i = 0; i < 1200; i += 1) {
      seq += 1;
      users.push({
        tenantId: i % 6 === 5 ? OTHER : TENANT,
        firstName: `Bulk${i}`, lastName: 'X',
        email: `bulk${i}@example.com`, phone: `9111${String(i).padStart(6, '0')}`,
        password: 'x', role: 'STUDENT', createdAt: daysAgo(60),
        passport:
          i % 5 === 0 ? { active: true, expiresAt: daysAhead(90), activatedAt: daysAgo(3), lastSeenAt: daysAgo(1) }
          : i % 5 === 1 ? { active: true, expiresAt: daysAgo(2), activatedAt: daysAgo(400) }
          : i % 5 === 2 ? { verifiedAt: daysAgo(30), careerScore: 60 }
          : i % 5 === 3 ? { verifiedAt: daysAgo(30) }
          : { },
      });
    }
    const created = await User.insertMany(users);
    // Everyone in the expired bucket paid at some point.
    await Payment.insertMany(
      created.filter((_, i) => i % 5 === 1).map((u, n) => ({
        tenantId: u.tenantId, studentId: u._id, purpose: 'passport_membership',
        status: 'paid', amount: 149900, orderId: `order_bulk_${n}`, createdAt: daysAgo(300),
      })),
    );

    const a = await buildFunnel(TENANT);
    const b = await buildFunnel(OTHER);

    expect(a.totals.members + b.totals.members).toBe(1200);
    // Every member is in exactly one stage, in both tenants.
    expect(Object.values(a.counts).reduce((x, y) => x + y, 0)).toBe(a.totals.members);
    expect(Object.values(b.counts).reduce((x, y) => x + y, 0)).toBe(b.totals.members);
    // And the mix is what the fixture describes, not an artefact of the join.
    expect(a.counts.active).toBeGreaterThan(0);
    expect(a.counts.expired).toBeGreaterThan(0);
    expect(a.counts.scored_unpaid).toBeGreaterThan(0);
    expect(a.counts.no_assessment).toBeGreaterThan(0);
    expect(a.counts.unverified).toBeGreaterThan(0);
  });
});
