import {
  aggregate, confidenceFor, evidenceWeightFor, performanceFor, explain,
  RELATIONSHIP_WEIGHT, DIFFICULTY_WEIGHT, SOURCE_WEIGHT,
  CONFIDENCE_THRESHOLDS, HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS, SKILL_DNA_VERSION,
} from '../data/skillDnaPolicy';

/**
 * Module 7 — how observations become a score, and how sure we are of it.
 *
 * Pure arithmetic, tested directly. These numbers will eventually be shown to students and
 * used to decide what they study, so the two properties that matter most are that the
 * formula is explainable and that confidence never quietly borrows from the score.
 */

const EV = (performance: number, evidenceWeight = 1, itemKey = `i${Math.random()}`) =>
  ({ performance, evidenceWeight, itemKey });

describe('one observation’s weight', () => {
  it('is relationship × difficulty × source', () => {
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'PERSONALIZED_ASSESSMENT' }))
      .toBeCloseTo(1.0);
    expect(evidenceWeightFor({ relationship: 'SECONDARY', difficulty: 'HARD', sourceType: 'PERSONALIZED_ASSESSMENT' }))
      .toBeCloseTo(RELATIONSHIP_WEIGHT.SECONDARY * DIFFICULTY_WEIGHT.HARD);
  });

  it('counts a secondary mapping, but far less than a primary one', () => {
    // The question exercised the skill without being about it.
    expect(RELATIONSHIP_WEIGHT.SECONDARY).toBeGreaterThan(0);
    expect(RELATIONSHIP_WEIGHT.SECONDARY).toBeLessThan(RELATIONSHIP_WEIGHT.PRIMARY / 2);
  });

  it('keeps difficulty bounded so one item cannot dominate a skill', () => {
    const spread = DIFFICULTY_WEIGHT.HARD / DIFFICULTY_WEIGHT.EASY;
    expect(spread).toBeLessThan(1.5);
    expect(DIFFICULTY_WEIGHT.HARD).toBeGreaterThan(DIFFICULTY_WEIGHT.EASY);
  });

  it('falls back safely for anything unrecognised', () => {
    expect(evidenceWeightFor({ relationship: 'NONSENSE', difficulty: 'NONSENSE', sourceType: 'NONSENSE' }))
      .toBeGreaterThan(0);
  });

  it('trusts only the one source that exists today', () => {
    expect(Object.keys(SOURCE_WEIGHT)).toEqual(['PERSONALIZED_ASSESSMENT']);
  });
});

describe('performance on one item', () => {
  it('is a fraction of the points available', () => {
    expect(performanceFor(1, 1)).toBe(1);
    expect(performanceFor(0, 1)).toBe(0);
    expect(performanceFor(7, 10)).toBeCloseTo(0.7);
  });

  it('preserves partial credit rather than flattening it to right-or-wrong', () => {
    // A coding item at 7/10 is genuinely different from a wrong answer.
    expect(performanceFor(7, 10)).not.toBe(0);
    expect(performanceFor(7, 10)).not.toBe(1);
  });

  it('survives nonsense from a grader without corrupting the average', () => {
    expect(performanceFor(5, 0)).toBe(0);
    expect(performanceFor(-3, 10)).toBe(0);
    expect(performanceFor(99, 10)).toBe(1);
    expect(performanceFor(NaN as any, 10)).toBe(0);
  });
});

describe('the score', () => {
  it('is the weighted average of performance, as a percentage', () => {
    const r = aggregate([EV(1, 1, 'a'), EV(0, 1, 'b')]);
    expect(r.score).toBe(50);
  });

  it('weights a hard question slightly more than an easy one', () => {
    // Right on hard, wrong on easy scores above 50; the reverse scores below.
    const hardRight = aggregate([
      EV(1, DIFFICULTY_WEIGHT.HARD, 'a'), EV(0, DIFFICULTY_WEIGHT.EASY, 'b'),
    ]);
    const easyRight = aggregate([
      EV(1, DIFFICULTY_WEIGHT.EASY, 'a'), EV(0, DIFFICULTY_WEIGHT.HARD, 'b'),
    ]);
    expect(hardRight.score).toBeGreaterThan(50);
    expect(easyRight.score).toBeLessThan(50);
  });

  it('is not a naive fraction correct — Scenario B', () => {
    // Easy right, medium right, hard wrong. Two of three is 66.67; the weighted answer is
    // lower, because the one they got wrong was the one that counted most.
    const r = aggregate([
      EV(1, DIFFICULTY_WEIGHT.EASY, 'a'),
      EV(1, DIFFICULTY_WEIGHT.MEDIUM, 'b'),
      EV(0, DIFFICULTY_WEIGHT.HARD, 'c'),
    ]);
    expect(r.score).not.toBe(67);
    expect(r.score).toBeLessThan(67);
  });

  it('is always within 0 and 100', () => {
    expect(aggregate([EV(1, 5, 'a')]).score).toBe(100);
    expect(aggregate([EV(0, 5, 'a')]).score).toBe(0);
    expect(aggregate([EV(2 as any, 1, 'a')]).score).toBeLessThanOrEqual(100);
    expect(aggregate([EV(-1 as any, 1, 'a')]).score).toBeGreaterThanOrEqual(0);
  });

  it('handles zero-weight evidence without dividing by zero', () => {
    expect(aggregate([EV(1, 0, 'a')]).score).toBe(0);
  });

  it('is 0 with no evidence at all — but nothing should create such a profile', () => {
    expect(aggregate([])).toEqual({
      score: 0, confidence: 'LOW', evidenceCount: 0, effectiveEvidenceWeight: 0, distinctItems: 0,
    });
  });
});

