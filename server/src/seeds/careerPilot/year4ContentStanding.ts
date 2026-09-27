/**
 * T4_STANDING and T4_PLACEMENT_PLAN — eight units. Module P01.
 *
 * ── WHAT THIS MODULE IS, AND WHAT IT REFUSES TO BE ────────────────────────────────────────
 *
 * The first two days of Year 4, and neither of them teaches anything. T4_STANDING is four
 * measurements and a checkpoint; T4_PLACEMENT_PLAN is the student reading their own result.
 *
 * That is deliberate and it is the spec's own rule: "academic year does not prove mastery; use
 * Skill DNA and evidence." A module that opened by teaching would have decided in advance what
 * this student is missing, and the entire remaining 149 days are built on not doing that.
 *
 * ── SO THE CHECKS ARE PRACTICE UNITS, NOT LESSONS ─────────────────────────────────────────
 *
 * Each of the four carries real work — a program to write, questions to answer — because a
 * measurement a student can pass by reading is not a measurement. What they must NOT carry is
 * instruction, so none of them explains how to do the thing before asking for it. A student who
 * cannot do it has learned something true about themselves, which is the point, and the bridge
 * exists for exactly that student.
 *
 * ── THE NOTES SAY WHAT IS BEING MEASURED, ON PURPOSE ──────────────────────────────────────
 *
 * Not how to do it. Telling somebody "this checks whether you can pick a structure from the
 * access pattern" costs nothing — they either can or cannot — and it stops the exercise feeling
 * like a trap. A diagnostic that hides its own criteria produces anxiety rather than evidence.
 *
 * Attribution: T4_STANDING defaults to PROGRAMMING_FUNDAMENTALS and T4_PLACEMENT_PLAN to
 * PLACEMENT_READINESS. Both topics declare two skills, so both are in year4SkillAttribution.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const STANDING_BUNDLES: PilotBundle[] = [
  /* ══ T4_STANDING ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_STANDING_PROGRAMMING_CHECK',
    notes: `**This is a measurement, not a lesson.** Nothing here explains how to do the work,
because the answer we need is whether you already can.

## What is being checked

**Whether you can hold a whole small problem in your head.** Read input, compute something over
all of it, and print a result that depends on every line rather than on the last one.

**Whether you reach for the right container without thinking about it.** A running total is a
number. A lookup is a dictionary. Membership is a set. If you find yourself writing a loop
inside a loop to answer "have I seen this before", that is worth knowing now rather than in an
interview.

**Whether your functions return.** A function that prints instead of returning cannot be reused,
cannot be tested, and is the single most common structural habit that separates second-year code
from fourth-year code.

## What happens with the result

**Nothing punitive.** A low result opens the ten-day bridge, which is ten days at most and only
covers what is actually missing. A high result skips it entirely and spends those days on the
engineering build instead.

**The one thing that would waste your year is guessing.** Somebody who is quietly shaky on
functions and gets carried past them by an optimistic self-assessment meets that gap again in
week eleven, with no time to fix it.

## How long to spend

**Fifty minutes, and stop when the time is up.** An unfinished answer is data. A finished answer
that took three hours is not.`,
    mcqs: [
      mcq('You need to know whether a value has appeared earlier in a list of a million items. The structure that answers this in constant time is:',
        [['A set, because membership is exactly what it indexes for', true],
         ['A list, because it preserves the original ordering of items', false],
         ['A sorted list, because ordering makes the scanning much faster', false],
         ['A tuple, because immutability lets it be cached by the runtime', false]],
        'A set hashes its members, so "is this in here" costs the same whether it holds ten items or ten million. A list has to walk it.'),
      mcq('A function ends with print(total) rather than return total. The first thing this actually prevents is:',
        [['Using the result anywhere else in the program at all', true],
         ['Calling the function more than one time in a program', false],
         ['Passing more than a single argument into that function', false],
         ['Running the function from inside a different module file', false]],
        'Printing sends the value to the screen and nowhere else. The caller receives None, so nothing downstream can use what was computed.'),
      mcq('You must compute an average over input and then report which items are above it. The minimum number of passes over the data is:',
        [['Two, because the average is not known until the end', true],
         ['One, if you keep a running total as you go along', false],
         ['One, because averages can be updated incrementally', false],
         ['Three, one to count, one to total, one to compare', false]],
        'You cannot know whether an early item is above the average until every item has been seen, so the comparison needs a second pass.'),
    ],
    coding: [
      {
        title: 'Above the average',
        description: `Read lines of \`name score\` from input. Work out the average score, then
print the name of every student whose score is strictly above it, one per line, in the order they
appeared. Finally print \`above=N\` where N is how many names you printed.

Scores are whole numbers. There is at least one line.`,
        starter: `import sys

rows = [line.split() for line in sys.stdin if line.split()]
# Each row is [name, score]. Score is a string — convert it.
`,
        language: 'python',
        tests: [
          { input: 'alice 10\nbob 20\ncara 30\n', expectedOutput: 'cara\nabove=1' },
          { input: 'a 5\nb 5\n', expectedOutput: 'above=0' },
          { input: 'x 1\ny 2\nz 3\nw 4\n', expectedOutput: 'z\nw\nabove=2', isHidden: true },
        ],
      },
    ],
  },
  {
    unitCode: 'T4_STANDING_ENGINEERING_CHECK',
    notes: `**Four things every Year-4 module sits on top of**, checked rather than assumed.

## Git

**Not "have you used GitHub".** Whether you can work on a branch, merge it back, and say what
happened when two branches touched the same lines. The question that separates people is what
you did the last time a merge conflicted.

## Testing

**Whether you can write a test that fails for the right reason.** A test that passes before the
fix is not a test, it is a comment. The check is whether you write the failing case first or
whether you write code and then write a test that agrees with it.

## SQL

**A join across two tables, and reading the result honestly.** Most people can write the query.
Rather fewer notice when it has returned more rows than there are customers, which means the
join condition was wrong and the total is now inflated.

## HTTP

**Reading a status code as information.** A request that returned 401 and a request that returned
500 have failed in completely different ways, and the code said so. Code that treats every
non-200 the same has thrown that away.

## What is being measured

**Working knowledge, not vocabulary.** Every question here is about what you would do, not what
something is called.`,
    mcqs: [
      mcq('A join between customers and orders returns more rows than there are customers. The most likely explanation is:',
        [['A customer has several orders, so their row repeats', true],
         ['The join was written as a left join rather than inner', false],
         ['The orders table contains duplicated primary key values', false],
         ['The database has not been given an index on that key', false]],
        'An inner join produces one row per matching pair. A customer with three orders appears three times, which is correct and surprising.'),
      mcq('An API call returns 401. Retrying the identical request is:',
        [['Pointless, because the credentials will still be wrong', true],
         ['Sensible, because the failure may well be a transient one', false],
         ['Required, because the specification asks clients to retry', false],
         ['Harmless, because a 401 never changes any server state', false]],
        '4xx means the request itself was wrong. Nothing about repeating it unchanged makes the credentials acceptable the second time.'),
      mcq('You fix a bug and then write a test for it. The way to tell the test is real is:',
        [['Undo the fix and confirm the new test now fails', true],
         ['Check that the test runs faster than the others do', false],
         ['Confirm the test passes on every supported platform', false],
         ['Check that the test covers every line of the function', false]],
        'A test written after a fix can easily assert what the code already does. Reverting the fix is the only thing that proves it would have caught the bug.'),
      mcq('Two branches changed the same function and the merge conflicted. The thing that is NOT safe to do is:',
        [['Keep whichever side is yours and move on quickly', true],
         ['Read both sides and write a version containing both', false],
         ['Ask the other author what their change was meant to do', false],
         ['Run the tests after resolving and before committing it', false]],
        'Taking your own side discards somebody else’s change silently. The tests may still pass, because the deleted work had its own tests removed with it.'),
    ],
    coding: [
      {
        title: 'Reading status codes as information',
        description: `Read HTTP status codes, one per line. For each, print \`<code> <class>\`
where class is \`ok\` for 200-299, \`redirect\` for 300-399, \`client\` for 400-499 and \`server\`
for 500-599.

Then print \`retry=N\`, where N is how many of them were server errors — the only class where
repeating the identical request is worth doing.`,
        starter: `import sys

codes = [int(line) for line in sys.stdin if line.strip()]
`,
        language: 'python',
        tests: [
          { input: '200\n404\n500\n301\n', expectedOutput: '200 ok\n404 client\n500 server\n301 redirect\nretry=1' },
          { input: '502\n503\n200\n', expectedOutput: '502 server\n503 server\n200 ok\nretry=2' },
          { input: '204\n302\n418\n', expectedOutput: '204 ok\n302 redirect\n418 client\nretry=0', isHidden: true },
        ],
      },
    ],
  },
  {
    unitCode: 'T4_STANDING_CORE_CS_CHECK',
    notes: `**The written round opens with core CS**, and it is the part people revise last and
lose most often.

## Complexity, as a habit

**Not the definition.** Whether you can look at your own loop and say what it costs, immediately,
without being asked. In an interview, volunteering the complexity before the follow-up arrives is
worth more than reaching it afterwards.

## Choosing a structure

**From the operations, not from familiarity.** The question is never "which structure is
fastest". It is "which operation does this problem perform a hundred thousand times", and the
structure follows from the answer.

## Operating systems and networking

**At the depth a written round asks.** A process against a thread, what the scheduler is for,
what happens between typing a URL and seeing a page. Not the textbook chapter — the version you
could say out loud in ninety seconds.

## Databases

**Normalisation appears in every paper.** So do keys, indexes and transactions. The check is
whether you can say what an index costs as well as what it saves.

## What is being measured

**Whether the understanding is load-bearing.** Definitions recalled from a book collapse under
one follow-up. The questions here all ask what would happen, not what something is.`,
    mcqs: [
      mcq('A loop over n items contains a lookup in a dictionary of n items. The total cost is:',
        [['Linear, because a dictionary lookup is constant time', true],
         ['Quadratic, because there is a lookup inside of a loop', false],
         ['Linear only when the dictionary is sorted beforehand', false],
         ['Quadratic, because the dictionary must be rehashed once', false]],
        'Nesting alone does not make something quadratic. A constant-time operation inside a linear loop stays linear overall.'),
      mcq('An index is added to a column. The cost that is easy to forget is:',
        [['Every write to that table now costs more time', true],
         ['Reads on other columns of the table get slower', false],
         ['The table can no longer be joined to another one', false],
         ['The column can no longer hold any null values now', false]],
        'An index is a second structure the database maintains. Every insert, update and delete has to keep it correct, which is paid on writes.'),
      mcq('Two threads in one process differ from two processes chiefly in that threads:',
        [['Share memory, so they can corrupt each other', true],
         ['Are scheduled by the program rather than the system', false],
         ['Always run on separate cores of the same machine', false],
         ['Cannot be interrupted once they have started running', false]],
        'Shared address space is the whole difference in practice: it makes communication cheap and makes data races possible.'),
      mcq('You need the smallest item repeatedly, and items keep arriving. The right structure is:',
        [['A heap, which keeps the smallest cheap to reach', true],
         ['A sorted list, resorted whenever an item arrives', false],
         ['A dictionary keyed on the value of each of the items', false],
         ['A queue, because items are arriving one at a time', false]],
        'Re-sorting on every arrival is n log n each time. A heap gives the minimum in constant time and an insert in log n.'),
    ],
    coding: [
      {
        title: 'The first repeat',
        description: `The first line is \`n\`. The second line holds n whitespace-separated
whole numbers.

Print the first value that appears for a second time, reading left to right. If no value repeats,
print \`none\`.

The list may be large, so a nested loop is not the intended answer.`,
        starter: `import sys

data = sys.stdin.read().split()
n = int(data[0])
values = [int(v) for v in data[1:1 + n]]
`,
        language: 'python',
        tests: [
          { input: '5\n1 2 3 2 1\n', expectedOutput: '2' },
          { input: '3\n1 2 3\n', expectedOutput: 'none' },
          { input: '6\n4 5 6 7 5 4\n', expectedOutput: '5', isHidden: true },
        ],
      },
    ],
  },
  {
    unitCode: 'T4_STANDING_PROJECT_COMMS_CHECK',
    notes: `**Five minutes on something you built.** No slides, no notes, no preparation time.

## What you are asked for

**What it was for.** Who had the problem, and what they did before your thing existed.

**How it worked.** The three or four moving parts and what each one was responsible for.

**What went wrong.** The hardest bug, how you found it, and what the cause turned out to be.

**What you would change.** Not "nothing" — that answer ends the conversation and is never true.

## Why this is the check that surprises people

**Because it is the one that cannot be revised for.** Everything else in this module has a right
answer you either know or do not. This one exposes whether you actually built the thing or
assembled it from tutorials, and it exposes it within about ninety seconds.

**The tell is the bug question.** Somebody who built it has a war story and tells it with
specifics — the symptom, the wrong first guess, the thing that finally showed the cause.
Somebody who followed a guide describes the feature instead.

## What a weak result means

**That the explaining is missing, not the ability.** These are separable and the second one is
learnable in weeks. But an unexplainable project is worth nothing in a project round, and the
project round is where most technically strong candidates lose their offer.`,
    mcqs: [
      mcq('An interviewer asks about the hardest bug in your project. An answer describing what the feature does instead suggests:',
        [['The candidate may not have debugged it themselves', true],
         ['The candidate is nervous and has misheard the question', false],
         ['The project was probably too simple to contain any bugs', false],
         ['The interviewer asked the question in an unclear fashion', false]],
        'Anybody who debugged something remembers the investigation. Describing the feature is what somebody who followed a tutorial has available to say.'),
      mcq('Asked what you would change about your own project, answering "nothing" is weak because:',
        [['Every real system has known compromises in it', true],
         ['It suggests the project was finished far too quickly', false],
         ['Interviewers are required to ask a follow-up question', false],
         ['It implies the candidate did not test it very thoroughly', false]],
        'Knowing where your own work is weak is the thing being tested. "Nothing" reads as either not having looked or not being able to tell.'),
      mcq('The strongest way to describe a technology choice in your project is to:',
        [['Name the alternative you rejected and why', true],
         ['Explain how widely the technology is used elsewhere', false],
         ['Describe how long the technology took you to learn it', false],
         ['State that it was the one the tutorial had recommended', false]],
        'A choice implies alternatives. Being able to name the one you did not take is what makes it a decision rather than a default.'),
      mcq('You are five minutes into explaining and the interviewer looks lost. The best response is to:',
        [['Stop and ask which part is unclear to them', true],
         ['Carry on, because stopping partway looks unprepared to them', false],
         ['Start again from the very beginning, more slowly this time', false],
         ['Move to the next section and hope the confusion resolves', false]],
        'Noticing your listener and adjusting is part of what a communication round measures. Continuing regardless is the failure it is looking for.'),
    ],
  },
  {
    unitCode: 'T4_STANDING_CHECKPOINT',
    notes: `**Where the placement year starts for you.**

## What the four checks together say

**Programming and engineering** decide whether the ten-day bridge opens at all. Strong on both
and it does not: those days go to the engineering build instead.

**Core CS** decides how much of the written-round practice you need early rather than late. It
is the area where a gap is cheapest to close and most expensive to leave.

**Projects and communication** decide how much of the interview work is rehearsal and how much is
repair. These are the slowest to move, which is why they are measured on day one rather than in
month four.

## What this does not decide

**Your direction.** That is day 21, and it is decided on evidence you have not finished producing.

**Whether you are ready.** Nobody is, on day one of a placement year. The question this answers
is only where to start.

## What to do with a result you dislike

**Read it as a starting point and not as a verdict.** A student who arrives weak on three of four
and works the plan finishes stronger than one who arrives strong and coasts, and the plan is built
on the assumption that you will.`,
    checkpoint: [
      mcq('A student scores strongly on programming and engineering but weakly on core CS. The plan should:',
        [['Skip most of the bridge and front-load written practice', true],
         ['Run the full ten-day bridge to be safe about the gaps', false],
         ['Leave core CS until the written rounds are approaching', false],
         ['Treat the core CS result as noise and continue as normal', false]],
        'The bridge repairs programming fundamentals, which are not the gap here. Core CS is, and it is cheapest to close early and dearest to leave.'),
      mcq('A student finished the programming check in fifteen minutes with everything correct. The honest reading is:',
        [['The bridge would be ten days spent on nothing', true],
         ['The exercises given were too easy to tell us much', false],
         ['They should still do the bridge to keep it all fresh', false],
         ['They are ready for interviews and can skip most days', false]],
        'That is what the check is for: evidence that the fundamentals are in place, which is exactly the case the bridge is meant not to open for.'),
      mcq('A student explains their project fluently but cannot describe any bug in it. The most useful next step is:',
        [['Treat the project as unverified until they can', true],
         ['Accept the fluency, since explaining well is the point', false],
         ['Ask them to build an entirely new project from scratch', false],
         ['Move them straight to the mock interview series early', false]],
        'Fluency without a debugging account is the pattern of somebody who assembled rather than built. It is a question about the evidence, not about their ability.'),
      mcq('Two students get identical overall scores by different routes: one strong technically and weak at explaining, one the reverse. Their plans should:',
        [['Differ substantially, because the gaps are different', true],
         ['Be the same, because the overall score is the same one', false],
         ['Both open with the ten-day foundation bridge regardless', false],
         ['Both prioritise whichever area the student prefers doing', false]],
        'An average hides which capability is missing. The whole reason the checks are separate is so the plan can respond to that difference.'),
      mcq('The strongest argument for measuring communication on day one rather than in month four is that it:',
        [['Moves slowly, so it needs the whole year', true],
         ['Is the easiest of the four areas to improve quickly', false],
         ['Matters less than the technical areas do in practice', false],
         ['Can be assessed without needing any technical context', false]],
        'Technical gaps close in weeks with targeted work. Communication changes over months, so discovering it late leaves no time to act on it.'),
    ],
  },

  /* ══ T4_PLACEMENT_PLAN ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PLACEMENT_PLAN_READING_YOUR_EVIDENCE',
    notes: `**Your skill profile is a set of measurements with error bars**, and reading it well
means neither dismissing it nor over-reading it.

## What a low score actually means

**That this skill was not demonstrated in what you were asked.** Which usually means you cannot
do it, and sometimes means the questions happened to hit the corner of it you never use.

**The way to tell them apart is to try the thing.** Not to argue with the number.

## What a high score does not mean

**That you are done with it.** A high score on a skill your target role needs at depth is a good
start and not an endpoint. The bar is set by what an interviewer asks, not by what the diagnostic
asked.

## Unmeasured is not zero

**A skill with no questions behind it shows as unmeasured, and the plan treats it as held.** That
is deliberate — it is what stops somebody being re-taught a thing they proved two years ago — and
it has a cost: if you genuinely cannot do it and were never asked, nothing will notice.

**So read the unmeasured list too**, and say so if something on it is a real gap.

## The number that matters least

**The overall score.** It averages capabilities that need completely different responses. Two
people with the same total can need opposite plans, which is why the plan is built from the
profile and not from the total.`,
    mcqs: [
      mcq('A skill shows as unmeasured rather than low. The plan treats it as:',
        [['Held, so it will not be taught again by default', true],
         ['Missing, so it goes to the front of the teaching queue', false],
         ['Unknown, so it is assessed again before anything is planned', false],
         ['Irrelevant, so it is removed from the profile altogether', false]],
        'Treating unmeasured as held is what stops a returning student being re-taught what they already proved. The cost is that a real gap there is invisible.'),
      mcq('Two students have the same overall score but opposite profiles. Planning them identically would be wrong because:',
        [['An average hides which capability is missing', true],
         ['The two students will have different target roles chosen', false],
         ['Overall scores are calculated differently for each student', false],
         ['One of the two scores must be inaccurate by definition', false]],
        'The total is a summary of things that need different responses. It is the least actionable number on the page.'),
      mcq('You believe a low score is wrong. The useful response is to:',
        [['Attempt a real task in that skill and see', true],
         ['Request that the diagnostic be scored a second time', false],
         ['Note the disagreement and carry on with your own plan', false],
         ['Assume the questions were unfair and ignore the result', false]],
        'The score is a claim about what you can do. Doing the thing settles it in a way arguing about the questions cannot.'),
    ],
    checkpoint: [
      mcq('A student scored 40 on databases and insists the questions were unrepresentative. The most useful response is to:',
        [['Set them a real query task and see what happens', true],
         ['Accept their account, since they know their own work', false],
         ['Raise the score to reflect what they say they can do', false],
         ['Ignore the objection and proceed with the plan as built', false]],
        'The disagreement is about a capability, and a capability can be tested directly. That settles it either way in twenty minutes.'),
      mcq('Two skills both show as unmeasured. One the student used last week, the other they have never touched. The plan will:',
        [['Treat both as held, and miss the second entirely', true],
         ['Treat both as gaps, and teach the two of them again', false],
         ['Assess both again before deciding anything about them', false],
         ['Treat the recent one as held and the other one as a gap', false]],
        'Unmeasured is read as held, which is what protects a returning student. The cost is precisely this case, and only the student can flag it.'),
      mcq('A student reads their 78 on testing as meaning testing is finished. The error is:',
        [['The bar is set by interviews, not by the diagnostic', true],
         ['A 78 is actually a low score on this particular scale', false],
         ['Scores above 75 are known to be unreliable in general', false],
         ['Testing cannot be measured accurately by a diagnostic', false]],
        'A diagnostic samples. Clearing its bar says the foundation is there, not that the skill would survive a technical round.'),
    ],
  },
  {
    unitCode: 'T4_PLACEMENT_PLAN_WHICH_ROLES_ARE_REAL',
    notes: `**Which roles your evidence already supports**, which is a different question from
which roles you would enjoy.

## Read the role, not the title

**Job titles are unreliable.** "Software Engineer" at two companies can mean two unrelated jobs.
What is reliable is the list of things the posting asks you to have done.

**Take three real postings for a role and list what they share.** That intersection is the role.

## Match honestly, in three buckets

**Have evidence for.** You could be asked about it for ten minutes and be comfortable.

**Have exposure to.** You have used it, and a determined interviewer would find the edge quickly.

**Have neither.** Be specific about which these are; vagueness here is what produces a plan that
works on everything and moves nothing.

## What makes a role realistic

**Not the number of gaps but their kind.** Four shallow gaps in tooling close in a fortnight.
One deep gap in the thing the role is actually about does not, and a year is not long enough to
pretend otherwise.

## Pick two or three, not one

**One is fragile** — a single hiring freeze ends your year. **Six is unfocused**, and shows,
because the resume cannot be tailored to all of them and ends up tailored to none.`,
    mcqs: [
      mcq('A role has four shallow gaps in tooling and one deep gap in its core subject. It is:',
        [['Less realistic than one with six shallow gaps', true],
         ['More realistic, because most of the gaps are shallow ones', false],
         ['Equally realistic, since the gap count is what matters', false],
         ['Impossible to judge without knowing the company involved', false]],
        'Shallow tooling gaps close in a fortnight. A deep gap in what the role is fundamentally about is the one a year may not be enough for.'),
      mcq('The most reliable way to find out what a role actually involves is to:',
        [['Compare what several real postings for it share', true],
         ['Read the job title and match it to your own degree', false],
         ['Ask somebody who holds a similar title at one company', false],
         ['Look at which subjects the role appears to need most', false]],
        'Titles vary wildly between companies. What several postings agree on is the part that belongs to the role rather than to the employer.'),
      mcq('Targeting a single role is risky chiefly because:',
        [['One hiring freeze ends your entire year', true],
         ['A single role cannot be prepared for thoroughly enough', false],
         ['Recruiters view single-role candidates as inflexible ones', false],
         ['It is harder to write one resume than several of them', false]],
        'Concentration is good for preparation and bad for exposure. Two or three related roles share most of the preparation and spread the risk.'),
      mcq('You have used a technology in one project and could not answer detailed questions on it. It belongs in:',
        [['The exposure bucket, not the evidence bucket', true],
         ['The evidence bucket, since you have shipped with it', false],
         ['Neither bucket, because one project is not enough at all', false],
         ['Whichever bucket the target role happens to require most', false]],
        'The buckets are about what survives questioning, not about what you have touched. Putting exposure in the evidence column is how resumes become unsurvivable.'),
    ],
    checkpoint: [
      mcq('A student lists six target roles spanning backend, data and security. The most likely consequence is:',
        [['A resume tailored to none of them in the end', true],
         ['A stronger position, because more doors are kept open', false],
         ['A longer preparation period but a better final outcome', false],
         ['No consequence at all, since the roles overlap greatly', false]],
        'Tailoring is what makes a resume survive a filter, and six unrelated roles cannot all be tailored for. The result is a generic document.'),
      mcq('Two target roles share most of their required skills. Preparing for both rather than one is:',
        [['Nearly free, and halves the risk of a freeze', true],
         ['Twice the work, for no real gain in the end result', false],
         ['Unwise, because recruiters notice a divided focus here', false],
         ['Only sensible if the student is undecided between them', false]],
        'The cost of a second target is the work it does not share with the first. Where that overlap is large, the extra exposure is almost free.'),
      mcq('A student puts a framework in the evidence bucket after one tutorial project. An interviewer will most likely find out by:',
        [['Asking why they chose it over the alternative', true],
         ['Checking whether the project is on their GitHub profile', false],
         ['Asking them to write some code using it on a whiteboard', false],
         ['Comparing the claim against their stated academic record', false]],
        'A tutorial makes the choice for you, so there is no answer to give. It is the cheapest question an interviewer has for separating use from understanding.'),
    ],
  },
  {
    unitCode: 'T4_PLACEMENT_PLAN_THE_PLAN',
    notes: `**What the next weeks actually contain**, and why they are in this order.

## Two programmes, running at once

**The teaching track.** Bridge if you need it, then the engineering build, then your
specialization month, then the production project. This is sequential: each part assumes the one
before it.

**The placement track.** Coding sets, DSA, aptitude, technical MCQs and interview practice. This
is NOT sequential and does not wait for the teaching track to finish. It runs alongside from
early on, which is the single biggest structural difference between this year and the last three.

## Why the placement track cannot wait

**Because aptitude and interview performance move slowly and only with repetition.** A student
who meets aptitude for the first time in week nineteen has met it too late, whatever their
technical level. Drives do not arrive in a convenient order.

## What decides your opening

**Your evidence, and nothing else.** Not your year, not your college, not what your friends are
doing. If the bridge did not open for you, it is because you demonstrated you do not need it.

## What would change the plan

**New evidence.** Finishing a checkpoint, failing a mock, closing a gap — each of those changes
what the remaining days should contain, and the plan recomposes rather than being fixed on day
one and followed blindly.

## What will not change

**The day count**, and the fact that the placement practice runs throughout. Those are the shape
of the year rather than a response to any one student.`,
    mcqs: [
      mcq('The placement practice runs alongside the teaching rather than after it because:',
        [['Aptitude and interviewing only improve with repetition', true],
         ['There is not enough room left at the end of the year', false],
         ['Students prefer having some variety within each day', false],
         ['The teaching track may finish earlier than was expected', false]],
        'Both need spaced repetition over months. Compressed into a final block they produce familiarity rather than fluency, and drives do not wait.'),
      mcq('Your plan did not open with the ten-day bridge. This means:',
        [['Your evidence showed the fundamentals are in place', true],
         ['The bridge is only offered to students who request it', false],
         ['The bridge was skipped to fit the programme into the days', false],
         ['You may open it later once the specialization has started', false]],
        'The bridge is a maximum, not a default. It opens for a student whose diagnostic showed missing fundamentals and not otherwise.'),
      mcq('Failing a mock interview in week twelve should cause the plan to:',
        [['Recompose, because it is new evidence about you', true],
         ['Stay fixed, since the plan was set from the diagnostic', false],
         ['Restart from the beginning with the bridge reopened now', false],
         ['Pause the teaching track until the mock has been retaken', false]],
        'Every checkpoint, mock and simulation is evidence. A plan that ignored it would be following a picture of you from four months ago.'),
      mcq('The part of the year that is NOT decided by your evidence is:',
        [['The total number of days in the programme', true],
         ['Whether the ten-day foundation bridge opens for you', false],
         ['How much of the engineering build is taught or compressed', false],
         ['Which specialization track fills your specialization month', false]],
        'The length is set by the administrator for everyone on the programme. What varies per student is what fills those days.'),
    ],
    checkpoint: [
      mcq('A student asks to move all the aptitude work to the final month so the teaching runs uninterrupted. This should be refused because:',
        [['Aptitude needs months of repetition, not one block', true],
         ['The final month is already full of other scheduled work', false],
         ['Aptitude is harder than the teaching track and needs longer', false],
         ['The programme length would have to be extended to allow it', false]],
        'Spaced repetition is what moves aptitude. Compressed into a block it produces familiarity with the questions rather than speed at them.'),
      mcq('Two students on the same programme have plans of different content but the same number of days. This is:',
        [['Exactly as intended — evidence fills a fixed length', true],
         ['A fault, because the same programme should be identical', false],
         ['A sign that one of the two diagnostics was misinterpreted', false],
         ['Acceptable only where the two have different directions', false]],
        'The length is the promise made to everyone on the programme. What goes inside it is decided by each student\u2019s own evidence.'),
      mcq('A student passes every checkpoint in the first six weeks. The plan should respond by:',
        [['Recomposing to spend the freed days on harder work', true],
         ['Leaving the remaining days exactly as they were planned', false],
         ['Shortening the programme, since the material is finished', false],
         ['Repeating the material at a greater depth to be thorough', false]],
        'A checkpoint is evidence like any other. Passing them early frees capacity, and the plan is meant to notice and use it.'),
    ],
  },
];
