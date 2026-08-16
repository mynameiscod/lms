/**
 * Do the indexes we added actually serve the queries we added them for?
 *
 * An index is a claim about a query plan, and a claim nobody checks is how a collection ends
 * up paying for writes it gets nothing back for. `explain` is the only thing that settles
 * it — a COLLSCAN here means the index is missing, or its key order does not match the sort,
 * or the query shape drifted away from it since.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections, ensureIndexes } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PassportProgress from '../../models/PassportProgress';
import { buildFunnel, funnelCounts, MAX_FUNNEL_ROWS } from '../../services/passportFunnelService';
import { CAREERPILOT_PRODUCT } from '../../services/careerPilotPopulation';

const TENANT = '507f1f77bcf86cd799439cc3';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Walk to the leaf of a winning plan — Mongo nests it differently across versions. */
const leafStage = (plan: any): string => {
  let node = plan?.queryPlanner?.winningPlan ?? plan;
  if (node?.queryPlan) node = node.queryPlan;          // sharded / newer shapes
  while (node?.inputStage) node = node.inputStage;
  return node?.stage;
};
const indexNameOf = (plan: any): string | undefined => {
  let node = plan?.queryPlanner?.winningPlan ?? plan;
  if (node?.queryPlan) node = node.queryPlan;
  while (node) {
    if (node.indexName) return node.indexName;
    node = node.inputStage;
  }
  return undefined;
};

beforeAll(async () => {
  await startMongo();
  await ensureIndexes([User as any, PassportProgress as any]);
});
afterAll(stopMongo);
beforeEach(clearCollections);

describe('the leaderboard index', () => {
  beforeEach(async () => {
    await PassportProgress.insertMany(
      Array.from({ length: 300 }, (_, i) => ({
        tenantId: TENANT,
        studentId: new mongoose.Types.ObjectId(),
        xp: i * 3,
        streak: i % 7,
      })),
    );
  });

  /**
   * The exact shape passportDashboardController uses. If this ever drifts — a different
   * sort field, an extra filter that the index cannot cover — the plan degrades silently
   * and only shows up as a slow screen at scale.
   */
  it('serves the leaderboard query without a collection scan', async () => {
    const plan = await PassportProgress
      .find({ tenantId: TENANT })
      .select('studentId xp streak')
      .sort({ xp: -1 })
      .limit(500)
      .explain('queryPlanner') as any;

    expect(leafStage(plan)).toBe('IXSCAN');
    expect(indexNameOf(plan)).toBe('tenantId_1_xp_-1');
  });

  it('sorts in the index rather than in memory', async () => {
    const plan = await PassportProgress
      .find({ tenantId: TENANT }).sort({ xp: -1 }).limit(500)
      .explain('queryPlanner') as any;

    /**
     * The WINNING plan only. `rejectedPlans` legitimately contains SORT stages — those are
     * the alternatives the planner considered and threw away, and asserting over the whole
     * explain document would fail on the planner doing its job properly.
     *
     * A SORT here is the in-memory sort this index exists to remove, and the thing that
     * would meet MongoDB's sort memory limit on a large tenant.
     */
    const winning = JSON.stringify(plan?.queryPlanner?.winningPlan ?? {});
    expect(winning).not.toContain('"stage":"SORT"');
    expect(winning).toContain('"stage":"IXSCAN"');
  });

  it('still returns the right rows in the right order', async () => {
    const rows = await PassportProgress.find({ tenantId: TENANT })
      .sort({ xp: -1 }).limit(3).lean();

    expect(rows.map(r => r.xp)).toEqual([897, 894, 891]);
  });

  it('does not serve another tenant from the same index', async () => {
    const rows = await PassportProgress.find({ tenantId: '507f1f77bcf86cd799439dd4' }).lean();
    expect(rows).toEqual([]);
  });
});

describe('the funnel reads', () => {
  const seed = async (n: number) => {
    await User.insertMany(
      Array.from({ length: n }, (_, i) => ({
        tenantId: TENANT,
        firstName: `M${i}`, lastName: 'X',
        email: `q${i}@example.com`, phone: `9333${String(i).padStart(6, '0')}`,
        password: 'x', role: 'STUDENT', createdAt: daysAgo(i % 90),
        passport: { active: false, product: CAREERPILOT_PRODUCT, verifiedAt: daysAgo(i % 60) },
      })),
    );
  };

  it('cap the row list while keeping the counts exact', async () => {
    await seed(120);

    const { rows, counts, totals } = await buildFunnel(TENANT, { limit: 25 });

    expect(rows).toHaveLength(25);
    // Counts come from a $group over the whole tenant, not from the returned page.
    expect(counts.no_assessment).toBe(120);
    expect(totals.members).toBe(120);
  });

  it('never exceed the hard ceiling, whatever a caller asks for', async () => {
    await seed(30);
    const { rows } = await buildFunnel(TENANT, { limit: 999_999 });
    expect(rows.length).toBeLessThanOrEqual(MAX_FUNNEL_ROWS);
  });

  it('page through one stage in a stable, coldest-first order', async () => {
    await seed(40);

    const first = await buildFunnel(TENANT, { stage: 'no_assessment', limit: 10 });
    const second = await buildFunnel(TENANT, { stage: 'no_assessment', limit: 10, skip: 10 });

    expect(first.rows).toHaveLength(10);
    expect(second.rows).toHaveLength(10);
    // No overlap between pages, and the coldest lead leads.
    expect(first.rows.map(r => r.id)).not.toEqual(expect.arrayContaining(second.rows.map(r => r.id)));
    expect(first.rows[0].stuckDays).toBeGreaterThanOrEqual(first.rows[9].stuckDays);
  });

  it('return only the requested stage', async () => {
    await seed(20);
    await User.create({
      tenantId: TENANT, firstName: 'New', lastName: 'Signup',
      email: 'new@example.com', phone: '9444000000', password: 'x', role: 'STUDENT',
      // Carries the enrolment marker, as a real signup does — without it this is an
      // ordinary LMS student and correctly not in the funnel at all.
      passport: { active: false, product: CAREERPILOT_PRODUCT },
    });

    const { rows } = await buildFunnel(TENANT, { stage: 'unverified', limit: 50 });

    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('new@example.com');
  });

  it('load no member rows at all for the board', async () => {
    await seed(50);

    const board: any = await funnelCounts(TENANT);

    expect(board.counts.no_assessment).toBe(50);
    expect(board.totals.members).toBe(50);
    // The board shows no names, so it must not be carrying fifty of them around.
    expect(board.rows).toBeUndefined();
  });
});
