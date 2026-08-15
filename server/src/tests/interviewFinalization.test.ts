/**
 * Regression: finishing a mock interview must be safe against concurrency, not just against
 * a tidy sequence of calls.
 *
 * finish() was read → evaluate → mutate → save. The AI evaluation sits in the middle of that
 * and takes seconds, so two requests — a double-tapped button, a client retry after a
 * gateway timeout, a redelivered job — both loaded the same in_progress session, both saw
 * `status !== 'completed'`, and both ran the entire tail. Two evaluations billed, XP paid
 * twice through an in-memory helper with no ledger to refuse it, the daily mission closed
 * twice, and two lots of coins requested.
 *
 * `if (session.status === 'completed')` in application memory is a SEQUENTIAL guard. It
 * answers "has this already finished", never "is somebody else finishing it right now" —
 * and the second question is the one a race asks.
 *
 * The fix is a persisted claim: one conditional update moves the session out of
 * `in_progress`, MongoDB picks exactly one winner, and every side effect hangs off that.
 * These tests drive the real controller and count the side effects.
 */

const TENANT = 't1';
const STUDENT = '507f1f77bcf86cd799439011';
const INTERVIEW = '507f1f77bcf86cd799439012';

let interviews: any[] = [];
let evidence: any[] = [];
let skillCatalogue: any[] = [];
let readinessResult: any;

const evaluateCalls = jest.fn();
const xpCalls = jest.fn();
const coinCalls = jest.fn();
const missionCalls = jest.fn();
const recomputeCalls = jest.fn();

/** Every XP idempotency key the ledger has accepted. Stands in for the unique index. */
let xpLedger = new Set<string>();
let coinLedger = new Set<string>();

const getPath = (doc: any, path: string): any =>
  path.split('.').reduce((o: any, part: string) => (o == null ? o : o[part]), doc);

const matchOne = (value: any, cond: any): boolean => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
    if ('$ne' in cond) return String(value) !== String(cond.$ne);
    if ('$in' in cond) return cond.$in.map(String).includes(String(value));
    if ('$lte' in cond) return value != null && new Date(value) <= new Date(cond.$lte);
    if ('$exists' in cond) return (value !== undefined && value !== null) === cond.$exists;
  }
  if (cond === null) return value === null || value === undefined;
  return String(value) === String(cond);
};

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    if (k === '$or') return (cond as any[]).some(c => matches(doc, c));
    const value = k === '_id' ? String(doc._id) : getPath(doc, k);
    return matchOne(value, cond);
  });

const applyUpdate = (doc: any, update: any) => {
  if (update.$set) for (const [f, v] of Object.entries<any>(update.$set)) doc[f] = v;
  if (update.$inc) for (const [f, v] of Object.entries<any>(update.$inc)) doc[f] = (doc[f] || 0) + v;
};

/**
 * A single-document update is atomic in MongoDB, and it is atomic here too: this body runs
 * to completion without an await, so no other request can observe the document half-updated.
 * That is precisely the property the claim relies on.
 */
jest.mock('../models/PassportInterview', () => ({
  __esModule: true,
  default: {
    findOne: async (q: any) => interviews.find(d => matches(d, q)) || null,
    findOneAndUpdate: async (q: any, u: any, o: any = {}) => {
      const doc = interviews.find(d => matches(d, q));
      if (!doc) return null;
      applyUpdate(doc, u);
      return o.new ? doc : { ...doc };
    },
    updateOne: async (q: any, u: any) => {
      const doc = interviews.find(d => matches(d, q));
      if (doc) applyUpdate(doc, u);
      return { matchedCount: doc ? 1 : 0 };
    },
  },
}));

const lean = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.limit = () => h;
  h.lean = async () => rows;
  return h;
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findById: () => lean({ _id: STUDENT, firstName: 'A', passport: { membershipActive: true } }) },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => lean({ tenantId: TENANT, priceInr: 499 }) },
}));
jest.mock('../models/PassportAttempt', () => ({
  __esModule: true,
  default: { findOne: () => lean({ pathway: 'software_dev' }) },
}));
jest.mock('../services/passportEntitlementService', () => ({
  __esModule: true,
  isEntitled: () => true,
}));

