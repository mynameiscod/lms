/**
 * Career-track content: feature engineering and unsupervised learning (Data Science + AI, batch S2).
 *
 * DS_FEATURE_ENG — one-hot, ordinal and target encoding (and target encoding that does not leak); scaling,
 * log and power transforms and binning, and which models care; features from timestamps and short text;
 * missing values inside a pipeline; customer-level aggregates computed only from data before the prediction
 * date; and feature selection inside cross-validation.
 * DS_UNSUPERVISED — k-means and choosing k, hierarchical clustering and DBSCAN, PCA, customer segmentation
 * with RFM, and anomaly detection. The PRACTICE unit carries an auto-graded plain-Python k-means (the grader
 * runs Python 3.10 with no NumPy or scikit-learn); the topic ends with a retail-chain segmentation project.
 *
 * Builds on S1 (splits and leakage, pipelines and ColumnTransformer, cross-validation, logistic regression,
 * trees) and on the Data Analytics packs (pandas, cleaning, EDA). Every dataset is simulated with a fixed seed;
 * every output shown was produced by running the code with scikit-learn 1.9, pandas 3.0 and NumPy 2.5. The code
 * runs on scikit-learn 1.4+, and the notes say where an API is newer or has changed (TargetEncoder arrived in
 * 1.3; its random_state was deprecated in 1.9 in favour of passing a shuffled KFold as cv; LogisticRegression's
 * penalty argument was deprecated in 1.8 in favour of l1_ratio). Both topics are single-skill
 * (ML_FEATURE_ENGINEERING and ML_UNSUPERVISED), so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DS_FEATURES_UNSUP_BUNDLES: PilotBundle[] = [
  /* ══ DS_FEATURE_ENG ═════════════════════════════════════════════════════════════════════ */

  /* ── ENCODING ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_ENCODING',
    notes: `A model does arithmetic. "Fashion", "Tier 2" and "560037" are not numbers, so every categorical column has to
be turned into numbers first — and the way you do it decides what the model can learn, how many columns you
create, and whether the label sneaks into the features. This unit covers the three encoders a data scientist uses
every week: **one-hot**, **ordinal** and **target** encoding.

## The data

An e-commerce marketplace wants to predict which orders will be returned. 20,000 orders, about 15% returned:

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(7)
    n = 20000
    cats = ["Fashion", "Footwear", "Electronics", "Home", "Beauty", "Books", "Toys", "Grocery"]
    cat_eff = dict(zip(cats, [0.9, 0.7, 0.2, 0.0, -0.3, -0.8, -0.2, -1.2]))
    category = rng.choice(cats, n, p=[0.28, 0.12, 0.15, 0.13, 0.10, 0.08, 0.07, 0.07])
    tier = rng.choice(["Metro", "Tier 2", "Tier 3"], n, p=[0.45, 0.35, 0.20])
    pins = rng.choice(np.arange(110001, 860000), 1500, replace=False)
    pin_w = rng.pareto(1.2, 1500) + 0.05          # a few pincodes get most of the orders
    pin_eff = rng.normal(0, 0.6, 1500)            # each pincode has its own return habit
    idx = rng.choice(1500, n, p=pin_w / pin_w.sum())
    cod = (rng.random(n) < 0.4).astype(int)       # cash on delivery
    z = (-2.4 + np.vectorize(cat_eff.get)(category) + 0.5 * cod + pin_eff[idx]
         + np.select([tier == "Tier 3", tier == "Tier 2"], [0.3, 0.15], 0.0))
    df = pd.DataFrame({"category": category, "city_tier": tier, "pincode": pins[idx].astype(str),
                       "cod": cod, "returned": (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)})

    print(df.shape, round(df.returned.mean(), 3))
    print(df.nunique().to_dict())

    (20000, 5) 0.151
    {'category': 8, 'city_tier': 3, 'pincode': 1244, 'cod': 2, 'returned': 2}

Three kinds of categorical column sit in this table: **category** (8 values, no order), **city_tier** (3 values with
a natural order) and **pincode** (1,244 values — *high cardinality*). Each wants a different encoder. Split first,
as always:

    from sklearn.model_selection import train_test_split
    X, y = df.drop(columns="returned"), df["returned"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
    vc = X_train["pincode"].value_counts()
    print(len(vc), (vc < 5).sum())

    1165 672

1,165 pincodes appear in the training set, and **672 of them have fewer than five orders**. Keep that number in
mind; it is the whole story of target encoding.

## One-hot encoding: one column per value

    from sklearn.preprocessing import OneHotEncoder
    ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False).fit(X_train[["category"]])
    print(ohe.get_feature_names_out())
    print(ohe.transform(pd.DataFrame({"category": ["Books", "Furniture"]})))

    ['category_Beauty' 'category_Books' 'category_Electronics'
     'category_Fashion' 'category_Footwear' 'category_Grocery' 'category_Home'
     'category_Toys']
    [[0. 1. 0. 0. 0. 0. 0. 0.]
     [0. 0. 0. 0. 0. 0. 0. 0.]]

Each value becomes a 0/1 column, so a linear model learns one coefficient per category and no false order is
implied. "Furniture" never appeared in training; with \`handle_unknown="ignore"\` it becomes all zeros instead of
crashing the nightly job (the default, \`"error"\`, raises). Points to remember:

- **Use it for** nominal columns with a modest number of values — say up to a few dozen.
- \`drop="first"\` removes one column per feature. Unregularised linear models need it (otherwise the columns sum to
  the intercept); regularised models and trees do not, and dropping makes "which category" harder to read.
- \`min_frequency=50\` or \`max_categories=20\` lump rare values into one "infrequent" column (scikit-learn 1.1+).
- The output is sparse by default — fine for linear models, and it is what keeps 1,000 columns cheap.

## Ordinal encoding: one column, in an order you choose

    from sklearn.preprocessing import OrdinalEncoder
    oe = OrdinalEncoder(categories=[["Tier 3", "Tier 2", "Metro"]])
    print(oe.fit_transform(pd.DataFrame({"city_tier": ["Metro", "Tier 3", "Tier 2"]})).ravel())

    [2. 0. 1.]

Pass the order explicitly. Without \`categories=\`, the encoder sorts alphabetically — "Metro" = 0, "Tier 2" = 1,
"Tier 3" = 2 — which happens to work here and silently goes wrong for "Low / Medium / High" (High = 0, Low = 1,
Medium = 2). Ordinal encoding is right for **truly ordered** values (education level, city tier, credit band). For
**tree models** it is also an acceptable compact encoding of nominal columns: a tree can isolate any value with two
splits. For a **linear model** it is wrong on nominal columns, because it forces "Books" to sit between "Beauty" and
"Electronics" on one line.

## High cardinality: the pincode problem

One-hot on pincode creates 1,165 columns, most of them almost always zero. Two other options:

- **Group it** — map pincode to district, state or a delivery zone you already have. Often the best feature
  engineering is domain knowledge.
- **Target encoding** — replace each pincode with the **average target** for that pincode: its return rate.

The naive way is a \`groupby\`:

    means = y_train.groupby(X_train["pincode"]).mean()
    print(means.loc[["611913", "462437"]].round(3).to_dict(), vc.loc[["611913", "462437"]].to_dict())

    {'611913': 0.172, '462437': 1.0} {'611913': 1102, '462437': 1}

Pincode 611913 has 1,102 orders and a 17.2% return rate — a trustworthy number. Pincode 462437 has **one** order,
which was returned, so its "return rate" is 1.0. Encode the training rows with these means and the model sees a
feature that is, for hundreds of rare pincodes, **the row's own label**. The model learns to trust it, and on the
test set those pincodes are new or behave differently:

    naive mean encoding          train AUC 0.789   test AUC 0.675
    no pincode at all                               test AUC 0.670

A big train–test gap, and almost nothing gained over dropping the column. That is **target leakage** inside your own
feature.

## Target encoding done properly

Two fixes, both built into scikit-learn's \`TargetEncoder\` (new in 1.3):

1. **Shrinkage (smoothing).** Blend each category's mean with the global mean, weighted by how many rows it has:
   encoding = (n × category mean + m × global mean) / (n + m). With m = 20, a pincode with one returned order gets
   (1 × 1.0 + 20 × 0.151) / 21 ≈ **0.191** — barely above average — while 611913 keeps 0.172.
2. **Cross-fitting.** \`fit_transform\` encodes the training rows with **out-of-fold** means: each fold's rows are
   encoded with means learned on the other folds, so no row ever sees its own label. \`transform\` (used on test and
   production data) uses means from the whole training set.

    from sklearn.model_selection import KFold
    from sklearn.preprocessing import TargetEncoder
    from sklearn.compose import make_column_transformer
    from sklearn.pipeline import make_pipeline
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score

    def test_auc(pin_step):
        pre = make_column_transformer(
            (OneHotEncoder(handle_unknown="ignore"), ["category", "city_tier"]),
            (pin_step, ["pincode"]), remainder="passthrough")
        model = make_pipeline(pre, LogisticRegression(max_iter=2000)).fit(X_train, y_train)
        return round(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]), 3)

    cv = KFold(5, shuffle=True, random_state=0)
    print("drop pincode   ", test_auc("drop"))
    print("one-hot        ", test_auc(OneHotEncoder(handle_unknown="ignore")))
    print("target, auto   ", test_auc(TargetEncoder(cv=cv)))
    print("target, m = 20 ", test_auc(TargetEncoder(smooth=20.0, cv=cv)))

    drop pincode    0.67
    one-hot         0.698
    target, auto    0.688
    target, m = 20  0.699

| Pincode handling | Test AUC |
|---|---|
| Dropped | 0.670 |
| Naive mean (leaks) | 0.675 |
| One-hot, 1,165 columns | 0.698 |
| TargetEncoder, smooth="auto" | 0.688 |
| TargetEncoder, smooth=20 | 0.699 |

Three lessons in that table:

- **Pincode matters** (0.670 → 0.699) once it is encoded without leaking.
- **One-hot is a strong option for a regularised linear model** even with a thousand columns; target encoding
  matches it in a single column. Target encoding pays off more with tree models (one column instead of a thousand
  sparse ones) and with tens of thousands of values.
- **smooth="auto" does not protect the tiniest categories.** It estimates the shrinkage from the variance inside each
  category, and a pincode with a single order has zero variance — so it is not shrunk at all and keeps its 1.0.
  A fixed \`smooth\` (10–50 is a sensible start; tune it by CV) shrinks rare values toward the mean.

**Version note:** before 1.9, write \`TargetEncoder(smooth=20.0, random_state=0)\` for a reproducible shuffle; 1.9
deprecates \`random_state\` and \`shuffle\` in favour of passing a shuffled \`KFold\` as \`cv\`, as above. Either way,
call it **inside a pipeline**, so cross-validation refits the encoder in every fold. Never compute target means on
the whole dataset before splitting — that leaks the test labels into the training features.

## Choosing an encoder

| Column | Linear / distance models | Tree models |
|---|---|---|
| Nominal, few values | One-hot | One-hot or ordinal |
| Ordered values | Ordinal with explicit order (or one-hot if not evenly spaced) | Ordinal |
| Nominal, hundreds+ of values | Group by domain, one-hot with min_frequency, or TargetEncoder | TargetEncoder, or native categorical support (LightGBM, HistGradientBoosting) |
| IDs (order_id, customer_id) | Drop — an ID is not a feature | Drop |

And for every encoder: decide what happens to a value never seen in training, because production will send one.`,
    workedExample: `**Task: a colleague's churn notebook for a food-delivery app reports CV AUC 0.91 — far above the 0.74 everyone
else gets. The only change is a new feature, \`restaurant_churn_rate\`: for each customer's favourite restaurant, the
share of that restaurant's customers who churned. It was computed with one \`groupby\` on the full dataset before
\`cross_val_score\`. Is the 0.91 real?**

**Step 1 — Ask where the number came from.** The feature is a target mean: churned customers per restaurant. It was
computed on all rows, including each customer's own label and the labels of every future validation fold.

**Step 2 — Look at the small groups.** 40% of restaurants are the favourite of fewer than five customers. For a
restaurant with two customers who both churned, the feature is 1.0 and says, in effect, "this customer churned".
That is the label wearing a disguise.

**Step 3 — Re-measure honestly.** Put the encoding inside the pipeline so every CV fold learns it from its own
training rows only, with cross-fitting and shrinkage:

    pre = make_column_transformer(
        (TargetEncoder(smooth=20.0, cv=KFold(5, shuffle=True, random_state=0)), ["fav_restaurant"]),
        remainder="passthrough")
    pipe = make_pipeline(pre, LogisticRegression(max_iter=2000))
    cross_val_score(pipe, X, y, cv=5, scoring="roc_auc")

**Step 4 — Report the result whatever it is.** If the honest AUC is, say, 0.76, the restaurant really does carry
signal — two points of AUC — and the feature stays. The 0.91 is withdrawn.

**What to say:** "The restaurant churn rate was computed with every label, including the ones we were testing on, so
small restaurants handed the model the answer. Encoded inside cross-validation, it adds about two points of AUC, not
seventeen."`,
    mcqs: [
      mcq('A city_tier column holds "Metro", "Tier 2" and "Tier 3". What does OrdinalEncoder() do with no categories argument?', [
        ['It numbers the values alphabetically, which may not match their real order', true],
        ['It works out the real order from how often each of the values appears', false],
        ['It raises an error, since ordinal encoding requires an explicit order', false],
        ['It creates three new 0/1 columns, exactly like the one-hot encoder', false],
      ], 'Without categories=, the encoder sorts the values. That happens to suit the tier names but turns "Low/Medium/High" into High=0, Low=1, Medium=2. Pass the order explicitly.'),
      mcq('A pincode seen once in training, on a returned order, has a naive target mean of 1.0. Why is that a problem for the model?', [
        ['For rare pincodes the feature equals the row\'s own label, so the model learns to trust a leak', true],
        ['A value of exactly 1.0 cannot be used by logistic regression, which needs values below 1', false],
        ['Target means must be computed on the test set instead, to reflect future return behaviour', false],
        ['A pincode should be one-hot encoded whenever it has fewer than a thousand distinct values', false],
      ], 'With one order, the "return rate" is that order\'s label. The training AUC rose to 0.789 while the test AUC stayed at 0.675 — the feature memorised labels instead of describing pincodes.'),
      mcq('Why did TargetEncoder(smooth="auto") leave a one-order pincode at 1.0 while smooth=20 pulled it to about 0.19?', [
        ['"auto" estimates shrinkage from within-category variance, which is zero for a single order', true],
        ['"auto" turns smoothing off entirely, so it never shrinks any category toward the mean', false],
        ['"auto" applies shrinkage only to categories that also appear in the test set at least once', false],
        ['"auto" uses the median rather than the mean, and the median of a single 1 is still 1', false],
      ], 'The automatic rule sets the blend from the variance of the target inside each category. A category with one row has no variance, so it gets no shrinkage. A fixed smooth blends it with the global mean.'),
    ],
    checkpoint: [
      mcq('A linear model must use a payment_mode column with five unordered values. Which encoding fits best?', [
        ['One-hot encoding, one 0/1 column for each payment mode', true],
        ['Ordinal encoding, numbering the modes alphabetically', false],
        ['Target encoding computed on the full dataset first', false],
        ['Leaving the text as it is so the model can read it', false],
      ], 'Five unordered values are exactly what one-hot is for: a coefficient per mode and no invented order. Ordinal codes would place the modes on a line that means nothing.'),
      mcq('What does TargetEncoder.fit_transform do differently from calling fit and then transform on the training data?', [
        ['It encodes each training row with means learned on other folds', true],
        ['It skips smoothing, so the encodings are the raw category means', false],
        ['It encodes using the test set\'s labels as well as the training set', false],
        ['Nothing — the two calls give identical output on training rows', false],
      ], 'fit_transform cross-fits: rows in each fold are encoded with means from the remaining folds, so no row sees its own label. fit().transform() would use full-training means and leak.'),
      mcq('A model trained last month meets a pincode it never saw, and the OneHotEncoder was built with handle_unknown="ignore". What happens?', [
        ['The row gets all zeros for pincode and is scored on its other features', true],
        ['The row is assigned the most frequent pincode from the training data', false],
        ['The pipeline raises an error and the whole batch fails to be scored', false],
        ['The encoder adds a new column, and the model retrains automatically', false],
      ], 'Ignoring unknowns encodes the value as all zeros. The prediction then rests on the other features — so monitor how often it happens.'),
    ],
  },

  /* ── SCALING_TRANSFORMS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_SCALING_TRANSFORMS',
    notes: `Numbers arrive in units that suit the business — rupees, days, percentages — not the model. This unit covers
three changes you make to numeric columns: **scaling** (same information, comparable units), **transforming** (a
new shape, usually to tame skew) and **binning** (turning a number into ranges). The first question is always:
**which model will use the feature?** Some models care a great deal; trees do not care at all.

## The data

8,000 personal-loan applications at an NBFC (non-banking finance company), 11.8% defaulted:

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(11)
    n = 8000
    income = np.round(np.exp(rng.normal(10.6, 0.6, n)), -2)                       # monthly, ₹
    income[rng.choice(n, 12, replace=False)] = rng.integers(20, 60, 12) * 100000   # a few very high earners
    age = rng.integers(21, 60, n)
    utilisation = np.clip(rng.beta(2, 3, n), 0, 1).round(3)                        # credit-card utilisation
    emi_ratio = np.clip(rng.normal(0.35, 0.12, n), 0.02, 0.9).round(3)            # EMIs / income
    z = (-3.0 - 1.4 * (np.log(income) - 10.6) + 2.2 * (utilisation - 0.4)
         + 3.0 * (emi_ratio - 0.35) + 0.06 * np.abs(age - 38))
    default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    df = pd.DataFrame({"monthly_income": income, "age": age, "utilisation": utilisation,
                       "emi_ratio": emi_ratio, "default": default})

    print(df.drop(columns="default").skew().round(2).to_dict())

    {'monthly_income': 26.25, 'age': -0.01, 'utilisation': 0.25, 'emi_ratio': 0.01}

Income has a skewness of **26**: most applicants earn ₹25,000–₹60,000 a month, a dozen earn ₹20–60 lakh. Default risk
here depends on the **log** of income — each doubling of income cuts the odds by the same factor — and on age in a
U-shape (the youngest and oldest applicants are riskier).

## Scaling: StandardScaler and RobustScaler

\`StandardScaler\` subtracts the mean and divides by the standard deviation. Both are dragged by the dozen
millionaires:

    from sklearn.preprocessing import StandardScaler, RobustScaler
    inc = df[["monthly_income"]]
    typical = pd.DataFrame({"monthly_income": [25000, 40000, 90000]})
    ss = StandardScaler().fit(inc)
    rs = RobustScaler().fit(inc)
    print("standard: mean", round(ss.mean_[0]), "sd", round(ss.scale_[0]), ss.transform(typical).ravel().round(2))
    print("robust: median", rs.center_[0], "IQR", rs.scale_[0], rs.transform(typical).ravel().round(2))

    standard: mean 54676 sd 165113 [-0.18 -0.09  0.21]
    robust: median 40800.0 IQR 34100.0 [-0.46 -0.02  1.44]

The standard deviation is ₹1.65 lakh — three times a typical income — so ₹25,000, ₹40,000 and ₹90,000 all land
within 0.4 of each other. \`RobustScaler\` uses the median and the interquartile range, which the outliers barely
move, so ordinary applicants stay spread out. Neither scaler changes the **shape**: the millionaires are still 170
units away.

**Who needs scaling?** Anything that adds features together or measures distance: linear and logistic regression
with regularisation (the penalty treats all coefficients alike), kNN, SVMs, k-means, PCA and neural networks.
**Who does not?** Trees and tree ensembles — a split asks "income > 52,000?", and that question has the same answer
in rupees, lakhs or standard deviations.

## Transforms: changing the shape

    print(round(np.log1p(df.monthly_income).skew(), 2))

    0.54

\`log1p\` (log of 1 + x, safe at zero) takes the skew from 26 to 0.5. \`PowerTransformer\` finds the best power
automatically — Box-Cox for strictly positive data, Yeo-Johnson (the default) for any sign:

    from sklearn.preprocessing import PowerTransformer
    pt = PowerTransformer(method="yeo-johnson").fit(inc)
    print(pt.lambdas_.round(3), round(pd.Series(pt.transform(inc).ravel()).skew(), 2))

    [-0.146] -0.05

A λ near 0 means "close to a log". \`QuantileTransformer\` goes further and maps any distribution to uniform or
normal, at the cost of flattening real distances between values.

Does it matter for the model? Compare logistic regression on raw and logged income, everything else equal:

    from sklearn.compose import make_column_transformer
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import FunctionTransformer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score

    X, y = df.drop(columns="default"), df["default"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
    raw = make_pipeline(StandardScaler(), LogisticRegression()).fit(X_train, y_train)
    logged = make_pipeline(
        make_column_transformer((FunctionTransformer(np.log1p), ["monthly_income"]), remainder="passthrough"),
        StandardScaler(), LogisticRegression()).fit(X_train, y_train)
    for name, m in [("raw income", raw), ("log income", logged)]:
        print(name, round(roc_auc_score(y_test, m.predict_proba(X_test)[:, 1]), 3))

    probe = pd.DataFrame({"monthly_income": [15000, 40000, 150000], "age": 38, "utilisation": 0.4, "emi_ratio": 0.35})
    print("raw ", raw.predict_proba(probe)[:, 1].round(3))
    print("log ", logged.predict_proba(probe)[:, 1].round(3))

    raw income 0.764
    log income 0.768

    raw  [0.194 0.103 0.004]
    log  [0.254 0.083 0.015]

AUC moves only 0.004 — ranking is similar — but the **probabilities** differ where it matters. In the test set,
applicants earning under ₹20,000 actually defaulted **27.7%** of the time. The raw-income model says 19.4% for a
₹15,000 earner; the log model says 25.4%. It also stops claiming that a ₹1.5 lakh earner is a 0.4% risk. A straight
line in rupees cannot bend the way risk does; a straight line in log-rupees can.

**Trees ignore monotone transforms.** A depth-4 tree on raw and on logged income:

    from sklearn.tree import DecisionTreeClassifier
    log_tr = X_train.assign(monthly_income=np.log1p(X_train.monthly_income))
    log_te = X_test.assign(monthly_income=np.log1p(X_test.monthly_income))
    p1 = DecisionTreeClassifier(max_depth=4, random_state=0).fit(X_train, y_train).predict_proba(X_test)[:, 1]
    p2 = DecisionTreeClassifier(max_depth=4, random_state=0).fit(log_tr, y_train).predict_proba(log_te)[:, 1]
    print(round(roc_auc_score(y_test, p1), 3), round(roc_auc_score(y_test, p2), 3), np.allclose(p1, p2))

    0.72 0.72 True

Every split on log income has an equivalent split on raw income, so the tree is the same tree. Do not spend time
transforming features for tree ensembles.

## Binning

\`KBinsDiscretizer\` cuts a number into ranges. Quantile bins on income (fitted on training data):

    from sklearn.preprocessing import KBinsDiscretizer
    kb = KBinsDiscretizer(n_bins=4, encode="ordinal", strategy="quantile").fit(X_train[["monthly_income"]])
    print(kb.bin_edges_[0].round(-2))

    [   5600.   27100.   40900.   61900. 5900000.]

Binning **throws information away** (₹27,200 and ₹40,800 become the same), so do it only for a reason:

- **A non-monotone effect in a linear model.** Age has a U-shaped effect; a single age coefficient can only say
  "older is riskier" or "younger is riskier". Five one-hot age bins let the line bend: adding them took test AUC from
  0.768 to **0.773**. (A spline or a tree would do the same job more smoothly.)
- **A business rule or a scorecard.** Credit scorecards are traditionally built from bins because each bin gets
  points a credit officer can read.
- **Not** because "binning removes noise" — the model usually loses more than it gains.

**Version note:** from scikit-learn 1.7, quantile binning accepts \`quantile_method=\`; 1.9 defaults to
"averaged_inverted_cdf", so bin edges can differ slightly from older versions.

## Fit on training data only

Every scaler, transformer and binner learns something — a mean, a median, a λ, bin edges. Learn it from the
training data, inside the pipeline, so cross-validation refits it in every fold and production uses exactly the
numbers training used. A \`StandardScaler\` fitted on the whole dataset before splitting is a small leak; a
\`QuantileTransformer\` or bin edges fitted on everything are a bigger one.

| Model | Scale? | Transform skewed features? |
|---|---|---|
| Linear / logistic regression | Yes (regularisation) | Often — when the effect is multiplicative |
| kNN, SVM, k-means, PCA | Yes — distance depends on units | Often — outliers dominate distances |
| Neural networks | Yes — training is unstable otherwise | Helpful |
| Trees, random forests, boosting | No | No — monotone transforms change nothing |`,
    mcqs: [
      mcq('Monthly income has a mean of ₹54,676 and a standard deviation of ₹1.65 lakh because of a dozen very high earners. What happens to ordinary applicants under StandardScaler?', [
        ['They are squeezed close together, since the outliers inflate the deviation', true],
        ['They spread out evenly, since standard scaling removes the outliers first', false],
        ['They become negative while the high earners become positive, and nothing more', false],
        ['They are unchanged, because StandardScaler only rescales the outlying rows', false],
      ], 'Dividing by ₹1.65 lakh puts ₹25,000, ₹40,000 and ₹90,000 within 0.4 of each other. RobustScaler, using the median and IQR, keeps them apart.'),
      mcq('A depth-4 decision tree is trained on raw income and again on log income. What do you expect?', [
        ['Identical predictions, since each split on log income matches one on raw income', true],
        ['Better predictions on log income, since trees need roughly normal features to split', false],
        ['Better predictions on raw income, since the log transform loses information', false],
        ['An error on raw income, since trees cannot split on very skewed feature values', false],
      ], 'A tree only asks "is the value above a threshold?", and log is monotone, so the same rows fall on the same side. The run showed identical predictions.'),
      mcq('Why did one-hot age bins help the logistic regression from 0.768 to 0.773 AUC?', [
        ['Risk is U-shaped in age, and bins let a linear model bend', true],
        ['Bins remove noise, so binning a feature always improves AUC', false],
        ['Age was skewed, and binning it fixed the skew completely', false],
        ['Logistic regression cannot use whole-number age directly', false],
      ], 'A single coefficient makes risk rise or fall with age; the data had the youngest and oldest riskier. Separate bins give each age range its own effect.'),
    ],
    checkpoint: [
      mcq('Which of these models needs its numeric features scaled before training?', [
        ['k-nearest neighbours, because it compares distances', true],
        ['A random forest, because its trees compare averages', false],
        ['A gradient-boosted tree model trained with LightGBM', false],
        ['A single decision tree limited to a depth of five', false],
      ], 'Distances add up differences across features, so the feature in the largest units dominates. Trees split one feature at a time and are unaffected by scale.'),
      mcq('A logistic regression on raw income gives AUC 0.764; on log income 0.768. What else did the log version improve?', [
        ['Its probabilities for low earners moved closer to their real default rate', true],
        ['Its training time, because logged values are smaller numbers to multiply together', false],
        ['Nothing at all, since a difference of 0.004 in AUC is just random noise', false],
        ['Its decision tree splits, which are now placed at round income values', false],
      ], 'Ranking barely changed, but the raw model said 19.4% for a ₹15,000 earner while that group defaulted 27.7% of the time; the log model said 25.4%.'),
      mcq('A colleague fits a QuantileTransformer on the whole dataset and then splits into train and test. What is wrong?', [
        ['The transform learned the test rows\' distribution — a leak', true],
        ['QuantileTransformer cannot be used on columns with outliers', false],
        ['Nothing, since the transformer never looks at the label column', false],
        ['The transform must be fitted on the test set alone instead', false],
      ], 'Even without labels, the quantiles came from test rows. Fit every transformer on training data inside the pipeline so CV and production use only what training saw.'),
    ],
  },

  /* ── DATES_TEXT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_DATES_TEXT',
    notes: `Two kinds of raw data arrive in almost every Indian business dataset and no model can use as they are:
**timestamps** (order placed at 2026-03-08 21:40) and **short text** (a review, a complaint, a product title). A
timestamp is a bundle of features — hour, day of week, how long since the last order — and text becomes numbers
by counting words. Both are easy to get subtly wrong.

## Features from a timestamp

Five orders on a food-delivery app:

    import numpy as np
    import pandas as pd

    orders = pd.DataFrame({
        "order_id": [9001, 9002, 9003, 9004, 9005],
        "customer_id": ["K17", "K17", "K42", "K17", "K42"],
        "placed_at": pd.to_datetime(["2026-03-06 13:05", "2026-03-08 21:40", "2026-03-08 23:55",
                                     "2026-03-14 00:20", "2026-03-15 20:10"]),
    })
    o = orders.copy()
    o["hour"] = o.placed_at.dt.hour
    o["dow"] = o.placed_at.dt.dayofweek                   # Monday = 0
    o["is_weekend"] = (o.dow >= 5).astype(int)
    o["hour_sin"] = np.sin(2 * np.pi * o.hour / 24).round(3)
    o["hour_cos"] = np.cos(2 * np.pi * o.hour / 24).round(3)
    o = o.sort_values(["customer_id", "placed_at"])
    o["days_since_prev"] = (o.groupby("customer_id").placed_at.diff()
                              .dt.total_seconds().div(86400).round(2))
    print(o.drop(columns=["placed_at"]).to_string(index=False))

     order_id customer_id  hour  dow  is_weekend  hour_sin  hour_cos  days_since_prev
         9001         K17    13    4           0    -0.259    -0.966              NaN
         9002         K17    21    6           1    -0.707     0.707             2.36
         9004         K17     0    5           1     0.000     1.000             5.11
         9003         K42    23    6           1    -0.259     0.966              NaN
         9005         K42    20    6           1    -0.866     0.500             6.84

What each feature is for:

- **Calendar parts** — hour, day of week, month, day of month. Delivery times depend on the dinner rush; salaried
  customers order more on the 1st–5th, after payday; festivals (Diwali, Eid, Onam) move demand by region, so a
  holiday table joined by date and state is often the single best date feature.
- **Durations and recency** — days since the previous order, since signup, since the last complaint. These usually
  beat calendar parts for predicting behaviour. Note the **NaN** for each customer's first order: "no previous
  order" is information, not an error — keep an indicator.
- **Never the raw timestamp.** A tree that splits on "placed_at > 1 March" has learned a date, not a pattern, and
  that rule is useless next month.

## Cyclical features

Hour 23 and hour 0 are one hour apart, but as numbers they are 23 apart. For a linear or distance-based model,
encode a cycle as a point on a circle — sine and cosine of the angle:

    def dist(h1, h2):
        a = np.array([np.sin(2 * np.pi * h1 / 24), np.cos(2 * np.pi * h1 / 24)])
        b = np.array([np.sin(2 * np.pi * h2 / 24), np.cos(2 * np.pi * h2 / 24)])
        return round(float(np.linalg.norm(a - b)), 3)
    print(dist(23, 0), dist(11, 12), dist(0, 12))

    0.261 0.261 2.0

Now 23→0 is exactly as close as 11→12, and midnight and noon are opposite. You need **both** sine and cosine: sine
alone gives 3 a.m. and 9 a.m. the same value (both 0.707), and only the cosine separates them. Trees can usually find "hour between 19 and 23" without help; one-hot hours also work
when there is enough data.

## Leakage with dates

Every date feature must be computable **at prediction time**. "Days until the customer's next order" is the target
in disguise. "Number of orders this month" computed at month end leaks the rest of the month into a prediction made
on the 10th. The next-but-one unit on aggregates is entirely about this.

## Text: bag of words

Four reviews:

    from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
    reviews = ["food was cold and late", "late again, rider was rude",
               "great food, quick delivery", "item missing, food cold"]
    cv = CountVectorizer()
    M = cv.fit_transform(reviews)
    print(cv.get_feature_names_out())
    print(M.toarray())

    ['again' 'and' 'cold' 'delivery' 'food' 'great' 'item' 'late' 'missing'
     'quick' 'rider' 'rude' 'was']
    [[0 1 1 0 1 0 0 1 0 0 0 0 1]
     [1 0 0 0 0 0 0 1 0 0 1 1 1]
     [0 0 0 1 1 1 0 0 0 1 0 0 0]
     [0 0 1 0 1 0 1 0 1 0 0 0 0]]

The vectorizer **learns a vocabulary** from the training text (lower-cased, punctuation dropped) and turns each
review into a row of word counts. Word order is gone — "not good" and "good, not" look the same — which is why it is
called a *bag* of words. The matrix is sparse: real vocabularies run to tens of thousands of columns, nearly all
zero for any one review.

## TF-IDF: weighting the words that distinguish

    tf = TfidfVectorizer()
    T = tf.fit_transform(reviews)
    row = pd.Series(T.toarray()[0], index=tf.get_feature_names_out())
    print(row[row > 0].round(3).sort_values(ascending=False).to_dict())

    {'and': 0.553, 'cold': 0.436, 'late': 0.436, 'was': 0.436, 'food': 0.353}

TF-IDF multiplies each count by the **inverse document frequency** — words in few documents get more weight — and
normalises each row to length 1. "food" appears in three of the four reviews, so it gets the lowest weight. But
look at the top: **"and"**, because it happens to appear in only one review. On four documents, IDF is noisy; on
real data, stop words are everywhere and fall away naturally. You can also remove them and add word pairs:

    tf2 = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    T2 = tf2.fit_transform(reviews)
    row = pd.Series(T2.toarray()[0], index=tf2.get_feature_names_out())
    print(row[row > 0].round(3).sort_values(ascending=False).to_dict())

    {'cold late': 0.553, 'cold': 0.436, 'food cold': 0.436, 'late': 0.436, 'food': 0.353}

Bigrams (\`ngram_range=(1, 2)\`) keep a little word order — "not good" becomes a feature of its own. Note the oddity:
"cold late" is a bigram that never appeared, because the bigrams are formed **after** "was" and "and" were removed.
scikit-learn's English stop-word list also contains "not" and "no", which matter for sentiment — check the list
before using it on reviews.

## Words the vectorizer never saw

    print(tf.transform(["delivery boy was late and food was cold"]).nnz, tf.transform(["parcel damaged"]).nnz)

    6 0

The vocabulary is fixed at fit time. "boy", "parcel" and "damaged" are unknown, so "parcel damaged" becomes a row of
zeros — the model predicts from nothing. Fit the vectorizer inside the pipeline on training text, set
\`min_df=\` to drop words seen only once or twice, and monitor the share of empty rows in production. Customer text
in India is often Hinglish ("khana thanda tha") or transliterated; a vocabulary learned from English reviews will
miss it, and character n-grams (\`analyzer="char_wb", ngram_range=(3, 5)\`) are more robust to spelling variants.

## Putting it in a pipeline

    from sklearn.compose import make_column_transformer
    from sklearn.pipeline import make_pipeline
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import OneHotEncoder

    pre = make_column_transformer(
        (TfidfVectorizer(min_df=3, ngram_range=(1, 2)), "review_text"),   # a single column name, not a list
        (OneHotEncoder(handle_unknown="ignore"), ["dow"]),
        remainder="passthrough")
    model = make_pipeline(pre, LogisticRegression(max_iter=2000))

The text vectorizer takes **a column name as a string**, because it expects one string per row; a list would hand
it a 2-D frame and fail. TF-IDF features with a linear model are still a strong, fast baseline for classifying
tickets and reviews — try them before reaching for a language model.`,
    mcqs: [
      mcq('Why encode the hour of day as a sine and a cosine rather than as the number 0–23?', [
        ['So 23:00 and 00:00 sit as close together as 11:00 and 12:00', true],
        ['So the hour becomes a categorical value that trees can split on', false],
        ['Because sine and cosine values are smaller numbers than the hour', false],
        ['Because a model cannot use a whole number between 0 and 23 at all', false],
      ], 'On a circle, hours one apart are always the same distance apart: 0.261 for both 23→0 and 11→12. As plain numbers, 23 and 0 look maximally different.'),
      mcq('A TfidfVectorizer fitted on English reviews turns the review "parcel damaged" into a row of zeros. Why?', [
        ['Neither word is in the vocabulary it learned when it was fitted', true],
        ['TF-IDF gives zero weight to any word that appears only once', false],
        ['Two-word reviews are too short for TF-IDF to give any weight', false],
        ['The words were dropped by the English stop-word list by default', false],
      ], 'The vocabulary is fixed at fit time; unseen words are ignored. Monitor how often rows come out empty, and consider character n-grams for misspellings and Hinglish.'),
      mcq('In a churn model built on 10 March, which date feature would leak?', [
        ['Number of orders the customer places in the whole of March', true],
        ['Days between the customer\'s signup date and 10 March itself', false],
        ['Share of the customer\'s February orders placed on a weekend', false],
        ['Days since the customer\'s most recent order before 10 March', false],
      ], 'Orders from 11 to 31 March are in the future at prediction time. Every feature must be computable from data available on 10 March.'),
    ],
    checkpoint: [
      mcq('What does a bag-of-words representation throw away?', [
        ['The order of the words in each piece of text', true],
        ['How many times each word appears in the text', false],
        ['Which words appear in the text in the first place', false],
        ['The total number of different documents in the data', false],
      ], 'Counting words keeps which words and how often, but "not good" and "good, not" become identical. Bigrams recover a little order.'),
      mcq('TF-IDF gives "food" a low weight in a set of restaurant reviews. What is the reason?', [
        ['It appears in most of the reviews, so it does little to tell them apart', true],
        ['It is on the English stop-word list, which TF-IDF always applies', false],
        ['It is a short word, and TF-IDF divides each weight by the word length', false],
        ['It appears only once in each review, so its term frequency is small', false],
      ], 'Inverse document frequency is low for words found in many documents. A word in every review carries little information about any one of them.'),
      mcq('A tree model is given the raw order timestamp as a number and splits on "placed_at > 1 March". What is the problem?', [
        ['It learned a date, not a pattern, and the rule is useless next month', true],
        ['Trees cannot split on timestamps, so the split must be a data error', false],
        ['The split should be on the timestamp\'s logarithm to reduce its skew', false],
        ['Nothing — a split on the date is the strongest seasonal feature available', false],
      ], 'Absolute time only separates past from future in the training window. Extract repeating parts (hour, weekday, payday) and durations instead.'),
    ],
  },

  /* ── MISSING_IN_MODELS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_MISSING_IN_MODELS',
    notes: `The cleaning packs taught you to find and explain missing values. This unit is about what happens to them
**inside a model**: most scikit-learn estimators refuse NaN, the fill value must be learned from training data
only, the fact that a value is missing is often a feature in itself, and some models handle gaps on their own.

## The data

10,000 loan applications. Income is missing for 11% — more often for self-employed applicants, and (as lenders
know well) more often for applicants who go on to default. Bureau score is missing for 8%, at random:

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(21)
    n = 10000
    self_emp = (rng.random(n) < 0.3).astype(int)
    income = np.round(np.exp(rng.normal(10.5, 0.5, n)), -2)
    bureau = np.clip(rng.normal(710, 60, n), 300, 900).round()
    emi_ratio = np.clip(rng.normal(0.35, 0.12, n), 0.02, 0.9).round(3)
    z = (-2.6 - 1.0 * (np.log(income) - 10.5) - 0.012 * (bureau - 710)
         + 2.5 * (emi_ratio - 0.35) + 0.4 * self_emp)
    default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    miss_p = 0.04 + 0.18 * self_emp + 0.15 * default           # income goes missing more for these
    income_obs = np.where(rng.random(n) < miss_p, np.nan, income)
    bureau_obs = np.where(rng.random(n) < 0.08, np.nan, bureau) # thin-file applicants, at random here
    df = pd.DataFrame({"monthly_income": income_obs, "bureau_score": bureau_obs,
                       "emi_ratio": emi_ratio, "self_employed": self_emp, "default": default})

    print(df.isna().mean().round(3).to_dict())
    print(df.groupby(df.monthly_income.isna())["default"].mean().round(3).to_dict())

    {'monthly_income': 0.112, 'bureau_score': 0.076, 'emi_ratio': 0.0, 'self_employed': 0.0, 'default': 0.0}
    {False: 0.086, True: 0.232}

Applicants with no income on file default at **23.2%**, against 8.6% for the rest. The gap is not noise; it is how
the data was produced. In the language of the statistics packs, income is **missing not at random**.

## Most models refuse NaN

    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LogisticRegression
    X, y = df.drop(columns="default"), df["default"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=0)
    LogisticRegression().fit(X_train, y_train)

    ValueError: Input X contains NaN.

The tempting fix is \`dropna()\`. It keeps 82.4% of the training rows, and at prediction time it **cannot score**
the rest: 484 of the 2,500 test applicants would get no decision at all — and they are the riskiest group. Dropping
rows is acceptable only when very few are missing and the model will never meet a missing value in production.

## Imputing inside the pipeline

    from sklearn.pipeline import make_pipeline
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import roc_auc_score

    def test_auc(model):
        model.fit(X_train, y_train)
        return round(roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]), 3)

    print("median", test_auc(make_pipeline(SimpleImputer(strategy="median"),
                                           StandardScaler(), LogisticRegression())))
    print("median + indicator", test_auc(make_pipeline(SimpleImputer(strategy="median", add_indicator=True),
                                                       StandardScaler(), LogisticRegression())))

    median 0.698
    median + indicator 0.716

The imputer **learns** its fill values on training data and stores them; \`transform\` applies the same values to
test rows and to production:

    imp = SimpleImputer(strategy="median", add_indicator=True).fit(X_train)
    print(imp.get_feature_names_out())

    ['monthly_income' 'bureau_score' 'emi_ratio' 'self_employed'
     'missingindicator_monthly_income' 'missingindicator_bureau_score']

\`imp.statistics_\` holds the medians (income ₹37,200, bureau score 711). Because the imputer lives in the pipeline,
cross-validation refits it on each fold's training rows, and the production model carries the exact numbers it was
trained with. The classic **train/serve skew** bug is the opposite: a notebook fills NaN with \`df.median()\` computed
on all data, and the production code fills with 0 or with a median recomputed on today's batch.

## Why the indicator helped

Median imputation tells the model "this applicant earns a typical ₹37,200" — a guess that hides the most predictive
fact about them. \`add_indicator=True\` adds a 0/1 column per feature that had gaps in training, so the model can
learn "income not provided → riskier". AUC rose from 0.698 to **0.716**. When missingness is informative, the
indicator is usually worth more than a cleverer fill value. When values are missing completely at random (the bureau
score here), the indicator costs little and the model learns to ignore it.

## Which fill value?

- **Median** for skewed numbers (income), **mean** for symmetric ones. Neither invents new information.
- **Most frequent** or a constant like \`"missing"\` for categoricals — a separate "missing" category is often best,
  for the same reason as the indicator.
- **A constant with a meaning** when missing means zero: "number of loans" missing for a new-to-credit applicant is
  0, not the median.
- \`KNNImputer\` and \`IterativeImputer\` (still experimental: \`from sklearn.experimental import
  enable_iterative_imputer\` first) predict each missing value from the other columns. They can help when features
  are strongly related, cost much more, and still belong inside the pipeline. Try them; do not assume they win.

## Models that handle missing values themselves

\`HistGradientBoostingClassifier\`, XGBoost and LightGBM accept NaN directly: at each split they learn which side
missing values should go to, which captures informative missingness automatically.

    from sklearn.ensemble import HistGradientBoostingClassifier
    print(test_auc(HistGradientBoostingClassifier(learning_rate=0.05, max_depth=3, max_iter=200, random_state=0)))

    0.703

On this nearly linear problem boosting does not beat the logistic model with indicators (0.716), but it got 0.703
with no imputation code at all. Native handling is convenient, not magic: the model still only knows about the
kinds of missingness it saw in training. Decision trees and random forests in scikit-learn accept NaN from 1.3–1.4
onwards as well; check your version's documentation before relying on it.

## Missing values at prediction time

Two production cases need a decision before launch:

1. **A column that was never missing in training arrives missing.** The imputer fills it (with its learned median),
   but no indicator exists for it, because \`add_indicator\` only creates columns for features that had gaps in
   training. Decide whether to score or refer such cases.
2. **The share of missing values changes.** A new onboarding app makes income optional and missingness jumps from
   11% to 40%. The indicator no longer means what it meant — "did not provide income" used to be a red flag, and now
   it is normal. Monitor missing-value rates per feature as part of model monitoring.`,
    mcqs: [
      mcq('Applicants with no income on file default at 23.2%, against 8.6% for the rest. What does this suggest for the model?', [
        ['Add a missing-value indicator, because the gap itself predicts default', true],
        ['Drop those applicants, since a missing income makes their rows unreliable', false],
        ['Fill income with the mean, which removes the bias the gap would introduce', false],
        ['Use IterativeImputer, which always recovers the true value of the income', false],
      ], 'Missingness here is informative — it is related to the outcome. An indicator lets the model use that; adding it took test AUC from 0.698 to 0.716.'),
      mcq('Why should SimpleImputer sit inside the pipeline instead of filling NaN with df.median() before splitting?', [
        ['The median is then learned from training rows only, and reused in production', true],
        ['The pipeline version fills NaN with smarter values than the plain median does', false],
        ['df.median() cannot handle columns that have more than ten percent missing', false],
        ['SimpleImputer runs faster than pandas, which matters for large loan books', false],
      ], 'Inside the pipeline the fill value is fitted per CV fold and stored for prediction, so training and serving agree. A median over all rows uses test data and is easily recomputed differently later.'),
      mcq('A HistGradientBoostingClassifier is trained on data with NaN and no imputer. How does it treat a missing value at a split?', [
        ['It learns, per split, which branch missing values should follow', true],
        ['It fills each missing value with the column mean before training', false],
        ['It drops every row that contains a NaN before it starts training', false],
        ['It raises an error unless the parameter allow_nan=True is passed', false],
      ], 'Histogram-based boosting (and XGBoost, LightGBM) choose a direction for missing values at each split during training, which captures informative missingness without an imputer.'),
    ],
    checkpoint: [
      mcq('A column called num_existing_loans is empty for applicants with no credit history. What is the best fill value?', [
        ['Zero, because missing here means the applicant has no loans', true],
        ['The median of the column, learned from the training rows', false],
        ['The most frequent value of the column in the whole dataset', false],
        ['A value predicted by KNNImputer from all the other columns', false],
      ], 'When missing has a known meaning, use it. A new-to-credit applicant has zero loans; the median would invent loans they do not have.'),
      mcq('A model was trained with SimpleImputer(add_indicator=True), and only income had gaps in training. In production, bureau_score arrives missing. What happens?', [
        ['It is filled with the training median, with no indicator for it', true],
        ['A new indicator column is created for it on the fly at scoring', false],
        ['The pipeline raises an error, because the column had no gaps', false],
        ['The row is dropped and quietly left out of the whole scored batch', false],
      ], 'Indicators exist only for features that had missing values during fit. The imputer still fills bureau_score with its learned median — silently — so decide in advance how such rows are handled.'),
      mcq('Dropping rows with missing values kept 82% of training rows. What is the main problem in production?', [
        ['Applicants with missing values cannot be scored, and they are the riskiest group', true],
        ['The model trains more slowly on fewer rows, which delays every daily retrain', false],
        ['Dropping rows always lowers the AUC by about as much as the share of rows lost', false],
        ['The dropped rows must be added to the test set, where they distort the metrics', false],
      ], 'A model trained without missing values cannot score rows that have them. Here 484 of 2,500 test applicants would get no decision — the very group with the highest default rate.'),
    ],
  },

  /* ── AGGREGATES ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_AGGREGATES',
    notes: `Real data rarely arrives one row per customer. A retailer has a transactions table; a telecom has daily usage;
a bank has every UPI payment. The model predicts something about a **customer** at a **moment**, so you must
collapse many events into one row of features — counts, sums, recency, trends. Done well, these are the strongest
features you will build. Done carelessly, they are the commonest source of leakage in industry.

## The data

A retail chain's loyalty programme in Mumbai and Pune: 31,361 purchases by about 3,000 members, January to June
2026. Some members are steady, some fade away.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(5)
    stores = ["Andheri", "Thane", "Pune Camp", "Vashi"]
    rows = []
    for c in range(3000):
        rate = rng.gamma(2.0, 1.2)                               # visits a month at the start
        decay = rng.choice([1.0, 0.6, 0.25], p=[0.6, 0.25, 0.15]) # some members fade away
        basket = rng.gamma(4, 250)
        home = rng.choice(stores, p=[0.35, 0.25, 0.2, 0.2])
        for m in range(6):
            for d in rng.integers(0, 30, rng.poisson(rate * decay ** m)):
                rows.append((f"L{c:05d}", pd.Timestamp("2026-01-01") + pd.Timedelta(days=int(30 * m + d)),
                             round(float(rng.gamma(4, basket / 4)), 2),
                             home if rng.random() < 0.85 else rng.choice(stores)))
    txns = (pd.DataFrame(rows, columns=["customer_id", "txn_date", "amount", "store"])
              .sort_values("txn_date", ignore_index=True))
    print(txns.shape, txns.txn_date.min().date(), txns.txn_date.max().date())

    (31361, 4) 2026-01-01 2026-06-29

The question: **on 1 May, which members will not buy anything in the next 60 days?** The marketing team wants to send
win-back offers on 1 May.

## The cutoff date is everything

Pick the **prediction date** (the cutoff) first. Then:

- **Features** use only events **before** the cutoff.
- **The label** uses only events **in the window after** it (1 May – 29 June).

    cutoff = pd.Timestamp("2026-05-01")

    def build_features(txns, cutoff):
        past = txns[txns.txn_date < cutoff]                     # nothing on or after the cutoff
        last90 = past[past.txn_date >= cutoff - pd.Timedelta(days=90)]
        last30 = past[past.txn_date >= cutoff - pd.Timedelta(days=30)]
        f = past.groupby("customer_id").agg(
            n_txn=("amount", "size"), total_spend=("amount", "sum"), avg_basket=("amount", "mean"),
            last_txn=("txn_date", "max"), n_stores=("store", "nunique"))
        f["days_since_last"] = (cutoff - f.pop("last_txn")).dt.days
        f["spend_90d"] = last90.groupby("customer_id").amount.sum()
        f["spend_30d"] = last30.groupby("customer_id").amount.sum()
        f[["spend_90d", "spend_30d"]] = f[["spend_90d", "spend_30d"]].fillna(0)
        f["trend_30_vs_90"] = (f.spend_30d / (f.spend_90d / 3)).where(f.spend_90d > 0)
        return f

    feat = build_features(txns, cutoff)
    future = txns[(txns.txn_date >= cutoff) & (txns.txn_date < cutoff + pd.Timedelta(days=60))]
    feat["churned"] = (~feat.index.isin(future.customer_id)).astype(int)
    print(feat.shape, round(feat.churned.mean(), 3))
    print(feat.head(3).round(2).to_string())

    (2830, 9) 0.337
                 n_txn  total_spend  avg_basket  n_stores  days_since_last  spend_90d  spend_30d  trend_30_vs_90  churned
    customer_id
    L00000           6      6320.67     1053.44         2               37    4119.08       0.00            0.00        0
    L00001           3       554.14      184.71         1                2     554.14     357.59            1.94        0
    L00002           3      2405.44      801.81         3               85     806.88       0.00            0.00        1

Each family of feature answers a different question:

| Family | Example | What it captures |
|---|---|---|
| Recency | days_since_last | How long since they last came — usually the strongest churn signal |
| Frequency | n_txn, visits in last 90 days | How engaged they are |
| Monetary | total_spend, avg_basket | How much they are worth |
| Windows | spend_30d, spend_90d | Recent vs older behaviour |
| Trend | spend_30d ÷ (spend_90d / 3) | Whether they are speeding up or fading — 1.94 means last month was about double their 90-day monthly average |
| Breadth | n_stores, n_categories | How embedded they are |

## The leak, measured

Now the mistake almost everyone makes once: computing the same features on the **full export**, taken on 30 June.

    from sklearn.model_selection import cross_val_score
    from sklearn.ensemble import HistGradientBoostingClassifier

    X, y = feat.drop(columns="churned"), feat.churned
    m = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200, random_state=0)
    print("as of cutoff  ", cross_val_score(m, X, y, cv=5, scoring="roc_auc").mean().round(3))
    leaky = build_features(txns, pd.Timestamp("2026-07-01")).loc[feat.index]
    print("on full export", cross_val_score(m, leaky, y, cv=5, scoring="roc_auc").mean().round(3))

    as of cutoff   0.865
    on full export 1.0

AUC **1.0**. On the full export, "days since last purchase" is above 60 for exactly the members who did not buy in
May–June — it *is* the label. Not every leak is this obvious: "total spend" computed on the full export leaks a
little; "average basket" leaks a little less. A rule that catches them all: **write one function that takes the
cutoff as an argument**, and never compute a feature from a table you have not filtered by that cutoff.

## Members with no history

    print(txns.customer_id.nunique() - len(feat))

    34

The \`groupby\` only produces rows for members who bought **before** the cutoff — but 34 members first bought in May
or June. More importantly, members who joined and never bought are absent from \`txns\` entirely. In production you
score **every** member on the list, so start from the member table and **left-join** the aggregates; a member with no
purchases gets n_txn = 0 and spend = 0 (not NaN), and recency gets a sentinel or a "never purchased" indicator.

## Training on several cutoffs

One cutoff gives one snapshot of each customer. Stacking several (1 March, 1 April, 1 May, each with its own 60-day
label window) gives more training rows and teaches the model across seasons — but then:

- Validate **by time**: train on the earlier cutoffs, test on the latest one. A random split puts the same customer's
  March and April rows on both sides.
- The latest usable cutoff is 60 days before the end of the data, because its label window must be complete.

## Making it fast

\`groupby().agg()\` on tens of millions of rows is fine in pandas; beyond that, compute aggregates in SQL (window
functions — \`COUNT(*) FILTER (WHERE txn_date >= cutoff - 90)\`, \`MAX(txn_date)\`) or in a feature store, which
exists largely to compute **point-in-time-correct** features like these the same way for training and serving.`,
    workedExample: `**Task: an NBFC's collections model predicts, on the 1st of each month, whether a borrower will miss that month's
EMI. A junior adds "average account balance over the last 3 months" from the bank-statement table and CV AUC jumps
from 0.78 to 0.93. The statement table has one row per borrower per month. Check the feature before anyone
celebrates.**

**Step 1 — Write down the timeline.** Prediction on 1 July. The label is "missed the July EMI" (due 5 July). The
feature must use statements available on 1 July.

**Step 2 — Read the code, not the column name.**

    bal = statements.groupby("borrower_id").tail(3).groupby("borrower_id").balance.mean()

\`tail(3)\` takes each borrower's **last three rows in the table** — and the table was exported in September. For a
July prediction it averages July, August and September balances. A borrower who missed the July EMI usually has a
collapsed balance in July and after. The feature describes the outcome.

**Step 3 — Prove it with a check you can repeat.** Recompute the feature as of each prediction date:

    def avg_balance_3m(statements, cutoff):
        past = statements[statements.statement_month < cutoff]           # months before the 1st
        last3 = past.sort_values("statement_month").groupby("borrower_id").tail(3)
        return last3.groupby("borrower_id").balance.mean()

and re-run CV with the honest version. Then compare the two columns for the same borrowers: wherever they differ,
the original used months after the cutoff.

**Step 4 — Decide.** If the honest feature still lifts AUC (say 0.78 → 0.81), keep it — the balance trend before the
due date is a legitimate signal. Retire the 0.93.

**What to say:** "The balance feature took each borrower's last three statements in the export, which for a July
prediction meant July to September. Built strictly from statements before the 1st, it is still useful — three
points of AUC — but the jump to 0.93 was the future leaking in."`,
    mcqs: [
      mcq('On the full June export, the churn model\'s days_since_last feature gave CV AUC 1.0. Why?', [
        ['Members who bought nothing in May–June had large recency by construction', true],
        ['Recency is the strongest feature for churn, so a perfect score is expected', false],
        ['Gradient boosting overfits recency features unless max_depth is limited', false],
        ['The cross-validation folds were not stratified on the churned label', false],
      ], 'Measured on 30 June, anyone without a purchase in the 60-day label window has recency of at least about 60 days — the feature restates the label.'),
      mcq('A member who joined the loyalty programme but has never purchased is scored on 1 May. What should the feature row look like?', [
        ['Zero counts and spend, with a "never purchased" flag for recency', true],
        ['No row at all, since the groupby produces no features for them', false],
        ['The average member\'s features, so the model treats them as typical', false],
        ['NaN in every column, which the imputer later fills with medians', false],
      ], 'Start from the member list and left-join aggregates. Zero purchases means zero counts and spend — not missing and not average — and recency needs a sentinel or indicator.'),
      mcq('Features were built at three cutoffs (March, April, May) and stacked into one training table. How should the model be validated?', [
        ['Train on the earlier cutoffs and test on the latest one', true],
        ['Shuffle all rows into five folds and cross-validate them', false],
        ['Test on the March cutoff, the one with the most history', false],
        ['Use the training score, as every row has a known label', false],
      ], 'The same customer appears at each cutoff, and the model will be used on future dates. A time-based split mirrors that; a random split lets a customer\'s April row inform their May row.'),
    ],
    checkpoint: [
      mcq('What is the single most important rule for aggregate features built from a transactions table?', [
        ['Use only events dated before the prediction date for each row', true],
        ['Use as many time windows as possible, the more the better', false],
        ['Compute the aggregates on the most recent export available', false],
        ['Scale every aggregate before it is passed into the model', false],
      ], 'Point-in-time correctness: a feature must be computable at the moment the prediction is made. Everything else is a refinement.'),
      mcq('A member spent ₹1,800 in the last 30 days and ₹2,700 in the last 90 days. What is spend_30d ÷ (spend_90d / 3)?', [
        ['2.0 — last month was double their 90-day monthly average', true],
        ['0.67 — last month was two-thirds of their 90-day spend', false],
        ['1.5 — they spent half as much again as their usual month', false],
        ['0.5 — their spending is fading compared with before', false],
      ], 'The 90-day monthly average is 2,700 / 3 = 900; 1,800 / 900 = 2.0. A trend above 1 means the member is buying more than usual.'),
      mcq('Why does a feature store exist, in one phrase?', [
        ['To compute features point-in-time correctly, the same way for training and serving', true],
        ['To store trained model files so that they can be versioned and rolled back later', false],
        ['To replace SQL with a faster query language designed for machine-learning tables', false],
        ['To hold the labels for each training row so they never mix with the features', false],
      ], 'Its core job is serving the same feature definitions for historical training snapshots and for live predictions, without leaking the future.'),
    ],
  },

  /* ── FEATURE_SELECTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_FEATURE_SELECTION',
    notes: `After feature engineering you may have hundreds of columns. Selecting a subset can make a model simpler,
faster, cheaper to maintain and occasionally more accurate. It is also one of the easiest ways to fool yourself,
because choosing features by looking at the label is **learning** — and learning on rows you later test on is
leakage.

## The most important experiment in this unit

200 customers, 5,000 features of pure random noise, and a random label. There is nothing to find.

    import numpy as np
    from sklearn.feature_selection import SelectKBest, f_classif
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.pipeline import make_pipeline

    rng = np.random.default_rng(0)
    X = rng.normal(size=(200, 5000))
    y = rng.integers(0, 2, 200)
    cv = StratifiedKFold(5, shuffle=True, random_state=0)

    X_sel = SelectKBest(f_classif, k=20).fit_transform(X, y)          # select on ALL rows...
    print("select, then CV:", cross_val_score(LogisticRegression(), X_sel, y, cv=cv, scoring="roc_auc").mean().round(3))

    pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression())   # select inside each fold
    print("select inside CV:", cross_val_score(pipe, X, y, cv=cv, scoring="roc_auc").mean().round(3))

    select, then CV: 0.892
    select inside CV: 0.557

**0.892 AUC from noise.** Out of 5,000 random columns, some correlate with the label by chance *on these 200 rows*.
Selecting them using all 200 rows — including the ones each fold will be tested on — guarantees the chosen features
"work" in every fold. Inside the pipeline, selection is redone on each fold's training rows only, and the score falls
to about chance (0.557 is noise around 0.5 on 40 test rows per fold). The same trap catches correlation filters,
mutual information, RFE and "I looked at the feature importances, then re-ran CV with the top 30".

**Rule: any step that looks at the label is part of the model, and goes inside the pipeline.**

## A realistic table

3,000 customers and 30 features: 5 informative, 3 redundant (combinations of the informative ones) and 22 noise —
the shape of a feature table after an enthusiastic engineering sprint. Columns f00–f04 are informative, f05–f07
redundant.

    import pandas as pd
    from sklearn.datasets import make_classification
    from sklearn.preprocessing import StandardScaler

    Xc, yc = make_classification(n_samples=3000, n_features=30, n_informative=5, n_redundant=3,
                                 n_repeated=0, weights=[0.85], flip_y=0.02, shuffle=False, random_state=3)
    Xc = pd.DataFrame(Xc, columns=[f"f{i:02d}" for i in range(30)])
    full = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
    print("all 30:", cross_val_score(full, Xc, yc, cv=cv, scoring="roc_auc").mean().round(3))

    all 30: 0.782

## Filter methods: score each feature alone

    kb = make_pipeline(SelectKBest(f_classif, k=8), StandardScaler(), LogisticRegression(max_iter=1000))
    print("KBest 8:", cross_val_score(kb, Xc, yc, cv=cv, scoring="roc_auc").mean().round(3))
    kb.fit(Xc, yc); print(list(Xc.columns[kb[0].get_support()]))

    KBest 8: 0.787
    ['f01', 'f02', 'f03', 'f05', 'f06', 'f07', 'f16', 'f22']

Fast and simple: an ANOVA F-test (\`f_classif\`), chi-squared for counts, or \`mutual_info_classif\` for non-linear
relationships. The weakness shows in the list: it kept the three **redundant** features (they correlate with the
label as strongly as the originals) and two noise features, and missed f00 and f04, which matter only alongside
others. Filters judge features one at a time.

Before any of this, **VarianceThreshold** removes columns that never change — a constant flag, a column that is 0 in
every row of the training set. It does not look at the label, so it cannot leak.

## Embedded methods: let a model choose

L1 (lasso) regularisation drives weak coefficients to exactly zero; \`SelectFromModel\` keeps the survivors:

    from sklearn.feature_selection import SelectFromModel
    l1 = make_pipeline(StandardScaler(),
                       SelectFromModel(LogisticRegression(l1_ratio=1, solver="liblinear", C=0.05)),
                       LogisticRegression(max_iter=1000))
    print("L1-selected:", cross_val_score(l1, Xc, yc, cv=cv, scoring="roc_auc").mean().round(3))
    l1.fit(Xc, yc); print(list(Xc.columns[l1[1].get_support()]))

    L1-selected: 0.786
    ['f00', 'f01', 'f02', 'f03', 'f06', 'f16']

Six features, AUC unchanged. **Version note:** scikit-learn 1.8 deprecated \`penalty=\` on LogisticRegression; on 1.4–1.7
write \`LogisticRegression(penalty="l1", solver="liblinear", C=0.05)\`. \`C\` controls how many survive — tune it.
Tree ensembles' \`feature_importances_\` can drive \`SelectFromModel\` too, with the caveat from the evaluation topic:
impurity importance favours high-cardinality and continuous features.

## Wrapper methods: search over subsets

Recursive feature elimination fits a model, drops the weakest features, refits, and repeats; \`RFECV\` chooses how
many to keep by cross-validation:

    from sklearn.feature_selection import RFECV
    rfe = RFECV(LogisticRegression(max_iter=1000), step=2, cv=cv, scoring="roc_auc")
    rfe.fit(StandardScaler().fit_transform(Xc), yc)
    print(rfe.n_features_, list(Xc.columns[rfe.support_]))

    4 ['f00', 'f01', 'f02', 'f03']

Four features — all genuinely informative. Wrappers judge features in combination, at many model fits' cost. And
\`RFECV\`'s own CV score is the score of the best subset **chosen by that CV**, so it is optimistic; to report an honest
number, put \`RFECV\` inside an outer CV loop (or score it once on a held-out test set).

## What selection does and does not buy you

Here, 30 features → 4 to 8 features changed AUC by less than 0.005. That is typical with a regularised model and
thousands of rows. The real benefits are elsewhere:

- **Fewer things to compute, monitor and explain** in production. Every feature is a pipeline that can break.
- **Fewer leaks to audit.** Each column you drop is one less column that might carry the future.
- **Small data, many features** (genomics, 300 customers with 2,000 survey answers) — where selection inside CV can
  genuinely help.

And what it does not do: it does not tell you which features **cause** the outcome. Of two redundant features, the
method keeps whichever is marginally better on this sample; on another sample it may keep the other one.`,
    mcqs: [
      mcq('On 5,000 noise features and a random label, selecting the top 20 on all rows and then cross-validating gave AUC 0.892. What went wrong?', [
        ['Selection saw every fold\'s test labels, so chance correlations looked real', true],
        ['Twenty features are too many for 200 rows, which made the model overfit', false],
        ['The F-test is unreliable for noise, and mutual information would fix it', false],
        ['Logistic regression needed scaling, and without it the AUC is inflated', false],
      ], 'Choosing features by their relationship with the label is learning. Done on all rows, it picks features that happen to fit the test folds too. Inside the pipeline the AUC fell to 0.557, about chance.'),
      mcq('SelectKBest kept the three redundant features but missed two informative ones. What explains this?', [
        ['Filters score each feature alone, and miss features useful only in combination', true],
        ['SelectKBest prefers redundant features, since they have the largest variance', false],
        ['The F-test needs the features to be scaled first, and these were left unscaled', false],
        ['The value of k was too small; any k above eight would have kept all five of them', false],
      ], 'A univariate test sees the redundant columns as strongly related to the label and cannot see that they duplicate others; features that help only jointly look weak on their own.'),
      mcq('RFECV reports a cross-validated AUC for the subset it chose. Why is that number optimistic?', [
        ['The same CV was used to choose the subset, so it is a tuned score', true],
        ['RFECV scores on training folds only and never on validation folds', false],
        ['Recursive elimination always removes the most informative feature', false],
        ['It is not optimistic — RFECV\'s score is an unbiased test estimate', false],
      ], 'Picking the best of many subsets by CV score and then quoting that score is like reporting the best hyperparameter\'s CV score. Wrap RFECV in an outer CV or use a held-out test set.'),
    ],
    checkpoint: [
      mcq('Which selection step can safely run on the whole dataset before splitting?', [
        ['VarianceThreshold, removing columns that never change', true],
        ['SelectKBest with mutual information against the label', false],
        ['Keeping the top 20 features by forest importance', false],
        ['Dropping features weakly correlated with the label', false],
      ], 'VarianceThreshold does not look at the label, so it cannot leak it. Every method that ranks features by their link to the label must run inside the pipeline.'),
      mcq('An L1-penalised logistic regression inside SelectFromModel keeps fewer features when C is made smaller. Why?', [
        ['Smaller C means a stronger penalty, pushing more weights to zero', true],
        ['Smaller C means fewer training iterations, so fewer weights grow', false],
        ['Smaller C lowers the selection threshold for the importance score', false],
        ['Smaller C removes the most correlated features before fitting', false],
      ], 'C is the inverse of regularisation strength. A stronger L1 penalty sets more coefficients exactly to zero, and SelectFromModel drops those features.'),
      mcq('Cutting 30 features down to 6 left AUC unchanged at about 0.786. Which benefit remains?', [
        ['Fewer features to compute, monitor and audit for leaks in production', true],
        ['The six kept features are now proven to be the causes of the outcome', false],
        ['The model is guaranteed to stay more accurate on future customers', false],
        ['Cross-validation is no longer needed, since there are so few features', false],
      ], 'Selection rarely moves accuracy much on thousands of rows. Its value is a smaller, cheaper, easier-to-trust pipeline. It says nothing about causation.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_DEBUGGING',
    notes: `Feature-engineering bugs come in two kinds: the loud ones that raise an error, and the quiet ones that raise
your AUC. The quiet ones are worse. Eight faults — symptom, cause, fix — from the datasets in this topic.

## 1. A target encoding that knows the answer

**Symptom:** adding \`pincode_return_rate\` lifts CV AUC from 0.673 to 0.774. On next month's orders the model is
no better than before.
**Cause:** the rate was computed with \`df.groupby("pincode").returned.mean()\` on the full dataset, before
\`cross_val_score\`. For the 638 pincodes with fewer than five orders, the "rate" is mostly the row's own label.
**Fix:** \`TargetEncoder(smooth=20.0, ...)\` inside the pipeline, so each fold learns the means from its own training
rows and \`fit_transform\` cross-fits. Honest gain here: about three points of AUC (0.670 → 0.699), not ten.

## 2. An order the encoder invented

**Symptom:** a logistic model gives the coefficient for \`risk_band\` the "wrong" sign: higher band, lower risk.
**Cause:** \`OrdinalEncoder()\` with no \`categories=\` sorted the bands alphabetically: High = 0, Low = 1, Medium = 2.
The model was faithfully fitting a scrambled order.
**Fix:** \`OrdinalEncoder(categories=[["Low", "Medium", "High"]])\`, and print \`encoder.categories_\` once to check.

## 3. Dummies that do not line up

**Symptom:** the batch scoring job fails:

    ValueError: The feature names should match those that were passed during fit.
    Feature names seen at fit time, yet now missing:
    - city_Chennai

**Cause:** \`pd.get_dummies\` was run separately on training data and on today's batch. Today had no Chennai
customers, so the column was never created. (Without feature names, the same bug silently feeds columns in the
wrong positions.)
**Fix:** \`OneHotEncoder(handle_unknown="ignore")\` fitted once inside the pipeline. It always produces the training
columns, in the training order.

## 4. log(0)

**Symptom:**

    ValueError: Input X contains infinity or a value too large for dtype('float64').

**Cause:** \`np.log(df.cashback)\` on a column where many customers received ₹0 cashback; log(0) is −∞.
**Fix:** \`np.log1p\` for non-negative counts and amounts, or \`PowerTransformer(method="yeo-johnson")\`, which handles
zero and negative values. Ask why a value is zero — "no cashback" may deserve its own indicator.

## 5. A scaler refitted on every batch

**Symptom:** the same customer's score changes from day to day although nothing about them changed. On a festival-
sale day, every customer's score jumps.
**Cause:** the production script calls \`StandardScaler().fit_transform(batch)\` on each day's data. The mean and
standard deviation follow the batch, so "average spend" means something different every day.
**Fix:** fit once on training data, save the whole pipeline (\`joblib.dump(pipe, ...)\`), and call only
\`pipe.predict_proba(batch)\` in production.

## 6. Recency measured on the export date

**Symptom:** a churn model reaches CV AUC **1.0**.
**Cause:** \`days_since_last\` was computed as \`export_date − last purchase\` on a table that included the label
window. Members who did not buy in the window had large recency by construction.
**Fix:** one feature function that takes the cutoff as an argument and filters \`txn_date < cutoff\` first. The
honest AUC was 0.865.

## 7. A text column passed as a list

**Symptom:**

    ValueError: all the input array dimensions except for the concatenation axis must match exactly,
    but along dimension 0, the array at index 0 has size 1 and the array at index 1 has size 4

**Cause:** \`make_column_transformer((TfidfVectorizer(), ["review_text"]), ...)\`. With a list, the vectorizer
receives a one-column DataFrame; iterating over it yields the column **name**, so it vectorises a single "document"
and produces one row instead of four.
**Fix:** pass the column as a string: \`(TfidfVectorizer(), "review_text")\`. Text vectorizers want one string per
row — a 1-D input.

## 8. Features chosen on all the data

**Symptom:** a 300-row survey model with 2,000 answers as features reports CV AUC 0.812 with "the 25 best
questions". A fresh sample of 300 respondents gives 0.571.
**Cause:** the 25 questions were picked by their correlation with the label on all 300 rows, then the model was
cross-validated on those 25. With 2,000 candidates, some correlate by chance — 21 of the 25 chosen questions were
pure noise. On 5,000 pure-noise features the same procedure scored 0.892.
**Fix:** put the selector in the pipeline — \`make_pipeline(SelectKBest(f_classif, k=25), LogisticRegression())\` —
and cross-validate the whole thing. Done that way, CV said 0.465 — the honest news that 300 respondents are not
enough to find five weak signals among 2,000 questions.

## The questions to ask when a feature looks too good

1. Was it computed using the label, and if so, inside the CV folds? 2. Was it computed from data dated after the
prediction moment? 3. Is every learned step (encoder, scaler, imputer, selector) fitted on training data inside the
pipeline? 4. Will production build exactly the same columns, for categories and words it has never seen?`,
    mcqs: [
      mcq('A batch job fails with "Feature names seen at fit time, yet now missing: city_Chennai". What is the root cause?', [
        ['pd.get_dummies ran on each batch, so the columns depend on what is in the batch', true],
        ['The model was trained without Chennai, so it cannot score Chennai customers', false],
        ['The city column has missing values, and get_dummies dropped the Chennai rows', false],
        ['LogisticRegression cannot accept dummy columns from pandas, only from NumPy', false],
      ], 'Dummies built per batch create only the categories present in that batch. A OneHotEncoder fitted once in the pipeline always outputs the training columns.'),
      mcq('A customer\'s churn score changes daily although their data does not. The production script calls StandardScaler().fit_transform(batch). What is the fix?', [
        ['Fit the scaler once on training data and apply the saved pipeline to each batch', true],
        ['Switch to RobustScaler, which is less sensitive to how each day\'s batch varies', false],
        ['Drop scaling in production, because a trained model no longer needs scaled inputs', false],
        ['Refit the whole model every day, so the scaler and the model stay in agreement', false],
      ], 'Refitting the scaler on each batch changes what every value means. The scaler\'s mean and standard deviation must come from training and travel with the model.'),
      mcq('make_column_transformer((TfidfVectorizer(), ["review_text"])) produces one row instead of four. Why?', [
        ['With a list the vectorizer gets a DataFrame and iterates over its column name', true],
        ['TF-IDF needs at least five documents and quietly merges the smaller inputs', false],
        ['The reviews are too short, so the vectorizer joins them into one document', false],
        ['ColumnTransformer cannot handle text at all and needs a FunctionTransformer', false],
      ], 'Text vectorizers expect a 1-D sequence of strings. Pass the column name as a string, "review_text", so each row is one document.'),
      mcq('np.log(cashback) raises "Input X contains infinity". What is the best first fix?', [
        ['Use np.log1p, since log(0) is minus infinity and many rows are ₹0', true],
        ['Replace infinity with the column maximum just before the model fits', false],
        ['Drop the customers with zero cashback, as their values are invalid', false],
        ['Scale the cashback column first, so no value is exactly zero any more', false],
      ], 'log1p(x) = log(1 + x) is defined at zero and behaves like log for large values. Zero cashback is real data, and may also deserve an indicator.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_PRACTICE',
    notes: `Six exercises. Work each on paper or in a notebook before reading the answer; the numbers were checked in
Python.

## Exercise 1 — Target encoding with shrinkage

Global return rate 0.15. Shrinkage m = 20, so encoding = (returns + m × 0.15) / (orders + m). Encode:
pincode A (4 orders, 3 returned), pincode B (400 orders, 60 returned), pincode C (never seen in training). What would
the naive mean give for A?

**Answer.** A: (3 + 3) / 24 = **0.250** — the naive 0.75 is pulled most of the way back to 0.15, because four orders
prove little. B: (60 + 3) / 420 = **0.150** — its own rate (0.150) survives because it has data. C: no orders, so the
encoder uses the global mean, **0.15**. Naive A = 3/4 = **0.75**.

## Exercise 2 — Hours on a circle

Give (sin, cos) for 06:00 and 18:00 using angle = 2π × hour / 24. Then find the distance between 22:00 and 02:00 in
this encoding, and compare with the raw difference.

**Answer.** 06:00 → angle π/2 → **(1, 0)**; 18:00 → 3π/2 → **(−1, 0)**. 22:00 and 02:00 are 4 hours apart, an angle
of 60°, so the chord is 2 × sin(30°) = **1.0**. As raw numbers they are **20** apart — the model would think them as
different as 01:00 and 21:00.

## Exercise 3 — Point-in-time aggregates

A member's purchases: 20 Jan ₹1,200; 5 Mar ₹800; 12 Apr ₹1,500; 28 Apr ₹600; 3 May ₹2,000. The cutoff is 1 May
2026. Compute n_txn, total_spend, days_since_last, spend_30d (on or after 1 Apr), spend_90d (on or after 31 Jan) and
the trend spend_30d ÷ (spend_90d / 3).

**Answer.** The 3 May purchase is after the cutoff and is **excluded**. n_txn **4**, total ₹**4,100**, days since
last (28 Apr) **3**. spend_30d = 1,500 + 600 = ₹**2,100**. spend_90d excludes 20 Jan: 800 + 1,500 + 600 = ₹**2,900**.
Trend = 2,100 / 966.67 = **2.17** — a member who is speeding up.

## Exercise 4 — Which model needs what?

For each model, say whether you would scale, and whether you would log-transform a skewed income: (a) k-means on
customer spend; (b) LightGBM; (c) L2-regularised logistic regression; (d) a random forest.

**Answer.** (a) **Scale, and log** — distance is dominated by the largest-unit, most skewed feature. (b) **Neither**
— trees are invariant to monotone transforms. (c) **Scale** (the penalty treats coefficients alike) and **log** if
risk changes per doubling of income. (d) **Neither**.

## Exercise 5 — Is the gap informative?

1,000 applicants: 120 left income blank and 30 of them defaulted; 880 gave income and 70 defaulted. Compute both
default rates and say what you would add to the model.

**Answer.** Blank: 30/120 = **25.0%**; given: 70/880 = **8.0%** (7.95%). Overall 10%. The blank is three times as
risky, so impute inside the pipeline **and add a missing indicator** (\`add_indicator=True\`); median imputation alone
would tell the model these applicants are typical.

## Exercise 6 — Find the leak

    X_top = SelectKBest(mutual_info_classif, k=30).fit_transform(X, y)
    pipe = make_pipeline(StandardScaler(), LogisticRegression())
    print(cross_val_score(pipe, X_top, y, cv=5, scoring="roc_auc").mean())

The scaler is in the pipeline. Where is the leak and how do you fix it?

**Answer.** The **selector** saw all the labels before CV, so every validation fold helped choose the features. Move
it inside: \`make_pipeline(SelectKBest(mutual_info_classif, k=30), StandardScaler(), LogisticRegression())\` and pass the
full \`X\` to \`cross_val_score\`. On noise data this mistake alone produced AUC 0.892 against an honest 0.557.`,
    mcqs: [
      mcq('In Exercise 1, what are the shrunk encodings of pincodes A (4 orders, 3 returned) and B (400 orders, 60 returned)?', [
        ['A 0.250 and B 0.150', true],
        ['A 0.750 and B 0.150', false],
        ['A 0.250 and B 0.157', false],
        ['A 0.150 and B 0.150', false],
      ], 'A: (3 + 20 × 0.15) / (4 + 20) = 6/24 = 0.25. B: (60 + 3) / 420 = 0.15. Small categories move toward the global mean; large ones keep their own rate.'),
      mcq('In Exercise 2, how far apart are 22:00 and 02:00 in the sine–cosine encoding?', [
        ['1.0, the chord across a 60° angle on the circle', true],
        ['20, the same distance apart as the raw hour values', false],
        ['4.0, the number of hours between the two times', false],
        ['0.26, the same as any two neighbouring hours', false],
      ], 'Four hours is 60° of the 360° circle; the chord is 2 × sin(30°) = 1.0. Neighbouring hours are 0.261 apart; 20 is the misleading raw gap.'),
      mcq('In Exercise 3, what are spend_90d and the trend for the member as of 1 May?', [
        ['₹2,900 and a trend of 2.17', true],
        ['₹4,100 and a trend of 1.54', false],
        ['₹4,900 and a trend of 1.29', false],
        ['₹2,900 and a trend of 0.72', false],
      ], 'The 90-day window (from 31 Jan) holds 800 + 1,500 + 600 = 2,900; 20 Jan is too old and 3 May is after the cutoff. 2,100 / (2,900 / 3) = 2.17.'),
      mcq('In Exercise 4, which pair of models needs neither scaling nor a log transform of income?', [
        ['LightGBM and the random forest', true],
        ['k-means and logistic regression', false],
        ['Logistic regression and LightGBM', false],
        ['k-means and the random forest', false],
      ], 'Tree-based models split on thresholds and are unaffected by monotone transforms or units. k-means and regularised logistic regression both depend on scale.'),
      mcq('In Exercise 6, the scaler is inside the pipeline. Why does the cross-validated AUC still leak?', [
        ['The selector chose features using every fold\'s labels', true],
        ['Mutual information cannot be used with a linear model', false],
        ['The scaler should have been fitted before the selector', false],
        ['Five folds are too few for a model with thirty features', false],
      ], 'SelectKBest ran on all of X and y before cross_val_score, so validation labels influenced which features were kept. Put it in the pipeline.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_INTERVIEW_QUESTION',
    notes: `Feature engineering is where interviewers find out whether you have built a model on real data or only on
Kaggle. Fintechs ask about high-cardinality categoricals and missing income; e-commerce and quick-commerce companies
ask about building features from events. They listen for one word above all: **leakage**. Three questions, model
answers, follow-ups.

## 1. "You have a merchant_id column with 40,000 values. How do you use it in a model?"

**Model answer.** "First I'd ask whether it should be used at all. An ID is only useful if the same merchants appear
at prediction time and their behaviour is stable — new merchants will have no history. If it's useful, I have a few
options. I can replace it with things I know about the merchant — category, city, age on the platform, past fraud
rate — which generalise to new merchants. One-hot with 40,000 columns works for a regularised linear model with
sparse matrices, ideally with min_frequency to lump rare merchants together. For tree models I'd use target encoding:
replace each merchant with its average target, with smoothing so a merchant with three transactions is pulled
towards the global rate, and with cross-fitting so no row's encoding uses its own label. scikit-learn's TargetEncoder
does both, inside the pipeline. I'd compare these by cross-validation, and I'd check how the model treats merchants
it has never seen."

**Follow-ups:**
- *"What exactly goes wrong if you compute the mean target per merchant on the whole training set?"* For rare
  merchants the mean is essentially that row's label, so the model learns to trust a leaked feature: training AUC
  rises, test AUC does not. In one run, naive encoding gave train 0.789 and test 0.675.
- *"Can LightGBM handle it natively?"* Yes, with its categorical support — but it can overfit on very
  high-cardinality columns; settings like \`min_data_per_group\` and \`cat_smooth\` exist for that reason.

## 2. "Income is missing for 11% of loan applicants. What do you do?"

**Model answer.** "I'd first find out *why* it's missing — it's usually not random. In lending, applicants who don't
state income are often self-employed or riskier; in one dataset they defaulted at 23% against 9%. So I'd keep that
information: impute inside the pipeline — median for a skewed amount — and add a missing indicator, which in that
case lifted AUC from 0.698 to 0.716. Or I'd use a model that handles NaN natively, like LightGBM or
HistGradientBoosting. I wouldn't drop the rows: the model then can't score those applicants in production, and
they're the riskiest. And I'd monitor the missing rate after launch — if a product change makes income optional,
the indicator stops meaning what it meant."

**Follow-ups:**
- *"Mean, median or a model-based imputer?"* Median for skewed amounts; a model-based imputer only if CV shows it
  helps, since it adds cost and complexity. Whatever I use is fitted on training folds only.
- *"Is there any regulatory issue?"* Possibly: a credit decision that penalises "did not state income" should be
  explainable to the applicant, and the reason codes must make sense.

## 3. "Build features for predicting whether a customer will order again in the next 30 days."

**Model answer.** "I'd fix the prediction moment first — say, every Monday morning — and build every feature from
events strictly before it, with the label from the 30 days after. The features would be recency (days since the last
order), frequency (orders in the last 7, 30 and 90 days), monetary value (spend, average basket), trends (last 30
days against the 90-day monthly average), and behaviour — share of orders with a coupon, cuisines, complaints and
refunds, delivery delays they experienced. I'd write one function that takes the cutoff as an argument, so training
snapshots and live scoring use the same code. For training I'd stack several Mondays, validate on the latest ones,
and start from the full customer list with a left join, so customers with no recent orders get zeros, not missing
rows. Then I'd check the top features for leakage — anything that looks too good gets its timestamp checked first."

**Follow-ups:**
- *"Your model has AUC 0.99. What do you check?"* That recency and counts were computed before the cutoff, not on
  the export date; that no feature is updated by the outcome (a 'last active' field refreshed nightly); and that the
  same customer isn't on both sides of a random split.
- *"How would you serve these features?"* Precompute them nightly in SQL or a feature store as of the scoring time,
  with the same definitions used for training.

## How to answer feature questions well

Name the prediction moment. Say what the model will meet in production that it never saw in training — new
categories, new words, new missing patterns. And put every learned step inside the pipeline, out loud.`,
    mcqs: [
      mcq('An interviewer asks how to use a merchant_id with 40,000 values in a tree model. Which answer is strongest?', [
        ['Smoothed, cross-fitted target encoding inside the pipeline, compared by CV with merchant attributes', true],
        ['Ordinal encoding by merchant_id number, because a tree can split anywhere along an integer column', false],
        ['Mean target per merchant on the full training set, which gives the most precise merchant estimate', false],
        ['Drop it in every case, because a column with that many values can never help any model generalise', false],
      ], 'Target encoding with shrinkage and cross-fitting handles high cardinality without leaking; merchant attributes generalise to new merchants. Arbitrary ID numbers carry no order.'),
      mcq('Why is dropping applicants with missing income a weak answer in a lending interview?', [
        ['The model cannot score them later, and they are often the riskiest applicants', true],
        ['Dropping rows always lowers AUC, so the interviewer will see the model is worse', false],
        ['Regulators require every application to stay in the training data at all times', false],
        ['Missing income can always be recovered exactly with an iterative imputer later', false],
      ], 'A model without a path for missing values cannot decide on those applicants, and missingness is usually informative — in the example they defaulted at 23% against 9%.'),
      mcq('A churn model built from order events shows AUC 0.99. What should you check first?', [
        ['Whether any feature was computed from events after the prediction moment', true],
        ['Whether a larger model would push the AUC still higher on the test set', false],
        ['Whether the features were standardised before the model was trained', false],
        ['Whether accuracy agrees with the AUC on the same held-out test set', false],
      ], 'Near-perfect scores on behavioural data almost always mean leakage — most often recency or counts measured on the export date instead of the cutoff.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_FEATURE_ENG_CHECKPOINT',
    notes: `Ten questions across the topic: encoding, scaling and transforms, dates and text, missing values, aggregates
and feature selection. Several give numbers — work them out before you look at the options.`,
    checkpoint: [
      mcq('A credit_band column holds "Low", "Medium" and "High". Which encoder call keeps the real order?', [
        ['OrdinalEncoder(categories=[["Low", "Medium", "High"]])', true],
        ['OrdinalEncoder() with its default category ordering', false],
        ['OneHotEncoder(drop="first") on the credit_band column', false],
        ['LabelEncoder() fitted on the credit_band column values', false],
      ], 'Only an explicit categories list fixes the order. The default sorts alphabetically (High, Low, Medium); one-hot keeps no order at all.'),
      mcq('With global rate 0.10 and shrinkage m = 10, what does a category with 10 rows and 6 positives encode to?', [
        ['0.35', true],
        ['0.60', false],
        ['0.30', false],
        ['0.10', false],
      ], '(6 + 10 × 0.10) / (10 + 10) = 7 / 20 = 0.35. The naive mean, 0.60, is pulled halfway back toward 0.10 because the category has as many rows as m.'),
      mcq('Which statement about tree ensembles and feature transforms is correct?', [
        ['A log transform does not change a tree\'s splits, so it adds nothing', true],
        ['Trees need standardised inputs, or the deepest splits become unstable', false],
        ['Trees need one-hot encoding for numbers that have a skewed distribution', false],
        ['A log transform always improves trees, since skew harms their splits', false],
      ], 'Trees choose thresholds on one feature at a time; any monotone transform keeps the same ordering and hence the same possible splits.'),
      mcq('A model predicts next week\'s orders. Which feature is safe to compute on the Monday it runs?', [
        ['Orders in the 28 days before that Monday', true],
        ['Orders placed during the week being predicted', false],
        ['Days until the customer\'s next order after Monday', false],
        ['Total orders in the full data export, all dates', false],
      ], 'Only events before the prediction moment are known. The others contain the future — one of them is the label itself.'),
      mcq('After median imputation, a missing-indicator column raised AUC from 0.698 to 0.716. What does that tell you?', [
        ['Whether income was given carries information about default by itself', true],
        ['The median was the wrong fill value, and the mean would have done better', false],
        ['Imputation leaked the label, and the indicator column is exposing that', false],
        ['The model was underfitting and needed any extra column to fit better', false],
      ], 'The indicator lets the model use the fact of missingness. A gain means the gap is informative — missing not at random.'),
      mcq('Why does a TfidfVectorizer need to be fitted inside the pipeline rather than on all the text first?', [
        ['Its vocabulary and IDF weights are learned, so fitting on test text leaks', true],
        ['Fitting on all the text makes the sparse matrix too large for memory', false],
        ['TfidfVectorizer cannot transform text it was fitted on, only new text', false],
        ['The vectorizer must see the labels, which only exist inside a pipeline', false],
      ], 'The vocabulary and document frequencies are statistics of the data. Learned on test text, they carry information the model should not have — and production will not have it either.'),
      mcq('Which choice best preserves information about the hour of an order for a logistic regression?', [
        ['Sine and cosine of the hour on a 24-hour circle', true],
        ['The raw hour, scaled with StandardScaler first', false],
        ['The hour binned into two halves of the day only', false],
        ['The hour target-encoded on the full dataset', false],
      ], 'A circle keeps 23:00 next to 00:00. Raw or scaled hours put them far apart; two bins lose most of the detail; encoding on the full dataset leaks.'),
      mcq('Of 200 rows and 5,000 noise features, the 20 best by F-test were chosen on all rows. What will cross-validation of a model on those 20 show?', [
        ['A high, misleading AUC — about 0.89 in the run shown', true],
        ['About 0.5, because the features are random noise', false],
        ['An error, since there are more features than rows', false],
        ['A low AUC, because the F-test picks the worst columns', false],
      ], 'Selection on all rows picks features that fit every fold\'s test labels by chance. Only selection inside the CV pipeline shows the truth, about 0.5.'),
      mcq('In production, a OneHotEncoder(handle_unknown="ignore") meets a new city. What should the team do besides scoring the row?', [
        ['Monitor the share of unseen categories, as the model knows nothing of them', true],
        ['Retrain the model immediately on that one row, so the city becomes known', false],
        ['Map the new city to the most common city, so the model can use its weight', false],
        ['Nothing — ignoring unknown values makes the prediction as good as any other', false],
      ], 'All-zero encoding lets the job run, but those predictions rest only on the other features. A rising share of unknowns is a signal to retrain or regroup.'),
      mcq('A member\'s purchases before a 1 May cutoff end on 21 April, and they buy again on 4 May. What is days_since_last as of the cutoff?', [
        ['10', true],
        ['3', false],
        ['13', false],
        ['0', false],
      ], 'Only purchases before 1 May count, so the last one is 21 April: 30 April is 9 days later, 1 May is 10. The 4 May purchase is in the future.'),
    ],
  },

  /* ══ DS_UNSUPERVISED ════════════════════════════════════════════════════════════════════ */

  /* ── KMEANS ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_KMEANS',
    notes: `Everything so far had a label: default or not, returned or not. Often there is no label — a retailer has
50 lakh loyalty members and wants to know what *kinds* of customer it has. **Clustering** finds groups of similar
rows without being told what the groups are. k-means is the first algorithm to reach for: fast, simple and easy
to explain — and full of assumptions you need to know.

## The algorithm

Choose k. Then:

1. **Initialise** k centroids (cluster centres).
2. **Assign** every point to its nearest centroid (squared Euclidean distance).
3. **Update** each centroid to the mean of the points assigned to it.
4. Repeat 2–3 until the assignments stop changing.

Each step can only reduce the **inertia** — the sum of squared distances from points to their centroid — so the
loop always stops. But it stops at a **local** minimum that depends on where it started. scikit-learn therefore uses
**k-means++** initialisation (spread-out starting centroids) and runs the whole algorithm \`n_init\` times, keeping
the run with the lowest inertia. You will write the loop yourself in this topic's practice unit.

## The data

A supermarket chain's loyalty members, with annual spend and visits a year. We secretly built three kinds of member
— occasional (low spend, ~6 visits), frequent top-up shoppers (similar spend, ~30 visits) and big-basket families
(high spend, ~14 visits) — so we can check what k-means finds:

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(3)
    groups = [(900, 8000, 6), (500, 9000, 30), (250, 40000, 14)]   # members, mean spend ₹, mean visits a year
    parts = [pd.DataFrame({"annual_spend": rng.normal(s, s * 0.18, size).round(),
                           "visits": rng.normal(v, v * 0.2, size).round(1)}) for size, s, v in groups]
    cust = pd.concat(parts, ignore_index=True)
    true_group = np.repeat([0, 1, 2], [g[0] for g in groups])
    print(cust.describe().loc[["mean", "std", "min", "max"]].round(1).to_string())

          annual_spend  visits
    mean       13170.3    14.4
    std        11785.0    11.0
    min         3202.0     2.4
    max        59942.0    49.8

## Unscaled: the rupee column wins

    from sklearn.cluster import KMeans
    from sklearn.metrics import adjusted_rand_score

    km_raw = KMeans(n_clusters=3, n_init=10, random_state=0).fit(cust)
    print(cust.assign(cluster=km_raw.labels_).groupby("cluster").agg(
        members=("visits", "size"), spend=("annual_spend", "mean"), visits=("visits", "mean")).round(1))
    print("ARI", round(adjusted_rand_score(true_group, km_raw.labels_), 3))

             members    spend  visits
    cluster
    0           1404   8428.6    14.5
    1            120  46445.3    13.9
    2            126  34316.7    14.5
    ARI 0.36

Spend varies in thousands of rupees, visits in tens. Distance is almost entirely spend, so k-means split the
big-basket families into two by spend and lumped occasional and frequent shoppers together (1,404 members with an
"average" 14.5 visits that describes nobody). The **adjusted Rand index** (ARI) compares two labelings: 1 is a
perfect match, about 0 is chance. 0.36 is poor.

## Scaled: the real groups appear

    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import make_pipeline

    km = make_pipeline(StandardScaler(), KMeans(n_clusters=3, n_init=10, random_state=0)).fit(cust)
    labels = km[-1].labels_

             members    spend  visits
    cluster
    0            488   9046.6    30.0
    1            919   8149.8     6.2
    2            243  40438.7    14.2
    ARI 0.963

Scaling is not a detail for k-means; it **decides** the answer, because it decides what "similar" means. Standardise
by default; log-transform skewed amounts first (the segmentation unit does); and if a business reason says one
feature matters more, weight it deliberately rather than by accident of units.

Cluster numbers are arbitrary — "cluster 1" means nothing until you profile it. Here 0 = frequent top-up shoppers,
1 = occasional, 2 = big-basket families.

## Choosing k

Nobody hands you k. Two standard aids, computed on the scaled data:

    from sklearn.metrics import silhouette_score
    X = km[0].transform(cust)
    for k in range(2, 8):
        m = KMeans(n_clusters=k, n_init=10, random_state=0).fit(X)
        print(k, round(m.inertia_, 1), round(silhouette_score(X, m.labels_), 3))

    2 1773.4 0.624
    3 297.9 0.796
    4 201.7 0.732
    5 137.0 0.702
    6 111.2 0.679
    7 96.8 0.664

- **Elbow:** inertia always falls as k grows (k = n gives zero). Look for the bend where extra clusters stop buying
  much: 1,773 → 298 is a cliff; after 3 the drops are small. Elbow at **3**.
- **Silhouette:** for each point, a = mean distance to its own cluster, b = mean distance to the nearest other
  cluster, s = (b − a) / max(a, b), between −1 and 1. Higher means tighter, better-separated clusters. Peak at **3**
  (0.796).

On real customers the elbow is rarely this sharp and the silhouette often prefers k = 2. Then k is a **business**
choice: how many segments can marketing act on, and do the clusters stay stable on new data? The segmentation unit
does exactly that.

## Using the model

    centres = km[0].inverse_transform(km[-1].cluster_centers_)   # back to ₹ and visits
    print(pd.DataFrame(centres, columns=cust.columns).round(1))
    print(km.predict(pd.DataFrame({"annual_spend": [8500, 38000], "visits": [28, 12]})))

       annual_spend  visits
    0        9046.6    30.0
    1        8149.8     6.2
    2       40438.7    14.2
    [0 2]

\`predict\` assigns new members to the nearest centroid, using the scaler fitted on the original members. Report
centroids in original units — nobody in marketing reads "1.41 standard deviations".

## What k-means assumes

k-means draws boundaries halfway between centroids, so it works best when clusters are:

- **Roughly round** (spherical in the scaled space) and of **similar spread**. Long, curved or nested shapes are cut
  wrongly — the next unit shows crescent-shaped clusters where k-means fails.
- **Not wildly different in size** — a small, tight cluster next to a big diffuse one tends to get a slice of the big
  one.
- **Numeric**, with meaningful distances. One-hot columns make distances odd; k-prototypes or clustering on
  carefully built numeric features is better.

It also assigns **every** point to a cluster, outliers included — a ₹50-lakh corporate account drags a centroid. And
it gives different answers for different random starts on hard data; fix \`random_state\` and use \`n_init\` ≥ 10.

For millions of rows, \`MiniBatchKMeans\` gives nearly the same result much faster.`,
    workedExample: `**Task: a food-delivery analyst clusters 2 lakh customers on four features — orders per month, average order
value in ₹, share of orders with a coupon, and days since signup — and presents five segments. Every segment is
defined by days since signup ("joined 2019", "joined 2021"...); orders, value and coupons barely differ between them.
Find the problem and fix it.**

**Step 1 — Look at the units.** Days since signup runs from 0 to about 2,500, with a standard deviation of about 700.
Orders per month have a standard deviation of about 3; coupon share about 0.3. Without scaling, a 100-day difference
in signup date outweighs a 30-order difference in behaviour. k-means did exactly what it was told: it clustered by
signup date.

**Step 2 — Scale, and think about each feature.**

    pre = make_column_transformer(
        (make_pipeline(FunctionTransformer(np.log1p), StandardScaler()), ["orders_pm", "avg_order_value"]),
        (StandardScaler(), ["coupon_share", "days_since_signup"]))
    seg = make_pipeline(pre, KMeans(n_clusters=5, n_init=10, random_state=0))

Order counts and values are right-skewed, so they are logged before scaling; otherwise a few very heavy users
dominate the distances.

**Step 3 — Ask whether tenure belongs in the clustering at all.** The marketing question is *how customers behave*.
Tenure is better used afterwards, to **describe** segments ("the coupon-driven segment is mostly customers under six
months") than to **define** them. Re-run without it and compare the profiles.

**Step 4 — Re-choose k** with the elbow, the silhouette and the question "can marketing act on each segment?".

**What to say:** "The first segmentation was a signup-date segmentation in disguise, because tenure is measured in
days and dominated the distances. With features scaled — and tenure kept for describing segments rather than
defining them — the clusters separate on ordering frequency, basket size and coupon use, which is what the campaign
needs."`,
    mcqs: [
      mcq('Unscaled k-means on annual spend (₹) and visits gave an ARI of 0.36; scaled, 0.963. Why the difference?', [
        ['Unscaled distances were driven almost entirely by spend in rupees', true],
        ['Scaling gives k-means more iterations before it finally decides to stop', false],
        ['ARI rewards scaled data, so it cannot be compared across the two', false],
        ['Unscaled data makes k-means++ pick the same starting point twice', false],
      ], 'Spend varies in thousands, visits in tens, so distance ignored visits and merged the occasional and frequent shoppers. Standardising gave both features a say.'),
      mcq('Inertia falls from 1,773 at k = 2 to 298 at k = 3, then by about 100 or less per extra cluster. What does the elbow suggest?', [
        ['k = 3, since gains beyond it are small', true],
        ['k = 7, since it has the lowest inertia', false],
        ['k = 2, since its inertia is the highest', false],
        ['No answer, as inertia always decreases', false],
      ], 'Inertia always falls with k, so the lowest value is meaningless. The elbow is where adding clusters stops buying much — after the cliff at 3.'),
      mcq('Why does scikit-learn run k-means n_init times and keep one result?', [
        ['Each run can stop at a different local minimum, so the lowest-inertia run is kept', true],
        ['Each run uses a different k, and the best k is picked by the silhouette score', false],
        ['Each run uses a different random subset of rows, and the results are averaged', false],
        ['Each run adds one more iteration, so more runs mean the model fits more tightly', false],
      ], 'The assign–update loop always converges, but to a solution that depends on the starting centroids. Several starts with k-means++ make a poor local minimum unlikely.'),
    ],
    checkpoint: [
      mcq('In one k-means iteration, what happens in the update step?', [
        ['Each centroid moves to the mean of its assigned points', true],
        ['Each point moves to the centroid it is nearest to', false],
        ['The two closest centroids are merged into a single one', false],
        ['A new centroid is added at the point furthest from all', false],
      ], 'Assignment gives each point to its nearest centroid; the update recomputes each centroid as the mean of its points. Points never move.'),
      mcq('A point\'s mean distance to its own cluster is 2 and to the nearest other cluster is 5. What is its silhouette?', [
        ['0.6', true],
        ['0.4', false],
        ['2.5', false],
        ['3.0', false],
      ], 's = (b − a) / max(a, b) = (5 − 2) / 5 = 0.6. Values near 1 mean the point sits well inside its cluster.'),
      mcq('Which dataset is k-means most likely to cluster badly?', [
        ['Two long curved bands of points wrapped around each other', true],
        ['Three round, well-separated groups of roughly equal size', false],
        ['Four tight groups after the features have been standardised', false],
        ['Two round groups that differ clearly in both of the features', false],
      ], 'k-means splits space halfway between centroids, which suits round clusters. Curved or nested shapes are cut across; density-based methods handle them.'),
    ],
  },

  /* ── HIERARCHICAL_DBSCAN ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_HIERARCHICAL_DBSCAN',
    notes: `k-means needs k in advance, assumes round clusters, and forces every point into one. Two other families
relax those assumptions: **hierarchical clustering**, which builds a whole tree of nested clusters you can cut at
any level, and **DBSCAN**, which finds dense regions of any shape and labels sparse points as **noise**.

## Hierarchical (agglomerative) clustering

Start with every point as its own cluster. Repeatedly **merge the two closest clusters** until one remains. The
record of merges is a **dendrogram** — a tree whose merge heights show how far apart the merged clusters were.
**Linkage** defines "closest" between two clusters:

| Linkage | Distance between clusters | Behaviour |
|---|---|---|
| ward | Increase in within-cluster variance if merged | Compact, similar-size clusters — like k-means; the default |
| average | Mean distance between all pairs | A middle ground |
| complete | Largest pairwise distance | Compact clusters, sensitive to outliers |
| single | Smallest pairwise distance | Follows chains — finds odd shapes, but one bridge point can merge two clusters |

Fifteen stores placed around three city centres, clustered with SciPy so we can read the merges:

    import numpy as np
    from scipy.cluster.hierarchy import linkage, fcluster

    rng = np.random.default_rng(1)
    stores = np.vstack([rng.normal(c, 0.5, (n, 2)) for c, n in [((0, 0), 6), ((5, 5), 5), ((0, 6), 4)]])
    Z = linkage(stores, method="ward")
    print(Z[-4:].round(2))
    print(fcluster(Z, t=3, criterion="maxclust"))

    [[ 1.   23.    1.19  6.  ]
     [12.   24.    2.34  4.  ]
     [22.   26.   10.66  9.  ]
     [25.   27.   15.56 15.  ]]
    [1 1 1 1 1 1 2 2 2 2 2 3 3 3 3]

Each row of \`Z\` is a merge: the two clusters joined, the merge height and the size of the result. The last merges
jump from heights around 2 to **10.66** and **15.56** — big jumps mean well-separated groups were forced together.
Cutting the tree below that jump gives three clusters, matching the three cities. \`scipy.cluster.hierarchy.dendrogram(Z)\`
draws the tree; the long vertical gap in the picture is where to cut.

Strengths: no k needed up front (cut wherever the tree says), a picture stakeholders understand, any distance
metric. Weakness: it computes distances between all pairs — memory grows with n², so a few tens of thousands of rows
is the practical limit. For large data, cluster a sample, or use k-means first and hierarchically cluster the
centroids.

## Clusters that are not round

Two crescent shapes — think of delivery addresses along two curved roads:

    from sklearn.datasets import make_moons
    from sklearn.cluster import KMeans, AgglomerativeClustering
    from sklearn.metrics import adjusted_rand_score

    X, y = make_moons(n_samples=600, noise=0.06, random_state=0)
    print("k-means", round(adjusted_rand_score(y, KMeans(2, n_init=10, random_state=0).fit_predict(X)), 3))
    for link in ["ward", "average", "single"]:
        labels = AgglomerativeClustering(n_clusters=2, linkage=link).fit_predict(X)
        print(link, round(adjusted_rand_score(y, labels), 3))

    k-means 0.255
    ward 0.547
    average 0.196
    single 1.0

k-means cuts each crescent in half with a straight line. **Single linkage** follows the chain of near neighbours
along each crescent and recovers both perfectly. But add 20 scattered points:

    noise = np.random.default_rng(0).uniform([-1.5, -1.0], [2.5, 1.5], size=(20, 2))
    X_all = np.vstack([X, noise])
    labels = AgglomerativeClustering(n_clusters=2, linkage="single").fit_predict(X_all)
    print(np.bincount(labels), round(adjusted_rand_score(y, labels[:600]), 3))

    [  2 618] 0.0

One stray pair becomes "cluster 1" and everything else is merged through bridging points. Single linkage is fragile.

## DBSCAN: density, not distance to a centre

DBSCAN has two parameters: a radius **eps** and **min_samples**. A point with at least \`min_samples\` points
(itself included) within eps is a **core point**. Clusters are core points connected through each other's
neighbourhoods, plus the **border points** within eps of a core point. Everything else is **noise**, labelled −1.

    from sklearn.cluster import DBSCAN

    lab = DBSCAN(eps=0.15, min_samples=5).fit(X_all).labels_
    print("clusters", len(set(lab)) - (-1 in lab), "noise", (lab == -1).sum())
    print("ARI on the moons", round(adjusted_rand_score(y, lab[:600]), 3), "| injected points flagged", (lab[600:] == -1).sum())

    clusters 2 noise 14
    ARI on the moons 1.0 | injected points flagged 14

Both crescents found perfectly, with no k given, and 14 of the 20 injected points labelled noise (the other six
landed close enough to a crescent to count as border points).

## Choosing eps

    for eps in [0.05, 0.1, 0.15, 0.3, 0.5]:
        l = DBSCAN(eps=eps, min_samples=5).fit_predict(X_all)
        print(eps, "clusters", len(set(l)) - (-1 in l), "noise", (l == -1).sum())

    0.05 clusters 36 noise 235
    0.1 clusters 2 noise 16
    0.15 clusters 2 noise 14
    0.3 clusters 1 noise 6
    0.5 clusters 1 noise 6

Too small: everything fragments into 36 pieces and 235 "noise" points. Too large: the two crescents merge. The usual
guide is the **k-distance plot**: for each point, the distance to its \`min_samples\`-th nearest neighbour, sorted.

    from sklearn.neighbors import NearestNeighbors
    d, _ = NearestNeighbors(n_neighbors=5).fit(X_all).kneighbors(X_all)
    print(np.percentile(d[:, -1], [50, 90, 95, 98, 99]).round(3))

    [0.054 0.091 0.109 0.242 0.423]

Distances stay small up to the 95th percentile, then shoot up — the "knee" around 0.1–0.15 is a good eps. Points
beyond the knee are the sparse ones DBSCAN will call noise. Scale features first: eps is a single radius for all
dimensions.

## Choosing between them

| Situation | Reach for |
|---|---|
| Round-ish clusters, large data, need k segments for a business | k-means |
| Want a tree of nested groups, or a picture; up to ~20,000 rows | Agglomerative (ward), dendrogram |
| Arbitrary shapes, unknown number of clusters, outliers present | DBSCAN (or HDBSCAN) |
| Clusters with very different densities | HDBSCAN (\`sklearn.cluster.HDBSCAN\`, 1.3+) — DBSCAN's single eps cannot fit both |

DBSCAN does not have a \`predict\` for new points; it describes the data it was given. To label new points, assign
them to the cluster of their nearest core point, or train a classifier on the cluster labels.`,
    mcqs: [
      mcq('In DBSCAN with eps = 0.15 and min_samples = 5, a point has three neighbours within 0.15 and lies within 0.15 of a core point. What is it?', [
        ['A border point, part of that core point\'s cluster', true],
        ['A core point, since it lies close to another core', false],
        ['Noise, since it has fewer than five neighbours itself', false],
        ['A new cluster of its own, since it has neighbours', false],
      ], 'With itself it has four points in its eps-neighbourhood, so it is not core. Lying within eps of a core point makes it a border point of that cluster.'),
      mcq('Single linkage recovered two crescents perfectly, but with 20 noise points added it produced clusters of size 2 and 618. Why?', [
        ['It merges via the closest pair, so a few bridge points chain the shapes together', true],
        ['It always produces one large cluster, whatever data it is given to cluster', false],
        ['The noise points were too far apart, so single linkage could not reach them', false],
        ['Single linkage needs scaled data, and the noise points changed the scale', false],
      ], 'Single linkage joins clusters through their nearest members, so a chain of stray points can link everything; the last isolated pair becomes the "second cluster".'),
      mcq('The 5-nearest-neighbour distances have a 95th percentile of 0.109 and a 99th of 0.423. What eps does this suggest?', [
        ['About 0.1 to 0.15, near the knee', true],
        ['About 0.42, the 99th percentile', false],
        ['About 0.05, the median distance', false],
        ['Any value, since eps hardly matters', false],
      ], 'Below the knee most points have dense neighbourhoods; above it, distances jump for the sparse points. An eps near the knee separates the two — and 0.1–0.15 did.'),
    ],
    checkpoint: [
      mcq('What does the label −1 mean in DBSCAN\'s output?', [
        ['The point is noise and belongs to no cluster', true],
        ['The point belongs to the last cluster that was found', false],
        ['The point could not be scaled by the model', false],
        ['The point is a core point of a dense region', false],
      ], 'DBSCAN does not force points into clusters; points that are neither core nor within eps of a core point are labelled −1, noise.'),
      mcq('In a dendrogram, the last two merges happen at heights 10.7 and 15.6, all earlier ones below 2.4. Where should you cut?', [
        ['Below 10.7, which leaves three well-separated clusters', true],
        ['Above 15.6, which leaves one cluster containing all points', false],
        ['At 1.0, which leaves the largest number of clusters', false],
        ['Anywhere, since the height has no meaning for clusters', false],
      ], 'A large jump in merge height means distinct groups are being forced together. Cutting just below the jump keeps them apart.'),
      mcq('Why is agglomerative clustering rarely run directly on 50 lakh customers?', [
        ['It needs distances between all pairs, which grows with n²', true],
        ['It only works on two features, plotted on a dendrogram', false],
        ['It cannot produce more than ten clusters in a single run', false],
        ['It requires every feature to be one-hot encoded first', false],
      ], 'Pairwise distances for millions of rows do not fit in memory or time. Cluster a sample, or k-means first and then cluster the centroids hierarchically.'),
    ],
  },

  /* ── PCA ───────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_PCA',
    notes: `A telecom's usage table can have hundreds of columns — data by app, by hour, voice by type, SMS, roaming —
many of them measuring the same few habits. **Principal component analysis (PCA)** finds new axes, the **principal
components**, that capture as much of the variation as possible in as few dimensions as possible. You use it to
plot high-dimensional data, to compress features, and to understand which columns move together.

## The idea

PCA finds the direction along which the data varies most (PC1), then the direction of greatest remaining variance
at right angles to it (PC2), and so on. Each component is a weighted sum of the original columns; the weights are
its **loadings**. Projecting onto the first few components keeps the most variance a straight-line (linear)
projection can keep. Mathematically, the components are the eigenvectors of the covariance matrix — the vectors and
matrices of the maths topic, at work.

## The data

5,000 prepaid customers, ten usage columns. Behind them are three habits we built in: heavy data use, heavy calling,
and travel.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(8)
    n = 5000
    data_f, voice_f, travel_f = rng.normal(size=(3, n))
    usage = pd.DataFrame({
        "data_gb": 15 + 6 * data_f + rng.normal(0, 2, n),
        "video_hours": 20 + 9 * data_f + rng.normal(0, 4, n),
        "social_app_hours": 30 + 10 * data_f + rng.normal(0, 6, n),
        "night_data_gb": 4 + 2 * data_f + rng.normal(0, 1, n),
        "voice_min": 400 + 150 * voice_f + rng.normal(0, 60, n),
        "outgoing_calls": 120 + 40 * voice_f + rng.normal(0, 20, n),
        "sms_count": 30 + 8 * voice_f + rng.normal(0, 8, n),
        "roaming_days": 3 + 2 * travel_f + rng.normal(0, 1, n),
        "std_call_min": 80 + 40 * travel_f + 20 * voice_f + rng.normal(0, 20, n),
        "recharge_amt": 300 + 60 * data_f + 40 * voice_f + rng.normal(0, 50, n),
    })

## Explained variance

    from sklearn.decomposition import PCA
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import make_pipeline

    pca = make_pipeline(StandardScaler(), PCA()).fit(usage)
    evr = pca[-1].explained_variance_ratio_
    print(evr.round(3))
    print(np.cumsum(evr).round(3))

    [0.404 0.272 0.16  0.045 0.03  0.023 0.019 0.018 0.017 0.012]
    [0.404 0.676 0.837 0.882 0.912 0.935 0.954 0.972 0.988 1.   ]

PC1 alone explains 40.4% of the variation; three components explain **83.7%**; after that each adds 2–5%. The
sharp drop after the third value — a "scree" elbow — says there are about three real dimensions in these ten
columns, which is exactly how the data was built. You can ask for a target directly:

    p90 = make_pipeline(StandardScaler(), PCA(n_components=0.90)).fit(usage)
    print(p90[-1].n_components_)

    5

## Reading the components

    p3 = make_pipeline(StandardScaler(), PCA(n_components=3)).fit(usage)
    print(pd.DataFrame(p3[-1].components_.T, index=usage.columns, columns=["PC1", "PC2", "PC3"]).round(2))

                       PC1   PC2   PC3
    data_gb           0.46 -0.15  0.01
    video_hours       0.45 -0.15  0.01
    social_app_hours  0.43 -0.15  0.01
    night_data_gb     0.44 -0.15  0.01
    voice_min         0.12  0.53 -0.17
    outgoing_calls    0.11  0.52 -0.18
    sms_count         0.10  0.46 -0.19
    roaming_days      0.03  0.12  0.74
    std_call_min      0.08  0.34  0.59
    recharge_amt      0.41  0.16 -0.08

PC1 loads on the four data columns and recharge: a **"data user"** axis. PC2 loads on voice, calls and SMS: a
**"caller"** axis. PC3 on roaming and STD calls: a **"traveller"** axis. Naming components is interpretation, and
only works when the loadings are this clean; often they are not. Two cautions: the **sign** of a component is
arbitrary (another version or another run may flip PC1 to −PC1 — the meaning is the same), and a component is a
mixture, not a column you can hand to the business as "a feature".

## Always scale first

    raw = PCA().fit(usage)
    print(raw.explained_variance_ratio_[0].round(3), dict(zip(usage.columns, raw.components_[0].round(2))))

    0.761 {'data_gb': 0.0, 'video_hours': 0.01, 'social_app_hours': 0.01, 'night_data_gb': 0.0,
           'voice_min': 0.93, 'outgoing_calls': 0.22, 'sms_count': 0.04, 'roaming_days': 0.0,
           'std_call_min': 0.11, 'recharge_amt': 0.28}

Unscaled, PC1 "explains 76%" — and is nothing but voice minutes (loading 0.93), because minutes vary in hundreds
and GB in units. PCA maximises variance, and variance depends on units. Standardise unless the columns already
share a unit and that unit's scale is meaningful (pixel intensities, for example).

## Compression: what is kept and what is lost

The 8×8 handwritten digits that ship with scikit-learn have 64 pixel columns:

    from sklearn.datasets import load_digits
    X, _ = load_digits(return_X_y=True)
    c = np.cumsum(PCA().fit(X).explained_variance_ratio_)
    print(X.shape, [int(np.searchsorted(c, t) + 1) for t in (0.5, 0.8, 0.9, 0.95)])
    p = PCA(n_components=21).fit(X)
    rec = p.inverse_transform(p.transform(X))
    print(round(float(np.sqrt(((X - rec) ** 2).mean())), 3), round(float(X.std()), 3))

    (1797, 64) [5, 13, 21, 29]
    1.348 6.017

5 components hold half the variance, 21 hold 90%, 29 hold 95%. Rebuilding the images from 21 components gives an
error of about 1.3 on pixels whose standard deviation is 6.0 — the digits remain clearly readable from a third of
the numbers.

## When to use PCA, and when not to

- **Visualisation:** plot PC1 against PC2 to see whether customers fall into groups, or to show clusters found by
  k-means. (For pictures only, t-SNE and UMAP show local structure better, but their axes and distances mean little.)
- **Many correlated numeric features** feeding a linear model or k-means: PCA removes the redundancy and the noise in
  the small components.
- **Before a tree ensemble: usually no.** Trees handle correlated features fine, and components destroy the
  readability of every split.
- **What it throws away:** the low-variance directions. PCA is unsupervised — a direction with little variance can
  still be the one that predicts the label. Check by CV that a model on components is not worse than on the
  original features.
- Fit PCA on **training data inside the pipeline**, like any other learned step.`,
    mcqs: [
      mcq('Explained variance ratios are 0.404, 0.272, 0.160, then 0.045 and smaller. How many components does this suggest?', [
        ['Three, since the ratios drop sharply after the third one', true],
        ['One, since only the first explains more than 40 percent', false],
        ['Ten, since every component explains at least a little', false],
        ['Two, since together they pass half of the total variance', false],
      ], 'Three components explain 83.7%, and the drop from 0.160 to 0.045 is the scree elbow. The data was built from three habits, and PCA found them.'),
      mcq('Unscaled PCA on the usage table gave PC1 76% of the variance with a loading of 0.93 on voice minutes. What happened?', [
        ['Voice minutes have the largest numeric variance, so PCA chased the units', true],
        ['Voice minutes are the most important behaviour, which PCA has correctly found', false],
        ['PCA failed to converge without scaling and returned the first column instead', false],
        ['The other nine columns were dropped as constant because they were not scaled', false],
      ], 'PCA maximises variance, and minutes vary in hundreds while GB vary in units. Standardise so each column contributes on equal terms.'),
      mcq('A colleague reruns PCA and finds every PC1 loading has flipped sign. What should you conclude?', [
        ['Nothing changed — a component\'s sign is arbitrary', true],
        ['The data must have changed between the two runs', false],
        ['The first run was wrong, and its PC1 is now invalid', false],
        ['PC1 now measures the opposite customer behaviour', false],
      ], 'A component and its negative describe the same axis. Implementations choose a sign by convention, which can differ by version or data order.'),
    ],
    checkpoint: [
      mcq('What does PCA(n_components=0.90) do?', [
        ['Keeps the fewest components that explain at least 90% of variance', true],
        ['Keeps 90% of the original columns and drops the remaining tenth', false],
        ['Keeps the components whose loadings are all at least 0.90 in size', false],
        ['Keeps ninety components, or all of them if there are fewer than that', false],
      ], 'A float between 0 and 1 is read as a target share of explained variance; the fitted n_components_ gives the number chosen — 5 for the usage table.'),
      mcq('Why might a model trained on the first five principal components predict worse than one on all original features?', [
        ['The dropped low-variance directions may hold the signal for the label', true],
        ['Principal components are not allowed as inputs to any supervised models', false],
        ['PCA always adds noise, because it is fitted without using any labels', false],
        ['Components are categorical, so they need one-hot encoding before use', false],
      ], 'PCA keeps directions of high variance without looking at the target. A small-variance direction can be the predictive one — check by CV.'),
      mcq('PC1 loads about 0.45 on four data-usage columns and near zero elsewhere. What is a fair reading?', [
        ['PC1 is roughly a combined data-usage score for each customer', true],
        ['PC1 proves data usage causes customers to recharge more often', false],
        ['PC1 is a column that can be removed from the original table', false],
        ['PC1 shows the four data columns are unrelated to each other', false],
      ], 'Similar positive loadings on related columns make the component a weighted total of them. Loadings describe correlation structure, not causation.'),
    ],
  },

  /* ── SEGMENTATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_SEGMENTATION',
    notes: `"Segment our customers" is one of the most common requests a data scientist in retail, e-commerce, banking
or telecom receives. It is also one of the easiest to do badly: run k-means, paste the cluster means into a slide,
and nobody uses it. A useful segmentation has segments that are **different in ways that matter**, **big enough to
act on**, **stable** when you re-run it, and **named** so a marketing team can talk about them.

## RFM: the classic starting features

**Recency** (days since the last purchase), **Frequency** (number of purchases) and **Monetary** value (total spend)
describe a customer's relationship with a shop in three numbers, and they are easy to explain. Using the loyalty
transactions from the feature-engineering topic (31,361 purchases, January–June 2026; regenerate \`txns\` with the
script from the aggregates unit), as of 1 July:

    import numpy as np
    import pandas as pd

    asof = pd.Timestamp("2026-07-01")
    rfm = txns.groupby("customer_id").agg(
        recency_days=("txn_date", lambda d: (asof - d.max()).days),
        frequency=("txn_date", "size"),
        monetary=("amount", "sum"))
    print(rfm.describe().loc[["mean", "50%", "max"]].round(1).to_string())
    print(rfm.skew().round(2).to_dict())

          recency_days  frequency  monetary
    mean          51.8       11.0   11167.6
    50%           24.0        8.0    6857.4
    max          181.0       80.0  142685.8
    {'recency_days': 0.93, 'frequency': 1.96, 'monetary': 3.13}

Frequency and monetary are right-skewed — a few members spend ₹1 lakh+ — so log them before scaling, or the
clustering becomes "the top 2% versus everyone else". After \`np.log1p\` the skews are −0.09, −0.01 and −0.42.

Richer segmentations add **behaviour**: share of spend by category (staples, fresh, personal care), share bought on
promotion, weekday versus weekend, number of stores, online versus in-store. Keep the first version small; every
feature you add is one more dimension the segments must be explained in.

## Choosing k: statistics, then usefulness

    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import make_pipeline
    from sklearn.metrics import silhouette_score

    X = np.log1p(rfm)
    for k in range(2, 8):
        m = make_pipeline(StandardScaler(), KMeans(n_clusters=k, n_init=10, random_state=0)).fit(X)
        print(k, round(m[-1].inertia_), round(silhouette_score(m[0].transform(X), m[-1].labels_), 3))

    2 3648 0.468
    3 2613 0.364
    4 2081 0.332
    5 1765 0.315
    6 1525 0.31
    7 1343 0.301

No clean elbow, and the silhouette prefers **k = 2** — typical of real customers, who form a continuum rather than
neat blobs. Two segments ("active" and "not") are true and useless. Statistics narrow the range; the decision comes
from two more questions.

**Is it stable?** Fit the clustering on two random halves of the members, label everyone with both models, and
compare the labelings with the adjusted Rand index (1 = identical):

    from sklearn.metrics import adjusted_rand_score
    idx = np.random.default_rng(0).permutation(len(X))
    a, b = idx[: len(X) // 2], idx[len(X) // 2:]
    for k in [3, 4, 5, 6]:
        fit = lambda rows: make_pipeline(StandardScaler(), KMeans(n_clusters=k, n_init=10, random_state=0)).fit(X.iloc[rows])
        print(k, round(adjusted_rand_score(fit(a).predict(X), fit(b).predict(X)), 3))

    3 0.955
    4 0.895
    5 0.497
    6 0.771

At k = 5 the two halves disagree about half the members (ARI 0.497): those segments are artefacts of the sample.
k = 3 and 4 are stable.

**Is it actionable?** Profile k = 4:

    seg = make_pipeline(StandardScaler(), KMeans(n_clusters=4, n_init=10, random_state=0)).fit(X)
    rfm["segment"] = seg[-1].labels_
    prof = rfm.groupby("segment").agg(customers=("frequency", "size"), recency=("recency_days", "median"),
                                      frequency=("frequency", "median"), monetary=("monetary", "median"))
    prof["revenue_pct"] = (100 * rfm.groupby("segment").monetary.sum() / rfm.monetary.sum()).round(1)
    print(prof.round(0))

             customers  recency  frequency  monetary  revenue_pct
    segment
    0              719     12.0        9.0    7047.0         17.0
    1              812      7.0       21.0   20649.0         64.7
    2              728     73.0        6.0    5559.0         15.4
    3              605    129.0        2.0    1437.0          2.9

Use **medians** in profiles; means are pulled by the biggest spenders. Now name them, in words a store manager uses:

| Segment | Profile | Name | One action |
|---|---|---|---|
| 1 | Bought a week ago, 21 visits, ₹20,649; **65% of revenue** from 28% of members | **Loyal regulars** | Protect: early access, no blanket discounts they don't need |
| 0 | Recent, 9 visits, ₹7,047 | **Steady occasionals** | Grow: category cross-sell (they shop, but not for everything) |
| 2 | Last seen ~10 weeks ago, 6 visits | **Lapsing** | Win back now, while they still remember the store |
| 3 | Last seen 4+ months ago, 2 visits, ₹1,437 | **Lost / one-off** | Cheap reactivation only; do not spend much |

k = 3 merged "lapsing" and "lost" — two groups that need different budgets — so **k = 4** wins on usefulness, with
acceptable stability (0.895). That is the reasoning to write down: not "the silhouette said so".

## Checking the segments are real

- **Stability over time.** Re-run next month. Do segment sizes and profiles hold? Some movement between segments is
  the point (that is a lapsing customer being won back); the *definitions* should not change.
- **Assign, do not re-cluster, each month.** Keep the fitted pipeline and \`predict\` new months, so "Loyal regulars"
  means the same thing in July and in December. Re-cluster deliberately, perhaps yearly, and map old to new.
- **Different on things you did not cluster on.** If segments also differ in category mix, store, or response to
  last Diwali's campaign, they capture something real.
- **Test the actions.** The proof of a segmentation is an A/B test: win-back offer to half of "Lapsing", nothing to
  the other half, and measure the difference.

## Rule-based RFM as a baseline

Many retailers score R, F and M into quintiles (1–5) and define segments by rules ("R ≥ 4 and F ≥ 4 → Champions").
It is transparent, stable by construction and easy to run in SQL. A clustering should be compared with it, and is
only worth its complexity if it finds groups the rules do not.`,
    workedExample: `**Task: a bank's analytics head asks for "about eight" customer segments from 120 features — balances, product
holdings, transaction counts by channel, demographics. A k-means run with k = 8 gives a silhouette of 0.09, and on a
re-run with a different random_state, the segments barely match (ARI 0.41). Recommend what to do.**

**Step 1 — Diagnose.** A silhouette near 0 means points sit about as close to other clusters as to their own: there
are no clear groups in this space. An ARI of 0.41 between two runs means the segments depend on the random start —
they are not features of the customers. With 120 dimensions, most of which are noise for this purpose, distances
become similar for everyone and k-means has little to grip.

**Step 2 — Cut the feature set to what the business question needs.** "How do customers use us?" suggests a few
dozen behaviour features: channel mix (branch, ATM, UPI, net banking — as shares), product holdings, balance band.
Demographics are better used to **describe** segments afterwards than to define them.

**Step 3 — Transform and reduce.** Log skewed balances and counts, scale, then PCA to the components covering ~80% of
variance — this removes redundancy (ten correlated UPI columns become one or two components).

**Step 4 — Re-choose k with stability as a requirement.** For k = 3 to 10, fit on two random halves and on two seeds,
and keep only values of k with ARI above about 0.8. Among those, choose the k whose profiles marketing can name and
act on — perhaps five, not eight.

**Step 5 — Offer the alternative.** If no stable structure appears, say so. A transparent rule-based segmentation
(digital-first, branch-dependent, dormant, high-balance) may serve the business better than unstable clusters.

**What to say:** "Eight clusters on 120 features are not stable — with a different random start the segments barely
match (ARI 0.41). With a focused behaviour feature set, log transforms and PCA, five segments are stable across halves of
the data and each maps to a product action. If the head wants eight, two of them would be noise we'd be naming."`,
    mcqs: [
      mcq('The silhouette is highest at k = 2, but the team chooses k = 4. Which justification is sound?', [
        ['k = 4 is stable on re-fits and separates lapsing from lost members, who need different budgets', true],
        ['The silhouette score is not valid for customer data, so its preference can be safely ignored', false],
        ['More clusters always fit better, so k = 4 must be better than k = 2 by the inertia measure', false],
        ['k = 4 has the lowest inertia of the values that were tried, which makes it the right choice', false],
      ], 'Statistics narrow the range; usefulness and stability decide. k = 4 kept ARI 0.895 across halves and splits two groups that call for different actions.'),
      mcq('Fitting k = 5 on two random halves of members gave an ARI of 0.497 between the labelings. What does that mean?', [
        ['The five segments depend on the sample, so they are not reliable', true],
        ['Half of the members belong to the fifth segment in both of the fits', false],
        ['The segmentation is 49.7% accurate against the members\' true groups', false],
        ['The two halves have different customers, so ARI cannot be computed', false],
      ], 'Both models labelled all members; an ARI near 0.5 means they disagree on a large share. Stable segments give ARI near 1.'),
      mcq('Why should monthly segment reports assign members with the saved model instead of re-running k-means each month?', [
        ['So each segment keeps the same definition and movement between segments is meaningful', true],
        ['Because k-means cannot be re-run on new data once the original model has been saved', false],
        ['Because re-running k-means would need a new value of k to be chosen every month', false],
        ['So the report runs faster, as predict is cheaper than fitting a new k-means model', false],
      ], 'Re-clustering can shift or reorder segments, so "segment 2" in July and December may differ. Predicting with the fitted pipeline keeps definitions fixed.'),
    ],
    checkpoint: [
      mcq('Why log-transform frequency and monetary value before clustering customers on RFM?', [
        ['Both are right-skewed, so a few big spenders would dominate distances', true],
        ['k-means only accepts features whose values lie between zero and one', false],
        ['Logging turns RFM into categories, which k-means then clusters better', false],
        ['Recency is measured in days, so the other two need logging to match', false],
      ], 'Skewed features let the top few percent drive the clustering. Logging, then scaling, gives ordinary customers\' differences a say.'),
      mcq('Which statistic should a segment profile table use for each segment\'s typical spend?', [
        ['The median, since a few very large spenders pull the mean', true],
        ['The maximum, since it shows the most valuable customers', false],
        ['The mean, since k-means centroids are computed as means', false],
        ['The sum, since it shows the total revenue of each segment', false],
      ], 'Spend is skewed within segments too; the median describes a typical member. Revenue share is useful as an additional column, not as the typical value.'),
      mcq('What is the strongest evidence that a segmentation is useful to the business?', [
        ['A segment-targeted A/B test shows a measurable difference in outcome', true],
        ['The silhouette score is above 0.3 for the number of clusters chosen', false],
        ['The segments are of roughly equal size when compared with each other', false],
        ['Each segment can be given a memorable name in a marketing deck', false],
      ], 'Segments exist to drive different actions. An experiment showing that an action changes behaviour in a segment is the real test.'),
    ],
  },

  /* ── ANOMALY_DETECTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_ANOMALY_DETECTION',
    notes: `Fraud teams, insurers, payment companies and factories all ask a version of the same question: **which of these
records is unusual enough for a person to look at?** Often there are no labels — nobody has marked which claims were
fraudulent — or so few that a classifier cannot learn from them. Anomaly detection scores every record by how
unusual it is, and a person decides what the high scorers mean.

## The data

5,000 health-insurance claims from an Indian insurer, plus 40 suspicious ones we planted: large bills for one- or
two-day stays, filed within weeks of the policy starting (a known pattern for claims on pre-existing conditions).

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(42)
    n = 5000
    stay = rng.integers(1, 8, n)
    claims = pd.DataFrame({
        "claim_amount": np.round(np.exp(rng.normal(10.4, 0.45, n)) * (0.6 + 0.25 * stay), -2),
        "stay_days": stay,
        "days_since_policy_start": rng.integers(60, 1500, n),
        "patient_age": rng.integers(18, 80, n),
    })
    claims["is_planted"] = 0
    odd = pd.DataFrame({
        "claim_amount": np.round(np.exp(rng.normal(11.3, 0.3, 40)), -2),   # large bills ...
        "stay_days": rng.integers(1, 3, 40),                               # ... for short stays
        "days_since_policy_start": rng.integers(5, 45, 40),                # soon after the policy began
        "patient_age": rng.integers(18, 80, 40),
        "is_planted": 1})
    claims = pd.concat([claims, odd], ignore_index=True)
    X = claims.drop(columns="is_planted")

In real work there is no \`is_planted\` column; here it lets us measure how well each method finds what we hid.

## Method 1: a rule on one column

The robust z-score — distance from the median in units of the median absolute deviation — flags extreme values of a
single feature:

    med = X.claim_amount.median()
    mad = (X.claim_amount - med).abs().median()
    rz = 0.6745 * (X.claim_amount - med) / mad
    print(claims.loc[rz.nlargest(40).index, "is_planted"].sum())

    0

**None** of the 40 largest claims is planted. The biggest bills are seven-day stays — expensive but normal. The
planted claims are not extreme on any one column; they are unusual **in combination** (a big bill *and* a short stay
*and* a new policy).

## Method 2: Isolation Forest on the raw columns

An **Isolation Forest** builds random trees that split on random features at random thresholds. An unusual point is
isolated in few splits — it sits alone in some corner — so its average path length is short and its anomaly score
high.

    from sklearn.ensemble import IsolationForest
    iso = IsolationForest(n_estimators=300, contamination=0.01, random_state=0).fit(X)
    flag = iso.predict(X) == -1
    score = -iso.score_samples(X)                      # higher = more anomalous
    print(flag.sum(), claims.is_planted[flag].sum(), claims.loc[pd.Series(score).nlargest(40).index, "is_planted"].sum())

    51 5 3

It flagged 51 claims (1% — the \`contamination\` we set) and only **5** were planted. The top-scored claims are the
same ₹2–3 lakh seven-day stays. \`LocalOutlierFactor\` on scaled columns did little better (8 of 51).

## Method 3: give the detector the right features

A detector finds what is unusual **in the features you give it**. The suspicion here is about *cost per day* and
*timing*, so build those:

    F = pd.DataFrame({
        "amount_per_day": np.log(X.claim_amount / X.stay_days),
        "log_days_since_start": np.log(X.days_since_policy_start),
        "patient_age": X.patient_age})
    iso = IsolationForest(n_estimators=300, contamination=0.01, random_state=0).fit(F)
    flag = iso.predict(F) == -1
    score = pd.Series(-iso.score_samples(F))
    print(flag.sum(), claims.is_planted[flag].sum(), claims.loc[score.nlargest(40).index, "is_planted"].sum())

    51 37 33

**37 of the 51** flagged claims are planted, and 33 of the top 40. Same algorithm, same data — the features did the
work. The top five are all ₹70,800–₹1,04,300 one-day stays filed 7–32 days after the policy began.

## Choosing the contamination rate

\`contamination\` does not change the scores; it only sets the threshold that \`predict\` uses — the share of records
flagged.

    for c in [0.005, 0.01, 0.02, 0.05]:
        f = IsolationForest(n_estimators=300, contamination=c, random_state=0).fit(F).predict(F) == -1
        print(c, f.sum(), claims.is_planted[f].sum())

    0.005 26 26
    0.01 51 37
    0.02 101 40
    0.05 252 40

At 0.5%, every flag is planted but 14 are missed; at 2%, all 40 are caught among 101 flags; at 5%, investigators
wade through 212 normal claims. You do not know the true rate of anomalies, so set the threshold from **capacity**:
if the investigation team can review 100 claims a week, flag the top 100 scores. Rank by \`score_samples\` and ignore
\`contamination\` entirely if that is clearer.

## Validating what it flags

With no labels, validation is a human process:

1. **Review a sample of the top scores** with domain experts. What fraction are genuinely suspicious? That is your
   precision at the top.
2. **Review a random sample of low scores** too — do experts find suspicious claims the detector missed?
3. **Record every review outcome.** Those labels accumulate; once there are a few hundred confirmed cases, a
   supervised classifier usually beats the unsupervised detector, and the detector becomes one of its features.
4. **Explain each flag.** "One-day stay, ₹1,02,600, filed 14 days after the policy started" is something an
   investigator can act on; "anomaly score 0.71" is not. Show the features that made the record unusual.

## Other detectors

| Method | Idea | Note |
|---|---|---|
| Robust z-score / IQR rule | Extreme on one column | Simple, explainable; misses combinations |
| Isolation Forest | Easy to isolate with random splits | Fast, scales well, needs little tuning — a good default |
| Local Outlier Factor | Less dense than its neighbours | Finds local anomalies; scale first; \`novelty=True\` to score new data |
| One-class SVM | A boundary around normal data | Sensitive to scaling and parameters |
| k-means / DBSCAN | Far from any centroid, or DBSCAN noise | Reuses clustering you already have |

Anomaly detection also flags **data errors** — a claim of ₹0, an age of 210, a date in 1900. Fix those in the data
pipeline first, or the detector will spend its attention on them.`,
    mcqs: [
      mcq('The 40 largest claims contained none of the planted cases. Why did a single-column rule fail here?', [
        ['The planted claims are unusual only in combination: short stay, large bill and new policy', true],
        ['The robust z-score is only valid when the claim amounts follow a normal distribution', false],
        ['The planted claims were all smaller than the median claim, so the rule could not see them', false],
        ['Forty is too few claims to review, and the rule would have found them in the top hundred', false],
      ], 'The biggest bills belonged to normal long stays. The planted claims are moderate on each column alone and stand out only when amount, stay and timing are considered together.'),
      mcq('Isolation Forest found 5 of 40 planted claims on raw columns and 37 with amount_per_day and policy-age features. What is the lesson?', [
        ['A detector finds what is unusual in the features it is given', true],
        ['Isolation Forest needs more trees when the raw columns are used', false],
        ['Log transforms always improve the results of anomaly detection', false],
        ['The contamination rate was wrong for the raw-column version only', false],
      ], 'The algorithm and settings were identical. Encoding the suspicion — cost per day and claims soon after the policy began — made the anomalies separable.'),
      mcq('What does the contamination parameter of IsolationForest change?', [
        ['Only the threshold that predict() uses to flag records as anomalies', true],
        ['How the trees are built, and therefore every record\'s anomaly score', false],
        ['The number of trees in the forest, scaled by the expected outlier rate', false],
        ['The share of training rows dropped before the trees are grown', false],
      ], 'Scores from score_samples are unaffected; contamination only sets the cut-off. Choosing the number to review by investigator capacity is often clearer.'),
    ],
    checkpoint: [
      mcq('How does an Isolation Forest decide that a record is anomalous?', [
        ['It is isolated by fewer random splits than normal records', true],
        ['It is furthest from the mean of all records, in standard units', false],
        ['It is the record that the forest misclassifies most often', false],
        ['It has the largest value on the most important single column', false],
      ], 'Random splits separate unusual points quickly because few points share their region. A short average path length means a high anomaly score.'),
      mcq('An investigation team can review 100 claims a week. How should the flag threshold be set?', [
        ['Flag the 100 highest anomaly scores each week', true],
        ['Use contamination=0.1 since that is the default', false],
        ['Flag every claim with a positive anomaly score', false],
        ['Flag claims more than three deviations from the mean', false],
      ], 'The true anomaly rate is unknown, so capacity sets the number reviewed. Ranking by score and taking the top 100 uses the team\'s time on the most unusual claims.'),
      mcq('After six months, investigators have confirmed 400 fraudulent and 3,000 genuine flagged claims. What is the natural next step?', [
        ['Train a supervised classifier, perhaps with the anomaly score as a feature', true],
        ['Keep the unsupervised detector unchanged, since labels can bias the model', false],
        ['Raise the contamination rate until all 400 frauds are flagged again', false],
        ['Delete the confirmed cases, so the detector focuses on new patterns', false],
      ], 'Labels let a classifier learn what fraud looks like, which usually beats a generic notion of unusual. The anomaly score remains a useful input.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_DEBUGGING',
    notes: `Unsupervised models never raise "wrong answer". There is no label to check against, so a broken clustering
produces a confident table of segments just like a good one. These eight faults — symptom, cause, fix — are the ones
that reach real presentations.

## 1. Segments defined by one column

**Symptom:** three loyalty segments differ in spend (₹8,400, ₹34,300, ₹46,400) but all have about 14 visits a year,
although the team knows frequent top-up shoppers exist.
**Cause:** k-means on unscaled columns. Spend varies in thousands of rupees and visits in tens, so distance was spend
alone. Agreement with the known groups: ARI **0.36**.
**Fix:** \`make_pipeline(StandardScaler(), KMeans(...))\` (log skewed amounts first). ARI rose to **0.963** and the
top-up shoppers appeared as their own segment.

## 2. "Segment 2" changes meaning every month

**Symptom:** the monthly dashboard shows "Segment 2" as high-value in March and as lapsing in April; numbers jump in
ways nobody can explain.
**Cause:** k-means is re-fitted every month. Cluster numbers are arbitrary and the centroids move, so labels are
reshuffled.
**Fix:** save the fitted pipeline and \`predict\` each month. Re-cluster deliberately (say yearly), and map new
clusters to old ones by comparing centroids before publishing.

## 3. PC1 is just one column

**Symptom:** "PC1 explains 76% of the variance" in a telecom usage analysis — and its loading is 0.93 on voice
minutes.
**Cause:** PCA without scaling. Minutes vary in hundreds and GB in units; PCA maximises variance, so it found the
column with the biggest numbers.
**Fix:** standardise first. Scaled, PC1 explained 40% and was a genuine "data user" axis across four columns.

## 4. DBSCAN finds 36 clusters — or one

**Symptom:** with \`eps=0.05\`, DBSCAN returns 36 clusters and 235 noise points; with \`eps=0.3\`, one cluster.
**Cause:** eps is a radius in the units of the data; too small fragments everything, too large merges everything. On
unscaled data, no single eps can fit all features.
**Fix:** scale, then read eps off the k-distance plot (distance to the \`min_samples\`-th neighbour, sorted): the knee
was around 0.1–0.15, and eps = 0.15 found both clusters exactly. If clusters differ in density, use HDBSCAN.

## 5. One segment of five customers

**Symptom:** a k = 5 segmentation has one cluster of 5 members with average spend ₹9 lakh.
**Cause:** staff and test cards — employees scanning their card for customers without one — are in the data. k-means
gives them their own centroid (or drags another segment's centroid towards them).
**Fix:** profile extremes **before** clustering. Remove staff and test accounts by rule, cap or log extreme values,
and decide separately what to do with genuine very-high-value customers (often a hand-managed segment of their own).

## 6. The anomaly detector finds data errors

**Symptom:** the first week's "suspicious claims" are a patient aged 0, a ₹0 claim and a claim dated 1900.
**Cause:** data-quality problems are the most unusual records in any table, so an anomaly detector ranks them first.
**Fix:** validate the data (ranges, dates, required fields) in the pipeline **before** scoring, and route failures to
a data-quality queue, not to investigators.

## 7. Different answers on every run

**Symptom:** two analysts running "the same" clustering get segments that overlap only partly.
**Cause:** \`KMeans(n_clusters=6, n_init=1)\` with no \`random_state\`. Each run starts from different centroids and
stops at a different local minimum — on weakly structured data, very different ones.
**Fix:** fix \`random_state\`, use \`n_init\` ≥ 10, and check stability — fit on two halves of the data and compare the
labelings with the adjusted Rand index. If ARI is low even then (k = 5 gave 0.497 on the loyalty data), the segments
are not real at that k.

## 8. silhouette_score never finishes

**Symptom:** choosing k on 20 lakh customers, \`silhouette_score\` runs for an hour, then fails with a memory error.
**Cause:** the silhouette needs distances between all pairs of points — about 2 × 10¹² for 20 lakh rows.
**Fix:** \`silhouette_score(X, labels, sample_size=20000, random_state=0)\`, repeated over a few seeds; and
\`MiniBatchKMeans\` for the clustering itself. Inertia comes free with every fit.

## The checks before presenting any clustering

1. Were features scaled (and skewed ones logged)? 2. Were staff, test and erroneous records removed first? 3. Is the
result stable across seeds and data halves? 4. Are profiles reported in original units, with medians? 5. Will next
month's data be assigned with the saved model?`,
    mcqs: [
      mcq('Three loyalty segments differ only in spend and all show about 14 visits a year. What is the most likely cause?', [
        ['k-means ran on unscaled columns, so spend in rupees decided every distance', true],
        ['The members genuinely visit at the same rate, so visits carry no information', false],
        ['k was set too low, and k = 6 would have separated the visiting behaviour too', false],
        ['The silhouette score was not checked, so the clusters were never validated', false],
      ], 'Rupee amounts in thousands swamp visit counts in tens. After standardising, the frequent top-up shoppers formed their own segment and ARI rose from 0.36 to 0.963.'),
      mcq('A monthly dashboard re-fits k-means and "Segment 2" switches from high-value to lapsing. What is the fix?', [
        ['Save the fitted pipeline and predict each month with it', true],
        ['Sort the clusters by size so the numbering stays fixed', false],
        ['Increase n_init so k-means finds the same clusters again', false],
        ['Use DBSCAN, whose cluster numbers do not change monthly', false],
      ], 'Cluster numbers are arbitrary and centroids move on each fit. Assigning new data with the saved model keeps definitions — and labels — fixed.'),
      mcq('A k = 5 segmentation contains a cluster of five members averaging ₹9 lakh of spend. What should you check first?', [
        ['Whether these are staff or test cards that should be removed', true],
        ['Whether k should be raised so the cluster gets more members', false],
        ['Whether the five should be merged into the nearest segment', false],
        ['Whether spend should be dropped from the clustering features', false],
      ], 'Tiny extreme clusters are usually accounts that are not customers at all — staff scanning their own card for others, test cards. Remove them by rule before clustering.'),
      mcq('silhouette_score on 20 lakh customers runs out of memory. Which fix keeps the method?', [
        ['Pass sample_size, e.g. 20,000 rows, and repeat over a few seeds', true],
        ['Switch to inertia, which is the same score computed more cheaply', false],
        ['Cast the data to float16 so that the distance matrix will fit', false],
        ['Compute it on the centroids only, which gives the same answer', false],
      ], 'The silhouette needs pairwise distances, which grow with n². Sampling estimates it well; inertia is a different measure that always falls with k.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_PRACTICE',
    notes: `Six exercises, then a graded program. Work each on paper first; every number was checked with scikit-learn 1.9.

## Exercise 1 — k-means by hand

Seven points: A(1, 1), B(1.5, 2), C(3, 4), D(5, 7), E(3.5, 5), F(4.5, 5), G(3.5, 4.5). k = 2, initial centroids A
and D. Use squared Euclidean distance; a tie goes to the lower-numbered centroid. Iterate until assignments stop
changing.

**Answer.** Iteration 1: C is exactly as far from (1, 1) as from (5, 7) — 13 each — so the tie sends it to cluster 0:
{A, B, C} and {D, E, F, G}. Centroids (1.83, 2.33) and (4.13, 5.38). Iteration 2: C is now closer to cluster 1
(squared distance 3.16 against 4.14): {A, B} and {C, D, E, F, G}. Centroids **(1.25, 1.50)** and **(3.90, 5.10)**. Iteration 3:
no change — converged, sizes **2 and 5**.

## Exercise 2 — A silhouette by hand

One-dimensional data, two clusters: {1, 2, 4} and {8, 10}. Compute the silhouette of the point 4.

**Answer.** a = mean distance to its own cluster = (3 + 2) / 2 = **2.5**. b = mean distance to the other cluster =
(4 + 6) / 2 = **5**. s = (5 − 2.5) / 5 = **0.5**. (The point 1, deep inside its cluster, scores 0.75.)

## Exercise 3 — How many components?

A scaled dataset's PCA eigenvalues are 4.2, 2.1, 0.9, 0.5 and 0.3. What share of variance does each explain, and how
many components do you need for at least 85%?

**Answer.** Total 8.0. Shares **0.525, 0.2625, 0.1125, 0.0625, 0.0375**. Cumulative 0.525, 0.7875, **0.900** — so
**three** components.

## Exercise 4 — DBSCAN by hand

One-dimensional points 1, 2, 3, 4, 10, 11, 12, 25 with eps = 1.5 and min_samples = 3 (a point counts itself). Which
points are core, border and noise, and how many clusters are there?

**Answer.** Core points have ≥ 3 points within 1.5: **2** {1, 2, 3}, **3** {2, 3, 4} and **11** {10, 11, 12}. Border
points are within 1.5 of a core point: 1, 4, 10 and 12. **25** is noise. Two clusters: {1, 2, 3, 4} and {10, 11, 12}.
scikit-learn agrees: labels [0 0 0 0 1 1 1 −1].

## Exercise 5 — Precision and recall of a detector

On the insurance claims (40 planted anomalies among 5,040), the engineered Isolation Forest flagged 26 claims at
contamination 0.005 (all 26 planted), 51 at 0.01 (37 planted) and 101 at 0.02 (all 40 planted). Compute precision and
recall for each, and choose one for a team that can review about 50 claims a week.

**Answer.** 0.005: precision **100%**, recall 26/40 = **65%**. 0.01: precision 37/51 = **72.5%**, recall 37/40 =
**92.5%**. 0.02: precision 40/101 = **39.6%**, recall **100%**. With capacity for about 50, **0.01** — it catches
37 of 40 and uses the team's week fully; the extra 50 reviews needed for the last three are not affordable.

## Exercise 6 — Name the segments

A k-means segmentation of a pharmacy chain's members (medians): Segment A — 2 visits a month, ₹3,100 a month, 85% of
spend on chronic medication. Segment B — 1 visit every two months, ₹600, mostly cold and fever medicines. Segment C —
3 visits a month, ₹4,800, 50% on wellness and personal care. Name each and suggest one action.

**Answer.** A — **"Chronic-care regulars"**: refill reminders and home delivery; losing a refill is losing a customer.
B — **"Occasional acute buyers"**: little to do beyond being nearby; no expensive campaigns. C — **"Wellness
enthusiasts"**: new wellness ranges and a loyalty tier; they buy discretionary items, so they respond to offers.

## The graded exercise — k-means from scratch

Write k-means in plain Python (no NumPy, no scikit-learn): read k, the starting centroids and the points, iterate
until the assignments stop changing, and print the final centroids and cluster sizes. The exact rules — ties, empty
clusters, the iteration limit — and the tests are in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, which cluster does C(3, 4) join in the first iteration, and why?', [
        ['Cluster 0, because it is equally far from both and ties go to the lower index', true],
        ['Cluster 1, because it lies slightly closer to D than it does to A at the start', false],
        ['Cluster 0, because it lies slightly closer to A than it does to D at the start', false],
        ['Neither — a tied point stays unassigned until one of the centroids has moved', false],
      ], 'Squared distances are (2² + 3²) = 13 to A and (2² + 3²) = 13 to D. The stated rule sends a tie to the lower-numbered centroid; C moves to cluster 1 in iteration 2.'),
      mcq('In Exercise 2, what are a, b and the silhouette for the point 4?', [
        ['a = 2.5, b = 5 and s = 0.5', true],
        ['a = 5, b = 2.5 and s = −0.5', false],
        ['a = 2.5, b = 5 and s = 0.25', false],
        ['a = 1.7, b = 5 and s = 0.67', false],
      ], 'a averages the distances to 1 and 2 (3 and 2) = 2.5; b averages those to 8 and 10 (4 and 6) = 5; s = (b − a) / max(a, b) = 0.5. 1.7 wrongly includes the point itself.'),
      mcq('In Exercise 3, with eigenvalues 4.2, 2.1, 0.9, 0.5 and 0.3, how many components reach 85% of the variance?', [
        ['Three, at 90.0% cumulative', true],
        ['Two, at 78.75% cumulative', false],
        ['Four, at 96.25% cumulative', false],
        ['One, at 52.5% cumulative', false],
      ], 'Divide by the total, 8.0: 0.525 + 0.2625 = 0.7875 is short of 0.85; adding 0.1125 gives 0.900.'),
      mcq('In Exercise 4, why is the point 1 a border point rather than noise?', [
        ['It is within eps of the core point 2', true],
        ['It has three neighbours within eps', false],
        ['It is the smallest value in the data', false],
        ['Every point in a cluster counts as core', false],
      ], 'Point 1 has only {1, 2} within 1.5, so it is not core; but it lies within eps of core point 2, which makes it a border point of that cluster.'),
      mcq('In Exercise 5, what are precision and recall at contamination 0.01?', [
        ['Precision 72.5% and recall 92.5%', true],
        ['Precision 92.5% and recall 72.5%', false],
        ['Precision 39.6% and recall 100%', false],
        ['Precision 100% and recall 65.0%', false],
      ], '37 of the 51 flagged claims are planted (precision 37/51) and 37 of the 40 planted claims were flagged (recall 37/40).'),
    ],
    assignment: {
      title: 'k-Means Clustering from Scratch',
      description: 'Read k, the starting centroids and the points from standard input, run k-means to convergence with stated rules for ties and empty clusters, and print the final centroids and cluster sizes — in plain Python, the way scikit-learn\'s Lloyd algorithm works.',
      instructions: `Write a Python program that reads from standard input and runs k-means. Use only the standard library — no
NumPy, no scikit-learn. (The grader runs Python 3.10.)

**Input**

- The first non-blank line is **k**, the number of clusters.
- The next k non-blank lines are the **starting centroids**, centroid 0 first. Each line has d numbers separated by
  spaces, where d (the number of dimensions) is 1 or more.
- Every following non-blank line is a **point** with the same d numbers.
- Ignore blank lines anywhere.

**The algorithm**

1. **Assign** each point to its nearest centroid by squared Euclidean distance. If two or more centroids are equally
   near, choose the one with the **lowest index**.
2. If no point changed cluster since the previous assignment, **stop**. (The first assignment always counts as a
   change.)
3. **Update** each centroid to the mean of the points assigned to it, dimension by dimension. A centroid with **no**
   points assigned **stays where it is**.
4. Go back to step 1. Stop after **100** assignment steps at most.

**Output** — k lines, then one more:

    centroid <i>: <v1> <v2> ...
    sizes: <n0> <n1> ...

Each centroid coordinate is printed with exactly **two decimals**, separated by single spaces; sizes are the number
of points in each final cluster, in centroid order.

**Example**

Input:

    2
    1 1
    2 1
    1 2
    1.5 1.8
    2 2.2
    8 8
    9 8.5
    8.5 9.5

Output:

    centroid 0: 1.50 2.00
    centroid 1: 8.50 8.67
    sizes: 3 3

(The first assignment puts (1, 2) and — by the tie rule — (1.5, 1.8) in cluster 0, and the other four points in
cluster 1. After one update, (2, 2.2) moves to cluster 0 and stays there.)

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot, including
one-dimensional points, a point exactly halfway between two centroids, a centroid that no point is nearest to,
identical points, and three-dimensional data with negative values and blank lines — and scored on how many it passes.
Output is compared line by line. A reviewer uses the rubric for the remaining marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including one dimension, ties at equal distance, an empty cluster, identical points and blank lines in the input.', maxPoints: 60 },
        { criterion: 'Correct algorithm', description: 'Assignment and update alternate as specified; ties go to the lowest index by an explicit rule; an empty cluster keeps its centroid; the loop stops when assignments stop changing or after 100 steps.', maxPoints: 25 },
        { criterion: 'Clarity', description: 'Separate functions for reading, distance, assignment and update; meaningful names; no repeated logic; works for any number of dimensions.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

MAX_ITER = 100


def main():
    lines = [line.split() for line in sys.stdin.read().splitlines()]
    lines = [parts for parts in lines if parts]
    k = int(lines[0][0])
    centroids = [[float(v) for v in parts] for parts in lines[1:1 + k]]
    points = [[float(v) for v in parts] for parts in lines[1 + k:]]

    # TODO: assign each point to its nearest centroid (squared distance; a tie goes to the lowest index)
    # TODO: stop when no assignment changes, or after MAX_ITER assignment steps
    # TODO: move each centroid to the mean of its points; a centroid with no points stays where it is
    # TODO: print "centroid i: ..." with two decimals per coordinate, then "sizes: ..."


main()
`,
        tests: [
          { input: '2\n1 1\n2 1\n1 2\n1.5 1.8\n2 2.2\n8 8\n9 8.5\n8.5 9.5\n', expectedOutput: 'centroid 0: 1.50 2.00\ncentroid 1: 8.50 8.67\nsizes: 3 3' },
          { input: '3\n5 5\n20 10\n40 30\n6 4\n7 6\n5.5 5\n8.5 7\n9 30\n10 28\n11 32\n9.8 29\n38 12\n42 14\n40 11\n45 15\n', expectedOutput: 'centroid 0: 6.75 5.50\ncentroid 1: 9.95 29.75\ncentroid 2: 41.25 13.00\nsizes: 4 4 4' },
          { input: '2\n0\n10\n1\n2\n3\n7\n8\n20\n', expectedOutput: 'centroid 0: 2.00\ncentroid 1: 11.67\nsizes: 3 3', isHidden: true },
          { input: '2\n0 0\n4 0\n2 0\n0 1\n4 1\n', expectedOutput: 'centroid 0: 1.00 0.50\ncentroid 1: 4.00 1.00\nsizes: 2 1', isHidden: true },
          { input: '3\n0 0\n10 10\n100 100\n1 0\n0 1\n1 1\n9 10\n10 11\n11 9\n', expectedOutput: 'centroid 0: 0.67 0.67\ncentroid 1: 10.00 10.00\ncentroid 2: 100.00 100.00\nsizes: 3 3 0', isHidden: true },
          { input: '2\n1 1\n3 3\n2 2\n2 2\n2 2\n2 2\n', expectedOutput: 'centroid 0: 2.00 2.00\ncentroid 1: 3.00 3.00\nsizes: 4 0', isHidden: true },
          { input: '3\n\n0 0 0\n1 1 1\n2 2 2\n\n-5 -4 -6\n-6 -5 -5\n-4 -5 -4.5\n5 6 4\n6 5 5.5\n4 4 5\n\n0.5 10 -8\n1 11 -9\n-0.5 9.5 -7\n0 10.5 -8.6\n', expectedOutput: 'centroid 0: -5.00 -4.67 -5.17\ncentroid 1: 0.25 10.25 -8.15\ncentroid 2: 5.00 5.00 4.83\nsizes: 3 4 3', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_INTERVIEW_QUESTION',
    notes: `Unsupervised questions test whether you can work without a label to hide behind. Retail, e-commerce and banking
interviews ask about segmentation; fintech and insurance ask about anomaly detection; almost everyone asks how
k-means works and how you choose k. The interviewer listens for scaling, for stability, and for a business decision
at the end. Three questions, model answers, follow-ups.

## 1. "Explain k-means. How do you choose k?"

**Model answer.** "k-means picks k centroids, assigns each point to the nearest one, moves each centroid to the mean of
its points, and repeats until assignments stop changing. Each step reduces the within-cluster sum of squares, so it
converges — but to a local minimum that depends on the start, which is why we use k-means++ initialisation and
several restarts. Because it uses distances, the features must be scaled, and skewed ones logged; otherwise the
column with the biggest numbers decides everything. In one loyalty dataset, unscaled k-means matched the true groups
with ARI 0.36 and scaled with 0.96.

For k, I'd look at the elbow in inertia and at the silhouette score, but on real customers those are often vague
— the silhouette frequently prefers two clusters. So I'd also check stability, by fitting on two halves of the data
and comparing the labels with the adjusted Rand index, and then ask which k gives segments the business can act on.
I'd write that reasoning down rather than say 'the elbow said four'."

**Follow-ups:**
- *"What does k-means assume?"* Roughly round clusters of similar spread and not wildly different sizes, numeric
  features with meaningful distances, and every point belonging somewhere. Curved shapes or heavy noise call for
  DBSCAN or HDBSCAN.
- *"How would you run it on 5 crore rows?"* \`MiniBatchKMeans\`, or k-means on a large sample and \`predict\` for the
  rest; silhouette on a sample.

## 2. "How would you segment our customers?"

**Model answer.** "I'd start with the decision: what will marketing do differently per segment, and how many segments
can they run? Then features: RFM — recency, frequency, monetary — plus behaviour like category mix, promotion share
and channel. Before clustering I'd remove staff and test accounts, handle returns and voided bills, log the skewed
amounts and scale. I'd try a few values of k, check the silhouette and inertia, and require stability across data
halves and across months. Then I'd profile each segment with medians in rupees and visits, name it in the business's
language, and attach one action. In one retail example, four segments — loyal regulars with 65% of revenue, steady
occasionals, lapsing and lost — beat three because lapsing and lost customers need different budgets. Finally, I'd
assign new customers with the saved model each month and prove the value with an A/B test of a segment's action."

**Follow-ups:**
- *"Why not just use RFM rules?"* Often I would, as a baseline — they're transparent and stable. Clustering is worth
  it when it finds groups the rules miss, such as a behaviour pattern in category mix.
- *"How do you know the segments are good?"* Stable on re-fits, different on things you didn't cluster on, and —
  the real test — a segment-targeted campaign beats a control.

## 3. "We have millions of transactions and no fraud labels. How would you find suspicious ones?"

**Model answer.** "I'd start from what fraud looks like in this business and build features that express it —
amount relative to the customer's usual spend, new device or location, many transactions in a short window,
time of day, merchant risk. A detector finds what's unusual in the features it's given: in an insurance example,
Isolation Forest on raw columns found 5 of 40 planted cases among its flags; with amount-per-day and
time-since-policy-start features, it found 37. Then I'd score with an Isolation Forest — fast, little tuning — and
maybe compare Local Outlier Factor. The number flagged comes from the review team's capacity, not from a guessed
contamination rate. Every review outcome gets recorded, so we build labels; once there are a few hundred confirmed
cases I'd train a supervised model with the anomaly score as one feature. And I'd make every flag explainable to the
investigator."

**Follow-ups:**
- *"How do you measure it without labels?"* Precision at the top from expert review of flagged cases, plus a review
  of a random sample of unflagged ones to estimate what we miss.
- *"What about data errors?"* Validate data first; otherwise the detector's top scores are typos and test records.

## How to answer unsupervised questions well

Say "scale" early. Say how you know the result is stable. And always end with what someone will **do** with the
clusters or the flags.`,
    mcqs: [
      mcq('An interviewer asks how you would choose k for a customer segmentation. Which answer is strongest?', [
        ['Elbow and silhouette to narrow it, then stability across data halves and actionability', true],
        ['The k with the highest silhouette, because it is the objective measure of cluster quality', false],
        ['The k with the lowest inertia, because it means the clusters fit the customers most tightly', false],
        ['Always k = 4, because marketing teams can rarely run more than four campaigns at once', false],
      ], 'Statistics narrow the range but rarely settle it on real customers. Stability shows the segments are real; actionability shows they are useful.'),
      mcq('Asked to find fraud with no labels, a candidate says "run Isolation Forest on all the raw columns". What is the main gap?', [
        ['No features that express what fraud looks like, which decide what the detector finds', true],
        ['Isolation Forest cannot be used without labels, so a classifier is needed first', false],
        ['Isolation Forest needs every column one-hot encoded before it can be applied', false],
        ['Raw columns must be clustered with k-means first and the clusters then scored', false],
      ], 'The detector flags what is unusual in its inputs. Features such as amount relative to usual spend or time since the policy began encode the suspicion — 5 against 37 planted cases found in the example.'),
      mcq('How do you show a segmentation was worth doing?', [
        ['A segment\'s action beats a control group in an A/B test', true],
        ['Its silhouette score is higher than that of RFM rules', false],
        ['Every segment has between 15% and 30% of the members', false],
        ['Marketing agrees that the segment names sound right', false],
      ], 'Segments exist to change decisions. An experiment that shows the targeted action moves behaviour is the evidence that matters.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_MINI_PROJECT',
    notes: `# Mini Project — Segmenting Customers of a Retail Chain

A supermarket chain with six stores in Bengaluru, Mysuru and Hubballi wants to stop sending every loyalty member the
same weekly offer. You will segment about 4,000 members on how they shop: build RFM and basket features from six
months of transactions, clean the data's traps, cluster, choose and defend k, profile and name each segment, check
that the segments hold across months, and recommend one action per segment.

## The data

Generate it with this script (seed fixed; about 4 lakh transaction rows — it takes a few seconds).

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2026)
    stores = ["Koramangala", "Whitefield", "Jayanagar", "Indiranagar", "Mysuru", "Hubballi"]
    cats = ["staples", "fresh", "dairy", "snacks", "personal_care", "household", "baby"]
    personas = {   # visits a month, basket ₹, category weights, share bought on promotion
        "family":    (3.0, 2200, [0.30, 0.20, 0.15, 0.08, 0.10, 0.12, 0.05], 0.25),
        "topup":     (7.0, 450,  [0.10, 0.30, 0.30, 0.20, 0.05, 0.05, 0.00], 0.10),
        "deal":      (1.5, 1600, [0.35, 0.05, 0.05, 0.15, 0.15, 0.25, 0.00], 0.70),
        "premium":   (2.0, 3800, [0.15, 0.30, 0.15, 0.10, 0.20, 0.08, 0.02], 0.05),
        "newparent": (2.5, 2600, [0.15, 0.15, 0.15, 0.05, 0.10, 0.10, 0.30], 0.20),
    }
    names = list(personas)
    n = 4000
    members = pd.DataFrame({
        "member_id": [f"M{i:05d}" for i in range(1, n + 1)],
        "phone": [f"9{rng.integers(100000000, 999999999)}" for _ in range(n)],
        "join_date": pd.Timestamp("2023-01-01") + pd.to_timedelta(rng.integers(0, 1000, n), unit="D"),
        "home_store": rng.choice(stores, n, p=[0.22, 0.2, 0.18, 0.18, 0.12, 0.10]),
        "persona": rng.choice(names, n, p=[0.30, 0.25, 0.20, 0.10, 0.15]),
    })
    rows = []
    for m in members.itertuples():
        visits, basket, w, promo = personas[m.persona]
        fade = rng.choice([1.0, 0.75], p=[0.8, 0.2])            # some members drift away
        for month in range(6):
            for _ in range(rng.poisson(visits * fade ** month)):
                day = pd.Timestamp("2026-01-01") + pd.DateOffset(months=month) + pd.Timedelta(days=int(rng.integers(0, 28)))
                amount = round(float(rng.gamma(4, basket / 4)), 2)
                split = rng.dirichlet(np.array(w) * 20 + 0.01)
                store = m.home_store if rng.random() < 0.9 else rng.choice(stores)
                for c, share in zip(cats, split):
                    if share > 0.03:
                        rows.append((m.member_id, day, store, c, round(amount * share, 2), int(rng.random() < promo)))
    txns = pd.DataFrame(rows, columns=["member_id", "txn_date", "store", "category", "amount", "on_promo"])

    # --- traps ---------------------------------------------------------------------------------
    dup = members.sample(60, random_state=1)                              # 1. the same person, registered twice
    new_id = {old: f"M{n + j + 1:05d}" for j, old in enumerate(dup.member_id)}
    members = pd.concat([members, dup.assign(member_id=dup.member_id.map(new_id))], ignore_index=True)
    moved = txns[txns.member_id.isin(list(new_id))].sample(frac=0.4, random_state=2).index
    txns.loc[moved, "member_id"] = txns.loc[moved, "member_id"].map(new_id)
    staff = [f"S{i:03d}" for i in range(1, 6)]                            # 2. staff cards ring up other people's bills
    members = pd.concat([members, pd.DataFrame({"member_id": staff, "phone": "0000000000",
                         "join_date": pd.Timestamp("2022-06-01"), "home_store": "Koramangala", "persona": "staff"})], ignore_index=True)
    k = 4000
    txns = pd.concat([txns, pd.DataFrame({
        "member_id": rng.choice(staff, k), "txn_date": pd.Timestamp("2026-01-01") + pd.to_timedelta(rng.integers(0, 180, k), unit="D"),
        "store": "Koramangala", "category": rng.choice(cats, k), "amount": np.round(rng.gamma(3, 400, k), 2), "on_promo": 0})], ignore_index=True)
    ret = txns.sample(900, random_state=3).copy()                        # 3. returns, recorded as negative amounts
    ret["amount"] = -ret["amount"]
    ret["txn_date"] = ret["txn_date"] + pd.to_timedelta(rng.integers(1, 10, len(ret)), unit="D")
    txns = pd.concat([txns, ret], ignore_index=True)
    txns.loc[txns.sample(150, random_state=4).index, "amount"] = 0.0      # 4. voided bills
    txns.loc[txns.sample(40, random_state=5).index, "txn_date"] = pd.Timestamp("2036-01-15")   # 5. a till with a wrong clock
    closed = txns.store.eq("Hubballi") & txns.txn_date.ge("2026-04-01")  # 6. the Hubballi store closed on 1 April
    txns = txns[~closed]
    members = members.drop(columns="persona")                             # (the personas are the answer key)
    txns = txns.sample(frac=1, random_state=6).reset_index(drop=True)
    members.to_csv("members.csv", index=False)
    txns.to_csv("transactions.csv", index=False)

The comments name the traps so you can check your cleaning; in a real project nobody tells you. Treat the files as
what the chain's IT team sent you, and work from the CSVs.

| File | Column | Meaning |
|---|---|---|
| members.csv | member_id, phone, join_date, home_store | One row per loyalty registration |
| transactions.csv | member_id, txn_date, store | Who bought, when, where |
| | category, amount | **One row per category per bill**: a bill with four categories is four rows; amount in ₹ |
| | on_promo | 1 if that part of the bill was bought on a promotion |

## Tasks

1. **Clean, and log every decision with a count.** Duplicate registrations (merge by phone), staff cards, returns
   (net them against purchases or exclude — say which and why), voided bills, impossible dates, and the Hubballi
   closure (its members did not stop shopping by choice). Members with no purchases need a decision too.
2. **Features, as of 1 July 2026.** Recency, frequency (count **bills**, not rows), monetary value, average basket,
   share of spend by category, share bought on promotion, and number of stores used. Log skewed features; scale.
3. **Cluster.** k-means for k = 2–8 with \`n_init\` ≥ 10 and a fixed \`random_state\`. Report inertia and
   silhouette, and check stability: fit on two random halves and compare labelings with the adjusted Rand index.
   Optionally compare with one other method (agglomerative ward, or k-means on PCA components).
4. **Choose and defend k** in one paragraph that uses the statistics, the stability and what marketing can act on.
5. **Profile and name** each segment: size, share of revenue, medians of the key features, category mix. Give each a
   name a store manager would use.
6. **Stability across months.** Build the same features for January–March and for April–June; assign both periods
   with the model fitted on the full period and report how many members moved between segments, and where. Explain
   any movement that is an artefact (Hubballi) rather than behaviour.
7. **Recommend one action per segment**, with the metric that would show it worked and how you would test it.

## Deliverables

1. **\`segmentation.ipynb\`** — runs top to bottom after "Restart & Run All".
2. **\`segments.pdf\`** (or .pptx), **at most four pages** — one page of segment profiles with names, one page of
   actions, one page on method and limits.
3. **\`README.md\`** — how to run it; library versions.

## Acceptance criteria

- The cleaning log reports how many duplicate registrations, staff-card rows, returns, voided bills and bad dates were
  found and what was done with each; staff cards are not in any segment.
- Frequency counts bills (member, date, store), not category rows.
- Every feature uses only transactions dated on or before 30 June 2026.
- Skewed features are logged and all features scaled inside a pipeline; \`random_state\` is fixed.
- k is chosen with inertia, silhouette, a stability check (ARI between halves) and a stated business reason.
- Profiles use medians and are in original units (₹, visits, shares), with revenue share per segment.
- The month-to-month check is done and the Hubballi effect is identified and explained.
- Each segment has a name, one action, a success metric and a proposed test.`,
    mcqs: [
      mcq('In the project data, a bill with four categories appears as four rows. What does that mean for the frequency feature?', [
        ['Count distinct bills per member, not rows, or frequency is inflated by basket breadth', true],
        ['Count rows, since every row is a separate visit that the member made to the store', false],
        ['Divide the row count by seven, the number of categories in the store\'s range', false],
        ['Drop frequency and use monetary value alone, since the rows cannot be grouped', false],
      ], 'A member who buys across many categories would look like a frequent visitor. A bill is identified by member, date and store, so count those.'),
      mcq('Hubballi members show a sharp drop in visits from April. How should the segmentation treat this?', [
        ['As an artefact of the store closing, not as members choosing to lapse', true],
        ['As a lapsing segment, since their recency rose in the same way as others', false],
        ['As data errors, and delete all Hubballi members from the analysis entirely', false],
        ['As a sign that k is too small, since they should form a segment of their own', false],
      ], 'Their behaviour changed because the store closed on 1 April. Calling them lapsing would send win-back offers to people with no store nearby; the report must explain it.'),
    ],
    assignment: {
      title: 'Segmenting Customers of a Retail Chain',
      description: 'Clean a retail chain\'s loyalty data, build RFM and basket features, cluster the members, choose and defend k with statistics, stability and business sense, profile and name each segment, check stability across months, and recommend one action per segment.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`segmentation.ipynb\` — generates the data with the brief's script, then: a cleaning log with counts for every
   trap; features as of 1 July 2026 (frequency counted in bills); log and scaling in a pipeline; k-means for k = 2–8
   with inertia, silhouette and a half-versus-half ARI check; the choice of k argued in a paragraph; profiles with
   medians, revenue share and category mix; the January–March versus April–June comparison with the Hubballi effect
   explained; and one action per segment with its metric and test. It must run top to bottom after "Restart & Run
   All".
2. \`segments.pdf\` or \`.pptx\`, at most four pages — profiles and names, actions, method and limits.
3. \`README.md\` — how to run it and the library versions (pandas, NumPy, scikit-learn).

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Staff-card rows removed: …; k chosen: …, ARI between halves …").`,
      rubric: [
        { criterion: 'Data preparation', description: 'Every trap found and handled with counts in the log — duplicates merged by phone, staff cards excluded, returns and voided bills treated consistently, bad dates removed, Hubballi identified; frequency counted in bills; features point-in-time correct.', maxPoints: 25 },
        { criterion: 'Clustering and choice of k', description: 'Skewed features logged and all scaled in a pipeline; k = 2–8 compared with inertia and silhouette; stability checked with ARI between halves; k argued from statistics, stability and actionability; results reproducible.', maxPoints: 25 },
        { criterion: 'Profiles and stability over time', description: 'Segments profiled with medians in original units, revenue share and category mix, and given usable names; January–March and April–June assigned with the saved model, movement reported and the Hubballi artefact explained.', maxPoints: 25 },
        { criterion: 'Recommendations and communication', description: 'One concrete action per segment with a success metric and a proposed A/B test; the four-page report leads with segments and actions, states limits plainly, and the notebook runs with a README and versions.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_UNSUPERVISED_CHECKPOINT',
    notes: `Ten questions across the topic: k-means and choosing k, hierarchical clustering and DBSCAN, PCA, customer
segmentation and anomaly detection. Several give numbers — work them out before you look at the options.`,
    checkpoint: [
      mcq('Centroids start at (0, 0) and (6, 0); the points are (2, 1), (0, 1) and (7, 0). After one assignment and one update, where is centroid 0?', [
        ['To (1, 1)', true],
        ['To (2, 1)', false],
        ['To (1, 0.5)', false],
        ['To (3, 0.5)', false],
      ], '(2, 1) and (0, 1) are nearer (0, 0); (7, 0) is nearer (6, 0). Centroid 0 moves to the mean of its two points, (1, 1).'),
      mcq('Why must features usually be standardised before k-means?', [
        ['Distances add up differences, so large-unit features would dominate', true],
        ['k-means only converges when every feature has a mean of exactly zero', false],
        ['Standardising removes outliers, which k-means is unable to handle', false],
        ['Scaled features let k-means work out the right k automatically', false],
      ], 'Without scaling, the feature measured in the largest units decides the clustering — as rupees did over visits, giving ARI 0.36 instead of 0.963.'),
      mcq('Which method can find two interlocking crescent-shaped clusters and also mark scattered points as noise?', [
        ['DBSCAN with a suitable eps and min_samples', true],
        ['k-means with k = 2 and n_init set to 50', false],
        ['Agglomerative clustering with ward linkage', false],
        ['PCA with two components followed by k-means', false],
      ], 'DBSCAN follows dense regions of any shape and labels sparse points −1. k-means and ward split curved shapes with straight boundaries.'),
      mcq('In DBSCAN, what makes a point a core point?', [
        ['At least min_samples points, itself included, lie within eps of it', true],
        ['It is the point closest to the centre of its cluster in every run', false],
        ['It is within eps of at least one other point that is itself core', false],
        ['It has the smallest average distance to all points in the data', false],
      ], 'Core points have dense neighbourhoods. A point within eps of a core point without being core itself is a border point.'),
      mcq('A scaled dataset\'s PCA eigenvalues are 3.0, 1.5, 0.3 and 0.2. What share of the variance do the first two components explain?', [
        ['90%', true],
        ['60%', false],
        ['75%', false],
        ['96%', false],
      ], 'Total variance is 5.0; (3.0 + 1.5) / 5.0 = 0.90.'),
      mcq('A model on the first five principal components scores worse than one on the original features. What is a likely reason?', [
        ['A low-variance direction that PCA discarded carried the predictive signal', true],
        ['PCA components are always worse inputs than the original features are', false],
        ['The components were not one-hot encoded before the model was trained', false],
        ['PCA was fitted on scaled data, which removes the signal from features', false],
      ], 'PCA ranks directions by variance, not by usefulness for a label. Compare by CV before replacing features with components.'),
      mcq('Fitting k = 6 on two random halves of customers gives an ARI of 0.77 between labelings; k = 4 gives 0.90. What does this tell you?', [
        ['The four segments are more stable and so more likely to be real', true],
        ['Six segments fit the data better, since their ARI is lower', false],
        ['The ARI shows k = 6 separates customers 77% of the time', false],
        ['Both are unstable, since any ARI below 1.0 means failure', false],
      ], 'A higher ARI between independent fits means the clustering is reproducible. Stability is one of the tests a segmentation must pass, alongside usefulness.'),
      mcq('Which segment profile statistic best describes a typical member\'s spend in a skewed segment?', [
        ['The median spend of the members in it', true],
        ['The centroid\'s value in scaled units', false],
        ['The mean spend of the members in it', false],
        ['The maximum spend of any member in it', false],
      ], 'A few large spenders pull the mean; scaled centroid values mean nothing to the business. Report medians in original units.'),
      mcq('An Isolation Forest flags 51 claims, of which 37 are confirmed suspicious, out of 40 suspicious claims in total. What are precision and recall?', [
        ['72.5% and 92.5%', true],
        ['92.5% and 72.5%', false],
        ['72.5% and 78.4%', false],
        ['78.4% and 92.5%', false],
      ], 'Precision = 37 / 51 = 72.5% of flags are real; recall = 37 / 40 = 92.5% of suspicious claims were flagged.'),
      mcq('An anomaly detector\'s top-ranked records in its first week are a ₹0 claim and a patient aged 210. What should change?', [
        ['Validate the data before scoring, and route errors to a data-quality queue', true],
        ['Raise the contamination rate so that real anomalies also get flagged', false],
        ['Switch to Local Outlier Factor, which ignores data errors by design', false],
        ['Train the detector longer, so it learns these records are normal', false],
      ], 'Data errors are the most unusual records in any table. Range and date checks belong in the pipeline before the detector, or investigators waste time on typos.'),
    ],
  },
];
