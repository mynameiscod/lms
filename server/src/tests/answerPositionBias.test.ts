/**
 * The correct answer must not always be option A.
 *
 * The generator's prompt demonstrated its JSON with `isCorrect: true` as the FIRST option,
 * so the model copied the shape: 189 of 196 drafted questions had their answer at position
 * A. Nothing shuffled afterwards, so a student who always picked A scored about 96%.
 *
 * That is not merely a scoring bug. A near-perfect score means no measured gaps, which means
 * the personalised roadmap has nothing to personalise on and every figure built on the
 * assessment — Skill DNA, Career Score, role readiness — quietly stops meaning anything.
 *
 * Two defences are pinned here because either alone is insufficient: generation must not
 * produce the bias, and presentation must not depend on generation having been fixed.
 */

import { shuffleOptions, correctPositionOf } from '../services/skillQuestionDraftService';
import { hashSeed, rng, shuffle } from '../services/paperBuilderService';

const OPTS = () => [
  { text: 'correct', isCorrect: true },
  { text: 'wrong 1', isCorrect: false },
  { text: 'wrong 2', isCorrect: false },
  { text: 'wrong 3', isCorrect: false },
];

describe('generation does not leave every answer at A', () => {
  it('keeps the same options, only reordered', () => {
    const out = shuffleOptions(OPTS());
    expect(out).toHaveLength(4);
    expect(out.filter(o => o.isCorrect)).toHaveLength(1);
    expect(out.map(o => o.text).sort()).toEqual(['correct', 'wrong 1', 'wrong 2', 'wrong 3']);
  });

  it('does not mutate the array it was given', () => {
    const original = OPTS();
    shuffleOptions(original);
    expect(original[0].text).toBe('correct');
  });

  /**
   * Over many draws the answer must land in every position. A single run can legitimately
   * put it first — the bug was that a hundred runs always did.
   */
  it('spreads the answer across all positions over many questions', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i += 1) seen.add(correctPositionOf(shuffleOptions(OPTS())));
    expect(seen.size).toBe(4);
  });

  it('is not biased toward the first position', () => {
    let atA = 0;
    const runs = 400;
    for (let i = 0; i < runs; i += 1) if (correctPositionOf(shuffleOptions(OPTS())) === 0) atA += 1;
    // Expected 25%. A generous band — this catches "always A", not a fair-coin argument.
    expect(atA).toBeGreaterThan(runs * 0.1);
    expect(atA).toBeLessThan(runs * 0.45);
  });

  it('handles a pair and a single without losing the answer', () => {
    expect(correctPositionOf(shuffleOptions([{ isCorrect: false }, { isCorrect: true }]))).toBeGreaterThanOrEqual(0);
    expect(shuffleOptions([{ isCorrect: true }])).toHaveLength(1);
  });
});

describe('presentation shuffles too, and stably', () => {
  /**
   * The second defence, and the one that repairs the questions ALREADY stored. Their options
   * are plain objects with no _id, so the id a student answers with is the array position —
   * reordering the stored rows would change what every recorded answer meant. Reordering
   * only what is shown, while each option keeps its id, fixes them without touching data.
   */
  const present = (options: any[], seed: string) => shuffle(options.slice(), rng(hashSeed(seed)));

  const IDENTIFIED = () => [
    { id: '0', text: 'correct' }, { id: '1', text: 'wrong 1' },
    { id: '2', text: 'wrong 2' }, { id: '3', text: 'wrong 3' },
  ];

  it('keeps every option and its id', () => {
    const out = present(IDENTIFIED(), 'attempt:q1');
    expect(out.map(o => o.id).sort()).toEqual(['0', '1', '2', '3']);
    // The id travels with its own text — the pairing is what grading depends on.
    out.forEach(o => expect(o.text).toBe(IDENTIFIED().find(x => x.id === o.id)!.text));
  });

  /** A reload must not reorder: a paper changing underneath a student reads as broken. */
  it('is identical for the same attempt and question', () => {
    expect(present(IDENTIFIED(), 'a1:q1')).toEqual(present(IDENTIFIED(), 'a1:q1'));
  });

  it('differs across questions within one attempt', () => {
    const orders = new Set(
      ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map(q => present(IDENTIFIED(), `a1:${q}`).map(o => o.id).join()),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('differs across attempts for the same question', () => {
    const a = present(IDENTIFIED(), 'a1:q1').map(o => o.id).join();
    const b = present(IDENTIFIED(), 'a2:q1').map(o => o.id).join();
    const c = present(IDENTIFIED(), 'a3:q1').map(o => o.id).join();
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });
});
