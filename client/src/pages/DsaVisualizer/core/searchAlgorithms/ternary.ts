import type { SearchRun, SearchStep } from '../searchTrace';

export const TERNARY_SEARCH_CODE = [
  'int low = 0, high = arr.length - 1;',
  'while (low <= high) {',
  '    int mid1 = low + (high - low) / 3;',
  '    int mid2 = high - (high - low) / 3;',
  '    if (arr[mid1] == target) return mid1;',
  '    if (arr[mid2] == target) return mid2;',
  '    if (target < arr[mid1]) high = mid1 - 1;',
  '    else if (target > arr[mid2]) low = mid2 + 1;',
  '    else { low = mid1 + 1; high = mid2 - 1; }',
  '}',
  'return -1; // Not Found',
] as const;
export interface TernarySearchStep extends SearchStep {
  readonly mid1: number | null;
  readonly mid2: number | null;
  readonly matchedIndex: number | null;
}
export interface TernarySearchRun extends SearchRun { readonly steps: readonly TernarySearchStep[] }
export function buildTernarySearchRun(values: readonly number[], target: number): TernarySearchRun {
  if (values.length > 16 || values.some((value, i) => !Number.isInteger(value) || Math.abs(value) > 999 || (i > 0 && value < values[i - 1]))) throw new Error('Use up to 16 sorted integers between −999 and 999. Empty input is allowed.');
  if (!Number.isInteger(target) || Math.abs(target) > 999) throw new Error('Target must be an integer between −999 and 999.');
  let low = 0, high = values.length - 1, mid1: number | null = null, mid2: number | null = null;
  const steps: TernarySearchStep[] = [];
  const add = (line: number, narrative: string, matchedIndex: number | null = null) => steps.push({ line, narrative, mid1, mid2, matchedIndex,
    variables: { low, high, mid: null, target, found: matchedIndex !== null } });
  add(0, `Initialize Low = 0 and High = ${high}. Input is sorted. Integer division creates approximate thirds, not necessarily equal-sized segments.`);
  while (low <= high) {
    mid1 = null; mid2 = null;
    add(1, `${low} ≤ ${high}: the inclusive interval is nonempty. Compute two split indexes inside these bounds.`);
    mid1 = low + Math.floor((high - low) / 3);
    add(2, `Mid1 = ${low} + (${high} − ${low}) / 3 = ${mid1}. arr[${mid1}] = ${values[mid1]}. Integer division truncates the nonnegative quotient.`);
    mid2 = high - Math.floor((high - low) / 3);
    add(3, `Mid2 = ${high} − (${high} − ${low}) / 3 = ${mid2}. arr[${mid2}] = ${values[mid2]}. The split points can coincide in a one-element interval.`);
    if (values[mid1] === target) {
      add(4, `Target ${target} equals arr[Mid1] (${values[mid1]}). Return index ${mid1}; this is a matching index, not necessarily the first duplicate.`, mid1);
      return { title: 'Ternary Search', values: [...values], code: TERNARY_SEARCH_CODE, steps };
    }
    add(4, `Compare target ${target} with arr[Mid1] = ${values[mid1]}. They differ; test Mid2 next.`);
    if (values[mid2] === target) {
      add(5, `Target ${target} equals arr[Mid2] (${values[mid2]}). Return index ${mid2}.`, mid2);
      return { title: 'Ternary Search', values: [...values], code: TERNARY_SEARCH_CODE, steps };
    }
    add(5, `Compare target ${target} with arr[Mid2] = ${values[mid2]}. They differ; decide which range can still contain the target.`);
    if (target < values[mid1]) {
      const oldHigh = high; high = mid1 - 1;
      add(6, `Target ${target} is less than Mid1 value (${values[mid1]}). Discarding upper two sections (indices ${mid1} to ${oldHigh}). Setting High = Mid1 − 1 = ${high}.`);
    } else {
      add(6, `Target ${target} < Mid1 value ${values[mid1]} is false. Check whether the target lies beyond Mid2.`);
      if (target > values[mid2]) {
        const oldLow = low; low = mid2 + 1;
        add(7, `Target ${target} is greater than Mid2 (${values[mid2]}). Discarding lower two sections (indices ${oldLow} to ${mid2}). Setting Low = Mid2 + 1 = ${low}.`);
      } else {
        add(7, `Target ${target} > Mid2 value ${values[mid2]} is false. The unmatched target must lie strictly between the split values, if it exists.`);
        const oldLow = low, oldHigh = high; low = mid1 + 1; high = mid2 - 1;
        add(8, `Keep the middle section. Discard indices ${oldLow} to ${mid1} and ${mid2} to ${oldHigh}. Set Low = ${low} and High = ${high}.${low > high ? ' No candidate index remains.' : ''}`);
      }
    }
  }
  mid1 = null; mid2 = null;
  add(1, `${low} ≤ ${high} is false. The interval is empty; no array access is made.`);
  add(10, `Return −1: target ${target} was not found. Both midpoint locals are out of scope.`);
  return { title: 'Ternary Search', values: [...values], code: TERNARY_SEARCH_CODE, steps };
}
