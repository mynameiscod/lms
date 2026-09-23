/**
 * T2_BRIDGE, T2_PROJECTS and T2_VERIFICATION — eighteen units. Year 2.
 *
 * ── THE THREE ENDS OF THE YEAR ────────────────────────────────────────────────────────────
 *
 * T2_BRIDGE is the first week: five measurements and a review. Nothing here teaches, because the
 * point is to find out what is actually in place rather than to assume it. A student arriving from
 * somewhere other than our Year 1 meets exactly the same checks.
 *
 * T2_PROJECTS is where the year is spent rather than learned: five substantial builds, each in a
 * different working situation — from a plan, inside somebody else's code, across two systems, on
 * your own idea, and with another person.
 *
 * T2_VERIFICATION is the end: three assessments, a portfolio review and the capstone. It proves the
 * year rather than summarising it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BACKBONE_BUNDLES: PilotBundle[] = [
  /* ── T2_BRIDGE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_BRIDGE_PROGRAMMING_CHECK',
    notes: `This is a measurement, not a lesson. Nothing here is new, and the result decides what the
rest of your year looks like.

**Why it exists.** Year 2 assumes you can write a loop without thinking about it. If that assumption
is wrong, every later topic is harder than it needs to be — not because you are behind, but because
you are carrying two problems at once. Finding that out in week one is enormously cheaper than
finding it out in week nine.

**What is being checked:** variables and types, conditions including the awkward combinations, loops
including nested ones, and knowing what your code will print before you run it.

**The honest way to take it.** Do not look things up. Do not use an assistant. A flattering result
here buys you a harder year; there is no examiner to impress and no pass mark to clear.

**The kind of thing you will be asked:**

    total = 0
    for i in range(1, 6):
        if i % 2 == 0:
            total += i
    # what is total, without running it?

    items = [3, 7, 2, 9]
    largest = items[0]
    for item in items:
        if item > largest:
            largest = item
    # and what if items is empty?

**That last question is the real one.** Knowing the loop finds the largest is Year 1. Noticing that
\`items[0]\` raises on an empty list is the beginning of Year 2.

**If it goes badly**, nothing bad happens. The engine gives you more practice in what you did not
show, and you carry on. The only harmful outcome is a result that says you are fluent when you are
not.

**One habit worth taking from this unit:** predicting output before running code. It is the fastest
way to find out whether you understand what you wrote, and it stays useful for the rest of your
career.`,
    mcqs: [
      mcq('The purpose of this check is to:',
        [['Measure what is in place, so the year can adapt', true],
          ['Decide whether you may continue to Year 2', false],
          ['Revise the Year-1 material before starting', false],
          ['Compare you against the rest of the cohort', false]],
        'Finding a gap in week one is far cheaper than finding it in week nine.'),
      mcq('Using an assistant during this check:',
        [['Buys you a harder year, since the result decides your path', true],
          ['Is allowed, as the check is not graded', false],
          ['Makes the measurement more accurate', false],
          ['Is expected for the harder questions', false]],
        'There is no examiner to impress and no pass mark to clear.'),
      mcq('`largest = items[0]` on an empty list will:',
        [['Raise an error', true],
          ['Return None', false],
          ['Return zero', false],
          ['Skip the loop silently', false]],
        'Noticing that is where Year 2 begins.'),
      mcq('Predicting output before running code is valuable because:',
        [['It reveals whether you understand what you wrote', true],
          ['It is faster than running the program', false],
          ['It catches syntax errors early', false],
          ['It is required in technical interviews', false]],
        'A habit worth keeping for the rest of your career.'),
    ],
    checkpoint: [
      mcq('A poor result on this check leads to:',
        [['More practice in what you did not show', true],
          ['Repeating the first year of the course', false],
          ['A delayed start to the Year-2 topics', false],
          ['A record on your portfolio', false]],
        'The only harmful outcome is a flattering result.'),
      mcq('Year 2 assumes loops and conditions are automatic because:',
        [['Otherwise every later topic carries two problems at once', true],
          ['The topics do not revisit them at all', false],
          ['Assessments are timed from the very first week', false],
          ['The tracks require a fixed pace', false]],
        'Not being behind — carrying an extra load through everything else.'),
    ],
  },

  {
    unitCode: 'T2_BRIDGE_FUNCTIONS_AND_DATA_CHECK',
    notes: `The second measurement: functions, lists, dictionaries and strings — the four things
almost every Year-2 exercise is made of.

**What is being checked**, in the form of small problems rather than questions about definitions:

- Writing a function with parameters and a return value, and knowing the difference between
  returning and printing
- Iterating a list, building a new one, filtering one
- Looking things up in a dictionary, counting with one, iterating its pairs
- Splitting, joining, slicing and searching strings
- Combining all four in one small problem

**The kind of problem:**

    def count_words(text):
        """Return a dictionary mapping each word to how many times it appears."""

    def initials(full_name):
        """'asha rao kumar' -> 'A.R.K.'"""

    def top_scorers(scores, threshold):
        """scores is {name: score}. Return the names above threshold, alphabetically."""

Each is four or five lines when the fundamentals are fluent, and a twenty-minute struggle when they
are not. That difference is exactly what is being measured.

**The distinctions that separate a fluent answer from a hesitant one:**

- \`return\` against \`print\` — a function that prints cannot be used by other code
- Modifying a list while looping over it, which skips elements
- \`dict.get(key, default)\` against \`dict[key]\`, which raises
- Strings being immutable, so \`.replace()\` returns a new one rather than changing it

**Edge cases count here.** An empty list, an empty string, a word appearing once, a dictionary with
nothing above the threshold. A function that works only on the example given is not finished, and
Year 2 will say so repeatedly.

**Take it without help**, for the same reason as the last unit: the result is for you, and the year
adapts to it.`,
    mcqs: [
      mcq('A function that prints its result rather than returning it:',
        [['Cannot be used by other code', true],
          ['Is slower but otherwise equivalent', false],
          ['Works only inside a loop', false],
          ['Returns None, which is usually intended', false]],
        'One of the distinctions that separates a fluent answer from a hesitant one.'),
      mcq('Modifying a list while looping over it typically:',
        [['Skips elements', true],
          ['Raises an error immediately', false],
          ['Duplicates the remaining items', false],
          ['Works correctly but slowly', false]],
        'Build a new list instead, or iterate over a copy.'),
      mcq('`dict.get(key, 0)` differs from `dict[key]` in that it:',
        [['Returns the default instead of raising', true],
          ['Adds the key with that value', false],
          ['Searches values as well as keys', false],
          ['Is faster for missing keys', false]],
        'Counting with a dictionary is where this matters most.'),
      mcq('`text.replace("a", "b")` on a string:',
        [['Returns a new string, leaving the original unchanged', true],
          ['Changes the string in place', false],
          ['Raises if the character is absent', false],
          ['Replaces only the first occurrence', false]],
        'Strings are immutable, which surprises people coming from lists.'),
    ],
    checkpoint: [
      mcq('These problems take four lines when fluent and twenty minutes when not, which is:',
        [['Exactly the difference being measured', true],
          ['A sign the problems are badly worded', false],
          ['Expected for anybody new to Python', false],
          ['Corrected by allowing more time', false]],
        'Fluency, not knowledge, is what Year 2 assumes.'),
      mcq('A function that works only on the example given is:',
        [['Not finished, since the edge cases decide correctness', true],
          ['Acceptable for a measurement exercise', false],
          ['Correct, provided the example is representative', false],
          ['A reasonable first version to submit', false]],
        'Empty inputs and single elements are checked here and throughout the year.'),
    ],
  },

  {
    unitCode: 'T2_BRIDGE_PROBLEM_SOLVING_CHECK',
    notes: `The third measurement, and the one that predicts Year 2 best: taking an unfamiliar problem
apart before writing any code.

**Why it predicts more than syntax.** Syntax gaps close in a fortnight. The habit of reading a
problem, restating it, finding the cases and choosing an approach is what the whole year is built on,
and it takes longer to build.

**What is being checked:**

1. **Restating the problem** in your own words, precisely enough to argue with
2. **Finding the inputs and outputs**, including the shapes nobody mentioned
3. **Listing the cases** — normal, empty, one, many, invalid
4. **Choosing an approach** and saying why
5. **Writing the steps** before the code
6. **Only then**, writing it

**A problem of the kind you will meet:**

    A shop wants to know its best day. Given a list of sales, each with a date and an amount,
    return the date with the highest total. If two days tie, return the earlier one.

Before any code, that description raises real questions: what if the list is empty? Can an amount be
negative — a refund? Is the date a string or a date object? Does "earlier" mean by date or by first
appearance? **Noticing the tie rule and the empty case is the measurement.**

**The steps, written out:**

    1. If the list is empty, return nothing (decide what "nothing" is)
    2. Total the amounts per date, in a dictionary
    3. Find the highest total
    4. Among the dates with that total, take the earliest
    5. Return it

Somebody else could code that. That is the standard.

**What is not being checked:** whether you get the fastest possible solution, or whether you finish.
A clear breakdown with unfinished code scores better than working code with no thinking visible,
because the breakdown is the transferable part.

**Say your thinking out loud, in writing.** Year 2 asks for this constantly — in reviews, in
interviews, in the projects — and this check is the first time it is measured.`,
    mcqs: [
      mcq('Problem breakdown predicts Year-2 performance better than syntax because:',
        [['Syntax gaps close in a fortnight; the habit takes longer', true],
          ['Syntax is not used in the later topics', false],
          ['Breakdown is assessed more often', false],
          ['Most problems are solved without code', false]],
        'It is what the whole year is built on.'),
      mcq('In the best-day problem, the measurement is whether you notice:',
        [['The tie rule and the empty case', true],
          ['That a dictionary is the right structure', false],
          ['That dates need parsing', false],
          ['That the list should be sorted first', false]],
        'The questions the description raises are the exercise.'),
      mcq('A clear breakdown with unfinished code scores better than working code with no thinking because:',
        [['The breakdown is the transferable part', true],
          ['Completed code is not assessed here', false],
          ['Unfinished code shows more honesty', false],
          ['Working code may have been copied', false]],
        'Speed of a solution is not what this unit measures.'),
      mcq('"Somebody else could code that" is the standard for:',
        [['The written steps, before any code is written', true],
          ['The final submitted solution', false],
          ['The list of edge cases', false],
          ['The restatement of the problem', false]],
        'If they could not, the steps are not specific enough yet.'),
    ],
    checkpoint: [
      mcq('Restating a problem in your own words is useful because:',
        [['It makes the ambiguities visible enough to argue with', true],
          ['It demonstrates comprehension to an assessor', false],
          ['It is faster than reading it twice', false],
          ['It produces the variable names you will need', false]],
        'Every ambiguity found before coding is an hour not lost afterwards.'),
      mcq('Writing your thinking out in words is asked for throughout Year 2 in:',
        [['Reviews, interviews and project defences', true],
          ['The practice units only', false],
          ['The written assessments only', false],
          ['The direction track that you end up choosing', false]],
        'This check is the first time it is measured.'),
    ],
  },

  {
    unitCode: 'T2_BRIDGE_TOOLING_CHECK',
    notes: `The fourth measurement: the tools you will use every day for the rest of the year and the
rest of your career.

**Why it is measured separately.** A student who can program but stops every ten minutes to look up
a Git command loses hours a week. Tooling fluency is invisible until you watch somebody who has it
work beside somebody who does not.

**What is being checked:**

**Git** — clone a repository, check its status, stage selectively, commit with a real message, push,
pull, create a branch, switch between branches, and read a log. Not the advanced operations; the
daily ten.

**The shell** — move around, list including hidden files, read a file, search for text in a project,
find files by name, run a program, and read an error.

**Your editor** — open a project, find a file by name, search across the whole project, jump to a
definition, use the integrated terminal, and run code without leaving the window.

**Environments** — create a virtual environment, activate it, install from a requirements file, and
know which interpreter is actually running.

**The kind of task:**

    Clone this repository. Create a branch named fix-totals. The file reports.py has a bug
    on the line that computes the average. Fix it, commit with a message explaining why,
    and push the branch. Then find every file in the project that mentions "deprecated".

No single step there is difficult. The measurement is whether the whole sequence takes four minutes
or forty.

**Be honest about what you look up.** Everybody looks things up; the question is whether it is the
rare operation or \`git commit\`. Record which ones you needed, because that list is your practice
plan.

**This is worth fixing immediately if it is weak**, because every other topic in the year runs on top
of it. A week of deliberate practice here pays back over the following eleven months.`,
    mcqs: [
      mcq('Tooling fluency is measured separately because:',
        [['Stopping to look up daily commands costs hours a week', true],
          ['Tools are assessed by employers directly', false],
          ['Programming ability does not predict it', false],
          ['Each tool requires its own certification', false]],
        'It is invisible until you watch two people work side by side.'),
      mcq('What is being checked in Git is:',
        [['The daily ten operations, not the advanced ones', true],
          ['Rebasing and cherry-picking', false],
          ['Resolving complex merge conflicts', false],
          ['Managing remotes and submodules', false]],
        'Clone, status, stage, commit, push, pull, branch, switch, log.'),
      mcq('In the sample task, the measurement is:',
        [['Whether the sequence takes four minutes or forty', true],
          ['Whether the bug is found correctly', false],
          ['Whether the commit message follows a convention', false],
          ['Whether the search uses the right tool', false]],
        'No single step is difficult; the fluency is the point.'),
      mcq('Recording which commands you had to look up gives you:',
        [['Your practice plan', true],
          ['A record for the assessor', false],
          ['A measure of the task difficulty', false],
          ['Evidence of honest working', false]],
        'Everybody looks things up; the question is which things.'),
    ],
    checkpoint: [
      mcq('Weak tooling is worth fixing immediately because:',
        [['Every other topic in the year runs on top of it', true],
          ['It is assessed again at the end of the year', false],
          ['Employers test it in interviews', false],
          ['The tracks assume advanced usage', false]],
        'A week of practice pays back over the following eleven months.'),
      mcq('Knowing which interpreter is actually running matters because:',
        [['Most "module not found" errors come from the wrong one', true],
          ['Python versions differ in syntax significantly', false],
          ['Virtual environments expire', false],
          ['The editor selects one at random', false]],
        'A machine with three Pythons explains most confusing behaviour.'),
    ],
  },

  {
    unitCode: 'T2_BRIDGE_SQL_CHECK',
    notes: `The fifth measurement: can you ask a database a question? Year 2 spends two topics on
databases and assumes this much on arrival.

**What is being checked**, against real tables with a few thousand rows:

- \`SELECT\` with specific columns rather than \`*\`
- \`WHERE\` with one condition, then several
- \`ORDER BY\`, ascending and descending
- \`LIMIT\`
- \`COUNT\`, \`SUM\` and \`AVG\` on a single table
- Reading a table description and knowing what you can ask it

**The kind of question:**

    -- The five most expensive products still in stock
    -- How many orders were placed in March
    -- The total value of all orders with status 'paid'
    -- Customers in Chennai, alphabetically

Single table, no joins. Joins are taught in Year 2; these are the ground it builds on.

**What separates a confident answer:**

- Knowing that text values need quotes and numbers do not
- \`=\` for exact matches, \`LIKE\` for patterns
- \`ORDER BY column DESC\` for largest first
- That \`COUNT(*)\` counts rows and needs no column
- Reading the column names before writing anything

**The mistake this check exposes most often** is answering a different question from the one asked —
the total value of *all* orders when the question said *paid*, or the five most expensive products
when it said still in stock. Read the question twice; the SQL is usually the easy part.

**If this is shaky, it is the fastest gap to close.** A focused afternoon on single-table queries
gets most people to fluent, and it is the only one of the five checks where that is true.

**Take it against real tables**, not examples in a document. Running a query and seeing rows come back
teaches something reading cannot.`,
    mcqs: [
      mcq('The queries in this check are restricted to:',
        [['A single table, with no joins', true],
          ['Two tables joined on a key', false],
          ['Aggregates with GROUP BY', false],
          ['Subqueries within a WHERE clause', false]],
        'Joins are taught in Year 2; this is the ground they build on.'),
      mcq('The mistake this check exposes most often is:',
        [['Answering a slightly different question from the one asked', true],
          ['Forgetting quotes around text values', false],
          ['Confusing ORDER BY with GROUP BY', false],
          ['Selecting too many columns', false]],
        'Read the question twice; the SQL is usually the easy part.'),
      mcq('`COUNT(*)` differs from other aggregates in that it:',
        [['Counts rows and needs no column', true],
          ['Ignores NULL values in every column', false],
          ['Requires an ORDER BY clause', false],
          ['Returns NULL when nothing matches', false]],
        'COUNT returns 0 for no rows, where SUM and AVG return NULL.'),
      mcq('This check is the fastest of the five gaps to close because:',
        [['A focused afternoon gets most people to fluent', true],
          ['It is worth fewer marks than the others', false],
          ['It is repeated later in the year', false],
          ['The syntax is checked automatically', false]],
        'The only one of the five where that is true.'),
    ],
    checkpoint: [
      mcq('Taking this check against real tables rather than a document:',
        [['Teaches something reading cannot', true],
          ['Is required for the result to be recorded', false],
          ['Makes the questions easier to answer', false],
          ['Tests the database connection as well', false]],
        'Running a query and seeing rows come back is the difference.'),
      mcq('Reading the column names before writing a query prevents:',
        [['Asking for something the table does not hold', true],
          ['Syntax errors inside the WHERE clause', false],
          ['Slow queries on large tables', false],
          ['Returning too many rows', false]],
        'The table description tells you what can be asked of it.'),
    ],
  },

  {
    unitCode: 'T2_BRIDGE_READINESS_REVIEW',
    notes: `The five checks are done. This unit is where you read your own results and the year is
shaped around them.

**What you now have:** evidence, from five measurements, of what is fluent and what is not. Not an
impression, and not a grade — a set of specific observations about specific skills.

**How the year uses it.** Anything you demonstrated, the engine will not spend your days
re-teaching. Anything you did not, it schedules practice for before the topics that depend on it.
That is the whole purpose of the week: your ninety or hundred and ten days are finite, and spending
them on what you already know is the most expensive mistake available.

**Read the results honestly.** The two failure modes are equally costly:

- **Dismissing a gap** — "I could have done that, I was rushing" — buys you a harder year.
- **Catastrophising one** — "I am not ready for any of this" — is contradicted by the other four
  results.

Neither is a reading of the evidence.

**Write down four things:**

1. **What is proven.** The skills you demonstrated, plainly.
2. **What is not.** The specific gaps, named as skills rather than as feelings.
3. **What worries you most**, and whether the evidence supports that worry. Often it does not, and
   noticing that is useful.
4. **What you want from the year.** A direction, an internship, a specific kind of work — it will
   shape which track you choose in a few weeks.

**On the checks that went badly:** a gap found in week one is the cheapest kind. It has cost you
nothing yet, and there are ten more months to close it. The same gap found in an interview in
October costs the interview.

**And then the year starts properly.** From here it is objects, data structures, algorithms,
testing, teams, databases, the web, security — and the projects that use all of it.`,
    mcqs: [
      mcq('The purpose of the bridge week is to:',
        [['Avoid spending finite days re-teaching what is already known', true],
          ['Decide whether a student may take Year 2', false],
          ['Rank students before the tracks are chosen', false],
          ['Revise Year 1 before the new material', false]],
        'The most expensive mistake available is teaching what is already there.'),
      mcq('Dismissing a gap as "I was rushing":',
        [['Buys you a harder year', true],
          ['Is usually an accurate reading', false],
          ['Has no effect on what is scheduled', false],
          ['Is corrected by retaking the check', false]],
        'Catastrophising is the equally costly failure in the other direction.'),
      mcq('Gaps should be written down as:',
        [['Named skills rather than feelings', true],
          ['Scores against each check', false],
          ['Topics from the Year-1 curriculum', false],
          ['A ranking of what to fix first', false]],
        '"Dictionary iteration" is actionable; "bad at data" is not.'),
      mcq('A gap found in week one rather than October is cheaper because:',
        [['It has cost nothing yet and there are ten months left', true],
          ['Early practice is more effective than later practice', false],
          ['The curriculum can still be changed', false],
          ['Assessments are weighted by date', false]],
        'The same gap found in an interview costs the interview.'),
    ],
    checkpoint: [
      mcq('What the engine does with a demonstrated skill is:',
        [['Stop scheduling days to teach it', true],
          ['Record it on the portfolio', false],
          ['Schedule it again later for confirmation', false],
          ['Use it to select your track', false]],
        'Gaps get practice scheduled before the topics that depend on them.'),
      mcq('Writing down what you want from the year matters because:',
        [['It shapes which direction track you choose', true],
          ['It is included in the readiness score', false],
          ['It determines the length of the year', false],
          ['Mentors use it to assign projects', false]],
        'The track choice comes a few weeks later, and this is its starting point.'),
    ],
  },

  /* ── T2_PROJECTS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_PROJECTS_SCOPING',
    notes: `Most unfinished projects were not abandoned. They were scoped so that finishing was never
possible.

**The rule: one sentence, one user, one outcome.**

    "A web app for students to track assignments, with group projects, reminders,
     a calendar, file attachments, a mobile app and analytics."

That is six projects. The version that ships:

    "A page where a student adds an assignment with a due date and sees what is due this week."

**Scope by what you cut, not by what you include.** Write the list of everything it could do, then
draw a line: above it, the smallest thing that is genuinely useful; below it, everything else, kept
in writing as "not in version one". That written list is what stops the idea creeping back in at
week three.

**The test for version one:** would somebody use it? If the answer is no, it is too small. If you
cannot describe it in one sentence, it is too big.

**Estimating, badly and then better.** Your first estimate will be wrong by a factor of three. The
useful correction is not to estimate better but to scope smaller: a project you think will take a
week is a month, and a project you think will take a day is a week.

**What makes a project finishable:**

- One kind of user, not three
- One core flow, working end to end
- Boring technology you already know
- No feature that requires learning something new *and* is on the critical path
- A defined "done" you wrote down before starting

**Learning something new is fine** — but put it beside the project, not underneath it. A project that
needs a new language, a new framework and a new database is a research exercise wearing a project's
name.

**Write the scope down before building.** One sentence of purpose, three to five features in version
one, an explicit not-doing list, and what "finished" means. Ten minutes, and it is the difference
between shipping and drifting.`,
    mcqs: [
      mcq('Most unfinished projects failed because:',
        [['They were scoped so finishing was never possible', true],
          ['The technology was too difficult', false],
          ['The developer lost interest partway', false],
          ['The requirements changed during the build', false]],
        'One sentence, one user, one outcome is the corrective.'),
      mcq('The written "not in version one" list exists to:',
        [['Stop the cut features creeping back at week three', true],
          ['Document the project for reviewers', false],
          ['Plan the second version', false],
          ['Justify the time estimate', false]],
        'Scope by what you cut, not by what you include.'),
      mcq('If you cannot describe version one in a sentence, it is:',
        [['Too big', true],
          ['Insufficiently documented', false],
          ['Too technical to summarise', false],
          ['Ready to start anyway', false]],
        'And if nobody would use it, it is too small.'),
      mcq('The right response to estimates being wrong by a factor of three is to:',
        [['Scope smaller, rather than estimate better', true],
          ['Add a buffer to every estimate', false],
          ['Break the work into finer tasks', false],
          ['Track actual time to improve future estimates', false]],
        'A week becomes a month; a day becomes a week.'),
    ],
    checkpoint: [
      mcq('A project needing a new language, framework and database is:',
        [['A research exercise wearing a project\'s name', true],
          ['An efficient way to learn three things', false],
          ['Appropriate for a second-year build', false],
          ['Fine if the timeline is generous', false]],
        'Learning goes beside the project, not underneath it on the critical path.'),
      mcq('"Done" should be defined:',
        [['Before starting, in writing', true],
          ['When the core features work', false],
          ['By the reviewer at submission', false],
          ['Once the deadline is reached', false]],
        'Otherwise done is whenever you get tired, which is not the same thing.'),
    ],
  },

  {
    unitCode: 'T2_PROJECTS_PLANNING',
    notes: `A plan is not a schedule. It is a list of pieces small enough to finish, in an order that
works, each with a way to tell when it is done.

**Break work down until each piece is half a day or less.** "Build the login system" is not a task;
it is a week of unclear work that will feel like no progress. Broken down:

    - Users table with email and password hash
    - Registration endpoint, with validation
    - Password hashing on save
    - Login endpoint returning a token
    - Middleware that checks the token
    - Logout
    - Tests for each endpoint, including the failures

Seven pieces, each finishable, each visibly done.

**A definition of done, per task.** Not "works" — "the endpoint returns 201 with the new id, rejects a
duplicate email with 409, and has tests for both". Without it, tasks stay 90% done indefinitely.

**Order by dependency, then by risk.** Things that block other things go first. Then the part you are
least sure about, because discovering it does not work in week one is survivable and discovering it
in week five is not.

**Build the thinnest complete path first.** One route, one page, one save, one read — end to end,
however ugly. It proves the pieces connect, and every later feature slots into something that already
works. Building the whole database layer, then the whole API, then the whole interface means nothing
runs until the end, which is when you find out what does not fit.

**Track it somewhere visible.** A board with To do, Doing and Done. Keep Doing to one item; two
things half-finished is slower than one thing finished.

**Leave slack.** Something will take three times as long — usually deployment, or the API that does
not behave as documented. A plan with no room is a plan that breaks on contact.

**Re-plan when you learn something**, and write down what changed and why. A plan that was never
revised was not being used.`,
    mcqs: [
      mcq('Tasks should be broken down until each is:',
        [['Half a day or less', true],
          ['One week of work', false],
          ['A complete feature', false],
          ['Assigned to one person', false]],
        '"Build the login system" is a week of unclear work that feels like no progress.'),
      mcq('A definition of done per task prevents:',
        [['Tasks staying 90% complete indefinitely', true],
          ['Tasks being estimated badly', false],
          ['Work being done out of order', false],
          ['Features being added mid-project', false]],
        '"Works" is not a definition; the specific behaviours are.'),
      mcq('Building the thinnest complete path first proves:',
        [['That the pieces connect, before more is built on them', true],
          ['That the design is optimal', false],
          ['That the schedule is realistic', false],
          ['That the technology is fast enough', false]],
        'Layer by layer means nothing runs until the end.'),
      mcq('The risky part should be built early because:',
        [['Discovering it fails in week one is survivable', true],
          ['It is easier while you are fresh', false],
          ['It usually blocks other work', false],
          ['Risk decreases as a project progresses', false]],
        'Discovering it in week five usually is not.'),
    ],
    checkpoint: [
      mcq('Keeping "Doing" to one item at a time is advised because:',
        [['Two things half-finished is slower than one finished', true],
          ['Boards become unreadable without it', false],
          ['Context switching is impossible', false],
          ['It makes progress easier to report', false]],
        'Finished work is the only kind that counts.'),
      mcq('A plan that was never revised:',
        [['Was not being used', true],
          ['Was unusually well estimated', false],
          ['Indicates a stable project', false],
          ['Should be kept as a template', false]],
        'Re-plan when you learn something, and record what changed.'),
    ],
  },

  {
    unitCode: 'T2_PROJECTS_GUIDED_BUILD',
    notes: `The first project, built with the structure given to you. What is being learned is the
shape a real application takes, so that the next four are yours to shape.

**Why guided first.** Being handed a blank editor and told to build something teaches very little if
you have never seen how the pieces fit. This build gives you the architecture and the order; the work
and the decisions inside each step are still yours.

**The shape almost every application shares:**

1. **Data model** — what is stored, and how the pieces relate
2. **Data access** — reading and writing it safely
3. **Business logic** — the rules, separate from both the storage and the interface
4. **Interface** — HTTP endpoints, a web page, or a command line
5. **Validation** — refusing bad input at the boundary
6. **Error handling** — what happens when something is missing, wrong or broken
7. **Tests** — for the logic, and for the failure paths
8. **Documentation** — how to run it, and what it does

**The separation in step 3 is the lesson.** Business rules mixed into HTTP handlers cannot be tested
without a web server, cannot be reused by a background job, and have to be rewritten when the
interface changes. Keeping them apart is the difference between code that grows and code that
calcifies.

**Build it end to end early**, then deepen. One working path through all eight layers, then the next
feature.

**Commit as you go**, one change per commit, so the history shows the build.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Guided Build, End to End',
      description: 'Build a complete small application following a given architecture, with the logic separated from the interface and every layer tested.',
      instructions: `**The brief**

Build a **task tracker** with the architecture above. Not a novel idea — the point is the structure,
and a familiar problem keeps your attention on it.

**What it does**

- A user registers and logs in
- They create tasks with a title, an optional description and a due date
- They list their tasks, filtered by status and sorted by due date
- They mark a task complete, edit it, or delete it
- They see what is due this week

**Requirements**

1. **All eight layers present and separated.** Business logic must be callable without an HTTP
   request — demonstrate this with a test that does exactly that.
2. **A database**, with a schema including keys and constraints.
3. **Parameterised queries** everywhere.
4. **Authentication**, with hashed passwords, and every task endpoint checking ownership.
5. **Validation at the boundary**, with useful errors and correct status codes.
6. **Error handling**: no stack trace reaches the user; every failure is logged.
7. **Tests**: the business logic, each endpoint's success path, and at least six failure paths.
8. **A README**: what it does, how to run it, how to test it, and the decisions you made.
9. **A history** of small commits with real messages.

**What to submit**

1. The repository, runnable from a clean clone following only the README.
2. A **layer map**: for each of the eight, which files hold it and what belongs there.
3. The **test output**, and a note on what is not covered and why.
4. A **demonstration** of ownership enforcement: two accounts, one trying to reach the other's task,
   with the response.
5. A **short write-up** (300–400 words): where you were tempted to put logic in the handler and why
   you did not; the failure path you had not thought about until you wrote its test; what you would
   change about the architecture for a larger application.

**Constraints**

- Technology you already know. This project is about structure.
- No business rule inside an HTTP handler.
- No secret in the repository.

**Where the marks are.** The separation and the failure paths. A working happy path is the minimum
here; the architecture and the behaviour when things go wrong are the assessment.`,
      rubric: [
        {
          criterion: 'Architecture',
          description: 'All eight layers present and genuinely separated; business logic callable and tested without the web layer.',
          maxPoints: 30,
        },
        {
          criterion: 'Correctness and safety',
          description: 'Ownership enforced on every endpoint, passwords hashed, queries parameterised, validation at the boundary with correct statuses.',
          maxPoints: 25,
        },
        {
          criterion: 'Failure behaviour',
          description: 'Six or more failure paths tested; no stack traces to users; failures logged with enough detail to diagnose.',
          maxPoints: 20,
        },
        {
          criterion: 'Runnable and documented',
          description: 'Clean clone runs from the README alone; layer map accurate; commit history shows the build in small steps.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Honest about the temptation to shortcut the architecture, an unanticipated failure path, and the limits of this design at scale.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'T2_PROJECTS_EXTENDING',
    notes: `The second project: add a feature to a codebase you did not write. This is what the first
six months of a job actually consist of, and it is almost never practised.

**Why it is different from building.** You cannot hold the whole thing in your head, you did not make
the decisions, and the conventions are somebody else's. Writing new code is a smaller part of the
work than reading.

**Landing in an unfamiliar codebase, in order:**

1. **Run it.** Before reading anything — get it working locally, and run its tests. If you cannot,
   that is your first task and often your most valuable contribution.
2. **Find the shape.** What are the top-level directories and what lives in each? Where do requests
   enter? Where is the data?
3. **Follow one feature end to end.** Pick something small that works and trace it from the entry
   point to the database and back. One trace teaches more than an hour of browsing.
4. **Find the conventions.** How are things named, where do tests live, what does an existing
   handler look like? Your code should be indistinguishable from what is already there.
5. **Then find where your feature goes**, by finding the most similar existing feature and reading
   it closely.

**Match the codebase, not your preferences.** A different style in one file is a permanent reminder
that somebody passed through. If the project uses a pattern you dislike, use it anyway and raise the
question separately.

**Change as little as possible.** A feature branch that also renames variables, reformats files and
refactors a helper is unreviewable, and every unrelated change is a new risk.

**Write the test first when you can** — it forces you to understand the existing behaviour before
you change it.

**When you are stuck, read the history.** \`git log\` on the file, and the commit that introduced the
confusing line, usually explains why it is there.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Feature in Somebody Else\'s Code',
      description: 'Add a complete feature to an unfamiliar existing codebase, matching its conventions and changing as little as possible.',
      instructions: `**The brief**

Take a codebase you did not write and add a feature to it. Options, in order of preference:

- **A classmate's project** from the guided build, swapped with theirs.
- **A small open-source project** with an open issue labelled for newcomers.
- **A provided codebase** with a feature request attached.

**Requirements**

1. **An orientation document**, written before you change anything:
   - How to run it and how to run its tests
   - The top-level structure, and what lives where
   - One existing feature traced end to end
   - The conventions you observed: naming, structure, error handling, test style
2. **A feature that works**, complete with its failure paths.
3. **Code indistinguishable from the surrounding code.** A reviewer should not be able to tell which
   files you touched from style alone.
4. **Tests in the project's existing style**, in the place it puts them.
5. **A minimal diff**: nothing unrelated, no reformatting, no opportunistic refactoring.
6. **A pull request** with a description a maintainer could act on.
7. **At least three questions** you had to answer by reading the code, with what you found and where.

**What to submit**

1. The **orientation document**.
2. The **pull request**, or the branch and its description.
3. The **questions list**, with the evidence that answered each.
4. A **short write-up** (300–400 words): the hardest thing to find and how you eventually found it;
   one convention you disagreed with and followed anyway; what the codebase does better than yours
   and what you will copy.

**Constraints**

- Match the existing conventions, including ones you dislike.
- No unrelated changes in the same branch.
- If the project has contribution guidelines, follow them exactly.

**Where the marks are.** The orientation document and the minimal diff. Adding a feature is the
smaller half; showing you understood somebody else's system well enough to leave it consistent is the
skill being assessed.`,
      rubric: [
        {
          criterion: 'Orientation',
          description: 'Structure, conventions and one traced feature documented accurately before any change was made.',
          maxPoints: 25,
        },
        {
          criterion: 'Feature quality',
          description: 'Works end to end including failure paths; tests written in the project\'s style and location.',
          maxPoints: 25,
        },
        {
          criterion: 'Fitting in',
          description: 'Code indistinguishable from the surrounding code; conventions followed even where disliked.',
          maxPoints: 25,
        },
        {
          criterion: 'Minimal, reviewable change',
          description: 'Nothing unrelated in the diff; pull request description a maintainer could act on.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Specific about what was hard to find, a convention followed under disagreement, and something worth copying.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'T2_PROJECTS_INTEGRATION',
    notes: `The third project: an application that talks to something it does not control. This is
where most real production incidents come from, and the skills are specific.

**What changes when a system depends on another.** Your code is correct and the application still
fails, because the other side is slow, down, rate limited, or returning something new. Correctness
is no longer enough; behaviour under somebody else's failure is the work.

**The four things an integration must get right:**

1. **Fetching** — with timeouts, retries where appropriate, and respect for their limits
2. **Storing** — keeping what you learned, so their outage does not become yours
3. **Refreshing** — deciding what is stale, and updating without hammering them
4. **Degrading** — remaining useful when they are unavailable

**Storing what you fetch changes the project.** Now there are two sources of truth, and they will
disagree: a record they deleted, a price that changed, an id that was reused. Deciding what wins, and
when, is the design question this project exists to teach.

**Design decisions you will have to make and defend:**

- Fetch on demand, or on a schedule?
- Store everything, or only what you use?
- How stale is too stale for this particular data?
- What does the user see when the service is down — old data with a date, or an honest error?
- What happens when a record you cached no longer exists upstream?

**There is no universal answer.** Stale stock levels cost a customer a cancelled order; stale country
names cost nothing. The judgement is per field, and saying which you chose and why is most of the
assessment.

**Log every call at the boundary**, and keep a record of when each cached item was fetched. Without
those two things, you cannot debug an integration at all.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Joining Two Systems',
      description: 'Build an application that consumes an external service, stores what it learns, refreshes it sensibly, and stays useful when the service is down.',
      instructions: `**The brief**

Build an application around **at least one external API**, where the data is stored locally rather
than fetched afresh every time. Examples:

- **A repository dashboard** — pulls activity from a code host, stores history, shows trends the API
  itself cannot answer.
- **A price tracker** — records a public product or currency feed over time and reports changes.
- **A weather journal** — stores daily conditions for chosen places and answers questions about the
  past.
- **A transport board** — caches schedule data and answers questions during an outage.

**Requirements**

1. **A local store** with a schema, holding what was fetched and when.
2. **A fetch layer** with timeouts, a documented retry policy, and rate limits respected.
3. **A refresh strategy**, stated and implemented: what is refreshed, how often, and why that
   interval.
4. **A staleness policy**, per kind of data, with the reasoning written down.
5. **Degradation**: the application still answers with stored data, clearly marked with its age, when
   the service is unavailable.
6. **Conflict handling**: what happens when upstream data changed or disappeared.
7. **Boundary logging**: every call with endpoint, status, duration; no secrets.
8. **Tests** with stubbed responses, covering success, failure, timeout, rate limit and malformed
   data.
9. **Something the API cannot answer on its own** — a trend, a comparison, a history — since that is
   the point of storing it.

**What to submit**

1. The code and its README.
2. The **integration design**: refresh strategy, staleness policy per field, and conflict rules, each
   with its reasoning.
3. A **demonstration with the service unavailable** — block it or point at a dead address — showing
   what the user sees.
4. The **boundary log** from a real run.
5. A **short write-up** (300–400 words): the staleness decision you were least sure about; what
   happened the first time the API returned something you did not expect; what you would add before
   anybody depended on this.

**Constraints**

- Public or sandbox APIs, within their terms.
- No secrets in the repository.
- No unbounded retrying.

**Where the marks are.** The staleness and conflict decisions, and the unavailable demonstration.
Fetching and displaying is a week-one exercise; behaving well when the other side misbehaves is the
project.`,
      rubric: [
        {
          criterion: 'Integration correctness',
          description: 'Fetching with timeouts and a justified retry policy; local store with a sensible schema; something answered that the API alone could not.',
          maxPoints: 25,
        },
        {
          criterion: 'Staleness and conflicts',
          description: 'Refresh strategy and per-field staleness policy reasoned rather than assumed; upstream changes and deletions handled deliberately.',
          maxPoints: 30,
        },
        {
          criterion: 'Degradation',
          description: 'Useful behaviour with the service down, data clearly marked with its age, no crashes or stack traces.',
          maxPoints: 20,
        },
        {
          criterion: 'Observability and tests',
          description: 'Boundary logging without secrets; tests covering success, failure, timeout, rate limit and malformed responses.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'A genuinely uncertain decision examined, a real surprise from the API, and what production readiness would require.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'T2_PROJECTS_INDEPENDENT',
    notes: `The fourth project: your own idea, chosen, scoped and built without a brief. This is the
one that goes on your portfolio, and the one you will be asked about in interviews.

**Why it matters more than the others.** The three before it had their hardest decision made for you
— what to build. Making that decision well, and then finishing, is what separates people who have
shipped things from people who have completed exercises.

**Choosing well:**

- **A problem you actually have.** Motivation survives week three only if you want the result.
- **Small enough to finish**, with everything in the scoping unit applied.
- **Technology you know**, unless learning something new is the explicit point and the timeline says
  so.
- **Something you can explain in one sentence** to somebody who does not code.

**What makes a portfolio project persuasive** — and a reviewer looks for these specifically:

- It runs. A clone and a README, and it works.
- It solves something recognisable, even if small.
- The code is readable and the structure is defensible.
- It handles being used wrongly.
- It has tests.
- The README explains the decisions, not only the commands.

**What makes one unpersuasive:** a tutorial followed to completion, a clone of a famous application
with no purpose, something that only runs on your machine, or something so ambitious that only the
login page exists.

**Finish, then improve.** A small, complete, polished thing beats an ambitious half-thing every time
— in an interview, in a portfolio, and in your own sense of what you can do.

**Keep a decision log as you build.** Every non-obvious choice, with the alternative and the reason,
one line each. It costs a minute and it is exactly what you will be asked about when somebody reads
this project with you in the room.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Something of Your Own',
      description: 'Choose, scope, build and defend a project of your own: complete, runnable by a stranger, and explained through the decisions you made.',
      instructions: `**The brief**

Build something you chose. No brief is given, and the choice is part of the assessment.

**Requirements**

1. **A scope document**, written before building: one-sentence purpose, three to five version-one
   features, an explicit not-doing list, and what "finished" means.
2. **A working application**, complete within its stated scope, running from a clean clone with only
   the README to follow.
3. **Defensible structure**: layers separated, logic testable without the interface.
4. **Handles misuse**: invalid input, missing data, and whatever failure is most likely in your
   design.
5. **Tests** for the core logic and the main failure paths.
6. **A decision log**: at least eight non-obvious decisions, each with its alternative and reason.
7. **A README** covering what it does, how to run it, how to test it, the decisions, and the known
   limitations.
8. **A demonstration** of two minutes or less, recorded or scripted.
9. **A history of small commits** across the build, not one commit at the end.

**What to submit**

1. The repository.
2. The **scope document**, unedited from before you started, plus a note on what changed and why.
3. The **decision log**.
4. The **demonstration**.
5. A **short write-up** (400–500 words): why you chose this; the point at which it nearly did not
   get finished and what you cut; the part of the code you are least happy with and what you would do
   about it; what you would build next on top of it.

**Constraints**

- Your own idea, not a tutorial followed through.
- Finishable within the time available — a complete small thing, not an ambitious fragment.
- No secrets in the repository; runnable by somebody who is not you.

**Where the marks are.** Finishing, and the decision log. An interviewer will open this project and
ask "why did you do it this way" — the log is your practice for that conversation, and the honest
limitations section is what makes the rest credible.`,
      rubric: [
        {
          criterion: 'Scope and completion',
          description: 'Scope written first and respected; the result complete within it; changes to scope acknowledged with reasons.',
          maxPoints: 25,
        },
        {
          criterion: 'Build quality',
          description: 'Defensible structure, logic testable without the interface, misuse handled, tests for core paths and failures.',
          maxPoints: 25,
        },
        {
          criterion: 'Runnable by a stranger',
          description: 'Clean clone runs from the README; no machine-specific assumptions; no secrets; demonstration under two minutes.',
          maxPoints: 20,
        },
        {
          criterion: 'Decision log',
          description: 'Eight or more real decisions with alternatives and reasoning, not restatements of what the code does.',
          maxPoints: 20,
        },
        {
          criterion: 'Write-up',
          description: 'Honest about the near-failure point, what was cut, and the weakest part of the code.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'T2_PROJECTS_TEAM_PROJECT',
    notes: `The fifth project: building with somebody else. Everything technical you know already
applies; what is new is that half the work is now coordination.

**What actually goes wrong in student team projects**, in order of frequency:

1. **Unclear ownership** — two people build the same thing, or nobody builds it.
2. **Integration left until the end** — two halves that have never met, three days before the
   deadline.
3. **One person doing everything** — usually the one most worried about the grade, which teaches
   nobody anything.
4. **Silent disagreement** — a decision nobody agreed with and nobody argued about, reversed at week
   four.
5. **Uneven pace** — one person waiting on another and not saying so.

**None of those are technical problems.** All five are prevented by the same few habits.

**Agree these on day one, in writing:**

- Who owns which area, and what "owns" means
- The interface between your parts — the function signatures, the endpoint shapes, the data — agreed
  before either side is built
- How you work: branches, pull requests, who reviews
- When you talk: a short check-in at a fixed time beats messaging when stuck
- What happens when you disagree

**Integrate continuously.** Merge into main every day, however incomplete. The pain of integration
scales with how long you avoid it, and a project that integrates on the last day is a project that
fails on the last day.

**Agreeing the interface first is the single highest-value habit.** If the endpoint shape and the
data format are settled on day one, both people can build against it and the halves meet without
drama. Write it down; a verbal agreement drifts within a week.

**Review each other's work properly**, using the reviewing unit from the Git topic. Rubber-stamping
a teammate's pull request is how a team project becomes one person's project with an audience.

**Say when you are stuck, early.** A day lost to being stuck is a day; three days of silence is a
missed deadline and a teammate who cannot help you any more.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — Building With Somebody Else',
      description: 'Deliver a project with a partner: split ownership, agree the interface first, integrate daily, review each other properly and report honestly on the collaboration.',
      instructions: `**The brief**

With **one or two partners**, build something neither of you could finish alone in the time. The
application matters less than how you work; something with a clear front and back, or two distinct
services, gives the split a natural line.

**Requirements**

1. **A working agreement**, written on day one: ownership, the interface between your parts, the
   workflow, the check-in time, and how disagreements are settled.
2. **The interface agreed and written down before either side is built** — signatures, endpoint
   shapes, data formats, error cases.
3. **A shared repository** with feature branches and pull requests; nothing merged without a review.
4. **Daily integration** into main, evidenced by the commit history.
5. **A real review each way**: at least four substantive comments per person, each answered.
6. **Roughly balanced contribution**, visible in the history; imbalance acknowledged if it happened.
7. **A working application**, deployed or runnable from a clean clone.
8. **Tests**, including at least one covering the boundary between the two parts.

**What to submit**

1. The repository, with the full history.
2. The **working agreement** as written on day one, plus what you changed and why.
3. The **interface document**, and a note on every time it had to change mid-build.
4. A **contribution summary**: who did what, with commit evidence.
5. The **review conversations**.
6. A **joint write-up** (400–500 words): what went wrong between you and how it was resolved; the
   decision you disagreed on and how it was settled; what each of you would do differently next time.
   Written together, but each person's view identifiable.

**Constraints**

- Both partners commit code; neither may be only a reviewer.
- No integration deferred to the final week.
- Disagreements resolved in writing where they affected the design.

**Where the marks are.** The working agreement, the daily integration evidence, and the honesty of
the joint write-up. A polished application built by one person while the other watched scores below a
rougher one built by two people working properly.`,
      rubric: [
        {
          criterion: 'Working agreement and interface',
          description: 'Ownership, workflow and the interface between the parts agreed in writing before building; changes to it tracked.',
          maxPoints: 25,
        },
        {
          criterion: 'Collaboration in practice',
          description: 'Daily integration evidenced in history; pull requests reviewed substantively both ways; contribution reasonably balanced.',
          maxPoints: 30,
        },
        {
          criterion: 'The application',
          description: 'Works end to end, runnable from a clean clone, with tests including the boundary between the two parts.',
          maxPoints: 25,
        },
        {
          criterion: 'Honest reporting',
          description: 'Joint write-up names what went wrong, how a disagreement was settled, and acknowledges imbalance where it occurred.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_VERIFICATION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_VERIFICATION_CORE_VERIFICATION',
    notes: `The first of three assessments: the programming core of the year, measured rather than
assumed.

**What it covers:** objects and classes, the data structures and when each is right, algorithmic
thinking and cost, recursion, and testing including the failure paths.

**What it is for.** Not a grade for its own sake. A claim on a resume — "I know data structures" —
needs evidence behind it, and this is where that evidence comes from. It is also the last honest
chance to find a gap before an interview finds it for you.

**The shape of it:** a mixture of questions and small practical problems, taken in one sitting,
without an assistant and without looking things up. The restriction is the point: in an interview
there is no search bar, and knowing what you carry in your head is the information this produces.

**What is actually assessed:**

- **Judgement over recall.** Not "what is a dictionary" but "which structure fits this problem, and
  what does it cost".
- **Correctness at the edges.** Empty, one, many, invalid — the same standard the whole year has
  applied.
- **Reasoning made visible.** Several answers ask why, and a correct answer with no reasoning scores
  below a well-reasoned one with a small error.

**How to prepare:** redo the practice units rather than rereading the notes. Rereading produces
recognition, which feels like knowledge and is not. Solving the problems again produces the thing
being measured.

**If something goes badly**, that is a result, not a verdict. It names a specific skill to work on
while there is still a year ahead of you rather than an interview next week.

**Bring the year's habits with you:** read the question twice, state the cases before coding, and
write down your reasoning even when nobody asked for it.`,
    mcqs: [
      mcq('This assessment is taken without lookups because:',
        [['It measures what you carry in your head, as an interview does', true],
          ['Lookups would make it take too long', false],
          ['The material is simple enough to memorise', false],
          ['Written sources contain the answers', false]],
        'Knowing what is actually retained is the information it produces.'),
      mcq('Preparation should be practice problems rather than rereading because:',
        [['Rereading produces recognition, which is not knowledge', true],
          ['Notes do not cover the assessed material', false],
          ['Practice problems are shorter', false],
          ['Reading is slower than solving', false]],
        'Recognition feels like knowledge, which is exactly the trap.'),
      mcq('A correct answer with no reasoning scores:',
        [['Below a well-reasoned answer with a small error', true],
          ['The same as any other correct answer', false],
          ['Full marks, since correctness is the standard', false],
          ['Zero, since reasoning is mandatory', false]],
        'Judgement is what the year taught; the answer alone does not show it.'),
      mcq('A poor result on this assessment is:',
        [['A named gap, with a year still available to close it', true],
          ['A verdict on readiness for the industry', false],
          ['A reason to repeat the core topics', false],
          ['Recorded on the portfolio', false]],
        'Better found here than in an interview next week.'),
    ],
    checkpoint: [
      mcq('The assessment favours "which structure fits and what it costs" over definitions because:',
        [['Judgement is what the year actually taught', true],
          ['Definitions are easier to look up', false],
          ['Costs are more memorable', false],
          ['Interviews never ask for definitions', false]],
        'Recall is the cheap half of knowing something.'),
      mcq('Correctness at the edges is assessed here because:',
        [['It is the standard the whole year applied', true],
          ['Edge cases are harder to prepare for', false],
          ['They distinguish stronger candidates', false],
          ['Most defects occur in normal cases', false]],
        'Empty, one, many, invalid — consistently, from the first topic.'),
    ],
  },

  {
    unitCode: 'T2_VERIFICATION_SYSTEMS_VERIFICATION',
    notes: `The second assessment: the systems side of the year, measured together rather than topic
by topic.

**What it covers:** databases and SQL, schema design, HTTP, APIs, team Git, and secure coding.

**Why together.** Real work does not arrive labelled. A slow endpoint might be a missing index, an
N+1 query, a missing cache or a synchronous call to another service, and knowing which requires
holding the whole picture at once. Assessing each topic separately would miss exactly the skill the
year was building.

**The shape of it:** scenarios rather than isolated questions. A description of a system and a
problem, and you say what is wrong, how you would find out, and what you would do.

**A scenario of the kind you will meet:**

    An endpoint that lists a customer's orders has become slow, and slower for customers with
    more orders. It returns 200 in about four seconds. The database is not under load.
    What do you check, in what order, and what do you expect to find?

**What that is testing:** that you recognise the pattern — cost growing with row count points at
N+1 queries or a missing index — that you check rather than guess, and that you know which tool
answers the question.

**Also assessed:**

- **Security judgement**: given code or a description, what is wrong and how serious
- **HTTP correctness**: the right status, the right method, the right header
- **Schema reading**: what a given design cannot answer, and what it will corrupt
- **Collaboration**: what you would say on a pull request, and why

**Preparation:** revisit the debugging units rather than the teaching ones. They are written as
symptom-to-cause, which is the shape this assessment takes.

**Say what you would check, not only what you think it is.** A confident wrong diagnosis is worth
less than an ordered list of checks, and that is true in the assessment and at work.`,
    mcqs: [
      mcq('The systems topics are assessed together because:',
        [['Real problems do not arrive labelled by topic', true],
          ['There is not time to assess them separately', false],
          ['The topics share most of their content', false],
          ['Combined assessments are harder to prepare for', false]],
        'Holding the whole picture at once is the skill being measured.'),
      mcq('A response time that grows with the number of a customer\'s orders suggests:',
        [['An N+1 query or a missing index', true],
          ['A slow network connection', false],
          ['An undersized server', false],
          ['A caching layer misconfigured', false]],
        'The shape of the slowdown points at the cause.'),
      mcq('This assessment favours scenarios over isolated questions because:',
        [['Diagnosis requires several topics at once', true],
          ['Scenarios are quicker to answer', false],
          ['Isolated questions are easier to look up', false],
          ['Scenarios can be graded automatically', false]],
        'A slow endpoint could be four different things from four topics.'),
      mcq('Preparation should focus on the debugging units because:',
        [['They are written as symptom to cause, like the assessment', true],
          ['They contain the most material', false],
          ['They are the most recently studied', false],
          ['They include the practical exercises', false]],
        'The shape of the preparation should match the shape of the task.'),
    ],
    checkpoint: [
      mcq('An ordered list of checks scores better than a confident diagnosis because:',
        [['Checking rather than guessing is the working skill', true],
          ['Diagnoses are usually wrong', false],
          ['Lists are easier to mark', false],
          ['It demonstrates a broader knowledge', false]],
        'True in the assessment and at work equally.'),
      mcq('Schema questions ask what a design cannot answer because:',
        [['A design\'s limits matter as much as what it stores', true],
          ['Storage decisions are the easiest to assess', false],
          ['Most schemas are technically correct', false],
          ['Queries are assessed separately', false]],
        'And what it will eventually corrupt.'),
    ],
  },

  {
    unitCode: 'T2_VERIFICATION_DIRECTION_VERIFICATION',
    notes: `The third assessment: the track you chose, assessed on its own terms.

**Why the terms differ.** A backend assessment asks about endpoints, persistence and authorisation.
A data assessment asks about grain, cleaning decisions and whether a number can be trusted. A
security assessment asks about attack surface, evidence and disclosure. The same generic paper for
all seven would test nothing any of them are for.

**What is common across every track:**

- **Depth over coverage.** Fewer things, understood properly, rather than a tour.
- **Practical over theoretical.** Given a real situation, what would you do.
- **Judgement under constraint.** What you would do with a day, versus a week.
- **Knowing the limits.** What you would not attempt alone, and who you would ask.

**That last one is assessed deliberately.** A second-year who says "I would need help with that, and
here is who I would ask and what I would ask them" is more employable than one who claims everything.
Employers are hiring somebody to learn, and the ability to see the edge of your own competence is
what makes that safe.

**The shape:** scenarios and practical tasks drawn from the work of that direction, plus questions
about the decisions the track spent its time on.

**Preparation:** your own track project. Reread it as a reviewer, list what you would change, and
prepare to defend what you did. Most of what this assessment asks is close to what that project made
you think about.

**If the result suggests the track is wrong for you**, that is a useful and recoverable finding. A
direction chosen in month three on limited evidence, revised in month nine on much better evidence,
is a correction rather than a failure — and far better made now than after accepting a job in it.`,
    mcqs: [
      mcq('Each track is assessed on its own terms because:',
        [['A generic paper would test nothing any of them are for', true],
          ['Tracks have different difficulty levels', false],
          ['Students choose their own assessment format', false],
          ['Employers require track-specific evidence', false]],
        'Backend, data and security ask genuinely different questions.'),
      mcq('Knowing what you would not attempt alone is assessed because:',
        [['Seeing the edge of your competence makes learning safe', true],
          ['It reduces the assessment workload', false],
          ['Employers expect limited ability at this stage', false],
          ['It is easier to assess than technical depth', false]],
        'More employable than claiming everything.'),
      mcq('The best preparation for this assessment is:',
        [['Rereading your own track project as a reviewer', true],
          ['Revising the track notes in order', false],
          ['Practising questions from other tracks', false],
          ['Building a second project in the track', false]],
        'Most of what it asks is close to what that project made you think about.'),
      mcq('A result suggesting the track is wrong for you is:',
        [['A correction, and far better made now than after a job offer', true],
          ['A failure of the track choice process', false],
          ['A reason to retake the assessment', false],
          ['Evidence that the year was misspent', false]],
        'Month three had limited evidence; month nine has much better.'),
    ],
    checkpoint: [
      mcq('"Depth over coverage" means the assessment prefers:',
        [['Fewer things understood properly to a broad tour', true],
          ['Advanced topics over the fundamental ones', false],
          ['Written answers over practical tasks', false],
          ['Recent material over early material', false]],
        'Common to every track, whatever its subject.'),
      mcq('"Judgement under constraint" is assessed by asking:',
        [['What you would do with a day, versus a week', true],
          ['How long a task would take you', false],
          ['Which tools you would install first', false],
          ['Whether a task is possible at all', false]],
        'Real work is always bounded, and the trade-off is the skill.'),
    ],
  },

  {
    unitCode: 'T2_VERIFICATION_PORTFOLIO_REVIEW',
    notes: `Your work, reviewed the way an employer would review it — which is faster and less
charitably than you expect.

**What a reviewer actually does.** They spend perhaps ninety seconds on your profile, open one
project, read the README, glance at the code, and decide whether to look further. Almost nobody
clones and runs anything. That reality should shape what you present.

**What the review checks:**

1. **Does the profile show something?** Pinned work, a readable summary, activity that looks like
   somebody who codes rather than somebody who submitted.
2. **Can a stranger understand each project in thirty seconds?** The README's first paragraph does
   this or it does not.
3. **Would it run?** Clear setup, a requirements file, no missing steps, no secrets.
4. **Is the code readable?** Names, structure, and the absence of commented-out blocks and debug
   prints.
5. **Is there evidence of engineering rather than coding?** Tests, error handling, a decision log,
   a history of real commits.
6. **Is anything there embarrassing?** A committed key, a leftover tutorial, a repository of a
   hundred empty projects.

**The commonest findings**, and they are almost always the same four: a README that assumes context,
a project that does not run from a clean clone, no tests anywhere, and a commit history of one commit
saying "final".

**Take the review as evidence, not as an opinion.** If a reviewer could not tell what a project does,
the project does not communicate what it does — whatever you meant it to say.

**Then act on it.** This unit is worth nothing if the findings sit unactioned. Fix the top three
before the capstone, and carry the habits into the capstone rather than repeating the mistakes in it.

**What separates a portfolio that gets replies:** three projects that run, explain themselves and
show judgement. Not fifteen repositories. Depth, and something a stranger can open and understand.`,
    mcqs: [
      mcq('A reviewer typically spends on your profile about:',
        [['Ninety seconds, before deciding to look further', true],
          ['Ten minutes, reading the main project', false],
          ['An hour, if the role is technical', false],
          ['As long as it takes to run the code', false]],
        'Almost nobody clones and runs anything.'),
      mcq('The commonest portfolio findings are:',
        [['Assumed context, no clean run, no tests, one commit', true],
          ['Poor variable naming and missing comments', false],
          ['Projects that are too ambitious in scope', false],
          ['Too few technologies demonstrated', false]],
        'Almost always the same four.'),
      mcq('If a reviewer could not tell what a project does:',
        [['The project does not communicate it, whatever you meant', true],
          ['The reviewer did not read carefully enough', false],
          ['The project needs a longer README', false],
          ['A demonstration video would resolve it', false]],
        'Take the review as evidence rather than as an opinion.'),
      mcq('A portfolio that gets replies typically contains:',
        [['Three projects that run and explain themselves', true],
          ['Fifteen repositories showing range', false],
          ['One very large flagship project', false],
          ['Contributions to well-known open source', false]],
        'Depth, and something a stranger can open and understand.'),
    ],
    checkpoint: [
      mcq('"Evidence of engineering rather than coding" means:',
        [['Tests, error handling, decisions recorded, real commit history', true],
          ['More advanced language features being used', false],
          ['A larger number of files and modules', false],
          ['Frameworks rather than plain code', false]],
        'What separates somebody who builds from somebody who completes exercises.'),
      mcq('The findings from this review should be acted on:',
        [['Before the capstone, so its habits carry into it', true],
          ['After the capstone is delivered', false],
          ['Only where they affect the strongest project', false],
          ['When applying for a specific role', false]],
        'Otherwise the capstone repeats the same mistakes.'),
    ],
  },

  {
    unitCode: 'T2_VERIFICATION_CAPSTONE',
    notes: `One substantial piece of work that uses the year: built, tested, documented and defended.

**What makes it different from the earlier projects.** They each isolated something — architecture,
working in existing code, integration, your own idea, a team. The capstone uses all of it at once,
at a size where the decisions actually matter, and you defend it to somebody asking real questions.

**What it must demonstrate**, because these are what the year was for:

- Code organised so somebody else could work in it
- Data stored in a schema that holds up
- An interface — HTTP, web or command line — that behaves correctly, including when it is misused
- Something external integrated, and degraded gracefully when it fails
- Tests that would catch a regression
- Security appropriate to what it holds
- A history that shows how it was built
- Documentation somebody could act on without asking you

**And the defence**, which is half the assessment. You present it, and then answer questions: why
this structure, why this schema, what happens when this fails, what would break at a hundred times
the load, what would you do differently. The questions are not hostile; they are the questions a
senior engineer asks about any system, and being able to answer them is what the year was building
towards.

**Scope it like everything else.** Ambitious and unfinished scores below modest and complete. The
capstone is the last place to discover that lesson.

**Start the decision log on day one.** The defence is almost entirely about decisions, and
reconstructing them at the end produces vague answers to specific questions.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Capstone — The Year, in One Piece of Work',
      description: 'Build and defend a substantial application that uses the whole year: structure, data, interface, integration, tests, security and documentation.',
      instructions: `**The brief**

Build one substantial application of your own choosing. It should be the largest thing you have
built, and it should still be finished.

**Requirements**

1. **A scope document** written first, with the version-one features, the not-doing list, and the
   definition of finished.
2. **Structure**: layers separated, business logic testable without the interface, a file layout
   somebody else could navigate.
3. **Data**: a schema with keys and constraints, parameterised queries, and at least one migration
   applied during the build.
4. **An interface** that handles misuse: validation at the boundary, correct status codes or exit
   codes, no stack traces to the user.
5. **An external integration** with timeouts, a retry policy, and graceful degradation when it is
   unavailable.
6. **Tests**: core logic, the main paths, and at least eight failure cases. Say what is not covered.
7. **Security**: authentication if it has users, ownership checks on every object, no secrets
   committed, dependencies audited.
8. **Observability**: logs that would let you diagnose a failure you did not witness.
9. **Documentation**: a README a stranger can follow, plus the decision log — at least fifteen
   decisions with alternatives and reasoning.
10. **A commit history** showing the build in small steps over its whole duration.

**What to submit**

1. The repository, running from a clean clone.
2. The **scope document**, with what changed and why.
3. The **decision log**.
4. A **demonstration** of five minutes or less.
5. A **test report**: what is covered, what is not, and why.
6. A **defence document** answering, in advance: why this structure; why this schema; what happens
   when each external dependency fails; what breaks at a hundred times the load; what you would do
   differently; what you would build next.
7. A **live defence**: present it and answer questions.

**Constraints**

- Your own work. Assistants may be used as the AI topic describes, and you must be able to explain
  every line.
- Finished within its scope; unfinished ambition scores below complete modesty.
- No secrets, and no data belonging to anybody else.

**Where the marks are.** The defence. Anybody can build something given long enough; explaining why
it is built that way, what it cannot do, and what would break first — that is the difference between
somebody who wrote code and somebody an employer can hire.`,
      rubric: [
        {
          criterion: 'Build quality',
          description: 'Layers separated and navigable; schema sound with constraints; interface correct under misuse; migration applied during the build.',
          maxPoints: 25,
        },
        {
          criterion: 'Robustness',
          description: 'Integration with timeouts and graceful degradation; eight or more failure cases tested; logs sufficient to diagnose an unwitnessed failure.',
          maxPoints: 20,
        },
        {
          criterion: 'Security',
          description: 'Ownership checks on every object, credentials handled properly, no secrets committed, dependencies audited and acted on.',
          maxPoints: 15,
        },
        {
          criterion: 'Documentation and history',
          description: 'README a stranger can follow; fifteen or more real decisions logged with alternatives; commit history showing the build over time.',
          maxPoints: 15,
        },
        {
          criterion: 'Defence',
          description: 'Structure, schema and failure behaviour explained convincingly; scaling limits identified; questions answered with reasoning rather than recall.',
          maxPoints: 25,
        },
      ],
      totalPoints: 100,
    },
  },
];
