/**
 * The second debugging and practice unit for testing, the command line, SQL, database design,
 * HTTP, APIs and secure coding — fourteen bundles for units `closeOut` now emits.
 *
 * Companion to year2ContentDeeperCore; the rationale for the whole set is in that header and in
 * the note above `closeOut` in year2MegaCurriculum.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DEEPER_DATA_BUNDLES: PilotBundle[] = [
  /* ══ T2_TESTING ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_TESTING_HARDER_FAULTS',
    notes: `**A suite that is green and proves nothing.** Every test passes, the coverage number
looks respectable, and the code is broken.

## The faults

**A test with no assertion.** It calls the function, nothing raises, the test passes. Surprisingly
common, and completely invisible in a coverage report.

**A test that asserts what the code does.** Written by running the code and pasting the output.
It will pass through the bug that breaks production and fail on the refactor that fixes it.

**Everything mocked.** The unit under test is surrounded by fakes that return exactly what it
expects, so the test exercises the mocks and not the unit.

**A tautology.** \`assert add(2, 2) == add(2, 2)\`, or an expected value computed with the same
function being tested.

**A shared fixture mutated by one test.** Passes alone, fails in the suite, or the other way
round — and which depends on the order tests happen to run in.

**A test that catches its own failure.** A try block around the assertion, so a failing
assertion is swallowed.

**And a skipped test nobody removed.** Marked skip during a refactor two years ago, counted in
the total ever since.

## The check that settles it

**Break the code on purpose and see whether the suite goes red.**

Delete a line. Invert a condition. Change a boundary. **If the suite stays green, the suite is
decoration** — and this takes two minutes, needs no tooling, and is the only check in this unit
that cannot be argued with.

**Do it ten times and count.** That number is the only honest statement about a suite's value,
and it is the one nobody has.

## What coverage does and does not say

**It says which lines were executed.** That is genuinely useful for finding code no test reaches
at all.

**It says nothing about whether anything was checked.** A test with no assertion covers every
line it touches, so a hundred percent coverage is compatible with a suite that asserts nothing
whatsoever.

## Repairing

**Add the assertion.** Then break the code and confirm it fires.

**Unmock one thing.** Keep the network faked; use the real logic underneath.

**Compute the expected value by hand** or by a different method, never by the code under test.

**And delete the skipped tests.** A test nobody will fix is noise in the count and a false
signal about what is covered.`,
    mcqs: [
      mcq('A test with no assertion is dangerous because:',
        [['It passes while covering every line it touches, so coverage hides it entirely', true],
          ['It runs more slowly than a test that checks something', false],
          ['It fails intermittently depending on the environment', false],
          ['It is usually written against the wrong function', false]],
        'Surprisingly common, and invisible in a coverage report.'),
      mcq('A test written by pasting the current output:',
        [['Passes the bug through and fails the refactor that would fix it', true],
          ['Is a reasonable starting point to be tightened later', false],
          ['Covers the behaviour adequately for regression purposes', false],
          ['Only fails when the implementation is replaced entirely', false]],
        'It asserts what the code does rather than what it should.'),
      mcq('The only check in this unit that cannot be argued with is:',
        [['Breaking the code on purpose and seeing whether the suite goes red', true],
          ['Reading each test for a missing assertion carefully', false],
          ['Measuring the proportion of mocked dependencies', false],
          ['Comparing coverage before and after a change', false]],
        'Two minutes, no tooling, and nothing to argue with.'),
      mcq('A hundred percent coverage is compatible with:',
        [['A suite that asserts nothing whatsoever', true],
          ['A suite that misses only the error paths', false],
          ['A suite with no integration tests at all', false],
          ['A suite that runs too slowly to be useful', false]],
        'Coverage says which lines ran, not what was checked.'),
    ],
    checkpoint: [
      mcq('A shared fixture mutated by one test produces a failure that:',
        [['Depends on the order the tests happen to run in', true],
          ['Appears only when the suite is run in parallel', false],
          ['Shows up consistently on every full run', false],
          ['Affects only the test that did the mutating', false]],
        'Passes alone, fails in the suite, or the reverse.'),
      mcq('The expected value in a test should be computed:',
        [['By hand or by a different method, never by the code under test', true],
          ['By the code under test, and then checked over once by hand', false],
          ['By a simplified version of the same algorithm', false],
          ['From a recorded run of a previous version', false]],
        'Otherwise the test is a tautology.'),
      mcq('A skipped test nobody will fix should be:',
        [['Deleted, because it is noise in the count and a false coverage signal', true],
          ['Left in place as a record of intent', false],
          ['Converted into a deliberately failing test to force attention', false],
          ['Kept but excluded from the reported total', false]],
        'Marked skip two years ago and counted ever since.'),
    ],
  },

  {
    unitCode: 'T2_TESTING_HARDER_PRACTICE',
    notes: `One exercise on the only honest measure of a suite: how many deliberate breakages it
catches.`,
    coding: [
      {
        title: 'The mutation score',
        description: `Read one deliberate breakage per line as \`<name> <caught>\`, where caught
is \`yes\` or \`no\`.

Print \`<name> caught\` or \`<name> MISSED\` per line, then:

    score=<caught>/<total>
    verdict=<strong|adequate|decoration>

The verdict is \`strong\` at 90 percent or above, \`adequate\` at 60 or above, and
\`decoration\` below that. With no breakages at all print \`score=0/0\` and
\`verdict=decoration\`, because a suite nobody has tested is not evidence of anything.

Use integer percentages: caught times 100 divided by total, floored.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A suite nobody has tested is not evidence of anything.
`,
        language: 'python',
        tests: [
          { input: 'a yes\nb yes\n', expectedOutput: 'a caught\nb caught\nscore=2/2\nverdict=strong' },
          { input: 'a yes\nb yes\nc no\n', expectedOutput: 'a caught\nb caught\nc MISSED\nscore=2/3\nverdict=adequate' },
          { input: 'a no\nb no\n', expectedOutput: 'a MISSED\nb MISSED\nscore=0/2\nverdict=decoration' },
          { input: '', expectedOutput: 'score=0/0\nverdict=decoration' },
          { input: 'p yes\nq yes\nr yes\ns no\nt yes\n', expectedOutput: 'p caught\nq caught\nr caught\ns MISSED\nt caught\nscore=4/5\nverdict=adequate', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Testing — Past the Obvious Answer',
      description: 'Score a suite by mutation, then do it to a real one.',
      instructions: `Complete the exercise, then:

1. Four out of five is 80 percent and scores \`adequate\` rather than \`strong\`. Say whether you
   agree with the threshold, and what you would set it to.
2. Say why an empty run is \`decoration\` rather than an error or an unknown.
3. Say what this score does **not** tell you about a suite.

**Then, on a real suite** — yours, or an open-source project you can run.

4. Run it and record the time and the number of tests.
5. **Search for tests with no assertion.** Record how many you find.
6. Search for skipped tests. Record the count and how old the oldest is.
7. **Make ten deliberate breakages, one at a time**, in the code the suite claims to cover:
   invert a condition, delete a line, change a boundary, remove an error check, swap two
   arguments.
8. Record for each whether the suite went red and which test caught it.
9. Compute the score and the verdict.
10. **For every miss, write the test that catches it.** Re-run all ten and record the new score.
11. Compare your score against the coverage number the project reports. Say what the difference
    means.`,
      rubric: [
        { criterion: 'Score and verdict correct', description: 'All cases, including the empty run and the floored percentage.', maxPoints: 20 },
        { criterion: 'The thresholds judged', description: 'An opinion with a reason, and why empty is decoration.', maxPoints: 15 },
        { criterion: 'The suite surveyed', description: 'Time, count, assertionless tests and skipped tests recorded.', maxPoints: 15 },
        { criterion: 'Ten breakages made and recorded', description: 'One at a time, with red-or-green and the catching test noted.', maxPoints: 25 },
        { criterion: 'Misses turned into tests', description: 'Every miss covered and all ten re-run for a new score.', maxPoints: 15 },
        { criterion: 'Compared against coverage', description: 'The two numbers set against each other, with what the gap means.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a yes\nb yes\n', expectedOutput: 'a caught\nb caught\nscore=2/2\nverdict=strong' },
          { input: 'a yes\nb yes\nc no\n', expectedOutput: 'a caught\nb caught\nc MISSED\nscore=2/3\nverdict=adequate' },
          { input: 'a no\nb no\n', expectedOutput: 'a MISSED\nb MISSED\nscore=0/2\nverdict=decoration' },
          { input: '', expectedOutput: 'score=0/0\nverdict=decoration' },
          { input: 'p yes\nq yes\nr yes\ns no\nt yes\n', expectedOutput: 'p caught\nq caught\nr caught\ns MISSED\nt caught\nscore=4/5\nverdict=adequate', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('An empty mutation run is decoration rather than unknown because:',
        [['A suite nobody has tested is not evidence about that suite either way', true],
          ['An empty result is conventionally treated as a failure', false],
          ['The score would otherwise divide by zero and error', false],
          ['A suite with no breakages tested has no real coverage at all', false]],
        'It is a statement about what you know, not about the suite.'),
      mcq('The mutation score does not tell you:',
        [['Whether the suite covers the behaviours that matter to a user', true],
          ['Whether the tests assert anything at all', false],
          ['Whether the suite would actually catch a real regression', false],
          ['How much of the code the tests execute', false]],
        'It measures sensitivity, not relevance.'),
      mcq('Comparing the mutation score against the coverage number shows:',
        [['How much of the executed code is actually checked', true],
          ['Which of the files have the weakest tests', false],
          ['Whether the suite runs fast enough', false],
          ['How many tests are redundant', false]],
        'Coverage counts execution; mutation counts detection.'),
    ],
  },

  /* ══ T2_LINUX ═══════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_LINUX_HARDER_FAULTS',
    notes: `**A command that runs, exits zero, and did not do what you meant.** The shell is
unusually good at succeeding incorrectly.

## The faults

**An unquoted variable.** A path with a space becomes two arguments. **The single most common
shell fault there is**, and it works on every filename you tested with.

**A glob that matched nothing.** In many shells the pattern is passed through literally, so the
command receives a filename containing an asterisk and fails confusingly — or worse, matches
something.

**A pipeline whose exit status is the last command's.** \`false | true\` succeeds. So a pipeline
that fails in the middle reports success, and a script checking the status carries on.

**An error ignored because the script does not stop.** Without an explicit setting, a failing
line does not end the script, so line nine runs on what line three failed to produce.

**A relative path in a scheduled job.** The working directory is not what it is in your terminal.

**A trailing slash that changes the meaning.** Some commands treat a directory with and without
one as different targets, and the result is a copy inside rather than a copy over.

**And a redirect that truncates before the command reads.** \`sort file > file\` empties the file
first.

## Finding them

**Echo the command instead of running it.** Print exactly what would execute, with the variables
expanded. **Every quoting fault becomes visible immediately**, and it costs one word.

**Test with a filename containing a space**, once, deliberately. It finds most of the quoting
class.

**Check the exit status of what you actually care about**, not of the pipeline.

**And run it in a different directory** before trusting it in a scheduler.

## Repairing

**Quote every expansion.** There is no case where quoting a variable makes a working command
stop working.

**Set the shell to stop on error and to fail a pipeline** whose middle fails — two lines at the
top of the script that turn silent wrong answers into loud ones.

**Resolve paths from the script's own location.**

**And never redirect into the file being read.** Write elsewhere and move it.`,
    mcqs: [
      mcq('The single most common shell fault is:',
        [['An unquoted variable, which splits a path containing a space into two arguments', true],
          ['A glob that matched nothing and passed through literally', false],
          ['A relative path used inside a scheduled job', false],
          ['A pipeline whose exit status comes from the last command', false]],
        'And it works on every filename you tested with.'),
      mcq('A pipeline that fails in the middle:',
        [['Reports success, because the status is the last command’s', true],
          ['Reports the first non-zero status it encountered', false],
          ['Stops immediately at the failing stage', false],
          ['Reports success only when the last stage reads nothing', false]],
        'So a script checking the status carries on.'),
      mcq('Echoing the command rather than running it:',
        [['Makes every quoting fault visible immediately, and costs one word', true],
          ['Confirms the command exists on this machine', false],
          ['Shows which files the glob would match', false],
          ['Reveals the working directory it would use', false]],
        'Print exactly what would execute, expanded.'),
      mcq('Quoting every expansion is safe because:',
        [['There is no case where quoting a variable makes a working command stop working', true],
          ['Most shells warn about unquoted expansions anyway', false],
          ['Quoting has no effect when there are no spaces', false],
          ['It only matters for variables holding paths', false]],
        'So there is no trade-off to weigh.'),
    ],
    checkpoint: [
      mcq('Redirecting into the file being read:',
        [['Empties the file before the command reads it', true],
          ['Appends the output after the original content', false],
          ['Fails with a file-in-use error', false],
          ['Works because the read happens first', false]],
        'Write elsewhere and move it.'),
      mcq('A failing line in a script without an explicit setting:',
        [['Does not end the script, so later lines run on what it failed to produce', true],
          ['Ends the script with that line’s exit status', false],
          ['Ends the script only inside a function', false],
          ['Prints a warning to standard error and continues at the next block', false]],
        'Two lines at the top turn that into a loud failure.'),
      mcq('The test that finds most quoting faults is:',
        [['Trying a filename that contains a space, deliberately, once', true],
          ['Running the script under a different shell', false],
          ['Checking that every variable is assigned before it is used', false],
          ['Running it with the glob expanded by hand', false]],
        'It costs nothing and it is decisive.'),
    ],
  },

  {
    unitCode: 'T2_LINUX_HARDER_PRACTICE',
    notes: `One exercise on the shell's quietest fault: an exit status that says success when the
work did not happen.`,
    coding: [
      {
        title: 'What the pipeline actually reported',
        description: `Read one pipeline per line: the exit statuses of its stages, space
separated, as integers.

Print, per line:

- \`ok\` when every stage is 0
- \`HIDDEN <n>\` when the last stage is 0 but an earlier one is not, where \`n\` is the number of
  failing stages
- \`failed\` when the last stage is not 0

Then \`hidden=<n>\`, counting the \`HIDDEN\` lines.

**\`HIDDEN\` is the interesting case.** The shell reports the last stage, so those pipelines
exited zero and a script checking the status carried on.

An empty line is a pipeline with no stages: print \`ok\`.`,
        starter: `import sys

# The shell reports the last stage. An earlier failure is invisible.
`,
        language: 'python',
        tests: [
          { input: '0 0 0\n', expectedOutput: 'ok\nhidden=0' },
          { input: '1 0\n', expectedOutput: 'HIDDEN 1\nhidden=1' },
          { input: '0 1\n', expectedOutput: 'failed\nhidden=0' },
          { input: '1 2 0\n', expectedOutput: 'HIDDEN 2\nhidden=1' },
          { input: '0 0\n3 0 0\n0 5\n', expectedOutput: 'ok\nHIDDEN 1\nfailed\nhidden=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'The Command Line — Past the Obvious Answer',
      description: 'Find the hidden failures, then harden a real script.',
      instructions: `Complete the exercise, then:

1. Say what shell setting makes a \`HIDDEN\` pipeline report failure instead, and what it is
   called.
2. Say why an empty pipeline is \`ok\` rather than an error.
3. Give a pipeline where an earlier non-zero status is **expected and fine**, and say how you
   would distinguish it from a real failure.

**Then, on a real script** — one of yours, or one from a project you use.

4. Read it and record every unquoted variable expansion.
5. Record every relative path, and say what each would resolve to under a scheduler.
6. **Run it with a filename containing a space.** Record what happened.
7. Add the two settings that stop on error and fail a pipeline on an earlier failure. Run it
   again and record what now fails that did not before.
8. Fix what the settings exposed.
9. **Run it from a different directory.** Fix any path that broke.
10. Write the one-line summary you would put at the top of the script saying what it assumes.`,
      rubric: [
        { criterion: 'Pipeline statuses classified', description: 'All cases, with hidden failures counted and the empty pipeline handled.', maxPoints: 20 },
        { criterion: 'The setting named', description: 'What makes a hidden failure report, plus why empty is ok.', maxPoints: 15 },
        { criterion: 'An expected failure distinguished', description: 'A real example, with how you would tell it from a fault.', maxPoints: 15 },
        { criterion: 'A real script audited', description: 'Unquoted expansions and relative paths recorded, space test run.', maxPoints: 20 },
        { criterion: 'Hardened and re-run', description: 'Both settings added, new failures recorded and fixed.', maxPoints: 20 },
        { criterion: 'Assumptions written down', description: 'A one-line summary at the top of the script.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys
`,
        tests: [
          { input: '0 0 0\n', expectedOutput: 'ok\nhidden=0' },
          { input: '1 0\n', expectedOutput: 'HIDDEN 1\nhidden=1' },
          { input: '0 1\n', expectedOutput: 'failed\nhidden=0' },
          { input: '1 2 0\n', expectedOutput: 'HIDDEN 2\nhidden=1' },
          { input: '0 0\n3 0 0\n0 5\n', expectedOutput: 'ok\nHIDDEN 1\nfailed\nhidden=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('An earlier non-zero status is expected and fine when:',
        [['A stage such as a search legitimately reports finding nothing', true],
          ['The pipeline has more than two stages in it', false],
          ['The last stage is able to recover from the missing input', false],
          ['The failing stage writes to standard error only', false]],
        'Which is why the setting needs a deliberate exception there.'),
      mcq('An empty pipeline is ok rather than an error because:',
        [['No stage failed, so there is nothing to report', true],
          ['The shell treats an empty command as success', false],
          ['An error would be ambiguous to the caller', false],
          ['The exit status defaults to zero', false]],
        'Nothing ran, and nothing went wrong.'),
      mcq('The two settings at the top of a script turn:',
        [['Silent wrong answers into loud failures', true],
          ['Warnings into errors that stop the run', false],
          ['Unquoted expansions into quoted ones', false],
          ['Relative paths into absolute ones', false]],
        'Stop on error, and fail a pipeline whose middle fails.'),
    ],
  },

  /* ══ T2_DB_QUERY ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DB_QUERY_HARDER_FAULTS',
    notes: `**A query that returns rows and returns the wrong ones.** No error, no empty result —
just a number that is quietly not the answer.

## The faults

**An inner join where an outer was meant.** Rows with nothing on the other side disappear, so a
count of customers silently becomes a count of customers who have ordered. **The most consequential
join fault**, because the result looks complete.

**A join that multiplies.** Joining two one-to-many relations from the same parent gives every
combination, so every sum is multiplied by the size of the other branch. The total is wrong by a
factor nobody notices until it is compared with something.

**A filter in the WHERE clause of an outer join.** It turns the outer join back into an inner
one, because the unmatched rows have a null that fails the test. **Move it into the ON clause**
and the outer join survives.

**Aggregating without grouping by everything selected.** Some databases refuse; others pick a row
arbitrarily and return it.

**A NULL in a comparison.** \`= NULL\` is never true, and \`NOT IN\` against a set containing a null
returns nothing at all — silently, for the whole query.

**COUNT over a nullable column**, which counts non-nulls rather than rows.

**And DISTINCT hiding a join fault** rather than fixing it: the duplicates are gone and the sums
are still wrong.

## Finding them

**Count before and after every join.** If the row count changed and you did not expect it to,
that is the fault, located. **One number per join, and it finds most of this list.**

**Run the aggregate against a hand-counted subset.** Ten rows you can check by eye.

**Look for nulls in every column you filter or join on.**

**And compare two ways of getting the same number.** A total from the orders table and the same
total from the lines table should agree; when they do not, one join is multiplying.

## Repairing

**Aggregate before joining** where a branch is one-to-many. A subquery that sums first cannot
multiply.

**Put outer-join filters in the ON clause.**

**Be explicit about nulls** — a comparison that has to handle them should say so.

**And never reach for DISTINCT to fix a count.** It hides the symptom and leaves the cause.`,
    mcqs: [
      mcq('The most consequential join fault is:',
        [['An inner join where an outer was meant, because the result looks complete', true],
          ['A join that multiplies rows across two branches', false],
          ['A filter placed in the WHERE clause of an outer join', false],
          ['An aggregate without a complete GROUP BY', false]],
        'A count of customers becomes a count of customers who have ordered.'),
      mcq('A filter in the WHERE clause of an outer join:',
        [['Turns it back into an inner join, because the unmatched rows hold a null', true],
          ['Is evaluated before the join and so has no effect', false],
          ['Applies only to the rows that matched', false],
          ['Produces a syntax error in most databases', false]],
        'Move it into the ON clause.'),
      mcq('NOT IN against a set containing a null:',
        [['Returns nothing at all, silently, for the whole query', true],
          ['Ignores the null and compares the rest', false],
          ['Raises an error about comparing to null', false],
          ['Returns every row, since nothing matches', false]],
        'A null in a comparison is never true.'),
      mcq('A row count taken on each side of a join:',
        [['Finds most of this list, at one number per join', true],
          ['Confirms the join keys are correctly indexed', false],
          ['Shows whether the query plan is efficient', false],
          ['Reveals which rows were filtered out', false]],
        'If the count changed unexpectedly, that is the fault located.'),
    ],
    checkpoint: [
      mcq('Aggregating before joining prevents multiplication because:',
        [['A subquery that sums first cannot produce a row per combination', true],
          ['The database optimises the subquery into a single pass', false],
          ['The join then has fewer rows to process', false],
          ['A subquery is always evaluated independently', false]],
        'Where a branch is one-to-many.'),
      mcq('COUNT over a nullable column counts:',
        [['Non-null values, which is not the same as rows', true],
          ['Rows, including those where the column is null', false],
          ['Distinct values in that column only', false],
          ['Rows, but excluding duplicates', false]],
        'Which makes the answer quietly wrong.'),
      mcq('Reaching for DISTINCT to fix a count:',
        [['Hides the symptom and leaves the cause, so sums stay wrong', true],
          ['Is correct whenever the duplicates come from a join', false],
          ['Fixes the count but slows the query', false],
          ['Works provided the aggregate is also distinct', false]],
        'The duplicates go and the sums do not.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_HARDER_PRACTICE',
    notes: `One exercise on the fault that costs the most and shows the least: a join that
multiplies, and the row count that reveals it.`,
    coding: [
      {
        title: 'The join that multiplied',
        description: `You are given the shape of a query rather than the query itself. Read one
line per join step as \`<name> <kind> <matches>\`, where kind is \`one_to_one\`,
\`one_to_many\` or \`optional\`, and matches is the average number of rows on the other side.

Start from 100 parent rows. After each step print \`<name>=<rows>\`, where:

- \`one_to_one\` leaves the count unchanged
- \`one_to_many\` multiplies it by \`matches\`
- \`optional\` leaves it unchanged, because an outer join keeps the parent either way

Then print \`multiplied=<n>\`, counting the steps that changed the row count, and
\`SUMS_UNSAFE\` on the next line when that count is 2 or more — because two multiplying joins
from the same parent is the case where every aggregate is wrong by a factor.`,
        starter: `import sys

rows = 100

# An optional join keeps the parent. A one-to-many join multiplies.
`,
        language: 'python',
        tests: [
          { input: 'orders one_to_many 3\n', expectedOutput: 'orders=300\nmultiplied=1' },
          { input: 'profile one_to_one 1\n', expectedOutput: 'profile=100\nmultiplied=0' },
          { input: 'tags optional 5\n', expectedOutput: 'tags=100\nmultiplied=0' },
          { input: 'orders one_to_many 2\nlines one_to_many 4\n', expectedOutput: 'orders=200\nlines=800\nmultiplied=2\nSUMS_UNSAFE' },
          { input: 'a one_to_one 1\nb optional 9\nc one_to_many 1\n', expectedOutput: 'a=100\nb=100\nc=100\nmultiplied=0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'SQL — Past the Obvious Answer',
      description: 'Trace a multiplying join, then find one in a real query.',
      instructions: `Complete the exercise, then:

1. The hidden case has a \`one_to_many\` join with one match and counts it as not multiplying.
   Say whether that is right, and what it means for a join whose average is one but whose
   maximum is not.
2. Say why an \`optional\` join leaves the count unchanged in this model, and when that is a
   simplification.
3. Say what you would do about \`SUMS_UNSAFE\` in a real query, naming the technique.

**Then, against a real database** — any you can run, with data you can create.

4. Create a parent table and two child tables, each one-to-many.
5. Write the query that joins all three and sums a column from each child. **Record the answer.**
6. Compute the correct answer a different way and record it.
7. **Count rows after each join.** Say where the multiplication happened.
8. Rewrite it so the sums are right. Say which technique you used.
9. Write a query where an inner join silently drops rows. Show the count against the outer
   version.
10. Put a filter on the outer-joined table in the WHERE clause and show that it becomes an inner
    join. Then move it and show it does not.`,
      rubric: [
        { criterion: 'Row counts traced correctly', description: 'All cases, with the multiplied count and the unsafe warning.', maxPoints: 20 },
        { criterion: 'The one-match case judged', description: 'Whether an average of one is safe, and what the maximum implies.', maxPoints: 15 },
        { criterion: 'A real multiplying query built', description: 'Three tables, the wrong answer recorded, and the right one computed separately.', maxPoints: 20 },
        { criterion: 'The multiplication located and fixed', description: 'Counts after each join, with the technique named.', maxPoints: 20 },
        { criterion: 'The inner-join drop demonstrated', description: 'Counts shown against the outer version.', maxPoints: 15 },
        { criterion: 'The WHERE-versus-ON effect shown', description: 'Filter moved, with both results.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = 100
`,
        tests: [
          { input: 'orders one_to_many 3\n', expectedOutput: 'orders=300\nmultiplied=1' },
          { input: 'profile one_to_one 1\n', expectedOutput: 'profile=100\nmultiplied=0' },
          { input: 'tags optional 5\n', expectedOutput: 'tags=100\nmultiplied=0' },
          { input: 'orders one_to_many 2\nlines one_to_many 4\n', expectedOutput: 'orders=200\nlines=800\nmultiplied=2\nSUMS_UNSAFE' },
          { input: 'a one_to_one 1\nb optional 9\nc one_to_many 1\n', expectedOutput: 'a=100\nb=100\nc=100\nmultiplied=0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A one-to-many join whose average is one but maximum is not:',
        [['Still multiplies for some parents, so the aggregate is wrong for those', true],
          ['Is perfectly safe, because the average determines the row count', false],
          ['Behaves as a one-to-one join in practice', false],
          ['Multiplies only when the child table is indexed', false]],
        'The average hides the rows that have several.'),
      mcq('Treating an optional join as never changing the count is:',
        [['A simplification, since an outer join to a one-to-many branch still multiplies', true],
          ['Always correct, because the unmatched parent rows are kept regardless', false],
          ['Correct only when the child table is empty', false],
          ['Wrong, because outer joins add null rows', false]],
        'Optional describes the match, not the cardinality.'),
      mcq('The technique for making sums safe across two branches is:',
        [['Aggregating each branch in a subquery before joining', true],
          ['Adding DISTINCT to the outer select', false],
          ['Grouping by every selected column', false],
          ['Joining the two branches to each other first', false]],
        'A subquery that sums first cannot multiply.'),
    ],
  },

  /* ══ T2_DB_DESIGN ═══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_DB_DESIGN_HARDER_FAULTS',
    notes: `**A schema that works today and cannot represent tomorrow.** Nothing is broken. The
next requirement is what finds it.

## The faults

**A constraint enforced only in the application.** The rule holds for every path the application
takes and not for the import script, the admin console or the migration. **The database is the
only layer nothing can get past**, and a rule that is not there is a rule that will be broken.

**No unique constraint where uniqueness is assumed.** Two rows appear where the code expects one,
and every read that used "first" silently picks.

**A nullable column doing two jobs.** Null meaning "not yet" and null meaning "not applicable" in
the same column, so no query can tell them apart.

**A repeated group in one row.** \`phone1\`, \`phone2\`, \`phone3\` — the fourth phone number is a
schema change, and searching across them is three conditions.

**A list in a text column.** Comma-separated values cannot be joined, counted or constrained, and
the first value containing a comma corrupts it.

**Money as a floating-point number.** The arithmetic is approximate, and the error shows in a
total that is a penny out and cannot be explained.

**A timestamp with no zone.** Correct until two servers disagree, or the clocks change.

**And a natural key that turns out not to be stable.** An email address as a primary key works
until somebody changes theirs.

## The question that finds them

**"What is the next likely requirement?"** A second phone. A customer in another country. An
order that is refunded rather than cancelled.

**Then: can the schema represent it without a migration?** If not, that is the finding — and
this is the same question the design units ask about code, applied to data, where the cost of
being wrong is higher because the data already exists.

## Finding them now

**Read the constraints, not the columns.** What does the database actually refuse? Frequently
nothing.

**Look for every nullable column and say what null means there.** If it means two things, that
is the fault.

**Search for a column holding a separator.**

**And check the type of anything that is money or a time.**

## Repairing carefully

**Add the constraint and expect it to fail.** There will be rows that violate it, which is the
proof it was needed.

**Move a repeated group to its own table.** One row per value, and the fourth is free.

**And change a type with a migration that copes with existing data**, not with a fresh schema
that only works on an empty database.`,
    mcqs: [
      mcq('A constraint enforced only in the application:',
        [['Holds for the application and not for imports, consoles or migrations', true],
          ['Is faster to evaluate than a database constraint', false],
          ['Is adequate provided every write goes through one service', false],
          ['Can be checked at read time as a safeguard', false]],
        'The database is the only layer nothing can get past.'),
      mcq('A nullable column where null means two things:',
        [['Cannot be queried to tell the two apart', true],
          ['Needs a default value to disambiguate', false],
          ['Should be indexed to make the distinction cheap', false],
          ['Is acceptable when the application knows which is which', false]],
        '"Not yet" and "not applicable" are different facts.'),
      mcq('A comma-separated list in a text column:',
        [['Cannot be joined, counted or constrained, and breaks on a value with a comma', true],
          ['Is acceptable for values that are never searched', false],
          ['Performs better than a separate table for short lists', false],
          ['Is safe provided the separator is escaped', false]],
        'One row per value instead.'),
      mcq('Adding a constraint that fails on existing rows:',
        [['Is the proof it was needed', true],
          ['Means the constraint is too strict', false],
          ['Should be added as a warning first', false],
          ['Indicates the data needs cleaning before the schema changes', false]],
        'Expect it to fail: the violating rows are the reason it was needed.'),
    ],
    checkpoint: [
      mcq('Money as a floating-point number shows its error as:',
        [['A total that is a penny out and cannot be explained', true],
          ['A rounding failure on the first calculation', false],
          ['An overflow at large values', false],
          ['A comparison that never reports equality', false]],
        'The arithmetic is approximate.'),
      mcq('An email address as a primary key works until:',
        [['Somebody changes theirs', true],
          ['Two people share an address', false],
          ['The address exceeds the column length', false],
          ['The table needs a composite key', false]],
        'A natural key that turns out not to be stable.'),
      mcq('The question that finds schema faults is:',
        [['What the next likely requirement is, and whether the schema can hold it', true],
          ['Whether the schema is fully normalised', false],
          ['Which columns lack an index', false],
          ['How large each of the tables is expected to grow over time', false]],
        'The same question the design units ask about code.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_HARDER_PRACTICE',
    notes: `One exercise on the judgement a schema turns on: whether the next requirement needs a
migration, and whether the database would refuse bad data at all.`,
    coding: [
      {
        title: 'Would the database refuse it',
        description: `Read one rule per line as \`<name> <in_app> <in_db>\`, each \`yes\` or
\`no\`.

Print per line:

- in_db \`yes\` → \`<name> enforced\`
- in_db \`no\` and in_app \`yes\` → \`<name> APP_ONLY\`
- neither → \`<name> UNENFORCED\`

Then:

    enforced=<n>
    at_risk=<n>

where \`at_risk\` counts both \`APP_ONLY\` and \`UNENFORCED\` — because from the data's point of
view a rule the database does not hold is a rule that will eventually be broken, whoever
promises otherwise.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# From the data's point of view, app-only and unenforced are the same risk.
`,
        language: 'python',
        tests: [
          { input: 'unique_email no yes\n', expectedOutput: 'unique_email enforced\nenforced=1\nat_risk=0' },
          { input: 'positive_price yes no\n', expectedOutput: 'positive_price APP_ONLY\nenforced=0\nat_risk=1' },
          { input: 'status_valid no no\n', expectedOutput: 'status_valid UNENFORCED\nenforced=0\nat_risk=1' },
          { input: '', expectedOutput: 'enforced=0\nat_risk=0' },
          { input: 'a yes yes\nb yes no\nc no no\nd no yes\n', expectedOutput: 'a enforced\nb APP_ONLY\nc UNENFORCED\nd enforced\nenforced=2\nat_risk=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Database Design — Past the Obvious Answer',
      description: 'Judge what the database really enforces, then change a schema safely.',
      instructions: `Complete the exercise, then:

1. \`APP_ONLY\` and \`UNENFORCED\` count the same. Say why, and give the one case where you would
   distinguish them.
2. Say what \`enforced\` does not tell you about a constraint.
3. Give a rule that genuinely cannot be expressed in a database, and say where it must live
   instead.

**Then, on a real schema** — one you build for this, with data in it.

4. Create three tables with a relationship between them. Put data in.
5. **List every rule your application assumes.** For each, say whether the database enforces it.
6. Try to insert a row that violates each rule, **directly, bypassing the application.** Record
   which succeeded.
7. Add the missing constraints. **Record which ones failed on existing rows**, and what you did
   about those rows.
8. Find a nullable column and say what null means. If it means two things, split it.
9. Add a repeated group — a second phone number — and then move it to its own table with a
   migration that keeps the existing data.
10. Write the next likely requirement, and say whether your schema can hold it without a
    migration.`,
      rubric: [
        { criterion: 'Enforcement classified', description: 'All cases, with at-risk counting both unenforced kinds.', maxPoints: 20 },
        { criterion: 'The shared count justified', description: 'Why they count together, and the one case to distinguish.', maxPoints: 15 },
        { criterion: 'Rules listed and probed directly', description: 'Every assumed rule tested by a direct insert, with results.', maxPoints: 25 },
        { criterion: 'Constraints added and failures handled', description: 'Which failed on existing rows, and what was done with them.', maxPoints: 20 },
        { criterion: 'A repeated group migrated', description: 'Moved to its own table, existing data kept.', maxPoints: 10 },
        { criterion: 'The next requirement tested', description: 'Named, with a verdict on whether the schema holds it.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'unique_email no yes\n', expectedOutput: 'unique_email enforced\nenforced=1\nat_risk=0' },
          { input: 'positive_price yes no\n', expectedOutput: 'positive_price APP_ONLY\nenforced=0\nat_risk=1' },
          { input: 'status_valid no no\n', expectedOutput: 'status_valid UNENFORCED\nenforced=0\nat_risk=1' },
          { input: '', expectedOutput: 'enforced=0\nat_risk=0' },
          { input: 'a yes yes\nb yes no\nc no no\nd no yes\n', expectedOutput: 'a enforced\nb APP_ONLY\nc UNENFORCED\nd enforced\nenforced=2\nat_risk=2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('The one case for distinguishing app-only from unenforced is:',
        [['Deciding what to fix first, since app-only at least holds for normal traffic', true],
          ['Reporting the schema quality to a reviewer', false],
          ['Knowing whether any of the existing rows already violate it', false],
          ['Choosing between a constraint and a trigger', false]],
        'For the data, both will eventually be broken.'),
      mcq('That a constraint is enforced does not tell you:',
        [['Whether it expresses the rule the business actually has', true],
          ['Whether existing rows satisfy it', false],
          ['Whether the application layer also checks it', false],
          ['Whether it is indexed for performance', false]],
        'Enforcement is not correctness.'),
      mcq('A rule that cannot live in the database is one that:',
        [['Depends on information the database does not hold', true],
          ['Spans more than two tables at once', false],
          ['Must be checked before a write rather than during it', false],
          ['Involves comparing a row against its own history', false]],
        'Then it lives in one service, at one boundary.'),
    ],
  },

  /* ══ T2_WEB_HTTP ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_WEB_HTTP_HARDER_FAULTS',
    notes: `**A request that returns 200 and did not work.** HTTP is unusually willing to report
success.

## The faults

**A 200 with an error in the body.** The status says fine, the body says "error": "not found".
Every client that checks the status is wrong, and most clients check the status.

**A 302 followed silently.** The client follows the redirect, the method may change from POST to
GET, and the body is dropped. The request that arrives is not the one that was sent.

**A cached response.** A GET cached by something in between — a browser, a proxy, a CDN — so the
change you made is invisible and only to some people.

**A missing content type**, so the body is guessed. Correct until the guess differs.

**A request with no timeout**, which on a dead connection waits forever rather than failing.

**A 204 with a body**, or a 201 with no location. Technically wrong, and clients built against
one server break against another.

**A POST that is not idempotent and gets retried** — by a proxy, by a client, by a user pressing
twice. Two orders.

**And an error status with an empty body**, so the caller knows it failed and nothing about why.

## Reading what actually happened

**Look at the wire, not the client library.** The method, the status, the headers, the body. **A
command-line request is the ground truth**, and it settles arguments the library's abstraction
cannot.

**Follow redirects deliberately**, one at a time, and check whether the method changed.

**Send the request twice** and see whether anything happens twice.

**And check the headers for caching.** A response you did not expect to be cached usually says so
in a header nobody read.

## Repairing

**Make the status tell the truth.** An error is a 4xx or a 5xx, and the body explains it.

**Give every error a body** with a code the client can branch on and a message a person can
read.

**Set the content type explicitly.**

**Put an idempotency key on anything that writes**, which the API and the offline-queue units
both argued for.

**And set a timeout on every request** — the value matters less than having one.`,
    mcqs: [
      mcq('A 200 with an error in the body is a problem because:',
        [['Every client that checks the status is wrong, and most clients check the status', true],
          ['The body may not be parsed by all clients', false],
          ['Intermediate caches will store the error', false],
          ['It breaks the convention for error formats', false]],
        'Make the status tell the truth.'),
      mcq('A silently followed redirect can:',
        [['Change the method from POST to GET and drop the body', true],
          ['Duplicate the request against two servers', false],
          ['Strip the authentication header only', false],
          ['Return a cached copy of the original response', false]],
        'The request that arrives is not the one that was sent.'),
      mcq('The ground truth when a client library disagrees with the server is:',
        [['A command-line request showing the method, status, headers and body', true],
          ['The server log for the request identifier', false],
          ['The library’s debug output at its highest level', false],
          ['A packet capture of the connection', false]],
        'It settles arguments the abstraction cannot.'),
      mcq('An error status with an empty body leaves the caller:',
        [['Knowing that it failed and nothing about why', true],
          ['Unable to tell whether the request arrived', false],
          ['Retrying when it should not', false],
          ['Unable to distinguish it from a timeout', false]],
        'Give every error a body with a code and a message.'),
    ],
    checkpoint: [
      mcq('A response cached by something in between is invisible:',
        [['Only to some people, which is what makes it confusing', true],
          ['To everybody until the cache expires', false],
          ['Only on the first request after a change', false],
          ['Until the client sends a conditional request', false]],
        'A browser, a proxy or a CDN.'),
      mcq('Sending the same request twice tests:',
        [['Whether anything happens twice, which is what idempotency means', true],
          ['Whether the response is cached anywhere', false],
          ['Whether the server is handling concurrency correctly', false],
          ['Whether the timeout is set appropriately', false]],
        'A retried non-idempotent POST is two orders.'),
      mcq('For a timeout value:',
        [['Having one matters more than the number chosen', true],
          ['The number should match the server’s own limit', false],
          ['A long value is safer than a short one', false],
          ['It should differ per endpoint by design', false]],
        'No timeout waits forever on a dead connection.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_HARDER_PRACTICE',
    notes: `One exercise on the discipline HTTP most rewards: deciding whether a response is
honest about what happened.`,
    coding: [
      {
        title: 'Is this response honest',
        description: `Read one response per line as \`<name> <status> <body_ok> <has_message>\`,
where status is an integer, body_ok is \`yes\` when the body reports success, and has_message is
\`yes\` when the body carries an explanation.

A response is honest when the status and the body agree. Print per line:

- status under 400 and body_ok \`no\` → \`<name> LIES_SUCCESS\`
- status 400 or above and body_ok \`yes\` → \`<name> LIES_FAILURE\`
- status 400 or above and has_message \`no\` → \`<name> SILENT_ERROR\`
- otherwise → \`<name> honest\`

Then \`honest=<n>\`.

**LIES_SUCCESS is checked before SILENT_ERROR**, because a wrong status misleads every client
that branches on it, while a missing message only slows the person diagnosing it.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A wrong status misleads every client. A missing message only slows a person.
`,
        language: 'python',
        tests: [
          { input: 'a 200 yes yes\n', expectedOutput: 'a honest\nhonest=1' },
          { input: 'a 200 no yes\n', expectedOutput: 'a LIES_SUCCESS\nhonest=0' },
          { input: 'a 404 yes yes\n', expectedOutput: 'a LIES_FAILURE\nhonest=0' },
          { input: 'a 500 no no\n', expectedOutput: 'a SILENT_ERROR\nhonest=0' },
          { input: 'p 201 yes no\nq 400 no yes\nr 200 no no\n', expectedOutput: 'p honest\nq honest\nr LIES_SUCCESS\nhonest=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'HTTP — Past the Obvious Answer',
      description: 'Judge whether responses are honest, then probe a real API on the wire.',
      instructions: `Complete the exercise, then:

1. A 201 with no message counts as honest. Say why, and when you would want a message anyway.
2. \`LIES_SUCCESS\` is checked first. Say what it costs a client, with a concrete example.
3. Say what a 200 carrying a partial failure should return instead, and why.

**Then, against a real API** — one you run, or a public one you are permitted to call.

4. **Use a command-line client, not a library.** Record the method, status, headers and body for
   one successful request.
5. Request something that does not exist. Record the status and whether the body explains it.
6. Send a malformed body. Record the status and the message.
7. **Send the same write twice.** Record whether it happened twice.
8. Follow a redirect one step at a time. Say whether the method changed.
9. Check the caching headers on a GET. Say what a proxy would be entitled to do.
10. Send a request with no content type and record what the server assumed.
11. Write down the one thing you would change about that API's error responses, and why.`,
      rubric: [
        { criterion: 'Honesty classified', description: 'All cases, with the stated precedence applied.', maxPoints: 20 },
        { criterion: 'The precedence justified', description: 'What a wrong status costs a client, concretely.', maxPoints: 15 },
        { criterion: 'Probed on the wire', description: 'Command-line client, with method, status, headers and body recorded.', maxPoints: 20 },
        { criterion: 'Failure paths exercised', description: 'Missing resource and malformed body, with statuses and messages.', maxPoints: 20 },
        { criterion: 'Idempotency and redirects checked', description: 'A write sent twice, and a redirect followed one step.', maxPoints: 15 },
        { criterion: 'A change proposed', description: 'One specific improvement to the error responses, with a reason.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a 200 yes yes\n', expectedOutput: 'a honest\nhonest=1' },
          { input: 'a 200 no yes\n', expectedOutput: 'a LIES_SUCCESS\nhonest=0' },
          { input: 'a 404 yes yes\n', expectedOutput: 'a LIES_FAILURE\nhonest=0' },
          { input: 'a 500 no no\n', expectedOutput: 'a SILENT_ERROR\nhonest=0' },
          { input: 'p 201 yes no\nq 400 no yes\nr 200 no no\n', expectedOutput: 'p honest\nq honest\nr LIES_SUCCESS\nhonest=2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A 201 with no message is honest because:',
        [['A created response has nothing to explain, so the status carries it', true],
          ['Messages are only required on failures, by long convention', false],
          ['The location header replaces the message', false],
          ['Clients ignore bodies on success anyway', false]],
        'Though a message is still useful when the result is partial.'),
      mcq('A 200 carrying a partial failure should return:',
        [['A status that says partial, with the failures listed in the body', true],
          ['A 200, since some of the work succeeded', false],
          ['A 500, since the whole operation did not fully complete', false],
          ['A 200 with a warning header attached', false]],
        'The status has to be something a client can branch on.'),
      mcq('A missing message costs:',
        [['The person diagnosing it, rather than every client', true],
          ['Every client that branches on the error code', false],
          ['The retry logic, which cannot decide', false],
          ['The cache, which cannot store it', false]],
        'Which is why it is checked after the status lies.'),
    ],
  },

  /* ══ T2_APIS ════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_APIS_HARDER_FAULTS',
    notes: `**An API that works for its first caller and cannot serve a second.** Nothing fails.
The next consumer is what finds it.

## The faults

**A response shaped for one screen.** Fields named after where they appear, values pre-formatted
for one layout. The second caller needs the data and gets the presentation.

**No versioning and a breaking change.** A field renamed, a type narrowed, a value repurposed —
and every existing client breaks at once, without warning, which the full-stack seam unit covers
at length.

**Pagination by offset on data that changes.** A caller walking pages misses rows that shifted and
sees others twice, silently.

**An error format that varies by endpoint.** A client cannot write one handler, so it writes
several, and the one for the endpoint you add next does not exist.

**A field that is sometimes absent, sometimes null, sometimes empty.** Three representations of
one idea, so every caller writes three checks or gets it wrong.

**No limit on a list.** Works until somebody has ten thousand of something.

**A write with no idempotency.** Retried by a proxy or a user, and it happens twice.

**And a timestamp without a zone**, or a number as a string, so every client parses differently.

## What makes it hard to see

**Your own client is written against your own assumptions**, so it never exercises the
ambiguity. The fault appears when somebody who did not write the server writes the client — and
by then the shape is in use and expensive to change.

## Finding it before that

**Write a second client**, or have somebody else do it, against the documentation only. **Every
question they ask is a defect in the contract**, and that is the cheapest audit available.

**Then call it with the contract's own edges**: the optional field absent, the list empty, the
page beyond the end, the value at its maximum.

**And diff two responses** for the same resource in different states. What varies should be what
you meant to vary.

## Repairing

**Return data, not presentation.**

**One error shape everywhere**, with a machine code and a human message.

**Paginate by cursor**, so a shifting list does not lose rows.

**Pick one representation of absence** and write it down.

**And add the limit before somebody finds the absence of it.**`,
    mcqs: [
      mcq('A response shaped for one screen means:',
        [['The second caller needs the data and gets the presentation', true],
          ['The first caller has to transform it anyway', false],
          ['The response is larger than it needs to be', false],
          ['The field names cannot be changed later', false]],
        'Return data, not presentation.'),
      mcq('Offset pagination on changing data:',
        [['Misses rows that shifted and shows others twice, silently', true],
          ['Fails with an error once the offset is stale', false],
          ['Returns the same page repeatedly', false],
          ['Slows down as the offset grows', false]],
        'Paginate by cursor instead.'),
      mcq('The fault is hard to see because:',
        [['Your own client is written against your own assumptions', true],
          ['The ambiguity only appears under load', false],
          ['Documentation is usually written after the client', false],
          ['Error formats are rarely exercised in testing', false]],
        'It appears when somebody else writes the client.'),
      mcq('The cheapest audit available is:',
        [['Having somebody write a second client from the documentation alone', true],
          ['Reviewing the response shapes against a style guide', false],
          ['Load testing each endpoint at its limit', false],
          ['Comparing the API against a similar public one', false]],
        'Every question they ask is a defect in the contract.'),
    ],
    checkpoint: [
      mcq('A field that is sometimes absent, null and empty forces callers to:',
        [['Write three checks, or get it wrong', true],
          ['Treat all three as the same value', false],
          ['Validate the response against a schema', false],
          ['Ask the server which to expect', false]],
        'Pick one representation of absence and write it down.'),
      mcq('An error format that varies by endpoint means a client:',
        [['Writes several handlers, and has none for the endpoint you add next', true],
          ['Cannot distinguish a client error from a server error at all', false],
          ['Must parse the status rather than the body', false],
          ['Has to retry to discover the shape', false]],
        'One error shape everywhere.'),
      mcq('Calling the API with the contract’s own edges means:',
        [['The optional field absent, the list empty, the page past the end', true],
          ['Concurrent requests at the rate limit', false],
          ['Malformed bodies and the wrong content types', false],
          ['Requests from an unauthenticated client', false]],
        'The cases the contract allows and nobody tries.'),
    ],
  },

  {
    unitCode: 'T2_APIS_HARDER_PRACTICE',
    notes: `One exercise on the change that breaks every caller at once: telling a safe change
from a breaking one before it ships.`,
    coding: [
      {
        title: 'Safe, breaking, or worse',
        description: `Read one proposed API change per line as \`<field> <change>\`, where change
is \`add_optional\`, \`add_required\`, \`remove\`, \`rename\`, \`retype\`, \`widen_enum\` or
\`narrow_enum\`.

Safe changes are \`add_optional\` and \`widen_enum\` — an old client ignores a new optional field,
and a new enum value only reaches a client that asked for it.

Print \`<field> safe\` or \`<field> BREAKING\` per line, then \`breaking=<n>\`, then
\`SILENT <field>\` for every \`retype\` and \`narrow_enum\`, because those two keep the field
name and change what it means, so nothing on either side notices until the data is wrong.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Two of the breaking changes keep the name and change the meaning.
`,
        language: 'python',
        tests: [
          { input: 'note add_optional\n', expectedOutput: 'note safe\nbreaking=0' },
          { input: 'status widen_enum\n', expectedOutput: 'status safe\nbreaking=0' },
          { input: 'total retype\n', expectedOutput: 'total BREAKING\nbreaking=1\nSILENT total' },
          { input: 'name rename\nold remove\n', expectedOutput: 'name BREAKING\nold BREAKING\nbreaking=2' },
          { input: 'a narrow_enum\nb add_required\nc retype\n', expectedOutput: 'a BREAKING\nb BREAKING\nc BREAKING\nbreaking=3\nSILENT a\nSILENT c', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'APIs — Past the Obvious Answer',
      description: 'Classify API changes, then have somebody else write a client against your contract.',
      instructions: `Complete the exercise, then:

1. Say why \`widen_enum\` is safe and \`narrow_enum\` is not, and what a client does with a value
   it has never seen.
2. \`retype\` and \`narrow_enum\` are marked silent. Say what "silent" costs compared with a
   \`remove\`, which fails loudly.
3. Say how you would ship a \`rename\` without breaking anybody. Name the steps.

**Then, on a real API** — one you build or already have, with at least four endpoints.

4. Write the contract: fields, types, which are optional and what absent means, the error shape,
   the limits.
5. **Give the contract to somebody else and have them write a client without asking you
   anything.** Record every question they could not avoid asking.
6. Each question is a defect. Fix the contract.
7. Call every endpoint with the contract's edges: optional absent, list empty, page past the
   end, value at maximum. Record what happened.
8. Check that every error has the same shape. Record any that do not.
9. **Make one breaking change properly** — expand, migrate, contract — and show that an old
   client keeps working at each step.
10. Add a limit to any list that has none, and say what you chose and why.`,
      rubric: [
        { criterion: 'Changes classified', description: 'All cases, with the silent pair identified separately.', maxPoints: 20 },
        { criterion: 'Enum direction reasoned about', description: 'Why widening is safe, and what a client does with an unknown value.', maxPoints: 15 },
        { criterion: 'A contract written', description: 'Fields, optionality, absence, errors and limits.', maxPoints: 15 },
        { criterion: 'A second client written by somebody else', description: 'From the contract alone, with every unavoidable question recorded and fixed.', maxPoints: 25 },
        { criterion: 'Edges and error shapes probed', description: 'Contract edges called, error consistency checked.', maxPoints: 15 },
        { criterion: 'A breaking change shipped safely', description: 'Three steps, with an old client working at each.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'note add_optional\n', expectedOutput: 'note safe\nbreaking=0' },
          { input: 'status widen_enum\n', expectedOutput: 'status safe\nbreaking=0' },
          { input: 'total retype\n', expectedOutput: 'total BREAKING\nbreaking=1\nSILENT total' },
          { input: 'name rename\nold remove\n', expectedOutput: 'name BREAKING\nold BREAKING\nbreaking=2' },
          { input: 'a narrow_enum\nb add_required\nc retype\n', expectedOutput: 'a BREAKING\nb BREAKING\nc BREAKING\nbreaking=3\nSILENT a\nSILENT c', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Widening an enum is safe because:',
        [['A new value only reaches a client that asked for the resource carrying it', true],
          ['Clients are formally required to ignore any unknown values', false],
          ['The old values keep their meaning unchanged', false],
          ['Enums are validated on the server only', false]],
        'Narrowing removes a value a client may already store.'),
      mcq('A silent breaking change costs more than a loud one because:',
        [['Nothing notices until the data is already wrong', true],
          ['It affects more clients at once', false],
          ['It cannot be reverted once shipped', false],
          ['It is harder to describe in a changelog', false]],
        'A remove fails immediately; a retype does not.'),
      mcq('Shipping a rename without breaking anybody takes:',
        [['Three steps: add the new name, migrate callers, remove the old', true],
          ['Two steps: add the new name and then deprecate the old', false],
          ['One step, with a version bump on the endpoint', false],
          ['A redirect from the old field to the new one', false]],
        'Expand, migrate, contract.'),
    ],
  },

  /* ══ T2_SECURITY ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T2_SECURITY_HARDER_FAULTS',
    notes: `**Code that is not vulnerable to the thing it defends against, and is vulnerable next
to it.** The obvious protection is present. The gap is beside it.

## The faults

**Parameterised queries everywhere except one.** A search built by concatenation because the
column name had to be dynamic. **One place is all it takes**, and it is usually the place that
was hard.

**Escaping on output except in one context.** Escaped for HTML text and inserted into an
attribute, a URL or a script block, where the rules are different.

**Validation on the field that was attacked last time.** The other nine take whatever arrives.

**Authorisation checked on the page and not on the endpoint.** The link is hidden and the URL
still works, which the full-stack auth unit made its central point.

**A check before a write and none before a read.** Reading somebody else's record is a breach as
surely as changing it.

**Rate limiting on login and not on password reset**, or on the API and not on the form.

**A secret in the repository history**, removed from the current files and still there.

**And a dependency with a known vulnerability**, which is the cheapest of all of these to find
and the most often left.

## Why the gap is beside the defence

**Because the defence was added in response to something specific.** Somebody found SQL injection
in the search, so the search was fixed. The fix was a change, not a rule, so nothing made the
rest of the codebase follow it.

**Which is the difference worth learning: a fix repairs one place, and a rule repairs a class.**
A query builder that cannot concatenate, a template that escapes by default, a validator applied
at the boundary rather than per field.

## Finding them

**Grep for the pattern, not the bug.** Every string-built query. Every raw output. Every
endpoint without the decorator. **The list is the audit**, and it takes minutes.

**Then check the two-account case on every endpoint**, read as well as write.

**Then audit the dependencies**, which is one command.

**And search the history for secrets**, which is another.

## Repairing as a rule

**Make the safe way the only way available.** If the unsafe call still exists, somebody will
reach for it on a busy day — which the Year-3 security track puts as making the secure path the
easy path.`,
    mcqs: [
      mcq('Parameterised queries everywhere except one place:',
        [['Is enough to be vulnerable, and it is usually the place that was hard', true],
          ['Is acceptable when that query takes no user input', false],
          ['Reduces the risk proportionally to the coverage', false],
          ['Is caught by most static analysis tools', false]],
        'One place is all it takes.'),
      mcq('Escaping for HTML text and inserting into an attribute fails because:',
        [['The escaping rules for that context are different', true],
          ['Attributes are not escaped by the template engine', false],
          ['Quotes are stripped before insertion', false],
          ['Attribute values are parsed twice', false]],
        'Escaped for one context, used in another.'),
      mcq('The gap sits beside the defence because:',
        [['The fix was a change rather than a rule, so nothing made the rest follow it', true],
          ['Defences are usually added under time pressure', false],
          ['Attackers move to the adjacent input by habit', false],
          ['The original report only covered one field', false]],
        'A fix repairs one place; a rule repairs a class.'),
      mcq('The audit for this class is:',
        [['Grepping for the pattern rather than looking for the bug', true],
          ['Running a scanner against the deployed application', false],
          ['Reviewing every change that touched security code', false],
          ['Testing each input with a standard payload list', false]],
        'The list is the audit, and it takes minutes.'),
    ],
    checkpoint: [
      mcq('A check before a write and none before a read:',
        [['Leaves a breach, because reading another record is one too', true],
          ['Is acceptable whenever the data is not sensitive', false],
          ['Is the normal trade-off for read performance', false],
          ['Matters only for endpoints that return lists', false]],
        'Check the two-account case on reads as well.'),
      mcq('The cheapest of these to find and the most often left is:',
        [['A dependency with a known vulnerability', true],
          ['A secret in the repository history', false],
          ['An endpoint missing its authorisation check', false],
          ['A query built by concatenation', false]],
        'It is one command, and it is the one most often not run.'),
      mcq('Making the safe way the only way matters because:',
        [['If the unsafe call still exists, somebody reaches for it on a busy day', true],
          ['Developers cannot reasonably be expected to learn the rules', false],
          ['It satisfies most compliance requirements', false],
          ['Code review cannot catch every occurrence', false]],
        'Make the secure path the easy path.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_HARDER_PRACTICE',
    notes: `One exercise on the distinction that decides whether a security fix lasts: whether it
repaired one place or a whole class.`,
    coding: [
      {
        title: 'Fix, or rule',
        description: `Read one remediation per line as \`<name> <sites_fixed> <sites_total> <rule_added>\`,
where the middle two are integers and rule_added is \`yes\` or \`no\`.

Print per line:

- rule_added \`yes\` and all sites fixed → \`<name> class_closed\`
- rule_added \`yes\` and sites remaining → \`<name> RULE_WITHOUT_SWEEP <remaining>\`
- rule_added \`no\` and all sites fixed → \`<name> SWEEP_WITHOUT_RULE\`
- rule_added \`no\` and sites remaining → \`<name> OPEN <remaining>\`

Then \`closed=<n>\`.

**Only the first outcome closes the class.** A sweep with no rule closes today's instances and
nothing stops the next one; a rule with sites left is a rule the existing code already violates.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A sweep fixes today. A rule stops tomorrow. Both are needed.
`,
        language: 'python',
        tests: [
          { input: 'sqli 7 7 yes\n', expectedOutput: 'sqli class_closed\nclosed=1' },
          { input: 'sqli 5 7 yes\n', expectedOutput: 'sqli RULE_WITHOUT_SWEEP 2\nclosed=0' },
          { input: 'xss 4 4 no\n', expectedOutput: 'xss SWEEP_WITHOUT_RULE\nclosed=0' },
          { input: 'authz 1 9 no\n', expectedOutput: 'authz OPEN 8\nclosed=0' },
          { input: 'a 3 3 yes\nb 0 2 no\nc 2 2 yes\n', expectedOutput: 'a class_closed\nb OPEN 2\nc class_closed\nclosed=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Secure Coding — Past the Obvious Answer',
      description: 'Tell a fix from a rule, then audit a codebase by pattern.',
      instructions: `Complete the exercise, then:

1. Say which is worse, \`SWEEP_WITHOUT_RULE\` or \`RULE_WITHOUT_SWEEP\`, and why.
2. Give an example of a rule that cannot be enforced by tooling, and say what you would do
   instead.
3. Say how you would know the sites total is right — that is, that you found every one.

**Then, on a real codebase** — yours, or one you can read.

4. **Grep for every query built by string concatenation.** Record the count and the file of each.
5. Grep for every place output is written without escaping. Record the count.
6. List every endpoint and say which have an authorisation check. **Include the read endpoints.**
7. Run the dependency audit. Record what it found.
8. Search the history for secrets. Record what you found and what you would do about it.
9. **For one finding, do both halves:** sweep every site, and add the rule that stops the next
   one. Say what the rule is and how it is enforced.
10. Say honestly which of your findings you have left open, and why.`,
      rubric: [
        { criterion: 'Remediations classified', description: 'All four outcomes, with the remaining counts.', maxPoints: 20 },
        { criterion: 'The two partial states compared', description: 'Which is worse, with a reason.', maxPoints: 15 },
        { criterion: 'Patterns grepped and counted', description: 'Concatenated queries, unescaped output, endpoints including reads.', maxPoints: 25 },
        { criterion: 'Dependencies and history audited', description: 'Both run, with findings recorded.', maxPoints: 15 },
        { criterion: 'One class genuinely closed', description: 'Every site swept and a rule added, with its enforcement named.', maxPoints: 15 },
        { criterion: 'Honest about what is open', description: 'Findings left open, and why.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'sqli 7 7 yes\n', expectedOutput: 'sqli class_closed\nclosed=1' },
          { input: 'sqli 5 7 yes\n', expectedOutput: 'sqli RULE_WITHOUT_SWEEP 2\nclosed=0' },
          { input: 'xss 4 4 no\n', expectedOutput: 'xss SWEEP_WITHOUT_RULE\nclosed=0' },
          { input: 'authz 1 9 no\n', expectedOutput: 'authz OPEN 8\nclosed=0' },
          { input: 'a 3 3 yes\nb 0 2 no\nc 2 2 yes\n', expectedOutput: 'a class_closed\nb OPEN 2\nc class_closed\nclosed=2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A sweep with no rule is worse than a rule with sites left because:',
        [['Nothing stops the next occurrence, while a violated rule is at least visible', true],
          ['It leaves a great many more vulnerable sites in the codebase', false],
          ['It gives a false impression of completeness', false],
          ['It cannot be verified by a reviewer', false]],
        'A rule the code violates will be reported by whatever enforces it.'),
      mcq('A rule that tooling cannot enforce should be:',
        [['Made into a review question short enough to be remembered', true],
          ['Documented in a policy and referenced in onboarding', false],
          ['Dropped, since unenforced rules are not followed', false],
          ['Converted into a runtime assertion instead', false]],
        'Four questions a reviewer can hold in their head.'),
      mcq('Knowing the sites total is right requires:',
        [['Searching by the pattern rather than by memory of where it appears', true],
          ['Asking whoever wrote each affected module', false],
          ['Reviewing the history to see when each one was introduced', false],
          ['Counting the occurrences the scanner reported', false]],
        'The list is the audit, and a grep produces it in minutes.'),
    ],
  },
];
