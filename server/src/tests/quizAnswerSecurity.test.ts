/**
 * Checkpoint answers stay on the server until a student has earned them, and option order gives nothing away.
 *
 * Every Foundation checkpoint question stored its correct option first and served options in stored order, so
 * choosing the first option passed every checkpoint and wrote mastery into Skill DNA. And any signed-in user could
 * add includeAnswers=true and read the answer key of any quiz, in any tenant, before sitting it. These tests hold the
 * authorization, the stable unbiased order, the grader, and the ownership of attempts.
 */

import mongoose from 'mongoose';

const quizzes: any[] = [];
const questions: any[] = [];
const attempts: any[] = [];
const submissions: any[] = [];

const same = (a: any, b: any) => String(a) === String(b);
const doc = (o: any) => (o ? { ...o, toObject: () => ({ ...o }), save: async function save(this: any) { Object.assign(o, this); return this; } } : null);
const chain = (value: any): any => {
  const p: any = Promise.resolve(value);
  p.select = () => chain(value);
  p.sort = () => chain(value);
  p.lean = async () => value;
  return p;
};

jest.mock('../models/Quiz', () => ({
  __esModule: true,
  default: { findById: (id: any) => chain(doc(quizzes.find(q => same(q._id, id)))) },
}));
jest.mock('../models/Question', () => ({
  __esModule: true,
  default: {
    find: (q: any) => {
      const ids = q?._id?.$in?.map(String);
      const rows = questions.filter(x => (ids ? ids.includes(String(x._id)) : same(x.quizId, q.quizId))).map(doc);
      return chain(rows);
    },
    findById: (id: any) => chain(doc(questions.find(x => same(x._id, id)))),
    countDocuments: async (q: any) => questions.filter(x => same(x.quizId, q.quizId)).length,
  },
}));
jest.mock('../models/QuizAttempt', () => ({
  __esModule: true,
  default: {
    exists: async (q: any) => attempts.some(a => same(a.studentId, q.studentId) && same(a.quizId, q.quizId) && q.status.$in.includes(a.status)),
    findById: (id: any) => {
      const a = attempts.find(x => same(x._id, id));
      if (!a) return chain(null);
      const d: any = { ...a, toObject: () => ({ ...a }), save: async () => { Object.assign(a, d); return d; } };
      return chain(d);
    },
  },
}));
jest.mock('../models/QuizSubmission', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(submissions.filter(s => same(s.quizAttemptId, q.quizAttemptId))),
    insertMany: async (rows: any[]) => { submissions.push(...rows); return rows; },
  },
}));
jest.mock('../models/Role', () => ({ __esModule: true, default: { findById: async () => null } }));
jest.mock('../services/quizSkillBridge', () => ({ projectQuizAttemptToSkills: async () => undefined }));
jest.mock('../services/emailService', () => ({ EmailService: class {} }));
jest.mock('../services/studentWorkService', () => ({ resolveAssignedQuizzes: async () => [] }));
jest.mock('../services/aiService', () => ({ generateQuestionsWithAI: jest.fn(), normalizeQuestion: jest.fn() }));
jest.mock('../services/assessmentDeliveryService', () => ({
  checkDeadlineGate: async () => ({ allowed: true }), studentSchedulesMap: async () => new Map(), policyFromRow: () => ({}),
}));

import * as questionController from '../controllers/questionController';
import * as quizController from '../controllers/quizController';
import { stableShuffle, orderOptionsForStudent } from '../services/quizAnswerAccess';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';
const QUIZ = new mongoose.Types.ObjectId().toString();
const STUDENT = new mongoose.Types.ObjectId().toString();
const OTHER_STUDENT = new mongoose.Types.ObjectId().toString();
const ADMIN = new mongoose.Types.ObjectId().toString();

const question = (n: number, quizId = QUIZ) => ({
  _id: new mongoose.Types.ObjectId().toString(), tenantId: TENANT, quizId, type: 'mcq_single', marks: 1,
  question: `Question ${n}`, explanation: `Because option ${n}-A is right.`,
  options: [{ text: `${n}-A correct`, isCorrect: true }, { text: `${n}-B`, isCorrect: false }, { text: `${n}-C`, isCorrect: false }, { text: `${n}-D`, isCorrect: false }],
});

