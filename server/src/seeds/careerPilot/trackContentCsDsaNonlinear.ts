/**
 * Career-track content: DSA in C# — trees, heaps, graphs, greedy and dynamic programming
 * (JT_CS_DSA_NONLINEAR), for the .NET Full Stack + AI track.
 *
 * The learner met these structures in Python during the years; here they are written again in C#,
 * with the .NET collections that carry them — Queue<T>, Stack<T>, SortedSet<T>, SortedDictionary,
 * and PriorityQueue<TElement, TPriority> (.NET 6+). Heaps are built by hand first, because the
 * graded runner is Mono (about C# 7) and has no PriorityQueue, and because interviewers ask for it.
 *
 * Attribution: the topic is multi-skill (DSA_TREES, DSA_HEAPS, DSA_GRAPHS, DSA_GREEDY, DSA_DP), so
 * every checkpoint question names the one skill it measures — a lesson's own skill, and for the
 * debugging, practice, interview and checkpoint units whichever of the five the question tests.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/* Large grids for the graded BFS exercise, built here rather than pasted as 100 KB of dots. */
const header = (rows: number, cols: number) => `${rows} ${cols}\n`;

/** An n × n grid with no walls: S top-left, E bottom-right. The answer is 2(n - 1). */
const openGrid = (n: number): string => {
  const lines: string[] = [];
  for (let r = 0; r < n; r++) {
    let row = '.'.repeat(n);
    if (r === 0) row = 'S' + row.slice(1);
    if (r === n - 1) row = row.slice(0, n - 1) + 'E';
    lines.push(row);
  }
  return header(n, n) + lines.join('\n') + '\n';
};

/**
 * A serpentine maze: open rows separated by wall rows with one gap, alternating right and left,
 * so the only route snakes through every open row. With `barriers` wall rows and width `w`, S at
 * (0,0) and E at (2·barriers, 0) for an even barrier count, the answer is barriers·(w-1) + 2·barriers.
 */
const snakeGrid = (barriers: number, w: number): string => {
  const lines: string[] = [];
  const rows = 2 * barriers + 1;
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) lines.push('.'.repeat(w));
    else {
      const gapRight = ((r - 1) / 2) % 2 === 0;
      lines.push(gapRight ? '#'.repeat(w - 1) + '.' : '.' + '#'.repeat(w - 1));
    }
  }
  lines[0] = 'S' + lines[0].slice(1);
  lines[rows - 1] = 'E' + lines[rows - 1].slice(1);
  return header(rows, w) + lines.join('\n') + '\n';
};

