/**
 * Phase 21 capacity units — ten practical units for topics that teach and never apply.
 *
 * ── WHY THESE EXIST ───────────────────────────────────────────────────────────────────────
 *
 * Phase 21 certified learners at the state boundaries and found that what ran out was not
 * instruction but something to DO: a learner revising the universal skills had concept units left
 * and no debugging judgement or finished artefact to spend them on. Each unit here is specified in
 * CAPACITY_UNITS of year1ExpansionSpec.ts, which names the nearest existing unit and the
 * difference. The content holds that difference:
 *
 *   T_FUNCTIONS_REFACTORING      restructures working code under a behaviour-preservation
 *                                constraint; the mini project builds from a blank page.
 *   T_ARRAYS_STRING_DEBUGGING    edge assumptions in string solutions (splitting, slicing, find,
 *                                hidden characters); T_ARRAYS_DEBUGGING is index bounds.
 *   T_GIT_HISTORY_DEBUGGING      history as a diagnostic tool — log, show, diff, blame, bisect;
 *                                T_GIT_CONFLICTS debugs a merge.
 *   T_SQL_REPORT_PROJECT         analysis against a fixed schema from vague questions; the SQL
 *                                mini project is schema design, in a different domain.
 *   T_SHELL_PIPELINES_DEBUGGING  finding the lying stage of a silent pipeline; the practice and
 *                                project build pipelines.
 *   T_PROCESSES_MINI_PROJECT     an investigation with evidence and least-force action.
 *   T_PSEUDOCODE_MINI_PROJECT    a complete design handed to another person and executed by them.
 *   T_NUMBER_SYSTEMS_DEBUGGING   wrong results traced to width, sign, binary fractions and units.
 *   T_BOOLEAN_MINI_PROJECT       one rule carried through every representation, each checked.
 *   T_DECOMPOSITION_MINI_PROJECT a problem large enough that decomposition stops being optional.
 *
 * ── THE LINE THESE UNITS HOLD ─────────────────────────────────────────────────────────────
 *
 * A debugging unit teaches a METHOD for the faults a topic actually produces, with each symptom
 * traced to its cause; it does not re-teach the topic. A project brief is self-contained — the
 * script, schema, rule or scenario is inside the instructions, because a learner working in the
 * assignment screen never sees the notes — and every brief demands evidence, not just an artefact.
 *
 * Every unit declares a single skill, so no checkpoint question carries a skillKey.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

export const CAPACITY_BUNDLES: PilotBundle[] = [
  /* ── T_FUNCTIONS_REFACTORING ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_FUNCTIONS_REFACTORING',
    notes: `A script that works, that people rely on, and that nobody wants to touch. You will turn it
into functions without changing a single character of what it prints — and prove that you did not.

**Why this is different from building with functions.** In the functions mini project you designed
a program from a blank page, so every function was yours to shape. Real code rarely arrives that
way. It arrives as a long script written in a hurry that already gives the answers people depend
on, and the constraint is harsher: whatever it did before, it must still do afterwards, including
the odd things. The risk is not that your new code fails to run. It is that it runs and quietly
prints something slightly different.

**How to work:**

1. **Record the behaviour before you touch anything.** Run the original on every recorded input
   and save each output to a file. Those files are the definition of correct for the whole
   project.
2. **Read the script and mark the jobs** — each block you could name with a verb phrase. Mark the
   duplicated blocks too, and check carefully whether the copies really do the same job.
3. **Extract one function at a time.** After each extraction, run every recorded input again and
   compare with the saved output. If anything differs, undo that one step rather than debugging a
   pile of changes.
4. **Keep a refactoring log**: each step, what moved where, and the result of the comparison.
5. **Do not fix bugs while refactoring.** If you find behaviour that looks wrong, keep it, write
   it down with the input that shows it, and propose the fix separately. A fix mixed into a
   refactor makes it impossible to tell which change altered the output.

**What good looks like.** Functions that each do one job and can be read without the rest; one
place for each rule instead of two drifting copies; output files identical to the originals on
every input; and a log that would let somebody else repeat your steps.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Untangle a Working Script',
      description: 'Restructure a working exam-results script into well-designed functions without changing its output on any recorded input, proving behaviour preservation after every step and reporting, not fixing, the suspicious behaviour you find.',
      instructions: `**The script**

The department office uses \`results.py\` every semester. It reads the number of students, then
one line per student with a name and three subject marks, and prints a result line for each
student followed by a summary. It works, and everybody is afraid to change it:

    n = int(input())
    data = []
    t1 = 0
    t2 = 0
    t3 = 0
    best = ""
    bestavg = -1
    p = 0
    for i in range(n):
        line = input().split()
        nm = line[0]
        a = int(line[1])
        b = int(line[2])
        c = int(line[3])
        t1 = t1 + a
        t2 = t2 + b
        t3 = t3 + c
        avg = (a + b + c) / 3
        if avg >= 75:
            g = "Distinction"
        elif avg >= 60:
            g = "First class"
        elif avg >= 40:
            g = "Pass"
        else:
            g = "Fail"
        if a < 35 or b < 35 or c < 35:
            g = "Fail"
        if g != "Fail":
            p = p + 1
        print(nm.title() + ": " + str(round(avg, 1)) + " " + g)
        if avg > bestavg:
            bestavg = avg
            best = nm.title()
        data.append([nm, a, b, c])
    print("---")
    print("Passed: " + str(p) + " of " + str(n))
    if n > 0:
        print("Subject averages: " + str(round(t1 / n, 1)) + " " + str(round(t2 / n, 1)) + " " + str(round(t3 / n, 1)))
        avg = bestavg
        if avg >= 75:
            g = "Distinction"
        elif avg >= 60:
            g = "First class"
        elif avg >= 40:
            g = "Pass"
        else:
            g = "Fail"
        print("Topper: " + best + " (" + g + ")")

**The recorded inputs**

\`input1.txt\`:

    4
    asha 82 91 77
    ravi 55 61 58
    meera 90 30 95
    kiran 38 41 40

\`input2.txt\`:

    0

\`input3.txt\`:

    2
    neha 96 33 97
    arjun 70 72 71

\`input4.txt\`:

    3
    zoya 60 60 60
    yash 60 60 60
    xavier 10 20 30

**Requirements**

1. **Record first.** Save the script unchanged as \`original.py\`. For each input file, save the
   output: \`python original.py < input1.txt > before1.txt\`, and so on. Use Command Prompt, Git
   Bash, or a Linux or macOS terminal — Windows PowerShell does not support \`<\` — and use the same
   terminal for every run so the files are comparable. Add at least two input files of your own
   that exercise something the four above do not, such as averages of exactly 75, 60 and 40, and a
   mark of exactly 35.
2. **Refactor into \`refactored.py\`** with at least five functions. Each function does one job and
   can be named without "and"; it receives what it needs as parameters and returns its result; no
   function reads or changes a global variable other than a constant.
3. **Name the rules.** The thresholds 75, 60, 40 and 35 become named constants, each defined once.
4. **One place for the grade bands.** The script contains two copies of the band chain. Before
   combining them, work out whether the two places really apply the same rule, and make sure the
   output is preserved either way.
5. **Remove dead code** only where you can show that it affects no output.
6. **Prove it after every step.** Work in at least five separate steps. After each one, run every
   input file through \`refactored.py\` and compare with the saved output, using
   \`diff before1.txt after1.txt\` (no output means identical) or, in Command Prompt,
   \`fc before1.txt after1.txt\` (which reports that no differences were encountered). Committing
   each step to Git is recommended.
7. **Do not fix behaviour.** If the output looks wrong for some input, keep it exactly as it is and
   record it under Behaviour notes: the input that shows it, what a reader would expect instead,
   and the fix you would propose. There is at least one such behaviour in this script.

**What to submit**

1. \`original.py\`, unchanged, and \`refactored.py\`.
2. All input files, and the before and after output files for each.
3. The comparison output for every input after your final step.
4. A **refactoring log** with at least five rows: step number, what was extracted or changed, and
   the comparison result for every input at that step.
5. **Behaviour notes**, with at least one entry.
6. A short explanation (200-300 words): how you decided where each function's boundary was, what
   you discovered about the two grade-band chains, and why you did not fix what you found.`,
      rubric: [
        { criterion: 'Behaviour preserved, with evidence', description: 'Output of refactored.py is identical to original.py on all six or more inputs, shown by real diff or fc output, including the empty class and the tie.', maxPoints: 30 },
        { criterion: 'Function design', description: 'At least five single-purpose functions that take parameters and return results; no function depends on mutable globals; the top level reads as a summary of the program.', maxPoints: 25 },
        { criterion: 'Duplication and constants', description: 'Thresholds defined once as named constants; the band logic exists in one place, with the difference between the two original uses preserved correctly; dead code removed with justification.', maxPoints: 15 },
        { criterion: 'Refactoring log and step discipline', description: 'At least five small steps, each followed by a comparison on every input, recorded so that another person could repeat them.', maxPoints: 15 },
        { criterion: 'Behaviour notes and explanation', description: 'Identifies the suspicious behaviour with the input that shows it and a proposed fix, and explains function boundaries and the decision not to fix during the refactor.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── T_ARRAYS_STRING_DEBUGGING ───────────────────────────────────────────────────────── */
  {
    unitCode: 'T_ARRAYS_STRING_DEBUGGING',
    notes: `A string solution that passes the example and fails on the judge almost never has a logic
error in the middle. It has an assumption at the edge: that words are separated by exactly one
space, that a search always finds something, that the string is not empty. The example did not
break those assumptions. The hidden tests were written to.

**Step 1 — see the string as the computer sees it.**

    print(repr(s), len(s))

\`repr\` shows leading and trailing spaces, doubled spaces, a tab as \`\\t\` and a Windows line
ending as \`\\r\`. Two strings that print identically and compare unequal are settled by this line.

**Step 2 — write the adversarial inputs before rerunning.** For any string problem: the empty
string, one character, all characters the same, mixed case, extra spaces at both ends and in the
middle, and the case where the thing you search for is absent.

**Step 3 — match the symptom to its usual cause.**

**\`IndexError: string index out of range\`** — \`s[0]\` or \`s[-1]\` on an empty string, often an
empty piece produced by splitting.

**A word count that is one too high, or 1 for an empty line** — \`split(" ")\` where \`split()\`
was needed:

    "a  b".split(" ")     # ['a', '', 'b']
    "".split(" ")         # ['']
    "a  b".split()        # ['a', 'b']
    "".split()            # []

With no argument, \`split\` treats any run of whitespace as one separator and ignores it at the
ends.

**The last window or substring is never checked** — the range stops one short:

    for i in range(len(s) - k):         # misses the final window
    for i in range(len(s) - k + 1):     # every window of length k

\`"abcd"\` has three windows of length 2, and \`len(s) - k\` is only 2.

**The whole string comes back when nothing should** — \`find\` returns \`-1\` when the text is
absent, and slicing from \`-1 + 1\` slices from 0:

    domain = email[email.find("@") + 1:]    # no @ at all: returns everything

Test \`"@" in email\` first, or use \`partition\`, whose middle item is empty when the separator is
missing.

**The largest number comes out as the smallest** — the values are still strings, and
\`max(["9", "10"])\` is \`"9"\`, because text compares character by character.

**Step 4 — fix the assumption, not the example.** A special case that makes one failing input pass
usually leaves its neighbours failing. Ask which assumption the input broke, and remove that
assumption everywhere it appears.`,
    coding: [
      {
        title: 'Fix the initials printer',
        description: `This program reads a full name on one line and prints the initials, each in upper case and followed by a dot, then the number of words in the name on a second line.

For \`Asha Devi Rao\` it prints \`A.D.R.\` and then \`3\`, and the starter code already does that. It fails on the judge's other tests. Write down the adversarial inputs first (extra spaces anywhere, lower case, a single name), find the assumption each one breaks, and fix the assumptions rather than individual inputs.`,
        starter: `line = input()
words = line.split(" ")
letters = []
for word in words:
    letters.append(word[0])
print(".".join(letters) + ".")
print(len(words))
`,
        language: 'python',
        tests: [
          { input: 'Asha Devi Rao', expectedOutput: 'A.D.R.\n3' },
          { input: '  vikram   seth ', expectedOutput: 'V.S.\n2' },
          { input: 'madhu', expectedOutput: 'M.\n1', isHidden: true },
          { input: 'rAJ  kumar  YADAV', expectedOutput: 'R.K.Y.\n3', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq(`On the judge, lines read with \`line = input()\` print as \`yes\`, yet \`line == "yes"\` is False for every one, and \`print(repr(line))\` shows \`'yes\\r'\`. What is wrong?`,
        [['The input has Windows line endings, leaving a carriage return', true],
          ['repr() adds that character, so line itself is really fine', false],
          ['The comparison is case-sensitive, and the input says YES', false],
          ['input() returns bytes there, which never equal a string', false]],
        'Test data saved with Windows line endings has a carriage return before each newline, and input() on Linux removes only the newline. Stripping the line before comparing removes the rest.'),
      mcq('A solution checks every substring of length k with `for i in range(len(s) - k):`. It passes the example and fails when the answer is the final substring. Why?',
        [['The range stops one early, so the last window is never checked', true],
          ['The slice s[i:i + k] leaves out the character at i + k - 1', false],
          ['range() cannot start at 0 when it is used for string indices', false],
          ['Substrings at the end of a string need a negative index instead', false]],
        'A string of length n has n - k + 1 windows of length k, so range(len(s) - k + 1) is needed to visit them all.'),
      mcq('`words = input().split(" ")` then `print(len(words))`. A hidden test is an empty line and expects 0. What does the program print?',
        [['1, because splitting "" on a space gives a list holding ""', true],
          ['0, because there are no spaces for split to divide on', false],
          ['An IndexError, because the empty line has no first word', false],
          ['2, because split counts the gap before and after the line', false]],
        'split(" ") always returns at least one piece. split() with no argument returns an empty list for an empty or all-space line.'),
      mcq('`domain = email[email.find("@") + 1:]` is meant to extract the domain. For an input with no `@`, it returns the entire input instead of signalling a problem. Why?',
        [['find() returns -1, and slicing from -1 + 1 starts at index 0', true],
          ['find() raises an error, and the slice quietly swallows it', false],
          ['Slicing past the end of a string wraps round to the start', false],
          ['The + 1 moves the slice one character past the string end', false]],
        'Unlike index(), find() signals absence with -1 instead of raising. Check for the @ first, or use partition, whose middle item is empty when it is missing.'),
    ],
    checkpoint: [
      mcq('`max(input().split())` is meant to print the largest number. For the input `9 10 100` it prints 9. Why?',
        [['The values are strings, and "9" sorts after "1" as text', true],
          ['max() only looks at the first two values it is given', false],
          ['split() drops the last value when the line ends in digits', false],
          ['max() returns the first value when the others are larger', false]],
        'Text compares character by character, so "9" beats both "10" and "100". Convert each piece with int() before comparing.'),
      mcq('Two strings print identically, but comparing them with == gives False. What is the most useful first diagnostic step?',
        [['Print repr() of both, to reveal hidden spaces and characters', true],
          ['Compare them again using is instead of the == operator', false],
          ['Convert both to upper case and then compare them again', false],
          ['Print both with print(), each on a line of its own', false]],
        'repr shows trailing spaces, tabs and carriage returns that print renders invisibly. Upper-casing hides a difference instead of finding it.'),
      mcq('How many items does `"a,b,,c".split(",")` return?',
        [['4', true], ['3', false], ['5', false], ['2', false]],
        'Two adjacent commas enclose an empty string, which split with an explicit separator keeps: a, b, an empty string, and c.'),
    ],
  },

  /* ── T_GIT_HISTORY_DEBUGGING ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_GIT_HISTORY_DEBUGGING',
    notes: `It worked at last week's release and it does not work now. Between the two are forty
commits. Reading forty diffs is slow and reading the whole codebase is slower. The history already
knows which commit changed the behaviour; the job is to ask it efficiently.

**Step 1 — pin down good and bad.** You need a commit where the behaviour was right (a release
tag, or a hash from last week's log) and one where it is wrong, usually \`HEAD\`. You also need a
quick, repeatable check — a command, a test or one manual step — that says "fine" or "broken" in
under a minute. Without that check, nothing below works.

**Step 2 — narrow with the log.**

    git log --oneline v1.4..HEAD            # commits since the good release
    git log --oneline -- src/cart.py         # only commits that touched this file
    git log --oneline -S "apply_discount"    # commits that added or removed this text

\`-S\`, the pickaxe, is the fastest route when you know which function or setting misbehaves.

**Step 3 — inspect a suspect.**

    git show 3f9c2ab                        # message, author, date and the diff
    git show --stat 3f9c2ab                 # just the files it changed
    git diff v1.4 HEAD -- src/cart.py       # the total change to one file between two points

**Step 4 — ask which commit last changed a line.**

    git blame -L 40,60 src/cart.py

Each line is shown beside the commit that last touched it. That may be a commit that only
reformatted the line: \`git blame -w\` ignores whitespace-only changes, and
\`git blame 3f9c2ab^ -- src/cart.py\` shows the file as it was just before that commit.

**Step 5 — when nothing stands out, bisect.**

    git bisect start
    git bisect bad                # the current commit is broken
    git bisect good v1.4          # this one worked

Git checks out a commit halfway between. Run your check, then report with \`git bisect good\` or
\`git bisect bad\`. Each answer halves the range, so forty commits need about six checks and a
thousand about ten. When Git prints that a commit "is the first bad commit", read it with
\`git show\`, then return to where you started:

    git bisect reset

A commit that cannot be tested for an unrelated reason is passed over with \`git bisect skip\`. If
your check is a script that exits 0 for a good commit and 1 for a bad one,
\`git bisect run ./check.sh\` performs the whole search unattended.

**Why this is the reason to keep history clean.** Bisect finds the first bad commit. If that commit
is "misc changes" across thirty files, you have narrowed the search to thirty files. If it is
"Round the discount before adding tax", you have very nearly found the bug.`,
    mcqs: [
      mcq('About 250 commits separate a known-good tag from a broken HEAD. Roughly how many checks will `git bisect` ask you to run?',
        [['About 8, since each check halves the remaining range', true],
          ['About 125, since on average half must be checked', false],
          ['250, one for every commit between the two points', false],
          ['About 25, one for every ten commits in the range', false]],
        'Two to the eighth power is 256, so eight halvings narrow 250 commits to one. That logarithmic cost is why bisect beats reading diffs.'),
      mcq('`git blame` says the broken line was last changed by a commit titled "Reformat cart.py". What should you do next?',
        [['Look past it with git blame -w, or blame the commit before it', true],
          ['Revert the reformat commit, since blame names it as the cause', false],
          ['Ask the author of the reformat to explain why they broke it', false],
          ['Stop, because blame cannot see anything older than a reformat', false]],
        'Blame reports the last commit to touch a line, not the one that changed its meaning. Ignoring whitespace, or blaming the parent revision, reaches the earlier change.'),
      mcq('Halfway through a bisect, Git checks out a commit that does not build, for a reason unrelated to the bug. What do you tell Git?',
        [['git bisect skip, so it chooses a nearby commit instead', true],
          ['git bisect bad, since a commit that fails to build is broken', false],
          ['git bisect good, since the bug being hunted did not appear', false],
          ['git bisect reset, and then begin the whole search again', false]],
        'Marking it good or bad would be a guess and could send the search the wrong way. skip tells Git this commit gives no information.'),
      mcq('The shipping charge became wrong at some point, and the code that computes it calls `shipping_rate`. Which command lists only the commits that added or removed that name?',
        [['git log -S "shipping_rate"', true],
          ['git blame shipping_rate', false],
          ['git show shipping_rate', false],
          ['git diff "shipping_rate"', false]],
        'The pickaxe option -S finds commits that changed how many times the text occurs. blame, show and diff expect files or commits, not a search term.'),
    ],
    checkpoint: [
      mcq('Which command lists only the commits that changed `src/cart.py`?',
        [['git log --oneline -- src/cart.py', true],
          ['git show --stat src/cart.py', false],
          ['git blame --oneline src/cart.py', false],
          ['git diff --oneline src/cart.py', false]],
        'Paths after -- restrict the log to commits that touched them. blame annotates lines and diff compares states; neither lists history.'),
      mcq('What does `git show 3f9c2ab` display?',
        [['That commit\'s message, author and date, and the diff it made', true],
          ['Every file in the project exactly as it was at that commit', false],
          ['The list of all commits made after that one on the branch', false],
          ['The lines of each file that commit was the last to change', false]],
        'show describes one commit and the change it introduced, which is why it is the command for reading a suspect.'),
      mcq('Bisect has printed "is the first bad commit". What must you run before carrying on with normal work?',
        [['git bisect reset, to return to the branch you started on', true],
          ['git bisect bad, to confirm the result Git has just printed', false],
          ['git revert on that commit, which ends the bisect session', false],
          ['Nothing, because bisect finishes and tidies up by itself', false]],
        'Until reset, you are on a detached HEAD at an old commit, and git status still reports that a bisect is in progress.'),
    ],
  },

  /* ── T_SQL_REPORT_PROJECT ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_SQL_REPORT_PROJECT',
    notes: `A manager does not ask for a query. They ask "how did we do last month?" and "what sells?",
and somebody has to decide what those questions mean before any SQL is written. This project is
that job: a database you did not design, a list of questions that are not yet precise, and a report
that says what the data shows — and, just as plainly, where it cannot answer.

**Why this is not the schema project again.** In the library mini project you owned the tables,
so every question could be shaped by your design. Here the schema is fixed, and it was designed
for recording orders at a counter, not for answering your questions. Some answers will be easy,
some need care with joins and NULLs, and at least one is impossible. Working within that is the
everyday use of SQL.

**How to work:**

1. **Read the schema before the questions.** For every table, know what one row means; for every
   column, what NULL means; and for the business, what is not recorded at all.
2. **Rewrite each vague question as a precise one** before querying: which rows count, over which
   dates, measured how, and what happens to cancelled orders, walk-in customers and ties. Write the
   precise version down — it is assessed.
3. **Build each query up** from a bare \`SELECT\` with \`LIMIT 5\`, running it at every step.
4. **Check every answer a second way.** Totals by category should add up to the overall total; a
   count should never exceed the rows it was drawn from.
5. **State the limits.** If an answer rests on something the data cannot confirm, say so in the
   report, next to the number.

**What good looks like.** A report the manager could act on, in plain language, with every number
traceable to a query in the appendix; definitions precise enough that another analyst would get the
same numbers; sanity checks that were actually run; and an honest statement of what the data cannot
tell, with what would need to be recorded so that it could.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — The Canteen Report Somebody Asked For',
      description: 'Answer a canteen manager\'s vague business questions against a fixed orders database: restate each precisely, query it, check the answer a second way, and report the results and the limits of the data in plain language.',
      instructions: `**The scenario**

The college canteen records every order in a small database. The canteen manager has sent you
questions for the monthly review. You may not change the schema; the billing counter depends on
it.

    CREATE TABLE students (
        student_id    INTEGER PRIMARY KEY,
        name          TEXT NOT NULL,
        hostel        TEXT,              -- NULL means a day scholar
        year_of_study INTEGER NOT NULL   -- 1 to 4
    );

    CREATE TABLE menu_items (
        item_id   INTEGER PRIMARY KEY,
        name      TEXT NOT NULL,
        category  TEXT NOT NULL,         -- 'Breakfast', 'Meals', 'Snacks' or 'Drinks'
        price     INTEGER NOT NULL,      -- the CURRENT price in rupees
        is_veg    INTEGER NOT NULL       -- 1 or 0
    );

    CREATE TABLE orders (
        order_id    INTEGER PRIMARY KEY,
        student_id  INTEGER REFERENCES students(student_id),  -- NULL for walk-in customers
        ordered_at  TEXT NOT NULL,       -- 'YYYY-MM-DD HH:MM', local time
        payment     TEXT NOT NULL,       -- 'UPI', 'Cash' or 'Card'
        status      TEXT NOT NULL        -- 'Completed' or 'Cancelled'
    );

    CREATE TABLE order_items (
        order_id  INTEGER NOT NULL REFERENCES orders(order_id),
        item_id   INTEGER NOT NULL REFERENCES menu_items(item_id),
        quantity  INTEGER NOT NULL,
        PRIMARY KEY (order_id, item_id)
    );

Because \`ordered_at\` is fixed-format text, \`SUBSTR(ordered_at, 1, 7)\` gives the month and
\`SUBSTR(ordered_at, 12, 2)\` the hour, in SQLite, MySQL and PostgreSQL alike.

**Data.** Use the canteen dataset from your mentor if one is provided. Otherwise write an insert
script — or better, swap scripts with a classmate, so that you analyse data you did not write —
with at least 30 students, 15 menu items and 250 orders spread over two full calendar months,
including: both day scholars and hostel students; walk-in orders; cancelled orders; an item that
has never been ordered; an item ordered only in the earlier month; and two items tied on quantity
sold.

**The manager's questions**

1. How much did we make last month?
2. What are our best-sellers?
3. Who are our bigger customers, hostel students or day scholars?
4. When is the rush?
5. Which items does nobody want any more?
6. Is UPI taking over from cash?
7. Do first-years spend less than final-years?
8. Did the price rise at the start of last month drive customers away?

**Requirements, for each question**

1. **A precise restatement**: exactly which rows count, the date range written as real dates, what
   is measured (orders, items or rupees), and how cancelled orders, walk-ins, NULLs and ties are
   treated. Where two readings are reasonable, choose one and say why.
2. **The query**, formatted and commented, with no \`SELECT *\`.
3. **The result**, from your data.
4. **A sanity check**: a second query or calculation the answer must agree with, and its result —
   for example, revenue per category must add up to total revenue.
5. **The limits**: anything the answer assumes that the data does not record.

Some limits change what an answer means: revenue, for instance, can only be computed from the
current price. At least one question cannot be answered from this schema at all. For that one,
explain why, and state precisely what would have to be recorded to answer it next month.

**What to submit**

1. A \`.sql\` file containing, for each question, the restatement as a comment, the query and the
   sanity-check query.
2. A **report for the manager** of one to two pages with no SQL in it: each answer in plain
   language with its key number, the definition it used in one sentence, and any limit that
   affects how far it should be trusted.
3. An **appendix** with the actual output of every query and every sanity check.
4. A short note (150-250 words) on the question whose restatement was hardest, and the reading you
   rejected.`,
      rubric: [
        { criterion: 'Precise restatements', description: 'Every question restated with explicit rows, real dates, measure, and treatment of cancelled orders, walk-ins, NULLs and ties; choices between readings are justified.', maxPoints: 25 },
        { criterion: 'Correct queries', description: 'Each query matches its restatement: correct joins (including LEFT JOIN where rows could be missing), correct NULL handling, WHERE versus HAVING, and no SELECT *.', maxPoints: 30 },
        { criterion: 'Sanity checks', description: 'A genuine independent check for every answer, actually run, with results that agree or a discrepancy that is explained.', maxPoints: 15 },
        { criterion: 'Limits and the unanswerable question', description: 'States the current-price limitation and other real limits; identifies the question the schema cannot answer and specifies exactly what would need recording.', maxPoints: 15 },
        { criterion: 'Report for the manager', description: 'Plain-language answers with key numbers, one-sentence definitions and relevant caveats, every number traceable to the appendix.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── T_SHELL_PIPELINES_DEBUGGING ─────────────────────────────────────────────────────── */
  {
    unitCode: 'T_SHELL_PIPELINES_DEBUGGING',
    notes: `A pipeline that prints nothing gives you no error to read. Every stage ran and exited, and
somewhere one of them passed along an empty stream or the wrong lines. The method is to stop
treating the pipeline as one command and find the first stage whose output is not what you
expected.

**Step 1 — cut the pipeline at each pipe and look.**

    grep "ERROR" app.log | head -3
    grep "ERROR" app.log | cut -d',' -f3 | head -3
    grep "ERROR" app.log | cut -d',' -f3 | sort | uniq -c | head -3

Use \`wc -l\` in place of \`head\` when the question is how many lines survive each stage. The first
stage where the output turns empty or wrong is the one that lies; everything before it can be
ignored.

**Step 2 — look at that stage's input exactly.** \`cat -A file | head\` shows a tab as \`^I\`, a
carriage return as \`^M\`, and the end of each line as \`$\`. On macOS, \`cat -e\` shows line
endings.

**Step 3 — read every stage's exit status.** In bash, straight after the pipeline:

    echo "\${PIPESTATUS[@]}"

\`0 1 0\` means the second stage returned 1. For \`grep\`, 1 is not an error: it means no line
matched. An actual error is 2.

**The faults, symptom first:**

**The filter matches nothing** — case (\`grep error\` against \`ERROR\`), or a pattern written for a
different format. Look at one real line, then try \`grep -i\` and a looser pattern.

**The filter matches almost everything** — characters that are special to grep. \`grep "[ERROR]"\`
matches any line containing an E, R or O, and \`grep "10.0.0.1"\` also matches \`10a0b0c1\`. Use
\`grep -F\` to search for fixed text.

**\`cut\` prints whole lines** — the delimiter is wrong. A line that does not contain the delimiter
is printed unchanged, so a tab-separated file cut with \`-d','\` comes through intact.

**Patterns ending in \`$\` never match** — the file has Windows line endings, so every line ends
with a carriage return. \`tr -d '\\r'\` early in the pipeline removes them.

**Text appears on screen but never reaches the next stage** — it is on stderr, and a pipe carries
stdout only. Adding \`2>/dev/null\` makes it vanish, which confirms it; \`2>&1 |\` carries it on.

**"No such file or directory" naming half of your pattern** — an unquoted variable split on its
space. With \`pattern="disk full"\`, \`grep $pattern log.txt\` searches for \`disk\` in files called
\`full\` and \`log.txt\`. Write \`"$pattern"\`.

**Works in your terminal, empty from a script or a scheduled job** — a relative path resolved from a
different working directory. \`set -x\` in the script prints each command after its variables are
expanded, which shows the path actually used.`,
    mcqs: [
      mcq('`grep "[ERROR]" app.log | wc -l` reports nearly every line of the log, although errors are rare. Why?',
        [['Brackets make a character class matching any one of E, R or O', true],
          ['wc -l counts every line in the log, not just those piped in', false],
          ['grep ignores the brackets and matches the word in any case', false],
          ['Quoting the pattern makes grep print non-matching lines too', false]],
        'A bracket expression matches one character from the set, and most lines contain an E, R or O somewhere. grep -F "ERROR" matches the word itself.'),
      mcq('`cut -d\',\' -f3 marks.tsv` prints every line in full instead of the third column. What is the most likely cause?',
        [['The file uses tabs, and cut passes lines with no comma through', true],
          ['cut numbers fields from 0, so field 3 does not exist in the file', false],
          ['The file is too large, so cut falls back to printing all of it', false],
          ['A comma has to be escaped before it can be given to the -d option', false]],
        'A line without the delimiter is printed unchanged unless -s is given. cut -f3 with its default tab delimiter is what a tab-separated file needs.'),
      mcq('`grep "done$" jobs.txt` finds nothing, yet many lines visibly end in done. `cat -A jobs.txt` shows those lines ending in `done^M$`. What fixes the search?',
        [['Deleting carriage returns first, for example with tr -d', true],
          ['Adding -i so that grep matches done in any letter case', false],
          ['Escaping the dollar sign so grep treats it as a letter', false],
          ['Using grep -c, which counts matches instead of listing', false]],
        '^M is a carriage return left by Windows line endings, so the characters before the end of each line are not done. Removing them lets the anchor match.'),
      mcq('A script contains `grep $1 server.log`. Running `./find.sh "disk full"` prints `grep: full: No such file or directory`. What is wrong?',
        [['$1 is unquoted, so disk full became two separate arguments', true],
          ['grep cannot search for a pattern that contains a space', false],
          ['server.log was renamed, and grep is reporting the new name', false],
          ['The script was run without first making it executable', false]],
        'Unquoted, the value splits on its space, so grep searches for disk in files named full and server.log. Writing "$1" keeps it one argument.'),
    ],
    checkpoint: [
      mcq('After `cat app.log | grep FAIL | wc -l`, the command `echo "${PIPESTATUS[@]}"` prints `0 1 0`. What does that tell you?',
        [['grep ran correctly and found no line containing FAIL', true],
          ['grep crashed, so wc had no input and counted nothing', false],
          ['cat could not open app.log, so the pipeline was empty', false],
          ['wc failed, and the count it printed cannot be trusted', false]],
        'grep exits 1 when nothing matches and 2 on a real error. The other stages returned 0, so the count of zero is a true answer.'),
      mcq('What does adding `set -x` near the top of a misbehaving shell script show?',
        [['Each command as it runs, after variables have been expanded', true],
          ['Only the commands that failed, along with their exit codes', false],
          ['The value of every variable at the moment the script ends', false],
          ['A syntax check of the whole script before any of it runs', false]],
        'Seeing the expanded command reveals an empty variable, a wrong path or a split argument directly, which is why it is the first switch to reach for.'),
      mcq('A script reads `logs/today.log`. It works when started from its own folder but produces an empty result when started from your home directory. What is the likely cause?',
        [['The relative path is resolved from the current directory', true],
          ['Scripts cannot read files outside the folder they live in', false],
          ['The home directory hides log files from ordinary scripts', false],
          ['The script needs chmod +x again for each new directory', false]],
        'A relative path means relative to wherever the script was started. An absolute path, or changing to the script\'s own directory first, removes that dependence.'),
    ],
  },

  /* ── T_PROCESSES_MINI_PROJECT ────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_PROCESSES_MINI_PROJECT',
    notes: `A machine is sluggish, a port your application needs is already taken, and something will
not stop when asked. Somewhere among the running processes are the ones responsible — and at least
one process that looks suspicious is doing legitimate work that must not be interrupted. Find the
culprits, act on them with the least force that works, and write a report that justifies every
action.

**Why this is a project.** Knowing that \`kill\` sends SIGTERM and \`kill -9\` sends SIGKILL takes a
minute. Deciding which process to signal, with evidence rather than a guess, and knowing what is
lost when you do, is a different skill. On a real server the wrong \`kill\` stops a backup, drops
database connections or ends somebody else's work, and "it was using a lot of CPU" is not a
defence.

**How to work:**

1. **Look before you touch.** Take a snapshot of what is running — \`ps\` sorted by CPU, \`uptime\`
   — and save it. That is your "before".
2. **Build a case for each suspect**: what the command is, who started it, how long it has been
   running, what its parent is, and what it is doing — files it writes, ports it holds.
3. **Decide in writing before acting.** What is lost if this process stops? Is there a gentler
   option than stopping it?
4. **Escalate one step at a time.** SIGTERM first, which lets a process clean up. SIGKILL only
   after you have shown that SIGTERM did not work.
5. **Verify.** A problem is fixed when the evidence says so — the CPU is idle, the port is free —
   not when the command returned without complaint.

**What good looks like.** Every process you acted on identified by PID with evidence, never by a
guess at its name; no signal stronger than necessary; the legitimate job left running, with the
reason written down; and a report somebody else could audit line by line.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Process Report You Can Defend',
      description: 'Investigate a Linux machine with a runaway process, a blocked port, a process that ignores SIGTERM and a legitimate backup; identify each by evidence, act with the least force that works, verify, and justify every action in a report.',
      instructions: `**Where to do this.** Your own Linux machine, WSL on Windows, a virtual machine, or a lab machine
you are allowed to use — never a shared server. Everything runs as your own user; \`sudo\` is not
needed.

**The scenario**

Ideally a classmate runs this setup script on your machine without telling you what it starts. If
you must run it yourself, run it, close that terminal, and investigate from a new one as though you
had not read it.

    #!/bin/bash
    # setup.sh: creates the situation to investigate
    yes > /dev/null &
    python3 -m http.server 8000 > /dev/null 2>&1 &
    bash -c 'trap "" TERM; while true; do sleep 5; done' &
    bash -c 'for i in $(seq 1 900); do date >> "$HOME/nightly-backup.log"; sleep 1; done' &
    echo "Started. Investigate from another terminal."

Then the complaint arrives: "The machine is sluggish, my app cannot start on port 8000, and there is
a process I tried to stop that will not go away. The nightly backup is running too, and it must
finish."

**Requirements**

1. **Before snapshot.** Before changing anything, save the output of
   \`ps aux --sort=-%cpu | head -15\` and \`uptime\`.
2. **The CPU problem.** Identify the process responsible and record its PID, parent PID, user,
   elapsed time and full command, for example with
   \`ps -o pid,ppid,user,etime,%cpu,%mem,stat,cmd -p PID\`.
3. **The port problem.** Identify the process listening on port 8000 with \`ss -ltnp\` or
   \`lsof -i :8000\`, and record the evidence.
4. **The stubborn process.** Identify it and demonstrate that it ignores SIGTERM: send
   \`kill PID\`, wait a few seconds, and show with \`ps -p PID\` that it is still running.
5. **The backup.** Identify it and show evidence that it is doing real work, such as
   \`nightly-backup.log\` still growing between two checks.
6. **Decide before acting.** For every process you intend to stop, write down first what it is,
   what stopping it loses and which signal you will send. Send SIGTERM before SIGKILL, and use
   SIGKILL only where SIGTERM has demonstrably failed.
7. **Act by PID.** If you use \`pkill\` or \`killall\` at all, first show what \`pgrep -a\` matches for
   the same pattern, and explain why nothing else could be caught.
8. **Leave the backup alone**, and explain what you would do if it were the process slowing the
   machine down — for example lowering its priority with \`renice\` instead of stopping it.
9. **After snapshot and verification.** Show that the load has fallen, that port 8000 is free (start
   \`python3 -m http.server 8000\` yourself, then stop it with Ctrl+C), and that the backup is still
   writing.

**What to submit**

1. A **process report**: a table with one row per process investigated, giving the PID, command,
   evidence, decision, signal sent (or none) and how the result was verified.
2. A **command log** of every command you ran with its output, in order. The \`script\` command
   records a terminal session for you: run \`script investigation.log\`, work as normal, then type
   \`exit\` to stop recording.
3. The before and after snapshots.
4. A short explanation (250-350 words): the difference between SIGINT, SIGTERM, SIGKILL and SIGSTOP;
   why SIGKILL cannot be caught or ignored and what that costs the process; why acting by PID is
   safer than acting by name; and what you would check differently on a server where other people's
   processes were running.`,
      rubric: [
        { criterion: 'Evidence and identification', description: 'The CPU hog, the port holder, the SIGTERM-ignoring process and the backup are each identified by PID with recorded evidence: parent, user, elapsed time, command, and port or file activity.', maxPoints: 30 },
        { criterion: 'Justified, least-force action', description: 'Decisions written before acting; SIGTERM before SIGKILL, with SIGKILL used only after a demonstrated failure; action by PID; the backup deliberately left running.', maxPoints: 25 },
        { criterion: 'Verification', description: 'Before and after snapshots show the load fall, the port is shown to be free by binding to it, and the backup is shown still writing.', maxPoints: 15 },
        { criterion: 'Process report and command log', description: 'Report table complete for every process investigated; command log complete and in order, with real output.', maxPoints: 15 },
        { criterion: 'Explanation', description: 'Accurately distinguishes SIGINT, SIGTERM, SIGKILL and SIGSTOP, explains why SIGKILL cannot be handled and what is lost, and gives concrete extra checks for a shared server.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── T_PSEUDOCODE_MINI_PROJECT ───────────────────────────────────────────────────────── */
  {
    unitCode: 'T_PSEUDOCODE_MINI_PROJECT',
    notes: `Design an algorithm for a real process, precisely enough that somebody else can carry it out
by hand without asking you a single question. Then prove it — including against the case that
breaks your first draft, because there will be one.

**Why this is a project.** Every pseudocode unit so far asked for a short fragment: the largest of a
list, a pass-or-fail check, a plan you dry-ran yourself. A fragment can lean on what its author
knows. A complete design handed to another person cannot, and that handover is what pseudocode is
for. The gaps you cannot see in your own plan appear the moment somebody else follows it literally.

**How to work:**

1. **Restate the rules** in your own words, and list the inputs, the output, and the operations the
   person carrying out the plan is allowed to use.
2. **List the edge cases before writing any steps**, and decide what should happen in each.
3. **Draw a flowchart for the overall shape** — the main decisions and the loop — then write the
   detail in pseudocode.
4. **Keep your first draft.** Dry-run it against the test cases, find the case it gets wrong, and
   fix that in a second draft. The broken draft and the reason it broke are part of the evidence.
5. **Hand it over.** Somebody else carries out your plan on cases you did not show them, noting
   every place they hesitated. Each hesitation marks a step that was not yet precise.

**What good looks like.** Every step is something a person can carry out; every boundary uses the
rule's own words, such as "on or before"; the dry-run tables show every variable changing; and the
revision after the handover fixed the plan rather than explaining it away.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — An Algorithm Somebody Else Can Follow',
      description: 'Specify the college library\'s late-return fine as pseudocode and a flowchart, prove it with dry runs including the case that broke the first draft, and revise it after another learner has executed it by hand.',
      instructions: `**The process: the library late-return fine**

The college library wants its fine calculation written as an algorithm, so that every member of the
counter staff calculates it the same way and a developer can later build it exactly. The rules, as
the librarian wrote them:

- A book is issued for 14 days. The due date is the issue date plus 14 days.
- A book returned on or before its due date has no fine.
- For a late book, count the late days: every day after the due date, up to and including the
  return date, **except Sundays and the library holidays listed on the notice board**, which are
  not counted.
- The first 7 counted late days cost Rs 2 each. Every counted late day after the seventh costs
  Rs 5.
- The fine is never more than the price of the book.
- A lost book is charged the price of the book plus a Rs 100 processing fee, and no late-day fine
  is added.

**Operations the person carrying out your plan may use:** add a number of days to a date; say
whether two dates are the same, or which is earlier; say which day of the week a date falls on;
check whether a date appears in a given list of holidays; and ordinary arithmetic and comparison.

**Requirements**

1. **Restatement.** The rules in your own words; the inputs and their form; the output; and every
   assumption you make. The rules contain at least one ambiguity — for example, whether anything
   changes when the due date itself is a Sunday. Find the ambiguities, choose a reading for each,
   and state it.
2. **Edge cases**, listed before the plan is written, each with its intended result.
3. **Flowchart** of the top-level structure, with the branches of every decision labelled.
4. **Pseudocode** in the conventions from this topic: capitals for keywords, indented blocks, and
   END IF, END WHILE or END FOR closing them. Use only the permitted operations.
5. **Draft 1 and the final draft.** Keep draft 1 unchanged. Show the test case draft 1 gets wrong, a
   dry-run table demonstrating the wrong result, and the change that fixed it.
6. **Dry runs of the final draft**, each a trace table with a column per variable and a row per
   step, for at least these cases, using real dates with the day of the week noted:
   - returned three days before the due date;
   - returned on the due date;
   - returned on the day after the due date, which is a Monday;
   - exactly 7 counted late days;
   - exactly 8 counted late days;
   - a late period that includes both a Sunday and a library holiday;
   - a fine that would exceed the book's price;
   - a lost book.
7. **Handover test.** Give the final pseudocode alone — not the flowchart, not your explanations —
   to another learner, together with two cases you have not shown them. They carry it out by hand
   and record their answers and every point where they had to guess. Compare their answers with
   yours, revise the plan to remove each guess, and keep their notes.

**What to submit**

1. The restatement, assumptions and edge-case list.
2. The flowchart.
3. Draft 1, the case that broke it with its dry-run table, and the final draft.
4. The eight dry-run tables for the final draft.
5. The handover notes, unedited, and the list of changes they caused.
6. A short reflection (150-250 words): which rule was hardest to express precisely, and why.`,
      rubric: [
        { criterion: 'Precision and executability', description: 'Every step can be carried out using only the permitted operations; boundaries use the rule\'s exact wording; the pseudocode follows the topic conventions and matches the flowchart.', maxPoints: 25 },
        { criterion: 'Edge cases, ambiguities and boundaries', description: 'Ambiguities found and resolved explicitly; the edge-case list written before the plan covers early, on-time, 7 and 8 counted days, Sundays, holidays, the cap and lost books.', maxPoints: 20 },
        { criterion: 'Dry-run evidence', description: 'All eight trace tables complete and correct, with real dates and weekdays, every variable shown changing.', maxPoints: 20 },
        { criterion: 'Draft history', description: 'Draft 1 preserved; the breaking case demonstrated with a dry run; the fix addresses the cause rather than the single case.', maxPoints: 15 },
        { criterion: 'Handover test and revision', description: 'Another learner\'s unedited notes included; each guess they had to make is traced to a specific revision of the plan.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
  },

  /* ── T_NUMBER_SYSTEMS_DEBUGGING ──────────────────────────────────────────────────────── */
  {
    unitCode: 'T_NUMBER_SYSTEMS_DEBUGGING',
    notes: `A number that comes out wrong with no error message is often not a calculation mistake.
The arithmetic was done correctly on the bits that were stored — and the bits did not mean what
the programmer assumed. So ask how the value is stored before asking how it was computed.

**The four questions, in order:**

1. **How many bits hold it?** Every fixed width has a largest value, and going past it raises no
   error.
2. **Signed or unsigned?** The same bits read two ways are two different numbers.
3. **Can binary hold it exactly?** Most decimal fractions cannot.
4. **Which unit?** Bits or bytes; 1000 or 1024.

**Symptom: a count that suddenly goes negative, or back to zero.** Fixed-width integers wrap. An
unsigned 8-bit value holds 0 to 255, so 250 + 10 stores 4, which is 260 − 256. A signed 16-bit
value holds −32,768 to 32,767, and 32,767 + 1 becomes −32,768: \`0111 1111 1111 1111\` plus one is
\`1000 0000 0000 0000\`, and in two's complement a leading 1 means negative. Python's own integers
never overflow, but values held in C, Java, NumPy arrays, database columns and file formats do.

**Symptom: a small negative reading shows as a large positive one.** A sensor sends the byte
\`0xF6\`. Read as unsigned it is 246; read as signed 8-bit two's complement it is 246 − 256 = −10.
Nothing is corrupted — the reading code chose the wrong interpretation. In Python,
\`int.from_bytes(bytes([0xF6]), "big", signed=True)\` gives −10.

**Symptom: a total that is off by a tiny fraction.** \`0.1 + 0.2\` is \`0.30000000000000004\`, so
\`0.1 + 0.2 == 0.3\` is False. In binary, 0.1 repeats forever, like 1/3 in decimal, and 64 bits
store the nearest value they can. Compare floats with \`math.isclose\`, never \`==\`, and keep money
as whole paise in integers, or use \`decimal.Decimal\`.

**Symptom: the wrong colour.** A colour code is three bytes — red, green, blue — each written as
exactly two hex digits. \`f"#{r:x}{g:x}{b:x}"\` for (255, 8, 0) gives \`#ff80\`: the 8 lost its
leading zero, and a four-digit code means something else entirely. \`{g:02x}\` pads it to \`08\`,
giving \`#ff0800\`.

**Symptom: a 100 Mbps connection that downloads at 12 MB/s.** Nothing is wrong. Line speeds are
quoted in bits and file sizes in bytes, and 100 ÷ 8 = 12.5. Likewise a 1 TB drive of 10^12 bytes
shows as about 931 GB where the operating system counts in powers of 1024.

**Confirm by writing the bits.** Once you suspect a representation fault, write the value in binary
or hex at the width actually used. The wrong answer should follow by hand; if it does not, the
fault is somewhere else.`,
    mcqs: [
      mcq('A brightness value is held in an unsigned 8-bit variable. It is at 250, a button adds 10, and the screen then shows brightness 4. Why?',
        [['260 does not fit in 8 bits, so it wraps round to 260 − 256', true],
          ['The button handler subtracted where it should have added', false],
          ['Brightness is stored as a percentage, which cannot pass 100', false],
          ['Adding 10 in binary shifts the value four places to the right', false]],
        'An unsigned byte holds 0 to 255. The ninth bit of 260 has nowhere to go, which leaves 4, and no error is raised.'),
      mcq('A billing script adds 0.1 three times, and the check `total == 0.3` fails although the total prints as almost exactly 0.3. What is the cause?',
        [['0.1 has no exact binary form, so the stored sum is slightly off', true],
          ['Python rounds every float to one decimal place when adding', false],
          ['== cannot be used on floats, and always returns False for them', false],
          ['The total was stored as an integer and has lost its fraction', false]],
        'Like 1/3 in decimal, 0.1 repeats forever in binary. Compare with math.isclose, or keep money as whole paise.'),
      mcq('A temperature sensor sends the byte 0xFB, and the dashboard shows 251 °C on a winter night. What most likely happened?',
        [['The byte is signed, meaning −5, but was read as unsigned', true],
          ['The sensor sent the value in hex, and hex overstates it', false],
          ['The dashboard added 256 to correct for a negative reading', false],
          ['0xFB is an error code, and 251 is its position in a table', false]],
        'Read as signed two\'s complement, 0xFB is 251 − 256 = −5. The bits are the same; only the interpretation chosen by the reading code differs.'),
      mcq('A laptop advertised with a 512 GB SSD shows about 476 GB of capacity in its operating system. What explains the difference?',
        [['The maker counts 10^9 bytes per GB; the OS counts 2^30', true],
          ['36 GB is taken up by the operating system\'s own files', false],
          ['Storage is quoted in bits, and the OS reports it in bytes', false],
          ['Every file is rounded up to a whole gigabyte on the disk', false]],
        '512,000,000,000 divided by 1,073,741,824 is about 476.8. Both figures describe the same drive in different units.'),
    ],
    checkpoint: [
      mcq('A signed 32-bit counter holds 2,147,483,647 and is incremented once. What does it hold now?',
        [['−2,147,483,648', true],
          ['2,147,483,648', false],
          ['0', false],
          ['An error value that stops the program', false]],
        'That is the largest signed 32-bit value. Adding one sets only the sign bit, which two\'s complement reads as the most negative value.'),
      mcq('An internet plan is sold as 50 Mbps. What is the fastest download speed a file manager can show, in megabytes per second?',
        [['About 6.25 MB/s', true],
          ['About 50 MB/s', false],
          ['About 400 MB/s', false],
          ['About 5 MB/s', false]],
        'Line speeds are quoted in bits and file sizes in bytes, so 50 megabits divided by 8 bits per byte is 6.25 megabytes.'),
      mcq('Code builds a colour as `f"#{r:x}{g:x}{b:x}"`. For red 255, green 8 and blue 0 the colour comes out wrong. Why?',
        [['8 is written as one hex digit, not 08, so the code is too short', true],
          ['255 is too large for a colour, and must be reduced to 99', false],
          ['Hex colour codes must be in upper case to be understood', false],
          ['The three values must be written in the order b, g and r', false]],
        'Each channel needs exactly two digits. Formatting with :02x gives #ff0800, where the unpadded version gives #ff80.'),
    ],
  },

  /* ── T_BOOLEAN_MINI_PROJECT ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_BOOLEAN_MINI_PROJECT',
    notes: `Take one real control rule, written in ordinary words, and carry it all the way to a circuit
and a tested function: truth table, expression, simplification, gate diagram, code. Each
representation is checked against the one before it, so a mistake cannot travel quietly from one
step to the next.

**Why this is a project.** The Boolean units taught each representation on its own — a truth table
here, a simplification there, a gate diagram somewhere else — and each exercise started from a
clean expression. Real rules do not arrive as expressions. They arrive as sentences with an
"except" in the middle and a combination nobody mentioned. Turning the sentence into a table is
where the real decisions are made, and carrying one problem through every representation is where
you find out whether the equivalences you learned actually hold.

**How to work:**

1. **Name every input and say what 1 means for it.** "F is 1 when the tank is full." Getting a
   polarity backwards inverts half the table.
2. **Fill the truth table from the words, row by row**, in binary counting order. For each row,
   point to the part of the rule that decides it. Where the words do not decide, write down the
   ambiguity and the reading you chose.
3. **Write the expression the table gives you** before simplifying anything.
4. **Simplify one step at a time, naming the law** at every step.
5. **Check the simplified expression against the table** on every row. Then draw the gates from the
   checked expression, and write the function from the diagram.
6. **Test the function against the table typed in as data**, not against the expression — otherwise
   you are only checking the expression against itself.

**What good looks like.** A table whose every row can be traced to the rule; a simplification in
which every step names its law; a gate diagram with no redundant gates; a test that fails loudly if
any row disagrees; and a clear account of the ambiguities you resolved.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — From a Rule to a Circuit',
      description: 'Carry a hostel water-pump control rule from words to a 16-row truth table, a simplified expression with named laws, a gate diagram and a Python function tested against the table, then apply a change request through every step.',
      instructions: `**The rule**

A hostel pumps water from an underground sump to an overhead tank. The warden's rule for the pump
controller, exactly as written:

> The pump must never run when the sump is dry, because running dry burns out the motor. Otherwise
> it runs automatically whenever the overhead tank is not full — except during a power cut, when the
> hostel is on the generator and the pump runs only if the warden has turned the manual switch on.
> The manual switch also runs the pump when the tank is full, so that the tank can be flushed.

The controller has four inputs:

- **S** — 1 when the sump has water
- **F** — 1 when the overhead tank is full
- **M** — 1 when the warden's manual switch is on
- **C** — 1 during a power cut

and one output, **P**, which is 1 when the pump runs.

**Requirements**

1. **Truth table.** All 16 rows in binary counting order, with S as the most significant bit (S, F,
   M, C running from 0000 to 1111). For every row where P is 1, name the part of the rule that
   makes it so.
2. **Ambiguities.** List every combination the wording does not clearly decide, the reading you
   chose, and why.
3. **Unsimplified expression.** Write P as a sum of products taken directly from the rows where P
   is 1.
4. **Simplification.** Reduce it one step at a time, naming the law used at each step —
   distributive, complement, identity, absorption, De Morgan and so on.
5. **Verification.** Add a column to the truth table for the simplified expression, and show that
   it agrees with P on all 16 rows.
6. **Gate diagram.** Draw the simplified expression with AND, OR and NOT gates (NAND and NOR are
   allowed), labelling every wire. State how many gates it uses and how many the unsimplified
   expression would have needed.
7. **Tested function.** Write a Python function \`pump(s, f, m, c)\` that returns 1 or 0,
   implemented from your gate diagram. Test it against the truth table typed in as data, in this
   shape:

        TABLE = [
            # s, f, m, c, expected
            (0, 0, 0, 0, 0),
            # ... all 16 rows, copied from your truth table
        ]
        for s, f, m, c, expected in TABLE:
            assert pump(s, f, m, c) == expected, (s, f, m, c)
        print("All 16 rows agree")

   Then change one row of \`TABLE\` to a wrong value, and show that the test fails.
8. **Change request.** The warden adds: "During a power cut, never run the pump if the tank is full,
   even on manual." Update the truth table, the expression, the simplification, the gate diagram and
   the function, and show exactly which rows and gates changed.

**What to submit**

1. The truth table, with the rule references and the verification column, and the ambiguity list.
2. The unsimplified expression and the simplification steps with their named laws.
3. The gate diagram, hand-drawn and photographed or drawn with any tool, with both gate counts.
4. The Python file, and the output of both test runs: passing, and failing with the altered row.
5. The change request worked through every step, with a short note (100-200 words) on which step
   the change was easiest to make in, and which step would have been most dangerous to skip.`,
      rubric: [
        { criterion: 'Truth table and interpretation', description: 'All 16 rows correct in binary counting order, each 1 traced to the wording, and every ambiguity identified with a justified reading.', maxPoints: 25 },
        { criterion: 'Simplification with named laws', description: 'Sum of products taken correctly from the table; every simplification step valid and named; the result is minimal or close to it.', maxPoints: 20 },
        { criterion: 'Verification against the table', description: 'A verification column shows the simplified expression agreeing with the table on all 16 rows.', maxPoints: 15 },
        { criterion: 'Gate diagram', description: 'Diagram implements the verified expression with labelled wires and no redundant gates; both gate counts are correct.', maxPoints: 15 },
        { criterion: 'Tested function and change request', description: 'Function built from the diagram and tested against the table as data, with a demonstrated failing run; the change request carried correctly through every representation.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
  },

  /* ── T_DECOMPOSITION_MINI_PROJECT ────────────────────────────────────────────────────── */
  {
    unitCode: 'T_DECOMPOSITION_MINI_PROJECT',
    notes: `Some problems are too big to start coding, and the temptation is to start anyway. This
project is the opposite discipline: take one such problem, break it into parts small enough to
build and check on their own, find what repeats, decide what to ignore, name every edge case, and
produce a plan that another learner could build from without you in the room.

**Why this is a project.** The decomposition units practised each step on small problems. On a
small problem you can hold everything in your head, so the steps feel optional. On a problem with
several kinds of input, rules that interact, and outputs for different people, they stop being
optional: skip them and the hard case turns up after half the code is written. Nothing between the
practice unit and the capstone asks you to decompose at a size where it matters.

**How to work:**

1. **Understand the problem before splitting it.** Restate it, describe every input and output with
   an example, and write down the questions you would ask the people who set it.
2. **Break it down in levels.** Split the whole into a handful of parts, then split each part until
   every piece can be described in two or three sentences with a clear input and output.
3. **Look for what repeats.** If the same work happens for every hall or every subject, it is one
   part used many times, not many parts.
4. **Decide what to leave out**, and say why. A plan that models everything is never built.
5. **Hunt the edge cases part by part**, and give each one a decided behaviour, not a question
   mark.
6. **Order the build** so that each part can be checked before anything depends on it.
7. **Hand it over**, and fix whatever the reader could not follow.

**What good looks like.** A decomposition tree whose leaves are genuinely buildable; parts that
connect only through stated inputs and outputs; an edge-case list that includes the cases where the
rules cannot all be satisfied at once; and a revision that shows somebody else's reading improved
the plan.

The brief, requirements and rubric are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Plan the Exam Seating Before Anyone Builds It',
      description: 'Decompose an exam-seating problem into buildable parts with stated inputs and outputs, identify patterns and abstractions, decide the behaviour for every edge case, order the build with checks, and revise the plan after another learner has read it.',
      instructions: `**The problem: exam seating**

The examination cell seats students for end-semester exams, and does it by hand every term. They
want a program. You are not writing it: you are producing the plan that somebody else will build
from.

What the cell has told you:

- There are several exam halls. Each hall has benches in rows and columns, one student per bench,
  and some benches are marked unusable. Halls A and B are on the ground floor.
- For each exam session — a date and a time slot — there is a list of students, each with a roll
  number, name, department and the subject code they are writing. Several subjects are written in
  the same session.
- Two students writing the same subject must not sit next to each other: not to the left, right,
  front or back. Diagonal neighbours are allowed.
- Students who have registered a mobility need must be seated on the ground floor.
- For each session the cell needs a seating chart for each hall; a list in roll-number order giving
  each student's hall and bench, for the notice board; a sheet for each hall's door listing the roll
  numbers seated inside; and a list of any student who could not be seated, with the reason.

**Requirements**

1. **Understanding.** Restate the problem in your own words. Describe every input and output with a
   small concrete example of its format. List at least five questions you would ask the examination
   cell, and for each the assumption you will work with until it is answered.
2. **Decomposition tree.** Break the problem down through at least three levels. Every leaf must be
   a part that could be built and checked on its own in a single sitting.
3. **Part descriptions.** For every leaf: its name, what it does in two or three sentences, exactly
   what it receives and what it produces, and which other parts it depends on.
4. **Patterns.** Identify the work that repeats — per hall, per session, per subject, per output —
   and show how your tree builds each piece once and reuses it.
5. **Abstraction.** List what the plan deliberately ignores, such as invigilators or the physical
   shape of a room beyond rows and columns, and why each can be ignored in this version.
6. **Edge cases.** At least ten, each with the behaviour you have decided on. They must include:
   more students than usable benches; a session in which one subject has so many students that the
   neighbour rule cannot be satisfied; more students with a mobility need than ground-floor benches;
   a student listed twice in the same session; and a hall with no usable benches.
7. **Build order and checks.** The order in which the parts should be built, and for each part a
   small test — an input and its expected output — that proves it works before anything depends on
   it.
8. **Handover test.** Give the plan to another learner. Without your help, they write down, for
   three parts of your choosing, what they would build and how they would check it, and they list
   every point where they had to guess. Revise the plan to remove each guess.

**What to submit**

1. The plan: understanding, decomposition tree, part descriptions, patterns, abstraction, edge cases,
   and build order with checks.
2. The handover notes, unedited, and a list of what you changed because of them.
3. A short reflection (150-250 words): which edge case most changed your decomposition, and what
   would have happened had you found it only while coding.`,
      rubric: [
        { criterion: 'Understanding and questions', description: 'Accurate restatement; every input and output shown with a concrete format example; at least five pertinent questions, each with a working assumption.', maxPoints: 15 },
        { criterion: 'Decomposition and part descriptions', description: 'At least three levels; every leaf independently buildable, with a clear purpose, stated inputs and outputs, and explicit dependencies.', maxPoints: 25 },
        { criterion: 'Patterns and abstraction', description: 'Repeated work identified and built once; ignored details listed with sound reasons that do not remove anything the cell asked for.', maxPoints: 15 },
        { criterion: 'Edge cases', description: 'At least ten, including the five required, each with a decided and consistent behaviour, including what is reported when the rules cannot all be met.', maxPoints: 25 },
        { criterion: 'Build order, checks and handover', description: 'A build order in which each part is tested before use, with a concrete check per part; handover notes included and each guess traced to a revision.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
  },
];
