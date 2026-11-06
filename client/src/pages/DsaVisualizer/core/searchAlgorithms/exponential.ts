import type { SearchRun, SearchStep } from '../searchTrace';

export const EXPONENTIAL_SEARCH_CODE = [
  'int exponentialSearch(int[] arr, int target) {',
  '    int n = arr.length;',
  '    if (n == 0) return -1;',
  '    if (arr[0] == target) return 0;',
  '    int i = 1;',
  '    while (i < n && arr[i] <= target) {',
  '        i = i * 2;',
  '    }',
  '    return binarySearch(arr, i / 2, Math.min(i, n - 1), target);',
  '}',
  'int binarySearch(int[] arr, int low, int high, int target) {',
  '    while (low <= high) {',
  '        int mid = low + (high - low) / 2;',
  '        if (arr[mid] == target) return mid;',
  '        if (arr[mid] < target) low = mid + 1;',
  '        else high = mid - 1;',
  '    }',
  '    return -1;',
  '}',
] as const;

export interface ExponentialSearchStep extends SearchStep {
  bound: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  phase: 'expansion' | 'binary' | 'done';
  probes: readonly number[];
  matchedIndex: number | null;
}
export interface ExponentialSearchRun extends SearchRun { steps: readonly ExponentialSearchStep[] }

export function buildExponentialSearchRun(values: readonly number[], target: number): ExponentialSearchRun {
  if (values.length > 16 || values.some((v, i) => !Number.isInteger(v) || Math.abs(v) > 999 || (i > 0 && v < values[i - 1]))) throw new Error('Use up to 16 sorted integers between −999 and 999.');
  if (!Number.isInteger(target) || Math.abs(target) > 999) throw new Error('Target must be an integer between −999 and 999.');
  const n = values.length, steps: ExponentialSearchStep[] = [], probes: number[] = [];
  let bound: number | null = null, rangeStart: number | null = null, rangeEnd: number | null = null;
  let low = 0, high = n - 1, mid: number | null = null;
  const add = (line: number, narrative: string, phase: ExponentialSearchStep['phase'] = 'expansion', matchedIndex: number | null = null) => {
    steps.push({ line, narrative, phase, bound, rangeStart, rangeEnd, probes: [...probes], matchedIndex,
      variables: { low, high, mid, target, found: matchedIndex !== null } });
  };
  const result = (): ExponentialSearchRun => ({ title: 'Exponential Search', values: [...values], code: EXPONENTIAL_SEARCH_CODE, steps });
  if (!n) { add(2, 'The array is empty. Return −1 before accessing arr[0].', 'done'); return result(); }
  probes.push(0);
  if (values[0] === target) { add(3, `arr[0] = ${target}. Return index 0 immediately.`, 'done', 0); return result(); }
  add(3, `arr[0] = ${values[0]} differs from target ${target}. Begin bound expansion.`);
  bound = 1; add(4, 'Initialize bound i = 1. Each successful bound comparison doubles i.');
  while (bound < n && values[bound] <= target) {
    probes.push(bound);
    add(5, `i = ${bound} < n and arr[${bound}] = ${values[bound]} ≤ ${target}. Expand the bound, including when equal, as the Java loop specifies.`);
    const before = bound; bound *= 2;
    add(6, `Double i: ${before} × 2 = ${bound}. Check i < n before reading the new bound.`);
  }
  if (bound < n) probes.push(bound);
  const reason = bound >= n
    ? `Bound i = ${bound} is outside n = ${n}. Short-circuit i < n; do not read arr[${bound}].`
    : `Bound i = ${bound}: arr[${bound}] = ${values[bound]} > target ${target}. Stop expanding.`;
  add(5, reason);
  rangeStart = Math.floor(bound / 2); rangeEnd = Math.min(bound, n - 1);
  low = rangeStart; high = rangeEnd;
  add(8, `${reason} Running Binary Search between indices ${low} and ${high}, inclusive.`, 'binary');
  while (low <= high) {
    mid = null; add(11, `Low ${low} ≤ High ${high}. The current interval is nonempty.`, 'binary');
    mid = low + Math.floor((high - low) / 2);
    add(12, `Mid = ${low} + floor((${high} − ${low}) / 2) = ${mid}. arr[${mid}] = ${values[mid]}.`, 'binary');
    if (values[mid] === target) { add(13, `arr[${mid}] = ${target}. Return index ${mid}.`, 'done', mid); return result(); }
    add(13, `arr[${mid}] = ${values[mid]} is not target ${target}. Compare their order.`, 'binary');
    if (values[mid] < target) {
      const old = low; low = mid + 1;
      add(14, `Target ${target} > ${values[mid]}. Discard indices ${old}..${mid}; set Low = ${low}.`, 'binary');
    } else {
      const old = high; high = mid - 1;
      add(15, `Target ${target} < ${values[mid]}. Discard indices ${mid}..${old}; set High = ${high}.`, 'binary');
    }
  }
  mid = null; add(11, `Low ${low} > High ${high}. The interval is empty.`, 'binary');
  add(17, `Return −1: target ${target} is absent.`, 'done');
  return result();
}

