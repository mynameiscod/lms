/**
 * The practice library: every published Problem Bank problem a CareerPilot member may choose to
 * solve. Real database and real routes; only the judge and the coin ledger are stood in for.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'problem-library-integration-test-secret-0123456789abcdef';

const judgeMock = jest.fn();
const customMock = jest.fn();
jest.mock('../../services/problemJudgeService', () => ({
  ...jest.requireActual('../../services/problemJudgeService'),
  judge: (...a: any[]) => judgeMock(...a),
  runCustom: (...a: any[]) => customMock(...a),
}));
const coins = jest.fn(async () => ({}));
jest.mock('../../services/coinService', () => ({ ...jest.requireActual('../../services/coinService'), awardCoins: (...a: any[]) => (coins as any)(...a) }));

import User from '../../models/User';
import Tenant from '../../models/Tenant';
import CodingProblem, { CodingProblemTestCase } from '../../models/CodingProblem';
import ProblemSubmission from '../../models/ProblemSubmission';
import PassportProgress from '../../models/PassportProgress';
import codingPracticeRoutes from '../../routes/codingPracticeRoutes';
import { __clearLibraryCache, memberLibraryStats } from '../../services/problemLibraryService';
import { __resetRateLimits } from '../../middleware/rateLimit';

const app = express();
app.use(express.json());
app.use('/coding-practice', codingPracticeRoutes);

let T: any; let O: any;
const tokens: Record<string, string> = {}; const ids: Record<string, string> = {};
const tok = (u: any, tenantId: any) => jwt.sign({ id: String(u._id), email: u.email, role: u.role, tenantId: String(tenantId) }, process.env.JWT_SECRET as string);
const get = (path: string, who: string) => (request(app) as any).get(path).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', String(T._id));
const post = (path: string, who: string, body: any = {}) => (request(app) as any).post(path).set('Authorization', `Bearer ${tokens[who]}`).set('X-Tenant-Id', String(T._id)).send(body);

let n = 0;
/** A library problem: tagged DSA unless `dsa: false`, since only DSA problems are in the library. */
const problem = async ({ dsa = true, ...o }: any = {}) => {
  n++;
  o.tags = [...(o.tags || []), ...(dsa ? ['DSA'] : [])];
  const p: any = await CodingProblem.create({
    scope: 'tenant', tenantId: String(T._id), number: n, slug: `p-${n}`, title: `Problem ${n}`, statement: 'Add two numbers.', difficulty: 'easy', status: 'published', marks: 20,
    topics: ['arrays'], tags: [], companies: [], languages: [{ language: 'python', starterCode: 'def solve():\n  pass', headerCode: 'SECRET_HEADER', footerCode: 'SECRET_FOOTER', solutionCode: 'SECRET_SOLUTION' }],
    editorial: 'The worked answer.', hints: ['think'], ...o,
  });
  await CodingProblemTestCase.create([
    { problemId: p._id, order: 1, input: '1 2', expectedOutput: '3', isSample: true, weight: 1, explanation: 'one plus two' },
    { problemId: p._id, order: 2, input: '40 2', expectedOutput: 'HIDDEN_EXPECTED', isSample: false, weight: 1 },
  ]);
  return p;
};
const verdict = (v: string, extra: any = {}) => ({ verdict: v, passed: v === 'AC' ? 2 : 1, total: 2, score: v === 'AC' ? 20 : 10, maxScore: 20, timeMs: 12, cases: [{ verdict: v, timeMs: 12, weight: 1, isSample: true }], ...extra });

