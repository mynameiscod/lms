/**
 * T4_MOCK_TECHNICAL, T4_MOCK_SPECIALIZATION and T4_MOCK_HR — eleven units. Module P22.
 *
 * ── WHY THE MOCKS ARE A MODULE RATHER THAN AN ACTIVITY ────────────────────────────────────
 *
 * The spec asks for ten mock interviews. Nine of them are here and the tenth is P23's full-day
 * simulation, which is a different thing and earns its own module.
 *
 * Every unit in this module is a PRACTICE unit except the debrief and the checkpoint, and that is
 * deliberate: there is nothing left to teach here. P14 through P21 taught it. What a mock does is
 * measure whether the teaching survived contact with a person asking questions, and the answer is
 * frequently no for reasons that have nothing to do with knowledge.
 *
 * ── THE DEBRIEF IS THE PRODUCT, NOT THE MOCK ─────────────────────────────────────────────
 *
 * A mock with no debrief is an expensive way to feel anxious. The twenty minutes afterwards are
 * where the value is, and they are also where students defend themselves instead of listening —
 * which is why T4_MOCK_HR_READING_THE_DEBRIEF exists as a CONCEPT unit between the last mock and
 * the checkpoint rather than as advice inside one of them.
 *
 * ── THE ORDER MATTERS ─────────────────────────────────────────────────────────────────────
 *
 * Mocks 1 to 3 are announced and narrow: foundation, DSA, core CS. Mock 7 is unannounced. Mock 8
 * is run as the real thing. The progression from "you know what is coming" to "you do not" is the
 * whole design, and running them out of order wastes it — an unannounced mock before the narrow
 * ones produces a result that cannot be attributed to anything.
 *
 * Attribution: every unit in this module goes to INTERVIEW_PERFORMANCE rather than to the
 * technical skill the round happens to cover, because what a mock measures is the performance.
 * The debrief unit goes to SELF_ASSESSMENT.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const MOCK_BUNDLES: PilotBundle[] = [
  /* ══ T4_MOCK_TECHNICAL ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOCK_TECHNICAL_MOCK_1_FOUNDATION',
    notes: `**Programming, SQL and Git, at first-round pace. The one that establishes the
baseline.**

## The format

**Thirty minutes, three areas, three levels deep on each.** Definition, mechanism, limitation —
which is the shape every fundamentals round uses and is predictable enough to be a fair first
measurement.

## Why this one is first

**Because it is the least threatening and the most diagnostic.**

**The material is known**, so a weak result is about performance rather than about knowledge — and
separating those two is the entire purpose of running mocks at all.

**A candidate who knows dictionaries perfectly and cannot explain one under observation has a
finding**, and it is a finding that would otherwise not appear until a real round.

## What the interviewer should do

**Ask the opener, then "why", then "when is that not true".** **Every topic, in that order.**

**And record where the third level failed**, because those are the topics that are memorised rather
than understood and they are exactly what a real interviewer probing depth will find.

## The six observations

**Time to first spoken word.** **Whether answers had a caveat or stopped at the mechanism.**
**Whether any answer was bluffed.** **Whether "I do not know" was ever said.** **Whether a query was
written by hand or described.** **Whether the Git answers had an incident in them.**

## What a baseline result usually looks like

**Two or three topics that collapse at the third level**, and the candidate is surprised by which
ones. **The surprise is the value** — a self-assessment would have named different topics, which is
why the mock is worth its cost.

**And usually one bluff**, noticed by the interviewer and not by the candidate.

## What to do with the result

**Nothing yet.** **Record it and move to mock 2.**

**Remediating after every mock produces three weeks of work between mocks and no comparable
measurements**, which is the opposite of what the series is for. The remediation decision comes
after mock 3, from three results rather than one.`,
    mcqs: [
      mcq('Mock 1 is first because the material is known, so a weak result is about performance rather than knowledge — and separating those two is:',
        [['The entire purpose of running mocks', true],
         ['Only possible with an experienced interviewer', false],
         ['A secondary benefit of the series', false],
         ['Achievable through self-assessment instead', false]],
        'Capability was established by the earlier modules; what the mocks measure is whether it survives being observed.'),
      mcq('Remediating after every mock produces three weeks of work between mocks and:',
        [['No comparable measurements', true],
         ['A better result on the following one', false],
         ['Too little time for the later mocks', false],
         ['Improvements that cannot be attributed', false]],
        'Changing the candidate between measurements destroys the comparison the series was designed to produce.'),
    ],
    checkpoint: [
      mcq('The candidate being surprised by which topics collapsed is described as the value, because a self-assessment:',
        [['Would have named different topics', true],
         ['Takes longer to produce a result', false],
         ['Cannot cover all three areas at once', false],
         ['Is influenced by recent revision', false]],
        'The gap between believed and actual weakness is what the mock reveals, and it is unavailable by introspection.'),
      mcq('The third level failing marks topics that are memorised rather than understood, and those are exactly what:',
        [['A real interviewer probing depth will find', true],
         ['The written rounds test most heavily', false],
         ['The candidate revised most recently', false],
         ['Other candidates also struggle with', false]],
        'Real rounds go past the definition and mechanism, so the same boundary is reached there as in the mock.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_TECHNICAL_MOCK_2_DSA',
    notes: `**One coding problem, the complexity, and the follow-up asking for better.**

## The format

**Forty-five minutes, one medium problem, narrated.** **The interviewer asks "can you do better?"
at the end regardless of what was produced**, because that exchange is half of what is being
measured.

## What is being scored, and it is six things

**Correctness. Whether you understood before starting. Whether the approach was stated. The code
itself. Whether you tested unprompted. And the complexity, volunteered.**

**A candidate can score on five of those without solving it optimally**, which is why the result is
reported as six observations rather than as pass or fail.

## The observations

**Time to first spoken word.** **Constraints asked about, yes or no.** **Approach stated before
coding, yes or no.** **Longest silence, in seconds.** **Tested before declaring done, yes or no.**
**Complexity volunteered, yes or no.** **And the follow-up response, described.**

**Seven items, six of them binary or a number.**

## What usually separates this from mock 1

**Mock 1 measures whether knowledge survives observation. This measures whether it survives
observation while doing something else at the same time**, which is a harder condition and a
different result.

**Candidates frequently perform well in mock 1 and go silent in mock 2**, and that pattern is the
single most useful thing the pair produces.

## The failure to watch for specifically

**Fifteen minutes of silent typing.** It is unrecoverable in the round and it is entirely prevented
by stating the approach first.

**If it happens, the interviewer should let it**, and record it. **Interrupting produces a better
mock and a worse measurement**, and the measurement is the product.

## What not to do afterwards

**Do not solve the problem again privately and conclude that it was fine.** **You could solve it —
that was never the question**, and re-solving it answers a question the mock was not asking.`,
    mcqs: [
      mcq('The result is reported as six observations rather than pass or fail because a candidate can score on five of them:',
        [['Without solving it optimally', true],
         ['Even if the code does not compile', false],
         ['Only when the problem is familiar', false],
         ['If the interviewer provides a hint', false]],
        'Understanding, approach, testing, complexity and communication are each assessed separately from reaching the best solution.'),
      mcq('If fifteen minutes of silent typing happens, the interviewer should let it, because interrupting produces:',
        [['A better mock and a worse measurement', true],
         ['A result the candidate will dispute', false],
         ['An outcome closer to a real round', false],
         ['Less useful feedback in the debrief', false]],
        'The measurement is the product, and rescuing the candidate removes the observation the session existed to capture.'),
    ],
    checkpoint: [
      mcq('Performing well in mock 1 and going silent in mock 2 is the single most useful thing the pair produces because mock 2 measures whether knowledge survives observation:',
        [['While doing something else at the same time', true],
         ['Under a stricter time limit', false],
         ['On material that was not revised', false],
         ['With a less sympathetic interviewer', false]],
        'Speaking and solving compete for attention, and the contrast isolates that specific difficulty from the knowledge itself.'),
      mcq('Re-solving the problem privately afterwards and concluding it was fine answers a question the mock was not asking, because:',
        [['You could solve it — that was never the question', true],
         ['The time pressure cannot be reproduced', false],
         ['The follow-up is the part that mattered', false],
         ['A second attempt benefits from the first', false]],
        'Solving capability was established before the mock; what was being measured is the performance around it.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_TECHNICAL_MOCK_3_CORE_CS',
    notes: `**Operating systems, databases, networking and OOP, probed until the understanding runs
out.**

## The format

**Thirty minutes, four subjects, and the interviewer keeps going until an answer stops.**

**That is not cruelty — it is the measurement.** Every candidate has a boundary; this mock finds
where it is, and knowing where it is beats discovering it in a real round.

## The instruction to the interviewer

**Do not stop at a correct answer.** Ask why. Then ask when it does not hold. Then ask for an
example.

**Continue until the candidate says they do not know**, and record how deep that was per subject.

**Depth-to-failure, per subject, is the output of this mock** — four numbers, and they are more
useful than any overall impression.

## The three anchor sentences it tests

**"A process has its own memory; threads share it."**

**"TCP is reliable and ordered; UDP is neither and is faster."**

**"A transaction is all-or-nothing, and isolation decides what concurrent transactions see."**

**A candidate deriving from these will go deeper than one recalling facts**, and the difference
shows up as two or three extra levels — which is exactly what the number measures.

## The URL question

**Ask it.** It is the single most likely core CS question in a real round, and the mock should
establish whether the answer is a forty-five-second outline or a five-minute excursion into DNS.

## What a good result looks like

**Not "answered everything".** **Three levels deep on each subject and an honest stop**, which is
the realistic bar for a placement candidate and is what a real interviewer expects.

**A candidate who never says "I do not know" across thirty minutes of deliberate probing is
bluffing somewhere**, and the interviewer should find it.

## The pattern across mocks 1 to 3

**Now there are three results.** **If all three are weak in the same way — silence, or bluffing, or
stopping at the mechanism — that is one problem rather than three**, and it is the finding the
series was run to produce.`,
    mcqs: [
      mcq('The interviewer continuing until an answer stops is described as the measurement rather than cruelty because every candidate has a boundary and knowing where it is:',
        [['Beats discovering it in a real round', true],
         ['Allows the remaining mocks to be targeted', false],
         ['Establishes how much revision is needed', false],
         ['Is required before the checkpoint', false]],
        'The boundary exists regardless; the only choice is whether it is found in practice or in an interview that counts.'),
      mcq('Depth-to-failure per subject produces four numbers that are more useful than any overall impression because they:',
        [['Locate the weakness by subject rather than in general', true],
         ['Can be compared with other candidates', false],
         ['Remove the interviewer’s judgement entirely', false],
         ['Predict performance in the later mocks', false]],
        'A per-subject figure says where to work, where an aggregate impression says only that something was weak.'),
    ],
    checkpoint: [
      mcq('A candidate who never says "I do not know" across thirty minutes of deliberate probing is:',
        [['Bluffing somewhere', true],
         ['Unusually well prepared for the round', false],
         ['Being probed less aggressively than intended', false],
         ['Answering at a consistent level of depth', false]],
        'Sustained probing reaches every candidate’s limit, so its apparent absence means the limit was concealed rather than not reached.'),
      mcq('If all three of mocks 1 to 3 are weak in the same way, that is one problem rather than three, and it is:',
        [['The finding the series was run to produce', true],
         ['A reason to repeat the earlier mocks', false],
         ['Evidence the material was not revised', false],
         ['Best addressed after mock 8', false]],
        'Three narrow measurements exist precisely so a common pattern can be distinguished from three separate topic gaps.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_TECHNICAL_MOCK_7_FULL_TECHNICAL',
    notes: `**Mixed technical, unannounced: whatever the interviewer decides to open with.**

## What changes here

**The candidate does not know what is coming.**

**Mocks 1 to 3 were announced and narrow.** This one is sixty minutes and the interviewer chooses —
it may open with a coding problem, a database question, a project probe or a design sketch, and it
may switch without warning.

## Why the surprise is the point

**Because a real round does this**, and because **preparation that only works when the subject is
known is a specific and common failure** that the announced mocks cannot detect.

**A candidate who scored well on mocks 1 to 3 and poorly here has learned something that three good
results concealed.**

## What the interviewer should do

**Switch subjects mid-round at least twice**, without signalling.

**Ask one question outside the prepared areas** — something adjacent that a working engineer would
be asked and that no revision plan covers.

**And ask one thing from the candidate's own resume**, unannounced, because that is where the
claims are.

## The observations

**Recovery time after a subject switch.** **Whether any answer degraded because the candidate was
still on the previous topic.** **How the unprepared question was handled — bluffed, deferred, or
reasoned from adjacent knowledge.** **Whether the resume question was answered with the detail
ownership implies.**

## What usually comes out

**Slower answers across the board**, which is expected and is not the finding.

**The finding is usually one of two things:** a resume claim that could not be substantiated, or a
bluff on the unprepared question that the candidate did not notice making.

## Why this is mock 7 and not mock 4

**Because an unannounced mock run before the narrow ones produces a result that cannot be
attributed to anything.** Weak on core CS, or weak under surprise, or weak generally — and no way
to tell which.

**By mock 7 there are six prior results to attribute against**, which is what makes this one
readable.`,
    mcqs: [
      mcq('The surprise is the point because preparation that only works when the subject is known is a specific and common failure that:',
        [['The announced mocks cannot detect', true],
         ['Only appears in longer rounds', false],
         ['Affects weaker candidates disproportionately', false],
         ['The debrief usually surfaces anyway', false]],
        'A narrow announced format always supplies the subject, so it never creates the condition under which that failure appears.'),
      mcq('This is mock 7 rather than mock 4 because an unannounced mock run before the narrow ones produces a result that:',
        [['Cannot be attributed to anything', true],
         ['Discourages the candidate too early', false],
         ['Repeats what the later mocks measure', false],
         ['Takes longer to debrief properly', false]],
        'Without prior narrow results there is no way to distinguish a subject weakness from a difficulty with the surprise itself.'),
    ],
    checkpoint: [
      mcq('Slower answers across the board are expected and are not the finding, which is usually a resume claim that could not be substantiated or:',
        [['A bluff the candidate did not notice making', true],
         ['A subject that had not been revised', false],
         ['An inability to change topic quickly', false],
         ['Fatigue affecting the later answers', false]],
        'Both are invisible to the candidate at the time, which is what makes an observed round necessary to find them.'),
      mcq('Asking one thing from the candidate’s own resume unannounced is included because that is where:',
        [['The claims are', true],
         ['The candidate is most confident', false],
         ['The interviewer can judge depth fairly', false],
         ['The preparation is usually weakest', false]],
        'Resume lines are assertions the candidate authored, so they are the natural place to test whether they hold under questioning.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_TECHNICAL_MOCK_8_FINAL_TECHNICAL',
    notes: `**A full timed technical simulation, run as the real thing rather than as practice.**

## The difference from every mock before it

**It is run as though it counts.**

**Formal dress if the real ones will be. On time. No restarting, no "can we do that again", no
explaining afterwards what you meant.**

**The artificiality of a mock is usually a feature** — it lets the interviewer interrupt, probe and
stop. **Here it is removed on purpose**, because the one thing every previous mock has failed to
measure is how the candidate performs when the safety net is not visible.

## The format

**Ninety minutes.** A coding problem, a technical discussion, a project probe and the candidate's
questions at the end. **No breaks, no subject announcements, no hints beyond what a real
interviewer would give.**

## What the interviewer changes

**No coaching.** If the candidate is stuck, give what a real interviewer would give — a hint after a
genuine pause, and nothing more.

**No stopping to explain.** Everything goes into the debrief.

**And a score.** Not a conversation about how it went — an actual would-you-advance decision, with
the reason.

## Why the decision matters more than the feedback

**Because "you did fine" is what every mock produces by default**, and it is not information.

**"I would not have advanced you, because the coding round had eleven minutes of silence in it" is
information**, and it is the kind a candidate acts on.

## The observation set

**The same six as mock 2 for the coding portion**, plus **whether the round held together as one
performance** — a candidate can be adequate in each section and leave an impression of being
scattered, and only a full-length unbroken round shows that.

## After this one

**This is where remediation is chosen**, from eight results rather than from a feeling. **Two or
three specific things**, which is P23's debrief topic and is the whole reason the series produces
numbers rather than impressions.

## The thing candidates get wrong about this mock

**Treating a poor result as a verdict.** **It is a measurement taken with six weeks remaining**, and
the entire point of taking it now is that there is time to act on it.`,
    mcqs: [
      mcq('The artificiality of a mock is usually a feature and is removed here on purpose because the one thing every previous mock failed to measure is:',
        [['How the candidate performs without a visible safety net', true],
         ['Whether the preparation covered every subject', false],
         ['How long a full round actually takes', false],
         ['Whether the answers hold under repetition', false]],
        'Knowing that interruptions and restarts are available changes the performance, so removing them is the only way to observe it.'),
      mcq('"You did fine" is what every mock produces by default and is not information, where an actual would-you-advance decision with a reason:',
        [['Is information a candidate acts on', true],
         ['Reflects the interviewer’s confidence level', false],
         ['Can be compared across the whole series', false],
         ['Removes the need for a longer debrief', false]],
        'A decision with a stated cause names something specific that changed the outcome, which a general reassurance does not.'),
    ],
    checkpoint: [
      mcq('A full-length unbroken round shows something the sectioned mocks cannot, namely that a candidate can be adequate in each section and still:',
        [['Leave an impression of being scattered', true],
         ['Run out of time before the end', false],
         ['Perform worse on the later sections', false],
         ['Repeat material between the sections', false]],
        'Coherence across the whole performance is a property of the round as a unit, which segmented practice never exercises.'),
      mcq('Treating a poor result as a verdict is described as the thing candidates get wrong, because it is a measurement taken with six weeks remaining and:',
        [['The point of taking it now is that there is time to act', true],
         ['The conditions were harsher than a real round', false],
         ['A single result is not statistically meaningful', false],
         ['The later mocks will show improvement anyway', false]],
        'The schedule places it early enough for remediation, which is the entire reason for running it under real conditions in advance.'),
    ],
  },

  /* ══ T4_MOCK_SPECIALIZATION ═════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOCK_SPECIALIZATION_MOCK_4_PROJECT',
    notes: `**Your own project: architecture, implementation, debugging and the decisions you
made.**

## The format

**Forty-five minutes on one project you nominate.** Ninety-second opener, then increasing depth
across six areas.

**The interviewer does not let "we used X" stand.** Every technology named gets a "why", and the
answer has to be a requirement rather than a preference.

## The six areas

**Architecture.** Draw it; what talks to what.

**Data flow.** One user action from the click to the database and back.

**The hardest bug.** Symptom, investigation, cause, fix.

**Security.** How you know one user cannot read another's data. **The area most student projects
have no answer to.**

**Testing.** How you knew it worked. "I clicked around" is an answer and it is a result.

**Scaling.** A hundred times the users; what breaks first.

## The contribution check, which is the part that matters most

**Have the interviewer pick one thing the candidate claimed to own and ask a detail question about
it.**

**Somebody who owned it answers immediately.** **The hesitation is the measurement**, and it is more
informative than the answer, because it locates the boundary between what was done and what was
watched.

## Why this mock reliably surprises people

**Because candidates rehearse the description and not the interrogation.**

**The project is the thing they feel most secure about**, and forty-five minutes of "why" finds two
or three decisions with nothing behind them — which is not a preparation failure but a true fact
about how the project was built.

## The output

**Which of the six areas produced nothing.** **Whether the contribution claim held.** **How many
technology choices had a real reason.** **And whether a failure was volunteered or had to be
extracted.**

## What to do with it

**The empty areas are content, not performance.** Security with no answer is fixed by thinking about
the security, not by practising the answer — which distinguishes this mock's findings from most of
the others in the series.`,
    mcqs: [
      mcq('The hesitation on a detail question is more informative than the answer because it locates the boundary between:',
        [['What was done and what was watched', true],
         ['Recent work and older work', false],
         ['The candidate’s area and the team’s', false],
         ['Prepared material and improvisation', false]],
        'Ownership produces instant recall, so the pause marks precisely where the claimed contribution stops being first-hand.'),
      mcq('This mock reliably surprises people because candidates rehearse the description and not:',
        [['The interrogation', true],
         ['The technical details of the implementation', false],
         ['The parts they did not build themselves', false],
         ['The scaling and security questions', false]],
        'The opener is prepared and the forty minutes of "why" that follow are not, which is where the security comes apart.'),
    ],
    checkpoint: [
      mcq('Empty areas are described as content rather than performance, which distinguishes this mock’s findings from most of the series, because security with no answer is fixed by:',
        [['Thinking about the security, not practising the answer', true],
         ['Rehearsing the response more thoroughly', false],
         ['Choosing a different project to present', false],
         ['Describing what a production system would do', false]],
        'The gap is in the work rather than in its delivery, so the remedy is doing the thinking that was never done.'),
      mcq('Finding two or three decisions with nothing behind them is described as not a preparation failure but:',
        [['A true fact about how the project was built', true],
         ['A consequence of the time limit', false],
         ['Normal for a project of that size', false],
         ['Something the opener should have covered', false]],
        'The choices genuinely were made without reasoning, so the mock has discovered the situation rather than a rehearsal shortfall.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_SPECIALIZATION_MOCK_5_SPECIALIZATION',
    notes: `**Your direction alone, at the depth somebody hiring for it would probe.**

## The format

**Forty-five minutes, one direction, no general questions.**

**The interviewer should be, or should borrow questions from, somebody who works in it.** A generic
interviewer produces a generic result, and the entire purpose of this mock is depth in one
direction rather than breadth.

## What it is measuring

**Where the specialization ends.**

**Every candidate's direction knowledge has an edge.** Finding it in a mock is cheap; finding it in
a specialization round, where the whole conversation is inside that direction, is expensive.

## How to find the edge

**Start at what the candidate built, and walk outward.**

"You used a cache — what invalidates it?" "What happens on a cold start?" "How would you know it was
helping?" "What would you use instead if the data changed constantly?"

**Four questions from one component**, each one step further from what was actually implemented.

**The edge is where the answers stop being about what you did and start being about what you read.**
It is audible, and both parties usually notice it at the same moment.

## The honest scope for a placement candidate

**Being able to go two or three steps past what you built is a good result.** Nobody expects a
fresher to have production depth in their direction.

**The failure is not having an edge close to the surface — it is not knowing where it is**, and
therefore walking past it confidently in a real round.

## The direction-specific thing to check

**One question that a person hiring for this direction always asks.** Backend: how do you keep two
writes from overwriting each other. Frontend: what happens when the response arrives after the next
one. Data: how do you know the pipeline did not silently drop rows. Security: what do you do first
when you find a vulnerability in production.

**Every direction has two or three of these**, and not having met them is a content gap worth
finding here.

## The output

**Where the edge was, per area.** **Whether the candidate recognised it themselves or walked past
it.** **And which of the direction's standard questions produced nothing.**`,
    mcqs: [
      mcq('The edge is described as the point where the answers stop being about what you did and start being about:',
        [['What you read', true],
         ['What the team decided collectively', false],
         ['How the technology is usually described', false],
         ['Cases the candidate has not encountered', false]],
        'The shift from first-hand experience to secondhand knowledge is audible, and both parties usually notice it simultaneously.'),
      mcq('The failure is not having an edge close to the surface but:',
        [['Not knowing where it is', true],
         ['Being unable to extend it quickly', false],
         ['Having chosen too narrow a direction', false],
         ['Reaching it earlier than other candidates', false]],
        'An unlocated edge is walked past confidently in a real round, which is what turns a normal limitation into a failed answer.'),
    ],
    checkpoint: [
      mcq('A generic interviewer produces a generic result because the entire purpose of this mock is:',
        [['Depth in one direction rather than breadth', true],
         ['Coverage of the standard question set', false],
         ['Assessment against industry expectations', false],
         ['Comparison with the other technical mocks', false]],
        'Only somebody familiar with the direction can ask the successive questions that locate where its knowledge ends.'),
      mcq('Being able to go two or three steps past what you built is described as a good result because nobody expects a fresher to have:',
        [['Production depth in their direction', true],
         ['Experience with the standard tooling', false],
         ['Answers to the direction-specific questions', false],
         ['Built anything at production scale', false]],
        'The realistic bar is reasoning outward from what was actually implemented, not the depth a working specialist would hold.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_SPECIALIZATION_MOCK_6_SYSTEM_DESIGN',
    notes: `**A brief, a whiteboard, and somebody changing the requirements once you have
committed.**

## The format

**Forty-five minutes, one vague brief the candidate has not seen, on paper or a whiteboard.**

**The interviewer changes one requirement at the halfway mark**, after the design is committed to.

## The seven observations

**Clarified before drawing, yes or no.** **A number produced and used to justify something.**
**Boxes with no stated reason, counted.** **One request walked end to end.** **One failure walked.**
**The first bottleneck named unprompted.** **And the response to the requirement change.**

**None requires the interviewer to know the "right" architecture**, which is fortunate because there
is not one.

## The change, which is the point of this mock

**"Actually, it needs to work offline."** **"Actually, the data is confidential."** **"Actually,
there are ten times as many users."**

**What good looks like:** say what the change breaks, say what stays, change the smallest thing
that addresses it.

**A design that cannot absorb a changed requirement was a remembered design**, and this is the only
mock in the series that detects that — an unchanged brief lets a reproduced architecture pass.

## The deliberate challenge

**Once, tell the candidate something does not work when it does.**

**Not to trick them** — to see whether they can distinguish "I was wrong, here is the fix" from
"let me check that, because I think it holds for this reason". **Both are good answers. Folding
immediately is not, and neither is refusing to consider it.**

## What usually comes out

**Drawing before clarifying**, which is the most common single finding in the whole series and is
fixed by thirty seconds of habit.

**And boxes with no reason.** The count is usually two or three, and the candidate can rarely
justify them when asked directly.

## What this feeds

**The design portion of any real round**, and **P23's technical simulation**, which asks the same
thing at the end of a long day rather than at the start of a fresh session.`,
    mcqs: [
      mcq('This is the only mock in the series that detects a remembered design because an unchanged brief:',
        [['Lets a reproduced architecture pass', true],
         ['Does not require any justification', false],
         ['Is easier to complete within the time', false],
         ['Matches what the candidate practised', false]],
        'A design that never has to adapt can be recalled rather than derived, and nothing in the round distinguishes the two.'),
      mcq('The deliberate false challenge distinguishes "I was wrong, here is the fix" from "let me check, because I think it holds" — and both are good answers, where:',
        [['Folding immediately is not, and neither is refusing to consider it', true],
         ['The second is preferred in a design round', false],
         ['Only the first shows adequate collaboration', false],
         ['The choice depends on how confident the candidate is', false]],
        'Either reasoned response demonstrates engagement, where capitulation and refusal both replace reasoning with a reflex.'),
    ],
    checkpoint: [
      mcq('Drawing before clarifying is the most common single finding in the whole series and is fixed by:',
        [['Thirty seconds of habit', true],
         ['Practice on several more briefs', false],
         ['A clearer statement of the requirements', false],
         ['Slowing down the sketching phase', false]],
        'Three questions before the pen moves changes everything downstream, at almost no cost in time.'),
      mcq('The seven observations require no knowledge of the "right" architecture, which is fortunate because:',
        [['There is not one', true],
         ['Interviewers vary in their preferences', false],
         ['The brief is deliberately underspecified', false],
         ['Placement designs are too small to compare', false]],
        'Several architectures satisfy any given brief, so the round can only score the process that produced whichever one was drawn.'),
    ],
  },

  /* ══ T4_MOCK_HR ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MOCK_HR_MOCK_9_HR',
    notes: `**The round treated as a round: communication, structure and professional scenarios.**

## Why it needs to be treated as a round

**Because candidates rehearse HR answers and do not rehearse HR rounds**, and the difference is
twenty-five continuous minutes of talking about yourself with an interviewer who follows up.

**Individual answers practised in isolation do not expose** the transitions, the accumulating
fatigue, or the moment at minute eighteen when a prepared answer is delivered for the third time in
a slightly different form.

## The format

**Twenty-five minutes, the standard set, in order, with follow-ups.**

**Tell me about yourself. Why this role. Why our company. A difficult problem. A failure. A
disagreement. A weakness. Where in five years. Your questions for us.**

## The follow-ups that produce the result

**After the failure story: "what changed afterwards?"**

**After the conflict story: "what was their strongest argument?"** — which finds the stories where
the other person was simply wrong.

**After the weakness: "what are you doing about it?"** — which finds the invented ones, because
there is no remedial history to describe.

**After any story: "when was that?"** — which finds the ones that did not happen.

## The observations

**Length of the opener.** **Any answer with no event in it.** **"I" or "we" on the actions.**
**Whether the failure was real.** **Whether the conflict had a villain.** **Whether a story was
reused.** **Whether the closing questions were prepared.**

**Seven, none requiring technical knowledge.**

## What usually comes out

**The motivation questions**, which are the least practised, the most obviously generic, and arrive
early enough to colour everything after them.

**And "we" throughout**, from candidates being modest — which costs marks in this round
specifically, because the interviewer is trying to establish what the candidate did.

## The thing to record most carefully

**How it sounded, not what was said.** **Rehearsed, natural, defensive, flat.** That is the
dimension this round is actually scored on, and it is the only mock in the series where the
delivery matters more than the content.`,
    mcqs: [
      mcq('Individual answers practised in isolation do not expose the transitions, the accumulating fatigue, or:',
        [['A prepared answer delivered for the third time in a different form', true],
         ['Questions the candidate had not anticipated', false],
         ['The interviewer changing their tone mid-round', false],
         ['How long each answer actually takes', false]],
        'Reuse across a continuous round is only visible when the whole round is run, and it makes three years sound like one week.'),
      mcq('"What are you doing about it?" after the weakness finds the invented ones because:',
        [['There is no remedial history to describe', true],
         ['The answer contradicts the original claim', false],
         ['Candidates rarely prepare that follow-up', false],
         ['A real weakness has a clearer cause', false]],
        'The action only exists if the weakness did, so the follow-up has nothing to draw on when the answer was manufactured.'),
    ],
    checkpoint: [
      mcq('"What was their strongest argument?" after the conflict story is included because it finds:',
        [['The stories where the other person was simply wrong', true],
         ['Disagreements that were never resolved', false],
         ['Situations the candidate was not present for', false],
         ['Conflicts that were technical rather than personal', false]],
        'A story with no opposing merit never exercises the capability the question exists to probe, and the follow-up exposes that immediately.'),
      mcq('How it sounded is recorded most carefully because that is the dimension the round is scored on, making this:',
        [['The only mock where delivery matters more than content', true],
         ['The hardest round to assess consistently', false],
         ['A round that cannot be self-reviewed', false],
         ['Less useful without an experienced interviewer', false]],
        'Every other mock scores what was said; this one scores an impression, which is why the manner is the observation.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_HR_READING_THE_DEBRIEF',
    notes: `**The hardest part of a mock is the twenty minutes afterwards. Hearing it rather than
explaining it away.**

## Why this is a unit

**Because a mock with no debrief is an expensive way to feel anxious**, and because the debrief is
routinely wasted by the person it is for.

**The pattern is consistent:** the interviewer names something, and the candidate explains why it
happened. **Both statements are usually true and only one of them is useful.**

## The three defences, and what each one costs

**"I knew that, I just blanked."** **Probably true, and it does not matter** — the round scored what
happened, and "I knew it" is not available to a real interviewer either.

**"That was not a fair question."** **Occasionally true.** And a real round will contain unfair
questions, so the useful response is how it was handled rather than whether it should have been
asked.

**"I would have done that differently in a real interview."** **This one is worth examining**,
because it is almost never true and believing it removes the finding entirely. A real round is
harder, not easier.

## What to do instead, mechanically

**Write it down while they talk. Do not respond.**

**Then ask three questions:** "What was the worst moment?" "What would have changed your decision?"
"What is the one thing you would fix first?"

**Three questions, and they convert an impression into something actionable**, which most debriefs
otherwise fail to do.

## Separating the two kinds of finding

**Performance findings** — silence, bluffing, no result stated, rambling. **These are fixed by
practice and they move fast.**

**Content findings** — a subject that collapsed, a project area with no answer. **These are fixed by
work and they move slowly.**

**Conflating them is why remediation plans fail**, because the candidate practises the content gap
and studies the performance one, and neither responds.

## The output

**One sentence naming the single thing to change before the next mock.**

**One.** A list of six changes nothing, because attention divides and none of the six gets enough
of it — and a candidate with six findings has one underlying problem they have not identified yet.`,
    mcqs: [
      mcq('"I knew that, I just blanked" is probably true and does not matter because the round scored what happened, and "I knew it" is:',
        [['Not available to a real interviewer either', true],
         ['Impossible for the interviewer to verify', false],
         ['A sign the material needs more revision', false],
         ['Only relevant if it happens repeatedly', false]],
        'The real round assesses the same observable performance, so the unexpressed knowledge has no effect there either.'),
      mcq('"I would have done that differently in a real interview" is worth examining because it is almost never true and believing it:',
        [['Removes the finding entirely', true],
         ['Makes the next mock harder to arrange', false],
         ['Suggests the mock was badly run', false],
         ['Delays the remediation by one cycle', false]],
        'A real round is harder rather than easier, so the belief discards an observation that would otherwise have been acted on.'),
    ],
    checkpoint: [
      mcq('Conflating performance findings with content findings is why remediation plans fail, because the candidate:',
        [['Practises the content gap and studies the performance one', true],
         ['Addresses both at insufficient depth', false],
         ['Prioritises whichever is easier to fix', false],
         ['Cannot tell which one caused the result', false]],
        'Each remedy is applied to the wrong kind of problem, so neither finding responds to the work done on it.'),
      mcq('The output is one sentence rather than a list because a list of six changes nothing — attention divides — and a candidate with six findings:',
        [['Has one underlying problem not yet identified', true],
         ['Needs more time before the next mock', false],
         ['Should repeat the round with another interviewer', false],
         ['Is performing worse than the series expects', false]],
        'Findings that numerous usually share a cause, so the useful work is locating it rather than addressing each symptom.'),
    ],
  },
  {
    unitCode: 'T4_MOCK_HR_CHECKPOINT',
    notes: `**What the nine mocks together say about where the performance is, rather than the
capability.**

## The bar

**Nine mocks completed and debriefed.** And across them:

**No silence longer than fifteen seconds without a signpost.** **The approach stated before coding,
every time.** **A resume claim held under a detail question.** **A failure story with a real
consequence.** **"I do not know" said at least once under deliberate probing.** **A design
clarified before it was drawn.** **And one specific change made and verified between two mocks.**

**Seven items, all behavioural.** **None of them is knowledge**, which is the point of the module —
the knowledge was established in P14 to P21 and this measures whether it survives being watched.

## Reading the nine together

**A weakness appearing in one mock is a bad day. The same weakness in four is the finding.**

**The common patterns:**

**Silence across the technical mocks** — one problem, and the highest-leverage fix in the series.

**Bluffing in mocks 1, 3 and 7** — one problem, and the most damaging, because it devalues the
correct answers too.

**Strong announced, weak unannounced** — preparation that depends on knowing the subject.

**Strong alone, weak observed** — the performance gap this whole module exists to find.

## What a weak result means

**Fewer than nine done**: the series does not work at four. The comparison between results is the
product, and it needs the results.

**Debriefs defended rather than recorded**: the mocks happened and produced nothing.

**No change verified between two mocks**: the loop was never closed, and running nine measurements
with no intervention between them measures consistency rather than improvement.

## What this feeds

**P23's full-day simulation**, which is the tenth mock and assumes these nine are behind it. A
candidate arriving there without them spends the day discovering things the series was designed to
find one at a time.`,
    checkpoint: [
      mcq('All seven bar items are behavioural and none is knowledge, which is the point of the module because the knowledge was established earlier and this measures whether it:',
        [['Survives being watched', true],
         ['Has been retained since it was taught', false],
         ['Extends to unfamiliar material', false],
         ['Can be applied under time pressure', false]],
        'Capability and its expression under observation are separate, and only the second is what the mock series exists to measure.'),
      mcq('A weakness appearing in one mock is a bad day, where the same weakness in four is:',
        [['The finding', true],
         ['A reason to repeat those mocks', false],
         ['Evidence the material was not learned', false],
         ['Usually caused by the interviewer’s style', false]],
        'Repetition across independent sessions distinguishes a stable pattern from the variance any single round contains.'),
      mcq('Running nine measurements with no intervention between them measures:',
        [['Consistency rather than improvement', true],
         ['The reliability of the observations', false],
         ['How the candidate responds to fatigue', false],
         ['Whether the format affects the result', false]],
        'Without a change applied between rounds, the series records the same performance repeatedly instead of tracking a response to it.'),
      mcq('Bluffing across mocks 1, 3 and 7 is called the most damaging pattern because it:',
        [['Devalues the correct answers too', true],
         ['Appears in the announced and unannounced rounds', false],
         ['Is the hardest behaviour to change', false],
         ['Usually accompanies a knowledge gap', false]],
        'Once an unfounded assertion is detected, the interviewer can no longer distinguish knowing from believing in anything else that was said.'),
    ],
  },
];
