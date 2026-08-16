/**
 * What a company mock test pays, and what it must never do.
 *
 * It pays XP through Module 11, once per attempt, for SITTING it rather than for scoring
 * well — paying for marks would reward retaking an easy company over practising a hard one.
 * A double-tapped submit, a retried request or a refreshed results page must not pay twice.
 *
 * And it writes NO skill evidence. Company questions carry a taxonomy category rather than a
 * canonical skill key, and most of them are AI-generated practice; admitting them to Skill
 * DNA would mix unmapped, ungraded items into the one number the whole product is built on.
 * That decision is enforced here rather than left as a comment.
 */

const TENANT = 't1';
const STUDENT = '507f1f77bcf86cd799439011';

let attempts: any[] = [];

const xpCalls = jest.fn();
const evidenceWrites = jest.fn();
const skillProfileWrites = jest.fn();
/** Every idempotency key the XP ledger has accepted. Stands in for its unique index. */
let ledger = new Set<string>();

const chain = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.limit = () => h; h.lean = async () => rows;
  return h;
};

const attemptDoc = (over: any = {}) => {
  const doc: any = {
    _id: 'a1', tenantId: TENANT, studentId: STUDENT,
    companySlug: 'acme', companyName: 'Acme',
    companyProfileVersion: 3,
    status: 'in_progress',
    passingPct: 60,
    totalQuestions: 2,
    endsAt: new Date(Date.now() + 600_000),
    sections: [{
      name: 'Aptitude', category: 'quantitative', durationMins: 10,
      questions: [
        { id: 'q1', text: 'One?', options: ['a', 'b'], correctIndex: 0, category: 'quantitative', difficulty: 'easy', generated: false },
        { id: 'q2', text: 'Two?', options: ['a', 'b'], correctIndex: 1, category: 'quantitative', difficulty: 'easy', generated: true },
      ],
    }],
    answers: [{ questionId: 'q1', chosen: 0 }, { questionId: 'q2', chosen: 1 }],
    ...over,
  };
  doc.save = async () => doc;
  return doc;
};

jest.mock('../models/MockTestAttempt', () => ({
  __esModule: true,
  default: {
    findOne: async (q: any) => attempts.find(a => String(a._id) === String(q._id)) || null,
    find: () => chain([]),
    countDocuments: async () => 0,
    create: async (d: any) => { const doc = attemptDoc(d); attempts.push(doc); return doc; },
  },
}));

jest.mock('../models/User', () => ({
  __esModule: true, default: { findById: () => chain({ _id: STUDENT, passport: { primaryRole: 'BACKEND_ENGINEER' } }) },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true, default: { findOne: () => chain({ tenantId: TENANT }) },
}));
jest.mock('../services/passportEntitlementService', () => ({ __esModule: true, isEntitled: () => true }));
jest.mock('../models/CompanyQuestionModels', () => ({
  __esModule: true,
  Company: { findOne: () => chain({ _id: 'c1', slug: 'acme', name: 'Acme', active: true }) },
  CompanyMockConfig: { findOne: () => chain({ maxAttempts: 2, passingPct: 60 }) },
}));
jest.mock('../services/companyReadinessService', () => ({
  __esModule: true, readinessFor: async () => ({ ready: true }),
}));
jest.mock('../services/mockTestService', () => ({
  __esModule: true,
  assembleTest: async () => ({
    sections: [{ name: 'Aptitude', category: 'quantitative', durationMins: 10, questions: [
      { id: 'q1', text: 'One?', options: ['a', 'b'], correctIndex: 0, category: 'quantitative', difficulty: 'easy', generated: false },
    ] }],
    generatedCount: 0, bankedCount: 1, passingPct: 60,
  }),
}));
jest.mock('../services/companyFitService', () => ({
  __esModule: true, resolveCompanyProfile: async () => ({ profile: { version: 3 }, matched: true }),
}));
jest.mock('../services/careerContextService', () => ({
  __esModule: true, getCareerContext: async () => ({ career: { primaryRole: 'BACKEND_ENGINEER' } }),
}));

jest.mock('../services/gamificationEngine', () => ({
  __esModule: true,
  processGamificationEvent: async (e: any) => {
    xpCalls(e);
    const key = `${e.eventKey}:${e.sourceType}:${e.sourceId}`;
    // The real guarantee is the ledger's unique index. This is that index.
    if (ledger.has(key)) return { awarded: 0, refused: 'duplicate', xpTotal: 40, streak: 1, longestStreak: 1, badges: [] };
    ledger.add(key);
    return { awarded: 40, xpTotal: 40, streak: 1, longestStreak: 1, badges: [] };
  },
}));

