/**
 * T3_AI_ASSISTED, T3_PROJECT and T3_CAPSTONE — thirteen units. S19 and S20.
 *
 * ── WHAT THESE THREE TOPICS ARE FOR ───────────────────────────────────────────────────────
 *
 * S19 is four units and no practice or project, deliberately. An assistant is a tool the
 * student already uses; what they lack is the judgement to tell a fluent answer from a
 * correct one, and that is taught by argument and by review, not by an exercise in which the
 * assistant is absent.
 *
 * The line the whole topic turns on is NEVER_SHIP_WHAT_YOU_CANNOT_EXPLAIN. Everything else
 * is support for it.
 *
 * S20 is the production project and the capstone. They are not the same thing and the
 * difference matters: the project is the first time the student takes something from a vague
 * idea to a URL a stranger can open, and the capstone is the one piece of work the rest of
 * the year is evidence for.
 *
 * CHOOSING_SOMETHING_WORTH_BUILDING is the unit that decides whether either of them gets
 * finished, and it is the one students skip.
 *
 * Attribution: AI_ASSISTED defaults to AI_ASSISTED_CODING with the review unit on
 * CODE_REVIEW. PROJECT defaults to PRODUCTION_ENGINEERING with DESIGNING_IT on
 * SOFTWARE_ARCHITECTURE. CAPSTONE defaults to PRODUCTION_ENGINEERING with the review on
 * TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const AI_PROJECT_BUNDLES: PilotBundle[] = [
  /* ══ T3_AI_ASSISTED ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_AI_ASSISTED_WHAT_IT_IS_GOOD_AT',
    notes: `You already use one. **This topic is not about whether to — it is about knowing
where the tool is strong, where it is weak, and which of those you are currently in.**

## Where it is genuinely strong

**Explaining code you did not write.** Paste an unfamiliar function and ask what it does.
**Fast, usually right, and it saves the twenty minutes you would spend reading around it** —
and the evolving-code unit said finding is most of the work.

**Boilerplate.** A configuration file, a data class, the shape of a test, a migration. Work
that has one obvious form and no decisions in it.

**A first draft of a test suite.** It will produce the obvious cases quickly, which leaves
you the interesting ones.

**Translation.** Between languages, between formats, from a description to a regular
expression.

**Reminding you of something you know.** The argument order, the flag, the method name.

**And a rubber duck that answers.** Describing a problem to it is worth something even when
the answer is wrong.

## Where it is weak

**Anything that needs context it does not have.** Your codebase's conventions, the reason a
thing is the way it is, the constraint nobody wrote down.

**Decisions with a trade-off.** It will give you an answer with confidence and no sense of
what it costs you, because **it does not know what you are optimising for and will not ask.**

**Recent or unusual libraries.** It will confidently use an API that was removed, or one that
never existed.

**Anything where being subtly wrong is expensive.** Security, money, concurrency, data
migration. **Not because it is worse there — because you are less likely to notice.**

**And the last twenty percent.** It gets you to something that nearly works remarkably fast,
and the remaining part is often harder than it would have been if you had started yourself.

## The shape of good use

**Ask it to explain before you ask it to write.**

**Give it the context it needs**: the surrounding code, the constraint, what you already
tried.

**Ask for the approach before the code.** An approach you can judge in ten seconds; three
hundred lines you cannot.

**Use it for the boring half** and do the interesting half yourself, which is also the half
you are being paid for.

**And check everything**, which is the next three units.

## The thing to be careful about

**It makes you feel productive in a way that is not perfectly correlated with being
productive.**

Code appearing on screen is satisfying. **Code you did not understand appearing on screen is
a liability you have not noticed yet**, and the feeling is identical.

**The only defence is a habit**, and the habit is in the fourth unit of this topic.`,
    mcqs: [
      mcq('An assistant is weakest where being subtly wrong is expensive because:',
        [['You are less likely to notice, not because it performs worse there', true],
          ['Those areas involve more specialised knowledge', false],
          ['Security and concurrency are underrepresented in training', false],
          ['The correct answer depends heavily on the codebase', false]],
        'Security, money, concurrency, data migration.'),
      mcq('It gives confident answers to trade-off decisions because:',
        [['It does not know what you are optimising for and will not ask', true],
          ['Trade-offs are rarely stated explicitly in the question', false],
          ['Most trade-offs have a conventional default answer', false],
          ['It weighs the options but does not show the working', false]],
        'An answer with confidence and no sense of what it costs you.'),
      mcq('Asking for the approach before the code is better because:',
        [['An approach you can judge in ten seconds; three hundred lines you cannot', true],
          ['The approach is more likely to be correct than the code', false],
          ['It gives you a chance to add missing context', false],
          ['Generating all the code twice wastes time if the approach is wrong', false]],
        'Judge the cheap artefact.'),
      mcq('The last twenty percent is a weakness because:',
        [['It is often harder than if you had started yourself', true],
          ['The assistant loses context over a long session', false],
          ['Nearly-working code is harder to test', false],
          ['The remaining work is usually the least interesting', false]],
        'It gets you to something that nearly works remarkably fast.'),
    ],
    checkpoint: [
      mcq('Code you did not understand appearing on screen is:',
        [['A liability you have not noticed yet, and it feels identical to progress', true],
          ['Acceptable if the tests covering it pass', false],
          ['A reason to ask for a simpler implementation', false],
          ['Normal when working in an unfamiliar language', false]],
        'The feeling of productivity is not perfectly correlated with productivity.'),
      mcq('The strongest everyday use is:',
        [['Explaining code you did not write, which saves the reading-around time', true],
          ['Generating a first draft of an implementation', false],
          ['Producing configuration and boilerplate files', false],
          ['Translating between languages and formats', false]],
        'The evolving-code unit said finding is most of the work.'),
      mcq('An assistant confidently using an API that never existed is:',
        [['A characteristic failure with recent or unusual libraries', true],
          ['A sign the question lacked enough context', false],
          ['Rare enough to catch during normal testing', false],
          ['Avoidable by naming the library version', false]],
        'Or one that was removed.'),
    ],
  },

  {
    unitCode: 'T3_AI_ASSISTED_REVIEWING_GENERATED_CODE',
    notes: `**The same review you would give a colleague, applied to a very confident one who
never pushes back and has no stake in the outcome.**

## Why this is harder than reviewing a person

**It reads well.** The naming is sensible, the structure is conventional, the comments are
present. **Fluency is the thing you use as a proxy for competence in a colleague, and here
that proxy is broken.**

**There is no author to ask.** You cannot find out what they were thinking, because there
was no thinking of the kind you mean.

**It never says "I am not sure".** A colleague hedges on the part they are least confident
about, and that hedge is information you rely on more than you realise.

**And you asked for it**, which makes you inclined to accept it. **Reviewing something you
requested is harder than reviewing something you were sent.**

## The order, unchanged

**Correctness first.** Does it do the thing, for empty, huge, missing and hostile input?

**Then design.** Is it in the right place? Does it match how this codebase does things?

**Then tests.** Does the test actually test it, or does it assert what the code does?

**Then readability.**

**The order from the review unit applies exactly**, and the fact that the author is a tool
changes nothing about it.

## What to look for specifically

**Invented APIs.** A method that does not exist, a parameter that was removed. **Run it.**

**Plausible but wrong logic.** An off-by-one, a condition inverted, an edge case handled in a
way that looks deliberate and is not.

**Silently swallowed errors.** A try block with an empty catch, which generated code produces
more often than people do.

**Missing validation.** It will do what you asked and not the checks you did not mention.

**Security.** It will concatenate a query if the surrounding style suggests it. **It matches
patterns, including your bad ones.**

**And unnecessary generality.** An abstraction for a case you do not have, which is expensive
to remove once it is in.

## Tests, particularly

**Generated tests often assert what the code does rather than what it should do.**

If both were generated from the same description, **they agree with each other and neither
agrees with reality** — which is a suite that will never go red for the right reason.

**The check is the same one:** break the code and see whether the test fails.

## The standard

**Would you approve this from a colleague?**

If not, do not merge it because the alternative is writing it yourself.

**And the harder question: could you defend every line in a review?** That is the next unit
but one, and it is the line that keeps the tool useful rather than dangerous.`,
    mcqs: [
      mcq('Reviewing generated code is harder than reviewing a person’s because:',
        [['Fluency is your proxy for competence, and here that proxy is broken', true],
          ['There is more of it to read in a given session', false],
          ['The conventions often differ from the surrounding codebase', false],
          ['Generated code contains subtler defects on average', false]],
        'It reads well: sensible naming, conventional structure, comments present.'),
      mcq('A colleague hedging on the part they are least sure about:',
        [['Is information you rely on more than you realise', true],
          ['Slows the review by requiring extra discussion', false],
          ['Indicates where the tests should be concentrated', false],
          ['Is a courtesy rather than a signal', false]],
        'An assistant never says "I am not sure".'),
      mcq('An assistant will concatenate a query when:',
        [['The surrounding style suggests it, because it matches patterns', true],
          ['The request did not happen to mention parameterisation', false],
          ['The query involves a dynamic identifier', false],
          ['The codebase has no query builder available', false]],
        'Including your bad patterns.'),
      mcq('Tests and code generated from the same description:',
        [['Agree with each other and neither agrees with reality', true],
          ['Cover the described behaviour thoroughly', false],
          ['Are equivalent to writing the tests first yourself', false],
          ['Need only a review of the assertions', false]],
        'A suite that will never go red for the right reason.'),
    ],
    checkpoint: [
      mcq('Reviewing something you requested is:',
        [['Harder than reviewing something you were sent', true],
          ['Easier, because you know what it should do', false],
          ['The same, provided you apply the usual order', false],
          ['Faster, because the context is already in mind', false]],
        'You are inclined to accept it.'),
      mcq('An empty catch block is worth looking for because:',
        [['Generated code produces them more often than people do', true],
          ['They are hard to spot in a large diff', false],
          ['They indicate the error case was not understood', false],
          ['They are forbidden by most style guides', false]],
        'Silently swallowed errors.'),
      mcq('The standard to apply is:',
        [['Would you approve this from a colleague', true],
          ['Does it pass the tests that came with it', false],
          ['Is it better than what you would have written', false],
          ['Does it match the conventions of the codebase', false]],
        'Not merging it because the alternative is writing it yourself.'),
    ],
  },

  {
    unitCode: 'T3_AI_ASSISTED_CONFIDENT_AND_WRONG',
    notes: `**Fluency is not correctness**, and an assistant is fluent by construction. This
unit is about the specific shapes a confident wrong answer takes, so you recognise them
before you have spent an hour on one.

## The shapes

**The invented API.** A method with exactly the right name for what you asked, that does not
exist. **The most common and the easiest to catch, because it fails immediately.**

**The deprecated API.** Worse, because it runs, with a warning you did not read, and it will
be removed.

**The subtly wrong boundary.** \`<=\` where you needed \`<\`. Correct-looking, tested by a
generated test that makes the same mistake.

**The plausible algorithm that is wrong for your data.** Correct in general, wrong for
duplicates, or for empty, or for the one shape your data actually has.

**The confident wrong explanation.** You ask why something happens; you get a clear, coherent
answer that is not the reason. **This is the most dangerous one, because you will remember it
as a fact and repeat it later.**

**And the answer to a different question.** Fluent, well-structured, and about something
adjacent to what you asked.

## Why you do not notice

**It reads like the answer.** Your brain checks for the shape of an answer and this has it.

**It is confident.** Hedging is the signal you use to trigger checking, and there is none.

**It is detailed.** Detail feels like evidence.

**And it agrees with you.** Ask a leading question and you will get your own assumption back,
more confidently phrased — **which is the mechanism behind most of the hours lost to this.**

## How to catch it

**Run it.** The single highest-value check, and the one skipped most often for small things.
Small things are where these hide.

**Check the API exists**, in the documentation, at the version you use.

**Ask it the opposite question.** "Why would this not work?" **A model that gives you a
confident answer to both is one whose confidence means nothing**, and finding that out takes
one minute.

**Test the boundary yourself.** Empty, one, two, the maximum.

**And check the explanation against something that cannot be fluent** — the source, the
documentation, an experiment.

## The rule of thumb

**The more confidently it answers a question you could not answer yourself, the more you
should check it.**

That inverts the instinct, which is to accept most readily exactly where you are least able
to judge. **Being aware of the inversion is most of the defence**, because you cannot make
yourself an expert on demand but you can notice that you are not one.`,
    mcqs: [
      mcq('The most dangerous shape of a wrong answer is:',
        [['The confident wrong explanation, because you will repeat it later as a fact', true],
          ['The invented API, which costs time to discover', false],
          ['The subtly wrong boundary, which tests may miss', false],
          ['The deprecated API, which keeps running right up until it does not', false]],
        'Clear, coherent, and not the reason.'),
      mcq('Asking a leading question gets you:',
        [['Your own assumption back, more confidently phrased', true],
          ['A narrower answer than an open question would', false],
          ['A reasonable answer, since the context is clearer', false],
          ['An answer biased towards the common case', false]],
        'The mechanism behind most of the hours lost to this.'),
      mcq('Asking "why would this not work?" is useful because:',
        [['A confident answer to both questions means the confidence means nothing', true],
          ['It surfaces edge cases the first answer omitted', false],
          ['Negative framing produces more careful reasoning', false],
          ['It reveals the assumptions sitting behind the very first answer', false]],
        'And it takes one minute to find out.'),
      mcq('The rule of thumb inverts the instinct because:',
        [['You accept most readily exactly where you are least able to judge', true],
          ['Confident answers are wrong more often than hedged ones', false],
          ['Hard questions produce longer and less accurate answers', false],
          ['Familiar topics are easier to verify quickly', false]],
        'Noticing the inversion is most of the defence.'),
    ],
    checkpoint: [
      mcq('A deprecated API is worse than an invented one because:',
        [['It runs, with a warning you did not read, and will be removed', true],
          ['It is harder to find in the documentation', false],
          ['It produces subtly different behaviour', false],
          ['It suggests the model is working from old training data', false]],
        'The invented one fails immediately.'),
      mcq('Small things are skipped for running because:',
        [['They seem too small to be worth it, and that is where these hide', true],
          ['Running them requires setting up a test harness', false],
          ['The cost of being wrong is low for small changes', false],
          ['Small snippets are easier to verify by reading', false]],
        'Running it is the single highest-value check.'),
      mcq('Detail in a wrong answer:',
        [['Feels like evidence, which is why it is persuasive', true],
          ['Usually indicates the answer is mostly right', false],
          ['Makes the error easier to locate', false],
          ['Is a sign the question was well specified', false]],
        'Your brain checks for the shape of an answer.'),
    ],
  },

  {
    unitCode: 'T3_AI_ASSISTED_NEVER_SHIP_WHAT_YOU_CANNOT_EXPLAIN',
    notes: `**This is the line the whole topic turns on.** The other three units are support
for it.

## The rule

**If you cannot explain every line of a change you are about to ship, you are not ready to
ship it.**

Not "explain roughly what it does". **Explain why it is that line**: why that condition, why
that order, why that default, what happens if the input is empty.

**The source does not matter.** This rule applies to code an assistant wrote, code you copied
from an answer online, code you inherited and are moving, and code you wrote yourself at two
in the morning.

## Why it is the right line

**Because you own it.** Your name is on the change, you are on the team, and you will be the
one asked about it in six months.

**Because the review is not a safety net.** A reviewer reads it for twenty minutes; you have
had it for two hours. **If you do not understand it, they will not either**, and it will be
approved anyway.

**Because you cannot debug what you do not understand.** At 3am the code does not explain
itself, and the assistant was not there when it failed.

**And because the alternative is a codebase nobody understands**, accumulating, in a team
where everybody assumes somebody else knows why.

## What to do when you cannot explain it

**Ask it to explain.** Then check the explanation independently, because the explanation can
be confidently wrong in exactly the way the code was.

**Simplify it.** If the clever version is beyond you today, the obvious version is better —
and it will be better for whoever reads it too.

**Write it yourself**, using the generated version as a reference.

**Or leave it out.** A change you do not understand is not worth the risk of the thing it
does.

## The two-minute test

**Before you open the pull request, walk the diff and say out loud, for each hunk, why it is
there.**

**Anything you hesitate on is the thing to look at.** Not the complicated part — **the part
you skimmed**, which is the part you have not actually read.

**This takes two minutes and it catches a surprising amount**, because the act of having to
say it aloud is what surfaces the gap.

## What this does not mean

**It does not mean do not use the tool.** It means the tool produces a draft and you are the
engineer.

**It does not mean understand the library's internals.** You do not write those and you are
not shipping them.

**It means the change you are submitting is a change you could have written**, given time,
and could defend without help.

**That is the whole standard, and it is the same standard that applied before any of these
tools existed.**`,
    mcqs: [
      mcq('The rule applies to:',
        [['Any code you are shipping, whatever its source', true],
          ['Generated code specifically, given its risks', false],
          ['Code in areas you are not familiar with', false],
          ['Changes above a certain size or complexity', false]],
        'Generated, copied, inherited, or written at two in the morning.'),
      mcq('The review is not a safety net because:',
        [['If you do not understand it after two hours, a reviewer will not in twenty minutes', true],
          ['Reviewers generally focus on the overall design rather than on correctness', false],
          ['Generated code passes review more easily', false],
          ['Reviewers assume the author understood it', false]],
        'And it will be approved anyway.'),
      mcq('When you cannot explain the clever version:',
        [['The obvious version is better, for you and for the next reader', true],
          ['Ask for an explanation and then ship it once satisfied', false],
          ['Add a comment describing what it does', false],
          ['Cover it with tests until you are confident', false]],
        'Or write it yourself, or leave it out.'),
      mcq('In the two-minute test, the hunk to look at is:',
        [['The part you skimmed, not the complicated part', true],
          ['The largest change in the diff', false],
          ['The part the assistant generated most of', false],
          ['Whichever touches the most files', false]],
        'The part you skimmed is the part you have not read.'),
    ],
    checkpoint: [
      mcq('Asking the assistant to explain its own output requires:',
        [['Checking the explanation independently, since it can be confidently wrong too', true],
          ['Asking in a fresh session to avoid anchoring', false],
          ['Comparing it against the tests that were generated', false],
          ['Accepting it once it is internally consistent', false]],
        'Wrong in exactly the way the code was.'),
      mcq('The standard this unit sets is that the change:',
        [['Is one you could have written, given time, and could defend without help', true],
          ['Is one you have read carefully before submitting', false],
          ['Is covered by tests you understand', false],
          ['Uses only constructs already present in the codebase', false]],
        'The same standard that applied before these tools existed.'),
      mcq('Saying why each hunk is there out loud works because:',
        [['The act of saying it aloud is what surfaces the gap', true],
          ['It slows you down enough to read properly', false],
          ['It produces a description usable in the pull request', false],
          ['It forces a second pass over the whole diff', false]],
        'Two minutes, and it catches a surprising amount.'),
    ],
  },

  /* ══ T3_PROJECT ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_PROJECT_CHOOSING_SOMETHING_WORTH_BUILDING',
    notes: `**This is the unit that decides whether the project gets finished, and it is the
one students skip** — because choosing feels like not working yet.

## The three tests

**Will you finish it?** Nothing else matters if the answer is no. **An unfinished ambitious
project is worth less than a finished modest one**, in a portfolio and in every conversation
about it, and this is the single most reliable prediction anybody can make about a student
project.

**Does it solve a real problem?** Yours, or somebody's you can ask. **A problem you actually
have gives you requirements you can check against without inventing them**, and it gives you
something to say when asked why you built it.

**Can you show it in two minutes?** If it takes ten minutes of setup before anything is
visible, nobody will see it. **A reviewer has ninety seconds**, which the portfolio topic
covers at length.

## What makes a good choice

**Small enough to finish in the time you have**, with a third of that time left over, because
you will need it.

**Boring in its subject and solid in its execution.** A well-built task tracker beats a
half-built distributed system, **and the person assessing it has seen a hundred of both.**

**Something with a visible surface.** A screen, an output, something that happens.

**Something you can deploy.** If it needs a cluster to run, a stranger will not open it.

**And something with one genuinely hard part** that you chose deliberately — the thing you
will talk about. **Without that it is a tutorial; with it, it is engineering.**

## What makes a bad choice

**A clone of something large.** You will build ten percent of it and it will be judged against
the whole.

**Something that needs data you do not have.** A recommendation engine with no users.

**Something that depends on an API you have not tried.** Try it first, in twenty minutes,
before the choice is made.

**Something you are not interested in**, which is not a small thing over several weeks.

**And anything where the interesting part is the part you cannot build.**

## Deciding, in an hour

**Write down five ideas.**

**For each: can I finish it, does it solve something real, can I show it in two minutes?**

**Then for the best two, spend twenty minutes each** — the API tried, the library checked,
the hard part identified. **Twenty minutes now against a week wasted later is the best trade
available in this whole module.**

**Then choose, and write down why**, so that when it is difficult in week two you know what
you were doing.

## The one-sentence test

**"It lets [somebody] [do something] without [the annoying thing they do now]."**

If you cannot fill that in, the project does not have a point yet, **and a project without a
point is very hard to finish** because nothing tells you when to stop.`,
    mcqs: [
      mcq('The most reliable prediction about a student project is:',
        [['An unfinished ambitious one is worth less than a finished modest one', true],
          ['The scope will grow beyond the original plan', false],
          ['The interesting part will end up taking the longest to build', false],
          ['Deployment will be left until the end', false]],
        'Nothing else matters if you will not finish it.'),
      mcq('A problem you actually have is valuable because:',
        [['It gives you requirements you can check without inventing them', true],
          ['It keeps you motivated through the more difficult weeks', false],
          ['It makes the project unique among applicants', false],
          ['It means the users are available for feedback', false]],
        'And something to say when asked why you built it.'),
      mcq('A well-built task tracker beats a half-built distributed system because:',
        [['The person assessing it has seen a hundred of both', true],
          ['Simpler systems are easier to explain in an interview', false],
          ['Distributed systems cannot be demonstrated easily', false],
          ['Execution is weighted more heavily than ambition', false]],
        'Boring in subject, solid in execution.'),
      mcq('Spending twenty minutes on each of your best two ideas is:',
        [['The best trade available in this module, against a week wasted later', true],
          ['A reasonable way to compare them fairly', false],
          ['Necessary to estimate the work involved', false],
          ['Worth doing only when the choice between them is genuinely close', false]],
        'The API tried, the library checked, the hard part identified.'),
    ],
    checkpoint: [
      mcq('One genuinely hard part chosen deliberately is what:',
        [['Makes it engineering rather than a tutorial', true],
          ['Demonstrates the technical level you can reach', false],
          ['Justifies the time the project took', false],
          ['Distinguishes it from other applicants’ projects', false]],
        'It is the thing you will talk about.'),
      mcq('A project with no point is hard to finish because:',
        [['Nothing tells you when to stop', true],
          ['Motivation fades without a user waiting for it', false],
          ['The requirements keep changing as you build', false],
          ['There is no way to judge whether it works', false]],
        '"It lets somebody do something without the annoying thing."'),
      mcq('An API you have not tried should be:',
        [['Tried first, in twenty minutes, before the choice is made', true],
          ['Avoided in favour of one you have used', false],
          ['Wrapped behind an interface you control', false],
          ['Prototyped during the first week of building', false]],
        'Before the choice is made.'),
    ],
  },

  {
    unitCode: 'T3_PROJECT_REQUIREMENTS_AND_SCOPE',
    notes: `**Scope is decided at the start, when you know least. That is the decision that
most often sinks a project**, and knowing it is unavoidable changes how you make it.

## Write the requirements as behaviours

**Not "user management". "A user can sign up with an email and a password, and log in
afterwards."**

**A behaviour is testable and a noun is not**, which is the whole reason to write them this
way. You can tell whether the sentence is true; you cannot tell whether "user management" is
done.

**Fifteen to twenty-five of them** for a project of this size. Fewer and you have not thought
it through; more and you have designed something you will not finish.

## Then rank them

**Must.** Without this there is no project. **Aim for eight to twelve** — if everything is a
must, nothing is.

**Should.** Real value, and the project stands without it.

**Could.** Nice, and the first thing to go.

**Then draw the line.** "I am building the musts and as many shoulds as fit." **Written down,
before week one**, because the line drawn under pressure in week three is drawn badly.

## The out-of-scope list

**Longer than you expect, and each item with a reason.**

> **Not building:** notifications (needs a job runner), teams and sharing (doubles the
> permission model), a mobile app (the web version is responsive), an offline mode (nothing
> about this needs it).

**This is the most useful page in the whole brief**, and the reason is the design unit's: if
you do not say a thing is out, somebody has it in — and on a solo project that somebody is
you, in week two, at eleven at night.

## The estimate, and what to do with it

**Estimate each must in hours.** Add it up.

**Double it.** Not as a joke — **your estimate covers the code and not the debugging, the
deployment, the styling, the thing that does not work on the other machine, or the day you
lose to an environment.**

**If the doubled number does not fit, cut scope now.** Cutting at the start costs nothing;
cutting in week three costs everything you already built.

## Scope during the build

**New ideas will arrive. Most will be good.**

**Write them in a list where you can see them.** The list is not a refusal, it is a queue,
and having somewhere to put an idea is what lets you not build it today.

**And change scope deliberately.** "I am adding this and dropping that" is a decision. Adding
without dropping is how the last week disappears.

## The finished test

**Write down now what "finished" means**, as a list you could tick.

**Deployed. Ten musts working. A README. No secrets in the repository. A stranger can use
it.**

**A project without a written definition of finished does not get finished. It gets
abandoned**, and the difference between those two words is entirely about whether the list
existed.`,
    mcqs: [
      mcq('Requirements are written as behaviours because:',
        [['A behaviour is testable and a noun is not', true],
          ['Behaviours map more directly onto tasks', false],
          ['Nouns hide the dependencies between features', false],
          ['Behaviours are easier to estimate accurately', false]],
        'You cannot tell whether "user management" is done.'),
      mcq('The line between must and should is drawn before week one because:',
        [['A line drawn under pressure in week three is drawn badly', true],
          ['It affects the order the work is done in', false],
          ['The estimate depends on knowing which are musts', false],
          ['It is harder to demote a requirement once built', false]],
        '"The musts, and as many shoulds as fit."'),
      mcq('Doubling the estimate accounts for:',
        [['Debugging, deployment, styling and the day lost to an environment', true],
          ['The natural optimism of a first estimate', false],
          ['Requirements that will get added during the build itself', false],
          ['Time spent learning unfamiliar technology', false]],
        'Your estimate covers the code and nothing else.'),
      mcq('A project without a written definition of finished:',
        [['Gets abandoned rather than finished', true],
          ['Takes longer but usually completes', false],
          ['Ends when the time runs out', false],
          ['Is judged on what was built rather than planned', false]],
        'The difference is entirely about whether the list existed.'),
    ],
    checkpoint: [
      mcq('On a solo project, the person who puts unstated scope back in is:',
        [['You, in week two, at eleven at night', true],
          ['A reviewer expecting a standard feature', false],
          ['A user asking for something obvious', false],
          ['Nobody, since there is no one else involved', false]],
        'Which is why the out-of-scope list is the most useful page.'),
      mcq('Cutting scope at the start rather than in week three:',
        [['Costs nothing, where cutting later costs what you built', true],
          ['Produces a more coherent finished product', false],
          ['Is easier to justify to an assessor', false],
          ['Allows a more accurate estimate of the rest', false]],
        'If the doubled number does not fit, cut now.'),
      mcq('Eight to twelve musts is the target because:',
        [['If everything is a must, nothing is', true],
          ['That is what fits in the available time', false],
          ['More than twelve cannot be tracked easily', false],
          ['It matches the number of behaviours typically needed', false]],
        'Then should, then could, then the line.'),
    ],
  },

  {
    unitCode: 'T3_PROJECT_DESIGNING_IT',
    notes: `**The architecture, the data model, and the decisions worth writing down — before
you build**, because all three are cheap now and expensive in three weeks.

## The one page

**Components**, with a one-line responsibility each.

**The data between them**, with direction.

**Storage**: what is persisted, where, roughly what shape.

**The boundaries**: what is yours and what is somebody else's service.

**Failure paths**: what happens when each arrow does not work.

**And the decision you are least sure about**, named.

**The test is the design unit's: another engineer could build it, make different small
decisions than you would, and the result would still be right.**

## The data model, in more detail

**On a project of this size the data model is the thing most worth getting right**, because
changing it once there is data in it is the most expensive change available to you.

**The entities.** Usually three to six.

**The relationships**, and which side owns each.

**The fields that are required**, and the ones that are genuinely optional.

**The constraints**, at the database — uniqueness, foreign keys, not-null. **The full-stack
track made the argument: the database is the only layer nothing can get past.**

**And one thing to check now: does every screen you sketched get its data from this model
without an awkward query?** If one does not, the model is wrong, and finding that out on
paper costs ten minutes.

## Decisions worth recording

**Three or four, no more.** Each in the shape from the documentation unit: context, decision,
alternatives, consequences.

**Which technology and why.** Including "because I know it", which is a legitimate reason for
a project with a deadline and is much better than a fabricated technical one.

**Where the boundary between parts is.**

**Anything you did the unusual way**, so the next reader — including you in a month — knows
it was deliberate.

## What not to design

**Not every function.** You will be wrong and you will have to rewrite the document.

**Not the styling.**

**Not an abstraction for a case you do not have.** The single most common way a student
project stalls: **two weeks building a flexible framework and no time left for the thing it
was flexible for.**

## Getting it looked at

**Send it to somebody.** Thirty minutes of their time, before you build.

**Ask a specific question** — where the boundary is, whether the data model handles a case
you are unsure about.

**And be ready to change it**, which is the point of doing it on paper while changing it is
free.`,
    mcqs: [
      mcq('The data model is most worth getting right because:',
        [['Changing it once there is data in it is the most expensive change available', true],
          ['Every other component depends on its shape', false],
          ['It determines the queries each screen can make', false],
          ['It is by far the hardest part to change without incurring downtime', false]],
        'On a project of this size.'),
      mcq('Checking each screen gets its data without an awkward query:',
        [['Tells you the model is wrong, on paper, for ten minutes', true],
          ['Identifies which indexes will be needed', false],
          ['Confirms the relationships are correctly directed', false],
          ['Reveals which entities are missing fields', false]],
        'If one does not, the model is wrong.'),
      mcq('"Because I know it" as a technology reason is:',
        [['Legitimate for a project with a deadline, and better than a fabricated one', true],
          ['Acceptable only when there is no better option available at the time', false],
          ['Best replaced by a technical justification', false],
          ['A reason to reconsider the choice', false]],
        'Record it honestly rather than inventing a technical reason.'),
      mcq('The single most common way a student project stalls is:',
        [['Two weeks on a flexible framework and no time for the thing it was for', true],
          ['Choosing technology the student has not used before', false],
          ['Underestimating how much deployment and configuration work there is', false],
          ['Adding features that were not in the original scope', false]],
        'Do not design an abstraction for a case you do not have.'),
    ],
    checkpoint: [
      mcq('Constraints belong at the database because:',
        [['It is the only layer nothing can get past', true],
          ['They are faster to evaluate there', false],
          ['The application cannot express all of them', false],
          ['It keeps validation in a single place', false]],
        'The full-stack track made the same argument.'),
      mcq('Three or four decision records is the limit because:',
        [['More than that stops being read', true],
          ['A project this size has few real decisions', false],
          ['Each one takes significant time to write', false],
          ['The design document already covers the rest', false]],
        'Context, decision, alternatives, consequences.'),
      mcq('The design should be sent for review:',
        [['Before you build, with a specific question attached', true],
          ['Once the data model has been implemented', false],
          ['At the end of the first week of work', false],
          ['Only if you are unsure about the approach', false]],
        'Thirty minutes of their time while changing it is free.'),
    ],
  },

  {
    unitCode: 'T3_PROJECT_BUILDING_IT',
    notes: `Build it, **with a history that shows how it was built** — which is a deliverable
in this project rather than a side effect, because the history is the only evidence anybody
has that you worked the way you say you did.

**The order below front-loads deployment**, which is the most commonly deferred and most
commonly disastrous part of a student project.

Budget around three and a half hours of focused work, over however many sessions it takes.`,
    assignment: {
      title: 'Production Project — Building It',
      description: 'Implement the project with a real Git workflow, real tests and a history that shows the work.',
      instructions: `**Work from your requirements and design.**

**Part one — deploy nothing, first**

1. Create the repository. A README with one sentence saying what this is.
2. **Deploy an empty application**, before any feature. A page saying the name.
3. Set up the pipeline: tests on every push, and a deploy you do not run by hand.
4. **This is the most deferred part of a student project and the most disastrous when
   deferred.** Doing it now costs an hour and saves a weekend.

**Part two — the data**

5. The schema, with constraints at the database.
6. A migration, checked in, that somebody else could run.
7. Seed data for development, so the application is usable on a fresh clone.

**Part three — build the musts**

8. **One branch per requirement**, named after it.
9. Each merged when it works, with its tests.
10. **Commits that are complete thoughts**, with messages saying why. Not "wip" and not "fix".
11. Main line releasable at every commit. Deploy from it regularly — **at least every few
    hours of work, not at the end.**

**Part four — tests that mean something**

12. Tests for the behaviours in your requirements list, named after them.
13. **Break the code five times on purpose** and record whether the suite went red.
14. Write tests for anything it missed.

**Part five — the things that get left out**

15. Every screen handles loading, empty, error and success.
16. Every form validates on the server, not only in the interface.
17. **No secrets in the repository.** Check the whole history, not just the current files.
18. A README a stranger could follow: what it is, how to run it, how to deploy it.

**Part six — the history as a deliverable**

19. Read your own commit log end to end. **Does it show how the project was built?**
20. Count: how many commits, over how many days, how large on average.
21. **Name the commit you are least proud of and say why** — a giant one, a message that says
    nothing, a "fix everything". Everybody has one.

**Submit** the repository, the deployed URL, the mutation record, and the history reflection.`,
      rubric: [
        { criterion: 'Deployed before built', description: 'Empty application deployed and a pipeline running before the first feature.', maxPoints: 15 },
        { criterion: 'Data with constraints and migrations', description: 'Schema constrained at the database, migration checked in, seed data present.', maxPoints: 15 },
        { criterion: 'The musts, on branches, with tests', description: 'One branch per requirement, merged working, main line always releasable.', maxPoints: 25 },
        { criterion: 'Tests that go red', description: 'Named after requirements, five breakages recorded, misses covered.', maxPoints: 15 },
        { criterion: 'The things usually left out', description: 'Four states per screen, server validation, no secrets in history, a usable README.', maxPoints: 15 },
        { criterion: 'A history that shows the work', description: 'Complete-thought commits with why, read back and reflected on honestly.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Deploying an empty application before any feature:',
        [['Costs an hour now and saves a weekend later', true],
          ['Confirms the hosting choice is workable', false],
          ['Allows the pipeline to be tested in isolation', false],
          ['Gives something to show while the work proceeds', false]],
        'The most deferred part of a student project.'),
      mcq('Checking for secrets means checking:',
        [['The whole history, not only the current files', true],
          ['Every configuration file in the repository', false],
          ['The environment variables used in deployment', false],
          ['Any file matched by the ignore rules', false]],
        'A removed secret is still in the history.'),
      mcq('Naming the commit you are least proud of:',
        [['Is asked for because everybody has one', true],
          ['Demonstrates familiarity with your own history', false],
          ['Identifies where the work went wrong', false],
          ['Shows the history was reviewed carefully', false]],
        'A giant one, a message that says nothing, a "fix everything".'),
    ],
  },

  {
    unitCode: 'T3_PROJECT_SHIPPING_IT',
    notes: `**Deployed, configured, and with the secrets kept out of the repository** — so that
a stranger can open a URL and use it without you present.

## Why this is a unit and not a footnote

**A project that runs on your machine is not a project anybody can see.**

**"It works locally" is the single most common state of a student portfolio**, and it is
indistinguishable from not having built it, because nobody will clone it, install its
dependencies, and set up its database to find out.

**The URL is the deliverable.** Everything else supports it.

## Configuration

**Nothing environment-specific in the code.** No URLs, no keys, no hostnames.

**Everything from the environment**, with a checked-in example file listing every variable
and a safe placeholder value.

**Fail loudly at startup** if a required variable is missing. **A missing variable that
produces a mysterious failure on page nine is a bad afternoon**, and a startup check costs
four lines.

## Secrets

**Never in the repository.** Not in the code, not in a config file, not in a commit you later
removed — **the history keeps it, and a public repository means it has been read by a
scanner within minutes.**

**In the platform's secret store**, which every hosting provider has.

**And check the history**, not just the working tree. There are tools for this and they take
one command.

**If you find one, rotate it.** Removing it from the history is not enough; **assume it is
compromised, because it probably is.**

## The database

**A real one, hosted**, not a file that vanishes when the container restarts.

**Migrations run as a deploy step**, not on application start — the full-stack track said why.

**And a backup**, even a manual one, because losing your project's data the week before you
show it is a specific and avoidable misery.

## The domain and the front door

**A URL you can put on a CV.** A subdomain from the platform is fine.

**HTTPS**, which every platform gives you free.

**And a way in that does not require signing up.** A demo account with credentials on the
landing page, or seed data visible without logging in. **A reviewer with ninety seconds will
not create an account**, and the portfolio topic makes this argument at length.

## Verifying it

**Open it on a device that is not yours.** A phone, a friend's laptop, a private window.

**Go through the main flow.** All of it.

**Check it after a restart**, because a deployment that only works until the container
recycles is a deployment that will be broken when somebody looks.

**And check it a week later**, which is when the free tier has slept, the certificate has
expired, or the trial database has been reclaimed. **Almost every abandoned student demo
failed for one of those three reasons**, and all three are visible in one minute if you
look.`,
    mcqs: [
      mcq('"It works locally" is indistinguishable from not having built it because:',
        [['Nobody will clone it, install it and set up its database to find out', true],
          ['Reviewers cannot verify any claim made about local behaviour', false],
          ['Local environments differ too much to be comparable', false],
          ['A repository alone does not show the work', false]],
        'The URL is the deliverable.'),
      mcq('A missing environment variable should:',
        [['Fail loudly at startup, which costs four lines', true],
          ['Fall back to a sensible development default', false],
          ['Be reported the first time it is needed', false],
          ['Be caught by the deployment configuration check', false]],
        'A mysterious failure on page nine is a bad afternoon.'),
      mcq('A secret found in the history must be:',
        [['Rotated, because it should be assumed compromised', true],
          ['Removed from the history with a rewrite', false],
          ['Replaced in the current files and moved to a store', false],
          ['Reported if the repository was ever public', false]],
        'A public repository means a scanner read it within minutes.'),
      mcq('A reviewer with ninety seconds will not:',
        [['Create an account, so provide a demo login or visible seed data', true],
          ['Read the README before opening the demo', false],
          ['Try more than the first screen of the application anyway', false],
          ['Open the repository if the demo works', false]],
        'A way in that does not require signing up.'),
    ],
    checkpoint: [
      mcq('Checking the demo a week later matters because:',
        [['The free tier has slept, the certificate expired, or the database was reclaimed', true],
          ['Usage patterns reveal performance problems', false],
          ['Dependencies may have published breaking updates', false],
          ['The platform may have changed its configuration', false]],
        'Almost every abandoned student demo failed for one of those three.'),
      mcq('The database should be hosted rather than a file because:',
        [['A file vanishes when the container restarts', true],
          ['Hosted databases perform better under load', false],
          ['A file cannot be backed up reliably', false],
          ['Migrations cannot run against a local file', false]],
        'And take a backup, even a manual one.'),
      mcq('Opening the demo on a device that is not yours catches:',
        [['Anything that depended on your machine’s state', true],
          ['Layout problems at different screen sizes', false],
          ['Performance differences between networks', false],
          ['Browser compatibility issues', false]],
        'A phone, a friend’s laptop, a private window.'),
    ],
  },

  {
    unitCode: 'T3_PROJECT_PRESENTING_IT',
    notes: `**Ten minutes, to somebody who has not seen it**, on what it does, how it is built
and why.

## The structure

**One minute: what it does and who for.** In plain words, with the one-sentence version from
the choosing unit. **Not the technology.**

**Two minutes: show it.** The main flow, working, on the deployed URL. **Not a slide of
screenshots** — the live thing, because a live thing is evidence and a screenshot is a claim.

**Three minutes: how it is built.** The shape, not every component. The data model. **Where
the interesting decision was.**

**Two minutes: the hardest part.** What was difficult, what you tried, what worked. **This is
the part people remember**, and it is the part most presentations leave out in favour of more
features.

**One minute: what you would do next**, specifically.

**One minute spare**, because you will run over.

## What to leave out

**The history of the project.** Nobody needs to know what you tried in week one.

**Every feature.** Show three; mention the rest exists.

**The technology list**, unless asked. **"Built with React, Node, Postgres and Docker" tells
a listener nothing they cannot see**, and it spends your first minute on the least
interesting sentence available.

**And the apology.** Do not open with what is unfinished. Mention it at the end, in one line,
if it matters.

## Showing it live

**Have it open before you start.** Loading a page while people watch is a long time.

**Have the data already in it.** An empty application demonstrates nothing.

**Know the path you are going to click.** Rehearse it once.

**And have a recording as a fallback.** Networks fail during presentations at a rate that
cannot be coincidence.

## The questions

**"Why did you build it that way?"** Choice, alternative, reason, cost.

**"What would you change?"** Have two specific answers ready.

**"What was hardest?"** The honest one, and it should match what you said in the
presentation.

**"How does X work?"** Pick any part of your own code — **you should be able to answer for
all of it**, which is the AI topic's rule arriving from another direction.

**"How would it handle a thousand users?"** Not "it would be fine". Name what breaks first.

## Practising it

**Out loud, timed, once.** Not in your head — **the gap between the version in your head and
the version you say is about three minutes**, and it is always longer.

**To somebody who does not know the project**, if you can. They will ask the obvious question
you have stopped being able to see.`,
    mcqs: [
      mcq('Showing the live deployed thing rather than screenshots matters because:',
        [['A live thing is evidence and a screenshot is a claim', true],
          ['Screenshots cannot show the interaction flow', false],
          ['It demonstrates the deployment works', false],
          ['Audiences engage more with live demonstrations', false]],
        'Two minutes on the main flow.'),
      mcq('The part most presentations leave out is:',
        [['The hardest part, in favour of more features', true],
          ['The data model and how it was arrived at', false],
          ['What they would do next, specifically', false],
          ['Who the project is actually for', false]],
        'And it is the part people remember.'),
      mcq('Opening with the technology list:',
        [['Spends your first minute on the least interesting sentence available', true],
          ['Is expected by technical audiences', false],
          ['Establishes your credibility before the demonstration starts', false],
          ['Saves questions about the stack later', false]],
        'It tells a listener nothing they cannot see.'),
      mcq('Practising out loud rather than in your head matters because:',
        [['The gap between the two is about three minutes, always longer', true],
          ['Speaking aloud reveals unclear explanations', false],
          ['It fixes the order of the sections properly in memory', false],
          ['Rehearsal reduces nerves on the day', false]],
        'Out loud, timed, once.'),
    ],
    checkpoint: [
      mcq('Being able to answer "how does X work?" for any part of your code is:',
        [['The AI topic’s rule arriving from another direction', true],
          ['Expected only for the parts you wrote yourself', false],
          ['A matter of remembering the implementation details', false],
          ['Less important than explaining the overall design', false]],
        'Never ship what you cannot explain.'),
      mcq('"How would it handle a thousand users?" should be answered with:',
        [['What breaks first, named specifically', true],
          ['An estimate of the current capacity', false],
          ['The scaling approach you would take', false],
          ['An honest statement that it has not been tested', false]],
        'Not "it would be fine".'),
      mcq('Opening with what is unfinished:',
        [['Should be avoided; mention it at the end in one line', true],
          ['Sets expectations honestly from the start', false],
          ['Is better than being asked about it later', false],
          ['Demonstrates awareness of the project’s limits', false]],
        'Do not open with an apology.'),
    ],
  },

  /* ══ T3_CAPSTONE ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CAPSTONE_CAPSTONE_BRIEF',
    notes: `**The one piece of work the rest of the year is evidence for.** This unit is about
deciding what it has to demonstrate before you decide what it is.

## How the capstone differs from the project

**The project proved you can take something from an idea to a URL.** That is a general skill
and everybody in the year did it.

**The capstone proves you can do that in your direction, at a depth somebody would hire
for.** It is larger, it is specialised, and it is the one you lead with.

**Which means the question is not "what shall I build" but "what do I need this to prove"**,
and building without answering that is how a capstone becomes a bigger version of the
project.

## What it has to prove

**Write three sentences, before choosing the subject.**

> "This proves I can design and build a backend that handles concurrent writes correctly.
> It proves I can make a schema decision and defend it. It proves I can operate something —
> deploy it, watch it, and know when it is unhealthy."

**Then choose something that requires all three.** If your subject does not force you to
demonstrate a thing on the list, either the subject is wrong or the thing is not really on
your list.

## The direction shapes it

**Backend:** concurrency, data integrity, an API somebody else could use, something operable.

**Frontend:** state that stays correct, a genuinely accessible interface, performance you
measured.

**Data:** a pipeline that runs repeatedly, data quality checks, an analysis with a conclusion.

**Mobile:** offline, sync, a release build on a real device.

**Security:** a real assessment with a report somebody acted on, or a tool with honest
limits.

**Full-stack:** the seam — a contract, a change across it, a deploy that does not break an
open tab.

**And whichever it is, one thing that is genuinely hard**, chosen deliberately.

## Size

**Bigger than the project and still finishable.** That is a narrow target.

**A useful test: could a working version exist at the halfway point?** If the answer is no —
if nothing works until everything works — the scope is wrong, **and it is the failure mode
that ends more capstones than difficulty does.**

## What "finished" means here

- [ ] Deployed and reachable by a stranger
- [ ] The hard part actually done, not stubbed
- [ ] Tests, with a catch rate you measured
- [ ] A README that explains the problem before the solution
- [ ] Decision records for the significant choices
- [ ] A history that shows how it was built
- [ ] Something operable: logs, a health check, a way to know it is broken
- [ ] **Something you can explain every line of**

## Write the brief now

**What it proves. What it is. What is out of scope. What done means. Which part is hard.**

**One page, before any code**, because the capstone is the piece of work most likely to
expand until it is unfinishable, and the page is the thing that stops it.`,
    mcqs: [
      mcq('The capstone question is not "what shall I build" but:',
        [['What do I need this to prove', true],
          ['How large can I make it in the time', false],
          ['Which direction does it demonstrate best', false],
          ['What has not been built by others already', false]],
        'Building without answering that makes it a bigger version of the project.'),
      mcq('If your subject does not force you to demonstrate something on your list:',
        [['Either the subject is wrong or the thing is not really on your list', true],
          ['You should add a feature that demonstrates it', false],
          ['The list was probably too ambitious for the time available', false],
          ['It can be covered in the write-up instead', false]],
        'Choose something that requires all three.'),
      mcq('The failure mode that ends more capstones than difficulty is:',
        [['Nothing working until everything works', true],
          ['Choosing a subject outside your direction', false],
          ['Underestimating the deployment effort', false],
          ['Building the hard part last', false]],
        'Could a working version exist at the halfway point?'),
      mcq('The capstone differs from the project in that it proves:',
        [['You can do it in your direction, at a depth somebody would hire for', true],
          ['You can finish a larger piece of work', false],
          ['You can work independently over a longer period', false],
          ['You can apply what the specialisation track actually taught', false]],
        'The project proved a general skill everybody in the year has.'),
    ],
    checkpoint: [
      mcq('The three sentences should be written:',
        [['Before choosing the subject', true],
          ['Once the subject is chosen, to focus it', false],
          ['As part of the README when it is finished', false],
          ['After the design, when the scope is clear', false]],
        'What it proves comes first.'),
      mcq('The done list requires the hard part to be:',
        [['Actually done, not stubbed', true],
          ['Documented even if incomplete', false],
          ['Demonstrated at a reduced scale', false],
          ['Covered by tests whether or not it works', false]],
        'It is the reason the capstone exists.'),
      mcq('The one-page brief exists because the capstone is:',
        [['The piece of work most likely to expand until it is unfinishable', true],
          ['Assessed against a written standard', false],
          ['Built over a longer period than the project', false],
          ['Judged partly on how it was planned', false]],
        'The page is the thing that stops it.'),
    ],
  },

  {
    unitCode: 'T3_CAPSTONE_CAPSTONE_BUILD',
    notes: `Build it, in your direction, and finish it.

**The instruction that matters most: build the hard part early.** The capstone is the piece of
work most likely to end with the interesting part stubbed and the login screen beautiful, and
the only defence is the order.

Budget around four and a half hours of focused work, over however many sessions it takes.`,
    assignment: {
      title: 'Capstone — Building It',
      description: 'The larger piece, in your direction, with the hard part done and the whole thing operable.',
      instructions: `**Work from your capstone brief.**

**Part one — the spine, first**

1. Repository, README with the problem stated, deployed empty application, pipeline running.
2. The data model, with constraints at the database and a checked-in migration.
3. **A thin path all the way through**: one feature, from screen to storage, deployed. Before
   anything else is built.

**Part two — the hard part, second**

4. **Build the thing you said was hard, before the easy features.**
5. If it turns out to be harder than expected, you have time to change the brief. **If you
   build it last, you have a stub and an excuse.**
6. Write down what you tried that did not work. That is presentation material and you will
   not remember it later.

**Part three — the rest**

7. The must requirements, one branch each, merged working with tests.
8. Main line releasable at every commit, deployed regularly.
9. Every screen or endpoint handles its failure cases.

**Part four — make it operable**

10. Structured logs with identifiers and a request id.
11. A health check saying what this instance thinks of itself.
12. **The three-in-the-morning test:** break something, diagnose from logs alone, no debugger.
13. A one-page runbook for the most likely failure.

**Part five — quality you can state**

14. Tests named after your requirements.
15. **Ten deliberate breakages, with the catch rate recorded.**
16. Tests for anything missed, then re-run all ten.

**Part six — the evidence**

17. Decision records for the significant choices: context, decision, alternatives,
    consequences.
18. A README that explains the problem before the solution, with a demo way in that needs no
    sign-up.
19. Your history read end to end. Does it show the work?
20. **Walk your own diff for the whole project and confirm you can explain every line.** Name
    anything you cannot, and fix it or remove it.

**Submit** the repository, the deployed URL, the catch rate, the 3am transcript, the decision
records, and the list from step 20.`,
      rubric: [
        { criterion: 'Spine before features', description: 'Repository, deploy, pipeline and a thin path through, before anything else.', maxPoints: 15 },
        { criterion: 'The hard part, done and early', description: 'Built before the easy features, with the failed attempts recorded.', maxPoints: 25 },
        { criterion: 'The musts, with a real history', description: 'Branches, tests, releasable main line, regular deploys.', maxPoints: 15 },
        { criterion: 'Operable', description: 'Structured logs, health check, 3am test passed, runbook written.', maxPoints: 15 },
        { criterion: 'A measured catch rate', description: 'Ten breakages recorded, misses covered, all ten re-run.', maxPoints: 15 },
        { criterion: 'Evidence and ownership', description: 'Decision records, a problem-first README, and every line explainable.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The hard part is built early because:',
        [['Building it last leaves you a stub and an excuse', true],
          ['It is easier while the codebase is small', false],
          ['The remaining work can then be estimated', false],
          ['It is the part the assessor looks at first', false]],
        'If it is harder than expected, you still have time to change the brief.'),
      mcq('Recording what you tried that did not work:',
        [['Is presentation material you will not remember later', true],
          ['Documents the reasoning for future maintainers', false],
          ['Shows the assessor how much effort went in', false],
          ['Helps avoid repeating the same approach', false]],
        'Write it down as it happens.'),
      mcq('A thin path all the way through, before anything else, ensures:',
        [['A working version exists from very early on', true],
          ['The deployment configuration is correct', false],
          ['The data model is validated against a real use', false],
          ['The pipeline has something to test', false]],
        'Nothing working until everything works is the failure mode.'),
    ],
  },

  {
    unitCode: 'T3_CAPSTONE_CAPSTONE_REVIEW',
    notes: `**Assessed the way an interviewer would** — the code, the decisions and the
explanation — because that is the only assessment whose result predicts anything.

## What is actually being checked

**Does it work?** Opened cold, by somebody who has never seen it, on the deployed URL.

**Is the hard part real?** Or is it a stub with a good name. **This is checked by reading the
code, not by asking**, so there is nothing to be gained by describing it generously.

**Can you explain it?** Any part, picked by them.

**Do the decisions have reasons?** Choice, alternative, reason, cost.

**Does the history show the work?** Or is it three commits on one day.

**And is there anything in it you would be embarrassed by?** A secret, a hardcoded password,
a folder called \`temp\`, a commit message that is a swear word.

## How to prepare

**Open it cold yourself.** Private window, deployed URL, no shortcuts. **Do the thing a
stranger would do.** You will find something, and everybody does.

**Read your own code as a reviewer.** In the diff view, a day after you last touched it.

**Re-read your own README** as somebody who has never seen the project.

**And walk the whole diff** confirming you can explain every line. **The unit that said this
said it about the code you ship; a capstone review is the one place somebody checks.**

## The questions, and what a good answer sounds like

**"Walk me through it."** Two minutes. What it does, the shape, where the hard part is.

**"Why this and not that?"** For at least three decisions.

**"What is the worst code in here?"** **Have an answer.** "This function is too long and I ran
out of time to split it" is a much better answer than "I do not think there is any", which is
not believed and should not be.

**"What breaks first under load?"** Name a component.

**"What would you do with two more weeks?"** Specific, and not more features.

**"What did you learn?"** Something concrete.

## Receiving the feedback

**Write it down as it is given.** You will not remember the third point.

**Do not defend in the room** — ask what they would do instead, which gets you more than an
argument does.

**Separate taste from defect.** "I would have used a different library" is taste. "This
endpoint has no authorisation" is a defect.

**And act on it.** **A capstone review you do not act on is an hour of somebody's time
converted into nothing**, and the acting is what the review was for.

## Afterwards

**Fix the defects within a week**, while it is fresh and before you show it to anybody else.

**Write down the taste items** and decide, once, whether you agree.

**And update the write-up** with anything the questions revealed you had not explained.`,
    mcqs: [
      mcq('Whether the hard part is real is checked by:',
        [['Reading the code, so describing it generously gains nothing', true],
          ['Asking you to explain how it works', false],
          ['Testing the behaviour on the deployed version instead', false],
          ['Looking at the tests written for it', false]],
        'Or is it a stub with a good name.'),
      mcq('"I do not think there is any bad code in here" is:',
        [['Not believed, and should not be', true],
          ['Acceptable if the code has been reviewed', false],
          ['A reasonable answer for a small project', false],
          ['Better than volunteering a weakness', false]],
        '"This function is too long and I ran out of time" is much better.'),
      mcq('Rather than defending in the room, you should:',
        [['Ask what they would do instead, which gets you more than an argument', true],
          ['Note the point down and respond to it in writing afterwards', false],
          ['Explain the constraint that led to the decision', false],
          ['Accept it and decide later whether you agree', false]],
        'Write it all down as it is given.'),
      mcq('A capstone review you do not act on is:',
        [['An hour of somebody’s time converted into nothing', true],
          ['Still useful as a record of how it was received', false],
          ['Worth revisiting before your next project', false],
          ['Acceptable if you disagreed with the feedback', false]],
        'The acting is what the review was for.'),
    ],
    checkpoint: [
      mcq('Opening it cold yourself before the review:',
        [['Finds something, as it does for everybody', true],
          ['Confirms the deployment is still running', false],
          ['Lets you rehearse the demonstration path', false],
          ['Checks the demo credentials still work', false]],
        'Private window, deployed URL, no shortcuts.'),
      mcq('Separating taste from defect means distinguishing:',
        [['"I would have used a different library" from "this has no authorisation"', true],
          ['Feedback about style from feedback about structure', false],
          ['Opinions of the reviewer from the assessment criteria', false],
          ['What must change from what would be nice to change', false]],
        'Fix the defects; decide once about the taste.'),
      mcq('Defects should be fixed:',
        [['Within a week, while it is fresh and before showing anybody else', true],
          ['Before the review feedback is written up', false],
          ['As part of the next round of work on it', false],
          ['Only where they affect what a reviewer would see', false]],
        'And update the write-up with what the questions revealed.'),
    ],
  },
];
