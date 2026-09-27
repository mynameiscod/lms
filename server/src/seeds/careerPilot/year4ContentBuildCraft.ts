/**
 * T4_CLEAN_CODE and T4_OOP_DESIGN — fourteen units. Module P03, days 11-12.
 *
 * ── WHAT CHANGES BETWEEN P02 AND P03 ──────────────────────────────────────────────────────
 *
 * The bridge repaired what was missing and nothing in it was mandatory. Everything here is.
 * These are the first two days of the engineering standard a fourth-year is interviewed
 * against, and the spec's rule is that evidence changes the TREATMENT — "compress demonstrated
 * mastery into verification, debugging, application or advanced treatment" — never whether the
 * topic is there.
 *
 * ── WHICH IS WHY EVERY TOPIC ENDS IN FOUR APPLICATION UNITS ───────────────────────────────
 *
 * `unitSuitabilityPolicy` stops serving a CONCEPT unit to a learner at STANDARD. A student who
 * has already proved clean code does not meet the three lessons; they meet the debugging
 * exercise, the drill, the interview question and the mini project, and those four are the whole
 * of what they are given. Author this module lesson-heavy and the strongest students — which in
 * a fourth year is most of them — would have nothing to be given at all.
 *
 * That is not a theory. Year 2 shipped at 31% application units, could not fill a strong
 * second-year's programme, and needed three remedial batches to fix it.
 *
 * ── THE HARD PART HERE IS THAT BOTH SUBJECTS ARE OPINION-SHAPED ───────────────────────────
 *
 * "Clean" and "well designed" are words people argue about, and a question with a contested
 * answer is a bad question. So every question below is framed around a CONSEQUENCE that is not
 * contested: what a change costs, what breaks, what a reader has to hold in their head. Nobody
 * disagrees that a leaked storage decision makes it expensive to change; they disagree about
 * whether four-line functions are good.
 *
 * Attribution: T4_CLEAN_CODE defaults to CLEAN_CODE with WHEN_TO_REFACTOR on TECHNICAL_DEBT and
 * the drill on REFACTORING; T4_OOP_DESIGN to OOP_CONCEPTS with the abstraction unit on
 * SOFTWARE_ARCHITECTURE and the patterns units on DESIGN_PATTERNS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BUILD_CRAFT_BUNDLES: PilotBundle[] = [
  /* ══ T4_CLEAN_CODE ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CLEAN_CODE_NAMES_AND_SHAPE',
    notes: `**A reader judges three things in the first ten seconds**, and each of them has a
cost when it is wrong.

## The name

**A name that lies is worse than a name that says nothing.** \`getUser\` that also creates one,
\`validate\` that also saves — the next reader trusts the name, does not read the body, and
introduces a bug that takes an afternoon to find.

**A name that needs a comment to explain it is a name that has not been chosen yet.**

## The length

**Not a rule about lines.** The real measure is how much a reader has to hold in their head at
once to follow it. A forty-line function with no branching is easier than a twelve-line one with
three nested conditions.

**The signal is nesting depth, not line count.** Three levels of indentation means three things
being true at once, and that is what exceeds what people can hold.

## The shape

**One level of abstraction per function.** A function that opens a file, parses a date and
calculates tax is operating at three different altitudes, and the reader has to descend and climb
between them.

## What this is actually for

**Not aesthetics.** Every one of these is about the cost of the NEXT change. Code is read far
more often than it is written, and the reader is usually you, in four months, with no memory of
why.`,
    mcqs: [
      mcq('A function named `getUser` that also creates one when absent is dangerous chiefly because the next reader:',
        [['Trusts the name and does not read the body', true],
         ['Will have to search for where creation actually happens', false],
         ['Cannot tell whether the function has any side effects', false],
         ['May call it more often than is strictly necessary here', false]],
        'A name is a promise the reader relies on instead of reading. One that lies produces a confident wrong assumption, which is the expensive kind.'),
      mcq('The better signal that a function is too complex is its:',
        [['Nesting depth, rather than its line count', true],
         ['Line count, which is objective and easy to measure', false],
         ['Number of parameters that it accepts from callers', false],
         ['Number of other functions that it calls internally', false]],
        'Forty flat lines read easily; twelve lines at three levels of nesting mean three conditions held at once, which is what exceeds working memory.'),
      mcq('"One level of abstraction per function" is violated when a function:',
        [['Opens a file and also calculates a tax rate', true],
         ['Calls three other functions rather than just one', false],
         ['Is longer than the other functions around it are', false],
         ['Returns a value of a different type from its inputs', false]],
        'Those two operate at completely different altitudes, so the reader has to descend into plumbing and climb back to business logic within one body.'),
    ],
    checkpoint: [
      mcq('A reviewer asks for a comment explaining a variable name. The better response is usually to:',
        [['Change the name so the comment is unnecessary', true],
         ['Add the comment, since the reviewer asked for one', false],
         ['Explain the name to the reviewer in the review thread', false],
         ['Rename it to something shorter and add the comment too', false]],
        'A comment explaining a name is compensating for it. The comment can drift from the code; the name cannot, because it is the code.'),
      mcq('The justification for all three of these habits is ultimately the cost of:',
        [['The next change somebody makes to this code', true],
         ['Running the code, which is affected by its structure', false],
         ['Reviewing it once, before it is merged into the branch', false],
         ['Teaching it to somebody joining the team afterwards', false]],
        'Code is read far more often than written, and almost always in order to change it. Every one of these habits is paid back at that moment.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_SEPARATION',
    notes: `**Not a slogan — a specific test.** Two things belong in the same place if they
change for the same reason.

## The test, applied

A module that formats a report AND fetches the data for it changes when the layout changes, and
also when the data source changes. **Two reasons, two changes, two people, one file.** They
belong apart.

A module that validates an order and calculates its total both change when the order rules
change. **One reason.** They belong together.

## What mixing costs, concretely

**Every change risks the other thing.** Touching the formatting means re-testing the fetching,
because they share a file and possibly state.

**Neither can be reused.** You want the total calculation somewhere else and it comes with a
database connection attached.

**Neither can be tested alone.** Testing the formatting needs a database, so the test is slow,
fragile and frequently not written.

## The commonest violation

**Business rules inside a request handler.** The handler reads the request, applies the rule,
touches the database and builds the response. Now the rule can only be exercised through HTTP,
and the second place that needs it — a scheduled job, an import, an admin tool — copies it.

## Extracting it

**Move the rule to a function that takes plain values and returns a result.** No request, no
database. The handler calls it. That one move makes the rule testable, reusable and readable, and
it is usually twenty minutes.`,
    mcqs: [
      mcq('Two pieces of code belong in the same module when they:',
        [['Change for the same reason', true],
         ['Are called from the same place in the program', false],
         ['Operate on the same data structure internally', false],
         ['Were written by the same person at the same time', false]],
        'Shared reason to change is what makes co-location cheap. Everything else is coincidence and produces files that two people edit for different purposes.'),
      mcq('A business rule written inside a request handler becomes a problem when:',
        [['A second caller needs the rule and copies it', true],
         ['The handler grows longer than a screen of text', false],
         ['The HTTP framework is upgraded to a new version', false],
         ['The rule needs to be explained to a non-technical person', false]],
        'The rule is reachable only through HTTP, so a job or an import cannot call it. The copy then drifts, and two versions of one rule is the failure.'),
      mcq('Extracting a rule into a function taking plain values makes it testable because the test then needs no:',
        [['Request or database to exercise the rule', true],
         ['Mocking framework to isolate its dependencies', false],
         ['Knowledge of how the rule is actually implemented', false],
         ['Setup at all, since plain values need no preparation', false]],
        'The cost of testing was the infrastructure around the rule, not the rule. Removing the dependency removes the reason the test was never written.'),
    ],
    checkpoint: [
      mcq('A module both formats a report and fetches its data. The cost that appears first in practice is that:',
        [['Testing the formatting requires a database', true],
         ['The file becomes longer than is comfortable to read', false],
         ['Two developers cannot work on the module at one time', false],
         ['The formatting runs more slowly than it otherwise would', false]],
        'The test needs the fetching machinery, so it is slow and fragile. That is usually why it does not exist, which is the real cost.'),
      mcq('Splitting a module that changes for two reasons primarily reduces the risk that:',
        [['Changing one thing breaks the other', true],
         ['The module grows beyond a maintainable size soon', false],
         ['Two people edit the same file at the same moment', false],
         ['The module is difficult for a newcomer to understand', false]],
        'Shared code means shared blast radius. Separating them means a formatting change cannot affect fetching, which is what makes it safe to make.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_WHEN_TO_REFACTOR',
    notes: `**Technical debt is a decision with interest**, not a word for code you dislike.

## What makes it debt rather than bad code

**Debt was borrowed deliberately.** "We shipped the simple version to hit the date, knowing we
would pay to change it later." That is a decision, and a reasonable one.

**Code that is simply bad was not a decision.** Nobody chose it; it accumulated. Calling that
debt is flattering.

**The distinction matters because only one of them has a repayment plan.**

## The interest

**What does this cost per change?** A module everybody has to touch, that takes an extra day
every time, is paying real interest. A module nobody has opened in a year is paying none,
whatever it looks like inside.

**Ugly and stable is not urgent. Mediocre and central is.**

## When a refactor is worth it

**When it unblocks something specific.** "We cannot add the feature without this" is an argument.
"This is not how I would have written it" is not.

**When you are already in there.** The cheapest refactor is the one attached to a change you
were making anyway, because the understanding is already loaded.

## When it is not

**Before there are tests.** A refactor without tests is a rewrite with extra confidence, and you
will not know what you broke.

**As a whole-quarter project.** Large refactors that are their own initiative tend to be
abandoned halfway, which leaves both designs in place at once — strictly worse than either.

## The interview version

**"Tell me about a refactor you argued for."** The good answer contains a cost per change and a
thing it unblocked. The weak one contains the word "cleaner".`,
    mcqs: [
      mcq('The difference between technical debt and simply bad code is that debt was:',
        [['Taken on deliberately, as a trade', true],
         ['Written by somebody who has since left the team', false],
         ['Introduced more recently than the rest of the code', false],
         ['Documented at the time it entered the codebase', false]],
        'A deliberate trade has a reason and can have a repayment plan. Code that merely accumulated has neither, so the metaphor misleads.'),
      mcq('The urgency of paying debt down is best measured by:',
        [['What it costs per change to the module', true],
         ['How far it departs from the current coding standard', false],
         ['How long it has been present in the codebase already', false],
         ['How many lines the affected module currently contains', false]],
        'Interest is only paid when the code is touched. A central module costing a day per change is urgent; an untouched one costs nothing.'),
      mcq('Refactoring before tests exist is risky because it is effectively:',
        [['A rewrite, with no way to know what broke', true],
         ['Slower, since the tests would have guided the work', false],
         ['Wasted, because the tests will need rewriting anyway', false],
         ['Unreviewable, as the diff will be too large to read', false]],
        'The defining property of a refactor is that behaviour is unchanged, and without tests there is nothing establishing that it was.'),
    ],
    checkpoint: [
      mcq('Two modules: one ugly and untouched for a year, one mediocre and edited weekly. The one to refactor is:',
        [['The mediocre one, which is paying interest', true],
         ['The ugly one, since it departs furthest from standard', false],
         ['Both, starting with whichever is larger in size', false],
         ['Neither, until a feature is blocked by one of them', false]],
        'Interest accrues only on code that is touched. The ugly stable module costs nothing per week; the mediocre central one costs every week.'),
      mcq('The strongest argument for a refactor in a review is that it:',
        [['Unblocks a specific thing that is currently hard', true],
         ['Brings the module in line with the team’s conventions', false],
         ['Reduces the total number of lines in the codebase', false],
         ['Makes the code easier for a newcomer to read through', false]],
        'A named blocked thing is a cost somebody else recognises. Readability and convention are real and do not on their own justify the risk.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_DEBUGGING',
    notes: `**Code that works and is about to cause a bug**, which is a different exercise from
finding one that already has.

## What you are looking for

**Not a failure.** Everything here passes its tests. You are looking for the place where the NEXT
change goes wrong, which is what a reviewer is actually doing.

## The four to find

**A name that lies.** Something that does more than it says, so a caller relying on the name is
already wrong and does not know it.

**A leaked decision.** An internal representation that callers reach into, so changing it is no
longer a local decision.

**Duplication that has already drifted.** The same rule in two places, and the two are not quite
the same any more. One of them is wrong and nobody knows which.

**A function at two altitudes.** Business logic mixed with plumbing, so neither can be tested or
changed alone.

## How to report it

**Name the change that would be expensive**, not the aesthetic. "If we ever store this as a
dictionary, these six call sites break" is actionable. "This is messy" is an opinion somebody can
decline.

## Why this matters more than it looks

**This is the code review round of an interview**, and it is the one where candidates who write
well but read poorly are found out. Writing good code and seeing where somebody else's will fail
are genuinely separate skills.`,
    mcqs: [
      mcq('This exercise looks for code that is about to cause a bug rather than code that has, because that is what a:',
        [['Reviewer is actually doing when reading', true],
         ['Debugger does when stepping through a program', false],
         ['Test suite catches before the code is merged in', false],
         ['Static analyser reports on an existing codebase', false]],
        'A review cannot rerun history; it predicts. Spotting where the next change breaks is the entire value a human reviewer adds.'),
      mcq('Duplicated logic that has drifted between two places is worse than duplication that has not, because:',
        [['One of them is wrong and nobody knows which', true],
         ['It takes twice as long to update both of the copies', false],
         ['The two copies will diverge further as time passes', false],
         ['A test covering one of them gives false confidence', false]],
        'Identical duplication is merely a maintenance cost. Drifted duplication means the system has two answers to one question and is already wrong somewhere.'),
      mcq('The most actionable way to report a design problem in a review is to name:',
        [['A future change that would be expensive', true],
         ['The principle that the code currently violates', false],
         ['A cleaner structure you would have written instead', false],
         ['How long the module took the author to write it', false]],
        'A named cost is something the author can weigh and agree with. A principle or a preference is something they can reasonably decline.'),
    ],
    checkpoint: [
      mcq('A candidate writes excellent code and misses obvious problems in somebody else’s. This indicates:',
        [['Two separate skills, one of which is missing', true],
         ['That the other code was unusually difficult to read', false],
         ['That they were not given enough time for the review', false],
         ['A gap in their knowledge of the language being used', false]],
        'Producing and evaluating are different activities. The review round exists precisely because strong writers are frequently weak readers.'),
      mcq('An internal representation that callers reach into is a problem because changing it is no longer:',
        [['A local decision', true],
         ['Possible to do without breaking the existing tests', false],
         ['Something the type system will help you verify', false],
         ['Reviewable, since the diff touches too many files', false]],
        'While it is private, the decision can be revisited freely. Once it has leaked, revisiting it means finding and editing every caller.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_PRACTICE',
    notes: `**Improving structure without changing behaviour, in verifiable steps.**

## The discipline

**Tests green before. Tests green after. Green at every step in between.**

That last part is what separates a refactor from a rewrite. A change that leaves the suite red
for an hour is not a refactor, whatever it is called, because there is no point in that hour
where you could stop.

## The moves worth having

**Extract a function.** The single most useful one. A block with a comment above it saying what
it does is a function with a name waiting to happen.

**Rename.** Free, safe with tooling, and it is what most reviews are actually asking for.

**Introduce a parameter.** A function reaching for a global becomes a function that is given what
it needs. This one move makes untestable things testable.

**Invert a condition and return early.** Removes a level of nesting, which is the thing that was
actually costing the reader.

## What is not a refactor

**Anything that changes behaviour.** Fixing a bug during a refactor is a common and expensive
habit: the diff now contains two things, and if it breaks something, nobody knows which.

**Two commits, always.**

## Time yourself

**These are small on purpose.** The skill is doing it in steps, not doing it heroically, and
heroism is what produces the half-finished refactor everybody has to live with.`,
    mcqs: [
      mcq('The property that distinguishes a refactor from a rewrite is that the tests are green:',
        [['At every intermediate step, not just at the ends', true],
         ['Before the change starts and after it has finished', false],
         ['After the change, whatever happened during it', false],
         ['For the module being changed, if not for the others', false]],
        'Green throughout means you can stop at any point and still have working software. That is what makes the change safe to attempt at all.'),
      mcq('Introducing a parameter where a function reached for a global makes it testable because the test can then:',
        [['Supply the value directly', true],
         ['Run without importing the rest of the module now', false],
         ['Check that the global was not modified by the call', false],
         ['Execute much faster than it could previously do', false]],
        'The hidden dependency becomes an argument, so the test controls it. That single change is what makes most untestable code testable.'),
      mcq('Fixing a bug in the middle of a refactor is discouraged because the diff then:',
        [['Contains two things, and breakage is ambiguous', true],
         ['Becomes too large for a reviewer to read properly', false],
         ['Cannot be reverted without losing the bug fix too', false],
         ['Changes behaviour, which the tests will then flag up', false]],
        'If something breaks, you cannot tell whether the restructuring or the fix did it. Two commits keeps each one independently revertible.'),
    ],
    checkpoint: [
      mcq('A block of code with a comment above it explaining what it does is most often:',
        [['A function with a name waiting to happen', true],
         ['Adequately documented and best left as it is', false],
         ['A sign the surrounding function is too abstract', false],
         ['Evidence that the author did not understand it well', false]],
        'The comment has already named the operation. Extracting it moves that name into the code, where it cannot drift away from what it describes.'),
      mcq('A refactor that leaves the test suite red for an hour is problematic because during that hour you:',
        [['Have no point at which you could safely stop', true],
         ['Cannot tell whether the tests themselves are correct', false],
         ['Block other people from merging into the branch', false],
         ['Lose the ability to revert the work you have done', false]],
        'Interruptions happen. A change with no safe intermediate state has to be finished or abandoned entirely, and abandoned is the common outcome.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_INTERVIEW_QUESTION',
    notes: `**"Show me some code you are not proud of and tell me what you would change."**

## Why this question is asked

**It tests three things at once.** Whether you can read your own work critically, whether your
judgement about quality is calibrated, and whether you can talk about weakness without either
defensiveness or self-flagellation.

**Both failure modes are visible immediately.** "It is all fine actually" reads as not being able
to see it. "It is all terrible, I was so bad then" reads as no judgement about what actually
mattered.

## What a good answer contains

**A specific thing**, not a general feeling. "This class knew about the database and the HTTP
layer, so I could not test it."

**Why it happened.** Usually a real reason — a deadline, not knowing something yet, a requirement
that changed. Reasons are not excuses and interviewers can tell them apart.

**What it cost.** "Adding the export feature took three days because I had to work around it."

**What you would do now, specifically.** Not "write it better" — the actual move.

## The follow-up

**"Why did you not fix it?"** The honest answers are all acceptable: it was not worth it, there
were no tests, it was not mine to change, we shipped and moved on. **The one that is not
acceptable is not having thought about it.**

## The related question

**"What would you change about a codebase you inherited?"** Same structure, and it additionally
tests whether you can criticise somebody else's work without contempt — which is a thing teams
notice quickly.`,
    mcqs: [
      mcq('Answering "show me code you are not proud of" with "it is all fine" reads as:',
        [['Being unable to see problems in your own work', true],
         ['Confidence, which interviewers generally respond well to', false],
         ['A refusal to answer, which ends the line of questioning', false],
         ['Evidence that the code was genuinely of high quality', false]],
        'Every codebase has compromises in it. Not being able to name one suggests the critical reading has not happened rather than that it passed.'),
      mcq('The follow-up "why did you not fix it?" has several acceptable answers. The unacceptable one is:',
        [['Not having considered the question at all', true],
         ['That it was not worth the effort it would have taken', false],
         ['That there were no tests to make it safe to attempt', false],
         ['That it belonged to another team and was not yours', false]],
        'All the practical reasons are fine and normal. What is being checked is whether the trade-off was weighed, not which way it went.'),
      mcq('Describing a problem in code you inherited without contempt matters because a team is assessing whether you:',
        [['Will speak about their work that way later', true],
         ['Understand the constraints the original author faced', false],
         ['Are capable of improving code you did not write', false],
         ['Can identify problems in unfamiliar code at all', false]],
        'How somebody talks about absent authors is a reliable preview of how they will talk about present colleagues, and interviewers listen for it.'),
    ],
    checkpoint: [
      mcq('The strongest element of an answer about code you are not proud of is:',
        [['What it cost, in concrete terms', true],
         ['How long ago you wrote it, showing you have grown', false],
         ['The principle it violated, named precisely', false],
         ['How much better your current code is than it was', false]],
        'A named cost shows the judgement is calibrated to consequences rather than to aesthetics, which is what separates experience from opinion.'),
      mcq('Answering that everything you wrote was terrible reads as:',
        [['No judgement about what actually mattered', true],
         ['Appropriate humility about early career work', false],
         ['Honesty, which interviewers value above polish', false],
         ['An accurate assessment that most people share', false]],
        'Undifferentiated criticism carries the same information as none. The signal being sought is discrimination between what mattered and what did not.'),
    ],
  },
  {
    unitCode: 'T4_CLEAN_CODE_MINI_PROJECT',
    notes: `**Take something working and poorly structured, and improve it without changing what
it does.**

## The brief

Find a module of a few hundred lines — your own earlier work is ideal, and a small open-source
project is fine — and restructure it.

**The constraint that makes this an exercise rather than a rewrite: behaviour must be provably
unchanged.** That means characterisation tests first, capturing what it currently does, including
the parts that look like bugs. **A refactor does not fix bugs. That is a separate commit.**

## The sequence

**Pin the behaviour.** Write tests against the current output. You are not judging it yet, only
recording it.

**Then make one move at a time**, committing after each. Extract. Rename. Introduce a parameter.
Invert a condition. Green between every one.

**Then write down what improved**, in terms of cost rather than taste. What is now testable that
was not? What change would now be local that would have spread?

## What finishing looks like

**The tests you wrote first still pass, unchanged.** If you had to edit them, behaviour moved, and
the exercise has become something else.

## Why this is the mini project for the topic

**Because clean code cannot be demonstrated on a blank page.** Anybody writes tidily when they
begin. The skill is improving something that already exists and is already depended on, which is
the situation you will actually be in.`,
    assignment: {
      title: 'Restructuring something that already works',
      description: 'Improve the structure of an existing module of a few hundred lines, with behaviour provably unchanged.',
      instructions: `Take a module of a few hundred lines that works and is poorly structured.
Your own earlier work is ideal; a small open-source project is fine.

**First, pin the behaviour.** Write characterisation tests that capture what it currently does —
including anything that looks like a bug. You are recording, not judging.

**Then restructure, one move at a time**, committing after each: extract a function, rename,
introduce a parameter, invert a condition to remove nesting. The suite must be green between
every commit. **Do not fix any bugs.** If you find one, note it and leave it; that is a separate
piece of work.

**Submit:** the repository with its commit history, and a short note of no more than a page
covering what is now testable that was not, one specific future change that would now be local
rather than spreading, and any bug you found and deliberately left.

You are finished when the characterisation tests you wrote at the start still pass, unedited.`,
      rubric: [
        { criterion: 'Behaviour provably unchanged', description: 'Characterisation tests were written first and still pass without having been edited.', maxPoints: 30 },
        { criterion: 'Worked in verifiable steps', description: 'The history shows several small commits rather than one large one, with the suite green throughout.', maxPoints: 25 },
        { criterion: 'The structural improvement is real', description: 'Something is now testable, reusable or locally changeable that demonstrably was not before.', maxPoints: 25 },
        { criterion: 'Justified by cost, not taste', description: 'The note names a concrete future change that became cheaper, rather than describing the result as cleaner.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A characterisation test should capture behaviour that looks like a bug because the refactor must:',
        [['Leave behaviour unchanged, bugs included', true],
         ['Fix the bug as part of improving the structure', false],
         ['Document the bug for whoever maintains it next', false],
         ['Avoid touching the code path the bug lives in', false]],
        'Changing behaviour and changing structure in one step means a failure afterwards cannot be attributed to either. The bug is a separate commit.'),
      mcq('Having to edit the characterisation tests during the work means:',
        [['Behaviour moved, so it is no longer a refactor', true],
         ['The tests were written at the wrong level of detail', false],
         ['The restructuring went further than was necessary', false],
         ['The original behaviour was too unclear to pin down', false]],
        'The tests are the definition of unchanged. Editing them to make them pass removes the only evidence the exercise was producing.'),
      mcq('Clean code is demonstrated on existing code rather than a blank page because on a blank page:',
        [['Anybody writes tidily, so nothing is shown', true],
         ['There is no way to measure the quality objectively', false],
         ['The exercise would take considerably longer to do', false],
         ['Structure matters less than it does when maintaining', false]],
        'The skill is improving something already written and already depended on. Starting fresh removes every constraint that makes it difficult.'),
    ],
  },

  /* ══ T4_OOP_DESIGN ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_OOP_DESIGN_ABSTRACTION_THAT_EARNS_IT',
    notes: `**Every layer you add is a layer the next reader has to hold**, and that cost is paid
whether or not the layer was worth it.

## What an abstraction costs

**A name to learn.** The reader now has to know what \`PaymentStrategy\` means before they can
follow anything.

**A hop to trace.** Finding what actually runs means following an interface to an
implementation, and with three layers that is three hops.

**A wrong shape becomes expensive.** An abstraction that fits two cases and not the third forces
the third to be contorted through it, and that is worse than no abstraction at all.

## What it buys

**A decision that can change in one place.** Real, and only when the decision actually changes.

**Something testable in isolation**, by substituting the other side.

**A name for a concept the team keeps discussing.** Underrated. If four people keep saying "the
thing that decides which warehouse", that concept wants a name.

## The rule that holds up

**Abstract when the second case arrives, not when you imagine it.** Two real cases tell you the
shape; one real case and one imagined case tells you the shape of your imagination, and it is
usually wrong.

## The version of this that is a mistake

**A layer that only ever has one implementation, added in case there is a second.** You have paid
the name, the hop and the indirection, and bought nothing. If the second implementation arrives,
introducing the layer then is a morning's work, and you will know its real shape.`,
    mcqs: [
      mcq('An abstraction with exactly one implementation, added for a hypothetical second, has bought:',
        [['Nothing, while paying the indirection cost', true],
         ['Flexibility, which will pay off when needed later', false],
         ['Testability, since the single side can be replaced', false],
         ['Clarity, because the concept now has its own name', false]],
        'Every cost is paid up front and the benefit is contingent. If the second case arrives, adding the layer then is cheap and better informed.'),
      mcq('The reason to abstract on the second real case rather than the first imagined one is that two real cases:',
        [['Tell you the actual shape of the variation', true],
         ['Are enough to justify the work of extracting it', false],
         ['Prove that a third case is likely to arrive soon', false],
         ['Make the refactor easier than it would be with one', false]],
        'One real and one imagined case gives you the shape of your imagination, which is usually wrong, and a wrong abstraction is worse than none.'),
      mcq('An abstraction that fits two cases and not a third is worse than no abstraction because the third must be:',
        [['Contorted to pass through the wrong shape', true],
         ['Implemented separately, duplicating the other two', false],
         ['Deferred until the abstraction can be widened out', false],
         ['Handled by a special case inside the abstraction', false]],
        'The layer is load-bearing by then, so the odd case is forced through it. The result is harder to follow than three independent implementations.'),
    ],
    checkpoint: [
      mcq('Four people keep saying "the thing that decides which warehouse". This suggests:',
        [['A concept that wants a name in the code', true],
         ['A requirement that has not been specified clearly', false],
         ['A module that is doing more than one job already', false],
         ['A design decision that has not yet been made at all', false]],
        'Repeated informal phrasing is evidence the concept is real and unnamed. Naming it is one of the cheapest abstractions there is.'),
      mcq('The cost of an abstraction that a reader pays on every visit is:',
        [['A hop to trace what actually runs', true],
         ['A slower execution path through the program', false],
         ['A larger compiled artefact to load and deploy', false],
         ['A greater chance of the interface being misused', false]],
        'Finding the real behaviour means following the interface to an implementation, and that indirection is paid by every reader every time.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_COMPOSITION_AND_INTERFACES',
    notes: `**Inheritance ties two things together forever. Composition lets them change apart.**

## The practical difference

**Inheritance says "is a".** A subclass gets everything the parent has, including things it does
not want, and it is coupled to the parent's internals — a change inside the parent can break a
subclass that never mentioned it.

**Composition says "has a".** The object holds another and calls it. What it exposes is its own
decision.

## When inheritance is right

**When the subtype genuinely is the supertype everywhere**, and any code working with the parent
works with the child without knowing. That is a strong claim and it is true less often than it
looks.

**A practical test:** if any method of the subclass has to throw "not supported", the claim was
false.

## The one everybody gets wrong

\`Square extends Rectangle\`. A square is a rectangle in geometry. In code, \`setWidth\` and
\`setHeight\` must keep the sides equal, so a function that sets width and height independently —
perfectly valid for a rectangle — breaks. **The relationship was real and the substitution was
not.**

## Programming to an interface

**Depending on what a thing DOES rather than what it IS.** The payment code needs something that
can charge; it does not need to know it is Stripe. That is what makes the second provider a new
class rather than a rewrite.

**And what makes testing possible:** the test supplies something that can charge and records
what it was asked to do.

## The default

**Prefer composition.** Not because inheritance is wrong, but because composition's mistakes are
cheaper to undo. A wrong inheritance hierarchy is felt for years.`,
    mcqs: [
      mcq('A subclass method that throws "not supported" indicates that:',
        [['The is-a relationship does not actually hold', true],
         ['The parent class has too many methods on it', false],
         ['The method should have been marked as abstract', false],
         ['The subclass needs to be split into two classes', false]],
        'Substitutability is the whole claim inheritance makes. A method that cannot be honoured means code holding the parent type can break on the child.'),
      mcq('`Square extends Rectangle` fails in code although a square is a rectangle because:',
        [['Setting width and height independently breaks it', true],
         ['A square needs fewer fields than a rectangle does', false],
         ['Geometry relationships never map onto class hierarchies', false],
         ['The area calculation differs between the two shapes', false]],
        'The relationship is real and the substitution is not. Valid rectangle operations violate the square’s invariant, which is what substitutability forbids.'),
      mcq('Depending on an interface rather than a concrete class is what makes a second provider:',
        [['A new class rather than a rewrite', true],
         ['Faster to integrate than the first one was', false],
         ['Testable without needing the first one present', false],
         ['Optional, so the system works without either one', false]],
        'The dependency is on the capability, so anything providing it fits. Without the interface, the provider’s identity is spread through the calling code.'),
    ],
    checkpoint: [
      mcq('Composition is the default rather than inheritance chiefly because its mistakes are:',
        [['Cheaper to undo later', true],
         ['Less likely to occur in the first place at all', false],
         ['Caught by the compiler rather than at runtime', false],
         ['Easier for a reviewer to notice during a review', false]],
        'A wrong hierarchy is felt for years because everything below it depends on it. A wrong collaborator is replaced in an afternoon.'),
      mcq('A subclass breaks when an unrelated change is made inside its parent. This demonstrates that inheritance couples the subclass to the parent’s:',
        [['Internals, not just its public interface', true],
         ['Version, which must be upgraded together with it', false],
         ['Performance characteristics under a heavy load', false],
         ['Test suite, which must cover both classes at once', false]],
        'A subclass can depend on protected state and on how the parent calls its own methods, so internal changes reach it. Composition exposes only the interface.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_PATTERNS_WORTH_NAMING',
    notes: `**A pattern is a name for a solution people kept arriving at independently.** That is
all it is, and treating it as more than that is where pattern-driven design goes wrong.

## The four worth knowing by name

**Strategy.** Several interchangeable ways of doing one thing, chosen at runtime. Sorting
comparators, pricing rules, payment providers. **The problem it solves:** a growing if/elif over
a type code.

**Factory.** One place that decides which concrete thing to create. **The problem it solves:**
construction logic duplicated across callers who then all need changing.

**Observer.** Something happened; several unrelated parties want to know. **The problem it
solves:** the thing that happened having to know about everybody interested in it.

**Adapter.** A class that makes one interface look like another. **The problem it solves:** an
external library whose shape does not match yours, spreading through your code.

## Recognising rather than applying

**The useful direction is backwards.** You will read code that does one of these without naming
it, and recognising it tells you what the author was solving. Starting from "which pattern should
I use" is how codebases acquire six classes to do one thing.

## The misuse of each

**Strategy with one strategy.** **Factory that only ever constructs one type.** **Observer where
a direct call would do, making the flow untraceable.** **Adapter around a library nobody will
replace.**

**All four are the same mistake:** paying for flexibility that no second case has asked for.

## The interview version

**"Where have you used a design pattern?"** The strong answer names the problem first and the
pattern second, and mentions what it cost.`,
    mcqs: [
      mcq('A design pattern is most accurately described as:',
        [['A name for a solution people kept reaching', true],
         ['A prescribed structure for a class hierarchy', false],
         ['A rule about how object-oriented code is written', false],
         ['A technique for reducing the total lines of code', false]],
        'They were catalogued by observing what experienced developers already did. Treating them as prescriptions is what produces pattern-driven overdesign.'),
      mcq('A growing if/elif over a type code is the problem solved by:',
        [['Strategy, with one implementation per branch', true],
         ['Factory, which centralises the object creation', false],
         ['Observer, which decouples the parties involved', false],
         ['Adapter, which reshapes the differing interfaces', false]],
        'Each branch becomes an interchangeable implementation selected at runtime, so adding a case adds a class instead of editing a conditional.'),
      mcq('The misuse common to strategy-with-one-strategy, factory-of-one-type and unnecessary adapters is:',
        [['Paying for flexibility nothing has asked for', true],
         ['Choosing a pattern that does not fit the problem', false],
         ['Applying a pattern at the wrong layer of the system', false],
         ['Combining several patterns where one would suffice', false]],
        'Each has a real cost in indirection and a benefit contingent on a second case. Without that case the cost is the whole of the transaction.'),
    ],
    checkpoint: [
      mcq('The useful direction for pattern knowledge is recognising them in code you read because starting from "which pattern should I use" produces:',
        [['Six classes doing the work of one', true],
         ['Code that other developers find harder to read', false],
         ['Patterns applied at an inappropriate level of scale', false],
         ['A design that is difficult to test in isolation', false]],
        'Beginning from the catalogue rather than the problem fits the problem to the pattern. Recognition tells you what somebody else was solving, which is useful.'),
      mcq('Asked where you used a design pattern, the strongest answer names:',
        [['The problem first, then the pattern', true],
         ['The pattern and the standard reference for it', false],
         ['Several patterns used together in one system', false],
         ['The pattern and how faithfully it was implemented', false]],
        'Leading with the problem shows the pattern was a response to something. Leading with the pattern suggests the catalogue came first.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_DEBUGGING',
    notes: `**Designs that compile, pass their tests, and will hurt.**

## What to look for

**An inheritance hierarchy where substitution fails.** A subclass throwing "not supported", or
overriding a method to do something unrelated to what the parent promised.

**A class that knows too much.** It reaches into another object's internals — \`order.items[0].
price\` — so that object's structure is now part of this one's contract.

**A God object.** One class that everything talks to, because every feature added something to
it. Its tests take a minute to set up, which is how you can tell.

**Indirection with nothing behind it.** Three layers of interface, one implementation each, added
in case.

## The question that finds all four

**"What would I have to change to add X?"** Pick a plausible next feature and trace it. If the
answer touches five classes, the design has told you where its seams are not.

## Why these are harder than bugs

**Nothing fails.** There is no traceback, no failing test, no symptom — only the future cost,
which has not been paid yet. That is exactly why they survive reviews, and why being able to see
them is a distinguishing skill rather than a basic one.

## Reporting one

**Name the feature that would be expensive**, and say which classes it touches and why. That is
a claim somebody can check and either accept or argue with, which a complaint about coupling is
not.`,
    mcqs: [
      mcq('`order.items[0].price` inside another class makes that order’s internal structure part of the:',
        [['Calling class’s contract', true],
         ['Order class’s public documented interface', false],
         ['Test setup required for the calling class only', false],
         ['Inheritance relationship between the two classes', false]],
        'Reaching through one object into another’s internals means changing that structure breaks this class, so the structure is no longer private.'),
      mcq('The practical tell of a God object is that its tests:',
        [['Take a long time to set up', true],
         ['Fail more often than tests of other classes', false],
         ['Cover a smaller proportion of its total lines', false],
         ['Run more slowly than the rest of the suite does', false]],
        'Setup cost is proportional to how much the class depends on. A minute of arranging before a single assertion is the symptom stating itself.'),
      mcq('Design problems survive code review more easily than bugs because they:',
        [['Produce no symptom that anything is wrong', true],
         ['Appear in parts of the code nobody reads closely', false],
         ['Are matters of taste that reviewers avoid raising', false],
         ['Require more context than a reviewer usually has', false]],
        'There is no traceback and no failing test — only a cost that has not been paid yet, so there is nothing drawing a reviewer’s eye to it.'),
    ],
    checkpoint: [
      mcq('Tracing a plausible next feature through a design is useful because if it touches five classes, the design has revealed:',
        [['Where its seams are not', true],
         ['That the feature was badly specified to begin with', false],
         ['That those five classes should be merged together', false],
         ['That the system needs an additional abstraction layer', false]],
        'A good decomposition means a coherent change is local. A change that spreads shows the boundaries were drawn somewhere other than where change happens.'),
      mcq('Reporting a design problem as "this feature would touch five classes" is stronger than "this is too coupled" because the first is:',
        [['Checkable, so it can be agreed or disputed', true],
         ['More polite, so the author is less likely to object', false],
         ['More specific about which principle is violated here', false],
         ['Easier for a junior developer to act on immediately', false]],
        'A concrete prediction can be verified by tracing it. A judgement about coupling can only be accepted or declined on authority.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_PRACTICE',
    notes: `**Design decisions made, defended, and revisited.**

## The drill

Each exercise gives a requirement and two defensible designs. **Choose one, implement enough to
be concrete, then say what you gave up.**

**There is no right answer**, which is the point. What is being practised is making a choice for
a reason and being able to state the reason, because that is exactly what a design interview
asks for.

## The reasons that count

**What changes most often?** Put the seam where change happens. A system whose pricing rules
change monthly and whose storage never does should be flexible about pricing and concrete about
storage.

**Who else touches this?** A design one person maintains and a design six teams call have
different right answers.

**How reversible is it?** Prefer the decision you could undo. Where both are reversible, prefer
the simpler one.

## The second half of every exercise

**Now add the requirement you were not told about.** Which design absorbed it, and which had to
be reopened?

**Frequently it is the simpler one that absorbed it better**, and that is the lesson worth having
rather than being told: flexibility placed where change did not happen is cost without benefit.

## What good looks like

**You can state what your design is bad at.** Every design is bad at something. Not knowing what
means you have not finished designing it.`,
    mcqs: [
      mcq('When choosing between two defensible designs, the most useful question is which part of the system:',
        [['Changes most often in practice', true],
         ['Contains the most complicated logic currently', false],
         ['Is the largest in terms of the code involved', false],
         ['Was the most difficult part to implement first', false]],
        'Flexibility only pays where change actually arrives. Placing the seam anywhere else is indirection bought and never used.'),
      mcq('A simpler design often absorbs an unexpected requirement better than a flexible one because the flexibility was:',
        [['Placed where the change did not happen', true],
         ['Not implemented thoroughly enough to be useful', false],
         ['Designed before the requirement was fully known', false],
         ['Too general to handle a specific new case well', false]],
        'A flexible design is flexible in one direction. When change comes from another, that direction is cost and the simpler design has less to unpick.'),
      mcq('Being able to state what your design is bad at indicates that:',
        [['The trade-off was actually considered', true],
         ['The design should probably be reconsidered again', false],
         ['A better alternative exists and was not chosen', false],
         ['The requirements were not specified clearly enough', false]],
        'Every design sacrifices something. Knowing what is the evidence that a choice was made rather than a default being followed.'),
    ],
    checkpoint: [
      mcq('A system whose pricing rules change monthly and whose storage has never changed should be:',
        [['Flexible about pricing, concrete about storage', true],
         ['Flexible about both, since either could change', false],
         ['Concrete about both, and changed when needed', false],
         ['Flexible about storage, which is harder to change', false]],
        'Seams belong where change arrives. Abstracting storage that has never moved pays indirection on every read for a benefit nothing has requested.'),
      mcq('The exercises deliberately have no single right answer because what is being practised is:',
        [['Choosing for a reason you can state', true],
         ['Recognising which of the options is conventional', false],
         ['Implementing a design quickly and then revising it', false],
         ['Comparing designs against an established standard', false]],
        'A design round has no answer key either. The assessment is entirely about whether the reasoning holds up when it is pushed.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_INTERVIEW_QUESTION',
    notes: `**"Walk me through a design decision you made and the alternative you rejected."**

## Why the alternative matters more than the choice

**A choice without an alternative is a default.** The interviewer is not checking whether you
picked what they would have picked; they are checking whether there was a decision at all.

**"I used inheritance" is a fact.** "I used composition because the two implementations shared
no state and I expected a third" is a decision.

## The structure that works

**The constraint.** What made this non-obvious? If it was obvious, pick a different example.

**Both options, fairly.** Describing the rejected one as obviously bad suggests it was never
really considered, and the interviewer has probably built systems the other way.

**Why you chose.** One or two concrete reasons, tied to what you knew at the time.

**What it cost.** Every choice costs something. Naming it is the strongest part of the answer and
the part most candidates omit entirely.

**What you know now.** "It held up" and "I would do it differently" are both good answers.
"I have not thought about it since" is not.

## The follow-up to expect

**"What if the requirement had been X instead?"** They are testing whether your reasoning was
general or whether you memorised a story. **Reason out loud from the constraint you named**; do
not defend the original decision against a requirement it was not made under.

## The failure mode

**Defending the choice as obviously correct.** Design questions have no answer key, and treating
one as though it does reads as never having had the decision contested by reality.`,
    mcqs: [
      mcq('The interviewer asks about the rejected alternative chiefly to establish whether:',
        [['There was a decision at all', true],
         ['You are familiar with more than one approach', false],
         ['The chosen option was the conventional one here', false],
         ['You can argue persuasively for your own position', false]],
        'A choice with no alternative considered is a default. The alternative is the evidence that the design was reasoned about rather than reached for.'),
      mcq('Describing the rejected option as obviously bad is a weak move because the interviewer:',
        [['Has probably built systems that way', true],
         ['Expects both options to be presented equally well', false],
         ['Will ask you to defend that characterisation next', false],
         ['Is assessing your ability to be diplomatic about it', false]],
        'Both options were defensible or it was not a decision. Dismissing one suggests it was never weighed, and the interviewer may well have chosen it.'),
      mcq('"What if the requirement had been X instead?" is testing whether your reasoning was:',
        [['General, or a story you have memorised', true],
         ['Correct under the original requirement given', false],
         ['Influenced by constraints you did not mention', false],
         ['Arrived at independently or taken from a colleague', false]],
        'Reasoning that transfers to a changed constraint came from principles. An account that cannot move came from remembering what happened.'),
    ],
    checkpoint: [
      mcq('The part of a design answer most candidates omit is:',
        [['What the chosen option cost them', true],
         ['The constraint that made it non-obvious', false],
         ['The alternative that was rejected at the time', false],
         ['Whether the decision held up afterwards or not', false]],
        'Cost is the hardest part to volunteer and the strongest signal, because it shows the trade-off was understood rather than the choice being defended.'),
      mcq('Defending a design decision as obviously correct reads poorly because design questions:',
        [['Have no answer key, which the candidate is denying', true],
         ['Are always asked about decisions that were wrong', false],
         ['Require the candidate to show humility about them', false],
         ['Are scored on the number of alternatives considered', false]],
        'Treating a genuinely contested choice as settled suggests the decision has never been challenged by reality, which is what the round is probing.'),
    ],
  },
  {
    unitCode: 'T4_OOP_DESIGN_MINI_PROJECT',
    notes: `**Build the same small system twice, two different ways, and say which was better and
what "better" meant.**

## The brief

Pick something small with real variation in it — a pricing engine with several rule types, a
notification system with several channels, a report generator with several formats.

**Build it twice.** Once with a conditional over a type code. Once with an interface and one
implementation per case.

**Both will work.** That is the point; you are comparing designs rather than finding a working
one.

## Then change it

**Add a case that was not in the original requirements**, and record honestly how long each
version took and what you touched.

**Then change something all cases share** — an audit log entry, a new field on every result — and
record that too.

**The interesting part is that these two changes usually favour opposite designs.** The
conditional absorbs the shared change easily and the per-case one badly; the interface absorbs the
new case easily and the shared change badly.

## What you are producing

**Not a winner.** A statement of which kind of change each design is good at, in your own words,
from having felt both.

**That is the thing a design interview is actually testing**, and reading about it does not
produce it.`,
    assignment: {
      title: 'The same system, designed twice',
      description: 'Build one small system with a conditional and again with an interface, then measure both against two different kinds of change.',
      instructions: `Pick something small with genuine variation in it: a pricing engine with
several rule types, notifications with several channels, a report generator with several formats.

**Build it twice.** Once as a conditional over a type code. Once with an interface and one
implementation per case. Both must actually work.

**Then apply two changes to each version and record what happened.** First, add a case that was
not in the original requirements. Second, change something every case shares — an audit log line,
an extra field on every result. For each of the four, note what you touched and roughly how long
it took.

**Submit:** both implementations, and a note of no more than a page saying which kind of change
each design absorbed well, which it absorbed badly, and what you would now ask about a system
before choosing between them.

There is no correct answer here. A note concluding that one design is simply better has probably
not applied both changes honestly.`,
      rubric: [
        { criterion: 'Both versions work', description: 'Each implementation genuinely handles all the original cases, so the comparison is between designs rather than between a finished and an unfinished thing.', maxPoints: 20 },
        { criterion: 'Both changes applied to both', description: 'The new case and the shared change were each made to both versions, with what was touched recorded.', maxPoints: 30 },
        { criterion: 'The comparison is honest', description: 'The note identifies where each design was worse, rather than concluding that one is better overall.', maxPoints: 30 },
        { criterion: 'A transferable question', description: 'The note ends with something specific to ask about a future system, derived from what the exercise showed.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Adding a new case and changing something all cases share usually favour:',
        [['Opposite designs, which is the point of the exercise', true],
         ['The interface version, in both of the two cases', false],
         ['The conditional version, in both of the two cases', false],
         ['Whichever design was written second and more carefully', false]],
        'An interface localises per-case change and spreads shared change across implementations. A conditional does exactly the reverse.'),
      mcq('A submission concluding that one design is simply better has most likely:',
        [['Not applied both kinds of change honestly', true],
         ['Chosen a system with too little variation in it', false],
         ['Implemented one of the two versions incompletely', false],
         ['Measured the time taken rather than what was touched', false]],
        'Each design is worse at one of the two changes. A one-sided conclusion means one of them was not really felt.'),
      mcq('Building it twice rather than reading about the trade-off matters because the judgement being built is:',
        [['Felt, and reading does not produce it', true],
         ['Specific to the language being used for the exercise', false],
         ['Only assessable through a practical demonstration', false],
         ['Dependent on the particular system that was chosen', false]],
        'Design intuition comes from having paid both costs. The trade-off is easy to state and hard to weigh without having lived on both sides of it.'),
    ],
  },
];
