/**
 * Starting a mock interview must be safe against concurrency, not just against a tidy
 * sequence of calls.
 *
 * start() was findOne({status: live}) → AI call → create(). That is a read and a write with
 * a multi-second gap between them, and two simultaneous requests — a double-tapped button, a
 * retry after a timeout, two tabs — both read "no live session" before either writes. Both
 * created one. The member ended up with two transcripts, one of which the next request would
 * silently orphan, because findOne returns whichever the database happens to hand back.
 *
 * `findOne(...) then create(...)` is a SEQUENTIAL guard. It answers "does this member already
 * have an interview open", never "is somebody opening one right now" — and the second
 * question is the one a race asks.
 *
 * The fix is a partial unique index on (tenantId, studentId) over live sittings: MongoDB
 * decides the winner in the same operation that writes the row, and the loser returns the
 * winner's session as `resumed` rather than an error. These tests drive the real controller
 * against a store that enforces that index.
 */

const TENANT = 't1';
const OTHER_TENANT = 't2';
const STUDENT = '507f1f77bcf86cd799439011';
const OTHER_STUDENT = '507f1f77bcf86cd799439099';

let interviews: any[] = [];
let seq = 0;

const aiTurns = jest.fn();
const evaluateCalls = jest.fn();

/** Runs inside the AI call of the next start, i.e. in the exact window the old code raced. */
let duringAiCall: (() => Promise<void>) | null = null;

const getPath = (doc: any, path: string): any =>
  path.split('.').reduce((o: any, part: string) => (o == null ? o : o[part]), doc);

const matchOne = (value: any, cond: any): boolean => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
    if ('$ne' in cond) return String(value) !== String(cond.$ne);
    if ('$in' in cond) return cond.$in.map(String).includes(String(value));
    if ('$nin' in cond) return !cond.$nin.map(String).includes(String(value));
    if ('$lte' in cond) return value != null && new Date(value) <= new Date(cond.$lte);
    // The quota window's lower bound. Without it every `createdAt: { $gte }` query fell
    // through to the string compare below and silently matched nothing.
    if ('$gte' in cond) return value != null && new Date(value) >= new Date(cond.$gte);
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
 * The partial unique index, in memory.
 *
 * `{ tenantId: 1, studentId: 1 }`, unique, over `{ live: true }` only — so it constrains the
 * sittings that are open and ignores every finished one. This is the whole guarantee under
 * test, so it is modelled rather than assumed: without it these tests would pass against the
 * broken code too.
 */
const wouldCollide = (doc: any, selfId?: any): boolean =>
  doc.live === true && interviews.some(d =>
    String(d._id) !== String(selfId)
    && d.live === true
    && d.tenantId === doc.tenantId
    && String(d.studentId) === String(doc.studentId));

const duplicateKeyError = () => Object.assign(
  new Error('E11000 duplicate key error collection: passportinterviews index: tenantId_1_studentId_1_live_unique'),
  { code: 11000 },
);

/**
 * An insert is atomic in MongoDB, and it is atomic here too: this body runs to completion
 * without an await, so no other request can slip between the index check and the write. That
 * is precisely the property the lock relies on, and precisely what the handler's own
 * read-then-create could not offer.
 */