/**
 * The AI evaluation — deliberately slow.
 *
 * The await here is the window the old code raced through. Every concurrency test below
 * depends on this yielding, because a synchronous evaluation would hide the bug.
 */
jest.mock('../services/interviewAIService', () => ({
  __esModule: true,
  isInterviewAIEnabled: () => true,
  nextInterviewerTurn: async () => ({ say: 'Tell me about yourself', kind: 'question', endInterview: false }),
  evaluateTranscript: async (input: any) => {
    evaluateCalls(input);
    await new Promise(r => setTimeout(r, 20));
    return {
      overallPercentage: 72,
      overallFeedback: 'Solid.',
      topStrengths: ['Clear'], topWeaknesses: ['Depth'], recommendedPracticeAreas: ['Java'],
      readinessLevel: 'almost_ready',
      areaScores: [{ title: 'Java', percentage: 70, feedback: 'ok' }],
      questionFeedback: [],
    };
  },
}));

jest.mock('../services/gamificationEngine', () => ({
  __esModule: true,
  processGamificationEvent: async (e: any) => {
    xpCalls(e);
    const key = `${e.eventKey}:${e.sourceType}:${e.sourceId}`;
    // The real guarantee is the ledger's unique index. This is that index.
    if (xpLedger.has(key)) return { awarded: 0, refused: 'duplicate', xpTotal: 60, streak: 1, longestStreak: 1, badges: [] };
    xpLedger.add(key);
    return { awarded: 60, xpTotal: 60, streak: 1, longestStreak: 1, badges: [] };
  },
  resolveRule: async () => ({ eventKey: 'MOCK_INTERVIEW_COMPLETED', enabled: true, xp: 60, dailyLimit: 0 }),
}));

jest.mock('../services/coinService', () => ({
  __esModule: true,
  awardCoins: async (a: any) => {
    coinCalls(a);
    if (coinLedger.has(a.idempotencyKey)) return { awarded: 0, duplicate: true };
    coinLedger.add(a.idempotencyKey);
    return { awarded: 5 };
  },
}));

jest.mock('../services/passportMissionCloseService', () => ({
  __esModule: true,
  completeInterviewMissions: async (...a: any[]) => { missionCalls(...a); return []; },
}));

/** Real Module 14 projection, over an evidence store that honours the unique key. */
jest.mock('../models/StudentSkillEvidence', () => ({
  __esModule: true,
  default: {
    bulkWrite: async (ops: any[]) => {
      let upsertedCount = 0;
      for (const op of ops) {
        const f = op.updateOne.filter;
        const already = evidence.some(e =>
          String(e.assessmentId) === String(f.assessmentId)
          && e.itemSourceType === f.itemSourceType
          && e.itemSourceId === f.itemSourceId
          && e.skillKey === f.skillKey);
        if (already) continue;                       // the unique index refuses it
        evidence.push({ ...f, ...op.updateOne.update.$setOnInsert });
        upsertedCount += 1;
      }
      return { upsertedCount, modifiedCount: 0 };
    },
  },
}));

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: () => lean(skillCatalogue) },
}));

jest.mock('../services/skillDnaService', () => ({
  __esModule: true,
  recomputeStudentSkills: async (...a: any[]) => { recomputeCalls(...a); return {}; },
}));

jest.mock('../services/roleReadinessService', () => ({
  __esModule: true,
  calculateStudentRoleReadiness: async () => readinessResult,
}));

