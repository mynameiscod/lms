/**
 * T3_GRAPHS and T3_CHOOSING_STRUCTURES — twelve units. Year 3.
 *
 * ── THE ONE THAT MATTERS IS MODELLING ─────────────────────────────────────────────────────
 *
 * BFS and DFS are twenty lines each and every student can recite them. What almost none can do
 * is look at "can these courses be taken in some order", "is this configuration circular",
 * "which accounts are reachable from this one" and see a graph. The problems do not mention
 * graphs; recognising the shape is the whole skill, and MODELLING_AS_A_GRAPH is the unit the
 * rest of the topic exists to support.
 *
 * So the two traversal units are written to be short and correct rather than exhaustive, and
 * each ends on the question it answers rather than on its implementation.
 *
 * T3_CHOOSING_STRUCTURES is the topic that ties S03 together, and it is written against one
 * habit: naming a structure as "best". Nothing is best. A structure makes a trade, the trade is
 * stateable in one sentence, and a student who cannot state it has memorised a preference.
 *
 * Attribution: T3_GRAPHS is single-skill (DSA_GRAPHS, derived). T3_CHOOSING_STRUCTURES defaults
 * to DSA_COMPLEXITY with TRADE_OFFS overridden to DSA_HASHING — that override is what stops
 * DSA_HASHING being askable across the year but never evidenced.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const GRAPHS_BUNDLES: PilotBundle[] = [
  /* ══ T3_GRAPHS ══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_GRAPHS_REPRESENTING_GRAPHS',
    notes: `A graph is nodes and the connections between them. That is a weaker structure than a
tree — no root, no parent, cycles allowed — and weaker structures describe more things.

**Vocabulary, briefly:** an edge can be **directed** (follows one way, like a Twitter follow) or
**undirected** (mutual, like a Facebook friendship); **weighted** (carries a cost — distance,
price, time) or not; and a graph is **cyclic** if you can get back where you started. Every one
of those choices changes which algorithm applies, so establish them before writing any code.

## Adjacency list

A map from each node to the nodes it reaches.

    {'A': ['B', 'C'], 'B': ['D'], 'C': [], 'D': ['A']}

- **Space:** O(V + E) — you store exactly the edges that exist.
- **"Who does A reach?"** — immediate.
- **"Is there an edge A→B?"** — scan A's list.

## Adjacency matrix

A V×V grid where cell [i][j] says whether the edge exists.

- **Space:** O(V²) — you store every edge that *could* exist, including all the ones that do
  not.
- **"Is there an edge A→B?"** — one lookup.
- **"Who does A reach?"** — scan a whole row, including every absent edge.

## Which one

**Almost always the list.** Real graphs are **sparse**: a social network with a million users
does not have a million connections each. As a matrix that is 10¹² cells to hold a few million
edges, which does not fit in memory, and iterating a node's neighbours means reading a million
mostly-empty cells.

**The matrix wins when the graph is dense** (most pairs connected), when V is small and fixed,
or when the algorithm is expressed as matrix arithmetic.

**The rule:** if the question you ask most is "who does this reach", use a list. If it is "are
these two connected", and the graph is small or dense, consider a matrix.

## The representation students forget

You often do not need to build one. **An implicit graph** is defined by a function rather than a
data structure: the nodes are board positions and the edges are legal moves; the nodes are
files and the edges are imports. Nothing is stored — you generate neighbours on demand — and it
is the only option when the graph is too large to hold, or infinite.`,
    mcqs: [
      mcq('Why is an adjacency list the usual choice?',
        [['Real graphs are sparse, and it stores only real edges', true],
          ['It answers edge-existence questions more quickly', false],
          ['It handles directed and undirected graphs alike', false],
          ['It is simpler to implement in most languages', false]],
        'A million users as a matrix is 10^12 cells for a few million edges.'),
      mcq('An adjacency matrix answers which question fastest?',
        [['Is there an edge between these two', true],
          ['Which nodes does this one reach', false],
          ['How many edges does this node have', false],
          ['Is the graph connected overall', false]],
        'One lookup, against a scan of the node’s list.'),
      mcq('An implicit graph is one where:',
        [['Neighbours are generated rather than stored', true],
          ['The edges are inferred from node values', false],
          ['Only part of the graph is held in memory', false],
          ['The structure is built lazily as it is walked', false]],
        'Board positions and legal moves: nothing is stored, and it works when the graph is infinite.'),
      mcq('Which property must you establish before choosing an algorithm?',
        [['Directed or undirected, weighted or not, cyclic or not', true],
          ['The number of nodes and edges involved', false],
          ['Whether the graph fits into memory', false],
          ['Whether the graph is connected throughout', false]],
        'Every one of those changes which algorithm applies at all.'),
    ],
    checkpoint: [
      mcq('The space an adjacency list uses is:',
        [['Proportional to nodes plus edges', true],
          ['Proportional to the square of the nodes', false],
          ['Proportional to the edges alone', false],
          ['Proportional to the longest path in it', false]],
        'Exactly the edges that exist, and nothing for the ones that do not.'),
      mcq('A graph differs from a tree in that it:',
        [['Has no root and may contain cycles', true],
          ['Allows a node more than two children', false],
          ['Stores weights on its connections', false],
          ['Cannot be traversed recursively', false]],
        'A weaker structure, which is why it describes more things.'),
      mcq('A matrix is worth considering when:',
        [['The graph is dense, or V is small and fixed', true],
          ['The graph has millions of sparse nodes', false],
          ['Neighbour iteration is the common operation', false],
          ['The edges carry weights rather than flags', false]],
        'Density is the deciding property, not size on its own.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_BFS',
    notes: `Breadth-first search visits everything one step away, then everything two steps
away, and so on. A **queue** is what produces that order, and swapping it for a stack turns
this into depth-first — the two algorithms differ in one line.

    from collections import deque

    def bfs(start, neighbours):
        seen = {start}
        q = deque([start])
        while q:
            node = q.popleft()
            for n in neighbours(node):
                if n not in seen:
                    seen.add(n)
                    q.append(n)

## The question it answers

> **What is the shortest path, when every step costs the same?**

That is the whole reason to prefer it, and the reason is worth understanding rather than
memorising. BFS reaches everything at distance 1 before anything at distance 2. So the **first**
time it arrives at a node, it has arrived by the fewest possible steps. There is no shorter
route left to find.

**"Every step costs the same" is the condition.** Unweighted edges, or weights that are all
equal. The moment edges have differing costs, BFS gives you the path with the fewest *hops*,
which may be far more expensive than a longer route. The fix is a priority queue instead of a
queue, and that is Dijkstra's algorithm.

## Getting the path, not just the distance

Record where you came from, then walk it back:

    prev = {start: None}
    # ... on discovering n from node:
    prev[n] = node

    # afterwards
    path, cur = [], target
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()

## Mark as seen when you ENQUEUE

This is the bug that matters. Marking a node when you **dequeue** it lets it be added several
times before it is first processed — the queue balloons, the work multiplies, and on a dense
graph it is the difference between fast and hanging. Add to \`seen\` at the moment you push.

## Cost

**O(V + E)**: every node enters the queue at most once, and every edge is examined at most once
from each end. Memory is the queue, which at its worst holds an entire level — on a wide graph
that can be most of the graph at once, which is the real difference from depth-first.

## Where it shows up

Shortest route on an unweighted map. Degrees of separation. Flood fill in an image editor. The
minimum number of moves in a puzzle. Level-order traversal of a tree, which is the same
algorithm on a graph that happens to have no cycles.`,
    mcqs: [
      mcq('Why does BFS give the shortest path on unweighted edges?',
        [['It reaches every node at distance one before any at two', true],
          ['It examines every possible path and keeps the best', false],
          ['The queue orders nodes by their distance value', false],
          ['It refuses to revisit a node once it is seen', false]],
        'The first arrival is therefore by the fewest steps; nothing shorter remains.'),
      mcq('BFS stops being correct for shortest paths when:',
        [['Edges have differing costs', true],
          ['The graph contains cycles', false],
          ['The graph is directed rather than undirected', false],
          ['The graph is disconnected in places', false]],
        'Fewest hops is not cheapest once a hop can cost more than another.'),
      mcq('Marking a node seen on dequeue rather than enqueue causes:',
        [['The same node to be queued many times over', true],
          ['Some nodes never to be visited at all', false],
          ['The path reconstruction to return a cycle', false],
          ['The traversal order to become depth-first', false]],
        'The queue balloons and the work multiplies, which on a dense graph means hanging.'),
      mcq('The difference in code between BFS and DFS is essentially:',
        [['A queue instead of a stack', true],
          ['Recursion instead of iteration', false],
          ['The order neighbours are generated in', false],
          ['Whether visited nodes are tracked at all', false]],
        'One line. The consequences are large; the code difference is not.'),
    ],
    checkpoint: [
      mcq('To recover the actual path rather than the distance, you:',
        [['Record each node’s discoverer and walk back', true],
          ['Store the full path in the queue with each node', false],
          ['Run the search a second time from the target', false],
          ['Keep a counter of the steps taken so far', false]],
        'One map, one reversed walk, and no path copying per node.'),
      mcq('BFS costs:',
        [['O(V + E)', true], ['O(V log V)', false], ['O(V × E)', false], ['O(E log V)', false]],
        'Each node enqueued once, each edge examined once from each end.'),
      mcq('The memory risk in BFS on a wide graph is:',
        [['A single level can be most of the graph', true],
          ['The visited set grows faster than the graph', false],
          ['The recursion depth follows the longest path', false],
          ['Each node stores its whole path back', false]],
        'Which is the real difference from depth-first, whose memory follows depth instead.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_DFS',
    notes: `Depth-first search follows one path as far as it goes, then backs up and takes the
next. A **stack** produces that order, and recursion gives you the stack for free.

    def dfs(node, neighbours, seen=None):
        seen = seen if seen is not None else set()
        seen.add(node)
        for n in neighbours(node):
            if n not in seen:
                dfs(n, neighbours, seen)
        return seen

## The questions it answers

DFS is not about shortest paths. It is about **structure**.

**Is there a cycle?** The single most useful thing DFS does. Circular imports, dependency loops,
a manager who reports to their own report — all the same question.

**For a directed graph, three colours:**

    WHITE = not visited, GREY = on the current path, BLACK = finished

Reaching a **GREY** node means you have arrived somewhere you are still in the middle of
visiting — you have come back on yourself, and that is a cycle. Reaching a **BLACK** node is
fine: it is a place you finished with earlier by another route.

**The mistake** is using one "visited" set for both. That reports a cycle whenever two paths
converge, which is not a cycle at all, and it is the most common wrong answer to this question.

**What are the connected components?** Run DFS from an unvisited node; everything it reaches is
one component. Repeat until nothing is unvisited. That is the count of separate clusters.

**In what order can these be done?** A topological sort: DFS, and prepend each node to a list
when you **finish** it. Build order, task dependencies, course prerequisites, spreadsheet
recalculation. It only exists if the graph has no cycles, which is why cycle detection comes
first.

## Cost, and the trap

**O(V + E)**, same as BFS. Memory is the recursion depth — which is fine on a wide graph and
fatal on a long one.

**A graph with 100,000 nodes in a chain will blow the stack.** This is the same failure as the
degenerate tree, and the same fix: an explicit stack and a loop. Interviews rarely care; a
production crawler does, immediately.

## Choosing between them

- Shortest path, fewest steps, nearest thing → **BFS**.
- Cycles, components, ordering, "does any path exist" → **DFS**.
- Graph is very wide → DFS uses less memory.
- Graph is very deep → BFS will not overflow the stack.`,
    mcqs: [
      mcq('Detecting a cycle in a directed graph needs three states because:',
        [['Revisiting a finished node is not a cycle', true],
          ['Undirected graphs need only two of them', false],
          ['A node can be reached by several paths at once', false],
          ['The traversal has to know when to stop', false]],
        'One visited set reports a cycle whenever two paths converge, which is wrong.'),
      mcq('A topological sort is produced by:',
        [['Prepending each node as DFS finishes it', true],
          ['Appending each node as DFS discovers it', false],
          ['Sorting the nodes by their number of edges', false],
          ['Running BFS and recording the level order', false]],
        'Finish time reversed is exactly a valid order, when one exists.'),
      mcq('A topological sort exists only if the graph:',
        [['Has no cycles', true],
          ['Is fully connected', false],
          ['Is undirected throughout', false],
          ['Has weights on every edge', false]],
        'Which is why cycle detection is the prerequisite question.'),
      mcq('Recursive DFS fails on a graph of 100,000 nodes in a chain because:',
        [['The call stack has a hard limit', true],
          ['The visited set grows too large to hold', false],
          ['Each node is visited more than once', false],
          ['The traversal never reaches the end', false]],
        'Same failure as the degenerate tree, same fix: an explicit stack.'),
    ],
    checkpoint: [
      mcq('Reaching a GREY node during DFS means:',
        [['You have come back onto the current path', true],
          ['You have found a second route to a node', false],
          ['The node has already been fully processed', false],
          ['The graph is disconnected at that point', false]],
        'Still in the middle of visiting it, so you have gone round.'),
      mcq('Counting connected components uses DFS by:',
        [['Restarting from each still-unvisited node', true],
          ['Counting the edges each traversal crosses', false],
          ['Comparing the visited set against the node set', false],
          ['Running it once and counting the depths', false]],
        'Each restart is one more separate cluster.'),
      mcq('On a very wide but shallow graph, DFS is preferable because:',
        [['Its memory follows depth, not breadth', true],
          ['It reaches the nearest nodes sooner', false],
          ['It examines fewer edges in total', false],
          ['It detects disconnection more quickly', false]],
        'BFS would hold an entire level, which on a wide graph is most of it.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_MODELLING_AS_A_GRAPH',
    notes: `This is the unit that matters. The traversals are twenty lines each and everyone can
recite them. Almost nobody can look at a worded problem and see the graph in it — and the
problem never says "graph".

## The three questions

**1. What is a node?** Whatever the thing is that connects to other things. Usually a noun in
the problem: a course, a page, a person, a board position, a version of a package, a cell.

**2. What is an edge, and which way does it point?** Whatever the relationship is. *Direction is
the part people get wrong.* "A requires B" and "B requires A" are opposite graphs and give
opposite answers, so write the arrow down in words before you write any code.

**3. What am I actually asking?** This chooses the algorithm, and there are only a few answers:

| The question, in plain words | What it is |
|---|---|
| Can I get from here to there? | Reachability — DFS or BFS |
| What is the fewest steps? | BFS |
| What is the cheapest, with costs? | Dijkstra |
| Is it circular? | DFS with three colours |
| In what order can these be done? | Topological sort |
| How many separate clusters? | Components |

## Five that do not mention graphs

**"Can these courses be taken in some order?"** Nodes are courses, edges point from
prerequisite to dependent. The question is: is there a cycle? If not, the topological order is
the schedule.

**"Is this build configuration circular?"** Same graph, same question, different words. Once
you have seen it twice you will see it everywhere.

**"Fewest moves to solve this puzzle."** Nodes are *board states*, edges are legal moves. The
graph is enormous and nobody builds it — it is implicit, generated as you go. BFS, because every
move costs one.

**"Which accounts could this one have reached funds through?"** Nodes are accounts, edges are
transfers, direction is the direction of money. Reachability, and the direction is the entire
answer.

**"Group these photos of the same person."** Nodes are photos, an edge means "these two match".
Components. Notice there is no traversal question at all — the answer is the shape of the
clusters.

## The tells

You are probably looking at a graph if the problem says: **depends on**, **connected to**,
**leads to**, **follows**, **reachable**, **path**, **order**, **circular**, **network**,
**related**, or **steps between**.

## The two modelling mistakes

**Edges pointing the wrong way.** "A depends on B" — does the arrow go A→B or B→A? Either is a
valid convention; picking one and then reasoning with the other is not. Write it in words:
*"an arrow means the thing at the tail cannot start until the thing at the head is done."*

**Building the graph when you do not have to.** If the neighbours are computable — legal moves,
files an import references, numbers you can reach by an operation — generate them on demand. The
puzzle graph has billions of states and you will visit a few thousand.`,
    mcqs: [
      mcq('"Can these courses be taken in some order?" is really:',
        [['A cycle check, then a topological sort', true],
          ['A shortest path from the first course', false],
          ['A count of the connected components', false],
          ['A reachability query per course', false]],
        'If there is no cycle, the topological order is the schedule.'),
      mcq('In "fewest moves to solve this puzzle", the nodes are:',
        [['Board states, with moves as the edges', true],
          ['Moves, with states as the edges', false],
          ['Pieces, with positions as the edges', false],
          ['Positions, with pieces as the edges', false]],
        'Enormous, implicit, and only a few thousand ever get visited.'),
      mcq('Which modelling mistake produces a confidently wrong answer?',
        [['Edges pointing the opposite way to the intent', true],
          ['Using a list where a matrix would be faster', false],
          ['Building the graph rather than generating it', false],
          ['Treating an undirected edge as two directed ones', false]],
        '"A requires B" and "B requires A" are opposite graphs.'),
      mcq('"Group these photos of the same person" asks for:',
        [['The connected components', true],
          ['The shortest path between photos', false],
          ['A topological ordering of matches', false],
          ['Whether the match graph has a cycle', false]],
        'No traversal question at all — the answer is the shape of the clusters.'),
    ],
    checkpoint: [
      mcq('The three modelling questions are:',
        [['What is a node, what is an edge, what am I asking', true],
          ['How many nodes, how many edges, how dense', false],
          ['Is it directed, is it weighted, is it cyclic', false],
          ['What to store, how to traverse, what to return', false]],
        'The third one chooses the algorithm, and there are only a few answers.'),
      mcq('Writing the arrow’s meaning in words first is worth doing because:',
        [['Both conventions are valid and mixing them is not', true],
          ['It documents the model for the next reader', false],
          ['It reveals whether the graph has cycles', false],
          ['Directed graphs need a stated convention', false]],
        'Picking one and reasoning with the other is the mistake that survives testing.'),
      mcq('You should generate neighbours rather than build the graph when:',
        [['The state space is far larger than what you visit', true],
          ['The edges are expensive to compute', false],
          ['The graph changes while you traverse it', false],
          ['The graph is sparse rather than dense', false]],
        'Billions of puzzle states, a few thousand visited.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_DEBUGGING',
    notes: `Five graph bugs. Two of them hang rather than fail, which is what makes graph bugs
distinctive.

## 1. No visited set at all

    def walk(node):
        for n in graph[node]:
            walk(n)

**Symptom:** RecursionError, or it runs forever. **Cause:** a cycle, and nothing stopping you
going round it. Trees do not need a visited set; graphs always do, and this is the bug that
comes from treating one as the other.

## 2. Marked on dequeue rather than enqueue

**Symptom:** correct answers, unacceptably slow, and memory climbing. **Cause:** a node reached
by five neighbours is queued five times before it is first processed. On a dense graph the queue
grows quadratically. **Fix:** add to \`seen\` at the moment you push.

## 3. Two paths mistaken for a cycle

    seen = set()
    def has_cycle(n):
        if n in seen: return True   # <-- wrong
        seen.add(n)
        return any(has_cycle(c) for c in graph[n])

**Symptom:** cycles reported in an obviously acyclic graph — a diamond A→B, A→C, B→D, C→D.
**Cause:** one set cannot distinguish "on the current path" from "finished earlier". **Fix:**
three colours, and remove the node from the current path when you finish it.

## 4. Undirected stored as directed

**Symptom:** the graph is mysteriously disconnected; a path exists one way and not the other.
**Cause:** an undirected edge is **two** directed entries and only one was added. **Tell:**
\`graph['A']\` contains B but \`graph['B']\` does not contain A.

## 5. The self-loop and the parent

In an **undirected** graph, DFS will immediately walk back to the node it came from, because
that edge exists in both directions — and naive cycle detection reports a cycle of length two.
**Fix:** skip the node you arrived from. Note this fix is **wrong for directed graphs**, where
A→B and B→A genuinely is a cycle.

## Debugging graphs, practically

**Shrink the graph.** Almost every graph bug reproduces on five nodes. A five-node failing case
is debuggable; a fifty-thousand-node one is not. This is bisection applied to data.

**Print the traversal order**, not the final answer. The order shows where it went wrong; the
answer only shows that it did.

**Assert your invariants.** Every undirected edge present in both directions. No node in the
visited set twice. The count of visited nodes never exceeding the node count.`,
    mcqs: [
      mcq('A traversal that hangs on a graph but works on a tree is missing:',
        [['A visited set', true],
          ['A base case for the recursion', false],
          ['A check that the graph is directed', false],
          ['A bound on the traversal depth', false]],
        'Trees have no cycles, so they get away without one. Graphs never do.'),
      mcq('"Correct but slow, with memory climbing" in a BFS suggests:',
        [['Nodes marked on dequeue rather than on enqueue', true],
          ['The visited set being cleared between levels', false],
          ['An adjacency matrix on a sparse graph', false],
          ['Recursion being used instead of a queue', false]],
        'A node reached by five neighbours enters the queue five times.'),
      mcq('A diamond A→B, A→C, B→D, C→D reported as a cycle means:',
        [['One set is being used for two different states', true],
          ['The edges were stored in both directions', false],
          ['The traversal restarted from the wrong node', false],
          ['D was added to the graph twice over', false]],
        'Two paths converging is not a cycle; three colours distinguish them.'),
      mcq('`graph[\'A\']` contains B but `graph[\'B\']` does not contain A. That is:',
        [['An undirected edge stored only one way', true],
          ['A directed graph behaving correctly', false],
          ['A node added before its neighbour existed', false],
          ['A self-loop that was filtered out', false]],
        'An undirected edge is two directed entries, and only one was written.'),
    ],
    checkpoint: [
      mcq('Skipping the node you arrived from is correct for:',
        [['Undirected graphs only', true],
          ['Directed graphs only', false],
          ['Both, in cycle detection', false],
          ['Neither, if colours are used', false]],
        'In a directed graph A→B and B→A genuinely is a cycle.'),
      mcq('The most effective first step on a graph bug is:',
        [['Shrink it to about five nodes', true],
          ['Print the final answer and compare', false],
          ['Switch the representation and retry', false],
          ['Add a depth limit to the traversal', false]],
        'Almost every graph bug reproduces small, and small is debuggable.'),
      mcq('Printing the traversal order beats printing the answer because:',
        [['It shows where it went wrong, not just that it did', true],
          ['It is faster to produce on a large graph', false],
          ['The answer may be correct by coincidence', false],
          ['It reveals whether the graph is connected', false]],
        'The same reason the debugging topic prefers evidence to outcomes.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_PRACTICE',
    notes: `Three exercises. None of them says "graph" in the problem statement, which is the
point of the topic.

Write down your three answers — what is a node, what is an edge and which way, what am I asking
— before writing code. If you cannot answer the third, you do not yet know which algorithm.`,
    coding: [
      {
        title: 'Can the courses be taken?',
        description: `First line: an integer n, the number of courses, named \`0\` to \`n-1\`.
Then lines of \`A B\` meaning **A must be taken before B**.

Print a valid order as space-separated course numbers, or \`impossible\` if no order exists.

Where several orders are valid, print the one that takes the **smallest available course number
first** at every step, so the answer is unique.`,
        starter: `import sys

data = [l.split() for l in sys.stdin if l.split()]
n = int(data[0][0])
edges = [(int(a), int(b)) for a, b in data[1:]]

# TODO: node, edge, question. Then the algorithm the third answer chooses.
`,
        language: 'python',
        tests: [
          { input: '4\n0 1\n0 2\n1 3\n2 3\n', expectedOutput: '0 1 2 3' },
          { input: '2\n0 1\n1 0\n', expectedOutput: 'impossible' },
          { input: '3\n', expectedOutput: '0 1 2' },
          { input: '5\n4 0\n4 1\n0 2\n1 2\n2 3\n', expectedOutput: '4 0 1 2 3', isHidden: true },
          { input: '1\n0 0\n', expectedOutput: 'impossible', isHidden: true },
        ],
      },
      {
        title: 'Group the duplicates',
        description: `Lines of \`X Y\` meaning "X and Y are the same person". The relation is
mutual, and it carries: if A is B and B is C, all three are one person.

Print the number of distinct people, then each group on its own line — names sorted within a
group, and the groups sorted by their first name.

Empty input prints \`0\` and nothing else.`,
        starter: `import sys

pairs = [l.split() for l in sys.stdin if l.split()]

# TODO: this one has no traversal question. What is the answer the shape of?
`,
        language: 'python',
        tests: [
          { input: 'a b\nb c\nd e\n', expectedOutput: '2\na b c\nd e' },
          { input: 'x y\n', expectedOutput: '1\nx y' },
          { input: '', expectedOutput: '0' },
          { input: 'p q\nr s\nq r\n', expectedOutput: '1\np q r s', isHidden: true },
          { input: 'z z\n', expectedOutput: '1\nz', isHidden: true },
        ],
      },
      {
        title: 'Fewest steps',
        description: `A grid of \`.\` (open) and \`#\` (blocked), one row per line. Start at the
top-left, finish at the bottom-right. You may move up, down, left or right.

Print the number of **cells visited** on a shortest route, counting both ends. Print \`-1\` if
no route exists, and also if either end is blocked.

Do not build an adjacency structure. The neighbours are computable.`,
        starter: `import sys

grid = [l.rstrip(chr(10)) for l in sys.stdin if l.strip()]

# TODO: implicit graph. Which traversal, and why that one?
`,
        language: 'python',
        tests: [
          { input: '...\n.#.\n...\n', expectedOutput: '5' },
          { input: '.#\n#.\n', expectedOutput: '-1' },
          { input: '.\n', expectedOutput: '1' },
          { input: '....\n###.\n....\n', expectedOutput: '6', isHidden: true },
          { input: '#.\n..\n', expectedOutput: '-1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Graphs Practice',
      description: 'Three problems that never say "graph": ordering, grouping and fewest steps.',
      instructions: `Complete all three exercises. For **each one**, before anything else, write
the three modelling answers:

- What is a node?
- What is an edge, and which way does it point?
- What am I actually asking?

Then answer:

1. For the first: state which way your edges point, in words, and what the answer would have
   been if you had pointed them the other way.
2. For the first: say why "smallest available number first" needs more than a plain DFS-finish
   ordering, and what you used instead.
3. For the second: say why this problem has no traversal question, and name the thing you are
   actually computing.
4. For the third: say why BFS and not DFS, in one sentence that mentions cost per move.
5. For the third: say roughly how many cells a 1000×1000 grid would have, and why not building
   an adjacency list matters at that size.`,
      rubric: [
        { criterion: 'Three models written', description: 'Node, edge with direction, and question — for all three problems.', maxPoints: 20 },
        { criterion: 'Ordering, correct and unique', description: 'Valid order, impossible detected, smallest-first tie-breaking.', maxPoints: 20 },
        { criterion: 'Direction understood', description: 'States the convention and what reversing it would have produced.', maxPoints: 15 },
        { criterion: 'Grouping', description: 'Components correct, including a self-pair and a chained merge.', maxPoints: 20 },
        { criterion: 'Fewest steps', description: 'BFS on an implicit graph, with blocked ends handled.', maxPoints: 15 },
        { criterion: 'Why BFS', description: 'One sentence that turns on every move costing the same.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

grid = [l.rstrip(chr(10)) for l in sys.stdin if l.strip()]
`,
        tests: [
          { input: '...\n.#.\n...\n', expectedOutput: '5' },
          { input: '.#\n#.\n', expectedOutput: '-1' },
          { input: '.\n', expectedOutput: '1' },
          { input: '#.\n..\n', expectedOutput: '-1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('The grid problem is best solved by:',
        [['BFS over neighbours computed on demand', true],
          ['DFS with a visited set over the cells', false],
          ['Building an adjacency list, then BFS', false],
          ['Dijkstra, since some routes are longer', false]],
        'Every move costs one, and a million cells is not worth storing as edges.'),
      mcq('The duplicate-grouping problem computes:',
        [['Connected components', true],
          ['A topological order', false],
          ['Shortest paths between names', false],
          ['A cycle-free spanning structure', false]],
        'There is no traversal question; the answer is the shape of the clusters.'),
      mcq('If the prerequisite edges were reversed, the ordering would be:',
        [['Valid but backwards, and silently wrong', true],
          ['Rejected as containing a cycle', false],
          ['Identical, since order is symmetric', false],
          ['Impossible to compute at all', false]],
        'Which is why the direction is written in words before any code.'),
    ],
  },

  {
    unitCode: 'T3_GRAPHS_MINI_PROJECT',
    notes: `Build a dependency analyser for a real codebase, and have it answer the questions a
team actually asks about one.

The brief insists on a **real** repository because generated graphs are well behaved and real
ones are not: they have cycles nobody intended, files nothing imports, and one module everything
touches. Meeting those is the point.

Budget around two hours. Run it on something you did not write.`,
    assignment: {
      title: 'Mini Project — A Dependency Analyser',
      description: 'Build an import graph from a real repository and answer the questions a team asks about it.',
      instructions: `**Build**

A tool that reads a real code repository — one you did **not** write, at least thirty source
files — parses its imports, and builds a directed graph of which file depends on which.

Parsing may be crude. Regex over import lines is acceptable; say so and say what it would miss.

**Answer these about the repository**

1. **Are there circular dependencies?** List every cycle you find. If there are none, say so and
   show the check that proves it.
2. **In what order could these files be loaded?** A topological order, or a clear statement of
   why none exists.
3. **Which file has the most things depending on it?** That is the riskiest file to change, and
   say why in one line.
4. **Which files are unreachable from the entry point?** Candidate dead code — and say why
   "candidate" rather than "dead".
5. **How many separate clusters are there?** Treating edges as undirected. Say what more than
   one cluster tells you about the codebase.

**Then, the part that is actually being marked**

6. State your model explicitly: what a node is, what an edge is, and **which way it points, in
   words**.
7. For each of the five questions, name the algorithm and say in one sentence why that one.
8. Say what your parser gets wrong. Dynamic imports, conditional imports, re-exports, aliases —
   name at least two and say what effect each has on your answers.
9. Report the size: how many nodes, how many edges, is it sparse or dense, and what that
   justifies about your representation.

**Show the output** for the repository you chose — the actual cycles, the actual most-depended-on
file. Not an example.

**Submit** the tool, its output on a real repository, and the answers to 6–9.`,
      rubric: [
        { criterion: 'A real graph, really built', description: 'Thirty or more files from a repository the student did not write.', maxPoints: 20 },
        { criterion: 'Five questions answered', description: 'Cycles, order, most-depended-on, unreachable, clusters — with real output.', maxPoints: 25 },
        { criterion: 'The model stated', description: 'Node, edge and direction in words, matching what the code does.', maxPoints: 15 },
        { criterion: 'Algorithm per question', description: 'Each named, each justified in a sentence.', maxPoints: 15 },
        { criterion: 'Parser honesty', description: 'At least two real limitations, each with its effect on the answers.', maxPoints: 15 },
        { criterion: 'Size and representation', description: 'Nodes, edges, density, and what that justifies.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why must the repository be one you did not write?',
        [['Real graphs have cycles and dead files that generated ones do not', true],
          ['It prevents the analyser being tuned to the code', false],
          ['Unfamiliar code is harder to parse correctly', false],
          ['It makes the dependency count more realistic', false]],
        'Meeting the mess is the point of the exercise.'),
      mcq('Unreachable files are called "candidate" dead code because:',
        [['Dynamic and conditional imports escape a static parser', true],
          ['They may be reachable from a second entry point', false],
          ['Deleting code needs review regardless', false],
          ['The parser may have missed some import lines', false]],
        'Which is exactly what question 8 asks the student to name.'),
      mcq('The file with the most dependents is the riskiest to change because:',
        [['A break there propagates to everything above it', true],
          ['It is likely to be the largest file present', false],
          ['It sits at the root of the dependency order', false],
          ['It is the hardest file to test in isolation', false]],
        'Blast radius, which is what the in-degree is measuring.'),
    ],
  },

  /* ══ T3_CHOOSING_STRUCTURES ═════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CHOOSING_STRUCTURES_WHAT_THE_PROBLEM_DOES_MOST',
    notes: `Students choose structures by familiarity. Engineers choose by **the operation the
code performs most often**, and it is a short, mechanical process.

## The method

**1. List the operations, with rough frequencies.** Not "it stores users" — that describes the
data, and the data almost never decides. Instead:

- Look up by id — thousands of times per request
- Insert — once per request
- Iterate in name order — once per page load

**2. Find the one you do most.** In that list it is the lookup, by three orders of magnitude.

**3. Pick the structure that makes *that one* cheap.** Hash map. Everything else is negotiable.

**4. Check the others are survivable.** "Iterate in name order" on a hash map means sorting the
keys — acceptable once per page, unacceptable per request. If it were per request, the answer
changes to an ordered structure.

## The costs, as a table worth knowing

| | Lookup by key | Insert | Ordered iteration | Find min |
|---|---|---|---|---|
| **Array (unsorted)** | O(n) | O(1) at the end | sort first | O(n) |
| **Sorted array** | O(log n) | O(n) | free | O(1) |
| **Hash map** | O(1) | O(1) | sort first | O(n) |
| **Balanced tree** | O(log n) | O(log n) | free | O(log n) |
| **Heap** | O(n) | O(log n) | destroys it | O(1) |

**Read it by column, not by row.** Nothing wins every column, which is the entire point. Pick
the column your code lives in.

## Two frequency traps

**The rare operation that dominates the clock.** A nightly report that iterates in order runs
once a day and takes four hours — that matters more than a lookup running a million times in
microseconds. Frequency × cost, not frequency.

**The operation you forgot to list.** Deletion is the usual one. It is easy in a hash map, easy
in a tree, and unpleasant in a sorted array or a heap. Nobody lists it and everybody needs it.

## Small n

Below a few hundred elements, a linear scan of an array beats almost everything, because it is
contiguous in memory and there is no hashing, no pointer chasing and no allocation. Big-O says
nothing about constants, and at small n the constants are all there is.

**So: measure before optimising a small collection.** Replacing a 50-element list with a
dictionary is a common change that makes things very slightly worse and the code harder to read.`,
    mcqs: [
      mcq('The structure should be chosen from:',
        [['The operation the code performs most often', true],
          ['The kind of data being stored in it', false],
          ['The total number of items expected', false],
          ['The structure the team already uses', false]],
        '"It stores users" describes the data, and the data almost never decides.'),
      mcq('A nightly report taking four hours outweighs a microsecond lookup because:',
        [['What matters is frequency multiplied by cost', true],
          ['Batch work is harder to optimise later', false],
          ['Reports are more visible to the business', false],
          ['Lookups are already as fast as possible', false]],
        'The rare operation can still dominate the clock.'),
      mcq('The operation most often left off the list is:',
        [['Deletion', true], ['Insertion', false], ['Lookup', false], ['Counting', false]],
        'Easy in a map or a tree, unpleasant in a sorted array or a heap, needed by everybody.'),
      mcq('Below a few hundred elements, a plain array often wins because:',
        [['Contiguous memory beats hashing and pointer chasing', true],
          ['The asymptotic costs are equal at that size', false],
          ['Other structures cannot hold so few items', false],
          ['The data fits entirely in the CPU registers', false]],
        'Big-O says nothing about constants, and at small n constants are all there is.'),
    ],
    checkpoint: [
      mcq('Reading the cost table by column rather than by row shows that:',
        [['Nothing wins every column', true],
          ['Trees are the most balanced overall', false],
          ['Hash maps dominate in most situations', false],
          ['Arrays are the weakest of the five', false]],
        'Which is the entire point — pick the column your code lives in.'),
      mcq('Ordered iteration on a hash map is acceptable when:',
        [['It happens rarely, such as once per page load', true],
          ['The collection is smaller than a thousand items', false],
          ['The keys are already inserted in order', false],
          ['The sort is performed in a background job', false]],
        'Per page is fine; per request is not, and then the answer changes.'),
      mcq('Replacing a 50-element list with a dictionary usually:',
        [['Helps very slightly or not at all, and costs clarity', true],
          ['Improves lookup time by a large factor', false],
          ['Reduces the memory the collection uses', false],
          ['Makes the ordering behaviour more predictable', false]],
        'Measure before optimising a small collection.'),
    ],
  },

  {
    unitCode: 'T3_CHOOSING_STRUCTURES_TRADE_OFFS',
    notes: `Nothing is best. Every structure buys something with something, and the skill is
**stating the trade in one sentence**. A student who says "hash maps are fastest" has memorised
a preference; one who says "a hash map buys O(1) lookup with the loss of order and some wasted
space" has understood.

## What a hash map actually costs

Hash maps are the default in most codebases, and the reasons they are not free are worth
knowing precisely.

**Order is gone.** Not "differently ordered" — gone. Any order you observe is an implementation
detail of that language and version, and depending on it is a bug waiting for an upgrade. No
ranges, no nearest, no sorted iteration without sorting.

**Space is wasted on purpose.** A hash table has to stay mostly empty to stay fast. Beyond
roughly 70% full, collisions climb and performance falls off, so the table is grown and
rehashed. **You are paying for empty slots to buy constant-time lookup**, and that is the trade
in one sentence.

**O(1) is average, not worst.** Two keys can hash to the same bucket. With many collisions,
lookup degrades toward a scan of the bucket — and if an attacker can choose your keys, they can
force that deliberately. That is a real denial-of-service technique, which is why language
runtimes randomise their hash seed per process.

**Keys must be hashable and stable.** Mutate an object after using it as a key and you can no
longer find it: it hashes to a different bucket than the one it sits in. It is still there and
it is lost. This is the same class of bug as mutating an item inside a heap.

**Rehashing is a latency spike.** Growing the table is O(n) all at once. Average insert stays
O(1); the individual insert that triggers the growth does not, which matters when you have a
latency budget rather than a throughput target.

## The others, in one sentence each

- **Array** — buys the cheapest possible iteration and indexing, with O(n) search and expensive
  insertion in the middle.
- **Sorted array** — buys binary search and free ordered iteration, with O(n) insertion.
- **Balanced tree** — buys order and guaranteed worst-case bounds, with pointer overhead and a
  slower constant than a hash map.
- **Heap** — buys the cheapest possible "next best", with no search and no ordered iteration.
- **Linked list** — buys O(1) insertion and removal at a known position, with no indexing and
  terrible cache behaviour. Rarer than teaching suggests.

## The axes that actually differ

**Time against space.** A hash map, an index and a cache are all the same trade: memory spent to
avoid work.

**Read against write.** A sorted array and a database index are both cheap to read and expensive
to maintain. If writes dominate, they are the wrong answer.

**Average against worst case.** A hash map has a better average and a worse worst case than a
balanced tree. Which you want depends on whether you are optimising throughput or a latency
guarantee, and those are different jobs.

## How to say it

Not *"I used a hash map because it is fast."* Rather: **"Lookup by id is the dominant operation
and there is no ordering requirement, so I traded order and some memory for constant-time
lookup."** The second sentence is what an interviewer is listening for, and it is also just
true.`,
    mcqs: [
      mcq('A hash table is kept mostly empty because:',
        [['Collisions climb as it fills, and lookups slow', true],
          ['Empty slots make resizing cheaper later', false],
          ['The hash function needs spare range to work', false],
          ['It reserves room for keys yet to arrive', false]],
        'You are paying for empty slots to buy constant-time lookup. That is the trade.'),
      mcq('Mutating an object after using it as a dictionary key:',
        [['Leaves it present but unfindable', true],
          ['Raises an error on the next lookup', false],
          ['Silently updates the key in place', false],
          ['Causes the entry to be removed', false]],
        'It hashes to a different bucket than the one it sits in — same class as mutating a queued item.'),
      mcq('Hash collisions can be forced deliberately by an attacker, which is why:',
        [['Runtimes randomise their hash seed per process', true],
          ['Dictionaries reject untrusted keys by default', false],
          ['Hash functions are kept secret by implementers', false],
          ['Most languages limit dictionary size', false]],
        'Forced collisions degrade lookup to a scan — a real denial-of-service technique.'),
      mcq('Rehashing matters most when you have:',
        [['A latency budget rather than a throughput target', true],
          ['A collection that grows without bound', false],
          ['Keys that are expensive to hash', false],
          ['More reads than writes in the workload', false]],
        'Average insert stays O(1); the one that triggers growth does not.'),
    ],
    checkpoint: [
      mcq('Which statement shows understanding rather than preference?',
        [['No ordering is needed, so I traded order for O(1) lookup', true],
          ['A hash map is the fastest structure for lookups', false],
          ['A dictionary is the idiomatic choice in this language', false],
          ['Hash maps scale better than trees as data grows', false]],
        'The trade, stated in one sentence, with what was given up named.'),
      mcq('A hash map against a balanced tree, on worst case:',
        [['The tree guarantees its bound; the map does not', true],
          ['Both guarantee logarithmic behaviour', false],
          ['The map is better in the worst case too', false],
          ['Neither has a meaningful worst case', false]],
        'Which is why the choice depends on throughput against a latency guarantee.'),
      mcq('An index on a database column is the same trade as:',
        [['A cache — memory spent to avoid work', true],
          ['A heap — cheap access to the next item', false],
          ['A linked list — cheap insertion at a position', false],
          ['An array — contiguous storage for iteration', false]],
        'And like a cache, it costs on every write.'),
    ],
  },

  {
    unitCode: 'T3_CHOOSING_STRUCTURES_DEBUGGING',
    notes: `Five failures that are structure choices rather than code bugs. Each one is correct
code that is the wrong shape, which is why tests pass and production does not.

## 1. The accidental quadratic

    for item in items:              # 100,000
        if item.id in seen_ids:     # a LIST
            continue

**Symptom:** fine on 100 items, twenty minutes on 100,000, and no single slow line in the
profile. **Cause:** \`in\` on a list is O(n), inside a loop over n. **Fix:** a set. This is the
most common performance bug in existence and it never looks like one.

## 2. Sorting inside a loop

    for user in users:
        top = sorted(user.scores)[-3:]

**Symptom:** slow, and worse than linearly so. **Cause:** an O(m log m) sort per user, when
\`heapq.nlargest(3, ...)\` is O(m). **Tell:** a sort whose result you take three items from.

## 3. Membership on a list built once and read often

**Symptom:** a lookup that is inexplicably slow while the data "is not even that big".
**Cause:** the collection is read a thousand times per request and was never converted. **Fix:**
build the set once, outside the loop — and notice that building a set *inside* the loop is the
same bug wearing a fix.

## 4. Indexing a linked list

    node = head
    for _ in range(i):     # inside a loop over i
        node = node.next

**Symptom:** quadratic time on something that reads like a normal iteration. **Cause:** the
structure has no indexing, so position i costs i steps. **Fix:** iterate once, or use an array.

## 5. The dictionary that should have been ordered

**Symptom:** every read path calls \`sorted(d.items())\`. **Cause:** order was needed all along
and the structure does not provide it, so it is being recomputed per read. **Fix:** an ordered
structure, or maintain a sorted key list alongside — and then measure, because at small n the
sort may genuinely be cheaper.

## How to find these

**The tell is superlinear growth.** Double the input; if the time more than doubles, it is
structural. That single experiment finds all five, and it is quicker than reading the code.

**A profiler will not point at it.** The time is spread evenly across many cheap calls, so the
profile shows a flat line with no hotspot. A flat profile on slow code is itself the signal.

**Look for a container inside a loop.** \`in\`, \`.index()\`, \`sorted()\`, \`min()\` and
\`max()\` on a collection, inside iteration over that collection or another of similar size.
That grep finds most of them.`,
    mcqs: [
      mcq('`if x in some_list` inside a loop over n items is:',
        [['Quadratic, and the commonest performance bug there is', true],
          ['Linear, since each check is a single pass', false],
          ['Logarithmic, because the list stays sorted', false],
          ['Constant, as lists are indexed internally', false]],
        'Fine on 100, twenty minutes on 100,000, and never looks like a bug.'),
      mcq('`sorted(scores)[-3:]` should be:',
        [['nlargest, which is linear rather than n log n', true],
          ['a reversed sort, which avoids the slice', false],
          ['a sort into a new list, done once outside', false],
          ['max applied three times to the collection', false]],
        'The tell is a sort whose result you take three items from.'),
      mcq('The quickest way to identify a structural performance bug is:',
        [['Double the input and see if time more than doubles', true],
          ['Profile it and look for the slowest function', false],
          ['Read the loops and count the nesting', false],
          ['Compare the timing against a smaller dataset', false]],
        'One experiment, and it finds all five of these.'),
      mcq('A profiler often fails to point at these because:',
        [['The time is spread across many cheap calls', true],
          ['The slow calls are inside library code', false],
          ['The profiler samples too infrequently', false],
          ['The bug only appears at production scale', false]],
        'A flat profile on slow code is itself the signal.'),
    ],
    checkpoint: [
      mcq('Building the set inside the loop instead of outside is:',
        [['The same bug wearing a fix', true],
          ['A correct fix with a small constant cost', false],
          ['Better than a list but worse than a dict', false],
          ['Acceptable when the loop runs rarely', false]],
        'You have moved the O(n) work, not removed it.'),
      mcq('Indexing a linked list in a loop is quadratic because:',
        [['Position i costs i steps, and i grows', true],
          ['Each node allocation is a separate cost', false],
          ['The list must be traversed twice per index', false],
          ['Cache misses make each step more expensive', false]],
        'The structure has no indexing; asking for it anyway pays each time.'),
      mcq('One grep that finds most of these is:',
        [['A container operation inside a loop over a collection', true],
          ['Any nested loop in the codebase', false],
          ['Every call to sorted or min in the file', false],
          ['Any list declared outside a function', false]],
        '`in`, `.index()`, `sorted()`, `min()`, `max()` inside iteration.'),
    ],
  },

  {
    unitCode: 'T3_CHOOSING_STRUCTURES_PRACTICE',
    notes: `Two exercises, both of which punish the wrong structure with time rather than with a
wrong answer — which is how this failure presents in real work.

The hidden cases are large enough that a quadratic solution will not finish.`,
    coding: [
      {
        title: 'The accidental quadratic, fixed',
        description: `First line: a list of integers, the records. Second line: a list of
integers, the ids to check.

Print how many of the second list appear in the first.

The visible cases are small and any approach passes them. The hidden cases are large enough that
an O(n×m) solution will time out, which is exactly how this bug behaves in production.`,
        starter: `import sys

records = [int(x) for x in sys.stdin.readline().split()]
queries = [int(x) for x in sys.stdin.readline().split()]

# TODO: which operation is performed most, and what makes that one cheap?
`,
        language: 'python',
        tests: [
          { input: '1 2 3 4 5\n3 5 9\n', expectedOutput: '2' },
          { input: '1 1 1\n1 2\n', expectedOutput: '1' },
          { input: '\n1 2\n', expectedOutput: '0' },
          { input: '7 8\n\n', expectedOutput: '0', isHidden: true },
          { input: '5 5 5 5\n5 5 5\n', expectedOutput: '3', isHidden: true },
        ],
      },
      {
        title: 'Top three per group, cheaply',
        description: `Lines of \`group score\`. Print each group on its own line as
\`group s1 s2 s3\` — its three highest scores, descending, with fewer than three printed if that
is all there is.

Groups sorted alphabetically. Empty input prints nothing.

Sorting every group's scores passes. It is not the answer this unit wants: state the cost of
both in your write-up.`,
        starter: `import sys, heapq

rows = [l.split() for l in sys.stdin if l.split()]

# TODO: you need three items, not an ordering. What does that suggest?
`,
        language: 'python',
        tests: [
          { input: 'a 5\na 1\na 9\na 3\nb 2\n', expectedOutput: 'a 9 5 3\nb 2' },
          { input: 'x 1\nx 2\n', expectedOutput: 'x 2 1' },
          { input: '', expectedOutput: '' },
          { input: 'g -1\ng -5\ng -3\ng -2\n', expectedOutput: 'g -1 -2 -3', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Choosing a Structure Practice',
      description: 'Two problems where the wrong structure costs time rather than correctness.',
      instructions: `Complete both exercises, then answer:

1. For the first: state the cost of the naive version and of yours, in terms of n and m. Then
   say what "the hidden cases time out" tells you that a wrong answer would not.
2. For the first: describe the doubling experiment you would run to detect this bug in code you
   had not read, and what result would confirm it.
3. For the second: state the cost of sorting each group against the cost of your approach, in
   terms of the group size m.
4. For the second: at roughly what group size does the difference start to matter? You may
   measure rather than reason — say which you did.
5. Pick any collection in your own code from the last month. Write the four-line analysis from
   the first unit of this topic: the operations, their frequencies, the dominant one, and
   whether the structure you used was right. Be willing to conclude that it was.`,
      rubric: [
        { criterion: 'Membership, cheaply', description: 'Passes at scale; the dominant operation is made constant.', maxPoints: 20 },
        { criterion: 'Both costs stated', description: 'Naive and improved, in terms of n and m.', maxPoints: 15 },
        { criterion: 'The doubling experiment', description: 'Described concretely, with the confirming result named.', maxPoints: 15 },
        { criterion: 'Top three without sorting', description: 'Correct across groups, negatives and short groups.', maxPoints: 20 },
        { criterion: 'Where it starts to matter', description: 'A size, with whether it was measured or reasoned.', maxPoints: 15 },
        { criterion: 'Your own code, analysed', description: 'A real collection, four lines, honest conclusion either way.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

records = [int(x) for x in sys.stdin.readline().split()]
queries = [int(x) for x in sys.stdin.readline().split()]
`,
        tests: [
          { input: '1 2 3 4 5\n3 5 9\n', expectedOutput: '2' },
          { input: '1 1 1\n1 2\n', expectedOutput: '1' },
          { input: '\n1 2\n', expectedOutput: '0' },
          { input: '5 5 5 5\n5 5 5\n', expectedOutput: '3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A timeout rather than a wrong answer tells you:',
        [['The logic is right and the shape is wrong', true],
          ['The input was larger than the problem allows', false],
          ['The solution has an infinite loop somewhere', false],
          ['The structure is correct but poorly used', false]],
        'Which is exactly how this class of bug presents in production.'),
      mcq('Wanting three items rather than an ordering suggests:',
        [['A heap, which is linear rather than n log n', true],
          ['A sorted array, rebuilt as scores arrive', false],
          ['A dictionary keyed on the score value', false],
          ['A full sort, since three is a small slice', false]],
        'The tell is a sort whose result you take a few items from.'),
      mcq('The four-line analysis asks for the operations and:',
        [['Their frequencies, the dominant one, and whether you were right', true],
          ['Their costs, the total, and the structure to use', false],
          ['The data type, the size, and the access pattern', false],
          ['The reads, the writes, and the ratio between them', false]],
        'And being willing to conclude your original choice was fine.'),
    ],
  },

  {
    unitCode: 'T3_CHOOSING_STRUCTURES_MINI_PROJECT',
    notes: `Take one problem, solve it four ways, and measure. Then say which you would ship.

The brief is built so that **no single implementation wins**, which is the lesson of the topic
made unavoidable rather than asserted. A student who reports one structure winning every
measurement has either measured wrong or chosen a workload too narrow to be interesting, and the
brief asks for two workloads precisely to prevent that.

Budget around two hours, most of it on the measurement and the write-up.`,
    assignment: {
      title: 'Mini Project — Four Structures, One Problem',
      description: 'Implement a leaderboard four ways, measure both workloads, and defend one for production.',
      instructions: `**The problem**

A leaderboard supporting:

- \`submit(player, score)\` — a new score for a player, replacing their old one
- \`rank(player)\` — the player's position, 1 for the highest score
- \`top(k)\` — the highest k players in order
- \`around(player, n)\` — the n players immediately above and below
- \`count()\` — how many players there are

**Implement it four times**

1. An unsorted list, scanned as needed.
2. A dictionary from player to score, plus whatever you sort on demand.
3. A sorted structure kept sorted on every write.
4. A heap, plus whatever it needs to make the other operations possible.

Number four will be awkward. Say exactly where and why — that is part of the answer, not a
failure.

**Measure, on two workloads**

- **Write-heavy:** 100,000 submits, 1,000 reads.
- **Read-heavy:** 1,000 submits, 100,000 reads, mixed across \`rank\`, \`top\` and \`around\`.

Report a table: four implementations × two workloads × total time. Report memory too, however
crudely, and say how you measured it.

**Then answer**

1. Which implementation won each workload? If the same one won both, say what that suggests
   about your workloads and consider whether they were different enough.
2. For each implementation, state its trade in **one sentence** of the form "buys X at the cost
   of Y".
3. Which operation was hardest for the heap, and why does that follow from what a heap promises?
4. Which would you ship, and for which workload? Change the assumed workload and say whether
   your answer changes.
5. At 100 players instead of 100,000, does your answer change? Measure rather than guess.
6. Name one thing your measurement does not capture that would matter in production.

**Submit** the four implementations, the timing table, and the answers to 1–6.`,
      rubric: [
        { criterion: 'Four working implementations', description: 'All five operations correct in each, including the awkward heap.', maxPoints: 25 },
        { criterion: 'Two workloads measured', description: 'A real table, both workloads, time and some memory figure.', maxPoints: 20 },
        { criterion: 'Four trades in one sentence each', description: 'Buys X at the cost of Y, accurately, for all four.', maxPoints: 20 },
        { criterion: 'The heap’s hard operation', description: 'Identified and traced back to what a heap promises.', maxPoints: 10 },
        { criterion: 'A defended choice', description: 'Ships one, names the workload, and says what would change it.', maxPoints: 15 },
        { criterion: 'Small n, measured', description: 'Re-run at 100 players, with the conclusion drawn from numbers.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('If one implementation wins both workloads, the likely explanation is:',
        [['The two workloads were not different enough', true],
          ['That structure is genuinely the best choice', false],
          ['The measurement was too short to separate them', false],
          ['The other three were implemented poorly', false]],
        'The brief uses two workloads precisely to make a single winner suspicious.'),
      mcq('`around(player, n)` is hardest for the heap because:',
        [['A heap promises the top and nothing about neighbours', true],
          ['A heap cannot hold the player identifiers', false],
          ['Removing from the middle of a heap is costly', false],
          ['The heap would need to be rebuilt each call', false]],
        'Everything a heap is bad at follows from the one thing it promises.'),
      mcq('Re-running at 100 players is in the brief because:',
        [['Constants dominate at small n and can reverse the answer', true],
          ['Small datasets are more common in practice', false],
          ['It checks the implementations for correctness', false],
          ['It shows the measurements are repeatable', false]],
        'Measure rather than guess — the same instruction as the first unit of the topic.'),
    ],
  },
];
