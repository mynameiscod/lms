import type { SearchRun, SearchStep } from '../searchTrace';

export const LINEAR_SEARCH_CODE = [
  'for (int i = 0; i < arr.length; i++) {',
  '    if (arr[i] == target) {',
  '        return i; // Found',
  '    }',
  '}',
  'return -1; // Not Found',
] as const;
export interface LinearSearchStep extends SearchStep {
  readonly currentIndex: number | null;
  readonly comparisonsCount: number;
  readonly checked: readonly number[];
  readonly matchedIndex: number | null;
}
export interface LinearSearchRun extends SearchRun { readonly steps: readonly LinearSearchStep[] }
export function buildLinearSearchRun(values: readonly number[], target: number): LinearSearchRun {
  if (values.length > 16 || values.some(value => !Number.isInteger(value) || Math.abs(value) > 999)) throw new Error('Use up to 16 integers between −999 and 999. Sorting is not required; empty input is allowed.');
  if (!Number.isInteger(target) || Math.abs(target) > 999) throw new Error('Target must be an integer between −999 and 999.');
  const steps: LinearSearchStep[] = [], checked: number[] = [];
  let comparisonsCount = 0;
  const push = (line: number, currentIndex: number | null, narrative: string, matchedIndex: number | null = null) => steps.push({
    line, narrative, currentIndex, comparisonsCount, checked: Object.freeze([...checked]), matchedIndex,
    // Common search metadata retained for the shared workspace contract; linear-specific state is above.
    variables: { low: 0, high: values.length - 1, mid: null, target, found: matchedIndex !== null },
  });
  for (let i = 0; i < values.length; i++) {
    push(0, i, `${i === 0 ? 'Initialize i = 0.' : `Advance i to ${i}.`} Loop guard ${i} < ${values.length} passes. Point to index ${i}; this element has not been compared yet.`);
    comparisonsCount++;
    if (values[i] === target) {
      push(1, i, `Checking index ${i} (value ${values[i]}). ${values[i]} == ${target}. This is the first matching element; comparison ${comparisonsCount} succeeds.`, i);
      push(2, i, `Return index ${i}. Found after ${comparisonsCount} comparison${comparisonsCount === 1 ? '' : 's'}; later elements are not visited.`, i);
      return { title: 'Linear Search', values: [...values], code: LINEAR_SEARCH_CODE, steps };
    }
    checked.push(i);
    push(1, i, `Checking index ${i} (value ${values[i]}). ${values[i]} != ${target}. ${i + 1 < values.length ? `Moving pointer to index ${i + 1} on the next loop step.` : `The next loop check uses i = ${values.length}; it will fail without reading arr[${values.length}].`}`);
  }
  push(0, values.length, `Loop guard ${values.length} < ${values.length} is false. ${values.length === 0 ? 'The array is empty; perform zero comparisons.' : 'Every element was checked without a match.'} Do not access arr[${values.length}].`);
  push(5, null, `Return −1: target ${target} is not present. Total comparisons: ${comparisonsCount}. The loop variable i is now out of scope.`);
  return { title: 'Linear Search', values: [...values], code: LINEAR_SEARCH_CODE, steps };
}