describe('confidence — how much we have to go on', () => {
  it('never looks at the score', () => {
    // The same weight and breadth must give the same confidence at any ability.
    const strong = aggregate(Array.from({ length: 8 }, (_, i) => EV(1, 1, `i${i}`)));
    const weak = aggregate(Array.from({ length: 8 }, (_, i) => EV(0, 1, `i${i}`)));
    expect(strong.confidence).toBe(weak.confidence);
    expect(strong.score).toBe(100);
    expect(weak.score).toBe(0);
  });

  it('is LOW on a single observation, however well it went — Scenario C', () => {
    const r = aggregate([EV(1, 1, 'a')]);
    expect(r.score).toBe(100);
    expect(r.confidence).toBe('LOW');
  });

  it('can be HIGH on a poor score — Scenario D', () => {
    // Twelve observations of consistent difficulty: we are quite sure they are struggling,
    // which is one of the most useful things the product can know.
    const r = aggregate(Array.from({ length: 12 }, (_, i) => EV(0.3, 1, `i${i}`)));
    expect(r.score).toBeLessThan(40);
    expect(r.confidence).toBe('HIGH');
  });

  it('rises with effective weight, not raw row count', () => {
    // Eight glancing secondary observations carry less than eight direct ones.
    const secondary = aggregate(Array.from({ length: 8 }, (_, i) => EV(1, RELATIONSHIP_WEIGHT.SECONDARY, `i${i}`)));
    const primary = aggregate(Array.from({ length: 8 }, (_, i) => EV(1, 1, `i${i}`)));
    expect(secondary.evidenceCount).toBe(primary.evidenceCount);
    expect(secondary.confidence).not.toBe('HIGH');
    expect(primary.confidence).toBe('HIGH');
  });

  it('requires breadth for HIGH — repetition is not corroboration', () => {
    // Ten answers to the SAME question: they may simply have remembered it.
    const repeated = aggregate(Array.from({ length: 10 }, () => EV(1, 1, 'same-item')));
    expect(repeated.effectiveEvidenceWeight).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.HIGH);
    expect(repeated.distinctItems).toBe(1);
    expect(repeated.confidence).not.toBe('HIGH');
  });

  it.each([
    [1, 1, 'LOW'],
    [CONFIDENCE_THRESHOLDS.MEDIUM, 3, 'MEDIUM'],
    [CONFIDENCE_THRESHOLDS.HIGH - 0.01, 5, 'MEDIUM'],
    [CONFIDENCE_THRESHOLDS.HIGH, HIGH_CONFIDENCE_MIN_DISTINCT_ITEMS, 'HIGH'],
  ])('weight %s across %s items → %s', (weight, items, expected) => {
    expect(confidenceFor(weight as number, items as number)).toBe(expected);
  });
});

describe('accumulating across attempts', () => {
  it('appends rather than replacing — Scenario F', () => {
    const first = [EV(0.2, 1, 'a'), EV(0.2, 1, 'b')];
    const second = [EV(1, 1, 'c'), EV(1, 1, 'd')];

    const before = aggregate(first);
    const after = aggregate([...first, ...second]);

    // Improvement shows because both sittings count, not because the first was discarded.
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.evidenceCount).toBe(4);
  });

  it('counts the same question in a different sitting as new evidence', () => {
    // Module 6 may reuse an item when the pool is small; a separate sitting is a separate
    // observation. Distinct-item breadth still recognises it as one question.
    const r = aggregate([EV(1, 1, 'q1'), EV(0, 1, 'q1')]);
    expect(r.evidenceCount).toBe(2);
    expect(r.distinctItems).toBe(1);
    expect(r.score).toBe(50);
  });
});

describe('explainability', () => {
  it('shows every observation and the arithmetic', () => {
    const { lines, score } = explain([
      { performance: 1, evidenceWeight: 0.85, itemKey: 'q1', difficulty: 'EASY', relationship: 'PRIMARY' },
      { performance: 0.5, evidenceWeight: 1.0, itemKey: 'q2', difficulty: 'MEDIUM', relationship: 'PRIMARY' },
      { performance: 1, evidenceWeight: 1.15, itemKey: 'q3', difficulty: 'HARD', relationship: 'PRIMARY' },
    ]);

    expect(lines).toHaveLength(4);           // three observations plus the workings
    expect(lines[0]).toContain('q1');
    expect(lines[0]).toContain('100%');
    expect(lines[0]).toContain('0.85');
    expect(lines[3]).toContain(String(score));
  });

  it('agrees exactly with the aggregate', () => {
    const ev = [EV(1, 1, 'a'), EV(0, 1.15, 'b'), EV(0.6, 0.85, 'c')];
    expect(explain(ev).score).toBe(aggregate(ev).score);
  });
});

describe('the policy is versioned and centralised', () => {
  it('declares one version', () => {
    expect(SKILL_DNA_VERSION).toBe('SKILL_DNA_V1');
  });

  it('keeps every weight in one place', () => {
    // Scattering these is how two code paths compute a student's ability differently.
    expect(RELATIONSHIP_WEIGHT.PRIMARY).toBe(1.0);
    expect(DIFFICULTY_WEIGHT.MEDIUM).toBe(1.0);
    expect(SOURCE_WEIGHT.PERSONALIZED_ASSESSMENT).toBe(1.0);
  });

  it('does not know about roles or career stages', () => {
    // Skill DNA is what a student demonstrated, independent of what they are aiming at.
    const policy = require('../data/skillDnaPolicy');
    const exported = Object.keys(policy).join(' ').toLowerCase();
    for (const forbidden of ['role', 'stage', 'readiness', 'gap', 'blueprint']) {
      expect(exported).not.toContain(forbidden);
    }
  });
});
