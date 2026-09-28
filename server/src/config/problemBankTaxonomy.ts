/**
 * The Problem Bank's controlled vocabulary.
 *
 * Every older store invented its own: five difficulty scales, topics in five differently named
 * fields, three names for "hidden test". The bank has exactly one of each, and anything that
 * imports into it (bulk files, AI, the legacy modules) is mapped onto these values.
 */

/** Languages the judge can actually run — each one is installed on Piston (scripts/piston-init.sh). */
export const PB_LANGUAGES = [
  { key: 'python', label: 'Python 3', monaco: 'python' },
  { key: 'java', label: 'Java', monaco: 'java' },
  { key: 'cpp', label: 'C++', monaco: 'cpp' },
  { key: 'c', label: 'C', monaco: 'c' },
  { key: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { key: 'typescript', label: 'TypeScript', monaco: 'typescript' },
  { key: 'csharp', label: 'C#', monaco: 'csharp' },
  { key: 'go', label: 'Go', monaco: 'go' },
  { key: 'rust', label: 'Rust', monaco: 'rust' },
] as const;
export type PbLanguage = typeof PB_LANGUAGES[number]['key'];
export const PB_LANGUAGE_KEYS = PB_LANGUAGES.map((l) => l.key) as string[];

export const PB_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type PbDifficulty = typeof PB_DIFFICULTIES[number];

/** Default marks per difficulty. A problem may override, and every assignment/exam may override again. */
export const PB_DEFAULT_MARKS: Record<PbDifficulty, number> = { easy: 10, medium: 20, hard: 30 };

/**
 * Topic keys. Stored as the key; the label is for display. Ordered roughly by how often they
 * appear in interview problem sets, so the filter reads sensibly top-down.
 */
export const PB_TOPICS: { key: string; label: string; group: string }[] = [
  { key: 'basics', label: 'Basic Programming', group: 'Foundations' },
  { key: 'patterns', label: 'Patterns', group: 'Foundations' },
  { key: 'math', label: 'Math', group: 'Foundations' },
  { key: 'number-theory', label: 'Number Theory', group: 'Foundations' },
  { key: 'bit-manipulation', label: 'Bit Manipulation', group: 'Foundations' },
  { key: 'recursion', label: 'Recursion', group: 'Foundations' },
  { key: 'simulation', label: 'Simulation', group: 'Foundations' },
  { key: 'array', label: 'Array', group: 'Data Structures' },
  { key: 'string', label: 'String', group: 'Data Structures' },
  { key: 'hash-table', label: 'Hash Table', group: 'Data Structures' },
  { key: 'matrix', label: 'Matrix', group: 'Data Structures' },
  { key: 'linked-list', label: 'Linked List', group: 'Data Structures' },
  { key: 'stack', label: 'Stack', group: 'Data Structures' },
  { key: 'queue', label: 'Queue', group: 'Data Structures' },
  { key: 'monotonic-stack', label: 'Monotonic Stack', group: 'Data Structures' },
  { key: 'heap', label: 'Heap (Priority Queue)', group: 'Data Structures' },
  { key: 'tree', label: 'Tree', group: 'Data Structures' },
  { key: 'binary-tree', label: 'Binary Tree', group: 'Data Structures' },
  { key: 'bst', label: 'Binary Search Tree', group: 'Data Structures' },
  { key: 'trie', label: 'Trie', group: 'Data Structures' },
  { key: 'graph', label: 'Graph', group: 'Data Structures' },
  { key: 'union-find', label: 'Union Find', group: 'Data Structures' },
  { key: 'segment-tree', label: 'Segment / Fenwick Tree', group: 'Data Structures' },
  { key: 'two-pointers', label: 'Two Pointers', group: 'Techniques' },
  { key: 'sliding-window', label: 'Sliding Window', group: 'Techniques' },
  { key: 'prefix-sum', label: 'Prefix Sum', group: 'Techniques' },
  { key: 'sorting', label: 'Sorting', group: 'Techniques' },
  { key: 'binary-search', label: 'Binary Search', group: 'Techniques' },
  { key: 'greedy', label: 'Greedy', group: 'Techniques' },
  { key: 'backtracking', label: 'Backtracking', group: 'Techniques' },
  { key: 'divide-and-conquer', label: 'Divide and Conquer', group: 'Techniques' },
  { key: 'dynamic-programming', label: 'Dynamic Programming', group: 'Techniques' },
  { key: 'memoization', label: 'Memoization', group: 'Techniques' },
  { key: 'dfs', label: 'Depth-First Search', group: 'Graphs' },
  { key: 'bfs', label: 'Breadth-First Search', group: 'Graphs' },
  { key: 'topological-sort', label: 'Topological Sort', group: 'Graphs' },
  { key: 'shortest-path', label: 'Shortest Path', group: 'Graphs' },
  { key: 'string-matching', label: 'String Matching', group: 'Advanced' },
  { key: 'combinatorics', label: 'Combinatorics', group: 'Advanced' },
  { key: 'geometry', label: 'Geometry', group: 'Advanced' },
  { key: 'game-theory', label: 'Game Theory', group: 'Advanced' },
  { key: 'design', label: 'Design', group: 'Advanced' },
  { key: 'sql', label: 'SQL / Database', group: 'Databases' },
];
export const PB_TOPIC_KEYS = new Set(PB_TOPICS.map((t) => t.key));

/** Map loose topic text ("Dynamic Programming", "DP", "two pointer") onto a topic key. */
const TOPIC_ALIASES: Record<string, string> = {
  dp: 'dynamic-programming', 'dynamic programming': 'dynamic-programming',
  arrays: 'array', strings: 'string', hashing: 'hash-table', hashmap: 'hash-table', 'hash map': 'hash-table',
  'two pointer': 'two-pointers', 'two pointers': 'two-pointers', 'sliding window': 'sliding-window',
  'prefix sums': 'prefix-sum', 'prefix sum': 'prefix-sum', 'binary search': 'binary-search',
  trees: 'tree', 'binary tree': 'binary-tree', graphs: 'graph', 'linked list': 'linked-list',
  'priority queue': 'heap', heaps: 'heap', 'bit manipulation': 'bit-manipulation', bits: 'bit-manipulation',
  'depth first search': 'dfs', 'breadth first search': 'bfs', 'topological sort': 'topological-sort',
  'shortest path': 'shortest-path', dijkstra: 'shortest-path', 'union find': 'union-find', dsu: 'union-find',
  'number theory': 'number-theory', 'basic programming': 'basics', basic: 'basics', loops: 'basics',
  database: 'sql', databases: 'sql', 'divide and conquer': 'divide-and-conquer', 'monotonic stack': 'monotonic-stack',
  'string matching': 'string-matching', 'game theory': 'game-theory', 'segment tree': 'segment-tree',
  'fenwick tree': 'segment-tree', bst: 'bst', 'binary search tree': 'bst',
};

export function normalizeTopic(raw: string): string | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (PB_TOPIC_KEYS.has(s)) return s;
  const dashed = s.replace(/[\s_]+/g, '-');
  if (PB_TOPIC_KEYS.has(dashed)) return dashed;
  if (TOPIC_ALIASES[s]) return TOPIC_ALIASES[s];
  const byLabel = PB_TOPICS.find((t) => t.label.toLowerCase() === s);
  return byLabel ? byLabel.key : null;
}

