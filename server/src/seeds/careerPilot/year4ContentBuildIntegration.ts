/**
 * T4_BUILD_INTEGRATION and T4_DIRECTION_ASSESSMENT — nine units. Days 20 and 21.
 *
 * This completes P03 and P04, and with them the first three weeks of Year 4: the diagnostic, the
 * bridge, the engineering build and the day the direction is settled.
 *
 * ── DAY 20 IS THE ONLY DAY THAT CARRIES EVERYTHING AT ONCE ────────────────────────────────
 *
 * Nine days of the engineering build each took one subject to interview depth. This one asks for
 * all of them in a single piece of work — code, Git, a database, an API, tests and a security
 * control — and it is the day that decides whether the build worked.
 *
 * Somebody can pass all nine topic checkpoints and fail this, and that is not a contradiction.
 * The topics were assessed in isolation; nearly all real difficulty is at the seams, and the
 * seams have not been assessed until something has to hold several of them at once.
 *
 * ── DAY 21 DECIDES MORE THAN IT LOOKS LIKE IT DOES ────────────────────────────────────────
 *
 * The specialization month, the specialization mock interview and most of what the portfolio will
 * contain all follow from this one choice. So it gets a whole day, it reaches every student
 * including the one who decided in second year, and its checkpoint requires the reason to be
 * written down — because a choice whose reason is not recorded cannot be revisited, only regretted.
 *
 * It is authored UNIVERSAL rather than EXPLORATION deliberately; the reasoning is in
 * year4StageMap beside the topic. In short: exploration is scored down for a student who has
 * already selected a direction, and this day is needed by the committed student as much as by the
 * undecided one.
 *
 * Attribution: T4_BUILD_INTEGRATION defaults to PRODUCTION_ENGINEERING; T4_DIRECTION_ASSESSMENT
 * to TECH_CAREER_AWARENESS with its checkpoint on PLACEMENT_READINESS, because committing to a
 * direction on evidence is placement work rather than career awareness.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BUILD_INTEGRATION_BUNDLES: PilotBundle[] = [
  /* ══ T4_BUILD_INTEGRATION ═══════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BUILD_INTEGRATION_PLANNING_THE_BUILD',
    notes: `**Sequencing work so that a mistake in one layer does not mean rebuilding the other
five.**

## Verifiable order, not execution order

The order things happen in the finished system is not the order to build them in. **The order to
build in is the one where each step can be checked before anything depends on it.**

Schema, and look at the rows. Then a query, and look at the result. Then an endpoint, and call it
by hand. Then the client. Then the tests around what you now know works.

**A mistake in the schema found at the client costs every step in between.**

## Decide the contracts early and write them down

**What shape does the endpoint return?** Agree it with yourself before building either side,
because the seam is where this will go wrong and an unwritten contract is two different
assumptions.

**Three lines in a comment is enough.** The point is that it exists somewhere other than in your
head, where it can be compared against what each side actually does.

## Name the part you do not know how to do

**Every build has one.** Identify it during planning and meet it deliberately, with everything
else working around it — rather than at the end, at the same time as three other unfinished
things.

## Commit after each step that works

**The branch is free.** A working state you can return to is the difference between an experiment
and a gamble, and the temptation to leave committing until the end is strongest exactly when the
work is going badly.

## Scope it down before you start

**The requirement is that all six things are genuinely present**, not that any of them is large.
One table, one endpoint, one test, one control. **A build that is too ambitious to finish
demonstrates nothing**, and the commonest failure on this day is scope rather than skill.`,
    mcqs: [
      mcq('The order to build in is the one where each step can be:',
        [['Checked before anything depends on it', true],
         ['Completed without reference to the other steps', false],
         ['Executed in the same order as the finished system', false],
         ['Assigned to a different person working in parallel', false]],
        'Verification order localises mistakes. A schema error discovered at the client has to be traced back through every layer built on top of it.'),
      mcq('Writing the endpoint’s response shape down before building either side matters because an unwritten contract is:',
        [['Two different assumptions', true],
         ['Harder to change once code exists on both sides', false],
         ['Impossible for a reviewer to check against the code', false],
         ['Not enforceable without a schema validation library', false]],
        'Each side invents a shape independently and both believe they agree. The seam is where this surfaces, which is the most expensive place to find it.'),
      mcq('The commonest failure on the integration day is:',
        [['Scope, rather than skill', true],
         ['The database layer, which is the most complex one', false],
         ['Testing, which students leave until the very end', false],
         ['Git, which becomes difficult across many changes', false]],
        'The requirement is that all six things are present, not that any is large. A build too ambitious to finish demonstrates none of them.'),
    ],
    checkpoint: [
      mcq('Identifying the unfamiliar part during planning means you meet it:',
        [['With everything else already working', true],
         ['Earlier, leaving more time to research it fully', false],
         ['With help available from somebody more experienced', false],
         ['After the familiar parts, which builds confidence', false]],
        'Meeting the unknown last means debugging it while three other things are also unproven. Isolating it is what makes it tractable at all.'),
      mcq('Leaving all commits until the end is most tempting exactly when:',
        [['The work is going badly', true],
         ['The change spans several different files', false],
         ['The branch has not yet been pushed anywhere', false],
         ['The tests have not been written for it yet', false]],
        'When nothing works there feels like nothing worth committing, which is precisely when a recoverable working state is most valuable.'),
    ],
  },
  {
    unitCode: 'T4_BUILD_INTEGRATION_BUILDING_IT',
    notes: `**Code, Git, a database, an API, tests and a security control, in one piece of work.**

## The brief

**Small, and complete.** One table with a sensible schema and an index you can justify. One or two
endpoints with validation at the boundary and authorization scoped to the caller. A test that
fails without the code. A branch with commits that say why. One security control you can name.

**Six things, each present and each real.** The size is not the point; the six having to agree
with each other is.

## Build it in the order you planned

**Schema, query, endpoint, client, tests.** Checking at each step. Committing at each step that
works.

## The seams to watch

**The database returning a type the code did not expect.** A text column holding what should be a
number, a date arriving as a string.

**The endpoint returning a field the client reads under a different name.**

**The test setting up data the endpoint never sees** — a different database, or a transaction
rolled back at the end.

**All three are the seam**, and all three are invisible in either half read alone.

## What finishing means

**A fresh clone runs it.** **The test fails if you remove the code it covers.** **Another user's
identifier does not return your data.**

Those three are checkable in about a minute and they are the whole standard. Anything less and the
engineering build has not been demonstrated, whatever the individual days reported.

## Why this is assessed as a project rather than a quiz

**Because none of the six can be assessed in isolation here** — that already happened, one topic
at a time. What is being assessed is whether they hold together, and nothing except building
something answers that.`,
    assignment: {
      title: 'The engineering build',
      description: 'One small piece of work carrying code, Git, a database, an API, tests and a security control, with all six genuinely present.',
      instructions: `Build one small, complete thing that carries all six of the following. The
size is not the point; the six having to agree with each other is.

**A database table** with a sensible schema and one index you can justify.
**One or two endpoints** with validation at the boundary and authorization scoped to the caller.
**A test** that fails when the code it covers is removed.
**A branch** whose commits say why rather than what.
**One security control** you can name and explain.
**Something that runs**, from a fresh clone.

Build it in verifiable order — schema, query, endpoint, client, tests — checking at each step and
committing at each step that works.

**Submit:** the branch, a README that gets a stranger from a fresh clone to a running copy, and
three or four sentences on the seam that gave you the most trouble and what the cause turned out
to be.

You are finished when a fresh clone runs it, the test fails if you remove the code it covers, and
another user's identifier does not return your data. Those three are checkable in a minute and
they are the whole standard.`,
      rubric: [
        { criterion: 'All six genuinely present', description: 'Schema, endpoint, test, branch history, security control and a runnable state are each real rather than nominal.', maxPoints: 25 },
        { criterion: 'The three finishing checks pass', description: 'A fresh clone runs it, the test is sensitive to its code, and another user’s identifier returns nothing.', maxPoints: 30 },
        { criterion: 'Built in verifiable order', description: 'The commit history shows the layers arriving in an order where each could be checked before the next depended on it.', maxPoints: 20 },
        { criterion: 'An account of the seam', description: 'A specific description of where two layers disagreed and what the cause was, rather than a description of the feature.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The three finishing checks are a fresh clone running it, the test failing without its code, and:',
        [['Another user’s identifier returning nothing', true],
         ['The index being used by the query planner', false],
         ['Every endpoint having its own separate test', false],
         ['The branch being merged without any conflicts', false]],
        'Those three cover reproducibility, test sensitivity and authorization — the properties most likely to be nominally present and actually absent.'),
      mcq('This day is assessed as a project rather than a quiz because the six things were already assessed:',
        [['One topic at a time, in isolation', true],
         ['By the diagnostic on the first day of the year', false],
         ['Through the checkpoints attached to each topic', false],
         ['In the bridge, at a shallower level of depth', false]],
        'What has never been assessed is whether they hold together, and only building something answers that question.'),
    ],
  },
  {
    unitCode: 'T4_BUILD_INTEGRATION_HARDENING_IT',
    notes: `**Going back over your own work looking for what you skipped.**

## Why your own code is hard to review

**You read what you intended, not what you wrote.** The code triggers the memory of the decision
rather than being read fresh, which is why reviewing your own work an hour after writing it finds
almost nothing.

**Two things help.** Wait, if you can — even a day changes what you see. And **review against a
list rather than by reading**, because a list asks questions your memory does not.

## The list

**Validation.** Is there exactly one place per endpoint, before any logic? What happens on a
missing field, a wrong type, a negative number?

**Authorization.** Is every load scoped to the caller? Test each endpoint with another user's
identifier — including the one you added last.

**The index.** Can you justify it, and did you check what it cost writes?

**Errors.** One shape everywhere? Does a 500 ever happen for bad input?

**The test.** Does it fail without the code? Have you actually checked, or do you believe it?

**Secrets.** Anything in the repository, the logs, or an error message?

## The finding you should expect

**The authorization check on the endpoint you added last.** Almost everybody has one. The main
flow got the attention; the detail view or the export added at the end did not.

**Expecting it is what makes you look for it**, rather than concluding after two minutes that
everything is fine.

## What to do with what you find

**Fix it, and then ask what would have prevented it.** A helper, a base handler, a scoped query
function. **A fix that relies on remembering next time has a short half-life.**`,
    mcqs: [
      mcq('Reviewing your own code an hour after writing it finds almost nothing because you read:',
        [['What you intended, not what you wrote', true],
         ['Too quickly, having seen the code recently', false],
         ['Only the parts that you were uncertain about', false],
         ['It in the same order that you wrote it in', false]],
        'The code triggers the memory of the decision rather than being read fresh, so the gap between intent and implementation stays invisible.'),
      mcq('Reviewing against a list rather than by reading helps because a list:',
        [['Asks questions your memory does not', true],
         ['Covers the code more completely than reading', false],
         ['Takes less time than a careful read would take', false],
         ['Can be shared with a reviewer for comparison', false]],
        'Memory supplies the intent, which is what obscures the fault. An external question forces an answer about what the code actually does.'),
      mcq('The finding to expect on your own integration build is a missing authorization check on:',
        [['The endpoint you added last', true],
         ['The endpoint that handles authentication itself', false],
         ['Whichever endpoint accepts the largest body', false],
         ['The endpoint with the most complex query behind it', false]],
        'The main flow got the attention and the check. What was added at the end, in a hurry, is where the omission almost always lives.'),
    ],
    checkpoint: [
      mcq('Expecting to find a missing check matters because it changes you from concluding everything is fine into:',
        [['Actually looking for it', true],
         ['Reviewing the code more slowly and carefully', false],
         ['Asking somebody else to review it instead', false],
         ['Adding more tests to the endpoints you wrote', false]],
        'A review conducted expecting to find nothing finds nothing. Knowing where the fault usually is directs attention rather than diffusing it.'),
      mcq('A fix that relies on remembering next time has a short half-life, so the follow-up question is what would have:',
        [['Prevented it being written at all', true],
         ['Detected it during the code review stage', false],
         ['Limited the damage if it had been exploited', false],
         ['Made it easier to find during the audit pass', false]],
        'Discipline decays as deadlines approach and teams change. A helper or a scoped default makes the safe version the one that gets written.'),
    ],
  },
  {
    unitCode: 'T4_BUILD_INTEGRATION_REVIEWING_IT',
    notes: `**Explaining your own build to somebody who will ask why, not whether.**

## The three questions that are always asked

**"Why is it structured this way?"** They are not challenging it. They are finding out whether
there was a decision, and "that is how the tutorial did it" is a real answer with a real cost.

**"What was the hardest part?"** The answer that works is a specific difficulty with an
investigation attached. The answer that does not is a description of the feature.

**"What would you change?"** Never "nothing". Every build has compromises and naming one is the
strongest part of the answer.

## Walking through it

**Start with the problem, not the code.** Thirty seconds on what it does and for whom. Somebody
who opens with a file tour has lost the listener before the second file.

**Then one path end to end.** A single request, through each layer, and back. That demonstrates
the seams more convincingly than describing each layer separately.

**Then let them steer.** They will ask about the part they care about, which is almost never the
part you most want to talk about.

## What the listener is actually assessing

**Whether you built it.** Detail about a specific bug, a rejected alternative, a thing that was
harder than expected. All three are unavailable to somebody who assembled it from a guide.

**Whether you understand it now.** Building it and understanding it are not the same, and a
follow-up question separates them within about two exchanges.

## The rehearsal that matters

**Out loud, to a person, once.** Reading it through silently does not find the places where the
account runs out — and it always runs out somewhere, usually a decision you made without noticing
you were making one.`,
    mcqs: [
      mcq('Walking through one request end to end demonstrates the seams better than describing each layer separately because it shows the layers:',
        [['Having to agree with each other', true],
         ['In the order they were actually built in', false],
         ['At a level of detail the listener can follow', false],
         ['Without requiring the code to be shown at all', false]],
        'Describing layers individually reports each one’s internals. Following a single request is what exposes whether their assumptions match.'),
      mcq('"That is how the tutorial did it" is described as a real answer with a real cost because it:',
        [['Is honest, and reveals there was no decision', true],
         ['Suggests the candidate did not write the code', false],
         ['Will be followed by a question about the tutorial', false],
         ['Indicates the structure is probably conventional', false]],
        'Honesty is worth more than invention. What it establishes is that the structure was inherited rather than chosen, which is what was being asked.'),
      mcq('Rehearsing out loud to a person finds what reading silently does not, namely:',
        [['Where the account runs out', true],
         ['Which parts take longer than expected to say', false],
         ['Whether the technical terms are used correctly', false],
         ['How the listener will react to the explanation', false]],
        'Silent reading supplies the missing reasoning from memory. Speaking it forces every step to be articulated, and the gaps become audible.'),
    ],
    checkpoint: [
      mcq('A follow-up question separates having built something from understanding it within about:',
        [['Two exchanges', true],
         ['Ten minutes of detailed technical discussion', false],
         ['One question, if it is chosen carefully enough', false],
         ['The length of a full project interview round', false]],
        'The first answer can be recalled. The follow-up requires reasoning from the same material, which is where an assembled understanding stops.'),
      mcq('Opening a walkthrough with a file tour rather than the problem loses the listener because they do not yet:',
        [['Know what any of it is for', true],
         ['Understand the technologies being described', false],
         ['Have the code open in front of them to follow', false],
         ['Know how much time the explanation will take', false]],
        'Structure is only meaningful once the purpose is known. Without it, each file is a fact the listener has nowhere to attach.'),
    ],
  },
  {
    unitCode: 'T4_BUILD_INTEGRATION_CHECKPOINT',
    notes: `**Whether the Year-4 engineering standard is now in place.**

## What this measures

**Not the nine topics** — each had its own checkpoint. Whether they hold together, which is a
separate property and the one every later module assumes.

## The bar

**A small system exists** that carries a schema, an endpoint, validation, authorization, a test
and a security control.

**A fresh clone runs it.** **The test is sensitive to its code.** **Another user's identifier
returns nothing.**

**And you can account for it** — the structure, the hardest part, and one thing you would change.

## If the build did not come together

**The gap is usually specific rather than general.** Somebody who passed every topic and could
not finish the build has the pieces and not the seams, and that is one targeted piece of work
rather than a repeat of three weeks.

**Scope is the other common cause**, and it is not an engineering failure at all. A build that was
too ambitious to finish says something about estimating rather than about capability, which is
worth knowing separately.

## What opens next

**The specialization month**, which assumes all of this and teaches none of it. A student still
fighting the seams will spend that month fighting them instead of learning their direction.

**And the placement practice has been running alongside since the first week**, which is worth
saying again here: it did not wait for the engineering build, and it will not wait for the
specialization either.`,
    checkpoint: [
      mcq('A student passed all nine engineering topics and could not complete the integration build. The reading is that they have:',
        [['The pieces and not the seams', true],
         ['Been lucky across the nine topic checkpoints', false],
         ['A gap that requires repeating the whole build', false],
         ['Been assessed at the wrong level by the topics', false]],
        'Topics were assessed in isolation, which cannot reach the seams. It is one targeted piece of work rather than three weeks repeated.'),
      mcq('A build that was too ambitious to finish indicates something about:',
        [['Estimating, rather than engineering capability', true],
         ['Engineering, since the work was not completed', false],
         ['Motivation, since the scope was chosen freely', false],
         ['The brief, which failed to constrain the scope', false]],
        'The requirement was that six things be present, not that any be large. Choosing too much is a scoping judgement and worth knowing about separately.'),
      mcq('The specialization month assumes the engineering standard and teaches none of it, so a student still fighting the seams will:',
        [['Spend that month fighting them instead', true],
         ['Be given additional time to close the gap first', false],
         ['Find the specialization easier, being more practical', false],
         ['Have the seams taught again within their direction', false]],
        'Each later module builds on the standard rather than revisiting it. Unresolved seams consume the capacity meant for the direction.'),
      mcq('The placement practice at this point has been running:',
        [['Alongside since the first week', true],
         ['Only since the engineering build began', false],
         ['Not yet, and starts after the specialization', false],
         ['In place of the bridge for students who skipped it', false]],
        'The spec requires it to be continuous, so it interleaves from early on rather than waiting for the teaching track to reach a stopping point.'),
    ],
  },

  /* ══ T4_DIRECTION_ASSESSMENT ════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DIRECTION_ASSESSMENT_WHAT_EACH_DIRECTION_DOES',
    notes: `**What somebody in each direction actually spends their week doing** — which is a
different question from what the job is called.

## Software engineering

**Making a system that several people work on stay changeable.** Reading code you did not write,
restructuring, reviewing, and arguing about where a boundary goes. Much of the week is reading.

## Backend

**APIs, data and the things that only go wrong under load.** Schema decisions, query performance,
authentication, and the failure modes of other people's services.

## Frontend

**State, performance and the users other people forget.** Not visual design — the hard parts are
where a piece of state lives, why a screen feels slow, and what a keyboard-only user experiences.

## Full stack

**Both halves and the seam.** Genuinely more work rather than a compromise between two roles, and
the seam is where the time goes.

## Data

**Answering questions from data somebody is waiting on.** SQL, cleaning, statistics, and a great
deal of being careful about what the data cannot say.

## AI/ML

**The workflow and the evaluation**, far more than the algorithms. Most applied work is data
preparation, honest measurement, and building on models somebody else trained.

## Cloud/DevOps

**Making other people's code run reliably somewhere.** Pipelines, containers, monitoring, and
being the person called when it stops.

## Cybersecurity

**Finding it before somebody else does.** Reviewing, modelling, testing, and writing findings
other developers can act on.

## The thing worth noticing

**Several of these are mostly reading and mostly talking.** Students choose directions imagining
a week of writing new code, and in several of them that is a minority of the time.`,
    mcqs: [
      mcq('In several of these directions, writing new code is:',
        [['A minority of the week', true],
         ['The majority, with reading taking the rest', false],
         ['Roughly half the time in all of the directions', false],
         ['The whole week, apart from meetings and reviews', false]],
        'Software engineering, security and data spend much of the week reading, reviewing and explaining. Students choose imagining otherwise.'),
      mcq('The hard parts of frontend work are described as state, performance and accessibility rather than:',
        [['Visual design, which is a different discipline', true],
         ['JavaScript, which is assumed at this level', false],
         ['Browser compatibility, which tooling now handles', false],
         ['Framework knowledge, which changes too frequently', false]],
        'Deciding where state lives and why a screen feels slow are the engineering problems. Visual design is a distinct skill with distinct training.'),
      mcq('Most applied AI/ML work is described as data preparation, honest measurement and building on existing models rather than:',
        [['Designing algorithms', true],
         ['Writing production code for the model to run in', false],
         ['Communicating results to non-technical audiences', false],
         ['Choosing between competing modelling libraries', false]],
        'Novel algorithm work is research. Applied practice is dominated by getting data into shape and establishing that a number means what it claims.'),
    ],
    checkpoint: [
      mcq('Full stack is described as genuinely more work rather than a compromise between two roles because the:',
        [['Seam is where the time actually goes', true],
         ['Two halves each require their own deep expertise', false],
         ['Role is expected to cover deployment as well', false],
         ['Work is split evenly between the two of them', false]],
        'Both halves are the visible cost and the seam between them is the hidden one, which is where most of the difficulty concentrates.'),
      mcq('Cloud/DevOps is characterised as making other people’s code run reliably and being:',
        [['The person called when it stops', true],
         ['Responsible for choosing the cloud provider', false],
         ['The team that reviews every deployment request', false],
         ['Separated from the developers who wrote the code', false]],
        'Operational responsibility is the defining feature of the role and the part students most often do not picture when choosing it.'),
    ],
  },
  {
    unitCode: 'T4_DIRECTION_ASSESSMENT_WHICH_ONES_YOUR_EVIDENCE_SUPPORTS',
    notes: `**Ranking the directions by what your own evidence supports**, which is frequently not
the order you would have guessed.

## The exercise

**Take your skill profile and each direction's requirements side by side.** For each direction,
sort its skills into three buckets: **evidence, exposure, neither.**

**Then rank the directions by how much is in the first bucket**, and look at the result before
reacting to it.

## What tends to surprise people

**A direction you have not thought about ranks high**, because three years of coursework happened
to cover it. That is real evidence and it is worth taking seriously.

**A direction you are certain about ranks lower than expected**, usually because the interest is
genuine and the evidence is in one project rather than across several.

## Interest and evidence are both real, and they are not the same

**Neither should be ignored.** A direction you have evidence for and no interest in is a year you
will not finish well. A direction you want and have nothing for is a year of building from
nothing, which is possible and is a different plan.

**The useful case is the overlap**, and it usually exists — most students have two or three
directions with reasonable evidence and can pick among those on interest.

## What to do with a genuine mismatch

**Name it honestly, and choose on interest with the cost stated.** "I am choosing AI/ML knowing my
evidence is in backend, so the month is build-from-scratch rather than deepen" is a decision. The
same choice made without noticing is a surprise in week four.

## The output

**A ranked list with the reason for each position.** Not a decision yet — that is the next unit.
This one is the evidence, and separating them is what stops the evidence being written to justify
a decision already made.`,
    mcqs: [
      mcq('A direction you are certain about ranking lower than expected is usually because the evidence is:',
        [['In one project rather than across several', true],
         ['Older than the evidence for other directions', false],
         ['Present but not measured by the diagnostic yet', false],
         ['In skills that the direction does not actually need', false]],
        'Genuine interest often produces one substantial project. Breadth across several pieces of work is what reads as evidence rather than enthusiasm.'),
      mcq('Producing the ranked list before making the decision is recommended so that the evidence is not:',
        [['Written to justify a decision already made', true],
         ['Influenced by which direction is most popular', false],
         ['Affected by the difficulty of each direction', false],
         ['Based on skills measured at different times', false]],
        'Deciding first makes the ranking an argument rather than an observation. Separating them keeps the evidence usable even when it is unwelcome.'),
      mcq('"I am choosing AI/ML knowing my evidence is in backend" is a decision rather than a mistake because the cost is:',
        [['Stated, so the month is planned accordingly', true],
         ['Lower than it appears once the work begins', false],
         ['Offset by the interest the student has in it', false],
         ['Shared with whoever approved the direction', false]],
        'The same choice made without noticing becomes a surprise in week four. Naming it means the specialization month is planned as build-from-scratch.'),
    ],
    checkpoint: [
      mcq('A direction you had not considered ranking high on evidence should be:',
        [['Taken seriously, since the evidence is real', true],
         ['Discounted, because interest matters more here', false],
         ['Re-checked, as the ranking is probably in error', false],
         ['Noted but not acted on without more evidence', false]],
        'Three years of coursework covers ground deliberately and incidentally. Evidence acquired without intending it is still evidence.'),
      mcq('The useful case in practice is the overlap between interest and evidence, which usually exists because most students have:',
        [['Two or three directions with reasonable evidence', true],
         ['Interests that align with their strongest subjects', false],
         ['Been taught every direction to a similar standard', false],
         ['Evidence spread evenly across all the directions', false]],
        'The ranking rarely produces one clear answer. Several plausible directions means interest can decide among options that are all supportable.'),
    ],
  },
  {
    unitCode: 'T4_DIRECTION_ASSESSMENT_WHAT_COMMITTING_COSTS',
    notes: `**What this choice decides for the next thirty days, and what it leaves open.**

## What it decides

**The specialization month.** Sixteen units in one direction, and not the other eight.

**The specialization mock interview.** Mock 5 is on your direction, at the depth somebody hiring
for it would probe.

**A large part of the portfolio.** The advanced challenge and the specialization project are
direction work, and they are what a reviewer will spend their ninety seconds on.

**Which roles the applications module treats as primary.** Not exclusively, but the tailoring
follows the direction.

## What it does not decide

**Your first job.** Graduates are hired across boundaries constantly, and a backend specialisation
does not disqualify you from a full-stack role — depth in one area is read as capability, not as
a restriction.

**Your career.** People change direction at three years and at ten. It is normal and it is not a
setback.

**What you learn.** The engineering build was universal and the placement practice is universal.
The direction shapes one month of a year.

## Why it is still worth taking seriously

**Because thirty days is a real amount of your remaining time**, and changing at day twenty-five
wastes most of it. **The cost is in switching late, not in choosing.**

## The honest version

**Choose the direction where you can produce the most convincing evidence in one month**, and let
the longer-term question stay open, because it is going to anyway. A student agonising over a
ten-year decision is answering a question nobody has asked them.`,
    mcqs: [
      mcq('The direction decides the specialization month, mock 5, much of the portfolio, and:',
        [['Which roles the applications module treats as primary', true],
         ['Whether the engineering build is taught or compressed', false],
         ['How much placement practice appears in the plan', false],
         ['The total number of days in the programme', false]],
        'Tailoring follows the direction without being exclusive. The engineering build and the placement practice are universal and unaffected by it.'),
      mcq('A backend specialisation does not disqualify a graduate from a full-stack role because depth in one area is read as:',
        [['Capability, rather than as a restriction', true],
         ['Evidence of a narrow range of experience', false],
         ['Equivalent to breadth across several areas', false],
         ['A preference that employers will try to accommodate', false]],
        'Demonstrated depth is the scarce signal. Employers infer that somebody who went deep once can do it again in an adjacent area.'),
      mcq('The cost of this decision is described as being in switching late rather than in choosing, because thirty days:',
        [['Is a real portion of the remaining time', true],
         ['Cannot be extended once the month has begun', false],
         ['Is the minimum needed to produce any evidence', false],
         ['Determines which mock interviews are available', false]],
        'Choosing has no cost in itself — one of the directions has to be chosen. Abandoning at day twenty-five loses most of a month that cannot be recovered.'),
    ],
    checkpoint: [
      mcq('A student agonising over a ten-year career decision at day 21 is:',
        [['Answering a question nobody has asked them', true],
         ['Taking the choice with appropriate seriousness', false],
         ['Right to, since the direction shapes their career', false],
         ['Better advised to defer the choice by a few weeks', false]],
        'The choice governs one month and the tailoring of applications. Treating it as a career commitment adds pressure without adding information.'),
      mcq('The practical criterion offered is to choose the direction where you can produce:',
        [['The most convincing evidence in one month', true],
         ['The strongest long-term career prospects available', false],
         ['Work that you would most enjoy doing each day', false],
         ['Evidence that no other candidate is likely to have', false]],
        'One month is the actual budget, and convincing evidence is what the portfolio and the specialization interview need from it.'),
    ],
  },
  {
    unitCode: 'T4_DIRECTION_ASSESSMENT_CHECKPOINT',
    notes: `**One direction, chosen on evidence, with the reason written down.**

## What is recorded

**The direction.** **The evidence that supported it.** **What you gave up** — the direction that
ranked closest, and why you did not take it. **And the cost, if you chose against your
evidence.**

## Why the reason has to be written

**Because a choice whose reason is not recorded cannot be revisited, only regretted.** At day
forty, if the month is going badly, the question is whether the reasoning was wrong or whether
the work is simply hard — and those need opposite responses. Without the reason, they are
indistinguishable.

**It is also the answer to an interview question.** "Why did you choose this specialisation?" is
asked, and a recorded reason from the time is a better answer than one reconstructed afterwards.

## What happens next

**The specialization month opens on your direction and not the others.** Sixteen units: depth and
architecture, building, quality, and the proof at the end.

**The placement practice continues alongside**, as it has since the first week.

## The one thing to be clear about

**This is revisitable, and it gets more expensive to revisit every day.** Changing at day
twenty-three costs two days. Changing at day forty costs most of the month.

**If the reasoning was wrong, say so early.** The plan can recompose; a month cannot be recovered.`,
    checkpoint: [
      mcq('The reason for the direction must be written down because at day forty an unrecorded reason makes it impossible to distinguish:',
        [['Wrong reasoning from work that is simply hard', true],
         ['A poor direction from a poorly taught module', false],
         ['The student’s interest from their actual evidence', false],
         ['Which skills the direction required at the outset', false]],
        'Those two need opposite responses — one changes direction, the other continues. Without the original reasoning both look identical from inside the difficulty.'),
      mcq('A recorded reason from the time is a better interview answer than one reconstructed afterwards because it:',
        [['Was the actual reasoning rather than a rationalisation', true],
         ['Contains more technical detail about the direction', false],
         ['Can be shown to the interviewer as documentation', false],
         ['Demonstrates that the choice was made deliberately', false]],
        'Reconstructed reasoning is shaped by what happened since. The contemporaneous version is what the candidate actually thought and reads as such.'),
      mcq('Changing direction at day twenty-three against day forty differs chiefly in that the later change:',
        [['Costs most of the month rather than two days', true],
         ['Requires approval that the earlier one does not', false],
         ['Is not permitted once the month has begun at all', false],
         ['Affects the mock interview series more severely', false]],
        'The cost is the specialization work already done in the abandoned direction. Early it is nearly free; late it is most of a month that cannot be recovered.'),
      mcq('Recording what you gave up — the direction that ranked closest and why you did not take it — is useful because it is:',
        [['The alternative an interviewer will ask about', true],
         ['Required before the specialization month can open', false],
         ['The direction you would switch to if you changed', false],
         ['Evidence that several directions were considered', false]],
        'Every design or career question probes the rejected alternative, because a choice without one is a default. Having it recorded means the answer exists.'),
    ],
  },
];
