/**
 * T3_INTERVIEW_PRACTICE, T3_SYSTEM_DESIGN, T3_TECH_WRITING and T3_PRESENTING — fourteen
 * units. S21 and S22.
 *
 * ── WHAT THESE TWO MODULES ARE FOR ────────────────────────────────────────────────────────
 *
 * S21 is not "learn algorithms". The algorithms are in S06 to S08 and the student has done
 * them. This module is about the part of an interview that is not the solution: restating
 * the problem, narrating the reasoning, and being stuck without going silent. Those three
 * are what most candidates lose on, and none of them is taught by more practice problems.
 *
 * The system design topic is the same argument at a larger scale. There is no right answer
 * to a design question; there is an answer you can justify, and a structure that stops the
 * conversation becoming a box-drawing exercise.
 *
 * S22 is the writing module, and it exists because the two most common professional writing
 * failures — a design note nobody can review and a question nobody can answer — cost days
 * and are entirely learnable.
 *
 * The CHECKPOINT units in this module carry their protocol in the notes rather than in an
 * assignment, because the seeder reserves rubric-bearing briefs for PROJECT units and a
 * mock interview is not one.
 *
 * Attribution: INTERVIEW_PRACTICE and SYSTEM_DESIGN are single-skill and derived, as is
 * TECH_WRITING. PRESENTING defaults to TECHNICAL_EXPLANATION with PRESENTING_A_PROJECT on
 * COMMUNICATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const INTERVIEW_BUNDLES: PilotBundle[] = [
  /* ══ T3_INTERVIEW_PRACTICE ══════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_INTERVIEW_PRACTICE_INTERPRETING_THE_PROBLEM',
    notes: `**The first two minutes decide more than the next thirty**, and most candidates
spend them typing.

## What the interviewer has actually given you

**An incomplete problem, on purpose.** The ambiguity is part of the question. **A candidate
who does not notice it has already answered one of the things being assessed**, and answered
it badly.

**A small example**, which is almost never the hard case.

**And a time limit that assumes you will spend some of it thinking.**

## Restate it

**In your own words, in two sentences, before anything else.**

"So I have a list of integers and I need to return the two indices whose values sum to a
target. If there are several pairs, any one will do — is that right?"

**This costs twenty seconds and it does three things:** it catches a misunderstanding while
it is free, it shows you listened, and **it buys you thinking time that looks like
diligence** rather than like being stuck.

## Ask about the constraints

**Size.** Ten elements or ten million? **It changes the answer, and asking shows you know
that.**

**Range.** Negative numbers? Zero? Very large values?

**Duplicates.** Allowed? Do they count separately?

**Sorted?** If it is, half the problems become a different problem.

**Mutability.** May I modify the input?

**And what to return when there is no answer.** Empty, null, an exception — **the case most
candidates discover at the end, in a hurry.**

**Three or four questions is right.** More is stalling and the interviewer will say so.

## Name the edge cases out loud

**Empty input. One element. All the same. Already sorted. Nothing matches.**

**Say them before you code**, and then handle them, and then say "and that covers the empty
case" when you do.

**A candidate who names the edge cases at the start and handles them in the code is doing the
single most visible correct thing available in a coding interview**, because it is the thing
the interviewer is most reliably checking and the thing most candidates leave to the end.

## Then say the approach

**Before writing anything:** "I am going to use a hash map from value to index, one pass,
which gives linear time and linear space. The alternative is sorting and two pointers, which
is n log n and constant space if I may modify the input."

**Two approaches, with the trade-off named.**

**Then ask: "shall I go with the first one?"** They will tell you, and occasionally they will
tell you something that saves you ten minutes.

## Why this order

**Because the interviewer is assessing whether you would be good to work with on a problem
that is not fully specified** — which is every problem — **and the code is only one part of
that.**

**A perfect solution to the wrong problem scores worse than a partial solution to the right
one**, and the restatement is what makes sure you are on the right one.`,
    mcqs: [
      mcq('The ambiguity in the problem is:',
        [['Part of the question, so not noticing it answers one of the assessments badly', true],
          ['An oversight in how the problem was presented', false],
          ['Resolved by asking a single clarifying question', false],
          ['Deliberate but not usually assessed directly', false]],
        'An incomplete problem, on purpose.'),
      mcq('Restating the problem buys you:',
        [['Thinking time that looks like diligence rather than like being stuck', true],
          ['A chance to negotiate the scope of the problem', false],
          ['Confirmation that the interviewer is paying attention', false],
          ['An opportunity to show how quickly you understood', false]],
        'Twenty seconds, and it does three things.'),
      mcq('The constraint case most candidates discover at the end is:',
        [['What to return when there is no answer', true],
          ['Whether duplicates are allowed in the input', false],
          ['Whether the input may be modified in place', false],
          ['How large the input can become', false]],
        'Empty, null, or an exception — in a hurry.'),
      mcq('Naming the edge cases at the start and handling them in the code is:',
        [['The single most visible correct thing available in a coding interview', true],
          ['A useful habit that some interviewers notice', false],
          ['Best done once the main solution is working', false],
          ['Worth doing when time permits after the approach', false]],
        'It is what the interviewer is most reliably checking.'),
    ],
    checkpoint: [
      mcq('Three or four clarifying questions is right because:',
        [['More is stalling, and the interviewer will say so', true],
          ['That is how many constraints most problems have', false],
          ['It leaves enough time for the implementation', false],
          ['Fewer suggests you did not read the problem', false]],
        'Size, range, duplicates, sorted, mutability, the empty answer.'),
      mcq('Stating two approaches with the trade-off named:',
        [['Lets the interviewer redirect you before you spend ten minutes', true],
          ['Demonstrates breadth of algorithmic knowledge', false],
          ['Covers you if the first approach fails', false],
          ['Is expected at senior level but is optional otherwise', false]],
        'Then ask which to go with.'),
      mcq('A perfect solution to the wrong problem:',
        [['Scores worse than a partial solution to the right one', true],
          ['Still demonstrates the technical ability being tested', false],
          ['Can be recovered if the misunderstanding is caught early', false],
          ['Is rare once the problem has been read carefully', false]],
        'The restatement is what makes sure you are on the right one.'),
    ],
  },

  {
    unitCode: 'T3_INTERVIEW_PRACTICE_TALKING_WHILE_SOLVING',
    notes: `**The interviewer is assessing your reasoning. Silence hides the thing being
marked.**

## What they are actually writing down

**Not whether you got it.** Plenty of people who got it are not hired.

**How you approached it.** Did you understand before solving?

**Whether your reasoning is sound**, including where it went wrong.

**Whether you noticed your own mistake**, which is worth more than not making it.

**And whether talking to you about a technical problem is pleasant**, because they will be
doing it every day if you are hired.

**A silent candidate gives them almost none of this**, and they cannot give credit for
thinking they did not see.

## What to say

**The approach, before you start.**

**What you are doing now.** "I am setting up the map first, then one pass over the array."

**Why, when there is a choice.** "I am using a set rather than a list here because I only need
membership."

**What you are worried about.** "I think this breaks if the list is empty, I will come back to
it" — and then come back to it.

**When you notice something.** "Actually, that is wrong — if there are duplicates this counts
them twice."

**That last one is the most valuable sentence available**, because catching your own error out
loud demonstrates exactly the thing they cannot otherwise observe.

## What not to say

**A running commentary of the syntax.** "Now I am writing a for loop" is noise.

**Apologies.** "Sorry, I am being slow" spends attention on nothing.

**Every thought.** Filter to the decisions.

**And anything claimed rather than reasoned.** "This is obviously O(n)" — say why.

## Thinking silently, correctly

**Sometimes you need quiet. Ask for it.**

**"Let me think about this for a minute"** is completely acceptable and is much better than
either a silence they have to interpret or a stream of half-formed sentences.

**Then come back and say what you concluded.** A minute of silence bracketed by "let me
think" and "right, here is what I have" costs you nothing.

## Practising it

**This is uncomfortable and it is entirely a practice skill.**

**Solve problems out loud, alone**, to a wall or a recording. It feels absurd and it works.

**Record yourself once and watch it.** **You will find long silences you did not know you
were leaving**, which is the whole reason to do it.

**And practise with a person** as often as you can get one, because a person reacts and a
wall does not.

## When you are wrong out loud

**Say it and correct it.** "That is wrong, let me fix it."

**Do not quietly edit the code and hope.** The interviewer saw. **An unacknowledged
correction reads as not having noticed**, which is the opposite of what actually happened and
costs you the credit you had earned.`,
    mcqs: [
      mcq('A silent candidate is a problem because:',
        [['The interviewer cannot give credit for thinking they did not see', true],
          ['Silence suggests the candidate is stuck', false],
          ['It makes the interview uncomfortable for both', false],
          ['It leaves no record of the approach taken', false]],
        'They are assessing reasoning, not just the answer.'),
      mcq('The most valuable sentence available is:',
        [['"Actually, that is wrong" — catching your own error out loud', true],
          ['"Let me think about this for a minute"', false],
          ['"I am using a set here because I only need membership"', false],
          ['"I think this breaks on empty input"', false]],
        'It demonstrates exactly what they cannot otherwise observe.'),
      mcq('Asking for a minute of silence is:',
        [['Much better than either a silence they must interpret or half-formed sentences', true],
          ['A sign you were not prepared for this kind of problem', false],
          ['Acceptable once, but not repeatedly', false],
          ['Better replaced by thinking aloud imperfectly', false]],
        'Bracket it with "let me think" and "here is what I have".'),
      mcq('Recording yourself solving out loud reveals:',
        [['Long silences you did not know you were leaving', true],
          ['Which parts of your explanation are unclear', false],
          ['How long you take compared with the limit', false],
          ['Verbal habits that distract the listener', false]],
        'Which is the whole reason to do it.'),
    ],
    checkpoint: [
      mcq('Quietly editing the code after noticing an error:',
        [['Reads as not having noticed, which is the opposite of what happened', true],
          ['Is efficient when time is short', false],
          ['Is acceptable if the fix is obvious', false],
          ['Avoids drawing unnecessary attention to a mistake you fixed', false]],
        'The interviewer saw. Say it and correct it.'),
      mcq('"Now I am writing a for loop" is:',
        [['Noise — narrate decisions, not syntax', true],
          ['Useful for keeping the interviewer oriented', false],
          ['Better than silence while you type', false],
          ['Appropriate for an unfamiliar language', false]],
        'Filter to the decisions.'),
      mcq('Solving out loud alone to a wall:',
        [['Feels absurd and works', true],
          ['Is a poor substitute for practising with a person', false],
          ['Helps mainly with pacing rather than narration', false],
          ['Is only useful for problems you have not seen', false]],
        'And practise with a person as often as you can.'),
    ],
  },

  {
    unitCode: 'T3_INTERVIEW_PRACTICE_WHEN_YOU_ARE_STUCK',
    notes: `**The four minutes where nothing is working.** Everybody has them. **What you do
in them is assessed more heavily than the part where things went well**, because it is the
part that resembles a real Tuesday.

## What being stuck looks like from outside

**Silence.** Which reads as panic or as having given up.

**Random edits.** Changing things to see what happens, which reads as not understanding your
own code.

**Or saying "I do not know"** and stopping, which ends the conversation.

**None of these is what you are doing internally**, and all three are what the interviewer
records.

## What to do instead

**Say you are stuck.** Out loud. "I have got stuck here — let me talk through what I have."

**This is not a loss of points.** It is the opening move of the recovery, and the interviewer
has been waiting for it.

**Then state what you know.** "The approach works for the general case, but I cannot see how
to handle the duplicates without an extra pass."

**Then state what you have tried.** Two or three things, and why each did not work.

**Then go to the example.** Work the smallest failing case by hand, on paper, out loud. **This
solves it more often than thinking harder does**, and it is the technique most candidates
forget under pressure.

**Then simplify.** "Let me solve it assuming no duplicates first, and then add them." **A
working restricted solution is worth a great deal more than a broken general one**, and it
frequently turns into the general one.

## Asking for a hint

**Allowed, and it is not a failure.**

**Ask well.** Not "can you give me a hint" but **"I am choosing between a hash map and
sorting first — is one of those closer to what you have in mind?"**

**A specific question gets a specific answer** and shows you have narrowed it. A vague one
gets a vague hint and reads as having nothing.

**And take the hint.** Candidates who receive a hint and continue in their original direction
are a recognised category and not a favourably regarded one.

## The clock

**If you are five minutes from the end with nothing working, change the goal.**

**Get something working**, even restricted. **Say what you would do with more time.**

**Partial and explained beats blank.** A candidate who says "this handles the sorted case, and
for the general case I would sort first at n log n, which I have not implemented" has
demonstrated most of what was being asked.

## Afterwards

**Do not apologise at length.** One line if any.

**Say what you would do differently.** "I should have worked the example on paper sooner" is
a good answer and it is usually the true one.

**And the honest reframing worth carrying in:** everybody gets stuck in interviews, including
the person interviewing you, who gets stuck at work every week. **The assessment is not
whether it happens. It is whether you are useful while it is happening.**`,
    mcqs: [
      mcq('What you do while stuck is assessed heavily because:',
        [['It is the part that resembles a real Tuesday', true],
          ['It reveals the limits of your preparation', false],
          ['Recovery is harder to fake than a solution', false],
          ['Most candidates get stuck at the same point', false]],
        'Everybody has those four minutes.'),
      mcq('Saying "I am stuck" out loud is:',
        [['The opening move of the recovery, which the interviewer has been waiting for', true],
          ['A concession that costs some credit', false],
          ['Better delayed until you have tried a second approach', false],
          ['Acceptable once but not more than that', false]],
        'Then what you know, what you tried, then the example.'),
      mcq('Working the smallest failing case by hand:',
        [['Solves it more often than thinking harder does', true],
          ['Buys time while the approach becomes clear', false],
          ['Demonstrates methodical debugging to the interviewer', false],
          ['Is mainly useful for off-by-one problems', false]],
        'And it is the technique most candidates forget under pressure.'),
      mcq('A working restricted solution is:',
        [['Worth a great deal more than a broken general one', true],
          ['Acceptable only if you say what is missing', false],
          ['A fallback when the time is nearly gone', false],
          ['Equivalent to a partial general solution', false]],
        'And it frequently turns into the general one.'),
    ],
    checkpoint: [
      mcq('A good hint request sounds like:',
        [['Choosing between a hash map and sorting — is one closer to what you have in mind', true],
          ['Could you possibly give me some kind of hint about where I should go next', false],
          ['Am I on the right track with this approach', false],
          ['Would you like me to try a different method', false]],
        'A specific question gets a specific answer.'),
      mcq('Receiving a hint and continuing in your original direction:',
        [['Is a recognised category and not a favourably regarded one', true],
          ['Shows confidence in your own reasoning', false],
          ['Is reasonable when you believe the hint is mistaken', false],
          ['Suggests the hint was not clear enough', false]],
        'Take the hint — it is information you did not have a moment ago.'),
      mcq('The honest reframing worth carrying into the interview is:',
        [['The assessment is not whether you get stuck but whether you are useful while stuck', true],
          ['Most candidates get stuck, so it costs less than it feels', false],
          ['Interviewers expect partial solutions from most of the candidates they see', false],
          ['Being stuck is a sign the problem was difficult', false]],
        'The person interviewing you gets stuck at work every week.'),
    ],
  },

  {
    unitCode: 'T3_INTERVIEW_PRACTICE_TIMED_SETS',
    notes: `Problems under a clock, at the difficulty interviews actually use.

**Two exercises here, and both are about the parts of the interview that are not the
algorithm** — because the algorithms are in S06 to S08 and you have done them. **What is
practised here is the protocol**: what you say, in what order, and what you do when the
clock is nearly gone.`,
    coding: [
      {
        title: 'The opening two minutes',
        description: `Read one line per thing the candidate did, in the order they did it,
each one of: \`restate\`, \`ask_constraints\`, \`name_edges\`, \`state_approach\`, \`code\`.

Print \`ok\` or a problem for each, checking as you read:

- \`code\` before \`restate\` has happened → \`CODED_BLIND\`
- \`code\` before \`state_approach\` has happened → \`NO_APPROACH\`
- anything appearing twice → \`REPEATED <name>\`
- otherwise → \`ok\`

Then \`score=<n>\` counting the \`ok\` lines.

**\`CODED_BLIND\` takes precedence over \`NO_APPROACH\`**, because solving the wrong problem
elegantly is the worse of the two failures.`,
        starter: `import sys

rows = [l.strip() for l in sys.stdin if l.strip()]

# Coding without restating is worse than coding without an approach.
`,
        language: 'python',
        tests: [
          { input: 'restate\nask_constraints\nname_edges\nstate_approach\ncode\n', expectedOutput: 'ok\nok\nok\nok\nok\nscore=5' },
          { input: 'code\n', expectedOutput: 'CODED_BLIND\nscore=0' },
          { input: 'restate\ncode\n', expectedOutput: 'ok\nNO_APPROACH\nscore=1' },
          { input: 'restate\nrestate\n', expectedOutput: 'ok\nREPEATED restate\nscore=1' },
          { input: 'restate\nstate_approach\ncode\ncode\n', expectedOutput: 'ok\nok\nok\nREPEATED code\nscore=3', isHidden: true },
        ],
      },
      {
        title: 'Five minutes left',
        description: `You are near the end. Read one line as
\`<general_works> <restricted_works> <can_explain_rest>\`, each \`yes\` or \`no\`, and print
the right move:

- general works → \`submit_general\`
- general does not, restricted does, and you can explain the rest → \`submit_restricted_and_explain\`
- general does not, restricted does, and you cannot → \`submit_restricted\`
- neither works, and you can explain → \`explain_approach\`
- neither, and you cannot → \`work_the_example\`

**The last one is the only case where you keep coding**, because with nothing working and
nothing to say, the small example on paper is the highest-value thing left.`,
        starter: `import sys

g, r, e = sys.stdin.read().split()

# With nothing working and nothing to say, go to the example.
`,
        language: 'python',
        tests: [
          { input: 'yes no no\n', expectedOutput: 'submit_general' },
          { input: 'no yes yes\n', expectedOutput: 'submit_restricted_and_explain' },
          { input: 'no yes no\n', expectedOutput: 'submit_restricted' },
          { input: 'no no yes\n', expectedOutput: 'explain_approach' },
          { input: 'no no no\n', expectedOutput: 'work_the_example', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Timed Practice Sets',
      description: 'Score the opening protocol and the endgame, then sit six problems under a real clock.',
      instructions: `Complete both exercises, then:

1. For the first: coding before restating is worse than coding before stating an approach.
   Say why, in terms of what each one risks.
2. For the second: the only case where you keep coding is when nothing works and you cannot
   explain. Say why that is the right call rather than giving up.
3. For the second: give a case where you would submit the restricted solution even though
   the general one is nearly working.

**Then, six problems under a real clock.**

4. **Set a timer. Thirty minutes each, and stop when it stops.** Not thirty-five.
5. Two easy, three medium, one hard — the distribution interviews actually use.
6. **For every one, out loud:** restate, ask the constraints to yourself, name the edge cases,
   state two approaches with the trade-off, then code.
7. **Record yourself for at least two of them.**
8. For each: did you finish, what was the state at thirty minutes, and what did you say?

**Then review the recordings.**

9. How long was your longest silence?
10. Did you state an approach before coding, or drift into it?
11. Did you name the edge cases before or after writing them?
12. Did you catch any of your own errors out loud?
13. **Pick the worst moment in the recordings and write down what you should have said.**
14. Then re-do one problem you failed, out loud, applying that.`,
      rubric: [
        { criterion: 'Opening protocol scored', description: 'All cases, with the precedence rule applied correctly.', maxPoints: 15 },
        { criterion: 'Endgame decided', description: 'All cases, including the keep-coding one.', maxPoints: 15 },
        { criterion: 'Six problems under a real clock', description: 'Right distribution, timer obeyed, state at thirty minutes recorded.', maxPoints: 20 },
        { criterion: 'The protocol followed out loud', description: 'Restate, constraints, edges, two approaches, on every problem.', maxPoints: 20 },
        { criterion: 'Recordings reviewed honestly', description: 'Silences measured, approach and edge timing assessed, self-corrections counted.', maxPoints: 20 },
        { criterion: 'The worst moment rewritten', description: 'Identified, what should have been said, and one problem re-done.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.strip() for l in sys.stdin if l.strip()]
`,
        tests: [
          { input: 'restate\nask_constraints\nname_edges\nstate_approach\ncode\n', expectedOutput: 'ok\nok\nok\nok\nok\nscore=5' },
          { input: 'code\n', expectedOutput: 'CODED_BLIND\nscore=0' },
          { input: 'restate\ncode\n', expectedOutput: 'ok\nNO_APPROACH\nscore=1' },
          { input: 'restate\nrestate\n', expectedOutput: 'ok\nREPEATED restate\nscore=1' },
          { input: 'restate\nstate_approach\ncode\ncode\n', expectedOutput: 'ok\nok\nok\nREPEATED code\nscore=3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Coding before restating risks:',
        [['Solving the wrong problem, which no amount of elegance recovers', true],
          ['Choosing an approach that does not fit the constraints', false],
          ['Missing edge cases that come up later', false],
          ['Running out of time before the general case', false]],
        'Coding without an approach risks a worse solution to the right problem.'),
      mcq('Stopping at thirty minutes rather than thirty-five:',
        [['Practises the constraint the interview actually imposes', true],
          ['Prevents the practice session running too long', false],
          ['Makes the results comparable between problems', false],
          ['Reflects how long most interviewers allow', false]],
        'Set a timer, and stop when it stops.'),
      mcq('With nothing working and nothing to explain, the highest-value move is:',
        [['The small example on paper', true],
          ['Asking the interviewer for a hint', false],
          ['Describing the approach you were attempting', false],
          ['Restarting with a simpler formulation', false]],
        'The only case where you keep coding.'),
    ],
  },

  {
    unitCode: 'T3_INTERVIEW_PRACTICE_MOCK_INTERVIEW',
    notes: `**The whole thing, with somebody watching, and feedback afterwards.**

This is a checkpoint rather than a project, so the protocol is here rather than in a brief.
**Follow it as written** — the value is entirely in doing it under the real conditions, and
every condition below is one people quietly drop.

## Setting it up

**Find a person.** A classmate, a mentor, somebody from a community. **Not yourself with a
timer** — the thing being practised is a conversation and you cannot have one alone.

**Give them a problem you have not seen.** Have them choose it, or pick from a list without
reading them first.

**Forty-five minutes.** Camera on if it is remote. **Recorded**, with their permission.

**Give them this to watch for:**

- Did the candidate restate the problem before starting?
- Did they ask about constraints? Which ones did they miss?
- Did they name edge cases before coding?
- Did they state an approach, with an alternative?
- How long was the longest silence?
- Did they catch their own mistakes out loud?
- When stuck, what did they do?
- Would you want to work through a problem with this person?

**That last question is the one that decides real interviews** and the one no practice tool
asks.

## Running it

**Treat it as real.** Dress as you would, set up as you would, no notes you would not have.

**No pausing.** If it goes badly, it goes badly for forty-five minutes — **which is the
experience being rehearsed, and stopping halfway removes the only part that is hard to get
elsewhere.**

**And no explaining afterwards what you meant.** What you said is what you said.

## The feedback

**Ask for it against the list**, question by question, rather than "how did I do?"

**Write it down as they talk.** You will not remember the third point.

**Ask the one question worth asking: "where did you stop being able to follow me?"** That
moment is where the real loss happened, and it is almost never where you think.

**And do not defend anything.** Ask what you should have said instead.

## Then watch the recording

**Uncomfortable, and worth more than the feedback**, because you will see things nobody would
tell you.

**Time the silences.** Anything over twenty seconds is a gap the interviewer had to interpret.

**Count how many times you said what you were doing versus what you were deciding.**

**Find the moment you were stuck** and watch what you actually did in the next ninety seconds.

## Then do it again

**One mock interview is a data point. Three is a trend**, and the trend is the useful thing.

**Fix one thing between each.** Not everything — **one**, chosen from the feedback, because a
single change you actually make beats a list you read once.

**And the one most people should fix first is the silence.**`,
    mcqs: [
      mcq('A mock interview needs another person because:',
        [['The thing being practised is a conversation, which you cannot have alone', true],
          ['A timer alone does not create enough pressure', false],
          ['You cannot choose an unseen problem for yourself', false],
          ['Feedback requires an external perspective', false]],
        'Not yourself with a timer.'),
      mcq('The question that decides real interviews is:',
        [['Would you want to work through a problem with this person', true],
          ['Did they arrive at a correct solution in time', false],
          ['Did they state an approach before coding', false],
          ['How did they handle being stuck', false]],
        'And no practice tool asks it.'),
      mcq('Not pausing when it goes badly matters because:',
        [['That experience is the only part hard to get elsewhere', true],
          ['Pausing makes the timing unrealistic', false],
          ['Interviewers do not offer breaks', false],
          ['It tests whether you can recover under pressure', false]],
        'Forty-five minutes, whatever happens.'),
      mcq('"Where did you stop being able to follow me?" is worth asking because:',
        [['That moment is where the real loss happened, and it is not where you think', true],
          ['It prompts more specific feedback than a general question', false],
          ['It identifies which explanation needs rehearsing', false],
          ['It shows the interviewer you value clarity', false]],
        'Ask against the list, question by question.'),
    ],
    checkpoint: [
      mcq('Watching the recording is worth more than the feedback because:',
        [['You will see things nobody would tell you', true],
          ['It can be reviewed more than once', false],
          ['Feedback is filtered by politeness', false],
          ['It captures the timing precisely', false]],
        'Time the silences; anything over twenty seconds is a gap.'),
      mcq('Three mock interviews rather than one gives you:',
        [['A trend, which is the useful thing', true],
          ['Exposure to a wider range of problems', false],
          ['Feedback from more than one perspective', false],
          ['Enough practice for the protocol to become automatic', false]],
        'One is a data point.'),
      mcq('Fixing one thing between each mock rather than everything:',
        [['Works because a single change you make beats a list you read', true],
          ['Keeps the comparison between sessions valid', false],
          ['Avoids overloading the next rehearsal', false],
          ['Is realistic given how little time there is between sessions', false]],
        'And for most people the first one is the silence.'),
    ],
  },

  /* ══ T3_SYSTEM_DESIGN ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_SYSTEM_DESIGN_THE_SHAPE_OF_THE_ANSWER',
    notes: `**Requirements, scale, the boxes, the data, then the trade-offs. In that order** —
because the alternative is drawing boxes at random, which is what most candidates do and what
the question is designed to expose.

## The order, and why each step is where it is

**1. Requirements, three minutes.** What does it do? For whom? What must it not do?

**Functional:** post a message, read a feed, search.

**Non-functional:** how fast, how available, how consistent. **Ask which matters most** —
"is it more important that a post appears instantly or that it never disappears?" is the
question that shapes everything after it.

**And what is out of scope**, agreed with the interviewer, because a design question is
unbounded and you have forty minutes.

**2. Scale, five minutes.** Users, requests per second, storage, growth. **Rough numbers, out
loud.** The next unit is entirely about this.

**3. The boxes, ten minutes.** The high-level shape. Client, gateway, services, storage,
queue. **Five or six boxes.** Not twenty.

**4. The data, ten minutes.** What is stored, in what shape, and what the main queries are.
**This is the part candidates skip and interviewers care most about**, because the data model
is where the real constraints live and where a design is most often quietly impossible.

**5. Trade-offs, ten minutes.** Where it breaks, what you would do about it, what you chose
and why.

## Why this order specifically

**Each step constrains the next.**

**The requirements tell you which numbers matter.** The numbers rule out designs. **The design
determines the data model. The data model surfaces the trade-offs.**

**Reverse any two and you are guessing** — which is exactly what drawing boxes before
estimating is.

## What to say while drawing

**"I am starting with the simplest thing that works, then I will find where it breaks."**

**That sentence is the single best thing to say in a system design interview**, because it is
how real design is done and it gives the conversation a direction. A monolith and a database
is a legitimate starting point and a much better one than a diagram with a queue in it for no
stated reason.

**Then break it deliberately:** "at ten thousand writes a second this database is the
bottleneck, so here is what I would change."

## What loses marks

**Naming technologies without reasons.** "I would use Kafka" — for what property?

**Designing for a scale nobody asked about.** Ten million users when they said ten thousand
is not ambition; it is not listening.

**Skipping the data model.**

**Ignoring failure.** What happens when a component is down?

**And no trade-offs.** **A design presented as having no downsides is a design that has not
been thought about**, and the interviewer will find one in ten seconds.

## Managing the clock

**Watch it.** Forty minutes goes quickly and candidates routinely spend twenty-five on the
boxes.

**If you are running out, say what you would cover with more time.** Naming the section you
did not reach is worth something; running out silently is worth nothing.`,
    mcqs: [
      mcq('The order matters because:',
        [['Each step constrains the next, so reversing any two means guessing', true],
          ['It matches how interviewers score the answer', false],
          ['It ensures every section gets enough time', false],
          ['Requirements are easiest to establish first', false]],
        'The numbers rule out designs; the design determines the data model.'),
      mcq('The part candidates skip that interviewers care most about is:',
        [['The data model, where the real constraints live', true],
          ['The scale estimate that rules designs out', false],
          ['The failure behaviour of each component', false],
          ['The non-functional requirements', false]],
        'Where a design is most often quietly impossible.'),
      mcq('The single best thing to say in a system design interview is:',
        [['"I am starting with the simplest thing that works, then finding where it breaks"', true],
          ['"Let me clarify the requirements before I begin"', false],
          ['"I would like to estimate the scale first"', false],
          ['"There are several approaches with different trade-offs"', false]],
        'It is how real design is done and it gives the conversation direction.'),
      mcq('Designing for ten million users when they said ten thousand is:',
        [['Not ambition but not listening', true],
          ['Sensible headroom for future growth', false],
          ['A reasonable demonstration of scaling knowledge', false],
          ['Acceptable if the simpler design is mentioned', false]],
        'The requirements tell you which numbers matter.'),
    ],
    checkpoint: [
      mcq('A monolith and a database as a starting point is:',
        [['Legitimate, and better than a queue with no stated reason', true],
          ['Too simple for a system design interview', false],
          ['Acceptable only for genuinely low-scale requirements', false],
          ['A way of deferring the real design work', false]],
        'Then break it deliberately.'),
      mcq('A design presented as having no downsides:',
        [['Has not been thought about, and the interviewer will find one in ten seconds', true],
          ['Suggests the requirements were too narrow', false],
          ['Is quite acceptable provided every single choice has been justified', false],
          ['Indicates the candidate is confident in it', false]],
        'Trade-offs are the last ten minutes for a reason.'),
      mcq('Running out of time is better handled by:',
        [['Naming the section you did not reach', true],
          ['Speeding up through the remaining sections', false],
          ['Skipping the trade-offs to finish the design', false],
          ['Asking the interviewer which part to prioritise', false]],
        'Running out silently is worth nothing.'),
    ],
  },

  {
    unitCode: 'T3_SYSTEM_DESIGN_ESTIMATING',
    notes: `**Users, requests and storage — rough numbers that rule designs out early.** Five
minutes of arithmetic that changes what you build.

## Why estimate at all

**Because the answer is different at different scales**, and without a number you are
designing for an imagined one.

**A thousand requests a second and ten is not the same system.** Ten terabytes and ten
gigabytes is not the same storage decision.

**And because ruling things out is faster than choosing.** "That is a hundred gigabytes, which
fits on one machine" ends a whole branch of the conversation in one sentence.

## The numbers worth knowing

**Seconds in a day: about ninety thousand.** Round it to a hundred thousand and the arithmetic
gets much easier — **precision is not the point and the interviewer knows it.**

**A million requests a day is about twelve a second.** Useful anchor.

**One machine handles thousands of simple requests a second.**

**A row of typical data: about a kilobyte.** So a million rows is a gigabyte.

**A disk is terabytes; memory is tens of gigabytes.** So "does it fit in memory" is usually
answerable immediately.

## The method

**Start with users.** "Ten million registered, ten percent daily active, so a million."

**Then actions per user per day.** "Each posts twice and reads fifty times."

**Then convert to per second.** Divide by a hundred thousand.

**Then apply a peak factor.** Traffic is not flat; **peak is a few times the average**, and
designing for the average is designing for a system that falls over every lunchtime.

**Then storage.** Rows per day times bytes per row times days retained.

**Say every number out loud, and say it is an estimate.** "Call it a million daily actives —
I am rounding for the arithmetic."

## What the numbers tell you

**Does it fit on one machine?** If yes, say so, and stop designing a distributed system. **The
most valuable single conclusion available from this exercise**, and the one candidates most
often skip past on their way to something more impressive.

**Is it read-heavy or write-heavy?** A hundred reads per write means caching; the reverse
means the write path is the design.

**Does the data fit in memory?** Changes everything.

**And is the peak survivable?** If not, you need queueing, shedding, or more machines — and
now you can say which and why.

## Getting it wrong

**Being out by ten does not matter.** Being out by ten thousand does.

**Sanity-check against something you know.** If your estimate says a small application needs
a thousand machines, you have made an arithmetic error, and **saying "that cannot be right,
let me check" is a good look rather than a bad one.**

**And state your assumptions.** They are what the interviewer will challenge, and a challenged
assumption you stated is a conversation while an unstated one is a mistake.`,
    mcqs: [
      mcq('Rounding ninety thousand seconds to a hundred thousand is fine because:',
        [['Precision is not the point and the interviewer knows it', true],
          ['The error is within the peak factor anyway', false],
          ['It biases the estimate conservatively', false],
          ['Exact figures are rarely available in practice', false]],
        'The arithmetic gets much easier.'),
      mcq('The most valuable single conclusion from estimating is:',
        [['Whether it fits on one machine', true],
          ['Whether the workload is read-heavy or write-heavy', false],
          ['Whether the data fits in memory', false],
          ['Whether the peak load is survivable', false]],
        'And candidates most often skip past it on the way to something more impressive.'),
      mcq('Designing for the average rather than the peak produces:',
        [['A system that falls over every lunchtime', true],
          ['An under-provisioned system that scales up slowly', false],
          ['A cost-efficient design with occasional latency', false],
          ['A design that is correct for most of the day', false]],
        'Peak is a few times the average.'),
      mcq('An estimate saying a small application needs a thousand machines means:',
        [['You made an arithmetic error, and saying so is a good look', true],
          ['The requirements were misunderstood', false],
          ['The peak factor was applied twice', false],
          ['The design needs to be reconsidered from scratch', false]],
        'Sanity-check against something you know.'),
    ],
    checkpoint: [
      mcq('A hundred reads per write suggests:',
        [['Caching, where the reverse would make the write path the design', true],
          ['A read replica rather than a cache', false],
          ['That the data model should probably be denormalised further', false],
          ['That consistency can be relaxed on reads', false]],
        'What the numbers tell you.'),
      mcq('Stating your assumptions matters because:',
        [['A challenged assumption you stated is a conversation, not a mistake', true],
          ['It shows the estimate was reasoned rather than simply guessed', false],
          ['The interviewer can correct the numbers early', false],
          ['It documents the basis of the design', false]],
        'They are what the interviewer will challenge.'),
      mcq('A million requests a day is roughly:',
        [['Twelve a second', true],
          ['A hundred and twenty a second', false],
          ['A hundred a second', false],
          ['One a second', false]],
        'A useful anchor: divide by a hundred thousand.'),
    ],
  },

  {
    unitCode: 'T3_SYSTEM_DESIGN_DEFENDING_TRADEOFFS',
    notes: `**There is no right answer. There is an answer you can justify** — and that is not
a consolation, it is literally what is being assessed.

## What the interviewer is doing when they push

**Not telling you that you are wrong.**

**Testing whether you know why you chose it**, which is a different question from whether it
is the best choice.

**Seeing whether you fold.** A candidate who abandons a reasonable position at the first
question is one who will not defend a design in a real meeting.

**And seeing whether you dig in when wrong**, which is worse.

**They will push on a good answer and a bad one identically**, so the push itself tells you
nothing about whether you were right.

## The shape of a defence

**The choice. The alternative. The reason. The cost.**

> "I put a queue between the API and the processing because the processing takes seconds and
> the request cannot wait. The alternative is doing it synchronously, which is simpler and
> needs no extra infrastructure, and would be fine if processing were fast. The cost of the
> queue is that the user does not get an immediate result, so I need somewhere to show them
> the status, and I have one more thing to operate and monitor."

**Four sentences. The fourth is the one most candidates omit** and the one that shows you
understand what you did.

## When they suggest an alternative

**Take it seriously for three seconds.** Genuinely.

**If it is better, say so.** "That is better — it removes the queue entirely and I had not
considered that the processing could be batched."

**Conceding correctly is a strong signal**, and it is the same move the review unit taught
from the other side.

**If it is not better for this problem, say why.** "That would work, and it trades consistency
for latency, which the requirement we agreed says we cannot do."

**And if you are not sure, say that.** "I do not know which is better here. It depends on
whether reads or writes dominate, and if the ratio is above about ten to one I would go your
way."

## The trade-offs worth knowing by name

**Consistency against availability**, when the network partitions.

**Latency against durability.** Acknowledge before or after it is safely written.

**Read performance against write performance.** Indexes, denormalisation, caching.

**Simplicity against scale.** Almost always worth taking simplicity until the numbers say
otherwise.

**Cost against everything.** Rarely raised by candidates and always real.

## The sentence to avoid

**"It depends."**

**True, and useless on its own.** Say what it depends on, and then pick one. **"It depends on
whether we can tolerate a minute of staleness — assuming we can, I would cache"** is the same
thought, and it is an answer.`,
    mcqs: [
      mcq('When the interviewer pushes on your choice they are:',
        [['Testing whether you know why you chose it, not saying it is wrong', true],
          ['Signalling that a better option exists', false],
          ['Checking how you respond to disagreement', false],
          ['Steering you towards the expected answer', false]],
        'They push on a good answer and a bad one identically.'),
      mcq('The sentence most candidates omit from a defence is:',
        [['The cost of the choice they made', true],
          ['The alternative they rejected', false],
          ['The reason behind the choice', false],
          ['The requirement it satisfies', false]],
        'And it is the one that shows you understand what you did.'),
      mcq('Conceding when the suggested alternative is better:',
        [['Is a strong signal, and the same move the review unit taught', true],
          ['Risks appearing to lack conviction', false],
          ['Should be delayed until you have tested the idea', false],
          ['Is expected when the interviewer is more senior', false]],
        'Take it seriously for three seconds, genuinely.'),
      mcq('"It depends" on its own is:',
        [['True and useless — say what it depends on, then pick one', true],
          ['A reasonable answer when the requirements are vague', false],
          ['Better than committing to the wrong option', false],
          ['Acceptable if followed by a request for constraints', false]],
        '"Assuming we can tolerate a minute of staleness, I would cache."'),
    ],
    checkpoint: [
      mcq('Abandoning a reasonable position at the first question suggests:',
        [['You would not defend a design in a real meeting', true],
          ['You are open to better ideas', false],
          ['You were not confident in the original choice', false],
          ['The reasoning was not fully worked through', false]],
        'And digging in when wrong is worse.'),
      mcq('Simplicity against scale should usually be resolved by:',
        [['Taking simplicity until the numbers say otherwise', true],
          ['Designing for the scale you expect in a year', false],
          ['Choosing whichever the requirements emphasise', false],
          ['Building the simple version behind an abstraction', false]],
        'Almost always, until the numbers say otherwise.'),
      mcq('Saying "I do not know which is better here" works when:',
        [['You follow it with what it depends on and where your threshold is', true],
          ['The two options are genuinely equivalent', false],
          ['You have already justified two other choices', false],
          ['The interviewer has already suggested a better alternative', false]],
        '"Above about ten to one I would go your way."'),
    ],
  },

  {
    unitCode: 'T3_SYSTEM_DESIGN_DESIGN_PRACTICE',
    notes: `Three systems, sketched and defended under time.

**The two exercises are the arithmetic and the ordering** — the mechanical parts, which are
the parts that go wrong under pressure. **The systems themselves are in the assignment**,
because a design cannot be marked by a test runner.`,
    coding: [
      {
        title: 'The back of the envelope',
        description: `Read four numbers on one line: \`<registered> <daily_active_percent>
<actions_per_user_per_day> <bytes_per_action>\`.

Using **one hundred thousand seconds in a day** and a **peak factor of three**, print:

    daily_active=<n>
    actions_per_day=<n>
    average_per_second=<n>
    peak_per_second=<n>
    daily_bytes=<n>

All five as integers, using integer division at each step in the order above — **each line is
computed from the line before it**, which is how you would do it out loud and keeps the
numbers consistent with what you said.`,
        starter: `import sys

reg, pct, per_user, size = [int(x) for x in sys.stdin.read().split()]

# Each line is computed from the line before it.
`,
        language: 'python',
        tests: [
          { input: '10000000 10 50 1000\n', expectedOutput: 'daily_active=1000000\nactions_per_day=50000000\naverage_per_second=500\npeak_per_second=1500\ndaily_bytes=50000000000' },
          { input: '1000 100 1 100\n', expectedOutput: 'daily_active=1000\nactions_per_day=1000\naverage_per_second=0\npeak_per_second=0\ndaily_bytes=100000' },
          { input: '100000 50 20 500\n', expectedOutput: 'daily_active=50000\nactions_per_day=1000000\naverage_per_second=10\npeak_per_second=30\ndaily_bytes=500000000' },
          { input: '0 10 10 10\n', expectedOutput: 'daily_active=0\nactions_per_day=0\naverage_per_second=0\npeak_per_second=0\ndaily_bytes=0' },
          { input: '5000000 20 8 250\n', expectedOutput: 'daily_active=1000000\nactions_per_day=8000000\naverage_per_second=80\npeak_per_second=240\ndaily_bytes=2000000000', isHidden: true },
        ],
      },
      {
        title: 'The order of the answer',
        description: `Read the sections a candidate covered, one per line, in the order they
covered them: \`requirements\`, \`scale\`, \`boxes\`, \`data\`, \`tradeoffs\`.

The correct order is exactly that. Print, for each section as you read it:

- in the right position → \`<section> ok\`
- covered earlier than it should be → \`<section> EARLY\`

Then \`missing=<the sections never covered, in correct order, space separated, or none>\`.

A section is \`EARLY\` when any section that should precede it has not yet appeared.
**Estimating before requirements is the characteristic mistake**, because you then estimate a
system nobody specified.`,
        starter: `import sys

ORDER = ['requirements', 'scale', 'boxes', 'data', 'tradeoffs']
rows = [l.strip() for l in sys.stdin if l.strip()]

# A section is early when something that should precede it has not appeared.
`,
        language: 'python',
        tests: [
          { input: 'requirements\nscale\nboxes\ndata\ntradeoffs\n', expectedOutput: 'requirements ok\nscale ok\nboxes ok\ndata ok\ntradeoffs ok\nmissing=none' },
          { input: 'scale\nrequirements\n', expectedOutput: 'scale EARLY\nrequirements ok\nmissing=boxes data tradeoffs' },
          { input: 'requirements\nboxes\n', expectedOutput: 'requirements ok\nboxes EARLY\nmissing=scale data tradeoffs' },
          { input: 'requirements\nscale\nboxes\n', expectedOutput: 'requirements ok\nscale ok\nboxes ok\nmissing=data tradeoffs' },
          { input: 'tradeoffs\nrequirements\nscale\nboxes\ndata\n', expectedOutput: 'tradeoffs EARLY\nrequirements ok\nscale ok\nboxes ok\ndata ok\nmissing=none', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'System Design Practice',
      description: 'Estimate, order the answer, then design and defend three systems under time.',
      instructions: `Complete both exercises, then:

1. For the first: each line is computed from the line before. Say what would change if you
   computed each from the raw inputs instead, and why the chosen way is better in an
   interview.
2. For the second: estimating before requirements is the characteristic mistake. Say what
   goes wrong concretely.
3. For the second: give a case where covering trade-offs early is genuinely useful despite
   the rule.

**Then design three systems, forty minutes each, out loud, on paper or a whiteboard.**

Suggested: **a URL shortener**, **a food delivery order flow**, and **a notification service**.

For each:

4. **Three minutes on requirements**, functional and non-functional, with what is out of
   scope. Write down which non-functional matters most.
5. **Five minutes estimating.** Users, actions, per second, peak, storage. Out loud, rounded.
6. **Say what the numbers rule out.** Especially: does it fit on one machine?
7. **Ten minutes on the boxes.** Start with the simplest thing that works. Five or six boxes.
8. **Ten minutes on the data.** What is stored, in what shape, what the main queries are.
9. **Ten minutes on trade-offs.** Where it breaks first, what you would change, and the cost
   of each choice you made.

**Then, for each:**

10. Write the four-sentence defence of your most significant choice: choice, alternative,
    reason, cost.
11. **Have somebody push on one decision**, or write the strongest objection yourself and
    answer it.
12. Say honestly whether you changed your mind, and why.

**Finally**, across all three: which section did you consistently run short on, and what will
you do about it?`,
      rubric: [
        { criterion: 'Estimates computed correctly', description: 'All cases, chained line by line as specified.', maxPoints: 15 },
        { criterion: 'Section order judged', description: 'All cases, including early sections and the missing list.', maxPoints: 15 },
        { criterion: 'Three designs, timed by section', description: 'Forty minutes each, with the section budget respected.', maxPoints: 25 },
        { criterion: 'Estimates that rule things out', description: 'Numbers out loud, with a stated conclusion including the one-machine question.', maxPoints: 15 },
        { criterion: 'Data models present', description: 'Storage shape and main queries for each of the three.', maxPoints: 15 },
        { criterion: 'Defences and a challenge', description: 'Four-sentence defence each, one objection answered, honest about changing your mind.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

reg, pct, per_user, size = [int(x) for x in sys.stdin.read().split()]
`,
        tests: [
          { input: '10000000 10 50 1000\n', expectedOutput: 'daily_active=1000000\nactions_per_day=50000000\naverage_per_second=500\npeak_per_second=1500\ndaily_bytes=50000000000' },
          { input: '1000 100 1 100\n', expectedOutput: 'daily_active=1000\nactions_per_day=1000\naverage_per_second=0\npeak_per_second=0\ndaily_bytes=100000' },
          { input: '100000 50 20 500\n', expectedOutput: 'daily_active=50000\nactions_per_day=1000000\naverage_per_second=10\npeak_per_second=30\ndaily_bytes=500000000' },
          { input: '0 10 10 10\n', expectedOutput: 'daily_active=0\nactions_per_day=0\naverage_per_second=0\npeak_per_second=0\ndaily_bytes=0' },
          { input: '5000000 20 8 250\n', expectedOutput: 'daily_active=1000000\nactions_per_day=8000000\naverage_per_second=80\npeak_per_second=240\ndaily_bytes=2000000000', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Chaining each line from the previous one rather than the raw inputs:',
        [['Keeps the numbers consistent with what you said out loud', true],
          ['Avoids accumulating floating point error at each step', false],
          ['Produces a more accurate final figure', false],
          ['Is faster to compute mentally', false]],
        'Which is how you would do it in an interview.'),
      mcq('Estimating before requirements goes wrong because:',
        [['You estimate a system nobody specified', true],
          ['The numbers cannot be sanity-checked yet', false],
          ['It uses time the requirements section needs', false],
          ['The interviewer has not agreed the scope', false]],
        'The characteristic mistake.'),
      mcq('Covering trade-offs early is genuinely useful when:',
        [['A requirement makes one trade-off decisive before any design exists', true],
          ['The interviewer asks about them directly', false],
          ['You are confident about the overall shape', false],
          ['The system is simple enough that it can be designed quickly', false]],
        'For example a hard consistency requirement.'),
    ],
  },

  /* ══ T3_TECH_WRITING ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TECH_WRITING_WRITING_FOR_ENGINEERS',
    notes: `**Short, specific, and answering the question they actually have.**

## Who you are writing for

**Somebody busy**, reading between two other things.

**Somebody who will skim.** They will read the first line and the headings and decide whether
to read the rest.

**Somebody with a specific question**, which may not be the one you find interesting.

**And somebody who will act on it or not** — **which is the only measure of whether the
writing worked.** Not whether it was thorough.

## The rules

**Answer first.** The conclusion goes at the top, then the reasoning. **The opposite of how
you worked it out, and the opposite of how most people write it** — a narrative building to a
conclusion is right for a story and wrong for a colleague on a Tuesday.

> "The export times out for customers with more than about five thousand orders. It is a
> missing index; the fix is one migration. Details below."

**Be specific.** Not "it is slow" but "it takes fourteen seconds for a customer with five
thousand orders".

**Numbers, names, versions.** "It broke" is a feeling; "it returns 500 for any order created
before March" is information.

**Short sentences and short paragraphs.** Three lines maximum. **A wall of text does not get
read**, whatever is in it.

**Headings**, so they can find the part they need.

**And say what you want.** "Can you review this?" "I am going to do X unless you object by
Friday." **A message with no ask produces no action**, and then you wonder why nobody
replied.

## What to cut

**The history.** Nobody needs what you tried in week one.

**Hedging.** "I think maybe it might be possible that" — say it or do not.

**Apologies for length**, which are always attached to something too long. Shorten it instead.

**And anything they already know.** Context for somebody who has none is noise for somebody
who does — **so say who the piece is for at the top and write for them.**

## Formatting that helps

**A list where there is a list.** Prose describing five things is worse than five bullets.

**Code in a code block**, with the relevant part only.

**Bold for the sentence that matters**, once or twice. Not for emphasis everywhere, which
stops working immediately.

**And a short summary at the top of anything over a page.**

## The test

**Could they act on this without replying to ask you something?**

**If not, what is missing is the thing to add** — and it is usually the ask, the specific
number, or what you want them to do.

**Read it once as them**, out loud if it is important. **Every unclear sentence is one you
will have to explain in a reply**, which costs you more than the rewrite would have.`,
    mcqs: [
      mcq('The only measure of whether technical writing worked is:',
        [['Whether they acted on it', true],
          ['Whether it was thorough and accurate', false],
          ['Whether it was read to the end', false],
          ['Whether it answered the question asked', false]],
        'Not whether it was thorough.'),
      mcq('Putting the conclusion at the top is:',
        [['The opposite of how you worked it out and how most people write it', true],
          ['A convention specific to incident reports', false],
          ['Useful when the reasoning is long', false],
          ['A way of signalling confidence in the finding', false]],
        'A narrative building to a conclusion is right for a story.'),
      mcq('A message with no ask:',
        [['Produces no action, and then you wonder why nobody replied', true],
          ['Invites the reader to decide what to do', false],
          ['Is appropriate for purely informational updates', false],
          ['Gets a reply asking what you want', false]],
        'Say what you want them to do, explicitly.'),
      mcq('Context for somebody who has none is:',
        [['Noise for somebody who does, so say who it is for at the top', true],
          ['Worth including for the wider audience', false],
          ['Best placed in an appendix', false],
          ['Necessary for the piece to stand alone', false]],
        'Write for the named reader.'),
    ],
    checkpoint: [
      mcq('An apology for length is always attached to:',
        [['Something too long, which should be shortened instead', true],
          ['A piece covering more than one topic', false],
          ['Writing that lacks a summary at the very top', false],
          ['A message to somebody more senior', false]],
        'Cut it and shorten the piece.'),
      mcq('Every unclear sentence is:',
        [['One you will have to explain in a reply, costing more than the rewrite', true],
          ['A place where the reader will make an assumption of their own', false],
          ['A sign the piece needs more context', false],
          ['Likely to be skimmed past anyway', false]],
        'Read it once as them.'),
      mcq('Bold used for emphasis everywhere:',
        [['Stops working immediately', true],
          ['Makes the piece harder to skim', false],
          ['Should be replaced by headings', false],
          ['Is acceptable in short messages', false]],
        'Once or twice, for the sentence that matters.'),
    ],
  },

  {
    unitCode: 'T3_TECH_WRITING_A_DESIGN_NOTE',
    notes: `**The problem, the options, the choice and the consequences — on one page.**

## What it is for

**Getting disagreement before you build**, which is when disagreement is cheap.

**A design note that produces no comments has failed**, and it has usually failed by being
too long, too late, or too certain.

## The shape

**Problem.** Two or three sentences. What is wrong or missing, and who it affects. **Somebody
who does not know the context should understand why this is worth doing.**

**Constraints.** What you cannot change. Time, existing systems, team size, a deadline.
**Include the unglamorous ones** — the documentation unit made the point that "we have two
weeks and one engineer" is a real constraint and pretending otherwise misleads.

**Options.** Two or three, each with a paragraph. **A note with one option is not a design
note, it is an announcement**, and it will be treated as one.

**For each option:** how it works, roughly; what it costs; what it makes easy later; what it
makes hard.

**Recommendation.** Which one, and why. **Be definite** — "I recommend option two" reads as
somebody who has thought about it, and "these all have merits" reads as somebody who has not.

**Consequences.** What this commits us to. What we give up. **What we would have to undo if
we were wrong**, which is the sentence reviewers find most useful and writers most often
leave out.

**Open questions.** The two or three you genuinely do not know. Named, so people answer them
rather than assuming you have.

## One page

**Genuinely one page.**

**If it does not fit, the design is not thought through enough to compress**, which is a
finding in itself.

**Anything longer goes in an appendix** that people can read if they want.

## Getting it reviewed

**Send it to two or three people**, not a channel where it is nobody's job.

**Ask a specific question.** "Is option two going to be a problem for the reporting side?"
gets an answer; "thoughts?" gets nothing.

**Give a deadline.** "I am going to start on Thursday with option two unless somebody
objects." **This gets more responses than any amount of politeness**, because it makes
silence into a decision.

**And be ready to change your recommendation**, which is the entire point of writing it
first.

## After the decision

**Update it with what was decided**, and why, if it changed.

**Then it becomes the decision record** — the same document, promoted, which is the cheapest
way to end up with decision records at all.`,
    mcqs: [
      mcq('A design note that produces no comments:',
        [['Has failed, usually by being too long, too late, or too certain', true],
          ['Has probably been understood and accepted', false],
          ['Should be followed up with direct requests', false],
          ['Suggests the design was uncontroversial', false]],
        'The point is getting disagreement while it is cheap.'),
      mcq('A note with one option is:',
        [['An announcement, and it will be treated as one', true],
          ['Acceptable when the choice is obvious', false],
          ['Shorter and therefore more likely to be read', false],
          ['Appropriate once the team has agreed the direction', false]],
        'Two or three, each with a paragraph.'),
      mcq('The sentence reviewers find most useful and writers most often omit is:',
        [['What we would have to undo if we were wrong', true],
          ['Which option is recommended and why', false],
          ['What the constraints actually were', false],
          ['What the problem costs if left unsolved', false]],
        'Part of the consequences section.'),
      mcq('"I am starting on Thursday unless somebody objects":',
        [['Gets more responses than any amount of politeness', true],
          ['Risks appearing to have decided already', false],
          ['Is appropriate only for low-risk changes', false],
          ['Should be softened when writing to seniors', false]],
        'It makes silence into a decision.'),
    ],
    checkpoint: [
      mcq('A design note that does not fit on one page indicates:',
        [['The design is not thought through enough to compress', true],
          ['The problem is genuinely complex', false],
          ['An appendix is needed for the detail', false],
          ['The options will need to be narrowed down first', false]],
        'Which is a finding in itself.'),
      mcq('"These all have merits" as a recommendation reads as:',
        [['Somebody who has not thought about it', true],
          ['Appropriate neutrality before a group decision', false],
          ['An invitation for the team to choose', false],
          ['Reasonable when the options are close', false]],
        'Be definite about which one, and say why.'),
      mcq('Updating the note after the decision:',
        [['Turns it into the decision record, which is the cheapest way to have any', true],
          ['Keeps the document accurate for anybody who reads it much later', false],
          ['Is required before the work can start', false],
          ['Closes the open questions section', false]],
        'The same document, promoted.'),
    ],
  },

  {
    unitCode: 'T3_TECH_WRITING_ASKING_A_GOOD_QUESTION',
    notes: `**Symptom, what you ruled out, and a clear ask. The difference between an hour and
a week.**

## Why this unit exists

**A badly asked question gets no answer, or the wrong one, or one that arrives on Thursday.**

**A well asked question gets answered between two other things**, by somebody who was not
going to stop what they were doing.

**And you will ask thousands of them.** The compounding on this skill is larger than on almost
anything else in the module.

## The shape

**What you are trying to do.** One sentence. **Not the problem — the goal**, because the
answer is often "do not do that".

**What you did.** The command, the code, the configuration. Exactly.

**What happened.** The actual output or error, in full, in a code block. **Not your summary of
it** — your summary has already thrown away the part that identifies the problem, because you
did not know which part that was.

**What you expected.**

**What you have already tried.** Three things, and what each did. **This is the part that
turns "have you tried restarting it" into a real answer**, and it is the part most people skip
because it feels like admitting how long they have been stuck.

**And the ask.** "Has anybody seen this?" "Am I misunderstanding how X works?" "Who owns this
service?"

## Why "what you ruled out" matters most

**It stops the first three replies being things you have done.**

**It shows you spent your own time first**, which is what makes people willing to spend
theirs.

**And it frequently answers the question while you are writing it** — which is common enough
to be worth writing the message even when you do not send it, and is the real reason people
recommend the rubber duck.

## What makes a question unanswerable

**"It does not work."**

**A screenshot of a terminal** instead of text somebody can search.

**No error message**, because you thought it was not relevant.

**A summary of the error** rather than the error.

**No context about what you are actually trying to achieve.**

**And a question that requires the reader to have your entire situation in their head.**

## Where to ask, and when

**Try for a bounded time first.** Twenty minutes for something small, an hour for something
large. **Then ask.**

**Sitting stuck for a day to avoid looking stuck costs the team far more than the question
would have**, and every senior engineer will say the same thing.

**Ask in public** where you can — a channel rather than a direct message — because the answer
helps whoever searches for it next, and because somebody who is not the person you would have
asked often knows.

**And when it is answered, say what worked.** For the next person, who will find the thread.`,
    mcqs: [
      mcq('The first sentence should state:',
        [['The goal, not the problem, because the answer is often "do not do that"', true],
          ['The error message you are seeing', false],
          ['What you have already tried', false],
          ['Which component the problem is in', false]],
        'What you are trying to do.'),
      mcq('Your summary of an error rather than the error:',
        [['Has already thrown away the part that identifies the problem', true],
          ['Is harder for the reader to search for', false],
          ['Omits the stack trace, which is usually needed', false],
          ['Suggests you did not read it carefully', false]],
        'Because you did not know which part that was.'),
      mcq('Listing what you ruled out:',
        [['Turns "have you tried restarting it" into a real answer', true],
          ['Shows the problem is genuinely difficult', false],
          ['Narrows the possible causes for the reader', false],
          ['Demonstrates a systematic approach', false]],
        'And most people skip it because it feels like admitting how long they were stuck.'),
      mcq('Writing the question frequently answers it, which is:',
        [['The real reason people recommend the rubber duck', true],
          ['A sign the question was not worth asking', false],
          ['A reason to draft questions before asking', false],
          ['Common only for simple problems', false]],
        'Worth writing even when you do not send it.'),
    ],
    checkpoint: [
      mcq('Sitting stuck for a day to avoid looking stuck:',
        [['Costs the team far more than the question would have', true],
          ['Is reasonable for a problem you should be able to solve', false],
          ['Shows persistence that seniors value', false],
          ['Is a fair trade against interrupting somebody', false]],
        'Every senior engineer will say the same thing.'),
      mcq('Asking in a channel rather than a direct message:',
        [['Helps whoever searches for it next, and reaches people you would not have asked', true],
          ['Spreads the interruption across more people', false],
          ['Gets a faster answer on average', false],
          ['Is generally more appropriate for questions that are not especially urgent', false]],
        'And somebody who is not your first choice often knows.'),
      mcq('A screenshot of a terminal is a problem because:',
        [['It is not text somebody can search', true],
          ['It may be hard to read at that resolution', false],
          ['It includes irrelevant surrounding output', false],
          ['It cannot be quoted in a reply', false]],
        'Paste the text in a code block.'),
    ],
  },

  /* ══ T3_PRESENTING ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_PRESENTING_EXPLAINING_ARCHITECTURE',
    notes: `**To somebody who has not seen it, at the level they need, without the whole
history.**

## Find out who you are talking to first

**One question, before you start:** "How familiar are you with this area?"

**It takes five seconds and it changes everything you say afterwards** — and almost nobody
asks it, which is why so many explanations are pitched at the wrong level for the whole of
their length.

**A new colleague** needs the shape and where things live.

**A senior engineer** needs the decisions and the trade-offs.

**A manager** needs what it does, what it costs and what is risky.

**And somebody debugging at 3am** needs the failure paths and nothing else at all.

## The order

**Start with what it does**, in one sentence, in domain language. Not components — purpose.

**Then the shape.** Three to five boxes. "A web app, a service, a database, and a worker for
the slow things."

**Then the flow.** Follow one request all the way through. **This is the part that makes it
click**, because a static diagram is a list and a traced request is a story.

**Then the interesting part.** Every system has one thing that is not obvious. Get to it —
it is why they are listening.

**Then the failure modes**, if they need them.

## Pitching it

**Domain words before technical ones.** "When somebody places an order" before "when a POST
hits the orders endpoint".

**One level at a time.** Do not drop into a method signature while describing the system.

**Signpost the depth changes.** "Zooming into the payment part for a moment."

**And stop for questions.** A monologue longer than three minutes has lost somebody, and you
will not know which part.

## The diagram

**Draw it while you talk.** Live beats prepared, because they see it being built and the
order of construction carries meaning that a finished picture does not.

**Five boxes. Arrows with labels.** Nothing else.

**And leave it up** while you talk about it.

## What to leave out

**The history.** "It used to be X" is a different conversation.

**Every component.** They cannot hold twenty.

**The technology list**, unless it matters to what you are saying.

**And your opinions about it**, at least at first — **the person who opens with "it is a bit
of a mess" has told them how to feel before they know what it is.**

## Checking it landed

**Ask them to say it back.** "Does that make sense?" gets a yes from everybody. **"What would
you check first if the orders stopped appearing?" tells you whether it landed**, and it takes
one question.`,
    mcqs: [
      mcq('The question almost nobody asks before explaining is:',
        [['How familiar are you with this area', true],
          ['What do you need to be able to do afterwards', false],
          ['How much time do we have for this', false],
          ['Have you seen the diagram before', false]],
        'Five seconds, and it changes everything you say.'),
      mcq('Tracing one request through the system:',
        [['Makes it click, because a diagram is a list and a traced request is a story', true],
          ['Covers the components in a logical order', false],
          ['Shows where the latency accumulates', false],
          ['Is the clearest way to present the boxes', false]],
        'After what it does, and the shape.'),
      mcq('Drawing the diagram live rather than showing a prepared one:',
        [['Lets the order of construction carry meaning a finished picture cannot', true],
          ['Keeps the audience engaged while you talk', false],
          ['Allows you to adapt it to their questions', false],
          ['Avoids the diagram being out of date', false]],
        'Five boxes, labelled arrows, nothing else.'),
      mcq('Opening with "it is a bit of a mess":',
        [['Tells them how to feel before they know what it is', true],
          ['Sets honest expectations about the codebase', false],
          ['Invites them to suggest improvements', false],
          ['Is acceptable with colleagues you know well', false]],
        'Leave your opinions out, at least at first.'),
    ],
    checkpoint: [
      mcq('Somebody debugging at 3am needs:',
        [['The failure paths and nothing else at all', true],
          ['The shape and where each component lives', false],
          ['The decisions and their trade-offs', false],
          ['A traced request through the system', false]],
        'Pitch it to who is listening.'),
      mcq('Asking whether it made sense is a poor check because:',
        [['It gets a yes from everybody', true],
          ['It invites a judgement of your explanation', false],
          ['It comes too late to change the approach', false],
          ['It does not identify which part was unclear', false]],
        '"What would you check first if the orders stopped?" tells you.'),
      mcq('A monologue longer than three minutes:',
        [['Has lost somebody, and you will not know which part', true],
          ['Exceeds most listeners’ attention span', false],
          ['Suggests the explanation was far too detailed', false],
          ['Should be broken up with a diagram', false]],
        'Stop for questions before you have lost them.'),
    ],
  },

  {
    unitCode: 'T3_PRESENTING_PRESENTING_A_PROJECT',
    notes: `**What it does, what was hard, what you would change. In under ten minutes.**

## The ten minutes

**One: what it does and who for.** Plain words. Not the technology.

**Two: show it working.** Live.

**Three: how it is built.** The shape, the data model, the interesting decision.

**Two: what was hard.** What you tried, what worked, what you learned.

**One: what you would do next.** Specific.

**One spare.**

**The proportions are the point.** Most presentations spend six minutes on what it does and
thirty seconds on what was hard, **and they have it exactly backwards** — because what it does
is visible in the demonstration and what was hard is the only part that tells anybody anything
about you.

## The hard part, in detail

**This is the section that distinguishes presentations.**

**Name the problem specifically.** "Two users could book the same slot if their requests
arrived within the same few milliseconds."

**Say what you tried first**, and why it did not work. **A failed first attempt is not a
weakness to hide; it is the evidence that the problem was real.**

**Say what worked**, and why.

**And say what you would still improve about it.**

**Three minutes on one real problem is worth more than ten on a feature tour**, and it is the
part people ask follow-up questions about — which is what you want, because questions are a
conversation and a tour is a broadcast.

## Handling questions

**Listen to the whole question.** The instinct is to start answering at the halfway point.

**"That is a good question, I do not know" is an acceptable answer** and much better than an
invented one, which will be noticed.

**If you do not understand it, ask.** "Do you mean X?"

**Keep answers short.** Thirty seconds, then stop. **A long answer to a short question reads
as covering something.**

**And when somebody suggests a better way: "that would be better, and here is what I was
weighing"** — the same move as everywhere else in this year.

## The failure modes

**Running over**, because the demonstration was not rehearsed.

**Apologising**, which starts it badly.

**Reading slides.** They can read.

**Being defensive.** A question is a question.

**And no point.** If somebody cannot say afterwards what the project was for, the first minute
failed and nothing after it recovered.

## Rehearsing

**Out loud, timed, once, minimum.**

**With the demonstration**, because that is where the time goes.

**To one person who has not seen it**, ideally, and ask them afterwards what it does. **If
they cannot say it in one sentence, fix the first minute** — which is the cheapest and most
commonly needed fix in this unit.`,
    mcqs: [
      mcq('Most presentations have the proportions backwards because:',
        [['What it does is visible in the demonstration and what was hard is not', true],
          ['Audiences prefer to hear about the technical problems', false],
          ['The features take longer to describe than to show', false],
          ['The hard part is harder to explain concisely', false]],
        'Two minutes on what was hard, not thirty seconds.'),
      mcq('A failed first attempt is:',
        [['The evidence that the problem was real, not a weakness to hide', true],
          ['Worth mentioning only if the final solution built on it', false],
          ['Better left out of a short presentation', false],
          ['Useful for showing persistence', false]],
        'Say what you tried and why it did not work.'),
      mcq('Three minutes on one real problem is worth more than ten on a feature tour because:',
        [['It is the part people ask follow-up questions about', true],
          ['Features can be listed more efficiently', false],
          ['It demonstrates technical depth', false],
          ['Tours are harder to keep to time', false]],
        'Questions are a conversation and a tour is a broadcast.'),
      mcq('A long answer to a short question:',
        [['Reads as covering something', true],
          ['Shows thoroughness in the thinking', false],
          ['Uses time that could go to other questions', false],
          ['Suggests the question was misunderstood', false]],
        'Thirty seconds, then stop.'),
    ],
    checkpoint: [
      mcq('The cheapest and most commonly needed fix in this unit is:',
        [['The first minute, when a listener cannot say what it does', true],
          ['The demonstration, when it runs over time', false],
          ['The hard part, when it is too general', false],
          ['The question handling, when the answers run long', false]],
        'Ask one person afterwards what it does.'),
      mcq('"I do not know" as an answer is:',
        [['Acceptable, and much better than an invented answer that will be noticed', true],
          ['Best followed up with your own guess at what the answer probably is', false],
          ['Acceptable once but damaging if repeated', false],
          ['Better phrased as needing to check', false]],
        'Listen to the whole question first.'),
      mcq('If nobody can say afterwards what the project was for:',
        [['The first minute failed and nothing after it recovered', true],
          ['The demonstration did not show the main flow', false],
          ['The presentation was pitched at the wrong level', false],
          ['The hard part overshadowed the purpose', false]],
        'Plain words, not the technology.'),
    ],
  },
];
