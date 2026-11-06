export type ArrayOperation = 'search' | 'insert' | 'delete';
export const ARRAY_CAPACITY = 8;
export const ARRAY_BASE = 0x1000;
export const ELEMENT_SIZE = 4;
export const arrayAddress = (index: number) => `0x${(ARRAY_BASE + index * ELEMENT_SIZE).toString(16).toUpperCase()}`;
export interface ArrayStep {
  readonly slots: readonly number[];
  readonly arrayLength: number;
  readonly targetIndex: number | null;
  readonly currentValue: number | null;
  readonly pointer: number | null;
  readonly line: number;
  readonly narrative: string;
  readonly move?: { from: number; to: number; value: number };
}
export const ARRAY_CODE: Record<ArrayOperation, readonly string[]> = {
  search: [
    'static int search(int[] a, int length, int target) {',
    '    if (length < 0 || length > a.length)',
    '        throw new IllegalArgumentException();',
    '    for (int i = 0; i < length; i++) {',
    '        int currentValue = a[i];',
    '        if (currentValue == target) return i;',
    '    }',
    '    return -1;',
    '}',
  ],
  insert: [
    'static int insert(int[] a, int length, int index, int value) {',
    '    if (length < 0 || length >= a.length)',
    '        throw new IllegalArgumentException("No capacity");',
    '    if (index < 0 || index > length)',
    '        throw new IndexOutOfBoundsException(index);',
    '    for (int i = length; i > index; i--) {',
    '        a[i] = a[i - 1];',
    '    }',
    '    a[index] = value;',
    '    return length + 1;',
    '}',
  ],
  delete: [
    'static int delete(int[] a, int length, int index) {',
    '    if (length < 0 || length > a.length)',
    '        throw new IllegalArgumentException();',
    '    if (index < 0 || index >= length)',
    '        throw new IndexOutOfBoundsException(index);',
    '    for (int i = index; i < length - 1; i++) {',
    '        a[i] = a[i + 1];',
    '    }',
    '    a[length - 1] = 0; // Clear the unused tail.',
    '    return length - 1;',
    '}',
  ],
};

export function generateArraySteps(values: readonly number[], operation: ArrayOperation, index: number, value: number): readonly ArrayStep[] {
  if (values.length > ARRAY_CAPACITY || values.some(n => !Number.isInteger(n) || Math.abs(n) > 999)) throw new Error('Enter up to eight integers between −999 and 999; leave blank for an empty array.');
  if (operation !== 'delete' && (!Number.isInteger(value) || Math.abs(value) > 999)) throw new Error('Enter an integer value between −999 and 999.');
  if (operation !== 'search' && !Number.isInteger(index)) throw new Error('Enter a whole-number index.');
  const slots = [...values, ...Array(ARRAY_CAPACITY - values.length).fill(0)] as number[];
  let length = values.length;
  const result: ArrayStep[] = [];
  const push = (line: number, narrative: string, pointer: number | null = null, targetIndex: number | null = operation === 'search' ? null : index, move?: ArrayStep['move']) => {
    result.push({ slots: Object.freeze([...slots]), arrayLength: length, pointer, targetIndex,
      currentValue: pointer === null ? null : slots[pointer], line, narrative, move });
  };
  const address = (i: number) => `0x1000 + ${i} × ${ELEMENT_SIZE} = ${arrayAddress(i)}`;
  push(0, `Start with logical length ${length} and fixed capacity ${ARRAY_CAPACITY}. Addresses are simulated int element addresses, excluding a Java array header.`);
  if (operation === 'search') {
    push(1, `Bounds valid: 0 ≤ length (${length}) ≤ capacity (${ARRAY_CAPACITY}). Search only the logical prefix [0, ${length}).`);
    for (let i = 0; i < length; i++) {
      push(4, `Inspect index ${i}: ${address(i)}. Read ${slots[i]} and compare with target ${value}.`, i);
      if (slots[i] === value) { push(5, `Found the first match at index ${i}. Return ${i}; the array is unchanged.`, i, i); return result; }
      push(5, `${slots[i]} ≠ ${value}; advance the scan to the next index.`, i);
    }
    push(7, `No match in ${length} logical elements. Return −1 without reading index ${length}.`, null, -1);
  } else if (operation === 'insert') {
    push(length >= ARRAY_CAPACITY ? 2 : 1, length >= ARRAY_CAPACITY ? 'Insertion rejected: length equals capacity. A Java array cannot grow in place; allocate a larger array first.' : `Capacity check passes: ${length} < ${ARRAY_CAPACITY}.`);
    if (length >= ARRAY_CAPACITY) return result;
    if (index < 0 || index > length) { push(4, `Insertion rejected: require 0 ≤ targetIndex ≤ ${length}. Insertion at length is allowed; larger indexes leave a gap.`); return result; }
    push(3, `Index check passes: 0 ≤ ${index} ≤ ${length}. Shift right from the end so unread values are not overwritten.`);
    for (let i = length; i > index; i--) {
      const moved = slots[i - 1]; slots[i] = moved;
      push(6, `Copy a[${i - 1}] to a[${i}]: destination ${address(i)}. Right shift copies one value; length is still ${length}.`, i, index, { from: i - 1, to: i, value: moved });
    }
    slots[index] = value;
    push(8, `Write ${value} at index ${index}: ${address(index)}. The shifted copy preserves every previous element.`, index);
    length++;
    push(9, `Return new logical length ${length}. The caller assigns it to length; a.length remains ${ARRAY_CAPACITY}.`, index);
  } else {
    push(1, `Length check passes: 0 ≤ ${length} ≤ ${ARRAY_CAPACITY}.`);
    if (index < 0 || index >= length) { push(4, `Deletion rejected: require 0 ≤ targetIndex < ${length}. ${length === 0 ? 'An empty logical array has no deletable index.' : 'Index length is outside the occupied range.'}`); return result; }
    push(3, `Index check passes. Delete the element at ${index} by copying successors left, from low to high indexes.`, index);
    for (let i = index; i < length - 1; i++) {
      const moved = slots[i + 1]; slots[i] = moved;
      push(6, `Copy a[${i + 1}] to a[${i}]: destination ${address(i)}. Left shift fills the gap before advancing.`, i, index, { from: i + 1, to: i, value: moved });
    }
    slots[length - 1] = 0;
    push(8, `Clear the old last slot at ${address(length - 1)} to zero. Zero is a stored value, not a special empty marker.`, length - 1);
    length--;
    push(9, `Return new logical length ${length}. Slots at indexes ≥ ${length} are unused capacity, regardless of their stored bits.`);
  }
  return result;
}
