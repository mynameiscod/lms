/**
 * T4_BR_PROGRAMMING, T4_BR_CONTROL_FLOW and T4_BR_FUNCTIONS — twelve units. Module P02, days 1-3.
 *
 * ── THE HARD PART OF AUTHORING THIS MODULE ────────────────────────────────────────────────
 *
 * It covers the same subjects as Year 1. Values, conditions, loops, functions, scope — a
 * first-year met every one of them, and a fourth-year in this bridge is meeting them again
 * because their diagnostic said they did not stick.
 *
 * So the danger is not that the content is wrong. It is that it is the SAME content, and a
 * repeated question measures what somebody remembers of their first year rather than what this
 * bridge just taught. The duplicate-stem gate catches an exact match and cannot catch a
 * paraphrase, so the rule held here is stronger than the gate: **every question asks about a
 * consequence, not a definition.**
 *
 * Year 1 asks what a set is. This asks which structure answers "have I seen this before" in
 * constant time, and why the answer is not a list. Same subject, different question, and the
 * second one is the one an interview actually asks.
 *
 * ── AND WHY THAT IS RIGHT PEDAGOGICALLY, NOT JUST MECHANICALLY ────────────────────────────
 *
 * A fourth-year who is shaky on loops is not shaky because nobody told them what a loop is.
 * They are shaky because they never built the habit of tracing one. Re-delivering the Year-1
 * lesson would fail them for the second time in the same way. What is different here is the
 * angle: every unit starts from what goes wrong and works back.
 *
 * ── THE PACE IS DELIBERATELY UNCOMFORTABLE ────────────────────────────────────────────────
 *
 * Two lessons, a debugging exercise and a drill, per day, for a subject Year 1 spends a fortnight
 * on. That is what "ten days at most" means. A student who needs longer than this bridge offers
 * is being told something true, and the honest answer for them is Year 1 rather than a slower
 * Year 4.
 *
 * Attribution: T4_BR_PROGRAMMING defaults to PROGRAMMING_FUNDAMENTALS with INPUT_TO_ANSWER on
 * INPUT_OUTPUT_BASICS; T4_BR_CONTROL_FLOW to CONDITIONALS_BASICS with the loops units on
 * LOOPS_BASICS; T4_BR_FUNCTIONS to FUNCTIONS_BASICS with SCOPE on PYTHON_FUNCTIONS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BRIDGE_PROGRAMMING_BUNDLES: PilotBundle[] = [
  /* ══ T4_BR_PROGRAMMING ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_PROGRAMMING_VALUES_AND_TYPES',
    notes: `**A type is a promise about what you may do with a value**, and almost every
beginner bug in a placement paper is that promise being broken quietly.

## The three conversions that cost marks

**Input is always text.** \`input()\` and a line read from a file both give you a string, even
when it looks like a number. \`"10" + "5"\` is \`"105"\`, and the program does not crash — it
produces a wrong answer and carries on.

**Division changes the type.** \`7 / 2\` is \`3.5\` and \`7 // 2\` is \`3\`. When a problem says
"how many complete boxes", the second one is the answer and the first one is a bug that only
shows on some inputs.

**Comparing across types.** \`"10" < "9"\` is True, because strings compare character by
character. The same comparison on integers is False. A sort that looks wrong is very often this.

## Why this is a fourth-year topic at all

**Because the failure is silent.** A type error that crashes is free — you see it and fix it.
The expensive ones are the two values that combine without complaint and give an answer nobody
checks.

## The habit worth building

**Convert at the edge.** The moment a value enters your program, turn it into what it actually
is. Everything downstream then works on real numbers instead of on strings that happen to look
numeric, and the conversion failure — if there is one — happens at the one place you can handle
it.`,
    mcqs: [
      mcq('A program reads a count from input and compares it to 100 without converting it. On the input "9" the comparison behaves as though the value is:',
        [['A string, so "9" is greater than "100"', true],
         ['A number, because the comparison forces a conversion', false],
         ['Undefined, so the comparison raises an error at runtime', false],
         ['Zero, because the string could not be read as a number', false]],
        'Strings compare character by character, and "9" sorts after "1". The comparison succeeds and returns the opposite of what was meant.'),
      mcq('A problem asks how many whole crates fit in a lorry. Using / rather than // produces:',
        [['A fractional answer on most of the inputs', true],
         ['The correct answer, rounded down automatically for you', false],
         ['An error, because crates cannot be divided into pieces', false],
         ['The same answer, since Python truncates division anyway', false]],
        'True division keeps the remainder as a decimal. The count of whole crates needs floor division, and the difference only shows on some inputs.'),
      mcq('Converting input at the point it enters the program rather than where it is used means a bad value:',
        [['Fails once, in a place you can handle it', true],
         ['Fails silently and produces the wrong final result', false],
         ['Cannot occur at all, because conversion always succeeds', false],
         ['Fails later, at whichever line happens to use it first', false]],
        'Converting at the edge turns a diffuse problem into a single point of failure, which is the only place a sensible error message can be written.'),
    ],
    checkpoint: [
      mcq('A sort of version numbers puts "10" before "9". The cause is almost certainly that:',
        [['They are being compared as strings, not numbers', true],
         ['The sort was given a reverse flag it did not need', false],
         ['The list contained a duplicate that confused the sort', false],
         ['Version numbers cannot be sorted in a reliable manner', false]],
        'Character-by-character comparison puts "1" before "9", so "10" sorts first. It is the single most common cause of an odd-looking sort.'),
      mcq('Two values combine without an error and the result is wrong. Compared with a crash, this is:',
        [['Worse, because nothing tells you it happened', true],
         ['Better, because the program completed its run fully', false],
         ['The same, since both will be caught by the test suite', false],
         ['Better, because a wrong answer can be corrected later', false]],
        'A crash points at the line. A silent wrong answer travels into the output and is found, if at all, by whoever relies on it.'),
    ],
  },
  {
    unitCode: 'T4_BR_PROGRAMMING_INPUT_TO_ANSWER',
    notes: `**A program that runs is not the same as a program that is right**, and the gap
between the two is where placement papers are lost.

## The shape of almost every exercise

**Read everything. Compute over all of it. Print once.**

Most wrong answers break the middle step: they compute over the last line rather than over all
of them, because the calculation was written inside the reading loop and never had the whole
picture.

## Reading all of it first

Reading input into a list before computing costs three lines and removes an entire class of bug:

    import sys
    rows = [line.split() for line in sys.stdin if line.split()]

Now \`rows\` is the whole input and any pass over it can see everything.

## Printing exactly what was asked

**The format is part of the answer.** A judge comparing output does not know that your extra
blank line is cosmetic. Print what the problem asked for, in the order it asked, and nothing
else — no "Enter a number:" prompts, no decorative separators.

## The check that catches most of it

**Run your own example by hand before running the code.** Take the sample input, work the answer
out on paper, and compare. Where they disagree, you have learned something before spending
twenty minutes in a debugger.`,
    mcqs: [
      mcq('A program computes an average inside the loop that reads input. The result will be:',
        [['Based on the lines read so far, not on all of them', true],
         ['Correct, because the loop visits every line eventually', false],
         ['An error, since the total is not yet fully known there', false],
         ['Correct only when the input happens to be already sorted', false]],
        'Inside the reading loop the total is partial. Any figure derived there describes the prefix seen so far rather than the whole input.'),
      mcq('An otherwise-correct solution prints "Enter a number:" before its answer. An automated judge will:',
        [['Mark it wrong, because the output does not match', true],
         ['Accept it, since the prompt is obviously not the answer', false],
         ['Accept it only if the prompt is on its own separate line', false],
         ['Mark it wrong only when the prompt appears after output', false]],
        'A judge compares the output text exactly. Anything printed that was not asked for is a difference, whatever its purpose was.'),
      mcq('Working the sample input out by hand before writing code is useful mainly because it:',
        [['Reveals a misread problem before you invest time', true],
         ['Produces a faster solution than coding it directly does', false],
         ['Is required by most of the online judging platforms used', false],
         ['Removes the need to test the program on other inputs too', false]],
        'The most expensive mistake is solving the wrong problem well. Five minutes on paper catches that while it is still free.'),
    ],
    checkpoint: [
      mcq('A solution passes the sample and fails the hidden tests. The most likely single cause is:',
        [['An edge case the sample did not happen to contain', true],
         ['A syntax error that only appears on larger inputs given', false],
         ['The judge using a different version of the language now', false],
         ['The output format being wrong in a way the sample hid it', false]],
        'Samples are chosen to be illustrative, not exhaustive. Empty input, one item, duplicates and the maximum size are what hidden tests add.'),
      mcq('Reading all input into a list before computing is preferred in these exercises because it:',
        [['Lets any pass over the data see all of it', true],
         ['Uses substantially less memory than streaming does', false],
         ['Is faster than processing each line as it arrives is', false],
         ['Is the only approach that standard input supports here', false]],
        'Most of these problems need a second pass, or a total that is not known until the end. Holding the input makes that possible without care.'),
    ],
  },
  {
    unitCode: 'T4_BR_PROGRAMMING_DEBUGGING',
    notes: `**Three broken programs, and the habit of reading the error rather than guessing.**

## Read the last line first

A traceback is printed oldest-call-first, and **the line you need is almost always at the
bottom**: the exception type, the message, and the file and line where it happened. Everything
above it is the route taken to get there.

## The three that account for most of it

**TypeError** — you did something to a value that its type does not allow. Usually text where a
number was meant, and usually because a conversion was skipped at the edge.

**IndexError** — you reached past the end. Almost always a loop whose bound is one too high, or
an empty input nobody tested with.

**ValueError from int()** — the text was not a number. Frequently a stray blank line, or a
trailing space the split did not remove.

## Change one thing

**The discipline that separates debugging from flailing.** Make one change, run it, and see. Two
changes at once and you no longer know which one mattered — and if the program now works, you
have learned nothing you can use next time.

## When you cannot see it

**Print the value, not the code.** You believe you know what is in that variable. The error says
otherwise, and exactly one of you is right.`,
    mcqs: [
      mcq('A traceback is ten lines long. The line naming the actual failure is:',
        [['The last one, with the exception and message', true],
         ['The first one, where the program originally started off', false],
         ['The middle one, where the call stack is at its deepest', false],
         ['Whichever line mentions a file that you wrote yourself', false]],
        'Python prints the call chain oldest first and the failure last. Reading from the bottom gets you to the cause immediately.'),
      mcq('int() raises ValueError on a line that looks like a number. The most common hidden cause is:',
        [['Whitespace or a blank line that was not stripped', true],
         ['The number being far too large for an integer value', false],
         ['The file having been opened in the wrong access mode', false],
         ['A negative sign, which int() does not accept directly', false]],
        'A trailing newline or an empty final line is invisible when you read the file and is exactly what int() refuses.'),
      mcq('You change three things and the program starts working. The problem with this is that you:',
        [['Do not know which change actually fixed it', true],
         ['Have probably introduced a new bug somewhere else too', false],
         ['Cannot revert the changes if they turn out to be wrong', false],
         ['Have made the program harder for others to read now', false]],
        'Debugging is a search. Changing several variables at once destroys the information the run was supposed to give you.'),
    ],
    checkpoint: [
      mcq('An IndexError occurs only on some inputs. The first thing to check is:',
        [['Whether the failing input is empty or very short', true],
         ['Whether the list was declared with the correct size', false],
         ['Whether another thread is modifying the list at once', false],
         ['Whether the index variable was named the same as another', false]],
        'Loop bounds that are correct for a typical input are frequently wrong for zero or one element, which is what varies between runs.'),
      mcq('You are certain a variable holds a number and the error says otherwise. The useful next action is:',
        [['Print it, and its type, immediately before the line', true],
         ['Re-read the code carefully until the mistake appears', false],
         ['Add a conversion at that line and see if it then works', false],
         ['Assume the error message is misleading and look elsewhere', false]],
        'The disagreement is between your belief and the runtime. Printing the actual value settles it in seconds and re-reading rarely does.'),
    ],
  },
  {
    unitCode: 'T4_BR_PROGRAMMING_PRACTICE',
    notes: `**Repetition until the basics stop needing thought.**

## What is being drilled

**Reading input in whatever shape it arrives.** One value per line, several on a line, a count
followed by that many values. All three appear, and fumbling the reading costs time you needed
for the actual problem.

**Converting at the edge, every time**, until it is automatic rather than a thing you remember.

**Printing exactly what was asked.** No prompts, no extra spacing, the right number of decimal
places.

## How to use this

**Time yourself.** These should take minutes, not tens of minutes. If one takes twenty, that is
the signal — not the answer being wrong, but the reaching for it being slow.

**Do not look things up.** The point is what is available to you without help, because that is
what is available in a test.

## What a slow result means

**That this needs more days, and the bridge has ten of them.** It is not a verdict on you. It is
the reason the bridge exists, and finding out now is the whole purpose.`,
    coding: [
      {
        title: 'A count, then that many values',
        description: `The first line is \`n\`. The next \`n\` lines each hold one whole number.

Print the largest, the smallest, and their difference, each on its own line, in that order.`,
        starter: `import sys

lines = [l.strip() for l in sys.stdin if l.strip()]
n = int(lines[0])
`,
        language: 'python',
        tests: [
          { input: '4\n3\n9\n1\n7\n', expectedOutput: '9\n1\n8' },
          { input: '1\n5\n', expectedOutput: '5\n5\n0' },
          { input: '3\n-4\n0\n-9\n', expectedOutput: '0\n-9\n9', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('An exercise that should take four minutes takes twenty-five. The useful reading is that:',
        [['The reaching is slow, not the thinking wrong', true],
         ['The exercise was harder than it was meant to be here', false],
         ['More exercises of the same kind will not help with this', false],
         ['The answer was probably wrong as well as being slow', false]],
        'Correct but slow means the knowledge is there and unpractised. That is precisely what repetition fixes and what a timed round punishes.'),
      mcq('Looking up the syntax for reading input during practice defeats the purpose because a test:',
        [['Will not let you, and that is what is being measured', true],
         ['Is usually much shorter than a practice session is', false],
         ['Expects a different input format from practice exercises', false],
         ['Penalises candidates who have memorised things by rote', false]],
        'Practice is meant to measure what is available without help, because that is the only thing available when it counts.'),
    ],
    checkpoint: [
      mcq('A student reads input correctly but prints an extra blank line at the end. In a judged round this is:',
        [['A failure, despite the logic being entirely correct', true],
         ['Acceptable, because trailing whitespace is ignored here', false],
         ['A warning rather than a failure on most of the platforms', false],
         ['Only a problem when the output is more than one line long', false]],
        'Output comparison is textual. Whether a judge trims trailing whitespace varies, and assuming it does is how correct solutions score zero.'),
      mcq('Three inputs arrive in different shapes across three problems. The fourth-year habit is to:',
        [['Read the whole input, then shape it once', true],
         ['Write a different reading loop for each of the shapes', false],
         ['Use the shape the first problem used for all three of them', false],
         ['Ask the judge which of the shapes will actually be used', false]],
        'Reading everything and then splitting it handles all three shapes with one pattern, which is one thing to remember instead of three.'),
    ],
  },

  /* ══ T4_BR_CONTROL_FLOW ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_CONTROL_FLOW_CONDITIONS_AND_LOGIC',
    notes: `**A compound condition that reads correctly in English and means something else in
code** is one of the most reliable ways to lose a written round.

## The one that catches everybody

    if x == 1 or 2:

This reads as "if x is 1 or 2". It means "if x equals 1, or if 2 is truthy" — and 2 is always
truthy, so the condition is always true. **The program does not crash. It just never takes the
other branch.**

The correct form is \`if x == 1 or x == 2:\` or \`if x in (1, 2):\`.

## Order matters when one side can fail

    if user is not None and user.name == "root":

**Python stops evaluating as soon as the answer is known.** Reverse those two and a None user
raises an AttributeError. The guard has to come first, and this is why.

## not, and the double negative

\`if not (a and b)\` is \`if (not a) or (not b)\`. Getting this wrong flips the branch on exactly
the inputs where it matters. When a condition needs three \`not\`s, that is a signal to rewrite
it positively rather than to reason harder.

## The check that settles it

**Name the inputs that make it true.** Not "it looks right" — actually list them. A condition
you cannot enumerate the true cases for is a condition you do not yet understand.`,
    mcqs: [
      mcq('The condition `if x == 1 or 2:` behaves as:',
        [['Always true, whatever value x happens to hold', true],
         ['True when x is either 1 or 2, as it appears to', false],
         ['A syntax error caught before the program can run', false],
         ['True only when x is 1, and the 2 is simply ignored', false]],
        'It is read as (x == 1) or (2), and a non-zero integer is truthy, so the whole expression is true regardless of x.'),
      mcq('Swapping the two halves of `if user is not None and user.name == "x"` causes:',
        [['An error whenever user is None', true],
         ['The same behaviour, because and is commutative here', false],
         ['A slower check, but the same result in every case', false],
         ['An error only when user.name is itself set to None', false]],
        'Short-circuit evaluation is what makes the guard work. Evaluated first, the attribute access on None raises before the guard can help.'),
      mcq('A guard `if not (ready and valid)` is rewritten as `if not ready and not valid`. The rewrite now triggers only when:',
        [['Both are false, rather than when either one is', true],
         ['Either one is false, which was the original meaning', false],
         ['Both are true, which inverts the guard completely', false],
         ['Neither of the two has been assigned a value yet', false]],
        'Negating a conjunction gives a disjunction of the negations. The rewrite narrows the guard to the case where both fail, so every mixed case slips through it.'),
    ],
    checkpoint: [
      mcq('A branch is never taken and the program raises no error. The condition most likely contains:',
        [['A comparison written against a truthy constant', true],
         ['A comparison between two values of different types', false],
         ['An assignment where an equality test was intended to be', false],
         ['A function call that returns None instead of a boolean', false]],
        'A truthy constant on one side of an or makes the whole condition permanently true, so the alternative branch becomes unreachable silently.'),
      mcq('A condition needs three `not`s to express. The best response is to:',
        [['Rewrite it positively and invert the branches', true],
         ['Add brackets until the precedence is unambiguous now', false],
         ['Split it across several lines with a comment on each', false],
         ['Leave it, since the compiler resolves it correctly anyway', false]],
        'Correctness is not the issue; readability is, and a reader who misparses it will introduce the bug later. Positive form removes the trap.'),
    ],
  },
  {
    unitCode: 'T4_BR_CONTROL_FLOW_LOOPS_AND_STOPPING',
    notes: `**Almost every loop bug is about the ends**, and there are exactly three of them.

## One too many, one too few

\`range(n)\` gives \`0\` to \`n-1\`. \`range(1, n)\` gives \`1\` to \`n-1\`. **Neither includes
\`n\`**, and the moment a problem is stated in terms of "the first n items" rather than indices,
this is where the off-by-one arrives.

**The check:** run it mentally on n = 1. Most off-by-one errors are visible immediately at the
smallest input and invisible at every larger one.

## The loop that never ends

A \`while\` whose condition depends on something the body forgot to change. **The symptom is a
program that hangs**, and the cause is almost always a missing increment or a branch that skips
it.

## Stopping early, and what that skips

\`break\` leaves immediately. Anything after the loop body's current position does not run for
that iteration, and any total being accumulated stops where it stopped. That is usually what you
wanted and occasionally not, and the difference shows up in the summary line at the end.

## Modifying while iterating

**Removing items from a list you are looping over skips elements.** The loop advances its index
while the list shrinks underneath it. Build a new list instead; it is one line and it is correct.`,
    mcqs: [
      mcq('`for i in range(1, n)` over a list of n items visits:',
        [['Every item except the first one in the list', true],
         ['Every item in the list, starting from the first one', false],
         ['Every item except the last one in that list', false],
         ['Every item, but visiting the first one two times', false]],
        'Indices 1 through n-1 are visited, which is all of them except index 0. Starting at 1 skips the first element rather than including the last.'),
      mcq('A program hangs with no output. The most likely cause inside a while loop is:',
        [['A variable in the condition that is never updated', true],
         ['An input line that was longer than the buffer allowed', false],
         ['A recursive call that has not yet reached its base case', false],
         ['Output that is being buffered and not yet flushed out', false]],
        'A while condition that cannot become false is the standard cause of a hang. Usually a branch in the body skips the increment.'),
      mcq('Removing items from a list while looping over it causes some items to be:',
        [['Skipped, because the index advances past them', true],
         ['Visited twice, because the list is re-indexed each time', false],
         ['Removed twice, which raises an error on the second one', false],
         ['Left in place, because removal during a loop is ignored', false]],
        'The loop increments its position while the list shortens, so the element that moves into the vacated slot is never seen.'),
    ],
    checkpoint: [
      mcq('A loop is correct for every input except one item. The fastest way to have caught this is:',
        [['Tracing it on the smallest input by hand', true],
         ['Adding a print statement inside the body of the loop', false],
         ['Running it on the largest input that is allowed here', false],
         ['Checking the loop bound against the problem statement', false]],
        'Boundary errors are visible at n = 1 and hidden at n = 100. Tracing the smallest case is the cheapest check there is.'),
      mcq('A running total is wrong whenever the loop hits a `break`. The likely reason is that the total:',
        [['Was being added to after the break point', true],
         ['Is being reset somewhere inside the loop body itself', false],
         ['Overflows once the loop has run for enough iterations', false],
         ['Was declared inside the loop rather than before it', false]],
        'Break leaves the body immediately, so any accumulation written below it is skipped for that iteration and the total falls short.'),
    ],
  },
  {
    unitCode: 'T4_BR_CONTROL_FLOW_DEBUGGING',
    notes: `**Four loops that look right.** Your job is to say what each one actually does.

## How to approach a loop you did not write

**Pick the smallest input that exercises it** — usually zero items, then one, then two. Work
through by hand and write down the variables at each step. Most faults become obvious at the
second iteration.

**Then ask what the ends do.** Does the first item get processed? The last? A loop that is
correct in the middle and wrong at both ends is the most common shape there is.

## The four you will meet here

**A loop that misses the last element** because its bound is exclusive where the problem is
inclusive.

**A loop that processes the first element twice** because the accumulator was initialised from
it and then the loop started at zero.

**A loop whose condition is checked in the wrong place**, so an empty input still does one
iteration.

**A loop that modifies what it is iterating** and silently skips half of it.

## The trap

**They all produce plausible output.** None of them crashes, and on a friendly three-item input
two of them give the right answer. Deciding a loop is correct because a case passed is the habit
this unit is trying to break.`,
    mcqs: [
      mcq('An accumulator is set to the first element and the loop then starts at index 0. The first element is:',
        [['Counted twice in the final total', true],
         ['Counted once, because the assignment is overwritten', false],
         ['Skipped, because the loop starts after the assignment', false],
         ['Counted correctly, since the loop visits it only once', false]],
        'Seeding from the first element and then iterating over all elements includes it a second time, which is invisible on inputs where it is small.'),
      mcq('A do-while style loop that checks its condition after the body will, on empty input:',
        [['Run the body once before it can stop', true],
         ['Not run the body at all, exactly as intended here', false],
         ['Raise an error on the condition check afterwards', false],
         ['Loop forever, since the condition is never evaluated', false]],
        'Checking afterwards guarantees at least one execution, which is wrong whenever zero items is a legitimate input.'),
      mcq('A loop gives the right answer on a three-item input and the wrong one on a hundred items. This suggests the fault is:',
        [['In an end case that three items did not reach', true],
         ['In the arithmetic, which loses precision at that size', false],
         ['In memory, since a hundred items will not fit at once', false],
         ['Non-deterministic, appearing only on some of the runs', false]],
        'Small inputs frequently satisfy a broken bound by accident. Scaling up is what separates the middle of the loop from its ends.'),
    ],
    checkpoint: [
      mcq('You are handed a loop and told it is correct. The most efficient way to check is to:',
        [['Trace it on zero items, then one, then two', true],
         ['Read it carefully and compare it to the specification', false],
         ['Run it on the same inputs the author said they used', false],
         ['Rewrite it your own way and compare the two outputs', false]],
        'Three tiny traces take two minutes and catch the boundary family, which is where nearly all loop faults live.'),
      mcq('Two of four broken loops give the correct answer on the sample input. The lesson is that:',
        [['A passing case is not evidence of correctness', true],
         ['The sample input was chosen poorly by whoever wrote it', false],
         ['Those two loops are correct and the other two are not', false],
         ['More sample inputs would have caught all four of them', false]],
        'A test can only ever show the presence of a fault, never its absence. A loop that passes one case has told you about that case.'),
    ],
  },
  {
    unitCode: 'T4_BR_CONTROL_FLOW_PRACTICE',
    notes: `**Loops and conditions until they stop needing attention.**

## What is being drilled

**Bounds.** Inclusive, exclusive, and the translation between how a problem states a range and
how \`range()\` expresses one.

**Accumulating correctly.** A total, a maximum, a count of things matching a condition — each
initialised in a way that is right for empty input as well as for a full one.

**Nested loops, and knowing what each level is for.** The outer one usually walks items; the
inner one usually walks something about each item. Confusing the two produces code that works on
square inputs and fails on everything else.

## The habit to build

**State the cost before you write.** A loop inside a loop over the same n is n squared, and for
n of a hundred thousand that is not going to finish. Noticing before writing saves the twenty
minutes spent discovering it afterwards.

## Do the empty case

**Every exercise here has one**, and it is where the marks are. An average over zero items, a
maximum of nothing, a count that should be zero — decide what each should do before the test
tells you.`,
    coding: [
      {
        title: 'Longest run of the same value',
        description: `One line of whitespace-separated whole numbers.

Print the length of the longest run of identical consecutive values, then the value itself,
separated by a space. If several runs tie, report the one that starts earliest.

If the input is empty, print \`0 none\`.`,
        starter: `import sys

values = [int(v) for v in sys.stdin.read().split()]
`,
        language: 'python',
        tests: [
          { input: '1 1 2 2 2 3\n', expectedOutput: '3 2' },
          { input: '4 4 5 5\n', expectedOutput: '2 4' },
          { input: '\n', expectedOutput: '0 none' },
          { input: '7\n', expectedOutput: '1 7', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A maximum is initialised to zero and the input is all negative. The reported maximum is:',
        [['Zero, which is not present in the input at all', true],
         ['The largest negative value, as it should correctly be', false],
         ['An error, because no value exceeded the starting point', false],
         ['The smallest negative value in the whole of the input', false]],
        'Seeding from a constant assumes something about the data. Seeding from the first element, or from negative infinity, does not.'),
      mcq('Two nested loops both run over n items. At n = 100000 the program will:',
        [['Not finish in the time a round allows', true],
         ['Finish, but use substantially more memory than usual', false],
         ['Finish quickly, since each iteration is very cheap here', false],
         ['Fail with a recursion limit error part way through it', false]],
        'Ten billion iterations is far beyond any time limit. Recognising the cost before writing is what the drill is building.'),
    ],
    checkpoint: [
      mcq('An average is requested over a list that may be empty. The correct design decision is to:',
        [['Decide what empty means before writing the loop', true],
         ['Divide and let the error surface if it is ever empty', false],
         ['Return zero, which is the natural answer for no items', false],
         ['Assume non-empty, since the caller should check it first', false]],
        'Empty has no average, so the answer is a choice: an error, a sentinel, or a documented zero. Discovering it at runtime is not a choice.'),
      mcq('In a nested loop over items and their attributes, swapping the two levels typically:',
        [['Works on square input and fails on everything else', true],
         ['Produces the same result, since both are visited anyway', false],
         ['Is faster, because the inner loop becomes shorter here', false],
         ['Raises an index error immediately on the first iteration', false]],
        'When the two dimensions happen to be equal the indices remain valid, so the bug hides until a non-square input arrives.'),
    ],
  },

  /* ══ T4_BR_FUNCTIONS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_FUNCTIONS_PARAMETERS_AND_RETURNS',
    notes: `**A function that prints instead of returning is the single most common structural
habit separating second-year code from fourth-year code**, and it is worth understanding exactly
what it costs.

## What printing takes away

**Reuse.** The value went to the screen. Nothing else in the program can have it.

**Testing.** A test asserts on a returned value. A function that returns \`None\` and prints can
only be tested by capturing output, which nobody does for a placement exercise.

**Composition.** \`total(scores)\` can be passed to something else. \`print_total(scores)\`
cannot be passed anywhere.

## Return early, rather than nesting

    def classify(n):
        if n < 0:
            return "negative"
        if n == 0:
            return "zero"
        return "positive"

**Three returns, no nesting, and each case is visible on one line.** The alternative — an
if/elif/else assigning to a result variable returned at the end — is not wrong, and is harder to
read once the cases exceed three.

## One job per function

**The test:** can you name it without using "and"? \`read_and_validate\` is two functions wearing
one name, and the moment you want to validate something you did not read, it has to be split
anyway.

## Default arguments, and the one trap

**A mutable default is created once**, not per call. \`def add(item, into=[])\` shares that list
across every call that omits the argument, which produces a bug that looks like memory corruption
and is not.`,
    mcqs: [
      mcq('A function prints its result rather than returning it. The first thing this prevents is:',
        [['Any other code using the value it computed', true],
         ['Calling the function from more than one place at all', false],
         ['The function accepting more than one argument value', false],
         ['The function being defined in a separate module file', false]],
        'The caller receives None. Whatever was computed reached the screen and nothing downstream can act on it.'),
      mcq('`def add(item, into=[])` shares one list across calls because the default is created:',
        [['Once, when the function is defined', true],
         ['Once per call, but never reset between the calls', false],
         ['Only when the argument is explicitly passed as empty', false],
         ['Lazily, on the first call that actually omits it', false]],
        'Default values are evaluated at definition time and stored on the function, so every call that omits the argument shares the same object.'),
      mcq('A function named `read_and_validate` is a signal that it:',
        [['Does two jobs and will need splitting later', true],
         ['Has been named clearly and follows a good convention', false],
         ['Should be renamed, though its structure is fine as it is', false],
         ['Handles errors internally rather than raising them out', false]],
        'The "and" in a name usually names the seam. The split becomes forced the first time you need one half without the other.'),
    ],
    checkpoint: [
      mcq('A student cannot write a test for their own function. The most likely structural cause is that it:',
        [['Prints its result instead of returning it', true],
         ['Takes too many arguments to set up conveniently', false],
         ['Is defined inside another function and is not reachable', false],
         ['Depends on input that the test cannot easily provide it', false]],
        'Untestable almost always means the result is not returned. A test needs a value to assert on, and printing gives it nothing.'),
      mcq('Replacing a nested if/elif/else with three early returns chiefly improves:',
        [['How easily each case can be read on its own', true],
         ['The speed, since fewer branches are evaluated overall', false],
         ['Memory use, because no result variable is now needed', false],
         ['Correctness, since the nested version is usually wrong', false]],
        'Both forms are correct. Early returns put each case on one line at one indent, which is what keeps the function readable past three cases.'),
    ],
  },
  {
    unitCode: 'T4_BR_FUNCTIONS_SCOPE',
    notes: `**Where a name stops meaning anything**, and the bug that comes from being wrong
about it.

## The rule, briefly

**A name assigned inside a function is local to it.** It does not exist outside, and it does not
affect anything outside with the same name. A name only read, never assigned, is looked up
outward until it is found.

That second half is where the surprise lives: **reading a global works, assigning to one
silently creates a local instead.**

    count = 0
    def bump():
        count = count + 1   # UnboundLocalError

The assignment makes \`count\` local for the whole function, so the read on the right-hand side
refers to a local that does not have a value yet.

## Why globals are discouraged beyond style

**Because they make a function's behaviour depend on something not in its arguments.** Two calls
with identical arguments can give different answers, and the reason is somewhere else in the
file. That is what makes it hard to test and harder to debug.

## Mutation is not assignment

**Appending to a list passed in changes the caller's list.** No assignment happened, so no local
was created; the parameter and the caller's variable refer to the same object. This is the most
common way a function has an effect nobody expected.

## The habit

**Pass what you need in, return what you produce.** A function whose inputs are all arguments and
whose output is all return value can be reasoned about on its own, which is the whole point.`,
    mcqs: [
      mcq('Assigning to a name inside a function that also exists globally causes the name to be:',
        [['Local for the entire body of the function', true],
         ['Global, since the outer name already exists there', false],
         ['Local only from the assignment line onwards downward', false],
         ['Ambiguous, which raises an error when it is defined', false]],
        'Python decides scope for the whole function at compile time. One assignment anywhere makes the name local throughout it, including before that line.'),
      mcq('A function appends to a list it was passed. The caller’s list is:',
        [['Changed, because both names refer to one object', true],
         ['Unchanged, since the parameter is a separate copy of it', false],
         ['Changed only when the list was declared at global scope', false],
         ['Unchanged, unless the function explicitly returns the list', false]],
        'Passing does not copy. Mutating through the parameter mutates the same object the caller is holding, with no assignment involved.'),
      mcq('Two calls with identical arguments return different results. This implies the function:',
        [['Depends on state outside its own arguments', true],
         ['Contains a bug in the way it computes the result', false],
         ['Was called from two different places in the program', false],
         ['Is using a random value somewhere in its calculation', false]],
        'Identical inputs giving different outputs means something else is being read. A global, a file, a clock or a mutated default.'),
    ],
    checkpoint: [
      mcq('`UnboundLocalError` on a variable that is clearly defined above the function means:',
        [['The function assigns to that name somewhere', true],
         ['The outer definition executes after the function does', false],
         ['The name was misspelled at the point it was defined', false],
         ['The function was called before the name was assigned to', false]],
        'The assignment inside is what makes it local. The outer definition is irrelevant once the name has been claimed by the function body.'),
      mcq('A function is hard to test because its result depends on a module-level dictionary. The fix is to:',
        [['Pass the dictionary in as an argument', true],
         ['Reset the dictionary before each of the test cases', false],
         ['Move the dictionary inside the function body instead', false],
         ['Make the test read the same dictionary the function does', false]],
        'Making the dependency explicit is what makes the function reasonable about on its own. The alternatives all keep the hidden coupling.'),
    ],
  },
  {
    unitCode: 'T4_BR_FUNCTIONS_DEBUGGING',
    notes: `**Functions that return the wrong thing, or nothing, or something that changed
underneath the caller.**

## The three shapes

**Returns None unexpectedly.** Usually a branch with no \`return\` — the happy path returns and
an edge case falls off the end. Python does not warn; the caller gets \`None\` and fails later,
somewhere else.

**Returns the right value at the wrong time.** A \`return\` inside a loop that was meant to be
after it, so the function answers from the first item rather than from all of them.

**Mutates its argument.** The function is correct and the caller is broken, because the list it
passed in is no longer what it was.

## How to find which

**Check the return value at the call site first.** Printing what came back tells you immediately
whether the problem is inside the function or in what the caller does with it — and that halves
the search before you read a single line of the body.

## The one that takes longest

**A missing return on one branch**, because the symptom appears far from the cause. The caller
does something with \`None\`, that produces a second failure elsewhere, and the traceback points
at the second one.

**The tell:** \`TypeError\` or \`AttributeError\` involving \`None\` almost always means some
function did not return on the path that was taken.`,
    mcqs: [
      mcq('An error mentions None where an object was expected. The most likely cause is that some function:',
        [['Fell off the end of a branch without returning', true],
         ['Was given an argument of the wrong type by its caller', false],
         ['Raised an exception that was caught and then ignored', false],
         ['Returned before it had finished computing its answer', false]],
        'A branch with no return yields None implicitly. The failure then happens wherever the caller first uses it, which is not where the bug is.'),
      mcq('A function returns the result for the first item only. The likely cause is a return that is:',
        [['Inside the loop rather than after it', true],
         ['Missing entirely from the body of the function', false],
         ['Returning the loop variable rather than the total', false],
         ['Placed before the loop has a chance to start at all', false]],
        'A return inside the loop exits on the first iteration. The remaining items are never visited and the loop looks correct when read.'),
      mcq('Printing the return value at the call site is a good first step because it:',
        [['Says whether the fault is inside or outside', true],
         ['Shows which line inside the function is wrong here', false],
         ['Is faster than stepping through with a real debugger', false],
         ['Confirms that the function was actually called at all', false]],
        'It splits the search space in half in one step, which is worth more than any amount of careful reading of the body.'),
    ],
    checkpoint: [
      mcq('A caller’s list changes after passing it to a function that was not supposed to modify it. The function:',
        [['Mutated the object rather than rebinding a name', true],
         ['Returned a modified copy that the caller then assigned', false],
         ['Declared the parameter as global somewhere in its body', false],
         ['Was called twice, and the second call did the change', false]],
        'Rebinding a parameter is local and harmless. Calling append, sort or an item assignment on it reaches the caller’s object directly.'),
      mcq('A bug’s traceback points at a line that is clearly correct. The useful assumption is that:',
        [['A value arrived there already wrong', true],
         ['The traceback is reporting the wrong line number here', false],
         ['The line is correct but the one above it is not right', false],
         ['The error is in a library rather than in your own code', false]],
        'The failing line is where a bad value was first used, not where it was produced. Working backwards from it is the whole technique.'),
    ],
  },
  {
    unitCode: 'T4_BR_FUNCTIONS_PRACTICE',
    notes: `**Decomposition, until breaking a problem up is the first thing you do rather than
the thing you do when it gets messy.**

## What is being drilled

**Writing a function that returns.** Every exercise here produces a value that something else
consumes, so printing from inside will not pass.

**Naming without "and".** If the name needs one, split it before writing the body.

**Handling the empty case explicitly**, because every exercise has one and the hidden tests all
include it.

## The decomposition habit

**Before writing anything, list the steps.** Three or four verbs. Each verb is a function, each
function returns something, and the last one assembles the answer.

That sounds like overhead for a fifteen-line program. It is, for a fifteen-line program you get
right first time. It is what saves you on the one you do not, because a bug in a named step is
found in a minute and a bug in a fifteen-line blob is found in twenty.

## What "good" looks like here

**Every function fits on a screen, has a name you could say aloud, and could be tested on its
own.** None of that is style. All three are what make the thing debuggable under time pressure.`,
    coding: [
      {
        title: 'Words, grouped by length',
        description: `One line of whitespace-separated words.

For each distinct word length present, print \`<length>: <words>\` where the words are those of
that length, in the order they first appeared, separated by single spaces. Print the lengths in
increasing order.

If the input is empty, print \`empty\`.`,
        starter: `import sys

words = sys.stdin.read().split()


def group_by_length(items):
    """Return a dict of length -> list of words, preserving first-seen order."""
`,
        language: 'python',
        tests: [
          { input: 'to be or not to be\n', expectedOutput: '2: to be or to be\n3: not' },
          { input: 'a bb ccc\n', expectedOutput: '1: a\n2: bb\n3: ccc' },
          { input: '\n', expectedOutput: 'empty' },
          { input: 'one two six ten\n', expectedOutput: '3: one two six ten', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('An exercise asks for a value that something else then uses. Printing it from inside the function will:',
        [['Fail, because the caller receives None', true],
         ['Work, as long as the printed text is formatted right', false],
         ['Work, but be marked down for its style rather than logic', false],
         ['Fail only when the function is called more than once', false]],
        'The caller needs a value to work with. Printing puts it on the screen and hands the caller nothing at all.'),
      mcq('Listing the three or four steps before writing code helps most when:',
        [['The first attempt turns out to be wrong', true],
         ['The problem is simple enough to write in one go', false],
         ['The time limit is tight and planning is a luxury here', false],
         ['The solution is short enough to hold in your head fully', false]],
        'Named steps localise a fault to one of them. In a single undivided block the whole thing is the search space.'),
    ],
    checkpoint: [
      mcq('A fifteen-line solution has a bug and takes twenty minutes to find. Split into four named functions it would likely take:',
        [['Far less, because the fault is localised to one', true],
         ['The same, since the total amount of code is unchanged', false],
         ['Longer, because there is more structure to read through', false],
         ['Less only if each of the functions had its own tests', false]],
        'Checking four small functions independently narrows the search to one of them quickly. An undivided block offers nowhere to cut.'),
      mcq('Every exercise in this drill includes an empty-input test because empty is:',
        [['Where an unstated assumption usually shows', true],
         ['The easiest case for a student to handle correctly', false],
         ['Required by the judging platform for all of the problems', false],
         ['The only case that the sample inputs do not include here', false]],
        'Initialising a maximum, dividing by a count, taking a first element — each assumes there is something there, and empty is what says so.'),
    ],
  },
];
