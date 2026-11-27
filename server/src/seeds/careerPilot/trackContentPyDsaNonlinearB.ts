/**
 * Career-track content: DSA in Python, second half of JT_PY_DSA_NONLINEAR — shortest paths and
 * topological sort, greedy algorithms, dynamic programming, and the topic's ending units
 * (debugging, practice, the interview question and the checkpoint). Trees, BSTs, heaps and
 * graphs with BFS/DFS live in their own file; the ending units here cover the whole topic.
 *
 * Every lesson solves one named classic problem in complete Python, with Python's own tools —
 * heapq (a min-heap of tuples), collections.deque, defaultdict, bisect, sorted with a key, and
 * functools.cache — and says plainly where Python differs from Java: no decrease-key, no overflow,
 * a recursion limit of about 1000, and tuples that compare element by element.
 *
 * Every "what does this print" answer was run. The graded exercise was checked before it shipped:
 * a reference solution passed every test (the 50,000-node one in about a quarter of a second), and an
 * O(V²) Dijkstra was still running after 90 seconds on that test. The judge runs Python 3.10.
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

/*
 * The large hidden test for the graded exercise, built here rather than pasted as 1.1 MB of roads.
 * A chain 1 → 2 → … → n (so every node is reachable) plus `extra` random one-way shortcuts, from a
 * fixed Park–Miller generator so the input is the same on every run. For (50000, 25001, 20261106)
 * the answer is 9459.
 */
const bigNetwork = (n: number, extra: number, seed: number): string => {
  let x = seed;
  const next = (lo: number, hi: number) => { x = (x * 48271) % 2147483647; return lo + (x % (hi - lo + 1)); };
  const lines: string[] = [];
  for (let i = 1; i < n; i++) lines.push(`${i} ${i + 1} ${next(1, 9)}`);
  for (let j = 0; j < extra; j++) lines.push(`${next(1, n)} ${next(1, n)} ${next(1, 99999)}`);
  return `${n} ${lines.length} 1\n` + lines.join('\n') + '\n';
};

