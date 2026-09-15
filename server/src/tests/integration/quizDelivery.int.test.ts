/**
 * Phase 27 — a curriculum checkpoint, as a student actually receives it.
 *
 * Every audit read a checkpoint through `Quiz.questionIds` and called it complete. The student
 * player reads `GET /quizzes/:quizId/questions`, which resolves `Question.find({ quizId })` —
 * and no curriculum question carried `quizId`, so every checkpoint opened empty and an empty
 * submission still counted as the day's gating attempt.
 *
 * These tests go through the real quiz route stack — authMiddleware with a signed token,
 * tenantMiddleware, the controller and the service — against a real database, and hold:
 * the endpoint returns exactly the questions the quiz lists, in authored order; the linkage
 * checker catches a one-directional link; and a curriculum checkpoint the player cannot
 * resolve fails closed instead of unlocking the day.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'quiz-delivery-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Quiz from '../../models/Quiz';
import Question from '../../models/Question';
import QuizAttempt from '../../models/QuizAttempt';
import quizRoutes from '../../routes/quizRoutes';
import { checkCurriculumQuizLinkage } from '../../services/quizLinkageService';

const TENANT = '507f1f77bcf86cd799439e11';

const app = express();
app.use(express.json());
app.use('/api/v1/quizzes', quizRoutes);

let student: any;
let token = '';

const as = (r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('x-tenant-id', TENANT);

const quiz = (over: any = {}) => Quiz.create({
  title: 'Checkpoint', tenantId: TENANT, createdBy: 'test',
  startDate: new Date(Date.now() - 86_400_000), endDate: new Date(Date.now() + 86_400_000),
  startTime: '00:00', endTime: '23:59', totalMarks: 3, totalTime: 10,
  access: 'public', accessibleTo: 'everyone', isActive: true, multipleAttempts: true, maxAttempts: 5,
  ...over,
} as any);

const question = (n: number, over: any = {}) => Question.create({
  tenantId: TENANT, type: 'mcq_single', question: `Stem ${n}`, marks: 1, difficultyLevel: 'medium',
  options: [{ text: `Right ${n}`, isCorrect: true }, { text: `Wrong ${n}`, isCorrect: false }],
  createdBy: 'test', ...over,
} as any);

/** A curriculum checkpoint written the way the corrected seed writes it: both directions. */
const linkedCheckpoint = async (unitCode: string, count: number) => {
  const q = await quiz({ unitCode, title: `${unitCode} — checkpoint` });
  const rows = [];
  for (let i = 0; i < count; i++) rows.push(await question(i + 1, { quizId: String(q._id), questionNo: count - i }));
  // questionNo deliberately reversed against insertion: the player must honour authored order.
  rows.reverse();
  q.set('questionIds', rows.map(r => String(r._id)));
  await q.save();
  return { q, rows };
};

beforeAll(async () => { await startMongo(); });
afterAll(stopMongo);
beforeEach(async () => {
  await clearCollections();
  student = await User.create({
    tenantId: new mongoose.Types.ObjectId(TENANT), firstName: 'Quiz', lastName: 'Taker',
    email: 'quiz.taker@example.com', password: 'x', role: 'STUDENT', isActive: true,
  } as any);
  token = jwt.sign({ id: String(student._id), email: student.email, role: 'STUDENT', tenantId: TENANT }, process.env.JWT_SECRET as string);
});

describe('the student questions endpoint for a curriculum checkpoint', () => {
  it.each([
    ['a milestone checkpoint', 'T_MILESTONE_EARLY_CHECKPOINT', 8],
    ['an ordinary unit checkpoint', 'T_LOOPS_FOR_LOOPS', 3],
  ])('returns exactly the intended questions for %s, in authored order', async (_label, unitCode, count) => {
    const { q, rows } = await linkedCheckpoint(unitCode, count);
    const res = await as(request(app).get(`/api/v1/quizzes/${q._id}/questions`));
    expect(res.status).toBe(200);
    expect(res.body.map((x: any) => String(x._id))).toEqual(rows.map(r => String(r._id)));
    // Answers are not sent to the student.
    expect(res.body.every((x: any) => (x.options || []).every((o: any) => o.isCorrect !== true))).toBe(true);
    expect((await checkCurriculumQuizLinkage(TENANT)).ok).toBe(true);
  });

  it('returns nothing for a one-directional link — and the linkage check says so', async () => {
    const rows = [await question(1), await question(2), await question(3)];
    const q = await quiz({ unitCode: 'T_UNLINKED', questionIds: rows.map(r => String(r._id)) });
    const res = await as(request(app).get(`/api/v1/quizzes/${q._id}/questions`));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    const report = await checkCurriculumQuizLinkage(TENANT);
    expect(report.ok).toBe(false);
    expect(report.missingQuizId).toHaveLength(3);
  });

  it('reports a question that names another quiz, and a question no quiz lists', async () => {
    const a = await linkedCheckpoint('T_A', 3);
    const b = await linkedCheckpoint('T_B', 3);
    await Question.updateOne({ _id: a.rows[0]._id }, { $set: { quizId: String(b.q._id) } });
    const stray = await question(9, { quizId: String(b.q._id) });
    const report = await checkCurriculumQuizLinkage(TENANT);
    // Listed by A but naming B is a WRONG link; naming B while no quiz lists it is an ORPHAN.
    expect(report.wrongQuizId).toEqual([String(a.rows[0]._id)]);
    expect(report.orphanedQuestions).toEqual([String(stray._id)]);
    expect(report.ok).toBe(false);
  });
});

describe('an attempt at a checkpoint the player cannot resolve', () => {
  const startAndSubmit = async (quizId: string, answers: any[] = []) => {
    const started = await as(request(app).post(`/api/v1/quizzes/${quizId}/start`));
    expect(started.status).toBe(201);
    const attemptId = String(started.body._id);
    const submitted = await as(request(app).post(`/api/v1/quizzes/${quizId}/attempt/${attemptId}/submit`)).send({ answers });
    return { attemptId, submitted };
  };

  it('fails closed: the submission is refused and the attempt never counts as attempted', async () => {
    const rows = [await question(1), await question(2)];
    const q = await quiz({ unitCode: 'T_BROKEN', questionIds: rows.map(r => String(r._id)) });
    const { attemptId, submitted } = await startAndSubmit(String(q._id));
    expect(submitted.status).toBe(400);
    const attempt = await QuizAttempt.findById(attemptId).lean() as any;
    expect(attempt.status).not.toBe('submitted');
  });

  it('still accepts a curriculum checkpoint whose questions resolve', async () => {
    const { q, rows } = await linkedCheckpoint('T_OK', 3);
    const answers = rows.map((r, i) => ({ questionId: String(r._id), selectedOptions: [`Right ${3 - i}`], questionNo: i + 1 }));
    const { attemptId, submitted } = await startAndSubmit(String(q._id), answers);
    expect(submitted.status).toBe(200);
    expect((await QuizAttempt.findById(attemptId).lean() as any).status).toBe('submitted');
  });

  it('leaves a quiz that is not bound to a curriculum unit exactly as before', async () => {
    const q = await quiz({});
    const { submitted } = await startAndSubmit(String(q._id));
    expect(submitted.status).toBe(200);
  });
});
