/**
 * Career-track content: ensembles, model evaluation and interpretability (Data Science + AI, batch S2).
 *
 * DS_ENSEMBLES — bagging and random forests, gradient boosting by hand and in scikit-learn, XGBoost and
 * LightGBM, tuning with early stopping without overfitting the validation set, and choosing a model family for
 * a table (including when the simple model wins). Ends with an NBFC loan-default mini project.
 * DS_EVALUATION — classifier metrics as money, lift and gains, calibration, validation strategies (time,
 * group, nested), permutation importance, partial dependence and SHAP, and error analysis with fairness checks.
 *
 * Builds on DS_ML_WORKFLOW (splits, leakage, pipelines, cross-validation) and DS_CLASSIFICATION (trees,
 * imbalance, thresholds). Datasets are simulated with fixed seeds — an NBFC personal-loan book (make_nbfc),
 * motor-insurance claims investigated for fraud (make_claims) and a food-delivery customer panel (make_panel) —
 * so every number can be reproduced. Every output shown was produced by running the code with scikit-learn 1.9,
 * XGBoost 3.4, LightGBM 4.7, SHAP 0.54, pandas 3.0 and NumPy 2.5; the code is written for scikit-learn 1.4+,
 * XGBoost 2+ and LightGBM 4+, and says where an API is newer. Both topics are single-skill, so checkpoint
 * questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DS_ENSEMBLES_EVAL_BUNDLES: PilotBundle[] = [
  /* ══ DS_ENSEMBLES ═══════════════════════════════════════════════════════════════════════ */

  /* ── BAGGING_FORESTS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_BAGGING_FORESTS',
    notes: `A single decision tree is easy to read and easy to break: change a few training rows and the tree changes
shape. On a table it is almost never the best model on its own. The fix that made trees the workhorse of tabular
machine learning is simple: grow **many** trees on slightly different data and **average** them.

## The data used in this topic

An NBFC lending personal loans: 20,000 past loans, 6.45% defaulted. Unlike the classification topic's generator,
default here depends on thresholds and interactions — a credit score below 660, an EMI above half of income, gig
workers on low incomes, self-employed applicants with many recent bureau enquiries — the kind of structure trees
find and a straight line does not.

    import numpy as np
    import pandas as pd

    def make_nbfc(n=20000, seed=11):
        rng = np.random.default_rng(seed)
        income = np.round(rng.lognormal(np.log(38000), 0.5, n), -2)          # monthly ₹
        credit = np.clip(np.round(rng.normal(710, 65, n)), 300, 900).astype(int)
        emi = np.round(np.clip(rng.normal(36, 12, n), 5, 85), 1)               # EMI as % of income
        months_emp = rng.integers(1, 240, n)
        age = rng.integers(21, 60, n)
        enquiries = rng.poisson(1.5, n)                                         # bureau enquiries, last 6 months
        prior = rng.choice([0, 1, 2], n, p=[0.85, 0.11, 0.04])
        tier = rng.choice(["Tier 1", "Tier 2", "Tier 3"], n, p=[0.45, 0.35, 0.20])
        job = rng.choice(["Salaried", "Self-employed", "Gig"], n, p=[0.62, 0.28, 0.10])
        z = (-4.2
             + np.where(credit < 660, 1.6, 0.0) + np.where(credit < 610, 1.2, 0.0) - 0.008 * np.clip(credit - 710, 0, None)
             + np.where(emi > 50, 2.0, 0.01 * (emi - 36))
             + 0.8 * prior
             + 0.1 * enquiries + np.where((enquiries >= 4) & (job == "Self-employed"), 1.5, 0.0)
             + np.where((job == "Gig") & (income < 30000), 1.8, 0.0)
             + np.where(tier == "Tier 3", 0.3, 0.0)
             - 0.008 * np.clip(months_emp - 60, -60, 60)
             + np.where(age < 25, 0.7, 0.0))
        default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
        return pd.DataFrame({"monthly_income": income.astype(int), "credit_score": credit, "emi_to_income_pct": emi,
                             "months_employed": months_emp, "age": age, "bureau_enquiries_6m": enquiries,
                             "prior_defaults": prior, "city_tier": tier, "employment": job, "defaulted": default})

    from sklearn.model_selection import train_test_split
    loans = make_nbfc()                                   # (20000, 10), 1,290 defaults
    X = pd.get_dummies(loans.drop(columns="defaulted"), columns=["city_tier", "employment"], dtype=int)
    y = loans["defaulted"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)

Trees do not need scaling, so one-hot encoding the two categoricals is all the preparation needed.

## A single tree: high variance

    from sklearn.tree import DecisionTreeClassifier
    from sklearn.metrics import roc_auc_score, average_precision_score

                                   train AUC   test AUC   test AP
    logistic regression (scaled)       0.813      0.818     0.303
    tree, unlimited depth              1.000      0.580     0.094
    tree, max_depth=5                  0.826      0.818     0.285

The unlimited tree memorises the training loans. **Variance** is the word for it: the model depends heavily on which
rows it happened to see. Train five unlimited trees on five bootstrap samples and ask them about the same applicant
(a self-employed Tier 1 applicant earning ₹16,700 a month, credit score 618, one prior default):

    tree 1: 0   tree 2: 0   tree 3: 1   tree 4: 1   tree 5: 1

Each tree is certain, and they disagree. Average them and you get 0.6 — a softer, more stable answer.

## Bagging: bootstrap + aggregate

**Bagging** trains B models, each on a **bootstrap sample** — n rows drawn *with replacement* from the n training
rows — and averages their predicted probabilities (or takes a vote).

Why averaging helps: if B predictions each have variance σ² and pairwise correlation ρ, their average has variance

    ρσ² + (1 − ρ)σ² / B

More trees shrink the second term towards zero, but **the first term stays**. Trees grown on overlapping data from
the same strong features are highly correlated, so bagging alone stalls.

## Random forests: decorrelate the trees

A **random forest** adds one idea: at every split, each tree may only consider a **random subset of features**
(\`max_features\`; scikit-learn's default for classification is \`"sqrt"\` — √13 ≈ 3 of the 13 columns here). A tree
can no longer split on credit score every time, so the trees differ more, ρ falls, and the average improves.

    from sklearn.ensemble import RandomForestClassifier, BaggingClassifier

                                     train AUC   test AUC   test AP   fit time
    bagging, 300 unlimited trees         1.000      0.821     0.306      9.7s
    random forest, 300 trees             1.000      0.835     0.347      1.6s
    random forest, min_samples_leaf=20   0.931      0.854     0.364      1.4s

The 300 individual trees inside the default forest score a mean test AUC of **0.585** (range 0.551–0.623) — barely
better than the single unlimited tree. Averaged, they reach **0.835**. That is variance reduction, measured.

## Out-of-bag error: a free validation set

Each bootstrap sample leaves out about **36.8%** of the rows (the chance a row is never drawn in n draws is
(1 − 1/n)ⁿ ≈ e⁻¹). Those **out-of-bag (OOB)** rows can score the trees that did not see them:

    rf = RandomForestClassifier(n_estimators=300, oob_score=True, random_state=0, n_jobs=-1).fit(X_tr, y_tr)
    rf.oob_score_                                                     # 0.9371 — accuracy, the default
    roc_auc_score(y_tr, rf.oob_decision_function_[:, 1])              # 0.818 — OOB AUC

OOB gives an honest estimate without a separate validation split — handy when data is scarce. Two cautions: the
default \`oob_score_\` is **accuracy**, useless on a 6% target (pass \`oob_score=roc_auc_score\`, or compute it from
\`oob_decision_function_\` as above), and OOB is not a substitute for a time-based test when the future differs.

## The parameters that matter

    min_samples_leaf   train AUC   OOB AUC   test AUC   test AP
           1             1.000      0.818      0.835     0.347
           5             0.986      0.833      0.848     0.362
          20             0.931      0.838      0.854     0.364
          50             0.896      0.840      0.852     0.349
         200             0.856      0.835      0.846     0.317

    n_estimators (min_samples_leaf=20):  1 → 0.758   10 → 0.840   50 → 0.849   100 → 0.854   300 → 0.854   500 → 0.854
    max_features:  "sqrt" → 0.854   0.5 → 0.848   None (plain bagging) → 0.847

What to take from this:

- **n_estimators** is not a tuning knob in the usual sense: more trees never overfit, they just stop helping (here
  after about 100) and cost time. Pick "enough".
- **Leaf size / depth** (\`min_samples_leaf\`, \`max_depth\`) controls how noisy each tree is. On noisy targets like
  default, slightly larger leaves help — the probabilities are averages over more loans. Note that the OOB AUC
  picked the same region as the test set without touching it.
- **max_features** controls decorrelation; \`"sqrt"\` is a good default for classification.
- \`class_weight="balanced_subsample"\` exists for imbalance, with the same warning as in the imbalance unit: it
  distorts the probabilities.

## Feature importance — read with care

    rf.feature_importances_       # mean decrease in impurity
    credit_score 0.432   emi_to_income_pct 0.201   months_employed 0.089   monthly_income 0.077   age 0.063 ...

Impurity importance is computed on the **training** data and favours continuous and high-cardinality columns: a
column with many distinct values offers many split points, so even noise gets used. The evaluation topic shows a
meaningless application number ranking fourth this way. Prefer **permutation importance** on held-out data for
anything you report.

## Why a forest beats a single tree — the sentence for an interview

"A deep tree has low bias and high variance. A forest keeps the low bias, and averaging many trees that were made
different on purpose — bootstrap rows, random features at each split — cancels much of the variance. Here the
single tree scored AUC 0.58 and the forest 0.85."`,
    workedExample: `**Goal: decide how big and how deep a forest for the NBFC model should be, without touching the test set.**

**Step 1 — fix the number of trees first.** Trees do not overfit as you add them, so start with enough: fit 100,
300 and 500 trees with \`oob_score=True\` and compare OOB AUC. The curve flattens after about 100; 300 is a safe,
cheap choice. Doubling it buys nothing but time.

**Step 2 — tune the one parameter that changes bias and variance.** With 300 trees, try \`min_samples_leaf\` in
[1, 5, 20, 50, 200] and read the OOB AUC computed from \`oob_decision_function_\`:

    1 → 0.818    5 → 0.833    20 → 0.838    50 → 0.840    200 → 0.835

20 and 50 are within noise of each other; pick 20 (a little more flexible, test AP slightly higher in the end).

**Step 3 — check max_features only if there is time.** \`"sqrt"\` gave OOB AUC 0.838 against 0.833 for 0.5 and 0.828
for None. The default stays.

**Step 4 — test once.** The chosen forest scores **test AUC 0.854, AP 0.364**, against 0.835 / 0.347 for the default
forest and 0.580 / 0.094 for one unlimited tree.

**Why it worked:** every decision used OOB predictions, which are out-of-sample for each tree, so the test set was
used once. On a 6% target the OOB *accuracy* (0.937 for every setting) would have chosen nothing — the metric had
to be AUC.`,
    mcqs: [
      mcq('The 300 trees inside a forest score a mean test AUC of 0.585 each, and the forest scores 0.835. What explains the gap?', [
        ['Averaging many decorrelated trees cancels much of their variance', true],
        ['The forest uses a lower threshold than the trees inside it use', false],
        ['Each tree inside a forest is pruned to depth 5 before averaging', false],
        ['The forest is trained on more rows than any of its single trees', false],
      ], 'Each tree is a high-variance, low-bias model. Their errors partly cancel when averaged, which is why bagged and random-feature trees together rank loans far better than any one of them.'),
      mcq('Why does a random forest consider only a random subset of features at each split?', [
        ['To make the trees less alike, so their average reduces more variance', true],
        ['To make training faster, which is its only real benefit in practice', false],
        ['To stop the strongest feature being used anywhere in the whole forest', false],
        ['To remove the need for bootstrap samples when the data is very large', false],
      ], 'The variance of an average is ρσ² + (1 − ρ)σ²/B. Restricting the features at each split lowers the correlation ρ between trees, which more trees alone cannot do.'),
      mcq('A forest on a 6% default target reports oob_score_ = 0.937 for every leaf size tried. What should the analyst conclude?', [
        ['The default OOB score is accuracy; compute OOB AUC to compare the settings', true],
        ['Leaf size does not matter for this data, so the default can be kept as it is', false],
        ['The forest is overfitting, because OOB scores should be lower than that', false],
        ['OOB estimates do not work for classification and must be replaced by a test set', false],
      ], 'oob_score_ uses accuracy unless told otherwise, and accuracy on a rare target barely moves. AUC from oob_decision_function_ separated the settings (0.818 to 0.840).'),
    ],
    checkpoint: [
      mcq('Roughly what share of the training rows is out-of-bag for any one tree in a bagged ensemble?', [
        ['About 37%', true],
        ['About 50%', false],
        ['About 10%', false],
        ['About 63%', false],
      ], 'A row is missed by all n draws with probability (1 − 1/n)ⁿ ≈ e⁻¹ ≈ 0.368. About 63% of rows (with repeats) are in each bootstrap sample.'),
      mcq('Raising n_estimators from 100 to 500 in a random forest changed test AUC from 0.854 to 0.854. What does that show?', [
        ['Extra trees stopped helping; they do not overfit, they only cost time', true],
        ['The forest started overfitting, so fewer trees should have been used', false],
        ['The forest needs a higher learning rate to benefit from extra trees', false],
        ['The test set is too small to measure any difference at all in AUC', false],
      ], 'Averaging more trees reduces only the (1 − ρ)σ²/B part of the variance, which is already small at 100 trees. Adding trees cannot overfit; it plateaus.'),
      mcq('Why can impurity-based feature importance from a forest mislead?', [
        ['It is computed on training data and favours columns with many split points', true],
        ['It is computed on the test set, so it leaks information about the labels', false],
        ['It can only rank numeric features and ignores the one-hot encoded columns', false],
        ['It always sums to the AUC of the model, so it cannot be compared across models', false],
      ], 'Mean decrease in impurity rewards any column a deep tree can split on many times, including noise and IDs. Permutation importance on held-out data does not have this bias.'),
    ],
  },

  /* ── BOOSTING ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_BOOSTING',
    notes: `A forest grows many deep trees **independently** and averages them. **Boosting** grows many *small* trees
**one after another**, each one trained to fix what the ensemble so far gets wrong. It is the idea behind the
models that win most tabular competitions and run most credit, fraud and pricing models in production.

## Boosting by hand: a regression with eight rows

A food-delivery app wants to predict delivery time from distance:

    km    1.0  1.5  2.0  3.0  4.0  5.0  6.5  8.0
    mins  18   20   22   27   31   38   45   52

**Round 0.** Start with a constant: the mean, **31.6** minutes, for everyone.

**Round 1.** Compute the **residuals** (actual − prediction) and fit a **stump** (a tree of depth 1) to them:

    residuals   −13.6 −11.6 −9.6 −4.6 −0.6  6.4  13.4  20.4
    stump: km ≤ 4.5 → −8.0,   km > 4.5 → +13.4

Add the stump's output, scaled by a **learning rate** of 0.5:

    prediction  27.6  27.6  27.6  27.6  27.6  38.3  38.3  38.3       MSE 53.2

**Round 2.** New residuals, new stump (it now splits at 2.5 km), add half of it: MSE **27.2**.
**Round 3.** Another stump (split at 5.75 km): MSE **11.5**.

    from sklearn.tree import DecisionTreeRegressor
    pred = np.full(8, mins.mean())
    for r in range(3):
        stump = DecisionTreeRegressor(max_depth=1).fit(km.reshape(-1, 1), mins - pred)
        pred += 0.5 * stump.predict(km.reshape(-1, 1))

That loop is gradient boosting. Each stump is weak; the sum of many is strong. For squared error the residual is
exactly the negative **gradient** of the loss with respect to the prediction — so each tree takes a step of gradient
descent in "function space", which is where the name comes from.

## Classification: the same loop on log-odds

For a 0/1 target the model adds trees to the **log-odds**, the loss is log loss, and each tree fits the gradient
y − p (the "pseudo-residual"). The output passes through the sigmoid, so it is a probability, like logistic
regression's — but the score is a sum of trees, so it can bend around thresholds and interactions.

## Learning rate and number of trees

The **learning rate** shrinks every tree's contribution. Smaller steps need more trees, but generalise better.
Gradient boosting on the NBFC loans (\`max_depth=3\`):

    from sklearn.ensemble import GradientBoostingClassifier

    learning_rate  n_estimators   train AUC   test AUC   test AP   fit time
         1.0           100          0.692       0.646     0.170      1.8s
         0.3           100          0.905       0.847     0.329      1.7s
         0.1           100          0.878       0.857     0.366      2.0s
         0.1           300          0.911       0.850     0.345      5.5s
         0.03          300          0.877       0.858     0.368      5.2s
         0.03         1000          0.909       0.850     0.350     17.1s

- At **1.0** each tree over-corrects and the fit is unstable — training AUC is only 0.692.
- Unlike a forest, **boosting can overfit by adding trees**: at learning rate 0.3, test AUC by number of trees
  (\`staged_predict_proba\`) is 0.857 at 10 and 50, 0.847 at 100, 0.831 at 200, 0.805 at 400 and 0.787 at 600.
- learning_rate and n_estimators trade against each other: 0.1 × 100 and 0.03 × 300 land in the same place.
  The next units choose the number of trees automatically with **early stopping**.

Other controls: \`max_depth\` (2–6 is typical; boosting wants shallow trees — depth 3 already captures interactions
of three features), \`subsample\` < 1 (each tree sees a random fraction of rows: **stochastic gradient boosting**,
which adds a little randomness and regularisation) and \`min_samples_leaf\`.

## HistGradientBoostingClassifier: the one to use in scikit-learn

\`GradientBoostingClassifier\` is exact and slow. \`HistGradientBoostingClassifier\` bins every feature into at most
255 buckets first, so finding splits is fast, and it handles **missing values natively** and categorical
features (\`categorical_features="from_dtype"\` with pandas category columns, scikit-learn 1.4+).

    from sklearn.ensemble import HistGradientBoostingClassifier
    hgb = HistGradientBoostingClassifier(random_state=0).fit(X_tr, y_tr)
    # test AUC 0.853, AP 0.348, 0.2s — hgb.n_iter_ is 42, not the default max_iter of 100

Why 42 trees? With more than 10,000 rows, \`early_stopping="auto"\` switches on: it holds out 10% of the training
data and stops when the validation loss has not improved for 10 iterations. That is usually what you want — and a
surprise if you did not know (see the debugging unit). With \`learning_rate=0.05, max_iter=300, max_leaf_nodes=15\`
it reaches test AUC **0.856** in 0.3s.

## AdaBoost, in brief

The original boosting algorithm (1995) re-weights the *rows* instead of fitting residuals: after each weak
learner, misclassified rows get more weight, so the next learner focuses on them; the final vote weights each
learner by its accuracy. \`AdaBoostClassifier(n_estimators=200, learning_rate=0.5)\` scores test AUC 0.846 here. It
is sensitive to label noise (it keeps chasing mislabelled rows) and has been displaced by gradient boosting in
practice — but it is a classic interview question.

## Forests vs boosting

| | Random forest | Gradient boosting |
|---|---|---|
| Trees | Deep, independent, averaged | Shallow, sequential, summed |
| Reduces mainly | Variance | Bias |
| More trees | Never hurts | Can overfit — use early stopping |
| Tuning | Forgiving | Needs care (learning rate, trees, depth) |
| Typical accuracy on tables | Good | Usually best |`,
    workedExample: `**Goal: see exactly what the second boosting round does in the delivery example.**

After round 1, predictions are 27.6 (for km ≤ 4.5) and 38.3 (for km > 4.5). The residuals are:

    km         1.0   1.5   2.0   3.0   4.0   5.0   6.5   8.0
    residual  −9.6  −7.6  −5.6  −0.6   3.4  −0.3   6.7  13.7

**Which split does the stump choose?** The one that most reduces squared error of the residuals. Splitting at 2.5 km
separates the three short trips, all strongly negative, from the rest: left mean −7.6, right mean +4.6. No other
split separates residuals as cleanly, so the stump says −7.6 for km ≤ 2.5 and +4.6 otherwise.

**Update with learning rate 0.5:**

    km ≤ 2.5:        27.6 + 0.5 × (−7.6) = 23.8
    2.5 < km ≤ 4.5:  27.6 + 0.5 × 4.6    = 29.9
    km > 4.5:        38.3 + 0.5 × 4.6    = 40.6

MSE falls from 53.2 to 27.2. Notice what happened: round 1 found the biggest pattern (long trips take longer),
round 2 found the next one (very short trips are quicker still), and the long trips moved slightly too because the
right-hand leaf also contained them. Round 3 splits at 5.75 km and fixes the longest trips (MSE 11.5).

**The lesson:** each tree works on what is left. With a learning rate of 1 the first stump would have jumped all
the way to the leaf means; with 0.5, each round corrects only half of what it sees, leaving later trees room to
refine — the reason small learning rates with more trees generalise better.`,
    mcqs: [
      mcq('In gradient boosting with squared error, what does each new tree fit?', [
        ['The residuals of the current ensemble, the negative gradient of the loss', true],
        ['A fresh bootstrap sample of the original target, like a random forest', false],
        ['The original target, with misclassified rows given more weight than others', false],
        ['The predictions of the previous tree, to smooth the ensemble over time', false],
      ], 'Each tree is fitted to actual − current prediction, which for squared error is the negative gradient. Re-weighting rows is AdaBoost; bootstrap samples are bagging.'),
      mcq('At learning rate 0.3, test AUC was 0.857 at 50 trees and 0.787 at 600. What does this show about boosting?', [
        ['Unlike a forest, boosting overfits as trees are added, so the count must be chosen', true],
        ['The learning rate is too low, which is why the extra trees made the model worse', false],
        ['Boosting needs deeper trees as it grows, otherwise it loses accuracy over time', false],
        ['The test set was leaking, because AUC should never fall when trees are added', false],
      ], 'Each boosting round fits what is left, including noise, so with enough rounds the model memorises the training data. Early stopping picks the number of trees on validation data.'),
      mcq('HistGradientBoostingClassifier(max_iter=100) on 15,000 rows reports n_iter_ = 42. Why?', [
        ['Early stopping is on by default above 10,000 rows and stopped training early', true],
        ['max_iter counts leaves rather than trees, so 42 trees used up the 100 leaves', false],
        ['The model hit an error after 42 trees and silently returned what it had built', false],
        ['Binning the features into 255 buckets reduces the number of trees it can grow', false],
      ], 'early_stopping="auto" holds out 10% of the training rows when n > 10,000 and stops after 10 rounds without improvement. Set early_stopping=False to force all iterations.'),
    ],
    checkpoint: [
      mcq('Why does gradient boosting usually use shallow trees while a random forest uses deep ones?', [
        ['Boosting reduces bias by adding many weak learners; a forest reduces variance of strong ones', true],
        ['Deep trees cannot be fitted to residuals, because residuals can be negative numbers', false],
        ['Shallow trees are needed for the learning rate to work, which forests do not use', false],
        ['Random forests cannot use shallow trees, since bootstrap samples need deep splits', false],
      ], 'A forest averages low-bias, high-variance trees. Boosting sums many high-bias stumps or small trees, each correcting the last, so its strength comes from the sequence rather than the depth.'),
      mcq('Halving the learning rate of a boosted model usually requires what change to keep the same fit?', [
        ['About twice as many trees', true],
        ['About half as many trees', false],
        ['Deeper trees, with the same count', false],
        ['No change to the number of trees', false],
      ], 'Each tree contributes half as much, so roughly twice as many are needed to reach the same place — in exchange for a smoother path that often generalises a little better.'),
      mcq('How does AdaBoost differ from gradient boosting?', [
        ['It re-weights misclassified rows rather than fitting residuals', true],
        ['It trains its trees independently and then averages their votes', false],
        ['It can only be used for regression targets, not classification', false],
        ['It uses deep trees, while gradient boosting is limited to stumps', false],
      ], 'AdaBoost increases the weight of rows each learner got wrong, so the next focuses on them. Gradient boosting fits the gradient of a loss. Both are sequential.'),
    ],
  },

  /* ── XGBOOST_LIGHTGBM ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_XGBOOST_LIGHTGBM',
    notes: `scikit-learn's histogram boosting is good. The two libraries most job descriptions name — **XGBoost** and
**LightGBM** — are the same algorithm with more engineering: regularisation built into the split rule, fast
histogram training on many cores and GPUs, native categorical and missing-value handling, and years of production
use at banks, NBFCs, insurers and e-commerce companies. Both have a scikit-learn-style API, so everything from the
workflow topic — pipelines, cross-validation, search — carries over.

    pip install xgboost lightgbm

## Categoricals: give them the category dtype

Both libraries split categorical columns directly when the pandas dtype is \`category\` — no one-hot encoding:

    X_tr, X_te, y_tr, y_te = train_test_split(loans.drop(columns="defaulted"), loans["defaulted"],
                                              test_size=0.25, random_state=0, stratify=loans["defaulted"])
    for c in ["city_tier", "employment"]:
        X_tr[c] = X_tr[c].astype("category")
        X_te[c] = X_te[c].astype(pd.CategoricalDtype(X_tr[c].cat.categories))   # same categories, same codes

The second line matters: the test column must use the **training** categories, or a category's internal code can
differ between the two. Pass plain strings to XGBoost and it refuses:

    ValueError: DataFrame.dtypes for data must be int, float, bool or category. When categorical type is supplied,
    the experimental DMatrix parameter\`enable_categorical\` must be set to \`True\`. Invalid columns:city_tier: str,
    employment: str

## XGBoost

    import xgboost as xgb
    model = xgb.XGBClassifier(
        n_estimators=300, learning_rate=0.05,
        max_depth=4,                 # depth of each tree (default 6)
        min_child_weight=5,          # minimum hessian (≈ rows, for balanced p) in a leaf
        subsample=0.8,               # rows per tree
        colsample_bytree=0.8,        # columns per tree
        reg_lambda=1.0,              # L2 penalty on leaf values
        enable_categorical=True,     # tree_method="hist" is the default from XGBoost 2.0
        eval_metric="aucpr", random_state=0)
    model.fit(X_tr, y_tr)

## LightGBM

    import lightgbm as lgb
    model = lgb.LGBMClassifier(
        n_estimators=300, learning_rate=0.05,
        num_leaves=15,               # LightGBM grows leaf-wise: cap the leaves (default 31)
        min_child_samples=50,        # minimum rows in a leaf (default 20)
        subsample=0.8, subsample_freq=1,    # subsample does nothing unless subsample_freq > 0
        colsample_bytree=0.8, reg_lambda=1.0,
        random_state=0, verbose=-1)
    model.fit(X_tr, y_tr)            # category columns are detected automatically

**Leaf-wise vs depth-wise.** XGBoost (by default) grows a tree level by level; LightGBM always splits the leaf with
the biggest gain, producing deep, lopsided trees. That is faster and often more accurate, but overfits small data
unless \`num_leaves\` and \`min_child_samples\` are controlled. A rough equivalence: depth d holds up to 2^d leaves, so
\`num_leaves=15\` is in the territory of \`max_depth=4\`.

## On the NBFC loans

                                       train AUC   test AUC   test AP   fit time   mean p
    XGBoost, defaults                     0.997      0.813     0.286      0.6s     0.055
    XGBoost, settings above               0.914      0.852     0.360      1.1s     0.064
    LightGBM, defaults                    0.979      0.840     0.338      0.2s     0.061
    LightGBM, settings above              0.943      0.848     0.354      0.5s     0.063
    (random forest, previous unit)        0.931      0.854     0.364      1.4s
    (true test default rate)                                                       0.0644

Two lessons. **Defaults overfit**: XGBoost's depth-6 trees at learning rate 0.3 memorise this data (train 0.997,
test 0.813). And **on a dataset this size the libraries are not magic**: tuned sensibly, XGBoost, LightGBM, HGB and a
well-set forest all land between 0.848 and 0.857. Their advantages show on millions of rows, hundreds of features,
missing values and many categories — and in tooling.

## The parameters, grouped by what they do

| Purpose | XGBoost | LightGBM |
|---|---|---|
| Step size and count | \`learning_rate\`, \`n_estimators\` | \`learning_rate\`, \`n_estimators\` |
| Tree complexity | \`max_depth\`, \`min_child_weight\`, \`gamma\` | \`num_leaves\`, \`min_child_samples\`, \`max_depth\` |
| Randomness | \`subsample\`, \`colsample_bytree\` | \`subsample\` + \`subsample_freq\`, \`colsample_bytree\` |
| Penalties | \`reg_lambda\` (L2), \`reg_alpha\` (L1) | \`reg_lambda\`, \`reg_alpha\` |
| Imbalance | \`scale_pos_weight\` | \`scale_pos_weight\` or \`is_unbalance\` |

## scale_pos_weight: the class-weight warning again

\`scale_pos_weight = negatives / positives\` (14.5 here) up-weights defaulters:

    LightGBM + scale_pos_weight=14.5:  test AUC 0.843, AP 0.352, mean predicted p 0.260  (true rate 0.064)

Ranking barely changed; the probabilities are now four times too high. Use it only if you need it for training
stability and do not use the scores as probabilities — or choose a threshold on the unweighted model instead.

## Missing values

Both libraries learn, at each split, which side missing values should go to. You can pass NaN directly — no
imputer. That is convenient and usually works well, but it means "missing" is treated as information: if
missingness changes between training and production (a bureau outage, a new form), predictions shift.

## Importance, two ways

LightGBM reports \`feature_importances_\` as **split counts** by default; gain is more meaningful:

    split count:  emi_to_income_pct 807, months_employed 752, credit_score 752, monthly_income 737, ...
    gain:         credit_score 10816, emi_to_income_pct 6669, months_employed 3990, monthly_income 3895, ...

Split counts make credit score look no more important than months employed; gain shows it is nearly three times as
important. Neither is computed on held-out data — the evaluation topic uses permutation importance and SHAP.

## API notes for current versions

- XGBoost 2.0+: \`tree_method="hist"\` is the default; \`early_stopping_rounds\` and \`eval_metric\` go in the
  **constructor**, not in \`fit\` (the old \`fit\` arguments were removed).
- LightGBM 4.x: early stopping is a callback, \`lgb.early_stopping(100)\`. LightGBM 4.7 warns that \`eval_set\` is
  deprecated in favour of \`eval_X\` and \`eval_y\`; \`eval_set\` still works, and is what most code you will read uses.`,
    mcqs: [
      mcq('XGBoost fails with "DataFrame.dtypes for data must be int, float, bool or category" on a frame with a city_tier text column. What is the cleanest fix?', [
        ['Convert the column to the category dtype and set enable_categorical=True', true],
        ['Drop city_tier, since XGBoost cannot use any categorical information at all', false],
        ['Label-encode the column into the codes 0, 1 and 2 and treat it as a number', false],
        ['Switch tree_method to "exact", which is the method that accepts text columns', false],
      ], 'XGBoost splits categorical features natively when they have the pandas category dtype and enable_categorical is on. Label encoding imposes an order that does not exist.'),
      mcq('With default settings XGBoost scores train AUC 0.997 and test AUC 0.813; with depth 4, learning rate 0.05 and subsampling it scores 0.914 and 0.852. What happened?', [
        ['The defaults overfit this data; shallower, slower, randomised trees generalise better', true],
        ['The defaults underfit this data, so the train AUC was too low to generalise well', false],
        ['The second model leaked the test set, which explains its higher test score', false],
        ['XGBoost needs one-hot encoding to generalise, which the second model used instead', false],
      ], 'A near-perfect training score with a much lower test score is overfitting. Lower depth, smaller learning rate and row/column subsampling all restrain it.'),
      mcq('In LightGBM, subsample=0.8 was set but training is identical to subsample=1.0. Why?', [
        ['Row subsampling only runs when subsample_freq is greater than 0', true],
        ['subsample is ignored whenever colsample_bytree is also set below 1', false],
        ['LightGBM does not support row subsampling for classification at all', false],
        ['The random_state parameter overrides subsample and keeps every row', false],
      ], 'LightGBM bags rows every subsample_freq iterations; with the default subsample_freq=0, bagging is off whatever subsample says.'),
    ],
    checkpoint: [
      mcq('How does LightGBM grow a tree differently from XGBoost\'s default?', [
        ['Leaf-wise — always splitting the leaf with the largest gain', true],
        ['Level-wise — splitting every leaf at one depth before the next', false],
        ['Randomly — choosing a leaf to split with probability by size', false],
        ['Backwards — growing a full tree and then pruning its leaves', false],
      ], 'Leaf-wise growth reaches lower loss with fewer leaves but can build very deep branches, so num_leaves and min_child_samples are its main controls.'),
      mcq('An NBFC model trained with scale_pos_weight=14.5 has the same AUC but a mean predicted default of 0.26 on a 6.4% book. What should the risk team be told?', [
        ['The ranking is usable, but the scores are not default probabilities', true],
        ['The model is broken and must be retrained without any categorical features', false],
        ['The scores are correct, and the book will see about 26% of loans default', false],
        ['The AUC must be wrong, since scale_pos_weight always improves the ranking', false],
      ], 'Up-weighting positives inflates scores while barely changing their order. Expected-loss calculations need calibrated probabilities.'),
      mcq('Why should test-set category columns be cast with the training set\'s categories?', [
        ['So each category keeps the same internal code the model learned', true],
        ['So the test set gets more categories than the training set has', false],
        ['Because LightGBM refuses any column that is not sorted by name', false],
        ['So that unseen categories raise an error during the prediction step', false],
      ], 'Native categorical support works on the category codes. Using the training categories keeps codes aligned; unseen values become missing rather than silently taking another category\'s code.'),
    ],
  },

  /* ── TUNING_EARLY_STOPPING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_TUNING_EARLY_STOPPING',
    notes: `A boosted model has a dozen parameters, and a grid over all of them would take days. Good tuning is mostly
knowing which few matter, letting **early stopping** choose the number of trees, and refusing to fool yourself with
the validation set.

## Which parameters matter

In rough order of impact for LightGBM / XGBoost:

1. **Number of trees × learning rate** — choose a small learning rate (0.02–0.05) and let early stopping pick the
   count.
2. **Tree complexity** — \`num_leaves\` / \`max_depth\`, and \`min_child_samples\` / \`min_child_weight\`.
3. **Randomness** — \`subsample\`, \`colsample_bytree\` (0.6–0.9 is typical).
4. **Penalties** — \`reg_lambda\`, \`reg_alpha\`: small effects, tune last.

## Early stopping

Hold out a **validation set** from the training data. Train with many trees, evaluate after each one, and stop when
the validation metric has not improved for a set number of rounds (the **patience**). The model keeps the best
iteration.

    from sklearn.model_selection import train_test_split
    X_fit, X_val, y_fit, y_val = train_test_split(X_tr, y_tr, test_size=0.2, random_state=1, stratify=y_tr)
    # 12,000 rows to fit, 3,000 to validate (194 defaults)

    model = lgb.LGBMClassifier(n_estimators=5000, learning_rate=0.02, num_leaves=15, min_child_samples=50,
                               subsample=0.8, subsample_freq=1, colsample_bytree=0.8, random_state=0, verbose=-1)
    model.fit(X_fit, y_fit, eval_set=[(X_val, y_val)], eval_metric=["binary_logloss", "auc"],
              callbacks=[lgb.early_stopping(100, first_metric_only=True, verbose=False)])
    model.best_iteration_                                  # 282

    iteration   val logloss   val AUC
        50        0.1959      0.8392
       100        0.1871      0.8369
       200        0.1836      0.8386
       282        0.1832      0.8383     <- best logloss
       382        0.1843      0.8354     <- 100 rounds without improvement: stop

    test AUC 0.850, AP 0.358

Two details worth knowing:

- **Which metric stops it.** With several metrics, LightGBM's callback stops on *any* of them unless you pass
  \`first_metric_only=True\`. Stopping on AUC alone stopped at iteration **25** — AUC on 194 positives is jumpy, and an
  early wobble ended training. Log loss is smoother; stop on it, and report the business metric separately.
- **XGBoost 2.0+** puts it in the constructor:

      model = xgb.XGBClassifier(n_estimators=5000, learning_rate=0.02, max_depth=4, subsample=0.8,
                                colsample_bytree=0.8, min_child_weight=5, early_stopping_rounds=100,
                                eval_metric="auc", enable_categorical=True, random_state=0)
      model.fit(X_fit, y_fit, eval_set=[(X_val, y_val)], verbose=False)
      model.best_iteration                                 # 238; test AUC 0.853, AP 0.365

  \`predict_proba\` then uses the trees up to the best iteration automatically.

## Searching the rest: randomised search with cross-validation

Random search beats a grid when only a few parameters matter: it tries more distinct values of each.

    from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
    from scipy.stats import loguniform, randint, uniform

    dist = {"num_leaves": randint(4, 64), "min_child_samples": randint(10, 200),
            "learning_rate": loguniform(0.01, 0.3), "n_estimators": randint(100, 800),
            "colsample_bytree": uniform(0.5, 0.5), "reg_lambda": loguniform(1e-3, 10)}
    search = RandomizedSearchCV(lgb.LGBMClassifier(subsample=0.8, subsample_freq=1, random_state=0, verbose=-1),
                                dist, n_iter=40, scoring="average_precision",
                                cv=StratifiedKFold(5, shuffle=True, random_state=0), random_state=0, n_jobs=-1)
    search.fit(X_tr, y_tr)                                  # 200 fits, about 3 minutes on a laptop

    rank  num_leaves  learning_rate  n_estimators  min_child_samples   CV AP    sd
      1        4          0.049           301              122         0.378  0.032
      2        8          0.017           435               27         0.370  0.031
      3       10          0.012           757              168         0.369  0.028
    40 configurations: mean CV AP 0.327, best 0.378

    test AUC 0.860, AP 0.377

Read the table, not just the winner: the top configurations use **small trees** (4–10 leaves) and **low learning
rates**, and the top three are within one standard deviation of each other. The honest statement is "small,
slow-learning trees work best here", not "num_leaves=4 is optimal".

(Inside a CV search, early stopping needs a validation split inside each fold; searching \`n_estimators\` directly, as
above, is simpler. Tools like Optuna do Bayesian search with pruning when the budget is larger.)

## Do not overfit the validation set

Every decision made by looking at a validation score is fitted to that validation set. Try enough configurations
on a small one and the best will look better than it is:

    60 random LightGBM configurations, each scored on a 1,500-row validation set (97 defaults):
    best on validation:  validation AP 0.475   ->   test AP 0.344
    median config:       validation AP 0.441        test AP 0.337
    correlation between validation and test AP across configs: 0.47

The "best" configuration's validation AP was 0.13 above its test AP: most of its lead was luck on 97 defaults.
Defences:

- Use **cross-validation** for search, so each score averages several validation folds.
- Keep a **test set** that no decision has touched, and look at it once.
- Prefer **robust regions** over a single winner; when two settings are within noise, choose the simpler one.
- Bigger validation sets help more than more search iterations.
- Early stopping is itself tuning on the validation set — a mild form, but do not then report the validation score
  as the model's performance.

## A practical recipe

1. Small learning rate (0.03–0.05), early stopping on log loss to set the number of trees.
2. Random search with 5-fold CV over \`num_leaves\` / depth, \`min_child_samples\`, subsampling — 30 to 60 draws.
3. Pick from the best robust region; refit on all training data with the chosen number of trees.
4. One test-set evaluation.`,
    mcqs: [
      mcq('A LightGBM model is trained with eval_metric ["binary_logloss", "auc"] and early stopping, and stops at iteration 25 on a small validation set. What is the likely cause and fix?', [
        ['A jumpy AUC triggered the stop; stop on log loss with first_metric_only=True', true],
        ['The learning rate is too high; early stopping always ends near 25 rounds then', false],
        ['The patience is too long; reduce it so that the model can train more trees', false],
        ['The validation set leaked; early stopping should be run on the test set instead', false],
      ], 'Without first_metric_only, any metric can trigger the stop. AUC on a few hundred positives fluctuates; log loss is smoother. With the fix, training ran to iteration 282.'),
      mcq('Of 60 configurations, the one best on a 1,500-row validation set scored AP 0.475 there and 0.344 on test. What explains the gap?', [
        ['Choosing the best of many on a small set selects luck as well as quality', true],
        ['The test set must contain leakage, since validation and test should agree', false],
        ['The configuration overfits its training data, which validation cannot detect', false],
        ['Average precision is unstable, and AUC would have shown no gap at all here', false],
      ], 'The maximum of 60 noisy scores is biased upward. Cross-validated search, larger validation sets and a once-only test set keep the estimate honest.'),
      mcq('In XGBoost 2.0 and later, where is early_stopping_rounds set?', [
        ['In the constructor, with eval_set passed to fit', true],
        ['In fit, along with eval_metric and callbacks', false],
        ['In predict, which stops at the best iteration', false],
        ['In a separate xgb.callback object on the model', false],
      ], 'XGBoost 2.0 removed early_stopping_rounds and eval_metric from fit. They are constructor parameters; eval_set still goes to fit.'),
    ],
    checkpoint: [
      mcq('Why is a small learning rate with early stopping a good default for boosted trees?', [
        ['The count of trees is chosen by validation loss instead of guessed by hand', true],
        ['Small learning rates make every tree deeper, which captures more structure', false],
        ['Early stopping only works when the learning rate is set below about 0.05', false],
        ['A small learning rate removes the need for any validation data at all', false],
      ], 'Small steps generalise better, and early stopping finds where validation loss stops falling, so n_estimators is no longer a parameter to search.'),
      mcq('A random search shows the top three configurations within one standard deviation of each other. How should the final settings be chosen?', [
        ['From the robust region they share, preferring the simpler setting', true],
        ['Always the top-ranked one, since it had the highest mean CV score', false],
        ['By re-running the three on the test set and picking the best of them', false],
        ['By averaging all their parameter values into one new configuration', false],
      ], 'Differences within noise are not evidence. Choosing on the test set would turn it into a validation set; averaging parameters can produce a configuration nobody tested.'),
      mcq('Which statement about early stopping and the reported score is correct?', [
        ['The validation score at the best iteration is optimistic; report a test score', true],
        ['The validation score at the best iteration is an unbiased estimate to report', false],
        ['Early stopping uses the test set, so the test score is already the final one', false],
        ['Early stopping removes overfitting, so train and test scores should be equal', false],
      ], 'The stopping point was chosen because it looked best on that validation set. A held-out test set, untouched by the choice, gives the honest figure.'),
    ],
  },

  /* ── CHOOSING_MODELS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_CHOOSING_MODELS',
    notes: `"Use XGBoost" is the reflex answer for any table. It is often right and sometimes wrong, and the interview
question is never "which is best?" but "which would you choose here, and why?" This unit compares the families on
the NBFC loans and lists what besides accuracy decides.

## The comparison, done fairly

Same training data, same 5-fold stratified CV, every preprocessing step inside a pipeline:

    from sklearn.model_selection import cross_validate, StratifiedKFold
    cv = StratifiedKFold(5, shuffle=True, random_state=0)
    r = cross_validate(model, X_tr, y_tr, cv=cv, scoring=["roc_auc", "average_precision"])

    model                              CV AUC          CV AP           fit time
    logistic regression                0.810 ± 0.014   0.297 ± 0.032   0.03s
    logistic + 5 rule features         0.851 ± 0.008   0.385 ± 0.035   0.05s
    random forest                      0.837 ± 0.008   0.339 ± 0.012   1.37s
    hist gradient boosting             0.841 ± 0.008   0.351 ± 0.031   0.31s
    LightGBM (tuned)                   0.847 ± 0.006   0.380 ± 0.030   0.29s
    stack (logistic + forest + LGBM)   0.847 ± 0.008   0.381 ± 0.027   12.91s

What the second row is: the same logistic regression with five **domain features** added — score below 660, score
below 610, EMI over 50% of income, gig worker on under ₹30,000, self-employed with 4+ enquiries:

    def add_rules(X):
        X = X.copy()
        X["low_score"] = (X.credit_score < 660).astype(int)
        X["very_low_score"] = (X.credit_score < 610).astype(int)
        X["emi_over_50"] = (X.emi_to_income_pct > 50).astype(int)
        X["gig_low_income"] = ((X.employment == "Gig") & (X.monthly_income < 30000)).astype(int)
        X["se_many_enquiries"] = ((X.employment == "Self-employed") & (X.bureau_enquiries_6m >= 4)).astype(int)
        return X

    model = make_pipeline(FunctionTransformer(add_rules), preprocess, LogisticRegression(max_iter=1000))

With them, the "simple" model **matches tuned LightGBM**. Be honest about why: these are exactly the rules the data
was simulated from. On real data nobody hands you the rules — but credit teams often know many of them (policy
cut-offs, EMI caps), and a tree model's splits and SHAP plots can suggest the rest. A boosted model finds such
structure automatically; a linear model needs you to put it in.

## What decides, besides the score

| Concern | Favours |
|---|---|
| Interactions and thresholds you do not know | Boosting, forests |
| Explaining every decision to a regulator or customer (adverse-action reasons in lending) | Logistic regression, scorecards, shallow trees |
| Very little data (a few hundred rows) | Regularised linear models |
| Millions of rows, many categories, missing values | LightGBM / XGBoost / HGB |
| Extrapolating beyond the training range (prices next year) | Linear models — trees predict flat outside the data |
| Prediction latency of a few milliseconds, tiny memory | Linear models |
| Monotonic behaviour required ("more income never raises risk") | Linear, or boosting with \`monotone_constraints\` |
| Calibrated probabilities with little effort | Logistic regression |
| Training and retraining cost, team familiarity | Whatever the team can maintain |

Indian lenders often run a **scorecard** (logistic regression on binned features) as the approved decision model
and a gradient-boosted model as a challenger or for fraud and collections, where explanations matter less.

## Stacking

**Stacking** trains a **meta-model** on the out-of-fold predictions of several base models:

    from sklearn.ensemble import StackingClassifier
    stack = StackingClassifier([("lr", logistic_with_rules), ("rf", forest), ("lgbm", lgbm)],
                               final_estimator=LogisticRegression(), cv=5)

It gains when the base models make **different** errors. Here they make similar ones, so the stack matched LightGBM
(0.847) at **40 times** the training time and three models to maintain. Stacking is common in Kaggle leaderboards,
where 0.001 AUC matters; in production it rarely pays for its complexity. A simple average of two different
models' probabilities captures most of the benefit when there is one.

## When the simple model wins

- The relationship is close to linear on the log-odds. On the classification topic's loan data (\`make_loans()\`,
  4,000 loans, simulated from a linear log-odds), 5-fold CV AUC is **0.765** for logistic regression and **0.751**
  for a lightly tuned HistGradientBoostingClassifier — the line wins.
- The data is small and noisy.
- Someone must defend each decision.
- The difference is inside the CV standard deviation — logistic + rules 0.851 ± 0.008 vs LightGBM 0.847 ± 0.006 is a
  tie, and a tie goes to the simpler model.

## A decision procedure

1. Baseline (dummy) and a regularised logistic regression with sensible features.
2. A gradient-boosted model (HGB or LightGBM) with light tuning and early stopping.
3. Compare by CV mean **and spread**, on the metric the business uses.
4. If boosting wins clearly, ask whether its gain is worth the explanation cost — and whether its top splits suggest
   features that would let the linear model catch up.
5. Choose, write down why, and keep the runner-up as a challenger.`,
    mcqs: [
      mcq('Logistic regression with five domain rule features scores CV AUC 0.851 ± 0.008; tuned LightGBM 0.847 ± 0.006. What is the reasonable conclusion?', [
        ['A tie within noise, so the simpler and more explainable model can be chosen', true],
        ['LightGBM is better, because gradient boosting always wins on tabular data', false],
        ['Logistic regression is clearly better, as its mean is four thousandths higher', false],
        ['Neither can be used until stacking has been tried, since it combines both', false],
      ], 'The difference is smaller than one standard deviation across folds. When accuracy ties, explainability, latency and maintenance decide.'),
      mcq('A stack of logistic regression, a forest and LightGBM matched LightGBM\'s CV AUC at 40 times the training time. Why did stacking not help?', [
        ['The base models made similar errors, so there was little to combine', true],
        ['The meta-model was logistic regression, which can never improve a stack', false],
        ['Stacking only works for regression problems, not for classification', false],
        ['The stack used out-of-fold predictions, which always lowers the score', false],
      ], 'A meta-model gains only where base models disagree informatively. Out-of-fold predictions are what keep stacking honest, not what limits it.'),
      mcq('A pricing model must predict next year\'s premiums, which will be above any value seen in training. Why might a linear model be preferred to boosted trees?', [
        ['Trees predict a flat value beyond the training range; a line can extrapolate', true],
        ['Boosted trees cannot be trained on a numeric target such as a premium value', false],
        ['Linear models are always more accurate than boosted trees for any pricing task', false],
        ['Boosted trees need categorical features, which premium data rarely includes', false],
      ], 'A tree assigns each region a constant, so outside the observed range it repeats the edge leaf. Whether extrapolating is wise is a separate question, but trees cannot do it.'),
    ],
    checkpoint: [
      mcq('Why do many lenders keep a logistic-regression scorecard as the approved decision model even when boosting scores higher?', [
        ['Each decision must be explained with reasons a regulator and applicant understand', true],
        ['Gradient boosting cannot output probabilities, which credit decisions require', false],
        ['Logistic regression always has a higher AUC on credit data than boosting does', false],
        ['Boosted models cannot be retrained, so they become stale within a few months', false],
      ], 'Lending decisions need adverse-action reasons and stable, auditable behaviour. Boosting is often used as a challenger or in areas like fraud where that constraint is looser.'),
      mcq('What does stacking train its final estimator on?', [
        ['Out-of-fold predictions of the base models', true],
        ['The base models\' training-set predictions', false],
        ['The raw features plus the test-set labels', false],
        ['Feature importances from each base model', false],
      ], 'Out-of-fold predictions are what each base model would say about unseen rows; in-sample predictions would be overconfident and the meta-model would trust them too much.'),
      mcq('A boosted model beats logistic regression by 0.04 AUC. Its top splits are at credit score 660 and EMI 50%. What is a sensible next step?', [
        ['Add those thresholds as features to the linear model and compare again', true],
        ['Deploy the boosted model at once, since its AUC lead settles the question', false],
        ['Drop credit score and EMI from both models, as they dominate every split', false],
        ['Raise the boosted model\'s depth until its lead over the line is even larger', false],
      ], 'The tree has discovered structure the line could not express. Given that structure, the linear model may close most of the gap while staying explainable.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_DEBUGGING',
    notes: `Ensembles are forgiving to train and easy to fool yourself with. Eight faults from the NBFC loan models in
this topic — symptom, cause, fix.

## 1. The perfect forest

**Symptom:** a notebook reports "random forest: AUC 1.000" and the team celebrates.
**Cause:** the AUC was computed on the training data. A default forest grows every tree to purity, so it reproduces
its training labels. The same forest's OOB AUC is **0.818** and its test AUC **0.835**.
**Fix:** never report training scores for trees. Use OOB (\`oob_decision_function_\`), cross-validation or a test set —
and compare train vs held-out only to *diagnose* overfitting.

## 2. XGBoost refuses the data frame

**Symptom:**

    ValueError: DataFrame.dtypes for data must be int, float, bool or category. ... Invalid columns:city_tier: str,
    employment: str

**Cause:** the categorical columns are plain strings.
**Fix:** \`astype("category")\` (test columns with the training categories) and \`enable_categorical=True\` — or
one-hot encode in a pipeline. Do not map categories to arbitrary integers and pretend they are ordered.

## 3. Early stopping on the test set

**Symptom:** a LightGBM model is reported at test AUC 0.86; on next quarter's loans it scores lower.
**Cause:** \`eval_set=[(X_te, y_te)]\` — the test set chose the number of trees, so the test score is a validation
score: the best of hundreds of looks.
**Fix:** split a validation set out of the **training** data (or use CV) for early stopping; the test set is touched
once, at the end.

## 4. A learning rate of 1.0

**Symptom:** \`GradientBoostingClassifier(learning_rate=1.0)\` scores **train AUC 0.692, test 0.646** — worse than one
depth-5 tree (0.818).
**Cause:** each tree takes a full step towards its residuals; on a noisy 0/1 target the steps overshoot and the fit
is unstable.
**Fix:** learning rate 0.03–0.1 with more trees, chosen by early stopping. At 0.1 × 100 trees, test AUC is 0.857.

## 5. An ID that matters

**Symptom:** a forest's \`feature_importances_\` puts \`application_no\` fourth — **0.126**, ahead of months employed
(0.121). The credit team asks why the application number predicts default.
**Cause:** it does not. Impurity importance is measured on training data; a column with 20,000 distinct values gives
unlimited trees endless split points to memorise. Permutation importance on the test set: **0.006** (credit score:
0.156).
**Fix:** drop identifiers before training, and report permutation importance on held-out data.

## 6. Probabilities four times too high

**Symptom:** expected-loss reports built on the LightGBM model forecast 26% of the book defaulting; actual is 6.4%.
**Cause:** \`scale_pos_weight=14.5\` up-weighted defaulters. AUC barely moved (0.843 vs 0.848) but the mean predicted
probability rose from 0.063 to **0.260**.
**Fix:** train unweighted and move the threshold, or recalibrate (the evaluation topic) before using scores as
probabilities.

## 7. max_iter that changes nothing

**Symptom:** \`HistGradientBoostingClassifier(max_iter=300)\` and \`max_iter=1000\` give identical results: test AUC
0.853, \`n_iter_\` 42 both times.
**Cause:** with more than 10,000 rows, \`early_stopping="auto"\` holds out 10% of the training data and stops after 10
rounds without improvement. With \`early_stopping=False\` at the default learning rate 0.1, the model **overfits**:
0.828 at 300 iterations, 0.798 at 1,000.
**Fix:** know which mode you are in. Either keep early stopping (and set \`validation_fraction\`,
\`n_iter_no_change\`, \`scoring\` deliberately) or turn it off and choose \`max_iter\` by CV.

## 8. Results that change every run

**Symptom:** a feature that "improved AUC by 0.004" makes it worse when re-run.
**Cause:** no \`random_state\`. The same 50-tree forest, three runs: **0.8521, 0.8534, 0.8473** — a spread of 0.006,
bigger than the claimed improvement.
**Fix:** fix \`random_state\` in the model, the split and the CV; judge changes by CV mean and standard deviation, not
by a single run.

## The order of checks when an ensemble looks too good — or too bad

1. Which data was the score computed on? (train / OOB / validation / test)
2. Did the test set influence any choice — early stopping, threshold, features?
3. Learning rate, number of trees and early stopping: which mode is on?
4. Categoricals typed consistently between train and test; identifiers dropped.
5. Weights or resampling used? Then the scores are not probabilities.
6. Seeds fixed, and differences compared with the fold-to-fold spread.`,
    mcqs: [
      mcq('A forest reports training AUC 1.000, OOB AUC 0.818 and test AUC 0.835. Which number describes how the model will do on new loans?', [
        ['The OOB and test figures, around 0.82–0.84', true],
        ['The training figure, since it used the most rows', false],
        ['The average of all three, about 0.88 overall', false],
        ['None, because forests cannot be evaluated on AUC', false],
      ], 'Unlimited trees reproduce their training labels, so the training AUC says nothing about generalisation. OOB and test predictions come from trees that did not see those rows.'),
      mcq('A boosted model\'s early stopping used eval_set=[(X_te, y_te)]. What is wrong with its reported test AUC?', [
        ['The test set chose the number of trees, so its score is optimistically biased', true],
        ['Nothing — early stopping needs the test set to measure generalisation properly', false],
        ['The test AUC will be too low, because early stopping always stops too soon', false],
        ['The model will crash at prediction time, since the test set was already used', false],
      ], 'Selecting the iteration that scores best on a set makes that set part of training. Use a validation split from the training data and keep the test set for one final look.'),
      mcq('application_no ranks fourth in a forest\'s impurity importance but scores 0.006 in permutation importance on the test set. What should be done?', [
        ['Drop the identifier and rely on permutation importance for reporting', true],
        ['Keep it, since impurity importance shows that it is a strong predictor', false],
        ['Bin it into deciles, so that the forest can use it in a meaningful way', false],
        ['Switch to XGBoost, which assigns identifiers the correct importance', false],
      ], 'High-cardinality columns offer many split points to memorise training rows. Permutation on held-out data shows the column adds nothing that generalises.'),
      mcq('The same 50-tree forest, without random_state, scores 0.8521, 0.8534 and 0.8473 in three runs. A new feature is said to add 0.004 AUC. What follows?', [
        ['The gain is inside run-to-run noise; fix seeds and compare CV means and spread', true],
        ['The gain is real, because any improvement in AUC above zero counts as a gain', false],
        ['Random forests are unreliable and should be replaced with one decision tree', false],
        ['The test set is too large, which is what makes the AUC vary from run to run', false],
      ], 'A spread of 0.006 between identical runs means a 0.004 difference proves nothing. Fixed seeds make runs reproducible; CV spread shows how big a real difference must be.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_PRACTICE',
    notes: `Six exercises. Work each on paper or in a notebook before reading the answer.

## Exercise 1 — How much does averaging help?

Each tree's predicted default probability for an applicant has variance σ² = 0.04, and any two trees' predictions
are correlated with ρ = 0.3. Using variance = ρσ² + (1 − ρ)σ²/B, compute the variance of the average for B = 10,
B = 100 and B → ∞. Then for ρ = 0.1, B = 100.

**Answer.** B = 10: 0.012 + 0.7 × 0.04 / 10 = **0.0148**. B = 100: 0.012 + 0.00028 = **0.01228**. B → ∞: **0.012** — the
floor ρσ². With ρ = 0.1 and B = 100: 0.004 + 0.00036 = **0.00436**. Going from 10 to 100 trees cut variance by 17%;
cutting the correlation cut it by another 64%. That is why random forests restrict features at each split.

## Exercise 2 — Boosting two rows by hand

Two loans have targets 50 and 30 (a regression, say a recovery amount in ₹ thousand). Start from their mean. Each
round, a stump separates the two rows perfectly and predicts each row's residual; the learning rate is 0.1. What are
the predictions after one round, two rounds and ten rounds?

**Answer.** Start at 40 for both; residuals +10 and −10. Round 1: 40 ± 0.1 × 10 = **41 and 39**. Round 2: residuals
±9, so **41.9 and 38.1**. In general the gap left shrinks by 0.9 each round: 40 ± 10 × (1 − 0.9ᵐ). After ten rounds:
1 − 0.9¹⁰ = 0.651, so **46.5 and 33.5**. Small learning rates approach the target slowly — which is the point.

## Exercise 3 — Out-of-bag arithmetic

A forest has 300 trees trained on 15,000 loans. About how many trees can give an out-of-bag prediction for any one
loan?

**Answer.** A loan is left out of a bootstrap sample with probability (1 − 1/15000)^15000 ≈ e⁻¹ = 0.368, so about
0.368 × 300 ≈ **110 trees**. Its OOB prediction averages those 110 — enough for a stable estimate.

## Exercise 4 — Reading an early-stopping log

Validation log loss every 100 iterations: 100 → 0.2010, 200 → 0.1902, 300 → 0.1871, 400 → 0.1866, 500 → 0.1869,
600 → 0.1875, 700 → 0.1880, 800 → 0.1890. With patience 200 rounds, where does training stop, and how many trees
does the final model use?

**Answer.** The best is **400** (0.1866). After 500 and 600 there have been 200 rounds without improvement, so training
**stops at 600** and the model keeps **400 trees**. (The log is checked every 100 here for simplicity; the library
checks every round.)

## Exercise 5 — Trading learning rate for trees

Early stopping chose 400 trees at learning rate 0.1, and training took 20 seconds. You want to try 0.05. Roughly how
many trees will early stopping choose, and how long will training take?

**Answer.** About **800 trees** — each contributes half as much — and about **40 seconds**, since time is roughly
proportional to the number of trees. Expect the validation score to be similar or slightly better; if it is not
better, keep 0.1.

## Exercise 6 — Choose the model

For each, name the model family you would start with and one reason: (a) 300 rows of hospital data, 12 features;
(b) 5 million card transactions with 200 features, many missing, for fraud scoring overnight; (c) a credit decision
where every rejected applicant must receive the three main reasons; (d) a Kaggle competition where the top 10 are
separated by 0.0005 AUC.

**Answer.** (a) **Regularised logistic regression** — too little data for trees to beat a line reliably. (b)
**LightGBM / XGBoost** — fast on large data, native missing values, interactions. (c) **A scorecard / logistic
regression** (or boosting with monotone constraints and careful reason codes) — explanations are a requirement. (d)
**Tuned boosting plus stacking or blending** — tiny gains are worth the complexity there and nowhere else.`,
    mcqs: [
      mcq('In Exercise 1, what is the variance of the average of infinitely many trees with σ² = 0.04 and ρ = 0.3?', [
        ['0.012, the floor set by the correlation between trees', true],
        ['0, since infinitely many trees remove all the variance', false],
        ['0.028, the part of the variance not due to correlation', false],
        ['0.04, the same as a single tree, as averaging adds none', false],
      ], 'As B grows, (1 − ρ)σ²/B vanishes but ρσ² = 0.3 × 0.04 = 0.012 remains. Only lowering ρ reduces it further.'),
      mcq('In Exercise 2, what are the two predictions after two boosting rounds with learning rate 0.1?', [
        ['41.9 and 38.1', true],
        ['42.0 and 38.0', false],
        ['41.0 and 39.0', false],
        ['45.0 and 35.0', false],
      ], 'Round 1 moves each row 1.0 towards its target (to 41 and 39). The residuals are then ±9, so round 2 moves 0.9 more: 41.9 and 38.1.'),
      mcq('In Exercise 3, about how many of 300 trees give an out-of-bag prediction for one loan?', [
        ['About 110', true],
        ['About 190', false],
        ['About 150', false],
        ['About 30', false],
      ], 'Each tree leaves out a given row with probability about 0.368, and 0.368 × 300 ≈ 110. 190 is the number of trees that did see it.'),
      mcq('In Exercise 4, with patience 200, how many trees does the final model keep?', [
        ['400 trees, the best iteration', true],
        ['600 trees, where training stopped', false],
        ['800 trees, the last one logged', false],
        ['500 trees, one step past the best', false],
      ], 'Training stops once 200 rounds pass without improving on 0.1866 (at 600), but the model is rolled back to the best iteration, 400.'),
      mcq('In Exercise 6, why start the 300-row hospital problem with regularised logistic regression?', [
        ['With so little data, a simple regularised model is the least likely to overfit', true],
        ['Gradient boosting cannot be trained on fewer than a thousand rows of data', false],
        ['Hospital data is always linear, so trees would add no value in any case', false],
        ['Logistic regression needs no validation, which saves rows for training', false],
      ], 'Tree ensembles need data to find splits reliably; with 300 rows their variance dominates. A penalised line has few parameters and still needs honest validation.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_INTERVIEW_QUESTION',
    notes: `Ensemble questions appear in nearly every data-science interview for a tabular role — fintech, insurance,
e-commerce and consulting firms all run gradient boosting in production. The interviewer checks that you understand
*why* the methods work, that you tune them without fooling yourself, and that you know when not to use them.

## 1. "What is the difference between a random forest and gradient boosting?"

**Model answer.** "Both combine many decision trees, in opposite ways. A random forest grows deep trees
independently, each on a bootstrap sample of the rows and with a random subset of features considered at each split,
and averages them. Each tree has low bias and high variance; averaging decorrelated trees cancels much of the
variance. Adding trees never overfits — it just stops helping.

Gradient boosting grows small trees one after another. Each new tree is fitted to the gradient of the loss — for
squared error, the residuals — of the ensemble so far, and is added with a learning rate. It reduces bias step by
step, so it can overfit as trees are added, and the number of trees is chosen by early stopping.

In practice boosting is usually a little more accurate on tables and needs more careful tuning; a forest is a strong,
forgiving baseline. On an NBFC default dataset I worked with, a single deep tree scored AUC 0.58, a tuned forest
0.854 and tuned boosting about 0.85–0.86."

**Follow-ups:**
- *"Why do forests use random features at each split?"* To lower the correlation between trees: the average's
  variance has a floor of ρσ², which more trees cannot remove.
- *"Can a random forest overfit?"* Individual trees do, and with very noisy targets larger leaves help; but adding
  more trees does not make it worse.

## 2. "How would you tune an XGBoost or LightGBM model?"

**Model answer.** "First I'd fix a small learning rate, say 0.03 to 0.05, and let early stopping on a validation split
from the training data choose the number of trees — stopping on log loss, which is smoother than AUC. Then a
randomised search with stratified 5-fold CV over the parameters that matter: tree complexity (num_leaves or
max_depth, min_child_samples), and row and column subsampling. Regularisation penalties last.

I'd read the results table, not just the winner — if the top configurations are within a standard deviation, I pick
the simplest in that region. The test set is used once at the end. I've seen the best of 60 configurations on a small
validation set score AP 0.475 there and 0.344 on test — choosing on a small set selects luck."

**Follow-ups:**
- *"What does num_leaves do in LightGBM?"* It caps leaves per tree; LightGBM grows leaf-wise, so this is its main
  complexity control. 15 leaves is in the range of depth 4.
- *"How do you handle class imbalance in boosting?"* Usually not at all in training — use a threshold from costs.
  scale_pos_weight helps ranking little and makes the scores stop being probabilities.

## 3. "XGBoost scores 0.02 AUC above logistic regression on our loan data. Which do we deploy?"

**Model answer.** "It depends on what the 0.02 is worth and what it costs. First I'd check whether the gap is real:
cross-validated, with its spread, on a time-based split that looks like deployment. Then I'd ask what the boosted
model found — its top splits and SHAP dependence often show thresholds or interactions, like credit score below 660
or EMI over 50% of income. Added as features, those often let logistic regression close most of the gap; on one
dataset, five such features took logistic regression from 0.810 to 0.851, level with tuned LightGBM.

If the gap stays, the decision is a business one. For credit approval, regulators and customers need reasons for
each decline, so many lenders keep a scorecard as the decision model and run boosting as a challenger. For fraud or
collections prioritisation, where the score ranks work rather than refusing a customer, I'd deploy the boosted model
— with monotonic constraints where the direction must make sense, and calibration if the score is used as a
probability."

**Follow-ups:**
- *"What are monotone constraints?"* A parameter that forces the prediction to only rise (or fall) with a feature —
  e.g. risk never decreasing as prior defaults increase — which makes the model safer and easier to defend.
- *"Would you stack them?"* Only if they make different errors and the gain justifies maintaining several models; in
  my comparison a stack matched LightGBM at 40 times the training cost.

## How to answer ensemble questions well

Explain the mechanism in one sentence each (averaging reduces variance; sequential fitting reduces bias). Name the
two or three parameters that matter. Always say how you validated, and always bring the decision back to what the
model is used for.`,
    mcqs: [
      mcq('An interviewer asks why adding trees cannot make a random forest overfit, but can make gradient boosting overfit. Which answer is right?', [
        ['A forest averages independent trees; boosting keeps fitting what is left, noise included', true],
        ['A forest prunes every tree automatically, but boosting never prunes any of its trees', false],
        ['Boosting uses deeper trees than a forest, so each added tree is more likely to overfit', false],
        ['A forest uses a smaller learning rate than boosting does, which protects it from noise', false],
      ], 'Averaging more forest trees only reduces variance further. Each boosting tree reduces the remaining training error, which eventually means fitting noise — hence early stopping.'),
      mcq('Which tuning plan for LightGBM would an interviewer find most convincing?', [
        ['Small learning rate, early stopping on validation, CV random search, one test look', true],
        ['A full grid over every parameter, scored on the test set to find the true optimum', false],
        ['Default parameters, since LightGBM is already tuned for most tabular problems', false],
        ['A learning rate of 1.0, to converge quickly, and then as many trees as time allows', false],
      ], 'Early stopping removes n_estimators from the search, CV random search covers the few parameters that matter, and the untouched test set gives the honest final number.'),
      mcq('Boosting beats logistic regression by 0.02 AUC on a credit-approval model. What is the strongest answer about which to deploy?', [
        ['Check the gap is real, try its splits as linear features, then weigh explainability', true],
        ['Deploy boosting at once, as any AUC gain is worth more than an explanation is', false],
        ['Deploy logistic regression, as boosting is never allowed in Indian lending', false],
        ['Average the two models, which is always better than choosing between them', false],
      ], 'A good answer verifies the gap with honest validation, uses what the tree found to strengthen the simpler model, and lets the use — approval decisions needing reasons — decide.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_MINI_PROJECT',
    notes: `# Mini Project — Loan Default Prediction for an NBFC

A mid-sized NBFC disburses unsecured personal loans of ₹50,000 to ₹10 lakh through its branches, its app and
direct selling agents (DSAs). About one loan in thirteen goes 90+ days past due within a year, and the credit team
wants a model that ranks new applications by risk. You will build it: leakage checks, a logistic baseline, a random
forest and a tuned LightGBM with early stopping, a comparison on PR-AUC, and a short note on which applicants the
model would decline and why.

## The data

Generate it with this script (seed fixed: 26,500 loans over 24 months, 7.6% defaulted). It contains **deliberate
traps**; finding them is part of the project.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2026)
    n = 24000
    month = np.sort(rng.integers(1, 25, n))                   # disbursal month 1..24 (Apr 2023 = 1)
    income = np.round(rng.lognormal(np.log(36000), 0.5, n), -2)
    ntc = rng.random(n) < 0.14                                # new to credit: no bureau score
    score = np.clip(np.round(rng.normal(705, 65, n)), 300, 900)
    emi = np.round(np.clip(rng.normal(37, 12, n), 5, 85), 1)
    tenure_m = rng.choice([12, 24, 36, 48], n, p=[0.2, 0.35, 0.3, 0.15])
    amount = np.round(rng.lognormal(np.log(220000), 0.55, n), -3)
    months_emp = rng.integers(1, 240, n)
    age = rng.integers(21, 60, n)
    enq = rng.poisson(1.6, n)
    job = rng.choice(["Salaried", "Self-employed", "Gig"], n, p=[0.6, 0.3, 0.1])
    channel = rng.choice(["Branch", "App", "DSA"], n, p=[0.35, 0.40, 0.25])   # DSA = direct selling agent
    city = rng.choice([f"City_{i:03d}" for i in range(1, 181)], n)
    z = (-4.0 + np.where(ntc, 0.9, np.where(score < 650, 1.4, 0.0) + np.where(score < 600, 1.0, 0.0))
         + np.where(emi > 50, 1.8, 0.012 * (emi - 37)) + 0.12 * enq
         + np.where((job == "Gig") & (income < 30000), 1.5, 0.0) + np.where(channel == "DSA", 0.5, 0.0)
         - 0.007 * np.clip(months_emp - 60, -60, 60) + np.where(age < 25, 0.6, 0.0)
         + np.where(month >= 16, 0.35, 0.0))                  # the book got riskier in the second year
    default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    df = pd.DataFrame({
        "applicant_id": [f"A{i:06d}" for i in range(1, n + 1)],
        "disbursal_month": month, "monthly_income": income.astype(int),
        "credit_score": np.where(ntc, np.nan, score), "emi_to_income_pct": emi, "loan_amount": amount.astype(int),
        "tenure_months": tenure_m, "months_employed": months_emp, "age": age, "bureau_enquiries_6m": enq,
        "employment": job, "channel": channel, "city": city,
        "max_dpd_first_6m": np.where(default == 1, rng.integers(30, 120, n), rng.choice([0, 0, 0, 5, 15], n)),
        "collection_calls": np.where(default == 1, rng.poisson(9, n), rng.poisson(0.6, n)),
        "defaulted": default,
    })
    # 2,500 top-up loans: the same applicant borrows again a few months later, with the same outcome
    src = df.sample(2500, random_state=1)
    top = src.assign(disbursal_month=np.minimum(src.disbursal_month + rng.integers(2, 7, 2500), 24),
                     loan_amount=(src.loan_amount * 0.5).round(-3).astype(int),
                     bureau_enquiries_6m=src.bureau_enquiries_6m + 1)
    df = pd.concat([df, top]).sort_values("disbursal_month", kind="stable").reset_index(drop=True)
    df.insert(0, "loan_id", [f"L{i:06d}" for i in range(1, len(df) + 1)])
    n = len(df)
    dsa = df.channel == "DSA"
    df.loc[dsa & (rng.random(n) < 0.3), "monthly_income"] *= 12      # some DSA files record ANNUAL income
    df.loc[rng.choice(n, 400, replace=False), "emi_to_income_pct"] = np.nan
    df.to_csv("nbfc_loans.csv", index=False)

The model will score applications **at the time of application**. Every column must be judged against that moment.

| Column | Meaning |
|---|---|
| loan_id, applicant_id | Loan and applicant identifiers |
| disbursal_month | 1 = April 2023 … 24 = March 2025 |
| monthly_income | Declared monthly income, ₹ |
| credit_score | Bureau score 300–900; empty for new-to-credit applicants |
| emi_to_income_pct | All EMIs, including this loan, as % of income; some missing |
| loan_amount, tenure_months | Loan size (₹) and term |
| months_employed, age, employment | Applicant profile |
| bureau_enquiries_6m | Credit enquiries in the six months before applying |
| channel | Branch, App or DSA |
| city | One of 180 cities |
| max_dpd_first_6m | Worst days-past-due in the first six months of the loan |
| collection_calls | Calls made by the collections team on this loan |
| defaulted | **Target**: 90+ days past due within 12 months of disbursal |

**The economics (from the credit team):** an approved loan that repays earns about **₹18,000** of net interest and
fees; a default loses about **₹1,20,000** after recoveries.

## Tasks

1. **Frame it.** Prediction moment, target, the decision the score drives (approve, decline, or refer to manual
   review), and the metrics: PR-AUC (average precision) as the headline, ROC-AUC alongside — say why PR-AUC.
2. **Data audit.** For every column: when is it known? Find the **leaking columns** and show the effect of
   including them (test AUC with them is essentially 1.0). Find and fix the **income recorded as annual** in some
   DSA files, and decide what to do with missing credit scores and EMI ratios. Explain why \`city\` (180 values) needs
   care.
3. **Split honestly.** Train on months 1–18, test on months 19–24 (7,046 loans, 9.2% defaulted against 7.1% in
   training). Inside the training months, use **GroupKFold or StratifiedGroupKFold by applicant_id** — top-up loans
   repeat an applicant and their outcome, so a random split puts the same person on both sides. Show the difference
   it makes for one model.
4. **Baselines.** A \`DummyClassifier\` and a regularised **logistic regression** in a pipeline (imputation with
   missing indicators, scaling, one-hot encoding).
5. **Random forest** in a pipeline, with \`min_samples_leaf\` chosen by grouped CV.
6. **LightGBM** with native categoricals and missing values: a small learning rate, **early stopping** on a
   validation set carved from the training months (the latest months, or a grouped split), then a randomised search
   over tree complexity and subsampling with grouped CV.
7. **Compare** the three on grouped-CV PR-AUC (mean ± sd) and then once on the test months: PR-AUC, ROC-AUC and
   precision/recall at the chosen cut-off.
8. **Decline policy.** Using the economics, compute the break-even default probability (decline when expected loss
   exceeds expected profit). Report, for the test months, how many applications would be declined, the defaults
   avoided, the good customers lost and the net ₹ effect against approving everyone. If you used class weights, say
   how you made the scores probabilities again.
9. **Who is declined, and why.** Describe the declined applicants in plain terms (score bands, EMI burden,
   employment, channel), using permutation importance or SHAP on the test months. Flag anything a credit committee
   would question — for example, a large role for the DSA channel.

## Deliverables

1. **\`loan_default.ipynb\`** — runs top to bottom after "Restart & Run All".
2. **\`decline_note.pdf\`** (or .docx), **one to two pages** for the credit committee: the recommended model and cut-off,
   the ₹ effect, who would be declined and why, what the model cannot see, and the monitoring you propose.
3. **\`README.md\`** — how to run it; library versions (pandas, NumPy, scikit-learn, LightGBM).

## Acceptance criteria

- Both post-disbursal columns are identified as leakage, their effect shown, and neither is used.
- The annual-income rows are detected (e.g. DSA incomes far above other channels) and corrected or flagged, with the
  rule stated.
- Training uses months 1–18 only; CV is grouped by applicant; the test months are scored once.
- Early stopping uses data from the training months only, and the chosen number of trees is reported.
- The three models are compared by PR-AUC with spread, and the dummy's PR-AUC (the base rate) is shown.
- The decline cut-off comes from the economics, and its ₹ effect is reported on the test months.
- The note explains declines in plain words and names at least one limitation (drift between years, new-to-credit
  applicants, reject inference — the model only learns from loans that were approved).`,
    mcqs: [
      mcq('The loan file contains max_dpd_first_6m and collection_calls. Why must both be excluded from an application-time model?', [
        ['Both are recorded after the loan is disbursed, so they describe the outcome', true],
        ['Both are numeric, and LightGBM handles numeric columns poorly without scaling', false],
        ['Both have missing values, which a pipeline cannot impute in a fair way', false],
        ['Both are weak predictors, so including them only adds noise to the model', false],
      ], 'Days past due and collections activity exist only after repayment problems begin. At application time they are unknown, and including them gives an AUC near 1.0 that means nothing.'),
      mcq('A good loan earns ₹18,000 and a default loses ₹1,20,000. Above what predicted default probability should an application be declined?', [
        ['About 0.13', true],
        ['About 0.15', false],
        ['About 0.50', false],
        ['About 0.87', false],
      ], 'Approve when (1 − p) × 18,000 > p × 1,20,000, i.e. p < 18,000 / 1,38,000 ≈ 0.130. 0.15 is 18,000 / 1,20,000, which forgets that the profit is only earned when the loan repays.'),
    ],
    assignment: {
      title: 'Loan Default Prediction for an NBFC',
      description: 'Build an application-time default model for personal loans: audit the data for leakage and errors, validate by time and by applicant, compare logistic regression, a random forest and a tuned LightGBM with early stopping on PR-AUC, and recommend a decline cut-off with its rupee effect.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`loan_default.ipynb\` — generates the data with the brief's script, then: framing; a column-by-column audit (the
   two leaking columns and their effect, the annual-income rows and your rule, missing values, the city column);
   a time split (months 1–18 / 19–24) with CV grouped by applicant and the random-vs-grouped comparison; the dummy and
   logistic baselines; a tuned random forest; LightGBM with early stopping and a randomised search; the comparison by
   grouped-CV PR-AUC with spread and one test-month evaluation; the break-even cut-off and its ₹ effect against
   approving everyone; and the drivers of declines. It must run top to bottom after "Restart & Run All".
2. \`decline_note.pdf\` or \`.docx\`, one to two pages — recommendation first: model, cut-off, ₹ effect, who is declined
   and why, limits, monitoring.
3. \`README.md\` — how to run it and the library versions.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Leaking columns: …; test AUC with them …").`,
      rubric: [
        { criterion: 'Data audit and leakage', description: 'Every column judged against the application moment; both post-disbursal columns found, their effect shown and excluded; annual-income rows detected and handled with a stated rule; missing scores and EMI ratios handled deliberately; the city column treated with care.', maxPoints: 25 },
        { criterion: 'Honest validation', description: 'Time split with the test months used once; CV grouped by applicant with the random-vs-grouped difference shown; early stopping and search use training months only; base rate and dummy PR-AUC reported.', maxPoints: 25 },
        { criterion: 'Models and comparison', description: 'Logistic baseline, tuned random forest and LightGBM with early stopping and a randomised search, all in pipelines or with consistent preprocessing; compared by PR-AUC with spread and one test evaluation; the choice justified, not just the highest number.', maxPoints: 25 },
        { criterion: 'Decision and communication', description: 'Break-even cut-off computed from the economics; declines, defaults avoided, good customers lost and net ₹ effect reported; scores treated as probabilities only if calibrated; the note explains declines plainly and names limits such as drift and reject inference; README and versions included.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ENSEMBLES_CHECKPOINT',
    notes: `Ten questions across the topic: bagging and random forests, boosting, XGBoost and LightGBM, tuning with early
stopping, and choosing a model. Several give numbers — work them out before looking at the options.`,
    checkpoint: [
      mcq('Trees in a forest each have prediction variance 0.05 and pairwise correlation 0.2. What is the variance of the average of 50 trees?', [
        ['About 0.0108', true],
        ['About 0.0010', false],
        ['About 0.0100', false],
        ['About 0.0500', false],
      ], 'ρσ² + (1 − ρ)σ²/B = 0.2 × 0.05 + 0.8 × 0.05 / 50 = 0.010 + 0.0008 = 0.0108. 0.0010 is σ²/B, which ignores the correlation.'),
      mcq('Which parameter mainly separates a random forest from plain bagging of trees?', [
        ['max_features, the features considered at each split', true],
        ['n_estimators, the number of trees in the ensemble', false],
        ['bootstrap, whether rows are sampled with replacement', false],
        ['min_samples_leaf, the smallest leaf a tree may have', false],
      ], 'Bagging already uses bootstrap samples and many trees. Restricting the candidate features at each split is what decorrelates a forest\'s trees.'),
      mcq('A boosted regression starts at 60. A row\'s target is 80, and every round a tree predicts its full residual. With learning rate 0.2, what is the prediction after two rounds?', [
        ['67.2', true],
        ['68.0', false],
        ['64.0', false],
        ['72.0', false],
      ], 'Round 1: 60 + 0.2 × 20 = 64. Round 2: residual 16, so 64 + 0.2 × 16 = 67.2. 68.0 would add 0.2 × 20 twice, forgetting that the residual shrinks.'),
      mcq('Gradient boosting with learning rate 0.3 scores test AUC 0.857 at 50 trees and 0.805 at 400. What is the standard remedy?', [
        ['Early stopping on a validation set, with a smaller learning rate', true],
        ['More trees, since boosting needs more rounds to undo overfitting', false],
        ['Deeper trees, so each round fits the residuals more completely', false],
        ['Bootstrap the rows for each tree, which makes it a random forest', false],
      ], 'Boosting overfits as rounds accumulate. Stopping where validation loss is lowest, at a gentler learning rate, is the usual fix.'),
      mcq('Which LightGBM pair of parameters mainly controls the complexity of each tree?', [
        ['num_leaves and min_child_samples', true],
        ['learning_rate and n_estimators', false],
        ['subsample and subsample_freq', false],
        ['reg_alpha and scale_pos_weight', false],
      ], 'LightGBM grows leaf-wise, so the leaf cap and the minimum rows per leaf bound how intricate each tree can get. The other pairs control steps, row sampling and penalties or weighting.'),
      mcq('Early stopping with patience 50 sees the best validation loss at iteration 310 and stops at 360. How many trees does the model use to predict?', [
        ['310', true],
        ['360', false],
        ['50', false],
        ['410', false],
      ], 'Training runs 50 rounds past the best to confirm no improvement, then the model uses the best iteration. LightGBM and XGBoost both predict with best_iteration by default after early stopping.'),
      mcq('Why is randomised search usually preferred to grid search for boosted models?', [
        ['Few parameters matter, and random draws try more distinct values of each', true],
        ['Randomised search is guaranteed to find the global optimum of the grid', false],
        ['Grid search cannot use cross-validation, but randomised search can do so', false],
        ['Randomised search does not need a scoring metric, which saves effort', false],
      ], 'A grid wastes most fits varying unimportant parameters. With the same budget, random sampling explores many more values of the few that matter.'),
      mcq('Which situation most favours a regularised logistic regression over boosted trees?', [
        ['A few hundred rows and decisions that must each be explained', true],
        ['Millions of rows with many missing values and interactions', false],
        ['A leaderboard where tiny AUC differences decide the ranking', false],
        ['Hundreds of categorical columns with very high cardinality', false],
      ], 'Little data and a need for clear reasons both favour a simple, penalised linear model. The other settings are where boosting shines.'),
      mcq('A LightGBM model is retrained with scale_pos_weight equal to negatives / positives. What usually happens?', [
        ['Ranking barely changes, but the predicted probabilities rise far above the true rate', true],
        ['Ranking improves sharply, and the predicted probabilities stay perfectly calibrated', false],
        ['Training fails unless the dataset has first been balanced by undersampling it', false],
        ['The number of trees chosen by early stopping falls to zero on most datasets', false],
      ], 'Up-weighting positives shifts scores upward; on the NBFC data AUC went from 0.848 to 0.843 while the mean predicted default rose from 0.063 to 0.260.'),
      mcq('Five configurations are compared by a single validation score on 100 positives, and the best wins by 0.01 AP. What is the right reading?', [
        ['The lead may be noise; compare with cross-validation and its spread', true],
        ['The lead is decisive, since any AP difference is a real improvement', false],
        ['The test set should now be used to break the tie between the leaders', false],
        ['AP cannot compare models, so the score should be replaced by accuracy', false],
      ], 'With 100 positives, AP moves by more than 0.01 from sampling alone. Cross-validated means with standard deviations show whether the gap exceeds the noise; the test set stays untouched.'),
    ],
  },

  /* ══ DS_EVALUATION ══════════════════════════════════════════════════════════════════════ */

  /* ── CLASSIFIER_METRICS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_CLASSIFIER_METRICS',
    notes: `The classification topic introduced precision, recall and average precision on a default model. This unit
goes deeper: which metric to lead with when positives are rare, why ROC-AUC and PR-AUC can tell different stories,
and how to turn a confusion matrix into rupees — which is the only form a business owner will act on.

## The data used in this topic

A general insurer's motor claims over 24 months. Every claim the investigation team examined has a label: was it
fraudulent? About 3.5% were.

    import numpy as np
    import pandas as pd

    def make_claims(n=30000, seed=8):
        rng = np.random.default_rng(seed)
        month = np.sort(rng.integers(1, 25, n))                                   # claim month 1..24
        garage = rng.integers(1, 401, n)                                          # 400 garages
        ring = np.isin(garage, rng.choice(np.arange(1, 401), 25, replace=False))   # 25 garages tied to fraud rings
        region = rng.choice(["Metro", "Urban", "Rural"], n, p=[0.40, 0.38, 0.22])
        channel = rng.choice(["Agent", "Online", "Bank"], n, p=[0.50, 0.35, 0.15])
        policy_days = np.where(rng.random(n) < 0.12, rng.integers(1, 90, n), rng.integers(90, 1500, n))
        vehicle_age = rng.integers(0, 15, n)
        amount = np.round(rng.lognormal(np.log(45000), 0.7, n), -2)               # claim amount ₹
        prior = rng.poisson(0.4, n)
        night = (rng.random(n) < 0.18).astype(int)
        police = (rng.random(n) < np.where(region == "Rural", 0.35, 0.65)).astype(int)
        late = month >= 19
        z = (-5.0 + np.where(policy_days < 60, 2.2, 0.0) + np.where(policy_days < 15, 1.0, 0.0)
             + 1.3 * np.log(amount / 45000) + 0.5 * prior + 1.0 * night - 0.9 * police
             + np.where(ring, 1.8, 0.0) + 0.06 * vehicle_age
             + np.where(late & (channel == "Online"), 1.2, 0.0))                  # a new online pattern from month 19
        fraud = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
        return pd.DataFrame({"claim_month": month, "garage_id": garage, "region": region, "channel": channel,
                             "policy_age_days": policy_days, "vehicle_age": vehicle_age,
                             "claim_amount": amount.astype(int), "prior_claims": prior,
                             "night_incident": night, "police_report": police, "fraud": fraud})

    claims = make_claims()
    NUM = ["policy_age_days", "vehicle_age", "claim_amount", "prior_claims", "night_incident", "police_report"]
    CAT = ["region", "channel"]
    train = claims[claims.claim_month <= 18]      # 22,431 claims, 705 frauds (3.1%)
    test = claims[claims.claim_month >= 19]       # 7,569 claims, 351 frauds (4.6%)

The split is by time — the model is trained on the past and judged on the six months after it, as it would be
used. (The validation-strategy unit shows why, and the simulation hides two surprises in the later months that
the rest of this topic uncovers.) Two models, both in pipelines:

    logreg = make_pipeline(ColumnTransformer([("num", StandardScaler(), NUM),
                                              ("cat", OneHotEncoder(handle_unknown="ignore"), CAT)]),
                           LogisticRegression(max_iter=1000))
    gbm = make_pipeline(ColumnTransformer([("num", "passthrough", NUM),
                                           ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT)]),
                        HistGradientBoostingClassifier(learning_rate=0.05, max_iter=300, max_leaf_nodes=15,
                                                       random_state=0))

## The confusion matrix at several thresholds (boosted model, test months)

    threshold  flagged   TP    FP    FN     TN    precision  recall    F1     F2    accuracy
       0.50       19     13     6   338   7212      0.684     0.037  0.070  0.046    0.955
       0.20      216     89   127   262   7091      0.412     0.254  0.314  0.275    0.949
       0.10      477    135   342   216   6876      0.283     0.385  0.326  0.359    0.926
       0.05     1012    198   814   153   6404      0.196     0.564  0.291  0.410    0.872

- **Accuracy** is highest at 0.5, where the model catches 13 of 351 frauds — and "flag nothing" scores 0.954.
- **Precision** = TP / flagged: of the claims sent to investigators, how many are fraud.
- **Recall** (sensitivity, TPR) = TP / all frauds: how much fraud is caught.
- **F1** is their harmonic mean and treats them as equally important. **F-beta** weights recall β times as much:
  \`fbeta_score(y, y_hat, beta=2)\` for when a miss is worse than a false alarm. F2 prefers 0.05; F1 prefers 0.10.
- **Specificity** = TN / (TN + FP) and the **false positive rate** = 1 − specificity: the share of genuine
  claimants put through an investigation.

None of these choose the threshold for you; they describe the trade-off at each one.

## Threshold-free: ROC-AUC vs PR-AUC

    from sklearn.metrics import roc_auc_score, average_precision_score
                          ROC-AUC   PR-AUC (average precision)
    logistic regression    0.778         0.198
    boosted model          0.824         0.283
    random ranking         0.500         0.046  (the fraud rate)

**ROC-AUC** is the probability that a random fraud is scored above a random genuine claim. It plots TPR against FPR,
and FPR's denominator is the 7,218 genuine claims — so thousands of false alarms barely move it. **PR-AUC** plots
precision against recall; precision's denominator is the flagged claims, so false alarms hit it directly, and its
random baseline is the prevalence.

The difference shows when the prevalence changes. Add two more copies of every genuine claim to the test set (fraud
rate 4.6% → 1.6%; same model, same scores):

    ROC-AUC 0.824 → 0.824        PR-AUC 0.283 → 0.140        precision at 0.10: 0.283 → 0.115

ROC-AUC is unchanged because neither TPR nor FPR depends on the class ratio. Precision does — and precision is what
the investigation team feels, as wasted visits. With rare positives, **lead with PR-AUC and precision/recall at an
operating point**; report ROC-AUC alongside, and never compare PR-AUC across datasets with different base rates
without stating them.

## The confusion matrix as money

From the claims team: an investigation costs **₹5,000**; a fraud caught saves the payout, about **₹60,000** on average;
investigating a genuine claim adds a delay that costs about **₹2,000** in goodwill and complaints. So each TP is worth
₹55,000 and each FP costs ₹7,000; FN and TN cost nothing *relative to doing nothing*.

    def net_value(y, p, t):
        flag = p >= t
        tp = (flag & (y == 1)).sum(); fp = (flag & (y == 0)).sum()
        return 55000 * tp - 7000 * fp

    threshold  investigated   TP    FP    net value
       0.50          19       13      6     ₹6.7 lakh
       0.20         216       89    127    ₹40.1 lakh
       0.11         444      134    310    ₹52.0 lakh
       0.08         590      153    437    ₹53.6 lakh
       0.05        1012      198    814    ₹51.9 lakh
       0.03        1743      243   1500    ₹28.7 lakh
     everyone      7569      351   7218   −₹312.2 lakh

The break-even probability is 7,000 / (55,000 + 7,000) = **0.113**: investigate when p × 55,000 > (1 − p) × 7,000. On the
test months the value curve is flat between about 0.05 and 0.11 and peaks a little below break-even — a first hint
that the model's probabilities run low on these months (the calibration unit finds out why). As always, the
threshold is chosen on training-period data, not on this table.

## Which metric, when

| Situation | Lead with |
|---|---|
| Rare positives, a team works the flagged cases | Precision at the team's capacity; PR-AUC |
| Missing a positive is very costly (screening) | Recall at an acceptable precision; F2 |
| Ranking for a campaign | Lift / gains (next unit) |
| The score is used as a probability (pricing, reserves, expected loss) | Log loss, Brier score, calibration |
| Comparing models across segments with different base rates | ROC-AUC, with the base rates stated |
| Every decision has a cost | Net value in ₹ at the chosen threshold |`,
    mcqs: [
      mcq('Adding two extra copies of every genuine claim to a test set leaves ROC-AUC at 0.824 but halves PR-AUC. Why?', [
        ['ROC-AUC ignores the class ratio; precision falls as genuine claims multiply', true],
        ['ROC-AUC is computed only on frauds, so the new genuine claims are not seen', false],
        ['PR-AUC is unstable and should not be reported on any imbalanced dataset', false],
        ['The model was retrained on the new test set, which lowered its precision', false],
      ], 'TPR and FPR are ratios within each class, so duplicating a class leaves them unchanged. Precision divides by all flagged claims, so three times as many false alarms per fraud lowers it.'),
      mcq('An investigation costs ₹5,000, a caught fraud saves ₹60,000, and investigating a genuine claim costs ₹2,000 in goodwill. Above what fraud probability should a claim be investigated?', [
        ['About 0.11', true],
        ['About 0.08', false],
        ['About 0.03', false],
        ['About 0.50', false],
      ], 'A TP is worth ₹55,000 and an FP costs ₹7,000, so investigate when p × 55,000 > (1 − p) × 7,000, i.e. p > 7,000 / 62,000 ≈ 0.113.'),
      mcq('Why does F2 prefer a lower threshold than F1 on the claims model?', [
        ['F2 weights recall more than precision, and a lower threshold buys recall', true],
        ['F2 weights precision more than recall, and a lower threshold buys precision', false],
        ['F2 is computed on squared errors, which grow as the threshold is lowered', false],
        ['F2 ignores false positives entirely, so it always picks the lowest threshold', false],
      ], 'F-beta treats recall as β times as important as precision. With β = 2, catching more frauds at 0.05 outweighs the drop in precision; F1 balances them and prefers 0.10.'),
    ],
    checkpoint: [
      mcq('A fraud model flags 477 claims, 135 of them fraud, out of 351 frauds in 7,569 claims. What are precision and recall?', [
        ['Precision 0.283 and recall 0.385', true],
        ['Precision 0.385 and recall 0.283', false],
        ['Precision 0.283 and recall 0.063', false],
        ['Precision 0.046 and recall 0.385', false],
      ], 'Precision = 135 / 477 = 0.283 (of the flagged, how many fraud). Recall = 135 / 351 = 0.385 (of the frauds, how many flagged).'),
      mcq('What is the PR-AUC of a model that ranks claims at random, when 4.6% are fraudulent?', [
        ['About 0.046', true],
        ['About 0.500', false],
        ['About 0.954', false],
        ['About 0.000', false],
      ], 'A random ranking has precision equal to the prevalence at every recall, so its average precision is the base rate. 0.5 is the random level of ROC-AUC.'),
      mcq('Which metric should lead for a model whose probabilities feed an insurer\'s claims reserve?', [
        ['A probability metric — log loss or Brier score, with a calibration check', true],
        ['Recall at a threshold of 0.5, since it counts the frauds that are caught', false],
        ['ROC-AUC, because it does not depend on the base rate of the portfolio', false],
        ['Accuracy, since it summarises all four cells of the confusion matrix', false],
      ], 'A reserve multiplies probabilities by amounts, so the numbers themselves must be right. Ranking metrics like AUC say nothing about whether p = 0.1 means 10%.'),
    ],
  },

  /* ── LIFT_GAINS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_LIFT_GAINS',
    notes: `A claims head does not ask for an AUC. She asks: "My team can investigate 50 claims a month. If we take the
model's top 50, how many frauds do we find, compared with what we do now?" Lift and gains charts answer exactly
that, and they are the standard way marketing, collections and fraud teams judge a scoring model.

## Rank, then cut into deciles

Sort the 7,569 test-month claims by the boosted model's score, highest first, and cut them into ten equal groups:

    d = pd.DataFrame({"p": p_gbm, "y": y_test}).sort_values("p", ascending=False).reset_index(drop=True)
    d["decile"] = np.arange(len(d)) * 10 // len(d) + 1
    g = d.groupby("decile").agg(claims=("y", "size"), frauds=("y", "sum"), min_p=("p", "min"))
    g["fraud_rate"] = g.frauds / g.claims
    g["lift"] = g.fraud_rate / d.y.mean()
    g["cum_capture"] = g.frauds.cumsum() / d.y.sum()
    g["cum_lift"] = g.cum_capture / (g.index / 10)

    decile  claims  frauds  min_p   fraud_rate   lift   cum_capture   cum_lift
       1      757     179   0.064      0.236     5.09       0.510        5.10
       2      757      52   0.034      0.069     1.49       0.658        3.29
       3      757      41   0.023      0.054     1.16       0.775        2.58
       4      757      19   0.017      0.025     0.54       0.829        2.07
       5      757      20   0.013      0.026     0.56       0.886        1.77
       6      757      16   0.010      0.021     0.45       0.932        1.55
       7      757      10   0.007      0.013     0.28       0.960        1.37
       8      757       9   0.005      0.012     0.26       0.986        1.23
       9      757       2   0.003      0.003     0.06       0.991        1.10
      10      756       3   0.001      0.004     0.09       1.000        1.00

## Reading it

- **Lift** of a decile = its fraud rate ÷ the overall rate (4.64%). The top decile's 23.6% is **5.1 times** the
  average: a claim in it is five times as likely to be fraud as a randomly chosen one.
- **Cumulative gains** (cum_capture): investigating the top 10% of claims finds **51%** of all fraud; the top 30% finds
  **78%**. A random selection of 10% finds 10%.
- **Cumulative lift** = cum_capture ÷ share investigated: 5.10 at 10%, 2.58 at 30%. It falls towards 1 as you take
  everyone.
- A good model's per-decile lift falls steadily. A bump lower down (decile 5 here, 0.56 vs 0.54) is noise at these
  counts; a large one means the ranking is broken in some region.

The **gains chart** plots cumulative share of frauds found (y) against share of claims investigated (x): the model's
curve bows above the diagonal "random" line, and the area between them is closely related to the Gini coefficient
(Gini = 2 × AUC − 1 = 0.65 here — a number Indian credit and insurance teams often quote instead of AUC).

## Comparing models where the business works

    share investigated    5%     10%     20%     30%
    boosted model       33.9%   51.0%   65.8%   77.5%    of frauds found
    logistic regression 27.4%   43.3%   58.7%   69.8%

At a 10% investigation budget the boosted model finds 51% of fraud against 43% — 27 more frauds in six months on this
book. That sentence is worth more to the claims head than "AUC 0.824 vs 0.778".

## From lift to rupees

With ₹55,000 per fraud caught and ₹7,000 per wasted investigation (the previous unit), at a **capacity** of 300
investigations over the six months:

    top 300 by score:   102 frauds, precision 0.34, net ₹42.2 lakh      (the 300th claim has p = 0.155)
    random 300:         ~13.9 frauds expected,      net −₹12.4 lakh
    top 600:            156 frauds, precision 0.26, net ₹54.7 lakh      (the 600th has p = 0.079)

With fixed capacity, the threshold is simply whatever score the last claim you can work happens to have — the
decision is a ranking. The value table also argues for capacity: doubling the team from 300 to 600 investigations
adds ₹12.5 lakh of net value, which can be weighed against the cost of hiring. The value per extra investigation
falls as you go down the list, so there is a point where another investigator does not pay.

## Profit curve

Plot net value against the number investigated (top k by score, for every k). The curve rises, flattens and falls;
its peak is the profit-maximising volume when capacity is not the limit. On these test months it peaks at 805
claims (net ₹59.6 lakh), and is nearly flat from 600 to 1,000. The threshold or volume itself is chosen on out-of-fold predictions from the training period, and the
curve on the test months confirms it.

## Cautions

- Lift depends on the base rate; quote it with the rate. A top-decile lift of 5 on a 4.6% rate cannot exceed
  1 / 0.046 ≈ 21.7 even for a perfect model.
- Ties and very small deciles make lift noisy; use at least a few hundred rows per bucket.
- A campaign's real value depends on whether the action *changes* the outcome (an offer to a customer who would have
  bought anyway gains nothing). Fraud investigation is close to the ideal case; for retention offers, uplift
  modelling and A/B tests measure the effect itself.`,
    workedExample: `**Goal: give the claims head one sentence and one number for the model, from the decile table.**

**Step 1 — her constraint.** The team can investigate about 50 claims a month: 300 over the six test months, about
4% of 7,569 claims.

**Step 2 — what the model delivers at that volume.** The top 300 contain **102** frauds: precision 34%, against 4.64%
for a random pick — a lift of 34 / 4.64 ≈ **7.3**. Random picking would find about 300 × 0.0464 ≈ **14** frauds.

**Step 3 — rupees.** Model: 102 × ₹55,000 − 198 × ₹7,000 = ₹56.1 lakh − ₹13.9 lakh = **₹42.2 lakh**.
Random: 13.9 × ₹55,000 − 286.1 × ₹7,000 = ₹7.7 lakh − ₹20.0 lakh = **−₹12.4 lakh** — investigating at random costs more
than it saves.

**Step 4 — the next question she will ask.** "What if we had twice the team?" Top 600: 156 frauds, net ₹54.7 lakh —
**₹12.5 lakh more** for 300 more investigations, about ₹4,200 of value per extra investigation, against the cost of
the investigators.

**The sentence:** "If the team investigates the model's top 50 claims each month, it will find about seven times
as much fraud per investigation as now — roughly 100 frauds in six months, worth about ₹42 lakh net. Doubling the team
would add about ₹12 lakh more."

**Check before sending:** these numbers come from the test months, after the threshold logic was fixed on the
training period; they are an estimate for the next six months only if fraud patterns hold — a caveat to say aloud.`,
    mcqs: [
      mcq('The top decile of a claims model has a fraud rate of 23.6% when the overall rate is 4.64%. What is its lift?', [
        ['About 5.1', true],
        ['About 0.2', false],
        ['About 2.4', false],
        ['About 19.0', false],
      ], 'Lift = decile rate / overall rate = 23.6 / 4.64 ≈ 5.1. A claim in the top decile is about five times as likely to be fraud as an average claim.'),
      mcq('A gains chart shows the top 30% of claims contain 77.5% of the frauds. What does cumulative lift equal at that point?', [
        ['About 2.6, the share of frauds divided by the share of claims', true],
        ['About 0.8, the share of frauds that has been found up to that point', false],
        ['About 0.3, the share of the claims that the team has investigated', false],
        ['About 4.6, the fraud rate of the whole book expressed as a percent', false],
      ], 'Cumulative lift = 0.775 / 0.30 ≈ 2.58: the top 30% is 2.6 times as rich in fraud as the book. It falls to 1 when everyone is taken.'),
      mcq('An investigation team has fixed capacity for 300 claims. How should the model be used?', [
        ['Investigate the 300 highest-scoring claims, whatever score the 300th has', true],
        ['Investigate every claim above 0.5, even if that is fewer than 300 claims', false],
        ['Investigate a random 300 of the claims above the break-even probability', false],
        ['Ignore the model, since a fixed capacity makes the scores irrelevant', false],
      ], 'With fixed capacity the decision is a ranking: take the top 300. The implied threshold is the 300th score (0.155 here).'),
    ],
    checkpoint: [
      mcq('What does a cumulative gains curve plot?', [
        ['Share of all positives found against share of the population targeted', true],
        ['Precision against recall across every possible decision threshold', false],
        ['True positive rate against false positive rate at each threshold', false],
        ['Predicted probability against the observed rate in each score bin', false],
      ], 'Gains answer "if we act on the top x%, what share of the positives do we reach?" PR and ROC curves and reliability diagrams plot the other pairs.'),
      mcq('A campaign model on a 2% response rate shows a top-decile lift of 4. What share of all responders are in the top decile?', [
        ['40%', true],
        ['8%', false],
        ['20%', false],
        ['4%', false],
      ], 'The top decile responds at 4 × 2% = 8%. It holds 10% of customers, so it contains 0.10 × 8% / 2% = 40% of responders — cumulative lift × 10%.'),
      mcq('Why can lift overstate a retention campaign\'s value even when the ranking is good?', [
        ['Some high scorers would have stayed anyway, so the offer changes nothing for them', true],
        ['Lift is computed on the training data, so it is always too high for any campaign', false],
        ['Lift ignores the base rate, so a rare target makes every model look very good', false],
        ['Lift can only be used for fraud models, where every case is investigated', false],
      ], 'Lift measures who is likely to churn, not who the offer will save. Uplift models and A/B tests measure the effect of acting.'),
    ],
  },

  /* ── CALIBRATION ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_CALIBRATION',
    notes: `A model that ranks well can still lie about its probabilities. If a claim scored 0.30 is fraudulent 30% of the
time, the model is **calibrated**. When the score feeds anything multiplied by money — expected loss, reserves,
pricing, a break-even threshold — calibration matters as much as AUC. This unit measures it, shows what breaks it,
and repairs it.

## Setting up honestly

Calibration needs data the model never saw. Within the training months (1–18), split three ways:

    X, y = train[NUM + CAT], train["fraud"]
    X_a, X_hold, y_a, y_hold = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
    X_fit, X_cal, y_fit, y_cal = train_test_split(X_a, y_a, test_size=0.3, random_state=0, stratify=y_a)
    # fit 10,990   calibrate 4,711   hold-out 6,730 (3.15% fraud)

## The reliability table

Group hold-out claims by predicted probability and compare the mean prediction with the actual fraud rate:

    def reliability(y, p, bins):
        d = pd.DataFrame({"p": p, "y": y})
        d["bin"] = pd.cut(d.p, bins, include_lowest=True)
        return d.groupby("bin", observed=True).agg(claims=("y", "size"), mean_pred=("p", "mean"), actual=("y", "mean"))

    boosted model (unweighted)                 boosted model, class_weight="balanced"
    bin          claims  mean_pred  actual     bin          claims  mean_pred  actual
    0.00–0.02     4553     0.009     0.010     0.0–0.1       1233     0.067     0.006
    0.02–0.05     1238     0.032     0.032     0.1–0.3       2912     0.188     0.010
    0.05–0.10      500     0.068     0.068     0.3–0.5       1202     0.388     0.025
    0.10–0.20      249     0.142     0.165     0.5–0.7        857     0.590     0.050
    0.20–0.40      145     0.264     0.234     0.7–0.9        490     0.792     0.186
    0.40–1.00       45     0.518     0.400     0.9–1.0         36     0.906     0.306

The unweighted model is close to the diagonal: the small differences at the top come from bins of 45–145 claims.
The balanced one says 0.59 for claims that are fraud 5% of the time. Plotted (predicted on x, actual on y), the
first hugs the diagonal; the second lies far below it. \`sklearn.calibration.calibration_curve(y, p, n_bins=10,
strategy="quantile")\` returns the points, and \`CalibrationDisplay.from_predictions\` draws them; quantile bins give
each point the same number of claims, which matters with rare positives.

## Scores that summarise calibration

- **Brier score** = mean of (p − y)²: 0 is perfect. It mixes ranking and calibration.
- **Log loss**: punishes confident wrong probabilities hardest.
- Compare with a **reference**: predicting the base rate for everyone gives Brier 0.0305 here.

                                         mean p    Brier    log loss    AUC
    boosted, unweighted                  0.0313   0.0278    0.1142     0.822
    boosted, class_weight="balanced"     0.3004   0.1336    0.4222     0.815
    random forest (min_samples_leaf=3)   0.0321   0.0280    0.1312     0.807
    constant 3.1% for every claim                 0.0305

The balanced model ranks almost as well (AUC 0.815) and is useless as a probability: its Brier score is four times
worse than predicting the average. The forest's mean is right but its log loss is high: with small leaves it gives 552
hold-out claims a probability of exactly 0, and the 3 frauds among them are punished without limit (clipped, but
heavily).

What miscalibrates models: class weights and resampling; Naive Bayes (overconfident, from the independence
assumption); SVMs and plain trees (not probabilities at all); heavy regularisation; and — the one no method fixes —
**a world that changed** since training.

## Repairing it: Platt scaling and isotonic regression

Fit a small mapping from the model's scores to probabilities on **data the model was not trained on**:

- **Platt (sigmoid)**: a logistic regression on the score — two parameters, smooth, needs little data; assumes the
  distortion is S-shaped.
- **Isotonic**: a step-wise increasing function — flexible, needs more data (thousands of rows, with enough
  positives) or it overfits; it creates ties, which can lower AUC slightly.

scikit-learn 1.6+:

    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.frozen import FrozenEstimator            # new in 1.6

    calibrated = CalibratedClassifierCV(FrozenEstimator(balanced_model), method="sigmoid").fit(X_cal, y_cal)

    balanced + sigmoid (fitted on X_cal)    mean p 0.0316   Brier 0.0280   log loss 0.1158   AUC 0.815
    balanced + isotonic (fitted on X_cal)   mean p 0.0320   Brier 0.0285   log loss 0.1261   AUC 0.810

\`FrozenEstimator\` tells scikit-learn the model is already fitted and must not be refitted. Before 1.6 the same was
written \`CalibratedClassifierCV(model, cv="prefit")\`; that option was deprecated in 1.6 and is gone in recent
versions. The alternative is to let it cross-fit: \`CalibratedClassifierCV(unfitted_model, method="isotonic", cv=5)\`
trains five model-plus-calibrator pairs on folds and averages them (here: Brier 0.0281, AUC 0.814).

After sigmoid calibration, the balanced model's reliability table lies close to the diagonal — mean prediction 0.009
against actual 0.009 in the lowest bin, 0.252 against 0.265 in the 0.2–0.4 bin. Platt won here: with a few hundred frauds, isotonic's steps overfit.

## The limit: calibration on the past cannot fix the future

The unweighted model, scored on months 19–24:

    mean predicted 0.0308   actual 0.0464
    Agent   predicted 0.029  actual 0.028
    Online  predicted 0.032  actual 0.082
    Bank    predicted 0.033  actual 0.028

Calibrated on months 1–18, it is right for agent and bank claims and under-predicts **online** claims by a factor
of 2.5. A new online fraud pattern appeared in month 19 (the simulation added it); no amount of calibration on older
data could know. This is why the money table in the metrics unit peaked below the break-even threshold. The
remedies are monitoring (predicted vs actual rate by segment, every month) and retraining or recalibrating on recent
data — the error-analysis unit returns to it.

## When calibration matters — and when it does not

- **Matters:** expected loss (p × exposure), pricing, reserves, break-even thresholds, combining scores from
  different models, showing a probability to a person ("70% chance of delay").
- **Does not:** pure ranking with fixed capacity (top 300 claims), where only the order counts — calibration methods
  that are monotonic leave the order (almost) unchanged.`,
    workedExample: `**Goal: decide whether a fraud model's scores can feed the claims reserve, and fix them if not.**

The finance team wants: expected fraud payout avoided = Σ p × claim amount over open claims. The model was trained
with \`class_weight="balanced"\`.

**Step 1 — check the average.** On the hold-out claims, the mean prediction is 0.300; the actual rate is 0.0315.
The sum of p over 1,000 claims would forecast about 300 frauds where about 32 occur. Stop: these are not
probabilities.

**Step 2 — check the shape.** The reliability table shows actual rates of 0.006, 0.010, 0.025, 0.050, 0.186, 0.306
for mean predictions of 0.067 up to 0.906 — increasing (the ranking is good, AUC 0.815) but far below the diagonal
everywhere.

**Step 3 — calibrate on separate data.** Freeze the fitted model and fit a sigmoid on 4,711 calibration claims it
never saw:

    calibrated = CalibratedClassifierCV(FrozenEstimator(model), method="sigmoid").fit(X_cal, y_cal)

Hold-out mean prediction **0.0316** against actual 0.0315; Brier 0.1336 → **0.0280**; AUC unchanged at 0.815.

**Step 4 — choose the method on evidence.** Isotonic gave Brier 0.0285 and log loss 0.1261 against sigmoid's 0.0280
and 0.1158: with about 150 frauds in the calibration set, the flexible method overfits. Sigmoid stays.

**Step 5 — say the limit.** The calibration holds for claims like those in months 1–18. On later months online claims
run 2.5 times the predicted rate, so the reserve calculation needs a monthly check of predicted against actual by
channel, and recalibration when they drift apart.

**Why this order:** the mean check takes one line and catches the worst problem; the table shows its shape; the
repair uses data the model never saw; the method is chosen by a score, not by preference.`,
    mcqs: [
      mcq('A fraud model trained with class_weight="balanced" has AUC 0.815 and a mean prediction of 0.30 on claims that are 3.15% fraud. What is true?', [
        ['It ranks claims well, but its scores cannot be used as fraud probabilities', true],
        ['It ranks claims badly, which is why the mean prediction is so far too high', false],
        ['It is calibrated, because AUC above 0.8 means the probabilities are right', false],
        ['It is fine for expected-loss work, provided a threshold of 0.5 is applied', false],
      ], 'Re-weighting inflates the scores of the rare class while barely changing their order. Ranking uses are fine; anything that multiplies p by money is badly wrong until it is recalibrated.'),
      mcq('With about 150 frauds in the calibration set, sigmoid calibration gave a better hold-out log loss than isotonic. Why is that expected?', [
        ['Isotonic is flexible and overfits small samples; sigmoid has two parameters', true],
        ['Isotonic regression can only be used with logistic regression base models', false],
        ['Sigmoid calibration always beats isotonic, whatever the amount of data is', false],
        ['Isotonic changes the ranking completely, which makes its log loss worse', false],
      ], 'A step function fitted to few positives follows their noise. Platt scaling fits only a slope and an intercept, so it is the safer choice when calibration data is small.'),
      mcq('How is a pre-fitted model calibrated on a separate set in scikit-learn 1.6 and later?', [
        ['CalibratedClassifierCV(FrozenEstimator(model)).fit(X_cal, y_cal)', true],
        ['CalibratedClassifierCV(model, cv="prefit").fit(X_train, y_train)', false],
        ['model.calibrate(X_cal, y_cal, method="sigmoid") after the fitting', false],
        ['CalibratedClassifierCV(model, cv=1).fit(X_cal, y_cal) on the set', false],
      ], 'FrozenEstimator (added in 1.6) marks the model as already fitted, replacing the deprecated cv="prefit". Calibration must use data the model was not trained on.'),
    ],
    checkpoint: [
      mcq('Four claims have predicted fraud probabilities 0.8, 0.1, 0.3 and 0.6, and outcomes 1, 0, 0 and 1. What is the Brier score?', [
        ['0.075', true],
        ['0.300', false],
        ['0.150', false],
        ['0.025', false],
      ], '(0.8 − 1)² + 0.1² + 0.3² + (0.6 − 1)² = 0.04 + 0.01 + 0.09 + 0.16 = 0.30, and 0.30 / 4 = 0.075. 0.300 forgets to average.'),
      mcq('A model calibrated on months 1–18 predicts 3.2% fraud for online claims, but 8.2% occur in months 19–24. What is the right response?', [
        ['Monitor predicted vs actual by segment and retrain or recalibrate on recent data', true],
        ['Recalibrate on months 1–18 again with isotonic regression instead of sigmoid', false],
        ['Ignore it, because the model\'s AUC on the later months is still above 0.8', false],
        ['Raise every prediction by the same factor of 2.5 for all claim channels', false],
      ], 'The world changed after training, so calibrating on the old data cannot help. The gap is specific to online claims; a blanket factor would break agent and bank claims, which are still right.'),
      mcq('For which use does a model\'s calibration matter least?', [
        ['Investigating the top 300 claims by score each half-year', true],
        ['Multiplying p by claim amounts to set aside a reserve', false],
        ['Choosing a break-even threshold from costs and benefits', false],
        ['Telling a customer the chance their claim will be delayed', false],
      ], 'Fixed-capacity ranking uses only the order of the scores. The other three use the probability values themselves.'),
    ],
  },

  /* ── VALIDATION_STRATEGY ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_VALIDATION_STRATEGY',
    notes: `Cross-validation answers one question: how well does this model do on rows like the ones it was trained on,
drawn the same way? The question that matters is different: how well will it do on the rows it will **actually**
score — next month's, a new customer's, a new city's? When those differ, a random split gives a confident wrong
answer. The rule: **make the validation look like deployment.**

## Three questions to ask before splitting

1. **When** will the model score? (Always after the training data — so validate on later data.)
2. **Whom** will it score? (The same customers again, or new ones? — group splits.)
3. **What** will it know then? (Every feature as of the prediction moment — the leakage audit.)

## Groups: the same customer on both sides

A food-delivery app predicts whether a customer orders next month. The data is a **panel**: 3,000 customers × 12
months = 36,000 rows. Each customer has a habit the data never records directly; the features include
\`signup_day\` (when they joined), which is unique enough to identify a customer.

    def make_panel(n_cust=3000, months=12, seed=4):
        rng = np.random.default_rng(seed)
        cust = np.arange(1, n_cust + 1)
        u = rng.normal(0, 1.2, n_cust)                         # each customer's own habit, never observed
        age = rng.integers(18, 55, n_cust)
        signup_day = rng.integers(1, 1500, n_cust)
        city = rng.choice(["Bengaluru", "Hyderabad", "Pune", "Chennai", "Kochi"], n_cust)
        rows = []
        for m in range(1, months + 1):
            orders = rng.poisson(np.exp(0.6 + 0.2 * u))
            sessions = rng.poisson(np.exp(1.5 + 0.1 * u))
            coupon = (rng.random(n_cust) < 0.3).astype(int)
            z = -0.2 + 1.8 * u + 0.15 * np.minimum(orders, 8) + 0.4 * coupon - 0.08 * (m - 6)   # habit fades
            y = (rng.random(n_cust) < 1 / (1 + np.exp(-z))).astype(int)
            rows.append(pd.DataFrame({"customer_id": cust, "month": m, "age": age, "signup_day": signup_day,
                                      "city": city, "orders_this_month": orders, "app_sessions": sessions,
                                      "used_coupon": coupon, "orders_next_month": y}))
        return pd.concat(rows, ignore_index=True)

    from sklearn.model_selection import StratifiedKFold, GroupKFold, cross_val_score
    F = ["age", "signup_day", "orders_this_month", "app_sessions", "used_coupon"]
    hgb = HistGradientBoostingClassifier(random_state=0)
    cross_val_score(hgb, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0), scoring="roc_auc")   # 0.702
    cross_val_score(hgb, X, y, cv=GroupKFold(5), groups=panel.customer_id, scoring="roc_auc")             # 0.628

Same model, same data: **0.702 vs 0.628**. With a random split, 11 of each customer's 12 rows sit in training; the
model learns "the customer with signup_day 1,137 usually orders" and recognises them in the validation fold.
\`GroupKFold\` keeps every row of a customer in one fold, so validation customers are strangers.

Which number is right? **It depends on whom the model will score**, and a true future test shows it (train on months
1–9 for customers 1–2,400, test on months 10–11):

    new customers (2,401–3,000)     AUC 0.630    ← matches GroupKFold
    known customers (1–2,400)       AUC 0.721    ← knowing the customer genuinely helps

For new sign-ups, report the group number. For existing customers, knowing the customer's past is legitimate signal
— but build it on purpose (their order rate over past months, as of the prediction date) rather than letting the
model memorise an ID-like column. Without \`signup_day\`, random and group CV agree (0.657 vs 0.652): the gap was
the model recognising people.

Groups appear everywhere: several loans per applicant (the ensembles mini project's top-up loans), several claims per
policy, several images per patient, several rows per store. \`StratifiedGroupKFold\` keeps groups whole and the class
balance even.

## Time: the future is not a random sample of the past

The panel's order rate falls through the year (0.58 in month 1 to 0.46 in month 12). Validate by **training on the
past and scoring the next period**:

    train months   score month   AUC     mean predicted   actual
       1–8              9        0.713       0.542         0.492
       1–9             10        0.705       0.542         0.499
       1–10            11        0.721       0.534         0.464
       1–11            12        0.703       0.526         0.463

The ranking holds (AUC ≈ 0.71) but every forecast is 5–7 points too high: a model that learns from the past
predicts the past's level. A random split would have hidden this — it mixes months, so validation rows share the
training rows' level.

scikit-learn's \`TimeSeriesSplit(n_splits=4)\` does expanding-window splits by **row order**: sort by time first, and
know that it cuts by row count, not by calendar. On the insurance claims (sorted by month) its first fold trained on
months 1–5 and validated on months 5–10 — month 5 on both sides. For monthly data, write the splits by period
yourself:

    for k in [9, 12, 15]:
        tr = claims.claim_month <= k
        va = (claims.claim_month > k) & (claims.claim_month <= k + 3)
        ...   # AUC 0.819, 0.815, 0.802 for the three windows; AP 0.225, 0.207, 0.190

Add a **gap** between training and validation when labels arrive late (a default is known 12 months after
disbursal; a fraud verdict weeks after the claim): the newest training rows must have mature labels on the date you
would really train.

## Nested cross-validation: an honest score for a tuned model

If you tune hyperparameters by CV and report the best CV score, the report is biased upward — it is the maximum of
many noisy estimates. **Nested CV** wraps the whole tuning procedure in an outer CV loop:

    inner = StratifiedKFold(5, shuffle=True, random_state=1)
    outer = StratifiedKFold(5, shuffle=True, random_state=2)
    search = RandomizedSearchCV(HistGradientBoostingClassifier(early_stopping=False, random_state=0), dist,
                                n_iter=60, cv=inner, scoring="roc_auc", random_state=0)
    search.fit(X, y).best_score_                                      # 0.823 — best of 60, non-nested
    cross_val_score(search, X, y, cv=outer, scoring="roc_auc")        # 0.809 0.814 0.852 0.795 0.810 → 0.816 ± 0.019

On 2,500 NBFC loans (165 defaults), the non-nested best was 0.823; nested gives 0.816 with a spread of ±0.019, and
the tuned model scores 0.828 on 40,000 fresh loans from the same generator. The bias here is small next to the
spread — and that spread is the useful part: on small data, a single CV number can be off by a couple of points
either way. Nested CV costs outer × inner × configurations fits (1,500 here), so it is for small data and for
deciding *how* to model, not for every experiment. With plenty of data, a separate untouched test set does the same
job.

## Choosing the strategy

| Deployment | Validation |
|---|---|
| Score next month's rows | Train on the past, validate on later periods (with a label-delay gap) |
| Score new customers / patients / stores | Group k-fold on the entity |
| Score existing customers next month | Time split; customer history as explicit features |
| Small data, tuned model | Nested CV, report mean ± sd |
| Rows independent, no time effect (rare) | Stratified k-fold |

And whatever the validation, keep one **final test** that mirrors deployment most closely — usually the latest
period — and look at it once.`,
    mcqs: [
      mcq('On a customer-by-month panel, random 5-fold CV gives AUC 0.702 and GroupKFold by customer gives 0.628. What explains the gap?', [
        ['Random folds let the model recognise customers it saw in training', true],
        ['GroupKFold uses fewer rows for training, which always lowers the AUC', false],
        ['Random folds are stratified, which raises AUC on any imbalanced target', false],
        ['GroupKFold shuffles months, so the model sees the future in training', false],
      ], 'With random folds most of a customer\'s rows are in training, and an ID-like feature lets the model recall them. Group folds keep validation customers unseen, as new customers would be.'),
      mcq('A model trained on months 1–8 predicts a mean order rate of 0.542 for month 9, when the actual rate is 0.492, though AUC stays near 0.71. What does this show?', [
        ['The level drifted downward; time-based validation reveals it and random splits hide it', true],
        ['The model is overfitting, because its AUC is far higher than its mean prediction', false],
        ['The model ranks customers wrongly, which is why the mean prediction is too high', false],
        ['The validation set is too small, which inflates the mean prediction of any model', false],
      ], 'Ranking held while the base rate fell. Training on the past and scoring the next month exposes the gap; a random split mixes months so validation shares training\'s level.'),
      mcq('What does nested cross-validation estimate that ordinary CV with a search does not?', [
        ['The performance of the whole tune-then-fit procedure, without selection bias', true],
        ['The best hyperparameters, more precisely than a single search can find them', false],
        ['The test-set score exactly, so a separate test set is no longer necessary', false],
        ['The training error of the final model, before any tuning has been applied', false],
      ], 'The inner loop tunes; the outer loop scores the tuned result on folds the tuning never saw. The best inner CV score is the maximum of noisy estimates and so is biased upward.'),
    ],
    checkpoint: [
      mcq('A hospital model will be used on patients it has never seen, and each patient has several visits in the data. Which validation fits?', [
        ['Group k-fold with patient as the group', true],
        ['Stratified k-fold on the visit outcome', false],
        ['Leave-one-visit-out cross-validation', false],
        ['A random 80/20 split of all the visits', false],
      ], 'Only grouping keeps every visit of a validation patient out of training, matching use on new patients. The others leak patients across the split.'),
      mcq('Why does a default model trained on loans up to March need a gap before its validation period?', [
        ['Default is known only months after disbursal, so recent loans lack mature labels', true],
        ['Validation must always skip one period to make the model generalise to the next', false],
        ['The gap removes seasonal effects, which would otherwise inflate the AUC a lot', false],
        ['scikit-learn requires a gap whenever TimeSeriesSplit is used for validation', false],
      ], 'A loan disbursed in February has not had 12 months to default by March. Training only on loans whose outcome is known by the training date mimics how the model would really be built.'),
      mcq('TimeSeriesSplit is applied to monthly claims sorted by month, and a fold trains on months 1–5 and validates on months 5–10. What is the issue?', [
        ['It cuts by row count, so one month falls on both sides of the split', true],
        ['It shuffles the rows, so the validation months come before training', false],
        ['It uses only one fold, so the estimate has no measure of its spread', false],
        ['It stratifies on the target, which breaks the time order of the rows', false],
      ], 'TimeSeriesSplit splits by position, not calendar. For period data, define folds by period so no month is split between training and validation.'),
    ],
  },

  /* ── INTERPRETABILITY ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_INTERPRETABILITY',
    notes: `Two questions come to every model: "What drives it?" (global) and "Why this prediction?" (local). A claims
investigator wants to know why one claim was flagged; a regulator wants to know the model does not lean on something
it should not. This unit covers the three standard tools — permutation importance, partial dependence and SHAP — on
the claims model, and the traps in each.

## Permutation importance: what the model relies on

Shuffle one column in the **test** data and measure how much the score drops. If the model needs that column, the
score falls; if not, nothing happens.

    from sklearn.inspection import permutation_importance
    r = permutation_importance(model, X_test, y_test, scoring="roc_auc", n_repeats=10, random_state=0)

A random forest on the claims, with a meaningless \`claim_ref_no\` column added (a shuffled serial number):

    impurity importance (training)        permutation importance (test, AUC drop)
    policy_age_days   0.265               claim_amount      0.1172 ± 0.0060
    claim_amount      0.262               policy_age_days   0.0837 ± 0.0064
    claim_ref_no      0.214               night_incident    0.0191 ± 0.0028
    vehicle_age       0.105               police_report     0.0153 ± 0.0040
    ...                                   ...
                                          claim_ref_no     −0.0020 ± 0.0047

Impurity importance makes the serial number the third most important feature; permutation on held-out data shows it
is worth nothing. For a LightGBM model on the real features (test AUC 0.822):

    claim_amount 0.1451   policy_age_days 0.0794   police_report 0.0249   night_incident 0.0177
    vehicle_age 0.0079    prior_claims 0.0034      channel −0.0001        region −0.0007

**Trap: correlated features share credit.** Add \`repair_estimate\`, almost a copy of the claim amount (within about
3%). The model's AUC is unchanged (0.819), but claim amount's importance collapses from 0.145 to **0.027**, with
0.040 going to repair_estimate: when one is shuffled, the model reads the other. Neither looks important; together
they are the strongest signal. Group correlated features and permute them together, or drop duplicates first.

## Partial dependence: how the prediction changes with one feature

Set a feature to a value **for every claim**, predict, and average; repeat across values:

    from sklearn.inspection import partial_dependence
    Xf = X_test.astype({c: float for c in NUM})        # PDP refuses integer columns in recent scikit-learn
    pd_age = partial_dependence(model, Xf, ["policy_age_days"],
                                custom_values={"policy_age_days": [5, 15, 30, 45, 60, 90, 180, 365, 730, 1400]})

    policy age (days)    5      15     30     45     60     90     180    365    730    1400
    avg predicted p    0.208  0.156  0.141  0.141  0.112  0.021  0.019  0.022  0.021  0.017

    claim amount (₹)   10,000  25,000  45,000  75,000  1,20,000  2,00,000
    avg predicted p    0.004   0.008   0.016   0.040   0.063     0.141

The model learned the pattern investigators know: claims within the first two months of a policy are far riskier,
and risk climbs steeply with amount. (The simulation's cut-off is 60 days; the model's main step lies between 60
and 90 — a tree places its split somewhere between observed values, and the averaged curve shows where.)

Traps: PDP averages over the data, so it hides interactions (ICE curves — \`kind="individual"\` — show one line per
claim) and it creates **impossible rows** when features are correlated (a ₹2 lakh claim on a two-wheeler).
Accumulated local effects (ALE) avoid the second problem.

## SHAP: one prediction, split into contributions

SHAP values divide a single prediction (here in **log-odds**) into a contribution from each feature, starting from
the model's average output, so that they add up exactly:

    import shap                                  # pip install shap
    explainer = shap.TreeExplainer(lgbm)
    sv = explainer(X_test)                       # one row of contributions per claim

    base value: −4.317 log-odds (p ≈ 0.013)

    highest-scoring test claim: policy 5 days old, ₹4,31,700, night incident, one prior claim, police report filed, Metro, via bank
    claim_amount      +2.355
    policy_age_days   +2.229
    night_incident    +0.393
    vehicle_age       +0.288
    prior_claims      +0.252
    police_report     −0.233
    channel           +0.161
    region            −0.097
    total             −4.317 + 5.349 = 1.032 log-odds  →  p = 0.737   (the model's own prediction)

For the investigator: "Flagged mainly because the claim is very large and the policy is five days old; the night-time
incident adds to it; the police report reduces it a little." Averaging |SHAP| over all claims gives a global ranking
(claim amount 0.80, policy age 0.37, police report 0.29, prior claims 0.22, night 0.21 …), and plotting SHAP against
a feature's value (a dependence plot) shows the shape PDP showed, claim by claim.

TreeExplainer is exact and fast for tree models (XGBoost, LightGBM, scikit-learn forests). For other models,
\`shap.Explainer\` falls back to slower approximations. LightGBM and XGBoost can also return SHAP values directly
(\`predict(..., pred_contrib=True)\` / \`pred_contribs=True\`).

## What explanations do not tell you

- **Not causation.** SHAP and PDP describe what the *model* does with its inputs. "Claim amount pushes the score up"
  does not mean large claims cause fraud, or that lowering a claim would make it honest. A feature can matter to the
  model because it stands in for something else (police reports are rarer in rural areas — the error-analysis unit
  follows that thread).
- **Not stability.** Two equally accurate models can explain differently; correlated features can swap credit.
- **Not a check on data.** A leaking feature gets a large, confident SHAP value. Explanations make leaks easier to
  spot — if you look — but they do not flag them.
- **Units.** Tree SHAP in log-odds adds up exactly; in probability space contributions do not add, so convert the
  total, not the pieces.`,
    mcqs: [
      mcq('A meaningless serial number ranks third by a forest\'s impurity importance and slightly below zero by permutation importance on test data. Which should be believed?', [
        ['Permutation on test data — the column adds nothing that generalises', true],
        ['Impurity importance, because it was computed on many more training rows', false],
        ['Both, since the serial number may encode when the claim was registered', false],
        ['Neither, since feature importance cannot be computed for random forests', false],
      ], 'Impurity importance rewards columns a tree can split often on training data, which includes noise. Shuffling the serial number on held-out data does not hurt the score at all.'),
      mcq('Adding repair_estimate, nearly a copy of claim_amount, drops claim_amount\'s permutation importance from 0.145 to 0.027 while AUC is unchanged. Why?', [
        ['When one copy is shuffled the model reads the other, so each looks unimportant', true],
        ['The new column has made the model worse, which lowered every importance score', false],
        ['Permutation importance cannot handle numeric columns that are on a rupee scale', false],
        ['claim_amount was never important, and the first result was a statistical fluke', false],
      ], 'Correlated features substitute for each other under permutation. Permute them together, or remove duplicates, to see their joint importance.'),
      mcq('A SHAP explanation shows claim_amount adding +2.355 to a claim\'s log-odds. What can be concluded?', [
        ['The model\'s score for this claim is much higher because of its large amount', true],
        ['Large claim amounts cause fraud, so lowering the amount would prevent it', false],
        ['The claim\'s fraud probability rises by 2.355 percentage points from the amount', false],
        ['The amount is the only reason the claim was flagged by the fraud model', false],
      ], 'SHAP describes the model\'s arithmetic in log-odds, not causes and not probability points. Policy age added nearly as much for this claim.'),
    ],
    checkpoint: [
      mcq('How is permutation importance of a feature computed?', [
        ['Shuffle that feature on held-out data and measure the drop in score', true],
        ['Remove the feature, retrain the model, and compare the training loss', false],
        ['Count how many tree splits use the feature across the whole ensemble', false],
        ['Average the feature\'s coefficient across all cross-validation folds', false],
      ], 'Shuffling breaks the link between the feature and the target while keeping its distribution. Retraining without it (drop-column importance) is a different, costlier method.'),
      mcq('What is a known weakness of partial dependence plots?', [
        ['They average away interactions and can evaluate impossible feature combinations', true],
        ['They can only be computed for linear models, not for tree ensembles or boosting', false],
        ['They need the true labels for every row, which are not available in production', false],
        ['They change every time the model is retrained, even with fixed random seeds', false],
      ], 'Setting one feature for every row ignores how it relates to others, so the average can include unrealistic rows and hide subgroup differences. ICE curves and ALE address these.'),
      mcq('For a LightGBM classifier, TreeExplainer SHAP values for one row sum, with the base value, to what?', [
        ['The model\'s log-odds output for that row', true],
        ['The model\'s predicted probability for it', false],
        ['The row\'s true label, either zero or one', false],
        ['The AUC of the model on the whole dataset', false],
      ], 'Tree SHAP for a binary LightGBM model works in raw margin (log-odds) space, where contributions add exactly; the probability is the sigmoid of that total.'),
    ],
  },

  /* ── ERROR_ANALYSIS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_ERROR_ANALYSIS',
    notes: `A single score for the whole test set hides where the model fails. **Error analysis** slices the errors by
segment to find the groups the model serves badly; **fairness** analysis asks whether those failures fall on groups
that deserve equal treatment. Both start with the same table.

## Slice the errors

The boosted claims model on months 19–24, investigating claims with p ≥ 0.08 (590 flagged; overall recall 0.436,
false positive rate 0.061):

    def by_segment(d, col):
        rows = []
        for k, g in d.groupby(col):
            tp = ((g.flag == 1) & (g.fraud == 1)).sum(); fp = ((g.flag == 1) & (g.fraud == 0)).sum()
            fn = ((g.flag == 0) & (g.fraud == 1)).sum(); tn = ((g.flag == 0) & (g.fraud == 0)).sum()
            rows.append(dict(segment=k, claims=len(g), fraud_rate=g.fraud.mean(), flag_rate=g.flag.mean(),
                             precision=tp / max(tp + fp, 1), recall=tp / (tp + fn), fpr=fp / (fp + tn),
                             auc=roc_auc_score(g.fraud, g.p), mean_p=g.p.mean()))
        return pd.DataFrame(rows)

    channel  claims  fraud_rate  flag_rate  precision  recall   FPR    AUC   mean_p
    Agent     3854     0.028       0.070      0.178    0.453   0.059  0.842  0.029
    Bank      1104     0.028       0.080      0.182    0.516   0.067  0.848  0.031
    Online    2611     0.082       0.089      0.384    0.416   0.060  0.811  0.034

    amount band  claims  fraud_rate  flag_rate  precision  recall   FPR    AUC
    < ₹25k        1492     0.008       0.021      0.129    0.333   0.018  0.785
    ₹25–50k       2727     0.029       0.031      0.226    0.244   0.025  0.764
    ₹50k–1L       2409     0.059       0.090      0.287    0.437   0.068  0.791
    > ₹1L          941     0.126       0.275      0.263    0.571   0.232  0.739

What the slices say:

- **Online claims:** the fraud rate (8.2%) is three times agent and bank, but the model predicts 3.4% — it never saw the
  new online pattern (it began in month 19). Recall is the lowest of the three channels. This is drift, found by
  slicing, and the fix is data: retraining on months 1–21 and testing on 22–24 nudged online recall from 0.408 to
  0.427 and the mean online prediction from 0.034 to 0.038 against an actual 0.077 — better, still far behind,
  because only three months of the new pattern exist. Until there is more, an explicit rule or a separate review
  queue for online claims is reasonable.
- **Large claims:** almost a quarter of genuine claims above ₹1 lakh are investigated (FPR 0.232). Each is a large,
  unhappy customer waiting for money. The business may accept that — or set a higher threshold for that band.
- **Within-segment AUC is lower than overall AUC** (0.739–0.791 vs 0.824 overall) — normal, because part of the
  overall ranking comes from separating the segments themselves.

Other ways to find failure: sort the largest errors (confident misses and false alarms) and read them; slice by
any column, including ones *not* in the model (product, garage, investigator); and look for slices where the label
itself is shaky.

## Fairness: who bears the errors?

Slice by region:

    region  claims  fraud_rate  flag_rate  precision  recall   FPR
    Metro    3031     0.042       0.067      0.246    0.391   0.053
    Urban    2915     0.045       0.079      0.245    0.427   0.062
    Rural    1623     0.057       0.097      0.297    0.511   0.073

A genuine rural claimant is investigated 7.3% of the time against 5.3% for a metro claimant — **38% more often**.
Why? Region is in the model but barely used (its permutation importance was −0.0007). Look at genuine claims only:

    flag rate among genuine claims   no police report   police report
    Metro                                 0.073              0.043
    Rural                                 0.087              0.046
    Urban                                 0.084              0.051

The model treats "no police report" as risk, and rural claimants file reports far less often (35% vs 65% — the
nearest police station may be hours away). The feature is a **proxy** for being rural. Dropping \`region\` from the
model would change nothing.

## Fairness definitions — and why you cannot have them all

| Criterion | Equal across groups | Here (rural vs metro) |
|---|---|---|
| Demographic parity | Flag rate | 0.097 vs 0.067 |
| Equal opportunity | Recall (TPR) | 0.511 vs 0.391 |
| Equalised odds | TPR and FPR | FPR 0.073 vs 0.053 |
| Predictive parity | Precision | 0.297 vs 0.246 |

When base rates differ between groups (5.7% vs 4.2% fraud here), no non-trivial model can satisfy all of these at
once — a mathematical result, not a tooling gap. Which one matters is a choice about **harm**: in fraud
investigation the harm to a genuine claimant is the investigation, so **equal false positive rates** is the natural
target; in lending, unequal approval of creditworthy applicants (equal opportunity) is the usual concern, and Indian
lenders also answer to RBI's fair-practices expectations.

## What to do about a model that fails one group

1. **Measure first**, with the counts — 1,623 rural claims and 92 rural frauds are enough to see a 38% FPR gap, but
   check the uncertainty on small groups.
2. **Find the mechanism** (here, the police-report proxy) before changing anything.
3. **Fix the process or the feature**: accept alternative evidence (a panchayat certificate, a surveyor's report)
   so "no police report" stops meaning "rural"; or replace the feature with one closer to the intent.
4. **Constrain or post-process** if needed: group-specific thresholds can equalise FPR, but using a protected
   attribute in decisions can itself be unlawful in some settings — involve legal and compliance.
5. **Keep a human in the loop** for the affected group, and **monitor** the slice tables every month.

Document what you measured, what you changed, and what you chose not to fix and why. That record is what a regulator
or an auditor will ask for.`,
    mcqs: [
      mcq('Online claims have an 8.2% fraud rate in the test months, while the model predicts 3.4% for them. What is the most likely cause?', [
        ['A fraud pattern that appeared after the training period, so the model never saw it', true],
        ['Online claims have fewer features recorded, which lowers every prediction for them', false],
        ['The threshold of 0.08 is too high for online claims and lowers their predictions', false],
        ['The model was trained with class weights, which deflate predictions for a channel', false],
      ], 'The model matches the rates for agent and bank claims, so it is not miscalibrated in general. Only the channel with a new pattern is under-predicted — drift found by slicing.'),
      mcq('Region has near-zero importance, yet genuine rural claimants are investigated 38% more often than metro ones. What explains it?', [
        ['Another feature, the missing police report, acts as a proxy for being rural', true],
        ['The model uses region heavily, and permutation importance failed to detect it', false],
        ['Rural claims are all fraudulent at a higher rate, so the gap is fully justified', false],
        ['Random chance — with over 1,600 rural claims the difference is just noise', false],
      ], 'Rural claimants file police reports far less often, and the model treats no report as risk. Removing region would not change the outcome.'),
      mcq('Why can a fraud model not usually have equal flag rates, equal recall and equal precision across regions at once?', [
        ['When base rates differ, these fairness criteria conflict mathematically', true],
        ['scikit-learn has no function that computes all three of these together', false],
        ['Equal recall across groups would require the model to be retrained each day', false],
        ['These criteria can only be measured on training data, never on a test set', false],
      ], 'With different fraud rates, satisfying one criterion forces the others apart. The choice depends on which error harms people — here, investigating genuine claimants.'),
    ],
    checkpoint: [
      mcq('A group has 1,500 genuine claims, 105 of them investigated, and 100 frauds, 45 of them caught. What are its false positive rate and recall?', [
        ['FPR 0.07 and recall 0.45', true],
        ['FPR 0.45 and recall 0.07', false],
        ['FPR 0.07 and recall 0.30', false],
        ['FPR 0.11 and recall 0.45', false],
      ], 'FPR = investigated genuine / all genuine = 105 / 1,500 = 0.07. Recall = caught / all frauds = 45 / 100 = 0.45.'),
      mcq('Why is overall test AUC often higher than the AUC within each segment?', [
        ['Part of the overall ranking comes from separating segments with different rates', true],
        ['Segment AUCs are computed on training data, which makes them systematically lower', false],
        ['AUC can only be computed on large datasets, so every segment AUC is biased low', false],
        ['The overall AUC double counts rows that belong to more than one segment at once', false],
      ], 'If one segment has a much higher positive rate, ranking it above the others already earns AUC. Within a segment that easy separation is not available.'),
      mcq('In a fraud-investigation model, which fairness criterion most directly protects genuine claimants from unequal treatment?', [
        ['Equal false positive rates across groups', true],
        ['Equal recall of frauds across all groups', false],
        ['Equal precision of flags across groups', false],
        ['Equal AUC for the model in every group', false],
      ], 'The harm to a genuine claimant is being investigated, and the false positive rate measures exactly that per group.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_DEBUGGING',
    notes: `Evaluation bugs do not crash. They produce a number that looks fine and is wrong, and the model ships on it.
Eight faults from the claims, panel and loan models in this topic — symptom, cause, fix.

## 1. Precision that collapses in production

**Symptom:** the fraud model was signed off at precision 0.28 at threshold 0.10. In production the investigators find
fraud in barely one flagged claim in nine.
**Cause:** it was evaluated on claims already **referred for investigation** — an enriched sample — and deployed on
all claims, where fraud is far rarer. Precision depends on the base rate; ROC-AUC does not. Tripling the genuine
claims in the test set leaves ROC-AUC at 0.824 and drops precision at 0.10 from **0.283 to 0.115**.
**Fix:** evaluate on data drawn the way production data will be. If you must evaluate on an enriched sample, re-weight
to the production base rate before reporting precision, PR-AUC or lift.

## 2. A lift chart from the training data

**Symptom:** the deck promises "the top 10% of claims contain 71% of fraud". On the following months it is 51%.
**Cause:** the lift table was built on the training period, where the model has seen the labels: top-decile lift
**7.08** in training, **5.09** on the test months.
**Fix:** lift, gains and value curves come from held-out data — out-of-fold predictions for choosing, the test period
for reporting.

## 3. cv="prefit" stopped working

**Symptom:** a calibration script that ran last year now fails:

    InvalidParameterError: The 'cv' parameter of CalibratedClassifierCV must be an int in the range [2, inf), an
    object implementing 'split' and 'get_n_splits', an iterable or None. Got 'prefit' instead.

**Cause:** \`cv="prefit"\` was deprecated in scikit-learn 1.6 and has since been removed.
**Fix:** \`CalibratedClassifierCV(FrozenEstimator(model), method="sigmoid").fit(X_cal, y_cal)\`, with
\`from sklearn.frozen import FrozenEstimator\` — and pin library versions in the project so upgrades are deliberate.

## 4. A break-even threshold that flags most claims

**Symptom:** the team computes break-even p = 0.113 from the costs, applies it, and the model flags **78%** of
hold-out claims (5,272 of 6,730) for investigation.
**Cause:** the model was trained with \`class_weight="balanced"\`; its mean prediction is 0.30 on a 3.15% target, so
almost everything clears 0.113. A break-even threshold assumes calibrated probabilities.
**Fix:** calibrate first (sigmoid on a separate set: 6.1% flagged, 409 claims) or choose the threshold empirically from
out-of-fold value, never from the formula on uncalibrated scores.

## 5. Calibrating on the rows the model was trained on

**Symptom:** after isotonic calibration the hold-out log loss is **0.1476** — worse than the uncalibrated unweighted model
(0.1142).
**Cause:** the calibrator was fitted on the model's own training rows, where its scores are overconfident; it learned a
mapping that does not hold on new data. Fitted on a separate calibration set, sigmoid gives 0.1158.
**Fix:** calibrate on data the model never saw — a held-out calibration set, or \`cv=5\` with an unfitted model so
each calibrator sees out-of-fold scores.

## 6. Random CV on a panel

**Symptom:** a next-month order model scores CV AUC 0.702; on customers who signed up after training it scores 0.630.
**Cause:** 12 rows per customer, randomly split: the model recognises customers through \`signup_day\` and validation
measures recall of known people. GroupKFold by customer gives 0.628 — the honest number for new customers.
**Fix:** decide whom the model will score, then split by that unit (and by time).

## 7. TimeSeriesSplit on unsorted rows

**Symptom:** \`TimeSeriesSplit\` reports AUC about equal to random k-fold, and the forecast still fails next month.
**Cause:** the frame was sorted by customer ID, not by date. TimeSeriesSplit splits by row position, so "the past" was
a random mixture of months — including ones after the validation rows.
**Fix:** sort by the time column first; for monthly data, define folds by period (train months ≤ k, validate k+1 to
k+3) so no month straddles the split.

## 8. Partial dependence refuses an integer column

**Symptom:**

    ValueError: The column 'policy_age_days' contains integer data. Partial dependence plots are not supported for
    integer data: this can lead to implicit rounding with NumPy arrays or even errors with newer pandas versions.
    Please convert numerical features to floating point dtypes ahead of time to avoid problems.

**Cause:** recent scikit-learn refuses to put fractional grid values into integer columns.
**Fix:** \`X.astype({c: float for c in numeric_cols})\` before \`partial_dependence\` / \`PartialDependenceDisplay\`; pass
\`custom_values\` when you want meaningful grid points (5, 15, 30 … days).

## The order of checks before trusting an evaluation number

1. Is the evaluation data drawn like production data — same period type, same population, same base rate?
2. Did any choice (threshold, calibration, features, early stopping) use the rows being scored?
3. Is the split by the right unit — time, customer, applicant?
4. Are the scores used as probabilities? Then check calibration on separate data.
5. Did the library change since the code was written?`,
    mcqs: [
      mcq('A fraud model evaluated on claims already referred for investigation shows precision 0.28; on all claims it is about 0.11, with ROC-AUC unchanged. What happened?', [
        ['The referred sample had a far higher fraud rate, and precision depends on it', true],
        ['The model overfitted the referred claims, which lowered its ranking on the rest', false],
        ['ROC-AUC is computed incorrectly on enriched samples and should be ignored', false],
        ['The threshold changed between the two evaluations, lowering the precision', false],
      ], 'Precision falls as genuine claims become more common; ROC-AUC does not depend on the class ratio. Evaluate on data drawn like production, or re-weight to its base rate.'),
      mcq('A break-even threshold of 0.113 applied to a model trained with class_weight="balanced" flags 78% of claims. What is the fix?', [
        ['Calibrate on separate data first, or choose the threshold from out-of-fold value', true],
        ['Raise the threshold to 0.5, since a balanced model is designed to be used at 0.5', false],
        ['Retrain with even stronger class weights, so the frauds stand out more clearly', false],
        ['Lower the investigation cost in the formula until the share flagged looks right', false],
      ], 'Break-even assumes p is a probability. The balanced model\'s mean score is ten times the true rate; after sigmoid calibration only 6.1% of claims clear 0.113.'),
      mcq('A calibrator fitted on the model\'s own training rows makes hold-out log loss worse. Why?', [
        ['The model\'s training-row scores are overconfident, so the mapping does not transfer', true],
        ['Calibration always worsens log loss, and only improves the Brier score instead', false],
        ['Isotonic calibration cannot be used with gradient boosting models at all', false],
        ['The training rows are too many, and calibration needs fewer than 1,000 rows', false],
      ], 'On rows it was fitted to, a model looks more certain and more accurate than on new data. A calibrator must learn from scores the model produces on unseen rows.'),
      mcq('A lift table promises the top decile holds 71% of fraud; on new months it holds 51%. What was most likely wrong?', [
        ['The lift table was built on the training period, where labels were seen', true],
        ['The deciles were cut by claim amount rather than by the model\'s score', false],
        ['Lift tables always overstate by about 20 points and must be discounted', false],
        ['The new months had more claims, and lift falls whenever volume rises', false],
      ], 'In-sample, the model ranks its own training labels too well (top-decile lift 7.08 vs 5.09 on test). Gains must be measured on held-out data.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_PRACTICE',
    notes: `Six exercises. Work each on paper before reading the answer; the claims economics are those of the topic
(₹55,000 per fraud caught, ₹7,000 per genuine claim investigated).

## Exercise 1 — From a confusion matrix to rupees

A month has 10,000 claims, 400 fraudulent. The model flags 500, of which 160 are fraud. Compute precision, recall,
F1, the false positive rate and the net value of investigating the flagged claims.

**Answer.** TP 160, FP 340, FN 240, TN 9,260. Precision 160/500 = **0.32**; recall 160/400 = **0.40**; F1 = 2 × 0.32 ×
0.40 / 0.72 = **0.356**; FPR 340/9,600 = **0.035**. Value = 160 × 55,000 − 340 × 7,000 = ₹88.0 lakh − ₹23.8 lakh =
**₹64.2 lakh**.

## Exercise 2 — Lift and gains

A bank scores 20,000 customers for a credit-card offer; 1,000 will respond. The top decile (2,000 customers) holds 300
responders, the top two deciles 480. Compute the top-decile response rate and lift, and the share of responders found
by contacting the top 10% and top 20%, with the cumulative lift at 20%.

**Answer.** Base rate 5%. Top decile: 300/2,000 = **15%**, lift **3.0**, finding **30%** of responders. Top 20%: 480/1,000
= **48%** of responders; cumulative lift 0.48 / 0.20 = **2.4**.

## Exercise 3 — Brier score by hand

Four predictions and outcomes: 0.9 (fraud), 0.2 (genuine), 0.6 (genuine), 0.1 (fraud). Compute the Brier score and
compare it with predicting 0.5 for everything.

**Answer.** (0.1² + 0.2² + 0.6² + 0.9²) / 4 = (0.01 + 0.04 + 0.36 + 0.81) / 4 = **0.305**. Constant 0.5 scores 0.25 on every
row: **0.25**. This model is worse than a coin — its two confident mistakes (0.6 on a genuine claim, 0.1 on a fraud)
cost more than its two good calls earn.

## Exercise 4 — What miscalibration costs

In a reliability table, 500 claims have a mean predicted fraud probability of 0.20 and an actual fraud rate of 0.10.
The finance team reserves ₹60,000 per expected fraud. What do they reserve for this bin, what should it be, and what
does the table say about the model?

**Answer.** Expected frauds by the model: 500 × 0.20 = **100**, so ₹60 lakh; actually about 50, so **₹30 lakh**. The model
**over-predicts** in this range by a factor of two (the point lies below the diagonal). Recalibrate on a separate set
before any money is multiplied by these scores; the ranking may still be fine.

## Exercise 5 — Choose the validation

Name the validation scheme for each: (a) a demand forecast for next week's orders per restaurant; (b) a skin-lesion
classifier, with several photos per patient, for use on new patients; (c) a credit model for new applicants, where
default is known 12 months after disbursal; (d) a 400-row clinical dataset where you will tune five hyperparameters.

**Answer.** (a) **Forward-chaining time splits** by week — train on the past, validate on the following week(s). (b)
**Group k-fold by patient.** (c) **Time split with a 12-month label gap**, grouped by applicant if people re-apply. (d)
**Nested CV** — the tuned score from ordinary CV would be optimistic, and there is too little data for a separate test
set to be stable.

## Exercise 6 — A fairness check from counts

At the chosen threshold: group A has 4,000 genuine claims (160 investigated) and 200 frauds (120 caught); group B has
2,000 genuine claims (130 investigated) and 80 frauds (36 caught). Compute FPR and recall for each group. Which
fairness criterion fails, and for whom?

**Answer.** A: FPR 160/4,000 = **0.040**, recall 120/200 = **0.60**. B: FPR 130/2,000 = **0.065**, recall 36/80 = **0.45**.
Both **equal FPR and equal recall fail**, and both against group B: its genuine claimants are investigated 1.6 times as
often, while its frauds are caught less often — the model is simply worse for B. Look for the mechanism (a proxy
feature, less data for B) before changing thresholds.`,
    mcqs: [
      mcq('In Exercise 1, what is the net value of investigating the 500 flagged claims?', [
        ['₹64.2 lakh', true],
        ['₹88.0 lakh', false],
        ['₹51.0 lakh', false],
        ['₹23.8 lakh', false],
      ], '160 frauds × ₹55,000 = ₹88.0 lakh, minus 340 genuine investigations × ₹7,000 = ₹23.8 lakh, leaves ₹64.2 lakh. ₹88.0 lakh forgets the false alarms.'),
      mcq('In Exercise 2, what is the cumulative lift at the top 20% of customers?', [
        ['2.4', true],
        ['4.8', false],
        ['3.0', false],
        ['1.6', false],
      ], 'The top 20% holds 48% of responders, and 0.48 / 0.20 = 2.4. 3.0 is the lift of the top decile alone.'),
      mcq('In Exercise 3, how does the model\'s Brier score compare with predicting 0.5 for every claim?', [
        ['It is 0.305, worse than the 0.25 that the constant 0.5 scores', true],
        ['It is 0.305, better than the 0.50 that the constant 0.5 scores', false],
        ['It is 0.075, better than the 0.25 that the constant 0.5 scores', false],
        ['It is 0.250, exactly equal to what the constant 0.5 would score', false],
      ], 'The squared errors are 0.01, 0.04, 0.36 and 0.81, averaging 0.305. A constant 0.5 has squared error 0.25 on every row, so it scores 0.25 — lower, and better.'),
      mcq('In Exercise 4, a bin predicts 0.20 on average and 10% of its 500 claims are fraud. What is wrong with the reserve built from it?', [
        ['It reserves for about 100 frauds when about 50 occur — double the need', true],
        ['It reserves for about 50 frauds when about 100 occur — half the need', false],
        ['Nothing is wrong, since the model\'s ranking in this bin is still correct', false],
        ['It reserves too little, because the bin is below the calibration diagonal', false],
      ], 'Summing p gives 500 × 0.20 = 100 expected frauds; the actual rate gives 50. A point below the diagonal means over-prediction, so the reserve is twice what is needed.'),
      mcq('In Exercise 6, what are the false positive rates of groups A and B?', [
        ['0.040 for A and 0.065 for B', true],
        ['0.065 for A and 0.040 for B', false],
        ['0.600 for A and 0.450 for B', false],
        ['0.040 for A and 0.450 for B', false],
      ], 'FPR = genuine claims investigated / all genuine claims: 160 / 4,000 = 0.040 and 130 / 2,000 = 0.065. 0.60 and 0.45 are the recalls.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_INTERVIEW_QUESTION',
    notes: `Evaluation is where interviewers separate people who have trained models from people who have shipped them.
Expect a metric question, an explanation question and a "what went wrong in production" question. Three, with model
answers and follow-ups.

## 1. "When would you use PR-AUC instead of ROC-AUC?"

**Model answer.** "When positives are rare and what matters is how clean the flagged list is. ROC-AUC is the chance a
random positive is scored above a random negative; it plots true-positive rate against false-positive rate, and with
thousands of negatives the FPR barely moves when false alarms pile up. PR-AUC uses precision, which divides by
everything flagged, so false alarms hit it directly — and its random baseline is the prevalence, not 0.5.

On an insurance fraud model I evaluated, 4.6% fraud, ROC-AUC was 0.824 and PR-AUC 0.283. When I tripled the genuine
claims to mimic a lower fraud rate, ROC-AUC stayed at 0.824 and PR-AUC halved to 0.140 — which is what the
investigators would actually feel. So I lead with PR-AUC and precision at the team's capacity, report ROC-AUC alongside,
and always state the base rate."

**Follow-ups:**
- *"Can you compare PR-AUC across two datasets?"* Only with their base rates stated; a lower PR-AUC on a rarer target
  can be a better model.
- *"What's the Gini coefficient?"* 2 × AUC − 1; credit and insurance teams often quote it. 0.824 AUC is Gini 0.65.

## 2. "How would you explain to a claims investigator why the model flagged a claim?"

**Model answer.** "With SHAP values from the tree model. They split the claim's score, in log-odds, into a contribution
from each feature, starting from the model's average, and they add up exactly to the prediction. For one claim scored
0.74, the amount — over ₹4 lakh — added the most, a policy only five days old nearly as much, a night-time incident a
little, and the police report pulled it slightly down. I'd translate that into a sentence and show the top three
reasons on the case screen.

I'd be careful about two things. It explains the model, not the world — a feature can matter because it's a proxy,
like missing police reports standing in for rural claimants. And for the overall picture I'd use permutation
importance on held-out data rather than the built-in impurity importance, which once ranked a meaningless serial
number third in one of my models."

**Follow-ups:**
- *"SHAP or LIME?"* For tree models, TreeExplainer SHAP is exact, fast and consistent; LIME fits a local surrogate and
  can vary between runs.
- *"Two correlated features — how does that affect explanations?"* They share and swap credit; in permutation
  importance each can look unimportant. I'd group them or drop one.

## 3. "Your model scored well offline and badly in production. What do you check?"

**Model answer.** "I'd go through it in the order the evaluation could have lied. First, was the validation shaped like
production? A random split on data with repeated customers or a time trend is the usual culprit — on a delivery panel,
random CV said 0.70 and new customers got 0.63. Second, leakage: any feature recorded after the prediction moment,
or any choice — threshold, calibration, early stopping — made on the test rows. Third, the population: was the
evaluation sample enriched, like investigated claims only? Fourth, drift: compare predicted and actual rates by segment
over time. On a claims model, calibration was fine overall in training but online claims ran at 2.5 times the
predicted rate after a new fraud pattern appeared — invisible in the overall numbers, obvious in a slice by channel.
Then I'd fix the validation first, so the next offline number can be trusted, and retrain on recent data."

**Follow-ups:**
- *"How would you catch this earlier next time?"* A final test on the latest period, grouped by the deployment unit,
  plus a monitoring dashboard of score distribution, predicted vs actual rate and precision by segment.
- *"What if labels arrive months later?"* Monitor input and score drift immediately (population stability index on
  features and scores), and performance as labels mature.

## How to answer evaluation questions well

Always give the base rate, the metric that matches the decision, and how the data was split. A concrete number from a
model you have built — "ROC-AUC unchanged, PR-AUC halved" — is the most persuasive thing you can say.`,
    mcqs: [
      mcq('An interviewer asks why ROC-AUC can look good on a 0.5% fraud problem while investigators drown in false alarms. Which answer is best?', [
        ['FPR divides by the huge number of negatives, so false alarms barely move ROC', true],
        ['ROC-AUC is computed at a threshold of 0.5, which few fraud models ever use', false],
        ['ROC-AUC rewards recall only and ignores false positives in its calculation', false],
        ['ROC-AUC is unreliable above 0.8, so a good value is a sign of leakage', false],
      ], 'Thousands of false alarms are a small fraction of a huge negative class, so the curve hardly changes. Precision, which divides by flagged cases, shows the burden.'),
      mcq('Which explanation of one flagged claim should a data scientist give an investigator?', [
        ['The top SHAP contributions in plain words, noting they describe the model', true],
        ['The global impurity importances, since they apply to every claim equally', false],
        ['The full list of the model\'s trees, so the investigator can trace each split', false],
        ['The model\'s AUC, which shows how much the flag on this claim can be trusted', false],
      ], 'SHAP gives per-claim contributions that add up to the score; translated into a sentence they are usable. Global importances do not explain one case.'),
      mcq('A model scored well offline and poorly in production. What should be checked first?', [
        ['Whether validation was split like production — by time and by the right unit', true],
        ['Whether a larger model would score better offline than the current one does', false],
        ['Whether the production servers run the same version of Python as the laptop', false],
        ['Whether the training accuracy was high enough before it was deployed', false],
      ], 'Mismatched validation (random splits on panels or trends), leakage and enriched samples are the usual reasons offline numbers do not survive. Version issues matter, but rarely change accuracy.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_EVALUATION_CHECKPOINT',
    notes: `Ten questions across the topic: classifier metrics, lift and gains, calibration, validation strategy,
interpretability, and error analysis with fairness. Several give numbers — work them out before looking at the options.`,
    checkpoint: [
      mcq('A model flags 200 claims, 50 of them fraud, out of 250 frauds. What is F1?', [
        ['About 0.22', true],
        ['About 0.25', false],
        ['About 0.20', false],
        ['About 0.45', false],
      ], 'Precision 50/200 = 0.25, recall 50/250 = 0.20, F1 = 2 × 0.25 × 0.20 / 0.45 ≈ 0.222. The harmonic mean sits below the simple average.'),
      mcq('A TP is worth ₹40,000 and an FP costs ₹10,000. Above what probability should a case be acted on, if the scores are calibrated?', [
        ['0.20', true],
        ['0.25', false],
        ['0.50', false],
        ['0.80', false],
      ], 'Act when p × 40,000 > (1 − p) × 10,000, i.e. p > 10,000 / 50,000 = 0.20. 0.25 is 10,000 / 40,000, which ignores that the FP cost is paid only when the case is genuine.'),
      mcq('A campaign on a 3% response rate targets the top 20% and reaches 45% of responders. What is the cumulative lift?', [
        ['2.25', true],
        ['1.50', false],
        ['9.00', false],
        ['0.45', false],
      ], 'Cumulative lift = share of responders reached / share targeted = 0.45 / 0.20 = 2.25. The base rate does not enter this calculation.'),
      mcq('A reliability curve lies below the diagonal at high predicted probabilities. What does that mean?', [
        ['The model is overconfident there — actual rates are lower than predicted', true],
        ['The model is underconfident there — actual rates are higher than predicted', false],
        ['The model ranks badly there, so its AUC must be close to 0.5 overall', false],
        ['The model is well calibrated, since curves always dip at high values', false],
      ], 'Predicted is on the x-axis and actual on the y-axis. Points below the diagonal mean the outcome happens less often than the model says.'),
      mcq('Which calibration method suits a calibration set with only about 150 positives?', [
        ['Platt (sigmoid) scaling', true],
        ['Isotonic regression', false],
        ['Class-weight balancing', false],
        ['A threshold of 0.5', false],
      ], 'Sigmoid scaling has two parameters and is stable on small samples; isotonic regression\'s step function overfits them. Class weights distort calibration rather than fix it.'),
      mcq('A churn model will score existing customers each month. Which validation is most faithful?', [
        ['Train on earlier months and validate on the following months', true],
        ['Shuffle all customer-months and run stratified 5-fold CV', false],
        ['Group k-fold by customer with no regard to the month order', false],
        ['Leave-one-out cross-validation over all of the customer rows', false],
      ], 'The model will always predict a later month from earlier ones, for customers it already knows. A forward time split reproduces both facts; group k-fold suits new customers instead.'),
      mcq('Hyperparameters were chosen by 5-fold CV on 2,000 rows and the best CV score is reported. What is the problem, and the fix?', [
        ['The best of many CV scores is optimistic; report nested CV or a test score', true],
        ['5-fold CV is too few folds; use 20 folds and report the best score again', false],
        ['CV cannot be used for tuning; tune on the training error and report CV', false],
        ['There is no problem, because cross-validation scores are always unbiased', false],
      ], 'Selecting the maximum of noisy estimates biases it upward. Nested CV or an untouched test set measures the whole tuning procedure honestly.'),
      mcq('Permutation importance on the test set shows a near-zero value for a feature with large SHAP values. What is a likely reason?', [
        ['A correlated feature stands in for it when it is shuffled', true],
        ['SHAP values are computed on the labels, not the predictions', false],
        ['Permutation importance only works for linear model features', false],
        ['The feature must be categorical, which SHAP cannot handle', false],
      ], 'The model may use the feature heavily (SHAP) but lose little when it is shuffled because a near-copy carries the same signal. Grouped permutation reveals their joint importance.'),
      mcq('What does a SHAP value say about a feature for one prediction?', [
        ['How much it moved this prediction from the model\'s average output', true],
        ['How much changing the feature in the real world would change the outcome', false],
        ['How often the feature was used in splits across the whole model', false],
        ['How strongly the feature is correlated with the target in the data', false],
      ], 'SHAP attributes the model\'s output for one row among its inputs. It describes the model, not causal effects, and is not a split count or a correlation.'),
      mcq('Genuine claimants in one region are investigated at 7.3% versus 5.3% elsewhere, and region is not a model feature. What should be done first?', [
        ['Find the proxy feature driving the gap before choosing a remedy', true],
        ['Nothing, since the model does not use region and so cannot be unfair', false],
        ['Add region to the model, so it can learn to correct the disparity', false],
        ['Lower that region\'s threshold so that more of its claims are flagged', false],
      ], 'A feature correlated with region — such as missing police reports — can create the disparity. Understanding the mechanism comes before fixing the feature, the process or the threshold.'),
    ],
  },
];
