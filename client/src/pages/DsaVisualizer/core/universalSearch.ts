import type { SearchStep } from './searchTrace';
import { buildCompactBinaryRun } from './searchAlgorithms/binary';
import { buildLinearSearchRun, type LinearSearchStep } from './searchAlgorithms/linear';
import { buildTernarySearchRun, type TernarySearchStep } from './searchAlgorithms/ternary';
import { buildJumpSearchRun, type JumpSearchStep } from './searchAlgorithms/jump';
import { buildExponentialSearchRun, type ExponentialSearchStep } from './searchAlgorithms/exponential';

export const SEARCH_ALGORITHMS = {
  binary_search: { name: 'Binary Search', time: 'O(log n)' },
  linear_search: { name: 'Linear Search', time: 'O(n)' },
  ternary_search: { name: 'Ternary Search', time: 'O(log n)' },
  jump_search: { name: 'Jump Search', time: 'O(√n)' },
  exponential_search: { name: 'Exponential Search', time: 'O(log n)' },
} as const;
export type SearchAlgorithm = keyof typeof SEARCH_ALGORITHMS;
export type PointerName = 'low' | 'mid' | 'high' | 'mid1' | 'mid2' | 'current';
export interface SearchFrame {
  readonly array: readonly number[];
  readonly pointers: Readonly<Record<PointerName, number | null>>;
  readonly discardedIndices: readonly number[];
  /** One-based line number in the run's Java source. */
  readonly activeLine: number;
  readonly narrative: string;
  readonly variables: Readonly<Record<string, number | string | boolean | null>>;
  readonly evaluatedIndices: readonly number[];
  readonly matchedIndex: number | null;
  readonly phase: string;
}
export interface UniversalRun { algorithm: SearchAlgorithm; code: readonly string[]; frames: readonly SearchFrame[] }

/** Normalize the tested pure generators; rendering and playback depend only on this contract. */
export function generateSearchFrames(algorithm: SearchAlgorithm, values: readonly number[], target: number): UniversalRun {
  const build = { binary_search: buildCompactBinaryRun, linear_search: buildLinearSearchRun,
    ternary_search: buildTernarySearchRun, jump_search: buildJumpSearchRun, exponential_search: buildExponentialSearchRun }[algorithm];
  const run = build(values, target), array = Object.freeze([...run.values]);
  const frames = run.steps.map(s => {
    const pointers: Record<PointerName, number | null> = { low: null, mid: null, high: null, mid1: null, mid2: null, current: null };
    let variables: Record<string, number | boolean | null> = { ...s.variables };
    let matchedIndex: number | null = s.variables.found ? s.variables.mid : null;
    let discardedIndices: number[] = [], evaluatedIndices: number[] = [], phase = 'Binary search';
    const outside = (low: number, high: number) => array.map((_, i) => i).filter(i => i < low || i > high);
    if (isLinear(s)) {
      pointers.current = s.currentIndex;
      discardedIndices = [...s.checked]; matchedIndex = s.matchedIndex;
      evaluatedIndices = s.line === 1 && s.currentIndex !== null ? [s.currentIndex] : [];
      variables = { currentIndex: s.currentIndex, 'arr[i]': s.currentIndex === null ? null : array[s.currentIndex] ?? null, target, comparisonsCount: s.comparisonsCount, found: s.variables.found };
      phase = 'Linear scan';
    } else if (isJump(s)) {
      pointers.current = s.probe; matchedIndex = s.matchedIndex;
      const candidate = s.phase !== 'jump' || (s.line === 5 && s.probe !== null && array[s.probe] >= target);
      discardedIndices = outside(s.prev, candidate ? Math.min(s.step, array.length) - 1 : array.length - 1);
      discardedIndices.push(...s.checked);
      if ([5, 10, 14].includes(s.line) && s.probe !== null) evaluatedIndices = [s.probe];
      variables = { blockSize: s.blockSize, prev: s.prev, step: s.step, 'arr[prev]': array[s.prev] ?? null, target, found: s.variables.found };
      phase = s.phase === 'jump' ? 'Block jumps' : 'Linear scan';
    } else if (isExponential(s)) {
      matchedIndex = s.matchedIndex;
      variables = { 'bound i': s.bound, rangeStart: s.rangeStart, rangeEnd: s.rangeEnd, target, low: s.rangeStart === null ? null : s.variables.low,
        mid: s.variables.mid, high: s.rangeEnd === null ? null : s.variables.high, found: s.variables.found };
      if (s.rangeStart === null) {
        pointers.current = s.bound ?? (array.length ? 0 : null);
        if ([3, 5].includes(s.line) && pointers.current !== null) evaluatedIndices = [pointers.current];
        phase = 'Exponential expansion';
      } else {
        Object.assign(pointers, { low: s.variables.low, mid: s.variables.mid, high: s.variables.high });
        discardedIndices = outside(s.variables.low, s.variables.high);
        if ([12, 13, 14, 15].includes(s.line) && s.variables.mid !== null) evaluatedIndices = [s.variables.mid];
      }
    } else if (isTernary(s)) {
      Object.assign(pointers, { low: s.variables.low, high: s.variables.high, mid1: s.mid1, mid2: s.mid2 });
      variables = { low: s.variables.low, mid1: s.mid1, mid2: s.mid2, high: s.variables.high, target, found: s.variables.found };
      discardedIndices = outside(s.variables.low, s.variables.high); matchedIndex = s.matchedIndex;
      const probe = [2, 4, 6].includes(s.line) ? s.mid1 : [3, 5, 7].includes(s.line) ? s.mid2 : null;
      if (probe !== null) evaluatedIndices = [probe];
      phase = 'Ternary search';
    } else {
      Object.assign(pointers, { low: s.variables.low, mid: s.variables.mid, high: s.variables.high });
      discardedIndices = outside(s.variables.low, s.variables.high);
      if ([2, 3, 4, 5].includes(s.line) && s.variables.mid !== null) evaluatedIndices = [s.variables.mid];
    }
    for (const key of Object.keys(pointers) as PointerName[]) {
      const value = pointers[key]; if (value !== null && (value < 0 || value >= array.length)) pointers[key] = null;
    }
    return Object.freeze({ array, pointers: Object.freeze(pointers), activeLine: s.line + 1, narrative: s.narrative,
      variables: Object.freeze(variables), phase, matchedIndex,
      discardedIndices: Object.freeze([...new Set(discardedIndices)].filter(i => i !== matchedIndex)),
      evaluatedIndices: Object.freeze(evaluatedIndices.filter(i => i >= 0 && i < array.length)) });
  });
  return { algorithm, code: run.code, frames: Object.freeze(frames) };
}

function isLinear(s: SearchStep): s is LinearSearchStep { return 'currentIndex' in s; }

function isJump(s: SearchStep): s is JumpSearchStep { return 'blockSize' in s; }

function isExponential(s: SearchStep): s is ExponentialSearchStep { return 'bound' in s; }

function isTernary(s: SearchStep): s is TernarySearchStep { return 'mid1' in s; }
