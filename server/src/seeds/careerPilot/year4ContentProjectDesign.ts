/**
 * T4_IV_PROJECT, T4_SD_FUNDAMENTALS and T4_SD_INTERVIEW — fifteen units. Module P19.
 *
 * ── THE TWO ROUNDS THIS COVERS, AND WHY THEY SIT TOGETHER ─────────────────────────────────
 *
 * The project round and the design round look different and fail the same way: the candidate
 * describes WHAT rather than WHY. "We used Redis" is a fact; "we used Redis because the dashboard
 * query took four seconds and the data was stale-tolerable for a minute" is the answer, and the
 * gap between them is the whole assessment.
 *
 * The project round is the easier of the two to prepare and the more commonly wasted. Every
 * candidate has a project; almost none can say what they would do differently, which is the
 * question that actually separates.
 *
 * ── THE SCOPE OF A PLACEMENT DESIGN ROUND ─────────────────────────────────────────────────
 *
 * Not the senior version. Nobody expects a fresher to shard a database or reason about consensus.
 * The bar is: can you draw a sensible system, name what would break first, and justify a choice
 * against an alternative. That is reachable in a few weeks, and candidates routinely over-prepare
 * distributed systems theory they will not be asked while being unable to draw a URL shortener.
 *
 * Attribution: T4_IV_PROJECT defaults to TECHNICAL_INTERVIEW_PREP with the trade-offs unit also on
 * SYSTEM_DESIGN_BASICS; T4_SD_FUNDAMENTALS and T4_SD_INTERVIEW on SYSTEM_DESIGN_BASICS with the
 * interview units also on TECHNICAL_INTERVIEW_PREP.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PROJECT_DESIGN_BUNDLES: PilotBundle[] = [
  /* ══ T4_IV_PROJECT ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_IV_PROJECT_WHAT_THEY_ARE_CHECKING',
    notes: `**Whether you built it, whether you understood it, and whether you made any decisions at
all.**

## The shape of the round

**"Tell me about a project"** is not the question. It is the doorway, and it should take ninety
seconds.

**Then the real ones arrive:** why that approach, what broke, what you would change, how you knew
it worked, what happens under ten times the traffic.

**Twenty minutes of follow-up establishes beyond any doubt whether you built it or watched it get
built**, which is the round's actual purpose.

## The ninety-second opener

**Problem, approach, outcome, your part.**

"A dashboard for a college club to track event attendance. Django and Postgres, about four
thousand rows. I built the backend and the export. It replaced a spreadsheet three people were
editing at once."

**Four sentences. Then stop.**

**The most common opening error is a five-minute feature tour**, which spends the round's most
valuable minutes on the least interesting content and leaves the interviewer hunting for substance.

## The contribution question, which is asked every time

**"What was your specific contribution?"**

**"We built the backend" cannot be scored.** The interviewer cannot tell whether you wrote it,
reviewed it or watched it — and absent evidence they must assume the weaker reading, because the
stronger one would be unfair to candidates who were specific.

**So: what you owned, what you contributed to, what you did not touch.** "I owned the
authentication and the CSV export. I contributed to the data model in review. I did not write the
frontend."

**The third sentence is what makes the first two credible** — a candidate who names what they did
not do is believable about what they did.

## The follow-up that checks it

**A detail question about the part you claimed.** "How did you handle session expiry?" **Somebody
who owned it answers immediately; somebody who did not, hesitates**, and the hesitation is more
informative than the answer.

## Choosing which project

**Not the biggest. The one you can go deepest on.** The round is twenty minutes of increasing
depth, and an ambitious project you contributed a corner to runs out at minute six.`,
    mcqs: [
      mcq('The most common opening error is a five-minute feature tour, which spends the round’s most valuable minutes on:',
        [['The least interesting content', true],
         ['Details the interviewer already has', false],
         ['Work that others contributed to', false],
         ['Technology choices made by the team', false]],
        'The features are the doorway; the decisions, failures and limits are what the round assesses, and the tour delays reaching them.'),
      mcq('Absent evidence, the interviewer must assume the weaker reading of "we built the backend" because the stronger one would be:',
        [['Unfair to candidates who were specific', true],
         ['Impossible to verify in the time available', false],
         ['Inconsistent with the rest of the answer', false],
         ['An unusual level of responsibility', false]],
        'Rewarding vagueness equally with precision would penalise the candidates who took the risk of being checkable.'),
    ],
    checkpoint: [
      mcq('Naming what you did not do makes the rest credible because a candidate who does so is:',
        [['Believable about what they did', true],
         ['Demonstrating awareness of the whole system', false],
         ['Showing they worked in a larger team', false],
         ['Reducing the scope of possible follow-ups', false]],
        'A boundary drawn voluntarily signals that the claims inside it are drawn honestly too.'),
      mcq('An ambitious project you contributed a corner to runs out at minute six because the round is:',
        [['Twenty minutes of increasing depth', true],
         ['Focused on the technical decisions only', false],
         ['Scored on the breadth of the work described', false],
         ['Structured around a fixed list of questions', false]],
        'Depth is bounded by what the candidate actually knows, so a partial contribution is exhausted well before the round is.'),
    ],
  },
  {
    unitCode: 'T4_IV_PROJECT_THE_HARDEST_BUG',
    notes: `**The question that separates somebody who built it from somebody who watched it being
built.**

## Why this single question is so effective

**Because a bug cannot be described secondhand.** Features can — you can describe what a system does
without having written it. **A bug has a symptom you observed, an investigation you performed, a
cause you found and a fix you made**, and somebody who was not there has none of those four.

**It is the most reliable discriminator in the round**, and interviewers know it.

## The four parts

**The symptom.** What you actually saw. "The export produced a file with the wrong number of rows,
but only for one user."

**The investigation.** What you checked and in what order. **This is the part being assessed** — it
reveals whether debugging is a method or a series of guesses.

"I checked whether the count was wrong in the query or in the file. The query was right, so it was
the writing. I looked at that user's data and found a description containing a newline."

**The cause.** The actual mechanism. "The CSV writer was not quoting fields, so an embedded newline
started a new row."

**The fix, and what you did about the class.** "I used the library's writer instead of building the
string. Which also fixed commas, which I had not noticed were broken."

## The last part matters more than it looks

**Fixing the instance is a fix. Noticing the class is engineering**, and the sentence about commas
does more for the answer than the rest of it combined.

## What a weak answer sounds like

**"There was a bug and I fixed it."** No symptom, no investigation, no mechanism. It is
indistinguishable from not having been there.

**Or: "it was a silly mistake, a typo."** True perhaps, and it wastes the question — choose one that
required actual investigation, because the investigation is what is being asked for.

## If you genuinely have no hard bug

**Say so and describe the hardest thing you did debug**, honestly. **A small bug investigated
methodically is a better answer than a large one described vaguely**, and inventing one collapses
on the first question about the mechanism.`,
    mcqs: [
      mcq('A bug cannot be described secondhand because it has a symptom you observed, an investigation you performed, a cause you found and a fix you made — and somebody who was not there:',
        [['Has none of those four', true],
         ['Can reconstruct them from the code', false],
         ['Would describe them in less detail', false],
         ['Remembers only the eventual fix', false]],
        'Each part is a first-hand experience, so the answer cannot be assembled from familiarity with the project.'),
      mcq('The investigation is the part being assessed because it reveals whether debugging is:',
        [['A method or a series of guesses', true],
         ['Something the candidate enjoys doing', false],
         ['Performed alone or with assistance', false],
         ['Supported by adequate logging', false]],
        'The order in which possibilities were eliminated shows whether the search was structured, which is what transfers to unfamiliar bugs.'),
    ],
    checkpoint: [
      mcq('Noticing that the same fix also resolved embedded commas does more for the answer than the rest of it combined because fixing the instance is a fix and noticing the class is:',
        [['Engineering', true],
         ['Evidence of a thorough test suite', false],
         ['A sign the original cause was misdiagnosed', false],
         ['Only possible in hindsight', false]],
        'Generalising from one failure to the family it belongs to is what prevents the next several, which is the capability being probed.'),
      mcq('Answering with a typo wastes the question because the answer should be one that required:',
        [['Actual investigation', true],
         ['Changes across several files', false],
         ['Help from somebody more experienced', false],
         ['A significant amount of time to fix', false]],
        'The investigation is what is being asked for, so a bug whose cause was immediately visible has nothing to demonstrate.'),
    ],
  },
  {
    unitCode: 'T4_IV_PROJECT_TRADE_OFFS_YOU_MADE',
    notes: `**Every decision had another option. Knowing what it was is most of what "senior" means
at this stage.**

## Why this is the highest-value preparation available

**Because it is the question every project round reaches, every candidate could answer it, and
almost none prepare it.**

"Why did you use X?" answered with "because that is what the tutorial used" is honest and weak.
Answered with "because Y would have required Z and we did not need it" is a decision.

## The structure

**The constraint, the options, the choice, and what it cost.**

"We needed search across descriptions. Options were a LIKE query, full-text search in Postgres, or
Elasticsearch. We used Postgres full-text because it was already there and the corpus was four
thousand rows. It would not scale past a few hundred thousand, and at that point Elasticsearch
would be worth the operational cost."

**Four parts. The fourth is the one that separates**, because stating the cost demonstrates the
decision was weighed rather than defaulted into.

## The honest version when there was no decision

**"I used it because it was what I knew"** is fine, **followed by what you have since learned**.

"I used MongoDB because I had used it before. Looking back, the data was relational and I ended up
writing joins by hand in the application, which is what a relational database does for free."

**That is a better answer than an invented rationale**, and a made-up trade-off collapses under one
follow-up because the numbers do not exist.

## The four decisions present in almost every project

**Where the data lives.** Relational against document, and why the shape of the data decides.

**Where the work happens.** In the request or in a background job.

**What is cached, and what staleness that permits.**

**What is validated where.** Client, server, database.

**Having the reasoning ready for each covers most of what this round asks.**

## The related question

**"What would you do differently?"** **"Nothing" is the worst available answer** — it says either
that no reflection occurred or that the project was too small to have taught anything.

**"I would have written the export as a background job, because it timed out once the data grew"
demonstrates that the experience was processed rather than merely had.**`,
    mcqs: [
      mcq('The four-part structure ends with what the choice cost, and that part separates because stating the cost demonstrates the decision was:',
        [['Weighed rather than defaulted into', true],
         ['Reviewed by somebody more experienced', false],
         ['Correct given the available information', false],
         ['Revisited later in the project', false]],
        'A default has no known cost, so naming one is evidence that alternatives were actually considered.'),
      mcq('An invented trade-off collapses under one follow-up because:',
        [['The numbers do not exist', true],
         ['Interviewers recognise the common patterns', false],
         ['It contradicts the rest of the description', false],
         ['The candidate cannot recall it consistently', false]],
        'A real trade-off has specifics behind it — sizes, timings, constraints — and a fabricated one has nothing to produce when probed.'),
    ],
    checkpoint: [
      mcq('"Nothing" as an answer to "what would you do differently?" says either that no reflection occurred or that:',
        [['The project was too small to have taught anything', true],
         ['The candidate is defensive about their work', false],
         ['The original decisions were all correct', false],
         ['There was insufficient time to improve it', false]],
        'Any project of real substance produces regrets, so their absence indicates either no scale or no examination.'),
      mcq('This is the highest-value preparation available because the question is reached by every project round and:',
        [['Almost no candidates prepare it', true],
         ['It carries the most weight in the scoring', false],
         ['It is the hardest question to answer well', false],
         ['The answer transfers to the design round', false]],
        'A question that is always asked and rarely prepared offers the largest return for the time spent on it.'),
    ],
  },
  {
    unitCode: 'T4_IV_PROJECT_PRACTICE',
    notes: `**Architecture, data flow, the hardest bug, security, testing and scaling — without
notes.**

## The drill

**Your own project, twenty minutes, somebody who will not let "we used X" stand.**

**Ninety-second opener, then eighteen minutes of follow-up across six areas.**

## The six areas and the question for each

**Architecture:** "Draw it. What talks to what?"

**Data flow:** "Walk one user action from the click to the database and back."

**The hardest bug:** "Symptom, investigation, cause, fix."

**Security:** "How do you know somebody cannot read another user's data?" — **the question most
student projects have no answer to**, and finding that out now is the point.

**Testing:** "How did you know it worked?" "I clicked around" is an answer and it is a finding.

**Scaling:** "A hundred times the users. What breaks first?"

**None requires technical knowledge to ask**, which is what makes a non-technical partner adequate.

## What to record

**Whether the opener stayed under two minutes.** **Which "why" produced a real reason and which
produced a shrug.** **Whether the contribution answer was specific.** **Whether the bug answer had
all four parts.** **Which of the six areas produced nothing.**

## The finding that usually comes out

**Two or three technology choices with no reason behind them.**

**That is not a preparation failure — it is a true fact about the project**, and the remedy is to
work out the reason now, honestly, including "there wasn't one, and here is what I would consider
today."

## The detail check

**Have the partner pick one thing you claimed to own and ask a specific question about it.** **If
you hesitate, the claim is too broad** and should be narrowed to what you can answer instantly.

## Frequency

**Once per project, twice for the one you will lead with.** The material does not change, so the
drill converges quickly — and its value is almost entirely in the first session, which surfaces the
reasonless choices and the empty areas.`,
    mcqs: [
      mcq('Two or three technology choices with no reason behind them is described as not a preparation failure but:',
        [['A true fact about the project', true],
         ['A gap that cannot be closed before the round', false],
         ['A sign the project was too small', false],
         ['Something to avoid mentioning in the answer', false]],
        'The choices genuinely were made without reasoning, so the drill has discovered the situation rather than a rehearsal shortfall.'),
      mcq('If you hesitate on a specific question about something you claimed to own, the claim is:',
        [['Too broad and should be narrowed', true],
         ['Fine provided the overall description holds', false],
         ['Evidence of incomplete preparation only', false],
         ['Better supported by additional context', false]],
        'Ownership produces instant recall of details, so the hesitation marks the boundary of what can be honestly claimed.'),
    ],
    checkpoint: [
      mcq('The security question is described as the one most student projects have no answer to, and asking it now:',
        [['Is the point, because the gap is found here rather than there', true],
         ['Matters less than the architecture question', false],
         ['Requires a partner who can evaluate the answer', false],
         ['Should be skipped for small personal projects', false]],
        'The drill exists to surface the empty areas while there is still time to fill them, and this is reliably one of them.'),
      mcq('A non-technical partner is adequate because the six questions are standard and:',
        [['None requires technical knowledge to ask', true],
         ['They can be read from a prepared list', false],
         ['The answers are judged by the candidate', false],
         ['They apply to any project regardless of stack', false]],
        'Asking what talks to what and what breaks first needs no understanding of the answer, which is what makes the drill widely runnable.'),
    ],
  },
  {
    unitCode: 'T4_IV_PROJECT_INTERVIEW_QUESTION',
    notes: `**"Walk me through your most interesting project."**

## Choosing which one

**Not the biggest. The one you can go deepest on.**

**A small project you understand completely beats an ambitious one you contributed a corner to**,
because the round is twenty minutes of increasing depth and the ambitious one runs out at minute
six.

## The ninety seconds

**Problem, approach, outcome, your part.** Then stop, and let them direct.

## What to have ready, because it will be asked

**One decision with its alternative and its cost.**

**One bug with its symptom, investigation, cause and fix.**

**One limit — what it cannot do, what breaks under load.**

**One thing you would do differently, specific.**

**One sentence on exactly what you owned.**

**Five items. They cover the round**, and preparing them takes under an hour.

## The scaling question

**"What if it had a hundred times the users?"**

**Not a trick, and not a request for a distributed architecture.** Name what breaks first — usually
a query with no index, or work done in the request that should be queued — and say what you would
do about it.

**Identifying the first bottleneck correctly is the whole answer.** Proposing a rewrite is the wrong
answer, because it skips the diagnosis.

## The thing that undoes a good round

**Claiming work that was not yours.** One detail question establishes it, and after that everything
else you said is reassessed — including the parts that were true.

## What a strong round sounds like

**Specific, honest about boundaries, and reflective about what would change.** None of those three
requires the project to have been impressive, which is why this round is more winnable than
candidates assume.`,
    mcqs: [
      mcq('A small project you understand completely beats an ambitious one you contributed a corner to because the ambitious one:',
        [['Runs out at minute six', true],
         ['Requires explaining other people’s work', false],
         ['Invites questions about team dynamics', false],
         ['Is harder to describe in ninety seconds', false]],
        'Depth is bounded by what the candidate actually knows, so a partial contribution exhausts well before the round does.'),
      mcq('For the scaling question, proposing a rewrite is the wrong answer because it:',
        [['Skips the diagnosis', true],
         ['Exceeds what a fresher would be asked', false],
         ['Assumes the load increase is permanent', false],
         ['Ignores the cost of the existing system', false]],
        'Identifying the first bottleneck is what is being assessed, and a rewrite proposes a solution without establishing the problem.'),
    ],
    checkpoint: [
      mcq('Claiming work that was not yours undoes a good round because after one detail question establishes it:',
        [['Everything else is reassessed, including the true parts', true],
         ['The interviewer will end the round early', false],
         ['The remaining answers carry less weight', false],
         ['The candidate loses confidence for the follow-ups', false]],
        'A demonstrated overstatement removes the basis for trusting any other claim, which costs more than the overstated item was worth.'),
      mcq('Specific, honest about boundaries and reflective are the three marks of a strong round, and none of them requires:',
        [['The project to have been impressive', true],
         ['Industry experience to demonstrate', false],
         ['Preparation beyond a single session', false],
         ['The candidate to have worked alone', false]],
        'All three are properties of how the work is described rather than of the work itself, which is why the round is widely winnable.'),
    ],
  },

  /* ══ T4_SD_FUNDAMENTALS ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SD_FUNDAMENTALS_COMPONENTS_AND_APIS',
    notes: `**Boxes and arrows that mean something: what each box owns and what each arrow
carries.**

## What a placement design round actually asks for

**Not the senior version.** Nobody expects a fresher to shard a database or reason about consensus.
**Candidates routinely over-prepare distributed systems theory they will not be asked while being
unable to draw a URL shortener.**

**The bar is three things:** draw a sensible system, name what breaks first, justify a choice
against an alternative.

## The boxes that appear in almost every answer

**A server.** Stateless, so more can be added. **Saying "stateless so I can scale horizontally" is
the marker** — it explains why the shape matters rather than naming it.

**A database.** Covered properly in the next unit, because the choice deserves it.

**A cache.** In front of expensive reads that tolerate being slightly stale. **The question it
always raises is invalidation**, and having an answer — a time limit, or clearing on write — is
expected.

**A queue.** For work that does not need to finish inside the request. **It converts a slow request
into a fast one plus a background job.**

**And when a requirement demands them:** a load balancer once there is more than one server, a CDN
for static files served far from the origin, object storage for files.

## What each box owns

**One responsibility, stated.** "The server validates and writes." "The worker resizes images."

**A box you cannot describe in one sentence is two boxes**, or it is a box you added without
knowing why.

## What each arrow carries

**This is the part candidates skip**, and it is where the design becomes real.

**An arrow is a call with a shape.** "The server asks the cache for a code and gets back a URL or
nothing." **Not "the server talks to the cache"** — that is a line, not an interface.

**Naming the two or three operations across each arrow** turns a diagram into a design, and it
exposes missing pieces immediately.

## The rule that governs everything

**Add a component when a requirement demands it, and say which requirement.**

**A three-box design with three reasons beats an eight-box design with none**, and candidates
consistently believe the opposite — which is why over-engineering is the most common failure in the
round.`,
    mcqs: [
      mcq('"Stateless so I can scale horizontally" is the marker because it explains:',
        [['Why the shape matters rather than naming it', true],
         ['How the servers communicate with each other', false],
         ['Which requests each server can handle', false],
         ['The deployment process being assumed', false]],
        'Statelessness is only interesting for what it enables, so linking it to adding servers demonstrates the reasoning behind the property.'),
      mcq('A box you cannot describe in one sentence is:',
        [['Two boxes, or one added without knowing why', true],
         ['A component that needs a clearer name', false],
         ['Acceptable if its position is correct', false],
         ['Best split once the design is complete', false]],
        'A single stated responsibility is what makes a component a component, so its absence means either conflation or decoration.'),
    ],
    checkpoint: [
      mcq('"The server talks to the cache" is described as a line rather than an interface, where naming the operations across the arrow:',
        [['Turns a diagram into a design', true],
         ['Adds detail the round does not require', false],
         ['Establishes the latency of the call', false],
         ['Determines which component owns the data', false]],
        'An arrow with a stated shape — what is asked and what comes back — makes the connection concrete and exposes gaps immediately.'),
      mcq('Candidates consistently believe the opposite of "three boxes with three reasons beats eight with none", which is why:',
        [['Over-engineering is the most common failure', true],
         ['The clarifying step is usually skipped', false],
         ['Estimates are treated as optional', false],
         ['Trade-offs are stated without their costs', false]],
        'Believing that more components signal more competence produces exactly the diagram the round penalises.'),
    ],
  },
  {
    unitCode: 'T4_SD_FUNDAMENTALS_DATA_AND_STORAGE',
    notes: `**What is stored, in what shape, and the access pattern that decides the answer.**

## The question that actually decides it

**How will this data be read?**

**Not "which database is better".** There is no answer to that, and a candidate who has one is
about to defend a preference as though it were a conclusion.

## The access patterns and what each implies

**By key, one item at a time.** Any store does this. A key-value store does it fastest and does
nothing else.

**By relationship — "all orders for this customer, with the product names".** **Relational.** The
joins are the reason the category exists, and doing them by hand in application code is the cost of
choosing otherwise.

**By a varying shape, where every record has different fields.** **Document.** Forcing a fixed
schema onto genuinely irregular data produces a table of mostly-null columns.

**By text search across a body of content.** Full-text in a relational database up to a point,
then a search engine — and **knowing where that point roughly is matters more than knowing the
engine's name.**

**By range over time — "everything in the last hour".** Time-ordered data with an index on the
timestamp, and a retention policy, because this is the category that grows without limit.

## The rough sizes worth carrying

**A short text record is around a kilobyte.** **An image is a few hundred kilobytes to a few
megabytes.** **A database row with a few columns is hundreds of bytes.**

**Three figures**, and they support almost any storage estimate this round asks for. Items times
size times retention, and the answer is an order of magnitude rather than a number.

## Files

**Files go in object storage, not in the database.** A blob column works and stops working —
backups grow, replication slows, and the database is doing a job something cheaper does better.

**Saying that unprompted is a depth marker**, because it is a mistake almost every candidate has
made in a project.

## The consistency question

**"Can this be slightly stale?"**

**Answering it per piece of data rather than for the whole system is the mature version.** A
follower count can lag; a payment balance cannot, and a design that treats them the same has not
been thought about.`,
    mcqs: [
      mcq('"Which database is better" has no answer, and a candidate who has one is about to:',
        [['Defend a preference as though it were a conclusion', true],
         ['Choose correctly for the common case', false],
         ['Save time on the clarifying questions', false],
         ['Miss a requirement stated in the brief', false]],
        'The choice follows from the access pattern, so a fixed answer means the requirements are not being consulted.'),
      mcq('Choosing a document store for relational data costs:',
        [['Doing the joins by hand in application code', true],
         ['More storage for the same information', false],
         ['The ability to index individual fields', false],
         ['Support for transactional updates', false]],
        'The joins still have to happen; what changes is whether the database performs them or the application does.'),
    ],
    checkpoint: [
      mcq('A blob column works and stops working because backups grow, replication slows, and the database is:',
        [['Doing a job something cheaper does better', true],
         ['Unable to store binary data reliably', false],
         ['Limited in the size of a single row', false],
         ['Required to validate the file contents', false]],
        'Object storage serves bytes at a fraction of the cost and complexity, so the database is spending its expensive capabilities on a simple task.'),
      mcq('Answering "can this be slightly stale?" per piece of data rather than for the whole system is the mature version because a follower count can lag and:',
        [['A payment balance cannot', true],
         ['A search index should be rebuilt nightly', false],
         ['User profiles change infrequently', false],
         ['Cached data expires on a fixed schedule', false]],
        'Different data has different tolerance, and a design applying one answer to all of it has not examined the question.'),
    ],
  },
  {
    unitCode: 'T4_SD_FUNDAMENTALS_SCALING_AND_FAILURE',
    notes: `**The bottleneck, the single point of failure, and the honest answer about what you
would do at ten times the load.**

## Why the round asks for a number first

**Because the numbers decide the design.** A system with a thousand users and one with ten million
are different systems, and a candidate who designs the same thing for both has not understood
that.

## The estimate, out loud, thirty seconds

**Round aggressively.** "A million users, each doing ten actions a day, is ten million requests a
day. Divided by a hundred thousand seconds — the real figure is eighty-six thousand and the
approximation is fine — is a hundred per second average. Peak maybe five times that, so five
hundred."

**That number changes the design.** Five hundred a second is one server and a database. Fifty
thousand is a different conversation.

**Precision is the error.** Nobody wants 11.574 requests per second, and a minute spent on
arithmetic that does not change the design is a minute lost.

**And the read-to-write ratio decides more than any other number**, because a read-heavy system is
built around caching and a write-heavy one is not.

## Naming the bottleneck

**The first thing that breaks, not a list of everything that eventually would.**

**In most student-scale systems it is one of three:** a query with no index, work done inside the
request that should be queued, or a single database handling all reads.

**Saying which, and why, is the answer.** "Reads are a hundred times writes and every one hits the
database, so the database saturates first."

## The single point of failure

**"What happens if this box dies?"** — asked of each one.

**One server: everything stops.** **One database: everything stops, and data may be lost.**
**Cache dies: every read goes to the database, which may or may not survive it.**

**That last case is the interesting one**, and walking it is what distinguishes a candidate who has
thought about failure from one who has only thought about load.

## The honest answer at ten times

**One concrete step, not a rewrite.** "Add a cache in front of the reads. That takes the database
from twelve hundred a second to maybe fifty."

**A rewrite skips the diagnosis**, and the diagnosis is the thing being assessed.`,
    mcqs: [
      mcq('The read-to-write ratio decides more than any other number because a read-heavy system is built around caching and a write-heavy one is:',
        [['Not', true],
         ['Cached at a different layer instead', false],
         ['Easier to scale horizontally', false],
         ['Better served by a document store', false]],
        'Caching accelerates repeated reads, so a workload dominated by writes gains little from it and the design goes elsewhere.'),
      mcq('Spending a minute on precise arithmetic is a minute lost because:',
        [['The order of magnitude is the answer', true],
         ['The inputs were estimates in any case', false],
         ['Interviewers do not check the arithmetic', false],
         ['The numbers change as the design evolves', false]],
        'Only the scale affects which components are needed, so additional decimal places add cost without adding information.'),
    ],
    checkpoint: [
      mcq('The cache failing is described as the interesting single-point-of-failure case because walking it distinguishes a candidate who has thought about failure from one who has only thought about:',
        [['Load', true],
         ['The happy path through the system', false],
         ['Which components are most expensive', false],
         ['How the data is structured', false]],
        'A cache outage converts normal traffic into a database flood, which is a failure consequence rather than a capacity question.'),
      mcq('The answer at ten times the load is one concrete step rather than a rewrite because a rewrite:',
        [['Skips the diagnosis', true],
         ['Costs more than the growth justifies', false],
         ['Assumes the bottleneck is architectural', false],
         ['Cannot be described in the time available', false]],
        'Identifying what breaks first is what is being assessed, and replacing the system proposes a solution without establishing the problem.'),
    ],
  },
  {
    unitCode: 'T4_SD_FUNDAMENTALS_PRACTICE',
    notes: `**A one-line brief taken to components, data, APIs and a stated failure point.**

## The three briefs

**A URL shortener.** Read-heavy caching, ID generation, a simple data model.

**An image upload and serving service.** Object storage, a CDN, a background job for thumbnails.

**A notification system.** A queue, retries, and the eventual-consistency conversation.

**Between them they cover most of what a placement round asks**, and a candidate comfortable with
all three is prepared for the format rather than for those three problems.

## The twenty minutes

**Three clarifying, five sketching, five walking a request, five on the bottleneck, two on a
trade-off.**

**Keeping to that division is the practice.** Candidates who sketch for fifteen minutes never reach
the bottleneck, which is where the round's depth is.

## The partner's job

**Ask "why is that there?" about every box.** **Ask "what does that arrow carry?"** **Ask "what
breaks first?"** **Ask "what if it were ten times bigger?"**

**Four questions, no technical knowledge needed.**

## What to record

**Whether requirements were clarified before drawing.** **How many boxes had no stated reason.**
**How many arrows had no stated payload.** **Whether a number was produced.** **Whether the
bottleneck was named without prompting.**

## The self-check

**Cover the diagram and describe the request path from memory.** If you cannot, the design is a
collection of components rather than a system — which is exactly what the walk-through in the round
would expose.

## Frequency

**Three sessions, one per brief.** Then one repeat of whichever went worst. The format converges
faster than most candidates expect, because the steps are fixed and the improvement is in following
them rather than in knowing more.`,
    mcqs: [
      mcq('Candidates who sketch for fifteen minutes never reach the bottleneck, which is where:',
        [['The round’s depth is', true],
         ['The interviewer expects the most detail', false],
         ['The trade-off discussion usually starts', false],
         ['The clarifying questions become relevant', false]],
        'Naming what fails first and what to do about it is the substantive part, and an over-long sketch consumes the time it needs.'),
      mcq('A candidate comfortable with all three briefs is prepared for:',
        [['The format rather than for those three problems', true],
         ['The majority of questions actually asked', false],
         ['Senior design rounds as well as placement ones', false],
         ['Any read-heavy system they might be given', false]],
        'The three exercise different component sets, so what generalises is the process rather than the specific architectures.'),
    ],
    checkpoint: [
      mcq('If you cannot describe the request path with the diagram covered, the design is:',
        [['A collection of components rather than a system', true],
         ['Too complex for the problem as stated', false],
         ['Missing a component that was required', false],
         ['Drawn in an order that obscures the flow', false]],
        'A system is defined by how the pieces connect, so an unrecallable path means the connections were never established.'),
      mcq('The format converges faster than candidates expect because the steps are fixed and the improvement is in:',
        [['Following them rather than knowing more', true],
         ['Practising a wider range of systems', false],
         ['Learning the standard component set', false],
         ['Reducing the time spent on each step', false]],
        'The procedure is short and explicit, so adherence rather than additional knowledge produces most of the gain.'),
    ],
  },
  {
    unitCode: 'T4_SD_FUNDAMENTALS_INTERVIEW_QUESTION',
    notes: `**"Design a URL shortener."** The canonical question, worked through as the round would
run it.

## Clarify — three minutes

**"Shorten a URL and redirect. Custom aliases? Analytics? Expiry?"**

**"How many? A million new links a day, say."**

**"Reads heavily dominate — a link is created once and followed many times. Redirects must be fast;
creation can take a moment."**

**Then say it back**, which establishes the contract everything afterwards is answerable against.

## Estimate — one minute

**A million writes a day is about twelve a second. Reads at a hundred to one is twelve hundred a
second, peak maybe five thousand.**

**Storage: a million links a day at half a kilobyte is five hundred megabytes a day — under two
hundred gigabytes a year.**

**That number decides things.** Twelve writes a second is one database. Five thousand reads a
second is a cache.

## Sketch — five minutes

**Client, server, database.** Then a **cache** in front of the lookup, because reads dominate and a
redirect target does not change — **which is the ideal case for a cache, since the staleness
problem that usually accompanies one does not arise.**

**The ID.** A counter encoded in base sixty-two gives short, sequential, guessable codes; a random
string avoids guessability at the cost of a collision check. **Naming the trade is the answer**, and
either choice is defensible once the trade is stated.

## Walk — five minutes

**Create:** validate, generate the code, store, return. **Redirect:** cache, then database on a
miss, populate the cache, redirect.

**Failure:** cache down means every read hits the database — twelve hundred a second is survivable
on one database, uncomfortably.

## Bottleneck — five minutes

**Read volume on the database, and the cache is the answer.** After that the write path, and after
that the single database.

## What loses the round

**Opening with sharding.** Twelve writes a second does not need it, and proposing it demonstrates
that the estimate was not used — which is the thing the estimate exists for.`,
    mcqs: [
      mcq('Opening with sharding loses the round because twelve writes a second does not need it, which demonstrates that:',
        [['The estimate was not used', true],
         ['The candidate misread the requirements', false],
         ['The design was copied from a reference', false],
         ['Write throughput was overestimated', false]],
        'The number exists precisely to size the design, so a proposal contradicting it shows the calculation did not inform anything.'),
      mcq('Between a base-sixty-two counter and a random string, either choice is defensible once:',
        [['The trade is stated', true],
         ['The expected volume is known', false],
         ['The collision probability is calculated', false],
         ['The storage format has been chosen', false]],
        'One gives short sequential guessable codes and the other avoids guessability at the cost of a collision check, and naming that is the answer.'),
    ],
    checkpoint: [
      mcq('A redirect target not changing makes this the ideal case for a cache because:',
        [['The staleness problem that usually accompanies one does not arise', true],
         ['The cache can be smaller than normal', false],
         ['Invalidation happens automatically on write', false],
         ['Reads and writes can share the same path', false]],
        'An immutable value can be cached indefinitely, which removes the invalidation question that is otherwise the cache’s main cost.'),
      mcq('Saying the requirements back establishes the contract, so anything designed afterwards is answerable against:',
        [['What was agreed rather than what was privately assumed', true],
         ['A written record of the conversation', false],
         ['The standard scope for that problem', false],
         ['The numbers produced during estimation', false]],
        'The restatement makes the interviewer’s expectations explicit, which removes the mismatch that otherwise surfaces at the end.'),
    ],
  },

  /* ══ T4_SD_INTERVIEW ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SD_INTERVIEW_FROM_ONE_LINE_TO_A_DESIGN',
    notes: `**Clarifying questions first, scope second, design third — and why starting at the
database loses the round.**

## The one line is deliberately vague

**"Design a system to store and serve images."**

**The vagueness is the first test.** A candidate who starts drawing has skipped the step where the
requirements are established, and the design that results solves a problem nobody specified.

## The three questions

**"What does it actually need to do?"** The two or three core operations, and explicitly what is out
of scope. "Upload and serve. Not editing, not albums, unless you want those."

**"How big is it?"** Users, requests, data volume. **This produces the number** the design will be
justified by.

**"Read-heavy or write-heavy, and what can be slow?"** **The single most design-changing question
available**, because the answer determines whether the system is built around caching or around
write throughput.

## Then say it back

"So: upload and serve images, a hundred thousand uploads a day, serving dominates heavily, serving
must be fast, upload processing can take a few seconds."

**Twenty seconds, and it establishes the contract.**

## Why starting at the database loses it

**Because the schema is the last decision, not the first.**

**It depends on the access pattern, which depends on the operations, which depend on the
requirements** — so a candidate who opens with tables has committed to a data model before knowing
what will read it, and every subsequent decision inherits that commitment.

**It also reads as a remembered answer**, because a remembered design starts wherever the reference
started.

## Scoping down deliberately

**"I will design the core path first and add thumbnails if there is time"** is a legitimate and
strong move.

**Twenty minutes does not cover everything**, and choosing what to cover is a design decision the
interviewer is watching you make.

## The failure

**Assuming scale.** Designing for ten million users when asked about a system serving a thousand
demonstrates that the requirements did not influence the design — which is the opposite of what the
round is looking for.`,
    mcqs: [
      mcq('"Read-heavy or write-heavy, and what can be slow?" is the single most design-changing question because the answer determines whether the system is built around:',
        [['Caching or write throughput', true],
         ['A relational or a document database', false],
         ['Synchronous or batch processing', false],
         ['One server or several behind a balancer', false]],
        'A read-dominated workload is served by caching layers, where a write-dominated one requires the write path to scale instead.'),
      mcq('Starting at the database loses the round because the schema depends on the access pattern, which depends on the operations, which depend on the requirements — so opening with tables commits to a data model:',
        [['Before knowing what will read it', true],
         ['That is usually too normalised', false],
         ['Without considering the storage cost', false],
         ['The interviewer has not approved', false]],
        'Every subsequent decision then inherits a commitment made without the information that should have determined it.'),
    ],
    checkpoint: [
      mcq('Designing for ten million users when asked about a system serving a thousand demonstrates that:',
        [['The requirements did not influence the design', true],
         ['The candidate prefers scalable architectures', false],
         ['The estimate was calculated incorrectly', false],
         ['Future growth was being accounted for', false]],
        'A design unchanged by the stated scale was produced from a template rather than derived, which is the opposite of what is assessed.'),
      mcq('Opening with tables also reads as a remembered answer because a remembered design:',
        [['Starts wherever the reference started', true],
         ['Contains more detail than the round needs', false],
         ['Uses terminology the candidate cannot explain', false],
         ['Omits the components specific to this problem', false]],
        'The starting point is inherited from the source rather than chosen from the problem, which is audible to the interviewer.'),
    ],
  },
  {
    unitCode: 'T4_SD_INTERVIEW_SAYING_THE_TRADE_OFFS',
    notes: `**There is no right answer, and pretending there is one is the failure. Naming what you
gave up.**

## The mindset the round rewards

**A design round is a conversation about trade-offs, not an exam with an answer key.**

**Candidates who believe there is a correct diagram behave in the way that loses the round** — they
over-engineer to match a remembered reference, defend rather than adapt, and skip the clarifying
step because the remembered answer did not need it.

## Saying it before being asked

**Every component you add has a cost, and naming it as you add it is what separates a design from a
diagram.**

**A cache** adds staleness and an invalidation problem. **A queue** adds eventual consistency — the
user is told it is done before it is. **More servers** add a session problem unless the servers are
stateless. **Denormalising** makes reads fast and writes consistent-by-hand.

**"I would cache the lookup. The cost is that a deleted item may still resolve for up to a minute,
which for this system I think is acceptable."**

**Two sentences. The second is the design decision**; the first on its own is a guess.

## Defending a box

**"Why is that there?" is coming for every one.** The answer is the requirement, not the
technology.

**"Because redirects must be fast" is a defence. "Because Redis is fast" is not** — the second names
a property of a tool, where the question asked what the system needed.

## When you are wrong

**"You are right, that does not work" and then adapting is a strong moment**, not a loss.

**Defending a broken design past the point of evidence is the actual failure**, and it reads as
inability to take input rather than as conviction. Collaboration under correction is part of what
the round assesses.

## The trade-offs that recur

**Consistency against availability.** **Latency against cost.** **Simplicity against
scalability** — and at placement scale, **simplicity usually wins, and saying so is a defensible
position rather than a cop-out.**

## The sentence that ends a design well

**"If this grew ten times, the first thing I would change is X, because Y."** One step, one reason.`,
    mcqs: [
      mcq('"I would cache the lookup" alone is a guess, and the second sentence — that a deleted item may still resolve for a minute, which is acceptable here — is:',
        [['The design decision', true],
         ['A caveat the interviewer may waive', false],
         ['An admission the approach is imperfect', false],
         ['Detail better left until asked', false]],
        'Accepting a named cost for a stated benefit is what makes the component a choice rather than an unexamined addition.'),
      mcq('"Because Redis is fast" is not a defence because it names a property of a tool where the question asked:',
        [['What the system needed', true],
         ['Which alternatives were considered', false],
         ['How the component would be operated', false],
         ['What the addition would cost', false]],
        'The justification must come from a requirement, since any fast tool would satisfy the property without the need being established.'),
    ],
    checkpoint: [
      mcq('Defending a broken design past the point of evidence reads as:',
        [['Inability to take input rather than conviction', true],
         ['Confidence the interviewer may respect', false],
         ['A misunderstanding of the original requirement', false],
         ['Thoroughness applied to the wrong question', false]],
        'Collaboration under correction is part of what the round assesses, so persistence against demonstrated failure scores against the candidate.'),
      mcq('At placement scale simplicity usually wins over scalability, and saying so is:',
        [['A defensible position rather than a cop-out', true],
         ['Acceptable only if the scale is very small', false],
         ['A way of avoiding the harder discussion', false],
         ['Correct but rarely what interviewers want', false]],
        'The trade is being made explicitly against the stated numbers, which is exactly the reasoning the round is looking for.'),
    ],
  },
  {
    unitCode: 'T4_SD_INTERVIEW_PRACTICE',
    notes: `**Forty-five minutes, a vague brief and somebody changing the requirements halfway
through.**

## The setup

**The partner picks a system and does not tell you in advance.** That is the condition being
practised — a rehearsed design demonstrates nothing, because the round is deliberately about an
unfamiliar problem.

**Suggestions for them:** a food delivery tracker, a library book system, an attendance system, a
polling app, a file-sharing service.

## The change, at the halfway mark

**The partner alters one requirement.** "Actually, it needs to work offline." "Actually, there are
ten times as many users." "Actually, the data is confidential."

**This is the specific skill this unit exists for.** A design that cannot absorb a changed
requirement was a remembered design, and the round frequently does this on purpose.

**What good looks like:** say what the change breaks, say what stays, change the smallest thing that
addresses it. **Not starting over**, and not pretending the change is accommodated when it is not.

## The clock, out loud

**Five clarifying. Ten sketching. Ten walking, including failure. Ten on the change. Ten on
bottleneck and trade-offs.**

**The partner calls the transitions.** Left alone, almost everybody overruns the sketch, and the
overrun eats the discussion where the depth is.

## The partner's questions

**"Why is that there?" for every box.** **"What breaks first?"** **"What did that cost you?"** **And
once, deliberately: "that will not work because of X"** — to practise adapting rather than
defending.

## What to record

**Whether clarifying happened first.** **Boxes with no stated reason.** **Whether a number was
produced and used.** **The response to the requirement change.** **The response to the deliberate
challenge.**

## Frequency

**Three or four sessions with different systems.** More produces diminishing returns — the steps are
fixed, and once they are habitual the remaining variance is in the problem rather than in you.`,
    mcqs: [
      mcq('A design that cannot absorb a changed requirement was:',
        [['A remembered design', true],
         ['Under-specified at the clarifying stage', false],
         ['Built for the wrong scale', false],
         ['Missing a component the change needed', false]],
        'A design derived from requirements adapts when they move, where a reproduced one has no reasoning to adjust.'),
      mcq('Handling the mid-round change well means saying what it breaks, saying what stays, and changing the smallest thing that addresses it — rather than:',
        [['Starting over, or pretending it is accommodated', true],
         ['Asking whether the change is realistic', false],
         ['Deferring it until the design is complete', false],
         ['Adding components to cover every case', false]],
        'Both alternatives avoid the actual work: one discards sound reasoning and the other leaves the requirement unmet while claiming otherwise.'),
    ],
    checkpoint: [
      mcq('The partner does not reveal the system in advance because a rehearsed design demonstrates nothing, the round being deliberately about:',
        [['An unfamiliar problem', true],
         ['A system the candidate has not built', false],
         ['Requirements that change during the round', false],
         ['Problems with no single correct answer', false]],
        'The process is what transfers, and practising on a known problem exercises recall of a design rather than the method.'),
      mcq('The partner calls the transitions because, left alone, almost everybody overruns the sketch, and the overrun eats:',
        [['The discussion where the depth is', true],
         ['The time needed to clarify requirements', false],
         ['The walk through a single request', false],
         ['The opportunity to handle the change', false]],
        'The sketch is visually satisfying and expands to fill the time, displacing the later steps that carry the substantive assessment.'),
    ],
  },
  {
    unitCode: 'T4_SD_INTERVIEW_INTERVIEW_QUESTION',
    notes: `**"Design a system to store and serve images."** A second worked round, with the
requirement changing halfway.

## Clarify — three minutes

**"Upload and serve. Thumbnails? Albums? Deletion? Public or private?"**

**"A hundred thousand uploads a day, images averaging two megabytes."**

**"Serving dominates heavily. Serving must be fast; upload processing can take a few seconds."**

**Say it back.**

## Estimate — one minute

**A hundred thousand uploads a day at two megabytes is two hundred gigabytes a day — seventy
terabytes a year.**

**That number decides the storage immediately.** Seventy terabytes a year does not go in a database,
and saying so at this point rather than after drawing one is the difference.

## Sketch — five minutes

**Client, server, object storage, database for metadata.**

**The database holds the record — owner, filename, size, the storage key. The bytes live in object
storage.** That split is the central decision and it comes straight from the number.

**A CDN** in front of serving, because serving dominates and images are static. **A queue and a
worker** for thumbnails, because processing takes seconds and the upload response should not wait.

## Walk — five minutes

**Upload:** validate, write to object storage, write the metadata row, enqueue the thumbnail job,
return. **Serve:** CDN, then object storage on a miss.

**Failure:** the worker dies and thumbnails stop appearing while uploads keep working — **a partial
failure rather than an outage, which is what the queue bought.**

## The change — "actually, images are private"

**What breaks:** the CDN was serving public URLs, and anybody with a link could read anything.

**What stays:** the upload path, the storage split, the thumbnail job.

**The smallest change:** signed time-limited URLs, so the server authorises and the CDN still
serves the bytes.

**Naming what stays is as important as naming what changes**, because it demonstrates the design was
reasoned rather than reproduced.

## The trade-off to state

**Signed URLs mean the server is on the authorisation path for every image**, which costs a request
it did not previously make. For this system, acceptable.`,
    mcqs: [
      mcq('Seventy terabytes a year does not go in a database, and saying so at the estimate rather than after drawing one is:',
        [['The difference', true],
         ['A detail the interviewer will raise anyway', false],
         ['Only relevant if deletion is out of scope', false],
         ['Less important than the metadata design', false]],
        'The number drives the storage decision, so producing it first makes the choice derived where producing it later makes it a correction.'),
      mcq('The worker dying means thumbnails stop appearing while uploads keep working, which is:',
        [['A partial failure rather than an outage, which is what the queue bought', true],
         ['A sign the queue should be replicated', false],
         ['An argument for processing inline instead', false],
         ['Acceptable only if retries are configured', false]],
        'Decoupling the slow work means its failure degrades one feature rather than stopping the whole upload path.'),
    ],
    checkpoint: [
      mcq('When the images become private, naming what stays is as important as naming what changes because it demonstrates the design was:',
        [['Reasoned rather than reproduced', true],
         ['Correct in its original form', false],
         ['Built with the change anticipated', false],
         ['Simpler than the alternatives considered', false]],
        'Identifying precisely which decisions survive the new requirement shows each one was made for a reason that still holds.'),
      mcq('The stated cost of signed URLs is that the server is on the authorisation path for every image, which costs:',
        [['A request it did not previously make', true],
         ['The ability to cache at the edge', false],
         ['Additional storage for the tokens', false],
         ['Compatibility with the thumbnail worker', false]],
        'Authorisation now happens per access rather than not at all, which is the price paid for the privacy requirement.'),
    ],
  },
  {
    unitCode: 'T4_SD_INTERVIEW_CHECKPOINT',
    notes: `**Whether an unfamiliar design problem is handleable in twenty minutes.**

## The bar

**A system you have not seen, on paper, with somebody asking:**

**Clarified before drawing, with the requirements said back.** **A number produced and used to
justify something.** **Every box tied to a requirement and every arrow given a payload.** **One
request and one failure walked.** **The first bottleneck named unprompted.** **A trade-off with its
cost.** **And a sensible response when a requirement changes or something is challenged.**

**Seven behaviours, all observable, none requiring the "correct" architecture.**

## What a weak result means

**Drew first**: thirty seconds of habit, and the highest-leverage change in the module.

**Unjustified boxes**: the rule, applied. Every box names its requirement out loud as it is drawn.

**No number**: the estimate skipped, which leaves every later justification unsupported.

**Failure path not walked**: the most commonly missing of the seven, and the one that most
distinguishes when present.

**Froze on the change**: three rehearsals, and it converges.

## The mindset worth carrying in

**The round is a conversation about trade-offs, not an exam with an answer key.**

**Candidates who believe there is a correct diagram behave in the way that loses the round.**

## What this feeds

**Every design round**, **mock 2's design portion**, **P23's technical simulation**, and **the
architecture questions in a project deep-dive**, which are the same skill applied to a system you
have already built.`,
    checkpoint: [
      mcq('Walking the failure path is the most commonly missing of the seven behaviours and the one that:',
        [['Most distinguishes when present', true],
         ['Takes the longest to complete properly', false],
         ['Requires the most technical knowledge', false],
         ['Depends on the system being chosen', false]],
        'Its rarity means a candidate who does it stands out, and it demonstrates thinking about the system under adverse conditions.'),
      mcq('The seven behaviours are all observable and none requires:',
        [['The "correct" architecture', true],
         ['More than twenty minutes to demonstrate', false],
         ['Prior experience with the system type', false],
         ['A technically informed observer', false]],
        'Each is a property of how the problem is approached, which is what the round scores rather than the diagram produced.'),
      mcq('"No number produced" is weak because the estimate being skipped leaves:',
        [['Every later justification unsupported', true],
         ['The storage requirements undetermined', false],
         ['The interviewer unable to follow the design', false],
         ['The bottleneck impossible to identify', false]],
        'Components are justified by scale, so without a quantity the reasons for adding them rest on nothing.'),
      mcq('"Drew first" is described as the highest-leverage change in the module because the fix is:',
        [['Thirty seconds of habit', true],
         ['A rule about component justification', false],
         ['Practice with several more systems', false],
         ['Knowing the standard clarifying questions', false]],
        'Three questions before the pen moves changes everything downstream, at almost no cost in time.'),
    ],
  },
];
