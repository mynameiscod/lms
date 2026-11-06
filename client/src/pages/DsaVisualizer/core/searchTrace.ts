export interface SearchVariables { readonly low: number; readonly mid: number | null; readonly high: number; readonly target: number; readonly found: boolean }
export interface SearchStep { readonly line: number; readonly narrative: string; readonly variables: SearchVariables }
export interface SearchRun { readonly title: string; readonly values: readonly number[]; readonly code: readonly string[]; readonly steps: readonly SearchStep[] }
export function buildBinarySearchRun(values: readonly number[], target: number): SearchRun {
  if (values.length > 16 || values.some((v, i) => !Number.isInteger(v) || Math.abs(v) > 999 || (i > 0 && v < values[i - 1]))) throw new Error('Use up to 16 sorted integers between −999 and 999. Empty input is allowed.');
  if (!Number.isInteger(target) || Math.abs(target) > 999) throw new Error('Target must be an integer between −999 and 999.');
  const code = [
    'public final class BinarySearchDemo {',
    '    // Requires ascending input. Returns a matching index, or -1.',
    '    static int search(int[] values, int target) {',
    '        int low = 0;',
    '        int high = values.length - 1;',
    '        boolean found = false;',
    '        while (low <= high) {',
    '            int mid = low + (high - low) / 2;',
    '            if (values[mid] == target) {',
    '                found = true;',
    '                return mid;',
    '            }',
    '            if (values[mid] < target) {',
    '                low = mid + 1;',
    '            } else {',
    '                high = mid - 1;',
    '            }',
    '        }',
    '        return -1;',
    '    }',
    '',
    '    public static void main(String[] args) {',
    `        int[] values = {${values.join(', ')}};`,
    `        int target = ${target};`,
    '        System.out.println(search(values, target));',
    '    }',
    '}',
  ];
  let low = 0, high = values.length - 1, mid: number | null = null, found = false;
  const steps: SearchStep[] = [];
  const add = (line: number, narrative: string) => steps.push({ line, narrative, variables: { low, mid, high, target, found } });
  add(5, `Initialize low = 0, high = ${high}, and found = false. The inspector shows state after the highlighted statement; mid has not been computed.`);
  while (low <= high) {
    mid = null;
    add(6, `${low} ≤ ${high}: the inclusive search interval is nonempty. It is safe to compute a midpoint.`);
    mid = low + Math.floor((high - low) / 2);
    add(7, `mid = ${low} + (${high} − ${low}) / 2 = ${mid}, using integer division. Inspect values[${mid}] = ${values[mid]}.`);
    add(8, `Compare ${values[mid]} with target ${target}: ${values[mid] === target ? 'equal' : 'not equal'}.`);
    if (values[mid] === target) {
      found = true; add(9, 'The values match. Set found = true.');
      add(10, `Return index ${mid}. With duplicate values this algorithm returns a matching index, not necessarily the first.`);
      return { title: 'Binary Search', values: [...values], code, steps };
    }
    add(12, `${values[mid]} < ${target} is ${values[mid] < target}. Sorted order determines which half can be discarded.`);
    if (values[mid] < target) { low = mid + 1; add(13, `Set low = mid + 1 = ${low}. Discard indices through ${mid}; none can contain the target.`); }
    else { high = mid - 1; add(15, `Set high = mid − 1 = ${high}. Discard indices from ${mid} upward; none can contain the target.`); }
  }
  mid = null;
  add(6, `${low} ≤ ${high} is false. The search interval is empty; do not read outside the array.`);
  add(18, `Return −1: target ${target} was not found. found stays false.`);
  return { title: 'Binary Search', values: [...values], code, steps };
}
