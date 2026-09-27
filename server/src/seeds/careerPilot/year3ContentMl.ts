/**
 * T3_ML_WORKFLOW, T3_ML_SUPERVISED and T3_ML_FEATURES — eighteen units. Year 3, AI/ML track.
 *
 * ── THE TRACK WITH THE BIGGEST EXPECTATION GAP ────────────────────────────────────────────
 *
 * The direction unit said it plainly: AI/ML engineering is mostly not modelling. It is data
 * preparation, evaluation, and getting a model into production. A student arriving here
 * expecting to invent architectures is in the wrong place, and the sooner that lands the
 * better for them.
 *
 * So the track opens on the workflow rather than on algorithms, and the first unit is the
 * split — because a student who looks at the test set before deciding anything has already
 * produced a result that means nothing, and no amount of later rigour recovers it.
 *
 * LEAKAGE gets the longest unit in the track. It is the defining failure of applied machine
 * learning: the model scores 0.98, everybody is delighted, and it is useless in production
 * because a feature contained the answer. A third-year who can spot leakage is more employable
 * than one who can name six algorithms.
 *
 * The supervised units deliberately do not derive the mathematics. A graduate needs to know
 * which question each family answers, what the output means, and how it fails — the library
 * implements the rest, and understanding the failure modes is what distinguishes a practitioner
 * from somebody who calls fit and predict.
 *
 * Attribution: WORKFLOW and FEATURES are single-skill and derived. SUPERVISED defaults to
 * AI_ML_CONCEPTS with WHICH_QUESTION on ML_WORKFLOW.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ML_BUNDLES: PilotBundle[] = [
  /* ══ T3_ML_WORKFLOW ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_WORKFLOW_THE_SPLIT_COMES_FIRST',
    notes: `**Split the data before you look at it.** Before exploring, before cleaning, before
choosing a model. This is the first instruction in the track because everything downstream is
worthless without it.

## Why

The purpose of a model is to work on data it has not seen. **The only way to estimate that is
to hold some data back and never use it for anything except the final measurement.**

If you explored the whole dataset and then split, you have already made decisions influenced by
the test set — which features looked promising, which outliers to remove, which transformation
helped. **Your test score is now optimistic and you cannot tell by how much.**

## The three sets

**Training** — the model learns from this. Usually 60–80%.

**Validation** — you compare models and tune on this. 10–20%.

**Test** — **touched once, at the very end.** 10–20%.

**The test set is not for choosing anything.** Look at it, pick the model that did better on
it, and it has become a validation set — and you no longer have an honest estimate. That
sentence is the whole discipline.

## Splitting correctly

**Random is right when rows are independent.** Shuffle and cut.

**By time, when the data is a time series or the model will predict the future.** Train on
earlier, test on later. **A random split on time-ordered data lets the model learn from the
future**, and it produces an excellent score and a useless model — this is one of the most
common serious errors in applied work.

**By group, when rows are not independent.** Several rows per patient, per customer, per
session. **If the same customer appears in train and test, the model can memorise that
customer** rather than learn a pattern, and the score is inflated for a reason nothing in the
metrics reveals.

**Stratified, when a class is rare.** A random split of a dataset with 2% positives can give a
test set with almost none.

## Cross-validation

Instead of one validation split, divide into k folds, train k times, each time holding out one
fold.

**Use it when data is limited** — you get a more stable estimate and a sense of the variance.

**The test set stays separate throughout.** Cross-validation replaces the validation split, not
the test set, and confusing the two is a common mistake.

**And respect the structure.** Time-series cross-validation moves a window forward; grouped
cross-validation keeps groups intact. Plain k-fold on either is the same leak in a different
costume.

## What "never touch the test set" means in practice

**You may not:** tune on it, choose features by it, decide when to stop by it, or run it
repeatedly and keep the best.

**Running the test set fifty times and reporting the best is not evaluation, it is
selection** — and the number you report is then meaningless in a way nobody reading it can
detect.

**Once you have evaluated on test, you are done.** If you change the model afterwards, you
need fresh test data — which you usually do not have, and that is the honest cost of the rule.`,
    mcqs: [
      mcq('The split must happen before exploring because:',
        [['Decisions made after seeing the test data make the score optimistic', true],
          ['Exploration is faster on a smaller sample', false],
          ['The test set may need different cleaning', false],
          ['It guarantees the sets are balanced', false]],
        'And you cannot tell by how much.'),
      mcq('A random split on time-ordered data:',
        [['Lets the model learn from the future, giving a useless model', true],
          ['Is acceptable if the period is short', false],
          ['Balances the classes more evenly', false],
          ['Is the standard approach for forecasting', false]],
        'One of the most common serious errors in applied work.'),
      mcq('If the same customer appears in train and test:',
        [['The model can memorise that customer rather than learn a pattern', true],
          ['The evaluation becomes more representative', false],
          ['The classes become imbalanced', false],
          ['The split needs stratifying instead', false]],
        'And nothing in the metrics reveals it.'),
      mcq('Running the test set fifty times and reporting the best is:',
        [['Selection, not evaluation', true],
          ['Acceptable if each run is recorded', false],
          ['A reasonable way to reduce variance', false],
          ['Standard practice with small test sets', false]],
        'The number is meaningless in a way nobody reading it can detect.'),
    ],
    checkpoint: [
      mcq('Cross-validation replaces:',
        [['The validation split, not the test set', true],
          ['Both the validation and test sets', false],
          ['The test set only', false],
          ['The need for a split at all', false]],
        'Confusing the two is a common mistake.'),
      mcq('Once you have evaluated on the test set:',
        [['You are done, unless you have fresh test data', true],
          ['You may tune once more and re-evaluate', false],
          ['You can average several evaluations', false],
          ['You should re-split and repeat', false]],
        'Which you usually do not have, and that is the honest cost of the rule.'),
      mcq('A stratified split is needed when:',
        [['A class is rare enough that a random split might omit it', true],
          ['The data happens to be ordered by time already', false],
          ['Rows are grouped by entity', false],
          ['The dataset is very large', false]],
        'A random split of 2% positives can give a test set with almost none.'),
    ],
  },

  {
    unitCode: 'T3_ML_WORKFLOW_FROM_DATA_TO_FEATURES',
    notes: `A model takes numbers. **Your data is rows of mixed types with missing values, and
turning one into the other is most of the work.**

## The transformations

**Numeric columns** — usually scaled, so no single feature dominates by having a larger range.

**Categorical columns** — encoded into numbers. **How you encode matters**, and the next topic
covers it properly.

**Dates** — almost never useful as a timestamp. Useful as: day of week, month, hour, days
since an event, whether it is a weekend. **A raw timestamp tells the model almost nothing; the
things you derive from it tell it a great deal.**

**Text** — counts, term weights, or embeddings.

**Missing values** — filled, or flagged, or both. **"This was missing" is frequently
informative in itself**, and dropping the rows throws that away along with the rows.

## The order that matters

**Fit every transformation on the training set only, then apply it to validation and test.**

    scaler.fit(X_train)            # learn the mean and spread from train
    X_train = scaler.transform(X_train)
    X_test  = scaler.transform(X_test)     # apply, do not re-fit

**Fitting on everything is leakage.** The scaler learned the test set's distribution, so
information from the test set has reached the model. The effect is usually small and the
principle is not: once you accept fitting on all the data, larger leaks follow the same
reasoning.

**This applies to everything you fit**: scalers, encoders, imputers, feature selectors, and
anything that learns a parameter from the data.

## Use a pipeline

    Pipeline([('impute', ...), ('scale', ...), ('model', ...)])

**Not tidiness.** A pipeline makes the fit-on-train rule structural rather than remembered:
cross-validation refits every step inside each fold automatically, which is very difficult to
get right by hand and very easy to get wrong.

**A pipeline is also one object to save**, so the transformations that were applied at training
are the ones applied at prediction. **A model saved without its preprocessing is a model that
will silently receive differently-scaled inputs in production**, and that is a real and common
failure.

## Train and serve must agree

The single most common production failure in machine learning:

**The features computed at training are not the features computed at prediction.**

A different library version, a different default, a column ordered differently, a value that
was filled one way in the notebook and another in the service.

**The model does not error.** It produces worse predictions, quietly, and nobody knows for
months.

**The defence:** share the code. The same pipeline object, or the same function, used in both
places. **Not two implementations that are supposed to match** — that is the same argument the
frontend validation unit made about client and server rules, and it has the same resolution.

## How many features

**Start with few and obvious ones.** A model with five good features and a clear baseline is
far more useful than one with three hundred of unknown value.

**More features means more ways to leak, more to compute at serving time, more to go wrong,
and a harder model to explain.** Add them when they earn their place against a baseline, which
is the next unit's subject.`,
    mcqs: [
      mcq('A raw timestamp is rarely useful because:',
        [['The derived parts — day, hour, days since — carry the signal', true],
          ['Models cannot process date types', false],
          ['Timestamps vary too much between rows', false],
          ['Time zones make them unreliable', false]],
        'Day of week, month, whether it is a weekend.'),
      mcq('Fitting a scaler on all the data before splitting:',
        [['Is leakage, and the principle matters more than the size', true],
          ['Is acceptable because scaling is not learned', false],
          ['Improves the stability of the estimate', false],
          ['Only matters for small datasets', false]],
        'Once you accept it, larger leaks follow the same reasoning.'),
      mcq('A pipeline object is valuable mainly because:',
        [['It makes the fit-on-train rule structural rather than remembered', true],
          ['It keeps the code tidier', false],
          ['It runs the steps faster', false],
          ['It allows steps to be reordered easily', false]],
        'Cross-validation then refits every step inside each fold automatically.'),
      mcq('A model saved without its preprocessing:',
        [['Silently receives differently-scaled inputs in production', true],
          ['Fails to load in the serving environment', false],
          ['Requires the raw data to be reprocessed', false],
          ['Is smaller but otherwise equivalent', false]],
        'A real and common failure, and it produces no error.'),
    ],
    checkpoint: [
      mcq('The most common production failure in machine learning is:',
        [['Training and serving computing different features', true],
          ['The model degrading as data drifts', false],
          ['Insufficient compute available at prediction time', false],
          ['The model file becoming corrupted', false]],
        'The model does not error; it produces worse predictions quietly.'),
      mcq('The defence against train-serve mismatch is:',
        [['Sharing the code, not maintaining two implementations', true],
          ['Testing both of the paths against the same input', false],
          ['Versioning the feature definitions', false],
          ['Logging the features at both points', false]],
        'The same argument as client and server validation rules.'),
      mcq('"This value was missing" is:',
        [['Frequently informative in itself', true],
          ['Noise that should be imputed away', false],
          ['A reason to drop the row', false],
          ['Only relevant for categorical columns', false]],
        'Dropping the rows throws it away along with the rows.'),
    ],
  },

  {
    unitCode: 'T3_ML_WORKFLOW_A_BASELINE_FIRST',
    notes: `**Before any model, build the stupidest thing that could work.** Then every result
has something to be compared against, and "the model achieves 0.87" becomes a statement rather
than a number.

## What a baseline is

**The simplest prediction that is not cheating.**

- **Classification:** always predict the most common class.
- **Regression:** always predict the mean, or the median.
- **Time series:** predict that tomorrow equals today.
- **Any problem with an existing process:** what the current rule or human does.

**That last one is the most important and the most skipped.** If a business already has a
heuristic — "flag orders over £500" — **that is the baseline your model must beat**, and beating
the mean while losing to the existing rule is not a success.

## Why it changes everything

**It makes the score interpretable.** 94% accuracy sounds excellent. If 94% of the data is one
class, **predicting that class always gets 94%** and your model has learned nothing. This single
check catches an enormous number of misleading results.

**It tells you whether the problem is hard.** A baseline at 0.60 and a model at 0.87 is real
progress. A baseline at 0.85 and a model at 0.87 is two points for a great deal of complexity,
and it may not be worth deploying.

**It catches bugs.** A model *worse* than the baseline has something wrong with it — the target
is misaligned, the features are shuffled, the split is wrong. **Without a baseline you would
report 0.62 and not know it was bad.**

## Build it in ten minutes

It should be genuinely trivial. If your baseline takes an afternoon, it is not a baseline.

**And evaluate it exactly as you will evaluate the model** — same split, same metric, same
pipeline. Otherwise the comparison is not one.

## Then add complexity one step at a time

1. **Baseline.**
2. **A simple model** — linear or logistic regression — with a few obvious features.
3. **Better features**, same model.
4. **A more capable model**, same features.
5. **Tuning.**

**Measure at every step.** You will frequently find that step three gives most of the
improvement and step four gives almost none — which is the usual shape, and knowing it saves
weeks spent on the wrong end.

**And each step costs something:** complexity, training time, serving time, explainability.
**A step that buys 0.3% is usually not worth it**, and being able to say so is a more valuable
skill than being able to run the step.

## Reporting it

**Always report the baseline alongside the model.**

> "The baseline — predicting the majority class — gets 0.84. Logistic regression with five
> features gets 0.89. The gradient-boosted model gets 0.91, at ten times the training cost and
> with no straightforward explanation of its decisions."

**A reader can make a decision from that.** From "our model achieves 0.91", they cannot.`,
    mcqs: [
      mcq('The most important and most skipped baseline is:',
        [['The existing rule or human process', true],
          ['The majority class', false],
          ['The mean of the target', false],
          ['A simple linear model', false]],
        'Beating the mean while losing to the current rule is not a success.'),
      mcq('94% accuracy is uninterpretable without knowing:',
        [['What proportion of the data is the majority class', true],
          ['Which metric was used', false],
          ['How large the test set was', false],
          ['Which model produced it', false]],
        'If 94% is one class, predicting it always gets 94%.'),
      mcq('A model performing worse than the baseline indicates:',
        [['Something is wrong — the target, the features, or the split', true],
          ['The problem is too hard for that model', false],
          ['More features are needed', false],
          ['The baseline was unusually strong', false]],
        'Without a baseline you would report the number and not know it was bad.'),
      mcq('The usual shape of the improvement curve is:',
        [['Better features give most of it; a bigger model gives little', true],
          ['A bigger model gives most of it', false],
          ['Tuning gives most of it', false],
          ['Each step contributes roughly equally', false]],
        'Knowing that saves weeks spent on the wrong end.'),
    ],
    checkpoint: [
      mcq('A baseline taking an afternoon to build:',
        [['Is not a baseline', true],
          ['Is acceptable for a complex problem', false],
          ['Should be simplified but is usable', false],
          ['Indicates a difficult domain', false]],
        'It should be genuinely trivial — ten minutes.'),
      mcq('The baseline must be evaluated:',
        [['With the same split, metric and pipeline as the model', true],
          ['On the full dataset, for a more stable estimate', false],
          ['Using a simpler metric', false],
          ['Before the data is cleaned', false]],
        'Otherwise the comparison is not one.'),
      mcq('A step that buys 0.3% is:',
        [['Usually not worth it, and saying so is the valuable skill', true],
          ['Worth keeping if it costs nothing at serving time', false],
          ['A meaningful improvement at scale', false],
          ['Worth pursuing further with tuning', false]],
        'Each step costs complexity, training time, serving time and explainability.'),
    ],
  },

  {
    unitCode: 'T3_ML_WORKFLOW_DEBUGGING',
    notes: `Five machine learning failures. **Four of them produce a number rather than an
error**, which is why this discipline needs more scepticism than most.

## 1. The score is suspiciously high

**0.99 on a real problem is almost always a bug**, and the reflex should be suspicion rather
than satisfaction.

**Causes, in order:** leakage — a feature containing the answer; the target accidentally
included in the features; the test set overlapping the training set; a trivially predictable
target.

**Diagnosis:** look at the most important features. **If one dominates, ask how it is
computed** — and ask specifically whether it would be available, with that value, at the
moment you would need to predict. That question finds most leakage.

## 2. Great in validation, poor in production

**Causes:** leakage again; the training data is not representative of production; the world
changed; **train-serve skew**, where the features computed at prediction differ from those at
training.

**Diagnosis:** take ten real production inputs, compute the features both ways, and compare
them. **If they differ, that is the whole answer**, and it is the first thing to check because
it is both common and cheap to test.

## 3. The model is worse than the baseline

Something is broken. **Check the obvious things first:** the target aligned with the rows; the
features not shuffled relative to the labels; the split not leaking in reverse; the metric
computed the right way round.

**A model worse than chance on a balanced binary problem is usually inverted labels**, and it
is an oddly common mistake.

## 4. It works on one class and not the other

**Symptom:** 95% accuracy, and it never predicts the rare class at all.

**Cause:** class imbalance, and a metric that rewards ignoring the minority.

**Diagnosis:** the confusion matrix. **Accuracy hides this completely and the confusion matrix
makes it immediately obvious** — which is why the evaluation topic insists on it.

## 5. The results change every run

**Cause:** no random seed. Model initialisation, data shuffling, and any sampling all vary.

**Fix:** set the seed everywhere — the library, the framework, the language's own generator.

**And note what this does and does not give you.** A fixed seed makes the run reproducible; it
does not make the result stable. **If your score swings by 5% between seeds, the model is not
better than the alternative — you are reading noise**, and the honest response is to report
the variation across several seeds rather than the best one.

## The habits

**Look at the predictions, not just the score.** Ten right, ten wrong. **Patterns in the
mistakes are the most informative thing available**, and a summary metric hides all of them.

**Look at the most important features, always.** It is the fastest leakage detector there is.

**Be suspicious of good news.** In this discipline a high score is more often a bug than a
breakthrough, and the instinct to check the results you like as hard as the ones you do not is
the whole difference between a practitioner and somebody producing numbers.`,
    mcqs: [
      mcq('A score of 0.99 on a real problem should prompt:',
        [['Suspicion, because it is almost always a bug', true],
          ['Verification on a second test set', false],
          ['Publication of the result', false],
          ['A check of the model complexity', false]],
        'Leakage, the target in the features, or overlapping sets.'),
      mcq('The question that finds most leakage is:',
        [['Would this feature be available, with that value, at prediction time', true],
          ['Is this feature correlated with the target', false],
          ['Was this feature scaled correctly', false],
          ['Does this feature appear in both sets', false]],
        'Look at the most important features and ask it of each.'),
      mcq('To diagnose train-serve skew:',
        [['Compute the features both ways on ten real inputs and compare', true],
          ['Compare the model score in both environments', false],
          ['Check the library versions match', false],
          ['Re-train using production data', false]],
        'Common, cheap to test, and if they differ that is the whole answer.'),
      mcq('A model worse than chance on a balanced binary problem is usually:',
        [['Inverted labels', true],
          ['An unsuitable model family', false],
          ['Insufficient training data', false],
          ['A leaked feature working backwards', false]],
        'Oddly common, and worth checking before anything else.'),
    ],
    checkpoint: [
      mcq('A score swinging 5% between random seeds means:',
        [['You are reading noise, and should report the variation', true],
          ['The seed was not set correctly', false],
          ['The model simply needs rather more training data', false],
          ['The test set is too small to use', false]],
        'A fixed seed makes it reproducible, not stable.'),
      mcq('The most informative thing after a score is:',
        [['The pattern in the mistakes', true],
          ['The training curve', false],
          ['The feature importances', false],
          ['The confusion matrix totals', false]],
        'A summary metric hides all of them.'),
      mcq('95% accuracy while never predicting the rare class is revealed by:',
        [['The confusion matrix', true],
          ['A larger test set', false],
          ['A different random seed', false],
          ['Cross-validation', false]],
        'Accuracy hides it completely.'),
    ],
  },

  {
    unitCode: 'T3_ML_WORKFLOW_PRACTICE',
    notes: `Two exercises on the workflow judgements: which split a problem needs, and whether
a model has actually beaten anything.`,
    coding: [
      {
        title: 'Which split does this need?',
        description: `Read one problem per line as \`<time_ordered> <grouped> <rare_class>\`,
each \`yes\` or \`no\`.

Print the split required, checking in this order:

- time_ordered \`yes\` → \`temporal\`
- grouped \`yes\` → \`grouped\`
- rare_class \`yes\` → \`stratified\`
- otherwise → \`random\`

Then a final line \`random=<n>\` counting how many needed a plain random split.

The order encodes the severity: a temporal leak is the most damaging, and a problem that is
both time-ordered and grouped still needs the temporal split first.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# The order is the specification. A temporal leak outranks the others.
`,
        language: 'python',
        tests: [
          { input: 'yes no no\n', expectedOutput: 'temporal\nrandom=0' },
          { input: 'no yes no\n', expectedOutput: 'grouped\nrandom=0' },
          { input: 'no no yes\n', expectedOutput: 'stratified\nrandom=0' },
          { input: 'no no no\n', expectedOutput: 'random\nrandom=1' },
          { input: 'yes yes yes\n', expectedOutput: 'temporal\nrandom=0', isHidden: true },
          { input: '', expectedOutput: 'random=0', isHidden: true },
        ],
      },
      {
        title: 'Did the model beat anything?',
        description: `Read three lines: the majority-class proportion, the existing rule's
score, and the model's score — each a number between 0 and 1.

Print three lines:

    vs_majority=<beats|ties|loses>
    vs_rule=<beats|ties|loses>
    verdict=<deploy|not_worth_it|broken>

Compare with a tolerance of 0.01: within that, it is \`ties\`.

The verdict:

- \`broken\` if the model loses to the majority class
- \`not_worth_it\` if it does not beat the existing rule
- \`deploy\` otherwise

A rule score of \`-1\` means there is no existing rule; then \`vs_rule\` is \`beats\` by
default and the verdict ignores it.`,
        starter: `import sys

lines = [l.strip() for l in sys.stdin if l.strip()]
majority, rule, model = float(lines[0]), float(lines[1]), float(lines[2])

# Beating the mean while losing to the current rule is not a success.
`,
        language: 'python',
        tests: [
          { input: '0.84\n0.86\n0.91\n', expectedOutput: 'vs_majority=beats\nvs_rule=beats\nverdict=deploy' },
          { input: '0.84\n0.90\n0.89\n', expectedOutput: 'vs_majority=beats\nvs_rule=loses\nverdict=not_worth_it' },
          { input: '0.84\n-1\n0.91\n', expectedOutput: 'vs_majority=beats\nvs_rule=beats\nverdict=deploy' },
          { input: '0.90\n0.50\n0.80\n', expectedOutput: 'vs_majority=loses\nvs_rule=beats\nverdict=broken' },
          { input: '0.84\n0.86\n0.865\n', expectedOutput: 'vs_majority=beats\nvs_rule=ties\nverdict=not_worth_it', isHidden: true },
          { input: '0.50\n-1\n0.505\n', expectedOutput: 'vs_majority=ties\nvs_rule=beats\nverdict=deploy', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'ML Workflow Practice',
      description: 'Choose the split, judge against baselines, then run a real workflow end to end.',
      instructions: `Complete both exercises, then:

1. For the first: give a concrete problem that is both time-ordered and grouped, and say what
   goes wrong if you use a grouped split rather than a temporal one.
2. For the first: say why stratification is the least severe of the three, and what it
   protects against.
3. For the second: a tie against the existing rule gives \`not_worth_it\`. Argue for and
   against that being the right default.
4. For the second: the verdict ignores everything except the scores. Name three other things
   that should affect a deploy decision.

**Then, a real workflow.** Use any tabular dataset with a clear target.

5. **Split first, before looking at anything.** Say which split you used and why.
6. Build a baseline in ten minutes. Report its score.
7. Build a simple model with a few obvious features. Report its score against the baseline.
8. Put every transformation in a pipeline. **Show that cross-validation refits them per fold.**
9. Add better features. Report the change.
10. Try a more capable model. Report the change, and the cost in training time.
11. **Report the whole sequence as a table**: step, score, change, cost.
12. Say which step you would stop at, and why.
13. Set a seed. Run three times with different seeds and report the spread. Say whether your
    improvements survive it.`,
      rubric: [
        { criterion: 'Split chosen correctly', description: 'All cases, with the precedence respected.', maxPoints: 15 },
        { criterion: 'Judged against baselines', description: 'All cases, including no existing rule and the tie.', maxPoints: 20 },
        { criterion: 'A real workflow, split first', description: 'The split justified, and made before any exploration.', maxPoints: 15 },
        { criterion: 'A ten-minute baseline', description: 'Trivial, evaluated identically to the model.', maxPoints: 15 },
        { criterion: 'The sequence as a table', description: 'Step, score, change and cost for each stage.', maxPoints: 20 },
        { criterion: 'Seed variation reported', description: 'Three seeds, the spread, and whether the improvements survive it.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.strip() for l in sys.stdin if l.strip()]
majority, rule, model = float(lines[0]), float(lines[1]), float(lines[2])
`,
        tests: [
          { input: '0.84\n0.86\n0.91\n', expectedOutput: 'vs_majority=beats\nvs_rule=beats\nverdict=deploy' },
          { input: '0.84\n0.90\n0.89\n', expectedOutput: 'vs_majority=beats\nvs_rule=loses\nverdict=not_worth_it' },
          { input: '0.90\n0.50\n0.80\n', expectedOutput: 'vs_majority=loses\nvs_rule=beats\nverdict=broken' },
          { input: '0.84\n0.86\n0.865\n', expectedOutput: 'vs_majority=beats\nvs_rule=ties\nverdict=not_worth_it', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A temporal split outranks a grouped one because:',
        [['Learning from the future is the most damaging leak', true],
          ['Time-ordered data is more common', false],
          ['Grouping can be handled within a temporal split', false],
          ['Temporal splits are easier to implement', false]],
        'It produces an excellent score and a useless model.'),
      mcq('Stratification protects against:',
        [['A test set that happens to contain almost no positives', true],
          ['The model memorising individual records', false],
          ['Information from the future reaching the model', false],
          ['Features being scaled inconsistently', false]],
        'The least severe of the three, and still worth getting right.'),
      mcq('Beyond the scores, a deploy decision should consider:',
        [['Serving cost, explainability, and who it is wrong about', true],
          ['Training time and dataset size', false],
          ['The number of features used', false],
          ['The variance observed across different random seeds', false]],
        'The third of those is the responsible-use unit’s subject.'),
    ],
  },

  {
    unitCode: 'T3_ML_WORKFLOW_MINI_PROJECT',
    notes: `Run a complete workflow on a real problem, with the discipline visible at every
step.

The brief's distinguishing requirement is **the honest sequence**: the baseline, every step,
every score, and the cost of each. Most student projects report one number for one model; the
sequence is what shows whether anything was learned.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Workflow You Can Defend',
      description: 'Run a full machine learning workflow with a baseline, a measured sequence and an untouched test set.',
      instructions: `**Choose** a tabular dataset with a clear target and at least a few
thousand rows. Not a famous teaching set if you can avoid it.

**Part one — split first**

1. **Split before looking at anything.** Say what you did and in what order.
2. Justify the split type. If the data has time or grouping structure, say how you checked.
3. Set aside the test set and **state in writing that you will touch it once.**

**Part two — baseline**

4. Build a baseline in ten minutes. Report the score.
5. If there is a plausible existing rule or heuristic for this problem, implement it too.
6. Evaluate both exactly as you will evaluate the model.

**Part three — the sequence**

Measure at every step and report as a table with score, change and cost:

7. Simple model, few features.
8. Better features, same model.
9. More capable model, same features.
10. Tuning.

11. **Say which step gave the most**, and whether that matched your expectation.

**Part four — the discipline**

12. Everything in a pipeline. Show that transformations are fitted inside the
    cross-validation, not before it.
13. Set seeds. Run your best configuration with three seeds and report the spread.
14. **Check the most important features.** For each of the top five, say how it is computed and
    whether it would be available at prediction time.
15. Look at twenty predictions — ten right, ten wrong. Report any pattern in the mistakes.

**Part five — the test set, once**

16. Evaluate on the test set. Report the score.
17. **Compare it with your validation score.** If it is much lower, say what you think
    happened.
18. **Do not tune after this.** If you are tempted, say what you would have changed and why you
    did not.

**Part six — the report**

19. The baseline, the model, and the difference.
20. The cost: training time, serving complexity, explainability.
21. Would you deploy it? Say why or why not, and what would change your answer.

**Submit** the code, the sequence table, the feature review, the prediction inspection, and the
single test evaluation.`,
      rubric: [
        { criterion: 'Split first, justified', description: 'Before any exploration, with the type reasoned from the data structure.', maxPoints: 15 },
        { criterion: 'A real baseline', description: 'Trivial, plus an existing rule where one is plausible.', maxPoints: 15 },
        { criterion: 'The measured sequence', description: 'Four steps with score, change and cost, and which gave the most.', maxPoints: 25 },
        { criterion: 'Pipeline and seeds', description: 'Transformations fitted inside folds; spread across three seeds reported.', maxPoints: 15 },
        { criterion: 'Features and predictions inspected', description: 'Top five checked for availability; patterns in the mistakes reported.', maxPoints: 15 },
        { criterion: 'The test set touched once', description: 'Evaluated once, compared with validation, no tuning afterwards.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Most student projects report:',
        [['One number for one model, with no sequence', true],
          ['Too many models without comparison', false],
          ['A score without a test set', false],
          ['The training score rather than validation', false]],
        'The sequence is what shows whether anything was learned.'),
      mcq('A test score much lower than validation suggests:',
        [['Something was tuned against the validation set too hard', true],
          ['The test set is too small', false],
          ['The model needs retraining', false],
          ['The split was stratified in entirely the wrong way', false]],
        'Or a leak that the validation split shared and the test set did not.'),
      mcq('Being tempted to tune after seeing the test score:',
        [['Should be recorded rather than acted on', true],
          ['Is acceptable for one further iteration', false],
          ['Means the test set was too small', false],
          ['Indicates the validation split failed', false]],
        'Say what you would have changed and why you did not.'),
    ],
  },

  /* ══ T3_ML_SUPERVISED ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_SUPERVISED_REGRESSION',
    notes: `Predicting a number: a price, a duration, a demand. **This unit is about what the
output means and how it fails**, not about deriving the mathematics — the library implements
that, and understanding the failure modes is what distinguishes a practitioner.

## What you get

A model that maps features to a continuous value. **It will always give you a number**, however
nonsensical the input, and that property is the source of most of the problems below.

## The metrics, and what each hides

**Mean absolute error.** The average size of the mistake, in the units of the target. **The
most interpretable one** — "on average we are £42 out" is a sentence anybody understands.

**Root mean squared error.** Penalises large errors more. Use it when a big mistake is
disproportionately bad, which is common — being £500 out once is often worse than being £50 out
ten times.

**R².** The proportion of variance explained. **Convenient and easy to over-read.** An R² of
0.8 tells you nothing about whether the errors are acceptable for your use, and a model can
have a respectable R² and be useless at the range you care about.

**Report an error in the target's units, always.** "R² of 0.82" means little to the person
deciding whether to use this; "typically within £40, occasionally out by £300" means a great
deal.

## Where regression goes wrong

**Predictions outside the possible range.** Negative prices, durations below zero, percentages
above 100. **A linear model has no idea these are impossible** — clip the output, or model
something that cannot go out of range, such as the logarithm.

**A skewed target.** Prices, incomes and durations have long tails. A model fitted on the raw
value chases the tail and is poor everywhere else. **Modelling the logarithm is the usual
answer**, and remember to transform back — including the fact that the average of the logs is
not the log of the average, which quietly biases your predictions low if ignored.

**Extrapolation.** The model saw houses between 50 and 200 square metres. Asked about 600, it
will answer confidently and the answer is invented. **Tree-based models are worse here**: they
cannot extrapolate at all and will return the nearest leaf's value forever.

**Heteroscedastic errors.** The model is accurate for cheap items and wildly wrong for
expensive ones. **A single error number hides this completely.** Plot the error against the
prediction — it takes a minute and it is the most informative diagnostic in regression.

## The plots worth making

**Predicted against actual.** Points should sit on the diagonal. **Curvature means a missing
non-linearity; a fan shape means the error grows with the value.**

**Residual against predicted.** Should be a shapeless cloud. Any pattern is signal the model
did not capture.

**The distribution of errors.** Is it symmetric? Are you systematically over or under
predicting?

## The honest summary

> "Median absolute error £38. 90% of predictions within £120. **Above £2,000 the model is
> unreliable — only 4% of training data is in that range and the error there averages £600.**"

**The second sentence is what makes it usable.** A single error figure invites the reader to
apply the model everywhere, including where it does not work.`,
    mcqs: [
      mcq('The most interpretable regression metric is:',
        [['Mean absolute error, in the units of the target', true],
          ['R squared', false],
          ['Root mean squared error', false],
          ['Mean squared error', false]],
        '"On average we are £42 out" is a sentence anybody understands.'),
      mcq('A linear model asked for a price will:',
        [['Return a negative number if the features point that way', true],
          ['Clip the output to a valid range', false],
          ['Refuse to predict outside the training range', false],
          ['Return the nearest training value', false]],
        'It has no idea the value is impossible.'),
      mcq('Tree-based models extrapolate:',
        [['Not at all — they return the nearest leaf value forever', true],
          ['Linearly beyond the training range', false],
          ['Better than linear models', false],
          ['With increasing uncertainty', false]],
        'Which makes them worse than linear models outside the observed range.'),
      mcq('Modelling the logarithm of a skewed target requires remembering that:',
        [['The average of the logs is not the log of the average', true],
          ['The errors become multiplicative', false],
          ['Zero values must be excluded', false],
          ['R squared is no longer comparable', false]],
        'Ignoring it quietly biases your predictions low.'),
    ],
    checkpoint: [
      mcq('The most informative regression diagnostic is:',
        [['Plotting the error against the prediction', true],
          ['Reporting R squared alongside the error', false],
          ['Comparing train and test error', false],
          ['Computing the error per feature', false]],
        'A minute, and a single error number hides the pattern completely.'),
      mcq('A fan shape in predicted against actual means:',
        [['The error grows with the value', true],
          ['A non-linearity is missing', false],
          ['The target is skewed', false],
          ['The model is overfitting', false]],
        'Curvature means the missing non-linearity.'),
      mcq('Reporting where the model is unreliable:',
        [['Is what makes a single error figure usable', true],
          ['Weakens the case for deploying it', false],
          ['Is only needed for regulated uses', false],
          ['Belongs in the technical appendix', false]],
        'Otherwise the reader applies it everywhere, including where it does not work.'),
    ],
  },

  {
    unitCode: 'T3_ML_SUPERVISED_CLASSIFICATION',
    notes: `Predicting a class: spam or not, which category, will they churn. **The single most
important thing to understand is that the model does not output a class — it outputs a
probability, and somebody chose the threshold.**

## The threshold is a decision, not a default

Most libraries default to 0.5. **That default is a choice nobody made deliberately**, and it is
right only when the two kinds of mistake cost the same — which is almost never.

**Cancer screening:** missing a case is catastrophic, a false alarm is a follow-up test.
Threshold low.

**Blocking a transaction as fraud:** a false positive angers a customer, a false negative costs
the fraud amount. Threshold depends on the amounts.

**The threshold is a business decision that a data scientist should surface rather than
silently set.** Presenting a model without discussing it is presenting half the system.

## The confusion matrix, and why accuracy is not enough

|  | Predicted positive | Predicted negative |
|---|---|---|
| **Actually positive** | true positive | false negative |
| **Actually negative** | false positive | true negative |

**Accuracy** — everything right, over everything. **Useless with imbalance**: 99% accuracy on a
1% positive rate is achieved by predicting negative always.

**Precision** — of those predicted positive, how many were. *When it says yes, is it right?*

**Recall** — of those actually positive, how many were caught. *Does it find them?*

**They trade off.** Lower the threshold and recall rises while precision falls. **You cannot
maximise both**, and which you favour is the same business decision as the threshold.

**F1** combines them into one number. Convenient, and it hides the trade-off — which is
sometimes exactly what you should not hide.

## Which to optimise

**Ask what each mistake costs.**

- A false positive is expensive — spam filter deleting real mail → **precision**.
- A false negative is expensive — screening, fraud, safety → **recall**.
- Genuinely symmetric → accuracy or F1 is reasonable.

**Write the costs down**, even roughly. It turns an argument about metrics into an arithmetic
problem.

## Probabilities, and whether to believe them

A model outputting 0.8 is not necessarily right 80% of the time. **A calibrated model is;
most models out of the box are not.**

**This matters when you use the number rather than the class** — ranking by risk, expected
value, showing a confidence to a user. **If you only threshold it, calibration does not
matter.** If you multiply it by a pound value, it does, enormously.

## Imbalance

Rare positives — fraud, disease, churn.

**Do not use accuracy.** Use precision, recall, and the curves.

**Resampling helps sometimes** and it distorts the probabilities, so recalibrate afterwards if
you are using them.

**And consider whether a threshold is the right shape at all.** Ranking is often better: give
the investigators the top hundred by score rather than everything above a line. That changes
the problem from classification to prioritisation, and it is frequently what the business
actually wanted.

## Multi-class

**Per-class metrics, not just the average.** A model with 85% overall accuracy may be at 30%
on one class, and the average hides it.

**Look at the confusion matrix.** Which classes are confused with which is the most useful
output you will get, and it usually points at either a labelling problem or two classes that
are not genuinely distinct.`,
    mcqs: [
      mcq('A classifier’s threshold of 0.5 is:',
        [['A default nobody chose deliberately', true],
          ['The mathematically optimal cut point', false],
          ['Required for probability outputs', false],
          ['Correct unless the classes are imbalanced', false]],
        'Right only when both kinds of mistake cost the same, which is almost never.'),
      mcq('Precision and recall trade off because:',
        [['Lowering the threshold raises recall and lowers precision', true],
          ['They measure the same thing differently', false],
          ['Improving one requires more data', false],
          ['They are computed from different subsets', false]],
        'You cannot maximise both, and which you favour is a business decision.'),
      mcq('A model outputting 0.8 is right 80% of the time only if it is:',
        [['Calibrated, which most models are not by default', true],
          ['Trained on balanced classes', false],
          ['Evaluated on a large test set', false],
          ['A probabilistic model family', false]],
        'It matters when you use the number rather than the class.'),
      mcq('For a fraud team with limited capacity, the better framing is often:',
        [['Ranking — give them the top hundred by score', true],
          ['A lower threshold to catch more', false],
          ['A higher threshold to reduce noise', false],
          ['Optimising F1 to balance the two', false]],
        'Prioritisation rather than classification, and frequently what was wanted.'),
    ],
    checkpoint: [
      mcq('99% accuracy on a 1% positive rate is achieved by:',
        [['Predicting negative always', true],
          ['A well-tuned model', false],
          ['Resampling the training data', false],
          ['Lowering the threshold', false]],
        'Which is why accuracy is useless under imbalance.'),
      mcq('F1 is convenient and:',
        [['Hides the trade-off, which is sometimes what you must not hide', true],
          ['Is unreliable whenever the class balance is uneven', false],
          ['Cannot be computed per class', false],
          ['Requires calibrated probabilities', false]],
        'One number instead of the two that carry the decision.'),
      mcq('In multi-class problems, the confusion matrix mainly reveals:',
        [['Which classes are confused with which', true],
          ['The overall accuracy per fold', false],
          ['Whether the model is calibrated', false],
          ['Which features matter most', false]],
        'Usually pointing at a labelling problem or two classes that are not distinct.'),
    ],
  },

  {
    unitCode: 'T3_ML_SUPERVISED_WHICH_QUESTION',
    notes: `Before choosing a model, **decide what kind of question you are asking.** Getting
this wrong is not a modelling error; it is answering something nobody asked.

## The families

**Regression** — predict a number. How much, how long, how many.

**Classification** — predict a category. Which one, will it, is it.

**Ranking** — order things by relevance or risk. **Frequently what people mean when they say
classification**, and framing it correctly changes both the metric and the deployment.

**Clustering** — find groups, with no labels. Exploratory, and the groups may not mean
anything.

**Anomaly detection** — find the unusual. Fraud, faults, intrusions.

**Forecasting** — predict a value over time, where the ordering matters.

## The question behind the question

**"Predict churn" could be any of three:**

- **Classification:** will this customer churn in the next 30 days?
- **Regression:** how many days until they churn?
- **Ranking:** which 100 customers should the retention team call this week?

**The third is usually the real one**, because the team has capacity for a hundred calls and
the decision is who to call — not whether an individual customer will churn.

**Ask what somebody will do with the output.** The action determines the framing, and the
framing determines everything else.

## Converting between them

**Regression to classification:** threshold the number. Loses information, gains simplicity.

**Classification to ranking:** use the probability instead of the class. **Usually free and
usually better**, if capacity is the constraint.

**Ranking to classification:** cut the ranked list at a capacity point.

**Notice that ranking sits between the two**, and that moving to it is often the cheapest
improvement available — the same model, used differently.

## When the answer is no model at all

**This is worth saying explicitly**, because it is a real and common outcome.

**A rule is enough.** If "flag orders over £500 from new accounts" catches most of it, that is
maintainable, explainable, instantly changeable and free. **A model that beats it by two points
may not be worth its lifetime cost.**

**There is no signal.** Sometimes the features genuinely do not predict the target. A baseline
you cannot beat is a finding.

**There is not enough data.** A few hundred rows will not support a complex model, and the
honest options are a simpler model, a simpler question, or collecting more.

**The cost of being wrong is too high** for a model nobody can explain.

## Say what it cannot do

Every framing has a boundary.

**A model that predicts churn does not tell you why**, and it does not tell you that calling
people will help. **Correlation again**, and the enthusiasm around machine learning makes this
worth restating: a model finds patterns in what happened, and acting on them assumes a causal
story the model did not establish.

**Say that when you present it.** The person acting on the output will otherwise assume
otherwise.`,
    mcqs: [
      mcq('"Predict churn" is usually really:',
        [['A ranking problem, because the team has limited capacity', true],
          ['A classification problem per customer', false],
          ['A regression on days remaining', false],
          ['A clustering problem over behaviour', false]],
        'The decision is who to call, not whether an individual will churn.'),
      mcq('Moving from classification to ranking is:',
        [['Usually free and usually better when capacity is the constraint', true],
          ['A substantial change requiring a new model', false],
          ['Only possible with calibrated probabilities', false],
          ['A loss of information', false]],
        'The same model, used differently.'),
      mcq('A rule that catches most of it may beat a model because:',
        [['It is maintainable, explainable, instantly changeable and free', true],
          ['Rules are more accurate on small data', false],
          ['Models cannot encode business logic', false],
          ['Rules are easier to evaluate', false]],
        'Two points of improvement may not be worth the lifetime cost.'),
      mcq('A churn model does not tell you:',
        [['Why, or that intervening will help', true],
          ['Which customers are at risk', false],
          ['How confident it is', false],
          ['Which features mattered', false]],
        'Acting on it assumes a causal story the model did not establish.'),
    ],
    checkpoint: [
      mcq('The question to ask before choosing a framing is:',
        [['What somebody will do with the output', true],
          ['What data is available', false],
          ['Which model family performs best', false],
          ['How the target is distributed', false]],
        'The action determines the framing, and the framing determines everything else.'),
      mcq('A baseline you cannot beat is:',
        [['A finding', true],
          ['A reason to try a bigger model', false],
          ['Evidence of a data quality problem', false],
          ['A sign the features need engineering', false]],
        'Sometimes the features genuinely do not predict the target.'),
      mcq('Clustering differs from the others in that:',
        [['There are no labels, and the groups may not mean anything', true],
          ['It cannot be evaluated at all', false],
          ['It requires more data', false],
          ['It produces probabilities rather than discrete classes', false]],
        'Exploratory, and the groups need interpreting rather than trusting.'),
    ],
  },

  {
    unitCode: 'T3_ML_SUPERVISED_DEBUGGING',
    notes: `Five supervised learning failures and how each is identified.

## 1. Training error low, validation error high

**Overfitting**, and the gap is the diagnosis.

**Causes:** too much model for the data; too many features; not enough rows; training too long.

**Fixes, in order of what to try:** more data, if you can get it; fewer features; a simpler
model; regularisation; early stopping.

**Check the gap at every step.** A model that closes the gap by getting worse on training as
well has not improved — it has just become worse uniformly.

## 2. Both errors high

**Underfitting.** The model cannot capture the pattern.

**Causes:** too simple a model; features that do not carry the signal; over-regularisation.

**And a third that is not a model problem at all:** there may be no signal. **Check the
baseline** — if you are at the baseline and cannot move, the features may genuinely not predict
the target, and that is an answer rather than a failure.

## 3. Great on the test set, poor in production

**Causes:** leakage; the training data not representing production; the world changed; a
distribution shift in the inputs.

**Diagnosis:** compare the distribution of each feature in training against a sample from
production. **A feature whose distribution has moved is the most likely culprit**, and the
comparison takes minutes.

## 4. It never predicts the rare class

**Cause:** imbalance plus a metric that rewards ignoring it, and a threshold at the default.

**Before resampling or reweighting, try lowering the threshold** and look at the
precision-recall curve. **Frequently the model has learned the pattern and the threshold is
hiding it** — and that is a two-minute fix rather than a retraining.

## 5. One feature dominates completely

**Symptom:** feature importance shows one feature with almost all the weight.

**Sometimes legitimate.** Often leakage, and this is the most reliable leakage detector there
is.

**Ask of that feature:** would it be available at prediction time? Is it derived from the
target? Is it a proxy for something in the future — a status field updated after the event, an
identifier that encodes the outcome?

**Remove it and retrain.** If the score collapses to the baseline, that feature *was* the
answer and you have learned nothing about the problem.

## The habits

**Always plot training against validation error**, across the sequence of your experiments. The
gap and its direction tell you which of the two problems you have.

**Always look at the confusion matrix or the error distribution.** The summary number hides the
shape.

**Always check feature importance.** Fast, and it catches leakage before the score does.

**And look at the actual mistakes.** Twenty examples the model got wrong will teach you more
about the problem than any metric — they frequently reveal mislabelled data, a class boundary
that is genuinely ambiguous, or a subgroup the features do not describe.`,
    mcqs: [
      mcq('A large gap between training and validation error means:',
        [['Overfitting', true], ['Underfitting', false],
          ['A leaked feature', false], ['An imbalanced target', false]],
        'And a model that closes the gap by getting worse on training has not improved.'),
      mcq('Both errors high, sitting at the baseline, may mean:',
        [['There is no signal in the features, which is an answer', true],
          ['The model needs more capacity', false],
          ['The data needs more cleaning', false],
          ['The split was done wrongly', false]],
        'Rather than a failure to be fixed.'),
      mcq('Before resampling for a rare class, you should:',
        [['Lower the threshold and look at the precision-recall curve', true],
          ['Collect more examples of the rare class', false],
          ['Switch to a model that handles imbalance', false],
          ['Reweight the loss function', false]],
        'Frequently the model learned it and the threshold is hiding it.'),
      mcq('One feature carrying almost all the importance is:',
        [['The most reliable leakage detector there is', true],
          ['A sign the model is well-tuned', false],
          ['Normal for tree-based models', false],
          ['Evidence the other features are redundant', false]],
        'Sometimes legitimate, often leakage.'),
    ],
    checkpoint: [
      mcq('Removing the dominant feature and seeing the score collapse to baseline means:',
        [['That feature was the answer, and nothing was learned', true],
          ['The feature was genuinely the strongest signal', false],
          ['The model needs retuning without it', false],
          ['The remaining features need engineering', false]],
        'You have learned nothing about the problem.'),
      mcq('To diagnose good-in-test, poor-in-production, compare:',
        [['Each feature’s distribution in training against production', true],
          ['The model scores obtained in each of the environments', false],
          ['The training and validation curves', false],
          ['The confusion matrices side by side', false]],
        'A feature whose distribution moved is the likely culprit, and it takes minutes.'),
      mcq('Twenty examples the model got wrong will typically reveal:',
        [['Mislabelled data, ambiguous boundaries, or an undescribed subgroup', true],
          ['Which hyperparameters to change', false],
          ['Whether the model has been overfitting the training set', false],
          ['The optimal threshold', false]],
        'More about the problem than any metric.'),
    ],
  },

  {
    unitCode: 'T3_ML_SUPERVISED_PRACTICE',
    notes: `Two exercises on the judgements that surround a classifier: reading a confusion
matrix, and choosing a threshold from costs rather than from a default.`,
    coding: [
      {
        title: 'Read the confusion matrix',
        description: `Read four integers on one line: \`tp fp fn tn\`.

Print five lines, each to three decimal places except the last:

    accuracy=<...>
    precision=<...>
    recall=<...>
    f1=<...>
    verdict=<useful|ignores_positives|ignores_negatives|degenerate>

Where a denominator is zero, print \`0.000\` for that metric.

The verdict:

- \`degenerate\` if the model predicted only one class — that is, \`tp + fp\` is 0 **or**
  \`fn + tn\` is 0
- \`ignores_positives\` if recall is below 0.1
- \`ignores_negatives\` if precision is below 0.1
- otherwise \`useful\`

Check degenerate first: a model predicting one class always has a misleading metric somewhere.`,
        starter: `import sys

tp, fp, fn, tn = [int(x) for x in sys.stdin.readline().split()]

# Accuracy can look excellent while the model never predicts the rare class.
`,
        language: 'python',
        tests: [
          { input: '50 10 5 100\n', expectedOutput: 'accuracy=0.909\nprecision=0.833\nrecall=0.909\nf1=0.870\nverdict=useful' },
          { input: '0 0 10 990\n', expectedOutput: 'accuracy=0.990\nprecision=0.000\nrecall=0.000\nf1=0.000\nverdict=degenerate' },
          { input: '5 0 95 900\n', expectedOutput: 'accuracy=0.905\nprecision=1.000\nrecall=0.050\nf1=0.095\nverdict=ignores_positives' },
          { input: '100 0 0 0\n', expectedOutput: 'accuracy=1.000\nprecision=1.000\nrecall=1.000\nf1=1.000\nverdict=degenerate', isHidden: true },
          { input: '10 200 0 50\n', expectedOutput: 'accuracy=0.231\nprecision=0.048\nrecall=1.000\nf1=0.091\nverdict=ignores_negatives', isHidden: true },
        ],
      },
      {
        title: 'Choose the threshold from the costs',
        description: `Read two integers: the cost of a false positive and the cost of a false
negative. Then one line per candidate threshold, each
\`<threshold> <false_positives> <false_negatives>\`.

Print each threshold with its total cost as \`<threshold> <cost>\`, then a final line
\`best=<threshold>\` naming the cheapest. Break ties by the **lower** threshold.

Costs are integers. This is the calculation the 0.5 default skips.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
fp_cost, fn_cost = int(lines[0][0]), int(lines[0][1])
rows = lines[1:]

# Total cost, not accuracy. The threshold is a business decision.
`,
        language: 'python',
        tests: [
          { input: '1 10\n0.3 100 5\n0.5 40 20\n0.7 10 60\n', expectedOutput: '0.3 150\n0.5 240\n0.7 610\nbest=0.3' },
          { input: '10 1\n0.3 100 5\n0.5 40 20\n0.7 10 60\n', expectedOutput: '0.3 1005\n0.5 420\n0.7 160\nbest=0.7' },
          { input: '1 1\n0.5 10 10\n0.6 10 10\n', expectedOutput: '0.5 20\n0.6 20\nbest=0.5' },
          { input: '5 5\n0.4 0 0\n', expectedOutput: '0.4 0\nbest=0.4', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Supervised Learning Practice',
      description: 'Read a confusion matrix, choose a threshold from costs, then build and interrogate a real classifier.',
      instructions: `Complete both exercises, then:

1. For the first: the \`100 0 0 0\` case scores 1.000 on everything and is \`degenerate\`.
   Explain what that model is and why every metric is misleading.
2. For the first: give a real situation where \`ignores_positives\` is the correct behaviour
   to ship, and say what makes it so.
3. For the second: the tie rule picks the lower threshold. Argue for the opposite, and say
   what information would settle it.
4. For the second: name three costs this calculation ignores that would matter in practice.

**Then, a real classifier.** Any dataset with a binary target.

5. Split properly. Build a baseline. Report both.
6. Train a simple classifier. Report accuracy, precision, recall and the confusion matrix.
7. **Plot precision and recall across thresholds.** Report the curve.
8. **Write down the cost of each kind of mistake** for your problem, even roughly. Choose a
   threshold from those costs, and say how it differs from 0.5.
9. Check calibration: group predictions into bands and compare the predicted probability with
   the observed rate. Report whether it is calibrated.
10. Look at twenty mistakes — ten false positives, ten false negatives. Report any pattern.
11. Say whether you would frame this as classification or ranking, and why.`,
      rubric: [
        { criterion: 'Confusion matrix read', description: 'All metrics and verdicts, including the zero-denominator cases.', maxPoints: 20 },
        { criterion: 'Threshold from costs', description: 'Correct totals and tie-breaking.', maxPoints: 15 },
        { criterion: 'A real classifier with a curve', description: 'Precision and recall across thresholds, reported.', maxPoints: 20 },
        { criterion: 'Costs written down', description: 'Both kinds of mistake costed, with a threshold chosen from them.', maxPoints: 20 },
        { criterion: 'Calibration checked', description: 'Banded comparison of predicted against observed.', maxPoints: 15 },
        { criterion: 'Framing judged', description: 'Classification or ranking, with a reason from the use.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

tp, fp, fn, tn = [int(x) for x in sys.stdin.readline().split()]
`,
        tests: [
          { input: '50 10 5 100\n', expectedOutput: 'accuracy=0.909\nprecision=0.833\nrecall=0.909\nf1=0.870\nverdict=useful' },
          { input: '0 0 10 990\n', expectedOutput: 'accuracy=0.990\nprecision=0.000\nrecall=0.000\nf1=0.000\nverdict=degenerate' },
          { input: '5 0 95 900\n', expectedOutput: 'accuracy=0.905\nprecision=1.000\nrecall=0.050\nf1=0.095\nverdict=ignores_positives' },
          { input: '10 200 0 50\n', expectedOutput: 'accuracy=0.231\nprecision=0.048\nrecall=1.000\nf1=0.091\nverdict=ignores_negatives', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A model with tp=100 and everything else zero is:',
        [['Predicting one class, with every metric misleading', true],
          ['A perfect classifier', false],
          ['Overfitted rather heavily to the positive class', false],
          ['Correctly calibrated', false]],
        'Which is why degenerate is checked first.'),
      mcq('Costing the two kinds of mistake:',
        [['Turns an argument about metrics into arithmetic', true],
          ['Requires precise financial figures', false],
          ['Replaces the need for a precision-recall curve', false],
          ['Only applies to imbalanced problems', false]],
        'Even rough numbers do it.'),
      mcq('Three costs the threshold calculation ignores include:',
        [['Investigation capacity, reputational harm, and who is affected', true],
          ['Training time, inference time, and the storage cost', false],
          ['Precision, recall, and calibration', false],
          ['Data volume, feature count, and model size', false]],
        'The third of those is the responsible-use unit’s subject.'),
    ],
  },

  {
    unitCode: 'T3_ML_SUPERVISED_MINI_PROJECT',
    notes: `Build a classifier for a real decision, and choose its threshold from the costs
rather than from the library's default.

The brief's distinguishing requirement is **the cost table**. Almost every student project
reports accuracy at 0.5. Producing a threshold derived from what each mistake costs is a small
piece of work that changes the model from an artefact into a decision system.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — A Classifier With a Chosen Threshold',
      description: 'Build a classifier for a real decision, cost both kinds of mistake, and defend the threshold you chose.',
      instructions: `**Choose** a binary classification problem where the two mistakes plainly
differ in cost. Fraud, churn, screening, moderation, defect detection.

**Part one — the decision**

1. State what action the output drives, and who takes it.
2. **Cost a false positive.** In money, time, or harm. Rough is fine; unstated is not.
3. **Cost a false negative.**
4. Say what capacity constrains the action — how many can actually be acted on?

**Part two — the model**

5. Split properly and justify the type.
6. Baseline, plus any existing rule.
7. A simple model. Report the confusion matrix, not just the score.
8. Report precision and recall, and say which matters more here and why.

**Part three — the threshold**

9. **Plot precision and recall across thresholds.**
10. **Compute the total cost at each threshold** using your numbers from part one.
11. Choose the threshold. **Report how it differs from 0.5 and what that changes** — how many
    more or fewer cases are flagged.
12. Check the capacity constraint: does your chosen threshold flag more than the team can
    handle? If so, **reframe as ranking** and say what changes.

**Part four — believe the probabilities, or not**

13. Check calibration by banding predictions and comparing with observed rates. Report it.
14. Say whether your use needs calibrated probabilities. If it does and they are not, say what
    you would do.

**Part five — interrogate it**

15. Feature importance. For the top five, say whether each would be available at prediction
    time.
16. Twenty mistakes, ten of each kind. Report any pattern.
17. **Who is it most wrong about?** Break the error rate down by at least one meaningful
    subgroup and report it.

**Part six — the report**

18. The model, the threshold, the reasoning behind it, and the expected cost.
19. What it cannot do, and what a user should not conclude from it.
20. Would you deploy it? What would you monitor?

**Submit** the cost table, the threshold analysis, the calibration check, the subgroup
breakdown, and the report.`,
      rubric: [
        { criterion: 'Costs stated', description: 'Both kinds of mistake costed, with the action and capacity named.', maxPoints: 20 },
        { criterion: 'Confusion matrix, not a score', description: 'Reported throughout, with precision and recall judged for this use.', maxPoints: 15 },
        { criterion: 'Threshold derived from costs', description: 'Cost computed across thresholds, choice justified, effect quantified.', maxPoints: 25 },
        { criterion: 'Capacity considered', description: 'Checked against what can be acted on, reframed as ranking if needed.', maxPoints: 10 },
        { criterion: 'Calibration checked', description: 'Banded comparison, with a judgement about whether it matters here.', maxPoints: 15 },
        { criterion: 'Subgroup error reported', description: 'Who it is most wrong about, measured rather than assumed.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The distinguishing requirement of this project is:',
        [['The cost table, and a threshold derived from it', true],
          ['The choice of model family and its tuning', false],
          ['The size of the dataset', false],
          ['The calibration check', false]],
        'It changes the model from an artefact into a decision system.'),
      mcq('If the chosen threshold flags more cases than the team can handle:',
        [['Reframe as ranking and take the top by score', true],
          ['Raise the threshold until it fits', false],
          ['Deploy anyway and let them prioritise', false],
          ['Retrain with a higher precision target', false]],
        'Prioritisation rather than classification.'),
      mcq('Breaking the error rate down by subgroup answers:',
        [['Who the model is most wrong about', true],
          ['Whether the model is calibrated', false],
          ['Which features matter most', false],
          ['Whether the threshold is optimal', false]],
        'Measured rather than assumed, which is the responsible-use unit’s standard.'),
    ],
  },

  /* ══ T3_ML_FEATURES ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ML_FEATURES_ENCODING_AND_SCALING',
    notes: `A model takes numbers. **How you turn a category into a number changes what the
model can learn**, and the wrong choice teaches it something false.

## Encoding categories

**One-hot** — a column per value, one of them 1. **The safe default.** No false ordering, and
it works with every model family.

**The cost:** high cardinality. Ten thousand postcodes becomes ten thousand columns, and most
models handle that badly.

**Ordinal (integer) encoding** — red is 1, green is 2, blue is 3.

**Only when there genuinely is an order.** Small, medium, large — fine. Red, green, blue —
**you have told a linear model that blue is three times red and that green is between them,
and it will use that.** This is one of the most consequential small mistakes in feature
engineering, and it is invisible in the code.

**Target encoding** — replace the category with the mean target for that category. Powerful for
high cardinality, and **it leaks by construction** unless computed within the training fold
only. Handle with the care the next unit describes.

**Frequency encoding** — replace with how often the value appears. Cheap, and often
surprisingly effective for high-cardinality columns.

**Unseen categories at prediction time.** A postcode not in the training data. **Decide what
happens** — an "other" bucket, or an explicit failure. Do not let it be whatever the library
happens to do, because the library's default may be to crash in production.

## Scaling numbers

**Why:** so no feature dominates by having a larger range. Income in the tens of thousands and
age in tens are not comparable to a model that measures distance.

**Standardisation** — subtract the mean, divide by the spread. The usual default.

**Min-max** — squash into 0 to 1. Sensitive to outliers: one extreme value compresses
everything else into a corner.

**Robust scaling** — uses the median and the interquartile range. Better with outliers.

## Which models care

**Distance-based and gradient-based models care a lot** — nearest neighbours, support vector
machines, neural networks, and anything regularised, because the penalty applies to
coefficients whose size depends on the feature's scale.

**Tree-based models do not care at all.** They split on thresholds, and a threshold works the
same whatever the units.

**Knowing this saves pointless work** and, more usefully, tells you that a tree-based model is
the pragmatic choice when your features are a mess of different scales and types.

## Transforming the distribution

**A logarithm for a long tail.** Prices, incomes, counts, durations. It makes the relationship
more linear and stops the tail dominating.

**Watch for zeros** — log of zero is undefined, so add one, or use a transform designed for it.

**Binning** a continuous variable into ranges loses information and sometimes helps, when the
relationship is genuinely step-shaped — age bands for a legal threshold, for instance.

## The rule that governs all of it

**Fit on training only. Apply to everything.**

The mean and spread for standardisation, the categories for one-hot, the frequencies, the
target means. **All learned from training data, all applied unchanged elsewhere** — and a
pipeline makes that structural rather than remembered, which is why the workflow unit insisted
on one.`,
      mcqs: [
      mcq('Ordinal encoding of red, green and blue tells a linear model:',
        [['That blue is three times red and green is between them', true],
          ['Nothing, since the values are arbitrary', false],
          ['That the categories are unordered', false],
          ['That there are three distinct classes', false]],
        'One of the most consequential small mistakes, and invisible in the code.'),
      mcq('Target encoding:',
        [['Leaks by construction unless computed within the training fold', true],
          ['Is safe because it uses only the training target', false],
          ['Cannot be used with cross-validation', false],
          ['Requires the target to be binary', false]],
        'Powerful for high cardinality, and needs care.'),
      mcq('Tree-based models and feature scaling:',
        [['Do not care at all, because they split on thresholds', true],
          ['Require standardisation like other models', false],
          ['Prefer min-max scaling specifically', false],
          ['Need scaling only for regularised variants', false]],
        'Which makes them pragmatic when your features are a mess of scales and types.'),
      mcq('An unseen category at prediction time should:',
        [['Have a decided behaviour, not the library default', true],
          ['Be encoded as all zeros automatically', false],
          ['Trigger a retrain of the encoder', false],
          ['Be mapped to the most common category', false]],
        'The library default may be to crash in production.'),
    ],
    checkpoint: [
      mcq('Min-max scaling is sensitive to:',
        [['Outliers, which compress everything else into a corner', true],
          ['Skewed distributions rather more than anything else', false],
          ['Categorical features mixed in', false],
          ['The number of features', false]],
        'Robust scaling uses the median and interquartile range instead.'),
      mcq('One-hot encoding’s main cost is:',
        [['High cardinality producing very many columns', true],
          ['Implying an order between categories', false],
          ['Leaking target information', false],
          ['Requiring the categories to be known', false]],
        'Ten thousand postcodes becomes ten thousand columns.'),
      mcq('Everything learned from the data — means, categories, frequencies — must be:',
        [['Fitted on training only and applied unchanged elsewhere', true],
          ['Recomputed for each split', false],
          ['Fitted on the full dataset for a stabler estimate', false],
          ['Updated when new categories appear', false]],
        'A pipeline makes that structural rather than remembered.'),
    ],
  },

  {
    unitCode: 'T3_ML_FEATURES_LEAKAGE',
    notes: `**Leakage is the defining failure of applied machine learning.** The model scores
0.98, everybody is delighted, and it is useless in production because a feature contained the
answer.

**A third-year who can spot leakage is more employable than one who can name six algorithms**,
and this is the longest unit in the track for that reason.

## What it is

**Information in the training features that would not be available at prediction time**, or
that is derived from the target.

The model learns to use it, scores brilliantly in evaluation, and collapses in production —
where the feature is absent, or has a different value, or has not happened yet.

## The forms it takes

**The target in disguise.** A \`refund_amount\` column when predicting refunds. A
\`churn_date\`. A \`case_closed_reason\`. **Obvious when stated, and easy to miss in a table of
eighty columns** that somebody else assembled.

**The future in the features.** The most common and the most insidious.

A \`status\` field updated after the event you are predicting. A \`total_orders\` count that
includes orders placed after the prediction date. A customer's lifetime value when predicting
their second purchase.

**The test:** *at the moment I would make this prediction, what would this column contain?*
**Not what it contains now** — what it contained then. That distinction is the whole of it.

**Preprocessing across the split.** Scaling, imputing or selecting features using all the data.
The workflow unit's point, and it is genuinely leakage even if the effect is small.

**Duplicate rows across the split.** The same record in train and test. Common with
near-duplicates from two systems, and it inflates the score for a reason nothing reveals.

**Group leakage.** Several rows per entity, split randomly. **The model memorises the entity.**

**Temporal leakage.** Random split on time-ordered data. The model learns from the future.

**Leakage through a proxy.** No column is the answer, but one encodes it. A file naming
convention where fraudulent cases were exported separately. A row ordering where positives were
appended. **An identifier that correlates with the outcome because of how the data was
assembled** — this one has caught serious teams.

## How to find it

**1. Look at feature importance.** A single dominant feature is the strongest signal available.

**2. Ask the availability question of every important feature.** Would it be there, with that
value, at prediction time?

**3. Be suspicious of a high score.** On a real problem, 0.98 means leakage until proved
otherwise. **The reflex should be to hunt, not to celebrate.**

**4. Ask somebody who knows the domain.** "Is \`status\` updated before or after the decision
we are predicting?" **Ten seconds of their time replaces a day of yours**, and they will
frequently answer immediately.

**5. Remove the suspect and retrain.** If the score collapses to baseline, the feature was the
answer.

## How to prevent it

**Split first, always.** The whole of the first unit.

**Pipelines**, so preprocessing is fitted inside folds.

**A point-in-time discipline.** For every feature, know when it becomes known. Build the
training set as it would have looked at the moment of prediction. **This is what a feature
store exists to enforce**, and it is the professional answer to the problem.

**Check for duplicates across splits.**

**Split by group and by time where the structure demands it.**

## The most valuable question in this track

> **"If I had to make this prediction on a brand new record, right now, would I have this
> value?"**

Ask it of every feature. **It takes a minute per feature and it prevents the failure that
wastes the most time in applied machine learning**, and if you leave this track with one habit,
this is the one to keep.`,
    mcqs: [
      mcq('Leakage is:',
        [['Information in training that would not be available at prediction time', true],
          ['A feature that correlates too strongly with the target', false],
          ['Training data appearing in the test set only', false],
          ['A model that overfits the training data', false]],
        'Or that is derived from the target.'),
      mcq('The test for the future-in-the-features form is:',
        [['What would this column contain at the moment of prediction', true],
          ['Is this column correlated with the target', false],
          ['Was this column available in the source system', false],
          ['Does this column change over time', false]],
        'Not what it contains now — what it contained then.'),
      mcq('Leakage through a proxy includes:',
        [['An identifier correlating with the outcome through how data was assembled', true],
          ['A feature computed from two other features', false],
          ['A category encoded with target means', false],
          ['A column with many missing values', false]],
        'This one has caught serious teams.'),
      mcq('Asking a domain expert whether a status field updates before or after the event:',
        [['Replaces a day of your time with ten seconds of theirs', true],
          ['Is unreliable without checking the data', false],
          ['Should come after removing the feature', false],
          ['Only helps for obvious leaks', false]],
        'They will frequently answer immediately.'),
    ],
    checkpoint: [
      mcq('On a real problem, a score of 0.98 should produce:',
        [['A hunt for leakage, not a celebration', true],
          ['Verification on a second dataset', false],
          ['Confidence the features are good', false],
          ['A check of the model complexity', false]],
        'Leakage until proved otherwise.'),
      mcq('A feature store exists to enforce:',
        [['Point-in-time correctness of features', true],
          ['Consistent scaling across environments', false],
          ['Version control of the feature code', false],
          ['Deduplication of training records', false]],
        'Building the training set as it would have looked at prediction time.'),
      mcq('The single habit to keep from this track is:',
        [['Asking whether each feature would be available for a new record now', true],
          ['Always building a baseline first', false],
          ['Splitting before exploring', false],
          ['Using a single pipeline object for all of the preprocessing', false]],
        'A minute per feature, and it prevents the costliest failure in applied ML.'),
    ],
  },

  {
    unitCode: 'T3_ML_FEATURES_FEATURES_FROM_DOMAIN',
    notes: `**The best features come from understanding the problem, not from a technique.** A
practitioner who knows the domain and builds three thoughtful features will usually beat one
who applies every automated transformation to raw columns.

## Why domain features win

A model can only learn relationships present in the features it is given. **It cannot invent
the concept of "orders in the last 30 days" from a table of order rows** — somebody has to
compute it.

**The model finds patterns; you decide what it is allowed to see patterns in.** That framing is
the unit.

## The families that transfer

**Ratios and rates.** Almost always more informative than the raw counts. Orders per month
rather than total orders — which conflates a new customer with an inactive one. Error rate
rather than error count.

**Differences from a reference.** How much above this customer's own average? How far from the
category's typical price? **Deviation from an expectation is frequently the signal**, and the
raw value frequently is not.

**Recency, frequency, monetary value.** The classic trio for customer behaviour, and it works
across a surprising range of problems.

**Time since an event.** Days since last purchase, since signup, since last complaint.
**Almost always more useful than the raw date**, and it is the workflow unit's point about
timestamps, generalised.

**Counts within a window.** Logins in the last 7 days, failed payments in the last 90.
**Choose the window from the domain**, not by trying several and keeping the best — that is
selection on the validation set by another route.

**Flags for meaningful conditions.** Is this their first order? Is it a weekend? Is the address
different from the billing address?

**Interactions.** Price and category together. Some models find these themselves; linear models
do not, and telling them explicitly is cheap.

## Getting the domain knowledge

**Ask somebody who does the job.** The fraud analyst knows which combinations are suspicious.
The clinician knows which measurements matter. **An hour with them is worth a week of
experimentation**, and they will describe features you would not have thought of.

**Look at the mistakes.** Twenty examples the model got wrong often show what it cannot see.
"These are all customers who changed address last month" is a feature.

**Read how the data is produced.** What the fields mean, when they are set, who fills them in.
**That understanding prevents leakage as well as creating features**, and the two activities
are the same investigation.

## Keep it disciplined

**Add features one at a time and measure**, or at least in small groups. Twenty at once tells
you nothing about which mattered.

**Every feature has a cost**: computed at serving time, maintained, another thing that can drift
or break, another chance to leak.

**Check availability at prediction time.** The previous unit's question, of every new feature,
before you get attached to it.

**Prefer explainable features** where explanation matters. "Orders in the last 30 days" can be
described to a regulator, a customer or a colleague. The fourth principal component cannot.

## Automated feature generation

Tools exist that generate hundreds of features automatically.

**They help sometimes**, and they produce features nobody can explain, multiply the leakage
surface, and cost a great deal at serving time.

**A thoughtful ten will usually beat an automated three hundred**, and the ten can be defended
in a meeting — which is not a minor consideration when somebody asks why a decision was made.`,
    mcqs: [
      mcq('A model cannot invent "orders in the last 30 days" because:',
        [['It only finds patterns in the features it is given', true],
          ['Time-based features require special handling', false],
          ['Aggregations are computationally expensive', false],
          ['It lacks access to the raw rows', false]],
        'You decide what it is allowed to see patterns in.'),
      mcq('Orders per month rather than total orders matters because:',
        [['Total conflates a new customer with an inactive one', true],
          ['Rates are easier for models to fit', false],
          ['Counts are usually skewed', false],
          ['Monthly granularity reduces noise', false]],
        'Ratios are almost always more informative than raw counts.'),
      mcq('The window for a count feature should be chosen:',
        [['From the domain, not by trying several and keeping the best', true],
          ['By cross-validating across window sizes', false],
          ['To match the prediction horizon', false],
          ['As long as the data allows', false]],
        'Trying several and keeping the best is selection on validation by another route.'),
      mcq('An hour with somebody who does the job:',
        [['Is worth a week of experimentation', true],
          ['Confirms the features you already have', false],
          ['Is useful mainly for labelling', false],
          ['Replaces the need for feature importance', false]],
        'They will describe features you would not have thought of.'),
    ],
    checkpoint: [
      mcq('Reading how the data is produced:',
        [['Creates features and prevents leakage — the same investigation', true],
          ['Is only really necessary for data from outside', false],
          ['Belongs to the collection stage', false],
          ['Helps mainly with missing values', false]],
        'What the fields mean, when they are set, who fills them in.'),
      mcq('A thoughtful ten features usually beats an automated three hundred because:',
        [['The ten can be defended when somebody asks why a decision was made', true],
          ['Fewer features always train faster', false],
          ['Automated tools produce redundant features', false],
          ['Three hundred features will always overfit by definition', false]],
        'As well as costing less at serving time and leaking less.'),
      mcq('Adding twenty features at once:',
        [['Tells you nothing about which mattered', true],
          ['Is efficient when time is short', false],
          ['Is acceptable with feature importance available', false],
          ['Risks overfitting more than adding them singly', false]],
        'Add one at a time, or in small groups, and measure.'),
    ],
  },

  {
    unitCode: 'T3_ML_FEATURES_DEBUGGING',
    notes: `Five feature engineering failures, and how each is caught.

## 1. The feature that does not exist at serving time

**Symptom:** the model is excellent offline and cannot be deployed, or is deployed and
receives nulls.

**Cause:** a feature computed from a table that is only populated nightly, or a value known
only after the event.

**Catch it before building:** for every feature, write down **where it comes from at serving
time and how long it takes to compute.** A feature requiring a three-second query is not
usable in a real-time path, whatever it does for the score.

## 2. The encoding differs between training and serving

**Symptom:** predictions are subtly worse in production, with no error.

**Causes:** the one-hot columns in a different order; a category present at training and
missing at serving, or the reverse; a different library version producing a different default.

**Fix:** serialise the fitted transformer with the model, and **use the same object in both
places.** Two implementations that are supposed to match will not.

**Diagnosis:** compute the feature vector for the same input in both environments and compare
element by element. **This finds it in minutes** and almost nobody does it until they have
spent a week on the model instead.

## 3. The scaler was fitted on everything

**Symptom:** validation is slightly optimistic; the effect is small and real.

**Cause:** scaling before splitting.

**Fix:** a pipeline. **The reason this is worth fixing even though the effect is small** is
that the reasoning which permits it also permits much larger leaks — once "it is only the mean"
is acceptable, "it is only the target mean per category" follows.

## 4. A feature is constant, or nearly

**Symptom:** it contributes nothing, or the model behaves oddly around it.

**Causes:** a column that is the same for every row in your sample; a category with one value
after filtering; a feature that is always null in the period you selected.

**Diagnosis:** the profiling from the data track — distinct value counts on every feature. **It
takes seconds and it is skipped constantly.**

## 5. The feature is right and the model cannot use it

**Symptom:** you added an obviously predictive feature and nothing improved.

**Causes:** it is already implied by another feature; the model family cannot represent the
relationship — a linear model and a non-monotonic feature; it is on a scale that a regularised
model penalises away; there are too few examples where it varies.

**Diagnosis:** plot the target against the feature. **If you can see the relationship and the
model cannot, the model family is the problem**, not the feature — and that is a different fix
entirely.

## The habits

**Profile every feature** before training: distinct values, nulls, range, distribution.

**Write down, for each feature, where it comes from and when it becomes known.** This one table
prevents most of the failures in this unit.

**Compare feature vectors between training and serving** for the same input. Once, early.

**And add features one at a time, measuring.** When something improves, you know what did.`,
    mcqs: [
      mcq('A feature requiring a three-second query at serving time is:',
        [['Not usable in a real-time path, whatever it does for the score', true],
          ['Acceptable if cached', false],
          ['A concern only at high volume', false],
          ['Fine if computed asynchronously', false]],
        'Write down where each feature comes from at serving time and how long it takes.'),
      mcq('To diagnose an encoding mismatch:',
        [['Compute the feature vector for the same input in both places and compare', true],
          ['Compare the model scores across environments', false],
          ['Check the library versions', false],
          ['Re-fit the encoder on production data', false]],
        'Minutes, and almost nobody does it until a week has gone into the model.'),
      mcq('Fitting the scaler on everything is worth fixing despite the small effect because:',
        [['The reasoning that permits it permits much larger leaks', true],
          ['It invalidates the test set entirely', false],
          ['It changes the model family’s behaviour', false],
          ['It breaks reproducibility', false]],
        '"It is only the mean" becomes "it is only the target mean per category".'),
      mcq('An obviously predictive feature that changes nothing may mean:',
        [['The model family cannot represent the relationship', true],
          ['The feature was computed incorrectly', false],
          ['The dataset is too small', false],
          ['The feature leaks and was removed', false]],
        'Plot the target against it — if you can see it and the model cannot, that is the fix.'),
    ],
    checkpoint: [
      mcq('Distinct value counts on every feature:',
        [['Take seconds and are skipped constantly', true],
          ['Are only useful for categorical features', false],
          ['Replace the need for distribution plots', false],
          ['Should be run after training', false]],
        'They catch the constant and near-constant features.'),
      mcq('The table that prevents most failures in this unit records:',
        [['Where each feature comes from and when it becomes known', true],
          ['Each feature’s importance and its correlations', false],
          ['The encoding and scaling applied to each', false],
          ['The null rate and distinct count of each', false]],
        'Serving availability and point-in-time correctness in one place.'),
      mcq('Two implementations of the same feature logic:',
        [['Will not match, which is why the fitted object is shared', true],
          ['Are acceptable if both are tested', false],
          ['Are necessary whenever the two languages differ', false],
          ['Can be kept in step with a schema', false]],
        'The same conclusion as client and server validation.'),
    ],
  },

  {
    unitCode: 'T3_ML_FEATURES_PRACTICE',
    notes: `Two exercises on the judgements: whether a feature leaks, and whether an encoding
tells the model something false.`,
    coding: [
      {
        title: 'Does this feature leak?',
        description: `Read one feature per line as
\`<name> <known_at_prediction> <derived_from_target> <fitted_on_all_data>\`, the last three
each \`yes\` or \`no\`.

Print a verdict per feature, checking in this order:

- derived_from_target \`yes\` → \`target_leak\`
- known_at_prediction \`no\` → \`future_leak\`
- fitted_on_all_data \`yes\` → \`preprocessing_leak\`
- otherwise → \`safe\`

Then a final line \`safe=<n>\` counting the safe ones.

The order is by severity: a feature derived from the target is the worst, and it is worth
naming even when it is also unavailable at prediction time.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Three kinds, and the order names the most serious one when several apply.
`,
        language: 'python',
        tests: [
          { input: 'refund_amount yes yes no\n', expectedOutput: 'target_leak\nsafe=0' },
          { input: 'status_after no no no\n', expectedOutput: 'future_leak\nsafe=0' },
          { input: 'age yes no yes\n', expectedOutput: 'preprocessing_leak\nsafe=0' },
          { input: 'tenure_days yes no no\n', expectedOutput: 'safe\nsafe=1' },
          { input: 'x no yes yes\ny yes no no\n', expectedOutput: 'target_leak\nsafe\nsafe=1', isHidden: true },
          { input: '', expectedOutput: 'safe=0', isHidden: true },
        ],
      },
      {
        title: 'Which encoding does this column need?',
        description: `Read one column per line as \`<name> <distinct> <ordered> <model>\`, where
distinct is an integer, ordered is \`yes\` or \`no\`, and model is \`linear\` or \`tree\`.

Print the encoding, checking in this order:

- ordered \`yes\` → \`ordinal\`
- model \`tree\` and distinct above 50 → \`frequency\`
- distinct above 50 → \`target\`
- otherwise → \`one_hot\`

Then a final line \`one_hot=<n>\`.

An ordered category takes ordinal encoding whatever the model, because the order is real
information and discarding it loses signal.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# One-hot is the safe default. High cardinality is what forces the alternatives.
`,
        language: 'python',
        tests: [
          { input: 'size 3 yes linear\n', expectedOutput: 'ordinal\none_hot=0' },
          { input: 'colour 3 no linear\n', expectedOutput: 'one_hot\none_hot=1' },
          { input: 'postcode 9000 no linear\n', expectedOutput: 'target\none_hot=0' },
          { input: 'postcode 9000 no tree\n', expectedOutput: 'frequency\none_hot=0' },
          { input: 'grade 5 yes tree\n', expectedOutput: 'ordinal\none_hot=0', isHidden: true },
          { input: 'city 50 no linear\n', expectedOutput: 'one_hot\none_hot=1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Feature Engineering Practice',
      description: 'Classify leakage, choose encodings, then engineer features for a real problem.',
      instructions: `Complete both exercises, then:

1. For the first: \`x no yes yes\` is \`target_leak\` although all three apply. Say why naming
   the most severe one is more useful than listing all three.
2. For the first: give a feature that is genuinely safe but that you would still hesitate to
   use, and say why.
3. For the second: the \`city 50\` case is \`one_hot\` because 50 is not above 50. Say whether
   a hard cardinality threshold is the right tool, and what you would use instead.
4. For the second: target encoding appears for high-cardinality linear cases. Say what must be
   true about how it is computed, and what happens if it is not.

**Then, on a real problem.** Any dataset with a target.

5. **Write the feature table**: every feature, where it comes from at serving time, when it
   becomes known, and how long it takes to compute.
6. Classify each for leakage using the exercise's rules. Report any that are not safe.
7. Engineer at least five domain features — a ratio, a deviation from a reference, a time
   since, a windowed count, and a flag.
8. Add them **one at a time**, measuring. Report the table: feature, score, change.
9. Report which single feature contributed most, and whether that matched your expectation.
10. Check availability at prediction time for every feature you kept.
11. Compute the feature vector for one input twice — once through your training path, once
    through a separate serving path. Compare element by element and report the result.`,
      rubric: [
        { criterion: 'Leakage classified', description: 'All cases, with the severity order respected.', maxPoints: 20 },
        { criterion: 'Encodings chosen', description: 'All cases, including the ordered-with-tree and the boundary.', maxPoints: 15 },
        { criterion: 'A real feature table', description: 'Source, timing and cost for every feature.', maxPoints: 20 },
        { criterion: 'Five domain features', description: 'One of each family, added and measured individually.', maxPoints: 20 },
        { criterion: 'The measured sequence', description: 'Feature, score and change per addition, with the largest identified.', maxPoints: 15 },
        { criterion: 'Train against serve compared', description: 'The same input through both paths, compared element by element.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'refund_amount yes yes no\n', expectedOutput: 'target_leak\nsafe=0' },
          { input: 'status_after no no no\n', expectedOutput: 'future_leak\nsafe=0' },
          { input: 'age yes no yes\n', expectedOutput: 'preprocessing_leak\nsafe=0' },
          { input: 'x no yes yes\ny yes no no\n', expectedOutput: 'target_leak\nsafe\nsafe=1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('Naming the most severe leak rather than listing all of them:',
        [['Tells you what to fix first and why the feature is unusable', true],
          ['Keeps the output shorter', false],
          ['Avoids double-counting the very same feature twice', false],
          ['Matches how libraries report it', false]],
        'A target-derived feature cannot be rescued by fixing the preprocessing.'),
      mcq('Target encoding is only safe when:',
        [['The means are computed within the training fold', true],
          ['The target is binary', false],
          ['The categories are high cardinality', false],
          ['It is combined with proper cross-validation', false]],
        'Otherwise it leaks by construction.'),
      mcq('An ordered category takes ordinal encoding even for a tree because:',
        [['The order is real information and discarding it loses signal', true],
          ['Trees require numeric inputs', false],
          ['One-hot would create too many columns', false],
          ['Trees cannot handle categorical features at all directly', false]],
        'Small, medium, large is genuinely ordered.'),
    ],
  },

  {
    unitCode: 'T3_ML_FEATURES_MINI_PROJECT',
    notes: `Engineer features for a real problem, hunt for leakage deliberately, and prove the
serving path matches the training path.

The brief's distinguishing requirement is **the deliberate leak**. You will plant one, measure
what it does to the score, and then find it with the detection method — because a student who
has seen leakage produce 0.99 will recognise it for the rest of their career.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Features, and the Leak You Planted',
      description: 'Engineer domain features, plant and detect a leak, and prove training and serving agree.',
      instructions: `**Choose** a real dataset with a target and enough columns that feature
work is meaningful.

**Part one — the feature table**

1. For every column: what it means, where it comes from at serving time, when it becomes known,
   and how long it takes to compute.
2. Classify each for leakage. **Report anything that is not safe and say what you did.**
3. Ask somebody — a classmate, a mentor, anyone with domain sense — about two columns whose
   timing you are unsure of. Report what you learned.

**Part two — the baseline and the honest features**

4. Split properly. Baseline. Report.
5. Engineer at least six domain features across the families: ratio, deviation, time since,
   windowed count, flag, interaction.
6. **Add them one at a time, measuring.** Report the table.
7. Report which contributed most and whether it matched your expectation.

**Part three — plant a leak**

8. **Deliberately add a leaking feature** — something derived from the target, or something
   from the future.
9. Retrain. **Report the score.**
10. Now find it with the method: feature importance, the availability question, remove and
    retrain. **Report what each step showed.**
11. Say how obvious it was, and whether you would have caught it in a table of eighty columns
    you had not assembled.

**Part four — encodings**

12. For every categorical column, say which encoding you chose and why.
13. If you used target encoding, show that it is computed inside the folds.
14. Handle unseen categories explicitly. **Show what happens when one arrives.**

**Part five — train against serve**

15. Write a separate serving path that computes features for a single new record.
16. **Compare the feature vector against the training path for the same record**, element by
    element. Report any differences.
17. If they differ, fix it by sharing the fitted object, and show them matching.

**Part six — report**

18. The feature table, final.
19. The measured sequence.
20. What the planted leak did, and how you found it.
21. One feature you decided not to use, and why.

**Submit** the feature table, the sequence, the leak experiment, and the train-serve
comparison.`,
      rubric: [
        { criterion: 'A complete feature table', description: 'Meaning, source, timing and cost for every column.', maxPoints: 20 },
        { criterion: 'Six domain features, measured', description: 'One per family, added individually with the change reported.', maxPoints: 20 },
        { criterion: 'The planted leak', description: 'Added, scored, and found by the three detection steps.', maxPoints: 25 },
        { criterion: 'Encodings justified', description: 'Each choice reasoned, target encoding inside folds, unseen handled.', maxPoints: 15 },
        { criterion: 'Train against serve', description: 'Vectors compared element by element, differences fixed by sharing.', maxPoints: 15 },
        { criterion: 'A feature rejected', description: 'One decided against, with the reason.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Planting a leak deliberately is valuable because:',
        [['Having seen it produce 0.99, you recognise it for the rest of your career', true],
          ['It validates the detection tooling', false],
          ['It measures how difficult the dataset really is to model', false],
          ['It tests the pipeline under stress', false]],
        'Recognition, not procedure.'),
      mcq('Asking somebody about two columns whose timing you are unsure of:',
        [['Is the cheapest leakage check available', true],
          ['Confirms the data dictionary is accurate', false],
          ['Is only useful for external data', false],
          ['Replaces the availability question', false]],
        'Ten seconds of their time for a day of yours.'),
      mcq('Comparing feature vectors element by element between paths:',
        [['Finds a train-serve mismatch before it costs months', true],
          ['Validates the encoding choices', false],
          ['Measures the serving latency', false],
          ['Confirms the saved model file loaded correctly', false]],
        'The failure produces no error and worse predictions, quietly.'),
    ],
  },
];
