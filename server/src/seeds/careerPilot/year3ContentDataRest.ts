/**
 * T3_DATA_ANALYSIS, T3_DATA_VIZ and T3_DATA_PROJECT — twelve units. Year 3, data track.
 * Finishes S14.
 *
 * ── THE HALF OF THE JOB THAT IS NOT CODE ──────────────────────────────────────────────────
 *
 * The first half of this track was getting data and making it trustworthy. This half is
 * turning it into something somebody acts on, and it fails for reasons that are not technical.
 *
 * THE_QUESTION_FIRST leads because the commonest way a data project wastes a month is starting
 * from the data. A student given a dataset explores it, produces eleven charts, and has
 * answered nothing anybody asked.
 *
 * SIGNAL_OR_NOISE is the unit that prevents the most damage. A third-year will report that
 * conversion rose from 4.1% to 4.4% without any sense of whether that is a finding or the
 * ordinary variation of a small sample, and somebody will spend money on it.
 *
 * MISLEADING_CHARTS is taught as recognition rather than ethics. Most misleading charts are
 * made by accident by somebody with good intentions and a default setting.
 *
 * WRITING_THE_FINDING attributes to TECHNICAL_WRITING, and it is the unit that decides whether
 * any of the preceding work matters: an analysis nobody acts on has the same value as one that
 * was never done.
 *
 * Attribution: ANALYSIS is single-skill and derived. VIZ defaults to DATA_VISUALIZATION with
 * the writing unit on TECHNICAL_WRITING. The project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_DATA_ANALYSIS ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_ANALYSIS_THE_QUESTION_FIRST',
    notes: `Given a dataset, the instinct is to explore it. **The commonest way a data project
wastes a month is starting from the data**, producing eleven charts, and answering nothing
anybody asked.

## Start from the decision

**What will somebody do differently depending on the answer?**

If nothing, the question is not worth answering. That sounds harsh and it is the most useful
filter there is — an enormous amount of analysis is produced, admired and ignored, because no
decision was ever attached to it.

**"Which channel should we spend next quarter's budget on?"** is a decision.
**"Let me look at the marketing data"** is not.

## Make the question answerable

A good question is **specific, measurable and bounded**.

- **Bad:** "Are customers happy?"
- **Better:** "Has the proportion of customers who reorder within 90 days changed since the
  redesign?"

The second names the metric, the population, the period and the comparison. **Every one of
those four is a decision somebody has to make, and if you do not make them explicitly the
analysis makes them for you** — silently, and probably differently from what was intended.

## Write down the definitions before you query

**The data collection topic's insistence, arriving where it matters most.**

- What is a customer? An account, a person, a paying account?
- What is a reorder? Any second order, or one in the same category?
- Ninety days from what — the first order, the delivery, the registration?
- Which customers are in scope? All, or those who had the chance to reorder within the window?

**That last one is where most analyses of this shape go wrong.** Customers who ordered
eighty-five days ago cannot have reordered within ninety, and including them drags the rate
down for a reason that has nothing to do with the redesign.

## Say what would change your mind

**Before you look:** what result would mean yes, what would mean no, and what would mean the
data cannot tell you?

**Writing that down first is the single strongest protection against fooling yourself.** Once
you have seen the numbers, it is very easy to construct a reason why the ones supporting your
expectation are the meaningful ones.

## Estimate the answer first

Say what you expect, and roughly how big. **Then, when the result differs wildly, you have a
genuine finding — either about the world or about your query.**

A result that matches your estimate needs less checking. A result five times larger than
expected is usually a grain error, and that instinct only exists if you had an estimate.

## When the question cannot be answered

Say so. **"The data cannot tell you this" is a legitimate and valuable answer**, and giving it
early is much better than producing something that looks like an answer and is not.

Reasons it happens: the data was not collected; there is no comparison group; the sample is too
small; something changed at the same time and the effects cannot be separated.

**That last one is the most common and the least noticed.** The redesign shipped in the same
week as a price change, and no amount of analysis will separate them after the fact.`,
    mcqs: [
      mcq('The filter for whether a question is worth answering is:',
        [['What somebody will do differently depending on the answer', true],
          ['Whether the data exists to answer it', false],
          ['Whether it has been asked before', false],
          ['How long the analysis would take', false]],
        'An enormous amount of analysis is produced, admired and ignored.'),
      mcq('A good question names four things:',
        [['The metric, the population, the period and the comparison', true],
          ['The data source, the method, the tool and the output', false],
          ['The decision, the owner, the deadline and the budget', false],
          ['The hypothesis, the test, the threshold and the sample', false]],
        'If you do not make those decisions explicitly, the analysis makes them for you.'),
      mcq('Including customers who ordered 85 days ago in a 90-day reorder rate:',
        [['Drags the rate down for a reason unrelated to the question', true],
          ['Makes the sample more representative', false],
          ['Has no effect on a large enough sample', false],
          ['Is required for the population to be complete', false]],
        'They cannot have reordered within ninety days yet.'),
      mcq('Writing down what would change your mind, before looking:',
        [['Is the strongest protection against fooling yourself', true],
          ['Speeds up the analysis', false],
          ['Is required for a hypothesis test', false],
          ['Documents the method for reviewers', false]],
        'Afterwards it is very easy to decide which numbers were the meaningful ones.'),
    ],
    checkpoint: [
      mcq('Estimating the answer before querying is useful because:',
        [['A result five times larger than expected is usually a grain error', true],
          ['It speeds up the query design', false],
          ['It sets a threshold for statistical significance', false],
          ['It documents your prior assumptions', false]],
        'And that instinct only exists if you had an estimate.'),
      mcq('The most common reason a question cannot be answered is:',
        [['Something else changed at the same time', true],
          ['The data was simply never collected at all', false],
          ['The sample is too small', false],
          ['There is no comparison group', false]],
        'And it is the least noticed — no analysis separates them after the fact.'),
      mcq('"The data cannot tell you this" is:',
        [['A legitimate answer, and best given early', true],
          ['An admission the analysis failed', false],
          ['Acceptable only after exhausting the options', false],
          ['A reason to collect more data first', false]],
        'Much better than something that looks like an answer and is not.'),
    ],
  },

  {
    unitCode: 'T3_DATA_ANALYSIS_EXPLORING',
    notes: `You have a question and trustworthy data. **Exploratory analysis is how you find out
what the data can say** — and it is a structured activity, not a wander.

## Look at distributions before anything else

**Not the mean. The shape.**

A mean of 40 describes a very different reality depending on whether the values cluster around
40, split between 10 and 70, or sit at 5 with one value of 4,000.

**Plot a histogram of every numeric column.** It takes minutes and it is the highest-value
fifteen minutes in an analysis, because it tells you which summary statistic is even
appropriate.

**What the shape tells you:**

- **Roughly symmetric** — the mean and standard deviation describe it.
- **Skewed** — the median describes it better, and the mean is being dragged by a tail. Revenue,
  session length and household income are all like this, and reporting a mean for any of them
  is misleading by default.
- **Bimodal** — you have two populations mixed, and the summary describes neither. **This is a
  finding.** Split them and analyse separately.
- **A spike at one value** — usually a default, a placeholder or a cap.

## Then look at the outliers

**Do not remove them yet. Look at them.**

An outlier is one of three things: **an error** — a data problem, and now you know about it; **a
different population** — the enterprise customer among the consumers; or **the interesting
thing** — fraud, an abuse case, the one that matters.

**Removing outliers before understanding them destroys findings.** And any removal is reported
with a count and a reason, as the data quality unit insisted.

## Then relationships

**Cross-tabulate. Group by. Scatter.**

**Compare the groups you care about.** If the question is about the redesign, compare before
and after — and also compare across segments, because an effect that appears overall may be
one segment moving and the rest static, which is a different finding with different
consequences.

## The traps

**Simpson's paradox.** A trend in every subgroup can reverse when the groups are combined —
because the group sizes changed. **Always check the subgroups**, and this is not a curiosity: it
appears in real data whenever a mix shifts.

**Confounding.** Two things move together because a third moves both. Ice cream and drownings;
summer.

**Survivorship.** You only see the ones that remain. Analysing your current customers tells you
nothing about why the others left, and it reliably produces a flattering and useless answer.

**Selection.** Your data is not a random sample. Survey respondents are people who respond.

## Keep a log

**Write down what you tried and what you found**, including the dead ends.

Two reasons. **You will not remember**, and three days later you will redo a check you already
did. **And it protects against the fishing expedition** — a record showing you tested twelve
things and found one significant result is honest; presenting the one without the twelve is
not, and the significance unit explains why that matters arithmetically.`,
    mcqs: [
      mcq('The highest-value fifteen minutes in an analysis is:',
        [['Plotting a histogram of every numeric column', true],
          ['Computing summary statistics for each', false],
          ['Checking for missing values', false],
          ['Correlating every pair of columns', false]],
        'It tells you which summary statistic is even appropriate.'),
      mcq('A bimodal distribution means:',
        [['Two populations are mixed and the summary describes neither', true],
          ['The data has been rounded', false],
          ['There are outliers at both ends', false],
          ['The sample is too small', false]],
        'That is a finding: split them and analyse separately.'),
      mcq('Removing outliers before understanding them:',
        [['Destroys findings, since one kind is the interesting thing', true],
          ['Is standard practice for skewed data', false],
          ['Is safe if the count is reported', false],
          ['Improves the reliability of the mean', false]],
        'Error, different population, or the thing that matters.'),
      mcq('Simpson’s paradox is not a curiosity because:',
        [['It appears in real data whenever a mix shifts', true],
          ['It affects only very large datasets', false],
          ['It is caused by measurement error', false],
          ['It disappears with enough subgroups', false]],
        'A trend in every subgroup can reverse when combined.'),
    ],
    checkpoint: [
      mcq('Reporting a mean for revenue or session length is:',
        [['Misleading by default, because both are skewed', true],
          ['Appropriate for large samples', false],
          ['Better than the median when reporting totals', false],
          ['Standard and generally accepted', false]],
        'The mean is being dragged by a tail.'),
      mcq('Analysing only your current customers produces:',
        [['A flattering and useless answer, through survivorship', true],
          ['A representative view of the whole customer base', false],
          ['A conservative estimate of satisfaction', false],
          ['A valid result if the sample is large', false]],
        'It tells you nothing about why the others left.'),
      mcq('The exploration log protects against:',
        [['Presenting one significant result without the twelve you tested', true],
          ['Losing the intermediate datasets you produced', false],
          ['Repeating an expensive query', false],
          ['Forgetting the data definitions', false]],
        'Which the significance unit explains arithmetically.'),
    ],
  },

  {
    unitCode: 'T3_DATA_ANALYSIS_SIGNAL_OR_NOISE',
    notes: `Conversion was 4.1% last month and 4.4% this month. **Is that a finding, or is it
Tuesday?**

A third-year will report the increase. Somebody will spend money on it. **This unit is the one
that prevents the most damage in the track**, and the core of it is a single instinct: small
numbers move.

## Where the variation comes from

**Everything varies.** Sales vary by day of week, by weather, by payday, by a competitor's
promotion, by nothing identifiable at all.

**A difference between two numbers is not evidence that anything changed.** It is the starting
point for asking whether anything did.

## The first question: how big is the sample?

    100 visitors, 4 conversions   → 4.0%
    101 visitors, 5 conversions   → 5.0%

**One extra conversion moved it by a quarter of its value.** On a hundred visitors, almost any
percentage is compatible with almost any underlying rate.

**The rough instinct worth carrying:** the uncertainty in a proportion shrinks roughly with the
square root of the sample. To halve it, you need four times the data. **On a hundred
observations you are nowhere**, on a thousand you can see large effects, and on ten thousand
you can see small ones.

## Look at the history before the comparison

**This is the cheapest and most convincing check available**, and almost nobody does it.

Before concluding that 4.1% to 4.4% means something, **plot the last twenty-four months.** If
the series has always bounced between 3.8% and 4.6%, your change is inside the ordinary noise
and there is nothing to explain.

**If it has sat between 4.0% and 4.2% for two years and is now 4.4%, that is interesting** —
and you know it from the same chart, without any statistics.

## Then, the tests

**A significance test asks: if nothing had changed, how often would I see a difference this
large by chance?**

A small p-value means the difference would be unusual by chance alone. It does **not** mean the
effect is large, important, or caused by what you think.

**Three things it is routinely taken to mean and does not:**

- **Not "the effect is real and large."** With enough data, a trivial difference is
  significant.
- **Not "there is no effect"** when it fails. Absence of evidence is not evidence of absence,
  particularly with a small sample.
- **Not a licence to stop thinking.** A significant result with a confound is still confounded.

**Prefer a confidence interval to a p-value.** "Between 0.1 and 0.9 percentage points higher"
tells you the size and the uncertainty at once, and the size is what the decision depends on.

## Multiple comparisons

**Test twenty things at the usual threshold and you expect one significant result from noise
alone.**

So slicing the data twenty ways and reporting the one that is significant is not analysis, it
is arithmetic working as designed. **This is why the exploration log matters**: the honest
report says what else was tested.

**Decide what you are testing before you look.** Anything found afterwards is a hypothesis for
next time, not a finding from this time.

## What to say

> "Conversion moved from 4.1% to 4.4%. On this sample the 95% interval for the change is
> **−0.2 to +0.8 points, so this is consistent with no change.** The series has varied between
> 3.8% and 4.6% over two years. **To detect a change of half a point reliably we would need
> about six weeks of data.**"

**That is a useful answer.** It says what is known, what is not, and what it would take — and
it is far more valuable than a confident wrong one.`,
    mcqs: [
      mcq('A difference between two numbers is:',
        [['The starting point for asking whether anything changed', true],
          ['Evidence that something changed', false],
          ['Meaningful if it exceeds the previous variation', false],
          ['Reportable once the sample exceeds a hundred', false]],
        'Everything varies — by day, by weather, by nothing identifiable.'),
      mcq('To halve the uncertainty in a proportion you need:',
        [['Four times the data', true], ['Twice the data', false],
          ['Ten times the data', false], ['A longer time period only', false]],
        'It shrinks roughly with the square root of the sample.'),
      mcq('The cheapest and most convincing check almost nobody does is:',
        [['Plotting the last two years before comparing two points', true],
          ['Running a significance test', false],
          ['Computing a confidence interval', false],
          ['Checking the sample size', false]],
        'If the series always bounced in that range, there is nothing to explain.'),
      mcq('A small p-value does not mean:',
        [['The effect is large or important', true],
          ['The difference would be unusual by chance', false],
          ['The result is worth reporting', false],
          ['The sample was adequate', false]],
        'With enough data a trivial difference is significant.'),
    ],
    checkpoint: [
      mcq('Testing twenty things at the usual threshold gives you:',
        [['About one significant result from noise alone', true],
          ['Twenty independent findings', false],
          ['A more reliable overall conclusion', false],
          ['No change to the false positive rate', false]],
        'Reporting the one without the twenty is arithmetic working as designed.'),
      mcq('A confidence interval is preferred to a p-value because:',
        [['It gives the size and the uncertainty at once', true],
          ['It is easier to compute', false],
          ['It does not require choosing a threshold first', false],
          ['It is robust to small samples', false]],
        'And the size is what the decision depends on.'),
      mcq('Something found while slicing the data afterwards is:',
        [['A hypothesis for next time, not a finding from this time', true],
          ['A valid finding if significant', false],
          ['Reportable with a caveat', false],
          ['Evidence that requires further slicing to confirm', false]],
        'Decide what you are testing before you look.'),
    ],
  },

  {
    unitCode: 'T3_DATA_ANALYSIS_DEBUGGING',
    notes: `Five ways an analysis goes wrong. All five produce a number, and four of them
produce a confident one.

## 1. The result is implausible

**Symptom:** average order value is £4,300. Conversion is 340%. A customer has 90,000 orders.

**Treat implausibility as a bug until proved otherwise.** The instinct to explain it — "maybe
we do have a wholesale customer" — is the one to resist for ten minutes while you check.

**Usual causes:** a join multiplied rows; a unit mismatch, pence against pounds; a denominator
that is not what you think; a test account.

**Diagnosis:** find the extreme records and look at them. **The single largest value explains
the anomaly nine times out of ten.**

## 2. The result is exactly what you expected

**This deserves a check too**, and it almost never gets one.

**Confirmation is not verification.** A query with a bug that happens to produce a plausible
number is invisible, and it will only be caught if you check the ones you like as hard as the
ones you do not.

**The minimum:** trace one record, and verify the total against something independent.

## 3. The numbers changed since yesterday

**Causes:** the source was corrected retrospectively; late-arriving data; you changed
something and forgot; a timezone boundary moved records between days; the pipeline ran twice.

**Diagnosis:** the run metadata and the raw snapshots. **This is the pipeline topic's
instrumentation being used for its real purpose**, and without it the question is
unanswerable.

## 4. It disagrees with another team's number

**The most common and the least technical.**

**Before any debugging, compare the definitions in words.** Nine times in ten the discrepancy
is visible immediately: different population, different period, different metric, one
including test accounts.

**Then compare a single record.** If you both include it and get different values, it is
technical. If one of you excludes it, it is a definition.

## 5. The effect disappeared when you split the data

**Symptom:** a clear overall effect vanishes, or reverses, per segment.

**Cause:** usually a mix shift — Simpson's paradox — or a single segment driving everything.

**This is not a problem to fix.** It is a finding, and a more interesting one than the original:
"conversion rose because the traffic mix changed, not because any segment improved" is a
genuinely different conclusion with genuinely different consequences.

## The habits

**Sanity-check every number against something you know.** Total revenue against the finance
figure. Customer count against the CRM. **A number with no reference point is a number you are
trusting.**

**Check the extremes.** Sort descending, look at the top ten. Sort ascending, look at the
bottom ten. Errors live at both ends, and this takes a minute.

**Trace one record end to end**, every time, whatever the aggregate says.

**And state your uncertainty.** An analysis that reports a number with no sense of how solid it
is invites a confidence the analyst does not have — and the person acting on it cannot tell
the difference.`,
    mcqs: [
      mcq('An implausible result should be:',
        [['Treated as a bug until proved otherwise', true],
          ['Investigated for the business explanation first', false],
          ['Reported with a caveat', false],
          ['Excluded from the summary', false]],
        'Resist the instinct to explain it for ten minutes while you check.'),
      mcq('A result exactly matching your expectation:',
        [['Deserves the same check, and almost never gets one', true],
          ['Needs less verification', false],
          ['Confirms the method was sound', false],
          ['Can be reported without tracing', false]],
        'A buggy query producing a plausible number is invisible.'),
      mcq('When another team’s number differs, compare first:',
        [['The definitions, in words', true],
          ['The queries, line by line', false],
          ['The data sources used', false],
          ['The date ranges applied', false]],
        'Nine times in ten the discrepancy is visible immediately.'),
      mcq('An effect that disappears when you split the data is:',
        [['A finding, and often a more interesting one', true],
          ['A sign the segmentation is wrong', false],
          ['Evidence the original was noise', false],
          ['A problem to be corrected', false]],
        '"The mix changed, not any segment" is a different conclusion with different consequences.'),
    ],
    checkpoint: [
      mcq('The single largest value in a dataset:',
        [['Explains the anomaly nine times out of ten', true],
          ['Should be removed before analysis', false],
          ['Is usually a legitimate extreme', false],
          ['Indicates the distribution is skewed', false]],
        'Sort descending and look at the top ten; it takes a minute.'),
      mcq('If you and another team both include a record and get different values:',
        [['It is technical rather than a definition problem', true],
          ['One of you has a stale dataset', false],
          ['The metric is ambiguous', false],
          ['The difference is comfortably within tolerance', false]],
        'If one of you excludes it, it is a definition.'),
      mcq('Reporting a number with no sense of how solid it is:',
        [['Invites a confidence the analyst does not have', true],
          ['Is acceptable for internal reporting', false],
          ['Leaves the reader to judge for themselves', false],
          ['Is standard unless a test was run', false]],
        'And the person acting on it cannot tell the difference.'),
    ],
  },

  {
    unitCode: 'T3_DATA_ANALYSIS_PRACTICE',
    notes: `Two exercises on the judgements: whether a difference means anything, and whether a
summary describes the data.`,
    coding: [
      {
        title: 'Is that difference worth reporting?',
        description: `Read two lines, each \`<successes> <trials>\` — a before and an after.

Print three lines:

    before=<rate to 1 decimal place>%
    after=<rate to 1 decimal place>%
    verdict=<too_small|no_change|possible_change>

Use this rule, which is a crude stand-in for a proper interval and is enough to build the
instinct:

- If either trials count is below 100 → \`too_small\`
- Otherwise compute the **margin** for each rate as \`1.96 * sqrt(p * (1 - p) / n)\`.
  If the two intervals \`p ± margin\` overlap → \`no_change\`
- Otherwise → \`possible_change\`

Rates are printed as a percentage to one decimal place. Trials of 0 counts as below 100.`,
        starter: `import sys, math

lines = [l.split() for l in sys.stdin if l.split()]
b_succ, b_n = int(lines[0][0]), int(lines[0][1])
a_succ, a_n = int(lines[1][0]), int(lines[1][1])

# Small samples cannot tell you anything. Overlapping intervals are consistent with no change.
`,
        language: 'python',
        tests: [
          { input: '4 100\n5 101\n', expectedOutput: 'before=4.0%\nafter=5.0%\nverdict=no_change' },
          { input: '4 50\n5 60\n', expectedOutput: 'before=8.0%\nafter=8.3%\nverdict=too_small' },
          { input: '410 10000\n520 10000\n', expectedOutput: 'before=4.1%\nafter=5.2%\nverdict=possible_change' },
          { input: '410 10000\n440 10000\n', expectedOutput: 'before=4.1%\nafter=4.4%\nverdict=no_change' },
          { input: '0 0\n1 200\n', expectedOutput: 'before=0.0%\nafter=0.5%\nverdict=too_small', isHidden: true },
          { input: '5000 10000\n6000 10000\n', expectedOutput: 'before=50.0%\nafter=60.0%\nverdict=possible_change', isHidden: true },
        ],
      },
      {
        title: 'Which summary describes it?',
        description: `Read a line of numbers and say which summary statistic is appropriate.

Print four lines:

    mean=<to 1 decimal place>
    median=<to 1 decimal place>
    skewed=<yes|no>
    use=<mean|median>

Call it **skewed** when the absolute difference between the mean and the median is more than
**20% of the median**, or when the median is 0 and the mean is not. Use the median when
skewed, otherwise the mean.

For an even count, the median is the average of the two middle values. Empty input prints
\`mean=0.0\`, \`median=0.0\`, \`skewed=no\`, \`use=mean\`.`,
        starter: `import sys

nums = [float(x) for x in sys.stdin.readline().split()]

# A mean dragged away from the median is the signature of a tail.
`,
        language: 'python',
        tests: [
          { input: '1 2 3 4 5\n', expectedOutput: 'mean=3.0\nmedian=3.0\nskewed=no\nuse=mean' },
          { input: '1 1 1 1 100\n', expectedOutput: 'mean=20.8\nmedian=1.0\nskewed=yes\nuse=median' },
          { input: '10 20 30 40\n', expectedOutput: 'mean=25.0\nmedian=25.0\nskewed=no\nuse=mean' },
          { input: '\n', expectedOutput: 'mean=0.0\nmedian=0.0\nskewed=no\nuse=mean' },
          { input: '0 0 0 9\n', expectedOutput: 'mean=2.2\nmedian=0.0\nskewed=yes\nuse=median', isHidden: true },
          { input: '5 5 5 5\n', expectedOutput: 'mean=5.0\nmedian=5.0\nskewed=no\nuse=mean', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Data Analysis Practice',
      description: 'Judge a difference, choose a summary, then run a real exploratory analysis.',
      instructions: `Complete both exercises, then:

1. For the first: the rule is a crude stand-in. Say what a proper approach would do
   differently, and name one case where the crude rule gives the wrong answer.
2. For the first: \`4 100\` against \`5 101\` is \`no_change\`. Say how many trials you would
   need to detect a one-point difference, roughly, and show the reasoning.
3. For the second: the 20% threshold is arbitrary. Say what you would use instead and why,
   and whether a threshold is the right tool at all.

**Then, a real exploratory analysis.** Use a real dataset with at least a few thousand rows.

4. State a question that has a decision attached. Say what somebody would do differently
   depending on the answer.
5. Define every term. Write the definitions before you query.
6. **Say what you expect**, with a rough number, and what would change your mind.
7. Plot a histogram of every numeric column. Report what each shape told you, including any
   bimodal or spiked ones.
8. Find the extremes. Report the top and bottom ten of your main measure and what they turned
   out to be.
9. Compare your groups. Then **split by at least one other dimension** and report whether the
   effect holds, reverses or is driven by one segment.
10. State your answer with its uncertainty, or state that the data cannot answer it and why.
11. Attach your exploration log, including the things you tried that led nowhere.`,
      rubric: [
        { criterion: 'Difference judged', description: 'All cases, including the small-sample and zero-trial ones.', maxPoints: 20 },
        { criterion: 'Summary chosen', description: 'All cases, including the empty input and the zero median.', maxPoints: 15 },
        { criterion: 'A question with a decision', description: 'States what somebody would do differently.', maxPoints: 15 },
        { criterion: 'Expectation recorded first', description: 'A number and a falsification condition, written before querying.', maxPoints: 15 },
        { criterion: 'Distributions and extremes', description: 'Every numeric column plotted, extremes inspected and explained.', maxPoints: 20 },
        { criterion: 'Split by another dimension', description: 'Reports whether the effect holds, reverses, or is one segment.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

nums = [float(x) for x in sys.stdin.readline().split()]
`,
        tests: [
          { input: '1 2 3 4 5\n', expectedOutput: 'mean=3.0\nmedian=3.0\nskewed=no\nuse=mean' },
          { input: '1 1 1 1 100\n', expectedOutput: 'mean=20.8\nmedian=1.0\nskewed=yes\nuse=median' },
          { input: '\n', expectedOutput: 'mean=0.0\nmedian=0.0\nskewed=no\nuse=mean' },
          { input: '0 0 0 9\n', expectedOutput: 'mean=2.2\nmedian=0.0\nskewed=yes\nuse=median', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('Overlapping intervals mean:',
        [['The data is consistent with no change', true],
          ['There is definitely no change', false],
          ['The samples were too small', false],
          ['The difference is within measurement error', false]],
        'Consistent with, which is a weaker and more honest claim.'),
      mcq('A mean far from the median indicates:',
        [['A tail dragging the mean', true],
          ['An error in the data', false],
          ['Two distinct populations', false],
          ['An insufficient sample size', false]],
        'Which is why the median describes skewed data better.'),
      mcq('A fixed threshold for calling something skewed is:',
        [['A crude tool, and the assignment asks what you would use instead', true],
          ['The standard approach in statistical practice', false],
          ['Appropriate for any distribution', false],
          ['More reliable than plotting', false]],
        'The shape is the real answer; a threshold is a shortcut.'),
    ],
  },

  {
    unitCode: 'T3_DATA_ANALYSIS_MINI_PROJECT',
    notes: `Answer a real question with a real analysis, and be honest about what you do not
know.

The brief's distinguishing requirement is **the pre-registration**: write your expectation,
your definitions and what would change your mind, before you look. That single step is what
separates an analysis from a search for a story, and it is uncomfortable in a way that is the
point.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — An Analysis With Its Uncertainty',
      description: 'Pre-register a question, explore honestly, and report an answer with what you do not know.',
      instructions: `**Find** a real dataset and a real question. Public data is fine; your own
project's data is better.

**Part one — before you look**

1. The question, with the decision attached: what would somebody do differently?
2. Every term defined precisely: metric, population, period, comparison.
3. **Your expected answer, with a number.**
4. **What result would change your mind**, and what result would mean the data cannot tell you.
5. What you are testing. **Exactly one thing.** Anything else found later is a hypothesis for
   next time.

**Write these down and do not edit them afterwards.** Submit them as written.

**Part two — explore**

6. Histogram every numeric column. Report the shapes and what each implied.
7. Report any bimodal or spiked distributions and what they turned out to be.
8. Inspect the extremes of your main measure — top ten and bottom ten — and say what each was.
9. Report any outliers, what they were, and whether you excluded them. **With counts.**

**Part three — answer it**

10. Compute the answer.
11. **State its uncertainty.** An interval, or an honest statement of why you cannot give one.
12. Plot the history. Is your effect inside the ordinary variation of the series?
13. Split by at least two other dimensions. Report whether the effect holds, reverses, or is
    driven by one segment.
14. **Check for a confound.** What else changed in the same period? Say how you looked.

**Part four — be honest**

15. Compare your answer with your expectation. If it differs greatly, say what you checked
    before believing it.
16. **List everything you tested**, including what led nowhere. The exploration log.
17. Say what would make this answer wrong. Three things.
18. Say what you would need to answer it properly — more data, a different collection, a
    controlled comparison.
19. If the honest answer is "the data cannot tell us", **say that as the headline.** It is a
    full-marks outcome.

**Submit** the pre-registration, the exploration, the answer with its uncertainty, and the
honesty section.`,
      rubric: [
        { criterion: 'Pre-registered and unedited', description: 'Question, definitions, expectation and falsification, written first.', maxPoints: 20 },
        { criterion: 'Distributions and extremes examined', description: 'Every numeric column, with what each shape implied.', maxPoints: 15 },
        { criterion: 'An answer with uncertainty', description: 'An interval, or an honest account of why none is possible.', maxPoints: 20 },
        { criterion: 'History and subgroups', description: 'Plotted against the series, split at least two ways.', maxPoints: 15 },
        { criterion: 'A confound looked for', description: 'What else changed, and how it was checked.', maxPoints: 15 },
        { criterion: 'Honest about the limits', description: 'Everything tested listed, three ways it could be wrong.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Writing the expectation down before looking is uncomfortable because:',
        [['It separates an analysis from a search for a story', true],
          ['It takes time before any of the results appear', false],
          ['It commits you to one method', false],
          ['It exposes your assumptions to review', false]],
        'It stops you deciding the answer after seeing the numbers, which is the point.'),
      mcq('"The data cannot tell us" as a headline is:',
        [['A full-marks outcome', true],
          ['A partial result requiring a caveat', false],
          ['Acceptable only if the data was poor', false],
          ['A sign the question was badly chosen', false]],
        'Much better than something that looks like an answer and is not.'),
      mcq('Listing everything you tested matters because:',
        [['Testing twenty things produces one significant result from noise', true],
          ['It documents the effort involved', false],
          ['Reviewers can repeat the work', false],
          ['It shows that the exploration was suitably thorough', false]],
        'The honest report says what else was tested.'),
    ],
  },

  /* ══ T3_DATA_VIZ ════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_VIZ_CHART_FOR_THE_QUESTION',
    notes: `**A chart is an argument, not a decoration.** Choose it by the question it answers,
not by what looks good.

## The question decides the chart

| The question | The chart |
|---|---|
| How does this change over time? | A line |
| How do these categories compare? | A bar |
| How is this distributed? | A histogram |
| Do these two things move together? | A scatter |
| How does the total break down? | A stacked bar, usually |
| Where does the drop-off happen? | A funnel or a step chart |

**Line for time, bar for categories.** Those two cover most of what you will ever need, and
using the wrong one of the two is the commonest mistake — a line joining unordered categories
implies a progression that does not exist.

## What to avoid, and why

**Pie charts**, mostly. People compare angles badly. **Two slices is fine; seven is
unreadable**, and a bar chart answers the same question better in every case with more than
three.

**Dual axes.** Two series on different scales, and the crossing point is determined entirely
by where you put the axes. **It can be made to show almost anything**, which is why it is a
favourite of misleading charts — and it is usually two charts stacked instead.

**3D anything.** It adds no information and distorts the comparison.

**Too many series.** Above about five lines, nobody can follow any of them. Highlight one and
grey the rest, or split into small multiples.

## Make it readable

**Label the axes.** With units. "Revenue" is not a label; "Revenue (£000s)" is.

**Sort bars by value**, not alphabetically, unless the order is meaningful. **A sorted bar
chart answers "which is biggest" instantly**; an alphabetical one makes the reader do the work.

**Start a bar chart's axis at zero.** Always — bar length *is* the comparison, and truncating
the axis distorts it by any factor you like. **A line chart may start elsewhere**, because the
line shows change rather than magnitude, and that difference is the next unit's subject.

**Say what it shows in the title.** Not "Revenue by Month" — **"Revenue grew 40% after the
March launch"**. The title is where the finding goes, and a reader who sees only the title
should get the point.

## Direct labelling

**Put the label on the line**, not in a legend the reader has to keep referring to. Every trip
to the legend costs attention, and with five series the reader gives up.

## Colour

**Use it to mean something.** One highlighted series and the rest grey is usually better than
six colours.

**Check it works in greyscale** — it will be printed — **and for colour-blind readers**, which
is about one man in twelve. Never encode meaning in red against green alone.

## The test

**Show it to somebody for five seconds, then take it away and ask what it said.**

If they cannot tell you, the chart has failed — and the fix is almost always fewer things,
a clearer title, and direct labels.`,
    mcqs: [
      mcq('The commonest chart mistake is:',
        [['A line joining unordered categories, implying a progression', true],
          ['Using a bar chart for time series', false],
          ['Too many colours in one chart', false],
          ['Omitting the legend', false]],
        'Line for time, bar for categories.'),
      mcq('A bar chart’s axis must start at zero because:',
        [['Bar length is the comparison, and truncating distorts it', true],
          ['Convention requires it', false],
          ['Negative values would be hidden otherwise', false],
          ['The scale becomes non-linear', false]],
        'A line chart may start elsewhere, because it shows change rather than magnitude.'),
      mcq('The title of a chart should contain:',
        [['The finding', true],
          ['The metric and the period', false],
          ['The data source', false],
          ['The axis definitions', false]],
        '"Revenue grew 40% after the March launch", not "Revenue by Month".'),
      mcq('Dual axes are a favourite of misleading charts because:',
        [['The crossing point depends entirely on where you put the axes', true],
          ['They are hard to label clearly', false],
          ['They require two different scales', false],
          ['They cannot be rendered in greyscale', false]],
        'It can be made to show almost anything.'),
    ],
    checkpoint: [
      mcq('Sorting bars by value rather than alphabetically:',
        [['Answers "which is biggest" instantly', true],
          ['Is required for categorical data', false],
          ['Makes the chart easier to update', false],
          ['Avoids implying an ordering', false]],
        'Alphabetical makes the reader do the work.'),
      mcq('Direct labelling beats a legend because:',
        [['Every trip to the legend costs attention', true],
          ['Legends are hard to position', false],
          ['It uses less space overall', false],
          ['Legends cannot be read in greyscale', false]],
        'With five series the reader gives up.'),
      mcq('The five-second test checks whether:',
        [['The reader can say what the chart said', true],
          ['The chart renders quickly enough', false],
          ['The labels are legible at size', false],
          ['The colours are distinguishable', false]],
        'The fix is almost always fewer things, a clearer title and direct labels.'),
    ],
  },

  {
    unitCode: 'T3_DATA_VIZ_MISLEADING_CHARTS',
    notes: `**Most misleading charts are made by accident**, by somebody with good intentions
and a default setting. This unit is about recognising them — in other people's work and in
your own.

## The truncated axis

A bar chart with the axis starting at 95 rather than 0. A 2% difference looks like a fivefold
one.

**On bars this is always misleading**, because the length of the bar is the comparison and you
have changed the length without changing the data.

**On a line chart it is often correct.** A line showing change over time may reasonably start
near the data. **The distinction: bars encode magnitude, lines encode change.** Confusing the
two is the root of most of this unit.

## The missing baseline, and the missing denominator

"Sales up 50%" — from two to three.

"Crime doubled" — in a town where the population also doubled.

**A change without its base is not information.** Always ask: from what, and out of how many?

## The cherry-picked window

A chart starting exactly at the low point. Or ending just before the reversal.

**Show enough history for the reader to judge**, and if there is a reason for the window, say
what it is. A window chosen to make a point is the easiest chart to make and the hardest to
defend when somebody extends it.

## The cumulative chart

Cumulative totals only go up. **A cumulative chart always looks like growth, even while the
rate is collapsing.**

It is the right chart for "how much in total"; it is the wrong one for "how are we doing", and
it is used for the second constantly.

## The aggregation that hides the shape

A monthly average hiding a collapse in the last week. A national figure hiding regional
divergence. **Every aggregation loses information, and the question is whether it lost the
part that mattered.**

## Correlation presented as cause

Two lines that move together, and a title implying one causes the other.

**Three alternatives, always:** the reverse direction; a third factor driving both; or
coincidence, which is much more common than people expect when you have looked at many pairs.

## Cumulative misuse of colour and area

**Area encodes badly.** Doubling both dimensions of a circle quadruples its area, and readers
perceive something between the two. **A bar is almost always the honest version.**

## Checking your own

**Would this chart tell a different story with a different reasonable choice?**

Different axis start, different window, different aggregation, a rate instead of a count.
**If yes, either your finding is fragile or your chart is doing the work the data does not.**

**Show the version that does not support your point**, at least to yourself. If it is
convincing too, you have not found what you thought.

**And state the choices.** "Axis starts at 95 to show the variation" is honest and lets the
reader judge. Silence on the same choice is not — and the difference is entirely in whether
you said it.`,
    mcqs: [
      mcq('A truncated axis is always misleading on:',
        [['Bars, because length is the comparison', true],
          ['Lines, because they imply continuity', false],
          ['Both equally', false],
          ['Neither, if the axis is labelled', false]],
        'Bars encode magnitude; lines encode change.'),
      mcq('A cumulative chart is the wrong choice for:',
        [['"How are we doing", because it always looks like growth', true],
          ['"How much in total", which it overstates', false],
          ['Comparing two series', false],
          ['Showing a rate of change', false]],
        'Even while the rate is collapsing.'),
      mcq('"Sales up 50%" without a baseline:',
        [['Is not information — it could be two to three', true],
          ['Is acceptable for relative comparisons', false],
          ['Implies a large absolute change', false],
          ['Requires only the period to be meaningful', false]],
        'Always ask: from what, and out of how many?'),
      mcq('Doubling both dimensions of a circle:',
        [['Quadruples the area, and readers perceive something in between', true],
          ['Doubles the perceived size accurately', false],
          ['Is the standard way to encode magnitude', false],
          ['Is equivalent to doubling a bar’s length', false]],
        'A bar is almost always the honest version.'),
    ],
    checkpoint: [
      mcq('The self-check for a misleading chart is:',
        [['Would a different reasonable choice tell a different story', true],
          ['Does it follow the standard conventions', false],
          ['Would a colleague interpret the chart the same way', false],
          ['Is every axis labelled correctly', false]],
        'If yes, the finding is fragile or the chart is doing the work.'),
      mcq('Stating that the axis starts at 95 is:',
        [['Honest, and lets the reader judge', true],
          ['Unnecessary if the axis is labelled', false],
          ['An admission the chart is misleading', false],
          ['Only needed in formal reports', false]],
        'The difference is entirely in whether you said it.'),
      mcq('Two lines moving together have three alternatives to causation:',
        [['Reverse direction, a third factor, or coincidence', true],
          ['Measurement error, reporting lag, or scaling', false],
          ['Seasonality, trend, or noise', false],
          ['Sampling, aggregation, or rounding', false]],
        'Coincidence is commoner than expected once you have looked at many pairs.'),
    ],
  },

  {
    unitCode: 'T3_DATA_VIZ_WRITING_THE_FINDING',
    notes: `**An analysis nobody acts on has the same value as one that was never done.** This
unit decides whether the preceding work matters.

## Lead with the answer

**Not the method. Not the data. The answer.**

> **Customers who use the mobile app reorder 40% more often than web-only customers.** This
> holds across every segment we checked and has been stable for six months. **The clearest
> action is to move app adoption earlier in onboarding** — currently at day 14, where only 30%
> of customers reach it.

**Four sentences: the finding, its solidity, the action, and the specific.** Everything else
is supporting material and goes below.

**The instinct is the opposite** — to build up through the method to the conclusion, as you
would in a report at university. **In a working context that loses your reader**, and the
person you most need to reach reads the first two lines.

## Write for the decision

**Name the action.** Not "app usage correlates with retention" but "move app adoption earlier
in onboarding".

**Say what it would cost and what it might return**, even roughly. A finding without a size is
hard to prioritise against anything else.

**If there is no action, say so.** "This is interesting and I do not think it changes anything
we are doing" is a complete and honest finding, and it is far better than manufacturing a
recommendation.

## Say how sure you are

**In the same breath as the finding.** Not in an appendix nobody reads.

> "40% more often — the interval is 32% to 48%, so the direction is solid and the size is
> approximate."

**Three honest registers**, and use them accurately:

- **"This is solid."** Large effect, large sample, holds across segments, consistent over time.
- **"This is suggestive."** The direction is probably right, the size is uncertain.
- **"This is a hypothesis."** Found while exploring, not tested, and here is what would test it.

**Using the strongest register for a weak finding is the fastest way to lose credibility**, and
you lose it for everything you say afterwards.

## Say what would change it

**Name the confound you could not rule out.** "App users may simply be more engaged customers
to begin with — we cannot separate that with this data, and a trial would."

**This is not weakness.** It is the difference between an analyst and a source of numbers, and
somebody senior will ask the question anyway. Having asked it yourself first is the whole
thing.

## Structure

1. **The finding**, in one sentence.
2. **The action**, in one sentence.
3. **The confidence**, in one sentence.
4. **The chart** — one, the best one.
5. **The detail** — method, definitions, caveats, for whoever wants it.
6. **What would make this wrong.**

**Most readers stop after three. Write accordingly**, and put nothing in the first three
sentences that needs the fourth to make sense.

## For an audience without your context

**No jargon.** No "p-value", no "cohort", no "grain" — or define it in the same sentence.

**Absolute numbers alongside percentages.** "40% more, which is about 600 additional orders a
month."

**Anticipate the obvious challenge.** "You might expect this to be driven by our largest
customers — it is not, and the effect holds when they are excluded."

**And be ready for "so what should we do?"** If your finding does not survive that question,
it was not finished.`,
    mcqs: [
      mcq('A finding should lead with:',
        [['The answer', true], ['The method', false],
          ['The data source', false], ['The question', false]],
        'The person you most need to reach reads the first two lines.'),
      mcq('"This is interesting and I do not think it changes anything" is:',
        [['A complete and honest finding', true],
          ['An incomplete analysis', false],
          ['A sign the question was poor', false],
          ['Better phrased as a recommendation', false]],
        'Far better than manufacturing one.'),
      mcq('Using the strongest register for a weak finding:',
        [['Loses credibility for everything you say afterwards', true],
          ['Is acceptable if the direction is right', false],
          ['Makes the recommendation clearer', false],
          ['Is standard in executive summaries', false]],
        'Solid, suggestive and hypothesis are three different claims.'),
      mcq('Naming the confound you could not rule out is:',
        [['The difference between an analyst and a source of numbers', true],
          ['A weakness best left to the appendix', false],
          ['Only necessary for causal claims', false],
          ['A reason to delay the finding', false]],
        'Somebody senior will ask anyway; having asked it first is the whole thing.'),
    ],
    checkpoint: [
      mcq('Confidence should be stated:',
        [['In the same breath as the finding', true],
          ['In an appendix with the method', false],
          ['Only when the result is uncertain', false],
          ['As a p-value for precision', false]],
        'Not in an appendix nobody reads.'),
      mcq('Most readers stop after:',
        [['Three sentences', true], ['The first chart', false],
          ['The method section', false], ['The first paragraph of detail', false]],
        'So put nothing in those three that needs the fourth to make sense.'),
      mcq('A finding that does not survive "so what should we do?" is:',
        [['Not finished', true],
          ['Still valid as an observation', false],
          ['Appropriate for an exploratory report', false],
          ['A reason to collect more data', false]],
        'Be ready for the question.'),
    ],
  },

  /* ══ T3_DATA_PROJECT ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DATA_PROJECT_BRIEF',
    notes: `Write down the question, the definitions and what done means — before any data is
touched.

The other tracks' brief units argued for a definition of done. **For an analytics project the
risk is different**: not an unfinished build, but an endless exploration that produces charts
and never an answer.

## Choose a question, not a dataset

**"I will analyse the Chicago taxi data"** is not a project. **"Has the introduction of
congestion charging changed short-trip volume in the centre?"** is.

**The question must have a decision behind it**, real or plausible. Say what somebody would do
differently.

## Choose data you can trust enough

**It does not need to be clean** — the collection topic covered that, and messy is realistic.

**It does need to be sufficient.** Before committing, check: does it cover the period? Does it
have the comparison group? Is the sample large enough to detect an effect of the size you care
about?

**Spending an hour on that check can save a week**, and "the data cannot answer this" is much
cheaper to discover now.

## The brief

1. **The question**, and the decision behind it.
2. **Every definition.** Metric, population, period, comparison.
3. **Your expected answer**, with a number.
4. **What would change your mind**, and what would mean the data cannot tell you.
5. **The one thing you are testing.**
6. **The data**: source, period, size, and why it is sufficient.
7. **What the output is** — a written finding, a chart, a dashboard, a model. **And who reads
   it.**

## The definition of done

- [ ] Raw data stored immutably with provenance
- [ ] Quality rules written and run, with failures reported
- [ ] Grain stated and proven
- [ ] Every numeric column's distribution examined
- [ ] Extremes inspected and explained
- [ ] The analysis reproducible from raw data by one command
- [ ] The result verified against an independent reference
- [ ] The effect checked across at least two subgroups
- [ ] At least one confound examined
- [ ] The answer stated with its uncertainty
- [ ] One chart that passes the five-second test
- [ ] A written finding: answer, action, confidence, in three sentences
- [ ] What would make this wrong, in three points

**"Reproducible by one command" is the item that catches people.** An analysis living in a
notebook that only runs in the order you happened to execute it is not reproducible, and the
pipeline topic said why.

## What this prevents

**The endless exploration.** Eleven charts, no answer, and a month gone.

**The unverified number.** Confidently wrong, and acted upon.

**The buried finding.** A correct answer on page four of a document nobody finished.

## Time

**Reserve a third for verification and writing.** On an analytics project this is the part that
makes it trustworthy and the part that makes it useful, and it is the first thing cut when the
exploration runs long — which it always does.`,
    mcqs: [
      mcq('The risk specific to an analytics project is:',
        [['An endless exploration that never produces an answer', true],
          ['An unfinished build', false],
          ['A dataset too large to process', false],
          ['A method that cannot be defended', false]],
        'Eleven charts, no answer, and a month gone.'),
      mcq('Checking whether the data is sufficient before committing:',
        [['Can save a week for an hour spent', true],
          ['Is impossible before the analysis begins', false],
          ['Is covered by the quality rules', false],
          ['Delays the exploration unnecessarily', false]],
        '"The data cannot answer this" is much cheaper to discover now.'),
      mcq('The item on the done list that catches people is:',
        [['Reproducible from raw data by one command', true],
          ['Verified against an independent reference', false],
          ['Every distribution examined', false],
          ['The answer stated with uncertainty', false]],
        'A notebook that runs only in the order you happened to execute it is not.'),
      mcq('"I will analyse the taxi data" fails as a project because:',
        [['It names a dataset rather than a question with a decision', true],
          ['The dataset is too large', false],
          ['It has no comparison group', false],
          ['The scope is not bounded', false]],
        'Say what somebody would do differently depending on the answer.'),
    ],
    checkpoint: [
      mcq('The reserved third covers:',
        [['Verification and writing', true],
          ['Cleaning and transformation', false],
          ['Exploration and charting', false],
          ['Collection and storage', false]],
        'The part that makes it trustworthy and the part that makes it useful.'),
      mcq('Messy data is acceptable for this project because:',
        [['Messy is realistic, and the collection topic covered it', true],
          ['Cleaning is not assessed', false],
          ['Clean datasets are hard to find', false],
          ['The quality rules you write will handle it', false]],
        'It needs to be sufficient, not clean.'),
      mcq('A correct answer on page four of a long document is:',
        [['A buried finding, which the brief exists to prevent', true],
          ['Acceptable if the summary references it', false],
          ['Standard for a detailed analysis', false],
          ['A formatting problem rather than a failure', false]],
        'Nobody finished the document.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PROJECT_BUILD',
    notes: `Do the analysis. Collect, check, explore, answer, verify — and make the whole thing
reproducible from raw data by one command.

**The order below puts verification throughout rather than at the end**, because an analysis
verified at the end is one where you have already decided what the answer is.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Analytics Project — Doing the Analysis',
      description: 'Collect, clean, explore and answer a real question, reproducibly and with the result verified.',
      instructions: `**Work from your brief**, in this order.

**Part one — collect**

1. Get the data. **Store the raw version immutably**, with source, date and parameters.
2. Report the size, the period covered, and the row count.
3. If it is an API, handle pagination and report pages and records.

**Part two — check before using**

4. Profile every column: nulls, distinct, min, max, most frequent.
5. Read the first ten, last ten and ten random rows. Report anything surprising.
6. State the grain and prove it with a uniqueness check.
7. Write at least six quality rules and run them. **Report which failed and what you did.**
8. Report every exclusion with a count and a reason. **No silent drops.**

**Part three — explore**

9. Histogram every numeric column. Report the shapes.
10. Inspect the extremes of your main measure. Say what they were.
11. Keep an exploration log throughout, including the dead ends.

**Part four — answer**

12. Compute the answer to your one pre-registered question.
13. **Verify it against an independent reference.** Report whether they agreed.
14. **Trace one record end to end** and show the working.
15. State the uncertainty: an interval, or why you cannot give one.
16. Plot the history. Is the effect inside the ordinary variation?
17. Split by at least two dimensions. Report whether it holds, reverses or is one segment.
18. Examine at least one confound. Say how, and what you concluded.

**Part five — make it reproducible**

19. **One command, from raw data to the answer.** Not a notebook run in order — a script, or a
    notebook executed non-interactively as part of it.
20. **Delete your outputs and run it.** Show that it reproduces.
21. Pin your dependencies.

**Part six — compare with your expectation**

22. Your pre-registered expectation against the result. If it differs greatly, say what you
    checked before believing it.
23. If the answer is "the data cannot tell us", say so clearly. That is a full-marks outcome.

**Submit** the code, the raw data reference, the quality rule results, the exploration log, the
verification, and the one-command reproduction.`,
      rubric: [
        { criterion: 'Collected with provenance', description: 'Raw stored immutably, source and parameters recorded.', maxPoints: 10 },
        { criterion: 'Checked before use', description: 'Profiled, grain proven, six rules run, exclusions counted.', maxPoints: 20 },
        { criterion: 'Explored honestly', description: 'Distributions, extremes, and a log including dead ends.', maxPoints: 15 },
        { criterion: 'Verified independently', description: 'A second reference and a hand-traced record.', maxPoints: 20 },
        { criterion: 'Uncertainty and subgroups', description: 'An interval or an honest refusal, plus two splits and a confound.', maxPoints: 20 },
        { criterion: 'Reproducible in one command', description: 'Outputs deleted and regenerated, dependencies pinned.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Verification throughout rather than at the end matters because:',
        [['By the end you have already decided what the answer is', true],
          ['It is generally faster to verify incrementally', false],
          ['Errors compound if left late', false],
          ['The final check would take too long', false]],
        'Which is why the order puts it throughout.'),
      mcq('"Reproducible in one command" excludes:',
        [['A notebook that must be run in a particular order by hand', true],
          ['A script driven by command-line parameters', false],
          ['A notebook executed non-interactively', false],
          ['A pipeline with multiple stages', false]],
        'The pipeline topic said why.'),
      mcq('Deleting your outputs and re-running proves:',
        [['That nothing depended on state you no longer have', true],
          ['That the analysis is correct', false],
          ['That the data has not changed', false],
          ['That the dependencies have all been pinned', false]],
        'The only way to know the reproduction is real.'),
    ],
  },

  {
    unitCode: 'T3_DATA_PROJECT_PRESENT',
    notes: `Present the answer so somebody acts on it. **This is the unit that decides whether
the project mattered**, and on a data project it matters more than on any other track: the
build is invisible, and the presentation is the entire deliverable as far as the reader is
concerned.

## The written finding

**Three sentences, then everything else.**

1. **The answer.** What is true.
2. **The action.** What to do.
3. **The confidence.** How sure, and in which register.

Then the chart, then the detail, then what would make it wrong.

**Write the three sentences first**, before assembling anything else. If you cannot, the
analysis is not finished — and discovering that now is much better than discovering it in the
meeting.

## One chart

**Not six. One.** The one that makes the point, passing the five-second test.

If you genuinely need more, they are supporting material and go below the fold.

**Label it with the finding**, not the metric.

## Presenting it out loud

You will be asked to talk through it. **Three minutes**, and the structure is the same as the
written one: answer, action, confidence.

**Do not walk through your method.** Nobody wants the chronology, and it buries the finding.
The method is what you have ready for the questions.

## The questions you will get

**"How confident are you?"** Answer in one of the three registers, accurately.

**"What if it is just X?"** The confound. You examined it — say what you found. **If you did
not examine it, say that too**, and say what it would take.

**"How big is that in money or people?"** Have the absolute number. "40% more" is much weaker
than "about 600 additional orders a month".

**"Where did the data come from and can we trust it?"** Provenance, quality rules, and the
things you could not fix.

**"Somebody else has a different number."** Compare definitions first. You wrote yours down.

**"What should we do?"** The action, and what it would cost.

## Being challenged

**Somebody senior will disagree.** Sometimes with good reason.

**Distinguish a challenge to the analysis from a challenge to the conclusion.** "Your sample
excludes returning customers" is about the analysis and you should check it. "I do not believe
app usage matters" is a prior, and the response is the evidence rather than a defence.

**And be willing to be wrong.** "That is a good point, I had not excluded those — let me
recheck" costs nothing and buys everything. **Defending an analysis you know has a hole is how
an analyst stops being trusted**, and the trust is the whole job.

## What to leave behind

**A document somebody can read without you**, structured as above.

**The reproducible analysis**, so a sceptic can run it.

**The definitions**, so the next person measuring this measures the same thing.

**That last one is worth more than it looks.** A definition written down once becomes the
organisation's definition, and the "why do our numbers differ" conversation stops happening
for that metric.`,
    mcqs: [
      mcq('On a data project the presentation matters more than on other tracks because:',
        [['The build is invisible and the presentation is the deliverable', true],
          ['Data audiences are less technical', false],
          ['The findings are harder to demonstrate', false],
          ['The work cannot be shown as a running system', false]],
        'As far as the reader is concerned, it is the whole thing.'),
      mcq('If you cannot write the three sentences first:',
        [['The analysis is not finished', true],
          ['The chart will make it clearer', false],
          ['More exploration is needed', false],
          ['The question was too broad', false]],
        'Discovering that now beats discovering it in the meeting.'),
      mcq('Walking through your method in a presentation:',
        [['Buries the finding, and nobody wants the chronology', true],
          ['Establishes credibility before the conclusion', false],
          ['Is expected in a technical audience', false],
          ['Pre-empts the obvious questions', false]],
        'The method is what you have ready for the questions.'),
      mcq('"Your sample excludes returning customers" is:',
        [['A challenge to the analysis, and you should check it', true],
          ['A challenge to the conclusion, requiring evidence', false],
          ['A prior to be answered with data', false],
          ['A question about the definitions', false]],
        'Distinguish that from "I do not believe this matters", which is a prior.'),
    ],
    checkpoint: [
      mcq('"40% more" is weaker than:',
        [['About 600 additional orders a month', true],
          ['A statistically significant increase', false],
          ['A 40% relative improvement', false],
          ['An increase from 4.1% to 5.7%', false]],
        'Have the absolute number ready.'),
      mcq('Defending an analysis you know has a hole:',
        [['Is how an analyst stops being trusted', true],
          ['Is appropriate until it is disproved', false],
          ['Protects the finding from a weak challenge', false],
          ['Is expected in a senior discussion', false]],
        '"Let me recheck" costs nothing and buys everything.'),
      mcq('Leaving the definitions behind is valuable because:',
        [['They become the organisation’s definition and end the disagreement', true],
          ['They document the method for auditors', false],
          ['They allow the whole analysis to be repeated later', false],
          ['They demonstrate rigour to reviewers', false]],
        'The "why do our numbers differ" conversation stops for that metric.'),
    ],
  },
];
