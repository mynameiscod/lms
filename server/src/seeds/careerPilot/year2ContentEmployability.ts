/**
 * T2_PORTFOLIO and T2_INTERNSHIP — sixteen units. Year 2.
 *
 * ── THE PART THAT DECIDES WHETHER ANY OF IT COUNTED ───────────────────────────────────────
 *
 * A student can finish this year with genuine skill and no way to show it. These two topics are the
 * difference between capability and evidence of capability, and employers only ever see the second.
 *
 * Everything here is written for an Indian second-year applying for internships and junior roles.
 * The advice is specific rather than general because general careers advice is what students have
 * already ignored: a reviewer spends ninety seconds, a resume is one page, and a repository that
 * does not run from a clean clone is a repository that counted for nothing.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const EMPLOYABILITY_BUNDLES: PilotBundle[] = [
  /* ── T2_PORTFOLIO ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_PORTFOLIO_WHAT_COUNTS',
    notes: `A claim on a resume is worth nothing on its own. Everybody writes "proficient in Python".
Evidence is what separates the applications that get replies.

**The hierarchy, strongest first:**

1. **Work somebody paid for or used** — a freelance job, an internship, something in real use
2. **A substantial project of your own**, running, with the code visible
3. **A real contribution to an open-source project**, merged
4. **A course project** that goes beyond what the course required
5. **A certificate**, which shows attendance rather than ability
6. **A claim on a resume**, which shows you can type

**Where students put their effort is usually upside down.** Six certificates and no running project
is a common shape, and it is the weakest combination on that list.

**What a reviewer actually does**, and this is the fact everything else follows from: opens your
profile, spends ninety seconds, reads one README, glances at some code, decides. Almost nobody clones
and runs anything. Your evidence has to survive that, not a careful evaluation.

**Which means the README is doing most of the work**, and the first paragraph most of that.

**Three good projects beat fifteen repositories.** A profile of fifteen half-finished tutorials makes
a reviewer work to find the good one, and reviewers do not work. Pin three, and let them be complete.

**What makes a project count:**

- It runs from a clean clone
- It solves something recognisable
- The code is readable, and the structure defensible
- It handles being used wrongly
- There are tests
- The README explains the decisions

**Judge your own work as a reviewer would.** Open your best project in a private window, as somebody
who has never seen it. Ninety seconds. What did you learn? That exercise is uncomfortable and it is
the most useful ten minutes in this topic.`,
    mcqs: [
      mcq('The strongest form of evidence is:',
        [['Work that somebody paid for or actually used', true],
          ['A substantial personal project', false],
          ['A merged open-source contribution', false],
          ['A certificate from a recognised provider', false]],
        'Certificates sit near the bottom; they show attendance.'),
      mcq('The common shape of a weak profile is:',
        [['Several certificates and no running project', true],
          ['One large project and nothing else', false],
          ['Contributions with no personal work', false],
          ['Course projects without write-ups', false]],
        'It is where students most often put their effort.'),
      mcq('Everything about portfolio presentation follows from the fact that a reviewer:',
        [['Spends about ninety seconds and rarely runs anything', true],
          ['Reads the code before the README', false],
          ['Compares you against other candidates first', false],
          ['Checks the commit history for consistency', false]],
        'Your evidence must survive that, not a careful evaluation.'),
      mcq('Fifteen repositories of half-finished work is worse than three complete ones because:',
        [['Reviewers do not work to find the good one', true],
          ['It suggests a lack of focus', false],
          ['It takes longer to maintain', false],
          ['Quantity implies low quality to employers', false]],
        'Pin three, and let them be complete.'),
    ],
    checkpoint: [
      mcq('The most useful ten minutes in this topic is:',
        [['Reviewing your own best project as a stranger would', true],
          ['Rewriting your resume summary', false],
          ['Adding topics and tags to your repositories', false],
          ['Comparing your profile to a classmate\'s', false]],
        'Uncomfortable, and it tells you what a reviewer sees.'),
      mcq('A certificate is weak evidence because it:',
        [['Shows attendance rather than ability', true],
          ['Is not recognised by most employers', false],
          ['Expires after a period', false],
          ['Cannot be verified easily', false]],
        'Which is why a running project outranks six of them.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_GITHUB_PROFILE',
    notes: `Your GitHub profile is where a recruiter checks whether the resume is true. It takes an
hour to make it work and most students never spend it.

**What a visitor sees first**, in order: your name and bio, your pinned repositories, your
contribution graph, then whatever else they scroll to.

**The bio.** One line, specific:

    "Second-year CS student. Backend and databases. Building things in Python and Postgres."

Not "passionate developer eager to learn", which every profile says and none of them mean.

**Pin six, choose three.** GitHub allows six pinned repositories; use three or four good ones rather
than filling the space. Each pinned repository needs a description — the one-line field beside the
name is read far more often than the README, and most repositories leave it empty.

**A profile README** — a repository named after your username — appears at the top of your profile.
Keep it short: what you work on, what you are learning, two or three projects with one line each, and
how to contact you. Long ones with animated graphics and trophy badges are read as noise.

**The contribution graph** shows consistency rather than intensity. A reviewer glancing at it is
asking one question: does this person actually code, or did they do a bootcamp in March? Regular
small commits answer it better than three heroic weekends.

**Tidy up before you apply:**

- Archive or delete abandoned tutorial repositories
- Fix repositories with no description
- Check that nothing contains a committed secret
- Make sure your best work is not buried under forks

**Forks of famous repositories with no commits** add nothing and suggest padding. Unfork them.

**Your commit messages are public.** "asdf", "fix", "final final" are visible to anybody who looks,
and they are read as how you work when nobody is watching.

**Use your real name** and a photograph if you are comfortable. A profile that looks like a person
gets more replies than one that looks like an account.`,
    mcqs: [
      mcq('The repository description field matters because:',
        [['It is read far more often than the README', true],
          ['It affects GitHub search ranking', false],
          ['It is required for pinned repositories', false],
          ['It appears in the contribution graph', false]],
        'And most repositories leave it empty.'),
      mcq('A reviewer glancing at your contribution graph is asking:',
        [['Whether you actually code regularly', true],
          ['How many hours you work per week', false],
          ['Whether you contribute to open source', false],
          ['How long you have been programming', false]],
        'Regular small commits answer it better than heroic weekends.'),
      mcq('"Passionate developer eager to learn" as a bio is:',
        [['What every profile says and none of them mean', true],
          ['A reasonable opening for a student', false],
          ['Better than naming specific technologies', false],
          ['Appropriate if you have few projects', false]],
        'One specific line beats any amount of enthusiasm.'),
      mcq('Forks of famous repositories with no commits:',
        [['Add nothing and suggest padding', true],
          ['Show interest in the wider community', false],
          ['Help with search visibility', false],
          ['Are expected on a student profile', false]],
        'Unfork them before you apply.'),
    ],
    checkpoint: [
      mcq('A profile README should be:',
        [['Short: what you work on, and contact', true],
          ['A full description of every project', false],
          ['Decorated with badges and statistics', false],
          ['A copy of your resume in Markdown', false]],
        'Long ones with animated graphics are read as noise.'),
      mcq('Commit messages like "asdf" and "final final" matter because:',
        [['They are public and show how you work unwatched', true],
          ['They break the contribution graph', false],
          ['They make repositories harder to search', false],
          ['They indicate an unfinished project', false]],
        'Anybody who looks at the history sees them.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_REPOSITORY_QUALITY',
    notes: `A repository a stranger cannot run is a repository that did not count. This unit is the
checklist that makes sure yours can be.

**The test, and it is not optional: clone it into a fresh directory, on a machine set up as a
newcomer's, and follow your own README exactly.** Not from memory — exactly what is written. Whatever
breaks is what a reviewer would have hit.

**What a runnable repository has:**

    project/
      README.md              what, how to run, how to test, decisions
      requirements.txt       or package.json, or pyproject.toml
      .env.example           every variable, with placeholder values
      .gitignore             .env, __pycache__, node_modules, .venv
      src/ or app/           the code, organised
      tests/                 tests that pass
      LICENSE                if it is public

**The failures that stop a reviewer**, in the order they usually occur:

1. **A missing step in the setup.** A database to create, a migration to run, a directory that must
   exist. You have had it since last year and forgot it was a step.
2. **A committed \`.env\`, or a missing one with no example.** Either way the reviewer cannot start it.
3. **Hardcoded paths** — \`C:/Users/you/Desktop/data.csv\` — which exist nowhere else.
4. **Dependencies unpinned or incomplete**, so the install produces something that does not run.
5. **Tests that fail** on a clean checkout, which is worse than having none.

**Check for secrets before making anything public**, including in the history. A key committed in
March and deleted in April is still there. Revoke it rather than deleting the line.

**Structure signals seriousness.** Everything in one file, or twelve files at the top level, reads
as a student exercise. Directories with obvious purposes read as somebody who has worked on a real
system.

**Remove the debris:** commented-out blocks, \`print("here")\`, a \`test.py\` that is not a test,
\`old_version/\`, and anything named \`temp\`.

**If a project genuinely cannot be run easily** — it needs an API key nobody has, or a large dataset
— then a demonstration video, screenshots and a sample dataset are the substitute, and the README
must say so in the first paragraph rather than letting the reviewer discover it.`,
    mcqs: [
      mcq('The test for a runnable repository is:',
        [['Clone it fresh and follow your own README exactly', true],
          ['Run the tests on your own machine', false],
          ['Ask a classmate whether it looks complete', false],
          ['Check that all dependencies are listed', false]],
        'Exactly what is written, not from memory.'),
      mcq('The most common thing that stops a reviewer is:',
        [['A missing setup step you forgot was a step', true],
          ['Code that is hard to read', false],
          ['A missing licence file', false],
          ['An unusual project structure', false]],
        'The database you created last year and never wrote down.'),
      mcq('Tests that fail on a clean checkout are:',
        [['Worse than having no tests at all', true],
          ['Acceptable if they pass locally', false],
          ['A minor issue reviewers overlook', false],
          ['Evidence of thorough testing', false]],
        'They say the project was never verified from outside.'),
      mcq('A secret committed in March and deleted in April:',
        [['Is still in the history and must be revoked', true],
          ['Is removed once the branch is merged', false],
          ['Only matters if the repository is forked', false],
          ['Can be cleaned by a force push safely', false]],
        'Revoking the credential is the fix; deleting the line is not.'),
    ],
    checkpoint: [
      mcq('Twelve files at the top level of a repository reads as:',
        [['A student exercise rather than a real system', true],
          ['A deliberately flat architecture', false],
          ['An acceptable structure for small projects', false],
          ['A sign of a single-purpose tool', false]],
        'Directories with obvious purposes signal seriousness.'),
      mcq('If a project genuinely cannot be run by a reviewer, the README should:',
        [['Say so in the first paragraph, with a demo instead', true],
          ['Include detailed setup instructions anyway', false],
          ['Omit the setup section entirely', false],
          ['Direct the reviewer to contact you', false]],
        'Letting them discover it after ten minutes is the failure.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_README',
    notes: `The README is the single highest-leverage document you will write this year. It is what a
reviewer reads, and often the only thing.

**The structure, in this order, because that is the order questions arrive:**

    # Project Name

    One sentence: what it does and for whom.

    ## What it does
    A paragraph. What problem, what it produces. A screenshot if it has an interface.

    ## Running it
    Numbered steps from a clean machine. Every one of them.

    ## Testing it
    The command, and what passing looks like.

    ## How it works
    The structure in a few lines. Where the main pieces live.

    ## Decisions
    Three to five choices, with reasons. This is the section reviewers remember.

    ## Limitations
    What it does not do, and what you would add.

**The first sentence is the most important sentence in your portfolio.** A reviewer decides from it
whether to continue:

    "A web application built with Flask and PostgreSQL."          — what it is made of
    "Turns a two-hour manual stock reconciliation into a
     thirty-second report for a small retail business."           — what it is for

**The decisions section is what separates a student project from an engineer's.** Most READMEs have
setup instructions and nothing else; a section explaining why you stored prices on the order line,
why you chose polling over websockets, and what you traded, demonstrates thinking that the code alone
cannot.

**Write the limitations honestly.** "Handles up to about 10,000 rows; beyond that the report needs a
background job" shows you understand your own system. Reviewers trust a project that names its edges
far more than one that claims none.

**Include a screenshot or a short recording** for anything with an interface. It is the cheapest way
to show it works.

**Keep it current.** A README describing a feature that no longer exists is worse than a short one,
because it proves nobody looked at it recently.

**Length: one screen for a small project, two or three for a large one.** If it is longer, move the
detail into \`docs/\`.`,
    mcqs: [
      mcq('The most important sentence in your portfolio is:',
        [['The first line of your best README', true],
          ['The summary at the top of your resume', false],
          ['Your GitHub profile bio', false],
          ['The opening of your cover letter', false]],
        'A reviewer decides from it whether to continue.'),
      mcq('"A web application built with Flask and PostgreSQL" is a weak opening because:',
        [['It says what it is made of, not what it is for', true],
          ['The technologies are too common', false],
          ['It is too short to be informative', false],
          ['It repeats what the code already shows', false]],
        'What problem it solves is the thing being asked.'),
      mcq('The README section that separates a student project from an engineer\'s is:',
        [['Decisions, with the reasoning behind them', true],
          ['Setup instructions with every step', false],
          ['A detailed architecture diagram', false],
          ['A list of technologies used', false]],
        'Most READMEs have setup and nothing else.'),
      mcq('Naming a project\'s limitations honestly:',
        [['Makes reviewers trust the rest of it more', true],
          ['Suggests the project is unfinished', false],
          ['Should be left for the interview', false],
          ['Is only appropriate for large projects', false]],
        '"Handles about 10,000 rows" shows you understand your own system.'),
    ],
    checkpoint: [
      mcq('A README describing a feature that no longer exists is:',
        [['Worse than a short one — nobody checked it', true],
          ['Acceptable if the rest is accurate', false],
          ['A minor issue reviewers ignore', false],
          ['Evidence the project evolved', false]],
        'It proves the documentation is not maintained.'),
      mcq('For a project with an interface, the cheapest proof it works is:',
        [['A screenshot in the README', true],
          ['A detailed feature list', false],
          ['A link to a deployed version', false],
          ['A description of the user flow', false]],
        'Almost nobody will run it themselves.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_WRITE_UPS',
    notes: `A write-up is a short piece about a project: the problem, what you did, what you learned.
It shows the thinking that code alone cannot.

**Why bother.** Two candidates have similar projects. One has a repository; the other has a
repository and a page explaining the problem they hit and how they solved it. The second is a person
with judgement; the first is a person with a repository.

**The structure, 500 to 800 words:**

1. **The problem** — what and why it mattered, concretely
2. **The approach** — what you built, briefly
3. **The interesting part** — one real problem in detail. This is the piece.
4. **What you learned** — specific, not "I learned a lot about teamwork"
5. **What you would do differently**

**The interesting part is the whole reason it exists.** One genuine problem, explained properly:

    "The report took four seconds. I assumed the query was slow, and EXPLAIN showed
     it using the index correctly. The time was in the loop calling the customer API
     once per row — 340 calls. One batched call took the report to 400ms. I had spent
     an hour optimising the query before measuring where the time actually went."

That paragraph demonstrates measurement over assumption, a real diagnosis, and honesty about wasted
effort. It is worth more than a page describing the architecture.

**Write about a failure sometimes.** A project that did not work, and why, is often more informative
than one that did — provided you understand the reason.

**Be specific with numbers.** "Made it faster" is nothing; "4s to 400ms" is evidence.

**Where to put them:** a \`WRITEUP.md\` in the repository is enough. A blog is better if you will keep
it; an abandoned blog with two posts from last year is worse than none.

**Avoid the tutorial voice.** You are not teaching Flask; you are describing what you did and why.
Nobody needs your introduction to what an API is.

**One good write-up per major project.** Three is a portfolio of thinking, which almost no applicant
at your level has.`,
    mcqs: [
      mcq('The core of a project write-up is:',
        [['One real problem, explained in detail', true],
          ['A description of the architecture', false],
          ['A list of features implemented', false],
          ['An explanation of the technologies used', false]],
        'It is the part that shows judgement rather than output.'),
      mcq('"I spent an hour optimising the query before measuring" is worth including because:',
        [['Honesty about wasted effort demonstrates real diagnosis', true],
          ['It fills out the narrative', false],
          ['It shows persistence', false],
          ['Reviewers expect some self-criticism', false]],
        'Measurement over assumption is the lesson being shown.'),
      mcq('"Made it faster" is weak where "4s to 400ms" is strong because:',
        [['Specific numbers are evidence and adjectives are not', true],
          ['Percentages are more impressive', false],
          ['Reviewers verify the numbers', false],
          ['It shows the measurement was taken', false]],
        'Be specific with numbers throughout.'),
      mcq('An abandoned blog with two posts from last year is:',
        [['Worse than having no blog at all', true],
          ['Better than nothing, since it shows intent', false],
          ['Neutral, as reviewers ignore dates', false],
          ['Worth keeping if the posts are good', false]],
        'A WRITEUP.md in the repository is enough.'),
    ],
    checkpoint: [
      mcq('Writing about a project that failed is valuable when:',
        [['You understand and can explain the reason', true],
          ['The failure was outside your control', false],
          ['It was a team project', false],
          ['You later rebuilt it successfully', false]],
        'Without the reason it is just a story about something not working.'),
      mcq('The tutorial voice should be avoided because:',
        [['You are describing what you did, not teaching', true],
          ['It makes the write-up too long', false],
          ['Reviewers already know the technology', false],
          ['It duplicates the documentation', false]],
        'Nobody needs your introduction to what an API is.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_DEMOS',
    notes: `Most reviewers will never run your code. A two-minute demonstration is how they see it
work anyway, and almost no student applicant has one.

**What a good demonstration is:** under two minutes, showing the thing working on real-looking data,
with a voice or captions explaining what is happening.

**The structure:**

1. **What this is** (10 seconds) — one sentence, the problem it solves
2. **The main flow** (60–80 seconds) — the thing it exists to do, end to end
3. **One interesting detail** (20 seconds) — something a viewer would not expect
4. **Where to find it** (10 seconds) — the repository

**Prepare before recording.** Data already loaded, windows sized, nothing else on screen, no
notifications, no personal information visible. A demonstration where somebody searches for the right
tab for fifteen seconds reads as unprepared, and fifteen seconds is an eighth of your time.

**Show, do not narrate the obvious.** "I am clicking the login button" is visible; "logging in as an
administrator, who can see every order" is information.

**Record it several times.** The third take is noticeably better than the first, and a two-minute
recording costs ten minutes to redo.

**Screenshots are the fallback**, and they work: three or four, showing the main screens, in the
README. Annotate them if anything needs pointing out.

**For anything without a screen** — a library, a command-line tool, an API — show the terminal: the
command, the output, and a failure being handled well. That last one is more persuasive than the
success.

**Host it simply.** An unlisted video link, or a GIF in the README for anything short. Do not make a
reviewer download a file.

**Caption it**, because many people watch with the sound off, and because captions survive a bad
microphone.

**The economics of this are unusual.** Twenty minutes of preparation produces the one artefact that
lets a reviewer evaluate your work without running it — which is almost all of them.`,
    mcqs: [
      mcq('A project demonstration should be:',
        [['Under two minutes, showing the main flow working', true],
          ['Five minutes, covering every feature', false],
          ['A guided tour of the code', false],
          ['A slide presentation about the design', false]],
        'The reviewer wants to see it work, not hear about it.'),
      mcq('"I am clicking the login button" is a poor narration because:',
        [['It describes what is already visible', true],
          ['It is too informal', false],
          ['Clicking should not be shown', false],
          ['It slows the demonstration down', false]],
        '"Logging in as an administrator, who sees every order" is information.'),
      mcq('For a command-line tool, the most persuasive thing to show is:',
        [['A failure being handled well', true],
          ['The full help output', false],
          ['The installation process', false],
          ['The source of the main function', false]],
        'Anybody can show a success; handling failure is the evidence.'),
      mcq('Captions are worth adding because:',
        [['Many people watch without sound, and microphones vary', true],
          ['They improve search visibility', false],
          ['They are required by most platforms', false],
          ['They allow faster playback', false]],
        'Cheap, and it removes a reason not to watch.'),
    ],
    checkpoint: [
      mcq('Searching for the right tab during a demonstration is costly because:',
        [['Fifteen seconds is an eighth of your time', true],
          ['It suggests the project is incomplete', false],
          ['Viewers stop watching immediately', false],
          ['It cannot be edited out', false]],
        'Prepare the screen before recording.'),
      mcq('The reason to invest twenty minutes in a demonstration is that:',
        [['It suits reviewers who will not run it', true],
          ['Videos rank higher in searches', false],
          ['It is expected on every application', false],
          ['It replaces the need for a README', false]],
        'Which describes almost all reviewers.'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_PORTFOLIO_BUILD',
    notes: `Assemble everything into a body of evidence somebody can evaluate in five minutes.

**Why assembly is its own task.** Three good projects scattered across a profile with nine others,
with inconsistent READMEs and no demonstrations, is not a portfolio. It is raw material. The assembly
— choosing, polishing, presenting, linking — is what turns it into something that works on your
behalf while you sleep.

**What is being assessed:** that the three pieces are genuinely your strongest, that each survives
ninety seconds of a stranger's attention, and that the whole set says something coherent about the
kind of engineer you are becoming.

**Build it in this order:**

1. **Choose three**, honestly, as a reviewer would rank them rather than as you feel about them.
2. **Fix each to the repository standard** — clean clone, README, tests, no secrets.
3. **Write a write-up per project.**
4. **Record a demonstration per project.**
5. **Tidy the profile** and pin them.
6. **Test it on somebody** who has never seen your work.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Assembling the Portfolio',
      description: 'Turn three pieces of work into a body of evidence a stranger can evaluate in five minutes, and test it on somebody who has never seen it.',
      instructions: `**The brief**

Assemble a portfolio of **three projects** into a coherent body of evidence, ready to send with an
application.

**Requirements**

1. **Three projects chosen deliberately**, with a written justification for each and a note on what
   you excluded and why.
2. **Each repository at standard**: runs from a clean clone, README with the full structure, tests
   passing, no secrets in the code or history, no debris.
3. **A write-up per project** (500–800 words) with a genuine problem explained in detail.
4. **A demonstration per project**, under two minutes, or annotated screenshots where a recording is
   not possible.
5. **A tidied profile**: bio, pinned repositories with descriptions, a profile README, forks and
   abandoned repositories removed or archived.
6. **A clean-clone verification** for each project, performed on a different machine or a fresh
   container, with a transcript.
7. **An external review**: somebody who has never seen your work spends five minutes on the profile
   and answers written questions about what each project does and whether they would interview you.
8. **Changes made in response to that review**, documented.

**What to submit**

1. The **profile link** and the three repository links.
2. The **selection rationale**, including what was excluded.
3. The **clean-clone transcripts**.
4. The **external review**: the questions asked, their answers, and what those answers revealed.
5. The **change log** after the review.
6. A **short write-up** (300–400 words): the gap between what you thought your portfolio said and
   what your reviewer thought it said; the single change that improved it most; what you would add
   over the next three months.

**Constraints**

- Only your own work, with collaborators credited where relevant.
- Every project must run from a clean clone, or say plainly in the README why it cannot.
- No secrets anywhere, including in the history.

**Where the marks are.** The external review and what you did about it. Everybody believes their
portfolio is clear; finding out from somebody else that it is not, and fixing it, is the entire
exercise.`,
      rubric: [
        {
          criterion: 'Selection',
          description: 'Three genuinely strongest pieces chosen with reasoning; exclusions justified; the set coherent rather than arbitrary.',
          maxPoints: 20,
        },
        {
          criterion: 'Repository quality',
          description: 'Each runs from a clean clone with a verification transcript; README complete; tests pass; no secrets and no debris.',
          maxPoints: 30,
        },
        {
          criterion: 'Presentation',
          description: 'A real write-up and demonstration per project; profile tidied with descriptions and pins; nothing buried.',
          maxPoints: 25,
        },
        {
          criterion: 'External review and response',
          description: 'A genuine outside review under time pressure, with honest answers recorded and specific changes made in response.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Names the gap between intended and received impression, the highest-value change, and a concrete three-month plan.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_INTERNSHIP ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_INTERNSHIP_WHAT_INTERNSHIPS_ARE',
    notes: `An internship is a company paying you to become useful, in the expectation that you might
become useful enough to keep. Understanding what they actually expect removes most of the fear.

**What they expect from a second-year intern:**

- You can program, at the level of writing a small feature with guidance
- You can use Git, a terminal and an editor without help
- You ask questions when stuck, and try first
- You take feedback without defensiveness
- You turn up and communicate about your work

**What they do not expect:**

- Knowledge of their codebase, tools or domain
- Working without supervision
- Contributing significantly in the first weeks
- Knowing any specific framework in advance

**A good intern is not the one who knows the most.** It is the one who learns fastest, asks well, and
is reliable — and those are the three things they are actually assessing for a return offer.

**What the experience is usually like:** the first week or two is setup and reading. Then a small,
low-risk task. Then progressively larger ones. Much of it is reading code, asking questions, and
waiting for reviews. If you are given something trivial in week one, that is the normal design, not a
judgement.

**The types you will meet in India:** formal summer programmes at large companies (structured,
competitive, apply months ahead), startup internships (less structured, more responsibility, more
variable quality), remote and part-time positions, and unpaid "internships" — which are often
unstructured free labour and should be treated with suspicion unless the learning is genuinely
exceptional.

**Timing matters.** Summer internship applications at large companies often open six to nine months
ahead. Knowing that in your second year is worth more than most advice in this topic.

**And the honest note about conversion:** many internships lead to offers, and many do not, for
reasons including headcount that have nothing to do with you. Treat it as experience and evidence
first; a return offer is an upside rather than the point.`,
    mcqs: [
      mcq('What a company most values in a second-year intern is:',
        [['How fast they learn and how reliably they work', true],
          ['How much they already know', false],
          ['How quickly they contribute features', false],
          ['Which frameworks they have used', false]],
        'Those are the things assessed for a return offer.'),
      mcq('Being given a trivial task in week one is:',
        [['The normal design of an internship', true],
          ['A signal they doubt your ability', false],
          ['A sign of poor planning by the team', false],
          ['A reason to ask for something larger', false]],
        'Setup and reading first, then low-risk work, then more.'),
      mcq('Summer internship applications at large Indian companies often open:',
        [['Six to nine months ahead', true],
          ['Two months before the summer', false],
          ['At the start of the summer term', false],
          ['Continuously through the year', false]],
        'Knowing this in second year is worth more than most careers advice.'),
      mcq('Unpaid internships should be treated with suspicion because:',
        [['They are often unstructured free labour', true],
          ['They are illegal in most states', false],
          ['They never lead to offers', false],
          ['They are not recognised by other employers', false]],
        'Unless the learning on offer is genuinely exceptional.'),
    ],
    checkpoint: [
      mcq('A large share of an internship is spent:',
        [['Reading code, asking, awaiting reviews', true],
          ['Writing new features independently', false],
          ['In training sessions and workshops', false],
          ['Working on a separate intern project', false]],
        'Which is also true of the first months of a real job.'),
      mcq('An internship that does not convert to an offer:',
        [['Often reflects headcount, not performance', true],
          ['Usually indicates poor performance', false],
          ['Should be left off your resume', false],
          ['Means the company was not hiring seriously', false]],
        'Treat it as experience and evidence first.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_JOB_DESCRIPTIONS',
    notes: `Job descriptions are written by people who are not the hiring manager, describing an ideal
candidate who does not exist. Reading them literally costs students more opportunities than anything
else in this topic.

**The structure, and what each part actually means:**

| Section | What it really is |
|---|---|
| About the company | Marketing |
| Responsibilities | The work — read this most carefully |
| Requirements | A wish list, partly negotiable |
| Nice to have | Genuinely optional |
| Benefits | Sometimes informative about the culture |

**"3+ years of experience" on an internship posting** usually means it was copied from another
posting. For genuinely junior roles, years are rarely the real filter.

**Separate the hard requirements from the wish list.** Hard: a degree if they say so and mean it,
legal right to work, specific location, occasionally one named technology. Everything else is
softer than it looks — and a list of fifteen technologies is a list of what their stack contains,
not a list of what you must already know.

**Read the responsibilities, not the requirements.** The responsibilities describe the actual job,
and they tell you whether you would want it and whether you could learn it.

**The well-documented pattern:** men typically apply meeting around 60% of listed requirements; women
typically wait until they meet nearly all of them. The people hiring expect candidates to meet
roughly half to two-thirds. **If you meet 60%, apply.**

**Warning signs worth noticing:** "rockstar" or "ninja" language, "we are like a family", a
requirement list of twenty items for a junior role, no salary information combined with vague
responsibilities, and anything asking for unpaid work as a test.

**Green flags:** a clear description of what you would work on in the first months, named mentorship,
a stated learning budget, and a described interview process.

**Look the company up** before applying: what they build, how big they are, what people say about
working there. Ten minutes, and it changes both your application and your questions at interview.`,
    mcqs: [
      mcq('The section of a job description worth reading most carefully is:',
        [['The responsibilities, which describe the actual work', true],
          ['The requirements, which set the bar', false],
          ['The company description, for context', false],
          ['The benefits, which indicate culture', false]],
        'Requirements are a wish list; responsibilities are the job.'),
      mcq('"3+ years of experience" on an internship posting usually means:',
        [['The text was copied from another posting', true],
          ['They will only consider experienced candidates', false],
          ['They expect internship experience elsewhere', false],
          ['The role is mislabelled and is actually senior', false]],
        'Years are rarely the real filter for junior roles.'),
      mcq('The advice on when to apply is:',
        [['Apply if you meet about 60% of the requirements', true],
          ['Apply only when you meet all of them', false],
          ['Apply regardless of the requirements', false],
          ['Apply if you meet the nice-to-haves', false]],
        'Which is roughly what those hiring actually expect.'),
      mcq('A list of fifteen technologies in a junior posting is:',
        [['A description of their stack, not a checklist for you', true],
          ['A sign the role is genuinely senior', false],
          ['A filter applied strictly at screening', false],
          ['An indication of a poorly defined role', false]],
        'Nobody expects a junior to arrive knowing all of them.'),
    ],
    checkpoint: [
      mcq('Which is a warning sign in a posting?',
        [['Asking for unpaid work as a test', true],
          ['A described interview process', false],
          ['A stated learning budget', false],
          ['Named mentorship for new joiners', false]],
        'Along with "we are like a family" and twenty requirements for a junior role.'),
      mcq('Ten minutes researching the company before applying changes:',
        [['Your application and your questions', true],
          ['Only your cover letter', false],
          ['Whether recruiters respond', false],
          ['The salary you can negotiate', false]],
        'It is the cheapest preparation available.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_MATCHING',
    notes: `Before applying, map what you have against what they asked for. Honestly, in writing, in
a table.

    | They asked for | My evidence | Strength |
    |---|---|---|
    | Python | Three projects, one 2,000 lines with tests | Strong |
    | SQL | Two projects with Postgres, schema design unit | Strong |
    | REST APIs | Built one, consumed three | Strong |
    | Docker | Used a provided container; never wrote one | Weak |
    | AWS | None | Missing |
    | Git in a team | Team project, pull requests, reviews | Adequate |

**Evidence means something you can point to.** "I know Python" is a claim; "here is a 2,000-line
project with tests, and here is what I decided and why" is evidence. If you cannot point to
something, mark it weak.

**Three honest categories:** *strong* means you could be asked about it in an interview and enjoy the
conversation. *Adequate* means you have done it once and could talk about it. *Weak or missing* means
do not claim it.

**Never claim a skill you cannot demonstrate.** It fails at interview, in a way that damages
everything else you said. "I have not used Docker, but I understand what containers solve and I would
expect to pick it up in a week" is a better answer than a claim that collapses under one question.

**Look at the pattern rather than the row.** Missing one thing is normal. Missing everything on the
infrastructure side tells you which direction to strengthen, and that is more useful than any
individual gap.

**Apply anyway when the pattern is mostly strong.** A couple of gaps with everything else in place is
a normal application, and the honest acknowledgement of a gap often reads better than a full list of
claims.

**Do this for three postings you would genuinely take.** The same gaps appearing in all three is your
learning plan for the next two months — which is the real output of this unit.

**Keep the table.** It is the raw material for your resume, your cover letter and your answers to
"tell me about your experience with X".`,
    mcqs: [
      mcq('Evidence, as opposed to a claim, means:',
        [['Something specific you can point to', true],
          ['A skill you have used more than once', false],
          ['A course you completed in it', false],
          ['A technology listed on your resume', false]],
        'If you cannot point to something, mark it weak.'),
      mcq('"Strong" in the matching table should mean:',
        [['You would enjoy being questioned about it', true],
          ['You have used it in at least one project', false],
          ['You could learn the rest quickly', false],
          ['You studied it in a course unit', false]],
        'Adequate is the category for "done once, could discuss it".'),
      mcq('Claiming a skill you cannot demonstrate is costly because:',
        [['It collapses at interview and damages everything else', true],
          ['Recruiters verify each claim', false],
          ['It raises expectations for the role', false],
          ['It invites harder technical questions', false]],
        'An honest gap with a plan reads better.'),
      mcq('The real output of this unit is:',
        [['The gaps appearing in all three postings', true],
          ['A ranked list of roles to apply for', false],
          ['A completed resume skills section', false],
          ['A decision about which posting suits you', false]],
        'That pattern is your learning plan for two months.'),
    ],
    checkpoint: [
      mcq('Missing one requirement from a posting is:',
        [['Normal, and not a reason to skip applying', true],
          ['A reason to wait and apply next cycle', false],
          ['Acceptable only for nice-to-haves', false],
          ['A gap to hide in the application', false]],
        'Look at the pattern rather than the row.'),
      mcq('"I have not used Docker, but I understand what containers solve" is:',
        [['A better answer than a claim that collapses', true],
          ['An admission best avoided', false],
          ['Acceptable only if asked directly', false],
          ['A sign you should not have applied', false]],
        'Honest gaps with a plan are credible; claims are checkable.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_CLOSING_GAPS',
    notes: `A gap with a date attached is a plan. A gap without one is an excuse that will still be
there in six months.

**Turn each gap into something specific:**

    Gap: Docker
    Plan: containerise my two strongest projects, with a docker-compose file
          for the app and its database
    Evidence produced: a Dockerfile in each repository, and a README section
    By: 15 October
    Time: two evenings

**Choose gaps that produce evidence.** Reading about Docker produces nothing a reviewer can see;
containerising a project produces a file in a repository and a paragraph in a README. Always prefer
the version that leaves something behind.

**Prioritise by three things:** how often it appeared across the postings you looked at, how long it
takes to close, and whether it blocks other things. A gap appearing in all three postings that takes
two evenings is the obvious first move.

**Be realistic about time.** Two gaps in two months, closed properly with evidence, beats eight
started and none finished. Depth is visible; breadth is claimed.

**What closes quickly**, in evenings rather than months: containerising an existing project, adding
tests to something that has none, deploying something publicly, writing the missing READMEs, adding
CI to a repository.

**What does not:** a new language to real competence, a substantial new domain, anything needing a
large project. Those are a term, not a fortnight — plan them as such or leave them.

**Some gaps are not worth closing.** A posting wanting a technology you have no interest in, for a
role you are lukewarm about, is a signal about the role rather than a task for you.

**Put dates in a calendar.** "I will learn Docker" happens in no month in particular; "Saturday and
Sunday evening, containerise the stock project" happens this weekend.

**Then update the evidence.** A closed gap that is not visible in your repositories or your resume is
a gap you closed for yourself and nobody else.`,
    mcqs: [
      mcq('A gap-closing plan should be chosen so that it:',
        [['Produces evidence a reviewer can see', true],
          ['Covers the theory thoroughly first', false],
          ['Matches the posting\'s exact wording', false],
          ['Can be completed before applying', false]],
        'Reading about Docker leaves nothing behind; containerising a project does.'),
      mcq('Two gaps closed properly in two months beats eight started because:',
        [['Depth is visible where breadth is only claimed', true],
          ['Employers count completed skills', false],
          ['Unfinished work damages an application', false],
          ['Fewer gaps are easier to discuss', false]],
        'Evidence is the currency, not intention.'),
      mcq('Which gap closes in evenings rather than months?',
        [['Adding CI to an existing repository', true],
          ['Learning a new language properly', false],
          ['Entering an unfamiliar domain', false],
          ['Building a substantial new project', false]],
        'Plan the long ones as a term, or leave them.'),
      mcq('A gap you have no interest in, for a role you are lukewarm about, is:',
        [['A signal about the role rather than a task', true],
          ['Still worth closing for other applications', false],
          ['The highest priority, since it blocks you', false],
          ['Best closed superficially for the resume', false]],
        'Not every gap deserves your two months.'),
    ],
    checkpoint: [
      mcq('"I will learn Docker" fails where a calendar entry succeeds because:',
        [['It happens in no particular month', true],
          ['It is too large a goal', false],
          ['It lacks a measurable outcome', false],
          ['It does not name a project', false]],
        '"Saturday evening, containerise the stock project" happens this weekend.'),
      mcq('A closed gap that is not visible in your repositories or resume is:',
        [['A gap you closed for yourself and nobody else', true],
          ['Still valuable at interview', false],
          ['Worth mentioning in a cover letter only', false],
          ['Evidence of self-directed learning', false]],
        'Update the evidence as part of closing it.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_RESUME',
    notes: `A resume gets somewhere between six and thirty seconds on the first pass. Everything about
how to write one follows from that.

**One page.** At your stage there is no exception. A second page is unread, and it dilutes the first.

**The order that works for a student:**

    Name · phone · email · GitHub · LinkedIn · city
    Education — degree, institution, expected year, CGPA if it is good
    Projects — the section that matters most at your stage
    Skills — grouped, honest
    Experience — internships, freelance, teaching, anything paid
    Achievements — competitions, publications, relevant positions

**Projects come before skills**, because a project is evidence and a skill list is a claim. Two or
three projects, each:

    Stock Reconciliation Tool — Python, Flask, PostgreSQL          github.com/you/stock
    Turns a two-hour manual reconciliation into a 30-second report for a retail
    business. Handles 50,000 rows; processing is streamed so memory stays flat.
    Tested with 40 cases including malformed input.

Three lines: what it does, one specific technical fact, one piece of evidence of rigour.

**Write bullets as outcomes, not duties:**

    "Worked on the backend team"
    "Built the order export endpoint, cutting a manual step that took support 2 hours a week"

**Numbers wherever you honestly have them.** Rows, users, milliseconds, percentage, hours saved.
Specificity reads as truth because vague claims are what padding looks like.

**Skills, grouped and honest:**

    Languages: Python, JavaScript, SQL
    Frameworks: Flask, React
    Tools: Git, Docker, PostgreSQL, Linux

No percentage bars, no star ratings, and nothing listed that you could not discuss for two minutes.

**Tailor it to the posting.** Reorder projects so the most relevant is first, and mirror the
vocabulary they used. Ten minutes per application, and it materially changes the response rate.

**Formatting:** plain, one column, standard fonts, PDF, named \`FirstnameLastname_Resume.pdf\`.
Fancy two-column templates confuse automated screening, and the template is not what is being
assessed.

**Proofread it twice, and have somebody else read it.** A typo on a one-page document is a data point
about your attention to detail, and it is read as one.`,
    mcqs: [
      mcq('A student resume should be:',
        [['One page, with no exception at this stage', true],
          ['Two pages if the projects justify it', false],
          ['As long as needed to cover everything', false],
          ['One page, plus a separate project sheet', false]],
        'A second page is unread and dilutes the first.'),
      mcq('Projects come before skills because:',
        [['A project is evidence and a skill list is a claim', true],
          ['Recruiters read from the bottom up', false],
          ['Skills change more often', false],
          ['Projects are easier to verify', false]],
        'Evidence outranks assertion everywhere in this topic.'),
      mcq('"Built the order export endpoint, cutting a 2-hour weekly manual step" is better than "Worked on the backend team" because:',
        [['It states an outcome rather than a duty', true],
          ['It names the technology used', false],
          ['It is longer and more detailed', false],
          ['It mentions a specific team', false]],
        'Numbers wherever you honestly have them.'),
      mcq('Two-column resume templates are discouraged because:',
        [['They confuse automated screening systems', true],
          ['They look unprofessional', false],
          ['They cannot be exported as PDF', false],
          ['They encourage longer content', false]],
        'The template is not what is being assessed.'),
    ],
    checkpoint: [
      mcq('Nothing should appear in your skills list unless:',
        [['You could discuss it for two minutes', true],
          ['You have used it in a course', false],
          ['It appears in the job posting', false],
          ['You have read its documentation', false]],
        'No percentage bars and no star ratings either.'),
      mcq('A typo on a one-page resume is read as:',
        [['A data point about your attention', true],
          ['An understandable oversight', false],
          ['Irrelevant to technical roles', false],
          ['A sign of rushed submission only', false]],
        'Proofread twice, and have somebody else read it.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_APPLYING',
    notes: `Applying is a process with a hit rate, and treating it as one rather than as a series of
emotional events is most of what makes it bearable.

**Where to apply:**

- **Company career pages directly** — the highest response rate, and the most overlooked
- **LinkedIn**, with alerts set for your city and level
- **Internshala, Naukri, Instahyre, AngelList/Wellfound** for startups
- **Your college placement cell**, which is easy to under-use
- **Alumni**, who reply far more often than strangers
- **Referrals**, which have a dramatically higher response rate than any job board

**A referral is worth roughly ten cold applications.** Ask politely, include your resume and two
lines about why that company, and make it easy to say no. Most people are willing; almost nobody is
asked.

**What to send:** a tailored resume, and a short note. Three paragraphs:

    Why this company, specifically — one sentence showing you looked.
    What you bring — one project relevant to what they do, with a result.
    What you want — the role, and your availability.

Not a page. Not "I am writing to express my interest in the position advertised".

**Track everything**, in a spreadsheet:

| Company | Role | Applied | Source | Contact | Status | Next action |
|---|---|---|---|---|---|---|

Without it you will apply twice to the same company, miss follow-ups, and lose track of who said
what.

**Follow up once**, seven to ten days later, briefly. Once. A second follow-up is not persuasive.

**Volume with tailoring.** Fifty generic applications produce fewer responses than twenty tailored
ones — but five tailored ones produce nothing either, because the rates are what they are. Twenty to
thirty, tailored, over a few weeks.

**On rejection:** most applications do not get a reply at all, and that is a fact about the process
rather than about you. Companies fill roles internally, freeze headcount, and receive hundreds of
applications for one position.

**Apply early in the cycle.** Applications submitted in the first week of a posting are read more
carefully than those in the fourth, when the reader is tired and the shortlist mostly exists.`,
    mcqs: [
      mcq('A referral is worth roughly:',
        [['Ten cold applications', true],
          ['Two cold applications', false],
          ['A hundred cold applications', false],
          ['The same as a direct application', false]],
        'Most people are willing to give one; almost nobody is asked.'),
      mcq('The highest-response application route, and the most overlooked, is:',
        [['The company\'s own career page', true],
          ['LinkedIn job postings', false],
          ['Large job boards', false],
          ['Recruitment agencies', false]],
        'Referrals aside, direct applications outperform aggregators.'),
      mcq('A covering note should be:',
        [['Three short paragraphs: why them, what you bring, what you want', true],
          ['One page, formally structured', false],
          ['A summary of your resume', false],
          ['Omitted, since resumes are what is read', false]],
        'Not "I am writing to express my interest in the position advertised".'),
      mcq('Applications sent in the first week of a posting are:',
        [['Read more carefully than later ones', true],
          ['Held until the deadline passes', false],
          ['Treated identically to later ones', false],
          ['Less likely to be seen by the manager', false]],
        'By the fourth week the shortlist mostly exists.'),
    ],
    checkpoint: [
      mcq('You should follow up on an application:',
        [['Once, after seven to ten days', true],
          ['Twice, a week apart', false],
          ['Every week until answered', false],
          ['Only if the posting invites it', false]],
        'A second follow-up is not persuasive.'),
      mcq('Getting no reply to most applications is:',
        [['A fact about the process, not about you', true],
          ['A signal your resume needs rewriting', false],
          ['Evidence you applied to the wrong roles', false],
          ['Unusual and worth investigating', false]],
        'Internal fills, freezes and hundreds of applicants per role.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_BEHAVIOURAL',
    notes: `Behavioural questions ask you to describe something you actually did. They are predictable,
and preparing for them is the highest-return hour in interview preparation.

**The questions, and there are not many:**

- Tell me about yourself
- A difficult problem you solved
- A time you disagreed with somebody
- A mistake you made
- A time you had to learn something quickly
- How you handle a deadline you might miss
- Why this company, and why this role

**The structure: situation, task, action, result.** Brief on the first two, most of your time on the
action, and always finish with the result.

    "In our team project the integration kept failing three days before the deadline.
     [situation] I was responsible for the API side. [task] I proposed we agree the
     exact response shape in writing before either of us changed anything more, and
     I wrote a stub that returned that shape so my partner could work against it
     while I finished. [action] We integrated the next morning in under an hour, and
     we used the same approach for the second feature. [result]"

**Use real examples.** Invented ones fall apart under a follow-up question, and the follow-up is
always "what would you do differently?".

**Prepare five stories, and reuse them.** A difficult technical problem, a disagreement, a mistake, a
fast learn, and a delivery under pressure. Five stories cover almost every behavioural question
asked.

**"Tell me about yourself" is not a biography.** Ninety seconds: where you are now, what you have
been building, why this role. Prepare it word for word; it is the first question in most interviews
and it sets the tone for the rest.

**The mistake question is not a trap.** Say what happened, take responsibility without excessive
apology, and say what changed as a result. "I did not have tests, we shipped a bug, I now write tests
for anything touching money" is a complete and good answer.

**"Why this company" requires ten minutes of research**, and it is obvious when it has not been done.
One specific sentence about what they build is enough.

**Have questions of your own.** What does the first month look like, who would I work with, how is
feedback given, what does success look like at three months. Not asking any reads as not caring.`,
    mcqs: [
      mcq('The recommended structure for a behavioural answer is:',
        [['Situation, task, action, result', true],
          ['Problem, solution, outcome, lesson', false],
          ['Context, challenge, approach, reflection', false],
          ['Background, decision, consequence, change', false]],
        'Brief on the first two, most time on the action.'),
      mcq('Invented examples fail because:',
        [['The follow-up question is always what you would change', true],
          ['Interviewers verify them with references', false],
          ['They sound rehearsed', false],
          ['They are usually too generic', false]],
        'A story you did not live has no second layer.'),
      mcq('Preparing five stories is sufficient because:',
        [['They cover almost every behavioural question asked', true],
          ['Interviews rarely ask more than five', false],
          ['More would be difficult to remember', false],
          ['Interviewers ask for variety only rarely', false]],
        'A hard problem, a disagreement, a mistake, a fast learn, a delivery.'),
      mcq('"Tell me about yourself" should be:',
        [['Ninety seconds, prepared word for word', true],
          ['A brief personal biography', false],
          ['An overview of your education', false],
          ['An improvised honest answer', false]],
        'It is the first question and it sets the tone.'),
    ],
    checkpoint: [
      mcq('A good answer to the mistake question ends with:',
        [['What changed as a result', true],
          ['An apology for the impact', false],
          ['An explanation of the circumstances', false],
          ['A statement that it was a team issue', false]],
        'Responsibility without excessive apology, then the change.'),
      mcq('Having no questions for the interviewer reads as:',
        [['Not caring about the role', true],
          ['Efficient use of their time', false],
          ['Confidence in what you learned', false],
          ['A neutral outcome', false]],
        'Ask about the first month, the team, and feedback.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_PROJECT_INTERVIEW',
    notes: `"Tell me about this project" is the question where most interviews are actually decided,
because everything after it is a follow-up.

**What they are testing:** whether you built it, whether you understand it, whether you made
decisions or followed a tutorial, and whether you can explain technical work to a person.

**The two-minute description:**

1. **The problem** — one sentence, concrete
2. **What it does** — what somebody can accomplish with it
3. **How it is built** — the shape, at a level they can follow
4. **The interesting part** — the hardest problem, and how you solved it

Then stop. Let them ask.

**The questions that always follow:**

- Why did you choose that database / framework / structure?
- What was the hardest part?
- What would you do differently?
- How would this handle a thousand times more users?
- What happens if that external service is down?
- How did you test it?
- Walk me through what happens when a user clicks this.

**Every one of those is answerable if you built it and kept a decision log.** None of them are
answerable if you followed a tutorial, and interviewers know precisely which questions separate the
two.

**"What would you do differently" is not a trap.** It is the question most likely to impress, because
answering it well proves you evaluated your own work. Have a real answer prepared.

**Scaling questions are about reasoning**, not about the correct answer: "the report loads everything
into memory, so at a thousand times the data that breaks first. I would stream it, and page the
interface. The database would be fine — the query uses the index."

**Do not oversell.** Claiming a toy project is production-ready invites questions it cannot survive.
"It handles what I built it for; here is where it would stop" is stronger and always true.

**Know your own code.** Re-read your project the night before. Being unable to explain your own
function is the most damaging thing that can happen in one of these conversations.

**Bring the project up yourself** if they do not. "Would it help if I walked you through the
reconciliation tool?" is a reasonable thing to offer, and it moves the conversation onto ground you
have prepared.`,
    mcqs: [
      mcq('Interviewers ask about your project mainly to find out:',
        [['Whether you made decisions or followed a tutorial', true],
          ['Which technologies you have used', false],
          ['How long the project took to build', false],
          ['Whether the project is impressive', false]],
        'The follow-up questions are designed to separate the two.'),
      mcq('"What would you do differently?" is:',
        [['The question most likely to impress, answered well', true],
          ['A trap best answered briefly', false],
          ['An invitation to criticise the project', false],
          ['Asked only when the interview is going badly', false]],
        'Answering it proves you evaluated your own work.'),
      mcq('A scaling question is testing:',
        [['Your reasoning about what breaks first', true],
          ['Knowledge of distributed systems', false],
          ['Whether the project was designed to scale', false],
          ['Familiarity with cloud infrastructure', false]],
        'Name the bottleneck and what you would do; that is the answer.'),
      mcq('Claiming a small project is production-ready:',
        [['Invites questions it cannot survive', true],
          ['Shows appropriate confidence', false],
          ['Is expected in interviews', false],
          ['Is safe if the code is clean', false]],
        '"Here is where it would stop" is stronger and always true.'),
    ],
    checkpoint: [
      mcq('The most damaging thing in a project interview is:',
        [['Being unable to explain your own code', true],
          ['Admitting a design was imperfect', false],
          ['Not knowing how it would scale', false],
          ['Having used a small framework', false]],
        'Re-read your project the night before.'),
      mcq('After the two-minute description, you should:',
        [['Stop and let them ask', true],
          ['Continue into the technical detail', false],
          ['Ask whether they want more', false],
          ['Move on to the next project', false]],
        'The follow-ups are where the interview actually happens.'),
    ],
  },

  {
    unitCode: 'T2_INTERNSHIP_MOCK_INTERVIEW',
    notes: `A full interview, start to finish, with somebody who will be honest with you afterwards.

**Why it has to be a real rehearsal.** Reading about interviews prepares you for none of it: the
first question arriving before you have settled, the silence while you think, the follow-up you did
not expect, the technical question you half know. Those are all survivable and none of them are
learnable from notes.

**The structure of a typical internship interview**, and of this mock:

1. **Introduction** (5 minutes) — tell me about yourself, why this role
2. **Technical questions** (15–20 minutes) — fundamentals from your year, and your track
3. **A practical problem** (15–20 minutes) — a small problem, thinking out loud
4. **Project discussion** (10 minutes) — one project, with follow-ups
5. **Your questions** (5 minutes)

**Think out loud on the practical problem.** A silent candidate who reaches the right answer scores
below one who explains their reasoning, because the reasoning is what is being assessed. State the
problem back, name the cases, say your approach before coding, and narrate as you go.

**When you do not know:** say so, then reason. "I have not used that, but it sounds similar to X —
would it work like this?" is a good answer. Silence and bluffing are the two bad ones.

**Get feedback on the specific things:** what was unclear, where you lost them, whether your examples
landed, what your body language and pace were doing, and what they would have scored you on.

**Then act on it, and do it again.** A single mock interview with feedback you did not use is an
afternoon spent. The second one, after acting on the first, is where the improvement actually shows.

**Record it if you can.** You will notice things nobody would tell you — the filler words, the rushing
when nervous, the trailing off at the end of answers.

**On nerves:** everybody has them, interviewers expect them, and they diminish with repetition more
reliably than with any technique. This mock is the repetition.

**The point is not to perform well here.** It is to find, in a room where nothing is at stake, the
things that would have cost you an offer in a room where something was.`,
    mcqs: [
      mcq('On a practical problem, thinking out loud matters because:',
        [['The reasoning is what is being assessed', true],
          ['It fills the silence comfortably', false],
          ['It slows you down usefully', false],
          ['Interviewers cannot follow silent work', false]],
        'A silent correct answer scores below an explained one.'),
      mcq('When asked something you do not know, the best response is:',
        [['Say so, then reason from something adjacent', true],
          ['Stay silent while you think it through', false],
          ['Give your most plausible guess', false],
          ['Move the conversation to what you know', false]],
        'Silence and bluffing are the two bad options.'),
      mcq('A single mock interview whose feedback you do not act on is:',
        [['An afternoon spent rather than invested', true],
          ['Still valuable as exposure', false],
          ['Sufficient preparation for most interviews', false],
          ['Better than no practice at all', false]],
        'The second one, after acting on the first, is where improvement shows.'),
      mcq('Interview nerves diminish most reliably through:',
        [['Repetition', true],
          ['Breathing techniques', false],
          ['Thorough technical preparation', false],
          ['Reframing the situation', false]],
        'Which is what the mock is for.'),
    ],
    checkpoint: [
      mcq('The purpose of the mock interview is to:',
        [['Find what would cost you an offer, safely', true],
          ['Demonstrate readiness to your mentor', false],
          ['Practise the technical answers', false],
          ['Assess your progress this year', false]],
        'Performing well here is not the point.'),
      mcq('Useful feedback from a mock interview covers:',
        [['Where they lost you, and how your pace read', true],
          ['Whether your answers were correct', false],
          ['How you compared to other candidates', false],
          ['Which topics to revise next', false]],
        'The things nobody would tell you unprompted.'),
    ],
  },
];