/** Skill DNA, watched. Nothing in this flow may write a single row. */
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: {
    bulkWrite: (...a: any[]) => { evidenceWrites(...a); return Promise.resolve({ upsertedCount: 0 }); },
    create: (...a: any[]) => { evidenceWrites(...a); return Promise.resolve(null); },
    insertMany: (...a: any[]) => { evidenceWrites(...a); return Promise.resolve([]); },
  },
}));
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    find: () => chain([]),
    updateOne: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
    bulkWrite: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
  },
}));

import { submitMockTest, startMockTest } from '../controllers/mockTestController';

const mkRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const mkReq = (over: any = {}) => ({
  params: {}, body: {}, query: {}, user: { id: STUDENT, tenantId: TENANT }, ...over,
} as any);

const submit = async (id = 'a1') => {
  const res = mkRes();
  await submitMockTest(mkReq({ params: { id } }), res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  attempts = [attemptDoc()];
  ledger = new Set();
});

describe('submitting a company mock test', () => {
  it('pays XP once, through Module 11', async () => {
    const res = await submit();

    expect(res.body.result.score).toBe(100);
    expect(res.body.xpAwarded).toBe(40);
    expect(xpCalls).toHaveBeenCalledTimes(1);
    expect(xpCalls.mock.calls[0][0]).toMatchObject({
      eventKey: 'COMPANY_MOCK_TEST_COMPLETED',
      sourceType: 'company_mock_test',
      sourceId: 'a1',
    });
  });

  it('pays nothing on a second submit of the same attempt', async () => {
    await submit();
    jest.clearAllMocks();

    const again = await submit();

    expect(again.body.alreadySubmitted).toBe(true);
    expect(xpCalls).not.toHaveBeenCalled();
    expect(ledger.size).toBe(1);
  });

  it('is keyed on the attempt, so the ledger refuses a replay even if the guard is bypassed', async () => {
    await submit();
    // Force the flow again as if the status guard had not held — the durable guarantee is
    // the ledger's unique index, not the early return.
    attempts[0].status = 'in_progress';
    const again = await submit();

    expect(again.body.xpAwarded).toBe(0);
    expect(ledger.size).toBe(1);
  });

  it('pays for sitting it, not for scoring well', async () => {
    // Every answer wrong.
    attempts = [attemptDoc({ answers: [{ questionId: 'q1', chosen: 1 }, { questionId: 'q2', chosen: 0 }] })];

    const res = await submit();

    expect(res.body.result.score).toBe(0);
    expect(res.body.result.passed).toBe(false);
    expect(res.body.xpAwarded).toBe(40);
  });

  it('still returns the result if the XP write fails', async () => {
    const engine = require('../services/gamificationEngine');
    const original = engine.processGamificationEvent;
    engine.processGamificationEvent = async () => { throw new Error('ledger down'); };

    const res = await submit();

    // Forty minutes of work must not be lost to a gamification outage.
    expect(res.body.result.score).toBe(100);
    expect(res.body.xpAwarded).toBe(0);
    engine.processGamificationEvent = original;
  });
});

// ── the Skill DNA boundary ──────────────────────────────────────────────────

describe('a company mock test and Skill DNA', () => {
  it('writes no skill evidence at all', async () => {
    await submit();

    // Company questions carry a taxonomy category, not a canonical skill key, and most are
    // AI-generated practice. Admitting them would mix unmapped items into Skill DNA.
    expect(evidenceWrites).not.toHaveBeenCalled();
    expect(skillProfileWrites).not.toHaveBeenCalled();
  });

  it('keeps the result as a company figure, with no skill breakdown', async () => {
    const res = await submit();

    expect(res.body.result.score).toBeDefined();
    expect(res.body.result.skills).toBeUndefined();
    expect(res.body.result.skillDna).toBeUndefined();
  });
});

// ── provenance ──────────────────────────────────────────────────────────────

describe('starting a company mock test', () => {
  it('stamps the profile version it was sat against', async () => {
    attempts = [];

    const res = mkRes();
    await startMockTest(mkReq({ params: { slug: 'acme' } }), res);

    // Read next year, this result says what it was measured against rather than being
    // reinterpreted against whatever is published by then.
    expect(attempts[0].companyProfileVersion).toBe(3);
  });
});
