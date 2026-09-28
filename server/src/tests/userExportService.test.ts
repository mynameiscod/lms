/**
 * The student statistics behind the Users export.
 *
 * Two classes of bug matter here and neither throws:
 *
 *   1. A WRONG COLLECTION KEY returns an empty result. `Submission` keys on `tenant`/`student`
 *      while `QuizAttempt` keys on `tenantId`/`studentId` AS STRINGS. Matching either the wrong
 *      way produces a spreadsheet full of blanks that looks like "this student has done
 *      nothing" rather than like a bug.
 *   2. BLANK REPORTED AS ZERO. A student nobody has marked and a student marked absent every
 *      time must not produce the same cell. Somebody would ring the wrong person.
 */
import { collectStudentStats } from '../services/userExportService';

const A1 = '64b7f1a2c3d4e5f600000001';
const A2 = '64b7f1a2c3d4e5f600000002';
const A3 = '64b7f1a2c3d4e5f600000003';
const TENANT = '64b7f1a2c3d4e5f6000000ff';

/* Each mock records the filter it was given, so the tests can assert the SHAPE of the query
   and not just the numbers that came back. */
const seen: Record<string, any> = {};
const agg = (name: string, rows: any[]) => jest.fn(async (pipeline: any[]) => {
  seen[name] = pipeline[0].$match;
  return rows;
});

const attendanceRows: any[] = [];
const submissionRows: any[] = [];
const quizRows: any[] = [];
const profileRows: any[] = [];

jest.mock('../models/Attendance', () => ({
  __esModule: true,
  default: { aggregate: (p: any) => (require('../models/Attendance') as any).__agg(p) },
}));
jest.mock('../models/Submission', () => ({
  __esModule: true,
  default: { aggregate: (p: any) => (require('../models/Submission') as any).__agg(p) },
}));
jest.mock('../models/QuizAttempt', () => ({
  __esModule: true,
  default: { aggregate: (p: any) => (require('../models/QuizAttempt') as any).__agg(p) },
}));
jest.mock('../models/StudentProfile', () => ({
  __esModule: true,
  default: { find: () => ({ lean: async () => profileRows }) },
}));
jest.mock('../utils/profileCompleteness', () => ({
  computeProfileCompleteness: (p: any) => p.__pct,
}));

/* eslint-disable @typescript-eslint/no-var-requires */
(require('../models/Attendance') as any).__agg = agg('attendance', attendanceRows);
(require('../models/Submission') as any).__agg = agg('submission', submissionRows);
(require('../models/QuizAttempt') as any).__agg = agg('quiz', quizRows);

beforeEach(() => {
  attendanceRows.length = 0; submissionRows.length = 0;
  quizRows.length = 0; profileRows.length = 0;
  Object.keys(seen).forEach((k) => delete seen[k]);
  (require('../models/Attendance') as any).__agg = agg('attendance', attendanceRows);
  (require('../models/Submission') as any).__agg = agg('submission', submissionRows);
  (require('../models/QuizAttempt') as any).__agg = agg('quiz', quizRows);
});

describe('it queries each collection by the key that collection actually uses', () => {
  it('matches Submission on tenant / student, not tenantId / studentId', async () => {
    await collectStudentStats(TENANT, [A1]);
    /* Getting this wrong returns nothing and looks like a student who has done no work. */
    expect(seen.submission).toHaveProperty('tenant');
    expect(seen.submission).toHaveProperty('student');
    expect(seen.submission).not.toHaveProperty('studentId');
  });

  it('matches QuizAttempt on STRING ids, because that is how they are stored', async () => {
    await collectStudentStats(TENANT, [A1]);
    expect(typeof seen.quiz.tenantId).toBe('string');
    expect(typeof seen.quiz.studentId.$in[0]).toBe('string');
  });

  it('matches Attendance on ObjectIds', async () => {
    await collectStudentStats(TENANT, [A1]);
    expect(typeof seen.attendance.tenantId).toBe('object');
    expect(String(seen.attendance.studentId.$in[0])).toBe(A1);
  });

  it('scopes to the students passed in, not the whole tenant', async () => {
    /* A filtered export must not aggregate over people who are not in the file. */
    await collectStudentStats(TENANT, [A1, A2]);
    expect(seen.attendance.studentId.$in).toHaveLength(2);
  });

  it('does nothing at all when there are no students', async () => {
    const out = await collectStudentStats(TENANT, []);
    expect(out.size).toBe(0);
    expect(seen.attendance).toBeUndefined();
  });
});