export const TRACK_CS_DSA_NONLINEAR_BUNDLES: PilotBundle[] = [
  /* ══ Trees ══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_TREES',
    notes: `A **binary tree** is a set of nodes where each node has at most two children. In C# the node
class an interviewer hands you looks like this (public fields, PascalCase — the .NET convention):

    public class TreeNode
    {
        public int Val;
        public TreeNode Left, Right;
        public TreeNode(int val) { Val = val; }
    }

A tree is recursive: a node, a left subtree and a right subtree, either of which may be \`null\`.
So nearly every tree method is recursive, and every one starts by answering **what do I return
for null?** In Python you wrote \`if node is None\`; in C# it is \`if (node == null)\`.

## Depth-first traversals

The three orders differ only in where the node's own work happens:

    static void Preorder(TreeNode n, List<int> output)   // node, left, right
    {
        if (n == null) return;
        output.Add(n.Val);
        Preorder(n.Left, output);
        Preorder(n.Right, output);
    }
    // Inorder:   left, node, right   (ascending order for a BST)
    // Postorder: left, right, node   (children first — sizes, heights, freeing)

Pass one \`List<int>\` down and add to it. Building and concatenating a new list in every call
(the Python habit of \`return left + [val] + right\`) turns O(n) into O(n²) on a skewed tree.

## Height

    static int Height(TreeNode n)
    {
        if (n == null) return 0;
        return 1 + Math.Max(Height(n.Left), Height(n.Right));
    }

This is postorder: both children's answers are needed before the node's own.

## Iterative inorder with Stack<T>

Recursion depth equals the tree's height. A tree of 100,000 nodes that leans one way recurses
100,000 frames deep, and in .NET a **StackOverflowException cannot be caught** — the process is
killed. When depth is unbounded, keep the stack yourself:

    static List<int> Inorder(TreeNode root)
    {
        var result = new List<int>();
        var stack = new Stack<TreeNode>();
        TreeNode cur = root;
        while (cur != null || stack.Count > 0)
        {
            while (cur != null) { stack.Push(cur); cur = cur.Left; }   // go far left
            cur = stack.Pop();
            result.Add(cur.Val);
            cur = cur.Right;
        }
        return result;
    }

## Classic problem: level-order traversal (LeetCode 102)

Return the values level by level. That is **breadth first**, which needs a FIFO queue:

    static List<List<int>> LevelOrder(TreeNode root)
    {
        var result = new List<List<int>>();
        if (root == null) return result;
        var queue = new Queue<TreeNode>();
        queue.Enqueue(root);
        while (queue.Count > 0)
        {
            int levelSize = queue.Count;          // nodes on this level, fixed now
            var level = new List<int>();
            for (int i = 0; i < levelSize; i++)
            {
                TreeNode n = queue.Dequeue();
                level.Add(n.Val);
                if (n.Left != null) queue.Enqueue(n.Left);
                if (n.Right != null) queue.Enqueue(n.Right);
            }
            result.Add(level);
        }
        return result;
    }

\`int levelSize = queue.Count\` is read **before** the inner loop. Children are enqueued while it
runs, so \`i < queue.Count\` in the condition would never let the level end.

One C# detail: unlike Java's \`ArrayDeque\`, \`Queue<T>\` happily accepts \`null\`. Forget the
\`!= null\` checks and the nulls go in, come out, and \`n.Val\` throws **NullReferenceException** on
the next level — far from the line that caused it.

**Cost.** Every node is enqueued and dequeued once: O(n) time. The queue holds at most one level —
up to about n/2 nodes for a complete tree. The recursive traversals use O(h) stack: O(log n)
balanced, O(n) for a tree that is really a linked list.`,
    workedExample: `**Goal: the right-side view — the last value on each level.**

Tree: 1 at the root, 2 and 3 its children, 5 as 2's right child, 4 as 3's right child.

Run \`LevelOrder\`. Level 1 dequeues [1]; the last is 1. Level 2 dequeues [2, 3]; the last is 3.
Level 3 dequeues [5, 4]; the last is 4. Answer: [1, 3, 4].

The one change is inside the for loop: \`if (i == levelSize - 1) view.Add(n.Val);\`. The size captured
before the loop is what makes "the last node on this level" a meaningful question.`,
    mcqs: [
      mcq('In a C# level-order walk, why is int levelSize = queue.Count taken before the for loop instead of using queue.Count in its condition?',
        [['Children enqueued during the loop would otherwise be counted in this level', true],
          ['Queue<T>.Count is O(n), so it should be read only once per level of the tree', false],
          ['Reading Count while dequeuing throws InvalidOperationException', false],
          ['It forces the right child to be dequeued before the left one', false]],
        'The loop enqueues the next level onto the same queue, so Count keeps growing. Fixing the number first is what separates one level from the next.'),
      mcq('A recursive C# Preorder runs on a 300,000-node tree where every node has only a Left child. What happens?',
        [['The process dies with a StackOverflowException that no catch can handle', true],
          ['An OutOfMemoryException is thrown when the List<int> grows too large', false],
          ['A NullReferenceException is thrown at the deepest node', false],
          ['It completes normally, because the JIT turns the recursion into a loop for you', false]],
        'The recursion is 300,000 frames deep and overflows the thread stack. In .NET that exception cannot be caught; the fix is an explicit Stack<TreeNode>.'),
      mcq('A level-order loop calls queue.Enqueue(n.Left) and queue.Enqueue(n.Right) with no null checks. What happens on a tree with a leaf?',
        [['The nulls are queued, and reading n.Val on one throws NullReferenceException', true],
          ['Queue<TreeNode>.Enqueue(null) throws ArgumentNullException at once', false],
          ['The nulls are skipped by Queue<T>, so the output is still correct', false],
          ['The compiler rejects passing a possibly-null reference to Queue<T>.Enqueue', false]],
        'Queue<T> stores null like any other value. The failure appears one level later when the null is dequeued and its Val is read.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'In the iterative C# Inorder, what is the inner while (cur != null) { stack.Push(cur); cur = cur.Left; } loop doing?',
        [['Pushing the path down to the leftmost unvisited node', true],
          ['Pushing every node of the tree onto the stack at once', false],
          ['Skipping the left subtree so the right is visited first', false],
          ['Counting the height of the left subtree as it descends', false]],
        'Inorder visits a node only after its whole left subtree, so the loop descends left, remembering each ancestor on the stack to come back to.'),
      ck('DSA_TREES', 'A helper returns new List<int>(left) plus the node and right part, building a fresh list in every call. On a left-leaning chain of n nodes, what is the cost?',
        [['O(n²), as each level copies a list of up to n items', true],
          ['O(n), as each node is still visited only once', false],
          ['O(n log n), as the copies halve at each level', false],
          ['O(log n), as only the path to one leaf is copied', false]],
        'On a chain the lists copied have sizes 1, 2, …, n, which sums to about n²/2. Passing one shared List<int> down keeps the walk O(n).'),
      ck('DSA_TREES', 'Height(TreeNode n) returns 0 for null and 1 + Math.Max of the two children. What does it return for a single node with no children?',
        [['1', true],
          ['0', false],
          ['2', false],
          ['-1', false]],
        'Both children are null and return 0, so the node returns 1 + Math.Max(0, 0) = 1. Some books count edges instead and would say 0 — read the base case.'),
    ],
  },

  /* ══ Binary search trees ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_BST',
    notes: `A **binary search tree** adds one rule to a binary tree: for every node, every value in its
**left subtree** is smaller and every value in its **right subtree** is larger. "Every value in the
subtree", not just the child — that phrase is where most BST bugs live.

## Search and insert

    static TreeNode Search(TreeNode n, int key)
    {
        while (n != null && n.Val != key)
            n = key < n.Val ? n.Left : n.Right;
        return n;                                   // null if absent
    }

    static TreeNode Insert(TreeNode n, int key)
    {
        if (n == null) return new TreeNode(key);
        if (key < n.Val) n.Left = Insert(n.Left, key);
        else if (key > n.Val) n.Right = Insert(n.Right, key);
        return n;                                   // duplicates ignored
    }

Each step discards one subtree, so both are O(h). Balanced, h ≈ log n. Insert sorted data
(1, 2, 3, …) and every node goes right: h = n, and the "tree" is a linked list with extra steps.

Note the shape of \`Insert\`: it **returns** the subtree root and the caller assigns it
(\`root = Insert(root, 7);\`). Forget the assignment on an empty tree and the new node is lost.

## Delete

Three cases. A leaf is simply removed. A node with one child is replaced by that child. A node
with two children takes the value of its **inorder successor** — the smallest value in its right
subtree — and that successor is then deleted from the right subtree:

    static TreeNode Delete(TreeNode n, int key)
    {
        if (n == null) return null;
        if (key < n.Val) n.Left = Delete(n.Left, key);
        else if (key > n.Val) n.Right = Delete(n.Right, key);
        else
        {
            if (n.Left == null) return n.Right;
            if (n.Right == null) return n.Left;
            TreeNode s = n.Right;
            while (s.Left != null) s = s.Left;      // successor
            n.Val = s.Val;
            n.Right = Delete(n.Right, s.Val);
        }
        return n;
    }

## Classic problem: validate a BST (LeetCode 98)

Checking only \`Left.Val < Val < Right.Val\` is wrong. In this tree

        5
       / \\
      1   6
         / \\
        3   7

every parent–child pair looks fine, but 3 is in 5's right subtree and smaller than 5. Each node
must lie inside a **range** inherited from all its ancestors:

    static bool IsValidBst(TreeNode root)
    {
        return Valid(root, long.MinValue, long.MaxValue);
    }

    static bool Valid(TreeNode n, long low, long high)
    {
        if (n == null) return true;
        if (n.Val <= low || n.Val >= high) return false;
        return Valid(n.Left, low, n.Val) && Valid(n.Right, n.Val, high);
    }

Why \`long\` bounds? A node may legitimately hold \`int.MaxValue\`; with \`int\` bounds starting at
\`int.MaxValue\` it would fail \`n.Val >= high\`. An idiomatic C# alternative is \`int?\` bounds where
\`null\` means "no limit". Another valid check: an inorder walk must be **strictly increasing**.

## The ready-made ones in .NET

You rarely write a BST in production. .NET ships balanced (red-black) trees:

- \`SortedSet<T>\` — \`Add\`, \`Remove\`, \`Contains\` in O(log n), \`Min\`, \`Max\`, and
  \`GetViewBetween(lo, hi)\` for a range. Enumerates in ascending order.
- \`SortedDictionary<TKey, TValue>\` — a map kept in key order, O(log n) per operation.
- \`SortedList<TKey, TValue>\` — also sorted, but backed by arrays: fast lookups, O(n) inserts.

Python has no built-in sorted set; in C# reach for \`SortedSet<int>\` whenever a problem says "the
smallest value greater than x" or "keep the values ordered as they arrive".`,
    workedExample: `**Goal: the kth smallest value in a BST (LeetCode 230), with k = 3.**

Tree built by inserting 5, 3, 6, 2, 4, 1. Inorder visits a BST in ascending order, so the kth
value visited is the answer — and we can stop there:

    static int KthSmallest(TreeNode root, int k)
    {
        var stack = new Stack<TreeNode>();
        TreeNode cur = root;
        while (true)
        {
            while (cur != null) { stack.Push(cur); cur = cur.Left; }
            cur = stack.Pop();
            if (--k == 0) return cur.Val;
            cur = cur.Right;
        }
    }

Push 5, 3, 2, 1. Pop 1 (k → 2), pop 2 (k → 1), pop 3 (k → 0): return **3**. Cost O(h + k), not
O(n) — the walk never touches 4, 5 or 6.`,
    mcqs: [
      mcq('static TreeNode Insert(TreeNode n, int key) returns the subtree root. A caller writes Insert(root, 7); with root == null. What happens?',
        [['The new node is created and then lost, and root stays null', true],
          ['root now refers to the new node, since classes are reference types', false],
          ['A NullReferenceException is thrown inside Insert at once', false],
          ['The compiler warns that the return value of Insert is unused', false]],
        'C# passes the reference by value; Insert builds a node and returns it, but nothing stores it. The call must be root = Insert(root, 7);'),
      mcq('Why does Valid(TreeNode n, long low, long high) use long bounds rather than int?',
        [['A node holding int.MaxValue would fail an int bound that starts there', true],
          ['TreeNode.Val is promoted to long anyway by the comparison operators, so it is free', false],
          ['long comparisons are faster than int ones on a 64-bit runtime', false],
          ['int cannot represent the negative values found in a left subtree', false]],
        'With high = int.MaxValue, a node whose Val is int.MaxValue fails n.Val >= high although it is valid. long bounds sit strictly outside every int.'),
      mcq('Which .NET collection answers "the values between 10 and 20, in order" without scanning everything?',
        [['SortedSet<int>.GetViewBetween(10, 20)', true],
          ['HashSet<int>.Where(x => x >= 10 && x <= 20)', false],
          ['Dictionary<int, int>.Keys filtered and then sorted', false],
          ['List<int>.FindAll with the range as a predicate', false]],
        'SortedSet is a balanced tree, so it can jump to 10 and walk forward. The other three examine every element.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'You call Insert for 40, 20, 60, 10, 30, 50 on an empty BST and then print a preorder walk. What is printed?',
        [['40 20 10 30 60 50', true],
          ['10 20 30 40 50 60', false],
          ['40 20 60 10 30 50', false],
          ['10 30 20 50 60 40', false]],
        'Preorder prints the node, then the left subtree, then the right: 40, then 20 with 10 and 30, then 60 with 50. The others are inorder, level order and postorder.'),
      ck('DSA_TREES', 'Delete removes 40 from the BST holding 40 (20 (10, 30), 60 (50)). Which value ends up at the root?',
        [['50, the smallest value in the right subtree', true],
          ['30, the largest value in the left subtree', false],
          ['60, the right child moved up into place', false],
          ['20, the left child moved up into place', false]],
        'The root has two children, so it copies its inorder successor — the leftmost node of the right subtree, 50 — and deletes 50 from the right subtree.'),
      ck('DSA_TREES', 'var set = new SortedSet<int> { 9, 2, 7, 4 }; — what do set.Min and set.Max return?',
        [['2 and 9', true],
          ['9 and 4', false],
          ['2 and 7', false],
          ['9 and 2', false]],
        'SortedSet keeps its elements in ascending order whatever the insertion order, so Min is 2 and Max is 9.'),
    ],
  },

  /* ══ Heaps ═══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_HEAPS',
    notes: `A **binary heap** is a complete binary tree stored in an array, where every parent is no
larger than its children (a **min-heap**). The smallest value is always at index 0. For the node
at index i:

    parent = (i - 1) / 2      left = 2 * i + 1      right = 2 * i + 2

No \`TreeNode\` objects, no pointers — the shape is implied by the indexes. That is why a heap is
fast and compact.

## A min-heap by hand

Interviewers ask for this, and some runners (including our grader, Mono ≈ C# 7) do not have
.NET's built-in priority queue, so learn it once:

    class MinHeap
    {
        private readonly List<int> a = new List<int>();
        public int Count { get { return a.Count; } }
        public int Peek() { return a[0]; }

        public void Push(int x)
        {
            a.Add(x);
            int i = a.Count - 1;
            while (i > 0 && a[(i - 1) / 2] > a[i])        // sift up
            {
                Swap(i, (i - 1) / 2);
                i = (i - 1) / 2;
            }
        }

        public int Pop()
        {
            int top = a[0];
            a[0] = a[a.Count - 1];
            a.RemoveAt(a.Count - 1);                      // O(1): removes the last slot
            int i = 0;
            while (true)                                  // sift down
            {
                int l = 2 * i + 1, r = l + 1, m = i;
                if (l < a.Count && a[l] < a[m]) m = l;
                if (r < a.Count && a[r] < a[m]) m = r;
                if (m == i) break;
                Swap(i, m);
                i = m;
            }
            return top;
        }

        private void Swap(int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }
    }

Push and Pop are O(log n) — one root-to-leaf path. Peek is O(1). \`a.RemoveAt(0)\` would be O(n),
which is why Pop moves the **last** element to the root and removes the last slot instead.

## PriorityQueue<TElement, TPriority> (.NET 6+)

Modern .NET has one built in. It is a min-heap on the **priority**, which is separate from the
element:

    var pq = new PriorityQueue<string, int>();
    pq.Enqueue("write tests", 2);
    pq.Enqueue("fix outage", 0);
    pq.Enqueue("refactor", 5);
    Console.WriteLine(pq.Dequeue());   // fix outage
    Console.WriteLine(pq.Peek());      // write tests

Know its edges: it does **not** guarantee FIFO order among equal priorities; it has no
"decrease priority" (enqueue again and skip stale entries); it does not let you enumerate in
order; and for a max-heap you pass a reversed comparer:
\`new PriorityQueue<int, int>(Comparer<int>.Create((x, y) => y.CompareTo(x)))\`. Never write
\`(x, y) => y - x\` — the subtraction overflows for large values of opposite sign.
Before .NET 6, people used \`SortedSet<T>\` with a tie-breaker as a heap; that still works.

## Classic problem: kth largest element (LeetCode 215)

Keep a **min-heap of size k**. Every value goes in; when the heap grows past k, pop the smallest.
What is left are the k largest, and the root is the smallest of them — the kth largest:

    static int KthLargest(int[] nums, int k)
    {
        var heap = new MinHeap();
        foreach (int x in nums)
        {
            heap.Push(x);
            if (heap.Count > k) heap.Pop();
        }
        return heap.Peek();
    }

O(n log k) time and O(k) space — better than sorting (O(n log n)) when k is small, and it works on
a stream you cannot hold in memory.

## Two more heap patterns

- **Merge k sorted lists.** Put the head of each list in a heap keyed by value. Pop the smallest,
  output it, push that list's next element. O(N log k) for N elements in total.
- **Running median.** Keep the lower half in a max-heap and the upper half in a min-heap, sizes
  differing by at most one. The median is a root or the mean of both roots. O(log n) per value.`,
    workedExample: `**Goal: trace MinHeap.Push for 5, 3, 8, 1, then one Pop.**

- Push 5: a = [5].
- Push 3: a = [5, 3]; parent of index 1 is 0 and 5 > 3, swap → [3, 5].
- Push 8: a = [3, 5, 8]; parent 3 < 8, stays.
- Push 1: a = [3, 5, 8, 1]; index 3's parent is 1 (5 > 1) → [3, 1, 8, 5]; index 1's parent is 0
  (3 > 1) → [1, 3, 8, 5].
- Pop: returns 1. The last element 5 moves to the root → [5, 3, 8]. Children 3 and 8; 3 is smaller
  and less than 5, swap → [3, 5, 8]. Done.

After the Pop, Peek is 3 — the next smallest — and the array is a valid heap again.`,
    mcqs: [
      mcq('In MinHeap.Pop, why is the last element moved to index 0 instead of calling a.RemoveAt(0)?',
        [['RemoveAt(0) shifts every element left and breaks the parent-child layout', true],
          ['List<int>.RemoveAt(0) throws when the list holds a single element', false],
          ['Moving the last element keeps the array sorted from smallest to largest', false],
          ['RemoveAt(0) is fine; moving the last element is only a matter of coding style', false]],
        'RemoveAt(0) is O(n) and every index shifts by one, so parents and children no longer line up. Moving the last element and sifting down is O(log n).'),
      mcq('var pq = new PriorityQueue<string, int>(); pq.Enqueue("b", 3); pq.Enqueue("a", 1); pq.Enqueue("c", 2); — what does pq.Dequeue() return?',
        [['"a", the element with the lowest priority value', true],
          ['"b", the element that was enqueued first', false],
          ['"c", the element with the middle priority', false],
          ['"a", because elements are compared alphabetically', false]],
        'PriorityQueue is a min-heap on the priority, not the element. Priority 1 is the smallest, so "a" comes out — because of its priority, not its letter.'),
      mcq('To find the kth largest of a million numbers with a heap, which heap and size do you keep?',
        [['A min-heap of size k; its root ends as the kth largest', true],
          ['A max-heap of size k; its root ends as the kth largest', false],
          ['A max-heap of all values; pop k times and return the last', false],
          ['A min-heap of all values; pop n - k times and peek', false]],
        'Keeping the k largest means evicting the smallest of them, which a min-heap does in O(log k). The last two work but cost O(n) space.'),
    ],
    checkpoint: [
      ck('DSA_HEAPS', 'In the array form of a heap, the node at index 5 has its parent at which index?',
        [['2', true],
          ['3', false],
          ['4', false],
          ['10', false]],
        'parent = (i - 1) / 2 with integer division, so (5 - 1) / 2 = 2. Index 10 would be a child of 4, not a parent of 5.'),
      ck('DSA_HEAPS', 'A running-median class keeps a max-heap "low" and a min-heap "high". After adding 4, 1, 7, what is the median?',
        [['4, the root of whichever heap holds one extra value', true],
          ['1, the root of the max-heap holding the lower half', false],
          ['5.5, the mean of the two heap roots at that point', false],
          ['7, the root of the min-heap holding the upper half', false]],
        'The three values sorted are 1, 4, 7. With an odd count one heap holds one more value, and its root — 4 — is the median.'),
      ck('DSA_HEAPS', 'A max-heap PriorityQueue is built with Comparer<int>.Create((x, y) => y - x). What can go wrong?',
        [['y - x overflows for values far apart, giving a wrong sign and order', true],
          ['Comparer<int>.Create does not accept a lambda that takes two arguments', false],
          ['It makes a min-heap, since the comparer is ignored for int priorities', false],
          ['Nothing — for int priorities, subtraction is the recommended way', false]],
        'int.MaxValue - (-1) overflows to a negative number and the order flips. y.CompareTo(x) gives the reversed order without arithmetic.'),
    ],
  },

  /* ══ Graphs ══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_GRAPHS',
    notes: `A **graph** is nodes joined by edges. A tree is a graph with no cycles; a road map, a friend
network and a package's dependencies are graphs with them.

## Representing a graph in C#

For nodes numbered 0 to n-1, an **adjacency list** is an array of lists:

    var adj = new List<int>[n];
    for (int i = 0; i < n; i++) adj[i] = new List<int>();
    foreach (var e in edges)          // int[][] edges, each {u, v}
    {
        adj[e[0]].Add(e[1]);
        adj[e[1]].Add(e[0]);          // omit for a directed graph
    }

\`new List<int>[n]\` creates n **null** slots, not n empty lists — the loop that fills them is
required, or the first \`Add\` throws NullReferenceException. When nodes are names, not numbers,
use \`Dictionary<string, List<string>>\`. An adjacency **matrix** (\`bool[n, n]\`) costs O(n²)
memory and only pays off for dense graphs.

## Breadth-first search: shortest steps

BFS explores in rings: all nodes one edge away, then two, then three. So the first time it
reaches a node is by the **fewest edges** — shortest path in an unweighted graph:

    static int[] Bfs(List<int>[] adj, int src)
    {
        var dist = new int[adj.Length];
        for (int i = 0; i < dist.Length; i++) dist[i] = -1;    // -1 = not reached
        var queue = new Queue<int>();
        dist[src] = 0;
        queue.Enqueue(src);
        while (queue.Count > 0)
        {
            int u = queue.Dequeue();
            foreach (int v in adj[u])
            {
                if (dist[v] != -1) continue;
                dist[v] = dist[u] + 1;          // mark when enqueued, not when dequeued
                queue.Enqueue(v);
            }
        }
        return dist;
    }

The \`dist\` array doubles as the visited set. Mark a node **when you enqueue it**; marking on
dequeue lets the same node enter the queue once per neighbour.

**On a grid** the nodes are cells and the edges are the four moves. Keep two small arrays of
direction offsets and check bounds before indexing:

    int[] dr = { -1, 1, 0, 0 };
    int[] dc = { 0, 0, -1, 1 };
    for (int k = 0; k < 4; k++)
    {
        int nr = r + dr[k], nc = c + dc[k];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        ...
    }

## Depth-first search: components and cycles

DFS goes as deep as it can before backing up. Counting **connected components** — start a DFS from
every node not yet seen, and count the starts:

    static int CountComponents(List<int>[] adj)
    {
        var seen = new bool[adj.Length];
        int components = 0;
        for (int s = 0; s < adj.Length; s++)
        {
            if (seen[s]) continue;
            components++;
            var stack = new Stack<int>();
            stack.Push(s);
            seen[s] = true;
            while (stack.Count > 0)
            {
                int u = stack.Pop();
                foreach (int v in adj[u])
                    if (!seen[v]) { seen[v] = true; stack.Push(v); }
            }
        }
        return components;
    }

The iterative version with \`Stack<int>\` cannot overflow the call stack, which matters because a
graph of 10⁵ nodes in a line would. Number of islands (LeetCode 200) is the same algorithm on a
grid of '1' and '0' cells.

**Cycles.** In an undirected graph, reaching an already-seen neighbour that is **not the node you
came from** means a cycle. In a directed graph you need three states — unvisited, on the current
path, finished — and only reaching a node still on the current path is a cycle.

**Cost.** BFS and DFS both visit every node and edge once: O(V + E) time, O(V) extra space.`,
    workedExample: `**Goal: count islands in this grid (1 = land, 0 = water).**

    1 1 0 0
    0 1 0 1
    0 0 0 1
    1 0 0 0

Scan the cells in order. (0,0) is land and unseen: islands = 1, and the DFS floods (0,0), (0,1),
(1,1). (1,3) is unseen land: islands = 2, flooding (1,3) and (2,3). (3,0) is unseen land: islands
= 3. Every other land cell is already marked when the scan reaches it.

Answer: **3**. Diagonals do not connect — (1,1) and (2,2) would only touch at a corner, and here
(2,2) is water anyway. Ask the interviewer whether diagonals count before you write the offsets.`,
    mcqs: [
      mcq('var adj = new List<int>[5]; adj[0].Add(3); — what happens on the second statement?',
        [['NullReferenceException, because each slot of the array is still null', true],
          ['It works, because new List<int>[5] creates five empty lists ready to use', false],
          ['IndexOutOfRangeException, because the lists have no capacity yet', false],
          ['A compile error, because arrays of generic lists are not allowed', false]],
        'An array of a reference type starts with every element null. Each slot needs its own new List<int>() before anything is added.'),
      mcq('Why does BFS, not DFS, give the fewest moves from S to E in a grid maze with no weights?',
        [['BFS reaches every cell first by a path with the fewest moves', true],
          ['DFS cannot be written for grids, only for adjacency lists', false],
          ['BFS visits fewer cells than DFS on every possible maze', false],
          ['DFS always finds the longest path, never the shortest one', false]],
        'BFS processes cells in order of distance, so the first arrival is along a shortest route. DFS returns whichever path it happens to explore first.'),
      mcq('In an undirected graph, DFS from u finds a neighbour v that is already seen. When is that a cycle?',
        [['When v is not the parent u was reached from', true],
          ['Always — any seen neighbour proves a cycle', false],
          ['Only when v is the start of the whole search', false],
          ['Only when v has more than two neighbours', false]],
        'Every undirected edge appears in both lists, so the parent is always a seen neighbour. Any other seen neighbour means a second route, which closes a cycle.'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'Bfs(adj, 0) runs on edges 0-1, 0-2, 1-3, 2-3, 3-4 (undirected). What is dist[4]?',
        [['3', true],
          ['4', false],
          ['2', false],
          ['5', false]],
        'Rings from 0: {1, 2} at 1, {3} at 2, {4} at 3. Two routes reach 3 but both take 2 edges, so 4 is 3 edges away.'),
      ck('DSA_GRAPHS', 'CountComponents runs on 6 nodes with edges 0-1, 1-2 and 4-5. What does it return?',
        [['3', true],
          ['2', false],
          ['4', false],
          ['6', false]],
        'The components are {0, 1, 2}, {3} on its own and {4, 5}. An isolated node is a component of its own, so the answer is 3.'),
      ck('DSA_GRAPHS', 'For a graph with V nodes and E edges stored as List<int>[], what does a full BFS cost?',
        [['O(V + E) time', true],
          ['O(V²) time', false],
          ['O(E log V) time', false],
          ['O(V · E) time', false]],
        'Each node is dequeued once and each adjacency list is read once, so the work is proportional to V + E. O(V²) is what a matrix would cost.'),
    ],
  },

  /* ══ Shortest paths and topological sort ═════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_SHORTEST_PATH',
    notes: `BFS finds shortest paths when every edge costs the same. Give the edges **weights** — minutes,
rupees, kilometres — and the path with fewest edges may not be the cheapest. For non-negative
weights the answer is **Dijkstra's algorithm**.

## Dijkstra

Keep \`dist[]\`, the best cost known so far. Repeatedly take the unfinished node with the smallest
\`dist\` — a heap gives it in O(log V) — and try to improve its neighbours ("relax" the edges):

    // adj[u] holds int[] {v, w} pairs; .NET 6+ for PriorityQueue
    static long[] Dijkstra(List<int[]>[] adj, int src)
    {
        var dist = new long[adj.Length];
        for (int i = 0; i < dist.Length; i++) dist[i] = long.MaxValue;
        dist[src] = 0;
        var pq = new PriorityQueue<int, long>();
        pq.Enqueue(src, 0);
        while (pq.TryDequeue(out int u, out long d))
        {
            if (d > dist[u]) continue;            // stale entry: a better one came first
            foreach (int[] e in adj[u])
            {
                int v = e[0];
                long nd = d + e[1];
                if (nd < dist[v]) { dist[v] = nd; pq.Enqueue(v, nd); }
            }
        }
        return dist;
    }

Three details interviewers look for:

- **No decrease-key.** \`PriorityQueue\` cannot lower a queued entry's priority, so we enqueue again
  and skip the outdated entry with \`if (d > dist[u]) continue;\`.
- **\`long\` costs.** With weights up to 10⁹, a path of three edges already exceeds \`int.MaxValue\`.
- **Infinity is \`long.MaxValue\`, and it is never added to.** Only nodes that came out of the heap
  are relaxed, and those have a real distance.

**Cost:** O((V + E) log V). **Negative weights break it** — a finished node could later be
improved — and need Bellman-Ford (O(V·E)) instead.

On a runner without .NET 6 (our grader is Mono), replace the \`PriorityQueue\` with the hand-written
heap from the heaps lesson, storing (distance, node) pairs, or a \`SortedSet\` of pairs with a
custom comparer. The algorithm does not change.

## Topological sort (Kahn's algorithm)

Tasks with dependencies form a **directed** graph: an edge a → b means "a before b". A
**topological order** lists every task after all its prerequisites — and exists exactly when the
graph has **no cycle**.

Kahn's algorithm counts each node's incoming edges (its in-degree), starts with every node of
in-degree 0, and removes nodes one at a time:

    static List<int> TopoSort(List<int>[] adj)
    {
        int n = adj.Length;
        var indeg = new int[n];
        for (int u = 0; u < n; u++) foreach (int v in adj[u]) indeg[v]++;
        var queue = new Queue<int>();
        for (int u = 0; u < n; u++) if (indeg[u] == 0) queue.Enqueue(u);
        var order = new List<int>();
        while (queue.Count > 0)
        {
            int u = queue.Dequeue();
            order.Add(u);
            foreach (int v in adj[u])
                if (--indeg[v] == 0) queue.Enqueue(v);
        }
        return order.Count == n ? order : null;   // null: there is a cycle
    }

If a cycle exists, its nodes never reach in-degree 0, so \`order\` ends short. That is how course
schedule (LeetCode 207/210) and build-order problems are solved. **Cost:** O(V + E).`,
    workedExample: `**Goal: Dijkstra from A on A→B 4, A→C 1, C→B 2, B→D 1, C→D 6.**

| step | dequeued (d) | relaxations | dist A B C D |
|---|---|---|---|
| start | — | — | 0 ∞ ∞ ∞ |
| 1 | A (0) | B = 4, C = 1 | 0 4 1 ∞ |
| 2 | C (1) | B = 1 + 2 = 3 < 4, D = 7 | 0 3 1 7 |
| 3 | B (3) | D = 3 + 1 = 4 < 7 | 0 3 1 4 |
| 4 | B (4) | stale: 4 > dist[B] = 3, skipped | |
| 5 | D (4) | none | 0 3 1 4 |
| 6 | D (7) | stale, skipped | |

Answer: A 0, B 3, C 1, D 4. Steps 4 and 6 are why the stale check exists — the old entries for B
and D are still in the heap.`,
    mcqs: [
      mcq('In the C# Dijkstra, what is if (d > dist[u]) continue; for?',
        [['Skipping heap entries left behind when a cheaper cost was enqueued later', true],
          ['Stopping the whole search once the target node has finally been dequeued', false],
          ['Rejecting edges with negative weights before they are relaxed', false],
          ['Avoiding an overflow when dist[u] is still long.MaxValue', false]],
        'PriorityQueue has no decrease-key, so an improved node is enqueued again and its old entry stays. When the old one comes out, d is larger than dist[u] and it is ignored.'),
      mcq('Why is dist a long[] in Dijkstra when edge weights fit in an int?',
        [['Sums along a path can pass int.MaxValue and would wrap negative', true],
          ['PriorityQueue<int, long> requires priorities to be a 64-bit type', false],
          ['long arrays are initialised to infinity by the runtime automatically', false],
          ['int cannot be compared with < inside a foreach loop over int[]', false]],
        'Three edges of 10⁹ already total 3·10⁹, beyond int.MaxValue. An int sum would wrap to a negative cost that looks cheapest of all.'),
      mcq('TopoSort returns a list shorter than n. What does that tell you?',
        [['The graph has a cycle, so no valid order of the tasks exists', true],
          ['Some nodes have no edges, and Kahn\'s algorithm skips them', false],
          ['The queue was a Stack<int>, which loses nodes along the way', false],
          ['The graph is undirected, which Kahn\'s algorithm reports this way', false]],
        'Nodes on a cycle keep an in-degree of at least 1 forever, so they are never enqueued. Isolated nodes have in-degree 0 and are output at the start.'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'Directed edges 0→1, 0→2, 1→3, 2→3 go into TopoSort, with adjacency lists filled in that order. What does it return?',
        [['[0, 1, 2, 3]', true],
          ['[0, 2, 1, 3]', false],
          ['[3, 1, 2, 0]', false],
          ['null, as 3 has two incoming edges', false]],
        'Only 0 starts at in-degree 0. Removing it drops 1 and 2 to 0, enqueued in list order; 3 reaches 0 only after both, so the order is 0, 1, 2, 3.'),
      ck('DSA_GRAPHS', 'A route graph has an edge with weight -5. Why is plain Dijkstra unsafe on it?',
        [['A node already finalised could later get cheaper via the negative edge', true],
          ['PriorityQueue<int, long> throws when a priority below zero is enqueued', false],
          ['The stale-entry check skips every node whose cost is below zero', false],
          ['long cannot hold a negative distance between two of the nodes', false]],
        'Dijkstra assumes the cheapest dequeued node can never improve. A negative edge breaks that; Bellman-Ford handles negative weights.'),
      ck('DSA_GRAPHS', 'What is the time cost of Dijkstra with a binary heap on V nodes and E edges?',
        [['O((V + E) log V)', true],
          ['O(V + E)', false],
          ['O(V · E)', false],
          ['O(V² log E)', false]],
        'Each relaxation may push one heap entry at O(log V) cost, and each node is processed once. O(V + E) is BFS; O(V · E) is Bellman-Ford.'),
    ],
  },

  /* ══ Greedy ══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_GREEDY',
    notes: `A **greedy** algorithm makes the choice that looks best right now and never revisits it. When it
works it is short and fast — usually a sort plus one pass. The hard part is not the code; it is
knowing the choice is **safe**.

## Classic problem: activity selection / non-overlapping intervals

Given meetings as \`int[][] meetings\`, each \`{start, end}\`, pick the most that do not overlap.
The safe choice: **always take the meeting that ends first**.

    static int MaxMeetings(int[][] meetings)
    {
        Array.Sort(meetings, (a, b) => a[1].CompareTo(b[1]));   // by end time
        int count = 0;
        long lastEnd = long.MinValue;
        foreach (int[] m in meetings)
        {
            if (m[0] >= lastEnd) { count++; lastEnd = m[1]; }
        }
        return count;
    }

\`Array.Sort\` with a \`Comparison<int[]>\` lambda sorts jagged arrays in place. Use
\`a[1].CompareTo(b[1])\`, never \`a[1] - b[1]\`, which overflows for large coordinates.

**Why ending first is safe (the exchange argument).** Take any optimal schedule. Its first meeting
ends no earlier than the meeting that ends first overall. Swap it for that one: nothing later
overlaps, because the replacement ends sooner. So some optimal schedule starts with our choice —
and the same argument repeats on the rest. Sorting by **start** time or by **shortest length**
has counterexamples; try to find them.

## Merge intervals (LeetCode 56)

Sort by start; extend the current block while the next interval starts inside it:

    static List<int[]> Merge(int[][] iv)
    {
        Array.Sort(iv, (a, b) => a[0].CompareTo(b[0]));
        var result = new List<int[]>();
        foreach (int[] cur in iv)
        {
            if (result.Count > 0 && cur[0] <= result[result.Count - 1][1])
                result[result.Count - 1][1] = Math.Max(result[result.Count - 1][1], cur[1]);
            else
                result.Add(new[] { cur[0], cur[1] });
        }
        return result;
    }

\`Math.Max\` matters: \`[1, 10]\` followed by \`[2, 3]\` must stay \`[1, 10]\`. (C# 8+ also lets you
write \`result[^1]\` for the last element; the grader's older compiler does not.)

## Jump game (LeetCode 55)

Track the furthest index reachable so far; if the scan ever passes it, you are stuck:

    static bool CanJump(int[] nums)
    {
        int reach = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            if (i > reach) return false;
            reach = Math.Max(reach, i + nums[i]);
        }
        return true;
    }

## When greedy fails

Fewest coins by "take the biggest coin that fits" works for {1, 2, 5, 10} — Indian and most real
currencies are designed that way — but for {1, 3, 4} and amount 6 it picks 4 + 1 + 1 (three coins)
where 3 + 3 (two) exists. No exchange argument holds, so that problem needs dynamic programming.
**Before coding a greedy, try to break it with a small example.** If you cannot, sketch the
exchange argument; if you can, it is a DP problem.`,
    mcqs: [
      mcq('MaxMeetings sorts with (a, b) => a[1].CompareTo(b[1]). Why compare the end times and not the starts?',
        [['Finishing earliest leaves the most room for every later meeting', true],
          ['Array.Sort on an int[][] can only compare the second element', false],
          ['Sorting by start time gives the same count but runs more slowly', false],
          ['End times are unique, so the sort is stable only on them', false]],
        'The meeting that ends first leaves the longest free stretch after it. Sorting by start fails: one long meeting starting first can block several short ones.'),
      mcq('In Merge, why is the update Math.Max(last[1], cur[1]) and not simply last[1] = cur[1]?',
        [['A later-starting interval can end inside the current block, as [2,3] in [1,10]', true],
          ['Math.Max avoids an integer overflow when the two interval ends are very large', false],
          ['Assignment to an element of a List<int[]> is not allowed in C#', false],
          ['It keeps the result sorted by end time for the next comparison', false]],
        'Sorting is by start only, so an interval may end before the current block does. Plain assignment would shrink [1,10] to [1,3].'),
      mcq('How do you check whether a greedy rule is safe before coding it?',
        [['Try small counterexamples, then sketch an exchange argument for it', true],
          ['Run it on the sample input and accept it if the output matches', false],
          ['Check that it runs in O(n log n), which proves it is correct', false],
          ['Greedy rules are always safe once the input has been sorted', false]],
        'Speed and a passing sample prove nothing. A greedy is correct when any optimal answer can be changed to include the greedy choice without getting worse.'),
    ],
    checkpoint: [
      ck('DSA_GREEDY', 'MaxMeetings gets {1,4}, {3,5}, {0,6}, {5,7}, {8,9}, {5,9}. What does it return?',
        [['3', true],
          ['2', false],
          ['4', false],
          ['6', false]],
        'Sorted by end: {1,4}, {3,5}, {0,6}, {5,7}, {8,9}, {5,9}. Take {1,4}; {5,7} starts at 5 ≥ 4; {8,9} starts at 8 ≥ 7. {5,9} starts before 9. Three meetings.'),
      ck('DSA_GREEDY', 'CanJump runs on new[] { 3, 2, 1, 0, 4 }. What does it return?',
        [['false', true],
          ['true', false],
          ['It throws IndexOutOfRangeException', false],
          ['It never returns', false]],
        'reach becomes 3 at i = 0 and stays 3 through i = 3 (each i + nums[i] is 3). At i = 4, i > reach, so the end cannot be reached.'),
      ck('DSA_GREEDY', 'Coins {1, 3, 4}, amount 6. How many coins does "take the largest that fits" use, against the true minimum?',
        [['3 coins, while 2 coins is possible', true],
          ['2 coins, which is the true minimum', false],
          ['4 coins, while 3 coins is possible', false],
          ['It cannot make 6 from these coins', false]],
        'Greedy takes 4, then 1 and 1 — three coins. 3 + 3 uses two. This coin system has no safe greedy choice, so fewest coins needs DP.'),
    ],
  },

  /* ══ Dynamic programming ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_DYNAMIC_PROGRAMMING',
    notes: `**Dynamic programming** is recursion that remembers. It applies when a problem breaks into
smaller subproblems that **overlap** — the same smaller question is asked many times — and the best
answer is built from best answers to the parts.

Every DP needs three things written down before code: **the state** (what one subproblem is),
**the transition** (how a state is computed from smaller ones), and **the base cases**.

## Climbing stairs: top-down (memoisation)

Ways to climb n steps taking 1 or 2 at a time: ways(n) = ways(n - 1) + ways(n - 2).

    static long[] memo;

    static long Ways(int n)
    {
        if (n <= 1) return 1;
        if (memo[n] != 0) return memo[n];
        return memo[n] = Ways(n - 1) + Ways(n - 2);
    }
    // memo = new long[n + 1]; before the first call

Without the memo this is O(2ⁿ) — Ways(40) makes over 300 million calls. With it, each n is
computed once: O(n). \`long\` because the counts grow like Fibonacci and pass \`int.MaxValue\` at
n = 46. (A \`Dictionary<int, long>\` works as a memo too, when the states are sparse.)

## Bottom-up (tabulation)

Fill a table from the base cases upward — no recursion, no stack-depth risk:

    static long WaysBottomUp(int n)
    {
        var dp = new long[n + 1];
        dp[0] = 1;
        if (n >= 1) dp[1] = 1;
        for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
        return dp[n];
    }

Each entry only needs the previous two, so two variables replace the array: O(1) space.

## Coin change (LeetCode 322)

The fewest coins making \`amount\`, or -1. State: \`dp[a]\` = fewest coins for amount a.
Transition: try every coin as the last one.

    static int CoinChange(int[] coins, int amount)
    {
        var dp = new int[amount + 1];
        for (int a = 1; a <= amount; a++)
        {
            dp[a] = int.MaxValue;
            foreach (int c in coins)
                if (c <= a && dp[a - c] != int.MaxValue)
                    dp[a] = Math.Min(dp[a], dp[a - c] + 1);
        }
        return dp[amount] == int.MaxValue ? -1 : dp[amount];
    }

The check \`dp[a - c] != int.MaxValue\` matters: \`int.MaxValue + 1\` wraps to \`int.MinValue\`
(C# arithmetic is **unchecked** by default) and that "impossible" amount would win every
\`Math.Min\`. **Cost:** O(amount × coins) time, O(amount) space.

## A 2D DP: longest common subsequence (LeetCode 1143)

\`dp[i, j]\` = LCS length of the first i characters of s and the first j of t. C# has true
rectangular arrays, \`int[,]\`, which fit a 2D table well:

    static int Lcs(string s, string t)
    {
        int m = s.Length, n = t.Length;
        var dp = new int[m + 1, n + 1];          // row 0 and column 0 stay 0
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i, j] = s[i - 1] == t[j - 1]
                    ? dp[i - 1, j - 1] + 1
                    : Math.Max(dp[i - 1, j], dp[i, j - 1]);
        return dp[m, n];
    }

The extra row and column (size m + 1 by n + 1) hold the empty-prefix base case, so the loop never
indexes -1. \`dp.GetLength(0)\` is m + 1 and \`dp.GetLength(1)\` is n + 1 — \`dp.Length\` is the
total cell count. **Cost:** O(m·n) time; space can drop to O(n) by keeping two rows.`,
    workedExample: `**Goal: CoinChange(new[] { 1, 3, 4 }, 6).**

| a | candidates (last coin 1 / 3 / 4) | dp[a] |
|---|---|---|
| 0 | base case | 0 |
| 1 | dp[0]+1 | 1 |
| 2 | dp[1]+1 | 2 |
| 3 | dp[2]+1, dp[0]+1 | 1 |
| 4 | dp[3]+1, dp[1]+1, dp[0]+1 | 1 |
| 5 | dp[4]+1, dp[2]+1, dp[1]+1 | 2 |
| 6 | dp[5]+1 = 3, dp[3]+1 = 2, dp[2]+1 = 3 | 2 |

Answer: **2** (3 + 3) — the case greedy got wrong. The table also answers every smaller amount for
free, which is what "reusing subproblems" means in practice.`,
    mcqs: [
      mcq('Ways(n) recursing on Ways(n - 1) + Ways(n - 2) without a memo is O(2ⁿ). What does the long[] memo change it to?',
        [['O(n), since each n is computed once and then read back', true],
          ['O(n²), since each call still scans the whole memo array', false],
          ['O(log n), since the memo halves the remaining work each time', false],
          ['O(2ⁿ) still, since the memo only saves memory, not time', false]],
        'With the memo, a value is computed the first time it is asked for and returned at once afterwards, so there are about n real computations.'),
      mcq('CoinChange skips a coin when dp[a - c] == int.MaxValue. What goes wrong without that check?',
        [['int.MaxValue + 1 wraps to int.MinValue, which then wins Math.Min', true],
          ['C# throws an OverflowException, crashing on the first unreachable amount', false],
          ['Nothing — Math.Min ignores int.MaxValue as a candidate', false],
          ['The loop runs forever on that amount, since dp[a] never settles', false]],
        'C# integer arithmetic is unchecked by default, so the overflow is silent. A huge negative "count" would beat every real answer.'),
      mcq('var dp = new int[4, 7]; — what do dp.GetLength(1) and dp.Length return?',
        [['7 and 28', true],
          ['4 and 28', false],
          ['7 and 4', false],
          ['4 and 7', false]],
        'GetLength(1) is the size of the second dimension, 7. Length on a rectangular array is the total number of cells, 4 × 7 = 28.'),
    ],
    checkpoint: [
      ck('DSA_DP', 'Lcs("ABCBDAB", "BDCABA") fills the int[,] table. What does it return?',
        [['4', true],
          ['3', false],
          ['5', false],
          ['6', false]],
        'One longest common subsequence is "BCBA" (others are "BDAB" and "BCAB"), all of length 4. No common subsequence of length 5 exists.'),
      ck('DSA_DP', 'WaysBottomUp(6) fills dp with dp[0] = 1, dp[1] = 1 and dp[i] = dp[i-1] + dp[i-2]. What does it return?',
        [['13', true],
          ['8', false],
          ['21', false],
          ['12', false]],
        'The table runs 1, 1, 2, 3, 5, 8, 13 for i = 0 to 6. There are 13 ways to climb 6 steps taking 1 or 2 at a time.'),
      ck('DSA_DP', 'Which two properties must a problem have for dynamic programming to help?',
        [['Overlapping subproblems and an optimal substructure', true],
          ['A sorted input and a greedy choice at every step', false],
          ['A tree-shaped input and a recursive definition', false],
          ['Unique answers and an input under 10⁵ elements', false]],
        'The same subproblems must recur (so remembering pays) and the best answer must be built from best answers to the parts.'),
    ],
  },

  /* ══ Debugging ══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_DEBUGGING',
    notes: `Tree, graph and DP bugs rarely fail on the example in the problem statement. They pass the
sample and fail the hidden test — a node with one child, a deep chain, a cell reached twice, an
index one past the end. Each case below compiles and looks reasonable. Find the line at fault and
say why the sample did not catch it.

## 1. Recursion that assumes both children exist

    static int SumLeaves(TreeNode n)
    {
        if (n.Left == null && n.Right == null) return n.Val;
        return SumLeaves(n.Left) + SumLeaves(n.Right);
    }

**Symptom:** NullReferenceException on some trees. **Cause:** a node with exactly one child calls
itself on the missing one. The sample tree was full. **Fix:** start with
\`if (n == null) return 0;\`.

## 2. An array of lists that was never filled

    var adj = new List<int>[n];
    foreach (var e in edges) { adj[e[0]].Add(e[1]); adj[e[1]].Add(e[0]); }

**Symptom:** NullReferenceException on the first edge. **Cause:** \`new List<int>[n]\` makes n null
references. **Fix:** \`for (int i = 0; i < n; i++) adj[i] = new List<int>();\` first.

## 3. BFS that marks visited on dequeue

    while (q.Count > 0)
    {
        int u = q.Dequeue();
        if (seen[u]) continue;
        seen[u] = true;
        foreach (int v in adj[u]) if (!seen[v]) q.Enqueue(v);
    }

**Symptom:** correct answers, but time limit exceeded on a dense graph or a big open grid.
**Cause:** a node is enqueued once per neighbour that sees it before it is dequeued — O(E) queue
entries. **Fix:** mark \`seen[v] = true\` at the moment of \`Enqueue(v)\`.

## 4. Grid bounds checked after indexing

    if (grid[nr][nc] != '#' && nr >= 0 && nr < rows && nc >= 0 && nc < cols) ...

**Symptom:** IndexOutOfRangeException when S sits on an edge of the grid. **Cause:** \`&&\`
evaluates left to right, so \`grid[nr][nc]\` is read before the bounds are checked. **Fix:** put the
bounds checks first; \`&&\` short-circuits.

## 5. A max-heap comparer that overflows

    var pq = new PriorityQueue<int, int>(Comparer<int>.Create((x, y) => y - x));

**Symptom:** wrong order only when priorities are large or of opposite signs. **Cause:** \`y - x\`
overflows int. **Fix:** \`y.CompareTo(x)\`.

## 6. Dijkstra with int distances

    var dist = new int[n];
    for (int i = 0; i < n; i++) dist[i] = int.MaxValue;
    ...
    int nd = dist[u] + w;

**Symptom:** a far node reported with a negative cost. **Cause:** a long path wraps past
\`int.MaxValue\` — unchecked arithmetic gives no error. **Fix:** \`long[] dist\` and \`long.MaxValue\`.

## 7. DP table one too small

    var dp = new int[amount];
    ...
    return dp[amount];

**Symptom:** IndexOutOfRangeException. **Cause:** the answer lives at index \`amount\`. **Fix:**
\`new int[amount + 1]\`.

## 8. Recursion too deep for the stack

A recursive DFS on a path of 200,000 nodes. **Symptom:** the process exits with "Stack overflow" —
no catch block runs, no finally block runs. **Cause:** one frame per node. **Fix:** an explicit
\`Stack<int>\`.

## How to find these

Write the inputs the sample does not cover: a single node, a node with one child, an empty or
one-cell grid, S on the border, a cycle, a node reachable two ways, amount 0, an amount that cannot
be made, a 10⁵-long chain. Most of these bugs show themselves on the first such case.`,
    mcqs: [
      mcq('A grid BFS tests grid[nr][nc] != \'#\' before checking nr and nc are in range. When does it crash?',
        [['When a neighbour of the current cell lies outside the grid, such as near an edge', true],
          ['Only when the grid contains no walls at all, so every cell is open', false],
          ['Never — C# evaluates every bounds check in an if before the indexing', false],
          ['Only on a grid that has more columns than rows, where the row lengths then differ', false]],
        '&& evaluates left to right and stops at the first false. Reading grid[-1] before the bounds checks throws IndexOutOfRangeException.'),
      mcq('static int CountNodes(TreeNode n) { return 1 + CountNodes(n.Left) + CountNodes(n.Right); } — what happens on any tree?',
        [['NullReferenceException once a leaf\'s missing child is reached', true],
          ['It returns the height of the tree instead of the node count', false],
          ['It counts each node twice, once from each recursive call', false],
          ['It returns 0, as the recursion never reaches a node to count', false]],
        'There is no base case, so the recursion is called on a leaf\'s null child and reads n.Left on null. Add if (n == null) return 0;'),
      mcq('A recursive C# DFS crashes on a 200,000-node path graph. Wrapping the call in try/catch (Exception) does what?',
        [['Nothing — a stack overflow ends the process before any catch block can run', true],
          ['It catches the StackOverflowException and lets the program carry on', false],
          ['It converts the overflow into an OutOfMemoryException that is caught', false],
          ['It makes the runtime grow the stack, so the DFS finishes normally', false]],
        'Since .NET 2.0 a StackOverflowException cannot be caught; the runtime terminates the process. The fix is iteration with an explicit Stack<int>.'),
      mcq('A Dijkstra keeps int[] dist and finds a node 3 hops of 1,000,000,000 away reported as -1294967296. Why?',
        [['3,000,000,000 overflowed int and wrapped silently to a negative value', true],
          ['PriorityQueue reversed the order because the priorities were too large', false],
          ['The stale-entry check skipped the true cost and kept an old, wrong one', false],
          ['int.MaxValue was used as infinity and a lower cost was never found', false]],
        'C# integer arithmetic is unchecked by default, so 3·10⁹ wraps to 3·10⁹ - 2³² = -1,294,967,296. Store distances as long.'),
    ],
  },

  /* ══ Practice ═══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_PRACTICE',
    notes: `No new ideas — repetition until the patterns come without thinking. Write each one in a plain
editor, without autocomplete, then run it on the edge cases listed.

## Exercises

1. **Maximum depth of a binary tree.** Recursive first, then iterative with \`Queue<TreeNode>\` level
   order. Test an empty tree (0) and a 100,000-node left-only chain — which version survives?
2. **Is this a valid BST?** Range check with \`long\` bounds, then rewrite it with \`int?\` bounds
   where \`null\` means "no limit". Test a tree holding \`int.MaxValue\`.
3. **Kth smallest in a stream.** A class with \`int Add(int x)\` returning the kth smallest seen so
   far, using your hand-written heap. Which heap — min or max — and why? (In .NET 6+, redo it with
   \`PriorityQueue<int, int>\` and a reversed comparer.)
4. **Rotting oranges (LeetCode 994).** Multi-source BFS: start the queue with every rotten orange.
   Return the minutes until none are fresh, or -1. Test a grid with no fresh oranges (0).
5. **Minimum meeting rooms (LeetCode 253).** Sort the meetings by start and keep a min-heap of end
   times; the heap's largest size is the answer.
6. **Shortest steps in a grid.** The graded exercise below.

## The graded exercise

It reads a grid with a start, an end and walls, and prints the fewest moves from start to end, or
-1. This is BFS on a grid: mark each cell when it is enqueued, check bounds before indexing, and
store distances in an array of size rows × cols (or a 2D array). Grids reach 1,000 × 1,000 — a
million cells — so no recursion, and no per-cell objects you do not need.

**The grader runs C# 7 on Mono: use a classic \`static void Main()\` in a class, no top-level
statements, no \`PriorityQueue\`, no records.** \`Queue<int>\`, \`List<T>\` and LINQ are all available.`,
    mcqs: [
      mcq('For rotting oranges, why does every rotten orange go into the queue before the BFS loop starts?',
        [['They all spread at minute 0, so each one is a source', true],
          ['Queue<T>.Dequeue throws unless several items are queued', false],
          ['It lets the BFS skip over all of the fresh oranges', false],
          ['It turns the BFS into a DFS, which is faster on grids', false]],
        'Rot spreads from every rotten orange at the same time. A multi-source BFS gives each fresh orange its distance to the nearest rotten one.'),
      mcq('To return the kth smallest value of a stream after each Add, which heap do you keep, and of what size?',
        [['A max-heap of size k, whose root is then the kth smallest', true],
          ['A min-heap of size k, whose root is the kth smallest', false],
          ['A min-heap of every value, popped k times per query', false],
          ['A max-heap of every value, peeked once per query', false]],
        'Keeping the k smallest means evicting the largest of them, which a max-heap does in O(log k). Its root is then the kth smallest.'),
      mcq('In the grid exercise, a 1,000 × 1,000 grid is all open. Why would a recursive DFS be the wrong tool here?',
        [['It can recurse a million frames deep and kill the process', true],
          ['DFS cannot move in four directions on a grid of chars', false],
          ['A recursive DFS on a grid can only reach the first row', false],
          ['C# methods cannot recurse while a Queue<int> is in scope', false]],
        'DFS can follow a path through every cell before backing up, one frame per cell. That overflows the stack, and DFS does not find shortest paths anyway.'),
      mcq('In the grid exercise, the cell (r, c) is stored in dist[] as one int. Which index fits a grid with cols columns?',
        [['r * cols + c', true],
          ['c * cols + r', false],
          ['r * c + cols', false],
          ['r + c * r', false]],
        'Row-major order puts each row of cols cells after the previous one, so (r, c) is at r * cols + c, and back again with r = i / cols, c = i % cols.'),
      mcq('For meeting rooms, why is a min-heap of end times the right structure?',
        [['Its root is the room that frees up soonest, the only one a new meeting can reuse', true],
          ['It keeps all the meetings sorted by start time, which the input does not give us', false],
          ['A min-heap is the only collection in .NET that accepts duplicate integers', false],
          ['It lets every meeting be compared with every other in O(n) total time', false]],
        'A new meeting can take a room only if some meeting has ended; checking the earliest end is enough. If even that has not ended, a new room is needed.'),
    ],
    assignment: {
      title: 'Shortest Steps in a Grid',
      description: 'Read a grid maze with walls and print the fewest moves from S to E, using breadth-first search in C#.',
      instructions: `A warehouse robot moves on a grid. Each move goes one cell up, down, left or right (never
diagonally) and never into a wall or off the grid. Print the fewest moves from \`S\` to \`E\`.

**Input** (standard input)

- The first line holds two integers: \`rows cols\` (1 ≤ rows, cols ≤ 1000).
- Each of the next \`rows\` lines holds exactly \`cols\` characters: \`.\` an open cell, \`#\` a wall,
  \`S\` the start, \`E\` the end. There is exactly one \`S\` and exactly one \`E\`.

**Output**

One line: the fewest moves from S to E, or \`-1\` if E cannot be reached.

**Example**

Input:

    5 5
    S..#.
    .#...
    .#.#.
    ...#E
    ##...

Output:

    7

The route right along the top and down the right edge takes 7 moves; the route round the bottom
takes 9.

**Rules**

- Use breadth-first search with a \`Queue<int>\` (or \`Queue<int[]>\`). Mark a cell visited when you
  enqueue it.
- Check that a neighbour is inside the grid **before** you read \`grid[r][c]\`.
- No recursion: a grid can hold a million cells.
- **The grader runs C# 7 on Mono:** write a classic \`class Program { static void Main() { ... } }\`;
  no top-level statements, no \`PriorityQueue\`, no records. Read input with \`Console.ReadLine()\`.

**How it is graded**

Your program is run against every test — the example and several you cannot see, including an
unreachable end, a one-row grid and grids of up to 90,000 cells where only one long route exists.
Output is compared line by line; spaces at the ends do not matter. A reviewer grading by hand uses
the rubric.`,
      rubric: [
        { criterion: 'Correct answers', description: 'The right number of moves on every test, including -1 for an unreachable end, S next to E, and large grids.', maxPoints: 60 },
        { criterion: 'BFS done properly', description: 'A queue-driven BFS that marks cells when they are enqueued, checks bounds before indexing, and visits each cell at most once.', maxPoints: 30 },
        { criterion: 'Readable C#', description: 'Clear names for the grid, distances and direction offsets; no recursion; no needless per-cell objects or copying.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string[] first = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        int rows = int.Parse(first[0]);
        int cols = int.Parse(first[1]);
        string[] grid = new string[rows];
        for (int r = 0; r < rows; r++) grid[r] = Console.ReadLine().Trim();

        // TODO: find the S and E cells
        // TODO: BFS from S with a Queue, marking each cell when it is enqueued
        // TODO: print the fewest moves to E, or -1 if E is never reached
    }
}
`,
        tests: [
          { input: '5 5\nS..#.\n.#...\n.#.#.\n...#E\n##...\n', expectedOutput: '7' },
          { input: '3 3\nS#.\n##.\n..E\n', expectedOutput: '-1' },
          { input: '1 2\nSE\n', expectedOutput: '1' },
          { input: '4 6\nS.#...\n#.#.#.\n#...#E\n######\n', expectedOutput: '11', isHidden: true },
          { input: openGrid(300), expectedOutput: '598', isHidden: true },
          { input: snakeGrid(100, 200), expectedOutput: '20100', isHidden: true },
          { input: '1 7\nE.....S\n', expectedOutput: '6', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ══ Interview question ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_INTERVIEW_QUESTION',
    notes: `Three problems that come up again and again in .NET interviews. For each: how to talk it
through, a model answer in C#, its cost, and the follow-up you will get if you answer well. Say the
approach and its complexity **before** writing code — an interviewer would rather correct a plan
than a half-written method.

## 1. Lowest common ancestor of a binary tree (LeetCode 236)

**Talking it through.** "The LCA of p and q is the deepest node with p on one side and q on the
other — or p itself, if q is below p. I'll recurse: each call returns p or q if it finds one in its
subtree, otherwise null. A node that gets non-null from both sides is the answer."

    static TreeNode Lca(TreeNode root, TreeNode p, TreeNode q)
    {
        if (root == null || root == p || root == q) return root;
        TreeNode left = Lca(root.Left, p, q);
        TreeNode right = Lca(root.Right, p, q);
        if (left != null && right != null) return root;   // they split here
        return left ?? right;
    }

\`left ?? right\` is C#'s null-coalescing operator: \`left\` if it is not null, otherwise \`right\`.
**Cost:** O(n) time, O(h) stack.
**Follow-up:** "What if it's a BST?" — compare values: both smaller, go left; both larger, go
right; otherwise this node is the split. O(h), and O(1) space iteratively.

## 2. Top k frequent elements (LeetCode 347)

**Talking it through.** "Count with a Dictionary, then keep a min-heap of size k keyed by count, so
the least frequent is evicted. Or, since counts are between 1 and n, bucket them for O(n)."

    static int[] TopKFrequent(int[] nums, int k)
    {
        var count = new Dictionary<int, int>();
        foreach (int x in nums)
        {
            int c;
            count.TryGetValue(x, out c);
            count[x] = c + 1;
        }
        var buckets = new List<int>[nums.Length + 1];
        foreach (var pair in count)
        {
            if (buckets[pair.Value] == null) buckets[pair.Value] = new List<int>();
            buckets[pair.Value].Add(pair.Key);
        }
        var result = new List<int>();
        for (int f = nums.Length; f >= 1 && result.Count < k; f--)
            if (buckets[f] != null) result.AddRange(buckets[f]);
        return result.Take(k).ToArray();          // using System.Linq
    }

**Cost:** O(n) time and space. The heap version is O(n log k) — with .NET 6+,
\`PriorityQueue<int, int>\` where the priority is the count. A one-line LINQ answer
(\`GroupBy\`, \`OrderByDescending\`, \`Take\`) is O(n log n); say so if you write it.
**Follow-up:** "The stream never ends" — keep counts in the Dictionary and the heap of size k
updated as values arrive.

## 3. Course schedule — can every course be finished? (LeetCode 207)

**Talking it through.** "Courses are nodes; a prerequisite b of a is an edge b → a. All courses can
be finished exactly when the graph has no cycle. I'll use Kahn's algorithm: repeatedly take courses
with no remaining prerequisites; if I take all n, there is no cycle."

    static bool CanFinish(int n, int[][] prereq)
    {
        var adj = new List<int>[n];
        for (int i = 0; i < n; i++) adj[i] = new List<int>();
        var indeg = new int[n];
        foreach (int[] p in prereq) { adj[p[1]].Add(p[0]); indeg[p[0]]++; }
        var queue = new Queue<int>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) queue.Enqueue(i);
        int taken = 0;
        while (queue.Count > 0)
        {
            int u = queue.Dequeue();
            taken++;
            foreach (int v in adj[u]) if (--indeg[v] == 0) queue.Enqueue(v);
        }
        return taken == n;
    }

**Cost:** O(V + E).
**Follow-up:** "Do it with DFS." — three colours: 0 unvisited, 1 on the current path, 2 done.
Reaching a 1 is a back edge: a cycle. "Why not one bool?" — a node reached twice by two different
paths (a diamond) is not a cycle; only a node still on the current path is.`,
    mcqs: [
      mcq('In Lca, both recursive calls return non-null. What does that tell you?',
        [['p and q lie in different subtrees, so root is their LCA', true],
          ['p and q are the same node, found once by each recursive call', false],
          ['The tree contains a cycle that both calls have followed', false],
          ['root is p, so the search could have stopped one level up', false]],
        'Each side returns the target it found. One target on each side means root is the deepest node that joins them.'),
      mcq('What does the expression left ?? right evaluate to in C#?',
        [['left if it is not null, otherwise right', true],
          ['right if left is null, otherwise null', false],
          ['true if either left or right is not null', false],
          ['A compile error unless both are the same object', false]],
        '?? is the null-coalescing operator. It returns its left operand when that is non-null and evaluates the right operand only otherwise.'),
      mcq('CanFinish(2, new[] { new[] { 0, 1 }, new[] { 1, 0 } }) runs Kahn\'s algorithm. What does it return?',
        [['false, because neither course ever reaches in-degree 0', true],
          ['true, because each course has exactly one prerequisite', false],
          ['true, because a two-node graph cannot contain a cycle', false],
          ['It throws, because the prerequisites refer to each other', false]],
        'Course 0 needs 1 and 1 needs 0. Both start with in-degree 1, the queue starts empty, taken stays 0, and 0 != 2.'),
    ],
  },

  /* ══ Checkpoint ═════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_DSA_NONLINEAR_CHECKPOINT',
    notes: `Ten questions across trees, heaps, graphs, greedy and dynamic programming. Most show a short
piece of C# and ask what it does or what it returns; trace it by hand before you choose. Costs are
worst case unless a question says otherwise.`,
    checkpoint: [
      ck('DSA_TREES', 'static bool Same(TreeNode a, TreeNode b) { if (a == null || b == null) return a == b; return a.Val == b.Val && Same(a.Left, b.Left) && Same(a.Right, b.Right); } — what does it decide?',
        [['Whether the two trees have the same shape and the same values', true],
          ['Whether a and b refer to one and the same TreeNode object', false],
          ['Whether the trees hold the same set of values in any shape', false],
          ['Whether tree b appears as a subtree somewhere inside tree a', false]],
        'It compares the two roots and then the left and right subtrees pairwise, and two nulls are equal. That is structural equality — LeetCode 100.'),
      ck('DSA_TREES', 'You Insert 8, 3, 10, 1, 6 into an empty BST and run the iterative Inorder. What list comes back?',
        [['[1, 3, 6, 8, 10]', true],
          ['[8, 3, 1, 6, 10]', false],
          ['[8, 3, 10, 1, 6]', false],
          ['[1, 6, 3, 10, 8]', false]],
        'Inorder visits a BST in ascending order, whatever order the values were inserted in. The others are preorder, level order and postorder.'),
      ck('DSA_HEAPS', 'A MinHeap receives Push(6), Push(2), Push(9), Pop(), Push(4). What does Peek() return?',
        [['4', true],
          ['2', false],
          ['6', false],
          ['9', false]],
        'Pop removes the minimum, 2, leaving 6 and 9. Pushing 4 makes it the new minimum, so Peek returns 4.'),
      ck('DSA_HEAPS', 'Merging k sorted arrays holding N values in total, with a heap of the current heads, costs what?',
        [['O(N log k)', true],
          ['O(N log N)', false],
          ['O(N · k)', false],
          ['O(k log N)', false]],
        'Each of the N values is popped once and its successor pushed once, on a heap that never holds more than k entries — O(log k) per step.'),
      ck('DSA_GRAPHS', 'A grid BFS from S stores dist for every cell. The E cell ends with dist 9. What does 9 mean?',
        [['The fewest single-cell moves from S to E', true],
          ['The number of open cells in the grid', false],
          ['The length of the route DFS would find', false],
          ['The number of walls between S and E', false]],
        'BFS labels cells in rings of equal distance from S, so the label on E is the minimum number of moves to reach it.'),
      ck('DSA_GRAPHS', 'CanFinish(3, prerequisites { {1,0}, {2,1} }) — course 1 needs 0, course 2 needs 1. What does it return?',
        [['true', true],
          ['false', false],
          ['It throws IndexOutOfRangeException', false],
          ['It never returns', false]],
        'The edges are 0 → 1 → 2, a chain with no cycle. Kahn takes 0, then 1, then 2; taken reaches 3 = n.'),
      ck('DSA_GRAPHS', 'Dijkstra from A on A→B 2, A→C 5, B→C 1, C→D 2. What is the final dist of D?',
        [['5', true],
          ['7', false],
          ['4', false],
          ['3', false]],
        'B is 2, then C improves from 5 to 2 + 1 = 3, and D is 3 + 2 = 5. The direct A→C route would give 7.'),
      ck('DSA_GREEDY', 'Merge receives { {1,4}, {4,5}, {6,8}, {7,7} }. What does it return?',
        [['[1,5], [6,8]', true],
          ['[1,4], [4,5], [6,8]', false],
          ['[1,8]', false],
          ['[1,5], [6,8], [7,7]', false]],
        'Touching counts as overlapping because the test is cur[0] <= last end: [1,4] and [4,5] merge to [1,5]. [7,7] lies inside [6,8], and Math.Max keeps 8.'),
      ck('DSA_GREEDY', 'Why does MaxMeetings start lastEnd at long.MinValue rather than 0?',
        [['So the first meeting is taken even if its start time is negative', true],
          ['Because Array.Sort only works when a long variable is in scope', false],
          ['Because 0 would make every meeting overlap with the first one', false],
          ['So that the count starts at one rather than at zero by default', false]],
        'The first meeting must always be accepted. With 0, a meeting starting at -5 (a time before some reference point) would be wrongly rejected.'),
      ck('DSA_DP', 'CoinChange(new[] { 2 }, 3) runs the tabulated DP. What does it return?',
        [['-1', true],
          ['1', false],
          ['2', false],
          ['0', false]],
        'Only even amounts can be made from 2s. dp[1] stays int.MaxValue, so dp[3] = dp[1] + 1 is skipped and dp[3] stays int.MaxValue, reported as -1.'),
    ],
  },
];
