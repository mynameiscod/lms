/**
 * Global and college ranks, against a real database.
 *
 * Global: every CareerPilot member in every tenant, by XP, for everybody — no opt-in.
 * College: the members of the student's own tenant, only when that tenant is a college.
 * Both count every registered member (0 XP included), and neither counts staff or plain LMS users.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import PassportProgress from '../../models/PassportProgress';
import { getLeaderboard, rankSummary } from '../../services/leaderboardService';

let college: string;
let institute: string;
let seq = 0;

const member = async (tenantId: string, first: string, xp: number, extra: any = {}) => {
  seq += 1;
  const u = await User.create({
    tenantId, firstName: first, lastName: 'Kumar', email: `m${seq}@example.com`, password: 'x'.repeat(20),
    role: 'STUDENT', isActive: true, passport: { product: 'career_passport', active: true }, ...extra,
  } as any);
  if (xp > 0) await PassportProgress.create({ tenantId, studentId: u._id, xp } as any);
  return String(u._id);
};

beforeAll(startMongo);
afterAll(stopMongo);

beforeEach(async () => {
  await clearCollections();
  const c = await Tenant.create({ name: 'Sri Vidya College', slug: 'svc', domain: 'svc.test', type: 'college', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  const i = await Tenant.create({ name: 'CodeBegun', slug: 'cb', domain: 'cb.test', type: 'institute', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  college = String(c._id);
  institute = String(i._id);
});

describe('leaderboard ranks', () => {
  it('ranks every CareerPilot member of every tenant on the global board, with no opt-in', async () => {
    const asha = await member(college, 'Asha', 300);
    const ravi = await member(institute, 'Ravi', 500);
    await member(college, 'Meena', 100);
    const zero = await member(institute, 'Nikhil', 0);
    // Not counted: an admin with XP, and a plain LMS student who never joined CareerPilot.
    await member(institute, 'Admin', 900, { role: 'TENANT_ADMIN' });
    await member(college, 'Plain', 800, { passport: {} });

    const g = await getLeaderboard({ tenantId: college, studentId: asha, scope: 'GLOBAL', period: 'ALL_TIME' });
    if (!g.available) throw new Error('global should be available');
    expect(g.participantCount).toBe(4);
    expect(g.entries.map(e => e.xp)).toEqual([500, 300, 100]);
    expect(g.myRank).toBe(2);
    // Another institution's member shows as first name and initial; a classmate keeps the full name.
    expect(g.entries[0]).toMatchObject({ studentId: ravi, name: 'Ravi K.' });
    expect(g.entries[1]).toMatchObject({ name: 'Asha Kumar', college: 'Sri Vidya College', me: true });

    // A member with no XP yet is still ranked — last, not missing.
    const z = await getLeaderboard({ tenantId: institute, studentId: zero, scope: 'GLOBAL', period: 'ALL_TIME' });
    expect(z.available && z.myRank).toBe(4);
  });

  it('gives a college rank only in a college tenant', async () => {
    const asha = await member(college, 'Asha', 300);
    await member(college, 'Meena', 400);
    await member(institute, 'Ravi', 999);
    const ravi = await member(institute, 'Sita', 10);

    const c = await getLeaderboard({ tenantId: college, studentId: asha, scope: 'COLLEGE', period: 'ALL_TIME' });
    if (!c.available) throw new Error('college should be available');
    expect(c.participantCount).toBe(2);
    expect(c.myRank).toBe(2);

    const none = await getLeaderboard({ tenantId: institute, studentId: ravi, scope: 'COLLEGE', period: 'ALL_TIME' });
    expect(none.available).toBe(false);

    const summary = await rankSummary(institute, ravi);
    expect(Object.keys(summary).sort()).toEqual(['college', 'global']);
    expect(summary.college.available).toBe(false);
    expect(summary.global).toMatchObject({ available: true, rank: 4, participants: 4 });
  });

  it('gives an admin looking at the board no rank of their own', async () => {
    await member(college, 'Asha', 300);
    const admin = await member(college, 'Boss', 0, { role: 'TENANT_ADMIN' });
    const g = await getLeaderboard({ tenantId: college, studentId: admin, scope: 'GLOBAL', period: 'ALL_TIME' });
    expect(g.available && g.myRank).toBeNull();
  });

  it('refuses the removed district and state ranks', async () => {
    const asha = await member(college, 'Asha', 300);
    const d = await getLeaderboard({ tenantId: college, studentId: asha, scope: 'DISTRICT' as any, period: 'ALL_TIME' });
    expect(d.available).toBe(false);
  });
});
