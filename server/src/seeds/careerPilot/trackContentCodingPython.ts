/**
 * Career-track content, Year-4 placement for Python Full Stack + AI:
 *   JT_CODING_PYTHON      — coding rounds in Python (the language habits, five timed rounds, a code-reading checkpoint)
 *   JT_MCQ_PYTHON_DJANGO  — the Python, Django, DRF and FastAPI sections of a company online test
 *
 * Students have finished the track's Python and DSA topics, so nothing here re-teaches a structure: it is the
 * round itself — the problem a campus online assessment sets, the Python that solves it inside the clock, and
 * the Python habits that lose marks. The problems differ from the Java rounds and from the track's earlier
 * exercises.
 *
 * Every auto-graded exercise was checked before it shipped: a reference solution (not included here) passed
 * every test, including the large hidden ones, well inside a second, and was cross-checked against a brute force
 * on random small inputs; every starter fails. The judge runs Python 3.10, so nothing here needs a newer
 * version. Every "what does this print" answer was run; every Django, DRF and FastAPI behaviour was checked on
 * Django 5.2, DRF 3.18, Simple JWT and FastAPI 0.14x with Pydantic 2.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/* Large test inputs are built, not pasted: they exist to catch an O(n²) loop, a per-window rebuild or a deep recursion. */
const seq = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => String(f(i))).join(' ');

/* ══ JT_CODING_PYTHON — Coding Rounds in Python ═══════════════════════════════════════════ */

