/**
 * The Software Engineering specialization track — sixteen units. Module P05.
 *
 * ── WHAT THIS DIRECTION IS ACTUALLY ABOUT ─────────────────────────────────────────────────
 *
 * Not "writing good code" — every direction claims that. This one is about a system that several
 * people change over years staying changeable, which is a different and largely unglamorous
 * skill: reading, restructuring, reviewing, and arguing about where a boundary goes.
 *
 * So the track is weighted towards code somebody else wrote. A student whose entire evidence is
 * greenfield projects has never met the problem this direction exists to solve.
 *
 * ── WHY IT IS THE HARDEST TRACK TO PRODUCE EVIDENCE FOR ───────────────────────────────────
 *
 * A backend student ships an API and points at it. A software-engineering student's value is
 * that something did NOT become unmaintainable, which is invisible. The PROOF topic therefore
 * asks for a defended structural decision rather than an artefact, because that is the only form
 * this capability takes that a reviewer can assess in ninety seconds.
 *
 * Attribution: T4_SE_DEPTH defaults to SOFTWARE_ARCHITECTURE, T4_SE_BUILD to REFACTORING with
 * the dependencies unit on DEPENDENCY_MANAGEMENT, T4_SE_QUALITY to AUTOMATED_TESTING with its
 * harder fault on DEBUGGING and its drill on CODE_REVIEW, T4_SE_PROOF to SOFTWARE_ARCHITECTURE
 * with the specialization interview on TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_SE_BUNDLES: PilotBundle[] = [
  /* ══ T4_SE_DEPTH ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SE_DEPTH_READING_A_CODEBASE',
    notes: `**Finding the entry point, the seams and the load-bearing parts**, before changing
anything.

## Where to start

**The entry point.** What runs first — a main, a server start, a route table. Everything else
hangs off it.

**Then follow one real path end to end.** One request, one command, one job. Not a file tour: a
single path teaches you the layering, the conventions and the vocabulary at once, and a file tour
teaches you the directory structure.

## The three questions

**What are the nouns?** The domain objects the code keeps mentioning. They are the vocabulary and
usually the module boundaries.

**Where does data enter and leave?** Endpoints, jobs, queues, the database. Those are the edges.

**What is load-bearing?** The thing everything imports. Changing it is expensive, and knowing
which module that is tells you where the risk lives before you have read any of it.

## Tools that beat reading

**The test suite.** It tells you what the authors thought mattered, and a well-named test file is
a specification.

**The commit history on one file.** \`git log\` on the module you care about shows what keeps
changing, and what keeps changing is what the design is bad at.

**Where the comments are dense.** Comments cluster around things that surprised somebody.

## What not to do

**Do not read it in order.** Alphabetically, or top to bottom, you will exhaust your attention on
plumbing before reaching anything that matters.`,
    mcqs: [
      mcq('Following one real path end to end teaches more than a file tour because a path shows:',
        [['The layering and conventions at the same time', true],
         ['Every file that the application actually contains', false],
         ['Which modules have the most lines of code in them', false],
         ['The order in which the project was originally built', false]],
        'A single request crosses every layer in the order they matter, so the structure, the vocabulary and the conventions arrive together.'),
      mcq('`git log` on one module is informative because what keeps changing is what the design is:',
        [['Bad at', true],
         ['Most actively used for by the team', false],
         ['Least covered by the existing test suite', false],
         ['Most recently added to the codebase overall', false]],
        'Repeated churn in one place means the boundary was drawn somewhere other than where change actually arrives.'),
    ],
    checkpoint: [
      mcq('Identifying the load-bearing module before reading it tells you:',
        [['Where the risk of any change will concentrate', true],
         ['Which part of the system runs most frequently', false],
         ['Which developer knows the codebase best of all', false],
         ['How long the codebase has been in development', false]],
        'Everything importing it inherits its behaviour, so a change there propagates furthest. Knowing that shapes how carefully the change is made.'),
      mcq('Reading a codebase alphabetically fails because attention is exhausted on:',
        [['Plumbing, before reaching anything that matters', true],
         ['Files that were generated rather than written', false],
         ['The largest files, which come early in the order', false],
         ['Tests, which usually sort before the source code', false]],
        'Ordering by name is uncorrelated with importance, so the budget of attention is spent before the significant parts are reached.'),
    ],
  },
  {
    unitCode: 'T4_SE_DEPTH_ARCHITECTURE_DECISIONS',
    notes: `**The handful of choices everything else inherits**, and what reversing one costs.

## Which decisions are architectural

**The ones that are expensive to reverse.** That is the whole definition, and it is more useful
than any list.

**Layering.** Which layer may call which. Get this wrong and the dependency graph becomes a
cycle nobody can break.

**Module boundaries.** What is one thing and what is two. Wrong boundaries mean every feature
touches five modules.

**Dependency direction.** Which way the arrows point. A domain layer that imports the web
framework can never be tested or reused without it.

**State ownership.** Who owns each piece of data and who may write it. Two owners is the defect
that looks like corruption.

## What makes them expensive

**Everything built afterwards assumes them.** A hundred files depending on a wrong layering is
not a hundred small changes; it is one large one that cannot be done incrementally.

## Recording them

**A short note per decision: what was chosen, what was rejected, and why.** Three paragraphs.

**Its value is entirely to the future reader** who is about to change it and does not know what
it was protecting against. Without the note they will assume there was no reason, because that
is the reasonable assumption about undocumented structure.

## Recognising one you have inherited

**Look for what the code cannot easily do.** Every architecture is shaped by what it optimised
for, and the shape is most visible in what it makes awkward.`,
    mcqs: [
      mcq('The useful definition of an architectural decision is one that is:',
        [['Expensive to reverse', true],
         ['Made before any of the code is written', false],
         ['Documented in the project’s design materials', false],
         ['Agreed by more than one person on the team', false]],
        'Cost of reversal is what distinguishes a structural choice from a local one, and it is more useful than any list of categories.'),
      mcq('A domain layer that imports the web framework can never be:',
        [['Tested or reused without it', true],
         ['Deployed separately from the web application', false],
         ['Changed without also changing the framework', false],
         ['Understood by somebody new to the framework', false]],
        'The dependency direction means the domain now requires the framework to exist, so every test and every reuse drags it along.'),
    ],
    checkpoint: [
      mcq('A decision record’s value is entirely to the future reader because without it they will assume:',
        [['There was no reason for the structure', true],
         ['The original author is available to ask', false],
         ['The decision was made by somebody senior', false],
         ['The structure matches the team’s conventions', false]],
        'Undocumented structure reads as arbitrary, and the reasonable response to arbitrary structure is to change it — including when it was protecting something.'),
      mcq('An inherited architecture is most visible in:',
        [['What the code makes awkward', true],
         ['The directory layout of the repository', false],
         ['The frameworks that were chosen for it', false],
         ['The number of layers between the edges', false]],
        'Every architecture optimised for something, and the shape of that optimisation shows most clearly in the operations it did not optimise for.'),
    ],
  },
  {
    unitCode: 'T4_SE_DEPTH_PRACTICE',
    notes: `**Applying both ideas to a system you did not design.**

## The drill

**Take an unfamiliar open-source project.** In thirty minutes, produce: the entry point, one path
traced end to end, the three or four nouns, the load-bearing module, and one architectural
decision you can infer with the evidence for it.

**Thirty minutes is deliberately short.** The skill is orientation, not comprehension, and
orientation is what you actually need on a first day.

## What good looks like

**You can say where a change would be safe** and where it would not. That is the practical output
and everything else is intermediate work.

## The second half

**Then predict what would be expensive.** Pick a plausible feature and say which modules it would
touch. **Then check by actually attempting the first step** — frequently the prediction is wrong,
and being wrong quickly is the point.

## Why this is drilled rather than taught

**Because orientation speed only improves with repetition.** Reading about how to read a codebase
produces almost nothing; doing it on six unfamiliar projects produces a noticeable difference.`,
    mcqs: [
      mcq('Thirty minutes is deliberately short because the skill being built is:',
        [['Orientation, not comprehension', true],
         ['Speed reading of unfamiliar source code', false],
         ['Identifying defects in a limited time budget', false],
         ['Summarising a project for somebody else to use', false]],
        'A first day requires knowing where things are and where a change would be safe, not understanding the whole system.'),
      mcq('Checking a prediction about what a feature would touch matters because the prediction is:',
        [['Frequently wrong, and being wrong quickly is the point', true],
         ['Only useful once it has been confirmed accurate', false],
         ['Impossible to make without reading everything first', false],
         ['Usually right, which confirms the reading was good', false]],
        'The check is what calibrates the reading. An unchecked prediction leaves you confident and possibly wrong, which is worse than uncertain.'),
    ],
    checkpoint: [
      mcq('The practical output of orienting in a codebase is being able to say:',
        [['Where a change would be safe and where not', true],
         ['What every module in the system is responsible for', false],
         ['Which parts of the code are of the highest quality', false],
         ['How the system compares to others you have seen', false]],
        'Everything else is intermediate. The question actually being answered on a first day is where you can act without breaking something.'),
      mcq('Orientation speed is drilled rather than taught because reading about it produces:',
        [['Almost nothing, where repetition produces a difference', true],
         ['A framework that must then be practised separately', false],
         ['Understanding that transfers only to similar projects', false],
         ['Knowledge that decays faster than practised skill', false]],
        'It is a procedural skill. Six unfamiliar projects produce a noticeable improvement and an article produces none.'),
    ],
  },
  {
    unitCode: 'T4_SE_DEPTH_INTERVIEW_QUESTION',
    notes: `**"How would you approach a codebase you have never seen, on your first day?"**

## Why this is asked of this direction specifically

**Because it is most of the job.** A software engineer joining a team spends weeks reading before
writing anything significant, and how they do that predicts how quickly they become useful.

## The answer that works

**A procedure, in order.** Entry point. One path end to end. The nouns. The tests. The commit
history on whatever I am about to change.

**And what you are looking for at each step**, which is what separates a procedure from a list.

## The follow-up

**"What would you change first?"** The correct answer is almost always **nothing, yet** — and
then a reason: that you would make one small change first to learn the review process, the test
suite and the deployment, before proposing anything structural.

**A candidate who arrives with structural opinions on day one** is describing a failure mode
every team has seen, and saying so unprompted is a strong signal.

## The other follow-up

**"What if there are no tests and no documentation?"** Then the commit history and the issue
tracker are the documentation, and the first change comes with a characterisation test. Say that;
it is the honest answer and it shows the situation is familiar rather than alarming.

## What loses marks

**"I would read the documentation."** Frequently there is none, and it is the answer of somebody
who has only joined well-run projects or has not joined one at all.`,
    mcqs: [
      mcq('Asked what you would change first in an unfamiliar codebase, the strongest answer is:',
        [['Nothing yet, and a reason for waiting', true],
         ['Whichever module has the worst structure', false],
         ['The tests, since they guide everything else', false],
         ['The documentation, which is usually out of date', false]],
        'One small change first teaches the review process, the suite and the deployment. Structural opinions on day one is a failure mode every team recognises.'),
      mcq('"I would read the documentation" loses marks because it is the answer of somebody who has:',
        [['Only joined well-run projects, or none', true],
         ['Not worked with large codebases previously', false],
         ['Misunderstood what the question was asking for', false],
         ['Been taught a process rather than developed one', false]],
        'Documentation is frequently absent or stale. Relying on it as the first step suggests limited experience of joining real teams.'),
    ],
    checkpoint: [
      mcq('What separates a procedure from a list in this answer is saying:',
        [['What you are looking for at each step', true],
         ['How long each of the steps usually takes', false],
         ['Which tools you would use for each step', false],
         ['The order in which the steps must happen', false]],
        'A list of activities is recall. Naming the question each step answers shows the procedure is understood rather than memorised.'),
      mcq('With no tests and no documentation, the stated substitutes are the commit history and:',
        [['The issue tracker', true],
         ['The original author, if still contactable', false],
         ['The database schema, which encodes the domain', false],
         ['The deployment configuration and its history', false]],
        'Both record why things changed and what went wrong, which is the information documentation would have carried.'),
    ],
  },

  /* ══ T4_SE_BUILD ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SE_BUILD_REFACTORING_SAFELY',
    notes: `**Small, verifiable steps, each leaving the tests green.** It is the only way a large
refactor ever finishes.

## Why the steps matter more than the destination

**Because interruptions happen.** A change with no safe intermediate state has to be finished in
one sitting or abandoned, and abandoned is the common outcome. **Half-finished refactors leave
both designs in place at once, which is strictly worse than either.**

## The sequence

**Get it under test first.** Characterisation tests if there are none — pin what it currently
does, including the parts that look wrong.

**Then one move at a time**, committing after each: extract, rename, introduce a parameter,
invert a condition, move a method.

**Then delete the scaffolding.** A refactor frequently leaves a temporary indirection that was
useful during the move and is noise afterwards.

## Parallel change, for the moves that cannot be small

**Add the new thing beside the old one. Migrate callers one at a time. Remove the old one.**

Three steps, each shippable, and at no point is the system broken. It is how a large structural
change is made without a long-lived branch, and long-lived branches are how refactors die.

## What must not happen in the same commit

**A behaviour change.** Fixing a bug during a refactor means a failure afterwards cannot be
attributed to either. **Two commits, always.**

## Knowing when to stop

**When the thing that was hard is no longer hard.** The goal was a specific blocked change, not
an aesthetic standard, and continuing past the goal is where refactors become their own project.`,
    mcqs: [
      mcq('A half-finished refactor is strictly worse than either design because it leaves:',
        [['Both designs in place at once', true],
         ['The tests in a permanently failing state', false],
         ['A branch that cannot be merged afterwards', false],
         ['Code that nobody on the team understands now', false]],
        'Readers must now understand two structures and know which applies where, which is more cognitive load than either alone.'),
      mcq('Parallel change makes a large structural move possible without a long-lived branch by:',
        [['Adding the new beside the old and migrating gradually', true],
         ['Splitting the change across several repositories', false],
         ['Deferring the change until a quieter period', false],
         ['Keeping the branch rebased on the main line daily', false]],
        'Each of the three steps is independently shippable, so the work lands continuously rather than accumulating on a branch that diverges.'),
    ],
    checkpoint: [
      mcq('The signal to stop refactoring is when:',
        [['The thing that was hard is no longer hard', true],
         ['The module matches the team’s current conventions', false],
         ['No further improvements can be identified in it', false],
         ['The test coverage has reached an agreed threshold', false]],
        'The goal was a specific blocked change. Continuing past it is where a refactor becomes its own project and stops being justifiable.'),
      mcq('Deleting the scaffolding after a refactor matters because a temporary indirection left in place is:',
        [['Noise that the next reader must still decode', true],
         ['A performance cost on every call made through it', false],
         ['A dependency that prevents future restructuring', false],
         ['Untested, since it was only used during the move', false]],
        'It was useful while both structures existed and afterwards it is a layer with no purpose, which the next reader has to investigate to discover.'),
    ],
  },
  {
    unitCode: 'T4_SE_BUILD_MANAGING_DEPENDENCIES',
    notes: `**What a dependency costs over years**, and how to keep one at arm's length when you
must take it.

## The costs that arrive later

**Upgrades.** Every dependency eventually requires one, and the effort is proportional to how
deeply it reached into your code.

**Its bugs become yours.** From the user's point of view there is no distinction.

**Its abandonment.** A library that stops being maintained leaves you maintaining it or migrating
away, and neither was in the plan.

**Its transitive dependencies.** You took one and received forty.

## When to take one anyway

**When the problem is genuinely solved and genuinely hard.** Cryptography, date handling, HTTP.
Writing your own is worse in every respect.

**The test is not "could I write this" but "should I be maintaining it".**

## Keeping it at arm's length

**Wrap it behind your own interface** at the point it enters, where it is reasonable to do so.
Your code depends on your interface; the library sits behind it.

**Then replacing it is a day rather than a quarter**, and — more often the actual benefit — your
tests do not need it.

**Do not wrap everything.** A wrapper around the standard library is ceremony. The judgement is
whether replacement is plausible and whether the dependency is spreading.

## The version question

**Pin versions and upgrade deliberately.** Floating versions mean a build that worked yesterday
fails today for reasons unrelated to anything anybody did, which is among the most demoralising
failure modes there is.`,
    mcqs: [
      mcq('The test for whether to take a dependency is not "could I write this" but:',
        [['"Should I be maintaining it"', true],
         ['"Is it the most popular option available"', false],
         ['"Can I understand its implementation fully"', false],
         ['"Will it still be maintained in five years"', false]],
        'Capability is rarely the constraint. The ongoing cost of owning the code is what decides, and for cryptography or date handling that cost is enormous.'),
      mcq('Floating rather than pinned versions produce a build that fails:',
        [['Today for reasons unrelated to any change made', true],
         ['Only when a dependency introduces a breaking change', false],
         ['On some machines and not on others in the team', false],
         ['After a delay proportional to the release cadence', false]],
        'The inputs changed without anybody changing them, so the failure is uncorrelated with the work and is among the most demoralising to diagnose.'),
    ],
    checkpoint: [
      mcq('The more frequent practical benefit of wrapping a dependency is not replacement but that:',
        [['Your tests do not need it', true],
         ['Its API becomes easier for the team to use', false],
         ['Its version can be upgraded without any changes', false],
         ['Its transitive dependencies are hidden from you', false]],
        'Replacement is rare; testing happens constantly. A wrapper lets the tests substitute something simple instead of standing up the real library.'),
      mcq('Wrapping the standard library is described as ceremony because the judgement should turn on whether replacement is plausible and whether the dependency is:',
        [['Spreading through the codebase', true],
         ['Larger than the code that uses it', false],
         ['Maintained by a single individual only', false],
         ['Used in more than one module already', false]],
        'A dependency confined to one place is cheap to change later. One that has reached fifty files is what a wrapper would have prevented.'),
    ],
  },
  {
    unitCode: 'T4_SE_BUILD_MINI_PROJECT',
    notes: `**Take a working but poorly structured codebase and improve it without changing what
it does.**

## The brief

A few hundred lines with a real structural problem — a module doing two jobs, a leaked internal
representation, a dependency reaching everywhere.

**Characterisation tests first.** Pin behaviour, bugs included.

**Then a sequence of small commits**, green between each.

## What to aim at

**One specific blocked thing.** "I could not test this without a database" or "adding a second
report format would touch six files". **Name it before starting** — a refactor without a target
is an aesthetic exercise and does not finish.

## What to submit

**The history**, which should show many small commits rather than one large one.

**The characterisation tests**, unedited, still passing.

**A note:** what was blocked, what you changed, what is now possible that was not, and anything
you found and deliberately left alone.

## The discipline being assessed

**Not the final structure** — several would be defensible. **Whether every intermediate state
worked**, because that is the property that makes this technique usable on a system with users.`,
    assignment: {
      title: 'Restructuring something real, in verifiable steps',
      description: 'Improve the structure of a poorly organised codebase in small green-between-each steps, with behaviour provably unchanged.',
      instructions: `Take a few hundred lines with a real structural problem — a module doing two
jobs, a leaked internal representation, a dependency that reaches everywhere.

**Name the blocked thing before you start.** "I cannot test this without a database", or "a second
report format would touch six files". A refactor without a target is an aesthetic exercise and it
does not finish.

**Write characterisation tests first**, pinning current behaviour including anything that looks
like a bug. **Do not fix bugs**; note them and leave them.

**Then work in small commits, with the suite green between every one.**

**Submit:** the repository with its history, the characterisation tests unedited and still
passing, and a note covering what was blocked, what you changed, what is now possible that was
not, and what you found and deliberately left alone.

What is assessed is not the final structure — several would be defensible — but whether every
intermediate state worked.`,
      rubric: [
        { criterion: 'A named target', description: 'The note states the specific blocked thing the refactor was aimed at, rather than describing the result as cleaner.', maxPoints: 20 },
        { criterion: 'Green at every step', description: 'The history shows many small commits and the suite passing between them, not one large change.', maxPoints: 30 },
        { criterion: 'Behaviour provably unchanged', description: 'Characterisation tests written first still pass without having been edited.', maxPoints: 30 },
        { criterion: 'The blocked thing is now possible', description: 'The note demonstrates concretely that what was hard has become straightforward.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A refactor without a named target is described as an aesthetic exercise that:',
        [['Does not finish', true],
         ['Produces a worse structure than before', false],
         ['Cannot be reviewed by anybody else usefully', false],
         ['Takes longer than one with a target would', false]],
        'Without a condition for being done, there is always more to improve, so the work either continues indefinitely or stops arbitrarily.'),
      mcq('What is assessed is not the final structure, because:',
        [['Several structures would be defensible', true],
         ['The structure cannot be evaluated objectively', false],
         ['The original structure is unknown to the reviewer', false],
         ['Structure matters less than the tests that cover it', false]],
        'Design has no answer key. What is checkable is whether the technique was applied — whether every intermediate state worked.'),
    ],
  },
  {
    unitCode: 'T4_SE_BUILD_DEBUGGING',
    notes: `**A one-line fix that broke three unrelated things.** Finding the coupling that made
it possible.

## The shape of the problem

**The change was correct.** The breakage is elsewhere, in code that had no visible relationship
to it, and that invisible relationship is the actual finding.

## The four couplings that do this

**Shared mutable state.** A module-level dictionary, a singleton, a cache. Two features read it
and one now writes something different.

**Inheritance.** A change in a parent reaching subclasses that never mentioned it.

**An implicit contract.** Code relying on ordering, or on a field being present, that was never
stated anywhere. Changing a sort or adding a field breaks it silently.

**A side effect.** A function that also writes to a log, a cache, or the database, and somebody
depended on that rather than on its return value.

## How to find it

**Start from the breakage, not the change.** What does the broken thing actually depend on? Trace
backwards until you reach something the change touched.

**The reverse direction is slower**, because the change looks innocent — it is innocent — and
staring at it produces nothing.

## What to do afterwards

**Fix the breakage, then name the coupling in the commit message.** The coupling is the durable
finding; the fix is local.

**And ask whether it can be made visible** — a parameter instead of shared state, an explicit
contract instead of an assumption. That is the change that stops the next occurrence.`,
    mcqs: [
      mcq('When a correct one-line change breaks something unrelated, the investigation should start from:',
        [['The breakage, tracing back to what it depends on', true],
         ['The change, examining what it could have affected', false],
         ['The commit history around both of the areas', false],
         ['The test suite, to find what else is now failing', false]],
        'The change is innocent and staring at it yields nothing. What the broken code depends on is the path to the invisible relationship.'),
      mcq('Code relying on ordering or on a field being present, never stated anywhere, is:',
        [['An implicit contract that breaks silently', true],
         ['A defect in the code that relies upon it', false],
         ['Shared state between the two modules involved', false],
         ['A side effect of the function producing the data', false]],
        'Nothing declares the dependency, so nothing warns when it is violated. Changing a sort or adding a field breaks it with no error.'),
    ],
    checkpoint: [
      mcq('Naming the coupling in the commit message matters because the coupling is:',
        [['The durable finding, where the fix is local', true],
         ['Required information for the code review process', false],
         ['Harder to describe later once the fix is merged', false],
         ['Evidence that the original change was not at fault', false]],
        'The fix addresses one symptom. The coupling explains why it happened and will still be true when the next person meets it.'),
      mcq('The change that stops the next occurrence is making the coupling:',
        [['Visible, as a parameter or an explicit contract', true],
         ['Documented in the module’s own comments', false],
         ['Covered by a test that fails when it is violated', false],
         ['Impossible, by separating the two modules fully', false]],
        'An invisible dependency is what allowed an innocent change to break something. Making it explicit means the next change can see it.'),
    ],
  },
  {
    unitCode: 'T4_SE_BUILD_INTERVIEW_QUESTION',
    notes: `**"Tell me about a refactor you did. Why, and how did you know it was safe?"**

## The two halves

**Why** is a cost argument. What was blocked or expensive, and what did the refactor unblock. **A
refactor justified by "it was messy" is an answer an interviewer can decline**, because messiness
is not a cost anybody has to accept as urgent.

**How you knew it was safe** is the technical half, and it is the one that separates. Tests
first, small steps, green between each. If there were no tests, characterisation tests — say that
explicitly, because it is the answer of somebody who has done this on real code.

## The follow-up

**"What if you could not write tests?"** It happens — code too tangled to test without changing
it first. The honest answer is a smaller, riskier first move that makes testing possible, made
deliberately and with the risk named. **Claiming you would always have tests first suggests you
have not met this.**

## The other follow-up

**"Did anything break?"** Sometimes yes, and saying so is fine. What matters is what the
breakage taught you — usually a coupling nobody had documented — and what you do differently now.

## The version of this question for your own work

**"Show me something you would restructure and why."** The strong answer names a future change
that would be expensive, not a style preference, and says roughly what the restructure would cost
as well as what it would buy.`,
    mcqs: [
      mcq('A refactor justified by "it was messy" is weak because messiness is:',
        [['Not a cost anybody must accept as urgent', true],
         ['Subjective, so reviewers will disagree about it', false],
         ['Usually a symptom of a deeper structural fault', false],
         ['Impossible to demonstrate without a comparison', false]],
        'It is a preference rather than a consequence. A named blocked change is a cost the listener recognises and can weigh.'),
      mcq('Claiming you would always write tests before refactoring suggests you have not met:',
        [['Code too tangled to test without changing it', true],
         ['A deadline that made the tests impractical', false],
         ['A codebase with no test framework available', false],
         ['A team that did not value testing very highly', false]],
        'Some code cannot be tested in its current shape. Acknowledging a deliberate, risk-named first move is what somebody who has done this says.'),
    ],
    checkpoint: [
      mcq('Asked whether anything broke during a refactor, what matters is:',
        [['What the breakage taught you, usually a coupling', true],
         ['Whether it was caught before reaching production', false],
         ['How quickly the breakage was subsequently fixed', false],
         ['Whether the tests should have caught it earlier', false]],
        'Breakage is normal. The signal is whether it produced a durable finding and changed how the next one is approached.'),
      mcq('For your own work, "show me something you would restructure" is answered strongly by naming a future change that would be expensive and:',
        [['Roughly what the restructure would cost', true],
         ['Which design principle the current code violates', false],
         ['How long the current structure has been in place', false],
         ['Whether anybody else has raised the same concern', false]],
        'Stating the cost as well as the benefit is what makes it a proposal rather than a complaint, and it is what most candidates omit.'),
    ],
  },

  /* ══ T4_SE_QUALITY ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SE_QUALITY_TESTING_FOR_CHANGE',
    notes: `**Characterisation tests: pinning current behaviour so you can move it.**

## What they are

**Tests that record what the code does, not what it should do.** You run it, observe the output,
and assert that output — including anything that looks like a bug.

**That feels wrong and is correct.** The purpose is not to verify; it is to detect change. A test
asserting the buggy behaviour will fail if the refactor alters it, which is exactly the signal
wanted.

## Writing them on code that resists

**Find the widest seam.** Not the function you want to change — the outermost thing you can call
with plain inputs and observe. A whole endpoint, a command-line entry point, a top-level
function.

**Test there first.** Coarse and slow beats none, and it is enough to make the first structural
move safe. Finer tests become possible once the structure improves, which is the order these
things actually happen in.

## When output is hard to observe

**Approval testing.** Capture the output — text, JSON, a log — into a file, check the file in, and
assert against it. Changing behaviour deliberately means updating the file in the same commit,
which makes the change visible in review.

## What to do with the bugs you pinned

**Write them down, fix them afterwards, separately.** A commit that says "pinned this, and it is
wrong — see issue 44" is honest and reviewable. Fixing during the refactor is what makes a
failure unattributable.

## When they are no longer needed

**A characterisation test is scaffolding.** Once real tests exist for the improved structure, the
coarse ones can go — though keeping one end-to-end case is usually worth it.`,
    mcqs: [
      mcq('A characterisation test asserts the current behaviour including its bugs because its purpose is to:',
        [['Detect change, rather than to verify correctness', true],
         ['Document the defects for whoever fixes them later', false],
         ['Prevent the bugs from being fixed accidentally now', false],
         ['Establish a baseline for measuring improvements', false]],
        'It is a tripwire. Asserting what should happen would fail immediately and tell you nothing about whether the refactor altered anything.'),
      mcq('When code resists testing, the place to start is:',
        [['The widest seam you can call with plain inputs', true],
         ['The function you most want to change first', false],
         ['The smallest unit that has no dependencies', false],
         ['Whichever part has the clearest documented behaviour', false]],
        'Coarse and slow beats none, and an outer test is enough to make the first structural move safe. Finer tests become possible afterwards.'),
    ],
    checkpoint: [
      mcq('Approval testing makes a deliberate behaviour change visible in review because the captured output file is:',
        [['Updated in the same commit as the change', true],
         ['Regenerated automatically by the test runner', false],
         ['Compared against the previous release version', false],
         ['Stored separately from the source code history', false]],
        'The diff of the approved file shows exactly what changed in the output, which is far more legible than reasoning about the code change.'),
      mcq('Characterisation tests are described as scaffolding, meaning that once real tests exist they:',
        [['Can go, though one end-to-end case is worth keeping', true],
         ['Should be kept permanently as a regression suite', false],
         ['Must be rewritten to assert correct behaviour now', false],
         ['Become the specification for the improved structure', false]],
        'They were coarse and slow by necessity. Their job ends when finer tests exist, though a single end-to-end case remains cheap insurance.'),
    ],
  },
  {
    unitCode: 'T4_SE_QUALITY_HARDER_FAULT',
    notes: `**A codebase that passes every test it has and is still wrong.** Finding what nobody
thought to check.

## Where these live

**In the gap between what was specified and what was assumed.** The tests assert the specified
behaviour and the assumption was never written down, so nothing tests it and everybody relies on
it.

## The four that recur

**An ordering nobody guaranteed.** Results happen to come back in a useful order, code depends on
it, and a query plan change breaks it months later with no code change at all.

**A default that is wrong in one case.** Correct for every case anybody tested and wrong for the
empty one, or the single-element one.

**A rounding or precision difference** that accumulates. Each operation is correct; the total is
not.

**A concurrency assumption.** Correct when one thing runs at a time, which was true until it was
not.

## Finding them

**Ask what is true that nothing asserts.** Go through what the code relies on and check whether
any test would notice if it stopped being true.

**Then break it deliberately.** Change the order, empty the input, run it twice concurrently. The
tests staying green is the finding.

## Why this is a software-engineering skill specifically

**Because these faults survive review.** Nothing looks wrong: the code is clean, the tests pass,
the logic reads correctly. Finding them requires asking what is being assumed rather than what is
being done, and that is a different reading habit from the one that finds ordinary bugs.`,
    mcqs: [
      mcq('These faults live in the gap between what was specified and what was:',
        [['Assumed, and never written down anywhere', true],
         ['Implemented by the original author of the code', false],
         ['Tested by the suite that currently exists for it', false],
         ['Understood by the team maintaining it afterwards', false]],
        'The tests assert the specification. The assumption is relied upon by everybody and checked by nothing, which is why it survives.'),
      mcq('Code depending on an ordering nobody guaranteed typically breaks:',
        [['Months later, with no code change at all', true],
         ['Immediately, when the dependency is introduced', false],
         ['During review, when a reader notices the reliance', false],
         ['Under concurrency, when two requests interleave', false]],
        'A plan change, an index or a data distribution shift alters the order. Nothing in the codebase changed, which makes it very hard to attribute.'),
    ],
    checkpoint: [
      mcq('The technique for finding these is to ask what is true that:',
        [['Nothing asserts', true],
         ['The documentation fails to mention at all', false],
         ['Only the original author would have known', false],
         ['Changes most often as the system evolves', false]],
        'Anything relied upon and unasserted is a silent dependency. Enumerating those and breaking each deliberately is what exposes them.'),
      mcq('These faults are a software-engineering skill specifically because finding them requires asking what is:',
        [['Being assumed, rather than what is being done', true],
         ['Different between this codebase and others seen', false],
         ['Most likely to change in the next few releases', false],
         ['Untested according to the coverage report output', false]],
        'Ordinary debugging reads for what the code does. These require reading for what it takes for granted, which is a different habit.'),
    ],
  },
  {
    unitCode: 'T4_SE_QUALITY_PRACTICE',
    notes: `**Reviewing, testing and hardening code you did not write, without being told what to
look for.**

## The drill

**A module, no issue report, thirty minutes.** Produce a review: what would be expensive to
change, what is assumed and unasserted, what would break under an unusual input.

**No hints.** The absence of a report is the exercise — in a real review nobody tells you where to
look, and a reviewer who only checks what they were pointed at adds nothing.

## The review checklist worth internalising

**What does this assume?** **What would the next change touch?** **What happens on empty, one, and
concurrent?** **Is anything internal leaking to callers?** **Would a test notice if this broke?**

Five questions, applied to any module, in about twenty minutes.

## How to write it up

**Each finding: what, why it matters, what it would cost to leave.** Ordered by cost.

**Not ordered by how confident you are**, which is the natural instinct and puts the trivial
certain findings above the important uncertain ones.

## What good looks like

**A reviewer whose comments are about consequences.** "This will be expensive when X" rather than
"consider extracting this". The second is a preference; the first is information the author can
act on or dispute.`,
    mcqs: [
      mcq('The absence of an issue report is the exercise because a reviewer who only checks what they were pointed at:',
        [['Adds nothing', true],
         ['Reviews more quickly than is otherwise possible', false],
         ['Misses defects outside their area of expertise', false],
         ['Is still valuable for confirming the reported issue', false]],
        'The reported problem is already known. A review’s value is entirely in what it finds that nobody had identified.'),
      mcq('Ordering findings by confidence rather than by cost puts:',
        [['Trivial certain findings above important uncertain ones', true],
         ['The most easily fixed items at the top of the list', false],
         ['Findings in the order they were discovered in', false],
         ['Style issues below the functional problems found', false]],
        'Certainty and importance are uncorrelated. A naming issue you are sure about outranking a possible data-loss path is exactly the wrong signal.'),
    ],
    checkpoint: [
      mcq('"This will be expensive when X" is stronger than "consider extracting this" because the first is:',
        [['Information the author can act on or dispute', true],
         ['More polite and less likely to cause offence', false],
         ['Specific about which refactoring is required', false],
         ['Backed by a principle the team has agreed on', false]],
        'A stated consequence can be weighed and argued with. A suggestion is a preference the author may reasonably decline without further discussion.'),
      mcq('The five-question checklist is applicable to any module in about:',
        [['Twenty minutes', true],
         ['Two hours, for a thorough treatment of it', false],
         ['A full day, if the module is unfamiliar to you', false],
         ['Five minutes, one minute for each question', false]],
        'It is deliberately short enough to be habitual. A review process that requires a day is one that does not get done.'),
    ],
  },
  {
    unitCode: 'T4_SE_QUALITY_INTERVIEW_QUESTION',
    notes: `**"Review this code."** A pull request or a file, and you have ten minutes.

## What is being assessed

**Not how many things you find.** Whether your findings are ordered sensibly, whether you
distinguish preference from consequence, and how you say them.

**The third one is scored more heavily than candidates expect**, because a reviewer who is
technically right and unpleasant is a net negative on a team and every interviewer has met one.

## The order to go in

**Correctness first.** Does it do what it claims? Edge cases, error paths.

**Then consequence.** What will this make expensive? What is leaking? What is assumed?

**Then preference, clearly labelled as such.** "This is a style point and you can ignore it" costs
nothing and signals that you know the difference.

## How to phrase a finding

**Ask, do not instruct.** "What happens if this list is empty?" is better than "this breaks on
empty" — it invites the answer, and occasionally the answer is that it cannot be empty and you
have learned something.

**Say what is good, once, and specifically.** Not padding: a review with no positives reads as
adversarial and the author discounts the rest.

## The follow-up to expect

**"The author disagrees. What do you do?"** Establish whether it is a fact question or a judgement
one. Facts are settled by checking. Judgements are the author's call on their own code, unless the
consequence is severe — and knowing which situation you are in is the answer they want.

## What loses marks

**Rewriting it your way.** The question was to review, and a review that amounts to "I would have
written this differently" is not usable feedback.`,
    mcqs: [
      mcq('How findings are phrased is scored more heavily than candidates expect because a reviewer who is technically right and unpleasant is:',
        [['A net negative on a team', true],
         ['Still valuable for the defects they catch', false],
         ['Usually inexperienced rather than deliberately rude', false],
         ['Acceptable provided the findings are accurate ones', false]],
        'Review is a recurring interaction with colleagues. Every interviewer has worked with somebody whose accuracy did not compensate for the friction.'),
      mcq('"What happens if this list is empty?" is better than "this breaks on empty" partly because it:',
        [['Invites an answer, which is sometimes informative', true],
         ['Is less likely to be wrong about the behaviour', false],
         ['Takes less time for the author to respond to', false],
         ['Avoids committing you to a position too early', false]],
        'Occasionally the answer is that it cannot be empty, and the reviewer has learned a constraint rather than filed an incorrect finding.'),
    ],
    checkpoint: [
      mcq('When an author disagrees, the first thing to establish is whether it is:',
        [['A fact question or a judgement one', true],
         ['Worth pursuing given the size of the change', false],
         ['A misunderstanding of what you actually meant', false],
         ['Something the team has an existing convention for', false]],
        'Facts are settled by checking and judgements are the author’s call on their own code. Knowing which you are in decides how to proceed.'),
      mcq('A review amounting to "I would have written this differently" fails because it is:',
        [['Not usable feedback', true],
         ['Likely to be technically incorrect in places', false],
         ['Longer than the reviewer has time to produce', false],
         ['Outside the scope of what was being asked for', false]],
        'The author cannot act on it without rewriting to somebody else’s taste, and nothing in it identifies a consequence worth the change.'),
    ],
  },

  /* ══ T4_SE_PROOF ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SE_PROOF_ADVANCED_CHALLENGE',
    notes: `**Two defensible structures for the same requirement. Choose, build, and defend
against the other.**

## The brief

**A requirement with genuine structural tension.** A rules engine where the rules change often. A
reporting system with several output formats. A workflow with steps that vary by customer.

**Design it twice on paper.** Then build one properly, and be able to argue for it against the
one you did not build.

## Why building only one

**Because the argument is the deliverable**, and an argument made without having built anything is
speculation. Building one gives you the real costs of that one and a grounded estimate of the
other.

## What the defence must contain

**What you optimised for**, and the evidence that it is what matters here.

**What you gave up**, specifically. Every structure is worse at something.

**What would change your mind.** A concrete condition — "if the formats stopped changing and the
data sources started, I would have chosen the other" — which is what shows the choice was
reasoned rather than preferred.

## The thing that makes this hard

**Neither answer is wrong.** Students trained on problems with answers find this genuinely
uncomfortable, and getting comfortable with it is most of what separates somebody who can be
trusted with a design decision from somebody who needs one handed to them.

## What to submit

**Both designs, the implementation of one, and the defence.** The defence is the graded artefact;
the implementation exists to make it honest.`,
    assignment: {
      title: 'A design somebody disagrees with',
      description: 'Design one requirement two defensible ways, build one, and defend it against the other with the conditions that would change your mind.',
      instructions: `Pick a requirement with genuine structural tension: a rules engine whose
rules change often, a reporting system with several output formats, a workflow whose steps vary
by customer.

**Design it twice, on paper.** Both designs must be defensible — if one is obviously worse, pick a
different requirement.

**Then build one properly.** Building one gives you the real costs of that one and a grounded
estimate of the other, which is what separates an argument from speculation.

**Submit:** both designs, the implementation of one, and a defence of no more than a page
covering what you optimised for and the evidence that it is what matters here, what you gave up
specifically, and **what would change your mind** — a concrete condition under which you would
have chosen the other.

The defence is the graded artefact. The implementation exists to make it honest. Neither answer
is wrong, and a submission arguing that one design is simply correct has not found a requirement
with real tension in it.`,
      rubric: [
        { criterion: 'Both designs are genuinely defensible', description: 'The rejected design is presented fairly and would be a reasonable choice under stated conditions.', maxPoints: 25 },
        { criterion: 'One is actually built', description: 'A working implementation exists, so the costs claimed for it are measured rather than imagined.', maxPoints: 25 },
        { criterion: 'The sacrifice is named', description: 'The defence states specifically what the chosen design is worse at, rather than presenting it as dominant.', maxPoints: 25 },
        { criterion: 'A condition that would change the decision', description: 'A concrete circumstance is given under which the other design becomes correct.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Building one design rather than neither matters because an argument made without building anything is:',
        [['Speculation about costs rather than a report of them', true],
         ['Impossible to present convincingly to a reviewer', false],
         ['Shorter, and therefore less thoroughly reasoned', false],
         ['Biased towards whichever design is more familiar', false]],
        'Implementing one yields its real costs and a grounded estimate of the other. Without that, both cost estimates are guesses.'),
      mcq('A submission arguing that one design is simply correct indicates that:',
        [['The requirement lacked real structural tension', true],
         ['The student did not build either of the designs', false],
         ['The two designs were too similar to compare well', false],
         ['The defence was written before the implementation', false]],
        'If one design dominates, there was never a decision to make and the exercise has nothing to exercise.'),
    ],
  },
  {
    unitCode: 'T4_SE_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on software engineering alone**, at the depth somebody hiring for
it would ask.

## What they will open with

**Something from your own work.** A structure you chose, a refactor you did, a codebase you
joined. They are establishing whether there is real experience before probing it.

## Where it goes

**"Why that boundary and not one module further out?"** Testing whether the decomposition was
reasoned.

**"What happens when two teams need to change this at once?"** Testing whether you think about
the system as something people work in rather than something that runs.

**"How would you introduce this change to a system with users?"** Parallel change, migration,
feature flags — and the answer that nothing must be broken at any intermediate point.

**"What would you do about a module nobody understands?"** Characterisation tests, small safe
moves, and the honest observation that sometimes the answer is to leave it alone and contain it.

## The depth marker

**Whether you talk about change over time.** A candidate describing structure as though it were
static is describing a diagram. One describing what happens to it over two years, as people join
and requirements move, is describing the actual subject.

## The thing that ends the round badly

**Certainty.** This direction has fewer settled answers than any other, and a candidate who
presents contested judgements as facts reads as somebody who has not yet had a design decision
contested by reality.

## How to prepare

**Have three stories ready:** a structure you chose, a refactor you did, and something you got
wrong. **The third is the one that is worth the most** and the one nobody prepares.`,
    mcqs: [
      mcq('The depth marker in this round is whether the candidate talks about:',
        [['Change over time, rather than static structure', true],
         ['Specific design patterns by their standard names', false],
         ['Performance characteristics of the chosen structure', false],
         ['The number of layers the architecture contains', false]],
        'Structure described as static is a diagram. The subject is what happens to it over years as people join and requirements move.'),
      mcq('Presenting contested judgements as facts ends this round badly because it reads as somebody who has not:',
        [['Had a design decision contested by reality', true],
         ['Read widely enough about architectural practice', false],
         ['Worked on a system large enough to have tensions', false],
         ['Been exposed to more than one codebase so far', false]],
        'This direction has fewer settled answers than any other. Certainty suggests the candidate’s choices have never been tested by consequences.'),
    ],
    checkpoint: [
      mcq('Of the three stories to prepare, the one worth the most and least often prepared is:',
        [['Something you got wrong', true],
         ['A refactor you completed successfully', false],
         ['A structure you chose and would choose again', false],
         ['A codebase you joined and became productive in', false]],
        'It is the only one that cannot be constructed from reading, and it demonstrates that judgement was calibrated by consequences.'),
      mcq('Asked about a module nobody understands, the honest answer includes that sometimes the right action is to:',
        [['Leave it alone and contain it', true],
         ['Rewrite it before anything else is attempted', false],
         ['Assign it to whoever has the most context left', false],
         ['Document it fully before making any changes', false]],
        'A stable module nobody touches costs nothing. Containing it behind an interface is frequently cheaper and safer than understanding it.'),
    ],
  },
  {
    unitCode: 'T4_SE_PROOF_CHECKPOINT',
    notes: `**Whether software engineering is demonstrable**, measured rather than felt.

## What the track asked for

**Reading** — orienting in an unfamiliar codebase and saying where a change would be safe.

**Changing** — restructuring in verifiable steps with behaviour provably unchanged.

**Protecting** — characterisation tests, and finding what is assumed and unasserted.

**Defending** — a structural decision argued against a real alternative.

## The bar

**The fourth one is the direction.** The first three are things many engineers can do; being able
to make a structural call, state what it sacrifices, and name what would change your mind is what
this direction is hired for.

## What a reviewer will actually look at

**The commit history of your refactor**, because it shows the technique in a way no write-up can
claim.

**The defence document**, because it is the only artefact where the judgement is visible.

Those two, in about ninety seconds. Everything else supports them.

## If this does not pass

**The usual gap is defending rather than doing.** Students complete the refactor and write a
defence that describes what they did instead of arguing for it. That is one piece of targeted work
and not a repeat of the month.

## What this feeds

**Mock 5**, which is this round again with somebody pushing harder. **The portfolio**, where the
defence document is the piece most worth showing. **And the production project in P14**, which
assumes you can structure something without being told how.`,
    checkpoint: [
      mcq('The capability this direction is specifically hired for is:',
        [['Making a structural call and defending it', true],
         ['Restructuring code without breaking behaviour', false],
         ['Orienting quickly in an unfamiliar codebase', false],
         ['Writing tests for code that resists testing', false]],
        'The first three are widely held. Stating what a decision sacrifices and what would reverse it is what distinguishes this direction.'),
      mcq('A reviewer will spend their ninety seconds on the defence document and:',
        [['The commit history of the refactor', true],
         ['The characterisation tests that were written', false],
         ['The README describing the project structure', false],
         ['The final structure of the restructured module', false]],
        'The history shows the technique in a way no write-up can claim, and the defence is the only artefact where judgement is visible.'),
      mcq('The usual gap when this checkpoint does not pass is that students write a defence which:',
        [['Describes what they did instead of arguing for it', true],
         ['Is too short to cover both of the designs fairly', false],
         ['Argues for a design they did not actually build', false],
         ['Omits the implementation costs they measured', false]],
        'Description is the natural register and argument is the requirement. It is a targeted piece of work rather than a repeat of the month.'),
      mcq('The production project in P14 assumes from this track that you can:',
        [['Structure something without being told how', true],
         ['Deploy an application to a public environment', false],
         ['Write integration tests across several layers', false],
         ['Estimate how long a piece of work will take', false]],
        'P14 specifies requirements and expects an architecture, so the ability to make and record structural decisions is its prerequisite.'),
    ],
  },
];
