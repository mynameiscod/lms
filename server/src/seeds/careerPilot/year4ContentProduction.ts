/**
 * T4_PROD_SPEC, T4_PROD_BUILD, T4_PROD_OPERATE and T4_PROD_REVIEW — twenty units. Module P14.
 *
 * ── WHY THE PRODUCTION PROJECT IS ITS OWN MODULE ──────────────────────────────────────────
 *
 * Every earlier module taught a capability in isolation and assessed it there. This is the first
 * time a student has to carry requirements, architecture, implementation, deployment, operation
 * and explanation through one piece of work — and the spec is explicit that the outcome is
 * something "explainable and supported by implementation, testing, documentation and technical
 * reasoning evidence."
 *
 * That last phrase is the module. Not a project; a project with evidence attached.
 *
 * ── WHAT MAKES IT DIFFERENT FROM THE ENGINEERING BUILD ────────────────────────────────────
 *
 * P03's integration day proved the layers hold together. This proves they hold together for
 * somebody else, at a time you are not there, on input you did not imagine. The distinction is
 * the whole of what "production" means at this level, and it is why the operate topic exists at
 * all — a system that has never run anywhere cannot demonstrate error handling, logging or
 * monitoring, which are three of the spec's own requirements.
 *
 * ── THE PROJECT INTERVIEW IS BUILT ON THIS ────────────────────────────────────────────────
 *
 * P19 asks a student to defend architecture, implementation, the hardest bug, trade-offs,
 * security and testing. Every one of those is a decision made here, which is why this module
 * insists decisions are RECORDED as they are made rather than reconstructed in month five when
 * somebody asks.
 *
 * Attribution: T4_PROD_SPEC defaults to TECHNICAL_WRITING with the architecture unit on
 * SOFTWARE_ARCHITECTURE; T4_PROD_BUILD to PRODUCTION_ENGINEERING with failure design and its
 * debugging unit on ERROR_HANDLING_DESIGN; T4_PROD_OPERATE to DEPLOYMENT with metrics on
 * MONITORING_OBSERVABILITY and the incident on LOGGING_DIAGNOSTICS; T4_PROD_REVIEW to CODE_REVIEW
 * with the presentation and interview units on TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PRODUCTION_BUNDLES: PilotBundle[] = [
  /* ══ T4_PROD_SPEC ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PROD_SPEC_USER_STORIES',
    notes: `**Turning "an app for X" into the handful of things a user actually needs to be able to
do.**

## Why the vague version fails

**"A platform for managing events" describes a category, not a system.** Nothing in it says what
anybody does, so nothing in it can be built, estimated or finished.

**And unfinishable is the practical problem.** A project with no defined scope expands until the
time runs out, which is how most student capstones arrive incomplete rather than through
difficulty.

## The shape that works

**As a [who], I want to [do what], so that [why].**

Not a ceremony — the three parts each do work. **The who** decides whose problem it is. **The
what** is the boundary. **The why** is what lets you cut it: a story whose purpose you cannot
state is one you can drop.

## Write them small enough to finish

**If a story takes more than a day or two, split it.** Not because of a rule, but because a story
that spans a week has no point at which you know whether it is going well.

**Vertical slices, not layers.** "The schema for events" is not a story — nobody can use it and
you cannot tell if it works. "Create an event and see it in the list" is, and it proves every
layer at once.

## Acceptance, stated

**How will you know this is done?** One or two sentences per story, written before the work.
Without it, "done" is decided afterwards by whoever is tired.

## What to cut

**Rank ruthlessly, and expect to cut half.** A finished system doing four things well is worth
considerably more in a portfolio and an interview than an unfinished one that attempted twelve.

**The cutting is the skill**, and the fact that it feels like failure is why most students do not
do it until it is too late.`,
    mcqs: [
      mcq('"The schema for events" is not a story because nobody can use it and:',
        [['You cannot tell whether it works', true],
         ['It spans more than one day of effort', false],
         ['It describes a category rather than a system', false],
         ['The acceptance criteria cannot be written', false]],
        'A horizontal layer produces no observable behaviour, so there is nothing to verify until something above it also exists.'),
      mcq('A project with no defined scope expands until the time runs out, which is how most student capstones arrive incomplete rather than:',
        [['Through difficulty', true],
         ['Because of poor time management', false],
         ['Due to technical problems encountered', false],
         ['Because the requirements changed midway', false]],
        'The work was never bounded, so there was no point at which it could be finished regardless of how capable the student was.'),
    ],
    checkpoint: [
      mcq('The "so that" part of a story is what lets you cut it, because a story whose purpose you cannot state:',
        [['Is one you can drop', true],
         ['Needs to be split into smaller pieces', false],
         ['Should be deferred to a later iteration', false],
         ['Requires clarification from the stakeholder', false]],
        'Without a stated purpose there is no case for its inclusion, which makes it the first candidate when scope has to be reduced.'),
      mcq('A finished system doing four things well is worth more in a portfolio and an interview than an unfinished one attempting twelve, and the cutting is the skill because:',
        [['It feels like failure, so students defer it', true],
         ['Ranking requires knowing the user well', false],
         ['Estimation is unreliable at this stage', false],
         ['Reviewers count the number of features', false]],
        'Removing planned work reads as giving up, so it is postponed until the deadline forces it and the result is half-built rather than scoped.'),
    ],
  },
  {
    unitCode: 'T4_PROD_SPEC_THE_SPEC',
    notes: `**A specification somebody could build from** — which is a higher bar than one that
describes what you intend.

## The test

**Could another person build this without asking you a question?**

**They cannot, entirely** — no specification is complete. But the number of questions they would
need to ask is the quality measure, and it is a far more useful one than length.

## What has to be in it

**What it does**, as the stories.

**The data.** What entities exist, what they hold, and how they relate. **A rough schema counts**
and is worth more than prose.

**The interfaces.** What the endpoints are, roughly what goes in and out.

**The rules.** Anything that constrains behaviour: who may do what, what is required, what cannot
happen. **These are what nobody writes down**, and they are exactly what the next person cannot
guess.

**The out-of-scope list.** What this deliberately does not do — the single most useful section and
the most frequently omitted.

## What can be left out

**Implementation detail.** Which library, which pattern. Specifying those early constrains for no
benefit and dates the document immediately.

## Why write it at all for a solo project

**Because it is the only version of your intentions that exists outside your head**, and your
head is going to change without noticing.

**And because P19 asks you to explain what you built and why.** A specification written before the
work is evidence of intent; an account written in month five is a reconstruction, and interviewers
can tell the difference within two questions.

## Keep it short

**Two or three pages.** A twenty-page specification for a two-month project is a document nobody
will read, including you, and its length is a cost rather than a virtue.`,
    mcqs: [
      mcq('The quality measure for a specification is not its length but:',
        [['How many questions a builder would need to ask', true],
         ['Whether every implementation choice is stated', false],
         ['How closely it matches the finished system', false],
         ['The number of stories it manages to cover', false]],
        'Completeness is unattainable, so the useful measure is how far somebody could get independently before being blocked.'),
      mcq('The rules — who may do what, what is required, what cannot happen — are singled out because they are:',
        [['What nobody writes down and nobody can guess', true],
         ['The hardest part of the system to implement', false],
         ['Most likely to change during development', false],
         ['Required by the acceptance criteria anyway', false]],
        'They live in the author’s head as obvious constraints, so they are omitted and are precisely what another builder cannot reconstruct.'),
    ],
    checkpoint: [
      mcq('The out-of-scope list is described as the single most useful section and the most frequently omitted because it:',
        [['States what the system deliberately does not do', true],
         ['Reduces the length of the rest of the document', false],
         ['Lists the features postponed to a later release', false],
         ['Protects the author from changing requirements', false]],
        'Without it, every absent capability reads as an oversight, and the reader cannot distinguish a decision from a gap.'),
      mcq('A specification written before the work is evidence of intent, where an account written in month five is a reconstruction — and interviewers can tell the difference within:',
        [['Two questions', true],
         ['The first few minutes of the round', false],
         ['A detailed reading of the document', false],
         ['A comparison against the source history', false]],
        'A reconstruction is shaped by what happened, so probing an alternative that was available at the time exposes reasoning that did not exist then.'),
    ],
  },
  {
    unitCode: 'T4_PROD_SPEC_THE_ARCHITECTURE',
    notes: `**The decisions that are expensive to reverse, written down while they are cheap to
make.**

## Which decisions are architectural here

**The shape.** One service or several. For a project this size the answer is almost always one,
and being able to say why rather than defaulting to it is the point.

**Storage.** Relational or not, and what the access patterns actually are.

**The layering.** Where business rules live, and what may call what.

**The boundary with the client.** What is computed where, and what is trusted.

**Authentication and authorization.** How identity is established and how ownership is enforced.

## Record each as three sentences

**What was chosen. What was rejected. Why.**

**That is a decision record**, and three sentences is sufficient. Its entire value is to the
reader who arrives later — including you, in month four, wondering what you were protecting
against.

## The one that matters most for a solo project

**"Why not something simpler?"** Students reach for several services, a message queue and a cache
because production systems have them, and then spend the month operating infrastructure instead of
building the thing.

**The defensible answer for a project this size is nearly always the simple one**, and being able
to say so — with the condition that would change it — is a stronger answer in an interview than
having built the complicated version.

## Draw it

**One diagram: the components and what calls what.** It takes ten minutes, it exposes a circular
dependency immediately, and it is the artefact P19 asks you to talk over.

## What to avoid

**Deciding it all up front.** Architecture emerges as the requirements are understood. Record the
decisions you have actually made and leave the rest open rather than inventing commitments you
will quietly abandon.`,
    mcqs: [
      mcq('Students reach for several services, a queue and a cache because production systems have them, and then spend the month:',
        [['Operating infrastructure instead of building the thing', true],
         ['Debugging problems the simpler version avoids', false],
         ['Learning tools they will not use afterwards', false],
         ['Waiting for deployments that take too long', false]],
        'The complexity brings its own operational burden, which consumes the time that was meant for the capability being demonstrated.'),
      mcq('A decision record is three sentences: what was chosen, what was rejected, and:',
        [['Why', true],
         ['When it was decided', false],
         ['Who was consulted about it', false],
         ['How it will be measured', false]],
        'The reasoning is the only part that cannot be recovered from the code, which is why it is the part worth writing down.'),
    ],
    checkpoint: [
      mcq('Being able to say why the simple architecture is right, with the condition that would change it, is a stronger interview answer than:',
        [['Having built the complicated version', true],
         ['Describing the trade-offs in the abstract', false],
         ['Choosing whatever the team currently uses', false],
         ['Deferring the decision until it is forced', false]],
        'It demonstrates judgement about fit, whereas unnecessary complexity demonstrates familiarity with patterns rather than knowing when they apply.'),
      mcq('Deciding the architecture entirely up front is discouraged because architecture:',
        [['Emerges as the requirements are understood', true],
         ['Is easier to change than most people assume', false],
         ['Should follow the framework’s conventions', false],
         ['Cannot be recorded before code exists', false]],
        'Committing to decisions you have not yet needed produces constraints you will abandon, which makes the record less trustworthy overall.'),
    ],
  },
  {
    unitCode: 'T4_PROD_SPEC_PRACTICE',
    notes: `**A brief, taken to stories, a specification and an architecture in one sitting.**

## The drill

**One paragraph of vague intent**, of the kind a real request arrives as. In seventy minutes
produce:

**Six to eight stories**, ranked, with acceptance criteria.

**An out-of-scope list** of at least four things.

**A rough schema** — entities, fields, relationships.

**Three architectural decision records**, three sentences each.

**One diagram.**

## Why the time limit

**Because the alternative is a week of documentation for a two-month project**, which is the
failure mode at the other end. The specification is a tool, not a deliverable, and one produced in
seventy minutes is the right size for the work it supports.

## The part to spend longest on

**The out-of-scope list and the ranking.** They are what determine whether the project finishes,
and they take the least time and the most nerve.

## What good looks like

**Somebody else can read it and tell you what you are building and what you are not.** That is the
whole test, and it takes them five minutes to apply.

## The second half

**Then hand it to somebody and count their questions.** Every question is a gap, and the ones
about rules — who may do what, what happens when — are the gaps that matter most, because they are
the ones you would otherwise have discovered in week four.`,
    mcqs: [
      mcq('The seventy-minute limit exists because the failure mode at the other end is:',
        [['A week of documentation for a two-month project', true],
         ['A specification too short to build from', false],
         ['Decisions made before requirements are clear', false],
         ['An architecture that constrains implementation', false]],
        'The specification is a tool supporting the work, so disproportionate effort on it consumes the time it was meant to protect.'),
      mcq('The parts to spend longest on are the out-of-scope list and the ranking, because they determine whether the project finishes and take:',
        [['The least time and the most nerve', true],
         ['The most time and the least judgement', false],
         ['Equal effort to the rest of the document', false],
         ['Longer than the architecture decisions do', false]],
        'Deciding what to exclude is quick to write and difficult to commit to, which is why it is the section most often left vague.'),
    ],
    checkpoint: [
      mcq('The questions that matter most when somebody reads your specification are the ones about rules, because they are the gaps you would otherwise have discovered:',
        [['In week four', true],
         ['During the final review', false],
         ['When the tests were written', false],
         ['After the system was deployed', false]],
        'Rules are only exercised once the feature is being built, so an unstated one surfaces mid-implementation when changing it is expensive.'),
      mcq('The whole test of the specification is that somebody else can read it and tell you what you are building and what you are not, applied in:',
        [['Five minutes', true],
         ['A detailed review session', false],
         ['The time it takes to read it fully', false],
         ['A conversation with the author present', false]],
        'A short document with clear scope communicates immediately, and needing longer is itself evidence that the boundaries are not stated.'),
    ],
  },
  {
    unitCode: 'T4_PROD_SPEC_INTERVIEW_QUESTION',
    notes: `**"How did you decide what to build?"**

## Why this opens a project interview

**Because it establishes whether there was a decision.** A student who built whatever occurred to
them, in whatever order, will describe features. One who scoped deliberately will describe a
choice, and the difference is audible immediately.

## The answer

**The problem, and whose it was.** Two sentences. Not the technology.

**What you decided not to build**, and why. **Volunteering the out-of-scope list is the strongest
move in this question**, because it demonstrates the project was bounded rather than abandoned
where it happened to stop.

**How you ranked.** What was essential to the thing being useful at all, and what was
enhancement.

**And what you cut later**, when it became clear the time would not stretch. Everybody cuts;
saying so is honest and shows the scope was managed rather than merely set.

## The follow-ups

**"What would you build next?"** Have an answer. It shows you know where the current version stops
being useful.

**"Why not use an existing product for this?"** A fair question about any project, and the honest
answer for a student project — that it was built to demonstrate capability — is acceptable when
said plainly.

**"How long did you think it would take, and how long did it take?"** Estimation honesty. Nearly
everybody underestimates, and a candidate who reports the gap without embarrassment is describing
something every engineer recognises.

## What loses marks

**Describing the feature list as though it were inevitable.** "It does A, B and C" invites the
question of why it does not do D, and having no answer suggests nothing was decided.`,
    mcqs: [
      mcq('Volunteering the out-of-scope list is the strongest move because it demonstrates the project was:',
        [['Bounded rather than abandoned where it stopped', true],
         ['Planned in collaboration with a stakeholder', false],
         ['Smaller than the available time allowed for', false],
         ['Designed to be extended at a later date', false]],
        'An unfinished project and a deliberately scoped one look similar from outside, and the exclusion list is what distinguishes them.'),
      mcq('Describing the feature list as though it were inevitable invites the question of why it does not do D, and having no answer suggests:',
        [['Nothing was decided', true],
         ['The requirements were externally imposed', false],
         ['The project ran out of available time', false],
         ['The feature was technically infeasible', false]],
        'A scope arrived at by decision has reasons for its boundaries, so an absent justification implies the boundary was accidental.'),
    ],
    checkpoint: [
      mcq('Reporting the gap between estimated and actual time without embarrassment is valued because underestimation is:',
        [['Something every engineer recognises', true],
         ['Expected of students in particular', false],
         ['Evidence of ambitious scoping decisions', false],
         ['Less important than the final outcome', false]],
        'It is universal, so an honest report reads as calibration rather than as failure, and a claim of accurate estimation reads as implausible.'),
      mcq('"Why not use an existing product for this?" has an acceptable honest answer for a student project, namely that it was:',
        [['Built to demonstrate capability', true],
         ['Cheaper than licensing an alternative', false],
         ['Tailored to requirements nothing else met', false],
         ['An opportunity to learn the technologies used', false]],
        'The purpose was the demonstration rather than the product, and stating that plainly is more credible than inventing a market gap.'),
    ],
  },

  /* ══ T4_PROD_BUILD ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PROD_BUILD_WHAT_PRODUCTION_MEANS',
    notes: `**Somebody else runs it, at a time you are not there, on input you did not imagine.**

## The three clauses do all the work

**Somebody else.** They do not know the happy path, will not read your README first, and will use
it in an order you did not anticipate.

**At a time you are not there.** It has to behave sensibly without you, which means failures need
to be handled rather than observed.

**On input you did not imagine.** Not malicious, necessarily — just a name with an apostrophe, a
file twice the size you tested with, a date in a format you did not consider.

## What changes the moment a real user depends on it

**Errors need to be handled, not just to occur.** A stack trace on screen is a development
convenience and a production failure.

**Data has to survive.** A restart, a deploy, a mistake. Anything a user created that disappears is
the worst class of failure because it is unrecoverable and they blame you correctly.

**It has to be observable.** If you cannot tell whether it is working, you will find out from
somebody else.

**And it has to be changeable while running.** A system that can only be updated by taking it down
is one that stops being updated.

## The honest bar for a student project

**Not five nines.** It should handle a bad input without crashing, keep the data a user entered,
say something useful when a dependency is down, and let you find out what happened afterwards.

**Four properties, and almost no student project has all four** — which is exactly why having them
is worth something in an interview.

## The mindset

**Assume it will be used wrongly, at the worst time, by somebody with no context.** That is not
pessimism; it is the description of every real deployment.`,
    mcqs: [
      mcq('Data that a user created disappearing is described as the worst class of failure because it is:',
        [['Unrecoverable, and they blame you correctly', true],
         ['Difficult to reproduce during development', false],
         ['Usually caused by a deployment mistake', false],
         ['Invisible until somebody reports it', false]],
        'Nothing can restore what was never persisted, and the responsibility for persisting it was entirely the application’s.'),
      mcq('A system that can only be updated by taking it down is one that:',
        [['Stops being updated', true],
         ['Requires a maintenance window each week', false],
         ['Loses data during each of the restarts', false],
         ['Cannot be deployed more than once a day', false]],
        'The cost of each change includes a visible outage, so changes are deferred and batched until updating becomes rare.'),
    ],
    checkpoint: [
      mcq('The honest bar for a student project is four properties: handling a bad input without crashing, keeping the data a user entered, saying something useful when a dependency is down, and:',
        [['Letting you find out what happened afterwards', true],
         ['Recovering automatically from any failure', false],
         ['Remaining available during a deployment', false],
         ['Scaling to handle unexpected traffic', false]],
        'Observability completes the set, because the other three can each fail and the failure must be diagnosable after the fact.'),
      mcq('"On input you did not imagine" is clarified as not necessarily malicious but:',
        [['A name with an apostrophe or an oversized file', true],
         ['A request crafted to bypass validation', false],
         ['Traffic at a volume beyond the design', false],
         ['Data from an unsupported client version', false]],
        'Ordinary real-world variety exceeds what a developer tests with, and most production input failures have no attacker behind them.'),
    ],
  },
  {
    unitCode: 'T4_PROD_BUILD_FAILURES_ON_PURPOSE',
    notes: `**Deciding in advance what happens when the dependency is down**, rather than finding
out.

## Every external call is a decision you have already made

**By default, badly.** No timeout means waiting forever. No catch means a stack trace reaches the
user. No fallback means one unavailable dependency takes the whole feature with it.

**Those are choices**, and they were made by not making them.

## The four questions per dependency

**What if it is slow?** A timeout, always. **A call without one is the single most common cause of
a cascading failure**, because slow holds resources where down releases them.

**What if it is down?** Fail fast, and decide what the user sees.

**What if it returns something unexpected?** Validate what comes back, particularly from anything
you do not control.

**What if it succeeds and we fail afterwards?** The half-completed operation. A payment taken and
an order not created is the shape that matters, and the answer is either a transaction or a
recorded intent that can be completed later.

## Degrade rather than collapse

**If recommendations are unavailable, show the page without them.** If the avatar service is down,
show initials.

**The feature is worse; the system is up.** That is nearly always the right trade for anything
non-essential, and deciding which parts are non-essential is the design work.

## What the user sees

**Something honest and actionable.** "We could not save this — your text is still here, try
again" preserves both their work and their trust.

**Not a stack trace**, which tells them nothing and tells an attacker something.

## Write them down

**A table: dependency, timeout, on failure, what the user sees.** Four columns, one row each. It
takes twenty minutes and it is the artefact P19 asks about when it asks how you handled
failure.`,
    mcqs: [
      mcq('A call without a timeout is the most common cause of a cascading failure because slow:',
        [['Holds resources where down releases them', true],
         ['Is harder to detect in the monitoring', false],
         ['Triggers retries that amplify the load', false],
         ['Affects more requests than a failure does', false]],
        'A failed call returns immediately and frees its connection; a hanging one accumulates them until the pool is exhausted.'),
      mcq('A payment taken and an order not created is the shape that matters, and the answer is either a transaction or:',
        [['A recorded intent that can be completed later', true],
         ['A retry until both operations succeed', false],
         ['A rollback triggered by the client', false],
         ['A reconciliation report reviewed daily', false]],
        'When the two cannot be made atomic, durably recording what must still happen allows the outstanding half to be completed reliably.'),
    ],
    checkpoint: [
      mcq('"We could not save this — your text is still here, try again" preserves both their work and:',
        [['Their trust', true],
         ['The server’s current state', false],
         ['The option to report the problem', false],
         ['A record of the failed attempt', false]],
        'An honest message that protects what they entered leaves them willing to try again, where a loss with no explanation does not.'),
      mcq('The failure table has four columns: dependency, timeout, on failure, and:',
        [['What the user sees', true],
         ['Who owns the dependency', false],
         ['How often it has failed', false],
         ['Whether a retry is attempted', false]],
        'The user-visible consequence is what makes each row a complete decision rather than an internal handling note.'),
    ],
  },
  {
    unitCode: 'T4_PROD_BUILD_MINI_PROJECT',
    notes: `**Building the production system.** Requirements, schema, API, authentication,
interface, error handling, tests and documentation — one system.

## The brief

**Build what your specification describes**, scoped so it finishes.

## The requirements that make it production rather than coursework

**Every external call has a timeout and a decided failure behaviour**, per the table.

**Nothing a user entered is lost** to a restart, a deploy or an error.

**Authorization is scoped to the caller**, on every endpoint including the last one added.

**Errors return one shape**, and the user sees something actionable.

**A test suite that fails when the code it covers is removed.**

**Documentation that gets a stranger from a fresh clone to a running copy** without asking you
anything.

## Build in verifiable order, and commit as you go

**Schema, query, endpoint, client, tests, error paths.** Checking at each step, committing at each
step that works.

**And record decisions as you make them.** Three sentences each. **In month five you will not
remember why**, and P19 asks precisely that.

## The scope discipline

**Cut early rather than late.** A finished system doing four things is worth more than an
unfinished one attempting twelve, and the moment to decide is the moment you first suspect it,
not the week before it is due.

## What to submit

**The repository, the decision records, the failure table, and a README that works.**

**And a note on what you cut and when**, which is the evidence that the scope was managed rather
than merely exceeded.`,
    assignment: {
      title: 'The production system',
      description: 'Build the system your specification describes, with timeouts, durable user data, scoped authorization, one error shape, real tests and working documentation.',
      instructions: `Build what your specification describes, **scoped so that it finishes.**

**The requirements that make this production rather than coursework:** every external call has a
timeout and a decided failure behaviour; nothing a user entered is lost to a restart, a deploy or
an error; authorization is scoped to the caller on every endpoint **including the last one added**;
errors return one consistent shape and the user sees something actionable; the test suite fails
when the code it covers is removed; and the documentation gets a stranger from a fresh clone to a
running copy without asking you anything.

**Build in verifiable order** — schema, query, endpoint, client, tests, error paths — checking at
each step and committing at each step that works.

**Record decisions as you make them**, three sentences each: what was chosen, what was rejected,
why. In month five you will not remember, and the project interview asks precisely that.

**Cut early rather than late.** The moment to reduce scope is the moment you first suspect it, not
the week before submission.

**Submit:** the repository, the decision records, the failure table, a README that works, and a
note on **what you cut and when** — which is the evidence the scope was managed rather than merely
exceeded.`,
      rubric: [
        { criterion: 'Failures are handled deliberately', description: 'Every external call has a timeout and a decided behaviour, and the failure table matches what the code does.', maxPoints: 25 },
        { criterion: 'User data survives', description: 'Nothing a user entered is lost to a restart, a deploy or an error path.', maxPoints: 25 },
        { criterion: 'The boundary holds', description: 'Authorization is scoped to the caller on every endpoint, verified including the most recently added.', maxPoints: 25 },
        { criterion: 'Runs from a fresh clone, with real tests', description: 'Documentation gets a stranger to a running copy, and the suite fails when covered code is removed.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Decisions are recorded as they are made because in month five you will not remember why, and:',
        [['The project interview asks precisely that', true],
         ['The code will have changed substantially', false],
         ['A reviewer requires them before assessment', false],
         ['They are harder to write in retrospect', false]],
        'P19 asks candidates to defend architecture and trade-offs, so a contemporaneous record is the difference between evidence and reconstruction.'),
      mcq('The moment to cut scope is the moment you first suspect it, rather than:',
        [['The week before it is due', true],
         ['After the core features are complete', false],
         ['When a reviewer suggests reducing it', false],
         ['Once the estimate has been exceeded twice', false]],
        'Cutting late leaves partially built features that consumed time and deliver nothing, where cutting early redirects that time into finishing.'),
    ],
  },
  {
    unitCode: 'T4_PROD_BUILD_DEBUGGING',
    notes: `**Debugging something large enough that you no longer remember all of it.**

## What changes at this size

**You cannot hold it in your head**, which removes the technique that worked on everything
smaller: reading until you spot it.

**So the method has to be mechanical**, and the mechanical method is bisection — of the stack, of
the history, of the input.

## Bisect the system

**Three observations, each about a minute:** what is in the database, what the endpoint returns,
what the client received.

**After those you know which boundary is wrong**, having read no code.

## Bisect the history

**When it worked last week and does not now**, the commit that introduced it is findable in log n
steps. Twenty commits is five checks.

**It requires a reliable reproduction**, which is why reproducing comes first.

## Your own logs are the evidence

**And this is where the logging you added earlier pays for itself.** A request id, the method, the
path, the status and the duration — with those you can find the failing request and follow it.

**Without them you are reproducing by guesswork**, which on a system with several moving parts can
take an afternoon.

## The trap specific to your own project

**You believe you know what the code does**, because you wrote it. That belief is what is wrong,
and it is stronger for your own code than for anybody else's.

**Print the value. Check the assumption.** The ten-second check beats an hour of reasoning from a
false premise, and the premise is false more often in code you wrote than in code you are reading
fresh.

## Afterwards

**Add what was missing.** The log line that would have shown it, the test that would have caught
it. **An incident on your own system that produces only a fix has wasted most of its value.**`,
    mcqs: [
      mcq('At this size you cannot hold the system in your head, which removes the technique that worked on everything smaller:',
        [['Reading until you spot it', true],
         ['Adding print statements throughout', false],
         ['Testing each function in isolation', false],
         ['Reverting to the last working version', false]],
        'Comprehension-based debugging requires the whole system to fit in working memory, and beyond a certain size it no longer does.'),
      mcq('The belief that you know what your own code does is stronger for your own code than for anybody else’s, which makes the ten-second check:',
        [['More valuable, not less', true],
         ['Unnecessary for code you wrote recently', false],
         ['Equivalent to reading the function again', false],
         ['Only useful when the code is unfamiliar', false]],
        'Familiarity suppresses verification precisely where the false premise is most likely, so checking is most needed where it feels least necessary.'),
    ],
    checkpoint: [
      mcq('On a system with twenty commits since it last worked, bisecting the history costs about:',
        [['Five checks, because each one halves the range', true],
         ['Twenty checks, testing each commit in sequence', false],
         ['Ten checks, examining every second commit made', false],
         ['Two checks, at each end of the range in question', false]],
        'Binary search over the history is logarithmic, which is why the mechanical approach beats walking the commits one at a time.'),
      mcq('An incident on your own system that produces only a fix has wasted most of its value because the investigation revealed:',
        [['Which evidence was missing', true],
         ['How long the diagnosis actually took', false],
         ['Which component is least reliable', false],
         ['That the tests were insufficient overall', false]],
        'The difficulty of the diagnosis identifies the missing log line or test, and adding it is what makes the next occurrence faster.'),
    ],
  },
  {
    unitCode: 'T4_PROD_BUILD_INTERVIEW_QUESTION',
    notes: `**"Tell me about the hardest bug in this project."**

## Why it is asked about the production project specifically

**Because this is the system large enough to have had one.** Earlier exercises were small enough
to debug by reading, and a candidate whose hardest bug is a typo has not built anything
substantial.

## The answer

**The symptom, precisely.** Not "it broke" — what was observed, by whom, under what conditions.

**Why it was hard.** Intermittent, only in the deployed environment, no error at all, or far from
its cause.

**What you tried that did not work.** **The strongest part of the answer and the part most
candidates omit.** Eliminated hypotheses are the substance of debugging, and including them makes
the account credible in a way a straight line never is.

**How you found it.** The technique, named. Bisected the history, logged at a boundary, compared
two environments.

**The cause, and its distance from the symptom.** Frequently the interesting part.

**What you changed afterwards.** A test, a log line, a habit. This is what says the experience
landed rather than merely occurred.

## The follow-ups

**"How long did it take?"** Honesty. Long is not a weakness; long with no method is.

**"Could it happen again?"** The answer that works names what would catch it now.

**"Has anything similar happened since?"** They are checking whether the fix generalised or whether
the class is still open.

## What loses marks

**A bug that was really a misunderstanding of a library.** It happens and it is not a hard bug; it
is a documentation lookup. **And describing a feature that was difficult to build**, which answers
a different question and suggests no hard bug is available.`,
    mcqs: [
      mcq('The strongest part of a hardest-bug answer, and the part most candidates omit, is:',
        [['What you tried that did not work', true],
         ['The precise technical cause of the fault', false],
         ['How long the investigation took overall', false],
         ['The impact the bug had on users', false]],
        'Eliminated hypotheses are the substance of debugging, and an account without them reads as reconstructed rather than remembered.'),
      mcq('"Has anything similar happened since?" checks whether the fix generalised or whether:',
        [['The class is still open', true],
         ['The tests were updated afterwards', false],
         ['The system has been stable since then', false],
         ['The root cause was correctly identified', false]],
        'Fixing one instance leaves the pattern available, so a recurrence indicates the underlying capability was never removed.'),
    ],
    checkpoint: [
      mcq('A bug that was really a misunderstanding of a library is not a hard bug but:',
        [['A documentation lookup', true],
         ['A gap in the candidate’s knowledge', false],
         ['An argument for better library choices', false],
         ['A failure of the integration testing', false]],
        'Once the correct behaviour is read, the fault is immediately clear, so no investigation technique was required.'),
      mcq('This question is asked about the production project specifically because it is the system large enough to have had one, where earlier exercises were:',
        [['Small enough to debug by reading', true],
         ['Not deployed anywhere for users to hit', false],
         ['Built from templates rather than designed', false],
         ['Assessed before bugs could accumulate', false]],
        'Below a certain size the whole program fits in working memory, so faults are found by comprehension rather than by technique.'),
    ],
  },

  /* ══ T4_PROD_OPERATE ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PROD_OPERATE_DEPLOYING_IT',
    notes: `**Getting it running where a stranger can reach it**, with the configuration and the
secrets handled properly.

## Why deployment is a requirement of this module

**Because three of the spec's production requirements — error handling, logging and monitoring —
cannot be demonstrated on a laptop.** There is nothing to monitor and no incident to log.

**And because a project with a URL is assessed and one without one frequently is not.** A reviewer
with twenty minutes and six candidates opens what opens.

## Configuration

**From the environment, never baked in.** The same artefact must run locally and remotely with
different settings, or you are not deploying what you tested.

**A committed example file with the keys and no values** documents what is needed; the real file
is never added.

## Secrets

**Injected at run time.** Not in the repository, not in the image, not in the client bundle.

**A secret that was ever committed is rotated, not deleted** — history retains it, and public
repositories are scanned within minutes.

## The health check

**It must establish that the process can serve**, not that it exists. One that returns a constant
reports a process unable to reach its database as healthy, and that process then receives traffic
it cannot handle.

## Migrations

**The three-deploy sequence for anything that removes or renames**: tolerate both shapes, migrate,
remove the tolerance. Code rolls back; a dropped column does not.

## The rollback

**Decided before it is needed.** Keeping the previous artefact and being able to start it covers
most cases, and **having performed it once is the difference between a capability and a plan.**

## The check that finds everything

**Deploy from a fresh clone.** Anything uncommitted, globally installed or set only in your shell
reveals itself immediately.`,
    mcqs: [
      mcq('Deployment is a requirement of this module because three of the spec’s production requirements cannot be demonstrated on a laptop, namely error handling, logging and:',
        [['Monitoring', true],
         ['Authentication', false],
         ['Testing', false],
         ['Documentation', false]],
        'There is nothing to monitor and no incident to log locally, so the evidence for those requirements can only come from something running.'),
      mcq('A secret that was ever committed is rotated rather than deleted because:',
        [['History retains it and repositories are scanned', true],
         ['Deletion requires rewriting every branch', false],
         ['The value may be cached by the build system', false],
         ['Removing it would break the running deployment', false]],
        'The earlier commit still contains the value and public repositories are scanned continuously, so only changing the secret removes the exposure.'),
    ],
    checkpoint: [
      mcq('A health check returning a constant reports a process unable to reach its database as healthy, and that process then:',
        [['Receives traffic it cannot handle', true],
         ['Is restarted by the orchestrator anyway', false],
         ['Logs an error that nobody is watching', false],
         ['Fails its next deployment verification', false]],
        'Routing decisions are made from the check, so a process that reports healthy while unable to serve fails every request sent to it.'),
      mcq('Having performed a rollback once is the difference between a capability and:',
        [['A plan', true],
         ['A documented procedure', false],
         ['An untested configuration', false],
         ['A theoretical possibility', false]],
        'A described rollback has never been shown to work, and the first attempt during a real incident is the worst time to discover it does not.'),
    ],
  },
  {
    unitCode: 'T4_PROD_OPERATE_LOGS_AND_METRICS',
    notes: `**Instrumenting a system so its health is visible without opening the code.**

## The three signals, and what each answers

**Health** — can this process serve? A binary, used to route traffic.

**Metrics** — is it getting worse, and since when? Numbers over time.

**Logs** — what happened to this particular request? Individual events with context.

**All three, because each answers a question the others cannot.**

## The four numbers

**Request rate. Error rate. Duration, as percentiles. Saturation** — how close something is to a
limit.

**Percentiles rather than averages**, because an average hides the slow tail and the slow tail is
what users experience and complain about.

## Logging that is worth keeping

**Method, path, status, duration and a request id**, on every request. Those five answer "what
happened to my request at 14:02", which is the question you will be asked.

**The request id threaded through everything** is the single highest-value logging decision in a
system handling concurrent work. Without it, interleaved requests produce unattributable lines.

**And return it to the caller in the response**, so a support conversation becomes a lookup rather
than an investigation.

## What must never be logged

**Passwords, tokens, card numbers, personal data.** Logs are copied, shipped and retained far
longer than anybody intends, so **a secret in a log is a secret published.**

## Levels, used properly

**ERROR** is something that needs a person. **WARN** is unexpected and handled. **INFO** is the
milestones. **DEBUG** is for investigating.

**The failure mode is everything at INFO**, which produces a volume nobody reads, and then the one
line that mattered is in it somewhere.

## Add it while you understand the code

**Which is while you are writing it.** Added during an incident it is guesswork under pressure, and
the run that would have used it has already happened.`,
    mcqs: [
      mcq('Logging a password or a token is treated as publishing it because logs are:',
        [['Copied, shipped and retained beyond any intent', true],
         ['Readable by everybody who can reach the server', false],
         ['Stored without encryption on most of the hosts', false],
         ['Indexed by tools the application cannot control', false]],
        'Aggregation, backups and third-party log services each take a copy, and redacting afterwards cannot reach the copies already made.'),
      mcq('The failure mode of log levels is everything at INFO, which produces a volume nobody reads, so:',
        [['The line that mattered is in there somewhere', true],
         ['Disk usage grows faster than anticipated', false],
         ['The logging itself becomes a bottleneck', false],
         ['Errors are overwritten before being read', false]],
        'The information is present and unreachable, which is why levels exist — so the important lines can be read without the routine ones drowning them.'),
    ],
    checkpoint: [
      mcq('Instrumentation should be added while you understand the code, which is while you are writing it, because added during an incident it is:',
        [['Guesswork under pressure, after the fact', true],
         ['Slower to deploy than a normal change', false],
         ['Likely to introduce a new defect', false],
         ['Unavailable until the next release cycle', false]],
        'The comprehension needed to choose what to record is present at writing time and absent later, and the run that would have used it has passed.'),
      mcq('The five fields worth logging on every request are method, path, status, duration and:',
        [['A request id', true],
         ['The authenticated user’s full profile', false],
         ['The complete request body as received', false],
         ['The name of the server that handled it', false]],
        'The identifier is what joins the lines belonging to one request, and the body risks recording secrets while rarely being needed in full.'),
    ],
  },
  {
    unitCode: 'T4_PROD_OPERATE_DEBUGGING',
    notes: `**The first incident.** Working from the evidence you have, and then adding what you
wish you had.

## The sequence

**Is it affecting users, and how many?** This decides urgency before anything else.

**What changed recently?** **The highest-value question and the one most often skipped** — most
incidents follow a deploy or a configuration edit, and checking takes thirty seconds.

**What do the four numbers say?** Error rate, duration, request rate, saturation. They tell you
what kind of problem it is and when it started.

**Then the logs**, for one failing request, followed end to end.

## Stabilise before diagnosing

**If a rollback restores service, roll back.** Understanding can happen afterwards with the system
healthy and the pressure off.

**Diagnosing while users are affected is a choice to prioritise curiosity over service**, and it
is the wrong one when a known-good version exists.

## What you will discover

**That the evidence you need is not there.** Almost universally, on a first incident. The log line
that would have shown it, the metric that would have warned, the request id that would have joined
the lines.

**That is the finding**, and it is more valuable than the cause.

## Afterwards

**Write it up while it is fresh.** Timeline, what was affected and for how long, the cause, what
was done, **what would have detected it sooner, and what will change.**

**Blameless and specific.** The last two items are the entire value; a write-up that stops at the
cause has recorded an event rather than learned from it.

## Then add what was missing

**And that is the loop closing.** A system that becomes more observable after every incident
converges on being diagnosable; one that does not has the same incident repeatedly, each time from
the same position of ignorance.`,
    mcqs: [
      mcq('The highest-value question during an incident, and the one most often skipped, is:',
        [['What changed recently', true],
         ['How many users are affected now', false],
         ['Which component is reporting errors', false],
         ['Whether the issue is reproducible', false]],
        'Most incidents follow a deploy or configuration edit, so identifying the recent change frequently resolves it in thirty seconds.'),
      mcq('Diagnosing while users are affected, when a known-good version exists, is described as prioritising:',
        [['Curiosity over service', true],
         ['Thoroughness over speed of response', false],
         ['Root cause over symptom management', false],
         ['Learning over operational stability', false]],
        'Service can be restored immediately by rolling back, so continuing to investigate extends the impact for the investigator’s benefit.'),
    ],
    checkpoint: [
      mcq('On a first incident you will almost universally discover that the evidence you need is not there, and that discovery is:',
        [['More valuable than the cause', true],
         ['A reason to defer the write-up', false],
         ['Evidence the system was built badly', false],
         ['Something to correct before continuing', false]],
        'The cause explains one occurrence; the missing evidence is what makes every future incident slow, so closing that gap has wider effect.'),
      mcq('A system that becomes more observable after every incident converges on being diagnosable, where one that does not has the same incident repeatedly:',
        [['Each time from the same position of ignorance', true],
         ['With a longer interval between occurrences', false],
         ['Until the underlying component is replaced', false],
         ['Affecting a larger number of users each time', false]],
        'Nothing was added, so each recurrence begins with exactly the evidence the previous one lacked.'),
    ],
  },
  {
    unitCode: 'T4_PROD_OPERATE_PRACTICE',
    notes: `**Keeping a deployed system running, and accounting for what happened to it.**

## The drill

**Run your deployed system for a week**, and watch it.

**Each day, five minutes:** the four numbers, anything in the error log, anything that looks
different from yesterday.

**Write one line a day.** What it did, and anything you noticed.

## What you are building

**The habit of looking**, which is the thing that separates a system somebody operates from one
that merely exists. Most student projects are deployed once and never observed again, and their
authors could not say whether they are still running.

## What you will find

**Something.** Almost always: an error that occurs regularly and nobody noticed, a slow endpoint,
a log full of one repeated warning, storage growing steadily.

**None of it is an incident**, which is the point — these are the things that become incidents
later, and seeing them early is what operating something means.

## The second half

**Act on one of them.** Fix the recurring error, or add the alert that would have caught it, or
bound the storage.

**Then record what changed**, and whether the number moved.

## Why a week

**Because a day shows nothing and a month is not going to happen.** A week is long enough for a
pattern to appear and short enough to actually do, and the daily five minutes is the version of
this habit that survives having other work.`,
    mcqs: [
      mcq('Most student projects are deployed once and never observed again, so their authors could not say:',
        [['Whether they are still running', true],
         ['How the deployment was configured', false],
         ['Which version was deployed last', false],
         ['How much the hosting costs them', false]],
        'Without any observation the state of the system is unknown, and a deployment that has stopped would go unnoticed indefinitely.'),
      mcq('The things found during a week of watching are not incidents, which is the point because they are:',
        [['The things that become incidents later', true],
         ['Too minor to justify any action now', false],
         ['Normal behaviour for a small system', false],
         ['Artefacts of the monitoring being new', false]],
        'A recurring error or steady storage growth is a future failure in progress, and noticing it early is what distinguishes operating from deploying.'),
    ],
    checkpoint: [
      mcq('A week is chosen because a day shows nothing and:',
        [['A month is not going to happen', true],
         ['A month exceeds the module’s schedule', false],
         ['Patterns become ambiguous over longer periods', false],
         ['The hosting costs accumulate beyond the free tier', false]],
        'The constraint is whether the habit is actually performed, and a commitment long enough to be abandoned produces no observations at all.'),
      mcq('The daily five minutes is described as the version of this habit that survives:',
        [['Having other work', true],
         ['A system with very low traffic', false],
         ['Periods when nothing is changing', false],
         ['The absence of alerting configuration', false]],
        'Any routine competing with a deadline must be short enough to keep, and five minutes is small enough not to be the thing that gets dropped.'),
    ],
  },
  {
    unitCode: 'T4_PROD_OPERATE_INTERVIEW_QUESTION',
    notes: `**"Is it still running? How do you know?"**

## Why this question is devastating and fair

**Because most candidates cannot answer it**, and the inability reveals that the project was
submitted rather than operated.

**"I think so" and "I have not checked recently" are both common and both honest.** They are also
the answer to a different question than the interviewer asked.

## The answer

**Yes, and here is how I know.** A URL, a health check, a dashboard, or simply that you looked
this morning.

**What you measure.** The four numbers, or honestly which of them you have.

**What would tell you if it stopped.** An alert, or the honest admission that you would find out
by looking.

**"Nothing would currently tell me" is an acceptable answer** and is far stronger than implying
monitoring that does not exist, because the follow-up establishes the truth in one question.

## The follow-ups

**"Has anything gone wrong with it?"** A specific incident is worth a great deal here. **A system
that has never had a problem has usually never had a user.**

**"What did you change as a result?"** The loop closing, which is the strongest thing you can say
about an operated system.

**"What would you add before you would be comfortable with real users on it?"** Honest and
specific. It reframes the whole conversation around responsibility rather than construction, which
is the register this question is asked in.

## What loses marks

**Describing the deployment setup in detail and being unable to say whether it currently works.**
It is the exact shape of somebody who configured something once, and the contrast between the
detail and the ignorance is what makes it memorable to an interviewer.`,
    mcqs: [
      mcq('"Nothing would currently tell me if it stopped" is an acceptable answer and is far stronger than implying monitoring that does not exist because:',
        [['The follow-up establishes the truth in one question', true],
         ['Monitoring is not expected of student projects', false],
         ['Honesty is weighted more heavily than capability', false],
         ['The interviewer cannot verify either claim', false]],
        'An overstated capability collapses immediately when probed, and the collapse is more damaging than the original gap.'),
      mcq('A system that has never had a problem has usually:',
        [['Never had a user', true],
         ['Been built unusually carefully', false],
         ['Been deployed very recently indeed', false],
         ['Had its errors suppressed by configuration', false]],
        'Real usage produces unexpected input and conditions, so an entirely incident-free history suggests the system has not been exercised.'),
    ],
    checkpoint: [
      mcq('Describing the deployment setup in detail while being unable to say whether it currently works is the exact shape of somebody who:',
        [['Configured something once', true],
         ['Used a managed platform for everything', false],
         ['Worked from a tutorial without understanding', false],
         ['Deployed it shortly before the interview', false]],
        'The knowledge is of the setup activity rather than of the running system, which is precisely the distinction the question draws out.'),
      mcq('"What would you add before you would be comfortable with real users on it?" reframes the conversation around:',
        [['Responsibility rather than construction', true],
         ['Scalability rather than correctness', false],
         ['Cost rather than technical capability', false],
         ['Future work rather than what exists', false]],
        'It asks what being accountable for the system would require, which is a different register from describing what was built.'),
    ],
  },

  /* ══ T4_PROD_REVIEW ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PROD_REVIEW_A_README_THAT_WORKS',
    notes: `**Documentation that gets a stranger from a fresh clone to a running copy without
asking you anything.**

## Why this is worth its own unit

**Because it is the thing that decides whether your project is assessed at all.** A reviewer with
twenty minutes and six candidates runs what runs, and "there are a few things you need to set up
first" ends the conversation about that project.

## The five sections

**What it is**, in two sentences. What problem, for whom. Not the stack.

**A screenshot or a link.** The fastest possible conveyance of what it does, and the section most
often missing.

**How to run it.** Exact commands, in order, from a fresh clone. Including the environment
variables, with an example file committed.

**How it works**, briefly. The components, the main flow. Five sentences and the diagram.

**What it does not do.** The out-of-scope list, which prevents every absence reading as an
oversight.

## The test

**Clone it into a new directory and follow your own instructions exactly**, doing nothing from
memory.

**It will fail.** There is always a step that exists only in your shell history — a global
install, a database that already exists, a variable set months ago.

**Finding that is the entire exercise**, and it takes ten minutes.

## What to leave out

**A tour of every file.** Nobody reads it and it is out of date within a week.

**Aspirational features.** A README describing what you intend to build is misleading, and a
reviewer who tries one and finds it absent stops trusting the rest.

## Keep it short

**A page.** Long documentation is documentation nobody reads, and the sections above fit in one
comfortably.`,
    mcqs: [
      mcq('"There are a few things you need to set up first" ends the conversation about that project because a reviewer with twenty minutes and six candidates:',
        [['Runs what runs', true],
         ['Prefers projects with better documentation', false],
         ['Assumes the project is incomplete overall', false],
         ['Has no way to ask clarifying questions', false]],
        'Time is the binding constraint, so anything requiring debugging of setup is set aside in favour of something that starts.'),
      mcq('Following your own instructions from a fresh clone will fail because there is always a step that exists only in:',
        [['Your shell history', true],
         ['The project’s configuration files', false],
         ['A branch that was never merged', false],
         ['The deployment pipeline definition', false]],
        'Global installs, pre-existing databases and long-set variables are invisible from the repository and are performed without being recorded.'),
    ],
    checkpoint: [
      mcq('A README describing features you intend to build is misleading, and a reviewer who tries one and finds it absent:',
        [['Stops trusting the rest', true],
         ['Reports it as a defect in the project', false],
         ['Assumes the feature was recently removed', false],
         ['Continues with the remaining sections', false]],
        'One demonstrably false claim casts doubt on every other claim in the document, which costs more than the missing feature would have.'),
      mcq('A screenshot or link is described as the fastest possible conveyance of what the project does and:',
        [['The section most often missing', true],
         ['The hardest section to keep current', false],
         ['Optional for command-line projects', false],
         ['Less important than the setup steps', false]],
        'It communicates in seconds what paragraphs cannot, and it is routinely omitted because the author already knows what the project looks like.'),
    ],
  },
  {
    unitCode: 'T4_PROD_REVIEW_REVIEWING_YOUR_OWN_WORK',
    notes: `**Reading your own code as though somebody else wrote it**, and finding what you
forgave yourself for.

## Why it is hard

**You read what you intended, not what you wrote.** The code triggers the memory of the decision
rather than being read fresh, which is why reviewing an hour after writing finds almost nothing.

**Two things help.** Time — even a day changes what you see. And **a list**, because a list asks
questions your memory does not.

## The list

**Would a stranger know what this does from its name?**

**Is any business rule only reachable through HTTP?**

**Is every load scoped to the caller — including the endpoint added last?**

**Does every external call have a timeout and a decided failure?**

**Is there anything a user could enter that is not handled?**

**Would the tests fail if the code they cover were removed?**

**Is anything in here that should not be — a secret, a stack trace, a debug flag?**

## What you will find

**The authorization check on the last endpoint.** Almost everybody has one, and expecting it is
what makes you look rather than concluding after two minutes that it is fine.

## What to do with it

**Fix it, and record it.** The list of what you found in your own review is a genuinely strong
thing to have in a project interview: it demonstrates that you read your own work adversarially
and that the review was capable of finding something.

**A student who says "I reviewed it and it was fine" has described a review that could not have
failed.**

## The habit

**Do this before you say it is finished**, not after somebody asks. It takes thirty minutes and it
is the difference between a project you believe works and one you have checked.`,
    mcqs: [
      mcq('Reviewing your own code an hour after writing it finds almost nothing because the code:',
        [['Triggers the memory of the decision', true],
         ['Is still fresh enough to seem correct', false],
         ['Has not yet been exercised by any tests', false],
         ['Contains too few lines to review usefully', false]],
        'Reading recalls the intent rather than examining the implementation, so the gap between the two remains invisible.'),
      mcq('"I reviewed it and it was fine" describes a review that:',
        [['Could not have failed', true],
         ['Was conducted too quickly to be useful', false],
         ['Covered only the most recent changes', false],
         ['Should have been performed by somebody else', false]],
        'With no findings and no account of what was examined, there is nothing distinguishing a thorough review from no review at all.'),
    ],
    checkpoint: [
      mcq('Expecting to find the authorization check on the last endpoint is what makes you look rather than:',
        [['Concluding after two minutes that it is fine', true],
         ['Reviewing the endpoints in a random order', false],
         ['Asking somebody else to verify the checks', false],
         ['Writing a test for each endpoint instead', false]],
        'A review conducted expecting nothing finds nothing, so knowing where the fault usually lives directs attention rather than diffusing it.'),
      mcq('The list of what you found in your own review is strong in a project interview because it demonstrates the review was:',
        [['Capable of finding something', true],
         ['Performed before the deadline arrived', false],
         ['More thorough than a peer review would be', false],
         ['Conducted using an established checklist', false]],
        'Findings are evidence the process had teeth, whereas a clean self-review is equally consistent with not having looked.'),
    ],
  },
  {
    unitCode: 'T4_PROD_REVIEW_PRACTICE',
    notes: `**The technical presentation.** Ten minutes on your own system, to people who will ask
why rather than whether.

## The structure

**The problem, and whose it was.** Thirty seconds. Not the stack.

**A demonstration.** Show it working, briefly. **Before any architecture**, because the audience
cannot evaluate a design for a thing they have not seen.

**One path end to end.** A single user action through every layer and back. This demonstrates the
seams more convincingly than describing each layer separately.

**Two decisions.** What you chose, what you rejected, why. **This is the part the audience is
actually assessing.**

**What you would change.** Never nothing.

**Then questions**, which is where most of the value is.

## The mistakes that are easy to avoid

**Opening with the architecture diagram.** Nobody knows what it is for yet.

**A tour of every feature.** Ten minutes becomes a list and the audience stops attending.

**Apologising for it.** "It is quite simple" and "I ran out of time" invite a lower reading than
the work deserves, and both are said constantly.

**Reading from slides.** If it is written down and you are reading it, they can read it faster
than you can say it.

## Taking questions

**A question you cannot answer has three honest responses**: you do not know; you did not consider
it; you considered it and chose otherwise. **All three are fine. Bluffing is not**, and it is
visible.

## The rehearsal

**Out loud, to a person, once.** Silent reading does not expose where the account runs out — and it
always runs out somewhere, usually at a decision you made without noticing you were making one.`,
    mcqs: [
      mcq('The demonstration comes before any architecture because the audience cannot:',
        [['Evaluate a design for a thing they have not seen', true],
         ['Follow a diagram without an introduction first', false],
         ['Assess the quality of the implementation yet', false],
         ['Understand the problem from a description alone', false]],
        'Structure is only meaningful once its purpose is visible, so a design presented first has nothing for the audience to attach it to.'),
      mcq('"It is quite simple" and "I ran out of time" are said constantly and invite:',
        [['A lower reading than the work deserves', true],
         ['Questions about the project’s scope', false],
         ['Sympathy that improves the assessment', false],
         ['A request to see additional features', false]],
        'The audience takes the author’s framing, so pre-emptive apology sets an expectation the work is then measured against.'),
    ],
    checkpoint: [
      mcq('A question you cannot answer has three honest responses: you do not know, you did not consider it, or:',
        [['You considered it and chose otherwise', true],
         ['You will investigate and follow up later', false],
         ['The answer depends on the deployment context', false],
         ['It falls outside the scope of the project', false]],
        'The third distinguishes an unexamined gap from a deliberate decision, which is a materially different answer about the same absence.'),
      mcq('Rehearsing out loud to a person exposes where the account runs out, which is usually at:',
        [['A decision you made without noticing', true],
         ['The most technically complex component', false],
         ['The point where the demonstration begins', false],
         ['The transition between two of the layers', false]],
        'Unconscious decisions have no articulated reasoning, so they are exactly the points where speaking the account reveals a gap.'),
    ],
  },
  {
    unitCode: 'T4_PROD_REVIEW_INTERVIEW_QUESTION',
    notes: `**"Walk me through your project."** The single most predictable question in a
placement interview, and the one most frequently answered badly.

## Why it goes wrong

**Because candidates describe what it does rather than what they decided.** A feature list is a
description of a product; the interviewer is assessing an engineer.

## The structure that works, in ninety seconds

**The problem and whose it was.** Two sentences.

**What it does**, in three or four capabilities. Not twelve.

**How it is built**, briefly. Components and the main flow.

**One decision, with its alternative.** This is what the rest exists to support.

**Then stop and let them steer.** They will ask about the part they care about, which is almost
never the part you most want to discuss.

## What they are establishing

**Whether you built it.** Detail about a specific bug, a rejected alternative, something harder
than expected. None of it is available to somebody who assembled from a guide.

**Whether you understand it now.** Building and understanding are different, and two follow-ups
separate them.

**Whether you can explain to somebody who was not there.** Which is most of the job, and is scored
even when nobody says so.

## The follow-ups to have ready

**"Why that technology?"** An actual reason. "It is what the tutorial used" is honest and costly;
"I evaluated X and chose Y because Z" is the answer.

**"What was the hardest part?"** A specific difficulty with an investigation attached.

**"What would you change?"** Never nothing.

**"How would you scale it?"** Not a design exercise. They want to know which part breaks first.

## What loses marks

**Ten minutes of features before any decision.** The interviewer has stopped listening by minute
three, and nothing said afterwards recovers it.`,
    mcqs: [
      mcq('Candidates answer this badly because they describe what the project does rather than:',
        [['What they decided', true],
         ['How long it took to build', false],
         ['Which technologies were involved', false],
         ['What they learned from building it', false]],
        'A feature list describes a product, whereas the interview is assessing an engineer, and decisions are the evidence of engineering.'),
      mcq('"It is what the tutorial used" is described as honest and costly, where the answer that works is:',
        [['"I evaluated X and chose Y because Z"', true],
         ['"It was the most popular option available"', false],
         ['"The team I was working with preferred it"', false],
         ['"It had the best documentation at the time"', false]],
        'A comparison with a stated reason demonstrates a decision, where following a tutorial demonstrates that no decision occurred.'),
    ],
    checkpoint: [
      mcq('Ten minutes of features before any decision fails because the interviewer has stopped listening by minute three and:',
        [['Nothing said afterwards recovers it', true],
         ['The remaining time is used for questions', false],
         ['The features are recorded in the notes anyway', false],
         ['A second opportunity is rarely offered', false]],
        'Attention lost early is not regained, so the decisions that would have demonstrated capability arrive after the assessment is effectively formed.'),
      mcq('"How would you scale it?" is not a design exercise; they want to know:',
        [['Which part breaks first', true],
         ['Whether you have used cloud infrastructure', false],
         ['How much traffic the system can handle', false],
         ['Whether the architecture supports growth', false]],
        'Nobody expects a placement candidate to have built for scale, so the question tests whether the system’s limits are understood.'),
    ],
  },
  {
    unitCode: 'T4_PROD_REVIEW_CHECKPOINT',
    notes: `**Whether there is now a system that exists, runs, and can be explained.**

## The three, and why all three

**Exists.** Built, scoped, finished — a bounded thing rather than an abandoned larger one.

**Runs.** Deployed, reachable, observable. Not on your laptop.

**Can be explained.** Decisions recorded, a path traceable end to end, and a ninety-second account
that leads with what you decided.

**A project missing any one of the three is worth very little**, and students consistently
over-invest in the first and under-invest in the third.

## The bar

**Four things a reviewer can check in five minutes:**

**A URL that works.** **A README that gets them running from a fresh clone.** **A test that fails
when its code is removed.** **Another user's identifier returning nothing.**

**Plus the decision records and the failure table**, which are what the project interview is built
on.

## If this does not pass

**The commonest gap is deployment**, and it is usually not difficulty — it is that the system was
scoped too large to finish, so there was never a moment where deploying it made sense.

**The second commonest is the explanation.** Everything works and no decision was recorded, so
month-five recall is a reconstruction. **That is a day of writing**, and doing it now is
considerably easier than doing it under interview conditions.

## What this feeds

**P19's project interview**, which asks for architecture, the hardest bug, trade-offs, security
and testing — every one of them a decision made here.

**The portfolio**, where this is the centrepiece.

**And the capstone in P24**, which is this again with everything you have learned since.`,
    checkpoint: [
      mcq('Students consistently over-invest in the first of the three and under-invest in:',
        [['The third, which is being able to explain it', true],
         ['The second, which is deploying and observing it', false],
         ['The tests, which demonstrate that it works', false],
         ['The documentation, which reviewers read first', false]],
        'Building feels like the work, while recording decisions and rehearsing the account are deferred until an interview forces them.'),
      mcq('The commonest reason this checkpoint is not passed is deployment, and it is usually not difficulty but that the system was:',
        [['Scoped too large to finish', true],
         ['Built with tools that resist deployment', false],
         ['Dependent on services with a cost attached', false],
         ['Started too late in the available time', false]],
        'Without a finished increment there is never a point at which deploying makes sense, so it is deferred until there is no time left.'),
      mcq('The four things a reviewer can check in five minutes are a working URL, a README that runs from a fresh clone, a test that fails when its code is removed, and:',
        [['Another user’s identifier returning nothing', true],
         ['A decision record for the architecture', false],
         ['Commit history showing incremental work', false],
         ['A diagram of the system components', false]],
        'It is the fastest check on authorization, which is the property most likely to be nominally present and actually absent.'),
      mcq('Recording decisions now rather than reconstructing them in month five is described as considerably easier than doing it:',
        [['Under interview conditions', true],
         ['After the system has been changed', false],
         ['Without access to the original code', false],
         ['When the reasoning has been forgotten', false]],
        'The project interview demands the reasoning in real time, so producing it then is harder than writing three sentences while the decision is fresh.'),
    ],
  },
];