const CODING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_CODING_PYTHON_PYTHON_FOR_CODING',
    notes: `A coding round grades two things at once: whether your algorithm is right, and whether your Python
gets it to the judge inside the time limit. Python is slower per operation than Java or C++, so the same O(n log n)
idea passes or fails on details — how you read input, which structure you pop from, whether you recurse. These are
the questions interviewers and proctors actually ask about Python in a coding round, and the habits behind them.

## Q1. "Your O(n log n) solution timed out on n = 2×10⁵. What do you check first?"

**Strong answer.** "Input and output before the algorithm. Calling \`input()\` 2×10⁵ times is slow; I read
everything at once and split it into tokens, then walk the tokens with an index or an iterator. For output I collect
the answers and print once with \`join\`."

    import sys

    def main():
        data = sys.stdin.buffer.read().split()      # every token on every line, as bytes
        n = int(data[0])
        a = list(map(int, data[1:1 + n]))
        ...
        sys.stdout.write("\\n".join(map(str, answers)) + "\\n")

    main()

**Likely follow-up.** "Why put the code inside \`main()\`?" — local variables are looked up faster than globals,
which is measurable in a loop that runs millions of times.

**Common wrong answers.** "Python is just too slow" (the same algorithm usually passes with fast I/O); "use
threads" (the GIL means threads do not speed up pure-Python work).

## Q2. "You read a word with sys.stdin.readline() and the length is one more than expected. Why?"

**Strong answer.** "\`readline()\` keeps the trailing newline: \`"abc\\n"\` has length 4. I call \`.strip()\` (or
\`.rstrip("\\n")\` if spaces matter), or I use \`read().split()\`, which never returns whitespace."

**Follow-up.** "And \`input()\`?" — \`input()\` strips the newline itself, which is one reason it is slower.

## Q3. "Which of Counter, defaultdict and deque would you reach for, and when?"

**Strong answer.**
- \`Counter(iterable)\` counts in one line; a missing key reads as 0 **without** being inserted; \`most_common(k)\`
  gives the top k; two Counters compare equal when their counts match.
- \`defaultdict(list)\` builds adjacency lists and groups: \`graph[u].append(v)\`. Reading a missing key **inserts** it.
- \`deque\` is the queue for BFS: \`append\` and \`popleft\` are O(1). \`list.pop(0)\` shifts every element, so a BFS
  that uses it is O(n²).

**Common wrong answer.** "A list works as a queue" — it works, and it times out on 10⁵ pops.

## Q4. "Python has no max-heap. How do you get one, and how do you heap pairs?"

**Strong answer.** "\`heapq\` is a min-heap on a plain list. For a max-heap I push negated keys and negate on the way
out. Pairs are tuples compared element by element, so \`(cost, node)\` pops the smallest cost first. If two costs can
tie and the second element is not comparable — a dict, or a custom object — Python compares them and raises
\`TypeError\`, so I add a counter: \`(cost, seq, item)\`."

    heapq.heappush(h, -x)          # max-heap of numbers
    biggest = -heapq.heappop(h)

**Follow-up.** "Cost of building a heap from n values?" — \`heapify\` is O(n); n pushes are O(n log n). And a list is
only a heap after \`heapify\`: \`heappush\` onto an unsorted list does not fix it.

## Q5. "Where does bisect help in a round?"

**Strong answer.** "On a sorted list, \`bisect_left(a, x)\` is how many values are **less than** x and
\`bisect_right(a, x)\` how many are **at most** x, both in O(log n). Their difference counts the copies of x; for a
range [lo, hi] it is \`bisect_right(a, hi) - bisect_left(a, lo)\`. It is also binary search without writing the
loop."

**Follow-up.** "Is \`insort\` O(log n)?" — finding the place is; inserting into a list shifts elements, so it is O(n).

## Q6. "Your recursive DFS passes the samples and fails on a path of 10⁵ nodes. What happened?"

**Strong answer.** "CPython's default recursion limit is 1000, so it raised \`RecursionError\`. Raising it with
\`sys.setrecursionlimit(10**6)\` removes the Python check but not the C stack underneath — on a deep enough input the
interpreter itself can crash with no traceback at all. In a round I write DFS with an explicit stack, or use BFS or
union-find. It is the same algorithm, just safe."

    stack = [start]
    seen[start] = True
    while stack:
        u = stack.pop()
        for v in graph[u]:
            if not seen[v]:
                seen[v] = True
                stack.append(v)

**Follow-up.** "And \`@lru_cache\` on a recursive DP?" — the cache does not reduce the depth of the first call;
\`f(10**5)\` still recurses 10⁵ deep. Fill a table bottom-up instead.

## Q7. "What is wrong with building the answer string with += in a loop?"

**Strong answer.** "Strings are immutable, so each \`+=\` may copy everything so far — O(n²) for n pieces. CPython
sometimes optimises an append in place, but that is an implementation detail, and prepending (\`res = ch + res\`)
always copies. I append to a list and \`''.join\` it once."

## Q8. "Python ints never overflow. So is there anything to watch with big numbers?"

**Strong answer.** "Correctness, no: \`2**100\` is exact. Time, yes: arithmetic on numbers with thousands of digits
costs more than a machine word, so when the problem says 'modulo 10⁹ + 7' I take the remainder at every step
instead of once at the end. And I keep big values out of floats — \`int(1e23)\` is 99999999999999991611392, because
1e23 was a float before it was an int. Use \`//\` for integer division; \`/\` always returns a float."

## Q9. "Name the Python mistakes that cost marks in a timed round."

**Strong answer.**
- Printing a list directly — \`print(ans)\` shows \`[1, 2, 3]\`; the judge wants \`1 2 3\` (\`print(*ans)\`).
- \`grid = [[0] * m] * n\` — every row is the same list; build rows with a comprehension.
- A mutable default argument (\`def dfs(u, seen=set())\`) that keeps its contents between test cases.
- \`round(2.5)\` is 2 (round half to even); use \`int(x + 0.5)\` for non-negative x if the problem rounds half up.
- \`is\` to compare numbers or strings; it compares identity. Use \`==\`.
- Leftover debug prints — the judge compares the whole output.

**Follow-up.** "How do you check before submitting?" — the sample, n = 1, all-equal values, the largest values and
the largest n (time).`,
    workedExample: `**Goal: a timed-round template, then one problem solved in it — "print the k most frequent words, ties in
alphabetical order".**

**1. The template you type at the start of every round.**

    import sys
    from collections import Counter, defaultdict, deque
    import heapq

    def main():
        data = sys.stdin.read().split()
        n, k = int(data[0]), int(data[1])
        words = data[2:2 + n]
        out = []
        # ... solve, appending to out ...
        print("\\n".join(out))

    main()

**2. Choose the idea before typing.** Count with \`Counter\` — O(n). Sorting all m distinct words by (−count, word)
is O(m log m). \`heapq.nsmallest(k, ...)\` with the same key is O(m log k), better when k is small.

**3. The solving part.**

    freq = Counter(words)
    top = heapq.nsmallest(k, freq.items(), key=lambda kv: (-kv[1], kv[0]))
    for word, c in top:
        out.append(f"{word} {c}")

For "to be or not to be that is the question to be" and k = 3 this gives \`be 3\`, \`to 3\`, \`is 1\`.

**4. Say the checks aloud.** "The key negates the count so the highest count sorts first, and the word breaks ties
alphabetically; k larger than the number of distinct words just returns them all; I did not use \`most_common\`
because its tie order is first-seen, not alphabetical."

**5. State the cost.** Time O(n + m log k), extra space O(m). Input read once, output printed once.`,
    mcqs: [
      mcq('A solution reads 200 000 numbers by calling `int(input())` in a loop and times out. Which change most directly fixes it?',
        [['Store the numbers in a tuple, not a list', false],
         ['Read every token at once with sys.stdin', true],
         ['Wrap the loop in try/except EOFError', false],
         ['Convert each one with float() instead', false]],
        'Each input() call has fixed overhead, paid 200 000 times. Reading the whole input once and splitting it into tokens removes almost all of it; the other changes do not touch the per-call cost.'),
      mcq('A Dijkstra solution pushes `(dist, {"id": node})` onto a heapq heap. Two entries end up with the same dist. What happens?',
        [['The older entry is popped first', false],
         ['The heap pops them in random order', false],
         ['The dicts are compared and raise TypeError', true],
         ['heappush silently drops the second entry', false]],
        'Tuples compare element by element, so a tie on dist makes Python compare the dicts, and dicts do not support <. Put a comparable tiebreaker before the payload, such as (dist, counter, item), or push the plain node id.'),
      mcq('A BFS on 100 000 nodes uses a list as its queue and removes from the front with `queue.pop(0)`. What is the cost of the removals?',
        [['O(n) in total, one O(1) pop per node', false],
         ['O(n log n), as the list is resized by halves', false],
         ['O(1) in total, as pop is constant time', false],
         ['O(n²) in total, as each pop shifts the rest', true]],
        'pop(0) moves every remaining element one slot left, so n removals cost about n²/2 moves. collections.deque.popleft is O(1), which keeps BFS linear.'),
    ],
    checkpoint: [
      ck('PYTHON_BASICS', '`g = defaultdict(list)`, then the code runs `g["a"]` on its own line and evaluates `"b" in g`. What are `"b" in g` and `len(g)` afterwards?',
        [['False and 1', true],
         ['True and 2', false],
         ['False and 0', false],
         ['True and 1', false]],
        'Reading a missing key of a defaultdict creates it, so g["a"] inserts an empty list and len(g) is 1. The in operator only checks membership and never calls the factory, so "b" is not added.'),
      ck('PYTHON_BASICS', 'A solution calls `sys.setrecursionlimit(10**7)` and then a recursive DFS on a 10⁶-node path. What is the realistic risk?',
        [['None: the new limit makes deep recursion safe', false],
         ['A RecursionError at depth 1000 regardless', false],
         ['A slower run, but always a correct answer', false],
         ['The interpreter can crash on the C stack', true]],
        'setrecursionlimit only lifts Python\'s own counter; each Python call still uses C stack, which is finite. Deep enough, the process dies with a segmentation fault and no traceback. An explicit stack avoids the problem entirely.'),
      ck('PYTHON_BASICS', 'With `a = [1, 3, 3, 3, 7]`, what are `bisect_left(a, 3)`, `bisect_right(a, 3)` and `bisect_left(a, 4)`?',
        [['1, 3 and 4', false],
         ['1, 4 and 4', true],
         ['0, 3 and 3', false],
         ['1, 4 and 5', false]],
        'bisect_left(a, 3) counts values below 3 (just the 1), bisect_right(a, 3) counts values at most 3 (four of them), and 4 would be inserted before 7 at index 4. The difference 4 − 1 = 3 is the number of 3s.'),
    ],
  },

  /* ── Round 1: arrays and strings ── */
  {
    unitCode: 'JT_CODING_PYTHON_ROUND_ARRAYS_STRINGS',
    notes: `Arrays and strings open almost every campus online assessment. The patterns are prefix and suffix
passes, two pointers and sliding windows; the Python traps are slicing inside a loop (a slice is a copy), rebuilding
a Counter for every window, and \`+=\` on strings. For each problem: decide the pattern **before** reading the
approach.

## Problem 1 — Product of the array except self

*Print, for each index, the product of every other element. No division (an element may be 0).*

**Approach.** The answer at i is (product of everything left of i) × (product of everything right of i). One pass
left to right stores the left products; one pass right to left multiplies in the right products.

    def product_except_self(a):
        n = len(a)
        out = [1] * n
        left = 1
        for i in range(n):
            out[i] = left
            left *= a[i]
        right = 1
        for i in range(n - 1, -1, -1):
            out[i] *= right
            right *= a[i]
        return out

\`[1, 2, 3, 4]\` → \`[24, 12, 8, 6]\`; \`[2, 0, 3]\` → \`[0, 6, 0]\`.

**Complexity.** O(n) time, O(1) extra besides the output. Division fails on zeros; the nested loop is O(n²).

## Problem 2 — Shortest subarray with sum at least S (positive values)

**Approach.** A sliding window: grow the right end; while the sum reaches S, record the length and shrink from the
left. It works **because every value is positive** — shrinking always lowers the sum.

    def shortest_at_least(a, target):
        best = len(a) + 1
        total = left = 0
        for right, x in enumerate(a):
            total += x
            while total >= target:
                best = min(best, right - left + 1)
                total -= a[left]
                left += 1
        return best if best <= len(a) else 0

\`[2, 3, 1, 2, 4, 3]\`, S = 7 → 2 (\`[4, 3]\`).

**Complexity.** O(n): each index enters and leaves the window once. With negative values this breaks — the
interviewer's follow-up — and you need prefix sums with a monotonic deque.

## Problem 3 — Does s contain a permutation of p?

**Approach.** A fixed window of length len(p). Keep a Counter of the window and update it by one character in and
one out, instead of rebuilding it each step.

    def has_permutation(p, s):
        k = len(p)
        if k > len(s):
            return False
        need = Counter(p)
        window = Counter(s[:k])
        if window == need:
            return True
        for i in range(k, len(s)):
            window[s[i]] += 1
            window[s[i - k]] -= 1
            if window[s[i - k]] == 0:
                del window[s[i - k]]          # keep zero counts out, so == is exact
            if window == need:
                return True
        return False

**Complexity.** O(n · σ) for an alphabet of σ letters (the comparison), effectively O(n). \`Counter(s[i:i+k])\` per
step is O(n · k).

## Problem 4 — Container with the most water

*Lines of heights h; pick two so the area (distance × shorter height) is largest.*

**Approach.** Two pointers at the ends. The area is limited by the shorter line, so moving the **taller** one can
never help; move the shorter one inward.

    i, j, best = 0, len(h) - 1, 0
    while i < j:
        best = max(best, (j - i) * min(h[i], h[j]))
        if h[i] < h[j]:
            i += 1
        else:
            j -= 1

\`[1, 8, 6, 2, 5, 4, 8, 3, 7]\` → 49.

**Complexity.** O(n), against O(n²) for every pair.

## Round habit

Before typing: name the pattern, the cost, and what makes the window valid. After typing: run the sample, a
single element, all-equal values and a case with no answer.`,
    mcqs: [
      mcq('`product_except_self([1, 0, 3, 0])` — what does the two-pass solution return?',
        [['[0, 3, 0, 0]', false],
         ['[0, 0, 0, 0]', true],
         ['[0, 0, 0, 3]', false],
         ['A ZeroDivisionError', false]],
        'With two zeros, every index has at least one other zero among the remaining elements, so every product is 0. The two-pass method never divides, which is why zeros need no special case.'),
      mcq('Why does the shrink-from-the-left window for "shortest subarray with sum ≥ S" need all values positive?',
        [['Python slices cannot have negative indices', false],
         ['So that min() never compares negative lengths', false],
         ['Removing an element must lower the sum', true],
         ['Because the answer must be counted modulo S', false]],
        'The window shrinks while the sum is still at least S, trusting that dropping the left value moves the sum down. With negatives, dropping a value can raise the sum, so a valid shorter window can be skipped.'),
      mcq('A permutation check rebuilds `Counter(s[i:i + k])` at every index of a 10⁵-character s with k = 5 000. Roughly how much work is that?',
        [['About 5×10⁸ character steps, too slow', true],
         ['About 10⁵ steps, as Counter is O(1)', false],
         ['About 5 000 steps, one per window letter', false],
         ['About 10⁵ log 10⁵ steps, from hashing', false]],
        'Each slice copies k characters and each Counter counts them, for roughly n × k = 5×10⁸ operations. Updating one Counter by the letter entering and the letter leaving makes each step O(1).'),
      mcq('In the container problem the pointers sit on heights 4 (left) and 9 (right). Which pointer moves, and why?',
        [['The right one, since 9 is the larger height', false],
         ['The left one, since height 4 limits every area', true],
         ['Both, so the width shrinks twice as fast', false],
         ['Neither: the best area must be recorded first', false]],
        'Any container using the left line of height 4 with a closer right line is narrower and still capped at 4, so it can never beat the current one. Moving the shorter side is the only move that might find a taller limit.'),
      mcq('In Python, what is the cost of `s[i:j]` inside a loop?',
        [['O(1), since slices are views into s', false],
         ['O(log n), since strings are trees', false],
         ['O(j − i), since it copies the characters', true],
         ['O(n), whatever i and j are', false]],
        'A string slice builds a new string of j − i characters. Done once per iteration, it can turn a linear loop into a quadratic one; compare characters by index, or keep a running window instead.'),
    ],
    assignment: {
      title: 'Smallest Window Covering a Pattern',
      description: 'A sliding-window string problem: the shortest stretch of s that contains every character of t, counting repeats.',
      instructions: `Given a string s and a pattern t (lowercase letters), find the length of the shortest contiguous
substring of s that contains every character of t, **with multiplicity** — if t is "aab", the window needs two a's
and one b. Print -1 if no window exists.

**Input.** Line 1: s (1 ≤ |s| ≤ 200 000). Line 2: t (1 ≤ |t| ≤ 200 000).

**Output.** One integer: the length of the shortest window, or -1.

| Input | Output |
|---|---|
| \`adobecodebanc\` / \`abc\` | \`4\` |
| \`a\` / \`aa\` | \`-1\` |
| \`placementdrive\` / \`eee\` | \`10\` |

Requirements:

- O(|s| + |t|) time: grow the window on the right, and while it covers t, record its length and shrink it from the
  left. Keep a count of characters still **missing** so checking "does it cover t?" is O(1), not a Counter
  comparison or a rescan.
- One hidden test has |s| = 200 000; trying every start position times out on it.
- Read with \`sys.stdin\` and print only the number.
- Write the time and space cost in a comment at the top.`,
      rubric: [
        { criterion: 'Correct length', description: 'Every test passes, including repeated pattern letters, no possible window and the 200 000-character inputs.', maxPoints: 50 },
        { criterion: 'Linear sliding window', description: 'One left and one right pointer; coverage tracked with counts and a missing counter, not rebuilt per window.', maxPoints: 35 },
        { criterion: 'Stated cost and clean output', description: 'The cost is stated in a comment, and only the number is printed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
from collections import Counter


def main():
    data = sys.stdin.read().split()
    s, t = data[0], data[1]

    # TODO: slide a window over s, tracking how many characters of t are still missing
    # TODO: print the shortest covering length, or -1


main()
`,
        tests: [
          { input: 'adobecodebanc\nabc\n', expectedOutput: '4' },
          { input: 'a\naa\n', expectedOutput: '-1' },
          { input: 'placementdrive\neee\n', expectedOutput: '10' },
          { input: 'baab\naab\n', expectedOutput: '3', isHidden: true },
          { input: 'xyz\nzyx\n', expectedOutput: '3', isHidden: true },
          { input: 'a'.repeat(199999) + 'b\nab\n', expectedOutput: '2', isHidden: true },
          { input: 'ab'.repeat(100000) + '\n' + 'b'.repeat(100001) + '\n', expectedOutput: '-1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 2: hashing ── */
  {
    unitCode: 'JT_CODING_PYTHON_ROUND_HASHING',
    notes: `Hashing turns "have I seen this before?" from a scan into an O(1) lookup. In an OA the signal is a brute
force whose inner loop is *searching* for a value: a \`dict\`, \`set\` or \`Counter\` usually removes it. Say "expected
O(1)" — a dict has a worst case — and remember that only hashable values can be keys: a tuple yes, a list no.

## Problem 1 — Longest stretch with equal 0s and 1s

*Given a list of 0s and 1s, print the length of the longest contiguous part with as many 0s as 1s.*

**Approach.** Count a 1 as +1 and a 0 as −1. A stretch is balanced when the running balance is the same at both its
ends. Store the **first** index each balance appears at; the longest stretch ending at i starts just after it.

    def longest_balanced(bits):
        first = {0: -1}                  # balance 0 "seen" before the start
        bal = best = 0
        for i, b in enumerate(bits):
            bal += 1 if b == 1 else -1
            if bal in first:
                best = max(best, i - first[bal])
            else:
                first[bal] = i           # only the first time: it gives the longest span
        return best

\`[0, 1, 1, 0, 1, 1, 1, 0]\` → 4.

**Complexity.** O(n) expected time, O(n) space. Checking every pair of ends is O(n²).

## Problem 2 — First character that does not repeat

    def first_unique(s):
        count = Counter(s)
        for i, ch in enumerate(s):
            if count[ch] == 1:
                return i
        return -1

\`"swiss"\` → 1 (the w); \`"aabb"\` → -1.

**Complexity.** Two passes, O(n). Looping over \`count.items()\` would also work, because dicts (and so Counters) keep
insertion order since Python 3.7 — but looping over s says what you mean.

## Problem 3 — Pairs of equivalent dominoes

*A domino (a, b) equals (b, a). Count index pairs i < j whose dominoes are equal.*

**Approach.** Normalise each domino to a canonical key, count the keys, and add c·(c−1)/2 for each count c.

    def domino_pairs(dominoes):
        seen = Counter((min(a, b), max(a, b)) for a, b in dominoes)
        return sum(c * (c - 1) // 2 for c in seen.values())

\`(1,2) (2,1) (3,4) (5,6) (1,2)\` → 3.

**Complexity.** O(n). The key is a tuple because a list is unhashable — \`Counter([[1, 2]])\` raises \`TypeError\`.

## Problem 4 — Four lists, sums to zero

*Count tuples (i, j, k, l) with A[i] + B[j] + C[k] + D[l] = 0; each list has up to 500 values.*

**Approach.** Meet in the middle: count every A + B sum in a Counter (n² entries), then for every C + D look up
its negation.

    ab = Counter(a + b for a in A for b in B)
    total = sum(ab[-(c + d)] for c in C for d in D)

**Complexity.** O(n²) time and space against O(n⁴) for four loops — 250 000 operations instead of 6×10¹⁰. Note
\`ab[key]\` on a Counter returns 0 for a missing key **without** inserting it, so the lookups do not grow the dict.

## Round habit

If the keys are small integers (marks 0–100, lowercase letters), a list of counts beats a dict. Say the space cost
out loud: a dict of 10⁶ entries is tens of megabytes in Python.`,
    mcqs: [
      mcq('In the equal-0s-and-1s solution, why is `first[bal]` set only when bal has not been seen before?',
        [['Updating it would raise a KeyError', false],
         ['The earliest index gives the longest span', true],
         ['Dicts cannot store negative keys', false],
         ['It keeps the dict sorted by index', false]],
        'For a later index with the same balance, the span is i − first[bal], so the earliest start maximises it. Overwriting with later indices would shrink every answer after the first repeat.'),
      mcq('`count = Counter(s)` followed by `for ch, c in count.items(): if c == 1: return ch`. For "swiss", what is returned?',
        [['"w", the first non-repeating character', true],
         ['"i", the last non-repeating character', false],
         ['Either, depending on the hash seed', false],
         ['"s", the most frequent character', false]],
        'Since Python 3.7 a dict keeps insertion order, and Counter is a dict, so items() yields s, w, i in first-seen order and w is the first with count 1. Before 3.7 this order was not guaranteed.'),
      mcq('A solution counts dominoes with `Counter([sorted(d) for d in dominoes])`. What happens?',
        [['It counts correctly, since sorted lists compare equal', false],
         ['It counts only the dominoes already in order', false],
         ['TypeError, as a list is unhashable', true],
         ['It counts each domino twice', false]],
        'sorted() returns a list, and a list cannot be a dict key because it is mutable. Converting to a tuple, tuple(sorted(d)), or building (min, max) gives a hashable key.'),
      mcq('In the four-lists solution, each of the 250 000 lookups is `ab[-(c + d)]`, and most sums are absent. How large does ab grow?',
        [['It stays the same size: a missing key reads as 0', true],
         ['By one entry per lookup, to 500 000 entries', false],
         ['It doubles, as Counter caches the misses', false],
         ['It raises KeyError on the first missing sum', false]],
        'Counter overrides __missing__ to return 0 without storing anything. A defaultdict(int) would insert every missed key, and a plain dict would raise KeyError.'),
    ],
    assignment: {
      title: 'The Most Varied Stretch of Days',
      description: 'A hashing window problem: the k consecutive days with the most distinct products sold, without rebuilding a set per window.',
      instructions: `A shop records the product id of its best-seller on each of n days. For every stretch of k
consecutive days, count the **distinct** product ids. Print the largest count, and the first day (1-based) of the
earliest stretch that has it.

**Input.** Line 1: \`n k\` (1 ≤ k ≤ n ≤ 200 000). Then n product ids (1 ≤ id ≤ 10⁹), separated by spaces or new
lines.

**Output.** Two integers on one line: \`<largest distinct count> <starting day>\`.

| Input | Output |
|---|---|
| \`7 3\` / \`1 2 1 3 4 2 3\` | \`3 2\` |
| \`5 2\` / \`4 4 4 4 4\` | \`1 1\` |
| \`4 4\` / \`1 2 3 1\` | \`3 1\` |

Requirements:

- O(n) expected time. Keep a dict of counts for the current window: add the day entering, decrement the day
  leaving, and delete a key when its count reaches 0, so \`len()\` is the distinct count.
- Hidden tests have n = 200 000 and k = 100 000; \`len(set(a[i:i + k]))\` per window is O(n·k) and times out.
- When several stretches tie, report the earliest.
- Write the time and space cost in a comment at the top.`,
      rubric: [
        { criterion: 'Correct count and day', description: 'Every test passes, including k = n, k = 1, all-equal ids, ties and the large inputs.', maxPoints: 50 },
        { criterion: 'Sliding count, not rebuilt', description: 'A dict or Counter updated by one entry in and one out per step, with zero counts removed.', maxPoints: 35 },
        { criterion: 'Stated cost and exact output', description: 'Cost stated in a comment; exactly two numbers printed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
from collections import defaultdict


def main():
    data = sys.stdin.buffer.read().split()
    n, k = int(data[0]), int(data[1])
    ids = data[2:2 + n]

    # TODO: count the ids in the first window
    # TODO: slide the window one day at a time, keeping the distinct count up to date
    # TODO: print the largest count and the earliest starting day (1-based)


main()
`,
        tests: [
          { input: '7 3\n1 2 1 3 4 2 3\n', expectedOutput: '3 2' },
          { input: '5 2\n4 4 4 4 4\n', expectedOutput: '1 1' },
          { input: '4 4\n1 2 3 1\n', expectedOutput: '3 1' },
          { input: '1 1\n7\n', expectedOutput: '1 1', isHidden: true },
          { input: '6 3\n5 5\n1 2\n3 3\n', expectedOutput: '3 2', isHidden: true },
          { input: '3 2\n1000000000 999999999 1000000000\n', expectedOutput: '2 1', isHidden: true },
          { input: `200000 100000\n${seq(200000, i => i + 1)}\n`, expectedOutput: '100000 1', isHidden: true },
          { input: `200000 100000\n${seq(200000, () => 42)}\n`, expectedOutput: '1 1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 3: stacks, queues and linked lists ── */
  {
    unitCode: 'JT_CODING_PYTHON_ROUND_STACKS_LISTS',
    notes: `In Python a list is the stack (\`append\`, \`pop\`, \`stack[-1]\`) and \`collections.deque\` is the queue.
The OA patterns are the **monotonic stack** (keep the stack sorted so each element is pushed and popped once), the
**nesting stack** (brackets and encodings), and linked-list pointer work, where the trap is losing the rest of the
list. Always guard \`stack[-1]\` with \`while stack and ...\` — on an empty list it raises IndexError.

## Problem 1 — Remove k digits to make the smallest number

*Given a number as a string and k, remove exactly k digits so what remains is as small as possible.*

**Approach.** Scan left to right with a stack. While the previous digit is larger than the current one and removals
remain, pop it — a smaller digit earlier always wins. Remove any leftover k from the end, then strip leading zeros.

    def remove_k_digits(num, k):
        stack = []
        for d in num:
            while k and stack and stack[-1] > d:
                stack.pop()
                k -= 1
            stack.append(d)
        if k:
            stack = stack[:-k]
        return ''.join(stack).lstrip('0') or '0'

\`"1432219"\`, k = 3 → \`"1219"\`; \`"10200"\`, k = 1 → \`"200"\`; \`"12345"\`, k = 2 → \`"123"\`.

**Complexity.** O(n): each digit is pushed and popped at most once. Comparing digit characters works because
"0" < "1" < … < "9".

## Problem 2 — Decode a nested repeat string

*\`"3[a2[c]]"\` → \`"accaccacc"\`. Counts can have several digits.*

**Approach.** On \`[\`, push the text built so far and the count; on \`]\`, pop them and append the inner text
repeated. Build pieces in lists and join, to avoid repeated string copies.

    def decode(s):
        stack = []
        cur, num = [], 0
        for ch in s:
            if ch.isdigit():
                num = num * 10 + int(ch)          # "10[z]" has a two-digit count
            elif ch == '[':
                stack.append((cur, num))
                cur, num = [], 0
            elif ch == ']':
                prev, times = stack.pop()
                prev.append(''.join(cur) * times)
                cur = prev
            else:
                cur.append(ch)
        return ''.join(cur)

**Complexity.** O(length of the output).

## Problem 3 — Colliding asteroids

*Positive values move right, negative move left; when two meet, the smaller (by size) explodes, and equal sizes both
explode. Print what survives.*

**Approach.** Stack of survivors. A left-mover fights right-movers on the top of the stack until it dies or nothing
is left to hit.

    def collide(rocks):
        stack = []
        for r in rocks:
            alive = True
            while alive and r < 0 and stack and stack[-1] > 0:
                if stack[-1] < -r:
                    stack.pop()                   # the top explodes; keep fighting
                elif stack[-1] == -r:
                    stack.pop()
                    alive = False                 # both explode
                else:
                    alive = False                 # r explodes
            if alive:
                stack.append(r)
        return stack

\`[5, 10, -5]\` → \`[5, 10]\`; \`[8, -8]\` → \`[]\`; \`[-2, -1, 1, 2]\` → unchanged (they move apart).

## Problem 4 — Reverse a linked list in groups of k

*1→2→3→4→5 with k = 2 → 2→1→4→3→5. A final group shorter than k stays as it is.*

**Approach.** A dummy node before the head. For each group: find its k-th node (stop if there is none), reverse the
group in place pointing its first node at the next group, then splice it back.

    class ListNode:
        def __init__(self, val, nxt=None):
            self.val, self.next = val, nxt

    def reverse_k_group(head, k):
        dummy = ListNode(0, head)
        group_prev = dummy
        while True:
            kth = group_prev
            for _ in range(k):
                kth = kth.next
                if kth is None:
                    return dummy.next
            group_next = kth.next
            prev, cur = group_next, group_prev.next
            while cur is not group_next:
                cur.next, prev, cur = prev, cur, cur.next
            first = group_prev.next              # now the last node of the reversed group
            group_prev.next = kth
            group_prev = first

**Complexity.** O(n) time, O(1) extra space. The tuple assignment evaluates the right side first and then assigns
left to right, so the order of the targets matters — \`cur.next\` must be assigned while \`cur\` is still the old node.

## Round habit

Before a stack solution, say what the stack holds and what invariant it keeps (increasing digits, survivors, open
brackets). For a linked list, draw three nodes and move the pointers by hand before typing.`,
    mcqs: [
      mcq('Remove-k-digits runs on "112" with k = 1. What does it return?',
        [['"12"', false],
         ['"11"', true],
         ['"2"', false],
         ['"112"', false]],
        'No digit is ever larger than the one after it, so nothing is popped during the scan, and the leftover removal takes the last digit: "11". Removing the end of a non-decreasing number is the right choice.'),
      mcq('What does the stack-based decoder return for "2[ab]3[c]x"?',
        [['"abab3cx"', false],
         ['"ababcccx"', true],
         ['"abcabcabcx"', false],
         ['"ababccc"', false]],
        'Each bracket group is decoded independently: 2[ab] gives abab, 3[c] gives ccc, and the plain x is appended at the outer level. Nothing multiplies across sibling groups.'),
      mcq('In the asteroid solution, why is the loop `while alive and r < 0 and stack and stack[-1] > 0` and not a single if?',
        [['One left-mover may destroy several in a row', true],
         ['To skip positive values without pushing them', false],
         ['Because pop() on a list is O(n)', false],
         ['To keep the survivors sorted by size', false]],
        'A large left-moving asteroid such as -5 after [10, 2] first destroys 2 and then meets 10, so it must keep fighting until it dies or the top is not a right-mover. A single if would stop after one collision.'),
      mcq('In reverse-k-group, the list is 1→2→3→4→5 and k = 3. What is the result?',
        [['3→2→1→5→4', false],
         ['5→4→3→2→1', false],
         ['3→2→1→4→5', true],
         ['1→2→3→4→5', false]],
        'The first three nodes form a full group and are reversed. Only two nodes remain, fewer than k, so the k-th node search hits None and that tail is left in its original order.'),
      mcq('A solution checks `if stack[-1] == "(":` before checking whether the stack is empty. On input ")" what happens?',
        [['It returns False, as the brackets do not match', false],
         ['IndexError, as the list is empty', true],
         ['stack[-1] returns None and the check fails', false],
         ['It wraps round to the first element', false]],
        'Indexing an empty list raises IndexError; -1 only means "last" when there is a last element. Guarding with `stack and stack[-1] == "("` short-circuits on the empty list.'),
    ],
    assignment: {
      title: 'The Weakest Link of Every Stretch',
      description: 'A monotonic-stack problem: add up the minimum of every contiguous subarray in linear time, exactly.',
      instructions: `A chain of n links has strengths a₁ … aₙ. A stretch of consecutive links is only as strong as its
weakest link. Print the **sum, over every contiguous stretch, of its weakest strength**. There are n(n+1)/2
stretches.

**Input.** Line 1: n (1 ≤ n ≤ 100 000). Then n strengths (1 ≤ aᵢ ≤ 10⁹), separated by spaces or new lines.

**Output.** One integer: the exact sum (Python integers do not overflow, so print it in full — no modulo).

| Input | Output |
|---|---|
| \`4\` / \`3 1 2 4\` | \`17\` |
| \`3\` / \`2 2 2\` | \`12\` |
| \`1\` / \`7\` | \`7\` |

Requirements:

- O(n) with monotonic stacks. For each link, find how far the stretch can extend left and right while this link is
  the minimum; it contributes aᵢ × (left choices) × (right choices).
- Equal strengths must not be counted twice: use "strictly smaller" on one side and "smaller or equal" on the other.
- A hidden test has n = 100 000; an O(n²) double loop times out on it.
- Write the time and space cost in a comment at the top.`,
      rubric: [
        { criterion: 'Correct sum', description: 'Every test passes, including equal strengths, falling and rising chains and the 100 000-link inputs.', maxPoints: 50 },
        { criterion: 'Monotonic stack in linear time', description: 'Previous-smaller and next-smaller boundaries found with stacks; each index pushed and popped once.', maxPoints: 35 },
        { criterion: 'Ties handled and cost stated', description: 'Strict on one side, non-strict on the other, explained; the cost is stated in a comment.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    a = list(map(int, data[1:1 + n]))

    # TODO: for each index, how many stretches have a[i] as their weakest link?
    # TODO: print the sum of a[i] times that count


main()
`,
        tests: [
          { input: '4\n3 1 2 4\n', expectedOutput: '17' },
          { input: '3\n2 2 2\n', expectedOutput: '12' },
          { input: '1\n7\n', expectedOutput: '7' },
          { input: '5\n5 4 3 2 1\n', expectedOutput: '35', isHidden: true },
          { input: '3\n1000000000 1000000000 1000000000\n', expectedOutput: '6000000000', isHidden: true },
          { input: `100000\n${seq(100000, () => 1)}\n`, expectedOutput: '5000050000', isHidden: true },
          { input: `100000\n${seq(100000, i => i + 1)}\n`, expectedOutput: '166671666700000', isHidden: true },
        ],
        difficulty: 'hard',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 4: trees and graphs ── */
  {
    unitCode: 'JT_CODING_PYTHON_ROUND_TREES_GRAPHS',
    notes: `Tree and graph problems in an OA are mostly about **reading the input into a structure** and then a BFS,
an iterative DFS or union-find. In Python, write traversals iteratively from the start: CPython's recursion limit
is 1000, and a hidden test that is one long path will end a recursive solution with \`RecursionError\`.

    from collections import defaultdict, deque

    graph = defaultdict(list)                     # or [[] for _ in range(n + 1)] when nodes are 1..n
    for _ in range(m):
        u, v = next(it), next(it)
        graph[u].append(v)
        graph[v].append(u)

## Problem 1 — The right-side view of a binary tree

*The tree comes as a level-order list with -1 for a missing child. Print the last node of every level.*

**Approach.** BFS one level at a time: snapshot the queue length, process exactly that many nodes, and the last
node of the level is the one you see from the right.

    def right_view(vals):
        if not vals or vals[0] == -1:
            return []
        view, q, nxt = [], deque([0]), 1
        while q:
            view.append(vals[q[-1]])            # last index queued for this level
            for _ in range(len(q)):              # len(q) is read once, before the loop
                q.popleft()
                for _ in range(2):               # its two child slots in the list
                    if nxt < len(vals):
                        if vals[nxt] != -1:
                            q.append(nxt)
                        nxt += 1
        return view

\`[1, 2, 3, -1, 5, -1, 4]\` → \`[1, 3, 4]\`.

**Complexity.** O(n). \`range(len(q))\` is evaluated once, which is exactly the snapshot you need.

## Problem 2 — Distance to the nearest exit (multi-source BFS)

*A grid has exits \`E\`, walls \`#\` and open cells \`.\`. Print each cell's distance to the nearest exit.*

**Approach.** Put **every** exit in the queue at distance 0, then run one BFS. The first time a cell is reached is
from its nearest exit, because BFS expands in rings of equal distance.

    def nearest_exit(grid):
        rows, cols = len(grid), len(grid[0])
        dist = [[-1] * cols for _ in range(rows)]
        q = deque()
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 'E':
                    dist[r][c] = 0
                    q.append((r, c))
        while q:
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#' and dist[nr][nc] == -1:
                    dist[nr][nc] = dist[r][c] + 1
                    q.append((nr, nc))
        return dist

**Complexity.** O(rows × cols). One BFS per exit is O(exits × cells), which times out when exits are many.
Note \`[[-1] * cols for _ in range(rows)]\` — not \`[[-1] * cols] * rows\`, whose rows are one shared list.

## Problem 3 — The cable that closes a loop (union-find)

*A network of n nodes was a tree, then one extra cable was added. Edges arrive in order; print the first edge that
joins two nodes already connected.*

**Approach.** Union-find with path compression, written iteratively.

    def redundant(n, edges):
        parent = list(range(n + 1))
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]    # path halving
                x = parent[x]
            return x
        for u, v in edges:
            ru, rv = find(u), find(v)
            if ru == rv:
                return (u, v)
            parent[ru] = rv
        return None

Edges (1,2) (2,3) (3,4) (1,4) (1,3) → \`(1, 4)\`.

**Complexity.** Near O(m). A BFS per edge to test connectivity is O(m · n).

## Round habit

Say the representation first ("adjacency list, 1-indexed, undirected"), then the traversal, then why it cannot
recurse too deep. Mark a node visited when you **push** it, not when you pop it, or it can enter the queue many
times.`,
    mcqs: [
      mcq('For the level-order list `[1, 2, -1, 4]`, what does the right-side view print?',
        [['[1, 2, 4]', true],
         ['[1, 4]', false],
         ['[1, -1, 4]', false],
         ['[1, 2]', false]],
        'Node 1 has a left child 2 and no right child, so 2 is the only node on level two and is visible from the right. 4 is the left child of 2 and the only node on level three.'),
      mcq('A grid has 5 000 exits among 10⁶ cells. Why put every exit in the queue at once instead of running BFS from each exit?',
        [['To avoid a RecursionError from the BFS', false],
         ['Because deque holds only one source otherwise', false],
         ['It is one O(cells) BFS, not 5 000 of them', true],
         ['Because BFS from one exit returns wrong distances', false]],
        'Starting all exits at distance 0 makes one BFS whose rings are distances to the nearest exit, so every cell is settled once. A BFS per exit is correct but costs about 5×10⁹ steps here.'),
      mcq('Union-find processes the edges (1,2), (3,4), (2,4), (1,3) in order. Which edge is reported as closing a loop?',
        [['(2, 4)', false],
         ['(3, 4)', false],
         ['None of them', false],
         ['(1, 3)', true]],
        '(1,2) and (3,4) make two pairs, and (2,4) joins the pairs into one set. When (1,3) arrives, 1 and 3 already share a root, so it is the edge that closes the cycle 1-2-4-3-1.'),
      mcq('A recursive DFS computes subtree sizes on a tree that is one path of 50 000 nodes. What does CPython do with the default settings?',
        [['Raise RecursionError near depth 1000', true],
         ['Finish, but take O(n²) time', false],
         ['Return wrong sizes from the cache', false],
         ['Finish, since tail calls are optimised', false]],
        'The default recursion limit is 1000 and CPython has no tail-call optimisation, so the path fails long before its end. An explicit stack, or a BFS order processed in reverse, does the same work without the depth.'),
    ],
    assignment: {
      title: 'Reports in a Company Hierarchy',
      description: 'Build a tree from a parent array and answer subtree-size queries — iteratively, because the hierarchy can be 100 000 levels deep.',
      instructions: `A company has n employees numbered 1 to n. Every employee except the CEO has exactly one direct
manager. For each queried employee, print how many people report to them **directly or indirectly** (their whole
team below them, not counting themselves).

**Input.**
- Line 1: n (1 ≤ n ≤ 100 000).
- Line 2: n integers p₁ … pₙ, where pᵢ is the manager of employee i, and pᵢ = 0 for the CEO (exactly one).
  Managers do **not** necessarily have smaller numbers than their reports.
- Line 3: q (1 ≤ q ≤ 100 000). Line 4: q employee numbers.

**Output.** One line: the q answers separated by single spaces.

| Input | Output |
|---|---|
| \`5\` / \`0 1 1 2 2\` / \`3\` / \`1 2 3\` | \`4 2 0\` |
| \`6\` / \`3 3 0 3 1 1\` / \`2\` / \`3 1\` | \`5 2\` |

Requirements:

- O(n + q): build the children lists, compute every subtree size once, then answer each query by lookup. Counting
  descendants afresh for each query is O(n·q).
- A hidden test is a chain of 100 000 employees, each managing the next. A recursive DFS fails on it — use a BFS
  order processed backwards, or an explicit stack.
- Write the time and space cost in a comment at the top.`,
      rubric: [
        { criterion: 'Correct team sizes', description: 'Every test passes, including a CEO who is not employee 1, managers numbered above their reports, a star and the 100 000-deep chain.', maxPoints: 50 },
        { criterion: 'Iterative, computed once', description: 'Children lists built once; sizes computed in one pass without recursion; queries answered by lookup.', maxPoints: 35 },
        { criterion: 'Exact output and stated cost', description: 'One line of answers separated by spaces; the cost stated in a comment.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def main():
    data = sys.stdin.buffer.read().split()
    n = int(data[0])
    manager = [0] + [int(x) for x in data[1:1 + n]]     # manager[i] for employees 1..n
    q = int(data[1 + n])
    queries = [int(x) for x in data[2 + n:2 + n + q]]

    # TODO: build each manager's list of direct reports and find the CEO
    # TODO: compute every team size without recursion
    # TODO: print the answers on one line


main()
`,
        tests: [
          { input: '5\n0 1 1 2 2\n3\n1 2 3\n', expectedOutput: '4 2 0' },
          { input: '6\n3 3 0 3 1 1\n2\n3 1\n', expectedOutput: '5 2' },
          { input: '1\n0\n1\n1\n', expectedOutput: '0', isHidden: true },
          { input: '4\n2 3 4 0\n4\n4 3 2 1\n', expectedOutput: '3 2 1 0', isHidden: true },
          { input: `100000\n0 ${seq(99999, i => i + 1)}\n3\n1 50000 100000\n`, expectedOutput: '99999 50000 0', isHidden: true },
          { input: `100000\n${seq(99999, i => i + 2)} 0\n2\n100000 1\n`, expectedOutput: '99999 0', isHidden: true },
          { input: `100000\n0 ${seq(99999, () => 1)}\n2\n1 77777\n`, expectedOutput: '99999 0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Round 5: greedy and dynamic programming ── */
  {
    unitCode: 'JT_CODING_PYTHON_ROUND_DP_GREEDY',
    notes: `Greedy or DP? Try to break the greedy rule with a small counter-example first; if you can, the problem
needs DP — define the state, the transition and the base case aloud. In Python, prefer a **bottom-up table** (a list,
often one row) to recursion with \`@lru_cache\`: the cache does not reduce recursion depth, and a 10⁵-long input
needs 10⁵ nested calls.

## Problem 1 — Longest common subsequence, in two rows

**Approach.** dp[i][j] = LCS of the first i characters of a and the first j of b. Each row needs only the row above,
so keep two rows: O(min(n, m)) memory.

    def lcs(a, b):
        if len(b) > len(a):
            a, b = b, a                          # keep the shorter string as the row
        prev = [0] * (len(b) + 1)
        for ch in a:
            cur = [0] * (len(b) + 1)
            for j, bj in enumerate(b, 1):
                cur[j] = prev[j - 1] + 1 if ch == bj else max(prev[j], cur[j - 1])
            prev = cur
        return prev[-1]

\`lcs("placement", "planet")\` → 5.

**Complexity.** O(n·m) time. Two rows instead of the full table matter in Python, where a 5 000 × 5 000 table of
ints is hundreds of megabytes.

## Problem 2 — Paths through a grid with blocked cells

*Moving only right or down from the top-left to the bottom-right, count the paths that avoid \`#\`.*

    def paths(grid):
        cols = len(grid[0])
        dp = [0] * cols
        dp[0] = 1 if grid[0][0] == '.' else 0
        for row in grid:
            for c in range(cols):
                if row[c] == '#':
                    dp[c] = 0                    # nothing passes through a wall
                elif c > 0:
                    dp[c] += dp[c - 1]           # from above (old dp[c]) plus from the left
        return dp[-1]

\`["...", ".#.", "..."]\` → 2.

**Complexity.** O(rows × cols), one row of memory. The count can be huge; Python's ints hold it exactly, but when
the problem asks for a modulo, take it inside the loop.

## Problem 3 — Where to start the round trip (greedy)

*Petrol pumps in a circle: pump i gives gas[i] and the road to the next costs cost[i]. Find the start from which you
can go all the way round, or -1.*

**Approach.** If total gas < total cost, no start works. Otherwise, run a tank from 0; whenever it goes negative at
i, no start between the current start and i can work, so restart at i + 1.

    def start_station(gas, cost):
        if sum(gas) < sum(cost):
            return -1
        tank = start = 0
        for i in range(len(gas)):
            tank += gas[i] - cost[i]
            if tank < 0:
                start, tank = i + 1, 0
        return start

gas \`[1, 2, 3, 4, 5]\`, cost \`[3, 4, 5, 1, 2]\` → 3.

**Complexity.** O(n), against O(n²) for simulating every start.

## Problem 4 — Fewest boats (greedy with two pointers)

*Each boat carries at most two people and a weight limit. Find the fewest boats.*

**Approach.** Sort. The heaviest person must go in some boat; pair them with the lightest if they fit, otherwise
alone.

    def boats(weights, limit):
        weights.sort()
        i, j, count = 0, len(weights) - 1, 0
        while i <= j:
            if weights[i] + weights[j] <= limit:
                i += 1
            j -= 1
            count += 1
        return count

\`[3, 5, 3, 4]\`, limit 5 → 4.

**Complexity.** O(n log n) for the sort. The exchange argument: if the lightest cannot ride with the heaviest,
nobody can.

## Round habit

State the DP in one sentence before coding ("dp[c] = paths to this cell of the current row"). For greedy, name the
rule **and** why no counter-example exists.`,
    mcqs: [
      mcq('In the one-row grid-paths DP, why is `dp[c] += dp[c - 1]` enough, with no separate term for the cell above?',
        [['Paths from above are never allowed', false],
         ['dp[c] still holds the value from the row above', true],
         ['dp[c - 1] already includes the cell above', false],
         ['The first column is always zero', false]],
        'Before the update, dp[c] is the count for the same column in the previous row, which is "from above". Adding dp[c - 1], already updated for this row, adds "from the left".'),
      mcq('Gas station: `gas = [2, 3, 4]` and `cost = [3, 4, 3]`. What does the greedy return?',
        [['0', false],
         ['2', false],
         ['1', false],
         ['-1', true]],
        'Total gas is 9 and total cost is 10, so no start can complete the circle and the function returns -1 before the scan. The total check is what makes the single pass correct.'),
      mcq('An LCS on two 5 000-character strings is written with a full 5 001 × 5 001 list of lists. What is the main risk in Python?',
        [['Memory: about 25 million list slots of ints', true],
         ['A RecursionError on the nested loops', false],
         ['Integer overflow in the table cells', false],
         ['The wrong answer, since rows alias each other', false]],
        'Each list slot is an 8-byte pointer, so 25 million slots are about 200 MB before counting the int objects. Two rows are enough because each row reads only the one above.'),
      mcq('Fewest boats with limit 3 and weights [3, 2, 2, 1]. What does the two-pointer greedy return?',
        [['2', false],
         ['4', false],
         ['3', true],
         ['1', false]],
        'After sorting, [1, 2, 2, 3]: 3 cannot ride with 1 and goes alone; 2 rides with 1; the remaining 2 goes alone. Three boats, and no arrangement does better because only 1 + 2 fits.'),
      mcq('A decode-ways DP is written recursively with `@lru_cache` and run on a 100 000-digit string. What happens with the default settings?',
        [['It runs in O(n), since the cache prevents repeats', false],
         ['It raises MemoryError from the cache size', false],
         ['It returns 0, as the cache overflows', false],
         ['It raises RecursionError on the first call', true]],
        'Memoisation removes repeated calls but not depth: the first call recurses one digit at a time down the string, far past the 1000-frame limit. A bottom-up loop over two variables is O(n) with no depth at all.'),
    ],
    assignment: {
      title: 'Ways to Read a Coded Message',
      description: 'A bottom-up DP over a long digit string: count its decodings modulo 10⁹ + 7, without recursion.',
      instructions: `Letters were coded as numbers, A = 1, B = 2, … Z = 26, and written without separators. A digit string
can therefore be read in several ways: "226" is "BZ", "VF" or "BBF". A "0" can only be the second digit of 10 or 20,
and a code never starts with 0 ("06" is not 6). Count the ways to read the whole string.

**Input.** One line: a string of digits (1 ≤ length ≤ 100 000).

**Output.** The number of readings **modulo 1 000 000 007** (it is 0 when there is none).

| Input | Output |
|---|---|
| \`226\` | \`3\` |
| \`12\` | \`2\` |
| \`06\` | \`0\` |

Requirements:

- O(n) time and O(1) extra space: the count for the first i digits depends only on the counts for i − 1 and i − 2.
- Take the modulo inside the loop. Without it the count for 100 000 digits has over 20 000 digits.
- No recursion — a hidden test has 100 000 digits, and \`@lru_cache\` does not reduce recursion depth.
- Write the state, the transition and the cost in a comment at the top.`,
      rubric: [
        { criterion: 'Correct count', description: 'Every test passes, including zeros that make reading impossible, 10 and 20, and the 100 000-digit inputs.', maxPoints: 50 },
        { criterion: 'Bottom-up DP', description: 'Two rolling values (or a table) filled in one loop; the modulo applied as it goes; no recursion.', maxPoints: 35 },
        { criterion: 'State and cost stated', description: 'The state, transition, base case and cost are written in a comment.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

MOD = 10**9 + 7


def main():
    s = sys.stdin.read().split()[0]

    # TODO: ways(i) = readings of the first i digits; it depends on ways(i - 1) and ways(i - 2)
    # TODO: print the count for the whole string, modulo MOD


main()
`,
        tests: [
          { input: '226\n', expectedOutput: '3' },
          { input: '12\n', expectedOutput: '2' },
          { input: '06\n', expectedOutput: '0' },
          { input: '10\n', expectedOutput: '1', isHidden: true },
          { input: '100\n', expectedOutput: '0', isHidden: true },
          { input: '2611055971756562\n', expectedOutput: '4', isHidden: true },
          { input: '1'.repeat(100000) + '\n', expectedOutput: '967618232', isHidden: true },
          { input: '10'.repeat(50000) + '\n', expectedOutput: '1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── Checkpoint ── */
  {
    unitCode: 'JT_CODING_PYTHON_CHECKPOINT',
    notes: `Ten short Python solutions, the kind an interviewer pastes in after your coding round: "what does this
print?", "what is its cost?", "where is the bug?". Read each one as you would your own code before submitting —
which objects are shared, what a library call really returns, and how deep the code recurses.`,
    checkpoint: [
      ck('PYTHON_BASICS', 'A DP grid is built as `grid = [[0] * 3] * 3`, then `grid[1][1] = 5`. What does `sum(map(sum, grid))` give?',
        [['5', false],
         ['15', true],
         ['45', false],
         ['0', false]],
        'Multiplying the outer list copies the reference three times, so all three rows are the same list and the 5 appears in each. The total is 3 × 5 = 15. A comprehension builds independent rows.'),
      ck('DSA_ARRAYS', 'On a sorted list `a`, a solution counts the values in [lo, hi] as `bisect_right(a, hi) - bisect_left(a, lo)`. For `a = [1, 3, 3, 3, 7]`, lo = 3, hi = 6, what is the count?',
        [['4', false],
         ['2', false],
         ['5', false],
         ['3', true]],
        'bisect_right(a, 6) is 4 (four values are at most 6) and bisect_left(a, 3) is 1 (one value is below 3). 4 − 1 = 3, the three 3s; nothing lies between 4 and 6.'),
      ck('DSA_STRINGS', 'A solution reverses a 10⁵-character string with `res = ""` and `for ch in s: res = ch + res`. What is the cost of the loop?',
        [['O(n), one concatenation per character', false],
         ['O(n log n), from string resizing', false],
         ['O(n²), as each step copies all of res', true],
         ['O(1) per step, as CPython appends in place', false]],
        'Prepending builds a new string holding everything so far, every time; the in-place optimisation CPython sometimes applies is for appending, never prepending. s[::-1] or a list joined once is linear.'),
      ck('DSA_HASHING', 'What does `Counter("mississippi").most_common(2)` return?',
        [['[("s", 4), ("i", 4)]', false],
         ['[("i", 4), ("s", 4)]', true],
         ['[("i", 4), ("p", 2)]', false],
         ['[("s", 4), ("p", 2)]', false]],
        'i and s both appear 4 times. most_common sorts by count with a stable sort, so equal counts keep first-seen order, and i (index 1) was seen before s (index 2).'),
      ck('DSA_STACK', '`dq = deque([1, 2, 3], maxlen=3)`, then `dq.append(4)` and `dq.appendleft(0)`. What is `list(dq)`?',
        [['[0, 1, 2]', false],
         ['[0, 2, 3, 4]', false],
         ['[2, 3, 4]', false],
         ['[0, 2, 3]', true]],
        'A full bounded deque drops from the opposite end: append(4) pushes out 1 on the left, giving [2, 3, 4], and appendleft(0) pushes out 4 on the right. The length never exceeds maxlen.'),
      ck('DSA_LINKED_LIST', 'Reversing 1→2→3, a candidate writes the loop body as `prev, cur, cur.next = cur, cur.next, prev`. What happens?',
        [['AttributeError, as cur becomes None', true],
         ['It reverses the list correctly', false],
         ['It loops forever on node 2', false],
         ['It returns 1→2→3 unchanged', false]],
        'The targets are assigned left to right, so cur is moved on before cur.next is set: the old node is never re-pointed. On the second pass cur becomes None and the third target, cur.next, raises AttributeError. Assign cur.next first.'),
      ck('DSA_TREES', 'A recursive `height(v)` runs on a tree that is one path of 100 000 nodes, with the default recursion limit. What is the outcome?',
        [['100000', false],
         ['A RecursionError', true],
         ['A wrong height of 1000', false],
         ['A time-out from the O(n²) recursion', false]],
        'Each level adds a frame and the default limit is 1000, so the call raises RecursionError long before the bottom. The algorithm is linear; computing heights in reverse BFS order avoids the depth.'),
      ck('DSA_GRAPHS', 'A BFS on the complete graph of 4 nodes marks a node visited when it is **popped** and pushes every unvisited neighbour. Counting the start, how many pushes happen?',
        [['4', false],
         ['12', false],
         ['7', true],
         ['16', false]],
        'Node 0 pushes 1, 2 and 3; node 1 pushes 2 and 3 again; node 2 pushes 3 again; later pops are skipped. 1 + 3 + 2 + 1 = 7. Marking when pushing gives exactly 4, and on large dense graphs the difference is quadratic.'),
      ck('DSA_DP', '`@lru_cache(maxsize=None)` decorates a recursive `fib(n)`, and the first call is `fib(5000)`. What happens with the default settings?',
        [['It returns quickly, since the cache stops repeats', false],
         ['It runs in exponential time', false],
         ['It returns a wrong value from an overflow', false],
         ['It raises RecursionError', true]],
        'The cache removes repeated work but the first call still descends fib(4999), fib(4998) … one frame each, far past the 1000 limit. Calling it for increasing n first, or a loop, avoids the depth.'),
      ck('DSA_GREEDY', 'A greedy scheduler starts with `h = [5, 1, 4]` (never heapified), calls `heapq.heappush(h, 2)` and then `heapq.heappop(h)`. What does the pop return?',
        [['1, the smallest value', false],
         ['5', true],
         ['2, the value just pushed', false],
         ['A ValueError, as h is not a heap', false]],
        'heapq trusts that the list is already a heap and never checks. h[0] is 5, so heappop returns 5. Calling heapq.heapify(h) first would make the smallest value, 1, come out.'),
    ],
  },
];

/* ══ JT_MCQ_PYTHON_DJANGO — Python and Django MCQ Rounds ═════════════════════════════════ */

const MCQ_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_MCQ_PYTHON_DJANGO_MCQ_OUTPUT',
    notes: `The Python section of a company online test is mostly "what does this print?". Each snippet hides one
rule of the language; you have about a minute, so the skill is spotting **which** rule. Here are twelve rules these
questions are built on. Every snippet below was run; the output shown is real. Cover the answer, predict it, then
read why.

## 1. A mutable default argument is created once

    def add(item, bucket=[]):
        bucket.append(item)
        return bucket
    print(add(1))
    print(add(2))
    print(add(3, []))
    print(add(4))

**Prints** \`[1]\`, \`[1, 2]\`, \`[3]\`, \`[1, 2, 4]\`. **Why:** the default list is built when \`def\` runs, once, and
every call that omits \`bucket\` shares it. The call with its own list leaves the shared one alone. Use
\`bucket=None\` and create the list inside.

## 2. Closures capture variables, not values

    fs = [lambda: i for i in range(3)]
    print([f() for f in fs])
    gs = [lambda i=i: i for i in range(3)]
    print([g() for g in gs])

**Prints** \`[2, 2, 2]\` and \`[0, 1, 2]\`. **Why:** every lambda looks up \`i\` when it is **called**, after the loop
has finished with i = 2. A default argument is evaluated when the lambda is **made**, freezing each value.

## 3. Slicing never raises

    s = "placement"
    print(s[::-1][:3], s[-3:], s[2:100], repr(s[5:2]))

**Prints** \`tne ent acement ''\`. **Why:** out-of-range slice bounds are clipped, and a start past the stop gives an
empty string. Only **indexing** (\`s[100]\`) raises IndexError.

## 4. Small integers are cached; identity is not equality

    a = int('256'); b = int('256')
    c = int('257'); d = int('257')
    print(a is b, c is d, c == d)

**Prints** \`True False True\`. **Why:** CPython keeps one object for each integer from -5 to 256. 257 built at run
time is a new object each time, so \`is\` (identity) is False while \`==\` (value) is True. (Two equal literals in the
same file may share an object, which is why tests build them at run time.) Never compare numbers with \`is\`.

## 5. Assigning to a name anywhere makes it local everywhere in that function

    count = 0
    def bump():
        count += 1
        return count
    bump()

**Raises** \`UnboundLocalError\`. **Why:** \`count += 1\` assigns, so the compiler treats \`count\` as local for the
whole function, and the read happens before any local value exists. \`global count\` (or \`nonlocal\` in a nested
function) fixes it.

## 6. A generator can be consumed only once

    squares = (x * x for x in range(4))
    print(sum(squares), sum(squares))

**Prints** \`14 0\`. **Why:** the first \`sum\` exhausts the generator; the second sees nothing and returns 0 with no
error. Store a list if you need the values twice.

## 7. A return in finally wins

    def f():
        try:
            return 'try'
        finally:
            return 'finally'
    print(f())

**Prints** \`finally\`. **Why:** finally runs on the way out, and its own return replaces the pending one (it would
swallow an exception the same way). Python 3.14 warns about this pattern; do not write it.

## 8. List multiplication copies references

    grid = [[0] * 3] * 2
    grid[0][0] = 1
    print(grid)

**Prints** \`[[1, 0, 0], [1, 0, 0]]\`. **Why:** both rows are the same list. \`[[0] * 3 for _ in range(2)]\` makes
two lists. (\`[0] * 3\` itself is fine: ints are immutable.)

## 9. += on a list inside a tuple both fails and succeeds

    t = ([1],)
    try:
        t[0] += [2]
    except TypeError:
        print('TypeError')
    print(t)

**Prints** \`TypeError\` and then \`([1, 2],)\`. **Why:** \`t[0] += [2]\` first extends the list in place (that works)
and then tries to store the result back into the tuple (that fails). The list was already changed.

## 10. Equal keys collapse: 1, 1.0 and True

    d = {1: 'a', 1.0: 'b', True: 'c'}
    print(d, len(d))

**Prints** \`{1: 'c'} 1\`. **Why:** \`1 == 1.0 == True\` and they hash alike, so they are one key. The first key
object stays; each later assignment replaces the value.

## 11. Comparisons chain

    print(1 < 3 > 2, (1 < 3) > 2, 0 == 0 in [0], (0 == 0) in [0])

**Prints** \`True False True False\`. **Why:** \`a < b > c\` means \`a < b and b > c\`; \`in\` and \`==\` chain the same
way, so \`0 == 0 in [0]\` is \`0 == 0 and 0 in [0]\`. With parentheses, \`True > 2\` is False and \`True in [0]\` is
False.

## 12. Floor division, modulo and rounding

    print(-7 // 2, -7 % 2, round(2.5), round(3.5), int(-2.7))

**Prints** \`-4 1 2 4 -2\`. **Why:** \`//\` floors toward minus infinity, and \`%\` takes the sign of the divisor so
that \`(a // b) * b + a % b == a\`. \`round\` rounds halves to the even neighbour. \`int()\` truncates toward zero.

## How to work an output question in the test

1. Ask what is **shared** (a default, a row, a captured variable) and what is **copied**.
2. Ask **when** each expression runs — at def time, at call time, or lazily.
3. Check whether it raises — "error" is often an option and sometimes right.`,
    mcqs: [
      mcq('`a = [1, 2, 3]; b = a; a += [4]; c = a; a = a + [5]` — what does `print(b, c is a)` show?',
        [['[1, 2, 3] False', false],
         ['[1, 2, 3, 4] False', true],
         ['[1, 2, 3, 4, 5] True', false],
         ['[1, 2, 3, 4] True', false]],
        '+= on a list extends it in place, so b, which names the same list, sees the 4. a = a + [5] builds a new list and rebinds a, so c still names the old list and c is a is False.'),
      mcq('`class Team:` has the class attribute `members = []` and a method `join(self, who)` that does `self.members.append(who)`. After `x.join("asha")` and `y.join("ravi")` on two different teams, what is `(len(x.members), x.members is y.members)`?',
        [['(1, False)', false],
         ['(2, False)', false],
         ['(1, True)', false],
         ['(2, True)', true]],
        'self.members finds no instance attribute and falls back to the one list on the class, so both teams append to it. Assign self.members = [] in __init__ to give each object its own list.'),
      mcq('What does `print(sorted("banana", reverse=True)[:3], "banana".count("ana"), "banana".find("z"))` print?',
        [['[\'n\', \'n\', \'b\'] 2 -1', false],
         ['[\'n\', \'n\', \'b\'] 1 -1', true],
         ['nnb 1 None', false],
         ['[\'n\', \'n\', \'b\'] 1 ValueError', false]],
        'sorted returns a list of characters, here n, n, b, a, a, a. count counts non-overlapping matches, so "ana" is found once. find returns -1 when the text is absent; index is the one that raises ValueError.'),
    ],
    checkpoint: [
      ck('PYTHON_ADVANCED', '`x = 10`; `outer()` sets `x = 20` and defines `inner()` with `nonlocal x; x += 1; return x`; `outer` returns `inner() + x`. What does `print(outer(), x)` print?',
        [['31 10', false],
         ['42 21', false],
         ['42 10', true],
         ['41 10', false]],
        'nonlocal binds inner\'s x to outer\'s x, so inner raises it to 21 and returns 21; after the call outer\'s x is also 21, giving 42. The global x was never touched and stays 10.'),
      ck('PYTHON_ADVANCED', 'After `try: raise ValueError("bad")` / `except ValueError as e: pass`, the next line is `print(e)` at the same level. What happens?',
        [['It prints bad', false],
         ['It prints ValueError(\'bad\')', false],
         ['It prints None', false],
         ['NameError: e is not defined', true]],
        'Python deletes the name bound by except ... as at the end of the handler, to break a reference cycle through the traceback. Assign it to another name inside the handler if you need it later.'),
      ck('PYTHON_BASICS', '`a = [[1], [2]]; b = a.copy(); b[0].append(9); b[1] = [7]` — what is `a` now?',
        [['[[1], [2]]', false],
         ['[[1, 9], [2]]', true],
         ['[[9], [2]]', false],
         ['[[1], [7]]', false]],
        'copy() is shallow: b is a new outer list holding the same inner lists. Appending to b[0] changes the list a also holds, but rebinding b[1] replaces a slot in b only.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_PYTHON_DJANGO_MCQ_DJANGO',
    notes: `Django, DRF and FastAPI questions in an online test check defaults and behaviours: what the framework
does when you did not say. Twelve questions in the test's own format, each with the answer and the reason. Every
behaviour was checked on Django 5.2, DRF 3.18, Simple JWT and FastAPI with Pydantic 2. The models are
\`Author(name)\` and \`Book(author → Author, title, isbn blank=True, stock default 0, pages null=True, updated
auto_now=True, tags → Tag)\`.

## 1. How many queries run in this code?

    qs = Book.objects.filter(stock__gte=1)       # 0
    first_two = qs[:2]                           # 0
    rows = list(qs)                              # 1
    for b in qs: pass                            # still 1: the result cache is reused
    qs.count()                                   # still 1: an evaluated queryset counts its cache

**Answer: one.** Querysets are lazy: building, filtering and slicing run no SQL. Iterating, \`list()\`, \`len()\` and
\`bool()\` evaluate and fill the cache. A **new** \`Book.objects.filter(...).count()\` would run a fresh COUNT query.

## 2. What does Book.objects.get(title="zz") raise when nothing matches? And when two match?

**Answer:** \`Book.DoesNotExist\` and \`Book.MultipleObjectsReturned\`. Catch the model-specific classes; use
\`filter(...).first()\` when "none" is a normal case, or \`get_object_or_404\` in a view.

## 3. Book.objects.create(author=a) with no title — what is saved?

**Answer: an empty string**, not NULL and not an error. A CharField without \`null=True\` defaults to \`""\`; \`blank\`
affects only form and serializer validation. \`pages\` (an IntegerField with \`null=True\`) is saved as NULL.

## 4. What is the reverse accessor from Author to Book when the ForeignKey has no related_name?

**Answer:** \`author.book_set\` — the lower-cased model name plus \`_set\`. With \`related_name="books"\` it becomes
\`author.books\`. In queries the reverse name is \`book\` (\`Author.objects.annotate(n=Count("book"))\`).

## 5. Book.objects.filter(pk=1).update(stock=9) — does updated (auto_now) change? What is returned?

**Answer: no, and the number of rows matched (1).** \`update()\` is one SQL UPDATE: it never calls \`save()\`, so
\`auto_now\`, \`save()\` overrides and \`pre_save\`/\`post_save\` signals are all skipped. \`delete()\` returns a tuple
such as \`(3, {"shelf.Book": 3})\`.

## 6. book.stock = F("stock") - 1; book.save(); print(book.stock) — what prints?

**Answer: the expression**, \`F(stock) - Value(1)\`, not a number. The database did the arithmetic (no lost
update), but the Python object still holds the expression until \`book.refresh_from_db()\`.

## 7. A page lists 3 books and prints each book.author.name. How many queries? With select_related("author")? And authors with prefetch_related("book_set")?

**Answer: 4, 1 and 2.** One query for the books plus one per book is the N+1 problem. \`select_related\` follows
a ForeignKey or OneToOne with a JOIN (one query); \`prefetch_related\` runs one extra query for the related set and
joins in Python — the tool for reverse ForeignKeys and ManyToMany.

## 8. What are DRF's defaults for permissions, authentication and pagination?

**Answer:** \`AllowAny\`; \`SessionAuthentication\` then \`BasicAuthentication\`; **no** pagination (\`PAGE_SIZE\` is
None). A fresh API is open to anyone and returns whole lists until you set them in \`REST_FRAMEWORK\`.

## 9. In what order does a DRF Serializer validate?

**Answer:** each field's own checks (type, \`max_length\`, \`required\`), then \`validate_<field>\` for each field,
then \`validate(self, attrs)\`. If any field fails its own checks, its \`validate_<field>\` is not called and
\`validate()\` does not run at all.

## 10. A view builds Serializer(data=request.data) and reads .data before is_valid(). What happens?

**Answer: AssertionError** — "When a serializer is passed a \`data\` keyword argument you must call
\`.is_valid()\` before attempting to access the serialized \`.data\` representation". \`save()\` before
\`is_valid()\` is an AssertionError too.

## 11. router.register("books", BookViewSet) — what URL names exist? And when must basename be given?

**Answer:** \`book-list\` (\`/books/\`) and \`book-detail\` (\`/books/{pk}/\`), named from the queryset's model.
A viewset with only \`get_queryset()\` and no \`queryset\` attribute must be registered with \`basename=\`, or
registration fails with an AssertionError.

## 12. An unauthenticated request hits an IsAuthenticated view. 401 or 403?

**Answer: it depends on the first authentication class.** With the defaults (Session first) DRF returns **403**,
because session auth has no \`WWW-Authenticate\` challenge to send. With Simple JWT's \`JWTAuthentication\` first it
returns **401** with \`WWW-Authenticate: Bearer realm="api"\`.

## Quick facts the same tests ask

- Simple JWT defaults: access token 5 minutes, refresh token 1 day, \`ROTATE_REFRESH_TOKENS = False\`, header type
  \`Bearer\`.
- \`on_delete\` is required on every ForeignKey (since Django 2.0). \`auto_now_add\` is set once on create;
  \`auto_now\` on every \`save()\`.
- \`makemigrations\` writes migration files; \`migrate\` applies them.
- With \`DEBUG = False\`, \`ALLOWED_HOSTS\` must list the host, or requests get 400.
- \`book.tags.add(tag)\` writes to the join table immediately — no \`save()\` needed.
- PageNumberPagination with \`page_size = 10\` on 25 rows: page 3 has 5 results and \`next\` is null; page 9
  returns 404 "Invalid page.".
- FastAPI: a body that fails Pydantic validation returns **422** (not 400); \`"42"\` for an \`int\` field is coerced
  to 42 in the default lax mode; \`response_model\` filters out fields it does not declare; routes match in
  declaration order, so \`/users/{user_id}\` (int) declared before \`/users/me\` turns GET /users/me into a 422.`,
    mcqs: [
      mcq('Three Book rows match, and the code runs `print(Book.objects.filter(stock__lt=3).delete())`. Book has a ManyToMany to Tag with no tags set. What is printed?',
        [['3, the number of rows deleted', false],
         ['None, since delete() returns nothing', false],
         ['(3, {\'shelf.Book\': 3})', true],
         ['[3], one count per model', false]],
        'QuerySet.delete() returns a tuple: the total number of objects deleted, and a dict of counts per model label. Cascaded rows would appear in the dict and the total too.'),
      mcq('What type is `Book.objects.values_list("title", flat=True)`?',
        [['A QuerySet that yields plain strings', true],
         ['A list of one-element tuples', false],
         ['A list of strings, run immediately', false],
         ['A dict from pk to title', false]],
        'values_list returns a lazy QuerySet; flat=True (allowed only with one field) makes it yield the values themselves instead of tuples. No query runs until it is iterated.'),
      mcq('A FastAPI endpoint is declared as `def items(limit: int = 10)`. A client calls `GET /items?limit=x`. What is the response?',
        [['200, with limit set to 10', false],
         ['400 Bad Request', false],
         ['500, from a ValueError', false],
         ['422 Unprocessable Entity', true]],
        'Query parameters are validated against their type hints by Pydantic; "x" cannot be parsed as an int, so FastAPI returns 422 with an error naming the query parameter. The default applies only when the parameter is absent.'),
    ],
    checkpoint: [
      ck('DJANGO', 'A view runs `book.stock = F("stock") - 1`, then `book.save()`, then `return JsonResponse({"stock": book.stock})`. What goes wrong?',
        [['The UPDATE subtracts 1 twice from stock', false],
         ['stock holds an F expression, not a number', true],
         ['save() raises, as F() works only in update()', false],
         ['Nothing: save() reloads the field value', false]],
        'The database applied stock - 1 correctly, but the attribute on the instance is still the F expression, which JsonResponse cannot serialise. Call book.refresh_from_db(fields=["stock"]) before reading it.'),
      ck('DJANGO_REST', 'A ListCreateAPIView has `permission_classes = [IsAuthenticatedOrReadOnly]` and the default authentication classes. An anonymous client sends a POST. What status comes back?',
        [['401 Unauthorized', false],
         ['403 Forbidden', true],
         ['405 Method Not Allowed', false],
         ['201 Created', false]],
        'Unsafe methods need an authenticated user. The first default authenticator is SessionAuthentication, which has no WWW-Authenticate challenge, so DRF answers 403 rather than 401.'),
      ck('DJANGO', 'A saved Book runs `book.tags.add(tag)` and the function returns without calling `book.save()`. Is the tag linked in the database?',
        [['No: the link is lost without save()', false],
         ['Only after save() commits it', false],
         ['Yes: add() writes to the join table at once', true],
         ['No: add() needs a list, not one tag', false]],
        'Related-manager methods such as add, remove and set run their SQL immediately on the through table. save() writes the Book\'s own columns and has nothing to do with the ManyToMany rows.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_PYTHON_DJANGO_TIMED_SET',
    notes: `A company online test usually gives the Python and framework section **20 questions in 20 minutes**,
often with a quarter-mark negative marking; the questions do not get easier towards the end. Take this set with a
timer: one minute per question, skip anything over ninety seconds and come back. Then check the answer key — the
reasoning matters more than the score. Every Python output was run; every framework answer was checked.

## The set

**Q1.** \`print(type(1/1).__name__, 7 // 2.0, 2 ** -1)\`

**Q2.** \`print("abc" * 0 == "", [0] * 3, "-".join("abc"))\`

**Q3.** \`x = {1, 2, 3}; x.add(2); x |= {4}\` — print \`len(x)\` and \`{1, 2} < x\`.

**Q4.** \`d = {"a": 1}\` — print \`d.get("b")\`, \`d.get("b", 0)\`, \`d.setdefault("c", 5)\` and then \`len(d)\`.

**Q5.** \`print(bool([]), bool([0]), bool(""), bool(" "), bool(0.0))\`

**Q6.** \`nums = [3, 1, 2]; print(nums.sort(), nums, sorted(nums, reverse=True))\`

**Q7.** \`print(list(enumerate("ab", start=1)), list(zip("abc", [1, 2])))\`

**Q8.** \`s = "Hello"; print(s[1:4], s[-1], s.lower().count("l"), s.replace("l", "L", 1))\`

**Q9.** \`f(x)\` computes \`10 // x\` in try, returns "E" in \`except ZeroDivisionError\`, returns "ok" in else, and
prints "F " (no newline) in finally. What does \`print(f(0), f(2))\` show?

**Q10.** \`print([x if x % 2 else -x for x in range(5) if x])\`

**Q11.** \`a, *b, c = range(5); print(a, b, c)\`

**Q12.** \`print(max("apple", "Banana", "cherry"), max(["aa", "b"], key=len), min([], default=-1))\`

**Q13.** How many SQL queries does \`qs = Author.objects.filter(name__startswith="R")\` run on its own?

**Q14.** \`class Book(models.Model): author = models.ForeignKey(Author, on_delete=models.CASCADE)\` — how do you
reach an author's books?

**Q15.** Which manage.py command writes new migration files from model changes?

**Q16.** A new DRF project sets no \`REST_FRAMEWORK\` settings. Who can call a plain APIView?

**Q17.** What happens when a view reads \`serializer.data\` on a \`Serializer(data=...)\` before \`is_valid()\`?

**Q18.** Which method loads a ForeignKey with a JOIN, and which loads a ManyToMany in a second query?

**Q19.** A FastAPI POST body is missing a required field. What status does the client get?

**Q20.** What is Simple JWT's default access-token lifetime?

## Answer key and reasoning

1. **\`float 3.0 0.5\`** — \`/\` always returns a float; \`//\` with a float operand returns a float; a negative power
   gives a float.
2. **\`True [0, 0, 0] a-b-c\`** — a string times 0 is empty; join puts the separator between the characters.
3. **\`4 True\`** — adding an existing element changes nothing; \`|=\` adds 4; \`<\` on sets is "proper subset".
4. **\`None 0 5 2\`** — \`get\` never raises or inserts; \`setdefault\` inserts "c" and returns its value.
5. **\`False True False True False\`** — empty containers, empty strings and zero are falsy; \`[0]\` and \`" "\` are not
   empty.
6. **\`None [1, 2, 3] [3, 2, 1]\`** — \`list.sort()\` sorts in place and returns None; \`sorted\` returns a new list.
7. **\`[(1, 'a'), (2, 'b')] [('a', 1), ('b', 2)]\`** — zip stops at the shorter input.
8. **\`ell o 2 HeLlo\`** — the slice stops before index 4; the third argument of replace limits the count.
9. **\`F F E ok\`** — both calls finish (printing "F " each) before print shows their results; finally runs even
   after a return.
10. **\`[1, -2, 3, -4]\`** — the trailing \`if x\` filters out 0; the conditional expression picks the value.
11. **\`0 [1, 2, 3] 4\`** — the starred name collects the middle into a **list**.
12. **\`cherry aa -1\`** — strings compare by code point and lowercase letters sort after uppercase; with
    \`key=len\` the first longest wins; \`default\` avoids the ValueError on an empty sequence.
13. **None** — querysets are lazy until iterated, sliced with a step, \`len\`, \`list\` or \`bool\`.
14. **\`author.book_set.all()\`** — the default reverse accessor is the model name plus \`_set\`.
15. **\`makemigrations\`** — \`migrate\` applies them.
16. **Anyone** — the default permission is AllowAny.
17. **AssertionError** — \`is_valid()\` must be called first when \`data=\` is passed.
18. **\`select_related\`** for the ForeignKey (JOIN); **\`prefetch_related\`** for ManyToMany and reverse ForeignKeys.
19. **422 Unprocessable Entity**, with a \`detail\` list naming \`["body", "<field>"]\` and the type \`missing\`.
20. **5 minutes** (the refresh token lasts 1 day).

**Scoring yourself:** 17+ is test-ready; 13–16 means review the rule behind each miss; below 13, redo the output
and framework units before the next attempt.`,
    mcqs: [
      mcq('What does `print(0.1 + 0.2 == 0.3, round(0.1 + 0.2, 2) == 0.3)` print?',
        [['True True', false],
         ['False False', false],
         ['True False', false],
         ['False True', true]],
        '0.1 + 0.2 is 0.30000000000000004 in binary floating point, so the first comparison is False. Rounding to two places gives the float nearest 0.3, which is the same float as the literal 0.3.'),
      mcq('What does `print(list(range(10))[::3], list(range(5, 0, -2)))` print?',
        [['[0, 3, 6, 9] [5, 3, 1]', true],
         ['[0, 3, 6] [5, 3, 1]', false],
         ['[0, 3, 6, 9] [5, 3, 1, -1]', false],
         ['[3, 6, 9] [5, 3]', false]],
        'A step of 3 from index 0 takes 0, 3, 6 and 9. range(5, 0, -2) counts down from 5 and stops before reaching 0, so it yields 5, 3 and 1.'),
      mcq('`x = 5; f = lambda y: x + y; x = 10` — what is `f(1)`?',
        [['6', false],
         ['11', true],
         ['A NameError', false],
         ['15', false]],
        'The lambda looks up the global x when it is called, not when it is defined, and by then x is 10. Default arguments are the only part of a lambda evaluated at definition time.'),
      mcq('What does `print({**{"a": 1, "b": 2}, **{"b": 3}}, {"a": 1} | {"a": 2})` print on Python 3.10?',
        [['{\'a\': 1, \'b\': 2} {\'a\': 1}', false],
         ['A TypeError: dicts do not support |', false],
         ['{\'a\': 1, \'b\': 3} {\'a\': 1}', false],
         ['{\'a\': 1, \'b\': 3} {\'a\': 2}', true]],
        'In a dict display the later unpacking wins for a repeated key. The | merge operator exists since Python 3.9 and also lets the right-hand dict win.'),
      mcq('What does `s = "a,b,,c"; print(s.split(","), len(s.split()))` print?',
        [['[\'a\', \'b\', \'c\'] 4', false],
         ['[\'a\', \'b\', \'\', \'c\'] 1', true],
         ['[\'a\', \'b\', \'c\'] 3', false],
         ['[\'a\', \'b\', \'c\'] 1', false]],
        'With an explicit separator, split keeps the empty string between two adjacent commas. With no argument it splits on whitespace, and the string has none, so it is one piece.'),
      mcq('`n = Book.objects.filter(stock=0).update(stock=5)` matches 4 rows. What is n, and which `Book.save()` overrides run?',
        [['n is 4; save() runs for no row', true],
         ['n is 4; save() runs once for each row', false],
         ['n is None; save() runs for no row', false],
         ['n is the queryset; save() runs per row', false]],
        'update() issues one SQL UPDATE and returns the number of rows matched. It never loads the objects, so save() overrides, auto_now and the save signals are all bypassed.'),
      mcq('A DRF list view paginates with `page_size = 10` over 25 rows. A client requests `?page=9`. What does it get?',
        [['200 with an empty results list', false],
         ['200 with the last 5 rows', false],
         ['404 with detail "Invalid page."', true],
         ['400 with a validation error', false]],
        'PageNumberPagination raises NotFound for a page number past the last page, so the response is 404 with "Invalid page.". Page 3 would return the last 5 rows and next would be null.'),
      mcq('FastAPI declares `@app.get("/users/{user_id}")` with `user_id: int` first, and `@app.get("/users/me")` after it. What does `GET /users/me` return?',
        [['200 from the /users/me handler', false],
         ['404, as no route matches', false],
         ['A startup error about duplicate routes', false],
         ['422, from the user_id route', true]],
        'Routes are tried in declaration order, and /users/{user_id} matches the path first; "me" then fails int validation, so the client gets 422. Declare the fixed path before the parameterised one.'),
    ],
  },
  {
    unitCode: 'JT_MCQ_PYTHON_DJANGO_CHECKPOINT',
    notes: `Ten questions in the format of a company online test: Python output first, then Django, DRF and
FastAPI. Give yourself ten minutes, and for each snippet decide what is shared and when it runs before the value.`,
    checkpoint: [
      ck('PYTHON_BASICS', 'What does `print(int("0x1A", 16), int("011"), 0o11)` print?',
        [['26 11 9', true],
         ['26 9 9', false],
         ['A ValueError on "0x1A"', false],
         ['26 11 11', false]],
        'With base 16, int accepts the 0x prefix, giving 26. int("011") parses decimal and ignores the leading zero, giving 11. 0o11 is an octal literal, 9.'),
      ck('PYTHON_ADVANCED', '`g = (x for x in range(5))` — what does `print(2 in g, list(g))` print?',
        [['True [0, 1, 2, 3, 4]', false],
         ['True [3, 4]', true],
         ['True []', false],
         ['False [0, 1, 2, 3, 4]', false]],
        'in on a generator consumes values until it finds a match, so 0, 1 and 2 are used up. list(g) then gets only what remains, 3 and 4.'),
      ck('PYTHON_ADVANCED', 'Decorators `a` and `b` each return a function that wraps the result in "a(...)" and "b(...)". With `@a` written above `@b` above `def g(): return "g"`, what is `g()`?',
        [['b(a(g))', false],
         ['a(g)', false],
         ['a(b(g))', true],
         ['g', false]],
        'Stacked decorators apply bottom-up: g = a(b(g)). Calling the result runs a\'s wrapper, which calls b\'s wrapper, which calls the original, so a\'s text is outermost.'),
      ck('PYTHON_BASICS', 'What does `print("%d items" % 3.9, f"{7/2:.0f}", f"{2.5:.0f}")` print?',
        [['4 items 4 3', false],
         ['3 items 3 2', false],
         ['3 items 4 3', false],
         ['3 items 4 2', true]],
        '%d truncates a float to an int, giving 3. Formatting with .0f rounds half to even, so 3.5 becomes 4 and 2.5 becomes 2, the same rule as round().'),
      ck('PYTHON_ADVANCED', '`@dataclass class P: x: int` — what happens on `P(1) == P(1)` and then `{P(1)}`?',
        [['True, then a set with one P', false],
         ['True, then TypeError: unhashable type', true],
         ['False, then a set with one P', false],
         ['False, then TypeError: unhashable type', false]],
        'A dataclass generates __eq__ comparing fields, so the two are equal. Defining __eq__ without frozen=True (or unsafe_hash) sets __hash__ to None, so instances cannot go in a set.'),
      ck('PYTHON_BASICS', 'What does `print((1, 2) + (3,) == (1, 2, 3), (5) * 2, (5,) * 2)` print?',
        [['True (5, 5) (5, 5)', false],
         ['True 10 (5, 5)', true],
         ['False 10 (5, 5)', false],
         ['True 10 10', false]],
        'Tuples concatenate with +. (5) is just the int 5 in parentheses, so it multiplies to 10; only the trailing comma in (5,) makes a one-element tuple.'),
      ck('DJANGO', '`Book.title` is `CharField(max_length=100)` with no null and no default. `Book.objects.create(author=a)` runs. What is stored in title?',
        [['NULL', false],
         ['An IntegrityError is raised', false],
         ['A ValidationError is raised', false],
         ['An empty string', true]],
        'A CharField that is not nullable defaults to the empty string, and create() does not run full_clean(), so the row saves with "". Model validation (full_clean, forms, serializers) is where blank=False is enforced.'),
      ck('DJANGO', 'A model has `updated = DateTimeField(auto_now=True)`. A cron job runs `Book.objects.filter(stock=0).update(stock=10)`. What happens to updated?',
        [['It is unchanged, as update() skips save()', true],
         ['It is set to now for every matched row', false],
         ['It is set to NULL for every matched row', false],
         ['The update fails until updated is passed', false]],
        'auto_now is applied in the field\'s pre_save, which only save() calls. A bulk update must set it explicitly, for example update(stock=10, updated=timezone.now()).'),
      ck('DJANGO_REST', 'A serializer has `title = CharField(max_length=5)`, a `validate_title` that upper-cases it, and a `validate()`. It receives title "toolongtitle" and a valid stock. Which of the custom methods run?',
        [['Both validate_title and validate', false],
         ['Only validate_title', false],
         ['Neither of them', true],
         ['Only validate', false]],
        'The field\'s own max_length check fails first, so validate_title is skipped for that field, and validate() runs only when every field has passed. errors then holds the max_length message.'),
      ck('DJANGO_REST', 'A DRF project sets `DEFAULT_AUTHENTICATION_CLASSES` to JWTAuthentication then SessionAuthentication, and an IsAuthenticated view receives a request with no token. What is the response?',
        [['403 with no WWW-Authenticate header', false],
         ['401 with a Bearer challenge in the header', true],
         ['400, as the Authorization header is missing', false],
         ['302 redirect to the login page', false]],
        'DRF uses the first authentication class to build the challenge. JWTAuthentication provides one, so the response is 401 with a Bearer challenge; with SessionAuthentication first it would be 403.'),
    ],
  },
];

export const TRACK_CODING_PYTHON_BUNDLES: PilotBundle[] = [...CODING_BUNDLES, ...MCQ_BUNDLES];
