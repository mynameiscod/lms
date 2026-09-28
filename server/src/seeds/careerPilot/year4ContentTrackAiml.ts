/**
 * The AI & Machine Learning specialization track — sixteen units. Module P10.
 *
 * ── WHAT THIS TRACK REFUSES TO BE ─────────────────────────────────────────────────────────
 *
 * Not a course in algorithms. A placement year has one month, the student will not be designing
 * novel methods, and an interviewer for an applied role does not ask them to derive
 * backpropagation. What they ask is whether the evaluation means anything, where the data came
 * from, and what the model does badly — and those are the three things a student who learned
 * from tutorials cannot answer.
 *
 * So the weighting is deliberate: framing and baselines, what the model is actually learning
 * from, evaluation that is not flattering itself, and honest reporting of failure modes. The
 * algorithms are assumed and are not the assessment.
 *
 * ── THE CHARACTERISTIC FAILURE OF THE DIRECTION ───────────────────────────────────────────
 *
 * A number that is too good. Leakage, an unfair split, a target hidden in a feature, a test set
 * that overlaps the training set. Every one produces a high score, and the high score is what
 * makes it survive — nobody investigates a result they are pleased with. That is why the QUALITY
 * topic is built around detection rather than around metrics.
 *
 * Attribution: T4_AIML_DEPTH defaults to ML_WORKFLOW with framing on AI_ML_CONCEPTS and features
 * on FEATURE_ENGINEERING; T4_AIML_BUILD to ML_WORKFLOW with the applied unit on GENERATIVE_AI_LLM
 * and the fault on DATA_WRANGLING; T4_AIML_QUALITY to ML_EVALUATION with the harm unit on
 * AI_RESPONSIBLE_USE; T4_AIML_PROOF to ML_EVALUATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_AIML_BUNDLES: PilotBundle[] = [
  /* ══ T4_AIML_DEPTH ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AIML_DEPTH_FRAMING_AND_BASELINE',
    notes: `**What is being predicted, from what, for whom — and the trivial baseline any model
must beat.**

## Framing first

**What is the prediction?** A label, a number, a ranking. Stating it precisely rules out half the
approaches immediately.

**From what information, available when?** This is the question that catches most beginners. A
feature that only exists after the thing you are predicting has happened cannot be used, however
predictive it looks.

**For whom, and what happens next?** A prediction nobody acts on is an exercise. Knowing the
action tells you which errors matter, and that decides the metric.

## The baseline is not optional

**Predict the most common class.** **Predict the mean.** **Predict yesterday's value.**

**Whichever is appropriate, compute it first**, and write the number down.

## Why it matters more than it sounds

**A model at 94% accuracy is meaningless until you know the baseline.** If 94% of the data is one
class, predicting that class always gives 94% and your model has learned nothing.

**This is the single most common misleading result in student projects**, and the baseline is a
three-line defence against it.

## The baseline also tells you when to stop

**If a simple model gets within a percentage point of a complex one**, the complex one is costing
you interpretability, training time and deployment difficulty for nothing.

**Nobody is impressed by the more complicated model.** They are impressed by knowing which one is
justified, which requires having measured both.

## What to record

**The framing in two sentences, the baseline number, and the metric with the reason for it.**
Three items, before any modelling, and they are the first three questions in every applied
interview.`,
    mcqs: [
      mcq('A feature that only exists after the predicted event has occurred cannot be used because at prediction time it is:',
        [['Not available, however predictive it looks', true],
         ['Correlated too strongly with the target value', false],
         ['Likely to be missing for most of the rows', false],
         ['Expensive to compute for each new prediction', false]],
        'The model would need information that does not exist yet when it runs, so a score obtained with it cannot be reproduced in use.'),
      mcq('A model at 94% accuracy is meaningless until you know the baseline because if 94% of the data is one class:',
        [['Predicting that class always scores the same', true],
         ['The remaining class cannot be learned at all', false],
         ['The metric should be changed to a different one', false],
         ['The training set needs to be rebalanced first', false]],
        'The trivial constant predictor achieves the same number, so the score demonstrates nothing about what the model learned.'),
    ],
    checkpoint: [
      mcq('If a simple model gets within a percentage point of a complex one, the complex one is costing:',
        [['Interpretability and deployment difficulty for nothing', true],
         ['Training time that could be reduced by tuning', false],
         ['Accuracy that would appear on a larger dataset', false],
         ['Nothing, since the better score justifies itself', false]],
        'A marginal gain bought with substantial operational cost is a bad trade, and knowing which model is justified requires having measured both.'),
      mcq('Knowing what happens after a prediction tells you which errors matter, which in turn decides:',
        [['The metric', true],
         ['The algorithm family to select from', false],
         ['How much training data will be required', false],
         ['Whether the problem is supervised or not', false]],
        'A false positive and a false negative have different consequences depending on the action taken, and the metric must weight them accordingly.'),
    ],
  },
  {
    unitCode: 'T4_AIML_DEPTH_WHAT_THE_MODEL_LEARNS_FROM',
    notes: `**Features, representation, and the column that is a proxy for the answer.**

## The model learns whatever correlates

**It has no idea what any column means.** If a row's identifier happens to be assigned in order
and the target changes over time, the identifier predicts the target — and the model will use it
enthusiastically.

**That is not intelligence. It is the model doing exactly what it was asked.**

## The proxies that keep appearing

**An identifier that encodes time.** Sequential ids, file creation order, row position.

**A field populated only for one outcome.** A "resolution date" present only for closed tickets,
predicting whether the ticket is closed with perfect accuracy.

**An aggregate computed over the whole dataset**, including the rows you are predicting. A
customer's average order value, computed including the order in question.

**A duplicate of the target under another name.** More common than it sounds, especially in data
assembled from several systems.

## Representation matters as much as selection

**Categories are not numbers.** Encoding "red, green, blue" as 1, 2, 3 tells the model that green
is between red and blue and that blue is three times red.

**Scale matters for distance-based methods.** A feature measured in thousands dominates one
measured in fractions, for no reason other than its units.

**Dates are not numbers either**, until you decide what about them matters: day of week, month,
time since an event.

## The question to ask about every feature

**"Would I have this, with this value, at the moment I need the prediction?"**

**If the honest answer is no or unsure, remove it and see what the score does.** A large drop is
informative, and frequently it is the finding.`,
    mcqs: [
      mcq('Encoding "red, green, blue" as 1, 2, 3 tells the model that green is between red and blue and that:',
        [['Blue is three times red', true],
         ['Each colour appears equally often', false],
         ['The categories form a closed set', false],
         ['Red should be the default value', false]],
        'Numeric encoding implies both ordering and magnitude, neither of which exists in an unordered categorical variable.'),
      mcq('A "resolution date" present only for closed tickets predicts closure with perfect accuracy because the field is:',
        [['A consequence of the outcome being predicted', true],
         ['Correlated with the age of the ticket record', false],
         ['Missing at random across the whole dataset', false],
         ['Recorded by the same system as the target', false]],
        'Its presence is caused by the event, so the model learns to read the answer rather than to predict it.'),
    ],
    checkpoint: [
      mcq('The question to ask about every feature is whether you would have it, with that value, at:',
        [['The moment the prediction is needed', true],
         ['the time the training data was collected', false],
         ['Every stage of the processing pipeline', false],
         ['The point the model is retrained again', false]],
        'Availability at prediction time is the constraint. A feature available only in the historical record cannot be used in production.'),
      mcq('Removing a suspect feature and seeing a large drop in the score is informative because it suggests the feature was:',
        [['Carrying most of the signal, possibly improperly', true],
         ['Redundant with the other features present', false],
         ['Poorly scaled relative to its neighbours', false],
         ['Missing for a substantial share of the rows', false]],
        'A single feature dominating the result is the pattern leakage produces, so the drop is a prompt to examine how that column is populated.'),
    ],
  },
  {
    unitCode: 'T4_AIML_DEPTH_PRACTICE',
    notes: `**Applying both ideas to a problem you did not frame.**

## The drill

**A dataset and a stated prediction task.** In thirty minutes produce:

**The framing in two sentences** — what is predicted, from what available when, for whom.

**The baseline**, computed, with its number.

**A feature audit**: for each column, would you have it at prediction time, and is it a proxy for
the target.

**One feature you would remove**, with the reason.

## The second half

**Train something simple**, compare against the baseline, and state whether the difference is
worth anything.

**"It beat the baseline by 0.4 percentage points" is an honest and common result**, and reporting
it as such is the exercise. Students are reluctant to, because it feels like failure — it is not,
it is a measurement.

## What good looks like

**The feature audit finds something.** In almost every real dataset at least one column is
unavailable at prediction time or is a partial proxy, and finding it before modelling rather than
after is what the drill builds.

## Why thirty minutes

**Because this must precede modelling every time**, and anything that takes a day gets skipped in
favour of getting a number quickly. The number arrives either way; only the framing decides
whether it means anything.`,
    mcqs: [
      mcq('"It beat the baseline by 0.4 percentage points" is described as an honest and common result that students are reluctant to report because it:',
        [['Feels like failure rather than a measurement', true],
         ['Suggests the model was trained incorrectly', false],
         ['Indicates the dataset was too small to use', false],
         ['Means the baseline was chosen too generously', false]],
        'A small margin is a genuine finding about the problem. Treating it as a poor outcome is what leads to overfitting in pursuit of a better number.'),
      mcq('The framing must precede modelling every time, and a procedure taking a day gets skipped in favour of:',
        [['Getting a number quickly', true],
         ['Collecting more data for the problem', false],
         ['Reviewing the literature on the task', false],
         ['Cleaning the dataset more thoroughly', false]],
        'The score is obtainable without the framing, so the framing is what gets dropped under pressure unless it is short enough to survive.'),
    ],
    checkpoint: [
      mcq('In almost every real dataset the feature audit finds at least one column that is:',
        [['Unavailable at prediction time or a partial proxy', true],
         ['Duplicated exactly by another column present', false],
         ['Constant across every row in the dataset', false],
         ['Stored in a format the model cannot accept', false]],
        'Data assembled from operational systems routinely contains fields populated after the fact, and finding them before modelling is the point.'),
      mcq('Only the framing decides whether the number means anything, because the number:',
        [['Arrives either way', true],
         ['Depends on the algorithm that was chosen', false],
         ['Varies with the random seed being used', false],
         ['Requires a baseline to be computed first', false]],
        'Training produces a score regardless of whether the problem was posed sensibly, so the score alone carries no information about validity.'),
    ],
  },
  {
    unitCode: 'T4_AIML_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Tell me about a model you built. How did you know it worked?"**

## Why the second half is the question

**Anybody can describe a model.** What separates an applied candidate is whether the evaluation
means anything, and most student projects have a number with no baseline, no held-out discipline
and no examination of what the model got wrong.

## The answer

**The framing.** What was predicted, from what available when, for whom.

**The baseline**, with its number. **Volunteering this is the strongest single move in the
question**, because most candidates do not have one and the interviewer knows it.

**The split**, and why it was valid. Random, or by time, or by group — and the reason.

**The metric**, and why that metric rather than accuracy.

**What it got wrong**, and for whom.

## The follow-ups

**"Why that metric?"** Because of what happens after a prediction. Accuracy on imbalanced data is
the standard trap and saying so unprompted is a marker.

**"How did you split the data?"** If there is a time dimension, a random split leaks the future
into training. If there are groups — multiple rows per customer — a random split puts the same
customer on both sides.

**"Would it work on next month's data?"** The honest answer involves distribution shift and
whether anything would detect it.

## The depth marker

**Talking about what the model does badly, unprompted.** Every model fails somewhere. A candidate
who has only characterised the success has not finished evaluating.

## What loses marks

**A single accuracy figure with no context.** It is the shape of an answer from somebody who
followed a tutorial to its final cell and stopped.`,
    mcqs: [
      mcq('With multiple rows per customer, a random split puts the same customer on both sides, which makes the test score:',
        [['Optimistic, since the model has seen that customer', true],
         ['Unstable between different random seeds used', false],
         ['Lower than it would otherwise have been', false],
         ['Valid only for customers with few records', false]],
        'Information about an individual appears in training and in test, so the evaluation measures recall of that individual rather than generalisation.'),
      mcq('A single accuracy figure with no context is the shape of an answer from somebody who:',
        [['Followed a tutorial to its final cell and stopped', true],
         ['Was short of time during the project work', false],
         ['Prioritised deployment over the evaluation', false],
         ['Used a library that reports only that metric', false]],
        'Tutorials end at the score. Baseline, split rationale and error analysis are the steps that follow and that a real application requires.'),
    ],
    checkpoint: [
      mcq('Volunteering the baseline is the strongest single move because most candidates do not have one and:',
        [['The interviewer knows it', true],
         ['It is quick to compute during the answer', false],
         ['It demonstrates familiarity with the dataset', false],
         ['Baselines are required by most competitions', false]],
        'It is a known gap in student work, so its presence immediately distinguishes the candidate from the typical answer.'),
      mcq('The depth marker is talking about what the model does badly unprompted, because a candidate who has only characterised the success has:',
        [['Not finished evaluating', true],
         ['Probably used too small a test set', false],
         ['Chosen a metric that hides the errors', false],
         ['Been unlucky with the data they received', false]],
        'Evaluation includes the error profile. Knowing only the aggregate score means the failure modes have not been examined at all.'),
    ],
  },

  /* ══ T4_AIML_BUILD ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AIML_BUILD_THE_WORKFLOW',
    notes: `**Data, split, train, evaluate — in that order, and what goes wrong when it is run out
of order.**

## Split before you look

**The test set is set aside before any decision is made from the data.** Before scaling, before
choosing features, before imputing missing values.

**Every decision made while looking at the test set leaks it**, and the leak is invisible: the
score improves and nothing signals why.

## The order, precisely

**Split. Fit transformations on training only. Apply them to test. Train. Evaluate once.**

**"Fit on training only" is the step most often got wrong.** Scaling using the mean of the whole
dataset uses test information. So does imputing with a global median, and so does selecting
features by their correlation with the target across everything.

## Validation is not test

**Validation is for choosing** — hyperparameters, features, model family. It can be looked at
repeatedly.

**Test is for reporting**, and it is looked at once. Choosing anything on the basis of the test
score makes it a validation set, and you no longer have an honest estimate.

**Cross-validation is how you get a reliable validation signal from limited data**, and it does
not replace a held-out test set.

## When the data has structure

**Time:** split by time, always. Training on the future to predict the past is not a scenario
that occurs in production.

**Groups:** split by group. Same customer, same patient, same document on one side only.

**Class imbalance:** stratify, so both sides have a representative mix.

## The one-line summary worth remembering

**Anything you decide from the data must be decided from training data alone**, and the test set
is opened once, at the end, and reported whatever it says.`,
    mcqs: [
      mcq('Scaling using the mean of the whole dataset before splitting leaks test information because the transformation was:',
        [['Fitted using rows in the test set', true],
         ['Applied after the model had been trained', false],
         ['Computed with a different method per side', false],
         ['Chosen without validating its effect first', false]],
        'The training transformation now encodes statistics from data the model is supposed not to have seen, which inflates the reported score.'),
      mcq('Choosing a hyperparameter on the basis of the test score means you no longer have:',
        [['An honest estimate of generalisation', true],
         ['Enough data left to train the model', false],
         ['A valid comparison against the baseline', false],
         ['The ability to retrain on the full dataset', false]],
        'The test set has been used to make a decision, which makes it a validation set, and the reported number is optimistic by an unknown amount.'),
    ],
    checkpoint: [
      mcq('With a time dimension present, splitting by time rather than randomly is required because training on the future to predict the past:',
        [['Is not a scenario that occurs in production', true],
         ['Produces a model that trains more slowly', false],
         ['Requires the data to be sorted beforehand', false],
         ['Reduces the amount of usable training data', false]],
        'The deployed model only ever sees past data, so an evaluation that gives it future information measures a capability it will never have.'),
      mcq('Cross-validation gives a reliable validation signal from limited data and:',
        [['Does not replace a held-out test set', true],
         ['Removes the need to split by group as well', false],
         ['Is only valid when the classes are balanced', false],
         ['Produces an unbiased estimate of final accuracy', false]],
        'Every fold has been used for selection, so the whole cross-validated set is a validation set and a separate untouched test set is still needed.'),
    ],
  },
  {
    unitCode: 'T4_AIML_BUILD_USING_A_MODEL_YOU_DID_NOT_TRAIN',
    notes: `**Applied ML: prompting, fine-tuning or an API — and being honest about which you
did.**

## Most applied work builds on somebody else's model

**That is not a lesser activity.** The engineering is in the surrounding system: what goes in, how
the output is validated, what happens when it is wrong, and how you know whether it is working.

## The three approaches and when each fits

**An API call.** Fastest, no infrastructure, and you are dependent on somebody else's availability,
pricing and versioning. **The model can change under you**, which is a real operational risk few
students have considered.

**Prompting a general model.** Cheap to iterate, and the behaviour is difficult to guarantee. Fine
where the output is checked by a human or validated by code.

**Fine-tuning.** Worth it when you have genuinely task-specific data and the general model
underperforms on it. Expensive in data preparation rather than in compute, which is the opposite
of what most people expect.

## The engineering around it is the actual work

**Validate the output.** A generative model returns text, and text that should be JSON is
sometimes not JSON. Parse defensively and have a path for when it fails.

**Bound the input.** Unbounded user text reaching a model is a cost problem and an injection
problem at once.

**Handle failure.** Rate limits, timeouts, refusals. Each needs a decided behaviour.

**Measure something.** Even a general model needs an evaluation set for your task, or you cannot
tell whether a prompt change improved anything.

## The honesty requirement

**Say which you did.** "I fine-tuned a model" and "I called an API" are different claims about
different work, and an interviewer will establish which within two questions. **Overstating is the
single fastest way to lose credibility in this direction.**`,
    mcqs: [
      mcq('Fine-tuning is expensive in data preparation rather than in compute, which is:',
        [['The opposite of what most people expect', true],
         ['True only for very large base models', false],
         ['A consequence of modern hardware pricing', false],
         ['Why it is rarely used in applied settings', false]],
        'Assembling a genuinely task-specific labelled set is the dominant cost, while the training run itself is usually short and cheap.'),
      mcq('Depending on an external model API carries the operational risk that the model can:',
        [['Change under you without notice', true],
         ['Be trained on your submitted inputs', false],
         ['Return results in a different language', false],
         ['Require a different authentication scheme', false]],
        'A provider updating the underlying model alters behaviour your system depended on, with no change on your side to explain it.'),
    ],
    checkpoint: [
      mcq('Even when using a general model, an evaluation set for your own task is needed because otherwise you cannot tell whether:',
        [['A prompt change improved anything', true],
         ['The model is available and responding', false],
         ['The output format is being parsed correctly', false],
         ['The cost per request is within your budget', false]],
        'Without a measured comparison, prompt iteration proceeds on impressions of a handful of examples, which is not evidence of improvement.'),
      mcq('Overstating which approach you used is the fastest way to lose credibility because an interviewer will establish which:',
        [['Within two questions', true],
         ['By asking to see the training code', false],
         ['Only if they specialise in the same area', false],
         ['After the interview, from your repository', false]],
        'The three approaches involve entirely different work, so a follow-up about data preparation or infrastructure separates them immediately.'),
    ],
  },
  {
    unitCode: 'T4_AIML_BUILD_MINI_PROJECT',
    notes: `**A model that does something useful, with an evaluation that is not flattering
itself.**

## The brief

**A real problem with a decision attached.** Something where a prediction changes what somebody
would do — not a benchmark dataset with a leaderboard.

## The requirements

**Framing recorded first**: what is predicted, from what available when, for whom.

**A baseline, computed, with its number.**

**A split that is valid for the data's structure** — by time if there is time, by group if there
are groups, stratified if imbalanced — with the reason stated.

**Transformations fitted on training only.**

**The test set opened once**, and whatever it says reported.

**An error analysis**: what it gets wrong, and whether the errors concentrate in any group.

## What is assessed

**Not the score.** Whether the number is honest.

**A model that beats its baseline by two points with a clean evaluation is a better submission
than one claiming ninety-nine percent with a leak**, and students consistently expect the
opposite — which is exactly why the requirement is stated this plainly.

## What to submit

**The code, the framing document, the baseline, the evaluation, and the error analysis.**

**And a note on anything you found that inflated an earlier result.** Most people find one. A
submission reporting that it happened and how it was caught is stronger than one that does not
mention it.`,
    assignment: {
      title: 'A model with an honest evaluation',
      description: 'Take a real prediction problem through framing, a baseline, a valid split and an evaluation opened once, with an error analysis.',
      instructions: `Pick a real problem where a prediction changes what somebody would do — not a
benchmark dataset with a leaderboard.

**Record the framing first**: what is predicted, from what information available when, and for
whom. **Compute a baseline** and write its number down before any modelling.

**Choose a split valid for the data's structure** — by time if there is a time dimension, by group
if there are several rows per entity, stratified if the classes are imbalanced — and state the
reason.

**Fit every transformation on training data only.** Open the test set once, at the end, and report
whatever it says.

**Include an error analysis**: what the model gets wrong, and whether the errors concentrate in
any identifiable group.

**Submit:** the code, the framing document, the baseline number, the evaluation, the error
analysis, and a note on anything you found that had inflated an earlier result.

What is assessed is not the score but whether the number is honest. A model beating its baseline
by two points with a clean evaluation is a better submission than one claiming ninety-nine percent
with a leak, and students consistently expect the opposite.`,
      rubric: [
        { criterion: 'Framing and baseline recorded first', description: 'The prediction, its available inputs and the baseline number are documented before modelling rather than afterwards.', maxPoints: 25 },
        { criterion: 'The split suits the data structure', description: 'Time, group or stratification is handled appropriately and the reason is stated.', maxPoints: 25 },
        { criterion: 'The evaluation is uncontaminated', description: 'Transformations are fitted on training only and the test set is used once, with whatever it reported.', maxPoints: 30 },
        { criterion: 'Error analysis present', description: 'The submission says what the model gets wrong and whether the errors fall disproportionately on any group.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A model beating its baseline by two points with a clean evaluation is a better submission than one claiming ninety-nine percent with a leak because the second number:',
        [['Does not describe anything the model can do', true],
         ['Would be lower on a larger test set', false],
         ['Requires more computation to reproduce', false],
         ['Was obtained with a different metric', false]],
        'A leaked evaluation measures access to the answer rather than predictive ability, so the figure has no relationship to deployed performance.'),
      mcq('A submission reporting that an earlier result was inflated and how it was caught is stronger than one that does not mention it because it demonstrates:',
        [['The detection worked rather than nothing occurred', true],
         ['A more thorough approach to the modelling', false],
         ['That the final result took longer to produce', false],
         ['Familiarity with the common sources of leakage', false]],
        'Nearly every project has one. Silence is consistent with not having looked, whereas a caught instance is evidence the checks were real.'),
    ],
  },
  {
    unitCode: 'T4_AIML_BUILD_DEBUGGING',
    notes: `**The score that was too good.** Leakage, an unfair split, a target hidden in a
feature.

## Why this is the hardest class to catch

**Nobody investigates a result they are pleased with.** A disappointing score prompts scrutiny; an
excellent one prompts a screenshot. **The high score is what makes the fault survive**, which is
the opposite of every other kind of bug.

## The rule worth adopting

**Treat an unexpectedly good result as a bug report.** Not superstition — a calibrated prior. If
the problem were that easy, somebody would already have solved it.

## The five causes, in order of frequency

**A feature that encodes the target.** Directly, or as a consequence of it.

**The split leaked.** Duplicate rows on both sides, the same entity on both sides, or a time
ordering ignored.

**A transformation fitted before the split.** Scaling, imputation, feature selection on the whole
dataset.

**Test data seen during selection.** Hyperparameters chosen against the test score.

**The test set is not representative.** Filtered, cleaned or sampled differently from what the
model will meet.

## The diagnostic sequence

**Remove the most suspicious feature and retrain.** A collapse points straight at it.

**Check for duplicate rows across the split.** Exact and near-duplicates.

**Check for entity overlap.** The same customer, patient or document on both sides.

**Inspect the most confident correct predictions.** If they are trivially explainable by one
column, you have found it.

## The last check

**Score a genuinely unseen slice** — a later period, a different source, data held back from the
beginning. **If the score collapses, the original evaluation was measuring something else.**`,
    mcqs: [
      mcq('This class survives because nobody investigates a result they are pleased with, which makes the high score:',
        [['What allows the fault to persist', true],
         ['Harder to reproduce on a second run', false],
         ['Dependent on the metric that was chosen', false],
         ['Evidence of a well-constructed dataset', false]],
        'Scrutiny is triggered by disappointment, so an inflated result is protected by the very thing that makes it wrong.'),
      mcq('Inspecting the most confident correct predictions helps because if they are trivially explainable by one column:',
        [['That column is likely to be leaking', true],
         ['The model has been trained for too long', false],
         ['The remaining features are redundant', false],
         ['The confidence estimates are miscalibrated', false]],
        'A single column accounting for the easiest cases is the signature of a feature that encodes the answer rather than predicts it.'),
    ],
    checkpoint: [
      mcq('Treating an unexpectedly good result as a bug report is described as a calibrated prior rather than superstition because:',
        [['If the problem were that easy, it would be solved', true],
         ['Good results are rare in academic work', false],
         ['Models rarely exceed their baseline by much', false],
         ['Evaluation code is more error-prone than training', false]],
        'The base rate of genuinely easy unsolved problems is low, so an exceptional score is more likely to indicate a fault than a discovery.'),
      mcq('Scoring a genuinely unseen slice and seeing the score collapse indicates the original evaluation was:',
        [['Measuring something other than generalisation', true],
         ['Performed with an inappropriate metric', false],
         ['Run on a test set that was too small', false],
         ['Affected by randomness in the training run', false]],
        'A held-back slice shares none of the contamination paths, so the gap between the two scores is the size of the leak.'),
    ],
  },
  {
    unitCode: 'T4_AIML_BUILD_INTERVIEW_QUESTION',
    notes: `**"Your model gets 99% accuracy. What do you check?"**

## Why this exact question is used

**Because the correct response is suspicion**, and a candidate whose first reaction is pleasure
has told the interviewer something important about how they would behave on a real project.

## The answer

**"What is the baseline?"** First, always. On imbalanced data 99% may be the majority class.

**"What is the metric measuring?"** Accuracy on a rare-event problem is nearly uninformative.

**"How was the split done?"** Duplicates, entity overlap, time ordering.

**"Was anything fitted before the split?"** Scaling, imputation, feature selection.

**"Is any feature a consequence of the target?"** The single most common cause.

**"What do the confident predictions look like?"** If one column explains them, that is the leak.

## The follow-up

**"How would you prove it is real?"** A genuinely unseen slice — a later time period, a different
source, data held back from the start. **Saying this unprompted is the strongest available
answer**, because it is the only check that closes every contamination path at once.

## The other follow-up

**"The business is delighted with the 99%. What do you do?"** Establish it privately first, then
present it plainly with what the real figure is and what it still supports. **Letting a wrong
number stand because it is welcome is the failure this direction has to avoid most carefully.**

## What loses marks

**Accepting the number.** Or proposing improvements to a model whose evaluation has not been
established. Both signal that a good score ends the investigation rather than beginning one.`,
    mcqs: [
      mcq('A candidate whose first reaction to 99% is pleasure has told the interviewer something important about:',
        [['How they would behave on a real project', true],
         ['Their level of experience with the metric', false],
         ['Whether they have seen imbalanced data before', false],
         ['Their familiarity with the algorithm used', false]],
        'The reaction predicts whether a suspicious result would be investigated or reported, which is the behaviour the question exists to probe.'),
      mcq('Proving a result is real requires a genuinely unseen slice because it is the only check that:',
        [['Closes every contamination path at once', true],
         ['Can be performed without retraining the model', false],
         ['Works when the dataset is very large', false],
         ['Produces a confidence interval for the score', false]],
        'Each individual check addresses one leak. Fresh data shares none of the paths, so a maintained score rules out all of them together.'),
    ],
    checkpoint: [
      mcq('Letting a wrong number stand because it is welcome is described as:',
        [['The failure this direction must avoid most carefully', true],
         ['Acceptable when the decision is low risk', false],
         ['A communication problem rather than a technical one', false],
         ['Understandable given the commercial pressure', false]],
        'The output is a statement people act on, and a welcome false number is acted on more readily than an unwelcome true one.'),
      mcq('Proposing improvements to a model whose evaluation has not been established signals that a good score:',
        [['Ends the investigation rather than beginning one', true],
         ['Is being compared against the wrong baseline', false],
         ['Was obtained with insufficient training data', false],
         ['Should be reported before it is verified', false]],
        'Optimising an unvalidated number improves a figure that may not correspond to anything, which is effort spent on the wrong question.'),
    ],
  },

  /* ══ T4_AIML_QUALITY ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AIML_QUALITY_EVALUATION_AND_HARM',
    notes: `**Beyond accuracy: the errors that matter, who they fall on, and what you owe them.**

## Accuracy hides the structure of failure

**Two models with identical accuracy can fail completely differently.** One spreads its errors
evenly; the other concentrates them on a subset of people. The aggregate number cannot
distinguish them, and the distinction is frequently the whole of what matters.

## Which error, and what it costs

**A false positive and a false negative are not interchangeable.** Flagging a legitimate
transaction as fraud inconveniences somebody; missing a fraudulent one costs money. Predicting
that a patient is well when they are not is not the mirror image of the reverse.

**Choose the metric from the consequence**, and state the reasoning. Precision, recall, or a
weighted combination — each encodes a different answer to "which mistake is worse".

## Error analysis by group

**Compute the error rate per group**, for whatever groups exist in the data and matter in the
world. Region, device, account age, and where relevant the protected characteristics.

**A model with 92% accuracy overall and 71% for one group is not a 92% model for that group.**
Reporting only the aggregate is a choice about what to make visible.

## Where the disparity comes from

**Usually the data.** Fewer examples of a group means worse performance on it, which is a
representation problem rather than an algorithmic one.

**Sometimes the label.** If the historical decisions used as labels were themselves biased, a
model reproducing them accurately is reproducing the bias faithfully.

## What you owe

**Report the failure profile alongside the headline number.** Not as a compliance exercise — as
the information the person deciding whether to deploy actually needs.

**And say what you did not check**, because a stated gap can be closed and an unstated one cannot.`,
    mcqs: [
      mcq('Two models with identical accuracy can fail completely differently, and the aggregate number cannot distinguish:',
        [['Evenly spread errors from concentrated ones', true],
         ['A large test set from a small one', false],
         ['Training error from validation error', false],
         ['Overfitting from underfitting behaviour', false]],
        'Accuracy summarises how many errors occurred and says nothing about who they affected, which is frequently the decision-relevant property.'),
      mcq('If the historical decisions used as labels were biased, a model reproducing them accurately is:',
        [['Reproducing the bias faithfully', true],
         ['Overfitting to the training distribution', false],
         ['Miscalibrated relative to the true outcomes', false],
         ['Likely to degrade on newer data over time', false]],
        'The model learns the labelling process rather than the underlying truth, so high fidelity to the labels preserves whatever produced them.'),
    ],
    checkpoint: [
      mcq('A model with 92% accuracy overall and 71% for one group is not a 92% model for that group, and reporting only the aggregate is:',
        [['A choice about what to make visible', true],
         ['Standard practice in most applications', false],
         ['Acceptable when the group is a small share', false],
         ['Required to keep the report concise enough', false]],
        'The disaggregated figures exist and were not shown, so the omission is a decision rather than a limitation of the analysis.'),
      mcq('Stating what you did not check matters because a stated gap:',
        [['Can be closed and an unstated one cannot', true],
         ['Reduces the reviewer’s expectations of the work', false],
         ['Shows the evaluation was thorough enough', false],
         ['Transfers the responsibility to the reader', false]],
        'Naming the unexamined area lets somebody else decide whether to examine it, whereas silence leaves it invisible and unaddressed.'),
    ],
  },
  {
    unitCode: 'T4_AIML_QUALITY_HARDER_FAULT',
    notes: `**A model that passes every check it has and is still wrong.**

## Why these survive

**The evaluation is technically valid** — no leakage, a clean split, an appropriate metric — and
the model is still not fit for the purpose it will be used for. The checks verify the procedure;
these faults are in the relationship between the evaluation and the deployment.

## The five

**Distribution shift.** The test set matches the training set and both differ from next month.
The model was correct about a world that has moved.

**A threshold chosen on the test set.** The model is honest and the operating point is not, which
is a subtler version of selection contamination.

**Evaluation on cleaned data, deployment on raw.** Missing values were imputed, outliers removed,
formats normalised — and production sends none of that.

**Feedback loops.** The model's predictions change the behaviour it later trains on. Recommending
an item makes it popular, which makes it recommended.

**A metric that does not match the decision.** Optimised for ranking quality when the decision is
a yes-or-no at a fixed capacity.

## Finding them

**Ask what differs between the evaluation and the deployment**, item by item: the data source,
the preprocessing, the time period, the population, and what happens after a prediction.

**Each difference is a candidate fault**, and the list is usually short enough to enumerate in ten
minutes.

## The one that is hardest

**Feedback loops**, because the model appears to improve. Its predictions shape the data that
confirms them, and the metric rises while the system narrows.`,
    mcqs: [
      mcq('A threshold chosen on the test set means the model is honest and the operating point is not, which is a subtler version of:',
        [['Selection contamination', true],
         ['Distribution shift over time', false],
         ['Label noise in the training data', false],
         ['Overfitting to the training set', false]],
        'A decision was made using the test data, so the reported performance at that threshold is optimistic even though the model itself is clean.'),
      mcq('Feedback loops are the hardest of these to detect because the model appears to:',
        [['Improve, as its predictions shape the data', true],
         ['Degrade slowly over successive retrainings', false],
         ['Perform inconsistently between deployments', false],
         ['Require more data than is actually available', false]],
        'Recommending an item makes it popular, which confirms the recommendation, so the metric rises while the system narrows what it can see.'),
    ],
    checkpoint: [
      mcq('Evaluation on cleaned data and deployment on raw data fails because production sends:',
        [['None of the preprocessing the evaluation assumed', true],
         ['Requests at a higher rate than training allowed', false],
         ['Features in a different order from the training set', false],
         ['Data from a population the model has not seen', false]],
        'Missing values, outliers and inconsistent formats were removed before evaluation and arrive intact in deployment, where nothing handles them.'),
      mcq('The technique for finding this class is to enumerate what differs between the evaluation and the deployment, and the list is usually:',
        [['Short enough to work through in ten minutes', true],
         ['Too long to be practical without tooling', false],
         ['Available in the model documentation already', false],
         ['Identical across most applied projects', false]],
        'Data source, preprocessing, time period, population and post-prediction behaviour cover nearly all of it, which makes the check quick and repeatable.'),
    ],
  },
  {
    unitCode: 'T4_AIML_QUALITY_PRACTICE',
    notes: `**Reviewing a model and its evaluation without being told what is wrong.**

## The drill

**A model, a dataset and a reported result. Thirty minutes.** Find what would make the result
unsafe to rely on.

## The review checklist

**What is the baseline, and does the result beat it meaningfully?**

**Is any feature a consequence of the target, or unavailable at prediction time?**

**Was the split valid for the data's structure — time, groups, imbalance?**

**Was anything fitted or selected before the split?**

**Does the metric match the decision that follows the prediction?**

**How do the errors distribute across groups?**

**What differs between this evaluation and the intended deployment?**

Seven questions, twenty minutes, any model.

## Ordering the findings

**By whether they invalidate the result or qualify it.** A leak invalidates; a suboptimal metric
qualifies. Only the first stops the number being usable at all.

## Writing it up

**State what the result would have to assume to be valid.** "This holds only if next month's
applicants resemble last year's, which nothing here establishes." That is a finding somebody can
act on and is hard to dismiss.

## Why this is the practice unit

**Because reviewing somebody else's model is most of what a senior applied engineer does**, and
because it is the fastest way to internalise the checks — applying them to your own work is
harder, since you already believe the result.`,
    mcqs: [
      mcq('Findings should be ordered by whether they invalidate or qualify the result, because only the first:',
        [['Stops the number being usable at all', true],
         ['Requires the model to be retrained fully', false],
         ['Would be noticed by a non-technical reader', false],
         ['Affects the confidence interval that was given', false]],
        'A leak means the figure describes nothing. A suboptimal metric means the figure is real but answers a slightly different question.'),
      mcq('Applying these checks to somebody else’s model is the fastest way to internalise them because with your own work:',
        [['You already believe the result', true],
         ['The checks take considerably longer to run', false],
         ['The data is too familiar to examine properly', false],
         ['There is less time available after building it', false]],
        'Belief in the result suppresses the scrutiny the checks require, so practising them on unfamiliar work builds the habit more reliably.'),
    ],
    checkpoint: [
      mcq('"This holds only if next month’s applicants resemble last year’s, which nothing here establishes" is hard to dismiss because it names:',
        [['The assumption the result depends on', true],
         ['A defect in the modelling technique used', false],
         ['A better metric for the same problem', false],
         ['The size of the error that was introduced', false]],
        'Stating the required assumption shifts the burden onto whoever wants to keep the conclusion rather than onto the reviewer to disprove it.'),
      mcq('The checklist asks what differs between the evaluation and the intended deployment because each difference is:',
        [['A candidate fault worth examining', true],
         ['A reason to collect additional training data', false],
         ['Evidence that the split was constructed poorly', false],
         ['Something the metric should be adjusted for', false]],
        'Every mismatch between the two settings is a way the reported performance may fail to transfer, and enumerating them finds the class systematically.'),
    ],
  },
  {
    unitCode: 'T4_AIML_QUALITY_INTERVIEW_QUESTION',
    notes: `**"How would you know if your model is fair?"** Or: "who does it fail for?"

## Why this is asked of applied candidates now

**Because models are deployed on people**, and an engineer who has never computed an error rate by
group has not examined their own work in the way the role requires. It is a technical question
rather than a political one, and the answer is technical.

## The answer

**Disaggregate.** Error rates per group, for whatever groups exist in the data and matter in the
world.

**Name the groups you can and cannot measure.** Frequently the relevant attribute is not in the
dataset, and saying so is better than implying coverage.

**Say which error matters.** A false positive and a false negative land differently on different
people, and equal accuracy across groups does not imply equal harm.

**Then the source.** Usually representation — fewer examples of a group — or the labels, if
historical decisions encoded a bias.

## The follow-ups

**"What would you do about it?"** More representative data first; a per-group threshold only with
care and disclosure, since it is a decision about people rather than a parameter.

**"The business says it is good enough."** Present the disaggregated figures and what they mean
for the decision. That is the contribution; the decision itself is not yours.

**"Is there a trade-off?"** Yes, frequently — between aggregate accuracy and per-group parity, and
between different definitions of fairness that cannot all hold at once. **Knowing that they
conflict is the depth marker.**

## What loses marks

**Treating it as a compliance question.** "We would check for bias" describes a process with no
content. The question is what you would compute, on which groups, and what you would do with the
result.`,
    mcqs: [
      mcq('Equal accuracy across groups does not imply equal harm because a false positive and a false negative:',
        [['Land differently on different people', true],
         ['Occur at different rates in each group', false],
         ['Are weighted differently by most metrics', false],
         ['Depend on the threshold that was chosen', false]],
        'The consequence of each error type varies by who receives it, so identical rates can still distribute real-world cost unevenly.'),
      mcq('"We would check for bias" loses marks because it describes:',
        [['A process with no content', true],
         ['A step that comes too late in the project', false],
         ['An activity better handled by another team', false],
         ['Something the framework does automatically', false]],
        'The question asks what would be computed, on which groups, and what would follow. A named intention supplies none of those.'),
    ],
    checkpoint: [
      mcq('The depth marker in this answer is knowing that different definitions of fairness:',
        [['Conflict and cannot all hold at once', true],
         ['Apply to different regulatory jurisdictions', false],
         ['Require different amounts of training data', false],
         ['Are measured after deployment rather than before', false]],
        'Several reasonable parity criteria are mathematically incompatible except in degenerate cases, so a choice between them is unavoidable.'),
      mcq('Naming the groups you cannot measure is better than implying coverage because the relevant attribute is:',
        [['Frequently not present in the dataset', true],
         ['Usually inferred from the other columns', false],
         ['Protected and therefore unavailable to use', false],
         ['Different for each deployment environment', false]],
        'An analysis silent about an unmeasurable group reads as having covered it, which overstates what the evaluation actually established.'),
    ],
  },

  /* ══ T4_AIML_PROOF ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_AIML_PROOF_ADVANCED_CHALLENGE',
    notes: `**Your own model, your own evaluation, and somebody asking whether it would work in
production.**

## The brief

**Take your model and defend its evaluation against the objection that it does not
generalise.**

**Not hypothetically.** Produce the evidence: a held-back slice, a later time period, a different
source, or a deliberate stress test — and report what happened.

## What the defence must contain

**The framing and the baseline**, so the number has a reference point.

**Why the split is valid** for this data's structure, stated rather than assumed.

**What you checked for leakage**, and what you found — including anything that inflated an earlier
result.

**The error profile.** What it gets wrong, and whether the errors concentrate.

**What would break it.** Distribution shift, a changed upstream system, a feedback loop — and
whether anything would detect that.

## The part most people omit

**What would detect the failure.** A model deployed with no monitoring fails silently, and the
first indication is usually somebody noticing the outputs have stopped making sense.

**Saying "nothing would currently detect this" is an acceptable and honest answer**, and it is far
stronger than implying a monitoring story that does not exist.

## Why this is the advanced challenge

**Because the direction's whole risk is a confident wrong number**, and the capability being
proved is that you can interrogate your own result as hard as a sceptic would.

## What to submit

**The defence as a written document**, with the generalisation evidence attached, and a note on
which objection was hardest to answer.`,
    assignment: {
      title: 'Defending the number',
      description: 'Defend your own model’s evaluation against the objection that it does not generalise, with evidence rather than argument.',
      instructions: `Take your own model and defend its evaluation against the objection that it
does not generalise — **with evidence, not argument.**

**Produce a generalisation test**: a held-back slice, a later time period, a different source, or
a deliberate stress test. Report what happened, including if the score fell.

**The defence must contain** the framing and the baseline so the number has a reference point; why
the split is valid for this data's structure; what you checked for leakage and what you found,
including anything that inflated an earlier result; the error profile and whether errors
concentrate in any group; and what would break the model in deployment.

**Include what would detect that failure.** A model deployed with no monitoring fails silently and
the first indication is usually somebody noticing the outputs have stopped making sense. **"Nothing
would currently detect this" is an acceptable and honest answer**, and it is far stronger than
implying a monitoring story that does not exist.

**Submit:** the defence as a written document with the generalisation evidence attached, and a
note on which objection was hardest to answer.`,
      rubric: [
        { criterion: 'Generalisation tested, not asserted', description: 'A genuinely unseen slice or stress test was run and its result reported, including if unfavourable.', maxPoints: 30 },
        { criterion: 'Leakage checks reported honestly', description: 'What was checked and what was found, including anything that had inflated an earlier result.', maxPoints: 25 },
        { criterion: 'Error profile and concentration', description: 'The defence says what the model gets wrong and whether the errors fall disproportionately on a group.', maxPoints: 25 },
        { criterion: 'Failure detection addressed', description: 'What would break it and what would notice, with an honest statement where nothing currently would.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A model deployed with no monitoring fails silently, and the first indication is usually:',
        [['Somebody noticing the outputs stopped making sense', true],
         ['An alert raised by the serving infrastructure', false],
         ['A drop in the accuracy reported by the pipeline', false],
         ['An error in the logs of the prediction service', false]],
        'The system continues returning well-formed predictions, so nothing technical fails and only the quality of the answers degrades.'),
      mcq('"Nothing would currently detect this" is described as far stronger than:',
        [['Implying a monitoring story that does not exist', true],
         ['Listing the metrics that are already collected', false],
         ['Deferring the question to the operations team', false],
         ['Proposing monitoring as future work to be done', false]],
        'An honest gap can be closed by whoever deploys it, whereas an implied capability leaves the risk unmanaged and undiscovered.'),
    ],
  },
  {
    unitCode: 'T4_AIML_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on applied machine learning alone.**

## Where it starts

**A model you built.** What it predicts, for whom, and what happens with the prediction.

## Where it goes

**"What is the baseline?"** Early, and it separates immediately.

**"How did you split it?"** Time, groups, imbalance — and the reason.

**"Why that metric?"** From the consequence of each error type.

**"What does it get wrong?"** And for whom.

**"Would it work next month?"** Distribution shift, and what would detect it.

**"You got 99%."** Suspicion, then the checks.

**"Did you fine-tune or call an API?"** Honesty about which work you actually did.

## The depth markers

**A baseline, unprompted.** **Disaggregated error rates.** **A statement of what would break it.**
Each signals experience past the tutorial.

## The failure mode

**Being able to train anything and unable to evaluate anything.** It is common among students who
learned from competitions and notebooks, where the split is given, the metric is chosen and the
leaderboard replaces judgement. **The round is built to find it**, which is why so little of it is
about algorithms.

## How to prepare

**Three stories: a result that turned out to be leaked, a metric you changed after thinking about
the decision, and a model you decided not to deploy.** The third is rare and lands very well,
because it demonstrates that the evaluation was capable of producing a negative answer and that
you acted on it.`,
    mcqs: [
      mcq('The failure mode this round is built to find is being able to train anything and:',
        [['Unable to evaluate anything', true],
         ['Unwilling to deploy the finished model', false],
         ['Unfamiliar with the underlying mathematics', false],
         ['Dependent on libraries for the implementation', false]],
        'Competitions and notebooks supply the split, the metric and the leaderboard, so the judgement the role requires is never exercised.'),
      mcq('A model you decided not to deploy lands very well because it demonstrates the evaluation was capable of:',
        [['Producing a negative answer that was acted on', true],
         ['Detecting leakage in the training pipeline', false],
         ['Measuring performance across several groups', false],
         ['Being reproduced by somebody else entirely', false]],
        'An evaluation that has never rejected anything may not be able to. Acting on a negative result shows it was a real check rather than a formality.'),
    ],
    checkpoint: [
      mcq('So little of this round is about algorithms because the capability being assessed is:',
        [['Whether the evaluation means anything', true],
         ['How quickly a model can be implemented', false],
         ['Familiarity with the current model families', false],
         ['The ability to tune hyperparameters well', false]],
        'Applied roles build on existing methods, so the scarce judgement is establishing that a reported result corresponds to deployed behaviour.'),
      mcq('"Did you fine-tune or call an API?" is asked because the two are:',
        [['Different claims about different work', true],
         ['Equally valid for most applied problems', false],
         ['Distinguished by the cost of the compute', false],
         ['Indistinguishable from the final results alone', false]],
        'One involves assembling task-specific data and a training process; the other involves integration engineering. Overstating either is quickly exposed.'),
    ],
  },
  {
    unitCode: 'T4_AIML_PROOF_CHECKPOINT',
    notes: `**Whether applied machine learning is demonstrable.**

## What the track asked for

**Framing** — what is predicted, from what available when, against what baseline.

**Building** — a valid split, transformations fitted correctly, the test set opened once.

**Detecting** — the leak, the unfair split, the feature that encodes the target.

**Reporting** — the error profile, who it fails for, and what would break it.

## The bar

**The third and fourth are the direction.** Training a model is a week's work that libraries have
made accessible to everybody. Establishing that a number is honest, and saying what the model does
badly, is what an applied role is hired for and what almost no student portfolio contains.

## What a reviewer looks at

**The baseline and the split rationale**, because their presence immediately separates the work
from a notebook.

**The error analysis by group**, for the same reason, and because it is the artefact that shows
the evaluation was an investigation rather than a formality.

## If this does not pass

**The usual gap is evaluation rather than modelling.** The model trains, the score is reported,
and there is no baseline, no split rationale and no error analysis. **That is a week of adding
them** — and the adding forces the checking, which is where the value is.

## What this feeds

**Mock 5** on applied ML depth, which opens with a baseline question. **The portfolio**, where the
honest evaluation and the error analysis are the two pieces worth showing. **P14's production
project**, whose requirement that decisions be justified assumes you can tell what your evidence
supports.`,
    checkpoint: [
      mcq('The two parts of the track that constitute the direction are detecting contaminated results and:',
        [['Reporting what the model does badly and for whom', true],
         ['Choosing an appropriate model family quickly', false],
         ['Building a reproducible training pipeline', false],
         ['Framing the problem before any modelling', false]],
        'Training is broadly accessible. Establishing honesty and characterising failure is the scarce judgement an applied role is hired for.'),
      mcq('The baseline and the split rationale immediately separate the work from a notebook because a notebook:',
        [['Ends at the score without either of them', true],
         ['Cannot express the reasoning in its format', false],
         ['Uses a different metric from a real project', false],
         ['Is not intended to be reviewed by anybody', false]],
        'Tutorial workflows stop once a number appears, so the steps establishing what the number means are absent by convention.'),
      mcq('When this checkpoint does not pass, the usual gap is evaluation rather than modelling, and adding the missing pieces is valuable because:',
        [['The adding forces the checking', true],
         ['Reviewers weight documentation heavily', false],
         ['It takes less time than retraining would', false],
         ['The model itself rarely needs any change', false]],
        'A baseline cannot be written without computing it and a split rationale cannot be written without examining the structure, so documentation produces verification.'),
      mcq('P14’s requirement that decisions be justified assumes from this track that you can tell:',
        [['What your evidence supports', true],
         ['Which model family suits a given problem', false],
         ['How long a training run will take to finish', false],
         ['Whether a dataset is large enough to use', false]],
        'Justification depends on knowing the strength of the evidence behind a claim, which is the same judgement the track spent its month building.'),
    ],
  },
];
