/**
 * Sitting a pool exam, against a real database.
 *
 * Only a student the exam was given to can sit it; each paper is drawn balanced by level with no
 * repeats, frozen, and never carries the answer key; the server owns the clock, the attempt limit
 * and the tab-switch limit; one student can never reach another's attempt; MCQs are marked.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import Assignment, { AssignmentType } from '../../models/Assignment';
import PoolExamAttempt from '../../models/PoolExamAttempt';
import assignmentService from '../../services/assignmentService';
import * as pools from '../../services/questionPoolService';
import * as exam from '../../services/poolExamRuntimeService';
import { Actor } from '../../services/problemBankService';
import { csvTemplate } from '../../services/problemImportService';
import codeRunner from '../../services/codeRunnerService';

const TENANT = '507f1f77bcf86cd799439b01';
const ADMIN: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: TENANT, role: 'TENANT_ADMIN' };
const BATCH = new mongoose.Types.ObjectId();

const student = async (email: string, batch: mongoose.Types.ObjectId | null = BATCH): Promise<exam.Student> => {
  const u = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'S', lastName: 'T', email, password: 'x', role: 'STUDENT', isActive: true,
    ...(batch ? { batchId: batch } : {}),
  } as any);
  return { userId: String(u._id), tenantId: TENANT };
};

/** An MCQ pool whose correct answer is always option A. */
const pool = async (name: string, easy: number, medium: number, hard: number) => {
  const p = await pools.createPool(ADMIN, { name, kind: 'mcq' });
  const levels = [...Array(easy).fill('easy'), ...Array(medium).fill('medium'), ...Array(hard).fill('hard')];
  await pools.importMcqs(ADMIN, p.id, levels.map((d, i) => ({ question: `${name} <b>q${i}</b>`, options: ['Right', 'Wrong'], correct: 'A', difficulty: d })));
  return p.id;
};

/** A published exam for BATCH. */
const publishedExam = async (poolExam: any, extra: any = {}) => {
  const a = await assignmentService.create({
    tenant: new mongoose.Types.ObjectId(TENANT) as any, createdBy: new mongoose.Types.ObjectId(ADMIN.userId) as any,
    title: 'Mid-term', type: AssignmentType.EXAM, poolExam,
    accessibleTo: 'batch_wise', selectedBatches: [String(BATCH)], ...extra,
  } as any);
  await assignmentService.publish(a._id, a.tenant, a.createdBy);
  return String(a._id);
};

const graded = async (attemptId: string) => {
  for (let i = 0; i < 40; i++) {
    const a = await PoolExamAttempt.findById(attemptId).lean() as any;
    if (a.status === 'graded') return a;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('never graded');
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('who may sit it', () => {
  it('is closed to a student it was not given to', async () => {
    const p = await pool('Apt', 2, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }] });
    const outsider = await student('out@x.com', new mongoose.Types.ObjectId());
    await expect(exam.overview(outsider, id)).rejects.toThrow(/not been given to you/);
    await expect(exam.start(outsider, id)).rejects.toThrow(/not been given to you/);
  });

  it('does not open before its start date', async () => {
    const p = await pool('Apt', 2, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }] }, { startDate: new Date(Date.now() + 86_400_000) });
    const s = await student('s@x.com');
    expect((await exam.overview(s, id))).toMatchObject({ canStart: false, blocked: 'not_open' });
    await expect(exam.start(s, id)).rejects.toThrow(/not opened yet/);
  });
});

