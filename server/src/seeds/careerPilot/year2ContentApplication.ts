/**
 * Twelve application units — practice, debugging and a project — across six Year-2 topics.
 *
 * ── WHY THESE TWELVE, AND WHY APPLICATION ─────────────────────────────────────────────────
 *
 * `unitSuitabilityPolicy` says a CONCEPT unit stops serving a learner at STANDARD: somebody who
 * has proved a skill gets application instead of re-instruction. That is right, and it means a
 * strong second-year's whole plan has to be built out of PRACTICE, DEBUG, PROJECT and CHECKPOINT
 * units. Year 2 held 92 of those against 204 lessons, so a strong learner ran out of year — the
 * composer reached 92 units for a 110-day programme and reported the shortfall honestly.
 *
 * These six topics are the thinnest, and each gap is a defect on its own terms rather than only
 * an arithmetic one:
 *
 *   T2_DEBUGGING       a topic about debugging with no DEBUG unit in it
 *   T2_GIT_TEAM        eight lessons on collaborating, no practice and no diagnosis
 *   T2_PORTFOLIO       six lessons on evidence, no practice at judging any
 *   T2_COMMUNICATION   five lessons, one practice unit, and nothing built
 *   T2_CLEAN_CODE      a unit on reviewing, and no practice at reviewing
 *   T2_DSA_INTERVIEW   timed practice, but nothing on the solution that is correct and too slow
 *
 * ── WHAT MAKES AN APPLICATION UNIT WORTH A DAY ────────────────────────────────────────────
 *
 * Not more questions about the lesson. A practice unit earns its place when the work in it can
 * only be done by somebody who holds the material — so the exercises here take a position and
 * ask the student to defend or repair it, rather than asking them to recall what a branch is.
 *
 * Attribution: GIT_TEAM, DEBUGGING and PORTFOLIO are single-skill and derived. The DSA units,
 * the review practice and the communication project carry overrides in year2SkillAttribution.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const APPLICATION_BUNDLES: PilotBundle[] = [
  /* ══ T2_GIT_TEAM ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_GIT_TEAM_DEBUGGING',
    notes: `**A history is evidence.** When a repository is in a state nobody meant, the log
says how it got there — and reading it is faster than asking four people what they did.

## The five things that actually go wrong

**A branch taken off the wrong base.** Somebody branched from another feature instead of the
main line, so their pull request contains that feature's commits as well as their own.

**The tell:** the diff is much larger than the description, and it contains changes the author
cannot explain.

**A merge that took the wrong side.** A conflict resolved by keeping one version wholesale, so
somebody else's work is gone while the history says it was merged.

**The tell:** the file has no trace of a change the log says was merged.

**A commit on the wrong branch.** Work committed to the main line directly, or to whichever
branch happened to be checked out.

**A force push over somebody else's work.** The commits are not in the branch any more and
nothing in the current log mentions them.

**And a secret committed and then removed.** The current files are clean, the history is not.

## Reading it

**Start with the shape, not the detail.** A graph of the recent history shows where branches
left the line and where they came back, and it is the one view that makes a wrong base obvious.

**Then the file.** The history of one file tells you every change to it and who made each.

**Then the content.** Searching the history for a string finds the commit that introduced or
removed it — **which is how you find work that has disappeared**, because the commit still
exists even when no branch points at it.

**And the reflog**, which records where a branch has pointed locally. **Nothing is really gone
until the reflog expires**, and that is the single most useful fact in this unit.

## The rule for repairing it

**Diagnose before you touch it.** The instinct to fix a confusing repository by running
commands until it looks right is what turns a recoverable state into an unrecoverable one.

**And never rewrite shared history to tidy it.** Rewriting what somebody else has already
pulled gives them a different history from yours, and the next merge between you is
unresolvable.

## What cannot be recovered from the history

**Work that was never committed.** An uncommitted change discarded is gone, and no amount of
log reading brings it back.

**Which is the argument for committing often** — a commit is a save point, and a branch nobody
sees costs nothing.`,
    mcqs: [
      mcq('A pull request whose diff is much larger than its description usually means:',
        [['The branch was taken off another feature rather than the main line', true],
          ['The author committed generated files by accident', false],
          ['A merge brought in changes from the main line', false],
          ['The description was written before the work finished', false]],
        'It contains that feature’s commits as well as its own.'),
      mcq('A file with no trace of a change the log says was merged indicates:',
        [['A conflict resolved by keeping one side wholesale', true],
          ['A merge that was reverted in a later commit', false],
          ['A force push that removed the merge commit', false],
          ['A rebase that dropped the commit silently', false]],
        'The history says merged; the content says otherwise.'),
      mcq('Searching the history for a string finds work that has disappeared because:',
        [['The commit still exists even when no branch points at it', true],
          ['Removed lines are kept in a separate index', false],
          ['Deleted branches leave a record in the log', false],
          ['The search covers the working tree as well', false]],
        'Which is how you recover after a force push.'),
      mcq('The single most useful fact in this unit is:',
        [['Nothing is really gone until the reflog expires', true],
          ['A merge commit records both of its parents', false],
          ['The graph view reveals where a branch left the line', false],
          ['A commit can be recovered from its hash alone', false]],
        'The reflog records where a branch has pointed locally.'),
    ],
    checkpoint: [
      mcq('Running commands until a confusing repository looks right:',
        [['Is what turns a recoverable state into an unrecoverable one', true],
          ['Is reasonable enough when the history is only a local one', false],
          ['Works provided nothing has been pushed yet', false],
          ['Is faster than diagnosing for simple cases', false]],
        'Diagnose before you touch it.'),
      mcq('Rewriting history somebody else has already pulled:',
        [['Gives them a different history, so the next merge cannot be resolved', true],
          ['Requires them to force push their own branch afterwards', false],
          ['Is safe as long as the content is identical', false],
          ['Only affects branches that have diverged', false]],
        'Never rewrite shared history to tidy it.'),
      mcq('The one thing the history cannot recover is:',
        [['A change that was never committed', true],
          ['A branch that was deleted after merging', false],
          ['A commit removed by a force push', false],
          ['A file deleted several commits ago', false]],
        'Which is the argument for committing often.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_PRACTICE',
    notes: `Two exercises on the parts of collaborating that are mechanical: deciding whether a
branch is safe to merge, and resolving a conflict without losing either side.`,
    coding: [
      {
        title: 'Is this branch ready to merge',
        description: `Read one branch per line as
\`<name> <behind_main> <conflicts> <reviewed> <tests_pass>\`, where behind_main is a number of
commits and the last three are \`yes\` or \`no\`.

Print, checking in this order:

- \`tests_pass\` is no → \`FIX_TESTS <name>\`
- \`conflicts\` is yes → \`RESOLVE <name>\`
- \`reviewed\` is no → \`NEEDS_REVIEW <name>\`
- \`behind_main\` is 20 or more → \`UPDATE <name>\`
- otherwise → \`MERGE <name>\`

Then \`merge=<n>\`.

**Tests come first** because a red branch is not a review problem, and asking somebody to read
a change that does not work wastes the scarcest thing on the team.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Tests first: a red branch is not a review problem.
`,
        language: 'python',
        tests: [
          { input: 'feat 3 no yes yes\n', expectedOutput: 'MERGE feat\nmerge=1' },
          { input: 'feat 3 no yes no\n', expectedOutput: 'FIX_TESTS feat\nmerge=0' },
          { input: 'feat 3 yes yes yes\n', expectedOutput: 'RESOLVE feat\nmerge=0' },
          { input: 'feat 3 no no yes\n', expectedOutput: 'NEEDS_REVIEW feat\nmerge=0' },
          { input: 'a 40 no yes yes\nb 0 no yes yes\nc 5 yes no no\n', expectedOutput: 'UPDATE a\nMERGE b\nFIX_TESTS c\nmerge=1', isHidden: true },
        ],
      },
      {
        title: 'Resolving without losing anybody',
        description: `A conflicted file is given as lines. A conflict region looks like:

    <<<<<<<
    ours line(s)
    =======
    theirs line(s)
    >>>>>>>

Resolve every region by **keeping both sides, ours first**, and print the resolved file.

Lines outside a conflict region pass through unchanged. **Keeping both is not always the right
resolution in real work** — but it never silently discards somebody's line, which is the
failure this exercise is about.`,
        starter: `import sys

lines = sys.stdin.read().split('\\n')

# Keep both sides. Never silently discard a line.
`,
          language: 'python',
        tests: [
          { input: 'a\n<<<<<<<\nmine\n=======\nyours\n>>>>>>>\nb\n', expectedOutput: 'a\nmine\nyours\nb' },
          { input: '<<<<<<<\nx\n=======\ny\n>>>>>>>\n', expectedOutput: 'x\ny' },
          { input: 'plain\n', expectedOutput: 'plain' },
          { input: '<<<<<<<\n=======\nonly\n>>>>>>>\n', expectedOutput: 'only' },
          { input: 'p\n<<<<<<<\n1\n2\n=======\n3\n>>>>>>>\nq\n<<<<<<<\nm\n=======\nn\n>>>>>>>\n', expectedOutput: 'p\n1\n2\n3\nq\nm\nn', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Branching and Merging Practice',
      description: 'Judge merge readiness, resolve conflicts without loss, then do it on a real repository.',
      instructions: `Complete both exercises, then:

1. For the first: tests are checked before review. Say what it costs a team to review a branch
   whose tests fail, and who pays it.
2. For the second: keeping both sides never loses a line but is often wrong. Give a case where
   it produces broken code, and say how you would resolve that one instead.
3. For the second: say what you would do with a conflict you do not understand.

**Then, on a real repository** — one of yours, with a second clone or a colleague.

4. Make two branches from the same commit that change the same line. Merge one, then the other.
   Resolve the conflict by understanding both, not by picking.
5. Make a branch off the wrong base on purpose. Look at the pull request diff and record what
   it shows.
6. Commit a change, then find it in the history by searching for a string in it.
7. Commit something, reset the branch past it, then recover it from the reflog. **Record the
   commands that worked.**
8. Push a branch, force push over it, and recover the lost commit.
9. Write a short note on which of those you would be comfortable doing on a shared repository
   and which you would not.`,
      rubric: [
        { criterion: 'Merge readiness judged', description: 'All cases, in the stated order of checks.', maxPoints: 15 },
        { criterion: 'Conflicts resolved without loss', description: 'All cases, including multiple regions and an empty side.', maxPoints: 15 },
        { criterion: 'A real conflict resolved by understanding', description: 'Two branches, one line, resolved on the merits rather than by picking.', maxPoints: 20 },
        { criterion: 'A wrong base diagnosed', description: 'Created deliberately, with what the diff showed recorded.', maxPoints: 15 },
        { criterion: 'Recovery performed', description: 'A commit found by content, and one recovered from the reflog, with the commands.', maxPoints: 20 },
        { criterion: 'Judgement about shared history', description: 'Which operations are safe on a shared repository, and why.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'feat 3 no yes yes\n', expectedOutput: 'MERGE feat\nmerge=1' },
          { input: 'feat 3 no yes no\n', expectedOutput: 'FIX_TESTS feat\nmerge=0' },
          { input: 'feat 3 yes yes yes\n', expectedOutput: 'RESOLVE feat\nmerge=0' },
          { input: 'feat 3 no no yes\n', expectedOutput: 'NEEDS_REVIEW feat\nmerge=0' },
          { input: 'a 40 no yes yes\nb 0 no yes yes\nc 5 yes no no\n', expectedOutput: 'UPDATE a\nMERGE b\nFIX_TESTS c\nmerge=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Reviewing a branch whose tests fail costs:',
        [['The reviewer’s attention, which is the scarcest thing on a team', true],
          ['A second review once the tests are fixed', false],
          ['Time that the author should really have spent on it instead', false],
          ['Confidence in the test suite itself', false]],
        'Tests come before review for exactly that reason.'),
      mcq('Keeping both sides of a conflict produces broken code when:',
        [['The two sides are alternative implementations of the same thing', true],
          ['The two sides touch quite different parts of the file', false],
          ['One side is longer than the other', false],
          ['The conflict spans more than one region', false]],
        'It never loses a line, which is a different question from being right.'),
      mcq('A conflict you do not understand should be:',
        [['Taken to whoever wrote the other side', true],
          ['Resolved by keeping the newer change', false],
          ['Resolved by keeping the main line version', false],
          ['Left for the author of the pull request', false]],
        'Resolving by understanding both sides is the unit’s whole point.'),
    ],
  },

  /* ══ T2_DEBUGGING ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DEBUGGING_SUBTLE_FAULTS',
    notes: `**Code that reads as correct, passes the obvious test, and is wrong.** These are the
faults that reach production, because every cheap check passes.

## Why a careful read does not find them

**You read what you meant.** Having formed an expectation of what the code does, you see that
rather than what is written — which is why somebody else finds your bug in thirty seconds.

**The obvious test passes.** The example in the ticket works. The case that breaks it is one
nobody wrote down.

**And it is not wrong most of the time.** A fault on one input in a thousand is invisible until
the thousand arrive.

## The shapes worth memorising

**The boundary.** \`<\` where \`<=\` was meant, or a loop that stops one short. **Correct for every
input except the exact edge**, which is the input nobody tries by hand.

**The empty case.** A sum over nothing, a maximum of no items, a first element that is not
there. Frequently a crash, sometimes worse: a plausible wrong answer.

**The single-item case.** Anything comparing adjacent pairs does nothing at all with one item,
and that is often the wrong answer rather than no answer.

**Integer division.** Where a fraction was meant. Quietly floors, and the difference only shows
at scale.

**Mutating while iterating.** Removing from a list you are walking skips elements, silently.

**The shared default.** A mutable default argument or a shared object that accumulates across
calls, so the second call behaves differently from the first.

**Two names for one object.** Assigning a list does not copy it, so changing one changes both.

**And the condition that is always true.** \`if x = 1\` in languages that allow it, or a check
against the wrong variable.

## How to find them without luck

**Run the boundary by hand.** Empty, one, two, the maximum. **Four inputs, and they find most
of this class** — which is why the testing topic put them first.

**Say what the code does out loud**, line by line, in terms of values rather than intent.
Saying "i goes from zero to length minus one" is where you notice it should be length.

**Diff against a simpler version.** Write the obvious slow implementation and compare the two on
random inputs. **Disagreement on any input is the fault, located** — and this is the most
reliable technique in the unit because it needs no insight at all.

**And read the code as though somebody else wrote it**, looking for what it says rather than
confirming what you expect.

## What not to do

**Do not add print statements everywhere.** You will read the output for the case that already
works.

**Do not change something to see what happens.** Form a hypothesis first — the topic's own
lesson.

**And do not stop at the first thing you find.** A file with one subtle fault often has two,
because both came from the same misunderstanding.`,
    mcqs: [
      mcq('A careful read misses these faults because:',
        [['You read what you meant rather than what is written', true],
          ['Subtle faults are hidden in unfamiliar syntax', false],
          ['Reading is slower than running the code', false],
          ['The faults are usually in library behaviour', false]],
        'Which is why somebody else finds your bug in thirty seconds.'),
      mcq('Anything comparing adjacent pairs, given one item:',
        [['Does nothing at all, which is often the wrong answer rather than no answer', true],
          ['Raises an index error on the second element', false],
          ['Returns the item itself, which is usually correct', false],
          ['Behaves the same as it does for two items', false]],
        'The single-item case, which the example never covers.'),
      mcq('The most reliable technique in this unit is:',
        [['Comparing against an obvious slow implementation on random inputs', true],
          ['Running the four boundary inputs by hand', false],
          ['Saying what the code does out loud, line by line', false],
          ['Reading it as though somebody else wrote it', false]],
        'It needs no insight at all: disagreement on any input locates the fault.'),
      mcq('A file with one subtle fault often has two because:',
        [['Both came from the same misunderstanding', true],
          ['Subtle faults tend to cluster in complex code', false],
          ['The first fix usually introduces another', false],
          ['Authors work at the same care level throughout', false]],
        'Do not stop at the first thing you find.'),
    ],
    checkpoint: [
      mcq('Assigning a list to a second name:',
        [['Does not copy it, so changing one changes both', true],
          ['Copies it, so the two are independent', false],
          ['Copies the outer list but shares the items', false],
          ['Is prevented by most languages at compile time', false]],
        'Two names for one object.'),
      mcq('Integer division where a fraction was meant:',
        [['Quietly floors, and the difference only shows at scale', true],
          ['Raises an error on the first non-divisible input', false],
          ['Rounds to the nearest whole number', false],
          ['Is caught by the type system in most languages', false]],
        'One of the shapes worth memorising.'),
      mcq('Adding print statements everywhere fails because:',
        [['You read the output for the case that already works', true],
          ['The output is too large to read carefully', false],
          ['Prints change the timing and hide the fault', false],
          ['They have to be removed again afterwards', false]],
        'Form a hypothesis first, then test exactly that one thing.'),
    ],
  },

  {
    unitCode: 'T2_DEBUGGING_UNDER_TIME',
    notes: `Two exercises on diagnosis when there is a clock on it: deciding what to check
first, and saying what you ruled out when you run out of time.`,
    coding: [
      {
        title: 'What to check first',
        description: `Read one candidate cause per line as \`<name> <minutes> <likelihood>\`,
where minutes is how long it takes to check and likelihood is \`high\`, \`medium\` or \`low\`.

Order them **cheapest-useful first**: sort by \`minutes / weight\` ascending, where weight is
3 for high, 2 for medium and 1 for low. Ties keep their original order.

Print the names in that order, one per line, then \`first=<name>\` for the one to check first,
or \`first=none\` when there are no candidates.

**A cheap check on a low chance beats an expensive check on a good one**, early on, because the
cheap one either eliminates a branch or finds the fault, and both are progress.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Cheapest-useful first: minutes divided by weight.
`,
        language: 'python',
        tests: [
          { input: 'config 1 low\nrace 30 high\n', expectedOutput: 'config\nrace\nfirst=config' },
          { input: 'a 10 high\nb 10 low\n', expectedOutput: 'a\nb\nfirst=a' },
          { input: 'only 5 medium\n', expectedOutput: 'only\nfirst=only' },
          { input: '', expectedOutput: 'first=none' },
          { input: 'x 6 medium\ny 2 low\nz 9 high\n', expectedOutput: 'y\nx\nz\nfirst=y', isHidden: true },
        ],
      },
      {
        title: 'What you ruled out',
        description: `The clock has run out. Read one candidate per line as
\`<name> <status>\`, where status is \`ruled_out\`, \`confirmed\` or \`untested\`.

Print a handover:

    confirmed=<names, space separated, or none>
    ruled_out=<names, space separated, or none>
    remaining=<names, space separated, or none>

Then one last line: \`handover=useful\` when anything was ruled out or confirmed, otherwise
\`handover=thin\`.

**Ruling things out is the deliverable when you did not find it.** A handover that names four
eliminated causes saves the next person those four checks; one that says only "could not
reproduce" saves them nothing.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Eliminations are the deliverable when you did not find it.
`,
        language: 'python',
        tests: [
          { input: 'a ruled_out\nb untested\n', expectedOutput: 'confirmed=none\nruled_out=a\nremaining=b\nhandover=useful' },
          { input: 'a confirmed\n', expectedOutput: 'confirmed=a\nruled_out=none\nremaining=none\nhandover=useful' },
          { input: 'a untested\nb untested\n', expectedOutput: 'confirmed=none\nruled_out=none\nremaining=a b\nhandover=thin' },
          { input: '', expectedOutput: 'confirmed=none\nruled_out=none\nremaining=none\nhandover=thin' },
          { input: 'p ruled_out\nq confirmed\nr untested\ns ruled_out\n', expectedOutput: 'confirmed=q\nruled_out=p s\nremaining=r\nhandover=useful', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Diagnosis Against a Clock',
      description: 'Order candidate causes, write a handover, then diagnose three real faults under time.',
      instructions: `Complete both exercises, then:

1. For the first: a one-minute check on a low chance is ordered before a thirty-minute check on
   a high one. Say why, and give a case where that ordering is wrong.
2. For the second: a handover naming four eliminations is useful. Write the two-sentence version
   you would actually send a colleague.
3. For the second: say what you would include beyond the three lists.

**Then, three real faults, twenty minutes each.**

Use bugs from an open-source project you can run, or have somebody break code for you.

4. **Set a timer at twenty minutes and stop when it stops.** Not twenty-five.
5. Before touching anything, write down your candidate causes with a cost and a likelihood for
   each, and order them.
6. Work the order. Record what each check eliminated.
7. At twenty minutes, write the handover whether or not you found it.
8. Then keep going if you want, and record how long it actually took.

**Then review all three.**

9. How often was the fault in your initial candidate list at all?
10. How often was it the first thing you checked?
11. **Which check turned out to be the most expensive waste?** Name it.
12. What would you order differently next time?`,
      rubric: [
        { criterion: 'Candidates ordered correctly', description: 'All cases, with the tie rule and the empty case.', maxPoints: 15 },
        { criterion: 'Handover computed', description: 'All cases, including the thin verdict.', maxPoints: 15 },
        { criterion: 'Three faults under a real timer', description: 'Twenty minutes each, stopped on time, candidates written first.', maxPoints: 25 },
        { criterion: 'Eliminations recorded', description: 'What each check ruled out, as it happened.', maxPoints: 15 },
        { criterion: 'A handover written each time', description: 'Whether or not the fault was found.', maxPoints: 15 },
        { criterion: 'Reviewed across the three', description: 'Hit rate, the most expensive waste named, and what changes.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'config 1 low\nrace 30 high\n', expectedOutput: 'config\nrace\nfirst=config' },
          { input: 'a 10 high\nb 10 low\n', expectedOutput: 'a\nb\nfirst=a' },
          { input: 'only 5 medium\n', expectedOutput: 'only\nfirst=only' },
          { input: '', expectedOutput: 'first=none' },
          { input: 'x 6 medium\ny 2 low\nz 9 high\n', expectedOutput: 'y\nx\nz\nfirst=y', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The cheapest-useful ordering is wrong when:',
        [['A cheap check cannot eliminate anything even if it passes', true],
          ['The expensive check is very likely to be the cause', false],
          ['There are more than a handful of candidates', false],
          ['The clock allows only one check', false]],
        'A check that eliminates nothing is not a cheap check.'),
      mcq('Stopping the timer at twenty minutes rather than twenty-five:',
        [['Practises the condition the work is actually done under', true],
          ['Keeps the three exercises comparable', false],
          ['Prevents the session running too long', false],
          ['Matches how long most faults actually take to find', false]],
        'Then keep going afterwards if you want, and record the real time.'),
      mcq('"Could not reproduce" as a handover:',
        [['Saves the next person nothing', true],
          ['Is honest and therefore adequate', false],
          ['Tells them the fault is intermittent', false],
          ['Is better than a list of eliminations', false]],
        'Ruling things out is the deliverable when you did not find it.'),
    ],
  },

  /* ══ T2_PORTFOLIO ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_PORTFOLIO_REVIEWING_ONE',
    notes: `**Judging somebody else's portfolio is how you learn to see your own.** Your own is
invisible to you — you know what every project does, so you cannot tell whether the page says
so.

## Read it the way a reviewer does

**Ninety seconds. Sometimes thirty.** They have a stack of these.

**In this order:** the first screen, one link, one repository, and out.

**Looking for a reason to move you on**, not a reason to reject. They need one thing to point
at.

**And they will not clone anything**, install anything, or create an account.

## What fails, in the order they meet it

**A dead link.** Ends it. Nothing after this matters.

**No idea what it is.** The first paragraph describes technologies rather than purpose, so
after fifteen seconds the reader still cannot say what the thing does.

**A demo that needs a sign-up.** They will not make an account.

**An empty demo.** It loads, it works, and there is nothing in it, so it demonstrates only that
it starts empty.

**One commit.** "Initial commit", the entire project. Says the work happened elsewhere,
whether or not it did.

**A README that starts with installation.** Written for somebody who has already decided, which
this reader has not.

**A write-up that is a technology list.** Everybody's list looks the same, so it distinguishes
nobody.

**And something embarrassing.** A committed secret, a folder called \`final2\`, a commit message
that is a swear word.

## Judging without being useless about it

**Name the first thing that fails**, not all of them. A list of fourteen faults is not
actionable and will not be read.

**Say it about the artefact, not the person.** "The first paragraph does not say what it does",
never "you are bad at writing".

**And give the one change with the largest effect.** Usually the first sentence, or the order
of the projects, or removing the weakest one.

## The exercise that changes your own

**Judge three portfolios that are not yours, against the clock.**

**Then judge your own with the same list, in a private window, on a phone.**

**You will fail your own checks**, and that is the point — the criteria are easy to apply to
somebody else and almost impossible to apply from memory to your own work, which is why this
unit exists rather than a lesson telling you to have a good portfolio.`,
    mcqs: [
      mcq('Your own portfolio is invisible to you because:',
        [['You know what every project does, so you cannot tell whether the page says so', true],
          ['You are too close to it to judge the design', false],
          ['You wrote the text and so it reads clearly to you', false],
          ['You cannot see it the way a phone renders it', false]],
        'Which is why judging somebody else’s comes first.'),
      mcq('The first thing that fails, before anything else matters, is:',
        [['A dead link', true],
          ['A first paragraph that does not say what it is', false],
          ['A demo that requires signing up', false],
          ['A repository with a single commit', false]],
        'Read in the order a reviewer meets it.'),
      mcq('Naming fourteen faults rather than the first one:',
        [['Is not actionable and will not be read', true],
          ['Gives the author a complete picture', false],
          ['Is appropriate for a thorough review', false],
          ['Helps them prioritise the work themselves', false]],
        'Name the first thing that fails, and the one change with the largest effect.'),
      mcq('You will fail your own checks, and that is the point because:',
        [['The criteria are easy on somebody else and almost impossible from memory on your own', true],
          ['It shows the criteria are strict enough to be useful', false],
          ['Everybody’s portfolio has faults worth fixing', false],
          ['It proves the exercise was done honestly', false]],
        'Which is why this is an exercise rather than a lesson.'),
    ],
    checkpoint: [
      mcq('An empty demo demonstrates:',
        [['Only that it starts empty', true],
          ['That the deployment works correctly', false],
          ['The interface without distracting data', false],
          ['Nothing, because it will not load', false]],
        'Seed it, so the demo shows something on arrival.'),
      mcq('A README starting with installation is written for:',
        [['Somebody who has already decided, which this reader has not', true],
          ['A developer who wants to contribute', false],
          ['An audience that intends to run the project locally', false],
          ['The author, as a reminder of the steps', false]],
        'Purpose before setup: they have not decided to install it yet.'),
      mcq('Feedback should be phrased about:',
        [['The artefact, never the person', true],
          ['The effort, to soften the criticism', false],
          ['The reviewer’s own preferences, stated as such', false],
          ['The gap against a named standard', false]],
        '"The first paragraph does not say what it does."'),
    ],
  },

  {
    unitCode: 'T2_PORTFOLIO_PRACTICE',
    notes: `Two exercises on judging a portfolio quickly and consistently: applying the checks
in the order a reviewer meets them, and picking the single change worth making first.`,
    coding: [
      {
        title: 'The ninety-second read',
        description: `Read one portfolio as five lines, in this order, each \`yes\` or \`no\`:

    link_works
    says_what_it_is
    demo_needs_signup
    has_real_history
    readme_starts_with_purpose

Print the **first** failure as one of \`DEAD_LINK\`, \`UNCLEAR\`, \`SIGNUP_WALL\`,
\`THIN_HISTORY\`, \`README_ORDER\` — checked in exactly that order — or \`PASS\` when none fail.

Note that \`demo_needs_signup\` fails when it is \`yes\`; the other four fail when \`no\`.

**Stop at the first failure.** A reviewer does, so a review that lists everything is describing
a read that did not happen.`,
        starter: `import sys

vals = [l.strip() for l in sys.stdin if l.strip()]

# Stop at the first failure, in the order a reviewer meets them.
`,
        language: 'python',
        tests: [
          { input: 'yes\nyes\nno\nyes\nyes\n', expectedOutput: 'PASS' },
          { input: 'no\nyes\nno\nyes\nyes\n', expectedOutput: 'DEAD_LINK' },
          { input: 'yes\nno\nno\nyes\nyes\n', expectedOutput: 'UNCLEAR' },
          { input: 'yes\nyes\nyes\nyes\nyes\n', expectedOutput: 'SIGNUP_WALL' },
          { input: 'yes\nyes\nno\nno\nno\n', expectedOutput: 'THIN_HISTORY', isHidden: true },
        ],
      },
      {
        title: 'The one change worth making',
        description: `Read one project per line as \`<name> <strength>\`, where strength is
\`strong\`, \`fair\` or \`weak\`, in the order they appear on the page.

Print the single highest-value change:

- a \`weak\` project is present → \`REMOVE <name>\` for the first weak one
- otherwise the first project is not the strongest → \`REORDER <name>\` naming the strongest
- otherwise → \`KEEP\`

Then \`projects=<n>\` counting what would remain after the change.

**Removing beats reordering** because a weak project lowers the average the reader takes away,
and the average is what they remember.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A weak project lowers the average, and the average is what is remembered.
`,
        language: 'python',
        tests: [
          { input: 'a strong\nb weak\n', expectedOutput: 'REMOVE b\nprojects=1' },
          { input: 'a fair\nb strong\n', expectedOutput: 'REORDER b\nprojects=2' },
          { input: 'a strong\nb fair\n', expectedOutput: 'KEEP\nprojects=2' },
          { input: 'a strong\n', expectedOutput: 'KEEP\nprojects=1' },
          { input: 'a weak\nb weak\nc strong\n', expectedOutput: 'REMOVE a\nprojects=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'The Ninety-Second Read, Repeatedly',
      description: 'Apply the checks in order, choose the one change, then judge three real portfolios and your own.',
      instructions: `Complete both exercises, then:

1. For the first: the review stops at the first failure. Say why listing everything describes a
   read that did not happen.
2. For the second: removing beats reordering. Give a case where you would reorder instead even
   with a weak project present.
3. For the second: say what makes a project \`weak\` rather than \`fair\`, in your own words.

**Then judge three real portfolios that are not yours.**

Classmates, or public ones you can find. **Ninety seconds each, timed.**

4. For each: the first failure, and the one change with the largest effect.
5. Write each as two sentences you would actually send the person.
6. Record what you could NOT tell in ninety seconds — and whether that is their problem or the
   format's.

**Then judge your own.**

7. Private window, on a phone, ninety seconds, same checks.
8. **Record your first failure.** Everybody has one.
9. Make the one change. Today.
10. Have somebody else run the same ninety seconds on yours, and compare their first failure
    with the one you found. **If they differ, theirs is the real one.**`,
      rubric: [
        { criterion: 'Checks applied in order', description: 'All cases, stopping at the first failure, with the inverted signup check.', maxPoints: 15 },
        { criterion: 'The one change chosen', description: 'All cases, with removal taking precedence over reordering.', maxPoints: 15 },
        { criterion: 'Three portfolios judged under time', description: 'Ninety seconds each, first failure and largest change named.', maxPoints: 20 },
        { criterion: 'Feedback written to send', description: 'Two sentences each, about the artefact rather than the person.', maxPoints: 15 },
        { criterion: 'Own portfolio judged honestly', description: 'Private window, phone, first failure recorded, change made.', maxPoints: 20 },
        { criterion: 'Compared against a real reviewer', description: 'Somebody else’s first failure, and what the difference means.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

vals = [l.strip() for l in sys.stdin if l.strip()]
`,
        tests: [
          { input: 'yes\nyes\nno\nyes\nyes\n', expectedOutput: 'PASS' },
          { input: 'no\nyes\nno\nyes\nyes\n', expectedOutput: 'DEAD_LINK' },
          { input: 'yes\nno\nno\nyes\nyes\n', expectedOutput: 'UNCLEAR' },
          { input: 'yes\nyes\nyes\nyes\nyes\n', expectedOutput: 'SIGNUP_WALL' },
          { input: 'yes\nyes\nno\nno\nno\n', expectedOutput: 'THIN_HISTORY', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('If their first failure differs from the one you found on your own portfolio:',
        [['Theirs is the real one', true],
          ['Both are worth fixing equally', false],
          ['Yours is, since you know the work', false],
          ['A third reader should decide', false]],
        'You cannot apply the criteria to your own work from memory.'),
      mcq('What you could not tell in ninety seconds is:',
        [['Sometimes the portfolio’s problem and sometimes the format’s', true],
          ['Always a fault in the portfolio', false],
          ['Evidence the time limit is too short', false],
          ['Worth raising only if it seemed important at the time', false]],
        'Record which, because the answer changes the advice.'),
      mcq('A weak project differs from a fair one in that:',
        [['It would lower the reader’s impression if they saw it', true],
          ['It is smaller or took less time', false],
          ['It uses less impressive technology', false],
          ['It is simply older than the others on the page', false]],
        'Which is why removing it beats reordering.'),
    ],
  },
];