describe('blank is not zero', () => {
  it('reports a null attendance rate for a student never marked', async () => {
    const out = await collectStudentStats(TENANT, [A1]);
    const s = out.get(A1)!;
    /* null, so the spreadsheet writes '' rather than 0% — "never marked" and "absent every
       single time" are different facts and must not share a cell. */
    expect(s.attendance.rate).toBeNull();
    expect(s.attendance.total).toBe(0);
  });

  it('reports a null assignment average when nothing is graded yet', async () => {
    submissionRows.push({
      _id: A1, attempted: 3, submitted: 3, graded: 0, passed: 0,
      scoreSum: 0, scoreCount: 0, lastSubmittedAt: new Date('2026-09-01'),
    });
    const out = await collectStudentStats(TENANT, [A1]);
    const s = out.get(A1)!;
    expect(s.assignments.attempted).toBe(3);
    /* Three submissions in, none marked. Averaging them as 0 would blame the student for the
       instructor's backlog. */
    expect(s.assignments.avgScore).toBeNull();
  });

  it('gives every requested student a row, even one with no data anywhere', async () => {
    const out = await collectStudentStats(TENANT, [A1, A2, A3]);
    expect(out.size).toBe(3);
    expect(out.get(A3)!.quizzes.attempts).toBe(0);
  });
});

describe('the numbers', () => {
  it('excludes approved leave from the attendance rate', async () => {
    /*
     * 8 present, 2 absent, 10 on leave. Counting leave as a miss gives 40%; excluding it gives
     * 80%. An approved absence is not a class the student skipped.
     */
    attendanceRows.push({
      _id: A1, present: 8, absent: 2, leave: 10, total: 20,
      firstMarked: new Date('2026-08-01'), lastMarked: new Date('2026-09-20'),
    });
    const s = (await collectStudentStats(TENANT, [A1])).get(A1)!;
    expect(s.attendance.rate).toBe(80);
    expect(s.attendance.total).toBe(20);
    expect(s.attendance.leave).toBe(10);
  });

  it('averages graded assignments only', async () => {
    /* 5 attempts, 2 graded at 70 and 90. The average is 80, not 32. */
    submissionRows.push({
      _id: A1, attempted: 5, submitted: 4, graded: 2, passed: 2,
      scoreSum: 160, scoreCount: 2, lastSubmittedAt: new Date('2026-09-10'),
    });
    const s = (await collectStudentStats(TENANT, [A1])).get(A1)!;
    expect(s.assignments.avgScore).toBe(80);
    expect(s.assignments.graded).toBe(2);
    expect(s.assignments.attempted).toBe(5);
  });

  it('keeps quiz average and best score apart', async () => {
    quizRows.push({
      _id: A1, attempts: 4, completed: 3, passed: 2,
      scoreSum: 180, scoreCount: 3, bestScore: 92.5,
      lastAttemptAt: new Date('2026-09-18'),
    });
    const s = (await collectStudentStats(TENANT, [A1])).get(A1)!;
    expect(s.quizzes.avgScore).toBe(60);
    expect(s.quizzes.bestScore).toBe(92.5);
    /* An abandoned attempt counts as an attempt but not as completed. */
    expect(s.quizzes.attempts).toBe(4);
    expect(s.quizzes.completed).toBe(3);
  });

  it('rounds rates to one decimal rather than showing float noise', async () => {
    attendanceRows.push({ _id: A1, present: 1, absent: 2, leave: 0, total: 3,
      firstMarked: null, lastMarked: null });
    const s = (await collectStudentStats(TENANT, [A1])).get(A1)!;
    expect(s.attendance.rate).toBe(33.3);
  });

  it('keeps one student\'s numbers off another\'s row', async () => {
    attendanceRows.push({ _id: A1, present: 10, absent: 0, leave: 0, total: 10,
      firstMarked: null, lastMarked: null });
    quizRows.push({ _id: A2, attempts: 1, completed: 1, passed: 1,
      scoreSum: 100, scoreCount: 1, bestScore: 100, lastAttemptAt: null });
    const out = await collectStudentStats(TENANT, [A1, A2]);
    expect(out.get(A1)!.attendance.rate).toBe(100);
    expect(out.get(A1)!.quizzes.attempts).toBe(0);
    expect(out.get(A2)!.attendance.rate).toBeNull();
    expect(out.get(A2)!.quizzes.bestScore).toBe(100);
  });
});

describe('profile completeness', () => {
  it('uses the same figure the student is shown on their own profile', async () => {
    profileRows.push({ userId: A1, __pct: 64 });
    const s = (await collectStudentStats(TENANT, [A1])).get(A1)!;
    expect(s.profileComplete).toBe(64);
  });

  it('survives a profile the checker cannot read', async () => {
    /* One broken profile must not fail the whole export for 184 people. */
    profileRows.push({ userId: A1, get __pct() { throw new Error('bad shape'); } });
    profileRows.push({ userId: A2, __pct: 90 });
    const out = await collectStudentStats(TENANT, [A1, A2]);
    expect(out.get(A1)!.profileComplete).toBeNull();
    expect(out.get(A2)!.profileComplete).toBe(90);
  });
});
