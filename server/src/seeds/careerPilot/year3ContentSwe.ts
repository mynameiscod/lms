/**
 * T3_SWE_DESIGN and T3_SWE_QUALITY — twelve units. Year 3, software engineering track.
 * The remaining four topics of S18B are in year3ContentSweRest.
 *
 * ── DEPTH, NOT REPETITION ─────────────────────────────────────────────────────────────────
 *
 * This is the track that overlaps the universal core most heavily: the core already has
 * architecture, refactoring, code review depth, test design and documentation. A unit here
 * that restates one of those is worse than no unit.
 *
 * What each of these can say that the core could not:
 *
 * READING_A_REQUIREMENT — the core architecture unit starts from a problem somebody has
 * already stated correctly. This one is about the statement being wrong, incomplete, or
 * hiding the one question whose answer changes the whole shape.
 *
 * SKETCHING_A_DESIGN — the core unit describes architectural shapes. This one is the act of
 * producing a document another engineer can build from without asking you anything, which is
 * a different skill from knowing the shapes.
 *
 * SAYING_WHAT_IT_IS_NOT — no core counterpart. Scope named at the start, when it costs a
 * sentence rather than three weeks.
 *
 * TESTS_THIS_DESIGN_NEEDS — the core test design unit chooses the level. This one chooses
 * the tests from how *this particular design* characteristically fails, which is a question
 * the core unit cannot ask because it has no design in front of it.
 *
 * REVIEWING_WELL — partial overlap with the core review unit, which is about what to look
 * for. This one is about the wording, the ordering and keeping the author willing to send
 * you the next one. Said plainly in the unit, with a pointer back.
 *
 * BEING_REVIEWED — no core counterpart. The receiving side, including why silent compliance
 * is its own failure.
 *
 * Attribution: DESIGN is derived. QUALITY defaults to AUTOMATED_TESTING with both review
 * units overridden to CODE_REVIEW.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SWE_BUNDLES: PilotBundle[] = [
  /* ══ T3_SWE_DESIGN ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_DESIGN_READING_A_REQUIREMENT',
    notes: `The core architecture unit started from a problem somebody had already stated
correctly. **In a job, nobody states it correctly.** You get two sentences in a ticket, and
the work is finding out what they mean before you build the wrong thing well.

## What a requirement actually contains

**What is asked**, explicitly. Usually the smallest part.

**What is assumed**, silently. The bulk of it, and the source of most rework.

**What is implied by where it came from.** A ticket from support means something broke. A
ticket from sales means somebody promised something.

**And one question whose answer changes the design.** There is nearly always exactly one, and
finding it is most of the value of reading carefully.

## Finding the assumptions

**Take each noun and ask what it is.** "Let users export their reports." Which users? Every
one, or those with a role? What is a report — a saved thing, or a thing generated on request?
Export to what, and how large can it get?

**Take each verb and ask when.** Immediately, or later? Synchronously, or by email?

**Ask about scale.** Ten reports or ten million. **This one question changes the design more
often than any other**, and it is the one most often skipped because the answer is
uncomfortable.

**Ask about failure.** What happens when it does not work? Who is told?

**And ask who else is affected.** A change to exports is a change to whatever consumes them.

## The question whose answer changes the design

Some questions are details you can decide yourself. **One is usually load-bearing.**

For an export: **can it be slow?** If yes, a request handler. If no, a queue, a job, a
notification and a place to put the file — which is four times the work and a different
shape.

**Find that question and ask it first.** Everything else can wait, and getting it wrong is
the difference between a day and a fortnight.

## Writing it back

**Restate it in your own words and send it back.** Two or three sentences.

**This finds the misunderstanding while it is still free**, and it takes five minutes. It is
the highest-return habit in this unit and the one most engineers skip because it feels like
admitting you did not understand.

**Include your assumptions explicitly.** "I am assuming this is for admin users only, and
that a few thousand rows is the realistic maximum." **An assumption written down gets
corrected; one in your head does not.**

## When you cannot ask

Sometimes there is nobody to ask, or no time.

**Then decide, write down what you decided, and make it easy to change.** A decision recorded
is a decision somebody can overturn cheaply. **A silent guess is discovered in review, or
worse, in production.**`,
    mcqs: [
      mcq('The bulk of a requirement is:',
        [['What is assumed silently, which is where most rework comes from', true],
          ['What is asked explicitly in the text of the ticket itself', false],
          ['What is implied by which team the request came from', false],
          ['What the acceptance criteria state about the behaviour', false]],
        'What is asked explicitly is usually the smallest part.'),
      mcq('The question that changes the design more often than any other is:',
        [['Scale — ten of these, or ten million of these', true],
          ['Who the users are and what roles they hold', false],
          ['What should happen when the operation fails', false],
          ['Whether the output format is fixed or negotiable', false]],
        'It is most often skipped because the answer is uncomfortable.'),
      mcq('Restating the requirement and sending it back:',
        [['Finds the misunderstanding while it is still free, in five minutes', true],
          ['Confirms for the requester that the ticket was received', false],
          ['Produces a record useful in a later disagreement', false],
          ['Is worth doing when the requirement is unusually long', false]],
        'Most engineers skip it because it feels like admitting confusion.'),
      mcq('An assumption written down explicitly:',
        [['Gets corrected, where one held in your head does not', true],
          ['Protects you if the requirement turns out different', false],
          ['Slows the work while you wait for confirmation', false],
          ['Belongs in the design document rather than the reply', false]],
        '"I am assuming admin users only, and a few thousand rows."'),
    ],
    checkpoint: [
      mcq('"Can it be slow?" is load-bearing for an export because:',
        [['No means a queue, a job, a notification and a file store', true],
          ['Yes means the operation can run in the background', false],
          ['It determines which storage backend is appropriate', false],
          ['Slow operations need different error handling entirely', false]],
        'Four times the work and a different shape.'),
      mcq('When there is nobody to ask, you should:',
        [['Decide, write down what you decided, and make it easy to change', true],
          ['Choose the interpretation that requires the least work', false],
          ['Build the most flexible version that covers both readings', false],
          ['Wait until somebody who can answer becomes available', false]],
        'A silent guess is discovered in review, or in production.'),
      mcq('A ticket from support usually implies:',
        [['Something broke, which changes what the work actually is', true],
          ['A user asked for a feature they were missing', false],
          ['The request has already been prioritised by someone', false],
          ['The behaviour is documented somewhere already', false]],
        'Where it came from is part of the requirement.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DESIGN_SKETCHING_A_DESIGN',
    notes: `The core architecture unit described shapes. **This one is the act of producing a
document another engineer can build from without asking you anything** — which is a different
skill from knowing the shapes, and a rarer one.

## Why on paper first

**Changing a box on paper costs nothing.** Changing it after three days of code costs three
days.

**And writing it down finds the holes.** You cannot draw the data flow without noticing that
one component has no way to get what it needs. **Half the value of a design document is the
hour spent writing it**, before anybody reads it.

## What the sketch contains

**The components**, with a one-line responsibility each. If a component needs two lines, it
is two components.

**The data between them.** What actually moves, and in which direction.

**The boundaries.** What is inside this change and what it talks to.

**The storage.** What is persisted, where, and in roughly what shape.

**The failure paths.** What happens when each arrow does not work. **This is the part people
leave out and it is where the design is usually wrong.**

**And the one decision you are least sure about**, named, so the reviewer looks there.

## What it does not contain

**Not every class.** A design that names every method is code written in prose, and it will
be wrong in a day.

**Not the implementation of anything obvious.**

**Not a technology survey.** Name what you will use and why, in a line.

**The test of the right level of detail: another engineer could build it and make different
small decisions than you would, and the result would still be right.** If they could build
something that does not fit, it is too vague. If they could not make any decisions, it is too
detailed.

## Making the decisions visible

**For each significant choice, write the alternative you rejected and why.**

"Queue rather than synchronous, because exports can exceed the request timeout."

**Two lines, and it answers the question every reviewer will ask.** It also means that when
the decision turns out wrong in a year, the next person knows what was considered — which is
exactly what the decision-record unit is about.

## Getting it reviewed

**Send it before you build.** A design review is thirty minutes and a code review of the
wrong design is three days plus an awkward conversation.

**Ask for what you want.** "Is the boundary between these two right?" gets a better review
than "thoughts?".

**And expect to change it.** A design that survives review unchanged usually means nobody
read it properly.

## The size of the thing

**A day of work needs a paragraph.**

**A week needs a page.**

**A month needs a page and a conversation**, because nobody reads more than a page and a
design longer than that has not been thought through enough to compress.`,
    mcqs: [
      mcq('Half the value of a design document is:',
        [['The hour spent writing it, before anybody reads it', true],
          ['The review comments it attracts from the team', false],
          ['The record it leaves for the next engineer', false],
          ['The agreement it establishes before work starts', false]],
        'You cannot draw the data flow without noticing the holes.'),
      mcq('The part people leave out, where the design is usually wrong, is:',
        [['The failure paths — what happens when each arrow does not work', true],
          ['The storage shape and where each thing is persisted', false],
          ['The one-line responsibility of each component', false],
          ['The direction the data moves between components', false]],
        'Draw what happens when each arrow fails.'),
      mcq('The right level of detail is when another engineer could:',
        [['Build it, make different small decisions, and still be right', true],
          ['Build it exactly as you would have built it yourself', false],
          ['Understand the shape without needing to ask questions', false],
          ['Estimate the work to within a reasonable margin', false]],
        'Too vague and they build something that does not fit; too detailed and they decide nothing.'),
      mcq('A design that survives review unchanged usually means:',
        [['Nobody read it properly, rather than that it was right', true],
          ['The design was straightforward enough to be obvious', false],
          ['The reviewers agreed with the approach you chose', false],
          ['The document was at the right level of detail', false]],
        'Expect to change it, and ask for what you want reviewed.'),
    ],
    checkpoint: [
      mcq('A component that needs two lines of responsibility is:',
        [['Two components that have not been separated yet', true],
          ['A component with an unusually broad remit', false],
          ['Acceptable if the two lines are closely related', false],
          ['A sign the design is at too fine a granularity', false]],
        'One line each, or split it.'),
      mcq('A month of work needs:',
        [['A page and a conversation, because nobody reads more than a page', true],
          ['A document proportionate to the size of the work', false],
          ['A full specification covering each component', false],
          ['A page per major component being introduced', false]],
        'A design longer than that has not been compressed enough.'),
      mcq('"Is the boundary between these two right?" is better than "thoughts?" because:',
        [['It gets a better review by telling the reviewer where to look', true],
          ['It shows you have already considered the alternatives', false],
          ['It limits the scope of what will be criticised', false],
          ['It is more likely to receive a prompt reply', false]],
        'Ask for what you want.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DESIGN_SAYING_WHAT_IT_IS_NOT',
    notes: `**Scope named at the start costs a sentence. Scope discovered at the end costs
three weeks.** This unit has no counterpart in the core, and it is the cheapest professional
habit in the whole track.

## Why it has to be written

**Everybody has a different picture.** You are building an export; somebody is imagining
scheduling, somebody else is imagining a format picker, and nobody has said so because each
of them thinks it is obvious.

**Unstated scope is assumed scope.** It is not neutral. **If you do not say a thing is out,
somebody has it in.**

**And it is discovered at the worst moment** — at review, at demo, or after release, when
changing it is most expensive and the conversation is least pleasant.

## How to write it

**A list, in the brief, under a heading that says it.**

> **Out of scope:** scheduled exports, formats other than CSV, exports over 50MB, exports of
> other people's data.

**Each with a reason**, briefly. "Scheduled exports — separate feature, needs a job runner we
do not have."

**And a note on what would change if it came in scope.** "Scheduling would need the queue,
which is a week." **That turns a refusal into an estimate**, which is a much easier
conversation and is how you avoid sounding obstructive.

## What belongs out of scope

**Things somebody might reasonably assume are included.** The whole point.

**Things that are obviously desirable but not now.** Saying "not now" is not saying "never".

**Things that would double the work.** Name them explicitly, because they are the ones that
creep in.

**And the general case, when you are building the specific one.** "This handles CSV. A general
format abstraction is out of scope" — **otherwise somebody will build one, usually you, on a
Thursday.**

## Saying no during the work

**New ideas will arrive mid-build.** Most of them are good.

**Write them down where they can be seen**, and keep going. A visible list is not a refusal;
it is a queue.

**Change scope deliberately or not at all.** "Yes, and that adds two days" is a professional
answer. Silently absorbing it is how an estimate becomes a lie.

## Scope and trust

**Engineers who name scope early are trusted with larger work.** It reads as knowing what you
are doing rather than as being unhelpful.

**And engineers who silently absorb scope are the ones who deliver late**, which is the
outcome everybody remembers — including them, usually as evidence that estimating is
impossible.`,
    mcqs: [
      mcq('Unstated scope is:',
        [['Assumed scope — if you do not say a thing is out, somebody has it in', true],
          ['Neutral until somebody raises it in review', false],
          ['Resolved by the acceptance criteria on the ticket', false],
          ['Understood from the size of the estimate given', false]],
        'Everybody has a different picture and nobody has said so.'),
      mcq('Adding what would change if something came in scope:',
        [['Turns a refusal into an estimate, which is an easier conversation', true],
          ['Documents the decision for a future reviewer', false],
          ['Discourages people from asking for it later', false],
          ['Shows you considered the alternative seriously', false]],
        '"Scheduling would need the queue, which is a week."'),
      mcq('Excluding the general case when building the specific one matters because:',
        [['Otherwise somebody will build one, usually you, on a Thursday', true],
          ['General abstractions are harder to test properly', false],
          ['It keeps the design document shorter and clearer', false],
          ['The general case usually turns out to be unnecessary', false]],
        '"This handles CSV. A general format abstraction is out of scope."'),
      mcq('Silently absorbing new scope during a build:',
        [['Is how an estimate becomes a lie', true],
          ['Is reasonable when the addition is small', false],
          ['Avoids an unnecessary conversation with the requester', false],
          ['Is preferable to refusing a genuinely good idea', false]],
        '"Yes, and that adds two days" is the professional answer.'),
    ],
    checkpoint: [
      mcq('A visible list of mid-build ideas is:',
        [['A queue rather than a refusal, which is why it works', true],
          ['A way of deferring decisions indefinitely', false],
          ['Most useful when reviewed at the end of the work', false],
          ['A substitute for a proper scope discussion', false]],
        'Write them down where they can be seen, and keep going.'),
      mcq('Engineers who name scope early are:',
        [['Trusted with larger work, because it reads as knowing what you are doing', true],
          ['Seen as cautious about taking on new work', false],
          ['More likely to have their estimates challenged', false],
          ['Harder to assign to open-ended problems', false]],
        'Rather than as being unhelpful.'),
      mcq('The things most worth naming as out of scope are:',
        [['Those somebody might reasonably assume are already included', true],
          ['Those that have been explicitly requested and declined', false],
          ['Those that depend on systems you do not control', false],
          ['Those that would require a change to the data model', false]],
        'That is the whole point of writing the list.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DESIGN_DEBUGGING',
    notes: `Designs fail in a small number of recognisable ways. Here is how each one looks
from the inside, while you are still building.

## 1. The estimate keeps growing

**Symptom:** every day the remaining work is the same size as yesterday.

**Cause:** a requirement was misread, usually about scale or about who can do what. **The
design is right for a problem you do not have.**

**What to do:** stop and re-read the requirement. **Do not push through** — the cost of
continuing compounds and the cost of stopping does not.

## 2. Everything touches everything

**Symptom:** a small change requires edits in six files, and you cannot explain to yourself
why.

**Cause:** the responsibilities were never separated, or they were separated on the wrong
axis — **by technical layer when the change axis is by feature**, which is the commonest way
this goes wrong.

**What to do:** name what changes together, and put those things together.

## 3. The design has no failure paths

**Symptom:** it works, and any error produces something inexplicable.

**Cause:** the sketch drew the happy path only.

**What to do:** go arrow by arrow and ask what happens when that one fails. **It takes twenty
minutes and it is the single highest-value review you can do on your own design.**

## 4. Two components need the same thing and neither owns it

**Symptom:** the same logic, slightly different, in two places, and they are already drifting.

**Cause:** a missing component. The thing they both need is a concept that has no home.

**What to do:** name it and give it one. **This is usually the only genuinely new idea in a
design review**, and it is why the review is worth thirty minutes.

## 5. It cannot be tested without the whole system

**Symptom:** to test anything you need the database, the queue and a network call.

**Cause:** the logic is tangled with its dependencies rather than separated from them.

**What to do:** separate the decision from the doing. **A design that is hard to test is
telling you something about the design, not about testing** — and the quality topic makes
that argument at length.

## 6. Nobody can review it

**Symptom:** the design document gets no substantive comments.

**Causes:** it is too long; it has no clear question; it arrived too late to change anything.

**What to do:** one page, one named uncertainty, sent before you start.

## The habits

**Re-read the requirement when the estimate grows.**

**Group by what changes together.**

**Walk every arrow's failure case.**

**Name the concept that has no home.**

**And send one page with one question, early.**`,
    mcqs: [
      mcq('An estimate that stops shrinking usually means:',
        [['The design is right for a problem you do not have', true],
          ['The work was underestimated at the start', false],
          ['Unforeseen technical difficulties have emerged', false],
          ['Scope has been added without being acknowledged', false]],
        'Stop and re-read the requirement rather than pushing through.'),
      mcq('The commonest way responsibilities get separated wrongly is:',
        [['By technical layer, when the axis of change is by feature', true],
          ['By team ownership rather than by responsibility', false],
          ['Too finely, producing components with no real work', false],
          ['By data type rather than by the operations performed', false]],
        'Name what changes together and put those things together.'),
      mcq('Walking every arrow’s failure case is:',
        [['Twenty minutes, and the highest-value review of your own design', true],
          ['Best done by a reviewer with fresh eyes', false],
          ['Worth doing once the happy path is implemented', false],
          ['Only necessary for components that call out externally', false]],
        'The sketch usually drew the happy path only.'),
      mcq('A design that is hard to test:',
        [['Is telling you something about the design, not about testing', true],
          ['Needs better test infrastructure to work around it', false],
          ['Is acceptable when the system is genuinely integrated', false],
          ['Should be tested at a higher level instead', false]],
        'Separate the decision from the doing.'),
    ],
    checkpoint: [
      mcq('The same logic in two places, already drifting, indicates:',
        [['A missing component — a concept that has no home yet', true],
          ['Insufficient code review on the second occurrence', false],
          ['A need to extract a shared helper function', false],
          ['That the two callers have genuinely different needs', false]],
        'Usually the only genuinely new idea in a design review.'),
      mcq('A design document that attracts no substantive comments:',
        [['Is too long, has no clear question, or arrived too late', true],
          ['Has probably been understood and accepted', false],
          ['Should be followed up with a direct request', false],
          ['Indicates the reviewers lacked relevant context', false]],
        'One page, one named uncertainty, sent before you start.'),
      mcq('When the estimate keeps growing, pushing through is wrong because:',
        [['The cost of continuing compounds and the cost of stopping does not', true],
          ['Momentum is harder to regain after an interruption', false],
          ['The remaining work is usually the hardest part', false],
          ['A partial implementation is difficult to review', false]],
        'Stop and re-read the requirement.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DESIGN_PRACTICE',
    notes: `Two exercises on the mechanical parts of design: telling a blocking question from
a detail, and finding the dependency that makes a design untestable.`,
    coding: [
      {
        title: 'Which question blocks',
        description: `Read one open question per line as \`<name> <changes_shape> <can_decide_alone>\`,
each of the last two \`yes\` or \`no\`.

Print one line each:

- changes the shape and you cannot decide alone → \`BLOCKING <name>\`
- changes the shape and you can decide alone → \`DECIDE <name>\`
- does not change the shape and you cannot decide alone → \`ASK_LATER <name>\`
- neither → \`DETAIL <name>\`

Then \`blocking=<n>\`.

**Only the first category stops you starting.** A question that changes the shape but is
yours to answer is a decision to record, not a reason to wait.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Only one of the four categories stops you starting.
`,
        language: 'python',
        tests: [
          { input: 'scale yes no\n', expectedOutput: 'BLOCKING scale\nblocking=1' },
          { input: 'format yes yes\n', expectedOutput: 'DECIDE format\nblocking=0' },
          { input: 'wording no no\n', expectedOutput: 'ASK_LATER wording\nblocking=0' },
          { input: 'naming no yes\n', expectedOutput: 'DETAIL naming\nblocking=0' },
          { input: 'a yes no\nb no yes\nc yes no\n', expectedOutput: 'BLOCKING a\nDETAIL b\nBLOCKING c\nblocking=2', isHidden: true },
        ],
      },
      {
        title: 'What the design cannot test',
        description: `Read one dependency per line as \`<component> <depends_on> <kind>\`,
where kind is \`pure\`, \`io\` or \`component\`.

A component is **unit-testable** when it has no direct \`io\` dependency. Print, for each
component in the order first seen:

    <component> testable
    <component> NEEDS_SEAM <the io dependencies, space separated>

Then \`testable=<n>\`.

A dependency on another **component** does not itself make you untestable, even if that other
component touches IO — **that is what the seam is for**, and treating it otherwise would mark
the whole system untestable.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A component dependency is not an IO dependency, however that component behaves.
`,
        language: 'python',
        tests: [
          { input: 'svc repo component\n', expectedOutput: 'svc testable\ntestable=1' },
          { input: 'repo db io\n', expectedOutput: 'repo NEEDS_SEAM db\ntestable=0' },
          { input: 'svc calc pure\nsvc repo component\n', expectedOutput: 'svc testable\ntestable=1' },
          { input: 'a db io\na cache io\nb a component\n', expectedOutput: 'a NEEDS_SEAM db cache\nb testable\ntestable=1' },
          { input: '', expectedOutput: 'testable=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Software Design Practice',
      description: 'Sort blocking questions from details, find the untestable seams, then design something real.',
      instructions: `Complete both exercises, then:

1. For the first: a question that changes the shape but is yours to decide is not blocking.
   Say what you must do instead of waiting, and where that record goes.
2. For the second: depending on a component that touches IO does not make you untestable.
   Say what has to be true about that dependency for the rule to hold.
3. For the second: give a case where a component with no IO dependency is still hard to unit
   test.

**Then, on a real requirement** — take one from a project you have, or use: *"Let users
export their reports."*

4. List every noun and verb, and the question each raises.
5. Separate them into blocking, decide-yourself, ask-later and detail.
6. **Name the one question whose answer changes the design.** Justify why it is that one.
7. Write the restatement you would send back, with your assumptions explicit. Three
   sentences.
8. Sketch the design on one page: components with one-line responsibilities, the data
   between them, storage, and **the failure path for every arrow.**
9. Name the decision you are least sure about.
10. Write the out-of-scope list, each item with a reason and what it would cost to include.`,
      rubric: [
        { criterion: 'Blocking questions sorted', description: 'All cases, with the decide-alone category handled correctly.', maxPoints: 15 },
        { criterion: 'Seams identified', description: 'All cases, including the component-dependency rule.', maxPoints: 15 },
        { criterion: 'Requirement taken apart', description: 'Nouns and verbs, questions raised, sorted into the four categories.', maxPoints: 20 },
        { criterion: 'The load-bearing question named', description: 'One question, justified as the one that changes the shape.', maxPoints: 15 },
        { criterion: 'A one-page design', description: 'Components, data, storage, and a failure path for every arrow.', maxPoints: 20 },
        { criterion: 'Scope written down', description: 'Each exclusion with a reason and a cost to include.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'scale yes no\n', expectedOutput: 'BLOCKING scale\nblocking=1' },
          { input: 'format yes yes\n', expectedOutput: 'DECIDE format\nblocking=0' },
          { input: 'wording no no\n', expectedOutput: 'ASK_LATER wording\nblocking=0' },
          { input: 'naming no yes\n', expectedOutput: 'DETAIL naming\nblocking=0' },
          { input: 'a yes no\nb no yes\nc yes no\n', expectedOutput: 'BLOCKING a\nDETAIL b\nBLOCKING c\nblocking=2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A shape-changing question you can decide alone requires:',
        [['A recorded decision, not a pause while you wait for somebody', true],
          ['Confirmation from whoever raised the requirement', false],
          ['A note in the ticket for later discussion', false],
          ['The most flexible implementation you can manage', false]],
        'A decision recorded is one somebody can overturn cheaply.'),
      mcq('The component-dependency rule holds as long as:',
        [['That dependency can be substituted at the boundary', true],
          ['That component has been unit-tested itself', false],
          ['The dependency is declared rather than constructed', false],
          ['The two components are owned by the same team', false]],
        'That is what the seam is for.'),
      mcq('A component with no IO dependency can still be hard to unit test when:',
        [['Its logic depends on the current time or on randomness', true],
          ['It has a large number of pure dependencies', false],
          ['It is called from several different components', false],
          ['Its responsibility spans more than one line', false]],
        'Those are dependencies too, just not declared ones.'),
    ],
  },

  {
    unitCode: 'T3_SWE_DESIGN_MINI_PROJECT',
    notes: `Design something properly, get it reviewed, then build it and record where the
design was wrong.

**The measurement is the honesty of the last part.** Every design is wrong somewhere, and an
engineer who can say precisely where and why is worth more than one whose design document
matches the code because they rewrote the document.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Design, Reviewed, Then Built',
      description: 'Take a vague requirement to a one-page design, get it reviewed, build it, and say where it was wrong.',
      instructions: `**Take a vague requirement.** From your own work, or: *"Let users export
their reports."* Something you can build in roughly ninety minutes.

**Part one — read it**

1. Every noun and verb, and the question each raises.
2. Sorted into blocking, decide-yourself, ask-later, detail.
3. **The one question whose answer changes the design**, named and justified.
4. The restatement you would send back, three sentences, assumptions explicit.

**Part two — design it**

5. One page. Components with one-line responsibilities.
6. The data between them, with direction.
7. Storage: what is persisted, where, roughly what shape.
8. **A failure path for every arrow.**
9. Two significant decisions, each with the alternative you rejected and why.
10. The decision you are least sure about, named for the reviewer.
11. The out-of-scope list, with reasons and costs.

**Part three — get it reviewed**

12. Send it to somebody before writing code. A classmate, a colleague, a mentor.
13. **Ask a specific question**, not "thoughts?".
14. Record what they said and what you changed. **If nothing changed, say why you think that
    is** — it usually means it was not read.

**Part four — build it**

15. Build it in about ninety minutes, following the design.
16. **Keep a running note every time reality disagreed with the design.** Do this as it
    happens; you will not remember afterwards.

**Part five — the honest part**

17. Where was the design wrong? Be specific: which component, which assumption.
18. What would you have caught by walking the failure paths more carefully?
19. What did the reviewer catch that you would not have?
20. **What is still wrong that you did not have time to fix?**
21. Would you write the design again for work this size? Answer honestly, with a reason —
    **"no, a paragraph would have done" is a perfectly good answer if you can defend it.**

**Submit** the requirement analysis, the design as sent for review, the review comments, the
code, the running note from step 16, and the honest part.`,
      rubric: [
        { criterion: 'Requirement taken apart', description: 'Questions sorted, the load-bearing one named and justified.', maxPoints: 15 },
        { criterion: 'A one-page design', description: 'Components, data, storage, failure paths, rejected alternatives.', maxPoints: 25 },
        { criterion: 'Reviewed before building', description: 'A specific question asked, comments recorded, changes made.', maxPoints: 15 },
        { criterion: 'Built from the design', description: 'Working code, with the running note kept as reality disagreed.', maxPoints: 20 },
        { criterion: 'Specific about what was wrong', description: 'Named components and assumptions, not general reflection.', maxPoints: 15 },
        { criterion: 'An honest verdict on the process', description: 'Whether the design was worth writing, defended either way.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What decides the mark on this project is:',
        [['How honestly you can say where the design turned out wrong', true],
          ['How closely the finished code matches the design', false],
          ['How thorough the one-page design document is', false],
          ['How many review comments the design attracted', false]],
        'Every design is wrong somewhere.'),
      mcq('Keeping the running note as you build rather than afterwards matters because:',
        [['You will not remember the disagreements afterwards', true],
          ['It produces a more detailed final write-up', false],
          ['It lets you correct the design as you go', false],
          ['It shows the work was done in the right order', false]],
        'Do it as it happens.'),
      mcq('"No, a paragraph would have done" is:',
        [['A perfectly good answer if you can defend it', true],
          ['An admission the design work was wasted', false],
          ['Only acceptable for very small pieces of work', false],
          ['Contradicted by having written the design anyway', false]],
        'Answer honestly, with a reason.'),
    ],
  },

  /* ══ T3_SWE_QUALITY ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SWE_QUALITY_TESTS_THIS_DESIGN_NEEDS',
    notes: `The core test design unit chose the level — unit, integration, end to end. **This
one chooses the tests from how *this particular design* characteristically fails**, which is a
question the core unit could not ask because it had no design in front of it.

## Every design has characteristic failures

**A pipeline** fails at the joins. Stage two gets what stage one did not promise.

**A cache** fails on invalidation, and on the moment the cache and the source disagree.

**A queue** fails on duplicates, on ordering, and on the message that can never be processed.

**A state machine** fails on the transition nobody drew.

**A system with two writers** fails on the two of them writing at once.

**Anything with a timeout** fails at the boundary of the timeout, which is the least-tested
moment in most systems.

**Read the design and ask what shape it is.** The shape tells you the tests, and it tells you
them faster than any checklist because the checklist does not know what you built.

## The method

**For each component, what does it promise?** Test the promise, not the implementation.

**For each arrow, what happens when it fails?** Slow, error, wrong data, nothing at all.
**These are four different tests and most codebases have none of them.**

**For each piece of state, what if it is stale, missing or duplicated?**

**For each boundary, what is on either side of it?** Empty, one, many, too many.

**And for each assumption in the design, a test that fails if it stops being true.** This is
the most valuable category and the one nobody writes. If the design assumes ids are unique,
write the test that proves the system notices when they are not.

## Choosing the level from the failure

**A wrong calculation** — a unit test. Fast, precise.

**A wrong interaction between two components** — an integration test. **A unit test with a
mock cannot find this**, because the mock encodes your belief about the other component and
that belief is the thing that is wrong.

**A wrong assumption about a real dependency** — a test against the real thing, or a contract
test.

**A wrong overall flow** — one end-to-end test, and only one or two per feature.

**The failure decides the level.** Not the pyramid, and not habit.

## How many

**Enough that you would notice the characteristic failures.** Not a coverage number.

**Coverage tells you what was executed, not what was checked** — the core testing unit made
this point and it is worth repeating because the number is so easy to optimise and so easy to
believe.

**A design with four characteristic failure modes and four tests is better covered than one
with ninety percent line coverage and no test for any of them.**

## Writing them before

**Write the test names during the design**, before any code.

**It finds design problems.** A failure you cannot write a test name for is one you do not
understand, and a test that needs the whole system is a design telling you something —
**which the design debugging unit already said, from the other direction.**`,
    mcqs: [
      mcq('A queue characteristically fails on:',
        [['Duplicates, ordering, and the message that can never be processed', true],
          ['Throughput limits under sustained production load', false],
          ['Connection loss between the producer and the broker', false],
          ['Serialisation of messages with unexpected shapes', false]],
        'Read the design and ask what shape it is.'),
      mcq('A unit test with a mock cannot find a wrong interaction because:',
        [['The mock encodes your belief about the other component', true],
          ['Mocks do not exercise the real code path', false],
          ['Interactions involve timing that mocks cannot reproduce', false],
          ['The mock is written after the component it replaces', false]],
        'And that belief is the thing that is wrong.'),
      mcq('The most valuable category of test, and the one nobody writes, is:',
        [['A test that fails if an assumption in the design stops being true', true],
          ['An integration test across each pair of components', false],
          ['A test for each failure path drawn in the design', false],
          ['A property test over the full range of inputs', false]],
        'If the design assumes ids are unique, prove the system notices when they are not.'),
      mcq('Four tests covering four characteristic failures is:',
        [['Better covered than ninety percent of lines with none of them', true],
          ['Insufficient for any production system', false],
          ['Equivalent to a moderate coverage percentage', false],
          ['A reasonable starting point to be expanded later', false]],
        'Coverage tells you what was executed, not what was checked.'),
    ],
    checkpoint: [
      mcq('What happens when an arrow fails is:',
        [['Four different tests: slow, error, wrong data, and nothing at all', true],
          ['One test for the error case on that path', false],
          ['Covered by an integration test of the pair', false],
          ['Usually handled by the framework rather than tested', false]],
        'Most codebases have none of the four.'),
      mcq('The level of a test should be decided by:',
        [['The failure you are trying to catch', true],
          ['The test pyramid and its recommended proportions', false],
          ['Which level is fastest to write for that component', false],
          ['The level the rest of the codebase uses', false]],
        'Not the pyramid, and not habit.'),
      mcq('Writing test names during the design:',
        [['Finds design problems, because a failure you cannot name is one you do not understand', true],
          ['Speeds up the implementation once coding begins', false],
          ['Ensures the tests are written before the code', false],
          ['Produces a checklist for the reviewer to work from', false]],
        'And a test that needs the whole system is the design telling you something.'),
    ],
  },

  {
    unitCode: 'T3_SWE_QUALITY_REVIEWING_WELL',
    notes: `The core review unit was about **what to look for**. This one is about **the
wording, the ordering, and keeping the author willing to send you the next one** — which is a
separate skill, and the one that decides whether your reviews improve the codebase or just
slow it down.

## Understand before you comment

**Read the whole change first.** All of it, without commenting.

**Then read the description**, and the ticket if there is one.

**Then ask yourself what you would have done**, and **hold that lightly** — a different
reasonable approach is not a defect, and treating it as one is the fastest way to become the
reviewer people route around.

**Only then comment.**

**A review written top to bottom as you read it is a review that says the wrong things**,
because the answer to your first comment is usually on line ninety.

## The order that matters

**Correctness first.** Does it do the thing? Does it do it when the input is empty, huge,
missing, hostile?

**Then design.** Is it in the right place? Does it make the next change harder?

**Then tests.** Is the thing that could break actually covered?

**Then readability.** Will somebody understand this in a year?

**Style last, and ideally not at all** — **a tool should be doing style**, and a review
spending its attention there has spent it on the cheapest thing in the list.

## Wording

**Say what and why.** "This breaks when the list is empty, because index zero is read before
the length check."

**Ask rather than assert when you are not sure.** "What happens here if the user has no
orders?" — this costs you nothing when you are right and saves a wrong correction when you
are not.

**Distinguish blocking from not.** Mark it. "Blocking:" and "Minor:" or your team's
equivalent. **An unmarked review is a pile of things of unknown importance**, and the author
has to guess which ones you will refuse to approve over.

**Say what is good.** Specifically, once or twice. Not flattery — **"the way you separated
the parsing from the validation makes this much easier to follow" tells them to keep doing
it**, which is the only way a codebase gets better rather than just less bad.

**And never comment on the person.** "This function is confusing" rather than "you have
written this confusingly". The change is what is being reviewed.

## Size

**A large change gets a worse review.** Beyond a few hundred lines, reviewers skim, and the
review that finds nothing on eight hundred lines is not evidence of quality.

**Ask for it to be split** rather than reviewing it badly. That is a real and useful review
comment.

## Approving

**Approve when it is better than what is there**, not when it is perfect.

**A review that blocks on preference is a review that costs the team more than it returns**,
and it is how review becomes the bottleneck everybody complains about.

**Leave the small things as non-blocking suggestions** and approve.

## Speed

**Review within a day.** A change waiting three days is a branch drifting, an author
context-switched, and a merge conflict being built.

**A fast adequate review beats a slow thorough one**, most of the time — which is an
uncomfortable thing to say and is nonetheless what the throughput numbers show.`,
    mcqs: [
      mcq('Reading the whole change before commenting matters because:',
        [['The answer to your first comment is usually on line ninety', true],
          ['It gives a better sense of the change’s overall size', false],
          ['Comments written later tend to be better worded', false],
          ['It avoids duplicating another reviewer’s comments', false]],
        'A review written top to bottom says the wrong things.'),
      mcq('Style should come last, and ideally not at all, because:',
        [['A tool should be doing style, and attention spent there is spent on the cheapest thing', true],
          ['Style issues rarely affect how the code behaves', false],
          ['Authors resent style comments more than other kinds', false],
          ['Style conventions vary between teams and projects', false]],
        'Correctness, design, tests, readability, then style.'),
      mcq('An unmarked review is:',
        [['A pile of things of unknown importance the author has to guess about', true],
          ['Harder to respond to than one with many comments', false],
          ['Acceptable when all the comments are minor', false],
          ['Improved by ordering the comments by severity', false]],
        'Mark blocking and non-blocking explicitly.'),
      mcq('Saying specifically what is good:',
        [['Tells them to keep doing it, which is how a codebase gets better', true],
          ['Softens the impact of the critical comments', false],
          ['Is expected as a matter of professional courtesy', false],
          ['Makes the author more likely to accept the rest', false]],
        'Not flattery — a specific thing, once or twice.'),
    ],
    checkpoint: [
      mcq('A review that finds nothing on eight hundred lines is:',
        [['Not evidence of quality, because reviewers skim at that size', true],
          ['A sign the author has reviewed their own work well', false],
          ['Reasonable when the change is mostly mechanical', false],
          ['An argument for reviewing in more than one sitting', false]],
        'Asking for it to be split is a real and useful comment.'),
      mcq('You should approve when the change:',
        [['Is better than what is currently there, not when it is perfect', true],
          ['Meets every standard the team has agreed on', false],
          ['Has had all reviewer comments addressed', false],
          ['Is something you would have written the same way', false]],
        'Blocking on preference costs the team more than it returns.'),
      mcq('A fast adequate review beating a slow thorough one is:',
        [['Uncomfortable to say, and what the throughput numbers show', true],
          ['True only for small and low-risk changes', false],
          ['An argument against detailed review generally', false],
          ['A consequence of most defects being found in testing', false]],
        'A change waiting three days is a branch drifting.'),
    ],
  },

  {
    unitCode: 'T3_SWE_QUALITY_BEING_REVIEWED',
    notes: `Nobody teaches the receiving side, and it is half of the interaction. **This unit
has no core counterpart**, and the habit it argues against is the one almost everybody has:
silent compliance.

## Before you send it

**Read your own change first.** In the review tool, as a diff. **You will find things**, and
every one you find is one a reviewer does not spend their attention on.

**Write a description that says why**, not what. The diff says what.

**Point at what you are unsure about.** "I am not sure the retry belongs here" gets you a
better review than silence, and it is not an admission of anything.

**Keep it small.** Your reviewer's attention is a budget you are spending.

## Reading the comments

**Assume good intent.** Text has no tone, and a comment that reads as sharp was almost always
typed quickly by somebody with fifteen minutes.

**Read all of them before replying to any.**

**And separate the comment from the feeling.** The first read is emotional for everybody,
including engineers with twenty years of experience. **Come back ten minutes later and it is
a list of technical statements** — which is what it always was.

## Replying

**When they are right:** change it, and say so briefly. "Good catch, fixed." **No apology and
no essay.**

**When you are not sure:** ask. "Do you mean X or Y?"

**When you disagree:** say so, with a reason, once.

> "I kept it here because moving it would mean the caller needs the config, and that seemed
> worse. Happy to change it if you still think so."

**That is the whole move.** A reason, and a door left open.

**If they still disagree after that, escalate or concede — do not go round again.** A thread
with six replies should have been a five-minute conversation, and everybody reading it knows.

## Why silent compliance is a failure

**Changing something you believe is wrong, without saying so, is the worst outcome available.**

**The code gets worse**, because you were right.

**The reviewer learns nothing**, and gives the same wrong comment next week.

**And you learn nothing**, because if you were wrong you never found out why.

**It looks cooperative and it is corrosive**, and it is the single most common failure on this
side of the review.

## Changing your mind in public

**"You are right, I had not thought about the empty case"** is a strong sentence, not a weak
one.

**It makes people want to review your changes**, because disagreeing with you is cheap and
productive.

**And it makes your disagreements credible**, because somebody who never concedes is somebody
whose objections carry no information.

## When the review is genuinely unfair

It happens. Somebody is rude, or blocking on preference, or reviewing the person.

**Do not answer in the thread.** Nothing good has ever come of that.

**Talk to them directly**, or ask somebody to help. **A pattern, rather than one bad day, is
worth raising with a lead** — and it is worth raising, because it is a real problem and it
drives people out of teams.`,
    mcqs: [
      mcq('Reading your own change as a diff before sending it:',
        [['Finds things, each one being attention a reviewer does not have to spend', true],
          ['Confirms the change does what the description claims', false],
          ['Catches formatting problems the tooling missed', false],
          ['Is mainly useful for changes over a few hundred lines', false]],
        'Your reviewer’s attention is a budget you are spending.'),
      mcq('The first read of a review being emotional is:',
        [['True for everybody, including engineers with twenty years of experience', true],
          ['A sign the comments were worded carelessly', false],
          ['Something that fades with professional experience', false],
          ['Usually a reaction to one specific comment', false]],
        'Come back ten minutes later and it is a list of technical statements.'),
      mcq('The right way to disagree with a comment is:',
        [['A reason, once, with a door left open', true],
          ['A detailed explanation of the original reasoning', false],
          ['A request that the reviewer justify their position', false],
          ['A suggestion to discuss it outside the thread', false]],
        'If they still disagree, escalate or concede — do not go round again.'),
      mcq('Silent compliance is the worst outcome because:',
        [['The code gets worse, the reviewer learns nothing, and neither do you', true],
          ['It leaves the disagreement unresolved for next time', false],
          ['It makes the review process slower overall', false],
          ['It signals that the reviewer cannot be challenged', false]],
        'It looks cooperative and it is corrosive.'),
    ],
    checkpoint: [
      mcq('"You are right, I had not thought about the empty case" is:',
        [['A strong sentence that makes your disagreements credible', true],
          ['A concession best made outside the review thread', false],
          ['Better replaced by simply making the change', false],
          ['Appropriate only when the reviewer is more senior', false]],
        'Somebody who never concedes has objections that carry no information.'),
      mcq('A review thread with six replies:',
        [['Should have been a five-minute conversation, and everybody knows it', true],
          ['Indicates a genuinely difficult technical question', false],
          ['Is a normal outcome for a substantial change', false],
          ['Should be resolved by the more senior participant', false]],
        'Escalate or concede rather than going round again.'),
      mcq('When a reviewer is genuinely unfair, the right move is:',
        [['Talk to them directly, and raise a pattern with a lead', true],
          ['Reply in the thread setting out the problem calmly', false],
          ['Request a different reviewer for future changes', false],
          ['Make the changes and avoid them afterwards', false]],
        'It is worth raising, because it drives people out of teams.'),
    ],
  },

  {
    unitCode: 'T3_SWE_QUALITY_DEBUGGING',
    notes: `Five ways quality practices fail even when a team has all of them.

## 1. The tests pass and the thing is broken

**Causes:** the tests check the implementation rather than the promise; everything is mocked
so nothing real is exercised; the characteristic failures of the design were never tested;
the test asserts something trivially true.

**Diagnosis:** **break the code on purpose and see whether anything goes red.** Delete a line,
invert a condition. **A suite that stays green while the code is wrong is not a suite** — and
this takes two minutes to establish.

**Fix:** test the promise, test the characteristic failures, and keep at least one test that
touches something real.

## 2. Everybody approves everything

**Symptom:** reviews are fast, comments are rare, and defects reach production regularly.

**Causes:** changes too large to review; no time allocated; a culture where comments are taken
badly; reviewers who do not know the area.

**Fix:** smaller changes, a named reviewer who knows the code, and — **the one that actually
works — a team norm that a review with no comments is unusual rather than normal.**

## 3. Review is the bottleneck

**Symptom:** changes sit for days and the team's throughput is set by review latency.

**Causes:** one person reviews everything; reviews block on preference; changes are too large
to review quickly.

**Fix:** spread reviewing, approve-with-suggestions for anything non-blocking, and **review
before starting your own new work rather than after** — the ordering is most of the fix.

## 4. The tests are slow and everybody skips them

**Causes:** integration tests where unit tests would do; a real database where a fake would
do; no parallelism; setup repeated per test.

**Fix:** **a fast suite that runs on every save and a slow suite that runs in the pipeline.**
The split matters more than the total time, because a suite nobody runs locally has already
failed at its main job.

## 5. Quality is a phase

**Symptom:** a testing week at the end; a QA handover; a hardening sprint.

**Cause:** quality treated as a stage rather than as a property of how the work is done.

**Why it fails:** **defects found at the end are the most expensive ones**, and the schedule
guarantees they are found there.

**Fix:** tests with the change, review with the change, and the design reviewed before the
code exists.

## The habits

**Break the code and check the suite goes red.**

**Keep changes small enough to review properly.**

**Review before starting new work.**

**Split the suite by speed.**

**And never let quality become a phase.**`,
    mcqs: [
      mcq('Establishing whether a suite is real takes:',
        [['Two minutes: break the code on purpose and see if anything goes red', true],
          ['A coverage report across the affected modules', false],
          ['A review of the assertions in each test file', false],
          ['A comparison against the defects found in production', false]],
        'A suite that stays green while the code is wrong is not a suite.'),
      mcq('The fix that actually works for everybody approving everything is:',
        [['A team norm that a review with no comments is unusual', true],
          ['A required number of comments per review', false],
          ['Mandatory approval from two separate reviewers', false],
          ['A checklist the reviewer works through each time', false]],
        'Along with smaller changes and a reviewer who knows the area.'),
      mcq('Most of the fix for review being a bottleneck is:',
        [['Reviewing before starting your own new work rather than after', true],
          ['Setting a service level for review turnaround time', false],
          ['Automating more of what reviewers check by hand', false],
          ['Reducing the number of changes that require review', false]],
        'The ordering is most of it.'),
      mcq('Splitting the suite by speed matters more than the total time because:',
        [['A suite nobody runs locally has already failed at its main job', true],
          ['Fast tests catch a higher proportion of defects', false],
          ['Pipeline time is cheaper than developer time', false],
          ['Slow tests are usually testing the wrong things', false]],
        'Fast on every save, slow in the pipeline.'),
    ],
    checkpoint: [
      mcq('Quality treated as a phase fails because:',
        [['Defects found at the end are the most expensive, and the schedule guarantees it', true],
          ['A dedicated phase is always cut when time runs short', false],
          ['Testers lack the context the authors have', false],
          ['It separates responsibility from the people writing the code', false]],
        'Tests with the change, review with the change, design reviewed first.'),
      mcq('A test suite where everything is mocked:',
        [['Exercises nothing real, so it can pass while the system is broken', true],
          ['Runs faster at the cost of some confidence', false],
          ['Is appropriate for unit tests by definition', false],
          ['Needs contract tests added alongside it', false]],
        'Keep at least one test that touches something real.'),
      mcq('Approve-with-suggestions helps review latency because:',
        [['Non-blocking comments stop holding up the merge', true],
          ['It reduces the number of comments reviewers write', false],
          ['It shifts responsibility for small issues to the author', false],
          ['It allows a second reviewer to be skipped', false]],
        'Blocking on preference is what makes review the bottleneck.'),
    ],
  },

  {
    unitCode: 'T3_SWE_QUALITY_PRACTICE',
    notes: `Two exercises on the mechanical parts of quality work: choosing the test level from
the failure, and sorting a review so the author knows what actually blocks.`,
    coding: [
      {
        title: 'Choosing the level from the failure',
        description: `Read one failure mode per line as \`<name> <kind>\`, where kind is one
of \`calculation\`, \`interaction\`, \`dependency\` or \`flow\`.

Print the level for each:

- \`calculation\` → \`unit\`
- \`interaction\` → \`integration\`
- \`dependency\` → \`contract\`
- \`flow\` → \`end_to_end\`

Then a final line \`end_to_end=<n>\`. **Warn when more than two are end-to-end** by printing
\`TOO_MANY_E2E\` on the line after, because one or two per feature is the budget and a suite
of them is slow, flaky and hard to diagnose.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# One or two end-to-end tests per feature is the budget.
`,
        language: 'python',
        tests: [
          { input: 'rounding calculation\n', expectedOutput: 'unit\nend_to_end=0' },
          { input: 'a interaction\nb dependency\n', expectedOutput: 'integration\ncontract\nend_to_end=0' },
          { input: 'a flow\nb flow\n', expectedOutput: 'end_to_end\nend_to_end\nend_to_end=2' },
          { input: 'a flow\nb flow\nc flow\n', expectedOutput: 'end_to_end\nend_to_end\nend_to_end\nend_to_end=3\nTOO_MANY_E2E' },
          { input: '', expectedOutput: 'end_to_end=0', isHidden: true },
        ],
      },
      {
        title: 'Sorting a review',
        description: `Read one review comment per line as \`<id> <category>\`, where category
is \`correctness\`, \`design\`, \`tests\`, \`readability\` or \`style\`.

Print the ids in review order — correctness, design, tests, readability, style — **keeping the
original order within each category**. One per line, each as \`<id> <blocking|minor>\`.

**Correctness is blocking. Everything else is minor.** Then print \`blocking=<n>\`.

A \`style\` comment also gets \` (tool)\` appended after \`minor\`, because a tool should be
doing it and saying so is more useful than the comment.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Correctness, design, tests, readability, style — stable within each.
`,
        language: 'python',
        tests: [
          { input: '1 style\n2 correctness\n', expectedOutput: '2 blocking\n1 minor (tool)\nblocking=1' },
          { input: '1 tests\n2 design\n3 correctness\n', expectedOutput: '3 blocking\n2 minor\n1 minor\nblocking=1' },
          { input: '1 correctness\n2 correctness\n', expectedOutput: '1 blocking\n2 blocking\nblocking=2' },
          { input: '1 readability\n', expectedOutput: '1 minor\nblocking=0' },
          { input: '9 style\n8 style\n7 design\n', expectedOutput: '7 minor\n9 minor (tool)\n8 minor (tool)\nblocking=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Engineering Quality Practice',
      description: 'Choose test levels from failures, sort a review, then do both on real code.',
      instructions: `Complete both exercises, then:

1. For the first: the end-to-end warning fires above two. Say what goes wrong in a suite with
   thirty of them, and what those thirty should mostly have been.
2. For the second: style comments are marked as a tool’s job. Give a case where a style
   comment in a review is still worth making.
3. For the second: order is preserved within a category. Say why that matters to the author
   reading it.

**Then, on real code** — yours or an open-source project.

4. Take one component. Write down its **characteristic failure modes** from its shape, not
   from a checklist. At least five.
5. Choose a level for each, from the failure.
6. Write the tests. **Then break the code on purpose, five times, and record whether the suite
   went red each time.**
7. Fix any case where it stayed green.

**Then review a real change** — an open pull request on a project you understand.

8. Read the whole change before writing anything.
9. Write the review: correctness, design, tests, readability, style, in that order.
10. Mark every comment blocking or minor.
11. Name one specific thing that is good.
12. Say whether you would approve it, and why.`,
      rubric: [
        { criterion: 'Levels chosen correctly', description: 'All cases, including the end-to-end budget warning.', maxPoints: 15 },
        { criterion: 'Review sorted correctly', description: 'All cases, stable within category, style marked as tooling.', maxPoints: 15 },
        { criterion: 'Five characteristic failures', description: 'Derived from the component’s shape rather than a checklist.', maxPoints: 20 },
        { criterion: 'Tests that go red', description: 'Five deliberate breakages, each recorded, any green case fixed.', maxPoints: 20 },
        { criterion: 'A real review, ordered and marked', description: 'Whole change read first, five categories in order, blocking marked.', maxPoints: 20 },
        { criterion: 'A verdict with a reason', description: 'Approve or not, defended, with one specific good thing named.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'rounding calculation\n', expectedOutput: 'unit\nend_to_end=0' },
          { input: 'a interaction\nb dependency\n', expectedOutput: 'integration\ncontract\nend_to_end=0' },
          { input: 'a flow\nb flow\n', expectedOutput: 'end_to_end\nend_to_end\nend_to_end=2' },
          { input: 'a flow\nb flow\nc flow\n', expectedOutput: 'end_to_end\nend_to_end\nend_to_end\nend_to_end=3\nTOO_MANY_E2E' },
          { input: '', expectedOutput: 'end_to_end=0', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A suite with thirty end-to-end tests is:',
        [['Slow and flaky, and most of them should have been integration tests', true],
          ['Thorough, at the cost of a longer pipeline run', false],
          ['Reasonable for a system with many user journeys', false],
          ['Better than a suite relying heavily on mocks', false]],
        'One or two per feature is the budget.'),
      mcq('A style comment in a review is still worth making when:',
        [['No tool enforces it and it genuinely affects readability', true],
          ['The author is new to the codebase conventions', false],
          ['It appears more than once in the same change', false],
          ['The reviewer has no correctness comments to make', false]],
        'Otherwise the tool should be saying it.'),
      mcq('Preserving order within a category matters because:',
        [['The author reads it as a walk through their own change', true],
          ['It makes the review easier for the reviewer to write', false],
          ['It groups related comments near each other', false],
          ['It shows which comments were written first', false]],
        'Reordering within a category makes it harder to follow.'),
    ],
  },

  {
    unitCode: 'T3_SWE_QUALITY_MINI_PROJECT',
    notes: `Take a piece of code with weak tests, work out what its design characteristically
gets wrong, and leave it with a suite that actually goes red.

**The measurement is the mutation exercise: how many deliberate breakages your suite catches.**
Not coverage, not test count — how many times you can damage the code and be told about it.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Suite That Goes Red',
      description: 'Characteristic failures, tests chosen from them, and a mutation exercise that proves the suite works.',
      instructions: `**Choose** a component with weak or no tests. Yours, or from an
open-source project you can run.

**Part one — read the design**

1. What shape is it? Pipeline, cache, queue, state machine, something else.
2. **Its characteristic failure modes from that shape.** At least six, each specific to this
   code rather than generic.
3. The assumptions the code makes. At least three.

**Part two — choose the tests**

4. A level for each failure mode, chosen from the failure.
5. **A test for each assumption**, that fails if the assumption stops holding.
6. Justify anything you chose end-to-end. **At most two.**

**Part three — write them**

7. Write the tests. They should pass against the current code, except where they find a real
   defect — **record any they do find, because that is the point.**
8. Split the suite: fast tests that run on save, slow tests for the pipeline. Record both
   times.

**Part four — the mutation exercise**

9. **Make ten deliberate breakages**, one at a time: invert a condition, delete a line,
   change a boundary, remove an error check, swap two arguments.
10. Record for each: did the suite go red, and which test caught it.
11. **For every breakage the suite missed, write the test that catches it.**
12. Re-run all ten and record the new result.

**Part five — get it reviewed**

13. Send the test suite for review, asking one specific question.
14. Record the comments and what you changed.

**Part six — write it up**

15. Your catch rate before and after.
16. Which breakage was hardest to catch, and why.
17. **Which one you still cannot catch**, if any, and what it would take.
18. What the exercise told you about the design, not just about the tests.

**Submit** the failure analysis, the tests, the mutation table with both runs, the review, and
the write-up.`,
      rubric: [
        { criterion: 'Failures from the shape', description: 'Six specific to this code, plus three assumptions named.', maxPoints: 20 },
        { criterion: 'Levels chosen from failures', description: 'Each justified, with at most two end-to-end.', maxPoints: 15 },
        { criterion: 'Tests written and split by speed', description: 'Including a test per assumption, with both suite times recorded.', maxPoints: 20 },
        { criterion: 'Ten breakages, recorded', description: 'Each with whether the suite went red and which test caught it.', maxPoints: 20 },
        { criterion: 'Misses turned into tests', description: 'Every missed breakage covered, with the ten re-run.', maxPoints: 15 },
        { criterion: 'What it said about the design', description: 'Reviewed, with a conclusion about the design and not only the tests.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('This project is scored on:',
        [['How many deliberate breakages the suite catches', true],
          ['How much of the component the tests cover', false],
          ['How many characteristic failures were identified', false],
          ['How quickly the fast suite runs on save', false]],
        'Not coverage, not test count.'),
      mcq('A test the suite already fails on before any breakage:',
        [['Has found a real defect, which is the point of writing it', true],
          ['Should be adjusted to match the current behaviour', false],
          ['Indicates the failure mode was misidentified', false],
          ['Belongs in the slow suite rather than the fast one', false]],
        'Record it — a test that fails on untouched code has found something.'),
      mcq('The exercise should tell you something about the design because:',
        [['Failures that are hard to catch usually mark a design problem', true],
          ['Test count correlates with component complexity', false],
          ['Mutation testing measures structural quality directly', false],
          ['The breakages reveal which code paths are unused', false]],
        'The design debugging unit made the same point from the other direction.'),
    ],
  },
];