describe('the paper', () => {
  it('is balanced by level, has no repeats across sections sharing a pool, and hides the key', async () => {
    const p = await pool('Apt', 4, 3, 2);
    const id = await publishedExam({
      sections: [
        { poolId: p, title: 'Part A', easy: 2, medium: 1, hard: 1, marksPerQuestion: 2 },
        { poolId: p, title: 'Part B', easy: 2, medium: 2, hard: 1, marksPerQuestion: 1 },
      ], durationMinutes: 30,
    });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    const stored = await PoolExamAttempt.findById(attemptId).lean() as any;
    const levels = (sec: string) => stored.items.filter((i: any) => i.sectionKey === sec).map((i: any) => i.difficulty).sort();
    expect(levels('s1')).toEqual(['easy', 'easy', 'hard', 'medium']);
    expect(levels('s2')).toEqual(['easy', 'easy', 'hard', 'medium', 'medium']);
    expect(new Set(stored.items.map((i: any) => String(i.refId))).size).toBe(9);
    expect(stored.maxScore).toBe(13);
    expect(stored.deadlineAt.getTime() - stored.startedAt.getTime()).toBe(30 * 60_000);

    const view = await exam.paper(s, attemptId);
    expect(JSON.stringify(view)).not.toMatch(/mcqKey/);
    expect(view.items[0]).toMatchObject({ kind: 'mcq', options: ['Right', 'Wrong'], multiple: false });
    expect((view.items[0] as any).question).not.toMatch(/<b>/);
  });

  it('resumes the running attempt instead of drawing a new one', async () => {
    const p = await pool('Apt', 5, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 2 }] });
    const s = await student('s@x.com');
    const first = await exam.start(s, id);
    const again = await exam.start(s, id);
    expect(again).toEqual({ attemptId: first.attemptId, resumed: true });
    expect(await PoolExamAttempt.countDocuments()).toBe(1);
  });

  it('draws questions the student has not seen when the pool allows', async () => {
    const p = await pool('Apt', 4, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 2 }], maxAttempts: 2 });
    const s = await student('s@x.com');
    const one = await exam.start(s, id);
    await exam.submit(s, one.attemptId);
    const two = await exam.start(s, id);
    const ids = async (aid: string) => ((await PoolExamAttempt.findById(aid).lean()) as any).items.map((i: any) => String(i.refId));
    const a = await ids(one.attemptId); const b = await ids(two.attemptId);
    expect(a.filter((x: string) => b.includes(x))).toEqual([]);
  });

  it('keeps one student out of another student\'s attempt', async () => {
    const p = await pool('Apt', 2, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }] });
    const s = await student('s@x.com'); const t = await student('t@x.com');
    const { attemptId } = await exam.start(s, id);
    await expect(exam.paper(t, attemptId)).rejects.toThrow(/Attempt not found/);
    await expect(exam.saveAnswer(t, attemptId, 's1:1', { selected: [0] })).rejects.toThrow(/Attempt not found/);
    await expect(exam.submit(t, attemptId)).rejects.toThrow(/Attempt not found/);
  });
});

describe('answering and handing in', () => {
  it('saves answers, marks MCQs against the frozen key, and withholds the score until release', async () => {
    const p = await pool('Apt', 3, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 3, marksPerQuestion: 2 }] });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    await exam.saveAnswer(s, attemptId, 's1:1', { selected: [0] });
    await exam.saveAnswer(s, attemptId, 's1:2', { selected: [1, 0] }); // single answer: only the first is kept
    await exam.saveAnswer(s, attemptId, 's1:3', { selected: [7] }); // no such option: nothing chosen
    await exam.submit(s, attemptId);
    const a = await graded(attemptId);
    expect(a.items.map((i: any) => i.score)).toEqual([2, 2, 0]);
    expect(a).toMatchObject({ score: 4, maxScore: 6, percentage: 66.67, submitReason: 'student' });

    const list = await assignmentService.getStudentAssignments(new mongoose.Types.ObjectId(TENANT), new mongoose.Types.ObjectId(s.userId));
    expect(list[0].submission).toMatchObject({ status: 'submitted', finalScore: undefined });
    expect((await exam.overview(s, id)).attempts[0].score).toBeUndefined();

    await Assignment.updateOne({ _id: id }, { $set: { 'poolExam.resultsReleasedAt': new Date() } });
    const after = await assignmentService.getStudentAssignments(new mongoose.Types.ObjectId(TENANT), new mongoose.Types.ObjectId(s.userId));
    expect(after[0].submission).toMatchObject({ status: 'graded', finalScore: 4 });
  });

  it('keeps every answer when several are saved at the same moment', async () => {
    const p = await pool('Apt', 6, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 6 }] });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    await Promise.all([1, 2, 3, 4, 5, 6].map(n => exam.saveAnswer(s, attemptId, `s1:${n}`, { selected: [n % 2] })));
    await Promise.all([exam.violation(s, attemptId, 'copy'), exam.violation(s, attemptId, 'paste')]);
    const a = await PoolExamAttempt.findById(attemptId).lean() as any;
    expect(a.items.map((i: any) => i.answer.selected[0])).toEqual([1, 0, 1, 0, 1, 0]);
    expect(a.violations).toHaveLength(2);
  });

  it('refuses answers after the deadline and hands the paper in', async () => {
    const p = await pool('Apt', 2, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }] });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    await PoolExamAttempt.updateOne({ _id: attemptId }, { $set: { deadlineAt: new Date(Date.now() - 60_000) } });
    await expect(exam.saveAnswer(s, attemptId, 's1:1', { selected: [0] })).rejects.toThrow(/Time is up/);
    expect((await PoolExamAttempt.findById(attemptId).lean() as any)).toMatchObject({ submitReason: 'time_up' });
  });

  it('hands the paper in after the last tab-switch warning', async () => {
    const p = await pool('Apt', 2, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }], tabSwitch: { enabled: true, maxWarnings: 2, autoSubmit: true } });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    expect(await exam.violation(s, attemptId, 'tab_switch')).toMatchObject({ tabSwitches: 1, submitted: false });
    expect(await exam.violation(s, attemptId, 'tab_switch')).toMatchObject({ tabSwitches: 2, submitted: false });
    expect(await exam.violation(s, attemptId, 'tab_switch')).toMatchObject({ tabSwitches: 3, submitted: true });
    expect((await PoolExamAttempt.findById(attemptId).lean() as any).submitReason).toBe('tab_switch');
  });

  it('stops at the attempt limit', async () => {
    const p = await pool('Apt', 4, 0, 0);
    const id = await publishedExam({ sections: [{ poolId: p, title: 'A', easy: 1 }], maxAttempts: 1 });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    await exam.submit(s, attemptId);
    expect(await exam.overview(s, id)).toMatchObject({ canStart: false, blocked: 'no_attempts' });
    await expect(exam.start(s, id)).rejects.toThrow(/used all your attempts/);
  });
});

