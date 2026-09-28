/**
 * T4_SIM_ROUNDS, T4_SIM_DEBRIEF, T4_VERIFY_GAPS and T4_CAPSTONE — thirteen units. Modules P23-P24.
 *
 * The last thirteen units of Year 4, and of the four-year curriculum.
 *
 * ── P23 IS THE TENTH MOCK, AND IT IS A DIFFERENT KIND OF THING ────────────────────────────
 *
 * Nine mocks measured nine capabilities one at a time. This measures them on the same day, in
 * order, with the fatigue accumulating — which is the only condition under which the actual
 * failure mode of a placement drive appears. Candidates do not fail drives because they cannot
 * do round four; they fail because round four happens after rounds one to three.
 *
 * Six rounds, two PRACTICE units of 150 minutes each. That is a real day and it is meant to be.
 *
 * ── P24 EXISTS BECAUSE THE SPEC ASKS FOR REMAINING-GAP AWARENESS AS AN OUTCOME ────────────
 *
 * Not gap closure — gap AWARENESS. A graduate who knows precisely what they cannot yet do is more
 * employable than one who believes they can do everything, and considerably more employable than
 * one who has no idea. That is an unusual thing for a curriculum to assert and it is the right
 * assertion: every real engineer works with a known edge, and the skill is knowing where it is.
 *
 * ── THE CAPSTONE, AND WHY ITS ASSIGNMENT IS A BRIEF ───────────────────────────────────────
 *
 * T4_CAPSTONE_BUILDING_IT is a PROJECT unit, so its assignment carries no `coding` block — the
 * seeder stores a PROJECT's assignment as a brief and silently skips one shaped like an exercise.
 * That is correct here for a reason beyond the mechanism: a capstone with starter code and hidden
 * tests is not a capstone. The whole point is that the scope, the structure and the definition of
 * done are the student's.
 *
 * Attribution: T4_SIM_ROUNDS and T4_SIM_DEBRIEF go to PLACEMENT_READINESS; T4_VERIFY_GAPS to
 * SELF_ASSESSMENT; T4_CAPSTONE to SOFTWARE_ARCHITECTURE with the defence unit on
 * TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FINAL_BUNDLES: PilotBundle[] = [
  /* ══ T4_SIM_ROUNDS ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SIM_ROUNDS_PREPARING_FOR_THE_DAY',
    notes: `**Six rounds in order, what each one screens for, and what happens between them.**

## The shape of a drive day

**Round 1 — Aptitude.** Quantitative, logical, verbal. **A filter, not an assessment.** Companies
use it to reduce two thousand applicants to four hundred, and it is scored on a cutoff.

**Round 2 — Technical MCQ.** Programming output, core CS, engineering tools. **The second filter**,
and frequently sectional — a combined pass with one section failed can still eliminate.

**Round 3 — Coding.** Two or three problems, an online judge, ninety minutes. **The first round that
measures rather than filters.**

**Round 4 — Technical interview.** The first human. DSA, fundamentals, sometimes design.

**Round 5 — Project or specialization.** Your work, interrogated.

**Round 6 — HR.** Communication, motivation, behavioural. **The round that can still lose an offer
that rounds 1 to 5 earned.**

## What happens between them

**Waiting.** Frequently hours, in a room, with other candidates, and **the waiting is a real part
of the day that nobody prepares for.**

**Results announced between rounds**, so the cohort visibly shrinks — which affects people more
than they expect and is worth having anticipated.

**Little or no food.** A drive can run from eight in the morning to seven at night.

## The practical preparation, which is not trivial

**Eat before. Carry water and something to eat.** **A candidate performing badly in round five
because they have not eaten since seven has lost the day to logistics.**

**Take the same documents every drive asks for:** resume copies, identification, marksheets.

**Know the format in advance** where you can — seniors who attended last year are the best source
and the information is usually freely given.

## The thing worth understanding before the day

**Each round screens for something different, and a weak round is not a weak day.**

**Rounds 1 and 2 are cutoffs — clear them and they are forgotten.** Nobody in round five is looking
at your aptitude score, and a candidate who carries a bad round-two feeling into round four has lost
something that was already banked.`,
    mcqs: [
      mcq('Rounds 1 and 2 are described as filters rather than assessments because companies use them to:',
        [['Reduce a large applicant pool against a cutoff', true],
         ['Rank candidates for the later rounds', false],
         ['Test material the interviews will revisit', false],
         ['Identify which direction each candidate suits', false]],
        'They exist to make the remaining rounds administratively possible, and a pass is a pass regardless of the margin.'),
      mcq('A candidate performing badly in round five because they have not eaten since seven has:',
        [['Lost the day to logistics', true],
         ['Been unlucky with the scheduling', false],
         ['Underestimated the technical difficulty', false],
         ['Failed to pace the earlier rounds', false]],
        'The failure has no relationship to capability, which is what makes the practical preparation worth treating seriously.'),
    ],
    checkpoint: [
      mcq('A candidate who carries a bad round-two feeling into round four has lost something that:',
        [['Was already banked', true],
         ['The interviewer would not have seen', false],
         ['Could have been recovered in round three', false],
         ['Only affects the final ranking', false]],
        'Clearing a cutoff round settles it permanently, so the residual anxiety costs performance in a round where it has no bearing.'),
      mcq('The waiting between rounds is described as a real part of the day that:',
        [['Nobody prepares for', true],
         ['Companies deliberately extend', false],
         ['Is shorter than candidates expect', false],
         ['Can be used for final revision', false]],
        'Hours spent waiting among a visibly shrinking cohort affect performance, and no standard preparation addresses it.'),
    ],
  },
  {
    unitCode: 'T4_SIM_ROUNDS_ROUNDS_ONE_TO_THREE',
    notes: `**The written half of a drive, run back to back at the real pace.**

## The format

**One sitting. No gaps beyond what a real drive gives, which is fifteen minutes at most.**

**Round 1 — Aptitude.** Thirty-five questions, thirty-five minutes.

**Round 2 — Technical MCQ.** Forty questions, thirty minutes. Programming output, core CS,
engineering.

**Round 3 — Coding.** Two problems, sixty minutes, hidden tests.

**A hundred and fifty minutes with almost no break**, which is the condition and is the reason this
is one unit rather than three.

## Why back to back changes the result

**Because the three have been practised separately and are never sat separately.**

**Round 3 is the one that suffers.** A coding problem attempted fresh and the same problem attempted
after seventy minutes of timed multiple choice are different problems — **and every candidate has
only ever practised the first version.**

## The rules, which are the real ones

**No stopping between rounds.** **No re-attempting an earlier round.** **No checking answers.**
**Cutoffs applied per round**, and a failed cutoff is recorded rather than ending the sitting —
because the purpose is measurement across all three.

**Sectional cutoffs on round 2.** A combined pass with one section below half is a fail, which is
how a real paper is frequently marked and is a thing candidates discover too late.

## What to record

**The score per round.** **The score per section in round 2.** **How many round-1 questions were
skipped rather than attempted** — skipping is a technique and its absence is a finding.

**And time to first line of code in round 3**, compared with what it is on a fresh attempt. **That
comparison is the specific thing this unit exists to produce.**

## What usually comes out

**Round 3 materially worse than in isolation.** Expected, and the size of the drop is the
information.

**And a failed section in round 2** that a combined score would have concealed.

## What not to conclude

**That the day was a failure.** **It is a measurement with time remaining**, and a round-3 drop of
twenty per cent under fatigue is a pacing problem with a known fix rather than a capability
problem.`,
    mcqs: [
      mcq('Round 3 suffers most because a coding problem attempted fresh and the same problem after seventy minutes of timed multiple choice are different problems, and every candidate:',
        [['Has only ever practised the first version', true],
         ['Underestimates how long coding takes', false],
         ['Treats the earlier rounds as less important', false],
         ['Loses concentration in the final hour', false]],
        'Isolated practice always presents the coding round fresh, so the fatigued version has never been exercised.'),
      mcq('A failed cutoff is recorded rather than ending the sitting because the purpose is:',
        [['Measurement across all three rounds', true],
         ['Keeping the candidate’s confidence intact', false],
         ['Matching how real drives handle borderline cases', false],
         ['Allowing the pacing to be observed fully', false]],
        'Stopping at the first failure would forfeit the data from the remaining rounds, which is what the simulation exists to collect.'),
    ],
    checkpoint: [
      mcq('A combined pass with one section below half being a fail is described as how a real paper is frequently marked and a thing candidates:',
        [['Discover too late', true],
         ['Are usually warned about in advance', false],
         ['Can compensate for in the coding round', false],
         ['Only encounter at larger companies', false]],
        'Sectional cutoffs are rarely announced, so a candidate optimising for the aggregate is eliminated by a rule they did not know applied.'),
      mcq('A round-3 drop of twenty per cent under fatigue is described as:',
        [['A pacing problem with a known fix rather than a capability problem', true],
         ['Within the normal variation between attempts', false],
         ['A reason to increase coding practice volume', false],
         ['Evidence the earlier rounds took too long', false]],
        'The capability was demonstrated on the fresh attempt, so what the drop measures is endurance and pacing, which are separately addressable.'),
    ],
  },
  {
    unitCode: 'T4_SIM_ROUNDS_ROUNDS_FOUR_TO_SIX',
    notes: `**The interview half, on the same day, when you are already tired. Which is the
point.**

## The format

**The same day as rounds 1 to 3.** A break of thirty to sixty minutes, and then:

**Round 4 — Technical interview.** Forty-five minutes. A coding problem narrated, fundamentals,
possibly a design sketch.

**Round 5 — Project or specialization.** Forty-five minutes on your own work, or on your direction.

**Round 6 — HR.** Twenty-five minutes.

**A hundred and fifty minutes of interviews after a hundred and fifty minutes of written rounds**,
which is a real drive day and is unlike anything the nine mocks measured.

## What fatigue does specifically, and it is not general

**Narration goes first.** A tired candidate solves and stops speaking, because narrating while
thinking is the thing that costs the most attention — **and it is the single most damaging thing
to lose in round 4.**

**Then the follow-up response.** "Can you do better?" is met with less patience than it would have
been at nine in the morning.

**Then round 6 entirely.** **Candidates who have been performing for five hours produce flat
prepared answers in the HR round**, and the HR round is scored substantially on how it sounded.

**Technical accuracy holds up better than any of these**, which is why fatigue in a drive is a
communication problem rather than a knowledge one — and why it is invisible to a candidate
reviewing their own performance afterwards.

## The interviewer's instruction

**Do not go easier because it is late.** The real round will not.

**And record round 6 most carefully**, because it is the round most affected and the one most likely
to be dismissed as "I was just tired" — which is precisely the finding.

## What to record

**Silence length in round 4, against mock 2's figure.** **Whether the project answers kept their
specificity.** **Whether round 6 sounded rehearsed, flat or natural.** **And the point in the day
at which the quality visibly changed.**

## The output

**Six results, one per round.** **Not an average** — the next unit is entirely about why.`,
    mcqs: [
      mcq('Narration goes first under fatigue because narrating while thinking is the thing that costs the most attention, and it is:',
        [['The single most damaging thing to lose in round 4', true],
         ['Recoverable once the problem is understood', false],
         ['Less important than the correctness of the solution', false],
         ['Noticed by the candidate as it happens', false]],
        'The interviewer can only score what they can see, so losing the narration forfeits most of the round’s criteria at once.'),
      mcq('Technical accuracy holding up better than communication means fatigue in a drive is a communication problem rather than a knowledge one, and:',
        [['It is invisible to a candidate reviewing their own performance', true],
         ['It affects the written rounds more than the interviews', false],
         ['It can be corrected during the day itself', false],
         ['Only the final round is meaningfully degraded', false]],
        'The candidate recalls solving the problems correctly, which is true, and has no access to how the delivery sounded.'),
    ],
    checkpoint: [
      mcq('Round 6 is recorded most carefully because it is the round most affected and the one most likely to be dismissed as "I was just tired" — which is:',
        [['Precisely the finding', true],
         ['A reasonable explanation for one round', false],
         ['Less serious than a technical weakness', false],
         ['Avoidable with a longer break beforehand', false]],
        'A real drive produces the same fatigue, so the degradation under it is the performance rather than an excuse for it.'),
      mcq('The interviewer is told not to go easier because it is late, on the grounds that:',
        [['The real round will not', true],
         ['The candidate would notice the concession', false],
         ['Consistency with the mocks is required', false],
         ['Fatigue affects all candidates equally', false]],
        'The simulation is only informative if its conditions match the drive it is predicting.'),
    ],
  },

  /* ══ T4_SIM_DEBRIEF ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_SIM_DEBRIEF_READING_THE_RESULT',
    notes: `**What each round said about a different capability, and why an average would hide all
of it.**

## Six results, six capabilities

**Round 1 — speed and technique under time pressure.** Not mathematics.

**Round 2 — recall breadth, and whether any subject is hollow.**

**Round 3 — implementation under a clock, against hidden tests.**

**Round 4 — reasoning made visible.**

**Round 5 — depth and ownership of your own work.**

**Round 6 — communication under accumulated fatigue.**

**These are six different things.** A candidate can be strong at four and eliminated by either of
the other two, because **a drive is a series of gates rather than a total.**

## Why an average is actively misleading

**A 70% average could be six rounds at 70, or four at 90 and two at 30.**

**The first is a solid candidate. The second fails the drive on round 1 and never reaches the four
strong rounds at all** — and the average reports them identically, which is worse than reporting
nothing.

## The patterns worth recognising

**Strong written, weak interview.** Knowledge without performance. **The most common shape**, and
the most fixable, because the knowledge is already there.

**Weak written, strong interview.** Speed and technique on the filters. Also fixable, and fixable
faster than people expect, because filter rounds respond to technique.

**Strong early, weak late.** Stamina and pacing. **Invisible in every one of the nine mocks**, and
this is the only instrument that finds it.

**Weak in one round only.** The simplest and best case — a specific gap with a specific remedy.

## Comparing against the mocks

**Each round has a mock equivalent.** **The gap between the two is the fatigue cost**, and it is
the specific number this simulation exists to produce.

**Round 4 against mock 2. Round 5 against mock 4. Round 6 against mock 9.**

**A candidate who matched their mock scores has no fatigue problem.** One who dropped twenty per
cent in round 6 alone has a specific, addressable finding that no mock could have shown them.

## What the result is not

**A prediction.** It is a measurement of one day under conditions harsher than most real drives,
taken with time remaining — and its only purpose is to say where the remediation goes.`,
    mcqs: [
      mcq('A 70% average could be six rounds at 70 or four at 90 and two at 30, and reporting them identically is:',
        [['Worse than reporting nothing', true],
         ['Acceptable as a summary figure', false],
         ['A limitation of any scoring system', false],
         ['Only a problem near the cutoff', false]],
        'The average asserts equivalence between a candidate who passes and one who is eliminated at the first gate, which misinforms rather than simplifies.'),
      mcq('"Strong early, weak late" is described as invisible in every one of the nine mocks because:',
        [['This is the only instrument that runs them in one day', true],
         ['The mocks are scored more generously', false],
         ['Stamina is not assessed in any single round', false],
         ['Candidates schedule mocks when they are fresh', false]],
        'Accumulated fatigue only exists across a sequence, so no individual session can produce the observation.'),
    ],
    checkpoint: [
      mcq('The gap between each round and its mock equivalent is described as:',
        [['The fatigue cost, and the number this simulation exists to produce', true],
         ['A measure of how much the candidate improved', false],
         ['An indication of scoring inconsistency', false],
         ['The margin by which the cutoff was cleared', false]],
        'Both measure the same capability under different conditions, so the difference isolates what the accumulated day cost.'),
      mcq('"Strong written, weak interview" is called the most common shape and the most fixable because:',
        [['The knowledge is already there', true],
         ['Interview technique is quickly learned', false],
         ['The written rounds matter less overall', false],
         ['It responds to additional mock practice', false]],
        'What is missing is the expression rather than the capability, and behavioural changes move faster than knowledge gaps do.'),
    ],
  },
  {
    unitCode: 'T4_SIM_DEBRIEF_THE_TWO_THINGS_TO_FIX',
    notes: `**Choosing what to work on from the result rather than working on everything and moving
nothing.**

## Why two or three, and not eight

**Because attention divides and effort does not multiply.**

**Eight remediation items produce eight partial efforts and no closed gap.** Two produce two closed
gaps, and the second-order effect is that **closing something measurably is what makes the
remaining six feel possible** — which matters more than it sounds with six weeks left.

## The selection rule

**Largest gap, cheapest fix, most rounds affected.** **All three, weighed together.**

**A finding that is large, cheap and affects four rounds is obvious.** Most are not, and the rule is
what stops the choice being made by whichever failure felt worst on the day.

## What is cheap and what is not

**Cheap — days, not weeks:**

**Silence in interviews.** Signposting. A sentence, three rehearsals.

**No approach stated.** A habit, and it is one sentence.

**Aptitude technique** — skipping, elimination, not finishing. Technique responds fast.

**A sectional gap in round 2** where the subject is known but was not revised.

**Expensive — weeks:**

**Implementation speed.** Accumulates slowly and does not respond to a fortnight.

**A genuinely hollow subject.** Building it from nothing.

**Project depth** where the work was not actually done.

**The honest version:** **if it is expensive and it is six weeks out, it may not be the right
choice** — and choosing the cheap fixes is not avoidance, it is arithmetic.

## Writing it down properly

**Each item: the finding, the action, the verification, the date.**

"Round 4 had three silences over twenty seconds. I will signpost every pause. Verified by a
recorded mock on the 14th, counting silences over fifteen seconds."

**The verification clause is what makes it a plan rather than an intention**, and it is the part
that is always omitted.

## The check on the list

**If it has more than three items, cut it.** **If any item has no verification, it is not on the
list.** **If any item cannot be finished before the first real drive, it belongs on a different
list** — the one for after placement, which is a real list and is P24's subject.`,
    mcqs: [
      mcq('Eight remediation items produce eight partial efforts and no closed gap, and closing something measurably has a second-order effect, namely that it:',
        [['Makes the remaining six feel possible', true],
         ['Frees time for the harder items', false],
         ['Confirms the diagnosis was correct', false],
         ['Improves performance in adjacent areas', false]],
        'With six weeks remaining, the belief that gaps can actually be closed determines whether the remaining work is attempted at all.'),
      mcq('The selection rule — largest gap, cheapest fix, most rounds affected — is what stops the choice being made by:',
        [['Whichever failure felt worst on the day', true],
         ['The order the rounds occurred in', false],
         ['The interviewer’s stated priorities', false],
         ['Which subject the candidate prefers', false]],
        'Emotional salience does not track remediation value, so an explicit rule is needed to override it.'),
    ],
    checkpoint: [
      mcq('The verification clause is described as what makes it a plan rather than an intention, and it is the part:',
        [['Always omitted', true],
         ['Hardest to define for behavioural items', false],
         ['Added once the work is underway', false],
         ['Only needed for the expensive fixes', false]],
        'Without a stated measurement and date, the item can be believed complete without ever being tested.'),
      mcq('Choosing the cheap fixes when an expensive one is six weeks out is described as:',
        [['Arithmetic rather than avoidance', true],
         ['A compromise the candidate should note', false],
         ['Acceptable only for behavioural gaps', false],
         ['A decision to revisit after the first drive', false]],
        'A remedy that cannot complete before the deadline returns nothing within it, regardless of how important the underlying gap is.'),
    ],
  },
  {
    unitCode: 'T4_SIM_DEBRIEF_CHECKPOINT',
    notes: `**Where the six capabilities actually stand, recorded so the remediation has a
target.**

## The bar

**A full six-round day completed in one sitting.** **Six separate results, not an average.** **Each
compared against its mock equivalent, giving a fatigue cost per round.** **A remediation list of at
most three items, each with an action, a verification and a date.** **And at least one item already
closed and verified.**

**The last one is what makes this a checkpoint rather than a report.**

## What a weak result means

**The day was not completed in one sitting**: then it measured six capabilities and not the day,
and the thing the simulation exists for — the fatigue cost — was not produced.

**An average was computed**: it conceals the round that would have eliminated you. Six numbers.

**No mock comparison**: the fatigue cost is unavailable, so a weak round cannot be attributed to
fatigue or to capability, and those need different remedies.

**More than three remediation items**: nothing will close. Choose by largest gap, cheapest fix, most
rounds affected.

**No item verified**: the loop is open, and an unverified fix is an assumption.

## The finding this checkpoint most often produces

**A fatigue cost concentrated in one or two rounds rather than spread evenly** — usually round 3 and
round 6.

**Which is good news**, because a concentrated cost has a targeted fix, where an even one would mean
rebuilding stamina generally.

## What this is not

**A prediction of the real drive.** The conditions here are harsher than most, there is no second
chance inside a simulation, and the real day carries adrenaline that a practice day does not.

**It is a measurement with time remaining**, and every part of its design — the six numbers, the
mock comparison, the three-item limit, the verification — exists to convert that measurement into
work that can actually be finished.

## What this feeds

**P24**, which asks what is still open after the remediation, and **the first real drive**, which is
now a format you have sat rather than one you have read about.`,
    checkpoint: [
      mcq('At least one item already closed and verified is what makes this:',
        [['A checkpoint rather than a report', true],
         ['Comparable with the mock series', false],
         ['Valid evidence for the skill record', false],
         ['Sufficient preparation for a real drive', false]],
        'A measurement alone records a state, where a demonstrated closure shows the remediation loop actually functions.'),
      mcq('Without the mock comparison a weak round cannot be attributed to fatigue or to capability, and those:',
        [['Need different remedies', true],
         ['Produce the same result in a real drive', false],
         ['Are equally expensive to address', false],
         ['Can be distinguished from the score alone', false]],
        'Fatigue is addressed by pacing and stamina where capability is addressed by content, so the attribution determines the work.'),
      mcq('A fatigue cost concentrated in one or two rounds rather than spread evenly is described as good news because a concentrated cost:',
        [['Has a targeted fix', true],
         ['Indicates the other rounds were strong', false],
         ['Is smaller in total than an even one', false],
         ['Usually disappears on a second attempt', false]],
        'An even cost would require rebuilding stamina generally, where a concentrated one identifies a specific round to address.'),
      mcq('If the day was not completed in one sitting, it measured six capabilities and not the day, meaning:',
        [['The fatigue cost was not produced', true],
         ['The individual results are unreliable', false],
         ['The mock comparison cannot be made', false],
         ['The remediation list will be too long', false]],
        'Accumulation across the sequence is the one thing the simulation adds over the nine mocks, and breaking the sitting removes it.'),
    ],
  },

  /* ══ T4_VERIFY_GAPS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_VERIFY_GAPS_WHAT_IS_STILL_OPEN',
    notes: `**Knowing what you cannot yet do is part of being ready.**

## The claim this unit makes

**A graduate who can state precisely what they cannot do is more employable than one who believes
they can do everything.**

**That is not a consolation.** It is how engineering works: every engineer at every level operates
with a known edge, and the skill that separates them is knowing where theirs is and saying so
before it costs somebody else time.

**An interviewer can work with "I have not done X, but I have done Y and it took me a week to pick
that up."** **They cannot work with a confident wrong answer**, and they have no way to detect one
until it is expensive.

## What a gap list looks like when it is honest

**Specific, bounded, and without editorial.**

"I have not deployed anything that had real users beyond my own project. I have not written tests
for anything I did not also write the code for. I have used one database properly and read about
others. I have never worked in a codebase somebody else designed."

**Four sentences. Each one is checkable, none is apologetic, and all four are normal for a
graduate** — which is the reason saying them costs nothing.

## The two failure modes

**Panic.** Reading the list as a verdict. **It is not; it is the shape of every graduate's
position**, and the list of what a three-year student has not done is necessarily long.

**Dismissal.** "I can pick that up." **Sometimes true, and it is not an answer** — the question was
what you cannot do, and converting it into a statement about your learning speed has declined it.

## How to build it

**Go through the four years' skill records and mark three things:** can do unsupervised, can do with
help, have not done.

**The third list is the answer**, and the second is more interesting than either — **because "can do
with help" is where most of a graduate's actual capability sits, and describing it accurately is a
more precise claim than either of the extremes.**

## Where it gets used

**"What are you weakest at?"** **"What would you need help with in the first month?"** **"What do
you want to learn here?"**

**All three are the same question**, and a candidate who has done this exercise answers all three
from the same honest list while everybody else improvises.`,
    mcqs: [
      mcq('An interviewer can work with a stated gap but cannot work with a confident wrong answer, because they have no way to detect one:',
        [['Until it is expensive', true],
         ['Without asking a follow-up question', false],
         ['In a short interview format', false],
         ['Unless the candidate volunteers it', false]],
        'An unfounded assertion is indistinguishable from a sound one at the time, so its cost arrives after decisions have been made on it.'),
      mcq('"I can pick that up" is sometimes true and is not an answer because the question was what you cannot do, and converting it into a statement about learning speed:',
        [['Has declined it', true],
         ['Overstates the candidate’s adaptability', false],
         ['Belongs in a different part of the round', false],
         ['Requires evidence the candidate lacks', false]],
        'The answer substitutes a claim about the future for the requested account of the present, which is a refusal in another form.'),
    ],
    checkpoint: [
      mcq('"Can do with help" is described as more interesting than either extreme because it is where:',
        [['Most of a graduate’s actual capability sits', true],
         ['Employers focus their training effort', false],
         ['The skill records are least reliable', false],
         ['The fastest improvement is available', false]],
        'Describing that middle band accurately is a more precise claim than asserting either full independence or none.'),
      mcq('Four honest gap sentences cost nothing to say because all four are:',
        [['Normal for a graduate', true],
         ['Too specific to be held against you', false],
         ['Balanced by the strengths already shown', false],
         ['Things the interviewer would discover anyway', false]],
        'The interviewer expects a three-year student to have an extensive list of things not yet done, so stating it confirms rather than reveals.'),
    ],
  },
  {
    unitCode: 'T4_VERIFY_GAPS_CLOSING_THEM',
    notes: `**Targeted work on the two or three things the simulation exposed, rather than starting
again.**

## The instinct to resist

**Starting over.**

**A poor simulation result produces an urge to revise everything from the beginning**, and it is
the single worst response available: it takes the remaining time, it addresses nothing in
particular, and it produces no measurable change.

**Three or four years of work is not undone by one difficult day**, and a plan that behaves as
though it were has misread the result.

## What targeted work actually looks like

**For each item: the specific deficiency, the smallest intervention that addresses it, and the date
it will be tested.**

**Silence in round 4.** Three recorded problems, signposting every pause. **Ninety minutes total**,
spread over a week.

**Round 2's operating systems section at 40%.** Not the whole subject — **the three question types
that were wrong.** Usually context switching, deadlock conditions and scheduling arithmetic. **Four
hours.**

**Aptitude below the cutoff on time rather than accuracy.** Skipping technique, on three timed sets.
**Two hours.**

**Notice the scale.** These are hours and days, and that is what a targeted remedy costs when the
diagnosis is specific. **A vague diagnosis costs weeks, which is the actual reason vagueness is
expensive.**

## Working on something expensive

**Sometimes the finding is real and slow** — implementation speed, a hollow subject, project depth
that was never built.

**Then: do the cheap ones first, start the expensive one, and accept that it continues past the
first drive.** **An expensive gap being open at the first drive is normal**, and pretending it can
be closed in a fortnight produces a fortnight spent and the gap still open.

## The daily shape that works

**One session on one item.** Not all three in a day, not one item for a week.

**Rotating keeps all three moving**, and a gap that is worked on once and abandoned has consumed its
time without producing a closure.

## What not to do

**Do not re-run the full simulation to check.** It is a whole day and it measures everything.

**Test the specific thing.** The next unit is about that, and it is a different activity from
measuring again.`,
    mcqs: [
      mcq('Starting over is the single worst response because it takes the remaining time, addresses nothing in particular, and:',
        [['Produces no measurable change', true],
         ['Repeats material the mocks already covered', false],
         ['Delays the capstone past its deadline', false],
         ['Conflicts with the remediation list', false]],
        'Undirected revision cannot be verified against any specific finding, so no gap can be shown to have closed.'),
      mcq('A vague diagnosis costs weeks where a specific one costs hours, which is described as the actual reason:',
        [['Vagueness is expensive', true],
         ['Specific findings are preferred', false],
         ['The simulation records six numbers', false],
         ['Remediation lists are capped at three', false]],
        'The cost of a remedy scales with how precisely the deficiency is located, which is what makes diagnosis worth the effort.'),
    ],
    checkpoint: [
      mcq('An expensive gap being open at the first drive is described as normal, and pretending it can be closed in a fortnight produces:',
        [['A fortnight spent and the gap still open', true],
         ['A false sense of readiness on the day', false],
         ['Work that has to be repeated afterwards', false],
         ['Time taken from the cheaper remedies', false]],
        'The timescale is a property of the gap, so committing to an impossible deadline forfeits the time without changing the outcome.'),
      mcq('Rotating one session per item is preferred because a gap worked on once and abandoned has:',
        [['Consumed its time without producing a closure', true],
         ['Been diagnosed more precisely than the others', false],
         ['Reduced the value of the remaining items', false],
         ['Made the verification harder to schedule', false]],
        'Partial work on an item returns nothing, so the time spent is lost entirely rather than contributing proportionally.'),
    ],
  },
  {
    unitCode: 'T4_VERIFY_GAPS_PRACTICE',
    notes: `**Being measured again on the thing you just worked on, rather than assuming it
moved.**

## Why this is a separate unit

**Because the loop is almost always left open.**

**The pattern is consistent:** a gap is found, work is done, and the gap is assumed closed because
work was done on it. **Effort is not evidence**, and a candidate who has confused the two carries a
closed-in-belief gap into a real drive.

## Designing the re-test

**Three properties, and all three are required.**

**Same measurement.** If the finding was "three silences over twenty seconds in a forty-five minute
round", the re-test is a forty-five minute round with silences counted. **Not a shorter one, not a
self-assessment, not a different problem type.**

**Different material.** Same format, new problem. Re-testing on the same problem measures whether
you remember it.

**Recorded, not remembered.** **A number against the original number.** "It felt better" is the
thing this unit exists to prevent.

## The three outcomes

**It closed.** Record it, remove it from the list, and — **this matters more than it sounds** —
notice that the remediation loop works, because that is what makes the next gap worth attempting.

**It moved but not enough.** Three silences became one. **That is progress and the item stays**,
with the same intervention continued rather than replaced.

**It did not move.** **The diagnosis was wrong, not the effort.** Three silences at twenty seconds
unchanged after signposting practice means the cause was not a signposting habit — it may be that
the approach is unclear at that point, which is a different problem with a different fix.

**Most candidates respond to this outcome by working harder on the same remedy**, and that is
exactly the wrong move.

## The record

**Gap, original measurement, intervention, re-test measurement, date.** **Five fields.**

**This is also the most useful thing you own going into an interview about weaknesses** — it is a
documented instance of finding a deficiency, acting on it, and measuring the result, which is a
better answer to "what are you working on?" than anything that can be improvised.

## The honest case

**A gap that did not close, re-tested and recorded, is a legitimate result.** It goes on the
still-open list, accurately described — which is what the previous unit was for and is a
considerably stronger position than an unverified assumption.`,
    mcqs: [
      mcq('A gap is assumed closed because work was done on it, and the unit exists because:',
        [['Effort is not evidence', true],
         ['Most remediations are under-resourced', false],
         ['The original measurement is often wrong', false],
         ['Improvement is slower than candidates expect', false]],
        'Work performed and change achieved are independent, and only a measurement distinguishes them.'),
      mcq('The re-test uses different material because re-testing on the same problem measures:',
        [['Whether you remember it', true],
         ['A narrower slice of the capability', false],
         ['Improvement in speed rather than method', false],
         ['The effect of familiarity on confidence', false]],
        'Recall of the specific problem substitutes for the capability, so the result no longer reflects what was being remediated.'),
    ],
    checkpoint: [
      mcq('If the measurement did not move, the conclusion is that the diagnosis was wrong rather than the effort, and most candidates respond by:',
        [['Working harder on the same remedy, which is exactly wrong', true],
         ['Removing the item from the list', false],
         ['Re-running the full simulation', false],
         ['Accepting it as a slow gap', false]],
        'An unchanged measurement indicates the intervention does not address the cause, so intensifying it cannot produce a different result.'),
      mcq('The five-field record is described as the most useful thing you own going into an interview about weaknesses because it documents:',
        [['Finding a deficiency, acting on it, and measuring the result', true],
         ['Which areas were strongest across the series', false],
         ['How quickly the candidate learns new material', false],
         ['That the remediation list was completed', false]],
        'That sequence is a demonstrated working process, which answers "what are you working on?" more convincingly than anything improvised.'),
    ],
  },

  /* ══ T4_CAPSTONE ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_CAPSTONE_SCOPING_IT',
    notes: `**The capstone fails on scope more often than on difficulty. Choosing something that
ships.**

## The failure this unit prevents

**A capstone that is 70% of something ambitious.**

**It cannot be demonstrated, it cannot be deployed, and it cannot be defended** — because half the
interesting decisions were never reached. **And it is the most common outcome**, produced by a
scope chosen from enthusiasm at week one rather than from arithmetic.

**A complete small system beats an incomplete large one in every context this work will be used
in**: the portfolio, the project round, the defence, and your own sense of what you can finish.

## The arithmetic

**You have the weeks the programme allocates, and realistically about half the hours you imagine.**

**Take your estimate and double it.** **This is not pessimism** — the doubling accounts for the
integration, the deployment, the bug that takes a day, and the week you lose to something else,
all of which are certain and none of which are in the estimate.

## Scoping by the demo

**Write the two-minute demonstration first, before any code.**

**"I open it, do X, and Y happens. Then I do Z, and here is what the system did about it."**

**Everything required for that demo is the scope. Everything else is later.** This single technique
prevents most scope failures, because it forces the definition of done to exist before the work
starts.

## What makes a capstone defensible

**Not the size.** **Three things:**

**A real decision with a real alternative.** One place you chose between two approaches for a
reason.

**A hard part.** Something that was genuinely difficult — concurrency, a data model that had to
change, a performance problem, an integration that fought back.

**Evidence it works.** Tests, or a deployment, or both. **"It works on my machine" is not evidence**
and it is the first thing a defence will probe.

## What to avoid choosing

**A clone of something with no distinguishing decision.** It ships and it defends badly, because
every choice was made by the thing being cloned.

**Anything depending on data you do not have.** Access is the failure, and it fails at week five.

**Anything requiring a technology you have not touched, unless learning it is the point** and the
scope has been halved to pay for it.

## The one-sentence test

**"It is a system that does X for Y, and the interesting part is Z."**

**If Z is empty, the project will defend badly no matter how much is built** — and that is worth
discovering now rather than at the defence.`,
    mcqs: [
      mcq('A capstone that is 70% of something ambitious cannot be defended because:',
        [['Half the interesting decisions were never reached', true],
         ['The remaining work is hard to describe', false],
         ['Reviewers discount incomplete projects', false],
         ['The architecture was never finalised', false]],
        'A defence questions the choices made, and the ones that would have been most interesting were still ahead of the work that stopped.'),
      mcq('Doubling the estimate is described as not pessimism because the doubling accounts for integration, deployment, the bug that takes a day and the lost week, all of which are:',
        [['Certain, and none of which are in the estimate', true],
         ['Specific to larger projects', false],
         ['Difficult to plan for individually', false],
         ['Avoidable with better scheduling', false]],
        'Each occurs reliably and is systematically omitted from the original figure, so the correction restores rather than inflates.'),
    ],
    checkpoint: [
      mcq('Writing the two-minute demonstration before any code prevents most scope failures because it forces:',
        [['The definition of done to exist before the work starts', true],
         ['The features to be prioritised by value', false],
         ['The technology choices to be made early', false],
         ['The presentation to be prepared in advance', false]],
        'With the finished state specified up front, everything outside it is visibly optional rather than gradually accumulated.'),
      mcq('In the one-sentence test, if Z — the interesting part — is empty, the project will defend badly:',
        [['No matter how much is built', true],
         ['Unless the implementation is unusually clean', false],
         ['Only if the scope was also too large', false],
         ['Except in a portfolio review', false]],
        'A defence is about the decisions, and a project with no distinguishing one has nothing for the questions to reach.'),
    ],
  },
  {
    unitCode: 'T4_CAPSTONE_BUILDING_IT',
    notes: `**One substantial piece of work, built properly, that the whole year is judged by.**

## What "built properly" means here

**Not bigger. Built to the standard P05 through P13 established**, which is the only sense in which
this is a Year-4 project rather than a larger version of a Year-2 one.

**Version control with a readable history.** Small commits, messages saying why. **This is also
checkable evidence about your commit discipline** and it is one of the few claims a reviewer can
verify.

**Tests on the parts that matter.** Not everything — the logic that would be expensive to get
wrong. **A capstone with no tests defends badly at exactly the point where the defence gets
interesting.**

**Errors handled rather than allowed to propagate.** What happens when the input is wrong, the
network fails, the file is missing.

**Secrets outside the code.** Environment variables, a \`.gitignore\` written before the first
commit rather than after the key is already in the history.

**A README that lets somebody assess it without running it**, and a deployment or a recording if a
deployment is not possible.

## The working rhythm

**Ship something that runs in the first week.** Small, ugly, end to end.

**A system that runs from week one and grows is finishable. One that integrates at the end is
not**, and the integration week is where an ambitious capstone dies.

**Then one feature at a time, each complete before the next starts.** Complete meaning: works,
handles its errors, tested if it matters, committed.

## Keeping the decision log

**Every time you choose between two approaches, write three lines: the options, the choice, the
reason.**

**Ten minutes a week across the whole project**, and it is the single highest-value thing you can do
for the defence — **because the defence is entirely about decisions and you will not remember them
in eight weeks.**

**You will remember what you built. You will not remember why you chose Postgres over Mongo in week
two**, and that is precisely what will be asked.

## The last week

**No new features.** **The README, the deployment, the demo path, and fixing what is broken.**

**A capstone whose last week went into a half-finished feature is worse than the same capstone
whose last week went into making the rest presentable** — and this is the most reliably ignored
piece of advice in the module.

## The standard being applied

**Would you be comfortable if a reviewer opened this repository without you there to explain it?**

**That is the whole bar**, and it is the condition under which it will actually be read.`,
    assignment: {
      title: 'The Year-4 capstone',
      description: 'Build one substantial system end to end, to the engineering standard this year established, and keep the decision log that makes it defensible.',
      instructions: `**Build one substantial system, end to end, to the engineering standard this year
established — and keep the record that makes it defensible.**

## What to build

**Your own choice, scoped by the previous unit's method:** write the two-minute demonstration
first, and let everything required for it be the scope.

**It must have all three of these**, and the scoping unit explains why:

**A real decision with a real alternative** — one place you chose between two approaches for a
reason you can state.

**A hard part** — concurrency, a data model that had to change, a performance problem, an
integration that resisted. Something that was genuinely difficult rather than merely long.

**Evidence it works** — tests, a deployment, or both.

## What to submit

**A repository**, with:

**A history that reads.** Small commits, messages saying why. Not one commit, and not thirty saying
"update".

**Tests on the logic that would be expensive to get wrong.** Not coverage for its own sake.

**Errors handled** — wrong input, missing file, failed network call.

**No secrets in the history.** If you find one, rotate it; removing it from history does not
unexpose it.

**A README** carrying: one sentence on what it is, a screenshot or recording, working instructions
tested on a clean machine, two or three lines on the hard part, and what you would change.

**A deployment link** if one is possible. A thirty-second recording if it is not.

**And a decision log** — every choice between two approaches, three lines each: the options, the
choice, the reason. **Written as you go rather than reconstructed at the end**, because reconstructed
ones are visibly reconstructed.

## How it will be assessed

**Not on size.** On whether it is finished, whether the engineering standard holds, and whether the
decisions in it can be defended — which is the next unit, and which the decision log exists for.

## The working rule

**Ship something that runs in week one and grow it.** A system that integrates at the end is where
an ambitious capstone dies, and the last week belongs to the README, the deployment and the demo
path rather than to a new feature.

## The bar

**Would you be comfortable if a reviewer opened this repository without you there to explain it?**`,
      rubric: [
        { criterion: 'It is finished', description: 'The two-minute demonstration runs end to end. A system at seventy per cent is evidence of starting, and the interesting decisions were never reached.', maxPoints: 25 },
        { criterion: 'Built to the Year-4 standard', description: 'A history that reads, tests on the logic that would be expensive to get wrong, errors handled, and no secrets anywhere in the history.', maxPoints: 25 },
        { criterion: 'A stranger can assess it', description: 'A README carrying the one-liner, a screenshot or recording, instructions tested on a clean machine, and the hard part. A deployment link where one is possible.', maxPoints: 25 },
        { criterion: 'The decisions are on the record', description: 'A decision log written as the work happened: the options, the choice and the reason, for every choice between two approaches. Reconstructed ones read as reconstructed.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('A system that runs from week one and grows is finishable where one that integrates at the end is not, because the integration week is where:',
        [['An ambitious capstone dies', true],
         ['The testing is usually deferred to', false],
         ['The deployment problems first appear', false],
         ['The scope is typically reduced', false]],
        'Combining separately built pieces produces unbounded work at the point where no time remains to absorb it.'),
      mcq('The decision log is the single highest-value thing you can do for the defence because you will remember what you built but not:',
        [['Why you chose one database over another in week two', true],
         ['Which features were added in which order', false],
         ['How long each part took to complete', false],
         ['Where the hardest bugs were found', false]],
        'The reasoning behind choices fades while the artefact remains, and the reasoning is exactly what the defence asks about.'),
    ],
    checkpoint: [
      mcq('A capstone whose last week went into a half-finished feature is worse than one whose last week went into making the rest presentable, and this is described as:',
        [['The most reliably ignored advice in the module', true],
         ['Dependent on how substantial the feature is', false],
         ['True only when the deadline is fixed', false],
         ['A matter of presentation rather than substance', false]],
        'The pull toward building rather than finishing is strong enough that the guidance is consistently understood and consistently not followed.'),
      mcq('The bar for the whole project is whether you would be comfortable with a reviewer opening the repository without you there, which is:',
        [['The condition under which it will actually be read', true],
         ['A stricter standard than employers apply', false],
         ['Only relevant for the portfolio use', false],
         ['Achievable once the README is written', false]],
        'Reviews happen unaccompanied, so the repository has to carry its own explanation for the assessment to reach the work at all.'),
    ],
  },
  {
    unitCode: 'T4_CAPSTONE_DEFENDING_IT',
    notes: `**Architecture, decisions, failures and trade-offs, to somebody who will push on all
four.**

## The format

**Forty-five minutes on what you built, with somebody who does not let "we used X" stand.**

**Ninety-second opener, then increasing depth**, exactly as the project round does — because this is
the project round, on work that was built knowing this conversation was coming.

## Where the depth goes, and the decision log answers three of the four

**Architecture.** Draw it. What each box owns, what each arrow carries.

**Decisions.** The alternative, and what the choice cost. **This is what the log was for**, and a
candidate who kept one answers from a record while everybody else reconstructs.

**Failures.** What broke, how you found it, what fixed it, and whether you noticed the class rather
than the instance.

**Trade-offs.** What the system gives up. Every design gives something up, and **a candidate who
says theirs does not has either not looked or does not know.**

## The four questions that will certainly come

**"Why this and not that?"** For every technology named.

**"What breaks at a hundred times the load?"** Name the first bottleneck — usually an unindexed
query or work done inside the request — and one concrete step. **Not a rewrite.**

**"How do you know it works?"** Tests, deployment, use. **"I clicked around" is an answer and it is
a finding.**

**"What would you do differently?"** **"Nothing" is the worst available answer.**

## The security question, asked of every project

**"How do you know one user cannot read another's data?"**

**Most student projects have no answer**, and the defence is where that is discovered if the
building was not. A capstone built after P13 should have one.

## When you are pushed on something wrong

**"You are right, that does not work" and then reasoning is a strong moment.** Defending past the
evidence is the actual failure, and it reads as inability to take input rather than as conviction.

## What a strong defence sounds like

**Specific, honest about the boundaries, and able to say what the system does not do.**

**None of that requires the capstone to be impressive** — which is the same thing the project round
unit said, and it is as true at the end of the year as it was in the middle.`,
    mcqs: [
      mcq('A candidate who says their system gives nothing up has either not looked or:',
        [['Does not know', true],
         ['Built something unusually simple', false],
         ['Misunderstood what a trade-off is', false],
         ['Avoided the harder design choices', false]],
        'Every design sacrifices something, so the absence of an answer reflects the examination rather than the system.'),
      mcq('A candidate who kept a decision log answers from a record while everybody else:',
        [['Reconstructs', true],
         ['Describes the implementation instead', false],
         ['Defers to what the team decided', false],
         ['Answers at less technical depth', false]],
        'Reconstruction produces plausible reasoning rather than the actual reasoning, and the difference shows under follow-up.'),
    ],
    checkpoint: [
      mcq('The security question is asked of every project, and the defence is where the absence of an answer is discovered if:',
        [['The building was not', true],
         ['The scope was reduced late', false],
         ['No reviewer opened the repository', false],
         ['The tests did not cover it', false]],
        'A capstone built after the engineering modules should already have addressed it, so an empty answer locates when the thinking was skipped.'),
      mcq('A strong defence being specific, honest about boundaries and able to say what the system does not do requires nothing about the capstone being impressive, which is described as:',
        [['As true at the end of the year as in the middle', true],
         ['A lower standard applied to final work', false],
         ['True only for projects built alone', false],
         ['Contingent on the interviewer’s expectations', false]],
        'The same property held in the project round unit: all three are qualities of the account rather than of the work.'),
    ],
  },
  {
    unitCode: 'T4_CAPSTONE_CHECKPOINT',
    notes: `**The final one: technical capability, project capability, communication, interview
performance, portfolio and known gaps.**

## The six outcomes Year 4 promised, and what counts as evidence for each

**Technical capability.** The written and coding rounds of the simulation, the technical mocks, and
the coding in the capstone. **Not a feeling — the numbers from P23 and the capstone that exists.**

**Project capability.** A finished capstone, defended. **Finished is load-bearing**: a 70% system
is evidence of starting.

**Communication.** P20's checkpoint, the capstone defence, and round 6 of the simulation. **Spoken
and written both**, because the written half is the one that gets skipped.

**Interview performance.** The nine mocks and their debriefs, with **at least one change made and
verified between two of them.** The verification is what distinguishes performance from exposure.

**Portfolio.** Four pinned repositories with READMEs, a one-page resume where every bullet is
defendable, and a tracker with real applications in it.

**Known gaps.** A written list, specific and unapologetic, with the re-test record attached.

## The bar

**Evidence for all six.** **Not excellence in all six** — a graduate excellent in all six does not
exist, and a checkpoint demanding it would measure nothing.

**Evidence, which means something checkable rather than something believed.**

## What a weak result means

**Capstone unfinished**: scope. The most common single failure in this module and the one the
scoping unit exists to prevent.

**No verified change between mocks**: nine measurements and no intervention, which measures
consistency rather than improvement.

**Gap list absent or vague**: the hardest item on the list to produce honestly and the one that most
distinguishes a graduate who has examined their own position.

**Portfolio not done**: an afternoon of work standing in front of everything else in the year.

## What this checkpoint actually certifies

**Not that you will get an offer.** No curriculum can promise that, and one claiming to would be
lying about something checkable.

**That the six things an employer looks at have evidence behind them**, that you know where your
edge is, and that you have sat the format rather than read about it.

**Which is what a fourth year can honestly deliver**, and it is a considerably stronger position
than the one most graduates arrive at the first drive holding.`,
    checkpoint: [
      mcq('The bar is evidence for all six outcomes rather than excellence in all six because a graduate excellent in all six does not exist, and a checkpoint demanding it:',
        [['Would measure nothing', true],
         ['Would take too long to assess', false],
         ['Would discourage most candidates', false],
         ['Could not be verified objectively', false]],
        'A standard nobody meets provides no discrimination between candidates, so it records nothing about any of them.'),
      mcq('"Finished is load-bearing" for project capability because a 70% system is evidence of:',
        [['Starting', true],
         ['Ambition beyond the available time', false],
         ['Capability that was not demonstrated', false],
         ['Work that another term would complete', false]],
        'Completion is the property being evidenced, and an unfinished system demonstrates only that the work began.'),
      mcq('The checkpoint does not certify that you will get an offer, and a curriculum claiming to would be:',
        [['Lying about something checkable', true],
         ['Overstating its influence on hiring', false],
         ['Making a claim outside its scope', false],
         ['Setting an expectation it cannot control', false]],
        'The outcome is observable, so a promise about it is a factual claim that events would straightforwardly disprove.'),
      mcq('A verified change between two mocks is what distinguishes performance from:',
        [['Exposure', true],
         ['Capability measured elsewhere', false],
         ['Consistency across the series', false],
         ['Preparation for the simulation', false]],
        'Nine mocks without an intervention only establish that the rounds were sat, where a verified change shows the feedback was acted on.'),
    ],
  },
];
