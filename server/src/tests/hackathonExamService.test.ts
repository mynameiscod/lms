/**
 * The hackathon exam runtime.
 *
 * Every test here is something a candidate would otherwise be able to do to their own score,
 * or something the server would otherwise get wrong in a candidate's favour:
 *
 *   THE ANSWER KEY NEVER LEAVES. The paper is assembled field by field so there is nowhere to
 *   put `correctOptionIds` or a hidden test case, rather than filtered by a `.select()` a
 *   later refactor could drop.
 *
 *   THE CLOCK DOES NOT RESTART. Resuming after a closed lid must not hand out more time, or
 *   the exam is a stopwatch anybody can reset.
 *
 *   THE VIOLATION DECISION IS THE SERVER'S. Counted in the browser it survived neither a
 *   refresh nor devtools.
 *
 *   TIME SPENT IS THE SERVER'S. It breaks ties on the leaderboard, so it is worth lying about.
 */

const mockItemFind = jest.fn();
const mockItemFindById = jest.fn();
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true,
  default: {
    find: (...a: any[]) => mockItemFind(...a),
    findById: (...a: any[]) => mockItemFindById(...a),
  },
}));

const mockExecute = jest.fn();
/* executeBatch stands in faithfully: one mockExecute per case, results in order. */
jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  default: {
    execute: (...a: any[]) => mockExecute(...a),
    executeBatch: async ({ cases }: any) => {
      const out = [];
      for (const tc of cases) out.push(await mockExecute({ input: tc.input, expectedOutput: tc.expectedOutput }));
      return out;
    },
  },
}));

jest.mock('../models/HackathonExam', () => ({ __esModule: true, default: { findById: jest.fn() } }));

/**
 * A stand-in for the two array updates saveAnswer actually issues.
 *
 * WHY THIS EXISTS. saveAnswer used to mutate the attempt and call save(). On 22 Sep that
 * was rewritten: a whole-document write was rewriting the entire attempt on every
 * keystroke, and it raced the heartbeat — Mongoose's version check failed the loser and a
 * candidate's answer came back as a 500. It now issues a positional $set with a guarded
 * $push fallback, neither of which carries a version.
 *
 * The mock was not updated with it, so every call died on `updateOne is not a function`.
 * Reproducing the two shapes here — rather than handing back a bare spy — keeps the test
 * asserting the behaviour it was written for (an answer is OVERWRITTEN, never appended
 * twice) instead of asserting that a function was called.
 */
