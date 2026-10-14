/**
 * Career-track content: DSA in Java — trees, heaps, graphs, greedy and dynamic programming
 * (JT_JAVA_DSA_NONLINEAR).
 *
 * Every lesson solves one named classic problem in complete Java, because that is what an
 * interview asks for: the code on the whiteboard, its cost, and the edge case that breaks it.
 * Questions are about specific Java code — a TreeNode method, a PriorityQueue comparator, a
 * dist[] array — rather than about the vocabulary of the structures.
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

export const TRACK_JAVA_DSA_NONLINEAR_BUNDLES: PilotBundle[] = [
  /* ══ Trees ══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_TREES',
    notes: `A **binary tree** is a set of nodes where each node has at most two children, \`left\` and
\`right\`. In Java an interview nearly always hands you this class:

    class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }

A tree is a recursive shape: a node plus a left subtree plus a right subtree, either of which may
be \`null\`. So most tree code is recursive, and every recursive tree method starts with the same
line — **what do I return for null?**

## Depth-first traversals

The three orders differ only in where the node's own work happens:

    void preorder(TreeNode n, List<Integer> out) {   // node, left, right
        if (n == null) return;
        out.add(n.val);
        preorder(n.left, out);
        preorder(n.right, out);
    }
    // inorder:   left, node, right   (sorted order for a BST)
    // postorder: left, right, node   (children finished first — sizes, heights, deleting)

## Height

    int height(TreeNode n) {
        if (n == null) return 0;
        return 1 + Math.max(height(n.left), height(n.right));
    }

This is postorder: you need both children's answers before you can compute your own.

## Classic problem: level-order traversal (LeetCode 102)

Return the values level by level. Depth-first recursion visits nodes in the wrong order for this;
you want **breadth first**, which means a queue:

    List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> result = new ArrayList<>();
        if (root == null) return result;
        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int size = queue.size();              // nodes on this level, fixed now
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode n = queue.poll();
                level.add(n.val);
                if (n.left != null)  queue.offer(n.left);
                if (n.right != null) queue.offer(n.right);
            }
            result.add(level);
        }
        return result;
    }

The trick is \`int size = queue.size()\` taken **before** the inner loop. Children are added to the
queue while the loop runs; if you called \`queue.size()\` in the loop condition, the level would
never end.

**Cost.** Every node is offered and polled once: O(n) time. The queue holds at most one level,
which for a complete tree is about n/2 nodes, so O(n) space in the worst case (O(w), the widest
level, more precisely). The recursive traversals use O(h) stack, where h is the height — O(log n)
for a balanced tree, O(n) for a tree that is really a linked list.

## Edge cases

- \`root == null\` → return an empty list, not a list holding an empty list.
- A degenerate tree of 100,000 nodes all on the left will overflow the default thread stack with
  recursion. Use the iterative version (an explicit \`Deque\`) when depth is unbounded.
- \`ArrayDeque\` does not accept \`null\`, which is why the children are checked before \`offer\`.`,
    workedExample: `**Goal: the right-side view — the last value on each level.**

Tree: 1 at the root, 2 and 3 its children, 5 as 2's right child, 4 as 3's right child.

Run level order. Level 1 polls [1]; the last polled is 1. Level 2 polls [2, 3]; the last is 3.
Level 3 polls [5, 4]; the last is 4. Answer: [1, 3, 4].

The only change to \`levelOrder\` is inside the loop: \`if (i == size - 1) view.add(n.val);\`. The
size captured before the loop is what makes "the last node on this level" a meaningful question.`,
    mcqs: [
      mcq('In a Java level-order traversal, why is int size = queue.size() read before the inner for loop?',
        [['Children added during the loop would otherwise join this level', true],
          ['ArrayDeque.size() walks the deque, so it must be called only once', false],
          ['queue.size() throws if it is called while polling elements', false],
          ['It makes the traversal visit the right child before the left', false]],
        'The inner loop offers the next level\'s nodes onto the same queue. Fixing the count first is what separates one level from the next.'),
      mcq('height(TreeNode n) returns 0 for null and 1 + max of the children otherwise. Which traversal order is it?',
        [['Postorder — both children are computed before the node', true],
          ['Preorder — the node is handled before its children', false],
          ['Inorder — the node sits between its two recursive calls', false],
          ['Level order — it walks the tree one level at a time', false]],
        'The node\'s answer depends on both subtrees\' answers, so its own work happens after both recursive calls — that is postorder.'),
      mcq('A recursive Java preorder on a 200,000-node tree where every node has only a left child fails. With what?',
        [['StackOverflowError, because recursion depth equals the height', true],
          ['OutOfMemoryError, because ArrayList cannot hold that many', false],
          ['NullPointerException at the deepest leaf, where left is null too', false],
          ['ConcurrentModificationException from the result list', false]],
        'A left-only chain has height n, so recursion goes 200,000 frames deep and overflows the thread stack. An explicit Deque avoids it.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'Which Java collection is the right one to drive a breadth-first walk of a binary tree?',
        [['ArrayDeque used as a FIFO queue', true],
          ['ArrayDeque used as a LIFO stack', false],
          ['A PriorityQueue ordered by val', false],
          ['A TreeSet of the visited nodes', false]],
        'Breadth first means the nodes found first are processed first — FIFO. Using the deque as a stack gives depth-first order instead.'),
      ck('DSA_TREES', 'For a perfectly balanced tree with n nodes, what extra space does recursive inorder use?',
        [['O(log n) for the call stack', true],
          ['O(1), as no collection is created', false],
          ['O(n) for the call stack', false],
          ['O(n log n) across all the calls', false]],
        'The call stack holds one frame per level on the current path, and a balanced tree has about log n levels.'),
      ck('DSA_TREES', 'levelOrder(null) should return what, by the usual LeetCode contract?',
        [['An empty List<List<Integer>>', true],
          ['A list that holds one empty list', false],
          ['null, to signal there was no tree', false],
          ['It should throw IllegalArgumentException', false]],
        'No tree means no levels, so the result has no entries. A list containing an empty list would claim one level with nothing on it.'),
    ],
  },

  /* ══ Binary search trees ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_BST',
    notes: `A **binary search tree** adds one rule to a binary tree: for every node, every value in its
left subtree is smaller, and every value in its right subtree is larger. "Every value in the
subtree", not just the child — that word is where most bugs live.

## Search and insert

    TreeNode search(TreeNode n, int key) {
        while (n != null && n.val != key) n = key < n.val ? n.left : n.right;
        return n;
    }

    TreeNode insert(TreeNode n, int key) {
        if (n == null) return new TreeNode(key);
        if (key < n.val) n.left = insert(n.left, key);
        else if (key > n.val) n.right = insert(n.right, key);
        return n;                       // duplicates ignored
    }

Each step discards one subtree, so both are O(h). Balanced, h is log n; insert sorted data
1, 2, 3, … and every node goes right, h becomes n, and the "tree" is a linked list.

## Delete

Three cases: a leaf is removed; a node with one child is replaced by that child; a node with two
children copies its **inorder successor** (the smallest value in its right subtree) and then
deletes that successor from the right subtree.

## Classic problem: validate a BST (LeetCode 98)

Checking only \`left.val < node.val < right.val\` is wrong. In this tree

        5
       / \\
      1   6
         / \\
        3   7

every parent-child pair looks fine, but 3 sits in 5's right subtree and is smaller than 5. Each
node must lie inside a **range** inherited from all its ancestors:

    boolean isValidBST(TreeNode root) {
        return valid(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }

    boolean valid(TreeNode n, long low, long high) {
        if (n == null) return true;
        if (n.val <= low || n.val >= high) return false;
        return valid(n.left, low, n.val) && valid(n.right, n.val, high);
    }

Going left tightens the upper bound; going right tightens the lower bound. The bounds are \`long\`
on purpose: a node holding \`Integer.MAX_VALUE\` is legal, and with \`int\` bounds the check
\`n.val >= Integer.MAX_VALUE\` would reject it.

The other correct approach: an inorder traversal of a BST is strictly increasing, so walk inorder
and compare each value with the previous one.

**Cost.** O(n) time — every node is checked once. O(h) stack.

## Edge cases

- An empty tree is a valid BST.
- Duplicates: LeetCode 98 treats an equal value as invalid, hence \`<=\` and \`>=\`. Confirm the rule
  with the interviewer.

## TreeMap: a BST you do not write

\`java.util.TreeMap\` is a red-black tree — a BST that rebalances itself, so every operation is
O(log n) guaranteed. It gives you the ordered queries a HashMap cannot:

    TreeMap<Integer, String> slots = new TreeMap<>();
    slots.floorKey(930);     // greatest key <= 930, or null
    slots.ceilingKey(930);   // least key >= 930, or null
    slots.headMap(1200);     // all keys < 1200`,
    workedExample: `**Goal: find the kth smallest value in a BST (LeetCode 230).**

Inorder visits a BST in ascending order, so the kth node visited is the answer. Iteratively:

    int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> stack = new ArrayDeque<>();
        TreeNode cur = root;
        while (cur != null || !stack.isEmpty()) {
            while (cur != null) { stack.push(cur); cur = cur.left; }
            cur = stack.pop();
            if (--k == 0) return cur.val;
            cur = cur.right;
        }
        throw new IllegalArgumentException("k too large");
    }

On the tree 5 (3 (2, 4), 6) with k = 3: push 5, 3, 2; pop 2 (k=2); pop 3 (k=1); go right to 4,
push, pop 4 (k=0) → 4. It stops after k nodes, so the cost is O(h + k), not O(n).`,
    mcqs: [
      mcq('Why does a common Java isValidBST pass Long.MIN_VALUE and Long.MAX_VALUE as the starting bounds?',
        [['A node holding Integer.MAX_VALUE would be rejected by int bounds', true],
          ['Comparing an int against a long is faster on the JVM', false],
          ['TreeNode.val is declared as a long in the LeetCode class', false],
          ['Long bounds let the method accept duplicate values safely in a subtree', false]],
        'With int bounds the strict check n.val >= high would fail for a node equal to Integer.MAX_VALUE, which is a legal value. Long bounds sit outside the int range.'),
      mcq('Sorted keys 1 to 10,000 are inserted in order into a plain (unbalanced) BST. What does a search then cost?',
        [['O(n), as the tree has become a right-leaning chain', true],
          ['O(log n), because a BST always halves the search', false],
          ['O(1), because the keys are consecutive integers', false],
          ['O(n log n), as each step must re-sort the subtree below it', false]],
        'Every new key is larger than all before it, so each goes to the right of the last. The height becomes n and search walks the chain.'),
      mcq('A node with two children is deleted from a BST. Which value replaces it?',
        [['The smallest value in its right subtree', true],
          ['The largest value in its right subtree', false],
          ['The smallest value in its left subtree', false],
          ['Its parent value, moved one level down the tree', false]],
        'The inorder successor is larger than everything on the left and smaller than everything else on the right, so the BST rule still holds after the swap.'),
    ],
    checkpoint: [
      ck('DSA_TREES', 'A validator returns true when node.left.val < node.val < node.right.val for every node. On the tree 5 (1, 6 (3, 7)) it says?',
        [['Valid — though 3 is in 5\'s right subtree, which is wrong', true],
          ['Invalid — it notices that 3 is smaller than the root value 5', false],
          ['Invalid — because 1 and 6 are not adjacent integers', false],
          ['Valid — and the tree really is a correct BST as well', false]],
        'Each parent-child pair satisfies the local check, so it returns true. But 3 is below 5 in 5\'s right subtree; only ancestor bounds catch that.'),
      ck('DSA_TREES', 'You must answer "the latest meeting that starts at or before 14:30" from start times. Which TreeMap call does it?',
        [['floorKey(1430)', true],
          ['ceilingKey(1430)', false],
          ['higherKey(1430)', false],
          ['firstKey()', false]],
        'floorKey returns the greatest key less than or equal to the argument. ceilingKey and higherKey look upward; firstKey ignores the time entirely.'),
      ck('DSA_TREES', 'Which statement about java.util.TreeMap is accurate?',
        [['It is a red-black tree, so get and put are O(log n)', true],
          ['It is a hash table that keeps keys in insertion order', false],
          ['It is an unbalanced BST, so put can degrade to O(n)', false],
          ['It is a sorted array, so put costs O(n) to shift', false]],
        'TreeMap is a self-balancing red-black tree. Rebalancing keeps the height logarithmic, so the worst case stays O(log n).'),
    ],
  },

  /* ══ Heaps ══════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_HEAPS',
    notes: `A **binary heap** is a complete binary tree stored in an array, where every parent is
smaller than its children (a min-heap). The smallest element is always at the root, so you can
look at it in O(1) and remove it, or add an element, in O(log n). Java's heap is
\`java.util.PriorityQueue\`, and it is a **min-heap by default**.

    PriorityQueue<Integer> min = new PriorityQueue<>();
    PriorityQueue<Integer> max = new PriorityQueue<>(Comparator.reverseOrder());
    PriorityQueue<int[]> byDist = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));

| Call | Cost |
| --- | --- |
| \`offer(x)\` / \`add(x)\` | O(log n) |
| \`peek()\` | O(1) |
| \`poll()\` | O(log n) |
| \`remove(Object)\` / \`contains\` | O(n) — it searches the array |
| \`new PriorityQueue<>(collection)\` | O(n) — heapify |

Two traps. **Iterating** a PriorityQueue (a for-each loop, \`toString()\`) does *not* give sorted
order — it walks the array, which is only heap-ordered. Only repeated \`poll()\` comes out sorted.
And a comparator written \`(a, b) -> a - b\` overflows for large values of opposite sign; use
\`Integer.compare(a, b)\`.

## Classic problem: kth largest element (LeetCode 215)

Sorting costs O(n log n). Keep instead a **min-heap of size k** holding the k largest values seen
so far; its root is the smallest of them — the kth largest.

    int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> heap = new PriorityQueue<>();
        for (int x : nums) {
            heap.offer(x);
            if (heap.size() > k) heap.poll();   // drop the smallest
        }
        return heap.peek();
    }

For [3, 2, 1, 5, 6, 4] and k = 2 the heap ends holding {5, 6}; the root, 5, is the answer.

It looks backwards — a *min*-heap for the *largest* — but the heap's job is to throw away the
values that are too small, and the smallest is what a min-heap can throw away cheaply.

**Cost.** n offers and up to n polls on a heap of size at most k+1: O(n log k) time, O(k) space.
When k is small next to n, that beats sorting comfortably.

## The same pattern elsewhere

- **Top k frequent elements**: count with a HashMap, then keep a size-k min-heap ordered by count.
- **Merge k sorted lists**: put each list's head in a min-heap; poll the smallest, append it,
  offer its \`next\`. O(N log k) for N total nodes.
- **Running median**: a max-heap for the lower half and a min-heap for the upper half, kept
  within one element of each other; the median is read from the roots.

## Edge cases

- \`peek()\` and \`poll()\` on an empty PriorityQueue return \`null\`; unboxing that null into an
  \`int\` throws NullPointerException.
- Duplicates are kept — a PriorityQueue is not a set.
- k equal to n works: the heap never polls and the root is the minimum.`,
    workedExample: `**Goal: merge k sorted linked lists (LeetCode 23).**

    ListNode mergeKLists(ListNode[] lists) {
        PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
        for (ListNode head : lists) if (head != null) heap.offer(head);
        ListNode dummy = new ListNode(0), tail = dummy;
        while (!heap.isEmpty()) {
            ListNode n = heap.poll();
            tail.next = n;
            tail = n;
            if (n.next != null) heap.offer(n.next);
        }
        return dummy.next;
    }

Lists [1,4,5], [1,3,4], [2,6]: the heap starts with 1, 1, 2. Poll a 1, offer 4; poll the other 1,
offer 3; poll 2, offer 6; poll 3 … The heap never holds more than k nodes, so each step is
O(log k). Null heads are skipped — a PriorityQueue rejects null.`,
    mcqs: [
      mcq('A PriorityQueue<Integer> is offered 5, 1, 4, 2, 3 in that order. What does System.out.println(pq) print?',
        [['[1, 2, 4, 5, 3] — the backing array in heap order', true],
          ['[1, 2, 3, 4, 5] — toString sorts the values first', false],
          ['[5, 1, 4, 2, 3] — toString keeps insertion order', false],
          ['[5, 4, 3, 2, 1] — the largest value comes first', false]],
        'toString walks the backing array, which is only heap-ordered: each parent is smaller than its children, nothing more. Only repeated poll() yields sorted output.'),
      mcq('Why use Integer.compare(a, b) rather than (a, b) -> a - b in a PriorityQueue comparator?',
        [['a - b can overflow and flip the sign for large values', true],
          ['Integer.compare runs in O(1) while subtraction is O(log n)', false],
          ['A lambda comparator cannot be passed to the constructor', false],
          ['a - b makes the PriorityQueue a max-heap by accident', false]],
        'For a = 2,000,000,000 and b = -2,000,000,000 the difference overflows int and becomes negative, so the comparator says a < b.'),
      mcq('Finding the kth largest of n numbers with a size-k min-heap costs what?',
        [['O(n log k) time and O(k) space', true],
          ['O(n log n) time and O(n) space', false],
          ['O(k log n) time and O(1) space', false],
          ['O(n) time and O(1) extra space', false]],
        'Each of the n elements is offered to, and possibly polled from, a heap of at most k+1 items, and the heap is the only extra storage.'),
    ],
    checkpoint: [
      ck('DSA_HEAPS', 'Which constructor gives a PriorityQueue<Integer> whose poll() returns the largest value first?',
        [['new PriorityQueue<>(Comparator.reverseOrder())', true],
          ['new PriorityQueue<>(Comparator.naturalOrder())', false],
          ['new PriorityQueue<>(), the default ordering', false],
          ['new PriorityQueue<>(Integer::compare)', false]],
        'PriorityQueue is a min-heap by default; natural order and Integer::compare both keep it so. reverseOrder() turns it into a max-heap.'),
      ck('DSA_HEAPS', 'A running-median class keeps two heaps. Which pair is correct?',
        [['A max-heap for the lower half, a min-heap for the upper', true],
          ['A min-heap for the lower half, a max-heap for the upper', false],
          ['Two min-heaps, one for odd and one for even positions', false],
          ['Two max-heaps that are merged when the median is read', false]],
        'The median sits at the boundary: the largest of the lower half and the smallest of the upper half, which are exactly the two roots.'),
      ck('DSA_HEAPS', 'int top = pq.poll(); throws NullPointerException. What is the likely cause?',
        [['The queue was empty, and the null result was unboxed', true],
          ['The queue held a duplicate, which poll cannot remove', false],
          ['The comparator was missing, so poll had no ordering', false],
          ['poll() was called while another thread used peek()', false]],
        'poll() returns null on an empty queue. Assigning that Integer to an int unboxes it, and unboxing null throws NullPointerException.'),
    ],
  },

  /* ══ Graphs, BFS and DFS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_GRAPHS',
    notes: `A **graph** is nodes joined by edges. Edges may be directed (a follows b) or undirected (a
and b are friends), and weighted or not. Trees are graphs with no cycles; a grid is a graph where
each cell joins its four neighbours.

## Representing one in Java

Interviews give you either an edge list (\`int[][] edges\`) or a grid. Turn an edge list into an
**adjacency list** first:

    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        adj.get(e[1]).add(e[0]);      // omit this line for a directed graph
    }

That is O(V + E) space. An adjacency **matrix** (\`boolean[n][n]\`) answers "is there an edge?" in
O(1) but costs O(V²) space, which is too much for a sparse graph of 10⁵ nodes.

## BFS — fewest steps

Breadth-first search explores in rings of distance 1, 2, 3 … so in an unweighted graph the first
time it reaches a node is by a shortest path.

    int[] bfs(List<List<Integer>> adj, int src) {
        int[] dist = new int[adj.size()];
        Arrays.fill(dist, -1);
        Deque<Integer> q = new ArrayDeque<>();
        dist[src] = 0;
        q.offer(src);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {          // mark when ENQUEUED, not when polled
                    dist[v] = dist[u] + 1;
                    q.offer(v);
                }
            }
        }
        return dist;
    }

Marking a node as seen at the moment it is queued matters: mark it only when polled, and a node
with many neighbours already in the queue is queued many times.

## DFS — reach everything, find components

Depth-first search goes as deep as it can, then backs up. It is the natural tool for "how many
separate pieces", "is there a path" and cycle detection.

## Classic problem: number of islands (LeetCode 200)

A grid of '1' (land) and '0' (water); count connected groups of land, joined up, down, left, right.

    int numIslands(char[][] grid) {
        int count = 0;
        for (int r = 0; r < grid.length; r++)
            for (int c = 0; c < grid[0].length; c++)
                if (grid[r][c] == '1') { count++; sink(grid, r, c); }
        return count;
    }

    void sink(char[][] g, int r, int c) {
        if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
        g[r][c] = '0';                      // visited: sink it so it is not counted again
        sink(g, r + 1, c); sink(g, r - 1, c);
        sink(g, r, c + 1); sink(g, r, c - 1);
    }

Each new '1' found by the scan starts a new island; the DFS sinks the whole island so the scan
never counts it twice. The bounds check comes **before** \`g[r][c]\` is read.

**Cost.** Every cell is visited a constant number of times: O(R·C) time. The recursion can go
R·C deep on a grid that is all land, so O(R·C) stack — on a 1000×1000 grid that overflows; switch
to BFS with a queue of \`int[]{r, c}\`.

## Edge cases

- An empty grid (\`grid.length == 0\`) — guard before reading \`grid[0]\`.
- Sinking modifies the input. If the caller needs it intact, use a separate \`boolean[][] seen\`.
- Diagonal cells are not neighbours unless the problem says so.`,
    workedExample: `**Goal: detect a cycle in an undirected graph with DFS.**

In an undirected graph every edge appears twice in the adjacency list, so "I reached a visited
node" is not by itself a cycle — the node you just came from is always visited. Pass the parent:

    boolean hasCycle(int u, int parent, List<List<Integer>> adj, boolean[] seen) {
        seen[u] = true;
        for (int v : adj.get(u)) {
            if (!seen[v]) { if (hasCycle(v, u, adj, seen)) return true; }
            else if (v != parent) return true;
        }
        return false;
    }

Edges 0-1, 1-2, 2-0: from 0 go to 1 (parent 0), to 2 (parent 1); 2's neighbour 0 is seen and is
not 2's parent → cycle. Call it from every unseen node so a disconnected graph is fully checked.`,
    mcqs: [
      mcq('In Java BFS, why set dist[v] when v is offered to the queue rather than when it is polled?',
        [['Otherwise the same node can be queued several times', true],
          ['ArrayDeque.poll() erases the dist array entry for v', false],
          ['Polling a node that is not marked throws an exception', false],
          ['It makes BFS visit nodes in depth-first order instead', false]],
        'Between being queued and polled, v can be found again from other neighbours. Marking at enqueue time guarantees each node enters the queue once.'),
      mcq('A graph has 100,000 nodes and 200,000 edges. Why is List<List<Integer>> preferred over boolean[n][n]?',
        [['The matrix needs 10^10 cells; the lists hold only the edges', true],
          ['A boolean matrix cannot represent an undirected edge at all', false],
          ['Lists answer "is u joined to v?" in O(1), the matrix cannot', false],
          ['ArrayList is a primitive array, so it uses less memory', false]],
        'A matrix is O(V²) — ten billion booleans here. An adjacency list is O(V + E), a few hundred thousand entries.'),
      mcq('In numIslands, why does sink() test the bounds before reading g[r][c]?',
        [['Reading out of range would throw ArrayIndexOutOfBoundsException', true],
          ['Checking the cell first would count water cells as part of an island', false],
          ['The order of the conditions has no effect on the result', false],
          ['It is faster, but either order gives the same behaviour', false]],
        'Java\'s || short-circuits: when r or c is out of range, the later g[r][c] is never evaluated. Put it first and the out-of-range read throws.'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'Which problem needs BFS rather than DFS to be answered directly?',
        [['Fewest moves from a start cell to an exit in a maze', true],
          ['Counting the connected components of a graph', false],
          ['Checking whether any path joins two given nodes', false],
          ['Visiting every cell of one island in order to sink it', false]],
        'BFS reaches nodes in order of distance, so its first arrival is a shortest path. The other three only need reachability, which DFS gives as well.'),
      ck('DSA_GRAPHS', 'numIslands on a 1,000 × 1,000 grid of all \'1\' crashes with recursive sink(). What fixes it?',
        [['Use BFS with an ArrayDeque of int[] cells', true],
          ['Check diagonal neighbours as well as the four', false],
          ['Mark the cell \'0\' after the recursive calls', false],
          ['Copy the grid into an int[][] before the scan', false]],
        'All-land recursion goes up to a million frames deep and overflows the stack. An explicit queue moves that state onto the heap.'),
      ck('DSA_GRAPHS', 'An undirected cycle check reports a cycle on the single edge 0-1. What is missing?',
        [['Ignoring the parent node it just came from', true],
          ['A second boolean array for the recursion stack', false],
          ['Sorting each adjacency list before the DFS', false],
          ['Calling the DFS from every node, not only 0', false]],
        'The edge 0-1 is stored both ways, so from 1 the visited node 0 appears. It is the parent, not a cycle; skip it (once) and the false alarm disappears.'),
    ],
  },

  /* ══ Shortest paths and topological sort ════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_SHORTEST_PATH',
    notes: `BFS finds shortest paths when every edge costs the same. Once edges carry **weights** —
minutes, rupees, kilometres — the path with fewest edges is no longer the cheapest, and you need
**Dijkstra's algorithm**.

## Dijkstra with a PriorityQueue

Keep \`dist[]\`, the best cost found so far to each node. Repeatedly take the unsettled node with
the smallest \`dist\` and relax its edges. "Smallest" is what a min-heap is for.

    long[] dijkstra(List<List<int[]>> adj, int src) {      // adj.get(u) holds {v, weight}
        long[] dist = new long[adj.size()];
        Arrays.fill(dist, Long.MAX_VALUE);
        dist[src] = 0;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[1], b[1]));
        pq.offer(new long[]{src, 0});
        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            int u = (int) cur[0];
            if (cur[1] > dist[u]) continue;               // stale entry: skip it
            for (int[] e : adj.get(u)) {
                int v = e[0];
                long nd = dist[u] + e[1];
                if (nd < dist[v]) {
                    dist[v] = nd;
                    pq.offer(new long[]{v, nd});
                }
            }
        }
        return dist;
    }

Java's PriorityQueue has no "decrease key", so when a node's distance improves you simply offer a
new entry. The old one is still in the heap; when it surfaces, \`cur[1] > dist[u]\` tells you it is
**stale**, and you skip it. Without that line the algorithm is still correct but re-relaxes edges
from out-of-date distances and can get much slower.

**Cost.** O((V + E) log E) time, O(V + E) space. Distances are \`long\` because a sum of many
\`int\` weights can overflow.

**Edge cases.** Unreachable nodes keep \`Long.MAX_VALUE\` — print them as -1 or "unreachable", and
never add a weight to MAX_VALUE. Dijkstra is **wrong with negative edge weights**: a settled node
might later be reached more cheaply. Use Bellman-Ford there.

## Classic problem: course schedule (LeetCode 207 / 210)

\`numCourses\` courses and pairs \`[a, b]\` meaning "take b before a". Can every course be finished,
and in what order? That is a **topological sort** of a directed graph, possible exactly when the
graph has no cycle. Kahn's algorithm:

    int[] findOrder(int n, int[][] prereq) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n];
        for (int[] p : prereq) { adj.get(p[1]).add(p[0]); indeg[p[0]]++; }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
        int[] order = new int[n];
        int k = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            order[k++] = u;
            for (int v : adj.get(u)) if (--indeg[v] == 0) q.offer(v);
        }
        return k == n ? order : new int[0];               // fewer than n → a cycle
    }

A course enters the queue when all its prerequisites are done (in-degree 0). If a cycle exists,
the courses on it never reach 0, so fewer than n come out. O(V + E) time and space.`,
    workedExample: `**Goal: Dijkstra by hand on four nodes.**

Edges: 0→1 (4), 0→2 (1), 2→1 (2), 1→3 (5). Source 0.

Start dist = [0, ∞, ∞, ∞], heap {(0,0)}. Poll (0,0): relax 1 to 4 and 2 to 1; heap {(2,1), (1,4)}.
Poll (2,1): 1 via 2 costs 3 < 4, so dist[1] = 3, offer (1,3); heap {(1,3), (1,4)}. Poll (1,3):
relax 3 to 8. Heap {(1,4), (3,8)}. Poll (1,4): 4 > dist[1] = 3 — **stale, skip**. Poll (3,8):
nothing to relax. Final dist = [0, 3, 1, 8].

The stale (1,4) is exactly why the skip line exists: without it node 1's edges would be relaxed
again from a distance that is no longer true.`,
    mcqs: [
      mcq('In a Java Dijkstra, what does if (cur[1] > dist[u]) continue; do?',
        [['Skips an outdated heap entry for a node already improved', true],
          ['Stops the whole search once the target node has been polled', false],
          ['Rejects negative weights so the result stays correct', false],
          ['Prevents a node from ever being offered more than once', false]],
        'With no decrease-key, an improved node gets a second heap entry. The older, larger one is stale when it surfaces, and processing it would only waste work.'),
      mcq('Why are the distances in the Dijkstra above stored as long rather than int?',
        [['Summing many int weights along a path can overflow int', true],
          ['PriorityQueue accepts only long[] elements as its entries', false],
          ['Arrays.fill cannot set an int[] to Integer.MAX_VALUE', false],
          ['A long comparison is faster than an int comparison', false]],
        'A path of a few edges of weight near 10^9 already exceeds Integer.MAX_VALUE, and the overflowed sum would look small and win.'),
      mcq('Kahn\'s algorithm on 4 courses finishes with only 2 courses in the order. What does that mean?',
        [['The prerequisites contain a cycle, so no valid order exists', true],
          ['Two of the courses have no prerequisites and were skipped', false],
          ['The graph is disconnected and needs a second BFS pass to finish', false],
          ['The queue was a stack, so half the courses were dropped', false]],
        'Courses on a cycle each wait for another on the cycle, so their in-degree never reaches 0 and they never enter the queue.'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'A road graph has some edges with negative cost (rebates). Is Dijkstra safe to use?',
        [['No — a settled node could later be reached more cheaply', true],
          ['Yes — the PriorityQueue reorders negative entries first', false],
          ['Yes — as long as distances are stored in a long[]', false],
          ['No — Java\'s PriorityQueue rejects negative priorities', false]],
        'Dijkstra assumes that once the smallest distance is polled it is final. A negative edge breaks that; Bellman-Ford handles negative weights.'),
      ck('DSA_GRAPHS', 'In Kahn\'s algorithm, when is a course added to the queue?',
        [['When its in-degree drops to 0', true],
          ['When it is first read from the input', false],
          ['When all its dependants are finished', false],
          ['When its out-degree becomes the largest', false]],
        'In-degree counts unfinished prerequisites. At zero, everything it depends on is already in the order, so it can be taken now.'),
      ck('DSA_GRAPHS', 'Every edge in a graph costs exactly 1. What is the simplest correct shortest-path method?',
        [['Plain BFS with an ArrayDeque', true],
          ['Dijkstra with a max-heap', false],
          ['DFS that records the first path', false],
          ['A topological sort of the nodes', false]],
        'With equal weights, fewest edges means cheapest, and BFS finds fewest edges in O(V + E) without any heap. DFS\'s first path is not necessarily the shortest.'),
    ],
  },

  /* ══ Greedy ═════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_GREEDY',
    notes: `A **greedy** algorithm makes the choice that looks best right now and never revisits it. It
is fast and short — usually a sort and one pass — and it is **often wrong**. The skill is not
writing greedy code; it is knowing when the greedy choice is safe.

## When greedy is safe

You need an argument of the form: "some optimal solution starts with my greedy choice". The usual
proof is an **exchange argument** — take any optimal answer, swap its first choice for the greedy
one, and show it is no worse. If you cannot make that argument, test a small counter-example
before you trust the code.

A famous failure: coins {1, 3, 4} and amount 6. Greedy takes the largest coin first: 4 + 1 + 1 =
three coins. The best is 3 + 3 = two coins. For Indian or US denominations greedy happens to work;
for arbitrary coins you need dynamic programming.

## Classic problem: merge intervals (LeetCode 56)

Given meeting times as \`[start, end]\`, merge every overlapping pair.

    int[][] merge(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] iv : intervals) {
            if (out.isEmpty() || out.get(out.size() - 1)[1] < iv[0]) {
                out.add(iv);                                   // no overlap: start a new block
            } else {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], iv[1]);            // overlap: extend
            }
        }
        return out.toArray(new int[0][]);
    }

Sorting by start means any interval that overlaps the current block must come next; nothing
later can reach back. Note \`Math.max\`: [1, 10] followed by [2, 3] must stay [1, 10], not shrink
to [1, 3].

**Cost.** O(n log n) for the sort, O(n) for the pass, O(n) for the output.
**Edge cases.** Touching intervals [1, 4] and [4, 5] — the \`<\` above merges them; confirm whether
the problem wants that. One interval, or none, returns as is.

## Classic problem: activity selection / non-overlapping intervals (LeetCode 435)

Pick the most meetings that do not overlap. Sort by **end** time and keep each meeting that starts
after the last kept one ends:

    int maxMeetings(int[][] m) {
        Arrays.sort(m, (a, b) -> Integer.compare(a[1], b[1]));
        int count = 0, end = Integer.MIN_VALUE;
        for (int[] x : m) if (x[0] >= end) { count++; end = x[1]; }
        return count;
    }

Why end time? The meeting that finishes first leaves the most room for the rest — swap it into any
optimal schedule and nothing breaks. Sorting by start (a long early meeting blocks everything) or
by length (a short meeting can straddle two others) both have counter-examples.

LeetCode 435 asks for the fewest removals to leave no overlap: that is \`n - maxMeetings\`.`,
    workedExample: `**Goal: jump game (LeetCode 55) — can you reach the last index?**

\`nums[i]\` is the furthest jump from i. Track the furthest index reachable so far:

    boolean canJump(int[] nums) {
        int reach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > reach) return false;          // stuck before i
            reach = Math.max(reach, i + nums[i]);
        }
        return true;
    }

[2, 3, 1, 1, 4]: reach goes 2, 4, 4, 4, 8 → true. [3, 2, 1, 0, 4]: reach is 3 at i = 0, 1, 2, 3,
then i = 4 > 3 → false. The greedy is safe because "furthest reachable" summarises every jump
sequence: any index below it is reachable, so no choice is ever lost. O(n) time, O(1) space.`,
    mcqs: [
      mcq('With coins {1, 3, 4} and amount 6, what does "always take the largest coin" return?',
        [['3 coins (4 + 1 + 1), while 2 coins (3 + 3) is possible', true],
          ['2 coins (3 + 3), which is also the optimal answer', false],
          ['2 coins (4 + 2), because the 2 is built from two of the 1 coins', false],
          ['It cannot make 6 at all with that set of coins', false]],
        'Greedy commits to 4 and then needs two 1s. Choosing 3 twice is better, which shows the greedy choice is not safe for this coin set.'),
      mcq('In merge intervals, why is last[1] = Math.max(last[1], iv[1]) used instead of last[1] = iv[1]?',
        [['An interval may sit wholly inside the block, like [2,3] in [1,10]', true],
          ['Arrays.sort leaves the end times in descending order', false],
          ['Math.max avoids integer overflow on large end values', false],
          ['It merges touching intervals that would otherwise stay apart in the output', false]],
        'Sorting is by start only, so a later interval can end earlier than the current block. Plain assignment would shrink [1,10] to [1,3].'),
      mcq('To fit the most non-overlapping meetings in one room, sort by what?',
        [['Ending time, ascending', true],
          ['Starting time, ascending', false],
          ['Duration, shortest first', false],
          ['Ending time, descending', false]],
        'The earliest-finishing meeting leaves the most time for the rest; an exchange argument shows it can always replace an optimal schedule\'s first meeting.'),
    ],
    checkpoint: [
      ck('DSA_GREEDY', 'How do you justify that a greedy choice is safe before coding it?',
        [['Show an optimal answer can be swapped to start with it', true],
          ['Show it is faster than every dynamic-programming method', false],
          ['Show that it works on the examples given in the problem', false],
          ['Show that the input is sorted before the choice is made', false]],
        'The exchange argument proves some optimal solution agrees with the greedy choice. Passing the given examples proves nothing — the coin example passes many.'),
      ck('DSA_GREEDY', 'Meetings [1,4], [2,3], [3,5] sorted by end time; how many does the activity-selection loop keep?',
        [['2 — it keeps [2,3] then [3,5]', true],
          ['1 — only [1,4] fits on its own', false],
          ['3 — none of them truly overlap', false],
          ['2 — it keeps [1,4] then [3,5]', false]],
        'Sorted by end: [2,3], [1,4], [3,5]. Keep [2,3] (end 3); [1,4] starts at 1 < 3, skip; [3,5] starts at 3 ≥ 3, keep. Two meetings.'),
      ck('DSA_GREEDY', 'Arrays.sort(intervals, ...) on int[][] intervals sorts with what cost?',
        [['O(n log n), as it compares the rows', true],
          ['O(n), since each row has two values', false],
          ['O(n²), because it is a 2D array', false],
          ['O(log n), it sorts the references', false]],
        'An int[][] is an array of int[] objects; Arrays.sort with a comparator is a merge sort (TimSort) over the n rows, O(n log n) comparisons.'),
    ],
  },

  /* ══ Dynamic programming ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_DYNAMIC_PROGRAMMING',
    notes: `**Dynamic programming** solves a problem by combining answers to smaller versions of the same
problem, computing each smaller answer **once**. It applies when the problem has *overlapping
subproblems* (the same smaller question recurs) and *optimal substructure* (the best answer is
built from best answers to smaller ones).

Every DP solution is four decisions: **what dp[i] means**, the **recurrence**, the **base case**,
and the **order** of filling.

## Top-down and bottom-up: climbing stairs (LeetCode 70)

You can climb 1 or 2 steps. Ways to reach step n = ways(n-1) + ways(n-2). Plain recursion
recomputes the same steps exponentially often. **Memoise** it:

    int climb(int n, Integer[] memo) {
        if (n <= 1) return 1;
        if (memo[n] != null) return memo[n];
        return memo[n] = climb(n - 1, memo) + climb(n - 2, memo);
    }

or fill a table **bottom-up**, which uses no recursion:

    int climb(int n) {
        int a = 1, b = 1;                // ways(0), ways(1)
        for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; }
        return b;
    }

\`Integer[]\` with \`null\` for "not computed" avoids confusing a stored 0 with a missing value.

## Classic problem: coin change (LeetCode 322)

Fewest coins to make \`amount\`, or -1. Greedy fails here (coins {1, 3, 4}, amount 6), so:
\`dp[a]\` = fewest coins summing to a.

    int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];              // indexes 0..amount
        Arrays.fill(dp, amount + 1);                 // "infinity": more than any real answer
        dp[0] = 0;
        for (int a = 1; a <= amount; a++)
            for (int c : coins)
                if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
        return dp[amount] > amount ? -1 : dp[amount];
    }

The array is \`amount + 1\` long because the answer lives at index \`amount\`. "Infinity" is
\`amount + 1\`, not \`Integer.MAX_VALUE\`, because \`MAX_VALUE + 1\` overflows to a negative number and
would win every \`min\`.

**Cost.** O(amount × coins) time, O(amount) space. **Edge cases:** amount 0 → 0 coins; no
combination → -1.

## Classic 2D problem: longest common subsequence (LeetCode 1143)

\`dp[i][j]\` = LCS length of the first i characters of s and the first j of t.

    int lcs(String s, String t) {
        int m = s.length(), n = t.length();
        int[][] dp = new int[m + 1][n + 1];          // row 0 and column 0 are empty prefixes
        for (int i = 1; i <= m; i++)
            for (int j = 1; j <= n; j++)
                dp[i][j] = s.charAt(i - 1) == t.charAt(j - 1)
                        ? dp[i - 1][j - 1] + 1
                        : Math.max(dp[i - 1][j], dp[i][j - 1]);
        return dp[m][n];
    }

The extra row and column hold the empty-prefix base case (LCS 0), which is why the characters are
read at \`i - 1\` and \`j - 1\`. O(m·n) time and space; since each row needs only the previous one,
space can drop to O(n).`,
    workedExample: `**Goal: coin change by hand — coins {1, 3, 4}, amount 6.**

dp[0] = 0. dp[1] = dp[0]+1 = 1. dp[2] = dp[1]+1 = 2. dp[3] = min(dp[2]+1, dp[0]+1) = 1.
dp[4] = min(dp[3]+1, dp[1]+1, dp[0]+1) = 1. dp[5] = min(dp[4]+1, dp[2]+1, dp[1]+1) = 2.
dp[6] = min(dp[5]+1, dp[3]+1, dp[2]+1) = min(3, 2, 3) = 2.

Answer 2 (3 + 3) — the value greedy missed. Every dp[a] considered every coin as the *last*
coin, which is what makes it exhaustive without being exponential.`,
    mcqs: [
      mcq('Why does a Java memo for climbing stairs use Integer[] rather than int[]?',
        [['null can mark "not computed", distinct from a stored value', true],
          ['int[] cannot be passed as a parameter to a recursive method', false],
          ['Integer arithmetic cannot overflow, unlike int arithmetic', false],
          ['An int[] is copied on every call, while Integer[] is shared', false]],
        'A new int[] is all zeros, so 0 would be ambiguous between "computed as 0" and "never computed". Integer[] starts as nulls.'),
      mcq('In coinChange, why fill dp with amount + 1 rather than Integer.MAX_VALUE?',
        [['dp[a - c] + 1 on MAX_VALUE overflows to a negative number', true],
          ['Arrays.fill rejects Integer.MAX_VALUE as a fill value', false],
          ['amount + 1 makes the inner loop exit early after only one coin', false],
          ['MAX_VALUE would make dp[0] unreachable from dp[1]', false]],
        'Integer.MAX_VALUE + 1 wraps to Integer.MIN_VALUE, which then wins every Math.min. amount + 1 is larger than any real answer and safe to add 1 to.'),
      mcq('In the LCS table, why is dp declared new int[m + 1][n + 1]?',
        [['Row 0 and column 0 hold the empty-prefix base case', true],
          ['Java arrays are 1-indexed, so index 0 is never used', false],
          ['The extra cell stores the length of the final answer', false],
          ['It leaves room for the strings\' null terminators', false]],
        'dp[0][j] and dp[i][0] are LCS with an empty prefix, which is 0. They let the recurrence read dp[i-1][j-1] without a special case.'),
    ],
    checkpoint: [
      ck('DSA_DP', 'Which two properties tell you dynamic programming fits a problem?',
        [['Overlapping subproblems and optimal substructure', true],
          ['A sorted input and a greedy-choice property', false],
          ['A tree-shaped input and a recursive definition of it', false],
          ['An acyclic graph and non-negative edge weights', false]],
        'Overlap is what makes caching pay; optimal substructure is what makes combining smaller best answers correct. Sorting and greedy choice describe greedy algorithms.'),
      ck('DSA_DP', 'For s = "ACE" and t = "ABCDE", what does lcs(s, t) return?',
        [['3', true],
          ['2', false],
          ['5', false],
          ['1', false]],
        'A, C and E all appear in t in the same order, so the whole of "ACE" is a common subsequence: length 3.'),
      ck('DSA_DP', 'An LCS solution only ever reads row i - 1 while filling row i. What can be saved?',
        [['Space: two 1D rows instead of the full 2D table', true],
          ['Time: the inner loop can stop at the first match', false],
          ['Time: the table can be filled in O(m + n) steps', false],
          ['Nothing — every cell is needed to read dp[m][n]', false]],
        'Only the previous row is needed, so keeping two arrays of n + 1 drops space from O(m·n) to O(n). The time stays O(m·n).'),
    ],
  },

  /* ══ Debugging ══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_DEBUGGING',
    notes: `Tree, graph and DP bugs rarely crash on the example in the problem. They pass the sample and
fail the hidden test — a null child, a deep tree, a node reached twice, an index one past the end.
Each case below is code that compiles and looks reasonable. Read it, find the one line at fault,
and say why the sample did not catch it.

## 1. Recursion with no null check

    int sumLeaves(TreeNode n) {
        if (n.left == null && n.right == null) return n.val;
        return sumLeaves(n.left) + sumLeaves(n.right);
    }

A node with exactly one child calls itself on the missing one, and \`n.left\` on null throws
**NullPointerException**. The sample tree was full (every node had 0 or 2 children). **Fix:** start
with \`if (n == null) return 0;\`.

## 2. BST validation that compares only with the parent

    boolean ok(TreeNode n) {
        if (n == null) return true;
        if (n.left != null && n.left.val >= n.val) return false;
        if (n.right != null && n.right.val <= n.val) return false;
        return ok(n.left) && ok(n.right);
    }

Accepts 5 (1, 6 (3, 7)), where 3 is in 5's right subtree. **Fix:** pass \`low\` and \`high\` bounds
down from the ancestors (as \`long\`).

## 3. PriorityQueue comparator reversed

    // keep the k largest: should evict the smallest
    PriorityQueue<Integer> heap = new PriorityQueue<>((a, b) -> b - a);
    for (int x : nums) { heap.offer(x); if (heap.size() > k) heap.poll(); }
    return heap.peek();

\`(a, b) -> b - a\` is a **max**-heap, so \`poll()\` evicts the largest, and the code returns the kth
*smallest*. **Fix:** \`new PriorityQueue<>()\` — and never \`b - a\` anyway; it overflows.

## 4. BFS marks visited too late

    while (!q.isEmpty()) {
        int u = q.poll();
        if (seen[u]) continue;
        seen[u] = true;
        for (int v : adj.get(u)) if (!seen[v]) q.offer(v);
    }

Correct output, but in a dense graph a node is queued once per neighbour that sees it before it
is polled — O(E) queue entries instead of O(V), and if the loop also counts or records distance on
offer, duplicates appear. **Fix:** set \`seen[v] = true\` at the moment you \`offer(v)\`.

## 5. Dijkstra that never skips stale entries

    long[] cur = pq.poll();
    int u = (int) cur[0];
    for (int[] e : adj.get(u)) { ... relax ... }

Results stay correct, but every outdated entry re-relaxes all of u's edges, and on a graph built
to cause many improvements the run time blows up. **Fix:** \`if (cur[1] > dist[u]) continue;\`.

## 6. DP array off by one

    int[] dp = new int[amount];
    ...
    return dp[amount];

The answer lives at index \`amount\`, which does not exist: **ArrayIndexOutOfBoundsException**.
**Fix:** \`new int[amount + 1]\`.

## 7. A greedy that is not safe

    // fewest coins: always take the biggest that fits
    Arrays.sort(coins);
    for (int i = coins.length - 1; i >= 0; i--) while (amount >= coins[i]) { amount -= coins[i]; count++; }

Right for {1, 2, 5}, wrong for {1, 3, 4} and 6 (3 coins instead of 2), and it returns a count even
when the amount cannot be made exactly. **Fix:** the DP in the previous lesson.

## How to find these

Write the input the sample does not cover: a single node, a node with one child, an empty grid,
a cycle, a node reachable two ways, amount 0, an amount that cannot be made. Most of these bugs
show themselves on the first such case.`,
    mcqs: [
      mcq('countNodes(TreeNode n) { return 1 + countNodes(n.left) + countNodes(n.right); } — what happens on any tree?',
        [['NullPointerException once a leaf\'s null child is reached', true],
          ['It returns the height of the tree instead of the count', false],
          ['It counts each node twice, once from each child call', false],
          ['It returns 0, because the recursion never adds a node to the count', false]],
        'There is no base case, so the recursion reaches a leaf\'s null child and evaluates n.left on null. Add if (n == null) return 0;'),
      mcq('A kth-largest solution uses new PriorityQueue<>((a, b) -> b - a) and polls when size exceeds k. What does it return?',
        [['The kth smallest value, as poll() drops the largest each time', true],
          ['The kth largest value — the comparator does not matter here', false],
          ['The overall maximum, because the heap root is always the largest', false],
          ['It throws ClassCastException because of the lambda type', false]],
        'b - a makes a max-heap, so each poll evicts the biggest remaining value. What survives is the k smallest, and peek() gives the largest of those — the kth smallest.'),
      mcq('A coin-change method declares int[] dp = new int[amount] and returns dp[amount]. What happens?',
        [['ArrayIndexOutOfBoundsException on the return line', true],
          ['It returns 0, the default for an int array slot', false],
          ['It returns the answer for amount - 1, one too few', false],
          ['It compiles with an error about the array length', false]],
        'An array of length amount has indexes 0 to amount - 1. Reading index amount is out of bounds at run time; the size must be amount + 1.'),
      mcq('BFS sets seen[u] = true only when u is polled. On a dense graph, what goes wrong?',
        [['Nodes are queued many times, inflating the queue to O(E)', true],
          ['BFS stops before reaching nodes more than one hop away', false],
          ['Distances come out longer than the true shortest path in hops', false],
          ['The loop never ends because seen is never set to true', false]],
        'Until u is polled, every neighbour that finds it offers it again. Marking at enqueue time keeps each node in the queue once.'),
    ],
  },

  /* ══ Practice ═══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_PRACTICE',
    notes: `No new ideas — repetition until the patterns come without thinking. Write each one in a
plain editor, without autocomplete, then run it on the edge cases listed.

## Exercises

1. **Maximum depth of a binary tree.** Recursive, then iterative with level-order BFS. Test an empty
   tree (0) and a left-only chain.
2. **Lowest value at each level.** Level-order traversal returning \`List<Integer>\`, one minimum per
   level. Test a single node and a tree with negative values.
3. **Kth smallest in a stream.** A class with \`add(int x)\` that returns the kth smallest value seen so
   far, using one PriorityQueue. Which heap — min or max — and why?
4. **Rotting oranges (LeetCode 994).** Multi-source BFS on a grid: start the queue with every rotten
   orange at once. Return the minutes until none are fresh, or -1. Test a grid with no fresh oranges (0).
5. **Minimum arrows to burst balloons (LeetCode 452).** Greedy by end coordinate. Use
   \`Integer.compare\` — the coordinates go up to 2³¹ - 1 and subtraction overflows.
6. **Shortest delivery routes.** The graded exercise below: Dijkstra from one depot to every
   location.

## The graded exercise

The assignment runs your Java against hidden tests. It reads a weighted, undirected graph and
prints the cheapest cost from a source to every node, or -1 where no route exists. Read it with a
fast reader (\`BufferedReader\` or \`StreamTokenizer\`), keep distances in \`long\`, and skip stale
heap entries.`,
    mcqs: [
      mcq('For rotting oranges, why is every rotten orange put in the queue before the BFS starts?',
        [['They all spread at once, so all are sources at minute 0', true],
          ['ArrayDeque must be non-empty before poll() is first called', false],
          ['It lets the BFS skip the fresh oranges entirely', false],
          ['It turns the BFS into a DFS, which is faster here', false]],
        'Rot spreads from every rotten orange simultaneously. A multi-source BFS gives each fresh orange its distance to the nearest rotten one.'),
      mcq('To keep the kth smallest of a stream, which PriorityQueue do you hold, and of what size?',
        [['A max-heap of size k; its root is the kth smallest', true],
          ['A min-heap of size k; its root is the kth smallest', false],
          ['A min-heap of every value; poll k times per query', false],
          ['A max-heap of every value; peek once per query', false]],
        'To keep the k smallest you must evict the largest of them, which a max-heap does in O(log k). Its root is then the kth smallest.'),
      mcq('Balloons span [-2147483646, -2147483645] and [2147483646, 2147483647]. Why does (a, b) -> a[1] - b[1] fail to sort them?',
        [['The subtraction overflows and returns the wrong sign', true],
          ['Lambdas cannot compare elements of an int[][] array', false],
          ['Arrays.sort needs a Comparator<Integer>, not int[]', false],
          ['Negative coordinates make Arrays.sort throw an error', false]],
        'The difference of the two ends is about -4.29 billion, outside int, so it wraps to a positive number and the order is reversed. Integer.compare never overflows.'),
      mcq('maxDepth on an empty tree (root == null) should return what?',
        [['0', true],
          ['1', false],
          ['-1', false],
          ['null', false]],
        'An empty tree has no nodes and therefore no levels, so its depth is 0. That is also the base case the recursion builds on.'),
      mcq('The delivery exercise asks for -1 where no route exists. In Dijkstra, how do you recognise such a node?',
        [['Its dist entry is still the initial Long.MAX_VALUE', true],
          ['Its dist entry is 0, as it was never relaxed', false],
          ['It is the last node polled from the queue', false],
          ['Its adjacency list is empty once the run has finished completely', false]],
        'An unreachable node is never relaxed, so it keeps its initial "infinite" value. A node with no edges may still be the source, at distance 0.'),
    ],
    assignment: {
      title: 'Shortest Delivery Routes',
      description: 'Read a weighted road network and print the cheapest cost from one depot to every location, using Dijkstra\'s algorithm with a PriorityQueue.',
      instructions: `A delivery company has \`n\` locations numbered 0 to n-1 and \`m\` two-way roads. Each road has
a cost. Print the cheapest total cost to reach every location from the depot \`s\`.

**Input** (standard input)

- The first line holds three integers: \`n m s\`.
- Each of the next \`m\` lines holds three integers \`u v w\`: a two-way road between u and v costing
  w (0 ≤ w ≤ 1,000,000,000).
- There may be more than one road between the same two locations, and a road may join a location
  to itself.

**Output**

One line: \`n\` integers separated by single spaces — the cheapest cost from \`s\` to location 0, 1,
… n-1. Print \`-1\` for a location no road reaches. The cost to \`s\` itself is \`0\`.

**Example**

Input:

    4 4 0
    0 1 4
    0 2 1
    2 1 2
    1 3 5

Output:

    0 3 1 8

Location 1 is cheaper through 2 (1 + 2 = 3) than directly (4).

**Rules**

- Use Dijkstra with a \`PriorityQueue\`; a cost can exceed the range of \`int\`, so keep costs in \`long\`.
- Skip a heap entry whose cost is larger than the best already known for its node.
- Up to 100,000 locations and 200,000 roads: read input with \`BufferedReader\` or
  \`StreamTokenizer\`, not \`Scanner\`.

**How it is graded**

Your program is run against every test — the example and several you cannot see, including
unreachable locations, parallel roads and very large costs. Output is compared line by line; extra
spaces at the ends do not matter. A reviewer grading by hand uses the rubric.`,
      rubric: [
        { criterion: 'Correct distances', description: 'Every cost is right on every test, including unreachable locations (-1), parallel roads, self-loops and costs above the int range.', maxPoints: 60 },
        { criterion: 'Dijkstra done properly', description: 'Uses an adjacency list and a PriorityQueue ordered by cost, relaxes only on improvement, and skips stale entries.', maxPoints: 30 },
        { criterion: 'Readable and efficient input', description: 'Fast input reading, clear names for dist and the adjacency list, no needless copying.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer first = new StringTokenizer(in.readLine());
        int n = Integer.parseInt(first.nextToken());
        int m = Integer.parseInt(first.nextToken());
        int s = Integer.parseInt(first.nextToken());

        // TODO: read the m roads "u v w" into an adjacency list (roads go both ways)
        // TODO: run Dijkstra from s with a PriorityQueue, keeping costs in long
        // TODO: print the n costs on one line, separated by spaces, -1 where unreachable
    }
}
`,
        tests: [
          { input: '4 4 0\n0 1 4\n0 2 1\n2 1 2\n1 3 5\n', expectedOutput: '0 3 1 8' },
          { input: '3 1 0\n0 1 7\n', expectedOutput: '0 7 -1' },
          { input: '1 0 0\n', expectedOutput: '0' },
          { input: '5 6 2\n0 1 2\n1 2 9\n2 3 1\n3 1 3\n3 4 6\n0 4 1\n', expectedOutput: '6 4 0 1 7', isHidden: true },
          { input: '4 3 0\n0 1 1000000000\n1 2 1000000000\n2 3 1000000000\n', expectedOutput: '0 1000000000 2000000000 3000000000', isHidden: true },
          { input: '4 5 3\n3 2 8\n3 2 5\n2 2 4\n2 0 1\n0 3 9\n', expectedOutput: '6 -1 5 0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ══ Interview question ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_INTERVIEW_QUESTION',
    notes: `Three problems that come up again and again in Java interviews. For each: how to talk it
through, a model solution, its cost, and the follow-up you will get if you answer well. Say the
approach and its complexity **before** you write code — an interviewer would rather correct a plan
than a half-written method.

## 1. Lowest common ancestor of a binary tree (LeetCode 236)

**Talking it through.** "The LCA of p and q is the deepest node with p in one subtree and q in the
other — or p itself if q is below p. I will recurse: each call returns p or q if it finds one,
otherwise null. A node that gets non-null from both sides is the answer."

    TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
        if (root == null || root == p || root == q) return root;
        TreeNode left = lca(root.left, p, q);
        TreeNode right = lca(root.right, p, q);
        if (left != null && right != null) return root;   // split here
        return left != null ? left : right;
    }

**Cost.** O(n) time, O(h) stack.
**Follow-up.** "What if it is a BST?" — then no full search is needed: if both values are smaller
than the node, go left; both larger, go right; otherwise this node is the split. O(h), and O(1)
space iteratively. Another follow-up: "what if p or q might not be in the tree?" — the version
above would wrongly return the one it found; count how many were actually found.

## 2. Top k frequent elements (LeetCode 347)

**Talking it through.** "Count with a HashMap, then keep a min-heap of size k ordered by count. The
heap evicts the least frequent, so it ends holding the k most frequent."

    int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        PriorityQueue<Integer> heap = new PriorityQueue<>((a, b) -> Integer.compare(count.get(a), count.get(b)));
        for (int x : count.keySet()) { heap.offer(x); if (heap.size() > k) heap.poll(); }
        int[] out = new int[k];
        for (int i = k - 1; i >= 0; i--) out[i] = heap.poll();
        return out;
    }

**Cost.** O(n + u log k) for u distinct values; O(u) space.
**Follow-up.** "Can you beat n log k?" — **bucket sort**: a list per frequency 0..n, then read
buckets from high to low until k are collected. O(n) time.

## 3. Course schedule — detect a cycle in a directed graph (LeetCode 207)

**Talking it through.** "Courses are nodes, prerequisites are edges. All courses can be finished
exactly when the graph has no cycle. Kahn's algorithm: repeatedly take courses with no remaining
prerequisites; if I process all n, there is no cycle." Alternatively, DFS with **three colours**:
0 unvisited, 1 on the current path, 2 finished — reaching a 1 again is a back edge, a cycle.

    boolean dfs(int u, List<List<Integer>> adj, int[] color) {
        color[u] = 1;
        for (int v : adj.get(u)) {
            if (color[v] == 1) return true;                       // back edge
            if (color[v] == 0 && dfs(v, adj, color)) return true;
        }
        color[u] = 2;
        return false;
    }

**Cost.** O(V + E) either way.
**Follow-up.** "Why not one visited boolean, as in an undirected graph?" — because in a directed
graph reaching a *finished* node (two paths into it, a diamond) is not a cycle; only reaching a node
still on the current path is. And: "return an order, not just yes/no" — Kahn's output order is it.

## Also worth rehearsing

**Longest increasing subsequence (LeetCode 300).** O(n²) DP (\`dp[i]\` = LIS ending at i), then the
follow-up: O(n log n) with a \`tails\` array and binary search.`,
    mcqs: [
      mcq('In the recursive LCA, lca(root.left) and lca(root.right) both return non-null. What does that mean?',
        [['p and q are in different subtrees, so root is the LCA', true],
          ['p and q are the same node, found twice by the two recursive calls', false],
          ['The tree has a cycle that the recursion went around', false],
          ['root is p, so the search should stop immediately', false]],
        'Each side returns the target it found. One target on each side means root is the deepest node joining them.'),
      mcq('For top k frequent elements, which method avoids the log k factor entirely?',
        [['Bucket sort by frequency, read from the highest bucket', true],
          ['A max-heap holding every distinct value at once', false],
          ['Sorting the counts with Arrays.sort before reading', false],
          ['A TreeMap from each count to the list of values that have it', false]],
        'Frequencies lie between 1 and n, so an array of n + 1 buckets sorts them in O(n). The heaps, sorting and TreeMap all pay a log factor.'),
      mcq('Why does a directed-graph cycle check use three colours rather than one visited flag?',
        [['A finished node reached again by another path is not a cycle', true],
          ['A boolean array cannot be passed into a recursive method', false],
          ['Three colours let the DFS run in O(V) rather than O(V + E)', false],
          ['Directed graphs have three kinds of node: source, sink, inner', false]],
        'In a diamond a→b, a→c, b→d, c→d, d is reached twice with no cycle. Only meeting a node still on the current path (colour 1) proves a back edge.'),
    ],
  },

  /* ══ Checkpoint ═════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_DSA_NONLINEAR_CHECKPOINT',
    notes: `Ten questions across trees, heaps, graphs, greedy and dynamic programming. Most show a
short piece of Java and ask what it does or which line is wrong; trace it by hand before you
choose. Costs are worst case unless a question says otherwise.`,
    checkpoint: [
      ck('DSA_TREES', 'boolean same(TreeNode a, TreeNode b) { if (a == null || b == null) return a == b; return a.val == b.val && same(a.left, b.left) && same(a.right, b.right); } — what does it decide?',
        [['Whether the two trees have the same shape and values', true],
          ['Whether a and b are references to the same object', false],
          ['Whether the two trees hold the same values in any shape at all', false],
          ['Whether b is a subtree somewhere inside tree a', false]],
        'It compares the roots\' values and then the left and right subtrees pairwise, and two nulls are equal. That is structural equality — LeetCode 100.'),
      ck('DSA_TREES', 'You insert 50, 30, 70, 20, 40 into an empty BST. What does an inorder traversal print?',
        [['20 30 40 50 70', true],
          ['50 30 20 40 70', false],
          ['50 30 70 20 40', false],
          ['20 40 30 70 50', false]],
        'Inorder visits a BST in ascending order whatever the insertion order. The other three are preorder, level order and postorder.'),
      ck('DSA_HEAPS', 'A PriorityQueue<Integer> holds 8, 3, 5. After pq.poll(); pq.offer(1); what does pq.peek() return?',
        [['1', true],
          ['3', false],
          ['5', false],
          ['8', false]],
        'The default is a min-heap: poll removes 3, leaving 5 and 8. Offering 1 makes it the new minimum, so peek returns 1.'),
      ck('DSA_HEAPS', 'Merging k sorted lists of N total nodes with a PriorityQueue of list heads costs what?',
        [['O(N log k)', true],
          ['O(N log N)', false],
          ['O(N k)', false],
          ['O(k log N)', false]],
        'Each of the N nodes is polled and its successor offered once, on a heap that never holds more than k nodes, so each step is O(log k).'),
      ck('DSA_GRAPHS', 'BFS on a maze grid from the top-left cell gives dist 4 to the bottom-right. What does that 4 mean?',
        [['The fewest moves along open cells between the two', true],
          ['The number of open cells in the whole of the grid', false],
          ['The length of the first path that DFS would find', false],
          ['The number of separate islands between the cells', false]],
        'BFS assigns each cell its distance in rings, so the value at the target is the minimum number of moves from the start.'),
      ck('DSA_GRAPHS', 'A Dijkstra stores dist as int[] filled with Integer.MAX_VALUE and computes dist[u] + w for each edge. What can go wrong?',
        [['An unreachable u overflows to a negative cost and wins', true],
          ['PriorityQueue refuses to store the value MAX_VALUE', false],
          ['Every node ends up at distance MAX_VALUE after the run', false],
          ['It gives the right costs, only somewhat more slowly', false]],
        'MAX_VALUE + w wraps to a large negative number, which is smaller than any real cost. Skip unreachable nodes or use long with a safe infinity.'),
      ck('DSA_GRAPHS', 'Prerequisites are [[1,0],[2,1],[0,2]] for 3 courses. What does Kahn\'s findOrder return?',
        [['An empty array — the three courses form a cycle', true],
          ['[0, 1, 2], taking each course after the last', false],
          ['[2, 1, 0], the reverse of the listed order', false],
          ['[0] — only course 0 has no prerequisite of its own, so it alone runs', false]],
        '0 needs 2, 2 needs 1, 1 needs 0: every course has in-degree 1, nothing ever reaches 0, the queue starts empty and k stays 0 < 3.'),
      ck('DSA_GREEDY', 'Intervals [[1,3],[2,6],[8,10],[15,18]] go through merge intervals. What comes out?',
        [['[[1,6],[8,10],[15,18]]', true],
          ['[[1,3],[2,6],[8,10],[15,18]]', false],
          ['[[1,10],[15,18]]', false],
          ['[[1,18]]', false]],
        'After sorting by start, [1,3] and [2,6] overlap and merge to [1,6]; 8 > 6 and 15 > 10 start new blocks.'),
      ck('DSA_GREEDY', 'Why does the jump-game greedy that tracks the furthest reachable index never miss a valid route?',
        [['Every index up to that furthest point can itself be reached', true],
          ['It tries every jump length from each index in turn', false],
          ['It sorts the jump lengths before it starts to scan', false],
          ['It backtracks whenever it reaches a zero anywhere in the array', false]],
        'Reach only grows and every index below it is reachable, so the single number summarises all jump sequences. No choice is ever discarded.'),
      ck('DSA_DP', 'int[] dp = new int[n + 1]; dp[0] = 1; dp[1] = 1; for (int i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2]; — for n = 5, what is dp[5]?',
        [['8', true],
          ['5', false],
          ['13', false],
          ['6', false]],
        'The table runs 1, 1, 2, 3, 5, 8 for i = 0 to 5. It is climbing stairs: there are 8 ways to climb 5 steps taking 1 or 2 at a time.'),
    ],
  },
];
