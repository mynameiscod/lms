/**
 * Career-track content: supervised learning — regression and classification (Data Science + AI, batch S1).
 *
 * DS_REGRESSION — least squares by hand, in NumPy and in scikit-learn; several features and the assumptions
 * that protect their coefficients; ridge, lasso and elastic net; the metrics a business can act on; and
 * curves, interactions and trees when the relationship is not a line. Ends with a Bengaluru house-price
 * mini project.
 * DS_CLASSIFICATION — logistic regression and odds, kNN and Naive Bayes, decision trees, imbalanced
 * targets, and choosing a threshold from what each error costs. Ends with a telecom churn mini project.
 * The PRACTICE unit carries an auto-graded plain-Python exercise (confusion matrix, precision, recall, F1).
 *
 * Builds on Year 1's T_ML_INTRO (supervised vs unsupervised, regression vs classification, training vs
 * testing, precision and recall in words) and on this track's DS_MATH_ML and DS_ML_WORKFLOW (gradients,
 * splits, leakage, baselines, pipelines, cross-validation). The datasets are simulated with fixed seeds so
 * every number can be reproduced; every output shown was produced by running the code with scikit-learn
 * 1.9, pandas 3.0 and NumPy 2.5, and the code also runs on scikit-learn 1.4+ (root_mean_squared_error
 * needs 1.4). Both topics are single-skill (ML_SUPERVISED), so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DS_SUPERVISED_BUNDLES: PilotBundle[] = [
  /* ══ DS_REGRESSION ══════════════════════════════════════════════════════════════════════ */

  /* ── LINEAR_REGRESSION ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_LINEAR_REGRESSION',
    notes: `Year 1 told you that predicting a number is **regression**. This unit opens the box: how a line is fitted
to data, what its two numbers mean, and why the same answer comes out of a formula, NumPy, scikit-learn and the
gradient descent you wrote in the maths topic.

## The data

Eight 2–3 BHK flats listed in one Whitefield society, area against asking price:

    import numpy as np
    import pandas as pd

    flats = pd.DataFrame({
        "area_sqft":  [650, 820, 900, 1050, 1180, 1250, 1400, 1600],
        "price_lakh": [52,  58,  71,  70,   86,   84,   99,   108],
    })

Plot it and the points rise roughly along a line. The model is

    price = b0 + b1 × area

**b1 (the slope)** is how much the predicted price changes for one more square foot; **b0 (the intercept)** is
where the line crosses area = 0. For any flat, the **residual** is actual − predicted: how far the point sits
above or below the line.

## Least squares: which line?

Infinitely many lines pass near the points. **Ordinary least squares (OLS)** picks the one that makes the **sum
of squared residuals** as small as possible. Why squares?

- Positive and negative misses cannot cancel out.
- A miss of 10 counts four times as much as a miss of 5, so the line works hard to avoid big misses.
- The squared loss is smooth and bowl-shaped, so it has exactly one minimum that calculus can find.

The cost of squaring: one wild point (a mis-typed price) pulls the line towards itself. Keep that in mind for
the metrics and debugging units.

## The closed form for one feature

Setting the derivatives of the squared error to zero gives:

    b1 = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²
    b0 = ȳ − b1 · x̄

    x = flats["area_sqft"].to_numpy(float)
    y = flats["price_lakh"].to_numpy(float)
    sxy = ((x - x.mean()) * (y - y.mean())).sum()     # 41915.0
    sxx = ((x - x.mean()) ** 2).sum()                 # 691987.5
    b1 = sxy / sxx                                    # 0.06057
    b0 = y.mean() - b1 * x.mean()                     # 78.5 - 0.06057 * 1106.25 = 11.492

The numerator is how x and y move together (a covariance, unscaled); the denominator is how much x varies. A
slope of **0.06057 lakh per sq ft** is **₹6,057 per square foot** — close to Whitefield's going rate, which is a
good sign the model is sensible.

## The same thing as matrices: the normal equation

Put a column of ones next to the feature and the model is y ≈ Xθ, with θ = (b0, b1). Least squares then has the
famous solution **θ = (XᵀX)⁻¹ Xᵀy** — the *normal equation*. Never compute the inverse explicitly; solve the
system:

    X = np.column_stack([np.ones_like(x), x])
    theta = np.linalg.solve(X.T @ X, X.T @ y)
    print(theta)                     # [11.49233187  0.0605719 ]

It works for any number of features, which is what the next unit needs.

## scikit-learn

    from sklearn.linear_model import LinearRegression

    model = LinearRegression().fit(flats[["area_sqft"]], flats["price_lakh"])
    print(model.coef_, model.intercept_)       # [0.0605719] 11.492331870156605
    print(model.predict(pd.DataFrame({"area_sqft": [1000, 1300]})))
    # [72.06423526 90.23580628]

    resid = flats["price_lakh"] - model.predict(flats[["area_sqft"]])
    print(resid.round(2).tolist())
    # [1.14, -3.16, 4.99, -5.09, 3.03, -3.21, 2.71, -0.41]
    print(model.score(flats[["area_sqft"]], flats["price_lakh"]))     # 0.9660849812664605

Three things to notice:

- **X is two-dimensional** — a DataFrame with one column, \`flats[["area_sqft"]]\`, not the Series
  \`flats["area_sqft"]\`. Passing a 1-D Series raises "Expected 2D array".
- **The residuals sum to zero** (try \`resid.sum()\`): with an intercept, OLS always balances the misses.
- **score() is R²**: the line explains 96.6% of the variation in these eight prices. The metrics unit covers
  what R² does and does not tell you.

LinearRegression does not use a formula with an inverse, and it has no learning rate: it calls a least-squares
solver (SVD-based) that is numerically safe even when features are nearly duplicates.

## Reading the two numbers

- **Slope:** "within this society, each extra square foot adds about ₹6,060 to the predicted price; a flat 100
  sq ft larger is predicted about ₹6.06 lakh dearer." It is an association in this data, not a law — it says
  nothing about what adding a room to *your* flat would do.
- **Intercept:** ₹11.49 lakh is not "the price of a zero-square-foot flat". The data runs from 650 to 1,600 sq
  ft; at 0 the line is far outside it. The intercept is the line's anchor, needed to place it, and usually not
  worth interpreting.
- **Range:** predictions are trustworthy only near the data. The line predicts ₹193 lakh for a 3,000 sq ft
  flat, but no flat that large was in the data, and a penthouse is priced on different terms.

## The same line by gradient descent

The maths topic minimised a loss by stepping against the gradient. For MSE = (1/n) Σ (w·x + b − y)², the
gradient is ∂/∂w = (2/n) Σ err·x and ∂/∂b = (2/n) Σ err, where err = prediction − actual. Standardise the
feature first:

    xs = (x - x.mean()) / x.std()          # standardise the feature
    w, b, lr = 0.0, 0.0, 0.1
    for step in range(1, 201):
        err = (w * xs + b) - y
        w -= lr * 2 * (err * xs).mean()     # dMSE/dw
        b -= lr * 2 * err.mean()            # dMSE/db
        if step in (1, 5, 20, 50, 200):
            print(f"step {step:3d}  w={w:7.3f}  b={b:7.3f}  MSE={((w * xs + b - y) ** 2).mean():9.3f}")
    print("slope per sqft:", round(w / x.std(), 5), " intercept:", round(b - w * x.mean() / x.std(), 3))

    step   1  w=  3.563  b= 15.700  MSE= 4158.091
    step   5  w= 11.977  b= 52.777  MSE=  706.884
    step  20  w= 17.609  b= 77.595  MSE=   12.002
    step  50  w= 17.814  b= 78.499  MSE=   11.141
    step 200  w= 17.815  b= 78.500  MSE=   11.141
    slope per sqft: 0.06057  intercept: 11.492

Converted back to the original units it is the same line. Now run the loop on the **raw** areas with the same
learning rate: after one step w is 18,416, after five it is about 8.7 × 10²⁵ and the MSE about 10⁵⁸. Raw areas in
the hundreds and thousands make the loss surface so steep in w that every step overshoots further. Standardising
(or a far smaller rate) fixes it.

**Which to use?** For linear regression on ordinary data, the direct solver: exact and fast. Gradient methods
matter when there is no closed form (logistic regression, neural networks) or the data is too big to solve at
once (\`SGDRegressor\` streams over rows).

## What the model assumes, in one line

A straight-line relationship, misses that are random rather than patterned, and data that represents the flats
you will predict for. The next unit checks these with residual plots.`,
    workedExample: `**Task: a colleague fits the Whitefield line and asks you to price two listings — a 1,000 sq ft flat
and a 3,000 sq ft penthouse in the same society — and to explain the one flat whose residual is −5.09.**

**1. Fit and check the line is sensible.** Slope 0.06057 lakh/sq ft = ₹6,057 per sq ft, intercept 11.49, R²
0.966. The slope matches the area's known rate per square foot, so the fit is not nonsense.

**2. Price the 1,000 sq ft flat.**

    11.4923 + 0.0605719 × 1000 = 72.06   → about ₹72 lakh

1,000 sq ft is inside the data's range (650–1,600), so this is interpolation. The residuals of the eight flats are
mostly within ±5 lakh, so "₹67–77 lakh" is an honest way to say it.

**3. Decline to price the penthouse with this line.**

    11.4923 + 0.0605719 × 3000 = 193.21   → ₹193 lakh?

3,000 sq ft is almost twice the largest flat in the data. The line has no evidence about that size, and
penthouses are priced on terraces, views and scarcity, not per square foot. Say so: "the model cannot price this
listing; we need comparable large units."

**4. Explain the −5.09 residual.** It is the 1,050 sq ft flat at ₹70 lakh: the line expected ₹75.09 lakh. A
residual is a question, not a verdict — perhaps it is on a low floor, faces the road or has no covered parking.
Features the model does not have show up as residuals. That is exactly why the next unit adds features.

**5. Write it up.** "Within this society, price rises by about ₹6,000 per square foot (8 listings, R² 0.97).
A 1,000 sq ft flat should list at about ₹72 lakh, give or take ₹5 lakh. The model cannot price the 3,000 sq ft
penthouse — it is outside the data."`,
    mcqs: [
      mcq('A regression of flat price (₹ lakh) on area (sq ft) gives a slope of 0.0606. What does the slope say?', [
        ['Each extra square foot adds about ₹6,060 to the predicted price', true],
        ['Each extra square foot raises the predicted price by about 6.06%', false],
        ['Area explains about 6.06% of the variation in the asking price', false],
        ['A flat of one square foot is predicted to cost about ₹6,060', false],
      ], 'Price is in lakh, so 0.0606 lakh = ₹6,060 per square foot. A percentage change would need a log target; explained variation is R²; the price at a given area also needs the intercept.'),
      mcq('Ordinary least squares chooses the line that makes which quantity as small as possible?', [
        ['The sum of the squared vertical gaps between the points and the line', true],
        ['The sum of the perpendicular distances measured from each point to the line', false],
        ['The number of points that do not lie exactly on the fitted line', false],
        ['The single largest vertical gap between any point and the line', false],
      ], 'OLS minimises the sum of squared residuals, measured vertically because the error is in the predicted y. Squaring stops misses cancelling and penalises large misses heavily.'),
      mcq('Gradient descent with learning rate 0.1 converges on standardised area but reaches a weight near 10²⁶ in five steps on raw area (650–1,600 sq ft). Why?', [
        ['Raw areas make the loss so steep in w that each step overshoots', true],
        ['Standardising changes the true slope, so the two runs cannot agree', false],
        ['Gradient descent can only be used on features between 0 and 1', false],
        ['A rate of 0.1 is too small for raw features and must be raised', false],
      ], 'The gradient for w contains err × x, and x is in the hundreds or thousands, so a fixed step is enormous. Standardising (or a far smaller rate) keeps the steps in proportion; converted back, the slope is the same.'),
    ],
    checkpoint: [
      mcq('A line fitted to flats of 650–1,600 sq ft has an intercept of ₹11.49 lakh. How should you read it?', [
        ['As the anchor that places the line, not a price for any real flat', true],
        ['As the land value that is included in the asking price of every flat', false],
        ['As the fixed registration cost paid on top of every purchase', false],
        ['As the average asking price of the smallest flats in the data', false],
      ], 'The intercept is the prediction at area 0, far outside the data. It is needed to position the line but has no business meaning here.'),
      mcq('For a single feature, which expression gives the least-squares slope?', [
        ['Σ(x − x̄)(y − ȳ) ÷ Σ(x − x̄)²', true],
        ['Σ(x − x̄)(y − ȳ) ÷ Σ(y − ȳ)²', false],
        ['Σ(y − ȳ)² ÷ Σ(x − x̄)(y − ȳ)', false],
        ['(ȳ − x̄) ÷ Σ(x − x̄)(y − ȳ)', false],
      ], 'The slope is how x and y vary together divided by how much x varies. For the Whitefield flats it is 41,915 ÷ 691,987.5 = 0.06057.'),
      mcq('Why does scikit-learn\'s LinearRegression have no learning rate to set?', [
        ['It solves the least-squares problem directly instead of iterating', true],
        ['It picks the learning rate itself by running cross-validation', false],
        ['It always standardises the features, so one rate always suits', false],
        ['It uses a learning rate of 1, which is the optimal value for linear models', false],
      ], 'LinearRegression calls a least-squares solver (SVD-based), so there are no steps to size. Iterative fitting is SGDRegressor\'s job.'),
    ],
  },

  /* ── MULTIPLE_REGRESSION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_MULTIPLE_REGRESSION',
    notes: `One feature never prices a flat. This unit adds several, and with them come the questions interviewers
actually ask: what does a coefficient mean when the features overlap, why did a sensible feature get a negative
sign, and what do the residuals say about the assumptions?

## The data used in this topic

600 simulated Bengaluru listings across eight localities. Copy the generator once; the rest of the topic uses it.

    import numpy as np
    import pandas as pd

    def make_houses(n=600, seed=42):
        rng = np.random.default_rng(seed)
        rates = {"Whitefield": 6800, "Electronic City": 5200, "Koramangala": 12500, "Indiranagar": 14000,
                 "HSR Layout": 10500, "Yelahanka": 5800, "Hebbal": 8200, "Marathahalli": 7200}
        loc = rng.choice(list(rates), n)
        bhk = rng.choice([1, 2, 3, 4], n, p=[0.15, 0.45, 0.32, 0.08])
        area = np.round(bhk * 430 + rng.normal(180, 110, n)).clip(380, None)
        bath = np.clip(bhk + rng.choice([-1, 0, 0, 1], n), 1, None)
        age = rng.integers(0, 26, n)
        dist = np.round(rng.gamma(2.0, 1.4, n), 1)
        rate = np.array([rates[l] for l in loc])
        price = area * rate / 1e5 * (1 - 0.008 * age) * (1 - 0.025 * np.minimum(dist, 10)) * rng.lognormal(0, 0.12, n)
        return pd.DataFrame({"locality": loc, "area_sqft": area.astype(int), "bhk": bhk, "bath": bath,
                             "age_years": age, "dist_metro_km": dist, "price_lakh": np.round(price, 1)})

    df = make_houses()
    df.head(3)

         locality  area_sqft  bhk  bath  age_years  dist_metro_km  price_lakh
    0  Whitefield       1406    3     3          1            7.0        70.9
    1      Hebbal        605    1     1         10            3.1        47.9
    2   Yelahanka       1071    2     2         11            2.0        51.8

Price is built **multiplicatively** — rate per sq ft × area, discounted by age and distance — the way property
is actually priced. Keep that in mind; the residuals will reveal it.

## Several features: the model and its fit

    price = b0 + b1·area + b2·bhk + b3·bath + b4·age + b5·dist

The normal equation from the last unit solves this unchanged; X just has more columns.

    from sklearn.linear_model import LinearRegression
    from sklearn.model_selection import train_test_split

    num = ["area_sqft", "bhk", "bath", "age_years", "dist_metro_km"]
    X_tr, X_te, y_tr, y_te = train_test_split(df[num + ["locality"]], df["price_lakh"],
                                              test_size=0.25, random_state=0)
    m = LinearRegression().fit(X_tr[num], y_tr)
    print(pd.Series(m.coef_, index=num).round(3).to_string())

    area_sqft        0.086
    bhk             -7.878
    bath             3.203
    age_years       -0.692
    dist_metro_km   -2.650

    R² train 0.435, test 0.465

Each coefficient is read **holding the other features fixed**: "two flats with the same bedrooms, bathrooms,
age and metro distance, one 100 sq ft larger, differ by about ₹8.6 lakh in predicted price." And R² of 0.47 says
the model is missing something big — we will find it shortly.

## Why is bhk negative?

More bedrooms cost less? Fit bhk alone and its coefficient is **+30.88** lakh per bedroom. Fit area and bhk
together and it becomes **−8.42**. Nothing is broken:

    df[["area_sqft", "bhk", "bath"]].corr().round(2)

               area_sqft   bhk  bath
    area_sqft       1.00  0.95  0.71
    bhk             0.95  1.00  0.74
    bath            0.71  0.74  1.00

Area and bhk are correlated at 0.95. Alone, bhk stands in for size. With area in the model, bhk means "an extra
bedroom **carved out of the same area**" — smaller rooms — and buyers pay a little less for that. This is
**multicollinearity**: when features overlap, each coefficient answers a narrower question, and it becomes
unstable (a different sample can swing it a lot, even flip its sign).

**Measure it with the variance inflation factor (VIF):** regress each feature on all the others; VIF = 1 / (1 − R²).

    def vif(X):
        out = {}
        for c in X.columns:
            others = X.drop(columns=c)
            r2 = LinearRegression().fit(others, X[c]).score(others, X[c])
            out[c] = 1 / (1 - r2)
        return pd.Series(out).round(2)

    vif(X_tr[num])
    # area_sqft 11.61, bhk 13.05, bath 2.25, age_years 1.01, dist_metro_km 1.02

A common rule of thumb flags VIF above 5–10. Multicollinearity does **not** hurt predictions much — it hurts
**interpretation**. Options: drop one of the pair, combine them (sq ft per bedroom), or regularise (next unit).

## The missing feature: locality

Location is the biggest driver of property prices, and it is text. One-hot encode it inside a pipeline (the
workflow topic showed why — the encoder must learn its categories from training data only):

    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.metrics import mean_absolute_error, r2_score

    pre = ColumnTransformer([("loc", OneHotEncoder(drop="first"), ["locality"])], remainder="passthrough")
    lin = make_pipeline(pre, LinearRegression()).fit(X_tr, y_tr)
    # test R² 0.863, MAE 12.48 lakh

\`drop="first"\` removes one category (Electronic City, first alphabetically) to avoid perfect collinearity with
the intercept; each locality coefficient is then "compared with Electronic City".

## Residuals: the assumptions, checked

The assumptions of linear regression, and what each one protects:

| Assumption | If it fails | Check |
|---|---|---|
| Linearity — the mean of y really is a linear function of the features | Biased predictions in parts of the range | Residuals vs fitted: a curve or trend |
| Independent errors | Overconfident standard errors (time series, repeated listings) | How the data was collected; residuals over time |
| Constant variance (homoscedasticity) | Intervals too narrow for big values, too wide for small | Residual spread growing with fitted values |
| No perfect multicollinearity | Coefficients cannot be separated | VIF, correlation matrix |
| Normal errors | Only the p-values and intervals, not the fit | Q–Q plot of residuals |

Group the training residuals by quarter of fitted value (the numeric summary of a residual plot):

    fitted = lin.predict(X_tr); resid = y_tr - fitted
    band = pd.qcut(fitted, 4, labels=["lowest", "2nd", "3rd", "highest"])
    pd.DataFrame({"resid": resid.to_numpy(), "band": band}).groupby("band", observed=True)["resid"].agg(["mean", "std"]).round(1)

             mean   std
    lowest    5.8   8.2
    2nd      -2.1   9.7
    3rd      -8.4  13.8
    highest   4.7  21.5

Two failures at once: the **mean** goes +, −, −, + (a curve — the line is wrong at both ends), and the **spread**
grows from 8.2 to 21.5 lakh (non-constant variance). Both are the fingerprint of a multiplicative process fitted
with an additive model.

## The fix: model log(price)

    import numpy as np
    logm = make_pipeline(pre, LinearRegression()).fit(X_tr, np.log(y_tr))
    pred = np.exp(logm.predict(X_te))
    # test R² 0.935, MAE 8.77 lakh (back on the rupee scale)

Residual spread on the log scale is now flat across the bands (0.150, 0.126, 0.137, 0.139), and test MAE falls
from 12.48 to 8.77 lakh. **Coefficients now mean percentages:** a coefficient c changes price by a factor of
e^c — about c × 100% when c is small.

    remainder__age_years         -0.0092   → each extra year of age: −0.9%
    remainder__dist_metro_km     -0.0280   → each km further from the metro: −2.8%
    loc__locality_Indiranagar     0.9799   → e^0.98 − 1 = +166% vs Electronic City
    remainder__area_sqft          0.0009   → 100 more sq ft: e^(100 × 0.00094) − 1 ≈ +9.9%

"+166% vs Electronic City, holding size, age and distance fixed" is the sentence that wins the interview.

## Scaling and comparing coefficients

Raw coefficients are in their own units — 0.086 lakh per sq ft vs −2.65 lakh per km — so their sizes are not
comparable. Standardise the features and each coefficient becomes "per standard deviation":

    from sklearn.preprocessing import StandardScaler
    sc = make_pipeline(StandardScaler(), LinearRegression()).fit(X_tr[num], y_tr)
    # area_sqft 31.93, bhk -6.58, bath 3.28, age_years -5.30, dist_metro_km -6.04

Scaling does not change OLS predictions; it changes what the numbers mean. Regularisation (next unit) does
depend on it.`,
    workedExample: `**Task: a proptech product manager reads the coefficient table and says: "bhk is −7.9, so adding a bedroom
lowers the price — let's tell sellers not to list the study as a bedroom." Respond with evidence.**

**1. Reproduce the claim.** With five numeric features, bhk's coefficient is −7.878 lakh. True.

**2. Show that the sign depends on what is held fixed.**

    for cols in (["bhk"], ["area_sqft", "bhk"]):
        print(cols, LinearRegression().fit(X_tr[cols], y_tr).coef_.round(3))
    # ['bhk'] [30.883]
    # ['area_sqft', 'bhk'] [ 0.093 -8.418]

Alone, one more bedroom goes with ₹30.9 lakh more, because bigger flats have more bedrooms. Holding area fixed,
an extra bedroom means the same floor space cut into smaller rooms.

**3. Quantify the overlap.** Correlation of area and bhk: 0.95. VIFs: area 11.6, bhk 13.1 — well above the usual
5–10 alarm level. The bhk coefficient is unstable and should not be read on its own.

**4. Answer the actual question.** Relabelling a study as a bedroom does not change the area, so the model's
honest statement is: "for the same area, listings with more bedrooms are priced slightly lower — about ₹8 lakh
per extra bedroom in this data, with high uncertainty". That is an association across *different* flats, not the
effect of relabelling one flat. A listing experiment or buyer research would answer the PM's question; a
coefficient cannot.

**5. Offer the useful version.** Replace bhk with \`sqft_per_bedroom\` (area ÷ bhk). The overlap goes away and the
coefficient answers a question a seller understands: "do buyers pay more for roomier bedrooms?"`,
    mcqs: [
      mcq('With area in the model, bhk gets a coefficient of −8.4 lakh, yet alone it is +30.9. What is the best explanation?', [
        ['Holding area fixed, an extra bedroom means smaller rooms for the same space', true],
        ['The model has a bug, since more bedrooms can never lower a flat\'s price', false],
        ['bhk is a categorical feature and should be one-hot encoded before fitting', false],
        ['The training data is too small to estimate more than one coefficient at all', false],
      ], 'Area and bhk correlate at 0.95. Alone, bhk stands in for size; with area held fixed it measures how the same area is divided. Coefficients answer "holding the others fixed".'),
      mcq('A log(price) model has a coefficient of −0.028 on distance to the metro in km. How should it be read?', [
        ['Each extra km from the metro is linked to about 2.8% lower price', true],
        ['Each extra km from the metro lowers the price by ₹0.028 lakh', false],
        ['Each extra km from the metro lowers the predicted price by about 28%', false],
        ['Distance explains 2.8% of the variation in log house prices', false],
      ], 'With a log target, a coefficient c multiplies price by e^c; e^−0.028 ≈ 0.972, a 2.8% drop per km, holding the other features fixed.'),
      mcq('Residuals grouped by quarter of fitted price have standard deviations 8.2, 9.7, 13.8 and 21.5 lakh. Which assumption is failing?', [
        ['Constant variance — errors grow as predicted prices grow', true],
        ['Independence — each listing\'s error depends on the next', false],
        ['No multicollinearity — features are too closely related', false],
        ['Normality — residuals must have a bell-shaped histogram', false],
      ], 'Spread rising with the fitted value is heteroscedasticity, typical of a multiplicative process. Modelling log(price) made the spread flat in this data.'),
    ],
    checkpoint: [
      mcq('Two features have VIFs of 11.6 and 13.1. What does that mainly put at risk?', [
        ['The stability and meaning of their individual coefficients', true],
        ['The model\'s predictions on rows similar to the training data', false],
        ['The ability of scikit-learn to fit the model at all', false],
        ['The R² of the model on the training data', false],
      ], 'High VIF means each feature is largely predictable from the others. Predictions on similar data are usually fine; what suffers is the interpretation and stability of each coefficient.'),
      mcq('Locality is one-hot encoded with drop="first", and Electronic City is the dropped category. What does the Indiranagar coefficient measure?', [
        ['The difference from Electronic City, holding the other features fixed', true],
        ['The average price of all Indiranagar flats in the training data', false],
        ['The difference from the average locality across the whole of the city', false],
        ['How strongly Indiranagar is correlated with area and bedroom count', false],
      ], 'The dropped category becomes the baseline absorbed into the intercept, so each remaining locality coefficient is a difference from it.'),
      mcq('Training residuals have means +5.8, −2.1, −8.4 and +4.7 from the lowest to highest quarter of fitted values. What is this pattern evidence of?', [
        ['A curved relationship that a straight-line model is missing', true],
        ['Data leakage from the target into one of the input features', false],
        ['Too few training rows for the number of features in the model', false],
        ['A perfect fit, because the residual means average out to zero', false],
      ], 'Residuals that are positive at both ends and negative in the middle mean the model is systematically wrong in parts of the range — a linearity failure. Here a log target fixed it.'),
    ],
  },

  /* ── REGULARISATION ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_REGULARISATION',
    notes: `Ordinary least squares believes every feature. Given enough of them and few enough rows, it fits noise
with total confidence. **Regularisation** adds a cost for large coefficients, trading a little bias for a lot
less variance. This unit shows when it helps, when it barely matters, and how to choose its strength.

## The three penalties

All three minimise "squared error + α × penalty":

| Model | Penalty | Effect |
|---|---|---|
| **Ridge** (L2) | α · Σ bⱼ² | Shrinks all coefficients smoothly towards zero; never exactly zero |
| **Lasso** (L1) | α · Σ \\|bⱼ\\| | Shrinks, and sets some coefficients **exactly** to zero |
| **Elastic net** | mix of both, \`l1_ratio\` sets the mix | Lasso's zeros, ridge's stability with correlated features |

(scikit-learn scales the terms slightly differently in each class; what matters is that larger α means a stronger
penalty.) The intercept is never penalised.

**Scale first, always.** The penalty compares coefficients directly. Unscaled, area's coefficient (per sq ft) is
tiny and age's (per year) is large, so the penalty would hit the wrong features. Put a \`StandardScaler\` in the
pipeline before Ridge or Lasso.

## The experiment

Take the 600 listings from \`make_houses()\` and add 20 amenity flags (gym, pool, clubhouse, lift…). Only three —
pool (+6%), power backup (+4%) and lift (+5%) — actually move the price; the other seventeen are noise. That is
33 columns after one-hot encoding locality: a realistic "the data team gave us everything" feature set.

    rng = np.random.default_rng(7)
    amenities = ["gym", "pool", "clubhouse", "power_backup", "lift", "security", "park", "jogging_track",
                 "indoor_games", "rainwater", "solar", "intercom", "visitor_parking", "ev_charging",
                 "library", "amphitheatre", "cctv", "gas_pipeline", "garden", "play_area"]
    for a in amenities:
        df[a] = (rng.random(len(df)) < 0.5).astype(int)
    df["price_lakh"] = np.round(df["price_lakh"] * np.where(df["pool"] == 1, 1.06, 1)
                                * np.where(df["power_backup"] == 1, 1.04, 1) * np.where(df["lift"] == 1, 1.05, 1), 1)

    num = ["area_sqft", "bhk", "bath", "age_years", "dist_metro_km"] + amenities
    pre = ColumnTransformer([("num", StandardScaler(), num),
                             ("cat", OneHotEncoder(handle_unknown="ignore"), ["locality"])])

Train on 50, 160 and 400 rows (target log price), test on the rest, MAE in lakh:

    from sklearn.linear_model import LinearRegression, Ridge, Lasso, RidgeCV, LassoCV
    cv = KFold(5, shuffle=True, random_state=0)
    alphas = np.logspace(-3, 3, 13)
    for n in [50, 160, 400]:
        tr = df.sample(n, random_state=1); te = df.drop(tr.index)
        for model in [LinearRegression(), RidgeCV(alphas=alphas), LassoCV(cv=cv, random_state=0, max_iter=50_000)]:
            p = make_pipeline(pre, model).fit(tr, np.log(tr["price_lakh"]))
            ... mean_absolute_error(te["price_lakh"], np.exp(p.predict(te)))

     train_rows   OLS  RidgeCV  LassoCV
             50 13.84    13.34    12.24
            160 12.01    12.00    11.75
            400 10.71    10.68    10.52

Read it honestly:

- With **50 rows for 33 features**, OLS chases noise, and lasso cuts the error by 1.6 lakh (12%).
- With **400 rows**, the three are within 0.2 lakh. Plenty of data per feature is itself a regulariser.
- Regularisation is not magic. It earns its keep when features are many, rows are few, or features overlap.

## What ridge does to coefficients

On 160 rows, the standardised coefficients as α grows:

    ridge alpha=0.01   area=0.407 bhk=-0.080 pool=0.025
    ridge alpha=1      area=0.380 bhk=-0.052 pool=0.028
    ridge alpha=10     area=0.281 bhk=+0.045 pool=0.043
    ridge alpha=100    area=0.149 bhk=+0.098 pool=0.038
    ridge alpha=1000   area=0.045 bhk=+0.038 pool=0.006

Two lessons. Everything shrinks towards zero as α grows; at α = 1000 the model barely uses any feature
(underfitting). And the **correlated pair shares the credit**: ridge moves weight from area to bhk, and bhk's
puzzling negative sign from the last unit disappears by α = 10. Ridge is the standard fix for multicollinearity.

## What lasso does: zeros

    lasso alpha=0.001  non-zero coefficients: 31 of 33
    lasso alpha=0.01   non-zero coefficients: 15 of 33
    lasso alpha=0.05   non-zero coefficients: 6 of 33
    lasso alpha=0.1    non-zero coefficients: 2 of 33

Lasso is used as **feature selection**: the features left standing are "the ones that matter". Be careful with
that sentence. At α = 0.05 lasso keeps

    ['area_sqft', 'age_years', 'dist_metro_km', 'gym', 'power_backup', 'locality_Indiranagar']

— it kept **gym**, which is pure noise, and dropped **pool** and **lift**, which are real. With correlated or weak
features and few rows, which ones lasso keeps can change from sample to sample. Treat its zeros as a useful
shortlist, not as proof that a feature has no effect.

## Choosing α by cross-validation

α is a **hyperparameter**: chosen by cross-validation on the training data, never by the test set.

    lcv = make_pipeline(pre, LassoCV(cv=cv, random_state=0, max_iter=50_000)).fit(tr, y)
    lcv[-1].alpha_                     # 0.0011
    # set to zero: ['clubhouse', 'security', 'indoor_games', 'locality_Hebbal']

\`RidgeCV(alphas=...)\` and \`LassoCV\` / \`ElasticNetCV\` search a grid of α internally (efficient leave-one-out for
ridge, k-fold for lasso). Equivalently: \`GridSearchCV(pipe, {"ridge__alpha": alphas}, cv=5)\`. Search on a **log
scale** (0.001, 0.01, 0.1…), because what matters is the order of magnitude. If the best α sits at the edge of the
grid, extend the grid.

CV picked a small α here (0.0011), keeping 29 of 33 coefficients: with 160 rows, mild shrinkage predicted best.
CV optimises prediction, not interpretability — if you need a short list for a business audience, a larger α at a
small cost in error is a legitimate choice, and you should say you made it.

## Which one to use

- **Ridge** — default when you have many useful, correlated features. Stable, never discards anything.
- **Lasso** — when you believe few features matter and want a sparse model; unstable with correlated features.
- **Elastic net** — lasso's sparsity with ridge's handling of correlated groups; try \`l1_ratio\` in [0.2, 0.5, 0.8].

In every case: scaler in the pipeline, α from CV, test set used once at the end.`,
    mcqs: [
      mcq('With 50 training rows and 33 features, LassoCV beat plain OLS by 1.6 lakh MAE; with 400 rows the gap was 0.2 lakh. What explains the difference?', [
        ['With few rows per feature OLS fits noise, which the penalty restrains', true],
        ['Lasso only works properly when there are fewer than 100 training rows', false],
        ['OLS cannot be fitted at all when features outnumber training rows', false],
        ['The test set was easier to predict in the 50-row experiment than later', false],
      ], 'Regularisation trades a little bias for less variance. Variance is the problem when data per feature is scarce; with plenty of rows OLS is already stable.'),
      mcq('Why must features be standardised before ridge or lasso?', [
        ['The penalty compares coefficients, which depend on each feature\'s units', true],
        ['Ridge and lasso refuse to fit features that are not between 0 and 1', false],
        ['Scaling makes predictions identical between OLS and the penalised fit', false],
        ['Standardising removes outliers that would otherwise distort the fit', false],
      ], 'A per-sq-ft coefficient is tiny and a per-year one large purely because of units. Without scaling, the penalty shrinks features according to their units, not their usefulness.'),
      mcq('At α = 0.05, lasso keeps "gym" (pure noise in the data) and drops "pool" (a real +6% effect). What is the right lesson?', [
        ['Lasso\'s choice of features can be unstable; treat it as a shortlist', true],
        ['The pool feature must have been leaking target information into the fit', false],
        ['Lasso has a bug when features are binary rather than continuous values', false],
        ['Gym genuinely affects price, and the data generator must be mistaken', false],
      ], 'With weak or correlated effects and few rows, which features survive depends on the sample. Lasso\'s zeros are a useful heuristic, not proof of no effect.'),
    ],
    checkpoint: [
      mcq('Which statement about ridge and lasso is correct?', [
        ['Lasso can set coefficients exactly to zero; ridge only shrinks them', true],
        ['Ridge can set coefficients exactly to zero; lasso only shrinks them', false],
        ['Both set coefficients to zero once alpha is larger than one', false],
        ['Neither changes coefficients; both only change the intercept', false],
      ], 'The L1 penalty has a corner at zero, so the optimum often lands exactly there; the L2 penalty shrinks smoothly and never quite reaches zero.'),
      mcq('How should the regularisation strength α be chosen?', [
        ['By cross-validation on the training data, over a log-scale grid', true],
        ['By trying several values and keeping the one with the best test score', false],
        ['By using the largest α for which every coefficient is still non-zero', false],
        ['By setting α to 1, the default value that is right for most datasets', false],
      ], 'α is a hyperparameter. Choosing it on the test set leaks the test set into the model; CV on the training data keeps the final test score honest.'),
      mcq('As ridge\'s α grows from 0.01 to 1000, the area coefficient falls from 0.407 to 0.045. What is happening at α = 1000?', [
        ['The penalty dominates, so the model underfits and ignores the features', true],
        ['The model has found that area does not matter for house prices at all', false],
        ['The model is now overfitting, because its coefficients have shrunk', false],
        ['Nothing important, since ridge predictions do not depend on α at all', false],
      ], 'A very large α forces all coefficients towards zero, leaving a model that predicts close to the mean: high bias. CV finds the α between over- and underfitting.'),
    ],
  },

  /* ── REGRESSION_METRICS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_REGRESSION_METRICS',
    notes: `A regression model is judged by a number, and the number you choose decides what "good" means. This unit
computes the four common ones by hand, shows what each rewards, and ends with the trap that catches most first
projects: reporting errors on the log scale.

## Four metrics on eight deliveries

A food-delivery app predicts minutes to the customer. Eight deliveries:

    import numpy as np
    from sklearn.metrics import (mean_absolute_error, mean_squared_error, root_mean_squared_error,
                                 r2_score, mean_absolute_percentage_error)

    y = np.array([28, 35, 22, 41, 30, 55, 26, 33])     # actual minutes
    p = np.array([31, 33, 25, 36, 29, 38, 27, 35])     # predicted
    e = p - y                                          # [ 3 -2  3 -5 -1 -17  1  2]

| Metric | Formula | Here | In words |
|---|---|---|---|
| **MAE** | mean \\|e\\| | 34 / 8 = **4.25 min** | The typical miss |
| **MSE** | mean e² | 342 / 8 = 42.75 min² | Squared units — hard to say aloud |
| **RMSE** | √MSE | **6.54 min** | Like MAE but punishes big misses |
| **R²** | 1 − SSE / SST | 1 − 342 / 751.5 = **0.545** | Share of variation explained vs predicting the mean |
| **MAPE** | mean \\|e\\| / y | **10.8%** | The typical miss as a percentage |

    mean_absolute_error(y, p)              # 4.25
    root_mean_squared_error(y, p)          # 6.538...   (scikit-learn 1.4+; older: np.sqrt(mean_squared_error(y, p)))
    r2_score(y, p)                         # 0.5449...
    mean_absolute_percentage_error(y, p)   # 0.1080...  — a fraction, not a percentage

## MAE vs RMSE: what one bad delivery does

The 55-minute delivery (a rain-hit order predicted at 38) contributes 17 to the absolute errors but **289** to
the squared ones — 85% of the total. Remove it and MAE falls from 4.25 to 2.43, RMSE from 6.54 to 2.75.

- **MAE** treats every minute of error the same. Report it when every minute costs the same.
- **RMSE** is dominated by the worst misses. Use it when big misses are disproportionately bad (a customer
  whose food is 17 minutes late is much angrier than one 2 minutes late, many times over).
- RMSE ≥ MAE always; a large gap between them means a few large errors.

## R², honestly

R² compares your model with the dumbest possible one: always predict the mean of the actual values.

- R² = 1: perfect. R² = 0: no better than the mean. **R² < 0: worse than the mean** — entirely possible on a test
  set. Predicting 25 minutes for every order here gives R² = −0.815.
- R² depends on how varied the target is. The same 4-minute MAE gives a high R² on a dataset with deliveries from
  15 to 90 minutes and a low one if they are all 25–35. Never compare R² across different datasets.
- A business stakeholder cannot act on "0.545". They can act on "typically within 4 minutes".

## MAPE and its trap

MAPE speaks the business's language ("about 11% off"), but dividing by the actual value breaks for small actuals.
Forecasting returned units per SKU:

    actual    [1, 2, 40, 55, 120]
    predicted [3, 4, 42, 50, 118]
    percentage errors: 200%, 100%, 5%, 9.1%, 1.7%  →  MAPE 63.2%, while MAE is 2.6 units

Two tiny SKUs dominate. MAPE is undefined at zero and asymmetric (over-forecasts can exceed 100%, under-forecasts
cannot). Use it only when actuals are comfortably away from zero; otherwise report MAE, or a weighted version
(total |error| ÷ total actual).

## Errors on the original scale after a log transform

The house model from the multiple regression unit was trained on log(price). Its errors **on the log scale** are:

    log-scale RMSE 0.1274, log-scale MAE 0.1015

A first project writes "MAE 0.10" in the report. That is not ₹0.10 lakh. A log-scale error of 0.10 is roughly a
**10% miss**. Always transform predictions back before reporting:

    pred = np.exp(logm.predict(X_te))
    MAE 8.77 lakh, RMSE 12.19 lakh, R² 0.935, MAPE 10.5%

scikit-learn can do the round trip for you, so you never forget:

    from sklearn.compose import TransformedTargetRegressor
    model = TransformedTargetRegressor(regressor=LinearRegression(), func=np.log, inverse_func=np.exp)
    # fit on price, predict price; MAE 8.77 lakh

One subtlety: exp(predicted log) estimates the **median** price, not the mean, so predictions run slightly low
on average. Multiplying by the mean of exp(training residuals) — Duan's smearing factor, 1.0097 here — corrects
the average; it barely changes MAE (8.92 vs 8.77). Worth knowing when the total matters (a portfolio valuation).

## Always next to a baseline

    DummyRegressor(strategy="median") → MAE 35.07 lakh, R² −0.033

The model's 8.77 lakh is a 75% reduction on the naive guess. That sentence means something; "MAE 8.77" alone
does not.

## Which to report to whom

| Audience | Report |
|---|---|
| Business owner | MAE in ₹ or minutes; "% within 10%"; the baseline it beats |
| Data science review | RMSE and MAE, R², CV mean ± sd, the residual plot |
| Model selection | One primary metric chosen **before** you start, matching the cost of errors |

And break errors down by segment. The house model's test errors by price band:

    band      n   MAE   MAPE
    <60L     48   5.1   12.0
    60-100L  58   7.5    9.6
    >100L    44  14.4   10.0

The rupee error grows with price while the percentage error stays near 10% — one overall MAE hides both facts.`,
    mcqs: [
      mcq('Eight delivery predictions have MAE 4.25 min and RMSE 6.54 min. One 17-minute miss is removed and RMSE falls to 2.75. What does that show?', [
        ['RMSE is dominated by the largest errors because they are squared', true],
        ['MAE is the more unstable metric and should not be reported', false],
        ['The 17-minute miss was an outlier and must be deleted from the data', false],
        ['RMSE and MAE always change by the same amount when a row is removed', false],
      ], 'The one miss contributes 289 of the 342 squared error. Whether to report RMSE depends on whether big misses really cost disproportionately more.'),
      mcq('A model trained on log(price) reports "test MAE 0.10". What is the right correction?', [
        ['Back-transform predictions and report MAE in rupees; 0.10 is about a 10% miss', true],
        ['Report it as ₹0.10 lakh, since the model\'s target was price in lakh', false],
        ['Multiply 0.10 by the mean price in the test set to get the MAE in rupees exactly', false],
        ['Nothing — log-scale errors are the standard way to report regression', false],
      ], 'A log-scale error is approximately a proportional error. The business needs the error in ₹: exponentiate the predictions and compute MAE on the original scale.'),
      mcq('Return quantities of 1 and 2 units are forecast as 3 and 4. Why does MAPE become misleading?', [
        ['Dividing by tiny actuals turns 2-unit misses into 200% and 100% errors', true],
        ['MAPE cannot be computed when any of the predictions is above the actual', false],
        ['MAPE ignores small values and so it understates the error on them', false],
        ['MAPE requires the actual values to be normally distributed to be valid', false],
      ], 'Percentage error divides by the actual value, so near-zero actuals explode it. Here MAPE is 63% while MAE is only 2.6 units.'),
    ],
    checkpoint: [
      mcq('A model has R² = −0.2 on the test set. What does that mean?', [
        ['It predicts worse than always guessing the mean of the test target', true],
        ['It explains 20% of the variation, but in the opposite direction', false],
        ['R² cannot be negative, so the calculation must contain an error', false],
        ['It predicts slightly better than a constant, but only on the test set', false],
      ], 'R² = 1 − SSE/SST. If the model\'s squared error exceeds that of predicting the mean, R² is negative — common when a model is applied to data unlike its training data.'),
      mcq('An operations head asks how accurate a delivery-time model is. Which answer is most useful?', [
        ['"Typically within 4 minutes; the naive guess is off by 7"', true],
        ['"The RMSE is 6.54 and the MSE is 42.75 square minutes"', false],
        ['"The model has an R² of 0.545 on the held-out test set"', false],
        ['"The log-scale error of the model is about 0.1 overall"', false],
      ], 'MAE in the business\'s own units, next to a baseline, is something a manager can act on. MSE is in squared units and R² is relative to the data\'s spread.'),
      mcq('Why can exp(predicted log price) run slightly low on average?', [
        ['The exponential of a mean log estimates the median, not the mean', true],
        ['The exponential function always rounds its results down slightly', false],
        ['Log models cannot learn the intercept, so predictions are shifted', false],
        ['scikit-learn clips predictions at zero before the exponential', false],
      ], 'For a right-skewed error distribution the median is below the mean. A smearing factor (mean of exp of residuals) rescales predictions when the average or total matters.'),
    ],
  },

  /* ── NONLINEAR_REGRESSION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_NONLINEAR_REGRESSION',
    notes: `Crop yield rises with rainfall — until the field floods. Delivery time grows with distance — except that
traffic makes a 4 km evening trip slower than a 6 km afternoon one. When the relationship bends or features
interact, a straight line is wrong in a way no amount of data fixes. Three tools, and what each costs.

## The data

160 simulated maize farms in north Karnataka: kharif rainfall, nitrogen fertiliser, and yield. Yield peaks near
950 mm of rain and falls on both sides; fertiliser helps only when there is enough rain to use it.

    rng = np.random.default_rng(11)
    n = 160
    rain = rng.uniform(350, 1500, n).round()           # kharif-season rainfall, mm
    fert = rng.uniform(40, 160, n).round()             # nitrogen, kg/ha
    yld = 1.2 + 4.2 * np.exp(-((rain - 950) / 380) ** 2) + 0.010 * fert * (rain > 600) + rng.normal(0, 0.35, n)
    farms = pd.DataFrame({"rain_mm": rain, "fert_kg_ha": fert, "yield_t_ha": yld.round(2)})

    X_tr, X_te, y_tr, y_te = train_test_split(farms[["rain_mm"]], farms["yield_t_ha"], test_size=0.25, random_state=0)

## 1. Polynomial features

A linear model is linear **in its coefficients**, not in x. Add x² and the "linear" regression fits a parabola:

    yield = b0 + b1·rain + b2·rain²

\`PolynomialFeatures\` creates the extra columns; the model is still LinearRegression:

    from sklearn.preprocessing import PolynomialFeatures, StandardScaler
    for d in [1, 2, 3, 10]:
        model = make_pipeline(StandardScaler(), PolynomialFeatures(d, include_bias=False), LinearRegression())
        ...

    degree  1: train MAE 1.322  CV MAE 1.330  test MAE 1.231  at 300/1600/2000 mm: [2.98 5.65 6.47]
    degree  2: train MAE 0.485  CV MAE 0.492  test MAE 0.467  at 300/1600/2000 mm: [-0.46  0.27 -9.17]
    degree  3: train MAE 0.482  CV MAE 0.492  test MAE 0.469  at 300/1600/2000 mm: [ -0.25  -0.05 -11.08]
    degree 10: train MAE 0.331  CV MAE 0.363  test MAE 0.391  at 300/1600/2000 mm: [  3.21   1.86 813.99]

- The **straight line** misses by 1.3 t/ha: it cannot bend, so more data would not help (high bias).
- **Degree 2** cuts the error by almost two-thirds. Fitted on raw rainfall, its coefficients put the peak at
  −b1 / (2·b2) = **970 mm** — close to the true 950, and a sentence an agronomist can use.
- **Degree 10** wins on CV and test — the true curve is not a parabola — but look at the last column. At
  2,000 mm, outside the training range of 369–1,499 mm, it predicts **814 t/ha** (real maize yields are under 10).
  Degree 2 predicts a negative yield at 300 mm. High-degree polynomials are wild outside the data.

Rules: scale before \`PolynomialFeatures\` (rain² is in the millions otherwise), pick the degree by CV, and never
let a polynomial model extrapolate. Smooth alternatives that behave better at the edges exist
(\`SplineTransformer\`, scikit-learn 1.0+).

## 2. Interactions

With two features, \`PolynomialFeatures(2)\` also creates their **product**:

    ['rain_mm' 'fert_kg_ha' 'rain_mm^2' 'rain_mm fert_kg_ha' 'fert_kg_ha^2']

The \`rain_mm fert_kg_ha\` column lets fertiliser's effect depend on rainfall — an **interaction**. Without it, a
linear model must give fertiliser the same slope in a drought and a good monsoon.

    rain + fertiliser, degree 1: test MAE 1.231
    rain + fertiliser, degree 2: test MAE 0.349

Adding fertiliser to a straight-line model does nothing (1.231, the same as rain alone); with curvature and
the interaction, the error falls to 0.349. Interactions you can name ("fertiliser × rain", "area × locality",
"distance × rush hour") are usually better than generating every product blindly: the number of columns from
\`PolynomialFeatures\` explodes with degree and feature count.

## 3. Decision trees for regression

A regression tree splits the data on thresholds and predicts the **mean** of each final group (leaf). It needs no
scaling, finds curves and interactions by itself, and reads as rules:

    from sklearn.tree import DecisionTreeRegressor, export_text
    t2 = DecisionTreeRegressor(max_depth=2, random_state=0).fit(X_tr, y_tr)
    print(export_text(t2, feature_names=["rain_mm"], decimals=2))

    |--- rain_mm <= 613.00
    |   |--- rain_mm <= 499.00
    |   |   |--- value: [1.88]
    |   |--- rain_mm >  499.00
    |   |   |--- value: [2.69]
    |--- rain_mm >  613.00
    |   |--- rain_mm <= 1276.50
    |   |   |--- value: [5.52]
    |   |--- rain_mm >  1276.50
    |   |   |--- value: [3.20]

"Below 499 mm expect about 1.9 t/ha; 613–1,276 mm about 5.5" — a step function an extension officer can read.
Depth is the control:

    tree depth 2   : leaves   4  train MAE 0.513  CV MAE 0.557  test MAE 0.651
    tree depth 3   : leaves   8  train MAE 0.404  CV MAE 0.509  test MAE 0.629
    tree depth 5   : leaves  28  train MAE 0.255  CV MAE 0.430  test MAE 0.383
    tree depth None: leaves 112  train MAE 0.034  CV MAE 0.478  test MAE 0.419

An unlimited tree memorises the training set (train MAE 0.034, 112 leaves for 120 rows) and does worse on CV
than depth 5. Choose depth (or \`min_samples_leaf\`) by CV, exactly like α in the last unit.

A tree's weakness is the mirror of the polynomial's: **outside the training range it predicts a constant** — the
value of the edge leaf (2.97 t/ha at 2,000 mm for the deep tree). It never explodes, but it cannot follow a
trend beyond the data either. And its predictions are steps, so a small change in rainfall can jump the
prediction. Ensembles of trees (random forests, gradient boosting) smooth this out; they come in a later topic.

## What it costs in interpretability

| Model | Fits curves / interactions | Explaining it |
|---|---|---|
| Linear | No | One number per feature |
| Polynomial, degree 2 | Curves; interactions if added | Peak at −b1/2b2; coefficients no longer standalone |
| Polynomial, high degree | Anything inside the range | Effectively a black box; wild outside |
| Shallow tree | Steps, interactions automatically | A handful of if-then rules |
| Deep tree | Anything, including noise | Hundreds of rules nobody reads |

Pick the simplest model whose CV error is close to the best. "Degree 2: peak at 970 mm, MAE 0.47" may be worth
more to a farmer than "degree 10: MAE 0.39".`,
    mcqs: [
      mcq('Why is a model with x and x² as features still called linear regression?', [
        ['It is linear in its coefficients, even though it curves in x', true],
        ['The x² term is ignored when the model makes its predictions', false],
        ['It only fits curves that are close to being straight lines', false],
        ['scikit-learn approximates the curve with many short straight lines', false],
      ], 'The model is b0 + b1·x + b2·x²: a weighted sum of columns. Least squares solves it exactly as before; only the columns changed.'),
      mcq('A degree-10 polynomial has the best CV error on rainfall from 369 to 1,499 mm but predicts 814 t/ha at 2,000 mm. What is the correct conclusion?', [
        ['High-degree polynomials are unreliable outside the training range', true],
        ['The model is overfitting, because its CV error is the lowest found', false],
        ['Maize yields really do rise sharply when rainfall exceeds 1,500 mm', false],
        ['The features were not scaled, which explains the extreme prediction', false],
      ], 'Inside the data the curve is constrained; outside it, x¹⁰ dominates and the prediction explodes. Never let such a model extrapolate.'),
      mcq('An unlimited-depth regression tree has train MAE 0.034 and CV MAE 0.478, while depth 5 has 0.255 and 0.430. Which should you choose?', [
        ['Depth 5, since its cross-validated error is the lower of the two', true],
        ['Unlimited depth, since its training error is far lower than depth 5', false],
        ['Unlimited depth, because more leaves always capture more of the signal', false],
        ['Neither, as tree models cannot be used to predict a continuous target', false],
      ], 'The unlimited tree memorises the training rows. Model choice follows the cross-validated error, not the training error.'),
    ],
    checkpoint: [
      mcq('What does an interaction feature such as rain × fertiliser let a linear model do?', [
        ['Let the effect of fertiliser depend on how much rain there was', true],
        ['Remove fertiliser\'s effect whenever rainfall is below average', false],
        ['Fit rainfall as a curve rather than as a straight line', false],
        ['Reduce the multicollinearity between rain and fertiliser', false],
      ], 'With a product term, the slope for fertiliser becomes b_fert + b_inter × rain, so it changes with rainfall.'),
      mcq('What does a regression tree predict for a rainfall value beyond the largest one it was trained on?', [
        ['The mean of the edge leaf — a constant, whatever the value', true],
        ['A straight-line continuation of the trend in its last leaves', false],
        ['An error, since trees refuse inputs outside the training range', false],
        ['A value chosen at random from the training targets of that leaf', false],
      ], 'Every input lands in some leaf, and a leaf predicts its training mean. Beyond the range the tree flattens out; it never extrapolates a trend.'),
      mcq('A straight line has CV MAE 1.33 t/ha on yield vs rainfall, and a degree-2 fit 0.49. What was the straight line suffering from?', [
        ['High bias — it cannot bend, so more data would not help it', true],
        ['High variance — it changes too much from sample to sample', false],
        ['Data leakage — the target has crept into the rainfall feature', false],
        ['Too much regularisation — its coefficients were shrunk to zero', false],
      ], 'Yield peaks and falls; a line cannot represent that whatever the sample size. That is underfitting (bias), fixed by a more flexible model.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_DEBUGGING',
    notes: `A broken regression model rarely crashes. It produces a number — often a very good-looking number. Below
are eight faults from real projects: the symptom you see, the cause, and the fix. The numbers come from the
\`make_houses()\` listings (seed 42) and the eight Whitefield flats used earlier in this topic.

## 1. The scaler that saw the test set

**Symptom:** a notebook does \`X = StandardScaler().fit_transform(X)\` on all 600 rows, then splits and trains.
The test score is fine. Months later, in production, the error is worse than reported.
**Cause:** the scaler's mean and standard deviation were computed using the test rows, so a little information
about the test set reached training. With a scaler the effect is often small; with imputers, target encoders or
feature selection fitted the same way it can be large — and the habit is the bug.
**Fix:** split first. Put every learned preprocessing step in a \`Pipeline\` so that \`fit\` touches only training
data and cross-validation refits it inside each fold.

## 2. A feature computed from the target

**Symptom:** adding one column, \`price_per_sqft\`, lifts test R² of the numeric-only model from **0.465 to
0.945**. The team celebrates.
**Cause:** \`price_per_sqft\` is price ÷ area. It contains the answer. When the model predicts a new listing,
its price per sq ft is unknown — that is the thing being predicted.
**Fix:** for every feature ask "would I know this value at the moment I make the prediction?" Drop it. If the idea
is "how expensive is this locality", compute the locality's median rate from **training rows only** (or inside CV
folds) and use that.

## 3. Test score better than train

**Symptom:** train R² 0.89, test R² 0.93. "The model generalises better than it learns?"
**Cause:** usually luck with a small test set. Taking 120 listings, an 18-row test set and 200 different random
splits, test R² ranged from **0.70 to 0.93** (5th–95th percentile) and beat train R² in **21.5%** of splits. Other
causes: an easier test set (a time split where the latest months had less variety), duplicates of training rows
in the test set (see fault 8), or regularisation that makes the training fit deliberately worse.
**Fix:** use cross-validation and report the mean and spread across folds; check the test set's target
distribution against training; check for duplicates. One lucky split is not evidence.

## 4. Different columns at predict time

**Symptom:** training works. Pricing one new listing fails:

    X = pd.get_dummies(df[num + ["locality"]], columns=["locality"], dtype=int)
    m = LinearRegression().fit(X, df["price_lakh"])
    new = pd.DataFrame({"area_sqft": [1200], "bhk": [2], "bath": [2], "age_years": [5],
                        "dist_metro_km": [1.5], "locality": ["HSR Layout"]})
    m.predict(pd.get_dummies(new, columns=["locality"], dtype=int))

    ValueError: The feature names should match those that were passed during fit.
    Feature names seen at fit time, yet now missing:
    - locality_Electronic City
    - locality_Hebbal
    ...

**Cause:** \`pd.get_dummies\` creates columns from the values it sees. One row has one locality, so one dummy
column. Worse: if you pass NumPy arrays instead of DataFrames there is no name check, and a mismatched column
order gives silently wrong predictions.
**Fix:** \`OneHotEncoder(handle_unknown="ignore")\` inside a pipeline. It learns the categories at \`fit\` and
produces the same columns for any input; an unseen locality becomes all zeros instead of an error.

## 5. Gradient descent that diverges

**Symptom:** a hand-written gradient descent on the raw Whitefield areas prints w = 18,416 after one step,
−4.8 × 10⁹ after two, about 8.7 × 10²⁵ after five, then \`inf\` and \`nan\`.
**Cause:** the learning rate (0.1) is far too large for a feature measured in hundreds of square feet; each step
overshoots the minimum by more than the last. The sign flipping every step is the giveaway.
**Fix:** standardise the features (the same rate then converges in about 50 steps), or reduce the learning rate by
orders of magnitude. Always print the loss for the first few steps — it must go down.

## 6. R² negative on the test set

**Symptom:** a model trained on Whitefield, Electronic City, Yelahanka, Marathahalli and Hebbal listings is tested
on Indiranagar and Koramangala: **R² −1.232**, MAE 64.66 lakh. Mean prediction ₹66.8 lakh, mean actual ₹131.4 lakh.
**Cause:** the test data comes from a different population. The model never saw a central locality and has no
locality feature, so it prices a Koramangala flat like a Whitefield one. Predicting the test mean would have
done better — that is what negative R² means.
**Fix:** make training data represent where the model will be used, add the feature that explains the difference
(locality), and if the model must cover new localities, test exactly that with a group split and report it
separately.

## 7. An error in the wrong units

**Symptom:** the report says "MAE 0.10" for a model whose target was log(price). A reviewer asks "0.10 what?"
**Cause:** the metric was computed on the log scale. 0.10 in log terms is roughly a 10% miss; on the rupee scale
the same model's MAE is 8.77 lakh.
**Fix:** back-transform predictions before computing business metrics, or wrap the model in
\`TransformedTargetRegressor(func=np.log, inverse_func=np.exp)\` so \`predict\` returns rupees.

## 8. The same flat in train and test

**Symptom:** test MAE is suspiciously low, and the error on genuinely new listings is much worse.
**Cause:** property portals list the same flat several times (three brokers, a relisting at a new price). Exact
or near duplicates land on both sides of a random split, so the model is "tested" on flats it has memorised.
**Fix:** de-duplicate (same society, area, floor, bhk) before splitting, or split by property with
\`GroupShuffleSplit\` / \`GroupKFold\` so every listing of one flat is on the same side.

## The order of checks when a regression score looks too good — or too bad

1. Every feature available at prediction time? 2. Split before any fitting; all preprocessing in a pipeline?
3. Duplicates or groups across the split? 4. Train and test from the same population? 5. Metric on the right
scale, next to a baseline? 6. CV spread, not one split.`,
    mcqs: [
      mcq('Adding price_per_sqft as a feature lifts test R² from 0.465 to 0.945. What is the fault?', [
        ['The feature is computed from the price, so the target leaks into it', true],
        ['The model is now underfitting, so R² should have gone down instead', false],
        ['The new feature has a different scale and should have been standardised', false],
        ['Nothing — the feature captures how expensive the locality is, as intended', false],
      ], 'Price per sq ft is price ÷ area, unknowable when pricing a new listing. A locality-level rate computed from training rows only is the legitimate version.'),
      mcq('Gradient descent on raw areas prints w = 18,416, then −4.8 × 10⁹, then larger values with alternating signs. What is the likeliest cause?', [
        ['The learning rate is too large for features on this scale', true],
        ['The model needs many more iterations before it settles down', false],
        ['The intercept was left out of the gradient calculation', false],
        ['The loss function should be MAE instead of the squared error', false],
      ], 'Growing values that flip sign mean every step overshoots the minimum by more than the last. Standardise the feature or shrink the learning rate.'),
      mcq('A model trained only on outer-ring localities scores R² −1.23 on Indiranagar and Koramangala listings. What does the negative value tell you?', [
        ['It predicts worse there than simply using the test set\'s mean price', true],
        ['The model has a sign error, so its predictions should be negated', false],
        ['The test set is too small for R² to be computed reliably at all', false],
        ['The model is overfitting the central localities it was trained on', false],
      ], 'Negative R² means the squared error exceeds that of a constant at the test mean. The model was applied to a population it never saw, without the feature that explains the difference.'),
      mcq('Pricing a single new listing fails with "Feature names seen at fit time, yet now missing" after pd.get_dummies. What is the robust fix?', [
        ['Use OneHotEncoder(handle_unknown="ignore") inside the fitted pipeline', true],
        ['Call pd.get_dummies on the new row with drop_first=True instead', false],
        ['Convert both inputs to NumPy arrays so the names are not checked', false],
        ['Retrain the model each time a listing with a previously unseen locality arrives', false],
      ], 'The encoder must learn its categories at fit and reproduce the same columns at predict time. Stripping names to NumPy would hide the mismatch and give wrong predictions silently.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_PRACTICE',
    notes: `Six exercises. Do each one before reading its answer — on paper where it says so, in a notebook otherwise.
Every answer was computed with scikit-learn 1.9.

## Exercise 1 — A line by hand

A cloud-kitchen in Hyderabad logs distance and delivery time for five orders:

    km      1   2   3   4   5
    minutes 14  19  21  27  29

On paper: the least-squares slope and intercept, the prediction for 6 km, and whether you trust it.

**Answer.** x̄ = 3, ȳ = 22. Σ(x − x̄)(y − ȳ) = 38, Σ(x − x̄)² = 10, so **slope = 3.8 min per km** and **intercept = 22 −
3.8 × 3 = 10.6 min** (fixed time: cooking, pickup, the last walk to the door). At 6 km: 10.6 + 3.8 × 6 = **33.4
minutes**. R² = 0.976. Six km is just outside the data (1–5 km), so it is a mild extrapolation: reasonable, but
longer trips may cross a busy junction the data never saw. Check with \`LinearRegression\` — it gives 3.8 and 10.6.

## Exercise 2 — Read a log model

A log(price) model of Bengaluru flats has these coefficients (Electronic City is the baseline locality):
age_years −0.0092, dist_metro_km −0.0280, locality_Koramangala 0.8542, locality_HSR Layout 0.6747. Write one
sentence for each.

**Answer.** Holding the other features fixed: each year of age goes with about **0.9% lower** price (ten years:
e^−0.092 − 1 = −8.8%); each km from the metro with about **2.8% lower**; Koramangala listings are priced **135%
higher** than comparable Electronic City ones (e^0.854 − 1); HSR Layout **96% higher**. Use e^c − 1 for large
coefficients — 0.854 is not "85%".

## Exercise 3 — Metrics by hand

A supermarket chain forecasts weekly sales (₹ thousand) for six stores:

    actual    [120,  95, 150,  80, 110, 135]
    predicted [112, 101, 139,  88, 118, 130]

Compute MAE, RMSE, R² and MAPE, then write one line for the regional manager.

**Answer.** Errors −8, +6, −11, +8, +8, −5. **MAE = 46 / 6 = 7.67**; squared errors sum to 374, so **RMSE = √62.33 =
7.90**; **R² = 0.887**; **MAPE = 6.9%**. RMSE is close to MAE, so there is no single huge miss. "Store forecasts are
typically within ₹7,700 a week, about 7%."

## Exercise 4 — A pipeline with a tuned penalty

Using \`make_houses()\` plus the 20 amenity flags from the regularisation unit, train on the 160-row sample
(\`df.sample(160, random_state=1)\`): \`StandardScaler\` on numeric columns, \`OneHotEncoder(handle_unknown="ignore")\`
on locality, \`RidgeCV(alphas=np.logspace(-3, 3, 13))\`, target log price. Report the chosen α and the test MAE in
lakh, and compare with plain OLS.

**Answer.** RidgeCV picks **α = 0.1**; test MAE **12.00 lakh** against OLS's **12.01**. With 160 rows for 33
columns, regularisation barely matters — the unit's table showed it matters at 50 rows (13.84 → 13.34 for ridge,
12.24 for lasso). Reporting "no improvement" honestly is a correct answer.

## Exercise 5 — Choose a degree

The crop-yield comparison gave CV MAE 1.330 (degree 1), 0.492 (degree 2), 0.492 (degree 3) and 0.363 (degree 10);
degree 10 predicts 814 t/ha at 2,000 mm. Which model would you give an agricultural extension team, and why?

**Answer.** There is no single right answer, but there is a wrong one: shipping degree 10 unguarded. A defensible
choice: **degree 2** — within 0.13 t/ha of the best CV error, its peak (970 mm) is a sentence agronomists can use,
and its failure outside the range (negative yields below about 325 mm and above about 1,615 mm) is easy to guard with a rule that refuses
inputs outside 369–1,499 mm. If accuracy matters most, degree 10 or a depth-5 tree (CV 0.430) **with the same
range guard**.

## Exercise 6 — Find the leaks

A food-delivery company wants to predict delivery time when the order is placed. The proposed features:
\`distance_km\`, \`restaurant_avg_prep_min\` (last 30 days), \`order_hour\`, \`is_raining\`, \`rider_rating\`,
\`time_on_road_min\` (pickup to drop), \`customer_rating_given\`. Which must go?

**Answer.** **time_on_road_min** is most of the target itself and is only known after delivery; **customer_rating_given**
is recorded after delivery and is itself influenced by lateness. Both leak. \`rider_rating\` is a trap too if the
rider is assigned after the order is placed — at prediction time you may not know who will deliver. The rest are
known when the order is placed.`,
    mcqs: [
      mcq('In Exercise 1 (km 1–5, minutes 14, 19, 21, 27, 29), what are the slope and intercept?', [
        ['3.8 min per km and 10.6 min', true],
        ['3.8 min per km and 22.0 min', false],
        ['4.4 min per km and 10.6 min', false],
        ['3.0 min per km and 13.0 min', false],
      ], 'Slope = 38 / 10 = 3.8; intercept = ȳ − slope × x̄ = 22 − 3.8 × 3 = 10.6. The 22.0 is the mean of y, not the intercept.'),
      mcq('In Exercise 2, a log-price model gives Koramangala a coefficient of 0.854 against Electronic City. Which reading is correct?', [
        ['About 135% higher price than a comparable Electronic City flat', true],
        ['About 85% higher price than a comparable Electronic City flat', false],
        ['About ₹0.85 lakh more than a comparable Electronic City flat', false],
        ['About 8.5% higher price than a comparable Electronic City flat', false],
      ], 'The factor is e^0.854 = 2.35, i.e. 135% higher. The "coefficient × 100%" shortcut is only accurate for small coefficients.'),
      mcq('In Exercise 3 the store errors are −8, +6, −11, +8, +8 and −5 (₹ thousand). What are MAE and RMSE?', [
        ['MAE 7.67 and RMSE 7.90', true],
        ['MAE 0.33 and RMSE 7.90', false],
        ['MAE 7.67 and RMSE 62.33', false],
        ['MAE 7.90 and RMSE 7.67', false],
      ], 'MAE = 46 / 6 = 7.67. RMSE = √(374 / 6) = √62.33 = 7.90. 0.33 is the mean signed error and 62.33 is the MSE.'),
      mcq('In Exercise 4, RidgeCV on 160 rows gives test MAE 12.00 lakh against OLS\'s 12.01. What should the write-up say?', [
        ['Regularisation made no real difference at this size of training set', true],
        ['Ridge is better, so it should be used, as it has the lower test error', false],
        ['The experiment failed, because ridge should always beat plain OLS', false],
        ['The α grid was wrong, as ridge must improve the error by at least 5%', false],
      ], 'A 0.01-lakh difference is noise. Regularisation helps when rows per feature are scarce; reporting a null result honestly is the professional answer.'),
      mcq('In Exercise 6, which proposed feature for predicting delivery time at order placement leaks the target?', [
        ['time_on_road_min, measured from pickup to drop', true],
        ['restaurant_avg_prep_min over the last 30 days', false],
        ['order_hour, taken from the order timestamp', false],
        ['is_raining, from a weather feed at order time', false],
      ], 'Time on the road is known only after delivery and is most of the delivery time itself. The others are known when the order is placed.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_INTERVIEW_QUESTION',
    notes: `Regression is the first technical topic in most entry-level data-science interviews — at product companies,
banks' analytics teams and consultancies alike. Interviewers are not testing whether you can call \`.fit()\`;
they want to hear that you know what the numbers mean and when they lie. Three questions, model answers and the
follow-ups that come after a good answer.

## 1. "What are the assumptions of linear regression, and how do you check them?"

**Model answer.** "The main ones are: the relationship between the features and the mean of the target is linear;
the errors are independent; they have constant variance; and no feature is a perfect linear combination of
others. Normality of errors matters only for p-values and confidence intervals, not for the fit itself.

I check them with residuals. Residuals against fitted values should look like a shapeless band — a curve means
non-linearity, a funnel means non-constant variance. For independence I think about how the data was collected:
time series or repeated measurements of the same flat break it. For multicollinearity I look at correlations and
VIFs. In a Bengaluru house-price model, for example, residuals fanned out from about 8 lakh to 21 lakh as prices
rose, and modelling log price fixed both the funnel and the curve."

**Follow-ups:**
- *"If the assumptions fail, is the model useless?"* Not for prediction, necessarily — a model with
  heteroscedastic errors can still predict well. What breaks is the uncertainty: intervals and p-values become
  wrong, and coefficients may be biased if linearity fails.
- *"What does multicollinearity do to predictions?"* Little, if new data has the same correlation structure. It
  makes individual coefficients unstable and hard to interpret — signs can flip.

## 2. "When would you use ridge versus lasso?"

**Model answer.** "Both add a penalty on coefficient size to reduce variance. Ridge uses the sum of squared
coefficients: it shrinks everything smoothly, never to exactly zero, and handles correlated features well by
sharing weight between them. Lasso uses the sum of absolute values, which sets some coefficients exactly to zero,
so it doubles as feature selection — but with correlated features it tends to pick one arbitrarily, and which one
can change with the sample. Elastic net mixes the two.

I'd standardise first, because the penalty compares coefficient sizes, and choose alpha by cross-validation on a
log grid. And I'd expect the gain to depend on data size: in one experiment, with 50 rows and 33 features, lasso cut
error by 12% versus OLS; with 400 rows the three were within 2%."

**Follow-ups:**
- *"Why is lasso able to produce zeros and ridge not?"* The L1 penalty has a sharp corner at zero; the optimum
  often lands on it. The L2 penalty is smooth there, so the optimum approaches zero but does not reach it.
- *"How does regularisation relate to bias and variance?"* Larger alpha increases bias and reduces variance; CV
  finds the alpha that minimises their sum in validation error.

## 3. "Your house-price model has an R² of 0.95 on the test set. The PM is delighted. What do you check?"

**Model answer.** "First, leakage: is every feature known when we'd price a listing? Something like price per
square foot, or a 'final negotiated price' column, would explain a suspiciously high R². Second, duplicates: the
same flat listed by several brokers can sit in both train and test. Third, whether the test set looks like
production — if we'll price listings next quarter, a time-based split is more honest than a random one, and if
we'll price new localities, a group split by locality. Fourth, the metric in rupees: R² 0.95 could still mean a
₹15-lakh typical error on expensive flats, so I'd report MAE overall and by price band, next to a baseline like
the locality median. If all that holds up, then it's genuinely good."

**Follow-ups:**
- *"Why isn't R² enough?"* It is relative to the spread of the target — a city-wide dataset with prices from 20
  lakh to 5 crore gives a high R² to a model with large rupee errors. Stakeholders need error in rupees.
- *"How would you give a range rather than a single price?"* Quantile regression, or the spread of residuals by
  segment — e.g. "within ±10% for most mid-segment flats".

## How to answer regression questions well

Name the concept, say what it protects or costs, and attach one concrete number from a project. "Lasso zeroes
coefficients" is textbook; "lasso kept a noise feature and dropped a real one at α = 0.05 on 160 rows, so I treat
its zeros as a shortlist" tells the interviewer you have done it.`,
    mcqs: [
      mcq('An interviewer asks which linear-regression assumption matters only for p-values and intervals, not for the fit. Which is it?', [
        ['Normally distributed errors', true],
        ['Linearity of the relationship', false],
        ['Independence of the errors', false],
        ['No perfect multicollinearity', false],
      ], 'Least squares fits the line without assuming normality; normal errors are what make the classical t-tests and intervals exact. Linearity failures bias the fit itself.'),
      mcq('In the ridge-versus-lasso answer, what is the strongest reason to prefer ridge?', [
        ['Many useful, correlated features that should all keep some weight', true],
        ['A need for a model with exactly zero weight on most of the features', false],
        ['A dataset with far more rows than features, and no correlation', false],
        ['Features on different scales that cannot be standardised first', false],
      ], 'Ridge shares weight across correlated features and keeps all of them. Sparse models are lasso\'s job, and both need standardised features.'),
      mcq('A house-price model shows test R² 0.95. Which check should come first?', [
        ['Whether every feature is known at the time a listing is priced', true],
        ['Whether a degree-3 polynomial would raise R² even further', false],
        ['Whether the R² on the training set is higher than 0.95 too', false],
        ['Whether the model\'s coefficients are all statistically significant', false],
      ], 'A suspiciously high score is first a leakage question. Duplicates, the split design and errors in rupees come next.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_MINI_PROJECT',
    notes: `# Mini Project — Predicting House Prices in Bengaluru

A proptech start-up shows buyers an "estimated fair price" next to every listing. You are the data scientist
building the first model. You will clean a messy listings export, build features, compare a baseline, a
regularised linear model and a tree model inside pipelines with cross-validation, and report the test error in
rupees with the features that drive price.

## The data

Generate it with this script (seed fixed, so everyone gets the same 3,240 rows). It contains the kinds of
problems a real portal export has; finding them is part of the project.

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2024)
    n = 3200
    rates = {"Whitefield": 6800, "Electronic City": 5200, "Koramangala": 12500, "Indiranagar": 14000,
             "HSR Layout": 10500, "Yelahanka": 5800, "Hebbal": 8200, "Marathahalli": 7200,
             "Sarjapur Road": 7600, "JP Nagar": 9800, "Rajajinagar": 11000, "Bannerghatta Road": 7900}
    loc = rng.choice(list(rates), n)
    bhk = rng.choice([1, 2, 3, 4, 5], n, p=[0.12, 0.43, 0.33, 0.10, 0.02])
    area = np.round(bhk * 430 + rng.normal(180, 120, n)).clip(350, None)
    bath = np.clip(bhk + rng.choice([-1, 0, 0, 1], n), 1, None)
    balcony = rng.choice([0, 1, 2, 3], n, p=[0.15, 0.40, 0.35, 0.10])
    age = rng.integers(0, 30, n)
    dist = np.round(rng.gamma(2.0, 1.5, n), 1)
    ready = rng.choice(["Ready To Move", "Under Construction"], n, p=[0.8, 0.2])
    age = np.where(ready == "Under Construction", 0, age)
    rate = np.array([rates[l] for l in loc])
    price = (area * rate / 1e5 * (1 - 0.007 * age) * (1 - 0.025 * np.minimum(dist, 10))
             * np.where(ready == "Under Construction", 0.92, 1.0) * rng.lognormal(0, 0.13, n))

    df = pd.DataFrame({
        "listing_id": [f"BLR{i:05d}" for i in range(1, n + 1)],
        "locality": loc,
        "size": [f"{b} BHK" for b in bhk],
        "total_sqft": area.astype(int).astype(str),
        "bath": bath.astype(float),
        "balcony": balcony.astype(float),
        "age_years": age,
        "dist_metro_km": dist,
        "availability": ready,
        "listed_on": pd.to_datetime("2025-01-01") + pd.to_timedelta(rng.integers(0, 365, n), unit="D"),
        "price_lakh": np.round(price, 1),
    })
    df["price_per_sqft"] = np.round(df["price_lakh"] * 1e5 / area).astype(int)

    # The mess a real listings export has
    rng2 = np.random.default_rng(7)
    i = rng2.choice(n, 90, replace=False)
    df.loc[i[:60], "total_sqft"] = [f"{int(a) - 100} - {int(a) + 100}" for a in area[i[:60]]]
    df.loc[i[60:], "total_sqft"] = [f"{round(a / 10.764, 1)}Sq. Meter" for a in area[i[60:]]]
    df.loc[rng2.choice(n, 140, replace=False), "bath"] = np.nan
    df.loc[rng2.choice(n, 260, replace=False), "balcony"] = np.nan
    df.loc[rng2.choice(n, 25, replace=False), "locality"] = df["locality"].str.lower().str.strip() + " "
    typo = rng2.choice(n, 12, replace=False)
    df.loc[typo, "price_lakh"] = df.loc[typo, "price_lakh"] * 100
    df = pd.concat([df, df.sample(40, random_state=3)]).sample(frac=1, random_state=4).reset_index(drop=True)
    df.to_csv("blr_listings.csv", index=False)

**Work from \`blr_listings.csv\` as if a portal had sent it.** The generator shows how it was made, but your notebook
must detect each problem from the data.

| Column | Type | Meaning |
|---|---|---|
| listing_id | text | Portal's listing ID |
| locality | text | One of 12 Bengaluru localities — spelling and case are not guaranteed |
| size | text | "2 BHK" etc. |
| total_sqft | text | Built-up area in sq ft — usually a number, sometimes a range or another unit |
| bath, balcony | number | Counts; some missing |
| age_years | integer | Years since completion (0 for under-construction) |
| dist_metro_km | number | Distance to the nearest metro station |
| availability | text | Ready To Move or Under Construction |
| listed_on | date | Date the listing went live (2025) |
| price_lakh | number | Asking price in ₹ lakh — **the target**; check its units |
| price_per_sqft | integer | ₹ per sq ft, computed by the portal from the price |

## Tasks

1. **Audit and clean.** Duplicates, the units of \`total_sqft\` (convert ranges to their midpoint and square metres
   to square feet), locality spelling, \`size\` → a number, missing values, impossible prices. Write down every
   rule and how many rows it touched. Decide what to do with \`price_per_sqft\` and say why.
2. **Split.** Hold out a test set before any modelling. Justify random vs time-based (\`listed_on\`) splitting for a
   product that prices *new* listings, and choose.
3. **Features.** At least: area, bhk, bath, balcony (imputed inside the pipeline), age, metro distance,
   availability, locality (one-hot). Add at least one feature of your own (e.g. sq ft per bedroom) and say whether it
   helped.
4. **Baseline.** Predict the training median price of the listing's locality. Report its MAE in ₹ lakh.
5. **Models in pipelines.** (a) a regularised linear model — ridge, lasso or elastic net — on log price, α chosen by
   CV; (b) a decision-tree regressor with depth chosen by CV. Compare them and the baseline with 5-fold CV on the
   training set (mean and spread of MAE in ₹ lakh).
6. **Test once.** Evaluate the chosen model on the test set: MAE, RMSE and MAPE in rupee terms, R², and MAE by price
   band (under ₹60 lakh, ₹60 lakh–1 crore, over ₹1 crore).
7. **What drives price.** From the linear model, the five most important effects in plain language ("each km from
   the metro: about −x%"). From the tree, its top three splits. Where do they agree?
8. **Limits.** Where is the model weakest, and which listings should it refuse to price?

## Deliverables

1. **\`house_prices.ipynb\`** — runs top to bottom after "Restart & Run All"; sections for audit, cleaning, split,
   baseline, models, test, interpretation.
2. **\`model_card.md\`** (one page) — what the model predicts, the data, the test error in ₹ overall and by band,
   the top drivers, known limits and listings it should not price.
3. **\`README.md\`** — how to generate the data and run the notebook; library versions.

## Acceptance criteria

- Every cleaning rule is stated with the number of rows it affected; the 40 duplicates and the 12 prices entered
  in the wrong unit are found from the data, not from the generator.
- \`price_per_sqft\` is not used as a feature, and the notebook says why.
- All preprocessing (imputation, scaling, encoding) is inside a \`Pipeline\`/\`ColumnTransformer\`; the test set is
  used exactly once, at the end.
- α and tree depth are chosen by cross-validation on the training data; the CV results table shows mean and
  standard deviation.
- The linear model is trained on log price and every reported error is in ₹ lakh on the original scale.
- The final model beats the locality-median baseline on CV, and the report says by how much.
- Coefficients are interpreted as percentages with "holding the other features fixed"; no causal claims.`,
    mcqs: [
      mcq('The listings export has a price_per_sqft column computed by the portal. What should the project do with it?', [
        ['Leave it out of the features, as it is derived from the target price', true],
        ['Use it as the strongest feature, as it captures location and quality', false],
        ['Standardise it first, and then let the lasso decide whether to keep it', false],
        ['Use it as the target instead, since it is less skewed than the price', false],
      ], 'It is price ÷ area, unknown for a listing being priced. A locality-level rate computed from training rows is the legitimate way to capture what it seems to offer.'),
      mcq('Twelve listings have prices about 100 times their neighbours (thousands of "lakh" for an ordinary flat). What is the right way to handle them?', [
        ['Detect them with a rule, decide to fix or drop, and record the count', true],
        ['Keep them as they are, as they are real listings on the portal', false],
        ['Rely on a log transform of the target to make them harmless', false],
        ['Drop the top 1% of prices in the data without looking at them', false],
      ], 'A unit error is a data-entry problem, not a real price. State a rule (e.g. price per sq ft far above the locality range), apply it, and report how many rows it touched.'),
    ],
    assignment: {
      title: 'Predicting House Prices in Bengaluru',
      description: 'Clean a messy listings export, build a locality-median baseline, a regularised linear model and a tree in pipelines, compare them with cross-validation, and report the test error in rupees with the drivers of price.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`house_prices.ipynb\` — generates the data with the brief's script, then: audit and cleaning (each rule with its
   row count), a justified train/test split, the locality-median baseline, a regularised linear model on log price
   and a decision-tree regressor in pipelines with CV-chosen hyperparameters, a CV comparison table, one final test
   evaluation (MAE, RMSE, MAPE in ₹, R², MAE by price band) and the interpretation. It must run top to bottom after
   "Restart & Run All".
2. \`model_card.md\` — one page: purpose, data, test error overall and by band, top drivers in plain language,
   limits and the listings the model should refuse to price.
3. \`README.md\` — how to run it and the library versions (pandas, NumPy, scikit-learn).

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Duplicates removed: 40", "Baseline CV MAE: … lakh; final model: … lakh").`,
      rubric: [
        { criterion: 'Cleaning and audit', description: 'Duplicates, area units and ranges, locality spelling, size, missing values and the mis-scaled prices are each detected from the data and handled by a stated rule with its row count; price_per_sqft is excluded with a reason.', maxPoints: 25 },
        { criterion: 'Honest evaluation', description: 'Test set held out before modelling with a justified split; all preprocessing inside pipelines; hyperparameters chosen by CV on training data; the test set is used once.', maxPoints: 25 },
        { criterion: 'Models and comparison', description: 'Locality-median baseline, a regularised linear model on log price and a tuned tree, compared by CV (mean and spread) with errors in ₹ lakh on the original scale.', maxPoints: 20 },
        { criterion: 'Interpretation and limits', description: 'Drivers stated as percentages holding other features fixed, tree splits read as rules, error by price band, and clear statements of where the model is weak or should not be used.', maxPoints: 20 },
        { criterion: 'Reproducibility and communication', description: 'Notebook regenerates the data and runs top to bottom; one-page model card a product manager can read; README with versions.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_REGRESSION_CHECKPOINT',
    notes: `Ten questions across the topic: least squares, several features and their assumptions, regularisation,
metrics, and non-linear models. Several give numbers — work them out before you look at the options.`,
    checkpoint: [
      mcq('Five points have x̄ = 4, ȳ = 30, Σ(x − x̄)(y − ȳ) = 60 and Σ(x − x̄)² = 20. What is the least-squares line?', [
        ['y = 18 + 3x', true],
        ['y = 30 + 3x', false],
        ['y = 26 + 1x', false],
        ['y = 12 + 4.5x', false],
      ], 'Slope = 60 / 20 = 3; intercept = ȳ − slope × x̄ = 30 − 12 = 18. The line always passes through the point of means.'),
      mcq('In a model with area and bhk, the bhk coefficient is negative although bhk alone has a positive one. Area and bhk correlate at 0.95. What is the best response?', [
        ['Read bhk as "more bedrooms in the same area"; consider ridge or sq ft per bedroom', true],
        ['Remove area from the model, since the coefficient on bhk must be positive', false],
        ['Report that additional bedrooms reduce the price of a flat in Bengaluru', false],
        ['Retrain with a different random seed until both coefficients are positive', false],
      ], 'With overlapping features each coefficient answers a narrower question and is unstable. Ridge shares weight between them; a ratio feature removes the overlap.'),
      mcq('A log-price model gives the "Under Construction" flag a coefficient of −0.083. What does that mean?', [
        ['Under-construction flats are priced about 8% lower, other features equal', true],
        ['Under-construction flats are priced ₹0.083 lakh lower, other features equal', false],
        ['Under-construction flats are priced about 83% lower, other features equal', false],
        ['8.3% of the price variation is explained by construction status alone', false],
      ], 'With a log target, e^−0.083 ≈ 0.92, an 8% lower price holding the other features fixed.'),
      mcq('Why is a StandardScaler placed before Lasso in the pipeline?', [
        ['So the penalty treats every feature by usefulness, not by its units', true],
        ['So that Lasso can converge at all, since it fails on any unscaled feature', false],
        ['So that the predictions become identical to those of plain OLS', false],
        ['So that every coefficient comes out between −1 and 1 after fitting', false],
      ], 'The penalty acts on coefficient sizes, which depend on units. Scaling puts features on a common footing so shrinkage reflects usefulness.'),
      mcq('Cross-validated MAE for lasso is lowest at the largest α in your grid. What should you do?', [
        ['Extend the grid to larger α values and search again', true],
        ['Use the largest α in the grid, as the CV has spoken', false],
        ['Use the smallest α in the grid, to be conservative', false],
        ['Pick α using the test set, which is more reliable', false],
      ], 'An optimum at the edge of the grid may lie beyond it. Extend on the log scale until the best value is inside the grid.'),
      mcq('Delivery errors are −2, +3, −1, +2 and −12 minutes. Which statement is right?', [
        ['MAE is 4 and RMSE is about 5.7, pulled up by the 12-minute miss', true],
        ['MAE is −2 and RMSE is about 5.7, so the model is biased early', false],
        ['MAE is 4 and RMSE is 4, as both average the size of the misses', false],
        ['MAE is 5.7 and RMSE is 4, as squaring shrinks the large errors', false],
      ], 'MAE = 20 / 5 = 4. RMSE = √(162 / 5) = √32.4 ≈ 5.69 — about 5.7; the single large miss dominates the squared sum. (−2 is the mean signed error.)'),
      mcq('A model shows test MAPE of 64% on SKU-level return forecasts, while MAE is 2.6 units. What is the likely reason?', [
        ['Some SKUs have tiny actual counts, so small misses become huge percentages', true],
        ['The model is badly overfitted, and MAPE is the only metric to reveal it', false],
        ['MAE is wrong, because it should always be larger than MAPE in value', false],
        ['The forecasts are biased high, and MAPE only ever measures bias', false],
      ], 'MAPE divides by the actual value. Actuals of 1 or 2 units turn 2-unit misses into 100–200% errors.'),
      mcq('A degree-2 polynomial on raw rainfall gives yield = −7.44 + 0.02756·rain − 0.0000142·rain². At what rainfall does predicted yield peak?', [
        ['About 970 mm', true],
        ['About 1,940 mm', false],
        ['About 485 mm', false],
        ['About 2,756 mm', false],
      ], 'A parabola b0 + b1x + b2x² peaks at −b1 / (2·b2) = 0.02756 / 0.0000284 ≈ 970 mm.'),
      mcq('A depth-2 regression tree for yield has leaves 1.88, 2.69, 5.52 and 3.20 t/ha. What does it predict for a farm in the 5.52 leaf?', [
        ['5.52 t/ha — the mean yield of the training farms in that leaf', true],
        ['A value on a line fitted through the training farms in that leaf', false],
        ['The weighted average of all four leaves, weighted by their size', false],
        ['5.52 t/ha plus a correction based on the farm\'s exact rainfall', false],
      ], 'A regression tree predicts the training mean of the leaf a row falls into, whatever its exact feature values inside that leaf.'),
      mcq('A model trained on Bengaluru listings from 2025 is used to price listings in 2027. Which risk is greatest?', [
        ['The market has moved, so 2027 data no longer resembles the training data', true],
        ['Regression models cannot predict prices for dates outside their training data', false],
        ['The model will overfit the 2027 listings because they are new to it', false],
        ['The coefficients will change on their own as new listings arrive', false],
      ], 'A fitted model is frozen; prices drift with the market. Monitor errors on recent listings and retrain — the time-split thinking from the workflow topic.'),
    ],
  },

  /* ══ DS_CLASSIFICATION ══════════════════════════════════════════════════════════════════ */

  /* ── LOGISTIC_REGRESSION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_LOGISTIC_REGRESSION',
    notes: `Will this borrower default? Will this customer leave? Classification predicts a category, and logistic
regression is where every data scientist starts: fast, hard to overfit, and every coefficient has a meaning a credit
manager understands. Its real output is not a label but a **probability**, and that is what makes it useful.

## The data used in this topic

An NBFC (non-banking finance company) lending personal loans: 4,000 past loans, simulated with a fixed seed.

    import numpy as np
    import pandas as pd

    def make_loans(n=4000, seed=3, shift=-0.6):
        rng = np.random.default_rng(seed)
        income = np.round(rng.lognormal(np.log(42000), 0.45, n), -2)          # monthly ₹
        credit = np.clip(np.round(rng.normal(715, 60, n)), 300, 900).astype(int)
        emi_ratio = np.round(np.clip(rng.normal(32, 11, n), 5, 75), 1)          # EMI as % of income
        months_emp = rng.integers(1, 180, n)
        prior = rng.choice([0, 1, 2], n, p=[0.85, 0.11, 0.04])
        tier = rng.choice(["Tier 1", "Tier 2", "Tier 3"], n, p=[0.45, 0.35, 0.20])
        z = (-2.0 + shift - 0.018 * (credit - 715) + 0.045 * (emi_ratio - 32) - 0.006 * (months_emp - 90)
             + 0.75 * prior + np.where(tier == "Tier 3", 0.35, 0) - 0.3 * np.log(income / 42000))
        default = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
        return pd.DataFrame({"monthly_income": income.astype(int), "credit_score": credit, "emi_to_income_pct": emi_ratio,
                             "months_employed": months_emp, "prior_defaults": prior, "city_tier": tier, "defaulted": default})

    loans = make_loans()        # (4000, 7), default rate 0.134

## Why not linear regression on 0/1?

A straight line fitted to a 0/1 target predicts 1.3 for a very risky borrower and −0.2 for a safe one: not
probabilities. Logistic regression keeps the linear part but squashes it.

## The sigmoid

The model computes a score — the **log-odds** — exactly like linear regression:

    z = b0 + b1·credit_score + b2·emi_to_income + ...

and turns it into a probability with the **sigmoid**, σ(z) = 1 / (1 + e^(−z)):

    z     −4     −2     −1     0     1      2      4
    σ(z)  0.018  0.119  0.269  0.5   0.731  0.881  0.982

z = 0 is a 50–50 call; every unit of z moves the **odds** (p / (1 − p)) by a factor of e ≈ 2.72. That is the key
to reading the coefficients.

## Log loss: how it is fitted

Least squares would be the wrong loss here. Logistic regression minimises **log loss** (binary cross-entropy):

    log loss = −(1/n) Σ [ y·log(p) + (1 − y)·log(1 − p) ]

Only the probability given to the **true** class matters. Four predictions:

    actual       1      0      0      1
    predicted p  0.90   0.20   0.60   0.05
    loss term    0.105  0.223  0.916  2.996        mean = 1.06

A confident right answer costs almost nothing; a confident wrong one (5% for a borrower who defaulted) costs 2.996
— more than the other three together. Log loss punishes **overconfidence**, which is why its probabilities tend to
be honest. It has no closed form; it is minimised iteratively (scikit-learn's default solver is \`lbfgs\`), using the
gradient Σ (p − y)·x — the same shape as linear regression's.

## Fitting and reading the coefficients

    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split

    num = ["credit_score", "emi_to_income_pct", "months_employed", "prior_defaults"]
    X_tr, X_te, y_tr, y_te = train_test_split(loans[num], loans["defaulted"], test_size=0.25,
                                              random_state=0, stratify=loans["defaulted"])
    clf = LogisticRegression(max_iter=1000).fit(X_tr, y_tr)
    coef = pd.Series(clf.coef_[0], index=num)
    pd.DataFrame({"coef": coef.round(4), "odds_ratio": np.exp(coef).round(3)})

                         coef  odds_ratio
    credit_score      -0.0159       0.984
    emi_to_income_pct  0.0324       1.033
    months_employed   -0.0034       0.997
    prior_defaults     0.8195       2.269

A coefficient is the change in **log-odds** per unit; **e^coef is the odds ratio**, holding the others fixed:

- **prior_defaults 2.269:** each previous default multiplies the odds of defaulting by about 2.3 — it does **not**
  make default 2.3 times as *likely*. Odds and probability differ: odds rising from 0.10 to 0.23 moves the
  probability from 9% to 19%.
- **credit_score 0.984 per point** is easier to say per 50 points: e^(50 × −0.0159) = **0.452** — 50 more points
  roughly halve the odds.
- **emi_to_income_pct:** 10 more percentage points of income going to EMIs multiply the odds by **1.383**.

Note that \`LogisticRegression\` is **regularised by default** (L2, C = 1.0), so coefficients are slightly shrunk;
with standardised features (below) the penalty treats all features alike.

## Probabilities, not just labels

    two = pd.DataFrame({"credit_score": [780, 640], "emi_to_income_pct": [25, 48],
                        "months_employed": [96, 14], "prior_defaults": [0, 1]})
    clf.decision_function(two)          # log-odds: [-3.705  0.36 ]
    clf.predict_proba(two)[:, 1]        # P(default): [0.024 0.589]
    clf.predict(two)                    # [0 1]

\`predict\` just applies a 0.5 cut to \`predict_proba\`. The 0.024 applicant gets an instant approval; the 0.589
applicant is not simply "a 1" — the business can price, cap or review that loan. The thresholds unit makes this a
decision.

## Is it any good?

    test log loss 0.3505   vs always-predict-13.4%: 0.3939
    test accuracy 0.865    vs always-predict-"no":  0.866
    ROC AUC 0.744

Accuracy says the model is **worse than doing nothing**. It is not: it ranks borrowers usefully (AUC 0.744 — a
random defaulter scores higher than a random repayer 74% of the time) and its log loss beats the constant. At a
0.5 cut it simply flags very few loans. Accuracy is the wrong lens for a 13% target; the imbalance and thresholds
units take this apart.

## Scaling and comparing

    pipe = make_pipeline(StandardScaler(), LogisticRegression()).fit(X_tr, y_tr)
    # per standard deviation: credit_score -0.942, emi_to_income_pct 0.352, months_employed -0.172, prior_defaults 0.393

Per standard deviation, credit score is the strongest signal. Scaling also helps the solver converge — on raw
features with large ranges you may see a ConvergenceWarning without \`max_iter\` raised.`,
    workedExample: `**Task: the credit head asks two things about the default model: "What does a prior default do to risk?" and
"Applicant A has a credit score of 700 and EMI at 30% of income; how much does a 50-point higher score help?"**

**1. Translate the coefficient into an odds ratio.** prior_defaults has coefficient 0.8195, so the odds ratio is
e^0.8195 = 2.27. Two prior defaults: e^(2 × 0.8195) = 5.15 times the odds.

**2. Turn odds into probability for a real case** — managers think in probabilities. If a borrower's default
probability is 10%, the odds are 0.10 / 0.90 = 0.111. One prior default: 0.111 × 2.27 = 0.252 odds, so
p = 0.252 / 1.252 = **20%**. "A prior default roughly doubles the risk of a typical applicant" is fair at low
probabilities; at high ones the probability cannot double (from 60% it rises to 77%, not 120%).

**3. Answer the credit-score question with the model, not a rule of thumb.** Fill in the rest of applicant A
(60 months employed, no prior defaults), change only the score and compare:

    a = pd.DataFrame({"credit_score": [700, 750], "emi_to_income_pct": [30, 30],
                      "months_employed": [60, 60], "prior_defaults": [0, 0]})
    clf.predict_proba(a)[:, 1].round(3)       # [0.104 0.05 ]

For an applicant employed 60 months with no prior defaults, risk falls from **10.4% to 5.0%**. The log-odds fall by
50 × 0.0159 = 0.795, so the odds are multiplied by 0.452 — for every applicant. The change in *probability* depends
on the other features, which is why you compute it for the applicant rather than quoting a fixed "x% lower".

**4. Say what it is not.** These are associations in past lending. A borrower who raises their score by 50 points
is not guaranteed the lower risk — the score may have improved for reasons that also changed their behaviour.

**5. The sentence for the credit head.** "Each prior default multiplies the odds of default by about 2.3 — for a
typical 10%-risk applicant, that is about 20%. Fifty extra credit-score points cut the odds by a little over half — for
applicant A, from about 10% to 5%, other factors equal."`,
    mcqs: [
      mcq('A logistic model gives prior_defaults a coefficient of 0.82. What does e^0.82 ≈ 2.27 mean?', [
        ['Each prior default multiplies the odds of default by about 2.27', true],
        ['Each prior default makes default 2.27 times as probable as before', false],
        ['Each prior default adds 2.27 percentage points to the default probability', false],
        ['Borrowers with a prior default have a 2.27% probability of default', false],
      ], 'Logistic coefficients act on log-odds, so e^coef is an odds ratio. Odds and probability only behave alike when probabilities are small.'),
      mcq('Four predictions give P(true class) of 0.90, 0.80, 0.40 and 0.05. Which one contributes most to the log loss?', [
        ['The 0.05 — a confident prediction for the wrong class', true],
        ['The 0.40 — the one closest to the 0.5 decision point', false],
        ['The 0.90 — the one with the highest predicted probability', false],
        ['All four contribute equally, since log loss is an average', false],
      ], 'Each term is −log(probability given to the true class): −log 0.05 ≈ 3.0, far above −log 0.4 ≈ 0.92. Log loss punishes confident mistakes hardest.'),
      mcq('A default model has accuracy 0.865 while always predicting "no default" scores 0.866, yet its AUC is 0.744. What is the right reading?', [
        ['It ranks risk usefully; accuracy at a 0.5 cut hides that on a 13% target', true],
        ['It is useless, because it does not beat the trivial model on accuracy', false],
        ['It is overfitting, which is why accuracy and AUC disagree with each other', false],
        ['AUC must be wrong, as it cannot be high when accuracy is at the baseline', false],
      ], 'With 13% positives, a 0.5 threshold flags few loans, so accuracy barely moves. AUC measures ranking across all thresholds, where the model clearly beats chance.'),
    ],
    checkpoint: [
      mcq('What does the sigmoid function do in logistic regression?', [
        ['Turns the linear score (log-odds) into a probability between 0 and 1', true],
        ['Chooses the features that are most predictive of the positive class', false],
        ['Measures how far each prediction is from its actual 0/1 label', false],
        ['Converts the predicted probability into a 0/1 label at a 0.5 cut', false],
      ], 'σ(z) = 1/(1 + e^−z) maps any real score to (0, 1). Labels come from a threshold applied afterwards; the loss is log loss.'),
      mcq('A borrower\'s log-odds of default is 0. What is the predicted probability?', [
        ['0.5', true],
        ['0.0', false],
        ['1.0', false],
        ['0.27', false],
      ], 'σ(0) = 1 / (1 + 1) = 0.5. Log-odds 0 means odds of 1, an even chance.'),
      mcq('Why is log loss, not squared error, minimised to fit a logistic regression?', [
        ['It rewards honest probabilities and heavily punishes confident mistakes', true],
        ['It has a closed-form solution, so no iterative solver is needed at all', false],
        ['It ignores the probability of the true class and looks only at labels', false],
        ['It always gives higher accuracy than any model fitted on squared error', false],
      ], 'Log loss is the likelihood of the labels under the predicted probabilities. It has no closed form and is minimised iteratively.'),
    ],
  },

  /* ── KNN_NAIVE_BAYES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_KNN_NAIVE_BAYES',
    notes: `Two classifiers built on ideas you already have: **similarity** ("borrowers like this one defaulted") and
**Bayes' rule** from the maths topic ("given these words, how likely is fraud?"). Both are simple, both are
still used, and both fail in ways you must be able to explain.

## k-nearest neighbours

To classify a new row, find the k most similar training rows and let them vote. The predicted probability is the
share of neighbours in the positive class: with k = 25 and 6 defaulters among them, P(default) = 0.24. There is no
training beyond storing the data; all the work happens at prediction time.

### Similarity needs scaling

Similarity is usually Euclidean distance. Take three applicants (income, credit score, EMI %, months employed,
prior defaults):

    a = [42000, 700, 30, 60, 0]
    b = [43000, 610, 55,  6, 2]     # very different risk profile
    c = [52000, 702, 31, 62, 0]     # almost identical to a, earns more

    distance a–b: 1005.8      distance a–c: 10000.0

On raw numbers **b is ten times closer to a than c is**, because ₹1,000 of income outweighs 90 credit points, 25
EMI points and two prior defaults. Income's standard deviation is ₹22,037; credit score's is 59.5. Standardise and
the picture is right: a–b 5.13, a–c 0.47.

    raw kNN (k=25):     test AUC 0.505   — a coin toss, it is matching on income alone
    scaled kNN (k=25):  test AUC 0.686

kNN without scaling is the classic broken pipeline: \`make_pipeline(StandardScaler(), KNeighborsClassifier())\`.

### Choosing k

    k     train AUC   CV AUC
    1       1.000      0.565
    5       0.895      0.671
    25      0.803      0.732
    75      0.775      0.748
    201     0.770      0.763

k = 1 memorises (each training row is its own neighbour); larger k averages more neighbours, which smooths the
prediction. Here CV keeps improving up to 201 — a sign the signal is broad and smooth, the kind logistic
regression captures directly. Choose k by CV; use odd k for two classes to avoid ties.

### Where kNN struggles

- **Prediction is slow and memory-heavy**: every prediction computes distances to all training rows.
- **Many features**: in high dimensions everything is roughly equally far away (the curse of dimensionality), and
  irrelevant features add noise to every distance.
- **Categories**: one-hot columns and scaled numbers mix awkwardly in one distance.

It shines on small, low-dimensional problems with a meaningful distance — recommending "customers like you", or
matching an address to known locations.

## Naive Bayes

Bayes' rule turns "how often does this word appear in fraud messages" into "how likely is this message fraud":

    P(fraud | words) ∝ P(fraud) × P(word₁ | fraud) × P(word₂ | fraud) × ...

The **naive** assumption is that words are independent given the class. That is false — "click" and "link" travel
together — but the classifier still ranks messages well, because it only needs the comparison between classes
to be right, not the exact probabilities.

### SMS fraud, in twelve messages

    msgs = [
     ("Your a/c XX4321 debited by Rs 2,450 at BigBasket. Avl bal Rs 18,230", "genuine"),
     ("OTP for your transaction is 482913. Do not share it with anyone", "genuine"),
     ("Dear customer your EMI of Rs 6,200 is due on 05-Nov. Pay via the app", "genuine"),
     ("Salary of Rs 52,000 credited to your a/c XX4321", "genuine"),
     ("Your electricity bill of Rs 1,340 is generated. Pay before due date", "genuine"),
     ("Rs 499 refund processed for order 1182. Credited in 3 days", "genuine"),
     ("Congratulations! You have won Rs 25 lakh in KBC lottery. Call now to claim", "fraud"),
     ("Your KYC is pending, account will be blocked today. Click link to update KYC", "fraud"),
     ("Dear customer your account is blocked. Share OTP to unblock now", "fraud"),
     ("You won a free iPhone! Click link and pay Rs 99 delivery to claim", "fraud"),
     ("Urgent: PAN not linked, account blocked. Update KYC at link now", "fraud"),
     ("Get instant loan of Rs 5 lakh without documents. Click link now", "fraud"),
    ]
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.naive_bayes import MultinomialNB

    X = [m for m, _ in msgs]; y = [label for _, label in msgs]
    nb = make_pipeline(CountVectorizer(), MultinomialNB(alpha=1.0)).fit(X, y)
    new = ["Your account will be blocked, click link to update KYC now",
           "Rs 3,000 debited from a/c XX4321 for EMI",
           "Share OTP to claim your refund now"]
    nb.classes_                          # ['fraud' 'genuine']
    nb.predict_proba(new).round(3)
    # [[1.    0.   ]
    #  [0.007 0.993]
    #  [0.896 0.104]]

\`CountVectorizer\` turns each message into word counts; \`MultinomialNB\` learns P(word | class). The words that
lean most towards fraud (log-probability ratio): **link** and **now** (1.6), **click**, **blocked**, **kyc**,
**account** (1.37). Towards genuine: **credited**, **due**, **xx4321** (−1.11). "otp" is almost neutral (−0.012):
it appears in one message of each class — so the third message is flagged because of "claim" and "now", not "OTP".

**alpha = 1.0 (Laplace smoothing)** adds one to every word count, so a word never seen in fraud messages does not
make P(fraud) exactly zero.

### Where Naive Bayes fits

- **Text** with many features and few examples: spam, ticket routing, intent detection. Training is a single pass
  of counting — milliseconds on millions of messages.
- A strong **baseline** before anything heavier.
- Its probabilities are often **too extreme** (the 1.000 above, from twelve messages): use it to rank, and
  calibrate before treating its numbers as real probabilities.
- \`GaussianNB\` exists for numeric features; it assumes each is normal within a class.`,
    workedExample: `**Task: an analyst built a kNN model to flag risky loan applications and reports test AUC 0.505. "kNN doesn't
work on our data." Diagnose it before agreeing.**

**1. Check the pipeline.** The code was \`KNeighborsClassifier(n_neighbors=25).fit(X_tr, y_tr)\` on raw columns:
monthly income in rupees, credit score, EMI %, months employed, prior defaults.

**2. Look at the scales.** Training standard deviations: income 22,037; months employed 51.5; credit score 59.5;
EMI % 10.9; prior defaults 0.5. In a Euclidean distance, a ₹1,000 income difference outweighs a 90-point credit-score
difference. The "nearest neighbours" are simply applicants with similar incomes.

**3. Prove it with three rows.** a = [42000, 700, 30, 60, 0], b = [43000, 610, 55, 6, 2], c = [52000, 702, 31, 62, 0].
Raw distances: a–b 1005.8, a–c 10000.0 — the risky b counts as the near neighbour. After StandardScaler: a–b 5.13,
a–c 0.47.

**4. Fix and re-measure.**

    knn = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=25)).fit(X_tr, y_tr)
    roc_auc_score(y_te, knn.predict_proba(X_te)[:, 1])     # 0.686

**5. Tune k by CV, not on the test set.** CV AUC rises from 0.565 (k = 1) to 0.763 (k = 201). The steady
improvement with large k says the risk signal is smooth — compare against logistic regression before choosing kNN.

**6. Report.** "kNN was matching applicants on income alone because features were unscaled (AUC 0.505). Scaled, it
reaches 0.686 at k = 25 and about 0.76 at large k in cross-validation. We should compare it with logistic regression
before deciding."`,
    mcqs: [
      mcq('An unscaled kNN on loan data scores AUC 0.505; with StandardScaler it scores 0.686. Why?', [
        ['Unscaled, income in rupees dominates every distance, so neighbours match on income alone', true],
        ['Scaling removes the outliers from the training data, which kNN cannot handle well on its own', false],
        ['kNN needs features between 0 and 1, and it raises an error outside that range', false],
        ['Scaling changes the class labels, so that the neighbours vote more accurately', false],
      ], 'Euclidean distance adds squared differences in each feature\'s own units. A feature with a large range swamps the rest unless all are standardised.'),
      mcq('kNN with k = 1 has training AUC 1.000 and CV AUC 0.565. What explains the gap?', [
        ['Each training row is its own nearest neighbour, so k = 1 memorises', true],
        ['The CV folds were not stratified, which lowered the CV score', false],
        ['k = 1 underfits, so a model with k = 1 needs more training data', false],
        ['AUC cannot be computed properly for kNN when k is an odd number', false],
      ], 'With k = 1 every training prediction is the row\'s own label. Larger k averages more neighbours and trades variance for bias.'),
      mcq('Why does Naive Bayes classify text well although its independence assumption is false?', [
        ['Classifying only needs the ranking of the classes to come out right', true],
        ['Words in a message are in fact independent once punctuation is removed', false],
        ['The smoothing parameter alpha corrects the dependence between words', false],
        ['CountVectorizer removes correlated words before the model is trained', false],
      ], 'Correlated words make the probabilities too extreme, but the class with the larger score is often still right. That is why NB ranks well and calibrates poorly.'),
    ],
    checkpoint: [
      mcq('With k = 25, a new applicant\'s neighbours include 6 defaulters. What does predict_proba give for default?', [
        ['0.24', true],
        ['0.06', false],
        ['0.50', false],
        ['0.76', false],
      ], 'kNN\'s probability is the share of neighbours in the class: 6 / 25 = 0.24 (with the default uniform weights).'),
      mcq('In MultinomialNB, what does alpha = 1.0 (Laplace smoothing) prevent?', [
        ['A word never seen in one class making that class\'s probability zero', true],
        ['The model from using words that occur only once in the training set', false],
        ['The classes from having different prior probabilities in the model', false],
        ['Overfitting, by removing the least frequent words from the vocabulary', false],
      ], 'Adding one to every count keeps P(word | class) above zero, so one unseen word cannot veto a class.'),
      mcq('Which situation suits kNN least?', [
        ['Millions of rows, hundreds of features, answers in milliseconds', true],
        ['A few thousand rows with a handful of scaled numeric features', false],
        ['Recommending similar customers where a sensible distance exists', false],
        ['A small dataset where a simple, explainable baseline is needed', false],
      ], 'kNN computes distances to every training row at prediction time and degrades in high dimensions, where all points look equally far away.'),
    ],
  },

  /* ── DECISION_TREES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_DECISION_TREES',
    notes: `A decision tree asks a sequence of yes/no questions — "tenure under 28 months? more than one complaint?" —
and predicts from where you end up. A retention manager can read it, check it against their experience and argue
with it. That readability is why trees are still the first model many teams build, and the parts of a forest or a
boosted model you will meet later.

## The data used for the rest of this topic

A prepaid telecom operator's customers, 6,000 rows simulated with a fixed seed; 19.6% churned (did not recharge in
the following month).

    def make_churn(n=6000, seed=21):
        rng = np.random.default_rng(seed)
        tenure = rng.integers(1, 73, n)
        plan = rng.choice(["Prepaid 199", "Prepaid 299", "Prepaid 479", "Prepaid 719"], n, p=[0.30, 0.35, 0.25, 0.10])
        recharge = np.array([int(p.split()[1]) for p in plan])
        data_gb = np.round(rng.gamma(2.2, 6, n), 1)
        drops = rng.poisson(2.5, n)
        complaints = rng.choice([0, 1, 2, 3], n, p=[0.70, 0.18, 0.08, 0.04])
        gap = rng.integers(0, 45, n)                       # days since last recharge
        dual_sim = (rng.random(n) < 0.55).astype(int)
        circle = rng.choice(["Karnataka", "Tamil Nadu", "Maharashtra", "UP East", "Bihar"], n)
        z = (-2.5 - 0.035 * (tenure - 36) + 0.55 * complaints + 0.12 * (drops - 2.5) + 0.6 * dual_sim
             - 0.002 * (recharge - 300) - 0.02 * (data_gb - 13) + np.where(gap > 30, 1.0, 0.0))
        churn = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
        return pd.DataFrame({"tenure_months": tenure, "plan": plan, "monthly_recharge": recharge, "data_gb": data_gb,
                             "call_drops": drops, "complaints_90d": complaints, "days_since_recharge": gap,
                             "dual_sim": dual_sim, "circle": circle, "churned": churn})

## How a split is chosen: impurity

A node is **pure** if all its customers have the same label. Two measures of impurity, for class shares p:

- **Gini** = 1 − Σ p²: the chance two customers drawn at random from the node have different labels.
- **Entropy** = −Σ p·log₂(p): the information needed to say which class a customer is in.

A node of 10 customers, 4 churners: Gini = 1 − (0.4² + 0.6²) = **0.48**; entropy = **0.971** bits.

Candidate split "complaints ≥ 2": left gets 3 customers (all churners), right gets 7 (1 churner).

    left Gini  = 0 (pure)
    right Gini = 1 − (1/7)² − (6/7)² = 0.245
    weighted   = 0.3 × 0 + 0.7 × 0.245 = 0.171        (impurity fell from 0.48 to 0.171)

A different split putting 3 of 5 churners left and 1 of 5 right gives 0.5 × 0.48 + 0.5 × 0.32 = 0.40 — a smaller
improvement. The tree tries every threshold of every feature and takes the biggest drop, then repeats inside each
child. This is **greedy**: the best split now, not the best tree overall. Gini (the default) and entropy almost
always choose similar splits.

## A tree you can read

    from sklearn.tree import DecisionTreeClassifier, export_text
    num = ["tenure_months", "monthly_recharge", "data_gb", "call_drops", "complaints_90d",
           "days_since_recharge", "dual_sim"]
    X_tr, X_te, y_tr, y_te = train_test_split(churn[num], churn["churned"], test_size=0.25,
                                              random_state=0, stratify=churn["churned"])
    t = DecisionTreeClassifier(max_depth=3, random_state=0).fit(X_tr, y_tr)
    print(export_text(t, feature_names=num, show_weights=True, decimals=1))

    |--- tenure_months <= 28.5
    |   |--- days_since_recharge <= 30.5
    |   |   |--- complaints_90d <= 1.5
    |   |   |   |--- weights: [830.0, 235.0] class: 0
    |   |   |--- complaints_90d >  1.5
    |   |   |   |--- weights: [72.0, 65.0] class: 0
    |   |--- days_since_recharge >  30.5
    |   |   |--- complaints_90d <= 1.5
    |   |   |   |--- weights: [283.0, 195.0] class: 0
    |   |   |--- complaints_90d >  1.5
    |   |   |   |--- weights: [19.0, 55.0] class: 1
    |--- tenure_months >  28.5
    |   |--- complaints_90d <= 1.5
    |   |   |--- days_since_recharge <= 30.5
    |   |   |   |--- weights: [1538.0, 105.0] class: 0
    ...

**weights** are the training counts [stayed, churned] in each leaf. Read the riskiest one as a rule: *tenure ≤ 28
months, no recharge for over 30 days, and 2+ complaints → 55 of 74 churned (74%).* The safest: *tenure > 28, ≤ 1
complaint, recharged recently → 105 of 1,643 (6%).* The leaf's churn share is what \`predict_proba\` returns.

Notice "class: 0" on a leaf where 65 of 137 churned (47%): the label is the majority, but a 47% churn risk is
very much worth acting on. Use the probabilities.

\`feature_importances_\` (total impurity decrease per feature): tenure 0.437, complaints 0.295, days since recharge
0.269, everything else 0 — the depth-3 tree never used them. Importance says what *this tree* used, not what
matters causally, and it is biased towards features with many distinct values.

## Depth: the overfitting dial

    depth   leaves  train acc  test acc  CV AUC  test AUC
    1          2     0.804     0.804    0.635    0.629
    2          4     0.804     0.804    0.683    0.671
    3          8     0.812     0.813    0.722    0.710
    4         16     0.816     0.809    0.739    0.720
    6         58     0.830     0.807    0.715    0.709
    10       366     0.894     0.770    0.613    0.634
    None     923     1.000     0.731    0.565    0.569

An unlimited tree grows 923 leaves for 4,500 customers, scores 100% on training data and is barely better than a
coin on new customers. Note also that accuracy hardly moves between depth 1 and 6 (it is stuck near the 80.4% of
"nobody churns") while AUC shows the real differences — the next unit explains why.

**Controls** (choose by CV): \`max_depth\`, \`min_samples_leaf\` (e.g. 40: no rule built on fewer than 40 customers),
\`max_leaf_nodes\`, and **cost-complexity pruning** \`ccp_alpha\`, which grows the full tree and cuts back branches
that do not pay for themselves:

    ccp_alpha 0.0    → 923 leaves, test AUC 0.569
    ccp_alpha 0.001  →  19 leaves, test AUC 0.715
    ccp_alpha 0.002  →   8 leaves, test AUC 0.717
    ccp_alpha 0.004  →   4 leaves, test AUC 0.671

## Strengths and weaknesses

| Strength | Weakness |
|---|---|
| Reads as rules a manager can check | Unstable: a slightly different sample can give a different tree |
| No scaling needed; handles curves and interactions | Axis-parallel steps; smooth effects need many splits |
| Fast to train and predict | Overfits without depth limits or pruning |
| Mixed feature types (after encoding categories) | Probabilities are coarse — one per leaf |

The instability is what random forests and gradient boosting fix by combining many trees — at the cost of the
readability this unit started with.`,
    mcqs: [
      mcq('A node has 10 customers, 4 of whom churned. What is its Gini impurity?', [
        ['0.48', true],
        ['0.40', false],
        ['0.24', false],
        ['0.97', false],
      ], 'Gini = 1 − (0.4² + 0.6²) = 1 − 0.52 = 0.48. 0.97 is the entropy of the same node, in bits.'),
      mcq('A depth-3 churn tree has a leaf with weights [72, 65] labelled "class: 0". How should the retention team treat those customers?', [
        ['As high risk — 47% of them churned, even though the majority label is 0', true],
        ['As safe, because the tree has predicted that these customers will stay', false],
        ['As unknown, because a leaf with mixed labels has no usable information', false],
        ['As certain churners, because the leaf contains more than 50 churners', false],
      ], '65 of 137 is 47%, far above the 19.6% base rate. The label is just the majority; predict_proba gives the leaf\'s churn share, which is what to act on.'),
      mcq('An unlimited-depth tree has 923 leaves, training accuracy 1.000 and test AUC 0.569. What would most likely help?', [
        ['Limiting max_depth or min_samples_leaf, or pruning with ccp_alpha, chosen by CV', true],
        ['Scaling the features first, since trees are sensitive to feature units', false],
        ['Switching the split criterion from Gini to entropy, which is known to overfit much less', false],
        ['Adding more features, so that the tree has better splits to choose from', false],
      ], 'The tree has memorised the training data. Depth limits or pruning (ccp_alpha 0.001 gave 19 leaves and AUC 0.715) restore generalisation; trees do not need scaling.'),
    ],
    checkpoint: [
      mcq('How does a decision tree choose each split?', [
        ['The feature and threshold that most reduce weighted impurity in the children', true],
        ['The feature that is most strongly correlated with the target across all of the data', false],
        ['A random feature and threshold, which is then kept if accuracy improves', false],
        ['The split that makes both child nodes contain equal numbers of rows', false],
      ], 'At each node the tree searches every feature and threshold for the largest drop in Gini or entropy — a greedy, local choice.'),
      mcq('A split sends 3 customers (all churners) left and 7 (1 churner) right. What is the weighted Gini after the split?', [
        ['About 0.171', true],
        ['About 0.245', false],
        ['About 0.480', false],
        ['About 0.343', false],
      ], 'Left Gini is 0; right is 1 − (1/7)² − (6/7)² = 0.245; weighted by size: 0.3 × 0 + 0.7 × 0.245 = 0.171.'),
      mcq('Two analysts train trees on two random 80% samples of the same churn data and get quite different first splits. What does this show?', [
        ['Single trees are unstable: small changes in data can change the tree', true],
        ['One of the analysts must have made an error in preparing the data', false],
        ['Trees are random by design, so there is nothing that can be learned', false],
        ['The data contains leakage, which makes the first split unpredictable', false],
      ], 'Greedy splitting means a small change near the top changes everything below it. Ensembles of trees average this instability away.'),
    ],
  },

  /* ── IMBALANCE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_IMBALANCE',
    notes: `Most targets worth predicting are rare: loan defaults, fraud, machine failures, customers who will churn this
week. With a rare target, the usual reflexes — accuracy, a 0.5 threshold, a random split — all quietly fail. This
unit shows each failure on one dataset and what to do instead.

## The data

20,000 NBFC loans from \`make_loans(n=20000, seed=5, shift=-2.0)\` (the logistic-regression unit's generator with a
lower base rate): **891 defaults, 4.46%**.

## Failure 1: accuracy rewards doing nothing

    from sklearn.dummy import DummyClassifier
    dummy = DummyClassifier(strategy="most_frequent").fit(X_tr, y_tr)
    # accuracy 0.9554 — predicts "no default" for everyone, catches 0 of 223 defaulters

    logreg = make_pipeline(StandardScaler(), LogisticRegression()).fit(X_tr, y_tr)
    # accuracy 0.9562, precision 0.70, recall 0.031 — flags 10 loans, catches 7 of 223

The model looks better than the dummy by 0.08 percentage points of accuracy and catches **3%** of defaulters.
The confusion matrix tells the truth:

                       predicted repay   predicted default
    actual repay            4774                3
    actual default           216                7

The metrics that see the minority class:

- **Precision** — of the loans flagged, how many defaulted (TP / (TP + FP)).
- **Recall** — of the defaulters, how many were flagged (TP / (TP + FN)).
- **F1** — their harmonic mean, 2PR / (P + R); low if either is low.
- **Balanced accuracy** — the average of recall on each class (0.5 for the dummy).
- **ROC AUC** — ranking quality across all thresholds; **PR AUC / average precision** — the same idea on the
  precision–recall curve, whose "random" level is the base rate (0.0446 here), so it is much harsher on rare
  targets. This model: ROC AUC 0.828, average precision 0.232 — five times the base rate.

## Failure 2: a random split that is not representative

With only 891 defaulters, an unstratified 10% test set gets whatever share chance gives it. Five random seeds gave
test default rates of **4.2%, 4.9%, 4.7%, 4.95% and 5.8%** — the last is 30% more defaulters than the population.
Scores computed on such sets are not comparable.

    train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
    # train 4.45%, test 4.46% (223 of 5,000)

Stratify the split, and use \`StratifiedKFold\` for cross-validation (scikit-learn does this automatically for
classifiers when you pass \`cv=5\`).

## Fix A: class weights

\`class_weight="balanced"\` weights each class inversely to its frequency in the loss, so missing a defaulter
costs about 21 times as much as misclassifying a repayer.

    balanced = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced")).fit(X_tr, y_tr)
    # accuracy 0.737, precision 0.120, recall 0.776, F1 0.208, balanced accuracy 0.755
    # ROC AUC 0.828, average precision 0.231

Recall jumps from 3% to 78% — at the cost of 1,266 false alarms. And look at the AUC: **unchanged (0.828)**.
Re-weighting barely changed how the model ranks borrowers; it mostly moved where the 0.5 cut falls. That is the
central insight of this topic: for a ranking model like logistic regression, **choosing a threshold on the
original model often gets you the same trade-off** (next unit), while keeping probabilities honest.

Re-weighting has a price: the mean predicted default probability on the test set rises from **0.044** (matching
the true 4.46%) to **0.372**. The balanced model's "probabilities" are no longer probabilities. If anything
downstream uses them — expected loss = P(default) × exposure — they are badly wrong.

## Fix B: resampling

Oversample the minority (repeat defaulters) or undersample the majority until the classes balance:

    from sklearn.utils import resample
    tr = X_tr.assign(y=y_tr)
    minority, majority = tr[tr.y == 1], tr[tr.y == 0]
    up = resample(minority, replace=True, n_samples=len(majority), random_state=0)
    balanced_train = pd.concat([majority, up])
    # logistic regression on it: recall 0.780, precision 0.121, ROC AUC 0.828 — the same as class weights

For logistic regression, oversampling and class weights are near-equivalent. Libraries like \`imbalanced-learn\`
add SMOTE (synthetic minority rows) and pipelines that resample only inside training folds.

**Resample only the training data — never before the split.** Oversample the whole dataset first and copies of
the same defaulter land in both train and test. A deep tree then "recognises" them:

    oversampled before splitting:  accuracy 0.974, precision 0.951, recall 1.000
    oversampled training set only: accuracy 0.923, precision 0.167, recall 0.184     (honest)

Recall 1.000 is the model remembering duplicates, not finding defaulters.

## Fix C: change the threshold, and measure the right thing

Keep the model unweighted and lower the cut from 0.5 to where the business wants it. This keeps calibrated
probabilities and is often the cleanest option — the thresholds unit does it with real costs.

## A checklist for any rare target

1. Report the base rate and the confusion matrix, never accuracy alone.
2. Stratify every split and every CV.
3. Compare with the dummy on recall, precision and average precision.
4. Try the threshold before class weights or resampling; if you re-weight, do not use the scores as probabilities
   without recalibrating.
5. Resample inside training folds only.`,
    mcqs: [
      mcq('A default model has accuracy 0.9562 against the dummy\'s 0.9554 on a 4.5% default rate, and recall 0.031. What is the right summary?', [
        ['It catches about 3% of defaulters; accuracy hides that almost completely', true],
        ['It is slightly better than the dummy, so it is ready to be deployed', false],
        ['It is overfitting, because its accuracy is above 95% on the test set', false],
        ['It is calibrated badly, which is why its recall is so very low here', false],
      ], 'With 95.5% repayers, accuracy is dominated by them. Recall shows the model flags 7 of 223 defaulters at the 0.5 threshold.'),
      mcq('class_weight="balanced" raises recall from 0.03 to 0.78, yet ROC AUC stays at 0.828. What does that tell you?', [
        ['Re-weighting mostly moved the decision cut, not how the model ranks loans', true],
        ['The ROC AUC calculation ignores class weights, so it cannot be trusted', false],
        ['The balanced model is better on every possible metric, including AUC', false],
        ['The original model was overfitting, which re-weighting has now cured', false],
      ], 'AUC measures ranking across all thresholds. Re-weighting shifted predicted probabilities upward, so more loans cross 0.5, but the ordering barely changed.'),
      mcq('A team oversamples defaulters on the whole dataset, then splits, and a deep tree scores recall 1.000. What went wrong?', [
        ['Copies of the same defaulters landed in both train and test, so the tree recognised them', true],
        ['Oversampling always produces a perfect recall, which is exactly the whole point of using it', false],
        ['The tree should have been scaled before training on the oversampled data', false],
        ['Nothing — a recall of 1.000 shows that the oversampling worked as intended', false],
      ], 'Resampling before the split duplicates rows across it. Done only on the training set, the same tree\'s recall was 0.184.'),
    ],
    checkpoint: [
      mcq('Why is average precision (PR AUC) harsher than ROC AUC on a 4.5% target?', [
        ['Its random-classifier level is the base rate, 0.045, rather than 0.5', true],
        ['It only counts the true negatives, which dominate a rare target', false],
        ['It is computed at a single threshold of 0.5 rather than across all', false],
        ['It squares the errors, which magnifies those on the rare class', false],
      ], 'Precision depends on how many negatives are flagged; with many negatives, false alarms dominate. A random ranking gets AP equal to the prevalence.'),
      mcq('After training with class_weight="balanced", the mean predicted default probability is 0.37 while the true rate is 0.045. What is the risk?', [
        ['Using the scores as probabilities, e.g. for expected loss, would be badly wrong', true],
        ['The model will rank borrowers worse than the unweighted one does', false],
        ['The model can no longer be used with any decision threshold other than the default 0.5', false],
        ['There is no risk, because only the ranking of borrowers ever matters', false],
      ], 'Re-weighting inflates the minority class\'s scores. Ranking is unchanged, but any calculation treating them as probabilities needs recalibration.'),
      mcq('Five unstratified 10% test sets have default rates from 4.2% to 5.8%. What is the right fix?', [
        ['Stratify the split on the target so each set keeps the base rate', true],
        ['Use a larger test set of 50%, which removes all variation in the rate', false],
        ['Pick the random seed whose test rate is closest to the population', false],
        ['Oversample defaulters in the test set until the rate is exactly 4.5%', false],
      ], 'stratify=y preserves the class proportions in every split. Choosing a seed is tuning on the test set; resampling the test set changes what is measured.'),
    ],
  },

  /* ── THRESHOLDS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_THRESHOLDS',
    notes: `A classifier gives a probability. A business needs a decision: call this customer or not, approve this loan or
not. The threshold that turns one into the other is a **business decision**, and 0.5 is almost never the right
one. This unit chooses it from what each kind of error costs.

## The decision

The telecom operator from the decision-trees unit (\`make_churn()\`, 19.6% churn) wants to send a retention offer —
₹150 of free data — to customers likely to churn. From finance:

- The offer costs **₹150** for every customer who receives it, churner or not.
- A churner is worth **₹1,800** (six months of margin at about ₹300).
- The offer keeps **30%** of the churners who receive it. (The rest leave anyway.)

## Every threshold is a confusion matrix

At threshold t, every customer with P(churn) ≥ t gets the offer:

| | Offer sent | No offer |
|---|---|---|
| **Churner** | TP: 30% kept → gain 0.3 × ₹1,800 = ₹540, minus ₹150 | FN: lost, no cost of action |
| **Stayer** | FP: ₹150 wasted | TN: nothing |

    net value = TP × ₹540 − (TP + FP) × ₹150

## Break-even: the threshold from the costs alone

Send the offer when its expected gain beats its cost:

    p × 0.30 × 1800 > 150   →   p > 150 / 540 = 0.278

If the model's probabilities are calibrated, **0.28 is the right threshold before you look at any data**. It moves
when the business numbers move: a cheaper offer or a more valuable customer lowers it.

## Choosing it on validation data

Fit the model, get out-of-fold probabilities on the **training** set with \`cross_val_predict\`, and evaluate
thresholds there. The test set stays untouched for the final check.

    from sklearn.model_selection import cross_val_predict, StratifiedKFold
    num = ["tenure_months", "monthly_recharge", "data_gb", "call_drops", "complaints_90d",
           "days_since_recharge", "dual_sim"]
    pre = ColumnTransformer([("num", StandardScaler(), num),
                             ("cat", OneHotEncoder(handle_unknown="ignore"), ["circle"])])
    model = make_pipeline(pre, LogisticRegression(max_iter=1000))
    p_cv = cross_val_predict(model, X_tr, y_tr, cv=StratifiedKFold(5, shuffle=True, random_state=0),
                             method="predict_proba")[:, 1]

     threshold  targeted   TP    FP   FN  precision  recall  net_value
          0.10      2880  797  2083   85      0.277   0.904      -1620
          0.20      1637  624  1013  258      0.381   0.707      91410
          0.25      1264  524   740  358      0.415   0.594      93360
          0.30       973  434   539  448      0.446   0.492      88410
          0.40       559  294   265  588      0.526   0.333      74910
          0.50       312  174   138  708      0.558   0.197      47160

Scanning every threshold from 0.05 to 0.69 in steps of 0.01, the best is **0.27**: 1,141 customers targeted,
495 churners reached, net value **₹96,150** on 4,500 customers — right at the break-even 0.278. At 0.5 the value is
less than half that; at 0.10 the offer costs more than it saves.

## On the test set — once

    test ROC AUC 0.749, 1,500 customers, 294 churners

     threshold  targeted   TP   FP   FN  precision  recall  net_value
          0.50       106   63   43  231      0.594   0.214      18120
          0.27       395  155  240  139      0.392   0.527      24450

Sending the offer to everyone would be **−₹66,240**. The model plus the right threshold earns ₹24,450 on 1,500
customers; the same model at 0.5 earns ₹18,120 — about a quarter less, by changing one number.

## Precision–recall trade-off, and how to present it

Lowering the threshold raises recall and lowers precision — always. The question for the business is never "what
is the best F1" but "how many customers can we afford to call, and what does each miss cost?" Useful forms:

- **A threshold table** like the ones above, with targeted volume and value.
- **Capacity**: "the call centre can make 400 calls a week" → take the top 400 by probability, whatever threshold
  that implies.
- **Precision at k / recall at k**: of the top 400, how many churn?

\`precision_recall_curve(y, p)\` and \`roc_curve(y, p)\` return the whole trade-off; scikit-learn 1.5+ also has
\`TunedThresholdClassifierCV\`, which picks the threshold by cross-validation for a metric you define.

## When the threshold is wrong for a reason

- **Calibration.** Break-even assumes P(churn) = 0.3 means 30% churn. Check with a calibration curve
  (\`CalibrationDisplay\`); class weights or Naive Bayes break it; \`CalibratedClassifierCV\` repairs it.
- **Costs per customer differ.** A ₹719-plan customer is worth more than a ₹199 one: compute expected value per
  customer (p × value × save rate − cost) and target where it is positive, instead of one global threshold.
- **The world moves.** A competitor's offer changes the churn rate; re-check the threshold when the costs or the
  base rate change.

## The sentence for the retention head

"Target customers with a predicted churn risk of 27% or more — about one in four. On held-out customers this
reaches 53% of churners and is worth about ₹24,000 per 1,500 customers, against ₹18,000 at the default cut-off
and a loss if we sent the offer to everyone."`,
    mcqs: [
      mcq('An offer costs ₹200, saves 25% of the churners who get it, and each churner is worth ₹2,400. Above what churn probability should a customer get the offer?', [
        ['About 0.33', true],
        ['About 0.08', false],
        ['About 0.50', false],
        ['About 0.25', false],
      ], 'Send the offer when p × 0.25 × 2,400 > 200, i.e. p > 200 / 600 = 0.333.'),
      mcq('Why are thresholds evaluated on cross_val_predict probabilities from the training set rather than on the test set?', [
        ['Choosing the threshold is tuning, and tuning on the test set biases the final score', true],
        ['The test set has too few churners to compute precision or recall at all', false],
        ['cross_val_predict returns better-calibrated probabilities than the final fitted model does', false],
        ['The threshold must be chosen before the model is fitted on the training set', false],
      ], 'A threshold is a hyperparameter of the decision. Out-of-fold probabilities let you choose it without touching the test set, which then gives an honest final check.'),
      mcq('At threshold 0.27 the churn model targets 395 customers with precision 0.392 and recall 0.527; at 0.50 it targets 106 with precision 0.594 and recall 0.214. Which statement is right?', [
        ['Lowering the threshold traded precision for recall, and here it earned more', true],
        ['The 0.50 threshold is better, because its precision is the higher of the two', false],
        ['The 0.27 threshold is better, because its recall is higher, whatever the cost', false],
        ['The model at 0.27 is a different model with a better ranking than at 0.50', false],
      ], 'The same model\'s scores were cut at two places. Which is better depends on the costs: with these, 0.27 is worth ₹24,450 against ₹18,120.'),
    ],
    checkpoint: [
      mcq('Why is 0.5 rarely the right classification threshold for a business decision?', [
        ['The right cut depends on the costs of each error and the base rate', true],
        ['Probabilities from scikit-learn are always too low by about half', false],
        ['A threshold of 0.5 always maximises recall, which is rarely wanted', false],
        ['0.5 only works for balanced data and fails with any other rate', false],
      ], '0.5 minimises errors only if both kinds cost the same. When a missed churner costs more than a wasted offer, the cut should be lower.'),
      mcq('A call centre can make 400 retention calls a week. How should the threshold be set?', [
        ['Call the 400 customers with the highest predicted churn probability', true],
        ['Use 0.5, and call whoever is above it, even if that is more than 400', false],
        ['Use the threshold that maximises F1, then call a random 400 of them', false],
        ['Call 400 random customers, as capacity makes the model irrelevant', false],
      ], 'With fixed capacity the decision is a ranking: take the top 400. The implied threshold is whatever probability the 400th customer has.'),
      mcq('Break-even analysis says target customers with P(churn) above 0.28. What must be true for that threshold to work as computed?', [
        ['Calibrated probabilities — 0.28 should mean about 28% churn', true],
        ['The model must have a test accuracy above 80% on the churn data', false],
        ['The classes must first be balanced by oversampling the churners', false],
        ['The model must be a logistic regression rather than any other kind', false],
      ], 'Break-even compares expected gain with cost using p itself. If p is miscalibrated (for example after class weighting), the threshold must be found empirically or the model recalibrated.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_DEBUGGING',
    notes: `Classification bugs hide behind good-looking numbers even more than regression bugs do, because accuracy
on a rare target is high for almost any model. Eight faults — symptom, cause, fix — from the loan and telecom data
used in this topic.

## 1. The model that predicts one class

**Symptom:** a default model on 20,000 loans (4.46% default) reports accuracy 0.956. The risk team notices it
almost never flags anyone: 10 of 5,000 test loans.
**Cause:** with a rare target, the loss is minimised mostly by getting the majority right; very few borrowers reach
P = 0.5, so \`predict()\` says "repay" for nearly everyone. Accuracy (0.9562) barely beats the all-"repay" dummy
(0.9554). Recall is 0.031.
**Fix:** look at the confusion matrix and at \`predict_proba\`, not \`predict\`. Choose a threshold from the costs, or
use class weights; report recall, precision and average precision next to the dummy.

## 2. A feature from the future

**Symptom:** a churn model's test AUC jumps from **0.747 to 0.992** when two columns are added:
\`port_out_request\` and \`days_since_last_recharge\`.
**Cause:** both are recorded during or after the month being predicted. A port-out request (moving the number to
another operator) is churn happening; a prepaid customer with 40 days since the last recharge has, by the
operator's definition, already churned.
**Fix:** for each column, ask *when* it is recorded relative to the prediction date. Build features from a snapshot
taken before the prediction window — "days since recharge **as of the 1st**", not as of the export.

## 3. Oversampling before the split

**Symptom:** a fraud-style tree reports recall **1.000** and precision 0.951 on loans. In production, it catches
almost nothing.
**Cause:** defaulters were oversampled on the whole dataset and then split, so copies of the same defaulter sat in
train and test. The unlimited tree recognised its own training rows. Oversampling only the training set gave
recall **0.184** — the honest number.
**Fix:** split first; resample inside the training data (and inside each CV fold — \`imbalanced-learn\`'s
\`Pipeline\` does this), never the test set.

## 4. A category the encoder never saw

**Symptom:** the churn pipeline runs nightly for months, then fails:

    ValueError: Found unknown categories ['Gujarat'] in column 0 during transform

**Cause:** the operator launched in a new circle. \`OneHotEncoder()\` defaults to \`handle_unknown="error"\`.
**Fix:** \`OneHotEncoder(handle_unknown="ignore")\` — an unseen circle becomes all zeros, so the prediction rests
on the other features alone. Then monitor the share of unseen categories, because the model knows nothing about Gujarat customers.

## 5. kNN on unscaled features

**Symptom:** kNN on loans gives AUC **0.505** — no better than a coin.
**Cause:** income in rupees (standard deviation ₹22,037) dominates every distance, so neighbours are chosen by
income alone.
**Fix:** \`make_pipeline(StandardScaler(), KNeighborsClassifier())\` — AUC 0.686. Any distance- or penalty-based
model (kNN, SVM, regularised logistic regression) needs scaled inputs; trees do not.

## 6. A test set that is not the population

**Symptom:** two analysts report recall 0.71 and 0.64 for "the same model".
**Cause:** unstratified splits on a rare target. Five random 10% test sets of the loan data had default rates from
**4.2% to 5.8%**; with ~90 defaulters per set, each one is worth more than a point of recall.
**Fix:** \`stratify=y\` in \`train_test_split\`, stratified folds for CV, and report the spread across folds rather
than one number.

## 7. A threshold tuned on the test set

**Symptom:** the threshold report says 0.27 "maximises value on the test set", and the value is reported from the
same test set. Next quarter's value is lower.
**Cause:** choosing a threshold is tuning. Picking the best of 65 thresholds on the test set and then reporting that
set's value is optimistic, for the same reason as choosing α on it.
**Fix:** choose the threshold on out-of-fold probabilities (\`cross_val_predict\`) or a validation set; apply it to
the test set once.

## 8. Probabilities that are not probabilities

**Symptom:** the credit team multiplies P(default) by the loan amount to forecast losses and gets eight times the
real loss.
**Cause:** the model was trained with \`class_weight="balanced"\`. Its mean predicted default probability is
**0.372** against a true rate of **0.0446**. Ranking is fine (AUC unchanged); the numbers are not probabilities.
**Fix:** for anything that uses p as a probability, train without weights and move the threshold instead, or
recalibrate with \`CalibratedClassifierCV\`; check with a calibration curve.

## The order of checks when a classifier looks too good — or useless

1. Base rate and confusion matrix. 2. Every feature known before the prediction date? 3. Split first, stratified;
resampling and threshold choice on training data only. 4. Preprocessing inside the pipeline, robust to new
categories. 5. Are the scores used as probabilities? Then check calibration.`,
    mcqs: [
      mcq('A churn model\'s AUC jumps from 0.747 to 0.992 when port_out_request is added. What is the most likely explanation?', [
        ['The column records churn as it happens, so it leaks the target', true],
        ['Port-out requests are the true cause of churn, finally captured', false],
        ['The model was underfitting and needed one more strong feature', false],
        ['AUC is unreliable above 0.9 and should not be reported at all', false],
      ], 'A port-out request is part of the act of leaving. Features must come from a snapshot taken before the period being predicted.'),
      mcq('A nightly churn job fails with "Found unknown categories [\'Gujarat\']". What is the right fix?', [
        ['Set handle_unknown="ignore" on the encoder and monitor unseen categories', true],
        ['Add Gujarat to the training data by copying rows from Maharashtra', false],
        ['Drop the circle column from the model so that the job stops failing', false],
        ['Catch the error and skip every customer from the new circle each night', false],
      ], 'Ignoring unknown categories keeps the pipeline running with all-zero indicators; monitoring tells you when the model is being asked about customers it knows nothing about.'),
      mcq('Oversampling the whole dataset before splitting gave recall 1.000; oversampling only the training set gave 0.184. Which number should be reported?', [
        ['0.184, because the first test set contained copies of training rows', true],
        ['1.000, because oversampling is meant to increase the model\'s recall', false],
        ['The average, 0.592, because both procedures are equally valid', false],
        ['Neither, because recall is not a valid metric after oversampling', false],
      ], 'Duplicated defaulters on both sides of the split let the tree recognise rows it had memorised. Only the training-set-only version measures generalisation.'),
      mcq('A model trained with class_weight="balanced" predicts an average default probability of 0.37 on a 4.5% portfolio. What is wrong with using p × loan amount as expected loss?', [
        ['Re-weighting inflated the scores, so they are no longer calibrated probabilities', true],
        ['Expected loss must be computed from predict(), not from predict_proba()', false],
        ['The model\'s ranking of borrowers is broken, which ruins the expected loss', false],
        ['Nothing — balanced class weights make the predicted probabilities more accurate for everyone', false],
      ], 'Weighting shifts scores toward the minority class; AUC stays the same but the values are not probabilities. Recalibrate or train unweighted and move the threshold.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_PRACTICE',
    notes: `Six exercises, then a graded program. Work each on paper or in a notebook before reading the answer. Every
number was computed with scikit-learn 1.9.

## Exercise 1 — A confusion matrix by hand

Ten e-commerce orders, whether each was returned (1) and the model's P(return):

    actual  1     0     1     1     0     1     0     0     1     0
    p       0.92  0.81  0.74  0.55  0.48  0.42  0.35  0.22  0.18  0.05

At threshold 0.5, fill in TP, FP, FN, TN and compute accuracy, precision, recall and F1. Then repeat at 0.3.

**Answer.** At 0.5 the first four are predicted returns: **TP 3, FP 1, FN 2, TN 4**; accuracy 0.700, precision 3/4 =
**0.750**, recall 3/5 = **0.600**, F1 = 2 × 0.75 × 0.6 / 1.35 = **0.667**. At 0.3 the first seven are flagged: TP 4,
FP 3, FN 1, TN 2; precision **0.571**, recall **0.800**, F1 0.667. Lowering the threshold bought recall with precision.

## Exercise 2 — Odds ratios

The default model has a prior_defaults coefficient of 0.8195. What is the odds ratio for one prior default, and for
two? A borrower at 10% risk has one prior default added — what is the new probability?

**Answer.** e^0.8195 = **2.27**; two prior defaults e^1.639 = **5.15** (ratios multiply). Odds 0.10/0.90 = 0.111 →
× 2.27 = 0.252 → p = 0.252 / 1.252 = **20.1%**.

## Exercise 3 — Pick the better split

A node has 20 customers, 8 churners. Split A: left 6 customers (5 churners), right 14 (3 churners). Split B: left 10
(6 churners), right 10 (2 churners). Which split does a Gini tree choose?

**Answer.** Parent Gini 0.48. A: left 1 − (5/6)² − (1/6)² = 0.278, right 1 − (3/14)² − (11/14)² = 0.337, weighted
0.3 × 0.278 + 0.7 × 0.337 = **0.319**. B: 0.5 × 0.48 + 0.5 × 0.32 = **0.400**. **Split A** — lower impurity.

## Exercise 4 — Scale, then kNN

Train \`KNeighborsClassifier(n_neighbors=25)\` on the loan features with and without \`StandardScaler\` in a pipeline,
and compare test ROC AUC. Explain the difference in one sentence.

**Answer.** Raw **0.505**, scaled **0.686**. Without scaling, monthly income (standard deviation ₹22,037) dominates
the distance, so the "neighbours" are just people with similar incomes.

## Exercise 5 — A threshold from costs

A bank's collections team can phone borrowers likely to miss next month's EMI. A call costs ₹60; a missed EMI that a
call prevents saves ₹900; calls prevent 20% of misses. Above what probability should the team call?

**Answer.** Call when p × 0.20 × 900 > 60 → p > 60 / 180 = **0.333**. If the call centre can make only 500 calls a
day, rank by p and call the top 500 — provided the 500th still has p above 0.333.

## Exercise 6 — Choose the metric

For each, name the metric you would lead with: (a) a fraud model where analysts can review 200 alerts a day;
(b) a cancer-screening model whose positives go for a cheap follow-up test; (c) a churn model whose scores feed a
revenue forecast.

**Answer.** (a) **Precision at 200** (how many of the reviewed alerts are fraud) — capacity is fixed. (b) **Recall**,
at a precision the follow-up capacity can absorb — a missed case is far worse than a false alarm. (c) **Calibration
and log loss** — the forecast uses p as a probability, so it must mean what it says.

## The graded exercise — Confusion matrix at a threshold

Write a plain-Python program (no NumPy, no scikit-learn) that reads a threshold and a list of (actual, probability)
pairs and prints the confusion matrix, accuracy, precision, recall and F1. The specification and the tests are in
the assignment.`,
    mcqs: [
      mcq('In Exercise 1 at threshold 0.5, what are precision and recall?', [
        ['Precision 0.750 and recall 0.600', true],
        ['Precision 0.600 and recall 0.750', false],
        ['Precision 0.700 and recall 0.600', false],
        ['Precision 0.750 and recall 0.800', false],
      ], 'Four orders are flagged, three of them returned: precision 3/4. Five orders were returned, three were flagged: recall 3/5. 0.700 is the accuracy.'),
      mcq('In Exercise 2, the odds ratio for one prior default is 2.27. What is it for two?', [
        ['About 5.15, since the ratio applies once per default', true],
        ['About 4.54, since the ratio doubles with two defaults', false],
        ['About 3.27, since one more is added for each default', false],
        ['About 2.27, as the count of defaults does not matter', false],
      ], 'Each unit adds 0.8195 to the log-odds, so two units multiply the odds by e^1.639 = 2.27² ≈ 5.15.'),
      mcq('In Exercise 3, what are the weighted Gini values of splits A and B?', [
        ['A 0.319 and B 0.400, so the tree chooses A', true],
        ['A 0.400 and B 0.319, so the tree chooses B', false],
        ['A 0.319 and B 0.400, so the tree chooses B', false],
        ['A 0.480 and B 0.480, so both are equally good', false],
      ], 'A: 0.3 × 0.278 + 0.7 × 0.337 = 0.319; B: 0.5 × 0.48 + 0.5 × 0.32 = 0.400. The tree picks the larger drop in impurity, split A.'),
      mcq('In Exercise 5, a call costs ₹60, prevents 20% of misses, and a prevented miss saves ₹900. What is the calling threshold?', [
        ['p > 0.333', true],
        ['p > 0.067', false],
        ['p > 0.200', false],
        ['p > 0.500', false],
      ], 'Expected saving p × 0.20 × 900 = 180p must exceed ₹60, so p > 60/180 = 0.333. 0.067 forgets the 20% success rate.'),
      mcq('In Exercise 6, why lead with calibration for churn scores that feed a revenue forecast?', [
        ['The forecast multiplies by p, so p must equal the real churn rate', true],
        ['Calibration is the only metric that rises when recall rises too', false],
        ['Calibrated models always have the highest AUC of all the options', false],
        ['Revenue forecasts need labels, and calibration converts p to labels', false],
      ], 'When p is used as a number, not just for ranking, a model that says 0.3 must be right about 30% of the time. AUC says nothing about that.'),
    ],
    assignment: {
      title: 'Confusion Matrix, Precision, Recall and F1 at a Threshold',
      description: 'Read a threshold and (actual, probability) pairs from standard input and print the confusion matrix, accuracy, precision, recall and F1 — in plain Python, the way scikit-learn computes them.',
      instructions: `Write a Python program that reads from standard input and evaluates a classifier at a threshold. Use only
the standard library — no NumPy, no scikit-learn.

**Input**

- The first non-blank line is the **threshold** t, a number between 0 and 1.
- Every following non-blank line is \`<actual> <probability>\`: actual is \`0\` or \`1\`, probability is a number
  between 0 and 1.
- Ignore blank lines anywhere.

A row is **predicted positive** when its probability is **greater than or equal to** t.

**What to compute**

- TP, FP, FN, TN — the confusion matrix.
- accuracy = (TP + TN) / (number of rows)
- precision = TP / (TP + FP) — print **0.000** if nothing was predicted positive
- recall = TP / (TP + FN) — print **0.000** if there are no actual positives
- F1 = 2 × precision × recall / (precision + recall) — print **0.000** if precision + recall is 0

(These match scikit-learn with \`zero_division=0\`.)

**Output** — exactly five lines, numbers with three decimals:

    TP=<tp> FP=<fp> FN=<fn> TN=<tn>
    accuracy=<value>
    precision=<value>
    recall=<value>
    f1=<value>

**Example**

Input:

    0.5
    1 0.92
    0 0.81
    1 0.74
    1 0.55
    0 0.48
    1 0.42
    0 0.35
    0 0.22
    1 0.18
    0 0.05

Output:

    TP=3 FP=1 FN=2 TN=4
    accuracy=0.700
    precision=0.750
    recall=0.600
    f1=0.667

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot, including a
probability exactly equal to the threshold, nothing predicted positive, no actual positives and a threshold of 0
— and scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the remaining
marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including ties at the threshold, blank lines, no predicted positives, no actual positives and threshold 0.', maxPoints: 60 },
        { criterion: 'Correct definitions', description: 'The ≥ rule for the threshold, the four counts and each metric follow the definitions, with the zero-division cases handled explicitly rather than by catching exceptions.', maxPoints: 25 },
        { criterion: 'Clarity', description: 'Small functions or clearly separated steps (read, count, compute, print), meaningful names, no repeated logic.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def main():
    lines = [line.strip() for line in sys.stdin.read().splitlines()]
    lines = [line for line in lines if line]
    threshold = float(lines[0])
    rows = []
    for line in lines[1:]:
        actual, prob = line.split()
        rows.append((int(actual), float(prob)))

    # TODO: count TP, FP, FN, TN — predicted positive when prob >= threshold
    # TODO: compute accuracy, precision, recall and F1 (0.0 when a denominator is 0)
    # TODO: print the five lines in the exact format the instructions give


main()
`,
        tests: [
          { input: '0.5\n1 0.92\n0 0.81\n1 0.74\n1 0.55\n0 0.48\n1 0.42\n0 0.35\n0 0.22\n1 0.18\n0 0.05\n', expectedOutput: 'TP=3 FP=1 FN=2 TN=4\naccuracy=0.700\nprecision=0.750\nrecall=0.600\nf1=0.667' },
          { input: '0.3\n1 0.92\n0 0.81\n1 0.74\n1 0.55\n0 0.48\n1 0.42\n0 0.35\n0 0.22\n1 0.18\n0 0.05\n', expectedOutput: 'TP=4 FP=3 FN=1 TN=2\naccuracy=0.600\nprecision=0.571\nrecall=0.800\nf1=0.667' },
          { input: '0.6\n1 0.6\n0 0.6\n1 0.59\n0 0.1\n1 0.95\n0 0.61\n1 0.3\n', expectedOutput: 'TP=2 FP=2 FN=2 TN=1\naccuracy=0.429\nprecision=0.500\nrecall=0.500\nf1=0.500', isHidden: true },
          { input: '0.95\n1 0.9\n0 0.2\n1 0.7\n0 0.4\n', expectedOutput: 'TP=0 FP=0 FN=2 TN=2\naccuracy=0.500\nprecision=0.000\nrecall=0.000\nf1=0.000', isHidden: true },
          { input: '0.4\n0 0.1\n0 0.45\n0 0.8\n0 0.3\n0 0.39\n', expectedOutput: 'TP=0 FP=2 FN=0 TN=3\naccuracy=0.600\nprecision=0.000\nrecall=0.000\nf1=0.000', isHidden: true },
          { input: '0.5\n\n1 0.99\n1 0.71\n\n0 0.12\n1 0.5\n0 0.49\n0 0.03\n1 0.88\n0 0.2\n1 0.64\n0 0.31\n0 0.07\n1 0.93\n', expectedOutput: 'TP=6 FP=0 FN=0 TN=6\naccuracy=1.000\nprecision=1.000\nrecall=1.000\nf1=1.000', isHidden: true },
          { input: '0\n1 0.3\n0 0.0\n0 0.25\n1 0.9\n0 0.6\n0 0.15\n1 0.7\n0 0.05\n0 0.45\n0 0.33\n0 0.8\n', expectedOutput: 'TP=3 FP=8 FN=0 TN=0\naccuracy=0.273\nprecision=0.273\nrecall=1.000\nf1=0.429', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_INTERVIEW_QUESTION',
    notes: `Classification questions fill the middle of most data-science interviews — fintech and NBFCs ask about default
models, telecoms and subscription apps about churn, e-commerce about fraud and returns. The interviewer wants
three things: you know what the model outputs, you distrust accuracy, and you can turn a probability into a
business decision. Three questions, model answers, follow-ups.

## 1. "Explain logistic regression. Why not just use linear regression on a 0/1 target?"

**Model answer.** "Logistic regression computes a linear score — the log-odds — from the features and passes it
through the sigmoid, so the output is a probability between 0 and 1. It's fitted by minimising log loss, which
heavily penalises confident wrong predictions and so tends to produce honest probabilities. Linear regression on a
0/1 target can predict values below 0 or above 1, assumes constant-variance errors that a binary target can't have,
and lets extreme rows pull the line around.

Each coefficient is a change in log-odds per unit of the feature, so e to the coefficient is an odds ratio. In a
loan-default model, a prior default had an odds ratio of about 2.3 — the odds of default multiplied by 2.3, which for
a 10%-risk applicant is about 20%."

**Follow-ups:**
- *"Is logistic regression a linear model?"* Its decision boundary is linear in the features — log-odds is linear
  — but probability is an S-shaped function of them. Interactions or polynomial features make the boundary curve.
- *"What does regularisation do here?"* scikit-learn applies L2 by default (C = 1.0; smaller C = stronger penalty).
  It shrinks coefficients, which helps with many or correlated features — and means features should be scaled.

## 2. "Your dataset is 2% fraud. How do you build and evaluate the model?"

**Model answer.** "First I'd make sure I'm not fooled: a model that never predicts fraud is 98% accurate, so accuracy
is out. I'd stratify the train/test split and the CV folds, look at the confusion matrix, and use precision, recall
and the precision-recall curve — average precision, whose random baseline is 2%, not 0.5.

For the model, I'd start with an unweighted logistic regression or a tree model and choose the threshold from the
business side — how many alerts the fraud team can review, what a missed fraud costs. If the model needs it, class
weights or resampling of the training data only, never before the split. I'd also remember that class weights distort
probabilities, so if anyone uses the score as a probability, I'd calibrate. And with fraud specifically, I'd split by
time, because fraud patterns change, and watch for label delay — chargebacks arrive weeks later."

**Follow-ups:**
- *"SMOTE or class weights?"* For linear models they behave similarly; class weights are simpler and need no
  synthetic data. Resampling must happen inside training folds.
- *"How would you explain precision vs recall to an operations head?"* "Of the transactions we block, how many were
  really fraud — and of all the fraud, how much did we catch. Blocking more catches more fraud but annoys more
  genuine customers."

## 3. "How would you choose the threshold for a churn model?"

**Model answer.** "From the costs, not from 0.5. I'd get three numbers from the business: what the retention offer
costs per customer, what a churner is worth, and how often the offer works. The break-even probability is cost
divided by value times success rate — with a ₹150 offer, ₹1,800 of value and a 30% success rate that's 0.28. Then I'd
check it empirically on out-of-fold predictions from the training data: tabulate customers targeted, churners reached
and net value at each threshold. In one case the best was 0.27 and earned about a third more than 0.5 on the held-out
set. If there's a capacity limit — say 400 calls a week — I'd simply rank by probability and take the top 400."

**Follow-ups:**
- *"What if the probabilities aren't calibrated?"* Then the break-even formula is off; I'd rely on the empirical
  threshold table, or recalibrate with \`CalibratedClassifierCV\` first.
- *"Would one threshold suit every customer?"* Not if values differ — a high-value postpaid customer is worth a more
  expensive offer. Then compute expected value per customer and target where it's positive.

## How to answer classification questions well

Always say the base rate. Always say what the probability will be used for. Always attach a business number — "the
right threshold earned a third more than 0.5" is what separates a practitioner from someone who has read the
documentation.`,
    mcqs: [
      mcq('An interviewer asks why linear regression is a poor choice for a 0/1 target. Which answer is strongest?', [
        ['It can predict outside 0–1 and its error assumptions do not fit a binary target', true],
        ['It cannot be fitted at all when the target column only contains zeros and ones', false],
        ['It always gives lower accuracy than logistic regression on the same features', false],
        ['It requires the features to be binary as well as the target, which is rare', false],
      ], 'A line fitted to 0/1 gives "probabilities" below 0 and above 1 and assumes errors a binary target cannot have. Logistic regression fixes both with the sigmoid and log loss.'),
      mcq('For a 2% fraud problem, which evaluation plan is best?', [
        ['Stratified splits, confusion matrix, precision–recall and average precision', true],
        ['Accuracy on a random split, because it is the easiest to explain to people', false],
        ['ROC AUC alone, because it does not depend on the threshold that is chosen', false],
        ['Training accuracy, because the model must first fit the fraud cases well', false],
      ], 'Accuracy is 98% for a do-nothing model. Stratification keeps the fraud share stable; precision, recall and average precision describe performance on the rare class.'),
      mcq('A retention offer costs ₹150, saves 30% of churners who get it, and a churner is worth ₹1,800. What threshold does break-even give?', [
        ['About 0.28', true],
        ['About 0.08', false],
        ['About 0.50', false],
        ['About 0.30', false],
      ], 'Target when p × 0.30 × 1,800 > 150, i.e. p > 150 / 540 ≈ 0.278. 0.08 ignores the success rate; 0.30 confuses the success rate with the threshold.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_MINI_PROJECT',
    notes: `# Mini Project — Predicting Customer Churn for a Telecom

A telecom operator loses about one in eight prepaid customers a month. The retention team can send offers — but
offers cost money, and sending them to customers who would have stayed anyway is waste. You will build the churn
model and choose who gets the offer: framing, leakage checks, a baseline, logistic regression and a tree in
pipelines, class imbalance handled, a threshold chosen from the offer's economics, and a one-page summary for the
retention team.

## The data

Generate it with this script (seed fixed: 12,000 customers, 11.8% churned).

    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(2025)
    n = 12000
    tenure = rng.integers(1, 97, n)
    plan = rng.choice(["Prepaid 199", "Prepaid 299", "Prepaid 479", "Prepaid 719"], n, p=[0.30, 0.35, 0.25, 0.10])
    recharge = np.array([int(p.split()[1]) for p in plan])
    data_gb = np.round(rng.gamma(2.2, 6, n), 1)
    voice_min = np.round(rng.gamma(3.0, 120, n)).astype(int)
    drops = rng.poisson(2.5, n)
    complaints = rng.choice([0, 1, 2, 3], n, p=[0.70, 0.18, 0.08, 0.04])
    dual_sim = (rng.random(n) < 0.55).astype(int)
    circle = rng.choice(["Karnataka", "Tamil Nadu", "Maharashtra", "UP East", "Bihar", "Kerala"], n)
    handset = rng.choice(["4G", "5G", "Feature phone"], n, p=[0.55, 0.35, 0.10])
    z = (-2.6 - 0.03 * (tenure - 40) + 0.55 * complaints + 0.12 * (drops - 2.5) + 0.6 * dual_sim
         - 0.002 * (recharge - 300) - 0.02 * (data_gb - 13) + np.where(handset == "5G", -0.3, 0.0)
         + np.where(circle == "Bihar", 0.3, 0.0))
    churned = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)

    df = pd.DataFrame({
        "customer_id": [f"C{i:06d}" for i in range(1, n + 1)],
        "circle": circle, "plan": plan, "monthly_recharge": recharge, "tenure_months": tenure,
        "data_gb_month": data_gb, "voice_min_month": voice_min, "call_drops_month": drops,
        "complaints_90d": complaints, "dual_sim": dual_sim, "handset": handset,
        "port_out_request": np.where(churned == 1, rng.random(n) < 0.7, rng.random(n) < 0.01).astype(int),
        "days_since_last_recharge": np.where(churned == 1, rng.integers(25, 60, n), rng.integers(0, 32, n)),
        "churned": churned,
    })
    df.loc[rng.choice(n, 300, replace=False), "data_gb_month"] = np.nan
    df.to_csv("telecom_churn.csv", index=False)

The export was taken at the **end** of the month the label describes. Your notebook must decide, column by column,
what would be known at the **start** of that month, when the model will run.

| Column | Meaning |
|---|---|
| customer_id | Unique customer ID |
| circle | Telecom circle (region) |
| plan, monthly_recharge | Current prepaid plan and its price in ₹ |
| tenure_months | Months since activation |
| data_gb_month, voice_min_month | Average monthly usage over the last three months; some data usage missing |
| call_drops_month | Average dropped calls per month |
| complaints_90d | Complaints to customer care in the last 90 days |
| dual_sim | 1 if the handset has another operator's SIM active |
| handset | 4G, 5G or feature phone |
| port_out_request | 1 if the customer requested to port their number out |
| days_since_last_recharge | Days since the last recharge, as of the export date |
| churned | **Target**: 1 if the customer did not recharge in the month |

**The economics (from the retention team):** the offer is ₹100 of talk-time and data; a customer who stays is worth
₹880 of margin (8 months × ₹110); the offer keeps 25% of the churners who receive it. Each offer costs ₹100 whoever
receives it.

## Tasks

1. **Frame it.** The prediction moment, the target, the decision the score drives, and the success metric for the
   business (net retention value in ₹) and for the model.
2. **Leakage audit.** For every column, when is it known? Show the effect on CV AUC of including and excluding any
   suspicious column, and drop what leaks.
3. **Split.** Stratified train/test split before any modelling.
4. **Baseline.** A \`DummyClassifier\` and a one-rule baseline of your choice (e.g. "complaints ≥ 2"). Report recall,
   precision and value at the economics above.
5. **Models in pipelines.** Logistic regression (scaled numerics, one-hot categoricals, imputation) and a decision
   tree with depth or \`ccp_alpha\` chosen by CV. Compare by CV ROC AUC and average precision (mean ± sd).
6. **Imbalance.** Compare an unweighted model with \`class_weight="balanced"\`: AUC, average precision and mean
   predicted probability vs the true churn rate. State which you will use and why.
7. **Threshold.** Compute the break-even probability from the economics. Choose the threshold on out-of-fold
   training predictions with a table of targeted customers, churners reached and net value. Then evaluate once on the
   test set: confusion matrix, precision, recall and net value, compared with offering everyone, offering no one and
   a 0.5 threshold.
8. **Explain.** The five strongest drivers (odds ratios from the logistic model, rules from the tree), in words the
   retention team uses.

## Deliverables

1. **\`churn.ipynb\`** — runs top to bottom after "Restart & Run All".
2. **\`retention_summary.pdf\`** (or .docx), **one page** — who to target and how many per month, the expected value
   per 1,000 customers with the assumption stated, what drives churn, what the model cannot do, next steps.
3. **\`README.md\`** — how to run it; library versions.

## Acceptance criteria

- The leakage audit names both leaking columns, shows their effect on AUC, and the final model uses neither.
- All preprocessing is inside a \`Pipeline\`; the split is stratified; the test set is used once.
- Hyperparameters and the threshold are chosen on training data (CV or out-of-fold predictions).
- Accuracy is never the headline metric; the confusion matrix at the chosen threshold is shown.
- The break-even probability is computed and compared with the empirical best threshold.
- Net value on the test set is reported against "offer everyone", "offer no one" and the 0.5 threshold.
- If class weights are used, the summary does not present the scores as probabilities without calibration.
- The one-page summary leads with the decision and uses no unexplained jargon.`,
    mcqs: [
      mcq('The churn export contains days_since_last_recharge measured at the end of the month being predicted. What should the project do?', [
        ['Treat it as leakage, or rebuild it as of the start of the prediction month', true],
        ['Keep it, because recharge behaviour is the strongest signal for churn', false],
        ['Keep it, but standardise it so that the model does not over-rely on it', false],
        ['Use it as the target instead, since it is easier to predict than churn', false],
      ], 'As of the export date, a churner has gone 25+ days without recharging — the column describes the outcome. A version computed at the start of the month would be legitimate.'),
      mcq('With a ₹100 offer, ₹880 of value per retained customer and a 25% success rate, what is the break-even churn probability?', [
        ['About 0.45', true],
        ['About 0.11', false],
        ['About 0.25', false],
        ['About 0.50', false],
      ], 'Offer when p × 0.25 × 880 > 100, i.e. p > 100 / 220 ≈ 0.455. With these economics the offer pays only for high-risk customers.'),
    ],
    assignment: {
      title: 'Predicting Customer Churn for a Telecom',
      description: 'Build a prepaid churn model with a leakage audit, baselines, logistic regression and a tree in pipelines, handle the imbalance, choose a threshold from the retention offer\'s economics, and write a one-page summary for the retention team.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`churn.ipynb\` — generates the data with the brief's script, then: framing; a column-by-column leakage audit
   with the AUC effect of the leaking columns; a stratified split; baselines; logistic regression and a tuned tree
   in pipelines compared by CV (ROC AUC and average precision, mean ± sd); the class-weight comparison; break-even
   and empirical threshold selection on out-of-fold training predictions; one test-set evaluation with value against
   "offer everyone", "offer no one" and 0.5; and the drivers. It must run top to bottom after "Restart & Run All".
2. \`retention_summary.pdf\` or \`.docx\`, one page — decision first: who to target, how many a month, expected value,
   drivers, limits, next steps.
3. \`README.md\` — how to run it and the library versions (pandas, NumPy, scikit-learn).

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of the
notebook (for example: "Leaking columns: …, CV AUC with them …, without …").`,
      rubric: [
        { criterion: 'Framing and leakage', description: 'Prediction moment, target and decision are stated; every column is audited for when it is known; both leaking columns are found, their effect on AUC shown, and they are excluded.', maxPoints: 25 },
        { criterion: 'Honest modelling', description: 'Stratified split before modelling; all preprocessing in pipelines; baselines; logistic regression and a CV-tuned tree compared by CV ROC AUC and average precision with spread; imbalance handled with the probability consequences explained.', maxPoints: 25 },
        { criterion: 'Threshold and value', description: 'Break-even computed from the economics; threshold chosen on out-of-fold training predictions with a value table; one test evaluation with confusion matrix and value against offer-everyone, offer-no-one and 0.5.', maxPoints: 25 },
        { criterion: 'Communication', description: 'One-page summary leads with the decision, gives volumes and ₹ value with stated assumptions, explains drivers in plain words and states limits; notebook reproducible with README and versions.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_CLASSIFICATION_CHECKPOINT',
    notes: `Ten questions across the topic: logistic regression and odds, kNN and Naive Bayes, decision trees, imbalanced
targets and thresholds. Several give numbers — work them out before you look at the options.`,
    checkpoint: [
      mcq('A borrower has P(default) = 0.20, so odds of 0.25. A feature with odds ratio 2.0 increases by one unit. What is the new probability?', [
        ['About 0.33', true],
        ['About 0.40', false],
        ['About 0.50', false],
        ['About 0.22', false],
      ], 'New odds = 0.25 × 2 = 0.5, so p = 0.5 / 1.5 = 0.333. Doubling the odds does not double the probability.'),
      mcq('Why must features be scaled before kNN, but not before a decision tree?', [
        ['kNN compares distances across features; a tree compares one feature with a threshold', true],
        ['Trees scale the features automatically while kNN leaves them in their raw units', false],
        ['kNN cannot handle negative values, which scaling removes from every feature', false],
        ['Trees are always more accurate, so scaling cannot make any difference to them', false],
      ], 'A tree split looks at one feature at a time, so units do not matter. A distance adds every feature\'s differences, so the largest-unit feature dominates.'),
      mcq('A spam filter must be trained on 2 million short messages each night in minutes. Which model is the natural first choice?', [
        ['Multinomial Naive Bayes on word counts', true],
        ['k-nearest neighbours on word counts', false],
        ['An unlimited-depth decision tree', false],
        ['Gaussian Naive Bayes on message length', false],
      ], 'Naive Bayes trains with a single counting pass and handles very many sparse word features well. kNN would be slow at prediction time; a deep tree overfits.'),
      mcq('A churn tree\'s training accuracy is 1.000 and its test AUC 0.57; at depth 4 they are 0.816 and 0.72. Which conclusion is right?', [
        ['The unlimited tree memorised training data; depth 4 generalises better', true],
        ['The unlimited tree is better, because it explains every training customer', false],
        ['Both are equally good, since accuracy and AUC measure different things', false],
        ['Depth 4 is underfitting, because its training accuracy is below 0.9', false],
      ], 'Perfect training accuracy with poor test AUC is overfitting. Depth (or pruning) should be chosen by cross-validated performance.'),
      mcq('A fraud model flags 50 transactions; 20 are fraud. There were 80 frauds in total. What are precision and recall?', [
        ['Precision 0.40 and recall 0.25', true],
        ['Precision 0.25 and recall 0.40', false],
        ['Precision 0.40 and recall 0.63', false],
        ['Precision 0.20 and recall 0.25', false],
      ], 'Precision = 20 flagged frauds / 50 flagged = 0.40. Recall = 20 caught / 80 frauds = 0.25.'),
      mcq('With precision 0.40 and recall 0.25, what is F1?', [
        ['About 0.31', true],
        ['About 0.33', false],
        ['About 0.10', false],
        ['About 0.65', false],
      ], 'F1 = 2 × 0.40 × 0.25 / (0.40 + 0.25) = 0.20 / 0.65 ≈ 0.308. The harmonic mean sits below the arithmetic mean (0.325), pulled toward the smaller value.'),
      mcq('On a 3% default target, a model has ROC AUC 0.83 and average precision 0.23. How should the 0.23 be read?', [
        ['About eight times the 0.03 a random ranking would get — useful, if modest', true],
        ['Far worse than chance, since a random model would score 0.5 on this metric', false],
        ['A sign of leakage, since AP and AUC should be equal for a good model', false],
        ['The share of defaulters the model catches at a 0.5 threshold', false],
      ], 'Average precision for a random ranking equals the prevalence. 0.23 against 0.03 is a large lift, even though it looks small next to the AUC.'),
      mcq('Which practice avoids leakage when handling an imbalanced target?', [
        ['Resampling only the training data, inside each cross-validation fold', true],
        ['Oversampling the minority class across the whole dataset before splitting', false],
        ['Balancing the test set so that it has equal numbers of both classes', false],
        ['Choosing the class weights that give the best score on the test set', false],
      ], 'Resampling before the split or touching the test set lets copies or choices based on test rows leak into evaluation.'),
      mcq('A model is retrained with class_weight="balanced". Which quantity stays roughly the same?', [
        ['ROC AUC — the ranking of customers barely changes', true],
        ['Recall at a 0.5 threshold, which is unaffected by weights', false],
        ['The mean predicted probability across the test set', false],
        ['The number of customers predicted positive at 0.5', false],
      ], 'Re-weighting shifts the scores upward for the minority class, changing recall, counts and mean probability at 0.5; the ordering, which AUC measures, is largely unchanged.'),
      mcq('An offer costs ₹50, a retained customer is worth ₹1,000, and the offer retains 20% of churners who get it. Above what P(churn) should it be sent?', [
        ['0.25', true],
        ['0.05', false],
        ['0.20', false],
        ['0.50', false],
      ], 'Expected gain p × 0.20 × 1,000 = 200p exceeds ₹50 when p > 0.25. 0.05 ignores the success rate; 0.20 is the success rate itself.'),
    ],
  },
];
