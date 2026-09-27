/**
 * T3_SWE_EVOLVING, T3_SWE_WORKFLOW, T3_SWE_DOCS and T3_SWE_PROJECT — thirteen units.
 * Finishes S18B.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * EVOLVING overlaps the core refactoring topic and has to earn its place. The core unit is
 * about improving code you understand. These three are about code you do not: finding where
 * a behaviour lives in a codebase too large to read, getting a test around something that
 * has none, and naming the cost of a shortcut before you take it.
 *
 * WORKFLOW overlaps the core CI/CD and version control material and is the thinnest topic
 * in the track. Two units, and they are honest about it: the pipeline unit is the core unit
 * seen from the team's side, and BRANCH_AND_REVIEW is about why small changes are what make
 * the loop work at all — which the core unit mentions and does not argue.
 *
 * DOCS overlaps the core documentation topic. WHY_IT_IS_THIS_WAY is the decision record,
 * which the core unit names and does not teach. WHAT_IT_DOES_AT_3AM is logging as a message
 * to whoever is woken up, which is a different audience from the core logging unit's.
 *
 * Attribution: EVOLVING defaults to REFACTORING with DEBT_ON_PURPOSE on TECHNICAL_DEBT.
 * WORKFLOW defaults to CI_CD with the branch unit on GIT_BRANCHING. DOCS defaults to
 * TECHNICAL_WRITING with the 3am unit on LOGGING_DIAGNOSTICS. The project is all
 * PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SWE_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_SWE_EVOLVING ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_EVOLVING_READING_UNFAMILIAR_CODE',
    notes: `**Most of your career is spent changing code you did not write**, in a codebase too
large to read end to end. The skill is not reading faster. It is **finding the one thread that
matters and ignoring everything else.**

## Do not start at the top

**Do not read the folder structure.** It tells you how somebody once organised things, not how
the code works.

**Do not read from the entry point downwards.** You will spend an hour in framework
initialisation.

**Start from a behaviour.** One thing the system does that you can observe.

## The four ways in, in order of usefulness

**Search for a string the user sees.** An error message, a label, a heading. **It puts you
within three files of the behaviour in about ten seconds**, and it is the single most
effective technique in this unit.

**Run it and follow a request.** Add a log line, or attach a debugger, and watch where
execution actually goes. **What actually runs is a much smaller set than what exists.**

**Read the tests.** They are the documented behaviour, and they are usually honest. **A test
name is a sentence somebody wrote about what this is for.**

**Read the history.** Why does this line exist? \`git log -S\` finds the commit that introduced
a string, and the commit message and its ticket often explain what no comment does.

## Building a map as you go

**Write it down.** You will not remember, and the second pass is where the time goes.

**A few lines per file you touch**: what it does, what calls it, what it calls.

**Name the seams** — the boundaries where one part stops and another begins, because those are
where you will make your change.

**And note what you decided not to read**, so you know the edges of your own understanding.
**"I have not looked at the billing side" is a useful sentence to be able to say in review.**

## Questions that orient you fast

**Where does data come in?** Requests, jobs, messages, files.

**Where does it go out?** Database, API calls, files, responses.

**What is the central type?** Most codebases have one thing everything is about.

**What is obviously old?** Two ways of doing the same thing usually means a migration nobody
finished, and knowing which one is current saves you a day.

## How long to spend

**Long enough to find the thread, not long enough to understand the system.** You will never
understand the system, and the people who wrote it do not either.

**A day of reading before a small change is too long.** An hour, then make the change, and
**let the review catch what you missed** — which is a legitimate use of review and is much
cheaper than the day.`,
    mcqs: [
      mcq('The single most effective way into an unfamiliar codebase is:',
        [['Searching for a string the user sees, such as an error or a label', true],
          ['Reading the folder structure to understand the organisation', false],
          ['Following execution downwards from the application entry point', false],
          ['Reading the documentation the project has, if any exists', false]],
        'It puts you within three files of the behaviour in about ten seconds.'),
      mcq('Running it and following a request helps because:',
        [['What actually runs is a much smaller set than what exists', true],
          ['It reveals performance characteristics alongside the flow', false],
          ['It shows which code paths are covered by tests', false],
          ['A debugger gives more detail than reading the source', false]],
        'Add a log line and watch where execution actually goes.'),
      mcq('Two ways of doing the same thing in a codebase usually means:',
        [['A migration nobody finished, and knowing the current one saves a day', true],
          ['Two teams with different conventions working in parallel here', false],
          ['A deliberate abstraction over two different backends', false],
          ['Code that was copied rather than extracted properly', false]],
        'Ask what is obviously old.'),
      mcq('A day of reading before a small change is:',
        [['Too long — an hour, then make the change and let review catch the rest', true],
          ['Appropriate for a codebase you have never seen', false],
          ['Necessary before touching anything you do not already understand', false],
          ['Reasonable if the change affects a shared component', false]],
        'You will never understand the system, and neither do the authors.'),
    ],
    checkpoint: [
      mcq('Test names are useful for orientation because:',
        [['Each one is a sentence somebody wrote about what this is for', true],
          ['They cover the behaviours the team considered important', false],
          ['They are updated more often than the documentation', false],
          ['They show which components depend on which', false]],
        'And they are usually honest.'),
      mcq('Noting what you decided not to read matters because:',
        [['"I have not looked at the billing side" is useful to say in review', true],
          ['It documents the scope of the change for the ticket', false],
          ['It helps you resume the reading later', false],
          ['It shows the reviewer exactly where to focus their attention', false]],
        'Know the edges of your own understanding.'),
      mcq('Searching the history with a string search finds:',
        [['The commit that introduced it, whose message often explains what no comment does', true],
          ['Every change to the file containing that string', false],
          ['The author most familiar with that area of the code', false],
          ['Whether the line has been modified at any point since it was first written', false]],
        'Why does this line exist?'),
    ],
  },

  {
    unitCode: 'T3_SWE_EVOLVING_CHANGING_IT_SAFELY',
    notes: `**A characterisation test first, then the change.** That order is the whole unit,
and it is the difference between changing code confidently and changing it hopefully.

## What a characterisation test is

**Not a test of what the code should do. A test of what it does.**

Including the parts that look wrong. **Especially those** — **the behaviour that looks like a
bug is the one somebody downstream depends on**, and it is the one that will break when you
tidy it.

**You are not endorsing the behaviour. You are recording it**, so that you can tell whether
your change altered anything you did not intend.

## Writing one around untestable code

The code has no tests because it is hard to test. That is the situation, not an excuse.

**Find the smallest seam.** A function, a class, an endpoint. Something you can call.

**Call it and see what happens.** Write the result into an assertion, even if the result is
strange.

**When it needs a database**, use a real one in a container rather than mocking — **a
characterisation test against a mock characterises your mock**, which is the one thing you
already know.

**When it needs the whole system**, characterise at the HTTP level. Slow is fine; this test
exists to be deleted later.

**And when you genuinely cannot get a test around it**, say so in the pull request and make
the smallest possible change. **That is an honest position and it is a much better one than
pretending.**

## Then change it

**One change at a time.** Run the tests between each.

**Separate refactoring from behaviour change**, into different commits — ideally different
pull requests. **A diff that both moves code and changes it cannot be reviewed**, because the
reviewer cannot see the change through the movement.

**Keep the characterisation tests passing** until you deliberately decide a behaviour should
change. Then update the test in the same commit, with the reason in the message.

## The refactor that is safe

**Rename.** With a tool, not with find and replace.

**Extract a function** from a block that has a name in your head.

**Introduce a parameter** where a value was reached for.

**Invert a condition** to remove nesting.

**Each of these is small, mechanical and reversible**, and a sequence of them gets you a long
way. **The unsafe version is the one where you do four at once and cannot tell which broke
it.**

## When to stop

**Stop when the code is good enough to make your change**, not when it is good.

**A cleanup that grows to touch forty files is a cleanup that will not be reviewed**, will
conflict with everybody, and will be reverted when something breaks in an unrelated area.

**Leave it better than you found it, by a small amount, repeatedly.** That is the only version
of this that works on a real team.`,
    mcqs: [
      mcq('A characterisation test records:',
        [['What the code does, including the parts that look wrong', true],
          ['What the code should do once the change is made', false],
          ['The behaviour the documentation specifies', false],
          ['Only the behaviour your change will affect', false]],
        'The behaviour that looks like a bug is the one somebody depends on.'),
      mcq('A characterisation test against a mock:',
        [['Characterises your mock, which is the one thing you already know', true],
          ['Is acceptable when the real dependency is slow', false],
          ['Captures the interaction rather than the actual behaviour', false],
          ['Works provided the mock matches the real interface', false]],
        'Use a real database in a container.'),
      mcq('A diff that both moves code and changes it:',
        [['Cannot be reviewed, because the change is invisible through the movement', true],
          ['Takes rather longer to review but is otherwise entirely acceptable', false],
          ['Should be accompanied by a detailed description', false],
          ['Is fine when the movement is mechanical', false]],
        'Separate commits, ideally separate pull requests.'),
      mcq('The unsafe version of a mechanical refactor is:',
        [['Doing four at once and being unable to tell which one broke it', true],
          ['Using find and replace rather than a rename tool', false],
          ['Refactoring before any of the characterisation tests exist', false],
          ['Extracting a function that is only called once', false]],
        'Small, mechanical, reversible, one at a time.'),
    ],
    checkpoint: [
      mcq('When you genuinely cannot get a test around the code, you should:',
        [['Say so in the pull request and make the smallest possible change', true],
          ['Write an end-to-end test that exercises it indirectly instead', false],
          ['Refactor until it becomes testable, then change it', false],
          ['Rely on manual verification and note what you checked', false]],
        'An honest position, and much better than pretending.'),
      mcq('You should stop cleaning up when:',
        [['The code is good enough to make your change, not when it is good', true],
          ['Every characterisation test still passes', false],
          ['The component matches the team conventions used in that area', false],
          ['You have spent the time you allocated to it', false]],
        'A cleanup touching forty files will not be reviewed.'),
      mcq('A characterisation test at the HTTP level being slow is:',
        [['Acceptable, because this test exists to be deleted later', true],
          ['A reason to characterise at a lower level instead', false],
          ['Only tolerable while the change is in progress', false],
          ['A sign the seam was chosen too far out', false]],
        'Characterise where you can, not where it is elegant.'),
    ],
  },

  {
    unitCode: 'T3_SWE_EVOLVING_DEBT_ON_PURPOSE',
    notes: `**A shortcut named, costed and written down is a decision. One nobody mentioned is
a trap.** The difference is not the code — it is often exactly the same code — it is whether
the next person knows.

## What debt actually is

**Not bad code.** Bad code is bad code.

**Debt is a deliberate trade: less work now, more work later**, taken because now matters
more.

**And like an actual debt, it has interest** — every change in that area costs a little more
until it is paid off, which is why the cheap shortcut becomes expensive without anybody
deciding.

## When taking it is right

**A deadline that genuinely matters.** A launch, a demo, a customer commitment.

**Validating something before building it properly.** **Most features are not kept**, and
building the throwaway version properly is the actual waste.

**A migration in progress**, where two ways of doing something is the intermediate state and
the alternative is a big-bang rewrite.

**And when the proper version needs information you do not have yet**, which is the most
honest reason of the four.

## When it is not

**Because a test was inconvenient.** That is not debt; that is skipping a step.

**Because you did not think about it.** Unconsidered is not deliberate.

**Repeatedly in the same area**, which is not debt but a decision to keep the area bad.

**And when nobody is told.** **An undocumented shortcut is indistinguishable from a mistake**,
and the next person will treat it as one — usually by building on top of it.

## Writing it down

In the code, at the point of the shortcut:

> \`// SHORTCUT: no pagination here. Fine while this is admin-only and under about a thousand
> rows. If this becomes customer-facing it needs cursor pagination — roughly a day.
> See TICKET-482.\`

**Four things: what, why it is acceptable now, what would change that, and what the fix
costs.**

**The third one is the most valuable** and the one most often missing. A shortcut with a
stated trigger is a shortcut somebody can watch for. **One without a trigger is discovered
when it breaks.**

## Tracking it

**A ticket**, not just a comment. Comments are invisible until you are already in the file.

**With the cost of fixing it**, roughly.

**And revisited.** A quarterly look at the list, deciding what to pay and what to accept,
takes an hour.

**Accepting debt permanently is a legitimate outcome** — "this is fine forever, closing the
ticket" is a real decision and a much better one than a list of forty items nobody reads.

## Talking about it

**To a non-engineer**, describe the consequence and not the cause. Not "the export code has
no pagination" but **"exports will start timing out when a customer has more than a few
thousand rows, which will happen this year".**

**Give the cost of fixing and the cost of not.**

**And do not moralise about it.** A shortcut taken to hit a launch was often the right call,
and an engineer who treats every piece of debt as a failure is one whose warnings get
discounted.`,
    mcqs: [
      mcq('The difference between debt and a trap is:',
        [['Whether the next person knows, not what the code looks like', true],
          ['Whether the shortcut was approved before being taken', false],
          ['How much the eventual fix is going to cost', false],
          ['Whether a ticket exists to track the work', false]],
        'It is often exactly the same code.'),
      mcq('Building the throwaway version properly is the actual waste because:',
        [['Most features are not kept', true],
          ['Proper versions take disproportionately longer to build', false],
          ['Requirements change before the work is finished', false],
          ['The proper version encodes assumptions that turn out wrong', false]],
        'Validating something before building it properly is a legitimate reason.'),
      mcq('An undocumented shortcut is:',
        [['Indistinguishable from a mistake, and will be built on top of', true],
          ['Acceptable when the author remains on the team', false],
          ['Discovered during the next code review of that area', false],
          ['Equivalent to debt with a lower interest rate', false]],
        'The next person will treat it as one.'),
      mcq('The most valuable and most often missing part of a shortcut note is:',
        [['What would change the calculation and make it no longer acceptable', true],
          ['The estimated cost of doing it properly', false],
          ['The reason the shortcut was taken at the time', false],
          ['A link to the ticket that tracks the eventual fix for this', false]],
        'A shortcut with a stated trigger is one somebody can watch for.'),
    ],
    checkpoint: [
      mcq('"This is fine forever, closing the ticket" is:',
        [['A real decision, and better than forty items nobody reads', true],
          ['An admission the debt was never worth tracking', false],
          ['Acceptable only for debt in code that rarely changes', false],
          ['A decision that should be revisited each quarter anyway', false]],
        'Accepting debt permanently is a legitimate outcome.'),
      mcq('Describing debt to a non-engineer means giving:',
        [['The consequence and when it will arrive, not the technical cause', true],
          ['A simplified version of the technical explanation you would give', false],
          ['The cost of fixing it, expressed in engineer-days', false],
          ['An analogy that conveys the accumulating interest', false]],
        '"Exports will start timing out when a customer has a few thousand rows."'),
      mcq('An engineer who treats every shortcut as a failure:',
        [['Is one whose warnings get discounted', true],
          ['Holds the team to a consistent standard', false],
          ['Will be right more often than not over time', false],
          ['Makes it harder for others to take shortcuts silently', false]],
        'A shortcut taken to hit a launch was often the right call.'),
    ],
  },

  {
    unitCode: 'T3_SWE_EVOLVING_DEBUGGING',
    notes: `Five ways changing unfamiliar code goes wrong.

## 1. You changed the wrong copy

**Symptom:** the change has no effect, and the code you edited is definitely correct.

**Causes:** the same logic in two places and the live one is the other; a build serving a
cached artefact; an override in configuration; a subclass replacing the method.

**Diagnosis:** **put something impossible in there — throw, or log a nonsense string — and see
if it happens.** Ten seconds, and it settles the question that would otherwise take an hour.

**Fix:** find the live path before editing anything, by running it.

## 2. It broke something unrelated

**Symptom:** a failure in a feature you have never heard of.

**Cause:** a caller you did not know about. **The commonest way a small change becomes an
incident.**

**Diagnosis:** find every caller before changing a signature or a behaviour. **A search on the
name is the minimum**, and it is not sufficient where reflection, dependency injection or
dynamic dispatch is involved.

**Fix:** characterisation tests around the callers you found, and a deploy you can reverse.

## 3. The refactor changed behaviour and nobody noticed

**Symptom:** a subtle difference discovered weeks later.

**Causes:** no characterisation test; a diff mixing movement and change; a behaviour that
looked like a bug and was removed on purpose.

**Fix:** characterise first, separate commits, and **never fix a bug during a refactor** — do
it after, in its own change, where it can be seen and reverted independently.

## 4. Nobody will review it

**Symptom:** a large refactoring pull request sits for a week.

**Cause:** it is too large, and the reviewer cannot tell what is movement and what is change.

**Fix:** split it. Mechanical moves in one, behaviour in another, and say in the description
which is which. **A reviewer who is told "this commit only moves code" can review it in two
minutes.**

## 5. The cleanup grew

**Symptom:** you set out to fix one thing and have touched thirty files.

**Cause:** each fix revealed another. **Which is true, and is not a reason to continue.**

**Fix:** revert to the small change, ship it, and write the rest down as tickets. **The small
change shipped is worth more than the large one pending**, and it is what lets you come back.

## The habits

**Prove which code is live before editing it.**

**Find every caller before changing a signature.**

**Characterise, then change, in that order.**

**Separate movement from behaviour, and say so.**

**And when the cleanup grows, revert to the small change.**`,
    mcqs: [
      mcq('The fastest way to prove which code is live is:',
        [['Put something impossible in there and see whether it happens', true],
          ['Trace the call graph from the entry point down', false],
          ['Check which file the build output includes', false],
          ['Attach a debugger and set a breakpoint on the entry', false]],
        'Ten seconds, settling a question that would otherwise take an hour.'),
      mcq('The commonest way a small change becomes an incident is:',
        [['A caller you did not know about', true],
          ['A behaviour that was relied on downstream', false],
          ['An untested edge case in the new code', false],
          ['A deployment that could not be reversed', false]],
        'Find every caller before changing a signature.'),
      mcq('A search on the name is insufficient where:',
        [['Reflection, dependency injection or dynamic dispatch is involved', true],
          ['The codebase is larger than a few hundred files', false],
          ['The method is part of a published interface', false],
          ['Callers exist in a different language or a different service', false]],
        'It is the minimum, not the whole job.'),
      mcq('You should never fix a bug during a refactor because:',
        [['It can then be seen and reverted independently afterwards', true],
          ['Bug fixes require their own tests to be written', false],
          ['Refactors are reviewed differently from fixes', false],
          ['The characterisation tests would need updating twice', false]],
        'Do it after, in its own change.'),
    ],
    checkpoint: [
      mcq('Telling the reviewer "this commit only moves code":',
        [['Lets them review it in two minutes', true],
          ['Shifts responsibility for correctness to the author', false],
          ['Is only credible if a tool performed the move', false],
          ['Reduces the need for tests around the moved code', false]],
        'Split mechanical moves from behaviour and say which is which.'),
      mcq('"Each fix revealed another" is:',
        [['True, and not a reason to continue', true],
          ['A sign the area needs a dedicated cleanup project', false],
          ['A reason to finish before the context is lost', false],
          ['Evidence the original estimate was wrong', false]],
        'Revert to the small change, ship it, write the rest down.'),
      mcq('The small change shipped is worth more than the large one pending because:',
        [['It is what lets you come back and do the next one', true],
          ['Small changes carry less deployment risk', false],
          ['Pending changes accumulate merge conflicts', false],
          ['Reviewers prefer changes they can read quickly', false]],
        'Better by a small amount, repeatedly.'),
    ],
  },

  {
    unitCode: 'T3_SWE_EVOLVING_PRACTICE',
    notes: `Two exercises on the judgement parts of changing code you did not write: deciding
what is safe to change, and deciding whether a shortcut is debt or a trap.`,
    coding: [
      {
        title: 'Is this change safe yet',
        description: `Read one proposed change per line as
\`<name> <callers_known> <characterised> <reversible>\`, each \`yes\` or \`no\`.

Print, checking in this order:

- callers not known → \`FIND_CALLERS <name>\`
- not characterised → \`CHARACTERISE <name>\`
- not reversible → \`RISKY <name>\`
- otherwise → \`GO <name>\`

Then \`go=<n>\`.

**Callers come first**, because a characterisation test around the wrong seam characterises
the wrong thing, and knowing who calls it is what tells you where the seam is.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Callers first: they tell you where the seam is.
`,
        language: 'python',
        tests: [
          { input: 'rename yes yes yes\n', expectedOutput: 'GO rename\ngo=1' },
          { input: 'signature no yes yes\n', expectedOutput: 'FIND_CALLERS signature\ngo=0' },
          { input: 'extract yes no yes\n', expectedOutput: 'CHARACTERISE extract\ngo=0' },
          { input: 'migrate yes yes no\n', expectedOutput: 'RISKY migrate\ngo=0' },
          { input: 'a no no no\nb yes yes yes\n', expectedOutput: 'FIND_CALLERS a\nGO b\ngo=1', isHidden: true },
        ],
      },
      {
        title: 'Debt or a trap',
        description: `Read one shortcut per line as \`<name> <deliberate> <written_down> <trigger_stated>\`,
each \`yes\` or \`no\`.

Print one line each:

- all three yes → \`DEBT <name>\`
- deliberate and written down, no trigger → \`WEAK <name>\`
- deliberate but not written down → \`TRAP <name>\`
- not deliberate → \`MISTAKE <name>\`

Then \`traps=<n>\`, counting **both** \`TRAP\` and \`MISTAKE\` lines — from the next
engineer's side those are the same thing, which is the point of the unit.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# From the next engineer's side, an unwritten shortcut and a mistake are the same.
`,
        language: 'python',
        tests: [
          { input: 'pagination yes yes yes\n', expectedOutput: 'DEBT pagination\ntraps=0' },
          { input: 'cache yes yes no\n', expectedOutput: 'WEAK cache\ntraps=0' },
          { input: 'hack yes no no\n', expectedOutput: 'TRAP hack\ntraps=1' },
          { input: 'oops no no no\n', expectedOutput: 'MISTAKE oops\ntraps=1' },
          { input: 'a yes no yes\nb no yes yes\nc yes yes yes\n', expectedOutput: 'TRAP a\nMISTAKE b\nDEBT c\ntraps=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Evolving Code Practice',
      description: 'Judge change safety and shortcut quality, then change real unfamiliar code.',
      instructions: `Complete both exercises, then:

1. For the first: callers are checked before characterisation. Say why that order is right,
   with an example of characterising the wrong seam.
2. For the second: \`WEAK\` is not counted as a trap. Say why a written shortcut with no
   trigger is still better than an unwritten one, and what it still costs.
3. For the second: a shortcut can be deliberate and written down and still be wrong. Give a
   case.

**Then, in a real codebase you did not write** — an open-source project you can run.

4. Pick one behaviour you can observe. **Find where it lives, starting from a string the user
   sees.** Record how long it took.
5. Write your map: the files, what each does, the seams.
6. Record what you deliberately did not read.
7. **Find every caller** of the function you intend to change.
8. Write a characterisation test around it. Record anything that surprised you — **a recorded
   behaviour you did not expect is the most valuable output of this exercise.**
9. Make one small change, keeping the characterisation test passing.
10. Split your work into commits: movement separate from behaviour, with the description
    saying which is which.
11. Find one shortcut in that codebase. Write the four-part note it should have had.`,
      rubric: [
        { criterion: 'Change safety judged', description: 'All cases, in the stated order of checks.', maxPoints: 15 },
        { criterion: 'Shortcuts classified', description: 'All cases, with traps and mistakes counted together.', maxPoints: 15 },
        { criterion: 'Behaviour located and mapped', description: 'Found from a user-visible string, with a written map and the time taken.', maxPoints: 20 },
        { criterion: 'Callers found, behaviour characterised', description: 'Every caller listed, a test written, surprises recorded.', maxPoints: 20 },
        { criterion: 'A change in separated commits', description: 'Movement and behaviour separate, described as such.', maxPoints: 20 },
        { criterion: 'A shortcut note written', description: 'All four parts, for a real shortcut in that codebase.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'rename yes yes yes\n', expectedOutput: 'GO rename\ngo=1' },
          { input: 'signature no yes yes\n', expectedOutput: 'FIND_CALLERS signature\ngo=0' },
          { input: 'extract yes no yes\n', expectedOutput: 'CHARACTERISE extract\ngo=0' },
          { input: 'migrate yes yes no\n', expectedOutput: 'RISKY migrate\ngo=0' },
          { input: 'a no no no\nb yes yes yes\n', expectedOutput: 'FIND_CALLERS a\nGO b\ngo=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Characterising before knowing the callers risks:',
        [['Characterising the wrong seam, because callers tell you where it is', true],
          ['Writing tests that duplicate existing coverage', false],
          ['Recording behaviour that the change is going to remove anyway', false],
          ['Spending time on code that is not actually live', false]],
        'The callers are what tell you where the seam actually is.'),
      mcq('A written shortcut with no stated trigger still costs:',
        [['Nobody knowing when it stops being acceptable', true],
          ['More than an unwritten one, because it looks deliberate', false],
          ['The same as a trap, from the next engineer’s side', false],
          ['A ticket that will never be prioritised', false]],
        'It is better than unwritten, and it is not enough.'),
      mcq('A recorded behaviour you did not expect is valuable because:',
        [['It is the thing your change would otherwise have broken silently', true],
          ['It usually indicates a defect worth reporting', false],
          ['It shows the characterisation test was well chosen', false],
          ['It tells you the code is rather more complex than it looks', false]],
        'Especially the parts that look wrong.'),
    ],
  },

  {
    unitCode: 'T3_SWE_EVOLVING_MINI_PROJECT',
    notes: `Make a real change to a real codebase you did not write, safely, and get it to a
state somebody would merge.

**The measurement is whether a stranger could review your work in ten minutes.** Not whether
the change is clever — whether the commits, the description and the tests make it obvious
what you did and why it is safe.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Change a Stranger Could Review',
      description: 'Find it, characterise it, change it, and present it so the review is ten minutes.',
      instructions: `**Choose** an open-source project you can run locally and an issue small
enough to finish. A good first issue, or a bug you can reproduce.

**Part one — find it**

1. Reproduce the behaviour. Record exactly how.
2. **Find where it lives, starting from a user-visible string.** Record the time taken and
   the route.
3. Write the map: the files involved, what each does, the seams.
4. Record what you deliberately did not read.

**Part two — understand the blast radius**

5. **Every caller** of what you intend to change. Say how you found them, and whether
   reflection or injection could hide any.
6. Read the history of the lines you will touch. Why do they exist?
7. Read the existing tests for that area. What do they already say it does?

**Part three — characterise**

8. A characterisation test around the current behaviour, including anything that looks wrong.
9. **Record anything that surprised you.**
10. Get the test passing against unchanged code.

**Part four — change it**

11. Make the change. Keep the characterisation test passing, or update it deliberately with
    the reason in the commit message.
12. Add a test for the new behaviour.
13. **Separate commits:** movement, then behaviour. Never both in one.

**Part five — present it**

14. A description saying what, why, and which commits are mechanical.
15. Point at the decision you are least sure about.
16. Say what you did not test and why.
17. **Ask somebody to review it with a ten-minute limit.** Record what they understood and
    what they did not.

**Part six — write it up**

18. How long finding it took, against how long changing it took. **Comment on the ratio** —
    for most real work, finding dominates, and an engineer who expects that plans better.
19. What the characterisation test caught, if anything.
20. What you would do differently next time in an unfamiliar codebase.

**Submit** the map, the caller list, the characterisation test, the commits, the description,
the ten-minute review feedback, and the write-up.`,
      rubric: [
        { criterion: 'Found and mapped', description: 'Reproduced, located from a user-visible string, mapped, with time recorded.', maxPoints: 20 },
        { criterion: 'Blast radius understood', description: 'Every caller found with the method stated, history and tests read.', maxPoints: 20 },
        { criterion: 'Characterised before changing', description: 'A passing test on unchanged code, surprises recorded.', maxPoints: 20 },
        { criterion: 'Change in separated commits', description: 'Movement and behaviour apart, new behaviour tested.', maxPoints: 20 },
        { criterion: 'Reviewable in ten minutes', description: 'Description, named uncertainty, and recorded reviewer feedback.', maxPoints: 15 },
        { criterion: 'The ratio commented on', description: 'Finding against changing, with what it implies for planning.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('This project is measured by whether:',
        [['A stranger could review the work in ten minutes', true],
          ['The change fixes the issue completely', false],
          ['The characterisation test caught a real behaviour', false],
          ['Every caller was correctly identified', false]],
        'Not whether the change is clever.'),
      mcq('For most real work the ratio of finding to changing is:',
        [['Finding dominates, and expecting that makes you plan better', true],
          ['Roughly even across the two activities', false],
          ['Changing dominates once the codebase becomes familiar', false],
          ['Entirely dependent on the size of the change', false]],
        'Comment on the ratio you actually observed.'),
      mcq('Updating a characterisation test during your change requires:',
        [['Doing it deliberately, with the reason in the commit message', true],
          ['Reverting the change until the test can be preserved', false],
          ['A separate commit containing only the test update', false],
          ['Confirmation from the project maintainers first', false]],
        'Otherwise you have changed behaviour without recording that you did.'),
    ],
  },

  /* ══ T3_SWE_WORKFLOW ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_WORKFLOW_BRANCH_AND_REVIEW',
    notes: `You know how branches work. **This unit is about why small changes are what make
the loop work at all** — which the core version control unit mentions in passing and does not
argue.

## The loop

**Branch from the main line. Make the change. Open it for review. Address comments. Merge.
Delete the branch.**

That is it. Every team does approximately this, and the variations are less important than
they are made to sound.

## Why small is the whole thing

**A small change gets reviewed properly.** Beyond a few hundred lines, reviewers skim — the
review unit said this and it is the reason everything else here follows.

**A small change merges cleanly.** Conflict probability grows with both size and age, and
those multiply.

**A small change can be reverted.** A revert of eight hundred lines takes out four unrelated
things with it.

**A small change is shippable now.** Which means the work is real rather than nearly done, and
**"nearly done" is the state most projects spend most of their time in.**

**And a small change gets finished.** A branch that lives three weeks acquires conflicts,
loses its author's attention, and is often abandoned.

## Making a change small when the work is not

**Behind a flag.** Ship the code disabled; enable it later. This is the main technique and it
unlocks most of the rest.

**Groundwork first.** The refactor that makes the change easy, merged on its own, reviewed in
two minutes.

**Expand then contract.** Add the new path, migrate callers, remove the old one — three
changes, each safe, rather than one that is not.

**And a stacked sequence**, each reviewable, each merged as it is approved.

## Keeping the branch short-lived

**Rebase or merge from the main line daily.** A conflict found today is small; the same
conflict in a fortnight is an afternoon.

**Open it early**, as a draft, so somebody can say "not like that" before you have finished.

**And if it has been open a week, something is wrong.** Too big, or blocked, or forgotten —
and all three are better dealt with than waited out.

## Commits within the branch

**Each one a complete thought.** Not a save point.

**A message saying why.** The diff says what. **"Fix bug" is the commonest message in software
and one of the least useful.**

**And squash or not according to your team's convention** — this is genuinely a convention
question and not worth arguing about, which cannot be said of most things in this unit.

## What the main line must always be

**Releasable.** Every commit on it.

**Which is what makes everything else possible** — you can branch from it at any time, revert
to it at any time, and ship from it at any time, and a main line that is sometimes broken
costs all three.`,
    mcqs: [
      mcq('The reason everything else in this unit follows is that:',
        [['Beyond a few hundred lines, reviewers skim', true],
          ['Large branches accumulate merge conflicts over time', false],
          ['Small changes can be reverted without collateral damage', false],
          ['Short-lived branches keep the main line releasable', false]],
        'A small change gets reviewed properly.'),
      mcq('The main technique for making a change small when the work is not is:',
        [['Shipping the code behind a flag, disabled, and enabling it later', true],
          ['Splitting the work across several stacked branches', false],
          ['Merging the groundwork refactor on its own first', false],
          ['Expanding to a new path before contracting the old one', false]],
        'It unlocks most of the rest.'),
      mcq('A branch open for a week means:',
        [['It is too big, blocked, or forgotten — all better dealt with than waited out', true],
          ['The change is substantial enough to warrant spending the time on it', false],
          ['The reviewer has not had capacity to look at it', false],
          ['The work should be split before it is merged', false]],
        'Open it early as a draft, and update from the main line daily.'),
      mcq('A main line that is sometimes broken costs you:',
        [['Branching, reverting and shipping at any time, all three', true],
          ['Confidence in the test suite covering the main paths', false],
          ['Time spent diagnosing failures that are not yours', false],
          ['The ability to run the pipeline on every commit', false]],
        'Releasable at every commit is what makes the rest possible.'),
    ],
    checkpoint: [
      mcq('"Nearly done" matters because:',
        [['It is the state most projects spend most of their time in', true],
          ['It is hard to estimate the remaining work from there', false],
          ['Work in that state is not covered by tests yet', false],
          ['It hides how much is left from the rest of the team', false]],
        'A small change is shippable now, which makes the work real.'),
      mcq('Conflict probability grows with:',
        [['Both the size of the branch and its age, which multiply', true],
          ['The number of files the change touches', false],
          ['How many other branches are open at the same time', false],
          ['The rate of change in the surrounding code', false]],
        'Update from the main line daily.'),
      mcq('Whether to squash commits is:',
        [['A genuine convention question, unlike most things in this unit', true],
          ['Determined by whether the commits are complete thoughts', false],
          ['Better decided per branch than as a team rule', false],
          ['Important for keeping the history bisectable', false]],
        'Not worth arguing about.'),
    ],
  },

  {
    unitCode: 'T3_SWE_WORKFLOW_PIPELINE_DOES_THE_SHIPPING',
    notes: `**Nobody remembers a step at 6pm on a Friday.** The pipeline does. This is the core
CI/CD material seen from the team's side: not how to build one, but what it does to how a
team behaves.

## What changes when the pipeline ships

**Releases stop being events.** No release day, no checklist, no person who knows the magic
order.

**Which changes the size of a release** — if shipping is a five-minute automatic thing,
people ship small changes, and small changes are the thing the whole branch unit was about.

**The knowledge leaves people's heads.** A deploy nobody can describe is a deploy that
depends on whoever last did it being available.

**And it stops being scary**, which is the real effect. **A team that is afraid to deploy
batches changes, and a batched release is the riskiest kind there is** — more changes, more
interactions, and no way to tell which one broke it.

## What belongs in it

**Build.** Once. **The artefact that was tested is the artefact that ships**, which is the
single most important property and the one most often violated by rebuilding per environment.

**Fast tests**, on every commit.

**Slow tests**, before deployment.

**The security checks**: dependency audit and secret scanning.

**Deploy to staging**, automatically.

**Deploy to production**, automatically or on one button.

**And a rollback that is one action**, rehearsed.

## What the pipeline is not for

**Not a place to put every check somebody thought of.** A ten-minute pipeline is used and a
fifty-minute one is worked around.

**Not a substitute for review.**

**And not a substitute for knowing how to deploy by hand**, because the day the pipeline is
broken is also a day you may need to ship.

## Keeping it trustworthy

**A red main line is an emergency.** Not a background condition. **The moment a failing main
line is normal, the pipeline has stopped being a signal** and everybody starts merging past
it.

**Fix or revert within the hour.**

**And no flaky tests.** One is enough to teach the team to re-run rather than look, and once
that habit exists the suite is decorative.

## What it does not fix

**It does not make a bad design good.**

**It does not make an untested change safe.**

**It does not remove the need for someone to watch the first minutes after a deploy.**

**A pipeline is a way of not forgetting**, not a way of not thinking — and the teams that get
this wrong are the ones with excellent automation and regular incidents.`,
    mcqs: [
      mcq('The real effect of automated shipping is that:',
        [['It stops being scary, and a team that is afraid batches changes', true],
          ['Releases become faster and more frequent', false],
          ['The deployment knowledge leaves the heads of individuals', false],
          ['Release checklists no longer need maintaining', false]],
        'A batched release is the riskiest kind there is.'),
      mcq('The single most important property of a pipeline is:',
        [['The artefact that was tested is the artefact that ships', true],
          ['Every commit runs the full test suite', false],
          ['Deployment requires no manual intervention at all', false],
          ['Rollback is available as a single action', false]],
        'Most often violated by rebuilding per environment.'),
      mcq('A fifty-minute pipeline is:',
        [['Worked around, where a ten-minute one is used', true],
          ['Acceptable if it runs only before deployment', false],
          ['A sign the test suite needs parallelising', false],
          ['Reasonable for a system of sufficient complexity', false]],
        'Not a place to put every check somebody thought of.'),
      mcq('The moment a failing main line becomes normal:',
        [['The pipeline has stopped being a signal and people merge past it', true],
          ['The team loses confidence in the test coverage', false],
          ['Deployments start requiring some manual verification first', false],
          ['Reverting becomes harder than fixing forward', false]],
        'Fix or revert within the hour.'),
    ],
    checkpoint: [
      mcq('One flaky test is enough to:',
        [['Teach the team to re-run rather than look, making the suite decorative', true],
          ['Slow the pipeline noticeably on repeated runs', false],
          ['Potentially mask a genuine intermittent defect in the codebase', false],
          ['Justify quarantining that area of the suite', false]],
        'No flaky tests at all, because one is enough to set the habit.'),
      mcq('Knowing how to deploy by hand matters because:',
        [['The day the pipeline is broken may also be a day you must ship', true],
          ['Manual deployment is faster for urgent fixes', false],
          ['It helps diagnose pipeline failures when they happen', false],
          ['Some environments cannot be automated fully', false]],
        'The pipeline is not a substitute for that knowledge.'),
      mcq('Excellent automation with regular incidents usually means:',
        [['The pipeline is being treated as a way of not thinking', true],
          ['The test suite has gaps the pipeline cannot cover', false],
          ['Deployments are happening faster than they can be watched', false],
          ['The rollback procedure has not been rehearsed', false]],
        'A pipeline is a way of not forgetting.'),
    ],
  },

  /* ══ T3_SWE_DOCS ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_DOCS_WHY_IT_IS_THIS_WAY',
    notes: `**The code says what. Only a person can say why, and only before they forget** —
which takes about three weeks.

The core documentation topic names decision records. This unit teaches writing one.

## The question a decision record answers

Not "how does this work". The code answers that, and better.

**"Why is it like this, and what would have to change for it to be different?"**

Somebody is looking at your code in two years thinking it is strange. **They are about to
either change it and break something, or leave it alone out of fear.** Both are bad, and a
paragraph prevents both.

## The shape

**Context.** What was the situation? What constraints existed?

**Decision.** What was chosen. One sentence.

**Alternatives.** What else was considered, and why not. **This is the part with the value** —
it stops the next person spending a week on something you already rejected for a good reason.

**Consequences.** What this makes easy, and what it makes hard. **Both**, honestly — a record
listing only benefits is a record nobody believes.

**And status.** Current, superseded, or abandoned, with the date.

## Where it goes

**In the repository**, beside the code, in version control. **A decision record in a wiki
drifts from the code and is not found by anybody reading the code**, which is the only
audience it has.

**A folder of numbered files.** Never edited once written — **superseded by a new one that
references it**, so the history of the thinking survives rather than being overwritten.

## When to write one

**When somebody will ask why.** The reliable test.

**A technology choice.** A database, a queue, a framework.

**A pattern the codebase will follow everywhere.**

**A deliberate constraint.** "No cross-service database access."

**A rejected obvious option**, which is the most valuable of all — **"we did not use
websockets here, because..."** saves the argument being had again every year.

**Not for ordinary code.** A record per class is a record system nobody reads.

## Writing it in ten minutes

**Now, not later.** You will not write it later; you will forget the alternatives first and
the constraints second.

**A page at most.**

**Name the constraints that were real at the time**, including the unglamorous ones. **"We had
two weeks and one engineer" is a legitimate and common reason**, and a record that pretends
the decision was purely technical is a record that misleads.

## Reading one later

**A decision record is a record of a decision, not of the truth.** The constraints may have
gone.

**Which is why the alternatives matter** — they tell you what to reconsider now that the
reason has expired, and that is the whole payoff for the ten minutes.`,
    mcqs: [
      mcq('The question a decision record answers is:',
        [['Why is it like this, and what would change for it to be different', true],
          ['How does this component work internally', false],
          ['Who decided this, and when was it agreed', false],
          ['What the system actually does under each of the conditions', false]],
        'The code answers how, and better.'),
      mcq('The part of a decision record with the most value is:',
        [['The alternatives considered and why they were rejected', true],
          ['The context and constraints at the time', false],
          ['The consequences the decision produced', false],
          ['The decision itself, stated in a single sentence', false]],
        'It stops the next person spending a week on something already rejected.'),
      mcq('A decision record in a wiki:',
        [['Drifts from the code and is not found by the only audience it has', true],
          ['Is easier to keep current than one kept in the repository', false],
          ['Is acceptable as long as the code links to it', false],
          ['Reaches a wider audience across the organisation', false]],
        'In the repository, beside the code, in version control.'),
      mcq('"We had two weeks and one engineer" is:',
        [['A legitimate and common reason that belongs in the record', true],
          ['A constraint better left out of a technical document', false],
          ['A sign the decision should be revisited immediately', false],
          ['Better expressed as a technical trade-off', false]],
        'A record that pretends the decision was purely technical misleads.'),
    ],
    checkpoint: [
      mcq('A superseded decision record should be:',
        [['Left unedited, with a new one referencing it', true],
          ['Updated in place to reflect the current decision', false],
          ['Deleted once the decision no longer applies', false],
          ['Marked obsolete and moved to an archive folder', false]],
        'So the history of the thinking survives.'),
      mcq('The most valuable kind of decision record is one about:',
        [['An obvious option that was deliberately rejected', true],
          ['A technology choice between two close alternatives', false],
          ['A pattern the codebase will follow everywhere', false],
          ['A constraint imposed from outside the team', false]],
        '"We did not use websockets here, because..."'),
      mcq('A decision record is a record of:',
        [['A decision, not of the truth, since the constraints may have gone', true],
          ['The best available option at the time it was written down', false],
          ['The team’s agreed position on that question', false],
          ['What the system currently does in that area', false]],
        'Which is why the alternatives matter when you read it later.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DOCS_WHAT_IT_DOES_AT_3AM',
    notes: `Logs are **a message to whoever is woken up** — a different audience from the one
the core logging unit had in mind, and possibly you.

## The test

**Could somebody diagnose this failure from the logs alone, without reproducing it?**

**Most systems fail this test**, and the failure is discovered at the worst moment.

**Reproducing a production failure is usually impossible**: the data has changed, the load has
gone, the user has moved on. **The logs are what you have.**

## What every log line for a failure needs

**What was being attempted.** "Processing order" — not "error".

**The identifiers.** Order id, user id, request id. **Without an id the line is unsearchable
and unjoinable**, and in a system of any size that makes it useless.

**What actually happened**, including the underlying error, not a rewritten summary of it.

**Enough state to understand it.** The relevant inputs, not the whole object.

**And the request id**, so one failure can be followed across every service it touched.
**This is the one that turns a pile of logs into a story.**

## What not to log

**Passwords, tokens, keys.** Ever.

**Personal data** beyond an identifier.

**Card numbers, health data, anything regulated.**

**And the whole request body**, which is how most of the above gets logged by accident. **It
is worth one grep of your codebase now**, because almost every team finds something.

## Levels that mean something

**ERROR** — somebody must act. If it fires and nobody acts, it is not an error.

**WARN** — unusual and handled. Worth knowing in aggregate.

**INFO** — the shape of normal operation. Requests, jobs, state changes.

**DEBUG** — off in production, and the thing you turn on when you are stuck.

**The commonest failure is ERROR for things nobody acts on**, which teaches everybody to
ignore ERROR — the same argument as alerting, arriving from a different direction.

## Structure

**Log structured data, not sentences.** Fields you can filter and count.

**A sentence is readable by one person on one machine. A field is queryable across a fleet**,
and at 3am you are not reading, you are searching.

## The three-in-the-morning checklist

**Break something in staging and try to diagnose it from the logs alone.**

**No code, no debugger, no reproduction.**

**You will find out in ten minutes whether your logging works**, and almost every team that
tries this changes something afterwards.

**And do it before you need it**, because the alternative is finding out during the incident.

## Beyond logs

**A health endpoint** saying what this instance thinks of itself.

**Metrics** for rates and durations, because logs are bad at counting.

**And a runbook**: what this alert means, what to check, what to do. **One page. Written by
whoever was woken up last**, which is both the best source and a fair distribution of the
work.`,
    mcqs: [
      mcq('The test a logging setup must pass is:',
        [['Could somebody diagnose this failure from the logs alone, without reproducing it', true],
          ['Is every error path covered by a log statement', false],
          ['Can the logs be searched quickly across every one of the running services', false],
          ['Do the levels match the team’s agreed convention', false]],
        'Reproducing a production failure is usually impossible.'),
      mcq('A log line without an identifier is:',
        [['Unsearchable and unjoinable, which makes it useless at any scale', true],
          ['Harder to attribute to a particular user', false],
          ['Acceptable for informational messages only', false],
          ['Still useful for establishing a rough timeline of events', false]],
        'Order id, user id, request id.'),
      mcq('The field that turns a pile of logs into a story is:',
        [['The request id, followed across every service it touched', true],
          ['The timestamp, at sufficient precision', false],
          ['The service name emitting each line', false],
          ['The user id associated with the failing operation', false]],
        'One failure, followed end to end.'),
      mcq('Logging the whole request body is:',
        [['How most sensitive data gets logged by accident', true],
          ['Acceptable when the endpoint handles no personal data', false],
          ['Useful for diagnosis and worth the storage cost', false],
          ['Safe once the known sensitive fields are redacted', false]],
        'Worth one grep of your codebase now.'),
    ],
    checkpoint: [
      mcq('An ERROR that fires and nobody acts on:',
        [['Is not an error, and it teaches everybody to ignore ERROR', true],
          ['Should be downgraded once the pattern is established', false],
          ['Is useful for post-incident analysis regardless', false],
          ['Indicates a monitoring gap rather than a logging one', false]],
        'The same argument as alerting, from a different direction.'),
      mcq('Structured fields beat sentences because:',
        [['At 3am you are not reading, you are searching across a fleet', true],
          ['Sentences take up more storage than structured data does', false],
          ['Fields can be validated at the point of logging', false],
          ['Log aggregators cannot parse free text reliably', false]],
        'A sentence is readable by one person on one machine.'),
      mcq('A runbook is best written by:',
        [['Whoever was woken up last, which is the best source and a fair distribution', true],
          ['The engineer who owns that part of the system', false],
          ['Whoever configured the alert in the first place, since they know it', false],
          ['The team lead, for consistency across runbooks', false]],
        'One page, written by whoever the failure last woke up.'),
    ],
  },

  /* ══ T3_SWE_PROJECT ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_PROJECT_BRIEF',
    notes: `Write down what you are building and — the part that makes this a software
engineering brief rather than any other kind — **the quality bar you are willing to be held
to.**

## The quality bar is the brief

Anybody can say "well tested". **A bar is a statement somebody could check.**

> "Every characteristic failure of the design has a test. Ten deliberate breakages, at least
> nine caught. Fast suite under thirty seconds. Every change reviewed before merge. Main line
> green at every commit."

**Write it before you start**, because a bar written afterwards is a description of what you
happened to do, and everybody can tell.

## The rest of the brief

1. **What it does**, in two sentences.
2. **The requirement**, taken apart: nouns, verbs, assumptions, and **the one question whose
   answer changes the design.**
3. **The design.** One page: components, data, storage, failure paths.
4. **Two decisions** with the alternatives you rejected.
5. **What it deliberately does not do**, each with a reason and a cost to include.
6. **The quality bar**, as above.
7. **How it ships.** Pipeline, main line, what runs on every commit.

## The definition of done

- [ ] The requirement taken apart, with the load-bearing question named
- [ ] A one-page design, reviewed by somebody before any code
- [ ] A failure path for every arrow in the design
- [ ] Characteristic failures listed, at least six, from the design's shape
- [ ] A test for each, at the level the failure demands
- [ ] **A test for each assumption the design makes**
- [ ] Ten deliberate breakages, with the catch rate recorded
- [ ] Every change on a branch, reviewed before merge
- [ ] Changes small enough to review in ten minutes
- [ ] Movement and behaviour in separate commits
- [ ] A pipeline running the fast suite on every commit
- [ ] Main line releasable at every commit
- [ ] A decision record for each of the two decisions
- [ ] Logs that pass the three-in-the-morning test, demonstrated
- [ ] Any shortcut taken, written down with all four parts

**The breakage catch rate and the 3am demonstration are the two items that cannot be
faked**, and they are what makes this brief different from one that just says "good quality".

## Working alone

You may not have a reviewer. **Get one anyway** — a classmate, a mentor, somebody in a
community. **An unreviewed project is missing half of what this track teaches**, and review
is the half that does not work by yourself.

**If you genuinely cannot**, review your own change a day later, in the review tool, writing
comments as though you were somebody else. **It is worse and it is not nothing.**

## Time

**A quarter design, a quarter build, a quarter quality, a quarter shipping and writing down.**

**People give three quarters to build.** The result is a working thing with no tests worth
having, no decisions recorded, and logs that say "error" — which is the thing this whole track
exists to argue against.`,
    mcqs: [
      mcq('A quality bar differs from "well tested" in that:',
        [['It is a statement somebody could check', true],
          ['It specifies which testing tools will be used', false],
          ['It is agreed with a reviewer before starting', false],
          ['It covers non-functional requirements as well', false]],
        '"Ten breakages, at least nine caught. Fast suite under thirty seconds."'),
      mcq('A quality bar written afterwards is:',
        [['A description of what you happened to do, and everybody can tell', true],
          ['Still useful as a record of the standard actually achieved', false],
          ['Acceptable if it is honest about what was missed', false],
          ['The normal way such bars get established', false]],
        'Write it before you start.'),
      mcq('The two items that cannot be faked are:',
        [['The breakage catch rate and the three-in-the-morning demonstration', true],
          ['The design review and the decision records', false],
          ['The pipeline and the green main line', false],
          ['The characteristic failures and the tests written for them', false]],
        'They are what makes this brief different from "good quality".'),
      mcq('Reviewing your own change a day later is:',
        [['Worse than a real reviewer, and not nothing', true],
          ['An adequate substitute when working alone', false],
          ['Better than review by somebody unfamiliar with the code', false],
          ['Only useful for catching mechanical errors', false]],
        'Get a real reviewer if you possibly can.'),
    ],
    checkpoint: [
      mcq('An unreviewed project is:',
        [['Missing half of what this track teaches', true],
          ['Acceptable when working alone on a small system', false],
          ['Weaker on design but complete on quality', false],
          ['Compensated for by a thorough test suite', false]],
        'Review is the half that does not work by yourself.'),
      mcq('The time split this brief asks for is:',
        [['A quarter each to design, build, quality and shipping', true],
          ['Half to build and half to everything else', false],
          ['A third each to design, build and quality', false],
          ['Proportional to the complexity of each of the parts', false]],
        'People give three quarters to build.'),
      mcq('A brief that gives three quarters of the time to building produces:',
        [['A working thing with no tests worth having and logs that say "error"', true],
          ['A more complete feature set than the alternative split would', false],
          ['A design that is validated by the implementation', false],
          ['An acceptable outcome if the code is clean', false]],
        'Which is what this track exists to argue against.'),
    ],
  },

  {
    unitCode: 'T3_SWE_PROJECT_BUILD',
    notes: `Build one system the way a team would: designed, tested, reviewed, documented and
shipped through a pipeline.

**The order below is the point.** Design reviewed before code, tests chosen from failures
before they are written, review before merge, pipeline from the first commit. **Doing the
same work in a different order produces a different and worse result**, which is the claim
this whole track makes.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Software Engineering Project — Building It the Way a Team Would',
      description: 'Design, review, test from failures, ship through a pipeline, and record the decisions.',
      instructions: `**Work from your brief.**

**Part one — before any code**

1. The requirement taken apart, with the load-bearing question named.
2. The one-page design: components, data, storage, **failure path for every arrow.**
3. **Send it for review.** Ask a specific question. Record the comments and what changed.
4. Set up the repository and the pipeline **before the first feature commit.** Fast suite on
   every commit, main line protected.

**Part two — plan the tests**

5. The design's shape, and **at least six characteristic failures** from it.
6. The assumptions the design makes. At least three.
7. A level for each failure, chosen from the failure. At most two end-to-end.
8. Write the test names now, before the code.

**Part three — build**

9. Work in branches. **Each change small enough to review in ten minutes.**
10. Movement and behaviour in separate commits.
11. Each change reviewed before merge — by somebody else if at all possible.
12. Main line green at every commit. **If it goes red, fix or revert within the hour** and
    record that it happened.

**Part four — quality**

13. Tests for every characteristic failure and every assumption.
14. Split the suite by speed. Record both times.
15. **Ten deliberate breakages.** Record the catch rate.
16. Write tests for anything missed and re-run all ten.

**Part five — operability**

17. Structured logging with identifiers and a request id.
18. **The three-in-the-morning test:** break something, diagnose it from the logs alone, no
    debugger and no reproduction. Record what you could not work out and fix it.
19. A one-page runbook for the most likely failure.
20. Check nothing sensitive is logged. Say how you checked.

**Part six — write the decisions down**

21. A decision record for each of your two significant decisions: context, decision,
    alternatives, consequences, status.
22. Any shortcut taken, with all four parts including the trigger.

**Submit** the repository, the design and its review, the test plan, the mutation table, the
3am transcript, the runbook and the decision records.`,
      rubric: [
        { criterion: 'Designed and reviewed first', description: 'One page with failure paths, reviewed before code, changes recorded.', maxPoints: 15 },
        { criterion: 'Pipeline from the first commit', description: 'Fast suite on every commit, main line protected and kept green.', maxPoints: 15 },
        { criterion: 'Tests chosen from failures', description: 'Six characteristic failures, three assumptions, levels justified.', maxPoints: 20 },
        { criterion: 'Ten breakages with a catch rate', description: 'Recorded, misses turned into tests, all ten re-run.', maxPoints: 20 },
        { criterion: 'Reviewable changes, reviewed', description: 'Ten-minute changes, movement separated, reviewed before merge.', maxPoints: 15 },
        { criterion: 'Operable and documented', description: '3am test passed, runbook written, decision records complete.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The claim this project makes about order is that:',
        [['The same work in a different order produces a worse result', true],
          ['Each stage depends on the output of the previous one', false],
          ['Working in order is easier to assess fairly', false],
          ['Reordering the work makes it take longer', false]],
        'Design reviewed before code, tests from failures, pipeline from the first commit.'),
      mcq('The pipeline should be set up:',
        [['Before the first feature commit', true],
          ['Once there is enough code to test meaningfully', false],
          ['After the design has been reviewed and agreed', false],
          ['At the point the first branch is opened', false]],
        'Fast suite on every commit, main line protected.'),
      mcq('A red main line during this project should be:',
        [['Fixed or reverted within the hour, and recorded as having happened', true],
          ['Fixed before the next change is merged', false],
          ['Investigated once the current work is complete', false],
          ['Something to expect occasionally on a project of this size', false]],
        'A red main line is an emergency, not a background condition.'),
    ],
  },

  {
    unitCode: 'T3_SWE_PROJECT_EXPLAIN',
    notes: `Defend the design against the alternative you did not take.

**The interview version of this question is "why did you build it that way?", and the answer
that gets the job is not a description of what you built.** It is a comparison with something
else, and a reason.

## What you will be asked

**Why this shape, and what else did you consider?** If the answer is "I did not consider
anything else", the design was not a decision.

**What does this make hard?** Every design makes something hard. **Naming it is the single
strongest signal available in this conversation**, because almost nobody does it and it cannot
be faked.

**What would break first under load?** Not "it would be fine". Name the component.

**What is your catch rate, and which breakage did you miss?** A number and a specific.

**What would you do with three more days?** Specific things, not "more tests".

## Defending without being defensive

**A challenge is a question, not an attack.**

**"That is a fair point, and here is why I went the other way"** is the strongest form of
answer available. **It concedes the merit and holds the position**, and it is what the review
unit was teaching from the other side.

**When they are right, say so.** "I had not thought about that, and you are right — I would
change it." **That costs nothing and buys everything**, because an engineer who concedes
credibly is one whose disagreements mean something.

**Never defend a decision you no longer believe in** just because you made it.

## The comparison

For each significant decision:

> "I chose a queue. The alternative was doing it synchronously, which was simpler and would
> have worked at current volumes. I went with the queue because the export can exceed the
> request timeout at the sizes the brief allows, and that is a failure the user cannot do
> anything about. The cost is a background worker to run and monitor, which for this system
> is real overhead I would not have taken on if the timeout question had gone the other way."

**Choice, alternative, reason, cost.** Four sentences, and it is a different level of answer
from "I used a queue because it is more scalable".

## What not to do

**Do not present the architecture diagram for ten minutes.** Nobody asked.

**Do not claim it is production ready.** Say what would need to be true.

**Do not describe the tests.** Show the catch rate, which is one number and means more than
any description.

**And do not hide the shortcut.** **A shortcut named, costed and with a trigger is a
professional artefact** — and the person opposite has taken a hundred of them and will
recognise it.

## The closing answer

**What did this project teach you that you did not know?**

**Have a real answer.** Something specific that surprised you — a breakage your suite missed,
a design assumption that turned out wrong, a review comment that changed your mind.

**"I learned a lot" is the answer that ends the conversation**, and something concrete is the
one that continues it.`,
    mcqs: [
      mcq('The single strongest signal in this conversation is:',
        [['Naming what your design makes hard', true],
          ['Explaining the architecture clearly and completely', false],
          ['Demonstrating the system working end to end', false],
          ['Quoting the test coverage the project achieved', false]],
        'Almost nobody does it and it cannot be faked.'),
      mcq('"That is a fair point, and here is why I went the other way" works because:',
        [['It concedes the merit and holds the position at the same time', true],
          ['It avoids appearing inflexible to the interviewer at all', false],
          ['It moves the conversation on from the objection', false],
          ['It shows the alternative was considered seriously', false]],
        'The review unit taught the same move from the other side.'),
      mcq('A decision should be explained as:',
        [['Choice, alternative, reason, and cost', true],
          ['Choice, reason, and the evidence supporting it', false],
          ['Context, constraints, and what was chosen', false],
          ['The problem, the options, and the outcome', false]],
        'A different level of answer from "I used a queue because it is more scalable".'),
      mcq('Rather than describing the tests you should give:',
        [['The catch rate, which is one number and means more', true],
          ['The number of tests at each level', false],
          ['The coverage percentage across the codebase', false],
          ['The time the fast suite takes to run', false]],
        'Show it rather than describing it.'),
    ],
    checkpoint: [
      mcq('Conceding when the other person is right:',
        [['Costs nothing and makes your disagreements mean something', true],
          ['Weakens your position on the remaining points', false],
          ['Should be done after defending the original reasoning', false],
          ['Is appropriate only for minor technical points', false]],
        'Never defend a decision you no longer believe in.'),
      mcq('A shortcut named, costed and with a trigger is:',
        [['A professional artefact the person opposite will recognise', true],
          ['Best left out unless the interviewer asks', false],
          ['Evidence the project was rushed at the end', false],
          ['Acceptable to mention if the reason was a deadline', false]],
        'They have taken a hundred of them.'),
      mcq('"I learned a lot" is:',
        [['The answer that ends the conversation', true],
          ['An honest answer when the project went smoothly', false],
          ['Adequate if followed by an example', false],
          ['Better than naming something that went wrong', false]],
        'Something concrete is the one that continues it.'),
    ],
  },
];
