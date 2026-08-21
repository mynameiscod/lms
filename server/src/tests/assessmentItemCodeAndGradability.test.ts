/**
 * Two faults found by a student sitting a real paper.
 *
 * Question 20 read "Which line has the bug in this SQL-query-building utility?" with no
 * code on the screen, and answering it counted for nothing.
 *
 *   1. AssessmentItem.codeSnippet exists precisely for debug / predict_output /
 *      complete_code items, and the evidence adapter dropped it. The question arrived
 *      without the thing it was asking about.
 *
 *   2. Those items carry no options, so the grader cannot mark them: they render as a
 *      free-text box, record as "not marked right or wrong", and contribute nothing to
 *      Skill DNA — while occupying a slot that was supposed to measure something.
 *
 * Only `mcq` items in that bank have options. These pin both rules.
 */

const findAssessmentItem = jest.fn();
const findQuestion = jest.fn();
const findEvidence = jest.fn();
const createEvidence = jest.fn();

jest.mock('../models/AssessmentItem', () => ({
  __esModule: true,
  default: { find: (...a: any[]) => findAssessmentItem(...a) },
}));
jest.mock('../models/Question', () => ({
  __esModule: true,
  default: {
    find: (...a: any[]) => findQuestion(...a),
    create: async (doc: any) => ({ _id: 'new-q', ...doc }),
  },
}));
jest.mock('../models/SkillEvidence', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => ({ select: () => ({ lean: async () => findEvidence(...a) }) }),
    create: (...a: any[]) => { createEvidence(...a); return Promise.resolve({}); },
  },
}));
jest.mock('../models/PassportAssessment', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }) } }));
jest.mock('../models/ThinkingProblem', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }) } }));

import { SOURCE_ADAPTERS } from '../services/skillEvidenceSourceRegistry';
import { seedBackendPilotContent } from '../services/backendPilotSeedService';

const lean = (rows: any[]) => ({ lean: async () => rows });
const selectLean = (rows: any[]) => ({ select: () => ({ lean: async () => rows }) });

beforeEach(() => {
  findAssessmentItem.mockReset();
  findQuestion.mockReset();
  findEvidence.mockReset().mockResolvedValue(null);
  createEvidence.mockReset();
});

describe('the code a question is about', () => {
  it('is carried into the paper, with its language', async () => {
    findAssessmentItem.mockReturnValue(lean([{
      _id: 'i1', type: 'debug', prompt: 'Which line has the bug?',
      codeSnippet: 'function f() {\n  return 1;\n}', language: 'JavaScript',
      difficulty: 4,
    }]));

    const items = await SOURCE_ADAPTERS.assessment_item.loadMany('t1', ['i1']);

    expect(items[0].text).toBe('Which line has the bug?');
    expect(items[0].codeSnippet).toContain('return 1;');
    expect(items[0].language).toBe('JavaScript');
  });

  it('is simply absent for an item that has none', async () => {
    findAssessmentItem.mockReturnValue(lean([{ _id: 'i2', type: 'mcq', prompt: 'What is 2+2?', difficulty: 2 }]));
    const items = await SOURCE_ADAPTERS.assessment_item.loadMany('t1', ['i2']);
    expect(items[0].codeSnippet).toBeUndefined();
  });
});

describe('only gradable items become evidence', () => {
  /** The seeder asks for items; assert what it asked FOR, not just what it did with them. */
  it('requires options when selecting existing bank items', async () => {
    findQuestion.mockReturnValue(selectLean([]));       // no authored questions present yet
    findAssessmentItem.mockReturnValue(selectLean([]));

    await seedBackendPilotContent({ tenantId: 't1', createdBy: 'test', dryRun: true });

    // Every reuse lookup must constrain on options existing and being non-empty.
    const lookups = [...findAssessmentItem.mock.calls, ...findQuestion.mock.calls]
      .map(c => c[0])
      .filter(q => q && q.options !== undefined);

    expect(lookups.length).toBeGreaterThan(0);
    for (const q of lookups) {
      expect(q.options).toEqual({ $exists: true, $not: { $size: 0 } });
    }
  });

  it('no longer maps the ungradable debug items', async () => {
    // They were withdrawn from EXISTING_REUSE outright: genuine exercises, but nothing in
    // this bank can mark them, and a slot spent on one measures nothing.
    const { EXISTING_REUSE } = require('../data/backendPilotQuestionBank');
    const debugReuse = EXISTING_REUSE.filter(
      (r: any) => r.sourceType === 'assessment_item' && r.match?.value === 'debug',
    );
    expect(debugReuse).toEqual([]);
  });

  it('keeps a HARD debugging band from the authored multiple-choice items', async () => {
    // Withdrawing the reuse must not leave the band empty — that would fail generation.
    const { BACKEND_PILOT_QUESTIONS } = require('../data/backendPilotQuestionBank');
    const hardDebugging = BACKEND_PILOT_QUESTIONS.filter(
      (q: any) => q.skillKey === 'DEBUGGING' && q.difficulty === 'hard',
    );
    expect(hardDebugging.length).toBeGreaterThanOrEqual(2);
    for (const q of hardDebugging) expect(q.options.length).toBeGreaterThanOrEqual(4);
  });
});
