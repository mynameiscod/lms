/**
 * Pool exam results, against a real database.
 *
 * Everyone the exam was given to is listed (its audience, its schedules, anyone who sat it); each
 * student is ranked on their best marked attempt; a paper shows the key beside the answer;
 * question statistics flag what nobody gets right; release, re-marking and the spreadsheet work;
 * another institute and students are kept out.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'pool-exam-results-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import PoolExamAttempt from '../../models/PoolExamAttempt';
import AssessmentSchedule from '../../models/AssessmentSchedule';
import assignmentService from '../../services/assignmentService';
import * as pools from '../../services/questionPoolService';
import * as exam from '../../services/poolExamRuntimeService';
import * as results from '../../services/poolExamAdminService';
import resultRoutes from '../../routes/poolExamResultRoutes';
import { AssignmentType } from '../../models/Assignment';
import { Actor } from '../../services/problemBankService';

const TENANT = '507f1f77bcf86cd799439b01';
const OTHER = '507f1f77bcf86cd799439b02';
const ADMIN: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: TENANT, role: 'TENANT_ADMIN' };
const BATCH = new mongoose.Types.ObjectId();

const student = async (first: string, batch: mongoose.Types.ObjectId | null = BATCH) => {
  const u = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: first, lastName: 'S', email: `${first.toLowerCase()}@x.com`, password: 'x', role: 'STUDENT', isActive: true,
    ...(batch ? { batchId: batch } : {}),
  } as any);
  return { userId: String(u._id), tenantId: TENANT };
};

/** An MCQ pool whose questions all have option A correct. */
const setup = async (poolExam: any, extra: any = {}) => {
  const p = await pools.createPool(ADMIN, { name: 'Apt', kind: 'mcq' });
  await pools.importMcqs(ADMIN, p.id, Array.from({ length: 4 }, (_, i) => ({ question: `q${i}`, options: ['Right', 'Wrong'], correct: 'A', difficulty: 'easy' })));
  const a = await assignmentService.create({
    tenant: new mongoose.Types.ObjectId(TENANT) as any, createdBy: new mongoose.Types.ObjectId(ADMIN.userId) as any,
    title: 'Mid-term', type: AssignmentType.EXAM, passingPoints: 2,
    poolExam: { sections: [{ poolId: p.id, title: 'A', easy: 2, marksPerQuestion: 1 }], maxAttempts: 3, ...poolExam },
    accessibleTo: 'batch_wise', selectedBatches: [String(BATCH)], ...extra,
  } as any);
  await assignmentService.publish(a._id, a.tenant, a.createdBy);
  return String(a._id);
};

