/**
 * The three P17 checkpoints that completed that module, plus T4_IV_METHOD,
 * T4_IV_FUNDAMENTALS, T4_IV_DSA and T4_IV_CORE_CS — twenty-three units. Modules P17 and P18.
 *
 * ── WHAT P18 IS FOR, AND WHY IT IS NOT MORE PRACTICE PROBLEMS ─────────────────────────────
 *
 * The spec's loop is explicit: "problem understanding → approach → implementation → tests →
 * debugging → complexity explanation → interviewer follow-up." Every one of those is a step at
 * which a candidate who could solve the problem alone loses the round, and none of them is
 * improved by solving more problems.
 *
 * P15 drills the solving. This module drills everything around it — and the distinction is the
 * reason both exist. A student who solves a medium problem in twelve minutes alone and cannot
 * narrate one in thirty does not need more problems; they need the narration, which is a separate
 * skill and is learnable faster than the solving was.
 *
 * ── THE FAILURE THE MODULE EXISTS TO PREVENT ──────────────────────────────────────────────
 *
 * Going silent. It is the single most common way a technically capable candidate fails a coding
 * interview, and it is entirely fixable — the interviewer cannot score what they cannot see, and
 * four minutes of brilliant silent thinking is indistinguishable from being stuck.
 *
 * Attribution: T4_IV_METHOD is single-skill and derived; T4_IV_FUNDAMENTALS defaults to
 * TECHNICAL_INTERVIEW_PREP with SQL on SQL_BASICS and Git on GIT_FUNDAMENTALS; T4_IV_DSA to
 * TECHNICAL_INTERVIEW_PREP with the coding-round unit on DSA_COMPLEXITY; T4_IV_CORE_CS to
 * TECHNICAL_INTERVIEW_PREP with the three explaining units on their own subjects.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TECHNICAL_INTERVIEW_BUNDLES: PilotBundle[] = [
  /* ══ P17 stragglers ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MCQ_PROGRAMMING_CHECKPOINT',
    notes: `**Whether output prediction and OOP questions are answered from tracing rather than
from impression.**

## The bar

**Thirty questions in twenty minutes, at least twenty-three correct.**

**And the known tricks recognised rather than traced** — mutable default, class attribute,
aliasing, short-circuiting. Recognition takes five seconds and tracing takes forty, and on a
section this size the difference is several questions.

## What a weak result means

**Wrong on tracing**: the variables were not written down. **A procedural fix**, and it closes
within a session.

**Wrong on the tricks**: they are not recognised yet. **Six of them**, and they account for a
disproportionate share of the section — learning the list properly is an hour well spent.

**Wrong on OOP**: usually the override-resolution question, where a parent method calls something
the child replaced. **One idea, and it unlocks several question forms.**

**Not finishing**: too much tracing. The elimination technique — comparing options to find where
they disagree — is what recovers the time.

## What this feeds

**The programming section of every written round**, and **the verbal version in interviews**,
where the same fragment is shown and the trace is spoken rather than submitted.`,
    checkpoint: [
      mcq('Recognising a known trick rather than tracing it saves thirty-five seconds per question, which on a section of this size amounts to:',
        [['Several questions', true],
         ['Under a minute in total', false],
         ['Time better spent checking answers', false],
         ['A marginal difference in the score', false]],
        'With thirty questions and a forty-second budget, converting even a handful of traces into recognitions frees time for several more items.'),
      mcq('OOP errors usually concentrate on the override-resolution question, described as:',
        [['One idea that unlocks several question forms', true],
         ['The hardest concept in the topic overall', false],
         ['A detail specific to one language family', false],
         ['Less common than the constructor questions', false]],
        'Lookup beginning at the actual object explains polymorphism, the parent-calling-child case and why inheritance couples to internals.'),
      mcq('Not finishing the section points at too much tracing, recovered by:',
        [['Comparing options to find where they disagree', true],
         ['Attempting the OOP questions first of all', false],
         ['Guessing on anything taking over a minute', false],
         ['Skipping the output prediction questions', false]],
        'Agreement between options establishes which lines are not in dispute, so only the disputed step needs to be traced.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_CORE_CS_CHECKPOINT',
    notes: `**Whether operating systems, networking and databases are answerable at written-round
depth.**

## The bar

**Thirty questions in twenty-five minutes, at least twenty-two correct**, and — the part that
matters — **no subject below half**.

**A combined score hides a failed subject**, and a company whose paper happens to weight that
subject will eliminate a candidate whose aggregate looked adequate.

## What a weak result means

**One subject weak**: that subject, directly. It is the most common shape and the easiest to act
on.

**All three weak**: the derivation sentences are missing. **Eight or ten facts**, properly
understood, answer most of what is asked — and that is a bounded piece of work rather than three
syllabuses to revise.

**Calculations wrong**: average waiting time, page faults, join counts, subnet ranges. **These are
procedure rather than recall** and are the most reliably gettable marks in the section, so errors
here are worth more attention than they usually receive.

## The fact worth checking you have

**"A process has its own memory; threads share it."** If that sentence is not immediately
available with its consequences, the OS subject will stay weak regardless of how much is revised,
because most of the questions descend from it.

## What this feeds

**The core CS section of every written round**, **the core CS interview in P18**, and **mock 3**,
which asks the same material conversationally.`,
    checkpoint: [
      mcq('The bar includes no subject below half because a combined score:',
        [['Hides a failed subject', true],
         ['Overstates the candidate’s weakest area', false],
         ['Cannot be compared between papers', false],
         ['Weights the calculations too heavily', false]],
        'A company whose paper emphasises the weak subject eliminates a candidate whose aggregate appeared adequate.'),
      mcq('Calculation questions are described as the most reliably gettable marks because they are:',
        [['Procedure rather than recall', true],
         ['Shorter than the theory questions', false],
         ['Weighted more heavily in the marking', false],
         ['Repeated across most of the papers', false]],
        'They require only performing a known method, so they are available to anybody who has practised it regardless of what is remembered.'),
      mcq('If "a process has its own memory; threads share it" is not immediately available with its consequences, the OS subject stays weak because:',
        [['Most of the questions descend from it', true],
         ['It is the most frequently asked question', false],
         ['The other facts depend on it logically', false],
         ['Examiners use it to set the difficulty', false]],
        'Thread cost, synchronisation need and crash isolation all follow from that one distinction, so its absence leaves them unreachable.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_ENGINEERING_INTERVIEW_QUESTION',
    notes: `**"What does \`git rebase\` actually do?"** — and its relatives, asked conversationally.

## Why these appear in interviews as well as written rounds

**Because the written version tests whether you know the answer and the interview version tests
whether you have used it.** Those produce noticeably different responses, and the difference is
audible.

## The answer that demonstrates use

**What it does, then when you would and would not.**

"Rebase replays my commits on top of another branch, so the history is linear. I use it on my own
branch before merging, and not on anything somebody else has pulled — because it produces new
commits and their history diverges."

**The second sentence is the one that matters.** Anybody can state the mechanism; the usage rule
comes from having been told off once or from having caused the problem.

## The relatives

**"Merge or rebase?"** Both, for different things, with the shared-branch rule.

**"How do you undo a commit?"** Reset if local, revert if pushed. **And why** — one rewrites
history, the other adds to it.

**"You committed a secret. What now?"** Rotate it. Removing it from history is housekeeping and
the value is already exposed. **Getting this wrong is a security answer rather than a Git one**,
and interviewers notice.

**"How do you know your tests are any good?"** Break the code and see if they fail. Coverage is
the weak answer and the interviewer knows why.

## The tell that separates

**A specific story.** "I rebased a shared branch once and three people had to recover" is worth
more than any correct definition, because it cannot be produced from reading.

## What loses marks

**Reciting the manual page.** It answers the written-round version of the question, which was not
the one asked.`,
    mcqs: [
      mcq('The written version tests whether you know the answer and the interview version tests whether you have:',
        [['Used it', true],
         ['Read the official documentation', false],
         ['Taught it to somebody else before', false],
         ['Encountered it in a recent project', false]],
        'Usage produces rules and stories that recall does not, and the difference between the two registers is audible in the answer.'),
      mcq('Answering "you committed a secret, what now?" with removing it from history rather than rotating it is described as:',
        [['A security answer rather than a Git one', true],
         ['A reasonable first step to take', false],
         ['Correct if the repository is private', false],
         ['Sufficient when caught quickly enough', false]],
        'The value is already exposed in the earlier commit, so the judgement being assessed is about the exposure rather than about the tooling.'),
    ],
    checkpoint: [
      mcq('"I rebased a shared branch once and three people had to recover" is worth more than any correct definition because it:',
        [['Cannot be produced from reading', true],
         ['Demonstrates more technical depth overall', false],
         ['Shows the candidate works in a large team', false],
         ['Explains the mechanism more memorably', false]],
        'The consequence was experienced rather than learned, which is exactly what the interview format is able to distinguish.'),
      mcq('Reciting the manual page loses marks because it answers:',
        [['The written-round version of the question', true],
         ['A question about a different command', false],
         ['Only the first half of what was asked', false],
         ['At greater length than was necessary', false]],
        'The mechanism was not in doubt; what was being probed is the judgement that comes from having applied it.'),
    ],
  },

  /* ══ T4_IV_METHOD ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_IV_METHOD_THE_LOOP',
    notes: `**Understand, approach, implement, test, explain.** Five steps, and skipping any of
them is visible from the other chair.

## Why the sequence exists

**Because each step catches a different failure**, and candidates who go straight from reading to
typing lose rounds they could have passed.

## Understand

**Restate the problem in one sentence.** Twenty seconds.

**Ask about constraints** — size, range, duplicates, ordering, what to return when there is no
answer. **Asking is expected**, and it demonstrates you know these change the solution.

**Work the example by hand.** If your answer disagrees with the given one, you have misread it,
and finding that now costs nothing.

## Approach

**Say it before writing it.** Including the brute force, if that is where you are starting.

**This is the step most often skipped**, and it is the cheapest place to be corrected — an
interviewer who sees a wrong approach will frequently say so, which costs thirty seconds instead
of fifteen minutes.

## Implement

**Narrate at a level they can follow.** Not every character — the decisions.

## Test

**Out loud, on the sample and on an edge case you choose.** **Finding your own bug here is among
the strongest signals available in the round.**

## Explain

**The complexity, before being asked.** Time and space.

## The failure the loop prevents

**Fifteen minutes of silent typing towards an approach that cannot work**, which is unrecoverable
in a forty-five minute round and is entirely preventable by saying the approach aloud first.`,
    mcqs: [
      mcq('Stating the approach before writing is the step most often skipped, and it is the cheapest place to be corrected because an interviewer who sees a wrong approach will frequently:',
        [['Say so, costing thirty seconds instead of fifteen minutes', true],
         ['Allow the candidate to discover it themselves', false],
         ['Mark the attempt down for being incorrect', false],
         ['Move on to a different problem entirely', false]],
        'Correcting a stated approach is a brief exchange, where discovering it after implementation consumes most of the round.'),
      mcq('If your hand-worked answer disagrees with the given example, you have:',
        [['Misread the problem', true],
         ['Found an error in the example given', false],
         ['Chosen an approach that does not apply', false],
         ['Made an arithmetic slip in the working', false]],
        'The example defines the intended behaviour, so a disagreement indicates the understanding is wrong rather than the sample.'),
    ],
    checkpoint: [
      mcq('The failure the loop prevents is fifteen minutes of silent typing towards an unworkable approach, which is:',
        [['Unrecoverable in a forty-five minute round', true],
         ['Usually caught by the interviewer in time', false],
         ['Recoverable if the implementation is clean', false],
         ['Less costly than asking too many questions', false]],
        'Two thirds of the available time is spent with nothing to show, and no remaining time is sufficient to start again.'),
      mcq('Asking about constraints is expected and demonstrates that you know they:',
        [['Change the solution', true],
         ['Are frequently omitted deliberately', false],
         ['Determine how long you should spend', false],
         ['Vary between different interviewers', false]],
        'Size, duplicates and ordering each rule approaches in or out, so asking shows the approach is being chosen rather than recalled.'),
    ],
  },
  {
    unitCode: 'T4_IV_METHOD_THINKING_ALOUD',
    notes: `**Saying enough that the interviewer can follow you, and stopping before it becomes
noise.**

## Why silence is the failure

**The interviewer cannot score what they cannot see.** Four minutes of brilliant silent thinking
scores exactly the same as four minutes of being stuck, and there is no way for them to
distinguish the two.

**This is the single most common way a technically capable candidate fails a coding round**, and
it is entirely fixable.

## What to say

**The decisions, not the keystrokes.** "I am going to use a dictionary here so the lookup is
constant" is useful. "Now I am typing a for loop" is not.

**When you rule something out, say why.** "A nested loop would be quadratic and n is a hundred
thousand, so that is out." **That sentence alone demonstrates constraint-reading, complexity
awareness and a decision** — three things, in eleven words.

**When you are choosing between two options, say both.** The comparison is what is being assessed.

## What to do when you need to think

**Say that.** "Let me think about the loop bound for a second." **A signposted silence is not a
silence** — it tells the interviewer you are working and roughly on what, and it costs nothing.

**Ten or fifteen seconds is fine. A minute needs another signpost.**

## The calibration

**Too little is the common failure and too much is real.** A candidate narrating every character
is exhausting and buries the decisions in commentary.

**The test: could somebody listening reconstruct what you decided and why?** That is the right
amount.

## How to practise

**Aloud, alone, to an empty room.** It feels absurd and it works — the difficulty is entirely in
speaking and thinking simultaneously, and that is only practised by doing it.`,
    mcqs: [
      mcq('"A nested loop would be quadratic and n is a hundred thousand, so that is out" demonstrates three things in eleven words, namely constraint-reading, complexity awareness and:',
        [['A decision', true],
         ['Familiarity with the problem type', false],
         ['Knowledge of the alternative approaches', false],
         ['Confidence in the chosen direction', false]],
        'It rules an approach out for a stated reason, which is a decision made visible rather than an observation offered.'),
      mcq('A signposted silence is not a silence because it tells the interviewer:',
        [['You are working and roughly on what', true],
         ['How long you expect to need', false],
         ['That you would like a hint shortly', false],
         ['Which part of the problem is hardest', false]],
        'The pause becomes observable activity rather than an absence, which is the difference between thinking and appearing stuck.'),
    ],
    checkpoint: [
      mcq('The test for the right amount of narration is whether somebody listening could reconstruct:',
        [['What you decided and why', true],
         ['The code you have written so far', false],
         ['How much of the problem remains', false],
         ['Which language features you are using', false]],
        'The decisions are what the round assesses, so narration is calibrated by whether they are recoverable from what was said.'),
      mcq('Practising aloud to an empty room feels absurd and works because the difficulty is entirely in:',
        [['Speaking and thinking simultaneously', true],
         ['Remembering what to say at each step', false],
         ['Maintaining a natural pace while coding', false],
         ['Knowing which decisions are worth stating', false]],
        'The two compete for attention, and the only way to make them coexist is to practise doing both at once.'),
    ],
  },
  {
    unitCode: 'T4_IV_METHOD_WHEN_YOU_ARE_STUCK',
    notes: `**Three moves that recover a stuck interview, and the one that ends it.**

## Being stuck is normal

**Interviewers expect it.** The question is frequently chosen so that the candidate will be stuck
at some point, because **how somebody behaves when stuck is more informative than whether they
solve it.**

## The move that ends it

**Going silent.** From the other side this is indistinguishable from having no idea, and it
removes the interviewer's ability to help — which they generally want to do.

## The three that recover it

**Say where you are.** "I know I need to find pairs summing to the target, and my current approach
is quadratic. I am trying to see whether I can avoid the second loop."

**That sentence invites a hint** without asking for one, and interviewers routinely give one at
that point.

**Go smaller.** Solve n = 2, then n = 3, by hand. The pattern between them is frequently the
algorithm, and the process is visible and productive while you do it.

**State a weaker version.** "I can solve this if the array is sorted. Let me start there and then
consider whether I can sort, or whether I need something else."

**Solving a simplified problem is progress**, and it frequently leads directly to the real one.

## Taking a hint

**Accept it, say what it gives you, and continue.** "That suggests I should keep what I have seen
so far — so a dictionary from value to index."

**Candidates who resist hints do worse**, and the resistance reads as ego rather than as
independence. Working with the interviewer is part of the assessment.

## The honest position

**If you genuinely cannot see it, say so and say what you would do next in real life** — look up
the pattern, ask a colleague, come back to it. **That is an honest answer that demonstrates a
process**, and it is considerably better than silence.`,
    mcqs: [
      mcq('The question is frequently chosen so the candidate will be stuck at some point because:',
        [['How somebody behaves when stuck is more informative', true],
         ['Easier questions cannot distinguish candidates', false],
         ['The solution is less important than the code', false],
         ['Interviewers need to fill the allotted time', false]],
        'Solving smoothly reveals preparation, while being stuck reveals the method that will be used on unfamiliar problems at work.'),
      mcq('Candidates who resist hints do worse, and the resistance reads as:',
        [['Ego rather than independence', true],
         ['Thoroughness taken slightly too far', false],
         ['A misunderstanding of the format used', false],
         ['Confidence that the interviewer respects', false]],
        'Working with the interviewer is part of what is assessed, so declining assistance signals difficulty collaborating rather than self-reliance.'),
    ],
    checkpoint: [
      mcq('Saying where you are — the goal, the current approach and what you are attempting — is valuable because it:',
        [['Invites a hint without asking for one', true],
         ['Demonstrates the problem was understood', false],
         ['Buys time to think of something better', false],
         ['Shows the approach was reasonable so far', false]],
        'It gives the interviewer a precise place to intervene, and they routinely offer a hint at that point.'),
      mcq('If you genuinely cannot see the solution, saying what you would do next in real life is described as:',
        [['An honest answer that demonstrates a process', true],
         ['A last resort that scores very little', false],
         ['An admission that ends the round early', false],
         ['Acceptable only in a junior interview', false]],
        'It shows how an unsolved problem would actually be handled, which is more useful than silence and is a real part of working practice.'),
    ],
  },
  {
    unitCode: 'T4_IV_METHOD_PRACTICE',
    notes: `**A problem, a clock, and somebody listening. The method rather than the answer.**

## The drill

**One medium problem, forty-five minutes, with a person.** They do not need to know the answer —
their job is to listen and to record.

**If no person is available, record yourself.** It is markedly less useful and far better than
practising silently.

## What the listener records

**How long before you said anything.** **Whether the constraints were asked about.** **Whether the
approach was stated before coding.** **The longest silence.** **Whether you tested before
declaring it done.** **Whether the complexity was volunteered.**

**Six observations, all binary or a number**, and none requiring technical knowledge — which is why
a non-technical listener works.

## What to review

**The longest silence, first.** It is the most costly thing in the transcript and the easiest to
fix with signposting.

**Then whether the approach was stated.** If it was not, that is the single highest-value change
available.

## Deliberately getting stuck

**Once, on purpose, attempt a problem slightly beyond you** — and practise the three recovery
moves rather than the solution.

**Being stuck is the condition the method exists for**, and practising only on problems you can
solve never exercises it.

## The frequency

**Once a week is enough**, and it is far more effective than the same time spent solving
silently. The solving is drilled in P15; this drills the rest, and the rest is where the rounds
are lost.`,
    mcqs: [
      mcq('A non-technical listener works for this drill because the six observations are:',
        [['Binary or a number, needing no technical knowledge', true],
         ['Focused on the clarity of the explanation', false],
         ['Recorded afterwards from a transcript', false],
         ['Limited to timing rather than content', false]],
        'Whether the approach was stated and how long the silences were can be observed without understanding the problem at all.'),
      mcq('Deliberately attempting a problem slightly beyond you once is recommended because being stuck is the condition the method exists for, and practising only on solvable problems:',
        [['Never exercises it', true],
         ['Builds confidence more effectively', false],
         ['Produces faster overall improvement', false],
         ['Is sufficient for most real interviews', false]],
        'The recovery moves are only used when progress stops, so a practice regime without that condition leaves them untrained.'),
    ],
    checkpoint: [
      mcq('The first thing to review in the transcript is the longest silence, because it is:',
        [['The most costly thing and the easiest to fix', true],
         ['The clearest indicator of technical weakness', false],
         ['Where the interviewer would have intervened', false],
         ['Usually caused by an incorrect approach', false]],
        'It represents unscored time and signposting resolves it immediately, which makes it the highest return per unit of effort.'),
      mcq('Once a week is enough for this drill and is far more effective than the same time spent solving silently because the solving is drilled in P15 and this drills:',
        [['The rest, where the rounds are lost', true],
         ['The same skills in a different format', false],
         ['Communication, which matters less overall', false],
         ['Speed, which the timed sets do not cover', false]],
        'The two modules target different failures, and narration under observation is not improved by additional silent practice.'),
    ],
  },
  {
    unitCode: 'T4_IV_METHOD_INTERVIEW_QUESTION',
    notes: `**"Talk me through how you approach a problem you have never seen."**

## Why it is asked directly

**Because some interviewers want the method stated rather than inferred**, particularly for
graduate roles where the specific knowledge is expected to be thin and the process is what
transfers.

## The answer

**The five steps, named**: understand, approach, implement, test, explain. **And what each one
catches.**

**Understand catches a misreading while it is free.** **Approach catches an unworkable plan before
fifteen minutes are spent on it.** **Test catches my own bug before somebody else finds it.**

**Saying what each step is FOR is what distinguishes the answer from a recited list**, and it is
the part most candidates omit.

## The follow-ups

**"What do you do when you are stuck?"** The three moves — say where you are, go smaller, solve a
weaker version. **And explicitly: I do not go quiet.**

**"How do you decide when an approach is good enough?"** Against the constraints. If it fits, it
fits; if it does not, it does not, and that is a decision rather than a judgement call.

**"What if you cannot solve it at all?"** Say where you got to and what you would do next. Honest,
and it describes a real working process.

## The thing worth saying explicitly

**"I try to keep talking, because I know the interviewer cannot see what I am thinking."**

**It is a short sentence and it demonstrates that the format is understood**, which is itself
assessed — a candidate who has grasped what the round is measuring behaves differently throughout
it.

## What loses marks

**A list with no purposes attached**, which sounds prepared rather than practised, and the
difference is audible.`,
    mcqs: [
      mcq('Saying what each step of the loop is FOR distinguishes the answer from a recited list, and it is:',
        [['The part most candidates omit', true],
         ['Only relevant for senior positions', false],
         ['Longer than the time allows for', false],
         ['Implied by naming the steps correctly', false]],
        'The purposes demonstrate the method was arrived at through use, where the names alone are available from any preparation guide.'),
      mcq('"I try to keep talking, because the interviewer cannot see what I am thinking" demonstrates that the format is understood, which:',
        [['Is itself assessed', true],
         ['Reduces the need to narrate later', false],
         ['Substitutes for demonstrating the behaviour', false],
         ['Applies mainly to remote interviews', false]],
        'A candidate who has grasped what the round measures behaves differently throughout it, so stating the understanding is informative.'),
    ],
    checkpoint: [
      mcq('Asked how you decide an approach is good enough, answering "against the constraints" makes it:',
        [['A decision rather than a judgement call', true],
         ['Dependent on the interviewer’s expectations', false],
         ['A question of personal coding preference', false],
         ['Impossible to answer before implementing', false]],
        'The stated limits determine whether a complexity class fits, so the answer follows from the problem rather than from opinion.'),
      mcq('A list with no purposes attached sounds prepared rather than practised, and the difference is:',
        [['Audible', true],
         ['Only visible in the follow-up answers', false],
         ['Noticed by experienced interviewers alone', false],
         ['Irrelevant provided the steps are correct', false]],
        'A recited sequence lacks the specificity that comes from having applied it, and the flatness is apparent to the listener.'),
    ],
  },

  /* ══ T4_IV_FUNDAMENTALS ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_IV_FUNDAMENTALS_PROGRAMMING_QUESTIONS',
    notes: `**Not "what is a list" but "why did you use one"** — and the follow-up about what it
costs.

## The depth the round actually reaches

**One question past the definition, every time.**

"What is a dictionary?" is the opener. **"Why is lookup constant time?"** is the question. **"What
is the worst case?"** is where candidates stop.

**Preparing to definition depth is preparing for the first thirty seconds of each topic**, and the
round spends five minutes on each.

## The topics that recur

**Data structures and their costs.** Which operations are cheap, which are not, and why.

**Mutability and references.** What happens when you pass a list, and why the caller sees the
change.

**Scope and closures.** What a function captures and when.

**Error handling.** When to catch, when to let it propagate, and what a bare catch costs.

**Iterators and generators**, where the language has them — lazy against eager, and why it
matters for memory.

## The format of a good answer

**The direct answer, then the reason, then the caveat.**

"Constant time on average, because the key is hashed to a bucket. Worst case linear if everything
collides, which is rare with a good hash function."

**Three sentences, and the third is what most candidates do not have.**

## Where they go wrong

**Answering from memorised phrasing.** "Hash tables are O(1)" is a recalled fact; explaining why
and when it is not is understanding, and the follow-up separates them immediately.

**And being unable to say what they would use instead.** Every structure has an alternative, and
knowing when the alternative wins is the same judgement the coding round tests.`,
    mcqs: [
      mcq('Preparing to definition depth is described as preparing for:',
        [['The first thirty seconds of each topic', true],
         ['The written round rather than the interview', false],
         ['Junior roles where depth is not expected', false],
         ['Topics outside the candidate’s experience', false]],
        'The round spends several minutes per topic and moves past the definition immediately, so recall covers only the opening exchange.'),
      mcq('The three-sentence format is the direct answer, the reason, and the caveat — and the third is:',
        [['What most candidates do not have', true],
         ['Optional when the answer is correct', false],
         ['Only expected for senior candidates', false],
         ['Usually supplied by the interviewer', false]],
        'Knowing when a property fails requires understanding the mechanism, which recall of the headline behaviour does not provide.'),
    ],
    checkpoint: [
      mcq('"Hash tables are O(1)" is a recalled fact, and understanding is demonstrated by explaining:',
        [['Why, and when it is not', true],
         ['Which languages implement them natively', false],
         ['How the hash function is chosen', false],
         ['The memory overhead they require', false]],
        'The mechanism and its failure case can only be given by somebody who understands it, which is what the follow-up isolates.'),
      mcq('Being unable to say what you would use instead of a structure matters because knowing when the alternative wins is:',
        [['The same judgement the coding round tests', true],
         ['A separate topic covered elsewhere', false],
         ['Only relevant for performance-critical work', false],
         ['Expected knowledge rather than judgement', false]],
        'Selecting a structure from the access pattern is the core coding-round decision, so the fundamentals round is probing the same capability.'),
    ],
  },
  {
    unitCode: 'T4_IV_FUNDAMENTALS_SQL_QUESTIONS',
    notes: `**Writing the query on a whiteboard, and explaining what the database will do with
it.**

## What is different from the written round

**You write it rather than select it**, and then you are asked about it.

**Which means syntax matters** — not perfectly, but enough that the query reads as something you
have written before.

## The questions that recur

**A join with a filter.** Then: "what if there are customers with no orders?" — a left join, and
the NULL handling that follows.

**An aggregate with grouping.** Then: "filter the groups" — HAVING, and why not WHERE.

**A query returning too many rows.** The duplicate-multiplication explanation.

**"Make this faster."** An index, and what it costs on writes. **Volunteering the write cost is the
marker.**

**"What is the difference between these two queries?"** Frequently a subquery against a join, or
an inner against a left, with the same result on the sample data and different results in general.

## Explaining what the database does

**The plan, at the level of: does it scan or does it use an index.**

**Not the optimiser internals.** Knowing that a function on a filtered column prevents index use,
and that a leading wildcard does the same, is the expected depth and it is a short list.

## The NULL questions

**Asked constantly because they separate reliably.**

**\`NULL = NULL\` is not true.** **\`WHERE x != 'a'\` excludes NULLs.** **\`COUNT(column)\` skips them
and \`COUNT(*)\` does not.** **An aggregate over no rows returns NULL, not zero.**

**Four facts**, and they account for most of the SQL discussion in a fundamentals round.

## The habit

**Say what the query returns before writing it.** "One row per customer, with their order count."
It catches a grain misunderstanding before the syntax obscures it.`,
    mcqs: [
      mcq('When asked to make a query faster, volunteering the write cost of an index is described as:',
        [['The marker', true],
         ['An unnecessary qualification to add', false],
         ['Something to mention only if asked', false],
         ['Relevant only for large tables', false]],
        'Every index trades read speed for write cost, and naming the trade unprompted shows the proposal was weighed rather than recalled.'),
      mcq('An aggregate computed over no rows returns:',
        [['NULL, not zero', true],
         ['Zero, which is the natural default', false],
         ['An error indicating an empty set', false],
         ['The value from the previous group', false]],
        'With nothing to aggregate there is no value, and treating the result as zero is a common source of incorrect totals.'),
    ],
    checkpoint: [
      mcq('The expected depth on query plans is whether it scans or uses an index, rather than:',
        [['The optimiser internals', true],
         ['The cost estimates it produces', false],
         ['Which join algorithm was selected', false],
         ['The statistics the planner relies on', false]],
        'Knowing that a function on a filtered column or a leading wildcard prevents index use is a short list and is what the round asks about.'),
      mcq('Saying what the query returns before writing it catches:',
        [['A grain misunderstanding before the syntax obscures it', true],
         ['Syntax errors that would otherwise appear', false],
         ['The need for an index on the join column', false],
         ['Whether a subquery or a join is preferable', false]],
        'Stating "one row per customer" makes an incorrect join level visible immediately, where the written query would hide it.'),
    ],
  },
  {
    unitCode: 'T4_IV_FUNDAMENTALS_GIT_QUESTIONS',
    notes: `**What you did when two branches conflicted, and what you would do differently.**

## The shape of these questions

**They are experience questions wearing a technical costume.** The mechanism is available from
documentation; what is being probed is whether you have been in the situation.

## The ones that recur

**"Describe a merge conflict you resolved."** What conflicted, how you decided, what you checked
afterwards. **"I kept my version" is an answer with a problem in it**, and saying what you checked
— that their tests still ran, that nothing was silently dropped — is the part that matters.

**"How do you structure your commits?"** Small, one logical change each, messages saying why. And
honestly: whether you actually do, because a claim contradicted by a visible repository is worse
than an admission.

**"You need to undo something."** Reset if local, revert if pushed, and why the distinction
exists.

**"How do you work with others on a branch?"** Pull frequently, push small changes, and do not
rebase shared history.

## The thing that separates

**A specific incident.** "I rebased a branch a colleague had pulled and we spent an hour
recovering" is the strongest available answer, because it cannot be produced from reading and
because the lesson is visibly learned.

## What your repository says

**Interviewers sometimes look.** A history of thirty commits saying "update" is a claim about your
commit discipline that contradicts whatever you said.

**Which makes this one of the few interview answers that can be checked**, and worth making true
rather than good.

## The honest framing

**Most candidates know four commands and look the rest up**, which is normal and fine. **Claiming
more than that is the risk**, because one follow-up establishes it.`,
    mcqs: [
      mcq('"I kept my version" as a conflict resolution is described as an answer with a problem in it, and the part that matters is saying:',
        [['What you checked afterwards', true],
         ['Why your version was the better one', false],
         ['How long the resolution took you', false],
         ['Whether the other author was consulted', false]],
        'Discarding the other side silently removes work and its tests, so the verification is what distinguishes a resolution from a deletion.'),
      mcq('A history of thirty commits saying "update" is described as:',
        [['A claim about your discipline that contradicts what you said', true],
         ['Normal for a project of that size', false],
         ['Something interviewers rarely examine', false],
         ['Acceptable for personal repositories only', false]],
        'The repository is checkable evidence, so a stated practice that the history disproves costs more than not having claimed it.'),
    ],
    checkpoint: [
      mcq('These are described as experience questions wearing a technical costume because the mechanism is:',
        [['Available from documentation', true],
         ['Too complex to assess in an interview', false],
         ['Identical across every version control tool', false],
         ['Not relevant to most graduate roles', false]],
        'What cannot be read is having been in the situation, so the questions probe incidents rather than command behaviour.'),
      mcq('Most candidates know four commands and look the rest up, which is normal — and the risk is:',
        [['Claiming more than that', true],
         ['Admitting it during the interview', false],
         ['Using a graphical tool instead', false],
         ['Not having memorised the flags', false]],
        'A single follow-up establishes the real depth, and an overstated claim is more damaging than the modest accurate one.'),
    ],
  },
  {
    unitCode: 'T4_IV_FUNDAMENTALS_PRACTICE',
    notes: `**Programming, SQL and Git in one sitting, at the pace a first round runs.**

## The drill

**Thirty minutes, three areas, somebody asking.** Ten minutes each, with follow-ups.

**The follow-up is the practice.** Anybody can answer the opener; the drill exists to make the
second and third questions comfortable.

## What the questioner does

**Asks the definition question, then "why", then "when is that not true".** Three levels on every
topic, which is the shape of a real round.

**They do not need to know the answers.** "Why?" and "when would that not hold?" are askable by
anybody and are precisely the questions that separate.

## What to review

**Where you ran out at the second level rather than the third.** The third is genuinely hard and
the second should be automatic, so stopping there marks a topic as memorised rather than
understood.

## The SQL half

**Write it out by hand**, on paper or a whiteboard. Typing with autocomplete is a different
activity and the round will not have it.

## The Git half

**Have three incidents ready** before the drill — a conflict, an undo, a mistake. **If you cannot
produce three, that is the finding**, and the remedy is to use Git more deliberately for a few
weeks rather than to prepare answers.

## The frequency

**Twice before the first real round**, and once after each, using whatever was exposed.

**The value is concentrated in the first session**, which reliably finds two or three topics that
were memorised rather than understood — and finding them is the entire point.`,
    mcqs: [
      mcq('The questioner does not need to know the answers because "why" and "when would that not hold" are:',
        [['Askable by anybody and precisely what separates', true],
         ['Standard questions in published guides', false],
         ['Answerable from the candidate’s own explanation', false],
         ['Less useful than technically informed probing', false]],
        'The follow-ups require no expertise to pose and reliably distinguish understanding from recall, which is what the drill is for.'),
      mcq('Running out at the second level rather than the third marks a topic as:',
        [['Memorised rather than understood', true],
         ['Outside the expected scope of the round', false],
         ['Adequately prepared for a first interview', false],
         ['Harder than the candidate had assumed', false]],
        'The third level is genuinely difficult, where the second should follow from the mechanism, so failing there indicates recall without comprehension.'),
    ],
    checkpoint: [
      mcq('If you cannot produce three Git incidents before the drill, that is the finding, and the remedy is to:',
        [['Use Git more deliberately for a few weeks', true],
         ['Prepare plausible answers in advance', false],
         ['Read about common conflict scenarios', false],
         ['Focus the preparation on the other two areas', false]],
        'The questions probe experience, so the gap is in having had it rather than in being able to describe it.'),
      mcq('The value of this drill is concentrated in the first session because it reliably finds:',
        [['Two or three topics memorised rather than understood', true],
         ['The areas where preparation is weakest overall', false],
         ['Whether the candidate can work under pressure', false],
         ['Which of the three areas needs the most time', false]],
        'Surfacing those specific topics is the entire purpose, and subsequent sessions confirm rather than discover.'),
    ],
  },
  {
    unitCode: 'T4_IV_FUNDAMENTALS_INTERVIEW_QUESTION',
    notes: `**The fundamentals round, as it actually runs.**

## What it is for

**Establishing a floor before the harder rounds.** It is frequently the first technical
conversation, it is broad rather than deep, and its purpose is to find out whether the basics are
solid enough to justify the rest of the process.

**Which means the failure mode is not being unable to answer a hard question.** It is being shaky
on something elementary, which reads as a gap the later rounds will not compensate for.

## The pattern of the round

**Three or four areas, ten minutes each, three levels of depth in each.**

**Definition, mechanism, limitation.** Every topic, in that order, and you can predict it.

## Preparing efficiently

**Take your ten most-used things — the structures, the language features, the SQL forms, the Git
commands — and write the three levels for each.**

**Thirty topics, three sentences each.** It is a couple of hours and it covers most of what this
round can ask, because the round is deliberately about what you use rather than what is obscure.

## What the interviewer is listening for

**Whether the answer sounds used or read.** "I use a dictionary when I need lookup by key" is
used; "a dictionary is an unordered collection of key-value pairs" is read.

**Both are correct.** One of them suggests the thing has been applied.

## The recovery when you do not know

**"I do not know, but it would work like this" is acceptable**, and reasoning from adjacent
knowledge out loud is a legitimate answer in this round specifically — because the round is about
foundations, and reasoning from foundations is exactly the demonstration.

## What loses marks

**Bluffing on something elementary.** It is easily detected and it changes how everything
afterwards is heard.`,
    mcqs: [
      mcq('The failure mode in this round is not being unable to answer a hard question but:',
        [['Being shaky on something elementary', true],
         ['Answering at insufficient depth overall', false],
         ['Taking too long on each of the areas', false],
         ['Using terminology imprecisely throughout', false]],
        'The round establishes a floor, so an elementary gap reads as something the later rounds cannot compensate for.'),
      mcq('"I use a dictionary when I need lookup by key" sounds used where "a dictionary is an unordered collection of key-value pairs" sounds read, and:',
        [['Both are correct', true],
         ['Only the first is technically accurate', false],
         ['The second is preferred for precision', false],
         ['The difference is a matter of style only', false]],
        'The distinction is not accuracy but whether the framing comes from application, which is what the interviewer is listening for.'),
    ],
    checkpoint: [
      mcq('Preparing thirty topics at three sentences each covers most of what this round can ask because the round is deliberately about:',
        [['What you use rather than what is obscure', true],
         ['The syllabus of a standard degree course', false],
         ['Topics that appear in published question banks', false],
         ['Areas where candidates are commonly weak', false]],
        'It establishes a floor on everyday capability, so it draws from common usage rather than from unusual corners.'),
      mcq('"I do not know, but it would work like this" is acceptable in this round specifically because:',
        [['Reasoning from foundations is exactly the demonstration', true],
         ['The round is scored more leniently than others', false],
         ['Interviewers expect gaps at this career stage', false],
         ['The question was probably outside the scope', false]],
        'The round assesses whether foundations are solid, and deriving an unknown from them is direct evidence that they are.'),
    ],
  },

  /* ══ T4_IV_DSA ══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_IV_DSA_THE_CODING_ROUND',
    notes: `**What the coding round is actually scoring**, which is more than whether the code
runs.

## The six things being assessed

**Correctness.** Obviously, and it is one of six.

**Whether you understood before starting.** Restating, asking about constraints.

**The approach, and whether it was stated.** A wrong approach caught early costs nothing; caught
late costs the round.

**The code itself.** Readable names, sensible structure. Not production quality — but a candidate
whose variable names are \`a\`, \`b\` and \`temp\` is telling you something.

**Whether you tested it.** Unprompted, on the sample and an edge case. **Finding your own bug is
one of the strongest signals available.**

**And the complexity, volunteered rather than extracted.**

## What this means for a partial solution

**A working brute force with the cost stated, the tests run and an improvement discussed beats an
optimal solution produced silently.** Four of the six are still demonstrated.

**Which is why getting stuck is survivable** and why silence is not.

## The scoring reality

**Most interviewers are filling a form with categories close to those six.** Knowing that they are
separate is useful: a candidate who cannot finish can still score on understanding, approach,
testing and communication.

## The common misconception

**That the round is a filter on whether you can solve the problem.** It is a structured
conversation about how you solve problems, using this one as the material — and behaving as though
it were the first produces the silent typing that loses rounds.

## What to do in the last five minutes

**Stop coding and consolidate.** State what works, what does not, what you would do with more time,
and the complexity. **An unfinished solution explained clearly scores considerably better than one
abandoned mid-line at time.**`,
    mcqs: [
      mcq('A working brute force with the cost stated, tests run and an improvement discussed beats an optimal solution produced silently because:',
        [['Four of the six criteria are still demonstrated', true],
         ['Brute force solutions are easier to verify', false],
         ['Optimal solutions are rarely required here', false],
         ['Silence indicates the answer was memorised', false]],
        'The round scores several separable things, so a partial solution with the surrounding work visible collects more of them.'),
      mcq('In the last five minutes the recommendation is to stop coding and consolidate, because an unfinished solution explained clearly:',
        [['Scores considerably better than one abandoned mid-line', true],
         ['Demonstrates better time management overall', false],
         ['Allows the interviewer to award partial credit', false],
         ['Prevents errors from appearing in the code', false]],
        'Stating what works, what does not and what would come next converts an incomplete attempt into an assessable one.'),
    ],
    checkpoint: [
      mcq('The common misconception is that the round filters on whether you can solve the problem, where it is actually:',
        [['A structured conversation about how you solve problems', true],
         ['A test of speed under realistic pressure', false],
         ['An assessment of code quality primarily', false],
         ['A check on familiarity with common patterns', false]],
        'The problem is the material for the conversation, and treating it as the objective produces the silent typing that loses rounds.'),
      mcq('A candidate whose variable names are `a`, `b` and `temp` is telling you something, even though the round is not assessing:',
        [['Production code quality', true],
         ['Whether the solution is correct', false],
         ['How quickly they can type', false],
         ['Their familiarity with the language', false]],
        'Readability is one of six criteria rather than the standard applied to shipped code, and unhelpful naming is still a signal.'),
    ],
  },
  {
    unitCode: 'T4_IV_DSA_IMPROVING_ON_DEMAND',
    notes: `**"Can you do better?"** is not a rejection. It is the second half of the question and
it was always coming.

## The framing that helps

**The problem was chosen because it has two solutions** — an obvious one and a better one — and the
round is designed to walk between them.

**Reaching the obvious one is the first half succeeding**, not the candidate falling short.

## The three directions

**Trade memory for time.** A set or dictionary of what you have seen. **The most frequently
applicable**, and the first to consider.

**Exploit an order.** Sorting, or noticing the input is sorted. Turns a nested loop into two
pointers or a scan into a binary search.

**Remove repeated work.** Something recomputed inside a loop, hoisted or cached. At its limit,
dynamic programming.

## The procedure

**Ask what is being computed more than once.** In most cases the answer names the improvement
directly.

**Then state the new complexity and what it cost** — usually memory. **Naming the trade unprompted
is the strongest part of the answer.**

## When there is no improvement

**Say so with a reason.** "Every element must be examined at least once, so linear is a lower
bound here."

**That is complete and correct**, and candidates frequently invent something worse rather than
assert a bound they are confident about — which is the wrong instinct and produces a weaker answer
than the honest one.

## The variant

**"What if the input were sorted?"** or **"what if it did not fit in memory?"** The interviewer is
changing a constraint to see whether the approach adapts.

**Reason from the changed constraint rather than defending the original solution**, which is the
same move as in a design round.`,
    mcqs: [
      mcq('The problem was chosen because it has two solutions, which means reaching the obvious one is:',
        [['The first half succeeding', true],
         ['An indication the approach was too simple', false],
         ['Sufficient if the complexity is stated', false],
         ['Expected only from weaker candidates', false]],
        'The round is designed to walk between the two, so the first solution is the intended starting point rather than a shortfall.'),
      mcq('When no improvement exists, candidates frequently invent something worse rather than assert a lower bound, which is:',
        [['The wrong instinct, producing a weaker answer', true],
         ['A reasonable response to the pressure', false],
         ['Expected when the bound is not provable', false],
         ['Better than appearing unable to continue', false]],
        'A correct statement that linear is optimal demonstrates understanding, where an unnecessary complication demonstrates the opposite.'),
    ],
    checkpoint: [
      mcq('"What if it did not fit in memory?" is the interviewer changing a constraint to see whether the approach adapts, and the correct move is to:',
        [['Reason from the changed constraint', true],
         ['Defend why the original solution is sound', false],
         ['Ask whether the constraint is realistic', false],
         ['Restate the complexity of the current answer', false]],
        'The question is about adaptability, so returning to the original assumptions answers a question that was deliberately set aside.'),
      mcq('The question that names the improvement directly in most cases is what is being:',
        [['Computed more than once', true],
         ['Stored longer than it is needed', false],
         ['Compared in the innermost loop', false],
         ['Assumed about the input ordering', false]],
        'Repeated work is removed by caching, precomputation or dynamic programming, which covers the majority of available improvements.'),
    ],
  },
  {
    unitCode: 'T4_IV_DSA_PRACTICE',
    notes: `**One problem, forty-five minutes, out loud, with a follow-up at the end.**

## The setup

**A person, a medium problem they have the solution to, and a clock.**

**They ask "can you do better?" at the end regardless of what you produced.** That is the part
being practised.

## What they record

**Time to first spoken word.** **Whether constraints were asked about.** **Whether the approach
was stated before coding.** **The longest silence.** **Whether you tested unprompted.** **Whether
you volunteered the complexity.** **And how you responded to the follow-up.**

## The follow-up specifically

**Practise the response**, which is a sequence: acknowledge, identify the repeated work, propose,
state the new cost and what it traded.

**Candidates who have not practised this either freeze or become defensive**, and both are
avoidable with three rehearsals.

## The deliberate stuck attempt

**Once, take a problem you cannot solve.** Practise the recovery: say where you are, go smaller,
solve a weaker version.

**It is uncomfortable and it is the highest-value session in the drill**, because being stuck is
the condition the method exists for and it is never exercised otherwise.

## What to review

**The follow-up response first**, because it is the most reliably improvable.

**Then the longest silence.**

**Then whether testing happened before the interviewer asked.**

## Frequency

**Once a week for six weeks** covers it. The solving is drilled elsewhere; this is the round
behaviour, and it converges quickly because the changes are specific and few.`,
    mcqs: [
      mcq('The interviewer asks "can you do better?" at the end regardless of what was produced because:',
        [['That is the part being practised', true],
         ['Every problem has a better solution', false],
         ['It reveals whether the answer was memorised', false],
         ['The first solution is usually suboptimal', false]],
        'The drill exists to rehearse the response, so the prompt is given unconditionally rather than being earned by a suboptimal answer.'),
      mcq('Candidates who have not practised the follow-up either freeze or become defensive, and both are:',
        [['Avoidable with three rehearsals', true],
         ['Natural responses to unexpected criticism', false],
         ['Signs that the solution was not understood', false],
         ['Less costly than an incorrect improvement', false]],
        'The reaction is unfamiliarity with the prompt rather than a technical gap, so a small number of repetitions removes it.'),
    ],
    checkpoint: [
      mcq('The deliberate stuck attempt is described as the highest-value session in the drill because being stuck is:',
        [['The condition the method exists for', true],
         ['The most common outcome in real rounds', false],
         ['Where the interviewer offers the most help', false],
         ['Harder to simulate than the other situations', false]],
        'The recovery moves are only exercised when progress stops, and practice on solvable problems never creates that condition.'),
      mcq('The follow-up response is reviewed first because it is:',
        [['The most reliably improvable', true],
         ['The part the interviewer weights most', false],
         ['Where the longest silences tend to occur', false],
         ['The only element that can be rehearsed', false]],
        'It is a short fixed sequence, so practising it produces a consistent improvement faster than the other observations do.'),
    ],
  },
  {
    unitCode: 'T4_IV_DSA_INTERVIEW_QUESTION',
    notes: `**The DSA round, as it actually runs — and what to do in each of its phases.**

## The first three minutes

**Read, restate, ask.** Constraints, edge cases, what to return when there is no answer.

**Then state the approach**, including the brute force if that is where you are.

**Candidates who begin typing here have already lost the cheapest correction available.**

## The middle twenty-five

**Write, narrating the decisions.** Signpost the silences. Choose readable names — it costs nothing
and it is one of the six things being scored.

**If the approach turns out to be wrong, say so and change it.** That is a normal event and
handling it calmly is informative in your favour.

## The last ten

**Test, out loud.** The sample, then an edge case you pick — empty, single element, duplicates.

**State the complexity.**

**Then the follow-up arrives.**

## The follow-up phase

**Acknowledge, find the repeated work, propose, cost it, name the trade.**

**And if there is no improvement, say why not.**

## The last five minutes, if unfinished

**Stop and consolidate.** What works, what does not, what you would do next, the complexity.

## What determines the outcome

**Rarely whether the optimal solution was reached.** Almost always whether the interviewer could
follow the reasoning, whether edge cases were considered, and whether the follow-up produced a
sensible improvement.

**Which means the round is substantially more winnable than it feels**, and that is worth knowing
before sitting one — candidates who believe it is pass-or-fail on the answer behave in the way
that actually loses it.`,
    mcqs: [
      mcq('Candidates who begin typing in the first three minutes have lost:',
        [['The cheapest correction available', true],
         ['Time needed for the implementation', false],
         ['The chance to ask about constraints later', false],
         ['Credit for understanding the problem', false]],
        'A wrong approach stated aloud is corrected in seconds, where the same error discovered after implementation consumes the round.'),
      mcq('If the approach turns out to be wrong mid-round, saying so and changing it is:',
        [['A normal event, and handling it calmly is informative in your favour', true],
         ['A significant loss that is hard to recover from', false],
         ['Best deferred until the current attempt is complete', false],
         ['An indication the problem was misread initially', false]],
        'Recognising and correcting a wrong direction is what the round hopes to observe, so the recovery scores rather than the error costing.'),
    ],
    checkpoint: [
      mcq('The outcome is rarely determined by whether the optimal solution was reached, which means the round is:',
        [['Substantially more winnable than it feels', true],
         ['Scored inconsistently between interviewers', false],
         ['Easier for candidates with more experience', false],
         ['Primarily a test of communication skill', false]],
        'Reasoning, edge cases and the follow-up response are the main determinants, and all three are available without the optimal answer.'),
      mcq('Candidates who believe the round is pass-or-fail on the answer behave in the way that:',
        [['Actually loses it', true],
         ['Maximises their chance of solving it', false],
         ['Is expected by most interviewers anyway', false],
         ['Works when the problem is familiar to them', false]],
        'That belief produces silent typing towards the answer, which forfeits the criteria that would otherwise have been scored.'),
    ],
  },
  {
    unitCode: 'T4_IV_DSA_CHECKPOINT',
    notes: `**Whether a coding round is survivable yet.**

## The bar

**A medium problem, forty-five minutes, with somebody watching:**

**Restated and constraints asked.** **Approach stated before coding.** **No silence longer than
fifteen seconds without a signpost.** **Tested unprompted.** **Complexity volunteered.** **And a
sensible response to "can you do better?"**

**Solving it optimally is not on the list**, which is deliberate — those six are what the round
scores and they are achievable independently of reaching the best answer.

## What a weak result means

**Silence**: signposting. The single highest-value change and it is a sentence.

**Approach not stated**: the habit. Second highest value, and also a sentence.

**No testing**: the checklist. Sample, empty, single, duplicate. Ninety seconds, and it frequently
finds a real bug.

**Follow-up handled badly**: three rehearsals. It converges quickly.

**All four are behavioural rather than technical**, which is the characteristic of this module and
why it improves faster than the solving does.

## What this feeds

**Every coding interview**, **mock 2**, and **P23's technical round**.

**And a genuine reduction in how unpleasant the round feels**, which is not a small thing —
candidates who know what is being scored are measurably calmer, and calm is itself worth marks in
a round that assesses communication under pressure.`,
    checkpoint: [
      mcq('Solving the problem optimally is deliberately not on the bar because the six listed criteria:',
        [['Are what the round scores and are achievable independently', true],
         ['Are easier to assess than correctness is', false],
         ['Matter more than the solution in every case', false],
         ['Can be demonstrated without writing any code', false]],
        'Each is scored separately from the answer, so a candidate can meet all six without producing the optimal solution.'),
      mcq('All four common weaknesses are described as behavioural rather than technical, which is why this module:',
        [['Improves faster than the solving does', true],
         ['Requires less practice time overall', false],
         ['Is scheduled before the coding drills', false],
         ['Can be self-assessed without a listener', false]],
        'Behavioural changes are adopted deliberately in a few sessions, where problem-solving capability accumulates over months.'),
      mcq('Candidates who know what is being scored are measurably calmer, and calm is itself worth marks because the round:',
        [['Assesses communication under pressure', true],
         ['Penalises visible signs of nervousness', false],
         ['Rewards candidates who work more quickly', false],
         ['Is scored partly on the interviewer’s impression', false]],
        'Communicating clearly while solving is one of the criteria, and anxiety directly degrades it.'),
      mcq('The two highest-value changes are signposting silences and stating the approach, and both are:',
        [['A sentence', true],
         ['Habits requiring weeks to establish', false],
         ['Dependent on the problem being familiar', false],
         ['Only applicable to longer rounds', false]],
        'Each is a single short utterance rather than a skill, which is why they produce the largest immediate improvement.'),
    ],
  },

  /* ══ T4_IV_CORE_CS ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_IV_CORE_CS_EXPLAINING_A_PROCESS',
    notes: `**Processes, threads and scheduling, explained to somebody probing for where the
understanding stops.**

## The one sentence everything descends from

**A process has its own memory; threads within a process share it.**

**From that:** threads are cheaper to create, because there is no address space to set up. Threads
need synchronisation, because they can touch the same data. A process crashing does not take
another process with it, and a thread crashing can take its whole process.

**Four consequences from one sentence**, and an interviewer probing depth is walking down them.

## Where the probing goes

**"Why is context switching between processes more expensive?"** The memory mapping changes.

**"What is a race condition?"** Two threads accessing shared state without synchronisation, where
the result depends on timing.

**"How do you prevent it?"** A mutex for exclusion, or avoiding shared mutable state entirely —
**and the second is worth mentioning**, because it is what modern practice increasingly prefers.

**"What is a deadlock?"** The four conditions, and that preventing any one is sufficient.

**"Have you hit one?"** The experience question, and a real answer is worth a great deal.

## The concurrency question for a placement candidate

**"How would you make this code thread-safe?"** Usually answerable by a lock around the shared
state, and the better answer notices whether the state needs to be shared at all.

## What separates

**Reasoning down from the one sentence rather than recalling a list.** A candidate deriving why
threads need synchronisation will answer a question they have not seen; one who memorised the fact
will not.

## The honest scope

**A placement candidate is not expected to have written concurrent systems.** Understanding the
model and being able to reason from it is the bar, and pretending otherwise is detected quickly.`,
    mcqs: [
      mcq('A thread crashing can take its whole process where a process crashing does not take another, and both follow from:',
        [['Threads sharing an address space', true],
         ['The scheduler treating them differently', false],
         ['Processes having higher creation cost', false],
         ['Threads running on separate cores', false]],
        'Shared memory means a corrupting thread can damage the whole process, while separate memory isolates processes from each other.'),
      mcq('Asked how to prevent a race condition, mentioning avoiding shared mutable state entirely is worth adding because it is:',
        [['What modern practice increasingly prefers', true],
         ['Faster than using a mutex in all cases', false],
         ['The only approach that scales to many threads', false],
         ['Required when locks cannot be acquired', false]],
        'Removing the sharing eliminates the class rather than guarding it, which is the direction contemporary designs favour.'),
    ],
    checkpoint: [
      mcq('A candidate deriving why threads need synchronisation will answer a question they have not seen, where one who memorised the fact:',
        [['Will not', true],
         ['Answers more quickly on familiar ones', false],
         ['Reaches the same conclusion more slowly', false],
         ['Needs a hint to reconstruct the reasoning', false]],
        'Derivation extends to unfamiliar cases, where recall covers only the specific questions that were memorised.'),
      mcq('A placement candidate is not expected to have written concurrent systems, so the bar is:',
        [['Understanding the model and reasoning from it', true],
         ['Knowing the standard synchronisation primitives', false],
         ['Having debugged a race condition in practice', false],
         ['Familiarity with one concurrency library', false]],
        'The assessment is whether the concepts support reasoning, and claiming production experience that does not exist is quickly detected.'),
    ],
  },
  {
    unitCode: 'T4_IV_CORE_CS_EXPLAINING_A_PACKET',
    notes: `**"What happens when you type a URL"** — the most asked networking question in any
format, and a depth probe disguised as a standard one.

## The outline, forty-five seconds

**DNS resolves the name. TCP connects. TLS negotiates if HTTPS. The request is sent. The server
responds. The browser parses and fetches sub-resources. It renders.**

**Seven steps. Then stop**, and let them choose where to go deeper.

## Why stopping matters

**Because the question can be answered in thirty seconds or thirty minutes**, and the interviewer
controls which.

**A candidate who opens with DNS packet structure has misjudged the level** and will spend the
whole answer in step one, demonstrating depth in one place and breadth nowhere.

## Where they will push, and what is expected

**DNS:** cache, resolver, root, top-level, authoritative.

**TCP:** the three-way handshake, and why four steps to close.

**TLS:** a shared key established using the certificate for trust. **Asymmetric to exchange,
symmetric thereafter, and the reason is speed** — that is the depth marker.

**HTTP:** methods, status families, headers that matter.

**Rendering:** parsing, render-blocking resources, why script placement matters.

## The good move after the outline

**"Each of these is a large topic — where would you like me to go?"**

**It is legitimate and it demonstrates that you know each step has depth available**, which is
precisely what the question is assessing.

## What this question is really for

**Breadth with available depth.** Whether you understand that the stack is layered, and can enter
any layer when asked.

**Which is why the outline matters more than any individual step** — a candidate strong in one
layer and blank in the others has answered worse than one who is adequate across all seven.`,
    mcqs: [
      mcq('A candidate who opens with DNS packet structure demonstrates depth in one place and:',
        [['Breadth nowhere', true],
         ['Confusion about the layer ordering', false],
         ['Preparation from a specific source', false],
         ['An unwillingness to be interrupted', false]],
        'The answer is consumed by the first step, so the remaining six layers are never reached and the breadth is not shown.'),
      mcq('The TLS depth marker is asymmetric to exchange and symmetric thereafter, with the reason being:',
        [['Speed', true],
         ['Certificate compatibility across clients', false],
         ['The key length that can be supported', false],
         ['Resistance to interception in transit', false]],
        'Asymmetric operations are computationally expensive, so they establish a shared key for the much faster symmetric encryption.'),
    ],
    checkpoint: [
      mcq('A candidate strong in one layer and blank in the others has answered worse than one who is:',
        [['Adequate across all seven steps', true],
         ['Strong in two adjacent layers', false],
         ['Able to describe the request format', false],
         ['Familiar with the tools that inspect traffic', false]],
        'The question assesses breadth with available depth, so coverage of the whole path outranks depth confined to one part of it.'),
      mcq('"Each of these is a large topic — where would you like me to go?" demonstrates that you know:',
        [['Each step has depth available', true],
         ['The interviewer has a preferred area', false],
         ['The outline was sufficient as an answer', false],
         ['Time is limited for the remaining questions', false]],
        'Recognising that every step opens into a subject is itself the understanding the question is probing for.'),
    ],
  },
  {
    unitCode: 'T4_IV_CORE_CS_EXPLAINING_A_TRANSACTION',
    notes: `**ACID as behaviour rather than as an acronym**, and what a database actually does to
provide it.

## The four, in terms of what can be observed

**Atomicity.** Either all of it happened or none of it did. **The observable consequence: nobody
ever sees half a transfer.**

**Consistency.** The database moves from one valid state to another — constraints hold before and
after.

**Isolation.** Concurrent transactions do not see each other's incomplete work. **The observable
consequence: a reader never sees a value that was rolled back.**

**Durability.** Once committed, it survives a crash.

**Reciting the four is the opener.** Explaining what each prevents, in terms somebody could
observe, is the answer.

## Isolation levels, which is where the depth is

**Read uncommitted, read committed, repeatable read, serialisable** — increasing isolation and
decreasing concurrency.

**And the anomalies each prevents:** dirty read, non-repeatable read, phantom read.

**The trade is the point.** Higher isolation costs throughput, and the question is frequently
"which would you choose and why" rather than "what are they".

## What the database actually does

**A write-ahead log for durability and atomicity** — the change is recorded before it is applied,
so a crash can be replayed or undone.

**Locks or versioning for isolation.** Knowing that there are two families, and that versioning
lets readers proceed without blocking writers, is a genuine depth marker.

## The practical question

**"Two users transfer money at the same time."** Isolation, and what goes wrong without it — a
lost update, where both read the balance, both compute, and one write vanishes.

**"How do you prevent it?"** A transaction with adequate isolation, an atomic update in the
database, or a version check. **Three answers, and any is acceptable with a reason.**`,
    mcqs: [
      mcq('The observable consequence of atomicity is that:',
        [['Nobody ever sees half a transfer', true],
         ['Constraints hold before and after it runs', false],
         ['A committed change survives a crash', false],
         ['Readers never see uncommitted values', false]],
        'All-or-nothing means intermediate states are never visible externally, which is the behaviour the property guarantees.'),
      mcq('A write-ahead log provides durability and atomicity because the change is recorded before it is applied, so a crash can be:',
        [['Replayed or undone', true],
         ['Detected before any data is written', false],
         ['Isolated from concurrent transactions', false],
         ['Prevented by delaying the commit', false]],
        'The log holds enough information to complete a committed transaction or reverse an incomplete one after restart.'),
    ],
    checkpoint: [
      mcq('The depth marker on isolation implementation is knowing there are two families and that versioning:',
        [['Lets readers proceed without blocking writers', true],
         ['Requires less storage than locking does', false],
         ['Prevents every anomaly automatically', false],
         ['Is the only approach for high concurrency', false]],
        'Readers see a consistent snapshot rather than waiting, which is the practical advantage that distinguishes the two approaches.'),
      mcq('For "two users transfer money at the same time", three acceptable answers are given, and any is acceptable:',
        [['With a reason', true],
         ['Provided the isolation level is named', false],
         ['Only if the lost update is described first', false],
         ['If it matches the database being discussed', false]],
        'The question probes understanding of the failure and the options, so the justification matters more than which option is chosen.'),
    ],
  },
  {
    unitCode: 'T4_IV_CORE_CS_PRACTICE',
    notes: `**A core CS round: operating systems, networking and databases, asked the way a round
asks them.**

## The drill

**Thirty minutes, three subjects, somebody asking three levels deep on each.**

**Definition, mechanism, limitation** — and the third level is where a memorised answer runs out.

## The questions the partner should ask

**"What is X?"** Then **"why does it work that way?"** Then **"when does that not hold, or what
does it cost?"**

**They need no technical knowledge**, which is the point — those three questions are askable by
anybody and reliably find the boundary of understanding.

## The three anchor sentences

**Before the drill, make sure you have these and can derive from them:**

**"A process has its own memory; threads share it."**

**"TCP is reliable and ordered; UDP is neither and is faster."**

**"A transaction is all-or-nothing, and isolation decides what concurrent transactions see of each
other."**

**Most of a core CS round descends from those three**, and a candidate who can derive rather than
recall will handle questions they have not prepared.

## What to review

**Where the third level failed.** Those are the topics that are memorised, and they are exactly
what an interviewer probing depth will find.

## The URL question

**Rehearse it specifically.** It is the single most likely question in this round, the outline
should take forty-five seconds, and it should end with an invitation to choose a direction.

## Frequency

**Twice is usually enough.** This material is stable, the question set is predictable, and once
the anchor sentences support derivation the round stops being a memory test.`,
    mcqs: [
      mcq('The partner needs no technical knowledge because the three questions — what, why, when does it not hold — are:',
        [['Askable by anybody and reliably find the boundary', true],
         ['Standard in published interview guides', false],
         ['Answerable from the candidate’s own words', false],
         ['Less effective than informed questioning', false]],
        'The sequence probes progressively deeper without the questioner needing to evaluate correctness, which is what makes it usable.'),
      mcq('Twice is usually enough for this drill because the material is stable, the question set is predictable and:',
        [['Derivation replaces memorisation once the anchors hold', true],
         ['The round carries less weight than others', false],
         ['Most candidates already know this material', false],
         ['Further sessions repeat the same questions', false]],
        'With the anchor sentences supporting reasoning, unprepared questions become answerable and additional rehearsal adds little.'),
    ],
    checkpoint: [
      mcq('The topics where the third level failed are described as:',
        [['Memorised, and exactly what a depth probe finds', true],
         ['Beyond what a placement round requires', false],
         ['Worth deferring until the other two improve', false],
         ['Evidence that the anchor sentences are wrong', false]],
        'A memorised answer covers the definition and mechanism and stops at the limitation, which is where an interviewer probing depth arrives.'),
      mcq('The URL question is rehearsed specifically because it is the single most likely question in this round and the outline should:',
        [['Take forty-five seconds and end with an invitation', true],
         ['Cover each layer in equal technical detail', false],
         ['Begin with the lowest layer of the stack', false],
         ['Include the packet formats at each step', false]],
        'A brief complete outline demonstrates breadth and lets the interviewer direct the depth, which is what the question is for.'),
    ],
  },
  {
    unitCode: 'T4_IV_CORE_CS_INTERVIEW_QUESTION',
    notes: `**The core CS round, and the specific thing it is trying to find out.**

## What it is for

**Whether the foundations are understood or memorised.** The material is standard, every candidate
has studied it, and the round exists to distinguish the two.

**Which is why every question has a third level.** The first two are answerable from revision and
the third is not.

## How to be on the right side of that

**Derive from a small number of anchor facts rather than recalling a large number of answers.**

**Three sentences carry most of the round:** processes against threads, TCP against UDP,
transactions and isolation. **Everything else descends from them**, and derivation handles
questions that were never prepared.

## The honest answers that work

**"I have not worked with that directly, but based on X it would probably work like this."**

**This is a good answer in this round specifically**, because the round is about foundations and
reasoning from foundations is the demonstration being sought.

**"I know the definition but I have not thought about why"** is also honest and is considerably
better than a confident wrong mechanism.

## What separates

**The consequences, not the definitions.** "Threads share memory" is the definition. "Which is why
they need synchronisation and why one can corrupt another" is the understanding, and volunteering
the consequence is what shows it.

## The experience questions

**"Have you hit a deadlock?" "Have you debugged a slow query?"** A real instance is worth more than
any amount of theory, and if the answer is no, saying so and describing how you would approach it
is the correct response.

## What loses marks

**A confident wrong mechanism.** It is worse than not knowing, because it suggests the
understanding is unreliable in a way that cannot be detected from the confident correct answers
either.`,
    mcqs: [
      mcq('Every question in this round has a third level because the first two are:',
        [['Answerable from revision and the third is not', true],
         ['Required to establish a baseline first', false],
         ['Where most candidates make their errors', false],
         ['Used to set the pace of the conversation', false]],
        'The round distinguishes understanding from memorisation, and only a question beyond what was revised can separate them.'),
      mcq('A confident wrong mechanism is worse than not knowing because it suggests the understanding is unreliable in a way that:',
        [['Cannot be detected from the correct answers either', true],
         ['Will affect the candidate’s technical work', false],
         ['Indicates poor preparation for the round', false],
         ['Undermines the rest of the interview process', false]],
        'It casts doubt on every confident answer given, since the interviewer can no longer distinguish knowing from believing.'),
    ],
    checkpoint: [
      mcq('"I have not worked with that directly, but based on X it would probably work like this" is described as a good answer in this round specifically because:',
        [['Reasoning from foundations is the demonstration sought', true],
         ['Honesty is scored separately from knowledge', false],
         ['The round permits more uncertainty than others', false],
         ['Practical experience is not expected at all', false]],
        'The round assesses whether the foundations support reasoning, so deriving an unknown from them is direct evidence that they do.'),
      mcq('What separates candidates is the consequences rather than the definitions, so volunteering that threads sharing memory is why they:',
        [['Need synchronisation and can corrupt each other', true],
         ['Are scheduled by the operating system kernel', false],
         ['Can execute on multiple cores simultaneously', false],
         ['Have lower creation cost than processes do', false]],
        'Those two consequences follow directly from the shared address space and demonstrate the fact is understood rather than recalled.'),
    ],
  },
];