const reqOf = (over: any = {}): any => ({
  params: { quizId: QUIZ }, query: {}, body: {}, tenantId: TENANT, userId: STUDENT, user: { id: STUDENT, role: 'STUDENT' }, ...over,
});
const call = async (handler: (req: any, res: any) => Promise<any>, over: any = {}) => {
  const out: any = { status: 200, body: null };
  const res: any = { status: (c: number) => { out.status = c; return res; }, json: (b: any) => { out.body = b; return res; } };
  await handler(reqOf(over), res);
  return out;
};
const leaksAnswers = (body: any) => {
  const wire = JSON.stringify(body);
  return /"isCorrect":true|correctAnswers|correctAnswerText|explanation|is right/.test(wire);
};
const asAdmin = { userId: ADMIN, user: { id: ADMIN, role: 'TENANT_ADMIN' } };

beforeEach(() => {
  quizzes.length = 0; questions.length = 0; attempts.length = 0; submissions.length = 0;
  quizzes.push({ _id: QUIZ, tenantId: TENANT, title: 'Checkpoint', showAnswersAfterSubmit: true, allowReview: true, totalQuestions: 3, passingPercentage: 50, unitCode: 'T_X' });
  questions.push(question(1), question(2), question(3));
});

describe('answer keys before submission', () => {
  it('1. a student asking with includeAnswers=true before submitting receives no answers', async () => {
    const out = await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' } });
    expect(out.status).toBe(200);
    expect(out.body).toHaveLength(3);
    expect(leaksAnswers(out.body)).toBe(false);
  });

  it('2. an ordinary student question list, and the attempt question feed, carry no answers', async () => {
    expect(leaksAnswers((await call(questionController.getQuestionsForQuiz)).body)).toBe(false);
    expect(leaksAnswers((await call(quizController.getQuizQuestions)).body)).toBe(false);
  });

  it('3. no spelling of the parameter, and no single-question route, gets around it', async () => {
    for (const includeAnswers of ['true', 'TRUE', '1', ['true', 'true'], 'yes']) {
      expect(leaksAnswers((await call(questionController.getQuestionsForQuiz, { query: { includeAnswers } })).body)).toBe(false);
    }
    const one = await call(questionController.getQuestionById, { params: { quizId: QUIZ, questionId: questions[0]._id }, query: { includeAnswers: 'true' } });
    expect(one.status).toBe(200);
    expect(leaksAnswers(one.body)).toBe(false);
  });

  it('3b. nor does asking the server whether each option is right, one at a time', async () => {
    const probe = (over: any = {}) => call(questionController.validateAnswer, {
      params: { quizId: QUIZ, questionId: questions[0]._id }, body: { answer: '1-A correct' }, ...over,
    });
    expect((await probe()).status).toBe(403);
    attempts.push({ _id: 'att-mine', quizId: QUIZ, studentId: STUDENT, tenantId: TENANT, status: 'in_progress' });
    expect((await probe()).status).toBe(403);
    quizzes[0].tenantId = OTHER_TENANT;
    expect((await probe(asAdmin)).status).toBe(404);
  });

  it('4. an author or grader receives the answers, in stored order', async () => {
    for (const role of ['TENANT_ADMIN', 'INSTRUCTOR']) {
      const out = await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' }, userId: ADMIN, user: { id: ADMIN, role } });
      expect(out.body[0].options[0]).toMatchObject({ text: '1-A correct', isCorrect: true });
      expect(out.body[0].explanation).toBeTruthy();
    }
  });

  it('keeps the review a student has earned: answers after their own submitted attempt, not before, not when the quiz forbids it', async () => {
    attempts.push({ _id: 'att-other', quizId: QUIZ, studentId: OTHER_STUDENT, tenantId: TENANT, status: 'submitted' });
    expect(leaksAnswers((await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' } })).body)).toBe(false);
    attempts.push({ _id: 'att-mine', quizId: QUIZ, studentId: STUDENT, tenantId: TENANT, status: 'submitted' });
    const after = await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' } });
    expect(leaksAnswers(after.body)).toBe(true);
    quizzes[0].showAnswersAfterSubmit = false;
    expect(leaksAnswers((await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' } })).body)).toBe(false);
  });
});

describe('option order', () => {
  it('7. does not put the correct option first systematically: across many questions every position is used', () => {
    const positions = [0, 0, 0, 0];
    for (let n = 0; n < 400; n++) {
      const q = { ...question(n), _id: `q${n}` };
      const shown = orderOptionsForStudent(q, STUDENT).options!;
      positions[shown.findIndex((o: any) => o.isCorrect)]++;
    }
    expect(Math.min(...positions)).toBeGreaterThan(60);
    expect(positions[0]).toBeLessThan(160);
  });

  it('9. is stable for a student across reloads, and differs between students', async () => {
    const first = (await call(quizController.getQuizQuestions)).body.map((q: any) => q.options.map((o: any) => o.text).join('|'));
    const again = (await call(quizController.getQuizQuestions)).body.map((q: any) => q.options.map((o: any) => o.text).join('|'));
    expect(again).toEqual(first);
    const shuffles = Array.from({ length: 20 }, (_, i) => stableShuffle(['a', 'b', 'c', 'd'], `student-${i}:q`).join(''));
    expect(new Set(shuffles).size).toBeGreaterThan(1);
    // The results screen shows the same order the attempt did.
    attempts.push({ _id: 'att-mine', quizId: QUIZ, studentId: STUDENT, tenantId: TENANT, status: 'submitted' });
    const review = (await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' } })).body;
    expect(review.map((q: any) => q.options.map((o: any) => o.text).join('|'))).toEqual(first);
  });
});

describe('grading', () => {
  const start = (id = 'att-1', studentId = STUDENT) => attempts.push({ _id: id, quizId: QUIZ, studentId, tenantId: TENANT, status: 'in_progress', startedAt: new Date() });
  const submit = (answers: any[], over: any = {}) =>
    call(quizController.submitQuizAttempt, { params: { quizId: QUIZ, attemptId: 'att-1' }, body: { answers }, ...over });

  it('5-6-8. grades what the student chose, by the stored question, whatever order it was shown in', async () => {
    start();
    const shown = (await call(quizController.getQuizQuestions)).body;
    // The correct option wherever it landed for this student, for questions 1 and 2; a wrong one for question 3.
    const answers = shown.map((q: any, i: number) => {
      const stored = questions.find(x => x._id === q._id)!;
      const pick = i < 2 ? stored.options[0].text : stored.options[1].text;
      return { questionId: q._id, selectedOptions: [q.options.find((o: any) => o.text === pick).text] };
    });
    const out = await submit(answers);
    expect(out.status).toBe(200);
    expect(attempts[0]).toMatchObject({ status: 'submitted', obtainedMarks: 2 });
  });

  it('10. forged answers cannot add marks: positions, another quiz\'s questions and repeated answers score nothing extra', async () => {
    start();
    const foreignQuiz = new mongoose.Types.ObjectId().toString();
    const foreign = question(9, foreignQuiz);
    questions.push(foreign);
    const out = await submit([
      { questionId: questions[0]._id, selectedOptions: ['0'], displayedOrder: [0, 1, 2, 3] },
      { questionId: questions[1]._id, selectedOptions: [questions[1].options[0].text] },
      { questionId: questions[1]._id, selectedOptions: [questions[1].options[0].text] },
      { questionId: foreign._id, selectedOptions: [foreign.options[0].text] },
    ]);
    expect(out.status).toBe(200);
    expect(attempts[0].obtainedMarks).toBe(1);
  });

  it('12. a student cannot submit, or read the results of, another student\'s attempt', async () => {
    start('att-1', OTHER_STUDENT);
    expect((await submit([{ questionId: questions[0]._id, selectedOptions: ['1-A correct'] }])).status).toBe(403);
    attempts[0].status = 'submitted';
    submissions.push({ quizAttemptId: 'att-1', questionId: questions[0]._id, correctAnswer: '1-A correct', isCorrect: true });
    const results = await call(quizController.getQuizResults, { params: { attemptId: 'att-1' } });
    expect(results.status).toBe(403);
    expect(JSON.stringify(results.body)).not.toContain('1-A correct');
    // Their own, and an author reviewing it, still can.
    expect((await call(quizController.getQuizResults, { params: { attemptId: 'att-1' }, userId: OTHER_STUDENT, user: { id: OTHER_STUDENT, role: 'STUDENT' } })).status).toBe(200);
    expect((await call(quizController.getQuizResults, { params: { attemptId: 'att-1' }, ...asAdmin })).status).toBe(200);
  });
});

describe('tenant isolation', () => {
  it('11. a quiz of another tenant is not found — not its questions, not its answers, not its attempt feed', async () => {
    quizzes[0].tenantId = OTHER_TENANT;
    expect((await call(questionController.getQuestionsForQuiz, { query: { includeAnswers: 'true' }, ...asAdmin })).status).toBe(404);
    expect((await call(questionController.getQuestionById, { params: { quizId: QUIZ, questionId: questions[0]._id }, ...asAdmin })).status).toBe(404);
    expect((await call(quizController.getQuizQuestions)).status).toBe(404);
  });
});
