/**
 * T3_GREEDY_DP, T3_GRAPH_ALGORITHMS and T3_TIMED_PRACTICE — eleven units. Year 3.
 * Finishes S04_ADV_ALGORITHMS.
 *
 * ── WHY DP FEELS IMPOSSIBLE, AND WHAT THIS TOPIC DOES ABOUT IT ────────────────────────────
 *
 * Because it is taught table-first. A student is shown a 2D grid, told to fill it in a
 * particular order, and has no idea where the grid came from. They can reproduce the example
 * and cannot do anything else with it.
 *
 * So the order here is deliberate and non-negotiable: recursion, then the observation that a
 * subproblem repeats, then memoisation (which is one line), and only then the table — derived
 * from the recurrence rather than presented. A student who can write the recurrence has
 * already solved the problem; the table is an optimisation of something they understand.
 *
 * The greedy unit comes first because greedy is right surprisingly often and wrong silently,
 * and the exchange argument from T3_ALGO_DESIGN_ARGUING_CORRECTNESS is what tells them which.
 *
 * T3_TIMED_PRACTICE closes the module on the two things that decide an interview and are never
 * taught: narrating your reasoning while you work, and what to do in the last five minutes when
 * you have not finished.
 *
 * Attribution: T3_GREEDY_DP defaults to DSA_GREEDY with the two DP units overridden to DSA_DP.
 * T3_GRAPH_ALGORITHMS defaults to DSA_GRAPHS. T3_TIMED_PRACTICE defaults to PROBLEM_SOLVING
 * with THINKING_ALOUD overridden to TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const GREEDY_DP_BUNDLES: PilotBundle[] = [
  /* ══ T3_GREEDY_DP ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_GREEDY_DP_WHEN_GREEDY_IS_SAFE',
    notes: `A greedy algorithm takes the best-looking option at each step and never reconsiders.
It is the simplest thing you can write, it is often optimal, and when it is not optimal **it
does not tell you**. It returns a good answer confidently.

That last property is what makes greedy dangerous rather than merely limited.

## The one that works

**Interval scheduling.** Given meetings with start and end times, fit the most into one room.

Greedy rule: **always take the meeting that ends earliest** among those that still fit.

*Why it is safe — the exchange argument.* Take any optimal schedule. If it does not start with
the earliest-ending meeting, swap that meeting in for its first one. The swapped-in meeting ends
no later, so everything that fitted after still fits. The schedule is no worse and now agrees
with our first choice. Repeat on what remains.

**That argument is what makes this a proof rather than a hope**, and the shape of it — take any
optimal solution, show you can exchange your choice in without loss — is what you are looking
for every time you reach for greedy.

**Note what did *not* work.** Shortest meeting first is wrong. Earliest start is wrong. Fewest
conflicts is wrong. Only earliest end is right, and nothing about it is more obvious than the
others. The argument is the only thing that distinguishes it.

## The one that fails

**Coin change.** Make an amount with the fewest coins, always taking the largest that fits.

With coins 1, 5, 10, 25 it is optimal — for every amount. With coins **1, 3, 4** and a target of
**6**, greedy takes 4, then 1, then 1: three coins. The answer is 3 + 3: two coins.

Nothing about the second set looks unusual. **This is why "it works on my examples" is not
evidence** — the counterexample needs a coin set someone chose to break it, and you will not
think of one by trying.

## When to trust greedy

**Only with an argument.** In practice:

- You can state an exchange argument in two or three sentences, or
- You have brute-forced a thousand small random inputs against it and found no disagreement, or
- The problem is a known greedy result — interval scheduling, Huffman coding, Dijkstra,
  minimum spanning trees.

**If you have none of the three, assume it is wrong and reach for DP.**

## The cost of being wrong

A greedy is O(n log n) and a DP is often O(n²) or worse. That is a real difference and it is why
people reach for greedy. But **a fast wrong answer has no value at all**, and the failure mode
here — plausible output, no error, wrong on inputs you did not test — is the worst kind there
is.

Two minutes on an exchange argument is cheap against shipping that.`,
    mcqs: [
      mcq('Why is greedy more dangerous than merely limited?',
        [['A wrong greedy returns a plausible answer confidently', true],
          ['Greedy solutions are harder to test thoroughly', false],
          ['It is usually slower than the alternative', false],
          ['It fails only on the largest inputs', false]],
        'No error, no warning, and a good-looking result that is not optimal.'),
      mcq('Interval scheduling is solved by taking:',
        [['The meeting that ends earliest among those that fit', true],
          ['The shortest meeting available', false],
          ['The meeting that starts earliest', false],
          ['The meeting with the fewest conflicts', false]],
        'The other three are all wrong, and none of them looks less plausible.'),
      mcq('Greedy coin change with coins 1, 3, 4 and a target of 6 gives:',
        [['Three coins, when two would do', true],
          ['Two coins, which is optimal', false],
          ['Four coins, taking only ones and threes', false],
          ['The optimal answer, since 4 divides evenly', false]],
        '4 + 1 + 1 against 3 + 3. Nothing about the coin set looks unusual.'),
      mcq('With no exchange argument and no checker, you should:',
        [['Assume the greedy is wrong and use DP', true],
          ['Ship it and add tests for the known cases', false],
          ['Use greedy only on small inputs', false],
          ['Compare it against a published solution', false]],
        'A fast wrong answer has no value, and this failure mode is the worst kind.'),
    ],
    checkpoint: [
      mcq('The shape of an exchange argument is:',
        [['Swap your choice into any optimal solution without loss', true],
          ['Show your choice is the cheapest available now', false],
          ['Prove no other choice can lead to an optimum', false],
          ['Demonstrate the result matches a known bound', false]],
        'Then the argument repeats on what remains.'),
      mcq('"It works on all my examples" is weak evidence for greedy because:',
        [['A breaking case usually has to be constructed', true],
          ['Examples rarely include the largest inputs', false],
          ['Greedy fails only on adversarial orderings', false],
          ['The examples were chosen after the algorithm', false]],
        'You will not think of the 1, 3, 4 coin set by trying things.'),
      mcq('Which is a legitimate reason to trust a greedy?',
        [['It is a known result, such as Huffman coding', true],
          ['It is much faster than the DP alternative', false],
          ['The problem statement suggests a local choice', false],
          ['The input sizes make DP impractical', false]],
        'Speed is why people reach for it, never why it is correct.'),
    ],
  },

  {
    unitCode: 'T3_GREEDY_DP_OVERLAPPING_SUBPROBLEMS',
    notes: `Dynamic programming is usually taught table-first, which is why it feels impossible.
You are shown a grid, told to fill it in a particular order, and have no idea where the grid
came from.

**Nothing in this unit is a table.** The table comes last, in the next unit, derived from
something you already understand.

## Start with the recursion

Take Fibonacci, which is the smallest honest example:

    def fib(n):
        if n <= 1:
            return n
        return fib(n - 1) + fib(n - 2)

Correct. Also catastrophic — \`fib(40)\` makes about 1.6 billion calls.

**Draw three levels of the call tree and look at it.**

    fib(5) → fib(4), fib(3)
    fib(4) → fib(3), fib(2)
    fib(3) → fib(2), fib(1)

\`fib(3)\` appears twice. \`fib(2)\` appears three times. At \`fib(40)\`, \`fib(2)\` is computed
hundreds of millions of times, and it returns 1 every single time.

**That is the signal.** Not a table. Not a formula. Just: *I am solving the same subproblem
more than once.*

## The fix, which is one line

    from functools import cache

    @cache
    def fib(n):
        if n <= 1:
            return n
        return fib(n - 1) + fib(n - 2)

1.6 billion calls become 41. **The algorithm did not change.** You stopped recomputing.

**This is real dynamic programming.** Memoised recursion is not a lesser version of the table —
it is the same algorithm with the work stored in a different place, and in production it is
often the better one, because it only computes the subproblems you actually reach.

## Recognising the shape

Two conditions, and you need both:

**1. Optimal substructure.** The best answer is built from best answers to smaller versions. The
cheapest route from A to C through B contains the cheapest route from A to B — if it did not,
you would swap in the cheaper one.

**2. Overlapping subproblems.** The same smaller version comes up more than once.

**Only the second one is the difference from divide and conquer.** Merge sort has optimal
substructure and no overlap — the left half and the right half share nothing. That is why
caching would not help it, and why it is not DP.

## How to spot it without drawing the tree

- The recursion branches more than once, and the branches shrink slowly (\`n-1\` and \`n-2\`
  rather than \`n/2\`).
- The arguments to the recursive calls come from a small set. \`fib(n)\` has only n possible
  arguments, so a tree with billions of nodes has only n distinct ones.
- The problem says "the number of ways", "the minimum cost", "the longest", "the best" — over
  something built up in steps.

**"Small set of distinct arguments, enormous call tree" is the whole thing.** If both hold, cache
it and you are done.`,
    mcqs: [
      mcq('The signal for dynamic programming is:',
        [['The same subproblem being solved more than once', true],
          ['A recursion that runs too deep to finish', false],
          ['A problem asking for an optimal value', false],
          ['Two recursive calls per invocation', false]],
        'Not a table, not a formula. Just recomputation.'),
      mcq('Adding @cache to naive Fibonacci:',
        [['Leaves the algorithm the same and stops recomputation', true],
          ['Replaces the recursion with an iterative loop', false],
          ['Reduces the recursion depth substantially', false],
          ['Converts it into a closed-form calculation', false]],
        '1.6 billion calls become 41, and not one line of logic changed.'),
      mcq('What distinguishes DP from divide and conquer?',
        [['The subproblems overlap rather than being independent', true],
          ['DP problems ask for an optimum', false],
          ['Divide and conquer always splits in half', false],
          ['DP requires a table to be filled in order', false]],
        'Merge sort has optimal substructure and no overlap, so caching would not help it.'),
      mcq('"Small set of distinct arguments, enormous call tree" means:',
        [['Cache it, and you are done', true],
          ['The recursion needs an iterative rewrite', false],
          ['The problem has no optimal substructure', false],
          ['A greedy choice will probably work', false]],
        'fib(n) has n possible arguments and billions of nodes.'),
    ],
    checkpoint: [
      mcq('Memoised recursion compared with a filled table is:',
        [['The same algorithm, storing the work elsewhere', true],
          ['A teaching step on the way to the real thing', false],
          ['Slower, because of the function call overhead', false],
          ['Correct only when the subproblems are independent', false]],
        'And often better in production, since it computes only what it reaches.'),
      mcq('Optimal substructure means:',
        [['The best answer is built from best smaller answers', true],
          ['Every subproblem has exactly one solution', false],
          ['The subproblems can be solved in any order', false],
          ['The problem decomposes into equal pieces', false]],
        'Otherwise you would swap the cheaper sub-answer in, which is the argument for it.'),
      mcq('Branches shrinking by n-1 rather than n/2 suggests:',
        [['Overlap, and therefore DP', true],
          ['A badly chosen base case', false],
          ['An algorithm that will not terminate', false],
          ['A problem better solved greedily', false]],
        'Slow shrinkage with branching is what produces the repeated arguments.'),
    ],
  },

  {
    unitCode: 'T3_GREEDY_DP_RECURRENCE_THEN_TABLE',
    notes: `The recurrence comes first. Always. Writing the table first is why DP feels
impossible — you are trying to fill in a grid whose meaning you have not established.

## The procedure

**1. Define the subproblem in words, precisely.**

> \`best(i)\` = the most value obtainable considering only the first i items.

Be exact about the boundary. "The first i items" and "items up to index i" differ by one and
that difference is most of the off-by-one bugs in DP.

**2. Write the recurrence.** What is \`best(i)\` in terms of smaller calls? Usually a choice:

    best(i) = max(
        best(i - 1),                      # skip item i
        value[i] + best(i - 1 - gap[i])   # take it
    )

**3. Write the base cases.** \`best(0) = 0\`, and decide what a negative index means. Pick
"treat as 0" or "clamp to 0" and write it down, because both appear in real code and mixing them
is a bug.

**4. Memoise it.** One decorator. **You are now finished** — the algorithm is correct and fast.

**5. Only if you need to, convert to a table.**

## Converting, mechanically

The recurrence already tells you everything:

- **The subproblem's parameters are the table's dimensions.** \`best(i)\` is one-dimensional.
  \`best(i, w)\` is two.
- **The base cases are the initial values.**
- **The fill order is any order where smaller values come first.** If \`best(i)\` reads
  \`best(i-1)\`, go upwards. If it reads \`best(i+1)\`, go downwards.
- **The answer is the cell the original question asks for** — often the last one, not always.

Nothing here is creative. If you have the recurrence, the table is transcription.

## Why bother converting

**Only three reasons, and they are all specific:**

1. **Recursion depth.** A chain of 100,000 subproblems overflows the stack; a loop does not.
2. **Space.** If \`best(i)\` only reads \`best(i-1)\`, you do not need the array at all — two
   variables will do. That drops O(n) to O(1), and it is the most common DP optimisation
   there is.
3. **Constant factor.** A loop over an array beats recursion with a dictionary, sometimes
   substantially.

**If none of the three applies, keep the memoised recursion.** It is shorter, it is closer to
the recurrence you argued about, and it is much easier for the next reader to check.

## Reconstructing the choice, not just the value

Most DP is written to return "the best value" and then someone asks *which items*.

Two ways: store the decision alongside each cell as you fill, or walk the finished table
backwards asking at each step "which branch produced this number?" The second needs no extra
memory and is how most implementations do it.

**Decide which you need before you write it.** Retrofitting reconstruction onto a
space-optimised DP is unpleasant, because the two-variable optimisation throws away exactly the
information reconstruction needs. That is a real trade and it is worth stating: **the O(1) space
version cannot tell you the answer, only its value.**`,
    mcqs: [
      mcq('The first step in a DP problem is:',
        [['Defining the subproblem in precise words', true],
          ['Choosing the dimensions of the table', false],
          ['Deciding the order to fill the cells', false],
          ['Identifying the base cases', false]],
        '"The first i items" and "items up to index i" differ by one, and that is most DP bugs.'),
      mcq('Once you have memoised the recursion, you:',
        [['Are finished — it is correct and fast', true],
          ['Must convert it to a table to be complete', false],
          ['Should verify the fill order is valid', false],
          ['Need to check the subproblems do not overlap', false]],
        'The table is an optimisation, and only for three specific reasons.'),
      mcq('The table’s fill order is determined by:',
        [['Which direction the recurrence reads from', true],
          ['The number of dimensions the table has', false],
          ['Where the final answer is located', false],
          ['Whether the base cases are at the start', false]],
        'Reads best(i-1), go up. Reads best(i+1), go down. Nothing creative about it.'),
      mcq('The O(1)-space version of a one-dimensional DP:',
        [['Cannot reconstruct the choices, only the value', true],
          ['Is slower than the full-array version', false],
          ['Requires a different recurrence entirely', false],
          ['Only works when the values are positive', false]],
        'The two-variable trick throws away exactly what reconstruction needs.'),
    ],
    checkpoint: [
      mcq('Which is NOT a reason to convert memoisation to a table?',
        [['Tables are the correct form of dynamic programming', true],
          ['The recursion would overflow the stack', false],
          ['Space can drop from O(n) to O(1)', false],
          ['A loop has a better constant factor', false]],
        'If none of the three applies, keep the recursion — it is closer to the argument.'),
      mcq('Reconstructing which items were chosen is usually done by:',
        [['Walking the finished table backwards', true],
          ['Storing every partial solution as you fill', false],
          ['Re-running the recursion without the cache', false],
          ['Sorting the items by their contribution', false]],
        'No extra memory, and it is what most implementations do.'),
      mcq('The subproblem’s parameters become:',
        [['The table’s dimensions', true],
          ['The table’s initial values', false],
          ['The order the table is filled in', false],
          ['The location of the final answer', false]],
        'best(i) is one-dimensional, best(i, w) is two. Transcription, not invention.'),
    ],
  },

  {
    unitCode: 'T3_GREEDY_DP_DEBUGGING',
    notes: `Five failures across greedy and DP. The first is the most expensive mistake in this
whole module.

## 1. Greedy where DP was needed

**Symptom:** correct on every example, wrong on a case in production that nobody constructed.
**Cause:** no exchange argument was ever made. **Detection:** brute force against a thousand
random small inputs. It finds the counterexample in about thirty seconds, and no amount of
staring will.

**This is the expensive one** because it ships. The other four fail loudly during development.

## 2. The subproblem definition drifts

    # "best(i) = best using the first i items"
    return best(i - 1) + value[i]     # <-- uses item i, but i is a COUNT

**Symptom:** off by one, or an index error at the boundary. **Cause:** the definition says
"first i items" (so item i is at index i-1) and the code treats i as an index. **Fix:** write
the definition as a comment above the function and check every line against it. This is the most
common DP bug there is, and the comment genuinely prevents it.

## 3. A cache key that does not capture the state

    @cache
    def solve(i):
        return ...uses \`remaining\` from an enclosing scope...

**Symptom:** wrong answers that look almost right, and change if you reorder the calls.
**Cause:** two different states share a cache entry, because a value the answer depends on is
not in the key. **Rule:** **everything the answer depends on must be an argument.** If it
cannot be — if it is a mutable list — you cannot cache on it as it stands.

## 4. Wrong fill order

**Symptom:** cells read as zero or as garbage; the answer is consistently too small.
**Cause:** the table reads a cell that has not been written yet. **Fix:** derive the order from
the recurrence rather than guessing. And a diagnostic worth knowing: fill the table with
\`None\` rather than zero. A premature read then raises instead of silently contributing
nothing — the same principle as failing loudly.

## 5. Memoising a function that is not pure

    @cache
    def count(i):
        results.append(i)       # <-- side effect
        return ...

**Symptom:** the side effect happens the first time and not afterwards. Counts are short, logs
have gaps. **Cause:** the cache returns without running the body. **Rule:** memoise pure
functions only. If you need the side effect, separate it from the computation.

## The habit

**Print the table, or the cache.** For DP the state *is* the answer — the final number tells you
it is wrong, the table tells you which cell first went wrong, and everything downstream of that
cell is a consequence rather than a separate bug.`,
    mcqs: [
      mcq('The most expensive mistake in this module is:',
        [['Greedy where DP was needed, because it ships', true],
          ['A wrong fill order in the table', false],
          ['A cache key missing part of the state', false],
          ['Memoising a function with side effects', false]],
        'The other four fail loudly during development. This one does not.'),
      mcq('A cached function whose answer depends on an outer variable:',
        [['Shares one entry between two different states', true],
          ['Raises an error when the variable changes', false],
          ['Recomputes whenever the variable changes', false],
          ['Caches correctly, since the key is the argument', false]],
        'Everything the answer depends on must be an argument.'),
      mcq('Filling a DP table with None rather than zero:',
        [['Turns a premature read into a loud failure', true],
          ['Uses less memory than initialising to zero', false],
          ['Makes the fill order easier to derive', false],
          ['Prevents the base cases being overwritten', false]],
        'A zero contributes silently; a None raises. Fail loudly, again.'),
      mcq('A memoised function with a side effect shows:',
        [['The effect happening only on the first call', true],
          ['The effect happening on every call as normal', false],
          ['An error raised when the cache is hit', false],
          ['The cache being bypassed entirely', false]],
        'Counts come out short and logs have gaps, which is hard to trace back.'),
    ],
    checkpoint: [
      mcq('The most common DP bug is:',
        [['The subproblem definition drifting from the code', true],
          ['An incorrect base case value', false],
          ['A table with too few dimensions', false],
          ['Recursion depth exceeding the limit', false]],
        'Write the definition as a comment and check every line against it.'),
      mcq('The right way to detect a wrong greedy is:',
        [['Brute force against many random small inputs', true],
          ['Test it on the largest input available', false],
          ['Compare its output with a DP on one case', false],
          ['Check that the choice is locally optimal', false]],
        'Thirty seconds, and no amount of staring would have found it.'),
      mcq('For a DP bug, printing the table helps because:',
        [['The first wrong cell localises the fault', true],
          ['It confirms the fill order was correct', false],
          ['It shows how much memory is being used', false],
          ['It reveals which subproblems repeated', false]],
        'Everything after that cell is a consequence, not a separate bug.'),
    ],
  },

  {
    unitCode: 'T3_GREEDY_DP_PRACTICE',
    notes: `Three exercises: one where greedy is provably right, one where it is provably wrong,
and one where the recursion is obvious and the recomputation is fatal.

For the greedy one, write the exchange argument before the code. For the DP ones, write the
recurrence before the code. Both instructions are the exercise.`,
    coding: [
      {
        title: 'Greedy, and provably right',
        description: `Lines of \`start end\` — meetings, with end strictly after start. Print the
largest number that can be held in one room without overlapping. A meeting ending exactly when
another starts does not overlap.

Empty input prints \`0\`.

One greedy rule is correct here. Three plausible ones are not. Write your exchange argument
before you write the code.`,
        starter: `import sys

meetings = [tuple(int(x) for x in l.split()) for l in sys.stdin if l.split()]

# Which rule, and why is it safe? Write the argument first.
`,
        language: 'python',
        tests: [
          { input: '1 3\n2 4\n3 5\n', expectedOutput: '2' },
          { input: '0 1\n1 2\n2 3\n', expectedOutput: '3' },
          { input: '', expectedOutput: '0' },
          { input: '1 10\n2 3\n4 5\n6 7\n', expectedOutput: '3', isHidden: true },
          { input: '5 6\n', expectedOutput: '1', isHidden: true },
        ],
      },
      {
        title: 'Greedy, and provably wrong',
        description: `First line: the coin denominations. Second line: a target amount.

Print the **fewest** coins that make the target exactly, or \`-1\` if it cannot be made. Each
denomination may be used any number of times.

The largest-first greedy passes the first case and fails the second. Do not write it.`,
        starter: `import sys

coins = [int(x) for x in sys.stdin.readline().split()]
target = int(sys.stdin.readline())

# Subproblem, in words. Then the recurrence. Then memoise. Only then, if you must, a table.
`,
        language: 'python',
        tests: [
          { input: '1 5 10 25\n30\n', expectedOutput: '2' },
          { input: '1 3 4\n6\n', expectedOutput: '2' },
          { input: '5 7\n1\n', expectedOutput: '-1' },
          { input: '2\n0\n', expectedOutput: '0' },
          { input: '1 3 4\n0\n', expectedOutput: '0', isHidden: true },
          { input: '7\n49\n', expectedOutput: '7', isHidden: true },
        ],
      },
      {
        title: 'The recursion that must be cached',
        description: `A grid of costs, one row per line, values space separated. Start at the
top-left and reach the bottom-right, moving only **right** or **down**. Print the smallest total
cost of a route, counting both ends.

The recursion is three lines and obvious. Without caching it is exponential, and the hidden case
is a grid large enough to prove it.

Write the subproblem definition as a comment before you write the function.`,
        starter: `import sys
from functools import cache

grid = [[int(x) for x in l.split()] for l in sys.stdin if l.split()]

# best(r, c) = ... say it precisely, then write the recurrence.
`,
        language: 'python',
        tests: [
          { input: '1 3 1\n1 5 1\n4 2 1\n', expectedOutput: '7' },
          { input: '5\n', expectedOutput: '5' },
          { input: '1 2 3\n', expectedOutput: '6' },
          { input: '1\n2\n3\n', expectedOutput: '6', isHidden: true },
          { input: '1 2\n1 1\n', expectedOutput: '3', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Greedy and DP Practice',
      description: 'One greedy that is provably right, one that is provably wrong, and a recursion that must be cached.',
      instructions: `Complete all three. For the first write the exchange argument before the
code; for the other two write the recurrence before the code. Include both in your submission.

Then answer:

1. For the first: name two greedy rules that seem reasonable and are wrong, and give a small
   input that breaks each. Two inputs, not one.
2. For the first: write the exchange argument in three sentences. Not "it works because we take
   the earliest ending" — the actual swap.
3. For the second: give the coin set and target where largest-first fails, and say what greedy
   returns and what the answer is.
4. For the second: state the complexity of your solution in terms of the target and the number
   of denominations, and say what that means for a target of one million.
5. For the third: how many calls does the uncached recursion make on a 10×10 grid? Estimate,
   and say how you arrived at the figure.
6. For the third: could this be done in O(columns) space instead of O(rows × columns)? Say how,
   and say what you would lose.`,
      rubric: [
        { criterion: 'Scheduling, correct', description: 'The right greedy rule, correct on the nesting and empty cases.', maxPoints: 15 },
        { criterion: 'The exchange argument', description: 'Three sentences describing an actual swap, not a restatement.', maxPoints: 20 },
        { criterion: 'Two broken rules', description: 'Two plausible rules, each with a concrete counterexample.', maxPoints: 15 },
        { criterion: 'Coin change by DP', description: 'Correct including impossible targets and a target of zero.', maxPoints: 20 },
        { criterion: 'Grid path, cached', description: 'Correct, and fast enough on the large hidden grid.', maxPoints: 15 },
        { criterion: 'The space question', description: 'Says how O(columns) works and what reconstruction it costs.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

coins = [int(x) for x in sys.stdin.readline().split()]
target = int(sys.stdin.readline())
`,
        tests: [
          { input: '1 5 10 25\n30\n', expectedOutput: '2' },
          { input: '1 3 4\n6\n', expectedOutput: '2' },
          { input: '5 7\n1\n', expectedOutput: '-1' },
          { input: '2\n0\n', expectedOutput: '0' },
          { input: '7\n49\n', expectedOutput: '7', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('In interval scheduling, a meeting ending exactly when another starts:',
        [['Does not overlap, and both can be held', true],
          ['Overlaps, so only one can be held', false],
          ['Depends on which rule is being applied', false],
          ['Is excluded from the input by definition', false]],
        'A boundary the statement has to settle, and one the tests check.'),
      mcq('Coin change by DP costs, in target T and denominations d:',
        [['O(T × d)', true], ['O(T + d)', false], ['O(d log T)', false], ['O(T log d)', false]],
        'Which is why a target of one million is fine and a target of 10^12 is not.'),
      mcq('The grid path in O(columns) space works by:',
        [['Keeping only the previous row', true],
          ['Storing the route rather than the costs', false],
          ['Processing the grid diagonally', false],
          ['Caching only the cells on the best route', false]],
        'Each cell reads the one above and the one left, so one row of history suffices.'),
    ],
  },

  {
    unitCode: 'T3_GREEDY_DP_MINI_PROJECT',
    notes: `Take one optimisation problem, attack it greedily, find out whether the greedy is
right, and solve it properly either way.

The brief is built so that **you do not know at the start** whether greedy works. That is the
realistic situation and it is the one students are never put in — normally the exercise is
labelled "greedy problem" or "DP problem" and the interesting decision has been made for them.

Budget around two hours. The checker is what makes this honest.`,
    assignment: {
      title: 'Mini Project — Is Greedy Enough?',
      description: 'Attack an optimisation problem greedily, test the greedy honestly, and solve it properly.',
      instructions: `**Choose one**, or one of comparable depth with your mentor's agreement:

- **Job scheduling with deadlines and profits.** Each job takes one unit of time, has a
  deadline, and pays on completion. Maximise profit.
- **The knapsack.** Items with weights and values, one bag with a capacity. Maximise value.
- **Minimum platforms.** Given train arrival and departure times, the fewest platforms needed.

**Part one — the greedy attempt**

1. Propose a greedy rule. Say why it is plausible in one sentence.
2. Try to write an exchange argument for it. **Whether you succeed or fail, report what
   happened** — a failed attempt that shows you where the argument breaks is worth full marks.
3. Implement it.

**Part two — the honest test**

4. Write a brute-force solution. Slow and obviously correct.
5. Write a random-input generator and compare, on at least 1,000 small inputs.
6. Report: did greedy ever disagree? If yes, give the **smallest** disagreeing input and trace
   what greedy chose and what the optimum was. If no, say what that does and does not establish.

**Part three — the proper solution**

7. Whether or not greedy worked, solve it with DP:
   - The subproblem, in words.
   - The recurrence.
   - The base cases.
   - Memoised implementation.
8. Verify the DP against the brute force on the same 1,000 inputs.
9. Convert to a table. State the dimensions, the fill order, and where the answer is. Say
   whether the conversion was worth it and why.

**Part four — reconstruction and cost**

10. Return not just the best value but **which items or jobs were chosen**. Say which of the two
    reconstruction approaches you used and why.
11. State the complexity of the greedy, the brute force and the DP. Give an input size at which
    each becomes unusable.
12. If greedy turned out to be correct, say when you would still use the DP. If greedy turned
    out to be wrong, say how close it got — an average percentage across your random inputs.

**Submit** all three implementations, the checker with its output, the written argument (or the
record of it failing), and answers to 10–12.`,
      rubric: [
        { criterion: 'The greedy, attempted and argued', description: 'A rule, and an honest record of the argument succeeding or failing.', maxPoints: 20 },
        { criterion: 'A real checker', description: 'Brute force, generator, 1,000+ comparisons, result reported.', maxPoints: 20 },
        { criterion: 'The disagreement handled', description: 'Smallest failing input traced, or the limits of agreement stated.', maxPoints: 10 },
        { criterion: 'DP from the recurrence', description: 'Subproblem in words, recurrence, base cases, then code — in that order.', maxPoints: 20 },
        { criterion: 'The table conversion', description: 'Dimensions, fill order, answer cell, and whether it was worth it.', maxPoints: 10 },
        { criterion: 'Reconstruction', description: 'Returns the choices, with the approach named and justified.', maxPoints: 10 },
        { criterion: 'Costs and limits', description: 'Three complexities and a size at which each dies.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The brief withholds whether greedy works because:',
        [['Not knowing is the realistic situation', true],
          ['It makes the exercise harder to complete', false],
          ['Greedy and DP are equally likely answers', false],
          ['The choice depends on the input size', false]],
        'Normally the exercise is labelled, and the interesting decision has been made for them.'),
      mcq('A failed attempt at an exchange argument scores full marks when:',
        [['It shows precisely where the argument breaks', true],
          ['The greedy turns out to be correct anyway', false],
          ['A DP solution is provided instead', false],
          ['The attempt is documented in enough detail', false]],
        'Knowing where it breaks is knowing why greedy is unsafe here.'),
      mcq('If greedy turns out correct, the brief still asks for the DP because:',
        [['You would not have known without checking either way', true],
          ['The DP is faster on large inputs', false],
          ['The DP reconstructs the choices more easily', false],
          ['Both are required for the comparison table', false]],
        'And question 12 asks when you would still use it.'),
    ],
  },

  /* ══ T3_GRAPH_ALGORITHMS ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_GRAPH_ALGORITHMS_SHORTEST_PATH',
    notes: `BFS gives the shortest path when every step costs the same. Roads have lengths,
networks have latency, transfers have fees. **Dijkstra's algorithm** is BFS with a priority
queue instead of a queue, and that one substitution is the whole idea.

    import heapq

    def dijkstra(start, neighbours):
        dist = {start: 0}
        pq = [(0, start)]
        while pq:
            d, node = heapq.heappop(pq)
            if d > dist.get(node, float('inf')):
                continue                       # a stale entry; skip it
            for nxt, weight in neighbours(node):
                nd = d + weight
                if nd < dist.get(nxt, float('inf')):
                    dist[nxt] = nd
                    heapq.heappush(pq, (nd, nxt))
        return dist

## Why it works

**When a node comes off the priority queue, its distance is final.** Everything still in the
queue is at least that far away, and all weights are non-negative, so nothing routed through
them can arrive more cheaply. That sentence is the proof, and it is worth being able to say.

**Read it again and notice the load-bearing words: *all weights are non-negative*.**

## The precondition, and what breaks without it

With a negative edge, a node can be finalised and then a cheaper route can appear through
something processed later. Dijkstra will not revisit it. **It returns a plausible wrong answer
and raises nothing.**

This is the example the algorithm-design debugging unit used, and it is worth meeting twice: an
algorithm can be perfectly correct and still give you a wrong answer, because *you* failed its
precondition.

**Assert it.** One line at the top of the function — every weight non-negative — converts a
silent wrong answer into a loud failure.

**If you do need negative edges,** Bellman-Ford handles them at O(V×E) instead of
O((V+E) log V), and it also detects negative cycles, which Dijkstra cannot even represent. With
a negative cycle there is no shortest path at all: going round again is always cheaper.

## The stale-entry line

That \`if d > dist.get(node)\` skip is not an optimisation, it is required. When a shorter route
is found, the old entry is still sitting in the heap — removing it would be O(n). So you leave
it and ignore it on the way out. **This is exactly the cancelled-job pattern from the heaps
topic**, and it is the standard way to handle a priority queue whose keys change.

## Choosing

- **Unweighted, or all weights equal** → BFS. Simpler and faster; do not reach for Dijkstra out
  of habit.
- **Non-negative weights** → Dijkstra.
- **Negative weights** → Bellman-Ford.
- **All pairs, small graph** → Floyd-Warshall, three nested loops and O(V³), and it is worth
  knowing because the code is six lines.
- **A good estimate of remaining distance available** (a map, coordinates) → A*, which is
  Dijkstra with the estimate added to the priority. Same algorithm, better ordering.`,
    mcqs: [
      mcq('Dijkstra differs from BFS in that it uses:',
        [['A priority queue rather than a queue', true],
          ['A visited set rather than a distance map', false],
          ['Recursion rather than an explicit loop', false],
          ['An adjacency matrix rather than a list', false]],
        'One substitution, and it handles edges of differing cost.'),
      mcq('A node coming off Dijkstra’s priority queue has a final distance because:',
        [['Everything still queued is at least that far, and weights are non-negative', true],
          ['It has already been relaxed by every neighbour', false],
          ['The priority queue keeps entries sorted at all times', false],
          ['Its neighbours were all processed beforehand', false]],
        'That sentence is the proof, and the non-negativity is load-bearing.'),
      mcq('Dijkstra on a graph with a negative edge:',
        [['Returns a plausible wrong answer, silently', true],
          ['Loops forever around the negative edge', false],
          ['Raises an error when the edge is relaxed', false],
          ['Gives the correct answer more slowly', false]],
        'Correct algorithm, unmet precondition — and one assertion converts it to a loud failure.'),
      mcq('The stale-entry check in the loop is:',
        [['Required, because the old entry cannot be removed cheaply', true],
          ['An optimisation that can safely be dropped', false],
          ['Needed only when the graph has cycles', false],
          ['A guard against duplicate nodes in the input', false]],
        'The same cancelled-job pattern as the scheduler in the heaps topic.'),
    ],
    checkpoint: [
      mcq('With a negative cycle in the graph:',
        [['There is no shortest path at all', true],
          ['Dijkstra finds it but reports it wrongly', false],
          ['The shortest path is the one avoiding the cycle', false],
          ['Bellman-Ford returns the cycle as the answer', false]],
        'Going round again is always cheaper, so the question has no answer.'),
      mcq('For an unweighted graph you should use:',
        [['BFS, which is simpler and faster', true],
          ['Dijkstra, since it also handles that case', false],
          ['Bellman-Ford, for safety against surprises', false],
          ['Whichever is already implemented', false]],
        'Dijkstra works, but reaching for it out of habit costs you for nothing.'),
      mcq('A* is Dijkstra with:',
        [['An estimate of remaining distance added to the priority', true],
          ['The graph reversed and searched backwards', false],
          ['A bound on the number of nodes explored', false],
          ['A second queue for the promising nodes', false]],
        'Same algorithm, better ordering, which is why it explores far less.'),
    ],
  },

  {
    unitCode: 'T3_GRAPH_ALGORITHMS_TOPOLOGICAL_ORDER',
    notes: `"In what order can these be done?" is one of the most common real questions a graph
answers, and it is the one you will actually meet at work rather than in an interview.

A **topological order** is an ordering of the nodes where every edge points forwards: if A must
happen before B, A appears before B.

## Where you meet it

Build systems. Task runners. Course prerequisites. Spreadsheet recalculation. Database
migrations. Package installation. Module initialisation. Anything with the phrase *depends on*.

## Kahn's algorithm, which is the one to know

    in_degree = {n: 0 for n in nodes}
    for a, b in edges:
        in_degree[b] += 1

    ready = [n for n in nodes if in_degree[n] == 0]
    order = []
    while ready:
        node = ready.pop()
        order.append(node)
        for nxt in graph[node]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                ready.append(nxt)

    if len(order) != len(nodes):
        raise ValueError('cycle')

**Two reasons to prefer it over the DFS version.**

First, **cycle detection falls out for free**: if the order is shorter than the node list,
whatever is missing is in a cycle or downstream of one. No extra pass, no colours.

Second, **the \`ready\` list is the set of things that can run right now** — which is exactly
what a parallel build scheduler needs, and it is the reason real build systems are written this
way.

## Three things worth knowing

**The order is usually not unique.** Independent tasks can go in any relative order. If you need
determinism — reproducible builds, stable output, a test that can assert an exact list — make
\`ready\` a **heap** rather than a list, and you get the lexicographically smallest valid order
every time.

**A cycle means no order exists**, and the useful error is not "there is a cycle" but *which
nodes are in it*. The nodes missing from your output are the answer, and reporting them is the
difference between an error a developer can act on and one they have to investigate.

**Levels, not just an order.** If you track how many rounds each node waited, you get the
**parallel** schedule: everything at level 0 can run at once, then everything at level 1. The
number of levels is the critical path — the fastest the whole thing can possibly finish with
unlimited workers. That single number is what a build engineer actually wants.

## Cost

**O(V + E)**, one pass, and the in-degree count is a second pass over the edges. No recursion,
so no stack limit — which matters, because dependency graphs in real repositories are wide and
occasionally very deep.`,
    mcqs: [
      mcq('In Kahn’s algorithm, cycle detection comes from:',
        [['The output being shorter than the node list', true],
          ['A node whose in-degree never reaches zero being found', false],
          ['A second pass that colours the nodes', false],
          ['The ready list becoming empty too early', false]],
        'And what is missing is exactly what is in or downstream of the cycle.'),
      mcq('The `ready` list at any moment holds:',
        [['Everything that can run right now', true],
          ['The nodes with no outgoing edges', false],
          ['The nodes already placed in the order', false],
          ['The nodes on the critical path', false]],
        'Which is why real build schedulers are written this way.'),
      mcq('To get a deterministic topological order, make `ready`:',
        [['A heap, which gives the lexicographically smallest', true],
          ['A queue, so nodes leave in arrival order', false],
          ['A sorted list, re-sorted after each addition', false],
          ['A set, iterated in insertion order', false]],
        'Reproducible builds and assertable tests both need this.'),
      mcq('The number of levels in a parallel schedule is:',
        [['The critical path, and the fastest possible finish', true],
          ['The number of independent task groups', false],
          ['The longest chain of ready nodes', false],
          ['The count of nodes with zero in-degree', false]],
        'The single number a build engineer actually wants.'),
    ],
    checkpoint: [
      mcq('A useful cycle error reports:',
        [['Which nodes are in the cycle', true],
          ['That a cycle was detected', false],
          ['How many edges the cycle contains', false],
          ['Where the traversal stopped', false]],
        'The difference between an error a developer can act on and one to investigate.'),
      mcq('Kahn’s algorithm is preferred over DFS partly because:',
        [['It uses no recursion, so deep graphs are safe', true],
          ['It runs in less than linear time', false],
          ['It handles cyclic graphs correctly', false],
          ['It produces a unique ordering', false]],
        'Real dependency graphs are occasionally very deep.'),
      mcq('The topological order is usually not unique because:',
        [['Independent tasks can go in any relative order', true],
          ['The starting node can be chosen freely', false],
          ['Cycles allow several valid orderings', false],
          ['Nodes with equal in-degree are interchangeable', false]],
        'Which is why determinism has to be asked for explicitly.'),
    ],
  },

  /* ══ T3_TIMED_PRACTICE ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TIMED_PRACTICE_THINKING_ALOUD',
    notes: `In a technical interview, **the code is not the deliverable.** The interviewer is
assessing how you think, and they can only assess what you say.

Two candidates write the same correct solution. One worked silently for twenty minutes and
produced it. The other said what they were considering, why they rejected the first idea, what
the constraints ruled out, and where they were unsure. **The second gets the offer**, and this
is not a quirk of interviewing — it is the job. Engineering is mostly done in the company of
other people.

## What to say, in order

**1. Restate the problem, and name your assumptions.** "So I have a list of up to 10⁵ integers,
possibly negative, possibly with duplicates, and I need the longest run that sums to zero. Are
they sorted? Can the list be empty?"

Half of interview failures are solving the wrong problem, and this thirty seconds removes them.

**2. Say the brute force, and say its cost.** "The obvious answer is every subarray, which is
O(n²). With n at 10⁵ that is too slow, but it gives me something correct to compare against."

This is not a weak start. It establishes that you understand the problem, and it gives the
interviewer a chance to say "that's fine, go with it".

**3. Reason out loud towards something better.** "Since I need sums over ranges, prefix sums
would give me any range in constant time. And if two prefix sums are equal, the range between
them is zero. So this becomes: find two equal values in the prefix array, furthest apart. That
is a hash map, one pass."

**Notice what happened there.** The interviewer just watched a derivation. That is the entire
assessment, and it happened before any code was written.

**4. State the approach and the complexity before coding.** "One pass, O(n) time, O(n) space for
the map. Shall I code that?" A good interviewer will stop you here if it is wrong — which is a
gift, and one silence denies you.

**5. Narrate while coding, but lightly.** "Starting the map with sum zero at index minus one, so
a range beginning at the start is handled." Not every line. The decisions.

**6. Test out loud.** "Empty list gives zero. All zeros gives the whole length. No zero-sum
range gives zero. Let me trace the second one."

## The three hardest moments, scripted

**You are stuck.** Say it, with content: *"I'm stuck on how to handle duplicates. I know I need
the furthest pair, so I want the earliest index for each sum — let me think about whether that
is enough."* Stuck and talking is fine. Stuck and silent is what fails you.

**You realise you are wrong.** Say it immediately: *"Actually this breaks if all the numbers are
positive — there are no equal prefix sums. Let me check whether that matters for what I'm
computing."* Catching your own error is a strong signal. Having the interviewer catch it is a
weaker one.

**You have no idea.** Go back to the constraints. "n is up to 20, which is small enough for 2ⁿ,
so maybe this is meant to be an exhaustive search." Reading the bound out loud is a legitimate
move and it very often finds the intended approach.

## The one habit

**Silence longer than about fifteen seconds should be filled** — with what you are considering,
even if it is "I'm trying to decide whether sorting helps here". The interviewer cannot give you
credit for a thought they did not hear, and they cannot help you with a problem they cannot see.`,
    mcqs: [
      mcq('In an interview, the thing being assessed is:',
        [['How you reason, which is only visible if you say it', true],
          ['Whether the final code compiles and runs', false],
          ['How quickly you reach a working answer', false],
          ['Which algorithms you are able to recall', false]],
        'Two identical solutions, and the one that was narrated gets the offer.'),
      mcq('Starting with the brute force is good practice because:',
        [['It proves you understand the problem and gives a baseline', true],
          ['It is usually acceptable as the final answer', false],
          ['It takes less time than designing properly', false],
          ['Interviewers expect it before anything else', false]],
        'And the interviewer may simply say "that’s fine, go with it".'),
      mcq('When you realise your approach is wrong, you should:',
        [['Say so immediately and explain what broke it', true],
          ['Finish it and mention the flaw afterwards', false],
          ['Quietly adjust and continue coding', false],
          ['Ask the interviewer whether it matters', false]],
        'Catching your own error is a strong signal; being caught is a weaker one.'),
      mcq('When you have no idea at all, the reliable move is:',
        [['Read the constraints out loud', true],
          ['Ask the interviewer for a hint directly', false],
          ['Describe a similar problem you have solved', false],
          ['Start coding anything to break the silence', false]],
        '"n is 20, so 2^n is fine" very often finds the intended approach.'),
    ],
    checkpoint: [
      mcq('Restating the problem first prevents:',
        [['Solving the wrong problem entirely', true],
          ['Choosing an approach that is too slow', false],
          ['Running out of time near the end', false],
          ['Forgetting to handle the edge cases', false]],
        'Half of interview failures, removed by thirty seconds.'),
      mcq('Silence longer than about fifteen seconds is a problem because:',
        [['The interviewer can neither credit nor help your thinking', true],
          ['It suggests you do not know the answer', false],
          ['It wastes time that is strictly limited', false],
          ['It makes the interview harder to structure', false]],
        'Stuck and talking is fine; stuck and silent is what fails you.'),
      mcq('Stating the complexity before coding is valuable because:',
        [['A good interviewer will stop you if it is wrong', true],
          ['It demonstrates knowledge of the notation', false],
          ['It commits you to a particular approach', false],
          ['It saves explaining the code afterwards', false]],
        'Which is a gift, and one that silence denies you.'),
    ],
  },

  {
    unitCode: 'T3_TIMED_PRACTICE_UNDER_THE_CLOCK',
    notes: `Solving under time is a separate skill from solving. You already know this if you
have ever solved a problem in an hour that you had failed to solve in twenty minutes.

## How to spend forty-five minutes

| Minutes | What |
|---|---|
| 0–5 | Understand. Restate, ask, write two examples by hand. |
| 5–10 | Design. Brute force, complexity, better approach, complexity. |
| 10–30 | Code. |
| 30–40 | Test. Edges first, then trace one full example. |
| 40–45 | Reserve. |

**The five minutes at the start feel wasteful and are not.** Every minute spent understanding
saves several spent coding the wrong thing, and the most expensive failure in a timed setting is
twenty minutes into a wrong approach at minute thirty.

**The reserve at the end is not optional.** Something always takes longer than planned. A
candidate with nothing at minute forty-five loses to one with a working brute force.

## The decision at the halfway point

**If you have no working approach at halfway, take the brute force.**

This is the single most valuable rule here, and it is the one people break. A working O(n²) at
the end beats a half-written O(n log n), every time. A correct slow solution demonstrates you can
solve problems; an unfinished clever one demonstrates nothing at all, however good the idea was.

Say it out loud when you make the decision: *"I don't think I'll get the optimal one finished, so
I'm going to write the O(n²) and then talk about how I'd improve it."* That sentence reads as
judgement, not as failure.

## The last five minutes, unfinished

Do these in order:

1. **Make it compile and run.** Broken code scores less than working incomplete code.
2. **Say exactly where you are.** "The main loop is right. The edge case where the list is empty
   isn't handled — it would be an if at the top."
3. **Say what you would do next, concretely.** "Then I'd replace the inner scan with a hash map,
   which takes it from O(n²) to O(n)."
4. **Do not start a rewrite.** Ever. Five minutes is not enough and you lose what you had.

Points 2 and 3 recover a surprising amount. The interviewer is assessing whether you know where
you are, and knowing precisely what is unfinished is itself a demonstration of control.

## Two clock-specific errors

**Optimising early.** You have a working O(n²) at minute twenty and you want to improve it. Test
it first. A tested slow solution is worth more than an untested fast one, and the test may reveal
a bug that would have survived the optimisation.

**Debugging by fiddling.** Under time pressure the urge is to change something and rerun. That is
guessing, and it does not converge. Even at minute thirty-eight: read the code, say what you
expect each line to do, and find the one that disagrees. It is faster, and it is the same
discipline as the debugging topic.

## What to practise

**Under a real clock.** Practising untimed builds a different skill and gives you no calibration
at all. Set a timer for forty-five minutes, stop when it goes, and then — this is the part people
skip — spend ten minutes on what went wrong with the *time*, not with the problem.

Where did the minutes actually go? Did you understand too briefly? Design too long? Skip the
testing? **That review is where the improvement comes from.** Doing more problems without it
mostly builds the habits you already have.`,
    mcqs: [
      mcq('With no working approach at the halfway point, you should:',
        [['Write the brute force', true],
          ['Keep working on the better approach', false],
          ['Ask the interviewer for a hint', false],
          ['Start coding whichever part you are sure of', false]],
        'A working O(n^2) beats a half-written O(n log n), every time.'),
      mcq('The first thing to do in the last five minutes is:',
        [['Make what you have compile and run', true],
          ['Add the missing edge cases', false],
          ['Explain the approach you intended', false],
          ['Write comments describing what is missing', false]],
        'Broken code scores less than working incomplete code.'),
      mcq('With a working O(n^2) at minute twenty, you should first:',
        [['Test it', true],
          ['Optimise it', false],
          ['Explain it', false],
          ['Refactor it', false]],
        'A tested slow solution beats an untested fast one, and the test may find a real bug.'),
      mcq('The most valuable part of a timed practice session is:',
        [['The ten minutes reviewing where the time went', true],
          ['Completing the problem within the limit', false],
          ['Attempting a harder problem each time', false],
          ['Comparing your solution with a model answer', false]],
        'Doing more problems without it mostly builds the habits you already have.'),
    ],
    assignment: {
      title: 'Working Under Time',
      description: 'Four timed problems, with a review of where the minutes went rather than of the answers.',
      instructions: `**Do four problems under a real clock**, forty-five minutes each, on
separate days. Use any source — a practice site, a past paper, problems from your mentor. They
should be problems you have not seen.

**For each one, before you start**, write the time plan: 0–5 understand, 5–10 design, 10–30
code, 30–40 test, 40–45 reserve.

**For each one, during**, keep a note of the clock at each transition. Actual minutes, not
intended ones.

**For each one, afterwards**, write:

1. Did you finish? If not, exactly what was missing at the bell?
2. Where did the minutes actually go, against the plan?
3. What was the single biggest time loss? Be specific — "spent eleven minutes on an approach I
   abandoned", not "went too slowly".
4. At the halfway point, did you have a working approach? If not, did you switch to the brute
   force? If you did not switch, say what happened instead.
5. One thing to do differently next time. One, not a list.

**After all four**, write a short review:

6. Which phase are you consistently over or under on? The number, across four attempts.
7. Did your times improve across the four? If not, say what you think is actually limiting you —
   it may be problem-solving rather than time management, and saying so is a legitimate finding.
8. Record yourself thinking aloud on the fourth one. Listen back. Write three sentences on what
   the recording reveals that you did not notice at the time. Most people discover long silences
   they had no idea about.

**The attached exercise**

Do it under a clock too, as a fifth. It is deliberately one where the brute force passes the
visible cases: **the passing mark is set so that the slow solution alone is a pass.** If the
clock beats you, submit the slow one. That is the rule this unit is built on, and it applies to
its own assessment.

9. Say which solution you submitted, and at what point in the clock you decided.

**Submit** the four sets of notes, the review, your three sentences about the recording, and
your answer to 9.`,
      rubric: [
        { criterion: 'Four, under a real clock', description: 'Unseen problems, timed, with a plan written in advance each time.', maxPoints: 20 },
        { criterion: 'Actual times recorded', description: 'Clock at each transition, not intentions restated afterwards.', maxPoints: 20 },
        { criterion: 'The halfway decision', description: 'Reported honestly for each, including the times it was not taken.', maxPoints: 15 },
        { criterion: 'Specific losses', description: 'Named to the minute and the cause, not "went too slowly".', maxPoints: 15 },
        { criterion: 'A pattern across four', description: 'Identifies the phase consistently over or under, with numbers.', maxPoints: 15 },
        { criterion: 'The recording', description: 'Listened back, with three honest sentences on what it revealed.', maxPoints: 10 },
        { criterion: 'Something working at the bell', description: 'The attached exercise passes at least the visible cases, on the first submission.', maxPoints: 15 },
      ],
      totalPoints: 100,
      /**
       * The attached exercise is the halfway rule made concrete rather than an extra problem.
       *
       * Its visible cases are small enough that the O(n^2) brute force passes them, and the
       * passing mark is set so that the brute force alone is a pass. The hidden case needs the
       * linear solution for full marks. A student who runs out of time and submits the slow
       * version scores; one who leaves a half-written clever solution does not. That is the
       * unit's central claim, and it should be true of its own assessment.
       */
      coding: {
        language: 'python',
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]

