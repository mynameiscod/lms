/**
 * T2_ALGORITHMS and T2_DSA_INTERVIEW — twenty units. Year 2, mandatory backbone.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Algorithms are where a curriculum most easily turns into competitive programming: a hundred
 * puzzles, a leaderboard, and a student who can solve a ranked problem and cannot say why their
 * own application is slow. The draft curriculum says plainly that Year 2 must not do that.
 *
 * So the measure of success here is different. A student finishing these topics should be able to
 * look at code they wrote and say what it costs; choose between two approaches before writing
 * either; and explain a solution out loud while writing it — which is what an interview is
 * actually testing. The classic algorithms are taught because they are the clearest examples of
 * those skills, not because anybody will ask them to implement a merge sort at work.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ALGORITHM_BUNDLES: PilotBundle[] = [
  /* ── T2_ALGORITHMS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_ALGORITHMS_ALGORITHMIC_THINKING',
    notes: `An algorithm is a procedure that **finishes**, and finishes with the **right answer**,
for every input it claims to handle. Both halves are the work.

**Start on paper.** Take "find the second largest number in a list". Before any code:

    largest = first item
    second  = nothing yet
    for each remaining item:
        if item > largest:      second = largest; largest = item
        elif item > second:     second = item
    answer: second

Now argue with it, on paper, before it costs you an hour:

- **Empty list?** There is no answer. Decide: raise, or return None.
- **One item?** No second largest. Same decision.
- **All equal — [5, 5, 5]?** Is the second largest 5, or does "second" mean strictly smaller? The
  question does not say, so you must.
- **Negative numbers?** Starting \`second\` at 0 would be wrong; starting at "nothing yet" is not.

Most wrong answers in an interview are one of those four, and every one is visible before a line is
written.

**Three questions that make a procedure an algorithm:**

1. **Does it always stop?** Every loop shrinks something that cannot shrink forever; every
   recursion moves towards a base case.
2. **Is the answer right for every input?** Including the empty one, the one-item one, the all-equal
   one, and the extremes.
3. **What does it cost?** Time and memory, as the input grows — the next units.

**Trace it by hand before running it.** Three rows of a table with the variables at each step finds
more bugs per minute than any debugger, because it forces you to be the machine.

| Item | largest | second |
|---|---|---|
| 3 | 3 | — |
| 7 | 7 | 3 |
| 5 | 7 | 5 |

**Correct first, fast second.** A correct slow answer can be improved. A fast wrong answer is
worth nothing, and is much harder to notice.`,
    mcqs: [
      mcq('Which pair of properties makes a procedure an algorithm?',
        [['It always terminates, and is correct for every claimed input', true],
          ['It is short, and uses no extra memory', false],
          ['It is recursive, and has a base case', false],
          ['It is faster than the obvious alternative', false]],
        'Cost matters, but only after those two hold.'),
      mcq('For "second largest", what does `[5, 5, 5]` force you to decide?',
        [['Whether "second" means strictly smaller', true],
          ['Whether the list should be sorted first', false],
          ['Whether duplicates should be removed', false],
          ['Whether the answer should be an integer', false]],
        'The problem statement does not say, so the implementer must — and state it.'),
      mcq('Initialising `second = 0` instead of "nothing yet" breaks on:',
        [['Lists of negative numbers', true],
          ['Lists that are already sorted', false],
          ['Lists containing zero', false],
          ['Very long lists', false]],
        'Zero is a real value, not an absence; use None and test for it.'),
      mcq('Tracing an algorithm by hand before running it is valuable because:',
        [['It forces you to be the machine, and finds assumptions', true],
          ['It is faster than using a debugger', false],
          ['It proves the algorithm terminates', false],
          ['It produces the test cases automatically', false]],
        'Three rows of a table expose the cases the code will meet.'),
    ],
    checkpoint: [
      mcq('Which is the right order of priorities when solving a problem?',
        [['Correct first, then fast', true],
          ['Fast first, then correct', false],
          ['Short first, then correct', false],
          ['Recursive first, then iterative', false]],
        'A correct slow answer improves; a fast wrong one hides.'),
      mcq('"Does it always stop" is answered by showing that:',
        [['Something shrinks towards a limit on every step', true],
          ['The loop has a fixed number of iterations', false],
          ['The input is finite in size', false],
          ['No exception can be raised inside it', false]],
        'A loop over a shrinking range or a recursion approaching a base case.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_LINEAR_SEARCH',
    notes: `Linear search looks at each item until it finds what it wants. It is the simplest
algorithm there is, and understanding its cost is the foundation of every comparison that follows.

    def find(items, target):
        for index, item in enumerate(items):
            if item == target:
                return index
        return -1

**The cost.** Best case: the first item, one comparison. Worst case: the last item or none at all,
n comparisons. Average over random positions: about n/2 — which still grows with n, and that is
what matters.

**Why "about n/2" is written O(n).** Constants are dropped because they do not change the shape:
doubling the list doubles the work whether it is n, n/2 or 3n. The shape is what predicts
behaviour at scale.

**When linear search is the right answer:**

- The data is unsorted and you will search it once. Sorting first costs more than scanning.
- The collection is small, and clarity is worth more than speed.
- You need *every* match, not the first.
- The data is a stream you can only pass over once.

**When it is the wrong answer:** you search the same collection repeatedly. Then build a
dictionary or a set once — O(n) — and every later lookup is O(1).

    # Wrong: searching a list repeatedly
    for order in orders:               # 100,000
        customer = find(customers, order.customer_id)   # scans 50,000 each time

    # Right: index once
    by_id = {c.id: c for c in customers}
    for order in orders:
        customer = by_id[order.customer_id]

That change is five billion comparisons down to a hundred thousand, and it is the single most
common real-world speed-up.

**In Python**, \`x in lst\` is a linear search and \`x in set\` is a hash lookup. They read almost
identically and differ by a factor of the list's length.`,
    mcqs: [
      mcq('Why is a search averaging n/2 comparisons described as O(n)?',
        [['Constants do not change how the cost grows with n', true],
          ['Because n/2 rounds up to n for large inputs', false],
          ['Because the average case is always ignored', false],
          ['Because half the list is scanned twice', false]],
        'Big-O describes shape; doubling the input doubles the work either way.'),
      mcq('Searching a list repeatedly inside a loop should be replaced by:',
        [['Building a dictionary once, then looking up', true],
          ['Sorting the list before each search', false],
          ['Caching the last result found', false],
          ['Searching from both ends at once', false]],
        'One O(n) build, then O(1) per lookup — the commonest real speed-up there is.'),
      mcq('Linear search remains the right choice when:',
        [['The data is unsorted and searched only once', true],
          ['The same list is searched many times', false],
          ['The data is already sorted', false],
          ['The collection is extremely large', false]],
        'Building an index costs more than a single scan.'),
      mcq('`x in lst` compared with `x in some_set`:',
        [['Scans the list, while the set computes a location', true],
          ['Behaves identically, since both use ==', false],
          ['Is faster for a list under any size', false],
          ['Is only different when the list is sorted', false]],
        'They read alike and differ by the length of the list.'),
    ],
    checkpoint: [
      mcq('The worst case for a linear search is:',
        [['The item is absent, or last', true],
          ['The item is in the middle', false],
          ['The list contains duplicates', false],
          ['The list is already sorted', false]],
        'Both require looking at every element.'),
      mcq('Looking up 100,000 orders against 50,000 customers, the indexed version turns:',
        [['Billions of comparisons into a few lookups', true],
          ['One pass over the data into two passes of it', false],
          ['A memory problem into a speed problem instead', false],
          ['A linear cost into a logarithmic one overall', false]],
        'Building the index is one pass; each lookup then costs effectively nothing.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_BINARY_SEARCH',
    notes: `If the data is **sorted**, you can throw away half of it with every comparison.

    def binary_search(items, target):
        low, high = 0, len(items) - 1
        while low <= high:
            mid = (low + high) // 2
            if items[mid] == target:
                return mid
            if items[mid] < target:
                low = mid + 1
            else:
                high = mid - 1
        return -1

**Why it is fast.** Each step halves what remains: 1,000,000 → 500,000 → 250,000 → … → 1, which is
about 20 steps. A linear search of the same data averages 500,000. That is the difference between
a logarithm and a line.

| Items | Linear (average) | Binary (worst) |
|---|---|---|
| 1,000 | 500 | 10 |
| 1,000,000 | 500,000 | 20 |
| 1,000,000,000 | 500,000,000 | 30 |

**The four mistakes**, all of which produce a wrong answer rather than a crash:

1. \`while low < high\` instead of \`<=\` — misses the last candidate.
2. \`low = mid\` instead of \`mid + 1\` — the range stops shrinking and it loops forever.
3. Computing \`mid\` as \`(low + high) / 2\` — a float index, a TypeError.
4. Running it on unsorted data — it returns "not found" for items that are there.

That last one is the dangerous one: nothing fails, the answer is simply wrong.

**The precondition is the whole deal.** Binary search buys speed with an ordering you must
maintain. Sorting once and searching many times is a good trade; sorting before every search is
strictly worse than scanning.

**In Python**, use \`bisect\` rather than writing it:

    import bisect
    i = bisect.bisect_left(items, target)
    found = i < len(items) and items[i] == target

\`bisect\` also answers "where would this go", which is what you want for ranges and for inserting
into a sorted list.

**The idea generalises.** Anything with a yes/no boundary can be halved: the first failing build,
the smallest capacity that works, the first date where a condition changes. Recognising a
"monotonic" problem and binary searching the answer is a genuinely advanced move worth knowing
exists.`,
    mcqs: [
      mcq('Binary search on a billion sorted items takes at most about:',
        [['30 comparisons', true], ['1,000 comparisons', false], ['30,000 comparisons', false], ['500 million comparisons', false]],
        'Each step halves the range, so the count is the logarithm base two.'),
      mcq('Running binary search on unsorted data:',
        [['Returns wrong answers without failing', true],
          ['Raises an exception immediately', false],
          ['Falls back to a linear scan', false],
          ['Sorts the data first automatically', false]],
        'The silent wrongness is what makes the precondition so important.'),
      mcq('Writing `low = mid` instead of `low = mid + 1` causes:',
        [['An infinite loop, because the range stops shrinking', true],
          ['The item before the target to be returned', false],
          ['A crash when mid reaches the end', false],
          ['The search to become linear', false]],
        'Every loop must shrink something; this one stops doing so.'),
      mcq('`bisect.bisect_left` is useful beyond searching because it answers:',
        [['Where a value would be inserted to keep order', true],
          ['How many times a value appears', false],
          ['Whether the list is sorted', false],
          ['Which half of the list is larger', false]],
        'That insertion point is what range queries and sorted inserts need.'),
    ],
    checkpoint: [
      mcq('The precondition for binary search is that the data is:',
        [['Sorted', true], ['Unique', false], ['Numeric', false], ['In memory', false]],
        'Order is exactly what lets half the data be discarded.'),
      mcq('Sorting a list before every single search is:',
        [['Worse than simply scanning it', true],
          ['Faster once the list exceeds a thousand items', false],
          ['Required for correctness of the search', false],
          ['Equivalent in cost to scanning', false]],
        'Sorting is O(n log n); one scan is O(n). Sort once, search many times.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_SIMPLE_SORTS',
    notes: `Bubble, selection and insertion sort are taught not because you will write them, but
because their cost is visible and comparable — and because insertion sort is genuinely the best
choice for small or nearly sorted data.

**Selection sort** — find the smallest, put it first, repeat:

    for i in range(len(a)):
        smallest = min(range(i, len(a)), key=lambda j: a[j])
        a[i], a[smallest] = a[smallest], a[i]

Always n²/2 comparisons, whatever the input. Its one virtue: the fewest swaps of the three.

**Bubble sort** — repeatedly swap neighbours that are out of order. Its only real virtue is that
it can stop early on sorted data if you track whether anything swapped.

**Insertion sort** — take each item and slide it back into the sorted part:

    for i in range(1, len(a)):
        current = a[i]
        j = i - 1
        while j >= 0 and a[j] > current:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = current

**On nearly sorted data this is O(n)** — each item moves back one place or none. That is why real
sorting libraries, Python's included, use insertion sort for small runs inside a bigger algorithm.

| | Best | Worst | Stable | Notes |
|---|---|---|---|---|
| Selection | O(n²) | O(n²) | No | Fewest swaps |
| Bubble | O(n) | O(n²) | Yes | Early exit if nothing swapped |
| Insertion | O(n) | O(n²) | Yes | Excellent on nearly sorted data |

**Stability** matters more than beginners expect. A stable sort keeps equal items in their original
order, so you can sort by one key and then another and keep both:

    rows.sort(key=lambda r: r["name"])       # then
    rows.sort(key=lambda r: r["department"]) # names stay ordered inside departments

Python's \`sort\` is stable, and that two-line trick is how multi-level sorting is usually done.

**In practice, call \`sorted()\`.** It is Timsort: insertion sort on small runs, merged — O(n log n)
worst case, O(n) on already sorted data, and stable. Writing your own is a learning exercise, not
a working decision.`,
    mcqs: [
      mcq('Insertion sort on nearly sorted data costs:',
        [['About O(n), because each item barely moves', true],
          ['O(n²), as on any other input', false],
          ['O(n log n), the same as merge sort', false],
          ['O(1), because nothing needs moving', false]],
        'Which is exactly why real libraries use it for small runs.'),
      mcq('A stable sort guarantees that:',
        [['Equal items keep their original relative order', true],
          ['The sort never uses extra memory', false],
          ['The cost is the same on every input', false],
          ['The result is the same on every run', false]],
        'It is what makes sorting by one key then another work.'),
      mcq('Selection sort always costs O(n²) because it:',
        [['Scans the remaining items for every position', true],
          ['Swaps every pair of neighbouring items', false],
          ['Copies the list on each iteration', false],
          ['Cannot detect an already sorted list', false]],
        'The scan happens whatever the data already looks like.'),
      mcq('Sorting rows by name then by department, with a stable sort, gives:',
        [['Departments in order, names ordered within each', true],
          ['Names in order, departments ordered within each', false],
          ['An unpredictable order for equal departments', false],
          ['The same result as sorting by department alone', false]],
        'The last sort is the primary key; earlier orders survive inside it.'),
    ],
    checkpoint: [
      mcq('Python\'s built-in `sorted()` is:',
        [['Stable, and O(n log n) in the worst case', true],
          ['Unstable, but faster than any stable sort', false],
          ['A plain quicksort with random pivots', false],
          ['O(n²) on already sorted input', false]],
        'Timsort: insertion sort on runs, merged, and stable.'),
      mcq('The main reason to study the simple sorts is:',
        [['Their costs are visible and comparable', true],
          ['They are faster than library sorts for real data', false],
          ['Interviewers require them to be implemented', false],
          ['They are the only stable algorithms', false]],
        'Plus insertion sort being genuinely good on small, nearly sorted runs.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_DIVIDE_AND_CONQUER',
    notes: `Divide and conquer: split the problem into smaller versions of itself, solve those, and
combine the answers. Merge sort is the clearest example.

    def merge_sort(a):
        if len(a) <= 1:
            return a
        mid = len(a) // 2
        left = merge_sort(a[:mid])
        right = merge_sort(a[mid:])
        return merge(left, right)

    def merge(left, right):
        out, i, j = [], 0, 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                out.append(left[i]); i += 1
            else:
                out.append(right[j]); j += 1
        return out + left[i:] + right[j:]

**Why it is O(n log n).** Splitting in half repeatedly gives about log n levels. Each level merges
every item exactly once, which is n work. n per level × log n levels.

| Items | n² (simple sorts) | n log n (merge sort) |
|---|---|---|
| 1,000 | 1,000,000 | ~10,000 |
| 100,000 | 10,000,000,000 | ~1,700,000 |

At a hundred thousand items that is the difference between minutes and milliseconds.

**\`<=\` in the merge is what makes it stable.** With \`<\`, equal items from the right half would be
taken first, and their original order would be lost. One character.

**The cost it pays:** memory. Merge sort builds new lists, so it uses O(n) extra space — which is
why quicksort, which sorts in place, is often preferred when memory matters, at the price of a bad
worst case.

**The pattern beyond sorting**, which is the reason this unit exists:

- **Binary search** — divide, and discard one half instead of solving it.
- **Counting inversions**, closest pair of points, large-number multiplication.
- **MapReduce** and every parallel data pipeline: split the data, process the parts independently,
  combine. That is divide and conquer across machines.

**How to recognise it:** the problem can be split into independent parts whose answers combine
cheaply. If combining is as expensive as solving, splitting has bought you nothing.`,
    mcqs: [
      mcq('Merge sort is O(n log n) because:',
        [['There are about log n levels, each doing n work', true],
          ['Each item is compared with log n others', false],
          ['The list is halved exactly n times', false],
          ['Merging is logarithmic in the input size', false]],
        'Levels times work per level is the whole derivation.'),
      mcq('Changing `left[i] <= right[j]` to `<` in the merge:',
        [['Makes the sort unstable', true],
          ['Makes the sort incorrect', false],
          ['Makes the sort slower by a constant', false],
          ['Has no effect on the result', false]],
        'Equal items from the right would be taken first, losing the original order.'),
      mcq('Merge sort\'s cost compared with quicksort is mainly:',
        [['Extra memory, because it builds new lists', true],
          ['More comparisons per element', false],
          ['A worse worst-case running time', false],
          ['Instability on equal elements', false]],
        'Quicksort sorts in place but has a bad worst case.'),
      mcq('Divide and conquer buys nothing when:',
        [['Combining the answers costs as much as solving', true],
          ['The problem is smaller than a thousand items', false],
          ['The parts are of unequal size', false],
          ['The data is already sorted', false]],
        'The split only pays if the combine is cheap.'),
    ],
    checkpoint: [
      mcq('MapReduce is divide and conquer because it:',
        [['Splits data, processes the parts, combines results', true],
          ['Sorts the whole dataset before processing it', false],
          ['Recursively calls itself once on each machine', false],
          ['Halves the dataset at every step of the way', false]],
        'The same shape, spread across machines instead of stack frames.'),
      mcq('At 100,000 items, n² versus n log n is roughly:',
        [['10 billion operations versus 1.7 million', true],
          ['Ten times more work', false],
          ['Twice as much work', false],
          ['The same, for practical purposes', false]],
        'Which is why the distinction is not academic.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_RECURSION',
    notes: `A recursive function solves a problem by calling itself on a smaller version of the same
problem. Two parts, always:

    def factorial(n):
        if n <= 1:          # base case: small enough to answer directly
            return 1
        return n * factorial(n - 1)   # recursive case: smaller, moving towards the base

**Miss the base case and it never stops.** Move away from it instead of towards it and it never
stops either. Python stops you at about a thousand frames:

    RecursionError: maximum recursion depth exceeded

**What is actually happening.** Each call gets its own frame on the call stack, with its own
variables, waiting for the call inside it to return. \`factorial(4)\` stacks four frames and then
unwinds them, multiplying on the way back out. Drawing that stack once is worth more than any
explanation.

**Where recursion is the right tool:**

- **Tree and nested structures** — each child is the same shape. This is the big one.
- **Divide and conquer** — merge sort, binary search.
- **Backtracking** — try, recurse, undo: mazes, sudoku, permutations.

**Where it is not:** a plain loop over a list. \`sum_list\` written recursively is slower, uses
stack memory, and risks overflow, in exchange for nothing.

**The trap worth seeing once — naive Fibonacci:**

    def fib(n):
        return n if n < 2 else fib(n - 1) + fib(n - 2)

\`fib(40)\` makes over two hundred million calls, because the same values are recomputed endlessly.
One line fixes it:

    from functools import lru_cache

    @lru_cache(maxsize=None)
    def fib(n):
        return n if n < 2 else fib(n - 1) + fib(n - 2)

That is memoisation, and it is the doorway to dynamic programming: the recursion was fine, the
repetition was not.

**Converting recursion to a loop** when depth is a problem: hold your own stack, push the work,
pop and process. Any recursion can be written this way, and that is the standard fix for a
RecursionError on deep data.`,
    mcqs: [
      mcq('Every recursive function needs:',
        [['A base case, and progress towards it', true],
          ['A loop inside the recursive case', false],
          ['A cache of previous results', false],
          ['An explicit stack of pending work', false]],
        'Without either, it never stops.'),
      mcq('Naive `fib(40)` is slow because it:',
        [['Recomputes the same values enormously often', true],
          ['Exceeds the maximum recursion depth', false],
          ['Allocates a new list on every call', false],
          ['Cannot use integers that large', false]],
        'Memoisation removes the repetition; the recursion itself was fine.'),
      mcq('`RecursionError: maximum recursion depth exceeded` means:',
        [['Too many frames stacked, often from a missing base case', true],
          ['The result grew larger than Python allows', false],
          ['The function called a different function too often', false],
          ['The input list was too long to process', false]],
        'Either a missing or unreachable base case, or genuinely deep data.'),
      mcq('Rewriting a recursion as a loop with your own stack helps because:',
        [['It uses heap memory rather than the call stack', true],
          ['It removes the need for a base case', false],
          ['It always runs in constant memory', false],
          ['It makes the algorithm asymptotically faster', false]],
        'Same work, different memory, and no depth limit to hit.'),
    ],
    checkpoint: [
      mcq('Recursion is the natural fit for:',
        [['Walking a nested structure', true],
          ['Summing a flat list of numbers', false],
          ['Reading lines from a text file', false],
          ['Counting items in a dictionary', false]],
        'Self-similar structures make self-similar functions natural.'),
      mcq('`@lru_cache` on a recursive function is an example of:',
        [['Memoisation, which removes repeated work', true],
          ['Tail-call optimisation', false],
          ['Converting recursion into iteration', false],
          ['Increasing the recursion limit', false]],
        'The doorway to dynamic programming.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_BIG_O',
    notes: `Big-O is a sentence about **how work grows when the input grows**. It is not a stopwatch,
and it is not a grade.

**Read the loops:**

    for x in items:              # O(n)
        print(x)

    for x in items:              # O(n²)
        for y in items:
            print(x, y)

    while n > 1:                 # O(log n)
        n = n // 2

Rules of thumb: one pass is n; a loop inside a loop is n²; halving each step is log n; a sort is
n log n.

**Constants and lower terms are dropped**, because they do not change the shape: 3n + 100 is O(n).
That does not mean constants never matter — a 3× speed-up is real — it means they do not change
what happens when the data gets ten times bigger.

| Cost | 1,000 items | 1,000,000 items | Feels like |
|---|---|---|---|
| O(1) | instant | instant | A dictionary lookup |
| O(log n) | 10 | 20 | Binary search |
| O(n) | 1,000 | 1,000,000 | One pass |
| O(n log n) | 10,000 | 20,000,000 | A sort |
| O(n²) | 1,000,000 | 10¹² | A loop in a loop — unusable |

**Space complexity is the same question about memory.** A solution that builds a dictionary of
every item is O(n) space; one that keeps two variables is O(1). Both matter, and the trade between
them is a real design decision: memoisation buys time with memory.

**What Big-O does not tell you:** which of two O(n) solutions is faster in practice, how it behaves
on your actual data, or whether n is ever large enough to care. An O(n²) algorithm on ten items is
perfectly fine.

**How to state it about your own code**, which is the skill being assessed: "One pass over the
orders, and a dictionary lookup inside — O(n) time, O(n) extra space for the index." If you cannot
say that sentence about code you wrote, you do not yet know what it costs.`,
    mcqs: [
      mcq('`3n + 100` is written O(n) because:',
        [['Constants do not change how the cost grows', true],
          ['The 100 becomes negligible for tiny inputs', false],
          ['Big-O rounds to the nearest power', false],
          ['Multiplication is ignored in Big-O', false]],
        'Shape at scale is what Big-O describes.'),
      mcq('A loop that halves n each step is:',
        [['O(log n)', true], ['O(n)', false], ['O(n log n)', false], ['O(1)', false]],
        'The number of halvings to reach one is the logarithm.'),
      mcq('Space complexity asks:',
        [['How extra memory grows with the input', true],
          ['How much memory the program uses in total', false],
          ['How many variables the function declares', false],
          ['Whether the algorithm sorts in place', false]],
        'Memoisation is the standard example of buying time with space.'),
      mcq('An O(n²) algorithm on a ten-item list is:',
        [['Perfectly fine', true],
          ['Always worth rewriting', false],
          ['Slower than an O(n) one at that size', false],
          ['Unacceptable in production code', false]],
        'Big-O is about growth; at small n the constants decide.'),
    ],
    checkpoint: [
      mcq('Which statement about your own code shows you understand its cost?',
        [['One pass, one lookup: O(n) time and O(n) space', true],
          ['It runs in about two seconds on my own laptop', false],
          ['It uses three loops and a sort at the end', false],
          ['It is much faster than the previous version', false]],
        'Time and space, as growth in the input.'),
      mcq('Big-O does NOT tell you:',
        [['Which of two O(n) solutions is faster', true],
          ['How the cost grows as the input grows', false],
          ['Whether a nested loop is quadratic', false],
          ['How memory use scales with the input', false]],
        'Constants and real data decide between same-shape solutions.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_DEBUGGING',
    notes: `An algorithm bug usually produces a **wrong answer**, not a crash. That changes how you
hunt it.

**1. Trace a tiny input by hand.** Three or four items, a table of the variables at each step, and
compare it with what the code prints. Almost every off-by-one dies here.

**2. Check the boundaries first.** Empty, one item, two items, all equal, already sorted, reverse
sorted, negative numbers. A surprising share of algorithm bugs live in exactly those seven inputs,
and testing them takes a minute.

**3. Print the state inside the loop, not just the result:**

    while low <= high:
        print(low, high, mid)     # the range at every step

A binary search that loops forever shows it immediately: the range stops shrinking.

**4. Compare against a slow, obviously correct version.** This is the strongest technique in the
unit:

    def slow_max_subarray(a):
        return max(sum(a[i:j]) for i in range(len(a)) for j in range(i + 1, len(a) + 1))

    for _ in range(1000):
        data = [random.randint(-10, 10) for _ in range(random.randint(1, 8))]
        assert fast(data) == slow_max_subarray(data), data

A thousand random small inputs will find a disagreement your handpicked tests missed, and print the
exact input that broke it.

**5. Recursion: print the depth and the argument.**

    def walk(node, depth=0):
        print("  " * depth, node.value)

If the argument is not getting smaller, that is the bug. If depth grows past what the data can
justify, there is a cycle.

**The specific ones to know:** \`while low < high\` missing the last candidate; \`range(len(a) - 1)\`
skipping the last item; mutating a list while iterating it; comparing floats with \`==\`; and
integer division where you wanted a float.`,
    mcqs: [
      mcq('Comparing a fast implementation against a slow, obviously correct one over random inputs is valuable because:',
        [['It finds disagreements handpicked tests miss, and prints the input', true],
          ['It proves the fast version is optimal', false],
          ['It is faster than writing unit tests', false],
          ['It removes the need to test edge cases', false]],
        'Random small inputs explore the space your assumptions did not.'),
      mcq('A binary search that never terminates is diagnosed fastest by:',
        [['Printing low, high and mid on every iteration', true],
          ['Checking that the list is sorted', false],
          ['Adding a maximum iteration count', false],
          ['Rewriting it recursively', false]],
        'You see immediately that the range stops shrinking.'),
      mcq('Which input set catches most algorithm edge cases?',
        [['Empty, one, two, all equal, sorted, reversed, negative', true],
          ['Small, medium and large random inputs', false],
          ['Only the largest realistic input', false],
          ['Inputs taken from production data', false]],
        'Boundaries are where off-by-one and initialisation bugs live.'),
      mcq('In a recursive function, an argument that is not getting smaller means:',
        [['The recursion will not reach its base case', true],
          ['The base case is wrong', false],
          ['The function should be iterative', false],
          ['The input contains duplicates', false]],
        'Progress towards the base case is what makes recursion terminate.'),
    ],
    checkpoint: [
      mcq('Algorithm bugs differ from crashes because they usually:',
        [['Produce a wrong answer silently', true],
          ['Raise an exception at the boundary', false],
          ['Only appear on large inputs', false],
          ['Depend on the Python version', false]],
        'Which is why comparison against a known-correct version matters so much.'),
      mcq('Tracing by hand is most useful:',
        [['On a tiny input, before running the code', true],
          ['On the largest input available', false],
          ['After the debugger shows the failure', false],
          ['Only for recursive functions', false]],
        'Being the machine for three steps exposes the assumption that is wrong.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_PRACTICE',
    notes: `No new ideas. Solve, state the cost, then improve it.

**For each: write the obvious solution, state its cost, then write a better one if there is one.**

1. **Two sum** — a pair adding to a target. Obvious: O(n²). Better: O(n).
2. **Maximum subarray sum** — obvious O(n²); better O(n) by carrying a running best.
3. **Merge intervals** — overlapping ranges combined. Sort first, then one pass.
4. **First duplicate** in a list, returning the earliest.
5. **Binary search variants** — first occurrence, last occurrence, insertion point.
6. **Rotate a list by k** — with and without extra memory.
7. **Count inversions** — obvious O(n²); better O(n log n) using merge sort.
8. **Kth largest** — sorting versus a heap, and when each wins.

**Record for each:**

| Problem | Obvious cost | Improved cost | What made it possible |
|---|---|---|---|

That last column is the point: usually a structure (a map, a heap), an ordering (sort first), or
noticing that repeated work can be carried along instead of recomputed.

**Then test each against a brute-force version on a thousand random small inputs.** It is the
fastest correctness check you have, and it catches the boundary you did not think of.

**The slip this set exposes:** improving the constant rather than the shape — making an O(n²)
solution twice as fast rather than seeing the O(n) version. If doubling the input still quadruples
the time, nothing was really fixed.`,
    mcqs: [
      mcq('Maximum subarray sum improves from O(n²) to O(n) by:',
        [['Carrying a running best instead of recomputing sums', true],
          ['Sorting the array before scanning', false],
          ['Using a dictionary of prefix sums', false],
          ['Dividing the array in half repeatedly', false]],
        'The repeated work is the recomputation of overlapping sums.'),
      mcq('Merging overlapping intervals begins with:',
        [['Sorting by start time', true],
          ['Building a set of all endpoints', false],
          ['A nested comparison of every pair', false],
          ['Counting how many intervals there are', false]],
        'Order turns an all-pairs problem into one pass.'),
      mcq('"Kth largest" favours a heap over sorting when:',
        [['k is small and the data is large', true],
          ['The data is already sorted', false],
          ['Every element is distinct', false],
          ['k is close to the length of the data', false]],
        'A heap of size k is O(n log k) rather than O(n log n).'),
      mcq('Making an O(n²) solution twice as fast is:',
        [['An improvement in the constant, not the shape', true],
          ['Equivalent to reaching O(n log n)', false],
          ['Usually enough for large inputs', false],
          ['A sign the algorithm is optimal', false]],
        'Doubling the input still quadruples the time.'),
      mcq('Testing against a brute-force version on random small inputs mainly finds:',
        [['Boundary cases you did not think of', true],
          ['Performance problems at scale', false],
          ['Memory leaks in the fast version', false],
          ['Differences between Python versions', false]],
        'It explores the space your handpicked tests did not.'),
    ],
    checkpoint: [
      mcq('The most useful column in the practice table is:',
        [['What made the improvement possible', true],
          ['The obvious cost', false],
          ['The improved cost', false],
          ['The time taken to solve it', false]],
        'A structure, an ordering, or carrying work along — that is the transferable part.'),
      mcq('An improvement has changed the shape of the cost when:',
        [['Doubling the input no longer quadruples it', true],
          ['The code is shorter than it was before', false],
          ['The result is produced about twice as fast', false],
          ['Memory use has gone down noticeably', false]],
        'Shape is about growth, not about a constant factor.'),
    ],
  },

  {
    unitCode: 'T2_ALGORITHMS_MINI_PROJECT',
    notes: `One problem, solved twice: the obvious way and the good way, with measurements that show
the difference and a written explanation of what changed.

**Why twice.** Being told that an O(n²) solution is worse than an O(n log n) one teaches nothing.
Watching your own naive version take ninety seconds on data your improved version handles in half
a second is a different kind of knowledge, and it is the one that survives.

**What is being assessed:** that you can state a cost before measuring, measure honestly, explain
what made the improvement possible, and know where each version is the right choice — because the
naive one usually is, below some size.

**Build it in this order:**

1. **Write the naive solution** and state its cost before running it.
2. **Generate data** at several sizes: 1,000, 10,000, 100,000, and larger if it survives.
3. **Measure it** at each size, and note where it becomes unusable.
4. **Write the improved version**, state its cost, and prove it gives the same answers.
5. **Measure again**, and find the size where the two cross over.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — The Same Problem, Twice',
      description: 'Solve one real problem naively and efficiently, measure both across input sizes, find where they cross over, and explain exactly what made the improvement possible.',
      instructions: `**The brief**

Choose ONE problem with a clear naive and improved solution:

- **Duplicate detection** — find every duplicate record in a large dataset (naive: compare all
  pairs; improved: a map or a sort).
- **Closest pair** — the two nearest numbers, or the two nearest points (naive: all pairs;
  improved: sort, or divide and conquer).
- **Top-k frequent** — the k most common items in a large stream (naive: count then sort
  everything; improved: a heap of size k).
- **Interval overlaps** — every pair of overlapping bookings (naive: all pairs; improved: sort and
  sweep).

**Requirements**

1. **Both solutions**, in the same file, with the same signature.
2. **A stated cost for each**, written before measuring.
3. **A correctness check**: both agree on a thousand random inputs, including empty and single-item.
4. **Measurements at four sizes**, at least up to 100,000, as a table.
5. **The crossover point**: the size at which the improved version starts to win, measured.
6. **A memory note**: what the improved version costs in extra space.

**What to submit**

1. Source file and tests.
2. The **measurement table**:

   | Size | Naive | Improved |
   |---|---|---|

3. The **crossover** you measured, with the numbers either side of it.
4. A **short write-up** (250–350 words): what the naive version repeated that the improved one
   does not; what the improvement cost in memory; the input size below which you would keep the
   naive version, and why.

**Constraints**

- Standard library only.
- Both versions must return identical results on every test.
- Timings must be real output, from your machine, with the sizes stated.

**Where the marks are.** The explanation of what made the improvement possible, and the honesty of
the crossover measurement. "The map removes the repeated scan" is worth more than any amount of
speed claimed without numbers.`,
      rubric: [
        {
          criterion: 'Both solutions and stated costs',
          description: 'Naive and improved versions, each with a cost stated before measurement and justified from the code.',
          maxPoints: 25,
        },
        {
          criterion: 'Correctness',
          description: 'Both agree over a thousand random inputs including edge cases; tests included and passing.',
          maxPoints: 20,
        },
        {
          criterion: 'Measurement',
          description: 'Four sizes measured, presented as a table, with the crossover point identified from real numbers.',
          maxPoints: 30,
        },
        {
          criterion: 'Explanation',
          description: 'Names the repeated work removed and the structure or ordering that removed it; memory cost stated.',
          maxPoints: 15,
        },
        {
          criterion: 'Judgement',
          description: 'Says where the naive version is still the right choice, with a size and a reason.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_DSA_INTERVIEW ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DSA_INTERVIEW_READING_A_PROBLEM',
    notes: `Most failed coding rounds are lost in the first three minutes, by starting to type. The
first move is to understand the problem well enough to restate it.

**Restate it in your own words.** "So: given a list of integers that may repeat, and a target, I
return the indices of two numbers adding to the target — or nothing if there is no such pair." The
interviewer will correct you if you are wrong, which is enormously cheaper now than in ten minutes.

**Ask about the constraints**, because they decide the approach:

| Ask | Why it matters |
|---|---|
| How large can the input be? | 10⁹ rules out O(n²); 100 makes it fine |
| Sorted, or unsorted? | Sorted may mean binary search or two pointers |
| Can values repeat? | Changes what "the answer" means |
| Negative numbers, zero, empty? | Breaks naive initialisation |
| One answer or all of them? | A different algorithm entirely |
| Can I use extra memory? | Decides between a map and a two-pointer scan |

**Write two or three examples by hand**, including one that is awkward:

    [2, 7, 11, 15], target 9   -> [0, 1]
    [3, 3], target 6           -> [0, 1]     (repeats allowed?)
    [1, 2], target 7           -> []          (no answer)

Those examples are also your first tests, which is why writing them is not a detour.

**Say what you are assuming**, out loud: "I will assume exactly one answer exists, and that I may
use extra memory." Now an unstated assumption is a shared decision, and if it is wrong you find out
immediately.

**The trap:** an interviewer says "given a sorted array" and you build a hash map anyway. The word
*sorted* was the hint that a two-pointer solution using no extra memory exists. Reading the problem
properly means noticing which words were placed deliberately.`,
    mcqs: [
      mcq('The first thing to do when given a coding problem is:',
        [['Restate it in your own words and confirm it', true],
          ['Write the brute-force solution immediately', false],
          ['Ask which data structure is expected', false],
          ['Start with the edge cases', false]],
        'A misunderstanding caught in the first minute costs nothing.'),
      mcq('Why does the maximum input size matter before choosing an approach?',
        [['It decides which costs are acceptable', true],
          ['It determines the programming language', false],
          ['It tells you how much memory exists', false],
          ['It decides whether recursion is allowed', false]],
        'n ≤ 100 makes O(n²) fine; n = 10⁹ rules it out.'),
      mcq('"Given a sorted array" in a problem statement usually hints at:',
        [['Binary search or a two-pointer approach', true],
          ['A hash map for constant lookup', false],
          ['A recursive divide and conquer', false],
          ['That the order is irrelevant', false]],
        'The word was placed deliberately; ignoring it discards the hint.'),
      mcq('Stating your assumptions aloud turns them into:',
        [['Shared decisions the interviewer can correct', true],
          ['Constraints you can no longer change', false],
          ['Requirements for the final solution', false],
          ['Notes for the write-up afterwards', false]],
        'An unstated wrong assumption surfaces far too late.'),
    ],
    checkpoint: [
      mcq('Examples written by hand before coding are also:',
        [['Your first test cases', true],
          ['A substitute for asking about constraints', false],
          ['Proof that the approach is optimal', false],
          ['Only useful for recursive problems', false]],
        'Which is why writing them is not a detour from solving.'),
      mcq('Which question changes the algorithm most?',
        [['One answer, or all answers?', true],
          ['Should I use Python or Java?', false],
          ['Should variables be short or descriptive?', false],
          ['Should I write comments as I go?', false]],
        'Finding all answers is often a different algorithm, not a loop change.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_BRUTE_FORCE_FIRST',
    notes: `Say the obvious solution out loud, with its cost, before writing anything clever. It is
the single highest-value habit in a coding round.

**Why it wins:**

1. **It proves you understood the problem.** A correct slow answer demonstrates that; silence does
   not.
2. **It gives you something to improve.** Optimisation is a conversation about removing repeated
   work — and you need the repeated work in front of you.
3. **It is a safety net.** A working slow solution scores; an unfinished clever one does not.
4. **It often reveals the improvement.** Saying "for each item I scan the rest" makes "what if I
   remembered what I had seen" the obvious next sentence.

**The script**, almost word for word:

> "The brute force is: for every pair, check whether they sum to the target. That is O(n²) time and
> O(1) space. It works, but for n up to a hundred thousand it is too slow. Can I improve it?"

You have now shown that you can solve it, that you know what it costs, and that you know it is not
good enough. Most interviewers will say "yes, go ahead" and you have lost twenty seconds.

**Write it if you are asked to.** A working brute force on the board is a real result. Many rounds
end with "we ran out of time but they had a correct solution and a clear plan to improve it", and
that passes.

**The one mistake:** jumping to a half-remembered clever solution, getting stuck in its details, and
producing nothing. Interviewers see this constantly. Slow and finished beats fast and broken every
time.

**Then optimise deliberately**, which is the next unit: find the repeated work, and remove it with a
structure or an ordering.`,
    mcqs: [
      mcq('Stating the brute force first mainly demonstrates:',
        [['That you understood the problem and know its cost', true],
          ['That you cannot see the optimal solution', false],
          ['That you prefer simple code', false],
          ['That the problem is easy', false]],
        'Understanding and cost awareness are exactly what is being assessed.'),
      mcq('An unfinished clever solution compared with a working slow one:',
        [['Scores worse, because nothing works', true],
          ['Scores better, because the approach was right', false],
          ['Scores the same in most interviews', false],
          ['Cannot be assessed at all', false]],
        'Interviewers regularly report a correct slow answer as a pass.'),
      mcq('Saying "for each item I scan the rest" is useful because:',
        [['It names the repeated work to remove', true],
          ['It fills time while you think', false],
          ['It shows familiarity with Big-O', false],
          ['It commits you to that approach', false]],
        'The improvement usually follows directly from naming the repetition.'),
      mcq('The brute force should be stated with:',
        [['Its time and space cost', true],
          ['An apology for its inefficiency', false],
          ['The name of the better algorithm', false],
          ['A guess at the expected answer', false]],
        'Cost is what shows you know why it is not good enough.'),
    ],
    checkpoint: [
      mcq('The most common way candidates lose a coding round is:',
        [['Jumping to a clever solution and finishing nothing', true],
          ['Writing the brute force and then running out of time', false],
          ['Asking too many clarifying questions at the start', false],
          ['Using a programming language nobody expected', false]],
        'Slow and finished beats fast and broken.'),
      mcq('After stating the brute force, the natural next question is:',
        [['Which repeated work can be removed?', true],
          ['Which language feature is fastest?', false],
          ['How would this scale across machines?', false],
          ['Should this be written recursively?', false]],
        'Optimisation is removing repetition, not rewriting style.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_OPTIMISING',
    notes: `Optimising is not rewriting until it looks clever. It is finding **work that is repeated**
and removing it, almost always with one of four moves.

**1. Remember what you have seen** — a set or a map, trading memory for time.

    # O(n²): for each, scan the rest
    # O(n):  for each, ask whether (target - x) has been seen
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i

**2. Sort first** — O(n log n) once, then a single pass. Ordering removes the need to compare every
pair: merging intervals, finding duplicates, the closest pair.

**3. Two pointers or a sliding window** — on sorted or sequential data, move two indices instead of
nesting loops. Longest substring without repeats, pair sums in a sorted array, maximum sum of k
consecutive items.

**4. Precompute** — prefix sums, counts, or a memo of results. "Sum between i and j" becomes one
subtraction after one pass.

**The question to ask of any nested loop:** *what does the inner loop recompute that the outer loop
already knew?* That sentence is the whole unit.

**Say the trade out loud.** "This is O(n) time but O(n) space — is that acceptable?" Sometimes it
is not: an embedded system or a huge dataset may prefer the slower version that allocates nothing.
An interviewer asking "can you do it without extra memory" is telling you the two-pointer solution
exists.

**Know when to stop.** Once you reach the cost that matches the constraints, stop. Shaving a
constant off an O(n) solution while the whiteboard is blank on edge cases is the wrong trade, and
interviewers notice.

**The common ceiling:** you cannot beat O(n) for a problem that must read every item, and you
cannot beat O(n log n) for comparison sorting. Saying so is a strong answer, not a failure.`,
    mcqs: [
      mcq('The core question to ask of a nested loop is:',
        [['What does the inner loop recompute that is already known?', true],
          ['Can the loops be merged into one?', false],
          ['Can the inner loop be written recursively?', false],
          ['Is the data large enough to matter?', false]],
        'Optimisation is the removal of repeated work.'),
      mcq('Two sum improves to O(n) by:',
        [['Remembering values seen and asking for the complement', true],
          ['Sorting the array and scanning it once', false],
          ['Dividing the array in half repeatedly', false],
          ['Precomputing every pair sum', false]],
        'The map trades O(n) memory for the removed scan.'),
      mcq('"Can you do it without extra memory?" is a hint towards:',
        [['A two-pointer approach on sorted data', true],
          ['A recursive divide and conquer', false],
          ['A hash map with smaller keys', false],
          ['Sorting the data in place first', false]],
        'Interviewers use that phrasing to point at the pointer solution.'),
      mcq('You cannot beat O(n) for a problem that:',
        [['Must read every item at least once', true],
          ['Uses recursion in its solution', false],
          ['Requires sorted output', false],
          ['Has more than one correct answer', false]],
        'Saying that explicitly is a strong answer, not an admission of failure.'),
    ],
    checkpoint: [
      mcq('Which four moves cover most interview optimisations?',
        [['Remember, sort, two pointers, precompute', true],
          ['Recursion, iteration, memoisation, caching', false],
          ['Divide, conquer, merge, combine', false],
          ['Inline, unroll, parallelise, vectorise', false]],
        'Nearly every improvement in a coding round is one of those four.'),
      mcq('Continuing to optimise after reaching the required cost is:',
        [['The wrong trade if edge cases are untested', true],
          ['Always worth whatever time remains', false],
          ['Expected in a senior-level interview', false],
          ['Necessary to demonstrate real depth', false]],
        'Correctness on the edges is worth more than a constant factor.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_ARRAY_PATTERNS',
    notes: `Three patterns cover most array and string questions asked at this level. Recognising
which one applies is the skill; the code is short once you know.

**Two pointers — sorted data, or comparing from both ends.**

    def pair_sum(sorted_nums, target):
        low, high = 0, len(sorted_nums) - 1
        while low < high:
            total = sorted_nums[low] + sorted_nums[high]
            if total == target:
                return (low, high)
            if total < target:
                low += 1          # need a bigger sum
            else:
                high -= 1         # need a smaller sum
        return None

O(n), no extra memory. Also: reversing in place, palindrome checks, removing duplicates from a
sorted array, merging two sorted lists.

**Sliding window — "consecutive", "substring", "subarray of length k".**

    def max_sum_of_k(nums, k):
        window = sum(nums[:k])
        best = window
        for i in range(k, len(nums)):
            window += nums[i] - nums[i - k]   # add the new, drop the old
            best = max(best, window)
        return best

The trick is never recomputing the window from scratch. Variable-size windows grow while a
condition holds and shrink when it breaks — that is "longest substring without repeating
characters".

**Prefix sums — many range queries over unchanging data.**

    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    # sum of nums[i:j] is now prefix[j] - prefix[i], in O(1)

One pass to build, then every range answered instantly.

**How to recognise which:**

| Words in the problem | Pattern |
|---|---|
| "sorted", "pair", "from both ends" | Two pointers |
| "consecutive", "window", "substring of length k" | Sliding window |
| "sum between i and j", asked repeatedly | Prefix sums |
| "count how many", "seen before" | A map or set |

**The mistake:** using a sliding window on unsorted data where order does not matter, or two
pointers on data that was never sorted. Both patterns depend on their precondition, exactly as
binary search does.`,
    mcqs: [
      mcq('The two-pointer pair-sum approach requires the data to be:',
        [['Sorted', true], ['Unique', false], ['Positive', false], ['Of even length', false]],
        'Moving a pointer only makes sense if it reliably increases or decreases the sum.'),
      mcq('A sliding window avoids recomputation by:',
        [['Adding the new item and subtracting the one leaving', true],
          ['Sorting each window before summing it', false],
          ['Caching every window sum in a map', false],
          ['Recomputing only every k steps', false]],
        'That single line is what turns O(n × k) into O(n).'),
      mcq('Prefix sums are the right tool when:',
        [['Many range sums are asked over unchanging data', true],
          ['The data changes between queries', false],
          ['Only one range sum is needed', false],
          ['The values are all positive', false]],
        'Build once, answer each range in constant time.'),
      mcq('"Longest substring without repeating characters" is:',
        [['A variable-size sliding window', true],
          ['A two-pointer scan of sorted data', false],
          ['A prefix-sum problem', false],
          ['A divide-and-conquer problem', false]],
        'The window grows while the condition holds and shrinks when it breaks.'),
    ],
    checkpoint: [
      mcq('"Subarray of length k" in a problem points to:',
        [['A sliding window', true], ['Binary search', false], ['A heap', false], ['Prefix sums alone', false]],
        'Fixed-size windows are the clearest case of the pattern.'),
      mcq('Applying two pointers to unsorted data is:',
        [['A precondition failure, like binary search on unsorted data', true],
          ['Fine, but slower than on sorted data', false],
          ['Correct if both pointers start at zero', false],
          ['Only a problem when duplicates exist', false]],
        'Moving a pointer must reliably move the result in one direction.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_MAP_PATTERNS',
    notes: `A hash map turns "have I seen this" and "how many of these" into constant-time
questions. Four patterns cover most of what interviews ask.

**1. Seen-before, for pairs.**

    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i

Store what you have passed, and ask about the complement.

**2. Counting.**

    from collections import Counter
    counts = Counter(text)
    first_unique = next((c for c in text if counts[c] == 1), None)

Two passes: count, then walk in order. Far better than the nested loop that recounts per character.

**3. Grouping by a computed key** — the anagram pattern:

    from collections import defaultdict
    groups = defaultdict(list)
    for word in words:
        groups["".join(sorted(word))].append(word)

The art is choosing the key: sorted letters for anagrams, a character count for larger alphabets, a
normalised form for "same thing written differently".

**4. Index by id, then join.** Two lists matched on a field: build a map of one, walk the other.
This is the pattern that most often appears in real work rather than in puzzles.

**The trade, always worth stating:** all four buy time with memory — O(n) extra space. When the
interviewer asks for constant space, they are asking for sorting or two pointers instead.

**The two traps:**

- **Mutable keys.** A list cannot be a key; a tuple can. \`tuple(sorted(word))\` works where
  \`sorted(word)\` does not.
- **Checking then inserting in the wrong order.** In two-sum, ask about the complement *before*
  storing the current value, or an item pairs with itself.`,
    mcqs: [
      mcq('In two-sum with a map, the complement must be checked:',
        [['Before storing the current value', true],
          ['After storing the current value', false],
          ['Only once the loop has finished', false],
          ['Both before and after, for safety', false]],
        'Otherwise an item can pair with itself.'),
      mcq('The key for grouping anagrams is:',
        [['The sorted letters of each word', true],
          ['The word\'s length and first letter', false],
          ['A hash of the whole word', false],
          ['The word reversed', false]],
        'Anagrams share a letter multiset, which sorted letters represent.'),
      mcq('`sorted(word)` cannot be used directly as a dictionary key because it:',
        [['Returns a list, which is mutable', true],
          ['Returns characters in the wrong order', false],
          ['Is slower than hashing the word', false],
          ['Loses the letters of the word', false]],
        'Wrap it in a tuple or join it into a string.'),
      mcq('All four map patterns share the trade of:',
        [['Extra memory in exchange for time', true],
          ['Sorted output in exchange for speed', false],
          ['Simplicity in exchange for correctness', false],
          ['Constant time in exchange for accuracy', false]],
        'Which is why a constant-space requirement points elsewhere.'),
    ],
    checkpoint: [
      mcq('"First non-repeating character" is solved with:',
        [['Counts, then one pass in the original order', true],
          ['A set of seen characters only', false],
          ['Sorting the string first', false],
          ['A sliding window over the string', false]],
        'Counts give repetition; the second pass restores order.'),
      mcq('An interviewer asking for constant extra space is steering you towards:',
        [['Sorting or two pointers', true],
          ['A smaller hash map', false],
          ['Recursion instead of iteration', false],
          ['Counting with an array instead of a map', false]],
        'Those are the approaches that allocate nothing proportional to n.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_STACK_QUEUE_PATTERNS',
    notes: `Stacks and queues turn up in interviews in three recognisable shapes.

**1. Matching and nesting — a stack.** Brackets, tags, nested expressions. Push what opens, pop
what closes, and check both failure cases (a close with nothing open, something left open).

**2. Nearest greater or smaller — a monotonic stack.** The pattern that looks like magic until you
see it once:

    def next_greater(nums):
        result = [-1] * len(nums)
        stack = []                       # holds indices, values decreasing
        for i, x in enumerate(nums):
            while stack and nums[stack[-1]] < x:
                result[stack.pop()] = x  # x is the next greater for that index
            stack.append(i)
        return result

Each index is pushed once and popped once, so it is O(n) — replacing the obvious O(n²) scan. "Daily
temperatures", "next warmer day", "largest rectangle in a histogram" are all this.

**3. Level by level — a queue.** Breadth-first traversal of a tree or graph: shortest path in an
unweighted graph, printing a tree by level, spreading from several starts at once.

    from collections import deque
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        node, depth = queue.popleft()
        ...

**How to tell which:**

| The problem says | Use |
|---|---|
| "matching", "balanced", "nested", "undo" | Stack |
| "next greater", "previous smaller", "span" | Monotonic stack |
| "shortest", "fewest steps", "level by level" | Queue (BFS) |
| "all paths", "does a path exist" | Stack or recursion (DFS) |

**The insight worth carrying:** a monotonic stack works because each item is pushed and popped at
most once. When you can say that about a loop that looks nested, it is linear — and saying it aloud
in an interview is exactly the kind of reasoning being looked for.`,
    mcqs: [
      mcq('A monotonic stack solves "next greater element" in O(n) because:',
        [['Each index is pushed and popped at most once', true],
          ['The stack keeps the values sorted', false],
          ['The input is scanned from both ends', false],
          ['It discards half the data each step', false]],
        'The inner while loop looks nested but is bounded in total.'),
      mcq('"Fewest steps to reach the goal" in an unweighted graph points to:',
        [['Breadth-first search with a queue', true],
          ['Depth-first search with a stack', false],
          ['A monotonic stack', false],
          ['Sorting the nodes by distance', false]],
        'The queue is what makes the first arrival the shortest.'),
      mcq('The bracket-matching problem needs two failure checks:',
        [['A close with nothing open, and something left open', true],
          ['An empty string, and a string with no brackets', false],
          ['Nested brackets, and repeated brackets', false],
          ['Too many opens, and too many closes of one type', false]],
        'Forgetting the second is the classic incomplete answer.'),
      mcq('"Largest rectangle in a histogram" belongs to which family?',
        [['Monotonic stack', true], ['Sliding window', false], ['Prefix sums', false], ['Binary search', false]],
        'It is the same next-smaller-element reasoning applied twice.'),
    ],
    checkpoint: [
      mcq('A loop containing a while that pops a stack is linear overall when:',
        [['Each item can be pushed and popped only once', true],
          ['The stack never exceeds a fixed size', false],
          ['The input is sorted before processing', false],
          ['The while loop runs fewer than n times per step', false]],
        'Total work is bounded by the number of pushes, not by the nesting.'),
      mcq('"Undo the last action" is:',
        [['A stack', true], ['A queue', false], ['A heap', false], ['A map', false]],
        'Most recent first is exactly last in, first out.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_RECURSION_PATTERNS',
    notes: `Recursive interview questions come in three shapes, and all three are asked at
second-year level in their simplest form.

**1. Tree traversal — visit every node.**

    def depth(node):
        if node is None:
            return 0
        return 1 + max(depth(node.left), depth(node.right))

Most tree questions are this with a different combine step: height, sum, count leaves, find a
value, check balance. Write the base case first, always.

**2. Backtracking — try, recurse, undo.**

    def permutations(items):
        if len(items) <= 1:
            return [items]
        out = []
        for i, x in enumerate(items):
            rest = items[:i] + items[i + 1:]
            for p in permutations(rest):
                out.append([x] + p)
        return out

Subsets, permutations, N-queens, sudoku, maze paths — all the same skeleton: choose, explore,
un-choose.

**3. Divide and conquer** — split, solve both halves, combine. Merge sort, binary search, and
"maximum in a tree".

**The three questions to answer before writing a recursive solution:**

1. **What is the base case?** The smallest input you can answer without recursing.
2. **What is the smaller problem?** And how do you know it is smaller?
3. **How do the answers combine?** Sum, max, concatenate, count.

Say those three out loud and the code usually writes itself.

**Watch the cost.** Recursion that branches twice with no memoisation is exponential: naive
Fibonacci, naive subsets of a large set. If you see a recursive call made twice on overlapping
inputs, say "this recomputes — I would memoise", which is the answer being looked for.

**Depth matters too.** Python stops at about a thousand frames, so a recursive walk over a
million-node linked structure fails. Saying "I would convert this to an explicit stack for deep
input" shows you know the limit exists.`,
    mcqs: [
      mcq('Most tree interview questions are the same traversal with a different:',
        [['Combine step', true], ['Base case', false], ['Traversal order', false], ['Data structure', false]],
        'Height, sum, count and search differ mainly in what they do with the children\'s answers.'),
      mcq('The backtracking skeleton is:',
        [['Choose, explore, un-choose', true],
          ['Sort, split, merge', false],
          ['Count, group, combine', false],
          ['Push, pop, repeat', false]],
        'Subsets, permutations, N-queens and maze paths all share it.'),
      mcq('A recursion branching twice on overlapping inputs is:',
        [['Exponential, and a candidate for memoisation', true],
          ['Linear, since each call is cheap', false],
          ['Logarithmic, because it splits the input', false],
          ['Quadratic, because of the two branches', false]],
        'Naive Fibonacci is the standard example.'),
      mcq('Which three questions should be answered before writing a recursive solution?',
        [['Base case, smaller problem, how answers combine', true],
          ['Input size, output type, error handling', false],
          ['Time cost, space cost, stack depth', false],
          ['Which language, which library, which structure', false]],
        'Answering them aloud usually produces the code.'),
    ],
    checkpoint: [
      mcq('Python\'s recursion limit means a recursive walk fails on:',
        [['Structures thousands of levels deep', true],
          ['Structures with millions of nodes but shallow depth', false],
          ['Any structure containing cycles', false],
          ['Trees that are not balanced', false]],
        'Depth is the limit, not total size.'),
      mcq('Writing the base case first is advised because:',
        [['It is the case that stops the recursion', true],
          ['It is usually the hardest part', false],
          ['It determines the return type', false],
          ['It makes the function shorter', false]],
        'Everything else depends on it being reachable and correct.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_EXPLAINING',
    notes: `An interviewer is assessing how you think, and the only access they have is what you
say. Silence, however productive, reads as being stuck.

**Narrate at four points:**

1. **Before coding** — the approach, and its cost. "I will use a hash map of values seen; O(n) time,
   O(n) space."
2. **While coding** — what each block does, briefly. "This loop builds the map; this one checks the
   complement."
3. **When stuck** — say what you are considering. "I am deciding whether to sort first. Sorting
   costs n log n but removes the extra memory. I will keep the map, since memory is not constrained
   here."
4. **After coding** — trace one example out loud, including an edge case.

**Being stuck is not a failure; being silently stuck is.** "I know this is O(n²) and I think a map
removes the inner loop, but I am not sure what to key it on" is a sentence that gets you a hint,
and hints are part of the format.

**Think out loud before you commit.** Changing your mind aloud ("actually, a set is enough — I do
not need the index") reads as strength. Writing something silently and deleting it reads as
confusion.

**Correct yourself explicitly.** "That is wrong — an empty list would break this. Let me handle it
first." Noticing your own bug is one of the strongest signals available.

**Explain the cost in plain language**, not only in symbols: "This is linear: one pass over the
input. The map roughly doubles the memory, which for a hundred thousand records is a few megabytes
and fine."

**What not to do:** narrating syntax ("now I type a for loop"), apologising repeatedly, or going
quiet for two minutes and producing a finished solution — because nobody saw the thinking, which
was the thing being marked.`,
    mcqs: [
      mcq('The strongest thing to do when stuck in an interview is:',
        [['Say what you are considering and where you are stuck', true],
          ['Work silently until the idea arrives', false],
          ['Start writing the brute force without comment', false],
          ['Ask for a different question', false]],
        'A precise question about your own blockage gets a hint, which is part of the format.'),
      mcq('Changing your approach aloud mid-solution reads as:',
        [['Strength, because the reasoning is visible', true],
          ['Indecision, and should be avoided', false],
          ['Neutral, since only the code is marked', false],
          ['A sign you misunderstood the problem', false]],
        'The thinking is what is being assessed.'),
      mcq('Which narration is least useful to an interviewer?',
        [['Describing the syntax as you type it', true],
          ['Stating the approach and its cost', false],
          ['Explaining why you rejected an alternative', false],
          ['Tracing an edge case out loud', false]],
        'They can see the syntax; they cannot see your reasoning.'),
      mcq('Noticing and stating your own bug is:',
        [['One of the strongest signals you can give', true],
          ['Best kept quiet and fixed silently', false],
          ['Only worth mentioning if it is serious', false],
          ['A sign of poor initial planning', false]],
        'Self-correction is exactly what good engineers do all day.'),
    ],
    checkpoint: [
      mcq('Producing a correct solution in silence is a problem because:',
        [['The thinking being assessed was never visible', true],
          ['It takes longer than narrating', false],
          ['Interviewers require continuous speech', false],
          ['The code will contain more bugs', false]],
        'The interview measures how you think, through what you say.'),
      mcq('Cost should be explained:',
        [['In plain language as well as in symbols', true],
          ['Only in Big-O notation', false],
          ['Only if the interviewer asks', false],
          ['After the code is fully written', false]],
        '"A few megabytes for a hundred thousand records" shows real understanding.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_TIMED_PRACTICE',
    notes: `Practice under a clock, because the clock is the part that is new on the day.

**The format to rehearse, every time:**

| Minutes | What you are doing |
|---|---|
| 0–3 | Restate, ask constraints, write two examples |
| 3–5 | State the brute force and its cost; propose the improvement |
| 5–20 | Code it, narrating |
| 20–25 | Trace an example, fix the edge cases |
| 25–30 | State the final cost; mention what you would test |

Thirty minutes is the usual round. Practising to that shape matters more than solving more
problems, because it is the shape that fails under pressure.

**Rules that make practice realistic:**

- **Say it out loud**, even alone. Thinking silently and thinking aloud are different skills, and
  only one is being tested.
- **No searching mid-problem.** If you are stuck for ten minutes, stop and look it up — then redo
  it from scratch the next day.
- **Type into a plain editor**, without autocomplete or a linter. Many rounds are a shared document
  with no help at all.
- **Test by hand.** No running it. Trace your own code and find your own bug.

**A weekly pattern that works:** two problems a day, one new and one repeated from a few days ago.
Repetition is what moves a pattern from "I have seen this" to "I can produce this".

**Keep a log of what beat you:**

| Problem | What I missed | Pattern |
|---|---|---|

After twenty problems the log is more useful than the problems — it shows your specific gaps, and
they are usually three or four repeating ones rather than thirty different ones.

**What "good" looks like at second year:** arrays, strings, maps, stacks, queues and simple trees,
solved correctly and explained, in around twenty-five minutes, with edge cases handled. Not
dynamic programming, not graphs in depth. Depth in the basics beats a thin layer over everything.`,
    mcqs: [
      mcq('In a thirty-minute round, the first three minutes should be spent:',
        [['Restating, asking constraints, and writing examples', true],
          ['Writing the brute force immediately', false],
          ['Choosing which data structure to use', false],
          ['Setting up the function signature and tests', false]],
        'Understanding first; everything after depends on it.'),
      mcq('Practising aloud matters because:',
        [['Thinking silently and thinking aloud are different skills', true],
          ['It helps you remember the solution longer', false],
          ['It slows you down usefully', false],
          ['Interviewers time your speech', false]],
        'Only the spoken one is assessed on the day.'),
      mcq('The log of what beat you is valuable because it shows:',
        [['Three or four repeating gaps rather than thirty separate ones', true],
          ['Which problems are most commonly asked', false],
          ['How your speed improves over time', false],
          ['Which companies ask which questions', false]],
        'Repeating gaps are fixable; a list of problems is not a plan.'),
      mcq('At second-year level, "good" is best described as:',
        [['Arrays, strings, maps, stacks, queues and simple trees, done well', true],
          ['A broad familiarity with dynamic programming and graphs', false],
          ['Solving any problem in under ten minutes', false],
          ['Memorising fifty problem solutions', false]],
        'Depth in the basics beats a thin layer over everything.'),
      mcq('Searching for the answer mid-problem during practice:',
        [['Removes the skill the practice was building', true],
          ['Is efficient use of practice time', false],
          ['Is fine if you rewrite it afterwards', false],
          ['Matches what interviews allow', false]],
        'Stop, look it up, then redo it from scratch another day.'),
    ],
    checkpoint: [
      mcq('Practising the shape of a round matters more than volume because:',
        [['The shape is what fails under pressure', true],
          ['More problems take too long to attempt', false],
          ['Interviewers ask the same problems repeatedly', false],
          ['The shape determines the difficulty level', false]],
        'The clock and the narration are the new parts on the day.'),
      mcq('Testing your code by hand during practice trains you to:',
        [['Find your own bugs without running anything', true],
          ['Write fewer bugs in the first place', false],
          ['Type more accurately under pressure', false],
          ['Skip the edge cases safely', false]],
        'Many rounds are a shared document with nothing to run.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_MOCK_ROUND',
    notes: `One full round, start to finish, exactly as it happens: an unfamiliar problem, thirty
minutes, narrated, tested by hand, and reviewed afterwards.

**What this measures**, and it is not whether you get the optimal solution:

- Did you understand the problem before coding?
- Did you state an approach and its cost?
- Did you produce something correct?
- Did you handle the edge cases?
- Could somebody follow your reasoning throughout?

A correct O(n²) solution, clearly explained, with edge cases handled, passes most second-year
rounds. An unfinished O(n) attempt usually does not.

**How to run it:** have someone give you a problem you have not seen, or take one at random and
start a timer. Record yourself. The recording is the point — listening back is uncomfortable and
teaches more than the problem did.

**Afterwards, answer these honestly:**

| Question | Your answer |
|---|---|
| Did I restate the problem and ask about constraints? | |
| How long before I wrote code? | |
| Did I state a cost before coding? | |
| Was my first solution correct? | |
| Which edge cases did I miss? | |
| Where did I go silent, and for how long? | |
| What would I do differently in the first five minutes? | |

**The most common findings**, in order: started coding too early, never stated a cost, went quiet
when stuck, and never tested the empty input. All four are habits, and habits are fixable in a
week.

**Do this three times before a real interview.** The first is uncomfortable, the second is
awkward, and by the third the shape is automatic — which is the entire purpose.`,
    mcqs: [
      mcq('A correct but slow solution, well explained, in a second-year round usually:',
        [['Passes', true],
          ['Fails, because the optimal answer was expected', false],
          ['Is marked as incomplete', false],
          ['Depends entirely on the company', false]],
        'Understanding and communication are what is being assessed at this level.'),
      mcq('Recording your mock round is recommended because:',
        [['Listening back shows habits you cannot see live', true],
          ['It provides evidence for your portfolio', false],
          ['It makes the practice feel more formal', false],
          ['It allows the problem to be reused', false]],
        'Silences and skipped steps are obvious on playback and invisible in the moment.'),
      mcq('Which is the most common finding in a first mock round?',
        [['Started coding too early', true],
          ['Chose the wrong data structure', false],
          ['Ran out of time while optimising', false],
          ['Used the wrong language feature', false]],
        'Followed by never stating a cost and going quiet when stuck.'),
      mcq('Three mock rounds before a real interview are advised because:',
        [['By the third, the shape of the round is automatic', true],
          ['Three problems cover most interview topics', false],
          ['Interviewers expect three rounds of practice', false],
          ['It takes three attempts to solve one properly', false]],
        'The purpose is the habit, not the problems.'),
    ],
    checkpoint: [
      mcq('The mock round is primarily measuring:',
        [['Whether your reasoning was visible and your answer correct', true],
          ['Whether you reached the optimal complexity', false],
          ['How fast you typed the solution', false],
          ['How many problems you have practised', false]],
        'Optimal is a bonus; understood, correct and explained is the bar.'),
      mcq('The most valuable part of the review afterwards is:',
        [['Naming what you would change in the first five minutes', true],
          ['Recording the final complexity achieved', false],
          ['Counting how many hints were needed', false],
          ['Comparing your time against a target', false]],
        'The opening is where most rounds are won or lost.'),
    ],
  },
];
