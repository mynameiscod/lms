/**
 * T2_GIT_TEAM and T2_LINUX — nineteen units. Year 2.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Year 1 taught Git as a place to put your own work: init, add, commit, push. Year 2 teaches it as
 * a place where several people change the same files without destroying each other's work — which
 * is a different subject, and the one every first internship assumes on day one.
 *
 * The Linux topic is deliberately practical rather than administrative. A second-year needs to
 * find their way around a server, read permissions, see what is running, join commands together
 * and fix their own environment. Not to configure a web server.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const COLLABORATION_BUNDLES: PilotBundle[] = [
  /* ── T2_GIT_TEAM ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_GIT_TEAM_BRANCHING',
    notes: `A branch is a movable label pointing at a commit. That is genuinely all it is, and
understanding that removes most of the fear.

    git switch -c add-search        # create a branch and move onto it
    git switch main                 # go back
    git branch                      # list them, with a star on the current one

**Why teams branch.** \`main\` is the version that works. Anything half-finished on \`main\` is
half-finished for everybody, including whoever deploys this afternoon. A branch gives you somewhere
to be wrong in private.

**What a branch is not:** a copy of the files. Git stores commits once; a branch is a pointer. That
is why creating one is instant even in a huge repository.

**The daily loop:**

    git switch main
    git pull                       # start from what everybody else has
    git switch -c fix-login-error  # branch for one piece of work
    ...work, commit, commit...
    git push -u origin fix-login-error

**One branch, one piece of work.** A branch holding a bug fix, a rename and a new feature cannot be
reviewed sensibly, and cannot be reverted if one part is wrong.

**Keep it short-lived.** A branch that lives for three weeks diverges from main until merging it is
a project of its own. Two or three days is comfortable; when it stretches, pull main into your
branch regularly so the differences stay small.

**Naming matters** because your colleagues read them: \`fix-login-timeout\`,
\`add-export-csv\`, \`spike-payment-gateway\`. Not \`test\`, \`new\`, or \`asha-branch\`.

**Checking where you are before you commit** saves the commonest beginner accident — twenty commits
straight onto main:

    git status                     # branch, staged, unstaged, untracked

Most editors show the branch in the status bar. Look at it before you start typing.`,
    mcqs: [
      mcq('A Git branch is:',
        [['A movable pointer to a commit', true],
          ['A full copy of the project files', false],
          ['A folder inside the repository', false],
          ['A snapshot taken at a point in time', false]],
        'Which is why creating one is instant in any size of repository.'),
      mcq('Why does a team keep unfinished work off `main`?',
        [['main is the version that works for everybody', true],
          ['Git forbids incomplete commits on main', false],
          ['Branches compress better than main does', false],
          ['main can only accept one commit a day', false]],
        'Half-finished work on main is half-finished for whoever deploys next.'),
      mcq('A branch containing a bug fix, a rename and a new feature is a problem because:',
        [['It cannot be reviewed or reverted in parts', true],
          ['Git will refuse to merge it', false],
          ['It takes more disk space', false],
          ['The commits cannot be pushed', false]],
        'One branch, one piece of work, is what keeps review and revert possible.'),
      mcq('Long-lived branches are discouraged because:',
        [['They diverge from main until merging is its own project', true],
          ['Git deletes branches older than a month', false],
          ['They slow down the repository', false],
          ['They cannot be pushed after a week', false]],
        'Pull main into your branch regularly to keep the differences small.'),
    ],
    checkpoint: [
      mcq('Before starting new work, the correct sequence is:',
        [['Switch to main, pull, then branch', true],
          ['Branch, then pull into the new branch', false],
          ['Pull, then commit, then branch', false],
          ['Branch from the last branch you used', false]],
        'Starting from what everybody else has avoids merging yesterday\'s divergence.'),
      mcq('The commonest beginner accident that `git status` prevents is:',
        [['Committing onto main by mistake', true],
          ['Committing a file that is too large', false],
          ['Pushing to the wrong remote', false],
          ['Writing a commit message that is too short', false]],
        'Check which branch you are on before you start typing.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_MERGING',
    notes: `Merging brings the work of one branch into another. Two shapes, and knowing which you
are getting explains everything afterwards.

**Fast-forward.** Main has not moved since you branched, so Git just slides the label forward. No
merge commit, a straight history.

**True merge.** Main has moved, so Git creates a merge commit with two parents — your work and
theirs — and the history forks and rejoins.

    git switch main
    git pull
    git merge add-search

**Reading what happened:**

    git log --oneline --graph --all

That graph is the fastest way to understand a confusing repository, and worth running whenever
something looks wrong.

**Merge or rebase?** Both bring your branch up to date with main; they differ in the history they
leave.

| | Merge | Rebase |
|---|---|---|
| History | Keeps the real shape, with a merge commit | Replays your commits on top of main, straight line |
| Honest about when work happened | Yes | No — it rewrites the commits |
| Safe on shared branches | Yes | **No** — never rebase what others have pulled |
| Conflicts | Resolved once | Possibly once per commit |

**The rule that matters:** never rebase a branch somebody else has pulled. Rebasing creates new
commits with new identities, and anybody who had the old ones now has a repository that disagrees
with yours.

**Before merging into main**, always: update your branch from main first, run the tests, and only
then merge. Discovering the conflict on your own branch is much cheaper than discovering it on
main.

**Undoing a merge** you have not pushed: \`git reset --hard ORIG_HEAD\`. After pushing, use
\`git revert -m 1 <merge>\`, which adds a commit undoing it rather than rewriting shared history.`,
    mcqs: [
      mcq('A fast-forward merge happens when:',
        [['The target branch has not moved since you branched', true],
          ['Both branches changed the same files', false],
          ['The branch has exactly one commit', false],
          ['You merge with the --ff-only flag', false]],
        'Git can simply move the label forward, so no merge commit is needed.'),
      mcq('Rebasing a branch others have already pulled is dangerous because:',
        [['It creates new commits, so their history disagrees with yours', true],
          ['It deletes the original branch permanently', false],
          ['It merges without running the tests', false],
          ['Git refuses to push afterwards', false]],
        'New identities for the same work is exactly what breaks a shared branch.'),
      mcq('Before merging your branch into main you should:',
        [['Update from main, run the tests, then merge', true],
          ['Merge first, then fix whatever breaks', false],
          ['Delete the branch and re-create it', false],
          ['Squash every commit into one', false]],
        'Conflicts are far cheaper to resolve on your own branch.'),
      mcq('To undo a merge that has already been pushed:',
        [['git revert, which adds an undoing commit', true],
          ['git reset --hard, then force push', false],
          ['Delete the branch and merge again', false],
          ['git checkout the previous commit', false]],
        'Never rewrite history others have; add a commit that undoes it instead.'),
    ],
    checkpoint: [
      mcq('`git log --oneline --graph --all` is most useful for:',
        [['Seeing the real shape of branches and merges', true],
          ['Listing the files changed in each commit', false],
          ['Finding who last changed a line', false],
          ['Checking which commits are pushed', false]],
        'The fastest way to understand a confusing repository.'),
      mcq('Rebase differs from merge mainly in that it:',
        [['Replays commits to produce a straight history', true],
          ['Resolves conflicts automatically', false],
          ['Works only on unpushed branches by design', false],
          ['Keeps both parents of the merge', false]],
        'Straight history, at the cost of rewriting when the work happened.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_CONFLICTS',
    notes: `A conflict is Git saying "two people changed the same lines and I will not guess". It is
normal, it is not an error, and panicking is the only thing that makes it worse.

    <<<<<<< HEAD
    price = subtotal * 1.18        # what is on the branch you are merging INTO
    =======
    price = subtotal * tax_rate    # what is coming FROM the other branch
    >>>>>>> add-tax-config

**How to resolve one:**

1. **Understand both sides.** What was each person trying to do? The answer is often "both", and
   the resolution is a combination rather than a choice.
2. **Edit the file** to what it should be, and delete all three marker lines.
3. **Test it.** A resolved conflict that compiles is not necessarily correct.
4. \`git add\` the file, then \`git commit\`.

**Never resolve by taking one side blindly.** \`--ours\` and \`--theirs\` are fast and throw away
somebody's work; use them only when you genuinely know one side is the whole answer.

**When it goes badly:**

    git merge --abort      # put everything back as it was, before the merge

That command exists for exactly the moment you realise you do not understand what you are looking
at. Use it, think, and start again.

**Reducing conflicts in the first place:**

- Short-lived branches, merged often
- Pull main into your branch daily
- Agree who is working on which area
- Consistent formatting, so whitespace does not conflict
- Small, focused commits — a conflict in a 20-line change is easy to read

**The conflict nobody notices:** a *semantic* conflict, where both changes merge cleanly and break
each other anyway. You renamed a function while a colleague added a new call to the old name; Git
is content, the tests are not. This is why the test suite runs after every merge, not before it.

**If in doubt, ask the other author.** A two-minute conversation beats twenty minutes of guessing
what somebody intended.`,
    mcqs: [
      mcq('The content between `<<<<<<<` and `=======` is:',
        [['What is on the branch you are merging into', true],
          ['What is coming from the other branch', false],
          ['The common ancestor of both versions', false],
          ['A backup Git made before merging', false]],
        'The section after ======= is the incoming change.'),
      mcq('`git merge --abort` is for:',
        [['Putting everything back as it was before the merge', true],
          ['Accepting your own side of every conflict', false],
          ['Skipping the conflicting files only', false],
          ['Committing the merge with markers left in', false]],
        'Exactly for the moment you realise you do not understand the conflict.'),
      mcq('A semantic conflict is one where:',
        [['Both changes merge cleanly and still break each other', true],
          ['Two people edited the same line', false],
          ['The merge markers were left in a file', false],
          ['A file was deleted on one branch only', false]],
        'A rename on one side and a new call on the other; Git is content, the tests are not.'),
      mcq('Resolving with `--theirs` without reading both sides:',
        [['Throws away somebody\'s work', true],
          ['Is the recommended default', false],
          ['Preserves both changes automatically', false],
          ['Marks the conflict for later review', false]],
        'Use it only when you know one side is genuinely the whole answer.'),
    ],
    checkpoint: [
      mcq('After resolving a conflict, before committing you must:',
        [['Delete the marker lines and test the result', true],
          ['Run git merge --continue immediately', false],
          ['Push the branch to trigger CI', false],
          ['Re-create the branch from main', false]],
        'A file that compiles with a wrong resolution is still wrong.'),
      mcq('The most effective way to reduce conflicts is:',
        [['Short branches merged often', true],
          ['Larger commits with more context', false],
          ['Working only on files nobody else has', false],
          ['Rebasing before every commit', false]],
        'Divergence is what creates conflicts, and time is what creates divergence.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_PULL_REQUESTS',
    notes: `A pull request proposes a change and asks somebody to look at it before it becomes part
of \`main\`. It is where most of the actual collaboration in a team happens.

**The flow:**

1. Push your branch.
2. Open a pull request against \`main\`.
3. Describe it — what changed, why, and how to check it.
4. Automated checks run: tests, linting, sometimes a preview deployment.
5. A reviewer comments; you respond and push more commits.
6. Approved, merged, branch deleted.

**The description is the whole job.** A reviewer reads it before the diff, and a bad description
costs them twenty minutes:

    ## What
    Adds CSV export to the orders report.

    ## Why
    Support asked for it — they currently copy rows out of the screen by hand (#412).

    ## How to check
    1. Open /reports/orders
    2. Click Export
    3. A CSV downloads with one row per order, dates as YYYY-MM-DD

    ## Notes
    Export is capped at 10,000 rows; anything larger needs the background job (not in this PR).

**Keep them small.** A 200-line pull request gets a real review; a 2,000-line one gets "looks good
to me", which is the same as no review at all. If the change is large, split it: a refactor first,
then the feature.

**Respond to every comment**, even if only with "done" or "good catch, fixed in 8f3a2c1". Silence
reads as disagreement or as not having read it.

**Disagreeing well:** "I kept the loop because the set version allocates on every request — happy
to change it if you think the clarity is worth it." You have given a reason and left the decision
open, which is how these conversations stay productive.

**Draft pull requests** are for work in progress you want early feedback on. Marking it draft tells
reviewers not to spend time on polish yet.

**Do not merge your own unreviewed work** into a shared main, even when you can. The point is not
permission; it is the second pair of eyes.`,
    mcqs: [
      mcq('What does a reviewer read first?',
        [['The description, before the diff', true],
          ['The tests added by the change', false],
          ['The commit messages in order', false],
          ['The files with the largest changes', false]],
        'A bad description costs the reviewer twenty minutes before they start.'),
      mcq('A 2,000-line pull request usually results in:',
        [['A shallow approval that is no review at all', true],
          ['A more thorough review, since there is more context', false],
          ['An automatic rejection by most tools', false],
          ['Faster merging, since it is one review', false]],
        'Split it: a refactor first, then the feature.'),
      mcq('Responding "done" to every review comment matters because:',
        [['Silence reads as disagreement or as not reading it', true],
          ['The tool requires a response to merge', false],
          ['It increases the review count metric', false],
          ['It notifies the CI system to re-run', false]],
        'Even a one-word reply closes the loop.'),
      mcq('Marking a pull request as draft tells reviewers:',
        [['Not to spend time on polish yet', true],
          ['That the tests are expected to fail', false],
          ['That it will never be merged', false],
          ['That only the author may comment', false]],
        'It invites early feedback on direction rather than detail.'),
    ],
    checkpoint: [
      mcq('A good pull request description includes:',
        [['What changed, why, and how to check it', true],
          ['A list of every file touched', false],
          ['The full commit history in prose', false],
          ['The author\'s availability for questions', false]],
        'How to check is the part reviewers value most and authors skip most.'),
      mcq('Merging your own unreviewed work into shared main is discouraged because:',
        [['The value is the second pair of eyes, not the permission', true],
          ['Git records it as an unsafe merge', false],
          ['It bypasses the automated tests', false],
          ['It prevents the branch from being deleted afterwards', false]],
        'Being able to do it is not a reason to.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_REVIEWING',
    notes: `Reviewing is a skill you are assessed on at work long before you are senior, and it is
taught almost nowhere.

**What to look for, in order:**

1. **Does it do what it says?** Read the description, then check the code does that.
2. **Is it correct at the edges?** Empty, missing, invalid, concurrent.
3. **Are there tests, and do they test the right thing?**
4. **Will somebody understand this in six months?** Names, structure, the comment that explains a
   decision.
5. **Anything dangerous?** Secrets, an unparameterised query, a missing permission check, data
   deleted without a way back.

**What not to spend review time on:** formatting a tool could fix, preferences dressed as rules,
and rewriting it the way you would have written it. Those comments cost goodwill and buy nothing.

**How to say it.** Comment on the code, not the person, and offer a reason:

    "This will raise on an empty list — line 14 indexes [0]. Worth a guard?"

rather than "you forgot the empty case". Ask questions when you are not sure:

    "Is there a reason this query is built with an f-string rather than parameters?"

That phrasing leaves room for you to be wrong, which you sometimes are.

**Mark what is optional.** Prefixing minor comments with "nit:" lets the author judge: "nit: this
variable could be named \`total\`". Everything else is taken as required.

**Approve when it is good enough**, not when it is perfect. A review that blocks for three days over
style costs more than the style saved.

**Receiving a review well:** assume good intent, ask rather than defend when you disagree, and
thank people for finding real problems — they just saved you a production bug in public.`,
    mcqs: [
      mcq('The first thing to check in a review is:',
        [['That the change does what its description says', true],
          ['That the formatting matches the project style', false],
          ['That the commit messages are well written', false],
          ['That the branch is up to date with main', false]],
        'Correctness against intent comes before everything else.'),
      mcq('Which comment is the best use of review time?',
        [['"This will raise on an empty list — worth a guard?"', true],
          ['"I would have used a comprehension here."', false],
          ['"Please reformat this block to match my style."', false],
          ['"This could be one line shorter."', false]],
        'Edge cases and dangers; formatting is a tool\'s job.'),
      mcq('Prefixing a comment with "nit:" signals:',
        [['It is optional and the author may judge', true],
          ['It must be fixed before merging', false],
          ['It concerns a naming convention only', false],
          ['It was generated by a tool', false]],
        'Everything unmarked is taken as required.'),
      mcq('Asking "is there a reason this uses an f-string rather than parameters?" is better than asserting because:',
        [['It leaves room for the author to have a reason', true],
          ['Questions are faster to write', false],
          ['It avoids blocking the pull request', false],
          ['Reviewers should not assert anything', false]],
        'Sometimes there is a reason, and sometimes you are the one who is wrong.'),
    ],
    checkpoint: [
      mcq('You should approve a pull request when it is:',
        [['Good enough, not perfect', true],
          ['Exactly how you would have written it', false],
          ['Fully covered by tests on every line', false],
          ['Free of every stylistic inconsistency', false]],
        'Blocking for days over style costs more than the style saves.'),
      mcq('Someone finds a real bug in your pull request. The right response is:',
        [['Thank them — they prevented a public failure', true],
          ['Explain why the case will not happen', false],
          ['Fix it quietly without replying', false],
          ['Ask them to open a separate issue', false]],
        'A review that catches a bug is the system working.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_COMMIT_QUALITY',
    notes: `A commit is a unit of change with an explanation attached. Both halves matter, because
the history is read far more often than it is written.

**One change per commit.** A commit that fixes a bug, renames a variable and adds a feature cannot
be reverted, cherry-picked or understood separately.

**The message.** A subject line that completes "this commit will…", then a blank line, then why:

    Reject orders with zero quantity

    The report divided by quantity to get an average and crashed for any
    order with none. Validation now happens in the constructor, so no
    zero-quantity order can exist.

    Fixes #412

**What the subject is for:** a person scanning fifty lines of \`git log\` to find when something
changed. \`fix\`, \`update\`, \`changes\` and \`wip\` are invisible in that list.

**What the body is for: WHY.** The diff already shows what changed. Six months later the question
is always "why was it done this way", and the commit is the only place that answer lives.

**Conventional prefixes**, used by many teams and worth recognising:

    feat: add CSV export to the orders report
    fix: reject orders with zero quantity
    docs: explain the export row limit
    refactor: extract the report query builder
    test: cover the empty-orders case

**Commit often locally, tidy before pushing.** Small local commits are a safety net; nobody needs
your "wip" and "oops" in the shared history. \`git rebase -i\` lets you squash them — on your own
unpushed branch only.

**Never commit:** secrets, large binaries, generated files, commented-out code, or anything you
would not want a future employer reading. Git history is forever, and removing a secret means
revoking it, not deleting the line.`,
    mcqs: [
      mcq('The body of a commit message should explain:',
        [['Why the change was made', true],
          ['What lines were changed', false],
          ['Who requested the change', false],
          ['How long the change took', false]],
        'The diff shows what; the reason lives nowhere else.'),
      mcq('`fix: update stuff` is a poor subject line because:',
        [['It is invisible when scanning the log for a change', true],
          ['It is missing a ticket number', false],
          ['It uses a conventional prefix incorrectly', false],
          ['It is shorter than fifty characters', false]],
        'The subject exists for somebody scanning fifty lines of history.'),
      mcq('Squashing "wip" commits with `git rebase -i` is safe:',
        [['On your own branch that nobody has pulled', true],
          ['On any branch, at any time', false],
          ['Only after the pull request is approved', false],
          ['Only on main, before releasing', false]],
        'Rewriting history others have is what breaks their repositories.'),
      mcq('A secret accidentally committed and deleted in the next commit:',
        [['Is still in the history and must be revoked', true],
          ['Is removed from the repository entirely', false],
          ['Is safe once the branch is deleted', false],
          ['Only matters if the repository is public', false]],
        'Only revoking the credential makes the leaked copy useless.'),
    ],
    checkpoint: [
      mcq('One change per commit matters because it allows:',
        [['Reverting or cherry-picking that change alone', true],
          ['Faster pushes to the remote', false],
          ['Smaller repository size', false],
          ['Automatic conflict resolution when merging', false]],
        'Mixed commits cannot be undone in parts.'),
      mcq('Which should never be committed?',
        [['API keys and passwords', true],
          ['Tests for the change', false],
          ['A README update', false],
          ['A configuration example file', false]],
        'An example file with placeholder values is fine; the real values never are.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_REPO_HYGIENE',
    notes: `A repository is read by people who did not write it, including you in a year. Its layout
and what it excludes are part of the work.

**A layout somebody can navigate:**

    project/
      src/ or app/         the code
      tests/               the tests, mirroring src
      docs/                anything longer than a README
      scripts/             one-off and maintenance scripts
      .gitignore
      README.md
      requirements.txt     or pyproject.toml

**\`.gitignore\` keeps the repository clean.** What belongs in it:

    __pycache__/
    *.pyc
    .venv/
    .env                  # secrets, always
    node_modules/
    dist/
    build/
    .DS_Store
    *.sqlite3             # local databases
    .idea/  .vscode/      # editor settings, unless the team agrees to share them

**The rule:** anything generated, anything local to your machine, anything secret. If a teammate
can regenerate it with a command, it does not belong in Git.

**A \`.env.example\` beside your ignored \`.env\`** is how you tell people which variables exist
without shipping the values:

    DATABASE_URL=postgres://user:password@localhost/dbname
    SECRET_KEY=replace-me

**The README is the front door.** What it is, how to run it, how to run the tests, and how to
contribute. Five minutes of writing that saves every future reader fifteen.

**Large files do not belong in Git.** Git stores every version of everything forever, so a 50MB
video committed once makes the repository 50MB heavier for every person who clones it, permanently.

**Branch tidiness:** delete branches after merging. A repository with ninety stale branches is one
where nobody can tell what is active.

**Check what you are about to commit**, every time:

    git status
    git diff --staged

That second command is the last chance to notice the debug print, the commented-out block, or the
\`.env\` that slipped past.`,
    mcqs: [
      mcq('The rule for what belongs in `.gitignore` is:',
        [['Anything generated, local, or secret', true],
          ['Anything larger than one megabyte', false],
          ['Anything not written in the project language', false],
          ['Anything not yet finished', false]],
        'If a teammate can regenerate it with a command, it does not belong in Git.'),
      mcq('A `.env.example` file exists to:',
        [['Show which variables exist, without the real values', true],
          ['Provide default secrets for new developers', false],
          ['Replace the README for configuration', false],
          ['Let the application run without a real .env', false]],
        'Names and placeholders, never the values themselves.'),
      mcq('Committing a 50MB video once makes the repository heavier:',
        [['For everybody who clones it, permanently', true],
          ['Only until the file is deleted in a later commit', false],
          ['Only for the person who committed it', false],
          ['Only if the repository is cloned with history', false]],
        'Git keeps every version of everything, forever.'),
      mcq('`git diff --staged` before committing is the last chance to catch:',
        [['A debug print or a stray secret', true],
          ['A merge conflict in another branch', false],
          ['A failing test in CI', false],
          ['A branch that is out of date', false]],
        'It shows exactly what is about to become permanent.'),
    ],
    checkpoint: [
      mcq('Stale merged branches should be:',
        [['Deleted, so it is clear what is active', true],
          ['Kept as a record of past work', false],
          ['Archived into a separate repository', false],
          ['Renamed with a done- prefix', false]],
        'The history already records the work; the branch label is noise.'),
      mcq('The README should answer:',
        [['What it is, how to run it, and how to test it', true],
          ['The full architecture of the system', false],
          ['Every function\'s parameters', false],
          ['The project\'s commit conventions only', false]],
        'Five minutes writing it saves every reader fifteen.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_WORKFLOW',
    notes: `A workflow is the set of rules a team agrees on so that nobody has to guess. The common
one, and the one your first internship will most likely use, is **feature-branch workflow**.

**The rules:**

1. \`main\` always works. It is deployable at any moment.
2. All work happens on a branch, taken from an up-to-date \`main\`.
3. Every branch becomes a pull request.
4. Automated checks must pass; at least one person reviews.
5. Merge, then delete the branch.

**A day inside it:**

    git switch main && git pull
    git switch -c add-export
    # work, commit small and often
    git push -u origin add-export
    # open the pull request, respond to review
    # merged by the reviewer, branch deleted

**Keeping your branch current** while you work, so the eventual merge is small:

    git switch main && git pull
    git switch add-export
    git merge main          # bring their work into yours, resolve now rather than later

**What "main always works" buys:** anybody can release at any time, a bug is always a recent change,
and a new person can clone and run it. It is the most valuable rule in the list, and the one teams
break first.

**Releases.** Small teams tag \`main\`:

    git tag -a v1.2.0 -m "CSV export, faster reports"
    git push --tags

Larger teams add a release branch so fixes can be made to the released version while main moves on.
You do not need that at second year; you need to recognise it when you meet it.

**Other workflows you will hear about:** Git Flow (develop, release and hotfix branches — heavier,
common in older enterprises), and trunk-based development (everybody commits to main behind feature
flags — common at large scale). Neither is better; they suit different release rhythms.

**Agree it and write it down.** The workflow in a team's README is worth more than whichever one it
happens to be.`,
    mcqs: [
      mcq('The most valuable rule in feature-branch workflow is:',
        [['main always works and is deployable', true],
          ['Branches are named consistently', false],
          ['Commits use conventional prefixes', false],
          ['Branches are deleted after merging', false]],
        'It makes release possible at any moment and keeps bugs recent.'),
      mcq('Merging main into your branch while you work:',
        [['Keeps the eventual merge small and resolves conflicts early', true],
          ['Is discouraged, as it pollutes the history', false],
          ['Is only needed before opening the pull request', false],
          ['Replaces the need for a code review', false]],
        'Resolving on your branch is always cheaper than on main.'),
      mcq('Trunk-based development means:',
        [['Everybody commits to main, behind feature flags', true],
          ['Long-lived develop and release branches', false],
          ['One branch per developer, merged weekly', false],
          ['Releases tagged from a release branch only', false]],
        'Common at large scale; it trades branching for flags.'),
      mcq('Tagging a release with `git tag -a v1.2.0` gives you:',
        [['A permanent marker for the commit that was released', true],
          ['A branch that can receive hotfixes', false],
          ['A compressed archive of the code', false],
          ['An automatic deployment to production', false]],
        'A release branch is the separate thing that takes fixes.'),
    ],
    checkpoint: [
      mcq('The workflow a team uses matters less than:',
        [['Everybody agreeing on it and writing it down', true],
          ['Choosing the one used by large companies', false],
          ['How many branches it involves', false],
          ['Whether it supports hotfixes', false]],
        'The README entry is worth more than the specific choice.'),
      mcq('In feature-branch workflow, a branch is taken from:',
        [['An up-to-date main', true],
          ['The previous feature branch', false],
          ['The last release tag', false],
          ['Whichever branch you are on', false]],
        'Starting elsewhere inherits somebody else\'s unmerged work.'),
    ],
  },

  {
    unitCode: 'T2_GIT_TEAM_MINI_PROJECT',
    notes: `One change, carried through a real team workflow — with another person on the other side
of it.

**Why it needs a second person.** Everything that makes team Git hard is about somebody else: a
conflict with their work, a review comment you disagree with, a branch that went stale while they
were reviewing. Practising alone teaches the commands and none of the judgement.

**What is being assessed:** that the history is readable, that the pull request explains itself,
that a real conflict was resolved by understanding both sides, and that the review conversation was
useful in both directions.

**Build it in this order:**

1. **Agree who does what**, on the same repository, in areas that will overlap at least once.
2. **Branch, work in small commits**, push.
3. **Open pull requests** and review each other's properly.
4. **Create a conflict deliberately** if one does not occur, and resolve it together.
5. **Merge, delete branches, and read the history** you produced.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Change Through the Whole Workflow',
      description: 'With a partner, take a change through branch, commits, pull request, review, conflict and merge on a shared repository, and produce a history somebody else could follow.',
      instructions: `**The brief**

Work with **one partner** on a shared repository — a small application either of you has, or a new
one created for this. Each of you implements a feature that touches at least one file the other
also touches.

**Requirements**

1. **A branch each**, taken from an up-to-date main, named for the work.
2. **At least five commits each**, one change per commit, with messages explaining why.
3. **A pull request each**, with what, why and how to check.
4. **A real review each way**: at least three substantive comments, at least one of which changes
   the code, and every comment answered.
5. **At least one genuine conflict**, resolved by understanding both sides — not by taking one.
6. **Both branches merged**, both deleted, main working at the end.
7. **A tag** on the final main.

**What to submit**

1. The repository link, with both branches merged and history intact.
2. A **history walkthrough**: \`git log --oneline --graph\` output, with a sentence on what each
   merge was.
3. The **conflict record**: what conflicted, what each side intended, and why the resolution is
   correct rather than a choice between them.
4. The **review conversation**, or screenshots of it.
5. A **short write-up** (250–350 words): the comment you disagreed with and how it was settled; one
   thing you would do differently in your commits; what the history would tell somebody joining
   next month.

**Constraints**

- No force pushes to shared branches.
- No self-merging without a review.
- No conflict resolved with --ours or --theirs.

**Where the marks are.** The conflict record and the review conversation. Clean commits are
expected; understanding somebody else's change well enough to merge it properly is the skill.`,
      rubric: [
        {
          criterion: 'History quality',
          description: 'Small focused commits with messages explaining why; readable graph; branches deleted; main working and tagged.',
          maxPoints: 25,
        },
        {
          criterion: 'Pull requests',
          description: 'Descriptions that state what, why and how to check; scope small enough to review properly.',
          maxPoints: 20,
        },
        {
          criterion: 'Review conversation',
          description: 'Substantive comments in both directions, at least one changing the code; every comment answered; disagreement handled with reasons.',
          maxPoints: 25,
        },
        {
          criterion: 'Conflict resolution',
          description: 'A real conflict resolved by combining intents, with a written record of what each side meant.',
          maxPoints: 20,
        },
        {
          criterion: 'Write-up',
          description: 'Honest reflection on a disagreement and on what the history communicates to a newcomer.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_LINUX ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_LINUX_FILESYSTEM',
    notes: `Servers run Linux. Finding your way around one without a graphical interface is a basic
working skill, and the layout is the same on nearly every machine you will meet.

**The directories that matter to you:**

| Path | What lives there |
|---|---|
| \`/home/username\` | Your files. Also written \`~\` |
| \`/etc\` | Configuration, system-wide |
| \`/var/log\` | Logs — where you go when something broke |
| \`/tmp\` | Scratch space, cleared on reboot |
| \`/usr/bin\`, \`/bin\` | Installed programs |
| \`/opt\` | Large third-party applications |
| \`/proc\` | Live information about running processes |

**Moving and looking:**

    pwd                  # where am I
    ls -la               # everything, including hidden, with details
    cd /var/log          # absolute path
    cd ../config         # relative path
    cd -                 # back to the previous directory

**Absolute versus relative** is the distinction that catches people: a path starting with \`/\`
starts from the root of the machine; anything else starts from where you are. A script that uses
relative paths behaves differently depending on where it was run from, which is a real source of
"it works on my machine".

**Reading files without an editor:**

    cat small.txt            # the whole thing
    less big.log             # page through it; q to quit, / to search
    head -20 file.csv        # the first twenty lines
    tail -20 file.csv        # the last twenty
    tail -f app.log          # follow it live — the one you will use most

**Working with files:**

    cp source.txt backup.txt
    mv old.txt new.txt       # rename is the same as move
    mkdir -p a/b/c           # create the whole path
    rm file.txt
    rm -r directory/         # recursive

**\`rm\` has no undo and no bin.** There is no recovery, and \`rm -rf /\` with a variable that was
empty is a famous way to destroy a machine. Read the command before pressing enter, every time.

**Hidden files start with a dot** — \`.env\`, \`.gitignore\`, \`.bashrc\` — and are invisible to a
plain \`ls\`, which is why \`ls -la\` is the version worth having in your fingers.`,
    mcqs: [
      mcq('Where do you look first when a server application has failed?',
        [['/var/log', true], ['/etc', false], ['/tmp', false], ['/usr/bin', false]],
        'Configuration is in /etc; what actually happened is in the logs.'),
      mcq('A path starting with `/`:',
        [['Starts from the root of the machine', true],
          ['Starts from your home directory', false],
          ['Starts from the current directory', false],
          ['Refers to a hidden file', false]],
        'Relative paths depend on where the command was run, which causes real bugs.'),
      mcq('`tail -f app.log` is used to:',
        [['Watch new log lines as they are written', true],
          ['Show the first lines of the file', false],
          ['Search the file for a pattern', false],
          ['Copy the log to another machine', false]],
        'The command you will use most while debugging a running service.'),
      mcq('`rm -r directory/` is dangerous because:',
        [['There is no undo and no recycle bin', true],
          ['It requires administrator rights', false],
          ['It only deletes hidden files', false],
          ['It leaves the directory but empties it', false]],
        'Read the whole command before pressing enter, every time.'),
    ],
    checkpoint: [
      mcq('`ls -la` shows what a plain `ls` does not, including:',
        [['Hidden dot-files and permissions', true],
          ['Files in subdirectories', false],
          ['Files owned by other users', false],
          ['The contents of each file', false]],
        '.env and .gitignore are invisible without it.'),
      mcq('`less` is preferred to `cat` for a large log because it:',
        [['Pages through the file and can search it', true],
          ['Loads the file faster', false],
          ['Shows only the errors', false],
          ['Prevents accidental edits to the file', false]],
        'cat on a 200MB log floods the terminal.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_PERMISSIONS',
    notes: `Every file has an owner, a group, and three sets of permissions. Reading them is a
five-minute skill that prevents hours of confusion.

    $ ls -l
    -rw-r--r--  1 asha  devs   1240 Sep 21 10:04 notes.txt
    -rwxr-xr-x  1 asha  devs   3180 Sep 21 10:05 deploy.sh
    drwxr-x---  2 asha  devs   4096 Sep 21 10:06 secrets/

**Reading the first column**, one character at a time:

    d rwx r-x ---
    │  │   │   └── others: nothing
    │  │   └────── group: read and execute
    │  └────────── owner: read, write, execute
    └───────────── type: d for directory, - for file, l for link

**The numbers**, which is how you set them: read is 4, write is 2, execute is 1.

| Number | Means | Typical use |
|---|---|---|
| 600 | Owner read/write only | \`.env\`, private keys |
| 644 | Owner writes, everyone reads | Normal files |
| 755 | Owner writes, everyone reads and runs | Scripts, directories |
| 777 | Everybody everything | Almost always wrong |

    chmod 600 .env
    chmod +x deploy.sh        # make it runnable
    chown asha:devs file.txt  # change owner and group

**On a directory, execute means "may enter".** A directory you can read but not execute lists its
names and refuses to open anything inside — which produces the confusing "permission denied" on a
file that looks readable.

**\`sudo\` runs a command as the administrator.** Use it when a command genuinely needs it, and read
the command first: \`sudo\` turns a typo into a machine-wide problem. Working as root all day is how
an accidental \`rm\` becomes unrecoverable.

**The security rule from Year 1 applies here**: least privilege. A web application does not need to
write to \`/etc\`; a log directory does not need to be world-writable; a private key must be 600 or
the SSH client will refuse to use it at all — a deliberate protection that confuses everybody once.`,
    mcqs: [
      mcq('`-rw-r--r--` means:',
        [['Owner reads and writes; everyone else reads', true],
          ['Everyone reads and writes', false],
          ['Owner reads only; group writes', false],
          ['Owner and group read and write', false]],
        'Three triples after the type: owner, group, others.'),
      mcq('The permission for a private key file should be:',
        [['600', true], ['644', false], ['755', false], ['777', false]],
        'SSH refuses to use a key that others can read — a deliberate protection.'),
      mcq('On a directory, the execute bit means:',
        [['You may enter it and open what is inside', true],
          ['You may run the files it contains', false],
          ['You may delete the directory', false],
          ['You may list its contents', false]],
        'Read lists the names; execute is what lets you get at them.'),
      mcq('`chmod 777` is almost always wrong because:',
        [['It lets anybody on the machine change the file', true],
          ['It prevents the owner from writing', false],
          ['It makes the file invisible to others', false],
          ['It is rejected by most systems', false]],
        'It is the classic "fix" that replaces one problem with a security hole.'),
    ],
    checkpoint: [
      mcq('"Permission denied" on a file inside a directory you can list suggests:',
        [['The directory lacks the execute bit', true],
          ['The file is owned by root', false],
          ['The file is currently open elsewhere', false],
          ['The filesystem is read-only', false]],
        'Listing needs read; opening what is inside needs execute on the directory.'),
      mcq('Working as root all day is risky because:',
        [['A typo becomes a machine-wide problem', true],
          ['Root commands run more slowly', false],
          ['Root cannot use sudo', false],
          ['Files created by root cannot be deleted', false]],
        'Least privilege applies to you as much as to any program.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_PROCESSES',
    notes: `When something is wrong on a server — it is slow, a port is taken, the application will
not start — the answer is usually a process.

**What is running:**

    ps aux                  # everything, with user, CPU, memory
    ps aux | grep python    # just the Python processes
    top                     # live, sorted by CPU; q to quit
    htop                    # nicer, if installed

**Reading \`ps aux\`:** the columns you need are USER, PID (the process id), %CPU, %MEM and
COMMAND. The PID is what every other command takes.

**Stopping one:**

    kill 4821               # ask it to stop, politely (SIGTERM)
    kill -9 4821            # force it (SIGKILL) — no cleanup, last resort

Always try the polite version first. \`-9\` gives the process no chance to close files, finish
writing, or shut down cleanly, which is how half-written files happen.

**"Address already in use"**, the error every developer meets:

    lsof -i :5000           # which process holds port 5000
    kill <that pid>

That is an old copy of your own server still running, nine times out of ten.

**Background and foreground:**

    python app.py &         # run in the background
    jobs                    # what is running in this shell
    fg %1                   # bring job 1 forward
    Ctrl+C                  # stop the foreground process
    Ctrl+Z                  # suspend it

**A process started from your terminal dies when the terminal closes.** For something that must
survive, use \`nohup\`, \`tmux\`, or — properly — a service manager like systemd. Discovering this by
losing a long job to a closed laptop is a rite of passage worth skipping.

**Disk and memory, when the machine misbehaves:**

    df -h                   # disk space per filesystem — a full disk breaks everything
    du -sh *                # what is using space here
    free -h                 # memory

A full disk produces some of the strangest symptoms in computing, and \`df -h\` rules it out in one
second.`,
    mcqs: [
      mcq('"Address already in use" on port 5000 usually means:',
        [['An old copy of your own server is still running', true],
          ['The port is reserved by the operating system', false],
          ['The firewall is blocking the port', false],
          ['Another machine has taken the port', false]],
        'lsof -i :5000 finds it; kill the pid.'),
      mcq('`kill -9` should be a last resort because:',
        [['The process cannot close files or shut down cleanly', true],
          ['It requires administrator rights', false],
          ['It stops every process owned by the user', false],
          ['It restarts the process automatically', false]],
        'Half-written files come from forcing what could have been asked.'),
      mcq('A process started from your terminal and left in the background:',
        [['Dies when the terminal closes', true],
          ['Continues running indefinitely', false],
          ['Is automatically restarted on logout', false],
          ['Becomes owned by the root user', false]],
        'Use nohup, tmux or a service manager for anything that must survive.'),
      mcq('A machine behaving very strangely should first be checked with:',
        [['df -h, for a full disk', true],
          ['top, for CPU usage', false],
          ['ps aux, for stray processes', false],
          ['free -h, for memory', false]],
        'A full disk produces the strangest symptoms and is ruled out in a second.'),
    ],
    checkpoint: [
      mcq('The PID in `ps aux` output is:',
        [['The process id, used by kill and other commands', true],
          ['The parent directory of the command', false],
          ['The priority of the process', false],
          ['The port the process is currently listening on', false]],
        'Every process command takes it.'),
      mcq('`lsof -i :5000` answers:',
        [['Which process is holding that port', true],
          ['Which ports a process has open', false],
          ['Whether the port is reachable remotely', false],
          ['How much traffic the port has carried', false]],
        'The direct answer to "address already in use".'),
    ],
  },

  {
    unitCode: 'T2_LINUX_PIPES',
    notes: `The shell's real power is not any single command; it is joining small ones together.

**A pipe sends one command's output into the next:**

    cat access.log | grep "500" | wc -l        # how many 500 errors

Read left to right: take the log, keep the lines with 500, count them.

**Redirection sends output to a file instead of the screen:**

    command > out.txt        # write, replacing the file
    command >> out.txt       # append
    command 2> errors.txt    # errors only
    command > all.txt 2>&1   # output and errors together
    command < input.txt      # take input from a file

**The tools worth knowing, because they compose:**

| Tool | Does |
|---|---|
| \`grep\` | Keep lines matching a pattern |
| \`sort\` | Sort lines |
| \`uniq -c\` | Collapse repeats, with counts (needs sorted input) |
| \`wc -l\` | Count lines |
| \`cut -d, -f2\` | Take a column |
| \`head\` / \`tail\` | The first or last lines |
| \`awk\` | Per-line processing by column |
| \`sed\` | Find and replace |
| \`xargs\` | Turn output into arguments for another command |

**The classic pipeline**, worth memorising because it answers so many questions:

    cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

Take the log, print the first field (the IP), sort them so repeats are adjacent, count each,
sort by count descending, show the top ten. That is "who hit us most" in one line, and the same
shape answers "the most common error", "the busiest endpoint", "the most frequent word".

**\`uniq\` only collapses adjacent lines**, which is why \`sort\` comes first. It is the single most
common mistake in a first pipeline.

**Build pipelines one stage at a time.** Run the first command, look at the output, add the next.
Writing five stages and wondering why the answer is empty wastes far more time.

**Why this matters beyond the shell:** the same thinking — small pieces, each doing one thing,
composed — is how good programs are structured too.`,
    mcqs: [
      mcq('Why must `sort` come before `uniq -c`?',
        [['uniq only collapses adjacent identical lines', true],
          ['uniq requires input to be alphabetical', false],
          ['sort removes empty lines uniq cannot handle', false],
          ['uniq cannot read from a pipe otherwise', false]],
        'The single most common mistake in a first pipeline.'),
      mcq('`command > out.txt 2>&1` sends:',
        [['Both normal output and errors to the file', true],
          ['Only errors to the file', false],
          ['Output to the file and errors to the screen', false],
          ['Output to the screen and errors to the file', false]],
        '2>&1 redirects the error stream to wherever output is going.'),
      mcq('`awk \'{print $1}\' access.log | sort | uniq -c | sort -rn | head -10` answers:',
        [['Which value in the first column appears most often', true],
          ['How many lines the log contains', false],
          ['Which lines contain errors', false],
          ['The last ten entries in the log', false]],
        'The same shape answers "busiest endpoint" or "most common word".'),
      mcq('The recommended way to build a long pipeline is:',
        [['One stage at a time, checking the output', true],
          ['Write it fully, then debug the result', false],
          ['Start from the last stage and work backwards', false],
          ['Test each command on a separate file first', false]],
        'Five stages and an empty answer is a slow way to find the mistake.'),
    ],
    checkpoint: [
      mcq('`>` differs from `>>` in that it:',
        [['Replaces the file rather than appending', true],
          ['Writes errors as well as output', false],
          ['Creates the file only if missing', false],
          ['Writes to the screen as well', false]],
        'An accidental > over a log file is not recoverable.'),
      mcq('The idea behind pipes — small tools composed — also describes:',
        [['How well-structured programs are built', true],
          ['How file permissions are applied', false],
          ['How processes are scheduled', false],
          ['How the filesystem is laid out', false]],
        'One thing well, composed, is the same principle in both places.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_SEARCHING',
    notes: `Finding the file, or the line, is most of what you do on an unfamiliar machine or in an
unfamiliar codebase.

**Searching inside files — \`grep\`:**

    grep "TODO" app.py                    # lines in one file
    grep -r "process_payment" .           # recursive, from here
    grep -rn "api_key" .                  # with line numbers
    grep -ri "password" .                 # ignoring case
    grep -rl "deprecated" .               # just the file names
    grep -rn "error" . --include="*.py"   # only Python files
    grep -v "healthcheck" access.log      # lines NOT matching

**The one to remember:** \`grep -rn "thing" .\` — recursive, with line numbers, from here. It is how
you find where something is defined or used, and it beats clicking through folders every time.

**Finding files — \`find\`:**

    find . -name "*.log"                  # by name
    find . -name "test_*.py"              # by pattern
    find . -size +100M                    # larger than 100MB
    find . -mtime -1                      # changed in the last day
    find . -name "*.pyc" -delete          # careful: no undo

**Combining them** is where it gets useful:

    grep -rl "old_api" . | xargs wc -l                 # how big are the files that mention it
    find . -name "*.py" | xargs grep -n "import os"    # search only Python files

**In a codebase**, \`ripgrep\` (\`rg\`) is worth installing: it is faster, respects \`.gitignore\`
automatically, and has better defaults. \`rg process_payment\` does what the long grep command does.

**Searching history and processes** uses the same reflex:

    history | grep docker        # what was that command I ran last week
    ps aux | grep python         # which Python processes are running

**The habit to build:** when you land in an unfamiliar codebase, do not open folders looking for
things. Search for a string you know appears — an error message, a route, a field name — and read
outwards from there. It is the difference between twenty minutes and two.`,
    mcqs: [
      mcq('`grep -rn "process_payment" .` does what?',
        [['Searches recursively from here, showing line numbers', true],
          ['Renames matching files recursively', false],
          ['Searches only the current file', false],
          ['Replaces the text in every match', false]],
        'The single most useful search command in an unfamiliar codebase.'),
      mcq('`grep -v "healthcheck" access.log` returns:',
        [['Lines that do NOT contain healthcheck', true],
          ['Lines containing healthcheck, verbosely', false],
          ['A count of matching lines', false],
          ['The file names containing it', false]],
        'Excluding noise is as useful as finding signal.'),
      mcq('`find . -mtime -1` finds files:',
        [['Changed in the last day', true],
          ['Larger than one megabyte', false],
          ['Owned by the current user', false],
          ['With exactly one link', false]],
        'Useful when something changed and nobody remembers what.'),
      mcq('`ripgrep` is preferred by many developers because it:',
        [['Is faster and respects .gitignore by default', true],
          ['Searches binary files as well', false],
          ['Can replace text across a project', false],
          ['Comes installed on every Linux system', false]],
        'Better defaults for searching a codebase specifically.'),
    ],
    checkpoint: [
      mcq('The right way to orient yourself in an unfamiliar codebase is to:',
        [['Search for a known string and read outwards', true],
          ['Open folders from the top and read down', false],
          ['Read the README and then every file', false],
          ['Run the tests and follow the output', false]],
        'An error message or a route name is the fastest entry point.'),
      mcq('`history | grep docker` is used to:',
        [['Find a command you ran previously', true],
          ['List running Docker containers', false],
          ['Show Docker\'s own log history', false],
          ['Check whether Docker is installed', false]],
        'The same search reflex, applied to your own shell history.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_ENV_VARS',
    notes: `Environment variables are how a program is told about its surroundings without changing
its code — and how secrets stay out of a repository.

    echo $HOME                      # read one
    export API_URL=https://api.test # set it for this shell and its children
    env                             # list everything
    unset API_URL

**In Python:**

    import os
    url = os.environ["API_URL"]            # raises if missing — good for required settings
    debug = os.environ.get("DEBUG", "0")   # optional, with a default

**Why this matters.** The same code runs on your laptop, in CI and in production, pointing at
different databases with different keys. The difference is configuration, not code:

    DATABASE_URL=postgres://localhost/dev_db        # your machine
    DATABASE_URL=postgres://prod-host/app_db        # production

**\`.env\` files** hold them locally, and are never committed:

    # .env  (in .gitignore)
    DATABASE_URL=postgres://localhost/dev_db
    SECRET_KEY=dev-only-not-a-real-secret

    from dotenv import load_dotenv
    load_dotenv()

**Commit \`.env.example\` instead**, with the names and placeholder values, so a new developer knows
what to set.

**The PATH variable** is the one that explains a common frustration:

    echo $PATH        # the directories searched for commands, in order

"command not found" for something you just installed means its directory is not on PATH.
\`which python\` tells you which one you are actually running — and on a machine with three Pythons,
that is the answer to most confusing behaviour.

**Where variables get set:** \`~/.bashrc\` or \`~/.zshrc\` for your shell, a \`.env\` for a project, a
dashboard for a hosting provider, and secret managers for anything real.

**The rule:** anything that differs between machines, or must not be public, is configuration.
Anything else is code.`,
    mcqs: [
      mcq('`os.environ["API_URL"]` rather than `.get("API_URL")` is right when:',
        [['The setting is required and missing it should fail loudly', true],
          ['The value may be absent in development', false],
          ['A default value exists in the code', false],
          ['The variable name might be misspelled', false]],
        'Failing at startup beats a None reaching a request handler.'),
      mcq('A `.env` file should be:',
        [['Listed in .gitignore, with a committed .env.example', true],
          ['Committed so everybody has the same settings', false],
          ['Stored in the home directory instead', false],
          ['Encrypted and committed to the repository', false]],
        'Names and placeholders are shared; values never are.'),
      mcq('"command not found" for a program you just installed usually means:',
        [['Its directory is not on PATH', true],
          ['The installation failed silently', false],
          ['The command needs sudo to run', false],
          ['The shell needs to be reinstalled', false]],
        'echo $PATH shows what is searched, in order.'),
      mcq('`which python` answers:',
        [['Which python executable actually runs', true],
          ['Which version of Python is installed', false],
          ['Where Python packages are installed', false],
          ['Whether Python is on the system at all', false]],
        'On a machine with three Pythons, that is most confusing behaviour explained.'),
    ],
    checkpoint: [
      mcq('The rule for what belongs in configuration is:',
        [['Anything that differs between machines or must not be public', true],
          ['Anything that changes more than once in a given month', false],
          ['Anything longer than a single line', false],
          ['Anything the user can see', false]],
        'Everything else belongs in the code itself.'),
      mcq('The same application pointing at a different database in production is achieved by:',
        [['A different environment variable', true],
          ['A different branch of the code', false],
          ['A conditional on the hostname', false],
          ['A separate copy of the application', false]],
        'Configuration, not code, is what varies between environments.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_SHELL_SCRIPTS',
    notes: `When you have typed the same three commands twice, write a script. A shell script is a
file of commands with a little structure around them.

    #!/bin/bash
    set -euo pipefail          # stop on error, on unset variables, and on a failing pipe

    BACKUP_DIR="\${1:-./backups}"
    STAMP=$(date +%Y%m%d-%H%M%S)

    mkdir -p "$BACKUP_DIR"
    pg_dump myapp > "$BACKUP_DIR/db-$STAMP.sql"
    echo "Backup written to $BACKUP_DIR/db-$STAMP.sql"

Make it runnable and use it:

    chmod +x backup.sh
    ./backup.sh /var/backups

**\`set -euo pipefail\` is the most important line.** Without it, a failing command is ignored and
the script carries on doing damage with bad data. With it, the script stops at the first failure.

**Quote your variables.** \`"$DIR"\` not \`$DIR\`: without quotes, a path containing a space becomes
two arguments, and an empty variable disappears entirely — which is how \`rm -rf $DIR/\` became
\`rm -rf /\` in a famous outage.

**The structure worth having:**

    if [ -f "$FILE" ]; then
        echo "found"
    else
        echo "missing" >&2      # errors go to stderr
        exit 1                  # non-zero means failure
    fi

    for file in *.log; do
        gzip "$file"
    done

**Exit codes matter.** \`0\` means success and anything else means failure, and that is what lets
other tools — CI, cron, another script — know whether to continue.

**When to stop using shell.** Once a script needs data structures, arithmetic beyond counting, or
error handling with branches, write it in Python instead. Shell is superb glue and a poor
programming language; recognising the boundary is the skill.

**Before running anything destructive**, echo what it would do first:

    echo rm -rf "$DIR"      # look at it, then remove the echo

That habit costs two seconds and has saved entire machines.`,
    mcqs: [
      mcq('What does `set -euo pipefail` do?',
        [['Stops the script on errors, unset variables and failing pipes', true],
          ['Enables verbose output for debugging', false],
          ['Runs the script with administrator rights', false],
          ['Makes the script portable across shells', false]],
        'Without it, a failed command is ignored and the script continues with bad data.'),
      mcq('Quoting variables as `"$DIR"` prevents:',
        [['Word splitting on spaces and disappearing empty values', true],
          ['The variable being modified by the script', false],
          ['The shell expanding wildcards in the value', false],
          ['The variable being exported to child processes', false]],
        'An unquoted empty variable is how rm -rf $DIR/ became rm -rf /.'),
      mcq('A script should exit with a non-zero code when:',
        [['It failed, so other tools know not to continue', true],
          ['It produced no output', false],
          ['It was run without arguments', false],
          ['It took longer than expected', false]],
        'Exit codes are how CI and cron know what happened.'),
      mcq('The signal to rewrite a shell script in Python is:',
        [['It needs data structures or real error handling', true],
          ['It is longer than twenty lines', false],
          ['It runs on more than one machine', false],
          ['It is called by another script', false]],
        'Shell is excellent glue and a poor programming language.'),
    ],
    checkpoint: [
      mcq('`echo` before a destructive command is a habit because:',
        [['You see exactly what would run before it runs', true],
          ['It logs the command for auditing', false],
          ['It makes the command run more slowly', false],
          ['It is required for commands using variables', false]],
        'Two seconds that has saved entire machines.'),
      mcq('Errors inside a script should be written to:',
        [['stderr, with `>&2`', true],
          ['stdout, so they appear in the log', false],
          ['A file in /tmp', false],
          ['The terminal only, never a file', false]],
        'It keeps errors separable from output when the script is piped.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_DEBUGGING',
    notes: `"It works on my machine" is an environment problem, and environment problems have a small
number of shapes.

**1. The wrong interpreter or package.**

    which python          # which one am I running
    python --version
    pip list | grep flask  # is it installed where this python can see it
    echo $VIRTUAL_ENV      # am I in a virtual environment at all

Most "module not found" errors are a package installed for a different Python than the one
running the code.

**2. Permissions.** "Permission denied" on a file, a directory or a port below 1024. Check with
\`ls -l\`, remember that directories need the execute bit, and do not reach for \`chmod 777\`.

**3. Something already running.** The port is taken, or an old process holds a lock:
\`lsof -i :5000\`, then kill the pid.

**4. Full disk.** \`df -h\`. A disk at 100% produces errors that look like anything except a full
disk: failed writes, corrupt files, services refusing to start.

**5. Configuration not loaded.** The \`.env\` is in a different directory from where the script was
run, so a relative path missed it. Print the value at startup:

    print("DB:", os.environ.get("DATABASE_URL", "<missing>"))

**6. Line endings**, on a Windows machine pushing to a Linux server:

    bad interpreter: /bin/bash^M

The \`^M\` is a Windows carriage return. \`dos2unix script.sh\` fixes it; configuring Git's
\`core.autocrlf\` prevents it.

**The order to check in:** what am I actually running (\`which\`), what is actually set (\`env\`),
what is actually there (\`ls -l\`), what is already running (\`ps\`, \`lsof\`), and is there space
(\`df -h\`). Five commands, and they resolve most environment problems before any code is read.

**Then: reproduce it in a container.** If the same code fails in a clean container, the problem is
in the code or the configuration; if it works there, the problem is in your machine — and you have
just halved the search.`,
    mcqs: [
      mcq('"Module not found" for a package you installed usually means:',
        [['It is installed for a different Python than the one running', true],
          ['The package name is misspelled in the import', false],
          ['The package requires administrator rights', false],
          ['The virtual environment is corrupt', false]],
        'which python and pip list answer it in two commands.'),
      mcq('`bad interpreter: /bin/bash^M` is caused by:',
        [['Windows line endings in the script file', true],
          ['The script missing its execute bit', false],
          ['Bash not being installed on the machine', false],
          ['A typo in the shebang line', false]],
        'dos2unix fixes it; core.autocrlf prevents it.'),
      mcq('A disk at 100% typically produces:',
        [['Errors that look like anything except a full disk', true],
          ['A clear out-of-space message from every program', false],
          ['A machine that refuses to boot', false],
          ['Slower but otherwise normal behaviour', false]],
        'Which is why df -h is an early check, not a late one.'),
      mcq('Reproducing the failure in a clean container tells you:',
        [['Whether the problem is your machine or the code', true],
          ['Which library version is at fault', false],
          ['Whether the code has a memory leak', false],
          ['How the code behaves under load', false]],
        'It halves the search in one step.'),
    ],
    checkpoint: [
      mcq('The first command when debugging an environment problem is usually:',
        [['which, to see what is actually running', true],
          ['top, to check the load', false],
          ['grep, to search the logs for errors', false],
          ['chmod, to fix permissions', false]],
        'What you are running is the assumption most often wrong.'),
      mcq('A `.env` that seems ignored is often because:',
        [['The script ran from a different directory', true],
          ['The file needs the execute bit', false],
          ['Environment variables must be exported first', false],
          ['The file must be named .environment', false]],
        'Relative paths depend on where the command was run.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_PRACTICE',
    notes: `No new ideas. Live on the command line until it is faster than the graphical
alternative.

**Do each of these on a real machine or a container:**

1. **Explore blind** — from a fresh shell, find the largest file under your home directory, and
   the three most recently modified.
2. **Log analysis** — from a web access log: the ten busiest IPs, the count of 500 errors, the
   busiest hour, and the slowest ten requests.
3. **Clean up** — find and delete every \`__pycache__\` directory and \`.pyc\` file under a project,
   safely, with a dry run first.
4. **Permissions** — create a directory readable only by you, a script runnable by your group, and
   verify both by trying to break them.
5. **Process hunt** — start a process on port 5000, find it from a different terminal, and stop it
   politely, then forcibly.
6. **A backup script** — with arguments, error handling, exit codes and a dry-run flag.
7. **Environment** — break your PATH deliberately in a subshell, observe the failure, and fix it.

**Record for each:**

| Task | The command line you ended with | What you got wrong first |
|---|---|---|

That second column is the valuable one: the shell teaches by failing precisely.

**The rule for this set: no graphical file manager, no editor with a project tree.** The point is
to build the reflex, and the reflex only builds when the alternative is unavailable.

**The slip this set exposes:** running a destructive command before testing its selection. Always
run the \`find\` first and look at the list; only then add \`-delete\`.`,
    mcqs: [
      mcq('Before running `find . -name "*.pyc" -delete`, you should:',
        [['Run the find alone and inspect the list', true],
          ['Back up the entire project directory', false],
          ['Run it with sudo to avoid permission errors', false],
          ['Add -depth to make it safer', false]],
        'Test the selection before attaching an action to it.'),
      mcq('Finding the ten busiest IPs in an access log uses:',
        [['awk, sort, uniq -c, sort -rn, head', true],
          ['grep and wc only', false],
          ['find and xargs', false],
          ['sed and cut only', false]],
        'The classic pipeline: extract, sort, count, rank, limit.'),
      mcq('Stopping a process "politely then forcibly" means:',
        [['kill, then kill -9 if it does not stop', true],
          ['kill -9, then kill', false],
          ['Ctrl+C twice in the same terminal', false],
          ['Closing the terminal window', false]],
        'SIGTERM first so it can clean up; SIGKILL only if it refuses.'),
      mcq('A backup script should include:',
        [['Arguments, error handling, exit codes and a dry run', true],
          ['A hardcoded destination for consistency', false],
          ['sudo at the top so it always works', false],
          ['A silent mode with no output at all', false]],
        'The dry run is what makes it safe to try.'),
      mcq('Working without a graphical file manager during practice:',
        [['Builds the reflex the exercise exists for', true],
          ['Is faster for every task', false],
          ['Is required on most servers', false],
          ['Prevents accidental deletions', false]],
        'The reflex only forms when the alternative is unavailable.'),
    ],
    checkpoint: [
      mcq('The most valuable thing to record during shell practice is:',
        [['What you got wrong on the first attempt', true],
          ['How long each task took', false],
          ['Which commands you already knew', false],
          ['The output of each command', false]],
        'The shell teaches by failing precisely; the mistake is the lesson.'),
      mcq('A directory readable only by you is created with:',
        [['chmod 700', true], ['chmod 755', false], ['chmod 644', false], ['chmod 777', false]],
        'Owner gets read, write and enter; nobody else gets anything.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_MINI_PROJECT',
    notes: `One tool that automates something you actually do by hand — written as a script somebody
else could run safely.

**Why a real task.** A script written for an exercise gets the happy path and stops. A script you
will genuinely run gets a dry run, argument checking and an exit code, because the first time it
deletes the wrong thing you will want all three.

**What "somebody else could run safely" means:**

- It refuses clearly when given wrong or missing arguments
- It has a dry-run mode that shows what would happen
- It stops at the first failure rather than continuing on bad data
- It tells you what it did, and exits non-zero when it did not
- It documents itself with a \`--help\`

**Build it in this order:**

1. **Do the task by hand** and write down every command in order.
2. **Turn it into a script** with no arguments — just the commands.
3. **Add \`set -euo pipefail\`**, quoting and error checks.
4. **Add arguments and \`--help\`.**
5. **Add \`--dry-run\`**, and use it to test the dangerous parts.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Tool You Will Actually Use',
      description: 'Automate a real repeated task as a shell script with arguments, a dry run, error handling and honest exit codes.',
      instructions: `**The brief**

Automate something you currently do by hand. Examples:

- **Project setup** — clone, create the virtual environment, install dependencies, copy
  \`.env.example\`, run the tests.
- **Backup** — dump a database and the uploads directory, timestamped, keeping the last seven and
  deleting older ones.
- **Log report** — from a log file, produce a daily summary: request count, error count, busiest
  hour, top ten paths.
- **Clean-up** — remove build artefacts, caches and old branches from a set of projects.

**Requirements**

1. **Arguments**, with sensible defaults, and a refusal when they are wrong.
2. **\`--help\`** explaining usage, arguments and what it does.
3. **\`--dry-run\`** printing what would happen, changing nothing.
4. **\`set -euo pipefail\`** and quoted variables throughout.
5. **Exit codes**: 0 on success, non-zero with a message on stderr otherwise.
6. **At least one destructive operation**, guarded by a confirmation or the dry-run default.
7. **Tested on a machine other than yours**, or in a container.

**What to submit**

1. The script, and any supporting files.
2. A **transcript** showing: \`--help\`, a dry run, a real run, a run with bad arguments, and the
   exit code after each.
3. A **safety note**: what the destructive part does, what protects it, and what would happen if it
   were run with no arguments at all.
4. A **short write-up** (250–350 words): the task before and after, how long it used to take; one
   failure the script handles that you did not think of at first; where you decided shell was no
   longer the right tool, or why it still is.

**Constraints**

- Bash, POSIX tools and standard utilities only.
- Nothing destructive without a dry run or a confirmation.
- No hardcoded paths belonging to your own machine.

**Where the marks are.** The safety and the transcript. A modest script that refuses bad input,
shows what it would do and exits honestly is worth far more than a clever one that assumes
everything is fine.`,
      rubric: [
        {
          criterion: 'Correctness and usefulness',
          description: 'Automates a real task end to end; sensible defaults; works from a clean machine or container.',
          maxPoints: 25,
        },
        {
          criterion: 'Safety',
          description: 'Dry run that changes nothing; destructive operations guarded; quoting and set -euo pipefail throughout.',
          maxPoints: 30,
        },
        {
          criterion: 'Interface',
          description: '--help, argument validation with clear refusals, output that says what happened, honest exit codes.',
          maxPoints: 20,
        },
        {
          criterion: 'Evidence',
          description: 'Transcript covering help, dry run, real run and bad arguments, with exit codes shown.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Explains the time saved, a failure case discovered, and where shell stops being the right tool.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
