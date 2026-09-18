/**
 * Saving a question of one type must not carry another type's half-finished fields.
 *
 * THE BUG THIS EXISTS FOR. A new item starts as an MCQ with two blank options. Switching the
 * type to a coding problem left `options: [{id:'a', text:''}, {id:'b', text:''}]` in the
 * payload, and Mongoose counts '' as missing for a `required` String — so the save died with a
 * validation error and the admin was told only "Failed to create item", with nothing naming
 * the field or the reason.
 *
 * Fixed on the SERVER rather than in the form, because the form is not the only caller: the AI
 * generator, an import script and any future screen would each have to remember.
 */

const captured: any[] = [];
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true,
  default: {
    create: jest.fn(async (doc: any) => { captured.push(doc); return { _id: 'new', ...doc }; }),
    findOneAndUpdate: jest.fn(async (_f: any, u: any) => { captured.push(u.$set); return { _id: 'x', ...u.$set }; }),
  },
}));
jest.mock('../services/assessmentQuestionGeneratorService', () => ({ generateItems: jest.fn() }));
jest.mock('../services/assessmentItemValidationService', () => ({ validateItemSolution: jest.fn() }));

import { createAssessmentItem, updateAssessmentItem } from '../controllers/assessmentItemController';

const run = async (body: any, fn = createAssessmentItem) => {
  const req: any = { body, tenantId: 't1', user: { id: 'u1' }, params: { id: 'x' } };
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(c: number) { this.statusCode = c; return this; },
    json(b: any) { this.body = b; return this; },
  };
  await fn(req, res);
  return res;
};

const codingBody = (over: any = {}) => ({
  type: 'live_code',
  dimension: 'dsa',
  difficulty: 5,
  prompt: 'Sum the numbers.',
  language: 'python',
  points: 10,
  testCases: [{ input: '1 2', expectedOutput: '3', hidden: true, weight: 1 }],
  ...over,
});

beforeEach(() => { captured.length = 0; });

describe('a coding question saves even when the form still holds MCQ leftovers', () => {
  it('saves, rather than failing validation on two blank options', async () => {
    const res = await run(codingBody({
      options: [{ id: 'a', text: '' }, { id: 'b', text: '' }],
      correctOptionIds: [],
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('does not store the other type\'s fields at all', async () => {
    await run(codingBody({
      options: [{ id: 'a', text: '' }],
      correctOptionIds: ['a'],
      expectedOutput: 'left over',
      buggyLineNumber: 3,
      blanks: [{ id: 'b1', acceptedAnswers: ['x'] }],
    }));
    const doc = captured[0];
    expect(doc.options).toBeUndefined();
    expect(doc.correctOptionIds).toBeUndefined();
    expect(doc.expectedOutput).toBeUndefined();
    expect(doc.buggyLineNumber).toBeUndefined();
    expect(doc.blanks).toBeUndefined();
    expect(doc.testCases).toHaveLength(1);
  });

  it('keeps what the type does need', async () => {
    await run(codingBody({ starterCode: 'def f():', functionSignature: 'f()' }));
    const doc = captured[0];
    expect(doc.starterCode).toBe('def f():');
    expect(doc.functionSignature).toBe('f()');
    expect(doc.language).toBe('python');
  });
});

describe('an MCQ keeps its options and drops the code fields', () => {
  const mcq = (over: any = {}) => ({
    type: 'mcq', dimension: 'fundamentals', difficulty: 2, prompt: 'Which?',
    options: [{ id: 'a', text: 'Yes' }, { id: 'b', text: 'No' }],
    correctOptionIds: ['a'], ...over,
  });

  it('stores the options', async () => {
    const res = await run(mcq());
    expect(res.statusCode).toBe(200);
    expect(captured[0].options).toHaveLength(2);
  });

  it('drops starter code and test cases left over from a coding draft', async () => {
    await run(mcq({ starterCode: 'class Main {}', testCases: [{ input: '', expectedOutput: '1' }] }));
    expect(captured[0].starterCode).toBeUndefined();
    expect(captured[0].testCases).toBeUndefined();
  });

  /** A row the author started and abandoned is not a choice, and must not become one. */
  it('discards options with no text', async () => {
    await run(mcq({ options: [{ id: 'a', text: 'Yes' }, { id: 'b', text: '   ' }] }));
    expect(captured[0].options).toHaveLength(1);
    expect(captured[0].options[0].text).toBe('Yes');
  });

  it('still refuses an MCQ with nothing but blank options', async () => {
    const res = await run(mcq({ options: [{ id: 'a', text: '' }] }));
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/options/i);
  });
});

describe('the same rule applies on update', () => {
  it('does not write another type\'s fields back onto an existing item', async () => {
    await run(codingBody({ options: [{ id: 'a', text: '' }] }), updateAssessmentItem);
    expect(captured[0].options).toBeUndefined();
    expect(captured[0].testCases).toHaveLength(1);
  });
});

describe('a failure says what went wrong', () => {
  it('names the reason instead of only "failed"', async () => {
    const AssessmentItem = require('../models/AssessmentItem').default;
    AssessmentItem.create.mockRejectedValueOnce(new Error('E11000 duplicate key'));
    const res = await run(codingBody());
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toMatch(/duplicate key/);
  });
});
