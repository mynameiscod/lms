/**
 * Career-track content: DSA in Python, non-linear structures, first half (JT_PY_DSA_NONLINEAR) —
 * binary trees, binary search trees, heaps with heapq, and graphs with BFS and DFS. Shortest paths,
 * topological sort, greedy, dynamic programming and the ending units live in a sibling file.
 *
 * Every lesson solves one named classic problem in complete Python, because that is what an
 * interview asks for: the code, its cost, and the edge case that breaks it. Where Python differs
 * from Java it says so plainly: there is no TreeMap, heapq is a min-heap over a plain list, and
 * recursion stops at about 1000 frames with a RecursionError. Everything is Python 3.10, because
 * that is what the grader runs; every quoted output was run and checked.
 *
 * Attribution: the topic is multi-skill (DSA_TREES, DSA_HEAPS, DSA_GRAPHS, DSA_GREEDY, DSA_DP), so
 * every checkpoint question names the one skill it measures — here, each lesson's own skill.
 * Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_PY_DSA_NONLINEAR_A_BUNDLES: PilotBundle[] = [
  /* ══ Binary trees and traversals ════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_TREES',
    notes: `A **binary tree** is a set of nodes where each node has at most two children, \`left\` and
\`right\`. Python has no tree type in the standard library, so you write the node class yourself —
and an interview (or LeetCode) hands you exactly this one:

    class TreeNode:
        def __init__(self, val, left=None, right=None):
            self.val = val
            self.left = left
            self.right = right

    #        1
    #       / \\
    #      2   3
    #     / \\
    #    4   5
    root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3))

A missing child is \`None\`. A tree is a recursive shape — a node, a left subtree and a right
subtree, either of which may be \`None\` — so most tree code is recursive, and every recursive tree
function starts with the same question: **what do I return for None?**

## Depth-first traversals

The three orders differ only in *where* the node's own work happens:

    def preorder(node, out):        # node, left, right
        if node is None:
            return
        out.append(node.val)
        preorder(node.left, out)
        preorder(node.right, out)

    # inorder:   left, node, right   -> [4, 2, 5, 1, 3] for the tree above
    # preorder:  node, left, right   -> [1, 2, 4, 5, 3]
    # postorder: left, right, node   -> [4, 5, 2, 3, 1]

Inorder of a binary *search* tree comes out sorted (next lesson). Postorder finishes both children
before the node, which is what sizes, heights and "delete this subtree" need. Preorder records a
node before its children, which is how you copy or serialise a tree.

Passing one \`out\` list down is O(n) overall. The tempting one-liner
\`return inorder(n.left) + [n.val] + inorder(n.right)\` copies lists at every level and costs
O(n²) on a long chain.

## Height

    def height(node):
        if node is None:
            return 0
        return 1 + max(height(node.left), height(node.right))

This is postorder: you need both children's answers before you can compute your own. Some
problems count height in **edges** instead of nodes; then the base case is \`return -1\` and a
single node has height 0. Ask which one is wanted.

## Classic problem: level-order traversal (LeetCode 102)

Return the values level by level: \`[[1], [2, 3], [4, 5]]\`. Depth-first recursion visits nodes in
the wrong order for this; you want **breadth first**, which means a FIFO queue — and in Python a
queue is \`collections.deque\`, never a list:

    from collections import deque

    def level_order(root):
        if root is None:
            return []
        result = []
        queue = deque([root])
        while queue:
            level = []
            for _ in range(len(queue)):        # len is read ONCE, before the loop runs
                node = queue.popleft()
                level.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            result.append(level)
        return result

\`range(len(queue))\` is evaluated a single time when the \`for\` starts, so the children appended
during the loop wait for the next pass. That is what separates one level from the next.

**Why deque.** \`deque.popleft()\` is O(1). \`list.pop(0)\` shifts every remaining element left, so it
is O(n), and a BFS written with it is O(n²) on a wide tree. Java's \`ArrayDeque\` and Python's
\`deque\` play the same role.

**Cost.** Every node is appended and popped once: O(n) time. The queue holds at most one level,
which for a complete tree is about n/2 nodes — O(w) space, w the widest level.

## Recursion depth: where Python differs from Java

Python has no tail-call optimisation and a **recursion limit of about 1000 frames**
(\`sys.getrecursionlimit()\` returns 1000 by default). Recursive traversals use O(h) stack, h the
height: about log n for a balanced tree, but n for a tree that is really a chain. A 5,000-node
left-only chain makes \`height\` raise **RecursionError** — not Java's StackOverflowError, and long
before Java would fail.

Two fixes:

- \`sys.setrecursionlimit(10_000)\` raises the limit. It is fine for a known, modest depth, but set
  it very high and a deep enough recursion can crash the interpreter outright, because the real C
  stack runs out.
- Go **iterative** with an explicit stack (a list) or queue. The state then lives on the heap and
  depth is unlimited:

        def preorder_iter(root):
            out, stack = [], [root] if root else []
            while stack:
                node = stack.pop()
                out.append(node.val)
                if node.right:
                    stack.append(node.right)   # pushed first, so popped second
                if node.left:
                    stack.append(node.left)
            return out

## Edge cases

- \`root is None\` → \`level_order\` returns \`[]\`, not \`[[]]\`.
- Test children with \`if node.left:\` or \`is not None\`; both work because a TreeNode object is
  always truthy.
- Deep, unbalanced input (a sorted list turned into a tree, a 10⁵-node chain) → use the iterative
  version, or the limit, deliberately.`,
    workedExample: `**Goal: the right-side view — the last value on each level (LeetCode 199).**

Tree: 7 at the root with children 4 and 9; 4 has children 1 and 5; 5 has a left child 6.

    #        7
    #       / \\
    #      4   9
    #     / \\
    #    1   5
    #       /
    #      6

Run level order and keep only the last node popped on each level:

    def right_view(root):
        view = []
        queue = deque([root] if root else [])
        while queue:
            size = len(queue)
            for i in range(size):
                node = queue.popleft()
                if i == size - 1:
                    view.append(node.val)
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        return view

Level 1 is [7] → 7. Level 2 is [4, 9] → 9. Level 3 is [1, 5] → 5. Level 4 is [6] → 6.
Answer: \`[7, 9, 5, 6]\`. Notice 6 is a *left* child but still visible from the right, because
nothing else is on its level — which is exactly why "always follow the right child" is wrong.

Cost: O(n) time, O(w) space. The \`size\` captured before the inner loop is what makes "the last
node on this level" a meaningful question.`,
    mcqs: [
      mcq('root = TreeNode(1, TreeNode(2, TreeNode(4), TreeNode(5)), TreeNode(3)). A recursive left-node-right walk appends each val to a list. What is printed?',
        [['[4, 2, 5, 1, 3]', true],
          ['[1, 2, 4, 5, 3]', false],
          ['[4, 5, 2, 3, 1]', false],
          ['[1, 2, 3, 4, 5]', false]],
        'Left, node, right: go all the way left to 4, then its parent 2, then 2\'s right child 5, then the root 1, then 3. [1, 2, 4, 5, 3] is preorder and [4, 5, 2, 3, 1] is postorder.'),
      mcq('A Python level-order loop is written for _ in range(len(queue)): and appends children inside it. Why does each pass still stop at the end of one level?',
        [['range(len(queue)) is computed once, before any child is appended', true],
          ['deque.append blocks until the current for loop has completely finished', false],
          ['popleft() skips any node that was appended during the same for loop', false],
          ['len(queue) is re-read each pass, but appends go to a second hidden deque', false]],
        'The for statement evaluates range(len(queue)) a single time and iterates over that fixed range. Children appended meanwhile sit in the deque for the next pass of the while loop.'),
      mcq('height(node) is recursive (None returns 0). It is called on a 5,000-node tree where every node has only a left child. With the default settings, what happens?',
        [['RecursionError, as the depth passes the limit of about 1000', true],
          ['It returns 5000 after a few seconds of deep recursion', false],
          ['MemoryError, as 5,000 TreeNode objects do not fit', false],
          ['AttributeError at the deepest node, whose left is None', false]],
        'A left-only chain has height n, so the recursion goes 5,000 frames deep. Python stops at about 1000 frames and raises RecursionError; an iterative BFS or an explicit stack avoids it.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'A tree-BFS uses node = queue.pop(0) on a plain list. On a tree with a very wide bottom level, what is the cost problem?',
        [['pop(0) shifts every element, so it is O(n) per pop', true],
          ['pop(0) removes the last item, so the order is LIFO', false],
          ['A list cannot hold TreeNode objects without copying', false],
          ['pop(0) is O(log n), which is slower than a heap pop', false]],
        'Removing index 0 makes the list move all remaining items one slot left — O(n) each time, O(n²) overall. collections.deque.popleft() is O(1), which is why BFS uses a deque.'),
      ck('DSA_TREES', 'r = TreeNode(8, TreeNode(3, None, TreeNode(6)), TreeNode(10, TreeNode(9))). A left-right-node walk collects the values. What list comes out?',
        [['[6, 3, 9, 10, 8]', true],
          ['[3, 6, 8, 9, 10]', false],
          ['[8, 3, 6, 10, 9]', false],
          ['[6, 9, 3, 10, 8]', false]],
        'Postorder finishes both subtrees before the node: the left subtree gives 6 then 3, the right subtree gives 9 then 10, and the root 8 comes last. [3, 6, 8, 9, 10] is the inorder walk.'),
      ck('DSA_TREES', 'A height function counts edges, so its base case is if node is None: return -1. What does it return for a tree that is one single node?',
        [['0', true],
          ['1', false],
          ['-1', false],
          ['2', false]],
        'The single node computes 1 + max(-1, -1) = 0: a lone node is zero edges tall. With the node-counting base case return 0 the same tree would have height 1.'),
    ],
  },

  /* ══ Binary search trees ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_BST',
    notes: `A **binary search tree** adds one rule to a binary tree: for every node, every value in its
left subtree is smaller, and every value in its right subtree is larger. "Every value in the
subtree", not just the child — that word is where most bugs live.

## Search and insert

    def search(node, key):
        while node is not None and node.val != key:
            node = node.left if key < node.val else node.right
        return node                      # the node, or None if absent

    def insert(node, key):
        if node is None:
            return TreeNode(key)
        if key < node.val:
            node.left = insert(node.left, key)
        elif key > node.val:
            node.right = insert(node.right, key)
        return node                      # duplicates are ignored

    root = None
    for k in [5, 3, 8, 3, 1]:
        root = insert(root, k)           # inorder of root is now [1, 3, 5, 8]

\`insert\` returns the (possibly new) subtree root, and the caller reassigns it — that is how a
\`None\` child gets replaced by a real node without a parent pointer. Forgetting \`root = \` on the
first call leaves \`root\` as \`None\` forever.

Each step discards one subtree, so both are O(h). Balanced, h is about log n. Insert sorted data
1, 2, 3, … and every node goes right: h becomes n, the "tree" is a linked list, and a recursive
insert hits Python's recursion limit near 1000 keys.

## Delete

Three cases:

- a **leaf** is simply removed;
- a node with **one child** is replaced by that child;
- a node with **two children** takes the value of its **inorder successor** — the smallest value
  in its right subtree — and that successor is then deleted from the right subtree.

        def delete(node, key):
            if node is None:
                return None
            if key < node.val:
                node.left = delete(node.left, key)
            elif key > node.val:
                node.right = delete(node.right, key)
            else:
                if node.left is None:
                    return node.right
                if node.right is None:
                    return node.left
                succ = node.right
                while succ.left:             # leftmost node of the right subtree
                    succ = succ.left
                node.val = succ.val
                node.right = delete(node.right, succ.val)
            return node

Build the tree from 40, 20, 60, 10, 30, 50, 70 and delete 40: the successor is 50, so the root
becomes 50 and preorder reads \`[50, 20, 10, 30, 60, 70]\`.

## Classic problem: validate a BST (LeetCode 98)

Checking only \`node.left.val < node.val < node.right.val\` is wrong. In this tree

        10
       /  \\
      5    15
          /  \\
         6    20

every parent-child pair looks fine, but 6 sits in 10's right subtree and is smaller than 10. Each
node must lie inside a **range** inherited from all its ancestors:

    def is_valid_bst(node, low=float('-inf'), high=float('inf')):
        if node is None:
            return True
        if not (low < node.val < high):
            return False
        return (is_valid_bst(node.left, low, node.val)
                and is_valid_bst(node.right, node.val, high))

Going left tightens the upper bound; going right tightens the lower bound. Python's chained
comparison \`low < node.val < high\` reads exactly like the rule.

**Python differs from Java here.** Java code needs \`Long.MIN_VALUE\` bounds so that a node holding
\`Integer.MAX_VALUE\` is not rejected. Python ints have no maximum, so \`float('-inf')\` and
\`float('inf')\` are the honest bounds — they compare correctly with any int. Do not use
\`sys.maxsize\`; it is not the largest int, just the largest list index.

The other correct approach: an inorder traversal of a BST is strictly increasing, so walk inorder
and compare each value with the previous one.

**Cost.** O(n) time — every node is checked once. O(h) stack.

## Edge cases

- An empty tree (\`None\`) is a valid BST.
- Duplicates: LeetCode 98 treats an equal value as invalid, hence the strict \`<\`. Confirm the rule.

## No TreeMap: what Python gives you instead

Java has \`TreeMap\` and \`TreeSet\` — self-balancing BSTs with O(log n) insert and floor/ceiling
queries. **Python's standard library has no sorted map.** \`dict\` keeps *insertion* order, not
key order. The usual substitutes:

- **A sorted list plus \`bisect\`.** Lookups are binary searches, O(log n):

        from bisect import bisect_left, bisect_right, insort

        starts = [900, 1030, 1400, 1615]
        i = bisect_right(starts, 1430) - 1     # floor: greatest start <= 1430
        print(starts[i])                       # 1400
        j = bisect_left(starts, 1430)          # ceiling: least start >= 1430
        print(starts[j])                       # 1615

  But \`insort(starts, x)\` is O(n): finding the slot is O(log n), shifting the elements after it is
  O(n). Fine for mostly-read data; slow for 10⁵ inserts interleaved with queries.
- **Always check the bisect index.** When nothing qualifies, the floor index is \`-1\`, and
  \`starts[-1]\` silently returns the *last* element instead of failing. Guard with \`if i >= 0\`;
  likewise \`j == len(starts)\` means there is no ceiling.
- **\`sortedcontainers.SortedList\`** (a third-party package, not in the standard library) gives
  O(log n) adds. Many online judges do not have it, so do not rely on it in an interview.
- If you only ever need the smallest or largest, a heap (next lesson) is enough.`,
    workedExample: `**Goal: the kth smallest value in a BST (LeetCode 230), stopping early.**

Inorder visits a BST in ascending order, so the kth value visited is the answer. A generator
makes "stop after k" free, because it only produces values when asked:

    def inorder_values(node):
        if node is not None:
            yield from inorder_values(node.left)
            yield node.val
            yield from inorder_values(node.right)

    def kth_smallest(root, k):
        for i, val in enumerate(inorder_values(root), start=1):
            if i == k:
                return val
        raise ValueError("k is larger than the tree")

Insert 5, 3, 6, 2, 4, 1 and ask for k = 3. The generator descends 5 → 3 → 2 → 1, yields 1
(i=1), then 2 (i=2), then 3 (i=3) → returns 3. The 4, 5 and 6 are never visited.

**Cost.** O(h + k) time, not O(n): it walks down to the smallest value and then k steps. Space is
O(h) for the chain of suspended generators — each \`yield from\` level is one more frame, so on a
degenerate tree deeper than about 1000 this hits the recursion limit too. The iterative version
pushes the left spine onto a list used as a stack, pops, counts, and moves right.`,
    mcqs: [
      mcq('insert(node, key) returns the subtree root and ignores duplicates. root = None; for k in [5, 3, 8, 3, 1]: root = insert(root, k). What does an inorder walk of root give?',
        [['[1, 3, 5, 8]', true],
          ['[1, 3, 3, 5, 8]', false],
          ['[5, 3, 1, 8]', false],
          ['[5, 3, 8, 3, 1]', false]],
        'The second 3 reaches the existing 3, is neither smaller nor larger, and is dropped. Inorder of a BST is ascending, so the four distinct keys come out sorted.'),
      mcq('A sorted list of n start times is kept with bisect.insort(times, t). What does one insort cost?',
        [['O(n) — the search is O(log n) but the shift after it is O(n)', true],
          ['O(log n) — bisect keeps the list balanced like a red-black tree', false],
          ['O(1) amortised — the list grows at its end like append does', false],
          ['O(n log n) — the whole list is re-sorted after every insert', false]],
        'insort finds the position with a binary search, then list.insert must move every element after that position one slot right. That shift dominates: O(n).'),
      mcq('In a BST delete, the two-children case runs succ = node.right, then while succ.left: succ = succ.left. Which value does succ end up holding?',
        [['The smallest value in the node\'s right subtree', true],
          ['The largest value in the node\'s right subtree', false],
          ['The largest value in the node\'s left subtree', false],
          ['The value of the node\'s own direct right child', false]],
        'One step right, then left as far as possible, reaches the minimum of the right subtree — the inorder successor. It is larger than everything on the left, so copying it up keeps the BST rule.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'A validator only checks node.left.val < node.val < node.right.val at every node. On the tree 10 (5, 15 (6, 20)) what does it return?',
        [['True, though 6 sits in 10\'s right subtree', true],
          ['False, as it sees that 6 is less than 10', false],
          ['False, as 5 and 15 are not adjacent ints', false],
          ['True, and the tree is a correct BST too', false]],
        'Each parent-child pair passes the local check, so it returns True. But 6 is in the right subtree of 10 and smaller than it; only bounds inherited from every ancestor catch that.'),
      ck('DSA_TREES', 'starts = [900, 1030, 1400, 1615]; i = bisect_right(starts, 800) - 1; print(starts[i]). What is printed?',
        [['1615', true],
          ['900', false],
          ['None', false],
          ['IndexError', false]],
        'No start is <= 800, so bisect_right returns 0 and i is -1. starts[-1] is the last element, 1615, so the bug is silent. A floor query must check i >= 0 first.'),
      ck('DSA_TREES', 'A Java solution uses TreeMap.floorKey. What does Python\'s standard library offer for the same sorted-key lookups?',
        [['No sorted map; use bisect on a sorted list', true],
          ['dict, since it keeps its keys in sorted order', false],
          ['collections.OrderedDict, a balanced BST map', false],
          ['heapq, which answers floor queries in O(1)', false]],
        'Python has no TreeMap. dict and OrderedDict keep insertion order, not key order, and a heap only exposes its minimum. A sorted list with bisect gives O(log n) floor and ceiling lookups.'),
    ],
  },

  /* ══ Heaps and heapq ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_HEAPS',
    notes: `A **binary heap** is a complete binary tree stored in an array, where every parent is no
larger than its children (a **min-heap**). The smallest element is always at index 0, so you can
look at it in O(1) and remove it, or add an element, in O(log n).

Python has no heap *class*. The \`heapq\` module is a set of functions that keep an ordinary
**list** in heap order:

    import heapq

    h = []
    for x in [5, 1, 4, 2, 3]:
        heapq.heappush(h, x)
    print(h)                    # [1, 2, 4, 5, 3]   heap order, NOT sorted
    print(h[0])                 # 1                 peek at the minimum
    print(heapq.heappop(h))     # 1

| Call | Cost |
| --- | --- |
| \`heapq.heappush(h, x)\` | O(log n) |
| \`h[0]\` | O(1) |
| \`heapq.heappop(h)\` | O(log n) |
| \`heapq.heapify(lst)\` | O(n), in place |
| \`heapq.heappushpop(h, x)\` / \`heapreplace(h, x)\` | O(log n), one sift |
| \`heapq.nlargest(k, it)\` / \`nsmallest(k, it)\` | O(n log k) |
| \`x in h\` / \`h.remove(x)\` | O(n) — and \`remove\` breaks the heap order |

## Where Python differs from Java's PriorityQueue

- **There is no max-heap.** \`heapq\` is min-only. For a max-heap, **push the negation** and negate
  again on the way out: push \`-x\`, read \`-h[0]\`, pop \`-heappop(h)\`.

        h = []
        for x in [3, 9, 4, 7]:
            heapq.heappush(h, -x)
        print(-heapq.heappop(h))   # 9
        print(-h[0])               # 7

- **No comparator argument.** Order by something else by pushing a **tuple**: tuples compare
  element by element, so \`(priority, item)\` sorts by priority. But on a tie Python compares the
  *items*, and two dicts (or two objects without \`<\`) raise
  \`TypeError: '<' not supported between instances of 'dict' and 'dict'\`. Add a tie-breaker that is
  always unique, such as a counter: \`(priority, next(counter), item)\` with
  \`counter = itertools.count()\`.
- **Empty heap.** \`heappop([])\` raises \`IndexError\`, and \`h[0]\` on an empty list does too.
  Java's \`poll()\` returns null instead. Check \`if h:\` first.
- **Printing or iterating** the list shows heap order, not sorted order — the same trap as Java.
  Only repeated \`heappop\` comes out sorted.
- Anything else that appends to the list (\`h.append(x)\`, \`h.sort(reverse=True)\`) silently breaks the
  invariant. Touch a heap list only through \`heapq\`.

## Classic problem: kth largest element (LeetCode 215)

Sorting costs O(n log n). Keep instead a **min-heap of size k** holding the k largest values seen
so far; its root is the smallest of them — the kth largest.

    def find_kth_largest(nums, k):
        h = []
        for x in nums:
            heapq.heappush(h, x)
            if len(h) > k:
                heapq.heappop(h)          # drop the smallest
        return h[0]

    print(find_kth_largest([3, 2, 1, 5, 6, 4], 2))   # 5

It looks backwards — a *min*-heap for the *largest* — but the heap's job is to throw away values
that are too small, and the smallest is what a min-heap removes cheaply.

**Cost.** n pushes and up to n pops on a heap of at most k+1 items: O(n log k) time, O(k) space.
\`heapq.nlargest(k, nums)[-1]\` does the same in one line.

## The same pattern elsewhere

- **Top k frequent elements** (LeetCode 347): count with \`Counter\`, then
  \`heapq.nlargest(k, cnt, key=cnt.get)\` — or simply \`cnt.most_common(k)\`. O(n log k).
- **Merge k sorted lists** (LeetCode 23): push each list's first element, pop the smallest, push
  that list's next element (worked example below). O(N log k) for N total elements.
  \`heapq.merge(*lists)\` is the built-in, lazy version.
- **Running median** (LeetCode 295): a max-heap (stored negated) for the lower half and a min-heap
  for the upper half, kept within one element of each other. The median is read from the roots.

        lo, hi = [], []                      # lo holds negated values
        def add(x):
            heapq.heappush(lo, -x)
            heapq.heappush(hi, -heapq.heappop(lo))     # move lo's largest up
            if len(hi) > len(lo):
                heapq.heappush(lo, -heapq.heappop(hi))  # rebalance
        def median():
            return -lo[0] if len(lo) > len(hi) else (-lo[0] + hi[0]) / 2

  Adding 5, 15, 1, 3 gives medians 5, 10.0, 5, 4.0.

## Edge cases

- Duplicates are kept — a heap is not a set. The kth largest of [7, 7, 7, 1] with k = 2 is 7.
- k equal to n works: nothing is ever popped and the root is the minimum.
- \`heapify\` before pushing anything when you start with a full list: O(n) beats n pushes.`,
    workedExample: `**Goal: merge k sorted Python lists into one sorted list.**

    import heapq

    def merge_k(lists):
        heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
        heapq.heapify(heap)
        out = []
        while heap:
            val, i, j = heapq.heappop(heap)
            out.append(val)
            if j + 1 < len(lists[i]):
                heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
        return out

    print(merge_k([[1, 4, 5], [1, 3, 4], [2, 6], []]))   # [1, 1, 2, 3, 4, 4, 5, 6]

Each heap entry is (value, which list, which index). The heap starts with (1, 0, 0), (1, 1, 0),
(2, 2, 0); the empty list is skipped by \`if lst\`. Pop (1, 0, 0), push list 0's next value 4; pop
(1, 1, 0), push 3; pop 2, push 6; pop 3 … The heap never holds more than k entries, so each step is
O(log k), and the whole merge is O(N log k).

The list index \`i\` does double duty: it tells you where the next value comes from, and on a tie
in value it is what gets compared next — two ints — so Python never has to compare anything
uncomparable. With linked-list nodes you would push \`(node.val, i, node)\` for the same reason.`,
    mcqs: [
      mcq('h = []; for x in [5, 1, 4, 2, 3]: heapq.heappush(h, x). Then print(h). What is printed?',
        [['[1, 2, 4, 5, 3]', true],
          ['[1, 2, 3, 4, 5]', false],
          ['[5, 1, 4, 2, 3]', false],
          ['[5, 4, 3, 2, 1]', false]],
        'h is a plain list kept in heap order: each parent is no larger than its children, nothing more. Pushing 5, 1, 4, 2, 3 leaves [1, 2, 4, 5, 3]; only repeated heappop yields sorted output.'),
      mcq('h = []; for x in [3, 9, 4, 7]: heapq.heappush(h, -x). Then print(-heapq.heappop(h), -h[0]). What is printed?',
        [['9 7', true],
          ['3 4', false],
          ['-9 -7', false],
          ['9 4', false]],
        'Negated, the values are -3, -9, -4, -7; the min-heap pops -9 first, which negates to 9. The new root is -7, so -h[0] is 7. Negation turns heapq into a max-heap.'),
      mcq('The kth largest of n numbers is found by pushing each into a heap and popping whenever len(h) > k. What does it cost?',
        [['O(n log k) time and O(k) space', true],
          ['O(n log n) time and O(n) space', false],
          ['O(k log n) time and O(1) space', false],
          ['O(n) time and O(1) extra space', false]],
        'Each of the n values is pushed to, and maybe popped from, a heap of at most k+1 items, so each operation is O(log k). The heap is the only extra storage.'),
    ],
    checkpoint: [
      ck('DSA_HEAPS', 'Tasks are pushed as heapq.heappush(t, (2, {"id": "a"})) and then heapq.heappush(t, (2, {"id": "b"})). What happens on the second push?',
        [['TypeError, since equal priorities make it compare two dicts', true],
          ['The second task replaces the first, as both have priority 2', false],
          ['It works; ties are kept in insertion order by heapq itself', false],
          ['KeyError, since heapq looks up "id" to break the tie itself', false]],
        'Tuples compare element by element; the priorities tie at 2, so Python compares the dicts and dicts do not support <. A unique counter as the second element, (2, next(c), task), fixes it.'),
      ck('DSA_HEAPS', 'A running-median class uses two heapq lists, lo and hi. Which arrangement is correct?',
        [['lo holds the lower half negated, hi holds the upper half as is', true],
          ['lo holds the lower half as is, hi holds the upper half negated', false],
          ['lo and hi both hold raw values, split by even and odd positions', false],
          ['lo holds every value, hi holds a sorted copy for reading medians', false]],
        'The median needs the largest of the lower half and the smallest of the upper half. heapq is min-only, so the lower half is stored negated to act as a max-heap; the upper half is a plain min-heap.'),
      ck('DSA_HEAPS', 'top = heapq.heappop(h) is called when h is an empty list. What happens?',
        [['IndexError is raised', true],
          ['top is set to None', false],
          ['top is set to 0', false],
          ['It blocks and waits', false]],
        'heapq works on a plain list, and popping from an empty list raises IndexError. Unlike Java\'s poll(), nothing returns null, so check if h: before popping.'),
    ],
  },

  /* ══ Graphs, BFS and DFS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_GRAPHS',
    notes: `A **graph** is nodes joined by edges. Edges may be directed (a follows b) or undirected (a
and b are friends), and weighted or not. Trees are graphs with no cycles; a grid is a graph where
each cell joins its four neighbours.

## Representing one in Python

Interviews give you an edge list (\`[[0, 1], [1, 2], ...]\`) or a grid. Turn an edge list into an
**adjacency list** first. Two Python forms:

    from collections import defaultdict

    # nodes are 0..n-1: a list of lists
    adj = [[] for _ in range(n)]          # NOT [[]] * n — that is n names for ONE list
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)                  # omit for a directed graph

    # nodes are strings or arbitrary ids: a defaultdict
    graph = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)

Both are O(V + E) space. An adjacency **matrix** (\`[[False] * n for _ in range(n)]\`) answers "is
there an edge?" in O(1) but costs O(V²) — ten billion cells for 10⁵ nodes. If you need fast edge
tests on a sparse graph, use a list of **sets** instead.

**The defaultdict trap.** *Reading* \`graph[v]\` for a key that is not there **inserts** it with an
empty list. So a node with no outgoing edges gets added the first time you look at it — and if
that happens while you are looping over \`for u in graph:\`, Python raises
\`RuntimeError: dictionary changed size during iteration\`. Read with \`graph.get(v, [])\`, or make
sure every node is a key before you iterate.

## BFS — fewest steps

Breadth-first search explores in rings of distance 1, 2, 3 … so in an unweighted graph the first
time it reaches a node is by a shortest path.

    from collections import deque

    def bfs(adj, src):
        dist = {src: 0}
        queue = deque([src])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in dist:             # mark when ENQUEUED, not when popped
                    dist[v] = dist[u] + 1
                    queue.append(v)
        return dist

With edges 0-1, 0-2, 1-3, 2-3, 3-4, \`bfs(adj, 0)\` returns \`{0: 0, 1: 1, 2: 1, 3: 2, 4: 3}\`. The
\`dist\` dict doubles as the visited set, and any node missing from it is unreachable.

Marking at enqueue time matters: mark only when popped, and node 3 above — reachable from both 1
and 2 — is queued twice. On a dense graph that blows up the queue.

**Cost.** O(V + E): each node is enqueued once and each edge examined once (twice, undirected).

## DFS — reach everything, find components

Depth-first search goes as deep as it can, then backs up. It is the natural tool for "how many
separate pieces", "is there a path" and cycle detection. Write it with a **list as a stack** and
you are safe from the recursion limit:

    def count_components(n, edges):
        adj = [[] for _ in range(n)]
        for a, b in edges:
            adj[a].append(b)
            adj[b].append(a)
        seen = [False] * n
        components = 0
        for start in range(n):
            if seen[start]:
                continue
            components += 1                   # an unseen node starts a new piece
            seen[start] = True
            stack = [start]
            while stack:
                u = stack.pop()
                for v in adj[u]:
                    if not seen[v]:
                        seen[v] = True
                        stack.append(v)
        return components

    print(count_components(6, [(0, 1), (1, 2), (3, 4)]))   # 3: {0,1,2}, {3,4}, {5}

## Classic problem: number of islands (LeetCode 200)

A grid of \`'1'\` (land) and \`'0'\` (water); count connected groups of land, joined up, down, left,
right. In Java the recursive "sink" is the textbook answer. **In Python, recursion is the wrong
default here**: a 1000×1000 grid of all land would recurse up to a million frames deep and raise
\`RecursionError\` after about 1000. Use BFS with a deque of \`(row, col)\` tuples:

    def num_islands(grid):
        if not grid:
            return 0
        g = [list(row) for row in grid]          # a copy: strings cannot be changed in place
        rows, cols = len(g), len(g[0])
        count = 0
        for r in range(rows):
            for c in range(cols):
                if g[r][c] == '1':
                    count += 1
                    g[r][c] = '0'                # sink it the moment it is queued
                    queue = deque([(r, c)])
                    while queue:
                        x, y = queue.popleft()
                        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                            if 0 <= nx < rows and 0 <= ny < cols and g[nx][ny] == '1':
                                g[nx][ny] = '0'
                                queue.append((nx, ny))
        return count

    print(num_islands(["11000", "11010", "00011", "00000"]))   # 2

**The bounds check comes first, and in Python it is not optional for correctness.** In Java an
out-of-range index throws. In Python \`g[-1][c]\` is *legal* — it reads the last row — so a missing
\`0 <= nx\` check does not crash; it silently joins the top edge to the bottom edge and gives a
wrong count.

**Cost.** Every cell is visited a constant number of times: O(R·C) time, and O(R·C) space for the
copy and the queue.

## Edge cases

- An empty grid → guard with \`if not grid\` before reading \`grid[0]\`.
- Copying the grid keeps the caller's input intact; a \`seen\` set of tuples is the alternative.
- Diagonal cells are not neighbours unless the problem says so.
- Disconnected graphs: loop over every node as a possible start, as \`count_components\` does.`,
    workedExample: `**Goal: detect a cycle in a graph with DFS — undirected, then directed.**

**Undirected.** Every edge appears twice in the adjacency list, so "I reached a visited node" is
not by itself a cycle — the node you just came from is always visited. Pass the parent:

    def has_cycle(u, parent, adj, seen):
        seen.add(u)
        for v in adj[u]:
            if v not in seen:
                if has_cycle(v, u, adj, seen):
                    return True
            elif v != parent:
                return True
        return False

Edges 0-1, 1-2, 2-0: from 0 go to 1 (parent 0), then to 2 (parent 1); 2's neighbour 0 is seen and
is not 2's parent → cycle, \`True\`. Edges 0-1, 1-2 alone give \`False\`. Drop the \`v != parent\`
test and the single edge 0-1 is reported as a cycle.

**Directed.** The parent trick does not apply. Colour each node: white (unvisited), grey (on the
current DFS path), black (finished). Reaching a **grey** node means you have looped back onto your
own path:

    def directed_cycle(adj, n):
        WHITE, GREY, BLACK = 0, 1, 2
        color = [WHITE] * n
        def dfs(u):
            color[u] = GREY
            for v in adj[u]:
                if color[v] == GREY:
                    return True
                if color[v] == WHITE and dfs(v):
                    return True
            color[u] = BLACK
            return False
        return any(color[u] == WHITE and dfs(u) for u in range(n))

\`[[1], [2], [0]]\` (0→1→2→0) gives \`True\`. \`[[1, 2], [2], []]\` gives \`False\`: node 2 is reached
twice, but the second time it is already black, which is a second route, not a loop.

Both are O(V + E). Both are recursive, so for graphs deeper than about 1000 either raise the limit
with \`sys.setrecursionlimit\` or rewrite with an explicit stack.`,
    mcqs: [
      mcq('Edges 0-1, 0-2, 1-3, 2-3, 3-4 go into an undirected defaultdict(list). bfs(adj, 0) fills dist = {0: 0} as it enqueues. What does print(bfs(adj, 0)) show?',
        [['{0: 0, 1: 1, 2: 1, 3: 2, 4: 3}', true],
          ['{0: 0, 1: 1, 2: 1, 3: 3, 4: 4}', false],
          ['{0: 0, 1: 1, 2: 2, 3: 3, 4: 4}', false],
          ['{0: 0, 1: 1, 3: 2, 4: 3, 2: 1}', false]],
        'BFS goes ring by ring: 1 and 2 are one step from 0, 3 is two steps (through 1 or 2), and 4 is three. The dict prints in insertion order, which is the order nodes were enqueued.'),
      mcq('graph is a defaultdict(list) built only from a→b, b→c and d→e. The loop for u in graph: for v in graph[u]: x = graph[v] runs. What happens?',
        [['RuntimeError — reading graph["c"] inserts a key mid-loop', true],
          ['It finishes, and graph keeps exactly its three original keys', false],
          ['KeyError — "c" has no entry, so graph["c"] cannot be read', false],
          ['An endless loop — the new keys keep being visited in turn', false]],
        'c and e are never sources, so they are not keys. defaultdict creates graph["c"] on first read, the dict changes size while being iterated, and Python raises RuntimeError. Use graph.get(v, []).'),
      mcq('A Python BFS marks a node as seen only when it is popped from the deque, not when it is appended. What goes wrong?',
        [['A node can sit in the deque several times at once', true],
          ['The distances come out as depth-first distances', false],
          ['deque.popleft() raises when it meets a seen node', false],
          ['The start node is never added to the visited set', false]],
        'Between being appended and popped, a node can be found again from other neighbours and appended again. Marking at append time guarantees each node enters the queue once, keeping BFS O(V + E).'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'Which question needs BFS, rather than DFS, to be answered directly?',
        [['The fewest moves a knight needs between two squares', true],
          ['How many friend groups a list of friendships forms', false],
          ['Whether any route at all joins two given airports', false],
          ['Marking every cell of one island as already visited', false]],
        'BFS reaches nodes in order of distance, so its first arrival is a shortest path in an unweighted graph. The other three only need reachability, which DFS gives just as well.'),
      ck('DSA_GRAPHS', 'A recursive sink(g, r, c) solves number of islands. On a 1000 x 1000 grid of all \'1\' it fails in Python. What is the right fix?',
        [['Rewrite it as BFS with a deque of (row, col) tuples', true],
          ['Check the four diagonal neighbours of every cell too', false],
          ['Set the cell to \'0\' after the four recursive calls', false],
          ['Convert each row from a str to a list before the scan', false]],
        'All-land recursion goes up to a million frames deep, far past the limit of about 1000, so it raises RecursionError. A deque moves that state onto the heap; even a raised limit would risk crashing the interpreter.'),
      ck('DSA_GRAPHS', 'An island-counting BFS checks nx < rows and ny < cols but forgets 0 <= nx and 0 <= ny. What does Python do when nx becomes -1?',
        [['Reads the last row through g[-1], and may miscount', true],
          ['Raises IndexError, because -1 is out of the range', false],
          ['Skips the cell, because negative indexes are None', false],
          ['Raises TypeError, as list indexes must be positive', false]],
        'Negative indexes count from the end, so g[-1] is the last row and no error is raised. The search silently wraps from the top edge to the bottom edge and can merge islands that are not joined.'),
    ],
  },
];
