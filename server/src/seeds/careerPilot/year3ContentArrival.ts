/**
 * T3_READINESS and T3_GAP_PLAN — seven units. Year 3. The first thing a student meets.
 *
 * ── THESE ARE MEASUREMENTS, NOT LESSONS ───────────────────────────────────────────────────
 *
 * Four of the seven are PRACTICE units whose job is to find out what is actually in place.
 * That changes how they are written. A lesson may teach before it asks; a check must not,
 * because a check that teaches first measures the teaching rather than the student.
 *
 * So the notes here say what is being measured and how the result will be used, and stop. No
 * worked example, no reminder of the syntax, no "recall that a dictionary lookup is O(1)".
 * Where a note would give away an answer below it, it is left out on purpose.
 *
 * The other thing these units carry is tone. A student who arrives in Year 3 having forgotten
 * most of Year 1 is the normal case, not the failure case, and the difference between a
 * diagnostic that helps and one that humiliates is almost entirely in how it is introduced.
 * Both GAP_PLAN units exist to do that work: to say what a low score is and is not.
 *
 * Attribution: T3_READINESS defaults to PROGRAMMING_FUNDAMENTALS with DSA_CHECK overridden to
 * PROBLEM_SOLVING; T3_GAP_PLAN defaults to TECHNICAL_COMMUNICATION with THE_PLAN overridden to
 * TECH_CAREER_AWARENESS. Both are set in year3SkillAttribution.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ARRIVAL_BUNDLES: PilotBundle[] = [
  /* ── Programming check ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_READINESS_PROGRAMMING_CHECK',
    notes: `This is a measurement. Nothing here is being taught, and nothing below reminds you
of the syntax, because a check that reminds you first is measuring the reminder.

**What is being looked at:** whether you can write a function that handles its edge cases,
whether you can model something with a class without being told which fields to give it, and
whether you reach for the right collection without thinking about it.

**About fifty minutes.** Work without looking things up if you can. If you cannot, look it up
and note that you did — that note is more useful to the plan than a clean score.

**What happens with the result.** It sets what Year 3 opens with. A gap found here is taught
before the advanced work starts; a gap hidden here is met later, in a harder unit, with no
support. There is nothing to gain by performing well on this.

**If you find you have forgotten most of it, that is the normal case.** A year away from writing
loops does that to everybody. It is information about what to teach, not a verdict about you.`,
    coding: [
      {
        title: 'A function and its edges',
        description: `Read a list of integers and print the second largest **distinct** value.

If there is no second distinct value, print \`none\`. An empty line is also \`none\`.

The edge cases are the point of the exercise, not an afterthought to it.`,
        starter: `import sys

line = sys.stdin.readline().strip()
nums = [int(x) for x in line.split()] if line else []

# TODO: print the second largest distinct value, or 'none'
`,
        language: 'python',
        tests: [
          { input: '3 1 4 1 5\n', expectedOutput: '4' },
          { input: '7 7 7\n', expectedOutput: 'none' },
          { input: '\n', expectedOutput: 'none' },
          { input: '2 1\n', expectedOutput: '1' },
          { input: '-5 -2 -9 -2\n', expectedOutput: '-5', isHidden: true },
          { input: '10\n', expectedOutput: 'none', isHidden: true },
        ],
      },
      {
        title: 'Model it yourself',
        description: `A library lends books. Build the model — you decide the fields.

Read commands, one per line, and respond to each:

- \`ADD <id> <title>\` — add a book. Print nothing.
- \`LEND <id> <person>\` — print \`ok\` if it was available, \`no\` if it is already lent or unknown.
- \`RETURN <id>\` — print \`ok\` if it was lent out, \`no\` otherwise.
- \`WHO <id>\` — print who holds it, or \`free\` if nobody, or \`no\` if unknown.

Nobody will tell you which fields to store. That choice is what is being looked at.`,
        starter: `import sys

class Library:
    def __init__(self):
        pass  # TODO: decide what this needs to hold

lib = Library()
for raw in sys.stdin:
    parts = raw.split()
    if not parts:
        continue
    # TODO: dispatch on parts[0]
`,
        language: 'python',
        tests: [
          { input: 'ADD 1 Dune\nLEND 1 asha\nWHO 1\n', expectedOutput: 'ok\nasha' },
          { input: 'ADD 1 Dune\nLEND 1 asha\nLEND 1 ravi\n', expectedOutput: 'ok\nno' },
          { input: 'WHO 9\n', expectedOutput: 'no' },
          { input: 'ADD 2 Emma\nWHO 2\n', expectedOutput: 'free' },
          { input: 'ADD 3 Ex\nLEND 3 a\nRETURN 3\nRETURN 3\nWHO 3\n', expectedOutput: 'ok\nok\nno\nfree', isHidden: true },
          { input: 'RETURN 4\n', expectedOutput: 'no', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Programming Check',
      description: 'A practical measurement across functions, modelling and collections.',
      instructions: `Complete both exercises above. Then, in four or five lines:

1. Which of the two took longer, and what specifically slowed you down.
2. Anything you had to look up. Name it precisely — "dictionary methods" is useful, "syntax" is
   not.
3. For the second exercise: say what you chose to store, and one thing you would store
   differently now that you have written it.

Be accurate rather than impressive. This is read to decide what gets taught first.`,
      rubric: [
        { criterion: 'Edge cases handled', description: 'Empty input, all-equal values and a single value all behave.', maxPoints: 30 },
        { criterion: 'A model that works', description: 'The four commands behave correctly, including on unknown ids.', maxPoints: 30 },
        { criterion: 'Choices stated', description: 'Says what was stored and why, rather than describing the code line by line.', maxPoints: 20 },
        { criterion: 'An honest note', description: 'Names what was looked up, specifically enough to act on.', maxPoints: 20 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

line = sys.stdin.readline().strip()
nums = [int(x) for x in line.split()] if line else []
`,
        tests: [
          { input: '3 1 4 1 5\n', expectedOutput: '4' },
          { input: '7 7 7\n', expectedOutput: 'none' },
          { input: '\n', expectedOutput: 'none' },
          { input: '-5 -2 -9 -2\n', expectedOutput: '-5', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 30,
      },
    },
    checkpoint: [
      mcq('Why should you note what you looked up rather than hide it?',
        [['The note decides what gets taught before the hard work', true],
          ['Looking things up is penalised in the score', false],
          ['It shows how the exercise was approached', false],
          ['It gives the assessor context for the result', false]],
        'A gap hidden here is met later in a harder unit, with no support around it.'),
      mcq('What is a low result on this check?',
        [['Information about what to teach first', true],
          ['A sign the year will be too difficult', false],
          ['A reason to repeat the previous year', false],
          ['A measure of how much was forgotten', false]],
        'A year away from writing loops does this to everybody; it is normal, not a verdict.'),
    ],
  },

  /* ── DSA check ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_READINESS_DSA_CHECK',
    notes: `Small structural problems, and a question after each one: **what does this cost?**

The second half matters as much as the first. Code that works but whose cost you cannot state
will be fine until the data grows, and then it will not be, and you will not see it coming.

**About fifty-five minutes, timed.** The timing is part of the measurement — fluency is
different from eventual success, and only one of them survives an interview or a deadline.

**What is being looked at:** whether arrays, maps and recursion are tools you reach for without
thinking, and whether you can say what a solution costs in time and in space without being
prompted.

**Say the cost in terms of the input.** "Fast" is not an answer. "Linear in the number of
records, constant extra space" is.

If you get one out and cannot state its cost, write that down. It is a specific, teachable gap
and it is a common one.`,
    coding: [
      {
        title: 'Find it without scanning twice',
        description: `Read two lines. The first is a list of integers, the second a single target.

Print the **indices** of the two values that sum to the target, space separated, smallest index
first. Print \`none\` if no pair exists. Exactly one pair will match where one exists.

Then, in your written answer, state the cost. A solution that works but costs more than it needs
to is worth partial credit only.`,
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]
target = int(sys.stdin.readline())

# TODO: print the two indices, or 'none'
`,
        language: 'python',
        tests: [
          { input: '2 7 11 15\n9\n', expectedOutput: '0 1' },
          { input: '3 2 4\n6\n', expectedOutput: '1 2' },
          { input: '1 2 3\n99\n', expectedOutput: 'none' },
          { input: '0 4 3 0\n0\n', expectedOutput: '0 3', isHidden: true },
          { input: '5\n5\n', expectedOutput: 'none', isHidden: true },
        ],
      },
      {
        title: 'Recursion over a shape',
        description: `A tree is given as lines of \`parent child\`. The root is the node that
never appears as a child. There is exactly one root and no cycles.

Print the **depth** of the tree: the number of nodes on the longest path from the root down to a
leaf. A single node alone has depth 1.

Empty input prints \`0\`.`,
        starter: `import sys

edges = [l.split() for l in sys.stdin if l.split()]

# TODO: build the shape, find the root, then measure the longest path
`,
        language: 'python',
        tests: [
          { input: 'a b\na c\nb d\n', expectedOutput: '3' },
          { input: 'r x\n', expectedOutput: '2' },
          { input: '', expectedOutput: '0' },
          { input: 'a b\nb c\nc d\nd e\n', expectedOutput: '5', isHidden: true },
          { input: 'p q\np r\np s\n', expectedOutput: '2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Data Structures Check',
      description: 'Small structural problems, timed, each followed by the cost of your solution.',
      instructions: `Complete both exercises, working against the clock. Then answer:

1. For the first exercise: state the time and space cost of your solution, in terms of the
   length of the list. If your first attempt was more expensive than your final one, say what
   the first one cost too.
2. For the second: state the cost, and say whether your solution would still work on a tree
   fifty thousand nodes deep. If not, say what would break.
3. Which of arrays, maps and recursion felt least automatic. One sentence.

A correct cost stated plainly scores better than a vague claim that a solution is efficient.`,
      rubric: [
        { criterion: 'The pair, correctly', description: 'Right indices, including duplicates and the no-pair case.', maxPoints: 25 },
        { criterion: 'Costing the first', description: 'Time and space stated in terms of the input, not as "fast".', maxPoints: 20 },
        { criterion: 'The depth, correctly', description: 'Right answer on a chain, a fan and an empty input.', maxPoints: 25 },
        { criterion: 'Costing the second', description: 'Cost stated, and the depth limit addressed honestly.', maxPoints: 20 },
        { criterion: 'The least automatic', description: 'Names one of the three specifically.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

nums = [int(x) for x in sys.stdin.readline().split()]
target = int(sys.stdin.readline())
`,
        tests: [
          { input: '2 7 11 15\n9\n', expectedOutput: '0 1' },
          { input: '1 2 3\n99\n', expectedOutput: 'none' },
          { input: '0 4 3 0\n0\n', expectedOutput: '0 3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('Why is this check timed?',
        [['Fluency and eventual success are different things', true],
          ['It keeps the diagnostic to a fixed length', false],
          ['It prevents looking the answers up online', false],
          ['It matches the conditions of a real interview', false]],
        'Only one of the two survives a deadline, and the check is trying to see which you have.'),
      mcq('Which is an acceptable statement of cost?',
        [['Linear in the records, constant extra space', true],
          ['Fast enough for the sizes involved here', false],
          ['Slower than the alternative approach', false],
          ['About the same as a single pass would be', false]],
        'Cost is stated in terms of the input; everything else is an impression.'),
      mcq('You solve a problem but cannot state its cost. You should:',
        [['Write that down as the specific gap it is', true],
          ['Estimate the cost as accurately as you can', false],
          ['Leave the solution out of the submission', false],
          ['Rewrite it in a form you can reason about', false]],
        'It is a common and very teachable gap, and only useful to the plan if recorded.'),
    ],
  },

  /* ── Data and web check ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_READINESS_DATA_WEB_CHECK',
    notes: `A query, a request and a response. Every direction in Year 3 sits on these three,
including the ones that do not sound like it — a data pipeline reads from a database, a mobile
app talks to an API, a machine-learning service is deployed behind an endpoint.

**What is being looked at:** whether you can join two tables and reason about what the join
returns, and whether you can read an HTTP exchange and say what happened in it.

**About fifty minutes.** Written, not run — the work is on paper, and the reasoning is the
measurement rather than the ability to get a database running.

**Nothing below reminds you of the syntax.** If you need to look it up, look it up and say so.

The most common gap at this point is not writing a join — it is saying what a join **returns**:
how many rows come back, what happens to the rows with no match, and why the total went up
instead of staying the same.`,
    mcqs: [
      mcq('Every Year-3 direction depends on these three because:',
        [['Even a model is deployed behind an endpoint that reads data', true],
          ['They are the topics most often asked in interviews', false],
          ['They are the foundation the later modules build on', false],
          ['They are the areas students most commonly forget', false]],
        'A pipeline queries, an app requests, a service responds. There is no direction without them.'),
      mcq('Which gap is most common at this stage?',
        [['Saying what a join returns, not writing one', true],
          ['Writing the join condition correctly', false],
          ['Choosing between the kinds of join', false],
          ['Knowing which tables need joining', false]],
        'Row counts, unmatched rows, and why a total went up rather than staying the same.'),
      mcq('Why is this check written rather than run?',
        [['The reasoning is what is being measured', true],
          ['A database is hard to set up locally', false],
          ['Written answers are quicker to assess', false],
          ['Running it would take longer than allowed', false]],
        'Getting a database running is a separate skill, checked separately in the tooling unit.'),
      mcq('Why does this unit deliberately omit reminders of syntax?',
        [['A reminder would measure itself, not you', true],
          ['Syntax is not what the unit assesses', false],
          ['It keeps the notes short enough to read', false],
          ['Looking it up is part of the exercise', false]],
        'The same reason the whole readiness topic teaches nothing before it asks.'),
    ],
    assignment: {
      title: 'Databases and the Web Check',
      description: 'A join and an HTTP exchange, written out and reasoned about.',
      instructions: `**Part zero — the join, run**

Complete the exercise attached to this assignment. It asks you to produce the rows an inner
join and a left join return, over the same two tables. Writing a join and knowing what it
gives back are different skills, and this measures the second one directly.

**Part one — the query**

Two tables:

    students(id, name, cohort_id)
    cohorts(id, title)

There are 120 students. Four of them have a \`cohort_id\` that is null, and two have a
\`cohort_id\` pointing at a cohort row that no longer exists.

1. Write a query returning every student's name alongside their cohort title.
2. Say how many rows your query returns, and what appears in the title column for the six odd
   students. If your answer is "116", say what you would change to get 120.
3. Now count students per cohort, including cohorts with none. Write it, and say which kind of
   join that requires and why the obvious one gives the wrong answer.

**Part two — the exchange**

A browser loads a page, which then fetches data:

    GET /orders/812 HTTP/1.1
    Host: api.example.com
    Authorization: Bearer <token>

    HTTP/1.1 304 Not Modified
    ETag: "a19f"

4. Say what the server is telling the client, and where the client is expected to get the body.
5. The same request an hour later returns \`401\`. Say what changed and what the client should
   do — precisely, including whether retrying the same request is reasonable.
6. A third request returns \`500\` with an HTML error page rather than JSON. Say what that
   suggests about where the failure happened.

Note anything you looked up.`,
      rubric: [
        { criterion: 'The join, implemented', description: 'Both kinds produce the right rows and the right count, including unmatched references.', maxPoints: 20 },
        { criterion: 'The join, written', description: 'A correct query returning names alongside titles.', maxPoints: 15 },
        { criterion: 'What it returns', description: 'Row count and the treatment of null and orphaned references, correctly reasoned.', maxPoints: 20 },
        { criterion: 'Counting per cohort', description: 'Right kind of join, with why the obvious one is wrong.', maxPoints: 15 },
        { criterion: 'Reading 304', description: 'Explains the response and where the body comes from.', maxPoints: 12 },
        { criterion: 'Reading 401 and 500', description: 'Distinguishes a client-side fix from a server-side failure, and says whether to retry.', maxPoints: 18 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

data = sys.stdin.read().split('\\n')
i = 0
n = int(data[i]); i += 1
students = []
for _ in range(n):
    sid, name, cid = data[i].split(); i += 1
    students.append((sid, name, cid))
m = int(data[i]); i += 1
cohorts = []
for _ in range(m):
    cid, title = data[i].split(); i += 1
    cohorts.append((cid, title))
kind = data[i].strip()

# TODO: print the number of rows this join returns, then one 'name title' per line,
# in student order. An unmatched student's title is the word null.
`,
        tests: [
          { input: '3\n1 asha 10\n2 ravi null\n3 mina 99\n2\n10 alpha\n20 beta\nINNER\n', expectedOutput: '1\nasha alpha' },
          { input: '3\n1 asha 10\n2 ravi null\n3 mina 99\n2\n10 alpha\n20 beta\nLEFT\n', expectedOutput: '3\nasha alpha\nravi null\nmina null' },
          { input: '1\n1 solo 10\n1\n10 alpha\nINNER\n', expectedOutput: '1\nsolo alpha' },
          { input: '2\n1 a null\n2 b null\n1\n10 alpha\nINNER\n', expectedOutput: '0', isHidden: true },
          { input: '2\n1 a 10\n2 b 10\n1\n10 alpha\nLEFT\n', expectedOutput: '2\na alpha\nb alpha', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('120 students, 4 with a null cohort. An inner join on cohorts returns:',
        [['Fewer than 120 rows', true],
          ['Exactly 120 rows', false],
          ['More than 120 rows', false],
          ['120 rows with blanks', false]],
        'The null rows match nothing, which is the behaviour students most often predict wrongly.'),
      mcq('A 304 response tells the client:',
        [['Use the copy you already hold', true],
          ['The resource has been moved elsewhere', false],
          ['The request was understood but ignored', false],
          ['The body will follow in a second response', false]],
        'Nothing changed since the tag it sent, so no body is transmitted.'),
      mcq('A 500 returning HTML where JSON was expected suggests:',
        [['It failed before reaching the application', true],
          ['The application returned the wrong format', false],
          ['The client sent an incorrect accept header', false],
          ['The response was truncated in transit', false]],
        'A proxy or server default error page, rather than your handler, produced it.'),
    ],
  },

  /* ── Tooling check ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_READINESS_TOOLING_CHECK',
    notes: `Can you get a project you have never seen running on your machine, change it on a
branch, and commit that change from a terminal?

This is checked separately from programming because it fails separately. A student who writes
good code and cannot run a project loses days in their first job to something nobody thinks to
teach, because everybody assumes it was covered.

**What is being looked at:** the shell as a place you work rather than a place you paste
commands into, branching as a normal act rather than a risky one, and the ability to read a
setup failure and get past it.

**About forty-five minutes.** Nothing here is run automatically — you record what you did and
what went wrong, and the record is the submission.

**The failures are the interesting part.** A run where everything worked first time tells the
plan very little. A run where the install failed and you read the message and fixed it tells it
a great deal, so write those down rather than tidying them away.`,
    mcqs: [
      mcq('Why is tooling checked apart from programming?',
        [['It fails apart from it, and costs days when it does', true],
          ['It is assessed against a different skill', false],
          ['It requires a working local environment', false],
          ['It cannot be measured by writing code', false]],
        'Good code and no ability to run a project is a real and common combination.'),
      mcq('Why does this unit ask you to record the failures?',
        [['A clean run tells the plan almost nothing', true],
          ['Failures are expected in every environment', false],
          ['The assessor needs to see the process', false],
          ['It shows the work was genuinely attempted', false]],
        'Reading an install error and getting past it is the actual skill being measured.'),
      mcq('"The shell as a place you work" means:',
        [['Navigating and inspecting, not only pasting commands', true],
          ['Preferring the terminal over any graphical tool', false],
          ['Knowing the common commands from memory', false],
          ['Writing scripts rather than running commands', false]],
        'Pasting works until something is slightly different from the instructions.'),
    ],
    assignment: {
      title: 'Git, the Shell and Your Environment',
      description: 'Run an unfamiliar project, branch it, change it and commit — and record what went wrong.',
      instructions: `**Part zero — resolve a conflict by hand**

Complete the exercise attached to this assignment. It gives you a file with conflict markers
in it and asks for the resolved file. Doing it as text, once, is what stops a real conflict
from being frightening — the markers are just lines, and a merge tool is a convenience
rather than a requirement.

**Then, the project.** Pick a small open-source project you have **not** worked with. Then, from a
terminal and without a graphical git client:

1. Clone it, and get it running or get its tests passing. Record every command you ran.
2. Record every failure on the way and what you did about it. If nothing failed, say what you
   already had installed that made it smooth.
3. Create a branch. Make a small real change — fix a typo in the docs, add a test, improve an
   error message.
4. Commit it with a message that says why, not what.
5. Show \`git log --oneline -3\` and \`git status\` after committing.
6. Without a graphical tool, answer: what is the difference between your branch and the default
   branch, and what command told you?

**Then, three questions:**

7. You have committed to the wrong branch and not pushed. Say what you would do. You may look
   this up; say that you did.
8. Something works for you and not for a classmate on the same commit. Name three things you
   would compare, in the order you would compare them.
9. Which of the shell, git or environment setup is least comfortable? One sentence, honestly.

**Submit** the command log with failures intact, and the answers to 6–9.`,
      rubric: [
        { criterion: 'Conflicts resolved', description: 'Markers removed and the chosen side kept, across several conflicts in one file.', maxPoints: 20 },
        { criterion: 'It runs', description: 'An unfamiliar project cloned and running, or its tests passing.', maxPoints: 15 },
        { criterion: 'The failures, kept', description: 'What went wrong and what was done about it, not tidied away.', maxPoints: 15 },
        { criterion: 'Branch, change, commit', description: 'Done from a terminal, with a message that says why.', maxPoints: 15 },
        { criterion: 'Reading the state', description: 'Can say how the branch differs from the default, and with what command.', maxPoints: 12 },
        { criterion: 'The wrong branch', description: 'A workable recovery, with the lookup acknowledged.', maxPoints: 13 },
        { criterion: 'Comparing two machines', description: 'Three things, in a sensible order.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = sys.stdin.read().split('\\n')
side = lines[0].strip()   # 'ours' or 'theirs'
body = lines[1:]

# TODO: print the file with every conflict resolved to the chosen side and the
# markers removed. A file may contain more than one conflict.
`,
        tests: [
          { input: 'ours\nkeep me\n<<<<<<< HEAD\nours line\n=======\ntheirs line\n>>>>>>> topic\ntail\n', expectedOutput: 'keep me\nours line\ntail' },
          { input: 'theirs\nkeep me\n<<<<<<< HEAD\nours line\n=======\ntheirs line\n>>>>>>> topic\ntail\n', expectedOutput: 'keep me\ntheirs line\ntail' },
          { input: 'ours\n<<<<<<< HEAD\na\n=======\nb\n>>>>>>> t\nmid\n<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> t\n', expectedOutput: 'a\nmid\nc' },
          { input: 'ours\nno conflict here\n', expectedOutput: 'no conflict here', isHidden: true },
          { input: 'theirs\n<<<<<<< HEAD\n=======\nonly theirs\n>>>>>>> t\n', expectedOutput: 'only theirs', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A commit message should say:',
        [['Why the change was made', true],
          ['What lines were changed', false],
          ['Which files were touched', false],
          ['When the work was done', false]],
        'The diff already shows what changed; nothing else records the reason.'),
      mcq('It works for you and not for a classmate on the same commit. Compare:',
        [['Versions, settings and installed dependencies', true],
          ['The commit each of you has checked out', false],
          ['The editor and extensions each uses', false],
          ['The amount of memory each machine has', false]],
        'Same code, different environment — the same four-way split the debugging topic uses.'),
    ],
  },

  /* ── Readiness checkpoint ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_READINESS_CHECKPOINT',
    notes: `Four checks are done. This unit is where the result becomes a plan.

**What you now have** is a profile: a score per skill, built from what you did rather than what
you said. It is not a ranking against your cohort and it is not visible to anybody but you and
your mentor.

**What happens next, mechanically:**

- Skills below the ready threshold get **bridge** units — the Year-1 and Year-2 material for
  exactly those skills, taught properly rather than skimmed.
- Skills that are close but not held get **revision** — a few units rather than a full
  re-teaching.
- Everything else opens as normal, in the direction you chose.

**There is a limit on how much bridging the year will do.** At most a third of the programme can
be spent on it. That is deliberate: beyond a third, the year stops being Year 3, and the right
answer is a different plan rather than a longer bridge.

**A skill with no evidence is not the same as a skill you failed.** If you skipped a check, the
system has nothing to go on, and nothing is what it will plan for. That is the one way to get a
worse plan than an honest bad result.`,
    mcqs: [
      mcq('What does your profile score come from?',
        [['What you did in the checks, not what you claimed', true],
          ['A comparison against others in your cohort', false],
          ['Your results across the previous two years', false],
          ['The subjects you said you were weakest in', false]],
        'Evidence, not self-assessment, which is why a hidden gap produces a worse plan.'),
      mcq('A skill close to the threshold but not held receives:',
        [['Revision, a few units rather than a re-teaching', true],
          ['A bridge covering the earlier material', false],
          ['No intervention until it is measured again', false],
          ['The same treatment as an unmeasured skill', false]],
        'Bridging is for skills below the threshold; revision is the lighter response.'),
      mcq('Why is bridging capped at a third of the programme?',
        [['Beyond that the year is no longer Year 3', true],
          ['Longer bridges stop improving the outcome', false],
          ['The remaining content cannot be compressed', false],
          ['Students disengage from extended revision', false]],
        'Past the cap the right answer is a different plan, not a longer bridge.'),
      mcq('What does skipping a check produce?',
        [['A plan built on nothing for that skill', true],
          ['A score of zero for that skill', false],
          ['A bridge added for that skill', false],
          ['A prompt to complete it later', false]],
        'No evidence means no intervention, which is worse than an honest bad result.'),
    ],
    checkpoint: [
      mcq('Who can see your readiness profile?',
        [['You and your mentor', true],
          ['Your whole cohort', false],
          ['Any employer you apply to', false],
          ['Nobody other than the system', false]],
        'It is a planning input, not a public ranking.'),
      mcq('Bridge units are drawn from:',
        [['Year-1 and Year-2 material for those skills', true],
          ['Simplified versions of the Year-3 units', false],
          ['A separate remedial curriculum', false],
          ['The weakest topics in your direction', false]],
        'Taught properly rather than skimmed, which is the point of bridging at all.'),
      mcq('An honest bad result is better than a skipped check because:',
        [['Only one of the two produces a plan', true],
          ['It is recorded as an attempt regardless', false],
          ['It can be improved on a later attempt', false],
          ['It shows engagement with the diagnostic', false]],
        'Nothing is what gets planned for when there is no evidence.'),
    ],
  },

  /* ── Reading your evidence ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_GAP_PLAN_READING_YOUR_EVIDENCE',
    notes: `You have numbers now. This unit is about reading them without either dismissing them
or over-reading them, which are the two failures, and most people commit one of them
immediately.

## What the number is

A score per skill, built from what you produced under the conditions of that check. It is
**evidence about a moment**, gathered from a sample of a skill — not a measure of your ability
and not a prediction about your career.

## Dismissing it

"The questions were unfair." "I was tired." "I do know this really." All three can be true and
none of them changes what to do next: the check found that the skill was not available to you
when you needed it, and a skill that is not available when you need it is functionally a gap.

The honest version of "I do know this really" is "I knew this once and cannot use it now", and
that is exactly what revision is for. Saying it plainly gets you the right treatment.

## Over-reading it

The other failure is worse, because it is quieter. A low score on one skill becomes "I am bad at
programming", then "I am not cut out for this", and then it stops being about the score at all.

Three things a low score is not:

- **Not a comparison.** You are not being ranked against your cohort.
- **Not permanent.** It is the state of one skill on one day, and the entire point of measuring
  it is that something is then done about it.
- **Not general.** Weak recursion is weak recursion. It says nothing about your database work,
  and the profile deliberately keeps them apart so that it cannot.

## What a zero means

It usually means no evidence rather than no ability. Check whether you attempted that part
before you read anything into it.

## Reading a mixed profile

Most profiles are uneven, and the shape tells you more than the average does.

- **Strong theory, weak practice** — you know the words and have not built with them enough.
- **Strong practice, weak theory** — usually self-taught, and it holds up until something needs
  explaining in an interview.
- **One deep hole, everything else fine** — the best shape to have. It is specific and it is
  quick to fix.

**The useful question is not "how did I do".** It is "which of these gaps blocks the most of
what comes next", and that one the plan answers for you.`,
    mcqs: [
      mcq('What is a skill score evidence of?',
        [['What was available to you at that moment', true],
          ['Your overall ability in that area', false],
          ['How much of the material you covered', false],
          ['Your likely performance in interviews', false]],
        'A sample of a skill on a day, which is both less and more useful than it feels.'),
      mcq('The honest version of "I do know this really" is:',
        [['I knew this once and cannot use it now', true],
          ['The conditions did not suit how I work', false],
          ['I would have scored higher with more time', false],
          ['The questions did not cover what I studied', false]],
        'And saying it plainly is what gets you revision rather than a full bridge.'),
      mcq('Why is over-reading a low score described as the worse failure?',
        [['It is quieter, and stops being about the score', true],
          ['It leads students to repeat material needlessly', false],
          ['It produces a plan with too much bridging', false],
          ['It is harder for a mentor to detect early', false]],
        '"Bad at this skill" becomes "not cut out for this" without anybody noticing the step.'),
      mcq('A zero on a section usually means:',
        [['No evidence rather than no ability', true],
          ['The section was attempted and failed', false],
          ['The skill is not yet being taught', false],
          ['The answers were all incorrect', false]],
        'Check whether you attempted it before reading anything into it at all.'),
    ],
    checkpoint: [
      mcq('Why does the profile keep skills separate rather than averaging them?',
        [['So a gap in one cannot read as a general verdict', true],
          ['So each can be measured on its own scale', false],
          ['So progress can be tracked per skill', false],
          ['So the plan can order them by priority', false]],
        'Weak recursion is weak recursion; it says nothing about your database work.'),
      mcq('Which profile shape is the easiest to act on?',
        [['One deep hole, everything else fine', true],
          ['Strong theory with weak practice', false],
          ['Strong practice with weak theory', false],
          ['An even profile slightly below threshold', false]],
        'Specific and quick, where an even shortfall is diffuse and slow.'),
      mcq('The question worth asking about your profile is:',
        [['Which gap blocks the most of what comes next', true],
          ['How your result compares with the average', false],
          ['How much the score can realistically improve', false],
          ['Which skill took the longest to demonstrate', false]],
        '"How did I do" has no action attached to it; that one does.'),
    ],
  },

  /* ── The plan ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_GAP_PLAN_THE_PLAN',
    notes: `Your plan is built, and it is not the same as anybody else's. This unit explains how
it was assembled, so that you can argue with it — which is allowed, and occasionally right.

## How it was built

1. **Your direction sets the spine.** Backend, frontend, data, AI, cloud, security, mobile and
   the rest each pull in their own track. This choice is required; there is no generic Year 3.
2. **Your evidence sets what comes before it.** Each skill below the ready threshold adds bridge
   units. Skills close to it add a few revision units instead.
3. **The admin's length sets what fits.** Bridging is capped at a third of the programme. Inside
   what is left, units are ordered by how much of the rest they unblock.

That ordering is why your plan may open with something that feels basic. It is not there because
the system thinks little of you; it is there because six later topics need it.

## What would change it

- **New evidence.** Later checkpoints re-measure. A bridge you no longer need can come out.
- **Changing direction.** It reshapes the spine, and the earlier it happens the less it costs.
- **A conversation with your mentor.** If the plan is wrong about you, say so, with the specific
  unit and the specific reason.

## Arguing with it well

"This is too easy" is not an argument. "I already built a service using this and here it is" is
one, because it is evidence, and evidence is the only thing the plan was ever made of.

That is the general principle worth taking out of this year: **claims about your own ability are
worth what the evidence behind them is worth.** It is true of your plan, and it is true a year
from now, of your CV.

## What the plan is not

It is not a contract that you will be employable at the end, and it is not a promise that
finishing it is sufficient. It is the most useful sequence available given what is known about
you today. The part that decides the outcome is still the work.`,
    mcqs: [
      mcq('Why can your plan open with something that feels basic?',
        [['Six later topics depend on it', true],
          ['Everybody starts with the same first week', false],
          ['It builds confidence before the hard work', false],
          ['Your evidence for it was the weakest', false]],
        'Units are ordered by how much of the rest they unblock, not by difficulty.'),
      mcq('What sets the spine of your plan?',
        [['The direction you chose', true],
          ['The evidence from your checks', false],
          ['The length the admin configured', false],
          ['The track your cohort is following', false]],
        'Evidence sets what comes before the spine; length sets how much of it fits.'),
      mcq('Which is an argument the plan can act on?',
        [['Here is a service I already built with it', true],
          ['I have covered this material before', false],
          ['This is too easy for where I am', false],
          ['I would rather start with the direction work', false]],
        'Evidence is the only thing the plan was made of, so evidence is what changes it.'),
      mcq('Changing direction costs least when it happens:',
        [['Early, before the track has been built out', true],
          ['At a checkpoint, when evidence is refreshed', false],
          ['After the bridge units are complete', false],
          ['Once the spine has been fully scheduled', false]],
        'It reshapes the spine, and there is less spine to reshape at the start.'),
    ],
    checkpoint: [
      mcq('The principle this unit generalises beyond the plan is:',
        [['A claim is worth what its evidence is worth', true],
          ['A plan should be revisited as things change', false],
          ['Direction matters more than current ability', false],
          ['Ordering by dependency beats ordering by difficulty', false]],
        'True of your plan today and of your CV a year from now.'),
      mcq('The plan is best described as:',
        [['The most useful sequence given what is known now', true],
          ['A commitment that completion leads to a job', false],
          ['A fixed schedule for the rest of the year', false],
          ['A ranking of the skills you most need', false]],
        'What decides the outcome is still the work, and the plan does not claim otherwise.'),
      mcq('What would remove a bridge from your plan?',
        [['New evidence at a later checkpoint', true],
          ['Completing the units it contains', false],
          ['A change to the programme length', false],
          ['Choosing a direction that avoids it', false]],
        'The plan is rebuilt from evidence, so it takes evidence to change it.'),
    ],
  },
];
