import type { BitTopicId, BitOperation } from './engines/bitEngine';
import type { PatternId, PatternOperation } from './engines/patternsEngine';
import type { SortingAlgorithm, SortOrder } from './engines/sortingEngine';
import type { AlgorithmId } from './workers/workerProtocol';
import type { StructureId } from './structureEngine';

export type VisualizerCategoryId = 'searching' | 'sorting' | 'data-structures' | 'patterns' | 'bits';
export type VisualizerIcon = 'search' | 'sort' | 'database' | 'network' | 'binary';
export interface VisualizerTopic {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly family?: string;
  readonly structure?: StructureId;
  readonly sorting?: SortingAlgorithm;
  readonly pattern?: PatternId;
  readonly bit?: BitTopicId;
  readonly time?: string;
  readonly space?: string;
  readonly operations?: readonly { readonly id: SortOrder | PatternOperation | BitOperation; readonly label: string }[];
  /** Only attach an engine when a real implementation exists. */
  readonly engine?: Exclude<AlgorithmId, 'aiPipeline'>;
  readonly workspace?: 'array' | 'search' | 'linear-search' | 'ternary-search' | 'jump-search' | 'exponential-search';
  readonly modelScope?: string;
}
export interface VisualizerTopicGroup {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly topics: readonly VisualizerTopic[];
}
export interface VisualizerCategory {
  readonly id: VisualizerCategoryId;
  readonly title: string;
  readonly description: string;
  readonly icon: VisualizerIcon;
  readonly groups: readonly VisualizerTopicGroup[];
}
const topic = (id: string, title: string, description: string, family?: string): VisualizerTopic => ({ id, title, description, family });

export interface SortingMetadata {
  readonly name: string;
  readonly definition: string;
  readonly time: string;
  readonly space: string;
  readonly operations: readonly { readonly id: SortOrder; readonly label: string }[];
}
const sortOperations = [{ id: 'ascending', label: 'Sort ascending' }, { id: 'descending', label: 'Sort descending' }] as const;
export const SORTING_ALGORITHMS: Record<SortingAlgorithm, SortingMetadata> = {
  bubble_sort: { name: 'Bubble Sort', definition: 'Compare adjacent values and swap out-of-order neighbors.', time: 'O(n²)', space: 'O(1)', operations: sortOperations },
  selection_sort: { name: 'Selection Sort', definition: 'Select the best remaining value for each final position.', time: 'O(n²)', space: 'O(1)', operations: sortOperations },
  insertion_sort: { name: 'Insertion Sort', definition: 'Save a key and shift values to insert it into a sorted prefix.', time: 'O(n²)', space: 'O(1)', operations: sortOperations },
  merge_sort: { name: 'Merge Sort', definition: 'Recursively split ranges and merge sorted halves through temporary arrays.', time: 'O(n log n)', space: 'O(n)', operations: sortOperations },
  quick_sort: { name: 'Quick Sort', definition: 'Partition around a pivot, then recursively sort both sides.', time: 'O(n²) worst; O(n log n) average', space: 'O(n) worst stack', operations: sortOperations },
  heap_sort: { name: 'Heap Sort', definition: 'Build a heap and repeatedly extract its root into the sorted suffix.', time: 'O(n log n)', space: 'O(log n) recursive stack', operations: sortOperations },
  radix_sort: { name: 'Radix Sort', definition: 'Stably group offset integer ranks by successive decimal digits.', time: 'O(d(n + 10))', space: 'O(n + 10)', operations: sortOperations },
  counting_sort: { name: 'Counting Sort', definition: 'Count bounded integer ranks and use prefix sums for stable placement.', time: 'O(n + k)', space: 'O(n + k)', operations: sortOperations },
};