export const TRACK_PY_DSA_NONLINEAR_B_BUNDLES: PilotBundle[] = [
  /* ══ Shortest paths and topological sort ════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_SHORTEST_PATH',
    notes: `BFS gives shortest paths when every edge costs the same: fewest edges is cheapest. Put a
**weight** on each edge — minutes, rupees, kilometres — and that stops being true. A direct road
costing 10 loses to two roads costing 3 and 4. For non-negative weights the tool is **Dijkstra's
algorithm**.

## Dijkstra with heapq

Keep \`dist\`, the best cost found so far to each node. Repeatedly take the unsettled node with the
smallest \`dist\` and **relax** its edges: if going through it makes a neighbour cheaper, record the
new cost. "Take the smallest" is what a min-heap does, and Python's \`heapq\` is a min-heap over a
plain list.

    import heapq
    from math import inf

    def dijkstra(adj, src, n):
        """adj[u] is a list of (v, weight) pairs; nodes are 0 .. n-1."""
        dist = [inf] * n
        dist[src] = 0
        heap = [(0, src)]                     # (cost, node): cost first, so it orders the heap
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist[u]:                   # stale entry: u was improved after this was pushed
                continue
            for v, w in adj[u]:
                nd = d + w
                if nd < dist[v]:
                    dist[v] = nd
                    heapq.heappush(heap, (nd, v))
        return dist

Three Python details matter here:

- **Tuples compare element by element.** \`(2, 7) < (3, 0)\` because 2 < 3, so pushing
  \`(cost, node)\` orders the heap by cost. Push \`(node, cost)\` and it is ordered by node number —
  the code still runs and returns wrong answers.
- **heapq has no decrease-key.** When a node gets cheaper you push a second entry. The old,
  larger one is still in the heap; when it surfaces, \`d > dist[u]\` says it is **stale** and you
  skip it. Leave the line out and the answer is usually still right, but outdated entries
  re-relax edges and a hostile graph makes the run far slower.
- **Integers never overflow.** Java code keeps distances in \`long\` and fears
  \`Integer.MAX_VALUE + w\`. In Python \`inf + 5\` is still \`inf\` and an int grows as large as it
  needs, so a path of 100,000 roads each costing 10⁹ is simply 10¹⁴.

One trap that is pure Python: if the second element of the tuple is an object with no \`<\` (a
custom \`Node\`), two entries with the same cost make heapq compare the objects and raise
\`TypeError: '<' not supported\`. Push a node **number**, or add a counter as a tie-breaker:
\`(cost, next(counter), node)\`.

**Cost.** O((V + E) log V) time, O(V + E) space. An O(V²) version that scans every node for the
minimum is fine for V = 500 and hopeless for V = 100,000.

**Edge cases.** An unreachable node keeps \`inf\` — print it as -1 or "unreachable". Dijkstra is
**wrong with negative weights**: it treats a popped node as final, but a negative edge found later
could make it cheaper. Use Bellman-Ford there (relax every edge V - 1 times, O(V·E)).

**Getting the route, not just the cost.** Keep \`prev[v] = u\` whenever you improve \`dist[v]\`, then
walk \`prev\` back from the target and reverse the list.

## Classic problem: course schedule (LeetCode 207 / 210)

\`n\` courses and pairs \`(a, b)\` meaning "take b before a". Is there an order that finishes them all,
and what is it? That is a **topological sort** of a directed graph, and one exists exactly when the
graph has no cycle. **Kahn's algorithm** repeatedly takes a course with no unfinished
prerequisites:

    from collections import defaultdict, deque

    def find_order(n, pairs):
        after = defaultdict(list)             # b -> the courses that need b
        indeg = [0] * n                       # how many prerequisites each course still waits on
        for a, b in pairs:
            after[b].append(a)
            indeg[a] += 1
        ready = deque(i for i in range(n) if indeg[i] == 0)
        order = []
        while ready:
            u = ready.popleft()
            order.append(u)
            for v in after[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    ready.append(v)
        return order if len(order) == n else []   # fewer than n: a cycle blocked the rest

Courses on a cycle each wait for another on the cycle, so their in-degree never reaches 0 and they
never come out. O(V + E) time and space. Use \`deque.popleft()\`, not \`list.pop(0)\`, which shifts
the whole list and is O(n) per call.

The standard library has \`graphlib.TopologicalSorter\` (Python 3.9+), which raises \`CycleError\` on a
cycle — worth naming in an interview, but you will be asked to write Kahn's yourself.

The DFS alternative: run a DFS and record each node when it **finishes**; the reverse of that
finishing order is a topological order. A node met again while it is still on the current path
means a cycle.`,
    workedExample: `**Goal: Dijkstra by hand, and the stale entry it skips.**

Edges (one-way): 0→1 cost 6, 0→2 cost 2, 2→1 cost 3, 1→3 cost 1, 2→3 cost 7. Source 0; node 4 has
no edges at all.

- Start: dist = [0, inf, inf, inf, inf], heap [(0, 0)].
- Pop (0, 0). Relax 1 to 6 and 2 to 2. Heap [(2, 2), (6, 1)].
- Pop (2, 2). Through 2, node 1 costs 2 + 3 = 5 < 6: dist[1] = 5, push (5, 1). Node 3 costs 9:
  push (9, 3). Heap [(5, 1), (6, 1), (9, 3)].
- Pop (5, 1). Node 3 through 1 costs 6 < 9: dist[3] = 6, push (6, 3).
- Pop (6, 1). 6 > dist[1] = 5 — **stale, skip**. Pop (6, 3): nothing to relax. Pop (9, 3): stale.

    print(dijkstra(adj, 0, 5))     # [0, 5, 2, 6, inf]

The direct edge 0→1 (6) lost to 0→2→1 (5), which BFS would never have noticed. Node 4 stays
\`inf\`: unreachable. Two stale entries were skipped — one per improvement, exactly as expected
when there is no decrease-key.`,
    mcqs: [
      mcq('h = []; heapq.heappush(h, (3, "b")); heapq.heappush(h, (1, "z")); heapq.heappush(h, (1, "a")) — what does heapq.heappop(h) return?',
        [['(1, \'a\')', true],
          ['(1, \'z\')', false],
          ['(3, \'b\')', false],
          ['(\'a\', 1)', false]],
        'Tuples compare by their first element and only look at the second on a tie. Both cost 1, so "a" < "z" decides it and (1, \'a\') is the smallest.'),
      mcq('A heapq Dijkstra pops (d, u) and immediately runs if d > dist[u]: continue. What is that line for?',
        [['Ignoring an old entry pushed before u got cheaper', true],
          ['Ending the search as soon as the target is popped', false],
          ['Stopping a negative weight from lowering a cost', false],
          ['Making sure no node is pushed onto the heap twice', false]],
        'heapq cannot lower a key in place, so an improvement pushes a second entry. The earlier, larger entry is stale when it comes out, and relaxing from it is wasted work.'),
      mcq('With edges 0→1 (6), 0→2 (2), 2→1 (3), 1→3 (1), 2→3 (7) and no edges at node 4, what does print(dijkstra(adj, 0, 5)) show?',
        [['[0, 5, 2, 6, inf]', true],
          ['[0, 6, 2, 7, inf]', false],
          ['[0, 5, 2, 9, inf]', false],
          ['[0, 5, 2, 6, 0]', false]],
        'Node 1 is cheaper through 2 (2 + 3 = 5) than directly (6), node 3 is 5 + 1 = 6, and node 4 is never relaxed so it keeps inf.'),
    ],
    checkpoint: [
      ck('DSA_GRAPHS', 'A student pushes (node, cost) onto the heap instead of (cost, node). What happens?',
        [['It runs, but pops by node number, so costs can be wrong', true],
          ['heapq raises TypeError because the tuple is reversed', false],
          ['Nothing changes, since heapq sorts on every element', false],
          ['It is correct but takes O(V²) time instead of O(E log V)', false]],
        'heapq orders by the first element of each tuple. With the node first it hands back the lowest-numbered node, not the cheapest one, so a node can be settled before its best cost is known.'),
      ck('DSA_GRAPHS', 'find_order(4, [(1, 0), (2, 0), (3, 1), (3, 2)]) uses Kahn\'s algorithm with a deque. What does it return?',
        [['[0, 1, 2, 3]', true],
          ['[3, 2, 1, 0]', false],
          ['[0, 3, 1, 2]', false],
          ['[], as a cycle exists', false]],
        'Only course 0 starts at in-degree 0. Taking it frees 1 and 2 (in that order, as they were added); taking both brings 3 to 0. There is no cycle.'),
      ck('DSA_GRAPHS', 'Heap entries are (cost, node_object). Two entries tie on cost and the program crashes with TypeError. Why?',
        [['The tie makes heapq compare two objects that have no <', true],
          ['heapq accepts only tuples of two plain integer values', false],
          ['Equal costs are not allowed inside the same heap list', false],
          ['A Dijkstra heap entry must be a list, not a tuple', false]],
        'On equal first elements, tuple comparison moves to the second. A plain class has no __lt__, so Python raises TypeError. Push a node number, or insert a counter as a tie-breaker.'),
    ],
  },

  /* ══ Greedy ═════════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_GREEDY',
    notes: `A **greedy** algorithm makes the choice that looks best now and never takes it back. The
code is short — usually a sort and one loop — and it is **often wrong**. The skill is not writing
the loop; it is knowing when the greedy choice is safe.

## When greedy is safe

You need an argument of the form "some optimal answer begins with my greedy choice". The usual
proof is an **exchange argument**: take any optimal answer, swap its first choice for the greedy
one, and show the result is no worse. If you cannot make that argument, hunt for a small
counter-example before trusting the code.

The classic failure is coins. With coins {1, 5, 6} and amount 10, "always take the biggest coin
that fits" gives 6 + 1 + 1 + 1 + 1 — five coins. The best is 5 + 5 — two coins. Greedy happens to
work for rupee and dollar denominations; for arbitrary coins you need dynamic programming (next
lesson).

## Sorting in Python for greedy problems

Nearly every greedy problem starts with a sort, so know what Python's does:

- \`sorted(intervals)\` sorts tuples or lists **lexicographically**: by start, then by end on a tie.
- \`sorted(intervals, key=lambda iv: iv[1])\` sorts by end. \`key=lambda iv: (iv[1], iv[0])\` breaks
  ties by start.
- The sort is **stable** and O(n log n) (Timsort). \`list.sort()\` sorts in place and returns
  \`None\` — \`x = items.sort()\` leaves \`x\` as \`None\`.

## Classic problem: merge intervals (LeetCode 56)

Given time ranges \`[start, end]\`, merge every overlapping group.

    def merge(intervals):
        out = []
        for start, end in sorted(intervals):
            if out and start <= out[-1][1]:            # overlaps the block being built
                out[-1][1] = max(out[-1][1], end)      # extend it, never shrink it
            else:
                out.append([start, end])               # a gap: start a new block
        return out

    print(merge([(5, 8), (1, 4), (2, 3), (8, 9), (11, 12)]))   # [[1, 4], [5, 9], [11, 12]]

Sorting by start means anything that overlaps the current block comes next; nothing later can
reach back. The \`max\` matters: [1, 4] followed by [2, 3] must stay [1, 4], not shrink to [1, 3].
Note the output blocks are **lists**, so they can be extended — a tuple cannot be assigned to.

**Cost.** O(n log n) for the sort, O(n) for the loop and the output.
**Edge cases.** Touching ranges [5, 8] and [8, 9] merge because of \`<=\`; check whether the problem
wants that. An empty list returns \`[]\`.

## Classic problem: activity selection / non-overlapping intervals (LeetCode 435)

Keep the most meetings that do not overlap. Sort by **end** and keep each meeting that starts at or
after the last kept one ends:

    def most_meetings(meetings):
        kept, last_end = 0, float('-inf')
        for start, end in sorted(meetings, key=lambda m: m[1]):
            if start >= last_end:
                kept += 1
                last_end = end
        return kept

    print(most_meetings([(1, 5), (2, 3), (4, 6), (6, 8), (5, 7)]))   # 3

Why end time? The meeting that finishes first leaves the most room for everything else — swap it
into any optimal schedule and nothing breaks. Sorting by start fails (one long early meeting
blocks the day) and so does sorting by length (a short meeting can straddle two others).
LeetCode 435 asks for the fewest removals: \`len(meetings) - most_meetings(meetings)\`.

## Greedy plus a heap: meeting rooms II (LeetCode 253)

The fewest rooms for all the meetings. Sort by start; keep a min-heap of the end times of rooms in
use. If the earliest-ending room is free by the time the next meeting starts, reuse it:

    import heapq

    def rooms_needed(meetings):
        ends = []
        for start, end in sorted(meetings):
            if ends and ends[0] <= start:
                heapq.heapreplace(ends, end)    # pop the freed room and push the new end at once
            else:
                heapq.heappush(ends, end)       # every room is busy: open another
        return len(ends)

    print(rooms_needed([(1, 4), (2, 5), (3, 6), (5, 7)]))   # 3

O(n log n). The heap never holds more than the answer.`,
    workedExample: `**Goal: jump game (LeetCode 55) — can you reach the last index?**

\`nums[i]\` is the furthest you may jump from index i. Track the furthest index reachable so far:

    def can_reach_end(nums):
        reach = 0
        for i, step in enumerate(nums):
            if i > reach:                 # this index cannot be reached at all
                return False
            reach = max(reach, i + step)
        return True

    print(can_reach_end([2, 0, 0]))     # True:  reach is 2 at index 0
    print(can_reach_end([1, 0, 2]))     # False: reach stays 1, and index 2 > 1

Why is the greedy safe? "Furthest reachable" summarises every jump sequence at once: every index
up to \`reach\` can be reached, so no choice is ever thrown away. There is nothing to undo, which is
exactly when greedy works. O(n) time, O(1) space.

The DP version — \`ok[i]\` is True if any earlier reachable j can jump to i — is O(n²) and gives the
same answers. When a greedy and a DP agree on a problem, the greedy is the one to write.`,
    mcqs: [
      mcq('Coins {1, 5, 6}, amount 10. How many coins does "always take the biggest coin that fits" use?',
        [['5 coins (6 + 1 + 1 + 1 + 1), though 2 coins (5 + 5) exist', true],
          ['2 coins (5 + 5), which is also the best possible answer', false],
          ['2 coins (6 + 4), since the 4 counts as a single coin', false],
          ['None: 10 cannot be made at all from this set of coins', false]],
        'Greedy commits to 6 and then needs four 1s. Taking 5 twice is better, so the greedy choice is not safe for this coin set and DP is needed.'),
      mcq('merge([(5, 8), (1, 4), (2, 3), (8, 9), (11, 12)]) uses start <= out[-1][1] as the overlap test. What does it return?',
        [['[[1, 4], [5, 9], [11, 12]]', true],
          ['[[1, 4], [5, 8], [8, 9], [11, 12]]', false],
          ['[[1, 3], [5, 9], [11, 12]]', false],
          ['[[1, 9], [11, 12]]', false]],
        'After sorting, [2, 3] lies inside [1, 4] and max keeps it [1, 4]. 5 > 4 starts a new block, and 8 <= 8 merges [8, 9] into it. 11 > 9 starts the last block.'),
      mcq('Activity selection calls sorted(meetings, key=lambda m: m[1]). Why sort on m[1]?',
        [['The earliest finisher leaves the most time for the rest', true],
          ['Sorting on m[1] keeps the start times in their order', false],
          ['A key function is required to sort a list of tuples', false],
          ['m[1] is the length of each meeting, shortest first', false]],
        'm[1] is the end time. An exchange argument shows the meeting that ends first can replace the first meeting of any optimal schedule without losing a meeting.'),
    ],
    checkpoint: [
      ck('DSA_GREEDY', 'most_meetings([(1, 5), (2, 3), (4, 6), (6, 8), (5, 7)]) sorts by end time. How many meetings does it keep?',
        [['3', true],
          ['2', false],
          ['4', false],
          ['5', false]],
        'Sorted by end: (2,3), (1,5), (4,6), (5,7), (6,8). Keep (2,3); skip (1,5); keep (4,6); skip (5,7) since 5 < 6; keep (6,8). Three meetings.'),
      ck('DSA_GREEDY', 'rooms_needed([(1, 4), (2, 5), (3, 6), (5, 7)]) keeps a min-heap of end times. What does it return?',
        [['3', true],
          ['2', false],
          ['4', false],
          ['1', false]],
        'Meetings at 1, 2 and 3 all overlap, so three rooms open with ends 4, 5, 6. The meeting at 5 reuses the room that freed at 4, so the heap stays at size 3.'),
      ck('DSA_GREEDY', 'Before you trust a greedy rule in an interview, what argument shows it is safe?',
        [['Any optimal answer can be swapped to begin with the greedy pick', true],
          ['The greedy rule gives the right answer on every given example', false],
          ['The greedy rule runs faster than any dynamic-programming method', false],
          ['The input has been sorted before the greedy rule is applied', false]],
        'An exchange argument proves some optimal solution agrees with the greedy choice, so committing to it loses nothing. Passing the samples proves nothing: the coin rule passes many.'),
    ],
  },

  /* ══ Dynamic programming ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_DYNAMIC_PROGRAMMING',
    notes: `**Dynamic programming** solves a problem by combining answers to smaller versions of the
same problem, and computes each smaller answer **once**. It fits when the problem has
*overlapping subproblems* (the same smaller question comes up again and again) and *optimal
substructure* (the best answer is built from best answers to smaller ones).

Every DP solution is four decisions: **what dp[i] means**, the **recurrence**, the **base case**,
and the **order** in which the table is filled.

## Top-down with functools.cache: climbing stairs (LeetCode 70)

You climb 1 or 2 steps at a time. The ways to reach step n are the ways to reach n - 1 plus the
ways to reach n - 2. Plain recursion recomputes the same steps exponentially often; one decorator
fixes that:

    from functools import cache

    @cache
    def ways(n):
        if n <= 1:
            return 1
        return ways(n - 1) + ways(n - 2)

    print(ways(10))     # 89

\`@cache\` (Python 3.9+; \`@lru_cache(maxsize=None)\` before that) stores each result by its
arguments, so each \`n\` is computed once: O(n) instead of O(2ⁿ). Two Python limits to know:

- **Arguments must be hashable.** \`@cache\` on a function taking a list raises
  \`TypeError: unhashable type: 'list'\`. Pass a tuple, or pass indexes into a list held outside.
- **Recursion depth is about 1000.** On a fresh cache, \`ways(5000)\` raises \`RecursionError\`.
  \`sys.setrecursionlimit(10000)\` helps up to a point, but a very deep limit can crash the
  interpreter outright. For big n, go bottom-up.

## Bottom-up: the same problem with no recursion

    def ways_table(n):
        a, b = 1, 1                 # ways(0), ways(1)
        for _ in range(n - 1):
            a, b = b, a + b
        return b

Each value needs only the two before it, so two names replace the whole table: O(n) time, O(1)
space. Tuple assignment \`a, b = b, a + b\` evaluates the right side first — no temporary needed.

## Classic problem: coin change (LeetCode 322)

The fewest coins that make \`amount\`, or -1. Greedy fails here ({1, 5, 6} and 10), so:
\`dp[a]\` = the fewest coins summing to a.

    def coin_change(coins, amount):
        INF = float('inf')
        dp = [0] + [INF] * amount               # indexes 0 .. amount
        for a in range(1, amount + 1):
            for c in coins:
                if c <= a and dp[a - c] + 1 < dp[a]:
                    dp[a] = dp[a - c] + 1
        return dp[amount] if dp[amount] != INF else -1

    print(coin_change([1, 5, 6], 10))   # 2
    print(coin_change([2], 3))          # -1
    print(coin_change([3, 7], 0))       # 0

The list is \`amount + 1\` long because the answer lives at index \`amount\`. Java code uses
\`amount + 1\` as "infinity" because \`Integer.MAX_VALUE + 1\` overflows; in Python \`float('inf') + 1\`
is still \`inf\`, so the plain infinity is safe.

**Cost.** O(amount × len(coins)) time, O(amount) space.

## Classic 2D problem: longest common subsequence (LeetCode 1143)

\`dp[i][j]\` = the LCS length of the first i characters of s and the first j of t.

    def lcs(s, t):
        m, n = len(s), len(t)
        dp = [[0] * (n + 1) for _ in range(m + 1)]      # row 0 and column 0: empty prefixes
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if s[i - 1] == t[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[m][n]

    print(lcs("STONE", "LONGEST"))   # 3 — "ONE"

**The Python trap.** Build the table with a comprehension. \`[[0] * (n + 1)] * (m + 1)\` makes
\`m + 1\` references to **one** row, so writing \`dp[1][2]\` changes every row and the answer is
garbage. \`[[0] * 3] * 2\` followed by \`g[0][1] = 5\` prints \`[[0, 5, 0], [0, 5, 0]]\`.

The extra row and column hold the empty-prefix base case (LCS 0), which is why the characters are
read at \`i - 1\` and \`j - 1\`. O(m·n) time and space; since each row needs only the one above it,
space can drop to O(n).`,
    workedExample: `**Goal: house robber (LeetCode 198), from recurrence to two variables.**

Houses in a row hold \`[2, 7, 9, 3, 1]\`. You cannot rob two neighbours. Most money?

**What dp[i] means:** the most money from the first i houses. **Recurrence:** for house i either
skip it (\`dp[i-1]\`) or rob it (\`dp[i-2] + value\`) — take the larger. **Base:** no houses, 0.

Track two numbers instead of a list: \`take\` (best if this house is robbed) and \`skip\` (best if it
is not).

    def rob(houses):
        take, skip = 0, 0
        for value in houses:
            take, skip = skip + value, max(take, skip)
        return max(take, skip)

Trace: after 2 → (2, 0); after 7 → (7, 2); after 9 → (11, 7); after 3 → (10, 11); after 1 →
(12, 11). Answer 12 = 2 + 9 + 1.

Note the tuple assignment again: the new \`take\` uses the **old** \`skip\`, which is exactly the
"house i-2" value the recurrence needs. O(n) time, O(1) space.`,
    mcqs: [
      mcq('ways is decorated with @cache and its cache is empty. What happens on ways(5000)?',
        [['RecursionError: the calls nest 5000 deep, past the limit', true],
          ['It returns at once, since @cache removes all of the recursion', false],
          ['MemoryError: the cache cannot hold 5000 separate results', false],
          ['OverflowError: the number of ways is too large for an int', false]],
        '@cache stops repeated work but each first call still waits on ways(n - 1), so the stack grows to about 5000 frames, past the default limit of 1000. Python ints never overflow.'),
      mcq('g = [[0] * 3] * 2; g[0][1] = 5; print(g) — what is printed?',
        [['[[0, 5, 0], [0, 5, 0]]', true],
          ['[[0, 5, 0], [0, 0, 0]]', false],
          ['[[5, 5, 5], [0, 0, 0]]', false],
          ['[[0, 5], [0, 0], [0, 0]]', false]],
        'Multiplying the outer list copies the reference, not the row, so both entries are the same list object. Build a 2D table with [[0] * n for _ in range(m)].'),
      mcq('What does coin_change([1, 5, 6], 10) return with the bottom-up table from the lesson?',
        [['2', true],
          ['5', false],
          ['3', false],
          ['-1', false]],
        'dp[10] tries each coin as the last one: dp[9] + 1, dp[5] + 1 and dp[4] + 1. dp[5] is 1 (one 5-coin), so dp[10] = 2, the 5 + 5 that greedy missed.'),
    ],
    checkpoint: [
      ck('DSA_DP', 'What does lcs("STONE", "LONGEST") return?',
        [['3', true],
          ['2', false],
          ['4', false],
          ['5', false]],
        '"ONE" appears in LONGEST in order (O, N, then E), and no four letters of STONE do, so the longest common subsequence has length 3.'),
      ck('DSA_DP', '@cache is put on def best(prices): ... and it is called as best([3, 1, 4]). What happens?',
        [['TypeError: a list is unhashable, so it cannot be a key', true],
          ['It works, and the cache stores a copy of the list', false],
          ['It works, but the cache is ignored for list arguments', false],
          ['RecursionError, because lists make the call stack deep', false]],
        '@cache keys a dict by the arguments, and a list cannot be a dict key. Pass a tuple, or cache a helper that takes indexes into a list held outside.'),
      ck('DSA_DP', 'rob([5, 1, 1, 5]) uses the take/skip version of house robber. What does it return?',
        [['10', true],
          ['6', false],
          ['11', false],
          ['7', false]],
        'Robbing the first and last houses gives 5 + 5 = 10; they are not neighbours. Alternating houses gives only 6.'),
    ],
  },

  /* ══ Debugging ══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_DEBUGGING',
    notes: `Tree, heap, graph and DP bugs rarely fail on the example in the problem. They pass the
sample and fail the hidden test — a missing child, a deep tree, a node reached twice, a tie in the
heap, a row shared by accident. Each case below is code that runs and looks reasonable. Find the
one line at fault and say why the sample did not catch it.

## 1. Recursion with no None check

    def count(node):
        if node.left is None and node.right is None:
            return 1
        return 1 + count(node.left) + count(node.right)

A node with exactly **one** child calls \`count(None)\`, and \`None.left\` raises
\`AttributeError: 'NoneType' object has no attribute 'left'\`. The sample tree was full (every node
had 0 or 2 children). **Fix:** begin with \`if node is None: return 0\` — then the leaf case is not
needed at all.

## 2. BST validation that only checks the parent

    def valid(node):
        if node is None:
            return True
        if node.left and node.left.val >= node.val:
            return False
        if node.right and node.right.val <= node.val:
            return False
        return valid(node.left) and valid(node.right)

It accepts 5 → right 8 → left 3: every parent–child pair is fine, yet 3 sits in 5's right
subtree. **Fix:** pass bounds down — \`valid(node, low=-inf, high=inf)\` — and narrow them on each
step.

## 3. A max-heap that forgot it was negated

    def kth_largest(nums, k):
        h = []
        for x in nums:
            heapq.heappush(h, -x)       # negated: the root is now the LARGEST value
            if len(h) > k:
                heapq.heappop(h)        # ... so this evicts the largest
        return -h[0]

    print(kth_largest([3, 1, 5, 2, 4], 2))    # 2 — the 2nd smallest, not the 2nd largest

To keep the k largest you must evict the **smallest**, which a plain min-heap does. **Fix:** push
\`x\`, not \`-x\`, and return \`h[0]\`. Negate only when you really want a max-heap — and then negate
back everywhere you read.

## 4. BFS with list.pop(0) and late marking

    queue = [start]
    seen = set()
    while queue:
        u = queue.pop(0)                # O(n) every time: shifts the whole list
        if u in seen:
            continue
        seen.add(u)
        queue.extend(v for v in graph[u] if v not in seen)

Correct answers, but on 100,000 nodes \`pop(0)\` makes it O(V²), and marking on pop lets a node be
queued once per neighbour that sees it first. **Fix:** \`deque\` with \`popleft()\`, and add a node
to \`seen\` at the moment it is **appended**.

## 5. A heap tie that compares objects

    heapq.heappush(heap, (dist, node))      # node is a Node instance

The sample's costs were all different. The first time two costs tie, heapq compares the two
\`Node\` objects and raises \`TypeError: '<' not supported between instances of 'Node' and 'Node'\`.
**Fix:** push the node's number, or \`(dist, next(counter), node)\` with
\`counter = itertools.count()\`.

## 6. Dijkstra that never skips stale entries

    d, u = heapq.heappop(heap)
    for v, w in adj[u]:
        ...                              # relaxes from every popped entry, stale or not

Still correct, but every outdated entry re-relaxes all of u's edges, and a graph built to cause
many improvements makes the run time explode. **Fix:** \`if d > dist[u]: continue\`.

## 7. A DP table with one shared row

    dp = [[0] * (n + 1)] * (m + 1)

Every row is the same list, so each write lands in all of them and the LCS comes out wrong (often
too large). The sample may even pass by luck on tiny strings. **Fix:**
\`[[0] * (n + 1) for _ in range(m + 1)]\`.

## 8. Recursion that is fine on the sample and dies on the real input

    def height(node):
        return 0 if node is None else 1 + max(height(node.left), height(node.right))

Correct — until the tree is a chain. Insert sorted keys into a plain BST and you get a 3,000-node
chain, and \`height\` raises \`RecursionError\` at about 1,000 frames. Memoised DP on large n hits the
same wall. **Fix:** an iterative BFS (count levels with a deque), a bottom-up table, or — for a
known, moderate depth — \`sys.setrecursionlimit\`.

## 9. A greedy that is not safe

    def fewest_coins(coins, amount):
        count = 0
        for c in sorted(coins, reverse=True):
            count += amount // c
            amount %= c
        return count

Right for {1, 2, 5, 10}, wrong for {1, 5, 6} and 10 (5 coins instead of 2), and it returns a count
even when \`amount\` is not 0 at the end — the amount could not be made. **Fix:** the coin-change DP.

## How to find these

Write the inputs the sample does not cover: an empty tree, a node with one child, a chain, two
equal costs, a node reachable two ways, a cycle, amount 0, an amount that cannot be made, and the
largest n. Most of these bugs show themselves on the first such case.`,
    mcqs: [
      mcq('count(node) checks for a leaf first and has no None check. It is called on TreeNode(1, TreeNode(2)). What happens?',
        [['AttributeError: \'NoneType\' object has no attribute \'left\'', true],
          ['It returns 2, since both nodes are counted exactly once', false],
          ['RecursionError, because the calls never reach a leaf', false],
          ['TypeError: unsupported operand types for + with None', false]],
        'Node 1 is not a leaf, so count(node.right) runs with None, and None.left fails. Starting with if node is None: return 0 removes the problem.'),
      mcq('kth_largest pushes -x for every x and pops when len(h) > k, then returns -h[0]. What does kth_largest([3, 1, 5, 2, 4], 2) print?',
        [['2', true],
          ['4', false],
          ['5', false],
          ['1', false]],
        'With negated values the heap root is the largest number, so each pop evicts the largest. The two smallest, 1 and 2, survive, and -h[0] is 2, the 2nd smallest.'),
      mcq('A BFS uses queue = [start] and u = queue.pop(0). It is correct but times out on 100,000 nodes. Why?',
        [['pop(0) shifts the whole list each call, giving O(V²) overall', true],
          ['A list cannot hold more than 65,536 node numbers in it', false],
          ['pop(0) takes from the wrong end, so it does a DFS instead', false],
          ['A list-based queue revisits every node once per edge', false]],
        'Removing the first item moves every other item down one place, O(n) per pop. collections.deque.popleft() is O(1) and keeps BFS at O(V + E).'),
      mcq('An LCS table is built with dp = [[0] * (n + 1)] * (m + 1). What goes wrong?',
        [['Every row is one shared list, so each write hits them all', true],
          ['The table has n + 1 rows and m + 1 columns, the wrong way', false],
          ['Multiplying a list of zeros makes floats instead of ints', false],
          ['Nothing: it is the same as the comprehension, only faster', false]],
        'The outer * copies a reference to the same inner list m + 1 times. dp[i][j] = ... then changes that one list, so later rows read values they never computed.'),
      mcq('height(node) is correct recursion. Keys 1 to 3000 go into a plain BST in order (with an iterative insert), then height(root) is called. What happens?',
        [['RecursionError, since the tree is a 3000-node chain', true],
          ['It returns 12, since the BST balances itself on insert', false],
          ['It returns 3000 quickly, as tail calls are optimised', false],
          ['MemoryError, since each node takes too much memory', false]],
        'Sorted inserts put every key in the right child, so the tree is a chain 3000 deep. Python does not optimise tail calls, and the default limit is about 1000 frames.'),
    ],
  },

  /* ══ Practice ═══════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_PRACTICE',
    notes: `No new ideas — repetition until the patterns come without thinking. Write each one in a
plain editor, without autocomplete, then run it on the edge cases listed.

## Exercises

1. **Maximum depth of a binary tree.** Recursive first, then iterative with a deque, one level at
   a time. Test an empty tree (0), a single node (1) and a 5,000-node chain — which version
   survives it?
2. **Smallest value on each level.** Level-order traversal returning a list with one minimum per
   level. Test a single node and a tree with negative values.
3. **Kth smallest in a stream.** A class with \`add(x)\` that returns the kth smallest value seen so
   far, using one heapq list. heapq is a min-heap — what do you push so the root is the largest of
   the k you keep?
4. **Rotting oranges (LeetCode 994).** Multi-source BFS on a grid: put every rotten orange in the
   deque before the loop. Return the minutes until none are fresh, or -1. A grid with no fresh
   oranges answers 0.
5. **Minimum arrows to burst balloons (LeetCode 452).** Greedy by end coordinate with
   \`sorted(points, key=lambda p: p[1])\`. Python cannot overflow, so the huge coordinates that
   break Java's subtraction comparator are harmless here.
6. **Coin change, counted.** Change the coin-change DP to count the number of *ways* to make the
   amount (LeetCode 518). Why must the loop over coins be the outer loop?
7. **Network delay.** The graded exercise below: Dijkstra from one source, then one number.

## The graded exercise

The assignment runs your Python against hidden tests. It reads a directed, weighted network and
prints how long a signal takes to reach every node — the largest shortest-path cost — or -1 if
some node is never reached. One test has 50,000 nodes, so read all input at once with
\`sys.stdin.buffer.read().split()\` and use heapq; an O(V²) Dijkstra will not finish.`,
    mcqs: [
      mcq('For rotting oranges, why does every rotten orange go into the deque before the BFS loop starts?',
        [['They all spread at minute 0, so each one is a source', true],
          ['A deque raises IndexError if it starts with one item', false],
          ['It lets the BFS skip visiting the fresh oranges at all', false],
          ['It changes the BFS into a DFS, which is faster on grids', false]],
        'Rot spreads from every rotten orange at the same time. A multi-source BFS gives each fresh orange its distance to the nearest rotten one, in one pass.'),
      mcq('To return the kth smallest of a stream with heapq, what do you keep?',
        [['k negated values, so the root is the largest of the k', true],
          ['k plain values, so the root is the kth smallest so far', false],
          ['Every value, then call heapq.nsmallest(k) per query', false],
          ['Every value negated, then read h[k] on each query', false]],
        'To keep the k smallest you must throw away the largest of them, so you need a max-heap: push -x and pop when the size passes k. -h[0] is then the kth smallest.'),
      mcq('In the network-delay exercise, why is the answer max(dist) rather than sum(dist)?',
        [['The signal travels every route at once; the last arrival ends it', true],
          ['sum(dist) can overflow, while max(dist) never overflows', false],
          ['The answer is the cheapest route to the one farthest node', false],
          ['max(dist) is faster to compute than sum(dist) on a list', false]],
        'The signal leaves the source along every edge in parallel, so each node is reached at its own shortest cost and the network is done when the slowest node is reached.'),
      mcq('The exercise has up to 200,000 roads. Why read with data = sys.stdin.buffer.read().split() instead of input() per line?',
        [['One read and one split avoids 200,000 slow input() calls', true],
          ['input() cannot read numbers bigger than 2,147,483,647', false],
          ['input() reads only the first line of the whole input', false],
          ['sys.stdin.buffer.read() turns every token into an int', false]],
        'Each input() call has fixed overhead, which adds up to a large share of the time limit at this size. Reading everything at once and walking the token list is several times faster.'),
      mcq('A test has a chain of 99,999 roads each costing 1,000,000,000. What does a Python solution need to handle the total?',
        [['Nothing: Python ints grow, so 99,999,000,000,000 is fine', true],
          ['Store every distance with numpy.int64 instead of int', false],
          ['Take each distance modulo 10**9 + 7 as it is relaxed', false],
          ['Store every distance as a float to make room for it', false]],
        'Python integers are arbitrary precision, so sums never wrap. Floats would lose exactness above 2**53, and a modulus would change the answer.'),
    ],
    assignment: {
      title: 'Network Delay Time',
      description: 'Read a directed, weighted network and print how long a signal from one node takes to reach every node, using Dijkstra\'s algorithm with heapq.',
      instructions: `A network has \`n\` nodes numbered 1 to n and \`m\` one-way links. A link \`u v w\` carries a
signal from u to v in \`w\` milliseconds. A signal is sent from node \`k\`; it travels along every
link at once. Print how long it takes until **every** node has received it — the largest of the
shortest times from \`k\` — or \`-1\` if some node can never receive it.

**Input** (standard input)

- The first line holds three integers: \`n m k\`.
- Each of the next \`m\` lines holds three integers \`u v w\`: a one-way link from u to v taking w
  milliseconds.
- There may be several links between the same two nodes, and a link may go from a node to itself.

**Output**

One line with one integer: the time until every node has the signal, or \`-1\`. When n is 1 the
answer is \`0\`.

**Example**

Input:

    5 6 1
    1 2 10
    1 3 3
    3 2 4
    2 4 2
    3 4 8
    4 5 1

Output:

    10

Node 2 is reached faster through 3 (3 + 4 = 7) than directly (10); node 4 at 7 + 2 = 9; node 5 at
10, the last to hear.

**Limits**

- 1 ≤ n ≤ 100,000 and 0 ≤ m ≤ 200,000; 1 ≤ k ≤ n.
- 0 ≤ w ≤ 1,000,000,000, so a total can reach 10¹⁴ (fine for a Python int).
- One hidden test has 50,000 nodes and 75,000 links. An O(V²) Dijkstra that scans every node
  for the minimum does not finish in time; Dijkstra with \`heapq\` runs in well under a second.

**Rules**

- Use Dijkstra with \`heapq\`, pushing \`(time, node)\` tuples.
- Skip a popped entry whose time is larger than the best already known for its node.
- Read all input at once with \`sys.stdin.buffer.read().split()\`.

**How it is graded**

Your program is run against every test — the examples and several you cannot see, including a
single node, unreachable nodes, parallel links, self-loops, zero-time links, very large times and
the 50,000-node network. Output is compared line by line; extra spaces at the ends do not matter.
A reviewer grading by hand uses the rubric.`,
      rubric: [
        { criterion: 'Correct times', description: 'The right answer on every test: unreachable nodes (-1), a single node (0), parallel links, self-loops, zero-time links and totals far above 2³¹.', maxPoints: 60 },
        { criterion: 'Dijkstra done properly', description: 'An adjacency list, a heapq of (time, node) tuples, relaxing only on improvement and skipping stale entries, so the large test finishes in time.', maxPoints: 30 },
        { criterion: 'Readable and efficient input', description: 'All input read at once, clear names for dist and the adjacency list, no needless copying or list.pop(0).', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
import heapq


def network_delay(n, adj, k):
    """adj[u] is a list of (v, w) pairs. Return the time for every node to hear k, or -1."""
    # TODO: Dijkstra from k with heapq, pushing (time, node) and skipping stale entries
    # TODO: return the largest time, or -1 if some node was never reached
    return None


def main():
    data = sys.stdin.buffer.read().split()
    n, m, k = int(data[0]), int(data[1]), int(data[2])
    adj = [[] for _ in range(n + 1)]
    # TODO: read the m links "u v w" from data (they start at data[3]) into adj[u]
    answer = network_delay(n, adj, k)
    if answer is not None:
        print(answer)


main()
`,
        tests: [
          { input: '4 3 2\n2 1 1\n2 3 1\n3 4 1\n', expectedOutput: '2' },
          { input: '5 6 1\n1 2 10\n1 3 3\n3 2 4\n2 4 2\n3 4 8\n4 5 1\n', expectedOutput: '10' },
          { input: '1 0 1\n', expectedOutput: '0', isHidden: true },
          { input: '3 2 1\n1 2 5\n3 2 1\n', expectedOutput: '-1', isHidden: true },
          { input: '3 2 3\n1 2 1\n2 3 1\n', expectedOutput: '-1', isHidden: true },
          { input: '4 7 3\n3 3 5\n3 1 9\n3 1 4\n1 2 0\n2 4 6\n3 4 20\n4 1 0\n', expectedOutput: '10', isHidden: true },
          { input: '5 4 1\n1 2 1000000000\n2 3 1000000000\n3 4 1000000000\n4 5 1000000000\n', expectedOutput: '4000000000', isHidden: true },
          { input: bigNetwork(50000, 25001, 20261106), expectedOutput: '9459', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ══ Interview question ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_INTERVIEW_QUESTION',
    notes: `Three problems that come up again and again in Python interviews, across trees, heaps and
graphs. For each: how to talk it through, a model solution, its cost, and the follow-up you get if
you answer well. Say the approach and its complexity **before** you write code — an interviewer
would rather correct a plan than a half-written function.

## 1. Lowest common ancestor of a binary tree (LeetCode 236)

**Talking it through.** "The LCA of p and q is the deepest node that has p in one subtree and q in
the other — or p itself if q is below p. I will recurse: each call returns p or q if it finds one
in its subtree, otherwise None. A node that gets something back from both sides is the answer."

    def lca(root, p, q):
        if root is None or root is p or root is q:
            return root
        left = lca(root.left, p, q)
        right = lca(root.right, p, q)
        if left and right:                 # one target on each side: the split is here
            return root
        return left or right

Compare nodes with \`is\` (the same object), not \`==\`: two different nodes may hold equal values.

**Cost.** O(n) time, O(h) stack for a tree of height h.
**Follow-up.** "What if it is a BST?" — then no full search: if both values are smaller than the
node go left, both larger go right, otherwise this node is the split. O(h) time, and a \`while\`
loop makes it O(1) space. Another: "what if p or q might not be in the tree?" — the version above
would return the one it found; count how many targets were actually seen.

## 2. Top k frequent elements (LeetCode 347)

**Talking it through.** "Count with Counter, then keep the k with the largest counts. heapq.nlargest
keeps a heap of size k, so it is O(n + u log k) for u distinct values."

    from collections import Counter
    import heapq

    def top_k_frequent(nums, k):
        counts = Counter(nums)
        return [x for x, _ in heapq.nlargest(k, counts.items(), key=lambda kv: kv[1])]

\`Counter(nums).most_common(k)\` does the same thing in one call, and an interviewer will accept it
if you can say what it costs underneath (it uses \`heapq.nlargest\` when k is given).

**Follow-up.** "Can you beat the log factor?" — **bucket sort**: a frequency is between 1 and n, so
make \`buckets = [[] for _ in range(n + 1)]\`, put each value in \`buckets[count]\`, and read from the
top bucket down until k values are collected. O(n) time and space.

## 3. Course schedule — a cycle in a directed graph (LeetCode 207)

**Talking it through.** "Courses are nodes, prerequisites are edges. Everything can be finished
exactly when there is no cycle. Kahn's algorithm: repeatedly take courses with no remaining
prerequisites; if all n come out, there is no cycle." The DFS alternative uses **three states**:
unvisited, on the current path, finished.

    def has_cycle(n, adj):
        state = [0] * n                    # 0 unvisited, 1 on the current path, 2 finished
        def dfs(u):
            state[u] = 1
            for v in adj[u]:
                if state[v] == 1:          # back to a node still on the path: a cycle
                    return True
                if state[v] == 0 and dfs(v):
                    return True
            state[u] = 2
            return False
        return any(state[u] == 0 and dfs(u) for u in range(n))

**Cost.** O(V + E) either way.
**Follow-ups.** "Why not one \`visited\` set, as for an undirected graph?" — in a directed graph,
reaching a *finished* node by a second path (a diamond a→b, a→c, b→d, c→d) is not a cycle; only
reaching a node still on the current path is. "Your DFS on 10,000 courses in a chain?" — Python's
recursion limit; Kahn's is iterative and has no such problem, which is a good reason to prefer it
in Python.

## Also worth rehearsing

**Longest increasing subsequence (LeetCode 300).** The O(n²) DP (\`dp[i]\` = the LIS ending at i),
then the follow-up in O(n log n): keep \`tails\`, where \`tails[L]\` is the smallest tail of an
increasing run of length L + 1, and place each value with \`bisect.bisect_left\`. For
\`[10, 9, 2, 5, 3, 7, 101, 18]\` the tails end as \`[2, 3, 7, 18]\`: length 4.`,
    mcqs: [
      mcq('In the recursive lca, both lca(root.left, p, q) and lca(root.right, p, q) return a node. What does that tell you?',
        [['p and q sit in different subtrees, so root is the LCA', true],
          ['p and q are the same node, found once on either side', false],
          ['The tree has a cycle that the recursion went around', false],
          ['root is p, so the search should have stopped earlier', false]],
        'Each side returns the target it found. One target on each side means root is the deepest node whose subtree holds both.'),
      mcq('For top k frequent elements, which method removes the log k factor completely?',
        [['Buckets indexed by count, read from the top bucket down', true],
          ['Counter(nums).most_common(k), which is a single call', false],
          ['sorted(counts.items(), key=lambda kv: -kv[1]) once', false],
          ['A heap of every distinct value, popped k times over', false]],
        'A count lies between 1 and n, so n + 1 buckets order the values in O(n). most_common(k) uses a heap and sorted() pays n log n, so both keep a log factor.'),
      mcq('Why does a cycle check on a directed graph use three states instead of one visited set?',
        [['A finished node reached by a second path is not a cycle', true],
          ['A set cannot be read from inside a nested dfs function', false],
          ['Three states let the DFS run in O(V) instead of O(V + E)', false],
          ['Directed graphs have three kinds of node: source, sink, inner', false]],
        'In the diamond a→b, a→c, b→d, c→d, node d is reached twice with no cycle. Only meeting a node still on the current path proves a back edge.'),
      mcq('The bisect version of LIS runs on [10, 9, 2, 5, 3, 7, 101, 18]. What does tails hold at the end?',
        [['[2, 3, 7, 18]', true],
          ['[2, 5, 7, 101]', false],
          ['[2, 3, 7, 101]', false],
          ['[10, 9, 2, 5]', false]],
        'Each value replaces the first tail that is >= it, or is appended. 18 replaces 101 at the end. The list is not itself a subsequence, but its length, 4, is the LIS length.'),
    ],
  },

  /* ══ Checkpoint ═════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_PY_DSA_NONLINEAR_CHECKPOINT',
    notes: `Twelve questions across the whole topic: binary trees and BSTs, heaps, graphs and
shortest paths, greedy algorithms and dynamic programming. Most show a short piece of Python and
ask what it returns or what goes wrong; trace it by hand before you choose. Costs are worst case
unless a question says otherwise.`,
    checkpoint: [
      ck('DSA_TREES', 'The tree is 1 with children 2 and 3, and 2 has children 4 and 5. A level-order function builds [n.val for n in q] for each level from a deque. What does it return?',
        [['[[1], [2, 3], [4, 5]]', true],
          ['[[1], [2, 4, 5], [3]]', false],
          ['[[4, 5], [2, 3], [1]]', false],
          ['[[1, 2, 4, 5, 3]]', false]],
        'Level order visits one depth at a time, left to right: the root, then its two children, then the two grandchildren under 2.'),
      ck('DSA_TREES', 'Keys 8, 3, 10, 1, 6 are inserted into an empty BST, then list(inorder(root)) is printed. What is shown?',
        [['[1, 3, 6, 8, 10]', true],
          ['[8, 3, 1, 6, 10]', false],
          ['[8, 3, 10, 1, 6]', false],
          ['[1, 6, 3, 10, 8]', false]],
        'Inorder visits a BST in ascending order whatever the insertion order. The others are preorder, level order and postorder.'),
      ck('DSA_TREES', 'Python has no built-in TreeMap. What does a sorted list kept with the bisect module cost?',
        [['O(log n) to search, but O(n) to insert', true],
          ['O(log n) to search and O(log n) to insert', false],
          ['O(1) to search and O(log n) to insert', false],
          ['O(n) to search, but O(1) to insert', false]],
        'bisect finds the position by binary search in O(log n), but insort must shift every later element to make room, which is O(n). A balanced tree would make both O(log n).'),
      ck('DSA_HEAPS', 'h = [5, 1, 8]; heapq.heapify(h); heapq.heappush(h, 0); print(heapq.heappop(h), h[0]) — what is printed?',
        [['0 1', true],
          ['1 0', false],
          ['8 5', false],
          ['5 1', false]],
        'heapq is a min-heap: after pushing 0 it is the smallest, so heappop returns 0. The new root, h[0], is the next smallest value, 1.'),
      ck('DSA_HEAPS', 'heapq.merge(*lists) combines k sorted lists holding N items in total. What does it cost?',
        [['O(N log k)', true],
          ['O(N log N)', false],
          ['O(N k)', false],
          ['O(k log N)', false]],
        'merge keeps one head per list on a heap of size k. Each of the N items is popped once and its successor pushed, each O(log k).'),
      ck('DSA_GRAPHS', 'graph = {0: [1, 2], 1: [3], 2: [3], 3: [4], 4: []}. A BFS from 0 sets dist[v] = dist[u] + 1 the first time it sees v. What is dist[4]?',
        [['3', true],
          ['4', false],
          ['2', false],
          ['5', false]],
        'BFS reaches 1 and 2 at distance 1, then 3 at distance 2 (seen first from 1), then 4 at distance 3. Node 3 is not counted twice because it is marked when first seen.'),
      ck('DSA_GRAPHS', 'A route graph has a few negative edges (cashback). Is Dijkstra safe to use on it?',
        [['No: a node treated as final could later get cheaper', true],
          ['Yes: heapq simply pops the negative entries first', false],
          ['Yes: Python ints cannot overflow on negative costs', false],
          ['No: heapq raises ValueError on negative priorities', false]],
        'Dijkstra relies on a popped distance never improving, which holds only for non-negative weights. Bellman-Ford handles negative edges in O(V·E).'),
      ck('DSA_GRAPHS', 'find_order(3, [(1, 0), (2, 1), (0, 2)]) runs Kahn\'s algorithm. What does it return?',
        [['[]: the three courses depend on each other in a ring', true],
          ['[0, 1, 2]: each course is taken after the one before it', false],
          ['[2, 1, 0]: the reverse of the listed prerequisite pairs', false],
          ['[0]: only course 0 is free to start, so it alone comes out', false]],
        '1 needs 0, 2 needs 1 and 0 needs 2, so every in-degree is 1. Nothing starts at 0, the deque is empty, and fewer than 3 courses come out.'),
      ck('DSA_GREEDY', 'merge([(1, 3), (8, 10), (2, 6), (9, 12)]) sorts by start and extends with max. What does it return?',
        [['[[1, 6], [8, 12]]', true],
          ['[[1, 3], [2, 6], [8, 10], [9, 12]]', false],
          ['[[1, 12]]', false],
          ['[[1, 6], [8, 10], [9, 12]]', false]],
        'Sorted: (1,3), (2,6), (8,10), (9,12). 2 <= 3 merges into [1, 6]; 8 > 6 starts [8, 10]; 9 <= 10 extends it to [8, 12].'),
      ck('DSA_GREEDY', 'can_reach_end tracks the furthest reachable index. Which input makes it return False?',
        [['[1, 0, 2]', true],
          ['[2, 0, 0]', false],
          ['[0]', false],
          ['[3, 0, 0, 0]', false]],
        'From [1, 0, 2] the reach is 1 after index 0 and stays 1 at index 1, so index 2 > reach. [0] is already at the end, and the others jump past the zeros.'),
      ck('DSA_DP', 'What does coin_change([2, 5], 11) return with the bottom-up table?',
        [['4', true],
          ['3', false],
          ['-1', false],
          ['2', false]],
        '11 = 5 + 2 + 2 + 2 uses four coins. Two fives leave 1, which no coin makes, so three coins is impossible, and the table finds the four-coin answer.'),
      ck('DSA_DP', 'row = [1] * 4, then twice: for j in range(1, 4): row[j] += row[j - 1]. What is row[-1] — the paths across a 3 × 4 grid?',
        [['10', true],
          ['6', false],
          ['12', false],
          ['20', false]],
        'Each pass turns row into running sums: [1, 2, 3, 4], then [1, 3, 6, 10]. Each cell is the paths from above plus from the left, so a 3 × 4 grid has 10 paths.'),
    ],
  },
];