describe('running code in the exam', () => {
  /** A coding pool holding the sample problem: tests 1 sample + 2 hidden. */
  const codingPool = async () => {
    const p = await pools.createPool(ADMIN, { name: 'Code', kind: 'coding' });
    const csv = csvTemplate({ complete: true });
    await pools.importFile(ADMIN, p.id, { filename: 'c.csv', data: Buffer.from(csv).toString('base64') });
    return p.id;
  };

  afterEach(() => jest.restoreAllMocks());

  it('checks the hidden tests too, showing only whether each passed and why, and says when no runner is connected', async () => {
    const p = await codingPool();
    const id = await publishedExam({ sections: [{ poolId: p, title: 'C', easy: 1 }] });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    const key = (await exam.paper(s, attemptId)).items[0].key;

    jest.spyOn(codeRunner, 'isRealExecutionEnabled').mockReturnValue(false);
    jest.spyOn(codeRunner, 'executeBatch').mockResolvedValue([
      { passed: true, output: '5', executionTime: 3 },
      { passed: false, output: '', error: 'ZeroDivisionError: division by zero', executionTime: 2 },
      { passed: false, output: '1', executionTime: 2 },
    ] as any);
    const r: any = await exam.run(s, attemptId, key, { language: 'python', code: 'a, b = map(int, input().split())\nprint(a // 0)\n' });

    expect(r.simulated).toBe(true);
    expect(r.result.total).toBe(3);
    const [sample, crashed, wrong] = r.result.cases;
    expect(sample).toMatchObject({ isSample: true, passed: true, input: '2 3', output: '5' });
    expect(crashed).toMatchObject({ isSample: false, passed: false, verdict: 'RE', error: expect.stringMatching(/ZeroDivisionError/) });
    expect(wrong).toMatchObject({ isSample: false, passed: false, verdict: 'WA' });
    for (const h of [crashed, wrong]) {
      expect(h.input).toBeUndefined();
      expect(h.expectedOutput).toBeUndefined();
      expect(h.output).toBeUndefined();
    }
  });

  it('does not spend a run on the untouched starter code', async () => {
    const p = await codingPool();
    const id = await publishedExam({ sections: [{ poolId: p, title: 'C', easy: 1 }] });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    const item = (await exam.paper(s, attemptId)).items[0] as any;
    const starter = item.problem.languages.find((l: any) => l.language === 'python').starterCode;
    await expect(exam.run(s, attemptId, item.key, { language: 'python', code: starter })).rejects.toThrow(/not changed the starter/);
    expect((await PoolExamAttempt.findById(attemptId).lean() as any).items[0].runs).toBe(0);
  });

  it('flags a mark given without a real runner', async () => {
    const p = await codingPool();
    const id = await publishedExam({ sections: [{ poolId: p, title: 'C', easy: 1 }], showResultsImmediately: false });
    const s = await student('s@x.com');
    const { attemptId } = await exam.start(s, id);
    const key = (await exam.paper(s, attemptId)).items[0].key;
    await exam.saveAnswer(s, attemptId, key, { language: 'python', code: 'print(5)\n' });
    jest.spyOn(codeRunner, 'isRealExecutionEnabled').mockReturnValue(false);
    await exam.submit(s, attemptId);
    expect((await graded(attemptId)).items[0].result.simulated).toBe(true);
  });
});