/** Map any of the legacy difficulty scales onto easy/medium/hard. */
export function normalizeDifficulty(raw: unknown): PbDifficulty {
  if (typeof raw === 'number') return raw <= 2 ? 'easy' : raw === 3 ? 'medium' : 'hard';
  const s = String(raw || '').trim().toLowerCase();
  if (['easy', 'beginner', 'basic', '1', '2'].includes(s)) return 'easy';
  if (['hard', 'advanced', 'expert', 'interview', '4', '5'].includes(s)) return 'hard';
  return 'medium';
}

/** Normalise a language name from any source onto a judge key, or null if we cannot run it. */
export function normalizeLanguage(raw: string): PbLanguage | null {
  const s = String(raw || '').trim().toLowerCase();
  const map: Record<string, PbLanguage> = {
    python: 'python', python3: 'python', py: 'python',
    java: 'java',
    cpp: 'cpp', 'c++': 'cpp', cplusplus: 'cpp',
    c: 'c',
    javascript: 'javascript', js: 'javascript', node: 'javascript', nodejs: 'javascript',
    typescript: 'typescript', ts: 'typescript',
    csharp: 'csharp', 'c#': 'csharp', cs: 'csharp',
    go: 'go', golang: 'go',
    rust: 'rust', rs: 'rust',
  };
  return map[s] || null;
}