beforeAll(async () => { await startMongo(); });
afterAll(async () => { await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  __clearLibraryCache(); __resetRateLimits(); judgeMock.mockReset(); customMock.mockReset(); coins.mockClear(); n = 0;
  T = await Tenant.create({ name: 'Lib', slug: 'lib', domain: 'lib.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  O = await Tenant.create({ name: 'Other', slug: 'other', domain: 'other.test', isActive: true, adminId: new mongoose.Types.ObjectId() } as any);
  const mk = async (who: string, role: string, extra: any = {}) => {
    const u: any = await User.create({ tenantId: T._id, firstName: who, lastName: 'T', email: `${who}@lib.test`, password: 'x', role, isActive: true, ...extra });
    ids[who] = String(u._id); tokens[who] = tok(u, T._id);
  };
  await mk('member', 'STUDENT', { passport: { active: true, product: 'careerpilot' } });
  await mk('member2', 'STUDENT', { passport: { active: true, product: 'careerpilot' } });
  await mk('lms', 'STUDENT');
  await mk('admin', 'TENANT_ADMIN');
});

describe('who can use the library, and what they can see', () => {
  it('is for CareerPilot members (and staff, to preview), not for LMS-only students', async () => {
    await problem();
    expect((await get('/coding-practice/library', 'member')).status).toBe(200);
    expect((await get('/coding-practice/library', 'admin')).status).toBe(200);
    const lms = await get('/coding-practice/library', 'lms');
    expect(lms.status).toBe(403); expect(lms.body.message).toMatch(/CareerPilot members/);
    expect((await get('/coding-practice/library/facets', 'lms')).status).toBe(403);
  });

  it('shows every published problem of the institute and the CodeBegun library, and nothing else', async () => {
    await problem({ title: 'Mine, published' });
    await problem({ title: 'A draft', status: 'draft' });
    await problem({ title: 'Archived', status: 'archived' });
    await problem({ title: 'Another institute', tenantId: String(O._id) });
    await problem({ title: 'CodeBegun library', scope: 'global', tenantId: null });
    await problem({ title: 'CodeBegun draft', scope: 'global', tenantId: null, status: 'draft' });
    const r = await get('/coding-practice/library?limit=100', 'member');
    expect(r.body.data.rows.map((x: any) => x.title).sort()).toEqual(['CodeBegun library', 'Mine, published']);
    expect(r.body.data.total).toBe(2);
    const one = await get(`/coding-practice/library/${(await CodingProblem.findOne({ title: 'A draft' }))!._id}`, 'member');
    expect(one.status).toBe(404);
    const other = await get(`/coding-practice/library/${(await CodingProblem.findOne({ title: 'Another institute' }))!._id}`, 'member');
    expect(other.status).toBe(404);
    expect((await get('/coding-practice/library/not-an-id', 'member')).status).toBe(404);
  });

  it('lists only problems tagged DSA (any case) that are available to CareerPilot', async () => {
    await problem({ title: 'Tagged DSA' });
    await problem({ title: 'Tagged dsa', dsa: false, tags: ['dsa'] });
    await problem({ title: 'Exam question', dsa: false, tags: ['Exam'] });
    await problem({ title: 'LMS only', audiences: ['lms'] });
    await problem({ title: 'Both products', audiences: ['lms', 'careerpilot'] });
    const r = await get('/coding-practice/library?limit=100', 'member');
    expect(r.body.data.rows.map((x: any) => x.title).sort()).toEqual(['Both products', 'Tagged DSA', 'Tagged dsa']);
    const exam = await CodingProblem.findOne({ title: 'Exam question' });
    expect((await get(`/coding-practice/library/${exam!._id}`, 'member')).status).toBe(404);
    expect((await post(`/coding-practice/library/${exam!._id}/run`, 'member', { language: 'python', code: 'x' })).status).toBe(404);
  });
});

describe('finding a problem', () => {
  beforeEach(async () => {
    await problem({ title: 'Two Sum', difficulty: 'easy', topics: ['arrays', 'hashing'], companies: ['Google'], tags: ['classic'] });
    await problem({ title: 'Reverse a Linked List', difficulty: 'medium', topics: ['linked list'], companies: ['Amazon'], languages: [{ language: 'java', starterCode: '', headerCode: '', footerCode: '', solutionCode: '' }] });
    await problem({ title: 'Median of Two Sorted Arrays', difficulty: 'hard', topics: ['arrays', 'binary search'], companies: ['Google', 'Amazon'] });
    await problem({ title: 'Valid Parentheses', difficulty: 'easy', topics: ['stack'] });
  });
  const titles = (r: any) => r.body.data.rows.map((x: any) => x.title);

  it('filters by difficulty, topic, company and language', async () => {
    expect(titles(await get('/coding-practice/library?difficulty=easy', 'member'))).toEqual(['Two Sum', 'Valid Parentheses']);
    expect(titles(await get('/coding-practice/library?difficulty=easy,hard', 'member')).length).toBe(3);
    expect(titles(await get('/coding-practice/library?topic=arrays', 'member'))).toEqual(['Two Sum', 'Median of Two Sorted Arrays']);
    expect(titles(await get('/coding-practice/library?company=Amazon', 'member'))).toEqual(['Reverse a Linked List', 'Median of Two Sorted Arrays']);
    expect(titles(await get('/coding-practice/library?language=java', 'member'))).toEqual(['Reverse a Linked List']);
    expect(titles(await get('/coding-practice/library?topic=arrays&difficulty=hard&company=Google', 'member'))).toEqual(['Median of Two Sorted Arrays']);
  });

  it('searches titles, topics, tags and problem numbers, and ignores regex characters', async () => {
    expect(titles(await get('/coding-practice/library?q=two', 'member')).sort()).toEqual(['Median of Two Sorted Arrays', 'Two Sum']);
    expect(titles(await get('/coding-practice/library?q=stack', 'member'))).toEqual(['Valid Parentheses']);
    expect(titles(await get('/coding-practice/library?q=classic', 'member'))).toEqual(['Two Sum']);
    expect(titles(await get('/coding-practice/library?q=%234', 'member'))).toEqual(['Valid Parentheses']);
    expect(titles(await get('/coding-practice/library?q=.*', 'member'))).toEqual([]);
    expect(titles(await get('/coding-practice/library?q=(', 'member'))).toEqual([]);
  });

  it('sorts and pages', async () => {
    const first = await get('/coding-practice/library?limit=3&page=1', 'member');
    expect(first.body.data).toMatchObject({ total: 4, page: 1, limit: 3, pages: 2 });
    expect(titles(first)).toEqual(['Two Sum', 'Reverse a Linked List', 'Median of Two Sorted Arrays']);
    expect(titles(await get('/coding-practice/library?limit=3&page=2', 'member'))).toEqual(['Valid Parentheses']);
    expect(titles(await get('/coding-practice/library?sort=easiest', 'member'))).toEqual(['Two Sum', 'Valid Parentheses', 'Reverse a Linked List', 'Median of Two Sorted Arrays']);
    expect(titles(await get('/coding-practice/library?sort=hardest', 'member'))[0]).toBe('Median of Two Sorted Arrays');
    expect((await get('/coding-practice/library?limit=100000', 'member')).body.data.limit).toBe(100);
    expect((await get('/coding-practice/library?page=-4&limit=abc', 'member')).body.data).toMatchObject({ page: 1, limit: 25 });
  });

  it('lists the filter choices with their counts', async () => {
    const f = (await get('/coding-practice/library/facets', 'member')).body.data;
    expect(f.total).toBe(4);
    expect(f.difficulties).toEqual({ easy: 2, medium: 1, hard: 1 });
    expect(f.topics.find((t: any) => t.name === 'arrays')).toEqual({ name: 'arrays', count: 2 });
    expect(f.companies.map((c: any) => c.name).sort()).toEqual(['Amazon', 'Google']);
    expect(f.languages.find((l: any) => l.name === 'python').count).toBe(3);
  });
});

describe('opening a problem', () => {
  it('sends the statement, the examples and starter code, and never a hidden test or a solution', async () => {
    const p = await problem({ difficulty: 'medium' });
    const r = await get(`/coding-practice/library/${p._id}`, 'member');
    expect(r.status).toBe(200);
    const text = JSON.stringify(r.body);
    for (const secret of ['SECRET_SOLUTION', 'SECRET_HEADER', 'SECRET_FOOTER', 'HIDDEN_EXPECTED', '40 2']) expect(text).not.toContain(secret);
    expect(r.body.data.samples).toEqual([expect.objectContaining({ input: '1 2', expectedOutput: '3', explanation: 'one plus two' })]);
    expect(r.body.data.languages).toEqual([{ language: 'python', starterCode: 'def solve():\n  pass' }]);
    expect(r.body.data.editorial).toBe('');
    expect(r.body.data.hints).toEqual(['think']);
  });

  it('links to the previous and next problem', async () => {
    const a = await problem(); const b = await problem(); const c = await problem();
    const r = (await get(`/coding-practice/library/${b._id}`, 'member')).body.data;
    expect(r.set).toMatchObject({ prevId: String(a._id), nextId: String(c._id), position: 2, count: 3 });
    expect((await get(`/coding-practice/library/${a._id}`, 'member')).body.data.set.prevId).toBeNull();
  });
});

describe('solving', () => {
  it('checks the examples on Run without recording anything', async () => {
    const p = await problem();
    judgeMock.mockResolvedValue(verdict('AC'));
    const r = await post(`/coding-practice/library/${p._id}/run`, 'member', { language: 'python', code: 'print(3)', mode: 'samples' });
    expect([r.status, r.body.data.result.verdict]).toEqual([200, 'AC']);
    const tests = judgeMock.mock.calls[0][3];
    expect(tests).toHaveLength(1); expect(tests[0].expectedOutput).toBe('3');
    expect(await ProblemSubmission.countDocuments({})).toBe(0);
    customMock.mockResolvedValue({ verdict: 'OK', output: '7', error: '', timeMs: 3 });
    const c = await post(`/coding-practice/library/${p._id}/run`, 'member', { language: 'python', code: 'print(7)', mode: 'custom', stdin: '5' });
    expect(c.body.data.custom.output).toBe('7');
  });

  it('judges every test on Submit, records it, and pays the first solve once', async () => {
    const p = await problem({ difficulty: 'medium' });
    judgeMock.mockResolvedValue(verdict('WA'));
    const wrong = (await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'x' })).body.data;
    expect([wrong.recorded, wrong.firstAccept, wrong.reward]).toEqual([true, false, null]);
    expect(judgeMock.mock.calls[0][3]).toHaveLength(2);
    judgeMock.mockResolvedValue(verdict('AC'));
    const first = (await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'y' })).body.data;
    expect([first.firstAccept, first.reward]).toEqual([true, { xp: 20 }]);
    const again = (await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'y' })).body.data;
    expect([again.firstAccept, again.reward]).toEqual([false, null]);
    expect(coins).toHaveBeenCalledTimes(1);
    const prog: any = await PassportProgress.findOne({ studentId: ids.member }).lean();
    expect(prog.xp).toBe(20);
    const subs = await ProblemSubmission.find({ userId: ids.member }).lean() as any[];
    expect(subs).toHaveLength(3);
    expect(subs[0].context).toMatchObject({ product: 'careerpilot', refType: 'practice-library' });
    expect(subs[0].context.setId).toBeUndefined();
    expect(subs.every((s) => !('cases' in s) || s.cases.every((c: any) => !('input' in c)))).toBe(true);
    const stats: any = await CodingProblem.findById(p._id).lean();
    expect(stats.stats).toEqual({ attempts: 3, accepted: 1 });
  });

  it('does not count a busy judge as an attempt', async () => {
    const p = await problem();
    judgeMock.mockResolvedValue(verdict('BUSY'));
    const r = (await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'x' })).body.data;
    expect(r.recorded).toBe(false);
    expect(await ProblemSubmission.countDocuments({})).toBe(0);
  });

  it('rejects a language the problem does not allow, and code that is too long', async () => {
    const p = await problem();
    expect((await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'cobol', code: 'x' })).status).toBe(400);
    expect((await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'x'.repeat(100_001) })).status).toBe(400);
  });

  it('shows the worked answer only after the member has solved it, and keeps staff submissions out of the rewards', async () => {
    const p = await problem();
    judgeMock.mockResolvedValue(verdict('AC'));
    await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'y' });
    expect((await get(`/coding-practice/library/${p._id}`, 'member')).body.data.editorial).toBe('The worked answer.');
    expect((await get(`/coding-practice/library/${p._id}`, 'member2')).body.data.editorial).toBe('');
    const staff = (await post(`/coding-practice/library/${p._id}/submit`, 'admin', { language: 'python', code: 'y' })).body.data;
    expect(staff.reward).toBeNull();
    expect(coins).toHaveBeenCalledTimes(1);
  });
});

