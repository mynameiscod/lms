/**
 * T3_PORTFOLIO, T3_APPLYING, T3_BEHAVIORAL and T3_VERIFICATION — sixteen units.
 * S23, S24 and S25. The last content of Year 3.
 *
 * ── WHAT THESE THREE MODULES ARE FOR ──────────────────────────────────────────────────────
 *
 * The year has produced the work. These modules are about somebody else being able to see
 * it, believe it, and hire on the strength of it — which is a separate skill from producing
 * it and is the one most students never practise at all.
 *
 * NINETY_SECONDS sets the constraint the whole portfolio topic works under, and it is the
 * unit students most resist, because ninety seconds is an insulting amount of time to spend
 * on months of work and it is nonetheless the amount of time it gets.
 *
 * MATCHING_AND_GAPS is the honest centre of S24. Naming your own gap before somebody finds
 * it is the single most credible thing a junior candidate can do, and almost nobody does it.
 *
 * S25 is verification: three checkpoints that measure the year rather than assert it. They
 * carry their protocol in the notes, because the seeder reserves rubric-bearing briefs for
 * PROJECT units and a verification is not one.
 *
 * Attribution: PORTFOLIO defaults to PORTFOLIO_EVIDENCE with the write-up on
 * TECHNICAL_WRITING. APPLYING defaults to INTERNSHIP_READINESS with the job description unit
 * on TECH_CAREER_AWARENESS. BEHAVIORAL defaults to BEHAVIORAL_INTERVIEW with the first weeks
 * on INTERNSHIP_READINESS. VERIFICATION defaults to PRODUCTION_ENGINEERING with the
 * readiness review on TECHNICAL_INTERVIEW_PREP.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CAREER_BUNDLES: PilotBundle[] = [
  /* ══ T3_PORTFOLIO ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_PORTFOLIO_NINETY_SECONDS',
    notes: `**Who reads a portfolio, how long for, and what they are looking for a reason to
do.**

## The reader

**A recruiter or an engineer with a stack of applications**, going through them between other
work.

**Ninety seconds on yours.** Sometimes thirty.

**They are looking for a reason to move you to the next pile**, which is a more useful way to
think about it than "looking for reasons to reject". **You need to give them one thing they
can point at.**

**And they will not clone anything.** Not your repository, not your setup instructions,
nothing that requires a terminal.

## What they actually check, in order

**Does a link work?** A dead link ends it. **Check yours today** — the deployment unit listed
the three reasons student demos die and all three are silent.

**Is there something running?** A URL beats a repository, every time.

**Can they tell what it does in one sentence?** From the top of the page, without scrolling.

**Is there code they can look at?** And does its history look like work rather than like one
upload?

**Is there a README?** And does it start with the problem rather than the install steps.

**And is there anything embarrassing?** A secret, a commit message that is a swear word, a
folder called \`final_final\`.

## Ninety seconds is not an insult

**It is the same ninety seconds everybody gets**, including people with ten years of
experience.

**And it is enough**, if the first thing they see is the right thing. **A working demo, a
one-sentence description and a clean repository is a complete answer in ninety seconds** —
the constraint is not that they cannot judge you in the time, it is that they will judge you
on whatever is in front of them when it runs out.

## Judging your own

**Open it in a private window on a phone.** Start a timer for ninety seconds.

**Do what they would do.** Click the first link. Read the first paragraph. Open one
repository.

**Then stop, and write down what you learned about yourself from that.**

**Almost everybody discovers the same three things:** a link is broken, the first paragraph
says what it is built with rather than what it does, and the best project is third on the
page.

## What to fix first

**Anything broken.**

**Then the first sentence** of the page and of each project.

**Then the order.** **Your best project goes first** and there is no argument for any other
arrangement — not chronology, not variety, not saving the best for last.

**Then remove things.** Three strong projects beat eight, of which five are tutorials. **A
weak project is not neutral; it lowers the average**, and the average is what they take away.

## What they are not checking

**How many projects you have.**

**Whether you used a fashionable framework.**

**How long it took.**

**Or how hard it was for you** — which is real and which they have no way to see, and which
is exactly why the write-up unit exists.`,
    mcqs: [
      mcq('Thinking of the reader as looking for a reason to advance you is:',
        [['More useful than "looking for reasons to reject", and it means giving them one thing', true],
          ['A more optimistic framing of the same process, which does not change anything', false],
          ['Accurate for engineers but not for recruiters', false],
          ['Only true when the applicant pool is small', false]],
        'One thing they can point at.'),
      mcq('The first thing checked is:',
        [['Whether a link works, because a dead link ends it', true],
          ['Whether there is a running demo', false],
          ['What the project does, in one sentence', false],
          ['Whether the repository history looks real', false]],
        'Check yours today — the three ways a demo dies are all silent.'),
      mcq('Ninety seconds is enough because:',
        [['They judge you on whatever is in front of them when it runs out', true],
          ['Most portfolios can be assessed quickly', false],
          ['Experienced candidates get no longer', false],
          ['A genuinely good project is recognisable almost immediately', false]],
        'A working demo, one sentence and a clean repository is a complete answer.'),
      mcq('A weak project in the portfolio:',
        [['Is not neutral — it lowers the average, which is what they take away', true],
          ['Adds breadth at no real cost', false],
          ['Is ignored once a strong one is found', false],
          ['It shows the range of the different things that you have tried', false]],
        'Three strong beat eight of which five are tutorials.'),
    ],
    checkpoint: [
      mcq('Almost everybody who times their own portfolio discovers:',
        [['A broken link, a first paragraph about technology, and the best project third', true],
          ['That the projects take too long to load', false],
          ['That the README file is missing from at least one of the projects listed', false],
          ['That the page does not work on a phone', false]],
        'Ninety seconds, private window, phone.'),
      mcq('Your best project goes first because:',
        [['There is no argument for any other arrangement', true],
          ['Reviewers rarely scroll past the first item', false],
          ['It sets the standard for the rest', false],
          ['Chronological order is hard to judge', false]],
        'Not chronology, not variety, not saving the best for last.'),
      mcq('How hard the work was for you is:',
        [['Real, invisible to them, and exactly why the write-up unit exists', true],
          ['Not relevant to a hiring decision', false],
          ['Inferable from the complexity of the code', false],
          ['Best explained during an interview rather than in writing', false]],
        'They have no way to see it otherwise.'),
    ],
  },

  {
    unitCode: 'T3_PORTFOLIO_THE_REPOSITORY',
    notes: `**A README, a history that shows the work, and no secrets in it.**

## The README

**The first thing anybody opens, and the thing most repositories get wrong** by starting with
installation instructions for a person who has not decided to install anything.

**The order:**

**One sentence: what this is.** Plainly.

**A screenshot or a link to the running thing**, immediately. **A picture in the first screen
does more than three paragraphs**, because the reader is deciding whether to keep reading and
a picture answers that instantly.

**The problem it solves**, in two or three sentences.

**How to run it**, in the fewest commands that work. **Test them on a clean machine** — a
README with a missing step is worse than no README, because it produces a failure the reader
attributes to you.

**How it is built.** The shape, three sentences.

**The interesting part.** What was hard, briefly, with a link to the fuller write-up.

**And what it does not do**, which reads as judgement rather than as a gap.

## The history

**They will look at the commit list**, and it takes them ten seconds.

**What tells them it is real work:** many commits, over several days, each doing one thing,
with messages saying why.

**What tells them it is not:** one commit called "initial commit" containing the entire
project. **That is the single most common tell in a student portfolio** and it says the work
was done elsewhere and uploaded, whether or not it was.

**You cannot retrofit this**, so commit as you go, which the project unit asked for.

## Secrets

**Check the whole history, not the current files.** There are tools that do this in one
command.

**If you find one, rotate it first**, then clean the history. **Removing it without rotating
is the mistake** — a public repository has been read by an automated scanner within minutes
of the push.

**And add an example environment file** listing every variable with safe placeholders, which
is both a security measure and the clearest documentation of what the application needs.

## Housekeeping that takes ten minutes

**Delete dead code.** Commented-out blocks, unused files, a folder called \`old\`.

**Delete generated files** that should not be committed.

**Fix the repository description and topics** on the hosting platform — **the one-line
description is shown in search results and in your profile**, and an empty one is a wasted
line in the place most people see first.

**Add a licence** if it is public.

**And pin your best repositories** to your profile, in the right order.

## The test

**Open your own repository in a private window**, as a stranger.

**Read only the first screen of the README.** Do you know what this is and whether it works?

**Then look at the commit list.** Does it look like somebody built something over a fortnight?

**If either answer is no, that is today's work**, and both are an hour at most.`,
    mcqs: [
      mcq('Most READMEs get the order wrong by:',
        [['Starting with installation for a person who has not decided to install anything', true],
          ['Describing the architecture of the project before explaining its purpose', false],
          ['Listing the technologies used at the top', false],
          ['Omitting a link to the running version', false]],
        'One sentence, then a picture, then the problem.'),
      mcq('A README with a missing step is worse than no README because:',
        [['It produces a failure the reader attributes to you', true],
          ['It suggests the project was never run elsewhere', false],
          ['The reader will not try a second time', false],
          ['It wastes more of the ninety seconds', false]],
        'Test the commands on a clean machine.'),
      mcq('The single most common tell in a student portfolio is:',
        [['One commit called "initial commit" containing the entire project', true],
          ['A README file that opens with the installation instructions', false],
          ['A demo link that no longer works', false],
          ['Generated files committed to the repository', false]],
        'It says the work was done elsewhere and uploaded.'),
      mcq('Removing a secret from the history without rotating it is:',
        [['The mistake, because a scanner read it within minutes of the push', true],
          ['Sufficient if the repository happened to be private at the time', false],
          ['Acceptable for credentials that have limited scope', false],
          ['Reasonable once the history rewrite is complete', false]],
        'Rotate first, then clean.'),
    ],
    checkpoint: [
      mcq('A picture in the first screen of the README:',
        [['Does more than three paragraphs, because the reader is deciding whether to continue', true],
          ['Compensates for a demo that is not deployed', false],
          ['Is expected by most reviewers', false],
          ['Shows the interface without the reader needing to run anything at all themselves', false]],
        'A picture answers "is this worth my time" instantly.'),
      mcq('The repository description on the hosting platform matters because:',
        [['It appears in search results and on your profile', true],
          ['It is indexed by the platform’s recommendation system', false],
          ['Reviewers read it before opening the README', false],
          ['An empty one suggests an abandoned project', false]],
        'An empty one is a wasted line where most people look first.'),
      mcq('Saying what the project does not do reads as:',
        [['Judgement rather than as a gap', true],
          ['Honesty that lowers expectations usefully', false],
          ['An invitation to contribute those features', false],
          ['A limitation best left unmentioned', false]],
        'The scope argument, applied to a README.'),
    ],
  },

  {
    unitCode: 'T3_PORTFOLIO_THE_DEMO',
    notes: `**Deployed, reachable, and with a way in that does not require signing up.**

## Why the demo is the whole thing

**A repository is a claim. A working URL is evidence.**

**And the difference in how it is received is larger than any other single improvement you
can make to a portfolio**, because it converts "this person says they built a thing" into
"this thing exists and I am using it".

**Most student portfolios are repositories.** Yours being a link is a distinction available
for an afternoon of work.

## The way in

**This is the part that gets forgotten and it undoes everything else.**

**A reviewer with ninety seconds will not create an account.** They will not verify an email.
They will not invent a password.

**So give them one of these:**

**Demo credentials on the landing page.** \`demo@example.com\` / \`demo\`, visible before login.
**The simplest answer and the most common.**

**A one-click demo button** that logs them in as a seeded user.

**Or no login at all** for a read-only view, with realistic data already in it.

**And seed the data.** **An empty application demonstrates nothing** — a reviewer who logs in
to a screen saying "no items yet" has learned only that it starts empty, and they will not
create three to find out what it does.

## Keeping it alive

**The three ways a student demo dies**, all silent:

**The free tier sleeps or expires.** Know the terms; check monthly.

**The certificate expires.** Automate renewal; monitor the date.

**The trial database is reclaimed.** Know when, and take a backup.

**Set a monthly reminder to open your own demo.** It takes one minute and it is the
difference between a link that works when somebody clicks it and one that does not.

## Making it survivable

**Reset the demo data on a schedule**, so that whatever a previous visitor did, the next one
sees something sensible.

**Or make the demo account read-only** where that makes sense.

**Handle being cold.** A first request that takes thirty seconds while the instance wakes is
a request nobody waits for — **a static landing page that loads instantly while the
application wakes behind it is worth the hour it takes.**

**And make it work on a phone**, because a proportion of your reviewers will open it on one
and a broken mobile layout is judged as a broken application.

## What to put on the landing page

**One sentence saying what it is.**

**The demo credentials**, visibly.

**A link to the repository.**

**And a link to the write-up.**

**Four things, above the fold**, and a reviewer can get everything they need in their ninety
seconds without scrolling once.`,
    mcqs: [
      mcq('The largest single improvement available to a portfolio is:',
        [['A working URL, which converts a claim into evidence', true],
          ['A README that opens by stating the problem first', false],
          ['A commit history that shows the work', false],
          ['A clear write-up of the hardest part', false]],
        'Most student portfolios are repositories.'),
      mcq('An empty demo application:',
        [['Teaches the reviewer only that it starts empty', true],
          ['Shows the interface without distracting data', false],
          ['Is acceptable if the README has screenshots', false],
          ['Invites the reviewer to try creating something', false]],
        'They will not create three items to find out what it does.'),
      mcq('A first request taking thirty seconds while the instance wakes:',
        [['Is a request nobody waits for', true],
          ['Is acceptable on a free hosting tier', false],
          ['Can be explained by a note on the page', false],
          ['Only affects the first visitor of the day', false]],
        'A static landing page that loads instantly is worth the hour.'),
      mcq('A broken mobile layout is:',
        [['Judged as a broken application', true],
          ['Forgiven for a project that is not mobile-first', false],
          ['Unlikely to be seen by technical reviewers', false],
          ['Less important than the demo working at all', false]],
        'A proportion of your reviewers will open it on a phone.'),
    ],
    checkpoint: [
      mcq('The simplest and most common way in is:',
        [['Demo credentials shown on the landing page before login', true],
          ['A one-click button that logs them in as a seeded user', false],
          ['A read-only view with no login at all', false],
          ['A guest mode with limited functionality', false]],
        'A reviewer will not create an account.'),
      mcq('A monthly reminder to open your own demo:',
        [['Takes a minute and decides whether the link works when clicked', true],
          ['Catches any performance degradation that builds up over time', false],
          ['Is needed only for free-tier hosting', false],
          ['Verifies the data reset is still running', false]],
        'The three ways a demo dies are all silent.'),
      mcq('Four things above the fold means a reviewer can:',
        [['Get everything they need in ninety seconds without scrolling', true],
          ['Decide whether to open the repository', false],
          ['Understand the project before using it', false],
          ['Reach the write-up quickly if they want more detail', false]],
        'Sentence, credentials, repository, write-up.'),
    ],
  },

  {
    unitCode: 'T3_PORTFOLIO_WRITING_THE_PROJECT_UP',
    notes: `**The problem you had, what you built, and the hardest part — not a list of
technologies.**

## Why the write-up exists

**The demo shows what it does. The code shows how. Neither shows why you made any of the
decisions**, and the decisions are the thing that distinguishes one candidate from another.

**The write-up is where the invisible work becomes visible**, and it is the only place that
happens.

## The shape

**The problem.** Two or three sentences, in plain language. **Somebody with no context should
understand why this was worth building** — and if the honest answer is "it was a learning
project", say that and then say what problem you chose to learn on.

**What you built.** Three sentences and a screenshot.

**How it works.** The shape, briefly. Five boxes at most.

**The hardest part.** **This is the write-up.** Everything above is preamble.

**What you would do differently.** Two or three specific things.

**And the technologies, at the bottom**, in one line, where somebody looking for a keyword
can find them.

## The hardest part, at length

**Name the problem concretely.** Not "handling concurrency" but "two users could book the same
slot if their requests arrived within a few milliseconds of each other".

**Say what you tried first.** And why it did not work.

**Say what you did instead**, and why that worked.

**Say what it cost.** Every solution costs something.

**And say what is still imperfect about it.**

**Five short paragraphs, and it is worth more than the rest of the portfolio combined**,
because it is the only part that demonstrates thinking rather than output — and thinking is
what they are hiring.

## Why the technology list is not the write-up

**"Built with React, Node, Express, MongoDB, Docker and AWS"** tells a reader nothing except
which words you know.

**It is the most common form of project write-up and the least informative.**

**Everybody's list looks the same**, and a list that looks the same as everybody's cannot
distinguish you — which is the entire purpose of the document.

**Put it at the bottom, in one line**, for keyword searches, and spend the space on the part
only you can write.

## Length and placement

**Four hundred to eight hundred words.** Long enough for the hard part, short enough to read.

**On your own site, or in the repository, or both.**

**Linked from the demo's landing page** and from the repository README.

## The test

**Give it to somebody who does not know the project.**

**Ask them two questions afterwards: what problem did this solve, and what was hard about
it?**

**If they can answer both, the write-up works.** If they can only answer the first, the hard
part is not specific enough — **which is the failure mode almost every draft has on the first
attempt.**`,
    mcqs: [
      mcq('The write-up exists because:',
        [['Neither the demo nor the code shows why you made the decisions', true],
          ['Reviewers generally prefer written explanations to code', false],
          ['It provides keywords for automated searches', false],
          ['A portfolio needs context for each project', false]],
        'The decisions distinguish one candidate from another.'),
      mcq('The hardest part section is:',
        [['The write-up; everything above it is preamble', true],
          ['The most detailed section of the document', false],
          ['Where the technical depth is demonstrated', false],
          ['Best kept short to hold attention', false]],
        'Five short paragraphs, worth more than the rest combined.'),
      mcq('A technology list cannot distinguish you because:',
        [['Everybody’s list looks the same', true],
          ['Reviewers do not read past the first line', false],
          ['It describes tools rather than outcomes', false],
          ['Keywords are matched automatically anyway', false]],
        'Which is the entire purpose of the document.'),
      mcq('The failure mode almost every first draft has is:',
        [['A hard part that is not specific enough', true],
          ['A problem statement that assumes context', false],
          ['A length that exceeds what anybody reads', false],
          ['A technology list placed too prominently', false]],
        'They can answer what it solved, not what was hard.'),
    ],
    checkpoint: [
      mcq('If the honest answer is "it was a learning project":',
        [['Say that, and then say what problem you chose to learn on', true],
          ['Invent a plausible user need instead', false],
          ['Focus the write-up on the technical work instead', false],
          ['Leave the problem section out entirely', false]],
        'Somebody with no context should understand why it was worth building.'),
      mcq('The hard part must include what the solution cost because:',
        [['Every solution costs something, and naming it shows you know what you did', true],
          ['Reviewers will otherwise work the cost out for themselves in the end', false],
          ['It balances an otherwise positive account', false],
          ['It leads naturally into what you would change', false]],
        'Along with what is still imperfect about it.'),
      mcq('The two-question test checks:',
        [['What problem it solved and what was hard about it', true],
          ['Whether the explanation was clear and complete', false],
          ['Whether the reader would try the demo', false],
          ['How long the write-up takes to read', false]],
        'Give it to somebody who does not know the project.'),
    ],
  },

  {
    unitCode: 'T3_PORTFOLIO_PORTFOLIO_REVIEW',
    notes: `**Assessed against what a reviewer actually checks.**

This is a checkpoint, so the protocol is here rather than in a brief. **Do it with a person**
— a portfolio review you conduct on yourself is the one thing this unit cannot substitute
for, because you cannot un-know what your own projects do.

## Setting it up

**Find somebody who has not seen your work.** A classmate, a mentor, somebody in a community.
Ideally somebody who has hired or screened before.

**Send them one link.** Whatever you would put on an application. Nothing else, and no
explanation.

**Ask them to spend ninety seconds and then stop.**

## What to ask them afterwards

**In this order, and write the answers down:**

1. **What did you look at, in what order?**
2. **What do you think the best project does?** In one sentence.
3. **Did anything not work?**
4. **Did you open any code? Which, and why that one?**
5. **What did you think the person is good at?**
6. **What would you want to ask them?**
7. **Would you move this to the next stage? Why or why not?**

**Question two is the important one.** **If they cannot say what your best project does, in
one sentence, after ninety seconds, nothing else in the portfolio matters** — because that is
the sentence everything else hangs from.

**And question five tells you what your portfolio is actually claiming**, which is frequently
not what you intended it to claim.

## Then a longer pass

**Give them ten minutes and the same portfolio.**

**Ask what changed.** Things that look fine in ninety seconds and bad in ten minutes are a
specific and useful category: a thin repository behind a good demo, a README that promises
more than the code does, a project that turns out to be a tutorial with the styling changed.

## Acting on it

**Fix anything broken the same day.**

**Then the first sentences**, of the page and of each project.

**Then the order.**

**Then remove the weakest project**, which is the recommendation people most resist and the
one that most reliably improves the average.

**And then get it reviewed again**, by somebody different, because the second reviewer sees
what the first one's feedback did not fix.

## What not to do

**Do not explain the projects to the reviewer.** You will not be there when it matters.

**Do not argue with "I did not understand what it does".** That is not an opinion; it is a
measurement.

**And do not collect feedback you do not act on.** **Two reviews acted on beat five
collected**, and the acting is the entire point of the checkpoint.`,
    mcqs: [
      mcq('A portfolio review must be done with another person because:',
        [['You cannot un-know what your own projects do', true],
          ['Self-assessment is less rigorous in practice', false],
          ['A reviewer notices presentation issues you miss', false],
          ['The timing cannot be enforced on yourself', false]],
        'Send one link, no explanation.'),
      mcq('If the reviewer cannot say what your best project does after ninety seconds:',
        [['Nothing else in the portfolio matters, because everything hangs from that sentence', true],
          ['The project needs a clearer screenshot', false],
          ['The ordering of the page is wrong', false],
          ['The write-up needs to be linked a great deal more prominently on that page', false]],
        'Question two is the important one.'),
      mcq('Asking what they think the person is good at reveals:',
        [['What your portfolio is actually claiming, which is often not what you intended', true],
          ['Which of the projects happened to make the strongest impression on them', false],
          ['Whether the technology list was noticed', false],
          ['How the work compares to other candidates', false]],
        'Frequently not what you intended it to claim.'),
      mcq('"I did not understand what it does" is:',
        [['A measurement, not an opinion', true],
          ['Feedback that depends on the reviewer’s background', false],
          ['A reason to add more explanation to the page', false],
          ['Worth checking against a second reviewer first', false]],
        'Do not argue with it.'),
    ],
    checkpoint: [
      mcq('The ten-minute pass surfaces:',
        [['Things that look fine in ninety seconds and bad on closer reading', true],
          ['Details that the reviewer skipped over during the first pass', false],
          ['Whether the demo remains stable under use', false],
          ['How the projects compare against each other', false]],
        'A thin repository behind a good demo, for example.'),
      mcq('The recommendation people most resist is:',
        [['Removing the weakest project', true],
          ['Reordering so the best is first', false],
          ['Rewriting the first sentence of each project', false],
          ['Getting a second reviewer', false]],
        'And it most reliably improves the average.'),
      mcq('Getting a second review by somebody different is worth it because:',
        [['The second reviewer sees what the first one’s feedback did not fix', true],
          ['Two opinions are more reliable than one', false],
          ['Different reviewers tend to check quite different things', false],
          ['It confirms the changes were improvements', false]],
        'Two reviews acted on beat five collected.'),
    ],
  },

  /* ══ T3_APPLYING ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_APPLYING_READING_A_JOB_DESCRIPTION',
    notes: `**Which requirements are real, which are a wish list, and when to apply anyway.**

## What a job description actually is

**Written by somebody who is not the hiring manager**, usually, from a template, with
additions from several people.

**Aspirational.** It describes a candidate who would be ideal and may not exist.

**And partly copied** from a previous posting for a different role.

**Which means reading it literally is a mistake in both directions** — you will rule yourself
out of jobs you would get, and you will fail to notice the two lines that actually matter.

## Telling real from wished-for

**Real:** repeated in different words. Mentioned in the first paragraph. Specific — a named
system, a named domain, a named responsibility. Tied to what the team does.

**Wished-for:** a long list of technologies with no detail. Anything in a bullet list of
fifteen items. A number of years attached to a technology that has not existed that long. A
mixture that no single person has — **backend, frontend, mobile, data and infrastructure in
one junior posting is a list of things the team uses, not a list of things you need.**

**The signal worth trusting most: what the day-to-day description says**, because that part is
usually written by somebody on the team and describes what actually happens.

## The junior-role reality

**"Two years of experience" on a junior posting is frequently a filter somebody added without
thinking**, and it is the most commonly over-weighted line in the entire document.

**Meeting sixty percent is normal and is enough to apply.** Meeting a hundred percent means
you are overqualified and probably bored.

**And the thing that actually gets a junior hired is evidence you can build and finish
things**, which is what the whole year has been producing — not the bullet list.

## When not to apply

**When the core requirement is something you genuinely cannot do.** A machine learning role
when you have never trained a model.

**When it is senior and says so**, and the responsibilities are leading and owning.

**When it requires a clearance, a location or a right to work you do not have.**

**Everything else is worth an application**, and the cost of applying is twenty minutes
against the cost of not applying, which is the job.

## Reading it for the application

**Underline the three things that appear most.** Those go in your first paragraph and at the
top of your résumé.

**Find the domain.** Fintech, health, logistics — **and mention it**, because it is the
cheapest possible signal that you read the posting.

**Find one thing you can speak to specifically.** A named technology you have used, a problem
they describe that you have had.

**And note what is missing.** No mention of testing, no mention of review — **that is a
question for the interview and it is one that is noticed**, because it shows you are assessing
them too.`,
    mcqs: [
      mcq('Reading a job description literally is a mistake in both directions because:',
        [['You rule yourself out of jobs you would get and miss the two lines that matter', true],
          ['Descriptions are generally written to attract rather than to filter people', false],
          ['Requirements change between posting and interview', false],
          ['The list is longer than any candidate could satisfy', false]],
        'Aspirational, templated, and partly copied.'),
      mcq('Backend, frontend, mobile, data and infrastructure in one junior posting is:',
        [['A list of things the team uses, not things you need', true],
          ['A sign the role is poorly defined', false],
          ['A reason to apply only if you cover most of them', false],
          ['Typical of a small team with broad needs', false]],
        'Wished-for rather than real.'),
      mcq('The signal worth trusting most is:',
        [['The day-to-day description, usually written by somebody on the team', true],
          ['The first paragraph of the posting', false],
          ['Whichever of the requirements are listed as being essential', false],
          ['The seniority stated in the title', false]],
        'It describes what actually happens.'),
      mcq('The most commonly over-weighted line in a junior posting is:',
        [['"Two years of experience", frequently added without thinking', true],
          ['The list of required technologies', false],
          ['A named degree requirement', false],
          ['Familiarity with one particular named framework or tool', false]],
        'Sixty percent is normal and is enough to apply.'),
    ],
    checkpoint: [
      mcq('The thing that actually gets a junior hired is:',
        [['Evidence you can build and finish things', true],
          ['Matching the technology list closely', false],
          ['Relevant internship or placement experience', false],
          ['A degree from a recognised programme', false]],
        'Which is what the whole year has been producing.'),
      mcq('Mentioning the domain in your application is:',
        [['The cheapest possible signal that you read the posting', true],
          ['Only useful if you have worked in that domain before', false],
          ['A way of showing commercial awareness', false],
          ['Expected in a covering letter', false]],
        'Fintech, health, logistics.'),
      mcq('Noting what the posting does not mention:',
        [['Gives you a question for the interview that is noticed', true],
          ['Reveals gaps in how the team works', false],
          ['Helps you decide whether to apply', false],
          ['Is a way of checking that the posting is genuine', false]],
        'It shows you are assessing them too.'),
    ],
  },

  {
    unitCode: 'T3_APPLYING_MATCHING_AND_GAPS',
    notes: `**Where you fit, where you do not, and what to say about the difference.** This is
the honest centre of the module.

## The matching exercise

**Two columns. Their requirements on the left, your evidence on the right.**

**Evidence means something somebody could look at.** A project, a piece of code, a deployed
thing, a measurement. **Not "familiar with" and not "experience in"** — those are claims, and
a claim in a column next to a requirement is a gap with better wording.

> **Requirement:** REST API design.
> **Evidence:** Order API in the capstone — eleven endpoints, versioned, with a written
> contract and contract tests both sides.

**Do this for every requirement.** It takes thirty minutes and it produces both your
application and your list of gaps.

## Naming the gaps

**The single most credible thing a junior candidate can do**, and almost nobody does it.

**Because the gaps are visible anyway.** Your CV says what you have done; the absence is
already legible to anybody reading it carefully. **Naming it yourself changes it from
something they found into something you knew** — and that difference is the whole value.

**The shape:**

> "I have not worked with Kubernetes. I have containerised and deployed applications with
> Docker and a managed platform, and I understand the concepts it addresses. I would expect
> to need a few weeks to be useful with it."

**Three parts: what is missing, what is adjacent that you do have, and a realistic sense of
the distance.**

## What not to do with a gap

**Do not claim it.** It will come out in the interview, and it converts a gap into a question
about honesty, which is a much worse conversation.

**Do not apologise for it.** "Unfortunately I have no experience with" spends words on making
it worse.

**Do not over-explain.** One sentence of adjacency is enough.

**And do not list all of them.** Name the one or two that matter for this role; the rest are
not the conversation.

## Closing a gap, quickly

**Some gaps close in a weekend.** A tool used in a small project, a concept learned well
enough to discuss.

**"I had not used it, so I built something small with it last week"** is a genuinely strong
answer — **stronger in some ways than having used it at work, because it shows what you do
when you do not know something**, which is the thing they cannot otherwise find out.

**Others do not close quickly**, and pretending otherwise wastes your weekend and their time.

## The honest self-assessment

**For each skill, one of four:**

**Have built and shipped it.** Evidence available.

**Have used it in a project.** Evidence available, smaller.

**Understand it, have not built with it.** Can discuss, not claim.

**Have not touched it.**

**Be strict about the boundary between the second and the third.** **Reading about something
is not using it**, and an interviewer finds the difference in about two questions.`,
    mcqs: [
      mcq('"Familiar with" in the evidence column is:',
        [['A gap with better wording', true],
          ['Acceptable for secondary requirements', false],
          ['A fair description of partial knowledge', false],
          ['Better than leaving the row blank', false]],
        'Evidence means something somebody could look at.'),
      mcq('Naming your own gap changes it from:',
        [['Something they found into something you knew', true],
          ['A weakness into a development plan', false],
          ['A disqualifier into a discussion point', false],
          ['An omission into an honest disclosure', false]],
        'And that difference is the whole value.'),
      mcq('Claiming a skill you do not have:',
        [['Converts a gap into a question about honesty, which is a worse conversation', true],
          ['Risks being asked a question you cannot answer', false],
          ['Is discovered during the technical assessment', false],
          ['Works only where the skill is fairly peripheral to the role in question', false]],
        'It will come out, and then the subject is your honesty.'),
      mcq('"I built something small with it last week" is strong because:',
        [['It shows what you do when you do not know something', true],
          ['It demonstrates the gap has been closed', false],
          ['It proves you can learn quickly', false],
          ['It gives you something concrete to discuss', false]],
        'Which is the thing they cannot otherwise find out.'),
    ],
    checkpoint: [
      mcq('A gap statement has three parts:',
        [['What is missing, what adjacent thing you have, and the realistic distance', true],
          ['What is missing, why it never came up, and your plan to address it', false],
          ['The gap, its relevance to the role, and a mitigation', false],
          ['What is missing, what you have read, and your interest', false]],
        'One sentence of adjacency is enough.'),
      mcq('The boundary to be strict about is between:',
        [['Having used it in a project and understanding it without building', true],
          ['Having shipped it and having merely used it in a project', false],
          ['Understanding it and having not touched it', false],
          ['Having read about it and having tried it once', false]],
        'An interviewer finds the difference in about two questions.'),
      mcq('You should name:',
        [['The one or two gaps that matter for this role', true],
          ['Every gap the matching exercise produced', false],
          ['Only the gaps likely to be noticed', false],
          ['Whichever gap you have started closing', false]],
        'The rest are not the conversation.'),
    ],
  },

  {
    unitCode: 'T3_APPLYING_RESUME_FOR_A_ROLE',
    notes: `**Evidence over adjectives, and the same projects framed for this job.**

## The reader, again

**Six seconds on the first pass.** Sometimes an automated filter before that.

**They are looking for:** can this person build something, is there evidence, and does
anything match what we asked for.

**One page.** Two only if you have things a second page would hold, which as a new graduate
you do not.

## Evidence over adjectives

**Every adjective is a claim you are asking them to take on trust.**

**"Passionate, detail-oriented, quick learner"** — everybody writes this, it costs nothing to
write, and therefore it carries no information. **A line that every applicant could write is
a line that distinguishes nobody**, and it is occupying space that could hold a fact.

**Replace each one with a thing that happened:**

**Not** "experienced with databases".
**But** "designed the schema for a booking system handling overlapping reservations;
added the constraint that prevents double-booking at the database level".

**Not** "strong testing skills".
**But** "wrote the test suite for X; verified it by introducing ten deliberate defects, nine
of which the suite caught".

**The second version is longer and it is worth the space**, because it is checkable and the
first is not.

## Structure

**Name, one line of contact, links.** The links are the important part: **repository, demo,
write-up.** Make them clickable.

**A two-line summary**, if any. What you build and what you are looking for. No adjectives.

**Projects, first.** For a new graduate, projects are the experience section, and putting
education above them is the most common structural mistake on a graduate CV.

**Three projects, each with:** one line on what it does, two on what you built and the hard
part, one line of technologies, and **a link that works.**

**Then experience**, if any, including unrelated work — **a retail job shows you have held
one, and the absence of any employment is more noticeable than an unrelated one.**

**Then education.** Degree, institution, year. Relevant modules if they are relevant.

**Then skills**, honestly grouped, and short.

## Tailoring for one role

**Twenty minutes, and it is the difference between a reply and silence.**

**Reorder the projects** so the most relevant is first.

**Rewrite the summary** using their words from the posting.

**Reorder the bullets** within each project so the relevant one leads.

**And mirror their vocabulary.** If they say "services" and you say "microservices", use
theirs — both for the automated filter and for the person, who is scanning for the words they
wrote.

**Do not rewrite the facts.** Reorder and reframe them. **Same evidence, aimed.**

## What to remove

**A photograph**, in most countries.

**Your full address.** A city is enough.

**Anything before university** unless it is genuinely relevant.

**"References available on request"**, which is assumed and is a wasted line.

**And every skill you would not want to be asked about**, which is the most useful deletion
on this list.`,
    mcqs: [
      mcq('"Passionate, detail-oriented, quick learner" carries no information because:',
        [['Every applicant could write it, so it distinguishes nobody', true],
          ['Recruiters have learned to skip that section', false],
          ['Adjectives are filtered out by the automated systems', false],
          ['It describes attitude rather than ability', false]],
        'And it occupies space that could hold a fact.'),
      mcq('The most common structural mistake on a graduate CV is:',
        [['Putting education above projects', true],
          ['Listing too many technologies', false],
          ['Running to a second page', false],
          ['Omitting unrelated employment', false]],
        'For a new graduate, projects are the experience section.'),
      mcq('Including unrelated work such as a retail job:',
        [['Shows you have held one, and its absence is more noticeable', true],
          ['Fills out the space when the project section is short', false],
          ['Demonstrates transferable skills', false],
          ['Is only worth it if it was long-term', false]],
        'Then education, then skills.'),
      mcq('Mirroring the posting’s vocabulary matters for:',
        [['Both the automated filter and the person scanning for their own words', true],
          ['The automated filter, which matches exact terms', false],
          ['Signalling that you understand their domain', false],
          ['Consistency with the way the team itself describes its own work', false]],
        'If they say "services", use "services".'),
    ],
    checkpoint: [
      mcq('Tailoring means:',
        [['Reordering and reframing the same evidence, not rewriting the facts', true],
          ['Emphasising whichever of the projects are closest to the role', false],
          ['Adjusting the summary and the skills section', false],
          ['Adding detail relevant to this employer', false]],
        'Same evidence, aimed.'),
      mcq('The most useful deletion is:',
        [['Every skill you would not want to be asked about', true],
          ['The line saying references are available on request', false],
          ['Your full postal address', false],
          ['Anything from before university', false]],
        'A listed skill is an invitation to a question.'),
      mcq('"Wrote the test suite; nine of ten deliberate defects caught" is better because:',
        [['It is checkable, where "strong testing skills" is not', true],
          ['It is rather more specific about the work done', false],
          ['It includes a measurable outcome', false],
          ['It demonstrates an unusual technique', false]],
        'Longer, and worth the space.'),
    ],
  },

  {
    unitCode: 'T3_APPLYING_APPLYING_AND_TRACKING',
    notes: `**Volume, follow-up, and knowing which applications are still alive** — running a
process rather than sending and hoping.

## The numbers, honestly

**Most applications get no reply.** Not a rejection — nothing.

**This is normal and it is not about you.** Postings that are already filled, roles that were
cancelled, a pile of four hundred applications for one opening.

**So volume matters**, and the arithmetic is unforgiving: **at a few percent response rate, a
handful of applications produces nothing and tells you nothing.** Twenty is a sample. Five is
noise.

**And quality still matters within that volume**, which is the tension: twenty tailored
applications beat two hundred identical ones, and both beat five.

## Where they come from

**Job boards.** High volume, low response rate, and where everybody is.

**Company career pages directly.** Better, and slower.

**Referrals.** **By a large margin the highest response rate available to you**, and the one
students use least — not because they cannot, but because asking feels like an imposition
when it is a fifteen-second favour for the other person.

**Your university's careers service**, which has relationships you do not.

**And people you already know**, which is a list most students have never actually written
down.

## The tracker

**A spreadsheet. Seven columns.**

**Company. Role. Date applied. Source. Status. Next action. Date of next action.**

**Without this you will lose track by the fifteenth application**, apply twice to the same
company, and fail to follow up on the one that was going to work.

**Status is one of:** applied, acknowledged, screening, interviewing, offer, rejected, no
response.

**And "no response" becomes a status after two weeks**, not a permanent limbo.

## Following up

**Once, after seven to ten days.** Short, polite, and restating your interest in two lines.

**A measurable proportion of responses come from the follow-up**, and it costs three minutes.

**Once only.** A second follow-up is noise and is remembered.

**And when rejected, ask for feedback.** Most will not give it. **The occasional one who does
is worth more than ten applications**, because it tells you which part of the process is
losing you.

## Keeping it going

**Applying is demoralising, and the demoralisation is the actual risk** — not the rejections
themselves but stopping because of them.

**Set a rate.** Five a week, tailored. Not forty on a Sunday and none for a month.

**Keep building while you apply.** A project finished during the search is a new thing to put
in the next application and a reason to feel you are moving.

**And separate the parts you control from the ones you do not.** **You control the tailoring,
the evidence, the follow-up and the rate. You do not control whether the role was already
filled**, and treating an outcome you do not control as a verdict on you is what makes people
stop.`,
    mcqs: [
      mcq('The arithmetic of applying means:',
        [['Twenty is a sample and five is noise', true],
          ['Volume matters more than tailoring', false],
          ['Response rates improve with experience', false],
          ['Most applications need a follow-up to be seen', false]],
        'At a few percent, a handful tells you nothing.'),
      mcq('Referrals are used least by students because:',
        [['Asking feels like an imposition when it is a fifteen-second favour', true],
          ['Students rarely have the necessary contacts', false],
          ['The process is rather less transparent than applying directly', false],
          ['They are only available through a university', false]],
        'By a large margin the highest response rate available.'),
      mcq('Without a tracker you will:',
        [['Lose track by the fifteenth, apply twice, and miss a follow-up', true],
          ['Struggle to tailor each of the applications properly enough', false],
          ['Apply at an inconsistent rate', false],
          ['Forget which sources produced responses', false]],
        'Seven columns in a spreadsheet.'),
      mcq('The actual risk in a job search is:',
        [['The demoralisation, and stopping because of it', true],
          ['Applying too broadly and being screened out', false],
          ['Running out of roles to apply to', false],
          ['Letting the portfolio go stale', false]],
        'Not the rejections themselves.'),
    ],
    checkpoint: [
      mcq('Follow up:',
        [['Once, after seven to ten days, in two lines', true],
          ['Twice, a week apart, if there is no reply', false],
          ['After two weeks, when the status changes', false],
          ['Only for roles you are especially interested in', false]],
        'A second follow-up is noise and is remembered.'),
      mcq('Feedback from a rejection is:',
        [['Worth more than ten applications, because it says what is losing you', true],
          ['Rarely specific enough to act on', false],
          ['Worth asking for only after you have reached an interview stage', false],
          ['A courtesy most companies will extend', false]],
        'Most will not give it; the occasional one who does matters.'),
      mcq('Separating what you control matters because:',
        [['Treating an uncontrollable outcome as a verdict is what makes people stop', true],
          ['It helps prioritise where to spend effort', false],
          ['Response rates are very largely outside your own influence anyway', false],
          ['It keeps the tracker focused on actions', false]],
        'You control tailoring, evidence, follow-up and rate.'),
    ],
  },

  /* ══ T3_BEHAVIORAL ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BEHAVIORAL_A_REAL_EXAMPLE_READY',
    notes: `**What you did, why, and what you would change. Prepared, not improvised.**

## Why prepared

**Not because the answers should be scripted** — a scripted answer is audible and it is worse
than a rough one.

**Because recalling a specific example under pressure is genuinely hard**, and without
preparation you will produce a general answer about how you usually approach things, which
answers nothing.

**"I try to communicate clearly and break problems down" is what an unprepared person says**,
and every interviewer has heard it four hundred times.

## The material you have

**You have spent a year building things.** The material is there and you have not organised
it.

**Go and find it:**

**A time something did not work** and you found out why.

**A decision you made** with a real trade-off.

**A time you were wrong** and changed your mind.

**A time you were stuck** and got unstuck.

**A time you had to cut scope** to finish.

**A time you disagreed** with feedback, or agreed with it after resisting.

**Six stories, written down.** That covers almost every behavioural question asked.

## The shape of each

**Situation, briefly.** Two sentences, enough context.

**What you did.** Specifically, and **"I" rather than "we"** — not to claim credit, but
because they are assessing you, and a story told entirely in "we" leaves them unable to tell
what your part was.

**Why you did that** rather than the alternative.

**What happened.**

**And what you would do differently**, which is the part that makes it a real story rather
than an anecdote with a happy ending.

## Why the last part matters most

**Everybody has a story where it worked out. Almost nobody volunteers what they would change.**

**It demonstrates that you are still thinking about it**, which is the only evidence available
that you learn from your own work.

**And it makes the rest believable.** A story with no self-criticism reads as polished; a
story with one specific regret reads as true.

## Preparing without scripting

**Write bullet points, not sentences.** Five bullets per story.

**Say each one out loud once.** You will find the places where you do not actually know what
happened.

**Do not memorise.** **A memorised answer is audible within one sentence** and it costs you
more than a halting genuine one.

**And know the numbers.** How many endpoints, how many users, how long it took, what the
catch rate was. **A specific number makes the whole story credible** in a way nothing else
does.

## Small material is fine

**You do not need a dramatic story.**

**"The export timed out for large customers, I found a missing index, and I learned to check
the query plan before assuming the code was wrong"** is a complete and good answer.

**Scale is not what is being assessed. Reflection is.**`,
    mcqs: [
      mcq('Preparation is needed because:',
        [['Recalling a specific example under pressure is genuinely hard', true],
          ['Interviewers expect structured answers', false],
          ['The same set of questions comes up in almost every interview', false],
          ['Improvised answers tend to be too long', false]],
        'Without it you produce a general answer about how you usually approach things.'),
      mcq('A story told entirely in "we":',
        [['Leaves them unable to tell what your part was', true],
          ['Sounds more collaborative than it should', false],
          ['Suggests you are avoiding taking credit', false],
          ['Is appropriate for genuinely shared work', false]],
        '"I" rather than "we", because they are assessing you.'),
      mcq('The part that makes it a real story is:',
        [['What you would do differently', true],
          ['The reasoning behind the decision', false],
          ['The outcome and what it achieved', false],
          ['The specific detail of what you did', false]],
        'Otherwise it is an anecdote with a happy ending.'),
      mcq('A memorised answer:',
        [['Is audible within one sentence and costs more than a halting genuine one', true],
          ['Sounds a little rehearsed but does cover all the points reliably', false],
          ['Is safer than improvising under pressure', false],
          ['Works provided the delivery is natural', false]],
        'Bullet points, not sentences.'),
    ],
    checkpoint: [
      mcq('Six stories written down covers:',
        [['Almost every behavioural question asked', true],
          ['The most common half of the questions', false],
          ['Enough for a first-round interview', false],
          ['The categories most employers use', false]],
        'Failure, decision, being wrong, stuck, cutting scope, disagreement.'),
      mcq('A specific number in a story:',
        [['Makes it credible in a way nothing else does', true],
          ['Shows you measured your own work', false],
          ['Invites a follow-up question about the detail', false],
          ['Helps the interviewer judge the scale', false]],
        'Endpoints, users, duration, catch rate.'),
      mcq('A small story about a missing index is:',
        [['A complete and good answer, because reflection is what is assessed', true],
          ['Better replaced by something rather more substantial than that', false],
          ['Acceptable if no larger example exists', false],
          ['Suitable for a junior role specifically', false]],
        'Scale is not what is being assessed.'),
    ],
  },

  {
    unitCode: 'T3_BEHAVIORAL_THE_COMMON_QUESTIONS',
    notes: `**Conflict, failure, something you are proud of** — and answering them without a
script.

## "Tell me about a time you disagreed with somebody"

**What they are checking:** whether you can disagree without it becoming personal, and
whether you can be wrong.

**The good shape:** a technical disagreement, a reason on both sides, what you did to resolve
it, and the outcome — **including if you were the one who turned out to be wrong.**

**"I was right and they eventually agreed" is a worse answer than it feels**, because it
tests nothing they were asking about.

**Avoid:** a story where somebody is the villain.

## "Tell me about a failure"

**What they are checking:** whether you take responsibility, and whether you learned
something specific.

**The good shape:** something that genuinely went wrong, your part in it named plainly, what
you did about it, and what you changed afterwards.

**"My biggest failure is that I work too hard" is the worst available answer**, and it is
common enough that interviewers have a name for it. **It signals that you will not tell them
about a real problem when one happens**, which is a genuinely disqualifying thing to signal.

**And the failure does not have to be large.** A missed deadline, a bug you shipped, an
estimate that was badly wrong.

## "What are you proud of?"

**What they are checking:** what you value, and whether you can talk about your own work
without either shrinking or inflating.

**The good shape:** a specific thing, why it was hard, and what you did that made it work.

**Not the largest thing. The one where your contribution was clearest.**

## "Why do you want to work here?"

**What they are checking:** whether you read anything about them.

**The good shape:** one specific thing about the company or the role, and how it connects to
what you want to do.

**"It seems like a great company" is the answer of somebody who applied to ninety places
without reading any of them**, which may be true and should not be visible.

## "Tell me about yourself"

**The most common opener and the most commonly wasted.**

**Two minutes: what you do, one thing you have built, and what you are looking for.**

**Not your life story. Not a chronological account.** **A chronological answer spends the
interviewer's attention on the least relevant part of your history**, which is the beginning.

## The general rules

**Always a specific instance.** "I usually" is not an answer to "tell me about a time".

**Always what you did**, not what the team did.

**Always what you would change.**

**And keep it under two minutes.** **The most common failure across all of these is length**,
and a long answer to a behavioural question loses the thread and the room together.`,
    mcqs: [
      mcq('"I was right and they eventually agreed" is a weak answer because:',
        [['It tests nothing they were asking about', true],
          ['It suggests the disagreement was one-sided', false],
          ['It avoids saying how the disagreement was resolved', false],
          ['It implies the other person was at fault', false]],
        'They are checking whether you can be wrong.'),
      mcq('"My biggest failure is that I work too hard" signals:',
        [['That you will not tell them about a real problem when one happens', true],
          ['That you have not really prepared properly for the question', false],
          ['That you lack self-awareness', false],
          ['That you are avoiding a difficult topic', false]],
        'Which is genuinely disqualifying.'),
      mcq('"It seems like a great company" reveals:',
        [['Somebody who applied to ninety places without reading any of them', true],
          ['A simple lack of preparation for this one specific interview', false],
          ['That the role was not the main attraction', false],
          ['An unwillingness to flatter', false]],
        'Which may be true and should not be visible.'),
      mcq('A chronological answer to "tell me about yourself":',
        [['Spends their attention on the least relevant part, the beginning', true],
          ['Takes considerably longer than the two minutes available', false],
          ['Makes the recent work harder to find', false],
          ['Reads as unprepared rather than structured', false]],
        'What you do, one thing you built, what you are looking for.'),
    ],
    checkpoint: [
      mcq('For "what are you proud of", choose:',
        [['The one where your contribution was clearest, not the largest thing', true],
          ['Whichever was the most technically difficult piece of work', false],
          ['The project most relevant to this role', false],
          ['Something that had a measurable outcome', false]],
        'Why it was hard, and what you did that made it work.'),
      mcq('The most common failure across all behavioural answers is:',
        [['Length', true],
          ['Answering in general terms rather than specifics', false],
          ['Using "we" rather than "I"', false],
          ['Omitting what you would change', false]],
        'A long answer loses the thread and the room.'),
      mcq('A failure story does not have to be large because:',
        [['A missed deadline or a shipped bug tests the same thing', true],
          ['Junior candidates are not expected to have large ones', false],
          ['Large failures are harder to describe briefly', false],
          ['The interviewer cannot verify the scale', false]],
        'What is checked is responsibility and what you changed.'),
    ],
  },

  {
    unitCode: 'T3_BEHAVIORAL_THE_FIRST_WEEKS',
    notes: `**Asking, standups, taking a review, and saying early when something has slipped.**

Interviewers ask about this because **the first weeks are where a new hire either becomes
useful or becomes a management problem**, and the difference is almost entirely behavioural.

## Asking

**The single thing juniors get wrong most.**

**Too little:** a day lost to something a colleague would have answered in two minutes. **This
is the more common failure and it is much more expensive than the interruption would have
been.**

**Too much:** interrupting before trying, which trains people to route around you.

**The rule: try for a bounded time, then ask.** Twenty minutes for something small, an hour
for something large. **Say what you tried when you ask**, which is the question unit's
argument.

**And write down the answer**, so you ask each thing once.

## Standups

**Three sentences: what you did, what you are doing, what is blocking you.**

**Say the blocker.** That is the entire purpose of the meeting. **A standup where everybody
says "no blockers" for two weeks is a standup where nobody is saying anything**, and it is
usually the newest person who is most reluctant to be the first.

**Keep it short.** Detail goes in a conversation afterwards.

## Taking a review

**All of the being-reviewed unit applies from day one.**

**Assume good intent. Read them all before replying. Change what is right, ask what is
unclear, disagree once with a reason.**

**And do not take it personally in a new team**, where the temptation is strongest because
you do not yet know anybody and every comment feels like an evaluation. It is not; it is
Tuesday.

## Saying when something has slipped

**Early, and without being asked.**

**"This is going to take until Thursday rather than Tuesday, because of X"** is a
professional sentence. It lets somebody plan.

**Silence until the deadline is the thing that damages trust**, and it damages it far more
than the delay itself does — **the delay is a fact and the silence is a choice.**

**And propose something.** Cut scope, get help, move the date. **A slip with an option
attached is a conversation; a slip with nothing attached is a problem somebody else has to
solve.**

## The first weeks, practically

**Week one:** get the environment running, ship something tiny, learn the names, find out
where things are.

**Write down everything.** You will be told the same thing once.

**And write down what confused you** — **a new person's list of confusions is the most
valuable documentation contribution available to them**, and it expires within a month as you
stop noticing.

**Week two onwards:** a real ticket, a review, a deploy.

**And ask what good looks like here.** How big should a change be? What does the team expect
in a description? **Asking that in week one is a strong signal and it is rarely asked.**

## What to say in the interview

**Describe the loop:** try, ask, write it down, share the blocker, say early when it slips.

**Give one concrete example** of it from the year, even if the team was you and a classmate.`,
    mcqs: [
      mcq('The more common and more expensive asking failure is:',
        [['Asking too little, losing a day to a two-minute answer', true],
          ['Asking too much and training people to route around you', false],
          ['Asking without saying what you already tried', false],
          ['Asking the same person repeatedly', false]],
        'Try for a bounded time, then ask.'),
      mcq('A standup where everybody says "no blockers" for two weeks is:',
        [['One where nobody is saying anything', true],
          ['A sign the team is working smoothly', false],
          ['A meeting that should be replaced with a message', false],
          ['Normal during a period of routine work', false]],
        'And the newest person is usually most reluctant to be first.'),
      mcq('Silence until the deadline damages trust more than the delay because:',
        [['The delay is a fact and the silence is a choice', true],
          ['It removes the chance to recover the schedule', false],
          ['It suggests the work was not being tracked', false],
          ['It forces somebody else to discover the problem', false]],
        'Say it early and without being asked.'),
      mcq('A new person’s list of confusions is:',
        [['The most valuable documentation contribution available to them', true],
          ['Useful for the next person to join', false],
          ['A record of what the onboarding missed', false],
          ['Best shared once they have properly understood the system', false]],
        'And it expires within a month as you stop noticing.'),
    ],
    checkpoint: [
      mcq('A slip with an option attached is:',
        [['A conversation, where one with nothing attached is somebody else’s problem', true],
          ['Easier for a manager to accept', false],
          ['A way of taking responsibility for the delay', false],
          ['Expected whenever the cause of the slip is within your own control', false]],
        'Cut scope, get help, or move the date.'),
      mcq('Review feedback feels like an evaluation in a new team because:',
        [['You do not yet know anybody, so every comment carries weight', true],
          ['New joiners tend to receive more comments than others', false],
          ['Reviewers are testing what you can handle', false],
          ['Early work is more heavily scrutinised', false]],
        'It is not an evaluation; it is Tuesday.'),
      mcq('Asking "what does good look like here?" in week one is:',
        [['A strong signal, and rarely asked', true],
          ['Better delayed until you have shipped something', false],
          ['A question for your manager rather than the team', false],
          ['Likely to get a vague answer', false]],
        'How big should a change be, what goes in a description.'),
    ],
  },

  {
    unitCode: 'T3_BEHAVIORAL_MOCK_BEHAVIORAL',
    notes: `**The whole thing, with feedback.**

A checkpoint, so the protocol is here. **Do it with a person**, and do it after you have
written your six stories, not instead of writing them.

## Setting it up

**Find somebody.** Give them these questions and let them choose five, in an order you do not
know:

1. Tell me about yourself.
2. Tell me about a time you disagreed with somebody.
3. Tell me about a failure.
4. What are you proud of?
5. Tell me about a time you were stuck.
6. Tell me about a decision with a trade-off.
7. Tell me about a time you had to cut scope.
8. How would you approach your first two weeks here?
9. Why do you want to work here? (Pick a real company and prepare for it.)
10. What would you change about a project you have shown me?

**Thirty minutes. Recorded. No notes in front of you.**

## Give them this to watch for

- **Was it a specific instance, or a general description of how they usually work?**
- Did they say what *they* did, or what the team did?
- Did they say what they would change?
- How long was the longest answer?
- Was anything memorised?
- Did any story have a villain?
- **Would you want this person on your team in their first month?**

**The first and the last are the two that matter.** The first is the most common failure and
the last is the actual question behind all ten.

## Afterwards

**Ask against the list, question by question.**

**Then the useful one: "which answer did you believe least?"** Not which was weakest — which
sounded least true. **Those are different and the second is much more informative**, because
an answer that sounds untrue is usually one that was memorised or one where the "I" was
really a "we".

**Write it down. Do not defend.**

## Watch the recording

**Time each answer.** **Anything over two minutes needs cutting**, and you will find one you
thought was ninety seconds and was four.

**Count the "we"s.**

**Find the answer where you drifted into the general** — "I usually try to" — and write the
specific instance you should have given.

## Then again

**Two or three, with different people**, because a different person asks differently and the
second run is where the improvement shows.

**Fix one thing each time.**

**And for most people the first fix is length**, exactly as it is silence in the technical
mock.`,
    mcqs: [
      mcq('The two things on the watch list that matter most are:',
        [['Whether it was a specific instance, and whether they would want you on the team', true],
          ['Whether they said "I", and whether anything was memorised', false],
          ['The length of the answers and whether stories had villains', false],
          ['Whether they said what they would change, and how long the answers were', false]],
        'The first is the most common failure; the last is the actual question.'),
      mcq('"Which answer did you believe least?" is more informative than "which was weakest?" because:',
        [['An answer that sounds untrue is usually memorised or really about the team', true],
          ['Believability is a good deal easier for any reviewer to judge quickly', false],
          ['Weak answers are obvious from the content alone', false],
          ['It avoids the reviewer ranking your material', false]],
        'Those are different questions.'),
      mcq('Timing each answer in the recording finds:',
        [['One you thought was ninety seconds and was four minutes', true],
          ['Which stories you know least well', false],
          ['Where the pacing became uneven', false],
          ['Whether you left enough room for any follow-ups', false]],
        'Anything over two minutes needs cutting.'),
      mcq('The mock should be done:',
        [['After you have written your six stories, not instead of writing them', true],
          ['Before writing anything, to find the gaps', false],
          ['Once every one of the six stories has been rehearsed out loud', false],
          ['At the same time as the technical mock', false]],
        'Thirty minutes, recorded, no notes.'),
    ],
    checkpoint: [
      mcq('For most people the first thing to fix is:',
        [['Length, exactly as it is silence in the technical mock', true],
          ['Drifting into general descriptions of how you work', false],
          ['Saying "we" instead of "I"', false],
          ['Omitting what they would change', false]],
        'Fix one thing each time.'),
      mcq('Doing two or three mocks with different people matters because:',
        [['A different person asks differently, and the second run shows the improvement', true],
          ['One reviewer cannot cover all ten questions', false],
          ['Feedback varies far too much for any single source of it to be trusted', false],
          ['Repetition makes the stories more fluent', false]],
        'Not the same person twice.'),
      mcq('The interviewer should choose the questions because:',
        [['You do not know the order, which is the condition being rehearsed', true],
          ['It stops you from preparing only for your own best stories', false],
          ['It makes the session more representative', false],
          ['They can follow up on weaker answers', false]],
        'Five from the ten, in an order you do not know.'),
    ],
  },

  /* ══ T3_VERIFICATION ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_VERIFICATION_TECHNICAL_VERIFICATION',
    notes: `**Programming, data structures, algorithms, databases, APIs, testing and security
— measured, not asserted.**

The three verification units are the end of the year. **Their purpose is to replace a feeling
with a number**, because "I think I am about ready" is not a thing anybody can act on and a
scored result is.

## What is measured

**Programming and problem solving.** Timed problems at interview difficulty.

**Data structures and algorithms.** Choosing the right one, and the complexity of what you
chose.

**Databases.** Schema design, a query you have to reason about, what an index does here.

**APIs.** Designing one, and what makes a change to it breaking.

**Testing.** Choosing tests from failure modes, and whether a suite would catch anything.

**Security.** The access control matrix, injection, and what the client cannot be trusted
with.

**All of it against what the year taught**, and none of it against anything the year did not.

## The shape of it

**Two sittings** rather than one long one, because a four-hour assessment measures stamina
alongside everything else.

**Some written, some at a keyboard.** Both, because they fail differently: **you can explain
something you cannot build and you can build something you cannot explain**, and a graduate
needs to be able to do both.

**Timed, like an interview.** Not because time pressure is the point, but because unlimited
time measures something that does not exist in the situations this is preparing you for.

## Preparing for it

**Do not revise everything.** Revise what you know is weak, which you know.

**Redo the units you scored worst on** rather than rereading the ones you liked.

**Do the timed sets again**, because that is the format.

**And do not learn anything new in the last week.** It will not stick and it will displace
something that had.

## Reading the result

**A score per area**, not one number.

**The point is the shape of it**, not the total. **Strong on APIs and weak on data structures
is a specific, actionable finding**, and one number would have hidden it entirely.

**A weak area is not a verdict.** It is the thing to work on, and knowing which one is the
entire output of this exercise.

## If it goes badly

**That is what it is for.**

**Finding out now costs you a fortnight of focused work. Finding out in an interview costs
you the interview**, and you will not be told which part it was.

**Take the areas, work on them, do it again.** The number is not the point; **the direction
after the number is.**`,
    mcqs: [
      mcq('The purpose of the verification units is to:',
        [['Replace a feeling with a number, because "about ready" is not actionable', true],
          ['Certify the year’s work for an employer', false],
          ['Identify which of the students are already ready to apply for roles', false],
          ['Measure the curriculum’s effectiveness', false]],
        'A scored result is something you can act on.'),
      mcq('Both written and keyboard assessment is used because:',
        [['You can explain what you cannot build and build what you cannot explain', true],
          ['Written assessment covers considerably more ground in each minute', false],
          ['Different areas suit different formats', false],
          ['Interviews use both formats', false]],
        'A graduate needs to be able to do both.'),
      mcq('The result is reported per area rather than as one number because:',
        [['Strong on APIs and weak on data structures is actionable and a total hides it', true],
          ['The different areas are weighted quite differently by different employers', false],
          ['A single number is harder to interpret', false],
          ['It allows partial re-sits by area', false]],
        'The shape of it is the point.'),
      mcq('Finding out you are weak now rather than in an interview:',
        [['Costs a fortnight of focused work rather than the interview', true],
          ['Allows the weakness to be hidden in your applications', false],
          ['Gives time to prepare a better explanation', false],
          ['Means the gap can be named honestly instead', false]],
        'And you will not be told which part it was.'),
    ],
    checkpoint: [
      mcq('Two sittings rather than one long one because:',
        [['A four-hour assessment measures stamina alongside everything else', true],
          ['It allows preparation between the two', false],
          ['Shorter sittings tend to produce rather more reliable scores', false],
          ['The areas divide naturally into two groups', false]],
        'Timed, like an interview.'),
      mcq('In the last week before it you should:',
        [['Not learn anything new, because it will displace something that stuck', true],
          ['Cover the areas not yet revised', false],
          ['Focus entirely on timed practice', false],
          ['Reread whichever of the units you personally found most difficult', false]],
        'Revise what you know is weak.'),
      mcq('A weak area in the result is:',
        [['The thing to work on, and knowing which one is the entire output', true],
          ['A reason to delay applying for roles', false],
          ['Balanced against whichever areas happened to score well', false],
          ['A gap to name in applications', false]],
        'Not a verdict on you — it is the next fortnight of work.'),
    ],
  },

  {
    unitCode: 'T3_VERIFICATION_SPECIALIZATION_VERIFICATION',
    notes: `**The direction you chose, at the depth somebody would hire for.**

## What "hiring depth" means

**Not that you know everything in the direction.** Nobody does.

**That you have built something real in it**, can explain the decisions, and know where the
edges of your knowledge are.

**And that a practitioner talking to you for twenty minutes would believe you have done the
work** — which is a higher bar than a written test and a lower one than expertise.

## What is measured, by direction

**Backend:** an API designed under constraint, a schema decision defended, concurrency or
integrity handled, and something operable.

**Frontend:** state that stays correct, accessibility, a performance problem measured and
fixed.

**Data:** a pipeline that runs repeatedly, data quality checks, an analysis with a conclusion
somebody could act on.

**Mobile:** state surviving a process kill, offline and sync, a release build on a device.

**Security:** a threat model tested against, a report somebody could act on, and honesty
about what was not covered.

**Full-stack:** the seam — a contract, a change across it, a deploy that does not break an
open tab.

**Cloud and ops, machine learning, software engineering:** the equivalent depth in each,
against what the track taught.

## The shape

**Part one: your capstone, examined.** The code read, the decisions questioned, the hard part
probed. **This is most of it** — because a thing you built and can defend is better evidence
than any exam, and the questions can go wherever the examiner wants.

**Part two: problems in the direction**, at the level a real interview would use.

**Part three: a conversation.** What you would do differently, where your knowledge ends,
what you would want to learn next.

## Part three is not a formality

**"Where does your knowledge end?" is a real question with a real answer**, and a candidate
who can give one is more trusted on everything else they said — for the reason the gaps unit
gave: **naming your own boundary is the most credible thing available, and it cannot be
faked.**

**"I have not worked with anything at real scale" is a good answer.** So is "I have deployed
to one platform and I do not know how much of that transfers".

## Preparing

**Re-read your own capstone code.** You will have forgotten parts of it, and being unable to
explain your own code is the worst outcome available here.

**Rehearse the four-sentence defence** for your three biggest decisions.

**Know your numbers.**

**And write down, honestly, the three things in your direction you are weakest on.** You will
be asked something adjacent to one of them, and having thought about it once is worth more
than an hour of revision.

## What a pass means

**That somebody in the industry, talking to you about your direction, would believe you can
do junior work in it.**

**Not that you are finished.** The first year of a job teaches more than this year did, and
the point of this verification is to confirm you are ready to start it — **which is a
specific claim, and it is the one employers are actually assessing.**`,
    mcqs: [
      mcq('Hiring depth means:',
        [['A practitioner talking to you for twenty minutes would believe you did the work', true],
          ['You know the direction comprehensively', false],
          ['You could work unsupervised in that area', false],
          ['Your knowledge matches what a fairly typical junior job description asks for', false]],
        'Higher than a written test, lower than expertise.'),
      mcq('The capstone examination is most of the assessment because:',
        [['A thing you built and can defend is better evidence than any exam', true],
          ['It covers the direction more completely', false],
          ['It is the work that the entire year has been building towards', false],
          ['It cannot be prepared for by revision', false]],
        'And the questions can go wherever the examiner wants.'),
      mcq('"Where does your knowledge end?" matters because:',
        [['Naming your own boundary is the most credible thing available and cannot be faked', true],
          ['It identifies what to learn in the first job', false],
          ['It tests self-awareness, which is a genuinely valuable professional trait', false],
          ['It gives the examiner somewhere to probe', false]],
        'A candidate who answers it is trusted more on everything else.'),
      mcq('The worst outcome available in this verification is:',
        [['Being unable to explain your own code', true],
          ['Failing the problems in the direction', false],
          ['Having no answer about where your knowledge ends', false],
          ['A capstone with a weak hard part', false]],
        'Re-read your own capstone code first.'),
    ],
    checkpoint: [
      mcq('"I have not worked with anything at real scale" is:',
        [['A good answer to where your knowledge ends', true],
          ['A weakness better phrased more positively', false],
          ['Too general to be useful to the examiner', false],
          ['True of every candidate, so not worth saying', false]],
        'So is not knowing how much of one platform transfers.'),
      mcq('Writing down your three weakest areas beforehand is worth:',
        [['More than an hour of revision, because you will be asked something adjacent', true],
          ['Preparing an honest answer well in advance of the closing conversation', false],
          ['Identifying what to revise in the time left', false],
          ['Showing the examiner you have reflected', false]],
        'Having thought about it once is the point.'),
      mcq('A pass means:',
        [['Somebody in the industry would believe you can do junior work in the direction', true],
          ['You have completed everything that the specialisation track asked of you', false],
          ['You are ready to work without supervision', false],
          ['Your capstone meets a professional standard', false]],
        'Not that you are finished — the first year of a job teaches more.'),
    ],
  },

  {
    unitCode: 'T3_VERIFICATION_READINESS_REVIEW',
    notes: `**The capstone, the portfolio and the interview work, reviewed together against
what an employer asks** — so that you leave the year knowing exactly where you stand and what
is next.

## Why the three together

**Because they fail independently and are assessed together.**

**A strong capstone with a portfolio nobody can find** gets no interviews.

**A good portfolio with a capstone you cannot explain** fails the technical round.

**And both of those with no interview practice** fails on the day, having got everything else
right.

**Nobody reviews all three at once**, which is why students routinely have two of the three
and cannot work out what is wrong.

## The review

**One: the evidence.** Your portfolio, timed at ninety seconds by somebody who has not seen
it. Does the best project land? Does the link work? Is the write-up specific about the hard
part?

**Two: the work.** Your capstone, examined. Can you explain every line? Are the decisions
defensible? Is the hard part real?

**Three: the interview.** A technical mock and a behavioural mock, scored against the same
lists the mock units used.

**Four: the gaps.** Your honest self-assessment against a real job description — a specific
one, for a role you would apply to.

## The output

**Not a grade. Four things:**

**Where you are strong**, with the evidence that shows it. **This is not flattery** — you will
need to say it in an interview and most people cannot without a list in front of them.

**Where you are weak**, specifically, per area.

**What to do next**, ordered, with the first item being something you could start tomorrow.

**And whether you are ready to apply**, with a reason. **Which is usually yes with
qualifications** — the bar for applying is much lower than the bar for being the best
candidate, and students routinely delay applying for months in pursuit of a readiness that
does not arrive on its own.

## What "ready" actually means

**A working demo somebody can open.**

**A repository whose history shows the work.**

**A project you can explain every line of.**

**Six behavioural stories written down.**

**And the ability to sit forty-five minutes of technical interview without going silent.**

**That is the list.** It is achievable, it is what this year built, and **it is a much shorter
list than the one most students have in their heads.**

## After the review

**Do the first item on the list within a week**, while the review is fresh. **A readiness
review acted on in the first week is worth several that were filed**, and the first week is
when it either becomes work or becomes a document.

**Then apply.** Not when you feel ready — **you will not — but when the five things above are
true**, which is a condition you can check rather than a feeling you can wait for.

**And come back to the list after ten applications.** What you learned from the responses,
and the silences, changes what should be on it.`,
    mcqs: [
      mcq('The three are reviewed together because:',
        [['They fail independently and are assessed together', true],
          ['Each takes less time as part of one review', false],
          ['They share the same underlying evidence', false],
          ['Employers assess them in the same interview', false]],
        'Nobody reviews all three at once.'),
      mcq('Naming where you are strong is included because:',
        [['You will need to say it in an interview and most cannot without a list', true],
          ['It balances the assessment of weaknesses', false],
          ['It identifies which roles to target', false],
          ['Strengths are generally rather easier to build on than gaps are', false]],
        'This is not flattery.'),
      mcq('The answer to "are you ready to apply" is usually:',
        [['Yes with qualifications, because the bar for applying is lower than for winning', true],
          ['Entirely dependent on which specific roles are actually being targeted here', false],
          ['No until the weakest area has been addressed', false],
          ['Yes, once the capstone is complete', false]],
        'Students delay for months in pursuit of a readiness that does not arrive.'),
      mcq('The readiness list is:',
        [['Much shorter than the one most students have in their heads', true],
          ['Demanding but achievable within the year', false],
          ['A minimum that most employers expect', false],
          ['Focused on the evidence rather than on the knowledge', false]],
        'Demo, history, explainable project, six stories, forty-five minutes without silence.'),
    ],
    checkpoint: [
      mcq('A strong capstone with a portfolio nobody can find:',
        [['Gets no interviews', true],
          ['Fails at the technical round', false],
          ['Succeeds through referrals instead', false],
          ['Is recoverable in the covering letter', false]],
        'The three fail independently.'),
      mcq('The first item on the next-steps list should be:',
        [['Something you could start tomorrow', true],
          ['The weakest area from the verification', false],
          ['Whatever takes the longest to complete', false],
          ['The gap most relevant to your target roles', false]],
        'Do it within a week, while the review is fresh.'),
      mcq('Apply when:',
        [['The five things are true, which is a condition you can check', true],
          ['You feel ready, which the review should establish', false],
          ['Every weak area has been addressed', false],
          ['The capstone and the portfolio have both been reviewed', false]],
        'Rather than a feeling you can wait for.'),
    ],
  },
];