/** Sit the paper answering `right` questions correctly, and wait for marking. */
const sit = async (s: exam.Student, id: string, right: number) => {
  const { attemptId } = await exam.start(s, id);
  for (let n = 1; n <= 2; n++) await exam.saveAnswer(s, attemptId, `s1:${n}`, { selected: [n <= right ? 0 : 1] });
  await exam.submit(s, attemptId);
  for (let i = 0; i < 40; i++) {
    if (((await PoolExamAttempt.findById(attemptId).lean()) as any).status === 'graded') return attemptId;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('never graded');
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('the results table', () => {
  it('lists everyone, ranks on the best marked attempt, and sums it up', async () => {
    const id = await setup({});
    const asha = await student('Asha'); const ravi = await student('Ravi'); const meena = await student('Meena');
    await student('Outsider', new mongoose.Types.ObjectId());
    await sit(asha, id, 1);
    await sit(asha, id, 2); // her better attempt counts
    await sit(ravi, id, 0);
    await exam.start(meena, id); // still sitting it

    const r = await results.results(TENANT, id);
    expect(r.rows.map(x => [x.name, x.status, x.score, x.attempts])).toEqual([
      ['Asha S', 'graded', 2, 2], ['Ravi S', 'graded', 0, 1], ['Meena S', 'in_progress', null, 1],
    ]);
    expect(r.rows[0].passed).toBe(true);
    expect(r.rows[1].passed).toBe(false);
    expect(r.summary).toMatchObject({ assigned: 3, started: 3, inProgress: 1, submitted: 2, graded: 2, average: 50, passRate: 50, highest: 100 });
  });

  it('includes students given the exam only through a schedule, and those who have not started', async () => {
    const id = await setup({}, { accessibleTo: 'individual', selectedStudents: [] });
    const other = new mongoose.Types.ObjectId();
    const late = await student('Late', other);
    await AssessmentSchedule.create({ tenantId: TENANT, contentType: 'assignment', contentId: id, batchId: other, status: 'active' } as any);
    const r = await results.results(TENANT, id);
    expect(r.rows).toEqual([expect.objectContaining({ id: late.userId, status: 'not_started', score: null })]);
  });
});

describe('a paper and the questions', () => {
  it('shows the key beside the answer, and flags a question nobody gets right', async () => {
    const id = await setup({});
    const s = await student('Asha');
    const attemptId = await sit(s, id, 1);
    const d = await results.attemptDetail(TENANT, attemptId);
    expect(d.items[0]).toMatchObject({ kind: 'mcq', options: ['Right', 'Wrong'], key: [0], selected: [0], correct: true, score: 1 });
    expect(d.items[1]).toMatchObject({ selected: [1], correct: false, score: 0 });

    for (const name of ['B', 'C']) await sit(await student(name), id, 0);
    const q = await results.questionStats(TENANT, id);
    expect(q.graded).toBe(3);
    expect(q.rows.some(r => r.flag === 'check' || r.flag === 'hard')).toBe(true);
    expect(q.rows[0].scoreRate).toBeLessThanOrEqual(q.rows[q.rows.length - 1].scoreRate);
  });
});

describe('release, re-marking and the spreadsheet', () => {
  it('releases results to students and takes them back', async () => {
    const id = await setup({});
    const s = await student('Asha');
    await sit(s, id, 2);
    expect((await exam.overview(s, id)).attempts[0].score).toBeUndefined();
    await results.setReleased(TENANT, id, true);
    expect((await exam.overview(s, id)).attempts[0].score).toBe(2);
    await results.setReleased(TENANT, id, false);
    expect((await exam.overview(s, id)).attempts[0].score).toBeUndefined();
  });

  it('re-marks an attempt', async () => {
    const id = await setup({});
    const s = await student('Asha');
    const attemptId = await sit(s, id, 2);
    await PoolExamAttempt.updateOne({ _id: attemptId }, { $set: { score: 0, 'items.0.score': 0 } });
    const d = await results.regrade(TENANT, attemptId);
    expect(d).toMatchObject({ status: 'graded', score: 2 });
  });

  it('exports both sheets', async () => {
    const id = await setup({});
    await sit(await student('Asha'), id, 2);
    const { filename, buffer } = await results.exportWorkbook(TENANT, id);
    expect(filename).toBe('Mid-term - results.xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Results', 'Questions']);
    expect(XLSX.utils.sheet_to_json<any>(wb.Sheets.Results)[0]).toMatchObject({ Rank: 1, Student: 'Asha S', Score: 2, Result: 'Pass' });
  });
});

describe('who may see results', () => {
  it('hides another institute\'s exam and attempts', async () => {
    const id = await setup({});
    const attemptId = await sit(await student('Asha'), id, 1);
    await expect(results.results(OTHER, id)).rejects.toThrow(/Exam not found/);
    await expect(results.attemptDetail(OTHER, attemptId)).rejects.toThrow(/Attempt not found/);
  });

  it('keeps students out of the results routes', async () => {
    const app = express(); app.use(express.json()); app.use('/r', resultRoutes);
    const id = await setup({});
    const s = await student('Asha');
    const t = jwt.sign({ id: s.userId, email: 'asha@x.com', role: 'STUDENT', tenantId: TENANT }, process.env.JWT_SECRET as string);
    expect((await request(app).get(`/r/${id}`).set('Authorization', `Bearer ${t}`)).status).toBe(403);
    const admin = await User.create({ tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'A', lastName: 'D', email: 'ad@x.com', password: 'x', role: 'TENANT_ADMIN', isActive: true } as any);
    const at = jwt.sign({ id: String(admin._id), email: 'ad@x.com', role: 'TENANT_ADMIN', tenantId: TENANT }, process.env.JWT_SECRET as string);
    expect((await request(app).get(`/r/${id}`).set('Authorization', `Bearer ${at}`)).status).toBe(200);
  });
});
