/**
 * Who a Problem Bank problem may be given to, against a real database.
 *
 * "Available to" (CareerPilot / LMS) is saved with the problem and defaults to both; the bank list
 * filters by tag and product; a problem set refuses a problem not available to the product it is
 * given to; exam pools (LMS) offer and draw LMS problems only; and the super admin can share the
 * CodeBegun library with an institute by tag.
 */
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import CodingProblem from '../../models/CodingProblem';
import { createProblem, listProblems, setStatus, Actor } from '../../services/problemBankService';
import { SAMPLE_PROBLEM } from '../../services/problemImportService';
import { saveSet } from '../../services/problemDeliveryService';
import * as pools from '../../services/questionPoolService';
import { globalPracticeClause, saveGrant, validateGrant } from '../../services/contentGrantService';

const ME: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: '507f1f77bcf86cd799439b01', role: 'TENANT_ADMIN' };
const SUPER: Actor = { userId: '507f1f77bcf86cd799439a09', tenantId: '507f1f77bcf86cd799439b09', role: 'SUPER_ADMIN' };

const make = async (a: Actor, title: string, extra: any = {}) => {
  const r = await createProblem(a, {
    ...SAMPLE_PROBLEM, title, status: 'draft',
    tests: (SAMPLE_PROBLEM.tests || []).map(t => ({ ...t, expectedOutput: t.expectedOutput || '2000000000' })),
    ...extra,
  } as any);
  const id = String(r.problem._id);
  await setStatus(a, id, 'published');
  return id;
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('"Available to" on a problem', () => {
  it('defaults to both products and keeps only known ones', async () => {
    const both = await make(ME, 'Default');
    const lms = await make(ME, 'LMS only', { audiences: ['lms', 'nonsense'] });
    expect((await CodingProblem.findById(both).lean() as any).audiences).toEqual(['lms', 'careerpilot']);
    expect((await CodingProblem.findById(lms).lean() as any).audiences).toEqual(['lms']);
  });

  it('filters the bank list by product and by tag in any case', async () => {
    await make(ME, 'Two Sum', { tags: ['DSA'] });
    await make(ME, 'Exam Q', { tags: ['Exam'], audiences: ['lms'] });
    await make(ME, 'CP only', { tags: ['dsa'], audiences: ['careerpilot'] });
    // A problem written before the field existed counts as both.
    await CodingProblem.updateOne({ title: 'Two Sum' }, { $unset: { audiences: 1 } });
    const titles = async (q: any) => (await listProblems(ME, q)).items.map((p: any) => p.title).sort();
    expect(await titles({ product: 'lms' })).toEqual(['Exam Q', 'Two Sum']);
    expect(await titles({ product: 'careerpilot' })).toEqual(['CP only', 'Two Sum']);
    expect(await titles({ tag: 'DSA' })).toEqual(['CP only', 'Two Sum']);
    expect(await titles({ tag: 'ds' })).toEqual([]);
  });
});

describe('assigning', () => {
  it('refuses a problem set given to a product the problem is not available to', async () => {
    const cpOnly = await make(ME, 'CareerPilot only', { audiences: ['careerpilot'] });
    const lmsOnly = await make(ME, 'LMS only', { audiences: ['lms'] });
    const set = (items: string[], audience: any[]) => saveSet(ME, null, { title: 'Week 1', description: '', kind: 'assignment', items: items.map(problemId => ({ problemId })), audience, allowLate: true, status: 'draft' } as any);
    await expect(set([cpOnly], [{ type: 'all_lms' }])).rejects.toThrow(/"CareerPilot only" is not available to the LMS/);
    await expect(set([lmsOnly], [{ type: 'all_careerpilot' }])).rejects.toThrow(/"LMS only" is not available to CareerPilot/);
    await expect(set([lmsOnly], [{ type: 'all_lms' }])).resolves.toBeTruthy();
    await expect(set([cpOnly], [{ type: 'all_careerpilot' }])).resolves.toBeTruthy();
  });

  it('offers and accepts only LMS problems in an exam pool', async () => {
    const lms = await make(ME, 'For LMS', { audiences: ['lms'] });
    const cp = await make(ME, 'For CareerPilot', { audiences: ['careerpilot'] });
    const pool = await pools.createPool(ME, { name: 'Coding', kind: 'coding' });
    const offered = (await pools.browseBank(ME, pool.id, {})).items.map((r: any) => r.title);
    expect(offered).toEqual(['For LMS']);
    const r = await pools.addQuestions(ME, pool.id, [lms, cp]);
    expect(r.added).toBe(1);
    expect(r.refused[0].reason).toBe('Not available to the LMS');
    // Narrowed later: still listed, but cannot be drawn.
    await CodingProblem.updateOne({ _id: lms }, { $set: { audiences: ['careerpilot'] } });
    expect((await pools.getPool(ME, pool.id)).counts.usable).toBe(0);
  });
});

describe('sharing the CodeBegun library by tag', () => {
  it('shares exactly the global problems with that tag, in any case', async () => {
    await make(SUPER, 'Global DSA', { scope: 'global', tags: ['DSA'] });
    await make(SUPER, 'Global dsa lower', { scope: 'global', tags: ['dsa'] });
    await make(SUPER, 'Global exam', { scope: 'global', tags: ['Exam'] });
    const v = validateGrant({ mode: 'filter', tags: ['DSA'] });
    expect(v.ok).toBe(true);
    await saveGrant(ME.tenantId, 'practice_problems', (v as any).value, { id: SUPER.userId, name: 'Super' });
    const clause = await globalPracticeClause(ME.tenantId);
    const seen = (await CodingProblem.find({ ...clause!, status: 'published' }).lean() as any[]).map(p => p.title).sort();
    expect(seen).toEqual(['Global DSA', 'Global dsa lower']);
  });

  it('refuses an empty filter', () => {
    expect(validateGrant({ mode: 'filter' })).toMatchObject({ ok: false });
    expect(validateGrant({ mode: 'filter', tags: ['DSA'] })).toMatchObject({ ok: true });
  });
});

