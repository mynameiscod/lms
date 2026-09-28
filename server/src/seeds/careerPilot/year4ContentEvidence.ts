/**
 * T4_PORTFOLIO, T4_RESUME and T4_APPLICATIONS — twelve units. Module P21.
 *
 * ── THE MODULE THAT DECIDES WHETHER ANY OF THE OTHERS GET USED ────────────────────────────
 *
 * Everything else in Year 4 improves what happens once a candidate is in the room. This module
 * decides whether they get there. A student with a strong Year-4 capability and a resume that is
 * filtered out in six seconds has spent a year on rounds they will not sit.
 *
 * ── THE CONSTRAINT THAT SHAPES ALL OF IT ──────────────────────────────────────────────────
 *
 * The reviewer is fast and bored. A resume gets somewhere between six and thirty seconds; a GitHub
 * profile gets about ninety. Every unit here is written against that constraint rather than
 * against what would be fair, because the constraint is real and the fairness is not on offer.
 *
 * ── THE HONESTY RULE, WHICH IS NOT SENTIMENTAL ────────────────────────────────────────────
 *
 * Nothing in this module teaches inflation, and not because inflation is distasteful. It is that
 * a resume is a list of things you will be questioned on for ten minutes, and an inflated claim
 * converts a strong technical round into a credibility problem. The tailoring taught here is
 * selection and emphasis of true things, which is both effective and survivable.
 *
 * Attribution: T4_PORTFOLIO defaults to PORTFOLIO_BUILDING with the cleanup unit also on
 * GIT_FUNDAMENTALS; T4_RESUME and T4_APPLICATIONS on RESUME_WRITING, with the applications
 * tracking unit on PLACEMENT_READINESS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const EVIDENCE_BUNDLES: PilotBundle[] = [
  /* ══ T4_PORTFOLIO ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_PORTFOLIO_WHAT_A_REVIEWER_LOOKS_AT',
    notes: `**What somebody actually opens, in what order, and what they conclude from each.**

## The ninety seconds, in order

**The profile page.** Pinned repositories, the contribution graph, the bio. **Five seconds**, and
it decides whether there is a second step.

**One repository, usually the first pinned one.** **The README, first.** If there is no README they
frequently stop — not out of strictness, but because reading unexplained code costs more than the
review is worth.

**The commit history.** Not the code. **How many commits, over what period, saying what.** Three
commits on one day says the repository was uploaded rather than built.

**Then, if still interested, one file.** Usually the largest or the one the README pointed at.

## What each step concludes

**No pinned repositories** says the profile was never curated, so the reviewer is looking at
whatever happens to be recent — frequently a tutorial follow-along.

**A flat contribution graph with one dense week** says a semester project, which is fine and is
what it says.

**"Initial commit" and nothing else** says the work happened elsewhere and was uploaded once, and
the reviewer now cannot assess the process at all.

**Commit messages saying "update", "fix", "update2"** say the discipline was not there — **and this
is checkable evidence against whatever you claimed about your commit discipline in the interview**,
which makes it one of the few claims that can be disproved.

## What is NOT looked at

**Code quality, mostly.** Nobody reads a thousand lines in ninety seconds.

**The star count.** For a student profile it is noise.

**The number of repositories.** **Four good ones beat twenty**, and twenty with sixteen abandoned
is actively worse than four, because the reviewer's sample is random.

## The conclusion worth internalising

**The reviewer is not assessing your ability. They are assessing the evidence of your ability**,
and those are different things that you control separately.

**A capable student with an unreadable profile is indistinguishable from an incapable one at ninety
seconds**, which is unfair and is the condition.`,
    mcqs: [
      mcq('A reviewer who finds no README frequently stops, not out of strictness but because:',
        [['Reading unexplained code costs more than the review is worth', true],
         ['An absent README suggests the project is unfinished', false],
         ['The repository is assumed to be a tutorial copy', false],
         ['Other candidates have provided one', false]],
        'At ninety seconds per profile the effort of reconstructing the purpose from source is simply not available.'),
      mcq('Twenty repositories with sixteen abandoned is actively worse than four good ones because:',
        [['The reviewer’s sample is random', true],
         ['Abandoned work suggests poor follow-through', false],
         ['The profile takes longer to assess', false],
         ['The good ones are harder to find', false]],
        'Whichever repository is opened represents the profile, so a high proportion of weak ones makes a poor impression likely.'),
    ],
    checkpoint: [
      mcq('Commit messages saying "update" and "update2" are one of the few claims that can be disproved because they are:',
        [['Checkable evidence against what you said about commit discipline', true],
         ['Visible before the code is examined', false],
         ['A sign the repository was uploaded in one go', false],
         ['Recorded with timestamps the reviewer can see', false]],
        'The history is public and permanent, so a stated practice that it contradicts is directly refuted rather than merely doubted.'),
      mcq('The reviewer is assessing the evidence of your ability rather than your ability, which means a capable student with an unreadable profile is:',
        [['Indistinguishable from an incapable one at ninety seconds', true],
         ['Likely to be given more time to explain', false],
         ['Assessed on the interview performance instead', false],
         ['Penalised only if other candidates prepared better', false]],
        'The two are controlled separately, and only the evidence is available in the time the review actually takes.'),
    ],
  },
  {
    unitCode: 'T4_PORTFOLIO_README_AND_DEMO',
    notes: `**The two things that decide whether a repository is assessed at all.**

## The README, in the order it is read

**One sentence saying what it is.** Not what it uses. "An attendance system for a club of a hundred
and fifty people" — **a reviewer who reads only this line has learned something.**

**A screenshot or a GIF.** **The highest-value item per byte of effort in the entire document**,
because it establishes in one second that the thing exists and works — which is otherwise the
reviewer's main uncertainty.

**How to run it.** Three or four commands that actually work on a clean machine. **Test them on a
clean machine**, because a README that fails at step two is worse than none: it demonstrates that
nobody ever tried it.

**What is interesting about it.** Two or three lines on the hard part. "The hard part was two
people editing the same record — it resolves by version and tells the loser what changed." **This
is the part that gets a repository looked at properly** and it is the part almost no student
README has.

**What you would change.** Short, honest, and it signals that the work was examined rather than
abandoned.

## What does not belong

**A tutorial-length installation guide** for standard tooling.

**A feature list of twenty bullets.** Nobody reads past four.

**"Contributions welcome"** on a student project, which reads as a template rather than a decision.

## The demo

**A deployed link is worth more than the rest of the README combined**, because it removes every
obstacle between the reviewer and the working thing.

**Free hosting is adequate.** A slow first load after idling is fine; note it in one line so it is
not mistaken for a broken link.

**If it cannot be deployed** — a desktop tool, something needing credentials — **a thirty-second
recording is the substitute**, and it is nearly as good.

**And if neither, then the screenshot is not optional**, because the reviewer otherwise has only a
claim.

## The proportion worth internalising

**Twenty minutes on a README changes how a project is received more than twenty hours on the code
does**, at the review stage. That is not a statement about what matters in engineering; it is a
statement about what is visible in ninety seconds.`,
    mcqs: [
      mcq('The screenshot is the highest-value item per byte of effort because it establishes in one second that the thing exists and works, which is otherwise:',
        [['The reviewer’s main uncertainty', true],
         ['Apparent from the commit history', false],
         ['Confirmed by the installation steps', false],
         ['Assumed for any completed project', false]],
        'A repository is a claim until something demonstrates the result, and a picture resolves that faster than any amount of text.'),
      mcq('A README that fails at step two is worse than none because it demonstrates:',
        [['That nobody ever tried it', true],
         ['A lack of attention to documentation', false],
         ['The project has unstated dependencies', false],
         ['The author used a different environment', false]],
        'Broken instructions prove the steps were written from memory rather than verified, which casts doubt on the rest of the claims.'),
    ],
    checkpoint: [
      mcq('The section on what is interesting about the project is described as the part that gets a repository looked at properly, and it is the part:',
        [['Almost no student README has', true],
         ['Reviewers skip when time is short', false],
         ['Most difficult to write honestly', false],
         ['That duplicates the code comments', false]],
        'Its rarity means it distinguishes immediately, and it gives the reviewer a specific reason to spend more than the default ninety seconds.'),
      mcq('Twenty minutes on a README changing reception more than twenty hours on the code is described as a statement not about what matters in engineering but about:',
        [['What is visible in ninety seconds', true],
         ['How reviewers prefer to spend their time', false],
         ['The relative difficulty of the two tasks', false],
         ['Which skills employers actually value', false]],
        'The claim is about the review stage specifically, where only what can be perceived quickly has any effect.'),
    ],
  },
  {
    unitCode: 'T4_PORTFOLIO_CLEANING_THE_REPOSITORY',
    notes: `**Commit history, dead branches, committed secrets and the four repositories that
should be private.**

## The secrets, first, because they are the only urgent item

**Search your history for keys.** An API key, a database password, a token — committed once and
still present in the history even if a later commit removed it.

**If you find one: rotate it.** Removing it from history is housekeeping; **the value is already
exposed and the only fix that matters is invalidating it.**

**Getting this backwards is a security answer rather than a Git one**, and an interviewer who spots
a live key in your history has learned something they will weight heavily.

**Then add a \`.gitignore\`** and move configuration to environment variables, which is the actual
prevention.

## What to make private

**Coursework submitted for assessment**, which may be an academic integrity issue and is not your
decision to publish.

**Tutorial follow-alongs.** They are somebody else's work in your account, and a reviewer sampling
randomly may land on one.

**Abandoned experiments with three commits.** They contribute nothing and dilute the sample.

**Anything you cannot answer questions about.** **If it is public it is claimed**, and a repository
you cannot explain is a liability rather than a neutral.

## The commit history

**You cannot rewrite the past, and you should not try.** A history of "update" messages on an old
project is what it is.

**What you can do is make the next thirty commits different**, because a reviewer looking at recent
activity sees those. **The visible improvement is more credible than a clean rewrite would be**,
and it is also true.

## Branches and clutter

**Delete merged branches.** Six stale feature branches read as abandonment.

**Remove committed build output, \`node_modules\`, \`.env\` files and IDE folders.** All four say the
\`.gitignore\` was never written, which is a small thing that is visible immediately.

## Pinning

**Six slots. Use four.** Your best work, most recent first, each with a README that passes the
previous unit's bar.

**Pinning is the single highest-leverage action in this unit** — it takes two minutes and it
determines what the five-second glance sees.`,
    mcqs: [
      mcq('Finding a committed key means rotating it, because removing it from history is housekeeping and:',
        [['The value is already exposed', true],
         ['The history may exist in other clones', false],
         ['Rewriting history breaks other contributors', false],
         ['The removal itself draws attention to it', false]],
        'Anybody who saw the earlier commit holds the secret, so invalidation is the only action that changes the situation.'),
      mcq('A repository you cannot answer questions about is a liability rather than a neutral because:',
        [['If it is public it is claimed', true],
         ['Reviewers assume unexplained work is copied', false],
         ['It occupies a pinned slot unnecessarily', false],
         ['Old code reflects outdated practice', false]],
        'Publishing it presents it as your work, so being unable to discuss it becomes a problem in exactly the way an absent repository would not.'),
    ],
    checkpoint: [
      mcq('Making the next thirty commits different is preferred to rewriting history because the visible improvement is:',
        [['More credible than a clean rewrite, and also true', true],
         ['Faster to achieve than rewriting would be', false],
         ['Less likely to break existing clones', false],
         ['What reviewers specifically look for', false]],
        'A genuine change in recent practice is what a reviewer examines, and it represents the discipline rather than concealing its absence.'),
      mcq('Pinning is the single highest-leverage action in the unit because it takes two minutes and determines:',
        [['What the five-second glance sees', true],
         ['Which repositories are indexed by search', false],
         ['How the contribution graph is read', false],
         ['Whether the profile appears curated', false]],
        'The glance is the step that decides whether there is a second one, and pinning controls its entire content.'),
    ],
  },
  {
    unitCode: 'T4_PORTFOLIO_PRACTICE',
    notes: `**Your actual profile, reviewed against what a reviewer looks for.**

## The drill

**Give somebody your profile link and ninety seconds. Then take it away and ask four questions.**

**"What does this person build?"** **"Which project would you ask about?"** **"Did anything look
unfinished?"** **"Would you take the interview?"**

**The taking-away matters** — an answer given with the profile still open is an answer given with
more time than a real reviewer has.

## Who to ask

**Somebody who does not know your work.** A classmate from another branch, a friend, anybody
literate. **They do not need to be technical**, because none of the four questions requires reading
code.

**Two people is better than one**, because the random sample is the thing being tested.

## What the answers mean

**"I could not tell what they build"** — the pinned set is incoherent or absent. The most common
finding.

**They named a project you would not have chosen** — your pinning is wrong, and that is a
two-minute fix.

**"Something looked unfinished"** — a README, a dead branch, or a repository with two commits. Ask
which.

**"Probably not"** — the profile is not the problem to solve first; it is the evidence that it is
the problem, and the next three items on the checklist are where the work is.

## The self-audit, before asking anybody

**Open your own profile in a private window**, so you see it as a stranger does rather than as the
owner. **The difference is larger than people expect** — the logged-in view shows you things a
visitor does not have.

## The checklist to work through afterwards

**Four repositories pinned. Each with a one-sentence description and a screenshot. No secrets in
any history. No \`node_modules\` committed. Coursework and tutorials private. Merged branches
deleted. A bio saying what you do in one line.**

**Seven items, one afternoon.** **This is the highest return-per-hour work in Year 4**, and it is
the work most reliably postponed, because none of it feels like engineering.`,
    mcqs: [
      mcq('Taking the profile away before asking the four questions matters because an answer given with it still open is:',
        [['An answer given with more time than a real reviewer has', true],
         ['Influenced by what the reviewer sees last', false],
         ['More detailed than the drill requires', false],
         ['Harder to compare between reviewers', false]],
        'The drill simulates a ninety-second impression, and continued access converts it into an inspection instead.'),
      mcq('Two reviewers are better than one because the thing being tested is:',
        [['The random sample', true],
         ['The consistency of the impression', false],
         ['Whether technical background matters', false],
         ['How long the review actually takes', false]],
        'A real reviewer opens whichever repository they happen to, so the variation between reviewers is itself the measurement.'),
    ],
    checkpoint: [
      mcq('Opening your own profile in a private window shows a difference larger than people expect because the logged-in view:',
        [['Shows you things a visitor does not have', true],
         ['Renders the README differently', false],
         ['Includes private repositories by default', false],
         ['Orders the repositories by recent activity', false]],
        'The owner sees additional context and controls, so the logged-in impression is not the one a reviewer receives.'),
      mcq('This is called the highest return-per-hour work in Year 4 and the most reliably postponed because:',
        [['None of it feels like engineering', true],
         ['It cannot be done before the projects exist', false],
         ['Its effect is impossible to measure', false],
         ['It has to be repeated before each application', false]],
        'The work is curation and writing rather than building, so it is consistently displaced by tasks that feel more like the real thing.'),
    ],
  },

  /* ══ T4_RESUME ══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_RESUME_ONE_PAGE',
    notes: `**What goes on a graduate resume, in what order, and the sections that are costing you
room.**

## One page, and why it is not negotiable at this stage

**A graduate resume gets between six and thirty seconds.** A second page is not read, and its
existence suggests the first one was not edited.

**Three years of study and projects fits on one page.** If it does not, the problem is selection
rather than space.

## The order

**Contact.** Name, email, phone, GitHub, LinkedIn. **One line.** An email that is your name.

**Education.** Degree, institution, year, CGPA if it helps you. **Two lines.** **Move it below
projects if your projects are stronger than your marks**, which for many candidates they are.

**Skills.** Grouped, honest, and **nothing you would not want questioned** — the skills line is
where inflation happens and where it is cheapest to detect.

**Projects.** **The section that does the work.** Two or three, each with what it is, what you
built, and one concrete outcome.

**Experience.** Internships, freelance, teaching assistance. If none, the section simply does not
appear; an empty heading advertises the gap.

**Then, only if there is room:** achievements, certifications, positions of responsibility.

## What is costing you room

**An objective statement.** "Seeking a challenging role in a reputed organisation where I can
utilise my skills." **It says nothing, every resume has it, and it costs three lines at the top —
the most valuable space on the page.**

**Hobbies.** Unless one is relevant, which it occasionally genuinely is.

**Declaration and signature.** A convention that has passed, and it costs two lines.

**Date of birth, father's name, marital status, photograph.** Not asked for, and in several markets
actively unhelpful.

**School marks.** Your tenth and twelfth results are not what you are being hired on.

## What to do with the space that frees

**A third project, or a second bullet on the two you have.** **Both are worth more than everything
in the previous section combined.**

## The formatting rules

**One column, standard font, black text.** Automated filters mishandle multi-column layouts, and a
resume that parses wrongly is rejected by something that never read it.

**No photograph unless the market expects one.** **No skill rating bars** — "Python: four stars out
of five" means nothing and invites the question of what the fifth star would have been.`,
    mcqs: [
      mcq('The objective statement is the first thing to cut because it says nothing, every resume has it, and it costs three lines at:',
        [['The most valuable space on the page', true],
         ['A point where the reviewer is still deciding', false],
         ['The section automated filters scan first', false],
         ['The place where the name should appear', false]],
        'The top of the page is what a six-second scan certainly sees, so occupying it with a generic sentence wastes the only guaranteed attention.'),
      mcq('Multi-column layouts are avoided because automated filters mishandle them, and a resume that parses wrongly is:',
        [['Rejected by something that never read it', true],
         ['Ranked lower than correctly parsed ones', false],
         ['Returned to the candidate for correction', false],
         ['Reviewed manually at a later stage', false]],
        'The filter operates before any human sees it, so a parsing failure removes the application without the content being considered.'),
    ],
    checkpoint: [
      mcq('Education is moved below projects when the projects are stronger than the marks, which for many candidates:',
        [['They are', true],
         ['Is true only with internship experience', false],
         ['Depends on the company’s cutoff policy', false],
         ['Applies after the first year of work', false]],
        'Built work demonstrates capability directly, and for a substantial share of graduates it is the stronger evidence of the two.'),
      mcq('Skill rating bars are discouraged because "Python: four stars out of five" means nothing and:',
        [['Invites the question of what the fifth star would have been', true],
         ['Cannot be parsed by automated filters', false],
         ['Takes more space than a plain list', false],
         ['Suggests the skills were self-assessed', false]],
        'The scale has no defined endpoints, so it produces a question the candidate cannot answer rather than information the reviewer can use.'),
    ],
  },
  {
    unitCode: 'T4_RESUME_CLAIMS_THAT_CHECK_OUT',
    notes: `**A resume is a list of things you will be asked to prove. Writing it that way from the
start.**

## The reframe

**Every line is a question you have invited.**

**Which makes the test simple: for each bullet, could you talk about it for ten minutes under
follow-up?** If not, it is either a liability or it needs to be more precise.

## What a weak bullet looks like

**"Developed a web application using React and Node.js."**

**It says what technologies were present**, which the skills section already covered. It does not
say what the application did, what you built, or what happened.

## What a strong one looks like

**"Attendance system for a 150-member club; built the backend and CSV export; replaced a shared
spreadsheet that was losing edits."**

**What it is, what you did, what changed.** And every clause is checkable — **which is the point,
not a risk.**

## Numbers, where they are honest

**"150 members" is better than "many users".** **"Reduced report generation from 40 seconds to 2"
is better than "improved performance".**

**And inventing them is the fastest way to fail a round**, because a number invites the arithmetic
question. "How did you measure that?" has an answer if you measured it and does not if you did not.

**Where there is no number, say the concrete thing instead.** "Replaced a spreadsheet three people
were editing simultaneously" has no metric and is completely specific.

## The skills section, where inflation concentrates

**Listing a language you used once in a tutorial is a bet that nobody asks.** They frequently do,
and it is the cheapest possible place to lose credibility — the cost of the honest version is one
line shorter, and the cost of the dishonest one is the round.

**Group them by what is true:** what you have built with, what you have used, what you have touched.
**Or just list the first group.**

## The uncomfortable audit

**Go through your current resume line by line and mark each: could defend for ten minutes, could
defend for two, could not defend.**

**Everything in the third group comes off.** **Everything in the second gets more specific or comes
off.**

**Most candidates find two or three in the third group**, and every one of them is a round waiting
to go wrong.`,
    mcqs: [
      mcq('"Developed a web application using React and Node.js" is weak because it says what technologies were present, which:',
        [['The skills section already covered', true],
         ['Is not what the reviewer scans for', false],
         ['Overstates the candidate’s involvement', false],
         ['Applies to most graduate projects', false]],
        'The bullet duplicates information already on the page instead of supplying what the project did and what the candidate built.'),
      mcq('Every clause in a strong bullet being checkable is described as:',
        [['The point, not a risk', true],
         ['Acceptable provided the claims are modest', false],
         ['A consequence of including numbers', false],
         ['Necessary only for internship entries', false]],
        'Checkability is what makes a claim worth anything, since an unverifiable one gives the reviewer nothing to act on.'),
    ],
    checkpoint: [
      mcq('Inventing a number is the fastest way to fail a round because a number invites:',
        [['The arithmetic question', true],
         ['Comparison with other candidates', false],
         ['A request for supporting documentation', false],
         ['Scrutiny of the whole project', false]],
        '"How did you measure that?" is answerable only by somebody who actually measured, and the absence is immediately apparent.'),
      mcq('Listing a language used once in a tutorial is a bet that nobody asks, and it is the cheapest place to lose credibility because the honest version costs:',
        [['One line shorter, where the dishonest one costs the round', true],
         ['Nothing, since skills are rarely probed', false],
         ['A skill the filter may be searching for', false],
         ['Space that a project bullet could use', false]],
        'The asymmetry is extreme: omitting it forfeits almost nothing, and being caught on it damages every other claim.'),
    ],
  },
  {
    unitCode: 'T4_RESUME_MATCHING_A_JOB_DESCRIPTION',
    notes: `**Reading what a posting is actually asking for, and tailoring honestly rather than
keyword-stuffing.**

## Reading the posting properly

**Three passes.**

**First: what do they actually need somebody to do?** Usually two or three things, buried in a list
of twelve.

**Second: which requirements are real?** "Bachelor's degree" is real. "3+ years experience" on a
graduate posting is frequently aspirational. **"Familiarity with cloud platforms" is a preference;
"must be able to work in a regulated environment" is a constraint.**

**Third: what vocabulary do they use?** Not to stuff it in — to describe your own work in terms they
already recognise, which is a real and legitimate benefit.

## Tailoring, which is selection and emphasis

**Reorder the projects** so the most relevant one is first.

**Rewrite one or two bullets** to lead with the aspect that matches. The same project honestly
described two ways: "built the backend and the export" for a backend role, "built the interface and
handled the offline case" for a frontend one. **Both true, different emphasis.**

**Reorder the skills** so theirs appear first among the true ones.

**That is the whole technique.** It takes fifteen minutes per application and it is not the same
activity as inventing experience.

## Keyword stuffing, and why it fails twice

**A hidden block of white-text keywords, or a skills list copied from the posting.**

**It fails at the filter** more often than people think, because parsers see the text and rankers
notice the density.

**And when it works it fails worse**, because the candidate now has an interview built on a match
they cannot substantiate, and the round goes wrong in a way that is remembered.

## The requirement you do not meet

**Apply anyway, in most cases.** Graduate postings list an ideal and hire from the applicants.

**And do not draw attention to the gap in the resume.** **If asked, the answer is what you have done
that is adjacent and how fast you have picked things up before** — which is a real answer, and it
is the one the question wants.

## The honest limit of tailoring

**It changes which true things are visible and in what order. It does not change what is true**, and
a candidate who forgets that distinction has stopped tailoring and started something else.`,
    mcqs: [
      mcq('Reading the posting for its vocabulary is legitimate because the purpose is to describe your own work in terms:',
        [['They already recognise', true],
         ['The filter is configured to match', false],
         ['That sound more senior than yours', false],
         ['Used across the whole industry', false]],
        'Matching the reader’s language makes true claims legible to them, which is different from claiming things because of the language.'),
      mcq('Keyword stuffing fails twice, and the second failure is worse because the candidate now has an interview built on:',
        [['A match they cannot substantiate', true],
         ['Expectations set by the posting', false],
         ['Skills listed in the wrong order', false],
         ['A filter result rather than a review', false]],
        'The round then goes wrong in a way that is remembered, which costs more than not having reached it.'),
    ],
    checkpoint: [
      mcq('The same project described as "built the backend and the export" or "built the interface and handled the offline case" demonstrates that tailoring is:',
        [['Selection and emphasis of true things', true],
         ['Acceptable when the role is closely related', false],
         ['A way of broadening a narrow project', false],
         ['Most effective on the skills section', false]],
        'Both descriptions are accurate, and what changes is which accurate aspect is made visible first.'),
      mcq('Asked about a requirement you do not meet, the answer is what you have done that is adjacent and how fast you have picked things up before, which is:',
        [['A real answer, and the one the question wants', true],
         ['A deflection that most interviewers accept', false],
         ['Only convincing with a concrete example', false],
         ['Better than admitting the gap directly', false]],
        'The question is about whether the gap can be closed, so evidence of adjacent work and learning speed addresses it directly.'),
    ],
  },
  {
    unitCode: 'T4_RESUME_PRACTICE',
    notes: `**Your own document, a real description, and the gap between them.**

## The drill

**Your current resume, one real posting you would actually apply to, ninety minutes.**

## Step one: the six-second test

**Give it to somebody for six seconds, then take it away and ask: what does this person do, and
what is their strongest thing?**

**If they cannot answer either, the top third of the page is wrong** — which is where an objective
statement or an over-long education section usually is.

## Step two: the ten-minute audit

**Every bullet marked: could defend for ten minutes, for two, or not at all.**

**The third group comes off.** No exceptions, and this is the step people negotiate with themselves
about.

## Step three: the posting

**Three passes** — what they need done, which requirements are real, what vocabulary they use.

**Then reorder and rewrite.** Fifteen minutes. **Nothing untrue gets added**, which is the
constraint that makes the exercise honest and also makes it defensible in the round that follows.

## Step four: the questions it invites

**Hand the tailored version to somebody and have them ask three questions from it.**

**If any question is uncomfortable, that line is wrong** — either imprecise or overstated, and both
are fixable now and not fixable in the round.

## Step five: the parse check

**Save as PDF, then copy the text out of it.** If the result is jumbled, a filter will read that
jumble.

**This catches multi-column layouts, text boxes and unusual fonts**, and it takes thirty seconds.

## What usually comes out

**Two or three undefendable lines**, almost always in the skills section.

**And a first third of the page carrying nothing** — which is the highest-value fix available and
the one nobody makes unprompted, because that section looks like what a resume is supposed to have.

## After this

**Keep one master version and tailor from it.** Re-auditing from scratch per application is why
people stop tailoring after the third one.`,
    mcqs: [
      mcq('If a six-second reader cannot say what you do or what your strongest thing is, the problem is located in:',
        [['The top third of the page', true],
         ['The ordering of the project bullets', false],
         ['The level of technical detail used', false],
         ['The length of the whole document', false]],
        'Six seconds reaches only the beginning, so a failed impression is caused by whatever occupies that space.'),
      mcq('If a question from the tailored resume is uncomfortable, that line is either imprecise or overstated, and both are:',
        [['Fixable now and not fixable in the round', true],
         ['Signs the project should be removed', false],
         ['Acceptable if the rest is strong', false],
         ['Best addressed by adding context', false]],
        'The discomfort is a preview of the real follow-up, and the only opportunity to act on it is before the document is sent.'),
    ],
    checkpoint: [
      mcq('Copying the text out of the saved PDF catches multi-column layouts, text boxes and unusual fonts, and matters because if the result is jumbled:',
        [['A filter will read that jumble', true],
         ['The formatting will look wrong when printed', false],
         ['The file size will be unnecessarily large', false],
         ['Some sections may be omitted entirely', false]],
        'The extracted text is what automated screening sees, so its legibility determines whether the application is parsed correctly.'),
      mcq('Keeping one master version and tailoring from it matters because re-auditing from scratch per application is why:',
        [['People stop tailoring after the third one', true],
         ['Errors are introduced into later versions', false],
         ['Applications take longer than they should', false],
         ['The strongest bullets are gradually lost', false]],
        'The cost per application becomes high enough that the practice is abandoned, which forfeits its benefit entirely.'),
    ],
  },

  /* ══ T4_APPLICATIONS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_APPLICATIONS_WHERE_TO_APPLY',
    notes: `**Campus drives, off-campus, referrals and the postings that are not real. Eligibility
read properly.**

## The four routes, and their actual proportions

**Campus placement.** Highest conversion, lowest effort per application, and the least control. If
your institution has drives, this is the primary route and everything else is a supplement.

**Off-campus applications.** Company career pages and job boards. **High volume, low response
rate** — a single-digit percentage is normal and is not a signal about you.

**Referrals.** **The highest conversion of the four by a wide margin**, and the most
underused by students who believe they have no network.

**You do have one:** seniors from your institution now working, people from an internship, anybody
who has seen your work. **A referral request is a short specific message**, not an imposition: what
role, why you fit, resume attached, and an explicit "no problem if not".

**Hackathons, open source and contests**, which occasionally produce a direct route and should be
treated as a bonus rather than a plan.

## Reading eligibility properly

**The cutoffs are usually firm.** CGPA, backlogs, year of passing, branch. **A drive stating 7.0
means 7.0**, and applying under it wastes the slot rather than testing the boundary.

**The soft ones:** "preferred skills", "3+ years" on a graduate posting, "familiarity with X".

**Read the difference carefully**, because getting it wrong in one direction wastes applications and
in the other forfeits ones you would have got.

## Postings that are not real

**Reposted every month for a year.** Either filled or a pipeline exercise.

**Asking for payment**, for training, for a security deposit. **Always a scam, without exception.**

**No company name.** Sometimes a legitimate agency; frequently a data collection exercise.

**Wildly wide salary ranges with vague requirements.** Usually a consultancy building a bench.

**Twenty required skills for a graduate role** with no coherent focus, which suggests nobody
defined the job.

## The volume question

**Quality against quantity is a false choice at this stage.** **Fifty considered applications beats
five hundred generic ones and beats five perfect ones**, and the second failure — too few, too
polished — is as common as the first and takes longer to recover from because the calendar has moved.`,
    mcqs: [
      mcq('A single-digit response rate on off-campus applications is normal and is:',
        [['Not a signal about you', true],
         ['A reason to reduce the volume', false],
         ['Evidence the resume needs rewriting', false],
         ['Higher than most candidates achieve', false]],
        'The base rate for unreferred applications is low for everybody, so individual rejections carry little information.'),
      mcq('A posting asking for payment for training or a security deposit is:',
        [['Always a scam, without exception', true],
         ['Legitimate for some training programmes', false],
         ['Worth checking against the company website', false],
         ['Common in certain smaller companies', false]],
        'No legitimate employer charges a candidate to be hired, so the request identifies the posting regardless of its other details.'),
    ],
    checkpoint: [
      mcq('Fifty considered applications beats five hundred generic ones and beats five perfect ones, and the second failure takes longer to recover from because:',
        [['The calendar has moved', true],
         ['Fewer companies remain available', false],
         ['The perfected applications cannot be reused', false],
         ['Confidence drops after each rejection', false]],
        'Time spent over-polishing a handful cannot be recovered once the hiring season has passed.'),
      mcq('A drive stating a 7.0 cutoff means 7.0, and applying under it:',
        [['Wastes the slot rather than testing the boundary', true],
         ['Occasionally succeeds with a strong resume', false],
         ['Is worth doing if the branch matches', false],
         ['Signals interest for future openings', false]],
        'Hard eligibility criteria are applied mechanically before any review, so the application consumes an opportunity without being read.'),
    ],
  },
  {
    unitCode: 'T4_APPLICATIONS_TRACKING_IT',
    notes: `**Deadlines, rounds, follow-ups — and the spreadsheet that stops one from quietly
lapsing.**

## Why this needs a system rather than memory

**Because the failure is silent.** An application you forgot to follow up on does not notify you;
it simply never becomes anything, and you will not know which one it was.

**Twenty applications across six weeks, each with two to five rounds at unpredictable intervals**,
is past what anybody tracks in their head — and the cost of the one that lapses is an entire
opportunity.

## The columns

**Company. Role. Applied on. Route — campus, off-campus, referral, and who referred. Status.
Next action. Next action date. Notes.**

**Eight columns, one spreadsheet.**

**"Next action date" is the one that does the work.** Everything else is record-keeping; that column
is the thing you look at each morning, and it is why the system works.

## The statuses worth distinguishing

**Applied. Acknowledged. Test scheduled. Test done. Interview scheduled. Interviewed. Offer.
Rejected. No response.**

**"No response" after three weeks is distinct from "rejected"**, and keeping them apart tells you
something about where applications are actually dying — which route, which kind of company, which
stage.

## The notes column, which repays itself

**Who you spoke to, what they asked, what you said you would send.**

**Six weeks later you will not remember**, and arriving at a third round having forgotten the second
interviewer's name is a small avoidable cost.

**And the questions you were asked accumulate into the most accurate preparation material you will
have**, because it is from the companies actually hiring you.

## The weekly review

**Fifteen minutes. Anything with a next-action date passed, anything with no next action, anything
silent for three weeks.**

**Applications do not fail loudly**, which is exactly why a scheduled review catches what attention
does not.

## What tracking also gives you

**A rate.** Applied against responses against interviews against offers.

**If fifty applications produce no response, the problem is the resume or the targeting, not
persistence.** **Without the numbers that diagnosis is unavailable**, and the default assumption —
apply more — is frequently the wrong one.`,
    mcqs: [
      mcq('This needs a system rather than memory because the failure is silent: an application you forgot to follow up on:',
        [['Never becomes anything, and you will not know which one', true],
         ['Is usually rejected before you notice', false],
         ['Can be restarted at any later point', false],
         ['Produces a response after a longer delay', false]],
        'Nothing signals the lapse, so the loss is invisible and unattributable unless it was being tracked.'),
      mcq('Keeping "no response" distinct from "rejected" tells you where applications are actually dying — which route, which kind of company, and:',
        [['Which stage', true],
         ['How long each company takes', false],
         ['Whether the cutoffs were met', false],
         ['Which referrals were most effective', false]],
        'The pattern across stages identifies whether the problem is the resume, the tests or the interviews, which the combined status would hide.'),
    ],
    checkpoint: [
      mcq('If fifty applications produce no response the problem is the resume or the targeting rather than persistence, and without the numbers:',
        [['That diagnosis is unavailable', true],
         ['The pattern takes longer to emerge', false],
         ['The resume cannot be compared to others', false],
         ['Only the rejection reasons can be examined', false]],
        'The default response is to apply more, which the rate contradicts — but only if the rate was recorded.'),
      mcq('The notes column repays itself partly because the questions you were asked accumulate into the most accurate preparation material you will have, since it comes from:',
        [['The companies actually hiring you', true],
         ['Rounds you have already passed', false],
         ['A wider range than published banks', false],
         ['Interviewers who explained their reasoning', false]],
        'Generic preparation material averages across the market, where your own record is drawn from the specific companies in your pipeline.'),
    ],
  },
  {
    unitCode: 'T4_APPLICATIONS_PRACTICE',
    notes: `**A real application, start to finish, including the follow-up.**

## The drill

**One real role you would actually take. Not a rehearsal — an application that goes.**

**The rehearsal version teaches almost nothing**, because the parts that are hard are hard
precisely because they are real: choosing what to claim, deciding whether you are eligible, and
sending it.

## The sequence

**Find it.** Campus, board, referral. **Read the posting three times** — what they need, which
requirements are real, what vocabulary.

**Check eligibility honestly.** Hard cutoffs first. If you fail one, choose a different role rather
than spending the effort.

**Tailor from the master.** Fifteen minutes. Reorder, rewrite one or two bullets, reorder the
skills.

**Check the parse.** PDF, copy the text out.

**Write the covering message if one is asked for.** Three short paragraphs: the role and why you,
one specific thing from your work that matches, and availability. **Under two hundred words.** The
long ones are not read.

**Send it. Record it.** Company, role, date, route, next action — "follow up on the 12th if no
response".

**Then follow up on the 12th**, once, replying to your own message, with no reproach in it. **This
is the step the drill exists for**, because it is the one that is skipped when no system exists and
the one that produces responses when it does not.

## What to observe

**How long the whole thing took.** Usually forty-five minutes for the first and fifteen thereafter,
which is the number that determines whether fifty applications is realistic.

**What was hard.** Almost always deciding what to claim, which is the previous topic showing up as a
real decision rather than an exercise.

## The second one, immediately

**Do a second application the same day.** **The compression is the finding** — the master version,
the checks and the tracker exist now, and demonstrating that the second costs a quarter of the first
is what makes the volume feel possible.

## What this establishes

**That an application is a fifteen-minute process with a system and an ninety-minute one without**,
and the difference across a placement season is most of the applications you will make.`,
    mcqs: [
      mcq('The rehearsal version teaches almost nothing because the hard parts are hard precisely because they are real: choosing what to claim, deciding eligibility, and:',
        [['Sending it', true],
         ['Waiting for the response', false],
         ['Selecting the right company', false],
         ['Matching the posting vocabulary', false]],
        'The commitment is what makes the preceding decisions consequential, and a practice application removes exactly that.'),
      mcq('The follow-up is described as the step the drill exists for because it is skipped when no system exists and:',
        [['Produces responses when it does not', true],
         ['Is the only step the candidate controls', false],
         ['Takes the least effort of all the steps', false],
         ['Determines how the application is ranked', false]],
        'A single polite reminder recovers applications that would otherwise lapse silently, which is why it is worth systematising.'),
    ],
    checkpoint: [
      mcq('The second application is done the same day because the compression is the finding, demonstrating that the second costs a quarter of the first, which:',
        [['Makes the volume feel possible', true],
         ['Confirms the tailoring was adequate', false],
         ['Shows which steps can be skipped', false],
         ['Establishes a baseline for comparison', false]],
        'The reusable assets created by the first application are what make fifty realistic, and experiencing that directly is the point.'),
      mcq('Timing the first application matters because the resulting number determines:',
        [['Whether fifty applications is realistic', true],
         ['How many rounds each will involve', false],
         ['Which route is most efficient', false],
         ['When the follow-up should be scheduled', false]],
        'The per-application cost multiplied by the intended volume is what makes a placement plan feasible or not.'),
    ],
  },
  {
    unitCode: 'T4_APPLICATIONS_CHECKPOINT',
    notes: `**Whether the portfolio, the resume and the applications are actually in place.**

## The bar

**Portfolio:** **four repositories pinned**, each with a README carrying a one-line description, a
screenshot and a note on the hard part. **No secrets in any history.** **A stranger, given ninety
seconds, can say what you build.**

**Resume:** **one page.** **Every bullet defendable for ten minutes.** **It parses when copied out
of the PDF.** **A six-second reader can name your strongest thing.**

**Applications:** **a tracker with a next-action column.** **At least one real application sent and
followed up.** **Eligibility read correctly on every one.**

## What a weak result means

**Stranger could not say what you build**: the pinned set. Two minutes to fix, and it is the most
common finding in the whole module.

**An undefendable bullet**: it comes off. This is the step people negotiate with themselves about
and the negotiation is the failure.

**Resume does not parse**: the layout. Thirty seconds to detect and it silently removes
applications until it is found.

**No tracker**: applications will lapse, and you will not know which ones did.

**Never followed up**: the single cheapest source of responses, unused.

## Why this checkpoint matters more than its position suggests

**Because everything else in Year 4 improves what happens in the room, and this decides whether you
get into it.**

**A student with strong Year-4 capability and a resume filtered out in six seconds has spent a year
preparing for rounds they will not sit** — and the fix is an afternoon, which is the whole argument
for doing it now rather than after the first twenty rejections.

## What this feeds

**Every application you make**, **the project round**, which frequently starts from the repository a
reviewer opened, and **the first question in most HR rounds**, which is read off the document this
checkpoint governs.`,
    checkpoint: [
      mcq('An undefendable bullet coming off is described as the step people negotiate with themselves about, and:',
        [['The negotiation is the failure', true],
         ['The outcome depends on the role applied for', false],
         ['A more precise wording usually resolves it', false],
         ['Most such bullets are never questioned', false]],
        'The line was marked undefendable by the candidate’s own assessment, so arguing to keep it is overriding the finding rather than acting on it.'),
      mcq('A resume that does not parse is described as taking thirty seconds to detect and:',
        [['Silently removing applications until it is found', true],
         ['Affecting only the largest employers', false],
         ['Producing a formatting warning on submission', false],
         ['Being correctable after the first rejection', false]],
        'Automated screening rejects it without any human seeing it, so nothing in the outcome indicates what went wrong.'),
      mcq('This checkpoint matters more than its position suggests because everything else in Year 4 improves what happens in the room, where this decides:',
        [['Whether you get into it', true],
         ['How the interviewer forms a first impression', false],
         ['Which companies will consider the application', false],
         ['What the technical rounds will focus on', false]],
        'Capability is only assessed once an application passes screening, which makes this module a precondition for all the others.'),
      mcq('Never following up is listed as a weakness because it is:',
        [['The single cheapest source of responses, unused', true],
         ['Interpreted as disinterest by recruiters', false],
         ['The only way to reach a hiring manager', false],
         ['Required before an application is considered', false]],
        'One short message recovers applications that would otherwise lapse, at a cost that no other route matches.'),
    ],
  },
];
