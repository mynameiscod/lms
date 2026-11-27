/**
 * Question Pools, against a real database.
 *
 * A pool only links bank questions, refuses one that could not be drawn into a paper, never
 * reaches another institute's questions, and its MCQ import writes into the Question Bank.
 */
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'question-pool-integration-test-secret-0123456789abcdef';

import User from '../../models/User';
import Question from '../../models/Question';
import * as XLSX from 'xlsx';
import CodingProblem, { CodingProblemTestCase, availableTo } from '../../models/CodingProblem';
import { csvTemplate } from '../../services/problemImportService';
import questionPoolRoutes from '../../routes/questionPoolRoutes';
import { createProblem, setStatus, Actor } from '../../services/problemBankService';
import { SAMPLE_PROBLEM } from '../../services/problemImportService';
import * as pools from '../../services/questionPoolService';

/** The coding template cut to its first problem (Sum of Two Numbers: 2 open tests, 3 hidden). */
const allTemplate = csvTemplate({ complete: true });
const oneProblem = allTemplate.slice(0, allTemplate.indexOf('"Right-Angled Star Triangle"'));
/** One more row in the template's own columns. */
const templateRow = (o: Record<string, string>) =>
  allTemplate.split('\n')[0].split(',').map(h => `"${(o[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';

const ME: Actor = { userId: '507f1f77bcf86cd799439a01', tenantId: '507f1f77bcf86cd799439b01', role: 'TENANT_ADMIN' };
const OTHER: Actor = { userId: '507f1f77bcf86cd799439a02', tenantId: '507f1f77bcf86cd799439b02', role: 'TENANT_ADMIN' };

const mcq = (a: Actor, question: string, extra: any = {}) => Question.create({
  tenantId: a.tenantId, createdBy: a.userId, type: 'mcq_single', question, marks: 1,
  options: [{ text: 'Yes', isCorrect: true }, { text: 'No', isCorrect: false }], correctAnswers: ['Yes'],
  difficultyLevel: 'easy', ...extra,
}).then(q => String(q._id));

/** A problem given to the LMS (exam pools are LMS), unless `lms` is false: then it is not assigned yet. */
const problem = async (a: Actor, title: string, publish: boolean, lms = true) => {
  const r = await createProblem(a, {
    ...SAMPLE_PROBLEM, title, status: 'draft', audiences: lms ? ['lms'] : [],
    tests: (SAMPLE_PROBLEM.tests || []).map((t) => ({ ...t, expectedOutput: t.expectedOutput || '2000000000' })),
  } as any);
  const id = String(r.problem._id);
  if (publish) await setStatus(a, id, 'published');
  return id;
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('MCQ pools', () => {
  it('links good questions, refuses broken ones with the reason, and counts by level', async () => {
    const good = await mcq(ME, 'Is 2 even?');
    const hard = await mcq(ME, 'Is P = NP?', { difficultyLevel: 'hard' });
    const noKey = await mcq(ME, 'No answer marked', { options: ['A', 'B'], correctAnswers: [] });
    const theirs = await mcq(OTHER, 'Another institute');

    const pool = await pools.createPool(ME, { name: 'Aptitude', kind: 'mcq' });
    const r = await pools.addQuestions(ME, pool.id, [good, hard, noKey, theirs, good]);

    expect(r.added).toBe(2);
    expect(r.refused.find(x => x.id === noKey)?.reason).toMatch(/No correct answer/);
    expect(r.refused.find(x => x.id === theirs)?.reason).toMatch(/Not found/);
    expect(r.pool.counts).toMatchObject({ total: 2, usable: 2, easy: 1, medium: 0, hard: 1 });
  });

  it('reads plain-string options with the answer stored as text', async () => {
    const id = await mcq(ME, 'Old style', { options: ['Red', 'Blue'], correctAnswers: ['Blue'] });
    const pool = await pools.createPool(ME, { name: 'Old', kind: 'mcq' });
    expect((await pools.addQuestions(ME, pool.id, [id])).added).toBe(1);
  });

  it('shows a question that later breaks in the bank as unusable, not silently dropped', async () => {
    const id = await mcq(ME, 'Will be deleted');
    const pool = await pools.createPool(ME, { name: 'P', kind: 'mcq' });
    await pools.addQuestions(ME, pool.id, [id]);
    await Question.deleteOne({ _id: id });
    const v = await pools.getPool(ME, pool.id);
    expect(v.counts).toMatchObject({ total: 1, usable: 0 });
    expect(v.questions[0].problem).toMatch(/No longer in the bank/);
  });

  it('imports a spreadsheet into the bank and the pool, refusing rows without a matching answer', async () => {
    const pool = await pools.createPool(ME, { name: 'Imported', kind: 'mcq' });
    const r = await pools.importMcqs(ME, pool.id, [
      { question: 'Capital of India?', options: ['Delhi', 'Mumbai'], correct: 'A', difficulty: 'Easy', subject: 'GK' },
      { question: '2 + 2?', options: ['3', '4'], correct: '4' },
      { question: 'Broken', options: ['x', 'y'], correct: 'z' },
    ]);
    expect(r.imported).toBe(2);
    expect(r.refused).toEqual([{ row: 3, reason: 'Answer "z" matches no option' }]);
    const stored = await Question.find({ tenantId: ME.tenantId }).lean() as any[];
    expect(stored).toHaveLength(2);
    expect(stored.find(q => q.question === '2 + 2?').correctAnswers).toEqual(['4']);
    expect(r.pool.counts.usable).toBe(2);
  });

  it('browses the bank with in-pool flags and filters', async () => {
    const a = await mcq(ME, 'Arrays one', { subject: 'Java' });
    await mcq(ME, 'Strings one', { subject: 'Python' });
    const pool = await pools.createPool(ME, { name: 'Browse', kind: 'mcq' });
    await pools.addQuestions(ME, pool.id, [a]);
    const r = await pools.browseBank(ME, pool.id, { subject: 'java' });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ id: a, inPool: true, problem: '' });
  });
});

describe('coding pools', () => {
  it('takes published problems with tests and refuses drafts', async () => {
    const live = await problem(ME, 'Sum of two', true);
    const draft = await problem(ME, 'Still a draft', false);
    const pool = await pools.createPool(ME, { name: 'Java coding', kind: 'coding' });
    const r = await pools.addQuestions(ME, pool.id, [live, draft]);
    expect(r.added).toBe(1);
    expect(r.refused[0].reason).toMatch(/Not published/);

    // A problem not given to the LMS yet is refused too, with the reason.
    const unassigned = await problem(ME, 'Not assigned', true, false);
    expect((await pools.addQuestions(ME, pool.id, [unassigned])).refused[0].reason).toBe('Not available to the LMS');

    await CodingProblem.updateOne({ _id: live }, { status: 'archived' });
    expect((await pools.getPool(ME, pool.id)).counts.usable).toBe(0);
  });

  it('imports a CSV of coding problems as published, LMS-only exam questions, refusing incomplete rows', async () => {
    const pool = await pools.createPool(ME, { name: 'Imported coding', kind: 'coding' });
    const csv = oneProblem
      + templateRow({ title: 'No tests', difficulty: 'easy', marks: '5', statement: 'Print hi' })
      + templateRow({ title: 'Tagged DSA', difficulty: 'medium', marks: '10', topics: 'arrays', tags: 'DSA', available_to: 'careerpilot',
        statement: 'Echo the line', sample_input_1: 'x', sample_output_1: 'x', sample_input_2: 'y', sample_output_2: 'y', starter_python: 'print(input())' });
    const r = await pools.importFile(ME, pool.id, { filename: 'coding.csv', data: Buffer.from(csv).toString('base64') });
    expect(r.imported).toBe(2);
    expect(r.refused).toHaveLength(1);
    expect(r.refused[0]).toMatchObject({ row: 2 });
    expect(r.refused[0].reason).toMatch(/test/i);
    expect(r.pool.counts.usable).toBe(2);

    const made = await CodingProblem.find({ tenantId: ME.tenantId }).lean() as any[];
    expect(made.map(p => p.status)).toEqual(['published', 'published']);
    for (const p of made) {
      expect(p.audiences).toEqual(['lms']);
      expect(p.tags).toContain('Exam');
    }
    // Even a row tagged DSA stays out of the CareerPilot practice library: it is LMS only.
    const cp = await CodingProblem.countDocuments({ tenantId: ME.tenantId, ...availableTo('careerpilot') });
    expect(cp).toBe(0);
  });

  it('imports MCQs from an Excel file', async () => {
    const pool = await pools.createPool(ME, { name: 'Excel MCQs', kind: 'mcq' });
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Question', 'Option A', 'Option B', 'Option C', 'Correct', 'Difficulty'],
      ['2 + 2?', '3', '4', '5', 'B', 'Easy'],
      ['Largest planet?', 'Mars', 'Jupiter', '', 'Jupiter', 'medium'],
      ['Broken', 'x', 'y', '', 'z', ''],
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
    const data = (XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer).toString('base64');
    const r = await pools.importFile(ME, pool.id, { filename: 'mcqs.xlsx', data });
    expect(r.imported).toBe(2);
    expect(r.refused).toEqual([{ row: 3, reason: 'Answer "z" matches no option' }]);
    const stored = await Question.findOne({ question: '2 + 2?' }).lean() as any;
    expect(stored.correctAnswers).toEqual(['4']);
  });

  it('says where a file in the other format belongs instead of refusing every row', async () => {
    const coding = await pools.createPool(ME, { name: 'Code', kind: 'coding' });
    const mcqs = await pools.createPool(ME, { name: 'Quiz', kind: 'mcq' });
    const b64 = (s: string) => Buffer.from(s).toString('base64');
    await expect(pools.importFile(ME, coding.id, { filename: 'm.csv', data: b64(pools.MCQ_TEMPLATE) })).rejects.toThrow(/MCQ format\. Import it into an MCQ pool/);
    await expect(pools.importFile(ME, mcqs.id, { filename: 'c.csv', data: b64(csvTemplate({ complete: true })) })).rejects.toThrow(/coding format\. Import it into a coding pool/);
    // The MCQ template itself imports cleanly into an MCQ pool.
    expect((await pools.importFile(ME, mcqs.id, { filename: 'm.csv', data: b64(pools.MCQ_TEMPLATE) })).imported).toBe(3);
  });

  it('keeps CSV values that start with zero exactly as typed', async () => {
    const pool = await pools.createPool(ME, { name: 'Zeros', kind: 'coding' });
    const csv = 'title,difficulty,marks,statement,sample_input_1,sample_output_1,test_input_1,test_output_1,starter_python\n'
      + '"Pad it",easy,5,"Print the number with zeros",0 5,005,007,007,"n = input()"\n';
    const r = await pools.importFile(ME, pool.id, { filename: 'zeros.csv', data: Buffer.from(csv).toString('base64') });
    expect(r.refused).toEqual([]);
    const p = await CodingProblem.findOne({ title: 'Pad it' }).lean() as any;
    const tests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean() as any[];
    expect(tests.map(t => [t.input, t.expectedOutput])).toEqual([['0 5', '005'], ['007', '007']]);

    const mcqs = await pools.createPool(ME, { name: 'Zero MCQs', kind: 'mcq' });
    const m = await pools.importFile(ME, mcqs.id, { filename: 'z.csv', data: Buffer.from('question,optionA,optionB,correct\n"5 - 5?",0,05,A\n').toString('base64') });
    expect(m.imported).toBe(1);
    expect((await Question.findOne({ question: '5 - 5?' }).lean() as any).correctAnswers).toEqual(['0']);
  });

  it('refuses a file that is not a spreadsheet', async () => {
    const pool = await pools.createPool(ME, { name: 'C', kind: 'coding' });
    await expect(pools.importFile(ME, pool.id, { filename: 'notes.txt', data: 'aGk=' })).rejects.toThrow(/\.csv, \.xlsx or \.xls/);
  });

  it('refuses an MCQ import into a coding pool', async () => {
    const pool = await pools.createPool(ME, { name: 'C', kind: 'coding' });
    await expect(pools.importMcqs(ME, pool.id, [{ question: 'q', options: ['a', 'b'], correct: 'a' }])).rejects.toThrow(/Only an MCQ pool/);
  });
});

describe('ownership and names', () => {
  it('keeps pools to their institute and names unique within it', async () => {
    const pool = await pools.createPool(ME, { name: 'Mine', kind: 'mcq' });
    await expect(pools.getPool(OTHER, pool.id)).rejects.toThrow(/Pool not found/);
    await expect(pools.createPool(ME, { name: 'mine', kind: 'mcq' })).rejects.toThrow(/already exists/);
    await expect(pools.createPool(OTHER, { name: 'Mine', kind: 'mcq' })).resolves.toBeTruthy();
  });
});

describe('routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/question-pools', questionPoolRoutes);
  const token = async (role: string, email: string) => {
    const u = await User.create({
      tenantId: new mongoose.Types.ObjectId(ME.tenantId), firstName: 'T', lastName: 'U', email, password: 'x', role, isActive: true,
    } as any);
    return jwt.sign({ id: String(u._id), email, role, tenantId: ME.tenantId }, process.env.JWT_SECRET as string);
  };

  it('lets an admin create and list pools', async () => {
    const t = await token('TENANT_ADMIN', 'admin@example.com');
    const c = await request(app).post('/api/v1/question-pools').set('Authorization', `Bearer ${t}`).send({ name: 'Route pool', kind: 'mcq' });
    expect(c.status).toBe(201);
    const l = await request(app).get('/api/v1/question-pools').set('Authorization', `Bearer ${t}`);
    expect(l.status).toBe(200);
    expect(l.body.data.map((p: any) => p.name)).toEqual(['Route pool']);
  });

  it('keeps students out', async () => {
    const t = await token('STUDENT', 'student@example.com');
    const r = await request(app).get('/api/v1/question-pools').set('Authorization', `Bearer ${t}`);
    expect(r.status).toBe(403);
  });
});

describe('questions a pool imported belong to it', () => {
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const mcqCsv = 'question,optionA,optionB,correct\n"Is 4 even?",Yes,No,A\n"Is 5 even?",Yes,No,B\n';

  it('skips a question already in the pool when the same file is imported again', async () => {
    const mcqs = await pools.createPool(ME, { name: 'Twice MCQ', kind: 'mcq' });
    expect((await pools.importFile(ME, mcqs.id, { filename: 'm.csv', data: b64(mcqCsv) })).imported).toBe(2);
    const again = await pools.importFile(ME, mcqs.id, { filename: 'm.csv', data: b64(mcqCsv) });
    expect(again.imported).toBe(0);
    expect(again.refused.map(r => r.reason)).toEqual(['Already in this pool', 'Already in this pool']);

    const coding = await pools.createPool(ME, { name: 'Twice coding', kind: 'coding' });
    const csv = oneProblem;
    expect((await pools.importFile(ME, coding.id, { filename: 'c.csv', data: b64(csv) })).imported).toBe(1);
    expect((await pools.importFile(ME, coding.id, { filename: 'c.csv', data: b64(csv) })).imported).toBe(0);
    expect(await CodingProblem.countDocuments({ tenantId: ME.tenantId })).toBe(1);
  });

  it('deletes them with the pool, but never a bank question or one used elsewhere', async () => {
    const bankMcq = await mcq(ME, 'From the bank');
    const bankProblem = await problem(ME, 'Bank problem', true);
    const mcqs = await pools.createPool(ME, { name: 'Owned MCQ', kind: 'mcq' });
    await pools.importFile(ME, mcqs.id, { filename: 'm.csv', data: b64(mcqCsv) });
    await pools.addQuestions(ME, mcqs.id, [bankMcq]);
    // One imported MCQ is also in another pool: it stays.
    const shared = String((await Question.findOne({ question: 'Is 5 even?' }).lean() as any)._id);
    const other = await pools.createPool(ME, { name: 'Other', kind: 'mcq' });
    await pools.addQuestions(ME, other.id, [shared]);

    const coding = await pools.createPool(ME, { name: 'Owned coding', kind: 'coding' });
    await pools.importFile(ME, coding.id, { filename: 'c.csv', data: b64(oneProblem) });
    await pools.addQuestions(ME, coding.id, [bankProblem]);

    expect((await pools.deletePool(ME, mcqs.id)).questionsDeleted).toBe(1);
    expect(await Question.exists({ question: 'Is 4 even?' })).toBeNull();
    expect(await Question.exists({ _id: shared })).not.toBeNull();
    expect(await Question.exists({ _id: bankMcq })).not.toBeNull();

    expect((await pools.deletePool(ME, coding.id)).questionsDeleted).toBe(1);
    expect(await CodingProblem.exists({ _id: bankProblem })).not.toBeNull();
    expect(await CodingProblem.countDocuments({ tenantId: ME.tenantId })).toBe(1);
    expect(await CodingProblemTestCase.countDocuments({ problemId: { $ne: new mongoose.Types.ObjectId(bankProblem) } })).toBe(0);
  });

  it('keeps an imported problem that was given to CareerPilot or drawn onto a paper', async () => {
    const coding = await pools.createPool(ME, { name: 'Kept coding', kind: 'coding' });
    await pools.importFile(ME, coding.id, { filename: 'c.csv', data: b64(oneProblem) });
    const id = (await pools.getPool(ME, coding.id)).questions[0].id;
    await CodingProblem.updateOne({ _id: id }, { $set: { audiences: ['lms', 'careerpilot'] } });
    expect((await pools.deletePool(ME, coding.id)).questionsDeleted).toBe(0);

    const mcqs = await pools.createPool(ME, { name: 'Kept MCQ', kind: 'mcq' });
    await pools.importFile(ME, mcqs.id, { filename: 'm.csv', data: b64(mcqCsv) });
    const used = (await pools.getPool(ME, mcqs.id)).questions[0].id;
    await mongoose.connection.collection('poolexamattempts').insertOne({ items: [{ refId: new mongoose.Types.ObjectId(used) }] });
    await pools.removeQuestions(ME, mcqs.id, [used]);
    expect(await Question.exists({ _id: used })).not.toBeNull();
    expect((await pools.deletePool(ME, mcqs.id)).questionsDeleted).toBe(1);
  });
});

describe('spreadsheet imports read what authors write', () => {
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const BS = String.fromCharCode(92);

  it('the coding template has 2 open and 3 hidden tests per problem, and its pattern problem keeps its lines', async () => {
    const pool = await pools.createPool(ME, { name: 'Template', kind: 'coding' });
    const r = await pools.importFile(ME, pool.id, { filename: 'c.csv', data: b64(csvTemplate({ complete: true })) });
    expect(r.refused).toEqual([]);
    expect(r.imported).toBe(2);
    const made = await CodingProblem.find({ tenantId: ME.tenantId }).sort({ title: -1 }).lean() as any[];
    for (const p of made) {
      const tests = await CodingProblemTestCase.find({ problemId: p._id }).lean() as any[];
      expect(tests.filter(t => t.isSample)).toHaveLength(2);
      expect(tests.filter(t => !t.isSample)).toHaveLength(3);
    }
    const pattern = made.find(p => /Star Triangle/.test(p.title));
    const tests = await CodingProblemTestCase.find({ problemId: pattern._id }).sort({ order: 1 }).lean() as any[];
    expect(tests[0].expectedOutput).toBe('*\n**\n***');
    expect(pattern.statement).toContain('\nRow i has i stars.');
  });

  it('turns typed \n into lines, keeps \n inside code strings, and reads other column names', async () => {
    const pool = await pools.createPool(ME, { name: 'Typed', kind: 'coding' });
    const csv = 'Title,Difficulty,Description,Input 1,Output 1,Input 2,Output 2,Input 3,Output 3,Input 4,Output 4,Input 5,Output 5,Solution Python,Notes\n'
      + `"Count Down",easy,"Print n down to 1.${BS}nOne number per line.","3","3${BS}n2${BS}n1","1","1","2","2${BS}n1","4","4${BS}n3${BS}n2${BS}n1","5","5${BS}n4${BS}n3${BS}n2${BS}n1","n=int(input())${BS}nprint('${BS}n'.join(str(i) for i in range(n,0,-1)))",ignored\n`;
    const r: any = await pools.importFile(ME, pool.id, { filename: 'x.csv', data: b64(csv) });
    expect(r.refused).toEqual([]);
    expect(r.notRead).toEqual(['Notes']);
    const p: any = await CodingProblem.findOne({ tenantId: ME.tenantId, title: 'Count Down' }).lean();
    expect(p.statement).toBe('Print n down to 1.\nOne number per line.');
    expect(p.languages.find((l: any) => l.language === 'python').solutionCode).toBe(`n=int(input())\nprint('${BS}n'.join(str(i) for i in range(n,0,-1)))`);
    const tests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean() as any[];
    expect(tests.map(t => [t.expectedOutput, t.isSample])).toEqual([
      ['3\n2\n1', true], ['1', true], ['2\n1', false], ['4\n3\n2\n1', false], ['5\n4\n3\n2\n1', false],
    ]);
  });

  it('MCQs: other column names, a code question over several lines, the answer as text, and the explanation kept', async () => {
    const pool = await pools.createPool(ME, { name: 'MCQ names', kind: 'mcq' });
    const csv = 'Question Text,Option 1,Option 2,Option 3,Correct Answer,Explanation\n'
      + `"What does this print?${BS}nfor i in range(2):${BS}n    print(i)","0 1","0${BS}n1","1 2","0${BS}n1","Each print ends its line."\n`;
    const r = await pools.importFile(ME, pool.id, { filename: 'm.csv', data: b64(csv) });
    expect(r.refused).toEqual([]);
    const q: any = await Question.findOne({ tenantId: ME.tenantId }).lean();
    expect(q.question).toBe('What does this print?\nfor i in range(2):\n    print(i)');
    expect(q.options.find((o: any) => o.isCorrect).text).toBe('0\n1');
    expect(q.explanation).toBe('Each print ends its line.');
    const t = await pools.importFile(ME, pool.id, { filename: 't.csv', data: b64(pools.MCQ_TEMPLATE) });
    expect(t.refused).toEqual([]);
    expect(t.imported).toBe(3);
  });
});
