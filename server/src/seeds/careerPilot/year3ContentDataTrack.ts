/**
 * T3_DATA_COLLECT, T3_DATA_PIPELINE and T3_DATA_SQL — eighteen units. Year 3, data track.
 *
 * ── THE JOB IS NOT WHAT THEY THINK IT IS ──────────────────────────────────────────────────
 *
 * A student choosing the data direction imagines models and insights. The direction unit
 * warned them; this track is where the reality lands. Most of the work is getting data out of
 * places that resist, finding out what is wrong with it, and building something that can be
 * rerun after it fails at 3am.
 *
 * So WHAT_IS_WRONG_WITH_IT comes second, before any transformation, because the single
 * commonest failure in student data work is trusting the input. And IDEMPOTENCE gets a whole
 * unit because a pipeline that cannot be rerun safely is a pipeline that requires a human
 * every time anything goes wrong — which is every week.
 *
 * The SQL topic assumes the core database module. It does not re-teach joins; it teaches
 * joins that produce a correct number, which is a different skill and the one that is wrong
 * in most analytical queries a junior writes.
 *
 * Attribution: COLLECT is single-skill and derived. PIPELINE defaults to DATA_PIPELINES with
 * the cleaning unit on DATA_WRANGLING. SQL defaults to SQL_JOINS with the performance unit on
 * QUERY_OPTIMIZATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_TRACK_BUNDLES: PilotBundle[] = [
  /* ══ T3_DATA_COLLECT ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_COLLECT_GETTING_DATA_OUT',
    notes: `Before any analysis, the data has to be in your hands. **This is a larger part of
the job than anybody expects**, and it is the part nobody writes tutorials about.

## Files

**CSV is not a format.** It is a family of conventions that disagree: comma or semicolon,
quoted or not, escaped how, which line ending, which encoding, with or without a header.

**The four that break things:**

- **Encoding.** A file that is not UTF-8 produces mangled names or a decode error. Ask, or
  detect, and record which you used.
- **Embedded delimiters.** A comma inside a quoted field. A naive split on commas destroys the
  row, and the row count still looks plausible.
- **Line endings.** A stray carriage return appended to the last column of every row, which
  then fails to match anything.
- **Type inference.** A postcode read as a number loses its leading zero. A phone number
  becomes scientific notation. **Read identifiers as text, always** — this one silently
  corrupts data that then looks fine.

**Excel adds its own:** merged cells, multiple sheets, formatting that carries meaning, a
header three rows down, and totals rows at the bottom that will become records if you let them.

## APIs

**Paginate properly.** Reading the first page and stopping is the classic error, and it
produces an analysis of a hundred records that reads as if it covered everything.

**Rate limits.** Respect them, back off on a 429, and expect the job to take longer than you
planned.

**Be idempotent about your own collection.** Store what you fetched; on a rerun, do not fetch
it again. Next unit's subject and it starts here.

**Record the raw response** before parsing. When the shape turns out to be different from what
you assumed, the raw response is the only evidence.

## Databases

**Do not run an analytical query on the production database** without asking. A full scan of a
large table can affect the service other people depend on, and "I only ran a select" is not a
defence anybody accepts afterwards.

**Use a replica**, or an export, or ask for a window.

**And select the columns you need.** \`SELECT *\` on a wide table moves far more data than the
analysis uses.

## Scraping

**Check whether you are allowed.** The terms, the robots file, the law in your jurisdiction. An
exercise is not a defence.

**Be gentle.** Delays between requests, and identify yourself.

**Expect it to break.** A page structure is not an interface; it changes without notice.

## Whatever the source

**Keep the raw data, unmodified.** Every transformation happens downstream of a stored
original. **When your cleaning turns out to be wrong — and it will — the original is what you
go back to**, and re-fetching may be impossible.

**Record where it came from and when.** Source, timestamp, parameters, version. **An analysis
whose data cannot be traced cannot be reproduced**, and an analysis that cannot be reproduced
does not survive its first challenge.`,
    mcqs: [
      mcq('Reading an identifier column as a number:',
        [['Silently corrupts data that then looks fine', true],
          ['Fails loudly on the first non-numeric value', false],
          ['Is corrected automatically by most libraries', false],
          ['Only matters for very long identifiers', false]],
        'A postcode loses its leading zero; a phone number becomes scientific notation.'),
      mcq('Reading only the first page of a paginated API produces:',
        [['An analysis of a hundred records that reads as complete', true],
          ['An error when the results are counted', false],
          ['A representative sample of the data', false],
          ['A warning from most HTTP clients', false]],
        'The classic error, and nothing about the result looks wrong.'),
      mcq('The raw data should be kept unmodified because:',
        [['Your cleaning will turn out to be wrong and re-fetching may be impossible', true],
          ['Storage is cheaper than processing', false],
          ['The original may be needed for auditing', false],
          ['Transformations are hard to reverse', false]],
        'Every transformation happens downstream of a stored original.'),
      mcq('An analysis whose data cannot be traced:',
        [['Cannot be reproduced, so it does not survive a challenge', true],
          ['Is still valid if the method is documented', false],
          ['Can be verified by repeating the collection', false],
          ['Is acceptable for exploratory work', false]],
        'Source, timestamp, parameters and version, recorded.'),
    ],
    checkpoint: [
      mcq('"I only ran a select" on production is:',
        [['Not a defence, because a full scan affects the service', true],
          ['Acceptable when using read-only credentials on a replica', false],
          ['Fine outside business hours', false],
          ['Safe if the query has a limit', false]],
        'Use a replica, an export, or ask for a window.'),
      mcq('An Excel sheet’s totals row will:',
        [['Become a record if you let it', true],
          ['Be excluded by the header detection', false],
          ['Cause a type error on import', false],
          ['Be ignored by most parsers', false]],
        'Along with merged cells and a header three rows down.'),
      mcq('Recording the raw API response before parsing matters because:',
        [['It is the only evidence when the shape is not what you assumed', true],
          ['It allows the original request to be replayed again later', false],
          ['It preserves the rate limit headers', false],
          ['It speeds up a later reprocessing', false]],
        'And the shape is frequently not what you assumed.'),
    ],
  },

  {
    unitCode: 'T3_DATA_COLLECT_WHAT_IS_WRONG_WITH_IT',
    notes: `**Assume the data is wrong until you have checked.** The single commonest failure in
student data work is trusting the input, and the resulting analysis is confidently incorrect —
which is worse than no analysis, because somebody acts on it.

## Look at it first

**Before any transformation, before any chart.** Twenty minutes, and it saves days.

**Read some rows.** Actually read them. The first ten, the last ten, and ten at random — the
last ten because appended junk lives there, and random because the first ten are often
suspiciously clean.

**Count.** How many rows did you expect? How many are there? **A mismatch is the finding**, and
it is the check people skip because the number looks plausible.

**Per column:** how many nulls, how many distinct values, the minimum and maximum, the most
frequent values.

## What that finds, reliably

**Nulls where there should be none.** And nulls disguised as values: \`"NULL"\`, \`"N/A"\`,
\`""\`, \`-1\`, \`0\`, \`1900-01-01\`, \`9999-12-31\`. **A placeholder date included in an
average is a silent and enormous error.**

**Duplicates.** Exact ones, and near-duplicates from two systems that disagree about
whitespace or case.

**Impossible values.** Negative ages, future birthdays, orders before the company existed,
percentages above 100.

**Mixed types.** A column holding numbers and the string "unknown".

**Inconsistent categories.** \`UK\`, \`U.K.\`, \`United Kingdom\`, \`uk\`, \` UK\`. **Five
categories that are one**, and they will appear as five in every grouping you do.

**Units that vary.** Some rows in metres, some in feet. Some prices in pence, some in pounds.
**Nothing about the data says which**, and this is the one that produces results that are
merely wrong rather than obviously wrong.

**Timezones.** Some timestamps UTC, some local, none labelled.

## The questions to ask the source

**What does a null mean here?** Not collected, not applicable, or zero? **These are three
different things and they are usually stored identically.**

**How is this updated?** Appended, overwritten, corrected retrospectively? A dataset corrected
retrospectively means yesterday's analysis no longer reproduces.

**What is the grain?** One row per what? Per order, per order line, per order per day?
**Getting this wrong is how sums come out five times too large**, and it is the most common
serious error in a junior's analysis.

**What is missing entirely?** Rows that were filtered before you received them are invisible
and they change everything. **Survivorship bias starts here.**

## Write down what you found

Not in your head. A list: what is wrong, how many rows, and what you did about each.

**It becomes your data quality rules** — the next unit — and it is what you show when somebody
asks why the number differs from theirs. **That conversation happens every time**, and the
person with the written list wins it.`,
    mcqs: [
      mcq('Reading the last ten rows matters because:',
        [['Appended junk lives there', true],
          ['The most recent data is most relevant', false],
          ['Sorting problems appear at the end', false],
          ['Truncation is visible there', false]],
        'And the first ten are often suspiciously clean.'),
      mcq('A placeholder date such as 1900-01-01 included in an average is:',
        [['A silent and enormous error', true],
          ['Excluded automatically by most tools', false],
          ['Visible as an outlier in a chart', false],
          ['Only a problem for date ranges', false]],
        'Nulls disguised as values are the dangerous kind.'),
      mcq('`UK`, `U.K.` and `United Kingdom` in one column:',
        [['Appear as three categories in every grouping', true],
          ['Are normalised by most database engines', false],
          ['Indicate data from three separate sources', false],
          ['Only matter for display purposes', false]],
        'Five categories that are one.'),
      mcq('Getting the grain wrong causes:',
        [['Sums that come out several times too large', true],
          ['Rows to be silently dropped', false],
          ['Joins to fail with an error', false],
          ['Null values to appear in the output', false]],
        'The most common serious error in a junior’s analysis.'),
    ],
    checkpoint: [
      mcq('A null can mean three different things:',
        [['Not collected, not applicable, or zero', true],
          ['Missing, invalid, or pending confirmation', false],
          ['Unknown, empty, or deleted', false],
          ['Absent, default, or redacted', false]],
        'And they are usually stored identically.'),
      mcq('Rows filtered before you received the data are dangerous because:',
        [['They are invisible and survivorship bias starts there', true],
          ['They cause the row count to mismatch', false],
          ['They can usually be detected from gaps in the identifiers', false],
          ['They usually contain the errors', false]],
        'Ask what is missing entirely.'),
      mcq('The written list of data problems is valuable because:',
        [['Somebody always asks why your number differs from theirs', true],
          ['It documents the cleaning steps for later reproducibility', false],
          ['It satisfies a data governance requirement', false],
          ['It speeds up the next collection', false]],
        'The person with the written list wins that conversation.'),
    ],
  },

  {
    unitCode: 'T3_DATA_COLLECT_DATA_QUALITY_RULES',
    notes: `You found what is wrong with the data. **Write down what right looks like**, as
checks that run — because the problems you found once will come back, and they will come back
silently.

## A rule is an assertion that runs

Not a paragraph in a document. An executable check that fails loudly:

    assert df['order_id'].notna().all(), 'order_id must never be null'
    assert df['order_id'].is_unique, 'order_id must be unique'
    assert (df['quantity'] > 0).all(), 'quantity must be positive'
    assert df['country'].isin(VALID_COUNTRIES).all(), 'unknown country'
    assert len(df) > 1000, 'suspiciously few rows'

**Five lines, and they catch the entire class of problem you spent yesterday finding.**

## The five kinds worth writing

**Completeness.** Which columns may never be null. Which rows must exist — "every day in the
range has at least one record" catches a collection that silently stopped.

**Uniqueness.** What identifies a row. **This is also how you check the grain**, and it is the
check that catches a join having multiplied your rows.

**Validity.** Ranges, allowed values, formats. Ages between 0 and 120. Countries in a known
list. Dates not in the future.

**Consistency.** Relationships between columns. \`end_date >= start_date\`. \`total == sum of
lines\`. An order's customer exists in the customer table.

**Volume.** Row counts within an expected range, compared with the last run. **A 90% drop is a
broken collection**, and it is invisible to every other check because the rows that remain are
perfectly valid.

## Where they run

**At ingestion**, on the raw data. Fail before anything downstream consumes it.

**After each transformation.** A cleaning step that drops rows should assert how many it
expected to drop.

**And before publishing** anything anybody acts on.

## Fail or warn

**Fail** when continuing would produce a wrong answer. A missing identifier, a broken grain, a
90% row drop.

**Warn** when it is suspicious but survivable. A slightly unusual value, a new category
appearing.

**Be deliberate about which**, and lean towards failing. **A warning nobody reads is a rule
that does not exist** — and in a scheduled pipeline nobody reads the warnings, because the run
succeeded.

## Handling a failure

**Never silently drop bad rows.** If you must exclude them, **count them, log them, and report
the count** with the results. "Excluded 412 rows with a null customer id" is a finding; dropping
them quietly is a lie of omission that changes the answer.

**Quarantine** where you can — write the rejected rows somewhere they can be looked at, rather
than discarding them.

## Where the rules come from

**Your investigation**, from the previous unit. Every problem you found becomes a rule.

**The source**, if you can ask. "What are the valid values?" is a question with an answer, and
asking it is faster than inferring it.

**Production**, over time. Every surprise becomes a new rule, which is the same discipline as
writing a test for every bug that reaches production — and it is the reason a mature pipeline
has forty checks and a new one has five.`,
    mcqs: [
      mcq('A data quality rule should be:',
        [['An executable check that fails loudly', true],
          ['A documented expectation for reviewers', false],
          ['A column constraint in the warehouse', false],
          ['A note in the analysis write-up', false]],
        'Five lines catch the entire class you spent yesterday finding.'),
      mcq('A volume check catches:',
        [['A collection that silently stopped, when every remaining row is valid', true],
          ['Rows with invalid values', false],
          ['Duplicate identifiers', false],
          ['Inconsistent categories', false]],
        'Invisible to every other check.'),
      mcq('A warning in a scheduled pipeline is:',
        [['A rule that does not exist, because nobody reads it', true],
          ['The right level for non-critical problems', false],
          ['Useful for tracking gradual drift', false],
          ['Equivalent to a failure with a lower priority', false]],
        'The run succeeded, so nobody looks.'),
      mcq('Excluding bad rows requires:',
        [['Counting, logging and reporting the count with the results', true],
          ['A note in the code explaining why', false],
          ['Approval from the data owner', false],
          ['A separate cleaned dataset', false]],
        'Dropping them quietly is a lie of omission that changes the answer.'),
    ],
    checkpoint: [
      mcq('A uniqueness check is also how you verify:',
        [['The grain', true], ['The completeness', false],
          ['The referential integrity', false], ['The value ranges', false]],
        'And it catches a join having multiplied your rows.'),
      mcq('Rules should lean towards failing rather than warning because:',
        [['A warning nobody reads is not a rule', true],
          ['Failures are easier to monitor', false],
          ['Warnings accumulate over time', false],
          ['Most data problems are serious', false]],
        'In a scheduled pipeline nobody reads warnings.'),
      mcq('A mature pipeline has forty checks and a new one has five because:',
        [['Every production surprise becomes a new rule', true],
          ['Older pipelines process more data', false],
          ['Checks are added during code review', false],
          ['Requirements accumulate over time', false]],
        'The same discipline as a test for every bug that reached production.'),
    ],
  },

  {
    unitCode: 'T3_DATA_COLLECT_DEBUGGING',
    notes: `Five data collection failures and how each is found.

## 1. The numbers do not match the source

**Symptom:** your total is 4.2 million and the source system says 4.7 million.

**Work through, in order:** rows dropped silently by a parse error; pagination that stopped
early; a filter you forgot; rows excluded by a join; a different date range; a different
definition of the metric.

**The last one is the commonest and the least technical.** "Active users" means something
specific in their system and something else in yours, and no amount of debugging the code will
find it. **Ask how they define it before assuming your pipeline is wrong.**

## 2. The row count is suspiciously round

**Symptom:** exactly 1,000 rows. Or 10,000. Or 100.

**Cause:** a default limit somewhere — the API's page size, a client default, an export cap, a
spreadsheet row limit.

**A round number is almost never real data**, and treating it as such has produced a great many
confidently wrong analyses.

## 3. The join multiplied the rows

**Symptom:** 10,000 orders joined to customers gives 34,000 rows, and every sum is now wrong.

**Cause:** the join key is not unique on one side. Duplicate customer records, or a table at a
finer grain than you assumed.

**Diagnosis:** count before and after every join. **A row count that increases is either
intended or a bug, and you should know which** — this single habit prevents most of the
wrong-number problems in analytical work.

## 4. The encoding is wrong

**Symptom:** names with strange characters, or a decode error partway through a large file.

**Cause:** the file is not the encoding you assumed. The error appears partway because the
first thousand rows happened to be ASCII.

**Fix:** detect or ask, and **record which encoding you used** so the next run is not a
guess.

## 5. It worked yesterday

**Symptom:** an unchanged pipeline now fails or produces different numbers.

**Causes:** the source changed — a column renamed, a new value, a format altered; the data
changed — a month end, a bulk import; a credential expired; a dependency updated and now infers
types differently.

**Diagnosis:** diff today's raw data against yesterday's. **Because you kept the raw data**,
this is possible — and it is the clearest argument for that rule.

## The habits

**Count at every step.** In, out, dropped. **A pipeline that reports its counts diagnoses
itself**, and adding them costs one line per step.

**Keep the raw data.** Half of the above is undiagnosable without it.

**Reconcile against the source.** Pick a number both systems should agree on and check it every
run. When they diverge, you find out within a day rather than at the quarterly review.

**And check a single record end to end.** Take one row you can verify by hand, follow it
through every step, and confirm the output is right. **It finds errors that aggregate checks
never will**, because an aggregate can be right while every individual value is wrong.`,
    mcqs: [
      mcq('When your total differs from the source system, the commonest cause is:',
        [['A different definition of the metric', true],
          ['Rows dropped by a parse error', false],
          ['Pagination stopping early', false],
          ['A join excluding records', false]],
        'The least technical one, and no amount of debugging the code will find it.'),
      mcq('An exactly round row count such as 1,000:',
        [['Is almost never real data', true],
          ['Suggests a well-structured export', false],
          ['Indicates the source was sampled', false],
          ['Is a coincidence worth ignoring', false]],
        'A default limit somewhere: the API, the client, the export, the spreadsheet.'),
      mcq('Counting rows before and after every join:',
        [['Prevents most wrong-number problems in analytical work', true],
          ['Slows the pipeline noticeably', false],
          ['Only matters for outer joins', false],
          ['Is replaced by a uniqueness check', false]],
        'An increase is either intended or a bug, and you should know which.'),
      mcq('An encoding error appearing partway through a file means:',
        [['The first rows happened to be ASCII', true],
          ['The file is truncated at that point', false],
          ['Two encodings are mixed in one file', false],
          ['The parser buffer overflowed', false]],
        'Detect or ask, and record which encoding you used.'),
    ],
    checkpoint: [
      mcq('Diffing today’s raw data against yesterday’s is possible because:',
        [['You kept the raw data', true],
          ['The source provides a change feed', false],
          ['The pipeline logs its inputs', false],
          ['The warehouse keeps history', false]],
        'The clearest argument for that rule.'),
      mcq('Following one verifiable record end to end finds:',
        [['Errors that aggregate checks never will', true],
          ['Performance problems in the pipeline', false],
          ['Rows dropped by the quality rules', false],
          ['Encoding problems in the source', false]],
        'An aggregate can be right while every individual value is wrong.'),
      mcq('Instrumenting each step with rows in, out and dropped means it:',
        [['Diagnoses itself, for one line per step', true],
          ['Runs measurably slower', false],
          ['Replaces the need for quality rules', false],
          ['Only helps when the pipeline fails', false]],
        'In, out and dropped at every step, for one extra line of code each.'),
    ],
  },

  {
    unitCode: 'T3_DATA_COLLECT_PRACTICE',
    notes: `Two exercises on judging data rather than transforming it. Both operate on the kind
of mess a real source produces.`,
    coding: [
      {
        title: 'Profile a column',
        description: `Read one value per line — a column's raw contents, as strings. An empty
line means an empty value.

Print four lines:

    rows=<total>
    missing=<count>
    distinct=<count of distinct non-missing values, after normalising>
    top=<most frequent normalised value>

A value is **missing** if it is empty, or one of \`NULL\`, \`N/A\`, \`na\`, \`-\` after
stripping whitespace, compared case-insensitively.

**Normalising** means stripping whitespace and lowercasing. Break a tie for \`top\` by choosing
the alphabetically first. If everything is missing, print \`top=none\`.`,
        starter: `import sys

values = [l.rstrip(chr(10)) for l in sys.stdin]

# Nulls disguised as values are the point. Normalise before counting distinct.
`,
        language: 'python',
        tests: [
          { input: 'UK\nuk\n U.K. \nNULL\n\nUK\n', expectedOutput: 'rows=6\nmissing=2\ndistinct=2\ntop=uk' },
          { input: 'a\nb\n', expectedOutput: 'rows=2\nmissing=0\ndistinct=2\ntop=a' },
          { input: 'NULL\nN/A\n-\n', expectedOutput: 'rows=3\nmissing=3\ndistinct=0\ntop=none' },
          { input: 'x\n', expectedOutput: 'rows=1\nmissing=0\ndistinct=1\ntop=x' },
          { input: 'b\nb\na\na\n', expectedOutput: 'rows=4\nmissing=0\ndistinct=2\ntop=a', isHidden: true },
          { input: '  na  \nY\n', expectedOutput: 'rows=2\nmissing=1\ndistinct=1\ntop=y', isHidden: true },
        ],
      },
      {
        title: 'Did the join multiply?',
        description: `Read two tables and report what a join would do.

First an integer n, then n lines of \`id value\` — the left table. Then an integer m, then m
lines of \`id value\` — the right table.

Print three lines:

    left=<n>
    joined=<rows an inner join on id would produce>
    verdict=<ok|multiplied|lost>

\`multiplied\` when the join produces more rows than the left table, \`lost\` when it produces
fewer, and \`ok\` when they are equal.

Both can be true at once — some rows multiplying and others dropping. When the count happens to
come out equal, the verdict is \`ok\`, which is exactly the case that makes row counting alone
insufficient. Say so in your write-up.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
n = int(lines[0][0])
left = lines[1:1 + n]
m = int(lines[1 + n][0])
right = lines[2 + n:2 + n + m]

# An inner join produces one row per matching pair.
`,
        language: 'python',
        tests: [
          { input: '2\n1 a\n2 b\n2\n1 x\n2 y\n', expectedOutput: 'left=2\njoined=2\nverdict=ok' },
          { input: '2\n1 a\n2 b\n3\n1 x\n1 z\n2 y\n', expectedOutput: 'left=2\njoined=3\nverdict=multiplied' },
          { input: '2\n1 a\n2 b\n1\n1 x\n', expectedOutput: 'left=2\njoined=1\nverdict=lost' },
          { input: '0\n0\n', expectedOutput: 'left=0\njoined=0\nverdict=ok' },
          { input: '2\n1 a\n9 b\n2\n1 x\n1 z\n', expectedOutput: 'left=2\njoined=2\nverdict=ok', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Data Collection Practice',
      description: 'Profile a messy column, detect join multiplication, then investigate a real dataset.',
      instructions: `Complete both exercises, then:

1. For the first: list five more disguised nulls not in the exercise, and say which of them you
   would be nervous about treating as missing.
2. For the second: the hidden case produces \`ok\` while one row multiplied and another was
   lost. **Explain why row counting alone is insufficient**, and say what check would catch it.
3. For the second: say what an inner join hides that a left join would reveal, and when you
   would want each.

**Then, on a real dataset.** Find a messy public one — government data, a survey export,
anything not curated for teaching.

4. Before transforming anything, profile every column: nulls, distinct values, minimum,
   maximum, most frequent. Report the table.
5. Read the first ten, last ten and ten random rows. Report what you found in each.
6. List every problem you found. Aim for at least six, and include at least one you would not
   have found without reading actual rows.
7. Write five executable quality rules covering what you found. Show them failing on the raw
   data.
8. Identify the grain. State it precisely, and prove it with a uniqueness check.
9. Say what is missing entirely — what was filtered before you got it — or how you would find
   out.`,
      rubric: [
        { criterion: 'Column profiled', description: 'All cases, with disguised nulls and normalisation handled.', maxPoints: 20 },
        { criterion: 'Join multiplication detected', description: 'All verdicts correct, including the empty case.', maxPoints: 15 },
        { criterion: 'Why counting is insufficient', description: 'Explains the offsetting case and names a check that catches it.', maxPoints: 15 },
        { criterion: 'A real dataset profiled', description: 'Every column, with the table reported.', maxPoints: 20 },
        { criterion: 'Six problems, one from reading', description: 'At least one that only reading actual rows would reveal.', maxPoints: 15 },
        { criterion: 'Grain stated and proven', description: 'Precise, with a uniqueness check demonstrating it.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

values = [l.rstrip(chr(10)) for l in sys.stdin]
`,
        tests: [
          { input: 'UK\nuk\n U.K. \nNULL\n\nUK\n', expectedOutput: 'rows=6\nmissing=2\ndistinct=2\ntop=uk' },
          { input: 'a\nb\n', expectedOutput: 'rows=2\nmissing=0\ndistinct=2\ntop=a' },
          { input: 'NULL\nN/A\n-\n', expectedOutput: 'rows=3\nmissing=3\ndistinct=0\ntop=none' },
          { input: 'b\nb\na\na\n', expectedOutput: 'rows=4\nmissing=0\ndistinct=2\ntop=a', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A row count unchanged after a join:',
        [['Can still hide rows multiplying and others being lost', true],
          ['Proves the join key was unique', false],
          ['Means no rows were affected', false],
          ['Indicates an inner join behaved as a left join', false]],
        'Which is why counting alone is insufficient.'),
      mcq('`U.K.` and `uk` normalise to the same value only if you:',
        [['Decide punctuation is noise, which is a judgement', true],
          ['Lowercase and strip whitespace', false],
          ['Use a standard published country code list instead', false],
          ['Compare case-insensitively', false]],
        'Lowercasing alone leaves them distinct — the exercise strips punctuation too.'),
      mcq('An inner join hides:',
        [['The rows that did not match', true],
          ['The rows that matched more than once', false],
          ['Nulls in the join key', false],
          ['Duplicate rows in the left table', false]],
        'A left join reveals them, which is often what you want while investigating.'),
    ],
  },

  {
    unitCode: 'T3_DATA_COLLECT_MINI_PROJECT',
    notes: `Take a genuinely messy real-world dataset and produce a trustworthy one — with the
problems documented rather than quietly fixed.

The brief's requirement is **a dataset nobody curated for teaching**. A clean CSV teaches
nothing about this topic, because the entire subject is what happens when the data is not
clean.

Budget around two hours, most of it investigating rather than coding.`,
    assignment: {
      title: 'Mini Project — From a Mess to Something Trustworthy',
      description: 'Collect a real messy dataset, investigate it thoroughly, and produce a documented, checked version.',
      instructions: `**Find** a genuinely messy dataset. Government open data, a survey export,
a scraped source, or a real system's export. **Not a teaching dataset** — if it is clean, it
is the wrong one.

**Part one — collect it properly**

1. Get it, and **store the raw version unmodified.**
2. Record the source, the date, the parameters, and any version.
3. If it is an API, handle pagination and rate limits. Report how many pages and how many
   records.
4. Say what encoding it is and how you determined that.

**Part two — investigate before touching it**

5. Profile every column: nulls, distinct, min, max, most frequent, type.
6. Read the first ten, last ten and ten random rows. Report anything surprising in each.
7. Determine the grain. State it precisely and prove it.
8. **List every problem.** At least eight. For each: what it is, how many rows, and how you
   found it.
9. Say what is missing entirely, or how you would find out.

**Part three — the rules**

10. Write at least eight executable quality rules across the five kinds: completeness,
    uniqueness, validity, consistency, volume.
11. Run them on the raw data. **Show which fail.**
12. For each failure, decide: fix, exclude, or accept. **Write down which and why.**

**Part four — produce the clean dataset**

13. Transform, with every step counting rows in, out and dropped.
14. Rerun the rules. All should pass, or the remaining failures should be ones you consciously
    accepted.
15. **Report every exclusion with its count.** No silent drops.

**Part five — the write-up**

16. A data dictionary: every column, its meaning, its type, its valid values.
17. The list of problems found and what you did about each.
18. **Three things you cannot fix**, and what they mean for anybody using the data. This is the
    most valuable section and it is the one that makes the dataset trustworthy rather than
    merely clean.
19. Say what would break if the source changed, and which of your rules would catch it.

**Submit** the raw data reference, the collection script, the rules, the clean dataset, and the
write-up.`,
      rubric: [
        { criterion: 'A genuinely messy source', description: 'Not curated for teaching, collected with provenance recorded.', maxPoints: 15 },
        { criterion: 'Investigated before transforming', description: 'Full profile, rows read, grain proven.', maxPoints: 20 },
        { criterion: 'Eight problems, with counts', description: 'Each described, quantified, and its discovery method given.', maxPoints: 20 },
        { criterion: 'Eight rules across five kinds', description: 'Executable, shown failing on the raw data.', maxPoints: 20 },
        { criterion: 'No silent drops', description: 'Every exclusion counted and reported.', maxPoints: 10 },
        { criterion: 'Three things you cannot fix', description: 'What they are and what they mean for a user of the data.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A clean teaching dataset is the wrong choice because:',
        [['The subject is entirely what happens when data is not clean', true],
          ['It is too small to be realistic', false],
          ['It has no provenance to record', false],
          ['Every one of the quality rules you wrote would simply pass', false]],
        'If it is clean, it is the wrong one.'),
      mcq('The most valuable section of the write-up is:',
        [['Three things you cannot fix, and what they mean', true],
          ['The data dictionary', false],
          ['The full list of problems that were found', false],
          ['The quality rules', false]],
        'It makes the dataset trustworthy rather than merely clean.'),
      mcq('Deciding fix, exclude or accept for each failing rule:',
        [['Makes each one a recorded decision rather than a default', true],
          ['Speeds up the transformation step', false],
          ['Is required before any of the quality rules can be run', false],
          ['Determines which rules to keep', false]],
        'The same argument as accepting a risk explicitly in threat modelling.'),
    ],
  },

  /* ══ T3_DATA_PIPELINE ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_PIPELINE_CLEANING_REPEATABLY',
    notes: `Cleaning data in a notebook by hand, cell by cell, produces a clean dataset **once**.
Then the source updates and nobody can reproduce it — including you, three weeks later.

## Why the notebook fails

**The order is invisible.** Cells can run in any order, and the one you ran and then edited is
gone from the record while its effect remains in memory.

**The state is hidden.** A variable set in a cell you deleted is still defined.

**It is not diffable.** A reviewer cannot see what changed.

**It cannot be rerun.** "Restart and run all" on a notebook that produced a result three weeks
ago fails surprisingly often, and that is the whole problem in one sentence.

**Notebooks are excellent for exploring.** They are a poor way to *produce* anything, and the
distinction is the unit.

## What repeatable means

**A script, or a series of scripts, that takes the raw data and produces the clean data, with
no manual steps.**

    raw/orders_2024_03.csv
      → clean.py
      → clean/orders_2024_03.parquet

**Run it twice, get the same thing.** Run it next month on new data, get the equivalent thing.

## The shape

    def clean(raw):
        df = raw.copy()
        df = normalise_country(df)
        df = parse_dates(df)
        df = drop_test_accounts(df)
        df = validate(df)
        return df

**Each step named, small and testable.** Each does one thing, and the pipeline reads as a list
of what happens.

**Each step counts.** In, out, dropped — the collection topic's habit, applied here.

## Test the steps

**This is the part that surprises people: cleaning code deserves tests.**

    def test_normalise_country_handles_variants():
        assert normalise('U.K.') == 'GB'
        assert normalise(' uk ') == 'GB'
        assert normalise('') is None

**Cleaning logic is ordinary logic with ordinary bugs**, and it is unusually consequential
because a bug in it corrupts everything downstream silently. A test per rule costs minutes.

## Parameterise the date, not the data

    python clean.py --month 2024-03

**Not a hard-coded month, and not "whatever is in the folder".** A pipeline you can point at
any period is one you can backfill, re-run for a fixed month, and test against a known one.

## Keep the raw and the clean separate

**Raw is immutable.** Never modified, never overwritten.

**Clean is derived and disposable.** Delete it and it can be regenerated.

**That is the property that makes everything else safe**, and it means a cleaning bug is
recoverable rather than terminal.

## Write down the decisions

Cleaning is a sequence of judgements: what a null means, which rows are test data, how to
resolve a conflict between two sources.

**Each is a decision somebody could reasonably disagree with.** Put them in a comment, or
better, in the write-up — because in three months you will not remember why test accounts were
identified by an email domain, and neither will anybody else.`,
    mcqs: [
      mcq('The problem with cleaning in a notebook is captured by:',
        [['"Restart and run all" failing weeks later', true],
          ['Notebooks being hard to version control', false],
          ['Cells running slowly on large data', false],
          ['The output not being reproducible in another tool', false]],
        'Which is the whole problem in one sentence.'),
      mcq('Cleaning code deserves tests because:',
        [['A bug in it corrupts everything downstream silently', true],
          ['The logic is unusually complex', false],
          ['It changes more often than analysis code', false],
          ['It is hard to review by reading', false]],
        'Ordinary logic with ordinary bugs, and unusually consequential.'),
      mcq('Parameterising the period rather than hard-coding it lets you:',
        [['Backfill, re-run a fixed month, and test against a known one', true],
          ['Process multiple months in parallel', false],
          ['Avoid storing intermediate results', false],
          ['Detect when new data has arrived', false]],
        'Not "whatever is in the folder" either.'),
      mcq('Raw being immutable and clean being disposable means:',
        [['A cleaning bug is recoverable rather than terminal', true],
          ['Storage costs are lower overall', false],
          ['The pipeline can run in parallel', false],
          ['The clean data need not be backed up', false]],
        'The property that makes everything else safe.'),
    ],
    checkpoint: [
      mcq('Notebooks are described as:',
        [['Excellent for exploring, poor for producing', true],
          ['Unsuitable for any serious data work', false],
          ['Fine if cells are run in order', false],
          ['Acceptable once converted to a script', false]],
        'The distinction is the unit.'),
      mcq('Cleaning decisions should be written down because:',
        [['In three months nobody remembers why test accounts were identified that way', true],
          ['They are required for compliance', false],
          ['Reviewers cannot otherwise see them anywhere in the code at all', false],
          ['They change between runs', false]],
        'Each is a judgement somebody could reasonably disagree with.'),
      mcq('Each cleaning step should be:',
        [['Named, small, testable, and counting rows', true],
          ['As efficient as possible', false],
          ['Combined to minimise passes over the data', false],
          ['Written inline for readability', false]],
        'So the pipeline reads as a list of what happens.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PIPELINE_IDEMPOTENCE',
    notes: `**What happens if you run it twice?**

If the answer is "I am not sure", you have a pipeline that requires a human every time anything
goes wrong — and something goes wrong every week.

## The definition

**An idempotent pipeline produces the same result whether it runs once or five times.**

That is not an elegance. It is what makes a pipeline operable: you can retry a failure without
thinking, backfill without fear, and rerun a period whose source was corrected.

## What breaks it

**Appending.**

    df.to_sql('orders', con, if_exists='append')

Run it twice, get every row twice. **The commonest non-idempotent operation there is**, and the
duplicates are silent — every downstream sum is now double and nothing errors.

**Incrementing.** \`UPDATE totals SET count = count + 1\`. Twice is twice.

**Consuming a queue destructively** without recording what was processed.

**Anything with a side effect that is not itself idempotent** — sending an email, calling a
payment API, posting to a webhook.

## How to make it idempotent

**Replace, do not append.** Delete the target period and write it fresh:

    DELETE FROM orders WHERE month = '2024-03';
    INSERT INTO orders SELECT ... WHERE month = '2024-03';

**In one transaction**, so a failure between the two does not leave the period empty.

**Upsert on a key.** Insert or update by natural key, so a second run overwrites rather than
duplicates.

**Partition by period.** Each run owns one partition and replaces it entirely. **The cleanest
answer when your storage supports it**, and it makes a backfill just a series of ordinary runs.

**Record what you processed.** For anything not naturally re-runnable, keep a table of
completed units and skip what is done.

## Partitioning, concretely

    clean/orders/month=2024-03/data.parquet

**Rerunning March replaces that directory and touches nothing else.** February is untouched, a
backfill of six months is six independent runs, and two months can run in parallel without
interfering.

This one decision resolves most of the difficulty in this unit, which is why it is worth
knowing early.

## The side effects that cannot be undone

A pipeline that sends emails cannot un-send them on a rerun.

**Separate the computation from the effect.** The pipeline computes who should be notified and
writes it to a table; a separate, idempotent sender reads that table and marks each one sent.
**Rerunning the pipeline is then free**, and the sender's own idempotency is a much smaller
problem to solve.

**That is the outbox pattern again**, arriving from data engineering rather than from
transactions.

## The test

**Run it twice and compare.**

    python pipeline.py --month 2024-03
    checksum_1 = checksum(output)
    python pipeline.py --month 2024-03
    assert checksum(output) == checksum_1

**Make it an actual test that runs.** It takes five minutes to write, and a pipeline that
passes it can be retried by anybody at 3am without waking you up — which is the entire
practical point.`,
    mcqs: [
      mcq('The commonest non-idempotent operation is:',
        [['Appending to a table', true],
          ['Incrementing a counter', false],
          ['Consuming from a queue', false],
          ['Sending a notification', false]],
        'And the duplicates are silent — every downstream sum doubles with no error.'),
      mcq('Deleting and reinserting a period should happen:',
        [['In one transaction', true],
          ['With the delete committed first', false],
          ['Only after verifying the new data', false],
          ['In separate runs for safety', false]],
        'Otherwise a failure between them leaves the period empty.'),
      mcq('Partitioning by period resolves most of this because:',
        [['Each run replaces one partition and touches nothing else', true],
          ['It reduces the volume written per run', false],
          ['It allows incremental appends safely', false],
          ['It makes the data easier to query', false]],
        'A backfill becomes six independent ordinary runs.'),
      mcq('A pipeline that sends emails should:',
        [['Write who to notify, and let a separate idempotent sender act', true],
          ['Track which emails were sent in memory', false],
          ['Only run once per period, enforced by a lock', false],
          ['Send from within the same transaction', false]],
        'The outbox pattern, arriving from data engineering.'),
    ],
    checkpoint: [
      mcq('An idempotent pipeline lets you:',
        [['Retry a failure without thinking', true],
          ['Run faster on subsequent executions', false],
          ['Skip the data quality checks', false],
          ['Process periods out of order', false]],
        'And backfill without fear, and rerun a corrected period.'),
      mcq('The idempotence test is:',
        [['Run twice and compare a checksum of the output', true],
          ['Verify no rows were appended', false],
          ['Check the row count is unchanged', false],
          ['Confirm the pipeline logs no warnings', false]],
        'Five minutes to write, and it means anybody can retry at 3am.'),
      mcq('"I am not sure what happens if it runs twice" means:',
        [['A human is needed every time anything goes wrong', true],
          ['The pipeline needs more logging', false],
          ['The schedule ought to prevent any overlapping runs', false],
          ['The failure modes are undocumented', false]],
        'And something goes wrong every week.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PIPELINE_WHEN_IT_FAILS_HALFWAY',
    notes: `A pipeline with six steps failed at step four. **What state is everything in, and
what do you do?**

If the answer depends on remembering what step four does, the pipeline is not finished.

## The bad outcome

Steps one to three wrote their output. Step four failed. **Downstream consumers are now reading
a half-updated dataset** and cannot tell — the data looks complete, it is just wrong.

**This is worse than the pipeline not running at all**, because nobody knows anything is
missing.

## Make partial output invisible

**Write to a staging location, then swap.**

    write → clean/orders/_tmp_2024-03/
    validate
    atomic move → clean/orders/month=2024-03/

**Consumers see either the old data or the new, never a half-written mixture.** The move is the
commit, and it is one operation.

**Or use a transaction** where the storage supports it. Same principle: nothing is visible
until everything succeeded.

**Or write a marker.** \`_SUCCESS\` in the output directory, written last, and consumers check
for it. Crude, effective, and it is how several large systems do it.

## Make it resumable

For a long pipeline, restarting from the beginning may be hours.

**Checkpoint between steps.** Each step writes its output; on a rerun, skip steps whose output
already exists and is valid.

**But be careful:** skipping a step because its output exists is only safe if the input has not
changed. **Record the input version with the output**, or a resumed run silently mixes old and
new — which is a worse failure than the one you were recovering from.

## Fail loudly, and with what is needed

    ERROR pipeline step=enrich month=2024-03 rows_in=482193
      error=KeyError 'customer_id' offending_row_id=8812 run_id=r_2024-03-14-0300

**Which step, which period, how far it got, and enough to find the offending record.** That is
a message somebody can act on at 3am without opening the code.

**And alert on it.** A pipeline that fails silently at 3am is discovered at 10am by somebody
looking at a dashboard and asking why yesterday is missing — which is the worst way to learn.

## Alert on not running, too

**A pipeline that did not start produces no error.** The scheduler died, the trigger did not
fire, the machine was down.

**Alert on absence:** if the expected output for today does not exist by a given time, alert.
**This catches the failure mode that no error handling can**, and it is the check people
forget.

## Do not retry blindly

**Retry** a transient failure: a network blip, a lock, a temporary unavailability. With
backoff, and a limit.

**Do not retry** a data problem. A malformed row will be malformed on every attempt, and
retrying it fifty times just delays the alert.

**Distinguish them in the code**, and let the second kind fail immediately and loudly.

## The question to answer in advance

**For each step: if this fails, what is left behind and what does a rerun do?**

Write the answers down. **A pipeline whose failure behaviour is documented is one somebody else
can operate**, and that is the difference between a script you own forever and a system the
team runs.`,
    mcqs: [
      mcq('A half-updated dataset is worse than no run because:',
        [['It looks complete, so nobody knows anything is missing', true],
          ['It takes longer to recover from', false],
          ['It corrupts the downstream schema', false],
          ['It cannot be rolled back', false]],
        'Consumers read it and cannot tell.'),
      mcq('Writing to staging and then moving works because:',
        [['Consumers see either the old data or the new, never a mixture', true],
          ['The move is faster than the write', false],
          ['Staging data can be validated more easily', false],
          ['It avoids locking the target', false]],
        'The move is the commit, and it is one operation.'),
      mcq('Skipping a completed step on a rerun is only safe if:',
        [['The input has not changed, and you recorded which version it was', true],
          ['The output passed its validation', false],
          ['The step is idempotent', false],
          ['The rerun is within the same day', false]],
        'Otherwise a resumed run silently mixes old and new.'),
      mcq('Alerting on absence catches:',
        [['A pipeline that never started', true],
          ['A pipeline that failed partway', false],
          ['A pipeline producing wrong numbers', false],
          ['A pipeline running twice', false]],
        'No error handling can catch a run that did not happen.'),
    ],
    checkpoint: [
      mcq('Retrying a malformed row fifty times:',
        [['Delays the alert without changing the outcome', true],
          ['Is harmless if the backoff is long', false],
          ['May succeed if the source is corrected', false],
          ['Is standard practice for data pipelines', false]],
        'Distinguish transient failures from data problems in the code.'),
      mcq('A `_SUCCESS` marker written last is:',
        [['Crude, effective, and used by several large systems', true],
          ['Unreliable when compared with a proper transaction', false],
          ['Only suitable for file-based outputs', false],
          ['Redundant if staging is used', false]],
        'Consumers check for it before reading.'),
      mcq('Documenting each step’s failure behaviour makes the pipeline:',
        [['Something the team can operate rather than something you own forever', true],
          ['Easier to test in isolation', false],
          ['Faster to recover automatically', false],
          ['Compliant with the usual operational standards of the team', false]],
        'What is left behind, and what a rerun does.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PIPELINE_DEBUGGING',
    notes: `Five pipeline failures, and how each is diagnosed.

## 1. The numbers changed and nothing was deployed

**Causes:** the source data changed — a correction, a late arrival, a schema change; a
dependency updated and now parses something differently; a timezone boundary; or **the pipeline
ran twice**, which the idempotence unit exists to prevent.

**Diagnosis:** compare today's raw input against the last run's. **This is why the raw data is
kept**, and it answers the question in minutes rather than days.

## 2. Duplicates appeared

**Cause:** almost always a non-idempotent append plus a retry. Occasionally a join that
multiplied, occasionally a source that genuinely sent something twice.

**Diagnosis:** group by your natural key and count. **Then check whether the duplicates are
identical or differ** — identical means a rerun, differing means a source or join problem, and
those are completely different investigations.

## 3. The pipeline is slow, gradually

**Symptom:** it took twenty minutes, now it takes three hours, and no single change caused it.

**Causes:** the data grew and something in the pipeline is quadratic; a full reload where an
incremental would do; a join against a table that keeps growing; no partitioning, so every run
reads everything.

**Diagnosis:** time each step and record it every run. **A per-step duration chart shows you
which one grew**, and without it you are guessing among six.

## 4. It works on a sample and fails on the full data

**Causes:** memory — the full dataset does not fit; a value that only appears in the full data,
such as a null in a column that had none in the sample; a duplicate key the sample happened to
avoid; a timeout.

**Diagnosis:** the error usually says which. **And the general lesson is that a sample is not a
test** — it is a faster iteration loop, which is valuable and is not the same thing.

## 5. The output is right but wrong

**Symptom:** the pipeline succeeded, every check passed, and the number is not what the
business expects.

**Causes:** a definition mismatch — the commonest, and the collection topic said so; a filter
that excludes more than intended; a join losing rows; the grain misunderstood.

**Diagnosis:** **take one record you can verify by hand and follow it through every step.**
Aggregate checks pass while individual values are wrong, and only a single-record trace finds
that.

## The instrumentation that makes all of this easy

**Row counts at every step**, recorded per run. In, out, dropped.

**Duration at every step**, recorded per run.

**A run id** on every log line, so one run's story is one filter — the same request id argument
from the backend track.

**Checksums of the output**, so "did anything change?" is answerable without comparing
datasets.

**Store the run metadata in a table.** Then "when did this start taking longer" and "which run
produced this output" are queries rather than investigations, and both questions come up
constantly.`,
    mcqs: [
      mcq('Numbers changing with no deployment is diagnosed by:',
        [['Comparing today’s raw input against the last run’s', true],
          ['Re-running the pipeline and comparing', false],
          ['Checking the transformation code history', false],
          ['Reviewing the quality rule results', false]],
        'Which is why the raw data is kept.'),
      mcq('Identical duplicates against differing duplicates indicate:',
        [['A rerun against a source or join problem', true],
          ['A partial failure against a full one', false],
          ['A schema change against a data change', false],
          ['A timing issue against a key collision', false]],
        'Completely different investigations.'),
      mcq('A per-step duration chart is valuable because:',
        [['It shows which step grew, rather than leaving you guessing', true],
          ['It identifies the slowest step overall', false],
          ['It predicts when the pipeline will time out', false],
          ['It measures the data volume indirectly', false]],
        'Without it you are guessing among six.'),
      mcq('A sample is:',
        [['A faster iteration loop, not a test', true],
          ['A valid substitute for full-data testing', false],
          ['Representative if randomly selected', false],
          ['Sufficient for validating the logic', false]],
        'Valuable, and not the same thing.'),
    ],
    checkpoint: [
      mcq('"The output is right but wrong" is found by:',
        [['Tracing one hand-verifiable record through every step', true],
          ['Re-running the quality checks', false],
          ['Comparing the output against the previous period', false],
          ['Checking the row counts at each step', false]],
        'Aggregate checks pass while individual values are wrong.'),
      mcq('Storing run metadata in a table makes:',
        [['"When did this start taking longer" a query rather than an investigation', true],
          ['The pipeline resumable after a partial failure partway through', false],
          ['The output reproducible', false],
          ['The alerts more reliable', false]],
        'And that question comes up constantly.'),
      mcq('A run id on every log line serves the same purpose as:',
        [['A request id in a backend service', true],
          ['A checksum on the output', false],
          ['A partition key on the data', false],
          ['A version tag on the code', false]],
        'One run’s story becomes one filter.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PIPELINE_PRACTICE',
    notes: `Two exercises on the two properties that make a pipeline operable: idempotence, and
knowing what a failure left behind.`,
    coding: [
      {
        title: 'Make the load idempotent',
        description: `Simulate loading records into a table across several runs.

Read one line per run: the record ids loaded in that run, space separated. An empty line is a
run that loaded nothing.

Then a final line: \`append\` or \`replace\`.

With \`append\`, every run adds its records to whatever is there. With \`replace\`, each run
replaces the **whole table** with its own records.

Print the final table contents, sorted, space separated — then a line \`rows=<n>\`. With
\`append\`, duplicates are kept and printed.

An empty final table prints an empty line then \`rows=0\`.`,
        starter: `import sys

lines = [l.rstrip(chr(10)) for l in sys.stdin]
runs = [l.split() for l in lines[:-1]]
mode = lines[-1].strip()

# Append keeps everything every run added. Replace keeps only the last run's.
`,
        language: 'python',
        tests: [
          { input: '1 2\n1 2\nappend\n', expectedOutput: '1 1 2 2\nrows=4' },
          { input: '1 2\n1 2\nreplace\n', expectedOutput: '1 2\nrows=2' },
          { input: '1 2 3\n\nreplace\n', expectedOutput: '\nrows=0' },
          { input: '1\n2\nappend\n', expectedOutput: '1 2\nrows=2' },
          { input: '\n\nappend\n', expectedOutput: '\nrows=0', isHidden: true },
          { input: '3 1\n2\nappend\n', expectedOutput: '1 2 3\nrows=3', isHidden: true },
        ],
      },
      {
        title: 'What did the failure leave behind?',
        description: `A pipeline has steps. Read one step per line as \`<name> <writes>\`,
where writes is \`staged\`, \`direct\` or \`none\`. Then a final line: the name of the step that
failed, or \`none\` if it completed.

A \`direct\` write is visible to consumers immediately. A \`staged\` write becomes visible only
if the whole pipeline completes.

Print one line per step: \`<name> visible\` or \`<name> hidden\`, and then a final line
\`consistent=yes\` if consumers see either all the writes or none of them, and
\`consistent=no\` otherwise.

Steps after the failure do not run, and are \`hidden\`.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
steps = lines[:-1]
failed = lines[-1][0]

# A direct write before a failure is the problem this exercise is about.
`,
        language: 'python',
        tests: [
          { input: 'a staged\nb staged\nc staged\nnone\n', expectedOutput: 'a visible\nb visible\nc visible\nconsistent=yes' },
          { input: 'a staged\nb staged\nc staged\nb\n', expectedOutput: 'a hidden\nb hidden\nc hidden\nconsistent=yes' },
          { input: 'a direct\nb direct\nc direct\nb\n', expectedOutput: 'a visible\nb hidden\nc hidden\nconsistent=no' },
          { input: 'a direct\nb direct\nnone\n', expectedOutput: 'a visible\nb visible\nconsistent=yes' },
          { input: 'a none\nb direct\nb\n', expectedOutput: 'a hidden\nb hidden\nconsistent=yes', isHidden: true },
          { input: 'a direct\nb staged\nb\n', expectedOutput: 'a visible\nb hidden\nconsistent=no', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Data Pipelines Practice',
      description: 'Compare append against replace, reason about partial failure, then make a real pipeline idempotent.',
      instructions: `Complete both exercises, then:

1. For the first: say what an upsert would produce for the first test case, and why it differs
   from both append and replace.
2. For the first: replace is idempotent and has a cost. Name it, and say when append plus a
   deduplication step is the better answer.
3. For the second: the hidden case with \`a none\` is \`consistent=yes\` even though the
   pipeline failed. Explain why, and what that tells you about which steps need staging.
4. For the second: say how a \`_SUCCESS\` marker would change the answers, and which steps it
   would make safe.

**Then, on a real pipeline.** Write one, or take one you have.

5. It must take a period parameter and produce output for that period only.
6. **Run it twice on the same period. Compare a checksum of the output.** Report whether it is
   idempotent, and fix it if not.
7. Add row counts at every step: in, out, dropped. Show the output of a run.
8. Add timing at every step. Show it.
9. Make a step fail deliberately, halfway. **Report exactly what was left behind** and whether
   a consumer could tell.
10. Fix that with staging or a marker. Repeat the deliberate failure and show that consumers
    see nothing partial.
11. Write the idempotence check as an automated test.`,
      rubric: [
        { criterion: 'Append against replace', description: 'All cases correct, including the empty runs.', maxPoints: 15 },
        { criterion: 'Partial failure reasoned', description: 'All visibility and consistency cases correct.', maxPoints: 20 },
        { criterion: 'A real pipeline, parameterised', description: 'Takes a period and produces only that period.', maxPoints: 15 },
        { criterion: 'Idempotence proven', description: 'Run twice, checksums compared, fixed if it failed.', maxPoints: 20 },
        { criterion: 'Counts and timings', description: 'Every step instrumented, with real output shown.', maxPoints: 15 },
        { criterion: 'A deliberate partial failure', description: 'What was left behind reported, then made invisible.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.rstrip(chr(10)) for l in sys.stdin]
runs = [l.split() for l in lines[:-1]]
mode = lines[-1].strip()
`,
        tests: [
          { input: '1 2\n1 2\nappend\n', expectedOutput: '1 1 2 2\nrows=4' },
          { input: '1 2\n1 2\nreplace\n', expectedOutput: '1 2\nrows=2' },
          { input: '1 2 3\n\nreplace\n', expectedOutput: '\nrows=0' },
          { input: '3 1\n2\nappend\n', expectedOutput: '1 2 3\nrows=3', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('An upsert differs from replace in that it:',
        [['Keeps records the current run did not include', true],
          ['Produces duplicates for repeated keys', false],
          ['Requires the table to be empty first', false],
          ['Is not idempotent across runs', false]],
        'Replace discards anything not in this run; upsert merges.'),
      mcq('The cost of replace is:',
        [['Rewriting data that did not change', true],
          ['Losing the ability to retry', false],
          ['Requiring a unique key', false],
          ['Producing duplicates on failure', false]],
        'Append plus deduplication is better when the rewrite is expensive.'),
      mcq('A step that writes nothing is consistent on failure because:',
        [['There is nothing for a consumer to see', true],
          ['It is skipped on a rerun', false],
          ['It cannot fail partway', false],
          ['Its output is always written to staging first', false]],
        'Which tells you only the writing steps need staging.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PIPELINE_MINI_PROJECT',
    notes: `Build a pipeline that runs on a schedule, survives its own failures, and can be
operated by somebody who did not write it.

The brief's test is **the handover**: somebody else runs a backfill, from your documentation,
without asking you. That is the property that distinguishes a pipeline from a script, and it is
not achievable by accident.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Pipeline Somebody Else Can Operate',
      description: 'Build a scheduled, idempotent, instrumented pipeline and prove somebody else can run and recover it.',
      instructions: `**Build** a pipeline that collects data from a real source, cleans it,
transforms it and produces something useful, for a parameterised period.

**Part one — the pipeline**

1. A period parameter. Running for March produces March's output and touches nothing else.
2. Raw data stored immutably, with provenance.
3. Named, small, testable cleaning steps. **At least three with unit tests.**
4. At least eight quality rules, run at ingestion and after transformation.
5. Output partitioned by period.

**Part two — make it operable**

6. Row counts at every step, recorded per run.
7. Duration at every step, recorded per run.
8. A run id on every log line.
9. **Run metadata in a table**: run id, period, start, end, status, row counts. Show a query
   against it.
10. A checksum of the output, recorded.

**Part three — idempotence and failure**

11. **Prove idempotence**: run twice, compare checksums, as an automated test.
12. Make a step fail deliberately. Show that consumers see nothing partial.
13. Show a rerun after that failure producing the correct result with no manual cleanup.
14. Distinguish a transient failure from a data failure in the code. Show both behaving
    differently.
15. Alert on absence: if today's output does not exist by a given time, something fires. Show
    the mechanism.

**Part four — backfill**

16. Backfill three months. Report the commands and the time taken.
17. Run two months in parallel. Show they do not interfere.

**Part five — the handover, which is the test**

18. Write the runbook: how to run it, how to backfill, what each failure means, what to do
    about each, and who to contact.
19. **Give it to somebody else. Ask them to backfill a month you have not run.** Do not help.
20. Record every question they asked. **Each one is a defect in the runbook.** Fix them.
21. Say what you would monitor in production, and what the first alert would be.

**Submit** the pipeline, the run metadata query, the idempotence test, the deliberate failure
and recovery, the runbook, and the questions your operator asked.`,
      rubric: [
        { criterion: 'Parameterised and partitioned', description: 'One period per run, output isolated, raw stored immutably.', maxPoints: 15 },
        { criterion: 'Quality rules and step tests', description: 'Eight rules and three tested cleaning steps.', maxPoints: 15 },
        { criterion: 'Fully instrumented', description: 'Counts, timings, run id and a queryable metadata table.', maxPoints: 20 },
        { criterion: 'Idempotence proven', description: 'An automated test comparing checksums across two runs.', maxPoints: 15 },
        { criterion: 'Failure handled and recovered', description: 'Nothing partial visible; a rerun fixes it with no manual cleanup.', maxPoints: 15 },
        { criterion: 'The handover', description: 'Somebody else backfilled a month unaided, with their questions recorded and fixed.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('What this project is really testing is:',
        [['Somebody else backfilling a month from the runbook, unaided', true],
          ['The pipeline running reliably on its nightly schedule', false],
          ['The quality rules all passing', false],
          ['The idempotence test passing', false]],
        'It distinguishes a pipeline from a script, and it is not achievable by accident.'),
      mcq('Each question your operator asks is:',
        [['A defect in the runbook', true],
          ['Expected, for an unfamiliar system', false],
          ['A sign the pipeline is too complex', false],
          ['Useful feedback but not a failure', false]],
        'The same standard as the API and README units.'),
      mcq('Running two months in parallel tests:',
        [['That the partitioning genuinely isolates them', true],
          ['The throughput of the pipeline', false],
          ['That the scheduler handles concurrency', false],
          ['Whether the quality rules are thread-safe', false]],
        'Interference would show up as one overwriting the other.'),
    ],
  },

  /* ══ T3_DATA_SQL ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_SQL_GROUPING_AND_JOINS',
    notes: `You can write a join. **This unit is about joins that produce a correct number**,
which is a different skill and the one that is wrong in most analytical queries a junior
writes.

## The grain, again

**Every query has a grain: what one row means.** Before writing anything, say it out loud.

"One row per customer." "One row per customer per month." "One row per order line."

**Most wrong analytical queries are grain errors.** The query runs, returns rows, and the
numbers are five times too large because the grain changed somewhere and nobody noticed.

## How a join changes the grain

    orders          -- one row per order
    JOIN items      -- one row per item
                    -- result: one row per ITEM, not per order

**Now \`SUM(orders.total)\` counts each order's total once per item.** An order with four items
contributes its total four times.

**This is the single most common analytical error there is**, and the result looks entirely
plausible — it is just wrong by a factor that varies per row.

**The fix is to aggregate before joining:**

    SELECT o.id, o.total, i.item_count
    FROM orders o
    JOIN (SELECT order_id, COUNT(*) AS item_count
          FROM items GROUP BY order_id) i ON i.order_id = o.id

The subquery is one row per order, so the join preserves the grain.

## Checking it

**Count before and after every join.**

    SELECT COUNT(*) FROM orders;                          -- 10,000
    SELECT COUNT(*) FROM orders JOIN items ON ...;        -- 34,000

**An increase means the grain changed.** It might be what you wanted. **You should know which**,
and this one habit prevents most of the wrong-number problems in analytical SQL.

## Which join

**Inner** — only matching rows. **The default, and it silently drops things.** An inner join to
a customers table loses orders whose customer was deleted, and your total quietly falls.

**Left** — all rows from the left, nulls where there is no match. **Use this while
investigating**, then count the nulls: that count is a finding in itself.

**The rule:** if losing rows would be a bug, use a left join and check the nulls. Do not assume
every row matches.

## Aggregates and nulls

**\`COUNT(*)\` counts rows. \`COUNT(column)\` counts non-null values.** They differ, and the
difference is usually what you actually want to know.

**\`AVG\` ignores nulls.** The average of 10, 20 and null is 15, not 10. **That may or may not be
what you meant**, and it is never what you meant if the nulls represent zeros.

**\`SUM\` of an empty set is null, not zero.** A left join with no matches gives null, which then
propagates through any arithmetic and turns the whole expression null.

## HAVING and WHERE

**\`WHERE\` filters rows before grouping. \`HAVING\` filters groups after.**

    WHERE status = 'shipped'        -- only shipped orders are counted
    HAVING COUNT(*) > 5             -- only customers with more than five

**Putting a row condition in HAVING** still works and is slower, because you grouped rows you
then discarded. **Putting a group condition in WHERE** does not work at all.

## Write it in stages

**Do not write the whole query.** Write the innermost part, run it, look at the rows. Add one
join, count, look. Add the grouping, look.

**A twelve-line query written at once and wrong is very hard to debug.** Built up in four
steps, each verified, it is not.`,
    mcqs: [
      mcq('Joining orders to items and summing the order total:',
        [['Counts each total once per item', true],
          ['Returns one row per order as expected', false],
          ['Excludes orders with no items', false],
          ['Produces a null for orders with many items', false]],
        'The single most common analytical error, and the result looks plausible.'),
      mcq('The fix for a join that changes the grain is:',
        [['Aggregate to one row per key before joining', true],
          ['Use DISTINCT on the result', false],
          ['Group by more columns', false],
          ['Switch to a left join', false]],
        'The subquery preserves the grain.'),
      mcq('`AVG` over 10, 20 and null gives:',
        [['15, because nulls are ignored', true],
          ['10, treating null as zero', false],
          ['Null, because one value is null', false],
          ['20, using the maximum', false]],
        'Never what you meant if the nulls represent zeros.'),
      mcq('An inner join to a customers table:',
        [['Silently drops orders whose customer was deleted', true],
          ['Returns nulls for missing customers', false],
          ['Raises an error on unmatched rows', false],
          ['Preserves every order row', false]],
        'And your total quietly falls.'),
    ],
    checkpoint: [
      mcq('`SUM` over no matching rows returns:',
        [['Null, which then propagates through the arithmetic', true],
          ['Zero', false],
          ['An empty result set containing no rows at all', false],
          ['An error', false]],
        'And turns the whole expression null.'),
      mcq('A row condition placed in HAVING:',
        [['Works, and is slower because you grouped rows you discarded', true],
          ['Does not work at all', false],
          ['Is equivalent in every respect', false],
          ['Changes the grain of the resulting rows entirely', false]],
        'A group condition in WHERE does not work at all.'),
      mcq('Building a query in stages matters because:',
        [['A twelve-line query written at once and wrong is very hard to debug', true],
          ['It is rather faster to execute a query incrementally', false],
          ['Each stage can be indexed separately', false],
          ['It avoids syntax errors', false]],
        'Four steps, each verified, is not hard.'),
    ],
  },

  {
    unitCode: 'T3_DATA_SQL_WINDOW_FUNCTIONS',
    notes: `Window functions compute across a set of rows **without collapsing them**. That
sentence is the whole idea, and it is the thing that makes a class of otherwise painful
questions easy.

## Against GROUP BY

**\`GROUP BY\` collapses.** Ten orders become one row with a total.

**A window function does not.** Ten orders stay ten rows, each carrying the total alongside it.

    SELECT customer_id, order_total,
           SUM(order_total) OVER (PARTITION BY customer_id) AS customer_total
    FROM orders

**Every row keeps its own value and gains the group's.** With \`GROUP BY\` you would have to
aggregate and join back to get this, which is two passes and an opportunity to change the grain.

## The anatomy

    function() OVER (PARTITION BY ... ORDER BY ... ROWS ...)

**\`PARTITION BY\`** — which rows form the group. Like \`GROUP BY\`, without collapsing.

**\`ORDER BY\`** — the order within the partition. Required for anything positional.

**The frame** — which rows within the partition to include. Defaults matter, and the default
with an \`ORDER BY\` present is a running window, not the whole partition. **That default catches
everybody once.**

## The four you will actually use

**\`ROW_NUMBER()\`** — a position. **The workhorse.** Its main use is deduplication:

    SELECT * FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) AS rn
      FROM customers
    ) t WHERE rn = 1

**Keep the most recent record per email.** This pattern solves an enormous number of real
problems and it is worth memorising.

**\`RANK()\` and \`DENSE_RANK()\`** — position with ties. \`RANK\` leaves gaps after a tie;
\`DENSE_RANK\` does not. **Know which you want**, because "top 3" with ties can mean four rows.

**\`LAG()\` and \`LEAD()\`** — the previous or next row's value.

    revenue - LAG(revenue) OVER (ORDER BY month) AS change

**Month-on-month change, in one line.** Without it, a self-join on a computed previous month,
which is awkward and wrong at boundaries.

**A running total:**

    SUM(amount) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

## Where they cannot go

**Not in \`WHERE\`.** Window functions are computed after \`WHERE\`, so you cannot filter on one
directly.

    WHERE ROW_NUMBER() OVER (...) = 1        -- error

**Wrap it in a subquery and filter outside.** This is not a limitation to work around — it
follows from the order in which a query is evaluated, and understanding that order explains
most SQL surprises.

## When not to

**A simple aggregate does not need one.** \`GROUP BY\` is clearer for a plain total.

**They are not free.** A window over a large partition sorts. Several with different partitions
sort several times, and on a large table that is the cost of the query.

**But they are usually cheaper than the alternative**, which is a self-join or a correlated
subquery — both of which are slower and considerably harder to read.`,
    mcqs: [
      mcq('The defining property of a window function is that it:',
        [['Computes across rows without collapsing them', true],
          ['Runs faster than an equivalent GROUP BY', false],
          ['Can reference other tables', false],
          ['Is evaluated before the WHERE clause', false]],
        'Ten orders stay ten rows, each carrying the group value.'),
      mcq('The deduplication pattern uses:',
        [['ROW_NUMBER partitioned by the key, ordered by recency, filtered to 1', true],
          ['DISTINCT ON the key column', false],
          ['RANK with a HAVING clause', false],
          ['GROUP BY with MAX on every column', false]],
        'It solves an enormous number of real problems and is worth memorising.'),
      mcq('A window function cannot appear in `WHERE` because:',
        [['It is computed after WHERE is applied', true],
          ['It returns multiple values per row', false],
          ['The partition is not yet defined', false],
          ['WHERE cannot reference computed columns', false]],
        'Which follows from the evaluation order and explains most SQL surprises.'),
      mcq('`RANK` against `DENSE_RANK` matters because:',
        [['"Top 3" with ties can mean four rows', true],
          ['One is faster on large partitions', false],
          ['Only one supports a frame clause', false],
          ['They order ties differently', false]],
        'RANK leaves gaps after a tie; DENSE_RANK does not.'),
    ],
    checkpoint: [
      mcq('The default frame when an ORDER BY is present is:',
        [['A running window, not the whole partition', true],
          ['The whole partition', false],
          ['The current row only', false],
          ['Undefined, and therefore engine-specific', false]],
        'That default catches everybody once.'),
      mcq('Month-on-month change is computed with:',
        [['LAG over the ordered months', true],
          ['A self-join on the previous month', false],
          ['A running SUM with a frame', false],
          ['ROW_NUMBER and a subquery', false]],
        'One line, and correct at the boundaries.'),
      mcq('Window functions are usually cheaper than:',
        [['A self-join or a correlated subquery', true],
          ['A GROUP BY over the same partition', false],
          ['A simple aggregate with no grouping', false],
          ['An index-only scan', false]],
        'And considerably easier to read.'),
    ],
  },

  {
    unitCode: 'T3_DATA_SQL_ANALYTICAL_PERFORMANCE',
    notes: `An analytical query takes ten minutes. **The core database topic taught you to read
a plan; this is about the ways an analytical query is slow, which differ from a transactional
one.**

## The difference

**A transactional query touches few rows and must be fast.** Index it, and the plan is usually
a lookup.

**An analytical query touches most rows by design.** A sequential scan is often correct, and
indexing it will not help — which is why the transactional instincts mislead here.

**So the levers are different:** read less data, do less work per row, and avoid doing the same
work repeatedly.

## Read less

**Select fewer columns.** On a columnar store this is the single biggest lever — reading three
columns instead of forty is roughly a tenth of the work. On a row store it matters less and
still matters.

**Filter earlier.** A filter applied before a join reduces what the join processes. The planner
often does this for you; it often cannot see through a subquery or a function.

**Partition, and filter on the partition key.** A query over one month should read one month.
**If your partition key is not in the filter, you are reading everything** — and this is the
commonest reason a partitioned table is still slow.

**Sample while developing.** Iterate on 1% and run the full thing once it is right. The
pipeline topic's point: a faster loop, not a test.

## Do less per row

**Functions on columns prevent index use** and cost per row. The core topic's point, and at a
hundred million rows the per-row cost is the whole query.

**\`DISTINCT\` is a sort.** Often it is there because a join multiplied rows, in which case the
real fix is the join and the \`DISTINCT\` is a symptom hiding it.

**\`ORDER BY\` on a large result is a sort.** If you do not need the order, do not ask for it.

## Avoid repeating work

**A subquery used three times is computed three times**, unless the engine is clever.
Materialise it — a temporary table, or a CTE the engine materialises — and reuse it.

**Pre-aggregate.** If a dashboard runs the same heavy aggregation every time, compute it once
on a schedule and query the result. **This is a pipeline, and it is often the right answer to
a slow dashboard** — the query is not slow, it is being run too often.

## Where the time actually goes

**Read the plan**, as the core topic taught. In analytical queries, look particularly for:

**A sort spilling to disk.** Often the largest single cost, and it means the work did not fit
in memory.

**A hash join building a huge hash.** The smaller side should be the one hashed; if the planner
got that backwards, its estimate was wrong.

**A nested loop over a large outer side.** Catastrophic, and again usually a bad estimate.

**A scan reading far more than the result needs.** Look at rows removed by the filter.

## The order

1. **Is it partitioned, and is the partition key in the filter?** The biggest single win, and
   the most commonly missed.
2. **Are you selecting columns you do not need?**
3. **Is the grain right?** A query that is slow because it is processing four times the rows it
   should is a correctness bug first.
4. **Read the plan.**
5. **Consider pre-aggregating**, if it runs repeatedly.

**Point three is worth emphasising.** A slow query is sometimes a wrong query, and optimising
it makes it wrong faster.`,
    mcqs: [
      mcq('Transactional instincts mislead on analytical queries because:',
        [['A scan is often correct, and indexing will not help', true],
          ['Analytical queries run less frequently', false],
          ['The planner behaves differently', false],
          ['Analytical data is stored differently', false]],
        'The query touches most rows by design.'),
      mcq('The commonest reason a partitioned table is still slow is:',
        [['The partition key is not in the filter', true],
          ['Too many partitions exist', false],
          ['The partitions are unevenly sized', false],
          ['The query crosses partition boundaries', false]],
        'So you are reading everything.'),
      mcq('A `DISTINCT` in an analytical query is often:',
        [['A symptom hiding a join that multiplied rows', true],
          ['The cheapest way to deduplicate', false],
          ['Required by the grouping', false],
          ['Optimised away by the planner', false]],
        'The real fix is the join.'),
      mcq('A dashboard running the same heavy aggregation every time:',
        [['Should pre-aggregate on a schedule — it is a pipeline', true],
          ['Needs a better index on the fact table', false],
          ['Should cache the rendered result', false],
          ['Requires a larger warehouse', false]],
        'The query is not slow; it is being run too often.'),
    ],
    checkpoint: [
      mcq('A sort spilling to disk means:',
        [['The work did not fit in memory', true],
          ['The data was not indexed', false],
          ['The ORDER BY was on the wrong column', false],
          ['The result set exceeded a row limit', false]],
        'Often the largest single cost in an analytical plan.'),
      mcq('Selecting fewer columns matters most on:',
        [['A columnar store', true], ['A row store', false],
          ['An indexed table', false], ['A partitioned table', false]],
        'Three columns instead of forty is roughly a tenth of the work.'),
      mcq('A slow query processing four times the rows it should is:',
        [['A correctness bug first, and optimising makes it wrong faster', true],
          ['A performance problem to be solved by adding an index', false],
          ['A partitioning problem', false],
          ['A planner estimate problem', false]],
        'Check the grain before the plan.'),
    ],
  },

  {
    unitCode: 'T3_DATA_SQL_DEBUGGING',
    notes: `Five analytical SQL failures. Four of them produce a number rather than an error.

## 1. The number is too big

**Cause:** a join multiplied rows and an aggregate counted the duplicates.

**Diagnosis:** count rows before and after each join. **The step where the count jumps is the
one.**

**Then ask whether the increase was intended.** Joining orders to items *should* increase the
count; summing the order total afterwards should not.

## 2. The number is too small

**Cause:** an inner join dropped unmatched rows. Or a \`WHERE\` on a nullable column, which
excludes nulls silently — \`WHERE status != 'cancelled'\` does **not** include rows where status
is null, and almost nobody expects that.

**Diagnosis:** switch to a left join and count the nulls. **That count is the answer.**

## 3. The aggregate is not what you meant

**Causes:** \`AVG\` ignoring nulls when you wanted them as zero; \`COUNT(column)\` against
\`COUNT(*)\`; \`SUM\` returning null for an empty group.

**Diagnosis:** compute the count and the null count alongside the aggregate. **If the count is
lower than you expect, nulls are being skipped** — and putting those two columns next to every
aggregate while developing is a cheap habit.

## 4. It worked on a sample

**Causes:** a value only present in the full data; a duplicate key the sample avoided; memory;
a timeout.

**The general lesson**, as the pipeline topic said: a sample is an iteration loop, not a test.

## 5. Two people get different numbers

**The most common and least technical.**

**Causes:** different date ranges; different definitions — "active" meaning two things;
different filters; one including test accounts; different timezones putting a transaction in a
different day; one counting orders and the other order lines.

**Diagnosis:** **compare the definitions before the queries.** Write down what each of you is
counting, in words, and the discrepancy is usually visible before any SQL is read.

**And this conversation happens constantly.** The person who can state their definition
precisely wins it, which is why the data quality unit insisted on writing things down.

## The method

**Build up in stages, checking each.** Innermost query, run it, look. Add a join, count. Add
the grouping, look.

**Check counts at every step.**

**Trace one record.** Pick one you can verify by hand and follow it through. **Aggregates can be
right while every individual value is wrong**, and only this finds that.

**Compare against a known answer.** A total you can verify another way — a different system, a
manual count, last month's report. **A query with no reference point is a query you are
trusting**, and trusting an analytical query you wrote this morning is how wrong numbers reach
a meeting.`,
    mcqs: [
      mcq('`WHERE status != \'cancelled\'`:',
        [['Excludes rows where status is null, which almost nobody expects', true],
          ['Includes rows where status is null', false],
          ['Raises an error on null values', false],
          ['Treats null as an empty string', false]],
        'A silent cause of a number being too small.'),
      mcq('When an aggregate is not what you meant, the diagnostic is:',
        [['Compute the count and the null count alongside it', true],
          ['Compare it against a GROUP BY version', false],
          ['Check the column types', false],
          ['Run it on a smaller sample', false]],
        'A cheap habit while developing.'),
      mcq('Two people getting different numbers is most often:',
        [['A difference in definitions, not in the queries', true],
          ['A difference in date ranges', false],
          ['One query having a join error', false],
          ['A timezone discrepancy', false]],
        'Compare the definitions in words before reading any SQL.'),
      mcq('A query with no reference point is:',
        [['A query you are trusting', true],
          ['Acceptable for exploratory work', false],
          ['Verifiable by re-running it', false],
          ['Fine if the row counts check out', false]],
        'And trusting one you wrote this morning is how wrong numbers reach a meeting.'),
    ],
    checkpoint: [
      mcq('An increase in row count after a join is:',
        [['Sometimes intended, and you should know which', true],
          ['Always a bug', false],
          ['Never a problem for aggregates', false],
          ['A sign of duplicated rows in the source data', false]],
        'Orders to items should increase; summing the total afterwards should not.'),
      mcq('Tracing one hand-verifiable record finds:',
        [['Errors that correct-looking aggregates hide', true],
          ['Performance problems hidden inside the query', false],
          ['Rows dropped by the join', false],
          ['Type mismatches in the columns', false]],
        'An aggregate can be right while every individual value is wrong.'),
      mcq('The person who wins the "why do our numbers differ" conversation is:',
        [['The one who can state their definition precisely', true],
          ['The one whose query is more efficient', false],
          ['The one with access to the source system', false],
          ['The one who ran their query most recently', false]],
        'Which is why the quality unit insisted on writing things down.'),
    ],
  },

  {
    unitCode: 'T3_DATA_SQL_PRACTICE',
    notes: `Two exercises on the reasoning behind an analytical query: what a join does to the
grain, and what a window function computes. Both are done without a database, because the
reasoning is the part that is wrong.`,
    coding: [
      {
        title: 'What does the join do to the grain?',
        description: `Read a left table and a right table and report the effect of an inner
join on the aggregate.

First an integer n, then n lines of \`id amount\` — the left table, one row per id. Then an
integer m, then m lines of \`id tag\` — the right table, which may have several rows per id.

Print three lines:

    naive_sum=<sum of amount over the joined rows>
    correct_sum=<sum of amount over the left table, for ids that matched>
    inflated=<yes|no>

\`inflated\` is \`yes\` when the two differ.

This is the error the unit calls the most common in analytical SQL, made arithmetic.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
n = int(lines[0][0])
left = lines[1:1 + n]
m = int(lines[1 + n][0])
right = lines[2 + n:2 + n + m]

# The join produces one row per matching pair. The sum then counts amounts repeatedly.
`,
        language: 'python',
        tests: [
          { input: '2\n1 100\n2 200\n2\n1 a\n2 b\n', expectedOutput: 'naive_sum=300\ncorrect_sum=300\ninflated=no' },
          { input: '2\n1 100\n2 200\n3\n1 a\n1 b\n2 c\n', expectedOutput: 'naive_sum=400\ncorrect_sum=300\ninflated=yes' },
          { input: '2\n1 100\n2 200\n1\n1 a\n', expectedOutput: 'naive_sum=100\ncorrect_sum=100\ninflated=no' },
          { input: '1\n1 50\n0\n', expectedOutput: 'naive_sum=0\ncorrect_sum=0\ninflated=no' },
          { input: '2\n1 10\n2 20\n4\n1 a\n1 b\n1 c\n2 d\n', expectedOutput: 'naive_sum=50\ncorrect_sum=30\ninflated=yes', isHidden: true },
        ],
      },
      {
        title: 'Deduplicate by recency',
        description: `The ROW_NUMBER deduplication pattern, by hand.

Read lines of \`key updated_at value\`, where updated_at is an integer. Keep, for each key, the
row with the **highest** updated_at. Break ties by taking the one that appears **last** in the
input.

Print the kept rows as \`key value\`, sorted by key ascending. Empty input prints nothing.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# One row per key, the most recent. The tie rule is part of the specification.
`,
        language: 'python',
        tests: [
          { input: 'a 1 old\na 2 new\n', expectedOutput: 'a new' },
          { input: 'b 5 x\na 3 y\n', expectedOutput: 'a y\nb x' },
          { input: 'a 1 first\na 1 second\n', expectedOutput: 'a second' },
          { input: '', expectedOutput: '' },
          { input: 'k 9 keep\nk 2 drop\nk 9 later\n', expectedOutput: 'k later', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'SQL for Analysis Practice',
      description: 'Quantify join inflation, implement deduplication by recency, then write real analytical queries.',
      instructions: `Complete both exercises, then:

1. For the first: write the SQL that produces \`correct_sum\` without changing the grain. Show
   the subquery approach.
2. For the first: give a case where the inflated sum is the one you actually want, and say what
   makes it so.
3. For the second: write the SQL equivalent, using a window function. Say why the filter has to
   be outside a subquery.
4. For the second: the tie rule takes the last row in input order. Say why relying on input
   order is dangerous in real SQL, and what you would order by instead.

**Then, against a real database** with at least three related tables and 100,000 rows in the
largest.

5. Write a query answering a real question that requires a join and a grouping. **State the
   grain before you write it.**
6. Count rows before and after each join. Report the counts and say whether each change was
   intended.
7. Deliberately write the inflated version. Report both numbers and the size of the error.
8. Write a query using a window function that would be awkward with GROUP BY. Explain why.
9. Take your slowest query. Read the plan, identify the expensive step, and improve it. Report
   both timings and what you changed.
10. Verify one result against a known reference — another system, a manual count, or a second
    query written differently. Report whether they agreed.`,
      rubric: [
        { criterion: 'Inflation quantified', description: 'All cases correct, including no matches and multiple matches.', maxPoints: 20 },
        { criterion: 'Deduplication by recency', description: 'Correct, including the tie rule.', maxPoints: 15 },
        { criterion: 'The SQL equivalents', description: 'Both written correctly, with the subquery necessity explained.', maxPoints: 15 },
        { criterion: 'A real query with a stated grain', description: 'Grain declared first, counts checked at each join.', maxPoints: 20 },
        { criterion: 'The inflated version, measured', description: 'Both numbers and the size of the error reported.', maxPoints: 15 },
        { criterion: 'Verified against a reference', description: 'A second source, and whether they agreed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'a 1 old\na 2 new\n', expectedOutput: 'a new' },
          { input: 'b 5 x\na 3 y\n', expectedOutput: 'a y\nb x' },
          { input: 'a 1 first\na 1 second\n', expectedOutput: 'a second' },
          { input: 'k 9 keep\nk 2 drop\nk 9 later\n', expectedOutput: 'k later', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('An inflated sum is what you want when:',
        [['The question is about the joined grain, such as revenue per item line', true],
          ['The join key happens to be unique on both sides already', false],
          ['You are counting rather than summing', false],
          ['The right table is small', false]],
        'The grain of the question has to match the grain of the query.'),
      mcq('Relying on input order to break ties in SQL is dangerous because:',
        [['Row order is not guaranteed without an ORDER BY', true],
          ['The order changes between engines', false],
          ['Input order is lost somewhere during the join', false],
          ['Ties are rare enough to ignore', false]],
        'Order by a tiebreaker column instead, as the pagination unit argued.'),
      mcq('The ROW_NUMBER filter must be outside a subquery because:',
        [['Window functions are computed after WHERE', true],
          ['The partition is not available in WHERE', false],
          ['Subqueries are optimised separately', false],
          ['ROW_NUMBER returns multiple values', false]],
        'Which follows from the evaluation order.'),
    ],
  },

  {
    unitCode: 'T3_DATA_SQL_MINI_PROJECT',
    notes: `Answer a real question with SQL, verify the answer, and be able to defend every
number in it.

The brief's requirement is **verification against an independent reference**. An analytical
query you wrote and then checked by reading it is a query you are trusting, and trusting is how
wrong numbers reach a meeting.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An Answer You Can Defend',
      description: 'Answer a real analytical question, verify every number independently, and document the definitions.',
      instructions: `**Find** a dataset with at least three related tables and enough rows that
performance matters — 100,000 or more in the largest.

**Part one — the question**

1. State a real question somebody would ask. Not "explore the data" — a question with an
   answer.
2. **Define every term in it precisely.** "Active customer" means what, exactly? Over what
   period? Including or excluding what?
3. State the grain of the answer: one row per what?

**Part two — build it in stages**

4. Write the innermost query. Run it. Show the rows.
5. Add each join, one at a time. **Count before and after each.** Report the table.
6. Add the grouping. Check the grain is what you declared.
7. Use at least one window function where it genuinely helps, and say why GROUP BY would be
   worse.

**Part three — verify it**

8. **Trace one record end to end.** Pick one you can verify by hand and follow it through every
   stage. Show the working.
9. **Verify the total against an independent reference** — a second query written differently,
   a different tool, a manual count on a subset, or the source system. Report whether they
   agreed and what you did if not.
10. Check the null handling: for each aggregate, report the row count and the null count
    alongside, and say whether nulls should have been zeros.
11. Deliberately write a version with an inner join where a left join belongs. Report how many
    rows it loses and what that does to the answer.

**Part four — performance**

12. Time the query. Read the plan. Identify the most expensive step.
13. Improve it. Report both timings and what changed.
14. Say whether the query should be pre-aggregated, and why or why not.

**Part five — defend it**

15. Write the answer as somebody would read it: the number, the definition, the period, and
    the caveats.
16. **Three things that could make this number wrong**, and how you checked each.
17. If somebody produced a different number, what would you ask them first?

**Submit** the staged queries with their counts, the record trace, the verification, the plan
and timings, and the written answer.`,
      rubric: [
        { criterion: 'A real question, precisely defined', description: 'Every term defined, grain declared.', maxPoints: 15 },
        { criterion: 'Built in stages with counts', description: 'Each join counted before and after, changes explained.', maxPoints: 20 },
        { criterion: 'A record traced by hand', description: 'One verifiable record followed through every stage.', maxPoints: 15 },
        { criterion: 'Independent verification', description: 'A genuinely separate reference, with the outcome reported.', maxPoints: 20 },
        { criterion: 'Null handling examined', description: 'Counts and null counts per aggregate, with a judgement.', maxPoints: 10 },
        { criterion: 'Performance measured', description: 'Plan read, the expensive step named, both timings given.', maxPoints: 10 },
        { criterion: 'Three ways it could be wrong', description: 'Named, with how each was checked.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Verifying against an independent reference matters because:',
        [['A query checked by reading it is a query you are trusting', true],
          ['It catches syntax errors', false],
          ['It confirms that the query performance is acceptable', false],
          ['It validates the source data', false]],
        'And trusting is how wrong numbers reach a meeting.'),
      mcq('The first thing to ask somebody with a different number is:',
        [['How they define the terms', true],
          ['Which tables they joined', false],
          ['What date range they used', false],
          ['Whether they excluded test data', false]],
        'The definition mismatch is the commonest cause by a distance.'),
      mcq('Writing the inner-join version deliberately shows:',
        [['How many rows silently disappear and what that does to the answer', true],
          ['Whether the join keys are unique', false],
          ['That the left join was necessary', false],
          ['How the query planner handles each of the two forms', false]],
        'Quantifying the silent drop rather than describing it.'),
    ],
  },
];
