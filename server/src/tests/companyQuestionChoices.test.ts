/**
 * Regression: a banked multiple-choice question must survive being stored.
 *
 * `mockTestService.assembleTest()` draws the company's own questions by reading `options` and
 * `correctIndex` and keeping the rows it can mark. The CompanyQuestion schema declared
 * NEITHER FIELD, so Mongoose stripped both on write and on read, every banked row failed that
 * filter, and every company mock test was assembled entirely from AI-generated items — at
 * companies with a full curated bank, and silently, because `bankedCount: 0` looks exactly
 * like "the bank was empty".
 *
 * The first test below is the one that mattered: it builds a real model instance, which is
 * where Mongoose discards undeclared paths, and would have failed against the old schema.
 */

jest.mock('../services/aiGateway', () => ({ __esModule: true, aiComplete: async () => '[]' }));

import { normaliseChoices, MIN_CHOICES, MAX_CHOICES } from '../services/companyQuestionService';

const { CompanyQuestion } = jest.requireActual('../models/CompanyQuestionModels');

const row = (over: any = {}) => new CompanyQuestion({
  tenantId: 't1',
  companyId: '507f1f77bcf86cd799439011',
  companySlug: 'acme',
  questionText: 'Which of these is O(log n)?',
  ...over,
});

describe('the schema keeps what the mock test needs', () => {
  it('stores the choices and the answer key', () => {
    const q = row({ options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], correctIndex: 1 });

    // Undeclared paths are dropped here, before any database is involved. This is the
    // assertion the shipped schema failed.
    expect(q.options).toEqual(['O(n)', 'O(log n)', 'O(n^2)', 'O(1)']);
    expect(q.correctIndex).toBe(1);
  });

  it('leaves an ordinary prose question with no choices at all', () => {
    const q = row({ answer: 'Because the tree halves each step.' });

    expect(q.options).toEqual([]);
    expect(q.correctIndex).toBeNull();
    expect(q.answer).toBe('Because the tree halves each step.');
  });

  it('does not disturb the fields the bank already had', () => {
    const q = row({ round: 'aptitude', category: 'quantitative', difficulty: 'easy', source: 'admin' });

    expect(q.round).toBe('aptitude');
    expect(q.category).toBe('quantitative');
    expect(q.status).toBe('published');
    expect(q.aiPredicted).toBe(false);
  });
});

// ── normalisation ───────────────────────────────────────────────────────────

describe('normalising a submitted question', () => {
  it('accepts a well-formed multiple-choice question', () => {
    expect(normaliseChoices({ options: ['a', 'b', 'c', 'd'], correctIndex: 2 }))
      .toEqual({ options: ['a', 'b', 'c', 'd'], correctIndex: 2 });
  });

  it('accepts the shortest real question — two choices', () => {
    expect(normaliseChoices({ options: ['True', 'False'], correctIndex: 0 }))
      .toEqual({ options: ['True', 'False'], correctIndex: 0 });
    expect(MIN_CHOICES).toBe(2);
  });

  it('returns nothing for a question that is not multiple choice', () => {
    expect(normaliseChoices({})).toEqual({ options: [], correctIndex: null });
    expect(normaliseChoices({ options: [] })).toEqual({ options: [], correctIndex: null });
  });

  /**
   * The whole point of doing this in one place. Each of these would otherwise store a
   * question the test still serves and marks EVERY candidate wrong on — worse than not
   * having it in the bank at all.
   */
  describe('refuses half an MCQ rather than storing a broken one', () => {
    it('drops choices with no answer key', () => {
      expect(normaliseChoices({ options: ['a', 'b', 'c', 'd'] }))
        .toEqual({ options: [], correctIndex: null });
    });

    it('drops a key that points past the last choice', () => {
      expect(normaliseChoices({ options: ['a', 'b'], correctIndex: 2 }))
        .toEqual({ options: [], correctIndex: null });
    });

    it('drops a negative key', () => {
      expect(normaliseChoices({ options: ['a', 'b'], correctIndex: -1 }))
        .toEqual({ options: [], correctIndex: null });
    });

    it('drops a key that is not a whole number', () => {
      expect(normaliseChoices({ options: ['a', 'b'], correctIndex: 1.5 }))
        .toEqual({ options: [], correctIndex: null });
      expect(normaliseChoices({ options: ['a', 'b'], correctIndex: 'first' }))
        .toEqual({ options: [], correctIndex: null });
    });

    it('drops a single choice, which is a statement rather than a question', () => {
      expect(normaliseChoices({ options: ['a'], correctIndex: 0 }))
        .toEqual({ options: [], correctIndex: null });
    });

    /**
     * `Number(null)` is 0, so reading the key with a plain Number() accepted "no option
     * selected" as "option A is correct" — a wrong answer key in a scored test, which marks
     * every candidate who answered correctly as wrong.
     */
    it('drops a null answer key instead of silently marking the first option correct', () => {
      expect(normaliseChoices({ options: ['a', 'b', 'c', 'd'], correctIndex: null }))
        .toEqual({ options: [], correctIndex: null });
    });

    it('drops an empty answer key rather than reading it as zero', () => {
      expect(normaliseChoices({ options: ['a', 'b', 'c', 'd'], correctIndex: '' }))
        .toEqual({ options: [], correctIndex: null });
      expect(normaliseChoices({ options: ['a', 'b', 'c', 'd'], correctIndex: '  ' }))
        .toEqual({ options: [], correctIndex: null });
    });
  });

  it('keeps a deliberate answer key of 0, because the first option can be correct', () => {
    // The distinction the fix turns on: absent is not zero, and zero is not absent.
    expect(normaliseChoices({ options: ['a', 'b'], correctIndex: 0 }))
      .toEqual({ options: ['a', 'b'], correctIndex: 0 });
  });

  it('reads an answer key that arrived as a string, as a form body would send it', () => {
    expect(normaliseChoices({ options: ['a', 'b', 'c'], correctIndex: '2' }))
      .toEqual({ options: ['a', 'b', 'c'], correctIndex: 2 });
  });

  it('discards blank choices before deciding whether enough are left', () => {
    // Three typed boxes, one left empty — two real choices, and the key still points at "b".
    expect(normaliseChoices({ options: ['a', '  ', 'b'], correctIndex: 1 }))
      .toEqual({ options: ['a', 'b'], correctIndex: 1 });
  });

  it('trims a runaway list rather than storing it', () => {
    const many = Array.from({ length: 12 }, (_, i) => `opt${i}`);
    const r = normaliseChoices({ options: many, correctIndex: 1 });

    expect(r.options).toHaveLength(MAX_CHOICES);
    expect(r.correctIndex).toBe(1);
  });

  it('drops the key when trimming would leave it pointing nowhere', () => {
    const many = Array.from({ length: 12 }, (_, i) => `opt${i}`);
    expect(normaliseChoices({ options: many, correctIndex: 9 }))
      .toEqual({ options: [], correctIndex: null });
  });
});
