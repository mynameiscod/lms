import { buildBinarySearchRun, type SearchRun, type SearchStep } from '../searchTrace';

export const BINARY_SEARCH_CODE = [
  'int low = 0, high = arr.length - 1;',
  'while (low <= high) {',
  '    int mid = low + (high - low) / 2;',
  '    if (arr[mid] == target) return mid;',
  '    if (arr[mid] < target) low = mid + 1;',
  '    else high = mid - 1;',
  '}',
  'return -1; // No matching element.',
] as const;

/** Adapt the tested search decisions to the requested compact Java method body. */
export function buildCompactBinaryRun(values: readonly number[], target: number): SearchRun {
  const source = buildBinarySearchRun(values, target);
  const mapping: Record<number, number> = { 5: 0, 6: 1, 7: 2, 8: 3, 10: 3, 12: 4, 13: 4, 15: 5, 18: 7 };
  const steps: SearchStep[] = [];
  source.steps.forEach((step, i) => {
    // Equality and return share one Java line: emit one successful committed snapshot.
    if (step.line === 9 || (step.line === 8 && values[step.variables.mid!] === target)) return;
    let narrative = step.narrative;
    if (step.line === 5) narrative = `Initialize Low = 0 and High = ${values.length - 1}. Search the inclusive interval; Mid is not computed yet. Input must be sorted in ascending order.`;
    if (step.line === 13 || step.line === 15) {
      const before = source.steps[i - 1].variables;
      const mid = step.variables.mid!;
      narrative = step.line === 13
        ? `Target ${target} > Mid value ${values[mid]}. Discarding left half (indices ${before.low} to ${mid}). Setting Low = Mid + 1 = ${step.variables.low}.`
        : `Target ${target} < Mid value ${values[mid]}. Discarding right half (indices ${mid} to ${before.high}). Setting High = Mid − 1 = ${step.variables.high}.`;
    }
    steps.push({ ...step, line: mapping[step.line], narrative });
  });
  return { ...source, code: BINARY_SEARCH_CODE, steps };
}

