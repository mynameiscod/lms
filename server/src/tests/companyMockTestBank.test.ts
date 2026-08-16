/**
 * The company mock test must use the company's own questions.
 *
 * `assembleTest()` was always producing a fully AI-generated paper, because the rows it drew
 * from carried no `options` or `correctIndex` — the schema did not declare them. Nothing
 * failed loudly: `bankedCount: 0` reads exactly like an empty bank, so a company with two
 * hundred curated questions still served a paper written from scratch, and paid for it.
 *
 * These drive the real assembler and the real company-detail handler, and count what came
 * from where.
 */

let questions: any[] = [];
let mockConfig: any = null;

const aiCalls = jest.fn();

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const v = doc[k];
    if (cond && typeof cond === 'object' && '$ne' in cond) return String(v) !== String(cond.$ne);
    return String(v) === String(cond);
  });

/** A find() chain that resolves to rows, however the caller decides to spell it. */
const chain = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.limit = () => h; h.skip = () => h;
  h.populate = () => h;
  h.lean = async () => rows;
  return h;
};

jest.mock('../models/CompanyQuestionModels', () => ({
  __esModule: true,
  Company: { findOne: () => chain({ _id: 'c1', name: 'Acme', slug: 'acme', type: 'product', active: true }) },
  CompanyQuestion: {
    find: (q: any) => chain(questions.filter(d => matches(d, q))),
    aggregate: async () => [],
    countDocuments: async (q: any) => questions.filter(d => matches(d, q)).length,
  },
  CompanyMockConfig: { findOne: () => chain(mockConfig) },
  QuestionTaxonomy: { findOne: () => chain({ tenantId: 't1', categories: [{ key: 'quantitative', label: 'Quantitative & Logical', enabled: true }], rounds: [], difficulties: [], companyTypes: [] }) },
  InterviewPattern: { findOne: () => chain(null) },
  InterviewExperience: {},
}));

/**
 * The generator, counted rather than run.
 *
 * Every call here is real money at a real vendor, which is precisely what the bug was
 * spending: a bank that could have answered the section was invisible, so this ran anyway.
 */
jest.mock('../services/aiGateway', () => ({
  __esModule: true,
  aiComplete: async (opts: any) => {
    aiCalls(opts);
    // Answers the count it was asked for, so a test asserting "three were generated" is
    // asserting the assembler's arithmetic rather than this stub's.
    const want = Number(/Write (\d+) questions/.exec(String(opts.user))?.[1] || 0);
    return JSON.stringify(
      Array.from({ length: want }, (_, i) => ({
        text: `Generated question ${i}`,
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        explanation: 'because',
      })),
    );
  },
}));

import { assembleTest } from '../services/mockTestService';

const banked = (over: any = {}) => ({
  _id: `q${Math.random().toString(36).slice(2, 8)}`,
  tenantId: 't1', companySlug: 'acme', status: 'published',
  category: 'quantitative', difficulty: 'easy',
  questionText: 'Which is larger?',
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 1,
  ...over,
});

const oneSection = (questionCount: number) => ({
  tenantId: 't1', companySlug: 'acme', aiTopUp: true, passingPct: 60,
  sections: [{ name: 'Aptitude', category: 'quantitative', questionCount, durationMins: 10, difficulty: '' }],
});

beforeEach(() => {
  jest.clearAllMocks();
  questions = [];
  mockConfig = oneSection(2);
});

describe('a company that has banked its own questions', () => {
  it('sits a paper made of them, and pays for no generation at all', async () => {
    questions = [banked(), banked()];

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    // Under the old code this was 0 banked, 2 generated — every time.
    expect(built.bankedCount).toBe(2);
    expect(built.generatedCount).toBe(0);
    expect(aiCalls).not.toHaveBeenCalled();

    expect(built.sections[0].questions).toHaveLength(2);
    expect(built.sections[0].questions.every(q => q.generated === false)).toBe(true);
  });

  it('carries the answer key through, so the paper can actually be marked', async () => {
    questions = [banked({ correctIndex: 3, options: ['w', 'x', 'y', 'z'] })];
    mockConfig = oneSection(1);

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.sections[0].questions[0].correctIndex).toBe(3);
    expect(built.sections[0].questions[0].options).toEqual(['w', 'x', 'y', 'z']);
  });

  it('accepts a two-choice question, which the old filter silently discarded', async () => {
    // The filter demanded EXACTLY four options, so every true/false item was dropped.
    questions = [banked({ options: ['True', 'False'], correctIndex: 0 })];
    mockConfig = oneSection(1);

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(1);
    expect(aiCalls).not.toHaveBeenCalled();
  });

  it('tops up from AI only for the shortfall', async () => {
    questions = [banked(), banked()];
    mockConfig = oneSection(5);

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(2);
    expect(built.generatedCount).toBe(3);
    expect(aiCalls).toHaveBeenCalledTimes(1);
    // Asked for three, not five.
    expect(String(aiCalls.mock.calls[0][0].user)).toMatch(/Write 3 questions/);

    // Banked first, generated after, and each labelled for what it is.
    const qs = built.sections[0].questions;
    expect(qs.slice(0, 2).every(q => !q.generated)).toBe(true);
    expect(qs.slice(2).every(q => q.generated)).toBe(true);
  });

  it('still generates the whole section when the bank really is empty', async () => {
    questions = [];

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(0);
    expect(built.generatedCount).toBe(2);
    expect(aiCalls).toHaveBeenCalledTimes(1);
  });
});

describe('rows that cannot be marked', () => {
  it('are left out of the paper rather than served unmarkable', async () => {
    // Two prose questions — a real technical bank, with model answers and no choices.
    questions = [
      banked({ options: [], correctIndex: null, answer: 'Explain the JVM.' }),
      banked({ options: [], correctIndex: null, answer: 'Explain GC.' }),
    ];

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(0);
    // And the section is still filled, so the member gets a test either way.
    expect(built.generatedCount).toBe(2);
  });

  it('exclude a key that points past the last choice', async () => {
    questions = [banked({ options: ['a', 'b'], correctIndex: 7 })];
    mockConfig = oneSection(1);

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(0);
  });

  it('only draw from the company being tested, and only published rows', async () => {
    questions = [
      banked(),
      banked({ companySlug: 'other-co' }),
      banked({ status: 'pending' }),
      banked({ tenantId: 't2' }),
    ];
    mockConfig = oneSection(4);

    const built = await assembleTest({ tenantId: 't1', companySlug: 'acme', companyName: 'Acme' });

    expect(built.bankedCount).toBe(1);
  });
});