const mockAttemptDocs = new Map<string, any>();
const mockAttemptUpdateOne = jest.fn(async (filter: any, update: any) => {
  const doc = mockAttemptDocs.get(String(filter._id));
  if (!doc) return { matchedCount: 0, modifiedCount: 0 };
  const want = filter['answers.itemId'];

  /* Positional $set / $inc — only matches when the element already exists, as Mongo's does.
     $inc matters: runCode now charges a run with $inc rather than reading, adding one and
     writing the whole document back, which is what let two clicks share one slot. */
  if (update.$set || update.$inc) {
    const i = doc.answers.findIndex((x: any) => x.itemId === want);
    if (i < 0) return { matchedCount: 0, modifiedCount: 0 };
    for (const [path, value] of Object.entries(update.$set || {})) {
      doc.answers[i][path.replace('answers.$.', '')] = value;
    }
    for (const [path, value] of Object.entries(update.$inc || {})) {
      const k = path.replace('answers.$.', '');
      doc.answers[i][k] = (doc.answers[i][k] || 0) + (value as number);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  /* Guarded $push — the filter is { 'answers.itemId': { $ne: id } }, so a second
     concurrent save finds the element present and pushes nothing. */
  if (update.$push) {
    const absent = want && typeof want === 'object' ? want.$ne : undefined;
    if (absent !== undefined && doc.answers.some((x: any) => x.itemId === absent)) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    doc.answers.push(update.$push.answers);
    return { matchedCount: 1, modifiedCount: 1 };
  }
  return { matchedCount: 0, modifiedCount: 0 };
});

/*
 * writeAnswer reads the element back after writing it, because callers decide on it — the run
 * throttle reads runCount, and a value one behind hands out a free run to anyone double-clicking.
 * So the mock has to honour a projected findOne too, with the same { answers: { $elemMatch } }
 * shape: it returns ONLY the matching element, exactly as Mongo does.
 */
const mockAttemptFindOne = jest.fn((filter: any, projection?: any) => ({
  lean: async () => {
    const doc = mockAttemptDocs.get(String(filter._id));
    if (!doc) return null;
    const match = projection?.answers?.$elemMatch;
    if (!match) return doc;
    const el = doc.answers.find((x: any) => x.itemId === match.itemId);
    return { ...doc, answers: el ? [el] : [] };
  },
  select: () => ({ lean: async () => mockAttemptDocs.get(String(filter._id)) || null }),
}));

jest.mock('../models/HackathonExamAttempt', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => mockAttemptFindOne(a[0], a[1]),
    find: jest.fn(), create: jest.fn(), updateMany: jest.fn(),
    updateOne: (...a: any[]) => mockAttemptUpdateOne(a[0], a[1]),
  },
}));
jest.mock('../models/HackathonRegistration', () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock('../services/hackathonExamDrawService', () => ({
  __esModule: true,
  drawForAttempt: jest.fn(async () => []),
  newDrawSeed: jest.fn(() => 'seed'),
}));

import {
  windowError, deadlineFor, secondDeviceConflict, buildPaper, recordViolation,
  submitAttempt, runCandidateCode, saveAnswer, startAttempt, cleanTeamCode, ExamError,
} from '../services/hackathonExamService';

const HOUR = 3600_000;

const exam = (over: any = {}): any => ({
  _id: 'e1', tenantId: 't1', status: 'live',
  startAt: new Date(Date.now() - HOUR),
  endAt: new Date(Date.now() + HOUR),
  durationMins: 60, joinCutoffMins: 15,
  runPolicy: { enabled: true, maxRunsPerQuestion: 3, cooldownSeconds: 0, maxSampleCases: 2 },
  proctoring: {
    tabSwitch: { enabled: true, maxWarnings: 3, autoSubmit: true },
    fullscreen: { required: true, maxExits: 3, autoSubmit: false },
    copyPasteBlocked: true, camera: { enabled: false, snapshotEverySec: 0 }, clusterDetection: true,
  },
  ...over,
});

/** An attempt with a save() that records, so the service's persistence is observable. */
const attempt = (over: any = {}): any => {
  const a: any = {
    _id: 'a1', examId: 'e1', tenantId: 't1',
    registrationCode: 'HK-ABCD-EFGH', memberMobile: '9876543210',
    otpVerifiedAt: new Date(), status: 'verified',
    startedAt: null, submittedAt: null, expiresAt: null, timeSpentSec: undefined,
    activeSessionId: undefined, lastHeartbeat: null,
    drawnItems: [], answers: [], violations: [], violationCount: 0,
    grading: { status: 'pending', attempts: 0 },
    saves: 0,
    ...over,
  };
  a.save = jest.fn(async () => { a.saves++; return a; });
  /* Visible to the fake updateOne above, which resolves documents by _id. */
  mockAttemptDocs.set(String(a._id), a);
  return a;
};

const drawn = (id: string, type = 'mcq', marks = 1) =>
  ({ itemId: id, sectionKey: type === 'mcq' ? 'mcq' : 'code', order: 0, type, marks });

beforeEach(() => {
  mockAttemptDocs.clear();
  mockAttemptUpdateOne.mockClear();
  mockItemFind.mockReset();
  mockItemFindById.mockReset();
  mockExecute.mockReset();
});

describe('the paper never carries the answer key', () => {
  it('omits correctOptionIds from an mcq', async () => {
    mockItemFind.mockReturnValue({ lean: async () => [{
      _id: 'i1', type: 'mcq', prompt: 'Which is O(1)?',
      options: [{ id: 'a', text: 'Array index' }, { id: 'b', text: 'Linear scan' }],
      correctOptionIds: ['a'],
    }] });
    const paper = await buildPaper(exam(), attempt({ drawnItems: [drawn('i1')] }));
    expect(paper[0].options).toEqual([
      { id: 'a', text: 'Array index' }, { id: 'b', text: 'Linear scan' },
    ]);
    expect(JSON.stringify(paper)).not.toContain('correctOptionIds');
  });

  it('gives a coding question its visible cases only, never the hidden ones', async () => {
    mockItemFind.mockReturnValue({ lean: async () => [{
      _id: 'c1', type: 'live_code', language: 'java', prompt: 'Sum the input.',
      starterCode: 'class Main {}',
      testCases: [
        { input: '1 2', expectedOutput: '3', hidden: false },
        { input: '4 5', expectedOutput: '9', hidden: false },
        { input: 'SECRET', expectedOutput: 'HIDDEN_ANSWER', hidden: true },
      ],
    }] });
    const paper = await buildPaper(exam(), attempt({ drawnItems: [drawn('c1', 'live_code', 20)] }));
    expect(paper[0].sampleCases).toHaveLength(2);
    expect(JSON.stringify(paper)).not.toContain('HIDDEN_ANSWER');
    expect(JSON.stringify(paper)).not.toContain('SECRET');
  });

  it('honours the run policy cap on how many samples are shown', async () => {
    mockItemFind.mockReturnValue({ lean: async () => [{
      _id: 'c1', type: 'live_code', language: 'java', prompt: 'p',
      testCases: [
        { input: '1', expectedOutput: '1', hidden: false },
        { input: '2', expectedOutput: '2', hidden: false },
        { input: '3', expectedOutput: '3', hidden: false },
      ],
    }] });
    const e = exam({ runPolicy: { enabled: true, maxRunsPerQuestion: 3, cooldownSeconds: 0, maxSampleCases: 1 } });
    const paper = await buildPaper(e, attempt({ drawnItems: [drawn('c1', 'live_code')] }));
    expect(paper[0].sampleCases).toHaveLength(1);
  });

  it('restores what the candidate had entered, so a reload does not lose the paper', async () => {
    mockItemFind.mockReturnValue({ lean: async () => [{ _id: 'i1', type: 'mcq', prompt: 'p', options: [] }] });
    const a = attempt({
      drawnItems: [drawn('i1')],
      answers: [{ itemId: 'i1', sectionKey: 'mcq', selectedOptionIds: ['b'], runCount: 0, graded: false }],
    });
    const paper = await buildPaper(exam(), a);
    expect(paper[0].answer?.selectedOptionIds).toEqual(['b']);
  });
});

describe('the window', () => {
  it('refuses before the start', () => {
    const e = exam({ startAt: new Date(Date.now() + HOUR) });
    expect(windowError(e, attempt())?.code).toBe('NOT_YET');
  });

  it('refuses after the close', () => {
    const e = exam({ startAt: new Date(Date.now() - 2 * HOUR), endAt: new Date(Date.now() - HOUR) });
    expect(windowError(e, attempt())?.code).toBe('ENDED');
  });

  it('refuses a first start past the join cutoff', () => {
    const e = exam({ startAt: new Date(Date.now() - 30 * 60_000), joinCutoffMins: 15 });
    expect(windowError(e, attempt())?.code).toBe('JOIN_CLOSED');
  });

  it('lets somebody already started carry on past the cutoff', () => {
    const e = exam({ startAt: new Date(Date.now() - 30 * 60_000), joinCutoffMins: 15 });
    expect(windowError(e, attempt({ startedAt: new Date(Date.now() - 20 * 60_000) }))).toBeNull();
  });

  it('never lets a personal deadline run past the exam close', () => {
    const end = new Date(Date.now() + 10 * 60_000);
    const e = exam({ endAt: end, durationMins: 60 });
    expect(deadlineFor(e, new Date()).getTime()).toBe(end.getTime());
  });
});

describe('the clock does not restart', () => {
  it('stamps startedAt once and keeps the original deadline on resume', async () => {
    const started = new Date(Date.now() - 20 * 60_000);
    const a = attempt({ startedAt: started, status: 'started', expiresAt: new Date(started.getTime() + 60 * 60_000) });
    const r = await startAttempt(exam(), a, { sessionId: 's2' });
    expect(r.resumed).toBe(true);
    expect(a.startedAt).toBe(started);
    expect(r.endsAt.getTime()).toBe(started.getTime() + 60 * 60_000);
  });

  it('refuses to start without OTP', async () => {
    await expect(startAttempt(exam(), attempt({ otpVerifiedAt: null }), {}))
      .rejects.toMatchObject({ code: 'NOT_VERIFIED' });
  });

  it('refuses to reopen a submitted paper', async () => {
    await expect(startAttempt(exam(), attempt({ submittedAt: new Date() }), {}))
      .rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
  });
});

describe('the single-device lock', () => {
  it('blocks a second device while the first is alive', () => {
    const a = attempt({ startedAt: new Date(), activeSessionId: 's1', lastHeartbeat: new Date() });
    expect(secondDeviceConflict(a, 's2')).toBe(true);
  });

  it('allows a reconnect once the other session has gone quiet', () => {
    const a = attempt({ startedAt: new Date(), activeSessionId: 's1', lastHeartbeat: new Date(Date.now() - 120_000) });
    expect(secondDeviceConflict(a, 's2')).toBe(false);
  });

  it('never blocks the same session', () => {
    const a = attempt({ startedAt: new Date(), activeSessionId: 's1', lastHeartbeat: new Date() });
    expect(secondDeviceConflict(a, 's1')).toBe(false);
  });
});

describe('proctoring is decided by the server', () => {
  it('records a tab switch and counts down the warnings', async () => {
    const a = attempt({ startedAt: new Date(), status: 'started' });
    const out = await recordViolation(exam(), a, 'tab_switch');
    expect(out.recorded).toBe(true);
    expect(a.violations).toHaveLength(1);
    expect(a.violationCount).toBe(1);
    expect(out.remaining).toBe(2);
    expect(a.save).toHaveBeenCalled();
  });

  it('ends the attempt itself once the limit is reached', async () => {
    const a = attempt({ startedAt: new Date(Date.now() - 60_000), status: 'started' });
    const e = exam();
    await recordViolation(e, a, 'tab_switch');
    await recordViolation(e, a, 'tab_switch');
    const out = await recordViolation(e, a, 'tab_switch');
    expect(out.autoSubmitted).toBe(true);
    expect(a.submittedAt).toBeTruthy();
    expect(a.status).toBe('auto_submitted');
    expect(a.autoSubmitReason).toMatch(/left the exam/i);
  });

  it('keeps the evidence even when the policy does not auto-submit', async () => {
    const a = attempt({ startedAt: new Date(), status: 'started' });
    const e = exam();
    for (let i = 0; i < 5; i++) await recordViolation(e, a, 'fullscreen_exit');
    expect(a.submittedAt).toBeNull();
    expect(a.violations.filter((v: any) => v.kind === 'fullscreen_exit')).toHaveLength(5);
  });

  it('ignores signals once the paper is submitted', async () => {
    const a = attempt({ submittedAt: new Date() });
    const out = await recordViolation(exam(), a, 'tab_switch');
    expect(out.recorded).toBe(false);
    expect(a.violations).toHaveLength(0);
  });
});

describe('running code is rationed', () => {
  const codingAttempt = () => attempt({
    startedAt: new Date(), status: 'started',
    drawnItems: [drawn('c1', 'live_code', 20)],
  });

  beforeEach(() => {
    mockItemFindById.mockReturnValue({ lean: async () => ({
      _id: 'c1', type: 'live_code', language: 'python',
      testCases: [{ input: '1', expectedOutput: '1', hidden: false }, { input: 'h', expectedOutput: 'h', hidden: true }],
    }) });
    mockExecute.mockResolvedValue({ passed: true, output: '1', executionTime: 12 });
  });

  it('runs only the visible cases', async () => {
    const out = await runCandidateCode(exam(), codingAttempt(), 'c1', 'print(1)');
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(out.cases).toHaveLength(1);
    expect(JSON.stringify(out)).not.toContain('"h"');
  });

  it('counts the run before executing, so a crash still costs a slot', async () => {
    mockExecute.mockRejectedValue(new Error('piston down'));
    const a = codingAttempt();
    await runCandidateCode(exam(), a, 'c1', 'x');
    expect(a.answers[0].runCount).toBe(1);
  });

  it('refuses past the per-question cap and says the answer is still saved', async () => {
    const a = codingAttempt();
    await runCandidateCode(exam(), a, 'c1', 'x');
    await runCandidateCode(exam(), a, 'c1', 'x');
    await runCandidateCode(exam(), a, 'c1', 'x');
    await expect(runCandidateCode(exam(), a, 'c1', 'x'))
      .rejects.toMatchObject({ code: 'RUN_LIMIT' });
    await expect(runCandidateCode(exam(), a, 'c1', 'x'))
      .rejects.toThrow(/still saved and will be graded/);
  });

  it('records a throttled run as a proctoring signal', async () => {
    const a = codingAttempt();
    for (let i = 0; i < 3; i++) await runCandidateCode(exam(), a, 'c1', 'x');
    await expect(runCandidateCode(exam(), a, 'c1', 'x')).rejects.toThrow();
    expect(a.violations.some((v: any) => v.kind === 'run_throttled')).toBe(true);
  });

  it('enforces the cooldown', async () => {
    const e = exam({ runPolicy: { enabled: true, maxRunsPerQuestion: 0, cooldownSeconds: 30, maxSampleCases: 2 } });
    const a = codingAttempt();
    await runCandidateCode(e, a, 'c1', 'x');
    await expect(runCandidateCode(e, a, 'c1', 'x')).rejects.toMatchObject({ code: 'RUN_COOLDOWN' });
  });

  it('refuses a question that is not in this candidate\'s paper', async () => {
    await expect(runCandidateCode(exam(), codingAttempt(), 'someone-elses-item', 'x'))
      .rejects.toMatchObject({ code: 'NOT_IN_PAPER' });
  });

  it('refuses when the admin has switched running off', async () => {
    const e = exam({ runPolicy: { enabled: false, maxRunsPerQuestion: 3, cooldownSeconds: 0, maxSampleCases: 2 } });
    await expect(runCandidateCode(e, codingAttempt(), 'c1', 'x'))
      .rejects.toMatchObject({ code: 'RUN_DISABLED' });
  });
});

describe('submitting', () => {
  it('computes time spent from the stored start, not from the client', async () => {
    const a = attempt({ startedAt: new Date(Date.now() - 90_000), status: 'started', drawnItems: [drawn('i1'), drawn('i2')] });
    const r = await submitAttempt(exam(), a, 'candidate');
    expect(r.timeSpentSec).toBeGreaterThanOrEqual(89);
    expect(r.timeSpentSec).toBeLessThanOrEqual(92);
    expect(a.totalMarks).toBe(2);
  });

  it('queues for grading rather than grading inline', async () => {
    const a = attempt({ startedAt: new Date(), status: 'started' });
    await submitAttempt(exam(), a, 'candidate');
    expect(a.grading.status).toBe('pending');
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('is idempotent — a second submit returns the first result', async () => {
    const a = attempt({ startedAt: new Date(Date.now() - 30_000), status: 'started' });
    const first = await submitAttempt(exam(), a, 'candidate');
    const second = await submitAttempt(exam(), a, 'candidate');
    expect(second.submittedAt).toEqual(first.submittedAt);
    expect(second.timeSpentSec).toBe(first.timeSpentSec);
  });

  it('marks an auto-submit as such, with the reason kept for review', async () => {
    const a = attempt({ startedAt: new Date(), status: 'started' });
    await submitAttempt(exam(), a, 'auto', 'Time ran out.');
    expect(a.status).toBe('auto_submitted');
    expect(a.autoSubmitReason).toBe('Time ran out.');
  });
});

describe('saving an answer', () => {
  it('refuses a question outside the candidate\'s own paper', async () => {
    await expect(saveAnswer(attempt({ drawnItems: [drawn('i1')] }), 'i9', { selectedOptionIds: ['a'] }))
      .rejects.toMatchObject({ code: 'NOT_IN_PAPER' });
  });

  it('refuses after submission', async () => {
    await expect(saveAnswer(attempt({ submittedAt: new Date(), drawnItems: [drawn('i1')] }), 'i1', {}))
      .rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
  });

  it('overwrites rather than appending a second answer for the same question', async () => {
    const a = attempt({ drawnItems: [drawn('i1')] });
    await saveAnswer(a, 'i1', { selectedOptionIds: ['a'] });
    await saveAnswer(a, 'i1', { selectedOptionIds: ['c'] });
    expect(a.answers).toHaveLength(1);
    expect(a.answers[0].selectedOptionIds).toEqual(['c']);
  });
});

describe('team codes are read the way they are written down', () => {
  it('accepts lower case and stray spaces', () => {
    expect(cleanTeamCode(' hk-hwdp-fwuf ')).toBe('HK-HWDP-FWUF');
  });
});

describe('ExamError', () => {
  it('carries a code and an HTTP status for the controller to use', () => {
    const e = new ExamError('ENDED', 'This exam has closed.', 403);
    expect(e.code).toBe('ENDED');
    expect(e.status).toBe(403);
  });
});
