/**
 * Career-track content: DSA in Python over linear structures (JT_PY_DSA_LINEAR), second half —
 * hashing with dict, set and Counter, recursion and backtracking, sorting and binary search, and
 * the topic's ending units (debugging, practice, the interview question and the checkpoint). The
 * first four units (complexity, two pointers and sliding window, linked lists, stacks and queues)
 * live in their own file; the ending units here cover the whole topic, those four included.
 *
 * DSA is taught again in Python because a Python candidate is asked to write Python, with Python's
 * own tools: every concept unit names a classic problem, solves it in full, states its cost and
 * edge cases, and says plainly where Python differs from Java — keys must be hashable, the
 * recursion limit is about 1000, list.sort returns None, and integers never overflow.
 *
 * Every quoted output was run. The notes teach Python 3.10+, and the graded exercise (counting
 * inversions with merge sort) is plain 3.10 code, because the runner is Python 3.10. It carries one
 * hidden test of 100 000 numbers that an O(n²) double loop cannot finish in time.
 *
 * Attribution: the topic is multi-skill. Every checkpoint question names the one skill it
 * measures, taken from its own unit's skillKeys (concept units) or from the topic's seven
 * (debugging, practice, interview and checkpoint units). Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/** A fixed pseudo-random sequence (Park–Miller), so the large hidden test is the same on every seed run. */
const lcgSeq = (n: number, seed: number, mod: number): number[] => {
  let x = seed;
  return Array.from({ length: n }, () => { x = (x * 48271) % 2147483647; return x % mod; });
};
const INV_LARGE = lcgSeq(100000, 20261106, 50000);
const INV_DESC = Array.from({ length: 2000 }, (_, i) => 2000 - i);