jest.mock('../services/aiClients', () => ({ __esModule: true, getOpenAI: () => null }));
jest.mock('../services/aiGateway', () => ({ __esModule: true, recordUsage: async () => {} }));
jest.mock('../services/settingsService', () => ({ __esModule: true, getStr: (_k: string, d: string) => d }));
jest.mock('../models/CompanyQuestionModels', () => ({
  __esModule: true,
  Company: { findOne: () => lean(null) },
  CompanyMockConfig: { findOne: () => lean(null) },
  QuestionTaxonomy: { findOne: () => lean(null) },
  CompanyQuestion: { aggregate: async () => [] },
}));

import { finish } from '../controllers/passportInterviewController';

const mkRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const mkReq = (): any => ({ params: { id: INTERVIEW }, body: {}, user: { id: STUDENT, tenantId: TENANT } });

const call = async () => {
  const res = mkRes();
  await finish(mkReq(), res);
  return res;
};

const session = (over: any = {}) => ({
  _id: INTERVIEW,
  tenantId: TENANT,
  studentId: STUDENT,
  role: 'Backend Developer',
  areas: ['Java'],
  skillTargets: [{ skillKey: 'JAVA', skillName: 'Java' }],
  evidenceProjectedAt: null,
  status: 'in_progress',
  finalizeToken: null,
  finalizingAt: null,
  interviewerName: 'Siva',
  maxQuestions: 6,
  askedCount: 2,
  transcript: [
    { role: 'interviewer', text: 'Tell me about Java', at: new Date() },
    { role: 'candidate', text: 'The JVM runs bytecode…', at: new Date() },
  ],
  evaluation: null,
  xpAwarded: 0,
  startedAt: new Date(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  interviews = [session()];
  evidence = [];
  xpLedger = new Set();
  coinLedger = new Set();
  skillCatalogue = [{ key: 'JAVA', name: 'Java', active: true }];
  readinessResult = {
    available: true, role: { key: 'BACKEND', name: 'Backend Developer' },
    blueprintVersion: 1, readiness: 60, coverage: 80, confidence: 'MEDIUM',
    skills: [{ skillKey: 'JAVA', skillName: 'Java', weight: 10, targetScore: 70, studentScore: 60, status: 'ON_TRACK', skillInactive: false }],
  };
});

// ── the race ────────────────────────────────────────────────────────────────

describe('two simultaneous finish requests', () => {
  it('produce exactly one logical completion, with every side effect once', async () => {
    const [a, b] = await Promise.all([call(), call()]);

    // The AI is billed once. Under the old code both requests graded the same transcript.
    expect(evaluateCalls).toHaveBeenCalledTimes(1);
    expect(xpCalls).toHaveBeenCalledTimes(1);
    expect(coinCalls).toHaveBeenCalledTimes(1);
    expect(missionCalls).toHaveBeenCalledTimes(1);

    // One row per graded area, not two.
    expect(evidence).toHaveLength(1);
    expect(recomputeCalls).toHaveBeenCalledTimes(1);

    // The interview finished exactly once, and the claim was released.
    const doc = interviews[0];
    expect(doc.status).toBe('completed');
    expect(doc.finalizeToken).toBeNull();
    expect(doc.xpAwarded).toBe(60);

    /**
     * Both callers get an answer, and neither is an error.
     *
     * Exactly one owns the completion and returns the graded result. The other arrived
     * while the winner was still inside the AI call, so what it truthfully has to report is
     * "being graded" — not a completed result it cannot yet see, and not a failure, because
     * the member did nothing wrong by their client sending the request twice.
     */
    const results = [a, b];
    const owners = results.filter(r => r.statusCode === 200 && !r.body.alreadyCompleted);
    const observers = results.filter(r => r.statusCode === 202 || r.body.alreadyCompleted);

    expect(owners).toHaveLength(1);
    expect(observers).toHaveLength(1);
    expect(owners[0].body.session.status).toBe('completed');
    expect(owners[0].body.session.evaluation.overallScore).toBe(72);
    expect(results.every(r => !r.body.message?.match(/error|failed/i))).toBe(true);
  });

  it('never pays XP twice even if the ledger is the only thing standing in the way', async () => {
    await Promise.all([call(), call(), call()]);

    expect(xpLedger.size).toBe(1);
    expect([...xpLedger][0]).toBe(`MOCK_INTERVIEW_COMPLETED:interview:${INTERVIEW}`);
    expect(coinLedger.size).toBe(1);
  });

  it('tells a caller that arrives mid-grading to wait, rather than failing it', async () => {
    // First request claims and is still inside the AI call.
    const first = call();
    await new Promise(r => setTimeout(r, 5));
    const second = await call();

    expect(second.statusCode).toBe(202);
    expect(second.body.finalizing).toBe(true);
    expect(evaluateCalls).toHaveBeenCalledTimes(1);
    await first;
  });
});

// ── retries ─────────────────────────────────────────────────────────────────

describe('retrying a finished interview', () => {
  it('returns the stored result and repeats nothing', async () => {
    const first = await call();
    jest.clearAllMocks();

    const second = await call();

    expect(second.body.alreadyCompleted).toBe(true);
    expect(second.body.session.evaluation.overallScore)
      .toBe(first.body.session.evaluation.overallScore);
    expect(evaluateCalls).not.toHaveBeenCalled();
    expect(xpCalls).not.toHaveBeenCalled();
    expect(coinCalls).not.toHaveBeenCalled();
    expect(missionCalls).not.toHaveBeenCalled();
    expect(recomputeCalls).not.toHaveBeenCalled();
    expect(evidence).toHaveLength(1);
  });
});

// ── crash recovery ──────────────────────────────────────────────────────────

describe('an owner that never came back', () => {
  it('cannot strand the interview forever', async () => {
    // A process claimed the interview and died six minutes ago.
    interviews = [session({
      status: 'finalizing',
      finalizeToken: 'dead-process',
      finalizingAt: new Date(Date.now() - 6 * 60 * 1000),
    })];

    const res = await call();

    expect(res.statusCode).toBe(200);
    expect(interviews[0].status).toBe('completed');
    expect(evaluateCalls).toHaveBeenCalledTimes(1);
  });

  it('refuses to take over a claim that is still fresh', async () => {
    interviews = [session({
      status: 'finalizing',
      finalizeToken: 'live-process',
      finalizingAt: new Date(),
    })];

    const res = await call();

    expect(res.statusCode).toBe(202);
    expect(evaluateCalls).not.toHaveBeenCalled();
    expect(interviews[0].finalizeToken).toBe('live-process');
  });

  it('lets the recovering request finish while the zombie loses', async () => {
    /**
     * The nastiest ordering: the original owner is slow, its claim is taken over, and then
     * it wakes up and tries to write. Last writer must not win — the result belongs to
     * whoever holds the claim now.
     */
    interviews = [session({
      status: 'finalizing',
      finalizeToken: 'dead-process',
      finalizingAt: new Date(Date.now() - 6 * 60 * 1000),
    })];

    await call();                                   // recovery run completes it
    const doc = interviews[0];
    const evaluation = doc.evaluation;

    // The zombie's write is conditioned on ITS token, which no longer matches.
    const zombie = await (require('../models/PassportInterview').default).findOneAndUpdate(
      { _id: INTERVIEW, status: 'finalizing', finalizeToken: 'dead-process' },
      { $set: { evaluation: { overallScore: 1 }, status: 'completed' } },
      { new: true },
    );

    expect(zombie).toBeNull();
    expect(interviews[0].evaluation).toBe(evaluation);
  });

  it('recomputes Skill DNA on recovery when the previous run never got that far', async () => {
    // Rows were written; the process died before recomputing, so evidenceProjectedAt is unset.
    evidence = [{
      assessmentId: INTERVIEW, itemSourceType: 'interview_question',
      itemSourceId: 'area:0:Java', skillKey: 'JAVA',
    }];
    interviews = [session({
      status: 'finalizing',
      finalizeToken: 'dead-process',
      finalizingAt: new Date(Date.now() - 6 * 60 * 1000),
      evidenceProjectedAt: null,
    })];

    await call();

    // Nothing new to write — and Skill DNA still has to be told, or the interview it has
    // evidence for would never reach the student's profile.
    expect(evidence).toHaveLength(1);
    expect(recomputeCalls).toHaveBeenCalledTimes(1);
  });

  it('does not recompute again when the previous run already finished the job', async () => {
    evidence = [{
      assessmentId: INTERVIEW, itemSourceType: 'interview_question',
      itemSourceId: 'area:0:Java', skillKey: 'JAVA',
    }];
    interviews = [session({
      status: 'finalizing',
      finalizeToken: 'dead-process',
      finalizingAt: new Date(Date.now() - 6 * 60 * 1000),
      evidenceProjectedAt: new Date(),
    })];

    await call();

    expect(evidence).toHaveLength(1);
    // A rebuild over the whole evidence history, for nothing new. Not free, and not needed.
    expect(recomputeCalls).not.toHaveBeenCalled();
  });
});

// ── unchanged behaviour ─────────────────────────────────────────────────────

describe('everything else still behaves as it did', () => {
  it('closes an interview nobody answered, awarding nothing and measuring nothing', async () => {
    interviews = [session({
      transcript: [{ role: 'interviewer', text: 'Tell me about Java', at: new Date() }],
    })];

    const res = await call();

    expect(interviews[0].status).toBe('abandoned');
    expect(evaluateCalls).not.toHaveBeenCalled();
    expect(xpCalls).not.toHaveBeenCalled();
    expect(coinCalls).not.toHaveBeenCalled();
    expect(evidence).toHaveLength(0);
    expect(res.body.session.status).toBe('abandoned');
  });

  it('produces no Skill DNA evidence from a pathway interview', async () => {
    interviews = [session({ skillTargets: [] })];

    await call();

    expect(interviews[0].status).toBe('completed');
    expect(xpCalls).toHaveBeenCalledTimes(1);      // XP and coins are unaffected by this
    expect(coinCalls).toHaveBeenCalledTimes(1);
    expect(evidence).toHaveLength(0);
    expect(recomputeCalls).not.toHaveBeenCalled();
  });

  it('produces no Skill DNA evidence from a company mock', async () => {
    interviews = [session({ skillTargets: [], companySlug: 'acme', companyName: 'Acme' })];

    await call();

    expect(evidence).toHaveLength(0);
    expect(recomputeCalls).not.toHaveBeenCalled();
  });

  it('leaves a role interview doing exactly what it did before', async () => {
    const res = await call();

    expect(evidence).toHaveLength(1);
    expect(evidence[0].sourceType).toBe('MOCK_INTERVIEW');
    expect(evidence[0].skillKey).toBe('JAVA');
    expect(recomputeCalls).toHaveBeenCalledTimes(1);
    expect(res.body.interviewReadiness.readiness).toBe(70);
    expect(res.body.session.evaluation.overallScore).toBe(72);
    expect(res.body.coins).toBe(5);
    expect(res.body.xpAwarded).toBe(60);
  });

  it('still pays the amount the product already paid', async () => {
    await call();
    expect(xpCalls.mock.calls[0][0].eventKey).toBe('MOCK_INTERVIEW_COMPLETED');
    expect(interviews[0].xpAwarded).toBe(60);
  });

  /**
   * The amount moved from a controller constant into the event catalogue. This is the guard
   * that it did not change on the way — routing XP through a ledger is an idempotency fix,
   * and a member's earnings must not move because of it.
   */
  it('keeps the interview event priced exactly as the controller used to pay', () => {
    const def = jest.requireActual('../data/gamificationPolicy')
      .xpEvent('MOCK_INTERVIEW_COMPLETED');
    expect(def.defaultXp).toBe(60);
    expect(def.defaultDailyLimit).toBe(0);       // the old path had no cap
    expect(def.streakQualifying).toBe(true);     // the old call passed bumpStreak = true
    expect(def.uniqueSource).toBe(true);
  });
});
