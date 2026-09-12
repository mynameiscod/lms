/**
 * T_PSEUDOCODE and T_BOOLEAN — two complete topics, thirteen units.
 *
 * ── WHY THESE TWO ─────────────────────────────────────────────────────────────────────────
 *
 * They are the last two prerequisite chains the capacity audit reported as "never written",
 * and each one blocks a VERIFICATION unit — T_MILESTONE_EARLY_CHECKPOINT depends on
 * T_PSEUDOCODE_PRACTICE, and T_MILESTONE_QUANT_CHECKPOINT on T_BOOLEAN_PRACTICE. Verification
 * has exactly eight units against a peak need of eight, so two of them being unschedulable is
 * the one remaining deficit with no slack at all to absorb it.
 *
 * They also supply FOUNDATION instruction, ADVANCED_UNIVERSAL, two PRACTICE and two APPLICATION
 * units on the way.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Pseudocode is usually treated as a formality students write after the code, which is exactly
 * backwards and teaches nothing. Every unit here is built on the claim the topic has to earn:
 * that a mistake caught in the plan costs seconds and the same mistake caught in code costs an
 * hour.
 *
 * Boolean algebra is usually taught as symbol manipulation for an exam. Here every law is tied
 * to a condition a student has already written, because De Morgan's law is not a theorem to
 * memorise — it is the thing that untangles the conditional they wrote last week.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PSEUDOCODE_BOOLEAN_BUNDLES: PilotBundle[] = [
  /* ── T_PSEUDOCODE ─────────────────────────────────────────────────────── */
  {
    unitCode: 'T_PSEUDOCODE_WHY_PSEUDOCODE',
    notes: `Pseudocode is the plan for a program, written in plain language. Writing it first feels
like a detour and is the fastest route to working code.

**The claim this topic has to earn:** a mistake caught in the plan costs seconds; the same
mistake caught in code costs an hour. Here is why that is true rather than a slogan.

**Code makes you solve two problems at once.** What should happen, and how to express it in a
language. Those are genuinely separate, and doing both together means a logic error and a syntax
error look the same while you are stuck. Planning first separates them: the plan is only about
what should happen, and when it is right, the code is a translation.

**Errors surface where they are cheap.** A missing case in pseudocode is a line you add. The
same missing case discovered after two hours of coding means re-reading your own logic, working
out where it should go, and reworking what is already written.

**It survives the language.** A plan written properly can be implemented in Python, C or
JavaScript. The thinking transfers; the syntax does not.

**Somebody else can check it.** A classmate who does not know your language can read your plan
and say "what happens if the list is empty?" — which is the single most valuable question
anybody asks about a program, and they cannot ask it of code they cannot read.

**What it is not.** Not a different programming language with rules to learn. Not a formality
written after the code to satisfy a submission requirement — that version is worthless and is
why many students conclude the whole idea is pointless.

**When to skip it.** A five-line program you have written twenty times before. The plan is
already in your head, and writing it down adds nothing. **The test: can you state every step and
every edge case out loud right now?** If yes, write the code. If you hesitate anywhere, that
hesitation is exactly what the plan would have caught.`,
    mcqs: [
      mcq('Why does planning first make coding faster overall?',
        [['It separates deciding what should happen from expressing it, so errors of each kind are distinguishable', true],
          ['Pseudocode is quicker to type', false],
          ['It is required by the course', false],
          ['It reduces the number of lines', false]],
        'Solving both problems at once is what makes a logic error and a syntax error look the same while you are stuck.'),
      mcq('A classmate who does not know your language can still:',
        [['Read the plan and ask what happens on empty input', true],
          ['Compile it', false],
          ['Estimate performance', false],
          ['Nothing useful', false]],
        'The single most valuable question anybody asks about a program, and they cannot ask it of code they cannot read.'),
      mcq('Pseudocode written AFTER the code is:',
        [['Worthless, and the reason many students conclude the idea is pointless', true],
          ['Good documentation', false],
          ['Useful for review', false],
          ['The normal practice', false]],
        'It records what was built rather than shaping it, so none of the benefits apply.'),
      mcq('When is skipping the plan reasonable?',
        [['When you can state every step and every edge case out loud right now', true],
          ['For any short program', false],
          ['When you are in a hurry', false],
          ['Never', false]],
        'Hesitating anywhere is precisely what the plan would have caught, which makes the test self-administering.'),
    ],
    checkpoint: [
      mcq('A plan written properly can be implemented in several languages because:',
        [['It describes what should happen, not how to express it', true],
          ['Languages are all similar', false],
          ['Pseudocode is a standard', false],
          ['It cannot be', false]],
        'The thinking transfers and the syntax does not, which is why the plan outlives the language choice.'),
      mcq('A missing edge case costs least when discovered:',
        [['In the plan', true], ['During coding', false], ['In testing', false], ['In review', false]],
        'It is a line you add, rather than logic to re-read and written code to rework.'),
    ],
  },
  {
    unitCode: 'T_PSEUDOCODE_WRITING_PSEUDOCODE',
    notes: `Three structures cover every program ever written: **sequence**, **decision** and
**repetition**. Pseudocode is those three, written so any language could implement them.

**Sequence** — steps in order:

    READ the list of marks
    CALCULATE the total
    CALCULATE the average as total divided by count
    DISPLAY the average

**Decision:**

    IF average is at least 40 THEN
        DISPLAY "Pass"
    ELSE
        DISPLAY "Fail"
    END IF

**Repetition:**

    FOR each mark IN the list
        ADD mark to total
    END FOR

    WHILE the user has not entered 0
        READ the next number
    END WHILE

**There is no official syntax**, and that is a feature rather than a gap. Use capitals for
keywords, indent the blocks, and be consistent within one document. Anybody should be able to
read it.

**The two rules that make a plan useful:**

**1. Every step must be something a person could actually carry out.** "Handle the data" is not
a step; it is the problem restated inside the solution. If you cannot begin a step, break it
down further.

**2. Be specific about the things you will get wrong in code.** "Check the mark" is vague. "IF
mark is at least 40" commits to the boundary, and the boundary is where the bug lives. **A plan
that is vague exactly where code is tricky has skipped the hard part.**

**What to leave out.** Variable declarations, types, imports, memory, syntax. The plan is about
logic, and adding language machinery makes it code with worse tooling.

**Worked shape** — the largest of a list:

    SET largest TO the first item
    FOR each remaining item
        IF item is greater than largest THEN
            SET largest TO item
        END IF
    END FOR
    DISPLAY largest

Notice that the empty-list case is not handled, and that the plan makes the gap visible in four
lines rather than hiding it in thirty.`,
    workedExample: `**Goal: plan a program that reports whether each student passed, plus the class average.**

**Step 1 — restate the problem.** For a list of students with marks: for each, say pass or fail;
then report the average of all marks. Pass is 40 or above.

**Step 2 — first attempt:**

    FOR each student
        IF mark >= 40 THEN DISPLAY name, "Pass" ELSE DISPLAY name, "Fail"
    END FOR
    DISPLAY the average

**Step 3 — read it critically.** Two problems, both visible without writing any code:

- The average is never calculated. "DISPLAY the average" is not a step anybody could carry out.
- Nothing says what happens with no students.

**Step 4 — the corrected plan:**

    IF the list of students is empty THEN
        DISPLAY "No students"
        STOP
    END IF

    SET total TO 0

    FOR each student IN the list
        IF student's mark is at least 40 THEN
            DISPLAY student's name, "Pass"
        ELSE
            DISPLAY student's name, "Fail"
        END IF
        ADD student's mark TO total
    END FOR

    SET average TO total divided by the number of students
    DISPLAY "Class average:", average

**Step 5 — check each step is executable.** \`SET total TO 0\` yes. \`ADD mark TO total\` yes.
\`SET average TO total divided by count\` yes — and the guard at the top is what makes the
division safe, which is now visible rather than assumed.

**What the plan bought.** Two bugs found before any code: a missing calculation and a division
by zero. In code, the first would have been a puzzling undefined and the second a crash on the
one input nobody tested.

**And the boundary is committed to.** "At least 40" rather than "above 40" is written down, so
the code cannot quietly disagree with the specification.`,
    mcqs: [
      mcq('Which is NOT one of the three structures?',
        [['Declaration', true], ['Sequence', false], ['Decision', false], ['Repetition', false]],
        'Types and declarations are language machinery, and putting them in a plan makes it code with worse tooling.'),
      mcq('"Handle the data properly" fails as a step because:',
        [['Nobody could carry it out — it restates the problem inside the solution', true],
          ['It is too short', false],
          ['It lacks a keyword', false],
          ['It is fine', false]],
        'The test for a finished step is that you could begin it, and this one cannot be begun.'),
      mcq('Why write "IF mark is at least 40" rather than "check the mark"?',
        [['It commits to the boundary, which is where the bug lives', true],
          ['It is longer', false],
          ['It matches the code', false],
          ['No reason', false]],
        'A plan vague exactly where code is tricky has skipped the hard part and bought nothing.'),
      mcq('There is no official pseudocode syntax. That is:',
        [['A feature — the point is readability, and consistency within one document is enough', true],
          ['A problem', false],
          ['Why it is unreliable', false],
          ['False; there is a standard', false]],
        'A standard would make it a language, which reintroduces the second problem planning exists to remove.'),
    ],
    checkpoint: [
      mcq('The largest-of-a-list plan does not handle an empty list. What has the plan done well?',
        [['Made the gap visible in four lines instead of hiding it in thirty', true],
          ['Nothing; it is incomplete', false],
          ['Handled it implicitly', false],
          ['Avoided the issue', false]],
        'Finding the gap is the purpose; a plan that hid it would be the failure.'),
      mcq('Which belongs in code rather than in a plan?',
        [['Variable types and imports', true],
          ['The decision boundary', false],
          ['The empty-input case', false],
          ['The order of steps', false]],
        'The other three are logic decisions and are exactly what the plan exists to settle.'),
    ],
  },
  {
    unitCode: 'T_PSEUDOCODE_FLOWCHARTS',
    notes: `A flowchart is the same logic as a picture. It is worth knowing when a diagram beats a
list, and — just as usefully — when it does not.

**The shapes, and there are only five worth using:**

| Shape | Means |
|---|---|
| Rounded rectangle | Start or end |
| Rectangle | A step |
| Diamond | A decision, with labelled branches |
| Parallelogram | Input or output |
| Arrow | Flow |

**A decision diamond has exactly one way in and two ways out**, labelled Yes and No. Unlabelled
branches are the commonest flowchart mistake and make the diagram ambiguous.

**When a flowchart genuinely helps:**

- **The paths split and rejoin.** Seeing which routes reach which point is hard in a list and
  obvious in a picture.
- **Explaining to somebody non-technical.** A diagram needs no conventions explained.
- **Loops with an exit in the middle**, where the shape of the control flow is the thing you are
  reasoning about.

**When a list is better:**

- A straight sequence with no branching. A flowchart of eight boxes in a line is a list drawn
  slowly.
- Anything long. A flowchart that needs a second page is harder to follow than the text.
- Detailed logic, where the boxes become too small for the words that matter.

**The honest summary:** flowcharts are excellent for showing SHAPE and poor for showing DETAIL.
Pseudocode is the reverse. Use a flowchart to decide the structure, then pseudocode to work out
what each box actually does — and for a small program, skip the flowchart entirely.

**Common mistakes**, all of which make a diagram that looks right and is not:

- Unlabelled decision branches
- Arrows that go nowhere, or two arrows into a decision
- Decisions with three outputs — a diamond asks one yes/no question
- A loop with no exit condition drawn`,
    mcqs: [
      mcq('A decision diamond should have:',
        [['One way in and two labelled ways out', true],
          ['One in and three out', false],
          ['Two in and one out', false],
          ['Any number of branches', false]],
        'A diamond asks one yes/no question; three outputs means two questions drawn as one.'),
      mcq('When does a flowchart beat pseudocode?',
        [['When paths split and rejoin, and the shape of the control flow is the point', true],
          ['For long programs', false],
          ['For detailed logic', false],
          ['Always', false]],
        'Flowcharts show shape well and detail badly; pseudocode is the reverse.'),
      mcq('A flowchart of eight boxes in a straight line is:',
        [['A list drawn slowly — the diagram adds nothing', true],
          ['Good practice', false],
          ['Required documentation', false],
          ['Clearer than text', false]],
        'With no branching there is no shape to show, which is the only thing the diagram is better at.'),
      mcq('The commonest flowchart mistake is:',
        [['Unlabelled decision branches, which make the diagram ambiguous', true],
          ['Too many boxes', false],
          ['Wrong shapes', false],
          ['Missing a title', false]],
        'Yes and No must be on the arrows, or the reader has to guess which path is which.'),
    ],
    checkpoint: [
      mcq('The practical division of labour between the two is:',
        [['Flowchart to decide the structure, pseudocode to work out what each box does', true],
          ['Flowchart first, always', false],
          ['They are interchangeable', false],
          ['Pseudocode only', false]],
        'And for a small program the flowchart step is worth skipping entirely.'),
      mcq('Explaining a process to a non-technical stakeholder is best done with:',
        [['A flowchart — it needs no conventions explained', true],
          ['Pseudocode', false],
          ['Code', false],
          ['A written list', false]],
        'Boxes and arrows read without training, which pseudocode keywords do not quite manage.'),
    ],
  },
  {
    unitCode: 'T_PSEUDOCODE_DRY_RUNNING',
    notes: `A dry run is walking through your own logic by hand, with a table of values, before a
machine does. It is the cheapest debugging there is, because there is no code yet to debug.

**How to do it.** Draw a table with a column per variable and a row per step. Work through the
plan one line at a time, writing what changes. Do not skip — the step you would skip is where
the bug is.

**Worked, on: "find the largest".**

    SET largest TO first item
    FOR each remaining item
        IF item > largest THEN SET largest TO item
    END FOR

Input \`[3, 9, 2]\`:

| Step | item | largest | Note |
|---|---|---|---|
| Start | — | 3 | first item |
| Loop 1 | 9 | 9 | 9 > 3, replace |
| Loop 2 | 2 | 9 | 2 > 9 is false |
| End | — | 9 | correct |

**Now the inputs that matter**, and this is the part that finds things:

- **Empty list** — "SET largest TO first item" has no first item. **The plan fails, and you know
  before writing anything.**
- **One item** — the loop body never runs, largest is that item. Correct.
- **All equal**, \`[5,5,5]\` — nothing is ever greater, largest stays 5. Correct.
- **Descending**, \`[9,3,2]\` — nothing replaces the first. Correct, and worth checking because
  the opposite order is the one people test.

**The four inputs to try, always:** empty, one item, all the same, and the reverse of what you
expect.

**What a dry run catches that testing does not.** It catches errors in your *understanding*,
because you are forced to say what each step does rather than watch what it did. A test tells
you the answer was wrong; a dry run tells you which step you had wrong.

**Be honest.** The temptation is to trace what you MEANT rather than what is written. Read each
line literally, including the boundary — if it says \`>\`, it is not \`>=\`, whatever you intended.
A dishonest dry run confirms the bug instead of finding it.`,
    workedExample: `**Goal: dry-run a plan that looks correct and is not.**

The plan: count how many marks are above the average.

    SET total TO 0
    FOR each mark
        ADD mark TO total
    END FOR
    SET average TO total / count
    SET above TO 0
    FOR each mark
        IF mark > average THEN ADD 1 TO above
    END FOR
    DISPLAY above

Input \`[10, 20, 30]\`.

| Step | total | average | above | Note |
|---|---|---|---|---|
| init | 0 | — | — | |
| loop1 ×3 | 60 | — | — | 10+20+30 |
| average | 60 | 20 | — | 60/3 |
| init | 60 | 20 | 0 | |
| loop2: 10 | | | 0 | 10 > 20 false |
| loop2: 20 | | | 0 | **20 > 20 false** |
| loop2: 30 | | | 1 | 30 > 20 true |
| end | | | 1 | |

Answer 1. Is that right? It depends on a question the specification did not answer: does a mark
**equal** to the average count as "above"? Under a literal reading, no — and the dry run has
surfaced the ambiguity rather than letting the code decide it silently.

**Now the empty list.** \`total\` is 0, \`count\` is 0, and \`average\` is \`0 / 0\`. **The plan divides
by zero**, and that is a crash found in thirty seconds with a pen.

The fix is a guard, and the dry run is what showed it was needed:

    IF the list is empty THEN
        DISPLAY 0
        STOP
    END IF

**The point.** Two findings — an unresolved specification question and a crash — from tracing
two inputs, before a line of code existed. Both would have cost far more later, and the second
would have been found by a user rather than by you.`,
    mcqs: [
      mcq('The four inputs worth dry-running are:',
        [['Empty, one item, all the same, and the reverse of what you expect', true],
          ['Small, medium, large and huge', false],
          ['Only typical values', false],
          ['Random values', false]],
        'Each targets a specific class of failure, and typical values pass under almost every bug.'),
      mcq('What does a dry run catch that a test does not?',
        [['An error in your understanding — it forces you to say what each step does', true],
          ['Syntax errors', false],
          ['Performance problems', false],
          ['Nothing extra', false]],
        'A test says the answer was wrong; a dry run says which step you had wrong.'),
      mcq('Tracing what you MEANT rather than what is written:',
        [['Confirms the bug instead of finding it', true],
          ['Is faster and fine', false],
          ['Is the normal method', false],
          ['Makes no difference', false]],
        'Reading each line literally, including the boundary, is the whole discipline.'),
      mcq('Dry-running "count marks above average" on an empty list reveals:',
        [['A division by zero, found in thirty seconds with a pen', true],
          ['Nothing', false],
          ['An off-by-one', false],
          ['A wrong average', false]],
        'A crash that would otherwise have been found in production by whoever uploaded an empty file.'),
    ],
    checkpoint: [
      mcq('A dry run shows the answer depends on whether "above average" includes equal. That is:',
        [['An ambiguity in the specification, surfaced before code decided it silently', true],
          ['A bug in the plan', false],
          ['Unimportant', false],
          ['A dry-run error', false]],
        'Left unresolved, the code makes the decision by accident and nobody records that it was made.'),
      mcq('Why not skip a step while tracing?',
        [['The step you would skip is where the bug is', true],
          ['It takes the same time', false],
          ['The table would be wrong', false],
          ['You may skip obvious steps', false]],
        'Skipping is driven by confidence, and confidence is exactly what a dry run exists to test.'),
    ],
  },
  {
    unitCode: 'T_PSEUDOCODE_FINDING_LOGIC_ERRORS',
    notes: `Most bugs are in the plan rather than in the typing. This unit is about finding them
while they are still cheap — which means before any code exists.

**The five logic errors that appear in plans**, in roughly the order of how often:

**1. The missing case.** The plan handles what you thought of. Empty input, one item, everything
identical, a negative number, a value at exactly the boundary — one of these is usually absent.

**2. The wrong boundary.** "Above 40" where the specification said "40 or above". Correct for
almost every input and wrong for exactly one, which is why it survives casual checking.

**3. The wrong order.** Two steps that must happen in a particular sequence, written the other
way round. Calculating an average before summing; validating after saving.

**4. The unreachable branch.** A condition that can never be true given what came before,
usually a mis-ordered chain of thresholds. No error, and one branch simply never runs.

**5. The assumption nobody stated.** The list is sorted; the file exists; the number is
positive. It works until it does not, and the plan never said it required anything.

**How to find them systematically**, in order:

1. **Read each step and ask: could this fail?** What would make it impossible to carry out?
2. **List the inputs you have not considered.** Write them down; do not trust memory.
3. **Dry-run the awkward ones**, not the typical one.
4. **Check every boundary against the wording of the specification**, word by word.
5. **Ask what the plan assumes**, and write each assumption down as a line. If an assumption is
   required, it should be a guard rather than a hope.

**Give it to somebody else.** Five minutes of another person reading your plan finds things you
cannot see, because you know what you meant and they only know what you wrote. This is the
cheapest review that exists and the one students most often skip.

**The economics, stated plainly.** A logic error costs roughly:

- **Seconds** in the plan
- **Minutes** while coding
- **An hour** in testing
- **Considerably more** in production, where somebody else finds it and you have to reproduce
  it first

Every one of those is the same error. Only the moment of discovery differs, and that moment is
something you control by looking earlier.`,
    coding: [
      {
        title: 'Identify the logic error in each plan',
        description: `Each plan below contains one of the five errors. Print the number of the matching error, one per line, in order.

Plans:
1. "SET average TO total / count" appears BEFORE the loop that builds total.
2. "IF mark > 40 THEN Pass" where the specification says "40 or above passes".
3. A plan for finding the largest value that begins "SET largest TO first item", with no check for an empty list.
4. "IF score >= 50 THEN C, ELSE IF score >= 75 THEN A".

Errors:
1 = wrong boundary
2 = missing case
3 = unreachable branch
4 = wrong order

Print four lines: the error number for plan 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          { input: '', expectedOutput: '4\n1\n2\n3' },
        ],
      },
    ],
    mcqs: [
      mcq('Which error produces a plan that is correct for almost every input?',
        [['The wrong boundary', true],
          ['The missing case', false],
          ['The wrong order', false],
          ['The unstated assumption', false]],
        'Wrong for exactly one value, which is why it survives casual checking and reaches production.'),
      mcq('An unreachable branch is usually caused by:',
        [['A mis-ordered chain of thresholds', true],
          ['A typo', false],
          ['Missing input', false],
          ['Too many conditions', false]],
        'A looser test above a stricter one claims everything, and the branch below simply never runs.'),
      mcq('Why does somebody else find errors you cannot?',
        [['You know what you meant; they only know what you wrote', true],
          ['They are more experienced', false],
          ['They read more slowly', false],
          ['They do not', false]],
        'The cheapest review that exists, and the one students most often skip.'),
      mcq('An assumption the plan requires should be:',
        [['Written as a guard rather than left as a hope', true],
          ['Noted in a comment', false],
          ['Assumed silently', false],
          ['Checked in testing', false]],
        'An unstated assumption works until it does not, and nothing records that it was ever required.'),
    ],
    checkpoint: [
      mcq('The same logic error costs least when found:',
        [['In the plan', true], ['While coding', false], ['In testing', false], ['In production', false]],
        'Seconds, minutes, an hour, then considerably more — and only the moment of discovery differs.'),
      mcq('The most reliable way to find a missing case is:',
        [['Write down the inputs you have not considered, rather than trusting memory', true],
          ['Re-read the plan', false],
          ['Run the code', false],
          ['Add error handling', false]],
        'Memory returns the cases you already thought of, which are by definition not the missing ones.'),
    ],
  },
  {
    unitCode: 'T_PSEUDOCODE_PRACTICE',
    notes: `No new ideas. Plan and trace several problems, **without writing any code at all** —
which is the constraint that makes this unit work.

**Why no code.** The moment you are allowed to code, you will, and the planning becomes a
formality. Forbidding it forces the whole problem to be solved on paper, which is the skill
being built.

**The method, every time:**

1. **Restate the problem** in your own words. If you cannot, you do not understand it yet.
2. **List the inputs and outputs.** What comes in, what goes out, in what form.
3. **List the edge cases** before planning: empty, one, all identical, boundary values,
   invalid input.
4. **Write the plan** in sequence, decision and repetition.
5. **Check every step is executable.** Could a person carry it out?
6. **Dry-run three inputs**: a typical one, an edge case, and the boundary.
7. **State your assumptions** and turn each required one into a guard.

**Problems worth planning:**

- Find the second largest value in a list
- Count how many words in a sentence start with a vowel
- Decide whether a year is a leap year
- Work out change from an amount, using the fewest coins
- Find whether two words are anagrams
- Report the longest run of the same character in a string

**Each has an awkward case worth finding on paper:** second-largest with fewer than two items or
all identical; change from an amount smaller than the smallest coin; anagrams of different
lengths; the longest run in an empty string.

**The checklist before calling a plan finished:**

- Is every step something a person could carry out?
- Have I committed to every boundary, in the specification's own words?
- What happens with empty input?
- With one item?
- With all items the same?
- What does the plan assume, and is each assumption guarded?
- Could somebody who does not know my language implement this?

**Trade plans with somebody.** Implement theirs exactly as written, without interpreting. Where
you cannot, their plan had a gap — and that exercise teaches both of you more than either plan
alone.`,
    mcqs: [
      mcq('Why is writing code forbidden in this unit?',
        [['Allowed to code, you will, and the planning becomes a formality', true],
          ['Code is harder', false],
          ['To save time', false],
          ['Arbitrary rule', false]],
        'The constraint is what forces the whole problem to be solved on paper, which is the skill being built.'),
      mcq('Planning "the second largest value", which awkward case must you find?',
        [['A list with fewer than two items, or all items identical', true],
          ['A very long list', false],
          ['Negative numbers', false],
          ['A sorted list', false]],
        'Both break the obvious plan, and both are invisible if you only trace a typical input.'),
      mcq('Implementing somebody else\'s plan exactly as written teaches:',
        [['Where their plan had gaps, because you cannot interpret what is missing', true],
          ['Their coding style', false],
          ['Nothing new', false],
          ['Only syntax', false]],
        'Interpreting is what hides the gap; implementing literally is what exposes it.'),
      mcq('The first step with any problem is:',
        [['Restate it in your own words', true],
          ['List the steps', false],
          ['Draw a flowchart', false],
          ['Identify the loop', false]],
        'If you cannot restate it, you do not understand it, and everything built on that misunderstanding is wasted.'),
      mcq('An assumption your plan requires should become:',
        [['A guard at the top of the plan', true],
          ['A comment', false],
          ['A test case', false],
          ['Nothing', false]],
        'Required and unguarded is the definition of a plan that works until it does not.'),
    ],
    checkpoint: [
      mcq('Which three inputs should every plan be dry-run against?',
        [['A typical one, an edge case, and the boundary', true],
          ['Three typical ones', false],
          ['The largest possible', false],
          ['Random inputs', false]],
        'Typical inputs pass under nearly every logic error, which is why two of the three are deliberately awkward.'),
      mcq('"Could somebody who does not know my language implement this?" tests:',
        [['Whether the plan describes logic rather than code', true],
          ['Whether it is short enough', false],
          ['Whether it is correct', false],
          ['Nothing useful', false]],
        'A plan carrying language machinery has become code with worse tooling.'),
    ],
  },

  /* ── T_BOOLEAN ────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_BOOLEAN_BOOLEAN_VALUES',
    notes: `Boolean algebra is algebra with exactly two values: true and false, or 1 and 0. It is
the mathematics underneath every condition you have written and every circuit in the machine.

**The three operations:**

    AND  (·)   true only when BOTH are true
    OR   (+)   true when AT LEAST ONE is true
    NOT  (')   flips the value

**The laws, and each one is a simplification you can actually use:**

| Law | Form | Means |
|---|---|---|
| Identity | \`A AND true = A\` | Redundant condition |
| Null | \`A AND false = false\` | Dead branch |
| Idempotent | \`A AND A = A\` | Repeated test |
| Complement | \`A AND NOT A = false\` | Impossible condition |
| Double negation | \`NOT (NOT A) = A\` | Unwrap it |
| De Morgan | \`NOT(A AND B) = NOT A OR NOT B\` | The useful one |
| Distributive | \`A AND (B OR C) = (A AND B) OR (A AND C)\` | Factor it out |
| Absorption | \`A OR (A AND B) = A\` | B decides nothing |

**Why this is not exam material.** Every one of those laws is a condition you have written or
will write. Absorption is the rule that tells you a condition you spent ten minutes on can be
deleted. Complement tells you a branch can never execute. **De Morgan is the one that untangles
a condition somebody wrote at 2am**, and you will use it repeatedly.

**Worked, with a real condition:**

    if (not (isActive and hasPaid)) { denyAccess(); }

De Morgan:

    if ((not isActive) or (not hasPaid)) { denyAccess(); }

Same behaviour, and the second reads as the rule in English: deny if they are inactive, or if
they have not paid. **The transformation made the intent legible**, which is what these laws buy
in practice.

**Absorption, also with real code:**

    if (isAdmin or (isAdmin and hasPermission)) { allow(); }

reduces to \`if (isAdmin)\`. The permission check decides nothing and was presumably not what the
author meant — which is the kind of bug the algebra finds and reading does not.

**Truth tables prove any of these.** Two variables give four rows, three give eight; check both
sides agree on every row and you have a proof rather than an impression.`,
    mcqs: [
      mcq('`NOT (A AND B)` equals:',
        [['`(NOT A) OR (NOT B)`', true],
          ['`(NOT A) AND (NOT B)`', false],
          ['`A OR B`', false],
          ['`NOT A AND B`', false]],
        "De Morgan's law, and the one you will use most, because it turns an awkward negation into a readable sentence."),
      mcq('`isAdmin OR (isAdmin AND hasPermission)` simplifies to:',
        [['`isAdmin`', true], ['`hasPermission`', false], ['`isAdmin AND hasPermission`', false], ['It cannot be simplified', false]],
        'Absorption. The permission check decides nothing, which is usually a sign it was not what the author meant.'),
      mcq('`A AND NOT A` is:',
        [['Always false — an impossible condition, so the branch is dead', true],
          ['Always true', false], ['Equal to A', false], ['Undefined', false]],
        'The complement law, and finding it in real code means somebody wrote a branch that can never run.'),
      mcq('How do you PROVE two boolean expressions are equivalent?',
        [['A truth table covering every combination, checking both sides agree', true],
          ['Test a few values', false],
          ['Simplify both', false],
          ['You cannot', false]],
        'Four rows for two variables, eight for three — exhaustive and therefore a proof rather than an impression.'),
    ],
    checkpoint: [
      mcq('Why are these laws worth learning beyond an exam?',
        [['Each one is a simplification for a condition you have written or will write', true],
          ['They are required for circuits only', false],
          ['They are historical', false],
          ['They are not', false]],
        'De Morgan untangles the condition somebody wrote at 2am, and absorption deletes one that decides nothing.'),
      mcq('Rewriting `not (isActive and hasPaid)` with De Morgan buys:',
        [['Legibility — it reads as the rule in English', true],
          ['Speed', false], ['Fewer variables', false], ['Nothing', false]],
        'Deny if inactive, or if unpaid. The behaviour is identical; the intent becomes visible.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_GATES',
    notes: `A logic gate is boolean algebra made physical. It is the point at which mathematics
becomes a machine, and it is worth seeing once even if you never design hardware.

**The gates:**

| Gate | Output is 1 when |
|---|---|
| AND | both inputs are 1 |
| OR | at least one input is 1 |
| NOT | the input is 0 (one input only) |
| XOR | the inputs DIFFER |
| NAND | NOT (A AND B) |
| NOR | NOT (A OR B) |

**XOR is the one worth dwelling on**, because it is "different" rather than "or", and that turns
out to be exactly addition without the carry. It is the heart of the adder two units from here,
and it is also how a parity check and a simple cipher work.

**NAND and NOR are universal.** Any circuit at all can be built from NAND gates alone — AND, OR,
NOT, everything. NOT is a NAND with both inputs tied together; AND is a NAND followed by that
NOT; OR is NANDs on each input feeding a NAND.

**Why that matters practically rather than as a curiosity:** a factory can make one kind of gate
extremely cheaply and reliably and build anything from it. Manufacturing one component well
beats manufacturing six adequately, and that economic fact shaped how chips are actually built.

**What a gate physically is.** A few transistors — switches with no moving parts. A transistor
lets current through when its control input is energised. Wire two in series and current flows
only when both are on: that is an AND. In parallel, either suffices: an OR.

**And that is the whole stack.** Transistors make gates; gates make adders and memory cells;
those make a processor; the processor runs your code. Every abstraction above rests on switches
in series and in parallel, and nothing in the chain is magic — it is just very small and very
fast.

**Propagation delay** is worth knowing exists: a gate takes a few picoseconds to settle. Chain
enough of them and the delay bounds how fast the clock can run, which is why adding more stages
to a circuit is not free.`,
    mcqs: [
      mcq('XOR outputs 1 when:',
        [['The inputs differ', true],
          ['Both are 1', false], ['At least one is 1', false], ['Both are 0', false]],
        '"Different" rather than "or", and it happens to be addition without the carry — which is why the adder needs it.'),
      mcq('Why does it matter that NAND is universal?',
        [['A factory can make one gate very cheaply and reliably and build everything from it', true],
          ['NAND is faster', false],
          ['It is a mathematical curiosity', false],
          ['It uses less power', false]],
        'Manufacturing one component well beats manufacturing six adequately, and that shaped how chips are built.'),
      mcq('Two transistors in series form which gate?',
        [['AND — current flows only when both are on', true],
          ['OR', false], ['NOT', false], ['XOR', false]],
        'In parallel, either suffices, which is an OR. The whole stack rests on those two arrangements.'),
      mcq('Propagation delay means:',
        [['A gate takes time to settle, and chained gates bound the clock speed', true],
          ['Signals are lost', false],
          ['Gates consume power', false],
          ['Nothing practical', false]],
        'Which is why adding stages to a circuit is not free, however simple each stage looks.'),
    ],
    checkpoint: [
      mcq('A NOT gate built from NAND is made by:',
        [['Tying both NAND inputs together', true],
          ['Using one input only', false],
          ['Two NANDs in series', false],
          ['It cannot be', false]],
        'NAND(A, A) is NOT(A AND A), which is NOT A by the idempotent law.'),
      mcq('The chain from physics to your program is:',
        [['Transistors to gates to adders and memory to a processor', true],
          ['Gates to transistors to code', false],
          ['Processor to gates to transistors', false],
          ['There is no direct chain', false]],
        'Nothing in it is magic — it is switches in series and parallel, very small and very fast.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_TRUTH_TABLES',
    notes: `A truth table lists every possible combination of inputs and what the output is for
each. It is exhaustive, which makes it a proof rather than an argument.

**\`n\` inputs give \`2^n\` rows.** Two inputs, four rows. Three, eight. Four, sixteen — and at that
point a table is still feasible and a simplification is usually worth finding first.

    A | B | A AND B | A OR B | A XOR B
    0 | 0 |    0    |   0    |    0
    0 | 1 |    0    |   1    |    1
    1 | 0 |    0    |   1    |    1
    1 | 1 |    1    |   1    |    0

**Listing the rows in binary counting order** — 00, 01, 10, 11 — guarantees you miss none. That
is the only discipline the technique requires and it is where mistakes come from.

**Working out what a circuit does.** Add a column per intermediate signal, left to right, and
fill them in before the output. For \`(A AND B) OR (NOT C)\`:

    A | B | C | A AND B | NOT C | output
    0 | 0 | 0 |    0    |   1   |   1
    0 | 0 | 1 |    0    |   0   |   0
    0 | 1 | 0 |    0    |   1   |   1
    0 | 1 | 1 |    0    |   0   |   0
    1 | 0 | 0 |    0    |   1   |   1
    1 | 0 | 1 |    0    |   0   |   0
    1 | 1 | 0 |    1    |   1   |   1
    1 | 1 | 1 |    1    |   0   |   1

Reading the output column tells you something the expression did not: the output is 1 whenever C
is 0, regardless of A and B. That is the kind of insight a table gives and staring does not.

**Proving two expressions equivalent.** Build both columns. If they agree on every row they are
equivalent — and unlike testing a few values, there is nothing left to check.

**Where this is genuinely useful in code.** A condition with three or four variables that you
are not sure about. Build the table, decide the correct output for each row, then write the
condition that produces it. **You have then specified the behaviour before implementing it**,
which is the same discipline as dry-running a plan.

**Spotting a dead branch.** If a column is all zeros, that condition can never be true. If it is
all ones, it is always true and the test is pointless. Both appear in real code and neither
produces an error.`,
    mcqs: [
      mcq('Four input variables produce how many rows?',
        [['16', true], ['8', false], ['4', false], ['32', false]],
        'Two to the power n. At sixteen a table is still feasible, though a simplification is usually worth finding first.'),
      mcq('Why list rows in binary counting order?',
        [['It guarantees no combination is missed', true],
          ['It is conventional', false],
          ['It is faster', false],
          ['It groups similar rows', false]],
        'The only discipline the technique requires, and where mistakes come from when it is skipped.'),
      mcq('A truth table column that is all zeros means:',
        [['That condition can never be true — a dead branch', true],
          ['An error in the table', false],
          ['The inputs are wrong', false],
          ['The condition is always true', false]],
        'It appears in real code and produces no error, which is why the table finds what reading does not.'),
      mcq('How is a truth table useful before writing a condition?',
        [['Decide the correct output per row first, then write the condition producing it', true],
          ['It is only for circuits', false],
          ['To count the variables', false],
          ['To measure performance', false]],
        'The same discipline as dry-running a plan: specify the behaviour before implementing it.'),
    ],
    checkpoint: [
      mcq('Two expressions agree on every row of a complete truth table. What follows?',
        [['They are equivalent — there is nothing left to check', true],
          ['They are probably equivalent', false],
          ['They are equivalent for those inputs only', false],
          ['Nothing', false]],
        'Exhaustiveness is what makes it a proof rather than evidence.'),
      mcq('Intermediate signal columns should be filled in:',
        [['Left to right, before the output', true],
          ['After the output', false],
          ['In any order', false],
          ['Only if needed', false]],
        'Each depends on the ones before it, and doing it in order is what keeps a wide table tractable.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_SIMPLIFICATION',
    notes: `Simplification means finding an expression with fewer terms that behaves identically.
It used to save money in physical gates; it now mostly saves the next person from an unreadable
condition.

**Worked, using the laws:**

    (A AND B) OR (A AND NOT B)
    = A AND (B OR NOT B)        [distributive, factoring A out]
    = A AND true                [complement]
    = A                         [identity]

**Three lines of algebra to discover that B decides nothing.** That is a real result: a condition
somebody wrote with two variables actually depends on one, and the second is either dead weight
or evidence that the author meant something else.

**Another, and this one is the common shape:**

    NOT (A OR B) AND A
    = (NOT A AND NOT B) AND A   [De Morgan]
    = (NOT A AND A) AND NOT B   [rearranged]
    = false AND NOT B           [complement]
    = false

**The whole condition can never be true.** Any branch guarded by it is dead code, and nothing in
a compiler or a test suite will tell you.

**The method:**

1. Look for De Morgan opportunities — a NOT wrapped around a group
2. Factor out anything common to both sides of an OR
3. Apply complement and identity to whatever that produces
4. Check for absorption: \`A OR (A AND B)\` is just \`A\`
5. Verify with a truth table — always, because a slip in the algebra is silent

**Step 5 is not optional.** Algebra is exactly the kind of manipulation where a small error
produces a plausible-looking result, and the table is cheap.

**Why it matters in code rather than in circuits.** A five-term condition nobody can read gets
edited wrongly. Simplifying is refactoring: same behaviour, fewer places to be wrong.

**The honest caution.** The simplest expression is not always the clearest. Sometimes a slightly
longer condition maps directly onto the rule as the business stated it, and collapsing it makes
the code shorter and the intent harder to recover. **Optimise for the reader, not for the term
count** — and where you do simplify aggressively, leave the original rule in a comment.`,
    mcqs: [
      mcq('`(A AND B) OR (A AND NOT B)` simplifies to:',
        [['`A`', true], ['`B`', false], ['`A AND B`', false], ['`A OR B`', false]],
        'B is true in one branch and false in the other, so it covers every possibility and decides nothing.'),
      mcq('`NOT (A OR B) AND A` simplifies to:',
        [['false — the branch is dead code', true], ['`A`', false], ['`NOT B`', false], ['true', false]],
        'De Morgan then complement. Nothing in a compiler or a test suite reports it.'),
      mcq('Why verify a simplification with a truth table?',
        [['A slip in the algebra produces a plausible result silently', true],
          ['It is required', false],
          ['Tables are faster', false],
          ['To count terms', false]],
        'Exactly the kind of manipulation where a small error looks right, and the check is cheap.'),
      mcq('When should you NOT simplify to the shortest form?',
        [['When a longer form maps directly onto the rule as stated', true],
          ['Never', false],
          ['When there are many variables', false],
          ['When performance matters', false]],
        'Optimise for the reader. If you do collapse it, leave the original rule in a comment.'),
    ],
    checkpoint: [
      mcq('Simplification in code is best understood as:',
        [['Refactoring — same behaviour, fewer places to be wrong', true],
          ['Performance optimisation', false],
          ['A hardware concern', false],
          ['Style preference', false]],
        'A five-term condition nobody can read is a condition somebody will eventually edit wrongly.'),
      mcq('The first thing to look for when simplifying is:',
        [['A NOT wrapped around a group — a De Morgan opportunity', true],
          ['Repeated variables', false],
          ['The longest term', false],
          ['Parentheses', false]],
        'It usually unlocks the factoring and complement steps that follow.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_ADDER',
    notes: `This is the moment logic becomes arithmetic — where gates stop being a formalism and
start being a computer.

**Adding two bits.** Four cases:

    0 + 0 = 0
    0 + 1 = 1
    1 + 0 = 1
    1 + 1 = 10   (two in binary: sum 0, carry 1)

So the output needs **two** bits: a sum and a carry.

    A | B | Sum | Carry
    0 | 0 |  0  |   0
    0 | 1 |  1  |   0
    1 | 0 |  1  |   0
    1 | 1 |  0  |   1

**Read the Sum column: that is XOR.** Read the Carry column: that is AND. So:

    Sum   = A XOR B
    Carry = A AND B

Two gates, and you have addition. **That is the whole trick**, and it is worth sitting with for a
moment — arithmetic was not built into the machine, it fell out of two logical operations.

**The full adder** adds a carry from the previous column, because real numbers have more than
one bit:

    Sum   = (A XOR B) XOR Cin
    Carry = (A AND B) OR ((A XOR B) AND Cin)

Three inputs, eight rows, same idea.

**Chaining them.** Put eight full adders in a row, each one's carry feeding the next, and you can
add two 8-bit numbers. This is a **ripple-carry adder**, and the name describes its weakness: the
carry has to propagate through all eight before the answer is settled, so the delay grows with
the width. Faster designs exist and they all exist to attack exactly that.

**What this explains about code you have already written.**

**Integer overflow.** An 8-bit adder has nowhere to put a ninth bit. 255 + 1 produces 0 and a
carry that falls off the end. It is not an error condition the hardware detects for you — it is
a bit with nowhere to go, which is why overflow is silent in C and why languages differ in what
they do about it.

**Why addition is fast and division is not.** Addition is a handful of gates with a short delay.
Division has no equivalent trick and takes many times longer, which is why it is worth avoiding
in a tight loop when a multiplication would do.

**And the broader point.** Everything a processor does is built this way: subtract via two's
complement, multiply via repeated shift-and-add, compare via subtract-and-check. All of it from
AND, OR, NOT and XOR.`,
    mcqs: [
      mcq('In a half adder, Sum is which gate?',
        [['XOR', true], ['AND', false], ['OR', false], ['NAND', false]],
        'Read the Sum column of the truth table: 0, 1, 1, 0 — which is exactly "the inputs differ".'),
      mcq('Why does adding two bits need two output bits?',
        [['1 + 1 is 10 in binary — a sum and a carry', true],
          ['For error checking', false],
          ['To handle negatives', false],
          ['It does not', false]],
        'The carry is the second bit, and it is what makes chaining adders necessary and possible.'),
      mcq('A ripple-carry adder is slow because:',
        [['The carry must propagate through every stage before the answer settles', true],
          ['It uses many gates', false],
          ['XOR is slow', false],
          ['It is not slow', false]],
        'The delay grows with the width, and faster designs all exist to attack that one property.'),
      mcq('255 + 1 in an 8-bit adder gives 0 because:',
        [['The ninth bit has nowhere to go — it is not an error the hardware detects', true],
          ['The adder errors', false],
          ['It wraps by design choice in software', false],
          ['It gives 256', false]],
        'Which is why overflow is silent in C, and why languages differ in what they choose to do about it.'),
    ],
    checkpoint: [
      mcq('`Carry` in a half adder is which gate?',
        [['AND — a carry occurs only when both inputs are 1', true],
          ['XOR', false], ['OR', false], ['NOT', false]],
        'The Carry column is 0, 0, 0, 1, which is AND exactly.'),
      mcq('Why is division much slower than addition in a processor?',
        [['Addition is a few gates with a short delay; division has no equivalent trick', true],
          ['Division uses more memory', false],
          ['Division is done in software', false],
          ['They are the same speed', false]],
        'Worth knowing when a multiplication would do the same job inside a tight loop.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_PRACTICE',
    notes: `No new theory. Simplification and circuit-reading drills, with every exercise tied back
to a condition somebody might actually write.

**Why drills here.** The laws are few and the difficulty is recognising which one applies. That
is pattern recognition, and pattern recognition is built by repetition rather than by
understanding — you already understand De Morgan; what you need is to see it in a condition
without looking for it.

**The method for any simplification:**

1. **Look for a NOT around a group.** De Morgan, every time.
2. **Look for a common factor** across an OR.
3. **Apply complement and identity** to whatever that leaves.
4. **Check absorption:** \`A OR (A AND B)\` is \`A\`.
5. **Verify with a truth table.** Always.

**The method for reading a circuit:**

1. Label every intermediate signal.
2. Build a table with a column for each, left to right.
3. Fill it in row by row in binary counting order.
4. Read the output column and describe it in one English sentence.

**That last step is the one that matters.** "The output is 1 whenever C is 0" is a finding; a
completed table with no sentence attached is arithmetic.

**The checklist:**

- Did I list the rows in binary counting order?
- Did I verify my simplification with a table rather than trusting the algebra?
- Is any column all 0s — a dead condition — or all 1s — a pointless test?
- Can I say what the circuit does in one sentence?
- Would the simplified version be clearer to a reader, or only shorter?

**Tie each answer back to code.** After simplifying an expression, write the \`if\` statement it
corresponds to. The point of this topic is not the algebra; it is being able to look at a
five-term condition in a codebase and know it collapses to two.`,
    mcqs: [
      mcq('`NOT (A AND B) OR B` simplifies to:',
        [['true', true], ['`NOT A`', false], ['`B`', false], ['`NOT A OR B`', false]],
        'De Morgan gives (NOT A OR NOT B) OR B, and NOT B OR B is true, so the whole expression is true.'),
      mcq('`(A OR B) AND (A OR NOT B)` simplifies to:',
        [['`A`', true], ['`B`', false], ['`A AND B`', false], ['`A OR B`', false]],
        'Distributing gives A OR (B AND NOT B), which is A OR false, which is A.'),
      mcq('A circuit output column reads 1,1,1,1. What does that tell you?',
        [['The test is pointless — the output never depends on the inputs', true],
          ['The circuit is correct', false],
          ['An error in the table', false],
          ['The inputs are wrong', false]],
        'It appears in real code as a condition somebody believed was filtering something.'),
      mcq('After completing a circuit truth table, the step that matters is:',
        [['Describing the output in one English sentence', true],
          ['Counting the gates', false],
          ['Simplifying it', false],
          ['Drawing it again', false]],
        'A completed table with no sentence attached is arithmetic rather than a finding.'),
      mcq('The point of these drills is:',
        [['Recognising which law applies without looking for it', true],
          ['Memorising the laws', false],
          ['Speed', false],
          ['Circuit design', false]],
        'You already understand De Morgan; the skill is seeing it in a condition you did not write.'),
    ],
    checkpoint: [
      mcq('You simplify a five-term condition to two terms. What must you do next?',
        [['Verify with a truth table', true],
          ['Commit it', false],
          ['Simplify further', false],
          ['Nothing', false]],
        'A slip in the algebra produces a plausible result, and the table is the only thing that catches it.'),
      mcq('The simplified form is shorter but harder to relate to the business rule. You should:',
        [['Keep the clearer form, or leave the rule in a comment', true],
          ['Always use the shortest', false],
          ['Use both', false],
          ['Remove the rule', false]],
        'Optimise for the reader. Term count is not the objective.'),
    ],
  },
  {
    unitCode: 'T_BOOLEAN_DEBUGGING',
    notes: `An argument that looks sound and is not. This unit is about locating the step that
fails and saying why — which is the same skill as finding a dead branch in a condition, applied
to reasoning instead of code.

**Why it sits in this topic.** Boolean algebra is the formal version of implication, and the
common fallacies are all failures of exactly the operations you have been manipulating.

**The four that matter most, with their boolean shape:**

**1. Affirming the consequent.**

> If it is raining, the ground is wet. The ground is wet. Therefore it is raining.

\`A → B\` and \`B\` does **not** give \`A\`. The ground could be wet from a sprinkler. In code this is
the assumption that because a symptom appears, a particular cause is present — and it is how
debugging goes wrong for hours.

**2. Denying the antecedent.**

> If you study, you will pass. You did not study. Therefore you will fail.

\`A → B\` and \`NOT A\` does **not** give \`NOT B\`. The implication says nothing about what happens
when A is false.

**3. The false dilemma.** Two options presented where more exist. "Either we rewrite it or we
live with the bug" ignores fixing it, and boolean OR over an incomplete set of cases is exactly
this error formalised.

**4. Correlation as causation.** Covered in the statistics topic and worth naming again: two
things co-occurring does not establish that one produces the other.

**The two that are valid**, and knowing them is what lets you spot the invalid ones:

- **Modus ponens:** \`A → B\`, \`A\`, therefore \`B\`. Valid.
- **Modus tollens:** \`A → B\`, \`NOT B\`, therefore \`NOT A\`. Valid, and genuinely useful in
  debugging: if the cache were working, the response would be fast; it is not fast; therefore
  the cache is not working.

**The method for locating the failing step:**

1. **Write out the premises and the conclusion separately.** Most bad arguments hide the shape
   in prose.
2. **Check each premise.** Is it actually true?
3. **Check the FORM.** Even with true premises, is the conclusion entailed?
4. **Look for the missing case.** A false dilemma is a missing option; affirming the consequent
   is a missing alternative cause.
5. **Name the step that fails**, rather than saying the argument is wrong. "The ground could be
   wet for another reason" is a located fault; "that is illogical" is not.

**Where this pays off.** Post-incident discussions, code review, and your own debugging — where
affirming the consequent is the single most common error anybody makes.`,
    coding: [
      {
        title: 'Name the failing step',
        description: `For each argument, print the number of the fallacy, one per line, in order.

Arguments:
1. "If the server is down, the page fails to load. The page failed to load. So the server is down."
2. "If you write tests, you find bugs. You did not write tests. So you found no bugs."
3. "Either we rewrite the module or we accept the crashes."
4. "If the config were loaded, the log would show it. The log does not show it. So the config was not loaded."

Fallacies:
1 = denying the antecedent
2 = affirming the consequent
3 = valid (modus tollens)
4 = false dilemma

Print four lines: the fallacy number for argument 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          { input: '', expectedOutput: '2\n1\n4\n3' },
        ],
      },
    ],
    mcqs: [
      mcq('"The page failed to load, so the server is down" is which error?',
        [['Affirming the consequent — the symptom has other possible causes', true],
          ['Denying the antecedent', false],
          ['A false dilemma', false],
          ['Valid reasoning', false]],
        'The single most common reasoning error in debugging, and it costs hours by directing attention to one cause.'),
      mcq('`A → B` together with `NOT B` gives you:',
        [['`NOT A` — modus tollens, which is valid and useful in debugging', true],
          ['`A`', false], ['Nothing', false], ['`B`', false]],
        'If the cache were working the response would be fast; it is not; therefore the cache is not working.'),
      mcq('A false dilemma is, in boolean terms:',
        [['An OR over an incomplete set of cases', true],
          ['A negated AND', false],
          ['A double negation', false],
          ['An implication', false]],
        'Which is why enumerating the options explicitly is the way to expose it.'),
      mcq('The most useful way to report a flawed argument is:',
        [['Name the step that fails and why', true],
          ['Say it is illogical', false],
          ['Provide a counter-argument', false],
          ['Cite the fallacy name only', false]],
        '"The ground could be wet for another reason" is a located fault; a label is not.'),
    ],
    checkpoint: [
      mcq('`A → B` and `NOT A` allows you to conclude:',
        [['Nothing about B', true], ['`NOT B`', false], ['`B`', false], ['`A`', false]],
        'Denying the antecedent. The implication says nothing at all about the case where A is false.'),
      mcq('The first step in checking an argument is:',
        [['Write the premises and conclusion out separately', true],
          ['Look for the fallacy', false],
          ['Check the premises are true', false],
          ['Find a counterexample', false]],
        'Most bad arguments hide their shape in prose, and the shape is what the other checks operate on.'),
    ],
  },
];