jest.mock('../models/PassportInterview', () => ({
  __esModule: true,
  default: {
    findOne: async (q: any) => interviews.find(d => matches(d, q)) || null,
    // Read by the quota check, which counts a member's recent sittings before letting them
    // open another. Returns the same in-memory rows every other operation here works on.
    find: (q: any) => lean(interviews.filter(d => matches(d, q))),
    create: async (doc: any) => {
      if (wouldCollide(doc)) throw duplicateKeyError();
      seq += 1;
      const saved = { _id: `i${seq}`, evaluation: null, xpAwarded: 0, ...doc };
      interviews.push(saved);
      return saved;
    },
    findOneAndUpdate: async (q: any, u: any, o: any = {}) => {
      const doc = interviews.find(d => matches(d, q));
      if (!doc) return null;
      if (wouldCollide({ ...doc, ...(u.$set || {}) }, doc._id)) throw duplicateKeyError();
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
  default: { findById: (id: string) => lean({ _id: id, firstName: 'A', passport: { membershipActive: true } }) },
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
 * The interviewer's opening line — deliberately slow.
 *
 * This await is the window the old code raced through. Every concurrency test below depends
 * on it yielding: a synchronous first turn would hide the bug entirely.
 */
jest.mock('../services/interviewAIService', () => ({
  __esModule: true,
  isInterviewAIEnabled: () => true,
  nextInterviewerTurn: async () => {
    aiTurns();
    await new Promise(r => setTimeout(r, 15));
    if (duringAiCall) { const hook = duringAiCall; duringAiCall = null; await hook(); }
    return { say: 'Tell me about yourself', kind: 'question', endInterview: false };
  },
  evaluateTranscript: async () => {
    evaluateCalls();
    return {
      overallPercentage: 72, overallFeedback: 'Solid.',
      topStrengths: ['Clear'], topWeaknesses: ['Depth'], recommendedPracticeAreas: ['Java'],
      readinessLevel: 'almost_ready',
      areaScores: [{ title: 'Java', percentage: 70, feedback: 'ok' }],
      questionFeedback: [],
    };
  },
}));

jest.mock('../services/gamificationEngine', () => ({
  __esModule: true,
  processGamificationEvent: async () => ({ awarded: 60, xpTotal: 60, streak: 1, longestStreak: 1, badges: [] }),
  resolveRule: async () => ({ eventKey: 'MOCK_INTERVIEW_COMPLETED', enabled: true, xp: 60, dailyLimit: 0 }),
}));
jest.mock('../services/coinService', () => ({
  __esModule: true, awardCoins: async () => ({ awarded: 5 }),
}));
jest.mock('../services/passportMissionCloseService', () => ({
  __esModule: true, completeInterviewMissions: async () => [],
}));
jest.mock('../services/interviewIntelligenceService', () => ({
  __esModule: true,
  planInterviewCoverage: async () => ({ ok: false }),
  projectInterviewToEvidence: async () => null,
  adaptPassportInterview: () => ({ questions: [], dimensionScores: [] }),
}));
/**
 * No interview plans configured, which is the state this suite is about: a tenant that has
 * never opened the plans screen still gets the built-in shape and no quota, so the lock is
 * the only thing deciding whether a second start succeeds.
 */
jest.mock('../models/InterviewPlan', () => ({
  __esModule: true,
  default: { find: () => lean([]) },
  DEFAULT_PLAN_SHAPE: jest.requireActual('../models/InterviewPlan').DEFAULT_PLAN_SHAPE,
  ROUND_TYPES: jest.requireActual('../models/InterviewPlan').ROUND_TYPES,
  ROUND_TYPE_LABEL: jest.requireActual('../models/InterviewPlan').ROUND_TYPE_LABEL,
  PLAN_BOUNDS: jest.requireActual('../models/InterviewPlan').PLAN_BOUNDS,
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

import { start, finish } from '../controllers/passportInterviewController';

const mkRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};

const startFor = async (tenantId = TENANT, studentId = STUDENT) => {
  const res = mkRes();
  await start({ params: {}, body: {}, user: { id: studentId, tenantId } } as any, res);
  return res;
};

const finishFor = async (id: string, tenantId = TENANT, studentId = STUDENT) => {
  const res = mkRes();
  await finish({ params: { id }, body: {}, user: { id: studentId, tenantId } } as any, res);
  return res;
};

/** A sitting as the database holds it, live unless told otherwise. */
const seeded = (over: any = {}) => {
  seq += 1;
  const status = over.status || 'in_progress';
  return {
    _id: `seed${seq}`,
    tenantId: TENANT, studentId: STUDENT,
    role: 'Software Developer (Fresher)', areas: ['Introduction & background'], skillTargets: [],
    evidenceProjectedAt: null,
    status,
    live: status === 'in_progress' || status === 'finalizing',
    finalizeToken: null, finalizingAt: null,
    interviewerName: 'Siva', maxQuestions: 6, askedCount: 1,
    transcript: [
      { role: 'interviewer', text: 'Tell me about yourself', at: new Date() },
      { role: 'candidate', text: 'I build things.', at: new Date() },
    ],
    evaluation: null, xpAwarded: 0, startedAt: new Date(),
    ...over,
  };
};

const live = () => interviews.filter(d => d.live === true);

beforeEach(() => {
  jest.clearAllMocks();
  interviews = [];
  seq = 0;
  duringAiCall = null;
});

// ── the race ────────────────────────────────────────────────────────────────

describe('two simultaneous start requests', () => {
  it('open exactly one interview between them', async () => {
    const [a, b] = await Promise.all([startFor(), startFor()]);

    // Both requests got as far as the AI — the race is real, not serialised by luck.
    expect(aiTurns).toHaveBeenCalledTimes(2);

    // Under the old code this was two. One transcript, and the member has one interview.
    expect(interviews).toHaveLength(1);
    expect(live()).toHaveLength(1);
    expect(interviews[0].status).toBe('in_progress');

    // Neither caller is told it failed.
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
  });

  it('hand the loser the winning session rather than an error', async () => {
    const [a, b] = await Promise.all([startFor(), startFor()]);

    const winner = String(interviews[0]._id);
    expect(a.body.session.id).toBe(winner);
    expect(b.body.session.id).toBe(winner);

    // Exactly one of them opened it; the other was handed it.
    const resumed = [a, b].filter(r => r.body.resumed === true);
    expect(resumed).toHaveLength(1);
    expect(resumed[0].body.session.transcript).toHaveLength(1);
    expect(resumed[0].body.session.status).toBe('in_progress');
    expect(resumed[0].body.finalizing).toBe(false);
  });

  it('put the winner in the index, so a third request cannot squeeze in either', async () => {
    await Promise.all([startFor(), startFor(), startFor()]);

    expect(interviews).toHaveLength(1);
    // `live` is what the partial index filters on. Without it the row is not protected at all.
    expect(interviews[0].live).toBe(true);
  });
});

// ── the grading window ──────────────────────────────────────────────────────

describe('an interview that is still being graded', () => {
  it('blocks a new one, and is offered back as the live session', async () => {
    interviews = [seeded({ status: 'finalizing', finalizeToken: 'owner', finalizingAt: new Date() })];

    const res = await startFor();

    expect(interviews).toHaveLength(1);
    expect(res.body.resumed).toBe(true);
    expect(res.body.finalizing).toBe(true);
    // Nothing was generated: a member mid-grading does not pay for a new opening question.
    expect(aiTurns).not.toHaveBeenCalled();
  });

  it('blocks a new one even when the claim lands mid-start', async () => {
    /**
     * The ordering the handler's own read cannot survive: start() reads, finds nothing, and
     * while it is waiting on the AI the member's finish() request claims their previous
     * sitting. Only the index is still standing at the moment of the insert.
     */
    duringAiCall = async () => {
      interviews.push(seeded({ status: 'finalizing', finalizeToken: 'owner', finalizingAt: new Date() }));
    };

    const res = await startFor();

    expect(aiTurns).toHaveBeenCalledTimes(1);
    expect(interviews).toHaveLength(1);
    expect(live()).toHaveLength(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.resumed).toBe(true);
    expect(res.body.finalizing).toBe(true);
    expect(res.body.session.id).toBe(String(interviews[0]._id));
  });
});

// ── finished interviews are not a lock ──────────────────────────────────────

describe('a member who has finished interviews before', () => {
  it('can start another — completed and abandoned sittings hold no lock', async () => {
    interviews = [
      seeded({ status: 'completed', completedAt: new Date() }),
      seeded({ status: 'abandoned' }),
    ];

    const res = await startFor();

    expect(interviews).toHaveLength(3);
    expect(live()).toHaveLength(1);
    expect(res.body.resumed).toBeUndefined();
    expect(res.body.session.status).toBe('in_progress');
  });

  it('can start another as soon as the real finish() releases the lock', async () => {
    /**
     * The invariant end to end, through both handlers: finishing has to CLEAR the flag the
     * index filters on. If it did not, a member would be locked out of the product forever
     * by their own completed interview — and no test of start() alone would notice.
     */
    const first = await startFor();
    const id = first.body.session.id;
    // Answer the question, so this is a graded completion and not an abandonment.
    interviews[0].transcript.push({ role: 'candidate', text: 'I build things.', at: new Date() });

    const finished = await finishFor(id);
    expect(finished.body.session.status).toBe('completed');
    expect(interviews[0].live).toBe(false);
    expect(evaluateCalls).toHaveBeenCalledTimes(1);

    const second = await startFor();

    expect(interviews).toHaveLength(2);
    expect(live()).toHaveLength(1);
    expect(second.body.resumed).toBeUndefined();
    expect(second.body.session.id).not.toBe(id);
  });

  it('is released the same way when nobody answered and the sitting is abandoned', async () => {
    interviews = [seeded({
      transcript: [{ role: 'interviewer', text: 'Tell me about yourself', at: new Date() }],
    })];

    await finishFor(String(interviews[0]._id));
    expect(interviews[0].status).toBe('abandoned');
    expect(interviews[0].live).toBe(false);

    const res = await startFor();
    expect(live()).toHaveLength(1);
    expect(res.body.session.status).toBe('in_progress');
  });
});

// ── the lock is per member, not global ──────────────────────────────────────

describe('the lock is scoped to one member', () => {
  it('lets two students each hold their own live interview', async () => {
    const [a, b] = await Promise.all([
      startFor(TENANT, STUDENT),
      startFor(TENANT, OTHER_STUDENT),
    ]);

    expect(interviews).toHaveLength(2);
    expect(live()).toHaveLength(2);
    expect(a.body.session.id).not.toBe(b.body.session.id);
    expect([a, b].every(r => r.body.resumed === undefined)).toBe(true);
  });

  it('keeps one student out of the other student’s session', async () => {
    interviews = [seeded({ studentId: OTHER_STUDENT })];

    const res = await startFor(TENANT, STUDENT);

    expect(interviews).toHaveLength(2);
    expect(res.body.resumed).toBeUndefined();
    expect(res.body.session.id).not.toBe(String(interviews[0]._id));
  });

  it('isolates tenants holding the same student id', async () => {
    // Same id in two tenants is not the same member, and one must not lock out the other.
    const [a, b] = await Promise.all([
      startFor(TENANT, STUDENT),
      startFor(OTHER_TENANT, STUDENT),
    ]);

    expect(interviews).toHaveLength(2);
    expect(live()).toHaveLength(2);
    expect(a.body.session.id).not.toBe(b.body.session.id);
    expect(interviews.map(d => d.tenantId).sort()).toEqual([TENANT, OTHER_TENANT].sort());
  });

  it('never resumes a live session belonging to another tenant', async () => {
    interviews = [seeded({ tenantId: OTHER_TENANT })];

    const res = await startFor(TENANT, STUDENT);

    expect(res.body.resumed).toBeUndefined();
    expect(interviews).toHaveLength(2);
    expect(interviews[1].tenantId).toBe(TENANT);
  });
});

// ── the guarantee is in the schema, not only in the handler ─────────────────

describe('the index itself', () => {
  it('is declared unique and partial over live sittings', () => {
    /**
     * Pins the actual index definition. The store above only SIMULATES it; if this index were
     * dropped from the schema, or widened to cover finished sittings, or quietly stopped being
     * unique, every test in this file would still pass and production would still race.
     */
    const actual = jest.requireActual('../models/PassportInterview');
    const spec = actual.default.schema.indexes()
      .find(([, opts]: any) => opts?.name === actual.PASSPORT_INTERVIEW_LIVE_INDEX);

    expect(spec).toBeDefined();
    const [keys, opts] = spec;
    expect(keys).toEqual({ tenantId: 1, studentId: 1 });
    expect(opts.unique).toBe(true);
    expect(opts.partialFilterExpression).toEqual({ live: true });
  });
});