describe('20 runs a minute', () => {
  it('limits Run and Submit together, per member', async () => {
    const p = await problem();
    judgeMock.mockResolvedValue(verdict('WA'));
    for (let i = 0; i < 10; i++) expect((await post(`/coding-practice/library/${p._id}/run`, 'member', { language: 'python', code: 'x', mode: 'samples' })).status).toBe(200);
    for (let i = 0; i < 10; i++) expect((await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'x' })).status).toBe(200);
    const over = await post(`/coding-practice/library/${p._id}/run`, 'member', { language: 'python', code: 'x', mode: 'samples' });
    expect(over.status).toBe(429);
    expect(over.body.message).toMatch(/20 runs a minute/);
    expect(over.headers['retry-after']).toBeDefined();
    expect((await post(`/coding-practice/library/${p._id}/submit`, 'member', { language: 'python', code: 'x' })).status).toBe(429);
    // Someone else is not held up by it.
    expect((await post(`/coding-practice/library/${p._id}/run`, 'member2', { language: 'python', code: 'x', mode: 'samples' })).status).toBe(200);
  });
});

describe('progress', () => {
  it('tracks solved, attempted and not started, and says what to do next', async () => {
    const e1 = await problem({ title: 'E1', difficulty: 'easy' });
    const e2 = await problem({ title: 'E2', difficulty: 'easy' });
    const m1 = await problem({ title: 'M1', difficulty: 'medium' });
    await problem({ title: 'H1', difficulty: 'hard' });
    judgeMock.mockResolvedValueOnce(verdict('AC')); await post(`/coding-practice/library/${e1._id}/submit`, 'member', { language: 'python', code: 'a' });
    judgeMock.mockResolvedValueOnce(verdict('WA')); await post(`/coding-practice/library/${m1._id}/submit`, 'member', { language: 'python', code: 'a' });
    const all = (await get('/coding-practice/library', 'member')).body.data;
    expect(Object.fromEntries(all.rows.map((r: any) => [r.title, r.status]))).toEqual({ E1: 'solved', E2: 'todo', M1: 'attempted', H1: 'todo' });
    expect(all.progress).toEqual({ solved: 1, total: 4, byDifficulty: { easy: { solved: 1, total: 2 }, medium: { solved: 0, total: 1 }, hard: { solved: 0, total: 1 } } });
    expect(all.next).toMatchObject({ title: 'E2', difficulty: 'easy' });
    const names = async (s: string) => (await get(`/coding-practice/library?status=${s}`, 'member')).body.data.rows.map((r: any) => r.title);
    expect(await names('solved')).toEqual(['E1']);
    expect(await names('attempted')).toEqual(['M1']);
    expect((await names('todo')).sort()).toEqual(['E2', 'H1']);
    // Another member's work is not mine.
    expect((await get('/coding-practice/library', 'member2')).body.data.progress.solved).toBe(0);
    judgeMock.mockResolvedValueOnce(verdict('AC')); await post(`/coding-practice/library/${e2._id}/submit`, 'member', { language: 'python', code: 'a' });
    expect((await get('/coding-practice/library', 'member')).body.data.next).toMatchObject({ title: 'M1' });
    expect(await memberLibraryStats(String(T._id), ids.member)).toEqual({ solved: 2, total: 4 });
  });
});
