/**
 * T4_DSA_DEPTH, T4_TESTING_DEPTH and T4_DEBUG_DEPTH — twenty-one units. Module P03, days 13-15.
 *
 * ── THE THREE DAYS THAT SEPARATE CANDIDATES ───────────────────────────────────────────────
 *
 * Every fourth-year can write a loop. What a technical round actually separates on is whether
 * they can say what it costs, whether they can write a test that would have caught something,
 * and whether they can find a fault without changing things at random.
 *
 * All three are habits rather than knowledge, which is why none of these days is a survey. The
 * DSA day does not enumerate data structures — Years 1 to 3 did that, and P15 drills the problems.
 * It is about choosing from the access pattern. The testing day is about what is worth testing.
 * The debugging day is about narrowing rather than staring.
 *
 * ── WHY DEBUGGING GETS A WHOLE DAY IN A FOURTH YEAR ───────────────────────────────────────
 *
 * Because it is the skill most obviously present or absent in a pair-programming round, and the
 * one nobody is taught. A student who changes three things and reruns has a method; it is just a
 * bad one, and nobody has ever told them so. One deliberate day is enough to replace it, and the
 * replacement lasts a career.
 *
 * ── AND WHY THE TESTING DAY REFUSES TO TALK ABOUT COVERAGE ────────────────────────────────
 *
 * Coverage is the metric that is easy to measure and nearly uncorrelated with whether the tests
 * would catch anything. A hundred percent coverage with no assertions is achievable and
 * worthless. The question this day asks instead is "would this test have caught the bug", which
 * is harder to measure and is the only thing that matters.
 *
 * Attribution: T4_DSA_DEPTH defaults to DSA_COMPLEXITY with the hashing unit on DSA_HASHING, the
 * algorithm unit on ALGORITHM_DESIGN and the project on DSA_TREES; T4_TESTING_DEPTH to
 * AUTOMATED_TESTING with the first lesson on TESTING_FUNDAMENTALS; T4_DEBUG_DEPTH to DEBUGGING
 * with the logging unit on LOGGING_DIAGNOSTICS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BUILD_CORE_BUNDLES: PilotBundle[] = [
  /* ══ T4_DSA_DEPTH ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DSA_DEPTH_COST_OF_THE_OPERATIONS',
    notes: `**The question is never "which structure is fastest".** It is "which operation does
this problem perform a hundred thousand times", and the structure follows from the answer.

## Start from the access pattern

Write down what the problem actually does, and how often:

**Lookup by key** — a hash map, constant. **Membership** — a set, constant. **Smallest or
largest, repeatedly** — a heap, log n to insert, constant to peek. **Ordered traversal** — a
sorted structure or a sort. **Append and read in order** — a list, and nothing beats it.

**Most problems perform two of these**, and the tension between them is the actual design
question.

## When two operations disagree

**Keep two structures.** A list for order and a set for membership costs a few bytes and keeps
both operations at the cost they should be. Students resist this because it feels redundant; it
is not, and it is what production code does constantly.

## The amortised cost that matters

**Appending to a dynamic array is constant on average**, not always — occasionally it reallocates
and copies everything. Over n appends the total is linear, so the average is constant, and that
is the number to reason with.

**Where it matters is a hard real-time constraint**, which a placement problem never has. So
amortised is the right lens here.

## Reading a problem for its pattern

**"For each query, find..."** means the lookup is the hot operation, and the setup cost is paid
once. **"Process the stream in order"** means you cannot see ahead, which rules out sorting.
**"Find the k smallest"** means a heap, almost always.

The phrasing names the structure more often than people notice.`,
    mcqs: [
      mcq('A problem performs one expensive setup and then a hundred thousand lookups. The right trade is to:',
        [['Spend more on setup to make lookups cheap', true],
         ['Minimise setup, since lookups are usually fast anyway', false],
         ['Balance the two, keeping both at a moderate cost', false],
         ['Avoid setup entirely and compute each lookup fresh', false]],
        'Setup is paid once and lookups a hundred thousand times. Anything that reduces the repeated cost is worth a large one-off price.'),
      mcq('Keeping both a list and a set over the same items is justified when the problem needs:',
        [['Order and membership, at their proper costs', true],
         ['More memory to be used than a single structure', false],
         ['Two independent views for different parts of the code', false],
         ['A backup in case one of the structures is corrupted', false]],
        'Each structure answers one question well. The apparent redundancy buys constant-time membership without giving up insertion order.'),
      mcq('"Find the k smallest" in a stream most directly suggests:',
        [['A heap, which keeps the extreme cheap to reach', true],
         ['A sort, applied once the stream has been consumed', false],
         ['A hash map keyed on the value of each element', false],
         ['A sorted list, maintained as each element arrives', false]],
        'A heap of size k gives log k per element and needs no second pass. Sorting requires all the data and re-sorting per element is far worse.'),
    ],
    checkpoint: [
      mcq('A student resists keeping two structures over the same data because it feels redundant. The correct response is that production code:',
        [['Does this constantly, and for this reason', true],
         ['Avoids it too, preferring one structure per dataset', false],
         ['Uses a library type that provides both at once', false],
         ['Accepts the slower operation to keep memory lower', false]],
        'Trading a little memory for keeping every operation at its natural cost is routine. The redundancy is in the storage, not in the logic.'),
      mcq('The phrasing "process the stream in order" rules out:',
        [['Sorting, since you cannot see ahead', true],
         ['Hashing, because order would not be preserved', false],
         ['Recursion, which needs the whole input present', false],
         ['Using a heap, which requires random access to data', false]],
        'A sort needs all the data before it can produce the first result. Streaming means committing to each element as it arrives.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_HASHING_AND_TREES',
    notes: `**Constant-time lookup against ordered traversal**, and the problems that need the
second.

## What a hash map cannot do

**Give you the next-largest key.** **Iterate in order.** **Answer a range query.**

Every one of those needs the data to have an order, and hashing deliberately destroys order —
that is how it achieves constant time. **So "give me everything between X and Y" is not a hash
map problem**, however tempting the constant time looks.

## What a tree buys

**Ordered operations at log n.** Find, insert, next-largest, range. Slower than a hash for a
plain lookup and the only option when order matters.

**In practice you rarely implement one.** A sorted list with binary search covers most cases in a
placement round, and the language's ordered map covers the rest.

## Where the tree actually appears in interviews

**As a traversal problem rather than as a lookup structure.** Binary tree traversals, depth,
lowest common ancestor, path sums. These are recursion exercises wearing a tree costume, and
recognising that is most of the answer.

**The three traversals and what each is for:** in-order gives sorted output for a search tree,
pre-order copies the structure, post-order frees or aggregates from the bottom up.

## The collision question

**"What happens when two keys hash to the same bucket?"** They are chained or probed, and lookup
degrades toward linear in the worst case. **The average is constant and the worst case is not**,
and knowing that distinction is what the question is checking.`,
    mcqs: [
      mcq('"Give me every key between X and Y" is not a hash map problem because hashing:',
        [['Destroys order, which is how it is fast', true],
         ['Cannot store more than one key per bucket slot', false],
         ['Requires the keys to be integers or short strings', false],
         ['Is slower than a tree when many keys are present', false]],
        'Constant-time lookup comes from scattering keys across buckets, which leaves no relationship between adjacent values.'),
      mcq('In-order traversal of a binary search tree produces the keys:',
        [['In sorted order', true],
         ['In the order they were originally inserted', false],
         ['Grouped by depth, shallowest nodes appearing first', false],
         ['In reverse of the order used to construct the tree', false]],
        'Visiting left subtree, node, then right subtree emits keys in ascending order, which is the defining property a search tree provides.'),
      mcq('Hash map lookup is described as constant time. The important qualification is that this is:',
        [['The average, with a worse worst case', true],
         ['True only when the map is smaller than its capacity', false],
         ['True for reads but not for insertions into the map', false],
         ['Guaranteed, because collisions are resolved in constant time', false]],
        'Collisions chain or probe, so the worst case degrades toward linear. The average being constant is what makes it useful and it is not a guarantee.'),
    ],
    checkpoint: [
      mcq('Most binary-tree interview questions are really exercises in:',
        [['Recursion, wearing a tree costume', true],
         ['Memory management across a linked structure', false],
         ['Choosing between a tree and a hash map correctly', false],
         ['Balancing, which is what makes trees efficient', false]],
        'Depth, path sums and lowest common ancestor are all defined recursively on subtrees. Recognising that supplies most of the solution immediately.'),
      mcq('A placement problem needs ordered operations and you do not want to implement a tree. The practical answer is:',
        [['A sorted list with binary search over it', true],
         ['A hash map, accepting the loss of ordering', false],
         ['A heap, which maintains the ordering internally', false],
         ['Sorting the data freshly before each query made', false]],
        'Sort once and binary search covers find and range at log n with no implementation. It is what a candidate should reach for under time pressure.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_DESIGNING_THE_ALGORITHM',
    notes: `**Reaching a correct approach for a problem you have not seen**, which is what an
interview is actually testing. Recalling one you have is a different and much weaker skill.

## The sequence that works

**Solve it by hand first.** Take the sample input and produce the answer on paper. Whatever you
did is an algorithm; write down what you did.

**Then make it mechanical.** Where did you look ahead? Where did you remember something? Those
become the data structures.

**Then find the waste.** What did you compute more than once? That is where the improvement is,
and it is almost always the only improvement available.

## Getting to correct before getting to fast

**A working slow answer is worth far more than a fast wrong one**, and in an interview it is
worth more than silence. State the brute force, say what it costs, then improve it — that
sequence is itself what is being assessed.

**Candidates who go straight for the optimal solution and get stuck** produce nothing, and have
demonstrated nothing either.

## The three improvements that cover most problems

**Precompute.** Something recomputed in a loop is hoisted out or cached.

**Trade memory for time.** A dictionary of what you have already seen turns a scan into a lookup.

**Exploit an order.** Sorting first, or noticing the input is already sorted, frequently removes
a whole dimension of work.

## When you are stuck

**Solve a smaller version.** n = 1, n = 2, n = 3. The pattern between them is often the
recurrence, and the recurrence is the algorithm.`,
    mcqs: [
      mcq('In an interview, stating the brute force and its cost before optimising is valuable because it:',
        [['Establishes a correct answer to improve from', true],
         ['Shows familiarity with the standard approaches used', false],
         ['Gives the interviewer a chance to offer a hint next', false],
         ['Demonstrates that the problem was read carefully first', false]],
        'It converts silence into progress and gives something to optimise. A candidate reaching for the optimal answer and failing produces nothing at all.'),
      mcq('Solving the problem by hand on the sample input first is useful because whatever you did:',
        [['Is an algorithm, which can then be written down', true],
         ['Matches the expected solution in most of these cases', false],
         ['Reveals which data structure the author intended', false],
         ['Confirms that the sample input is representative', false]],
        'Human problem-solving is already a procedure. Making it explicit converts an unfamiliar problem into the task of mechanising something you can do.'),
      mcq('Solving n = 1, 2 and 3 when stuck is useful chiefly because the pattern between them is often:',
        [['The recurrence, which is the algorithm', true],
         ['The base case, which the solution then builds on', false],
         ['Enough to guess the answer for a general n value', false],
         ['A proof that the problem has a closed-form solution', false]],
        'How the answer for n relates to the answer for n-1 is precisely a recurrence, and a recurrence translates directly into recursion or a table.'),
    ],
    checkpoint: [
      mcq('The strongest signal that a candidate can design rather than recall an algorithm is that they:',
        [['Improve a working answer when asked for better', true],
         ['Produce the optimal solution immediately on reading', false],
         ['Name the standard algorithm the problem is based on', false],
         ['Recall the complexity of several similar problems', false]],
        'Immediate optimality is consistent with having seen the problem. Improving on demand requires reasoning about the specific waste in your own solution.'),
      mcq('"What did I compute more than once?" is the most productive optimisation question because the answer is:',
        [['Almost always where the only improvement is', true],
         ['Easier to find than other kinds of inefficiency', false],
         ['The only optimisation that changes complexity class', false],
         ['Applicable to problems of every possible kind', false]],
        'Repeated work is what caching, precomputation and dynamic programming all remove, and it accounts for most available improvements in practice.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_DEBUGGING',
    notes: `**Solutions that are correct and too slow, and solutions that are fast and wrong at
the edges.**

## Too slow

**There is no error and no wrong answer.** The program simply does not come back, which is why
people spend twenty minutes looking for a logic bug that is not there.

**Find the line that runs most often.** Count it; do not guess. One line almost always dominates,
and the fix is usually a container change rather than a rewrite.

## Fast and wrong at the edges

**A binary search whose bounds are off by one.** It works on everything except the first element,
the last element, or an exact match.

**Trace it on two elements.** That is the smallest input where low, high and mid are all distinct
and can disagree.

**A recursion with a base case that is one step wrong.** Correct for n = 5 and wrong for n = 0 or
n = 1, and the sample input never includes either.

## The one that looks like neither

**Integer overflow in a language that has it, or a float comparison in one that does not.**
\`0.1 + 0.2 == 0.3\` is false, and a solution comparing accumulated floats will disagree with the
judge on some inputs and not others.

## The method

**Smallest failing input, then one change at a time.** Both halves matter: shrinking the input
makes the trace possible, and changing one thing means the next run actually tells you something.`,
    mcqs: [
      mcq('A solution that hangs rather than failing sends people looking for a logic bug because:',
        [['There is no error and no wrong answer to see', true],
         ['The traceback points at an unrelated line of code', false],
         ['Timeouts are usually reported as incorrect answers', false],
         ['Slow code and wrong code have identical symptoms', false]],
        'A timeout presents as nothing happening. Without a symptom pointing at cost, the natural assumption is that something is logically wrong.'),
      mcq('Two elements is the right size to trace a binary search because it is the smallest input where:',
        [['Low, high and mid can all disagree', true],
         ['The search needs more than a single iteration', false],
         ['The midpoint calculation can overflow its range', false],
         ['Both halves of the array are non-empty at once', false]],
        'With one element they coincide and no bound error can show. Two is the first size where an off-by-one produces a visible wrong result.'),
      mcq('`0.1 + 0.2 == 0.3` being false matters in a judged problem because the disagreement appears:',
        [['On some inputs and not on others', true],
         ['Only when the values are very large in magnitude', false],
         ['Consistently, so it is caught by the sample test', false],
         ['Only in languages that lack a decimal number type', false]],
        'Accumulated floating-point error depends on the values. A solution passes the sample and fails a subset of hidden tests, which is hard to attribute.'),
    ],
    checkpoint: [
      mcq('A recursive solution is correct for n = 5 and wrong for n = 0. The fault is almost certainly in the:',
        [['Base case, which the sample never exercised', true],
         ['Recursive step, which mishandles small inputs', false],
         ['Return type, which differs for the empty case', false],
         ['Stack depth, which is exceeded at small values', false]],
        'The recursive step is validated by n = 5 working. Zero is the boundary the base case owns, and samples rarely include it.'),
      mcq('"Smallest failing input, then one change at a time" is a single method because shrinking makes the trace possible and single changes make:',
        [['Each run actually informative', true],
         ['The program run measurably faster each time', false],
         ['The fix easier to explain to a reviewer later', false],
         ['It possible to revert if the change was wrong', false]],
        'A run is an experiment. Varying two things at once means the outcome cannot be attributed, so the run has bought nothing.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_PRACTICE',
    notes: `**Structure choice, under time, with the cost stated first.**

## The routine, every time

**Read the constraints.** They name the family of acceptable solution before you have thought
about the problem.

**Name the hot operation.** What does this do a hundred thousand times?

**State the intended complexity out loud.** If it does not fit, you have saved twenty minutes.

**Then write it, and check what you actually got.**

## What is being built

**Not knowledge of structures** — Years 1 to 3 covered those and P15 drills the problems. **The
reflex of asking what something costs before writing it**, so that in an interview the answer is
already available when the question arrives.

## The common failure in this drill

**The plan says "use a lookup" and the code says \`in a_list\`.** Intent linear, result quadratic,
from one unexamined word. Checking the cost you actually got against the one you intended is the
step that catches it, and it is the step everybody skips.

## Do the empty and single cases

**Every exercise has them.** A maximum of nothing, an average over zero items, a binary search in
a one-element list. Decide what each should do before the hidden test decides for you.`,
    coding: [
      {
        title: 'Most frequent, ties broken by first appearance',
        description: `One line of whitespace-separated words.

Print the word that appears most often. If several tie, print whichever of them appeared first
in the input. Then print \`count=N\` with how many times it appeared.

If the input is empty, print \`none\` and \`count=0\`.

The input may be large, so counting each word by scanning the list will not finish.`,
        starter: `import sys

words = sys.stdin.read().split()
`,
        language: 'python',
        tests: [
          { input: 'a b a c b a\n', expectedOutput: 'a\ncount=3' },
          { input: 'x y y x\n', expectedOutput: 'x\ncount=2' },
          { input: '\n', expectedOutput: 'none\ncount=0' },
          { input: 'one\n', expectedOutput: 'one\ncount=1', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A plan saying "use a lookup" implemented as `if x in a_list` gives an intended complexity of linear and an actual one of:',
        [['Quadratic, from one unexamined word', true],
         ['Linear, since the list lookup is also fast enough', false],
         ['Logarithmic, because the list is kept sorted here', false],
         ['Constant, provided the list stays reasonably small', false]],
        'A list membership test scans. Inside a loop over n items that is n squared, and the plan and the code disagree without either being obviously wrong.'),
      mcq('Checking the complexity you actually got against the one you intended is skipped most often because the two:',
        [['Feel like the same step to the author', true],
         ['Are difficult to calculate accurately by hand', false],
         ['Differ only on inputs larger than any test used', false],
         ['Require running the program to compare properly', false]],
        'Having planned it, the author believes the code implements the plan. The check is the only thing that tests that belief rather than assuming it.'),
    ],
    checkpoint: [
      mcq('This drill is not about knowledge of data structures because that was covered in:',
        [['Years 1 to 3, with P15 drilling the problems', true],
         ['The bridge, which every student completes first', false],
         ['P17, which covers the written technical round', false],
         ['The diagnostic, which measured it on day one', false]],
        'Three years taught the structures and P15 drills the problem patterns. What is left for this day is the reflex of costing a solution before writing it.'),
      mcq('An exercise where a maximum is taken over a possibly-empty input requires the author to:',
        [['Decide what empty means before writing it', true],
         ['Raise an error, which is the conventional answer', false],
         ['Return zero, since no value can exceed the start', false],
         ['Skip the case, as hidden tests rarely include it', false]],
        'Empty has no maximum, so the answer is a choice between an error, a sentinel and a documented default. Discovering it at runtime is not a choice.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Here is a problem. Talk me through it."**

## What is actually being scored

**Not whether you reach the optimal answer.** Whether the interviewer can follow your reasoning,
whether you noticed the constraints, whether you tested your own solution, and whether you took
the follow-up without unravelling.

**A candidate who reaches a working answer, states its cost and improves it on request scores
above one who produces the optimal answer silently.**

## The sequence to hold

**Restate the problem.** Twenty seconds, and it catches a misreading while it is still free.

**Ask about the constraints.** Size, range, duplicates, ordering. Asking shows you know they
change the answer.

**Say the approach before coding it.** Including the brute force, if that is where you are
starting.

**Write it.** Talking while typing is hard; brief silences are fine, long ones are not. "Let me
think about the loop bound for a second" costs nothing and keeps them with you.

**Test it out loud.** On the sample, then on an edge case you choose. Finding your own bug is one
of the strongest signals available.

**State the complexity** before being asked.

## The follow-up

**"Can you do better?"** is not a rejection. It is the second half of the question, and it was
always coming.

**"What if the input did not fit in memory?"** is testing whether your solution's assumptions are
visible to you.

## The thing that loses rounds

**Going silent.** The interviewer cannot score what they cannot see, and a candidate thinking
brilliantly in silence for four minutes scores the same as one who is stuck.`,
    mcqs: [
      mcq('A candidate who reaches a working answer, costs it and improves it on request typically scores above one who produces the optimal answer silently because the first:',
        [['Showed the reasoning that produced it', true],
         ['Arrived at the answer more quickly than the second', false],
         ['Demonstrated familiarity with more approaches overall', false],
         ['Made fewer mistakes during the coding portion of it', false]],
        'The round assesses how somebody thinks, and a silent correct answer is indistinguishable from a memorised one.'),
      mcq('"Can you do better?" should be understood as:',
        [['The second half of the question, always coming', true],
         ['A signal that the first answer was unsatisfactory', false],
         ['An invitation to defend the approach already given', false],
         ['A hint that a specific known algorithm is expected', false]],
        'The follow-up is part of the design of the question. Treating it as criticism produces defensiveness where improvement was what was wanted.'),
      mcq('Four minutes of silent thinking scores the same as being stuck because the interviewer:',
        [['Cannot assess reasoning they cannot see', true],
         ['Assumes a long pause means the candidate is lost', false],
         ['Has a fixed time budget for each of the questions', false],
         ['Is required to prompt after a set period of silence', false]],
        'The entire signal in the round is the visible reasoning. Thinking that produces no observable trace contributes nothing to the assessment.'),
    ],
    checkpoint: [
      mcq('Finding a bug in your own solution while testing it out loud is a strong signal because it demonstrates:',
        [['The verification habit the job actually needs', true],
         ['That the solution was written carelessly at first', false],
         ['That the candidate is thorough rather than quick', false],
         ['Familiarity with the specific edge case involved', false]],
        'Nobody writes correct code first time. Catching your own mistakes before somebody else does is the behaviour the round is hoping to see.'),
      mcq('"What if the input did not fit in memory?" is chiefly testing whether the candidate’s:',
        [['Assumptions are visible to them', true],
         ['Solution can be adapted to a streaming approach', false],
         ['Knowledge extends to external sorting algorithms', false],
         ['Complexity analysis accounted for space as well', false]],
        'Every solution assumes something. The question probes whether the candidate knows what they assumed rather than whether they can solve the variant.'),
    ],
  },
  {
    unitCode: 'T4_DSA_DEPTH_MINI_PROJECT',
    notes: `**Take a working solution and make it fast enough, with the measurement to prove it.**

## The brief

Write a solution to something genuinely quadratic — a naive nearest-pair, an all-pairs
comparison, a naive substring search. **Get it correct first.**

**Then generate input large enough that it does not finish**, and improve it until it does.

## The part that makes this an exercise

**Measure, do not assume.** Time the original at several input sizes and plot or tabulate them.
The shape tells you the class, and it will occasionally surprise you — something you believed was
linear has a hidden scan in a library call.

**Then measure the improvement the same way**, so the claim is a number rather than a feeling.

## What to record

**The original complexity and how you determined it.** **The change you made.** **The measured
times before and after, at three input sizes.** **What the improvement cost** — memory, code
clarity, an added dependency.

## Why the cost matters

**Because every optimisation is a trade and most write-ups omit the other side.** A solution that
is ten times faster and twice as hard to read is a reasonable trade in a hot path and a bad one
elsewhere, and being able to say which is the judgement being built.

## The trap to avoid

**Micro-optimising instead of changing the approach.** If the times still curve the same way, the
complexity class has not changed and you have bought a constant factor. That is worth having and
it is not what this exercise is for.`,
    assignment: {
      title: 'From quadratic to fast enough, measured',
      description: 'Write a naive quadratic solution, then improve its complexity class with before-and-after measurements to prove it.',
      instructions: `Write a correct but genuinely quadratic solution to something real: a naive
nearest-pair, an all-pairs comparison, a naive substring search.

**Get it correct first**, with a test that proves it.

**Then generate input large enough that it does not finish in reasonable time.** Time the
original at three increasing input sizes and record the numbers — the shape of the growth tells
you the class, and it occasionally surprises you.

**Improve the complexity class**, not the constant factor. Then measure again at the same three
sizes.

**Submit:** the code, both versions, the test that proves correctness is unchanged, and a note of
no more than a page giving the original complexity and how you determined it, the change you
made, the six measurements, and what the improvement cost you in memory, readability or
dependencies.

If the times still curve the same way after your change, the class has not changed and the
exercise is not finished.`,
      rubric: [
        { criterion: 'Correctness preserved', description: 'A test written against the naive version still passes against the improved one, unedited.', maxPoints: 25 },
        { criterion: 'The class actually changed', description: 'Six measurements at three sizes show a different growth shape, not merely a smaller constant.', maxPoints: 30 },
        { criterion: 'Measured rather than asserted', description: 'The complexity claims are supported by the timings rather than by reasoning alone.', maxPoints: 25 },
        { criterion: 'The cost is stated', description: 'The note names what the improvement cost in memory, clarity or dependencies rather than presenting it as free.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Timing a solution at three increasing input sizes reveals the complexity class because what matters is the:',
        [['Shape of the growth between them', true],
         ['Absolute time taken at the largest size used', false],
         ['Difference between the fastest and slowest run', false],
         ['Ratio of the time to the memory consumed by it', false]],
        'Doubling the input and seeing time double, quadruple or barely move distinguishes the classes. A single measurement distinguishes nothing.'),
      mcq('If the timings still curve the same way after an optimisation, what was bought is:',
        [['A constant factor, not a class change', true],
         ['Nothing at all, since the times are unchanged', false],
         ['A memory saving rather than a speed improvement', false],
         ['An improvement that only shows at larger sizes', false]],
        'Same shape means same growth. A constant-factor gain is real and will not rescue the solution at the next order of magnitude.'),
      mcq('Stating what an optimisation cost matters because most write-ups omit:',
        [['The other side of the trade', true],
         ['The measurements that support their claims', false],
         ['The complexity class of the original version', false],
         ['Whether correctness was preserved by the change', false]],
        'Speed is reported and readability, memory and added dependencies are not. Knowing which trades are worth making requires seeing both sides.'),
    ],
  },

  /* ══ T4_TESTING_DEPTH ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_TESTING_DEPTH_WHAT_IS_WORTH_TESTING',
    notes: `**Coverage is the metric that is easy to measure and nearly uncorrelated with whether
your tests would catch anything.**

## Why coverage misleads

**A hundred percent coverage with no assertions is achievable.** Call every line, assert nothing,
and the report is green. Nothing has been tested and the number says everything has.

**The real question is different: would this test have caught the bug?** Harder to measure, and
the only one that matters.

## What deserves a test

**Logic with branches.** Anything with conditions, especially where the branches interact.

**Anything that has broken before.** A bug that happened once is evidence about where bugs live
in this code.

**Boundaries.** Empty, one, many, the maximum, just over it.

**Anything a wrong answer would be silent about.** A calculation whose output nobody checks by
eye is exactly where a test earns its keep.

## What does not

**Getters, setters and pass-throughs.** A test asserting that a function returns what it was
given tests the language.

**Framework behaviour.** The web framework's routing is tested by the people who wrote it.

**Anything whose failure would be immediately obvious.** If the page does not load, you will know
without a test telling you.

## The test that is worse than none

**One that asserts the current behaviour without anybody deciding it is correct.** It now
prevents the behaviour changing, including changing to something right, and everybody assumes
somebody thought about it.

## The judgement being built

**Where is a wrong answer both possible and quiet?** That is where the tests go, and it is a
different list from the one coverage produces.`,
    mcqs: [
      mcq('A hundred percent coverage with no assertions is possible, which shows coverage measures:',
        [['Execution, not verification', true],
         ['Only the lines, and not the branches within them', false],
         ['Test quantity rather than the tests’ total runtime', false],
         ['How much of the code the author understood well', false]],
        'Coverage records which lines ran. Whether anything checked the result afterwards is a separate question the metric does not ask.'),
      mcq('The highest-value place for a test is where a wrong answer would be:',
        [['Both possible and quiet', true],
         ['Immediately obvious to anybody using the system', false],
         ['Caught by the type system before it could run', false],
         ['Corrected automatically on the following request', false]],
        'Loud failures announce themselves without help. A silently wrong calculation is exactly what nothing else in the system will notice.'),
      mcq('A test asserting current behaviour that nobody has judged correct is worse than no test because it:',
        [['Prevents the behaviour from being corrected', true],
         ['Takes time to run without checking anything real', false],
         ['Will fail whenever the implementation is refactored', false],
         ['Gives a false impression of the coverage achieved', false]],
        'It locks in whatever the code happens to do, and its presence implies somebody decided that was right. Changing to correct behaviour now fails the suite.'),
    ],
    checkpoint: [
      mcq('Testing a getter that returns what it was given chiefly tests:',
        [['The language, rather than your own code', true],
         ['The class’s interface, which is worth confirming', false],
         ['Nothing, but costs nothing to keep in the suite', false],
         ['Serialisation, which getters are often involved in', false]],
        'There is no logic to be wrong. The test asserts that assignment and retrieval work, which is a property of the runtime and not of the program.'),
      mcq('"Anything that has broken before" deserves a test because a past bug is evidence about:',
        [['Where bugs live in this particular code', true],
         ['How carefully that module was originally written', false],
         ['Which developer is likely to introduce the next one', false],
         ['Whether the module needs restructuring entirely', false]],
        'Defects cluster. A place that has produced one is measurably more likely to produce another, which makes it a better bet than an untouched area.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_EDGE_CASES',
    notes: `**Empty, one, many, duplicate, absent, wrong type — in that order, every time.**

## Why a fixed list beats intuition

**Intuition produces the cases you already thought about**, which are the ones your code already
handles. A list produces the ones you did not, which is the entire value.

**Six items, applied mechanically, catches most of what hidden tests catch**, and it takes a
minute.

## What each one finds

**Empty.** Initialisation that assumed something was there. A maximum, an average, a first
element.

**One.** Loops whose bound is right for many and wrong for one. Off-by-one lives here.

**Many.** The complexity problem, and anything that accumulates.

**Duplicate.** Sets silently collapsing them, dictionaries overwriting, counts double-counting.

**Absent.** A missing key, a null field, an optional that was not there. This is the one real
data produces constantly and test data almost never does.

**Wrong type.** A number as text, a date as a string, a list where a single value was expected.

## The boundary itself

**Just below, exactly on, just above.** If a rule says "more than 100", test 99, 100 and 101. The
bug is always at exactly one of the three, and it is usually 100.

## Where this pays off outside tests

**It is the same list for an interview.** When asked to test your own solution out loud, walking
this list is both fast and visibly systematic, which is worth more than producing one clever
case.`,
    mcqs: [
      mcq('A fixed edge-case list beats intuition because intuition produces the cases:',
        [['Your code already handles', true],
         ['That are most likely to occur in real usage', false],
         ['That the test framework can generate automatically', false],
         ['Which are easiest to write a test for quickly', false]],
        'You wrote the code thinking of those cases. The list produces the ones outside that thinking, which is precisely where the untested behaviour is.'),
      mcq('For a rule stating "more than 100", the value most likely to expose a bug is:',
        [['100, the boundary itself', true],
         ['101, the first value that satisfies the rule', false],
         ['99, the last value that fails the rule given', false],
         ['A large value, well clear of the boundary set', false]],
        'Strictly-greater against greater-or-equal is the standard confusion, and the exact boundary is the only value where the two disagree.'),
      mcq('The edge case real data produces constantly and test data almost never does is:',
        [['Absent, such as a missing key or null field', true],
         ['Many, since test datasets are usually quite small', false],
         ['Duplicate, which tests rarely bother to include', false],
         ['Wrong type, which real inputs frequently contain', false]],
        'Test fixtures are constructed complete. Real records have optional fields unfilled, and chained access on those is a crash waiting for production.'),
    ],
    checkpoint: [
      mcq('Walking a systematic edge-case list aloud in an interview is worth more than one clever case because it:',
        [['Is visibly systematic as well as being fast', true],
         ['Covers more of the code than a single case does', false],
         ['Takes less time than devising a clever case would', false],
         ['Shows familiarity with standard testing terminology', false]],
        'The round assesses method. A repeatable procedure demonstrates something that transfers; one inspired case demonstrates that one insight.'),
      mcq('Testing with duplicates most often exposes a fault in code that uses:',
        [['A set, which silently collapses them', true],
         ['A list, which preserves them without any issue', false],
         ['Recursion, which visits each duplicate separately', false],
         ['A sort, which handles equal elements predictably', false]],
        'Deduplication is usually incidental rather than intended. A count or a total computed through a set is quietly wrong whenever duplicates appear.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_INTEGRATION_AND_REGRESSION',
    notes: `**Where unit tests stop helping**, and how a suite stops the same bug arriving twice.

## What a unit test cannot see

**Whether two correct units agree.** Each side was tested against its own idea of the shape, and
the shapes differ. Both suites are green and the system is broken.

**That is the seam**, and it is where a large share of real bugs live. No amount of unit testing
reaches it, because the whole technique is isolating one side from the other.

## What an integration test is for

**Exercising the seam.** Real database, real HTTP call, real serialisation. Slower and more
fragile, and they catch what nothing else can.

**Few of them.** They are expensive to run and to maintain, so they cover the paths that matter
rather than every combination. A handful that exercise the main journeys is the right shape.

## Regression tests

**Every bug becomes one.** Fix it, then write the test that would have caught it, and watch it
fail against the unfixed code.

**This is the highest-value test you will ever write**, because it is the only one with evidence
behind it: this exact thing went wrong once, in this code, in production.

## The discipline that makes it work

**Write it before you forget the reproduction.** A week later the exact conditions are gone, and
the test you write instead is a general one that would not have caught it.

## What a good suite looks like in proportion

**Many unit tests, a few integration tests, a regression test for every bug that reached a
user.** The last group grows slowly and is worth more per test than either of the others.`,
    mcqs: [
      mcq('Two units both pass their own tests and the system is broken. This is a fault at the:',
        [['Seam, which isolation deliberately hides', true],
         ['Unit level, where a test was simply missing', false],
         ['Integration layer, which had no tests written yet', false],
         ['Interface, which one of the units implemented wrongly', false]],
        'Each was tested against its own assumption about the shape. Unit testing works by isolating, so it cannot see the two assumptions disagreeing.'),
      mcq('Integration tests should be few because they are:',
        [['Expensive to run and to maintain', true],
         ['Less likely to find a defect than unit tests are', false],
         ['Unable to run in a continuous integration pipeline', false],
         ['Only valid against a production-like environment', false]],
        'They need real infrastructure, run slowly and break for environmental reasons. A handful covering the main journeys is the right balance.'),
      mcq('A regression test is the highest-value test because it is the only one with:',
        [['Evidence that this exact thing went wrong', true],
         ['A guaranteed failure before the fix was applied', false],
         ['Coverage of a line no other test reaches at all', false],
         ['A direct connection to a reported customer issue', false]],
        'Every other test guards against something imagined. A regression test guards against something that demonstrably happened in this code.'),
    ],
    checkpoint: [
      mcq('Writing the regression test a week after the fix tends to produce a test that:',
        [['Is general, and would not have caught it', true],
         ['Duplicates an existing unit test in the suite', false],
         ['Takes longer to write than it would have done', false],
         ['Fails intermittently because of the delay involved', false]],
        'The specific reproduction is gone by then, so what gets written is an approximation of the area rather than the exact condition that failed.'),
      mcq('A suite of many unit tests, few integration tests and a regression test per user-facing bug is well shaped because the last group:',
        [['Grows slowly and is worth most per test', true],
         ['Is cheapest to maintain of the three groups', false],
         ['Replaces the need for integration tests over time', false],
         ['Covers the paths that users exercise most often', false]],
        'It accumulates only when something actually failed, so every member is backed by evidence rather than by a guess about where risk lies.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_DEBUGGING',
    notes: `**Test suites that are green and wrong.**

## The four shapes

**A test with no assertion.** It calls the code and finishes. Green forever, whatever the code
does. Surprisingly common in suites written for coverage.

**A test asserting the wrong thing.** Checking that a function was called rather than that the
result is right. The call happening is not the behaviour anybody wanted.

**A test that passes for the wrong reason.** The setup accidentally produces the expected value
regardless of the code — a fixture whose default happens to match the assertion.

**A test that cannot fail.** Wrapped in a try/except that swallows, or asserting something
tautological like a value equalling itself.

## The one check that finds all four

**Break the code deliberately and see which tests notice.** Change a plus to a minus, invert a
condition, return a constant. **Any test that stays green was not testing that.**

That is mutation testing done by hand, and ten minutes of it tells you more about a suite than a
coverage report ever will.

## Applying it selectively

**On the most important function in the module.** You are not doing this for the whole codebase;
you are checking whether the tests protecting the thing that matters would notice if it broke.

## What to do with the answer

**Usually the test needs an assertion or a better one**, not more tests. A suite that fails this
check gets worse by being made larger.`,
    mcqs: [
      mcq('Breaking the code deliberately and seeing which tests stay green is a manual form of:',
        [['Mutation testing', true],
         ['Coverage analysis over the same test suite', false],
         ['Integration testing across the module boundary', false],
         ['Regression testing against a known past defect', false]],
        'Mutation testing introduces small faults and measures how many the suite detects. Doing it by hand on one function is cheap and highly informative.'),
      mcq('A test that passes for the wrong reason typically has a setup whose:',
        [['Default happens to match the assertion', true],
         ['Fixtures are shared with several other tests', false],
         ['Values are too large for the code to handle well', false],
         ['Order of operations differs from real usage here', false]],
        'The expected value arrives from the fixture rather than from the code, so the assertion holds whether or not the code under test works.'),
      mcq('A suite that fails the deliberate-breakage check gets worse by:',
        [['Being made larger', true],
         ['Being run more frequently in the pipeline', false],
         ['Having its coverage threshold raised further', false],
         ['Being split into unit and integration groups', false]],
        'More tests of the same kind add runtime and maintenance while detecting nothing extra, and increase the false confidence the suite already provides.'),
    ],
    checkpoint: [
      mcq('Asserting that a function was called rather than that the result is correct fails because:',
        [['The call happening is not the behaviour wanted', true],
         ['Mocking frameworks report calls unreliably at times', false],
         ['The assertion will break whenever the code is moved', false],
         ['It couples the test to the implementation structure', false]],
        'Nobody cares that a function ran. The value it produced is the behaviour, and a test not checking it passes on a function returning nonsense.'),
      mcq('The deliberate-breakage check is applied to the most important function rather than the whole codebase because the question being asked is whether:',
        [['The tests protecting what matters would notice', true],
         ['The suite as a whole reaches an acceptable standard', false],
         ['Coverage is evenly distributed across the modules', false],
         ['Any part of the codebase is entirely untested now', false]],
        'It is a spot check on the highest-stakes code, not an audit. Ten minutes there answers the question that matters most about the suite.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_PRACTICE',
    notes: `**Writing the test that would have caught it.**

## The drill

Each exercise gives you code and a bug report. **Write the test first, watch it fail, then fix.**

**Watching it fail is not optional.** A test written after the fix asserts what the code now
does, which is a tautology dressed as verification, and you will not find out.

## What is being built

**The reflex of reproducing before repairing.** Under time pressure the temptation is always to
see the bug, see the cause, and fix it — and most of the time that works, and the times it does
not are expensive because the wrong thing was fixed.

## The second half of each exercise

**Then apply the edge-case list to the function you just fixed.** Empty, one, many, duplicate,
absent, wrong type. Frequently the reported bug is one of a family and only one member was
reported.

**Finding the siblings is what separates fixing a bug from fixing a class of bug**, and it is a
distinguishing answer in an interview.

## Time yourself

**A test and a fix should be minutes.** Slowness here is usually the test setup being harder than
it should be, which is itself information: code that is hard to test is usually code with a
dependency that should have been a parameter.`,
    coding: [
      {
        title: 'The banding function, and the boundary',
        description: `Read lines of \`name score\`. Print \`<name> <band>\` for each, where the
band is \`low\` below 40, \`mid\` from 40 up to but not including 70, and \`high\` from 70
upwards.

Then print \`checked=N\`.

The boundaries are the point of this exercise: 39, 40, 69 and 70 must each land in the right
band.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        language: 'python',
        tests: [
          { input: 'a 39\nb 40\nc 69\nd 70\n', expectedOutput: 'a low\nb mid\nc mid\nd high\nchecked=4' },
          { input: 'x 0\ny 100\n', expectedOutput: 'x low\ny high\nchecked=2' },
          { input: '\n', expectedOutput: 'checked=0', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('Watching a test fail before applying the fix is not optional because otherwise the test may be asserting:',
        [['What the code now does, which is circular', true],
         ['A different case from the one that was reported', false],
         ['Behaviour that the fix has already changed once', false],
         ['A value that the fixture supplies rather than the code', false]],
        'A test written after a fix can easily agree with the fixed code without being sensitive to the bug. Only the failure establishes that it is.'),
      mcq('A test that is slow to write because the setup is difficult usually indicates code with:',
        [['A dependency that should have been a parameter', true],
         ['Too many branches to cover in a single test case', false],
         ['A performance problem that the test is exposing now', false],
         ['Insufficient documentation about its intended usage', false]],
        'Elaborate setup means the function reaches for things it was not given. Making those parameters is the change that makes it testable.'),
    ],
    checkpoint: [
      mcq('After fixing a reported bug, applying the edge-case list to the same function often reveals that the report was:',
        [['One member of a family of related faults', true],
         ['Describing a symptom rather than the actual cause', false],
         ['The only case where the function was ever wrong', false],
         ['Caused by a different function further upstream', false]],
        'Whatever produced one boundary error usually produced its neighbours too. Only the case somebody happened to hit gets reported.'),
      mcq('Fixing a class of bug rather than one instance is a distinguishing interview answer because it shows the candidate:',
        [['Investigated rather than patched the symptom', true],
         ['Had more time available to work on the problem', false],
         ['Is familiar with the standard vulnerability classes', false],
         ['Wrote more tests than the fix strictly required', false]],
        'Patching the reported case is the minimum. Finding its siblings requires understanding why it happened, which is what the question is looking for.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_INTERVIEW_QUESTION',
    notes: `**"How would you test this?"** — asked about a function they have just shown you, or
about your own solution.

## What they are listening for

**A method, not a list.** Anybody can name three cases. What distinguishes a candidate is
producing them systematically, so the interviewer can see the procedure rather than the
inspiration.

**Walk the list out loud.** Empty, one, many, duplicate, absent, wrong type. Then the boundaries:
just below, on, just above. **This takes forty seconds and is visibly complete.**

## The second thing they listen for

**What you would NOT test.** A candidate who says "I would not bother testing the getter, and
the framework's routing is already tested" has shown judgement about cost, which is rarer than
enumeration and more valuable.

## The follow-up that catches people

**"How would you know your tests are any good?"**

The strong answer is mutation: break the code deliberately and see whether the suite notices.
**The weak answer is coverage**, and it is weak because a hundred percent coverage with no
assertions is achievable, which the interviewer knows.

## When it is your own solution

**Test it out loud before they ask.** Run the sample, then an edge case you chose. Finding your
own bug at this point is among the strongest signals available in the whole round — it is the
behaviour the job actually requires, demonstrated rather than claimed.

## What loses marks

**"I would write unit tests."** True of everything, says nothing. The question was which ones and
why.`,
    mcqs: [
      mcq('Answering "how would you test this" by walking a fixed list aloud is stronger than naming three good cases because it shows:',
        [['A procedure rather than an inspiration', true],
         ['Greater coverage of the function’s behaviour', false],
         ['Familiarity with formal testing methodology', false],
         ['That the candidate has seen this function before', false]],
        'A procedure transfers to the next function. Three good cases demonstrate only that these three occurred to them on this occasion.'),
      mcq('Saying what you would NOT test demonstrates judgement about:',
        [['Cost, which is rarer than enumeration', true],
         ['Risk, which the interviewer will probe next', false],
         ['Coverage, and where it is worth pursuing fully', false],
         ['Scope, which keeps the answer suitably brief', false]],
        'Everybody can list things to test. Knowing where a test would cost more than it protects is what distinguishes experience from thoroughness.'),
      mcq('Answering "how would you know your tests are good" with coverage is weak because the interviewer knows that:',
        [['Full coverage with no assertions is achievable', true],
         ['Coverage tools report different numbers per language', false],
         ['Coverage is difficult to measure on integration tests', false],
         ['High coverage takes disproportionate effort to reach', false]],
        'The metric records execution rather than verification, and a suite can be fully green and fully worthless. Mutation answers the actual question.'),
    ],
    checkpoint: [
      mcq('Testing your own solution out loud before being asked is valuable because it demonstrates the verification habit:',
        [['Rather than claiming it', true],
         ['More quickly than answering the question would', false],
         ['Before the interviewer can find the bug first', false],
         ['In a way that is easier for them to score fairly', false]],
        'Everybody says they test their work. Doing it unprompted, in front of them, is the difference between an assertion and evidence.'),
      mcq('"I would write unit tests" loses marks because it is:',
        [['True of everything, and so says nothing', true],
         ['Incorrect for code that needs integration tests', false],
         ['Too brief an answer for the time allocated to it', false],
         ['A claim the candidate cannot support with examples', false]],
        'The question was which tests and why. A universally applicable answer contains no information about this function or this candidate.'),
    ],
  },
  {
    unitCode: 'T4_TESTING_DEPTH_MINI_PROJECT',
    notes: `**Take an untested module and make it safe to change.**

## The brief

Find something of a few hundred lines with no tests — your own earlier work, or a small
open-source project.

**Do not aim for coverage.** Aim for the property that you could refactor it confidently
afterwards, which is a different and harder target.

## The sequence

**Read it and list what it promises.** Not what it does line by line — what a caller relies on.
That list is your test plan.

**Write tests for the promises**, starting with the ones where a wrong answer would be quiet.

**Then apply the deliberate-breakage check.** Change a plus to a minus, invert a condition,
return a constant. Anything the suite does not notice is a gap, and fixing it usually means a
better assertion rather than another test.

**Then actually refactor something**, and see whether the suite catches you when you get it
wrong. Deliberately get it wrong once, to find out.

## What to record

**The promises you identified.** **Which of your tests survived the breakage check and which did
not.** **What the refactor felt like** — whether you trusted the suite, and whether that trust
turned out to be justified.

## Why this is the mini project

**Because a suite is only worth what it catches**, and the only way to know what a suite catches
is to break things under it. Writing tests and never testing the tests is the most common way a
codebase acquires a green suite and no safety.`,
    assignment: {
      title: 'Making an untested module safe to change',
      description: 'Put an untested module under test until you could refactor it confidently, then verify that claim by breaking it.',
      instructions: `Find a module of a few hundred lines with no tests. Your own earlier work is
ideal; a small open-source project is fine.

**Do not aim for coverage.** Aim for a suite good enough that you could refactor the module
confidently, which is a harder and more useful target.

**Start by listing what the module promises** — what a caller relies on, not what each line does.
That list is your test plan. Write tests for those promises, beginning with the ones where a
wrong answer would be silent rather than obvious.

**Then check the suite by breaking the code.** Change an operator, invert a condition, return a
constant. Note every mutation the suite fails to catch; the fix is usually a better assertion
rather than another test.

**Then refactor something for real, and deliberately get it wrong once**, to find out whether the
suite catches you.

**Submit:** the repository, and a note of no more than a page listing the promises you identified,
which mutations your suite caught and which it missed, and whether the suite caught your
deliberate mistake during the refactor.`,
      rubric: [
        { criterion: 'Promises identified, not lines covered', description: 'The note lists what callers rely on, and the tests follow that list rather than the structure of the code.', maxPoints: 25 },
        { criterion: 'The suite was checked by mutation', description: 'Several deliberate faults were introduced and the results recorded honestly, including the ones that went undetected.', maxPoints: 30 },
        { criterion: 'Gaps were closed by better assertions', description: 'Missed mutations led to improved assertions rather than to additional tests of the same kind.', maxPoints: 25 },
        { criterion: 'The refactor was actually attempted', description: 'A real change was made, a deliberate mistake introduced, and whether the suite caught it is reported either way.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Aiming for "I could refactor this confidently" rather than for coverage is a harder target because confidence requires the tests to:',
        [['Actually detect a change in behaviour', true],
         ['Execute every branch in the module at least once', false],
         ['Run quickly enough to be used during development', false],
         ['Be readable by somebody unfamiliar with the module', false]],
        'Coverage is achieved by execution. Confidence requires detection, and only breaking the code establishes whether detection is happening.'),
      mcq('Listing what a module promises rather than what it does produces a better test plan because promises are what:',
        [['Callers actually rely on', true],
         ['The original author intended to implement', false],
         ['Remain stable when the implementation changes', false],
         ['Can be verified without reading the source code', false]],
        'Tests should break when a caller would be broken. Testing implementation detail produces a suite that breaks on refactors and misses real regressions.'),
      mcq('A codebase with a green suite and no safety most commonly arose from:',
        [['Writing tests and never testing the tests', true],
         ['Writing too few tests for the size of the code', false],
         ['Testing at the wrong level of the system entirely', false],
         ['Allowing the suite to run against stale fixtures', false]],
        'Nothing in the ordinary workflow checks whether a test would fail. Without a deliberate mutation check, a suite can be entirely inert and look healthy.'),
    ],
  },

  /* ══ T4_DEBUG_DEPTH ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DEBUG_DEPTH_READING_A_TRACE',
    notes: `**Which frame is yours, which line is the cause, and why the top of the trace is
usually not it.**

## Reading order

**Bottom first** in Python: the exception type, the message, and where it was raised. Everything
above is the route taken to get there.

**Then find your own frames.** A trace through a library is mostly not your code, and the last
frame that belongs to you is usually where the wrong value entered.

## The line that failed is not the line that is wrong

**This is the whole skill.** \`None has no attribute 'name'\` fails where \`.name\` was accessed
and is caused wherever the \`None\` came from, which may be three functions away.

**So read the trace for the VALUE, not the line.** Where did this value come from? That question
walks you backwards to the cause, and the trace is the map.

## The exception type narrows it immediately

**TypeError or AttributeError involving None** — some function returned nothing on a path that
was taken.

**KeyError or IndexError** — a lookup against something that did not contain what was assumed.

**ValueError** — a conversion of data that was not what it claimed to be.

Each of those points at a different kind of cause, before you have read any code at all.

## When the trace is unhelpful

**Because the error was caught and re-raised somewhere**, losing the original. Or because it
crossed a thread or a process boundary. In both cases the useful move is to log the value at the
boundary and run again — the trace has told you everything it can.`,
    mcqs: [
      mcq('The line named in a traceback is where a bad value was:',
        [['First used, not where it was produced', true],
         ['Produced, and also where it was first used', false],
         ['Assigned, which is where the fix must go', false],
         ['Converted to the type that caused the failure', false]],
        'Execution fails at the point of use. The value may have travelled through several functions since it was created, and that origin is the cause.'),
      mcq('An AttributeError involving None most directly suggests that some function:',
        [['Returned nothing on the path that was taken', true],
         ['Was called with an argument of the wrong type', false],
         ['Raised an exception that was silently swallowed', false],
         ['Received None and failed to check for it first', false]],
        'A branch with no return yields None implicitly, and it surfaces wherever the caller first uses the result, which is typically elsewhere.'),
      mcq('A traceback that has lost the original cause is usually the result of an exception being:',
        [['Caught and re-raised, discarding the original', true],
         ['Raised inside a loop that ran many iterations', false],
         ['Produced by a library rather than by your own code', false],
         ['Formatted by a framework that truncates the output', false]],
        'Catching and raising a new exception without chaining loses the original frames, leaving a trace that points only at the handler.'),
    ],
    checkpoint: [
      mcq('Reading a traceback "for the value rather than the line" means asking:',
        [['Where this value came from', true],
         ['Which line of your own code appears last', false],
         ['What type the value was expected to have been', false],
         ['Whether the value is used anywhere else as well', false]],
        'The value carries the fault from its origin to the point of failure. Following it backwards through the frames is what reaches the cause.'),
      mcq('A KeyError points at a different kind of cause from a ValueError in that the first suggests:',
        [['An assumption about what a collection contained', true],
         ['A conversion of data that was not what it claimed', false],
         ['A function that returned nothing on some path', false],
         ['An index computed from a loop bound that was wrong', false]],
        'A KeyError means a lookup assumed a key that was absent. A ValueError means the data itself was not of the form the conversion required.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_NARROWING_IT_DOWN',
    notes: `**Bisecting, minimal reproduction, and changing one thing at a time.** These three
are one method, and together they are what separates debugging from flailing.

## Shrink the input

**Halve it. Does it still fail?** Keep halving. Ten steps takes a thousand-line input down to
one, and most faults become obvious the moment the input is small enough to read.

**This is faster than reading the code**, and it works on code you do not understand at all.

## Bisect the history

**\`git bisect\` finds the commit that introduced it in log n steps.** Twenty commits is five
tests. Most people do this linearly, or not at all, and spend an afternoon on what is twenty
minutes of mechanical work.

**It requires a reliable way to tell good from bad**, which is why the reproduction comes first.

## Change one thing

**A run is an experiment.** Two changes at once and the result cannot be attributed, so the run
has bought nothing — and if it now works, you have learned nothing you can use.

**The temptation is strongest when you are stuck**, which is exactly when the information is
worth most.

## Question the assumption, not just the code

**When nothing makes sense, one of your beliefs is wrong.** Print the thing you are sure about.
The variable that "obviously" holds a list. The branch that "obviously" runs. The file that is
"obviously" the one being loaded.

**It is almost always one of those**, and checking takes ten seconds against an hour of reasoning
from a false premise.

## Knowing when to stop and think

**Twenty minutes of no progress means the approach is wrong, not that more of it is needed.**
Step back, state what you know for certain and what you have assumed, and attack a different
assumption.`,
    mcqs: [
      mcq('Halving a failing input repeatedly is faster than reading the code and additionally works when you:',
        [['Do not understand the code at all', true],
         ['Have no version control history available to use', false],
         ['Cannot run the program in a debugging environment', false],
         ['Are unable to reproduce the failure consistently', false]],
        'The technique treats the program as a black box, so comprehension is not a prerequisite. That is what makes it usable on unfamiliar code.'),
      mcq('`git bisect` over twenty commits requires approximately:',
        [['Five tests, because it halves each time', true],
         ['Twenty tests, one for each of the commits', false],
         ['Ten tests, checking every second commit made', false],
         ['Two tests, at the start and end of the range', false]],
        'Binary search over the history is logarithmic. Log base two of twenty is under five, which is why the mechanical approach beats the linear one.'),
      mcq('When nothing makes sense, printing the thing you are certain about is worthwhile because:',
        [['One of your beliefs is wrong, usually that one', true],
         ['It rules out the most likely cause immediately', false],
         ['Certainty is frequently misplaced in unfamiliar code', false],
         ['The print statement may itself reveal a side effect', false]],
        'Reasoning that leads nowhere is usually built on a false premise. The premises are exactly the things not being checked because they feel settled.'),
    ],
    checkpoint: [
      mcq('Twenty minutes of debugging with no progress most likely means:',
        [['The approach is wrong, not that more is needed', true],
         ['The bug is genuinely difficult and needs more time', false],
         ['Somebody else should be asked to look at it now', false],
         ['The reproduction is unreliable and should be redone', false]],
        'Continued effort on a wrong approach produces more of nothing. Stepping back to separate what is known from what is assumed is what changes the outcome.'),
      mcq('Bisecting the history requires a reliable reproduction first because each step needs:',
        [['An unambiguous good-or-bad verdict', true],
         ['The full test suite to be run against it', false],
         ['A clean working directory at that commit', false],
         ['The same environment as the original failure', false]],
        'Binary search is only valid if every probe answers correctly. An intermittent reproduction produces a wrong verdict and sends the search down the wrong half.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_LOGGING_THAT_HELPS',
    notes: `**What to log, at what level, and why "here1" tells nobody anything at three in the
morning.**

## The test for a useful log line

**Could somebody who was not there reconstruct what happened?** If not, it is noise occupying
disk.

**"Processing order"** fails the test. **"Processing order 4471 for customer 88, 3 items, total
1240"** passes it, because the next question — which order, whose, how much — is already answered.

## Log the identifiers

**Every line should carry enough to join it to the others.** An order id, a request id, a user
id. Without them, a hundred interleaved requests produce a hundred unattributable lines.

**A request id threaded through everything** is the single highest-value logging decision in any
system that handles concurrent work.

## Levels, used properly

**ERROR** — something failed and somebody needs to know. **WARN** — something unexpected that was
handled. **INFO** — the milestones of normal operation. **DEBUG** — detail for when you are
investigating.

**The failure mode is everything at INFO**, which produces a volume nobody reads, and then the
one line that mattered is in it somewhere.

## What must never be logged

**Passwords, tokens, card numbers, personal data.** Logs are copied, shipped to third parties,
and retained far longer than anybody intends. **A secret in a log is a secret published**, and
redacting it afterwards does not un-copy it.

## Logging for the failure you have not had yet

**The best time to add logging is while you understand the code**, which is while you are writing
it. Added during an incident, it is guesswork under pressure, and the run that would have used it
has already happened.`,
    mcqs: [
      mcq('The test for a useful log line is whether somebody who was not there could:',
        [['Reconstruct what happened from it', true],
         ['Identify which module produced the line', false],
         ['Determine the severity of the event logged', false],
         ['Find the corresponding line in the source code', false]],
        'A log is read by somebody without the context of the moment. If it does not carry that context, it occupies disk without informing anybody.'),
      mcq('A request id threaded through every log line is valuable chiefly because it:',
        [['Lets interleaved lines be joined to one request', true],
         ['Reduces the total volume of logging produced', false],
         ['Allows the logs to be searched more efficiently', false],
         ['Identifies which server handled a given request', false]],
        'Concurrency interleaves output from many requests. Without a correlating identifier the lines are individually meaningful and collectively useless.'),
      mcq('A secret written to a log should be treated as published because logs are:',
        [['Copied, shipped and retained beyond intent', true],
         ['Readable by anybody with access to the server', false],
         ['Stored without encryption in most of the systems', false],
         ['Indexed by search tools that cannot be controlled', false]],
        'Aggregation, backups and third-party log services all copy the data. Redaction after the fact cannot reach the copies already made.'),
    ],
    checkpoint: [
      mcq('A system where everything is logged at INFO fails because the volume means:',
        [['The line that mattered is in there somewhere', true],
         ['Disk space is exhausted faster than expected', false],
         ['Logging becomes a performance bottleneck at load', false],
         ['Errors are suppressed by the surrounding noise level', false]],
        'The information is present and unreachable. Levels exist so that the important lines can be read without the routine ones drowning them.'),
      mcq('The best time to add logging is while writing the code because doing it during an incident is:',
        [['Guesswork under pressure, after the fact', true],
         ['Slower, because deployment takes additional time', false],
         ['Risky, since the change is untested in production', false],
         ['Ineffective, because the logs will not be read then', false]],
        'The understanding needed to choose what to record is present while writing and absent later. By the incident, the run that would have used it has passed.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_DEBUGGING',
    notes: `**Faults that do not reproduce reliably**, which is the hardest category and the one
worth a deliberate exercise.

## Why intermittent is harder

**You cannot bisect without a reliable verdict.** Every technique in the previous units assumes
you can tell good from bad, and an intermittent fault breaks that assumption at the root.

**So the first job is not finding the bug. It is making it reproducible.**

## The usual causes of intermittency

**Order.** Two things that can happen in either order, and one order is broken. Concurrency, but
also test suites that share state and pass or fail depending on which ran first.

**Time.** A timeout, a date boundary, something that behaves differently at midnight or at the
end of a month.

**Uninitialised or leftover state.** A cache, a global, a file left behind by the previous run.

**External dependency.** A network call that usually succeeds.

## Making it reproducible

**Run it a hundred times and record which failed**, alongside everything that varied. The
correlation is usually visible immediately and is far cheaper than reasoning.

**Then force the condition.** If order is suspected, force the bad order. If time is, set the
clock. **Turning "sometimes" into "always" is most of the work**, and the fix is frequently
obvious once you have.

## The trap

**A fix that makes it stop happening is not a fix.** An intermittent fault that becomes rarer has
possibly been fixed, and has possibly just had its timing shifted. **Only understanding the cause
distinguishes those two**, and the second one returns in production at a worse time.`,
    mcqs: [
      mcq('An intermittent fault breaks every technique in the previous units because those assume you can:',
        [['Tell a good run from a bad one reliably', true],
         ['Reproduce the fault on a smaller input as well', false],
         ['Read the code that is producing the failure', false],
         ['Access the version history of the failing code', false]],
        'Bisecting input and bisecting history are both binary searches, and a search whose probe sometimes lies converges on the wrong answer.'),
      mcq('The first job with an intermittent fault is to:',
        [['Make it reproducible, not to find it', true],
         ['Add logging around the suspected area first', false],
         ['Determine how frequently it actually occurs', false],
         ['Check whether it occurs in other environments too', false]],
        'Every diagnostic technique needs a reliable verdict. Turning "sometimes" into "always" is the step that makes all the others available.'),
      mcq('A change that makes an intermittent fault stop appearing may only have:',
        [['Shifted its timing rather than fixed it', true],
         ['Reduced the load enough to hide the problem', false],
         ['Moved the fault into a different code path', false],
         ['Made the failure silent rather than visible', false]],
        'Without understanding the cause, a rarer failure and a fixed one are indistinguishable. The first returns under production timing at a worse moment.'),
    ],
    checkpoint: [
      mcq('Running something a hundred times and recording what varied alongside each outcome is effective because the correlation is:',
        [['Usually visible immediately, and cheap to get', true],
         ['Statistically significant with that sample size', false],
         ['The only evidence available for a rare failure', false],
         ['Easier to explain to colleagues than reasoning is', false]],
        'Mechanical repetition produces data where reasoning produces hypotheses, and the pattern in the data typically identifies the variable at a glance.'),
      mcq('A test suite that passes or fails depending on which test ran first indicates:',
        [['Shared state between the tests', true],
         ['A concurrency fault in the code under test', false],
         ['Tests that are too slow and are timing out', false],
         ['A framework that runs tests in a random order', false]],
        'Order dependence means one test leaves something behind that another relies on or is broken by, which is shared state whatever form it takes.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_PRACTICE',
    notes: `**Finding faults in code you did not write, under time.**

## The routine

**Reproduce first.** Do not read the code until you can make it fail on demand.

**Then narrow.** Shrink the input, or bisect the history, or bisect the system — whichever
applies.

**Then read**, and only the part you have narrowed to.

**Then change one thing.**

## Why reading last

**Because reading is the slowest step and the most misleading.** Code reads as though it does
what it was intended to do; that is why the bug survived being written and reviewed. Narrowing
first means you read twenty lines instead of two thousand, and you read them looking for
something specific.

## What is being timed

**Not the fix. The diagnosis.** Most of these faults are one-line fixes once found, which is
typical. The skill is entirely in the finding.

## The habit that transfers

**Say what you know and what you assume, out loud.** In a pair-programming round this is
literally the assessment; in your own work it is what stops you spending an hour reasoning from
a false premise.

## When you are stuck at five minutes

**Check an assumption.** Print the value you are sure about. It is nearly always one of those,
and the check costs ten seconds.`,
    mcqs: [
      mcq('Reading the code last is recommended because reading is the slowest step and also the most:',
        [['Misleading, since code reads as intended', true],
         ['Difficult when the codebase is unfamiliar to you', false],
         ['Likely to introduce a new bug while you work', false],
         ['Dependent on knowing the language extremely well', false]],
        'The bug survived being written and reviewed because the code looks like it does the right thing. Narrowing first makes the reading targeted.'),
      mcq('These exercises time the diagnosis rather than the fix because most of the faults are:',
        [['One-line fixes once they have been found', true],
         ['Too large to fix within the time available', false],
         ['Intended to be diagnosed rather than repaired', false],
         ['In code the student is not permitted to change', false]],
        'That is the typical shape of real bugs. The effort is concentrated in locating the fault, and that is therefore what is worth practising.'),
    ],
    checkpoint: [
      mcq('Saying what you know and what you assume out loud is literally the assessment in:',
        [['A pair-programming round', true],
         ['A written technical round with debugging questions', false],
         ['A system design round involving failure scenarios', false],
         ['An HR round exploring how you handle difficulty', false]],
        'In pair programming the interviewer observes the process directly, so the separation of established facts from assumptions is the visible output.'),
      mcq('Being stuck at five minutes is a signal to check an assumption because the cost of checking is:',
        [['Ten seconds against an hour of false reasoning', true],
         ['Lower than asking a colleague for their opinion', false],
         ['Justified by how often assumptions prove wrong', false],
         ['Smaller than the cost of re-reading all the code', false]],
        'The asymmetry is what makes it the right move. A cheap check against an expensive failure mode should be taken every time it is available.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Tell me about the hardest bug you have found."**

## Why this question is so widely used

**Because it cannot be prepared from a book.** Either you have debugged something hard or you
have not, and the answer shows which within about thirty seconds.

**It also separates building from assembling.** Somebody who followed a tutorial has no war
story, because a tutorial that produces bugs is a bad tutorial.

## The structure that works

**The symptom.** What was observed, specifically. "It crashed" is not a symptom; "it returned the
previous customer's total, but only for the second request in a session" is.

**Why it was hard.** Intermittent? Only in production? No error at all?

**What you tried that did not work.** The strongest part of the answer and the part most
candidates omit. Wrong hypotheses eliminated are the substance of debugging, and including them
makes the story credible in a way a straight line to the answer never is.

**How you found it.** The technique, named. Bisected the input, added logging at a boundary,
diffed two environments.

**The cause, and the fix.** They are frequently far apart and the distance is interesting.

**What you changed afterwards.** A test, a log line, a habit. This is what says the experience
landed.

## The follow-up

**"How long did it take?"** Honesty is fine, including "three days". Long is not a weakness; long
with no method is.

## The answer that fails

**A description of a feature that was difficult to build.** That is a different question, and
giving it here suggests no hard bug is available to talk about.`,
    mcqs: [
      mcq('"Tell me about the hardest bug you have found" is widely used chiefly because it:',
        [['Cannot be prepared from a book', true],
         ['Takes little time to ask and to evaluate fully', false],
         ['Applies equally to candidates of any experience', false],
         ['Reveals which technologies the candidate has used', false]],
        'Every other technical question has study material behind it. This one requires having actually been stuck and worked out of it.'),
      mcq('Including the wrong hypotheses you eliminated makes the story more credible because a straight line to the answer:',
        [['Is not what debugging actually looks like', true],
         ['Suggests the bug was easier than it was claimed', false],
         ['Leaves the interviewer with no follow-up question', false],
         ['Implies somebody else identified the cause for you', false]],
        'Real debugging is a sequence of eliminated hypotheses. An account without any reads as reconstructed after the fact rather than remembered.'),
      mcq('Answering with a feature that was difficult to build suggests that:',
        [['No hard bug is available to talk about', true],
         ['The candidate misunderstood the question asked', false],
         ['The candidate works mainly on new development', false],
         ['Their projects were too small to contain real bugs', false]],
        'The question is specifically about diagnosis. Substituting a construction difficulty is what somebody does when they have no debugging story.'),
    ],
    checkpoint: [
      mcq('The element of a hardest-bug answer that most says the experience landed is:',
        [['What you changed afterwards as a result', true],
         ['How long the investigation eventually took you', false],
         ['The technical depth of the cause once it was found', false],
         ['Whether the bug had reached production at the time', false]],
        'A changed test, log line or habit is evidence the lesson generalised. Without it the story is an anecdote rather than experience.'),
      mcq('Answering "three days" to how long it took is acceptable because what would be a weakness is:',
        [['Three days with no method', true],
         ['Any duration longer than about a single day', false],
         ['Being unable to recall the duration accurately', false],
         ['Having needed help from a colleague to finish it', false]],
        'Hard bugs take time and everybody knows it. What the question probes is whether the time was spent systematically or spent flailing.'),
    ],
  },
  {
    unitCode: 'T4_DEBUG_DEPTH_MINI_PROJECT',
    notes: `**Find a real bug in a real codebase you did not write, and write up the
investigation.**

## The brief

**An open-source project with open issues is the natural source.** Pick one that is reproducible
and not trivially easy — a wrong result rather than a typo in a message.

**Reproduce it first.** Do not read the code until you can make it fail on demand. That is the
discipline the whole unit has been building.

## What to record as you go

**Keep a log while you work, not afterwards.** What you tried, what you expected, what happened.
Written afterwards it becomes a tidy narrative, and the tidiness is exactly what removes the
value: the wrong turns are the substance.

## The write-up

**Symptom.** Precisely, as an outsider would describe it.

**Reproduction.** The minimal one you got to, and how you shrank it.

**Hypotheses, in order, with what eliminated each.** Including the ones that were wrong,
especially those.

**Cause.** And how far it was from the symptom.

**Fix.** And a regression test that fails without it.

## Why the write-up is the deliverable

**Because the investigation is the skill and the fix is usually one line.** A write-up somebody
else could follow is also exactly the artefact a project interview asks for, and having written
one means the answer exists rather than being improvised.

## If you cannot find the cause

**Submit it anyway, with the hypotheses you eliminated.** An honest account of a failed
investigation demonstrates method, and method is what is being assessed. A tidy account of a
trivial bug demonstrates less.`,
    assignment: {
      title: 'A real bug, investigated and written up',
      description: 'Reproduce, diagnose and fix a real open issue in a codebase you did not write, and write up the investigation including the wrong turns.',
      instructions: `Find an open, reproducible issue in an open-source project you did not
write. Choose a wrong result rather than a typo — something where the cause is not visible from
the report.

**Reproduce it before reading any code.** That discipline is the point of the exercise.

**Keep a log while you work, not afterwards.** Each hypothesis, what you expected, what actually
happened, what it eliminated. Written up later it becomes a tidy narrative, and the tidiness
removes the value — the wrong turns are the substance.

**Submit:** a write-up of no more than two pages covering the symptom as an outsider would
describe it, the minimal reproduction you reached and how you shrank it, your hypotheses in order
with what eliminated each, the cause and how far it sat from the symptom, and a fix with a
regression test that fails without it.

**If you cannot find the cause, submit it anyway** with the hypotheses you eliminated. An honest
account of a failed investigation shows method; a tidy account of a trivial bug shows less.`,
      rubric: [
        { criterion: 'Reproduced before reading', description: 'The write-up shows a reliable reproduction was established first, and describes how it was minimised.', maxPoints: 25 },
        { criterion: 'Hypotheses and eliminations', description: 'Several hypotheses are given in order, including wrong ones, each with what ruled it out.', maxPoints: 30 },
        { criterion: 'Cause distinguished from symptom', description: 'The account separates where it failed from where it was caused, and says how far apart they were.', maxPoints: 25 },
        { criterion: 'A regression test that fails without the fix', description: 'A test exists and has been shown to fail against the unfixed code.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Keeping the investigation log while working rather than writing it afterwards matters because afterwards it becomes:',
        [['A tidy narrative, losing the wrong turns', true],
         ['Less accurate about the timings involved', false],
         ['Harder to write, since details are forgotten', false],
         ['A summary rather than a complete record of it', false]],
        'Hindsight reorganises the work into a straight line. The eliminated hypotheses are the actual content of debugging and are what tidying removes.'),
      mcq('Submitting a failed investigation with eliminated hypotheses is preferred to a tidy account of a trivial bug because what is assessed is:',
        [['Method, which the failed account still shows', true],
         ['Completion, which the trivial bug demonstrates', false],
         ['Difficulty, which a failed attempt cannot establish', false],
         ['Communication, which favours the tidier write-up', false]],
        'The investigation is the skill. A systematic failure demonstrates it; finding a typo quickly demonstrates nothing that transfers.'),
      mcq('Choosing a wrong result rather than a typo in a message matters because the cause must:',
        [['Not be visible from the report itself', true],
         ['Be located in a part of the code you can change', false],
         ['Involve more than one module of the codebase', false],
         ['Be something the maintainers have not yet found', false]],
        'If the report names the fix, there is no investigation to conduct and the exercise has nothing to exercise.'),
    ],
  },
];
