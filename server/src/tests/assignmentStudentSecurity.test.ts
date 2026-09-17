/**
 * An assignment a student can fetch holds nothing a student must not have, and an assignment on a locked
 * Foundation day cannot be opened by knowing its id.
 *
 * ── HIDDEN TESTS ──────────────────────────────────────────────────────────────────────────
 *
 * GET /assignments/:id returned the whole document to any signed-in user: hidden tests and their
 * expected outputs, stored solutions, answer keys. The student view is now an allow-list; authors and
 * graders still get the document; the grader still runs every hidden test from the database.
 *
 * ── DAY GATING BY ID ──────────────────────────────────────────────────────────────────────
 *
 * A journey day's assignment is delivered as curriculum content, which bypasses its DRAFT status. The day
 * endpoint never sends a locked day's activities, but the id was the only lock. Every student action —
 * read, start, save, run, hint, submit — now opens with the day, by the ladder My 90 Days enforces.
 */

import mongoose from 'mongoose';

const curricula: any[] = [];
const dayPlans: any[] = [];
const enrollments: any[] = [];
const submissions: any[] = [];

const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.populate = () => chain(value);
  p.lean = async () => value;
  return p;
};
const same = (a: any, b: any) => String(a) === String(b);
const matches = (doc: any, q: any): boolean => Object.entries(q).every(([k, v]: [string, any]) => {
  if (k === 'items' && v?.$elemMatch) {
    return (doc.items || []).some((i: any) => i.kind === v.$elemMatch.kind && same(i.sourceId, v.$elemMatch.sourceId));
  }
  if (v && typeof v === 'object' && '$in' in v) return (v.$in as any[]).map(String).includes(String(doc[k]));
  return same(doc[k], v);
});

jest.mock('../models/LearningCurriculum', () => ({
  __esModule: true, default: { findOne: (q: any) => chain(curricula.find(d => matches(d, q)) || null) },
}));
jest.mock('../models/DayPlan', () => ({
  __esModule: true, default: { find: (q: any) => chain(dayPlans.filter(d => matches(d, q))) },
}));
jest.mock('../models/CurriculumEnrollment', () => ({
  __esModule: true, default: { findOne: (q: any) => chain(enrollments.find(d => matches(d, q)) || null) },
}));
jest.mock('../models/Submission', () => ({
  __esModule: true,
  SubmissionStatus: { NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', SUBMITTED: 'submitted', GRADING: 'grading', GRADED: 'graded', LATE: 'late' },
  default: {
    findOne: (q: any) => chain(submissions.find(d => matches(d, q)) || null),
    findOneAndUpdate: (q: any, update: any) => {
      const doc = submissions.find(d => matches(d, q));
      if (doc) Object.assign(doc, update.$set);
      return chain(doc || null);
    },
  },
}));
jest.mock('../models/Role', () => ({ __esModule: true, default: { findById: async () => null } }));

const mockAccess = jest.fn();
jest.mock('../services/foundationAccessService', () => ({ foundationAccess: (...a: any[]) => mockAccess(...a) }));
const mockGetById = jest.fn();
jest.mock('../services/assignmentService', () => ({
  __esModule: true, default: { getById: (...a: any[]) => mockGetById(...a), updateStats: async () => undefined },
}));
jest.mock('../services/assessmentDeliveryService', () => ({
  checkDeadlineGate: async () => ({ allowed: true, late: false, dueAt: null, policy: {} }),
  resolveForStudent: async () => ({ source: 'curriculum', dueAt: null, startAt: null, policy: {} }),
}));
const executed: { input: string; expectedOutput: string }[] = [];
jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  default: {
    execute: async (x: any) => {
      executed.push({ input: x.input, expectedOutput: x.expectedOutput });
      return { passed: true, output: x.expectedOutput, executionTime: 1, memoryUsed: 1 };
    },
  },
}));
const mockHint = jest.fn();
jest.mock('../services/assignmentHintService', () => ({
  __esModule: true, default: { requestTestCaseHint: (...a: any[]) => mockHint(...a), requestConceptHint: (...a: any[]) => mockHint(...a) },
}));
jest.mock('../services/aiService', () => ({ generateCodingAssignmentWithAI: jest.fn() }));

