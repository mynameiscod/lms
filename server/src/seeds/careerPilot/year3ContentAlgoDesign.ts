/**
 * T3_ALGO_DESIGN and T3_DIVIDE_CONQUER — ten units. Year 3.
 *
 * ── THE TWO HABITS THIS MODULE IS ACTUALLY TEACHING ───────────────────────────────────────
 *
 * Reading the constraints first, and arguing correctness before typing. Both are habits
 * students do not have and cannot be told into having, so both units are built around a
 * mechanical procedure they can follow while they have no intuition yet.
 *
 * The constraints table is the single highest-value artefact in the module. "n up to 10^5, so
 * an O(n^2) is 10^10 operations, so quadratic is out before I have thought about the problem"
 * is a complete piece of reasoning that a third-year can perform on day one, and it removes
 * most wrong approaches without any insight at all.
 *
 * The correctness unit is the harder sell. Students believe passing tests is correctness. The
 * unit's job is the distinction between "no case I thought of breaks it" and "here is why no
 * case can", and the exchange argument in the greedy topic depends on this unit landing.
 *
 * Divide and conquer is taught as a SHAPE rather than as three algorithms, and the recurrence
 * unit deliberately refuses to present the master theorem as a rote formula — a student who
 * can only pattern-match a^T(n/b) is stuck the moment the split is uneven.
 *
 * Attribution: T3_ALGO_DESIGN defaults to ALGORITHM_DESIGN (DSA_COMPLEXITY is evidenced by
 * T3_CHOOSING_STRUCTURES). T3_DIVIDE_CONQUER is single-skill and derived.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ALGO_DESIGN_BUNDLES: PilotBundle[] = [
  /* ══ T3_ALGO_DESIGN ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ALGO_DESIGN_CONSTRAINTS_FIRST',
    notes: `Read the constraints before the problem. It sounds backwards and it is the single
most useful habit in this module, because **the bound tells you the shape of the answer before
you understand the question**.

## The arithmetic

Assume roughly 10⁸ simple operations per second. It is crude and it is close enough.

| n up to | What fits | What that means |
|---|---|---|
| 10 | O(n!) or O(2ⁿ) | Try everything. Brute force is intended. |
| 20 | O(2ⁿ) | Subsets. Bitmask DP lives here. |
| 100 | O(n³) | Triple loops are fine. |
| 1,000 | O(n²) | Nested loops are fine. |
| 10⁵ | O(n log n) | Sort, heap, or one pass with a map. |
| 10⁶ | O(n) | A single pass. Sorting is borderline. |
| 10⁹ | O(log n) or O(1) | Maths, binary search, or a formula. |

**How to use it.** n is 10⁵. An O(n²) solution is 10¹⁰ operations, which is about two minutes,
and the limit is one second. **Quadratic is out** — and you knew that before you had any idea
what the problem was about.

That is not a trick. It is the largest single reduction in the search space available to you,
and it costs one multiplication.

## The constraints that are not n

**The value range.** "Values up to 100" invites counting sort or a fixed-size array. "Values up
to 10⁹" rules both out and usually means you need a map or coordinate compression.

**Negative numbers allowed?** This is the one people skip. It breaks Dijkstra, it breaks most
sliding-window arguments, and it breaks "the maximum subarray is the sum of the positives". If
the statement does not say, ask.

**Sorted already?** That is not a detail, it is half the answer. Sorted input means binary
search, two pointers, or a merge.

**Distinct or duplicated?** Duplicates break many two-pointer and set-based approaches, quietly.

**Memory.** 256MB is about 6 × 10⁷ integers. An O(n²) *table* at n = 10⁵ does not fit, whatever
its time cost.

## Working backwards from the bound

The bound often names the technique outright:

- Need O(n log n) and you are not sorting? Heap, or binary search on the answer.
- Need O(log n) on something that is not a sorted array? Binary search on the answer — search
  for the *result* rather than for an element.
- Need O(1) space with a linear scan? Two pointers, or prefix sums computed as you go.
- n is 20 and the answer is a subset? That is 2²⁰ ≈ 10⁶ subsets, and enumerating them all is
  the intended solution.

## The honest caveat

**These are guides for a bounded problem, not laws.** Real systems have caches, constant factors
and data that is nothing like worst case, and a "too slow" O(n²) sometimes beats an O(n log n)
at the size you actually have. The table is for the interview and for the first estimate. After
that, measure.`,
    mcqs: [
      mcq('n is up to 10^5 and the limit is one second. An O(n^2) solution is:',
        [['About 10^10 operations, so ruled out immediately', true],
          ['Roughly 10^7 operations, so comfortably fine', false],
          ['Acceptable if the constant factor is small', false],
          ['Impossible to judge without knowing the problem', false]],
        'And you knew that before understanding what the problem asked.'),
      mcq('n up to 20, and the answer is a subset. That suggests:',
        [['Enumerating all 2^20 subsets is intended', true],
          ['A greedy choice, since n is very small', false],
          ['Sorting first, then a linear scan', false],
          ['Dynamic programming over the values', false]],
        'About 10^6 subsets — small n is a signal, not a simplification.'),
      mcq('Which constraint do students most often skip?',
        [['Whether negative values are allowed', true],
          ['The upper bound on n itself', false],
          ['The memory limit for the problem', false],
          ['Whether the input is already sorted', false]],
        'It breaks Dijkstra, most sliding windows, and sum-of-positives arguments.'),
      mcq('Needing O(log n) on something that is not a sorted array suggests:',
        [['Binary searching the answer rather than an element', true],
          ['Building a balanced tree over the input', false],
          ['A divide-and-conquer split of the data', false],
          ['Precomputing a lookup table of results', false]],
        'Search the result space; it is the technique the bound is naming.'),
    ],
    checkpoint: [
      mcq('"Values up to 100" rather than up to 10^9 invites:',
        [['Counting with a fixed-size array', true],
          ['A hash map keyed on the value', false],
          ['Sorting before any other step', false],
          ['Binary search over the value range', false]],
        'The value range is a constraint in its own right, separate from n.'),
      mcq('256MB of memory is roughly:',
        [['6 × 10^7 integers', true], ['6 × 10^5 integers', false],
          ['6 × 10^9 integers', false], ['6 × 10^3 integers', false]],
        'Which is why an n^2 table at n = 10^5 does not fit, whatever its time cost.'),
      mcq('The honest limitation of the constraints table is that:',
        [['Real data and caches can beat the asymptotic answer', true],
          ['It only applies to interview problems', false],
          ['The operations-per-second figure is too low', false],
          ['It ignores the memory each approach needs', false]],
        'It is the first estimate. After that, measure.'),
    ],
  },

  {
    unitCode: 'T3_ALGO_DESIGN_ARGUING_CORRECTNESS',
    notes: `"It passes the tests" is not "it is correct". The gap between them is where most
production bugs live, and closing it is a skill you can practise.

**Passing tests** means: no case I thought of breaks it.
**Correct** means: here is why no case *can*.

The difference is whether your confidence comes from the cases you tried or from an argument
about all of them.

## Three ways to argue, by shape of algorithm

**For a loop — the invariant.** Name something true before the loop, still true after each
iteration, and which gives you the answer when the loop ends.

*Binary search:* "If the target is present, it is within \`lo..hi\`." True at the start
(the whole array). Preserved by each step (you only discard a half you have shown cannot hold
it). At the end \`lo..hi\` is one element, so checking it answers the question.

Notice that the invariant also **tells you what to do about the edge cases**. If it is not
present, the invariant is vacuously true and the final check fails correctly. You did not have
to think about the empty array separately; the argument covered it.

**For recursion — induction.** The base case is right. If every smaller call is right, the
combination step is right. Together those cover every input, because the recursion terminates.

**For a greedy choice — the exchange argument.** Take any optimal solution that disagrees with
your first choice. Show you can swap your choice in without making it worse. Then your choice
is in *some* optimal solution, and the argument repeats on what remains.

This is the only one of the three that fails often, and the next topic is built on it.

## The five questions that find most bugs

Ask them of every algorithm you write, before running it:

1. **The empty input.** Zero items, empty string, no rows.
2. **The single item.** Off-by-one and "compare with the next one" both die here.
3. **All identical.** Duplicates break two-pointer and set logic silently.
4. **The extremes.** Largest allowed n, largest allowed value, the most negative value.
5. **The adversarial order.** Already sorted, reverse sorted, alternating.

If your answer to any of these is "I think it is fine", that is the case to test first. "I
think" is the tell.

## Proving yourself wrong is cheaper than being wrong

For a greedy or a heuristic, **spend two minutes trying to break it before you spend twenty
implementing it**. Construct a small case where the obvious choice is bad. If you cannot, your
confidence is now evidence-based rather than hopeful.

A brute-force checker helps enormously here: write the obviously-correct slow version, generate
a thousand random small inputs, and compare. It finds counterexamples you would never have
imagined, and it takes ten minutes.`,
    mcqs: [
      mcq('The difference between "passes the tests" and "correct" is:',
        [['Whether the confidence comes from cases or an argument', true],
          ['How many cases were tried in total', false],
          ['Whether the edge cases were included', false],
          ['Whether the tests were written first', false]],
        'No case I thought of breaks it, against here is why no case can.'),
      mcq('A loop invariant is something that is:',
        [['True before, preserved each pass, and useful at the end', true],
          ['Unchanged by the body of the loop entirely', false],
          ['Checked at the top of each iteration', false],
          ['True only once the loop has terminated', false]],
        'All three parts matter; the third is what makes it an argument.'),
      mcq('An exchange argument shows that:',
        [['Your choice can be swapped into some optimal solution', true],
          ['No better solution exists for the input', false],
          ['The greedy choice is locally the cheapest', false],
          ['Every optimal solution makes the same choice', false]],
        'And then the argument repeats on what remains.'),
      mcq('"I think that case is fine" should be treated as:',
        [['The case to test first', true],
          ['An acceptable judgement on a rare input', false],
          ['A note for the code review to resolve', false],
          ['A sign the invariant needs restating', false]],
        '"I think" is the tell, every time.'),
    ],
    checkpoint: [
      mcq('The binary search invariant also handles the absent target because:',
        [['It is vacuously true, so the final check fails correctly', true],
          ['The loop exits before the range becomes empty', false],
          ['An extra condition covers that case', false],
          ['The search returns the nearest element instead', false]],
        'A good invariant covers edge cases without their being thought about separately.'),
      mcq('A brute-force checker is valuable because:',
        [['It finds counterexamples you would not have imagined', true],
          ['It confirms the fast version is fast enough', false],
          ['It replaces the need for an argument', false],
          ['It is easier to write than the real solution', false]],
        'A thousand random small inputs, ten minutes, and no imagination required.'),
      mcq('Which of the five questions most often breaks set-based logic?',
        [['All items identical', true],
          ['The empty input', false],
          ['A single item', false],
          ['Reverse-sorted order', false]],
        'Duplicates break two-pointer and set approaches quietly, which is the dangerous way.'),
    ],
  },

  {
    unitCode: 'T3_ALGO_DESIGN_DEBUGGING',
    notes: `Five ways an algorithm goes wrong that are not typos. Each is a reasoning failure
with a characteristic symptom.

## 1. Right algorithm, wrong precondition

    dijkstra(graph)   # graph has a -5 edge

**Symptom:** a plausible answer that is not the shortest path, on some inputs and not others.
**Cause:** Dijkstra requires non-negative weights. It does not check, and it does not complain.
**Class:** the algorithm is correct; its precondition is not met. **Fix:** assert the
precondition rather than remembering it. One line, and it converts a silent wrong answer into a
loud failure.

## 2. The greedy that is nearly right

**Symptom:** correct on every example you tried and wrong on a case you did not think of.
**Cause:** no exchange argument was made. **The giveaway:** you cannot say *why* the greedy
choice is safe, only that it seems to work. **Fix:** brute-force checker on small random inputs.
It will find the counterexample in about thirty seconds.

## 3. Off by one in a boundary

    while lo < hi:        # or <= ?
        mid = (lo + hi) // 2

**Symptom:** an infinite loop, or the last element never checked. **Cause:** the loop condition
and the update do not agree about whether the range is inclusive. **Fix:** do not fiddle with
the signs until it passes. State the invariant — "the answer is in \`lo..hi\` inclusive" — and
derive the condition from it. Guessing produces code that works on your test and not on the
next one.

## 4. Correct and too slow

**Symptom:** right answer, exceeded time limit. **Cause:** the approach was chosen without
reading the constraints. **Fix:** go back to the table. Work out what complexity the bound
allows, then choose from the approaches that fit. Optimising the wrong algorithm is the
expensive mistake here — a faster quadratic is still quadratic.

## 5. Integer overflow, and its Python-specific twin

In most languages \`(lo + hi)\` can overflow; \`lo + (hi - lo) // 2\` cannot.

Python's integers do not overflow, which removes that bug and adds another: **very large
integers get slow**, because arithmetic stops being a single machine instruction. A factorial
loop that looks O(n) is not, once the numbers are thousands of digits long. **Symptom:** a
mysterious slowdown late in a loop on big numbers.

## The two habits

**Test on the smallest failing input.** Shrink the input until the bug disappears; the last case
that fails is the one to reason about. Ten elements is debuggable and ten thousand is not.

**Print the state, not the result.** For a DP, print the table. For a greedy, print the choice
at each step and what it rejected. The result tells you it is wrong; the trace tells you where
it turned.`,
    mcqs: [
      mcq('Dijkstra on a graph with a negative edge gives:',
        [['A plausible wrong answer, with no error raised', true],
          ['An exception when the negative edge is reached', false],
          ['An infinite loop around the negative cycle', false],
          ['The correct answer more slowly than usual', false]],
        'The algorithm is correct; its precondition is not met, and it does not check.'),
      mcq('The giveaway for a nearly-right greedy is:',
        [['You cannot say why the choice is safe', true],
          ['It fails on the largest test case', false],
          ['It is slower than the DP alternative', false],
          ['It gives different answers on reruns', false]],
        'Only that it seems to work — which a brute-force checker will disprove shortly.'),
      mcq('An off-by-one in a binary search should be fixed by:',
        [['Stating the invariant and deriving the condition', true],
          ['Adjusting the comparison until tests pass', false],
          ['Switching to an inclusive upper bound', false],
          ['Adding a guard for the final element', false]],
        'Fiddling with signs produces code that works on your test and not the next one.'),
      mcq('Python integers not overflowing introduces which problem instead?',
        [['Very large integers make arithmetic slow', true],
          ['Comparisons between big integers become unreliable', false],
          ['Memory use grows faster than expected', false],
          ['Division behaves differently at large values', false]],
        'A factorial loop that looks linear is not, once the numbers are thousands of digits.'),
    ],
    checkpoint: [
      mcq('"Correct but too slow" is usually caused by:',
        [['Choosing the approach before reading the constraints', true],
          ['An inefficient inner loop in a good approach', false],
          ['A data structure with poor constant factors', false],
          ['Recursion where iteration would be cheaper', false]],
        'And optimising the wrong algorithm is the expensive mistake: a faster quadratic is still quadratic.'),
      mcq('For a DP bug, the thing worth printing is:',
        [['The table', true], ['The final answer', false],
          ['The recursion depth', false], ['The input size', false]],
        'The result says it is wrong; the state says where it turned.'),
      mcq('Asserting a precondition rather than remembering it:',
        [['Turns a silent wrong answer into a loud failure', true],
          ['Documents the requirement for the next reader', false],
          ['Prevents the algorithm from being misused', false],
          ['Costs a check on every call for safety', false]],
        'One line, and the failure mode changes from dangerous to obvious.'),
    ],
  },

  {
    unitCode: 'T3_ALGO_DESIGN_PRACTICE',
    notes: `Two problems where the **constraints choose the approach**, and where the obvious
solution is correct and too slow.

For each, before writing code: read the constraint, compute what complexity fits, and write down
what that rules out. Then solve within it.`,
    coding: [
      {
        title: 'Binary search the answer',
        description: `You have \`n\` piles of items, given as a list of sizes. You have \`h\`
hours. In one hour you may take from a single pile, removing at most \`k\` items from it — and
if the pile has fewer than k left, that still costs the whole hour.

Find the smallest \`k\` that lets you clear every pile within \`h\` hours.

**Input:** first line \`h\`, second line the pile sizes.

Sizes go up to 10⁹, so you cannot try every k by counting upwards. The bound is naming the
technique: search the **answer** rather than the input.`,
        starter: `import sys

h = int(sys.stdin.readline())
piles = [int(x) for x in sys.stdin.readline().split()]

# TODO: what is the smallest possible k? The largest? What does that range suggest?
`,
        language: 'python',
        tests: [
          { input: '8\n3 6 7 11\n', expectedOutput: '4' },
          { input: '5\n30 11 23 4 20\n', expectedOutput: '30' },
          { input: '6\n30 11 23 4 20\n', expectedOutput: '23' },
          { input: '3\n1 1 1\n', expectedOutput: '1', isHidden: true },
          { input: '1\n1000000000\n', expectedOutput: '1000000000', isHidden: true },
        ],
      },
      {
        title: 'Two pointers, because the bound says so',
        description: `A sorted list of integers and a target. Print the **count** of pairs
(i < j) whose sum is strictly less than the target.

n goes up to 10⁵. Work out what that allows before you write anything — the double loop is
correct and will not finish.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]
target = int(sys.stdin.readline())

# nums is sorted. n up to 10^5. What does that rule out, and what does it leave?
`,
        language: 'python',
        tests: [
          { input: '1 2 3 4\n5\n', expectedOutput: '2' },
          { input: '1 1 1\n2\n', expectedOutput: '0' },
          { input: '\n5\n', expectedOutput: '0' },
          { input: '-3 -1 0 2\n0\n', expectedOutput: '4', isHidden: true },
          { input: '5\n100\n', expectedOutput: '0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Algorithm Design Practice',
      description: 'Two problems whose constraints name the technique before the problem is understood.',
      instructions: `For **each** exercise, write the constraint analysis **before** your
solution:

- What is the bound on n, and on the values?
- What complexity does that allow?
- What does that rule out?
- What technique does the remaining budget suggest?

Then complete both and answer:

1. For the first: what is the search space you binary-searched over, and what is the monotone
   property that makes binary search valid on it? State the property precisely — "if k works,
   every larger k also works" is the shape you are looking for.
2. For the first: what would counting upward from k = 1 cost in the worst case? Use the actual
   bound.
3. For the second: state the invariant of your two pointers — what is true about the pair of
   indices at every step?
4. For the second: your solution relies on the list being sorted. Say exactly which step breaks
   if it is not, and what the answer becomes.
5. For either: give one input from the five correctness questions (empty, single, all identical,
   extremes, adversarial order) that your first attempt got wrong, or say honestly that none
   did.`,
      rubric: [
        { criterion: 'Constraint analysis first', description: 'Four lines per problem, written before the solution.', maxPoints: 20 },
        { criterion: 'Binary search on the answer', description: 'Correct, including the single-pile and maximum-value cases.', maxPoints: 20 },
        { criterion: 'The monotone property', description: 'Stated precisely enough to justify the search.', maxPoints: 15 },
        { criterion: 'Two pointers', description: 'Correct across empty, single, duplicate and negative inputs.', maxPoints: 20 },
        { criterion: 'The pointer invariant', description: 'What is true about the indices at every step.', maxPoints: 15 },
        { criterion: 'Where sortedness is load-bearing', description: 'Names the step that breaks and what the answer becomes.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

h = int(sys.stdin.readline())
piles = [int(x) for x in sys.stdin.readline().split()]
`,
        tests: [
          { input: '8\n3 6 7 11\n', expectedOutput: '4' },
          { input: '5\n30 11 23 4 20\n', expectedOutput: '30' },
          { input: '3\n1 1 1\n', expectedOutput: '1', isHidden: true },
          { input: '1\n1000000000\n', expectedOutput: '1000000000', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('Binary searching an answer requires the property that:',
        [['If a value works, every larger one does too', true],
          ['The answer lies within the input values', false],
          ['The input is sorted before searching', false],
          ['Each candidate is cheap to evaluate', false]],
        'Monotonicity is what makes discarding half of the range valid.'),
      mcq('Values up to 10^9 rule out counting upward because:',
        [['The loop could run 10^9 times', true],
          ['The values cannot be held in memory', false],
          ['Arithmetic becomes imprecise at that size', false],
          ['The answer may exceed the value range', false]],
        'The bound names the technique: search the answer space, not the input.'),
      mcq('The two-pointer approach on a sorted list works because:',
        [['Moving one pointer changes the sum predictably', true],
          ['Every pair is visited exactly once', false],
          ['Duplicates can be skipped in a single step', false],
          ['The list can be scanned from both ends at once', false]],
        'Which is the step that breaks the moment the list is unsorted.'),
    ],
  },

  {
    unitCode: 'T3_ALGO_DESIGN_MINI_PROJECT',
    notes: `Take one problem, solve it three ways at increasing sophistication, and prove each
one correct rather than asserting it.

The brief exists to force the **progression** — brute force, then a better approach, then the
one the constraints actually demand — because that progression is what an interviewer is
listening for and what most students skip. Jumping straight to the clever answer and getting it
slightly wrong scores worse than arriving there in three steps.

Budget around two hours. The brute-force checker is the part that makes this exercise honest.`,
    assignment: {
      title: 'Mini Project — Three Solutions and an Argument',
      description: 'Solve one problem three ways, prove each correct, and let a brute-force checker judge.',
      instructions: `**Choose one problem** from these, or one of comparable depth with your
mentor's agreement:

- **Maximum subarray sum**, with a follow-up: return the indices, and handle all-negative input.
- **Longest substring without repeating characters.**
- **Given a list of intervals, the minimum number of rooms needed** to hold all of them.

**Part one — three solutions**

1. **Brute force.** The obviously correct one. State its complexity. Do not optimise it; its job
   is to be right.
2. **A better one.** Sorting, or a data structure, or a single pass with extra state. State the
   complexity and what insight bought the improvement.
3. **The best you can.** State the complexity and say whether you believe it is optimal, and
   why. "I cannot do better" and "no better exists" are different claims — say which you mean.

**Part two — arguments, not assertions**

For solutions 2 and 3, give a correctness argument in the shape the algorithm calls for:

- A loop → the invariant: what is true before, preserved each pass, and useful at the end.
- Recursion → the induction: base case, and why the combination step preserves correctness.
- A greedy choice → the exchange argument: why your choice is in some optimal solution.

**"It passes my tests" is not an argument and scores zero for this part.**

**Part three — the checker**

Write a random-input generator and compare all three solutions on at least 1,000 small inputs.

4. Report: did they ever disagree? If so, show the smallest disagreeing input and say which was
   wrong and why.
5. If they never disagreed, say what that does and does not prove.

**Part four — the constraints**

6. Give an n at which solution 1 becomes unusable, and one at which solution 2 does. Justify
   with the arithmetic from the constraints table.
7. Time all three at a size where they all still finish. Report the numbers, and say whether
   the ratios match what the complexities predict. If they do not, say why — constants, caches,
   or your implementation.

**Submit** the three solutions, the checker, the timing numbers, and the written arguments.`,
      rubric: [
        { criterion: 'Three genuine solutions', description: 'Distinct approaches at increasing sophistication, all correct.', maxPoints: 20 },
        { criterion: 'A real argument', description: 'Invariant, induction or exchange — in the shape the algorithm needs.', maxPoints: 25 },
        { criterion: 'The checker, run', description: 'A generator, 1,000+ comparisons, and what the result proves.', maxPoints: 20 },
        { criterion: 'Disagreement handled', description: 'Smallest failing input shown, or the limits of agreement stated.', maxPoints: 10 },
        { criterion: 'Constraints arithmetic', description: 'Concrete n values where each approach dies, with the numbers.', maxPoints: 15 },
        { criterion: 'Measured against predicted', description: 'Real timings, compared with what the complexities said.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does the brief require the brute-force solution?',
        [['It is the oracle the checker judges against', true],
          ['It demonstrates the problem was understood', false],
          ['It provides a baseline for the timings', false],
          ['It is the fallback if the others fail', false]],
        'Obviously correct and slow is exactly what a checker needs.'),
      mcq('"I cannot do better" and "no better exists" differ in that:',
        [['One is about you and one is about the problem', true],
          ['One is provable and the other is not', false],
          ['One refers to time and the other to space', false],
          ['One is an upper bound, the other a constant', false]],
        'The brief asks which you mean, because students routinely claim the second.'),
      mcq('Three solutions agreeing on 1,000 random inputs proves:',
        [['No counterexample of that shape and size was generated', true],
          ['All three solutions are correct', false],
          ['The brute force is the right oracle', false],
          ['The generator covers the input space', false]],
        'Strong evidence, not a proof — which is what question 5 is asking for.'),
    ],
  },

  /* ══ T3_DIVIDE_CONQUER ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DIVIDE_CONQUER_SPLIT_UNTIL_TRIVIAL',
    notes: `One shape, three steps, and a great many algorithms:

1. **Divide** the problem into smaller versions of itself.
2. **Conquer** each by recursion, until it is small enough to be trivial.
3. **Combine** the answers.

The reason to learn it as a *shape* rather than as three algorithms is that the shape is what
transfers. Merge sort, quick sort and binary search look unrelated until you see where each one
puts its work.

## Where the work goes

**Merge sort** — split in half (trivial), sort each, then **merge** (the real work).

    def merge_sort(a):
        if len(a) <= 1:
            return a
        mid = len(a) // 2
        return merge(merge_sort(a[:mid]), merge_sort(a[mid:]))

Costs O(n log n) always. Stable. Needs O(n) extra space. It is the right answer when you cannot
tolerate a bad case, and when stability matters.

**Quick sort** — **partition** around a pivot (the real work), then sort each side, and combine
is *nothing at all*, because partitioning already put everything on the correct side.

Average O(n log n), worst O(n²) when the pivot is consistently bad — which sorted input produces
with a naive pivot, exactly like the degenerate BST. Sorts in place, and is usually faster in
practice than merge sort for the same asymptotic cost, because of memory locality.

**Notice the symmetry.** Merge sort does easy splitting and hard combining. Quick sort does hard
splitting and no combining. That is the whole difference between them, and seeing it is worth
more than memorising either.

**Binary search** — divide into two halves, and **discard one entirely**. No combining, and only
one branch is followed. That is why it is O(log n) rather than O(n): the recursion tree is a
path, not a tree.

## Recognising the shape

Ask: **can I split this into independent smaller versions of itself, and combine the answers?**

If the pieces are independent, it is divide and conquer. If they overlap — if the same
subproblem appears in more than one branch — it is dynamic programming instead, and that is the
next topic's opening line.

## Two practical notes

**The base case is not always size one.** In real sorting implementations, the recursion stops
at around sixteen elements and finishes with insertion sort, because at that size the constant
factors beat the asymptotics. Your standard library does exactly this.

**Splitting is not always in half.** Nothing requires equal halves; they just give the best
bound. An uneven split still works and costs more, and the next unit shows how much.`,
    mcqs: [
      mcq('Merge sort and quick sort differ mainly in:',
        [['Where the work goes — the split or the combine', true],
          ['Which one uses recursion to solve subproblems', false],
          ['How many pieces each one divides into', false],
          ['Whether the base case is a single element', false]],
        'Easy split and hard combine, against hard split and no combine.'),
      mcq('Binary search is O(log n) rather than O(n) because:',
        [['Only one of the two halves is followed', true],
          ['Each half is smaller than the last', false],
          ['There is no combining step to perform', false],
          ['The input is sorted before it begins', false]],
        'The recursion tree is a path, not a tree.'),
      mcq('If the subproblems overlap rather than being independent, you have:',
        [['A dynamic programming problem', true],
          ['A greedy problem in disguise', false],
          ['A divide and conquer with a bad split', false],
          ['A problem requiring memoised recursion only', false]],
        'Which is the opening line of the next topic.'),
      mcq('Real sort implementations stop recursing at about sixteen elements because:',
        [['Constant factors beat the asymptotics at that size', true],
          ['The recursion depth becomes a risk below that', false],
          ['Insertion sort is asymptotically better there', false],
          ['Smaller arrays cannot be split evenly', false]],
        'Your standard library does exactly this.'),
    ],
    checkpoint: [
      mcq('Quick sort degrades to O(n^2) when:',
        [['The pivot is consistently near an extreme', true],
          ['The input contains many duplicate values', false],
          ['The recursion is not tail-optimised', false],
          ['The array is too large to fit in cache', false]],
        'Sorted input with a naive pivot, exactly like the degenerate BST.'),
      mcq('Merge sort is preferred over quick sort when:',
        [['A bad case cannot be tolerated, or stability matters', true],
          ['Memory is tight and in-place sorting is required', false],
          ['The data is already nearly sorted', false],
          ['The values are small integers', false]],
        'It pays O(n) space for a guarantee quick sort does not give.'),
      mcq('Splitting unevenly rather than in half:',
        [['Still works, and costs more', true],
          ['Breaks the divide-and-conquer argument', false],
          ['Gives the same asymptotic bound anyway', false],
          ['Is only valid when the pieces are sorted', false]],
        'Equal halves give the best bound; nothing requires them.'),
    ],
  },

  {
    unitCode: 'T3_DIVIDE_CONQUER_THE_RECURRENCE',
    notes: `You wrote a recursive algorithm. What does it cost? Write a **recurrence** and read
the answer out of it.

## Writing one

    T(n) = a × T(n / b) + f(n)

- **a** — how many recursive calls you make.
- **b** — how much smaller each one is.
- **f(n)** — the work you do *outside* the recursion, at this level.

Three examples, written straight from the code:

- **Merge sort:** two calls, half size each, O(n) to merge → \`T(n) = 2T(n/2) + O(n)\`
- **Binary search:** one call, half size, O(1) work → \`T(n) = T(n/2) + O(1)\`
- **Naive Fibonacci:** two calls, barely smaller, O(1) work → \`T(n) = T(n-1) + T(n-2) + O(1)\`

That last one is not in the a-T(n/b) form at all, which is your first hint that it is a
different kind of expensive.

## Reading the answer without reciting the master theorem

The question is always the same: **is the work concentrated at the top of the recursion tree, at
the leaves, or spread evenly?**

Draw the tree and compare two numbers: the work at the root, and the total work across all the
leaves.

**Merge sort.** At the root you do n work. There are 2 children doing n/2 each — also n. Four
grandchildren doing n/4 — n again. The work is **the same at every level**, and there are log n
levels. So **O(n log n)**. You did not need a theorem; you needed to add up a level.

**Binary search.** One node per level, O(1) work each, log n levels. **O(log n)**.

**A tree with n leaves and constant work per node.** The leaves dominate: **O(n)**.

**The rule of thumb:** compare f(n) against n^(log_b a), which is the number of leaves.

- f(n) is **smaller** → the leaves dominate → the answer is the leaf count.
- f(n) is **the same** → every level is equal → multiply by the depth, so log n extra.
- f(n) is **bigger** → the root dominates → the answer is f(n).

That is the master theorem, and understanding it this way survives an uneven split where
reciting it does not.

## Why the unbalanced case costs more

\`T(n) = T(9n/10) + T(n/10) + O(n)\` is still O(n log n), because the depth is still
logarithmic — just with a bigger constant. But \`T(n) = T(n-1) + O(n)\` has depth **n**, so it
is O(n²). That is quick sort on sorted input, and the recurrence says so immediately.

## Using it forwards

The recurrence also tells you **what to improve**. In \`T(n) = 2T(n/2) + O(n²)\`, the combine
step dominates completely — making the recursion cleverer is wasted effort, and the only useful
work is on the combine.

That is why Karatsuba multiplication is faster: it does not speed up the combine, it reduces
**a** from 4 to 3. One fewer recursive call, and the whole exponent changes.`,
    mcqs: [
      mcq('In T(n) = aT(n/b) + f(n), what is f(n)?',
        [['The work done outside the recursive calls', true],
          ['The cost of a single recursive call', false],
          ['The total work across the whole tree', false],
          ['The depth the recursion will reach', false]],
        'The work at this level, before or after recursing.'),
      mcq('Reading T(n) = 2T(n/2) + O(n) off the tree gives n log n because:',
        [['Every level does n work, and there are log n levels', true],
          ['Each call halves the work remaining', false],
          ['The merge step is logarithmic in n', false],
          ['There are n leaves each doing log n work', false]],
        'Add up one level, then count the levels. No theorem required.'),
      mcq('T(n) = T(n-1) + O(n) is O(n^2) because:',
        [['The depth is n rather than log n', true],
          ['Each level does quadratic work', false],
          ['There are two calls at every level', false],
          ['The combine step dominates the recursion', false]],
        'That is quick sort on sorted input, and the recurrence says so at once.'),
      mcq('Karatsuba multiplication is faster because it:',
        [['Makes three recursive calls instead of four', true],
          ['Speeds up the combining step substantially', false],
          ['Splits into smaller pieces than the naive version', false],
          ['Avoids recursion below a threshold size', false]],
        'Reducing a changes the exponent; speeding the combine would not.'),
    ],
    checkpoint: [
      mcq('When f(n) is smaller than the leaf count, the answer is:',
        [['The leaf count', true], ['f(n) itself', false],
          ['f(n) times log n', false], ['The depth of the tree', false]],
        'The leaves dominate, which is the first of the three cases.'),
      mcq('T(n) = T(9n/10) + T(n/10) + O(n) is:',
        [['O(n log n), with a larger constant', true],
          ['O(n^2), because the split is uneven', false],
          ['O(n), because one side is small', false],
          ['Not solvable by this method at all', false]],
        'The depth is still logarithmic; only the constant grows.'),
      mcq('A recurrence tells you what to improve because:',
        [['It shows whether the root or the leaves dominate', true],
          ['It gives the exact operation count', false],
          ['It names the slowest line in the code', false],
          ['It bounds the recursion depth precisely', false]],
        'In 2T(n/2) + O(n^2) the combine dominates, so a cleverer recursion is wasted effort.'),
    ],
  },

  {
    unitCode: 'T3_DIVIDE_CONQUER_DEBUGGING',
    notes: `Four ways a divide-and-conquer implementation goes wrong. Three of them produce a
stack overflow, and distinguishing them matters.

## 1. The base case that is never reached

    def solve(a):
        if len(a) == 1:      # what about len(a) == 0?
            return a[0]
        mid = len(a) // 2
        return combine(solve(a[:mid]), solve(a[mid:]))

**Symptom:** RecursionError on some inputs, fine on others. **Cause:** an empty slice.
\`[1][:0]\` is \`[]\`, which never has length 1, and the recursion runs until the stack ends.
**Fix:** handle \`len(a) == 0\` explicitly. **The tell:** it works on powers of two and fails on
other sizes, which is why testing only on size 8 hides it.

## 2. The split that does not shrink

    mid = len(a) // 2
    return solve(a[:mid]), solve(a[mid:])   # for len 1: a[:0] and a[0:]

**Symptom:** immediate, unconditional RecursionError. **Cause:** one branch is the same size as
the input, so no progress is made. **Fix:** assert that both pieces are strictly smaller. That
assertion catches this class in one line.

## 3. Correct pieces, wrong combine

**Symptom:** the recursion is fine, the answer is wrong, and it is wrong in a structured way —
values present but out of order, or a count slightly off. **Cause:** the combine step.
**The way to find it:** test combine **directly**, with two hand-written sorted lists. Do not
debug through the recursion. This is bisection — you have two halves, so check the one you can
check cheaply.

## 4. Off by one at the boundary

\`a[:mid]\` and \`a[mid:]\` is correct and complete. \`a[:mid]\` with \`a[mid+1:]\` silently
drops one element per level, and on a large input the answer is quietly wrong by a lot.
**Symptom:** results that are close but not right, worse on larger inputs. **Tell:** assert the
two pieces sum to the original length. Another one-line check that removes a class.

## Three overflows, told apart

All three raise RecursionError and they are different bugs:

- **Missing base case** — fails on *some* inputs (the sizes where the empty slice appears).
- **Non-shrinking split** — fails on *every* input, immediately.
- **Legitimately deep recursion** — fails only on large input; the algorithm is correct and the
  depth is real. That one needs an iterative version or an explicit stack, not a fix.

## The habit

**Assert the loop variant.** For recursion, that means: each recursive call receives a strictly
smaller input, and the pieces reassemble to the whole. Two assertions, and three of these four
bugs become impossible.`,
    mcqs: [
      mcq('A divide and conquer that works on size 8 and fails on size 6 suggests:',
        [['A base case that empty slices never reach', true],
          ['A split that does not shrink the input', false],
          ['A combine step with an off-by-one', false],
          ['Recursion depth exceeding the limit', false]],
        'Powers of two never produce the empty slice, which is why testing on 8 hides it.'),
      mcq('An immediate RecursionError on every input means:',
        [['One branch is not smaller than the input', true],
          ['The base case handles the wrong size', false],
          ['The combine step recurses by mistake', false],
          ['The input is deeper than the stack allows', false]],
        'No progress at all, rather than progress that sometimes misses the base.'),
      mcq('The right way to debug a suspect combine step is to:',
        [['Call it directly with two hand-written halves', true],
          ['Print the input at each level of recursion', false],
          ['Reduce the input until the error disappears', false],
          ['Compare it against a library implementation', false]],
        'Bisection: you have two halves, so check the one you can check cheaply.'),
      mcq('`a[:mid]` paired with `a[mid+1:]`:',
        [['Drops one element per level, silently', true],
          ['Raises an index error on small inputs', false],
          ['Produces overlapping halves instead', false],
          ['Is correct but unbalanced for odd lengths', false]],
        'Close but wrong, and worse on larger input. Assert the lengths sum.'),
    ],
    checkpoint: [
      mcq('The RecursionError that is not a bug is:',
        [['Legitimately deep recursion on large input', true],
          ['A base case reached only on even sizes', false],
          ['A split producing one empty piece', false],
          ['A combine that recurses on its result', false]],
        'The algorithm is correct; it needs an iterative form, not a fix.'),
      mcq('Two assertions that remove most of this class are:',
        [['Each call is strictly smaller, and the pieces reassemble', true],
          ['The base case is reached, and the result is sorted', false],
          ['The depth is bounded, and the combine is correct', false],
          ['The input is non-empty, and the split is even', false]],
        'Cheap, and they make three of these four bugs impossible.'),
    ],
  },

  {
    unitCode: 'T3_DIVIDE_CONQUER_PRACTICE',
    notes: `Two problems with the divide-and-conquer shape, where the naive solution is
quadratic and the recursive one is not.

For each, write the recurrence before you write the code, and say what it predicts. Then check
whether the timing agrees.`,
    coding: [
      {
        title: 'Count the inversions',
        description: `An inversion is a pair \`(i < j)\` where \`a[i] > a[j]\` — a measure of
how unsorted a list is.

Read a list of integers and print the number of inversions.

The double loop is O(n²) and correct. The hidden case is large enough that it will not finish.
**Merge sort counts inversions for free while it merges** — work out where, and why the count is
exactly the number of elements remaining in the left half when you take from the right.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]

# T(n) = 2T(n/2) + O(n). Write down what that predicts before you write the code.
`,
        language: 'python',
        tests: [
          { input: '2 4 1 3 5\n', expectedOutput: '3' },
          { input: '1 2 3\n', expectedOutput: '0' },
          { input: '3 2 1\n', expectedOutput: '3' },
          { input: '\n', expectedOutput: '0' },
          { input: '5 5 5\n', expectedOutput: '0', isHidden: true },
          { input: '-1 -5 0 -3\n', expectedOutput: '3', isHidden: true },
        ],
      },
      {
        title: 'The k-th smallest, without sorting fully',
        description: `A list of integers and a \`k\` on the second line (1 means the smallest).

Print the k-th smallest value, or \`none\` if k is out of range.

Sorting is O(n log n) and passes. Partition-based selection is O(n) on average — the same split
as quick sort, but you only recurse into **one** side, because you know which side holds the
answer.

Write the recurrence for both and say why one loses a log factor.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]
k = int(sys.stdin.readline())

# Partition, then recurse into ONE side. What does that do to the recurrence?
`,
        language: 'python',
        tests: [
          { input: '3 1 4 1 5\n2\n', expectedOutput: '1' },
          { input: '3 1 4 1 5\n5\n', expectedOutput: '5' },
          { input: '7\n1\n', expectedOutput: '7' },
          { input: '1 2\n3\n', expectedOutput: 'none' },
          { input: '\n1\n', expectedOutput: 'none', isHidden: true },
          { input: '-2 -9 -4\n2\n', expectedOutput: '-4', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Divide and Conquer Practice',
      description: 'Inversion counting and selection, with the recurrence written before the code.',
      instructions: `For **each** exercise, write the recurrence **before** the code, and say
what it predicts.

Then answer:

1. For the first: explain precisely where in the merge the inversions are counted, and why the
   count added is the number of elements remaining in the left half. One paragraph.
2. For the first: what would the double loop cost at n = 100,000? Give the arithmetic.
3. For the second: write both recurrences — full sort against one-sided selection — and say
   which term disappears and why that removes the log factor.
4. For the second: what is the worst case for partition-based selection, what input causes it,
   and what do real implementations do about it?
5. Time both of your solutions at a size where both finish. Report the numbers and say whether
   the ratio matches what the recurrences predicted. If it does not, give a reason — constants,
   memory traffic, or your implementation.`,
      rubric: [
        { criterion: 'Recurrences first', description: 'Written before the code, with what each predicts.', maxPoints: 15 },
        { criterion: 'Inversions counted', description: 'Correct at scale, including duplicates and negatives.', maxPoints: 20 },
        { criterion: 'Where the count happens', description: 'Explains the left-half remainder, not just that it works.', maxPoints: 20 },
        { criterion: 'Selection', description: 'Correct, including out-of-range k and a single element.', maxPoints: 20 },
        { criterion: 'Which term disappears', description: 'Both recurrences written, and the log factor accounted for.', maxPoints: 15 },
        { criterion: 'Predicted against measured', description: 'Real timings, compared honestly with a reason for any gap.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]
`,
        tests: [
          { input: '2 4 1 3 5\n', expectedOutput: '3' },
          { input: '1 2 3\n', expectedOutput: '0' },
          { input: '3 2 1\n', expectedOutput: '3' },
          { input: '\n', expectedOutput: '0' },
          { input: '-1 -5 0 -3\n', expectedOutput: '3', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('Inversions are counted during a merge sort at the moment when:',
        [['An element is taken from the right half', true],
          ['An element is taken from the left half', false],
          ['The two halves are split apart', false],
          ['The recursion reaches its base case', false]],
        'Everything still in the left half is greater than it, so each is one inversion.'),
      mcq('Selection beats a full sort because it:',
        [['Recurses into only one side of the partition', true],
          ['Partitions more cheaply than quick sort does', false],
          ['Avoids comparing elements more than once', false],
          ['Stops as soon as k elements are in place', false]],
        'One call instead of two is what removes the log factor.'),
      mcq('The worst case for partition-based selection is caused by:',
        [['A consistently extreme pivot', true],
          ['Many duplicate values in the input', false],
          ['A k close to the middle of the range', false],
          ['An input already in sorted order only', false]],
        'The same failure as quick sort, and real implementations randomise or use median-of-medians.'),
    ],
  },

  {
    unitCode: 'T3_DIVIDE_CONQUER_MINI_PROJECT',
    notes: `Build a sorting library and find out where the theory stops predicting reality.

The brief is a measurement exercise disguised as an implementation exercise. Every student can
write merge sort. Very few have ever seen that their merge sort is five times slower than the
built-in one, or that insertion sort wins below forty elements, or that quick sort on sorted
input takes the time it does.

Budget around two hours, most of it measuring.`,
    assignment: {
      title: 'Mini Project — A Sorting Library, Measured',
      description: 'Implement four sorts, measure them across real input shapes, and explain every surprise.',
      instructions: `**Implement**

1. Merge sort.
2. Quick sort with a naive pivot — always the first element.
3. Quick sort with a randomised pivot.
4. A hybrid: your best sort, switching to insertion sort below a threshold you choose.

**Measure across input shapes**

At sizes 1,000 / 10,000 / 100,000, on each of:

- random
- already sorted
- reverse sorted
- all identical values
- nearly sorted (about 1% of elements out of place)

That is a table. Include your language's built-in sort as a column. **Some cells will not
finish** — say which and why rather than leaving them blank.

**Explain**

1. Which cell is the worst, and why does the recurrence predict it? Write the recurrence for
   that specific case.
2. All-identical values: what happens to each implementation and why? At least one of them
   probably surprised you.
3. Your hybrid's threshold — how did you choose it? Measure at three thresholds rather than
   picking a number you read somewhere.
4. How much slower is your best implementation than the built-in? Give the factor, and give at
   least two concrete reasons. "It is optimised" is not a reason.
5. Nearly-sorted input: which implementation benefits, and does anything get worse? Say why.

**Then, the question that matters**

6. You need to sort 10,000 records by one field, and equal records must keep their original
   order. Which of your implementations can you use, and which cannot? Name the property, and
   say how you would test for it rather than assuming.
7. Give one situation where you would write your own sort rather than use the built-in. If you
   believe there is none, argue that instead — it is a defensible answer.

**Submit** the four implementations, the full timing table, and answers to 1–7.`,
      rubric: [
        { criterion: 'Four implementations', description: 'All correct, including the deliberately naive pivot.', maxPoints: 20 },
        { criterion: 'The full table', description: 'Three sizes, five shapes, built-in included, non-finishing cells named.', maxPoints: 20 },
        { criterion: 'The worst cell explained', description: 'The specific recurrence for that case, not a general statement.', maxPoints: 15 },
        { criterion: 'All-identical explained', description: 'Per implementation, with the surprise accounted for.', maxPoints: 15 },
        { criterion: 'The threshold, measured', description: 'Three thresholds tried, not a number taken from elsewhere.', maxPoints: 10 },
        { criterion: 'The gap to the built-in', description: 'A factor and two concrete reasons.', maxPoints: 10 },
        { criterion: 'Stability', description: 'Names the property, says which sorts have it, and how to test for it.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Quick sort with a first-element pivot on sorted input gives:',
        [['Its worst case, T(n) = T(n-1) + O(n)', true],
          ['Its best case, since the data is ordered', false],
          ['The same cost as on random input', false],
          ['An immediate stack overflow on any size', false]],
        'Depth n rather than log n, which the recurrence states directly.'),
      mcq('"Equal records must keep their original order" requires:',
        [['A stable sort', true],
          ['An in-place sort', false],
          ['A comparison sort', false],
          ['A sort with a guaranteed worst case', false]],
        'Merge sort has it; quick sort as usually written does not.'),
      mcq('The brief rejects "it is optimised" as a reason because:',
        [['It names no mechanism that could be checked', true],
          ['Built-in sorts are not always faster', false],
          ['The difference is due to the language, not the sort', false],
          ['Optimisation is out of scope for the project', false]],
        'The same standard the rest of the year applies to claims: what is the evidence?'),
    ],
  },
];
