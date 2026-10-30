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
import { createProblem, listProblems, setStatus, updateProblem, bulkSetAudience, Actor } from '../../services/problemBankService';
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
  it('starts a new problem as not assigned, and keeps only known products', async () => {
    const none = await make(ME, 'Default');
    const lms = await make(ME, 'LMS only', { audiences: ['lms', 'nonsense'] });
    expect((await CodingProblem.findById(none).lean() as any).audiences).toEqual([]);
    expect((await CodingProblem.findById(lms).lean() as any).audiences).toEqual(['lms']);
  });

  it('keeps the setting when an edit does not send it', async () => {
    const id = await make(ME, 'Kept', { audiences: ['careerpilot'] });
    const { audiences, ...rest } = (await CodingProblem.findById(id).lean()) as any;
    await updateProblem(ME, id, { ...SAMPLE_PROBLEM, title: 'Kept, renamed', tests: (SAMPLE_PROBLEM.tests || []).map(t => ({ ...t, expectedOutput: t.expectedOutput || '2000000000' })) } as any);
    expect((await CodingProblem.findById(id).lean() as any).audiences).toEqual(['careerpilot']);
    expect(rest.title).toBe('Kept');
  });

  it('filters the bank list by product, by "not assigned" and by tag in any case', async () => {
    await make(ME, 'Two Sum', { tags: ['DSA'] });
    await make(ME, 'Exam Q', { tags: ['Exam'], audiences: ['lms'] });
    await make(ME, 'CP only', { tags: ['dsa'], audiences: ['careerpilot'] });
    await make(ME, 'Older');
    // A problem written before the field existed reads as LMS only.
    await CodingProblem.updateOne({ title: 'Older' }, { $unset: { audiences: 1 } });
    const titles = async (q: any) => (await listProblems(ME, q)).items.map((p: any) => p.title).sort();
    expect(await titles({ product: 'lms' })).toEqual(['Exam Q', 'Older']);
    expect(await titles({ product: 'careerpilot' })).toEqual(['CP only']);
    expect(await titles({ product: 'none' })).toEqual(['Two Sum']);
    expect(await titles({ tag: 'DSA' })).toEqual(['CP only', 'Two Sum']);
    expect(await titles({ tag: 'ds' })).toEqual([]);
  });
});

describe('giving problems to a product in bulk', () => {
  const read = async (title: string) => ((await CodingProblem.findOne({ title }).lean()) as any).audiences;

  it('adds and removes a product for ticked problems, keeping what each already had', async () => {
    const a = await make(ME, 'Arrays 1', { audiences: ['lms'] });
    const b = await make(ME, 'Arrays 2');
    const r = await bulkSetAudience(ME, { ids: [a, b], product: 'careerpilot', on: true });
    expect(r).toMatchObject({ matched: 2, changed: 2, skipped: 0 });
    expect([...(await read('Arrays 1'))].sort()).toEqual(['careerpilot', 'lms']);
    expect(await read('Arrays 2')).toEqual(['careerpilot']);
    await bulkSetAudience(ME, { ids: [a], product: 'lms', on: false });
    expect(await read('Arrays 1')).toEqual(['careerpilot']);
  });

  it('reaches every problem the filters match, and an older problem keeps its LMS use', async () => {
    for (let i = 0; i < 3; i++) await make(ME, `Legacy ${i}`, { tags: ['Arrays'] });
    await make(ME, 'Untouched', { tags: ['Strings'] });
    await CodingProblem.updateMany({ title: /^Legacy/ }, { $unset: { audiences: 1 } });
    const r = await bulkSetAudience(ME, { filter: { tag: 'arrays' }, product: 'careerpilot', on: true });
    expect(r.matched).toBe(3);
    for (let i = 0; i < 3; i++) expect([...(await read(`Legacy ${i}`))].sort()).toEqual(['careerpilot', 'lms']);
    expect(await read('Untouched')).toEqual([]);
  });

  it("never changes another institute's problems or, for an institute admin, the CodeBegun library", async () => {
    const OTHER: Actor = { userId: '507f1f77bcf86cd799439a02', tenantId: '507f1f77bcf86cd799439b02', role: 'TENANT_ADMIN' };
    const theirs = await make(OTHER, 'Theirs');
    const global = await make(SUPER, 'Global', { scope: 'global' });
    const mine = await make(ME, 'Mine');
    const r = await bulkSetAudience(ME, { ids: [theirs, global, mine], product: 'careerpilot', on: true });
    expect(r).toMatchObject({ matched: 1, changed: 1, skipped: 2 });
    expect(await read('Theirs')).toEqual([]);
    expect(await read('Global')).toEqual([]);
    // The super admin may assign the shared library.
    expect((await bulkSetAudience(SUPER, { ids: [global], product: 'careerpilot', on: true })).changed).toBe(1);
  });

  it('refuses a request with no product or no problems', async () => {
    await expect(bulkSetAudience(ME, { ids: ['x'], product: 'nope' })).rejects.toThrow(/CareerPilot or LMS/);
    await expect(bulkSetAudience(ME, { product: 'lms' })).rejects.toThrow(/Select problems/);
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

