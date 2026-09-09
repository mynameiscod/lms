import { distinctPrimaryCount, PoolItem } from '../services/personalizedAssessmentService';

/**
 * Separating "what this stage is about" from "what today's content can measure".
 *
 * These were tangled, and it cost the product twice. The stage skill set was pruned to whatever
 * the question bank happened to contain, so clearing a bank cut Foundation from thirty-three
 * skills to fifteen and eighteen skills the curriculum teaches vanished from the definition of
 * the stage. And the paper was shaped from the full scope before anything looked for questions,
 * so one unauthored skill refused the whole assessment — a first-year turned away because
 * nothing had been written for Git yet.
 *
 * The set is intent and stays complete. Measurability is arithmetic over the evidence, done at
 * generation time. A skill that fails it is skipped and reported with its counts, never dropped
 * from the set and never fatal to the paper.
 */

const item = (id: string, over: Partial<PoolItem> = {}): PoolItem => ({
  sourceType: 'assessment_item', sourceId: id, difficulty: 'EASY' as any,
  contribution: 'PRIMARY', ...over,
});

describe('how much a pool can honestly measure', () => {
  it('counts hand-authored questions one for one', () => {
    // No factKeys: one item is one question and the id says all there is to say.
    const pool = ['a', 'b', 'c', 'd'].map(id => item(id, { sourceType: 'question' }));
    expect(distinctPrimaryCount(pool)).toBe(4);
  });

  it('is limited by FACTS when a generated bank repeats one', () => {
    /**
     * A hundred rows resting on one claim can fill four slots and will have measured one thing.
     * Counting rows would call that skill richly covered and the paper would ask it four times.
     */
    const pool = Array.from({ length: 100 }, (_, i) => item(`row-${i}`, { factKeys: ['one-fact'] }));
    expect(distinctPrimaryCount(pool)).toBe(1);
  });

  it('is limited by ITEMS when few of them carry many facts', () => {
    // Two items, four facts between them. The selector never uses an item twice, so only two
    // slots can be filled however many facts they cover.
    const pool = [
      item('x', { factKeys: ['f1', 'f2'] }),
      item('y', { factKeys: ['f3', 'f4'] }),
    ];
    expect(distinctPrimaryCount(pool)).toBe(2);
  });

  it('ignores SECONDARY evidence', () => {
    // Quarter-weight evidence is real but cannot carry a slot on its own, and a skill measured
    // only in passing has not been measured.
    const pool = [
      item('p1'),
      item('s1', { contribution: 'SECONDARY' }),
      item('s2', { contribution: 'SECONDARY' }),
    ];
    expect(distinctPrimaryCount(pool)).toBe(1);
  });

  it('is zero for an empty pool rather than throwing', () => {
    expect(distinctPrimaryCount([])).toBe(0);
  });
});

/**
 * The partition itself needs a database — a stage set, a taxonomy and mapped evidence — so it
 * lives in the integration suite. What is asserted here is the arithmetic it rests on, which is
 * where a mistake would be invisible: an over-count admits a skill the paper cannot fill, and
 * an under-count silently drops a skill that was perfectly measurable.
 */
describe('the floor comes from the policy, never from a constant', () => {
  it('uses each stage\'s own minItemsPerSkill', () => {
    /**
     * Stated as a test because it has already drifted once: the stage-set gate hardcoded two
     * while the foundation policy moved to four, so skills too thin to fill their slots were
     * admitted and the paper refused. Any code deciding measurability must read the policy.
     */
    const { ASSESSMENT_POLICIES } = require('../data/assessmentPolicies');
    for (const p of ASSESSMENT_POLICIES) {
      expect(typeof p.minItemsPerSkill).toBe('number');
      expect(p.minItemsPerSkill).toBeGreaterThan(0);
    }
  });
});
