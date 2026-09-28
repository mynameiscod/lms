/**
 * The Data & Analytics specialization track — sixteen units. Module P09.
 *
 * ── WHAT DISTINGUISHES THIS DIRECTION ─────────────────────────────────────────────────────
 *
 * Every other track is judged on whether the thing works. This one is judged on whether the
 * answer is true, and those are different standards with different failure modes. A dashboard
 * that renders perfectly and reports a number computed from a duplicating join is working
 * software producing a false statement, and nothing in the system will notice.
 *
 * So the track is weighted towards what can go wrong silently: the join that inflated the total,
 * the filter applied too early, the null that dropped a fifth of the rows, the sample that was
 * not representative. All four produce a plausible answer, which is precisely why they survive.
 *
 * ── AND WHY IT IS NOT A STATISTICS COURSE ─────────────────────────────────────────────────
 *
 * The statistics a placement year needs is small and the judgement is large. Knowing what a
 * dataset cannot answer, noticing when a number moved for a reason other than the one being
 * claimed, and presenting uncertainty without either hiding it or hiding behind it — those are
 * what a data role is hired for at this level, and none of them is a formula.
 *
 * Attribution: T4_DATA_DEPTH defaults to DATA_WRANGLING with the shape unit on
 * PROBABILITY_STATISTICS and the interview question on DBMS_CONCEPTS; T4_DATA_BUILD to SQL_JOINS
 * with the pipeline unit on DATA_PIPELINES and the figure unit on DATA_VISUALIZATION;
 * T4_DATA_QUALITY to QUERY_OPTIMIZATION with its harder fault on DATA_WRANGLING; T4_DATA_PROOF to
 * DATA_VISUALIZATION with the specialization interview on TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DATA_BUNDLES: PilotBundle[] = [
  /* ══ T4_DATA_DEPTH ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DATA_DEPTH_WHAT_THE_DATA_CANNOT_ANSWER',
    notes: `**Saying what a dataset cannot tell you, before spending a week answering it.**

## The three limits worth checking first

**Coverage.** Which rows exist and which do not. Survey responses cover people who responded;
sales data covers people who bought. **Anybody who did not is invisible**, and the question is
frequently about them.

**Granularity.** Daily totals cannot answer a question about hours. Aggregated data has already
discarded what you would need, and no amount of analysis brings it back.

**Attribution.** The data records what happened, not why. A drop after a price change is not
caused by the price change until something rules out the other things that changed that week.

## Selection bias, concretely

**"Our customers rate us 4.6."** Out of the customers who left a rating, who are systematically
the very pleased and the very angry.

**"Users who use feature X retain better."** People who chose to use X are different from people
who did not, in ways that may explain the retention entirely.

**Both are true statements and neither supports the conclusion attached to it**, which is the
failure mode this unit exists for.

## The question to ask before starting

**"If the answer were X, what in this data would show it? And if the answer were the opposite?"**

**If both look the same in the data, the data cannot answer it**, and finding that out in ten
minutes rather than after a week is the most valuable thing this unit teaches.

## Saying so

**"This data cannot answer that, and here is what could"** is a genuinely useful contribution and
is frequently unwelcome. Saying it early, with the alternative attached, is the professional
version.`,
    mcqs: [
      mcq('"Users who use feature X retain better" fails as evidence that X causes retention because people who chose X:',
        [['Are different in ways that may explain it', true],
         ['Represent a smaller sample than the others do', false],
         ['Were measured over a shorter period of time', false],
         ['Had already decided to continue using the product', false]],
        'Self-selection means the groups differ before the feature is involved, so the comparison is confounded rather than causal.'),
      mcq('Daily totals cannot answer a question about hours because aggregation has:',
        [['Already discarded what you would need', true],
         ['Introduced rounding errors into the figures', false],
         ['Changed the granularity of the timestamps stored', false],
         ['Averaged out the variation between the days', false]],
        'The detail is gone from the stored data. No analysis recovers information that was removed before it was written.'),
    ],
    checkpoint: [
      mcq('The question to ask before starting is what in the data would show the answer, and what would show the opposite — because if both look the same:',
        [['The data cannot answer the question', true],
         ['A larger sample is required to distinguish them', false],
         ['The analysis must control for other variables', false],
         ['The question has been specified imprecisely', false]],
        'Indistinguishable outcomes mean the dataset carries no signal on that question, and ten minutes establishes it rather than a week.'),
      mcq('The professional version of saying a dataset cannot answer something is to say it early and:',
        [['With the alternative attached', true],
         ['In writing, so the record is preserved', false],
         ['After confirming it with a colleague first', false],
         ['Only once the requester asks for progress', false]],
        'The statement is useful and unwelcome. Naming what could answer it converts a refusal into a proposal.'),
    ],
  },
  {
    unitCode: 'T4_DATA_DEPTH_SHAPE_BEFORE_ANALYSIS',
    notes: `**Characterising a dataset before drawing anything from it.** Twenty minutes that save
a week.

## The five checks

**Row count**, against what you expected. A table with a tenth of the rows you thought is a
loading problem, not a finding.

**Missingness, per column.** Which are null, how often, and — critically — **whether the
missingness is random.** A column missing for one customer segment is a bias waiting to be
introduced.

**Distributions.** Minimum, maximum, and a quick histogram. Negative ages, prices of zero,
timestamps in 1970. **Every dataset has some** and finding them now is far cheaper than
explaining them later.

**Cardinality.** How many distinct values per column. A field you believed was an identifier with
duplicates is a different dataset from the one you thought you had.

**Duplicates.** Whole rows, and by the key you intend to join on. This is the one that produces
the inflated totals.

## The sanity check that catches the most

**Does the total match something you know independently?** Revenue against the finance figure, user
count against the dashboard. **If they disagree, stop.** The disagreement is either a finding or a
mistake, and both are worth more than the analysis you were about to do.

## Why this is skipped

**It produces no output.** Twenty minutes with nothing to show, under pressure to produce a
result. **The discipline is knowing that the twenty minutes is the cheapest part of the whole
analysis**, and that skipping it is how a wrong number reaches a slide.`,
    mcqs: [
      mcq('A column that is missing for one customer segment specifically is:',
        [['A bias waiting to be introduced', true],
         ['A data quality issue with no analytical effect', false],
         ['Acceptable if the segment is a small proportion', false],
         ['Correctable by imputing the segment average', false]],
        'Non-random missingness means dropping those rows removes a group systematically, which shifts every downstream figure in one direction.'),
      mcq('A field you believed was an identifier turning out to have duplicates means you have:',
        [['A different dataset from the one you thought', true],
         ['A data entry problem to report to the source', false],
         ['Rows that should be removed before analysing', false],
         ['A need for a composite key instead of a single one', false]],
        'The grain of the table is not what you assumed, so every join and every count built on that assumption is wrong in a way nothing reports.'),
    ],
    checkpoint: [
      mcq('If a total disagrees with a figure you know independently, the disagreement is either a finding or a mistake, and both are worth more than:',
        [['The analysis you were about to do', true],
         ['The time spent producing the comparison', false],
         ['The original question that was being asked', false],
         ['Any further checks on the same dataset', false]],
        'Proceeding on a dataset that does not reconcile produces a result whose relationship to reality is unknown, whichever explanation turns out to apply.'),
      mcq('This step is skipped because it produces no output, and the discipline is knowing that the twenty minutes is:',
        [['The cheapest part of the whole analysis', true],
         ['Required by most data governance policies', false],
         ['Faster than validating the result afterwards', false],
         ['Something a reviewer will ask about later', false]],
        'Every later stage builds on the shape. A problem found at the end invalidates everything after the point it was introduced.'),
    ],
  },
  {
    unitCode: 'T4_DATA_DEPTH_PRACTICE',
    notes: `**Applying both ideas to a dataset you did not collect.**

## The drill

**An unfamiliar dataset and a question somebody wants answered.** In thirty minutes produce:

**The five shape checks**, with what each one showed.

**One thing the data cannot answer**, with the reason — coverage, granularity or attribution.

**One selection effect** present in it.

**A reconciliation** against something known independently, or a statement that nothing was
available to reconcile against.

## The output

**Not an answer.** A statement of what can be answered, what cannot, and what you would need for
the rest.

**That is genuinely the deliverable**, and students find it unsatisfying because it feels like not
having done the work. It is the work: an analyst who produces answers to unanswerable questions is
worse than useless, because the answers are believed.

## The second half

**Then answer the part that is answerable**, with the limits stated alongside it.

## Why thirty minutes

**Because this has to be habitual rather than a project.** A check that takes a day gets skipped
under pressure. One that takes half an hour survives contact with a deadline, which is the only
property that matters for a habit.`,
    mcqs: [
      mcq('An analyst who produces answers to unanswerable questions is described as worse than useless because the answers:',
        [['Are believed', true],
         ['Take longer to produce than honest ones', false],
         ['Will eventually be contradicted by better data', false],
         ['Reduce confidence in their other work later', false]],
        'A stated answer carries authority. A wrong one is acted upon, where an honest statement of the limit would have prompted better data.'),
      mcq('The checks are constrained to thirty minutes because a check that takes a day:',
        [['Gets skipped under pressure', true],
         ['Produces more findings than are actionable', false],
         ['Cannot be repeated on every new dataset', false],
         ['Delays the analysis beyond what is acceptable', false]],
        'Surviving contact with a deadline is the only property that matters for a habit, and length is what determines whether it survives.'),
    ],
    checkpoint: [
      mcq('The deliverable is a statement of what can be answered, what cannot, and:',
        [['What you would need for the rest', true],
         ['How long the full analysis would take', false],
         ['Which parts have already been attempted', false],
         ['Who collected the data originally', false]],
        'Naming the missing input turns a limitation into a request somebody can act on, which is what makes the statement useful rather than obstructive.'),
      mcq('Students find this deliverable unsatisfying because it feels like:',
        [['Not having done the work', true],
         ['Criticising whoever collected the data', false],
         ['Refusing a request from a stakeholder', false],
         ['Producing less output than their peers do', false]],
        'There is no chart and no number. Recognising that the assessment of answerability is the work is the shift this unit is trying to produce.'),
    ],
  },
  {
    unitCode: 'T4_DATA_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Here is a dataset and a question. How would you approach it?"**

## What separates candidates immediately

**Whether they start with the data or with the question's answerability.**

**Most candidates start analysing.** A strong one asks what the data covers, what it excludes,
and whether the question can be answered from it at all — and does so before touching anything.

## The answer

**Clarify the question.** "Did the campaign work" means what, measured how, over what period,
compared against what?

**Check coverage and granularity.** Who is in this data and who is not. What was aggregated away.

**Shape it.** Rows, missingness, distributions, cardinality, duplicates. Reconcile against
something known.

**Then state what is answerable**, and answer that.

**Then state the uncertainty** attached to the answer, without hiding it or hiding behind it.

## The follow-ups

**"The number went up. Did the change cause it?"** Almost never answerable from observational
data alone. What else changed, was there a comparable group, is there seasonality.
**Saying "this shows correlation and here is what would show causation" is the answer.**

**"The stakeholder wants a single number."** Give one, with the interval and the main caveat in
one sentence. Refusing to give a number is as unhelpful as giving a false one.

**"Your result contradicts what they expected."** Check your work first, then present it plainly
with the method visible. This is asked because it happens and because how somebody handles it
matters more than the analysis.

## What loses marks

**Producing a confident answer with no statement of its limits.** In this direction that is not
thoroughness missing — it is the main risk of the job.`,
    mcqs: [
      mcq('Asked whether a change caused a number to move, the answer expected is that observational data shows correlation and:',
        [['Here is what would show causation', true],
         ['The effect size is too small to be certain', false],
         ['A longer time period would settle the question', false],
         ['The change is the most plausible explanation', false]],
        'Naming what would establish causation — a comparable group, a controlled test — converts a refusal into a constructive next step.'),
      mcq('Refusing to give a stakeholder a single number is described as:',
        [['As unhelpful as giving a false one', true],
         ['The only honest response to uncertainty', false],
         ['Appropriate when the interval is very wide', false],
         ['Preferable to a figure that may be misused', false]],
        'The decision will be made regardless. A number with its interval and caveat serves it; withholding one leaves it to be made on nothing.'),
    ],
    checkpoint: [
      mcq('What separates candidates immediately is whether they start with the data or with:',
        [['The question’s answerability', true],
         ['The tools they intend to use for it', false],
         ['A hypothesis about what they expect to find', false],
         ['The format the result should be presented in', false]],
        'Most begin analysing. Establishing first whether the dataset can support the question is the judgement the direction is hired for.'),
      mcq('Producing a confident answer with no statement of its limits is described as not thoroughness missing but:',
        [['The main risk of the job', true],
         ['A presentation problem rather than an analytical one', false],
         ['Acceptable when the stakeholder is technical', false],
         ['A style difference between analysts and engineers', false]],
        'The output is a statement people act on. An unqualified one that is wrong is the characteristic failure of the role rather than an omission.'),
    ],
  },

  /* ══ T4_DATA_BUILD ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DATA_BUILD_FROM_RAW_TO_USABLE',
    notes: `**Joining, reshaping, cleaning — and recording what you changed so the result stays
reproducible.**

## Reproducibility is the requirement, not a nicety

**An analysis nobody can re-run is an assertion.** Six weeks later somebody asks why the number
differs from theirs, and without the steps there is no way to find out.

**A script, not a sequence of manual edits.** Even when the script is ugly. The property that
matters is that running it again produces the same output from the same input.

## The order that avoids the common errors

**Filter late, not early.** A filter applied before a join changes which rows match, and the
result differs from filtering after — frequently by a lot, and always without an error.

**Deduplicate before aggregating**, and know what a duplicate means here. Two rows identical in
every column, or two rows with the same key?

**Handle nulls explicitly.** Dropping rows with nulls is a decision that removes a possibly
non-random subset. Filling them is a different decision. **Doing either silently is the mistake.**

## Record the row count at every step

**One line per transformation: what it did and how many rows survived.**

**It is the single most effective habit in data work.** An unexpected drop at step four is visible
immediately, where the same drop discovered in the final total is a day of bisecting.

## What the join is doing

**Check the grain before and after.** One row per customer before, one row per customer-order
after, and every customer-level figure computed afterwards is now multiplied.

**That is the single most common wrong number in analytics**, and the row count check catches it
at the moment it happens.`,
    mcqs: [
      mcq('A filter applied before a join differs from one applied after because it changes:',
        [['Which rows match during the join', true],
         ['The order in which the rows are returned', false],
         ['The types of the columns being compared', false],
         ['Whether the join can use an index or not', false]],
        'Removing rows before matching removes potential matches, so the surviving set differs — frequently by a lot, and with no error raised.'),
      mcq('Recording the row count after every transformation is effective because an unexpected drop at step four is:',
        [['Visible immediately, rather than after a day of bisecting', true],
         ['Automatically corrected by the next transformation', false],
         ['Reported by most data processing libraries anyway', false],
         ['Only significant when the drop exceeds a threshold', false]],
        'The same drop found in the final total gives no indication of where it happened, so the investigation has to reconstruct the whole pipeline.'),
    ],
    checkpoint: [
      mcq('The single most common wrong number in analytics comes from a join that changes the grain, so a customer-level figure computed afterwards is:',
        [['Multiplied by the number of matching rows', true],
         ['Restricted to customers who have orders', false],
         ['Averaged across the orders rather than summed', false],
         ['Computed against a different set of columns', false]],
        'Each customer row repeats once per order, so summing a customer attribute counts it once per order rather than once per customer.'),
      mcq('Dropping rows with nulls and filling them are both decisions; the mistake is:',
        [['Doing either silently', true],
         ['Choosing to drop rather than to fill them', false],
         ['Applying the same choice to every column', false],
         ['Making the choice before checking the shape', false]],
        'Each changes the result in a different direction. An unrecorded choice cannot be reviewed, reproduced or defended when the figure is questioned.'),
    ],
  },
  {
    unitCode: 'T4_DATA_BUILD_A_FIGURE_THAT_ARGUES',
    notes: `**Choosing the chart the finding needs, and the axes that would have misled.**

## The chart follows the claim

**A comparison between categories** — bars. **A change over time** — a line. **A relationship
between two quantities** — a scatter. **A distribution** — a histogram.

**Starting from the chart type and fitting the data to it is backwards**, and it is how a pie
chart with fourteen slices happens.

## The axis decisions that change the conclusion

**A truncated y-axis** turns a two percent change into a dramatic cliff. Sometimes legitimate —
when the variation genuinely matters at that scale — and it must be labelled, because the reader
is entitled to know.

**A dual axis** can be arranged to make almost any two series look correlated. Treat with
suspicion, including your own.

**Log scale** is right for data spanning orders of magnitude and misleading if the reader does
not notice. Label it prominently.

## What the figure must carry

**What is being measured**, in words rather than a column name. **The units.** **The period.**
**The sample size**, where it matters. **And the source**, so somebody can check.

**A figure without those is a picture**, and pictures get screenshotted into decks where the
context does not travel with them.

## Uncertainty

**If the difference is within the noise, the chart must say so.** Error bars, or a stated
interval, or a sentence. A bar chart of two bars that differ by less than the variation is a
visual claim the data does not support.

## The test

**Show it to somebody without explaining it and ask what it says.** If their answer is not your
finding, the figure is wrong — not their reading of it.`,
    mcqs: [
      mcq('A truncated y-axis is sometimes legitimate and must always be labelled because the reader:',
        [['Is entitled to know the scale being used', true],
         ['Will otherwise assume the data is incomplete', false],
         ['Needs it to compare against other charts shown', false],
         ['Cannot interpret the magnitude of the change', false]],
        'The visual impression is dramatically different. Disclosure is what separates a deliberate emphasis from a misleading presentation.'),
      mcq('Starting from the chart type and fitting the data to it is backwards, and is how you get:',
        [['A pie chart with fourteen slices', true],
         ['A line chart of unrelated categories', false],
         ['A scatter plot with too few data points', false],
         ['A histogram of categorical variables', false]],
        'The chart was chosen first and the data forced into it, producing a form that cannot communicate what the data contains.'),
    ],
    checkpoint: [
      mcq('A bar chart of two bars differing by less than the variation is:',
        [['A visual claim the data does not support', true],
         ['Acceptable provided the values are labelled', false],
         ['Improved by adding more categories for context', false],
         ['Fine if the difference is described in the text', false]],
        'The visual difference asserts a real one. Without error bars or a stated interval, the reader takes the comparison as meaningful.'),
      mcq('The test for a figure is to show it to somebody without explaining it; if their answer is not your finding:',
        [['The figure is wrong, not their reading', true],
         ['The finding needs to be stated more simply', false],
         ['They lack the context to interpret it properly', false],
         ['A caption should be added to guide the reader', false]],
        'The figure communicates on its own once it leaves the room. If it needs the author present, it will be misread when screenshotted into a deck.'),
    ],
  },
  {
    unitCode: 'T4_DATA_BUILD_MINI_PROJECT',
    notes: `**A real question, taken through acquisition, cleaning, analysis and a presented
answer.**

## The brief

**A question somebody would actually ask**, and data that genuinely requires work. Not a clean
teaching dataset — the cleaning is a large part of the exercise and a pre-cleaned dataset removes
it.

## The requirements

**Reproducible.** A script that runs from raw input to final figure. Somebody else runs it and
gets your numbers.

**Row counts recorded** at every transformation, in the output.

**Reconciled** against something known independently, or a statement that nothing was available.

**The limits stated** alongside the answer — coverage, granularity, attribution.

**One figure that argues**, carrying what is measured, the units, the period and the source.

## What is being assessed

**Not the sophistication of the analysis.** Whether the number is defensible.

**A simple correct answer with its limits stated beats a sophisticated one whose provenance
cannot be traced**, and students consistently expect the opposite.

## What to submit

**The script, the figure, and a one-page answer** containing the finding, the method in three
sentences, the limits, and what you would need to answer the part you could not.

**And the row-count log**, which is the artefact that shows the work was done carefully rather
than claimed to be.`,
    assignment: {
      title: 'A question, answered from data',
      description: 'Take a real question through acquisition, cleaning, analysis and a presented answer, reproducibly and with the limits stated.',
      instructions: `Pick a question somebody would actually ask, and data that genuinely requires
work. **Not a pre-cleaned teaching dataset** — the cleaning is a large part of the exercise and a
clean dataset removes it.

**Make it reproducible.** A script that runs from raw input to final figure, such that somebody
else runs it and gets your numbers. Ugly is fine; re-runnable is the requirement.

**Record the row count after every transformation**, in the output. Reconcile your totals against
something known independently, or state that nothing was available to reconcile against.

**State the limits alongside the answer** — coverage, granularity, attribution — and produce one
figure that carries what is measured, the units, the period and the source.

**Submit:** the script, the figure, the row-count log, and a one-page answer with the finding, the
method in three sentences, the limits, and what you would need to answer the part you could not.

What is assessed is not the sophistication of the analysis but whether the number is defensible. A
simple correct answer with its limits stated beats a sophisticated one whose provenance cannot be
traced, and students consistently expect the opposite.`,
      rubric: [
        { criterion: 'Reproducible from raw input', description: 'A script runs end to end and another person obtains the same numbers from the same input.', maxPoints: 25 },
        { criterion: 'Row counts and reconciliation', description: 'Counts are recorded at every step and totals are reconciled against an independent figure, or its absence is stated.', maxPoints: 25 },
        { criterion: 'Limits stated with the answer', description: 'Coverage, granularity and attribution limits accompany the finding rather than being omitted.', maxPoints: 25 },
        { criterion: 'A figure that stands alone', description: 'The chart carries what is measured, the units, the period and the source, and communicates the finding without the author present.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A pre-cleaned teaching dataset is unsuitable because it removes:',
        [['The cleaning, which is a large part of the exercise', true],
         ['The need to choose an appropriate chart type', false],
         ['Any opportunity to reconcile against a known figure', false],
         ['The requirement to make the analysis reproducible', false]],
        'Most real analytical effort goes into getting data into a usable shape, and a dataset prepared for teaching has had that work done already.'),
      mcq('The row-count log is the artefact that shows the work was:',
        [['Done carefully rather than claimed to be', true],
         ['Completed within the time that was allocated', false],
         ['Performed on the full dataset rather than a sample', false],
         ['Reviewed by somebody else before submission', false]],
        'It is a record produced during the work rather than a description written afterwards, which is what makes it evidence rather than assertion.'),
    ],
  },
  {
    unitCode: 'T4_DATA_BUILD_DEBUGGING',
    notes: `**A duplicated row, a dropped null, a filter applied too early.** Finding which one
moved the number.

## The symptom is always the same

**A number that is wrong and looks plausible.** No error, no crash, nothing in the output
suggesting a problem. That is what makes this class the defining difficulty of the direction.

## Bisect the pipeline

**Row counts at every step**, which is why recording them is the habit. Where the count changes
unexpectedly is where the fault is.

**If the counts are all as expected**, the fault is in a value rather than in a row — a wrong
join key producing matches that should not exist, or an aggregate over the wrong grain.

## The five causes

**A join that multiplied.** Grain changed, customer-level figures now counted once per order.

**A filter applied too early**, changing which rows could match.

**Nulls dropped implicitly** by a comparison or an inner join, removing a non-random subset.

**A type coercion.** Numbers stored as text, compared as text, sorted as text, summed after a
silent conversion that discarded something.

**A duplicate in the source** that was there all along and only matters now because you joined on
that column.

## The check that finds most of them

**Take one entity and follow it through by hand.** One customer, one order, one row — through
every step, checking it appears exactly as many times as it should.

**Ten minutes**, and it finds grain and duplication faults immediately, where reasoning about the
aggregate does not.

## What not to do

**Do not adjust the final figure to match expectation.** It happens, it is the worst thing
available, and the discrepancy was information about the pipeline.`,
    mcqs: [
      mcq('This class of fault is the defining difficulty of the direction because the symptom is:',
        [['A wrong number that looks plausible', true],
         ['An error that appears only on large datasets', false],
         ['A crash occurring partway through the pipeline', false],
         ['A result that varies between separate runs', false]],
        'Nothing in the system signals a problem. The output is a well-formed number, and only comparison against reality reveals it is false.'),
      mcq('If row counts are all as expected, the fault is in a value rather than a row, such as:',
        [['A wrong join key producing matches that should not exist', true],
         ['A filter that removed a non-random subset of rows', false],
         ['A duplicate present in the source data originally', false],
         ['Nulls dropped implicitly by an inner join operation', false]],
        'The other three change the count. A join on the wrong column can preserve the count while matching entirely the wrong things together.'),
    ],
    checkpoint: [
      mcq('Following one entity through every step by hand finds grain and duplication faults immediately, where reasoning about the aggregate:',
        [['Does not', true],
         ['Requires access to the source system', false],
         ['Takes longer but reaches the same answer', false],
         ['Only works when the dataset is small enough', false]],
        'An aggregate hides how many times each entity contributed. Tracing one makes the multiplication directly visible.'),
      mcq('Adjusting the final figure to match expectation is the worst thing available because the discrepancy was:',
        [['Information about the pipeline', true],
         ['Evidence the expectation itself was wrong', false],
         ['Something a reviewer would have questioned', false],
         ['Reproducible and therefore worth investigating', false]],
        'The gap pointed at a defect. Removing the gap removes the signal and leaves the defect producing wrong numbers everywhere else it is used.'),
    ],
  },
  {
    unitCode: 'T4_DATA_BUILD_INTERVIEW_QUESTION',
    notes: `**"This number looks wrong. How would you check it?"**

## Why it is the data interview's core question

**Because the job is producing numbers other people act on**, and the capability being assessed is
whether you can establish that one is right.

## The answer

**"What is it being compared against?"** Wrong relative to what — a previous period, another
system, an expectation? The three lead to different investigations.

**Reconcile first.** Does the total match an independently known figure?

**Then bisect the pipeline** by row count, step by step.

**Then trace one entity by hand.** One customer, one order, through every step.

**Then check the usual five:** a join that multiplied, a filter too early, nulls dropped, a type
coerced, a duplicate in the source.

## The follow-ups

**"It matches the source but the stakeholder says it is wrong."** Then either their expectation is
wrong or the definition differs. **Definitions are the commonest answer** — "active user" means
two things to two teams and both are right in their own terms. Finding that is a real
contribution.

**"How would you stop it happening again?"** A reconciliation check that runs with the pipeline
and fails loudly, and row counts recorded per step. Both, and the first is the one nobody has.

**"How confident are you in this number?"** A genuine answer with the reasons. Neither "completely"
nor "who can say".

## The depth marker

**Reconciling before analysing.** A candidate who starts by checking the figure against something
known independently has worked somewhere numbers mattered. One who starts reading the query is
debugging code rather than validating a result.`,
    mcqs: [
      mcq('A number that matches the source while the stakeholder says it is wrong most commonly indicates:',
        [['A definition that differs between the two', true],
         ['An error in the stakeholder’s own reporting', false],
         ['A timing difference between the two systems', false],
         ['A filter that one side applies and the other does not', false]],
        '"Active user" means different things to different teams and both are right internally. Surfacing the mismatch is a genuine contribution.'),
      mcq('The depth marker is reconciling before analysing, because a candidate who starts by reading the query is:',
        [['Debugging code rather than validating a result', true],
         ['Approaching it more thoroughly than necessary', false],
         ['Likely to find the fault more slowly than average', false],
         ['Assuming the pipeline rather than the data is wrong', false]],
        'Validation asks whether the output corresponds to reality. Reading the query asks whether the code does what it says, which is a different question.'),
    ],
    checkpoint: [
      mcq('Asked how to stop it happening again, the two answers are row counts per step and a reconciliation check that runs with the pipeline — and the second is:',
        [['The one nobody has', true],
         ['More expensive than it is worth in most cases', false],
         ['Only possible where an external figure exists', false],
         ['Redundant once the row counts are being recorded', false]],
        'Counts catch structural faults. An automated comparison against an independent figure catches the rest, and is almost never implemented.'),
      mcq('Asked how confident you are in a number, the expected answer is a genuine one with reasons, meaning neither:',
        [['"Completely" nor "who can say"', true],
         ['A percentage nor a qualitative statement', false],
         ['An interval nor a point estimate alone', false],
         ['Deferring to the source nor to the stakeholder', false]],
        'Both extremes avoid the judgement being asked for. The useful answer names what is solid, what is uncertain, and why.'),
    ],
  },

  /* ══ T4_DATA_QUALITY ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DATA_QUALITY_QUERIES_AT_SIZE',
    notes: `**When the analysis that ran on a sample does not run on the full table.**

## What changes at size

**Nothing about correctness and everything about feasibility.** The query is the same; the
strategy the database chooses is not, and an approach that was instant on ten thousand rows can
fail to finish on ten million.

## The four that appear

**A join without an index** on the join column. Fine at sample size, quadratic-feeling at full
size.

**A function applied to a filtered column**, which disqualifies the index. \`WHERE
year(created) = 2025\` cannot use an index on \`created\`; a range comparison can.

**Loading everything into memory** to process it. Works until the data exceeds the machine.

**A cross join by accident** — a missing join condition. At sample size it produces a large
result; at full size it produces one nobody can wait for.

## The strategies

**Push the work to the database.** Aggregate there rather than loading rows and summing them in
code. It is what the database is for and it is orders of magnitude faster.

**Filter as early as the correctness allows** — which is not the same as as early as possible,
because a filter before a join changes the answer.

**Sample deliberately for exploration** and run the final analysis on everything, with the
sampling method recorded.

## The reproducibility cost of size

**A long-running pipeline gets run once and the result copied around.** Then nobody re-runs it,
the steps drift out of memory, and the number becomes folklore.

**Which is an argument for making it fast enough to re-run**, and it is a better argument than
speed for its own sake.`,
    mcqs: [
      mcq('`WHERE year(created) = 2025` cannot use an index on `created`, and the alternative that can is:',
        [['A range comparison on the raw column', true],
         ['An index built on the year expression itself', false],
         ['Casting the column to a date before comparing', false],
         ['Filtering after the rows have been retrieved', false]],
        'A range between two dates compares stored values directly, so the ordered index applies. The function produces values the index does not contain.'),
      mcq('Aggregating in the database rather than loading rows and summing them in code is orders of magnitude faster because it is:',
        [['What the database is built to do', true],
         ['Performed on a machine with more memory', false],
         ['Cached automatically between repeated runs', false],
         ['Executed in parallel across several cores', false]],
        'The engine aggregates over stored data without transferring it, avoiding both the transfer cost and the per-row overhead in the client.'),
    ],
    checkpoint: [
      mcq('A long-running pipeline gets run once and the result copied around, after which the number becomes:',
        [['Folklore, with the steps out of memory', true],
         ['Stale, but still broadly representative', false],
         ['Cached by the reporting system permanently', false],
         ['Difficult to reconcile with other figures', false]],
        'Nobody re-runs it, so nobody can say how it was produced. The figure persists with its provenance lost, which is the argument for making it re-runnable.'),
      mcq('"Filter as early as correctness allows" differs from "as early as possible" because a filter before a join:',
        [['Changes the answer', true],
         ['Prevents the index from being used at all', false],
         ['Costs more than filtering afterwards does', false],
         ['Cannot be expressed in a single query', false]],
        'Removing rows before matching removes potential matches, so the result differs from filtering the joined output — and neither is universally correct.'),
    ],
  },
  {
    unitCode: 'T4_DATA_QUALITY_HARDER_FAULT',
    notes: `**An analysis that passes every check it has and is still wrong.**

## Why these survive

**The checks verify the pipeline**, and these faults are in the relationship between the data and
the world it claims to describe. No row count catches them.

## The five

**Survivorship.** The dataset contains what survived. Customers who churned are not in the active
customers table, and an analysis of "our customers" is an analysis of the ones who stayed.

**A definition that changed mid-period.** "Active" was redefined in March, and the trend across
that boundary is measuring the definition rather than the behaviour.

**A late-arriving row.** The most recent period looks lower because its data is not complete yet,
and it is reported as a decline every single time.

**A duplicate that is legitimate.** Two rows for one customer because they have two accounts. Not
a data quality problem; a grain assumption that was wrong.

**Timezone.** Events bucketed by day in one timezone and compared against a figure bucketed in
another. Small, consistent, and it moves every daily number.

## Finding them

**Ask what would have to be true for this number to mean what I am claiming.** Then check each
one. **It is a slow question and it is the only one that reaches this class.**

## The one that recurs most

**The incomplete recent period.** It is reported as a trend, escalated, investigated, and turns
out to be nothing — repeatedly, in every organisation, because the dashboard does not say the
period is partial.`,
    mcqs: [
      mcq('An analysis of "our customers" using the active customers table is actually an analysis of:',
        [['The ones who stayed', true],
         ['A random sample of the customer base', false],
         ['Customers acquired within the period shown', false],
         ['Those whose records are complete enough to use', false]],
        'Churned customers are absent by construction, so every conclusion describes survivors and is silently generalised to everybody.'),
      mcq('The most recent period appearing lower because its data is incomplete is reported as a decline every time because the dashboard:',
        [['Does not say the period is partial', true],
         ['Refreshes before the data has been validated', false],
         ['Compares against a period of different length', false],
         ['Excludes rows that arrived after the cutoff', false]],
        'The chart presents the partial period identically to the complete ones, so the reader has no way to know the comparison is not like for like.'),
    ],
    checkpoint: [
      mcq('A definition that changed mid-period means the trend across that boundary is measuring:',
        [['The definition rather than the behaviour', true],
         ['Two populations that cannot be compared', false],
         ['A seasonal effect rather than a real change', false],
         ['The reporting system rather than the business', false]],
        'The metric changed what it counts, so the step in the series is an artefact of the change rather than anything happening in the world.'),
      mcq('The question that reaches this class is what would have to be true for the number to mean what you are claiming, and it is described as:',
        [['Slow, and the only one that reaches them', true],
         ['Fast, once the pipeline checks are complete', false],
         ['Applicable only to observational datasets', false],
         ['A formal technique with a standard procedure', false]],
        'It requires enumerating and checking assumptions about the world rather than the data, which no automated check performs.'),
    ],
  },
  {
    unitCode: 'T4_DATA_QUALITY_PRACTICE',
    notes: `**Reviewing an analysis without being told what is wrong with it.**

## The drill

**An analysis and its conclusion, thirty minutes.** Find what would make the conclusion unsafe.

## The review checklist

**What does this dataset exclude?** Survivorship, coverage, selection.

**Did the grain change anywhere?** A join that multiplied.

**Were nulls handled, and was the missingness random?**

**Is the most recent period complete?**

**Did any definition change within the period?**

**Does the total reconcile against anything known?**

**Does the chart's axis or scale overstate the finding?**

Seven questions, twenty minutes, any analysis.

## Ordering the findings

**By whether they change the conclusion.** A number that is slightly off and a number that points
the wrong way are different categories, and only the second is urgent.

**Students order by how confident they are**, which puts the obvious small things first.

## Writing it up

**State what the conclusion would have to assume.** "This holds only if churned customers behave
like retained ones, which the data cannot show." That is a finding somebody can act on and cannot
easily dismiss.

## Why this is the practice unit

**Because reviewing somebody else's analysis is a large part of the job**, and it is where the
judgement built in the rest of the track becomes visible to other people.`,
    mcqs: [
      mcq('Findings should be ordered by whether they change the conclusion, because a number slightly off and a number pointing the wrong way are:',
        [['Different categories, and only the second is urgent', true],
         ['Both urgent, since either undermines the result', false],
         ['Equally likely to be noticed by a stakeholder', false],
         ['Symptoms of the same underlying pipeline fault', false]],
        'Precision errors change the magnitude; directional errors change the decision. Only the second makes the conclusion actively misleading.'),
      mcq('"This holds only if churned customers behave like retained ones, which the data cannot show" is hard to dismiss because it states:',
        [['What the conclusion would have to assume', true],
         ['A defect in the way the query was written', false],
         ['An alternative conclusion the data supports', false],
         ['The magnitude of the error that was introduced', false]],
        'Naming the required assumption puts the burden on whoever wants to keep the conclusion, rather than on the reviewer to disprove it.'),
    ],
    checkpoint: [
      mcq('Reviewing somebody else’s analysis is where the judgement built in the track becomes:',
        [['Visible to other people', true],
         ['Applicable to datasets you did not collect', false],
         ['Faster than performing the analysis yourself', false],
         ['Independent of the tools being used for it', false]],
        'Analysis produces a number; review produces an assessment of somebody else’s reasoning, which is where the capability is demonstrated rather than used.'),
      mcq('Students order findings by confidence, which puts:',
        [['The obvious small things first', true],
         ['Structural problems ahead of presentational ones', false],
         ['Findings about the data before those about the chart', false],
         ['The hardest-to-verify items at the top of the list', false]],
        'Certainty correlates with simplicity rather than with importance, so a formatting issue outranks a possible directional error.'),
    ],
  },
  {
    unitCode: 'T4_DATA_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How do you know your analysis is right?"**

## Why it is asked

**Because the output is a statement people act on**, and the direction's characteristic failure is
a confident wrong answer. The question is looking for a process rather than a reassurance.

## The answer

**Reconciliation.** Does a total match something known independently? **Name this first**; it is
the strongest single check and the one candidates most often omit.

**Row counts per step**, so a structural fault is visible where it happens.

**Tracing one entity by hand** through the pipeline.

**Stating the assumptions** the conclusion requires, and checking each.

**And reproducibility** — somebody else runs it and gets the same numbers.

## The follow-ups

**"What if there is nothing to reconcile against?"** Say so explicitly in the output. An
unreconciled figure is not wrong; it is unverified, and the reader is entitled to know which.

**"Have you ever produced a wrong number?"** Yes is the only credible answer. What matters is how
it was found, what it cost, and what check exists now that did not.

**"How do you present uncertainty to somebody who wants a yes or no?"** Give the answer, then the
confidence, then the one thing that would change it. In that order — leading with caveats means
the answer is never heard.

## The depth marker

**Reconciliation, unprompted.** It is the practice of somebody who has worked where numbers were
checked against reality, and it is rare in candidates whose experience is coursework.

## What loses marks

**"I double-check my code."** It answers whether the code does what you intended, which was never
the question. The question was whether the result is true.`,
    mcqs: [
      mcq('"I double-check my code" loses marks because it answers whether the code does what you intended, which:',
        [['Was never the question', true],
         ['Is difficult to verify without a reviewer', false],
         ['Matters less than the choice of methodology', false],
         ['Only applies to the transformation steps involved', false]],
        'The question is whether the result corresponds to reality. Correct code operating on a misunderstood dataset produces a confident wrong answer.'),
      mcq('Presenting uncertainty to somebody who wants a yes or no means giving the answer, the confidence, then the one thing that would change it — in that order because leading with caveats means:',
        [['The answer is never heard', true],
         ['The caveats are given too much weight', false],
         ['The listener assumes the analysis failed', false],
         ['The conversation runs out of time too soon', false]],
        'Listeners stop attending during preamble. The answer first is what makes the qualification land rather than replace it.'),
    ],
    checkpoint: [
      mcq('The depth marker is mentioning reconciliation unprompted, because it is the practice of somebody who has worked where numbers were:',
        [['Checked against reality', true],
         ['Produced under time pressure regularly', false],
         ['Reviewed by a second analyst each time', false],
         ['Published to an external audience often', false]],
        'Coursework datasets have no independent figure to compare against, so the habit only forms where a real external number existed.'),
      mcq('An unreconciled figure is not wrong but:',
        [['Unverified, and the reader is entitled to know', true],
         ['Unsuitable for presentation to stakeholders', false],
         ['Likely to be incorrect in most of the cases', false],
         ['Acceptable only for exploratory analysis work', false]],
        'The distinction between checked and unchecked is information the reader needs in order to decide how much weight to place on it.'),
    ],
  },

  /* ══ T4_DATA_PROOF ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DATA_PROOF_ADVANCED_CHALLENGE',
    notes: `**Present a finding that is real but not certain, to somebody who wants a yes or a
no.**

## The brief

**Take a genuine finding from your own analysis** where the evidence points one way and does not
settle it. Most real findings are like this, which is why it is the challenge.

**Then present it in five minutes**, to a person, and take the questions.

## What the presentation must do

**Give the answer first.** The finding, in one sentence, with the number.

**Then the confidence**, honestly. How strong is this, and what is the interval or the caveat.

**Then the one thing that would change it.** A different dataset, a controlled test, a longer
period.

**Then stop.** The commonest failure is continuing into the method until the audience has lost the
finding.

## The questions you will get

**"So should we do it?"** The decision is theirs and the input is yours. Saying "if you value X
more than Y, then yes" is the useful form — it hands back a decision rule rather than a verdict.

**"How sure are you?"** Have a real answer. Not a percentage invented on the spot; a reason.

**"Somebody else's number says the opposite."** Ask what they measured. It is usually a definition
difference, and establishing that is more valuable than either number.

## What this is really assessing

**Whether you can be honest about uncertainty without becoming useless.** Both failures are
common: the analyst who presents everything as settled, and the one who qualifies until nobody can
act. **The job is the narrow path between them**, and it is practised rather than understood.

## What to submit

**The presentation as a short recording or a written script**, and a note on which question was
hardest and what you said.`,
    assignment: {
      title: 'Presenting an uncertain finding',
      description: 'Present a real but unsettled finding in five minutes, answer first and confidence second, and handle the questions without becoming either overconfident or useless.',
      instructions: `Take a genuine finding from your own analysis where the evidence points one
way without settling it. Most real findings are like this, which is why it is the challenge.

**Present it in five minutes, to a person, and take the questions.**

**Structure it: the answer first**, in one sentence with the number. **Then the confidence**,
honestly, with the interval or the caveat. **Then the one thing that would change it** — a
different dataset, a controlled test, a longer period. **Then stop.** The commonest failure is
continuing into the method until the audience has lost the finding.

Expect: "so should we do it?", "how sure are you?", and "somebody else's number says the
opposite". For the first, hand back a decision rule rather than a verdict. For the third, ask what
they measured — it is usually a definition difference, and establishing that is worth more than
either number.

**Submit:** the presentation as a short recording or a written script, and a note on which
question was hardest and what you said. What is being assessed is whether you can be honest about
uncertainty without becoming useless — both failures are common, and the job is the narrow path
between them.`,
      rubric: [
        { criterion: 'Answer first, then confidence', description: 'The finding and its number arrive in the first sentence, with the qualification following rather than preceding.', maxPoints: 30 },
        { criterion: 'The uncertainty is real and specific', description: 'The confidence statement has a reason behind it rather than a figure invented for the occasion.', maxPoints: 25 },
        { criterion: 'A decision rule, not a verdict', description: 'Asked whether to act, the response hands back the trade-off rather than making the decision or refusing to engage.', maxPoints: 25 },
        { criterion: 'Honest without being useless', description: 'The presentation neither overstates certainty nor qualifies to the point where nobody could act on it.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Asked "so should we do it?", the useful form of answer is:',
        [['"If you value X more than Y, then yes"', true],
         ['A clear recommendation based on the evidence', false],
         ['A statement that the decision is not yours to make', false],
         ['A request for more data before deciding anything', false]],
        'It hands back a decision rule, which respects that the trade-off belongs to them while still making the analysis actionable.'),
      mcq('The two common failures this challenge sits between are the analyst who presents everything as settled and the one who:',
        [['Qualifies until nobody can act', true],
         ['Refuses to present findings at all', false],
         ['Defers every question to a colleague', false],
         ['Presents the method before the finding', false]],
        'Both make the analysis useless — one by being wrong confidently and the other by being right unusably. The narrow path is what is practised here.'),
    ],
  },
  {
    unitCode: 'T4_DATA_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on data and analytics alone.**

## Where it starts

**A question and a dataset**, or your own analysis. They establish whether you reach for the data
or for the question's answerability.

## Where it goes

**"What does this data exclude?"** Coverage, survivorship, selection.

**"This number looks wrong."** Reconcile, bisect by row count, trace one entity.

**"Did the change cause the effect?"** Almost never from observational data, and what would
establish it.

**"The stakeholder disagrees with your result."** Check your work, then definitions — which is
usually the answer.

**"Explain this to somebody non-technical."** Frequently the hardest part of the round, and
scored heavily because it is most of the job.

**"How would you make this run on the full dataset?"** Push work to the database, filter as early
as correctness allows, index the join.

## The depth markers

**Reconciliation, unprompted.** **Saying what the data cannot answer.** **Giving a number with its
interval rather than either alone.** Any one of those signals experience beyond coursework.

## The failure mode

**Technical fluency with no epistemics.** A candidate who can write any query and never asks
whether the result means what it appears to. It is common in students who learned the tools well,
and the round is specifically designed to find it.

## How to prepare

**Three stories: a wrong number you produced and how it was found, a question you declined to
answer from the available data, and a finding you had to present to somebody who did not want
it.** The second is rare and marks a candidate out immediately.`,
    mcqs: [
      mcq('The failure mode this round is designed to find is technical fluency with:',
        [['No epistemics', true],
         ['Insufficient statistical background knowledge', false],
         ['Limited experience of large datasets', false],
         ['Poor familiarity with visualisation tools', false]],
        'A candidate who can write any query and never asks whether the result means what it appears to is the characteristic risk of the role.'),
      mcq('"Explain this to somebody non-technical" is scored heavily because it is:',
        [['Most of the job', true],
         ['The hardest question in the round to prepare', false],
         ['A proxy for how well the analysis was done', false],
         ['Required in every data role advertisement', false]],
        'The output is a statement other people act on, and an analysis that cannot be conveyed to the decision-maker has produced nothing usable.'),
    ],
    checkpoint: [
      mcq('Of the three stories to prepare, the rare one that marks a candidate out immediately is:',
        [['A question you declined to answer from the data', true],
         ['A wrong number you produced and then found', false],
         ['A finding presented to an unwilling audience', false],
         ['An analysis that ran on a very large dataset', false]],
        'It requires having recognised unanswerability and said so, which is the judgement the direction exists for and which coursework rarely produces.'),
      mcq('A depth marker is giving a number with its interval rather than:',
        [['Either one alone', true],
         ['A percentage confidence figure attached', false],
         ['A qualitative description of the certainty', false],
         ['The raw data that supports the calculation', false]],
        'A point estimate alone overstates precision and an interval alone is unactionable. Both together is what a decision can be made from.'),
    ],
  },
  {
    unitCode: 'T4_DATA_PROOF_CHECKPOINT',
    notes: `**Whether data capability is demonstrable.**

## What the track asked for

**Judging** — what a dataset can and cannot answer, before any analysis.

**Producing** — a reproducible pipeline with row counts and a reconciliation.

**Protecting** — finding the faults that produce a plausible wrong number.

**Communicating** — a finding presented with its uncertainty, to somebody who wants certainty.

## The bar

**The first and the last are the direction.** The middle two are craft that can be taught in
weeks. Knowing what a number can support, and being able to say so to somebody who would rather
you did not, is what a data role is hired for and what almost no student portfolio shows.

## What a reviewer looks at

**The row-count log and the reconciliation**, because they are evidence of care rather than a
claim of it, and almost nobody produces them.

**The limits stated alongside the finding**, because their presence says more about the analyst
than the finding does.

## If this does not pass

**The usual gap is confidence.** The analysis is competent and presented as settled, with no
statement of coverage, no reconciliation, and no interval. **That is a week of adding the
statements** — and the adding forces the checking, which is why it is worth more than it sounds.

## What this feeds

**Mock 5** on data depth, which opens with a dataset and a question. **The portfolio**, where the
one-page answer with its limits is the piece worth showing. **P14's production project**, whose
requirement that decisions be justified assumes you can distinguish what your evidence supports
from what it does not.`,
    checkpoint: [
      mcq('The two parts of the track that constitute the direction are judging answerability and:',
        [['Communicating a finding with its uncertainty', true],
         ['Producing a reproducible analysis pipeline', false],
         ['Finding faults that produce wrong numbers', false],
         ['Making queries run at full data size', false]],
        'The middle two are craft teachable in weeks. Knowing what a number supports and saying so to a reluctant audience is the scarce capability.'),
      mcq('The row-count log and the reconciliation are what a reviewer looks at because they are:',
        [['Evidence of care rather than a claim of it', true],
         ['The quickest parts of the submission to check', false],
         ['Required by the assignment specification itself', false],
         ['The only parts that cannot be produced afterwards', false]],
        'They are artefacts generated during the work. A description of careful method can be written at the end; these cannot.'),
      mcq('When this checkpoint does not pass, the usual gap is confidence — and adding the missing statements is worth more than it sounds because:',
        [['The adding forces the checking', true],
         ['Reviewers weight the statements heavily', false],
         ['It is the fastest change to make in a week', false],
         ['The analysis itself rarely needs any change', false]],
        'You cannot state the coverage or the interval without establishing them, so the documentation requirement produces the verification as a side effect.'),
      mcq('P14’s requirement that decisions be justified assumes from this track that you can distinguish:',
        [['What your evidence supports from what it does not', true],
         ['A technical decision from a business one', false],
         ['Reproducible analysis from ad-hoc exploration', false],
         ['A correlation from a causal relationship', false]],
        'Justifying a decision means knowing the strength of what supports it, which is the same judgement the track spent its month building.'),
    ],
  },
];