export interface PatternOperationMetadata {
  readonly textSeed?: readonly string[];
  readonly querySeed?: string;
  readonly id: PatternOperation;
  readonly label: string;
  readonly time: string;
  readonly space: string;
  readonly seed: readonly number[];
  readonly parameter: number;
  readonly parameterLabel?: string;
  readonly inputLabel?: string;
}
export interface PatternMetadata {
  readonly operationStyle?: "buttons";
  readonly name: string;
  readonly definition: string;
  readonly operations: readonly PatternOperationMetadata[];
}
export const PATTERNS: Record<PatternId, PatternMetadata> = {
  'two-pointers': { name: 'Two Pointers', definition: 'Move two references while preserving an ordering or partition invariant.', operations: [
    { id: 'two-sum', label: 'Two Sum Sorted', time: 'O(n)', space: 'O(1)', seed: [1,2,4,6,8,9], parameter: 10, parameterLabel: 'Target', inputLabel: 'Sorted values' },
    { id: 'reverse', label: 'Reverse Array', time: 'O(n)', space: 'O(1)', seed: [2,4,6,8,10], parameter: 0 },
  ] },
  'fast-slow': { name: 'Fast & Slow Pointers', definition: 'Follow linked-node identities at different speeds to find a middle or detect a cycle.', operations: [
    { id: 'middle', label: 'Linked List Middle', time: 'O(n)', space: 'O(1)', seed: [5,8,13,21,34,55], parameter: -1 },
    { id: 'cycle', label: 'Cycle Detection', time: 'O(n)', space: 'O(1)', seed: [5,8,13,21,34,55], parameter: 1, parameterLabel: 'Tail links to index (-1 = null)' },
  ] },
  'sliding-window': { name: 'Sliding Window', definition: 'Maintain a running aggregate as a contiguous window grows, shrinks, or slides.', operations: [
    { id: 'max-window', label: 'Max Subarray Sum (Fixed k)', time: 'O(n)', space: 'O(1)', seed: [2,1,5,1,3,2], parameter: 3, parameterLabel: 'Window k' },
    { id: 'min-window', label: 'Minimum Window Sum ≥ Target', time: 'O(n)', space: 'O(1)', seed: [2,3,1,2,4,3], parameter: 7, parameterLabel: 'Positive target', inputLabel: 'Positive values' },
  ] },
  'merge-intervals': { name: 'Merge Intervals', definition: 'Sort interval starts and combine overlapping or touching closed ranges.', operations: [
    { id: 'merge', label: 'Merge Overlapping Intervals', time: 'O(n log n)', space: 'O(n)', seed: [1,3,2,6,8,10,9,12], parameter: 0, inputLabel: 'Interval endpoints: start,end,...' },
  ] },
  'monotonic-stack': { name: 'Monotonic Stack', definition: 'Push unresolved candidates and pop those dominated by the current value.', operations: [
    { id: 'next-greater', label: 'Next Greater Element', time: 'O(n)', space: 'O(n)', seed: [2,1,2,4,3], parameter: 0 },
    { id: 'previous-greater', label: 'Previous Greater Element', time: 'O(n)', space: 'O(n)', seed: [2,1,2,4,3], parameter: 0 },
  ] },
  'two-heaps': { name: 'Two Heaps', definition: 'Balance a lower max-heap and upper min-heap around the running median.', operations: [
    { id: 'median', label: 'Running Median', time: 'O(n log n)', space: 'O(n)', seed: [5,2,8,1,9,3], parameter: 0 },
  ] },
  'top-k': { name: 'Top K Elements', definition: 'Use a bounded min-heap to retain only the largest k candidates.', operations: [
    { id: 'top-k-largest', label: 'K Largest Elements', time: 'O(n log(k+1))', space: 'O(k)', seed: [3,2,1,5,6,4], parameter: 3, parameterLabel: 'k' },
    { id: 'kth-largest', label: 'Kth Largest Element', time: 'O(n log(k+1))', space: 'O(k)', seed: [3,2,1,5,6,4], parameter: 2, parameterLabel: 'k' },
  ] },
  backtracking: { name: 'Backtracking', definition: 'Choose, recurse, and undo to explore index-distinct subset decisions.', operations: [
    { id: 'subsets', label: 'Generate Subsets', time: 'O(n × 2ⁿ)', space: 'O(n × 2ⁿ) output', seed: [1,2,3], parameter: 0, inputLabel: 'Values (max 8)' },
    { id: 'subset-sum', label: 'Subset Sum', time: 'O(n × 2ⁿ)', space: 'O(n × 2ⁿ) output', seed: [1,2,3,4], parameter: 5, parameterLabel: 'Target', inputLabel: 'Values (max 8)' },
  ] },
  'dynamic-programming': { name: 'Dynamic Programming', definition: 'Reuse a precisely defined previous optimum to compute the next state.', operations: [
    { id: 'max-subarray', label: 'Max Subarray Sum (Kadane)', time: 'O(n)', space: 'O(1)', seed: [-2,1,-3,4,-1,2,1,-5,4], parameter: 0 },
    { id: 'house-robber', label: 'House Robber', time: 'O(n)', space: 'O(1)', seed: [2,7,9,3,1], parameter: 0 },
  ] },
  'k-way-merge': {"name": "K-Way Merge", "definition": "Merge sorted lists by extracting the smallest frontier value.", "operationStyle": "buttons", "operations": [{"id": "merge-k-lists", "label": "Merge Sorted Lists", "seed": [1, 4, 7, 2, 5, 8, 3, 6, 9], "parameter": 3, "time": "O(N log(k+1))", "space": "O(k) + O(N) output", "parameterLabel": "List width", "inputLabel": "Sorted chunks, flattened"}]},
  'modified-binary-search': {"name": "Modified Binary Search", "definition": "Maintain a binary-search invariant on rotated arrays or insertion boundaries.", "operationStyle": "buttons", "operations": [{"id": "rotated-search", "label": "Rotated Array Search", "seed": [6, 7, 8, 1, 2, 3, 4], "parameter": 3, "time": "O(log n)", "space": "O(1)", "parameterLabel": "Target"}, {"id": "lower-bound", "label": "Lower Bound", "seed": [1, 2, 2, 4, 8], "parameter": 2, "time": "O(log n)", "space": "O(1)", "parameterLabel": "Target"}]},
  'subsets': {"name": "Subsets", "definition": "Enumerate index-distinct choices through cascading expansion or backtracking.", "operationStyle": "buttons", "operations": [{"id": "cascading-subsets", "label": "Cascading Subsets", "seed": [1, 2, 3], "parameter": 0, "time": "O(n × 2ⁿ)", "space": "O(n × 2ⁿ) output"}, {"id": "subsets", "label": "Backtracking Subsets", "seed": [1, 2, 3], "parameter": 0, "time": "O(n × 2ⁿ)", "space": "O(n × 2ⁿ) output"}]},
  'greedy': {"name": "Greedy Techniques", "definition": "Make locally optimal choices while maintaining a reachability or scheduling invariant.", "operationStyle": "buttons", "operations": [{"id": "activity-selection", "label": "Activity Selection", "seed": [1, 3, 2, 5, 3, 6, 6, 8], "parameter": 0, "time": "O(n log n)", "space": "O(n)", "inputLabel": "Half-open intervals: start,end,..."}, {"id": "jump-game", "label": "Jump Game", "seed": [2, 3, 1, 1, 4], "parameter": 0, "time": "O(n)", "space": "O(1)"}]},
  'cyclic-sort': {"name": "Cyclic Sort", "definition": "Place each value of a permutation in its corresponding index.", "operationStyle": "buttons", "operations": [{"id": "cyclic-sort", "label": "Sort Permutation", "seed": [3, 1, 5, 4, 2], "parameter": 0, "time": "O(n)", "space": "O(n) validation; O(1) sort", "inputLabel": "Permutation of 1..n"}]},
  'topological-sort': {"name": "Topological Sort", "definition": "Remove zero-indegree vertices to order dependencies and detect directed cycles.", "operationStyle": "buttons", "operations": [{"id": "topological-kahn", "label": "Kahn Topological Order", "seed": [0, 1, 0, 2, 1, 3, 2, 3], "parameter": 4, "time": "O(V + E)", "space": "O(V + E)", "parameterLabel": "Vertex count (1–8)", "inputLabel": "Directed edges: from,to,... (max 8)"}]},
  'matrices': {"name": "Matrices", "definition": "Traverse shrinking matrix boundaries or rotate a square matrix in place.", "operationStyle": "buttons", "operations": [{"id": "spiral", "label": "Spiral Traversal", "seed": [1, 2, 3, 4, 5, 6, 7, 8, 9], "parameter": 3, "time": "O(R × C)", "space": "O(R × C) output", "parameterLabel": "Columns (1–4)", "inputLabel": "Row-major values"}, {"id": "rotate-matrix", "label": "Rotate Clockwise", "seed": [1, 2, 3, 4, 5, 6, 7, 8, 9], "parameter": 3, "time": "O(n²)", "space": "O(1) auxiliary", "parameterLabel": "Columns (square matrix)", "inputLabel": "Row-major values"}]},
  'graph-traversals': {"name": "Graph Traversals Pattern", "definition": "Explore every component using a queue or a depth-first recursion stack.", "operationStyle": "buttons", "operations": [{"id": "graph-bfs", "label": "Breadth-First Traversal", "seed": [0, 1, 0, 2, 1, 3, 2, 3], "parameter": 4, "time": "O(V + E)", "space": "O(V + E)", "parameterLabel": "Vertex count (1–8)", "inputLabel": "Directed edges: from,to,... (max 8)"}, {"id": "graph-dfs", "label": "Depth-First Traversal", "seed": [0, 1, 0, 2, 1, 3, 2, 3], "parameter": 4, "time": "O(V + E)", "space": "O(V + E)", "parameterLabel": "Vertex count (1–8)", "inputLabel": "Directed edges: from,to,... (max 8)"}]},
  'trie-traversal': {"name": "Trie Traversal Pattern", "definition": "Follow character edges and distinguish prefixes from complete stored words.", "operationStyle": "buttons", "operations": [{"id": "trie-prefix", "label": "Prefix Match", "seed": [], "parameter": 0, "time": "O(total characters + query length)", "space": "O(total characters)", "textSeed": ["cat", "car", "dog"], "querySeed": "ca", "parameterLabel": "Prefix", "inputLabel": "Words (max 4, lowercase)"}, {"id": "trie-search", "label": "Exact Word Search", "seed": [], "parameter": 0, "time": "O(total characters + query length)", "space": "O(total characters)", "textSeed": ["cat", "car", "dog"], "querySeed": "car", "parameterLabel": "Word", "inputLabel": "Words (max 4, lowercase)"}]},
  'hash-map-pattern': {"name": "Hash Maps Pattern", "definition": "Store frequencies or previous indices for efficient complement lookups.", "operationStyle": "buttons", "operations": [{"id": "frequency-map", "label": "Frequency Map", "seed": [2, 1, 2, 3, 1, 2], "parameter": 0, "time": "O(n) expected", "space": "O(n)"}, {"id": "hash-two-sum", "label": "Two Sum With Map", "seed": [3, 2, 4, 7], "parameter": 6, "time": "O(n) expected", "space": "O(n)", "parameterLabel": "Target"}]},
  'union-find': {"name": "Union Find / Disjoint Set Union", "definition": "Merge components by size and shorten parent paths when locating representatives.", "operationStyle": "buttons", "operations": [{"id": "union-find", "label": "Union By Size", "seed": [0, 1, 2, 3, 1, 2, 4, 5], "parameter": 6, "time": "O(V + E α(V)) amortized", "space": "O(V)", "parameterLabel": "Vertex count (1–8)", "inputLabel": "Undirected edge pairs: from,to,..."}]},
  'bitwise-pattern': {"name": "Bitwise Manipulation Pattern", "definition": "Use XOR cancellation to identify a singleton or a missing bounded integer.", "operationStyle": "buttons", "operations": [{"id": "single-number", "label": "Single Number", "seed": [4, 1, 2, 1, 2], "parameter": 0, "time": "O(n)", "space": "O(n) validation; O(1) XOR"}, {"id": "missing-number", "label": "Missing Number", "seed": [3, 0, 1], "parameter": 0, "time": "O(n)", "space": "O(n) validation; O(1) XOR"}]},
  'mathematical': {"name": "Mathematical Patterns", "definition": "Trace Euclidean remainders, prime marking, and exact repeated squaring.", "operationStyle": "buttons", "operations": [{"id": "gcd", "label": "Euclidean GCD", "seed": [48, 18], "parameter": 0, "time": "O(log M)", "space": "O(1)", "inputLabel": "Two integers"}, {"id": "sieve", "label": "Sieve of Eratosthenes", "seed": [30], "parameter": 0, "time": "O(n log log n)", "space": "O(n)", "inputLabel": "Upper bound (0–63)"}, {"id": "fast-power", "label": "Fast Exponentiation", "seed": [3], "parameter": 5, "time": "O(log e) BigInteger multiplications", "space": "O(result bits)", "parameterLabel": "Exponent (0–16)", "inputLabel": "One integer base"}]},
};
const patternTopic = (id: PatternId): VisualizerTopic => ({
  id, title: PATTERNS[id].name, description: PATTERNS[id].definition, pattern: id,
  time: PATTERNS[id].operations[0].time, space: PATTERNS[id].operations[0].space,
  operations: PATTERNS[id].operations,
  modelScope: 'Step-by-step teaching operations with editable inputs and deterministic playback.',
});