export const TRACK_PY_DSA_LINEAR_B_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_DSA_LINEAR — DSA in Python: Linear Structures (hashing to the checkpoint) ═════ */
  {
    unitCode: 'JT_PY_DSA_LINEAR_HASHING',
    notes: `When a brute-force solution asks "have I seen this before?" or "how many of these are there?"
inside a loop, a \`dict\` or a \`set\` usually turns O(n²) into O(n). Both are hash tables: a lookup,
an insert and a delete cost **O(1) on average**. In the worst case — many keys landing in the same
slot — a single operation degrades to O(n), but with Python's built-in types that does not happen in
practice, and interviewers expect you to say "O(1) average".

The tools you will use:

| Need | Tool | Example |
|---|---|---|
| seen it before? | \`set\` | \`if x in seen:\` |
| value → something | \`dict\` | \`index_of[x] = i\` |
| how many of each? | \`collections.Counter\` | \`Counter("banana")\` |
| value → a list of things | \`collections.defaultdict(list)\` | \`groups[key].append(w)\` |

## Classic 1: two-sum, returning indices

**Problem.** Return the indices of two numbers in an unsorted list that add to \`target\`.

The brute force tries every pair: two nested loops, **O(n²)**. The better idea: as you walk the
list, remember every value you have passed and its index. For each new value \`x\`, the partner you
need is \`target - x\`; a dict answers "have I passed it?" in O(1).

    def two_sum(nums, target):
        seen = {}                          # value -> index
        for i, x in enumerate(nums):
            if target - x in seen:
                return (seen[target - x], i)
            seen[x] = i
        return None

    print(two_sum([5, 1, 5], 10))          # (0, 2)
    print(two_sum([3, 4], 6))              # None

Look up the partner **before** storing the current value, so a number never pairs with itself:
with \`[3, 4]\` and target 6, storing first would find the 3 it just stored and return \`(0, 0)\`.
Duplicates still work: \`[5, 1, 5]\` finds the first 5 when it reaches the second.
**O(n) time, O(n) space.**

## Classic 2: the first non-repeating character

    from collections import Counter

    def first_unique(s):
        counts = Counter(s)                # one pass: char -> how many
        for i, ch in enumerate(s):         # second pass, in the original order
            if counts[ch] == 1:
                return i
        return -1

    print(first_unique("leetcode"))        # 0
    print(first_unique("loveleetcode"))    # 2
    print(first_unique("aabb"))            # -1

Two passes, **O(n) time**; the counter holds at most one entry per distinct character. A
\`Counter\` returns 0 for a missing key instead of raising \`KeyError\`, and it does **not** add that
key. \`Counter(s).most_common(k)\` gives the k most frequent items, largest first:
\`Counter("banana").most_common(2)\` is \`[('a', 3), ('n', 2)]\`.

## Classic 3: group anagrams

Anagrams contain the same letters in a different order, so they share a **canonical key** — the
letters sorted.

    from collections import defaultdict

    def group_anagrams(words):
        groups = defaultdict(list)
        for w in words:
            groups["".join(sorted(w))].append(w)
        return list(groups.values())

    print(group_anagrams(["stop", "pots", "pest", "step", "spot"]))
    # [['stop', 'pots', 'spot'], ['pest', 'step']]

Cost: **O(n · m log m)** for n words of length m. For lowercase words a key of 26 letter counts,
\`tuple(counts)\`, is O(m) per word instead.

## What can be a key: hashable values

A dict key or a set member must be **hashable**: its hash must never change. \`int\`, \`str\`,
\`float\`, \`tuple\` (of hashable things) and \`frozenset\` are; \`list\`, \`dict\` and \`set\` are not.

    pos = {[1, 2]: "x"}      # TypeError: unhashable type: 'list'
    pos = {(1, 2): "x"}      # fine: use a tuple for a grid cell or a pair

Three Python-specific facts that differ from Java:

- **A class that defines \`__eq__\` without \`__hash__\` becomes unhashable.** Python sets its
  \`__hash__\` to \`None\`, so putting one in a set raises \`TypeError\`. (Java would silently use the
  identity hash and lose the entry.) Define both, from the same fields — or use
  \`@dataclass(frozen=True)\`, which writes both for you.
- **Equal numbers are the same key.** \`1 == 1.0 == True\` and their hashes match, so
  \`{1: 'a', True: 'b', 1.0: 'c'}\` is \`{1: 'c'}\`: one key, the first spelling, the last value.
- **\`d[key] += 1\` on a plain dict raises \`KeyError\`** for a new key. Use \`d.get(key, 0) + 1\`,
  a \`Counter\`, or a \`defaultdict(int)\`. But careful: merely *reading* \`dd[key]\` on a
  \`defaultdict\` inserts the key.

## Edge cases to say aloud

The empty list, a single element, every element the same, negative numbers (fine as keys), and a
pair made of the same value twice (\`[5, 5]\`, target 10).`,
    workedExample: `**Task.** Given an unsorted list of integers, return the length of the longest run of
consecutive values — \`[100, 4, 200, 1, 3, 2]\` has the run 1, 2, 3, 4, so the answer is 4. It must be
O(n), so sorting (O(n log n)) is not allowed.

**Brute force.** For every value, count upwards while the next value is in the list. Each \`in\` on a
list is O(n), and every value starts a count: O(n³) at worst.

**Step 1 — make lookups O(1).** Put the values in a set. Now "is y + 1 present?" is O(1), and
duplicates disappear for free.

**Step 2 — count each run once.** If every value starts a count, a run of length n is walked n times:
O(n²). So only start from a value that **begins** a run — one whose predecessor is missing.

    def longest_run(nums):
        present = set(nums)
        best = 0
        for x in present:
            if x - 1 not in present:        # x starts a run
                y = x
                while y + 1 in present:
                    y += 1
                best = max(best, y - x + 1)
        return best

    print(longest_run([100, 4, 200, 1, 3, 2]))                    # 4
    print(longest_run([9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]))       # 7  (3 to 9)
    print(longest_run([]))                                        # 0

**Cost.** Building the set is O(n). The inner \`while\` runs only from run starts, and each value is
stepped over by exactly one of them, so all the inner loops together are O(n). **O(n) time, O(n)
space.** The empty list gives 0, because the loop never runs; the duplicate -1 counts once.`,
    mcqs: [
      mcq('What does print({1: "a", True: "b", 1.0: "c"}) show?',
        [["{1: 'c'}", true], ["{1: 'a', True: 'b', 1.0: 'c'}", false], ["{1: 'a'}", false], ["{True: 'c'}", false]],
        '1, True and 1.0 are equal and hash the same, so they are one key. The dict keeps the first key spelling (1) and the last value written (c).'),
      mcq('class P with def __eq__(self, other): return True, and no __hash__. What does the expression {P()} do?',
        [['Raises TypeError: unhashable type', true], ['Builds a set holding one P object', false], ['Builds an empty set and warns once', false], ['Raises AttributeError for __hash__', false]],
        'Defining __eq__ without __hash__ makes Python set __hash__ to None, so instances cannot go in a set or be dict keys until __hash__ is defined.'),
      mcq('Using the two_sum that checks target - x in seen before storing x, what does two_sum([5, 1, 5], 10) return?',
        [['(0, 2)', true], ['(0, 0)', false], ['(2, 2)', false], ['None', false]],
        'At index 0 the dict is empty, so 5 is stored. At index 2, 10 - 5 = 5 is in seen at index 0, so it returns (0, 2) — never a value paired with itself.'),
    ],
    checkpoint: [
      ck('DSA_HASHING', 'What does Counter("banana").most_common(2) return?',
        [["[('a', 3), ('n', 2)]", true], ["[('b', 1), ('a', 3)]", false], ["{'a': 3, 'n': 2}", false], ["[('n', 2), ('a', 3)]", false]],
        'most_common returns a list of (item, count) tuples, highest count first: a appears 3 times and n twice.'),
      ck('DSA_HASHING', 'Words are grouped with the key "".join(sorted(w)). How many groups do stop, pots, tops, opts, post, spot, pest and step make?',
        [['2', true], ['8', false], ['6', false], ['3', false]],
        'The first six all sort to "opst" and the last two to "epst", so the defaultdict ends up with exactly two keys.'),
      ck('DSA_HASHING', 'A grid search stores visited cells as visited[[row, col]] = True and crashes. What is the fix?',
        [['Use a tuple key: visited[(row, col)]', true], ['Use visited.add([row, col]) instead', false], ['Convert visited to a defaultdict', false], ['Wrap the key in str() before using it', false]],
        'A list is mutable and so unhashable, giving TypeError. A tuple of ints is hashable and is the usual key for a cell; str() works but is slow and clumsy.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_RECURSION',
    notes: `A recursive function solves a problem by calling itself on a smaller version of it. Every correct
one has two parts: a **base case** that answers directly, and a **recursive case** that makes the
input strictly smaller, so the base case is always reached.

    def sum_digits(n):
        if n < 10:                          # base case
            return n
        return n % 10 + sum_digits(n // 10)    # a smaller input

    print(sum_digits(472))                  # 13

## The call stack, and Python's limit

Each call gets its own **frame** with its own \`n\`. \`sum_digits(472)\` waits on \`sum_digits(47)\`,
which waits on \`sum_digits(4)\`; 4 returns, then \`7 + 4 = 11\`, then \`2 + 11 = 13\`. A recursion n
levels deep holds n frames at once: **O(n) stack space**.

Python, unlike many languages, caps the depth. \`sys.getrecursionlimit()\` is **1000** by default,
and going deeper raises \`RecursionError: maximum recursion depth exceeded\`. Python also does
**not** optimise tail calls, so rewriting as "return f(n - 1)" does not help.

    def total(xs):
        return 0 if not xs else xs[0] + total(xs[1:])

    total(list(range(5000)))      # RecursionError

That function has a second problem: \`xs[1:]\` copies the list on every call, so it is O(n²) as well.
Pass an index instead of slicing.

\`sys.setrecursionlimit(10**6)\` raises the cap, and is common in competitive code, but it only moves
the problem: the real C stack can still overflow, and then the interpreter crashes with no
traceback at all. **Rule of thumb:** recursion whose depth is log n (binary search, merge sort,
balanced trees) is always safe; recursion whose depth is n (walking a long list or a path-shaped
tree) should become a loop once n can reach the thousands.

## Watching the order

    def show(n):
        if n == 0:
            return
        show(n - 1)
        print(n, end=" ")

    show(3)                # 1 2 3

The print runs **after** the recursive call returns, so the deepest call prints first. Move the
print above the call and the output becomes \`3 2 1\`.

## Repeated work, and functools.cache

Naive Fibonacci calls itself twice per level: \`fib(5)\` makes **15** calls and the count grows
exponentially. The same values are computed again and again, so remembering them — **memoisation** —
removes the waste:

    from functools import cache

    @cache
    def fib(n):
        return n if n < 2 else fib(n - 1) + fib(n - 2)

With \`@cache\` the body runs once per distinct n — six times for \`fib(5)\` — so it is O(n). That is
the bridge to dynamic programming, taught with trees and graphs.

## Backtracking: choose, explore, un-choose

**Classic: every subset of a list.** Each element is either in or out.

    def subsets(nums):
        out, path = [], []

        def build(i):
            if i == len(nums):              # decided every element
                out.append(path[:])         # store a COPY
                return
            build(i + 1)                    # leave nums[i] out
            path.append(nums[i])            # choose
            build(i + 1)                    # put nums[i] in
            path.pop()                      # un-choose

        build(0)
        return out

    print(subsets([1, 2, 3]))
    # [[], [3], [2], [2, 3], [1], [1, 3], [1, 2], [1, 2, 3]]

**2ⁿ subsets, O(n · 2ⁿ) time** counting the copies. Two bugs are classic. \`out.append(path)\`
instead of a copy stores 2ⁿ references to one list, which ends empty — \`[[], [], [], []]\` for
\`[1, 2]\`. Forgetting \`path.pop()\` leaks a choice into the sibling branch. The nested function
reads \`nums\`, \`out\` and \`path\` from the enclosing function; it only needs \`nonlocal\` if it
*rebinds* one of them, and \`append\` and \`pop\` do not.

## Permutations

    def permutations(nums):
        out, path, used = [], [], [False] * len(nums)

        def go():
            if len(path) == len(nums):
                out.append(path[:])
                return
            for i, x in enumerate(nums):
                if used[i]:
                    continue
                used[i] = True;  path.append(x)
                go()
                used[i] = False; path.pop()          # un-choose both

        go()
        return out

n! orderings, **O(n · n!)**. The library does the same: \`itertools.permutations\` and
\`itertools.combinations\` are fine in real code, and an interviewer who asks you to *write* it wants
the backtracking above. Note that \`itertools.permutations("aab")\` yields 6 tuples, because it
treats the two a's as different positions; \`set(...)\` of it has 3.

## Writing one

State in one sentence what the function returns; write the base case for the smallest input
(empty, zero, one element); trust the call on the smaller input and use its result; then trace the
smallest non-trivial case by hand.`,
    workedExample: `**Task.** Generate every string of n pairs of brackets that is balanced. For n = 3 there are
five: \`((()))\`, \`(()())\`, \`(())()\`, \`()(())\`, \`()()()\`.

**Brute force.** Generate all 2²ⁿ strings of \`(\` and \`)\` and keep the balanced ones — 64 strings for
n = 3, but over a million for n = 10, almost all of them wasted.

**Better: never build an invalid prefix.** Two rules decide what may come next:

- an opening bracket is allowed while fewer than n have been used;
- a closing bracket is allowed only while it has an opener to match — \`closed < opened\`.

Any prefix built under those rules can be completed, so backtracking never reaches a dead end.

    def balanced(n):
        out, path = [], []

        def build(opened, closed):
            if len(path) == 2 * n:                      # base case: a full string
                out.append("".join(path))
                return
            if opened < n:
                path.append("(")
                build(opened + 1, closed)
                path.pop()                              # un-choose
            if closed < opened:
                path.append(")")
                build(opened, closed + 1)
                path.pop()

        build(0, 0)
        return out

    print(balanced(3))
    # ['((()))', '(()())', '(())()', '()(())', '()()()']
    print(len(balanced(4)))     # 14

**Trace.** For n = 1: \`build(0, 0)\` may only open → \`(\`; then \`build(1, 0)\` may only close →
\`()\`, the length is 2, it is stored. **Depth** is 2n, so no recursion-limit worry for any n you could
print. **Cost:** the number of results (the Catalan numbers) times 2n to join each one.`,
    mcqs: [
      mcq('def f(n): return n if n < 10 else f(sum(int(d) for d in str(n))). What does f(98765) return?',
        [['8', true], ['35', false], ['5', false], ['9', false]],
        'The digits of 98765 sum to 35, which is not below 10, so f(35) runs: 3 + 5 = 8, the base case. It repeats until one digit is left.'),
      mcq('In the subsets backtracking, out.append(path) is written instead of out.append(path[:]). What does subsets([1, 2]) return?',
        [['[[], [], [], []]', true], ['[[], [2], [1], [1, 2]]', false], ['[[1, 2], [1, 2], [1, 2], [1, 2]]', false], ['[[1], [2]]', false]],
        'All four entries are the same list object. Every append is undone by a pop, so by the end that one list is empty, and all four show [].'),
      mcq('total(xs) returns 0 if xs is empty, else xs[0] + total(xs[1:]). Called on list(range(5000)) with default settings, what happens?',
        [['RecursionError, as the limit is about 1000', true], ['It returns 12497500 after a short pause', false], ['MemoryError from the 5000 list slices', false], ['It runs forever, as the list never empties', false]],
        'Each element adds one frame, and 5000 frames exceed the default limit of 1000. The slicing also makes it O(n²); pass an index, or use a loop or sum().'),
    ],
    checkpoint: [
      ck('DSA_RECURSION', 'How many calls in total does the naive fib(5) make, where fib(n) returns n if n < 2 else fib(n - 1) + fib(n - 2)?',
        [['15', true], ['5', false], ['6', false], ['8', false]],
        'Calls grow like the sequence itself: c(n) = 1 + c(n-1) + c(n-2) with c(0) = c(1) = 1, giving 1, 1, 3, 5, 9, 15. With @cache the body would run only 6 times.'),
      ck('DSA_RECURSION', 'def show(n): if n == 0: return; then show(n - 1); then print(n, end=" "). What does show(3) print?',
        [['1 2 3', true], ['3 2 1', false], ['3 2 1 0', false], ['0 1 2 3', false]],
        'Each call prints only after the call below it returns, so show(1) prints first. The base case n == 0 returns without printing.'),
      ck('DSA_RECURSION', 'Why is a recursive merge sort on 100 000 items safe under Python\'s default recursion limit?',
        [['Its depth is about log2 n, around 17 levels', true], ['Python removes tail calls from the stack frames', false], ['sorted() raises the recursion limit itself', false], ['Each call returns before the next one starts', false]],
        'Merge sort halves the list at each level, so only about 17 frames are live at once for 100 000 items — far below 1000. Linear-depth recursion is what hits the limit.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_SORTING_SEARCHING',
    notes: `## Sorting with the library

    marks = [72, 85, 60]
    marks.sort()                       # sorts IN PLACE, returns None
    ranked = sorted(marks, reverse=True)   # returns a NEW list: [85, 72, 60]

The most common sorting bug in Python is \`nums = nums.sort()\`, which sets \`nums\` to \`None\`.
\`list.sort()\` changes the list and returns nothing; \`sorted()\` takes any iterable and returns a
new list. Both cost **O(n log n)**.

Python sorts with **Timsort**, which is **stable**: elements that compare equal keep their original
order. It is also very fast on data that is already partly sorted.

## Key functions

Instead of a Java \`Comparator\`, Python passes a **key**: a function applied to each element once,
whose results are compared.

    words = ["bob", "Al", "carl", "Dee"]
    print(sorted(words))                  # ['Al', 'Dee', 'bob', 'carl']  (capitals first)
    print(sorted(words, key=str.lower))   # ['Al', 'bob', 'carl', 'Dee']

    fruit = ["kiwi", "fig", "pear", "date", "yam"]
    print(sorted(fruit, key=len))         # ['fig', 'yam', 'kiwi', 'pear', 'date']  (stable)

**Several keys:** return a tuple. Tuples compare element by element, and negating a number reverses
it, so "marks high to low, then name A to Z" is:

    rows = [("ravi", 82), ("anu", 91), ("kiran", 82), ("bala", 91)]
    print(sorted(rows, key=lambda r: (-r[1], r[0])))
    # [('anu', 91), ('bala', 91), ('kiran', 82), ('ravi', 82)]

When a key cannot be negated (two strings, one descending), use stability instead: sort by the
secondary key first, then by the primary. For a genuine two-argument comparison,
\`functools.cmp_to_key\` turns a \`cmp(a, b)\` function into a key.

## Merge sort by hand

Interviewers ask you to write one sort. Merge sort is the one to know: split in half, sort each half,
merge the two sorted halves.

    def merge_sort(a):
        if len(a) <= 1:                        # 0 or 1 element is sorted
            return a
        mid = len(a) // 2
        left = merge_sort(a[:mid])
        right = merge_sort(a[mid:])
        out, i, j = [], 0, 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:            # <= keeps it stable
                out.append(left[i]); i += 1
            else:
                out.append(right[j]); j += 1
        out.extend(left[i:])                   # one side may have leftovers
        out.extend(right[j:])
        return out

    print(merge_sort([5, 2, 9, 1, 5, 6]))      # [1, 2, 5, 5, 6, 9]

There are log n levels and each level merges n items: **O(n log n) in every case, O(n) extra
space.** It splits by position, not by a pivot value, so no input makes it slow — unlike quicksort,
whose worst case is O(n²). The recursion depth is about log₂ n, so it is safe for any list size.

## The classic: binary search

    def binary_search(a, target):
        lo, hi = 0, len(a) - 1                 # inclusive range [lo, hi]
        while lo <= hi:
            mid = (lo + hi) // 2
            if a[mid] == target:
                return mid
            if a[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1

**O(log n) time, O(1) space**, on sorted data only. Two details decide correctness: with an
inclusive \`hi\` the loop is \`lo <= hi\`, and both updates move **past** \`mid\`, or a range can stop
shrinking and loop forever. One Java worry does not apply: Python integers never overflow, so
\`(lo + hi) // 2\` is safe at any size.

## bisect: binary search from the library

\`bisect\` works on a sorted list:

- \`bisect_left(a, x)\` — the first index where \`x\` could go: the first element **≥ x**.
- \`bisect_right(a, x)\` — the index just after the last \`x\`: the first element **> x**.

    from bisect import bisect_left, bisect_right, insort

    a = [1, 2, 2, 2, 5]
    print(bisect_left(a, 2), bisect_right(a, 2))     # 1 4
    print(bisect_right(a, 2) - bisect_left(a, 2))    # 3 — how many 2s, in O(log n)
    print(bisect_left(a, 99))                        # 5 — past the end when nothing is ≥ 99

Found-or-not is \`i = bisect_left(a, x)\` then \`i < len(a) and a[i] == x\`. Since Python 3.10 both
functions take a \`key=\` argument. \`insort(a, x)\` inserts in sorted position, but the insert shifts
elements, so it is **O(n)** per call even though the search is O(log n). Python has no built-in
sorted map like Java's \`TreeMap\`; a sorted list with \`bisect\` (or the third-party
\`sortedcontainers\`) fills that role.

## Binary search on the answer

When the question is "the smallest x for which some check passes", and the check is monotonic
(false, false, …, true, true), binary search over x itself: the minimum ship capacity, the square
root, the earliest day. That is the same \`lo\`/\`hi\` loop, with \`a[mid]\` replaced by \`check(mid)\`.`,
    workedExample: `**Task.** In a sorted list, return the first and last index of \`target\`, or \`(-1, -1)\` if it is
absent. \`[5, 7, 7, 8, 8, 10]\` with target 8 gives \`(3, 4)\`. It must be O(log n).

**Brute force.** Scan left to right for the first 8 and keep going to the last: O(n), and an
interviewer will point out the list is sorted.

**Step 1 — the first index.** \`bisect_left(a, target)\` is the first position whose value is
**≥ target**. If that position is past the end, or holds something else, the target is absent.

**Step 2 — the last index.** \`bisect_right(a, target)\` is the first position **> target**, so the
last 8 is one before it.

    from bisect import bisect_left, bisect_right

    def first_last(a, target):
        i = bisect_left(a, target)
        if i == len(a) or a[i] != target:
            return (-1, -1)
        return (i, bisect_right(a, target) - 1)

    print(first_last([5, 7, 7, 8, 8, 10], 8))     # (3, 4)
    print(first_last([5, 7, 7, 8, 8, 10], 6))     # (-1, -1)
    print(first_last([], 0))                      # (-1, -1)

**Why the guard is \`i == len(a)\` first.** For a target larger than everything, \`bisect_left\`
returns \`len(a)\`, and reading \`a[i]\` there would raise \`IndexError\`; \`or\` stops before the read.
The empty list takes the same path, since \`len(a)\` is 0.

**Cost.** Two binary searches: **O(log n) time, O(1) space.** If the interviewer bans \`bisect\`,
write the half-open lower-bound loop — \`lo, hi = 0, len(a)\`; \`while lo < hi\`; if
\`a[mid] < target\` then \`lo = mid + 1\` else \`hi = mid\` — and run it once for \`target\` and once for
\`target + 1\` (for integers).`,
    mcqs: [
      mcq('nums = [3, 1, 2]; nums = nums.sort(); print(nums). What is printed?',
        [['None', true], ['[1, 2, 3]', false], ['[3, 1, 2]', false], ['[3, 2, 1]', false]],
        'list.sort() sorts in place and returns None, and that None is then assigned to nums. Use nums.sort() alone, or nums = sorted(nums).'),
      mcq('What does sorted(["bob", "Al", "carl", "Dee"]) return, with no key?',
        [["['Al', 'Dee', 'bob', 'carl']", true], ["['Al', 'bob', 'carl', 'Dee']", false], ["['bob', 'carl', 'Al', 'Dee']", false], ["['Dee', 'carl', 'bob', 'Al']", false]],
        'Strings compare by code point, and every capital letter comes before every lowercase one. key=str.lower gives the dictionary order instead.'),
      mcq('What does sorted(["kiwi", "fig", "pear", "date", "yam"], key=len) return?',
        [["['fig', 'yam', 'kiwi', 'pear', 'date']", true], ["['fig', 'yam', 'date', 'kiwi', 'pear']", false], ["['yam', 'fig', 'kiwi', 'pear', 'date']", false], ["['kiwi', 'pear', 'date', 'fig', 'yam']", false]],
        'Python\'s sort is stable: words of equal length keep their original order, so fig stays before yam and kiwi, pear, date stay as given.'),
    ],
    checkpoint: [
      ck('DSA_SORTING', 'a = [1, 2, 2, 2, 5]. What does bisect_right(a, 2) - bisect_left(a, 2) give?',
        [['3', true], ['4', false], ['1', false], ['2', false]],
        'bisect_left is 1 (the first 2) and bisect_right is 4 (just past the last 2), so the difference counts the 2s in O(log n).'),
      ck('DSA_SORTING', 'A program keeps a list sorted by calling bisect.insort for each of n values. What is the total cost?',
        [['O(n²), as each insert shifts later items', true], ['O(n log n), one binary search per value', false], ['O(n), as insort appends to the end', false], ['O(log n), as the list is always sorted', false]],
        'Finding the position is O(log n), but inserting into a Python list moves every later element, which is O(n) per call and O(n²) overall.'),
      ck('DSA_SORTING', 'Why can a Python binary search use mid = (lo + hi) // 2 without the overflow worry that Java code has?',
        [['Python ints grow as needed and never wrap', true], ['Python lists hold at most 2^31 elements', false], ['The // operator checks for overflow first', false], ['Python stores list indexes as float values', false]],
        'Java ints wrap past 2^31 - 1, so lo + hi can turn negative. Python integers are arbitrary-precision, so the sum is always exact.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_DEBUGGING',
    notes: `DSA bugs cluster around boundaries — the first and last element, the empty input, the deepest
call — and around Python's own behaviour. These eight appear in interview code constantly, across
the whole topic. For each one: read the broken code, find the input that breaks it, and say why.

## Bug 1: off-by-one in binary search

    def search(a, t):
        lo, hi = 0, len(a) - 1
        while lo < hi:                   # BUG
            mid = (lo + hi) // 2
            if a[mid] == t: return mid
            if a[mid] < t: lo = mid + 1
            else: hi = mid - 1
        return -1

**Breaks on:** \`search([7], 7)\` and \`search([1, 3, 5], 5)\` — both return -1. The element where
\`lo\` and \`hi\` meet is never checked. **Diagnosis:** \`hi\` is inclusive, so \`[lo, hi]\` is
non-empty while \`lo <= hi\`. **Fix:** \`while lo <= hi\`. Pick one convention — inclusive or
half-open — and make the condition and both updates agree with it.

## Bug 2: recursion too deep

    def total(xs, i=0):
        if i == len(xs): return 0
        return xs[i] + total(xs, i + 1)

    total(list(range(5000)))       # RecursionError: maximum recursion depth exceeded

**Breaks on:** any list longer than about 1000. The traceback repeats the same line hundreds of
times, then says "maximum recursion depth exceeded". **Diagnosis:** linear-depth recursion against
Python's limit. **Fix:** a loop (or \`sum(xs)\`). A missing or skipped base case gives the same error
on *every* input: \`if n == 0\` with a step of \`n - 2\` never reaches 0 from an odd n — guard with
\`n <= 0\`.

## Bug 3: the hidden O(n) in a queue

    queue = [start]
    while queue:
        node = queue.pop(0)        # BUG: O(n) per pop
        ...

**Breaks on:** large inputs — correct answers, but a time-limit failure. \`pop(0)\` shifts every
remaining element. **Fix:** \`from collections import deque\`; \`queue.popleft()\` is O(1). The same
trap: \`x in some_list\` inside a loop is O(n) per check; build a \`set\` first.

## Bug 4: changing a list while looping over it

    nums = [2, 4, 5, 6, 8]
    for x in nums:
        if x % 2 == 0:
            nums.remove(x)
    print(nums)                    # [4, 5, 8]  — not [5]

**Breaks on:** two qualifying elements next to each other. Python raises **no error** here (Java
throws \`ConcurrentModificationException\`); removing shifts the list left, so the loop skips the
element after each removal. **Fix:** build a new list, \`nums = [x for x in nums if x % 2]\`, or
loop over a copy, \`for x in nums[:]\`.

## Bug 5: the None at the end of a linked list

    def remove_value(head, x):
        cur = head
        while cur.next:
            if cur.next.val == x:
                cur.next = cur.next.next
            cur = cur.next             # BUG
        return head

**Breaks on:** removing the last node: \`cur\` becomes \`None\`, and \`cur.next\` raises
\`AttributeError: 'NoneType' object has no attribute 'next'\`. It also skips the node after every
removal. **Fix:** advance only when nothing was removed (\`else: cur = cur.next\`), check
\`head is None\` first, and use a dummy node in front of \`head\` so that removing the head is not a
special case.

## Bug 6: one list shared by every result

    out.append(path)               # BUG in backtracking: store path[:]

**Breaks on:** every input: all results are the same list, which is empty once backtracking
finishes. **Fix:** append a copy — \`path[:]\`, \`list(path)\` or \`tuple(path)\`.

## Bug 7: counting into a plain dict

    counts = {}
    for ch in s:
        counts[ch] += 1            # KeyError on the first character

**Fix:** \`counts[ch] = counts.get(ch, 0) + 1\`, or \`Counter(s)\`. And the opposite surprise: with a
\`defaultdict(int)\`, a check like \`if dd[k] == 0\` **inserts** \`k\`; test membership with
\`k in dd\`.

## Bug 8: a stack popped while empty

    def valid(s):
        stack = []
        for ch in s:
            if ch in "([{": stack.append(ch)
            elif stack.pop() != pairs[ch]: return False    # BUG
        return not stack

**Breaks on:** \`"]"\` — \`pop\` from an empty list raises \`IndexError\`. **Fix:**
\`elif not stack or stack.pop() != pairs[ch]: return False\`. \`or\` stops before the pop when the
stack is empty.

## The method

Before running anything, try the code by hand on: the empty input, one element, two elements, the
target at the first and at the last position, the target absent, and the largest size the problem
allows — that last one finds the RecursionError and the hidden O(n²).`,
    mcqs: [
      mcq('nums = [2, 4, 5, 6, 8]; a for loop over nums calls nums.remove(x) for each even x. What is print(nums) afterwards?',
        [['[4, 5, 8]', true], ['[5]', false], ['[2, 4, 5, 6, 8]', false], ['RuntimeError: list changed size', false]],
        'Removing 2 shifts 4 into index 0, but the loop moves on to index 1 (5). The same skip saves 8 after 6 is removed. Python raises no error for lists.'),
      mcq('The binary search uses hi = len(a) - 1 with while lo < hi. Which call wrongly returns -1?',
        [['search([1, 3, 5], 5)', true], ['search([1, 3, 5], 3)', false], ['search([1, 3, 5], 4)', false], ['search([1, 3, 5, 7], 3)', false]],
        'For 5, mid = 1 holds 3, so lo becomes 2. Now lo == hi, the loop stops, and index 2 is never checked. 3 is found at mid, and 4 is absent anyway.'),
      mcq('A BFS on 200 000 nodes gives correct answers but times out. It uses a list as the queue with queue.pop(0). What is the fix?',
        [['Use a deque and popleft(), which is O(1)', true], ['Raise the limit with sys.setrecursionlimit', false], ['Sort the queue before every pop call', false], ['Replace the list with a set of nodes', false]],
        'list.pop(0) shifts every remaining element, O(n) per pop and O(n²) overall. collections.deque removes from the left in O(1).'),
      mcq('A word counter does counts[w] += 1 on a plain dict, counts = {}. What happens on the first word?',
        [['KeyError, because the key does not exist', true], ['The count is set to 1 for that word', false], ['TypeError: None + 1 is not supported', false], ['The word is skipped without any error', false]],
        '+= first reads counts[w], and reading a missing key from a plain dict raises KeyError. Use get(w, 0) + 1, Counter, or defaultdict(int).'),
      mcq('In a bracket checker, elif stack.pop() != pairs[ch] crashes on the input "]". Which error, and why?',
        [['IndexError, popping from an empty list', true], ['KeyError, since "]" is not a dict key', false], ['TypeError, comparing str with None', false], ['AttributeError, list has no pop method', false]],
        'The first character is a closer, so nothing has been pushed and list.pop() raises IndexError. Check not stack before popping.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_PRACTICE',
    notes: `Solve each in Python without looking at the notes, then state the time and space cost **before** you
run it. Test the empty and one-element cases every time, and then the largest size the problem
allows — Python is fast enough for O(n log n) on 100 000 items and far too slow for O(n²).

## Exercise 1 — Move zeroes

Move every 0 in a list to the end, keeping the order of the others, **in place**. (Two pointers: one
reads, one writes. O(n) time, O(1) space. \`sorted(nums, key=lambda x: x == 0)\` works too — say why
it is stable, and why it is O(n log n) and not in place.)

## Exercise 2 — Remove the n-th node from the end

Given the head of a linked list and n, remove the n-th node from the end in one pass. (A dummy node
in front of \`head\`, and a lead pointer n steps ahead of the trailing one.)

## Exercise 3 — Daily temperatures

For each day, how many days until a warmer one, or 0. (A Python list as a stack of indices — the
same shape as next greater element. Each index is pushed and popped once: O(n).)

## Exercise 4 — Valid anagram

Are two strings anagrams? Write it as \`Counter(a) == Counter(b)\`, then with a plain dict, then with
\`sorted(a) == sorted(b)\`, and give the cost of each.

## Exercise 5 — Search a rotated sorted list

\`[4, 5, 6, 7, 0, 1, 2]\`: find a target in O(log n). (At each \`mid\`, one half is sorted; decide
whether the target lies in it. \`bisect\` cannot do this directly — the list is not sorted.)

## Exercise 6 — The graded exercise: count the inversions

An **inversion** is a pair of positions i < j with \`a[i] > a[j]\` — two items in the wrong order.
The count measures how far a list is from sorted. Two nested loops find it in O(n²), which cannot
finish for 100 000 numbers; merge sort can count them while it sorts, in O(n log n). This one is
auto-graded.`,
    mcqs: [
      mcq('While merging two sorted halves to count inversions, right[j] is taken before left[i]. How many inversions does that step add?',
        [['len(left) - i, the items still waiting in left', true], ['1, for the single pair left[i] and right[j]', false], ['j, the items already taken from the right', false], ['len(right) - j, the items left in the right half', false]],
        'left is sorted, so every item from left[i] onwards is greater than right[j], and each one sits before it in the original order.'),
      mcq('In the inversion-counting merge, why must the comparison be left[i] <= right[j] rather than left[i] < right[j]?',
        [['Equal values are not inversions, so take left first', true], ['With < the merged output would no longer be sorted', false], ['<= is faster for Python ints than the < operator', false], ['With < the recursion goes one level deeper each time', false]],
        'With <, an equal right[j] is taken first and counted against left[i], although a[i] > a[j] is false for equal values. <= also keeps the sort stable.'),
      mcq('Removing the n-th node from the end, why put a dummy node in front of head?',
        [['So removing the head needs no special case', true], ['So the list can be walked twice in one pass', false], ['So the lead pointer can start at None safely', false], ['So the list length is known before the loop', false]],
        'When n equals the length, the node to remove is head itself. With a dummy, the trailing pointer stops on the dummy and the same unlink works.'),
      mcq('Daily temperatures with a Python list as a stack of indices: what is the total cost for n days?',
        [['O(n), since each index is pushed and popped once', true], ['O(n²), since the inner while loop can run n times', false], ['O(n log n), since the stack stays in sorted order', false], ['O(n), but only if the list is a deque instead', false]],
        'The inner while can be long once, but each index leaves the stack at most once over the whole run, so all pops together are O(n). append and pop at the end are O(1) on a list.'),
      mcq('Checking two strings are anagrams, how do Counter(a) == Counter(b) and sorted(a) == sorted(b) compare in time?',
        [['O(n) for the Counters, O(n log n) for sorting', true], ['Both are O(n), as each reads each character once', false], ['Both are O(n log n), as Counter sorts its keys', false], ['O(n²) for the Counters, O(n) for the sorting', false]],
        'Counting is one pass with O(1) dict updates. Sorting is O(n log n). Both work for any characters, not only a to z.'),
    ],
    assignment: {
      title: 'Count the Inversions',
      description: 'Merge sort in Python that counts, while it sorts, how many pairs of numbers are in the wrong order — in O(n log n), fast enough for 100 000 numbers.',
      instructions: `Read from standard input:

- Line 1: an integer **n** (0 ≤ n ≤ 100 000).
- Line 2: **n** integers a₀ … aₙ₋₁ separated by spaces (|aᵢ| ≤ 10⁹). Duplicates and negative
  numbers are allowed. When n is 0 this line is empty.

Print a single integer: the number of **inversions** — pairs of positions i < j with
\`a[i] > a[j]\`. Equal values are **not** an inversion.

Examples:

| Input | Output | Why |
|---|---|---|
| \`5\` / \`2 4 1 3 5\` | \`3\` | (2, 1), (4, 1), (4, 3) |
| \`4\` / \`4 3 2 1\` | \`6\` | every pair is reversed |
| \`3\` / \`2 2 2\` | \`0\` | equal values do not count |
| \`0\` / (empty) | \`0\` | no pairs at all |

Requirements:

- Solve it in **O(n log n)**. Two nested loops over every pair take about 5 × 10⁹ steps at
  n = 100 000 — minutes in Python. One hidden test has n = 100 000 and must finish in a couple of
  seconds.
- Count inside **merge sort**: when the merge takes an element from the right half, every element
  still waiting in the left half is greater than it, and each of those is one inversion.
- The answer can reach about 5 × 10⁹; Python integers handle that without any change.
- Merge sort's recursion depth is about log₂ n (17 for 100 000), so the default recursion limit is
  fine. Do not raise it.
- Do not import anything except \`sys\`. Write the time and space cost of your solution in a comment
  at the top of the file.`,
      rubric: [
        { criterion: 'Correct count', description: 'Every test passes, including n = 0, one element, duplicates (equal values not counted), negatives and the 100 000-number test.', maxPoints: 50 },
        { criterion: 'O(n log n) merge-sort counting', description: 'The count is added during the merge as the number of items left in the left half; there is no loop over every pair.', maxPoints: 30 },
        { criterion: 'Stated cost and clean code', description: 'Time O(n log n) and space O(n) stated in a comment; the merge uses <= for stability; clear names and a function that returns rather than prints.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def sort_and_count(a):
    """Return (sorted copy of a, number of inversions in a)."""
    # TODO: base case - a list of 0 or 1 items is sorted and has no inversions
    # TODO: sort and count each half recursively
    # TODO: merge the halves; when an item comes from the right half,
    #       add the number of items still waiting in the left half
    return list(a), 0


def main():
    data = sys.stdin.read().split()
    n = int(data[0]) if data else 0
    a = [int(x) for x in data[1:1 + n]]
    # TODO: print the number of inversions in a


main()
`,
        tests: [
          { input: '5\n2 4 1 3 5\n', expectedOutput: '3' },
          { input: '4\n4 3 2 1\n', expectedOutput: '6' },
          { input: '0\n\n', expectedOutput: '0', isHidden: true },
          { input: '1\n42\n', expectedOutput: '0', isHidden: true },
          { input: '8\n3 3 1 3 1 1 2 2\n', expectedOutput: '14', isHidden: true },
          { input: '6\n-1 -5 0 -5 2 -3\n', expectedOutput: '6', isHidden: true },
          { input: `2000\n${INV_DESC.join(' ')}\n`, expectedOutput: '1999000', isHidden: true },
          { input: `100000\n${INV_LARGE.join(' ')}\n`, expectedOutput: '2499614260', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_INTERVIEW_QUESTION',
    notes: `Four linear-structure questions asked constantly in Python coding rounds. Interviewers grade the
explanation as much as the code: say the brute force, say why it is slow, then say the better idea
and its cost **before** you type. Python lets you write less code than Java — so the interviewer
listens harder to whether you know what each built-in costs.

## Q1. "Reverse a singly linked list."

**Say aloud.** "I'll walk the list once, keeping \`prev\` and \`cur\`. At each node I point
\`cur.next\` back at \`prev\` and step both forward. When \`cur\` is \`None\`, \`prev\` is the new head.
O(n) time, O(1) space. An empty list returns \`None\`; one node returns itself."

    def reverse(head):
        prev, cur = None, head
        while cur:
            cur.next, prev, cur = prev, cur, cur.next
        return prev

**The trap in that one line.** Python evaluates the whole right-hand side first, then assigns the
targets **left to right**. In the order above, \`cur.next\` is assigned while \`cur\` is still the old
node. Write \`prev, cur, cur.next = cur, cur.next, prev\` instead and \`cur\` changes before
\`cur.next\` is assigned — you rewire the wrong node, and at the end \`None.next\` raises
\`AttributeError\`. If in doubt, use a temporary: \`nxt = cur.next\`.

**Follow-up:** "Now recursively." — \`new_head = reverse(head.next)\`, then
\`head.next.next = head\` and \`head.next = None\`. Same O(n) time but O(n) stack, and Python's limit of
about 1000 frames means a 5000-node list raises \`RecursionError\` — so ship the loop.

## Q2. "Two-sum: return the indices of two numbers that add to the target."

**Say aloud.** "Brute force checks every pair, O(n²). Instead I'll keep a dict from value to index.
For each number I look up \`target - x\`; if it is there I have my pair, otherwise I store this one.
Looking up before storing stops a number pairing with itself. O(n) time, O(n) space."

**Follow-up:** "What if the list is sorted?" — Two pointers from both ends: if the sum is too small,
move the left one right; too big, move the right one left. O(n) time, O(1) space. **And huge
values?** — no overflow in Python, unlike Java.

## Q3. "Is this string of brackets valid?"

**Say aloud.** "Every closer must match the most recent unmatched opener — last in, first out — so a
stack. A Python list is the stack: \`append\` and \`pop\` at the end are O(1). For each closer I check
the stack is not empty, then pop and compare. At the end the stack must be empty. O(n) time, O(n)
space."

**Follow-up:** "Only one bracket type?" — a counter: +1 for \`(\`, -1 for \`)\`, fail if it goes
negative, and it must end at 0. O(1) space.

## Q4. "Find the k-th largest element."

**Say aloud.** "Sorting is the simple answer: \`sorted(nums)[-k]\`, O(n log n). With a heap I can do
O(n log k): \`heapq.nlargest(k, nums)[-1]\` keeps only k items in a min-heap. Quickselect is O(n) on
average but O(n²) in the worst case unless the pivot is random. Duplicates count separately:
the 2nd largest of \`[3, 9, 4, 9, 1]\` is 9."

**Follow-up:** "What if the numbers arrive as a stream?" — keep a min-heap of size k with
\`heapq.heappush\` and \`heapq.heappushpop\`; the smallest item in it, \`heap[0]\`, is always the
k-th largest so far.`,
    mcqs: [
      mcq('Reversing a linked list, the loop body is prev, cur, cur.next = cur, cur.next, prev. What happens on [1, 2, 3]?',
        [['It rewires the wrong node and ends in AttributeError', true], ['It reverses the list correctly, like any order', false], ['It returns the list unchanged, as [1, 2, 3]', false], ['It loops forever between the first two nodes', false]],
        'Targets are assigned left to right, so cur moves on before cur.next is set — the new cur is rewired. Eventually cur is None and None.next fails.'),
      mcq('Why is the recursive linked-list reversal a poor choice for a 5000-node list in Python?',
        [['It needs 5000 frames, past the limit of about 1000', true], ['It is O(n²) because each call copies the list', false], ['Python cannot assign head.next.next in one line', false], ['It returns the old head instead of the new head', false]],
        'One frame stays live per node until the end is reached. 5000 frames exceed the default limit and raise RecursionError; the loop uses O(1) space.'),
      mcq('What does heapq.nlargest(2, [3, 9, 4, 9, 1])[-1] return as the 2nd largest?',
        [['9', true], ['4', false], ['3', false], ['[9, 9]', false]],
        'nlargest(2, ...) returns [9, 9]; duplicates are separate elements, so the second largest is the second 9. Use set() first if distinct values are wanted.'),
      mcq('For two-sum on a sorted list, two pointers move from both ends. What is the space cost, compared with the dict solution?',
        [['O(1) extra, against O(n) for the dict', true], ['O(n) extra, the same as the dict needs', false], ['O(log n) extra, for the pointer stack', false], ['O(n²) extra, as each pair is recorded', false]],
        'Two indices are all the state the pointers need. The dict approach stores up to n values; it is only needed when the list is unsorted.'),
    ],
  },
  {
    unitCode: 'JT_PY_DSA_LINEAR_CHECKPOINT',
    notes: `Thirteen questions across the whole topic: complexity, two pointers and sliding windows, linked
lists, stacks and queues, hashing, recursion, and sorting and searching. Each one is a piece of
Python to trace or a decision to make. Work them by hand before choosing, and say the cost of every
built-in you see.`,
    checkpoint: [
      ck('DSA_COMPLEXITY', 'A loop over n items runs if x not in seen: seen.append(x), where seen is a list. What is the total cost, and what fixes it?',
        [['O(n²); make seen a set for O(n) overall', true], ['O(n); the list check is already O(1) average', false], ['O(n log n); sort seen once to make it O(n)', false], ['O(n²); a tuple instead of a list makes it O(n)', false]],
        'in on a list scans it, O(n) per check and O(n²) in total. A set answers in O(1) on average, so the loop becomes O(n).'),
      ck('DSA_COMPLEXITY', 'A queue holds n items. What do list.pop(0) and deque.popleft() each cost?',
        [['O(n) for the list, O(1) for the deque', true], ['O(1) for both, since both remove the front', false], ['O(log n) for the list, O(1) for the deque', false], ['O(1) for the list, O(n) for the deque', false]],
        'A list stores items contiguously, so removing the front shifts all the rest. A deque is a linked block structure with O(1) operations at both ends.'),
      ck('DSA_ARRAYS', 'A fixed window of size k = 3 slides over [2, 1, 5, 1, 3, 2], adding a[i] and subtracting a[i - k]. What is the largest window sum?',
        [['9', true], ['8', false], ['10', false], ['11', false]],
        'The window sums are 8, 7, 9 and 6. Updating the sum by one add and one subtract per step keeps the scan O(n).'),
      ck('DSA_ARRAYS', 'Two pointers start at both ends of the sorted [1, 3, 4, 6, 9] looking for a pair summing to 10. Which pair of indices is found first?',
        [['(0, 4)', true], ['(1, 3)', false], ['(2, 3)', false], ['(1, 4)', false]],
        'The first check is a[0] + a[4] = 1 + 9 = 10, a match at once. (1, 3) also sums to 10 but is never reached.'),
      ck('DSA_LINKED_LIST', 'slow and fast start at head; while fast and fast.next: slow moves 1, fast moves 2. On the list 1 -> 2 -> 3 -> 4, where does slow stop?',
        [['On 3, the second of the two middles', true], ['On 2, the first of the two middles', false], ['On 4, the last node in the list', false], ['On None, after walking off the end', false]],
        'After one round slow is on 2 and fast on 3; after the second, slow is on 3 and fast is None, so the loop ends. Even lengths give the second middle.'),
      ck('DSA_LINKED_LIST', 'Which one-line loop body correctly reverses a linked list, given prev, cur = None, head?',
        [['cur.next, prev, cur = prev, cur, cur.next', true], ['prev, cur, cur.next = cur, cur.next, prev', false], ['cur, prev, cur.next = cur.next, cur, prev', false], ['prev, cur.next, cur = cur, cur.next, prev', false]],
        'The right side is evaluated first, then assigned left to right. cur.next must be set while cur is still the old node, so it has to come first.'),
      ck('DSA_STACK', 'Next greater element with a stack of indices runs on [2, 7, 3, 5, 4, 6, 8]. What result list does it produce, with -1 for none?',
        [['[7, 8, 5, 6, 6, 8, -1]', true], ['[7, 8, 5, 6, 6, 8, 8]', false], ['[7, -1, 5, 6, 6, 8, -1]', false], ['[7, 8, 4, 6, 6, 8, -1]', false]],
        'Each index waits on the stack until a bigger value pops it: 7 for 2, 8 for 7, 5 for 3, 6 for 5 and for 4, 8 for 6, and nothing for 8.'),
      ck('DSA_STACK', 'Why does a stack-based bracket checker return False for "([)]", though every opener has a closer of its type?',
        [['")" arrives while "[" is on top, so they do not match', true], ['The stack is still not empty when the string ends', false], ['The string has an even length but mixes the types', false], ['A closer appears while the stack is completely empty', false]],
        'After "(" and "[", the top is "[". The next character, ")", must match the most recent opener, and it does not, so it fails there.'),
      ck('DSA_HASHING', 'd = defaultdict(int); for ch in "hello": d[ch] += 1. What does print(d["z"], len(d)) show?',
        [['0 5', true], ['0 4', false], ['KeyError: z', false], ['None 4', false]],
        'Reading a missing key from a defaultdict creates it with int() = 0. d["z"] runs before len(d), so the four letters h, e, l, o plus z make 5.'),
      ck('DSA_HASHING', 'What does Counter("aab") - Counter("ab") evaluate to?',
        [["Counter({'a': 1})", true], ["Counter({'a': 1, 'b': 0})", false], ["Counter({'a': 2, 'b': 1})", false], ['Counter()', false]],
        'Subtraction takes counts away and drops any that fall to zero or below: a goes 2 to 1, b goes 1 to 0 and is removed.'),
      ck('DSA_RECURSION', 'power(b, e) returns 1 if e == 0, else squares power(b, e // 2) and multiplies by b when e is odd. How many calls does power(2, 10) make in total?',
        [['5', true], ['10', false], ['11', false], ['4', false]],
        'The exponent goes 10, 5, 2, 1, 0 — halving each time — so there are 5 calls and the depth is O(log e), not O(e).'),
      ck('DSA_SORTING', 'rows = [("ravi", 82), ("anu", 91), ("kiran", 82), ("bala", 91)]. What is the first tuple of sorted(rows, key=lambda r: (-r[1], r[0]))?',
        [["('anu', 91)", true], ["('bala', 91)", false], ["('ravi', 82)", false], ["('kiran', 82)", false]],
        'Negating the marks sorts them high to low, and ties on 91 are broken by name A to Z, so anu comes before bala.'),
      ck('DSA_SORTING', 'What does bisect_left([1, 5, 9], 99) return?',
        [['3', true], ['2', false], ['-1', false], ['None', false]],
        'No element is at least 99, so the insertion point is the end of the list, len(a) = 3. Check i < len(a) before reading a[i].'),
    ],
  },
];
