/**
 * Grading, and the team average it feeds.
 *
 * The two failures that matter most here are both silent:
 *
 *   A PISTON TIMEOUT SCORED AS A WRONG ANSWER. The execution tier failing is our problem; a
 *   candidate whose correct solution could not be run must be retried and then reviewed, never
 *   marked zero. It is the single most unfair thing this system could do.
 *
 *   A DENOMINATOR NOBODY CAN EXPLAIN. Dividing by registered members rather than by those who
 *   turned up produces a completely different league table, and the difference is invisible in
 *   the number itself.
 */

const mockItemFind = jest.fn();
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true, default: { find: (...a: any[]) => mockItemFind(...a) },
}));

const mockExecute = jest.fn();
const mockExecuteBatch = jest.fn();
/*
 * executeBatch is the real grading path now (compile once, fresh process per case), so the
 * mock has to offer it. Its default stands in FAITHFULLY rather than returning a canned array:
 * it runs mockExecute once per case and returns the results in order, which is exactly what
 * the real implementation's fallback does. That keeps every per-case expectation in this file
 * meaningful — including the ones that assert a rejection is treated as "we could not run it"
 * rather than as a wrong answer — while the tests below also assert that grading really does
 * take the batch path.
 */
jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  default: {
    execute: (...a: any[]) => mockExecute(...a),
    executeBatch: (...a: any[]) => mockExecuteBatch(...a),
  },
}));

const mockFindOneAndUpdate = jest.fn();
jest.mock('../models/HackathonExamAttempt', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...a: any[]) => mockFindOneAndUpdate(...a),
    find: jest.fn(),
  },
}));
jest.mock('../models/HackathonExam', () => ({ __esModule: true, default: { findById: jest.fn() } }));

import { gradeNextPending, computeTeamResult } from '../services/hackathonExamGradingService';

const exam = (over: any = {}): any => ({
  _id: 'e1', teamScoreDenominator: 'registered',
  proctoring: { clusterDetection: true }, ...over,
});

const drawn = (id: string, type: string, marks: number) =>
  ({ itemId: id, sectionKey: type === 'mcq' ? 'mcq' : 'code', order: 0, type, marks });

const attempt = (over: any = {}): any => {
  const a: any = {
    _id: 'a1', examId: 'e1', submittedAt: new Date(),
    drawnItems: [], answers: [], violationCount: 0,
    grading: { status: 'grading', attempts: 1 },
    memberName: 'Asha', memberMobile: '9876543210',
    registrationCode: 'HK-ABCD-EFGH', teamName: 'Byte Squad',
    status: 'submitted', timeSpentSec: 600,
    ...over,
  };
  a.save = jest.fn(async () => a);
  return a;
};

const claim = (a: any) => mockFindOneAndUpdate.mockResolvedValue(a);
const bank = (items: any[]) => mockItemFind.mockReturnValue({ lean: async () => items });

beforeEach(() => {
  mockItemFind.mockReset(); mockExecute.mockReset(); mockFindOneAndUpdate.mockReset();
  mockExecuteBatch.mockReset();
  mockExecuteBatch.mockImplementation(async ({ cases }: any) => {
    const out = [];
    for (const tc of cases) out.push(await mockExecute({ input: tc.input, expectedOutput: tc.expectedOutput }));
    return out;
  });
});