export interface BitMetadata {
  readonly name: string;
  readonly definition: string;
  readonly time: 'O(1)';
  readonly space: 'O(1)';
  readonly operations: readonly { readonly id: BitOperation; readonly label: string }[];
  readonly seed: number;
  readonly parameter?: 'position' | 'distance' | 'operand';
}
// Complexity assumes fixed-width Java int registers. Population-count loops execute
// at most 32 iterations; for variable width w they are O(w), not constant time.
export const BIT_TOPICS: Record<BitTopicId, BitMetadata> = {
  'get-bit': {"name": "Get Bit", "definition": "AND with a single-bit mask to read one selected bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "get-bit", "label": "Get (AND)"}], "seed": 13, "parameter": "position"},
  'set-bit': {"name": "Set Bit", "definition": "OR with a single-bit mask to set the selected bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "set-bit", "label": "Set (OR)"}], "seed": 13, "parameter": "position"},
  'clear-bit': {"name": "Clear Bit", "definition": "AND with an inverted mask to clear the selected bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "clear-bit", "label": "Clear (AND / NOT)"}], "seed": 13, "parameter": "position"},
  'toggle-bit': {"name": "Toggle Bit", "definition": "XOR with a mask to flip the selected bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "toggle-bit", "label": "Toggle (XOR)"}], "seed": 13, "parameter": "position"},
  'odd-even': {"name": "Odd/Even Check", "definition": "Inspect bit zero to determine signed integer parity.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "odd-even", "label": "Check parity"}], "seed": 13},
  'power-of-two': {"name": "Power of 2 Validation", "definition": "Require positivity and exactly one set bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "power-of-two", "label": "Validate power of 2"}], "seed": 13},
  'left-shift': {"name": "Bitwise Multiplication (Left Shift)", "definition": "Shift left with zero fill and signed 32-bit overflow.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "left-shift", "label": "Left shift <<"}], "seed": 13, "parameter": "distance"},
  'right-shift': {"name": "Bitwise Division (Right Shift)", "definition": "Compare sign-extending and zero-filling right shifts.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "right-shift", "label": "Signed >>"}, {"id": "unsigned-right-shift", "label": "Unsigned >>>"}], "seed": -13, "parameter": "distance"},
  'sign-flipping': {"name": "Sign Flipping (Two’s Complement)", "definition": "Invert all bits and add one, retaining 32-bit overflow semantics.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "sign-flipping", "label": "Negate (~x + 1)"}], "seed": 13},
  'clear-rightmost-set': {"name": "Clear Rightmost Set Bit", "definition": "Use x AND (x - 1) to remove its lowest set bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "clear-rightmost-set", "label": "Clear (x & (x - 1))"}], "seed": 13},
  'isolate-rightmost-set': {"name": "Isolate Rightmost Set Bit", "definition": "Use x AND -x to retain only its lowest set bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "isolate-rightmost-set", "label": "Isolate (x & -x)"}], "seed": 13},
  'isolate-rightmost-clear': {"name": "Isolate Rightmost Clear Bit", "definition": "Use NOT x AND (x + 1) to isolate its lowest zero bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "isolate-rightmost-clear", "label": "Isolate (~x & (x + 1))"}], "seed": 13},
  'xor-swap': {"name": "XOR Swap (In-place)", "definition": "Swap two distinct registers through three XOR operations.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "xor-swap", "label": "Swap registers"}], "seed": 13, "parameter": "operand"},
  'xor-cancellation': {"name": "XOR Cancellation", "definition": "XOR the same operand twice to recover the original register.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "xor-cancellation", "label": "Cancel (x ^ y ^ y)"}], "seed": 13, "parameter": "operand"},
  'hamming-weight': {"name": "Bit Counting (Hamming Weight)", "definition": "Count the ones in a fixed 32-bit register, including its sign bit.", "time": "O(1)", "space": "O(1)", "operations": [{"id": "hamming-weight", "label": "Clear set bits"}, {"id": "count-by-shifting", "label": "Scan 32 bits"}], "seed": 13},
};
const bitTopic = (id: BitTopicId): VisualizerTopic => ({
  id, bit: id, title: BIT_TOPICS[id].name, description: BIT_TOPICS[id].definition,
  time: BIT_TOPICS[id].time, space: BIT_TOPICS[id].space, operations: BIT_TOPICS[id].operations,
  modelScope: 'Interactive signed 32-bit registers; constant complexity for fixed-width words.',
});

const allVisualizerTopics: readonly VisualizerCategory[] = [
  { id: 'searching', title: 'Searching Algorithms', description: 'Locate a target and watch the search space change.', icon: 'search', groups: [
    { id: 'search-methods', title: 'Search methods', description: 'Compare the assumptions and decisions behind each search.', topics: [
      { ...topic('binary-search', 'Binary Search', 'Halve a sorted search interval after each comparison.'), engine: 'binarySearch', workspace: 'search', modelScope: 'Search an editable sorted integer array for a target.' },
      { ...topic('linear-search', 'Linear Search', 'Inspect each element until the target is found or the sequence ends.'), workspace: 'linear-search', modelScope: 'Scan sorted or unsorted input, returning the first matching index.' },
      { ...topic('ternary-search', 'Ternary Search', 'Split a sorted search interval into three candidate regions.'), workspace: 'ternary-search', modelScope: 'Search sorted integers using two split points and three possible retained ranges.' },
      { ...topic('jump-search', 'Jump Search', 'Jump across a sorted array, then scan the candidate block.'), workspace: 'jump-search', modelScope: 'Probe square-root-sized block endpoints, then scan forward within the candidate block.' },
      { ...topic('exponential-search', 'Exponential Search', 'Expand a bound geometrically before a bounded binary search.'), workspace: 'exponential-search', modelScope: 'Double the bound, then trace binary search within the identified inclusive interval.' },
    ] },
  ] },
  { id: 'sorting', title: 'Sorting Algorithms', description: 'Follow comparisons, movements, partitions, and merges.', icon: 'sort', groups: [
    { id: 'sort-methods', title: 'Sorting methods', description: 'Explore eight approaches to putting values in order.', topics: [
      ...Object.entries(SORTING_ALGORITHMS).map(([id, meta]): VisualizerTopic => ({
        id: id.replace('_', '-'), title: meta.name, description: meta.definition, sorting: id as SortingAlgorithm,
        time: meta.time, space: meta.space, operations: meta.operations,
        modelScope: 'Ascending / descending integer sorting; at most 16 values. Counting Sort supports a span of 32 values.',
      })),
    ] },
  ] },
  { id: 'data-structures', title: 'Data Structures', description: 'Linear, non-linear, and key-value structures, with each variant kept distinct.', icon: 'database', groups: [
    { id: 'linear', title: 'Linear Data Structures', description: 'Sequence, link, push, pop, enqueue, and dequeue.', topics: [
      { ...topic('arrays', 'Arrays', 'Explore indexed access, traversal, and shifting elements.'), structure: 'arrays' },
      { ...topic('singly-linked-list', 'Singly Linked List', 'Follow next references during traversal and insertion.', 'Linked Lists'), structure: 'singly-linked-list' },
      { ...topic('doubly-linked-list', 'Doubly Linked List', 'Maintain previous and next references during updates.', 'Linked Lists'), structure: 'doubly-linked-list' },
      { ...topic('circular-linked-list', 'Circular Linked List', 'Follow a tail link back to the head without losing termination.', 'Linked Lists'), structure: 'circular-linked-list' },
      { ...topic('stacks', 'Stacks', 'Inspect last-in, first-out behavior through push and pop.'), structure: 'stacks' },
      { ...topic('standard-queue', 'Standard Queue', 'Inspect first-in, first-out behavior.', 'Queues'), structure: 'standard-queue' },
      { ...topic('priority-queue', 'Priority Queue', 'Remove items according to priority rather than arrival order.', 'Queues'), structure: 'priority-queue' },
      { ...topic('deque', 'Deque', 'Insert and remove at both ends of a sequence.', 'Queues'), structure: 'deque' },
    ] },
    { id: 'non-linear', title: 'Non-Linear Data Structures', description: 'Explore parent-child relationships, priorities, and connected vertices.', topics: [
      { ...topic('binary-tree', 'Binary Tree', 'Traverse a tree with at most two children per node.', 'Trees'), structure: 'binary-tree' },
      { ...topic('binary-search-tree', 'Binary Search Tree', 'Maintain the ordering invariant during search and updates.', 'Trees'), structure: 'binary-search-tree' },
      { ...topic('avl-tree', 'AVL Tree', 'Restore height balance with rotations after updates.', 'Trees'), structure: 'avl-tree' },
      { ...topic('red-black-tree', 'Red-Black Tree', 'Use recoloring and rotations to maintain balance invariants.', 'Trees'), structure: 'red-black-tree' },
      { ...topic('trie', 'Trie', 'Share prefixes along character-labeled paths.', 'Trees'), structure: 'trie' },
      { ...topic('max-heap', 'Max-Heap', 'Keep each parent at least as large as its children.', 'Heaps'), structure: 'max-heap' },
      { ...topic('min-heap', 'Min-Heap', 'Keep each parent no larger than its children.', 'Heaps'), structure: 'min-heap' },
      { ...topic('adjacency-list', 'Adjacency List', 'Represent each vertex with its neighboring vertices.', 'Graphs'), structure: 'adjacency-list' },
      { ...topic('adjacency-matrix', 'Adjacency Matrix', 'Represent connectivity in a vertex-by-vertex matrix.', 'Graphs'), structure: 'adjacency-matrix' },
      { ...topic('directed-graph', 'Directed Graph', 'Follow edges in their specified direction.', 'Graphs'), structure: 'directed-graph' },
      { ...topic('undirected-graph', 'Undirected Graph', 'Model bidirectional connections and symmetric adjacency.', 'Graphs'), structure: 'undirected-graph' },
    ] },
    { id: 'key-value', title: 'Key-Value & Set Data Structures', description: 'Observe hashing, collisions, equality, and uniqueness.', topics: [
      { ...topic('hash-tables', 'Hash Tables / Hash Maps (Collision Resolution)', 'Inspect buckets and collision resolution strategies.'), structure: 'hash-tables' },
      { ...topic('sets', 'Sets & HashSet Mechanics', 'Use hashing and equality to maintain unique membership.'), structure: 'sets' },
    ] },
  ] },
  { id: 'patterns', title: '24 Core Coding Patterns', description: 'Recognize reusable approaches across problem families.', icon: 'network', groups: [
    { id: 'core-patterns', title: 'Core patterns', description: 'Twenty-four distinct patterns, from pointer movement to mathematical structure.', topics: [
      patternTopic('two-pointers'),
      patternTopic('fast-slow'),
      patternTopic('sliding-window'),
      patternTopic('merge-intervals'),
      patternTopic('two-heaps'),
      patternTopic('k-way-merge'),
      patternTopic('top-k'),
      patternTopic('modified-binary-search'),
      patternTopic('subsets'),
      patternTopic('greedy'),
      patternTopic('backtracking'),
      patternTopic('dynamic-programming'),
      patternTopic('cyclic-sort'),
      patternTopic('topological-sort'),
      patternTopic('matrices'),
      patternTopic('monotonic-stack'),
      patternTopic('graph-traversals'),
      { ...topic('dfs', 'DFS (Depth-First Search)', 'Explore a branch before returning to its siblings.'), engine: 'treeTraversal', modelScope: 'This DFS model uses a binary tree. General graph DFS is not yet implemented.' },
      { ...topic('bfs', 'BFS (Breadth-First Search)', 'Use a queue to expand a graph by its edge-distance layers.'), engine: 'bfs', modelScope: 'A directed seven-node graph demonstrates queue-driven traversal and cycle handling.' },
      patternTopic('trie-traversal'),
      patternTopic('hash-map-pattern'),
      patternTopic('union-find'),
      patternTopic('bitwise-pattern'),
      patternTopic('mathematical'),
    ] },
  ] },
  { id: 'bits', title: 'Bit Manipulation Techniques', description: 'Inspect individual bits, masks, and fixed-width arithmetic.', icon: 'binary', groups: [
    { id: 'core-operations', title: 'Core Operations', description: 'Select one bit and inspect or change it.', topics: [
      bitTopic('get-bit'),
      bitTopic('set-bit'),
      bitTopic('clear-bit'),
      bitTopic('toggle-bit'),
    ] },
    { id: 'arithmetic', title: 'Arithmetic & Property Hacks', description: 'Relate fixed-width bit patterns to arithmetic properties.', topics: [
      bitTopic('odd-even'),
      bitTopic('power-of-two'),
      bitTopic('left-shift'),
      bitTopic('right-shift'),
      bitTopic('sign-flipping'),
    ] },
    { id: 'advanced-masks', title: 'Advanced Masking Techniques', description: 'Combine masks to isolate, remove, exchange, and count bits.', topics: [
      bitTopic('clear-rightmost-set'),
      bitTopic('isolate-rightmost-set'),
      bitTopic('isolate-rightmost-clear'),
      bitTopic('xor-swap'),
      bitTopic('xor-cancellation'),
      bitTopic('hamming-weight'),
    ] },
  ] },
];

/**
 * Categories on hold until their redesign: they stay in the codebase (the engines still compile)
 * but are not listed, linked or counted anywhere in the hub. Remove an id here to bring it back.
 */
export const ON_HOLD_CATEGORIES: ReadonlySet<VisualizerCategoryId> = new Set<VisualizerCategoryId>(['data-structures', 'bits']);
export const visualizerTopics: readonly VisualizerCategory[] = allVisualizerTopics.filter(category => !ON_HOLD_CATEGORIES.has(category.id));

export const getCategoryTopics = (category: VisualizerCategory): readonly VisualizerTopic[] => category.groups.flatMap(group => group.topics);
export const isInteractiveTopic = (topic: VisualizerTopic): boolean => Boolean(topic.engine || topic.workspace || topic.structure || topic.sorting || topic.pattern || topic.bit);
export const getInteractiveCount = (category: VisualizerCategory): number => getCategoryTopics(category).filter(isInteractiveTopic).length;
export default visualizerTopics;
