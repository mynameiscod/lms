/**
 * T_ARRAYS — the complete topic, twelve units.
 *
 * ── WHY THIS TOPIC NEXT ───────────────────────────────────────────────────────────────────
 *
 * Every audited profile was failing GUIDED_INSTRUCTION with zero units available against a
 * floor of nine. This topic is nine GUIDED concepts plus a debug, a practice and a project —
 * it closes that floor on its own while also supplying APPLICATION, PRACTICE and INTEGRATION.
 *
 * It is also DSA, which the authoring priority puts immediately after programming, and arrays
 * are the prerequisite for essentially everything later: strings are arrays, the two-pointer
 * pattern recurs for the rest of a career, and Big-O first becomes concrete here.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * DSA content is where curricula most often drift into competitive-programming trivia. Every
 * unit below is written against the question "when would I reach for this", because a student
 * who can implement binary search and cannot say when sorting first is worth it has learned a
 * procedure rather than an idea. Big-O in particular is presented as a way of comparing two
 * approaches you are actually choosing between, not as notation to be examined on.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ARRAYS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_ARRAYS_WHAT_IS_AN_ARRAY',
    notes: `An array is a block of memory holding elements of the same size, laid out one after
another with no gaps. Everything interesting about arrays follows from that one sentence.

**Why indexing is instant.** Because the elements are contiguous and equally sized, the machine
does not search for element 5. It calculates where it is:

    address = start + (index * size_of_one_element)

That is one multiplication and one addition, and it costs the same whether the index is 0 or
5,000,000. This is why array access is described as O(1) — constant time, independent of the
size of the array.

**Why indexing starts at zero.** It is not an arbitrary convention. The index is the *offset*
from the start, so the first element is zero elements along. \`arr[0]\` is \`start + 0\`.

**What contiguity costs.** The array must be one unbroken block, so:

- You must know the size up front (in C, at least; Python's list hides this by reallocating)
- Growing may require finding a new block and copying everything
- Inserting in the middle means shifting everything after it

Those costs are the subject of the next few units, and they are all consequences of the same
layout that makes access instant. **Every data structure is a trade**, and arrays trade cheap
access for expensive rearrangement.

**A note on Python.** A Python list is not strictly an array of values — it is an array of
references. The indexing arithmetic still applies, so access is still O(1), but the elements
themselves are elsewhere in memory. That is why a Python list can hold mixed types and why it is
slower than a C array for numeric work.`,
    mcqs: [
      mcq('Why is `arr[5000]` as fast as `arr[0]`?',
        [['The position is calculated from the start address, not searched for', true],
          ['The array is sorted, so the position can be predicted', false],
          ['Modern CPUs are fast enough that it does not matter', false],
          ['It is not — larger indices are slower', false]],
        'One multiplication and one addition, regardless of index. This is the entire reason arrays are the default structure.'),
      mcq('Indexing begins at zero because:',
        [['The index is an offset, and the first element is zero along', true],
          ['It saves one byte per index in the compiled code', false],
          ['C did it that way and every later language copied it', false],
          ['It makes counting loops easier to write correctly', false]],
        'It falls out of the address arithmetic rather than being a convention somebody picked.'),
      mcq('What does contiguous storage COST?',
        [['Growing and inserting in the middle become expensive', true],
          ['Access becomes slower for large arrays', false],
          ['The elements must be kept sorted as they are inserted', false],
          ['Nothing; contiguous storage is free of any drawback', false]],
        'Every structure trades something. Arrays buy instant access with expensive rearrangement, and the rest of the topic is that bill arriving.'),
      mcq('A Python list holds references rather than values directly. One consequence is:',
        [['It can hold mixed types, and is slower than a C array for numbers', true],
          ['Indexing is no longer constant time on a Python list', false],
          ['It cannot be sorted unless every element is the same type', false],
          ['It has a fixed size once the references are allocated', false]],
        'The indexing arithmetic still applies to the reference array, so access stays constant; the extra hop is what costs the performance.'),
    ],
    checkpoint: [
      {
        ...mcq('An array of 8-byte elements starts at address 1000. Where is index 3?',
          [['1024', true], ['1003', false], ['1030', false], ['1008', false]],
          'start + index * size = 1000 + 3 * 8. Doing this once makes O(1) access concrete rather than a claim.'),
        skillKey: 'DSA_ARRAYS',
      },
      {
        ...mcq('Which property makes the address calculation possible?',
          [['Elements are the same size and stored with no gaps', true],
            ['The elements are kept in sorted order as they are inserted', false],
            ['The array is small enough to fit in a single block of memory', false],
            ['The elements are numbers, which the machine can address directly', false]],
          'Equal size and contiguity. Lose either and the machine would have to search rather than calculate.'),
        skillKey: 'DSA_ARRAYS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_TRAVERSAL',
    notes: `Traversal is visiting every element once. It is the most common thing anybody does with
an array, and there are three shapes worth knowing.

**Forwards** — the default:

    for i in range(len(arr)):
        print(arr[i])

    for value in arr:          # when you do not need the index
        print(value)

Prefer the second when the index is not used. It cannot go out of bounds and it says what you
mean.

**Backwards** — when order of processing matters:

    for i in range(len(arr) - 1, -1, -1):
        ...

The three arguments are start, stop-before, step. \`len(arr) - 1\` is the last valid index;
\`-1\` as the stop means "go down to and including 0". Both of those are off-by-one traps and it
is worth writing this one out a few times.

**Backwards has a real use beyond symmetry:** when you are removing elements while traversing.
Removing forwards shifts everything after the removal point, so the next element slides into the
index you just handled and is skipped. Going backwards, the shift only affects indices you have
already passed.

**In steps:**

    for i in range(0, len(arr), 2):    # every second element

**Cost.** Every traversal is O(n) — proportional to length. Two traversals one after the other
are still O(n) in the sense that matters; a traversal *inside* another traversal is O(n²), and
that is the distinction worth internalising. Nesting is where cost explodes, not sequencing.

**The bound is \`len(arr) - 1\`, not \`len(arr)\`.** An array of 5 has valid indices 0 to 4.
\`arr[5]\` is IndexError, and it is the single most common array fault there is.`,
    workedExample: `**Goal: remove every negative number from a list, in place, and see why direction matters.**

The natural attempt, forwards:

    nums = [1, -2, -3, 4]
    for i in range(len(nums)):
        if nums[i] < 0:
            nums.pop(i)

Two problems arrive immediately. Trace it:

- i=0: \`nums[0]\` is 1, keep. List is \`[1, -2, -3, 4]\`
- i=1: \`nums[1]\` is -2, remove. List becomes \`[1, -3, 4]\` — **-3 has slid into index 1**
- i=2: \`nums[2]\` is 4, keep. **-3 was never examined**
- i=3: IndexError — the list is now length 3

Two distinct faults from one mistake: an element skipped, and a crash from a bound captured
before the list shrank.

Now backwards:

    for i in range(len(nums) - 1, -1, -1):
        if nums[i] < 0:
            nums.pop(i)

- i=3: 4, keep
- i=2: -3, remove. The shift affects indices 3 and beyond, which are already done
- i=1: -2, remove
- i=0: 1, keep

Result \`[1, 4]\`, and nothing was skipped. **Removing while traversing is the case where backwards
is not a stylistic choice.**

**The usual alternative, and why it is often better:** build a new list instead of mutating.

    nums = [n for n in nums if n >= 0]

No index arithmetic, no direction to get wrong. Reach for in-place removal only when the array
is large enough that a copy genuinely matters.`,
    mcqs: [
      mcq('An array has 5 elements. Which index raises IndexError?',
        [['5', true], ['4', false], ['0', false], ['-1', false]],
        'Valid indices are 0 to 4. In Python, -1 is also valid and means the last element, which surprises people arriving from C.'),
      mcq('Why does removing elements while traversing forwards skip some?',
        [['Removal shifts later elements back into the index just handled', true],
          ['The loop variable is not updated when the list changes', false],
          ['`pop` is slow, so the loop runs ahead of the removals', false],
          ['It does not skip any; the loop re-reads the list each pass', false]],
        'The traversal and the mutation are fighting over the same indices, which is why direction stops being a style choice here.'),
      mcq('`range(len(arr) - 1, -1, -1)` visits:',
        [['Every index from the last down to 0 inclusive', true],
          ['Every index from the last one down to 1, but not 0', false],
          ['Every second index, working backwards from the end', false],
          ['Nothing at all, because that range is always empty', false]],
        'The stop value is exclusive, so -1 as the stop is how 0 gets included. This is the off-by-one worth writing out until it is automatic.'),
      mcq('Which costs O(n squared)?',
        [['A traversal nested inside another traversal', true],
          ['Two traversals one after the other', false],
          ['A single traversal with a step of 2', false],
          ['A backwards traversal', false]],
        'Nesting multiplies; sequencing adds. That distinction is most of what Big-O is for in practice.'),
    ],
    checkpoint: [
      {
        ...mcq('You need to filter a list and the array is small. What is usually the better approach?',
          [['Build a new list, avoiding index arithmetic entirely', true],
            ['Remove them in place, working forwards through the list', false],
            ['Remove them in place, working backwards from the end', false],
            ['Sort it first, so the removals are all next to each other', false]],
          'In-place removal exists for when a copy genuinely costs too much. Until then it is a correctness risk taken for no benefit.'),
        skillKey: 'DSA_ARRAYS',
      },
      {
        ...mcq('When is backwards traversal genuinely required rather than preferred?',
          [['When removing elements during the traversal', true],
            ['When the array is sorted descending', false],
            ['When searching from the end', false],
            ['When the array is large', false]],
          'Every other case is a preference. This one is a correctness requirement, because the shift must only affect indices already visited.'),
        skillKey: 'DSA_ARRAYS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_SEARCHING',
    notes: `Linear search is looking at each element until you find what you want. It is the
simplest algorithm there is, and understanding exactly what it costs is what makes the next unit
worth the effort.

    def find(arr, target):
        for i in range(len(arr)):
            if arr[i] == target:
                return i
        return -1

**Return the index, not True.** The caller almost always wants to know *where*, and -1 for
"absent" is the long-standing convention — but see the caution below.

**What it costs:**

- **Best case** — the first element. One comparison.
- **Worst case** — the last element, or absent. n comparisons.
- **Average** — about n/2 for a present element.

We describe this as **O(n)**: the work grows in proportion to the size. Doubling the array
doubles the expected work.

**The important consequence.** Linear search makes no assumptions. The data can be in any order,
any type, anywhere. That generality is exactly what costs you: with no structure to exploit, you
cannot rule anything out without looking at it, so you must potentially look at everything.

**Sorted data changes the situation completely**, because now one comparison tells you about
many elements at once — if the middle element is too big, everything after it is too big. That is
binary search, and it is the next unit.

**When linear search is the right answer**, which is more often than people expect:

- The array is small. For twenty elements the difference is unmeasurable.
- The data is unsorted and used once. Sorting to search once costs more than the search.
- You need every match, not the first.

**A caution on -1.** In Python, -1 is a valid index meaning "last element", so a caller who
forgets to check will silently read the wrong element rather than crash. Returning \`None\` is
safer in Python; -1 is a C idiom that arrived with the textbooks.`,
    mcqs: [
      mcq('Linear search on 1000 elements, target absent. How many comparisons?',
        [['1000 — every element must be checked to prove absence', true],
          ['500, which is the average for a successful search', false], ['10, if the elements are checked in a sensible order', false], ['1, because absence is detected on the first miss', false]],
        'Proving something is NOT there requires eliminating everything, which is why absence is always the worst case for an unsorted search.'),
      mcq('Why can linear search not do better on unsorted data?',
        [['With no ordering to exploit, nothing can be ruled out unseen', true],
          ['The usual implementation is simply written inefficiently', false],
          ['Comparisons are slow relative to the rest of the loop', false],
          ['It can be improved, by writing a tighter inner loop', false]],
        'The generality is the cost. This is worth understanding before binary search, because it is exactly the assumption binary search adds.'),
      mcq('When is linear search the right choice on unsorted data?',
        [['When you will search once — sorting first costs more than the search', true],
          ['Never; sorting first is always worth the extra cost', false],
          ['Only when the elements happen to be plain numbers', false],
          ['Only when the array is already in sorted order', false]],
        'Sorting is O(n log n). Paying it to make one O(n) search into O(log n) is a clear loss; paying it for a thousand searches is a clear win.'),
      mcq('Why is returning -1 for "not found" risky in Python specifically?',
        [['-1 is a valid index for the last element, so a missed check reads it', true],
          ['A negative number cannot be returned from a search function', false],
          ['It is slower than raising an exception for a miss', false],
          ['Python has no -1 index, so the value is meaningless', false]],
        'A C idiom that arrived with the textbooks. None fails loudly in Python, which is what you want.'),
    ],
    checkpoint: [
      mcq('You will search the same unsorted array 10,000 times. What should you do?',
        [['Sort it once and use binary search; the sort pays for itself', true],
          ['Use linear search each time, since sorting costs more overall', false],
          ['Sort before each search, so the array is always in order', false],
          ['Nothing can be improved; searching is linear by definition', false]],
        'One O(n log n) cost against ten thousand searches dropping from O(n) to O(log n). The number of searches is what decides it.'),
      mcq('Linear search finds the target at position 1 of 1,000,000. What does that tell you about the algorithm?',
        [['Nothing — one lucky input says nothing about the cost', true],
          ['That the algorithm is constant time on this input', false],
          ['It is faster than binary search', false],
          ['That the array must have been in sorted order', false]],
        'Best case is a fact about the input, not about the algorithm. Cost analysis is about what you can rely on.'),
    ],
  },
  {
    unitCode: 'T_ARRAYS_BINARY_SEARCH',
    notes: `Binary search finds an element in a **sorted** array by halving the search space at
every step. It is the first algorithm where the improvement is dramatic rather than incremental
— and the first one almost everybody implements wrongly once.

**The idea.** Look at the middle. If it is the target, done. If the target is smaller, it can
only be in the left half; if larger, only in the right. Discard the other half and repeat.

    def binary_search(arr, target):
        low, high = 0, len(arr) - 1
        while low <= high:
            mid = (low + high) // 2
            if arr[mid] == target:
                return mid
            if arr[mid] < target:
                low = mid + 1
            else:
                high = mid - 1
        return None

**Why it is fast.** Each step discards half. For a million elements: 1M, 500k, 250k … about
**20 steps**. That is O(log n), and the practical difference is enormous — linear search would
average 500,000 comparisons for the same array.

**The four places it goes wrong**, and everybody meets at least one:

1. **\`while low < high\` instead of \`<=\`.** When the range narrows to a single element,
   \`low == high\`, and with \`<\` that element is never examined. The bug appears only for targets
   at particular positions, which makes it maddening to find.
2. **\`low = mid\` instead of \`mid + 1\`.** If \`arr[mid]\` is not the target, \`mid\` has been ruled
   out, so leaving it in the range means the range sometimes stops shrinking — an infinite loop.
3. **The array is not actually sorted.** Binary search on unsorted data returns wrong answers
   confidently and never errors. It is a precondition, not a suggestion.
4. **Integer overflow in \`(low + high)\`** — irrelevant in Python, which has arbitrary-precision
   integers, and a real historical bug in Java and C. The safe form is
   \`low + (high - low) // 2\`.

**The invariant that makes it correct.** If the target is in the array at all, it is always
within \`low..high\`. Every branch preserves that: discarding a half only discards elements that
have been proved too small or too large. When \`low > high\`, the range is empty and the target
was not there.

**How to be sure of yours.** Test: first element, last element, absent-smaller-than-everything,
absent-larger-than-everything, an array of one, and an empty array. Those six catch all four
bugs.`,
    workedExample: `**Goal: trace binary search, then break it deliberately.**

\`arr = [2, 5, 8, 12, 16, 23, 38, 56]\` (8 elements, indices 0-7), target 23.

| step | low | high | mid | arr[mid] | action |
|---|---|---|---|---|---|
| 1 | 0 | 7 | 3 | 12 | 12 < 23, so low = 4 |
| 2 | 4 | 7 | 5 | 23 | found, return 5 |

Two comparisons for eight elements. Linear search would have taken six.

Now target 4, which is absent:

| step | low | high | mid | arr[mid] | action |
|---|---|---|---|---|---|
| 1 | 0 | 7 | 3 | 12 | 12 > 4, high = 2 |
| 2 | 0 | 2 | 1 | 5 | 5 > 4, high = 0 |
| 3 | 0 | 0 | 0 | 2 | 2 < 4, low = 1 |
| 4 | 1 | 0 | — | — | low > high, return None |

Step 3 is the one that matters. With \`while low < high\` the loop would have exited before it,
and index 0 would never have been examined. Here that is harmless — 2 is not the target — but
search for 2 with \`<\` and it returns None for an element that is present.

**Now the infinite loop.** Change \`low = mid + 1\` to \`low = mid\` and search for 56:

| step | low | high | mid | arr[mid] | action |
|---|---|---|---|---|---|
| 1 | 0 | 7 | 3 | 12 | low = 3 |
| 2 | 3 | 7 | 5 | 23 | low = 5 |
| 3 | 5 | 7 | 6 | 38 | low = 6 |
| 4 | 6 | 7 | 6 | 38 | low = 6 … forever |

At step 4, \`(6 + 7) // 2\` is 6 again. The range stops shrinking and nothing changes. \`mid + 1\`
is what guarantees progress, and this trace is why.`,
    mcqs: [
      mcq('Binary search on a million sorted elements takes approximately how many steps?',
        [['20', true], ['1000', false], ['500,000', false], ['1,000,000', false]],
        'Halving a million takes about 20 steps because 2 to the 20 is roughly a million. That is the whole value of O(log n).'),
      mcq('`while low < high` instead of `<=` causes what?',
        [['A single-element range is never examined, so a present target is missed', true],
          ['An infinite loop, because the range stops shrinking', false],
          ['An IndexError', false],
          ['Nothing at all; the two conditions are equivalent', false]],
        'It fails only for targets at particular positions, which is what makes it so hard to notice in casual testing.'),
      mcq('`low = mid` instead of `low = mid + 1` causes what?',
        [['The range can stop shrinking, giving an infinite loop', true],
          ['A wrong answer returned without any error at all', false],
          ['An IndexError', false],
          ['A slower search that still returns the correct answer', false]],
        'mid has already been ruled out. Excluding it is what guarantees the range gets strictly smaller every pass.'),
      mcq('Binary search on unsorted data does what?',
        [['Returns wrong answers confidently, with no error', true],
          ['Raises an exception, since the data is not ordered', false],
          ['Degrades quietly into an ordinary linear search', false],
          ['Sorts the array first, then searches it properly', false]],
        'Sortedness is a precondition the algorithm cannot check cheaply, so violating it is silent — the worst kind of failure.'),
    ],
    coding: [
      {
        title: 'Binary search that survives all six edge cases',
        description: `Implement binary search. Read a line of sorted integers, then a target on the next line. Print the index if found, or \`-1\` if not.

The tests include: the first element, the last element, a target smaller than everything, a target larger than everything, a single-element array and an empty array. Those six catch every classic binary-search bug — get them all before you believe it.`,
        starter: `line = input().strip()
arr = [int(x) for x in line.split()] if line else []
target = int(input())

# your binary search here
`,
        language: 'python',
        tests: [
          { input: '2 5 8 12 16 23 38 56\n23', expectedOutput: '5' },
          { input: '2 5 8 12 16 23 38 56\n2', expectedOutput: '0' },
          { input: '2 5 8 12 16 23 38 56\n56', expectedOutput: '7' },
          { input: '2 5 8 12 16 23 38 56\n1', expectedOutput: '-1' },
          { input: '2 5 8 12 16 23 38 56\n99', expectedOutput: '-1' },
          { input: '7\n7', expectedOutput: '0', isHidden: true },
          { input: '\n5', expectedOutput: '-1', isHidden: true },
          { input: '1 3\n3', expectedOutput: '1', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('Which six inputs should you test on any binary search?',
        [['First, last, below-range, above-range, single element, empty', true],
          ['Only an element from the middle of the sorted array', false],
          ['A handful of randomly chosen values from the array', false],
          ['The largest array you can build', false]],
        'Each targets a specific classic bug. Random middle values pass under every one of the four common mistakes.'),
      mcq('`low + (high - low) // 2` is preferred over `(low + high) // 2` because:',
        [['It avoids integer overflow in languages with fixed-width integers', true],
          ['It is faster, because subtraction costs less than addition', false],
          ['It gives a different midpoint, which converges more quickly', false],
          ['Python requires it, since `//` cannot be applied to a sum', false]],
        'Irrelevant in Python and a real historical bug in Java and C. Worth writing anyway, since the habit transfers.'),
    ],
  },
  {
    unitCode: 'T_ARRAYS_INSERT_DELETE',
    notes: `Access is instant; rearrangement is not. This unit is the other side of the contiguity
trade.

**Inserting at the end — cheap, usually.**

    arr.append(x)      # O(1) amortised

There is space after the last element, so it is one write. "Amortised" covers the occasional
case where the underlying block is full: a new larger block is allocated and everything copied,
which is O(n). Because the size typically doubles, that cost is spread thinly across many
appends and the average stays constant.

**Inserting at the front — expensive.**

    arr.insert(0, x)   # O(n)

Every existing element must move one place right to make room. For a million elements that is a
million moves for one insertion.

**Inserting in the middle at index i** — everything from i onwards shifts: O(n - i), which is
O(n) in general.

**Deleting is the same in reverse.** Removing from the end is O(1); removing from the front or
middle shifts everything after it back to close the gap, O(n).

**The pattern worth remembering:** the end is cheap, everywhere else is proportional to how much
sits after the insertion point. Contiguity is what gives instant access and it is the same
property that makes the middle expensive — there is no gap to use, so space has to be made.

**The trap in a loop.**

    for x in items:
        result.insert(0, x)     # O(n) each time → O(n²) overall

This looks linear and is quadratic. For 10,000 items it is 50 million operations. Either append
and reverse at the end, or use a structure designed for front insertion (\`collections.deque\` in
Python, which is O(1) at both ends).

**Choosing a structure.** If your access pattern is "append and read by index", an array is
ideal. If it is "insert at the front constantly", it is the wrong structure, and recognising
that before writing the loop is the point of learning the costs.`,
    mcqs: [
      mcq('Why is inserting at the front of an array O(n)?',
        [['Every existing element must shift one position right to make room', true],
          ['The whole array has to be re-sorted after the insert', false],
          ['A completely new array is allocated for every insert', false],
          ['It is not linear at all; inserting at the front is O(1)', false]],
        'Contiguity means there is no gap to use. Space has to be made, and making it means moving everything.'),
      mcq('`append` is described as O(1) AMORTISED. What does the qualifier cover?',
        [['The occasional copy when the block is full, spread over many appends', true],
          ['That it is only constant time while the array stays small', false],
          ['That the figure is approximate rather than exact', false],
          ['That the cost depends on what type of element is stored', false]],
        'Doubling the capacity means the expensive case happens rarely enough that the average per append stays constant.'),
      mcq('`for x in items: result.insert(0, x)` over 10,000 items is:',
        [['O(n squared) — about 50 million operations', true],
          ['O(n), one insertion for each of the items', false],
          ['O(n log n), the cost of keeping the order', false],
          ['O(1), since each insert is a constant-time call', false]],
        'An O(n) operation inside an O(n) loop. It looks linear on the page, which is exactly why this one catches people.'),
      mcq('You need constant-time insertion at BOTH ends. What should you use?',
        [['A deque, which is designed for it', true],
          ['An array, inserting backwards', false],
          ['A sorted array', false],
          ['Two arrays', false]],
        'Recognising that the structure is wrong for the access pattern is the practical payoff of knowing the costs.'),
    ],
    checkpoint: [
      {
        ...mcq('Deleting the element at index 0 of a 1,000,000-element array costs:',
          [['About 999,999 shifts — O(n)', true], ['One operation', false], ['About 20 operations', false], ['It depends on the value', false]],
          'The gap has to be closed, and closing it means moving everything after it.'),
        skillKey: 'DSA_ARRAYS',
      },
      {
        ...mcq('Which access pattern makes an array the right structure?',
          [['Append at the end and read by index', true],
            ['Constant insertion at the front', false],
            ['Frequent removal from the middle', false],
            ['Frequent reordering', false]],
          'Arrays are excellent at exactly what they are good at. The skill is noticing when your pattern is not that.'),
        skillKey: 'DSA_ARRAYS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_TWO_POINTERS',
    notes: `The two-pointer pattern uses two positions moving through an array instead of one. It
turns a surprising number of O(n²) solutions into O(n), and once you recognise it you see it
everywhere.

**The problem it solves best: pair-sum in a sorted array.** Find two numbers adding to a target.

The obvious approach is every pair — two nested loops, O(n²). The two-pointer approach:

    def pair_sum(arr, target):          # arr must be sorted
        left, right = 0, len(arr) - 1
        while left < right:
            total = arr[left] + arr[right]
            if total == target:
                return (left, right)
            if total < target:
                left += 1               # need bigger; only left can grow
            else:
                right -= 1              # need smaller; only right can shrink
        return None

**Why moving one pointer is safe** — this is the part worth understanding rather than
memorising. If the sum is too small, then \`arr[left]\` paired with anything at or below \`right\`
is also too small, because everything between them is ≤ \`arr[right]\`. So the whole row for
\`left\` can be discarded, not just one pair. Each step eliminates a row or a column of the pair
table, which is why n steps suffice for n² pairs.

**Sortedness is the precondition.** The argument above depends entirely on it. On unsorted data
the pattern is simply wrong, and a hash set is the right O(n) tool instead.

**The other two shapes you will meet:**

- **Opposite ends, moving inward** — palindrome checks, reversing in place, container problems.
- **Both from the left at different speeds** — removing duplicates in place, the fast/slow
  pointer for cycle detection, sliding windows.

Removing duplicates from a sorted array in place:

    write = 0
    for read in range(len(arr)):
        if read == 0 or arr[read] != arr[read - 1]:
            arr[write] = arr[read]
            write += 1
    # first \`write\` elements are the unique ones

\`read\` advances every step; \`write\` only when something is kept. Two positions, one pass, no
extra array.

**How to recognise the opportunity.** You are about to write nested loops over the same array,
AND the array is sorted or can be, AND the inner loop's range depends on the outer position.
That combination is the signal.`,
    mcqs: [
      mcq('In sorted pair-sum, the total is too small. Why is advancing `left` safe?',
        [['`arr[left]` with anything up to `right` is also too small', true],
          ['Because `left` is always smaller than `right` in a sorted array', false],
          ['It is a convention; moving either pointer would work', false],
          ['To avoid an infinite loop, since one pointer must move', false]],
        'Each step discards a row or column of the pair table rather than a single pair. That is why n steps cover n squared pairs.'),
      mcq('Two pointers for pair-sum requires:',
        [['A sorted array', true], ['Distinct elements', false], ['Positive numbers', false], ['An even length', false]],
        'The elimination argument depends entirely on ordering. On unsorted data the pattern is wrong and a hash set is the O(n) tool.'),
      mcq('In the in-place duplicate removal, when does `write` advance?',
        [['Only when an element is kept', true],
          ['Every iteration', false],
          ['When a duplicate is found', false],
          ['Only at the end', false]],
        'The two pointers move at different rates, which is what compacts the kept elements into the front without a second array.'),
      mcq('Which combination signals a two-pointer opportunity?',
        [['Nested loops over one sorted array, the inner range following the outer', true],
          ['Any nested loop over the same array, sorted or not', false],
          ['Any sorted array, whatever the shape of the loops', false],
          ['Any search problem where the target is a single value', false]],
        'All three together. Each alone is far too common to be a useful signal.'),
    ],
    checkpoint: [
      {
        ...mcq('Two-pointer pair-sum on 1000 sorted elements does at most how many iterations?',
          [['About 1000 — the pointers move towards each other and meet', true],
            ['About a million, since each pointer visits every other position', false], ['About ten, because binary search bounds how far a pointer moves', false], ['About half a million, one for each distinct pair of positions', false]],
          'Every iteration moves one pointer inward by one, so the gap closes in at most n steps.'),
        skillKey: 'DSA_ARRAYS',
      },
      mcq('The array is unsorted and you need pair-sum in O(n). What should you use?',
        [['A hash set of values seen so far', true],
          ['Two pointers anyway, which work on any array at all', false],
          ['Nested loops, since no ordering can be exploited', false],
          ['Sort it first, then apply the two-pointer method', false]],
        'Sorting costs O(n log n), which is more than the hash-set approach. Two pointers would simply be incorrect here.'),
    ],
  },
  {
    unitCode: 'T_ARRAYS_STRING_BASICS',
    notes: `A string is an array of characters. Almost everything you know about arrays applies —
and the one place it does not is the source of a classic performance bug.

**Indexing is O(1)**, for the same reason as any array: \`s[5]\` is address arithmetic.

**Slicing copies.** \`s[2:8]\` builds a new string of the sliced length. It is O(k) for k
characters, not free, and a slice inside a loop is how an O(n) problem quietly becomes O(n²).

**Strings are immutable in Python, Java and C#.** \`s[0] = 'x'\` is an error. Every "modification"
creates a new string.

**Which produces the classic bug:**

    result = ""
    for word in words:
        result = result + word        # O(n squared) overall

Each \`+\` allocates a new string and copies everything accumulated so far. Building a 10,000-word
string this way copies roughly 50 million characters.

**The fix:**

    result = "".join(words)           # O(n)

\`join\` measures the total length once, allocates once, and copies each piece exactly once.
**Whenever you are building a string in a loop, collect the pieces in a list and join at the
end.**

**Why immutability, given that cost?** Because it makes strings safe to share — a string passed
to a function cannot be changed underneath you, so no defensive copy is needed anywhere. It also
lets them be hash keys, which is what makes dictionary lookup by string possible.

**Characters and bytes are not the same thing.** \`len("café")\` is 4 characters; encoded as UTF-8
it is 5 bytes, because é takes two. This matters the moment you write to a file, send data over a
network, or set a database column width — and it is why "it worked until somebody entered a name
with an accent" is a real category of bug.`,
    mcqs: [
      mcq('Why is building a string with `+=` in a loop O(n squared)?',
        [['Strings are immutable, so each step copies everything so far', true],
          ['The loop is nested inside another one somewhere', false],
          ['Addition on strings is slower than on numbers', false],
          ['It is not quadratic at all; it is linear in the length', false]],
        'The copying is invisible in the source, which is what makes this the most common accidental quadratic in everyday code.'),
      mcq('The correct way to build a large string from pieces is:',
        [['Collect them in a list and use join', true],
          ['Use += with a longer variable name', false],
          ['Preallocate the string', false],
          ['Use a loop with slicing', false]],
        'join measures the total length once, allocates once and copies each piece exactly once.'),
      mcq('`len("café")` is 4, but the UTF-8 encoding is 5 bytes. Why does that matter?',
        [['Files, networks and database column widths count bytes, not characters', true],
          ['It does not matter; the two counts are interchangeable', false],
          ['Python is miscounting the accented character as one', false],
          ['Only when the string is displayed in a fixed-width font', false]],
        'This is why "it worked until somebody entered an accented name" is a recognisable class of bug.'),
      mcq('What does immutability buy, given the concatenation cost?',
        [['Strings are safe to share and can be used as hash keys', true],
          ['Faster concatenation, since the length is known ahead', false],
          ['Less memory, because identical strings are shared', false],
          ['Nothing; immutability is a cost with no compensation', false]],
        'No defensive copying anywhere, and dictionary lookup by string, which would be unsound if a key could change.'),
    ],
    checkpoint: [
      {
        ...mcq('`s[2:8]` on a long string costs:',
          [['O(k) — it builds a new string of the sliced length', true],
            ['O(1), since the start and end are simply recorded', false], ['O(n), because the whole string must be scanned', false], ['Nothing; the slice is a view onto the original', false]],
          'A slice inside a loop is how an O(n) problem quietly becomes O(n squared), and the source gives no hint.'),
        skillKey: 'DSA_STRINGS',
      },
      {
        ...mcq('Which operation on a Python string raises an error?',
          [['`s[0] = "x"`', true], ['`s[0]`', false], ['`s + "x"`', false], ['`s * 2`', false]],
          'Immutability. The others all produce new strings rather than modifying the original.'),
        skillKey: 'DSA_STRINGS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_STRING_PROBLEMS',
    notes: `Four shapes cover most string problems you will meet. Recognising which one you have is
most of the work.

**1. Reversal.**

    reversed_s = s[::-1]                    # Python, O(n)

In place, for a mutable array of characters, this is the two-pointer pattern: swap the ends and
move inward.

**2. Palindrome.** Two pointers from both ends, comparing as they move:

    def is_palindrome(s):
        left, right = 0, len(s) - 1
        while left < right:
            if s[left] != s[right]:
                return False
            left += 1
            right -= 1
        return True

The interesting part is the specification, not the code. Is " A man, a plan" a palindrome? Only
if you normalise first — strip non-letters and lower-case. **Ask before implementing**, because
both answers are defensible and only one is wanted.

**3. Counting.** A dictionary from character to count:

    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1

One pass, O(n). This is the basis of anagram checks — two strings are anagrams exactly when
their counts match — and it beats the sort-both-and-compare approach, which is O(n log n).

**4. Searching for a substring.** \`s.find(sub)\` is built in and good enough almost always. The
naive algorithm is O(n·m); the library one is better. Write your own only when asked to.

**The traps, in order of how often they bite:**

- **Case.** \`"Apple" == "apple"\` is False. Normalise before comparing.
- **Whitespace.** Trailing spaces from input are invisible and compare unequal. \`.strip()\`.
- **Empty string.** Is \`""\` a palindrome? Conventionally yes. Does your loop handle it? The
  two-pointer version does — the loop never runs — but check rather than assume.
- **Building output with \`+=\`** — the quadratic from the previous unit, and it reappears in
  every one of these problems.`,
    mcqs: [
      mcq('Checking whether two strings are anagrams is best done by:',
        [['Comparing character counts in one pass — O(n)', true],
          ['Sorting both and comparing — O(n log n)', false],
          ['Nested loops over both', false],
          ['Reversing one and comparing', false]],
        'Sorting works and is slower. Counting is the direct expression of what "anagram" means.'),
      mcq('Before implementing a palindrome check, what must you settle?',
        [['Whether punctuation, spaces and case are ignored', true],
          ['Whether the string is ASCII or may hold other scripts', false],
          ['The maximum length the input is allowed to reach', false],
          ['Which language the implementation will be written in', false]],
        'Both answers are defensible and only one is wanted. This is a specification question wearing an implementation costume.'),
      mcq('The two-pointer palindrome check on an empty string:',
        [['Returns True, because the loop body never runs', true],
          ['Raises an IndexError on the very first comparison', false],
          ['Returns False, since there is nothing to compare', false],
          ['Loops forever, because the pointers never meet', false]],
        '`left < right` is immediately false. Worth confirming rather than assuming, which is the general habit for empty input.'),
      mcq('Which trap appears in every one of these problems?',
        [['Building the output with += inside the loop', true],
          ['Integer overflow when the string grows very long', false],
          ['Stack depth, once the recursion goes deep enough', false],
          ['Floating point error creeping into the index sums', false]],
        'It is invisible in the source and turns a linear solution quadratic, which is why it is worth a permanent habit rather than vigilance.'),
    ],
    coding: [
      {
        title: 'Normalised palindrome check',
        description: `Read one line and print \`YES\` if it is a palindrome ignoring case, spaces and punctuation, otherwise \`NO\`.

Only letters and digits count. Use the two-pointer approach rather than building a reversed copy — and decide what an empty line should produce before you write it.`,
        starter: `s = input()
# your code here`,
        language: 'python',
        tests: [
          { input: 'A man, a plan, a canal: Panama', expectedOutput: 'YES' },
          { input: 'hello', expectedOutput: 'NO' },
          { input: 'Was it a car or a cat I saw?', expectedOutput: 'YES' },
          { input: 'ab', expectedOutput: 'NO', isHidden: true },
          { input: 'a', expectedOutput: 'YES', isHidden: true },
          { input: '12321', expectedOutput: 'YES', isHidden: true },
        ],
      },
      {
        title: 'Anagram check by counting',
        description: `Read two lines and print \`YES\` if they are anagrams of each other, otherwise \`NO\`.

Ignore case and spaces. Count characters in one pass rather than sorting — the whole point is the O(n) approach.`,
        starter: `a = input()
b = input()
# your code here`,
        language: 'python',
        tests: [
          { input: 'listen\nsilent', expectedOutput: 'YES' },
          { input: 'hello\nworld', expectedOutput: 'NO' },
          { input: 'Dormitory\nDirty Room', expectedOutput: 'YES' },
          { input: 'abc\nabcd', expectedOutput: 'NO', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      {
        ...mcq('Two strings have identical character counts. What follows?',
          [['They are anagrams of each other', true],
            ['They are equal', false],
            ['They are palindromes', false],
            ['They are the same length only', false]],
          'Identical multisets of characters is the definition of an anagram, which is why counting is the direct test rather than a trick.'),
        skillKey: 'DSA_STRINGS',
      },
      {
        ...mcq('`"Apple" == "apple"` is False. The habit that prevents this class of bug is:',
          [['Normalise case and whitespace before comparing', true],
            ['Use a comparison operator that ignores letter case', false],
            ['Compare the two lengths before comparing the text', false],
            ['Convert both strings to bytes before comparing them', false]],
          'Trailing whitespace from input is the invisible version of the same problem and bites just as often.'),
        skillKey: 'DSA_STRINGS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_COMPLEXITY',
    notes: `Big-O is a way of comparing two approaches you are actually choosing between. It is
usually taught as notation to be examined on, which is why people can state it and not use it.

**What it says.** How the work grows as the input grows. Not how many seconds — how the seconds
change when the input gets bigger.

**The ones you need, in order:**

| Notation | Name | Doubling n does what | Example |
|---|---|---|---|
| O(1) | constant | nothing | \`arr[i]\`, \`append\` |
| O(log n) | logarithmic | adds one step | binary search |
| O(n) | linear | doubles the work | one traversal |
| O(n log n) | linearithmic | slightly more than doubles | a good sort |
| O(n²) | quadratic | quadruples the work | nested loops |

**How to read your own code.** Count the nesting over the input.

    for x in arr:              # O(n)
        print(x)

    for x in arr:              # O(n squared)
        for y in arr:
            print(x, y)

    for x in arr:              # still O(n) — 3n is O(n)
        print(x)
    for y in arr:
        print(y)

**Sequencing adds; nesting multiplies.** That single sentence is most of practical Big-O.

**Constants are dropped** because they do not change the shape. O(2n) is O(n). This is why Big-O
does not tell you which of two O(n) solutions is faster — for that you measure. It tells you
which will *still be viable* at a hundred times the size.

**The hidden costs**, which is where real mistakes live:

- \`x in a_list\` is **O(n)**, not O(1). Inside a loop over the same list, that is O(n²), and the
  source looks perfectly innocent.
- \`x in a_set\` or \`x in a_dict\` **is** O(1). Switching a list to a set is frequently the entire
  fix for a slow program.
- \`arr.insert(0, x)\` is O(n).
- String \`+=\` in a loop is O(n²).

**Why it matters concretely.** At n = 1,000,000: an O(n) algorithm does a million operations; an
O(n²) one does a trillion. The first finishes; the second does not. That is the decision Big-O
exists to inform — not an exam answer, a judgement about whether the approach will survive real
data.

**When not to care.** n is small and stays small. An O(n²) loop over ten items is fine, and
rewriting it costs more than it saves.`,
    mcqs: [
      mcq('`for x in arr: if x in other_list:` where both have n elements is:',
        [['O(n squared), because `in` on a list is itself O(n)', true],
          ['O(n), because each list is traversed once', false], ['O(n log n)', false], ['O(1)', false]],
        'The hidden linear scan inside the loop. The source looks innocent, which is why this is the most common accidental quadratic.'),
      mcq('Changing `other_list` to a set in that code makes it:',
        [['O(n), because set membership is O(1)', true],
          ['O(n log n)', false], ['Still O(n squared), since the outer loop is unchanged', false], ['O(1)', false]],
        'Frequently the entire fix for a slow program, and a one-line change.'),
      mcq('Two O(n) loops one after the other is:',
        [['O(n) — sequencing adds, and constants are dropped', true],
          ['O(n squared), because the two loops multiply', false], ['O(2n), which is a class of its own between n and n squared', false], ['O(n log n)', false]],
        'Sequencing adds; nesting multiplies. That sentence is most of practical Big-O.'),
      mcq('What does Big-O deliberately NOT tell you?',
        [['Which of two O(n) solutions is faster in practice', true],
          ['How work grows with input size', false],
          ['Whether an approach survives large data', false],
          ['The difference between O(n) and O(n squared)', false]],
        'Constants are dropped, so two algorithms in the same class need measurement rather than analysis to separate.'),
    ],
    checkpoint: [
      mcq('At n = 1,000,000, the practical difference between O(n) and O(n squared) is:',
        [['A million operations versus a trillion — one finishes and one does not', true],
          ['About twice as slow, which is noticeable but rarely fatal', false],
          ['Negligible on modern hardware, which absorbs the difference', false],
          ['A million times more memory, though the speed is comparable', false]],
        'This is the judgement Big-O exists to inform: whether the approach survives real data at all.'),
      mcq('When is an O(n squared) solution perfectly acceptable?',
        [['When n is small and will stay small', true],
          ['Never; a quadratic solution should always be replaced', false],
          ['When the simpler code is worth the extra running time', false],
          ['When memory is tight and a faster method needs more', false]],
        'Ten items squared is a hundred. Rewriting that costs more than it saves, and knowing when NOT to optimise is part of the skill.'),
    ],
  },
  {
    unitCode: 'T_ARRAYS_DEBUGGING',
    notes: `Index faults have a small, recognisable set of causes. Learn the four and most of them
diagnose themselves.

**1. \`IndexError: list index out of range\`**

Almost always \`<=\` where \`<\` was meant, or \`len(arr)\` where \`len(arr) - 1\` was meant:

    for i in range(len(arr) + 1):     # one too many
    while i <= len(arr):              # same mistake
    print(arr[len(arr)])              # the last index is len-1

**The check:** an array of n has valid indices 0 to n-1. Say that out loud against your bound.

**2. The loop that runs once too often or too few** — off-by-one without a crash. This one does
not raise; it produces a wrong answer. \`range(1, n)\` skips index 0; \`range(0, n-1)\` skips the
last.

**The check:** for a 3-element array, does your loop visit exactly 0, 1, 2? Write the three
numbers down.

**3. Mutating while traversing.** Covered in Traversal: removing forwards skips elements and
eventually crashes on a stale bound. Go backwards, or build a new list.

**4. The aliasing trap**, which produces the strangest symptoms:

    a = [1, 2, 3]
    b = a                # NOT a copy — both names refer to one list
    b.append(4)
    print(a)             # [1, 2, 3, 4]

And the worse version:

    grid = [[0] * 3] * 3         # three references to ONE row
    grid[0][0] = 1
    print(grid)                  # [[1,0,0],[1,0,0],[1,0,0]]

\`* 3\` repeated the *reference*, not the row. The fix:

    grid = [[0] * 3 for _ in range(3)]

**The method.** Before the failing line, print the length and the index:

    print(f"len={len(arr)} i={i}")
    print(arr[i])

Those two numbers identify every bound error immediately. For aliasing, print \`id(a), id(b)\` —
same id means same object, and that is the whole diagnosis.

**And for off-by-one specifically:** run it on an array of exactly one element. Almost every
boundary mistake either crashes or visibly misbehaves at n = 1.`,
    coding: [
      {
        title: 'Fix three index faults',
        description: `This program should print the largest element, then the list reversed in place, then the list with negatives removed. All three functions are broken in different ways.

Diagnose each before changing it: which of the four causes is it? Then make the smallest fix.`,
        starter: `def largest(arr):
    big = arr[0]
    for i in range(1, len(arr) + 1):
        if arr[i] > big:
            big = arr[i]
    return big

def reverse_in_place(arr):
    for i in range(len(arr)):
        arr[i], arr[len(arr) - i] = arr[len(arr) - i], arr[i]
    return arr

def drop_negatives(arr):
    for i in range(len(arr)):
        if arr[i] < 0:
            arr.pop(i)
    return arr

nums = [int(x) for x in input().split()]
print(largest(list(nums)))
print(" ".join(str(x) for x in reverse_in_place(list(nums))))
print(" ".join(str(x) for x in drop_negatives(list(nums))))`,
        language: 'python',
        tests: [
          { input: '3 -1 7 -4 2', expectedOutput: '7\n2 -4 7 -1 3\n3 7 2' },
          { input: '5', expectedOutput: '5\n5\n5' },
          { input: '-2 -3', expectedOutput: '-2\n-3 -2\n', isHidden: true },
          { input: '1 2 3 4', expectedOutput: '4\n4 3 2 1\n1 2 3 4', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('`for i in range(len(arr) + 1)` raises IndexError on the last iteration because:',
        [['Valid indices are 0 to len-1, and this reaches len', true],
          ['`range` is exclusive, so it never reaches the end', false],
          ['The array is empty, so no index at all is valid', false],
          ['Adding 1 inside `range` is not valid Python syntax', false]],
        'Saying "an array of n has indices 0 to n-1" out loud against your bound catches this every time.'),
      mcq('`grid = [[0] * 3] * 3` then `grid[0][0] = 1` changes every row. Why?',
        [['The outer `* 3` repeated one row REFERENCE three times', true],
          ['Lists in Python are always shared rather than copied', false],
          ['Integers are immutable, so the assignment rebinds them', false],
          ['It is a long-standing bug in how Python builds lists', false]],
        'One row object, three names for it. The comprehension form creates three distinct rows.'),
      mcq('An off-by-one that does NOT crash is best caught by:',
        [['Running it on an array of exactly one element', true],
          ['Running it on the largest array you can construct', false],
          ['Reading the code through again more carefully', false],
          ['Adding a try/except so the failure is reported', false]],
        'Almost every boundary mistake either crashes or visibly misbehaves at n = 1, and it takes seconds to try.'),
      mcq('Which two values identify nearly every bound error immediately?',
        [['The length of the array and the index being used', true],
          ['The value being read and what type it turned out to be', false],
          ['The name of the loop variable and of the array itself', false],
          ['The memory address the array happens to start at', false]],
        'Printing len and i beside each other turns an IndexError into an arithmetic statement you can read.'),
    ],
    checkpoint: [
      mcq('`b = a` where a is a list, then `b.append(4)`. What is `a`?',
        [['Also changed — both names refer to one list', true],
          ['Unchanged, because `b` was given a copy of the list', false], ['A copy of the original with the 4 appended to it', false], ['An error, since a list cannot be assigned to twice', false]],
        'Assignment binds a name to an object; it does not copy. `a.copy()` or `list(a)` is how you get a separate list.'),
      mcq('The fastest way to confirm two names refer to the same list is:',
        [['Print `id(a)` and `id(b)` — equal ids mean one object', true],
          ['Compare them with `==`, which is true only for one object', false],
          ['Check that the two lengths match after appending to one', false],
          ['Print both lists and see whether the contents are the same', false]],
        '`==` compares contents, so two distinct equal lists look identical. Identity is the actual question.'),
    ],
  },
  {
    unitCode: 'T_ARRAYS_TRAVERSAL_PRACTICE',
    notes: `No new ideas. Every problem here uses what an array is, traversal forwards and backwards,
inserting and removing, and the index-fault checks from debugging — and nothing beyond them. No
searching strategies, no sorting, no cost analysis: those come next. The goal is that walking a list
and changing it stop needing thought.

**The shapes that cover almost every problem here:**

1. **Visit every element** — \`for value in values:\` when the position does not matter.
2. **Total or count** — a name set to 0 before the loop, updated inside it.
3. **Best so far** — start from the first element, replace it whenever a better one appears.
4. **Keep some** — build a new list: \`kept = [v for v in values if v >= 0]\`.
5. **Change in place** — by index, and backwards whenever elements are being removed.

**The method, for every problem:**

1. **Say which shape it is** before writing anything.
2. **Decide what the empty list should produce**, and the one-element list. Both are usually one
   line, and both are usually where the bug is.
3. **Write the loop, then trace it by hand on three elements.**
4. **Check the bounds against one sentence:** a list of n elements has indices 0 to n-1.

**The checklist before you run it:**

- Is the starting value of a total or best right for an empty list?
- Does every index stay between 0 and \`len(values) - 1\`?
- Am I removing while walking forwards? Go backwards, or build a new list.
- \`b = a\` does not copy a list — both names are the same list.
- \`append\` at the end is cheap; \`insert(0, x)\` shifts every element.`,
    mcqs: [
      mcq('Find the two largest values in an unsorted array. Best approach?',
        [['One pass tracking the top two', true],
          ['Nested loops comparing every pair', false],
          ['Two passes, removing the max', false],
          ['Copying the list, then scanning the copy', false]],
        'One walk that updates the largest and second-largest as it goes does all the work needed. Pairs, removals and copies only add effort.'),
      mcq('`marks = [72, 45, 90, 38]`. Which line builds a new list of only the marks that are 40 or more?',
        [['`passed = [m for m in marks if m >= 40]`', true],
          ['`passed = [m >= 40 for m in marks]`', false],
          ['`passed = [marks[m] for m in marks if m >= 40]`', false],
          ['`passed = marks.remove(38)`', false]],
        'The condition filters and m is the value kept. The second keeps True/False, the third uses marks as indices and fails, and remove changes marks and returns None.'),
      mcq('A list has 6 elements. Which loop visits every index from the last down to the first?',
        [['`for i in range(5, -1, -1):`', true],
          ['`for i in range(6, 0, -1):`', false],
          ['`for i in range(5, 0, -1):`', false],
          ['`for i in range(6, -1, -1):`', false]],
        'The last valid index is 5, and a stop of -1 means down to and including 0. Starting at 6 is out of range, and stopping at 0 leaves index 0 unvisited.'),
      mcq('`nums = [4, 8, 15]`. What is `nums` after `nums.insert(1, 6)` and then `nums.pop()`?',
        [['`[4, 6, 8]`', true], ['`[4, 6, 8, 15]`', false], ['`[6, 8, 15]`', false], ['`[4, 8, 15]`', false]],
        'insert(1, 6) places 6 at index 1, giving [4, 6, 8, 15]. pop() with no index removes the last element, 15.'),
      mcq('`best = values[0]`, then `for v in values: if v < best: best = v`. For `[7, 3, 9, 3]`, what is `best` at the end?',
        [['3', true], ['7', false], ['9', false], ['The repeated 3 raises an error', false]],
        'best starts at 7 and is replaced only by something smaller. It becomes 3, and the second 3 is not smaller, so it stays.'),
    ],
    coding: [
      {
        title: 'Count and total the passing marks',
        description: `Read one line of whole-number marks separated by spaces. A mark of 40 or more is a pass.

Print exactly two lines: how many marks passed, and the total of the passing marks. An empty line has no marks, so both are 0.`,
        starter: `line = input().strip()
marks = [int(x) for x in line.split()] if line else []
# your code here`,
        language: 'python',
        tests: [
          { input: '72 45 90 38', expectedOutput: 'Passed: 3\nTotal: 207' },
          { input: '10 20 39', expectedOutput: 'Passed: 0\nTotal: 0' },
          { input: '40', expectedOutput: 'Passed: 1\nTotal: 40', isHidden: true },
          { input: '', expectedOutput: 'Passed: 0\nTotal: 0', isHidden: true },
        ],
      },
      {
        title: 'The largest value and where it first appears',
        description: `Read one line of whole numbers separated by spaces. Print the largest value and the index where it FIRST appears, separated by a space.

If the line is empty, print \`empty\` instead. Do not use \`max\` or \`index\` — walk the list yourself.`,
        starter: `line = input().strip()
values = [int(x) for x in line.split()] if line else []
# your code here`,
        language: 'python',
        tests: [
          { input: '4 9 2 9', expectedOutput: '9 1' },
          { input: '-5 -2 -8', expectedOutput: '-2 1' },
          { input: '7', expectedOutput: '7 0', isHidden: true },
          { input: '', expectedOutput: 'empty', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      {
        ...mcq('`scores = [12, 7, 30, 7]`. What does `for i in range(len(scores)): if scores[i] == 7: print(i)` print?',
          [['1, then 3', true], ['1 only', false], ['7, then 7', false], ['2, then 4', false]],
          'It prints positions, not values, and positions count from zero: the two 7s sit at indices 1 and 3.'),
        skillKey: 'DSA_ARRAYS',
      },
      {
        ...mcq('Which expression gives the last element of a non-empty list `items`?',
          [['`items[len(items) - 1]`', true], ['`items[len(items)]`', false], ['`items[len(items) + 1]`', false], ['`items[1]`', false]],
          'A list of n elements has indices 0 to n-1, so the last one is at len(items) - 1. len(items) itself is one past the end.'),
        skillKey: 'DSA_ARRAYS',
      },
      {
        ...mcq('`queue = [10, 20, 30]`. Which operation has to shift every existing element?',
          [['`queue.insert(0, 5)`', true], ['`queue.append(40)`', false], ['`queue.pop()`', false], ['`queue[1] = 25`', false]],
          'Inserting at the front makes room by moving every element one place right. The end is cheap, and replacing an element moves nothing.'),
        skillKey: 'DSA_ARRAYS',
      },
    ],
    assignment: {
      title: 'Coding Assignment — Walk Through Five Numbers',
      description: `Traverse a list of five numbers once: print each one, total them, and find the largest — without the built-ins that would do it for you.`,
      instructions: `**Objective**

Practise a single traversal that does three jobs at once: visiting every element, accumulating a
total, and tracking the best value seen so far.

**What the program must do**

The starter reads one line of exactly five whole numbers, separated by spaces, into the list
\`numbers\`. Print:

1. each number on its own line, in the order given
2. \`Total: \` followed by the sum of the five numbers
3. \`Largest: \` followed by the largest of them

**Examples**

For input \`4 9 2 7 5\` the program prints:

    4
    9
    2
    7
    5
    Total: 27
    Largest: 9

For input \`-3 -8 -1 -6 -2\` the last two lines are \`Total: -20\` and \`Largest: -1\`.

**Rules**

- Do not use \`sum()\`, \`max()\` or \`sorted()\`. Walk the list yourself.
- Think about where "largest so far" starts. Starting it at 0 gives the wrong answer when every
  number is negative — the second example exists to catch that.
- Trace your loop by hand on the second example before you run it.

**What to submit**

One Python program, written in the editor, that reads the list and prints the seven lines.

**How it is graded**

When you submit, your program is run against every test case — the examples above and a few more you
cannot see — and scored on how many it passes. Output is compared line by line: spelling and capital
letters matter, extra spaces do not. A reviewer grading by hand uses the rubric attached to this
assignment.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every number, the total and the largest are right for every test case, including all-negative and repeated values.', maxPoints: 60 },
        { criterion: 'Traversal without built-ins', description: 'The list is walked with a loop that accumulates the total and tracks the largest; no sum(), max() or sorted().', maxPoints: 30 },
        { criterion: 'Readable', description: 'The accumulator and the largest-so-far have names that say what they hold, and each starts from a correct value.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `numbers = [int(x) for x in input().split()]

# print each number, then the total and the largest
`,
        tests: [
          { input: '4 9 2 7 5', expectedOutput: '4\n9\n2\n7\n5\nTotal: 27\nLargest: 9' },
          { input: '-3 -8 -1 -6 -2', expectedOutput: '-3\n-8\n-1\n-6\n-2\nTotal: -20\nLargest: -1' },
          { input: '5 5 5 5 5', expectedOutput: '5\n5\n5\n5\n5\nTotal: 25\nLargest: 5', isHidden: true },
          { input: '10 0 -10 20 -20', expectedOutput: '10\n0\n-10\n20\n-20\nTotal: 0\nLargest: 20', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },
  {
    unitCode: 'T_ARRAYS_PRACTICE',
    notes: `No new ideas. Every problem here uses traversal, searching, binary search, two
pointers, insertion cost, string handling or complexity reasoning — each pattern appears at
least twice, because seeing a pattern once is recognition and seeing it twice is fluency.

**Work these without looking anything up.** If you need to check how binary search terminates,
return to that unit instead of pushing through.

**The checklist for every array problem, before you write anything:**

1. **Is the data sorted, or can it be?** This decides whether binary search and two pointers are
   available at all.
2. **What is the empty case?** And the single-element case? Both are usually one line and both
   are usually where the bug is.
3. **Am I about to nest loops over the same array?** If so, is there a two-pointer or a hash-set
   version?
4. **Am I inserting at the front, or building a string with \`+=\`?** Both are hidden quadratics.
5. **What are the valid indices?** 0 to n-1. Check your bounds against that sentence.

**Estimate the cost before running.** Say "this is O(n log n) because it sorts once and then does
one pass" — then check whether that is acceptable for the size you expect. Getting into this
habit now is what makes complexity a tool rather than an exam topic.`,
    mcqs: [
      mcq('You must find whether any value appears twice in an unsorted array. Best approach?',
        [['One pass with a set of values seen — O(n)', true],
          ['Nested loops comparing every pair — O(n squared)', false],
          ['Sort then scan — O(n log n)', false],
          ['Binary search for each element', false]],
        'Sorting works and is slower. The set version is one pass and reads as exactly what the problem asks.'),
      mcq('An array is sorted and you need the first element greater than x. Best approach?',
        [['A binary search variant — O(log n)', true],
          ['A linear scan from the start until one is found', false],
          ['Two pointers moving inwards from the two ends', false],
          ['Sort the array again before beginning the search', false]],
        'Sorted data is an asset, and failing to use it is the most common missed optimisation in this topic.'),
      mcq('Merge two sorted arrays into one sorted array. Best approach?',
        [['Two pointers, one per array, taking the smaller each time', true],
          ['Concatenate and sort — O(n log n)', false],
          ['Insert each element of one array into the other in place', false],
          ['Binary search for each element', false]],
        'Both inputs are already sorted, which is exactly the structure the two-pointer walk exploits.'),
      mcq('Reverse the words in a sentence. Which hidden cost should you avoid?',
        [['Building the result with += in a loop', true],
          ['Using `split`, which copies the whole sentence', false],
          ['Using a list to hold the words before joining', false],
          ['Using `join`, which walks the list a second time', false]],
        'split and join are both linear. Only the accumulating concatenation is quadratic.'),
    ],
    coding: [
      {
        title: 'Two-pointer merge of sorted arrays',
        description: `Read two lines of sorted integers and print them merged into one sorted line.

Use two pointers — do NOT concatenate and sort. Handle either line being empty.`,
        starter: `a_line = input().strip()
b_line = input().strip()
a = [int(x) for x in a_line.split()] if a_line else []
b = [int(x) for x in b_line.split()] if b_line else []
# your code here`,
        language: 'python',
        tests: [
          { input: '1 3 5\n2 4 6', expectedOutput: '1 2 3 4 5 6' },
          { input: '1 2 3\n', expectedOutput: '1 2 3' },
          { input: '\n4 5', expectedOutput: '4 5' },
          { input: '1 1 2\n1 3', expectedOutput: '1 1 1 2 3', isHidden: true },
        ],
      },
      {
        title: 'Rotate an array without a hidden quadratic',
        description: `Read a line of integers and then k. Print the array rotated right by k positions.

\`[1,2,3,4,5]\` with k=2 becomes \`[4,5,1,2,3]\`.

k may be larger than the array length, and the array may be empty. Do not use repeated \`insert(0, ...)\` — that is O(n) per step and O(n·k) overall.`,
        starter: `line = input().strip()
arr = [int(x) for x in line.split()] if line else []
k = int(input())
# your code here`,
        language: 'python',
        tests: [
          { input: '1 2 3 4 5\n2', expectedOutput: '4 5 1 2 3' },
          { input: '1 2 3\n0', expectedOutput: '1 2 3' },
          { input: '1 2 3\n5', expectedOutput: '2 3 1' },
          { input: '\n3', expectedOutput: '', isHidden: true },
          { input: '1\n7', expectedOutput: '1', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('Before writing any array solution, the first question is:',
        [['Is the data sorted, or can it be?', true],
          ['How long is it?', false],
          ['Which language?', false],
          ['Is it numbers or strings?', false]],
        'Sortedness decides whether binary search and two pointers are available, which is the largest single fork in the approach.'),
      {
        ...mcq('Rotating by k using repeated `insert(0, ...)` costs:',
          [['O(n times k) — each insertion shifts the whole array', true],
            ['O(k), since exactly k insertions are performed in total', false], ['O(n), because the array is traversed once however large k is', false], ['O(log n), as each insertion halves the remaining work to do', false]],
          'Slicing or reversal gives O(n) regardless of k, and k can exceed n, which is the case worth testing.'),
        skillKey: 'DSA_ARRAYS',
      },
    ],
  },
  {
    unitCode: 'T_ARRAYS_MINI_PROJECT',
    notes: `This is the first project where **the justification carries as much weight as the
solution.** You will solve a small set of problems, and then explain what each solution costs and
why you chose that approach over the obvious alternative.

**Why that emphasis.** Almost any of these problems can be solved with nested loops. That
solution is correct, and it is the one that stops working when the data gets real. The skill
being built is not "can you produce an answer" but "can you choose between two correct answers
on grounds you can state" — which is the actual daily use of everything in this topic.

**How to work.**

1. **Solve it simply first.** A correct slow version is a baseline and a check on the fast one.
2. **State its cost.** Out loud, in the form "this is O(n squared) because the loop over the
   array contains another loop over the array."
3. **Ask whether the structure permits better.** Sorted? Two pointers or binary search. Membership
   testing? A set. Building a string? Join.
4. **Implement the better version, and check it agrees with the baseline** on the same inputs.
   Two implementations disagreeing is how you find out one of them is wrong.
5. **Write the justification.**

**On honesty.** If you could not improve a solution, say so and say what you tried. "I could not
see better than O(n squared) here, and I tried a set but membership was not the bottleneck" is a
genuinely good answer. Claiming an improvement you did not make is the only wrong answer.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Solve It, Then Justify the Cost',
      description: `Solve four array and string problems, then defend each choice of approach on cost. The written justification is assessed as heavily as the code.`,
      instructions: `**The brief**

Implement all four problems in one \`.py\` file, each as its own function.

**1. Duplicate detection.** \`has_duplicates(arr)\` returns True when any value appears more than
once. The array is unsorted and may be large.

**2. Pair sum.** \`pair_sum(arr, target)\` returns a pair of indices whose values add to target,
or None. Provide TWO implementations — one for unsorted input and one that exploits sorted
input — and say when each is appropriate.

**3. Longest run.** \`longest_run(s)\` returns the length of the longest run of one repeated
character in a string. \`"aabbbcc"\` returns 3.

**4. Merge and deduplicate.** \`merge_unique(a, b)\` takes two SORTED arrays and returns one
sorted array with no duplicates. Do not concatenate and sort.

**Every function must handle:** an empty input, a single element, and all-identical elements.

**What to submit**

1. The \`.py\` file with all five functions (problem 2 has two).
2. A **cost table**:

   | Function | Approach | Time | Space | Obvious alternative | Why rejected |
   |---|---|---|---|---|---|

3. A **written justification** (roughly 350-500 words) covering:
   - For each function: the simple solution you started from, its cost, and what you changed
   - Where sortedness was an asset, and how you used it
   - Any place you chose a WORSE complexity deliberately, and why (simplicity at small n is a
     legitimate reason — say so)
   - Anything you could not improve, and what you tried

4. Your **test evidence**: for each function, the empty case, single-element case and
   all-identical case, with expected and actual output.

**Constraints**

- No library function that solves the problem outright — no \`set(a) & set(b)\` standing in for
  problem 4's merge, no \`collections.Counter\` for problem 3. Using a set as a tool inside your
  own algorithm is fine and expected.
- No nested loop over the same array unless you justify it in the table.

**Hint on where the marks are.** Two students submitting identical correct code can score very
differently here. The one who writes "I used a set for problem 1 because membership on a list is
O(n), making the loop O(n squared); the set makes it O(n) at the cost of O(n) extra space" has
demonstrated the thing being taught.`,
      rubric: [
        {
          criterion: 'Correctness',
          description: 'All five functions correct, including empty, single-element and all-identical inputs for each.',
          maxPoints: 25,
        },
        {
          criterion: 'Choice of approach',
          description: 'Sortedness exploited where present. No accidental quadratics from list membership, front insertion or string concatenation. Two-pointer or hash approaches used where they apply.',
          maxPoints: 25,
        },
        {
          criterion: 'Cost table',
          description: 'Time and space stated correctly for each function, with the rejected alternative named and the reason given.',
          maxPoints: 20,
        },
        {
          criterion: 'Written justification',
          description: 'Explains the reasoning rather than restating the code. A deliberate worse-complexity choice is defended; an unimproved solution is stated honestly with what was tried.',
          maxPoints: 20,
        },
        {
          criterion: 'Test evidence',
          description: 'The three required edge cases per function, with expected and actual output recorded.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