# The largest sum of a non-empty run of adjacent values. Empty input prints 0.
# The O(n^2) version passes the visible cases and is worth a pass. Write that first.
`,
        tests: [
          { input: '1 -3 2 1 -1\n', expectedOutput: '3' },
          { input: '-5 -2 -9\n', expectedOutput: '-2' },
          { input: '4\n', expectedOutput: '4' },
          { input: '\n', expectedOutput: '0' },
          { input: '2 -1 2 -1 2\n', expectedOutput: '4', isHidden: true },
          { input: '-1 -1 -1 -1 5 -1 -1\n', expectedOutput: '5', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Why does the brief require the times to be recorded during, not after?',
        [['Recalled times are the plan, not what happened', true],
          ['It keeps the student aware of the clock', false],
          ['It provides evidence the work was timed', false],
          ['Transitions are hard to reconstruct later', false]],
        'People reliably report the schedule they intended to keep.'),
      mcq('Debugging by changing something and rerunning is worse under time because:',
        [['It is guessing, and guessing does not converge', true],
          ['It uses more of the remaining minutes', false],
          ['It risks breaking code that already worked', false],
          ['It looks unsystematic to an interviewer', false]],
        'Even at minute thirty-eight, reading is faster than fiddling.'),
      mcq('Concluding that problem-solving rather than time management is the limit is:',
        [['A legitimate finding the brief asks for', true],
          ['An avoidance of the real question', false],
          ['A sign the problems were too hard', false],
          ['Only valid if the times did not improve', false]],
        'Question 7 asks for it explicitly, because it is often the true answer.'),
    ],
  },

  {
    unitCode: 'T3_TIMED_PRACTICE_CHECKPOINT',
    notes: `The algorithmic core of the year, measured. Four modules sit behind this: advanced
