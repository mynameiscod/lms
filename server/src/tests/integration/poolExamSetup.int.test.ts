/**
 * Pool exam setup, against a real database.
 *
 * The total marks come from the sections, the check adds up what every section asks of a shared
 * pool, publishing refuses an exam its pools cannot fill, and a pool an exam uses cannot be deleted.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import Question from '../../models/Question';
import Assignment, { AssignmentStatus, AssignmentType } from '../../models/Assignment';
import assignmentService from '../../services/assignmentService';
import * as pools from '../../services/questionPoolService';
import { checkPoolExam, normalizeSections } from '../../services/poolExamService';
import { Actor } from '../../services/problemBankService';

const ME: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: '507f1f77bcf86cd799439b01', role: 'TENANT_ADMIN' };
const OTHER: Actor = { userId: '507f1f77bcf86cd799439a02', tenantId: '507f1f77bcf86cd799439b02', role: 'TENANT_ADMIN' };

/** An MCQ pool holding `easy`, `medium` and `hard` questions. */
const mcqPool = async (a: Actor, name: string, easy: number, medium: number, hard: number) => {
  const pool = await pools.createPool(a, { name, kind: 'mcq' });
  const rows = [
    ...Array.from({ length: easy }, () => 'easy'), ...Array.from({ length: medium }, () => 'medium'), ...Array.from({ length: hard }, () => 'hard'),
  ].map((d, i) => ({ question: `${name} q${i}`, options: ['Yes', 'No'], correct: 'A', difficulty: d }));
  await pools.importMcqs(a, pool.id, rows);
  return pool.id;
};

const exam = (poolExam: any) => assignmentService.create({
  tenant: new mongoose.Types.ObjectId(ME.tenantId) as any, createdBy: new mongoose.Types.ObjectId(ME.userId) as any,
  title: 'Mid-term', type: AssignmentType.EXAM, poolExam,
} as any);

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('saving an exam', () => {
  it('cleans the sections and works the total marks out from them', async () => {
    const p = await mcqPool(ME, 'Apt', 5, 5, 5);
    const a = await exam({
      sections: [
        { poolId: p, title: 'Part A', easy: 2, medium: '1', hard: 1.7, marksPerQuestion: 2, junk: 'x' },
        { poolId: 'not-an-id', easy: 1 },
      ],
      durationMinutes: 45,
    });
    expect(a.poolExam!.sections).toHaveLength(1);
    expect(a.poolExam!.sections[0]).toMatchObject({ key: 's1', title: 'Part A', easy: 2, medium: 1, hard: 1, any: 0, marksPerQuestion: 2 });
    expect(a.totalPoints).toBe(8);
    expect(a.poolExam).toMatchObject({ durationMinutes: 45, maxAttempts: 1, preferUnseen: true, blockCopyPaste: true, showResultsImmediately: false });
    expect(a.poolExam!.tabSwitch).toMatchObject({ enabled: true, maxWarnings: 3, autoSubmit: true });

    const u = await assignmentService.update(a._id, a.tenant, {
      updatedBy: a.createdBy, poolExam: { sections: [{ poolId: p, easy: 3, marksPerQuestion: 5 }] },
    } as any);
    expect(u!.totalPoints).toBe(15);
  });
});

describe('checking the pools can fill the paper', () => {
  it('passes when every level is covered', async () => {
    const p = await mcqPool(ME, 'Apt', 3, 3, 1);
    const r = await checkPoolExam(ME, [{ poolId: p, title: 'A', easy: 1, medium: 1, hard: 1, any: 2, marksPerQuestion: 1 }]);
    expect(r).toMatchObject({ ok: true, totalQuestions: 5, totalMarks: 5, problems: [] });
  });

  it('adds up two sections that share a pool', async () => {
    const p = await mcqPool(ME, 'Shared', 2, 0, 0);
    const r = await checkPoolExam(ME, [
      { poolId: p, title: 'Part A', easy: 2 },
      { poolId: p, title: 'Part B', easy: 1 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.sections[0].problem).toMatch(/Sections "Part A" and "Part B" together need 3 easy but it has 2/);
  });

  it('counts "any level" only from what the per-level picks leave', async () => {
    const p = await mcqPool(ME, 'Small', 2, 1, 0);
    const r = await checkPoolExam(ME, [{ poolId: p, title: 'A', easy: 2, any: 2 }]);
    expect(r.ok).toBe(false);
    expect(r.problems[0]).toMatch(/2 at any level but only 1 are left/);
  });

  it('treats another institute\'s pool as missing', async () => {
    const theirs = await mcqPool(OTHER, 'Theirs', 5, 0, 0);
    const r = await checkPoolExam(ME, [{ poolId: theirs, title: 'A', easy: 1 }]);
    expect(r.sections[0].problem).toMatch(/no longer exists/);
  });

  it('refuses an exam with no sections or an empty section', async () => {
    expect((await checkPoolExam(ME, [])).problems).toContain('Add at least one section.');
    const p = await mcqPool(ME, 'Apt', 1, 0, 0);
    expect((await checkPoolExam(ME, normalizeSections([{ poolId: p }]))).problems[0]).toMatch(/Asks for no questions/);
  });
});

describe('publishing', () => {
  it('refuses an exam its pools cannot fill, and publishes once they can', async () => {
    const p = await mcqPool(ME, 'Apt', 1, 0, 0);
    const a = await exam({ sections: [{ poolId: p, title: 'Part A', easy: 2, marksPerQuestion: 1 }] });
    await expect(assignmentService.publish(a._id, a.tenant, a.createdBy)).rejects.toThrow(/Cannot publish: Part A: Needs 2 easy but it has 1/);

    const pool = await pools.getPool(ME, p);
    await pools.importMcqs(ME, pool.id, [{ question: 'one more', options: ['a', 'b'], correct: 'a', difficulty: 'easy' }]);
    const done = await assignmentService.publish(a._id, a.tenant, a.createdBy);
    expect(done!.status).toBe(AssignmentStatus.PUBLISHED);
  });

  it('counts a question that broke in the bank as gone', async () => {
    const p = await mcqPool(ME, 'Apt', 2, 0, 0);
    const a = await exam({ sections: [{ poolId: p, title: 'A', easy: 2 }] });
    const one = await Question.findOne({ tenantId: ME.tenantId });
    await Question.updateOne({ _id: one!._id }, { $set: { correctAnswers: [], options: ['a', 'b'] } });
    await expect(assignmentService.publish(a._id, a.tenant, a.createdBy)).rejects.toThrow(/Needs 2 easy but it has 1/);
  });
});

describe('pools in use', () => {
  it('cannot be deleted while an exam draws on them', async () => {
    const p = await mcqPool(ME, 'Apt', 1, 0, 0);
    await exam({ sections: [{ poolId: p, title: 'A', easy: 1 }] });
    await expect(pools.deletePool(ME, p)).rejects.toThrow(/used by "Mid-term"/);
    await Assignment.deleteMany({});
    await expect(pools.deletePool(ME, p)).resolves.toMatchObject({ deleted: true });
  });
});
