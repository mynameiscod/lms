/**
 * The other six application units of the batch: clean code, interview problems, communication.
 * Companion to year2ContentApplication — the rationale for the whole batch is in that header.
 *
 * Attribution: CLEAN_CODE_REVIEW_PRACTICE is overridden to CODE_REVIEW, the two DSA units to
 * PATTERN_RECOGNITION and DSA_COMPLEXITY, and COMMUNICATION_MINI_PROJECT to
 * TECHNICAL_EXPLANATION. The rest take their topic default.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const APPLICATION_REST_BUNDLES: PilotBundle[] = [
  /* ══ T2_CLEAN_CODE ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_CLEAN_CODE_DEBUGGING',
    notes: `**Nothing is broken.** The tests pass, the feature works, and the next person to
change this file will break something. This unit is about seeing that before they do.

## Why this is a debugging unit

Because the fault is real and already present — it just has not fired yet.

**Every other debugging unit asks "why is this wrong?". This one asks "what will go wrong, and
who will it happen to?"** That is the same skill applied one step earlier, and it is the skill
a reviewer uses.

## What makes working code unsafe to change

**A function whose name does not match what it does.** Somebody will call it believing the name.
**The single most dangerous thing in this list**, because the reader has no reason to check.

**Two copies of the same rule.** The next change fixes one, and now the system disagrees with
itself depending on which path you take.

**A boolean parameter that switches behaviour.** \`process(order, true)\` tells the reader
nothing at the call site, so the wrong value gets passed eventually.

**State reached for rather than passed in.** A global, a module variable, a singleton. The
function works today because of something that happened earlier somewhere else.

**A long function with one comment per section.** Those comments are the names of functions
that should exist, and while they do not, nobody can change one section without reading all of
them.

**Error handling that swallows.** An empty catch turns a fault into a silence, so the next
failure is reported as "it just does not work".

**A default that is a mutable object.** Works on the first call, accumulates on the second.

**And a test that asserts what the code does rather than what it should.** It will pass through
the bug that breaks production and fail on the refactor that fixes it — **which is worse than
no test**, because it actively resists improvement.

## How to look

**Ask what the next likely change is.** "Add a second currency." "Support a second file
format." Then trace what you would have to touch. **Three places for one idea is the finding.**

**Read the call sites, not the function.** A function that is used wrongly in two of five places
has a naming problem, whatever the implementation looks like.

**And look for the comment that explains a surprise.** \`// must run before validate()\` is a
constraint the code does not enforce, and somebody will violate it.

## Reporting it

**Name the change that will break, not the style you dislike.**

**"This is confusing" is not actionable. "Adding a second payment type means editing these
three files, and missing any of them fails silently" is** — and it is the sentence that gets
the work scheduled, because it names a cost rather than a preference.

## What not to do

**Do not refactor while you are reading.** Record it, finish the read, then decide.

**Do not rewrite code you have no test around.** The evolving-code argument: characterise it
first.

**And do not report everything.** Three things somebody will act on beats fourteen they will
not.`,
    mcqs: [
      mcq('This is a debugging unit because:',
        [['The fault is already present and has not fired yet', true],
          ['Unreadable code usually contains bugs as well', false],
          ['Refactoring is how most faults are found', false],
          ['Reviewing and debugging use the same tools', false]],
        'It asks what will go wrong, and to whom.'),
      mcq('The most dangerous item in the list is:',
        [['A function whose name does not match what it does', true],
          ['Two copies of the same rule in different places', false],
          ['A boolean parameter that switches behaviour', false],
          ['An empty catch that swallows an error', false]],
        'The reader has no reason to check.'),
      mcq('A test that asserts what the code does is worse than no test because:',
        [['It passes the bug through and fails the refactor that would fix it', true],
          ['It gives false confidence in the coverage number', false],
          ['It has to be maintained alongside the code', false],
          ['It hides the absence of a real test', false]],
        'It actively resists improvement.'),
      mcq('The sentence that gets the work scheduled is one that:',
        [['Names a cost rather than a preference', true],
          ['Quantifies how much of the file is affected', false],
          ['Refers to an agreed standard being broken', false],
          ['Explains what the author should have done', false]],
        '"Adding a second payment type means editing these three files."'),
    ],
    checkpoint: [
      mcq('The way to find coupling is to ask:',
        [['What the next likely change is, then trace what it would touch', true],
          ['Which files change together most often in the history', false],
          ['How many other modules import this one', false],
          ['Whether the functions are short enough', false]],
        'Three places for one idea is the finding.'),
      mcq('A comment saying "must run before validate()" is:',
        [['A constraint the code does not enforce, so somebody will violate it', true],
          ['Adequate documentation of an ordering requirement like that', false],
          ['A sign the two functions should be merged', false],
          ['Better than leaving the order undocumented', false]],
        'Look for the comment that explains a surprise.'),
      mcq('A function used wrongly in two of five call sites has:',
        [['A naming problem, whatever the implementation looks like', true],
          ['Callers who did not read the documentation', false],
          ['Too many responsibilities to be used correctly anywhere', false],
          ['A signature that needs more type safety', false]],
        'Read the call sites, not the function.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_REVIEW_PRACTICE',
    notes: `Two exercises on reviewing consistently: ordering comments so the author can act on
them, and deciding what actually blocks a merge.`,
    coding: [
      {
        title: 'Ordering a review',
        description: `Read one comment per line as \`<id> <category>\`, where category is
\`correctness\`, \`design\`, \`tests\`, \`readability\` or \`style\`.

Print the ids in review order — correctness, design, tests, readability, style — **keeping the
original order within each category**. One per line as \`<id> <blocking|minor>\`, where only
\`correctness\` blocks.

Then \`blocking=<n>\`, and after it \`TOOLING <n>\` when there are two or more style comments,
because at that point the answer is a formatter rather than a reviewer.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Two or more style comments is a tooling problem, not a review one.
`,
        language: 'python',
        tests: [
          { input: '1 correctness\n2 style\n', expectedOutput: '1 blocking\n2 minor\nblocking=1' },
          { input: '1 style\n2 style\n', expectedOutput: '1 minor\n2 minor\nblocking=0\nTOOLING 2' },
          { input: '1 tests\n2 design\n3 correctness\n', expectedOutput: '3 blocking\n2 minor\n1 minor\nblocking=1' },
          { input: '1 readability\n', expectedOutput: '1 minor\nblocking=0' },
          { input: '9 style\n8 correctness\n7 style\n6 style\n', expectedOutput: '8 blocking\n9 minor\n7 minor\n6 minor\nblocking=1\nTOOLING 3', isHidden: true },
        ],
      },
      {
        title: 'Approve or block',
        description: `Read one change per line as
\`<name> <lines> <correctness_issues> <tests_added> <better_than_before>\`, where lines and
issues are numbers and the last two are \`yes\` or \`no\`.

Print, checking in this order:

- \`correctness_issues\` above 0 → \`BLOCK <name>\`
- \`lines\` above 400 → \`SPLIT <name>\`
- \`better_than_before\` is no → \`BLOCK <name>\`
- \`tests_added\` is no → \`APPROVE_WITH_COMMENT <name>\`
- otherwise → \`APPROVE <name>\`

Then \`approved=<n>\`, counting both approve outcomes.

**Missing tests do not block.** Approve and say so: blocking on a test for a change that is
already an improvement costs the team more than the missing test does.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Missing tests do not block. Approve with a comment.
`,
        language: 'python',
        tests: [
          { input: 'a 50 0 yes yes\n', expectedOutput: 'APPROVE a\napproved=1' },
          { input: 'a 50 2 yes yes\n', expectedOutput: 'BLOCK a\napproved=0' },
          { input: 'a 900 0 yes yes\n', expectedOutput: 'SPLIT a\napproved=0' },
          { input: 'a 50 0 no yes\n', expectedOutput: 'APPROVE_WITH_COMMENT a\napproved=1' },
          { input: 'a 50 0 yes no\nb 20 0 no yes\nc 800 1 yes yes\n', expectedOutput: 'BLOCK a\nAPPROVE_WITH_COMMENT b\nBLOCK c\napproved=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Reviewing Changes, One After Another',
      description: 'Order a review, decide what blocks, then review four real changes.',
      instructions: `Complete both exercises, then:

1. For the first: two style comments trigger a tooling note. Say what you would actually do
   about it, and who you would say it to.
2. For the second: missing tests do not block. Give a case where you would block for a missing
   test anyway.
3. For the second: a change over 400 lines is split even when it has no issues. Say what a
   reviewer honestly cannot do at that size.

**Then review four real open pull requests** on projects you can read.

4. **Read each whole change before writing a single comment.** Record how long that took.
5. Write the review in order: correctness, design, tests, readability, style.
6. Mark every comment blocking or minor.
7. Name one specific thing that is good in each.
8. Decide: approve, approve with comment, block, or ask to split. Say why in one sentence.

**Then review the reviews.**

9. How many of your comments were correctness? If it was none across four changes, say what
   that suggests — about the changes or about your reading.
10. How many were style? If it was most of them, what should be automated instead?
11. **Which of your comments would you drop** if you could only send three?
12. Ask one author for feedback on your review, if you can, and record what they said.`,
      rubric: [
        { criterion: 'Review ordered correctly', description: 'All cases, stable within category, with the tooling note.', maxPoints: 15 },
        { criterion: 'Merge decisions correct', description: 'All cases, in the stated order, with tests not blocking.', maxPoints: 15 },
        { criterion: 'Four real changes reviewed', description: 'Whole change read first with the time recorded, comments in order.', maxPoints: 25 },
        { criterion: 'Blocking marked and a verdict given', description: 'Every comment marked, a decision per change with a reason.', maxPoints: 15 },
        { criterion: 'Something good named each time', description: 'Specific, not flattery.', maxPoints: 10 },
        { criterion: 'The reviews reviewed', description: 'Correctness and style counts examined, three comments chosen, feedback sought.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a 50 0 yes yes\n', expectedOutput: 'APPROVE a\napproved=1' },
          { input: 'a 50 2 yes yes\n', expectedOutput: 'BLOCK a\napproved=0' },
          { input: 'a 900 0 yes yes\n', expectedOutput: 'SPLIT a\napproved=0' },
          { input: 'a 50 0 no yes\n', expectedOutput: 'APPROVE_WITH_COMMENT a\napproved=1' },
          { input: 'a 50 0 yes no\nb 20 0 no yes\nc 800 1 yes yes\n', expectedOutput: 'BLOCK a\nAPPROVE_WITH_COMMENT b\nBLOCK c\napproved=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A reviewer honestly cannot, on a 900-line change:',
        [['Hold enough of it in mind to see what is missing', true],
          ['Check that the tests cover the new paths', false],
          ['Read every line within a reasonable time', false],
          ['Judge whether the design fits the codebase', false]],
        'Which is why size is checked before anything but correctness.'),
      mcq('You would block for a missing test when:',
        [['The change fixes a fault that would otherwise return unnoticed', true],
          ['The project requires tests on every change as a rule', false],
          ['The author has omitted tests before', false],
          ['The change touches more than one module', false]],
        'Otherwise approve and say so.'),
      mcq('Most of your comments being style suggests:',
        [['A formatter or linter should be doing that work', true],
          ['The codebase has no agreed conventions', false],
          ['The change was of unusually good quality', false],
          ['You read the change too quickly', false]],
        'Attention spent on style is spent on the cheapest thing available.'),
    ],
  },

  /* ══ T2_DSA_INTERVIEW ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DSA_INTERVIEW_DEBUGGING',
    notes: `**A solution that passes the example and fails the test.** This is the commonest way
an interview problem is lost by somebody who understood it.

## Why the given example never catches it

**It is chosen to explain the problem, not to test it.** \`[2, 7, 11, 15]\`, target \`9\` —
ordinary values, no duplicates, no negatives, more than one element, an answer that exists.

**Every interesting input is missing from it.** So code that handles the example is code that
has been tested against the easiest case anybody could have picked.

## The faults, in the order they occur

**The empty input.** A maximum of nothing, a first element that is not there, a loop body that
never runs and returns an uninitialised value.

**One element.** Anything comparing pairs does nothing. Anything taking \`i\` and \`i + 1\` reads
past the end.

**Duplicates.** A map from value to index keeps only the last occurrence, so a problem needing
two equal values returns one index twice — **the single most common wrong answer in the
two-sum family**, and it passes the given example every time.

**The answer that does not exist.** What is returned? A sentinel, an empty result, an
exception? Decided in the last thirty seconds, usually wrongly.

**Negatives and zero.** A running maximum initialised to zero is wrong the moment every value
is negative.

**The boundary of the loop.** \`range(n)\` against \`range(n - 1)\`, and \`<\` against \`<=\`. Correct
on every input except the edge.

**And mutation of the input** while iterating it, which skips elements silently.

## Finding it in two minutes

**Run the four inputs.** Empty, one, two identical, all negative. **Out loud, by hand, before
saying you are done** — that sentence is the whole technique and it costs less than a minute.

**Then check the return on the no-answer path.** Trace it: what actually comes back?

**Then check the loop bounds** by asking what the last value of the index is and whether the
code reads beyond it.

## When it is already failing

**Do not reread the whole solution.** Find out which input fails and work that one by hand.

**A failing case is worth more than any amount of staring**, and if the failing input is hidden,
construct the four above and find your own.

## In an interview

**Say you are checking the cases, and name them.** The interviewer is watching for exactly
this, and doing it out loud converts a private habit into the thing being assessed.

**And when you find your own fault, say so.** The debugging topic made the same point: an
unacknowledged correction reads as not having noticed.`,
    mcqs: [
      mcq('The given example never catches the fault because:',
        [['It is chosen to explain the problem rather than to test it', true],
          ['It is usually too small to exercise the logic', false],
          ['Interviewers pick examples that hide edge cases', false],
          ['It only covers the path the author had in mind', false]],
        'Ordinary values, no duplicates, an answer that exists.'),
      mcq('The single most common wrong answer in the two-sum family comes from:',
        [['A value-to-index map keeping only the last occurrence of a duplicate', true],
          ['Failing to handle the case where no answer exists', false],
          ['An off-by-one in the loop bound', false],
          ['Initialising a running maximum to zero', false]],
        'And it passes the given example every time.'),
      mcq('The whole technique of this unit is:',
        [['Running empty, one, two identical and all negative out loud before saying you are done', true],
          ['Tracing the return value on every path', false],
          ['Checking the loop bounds against the last index', false],
          ['Writing a brute-force version to compare against', false]],
        'It costs less than a minute.'),
      mcq('A running maximum initialised to zero is wrong when:',
        [['Every value is negative', true],
          ['The list contains a zero', false],
          ['The list is empty', false],
          ['The values are unsorted', false]],
        'Negatives and zero, which the given example never has.'),
    ],
    checkpoint: [
      mcq('When a solution is already failing a hidden case you should:',
        [['Construct the four standard inputs and find your own failing one', true],
          ['Reread the whole solution from the top rather carefully', false],
          ['Rewrite it with a different approach', false],
          ['Add print statements through the loop', false]],
        'A failing case is worth more than any amount of staring.'),
      mcq('Checking the cases out loud in an interview:',
        [['Converts a private habit into the thing being assessed', true],
          ['Uses up time better spent on the implementation', false],
          ['Signals that you are unsure of the solution', false],
          ['Is only worth doing if you find something', false]],
        'The interviewer is watching for exactly this.'),
      mcq('Anything taking index i and i plus one, given one element:',
        [['Reads past the end', true],
          ['Returns the element unchanged', false],
          ['Skips the loop body safely', false],
          ['Behaves as it does for the empty case', false]],
        'The one-element case reads past the end of the list.'),
    ],
  },

  {
    unitCode: 'T2_DSA_INTERVIEW_HARDER_SET',
    notes: `**Problems where the first idea is correct and will not pass.** Timed practice
teaches you to reach an answer; this teaches you to reach one that meets the limit.

## The move this unit is about

**You have a working solution. It is too slow. Now what?**

Not "think harder". There is a short list of transformations, and recognising which applies is
most of competitive problem solving — and all of the interview version of it.

## The transformations, by what they remove

**A nested loop over pairs, into a single pass with a map.** You are asking "have I seen the
complement?" — that is a lookup, not a search. **Removes a factor of n and it is the most
frequently applicable move there is.**

**A repeated scan of a range, into a running total.** Prefix sums, or a single accumulator.
Any time the inner loop recomputes something the outer loop already knew.

**A repeated search of a sorted range, into two pointers.** When the data is sorted, or you can
sort it, walking from both ends replaces searching.

**A repeated minimum or maximum, into a heap.** When you need the extreme repeatedly and the
set changes.

**Recomputing the same subproblem, into a table.** The recursion is right; it is being asked
the same question thousands of times.

**And an exhaustive check, into a mathematical property.** Rare, and the one that feels like
cheating when it works.

## Recognising which

**Say the complexity of what you have**, then say where the time goes. "I am scanning the whole
list inside a loop over the list, so it is quadratic, and the inner scan is asking one question
repeatedly."

**That sentence names the transformation.** A repeated question with a fixed answer is a map; a
repeated question over a moving window is a running total; a repeated extreme is a heap.

**And check the constraints.** They are the hint. n up to a hundred allows cubic; up to a
million does not allow anything worse than n log n, and that alone eliminates most approaches
before you write any code.

## What to do when you cannot find it

**Say the brute force, its complexity, and that it will not pass.** Then say what you are
looking for: "I need to avoid rescanning, so I want a structure that answers this in constant
time."

**That is a strong position, not a weak one** — it is exactly the reasoning the question is
testing, and a candidate who reaches it has demonstrated most of what is being assessed even
without the final answer.

**And implement the brute force if time is running out.** Correct and slow, with the faster
approach described, beats an unfinished attempt at the fast one.`,
    coding: [
      {
        title: 'Pairs summing to a target, with duplicates',
        description: `Read a target on the first line and a list of integers on the second.

Print the number of **distinct index pairs** \`i < j\` whose values sum to the target.

The quadratic solution is correct. Write the single-pass one: for each value, ask how many
complements have been seen so far. **A map from value to a count, not to an index** — which is
the fix for the duplicate fault in the debugging unit.

Print one number.`,
        starter: `import sys

lines = sys.stdin.read().split('\\n')
target = int(lines[0])
nums = [int(x) for x in lines[1].split()] if len(lines) > 1 and lines[1].strip() else []

# Count of complements seen, not the index of the last one.
`,
        language: 'python',
        tests: [
          { input: '9\n2 7 11 15\n', expectedOutput: '1' },
          { input: '4\n2 2 2\n', expectedOutput: '3' },
          { input: '0\n-1 1 -1 1\n', expectedOutput: '4' },
          { input: '5\n1 2 3\n', expectedOutput: '1' },
          { input: '100\n1 2 3\n', expectedOutput: '0', isHidden: true },
        ],
      },
      {
        title: 'The largest sum in any window of k',
        description: `Read \`k\` on the first line and a list of integers on the second.

Print the largest sum of any \`k\` consecutive values. When \`k\` is larger than the list, or
the list is empty, print \`none\`.

The obvious solution recomputes each window. Write the one that does not: **slide the window,
adding the entering value and subtracting the leaving one.**

Values may be negative, so a running maximum must start from the first real window rather than
from zero — the fault the debugging unit named.`,
        starter: `import sys

lines = sys.stdin.read().split('\\n')
k = int(lines[0])
nums = [int(x) for x in lines[1].split()] if len(lines) > 1 and lines[1].strip() else []

# Slide the window. Start the maximum from the first real window, not from zero.
`,
        language: 'python',
        tests: [
          { input: '2\n1 2 3 4\n', expectedOutput: '7' },
          { input: '3\n-5 -1 -2 -9\n', expectedOutput: '-8' },
          { input: '1\n4\n', expectedOutput: '4' },
          { input: '5\n1 2\n', expectedOutput: 'none' },
          { input: '2\n-1 -1 -1\n', expectedOutput: '-2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'When the Obvious Approach Is Too Slow',
      description: 'Write the single-pass versions, then work a timed set where brute force will not pass.',
      instructions: `Complete both exercises, then:

1. For the first: the map holds counts rather than indices. Say what breaks with indices, and
   which input in the set proves it.
2. For the second: the maximum starts from the first window. Say which test catches starting at
   zero instead.
3. For both: state the complexity before and after, and where the time went.

**Then a timed set: six problems, thirty minutes each.**

Pick problems whose constraints rule out the obvious approach — n up to a hundred thousand or
more.

4. **Before coding, write down:** the brute force, its complexity, and whether it passes.
5. If it does not, name which transformation you are reaching for, from the list in the notes.
6. Code it. Run the four standard inputs before submitting.
7. Record: did you find the faster approach, and how long did recognising it take?

**Then review the six.**

8. Which transformation came up most?
9. **Which one did you fail to recognise?** Name it, and write the sentence that would have
   pointed at it.
10. For any you did not solve, write the position you would have given an interviewer: brute
    force, complexity, and what you were looking for.
11. Redo one you failed, a day later, and record whether recognition was faster.`,
      rubric: [
        { criterion: 'Pair counting correct', description: 'All cases, counting complements rather than storing an index.', maxPoints: 15 },
        { criterion: 'Sliding window correct', description: 'All cases, including negatives and a window larger than the list.', maxPoints: 15 },
        { criterion: 'Complexity stated before and after', description: 'For both exercises, with where the time went.', maxPoints: 10 },
        { criterion: 'Six problems under a real clock', description: 'Brute force and its complexity written before coding each.', maxPoints: 25 },
        { criterion: 'Transformations named', description: 'The one reached for on each problem, from the list.', maxPoints: 20 },
        { criterion: 'Reviewed and one redone', description: 'The missed transformation named, and a repeat attempt timed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = sys.stdin.read().split('\\n')
target = int(lines[0])
nums = [int(x) for x in lines[1].split()] if len(lines) > 1 and lines[1].strip() else []
`,
        tests: [
          { input: '9\n2 7 11 15\n', expectedOutput: '1' },
          { input: '4\n2 2 2\n', expectedOutput: '3' },
          { input: '0\n-1 1 -1 1\n', expectedOutput: '4' },
          { input: '5\n1 2 3\n', expectedOutput: '1' },
          { input: '100\n1 2 3\n', expectedOutput: '0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The most frequently applicable transformation is:',
        [['A nested loop over pairs into a single pass with a map', true],
          ['A repeated scan into a running total', false],
          ['A repeated search of sorted data into two pointers', false],
          ['A repeated subproblem into a table', false]],
        'It removes a factor of n and comes up constantly.'),
      mcq('The constraints are the hint because:',
        [['A limit of a million eliminates most approaches before any code is written', true],
          ['They indicate which data structure the author had intended', false],
          ['They tell you how much memory is available', false],
          ['They reveal whether the input is sorted', false]],
        'n up to a hundred allows cubic; a million does not.'),
      mcq('Saying the brute force, its complexity, and what you are looking for is:',
        [['A strong position, because it is the reasoning being tested', true],
          ['An admission that you cannot solve it', false],
          ['Worth doing only when time is nearly gone', false],
          ['Less useful than simply attempting the fast approach', false]],
        'And implement the brute force if time runs out.'),
    ],
  },

  /* ══ T2_COMMUNICATION ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_COMMUNICATION_HARDER_PRACTICE',
    notes: `**The same explanation, for three readers who will not read it the same way.** A
message that works on a colleague at their desk fails on a busy one, and fails differently on
one who disagrees.

## The three readers

**The busy one.** Fifteen seconds. Reads the first line and the headings. **Writing for them is
the default** — the other two also read the first line.

**The sceptical one.** Will look for the hole. Needs the number, the version, the thing you
actually checked.

**The one who disagrees.** Has a position already. Needs to see their objection named before
they will read your answer to it.

## What changes and what does not

**The conclusion first, always.** For all three. A narrative that builds to the answer is for a
story.

**The evidence moves.** For the busy reader it is a link. For the sceptical one it is in the
message, with the numbers.

**The objection moves.** For the disagreeing reader it goes near the top: "The obvious answer
is X, and here is why it does not work here." **Naming their position before your own is the
whole technique**, because a reader who has not seen their objection acknowledged is arguing
rather than reading.

**And the ask never moves.** Every message ends with what you want.

## Writing for somebody who will not reply

**The test is whether they can act without asking you anything.**

Which means: the specific number, not "slow". The exact name, not "the service". The deadline,
not "soon". And what happens if they do nothing.

**Read it back as them, and answer every question it raises.** Each unanswered one is a reply
you will have to write anyway, and a day lost while you wait for it.

## The three failures worth drilling

**The buried conclusion.** Four paragraphs of context and the answer at the bottom. **Nobody
gets there.**

**The unstated ask.** A complete, accurate message that does not say what it wants, so nothing
happens and you conclude people ignore you.

**And the wall.** Correct, thorough, and one block of text. **A wall does not get read whatever
is in it**, which makes thoroughness an active cost past a certain length.

## The drill

**Write one thing three times — for the busy reader, the sceptical one and the one who
disagrees.** Same facts, same conclusion, different weight.

**Then cut each by half** and see what you lose. Usually nothing, which is the lesson.`,
    coding: [
      {
        title: 'Can they act on it',
        description: `Read one message per line as
\`<name> <conclusion_first> <has_ask> <has_specifics> <under_200_words>\`, each \`yes\` or
\`no\`.

Print, checking in this order:

- \`has_ask\` is no → \`NO_ASK <name>\`
- \`conclusion_first\` is no → \`BURIED <name>\`
- \`has_specifics\` is no → \`VAGUE <name>\`
- \`under_200_words\` is no → \`TOO_LONG <name>\`
- otherwise → \`SEND <name>\`

Then \`send=<n>\`.

**The missing ask is checked first.** A message with no ask produces no action however well it
is written, so it is the one failure that makes the others irrelevant.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# No ask means no action, however good the rest is.
`,
        language: 'python',
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'SEND a\nsend=1' },
          { input: 'a yes no yes yes\n', expectedOutput: 'NO_ASK a\nsend=0' },
          { input: 'a no yes yes yes\n', expectedOutput: 'BURIED a\nsend=0' },
          { input: 'a yes yes no yes\n', expectedOutput: 'VAGUE a\nsend=0' },
          { input: 'a yes yes yes no\nb no no no no\n', expectedOutput: 'TOO_LONG a\nNO_ASK b\nsend=0', isHidden: true },
        ],
      },
      {
        title: 'Which reader is this for',
        description: `Read one message per line as \`<name> <objection_named> <numbers_inline>\`,
each \`yes\` or \`no\`, and print who it is written for:

- objection named and numbers inline → \`ANY_READER <name>\`
- objection named only → \`DISAGREEING <name>\`
- numbers inline only → \`SCEPTICAL <name>\`
- neither → \`BUSY_ONLY <name>\`

Then \`any=<n>\` counting the \`ANY_READER\` lines.

\`BUSY_ONLY\` is not a failure — it is the right shape for a short update, and writing every
message for every reader is how a two-line note becomes a page.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Writing for every reader at once is how a note becomes a page.
`,
        language: 'python',
        tests: [
          { input: 'a yes yes\n', expectedOutput: 'ANY_READER a\nany=1' },
          { input: 'a yes no\n', expectedOutput: 'DISAGREEING a\nany=0' },
          { input: 'a no yes\n', expectedOutput: 'SCEPTICAL a\nany=0' },
          { input: 'a no no\n', expectedOutput: 'BUSY_ONLY a\nany=0' },
          { input: 'p yes yes\nq no no\nr yes yes\n', expectedOutput: 'ANY_READER p\nBUSY_ONLY q\nANY_READER r\nany=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Writing for Somebody Who Has No Time',
      description: 'Judge whether a message can be acted on, then write one three ways and cut each in half.',
      instructions: `Complete both exercises, then:

1. For the first: the missing ask is checked before everything else. Say why, and give a message
   you have actually sent that had no ask.
2. For the second: \`BUSY_ONLY\` is not a failure. Say when writing for every reader at once is
   the wrong choice.
3. For the second: say what "numbers inline" means for a message with no numbers in it.

**Then write one real thing three times.**

Use something true: a bug you found, a decision you made, a change you want to propose.

4. **For the busy reader.** Conclusion first, under a hundred words, one ask.
5. **For the sceptical reader.** Same conclusion, with the numbers and what you checked.
6. **For the reader who disagrees.** Their position named before yours, then why it does not
   hold here.
7. **Then cut each by half.** Record what you lost, and whether it mattered.

**Then test one.**

8. Send the busy version to somebody who does not know the context.
9. Record every question they asked back. **Each one is a sentence the message should have had.**
10. Rewrite it so those questions do not arise, and say what you added.
11. Finally: which of the three was hardest to write, and what does that tell you about how you
    normally write?`,
      rubric: [
        { criterion: 'Actionability judged', description: 'All cases, with the ask checked first.', maxPoints: 15 },
        { criterion: 'Reader identified', description: 'All cases, including busy-only as a legitimate shape.', maxPoints: 15 },
        { criterion: 'One thing written three ways', description: 'Same conclusion, weight moved for each reader.', maxPoints: 25 },
        { criterion: 'Each cut by half', description: 'With what was lost recorded and judged.', maxPoints: 15 },
        { criterion: 'Tested on a real reader', description: 'Sent, questions recorded, rewritten so they do not arise.', maxPoints: 20 },
        { criterion: 'An honest conclusion', description: 'Which was hardest, and what that says about your usual writing.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a yes yes yes yes\n', expectedOutput: 'SEND a\nsend=1' },
          { input: 'a yes no yes yes\n', expectedOutput: 'NO_ASK a\nsend=0' },
          { input: 'a no yes yes yes\n', expectedOutput: 'BURIED a\nsend=0' },
          { input: 'a yes yes no yes\n', expectedOutput: 'VAGUE a\nsend=0' },
          { input: 'a yes yes yes no\nb no no no no\n', expectedOutput: 'TOO_LONG a\nNO_ASK b\nsend=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Naming the reader’s objection before your own position:',
        [['Is the whole technique, because otherwise they argue rather than read', true],
          ['Concedes too much ground before you have made your case', false],
          ['Is only needed when they outrank you', false],
          ['Works better at the end, after the evidence', false]],
        'For the reader who disagrees.'),
      mcq('Every question a reader asks back is:',
        [['A sentence the message should have had, and a day lost waiting', true],
          ['A sign they read it carefully', false],
          ['Unavoidable for any sufficiently complex subject', false],
          ['Better handled in a conversation', false]],
        'Read it back as them and answer them in advance.'),
      mcq('Thoroughness becomes an active cost when:',
        [['The message turns into a wall, which does not get read whatever is in it', true],
          ['It takes far longer to write than the reader will ever spend', false],
          ['The detail exceeds what the decision needs', false],
          ['It invites more questions than it answers', false]],
        'Past a certain length, correct and complete stops being read.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_MINI_PROJECT',
    notes: `Explain something you built, in writing and then out loud, to somebody who has not
seen it.

**The measurement is what they can say back.** Not whether your explanation felt clear — whether
a listener who knew nothing can state what it does and what was hard about it, in their own
words, afterwards.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Explaining Something You Built',
      description: 'A written explanation and a live one, tested against what the listener can repeat back.',
      instructions: `**Choose** something you built. A Year-2 project, a mini project, anything
of your own with a decision in it.

**Part one — the written version**

1. One sentence: what it does and who for. **In domain language, not technology.**
2. Three sentences: the problem it solves.
3. The shape: five components at most, and the data between them.
4. **The hardest part**, specifically: what you tried, what did not work, what did.
5. One decision, with the alternative you rejected and why.
6. What you would change.
7. The technologies, at the bottom, in one line.

**Four hundred words at most.** Then cut it by a quarter.

**Part two — the live version**

8. Five minutes: what it does, show it working, the shape, the hard part, what is next.
9. **Rehearse it out loud once, timed.** Record the time and where you ran over.
10. Have the thing open and working before you start, with data already in it.

**Part three — test both**

11. Give the written version to somebody who has not seen the project. **Do not explain
    anything first.**
12. Ask them afterwards: what does it do, and what was hard? **Write down their exact answers.**
13. Then present the live version to somebody else.
14. Ask the same two questions. Write down those answers too.

**Part four — the honest part**

15. Compare what you said with what they repeated back. **Name the gap.**
16. Which landed better, the written or the live version? Say why you think so.
17. Which question did you struggle to answer? There will be one.
18. **What did they ask that you had not thought about?**
19. Rewrite the one-sentence version using their words rather than yours.

**Submit** the written explanation before and after the rewrite, your rehearsal timing, both
sets of answers verbatim, and the comparison.`,
      rubric: [
        { criterion: 'A written explanation in the right order', description: 'Purpose before technology, under four hundred words, then cut.', maxPoints: 20 },
        { criterion: 'The hardest part told properly', description: 'What was tried, what failed, what worked, and one decision with its alternative.', maxPoints: 20 },
        { criterion: 'A rehearsed live version', description: 'Five minutes, timed out loud, with the thing open and populated.', maxPoints: 15 },
        { criterion: 'Tested on two people who did not know it', description: 'No explanation first, both sets of answers recorded verbatim.', maxPoints: 20 },
        { criterion: 'The gap named', description: 'What they repeated against what you said, and which format landed better.', maxPoints: 15 },
        { criterion: 'Rewritten in their words', description: 'The one-sentence version, using the listener’s language.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('This project is measured by:',
        [['What a listener who knew nothing can say back afterwards', true],
          ['Whether the explanation covered every component', false],
          ['How clear the written version reads', false],
          ['Whether the live version stayed within five minutes', false]],
        'Not whether it felt clear to you.'),
      mcq('The listener should be given the written version:',
        [['With no explanation first, because that is the real condition', true],
          ['After a short introduction to the project', false],
          ['Alongside a short demonstration of the working thing', false],
          ['Once they have asked what it is about', false]],
        'Otherwise you are testing your introduction, not the document.'),
      mcq('Recording their answers verbatim rather than summarising matters because:',
        [['Your summary would replace their words with your own, which is what is being tested', true],
          ['Exact quotes are rather easier to compare between two people', false],
          ['It produces evidence for the submission', false],
          ['Paraphrasing loses detail about the project', false]],
        'The gap between what you said and what they repeated is the finding.'),
    ],
  },
];