describe('marking', () => {
  it('awards an mcq only for the exact option set', async () => {
    bank([{ _id: 'i1', type: 'mcq', correctOptionIds: ['a', 'c'] }]);
    const a = attempt({
      drawnItems: [drawn('i1', 'mcq', 5)],
      answers: [{ itemId: 'i1', sectionKey: 'mcq', selectedOptionIds: ['c', 'a'], runCount: 0, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(a.answers[0].correct).toBe(true);
    expect(a.score).toBe(5);
  });

  it('marks a partial option set wrong', async () => {
    bank([{ _id: 'i1', type: 'mcq', correctOptionIds: ['a', 'c'] }]);
    const a = attempt({
      drawnItems: [drawn('i1', 'mcq', 5)],
      answers: [{ itemId: 'i1', sectionKey: 'mcq', selectedOptionIds: ['a'], runCount: 0, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(a.answers[0].correct).toBe(false);
    expect(a.score).toBe(0);
  });

  it('gives a coding answer weighted partial credit', async () => {
    bank([{ _id: 'c1', type: 'live_code', language: 'python', testCases: [
      { input: '1', expectedOutput: '1', hidden: false, weight: 1 },
      { input: '2', expectedOutput: '2', hidden: true, weight: 3 },
    ] }]);
    mockExecute
      .mockResolvedValueOnce({ passed: true })
      .mockResolvedValueOnce({ passed: false });
    const a = attempt({
      drawnItems: [drawn('c1', 'live_code', 20)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: 'print(1)', runCount: 1, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(a.answers[0].testCasesPassed).toBe(1);
    expect(a.answers[0].correct).toBe(false);
    expect(a.answers[0].score).toBe(5); // 1 of 4 weight × 20
  });

  it('grades hidden cases too — the candidate only ever ran the visible ones', async () => {
    bank([{ _id: 'c1', type: 'live_code', language: 'python', testCases: [
      { input: '1', expectedOutput: '1', hidden: false },
      { input: '2', expectedOutput: '2', hidden: true },
      { input: '3', expectedOutput: '3', hidden: true },
    ] }]);
    mockExecute.mockResolvedValue({ passed: true });
    const a = attempt({
      drawnItems: [drawn('c1', 'live_code', 9)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: 'x', runCount: 1, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(a.answers[0].testCasesTotal).toBe(3);
    /* Every case is still run — hidden ones included, which is the point of this test. */
    expect(mockExecute).toHaveBeenCalledTimes(3);
    /* And they are run as ONE batch: three cases used to mean three javac invocations. */
    expect(mockExecuteBatch).toHaveBeenCalledTimes(1);
    expect(mockExecuteBatch.mock.calls[0][0].cases).toHaveLength(3);
  });

  it('asks the runner once for the whole question, not once per test case', async () => {
    /*
     * The regression this guards: grading called execute() per case, so a Java answer with
     * eight test cases compiled identical source eight times and occupied eight execution
     * slots. It must be one request carrying all eight.
     */
    bank([{ _id: 'c1', type: 'live_code', language: 'java', testCases:
      Array.from({ length: 8 }, (_, i) => ({ input: String(i), expectedOutput: String(i), hidden: i > 1 })) }]);
    mockExecute.mockResolvedValue({ passed: true });
    const a = attempt({
      drawnItems: [drawn('c1', 'live_code', 16)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: 'class Main{}', runCount: 1, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(mockExecuteBatch).toHaveBeenCalledTimes(1);
    expect(mockExecuteBatch.mock.calls[0][0].cases).toHaveLength(8);
    expect(a.answers[0].testCasesPassed).toBe(8);
    expect(a.answers[0].score).toBe(16);
  });

  it('scores an unanswered question zero, with a graded row so the totals add up', async () => {
    bank([{ _id: 'i1', type: 'mcq', correctOptionIds: ['a'] }]);
    const a = attempt({ drawnItems: [drawn('i1', 'mcq', 5)], answers: [] });
    claim(a);
    await gradeNextPending();
    expect(a.answers).toHaveLength(1);
    expect(a.answers[0].score).toBe(0);
    expect(a.score).toBe(0);
    expect(a.totalMarks).toBe(5);
  });

  it('scores empty code zero without troubling the execution tier', async () => {
    bank([{ _id: 'c1', type: 'live_code', testCases: [{ input: '', expectedOutput: '1', hidden: true }] }]);
    const a = attempt({
      drawnItems: [drawn('c1', 'live_code', 10)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: '   ', runCount: 0, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockExecuteBatch).not.toHaveBeenCalled();
    expect(a.answers[0].score).toBe(0);
  });

  it('computes the percentage off the paper that was drawn', async () => {
    bank([{ _id: 'i1', type: 'mcq', correctOptionIds: ['a'] }, { _id: 'i2', type: 'mcq', correctOptionIds: ['a'] }]);
    const a = attempt({
      drawnItems: [drawn('i1', 'mcq', 10), drawn('i2', 'mcq', 10)],
      answers: [
        { itemId: 'i1', sectionKey: 'mcq', selectedOptionIds: ['a'], runCount: 0, graded: false },
        { itemId: 'i2', sectionKey: 'mcq', selectedOptionIds: ['b'], runCount: 0, graded: false },
      ],
    });
    claim(a);
    await gradeNextPending();
    expect(a.score).toBe(10);
    expect(a.totalMarks).toBe(20);
    expect(a.percentage).toBe(50);
  });

  it('flags a question whose bank item was deleted instead of marking it wrong', async () => {
    bank([]);
    const a = attempt({
      drawnItems: [drawn('gone', 'mcq', 5)],
      answers: [{ itemId: 'gone', sectionKey: 'mcq', selectedOptionIds: ['a'], runCount: 0, graded: false }],
    });
    claim(a);
    await gradeNextPending();
    expect(a.answers[0].graded).toBe(false);
    expect(a.answers[0].gradingNote).toMatch(/no longer exists/);
  });
});

describe('an execution failure is never a wrong answer', () => {
  const failing = () => {
    bank([{ _id: 'c1', type: 'live_code', language: 'java', testCases: [{ input: '', expectedOutput: '1', hidden: true }] }]);
    mockExecute.mockRejectedValue(new Error('queue timeout'));
  };

  it('puts the attempt back to pending for another try', async () => {
    failing();
    const a = attempt({
      grading: { status: 'grading', attempts: 1 },
      drawnItems: [drawn('c1', 'live_code', 20)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: 'x', runCount: 1, graded: false }],
    });
    claim(a);
    const r = await gradeNextPending();
    expect(a.grading.status).toBe('pending');
    expect(a.score).toBeUndefined();
    expect(r.outcome).toBe('pending');
  });

  it('sends it for human review once the retries are exhausted, still unscored', async () => {
    failing();
    const a = attempt({
      grading: { status: 'grading', attempts: 3 },
      drawnItems: [drawn('c1', 'live_code', 20)],
      answers: [{ itemId: 'c1', sectionKey: 'code', code: 'x', runCount: 1, graded: false }],
    });
    claim(a);
    const r = await gradeNextPending();
    expect(a.grading.status).toBe('review_required');
    expect(a.grading.lastError).toMatch(/unavailable/i);
    expect(a.score).toBeUndefined();
    expect(r.outcome).toBe('review_required');
  });
});

describe('claiming work', () => {
  it('does nothing when the queue is empty', async () => {
    mockFindOneAndUpdate.mockResolvedValue(null);
    expect(await gradeNextPending()).toEqual({ graded: false });
  });

  /** Two workers, or two blue/green slots overlapping in a deploy, must not double a score. */
  it('claims atomically, taking the oldest submission first', async () => {
    claim(attempt({ drawnItems: [], answers: [] }));
    bank([]);
    await gradeNextPending();
    const [filter, update, opts] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter['grading.status']).toBe('pending');
    expect(update.$set['grading.status']).toBe('grading');
    expect(update.$inc['grading.attempts']).toBe(1);
    expect(opts.sort).toEqual({ submittedAt: 1 });
  });
});

describe('the team average', () => {
  const member = (over: any = {}): any => ({
    registrationCode: 'HK-ABCD-EFGH', teamName: 'Byte Squad',
    memberName: 'M', memberMobile: '90000', status: 'submitted',
    score: 40, totalMarks: 50, timeSpentSec: 600, violationCount: 0,
    submittedAt: new Date(), grading: { status: 'graded' }, ...over,
  });

  it('divides by everyone on the team sheet, so a no-show costs the team', () => {
    const r = computeTeamResult(exam(), [
      member({ score: 40 }), member({ score: 40 }),
      member({ status: 'no_show', score: 0, submittedAt: null, timeSpentSec: 0 }),
    ] as any);
    expect(r.registeredMembers).toBe(3);
    expect(r.attemptedMembers).toBe(2);
    expect(r.totalScore).toBe(80);
    expect(r.teamScore).toBeCloseTo(26.67, 2);
    expect(r.flags).toContain('1 member(s) did not sit the exam');
  });

  it('divides by those who sat it when the exam says so', () => {
    const r = computeTeamResult(exam({ teamScoreDenominator: 'attempted' }), [
      member({ score: 40 }), member({ score: 40 }),
      member({ status: 'no_show', score: 0, submittedAt: null }),
    ] as any);
    expect(r.teamScore).toBe(40);
  });

  it('flags a team whose members all submitted from one address', () => {
    const r = computeTeamResult(exam(), [
      member({ ipAddress: '1.2.3.4' }), member({ ipAddress: '1.2.3.4' }),
    ] as any);
    expect(r.flags).toContain('All members submitted from one IP address');
  });

  it('does not flag a single-member team for clustering', () => {
    const r = computeTeamResult(exam(), [member({ ipAddress: '1.2.3.4' })] as any);
    expect(r.flags.join(' ')).not.toMatch(/one IP/);
  });

  it('flags a team still waiting on review rather than publishing a partial score', () => {
    const r = computeTeamResult(exam(), [
      member(), member({ grading: { status: 'review_required' } }),
    ] as any);
    expect(r.flags).toContain('Needs grading review');
  });

  it('surfaces proctoring violations at team level', () => {
    const r = computeTeamResult(exam(), [member(), member({ violationCount: 4 })] as any);
    expect(r.flags).toContain('Proctoring violations recorded');
  });

  it('sums member time as the tiebreaker', () => {
    const r = computeTeamResult(exam(), [
      member({ timeSpentSec: 600 }), member({ timeSpentSec: 900 }),
    ] as any);
    expect(r.timeSpentSec).toBe(1500);
  });
});
