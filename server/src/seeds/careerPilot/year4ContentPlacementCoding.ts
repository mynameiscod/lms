/**
 * T4_PL_CODING_SETS, T4_PL_DSA_PATTERNS, T4_PL_DSA_STRUCTURES, T4_PL_DSA_ADVANCED and
 * T4_PL_COMPLEXITY — twenty-nine units. Module P15.
 *
 * ── THIS MODULE IS NOT WHERE DSA IS TAUGHT ────────────────────────────────────────────────
 *
 * Years 1 to 3 taught the structures and P03's T4_DSA_DEPTH took choosing between them to
 * interview depth. This module is a DRILL: the same knowledge, under a clock, until reaching for
 * it stops requiring thought.
 *
 * The distinction matters because it decides the unit shapes. There are almost no CONCEPT units
 * here — the topics are timed sets, interview questions and checkpoints, because what is being
 * built is speed and recognition rather than understanding. A student who does not understand
 * hashing is in the wrong module; one who understands it and takes four minutes to reach for it
 * is exactly who this is for.
 *
 * ── AND IT RUNS ALONGSIDE EVERYTHING ELSE ─────────────────────────────────────────────────
 *
 * The spec's guardrail: "placement practice is continuous, not only a final module." These topics
 * are backbone with shallow prerequisites precisely so the composer can interleave them from the
 * first week rather than stacking them at the end. A student meeting their first timed coding set
 * in week nineteen has met it too late, whatever their technical level, because drives do not
 * arrive in a convenient order.
 *
 * Attribution: T4_PL_CODING_SETS defaults to DSA_ARRAYS with the pattern unit on DSA_STRINGS and
 * hashing on DSA_HASHING; T4_PL_DSA_PATTERNS to DSA_SEARCHING with two pointers on DSA_SORTING
 * and sliding window on DSA_RECURSION; T4_PL_DSA_STRUCTURES to DSA_STACK with lists on
 * DSA_LINKED_LIST, trees on DSA_TREES and the interview question on DSA_QUEUE; T4_PL_DSA_ADVANCED
 * to DSA_GRAPHS with greedy on DSA_GREEDY and DP on DSA_DP; T4_PL_COMPLEXITY is single-skill and
 * derived.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PLACEMENT_CODING_BUNDLES: PilotBundle[] = [
  /* ══ T4_PL_CODING_SETS ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PL_CODING_SETS_READING_THE_PROBLEM',
    notes: `**Five minutes that save thirty.**

## Read the constraints first

**They name the family of acceptable solution before you have thought about the problem.**

n up to 1,000 — quadratic is fine. n up to 100,000 — it is not, and you have just eliminated the
obvious approach without writing anything.

**Most candidates read the statement, start coding, and discover this after twenty minutes.**

## What else is in the statement

**The output format, exactly.** How many lines, what separator, what to print when there is no
answer. A correct algorithm with the wrong format scores zero and feels unfair.

**The edge cases the examples hint at.** A sample containing a duplicate, or a single element, is
telling you something.

**The range of values.** Negative? Zero? Large enough to overflow in a language that overflows?

## Restate it in one sentence

**"Given a list of integers, return the two indices whose values sum to the target."**

**If you cannot, you have not understood it**, and writing code will not help. Thirty seconds
here is the cheapest debugging available.

## Work the sample by hand

**Before writing anything.** Take the given input, produce the expected output on paper, and
notice what you did. **Whatever you did is an algorithm**, and frequently it is the intended one.

**And if your hand-worked answer disagrees with the sample, you have misread the problem** — which
is the single most expensive mistake available and the one this habit prevents.

## The order, then

**Constraints. Restate. Hand-work the sample. State the approach and its cost. Then write.**

Five steps, about five minutes, and they convert most of the twenty-minute failures into
two-minute corrections.`,
    mcqs: [
      mcq('Reading the constraints before the statement is recommended because they name the family of acceptable solution:',
        [['Before you have thought about the problem', true],
         ['More precisely than the examples do', false],
         ['In a form that can be checked afterwards', false],
         ['Where the statement is ambiguous about it', false]],
        'Eliminating a whole class of approach costs thirty seconds and saves discovering after twenty minutes that it cannot pass.'),
      mcq('If your hand-worked answer disagrees with the sample, you have:',
        [['Misread the problem', true],
         ['Found an error in the sample provided', false],
         ['Chosen an approach that does not apply', false],
         ['Made an arithmetic mistake in the working', false]],
        'The sample is the specification made concrete, so a disagreement means the understanding is wrong rather than the example.'),
    ],
    checkpoint: [
      mcq('A correct algorithm with the wrong output format scores zero, which is why the statement must be read for:',
        [['How many lines and what separator', true],
         ['The complexity the author intended', false],
         ['Whether the input is already sorted', false],
         ['The time limit applied to submissions', false]],
        'Judges compare output textually, so the format is part of the answer rather than a presentational detail.'),
      mcq('Working the sample by hand before writing is valuable because whatever you did:',
        [['Is an algorithm, and frequently the intended one', true],
         ['Confirms the sample was correctly transcribed', false],
         ['Reveals which data structure is required here', false],
         ['Establishes the complexity of the approach', false]],
        'Human problem-solving is already a procedure, so making it explicit converts an unfamiliar problem into mechanising something you can do.'),
    ],
  },
  {
    unitCode: 'T4_PL_CODING_SETS_ARRAY_AND_STRING_PATTERNS',
    notes: `**The handful that cover most of a paper.**

## Frequency counting

**A dictionary from value to count**, built in one pass. Answers "which appears most", "does
anything repeat", "are these two anagrams", "can this be rearranged into a palindrome".

**It is the single most reused pattern in placement coding**, and recognising that a problem is a
counting problem is most of the solution.

## Prefix sums

**An array where position i holds the total of everything up to i.** Built once, it answers "what
is the sum between a and b" in constant time, for any number of queries.

**The signal:** repeated range queries over data that does not change.

## Two-pass

**Compute something over everything, then use it.** The average, the maximum, the total. **You
cannot know whether an early element is above average until the end**, which is why one pass is
frequently impossible and attempting it is a common source of wrong answers.

## In-place modification

**When the problem says "without extra space"**, or when the input is large enough that a copy
matters. Usually a read pointer and a write pointer moving through the same array.

## String specifics

**Strings are immutable in most languages used here**, so building one in a loop is quadratic.
**Collect into a list and join once.**

**And characters are comparable and orderable**, which is what makes sorting a string a legitimate
tool — for anagram checks particularly.

## Recognising rather than recalling

**The skill being built is looking at a problem and seeing "that is a counting problem"** within
the first minute. The implementation afterwards is mechanical, and the recognition is what the
drill is for.`,
    mcqs: [
      mcq('A prefix sum array answers a range-sum query in constant time, and the signal that it applies is:',
        [['Repeated range queries over unchanging data', true],
         ['A single sum over the whole of the array', false],
         ['Data that arrives as a stream in order', false],
         ['Values that are all positive integers', false]],
        'The construction cost is paid once, so it is worthwhile only when many queries amortise it and the underlying data does not change.'),
      mcq('One pass is frequently impossible for problems involving an average because you cannot know whether an early element is above it until:',
        [['The end', true],
         ['The list has been sorted first', false],
         ['A second variable has been introduced', false],
         ['The total is divided by the count', false]],
        'The average depends on every element, so any comparison against it must wait for all of them to have been seen.'),
    ],
    checkpoint: [
      mcq('Frequency counting is described as the single most reused pattern in placement coding, answering "which appears most", "does anything repeat", anagram checks and:',
        [['Whether it can be rearranged into a palindrome', true],
         ['Whether the list is sorted in ascending order', false],
         ['The sum of every value within a given range', false],
         ['Which element is the median of the list', false]],
        'A palindrome rearrangement depends only on how many characters have odd counts, which a frequency map answers directly.'),
      mcq('The skill the drill builds is looking at a problem and seeing "that is a counting problem" within the first minute, because the implementation afterwards is:',
        [['Mechanical', true],
         ['The part that varies most by language', false],
         ['Where most of the marks are allocated', false],
         ['Dependent on the constraints given', false]],
        'Once the pattern is recognised the code follows directly, so recognition speed rather than coding speed is what the timed practice develops.'),
    ],
  },
  {
    unitCode: 'T4_PL_CODING_SETS_HASHING_FOR_SPEED',
    notes: `**The dictionary that turns a nested loop into a single pass.**

## The substitution

    for x in items:
        if x in seen_list:    # linear scan, every time

**Quadratic.** With \`seen_list\` a set it is linear, and the change is one word.

**This single substitution is the difference between passing and timing out on more placement
problems than any other**, which is why it gets a unit rather than a mention.

## What it costs

**Memory proportional to what you store**, and it is nearly always worth it at these input sizes.

**And unordered iteration**, which matters only if you needed the order — in which case keep a
list alongside. Two structures over the same data is normal, not redundant.

## The shapes it solves

**"Have I seen this?"** A set.

**"How many times?"** A dictionary to a count.

**"Where did I see it?"** A dictionary to an index, which is what turns the two-sum problem from
quadratic into linear.

**"What pairs with what?"** A dictionary to a list, built with setdefault in one line.

## The complement trick

**Looking for two values summing to a target**: for each value, ask whether \`target - value\` has
already been seen.

**One pass, constant-time lookup**, and it generalises — to differences, to products, to any
relation where one half determines the other.

## When it is not the answer

**When you need order, ranges or the next-largest key.** Hashing destroys order, which is how it
achieves constant time, so a range query is not a hash problem however convenient it would be.`,
    mcqs: [
      mcq('Replacing a list membership test with a set inside a loop changes the cost from quadratic to linear, and the change is:',
        [['One word', true],
         ['A restructuring of the whole loop', false],
         ['Dependent on the values being hashable', false],
         ['Only worthwhile above a certain input size', false]],
        'The construction changes and the logic does not, which is what makes it the highest-value single substitution in placement coding.'),
      mcq('The complement trick asks, for each value, whether `target - value` has already been seen, and it generalises to differences, products and:',
        [['Any relation where one half determines the other', true],
         ['Problems involving three values rather than two', false],
         ['Sorted inputs where two pointers also apply', false],
         ['Cases where the values may repeat in the list', false]],
        'The requirement is that knowing one element lets you compute exactly what its partner must be, which makes the lookup possible.'),
    ],
    checkpoint: [
      mcq('A range query is not a hash problem however convenient it would be because hashing:',
        [['Destroys order, which is how it is fast', true],
         ['Cannot store more than one value per key', false],
         ['Requires keys to be numeric or short strings', false],
         ['Degrades when many keys collide together', false]],
        'Constant-time lookup comes from scattering keys, which removes any relationship between adjacent values.'),
      mcq('Keeping a list alongside a set over the same data is described as:',
        [['Normal, not redundant', true],
         ['A workaround for unordered iteration', false],
         ['Acceptable only when memory is plentiful', false],
         ['Something to avoid in timed conditions', false]],
        'Each structure answers one question at its natural cost, and the duplicated storage buys constant-time membership without losing order.'),
    ],
  },
  {
    unitCode: 'T4_PL_CODING_SETS_TIMED_SET',
    notes: `**A full set at the pace a real round runs**, so the clock is part of the practice
rather than a surprise.

## How a round actually runs

**Three problems, sixty to ninety minutes**, typically one easy, one medium, one harder.

**Partial credit exists on most platforms**, which changes the strategy entirely: a working
brute-force on the third problem is worth more than an unfinished optimal one.

## The strategy that works

**Read all three first.** Two minutes. It tells you which is easiest, and the easiest is rarely
the first.

**Solve in order of confidence**, not in the order given.

**Bank the easy one completely** — tested, edge cases, submitted — before starting the next. A
half-finished easy problem and a half-finished hard one is the worst outcome available and is what
happens without a decision.

**Budget the time.** Twenty, twenty-five, and the rest. When a budget is exceeded, move on and
come back — the thing you are stuck on rarely resolves by continuing to stare at it.

## What costs candidates the most

**Not solving fewer problems. Solving them and failing on format or edge cases.**

**Run the sample. Run the empty case. Run the single-element case.** Ninety seconds, and it
converts a near-miss into a pass.

## After the set

**Review what you could not solve**, and specifically whether it was recognition or execution. A
pattern you did not spot is a different gap from one you spotted and implemented wrongly, and the
two need different practice.

**Recording which it was, every time**, is what turns a series of timed sets into a diagnosis
rather than a score.`,
    mcqs: [
      mcq('A half-finished easy problem and a half-finished hard one is the worst outcome available, and it is what happens without:',
        [['A decision about the order', true],
         ['Sufficient knowledge of the patterns', false],
         ['More time than a round allows for', false],
         ['Practice at the relevant difficulty', false]],
        'Working problems in the order presented splits attention arbitrarily, so nothing is banked and partial credit is minimised.'),
      mcq('What costs candidates most is not solving fewer problems but:',
        [['Solving them and failing on format or edge cases', true],
         ['Choosing approaches that are too complicated', false],
         ['Spending too long reading the problem statements', false],
         ['Writing code that is difficult to debug quickly', false]],
        'A near-miss scores the same as no attempt on most judges, and ninety seconds of checking converts it into a pass.'),
    ],
    checkpoint: [
      mcq('Reviewing what you could not solve should distinguish recognition from execution because a pattern you did not spot is:',
        [['A different gap from one you implemented wrongly', true],
         ['Less serious than a coding mistake would be', false],
         ['Usually caused by insufficient reading time', false],
         ['Addressed by attempting more problems overall', false]],
        'Recognition improves by seeing more problem shapes and execution by writing more code, so conflating them wastes the practice.'),
      mcq('When a time budget for a problem is exceeded, moving on and returning is recommended because the thing you are stuck on:',
        [['Rarely resolves by continuing to stare at it', true],
         ['Becomes easier after the other problems are done', false],
         ['Is probably beyond your current ability level', false],
         ['Will be worth fewer marks than the alternatives', false]],
        'A stalled approach consumes time without progress, and the interval frequently produces the insight that sustained effort did not.'),
    ],
  },
  {
    unitCode: 'T4_PL_CODING_SETS_INTERVIEW_QUESTION',
    notes: `**"Here is a problem. Talk me through it."** The same content as a timed set, assessed
on completely different criteria.

## What changes when a person is watching

**The answer is no longer the deliverable.** The reasoning is, and a correct solution produced in
silence scores below a working one narrated clearly.

**You can ask questions**, which you cannot in a timed round. Constraints, edge cases, whether
duplicates occur. **Asking demonstrates that you know they change the answer.**

**And getting stuck is survivable**, provided it is audible.

## The sequence

**Restate.** Twenty seconds, and it catches a misreading while it is free.

**Ask about constraints.** Size, range, duplicates, ordering.

**State the brute force and its cost.** Even if you can see the better answer — it establishes a
correct baseline and shows the cost was considered.

**Say the approach before coding it.**

**Write it**, narrating at a level they can follow. Brief silences are fine; long ones are not.
"Let me think about the loop bound" costs nothing.

**Test it out loud.** The sample, then an edge case you choose. **Finding your own bug here is
among the strongest signals in the whole round.**

**State the complexity**, before being asked.

## The follow-up

**"Can you do better?"** Not a rejection — the second half of the question, and it was always
coming.

## The thing that loses rounds

**Going silent.** The interviewer cannot score what they cannot see, and four minutes of brilliant
silent thinking scores exactly the same as being stuck.`,
    mcqs: [
      mcq('A correct solution produced in silence scores below a working one narrated clearly because the deliverable is:',
        [['The reasoning rather than the answer', true],
         ['The speed at which it was produced', false],
         ['The optimality of the final approach', false],
         ['The quality of the code that was written', false]],
        'The round assesses how somebody thinks, and a silent correct answer is indistinguishable from a memorised one.'),
      mcq('Asking about constraints is possible here and not in a timed round, and doing so demonstrates that you know they:',
        [['Change the answer', true],
         ['Are frequently omitted from statements', false],
         ['Determine how long you should spend', false],
         ['Vary between different interviewers', false]],
        'Size, duplicates and ordering each rule approaches in or out, so asking shows the solution is being chosen rather than recalled.'),
    ],
    checkpoint: [
      mcq('Finding your own bug while testing out loud is among the strongest signals because it demonstrates:',
        [['The verification habit the job requires', true],
         ['That the code was written carelessly', false],
         ['Familiarity with that particular edge case', false],
         ['Thoroughness rather than speed of working', false]],
        'Nobody writes correct code first time, so catching your own mistakes before somebody else does is the behaviour being looked for.'),
      mcq('Four minutes of brilliant silent thinking scores exactly the same as being stuck because the interviewer:',
        [['Cannot score what they cannot see', true],
         ['Assumes a long pause indicates confusion', false],
         ['Has a fixed time allocation per question', false],
         ['Is required to intervene after a period', false]],
        'The entire signal in the round is visible reasoning, so thinking that produces no observable trace contributes nothing.'),
    ],
  },
  {
    unitCode: 'T4_PL_CODING_SETS_CHECKPOINT',
    notes: `**Where you actually are on timed coding, measured rather than felt.**

## What is being measured

**Recognition speed.** How long from reading a problem to knowing which pattern applies.

**Execution accuracy.** Whether the implementation is correct first time, including the edges.

**Time discipline.** Whether the budget was kept and whether banking happened.

**These are three separate skills** and a single score hides which is missing, which is why the
review after each set records them separately.

## The bar

**A standard easy problem, correct and tested, in under fifteen minutes.**

**A standard medium problem, correct, in under thirty.**

**And the output format right, every time**, because a near-miss scores the same as no attempt.

## What a weak result means

**If recognition is slow**: more problems, read rather than solved. Seeing fifty problem
statements and naming the pattern for each is faster practice than solving ten.

**If execution is wrong**: fewer problems, more carefully, with the edge cases run every time.

**If time discipline is the gap**: it is a decision rather than a skill, and it improves the
moment somebody decides to read all three first and bank the easy one.

## What this feeds

**The coding round of every drive**, and the placement simulation in P23.

**And mock 2**, which is this under interview conditions rather than exam conditions — a different
assessment of the same material, which is why both exist.`,
    checkpoint: [
      mcq('Recognition speed, execution accuracy and time discipline are measured separately because a single score:',
        [['Hides which of the three is missing', true],
         ['Overstates the candidate’s overall ability', false],
         ['Cannot be compared between different sets', false],
         ['Weights the harder problems too heavily', false]],
        'Each needs a different remedy, so an aggregate tells a student they are behind without telling them what to practise.'),
      mcq('If recognition is the gap, the recommended practice is seeing fifty problem statements and naming the pattern for each, which is faster than:',
        [['Solving ten of them fully', true],
         ['Reading editorial solutions afterwards', false],
         ['Attempting harder problems for contrast', false],
         ['Reviewing the patterns in a reference list', false]],
        'Recognition improves with exposure to problem shapes, and solving consumes the time that could have covered five times as many.'),
      mcq('Time discipline is described as a decision rather than a skill, improving the moment somebody decides to:',
        [['Read all three first and bank the easy one', true],
         ['Practise under stricter time limits', false],
         ['Attempt the problems in the order given', false],
         ['Spend less time on the initial reading', false]],
        'Nothing has to be learned — the strategy simply has to be adopted, which is why it changes immediately once chosen.'),
      mcq('Mock 2 covers the same material as this checkpoint under interview conditions rather than exam conditions, which is why:',
        [['Both exist as separate assessments', true],
         ['The checkpoint is scheduled first', false],
         ['The mock is weighted more heavily', false],
         ['Only one of them affects the plan', false]],
        'Solving alone against a clock and solving aloud with somebody watching are different capabilities, and a candidate can hold one without the other.'),
    ],
  },

  /* ══ T4_PL_DSA_PATTERNS ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PL_DSA_PATTERNS_TWO_POINTERS',
    notes: `**Walking a sorted array from both ends**, and the problems that quietly are that
problem.

## The shape

**Two indices, one at each end, moving towards each other.** At each step you compare and decide
which to move.

**It works because the data is sorted**, which means moving the left pointer can only increase the
value and moving the right can only decrease it. **That monotonicity is what makes a decision
possible without looking ahead.**

## The canonical case

**Two values summing to a target, in a sorted array.** Sum too small, move left up. Too large,
move right down. Linear, and no extra memory.

**Compare with the hash approach**, which is linear on unsorted data and uses memory. **Both are
correct and the choice depends on whether the data is already sorted** — which is a question worth
asking rather than assuming.

## The variants

**Same direction.** A slow pointer and a fast one, used for removing duplicates in place, finding a
cycle, or partitioning.

**Three pointers.** For three values summing to a target: fix one, two-pointer the rest.

**From both ends inwards on a string.** Palindrome checks, and anything comparing a prefix to a
suffix.

## The recognition signal

**"Sorted" in the statement, plus a pair or a subarray.** Or a requirement for constant extra
space, which rules out the hash approach and frequently leaves this.

## Where it goes wrong

**Forgetting the array must be sorted**, and applying it to unsorted data where the monotonicity
does not hold. The code runs and the answer is wrong, which is the worst kind of failure.`,
    mcqs: [
      mcq('The two-pointer approach works because the data is sorted, which makes:',
        [['A decision possible without looking ahead', true],
         ['The comparison cheaper at each step', false],
         ['The number of iterations predictable', false],
         ['Duplicate values easier to skip over', false]],
        'Monotonicity guarantees that moving each pointer changes the sum in a known direction, so the correct move is determined locally.'),
      mcq('Applying two pointers to unsorted data produces code that runs and:',
        [['Gives a wrong answer, which is the worst failure', true],
         ['Raises an index error partway through', false],
         ['Takes quadratic time instead of linear', false],
         ['Returns results in an unpredictable order', false]],
        'Without sorting there is no guarantee about the direction of change, so the pointers move on an invalid inference and nothing reports it.'),
    ],
    checkpoint: [
      mcq('Choosing between two pointers and a hash map for a pair-sum problem depends on whether the data is already sorted, which is:',
        [['A question worth asking rather than assuming', true],
         ['Stated in every problem that permits it', false],
         ['Irrelevant because both are linear anyway', false],
         ['Decided by the memory limit in the constraints', false]],
        'If it is sorted the pointer approach avoids the memory; if not, sorting costs n log n and the hash approach is cheaper.'),
      mcq('A requirement for constant extra space rules out the hash approach and frequently leaves:',
        [['Two pointers', true],
         ['A prefix sum array over the input', false],
         ['A frequency count of the values seen', false],
         ['Recursion with memoised subproblems', false]],
        'Two pointers use only the indices, so a space constraint that forbids auxiliary structures points directly at it.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_PATTERNS_SLIDING_WINDOW',
    notes: `**A subarray that grows and shrinks, and the invariant that decides which.**

## The shape

**Two indices marking the start and end of a window.** The end always advances; the start advances
only when the window violates a condition.

**Each element enters once and leaves once**, which is why the whole thing is linear despite the
nested appearance.

## The two kinds

**Fixed size.** "The maximum sum of any five consecutive elements." The window never changes size;
you add the new element and remove the old one.

**Variable size.** "The longest substring with no repeated character." The window grows until the
condition breaks, then shrinks from the left until it holds again.

**The second is where the thinking is**, and the invariant is the whole of it: what must be true
of the window, and what to do when it stops being true.

## What the window carries

**A running aggregate**, updated incrementally rather than recomputed. A sum, a count, a frequency
map.

**Recomputing over the window each time makes it quadratic again**, which is the most common way
this pattern is implemented wrongly — the shape is right and the cost is not.

## The recognition signal

**"Contiguous", "substring", "subarray", "consecutive"**, combined with a maximum, minimum or
count.

**Non-contiguous means this is not it**, and that distinction is worth checking in the statement
rather than assumed.

## Where it goes wrong

**Shrinking with an \`if\` where a \`while\` is needed.** One violation may require removing several
elements, and a single conditional handles only one — correct on most inputs and wrong on the ones
that matter.`,
    mcqs: [
      mcq('A sliding window is linear despite its nested appearance because each element:',
        [['Enters once and leaves once', true],
         ['Is compared against only its neighbours', false],
         ['Is visited by the outer loop a single time', false],
         ['Can be skipped when the condition holds', false]],
        'Both indices only move forward across the whole run, so the total number of moves is bounded by twice the length.'),
      mcq('Recomputing the aggregate over the window at each step makes the solution quadratic again, which is described as:',
        [['The most common way this pattern is implemented wrongly', true],
         ['A necessary cost for variable-size windows', false],
         ['Acceptable when the window stays small', false],
         ['Avoidable only by using a different pattern', false]],
        'The shape of the loop is correct and the work inside it is not, so the solution looks right and fails on the larger inputs.'),
    ],
    checkpoint: [
      mcq('Shrinking the window with an `if` where a `while` is needed is wrong because one violation:',
        [['May require removing several elements', true],
         ['Should terminate the loop immediately', false],
         ['Indicates the window size was fixed wrongly', false],
         ['Can only be resolved by restarting the window', false]],
        'A single removal may not restore the invariant, so the conditional leaves an invalid window and the error surfaces only on certain inputs.'),
      mcq('The recognition signals are "contiguous", "substring", "subarray" or "consecutive" combined with a maximum, minimum or count — and non-contiguous:',
        [['Means this is not it', true],
         ['Requires a fixed-size window instead', false],
         ['Can be handled by sorting the input first', false],
         ['Is solved with the same pattern in reverse', false]],
        'The window represents a contiguous range, so a problem permitting gaps has no valid window to maintain.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_PATTERNS_BINARY_SEARCH_BEYOND_SORTED',
    notes: `**Searching an answer space rather than a list** — the version that separates a pass
from a good pass.

## The ordinary form first

**Halving a sorted array.** Log n, and the only subtlety is the bounds: whether the range is
inclusive at both ends, and whether the loop condition is \`<\` or \`<=\`.

**Trace it on two elements.** That is the smallest input where low, high and mid can disagree, and
it is where off-by-one errors show.

## The form that appears in harder problems

**You are not searching stored data. You are searching a range of possible answers.**

"What is the smallest capacity that lets us finish in D days?" "What is the minimum largest sum if
we split into K parts?"

**The answer lies in a range, and there is a function that says whether a candidate answer
works.** If that function is monotonic — works for everything above a threshold and fails below —
**you can binary search the answers themselves.**

## The recognition signal

**"Minimum maximum", "maximum minimum", "smallest value such that"** — combined with a check you
can perform in linear time.

**That phrasing is almost diagnostic**, and spotting it converts an apparently hard problem into
two straightforward pieces: a feasibility check, and a search over it.

## The structure

**Define \`works(x)\`.** Usually a simple simulation or a greedy pass.

**Then binary search x** over the plausible range, keeping the best feasible value.

**The cost is log(range) times the cost of the check**, which is almost always fast enough.

## Where it goes wrong

**Assuming monotonicity that does not hold.** If \`works\` is true, false, then true again, binary
search finds an arbitrary point and is silently wrong — so the monotonicity is worth stating
explicitly rather than assumed.`,
    mcqs: [
      mcq('Binary searching the answer space requires that the feasibility function is monotonic, and if it is true, false, then true again the search:',
        [['Finds an arbitrary point and is silently wrong', true],
         ['Fails to terminate within the range given', false],
         ['Returns the first feasible value encountered', false],
         ['Degrades to a linear scan of the answers', false]],
        'The halving decision assumes everything above a threshold works, so a non-monotonic function invalidates each step without any error.'),
      mcq('The phrasing "minimum maximum" or "smallest value such that", combined with a linear-time check, is described as:',
        [['Almost diagnostic of this pattern', true],
         ['A sign that a greedy approach applies', false],
         ['Typical of dynamic programming problems', false],
         ['An indication the input must be sorted', false]],
        'That form asks for an optimal threshold with a testable predicate, which is exactly the structure a search over the answer space handles.'),
    ],
    checkpoint: [
      mcq('The cost of searching an answer space is log of the range multiplied by:',
        [['The cost of the feasibility check', true],
         ['The number of elements in the input', false],
         ['The width of the range being searched', false],
         ['The depth of the recursion required', false]],
        'Each halving step runs the check once, so the total is the number of steps times what one check costs.'),
      mcq('Two elements is the right size to trace an ordinary binary search because it is the smallest input where:',
        [['Low, high and mid can disagree', true],
         ['More than one iteration is required', false],
         ['The midpoint calculation can overflow', false],
         ['Both halves are guaranteed non-empty', false]],
        'With one element they coincide and no bound error can appear, so two is the first size at which an off-by-one produces a wrong result.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_PATTERNS_TIMED_SET',
    notes: `**Pattern recognition under time, which is a different skill from solving.**

## The drill

**Twelve problems, sixty minutes, and you do not write code for most of them.**

**For each: name the pattern, state the complexity, and write the three lines that matter.** Then
move on.

## Why not solve them

**Because recognition is the bottleneck and solving is not.** A student who recognises the pattern
implements it in ten minutes; one who does not spends forty minutes on an approach that cannot
pass.

**Twelve recognitions in an hour is four times the practice of three solutions**, and it targets
the skill that is actually missing.

## What to record for each

**The pattern.** **The signal in the statement that pointed to it.** **The complexity.**

**The signal is the part that transfers.** "Sorted plus a pair" means two pointers. "Contiguous
plus a maximum" means a window. "Minimum maximum" means searching the answer space. Those
associations are what get faster.

## The ones you get wrong

**More valuable than the ones you get right.** For each: what did you think it was, and what in
the statement should have told you otherwise?

**That question builds the discrimination**, which is the thing that separates somebody who knows
the patterns from somebody who can apply them under pressure.

## Then solve two

**The one you recognised fastest, and the one you got wrong.** The first confirms the recognition
was real; the second closes the gap while it is fresh.`,
    mcqs: [
      mcq('The drill does not require solving most problems because recognition is the bottleneck and:',
        [['Solving is not', true],
         ['Implementation varies too much by language', false],
         ['Time limits prevent completing that many', false],
         ['Solutions are available to read afterwards', false]],
        'A recognised pattern is implemented quickly, so practice time is better spent on the step that is slow rather than the one that is not.'),
      mcq('The part of each recognition that transfers is:',
        [['The signal in the statement that pointed to it', true],
         ['The complexity of the chosen approach', false],
         ['The name of the pattern that applies', false],
         ['The implementation sketch that was written', false]],
        'Future problems present different specifics, so what carries over is the association between a phrasing and a technique.'),
    ],
    checkpoint: [
      mcq('The problems you get wrong are more valuable, and the question to ask for each is what you thought it was and:',
        [['What in the statement should have told you otherwise', true],
         ['How the correct pattern would be implemented', false],
         ['Whether the problem was harder than average', false],
         ['How long you spent before reaching an answer', false]],
        'Locating the missed signal builds discrimination between similar-looking problems, which is what fails under pressure.'),
      mcq('Twelve recognitions in an hour is described as four times the practice of:',
        [['Three solutions', true],
         ['One full timed coding round', false],
         ['Reading the editorial for each problem', false],
         ['Reviewing a list of the common patterns', false]],
        'The comparison is against what could otherwise be solved in the same hour, and the recognition count is what the drill maximises.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_PATTERNS_INTERVIEW_QUESTION',
    notes: `**"What made you choose that approach?"**

## Why the question is asked

**Because the pattern is not the point — recognising why it applies is.** A candidate who names
the right technique and cannot say what in the problem indicated it has memorised a mapping rather
than understood one.

## The answer

**The property of the problem**, not the name of the pattern.

"The array is sorted and I need a pair, so I can move two pointers inwards and the monotonicity
tells me which to move."

**That sentence contains the signal, the technique and the reason it is valid**, and it is the
complete answer.

## The follow-ups

**"What if it were not sorted?"** Then a hash map, at the cost of memory — or sort first, at n log
n, if you need it sorted anyway.

**Having both answers ready is the marker**, because it shows the choice was between options
rather than a single recalled association.

**"What if there were duplicates?"** Frequently changes the answer, and noticing that it might is
better than confidently saying it does not.

**"Can you prove it finds the answer?"** For two pointers: moving the left one past a valid pair
would mean the pair was already checked. **An informal argument is enough** and the inability to
give one suggests the technique is being applied by pattern rather than understood.

## What loses marks

**"It is a two-pointer problem."** True, and it describes a classification rather than a decision.
The question was why, and the classification answers what.`,
    mcqs: [
      mcq('A candidate who names the right technique and cannot say what in the problem indicated it has:',
        [['Memorised a mapping rather than understood one', true],
         ['Solved fewer problems than is necessary', false],
         ['Misread the constraints in the statement', false],
         ['Chosen a correct but suboptimal approach', false]],
        'The association was recalled rather than derived, which means it will not transfer to a problem phrased differently.'),
      mcq('Having ready answers for both the sorted and unsorted cases is the marker because it shows the choice was:',
        [['Between options rather than a single association', true],
         ['Made after considering the memory constraints', false],
         ['Influenced by the size of the input given', false],
         ['Based on experience with similar problems', false]],
        'Knowing the alternative and its cost demonstrates a decision was made, where one answer suggests only one came to mind.'),
    ],
    checkpoint: [
      mcq('"It is a two-pointer problem" loses marks because it describes a classification, where the question asked:',
        [['Why, and the classification answers what', true],
         ['For the complexity of the approach', false],
         ['How the technique would be implemented', false],
         ['Whether alternatives had been considered', false]],
        'Naming the category states the conclusion without the reasoning, which is the part being assessed.'),
      mcq('An informal proof that two pointers finds the answer is enough, and the inability to give one suggests the technique is:',
        [['Being applied by pattern rather than understood', true],
         ['Unsuitable for the problem being discussed', false],
         ['Correct but implemented without the invariant', false],
         ['Beyond what the interview expects to cover', false]],
        'The argument follows directly from why the movement is valid, so not having it indicates the validity was never considered.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_PATTERNS_CHECKPOINT',
    notes: `**Whether the patterns are recognised rather than recalled.**

## The bar

**Given a problem statement, name the applicable pattern within ninety seconds**, and say what in
the statement indicated it.

**For the three in this topic**: two pointers, sliding window, and searching an answer space.

**And say what you would use instead if the key property did not hold** — unsorted, non-contiguous,
non-monotonic. That second half is what distinguishes recognition from memorisation.

## What a weak result means

**Slow recognition**: more statements read, not more problems solved. The association between a
phrasing and a technique strengthens with exposure and not with implementation.

**Wrong recognition**: the discrimination is missing. Two problems that look similar and need
different techniques, compared side by side, is the fastest correction.

**No fallback**: the pattern is known and the reason is not. That is a gap in understanding rather
than in practice, and re-reading why each technique is valid closes it.

## What this feeds

**Every coding round**, where the first two minutes decide the next thirty.

**Mock 2**, where the follow-up is always "what made you choose that".

**And P23's simulation**, where three problems arrive together and the ordering decision depends
entirely on recognising which is which.`,
    checkpoint: [
      mcq('The bar includes saying what you would use instead if the key property did not hold, and that second half distinguishes:',
        [['Recognition from memorisation', true],
         ['Speed from accuracy under pressure', false],
         ['Understanding from implementation skill', false],
         ['Preparation from natural aptitude', false]],
        'Knowing the alternative requires understanding why the first technique is valid, which a memorised association does not supply.'),
      mcq('For slow recognition, the recommended correction is reading more statements rather than solving more problems because the association strengthens with:',
        [['Exposure rather than implementation', true],
         ['Repetition of the same problem types', false],
         ['Feedback from an experienced reviewer', false],
         ['Understanding of the underlying theory', false]],
        'Each statement read is one more instance of a phrasing mapped to a technique, and solving consumes time without adding instances.'),
      mcq('For wrong recognition, the fastest correction is comparing side by side:',
        [['Two similar-looking problems needing different techniques', true],
         ['The correct and incorrect implementations', false],
         ['A statement and its published editorial', false],
         ['The complexities of the two approaches', false]],
        'The failure is discrimination between confusable cases, so placing them together makes the distinguishing signal visible.'),
      mcq('In P23’s simulation, three problems arrive together and the ordering decision depends entirely on:',
        [['Recognising which is which', true],
         ['Reading the constraints for each one', false],
         ['Estimating the time each will require', false],
         ['Starting with the shortest statement first', false]],
        'Solving in order of confidence requires knowing which is easiest, which is a recognition judgement made in the first two minutes.'),
    ],
  },

  /* ══ T4_PL_DSA_STRUCTURES ═══════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_STACKS_AND_QUEUES',
    notes: `**Matching, nesting, next-greater, and anything processed in arrival order.**

## The stack, and what it is actually for

**Last in, first out** — but the useful framing is **"the most recent unresolved thing".**

**Balanced brackets.** Every opening bracket is unresolved until its closing one arrives, and the
one that closes next is always the most recent.

**Next greater element.** Walk the array keeping a stack of indices whose answer is still unknown;
when a larger value arrives, it resolves all the smaller ones waiting. **Linear, and it looks
quadratic until you see why.**

**Undo, expression evaluation, depth-first traversal.** All the same shape: something pending that
the most recent arrival resolves.

## The queue

**First in, first out.** Breadth-first traversal, level-order processing, anything where fairness
or arrival order matters.

**The recognition signal for a queue is "level by level" or "shortest number of steps"**, which is
why breadth-first search finds shortest paths in an unweighted graph and depth-first does not.

## The monotonic stack

**A stack kept in increasing or decreasing order**, popping anything that breaks the order.

**It is the technique behind next-greater, largest rectangle, and several problems that look
unrelated**, and recognising that a problem wants "the nearest element bigger than this one" is
the signal.

## Where they go wrong

**Using a list as a queue by removing from the front.** That is linear per removal in most
languages, making the whole loop quadratic. **Use the double-ended structure the language
provides.**`,
    mcqs: [
      mcq('The useful framing of a stack is not last-in-first-out but:',
        [['The most recent unresolved thing', true],
         ['A list with restricted access points', false],
         ['A structure with constant-time insertion', false],
         ['The reverse of the processing order', false]],
        'It explains why brackets, next-greater and traversal all use one: each has items pending that the newest arrival resolves.'),
      mcq('Using a list as a queue by removing from the front makes the loop quadratic because removal from the front is:',
        [['Linear per operation in most languages', true],
         ['Unsupported without converting the structure', false],
         ['Slower only when the list is very large', false],
         ['Implemented by copying the entire list twice', false]],
        'Every remaining element shifts by one position, so n removals cost n squared in total.'),
    ],
    checkpoint: [
      mcq('The recognition signal for a queue is "level by level" or "shortest number of steps", which is why breadth-first search:',
        [['Finds shortest paths in an unweighted graph', true],
         ['Uses less memory than depth-first search does', false],
         ['Terminates earlier on most graph inputs', false],
         ['Handles cycles without needing a visited set', false]],
        'Processing in arrival order means every node at distance k is reached before any at k+1, so the first arrival is by a shortest path.'),
      mcq('A monotonic stack is kept in increasing or decreasing order, popping anything that breaks it, and the signal that it applies is a problem wanting:',
        [['The nearest element bigger than this one', true],
         ['The elements in sorted order overall', false],
         ['The count of elements above a threshold', false],
         ['The maximum value within a fixed window', false]],
        'Nearest-greater and nearest-smaller queries are exactly what the popping order resolves, which is why such problems become linear.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_LINKED_LISTS',
    notes: `**Reversal, cycle detection, and the dummy head that removes half the special
cases.**

## Why they appear in interviews at all

**Not because anybody uses them directly** — the language's list is an array in practice. **They
appear because pointer manipulation is hard to fake.** A candidate either can hold three
references in their head and reorder them correctly or cannot, and it is visible in ninety
seconds.

## The dummy head

**A node before the real head, which is discarded at the end.**

**It removes the special case where the thing you are modifying is the first element**, which is
where most linked-list bugs live. Insertion, deletion and reversal all become uniform.

**Using one is worth mentioning aloud**, because it demonstrates you have met the special case
rather than not yet reached it.

## Reversal

**Three pointers: previous, current, next.** Save the next, point current backwards, advance both.

**The order of those four lines is the whole problem**, and writing them out of order loses the
rest of the list. Trace it on two nodes.

## Cycle detection

**A slow pointer and a fast one.** If there is a cycle they meet; if not, the fast one reaches the
end.

**And the follow-up that is always asked: where does the cycle start?** Reset one pointer to the
head, advance both one step at a time, and they meet at the start. **Knowing that is expected**,
and the proof is not.

## The common failures

**Losing the rest of the list** by reassigning before saving.

**Not handling empty or single-element input.** Both are one line with a dummy head and a special
case without one.

**Off-by-one on the middle**, which differs for odd and even lengths and is worth deciding
explicitly.`,
    mcqs: [
      mcq('Linked lists appear in interviews not because they are used directly but because:',
        [['Pointer manipulation is hard to fake', true],
         ['They test knowledge of memory allocation', false],
         ['They appear frequently in real codebases', false],
         ['They are simpler than tree problems are', false]],
        'Holding several references and reordering them correctly either can be done or cannot, and it becomes visible almost immediately.'),
      mcq('A dummy head removes the special case where the thing being modified is:',
        [['The first element', true],
         ['The last element in the list', false],
         ['A node in the middle of the list', false],
         ['The only element present at all', false]],
        'Without a preceding node there is nothing to update, so head modifications need separate handling that the dummy makes unnecessary.'),
    ],
    checkpoint: [
      mcq('In reversal, saving the next node before repointing matters because reassigning first:',
        [['Loses the rest of the list', true],
         ['Creates a cycle in the structure', false],
         ['Makes the loop terminate too early', false],
         ['Reverses only the first two nodes', false]],
        'The forward reference is the only route to the remainder, so overwriting it before saving makes everything after unreachable.'),
      mcq('For finding where a cycle starts, resetting one pointer to the head and advancing both one step at a time is described as:',
        [['Expected knowledge, where the proof is not', true],
         ['An optimisation over the simpler approach', false],
         ['Necessary only when the cycle is long', false],
         ['Equivalent to using a visited set instead', false]],
        'The technique is standard enough to be assumed, while deriving why the meeting point works is not required in a placement round.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_TREES_AND_TRAVERSALS',
    notes: `**The three traversals, and when each is the one you want.**

## The three, and their uses

**In-order** — left, node, right. **On a binary search tree this produces sorted output**, which is
the defining property and the reason the structure exists.

**Pre-order** — node, left, right. Copies the structure, serialises it, and is how you write a
tree out to rebuild later.

**Post-order** — left, right, node. **Anything where the children must be handled before the
parent**: freeing, computing a size or a height, aggregating from the bottom up.

**Choosing the wrong one is the commonest tree error**, and the choice follows from whether you
need the node before, between, or after its children.

## Most tree problems are recursion problems

**Depth, size, sum, whether it is balanced, lowest common ancestor.** Each is defined in terms of
the same question asked of the subtrees.

**Write the base case first** — usually an empty node — and the recursive step follows almost
mechanically. **The difficulty is almost never the recursion; it is deciding what each call
returns.**

## Level order

**Breadth-first, with a queue.** Anything phrased "level by level", "the widest level", "the
rightmost node at each depth".

**It is the one traversal that is not naturally recursive**, and reaching for a queue is the
signal.

## The binary search tree property

**Everything left is smaller, everything right is larger** — and **it applies to the whole
subtree, not just the immediate child.** That distinction is what a validity check has to test,
and checking only parent against child is the classic wrong answer.

## Where it goes wrong

**Not handling the empty tree.** **Assuming the tree is balanced**, so a recursive solution on a
degenerate tree hits the recursion limit.`,
    mcqs: [
      mcq('Post-order is the traversal for anything where:',
        [['The children must be handled before the parent', true],
         ['The output needs to be in sorted order', false],
         ['The structure is being copied or serialised', false],
         ['Nodes are processed level by level', false]],
        'Visiting both subtrees before the node is what allows results to be aggregated upward, as in computing a height or freeing memory.'),
      mcq('Validating a binary search tree by checking only parent against child is the classic wrong answer because the property applies to:',
        [['The whole subtree, not just the immediate child', true],
         ['Every level of the tree independently', false],
         ['The in-order traversal rather than the structure', false],
         ['Balanced trees but not to degenerate ones', false]],
        'A node deep in the left subtree can exceed an ancestor while still being correctly ordered against its own parent.'),
    ],
    checkpoint: [
      mcq('In tree recursion the difficulty is almost never the recursion itself but:',
        [['Deciding what each call returns', true],
         ['Managing the depth of the call stack', false],
         ['Handling the case of duplicate values', false],
         ['Choosing between iteration and recursion', false]],
        'Once the return value is defined, the base case and the combination step follow mechanically from the problem statement.'),
      mcq('Level order is the one traversal that is not naturally recursive, and the signal to reach for it is a problem phrased:',
        [['"Level by level" or "the widest level"', true],
         ['"In sorted order" or "the kth smallest"', false],
         ['"The height" or "whether it is balanced"', false],
         ['"Copy the tree" or "serialise it"', false]],
        'Those phrasings require processing all nodes at one depth before the next, which is arrival order and therefore a queue.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_TIMED_SET',
    notes: `**The structures, under a clock, until the implementation stops needing thought.**

## The drill

**Six problems, ninety minutes.** Two stack or queue, two linked list, two tree.

**These are implementation-heavy rather than insight-heavy**, which is exactly why they are
timed: the pattern is usually obvious and the marks are lost in the writing.

## What is being drilled

**Getting the pointer manipulation right first time.** Reversal, insertion, deletion — with the
dummy head, and with the empty and single-element cases handled.

**Writing a recursive tree function without hesitating** over what the base case is.

**Reaching for the right traversal** without working it out from first principles each time.

## Where the time goes

**Not the approach — the edges.** Empty input, a single node, a tree that is a straight line, a
list with a cycle.

**Run each of those mentally before submitting.** Sixty seconds, and it is where the difference
between a near-miss and a pass sits on this topic specifically.

## After the set

**For anything that failed, record whether it was the idea or the implementation.**

**On this topic it is almost always the implementation**, which is a different remedy: write the
same three operations repeatedly until they are automatic, rather than attempting more varied
problems.

## Why implementation drilling is worth the time

**Because in an interview the implementation is watched.** Hesitating over a reversal while
somebody observes costs more than the equivalent hesitation alone, and fluency here is visible in
a way it is not for insight.`,
    mcqs: [
      mcq('These problems are implementation-heavy rather than insight-heavy, which is exactly why they are timed: the pattern is usually obvious and:',
        [['The marks are lost in the writing', true],
         ['The complexity is harder to determine', false],
         ['The edge cases are more numerous here', false],
         ['The approaches vary more between problems', false]],
        'Knowing what to do does not translate into doing it correctly under time, which is the gap the drill targets.'),
      mcq('When something fails on this topic it is almost always the implementation, and the remedy is writing the same three operations repeatedly rather than:',
        [['Attempting more varied problems', true],
         ['Reviewing the theory behind the structures', false],
         ['Practising under a stricter time limit', false],
         ['Reading solutions to harder problems', false]],
        'Fluency in a specific operation comes from repeating that operation, where variety spreads the practice across things already understood.'),
    ],
    checkpoint: [
      mcq('The edge cases to run mentally before submitting on this topic include empty input, a single node, a list with a cycle and:',
        [['A tree that is a straight line', true],
         ['A tree with duplicate values in it', false],
         ['Input larger than the stated constraint', false],
         ['A list whose values are all identical', false]],
        'A degenerate tree is the case where recursive depth equals the node count, and it breaks solutions that assume balance.'),
      mcq('Implementation fluency matters more here than elsewhere because in an interview the implementation is:',
        [['Watched', true],
         ['Weighted more heavily in the scoring', false],
         ['Usually the longest part of the answer', false],
         ['Compared against a reference solution', false]],
        'Hesitation is visible to an observer in a way it is not when working alone, so the same gap costs more in a live round.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_INTERVIEW_QUESTION',
    notes: `**"Implement this, and explain it as you go."**

## Why structures specifically get this treatment

**Because the implementation is the assessment.** For a pattern question the insight is the
answer; here the insight is usually immediate and what is being watched is whether you can write
it correctly while talking.

## The sequence

**Clarify the structure.** Singly or doubly linked? Is the tree a search tree? Are there
duplicates? **Thirty seconds, and it frequently changes the answer.**

**State the approach in one sentence** before writing.

**Write it, narrating at a level they can follow.** "I will use a dummy head so I do not need a
special case for the first node" is the kind of sentence that earns marks by itself.

**Handle the edges explicitly and say you are doing so.** Empty, single element, and — for trees —
a degenerate one.

**Then trace it on a small example, out loud.**

## The follow-ups

**"What is the complexity?"** Time and space, and for recursive solutions the stack depth counts
as space.

**"Can you do it iteratively?"** Common for tree traversals, and the answer involves an explicit
stack. **Knowing that the recursion was using the call stack all along is the point of the
question.**

**"What if the tree is very deep?"** Recursion limit. The iterative version, or tail recursion
where the language supports it.

## What loses marks

**Writing silently and presenting a finished function.** Even if correct, it has not shown the
thing being assessed.

**And not handling empty input**, which is the most frequently omitted case and the cheapest to
add.`,
    mcqs: [
      mcq('For structure questions the implementation is the assessment because the insight is usually:',
        [['Immediate, so what is watched is the writing', true],
         ['Too difficult to reach within the time', false],
         ['Provided by the interviewer as a hint', false],
         ['Identical across most of these problems', false]],
        'The approach is rarely in doubt, so the round observes whether correct code can be produced while explaining it.'),
      mcq('For a recursive solution, the stack depth counts as:',
        [['Space', true],
         ['Time, since each frame costs a step', false],
         ['Neither, as it is managed by the runtime', false],
         ['Time when the tree is unbalanced only', false]],
        'Each pending call occupies memory, so a recursion of depth n uses linear auxiliary space even with no explicit data structure.'),
    ],
    checkpoint: [
      mcq('"Can you do it iteratively?" is asked about tree traversals, and the point of the question is knowing that the recursion was:',
        [['Using the call stack all along', true],
         ['Slower than an explicit loop would be', false],
         ['Limited to balanced trees in practice', false],
         ['Easier to write but harder to read', false]],
        'The iterative version makes the implicit stack explicit, and recognising the equivalence is what the question is testing.'),
      mcq('The most frequently omitted case, and the cheapest to add, is:',
        [['Empty input', true],
         ['A single-element structure', false],
         ['Duplicate values in the input', false],
         ['A very deeply nested structure', false]],
        'It is one guard at the top of the function, and it is skipped because the interesting logic begins with at least one element.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_STRUCTURES_CHECKPOINT',
    notes: `**Whether the core structures are fluent rather than familiar.**

## The bar

**Reverse a linked list, correctly, first time, with the edges handled** — in under ten minutes,
while explaining it.

**Write any of the three tree traversals recursively without hesitating**, and one of them
iteratively.

**Recognise a stack problem or a queue problem from the statement**, and say which and why.

## Why fluency rather than knowledge

**Because all of this is known by every candidate who reaches a technical round**, and the
separation happens on execution. Two candidates who both know how reversal works are separated by
which one writes it correctly while talking.

## What a weak result means

**Almost always implementation rather than understanding**, on this topic specifically.

**The remedy is repetition of the same small set of operations**: reversal, insertion with a dummy
head, the three traversals, a level-order walk. Six operations, written until they are automatic.

**That is unfashionable advice and it is correct for this topic**, where variety does not help
because the variation is superficial.

## What this feeds

**Every coding round**, where a structure problem is near-certain.

**Mock 2**, where the implementation is watched rather than only submitted.

**And P23's coding round**, under simulation conditions with two other problems competing for the
same hour.`,
    checkpoint: [
      mcq('Two candidates who both know how reversal works are separated by:',
        [['Which one writes it correctly while talking', true],
         ['Which one uses fewer lines of code', false],
         ['Which one chooses the iterative version', false],
         ['Which one explains the complexity first', false]],
        'The knowledge is universal at this stage, so execution under observation is where the observable difference appears.'),
      mcq('The remedy for a weak result on this topic is repetition of six operations, which is described as:',
        [['Unfashionable advice that is correct here', true],
         ['A last resort when understanding is missing', false],
         ['Less effective than solving varied problems', false],
         ['Appropriate only for weaker candidates', false]],
        'Drilling a small set is out of favour generally, and it fits this topic because the variation between problems is superficial.'),
      mcq('Variety does not help on this topic because the variation between problems is:',
        [['Superficial', true],
         ['Concentrated in the edge cases only', false],
         ['Determined by the language being used', false],
         ['Greater than on the pattern-based topics', false]],
        'The same handful of manipulations underlies nearly all of them, so more problems repeat the same operations with different wrapping.'),
      mcq('In P23’s coding round, a structure problem appears under simulation conditions with:',
        [['Two other problems competing for the same hour', true],
         ['A stricter time limit than practice allows', false],
         ['An interviewer watching the implementation', false],
         ['No partial credit available for the attempt', false]],
        'The simulation presents a full round, so the structure problem must be solved while budgeting time against the other two.'),
    ],
  },

  /* ══ T4_PL_DSA_ADVANCED ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PL_DSA_ADVANCED_GRAPHS',
    notes: `**Noticing that it is one** is most of the work.

## Most graph problems are not described as graphs

**"Cities connected by roads." "Words that differ by one letter." "Tasks that depend on other
tasks." "A grid where you can move to adjacent cells."**

**All four are graphs**, and a candidate who sees that has done the hard part. The traversal
afterwards is mechanical.

## The representation

**An adjacency list**: a dictionary from node to its neighbours. Almost always the right choice at
these sizes.

**A grid is a graph without building one** — the neighbours of a cell are computed rather than
stored, which saves the construction entirely.

## The two traversals and when each

**Breadth-first, with a queue.** Shortest path in an unweighted graph, level-by-level, minimum
number of steps.

**Depth-first, with recursion or a stack.** Connectivity, cycle detection, exploring everything,
topological order.

**"Shortest" means breadth-first**, and reaching for depth-first there is a common and costly
error — it finds *a* path rather than the shortest.

## The visited set is not optional

**Without it, a cycle means infinite recursion.** Mark on entry, not on exit, or the same node is
queued several times before any of them is processed.

## Topological order

**For dependencies: which tasks can run before which.** Either depth-first with a post-order push,
or repeatedly removing nodes with no remaining dependencies.

**If it is impossible, there is a cycle**, and detecting that is frequently the actual question.

## Weighted edges

**Beyond breadth-first.** Dijkstra with a heap is the standard answer, and knowing that
breadth-first is wrong for weighted graphs is the part that matters — attempting it is a silent
wrong answer rather than a failure.`,
    mcqs: [
      mcq('Using depth-first search for a shortest-path problem is a costly error because it finds:',
        [['A path rather than the shortest one', true],
         ['No path at all in a cyclic graph', false],
         ['The longest path between the nodes', false],
         ['A path only when the graph is connected', false]],
        'Depth-first commits to one branch fully, so the first route it reaches is arbitrary with respect to length.'),
      mcq('The visited set must mark nodes on entry rather than on exit because otherwise:',
        [['The same node is queued several times', true],
         ['Cycles are reported where none exist', false],
         ['The traversal order becomes unpredictable', false],
         ['Unreachable nodes are visited incorrectly', false]],
        'A node can be enqueued by several neighbours before it is processed, so marking only at processing time duplicates work and may not terminate.'),
    ],
    checkpoint: [
      mcq('A grid is described as a graph without building one because the neighbours of a cell are:',
        [['Computed rather than stored', true],
         ['Always exactly four in number', false],
         ['Limited to cells already visited', false],
         ['Determined by the traversal order used', false]],
        'Adjacency follows from the coordinates, so no adjacency list needs constructing and the memory is saved entirely.'),
      mcq('For weighted graphs, the part that matters is knowing that breadth-first is wrong, because attempting it is:',
        [['A silent wrong answer rather than a failure', true],
         ['Substantially slower than the alternative', false],
         ['Correct only when all weights are equal', false],
         ['Impossible to implement with a plain queue', false]],
        'The traversal completes and returns a path whose total weight is not minimal, with nothing indicating the result is wrong.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_ADVANCED_GREEDY',
    notes: `**When a local choice is provably safe**, and the far more common case where it is
not.

## What greedy means

**Take the best option available now, and never reconsider.**

**It is fast and simple and frequently wrong**, which is the difficulty: a greedy solution that
fails does so on particular inputs, passes the samples, and looks correct.

## When it works

**When the locally optimal choice is provably part of some optimal solution.**

**Interval scheduling**: to fit the most non-overlapping meetings, always take the one that ends
earliest. **Provable** — the earliest-ending choice leaves the most room for everything after it.

**Coin change with standard denominations**: take the largest coin that fits. **Provable for those
denominations and false in general**, which is the classic demonstration that greedy correctness
depends on the specifics.

## The test before trusting it

**Can you argue that taking the greedy choice never rules out a better overall answer?**

**An informal argument is enough**, and the inability to construct one is the signal to reach for
dynamic programming instead.

## The counter-example habit

**Before submitting a greedy solution, spend sixty seconds trying to break it.** Small inputs,
adversarially chosen.

**If you cannot break it in a minute it is probably fine; if you can, you have saved a wrong
submission** — and this is a cheaper check than any amount of re-reading.

## The common shapes

**Sort, then take in order.** Most greedy solutions are this, and **the sort key is the entire
decision** — by end time, by ratio, by deadline. Choosing it wrongly produces a plausible wrong
answer.

## In an interview

**Say it is greedy, and say why it is safe.** Proposing one without justification invites exactly
the counter-example you did not look for.`,
    mcqs: [
      mcq('A greedy solution that fails does so on particular inputs, passes the samples, and:',
        [['Looks correct', true],
         ['Runs more slowly than expected', false],
         ['Raises an error on the failing case', false],
         ['Produces no output for those inputs', false]],
        'The approach is plausible and the code is sound, so nothing distinguishes it from a correct solution except the inputs where it is wrong.'),
      mcq('Coin change with standard denominations is provable for those denominations and false in general, which demonstrates that greedy correctness:',
        [['Depends on the specifics of the problem', true],
         ['Requires the input to be sorted first', false],
         ['Holds whenever the choices are independent', false],
         ['Can be established by testing enough cases', false]],
        'The same algorithm is optimal for one coin system and suboptimal for another, so the justification must be about the particular instance.'),
    ],
    checkpoint: [
      mcq('The inability to construct an informal argument that the greedy choice never rules out a better answer is the signal to:',
        [['Reach for dynamic programming instead', true],
         ['Test the solution on more sample inputs', false],
         ['Simplify the greedy choice being made', false],
         ['Sort the input by a different key', false]],
        'Where a local decision cannot be shown safe, the alternative is considering the consequences of each choice, which is what DP does.'),
      mcq('Most greedy solutions are "sort, then take in order", which makes the sort key:',
        [['The entire decision', true],
         ['A performance consideration only', false],
         ['Less important than the selection rule', false],
         ['Interchangeable between valid approaches', false]],
        'The ordering determines which choices are taken, so a wrong key produces a plausible answer that is not optimal.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_ADVANCED_BASIC_DP',
    notes: `**Overlapping subproblems, a table, and the recurrence written before any code.**

## What makes something a DP problem

**The answer for n depends on the answers for smaller inputs**, and those smaller answers are
needed repeatedly.

**"Repeatedly" is the distinguishing part.** Plain recursion handles the dependency; DP exists
because the same subproblem arises many times and recomputing it is exponential.

## The order of work

**Define what the answer means for a subproblem.** "The maximum sum ending at index i." **This is
the hard step and everything else follows from it.**

**Write the recurrence.** How the answer at i relates to earlier answers.

**Identify the base cases.**

**Then decide the direction**: memoised recursion, which follows the recurrence literally, or a
table filled bottom-up, which avoids recursion depth.

**Both are correct** and the recursive version is usually easier to write under pressure.

## The standard shapes

**One dimension over an index.** Maximum subarray, house robber, climbing stairs, longest
increasing subsequence.

**Two dimensions over two sequences.** Edit distance, longest common subsequence.

**A knapsack.** Capacity against items, which is the most frequently asked shape.

## The recognition signal

**"Maximum", "minimum", "how many ways"** — combined with a choice at each step and no greedy
argument available.

**"How many ways" is almost always DP**, and it is the easiest signal to spot.

## Where it goes wrong

**Defining the subproblem loosely.** "The best answer so far" is ambiguous and produces a
recurrence that does not close. **"The best answer ending exactly at i" is precise**, and the
precision is what makes the recurrence writable.

## In an interview

**Say the recurrence out loud before writing.** If it is wrong the interviewer will frequently say
so, which costs thirty seconds instead of fifteen minutes.`,
    mcqs: [
      mcq('Plain recursion handles the dependency, and DP exists because the same subproblem arises many times and recomputing it is:',
        [['Exponential', true],
         ['Slower by a constant factor', false],
         ['Impossible without extra memory', false],
         ['Only a problem for large inputs', false]],
        'The recursion tree branches repeatedly on the same values, so without storing results the work grows exponentially in the input size.'),
      mcq('"The best answer so far" produces a recurrence that does not close, where "the best answer ending exactly at i" is precise, and the precision is what:',
        [['Makes the recurrence writable', true],
         ['Reduces the memory the table requires', false],
         ['Allows the base cases to be omitted', false],
         ['Determines whether greedy would also work', false]],
        'A well-defined subproblem states exactly what is being optimised, which is what lets the relation to smaller subproblems be expressed.'),
    ],
    checkpoint: [
      mcq('The easiest DP signal to spot is:',
        [['"How many ways"', true],
         ['"Maximum" in the problem statement', false],
         ['A constraint on the memory allowed', false],
         ['An input that is already sorted', false]],
        'Counting arrangements almost never has a greedy or direct formula at this level, so the phrasing maps to DP with high reliability.'),
      mcq('Saying the recurrence out loud before writing is recommended because if it is wrong the interviewer will frequently say so, costing:',
        [['Thirty seconds instead of fifteen minutes', true],
         ['Nothing, since hints are not penalised', false],
         ['A mark for not reaching it independently', false],
         ['The opportunity to demonstrate the coding', false]],
        'A wrong recurrence implemented in full wastes the remaining time, where stating it exposes the error while correction is cheap.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_ADVANCED_TIMED_SET',
    notes: `**The harder third of a paper, under time.**

## The drill

**Four problems, ninety minutes.** One graph, one greedy, one DP, one that could be either.

**The fourth is the point.** Deciding between greedy and DP under time pressure is the actual
skill, and it is where candidates lose the most.

## The decision procedure

**Try greedy first**, because it is faster to write.

**Spend sixty seconds trying to break it.** Small adversarial inputs.

**If it breaks, go to DP.** If it does not break and you can argue why, use it.

**If you cannot break it and cannot argue why, use DP anyway** — a correct slower solution beats a
fast wrong one, and partial credit does not exist for wrong answers.

## Partial credit strategy

**On the harder problems, a working brute force is worth more than an unfinished optimal
solution**, and most platforms award it.

**Write the brute force first if you are unsure**, then optimise if time remains. It guarantees
something rather than risking nothing.

## What costs candidates here

**Committing to greedy without checking**, and discovering on the hidden tests.

**And DP with a loosely defined subproblem**, which produces a recurrence that almost works —
correct on the sample, wrong on a case with a particular shape.

## After the set

**For each: was the approach right, and was the implementation right?**

**On this topic the approach is usually the gap**, which is the opposite of the structures topic
and needs the opposite remedy: more problems read and categorised, fewer implemented.`,
    mcqs: [
      mcq('If you cannot break a greedy solution and cannot argue why it is safe, the recommendation is to use DP anyway because:',
        [['A correct slower solution beats a fast wrong one', true],
         ['DP is easier to implement under pressure', false],
         ['Greedy solutions rarely pass hidden tests', false],
         ['The complexity difference is usually small', false]],
        'No partial credit exists for a wrong answer, so certainty is worth more than the speed advantage of the greedy version.'),
      mcq('On the harder problems, writing a brute force first if unsure guarantees something rather than:',
        [['Risking nothing', true],
         ['Wasting the available time', false],
         ['Producing an inefficient submission', false],
         ['Confusing the intended approach', false]],
        'An unfinished optimal solution scores zero, whereas a working brute force collects whatever partial credit the platform offers.'),
    ],
    checkpoint: [
      mcq('On this topic the gap is usually the approach, which is the opposite of the structures topic and needs:',
        [['More problems read and categorised, fewer implemented', true],
         ['Repetition of a small set of operations', false],
         ['Stricter time limits during the practice', false],
         ['Implementation drilling of the standard algorithms', false]],
        'Choosing between techniques improves with exposure to problem shapes, where implementation fluency improves with repetition.'),
      mcq('A DP solution with a loosely defined subproblem produces a recurrence that almost works, meaning it is:',
        [['Correct on the sample and wrong on a particular shape', true],
         ['Slower than the intended solution allows', false],
         ['Unable to handle the base cases properly', false],
         ['Correct but exceeding the memory limit', false]],
        'An imprecise definition admits cases the relation does not cover, which surfaces only on inputs with the structure that exposes it.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_ADVANCED_INTERVIEW_QUESTION',
    notes: `**"Is greedy safe here?"** — the question that separates candidates on the harder
material.

## Why it is the question

**Because proposing greedy is easy and justifying it is not**, and the justification is what
distinguishes somebody who understands the technique from somebody who recognised a shape.

## The answer

**State the greedy choice.** "At each step take the interval that ends earliest."

**Then the argument.** "Taking the earliest-ending interval leaves at least as much room for the
rest as any other choice, so there is an optimal solution that includes it."

**Informal is fine.** Nobody expects an exchange argument written out; they expect you to have
thought about why rather than only that.

## When the answer is no

**Say so, and say what you would use instead.** "I cannot justify greedy here because taking the
largest item now can block two better ones later, so I would use DP with capacity as the
dimension."

**That is a complete and strong answer**, and it is better than a greedy solution offered with
confidence and no reasoning.

## The follow-ups

**"Can you give a counter-example?"** For a greedy approach you have rejected, a small concrete one
is the clearest possible justification, and having tried to break it means you have one.

**"What is the complexity of the DP?"** States times transitions. It is the standard way to answer
and it is expected.

**"Can you reduce the space?"** Frequently yes, for one-dimensional DP that only looks back a
fixed distance. Knowing that the table can often collapse to a couple of variables is a real
marker.

## What loses marks

**Proposing greedy confidently without justification**, and then being shown a counter-example. It
is worse than proposing DP, because it demonstrates the habit of not checking.`,
    mcqs: [
      mcq('Proposing greedy confidently without justification and then being shown a counter-example is worse than proposing DP because it demonstrates:',
        [['The habit of not checking', true],
         ['A gap in knowledge of the techniques', false],
         ['That the problem was misread initially', false],
         ['An inability to reason about complexity', false]],
        'The failure is procedural rather than technical, and it predicts the same omission on problems where nobody is there to catch it.'),
      mcq('The complexity of a DP is answered as:',
        [['States times transitions', true],
         ['The size of the input squared', false],
         ['The depth of the recursion involved', false],
         ['The number of base cases required', false]],
        'Each state is computed once and each computation considers its transitions, so the product is the standard and expected formulation.'),
    ],
    checkpoint: [
      mcq('Saying you cannot justify greedy and naming what you would use instead is described as:',
        [['A complete and strong answer', true],
         ['An acceptable fallback if time is short', false],
         ['Weaker than attempting the greedy version', false],
         ['A sign the problem was not understood', false]],
        'It demonstrates the check was performed and the alternative was reasoned to, which is the judgement the question is assessing.'),
      mcq('Knowing that a one-dimensional DP table can often collapse to a couple of variables is described as:',
        [['A real marker', true],
         ['An optimisation rarely worth mentioning', false],
         ['Necessary for passing the memory limits', false],
         ['Only applicable to counting problems', false]],
        'It shows the recurrence is understood well enough to see which history is actually needed, rather than the table being applied by rote.'),
    ],
  },
  {
    unitCode: 'T4_PL_DSA_ADVANCED_CHECKPOINT',
    notes: `**Whether the harder third of a paper is reachable.**

## The bar

**Recognise a graph problem that is not described as one**, and choose the right traversal.

**Decide between greedy and DP with a stated reason**, and be right more often than not.

**Write a DP with a precisely defined subproblem**, and state its complexity as states times
transitions.

**Not solving everything.** The bar here is reaching a correct approach and a working solution,
optimal or not — because on the harder problems a working brute force with partial credit beats an
unfinished optimal one.

## What a weak result means

**Recognition**: more statements categorised, which is the same remedy as the patterns topic and
for the same reason.

**The greedy-or-DP decision**: practise the sixty-second break attempt explicitly, on problems
where you already know the answer. It builds the habit faster than encountering it cold.

**DP subproblem definition**: write the definition sentence for ten problems without implementing
any of them. **It is the step everything else depends on** and it is drillable on its own.

## What this feeds

**The third problem of every coding round**, which is where candidates separate.

**Mock 2**, and its "is greedy safe here" follow-up.

**And P23**, where this material appears under time alongside everything else — which is the
realistic condition and the reason the practice is spread across the year rather than concentrated
before it.`,
    checkpoint: [
      mcq('The bar is reaching a correct approach and a working solution, optimal or not, because on the harder problems:',
        [['A working brute force with partial credit beats an unfinished optimal one', true],
         ['Optimal solutions are rarely required by judges', false],
         ['The time limits are generous on these problems', false],
         ['Most candidates do not attempt them at all', false]],
        'Partial credit is available and an incomplete submission scores nothing, so guaranteed progress outranks a risky better answer.'),
      mcq('For the greedy-or-DP decision, practising the sixty-second break attempt on problems where you already know the answer builds the habit faster than:',
        [['Encountering it cold', true],
         ['Reading the proofs of correctness', false],
         ['Implementing both approaches each time', false],
         ['Reviewing solutions after the attempt', false]],
        'Knowing the outcome lets the procedure be rehearsed repeatedly without the cost of being wrong, which is what makes it habitual.'),
      mcq('Writing the subproblem definition sentence for ten problems without implementing any is recommended because it is:',
        [['The step everything else depends on', true],
         ['Faster than writing the full recurrence', false],
         ['The part most often asked in interviews', false],
         ['Easier to verify without running code', false]],
        'The recurrence, the base cases and the implementation all follow from the definition, so an imprecise one invalidates everything after it.'),
      mcq('This material appears in P23 under time alongside everything else, which is the realistic condition and the reason the practice is:',
        [['Spread across the year rather than concentrated before it', true],
         ['Weighted towards the harder problem types', false],
         ['Assessed separately from the other topics', false],
         ['Scheduled after the specialization month', false]],
        'Performing under competing demands is what a drive requires, and that only develops if the practice runs alongside other work.'),
    ],
  },

  /* ══ T4_PL_COMPLEXITY ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PL_COMPLEXITY_STATING_THE_COST',
    notes: `**Out loud, immediately, without being asked** — because being asked is worse than
volunteering it.

## Why volunteering matters

**It says the analysis was part of the thinking rather than produced afterwards on request.**

**An interviewer who has to ask has learned something**: that the cost was not considered while
solving, which is the habit they are actually assessing.

## Reading it off your own code

**One loop over n: linear.** **A loop inside a loop over the same n: quadratic.** **Halving each
step: logarithmic.** **A loop containing a log step: n log n.**

**Constant work inside a loop does not change the class** — a dictionary lookup inside a linear
loop is still linear, and this is the point most often got wrong in both directions.

## Space as well as time

**Frequently forgotten and frequently asked.** The extra structures you allocated, and — for
recursive solutions — **the call stack, which is linear in the depth.**

**A recursive tree traversal is O(n) time and O(h) space**, and saying the second unprompted is a
marker.

## Built-in operations are not free

**Sorting is n log n.** **A membership test on a list is linear.** **Slicing a list copies it.**
**String concatenation builds a new string.**

**Each of those inside a loop changes the class**, and they are invisible because they look like
single operations.

## The numbers that make it concrete

**At roughly a hundred million simple operations per second:** n = 1,000 makes quadratic fine;
n = 100,000 makes it impossible; n = 1,000,000 needs linear or n log n.

**Which means the constraint in the statement names the acceptable class** before you have thought
about the problem — and that is the most useful thing on the page.`,
    mcqs: [
      mcq('A dictionary lookup inside a linear loop leaves the loop linear, and this is described as the point most often got wrong:',
        [['In both directions', true],
         ['By candidates new to the material', false],
         ['When the dictionary is large enough', false],
         ['Only in languages with slow hashing', false]],
        'Some candidates call it quadratic because of the nesting and others miss genuinely linear work inside a loop, so the error occurs both ways.'),
      mcq('A recursive tree traversal is O(n) time and O(h) space, and saying the second unprompted is a marker because the space comes from:',
        [['The call stack, which is linear in the depth', true],
         ['The visited set that records each node', false],
         ['The output list being built during the walk', false],
         ['The copies made when passing subtrees along', false]],
        'Each pending call occupies a frame, so the auxiliary space is the maximum depth reached rather than the number of nodes.'),
    ],
    checkpoint: [
      mcq('Built-in operations that look like single steps but change the class inside a loop include sorting, list membership, slicing and:',
        [['String concatenation', true],
         ['Integer arithmetic on large values', false],
         ['Dictionary insertion of a new key', false],
         ['Appending to the end of a list', false]],
        'Strings are immutable, so each concatenation copies everything so far and a loop of them becomes quadratic in the final length.'),
      mcq('The constraint in the problem statement names the acceptable class before you have thought about the problem, which makes it:',
        [['The most useful thing on the page', true],
         ['A detail to check after choosing an approach', false],
         ['Relevant only for the harder problems', false],
         ['A guide to the intended data structure', false]],
        'It eliminates whole families of solution at no cost, which is why reading it first is the cheapest decision available.'),
    ],
  },
  {
    unitCode: 'T4_PL_COMPLEXITY_IMPROVING_IT',
    notes: `**"Can you do better?"** — the follow-up that always comes, and the three standard ways
of answering it.

## It is not a rejection

**It is the second half of the question and it was always coming.** Treating it as criticism
produces defensiveness where improvement was wanted.

## The three directions

**Trade memory for time.** A set or a dictionary of what you have already seen turns a scan into a
lookup. **This is the most frequently applicable improvement** and the first to consider.

**Exploit an order.** Sorting first, or noticing the input is already sorted, frequently removes a
whole dimension of work — two pointers instead of a nested loop, binary search instead of a scan.

**Remove repeated work.** Something recomputed inside a loop is hoisted out or cached. At its
limit this is dynamic programming.

## The procedure

**Ask what you are computing more than once.** The answer names the improvement in most cases.

**Then say what the new cost is, and what it cost you** — usually memory. **Naming the trade
unprompted is the strongest part of the answer.**

## When there is no improvement

**Say so, with a reason.** "Every element has to be examined at least once, so linear is optimal
here."

**That is a correct and complete answer**, and candidates frequently invent a worse solution rather
than assert a lower bound they are confident about.

## The other follow-up

**"What if the input did not fit in memory?"** Streaming, or processing in chunks, and it tests
whether your solution's assumptions are visible to you.

**Most candidates have never considered it**, which is why it is asked.`,
    mcqs: [
      mcq('The most frequently applicable improvement, and the first to consider, is:',
        [['Trading memory for time', true],
         ['Sorting the input before processing', false],
         ['Removing work repeated in a loop', false],
         ['Reducing the number of passes made', false]],
        'A set or dictionary of what has been seen converts a repeated scan into a constant-time lookup, which applies across a wide range of problems.'),
      mcq('When there is no improvement available, asserting a lower bound with a reason is a correct and complete answer, and candidates frequently instead:',
        [['Invent a worse solution', true],
         ['Ask the interviewer for a hint', false],
         ['Restate the original approach again', false],
         ['Claim the problem is already optimal', false]],
        'Treating the follow-up as a demand for change produces an unnecessary complication rather than the confident statement that was wanted.'),
    ],
    checkpoint: [
      mcq('The question that names the improvement in most cases is what you are:',
        [['Computing more than once', true],
         ['Storing that is never used again', false],
         ['Comparing in the innermost loop', false],
         ['Assuming about the input ordering', false]],
        'Repeated work is what caching, precomputation and dynamic programming all remove, and it accounts for most available improvements.'),
      mcq('"What if the input did not fit in memory?" is asked because most candidates:',
        [['Have never considered it', true],
         ['Answer it with streaming immediately', false],
         ['Assume the constraint rules it out', false],
         ['Find it harder than the original problem', false]],
        'The assumption of fitting in memory is made silently, so the question probes whether the candidate knows what they assumed.'),
    ],
  },
  {
    unitCode: 'T4_PL_COMPLEXITY_TIMED_SET',
    notes: `**Costing solutions under time, which is faster practice than writing them.**

## The drill

**Twenty short code fragments, thirty minutes.** For each: the time complexity, the space
complexity, and one sentence on what dominates.

**No writing code.** Reading and costing only.

## Why this is worth thirty minutes

**Because in an interview the cost has to be available immediately**, and it becomes available
through repetition of the reading rather than through solving more problems.

**Twenty costings in half an hour is more practice at this specific skill than a week of solving**,
where each problem produces exactly one costing at the end.

## What the fragments include

**Nested loops with different bounds** — over the same n, over different variables, over a
triangular range.

**Built-ins inside loops.** A sort, a membership test on a list, a slice, a string concatenation.
**These are the ones that catch people**, because the line looks like one operation.

**Recursive functions**, where the answer depends on the branching factor and the depth.

**And space**, including the call stack.

## The ones to review

**Any you got wrong by more than a factor of n.** Getting log n against constant slightly wrong
matters less than calling something linear when it is quadratic, which is the error that produces
a timeout in a real round.

## The habit this builds

**Reading a loop and seeing its cost without deriving it**, the way you read a word without
sounding it out. That is the state worth reaching, and it comes from volume rather than from
depth.`,
    mcqs: [
      mcq('Twenty costings in half an hour is more practice at this skill than a week of solving because each solved problem produces:',
        [['Exactly one costing at the end', true],
         ['A costing that is rarely verified', false],
         ['Practice at implementation instead', false],
         ['Several costings across its versions', false]],
        'The costing step happens once per problem, so solving is an inefficient way to accumulate repetitions of it.'),
      mcq('Built-ins inside loops catch people because the line:',
        [['Looks like one operation', true],
         ['Is documented as constant time', false],
         ['Executes faster than a manual loop', false],
         ['Appears outside the nested structure', false]],
        'A sort, a slice or a membership test reads as a single call, so its internal cost is not visible when scanning the loop body.'),
    ],
    checkpoint: [
      mcq('The costings worth reviewing are any wrong by more than a factor of n, because calling something linear when it is quadratic is the error that:',
        [['Produces a timeout in a real round', true],
         ['Is most common among weaker candidates', false],
         ['Indicates a misunderstanding of notation', false],
         ['Affects the space analysis as well', false]],
        'That magnitude of misjudgement leads to committing to an approach that cannot pass, where smaller errors change nothing about the choice.'),
      mcq('The state worth reaching is reading a loop and seeing its cost without deriving it, which comes from:',
        [['Volume rather than from depth', true],
         ['Studying the formal definitions carefully', false],
         ['Solving problems at increasing difficulty', false],
         ['Deriving each cost from first principles', false]],
        'Automatic recognition is built by many quick repetitions, in the same way fluent reading replaces sounding words out.'),
    ],
  },
  {
    unitCode: 'T4_PL_COMPLEXITY_INTERVIEW_QUESTION',
    notes: `**"What is the complexity of that?"** — asked about your own solution, every time.

## The expectation

**An immediate answer, in time and space**, without pausing to work it out.

**Hesitation here is costly out of proportion to the difficulty**, because the analysis is
supposed to have happened while you were solving rather than afterwards.

## The answer

**Time, space, and what dominates.** "Linear time, linear space — the dictionary is the space and
the single pass is the time."

**Naming what dominates demonstrates the analysis rather than a recalled figure**, which is what
distinguishes a considered answer from a guessed one.

## Follow-ups to have ready

**"Can you do better?"** The three directions: memory for time, exploit an order, remove repeated
work.

**"What about the worst case?"** Different from the average for hashing, for quicksort, and for
anything with an early exit. **Saying "average linear, worst case quadratic" for hashing
unprompted is a marker.**

**"What if n is very large?"** Where the memory becomes the constraint rather than the time.

**"And the space?"** Asked when it was omitted. Including it unprompted avoids the question
entirely, and for recursive solutions the stack counts.

## The mistake to avoid

**Stating a complexity you have not verified against your own code.** Interviewers check, and an
incorrect confident answer is worse than a considered one arrived at slowly — it suggests the
figure was recalled from a similar problem rather than derived from this one.

## And the honest correction

**If you realise mid-answer that it is wrong, say so and correct it.** That reads as rigour, not as
uncertainty, and interviewers consistently respond well to it.`,
    mcqs: [
      mcq('Naming what dominates demonstrates the analysis rather than a recalled figure, which distinguishes:',
        [['A considered answer from a guessed one', true],
         ['A correct answer from an incorrect one', false],
         ['An optimal solution from a working one', false],
         ['Time complexity from space complexity', false]],
        'Identifying the dominant term requires having examined the code, where the headline figure alone could come from a similar problem.'),
      mcq('Stating a complexity you have not verified is worse than a considered answer arrived at slowly because it suggests the figure was:',
        [['Recalled from a similar problem', true],
         ['Guessed without any analysis at all', false],
         ['Taken from the problem statement itself', false],
         ['Copied from a published solution', false]],
        'Confidence with an error points to pattern-matching against remembered problems rather than reasoning about the code in front of you.'),
    ],
    checkpoint: [
      mcq('Realising mid-answer that a complexity is wrong and correcting it reads as:',
        [['Rigour, not as uncertainty', true],
         ['Hesitation that costs marks overall', false],
         ['A gap in the preparation beforehand', false],
         ['An admission that the solution is flawed', false]],
        'Self-correction demonstrates the analysis is live rather than recalled, and interviewers consistently respond well to it.'),
      mcq('Saying "average linear, worst case quadratic" for hashing unprompted is a marker because it shows awareness that the two:',
        [['Differ, which most candidates do not mention', true],
         ['Are equivalent for practical input sizes', false],
         ['Depend on the language implementation used', false],
         ['Both need stating for every data structure', false]],
        'Collisions degrade the worst case while the average stays constant, and volunteering the distinction shows the guarantee is understood.'),
    ],
  },
  {
    unitCode: 'T4_PL_COMPLEXITY_CHECKPOINT',
    notes: `**Whether cost is available immediately rather than derivable slowly.**

## The bar

**Given your own solution, state time and space within five seconds**, and name what dominates.

**Given a code fragment you did not write, cost it within thirty seconds.**

**Given a constraint, name the acceptable complexity class** before reading the problem.

**And know the three improvement directions**, well enough to apply one on request.

## Why speed is the measure rather than accuracy

**Because accuracy without speed does not survive an interview.** A candidate who can derive the
answer in ninety seconds has the knowledge and will be read as not having had it, because the
question expects the figure to be already known.

**This is one of the few places where the drill is explicitly about speed**, and it is justified
by how the skill is actually used.

## What a weak result means

**Slow costing**: more fragments read, which is the fastest-improving skill in this entire module
because it is pure repetition with immediate feedback.

**Missing the space**: a habit gap rather than a knowledge one. State both, every time, until
omitting one feels wrong.

**Not knowing the improvement directions**: three things to learn, and they cover nearly every
follow-up that will be asked.

## What this feeds

**Every coding round and every technical interview**, where it is asked about every solution
without exception.

**Mock 2**, where the follow-up is guaranteed.

**And the constraint-reading habit in P23**, where three problems arrive together and deciding
which approach each needs starts from the constraint.`,
    checkpoint: [
      mcq('Speed rather than accuracy is the measure because a candidate who derives the answer in ninety seconds will be read as:',
        [['Not having had the knowledge', true],
         ['Being thorough about the analysis', false],
         ['Uncertain about their own solution', false],
         ['Unfamiliar with the notation involved', false]],
        'The question expects the figure to be already known, so the delay itself signals that the analysis was not part of the solving.'),
      mcq('Costing fragments is described as the fastest-improving skill in this module because it is:',
        [['Pure repetition with immediate feedback', true],
         ['Simpler than the other material covered', false],
         ['Assessed more frequently than the others', false],
         ['Independent of the problem-solving skills', false]],
        'Each fragment takes seconds and the answer is checkable at once, so a large number of corrected repetitions fits into a short session.'),
      mcq('Omitting the space complexity is described as a habit gap rather than a knowledge one, with the remedy being to state both until:',
        [['Omitting one feels wrong', true],
         ['The space analysis becomes automatic', false],
         ['The interviewer stops asking for it', false],
         ['Both can be derived at the same speed', false]],
        'The knowledge is present and the practice is not, so the fix is repetition of the complete answer until it becomes the default.'),
      mcq('In P23, deciding which approach each of three problems needs starts from:',
        [['The constraint', true],
         ['The length of the problem statement', false],
         ['The sample inputs that are provided', false],
         ['The order the problems are presented in', false]],
        'The constraint names the acceptable complexity class immediately, which rules approaches in or out before the problem is analysed.'),
    ],
  },
];
