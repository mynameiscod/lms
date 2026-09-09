import { selectItems, PoolItem, AssessmentSlot } from '../services/personalizedAssessmentService';

/**
 * Selecting by FACT rather than by item id.
 *
 * The foundation bank is generated: about forty thousand rows resting on roughly three hundred
 * and forty curriculum facts, so one fact underlies more than a hundred items. Every guarantee
 * the selector previously got from "never use the same id twice" is worth nothing there — the
 * ids are all different and the questions are the same.
 *
 * Two failures follow, and neither shows up in a score. A skill's four slots can all land on one
 * fact, producing a confident measurement of a single piece of knowledge. And a re-assessment can
 * re-ask what the student already answered, reading the remembered answer as improvement. Both
 * are asserted here because both are invisible everywhere else.
 *
 * Hand-authored content has no factKeys and must be untouched by any of this: there, one item
 * genuinely is one question.
 */

const slot = (skillKey: string, difficulty: any = 'EASY'): AssessmentSlot =>
  ({ skillKey, difficulty, reason: 'role_blueprint' } as any);

/** `n` items for one skill, each testing exactly `facts[i % facts.length]`. */
const itemsOn = (skillKey: string, n: number, facts: string[]): PoolItem[] =>
  Array.from({ length: n }, (_, i) => ({
    sourceType: 'assessment_item',
    sourceId: `${skillKey}-item-${i}`,
    difficulty: 'EASY' as any,
    factKeys: [facts[i % facts.length]],
  }));

const poolOf = (skillKey: string, items: PoolItem[]) => new Map([[skillKey, items]]);

describe('one paper never spends two slots on the same fact', () => {
  it('picks four different facts when the skill has plenty', () => {
    // Forty items, ten facts, four copies of each fact. Choosing by id alone would happily
    // return four items and no guarantee at all about how many facts they cover.
    const facts = Array.from({ length: 10 }, (_, i) => `fact-${i}`);
    const { items, report } = selectItems(
      [slot('A'), slot('A'), slot('A'), slot('A')],
      poolOf('A', itemsOn('A', 40, facts)),
      'seed-fact-1',
    );

    expect(items).toHaveLength(4);
    expect(new Set(items.map(i => i.sourceId)).size).toBe(4);
    expect(report.repeatedFactsInPaper).toBe(0);
  });

  it('still fills the paper when the skill has fewer facts than slots', () => {
    /**
     * Two facts, four slots. The fact rule cannot be satisfied, and refusing would be the wrong
     * answer: an unfilled slot fails the whole assessment, so a repeat is the lesser harm. What
     * matters is that the repeat is COUNTED — silently returning four items would report a
     * skill measured four ways when it was measured twice.
     */
    const { items, report } = selectItems(
      [slot('A'), slot('A'), slot('A'), slot('A')],
      poolOf('A', itemsOn('A', 20, ['fact-1', 'fact-2'])),
      'seed-fact-2',
    );

    expect(items).toHaveLength(4);
    expect(report.shortfalls).toEqual([]);
    expect(report.repeatedFactsInPaper).toBe(2);
  });

  it('leaves hand-authored items alone, where one item is one question', () => {
    // No factKeys anywhere: the rule must not engage and must not cost a slot.
    const authored: PoolItem[] = Array.from({ length: 10 }, (_, i) => ({
      sourceType: 'question', sourceId: `q-${i}`, difficulty: 'EASY' as any,
    }));
    const { items, report } = selectItems(
      [slot('A'), slot('A'), slot('A'), slot('A')],
      poolOf('A', authored),
      'seed-fact-3',
    );

    expect(items).toHaveLength(4);
    expect(new Set(items.map(i => i.sourceId)).size).toBe(4);
    expect(report.repeatedFactsInPaper).toBe(0);
  });
});

describe('a re-assessment is fresh in substance, not just in ids', () => {
  const facts = Array.from({ length: 10 }, (_, i) => `fact-${i}`);
  const pool = itemsOn('A', 40, facts);

  it('prefers facts the student has not been asked about', () => {
    const seenFactKeys = ['fact-0', 'fact-1', 'fact-2', 'fact-3'];
    const { items } = selectItems(
      [slot('A'), slot('A'), slot('A'), slot('A')],
      poolOf('A', pool),
      'seed-retake-1',
      { allowDifficultyFallback: true, seenFactKeys },
    );

    const served = items.flatMap(i => pool.find(p => p.sourceId === i.sourceId)!.factKeys!);
    expect(served.some(f => seenFactKeys.includes(f))).toBe(false);
  });

  it('reports staleness that id matching cannot see', () => {
    /**
     * The regression this whole file exists for, stated so it cannot pass by luck.
     *
     * Forty items, four facts, and the student has met all four — through different ids last
     * time, which is the normal case when a hundred rows share a fact. Matching on ids finds
     * nothing familiar and calls the paper entirely fresh. Matching on facts sees the truth:
     * every question is one the student has already answered.
     */
    const fourFacts = ['fact-0', 'fact-1', 'fact-2', 'fact-3'];
    const narrow = itemsOn('A', 40, fourFacts);
    const slots = [slot('A'), slot('A'), slot('A'), slot('A')];

    const byId = selectItems(slots, poolOf('A', narrow), 'seed-retake-x',
      { allowDifficultyFallback: true, seenSourceIds: [] });
    const byFact = selectItems(slots, poolOf('A', narrow), 'seed-retake-x',
      { allowDifficultyFallback: true, seenFactKeys: fourFacts });

    expect(byId.report.repeatedFromPreviousAttempt).toBe(0);
    expect(byFact.report.repeatedFromPreviousAttempt).toBe(4);
  });

  it('treats an item as fresh while any one of its facts is new', () => {
    /**
     * A bundled item carries several claims. Retiring it because most are familiar would empty
     * the pool for no gain — the student has still never been asked the remaining one.
     */
    const bundled: PoolItem[] = [
      { sourceType: 'assessment_item', sourceId: 'all-old', difficulty: 'EASY' as any, factKeys: ['f1', 'f2'] },
      { sourceType: 'assessment_item', sourceId: 'part-new', difficulty: 'EASY' as any, factKeys: ['f1', 'f9'] },
    ];
    const { items } = selectItems(
      [slot('A')],
      poolOf('A', bundled),
      'seed-retake-2',
      { allowDifficultyFallback: true, seenFactKeys: ['f1', 'f2'] },
    );

    expect(items[0].sourceId).toBe('part-new');
  });

  it('still serves a paper when every fact has been seen before', () => {
    // Exhausted content must degrade to a repeat, never to a refusal.
    const { items, report } = selectItems(
      [slot('A'), slot('A')],
      poolOf('A', pool),
      'seed-retake-3',
      { allowDifficultyFallback: true, seenFactKeys: facts },
    );

    expect(items).toHaveLength(2);
    expect(report.shortfalls).toEqual([]);
    expect(report.repeatedFromPreviousAttempt).toBe(2);
  });
});