import Assignment from '../models/Assignment';
import assignmentController from '../controllers/assignmentController';
import submissionController from '../controllers/submissionController';
import submissionService from '../services/submissionService';
import { toStudentAssignment, toStudentSubmission } from '../services/studentAssignmentView';

const TENANT = new mongoose.Types.ObjectId().toString();
const STUDENT = new mongoose.Types.ObjectId().toString();
const ADMIN = new mongoose.Types.ObjectId().toString();
const JOURNEY = new mongoose.Types.ObjectId();
const DAY14 = new mongoose.Types.ObjectId();
const DAY1 = new mongoose.Types.ObjectId();
const ELSEWHERE = new mongoose.Types.ObjectId();
const S1 = new mongoose.Types.ObjectId().toString();
const S14 = new mongoose.Types.ObjectId().toString();

const HIDDEN_INPUT = 'hidden-input-7731';
const HIDDEN_OUTPUT = 'Name: Meera\nAge next year: 20';
const SOLUTION = 'print("the answer")';

const codingAssignment = (id: mongoose.Types.ObjectId, over: any = {}) => new Assignment({
  _id: id, tenant: TENANT, title: 'Coding Assignment — A Student Report Card', description: 'd', type: 'coding',
  instructions: 'Print four lines.', totalPoints: 100, passingPoints: 60, unitCode: 'T_VARIABLES_COMPUTE_PRACTICE',
  tags: ['PROGRAMMING_FUNDAMENTALS'], createdBy: ADMIN, allowedLanguages: ['python'], comparisonMode: 'lenient',
  selectedStudents: ['someone-else'], isInBank: true, enablePlagiarismCheck: true,
  starterCode: [{ language: 'python', code: 'name = "Meera"', solutionCode: SOLUTION }],
  testCases: [
    { input: '7', expectedOutput: 'positive\nodd', isHidden: false },
    { input: HIDDEN_INPUT, expectedOutput: HIDDEN_OUTPUT, isHidden: true },
    { input: 'second-hidden', expectedOutput: 'second-hidden-output', isHidden: true },
  ],
  rubric: [{ criterion: 'Correct output', description: 'x', maxPoints: 100, order: 0 }],
  stats: { totalSubmissions: 12, completedSubmissions: 9, averageScore: 71, highestScore: 100, averageTimeSpent: 30 },
  ...over,
});
const mcqAssignment = (id: mongoose.Types.ObjectId) => new Assignment({
  _id: id, tenant: TENANT, title: 'Quick check', type: 'mcq', totalPoints: 10, createdBy: ADMIN,
  mcqQuestions: [{ question: 'Two plus two?', points: 10, explanation: 'Because arithmetic.', options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] }],
});

const reqOf = (over: any = {}): any => ({
  params: {}, body: {}, tenantId: TENANT, user: { id: STUDENT, role: 'STUDENT' }, ip: '127.0.0.1', get: () => 'jest', ...over,
});
const resOf = () => {
  const out: any = { status: 200, body: null };
  const res: any = {
    json: (b: any) => { out.body = b; return res; },
    status: (c: number) => { out.status = c; return res; },
  };
  return { res, out };
};
const call = async (handler: (req: any, res: any) => Promise<any>, over: any) => {
  const { res, out } = resOf();
  await handler(reqOf(over), res);
  return out;
};

/** Day 1 is today; day 14 carries the Variables coding assignment. */
const seedJourney = (completedDays: number[] = []) => {
  curricula.push({ _id: JOURNEY, tenantId: TENANT, personalizedFor: STUDENT, adaptiveStage: 'foundation', journeyKind: 'FOUNDATION_UNIT_JOURNEY_V1' });
  for (let d = 1; d <= 90; d++) {
    dayPlans.push({
      curriculumId: JOURNEY, dayNumber: d,
      items: d === 14 ? [{ kind: 'assignment', sourceId: DAY14 }] : d === 1 ? [{ kind: 'assignment', sourceId: DAY1 }] : [],
    });
  }
  enrollments.push({ tenantId: TENANT, curriculumId: JOURNEY, studentId: STUDENT, completedDays });
};

