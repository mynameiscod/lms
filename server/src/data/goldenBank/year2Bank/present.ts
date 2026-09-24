/**
 * Putting the correct answer somewhere other than first.
 *
 * ── WHY THE SOURCE FILES ALL PUT IT FIRST ─────────────────────────────────────────────────
 *
 * Because authoring three hundred items while also tracking which slot each answer sits in is
 * how a correctIndex ends up pointing at the wrong option — and that mistake is invisible: the
 * question reads perfectly and marks a correct student wrong. So the author writes the answer
 * first, every time, and the position is decided here instead.
 *
 * Year 1's bank spreads its answers evenly (24/26/24/26 across A to D) and that is the standard
 * to match. Authored as-is, Year 2 would put every answer at A, which a student notices within
 * one paper and can then exploit without reading a single question.
 *
 * ── WHY IT IS DETERMINISTIC ───────────────────────────────────────────────────────────────
 *
 * Seeded from the question id, so the same question always presents its options in the same
 * order. A re-import must not reshuffle: the item is stored with its options in one order and
 * the correct one recorded by id, so a shuffle that moved between runs would rewrite every row
 * and — worse — invalidate any answer already recorded against the old ordering.
 */

import { GoldenItem } from './types';

/** FNV-1a, the same hash the paper builder seeds its draw with. */
const hashSeed = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** mulberry32. */
const rng = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export interface PresentedItem {
  /** The four options in the order they should be served. */
  options: string[];
  /** Where the correct answer now sits. */
  correctIndex: number;
  /** A, B, C or D — what the master CSV records. */
  correctLetter: 'A' | 'B' | 'C' | 'D';
  correctText: string;
}

/**
 * The options in presentation order, with the answer's new position.
 *
 * Fisher-Yates over the four, seeded by the question id.
 */
export function present(item: GoldenItem): PresentedItem {
  const rand = rng(hashSeed(item.questionId));
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const options = order.map(n => item.options[n]);
  const correctIndex = order.indexOf(item.correctIndex);
  return {
    options,
    correctIndex,
    correctLetter: (['A', 'B', 'C', 'D'] as const)[correctIndex],
    correctText: options[correctIndex],
  };
}
