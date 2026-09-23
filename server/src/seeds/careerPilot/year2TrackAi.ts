/**
 * T2_TRACK_AI — thirteen units. Year 2, direction track.
 *
 * ── WHAT THIS TRACK IS AND IS NOT ─────────────────────────────────────────────────────────
 *
 * This is applied machine learning for a second-year, not a mathematics course and not a tour of
 * architectures. The aim is a student who can say whether a problem needs a model at all, prepare
 * data without leaking the answer into it, train something simple, and evaluate it honestly enough
 * to know when it does not work.
 *
 * The recurring theme is that the modelling is the small part. Most of the work is data, most of
 * the failures are evaluation, and the most dangerous result is one that looks too good.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const AI_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_AI_WHAT_ML_IS',
    notes: `Machine learning finds patterns in examples instead of following rules somebody wrote. That
is the whole idea, and it tells you immediately when it is the wrong tool.

**Rules, when you can state them:**

    if order.total > 10_000 and customer.age_days < 7:
        flag_for_review(order)

**Learning, when you cannot:** you have 50,000 past orders, 400 of them fraudulent, and no rule that
separates them. A model finds the combination of signals that historically distinguished the two.

**When rules are better** — and this is most of the time:

- The logic is known and stable
- The decision must be explainable exactly
- You have little data
- Being wrong is expensive
- Somebody can write it down in an afternoon

**A model is worth considering when** the pattern is real but complicated, the inputs are many, the
rules would be endless, you have enough labelled examples, and being occasionally wrong is
acceptable.

**"Enough" is the question nobody asks first.** A few hundred examples is usually too few for
anything but the simplest model. A few thousand is a start. And they must be *labelled* — 50,000
orders with no record of which were fraudulent teaches nothing.

**What it cannot do:**

- Work without data
- Explain why, in the way a person means
- Predict something genuinely new, outside what it has seen
- Be right about an individual — it is right on average, which is not the same
- Remove bias in the data; it reproduces and often amplifies it

**The shapes it comes in:** supervised (labelled examples, the overwhelming majority of real work),
unsupervised (structure without labels, such as clustering), and reinforcement (learning from
feedback over time, rare outside research and games).

**The honest first question for any problem: could a rule do this?** If yes, write the rule. It is
faster, explainable, testable and maintainable — and choosing a model where a rule would do is the
commonest mistake at this level, usually because a model is more interesting.`,
    mcqs: [
      mcq('Machine learning is the wrong tool when:',
        [['The rule is known and can be written down', true],
          ['The dataset is very large', false],
          ['The pattern involves many inputs', false],
          ['Occasional errors are acceptable', false]],
        'Faster, explainable, testable and maintainable.'),
      mcq('A model is right:',
        [['On average, not in each case', true],
          ['For each individual prediction', false],
          ['Whenever its accuracy is high', false],
          ['Once it is trained on enough data', false]],
        'An important distinction when a prediction affects a person.'),
      mcq('50,000 orders with no record of which were fraudulent:',
        [['Cannot train a supervised model', true],
          ['Are enough for a simple classifier', false],
          ['Need only cleaning before use', false],
          ['Can be labelled by the model itself', false]],
        'Supervised learning needs labels, and they are the expensive part.'),
      mcq('A model given biased training data will:',
        [['Reproduce and often amplify it', true],
          ['Average the bias away', false],
          ['Flag it during evaluation', false],
          ['Be unaffected if the data is large', false]],
        'It learns what the data contains, including that.'),
    ],
    checkpoint: [
      mcq('The honest first question for any problem is:',
        [['Could a rule do this?', true],
          ['How much data is available?', false],
          ['Which algorithm suits it?', false],
          ['What accuracy is needed?', false]],
        'Choosing a model where a rule would do is the commonest mistake here.'),
      mcq('Most real machine learning work is:',
        [['Supervised, using labelled examples', true],
          ['Unsupervised clustering', false],
          ['Reinforcement learning', false],
          ['Split evenly between the three', false]],
        'Reinforcement learning is rare outside research and games.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_PROBLEM_TYPES',
    notes: `Before choosing anything else, name the shape of the problem. The shape decides the model,
the metric and what the data must contain.

| Shape | Predicts | Example |
|---|---|---|
| **Binary classification** | One of two labels | Will this customer churn? |
| **Multi-class** | One of several | Which of six categories is this? |
| **Multi-label** | Any number of labels | Which tags apply to this article? |
| **Regression** | A number | What will this house sell for? |
| **Ranking** | An order | Which results first? |
| **Clustering** | Groups, unlabelled | What natural segments exist? |
| **Anomaly detection** | Unusual cases | Which transactions look wrong? |

**Binary is the one to start with.** It is the easiest to evaluate, the easiest to explain, and a
surprising number of business questions are binary underneath: will they leave, will this fail, is
this fraudulent, should this be reviewed.

**Turning a vague question into a shape** is most of this unit:

    "Can we predict customer behaviour?"           — not a problem
    "Will this customer place another order
     within 90 days?"                              — binary classification

The second names the thing predicted, the outcome, and the window. Every one of those choices changes
the data you need.

**Regression when the magnitude matters.** "How much will they spend" is regression; "will they spend
more than 10,000" is classification, and it is a different and usually easier problem. Ask which
question is actually being asked, because people often say the first and want the second.

**Clustering has no right answer**, which surprises people. There is no label to check against, so
the output is a hypothesis for a human to interpret, not a result.

**Anomaly detection is not classification with rare labels.** If you have labelled examples of the
unusual class, that is classification. Anomaly detection is for when you only know what normal looks
like.

**Ask what decision the prediction supports.** A prediction nobody acts on is an expensive hobby. If
the answer is "we would email them a discount", then the model needs to be right about who is
*borderline*, not about who was obviously going to stay.`,
    mcqs: [
      mcq('"Will this customer order again within 90 days?" is:',
        [['Binary classification, with a window', true],
          ['Regression', false],
          ['Clustering', false],
          ['Ranking', false]],
        'It names the subject, the outcome and the window.'),
      mcq('Clustering differs from classification in that it:',
        [['It has no right answer', true],
          ['Uses more data', false],
          ['Predicts a number', false],
          ['Requires balanced classes', false]],
        'The output is a hypothesis, not a result.'),
      mcq('"How much will they spend" versus "will they spend over 10,000" are:',
        [['Regression and classification', true],
          ['Two forms of regression', false],
          ['Two forms of classification', false],
          ['Ranking and regression', false]],
        'People often say the first and want the second.'),
      mcq('Anomaly detection is used when you:',
        [['Only know what normal looks like', true],
          ['Have rare labelled examples', false],
          ['Need to rank unusual cases', false],
          ['Have unbalanced classes', false]],
        'With labelled unusual examples it is classification.'),
    ],
    checkpoint: [
      mcq('Binary classification is the best starting shape because:',
        [['It is easiest to evaluate and explain', true],
          ['It needs the least data', false],
          ['It trains fastest', false],
          ['It suits every business question', false]],
        'And many business questions are binary underneath.'),
      mcq('Asking what decision the prediction supports tells you:',
        [['Which cases must be right', true],
          ['Which algorithm to choose', false],
          ['How much data is needed', false],
          ['How often to retrain', false]],
        'A discount email needs accuracy on the borderline cases.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_FEATURES_LABELS',
    notes: `A model is given **features** and asked for a **label**. Choosing them well matters more
than the algorithm, and it is where domain knowledge earns its place.

    features: orders_last_90d, days_since_last_order, avg_order_value, support_tickets
    label:    churned_within_90d   (True / False)

**Good features carry signal the model cannot derive.** \`days_since_last_order\` is far more useful
than a raw timestamp, because it encodes the thing that matters. Turning a date into "days since",
"day of week" and "is a holiday" is feature engineering, and it often beats a better algorithm.

**Every feature must be available at prediction time.** This is the rule beginners break most:

    # available when predicting
    orders_last_90d, days_since_signup, plan_type

    # NOT available — these are known only afterwards
    cancellation_reason, refund_issued, final_lifetime_value

Training on a feature you will not have is how a model scores 99% and is useless in production.

**Where labels come from, and what each costs:**

- **Recorded outcomes** — the cheapest and best. The customer did or did not return.
- **Human labelling** — expensive, slow, and inconsistent between labellers.
- **Proxies** — using something correlated because the real label is unavailable. Always a
  compromise, and always worth stating.

**The proxy trap**, worth naming: predicting "who will be arrested" as a proxy for "who commits
crime", or "who was promoted" for "who performs well". The proxy carries every bias in the process
that produced it, and the model then learns that process rather than the thing you meant.

**Define the label precisely.** "Churned" means what — cancelled, or inactive for 90 days, or
inactive for 180? Each definition produces a different dataset, a different model and a different
number. Write it down.

**Time is part of the definition.** Features come from before a cut-off; the label comes from after
it. Mixing that up is leakage, which the next unit is largely about.

**Fewer good features beat many weak ones** at this level. Twelve features you can explain will
outperform two hundred you cannot, and you will be able to tell why it is wrong when it is.`,
    mcqs: [
      mcq('Every feature must be:',
        [['Available at prediction time', true],
          ['Numeric and scaled', false],
          ['Correlated with the label', false],
          ['Present in every row', false]],
        'Training on a feature you will not have is how a model scores 99% and is useless.'),
      mcq('Turning a timestamp into "days since last order" is:',
        [['Feature engineering', true],
          ['Data cleaning', false],
          ['Normalisation', false],
          ['Label definition', false]],
        'It encodes the thing that actually matters.'),
      mcq('Using "who was promoted" as a label for "who performs well" is:',
        [['A proxy carrying the bias behind it', true],
          ['A reasonable and unbiased substitute', false],
          ['Unsupervised learning', false],
          ['A form of data leakage', false]],
        'The model learns the promotion process, not performance.'),
      mcq('The definition of "churned" matters because:',
        [['Each definition gives a different dataset', true],
          ['It affects the algorithm choice', false],
          ['Labels must be binary', false],
          ['It determines the training time', false]],
        'Cancelled, inactive 90 days and inactive 180 days are three problems.'),
    ],
    checkpoint: [
      mcq('At this level, twelve explainable features usually beat:',
        [['Two hundred you cannot explain', true],
          ['Six carefully chosen ones', false],
          ['A more advanced algorithm', false],
          ['A larger training set', false]],
        'And you can tell why it is wrong when it is.'),
      mcq('In a time-based problem, features come from:',
        [['Before the cut-off, and the label from after', true],
          ['The same period as the label', false],
          ['After the cut-off, like the label', false],
          ['Any period, if the data is shuffled', false]],
        'Mixing that up is leakage.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_DATA_PREPARATION',
    notes: `Most of the work, most of the failures, and the one mistake that invalidates everything.

**Leakage is information about the answer reaching the model.** It produces excellent scores and a
model that fails completely in production, and it is the defining failure of this track.

**The forms it takes:**

**A feature that encodes the outcome.** \`cancellation_date\` when predicting cancellation.
Obvious afterwards, easy to miss in a table of ninety columns.

**Scaling or imputing before splitting.** Computing the mean over the whole dataset and then
splitting means your training set has seen the test set. Fit on train, apply to test:

    scaler.fit(X_train)            # learn from train only
    X_train = scaler.transform(X_train)
    X_test  = scaler.transform(X_test)

**Time travel.** Using any value recorded after the prediction point. In a time-series problem, a
random split lets the model learn from the future, and the score is meaningless.

**Duplicates across the split.** The same customer in both train and test means the model has
memorised them.

**Target encoding without care** — replacing a category with the mean of its label — leaks directly
unless computed within folds.

**The rule: anything learned from data must be learned from the training set only.** Means, scalers,
encoders, imputers, vocabulary, selected features — all of them.

**The ordinary preparation**, in order:

    1. Clean          — same rules as the data track; log it
    2. Split          — before anything else is fitted
    3. Encode         — categories to numbers
    4. Scale          — if the model needs it
    5. Handle missing — impute with values learned from train

**Encoding categories:** one-hot for a few unordered values, ordinal only when the order is real
(small/medium/large), and for high-cardinality columns consider grouping the rare values into
"other".

**Scaling matters for some models and not others.** Distance-based methods and neural networks need
it; tree-based ones do not care.

**If your first result is excellent, assume leakage.** A model that scores 99% on a real problem is
almost always reading the answer. Go and look for it before you tell anybody.`,
    mcqs: [
      mcq('Leakage is:',
        [['The answer reaching the model', true],
          ['Data lost during the split', false],
          ['Memory growing during training', false],
          ['Test data being too small', false]],
        'It produces excellent scores and a useless model.'),
      mcq('Scaling should be fitted on:',
        [['The training set only, then applied to test', true],
          ['The whole dataset before splitting', false],
          ['Each split independently', false],
          ['The test set, to match production', false]],
        'Anything learned from data is learned from train only.'),
      mcq('A random split in a time-series problem:',
        [['Lets the model learn from the future', true],
          ['Balances the classes correctly', false],
          ['Reduces variance in the estimate', false],
          ['Is standard practice', false]],
        'The resulting score is meaningless.'),
      mcq('An excellent first result should be treated as:',
        [['Probable leakage, until checked', true],
          ['Evidence the features are strong', false],
          ['A reason to simplify the model', false],
          ['A good baseline to report', false]],
        'Go and look for it before telling anybody.'),
    ],
    checkpoint: [
      mcq('Ordinal encoding is appropriate when:',
        [['The order is real, like small to large', true],
          ['There are many categories', false],
          ['The model is tree-based', false],
          ['One-hot would create too many columns', false]],
        'Imposing an order that does not exist misleads the model.'),
      mcq('Scaling is unnecessary for:',
        [['Tree-based models', true],
          ['Distance-based models', false],
          ['Neural networks', false],
          ['Linear models with regularisation', false]],
        'They split on thresholds, not distances.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_TRAIN_TEST',
    notes: `Splitting data properly is what makes a result mean anything. Done wrong, every number
afterwards is decoration.

**Why any split at all.** A model evaluated on data it trained on is being asked to recall, not to
predict, and it can score perfectly by memorising. The test set answers a different question: how
does this do on examples it has never seen?

**The three-way split:**

    Train (60-70%)       — the model learns from this
    Validation (15-20%)  — you tune and choose using this
    Test (15-20%)        — touched once, at the very end

**The test set is sacred.** Every time you look at it and change something, it becomes part of your
training process. Check it once, report that number, and stop. A test score you have optimised
against is a validation score wearing a disguise.

**Stratify for classification**, so each split has the same class proportions. With 2% positives, a
random split can give a test set with almost none, and the resulting score is noise.

**Split by time for anything temporal.** Train on January to September, test on October to December
— exactly as it will be used. A random split on time-series data is leakage, and it flatters the
model badly.

**Split by group where rows are not independent.** Several rows per customer means the same customer
can appear on both sides; group-aware splitting keeps each customer wholly in one.

**Cross-validation** when data is scarce: five folds, each serving as validation once, and the
average is a more stable estimate than one small split. It costs five times the training, which is
usually affordable at this scale.

**Never split after balancing.** Oversampling the minority class and then splitting puts copies of
the same rows in both sides. Split first, then balance the training set only.

**Keep a holdout you have never touched** for the final honest number, and write down its score
alongside the date and the exact code that produced it.`,
    mcqs: [
      mcq('A model evaluated on its training data is being asked to:',
        [['Recall, rather than predict', true],
          ['Generalise beyond its examples', false],
          ['Estimate its own uncertainty', false],
          ['Handle unseen categories', false]],
        'It can score perfectly by memorising.'),
      mcq('The test set should be examined:',
        [['Once, at the very end', true],
          ['After every tuning round', false],
          ['Whenever validation improves', false],
          ['At each training epoch', false]],
        'A test score you optimised against is a validation score in disguise.'),
      mcq('Stratified splitting matters most when:',
        [['One class is rare', true],
          ['The dataset is very large', false],
          ['Features are correlated', false],
          ['The model is tree-based', false]],
        'With 2% positives a random test set can contain almost none.'),
      mcq('Balancing the classes should happen:',
        [['After splitting, on the training set only', true],
          ['Before splitting, on the whole dataset', false],
          ['On both training and test sets', false],
          ['Only during cross-validation', false]],
        'Otherwise copies of the same rows appear on both sides.'),
    ],
    checkpoint: [
      mcq('Rows that are not independent, such as several per customer, require:',
        [['Group-aware splitting', true],
          ['Stratified splitting', false],
          ['A larger test set', false],
          ['Random shuffling first', false]],
        'Otherwise the same customer appears on both sides.'),
      mcq('Cross-validation is used mainly when:',
        [['Data is scarce', true],
          ['The model is slow to train', false],
          ['Classes are imbalanced', false],
          ['The test set is unavailable', false]],
        'The average across folds is a steadier estimate.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_REGRESSION',
    notes: `Predicting a number. Linear regression is the right first model, and understanding it well
explains a great deal about everything above it.

    from sklearn.linear_model import LinearRegression

    model = LinearRegression().fit(X_train, y_train)
    preds = model.predict(X_test)

**What it learned:**

    model.coef_          # one weight per feature
    model.intercept_     # the baseline

**Reading the coefficients** is the reason to start here. A coefficient of 1,200 on \`bedrooms\`
means: holding everything else constant, an extra bedroom is associated with 1,200 more. That is an
explainable model, and explainability matters more than a small accuracy gain in most real
applications.

**"Holding everything else constant" is doing work in that sentence.** Coefficients are only
interpretable when features are not strongly correlated with each other. When they are, the weights
split arbitrarily between them and reading one alone is misleading.

**Compare coefficients only on scaled features.** Otherwise a weight on "square feet" and a weight on
"number of rooms" are in different units and cannot be ranked.

**Measuring it:**

| Metric | Means |
|---|---|
| **MAE** | Average error, in the units of the thing. The one to report to people. |
| **RMSE** | Like MAE but punishing large errors more |
| **R²** | Share of variance explained; 0 is no better than the mean |

**MAE is what a non-technical audience should hear.** "On average we are ₹18,000 out" is
understandable; "R² of 0.72" is not.

**Always compare against a baseline.** Predicting the mean every time gives you a number; if your
model cannot beat it convincingly, it is not working. Reporting a metric without a baseline is the
commonest way a weak model looks acceptable.

**Look at the residuals**, not only the score. Plot error against the prediction: a pattern there
means something systematic is being missed — often a non-linear relationship, or a group the model
handles badly.

**Where the errors are matters as much as their size.** A model that is accurate in the middle and
badly wrong at the extremes may be useless if the extremes are the cases you care about.`,
    mcqs: [
      mcq('The reason to start with linear regression is that:',
        [['Its coefficients can be read and explained', true],
          ['It is the most accurate simple model', false],
          ['It needs no data preparation', false],
          ['It handles non-linear patterns', false]],
        'Explainability beats a small accuracy gain in most applications.'),
      mcq('Coefficients are only interpretable when features are:',
        [['Not correlated with each other', true],
          ['All positive', false],
          ['Normally distributed', false],
          ['Binary or categorical', false]],
        'Otherwise the weights split arbitrarily between them.'),
      mcq('The metric to report to a non-technical audience is:',
        [['MAE, in the units of the thing', true],
          ['R², as a percentage', false],
          ['RMSE, which punishes large errors', false],
          ['The training loss', false]],
        '"On average we are 18,000 out" is understandable.'),
      mcq('Reporting a metric without a baseline:',
        [['Lets a weak model look acceptable', true],
          ['Is standard for regression', false],
          ['Understates the model\'s value', false],
          ['Only matters for classification', false]],
        'Predicting the mean every time is the baseline to beat.'),
    ],
    checkpoint: [
      mcq('Plotting residuals against predictions reveals:',
        [['Systematic patterns being missed', true],
          ['The overall error magnitude', false],
          ['Whether the data was scaled', false],
          ['Which features matter most', false]],
        'Often a non-linear relationship or a badly handled group.'),
      mcq('An R² of 0 means the model is:',
        [['No better than predicting the mean', true],
          ['Perfectly accurate', false],
          ['Completely wrong on every case', false],
          ['Overfitted to the training data', false]],
        'Which is why a baseline comparison matters.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_CLASSIFICATION',
    notes: `Predicting a category. Logistic regression first, for the same reason as before: you can
see what it learned.

    from sklearn.linear_model import LogisticRegression

    model = LogisticRegression(max_iter=1000).fit(X_train, y_train)
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

**The model outputs a probability, not a class.** \`predict\` applies a threshold of 0.5 for you, and
that default is a decision you should be making yourself.

**The threshold is a business choice, not a technical one.** For fraud review, a low threshold
catches more fraud and creates more false alarms. For a costly intervention, a high threshold acts
only when confident. Ask what each kind of mistake costs, then pick.

**Reading probabilities is more useful than reading classes.** A customer at 0.51 and one at 0.97 are
treated identically by \`predict\` and are entirely different cases. Rank by probability and act on
the top slice.

**Class imbalance is the normal condition**, and it breaks the obvious metric. With 2% fraud, a model
predicting "not fraud" every time is 98% accurate and completely worthless. Which is why the next
unit exists.

**What to do about imbalance:**

- **\`class_weight="balanced"\`**, which is usually the first and best thing to try
- **Oversampling the minority** in the training set only
- **Undersampling the majority**, which throws away data
- **Changing the threshold**, which is often enough on its own

**Multi-class** works the same way, with a probability per class and the highest winning. Look at
which classes get confused with which — that is usually more informative than the overall number,
and often points at a labelling problem rather than a modelling one.

**When linear models are not enough**, tree-based ensembles — random forests, gradient boosting — are
the usual next step for tabular data, and they remain the strongest choice for it. They need less
preparation and give feature importances, at the cost of the clean interpretability you had.

**Start simple anyway.** A logistic regression baseline tells you whether the problem is learnable at
all, and if a complicated model barely beats it, the complexity is not paying for itself.`,
    mcqs: [
      mcq('A classifier actually outputs:',
        [['A probability, converted by a threshold', true],
          ['A class label directly', false],
          ['A confidence interval', false],
          ['A distance from the boundary', false]],
        'The default 0.5 is a decision you should be making.'),
      mcq('The classification threshold should be chosen by:',
        [['What each kind of mistake costs', true],
          ['Maximising overall accuracy', false],
          ['The class balance in the data', false],
          ['The model\'s calibration curve', false]],
        'It is a business choice, not a technical one.'),
      mcq('With 2% positives, a model predicting the majority every time is:',
        [['98% accurate and worthless', true],
          ['Correctly identifying the base rate', false],
          ['A reasonable baseline to deploy', false],
          ['Underfitted but usable', false]],
        'Which is why accuracy is the wrong metric here.'),
      mcq('The first thing to try for class imbalance is usually:',
        [['class_weight="balanced"', true],
          ['Undersampling the majority', false],
          ['Collecting more data', false],
          ['A more complex model', false]],
        'Changing the threshold is often enough too.'),
    ],
    checkpoint: [
      mcq('Two predictions at 0.51 and 0.97 are:',
        [['Different cases, treated identically', true],
          ['Equally likely to be correct', false],
          ['Both below the useful threshold', false],
          ['Indistinguishable without calibration', false]],
        'Rank by probability and act on the top slice.'),
      mcq('If a complex model barely beats logistic regression:',
        [['The complexity is not paying for itself', true],
          ['The data needs more features', false],
          ['The baseline was computed wrongly', false],
          ['More training time is needed', false]],
        'Start simple to find out whether the problem is learnable.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_EVALUATION',
    notes: `Choosing the wrong measure is how a useless model gets deployed. This is the most
important unit in the track.

**Accuracy lies whenever classes are imbalanced**, which is most of the time in anything worth
predicting.

**The confusion matrix shows what actually happened:**

                    Predicted No    Predicted Yes
    Actually No     TN = 9,500      FP = 300
    Actually Yes    FN = 150        TP = 50

**The two metrics that matter, and the difference between them:**

- **Precision** = TP / (TP + FP) = 50/350 = **14%**. Of those we flagged, how many were real?
- **Recall** = TP / (TP + FN) = 50/200 = **25%**. Of the real ones, how many did we catch?

**Which one matters depends entirely on the cost of each error:**

| Situation | Optimise | Because |
|---|---|---|
| Screening for a serious disease | Recall | Missing a case is far worse than a further test |
| Flagging emails as spam | Precision | A lost real email is worse than a spam that got through |
| Fraud review with limited staff | Precision | Every false positive wastes a person's time |
| Safety inspection | Recall | Missing a fault is unacceptable |

**They trade against each other**, and the threshold is the dial. Higher threshold, higher precision
and lower recall. There is no setting that improves both.

**F1 is their harmonic mean**, useful as a single number when both matter roughly equally — and
misleading when they do not.

**ROC-AUC measures ranking ability** across all thresholds, and it is optimistic on heavily imbalanced
data. Precision-recall curves are the better choice there.

**For regression, the equivalent question is where the errors are.** An average error of 5% that is
10% on your largest customers is not a 5% model for the purpose it will be used for.

**Always state the baseline.** "84% accurate" means nothing without knowing that always guessing the
majority gives 82%.

**And evaluate on the decision, not the metric.** If the model flags 300 cases a week and the team
can review 50, then what matters is the precision of the top 50 — which is a different number from
anything in the standard report.`,
    mcqs: [
      mcq('Precision answers:',
        [['Of those we flagged, how many were real?', true],
          ['Of the real ones, how many did we catch?', false],
          ['How often the model is correct overall', false],
          ['How well the model ranks cases', false]],
        'Recall is the second one.'),
      mcq('Screening for a serious disease should optimise:',
        [['Recall', true], ['Precision', false], ['Accuracy', false], ['F1', false]],
        'Missing a case is far worse than an extra test.'),
      mcq('Precision and recall:',
        [['Trade against each other via the threshold', true],
          ['Can both be improved by tuning', false],
          ['Are equivalent for balanced data', false],
          ['Measure the same thing differently', false]],
        'There is no setting that improves both.'),
      mcq('ROC-AUC is misleading when:',
        [['Classes are heavily imbalanced', true],
          ['The model outputs classes only', false],
          ['There are more than two classes', false],
          ['The test set is small', false]],
        'Precision-recall curves are the better choice there.'),
    ],
    checkpoint: [
      mcq('"84% accurate" is uninformative without:',
        [['The baseline for comparison', true],
          ['The size of the training set', false],
          ['The algorithm used', false],
          ['The number of features', false]],
        'Always guessing the majority might give 82%.'),
      mcq('If the team can review 50 of 300 flagged cases, what matters is:',
        [['The precision of the top 50', true],
          ['The overall recall', false],
          ['The F1 score', false],
          ['The ROC-AUC', false]],
        'Evaluate on the decision, not the standard report.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_OVERFITTING',
    notes: `Overfitting is a model learning the noise in its training data rather than the pattern.
It is visible in numbers rather than opinions, which makes it one of the more tractable problems
here.

**What it looks like:**

    Training accuracy:   0.99
    Validation accuracy: 0.71

A large gap means memorisation. The model has learned details specific to those rows — including
random noise — that do not generalise.

**Underfitting is the opposite**, and equally visible:

    Training accuracy:   0.68
    Validation accuracy: 0.67

Both poor and close together: the model is too simple, or the features do not carry the signal.

**What causes overfitting:** a model too complex for the data, too many features relative to rows,
training too long, and too little data.

**What to do, in order of what to try first:**

1. **More data**, if you can get it. Always the best answer and usually unavailable.
2. **Fewer features**, especially ones you cannot justify.
3. **A simpler model**, or a shallower tree.
4. **Regularisation** — a penalty on large weights, which is what \`C\` in scikit-learn controls.
5. **Early stopping**, for iterative models: stop when validation stops improving.

**The bias-variance idea**, in the version worth carrying: a model too simple misses the pattern
(bias); a model too complex learns the noise (variance). The best model is between them, and you find
it by measuring, not by reasoning.

**Watching the two curves together** is the whole diagnostic. As complexity rises, training error
falls steadily and validation error falls and then rises. That turning point is where the model is.

**The subtler version: overfitting to the validation set.** Tune thirty times against the same
validation split and you have fitted the tuning to that split. This is why the test set exists and
why it is touched once.

**And overfitting to the dataset itself.** A model tuned over months to one benchmark can perform
worse in the real world than a simpler one nobody polished, because the benchmark stopped
representing the problem some time ago.`,
    mcqs: [
      mcq('Training accuracy 0.99 with validation 0.71 indicates:',
        [['Overfitting', true], ['Underfitting', false], ['Leakage', false], ['Class imbalance', false]],
        'The model memorised details that do not generalise.'),
      mcq('Both training and validation scores being low and close means:',
        [['The model is too simple for the data', true],
          ['The model is overfitting', false],
          ['The split was done badly', false],
          ['Regularisation is too weak', false]],
        'That is underfitting: the model is not capturing the pattern.'),
      mcq('The best remedy for overfitting, when available, is:',
        [['More data', true],
          ['Stronger regularisation', false],
          ['A simpler model', false],
          ['Early stopping', false]],
        'Always the best answer and usually unavailable.'),
      mcq('Tuning thirty times against one validation split causes:',
        [['Overfitting to the validation set', true],
          ['Underfitting the training data', false],
          ['Leakage from the test set', false],
          ['Unstable coefficients', false]],
        'Which is why the test set is touched once.'),
    ],
    checkpoint: [
      mcq('As model complexity rises, validation error typically:',
        [['Falls and then rises', true],
          ['Falls steadily', false],
          ['Rises steadily', false],
          ['Stays flat then falls', false]],
        'The turning point is where the model should be.'),
      mcq('A model tuned for months against one benchmark may:',
        [['Do worse in the world than a simpler one', true],
          ['Generalise better than an untuned model', false],
          ['Be safe from overfitting', false],
          ['Require less validation data', false]],
        'The benchmark may have stopped representing the problem.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_RESPONSIBLE_AI',
    notes: `A model that affects people is not only a technical artefact. This unit is short and it is
the one that will matter most in your career.

**Models learn from the past, including its unfairness.** A hiring model trained on who was hired
learns who that organisation hired, with every bias that involved. A lending model trained on past
approvals learns past approval patterns. Neither model is neutral; both are the historical process,
automated and scaled.

**Removing the sensitive attribute does not remove the bias.** Drop gender and the model uses
correlated proxies — the institution attended, the area of residence, an activity, a name.
Correlation is enough, and the resulting discrimination is harder to see because nothing names it.

**Measure fairness across groups, do not assume it.** Compute your metrics separately per group:

    Accuracy overall:        0.87
    Accuracy, group A:       0.91
    Accuracy, group B:       0.62

That model is not 87% accurate for anybody in group B, and an overall number concealed it entirely.
Usually the cause is underrepresentation in the training data.

**Fairness has several definitions and they conflict mathematically.** Equal accuracy per group,
equal false positive rates, and equal selection rates cannot generally all hold at once. Choosing
which one matters here is a judgement about the situation, and it must be made explicitly rather than
by default.

**Where models should not decide alone:** anything affecting liberty, livelihood, health or access to
essential services. A model may inform those; a person accountable for the outcome should decide
them.

**Explainability is a requirement in many contexts.** "The model said so" is not an acceptable reason
to refuse someone a loan, and in several jurisdictions there is a legal right to an explanation.

**Monitor after deployment.** The world changes, the data changes with it, and a model that was fair
and accurate at launch drifts. A model nobody is watching is an unexamined decision being made
thousands of times.

**Your professional obligation:** say so when something is not ready, when the data is not
representative, or when a model should not be used for a purpose. You will be the person who knows,
and often the only one.`,
    mcqs: [
      mcq('A hiring model trained on past hiring learns:',
        [['That organisation\'s historical biases', true],
          ['An objective measure of merit', false],
          ['The requirements of each role', false],
          ['Patterns corrected for bias', false]],
        'The historical process, automated and scaled.'),
      mcq('Removing a sensitive attribute:',
        [['Does not remove bias, as proxies remain', true],
          ['Makes the model fair by construction', false],
          ['Is required by most regulations', false],
          ['Reduces accuracy without benefit', false]],
        'Area, institution and name can all stand in for it.'),
      mcq('Fairness definitions such as equal accuracy and equal false positive rates:',
        [['Conflict, and cannot generally all hold', true],
          ['Are equivalent in practice', false],
          ['Can all be satisfied with enough data', false],
          ['Apply only to binary classifiers', false]],
        'Choosing which matters must be explicit.'),
      mcq('An overall accuracy of 0.87 can conceal:',
        [['Accuracy of 0.62 for one group', true],
          ['Overfitting to the training set', false],
          ['A leaked feature', false],
          ['An unbalanced test split', false]],
        'Compute metrics per group rather than assuming.'),
    ],
    checkpoint: [
      mcq('Decisions affecting liberty, livelihood or health should be:',
        [['Informed by a model, decided by a person', true],
          ['Automated for consistency', false],
          ['Made by the model with an appeal process', false],
          ['Delegated where accuracy is high enough', false]],
        'A model may inform them; a person should decide.'),
      mcq('A deployed model needs monitoring because:',
        [['The world changes and the model drifts', true],
          ['Accuracy degrades with use', false],
          ['Retraining is required periodically', false],
          ['Regulations require audit logs', false]],
        'An unwatched model is an unexamined decision made thousands of times.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_DEBUGGING',
    notes: `Machine learning fails quietly. The code runs, a number appears, and the number is wrong.
These are the shapes.

**The result is suspiciously good.** Leakage, nearly always. Look for a feature that encodes the
outcome, preprocessing fitted before the split, duplicate rows across the split, or a time-series
split done randomly. **Assume this before celebrating.**

**Training score high, validation low.** Overfitting. Simpler model, fewer features, more
regularisation, more data.

**Both scores low.** Underfitting, or the features genuinely do not predict the label. Check a
baseline first: if a trivial rule does as well, the problem may not be learnable from this data.

**It works in the notebook and fails in production.** The commonest causes are a preprocessing step
applied in training and not at inference, a feature computed differently, a category never seen
before, or a column order that changed.

**Accuracy is high and the model is useless.** Class imbalance. Look at the confusion matrix, not the
headline.

**Results change between runs.** No random seed set. Set one for the split, the model and any
shuffling, and record it — without it you cannot reproduce your own result.

**One class is never predicted.** Severe imbalance, or a threshold that no case reaches. Check the
predicted probability distribution.

**Performance degrades over time in production.** Drift: the input distribution has moved, or the
relationship has. This is expected rather than a defect, and it is why monitoring exists.

**The checks to run, in order:**

    y_train.value_counts()              # what is the balance
    X_train.shape, X_test.shape         # did the split do what you think
    model.predict(X_train[:5])          # does it work at all on known rows
    pd.Series(model.coef_, index=cols)  # which features dominate
    confusion_matrix(y_test, preds)     # what kind of errors

**A feature with an implausibly large coefficient or importance is the leakage signature.** When one
feature dominates everything, ask what it is and whether you would truly have it at prediction time.
That single question catches most of the serious failures in this track.`,
    mcqs: [
      mcq('A suspiciously good result should be investigated as:',
        [['Leakage, before anything else', true],
          ['A strong feature set', false],
          ['An easy problem', false],
          ['Overfitting to the training data', false]],
        'Assume it before celebrating.'),
      mcq('A model that works in the notebook and fails in production usually has:',
        [['A preprocessing step missed', true],
          ['Too few training examples', false],
          ['An overfitted hyperparameter', false],
          ['A corrupted model file', false]],
        'Or a feature computed differently, or a changed column order.'),
      mcq('Results changing between runs means:',
        [['No random seed was set', true],
          ['The data is being reshuffled by the model', false],
          ['The model has not converged', false],
          ['The test set is too small', false]],
        'Without one you cannot reproduce your own result.'),
      mcq('One feature dominating all importances is:',
        [['The signature of leakage', true],
          ['Evidence of a strong predictor', false],
          ['Normal for tree models', false],
          ['A sign of correlated features', false]],
        'Ask whether you would truly have it at prediction time.'),
    ],
    checkpoint: [
      mcq('High accuracy with a useless model points at:',
        [['Class imbalance', true],
          ['Overfitting', false],
          ['A bad split', false],
          ['Poor feature scaling', false]],
        'Look at the confusion matrix, not the headline.'),
      mcq('Performance degrading in production over time is:',
        [['Drift, which is expected', true],
          ['A sign of a training bug', false],
          ['Caused by model file corruption', false],
          ['Evidence of overfitting', false]],
        'Which is why deployed models are monitored.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_PRACTICE',
    notes: `No new ideas. Build models on real data until the checks are automatic and a good result
makes you suspicious rather than pleased.

**Use real datasets with real problems** — public data with missing values, imbalance and ambiguity.
Curated teaching sets remove exactly what this track is about.

**Do these:**

1. **A baseline first, every time.** Before any model, compute the score of predicting the majority
   or the mean. Record it beside every result you report.
2. **Cause leakage deliberately.** Include a feature that encodes the outcome, observe the excellent
   score, remove it, and record the difference. That contrast is the lesson.
3. **Compare split strategies.** Random against time-based on temporal data. Report both and explain
   the gap.
4. **Tune the threshold.** Take a classifier and produce the precision-recall curve. Choose a
   threshold for a stated business cost and justify it.
5. **Measure fairness.** Compute your metric per group on a dataset with demographic columns. Report
   what you find, including if it is uncomfortable.
6. **Overfit on purpose.** Train a deep tree until training accuracy is 1.0, watch validation fall,
   then regularise it back.
7. **Engineer features.** Take a dataset and improve the score with feature engineering alone, no
   model change. Record which features helped.
8. **Predict on something new.** Save a model, load it in a separate script, and predict on fresh
   rows — including one with an unseen category.

**Record for each:** the baseline, the result, and what you checked before believing it.

**The habit this set exists to build:** when a result is good, look for the reason it might be wrong
before you look for somewhere to report it.`,
    mcqs: [
      mcq('A baseline should be computed:',
        [['Before any model, and reported with it', true],
          ['After the first model, for comparison', false],
          ['Only when the model underperforms', false],
          ['Once per dataset, at the end', false]],
        'Predicting the majority or the mean.'),
      mcq('Deliberately causing leakage teaches you:',
        [['What a wrong-but-excellent score feels like', true],
          ['Which features to avoid generally', false],
          ['How to detect it automatically', false],
          ['That leakage improves accuracy', false]],
        'The contrast before and after is the lesson.'),
      mcq('Comparing random and time-based splits on temporal data shows:',
        [['How much the random split flatters', true],
          ['Which split trains faster', false],
          ['Whether the data is stationary', false],
          ['The optimal test set size', false]],
        'Report both and explain the gap.'),
      mcq('Improving a score with feature engineering alone demonstrates:',
        [['That features often matter most', true],
          ['That the model was badly chosen', false],
          ['That the data needed cleaning', false],
          ['That more data was required', false]],
        'Record which features helped and why.'),
      mcq('Predicting on a row with an unseen category tests:',
        [['Whether the pipeline survives real input', true],
          ['The model\'s accuracy on rare classes', false],
          ['Whether the encoder was fitted correctly', false],
          ['The quality of the training data', false]],
        'This is where notebook models fail in production.'),
    ],
    checkpoint: [
      mcq('Measuring fairness per group should be reported:',
        [['Even when it is uncomfortable', true],
          ['Only when a disparity is found', false],
          ['Only for regulated applications', false],
          ['After the model is deployed', false]],
        'An overall number conceals it entirely.'),
      mcq('The reflex these exercises are meant to build is:',
        [['Suspicion of a good result', true],
          ['Faster model iteration', false],
          ['Preference for simpler algorithms', false],
          ['Thorough hyperparameter search', false]],
        'Look for the reason it might be wrong first.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_AI_MINI_PROJECT',
    notes: `A complete machine learning project on real data, evaluated honestly, with the
uncomfortable findings reported rather than smoothed away.

**Why honesty is the assessment.** Producing a model is a tutorial. Knowing whether it works, what it
would cost when wrong, who it treats badly, and whether it should be used at all — that is the job,
and it is what separates somebody employable from somebody who can follow an example.

**What is being assessed:** that leakage was actively hunted rather than hoped against, that the
baseline is stated, that the metric matches the decision, that fairness was measured, and that the
limitations are honest.

**Build it in this order:**

1. **The problem**, stated as a shape, with the decision it supports and the cost of each error.
2. **The data**, understood: grain, gaps, what is available at prediction time.
3. **The split**, before any fitting, chosen for the problem.
4. **A baseline**, recorded.
5. **A simple model**, evaluated properly.
6. **Improvement**, measured against the baseline at every step.
7. **The honest report**: what works, what does not, and what you would not deploy.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Model You Can Be Honest About',
      description: 'Build and evaluate a machine learning model on real data, with leakage hunted, fairness measured, and the limitations reported rather than smoothed away.',
      instructions: `**The brief**

Take a **real dataset** of at least 5,000 rows and build a model that supports a genuine decision.
Public data, competition data used outside the competition, or data you collect.

The problem must be one where you can say what decision the prediction supports and what each kind of
error costs.

**Requirements**

1. **A problem statement**: the shape, the label defined precisely, the decision supported, and the
   cost of a false positive and a false negative.
2. **A data note**: grain, size, class balance, missing data, and confirmation that every feature is
   available at prediction time.
3. **A split chosen for the problem** — time-based, group-aware or stratified as appropriate, with
   the reason stated, performed before any fitting.
4. **A baseline** score, reported alongside every later result.
5. **A simple model first**, evaluated, before anything more complex.
6. **A leakage hunt**: a written check of every feature against the outcome, plus the feature
   importance review, and what you found.
7. **The metric chosen to match the decision**, justified, with a confusion matrix and a
   threshold selected for the stated costs.
8. **Fairness measured** across at least one meaningful grouping, with the result reported whatever
   it is.
9. **An overfitting check**: training against validation scores at more than one complexity.
10. **A reusable pipeline**: preprocessing and model saved together, loaded in a separate script and
    used to predict on fresh rows including an unseen category.

**What to submit**

1. The code, reproducible with a fixed seed, running end to end from a clean clone.
2. The **problem statement** and the **data note**.
3. A **results table**: baseline, each model, each metric, on validation and finally on test once.
4. The **leakage hunt** write-up.
5. The **fairness report**.
6. A **decision document**: would you deploy this, for what, with what safeguards, and what would
   have to be true first.
7. A **short write-up** (400–500 words): the result you had to discard and why; the most useful
   feature and how you found it; what this model will do badly and who it will affect.

**Constraints**

- The test set is touched once.
- Every reported number has a baseline beside it.
- No result reported without stating how leakage was excluded.

**Where the marks are.** The leakage hunt, the fairness report and the decision document. A model
with a good score is common; a student who can say precisely why the score can be believed and where
the model should not be used is not.`,
      rubric: [
        {
          criterion: 'Problem and data',
          description: 'Shape, label and decision defined precisely; error costs stated; every feature confirmed available at prediction time.',
          maxPoints: 20,
        },
        {
          criterion: 'Methodology',
          description: 'Split chosen for the problem and performed first; baseline reported; simple model before complex; test set touched once.',
          maxPoints: 25,
        },
        {
          criterion: 'Leakage and overfitting',
          description: 'Active leakage hunt documented with findings; training-versus-validation comparison at more than one complexity.',
          maxPoints: 20,
        },
        {
          criterion: 'Evaluation and fairness',
          description: 'Metric matched to the decision with justification; threshold chosen for stated costs; fairness measured and reported whatever it showed.',
          maxPoints: 25,
        },
        {
          criterion: 'Judgement',
          description: 'A decision document that is honest about deployment, safeguards and who the model would fail.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