beforeEach(() => {
  curricula.length = 0; dayPlans.length = 0; enrollments.length = 0; submissions.length = 0; executed.length = 0;
  mockAccess.mockReset().mockResolvedValue({ level: 'FULL', previewDays: 7 });
  mockGetById.mockReset().mockImplementation(async (id: string) => codingAssignment(new mongoose.Types.ObjectId(String(id))));
  mockHint.mockReset().mockResolvedValue({ hint: 'think', hintsUsed: 1 });
  jest.restoreAllMocks();
});

const leaks = (wire: string) => [HIDDEN_INPUT, 'Age next year', 'second-hidden', SOLUTION, 'solutionCode', 'comparisonMode',
  'someone-else', 'isInBank', 'enablePlagiarismCheck', 'averageScore', 'PROGRAMMING_FUNDAMENTALS', 'T_VARIABLES_COMPUTE_PRACTICE']
  .filter(s => wire.includes(s));

// ─────────────────────────────────────────────────────────────────────────────
describe('hidden tests never reach a student', () => {
  it('1. an ordinary student GET receives the task and visible examples, and no hidden test in any form', async () => {
    const out = await call(assignmentController.getById, { params: { id: String(ELSEWHERE) } });
    expect(out.status).toBe(200);
    const wire = JSON.stringify(out.body);
    expect(leaks(wire)).toEqual([]);
    expect(out.body.data.testCases).toEqual([{ input: '7', expectedOutput: 'positive\nodd', isHidden: false }]);
    expect(out.body.data.hiddenTestCaseCount).toBe(2);
    expect(out.body.data.starterCode).toEqual([{ language: 'python', code: 'name = "Meera"' }]);
    expect(out.body.data).toMatchObject({ title: 'Coding Assignment — A Student Report Card', instructions: 'Print four lines.', allowedLanguages: ['python'] });
  });

  it('2. a student GET of their current day’s assignment is served, still without hidden tests', async () => {
    seedJourney([]);
    const out = await call(assignmentController.getById, { params: { id: String(DAY1) } });
    expect(out.status).toBe(200);
    expect(leaks(JSON.stringify(out.body))).toEqual([]);
    expect(out.body.data.hiddenTestCaseCount).toBe(2);
  });

  it('3. an author or grader still receives the whole document to edit and review', async () => {
    for (const role of ['TENANT_ADMIN', 'INSTRUCTOR']) {
      const out = await call(assignmentController.getById, { params: { id: String(DAY14) }, user: { id: ADMIN, role } });
      expect(out.status).toBe(200);
      const doc = out.body.data;
      expect(doc.testCases.filter((t: any) => t.isHidden).map((t: any) => t.input)).toEqual([HIDDEN_INPUT, 'second-hidden']);
      expect(doc.starterCode[0].solutionCode).toBe(SOLUTION);
    }
  });

  it('4. the grader still runs every hidden test, read from the stored assignment', async () => {
    submissions.push({ _id: S1, student: STUDENT, tenant: TENANT, status: 'in_progress', code: 'print(1)', language: 'python', assignment: codingAssignment(ELSEWHERE), startedAt: new Date() });
    await submissionService.submitCoding(S1, STUDENT as any, TENANT as any);
    expect(executed.map(e => e.input)).toEqual(['7', HIDDEN_INPUT, 'second-hidden']);
    expect(executed[1].expectedOutput).toBe(HIDDEN_OUTPUT);
  });

  it('4b. and the result it returns blanks what a hidden test checked', async () => {
    submissions.push({ _id: S1, student: STUDENT, tenant: TENANT, status: 'in_progress', code: 'print(1)', language: 'python', assignment: codingAssignment(ELSEWHERE), startedAt: new Date() });
    const done: any = await submissionService.submitCoding(S1, STUDENT as any, TENANT as any);
    const hidden = done.testCaseResults.filter((r: any) => r.isHidden);
    expect(hidden.every((r: any) => r.input === '' && r.expectedOutput === '' && r.actualOutput === '')).toBe(true);
  });

  it('5. nothing a student sends can replace or add to the tests their code is graded against', async () => {
    submissions.push({ _id: S1, student: STUDENT, tenant: TENANT, status: 'in_progress', code: 'print(1)', language: 'python', assignment: codingAssignment(ELSEWHERE), startedAt: new Date() });
    const forged = { testCases: [{ input: 'forged', expectedOutput: 'forged', isHidden: true }], assignment: { testCases: [] } };
    const submit = await call(submissionController.submitCoding, { params: { submissionId: S1 }, body: { code: 'x', ...forged } });
    expect(submit.status).toBe(200);
    expect(executed.map(e => e.input)).toEqual(['7', HIDDEN_INPUT, 'second-hidden']);

    submissions[0].status = 'in_progress';
    executed.length = 0;
    const run = await call(submissionController.runCode, { params: { submissionId: S1 }, body: { code: 'x', language: 'python', ...forged } });
    expect(run.status).toBe(200);
    // A practice run uses the visible example only, and never anything from the request.
    expect(executed.map(e => e.input)).toEqual(['7']);
    expect(JSON.stringify(run.body)).not.toContain(HIDDEN_INPUT);
  });

  it('6. serialising the student view of a real document carries no grader field, and answer keys only after submission', () => {
    const wire = JSON.stringify(toStudentAssignment(codingAssignment(ELSEWHERE)));
    expect(leaks(wire)).toEqual([]);
    expect(wire).not.toContain('"stats"');
    expect(wire).not.toContain('createdBy');

    const before = JSON.stringify(toStudentAssignment(mcqAssignment(ELSEWHERE)));
    expect(before).not.toContain('isCorrect');
    expect(before).not.toContain('Because arithmetic');
    const after = toStudentAssignment(mcqAssignment(ELSEWHERE), { revealAnswers: true });
    expect(after.mcqQuestions[0].options).toEqual([{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }]);

    const submission = toStudentSubmission({ _id: 's', status: 'in_progress', assignment: codingAssignment(ELSEWHERE).toObject() });
    expect(leaks(JSON.stringify(submission))).toEqual([]);
  });

  it('6b. a student reading their own submission gets the student view of its assignment', async () => {
    submissions.push({ _id: S1, student: STUDENT, tenant: TENANT, status: 'in_progress', assignment: codingAssignment(ELSEWHERE) });
    const out = await call(submissionController.getSubmission, { params: { submissionId: S1 } });
    expect(out.status).toBe(200);
    expect(leaks(JSON.stringify(out.body))).toEqual([]);
    expect(out.body.data.assignment.hiddenTestCaseCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('a locked Foundation day cannot be opened by assignment id', () => {
  const lockedSubmission = () => submissions.push({
    _id: S14, student: STUDENT, tenant: TENANT, status: 'in_progress', code: 'print(1)', language: 'python',
    assignment: DAY14, startedAt: new Date(),
  });
  const everyAction = async () => ({
    get: await call(assignmentController.getById, { params: { id: String(DAY14) } }),
    start: await call(submissionController.start, { params: { assignmentId: String(DAY14) } }),
    mySubmission: await call(submissionController.getMySubmission, { params: { assignmentId: String(DAY14) } }),
    save: await call(submissionController.saveCode, { params: { submissionId: S14 }, body: { code: 'x', language: 'python' } }),
    run: await call(submissionController.runCode, { params: { submissionId: S14 }, body: { code: 'x', language: 'python' } }),
    hint: await call(submissionController.getHint, { params: { submissionId: S14 }, body: { code: 'x', testCaseIndex: 0, fail: { expected: 'a', actual: 'b' } } }),
    conceptHint: await call(submissionController.getConceptHint, { params: { submissionId: S14 }, body: {} }),
    submitCoding: await call(submissionController.submitCoding, { params: { submissionId: S14 } }),
    submitMCQ: await call(submissionController.submitMCQ, { params: { submissionId: S14 }, body: { answers: [] } }),
    submitTheory: await call(submissionController.submitTheory, { params: { submissionId: S14 }, body: { answer: 'x' } }),
    submission: await call(submissionController.getSubmission, { params: { submissionId: S14 } }),
  });

  it('refuses GET, start, save, run, hints and every submit while day 14 is locked — and runs none of them', async () => {
    seedJourney([]);
    lockedSubmission();
    const start = jest.spyOn(submissionService, 'startSubmission');
    const submit = jest.spyOn(submissionService, 'submitCoding');
    const run = jest.spyOn(submissionService, 'runCode');
    const results = await everyAction();
    for (const [action, out] of Object.entries(results)) {
      expect({ action, status: out.status, reason: out.body?.reason }).toEqual({ action, status: 403, reason: 'DAY_LOCKED' });
      expect({ action, leaked: leaks(JSON.stringify(out.body)).concat(JSON.stringify(out.body).includes('Coding Assignment') ? ['title'] : []) })
        .toEqual({ action, leaked: [] });
    }
    expect(start).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(mockHint).not.toHaveBeenCalled();
    expect(executed).toEqual([]);
  });

  it('opens the same assignment once the journey legitimately reaches day 14', async () => {
    seedJourney([]);
    lockedSubmission();
    enrollments[0].completedDays = Array.from({ length: 13 }, (_, i) => i + 1);
    jest.spyOn(submissionService, 'startSubmission').mockResolvedValue({ _id: S14 } as any);
    const run = jest.spyOn(submissionService, 'runCode').mockResolvedValue({ results: [], allPassed: true, stdout: '' } as any);
    const submit = jest.spyOn(submissionService, 'submitCoding').mockResolvedValue({ _id: S14, status: 'submitted' } as any);

    const get = await call(assignmentController.getById, { params: { id: String(DAY14) } });
    expect(get.status).toBe(200);
    expect(leaks(JSON.stringify(get.body))).toEqual([]);
    expect((await call(submissionController.start, { params: { assignmentId: String(DAY14) } })).status).toBe(201);
    expect((await call(submissionController.runCode, { params: { submissionId: S14 }, body: { code: 'x', language: 'python' } })).status).toBe(200);
    expect((await call(submissionController.submitCoding, { params: { submissionId: S14 } })).status).toBe(200);
    expect(run).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('keeps a completed day’s assignment open for review', async () => {
    seedJourney(Array.from({ length: 20 }, (_, i) => i + 1));
    expect((await call(assignmentController.getById, { params: { id: String(DAY14) } })).status).toBe(200);
  });

  it('refuses a day past a preview membership, as the day endpoint does', async () => {
    seedJourney(Array.from({ length: 13 }, (_, i) => i + 1));
    mockAccess.mockResolvedValue({ level: 'PREVIEW', previewDays: 7 });
    const out = await call(submissionController.start, { params: { assignmentId: String(DAY14) } });
    expect({ status: out.status, reason: out.body.reason }).toEqual({ status: 403, reason: 'MEMBERSHIP_REQUIRED' });
  });

  it('leaves an assignment on no day of the student’s journey to its own rules', async () => {
    seedJourney([]);
    jest.spyOn(submissionService, 'startSubmission').mockResolvedValue({ _id: 'x' } as any);
    expect((await call(assignmentController.getById, { params: { id: String(ELSEWHERE) } })).status).toBe(200);
    expect((await call(submissionController.start, { params: { assignmentId: String(ELSEWHERE) } })).status).toBe(201);
  });

  it('leaves a student with no Foundation journey to the existing rules', async () => {
    jest.spyOn(submissionService, 'startSubmission').mockResolvedValue({ _id: 'x' } as any);
    expect((await call(submissionController.start, { params: { assignmentId: String(DAY14) } })).status).toBe(201);
  });

  it('never gates an author reviewing the assignment', async () => {
    seedJourney([]);
    const out = await call(assignmentController.getById, { params: { id: String(DAY14) }, user: { id: ADMIN, role: 'TENANT_ADMIN' } });
    expect(out.status).toBe(200);
  });
});