data structures, advanced algorithms, and the design and timing habits built on top of them.

**What is being checked**

- **Structures:** trees, heaps and graphs — what each promises and what it costs.
- **Choosing:** arguing a structure from the operations, and stating its trade rather than
  naming it as best.
- **Design:** reading the constraints before the problem, and arguing correctness rather than
  asserting it.
- **Techniques:** divide and conquer, greedy with an argument, DP from a recurrence.
- **Graph algorithms:** shortest path with its precondition, and ordering with its cycle case.

**What is not being checked:** whether you can recite an implementation. Nothing here asks you
to write a red-black tree or reproduce the master theorem.

**How the result is used.** Weak skills here add revision units before the direction work opens,
and this is the last checkpoint at which that is cheap — the direction tracks assume the
algorithmic core is in place, and a gap met there is met in a harder unit with less support
around it.

**If you are not confident, the highest-value revision** is not more problems. It is the four
arguments: the exchange argument for greedy, the invariant for a loop, the recurrence for
divide and conquer, and the subproblem definition for DP. Everything else in these modules
follows from being able to state one of those.`,
    mcqs: [
      mcq('This checkpoint does NOT ask you to:',
        [['Reproduce a balanced tree implementation', true],
          ['State what a structure costs', false],
          ['Argue why an approach is correct', false],
          ['Read constraints and rule approaches out', false]],
        'You will use a library tree, not write one — the balancing unit says so directly.'),
      mcq('Why is this the last cheap point to find an algorithmic gap?',
        [['The direction tracks assume the core is in place', true],
          ['Later checkpoints are weighted more heavily', false],
          ['Revision units are unavailable after this', false],
          ['The remaining modules move faster', false]],
        'A gap met in a direction unit is met with less support around it.'),
      mcq('The highest-value revision, if you are unsure, is:',
        [['The four arguments, not more problems', true],
          ['More practice problems under the clock', false],
          ['Re-reading the complexity tables', false],
          ['Reimplementing each data structure once', false]],
        'Exchange, invariant, recurrence, subproblem definition — everything else follows.'),
    ],
    checkpoint: [
      mcq('A heap promises:',
        [['The top element, and nothing else', true],
          ['Sorted order on iteration', false],
          ['Logarithmic search for any element', false],
          ['A balanced shape after every operation', false]],
        'Every limitation of a heap follows from the one thing it guarantees.'),
      mcq('A plain BST’s O(log n) depends on:',
        [['The order the values were inserted in', true],
          ['The values being evenly distributed', false],
          ['The tree being rebalanced periodically', false],
          ['The number of values being known ahead', false]],
        'Sorted insertion produces a chain, which is the topic’s central piece of honesty.'),
      mcq('Before choosing an approach to a bounded problem, you should read:',
        [['The constraints', true],
          ['The expected output format', false],
          ['The examples given', false],
          ['The time limit alone', false]],
        'The bound rules out most approaches before the problem is understood.'),
      mcq('Dijkstra requires:',
        [['Non-negative edge weights', true],
          ['A connected graph', false],
          ['An acyclic graph', false],
          ['Integer edge weights', false]],
        'Unmet, it returns a plausible wrong answer and raises nothing.'),
      mcq('The signal that a problem needs DP is:',
        [['The same subproblem appearing more than once', true],
          ['The problem asking for an optimum', false],
          ['A recursion that is too slow to finish', false],
          ['The presence of overlapping constraints', false]],
        'Optimal substructure alone is divide and conquer; the overlap is the difference.'),
    ],
  },
];
