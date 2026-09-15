/**
 * T_CAREER_MAP — the complete topic, seven units.
 *
 * ── WHY THIS TOPIC, AND WHY NOW ───────────────────────────────────────────────────────────
 *
 * It is the only EXPLORATION-category topic in Year 1, and every one of the nine audited
 * profiles was failing its EXPLORATION floor with zero units available. One topic closes that
 * for all of them, and it also supplies a PRACTICE and an INTEGRATION unit on the way.
 *
 * ── WHAT EXPLORATION MEANS HERE ───────────────────────────────────────────────────────────
 *
 * These units exist for the student who does not yet know what they are aiming at — which, in
 * the first year, is most of them. The composer gives them to undecided and exploring learners
 * as breadth. So the content has to do something harder than list job titles: it has to give
 * somebody enough of a picture to choose, while being honest that a first choice is not a
 * commitment.
 *
 * The temptation in a topic like this is motivational filler. Every unit below is written to
 * be checkable instead — what a role does on a Tuesday, what a job advert means as opposed to
 * what it says, where a junior actually fits in a team's week. A student should finish able to
 * describe something concrete they did not know before, not feeling encouraged.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CAREER_MAP_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_CAREER_MAP_ROLE_LANDSCAPE',
    notes: `Job titles are a poor guide to work. This unit describes what five common roles
actually do on an ordinary Tuesday, which is a different and more useful thing.

**Frontend engineer.** Builds what the user sees and touches. A Tuesday: implement a screen from
a design, discover the design did not say what happens when the list is empty, ask, handle it;
fix a layout that breaks on a narrow phone; make a dropdown reachable by keyboard. Much of the
day is edge cases the design did not mention.

**Backend engineer.** Builds what happens after the button is pressed. A Tuesday: add a field to
an API and work out what happens to the clients that do not know about it; find why a query that
was fast with a thousand rows is slow with two million; decide what the system should do when a
payment provider times out halfway.

**Data / ML.** Turns data into answers. A Tuesday: discover the dataset has three different
spellings of the same city; rerun a model and get a slightly different number; explain to
somebody that the correlation they are excited about is explained by something else entirely.
Most of the work is preparing data, not modelling.

**Infrastructure / DevOps.** Makes the thing run, repeatedly and safely. A Tuesday: work out why
a deploy that worked in staging failed in production; reduce a build from eleven minutes to four;
get paged because disk filled with logs nobody rotated.

**QA / test engineer.** Finds out whether it actually works. A Tuesday: reproduce a bug reported
as "it's broken" until it is reproducible in one sentence; write automated tests for the path
everybody manually clicks; argue that an edge case matters.

**What every one of them has in common:** most of the time is spent understanding a problem, not
typing. The typing is the short part.

**Where these overlap more than the titles suggest.** All five read other people's code, use
version control, debug things they did not write, and explain decisions in writing. Those four
are the actual Year-1 curriculum, which is why your foundation is not wasted whichever you pick.`,
    mcqs: [
      mcq('Which best describes what most of a working day involves, in every one of these roles?',
        [['Understanding the problem — typing is the short part', true],
          ['Writing entirely new code from a blank file', false],
          ['Attending meetings about what to build next', false],
          ['Learning whichever framework is current now', false]],
        'This is the single most surprising thing about the work to somebody arriving from coursework, where the problem is always given.'),
      mcq('A backend engineer adds a field to an API. What is the characteristic concern?',
        [['What happens to existing clients that do not know about the change', true],
          ['Whether the name of the new field is short enough', false],
          ['Which colour the field is rendered in on screen', false],
          ['How quickly the new field renders in the browser', false]],
        'Backend work is dominated by other systems depending on yours, which is what makes changing something already in use different from writing it.'),
      mcq('Most of a data role\'s time goes on:',
        [['Preparing and cleaning data', true],
          ['Choosing models', false],
          ['Tuning hyperparameters', false],
          ['Writing papers', false]],
        'Three spellings of the same city is the representative problem, and it is why data work rewards patience more than mathematics in the first year.'),
      mcq('What do all five roles genuinely share?',
        [['Reading code, version control, debugging and written explanation', true],
          ['The same programming language in daily use', false],
          ['The same working hours and patterns of work', false],
          ['A computer science degree as an entry requirement', false]],
        'Those four are what the Year-1 foundation actually builds, which is why it is not wasted whichever direction you take.'),
    ],
    checkpoint: [
      mcq('You are told a role is "full stack". What does that tell you about the Tuesday?',
        [['Little on its own: it spans both, and the balance differs by team', true],
          ['They spend roughly half of each day on front end and half on back', false],
          ['They are more senior, since the title covers twice the ground', false],
          ['They do not write tests, because the breadth leaves no time', false]],
        'Broad titles carry less information than narrow ones. The useful question is what the last three tasks actually were.'),
      mcq('Which is the most reliable way to find out what a role involves?',
        [['Ask somebody doing it what they did last week', true],
          ['Read the job title and what it usually means', false],
          ['Read a job advert for the role in question', false],
          ['Read a syllabus that claims to prepare for it', false]],
        'Adverts describe an ideal and titles describe a category. Last week actually happened.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_SKILLS_PER_ROLE',
    notes: `Now the skills behind those roles — and, more usefully, how much they overlap.

**The shared core, needed by every one of them:**

- Programming fundamentals — variables, conditions, loops, functions
- Problem decomposition
- Version control
- Debugging — reading a fault you did not write
- The command line
- Enough databases to read and write data
- Written explanation

That list is most of your Year-1 curriculum, and it is the reason you are not asked to choose a
direction in week one. **Roughly seventy per cent of what each role needs is the same seventy per
cent.**

**What is genuinely role-specific:**

| Role | Beyond the core |
|---|---|
| Frontend | HTML/CSS in depth, one UI framework, accessibility, browser behaviour |
| Backend | API design, data modelling, query performance, caching, concurrency |
| Data / ML | Statistics, SQL in depth, one numerical stack, experiment design |
| Infrastructure | Linux in depth, networking, containers, CI/CD, monitoring |
| QA | Test design, automation tooling, reproducing faults precisely |

**Read that table for what it is: the last thirty per cent.** It is the visible part — it is what
job adverts list and what people argue about online — which makes it look like the whole job.

**The practical consequence for you.** Time spent on the core is never wasted, whichever
direction you later choose. Time spent specialising before the core is secure produces somebody
who can use a framework and cannot debug it, which is a well-known and uncomfortable place to
be.

**Map it to yourself.** Take the shared list above and mark each item: met it, can do it,
verified it. That is your actual position, and it is the same list whichever role you are
weighing up.`,
    mcqs: [
      mcq('Approximately how much of what these roles need is shared?',
        [['Around seventy per cent — the core is the same', true],
          ['Almost nothing; they are separate careers', false],
          ['Everything', false],
          ['About a quarter', false]],
        'The shared majority is why Year 1 teaches a common foundation and why a direction chosen later costs you very little.'),
      mcq('Why does the role-specific thirty per cent LOOK like the whole job?',
        [['It is what adverts list and what people argue about publicly', true],
          ['It takes far longer to learn than the core does', false],
          ['It is the more important of the two in practice', false],
          ['It is harder than the shared core to master', false]],
        'Visibility is not proportion. The core is assumed rather than advertised, which is exactly why it goes unnoticed.'),
      mcq('Specialising before the core is secure typically produces:',
        [['Somebody who can use a framework and cannot debug it', true],
          ['A faster route to a first job than the core does', false],
          ['A deeper specialist than the alternative route', false],
          ['No particular problem, provided the work is real', false]],
        'A recognisable and uncomfortable position, and the reason the sequence matters more than the speed.'),
      mcq('Which is in the shared core rather than role-specific?',
        [['Reading a fault in code you did not write', true],
          ['Orchestrating containers across several machines', false],
          ['Designing an experiment that answers a question', false],
          ['Laying out a complex page in CSS from scratch', false]],
        'Debugging unfamiliar code is a daily activity in all five roles, and it is the skill Year 1 spends the most time on without naming it.'),
    ],
    checkpoint: [
      mcq('You want to keep the most options open. Where is time best spent first?',
        [['The shared core, because every direction requires it', true],
          ['Two of the specialisms studied side by side', false],
          ['Whichever of the specialisms pays the most', false],
          ['The newest technology, which nobody else knows', false]],
        'The core is the part that transfers. Optionality is bought by depth in what is common, not by breadth across specialisms.'),
      mcq('An advert lists eight specific technologies. What does the shared-core picture suggest?',
        [['Most of the eight sit in the visible thirty per cent', true],
          ['You need all eight of them before it is worth applying at all', false],
          ['The role is unusually demanding compared with its peers', false],
          ['The advert is not a real vacancy, since nobody has all eight', false]],
        'Adverts enumerate the specific because it is enumerable. The assumed core is invisible precisely because it is assumed.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_HOW_TEAMS_WORK',
    notes: `Understanding a team is largely understanding one thing: **the path a change takes from
somebody's idea to running in front of users.** Every role in the team is a station on it.

**The path, in order:**

1. **Somebody wants something.** A user complains, a product person proposes, an engineer
   notices. It arrives as a sentence, usually ambiguous.
2. **It gets specified.** What exactly should happen, including when things go wrong. Most of the
   value in this step is discovering the question nobody asked — "what if the user has two
   addresses?"
3. **It is estimated and scheduled.** Fitted against everything else wanting to happen.
4. **Somebody builds it.** Usually on a branch, usually smaller than the original idea.
5. **Somebody else reviews it.** Another engineer reads the change and asks questions. This is
   normal and not an insult; it is the main way faults are caught and the main way a junior
   learns quickly.
6. **Tests run automatically.** Typically on every push. If they fail, the change does not
   proceed.
7. **It is merged and deployed** — often to a staging environment first, then to production.
8. **Somebody watches it.** Errors, performance, whether it did what was wanted.
9. **It sometimes comes back.** Reverted, or fixed forward.

**Where a junior fits in the first year.** Mostly steps 4 and 5 — building small well-specified
changes and reviewing others'. That is not a holding pattern: reading a lot of other people's
code is the fastest way to learn how a codebase thinks.

**The three habits that make a junior easy to work with**, and they are all Year-1 skills:

- **Writing clearly.** A pull request that explains what and why is reviewed quickly. One that
  explains nothing waits.
- **Reproducing precisely.** "It's broken" cannot be worked on. "Clicking Save with an empty
  email shows a spinner forever" can be fixed today.
- **Asking early.** Two hours stuck is learning. Two days stuck is a cost to everybody.

**What surprises most people:** how much of the week is reading rather than writing, and how much
is deciding what to build rather than building it.`,
    mcqs: [
      mcq('Where does a first-year engineer spend most of their time?',
        [['Building small well-specified changes and reviewing others\' code', true],
          ['Designing the architecture of new subsystems', false],
          ['Deciding which features the team should build', false],
          ['Deploying finished work out to production', false]],
        'Reading a lot of other people\'s code is the fastest route into how a codebase thinks, which is why review is not a holding pattern.'),
      mcq('Somebody requests changes on your pull request. What does that usually mean?',
        [['The normal way faults are caught and knowledge spreads', true],
          ['That the work you submitted was of poor quality', false],
          ['That you are being tested before being trusted', false],
          ['That the change is going to be rejected outright', false]],
        'Review is a process applied to everybody including the most senior. Reading it as criticism is a common and costly misunderstanding early on.'),
      mcq('Which bug report can actually be worked on?',
        [['"Clicking Save with an empty email shows a spinner forever"', true],
          ['"The form is broken and nobody can use it"', false],
          ['"It does not work on my machine any more"', false],
          ['"Users are complaining about the save button"', false]],
        'Precise reproduction is the difference between a report and a rumour, and producing one is a skill worth practising deliberately.'),
      mcq('Automated tests run on every push mainly so that:',
        [['A change that breaks something does not proceed further', true],
          ['Developers gradually learn to write fewer bugs', false],
          ['Deployment becomes faster than it would be', false],
          ['Code review becomes unnecessary once they pass', false]],
        'The value is the gate, not the reassurance — it catches the regression the author did not think to check.'),
    ],
    checkpoint: [
      mcq('You have been stuck on the same problem for two days. What does the team expect?',
        [['That you would have asked well before now', true],
          ['That you keep working at it on your own', false],
          ['That you escalate the problem to a manager', false],
          ['That you switch to a different task instead', false]],
        'A couple of hours stuck is learning; two days is a cost to everybody, including you. Judging that boundary is part of the job.'),
      mcq('Which step most often reveals the question nobody asked?',
        [['Specifying what should happen, including when it goes wrong', true],
          ['Deployment, where the untested assumptions finally surface', false],
          ['Estimation, which forces the team to size every unknown', false],
          ['Monitoring, which shows what users actually do with it', false]],
        '"What if the user has two addresses?" is discovered here or discovered in production, and the first is very much cheaper.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_EARLY_CAREER',
    notes: `A job advert is a wish list written by somebody hoping for the best candidate. Reading
one literally is how good applicants talk themselves out of applying.

**What adverts say, and what is usually true:**

| The advert | Usually means |
|---|---|
| "3+ years experience" for a junior role | Copied from a template, or aspirational |
| A list of 12 technologies | Their stack. You need the core plus a couple |
| "Computer science degree required" | Preferred; a portfolio often substitutes |
| "Rockstar / ninja developer" | Nothing. Treat as noise |
| "Fast-paced environment" | Often understaffed. Worth asking about |
| "Strong communication skills" | This one is literal and underrated |

**What is genuinely required for a first role:**

1. **You can program.** Not brilliantly. You can take a described problem and produce working
   code, and you can say why you did it that way.
2. **You can debug.** Given a fault you did not write, you can narrow it down methodically rather
   than by changing things at random. This is assessed more often than it is advertised.
3. **You can read code.** Most of the first year is understanding what exists.
4. **You can explain yourself.** In writing, and out loud, to somebody who was not there.
5. **You can learn without being taught.** Nobody will set you a syllabus again.

**What is genuinely optional early:** a specific framework, a degree class, competitive
programming rank, the number of technologies on your CV.

**The most useful thing you can build** is not a big project. It is a small one you can explain
completely: why each decision, what you would do differently, what broke and how you found it.
An interviewer learns far more from that than from a large project you assembled from tutorials.

**On applying.** If you meet most of the real list above, apply. The advert is a wish; the
shortlist is a compromise.`,
    mcqs: [
      mcq('A junior advert says "3+ years experience". The most likely explanation is:',
        [['It was copied from a template or is aspirational', true],
          ['They are not going to consider a new graduate', false],
          ['The role is really a senior one that is mislabelled', false],
          ['They are hoping for somebody changing career', false]],
        'Adverts are written optimistically and reused. Treating one as a specification is how strong candidates exclude themselves.'),
      mcq('Which advert phrase should be taken literally?',
        [['"Strong communication skills"', true],
          ['"Rockstar developer"', false],
          ['"Fast-paced environment"', false],
          ['"12 technologies required"', false]],
        'It is the one most often dismissed as filler and the one most often actually assessed, because everything else depends on it.'),
      mcq('Which capability is assessed more often than it is advertised?',
        [['Debugging a fault you did not write, methodically', true],
          ['Detailed knowledge of the current framework', false],
          ['Analysing the complexity of an algorithm', false],
          ['The speed at which you can type out code', false]],
        'Interviews frequently hand over broken code precisely because it cannot be rehearsed from tutorials.'),
      mcq('The most useful portfolio piece is:',
        [['Something small you can explain completely, breakages included', true],
          ['The largest and most ambitious project you can build', false],
          ['A careful clone of an application everybody knows', false],
          ['A collection of small projects from tutorials', false]],
        'Depth of explanation is what distinguishes work you did from work you followed, and an interviewer can tell within two questions.'),
    ],
    checkpoint: [
      mcq('You meet six of a role\'s ten listed requirements. What is the sensible action?',
        [['Apply: the advert is a wish list and the shortlist a compromise', true],
          ['Wait until all ten of the requirements are met', false],
          ['Apply only if the six you meet are the technical ones', false],
          ['Ask the company to lower its stated requirements', false]],
        'The list was written hoping for an ideal that usually does not apply. Self-rejection costs more opportunities than rejection does.'),
      mcq('Which is genuinely optional for a first role?',
        [['A specific framework on your CV', true],
          ['Being able to explain your own code', false],
          ['Being able to read existing code', false],
          ['Being able to debug methodically', false]],
        'Frameworks are learned on the job in weeks. The other three are what the job is made of.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_CHOOSING',
    notes: `You are being asked to choose a direction. Here is how to do it without the choice
costing you anything if you change your mind — which you probably will, and which is fine.

**Why choose at all?** Because unlimited optionality is paralysis. Somebody who keeps every door
open makes no progress through any of them, and depth in one area is what actually teaches you
how to get depth in another. A choice is a commitment to *learn something properly*, not a
commitment for life.

**Why it costs less than you think.** Roughly seventy per cent of every direction is the shared
core. Switching from backend to data after six months does not cost six months; it costs the
thirty per cent that was specific, and you keep everything else — including the far more valuable
knowledge of *how to learn a specialism*, which you now have and did not before.

**How to choose. Three questions that work better than "what interests me":**

1. **What did you enjoy while doing it, not while imagining it?** Enjoying the idea of AI is
   different from enjoying cleaning a dataset for three hours. Direction Project, the next unit
   but one, exists for this reason.
2. **What kind of problem do you want?** Frontend problems are about people and ambiguity.
   Backend problems are about correctness and scale. Infrastructure problems are about failure
   and recovery. Data problems are about uncertainty. These are genuinely different tastes.
3. **What did you find yourself reading about voluntarily?** Weak evidence on its own, real
   evidence when it is consistent over months.

**Three bad reasons, stated plainly:** which pays most right now (it changes, and you will be
poor at something you dislike); what is currently fashionable (fashion is roughly a three-year
cycle and you are on a longer one); what your friends chose.

**Committing loosely, in practice.** Say "I am learning backend properly this year, and I will
reconsider in a year." Then actually go deep — shallow exposure to four areas teaches you less
than depth in one, because depth is where you learn what understanding something feels like.

**If you genuinely cannot choose,** that is a legitimate answer and the programme supports it:
you get breadth across several directions rather than a default picked for you. Just do not use
it to avoid deciding forever.`,
    mcqs: [
      mcq('Switching direction after six months costs roughly:',
        [['The thirty per cent that was specific — the core transfers', true],
          ['All six months of the work done so far', false],
          ['Nothing at all; everything you learned carries', false],
          ['More than it would cost to start over entirely', false]],
        'And you also keep something that does not appear on either list: knowing how to take a specialism from zero to competent.'),
      mcq('Which is the strongest evidence that a direction suits you?',
        [['You enjoyed the actual work when you tried it, not the idea of it', true],
          ['It pays the most of the directions available', false],
          ['It is the one currently most in demand', false],
          ['Your friends have chosen the same direction', false]],
        'Enjoying the idea of AI and enjoying three hours of data cleaning are different things, and only one of them is the job.'),
      mcq('Why is refusing to choose anything a problem?',
        [['Depth in one area teaches you how to reach depth in another', true],
          ['You will fall behind the peers who did choose', false],
          ['Employers dislike a candidate without a focus', false],
          ['It is not a problem; breadth is worth keeping', false]],
        'Shallow exposure to four areas teaches less than depth in one, because depth is where you learn what understanding actually feels like.'),
      mcq('"Committing loosely" in practice means:',
        [['Going genuinely deep for a defined period, then reconsidering', true],
          ['Studying several of the directions at the same time', false],
          ['Choosing a direction without studying it deeply', false],
          ['Waiting until more information becomes available', false]],
        'The looseness is in the time horizon, not in the effort. Half-committing produces the costs of choosing with none of the benefits.'),
    ],
    checkpoint: [
      mcq('A student picks a direction because it currently pays most. What is the flaw?',
        [['Pay shifts over a career, and being poor at something you dislike is worse', true],
          ['Pay is irrelevant to the decision and should not enter into it at all', false],
          ['It is not a flaw; pay is the most objective signal available to them', false],
          ['They should pick the hardest direction instead, since it pays later', false]],
        'Pay is a reasonable input and a poor sole criterion, mainly because the ranking changes faster than a career does.'),
      mcq('A student genuinely cannot choose. What does the programme do?',
        [['Gives breadth across several directions rather than defaulting them into one', true],
          ['Assigns them the most popular direction, which suits most people', false],
          ['Delays their plan until they have decided on a direction', false],
          ['Gives only universal material until the choice has been made', false]],
        'Undecided is a supported state with its own behaviour, not an absence of one — provided it is not used to avoid deciding indefinitely.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_PRACTICE',
    notes: `No new ideas. This unit is research you do yourself, because everything in this topic so
far has been somebody else's summary and the point is to replace that with something first-hand.

**The task: produce a short report on one role that interests you.** Not the one you have
decided on — one you are considering.

**What to find out, and where.**

1. **What the work actually involves.** Find three job adverts for the same title at different
   companies and list what appears in all three. The intersection is the job; the rest is that
   company.
2. **What a day looks like.** Find somebody doing it and read what they have written — a blog
   post, a conference talk, a long answer somewhere. Search for the title plus "day in the life"
   or "what I actually do". Prefer a specific account over a general one.
3. **What the entry point is.** What do junior adverts for this role ask for, as opposed to
   senior ones? The difference is the path.
4. **What people dislike about it.** This is the most valuable and most skipped part. Search for
   the title plus "burnout", "frustrating" or "why I left". Every role has a downside and you
   want to know whether it is one you can live with.
5. **What it connects to.** Which roles do people move into from it?

**A caution on sources.** Career content is full of people selling courses. Weight accordingly:
somebody describing a specific annoying Tuesday is more trustworthy than somebody describing a
lucrative career path.

**What to produce.** About 400-600 words, covering all five points, with your sources listed.
Finish with two sentences: what attracts you, and what concerns you. If you cannot write the
second sentence, you have not researched hard enough — every role has one.`,
    mcqs: [
      mcq('Why compare three adverts for the same title rather than reading one closely?',
        [['What appears in all three is the job; the rest is that company', true],
          ['Three sources is simply a more thorough approach', false],
          ['Job adverts are often not real vacancies at all', false],
          ['To find which of the three offers the best salary', false]],
        'Intersection separates the role from the employer, which one advert cannot do however carefully you read it.'),
      mcq('Why research what people DISLIKE about a role?',
        [['Every role has a downside, and you need to know if you can live with it', true],
          ['So that you can avoid the role if it sounds bad', false],
          ['So there is something to ask about at the interview', false],
          ['It is not useful; complaints say more about the person', false]],
        'It is the most skipped step and the most informative, because attraction is easy to research and tolerance is not.'),
      mcq('Which source is more trustworthy?',
        [['Somebody describing a specific annoying Tuesday', true],
          ['A polished article about the career path itself', false],
          ['A guide to the role published by a course provider', false],
          ['A site comparing salaries across the industry', false]],
        'Specificity is hard to fake and rarely flattering. Career content is full of people with something to sell.'),
      mcq('You cannot write a sentence about what concerns you in the role. That means:',
        [['The research is not finished — every role has a downside', true],
          ['The role is a perfect fit and has no downsides', false],
          ['You should choose it, since nothing puts you off', false],
          ['The sources you read were unusually positive ones', false]],
        'An entirely positive picture is evidence about the sources rather than about the role.'),
    ],
    checkpoint: [
      mcq('The difference between junior and senior adverts for the same role tells you:',
        [['The entry point, and therefore the path in', true],
          ['Nothing useful, since both adverts are written alike', false],
          ['The salary range the company is willing to pay', false],
          ['How large the company is and how it is structured', false]],
        'What is asked of a junior and not a senior is usually the filter; what is asked of both is the core.'),
      mcq('Your report should end with what?',
        [['What attracts you and what concerns you, in two sentences', true],
          ['A conclusion saying which of the roles is the best', false],
          ['A list of the courses you intend to take next', false],
          ['An estimate of what the role tends to pay', false]],
        'Those two sentences are the output. Everything before them is the evidence for them.'),
    ],
  },
  {
    unitCode: 'T_CAREER_MAP_DIRECTION_PROJECT',
    notes: `Everything in this topic so far has been reading. Reading about a direction tells you
whether you like the *idea* of it — which is genuinely different from whether you like the work,
and the difference has cost a lot of people a lot of time.

**So this unit is one day spent inside a direction, building the smallest real thing in it.**

**Why small, and why real.** Small because a day is what you have and an unfinished large thing
teaches you nothing about whether you enjoyed it. Real because the tutorial version of every
direction is pleasant — the friction is what you are testing for. You want to meet the part where
something does not work and you have to find out why, because that part is most of the actual
job.

**What "the smallest real thing" means per direction:**

- **Frontend** — one page with real interaction, working on a phone, usable with a keyboard
- **Backend** — an API with two endpoints that stores something and survives a restart
- **Data** — a real, messy public dataset, cleaned, with one honest conclusion drawn
- **Infrastructure** — get something running in a container, then get it running again from
  scratch on a clean machine
- **Security** — set up a deliberately vulnerable app and find one vulnerability yourself

**What to pay attention to while you work**, because this is the actual measurement and it is
easy to forget while debugging:

1. When something broke, was finding out why **interesting or annoying**? This is the single best
   predictor. Every direction is mostly this.
2. Did the time go quickly?
3. Did you want to keep going at the end, or were you relieved?
4. What did you find yourself curious about beyond the task?

**Be honest, including with yourself.** "I found it boring" is a completely successful outcome
for this unit. Finding out now costs you a day; finding out in your second job costs considerably
more.

The brief, deliverables and acceptance criteria are in the assignment attached to this unit.`,
    assignment: {
      title: 'Direction Project — A Day Inside One',
      description: `Spend one focused day building the smallest real thing inside a direction you are considering, and report honestly what the work was actually like. The deliverable is the reflection as much as the artefact.`,
      instructions: `**The brief**

Choose ONE direction you are genuinely considering — not one you have already decided on.
Build the smallest real thing in it, in roughly one focused day.

Pick from these, or propose your own of comparable size:

- **Frontend** — a single page with real interaction, working at phone width and usable with
  only a keyboard.
- **Backend** — an API with two endpoints that stores data and still has it after a restart.
- **Data** — take a genuinely messy public dataset, clean it, and draw one conclusion you can
  defend. Include at least one thing you had to fix that was not obvious.
- **Infrastructure** — get any application running in a container, then reproduce it from
  scratch on a clean machine using only your own notes.
- **Security** — stand up a deliberately vulnerable application and find one vulnerability
  without following a walkthrough for that specific vulnerability.

**It must actually run.** A design, a plan or a half-finished attempt does not answer the
question this unit asks.

**What to submit**

1. **The artefact** — code, notebook, configuration, whatever the direction produces.
2. **A build log** (roughly 300 words): what you set out to do, what you actually did, and the
   three points at which you got stuck. For each: what the symptom was, how you found the cause,
   and how long it took.
3. **An honest reflection** (roughly 300-400 words) answering, specifically:
   - When something broke, was finding out why interesting or annoying? Give an example.
   - Did the time pass quickly or slowly?
   - At the end, did you want to keep going, or were you relieved to stop?
   - What did you become curious about that was not part of the task?
   - Would you spend a year on this? Why, or why not?

**"I did not enjoy it" is a full-marks answer** if it is evidenced. This unit measures the
quality of your self-observation, not your enthusiasm.

**Constraints**

- One day of focused work. Stop when the day stops.
- Do not follow a tutorial end to end — you would be measuring the tutorial. Look things up as
  needed, which is what the real work is.
- Working alone, so the stuck moments are yours.`,
      rubric: [
        {
          criterion: 'The thing runs',
          description: 'A working artefact of appropriate scope for one day, meeting the stated definition of "smallest real thing" for the chosen direction.',
          maxPoints: 25,
        },
        {
          criterion: 'The build log',
          description: 'Three genuine stuck points, each with symptom, how the cause was found, and rough time spent. Specific rather than generalised.',
          maxPoints: 25,
        },
        {
          criterion: 'Quality of reflection',
          description: 'All five questions answered with evidence from the day rather than in the abstract. A negative conclusion, honestly evidenced, scores as highly as a positive one.',
          maxPoints: 30,
        },
        {
          criterion: 'Self-direction',
          description: 'Evidence of looking things up and deciding, rather than following a single tutorial. Choices made and stated.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },
];
