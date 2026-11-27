/**
 * Career-track content: the maths machine learning uses, and the workflow that keeps a model honest (Data
 * Science + AI, batch S1).
 *
 * DS_MATH_ML — vectors and matrices as data, derivatives and gradients, loss functions and gradient descent,
 * and probability for ML (likelihood, Bayes' rule, predicting a probability). Builds on Year 1's T_ML_INTRO
 * (what learning from data means, training vs testing) and on the Data Analytics statistics packs: here the
 * ideas become NumPy code a student can run, and the PRACTICE unit is an auto-graded least-squares fit in
 * plain Python (the grader has no NumPy).
 * DS_ML_WORKFLOW — framing a problem, splits and leakage, baselines, the scikit-learn API, pipelines with
 * ColumnTransformer, cross-validation and search, and over/underfitting.
 *
 * Every number shown was computed with NumPy 2.5, pandas 3.0 and scikit-learn 1.9 with the seeds quoted; the
 * APIs used all exist in scikit-learn 1.4+. The maths is stated the standard way: MSE = (1/n)Σ(ŷ − y)², its
 * gradient (2/n)Σ(ŷ − y)x, log loss −(1/n)Σ[y log p + (1 − y) log(1 − p)], and the normal equation
 * θ = (XᵀX)⁻¹Xᵀy.
 *
 * DS_MATH_ML is single-skill, so its questions carry no skillKey. DS_ML_WORKFLOW is two-skill: every
 * checkpoint question names ML_CONCEPTS or ML_OVERFITTING with ck() — ML_OVERFITTING for the BIAS_VARIANCE
 * unit (trackSkillAttribution.ts), and both across the topic CHECKPOINT.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CON = 'ML_CONCEPTS';
const OVR = 'ML_OVERFITTING';

export const TRACK_DS_MATH_WORKFLOW_BUNDLES: PilotBundle[] = [
  /* ══ DS_MATH_ML ══════════════════════════════════════════════════════════════════════════ */

  /* ── VECTORS_MATRICES ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_VECTORS_MATRICES',
    notes: `Year 1 said a model "learns from data". This topic opens the box: what the data looks like to the
model, how the model measures how wrong it is, and how it gets less wrong. It starts with the simplest idea —
**a row of a table is a vector, and the whole table is a matrix** — because every model in scikit-learn takes
a matrix in and does matrix arithmetic on it.

## A row is a vector

A flat for sale in Bengaluru, described by four numbers: area (in hundreds of sq ft), bedrooms, age in years,
and distance to the nearest metro station in km.

    import numpy as np

    flat = np.array([12.5, 2, 8, 1.2])
    print(flat.shape, flat.ndim)       # (4,) 1

A vector is just an ordered list of numbers. The order matters: position 0 is always area, position 3 is
always metro distance. A model never sees column names — only positions.

## The dot product is a linear model

Suppose a pricing model says each 100 sq ft adds ₹6 lakh, each bedroom ₹4 lakh, each year of age takes away
₹0.5 lakh, each km from the metro takes away ₹3 lakh, plus a base of ₹10 lakh. Those weights are a vector too:

    w = np.array([6.0, 4.0, -0.5, -3.0])    # ₹ lakh per unit of each feature
    b = 10.0                                 # the intercept (bias)

    flat @ w + b          # 85.4
    np.dot(flat, w) + b   # 85.4  (the same thing)

The **dot product** multiplies matching positions and adds them up:
12.5×6 + 2×4 + 8×(−0.5) + 1.2×(−3) = 75 + 8 − 4 − 3.6 = 75.4, plus 10 = **₹85.4 lakh**.

That one line *is* linear regression's prediction: ŷ = w·x + b. Logistic regression, a neural network's
first layer and a recommender's score all start with a dot product. When someone says a model "weights the
features", this is what they mean.

## A table is a matrix

Three flats, one per row:

    X = np.array([
        [12.5, 2, 8, 1.2],
        [18.0, 3, 2, 0.5],
        [ 9.0, 1, 15, 4.0],
    ])
    X.shape          # (3, 4)  — 3 rows (samples), 4 columns (features)
    X @ w + b        # array([ 85.4, 127.5,  48.5])

**Matrix–vector multiplication** does the dot product of every row with w at once. That is how a model
predicts 10 lakh rows in one call instead of a Python loop: \`model.predict(X)\` is, for a linear model,
exactly \`X @ coef_ + intercept_\`.

scikit-learn's convention, worth memorising: **X has shape (n_samples, n_features)**, and **y has shape
(n_samples,)**. Rows are examples, columns are features.

    X[:, 0]     # array([12.5, 18. ,  9. ])        — one feature (area) for every flat
    X[1]        # array([18. ,  3. ,  2. ,  0.5])  — every feature for one flat

## Shapes must line up

Matrix multiplication (A @ B) needs A's number of columns to equal B's number of rows. (3, 4) @ (4,) works and
gives (3,). Give it a 3-element weight vector and NumPy refuses:

    X @ np.array([6.0, 4.0, -0.5])
    # ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, ...
    # (size 3 is different from 4)

That error almost always means a feature went missing or an extra one appeared between training and
prediction. Read the shapes first, not the stack trace.

A weight **matrix** produces several outputs at once — the start of a neural network layer:

    W = np.array([[6.0, 1.0], [4.0, 0.5], [-0.5, 0.0], [-3.0, 2.0]])   # (4, 2)
    (X @ W).shape     # (3, 2): two numbers per flat

The **transpose** swaps rows and columns: X.T has shape (4, 3), and **X.T @ X has shape (4, 4)** — one row
and column per feature. You will meet it again in the normal equation for linear regression.

## Element-wise is not matrix multiplication

    A = np.array([[1, 2], [3, 4]]);  B = np.array([[10, 0], [0, 1]])
    A * B     # [[10, 0], [0, 4]]    element by element
    A @ B     # [[10, 2], [30, 4]]   rows of A dotted with columns of B

\`*\` multiplies matching positions; \`@\` is the matrix product. Mixing them up gives an answer of the right
shape and the wrong value — the worst kind of bug.

## Broadcasting: one operation on every row

Subtracting the column means from every row (centring, the first half of standardising):

    X.mean(axis=0)               # array([13.1667,  2.    ,  8.3333,  1.9   ])
    (X - X.mean(axis=0)).round(3)
    # [[-0.667  0.    -0.333 -0.7  ]
    #  [ 4.833  1.    -6.333 -1.4  ]
    #  [-4.167 -1.     6.667  2.1  ]]

A (3, 4) array minus a (4,) array: NumPy "broadcasts" the 4 means down every row. axis=0 means "collapse the
rows", giving one value per column.

## Norms: how far apart two rows are

The **Euclidean norm** of a vector is its length, √(Σ vᵢ²). The norm of the difference between two rows is
the distance between two flats — the idea behind k-nearest neighbours and clustering:

    a, c = X[0], X[1]
    np.linalg.norm(a - c)             # 8.2304
    np.linalg.norm(a - c, ord=1)      # 13.2   (L1, "Manhattan": sum of absolute differences)

Distances have a trap. Measure area in plain sq ft instead of hundreds:

    np.linalg.norm(np.array([1200, 2]) - np.array([1250, 4]))   # 50.04

A 50 sq ft difference swamps a two-bedroom difference, purely because of units. **Any model that uses
distances or gradients cares about feature scale**, which is why standardising features comes up again and
again in this track.

## Cosine similarity: same direction, different size

Two customers' purchases across four categories (electronics, fashion, grocery, books):

    u = np.array([5, 0, 3, 1]);  v = np.array([4, 1, 2, 0])
    u @ v / (np.linalg.norm(u) * np.linalg.norm(v))     # 0.959

Cosine similarity ignores how much each bought and measures whether they buy the **same mix** — 1 is the same
direction, 0 is nothing in common. Recommenders and text embeddings (later in this track) use it constantly.

## What to carry forward

- A row is a vector; the dataset is a matrix of shape (n_samples, n_features).
- A linear model's prediction is a dot product plus an intercept; X @ w + b predicts every row at once.
- Check shapes before anything else; know \`*\` from \`@\`.
- Distances depend on units, so scale features before any distance- or gradient-based model.`,
    mcqs: [
      mcq('A model has weights [2, −1, 0.5] and intercept 3. What does it predict for the row [4, 6, 10]?', [
        ['10.0', true],
        ['8.0', false],
        ['13.0', false],
        ['5.0', false],
      ], 'The dot product is 4×2 + 6×(−1) + 10×0.5 = 8 − 6 + 5 = 7, and adding the intercept 3 gives 10.'),
      mcq('A training matrix X has shape (5000, 12). What does each of the 12 columns hold?', [
        ['One feature, measured for all 5,000 examples', true],
        ['One example, described by 5,000 measurements', false],
        ['One of twelve model weights learned in training', false],
        ['The target value for one group of the examples', false],
      ], 'scikit-learn\'s convention is (n_samples, n_features): rows are examples and columns are features, so 12 features are measured for 5,000 rows.'),
      mcq('Two delivery partners are compared by distance on [trips per day, earnings in ₹ per month]. Why is the distance misleading?', [
        ['Earnings run to thousands, so they swamp the trips column', true],
        ['Euclidean distance only works when there are three features', false],
        ['A trip count is a whole number, so it cannot be in a vector', false],
        ['Distance ignores the earnings because they are the larger value', false],
      ], 'A ₹2,000 earnings gap adds 2,000 to the difference while a 5-trip gap adds 5, so the result reflects units, not similarity. Standardise both columns first.'),
    ],
    checkpoint: [
      mcq('What is the shape of `X @ w` when X has shape (200, 6) and w has shape (6,)?', [
        ['(200,)', true],
        ['(6,)', false],
        ['(200, 6)', false],
        ['(6, 200)', false],
      ], 'Each of the 200 rows is dotted with the 6 weights, giving one number per row — a vector of 200 predictions.'),
      mcq('For A = [[1, 2], [3, 4]] and B = [[0, 1], [1, 0]], what does `A * B` give in NumPy?', [
        ['[[0, 2], [3, 0]]', true],
        ['[[2, 1], [4, 3]]', false],
        ['[[3, 4], [1, 2]]', false],
        ['[[0, 1], [1, 0]]', false],
      ], 'The * operator multiplies matching positions: 1×0, 2×1, 3×1, 4×0. The matrix product A @ B would swap the columns instead, giving [[2, 1], [4, 3]].'),
      mcq('What does cosine similarity close to 1 between two customers\' purchase vectors tell you?', [
        ['They buy a similar mix of categories, whatever the amounts', true],
        ['They spent almost exactly the same total amount of money', false],
        ['They are close together when measured by Euclidean distance', false],
        ['They bought from completely different sets of categories', false],
      ], 'Cosine similarity measures the angle between vectors, not their length, so a small and a large spender with the same mix score near 1.'),
    ],
  },

  /* ── DERIVATIVES_GRADIENTS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_DERIVATIVES_GRADIENTS',
    notes: `A model learns by asking, over and over, one question: **if I nudge this weight, does my error go up
or down, and how fast?** The answer is a derivative. You do not need to be good at calculus to train models —
libraries compute derivatives for you — but you need to know what the number means, because learning rates,
"vanishing gradients" and "the loss is not going down" are all statements about derivatives.

## A derivative is a rate of change

For f(x) = x², the derivative is f′(x) = 2x. At x = 3 the slope is 6: nudge x up by a tiny amount and f goes
up about 6 times as much. You can check any derivative numerically, which is how ML engineers test hand-written
gradient code:

    def f(x): return x ** 2
    def num_deriv(f, x, h=1e-5):
        return (f(x + h) - f(x - h)) / (2 * h)      # central difference

    round(num_deriv(f, 3.0), 6)      # 6.0

The rules you need, and nothing more:

| Function | Derivative | Where ML uses it |
|---|---|---|
| c (a constant) | 0 | intercept terms |
| ax | a | linear models |
| x² | 2x | squared error |
| (ax + b − y)² | 2a(ax + b − y) | one row's squared error, by the chain rule |
| log x | 1/x | log loss |
| σ(z) = 1/(1 + e⁻ᶻ) | σ(z)(1 − σ(z)) | logistic regression, neural networks |

The **chain rule** — the derivative of an outer function times the derivative of the inner one — is the only
technique that matters. It is also all that "backpropagation" is.

## The loss is a function of the weights

A food-delivery app wants to predict delivery minutes from distance. Five deliveries:

    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])        # distance, km
    y = np.array([14.0, 19.0, 26.0, 29.0, 37.0])    # minutes

The model is ŷ = w·x + b. The **loss** — mean squared error — measures how wrong a choice of w and b is:

    MSE(w, b) = (1/n) Σ (w·xᵢ + b − yᵢ)²

The key shift in thinking: **the data is fixed; the loss is a function of the weights.** Try different
slopes w with b fixed at 8:

    def mse(w, b): return np.mean((w * x + b - y) ** 2)

    w     MSE     slope of MSE in w
    3     78.4    -58.4
    4     31.0    -36.4
    5      5.6    -14.4
    6      2.2      7.6
    7     20.8     29.6

The loss falls and then rises — a bowl. Where the derivative is negative, increasing w lowers the loss; where
it is positive, increasing w raises it. The bottom of the bowl is where the derivative is **zero**.

## Partial derivatives and the gradient

With two weights, there are two derivatives. A **partial derivative** asks how the loss changes when you nudge
one weight and hold the others still. By the chain rule:

    ∂MSE/∂w = (2/n) Σ (ŷᵢ − yᵢ) · xᵢ
    ∂MSE/∂b = (2/n) Σ (ŷᵢ − yᵢ)

    def grad(w, b):
        err = w * x + b - y
        return 2 * np.mean(err * x), 2 * np.mean(err)

    grad(5.0, 8.0)      # (-14.4, -4.0)

The **gradient** is the vector of all partial derivatives: here (−14.4, −4.0). It points in the direction in
which the loss **rises fastest**. So the direction that lowers it fastest — "downhill" — is the negative
gradient: increase w (a lot) and b (a little). That is the whole idea behind gradient descent, the next unit.

Check the hand-derived gradient numerically before trusting it:

    num_deriv(lambda w: mse(w, 8.0), 5.0)    # -14.4000000000588
    num_deriv(lambda b: mse(5.0, b), 8.0)    # -4.0000000003815

They agree to nine decimal places, so the formula is right. A gradient check like this catches sign errors and
missing factors of 2 before they waste an afternoon.

## At the minimum the gradient is zero

The least-squares line for this data (from np.polyfit) is w = 5.6, b = 8.2:

    np.polyfit(x, y, 1)      # array([5.6, 8.2])
    mse(5.6, 8.2)            # 0.88
    grad(5.6, 8.2)           # (-7.5e-14, -2.6e-14) — zero, up to rounding

At the bottom of the bowl every partial derivative is zero. For linear regression you can solve "gradient =
0" exactly (the normal equation, next unit); for most models you cannot, so you walk downhill instead.

## The sigmoid and its derivative

Logistic regression squashes a score z into a probability with the sigmoid σ(z) = 1/(1 + e⁻ᶻ):

    z      σ(z)     σ′(z) = σ(1 − σ)
    0.0    0.5      0.25
    2.0    0.8808   0.105
    5.0    0.9933   0.0066

The slope is largest (0.25) at z = 0 and almost zero far from it. When a neuron's input sits far out on the
flat part, its gradient is tiny and it learns very slowly — the "vanishing gradient" you will meet in deep
learning. The table above was checked with num_deriv too.

## What to carry forward

- A derivative says how fast the loss changes when one weight is nudged; its sign says which way is downhill.
- The gradient collects all the partial derivatives; the negative gradient is the steepest way down.
- For MSE: ∂/∂w = (2/n)Σ(ŷ − y)x and ∂/∂b = (2/n)Σ(ŷ − y).
- Check hand-written gradients with a central difference.`,
    mcqs: [
      mcq('At w = 4 the derivative of a model\'s loss with respect to w is −36.4. What does that say?', [
        ['Increasing w a little will lower the loss', true],
        ['Decreasing w a little will lower the loss', false],
        ['The loss is at its minimum value at w = 4', false],
        ['The loss at w = 4 is equal to −36.4 exactly', false],
      ], 'A negative derivative means the loss falls as w rises, so the step that helps is to increase w. The derivative is a slope, not the loss itself.'),
      mcq('Using the chain rule, what is the derivative of (3w − 7)² with respect to w?', [
        ['6(3w − 7)', true],
        ['2(3w − 7)', false],
        ['3(3w − 7)²', false],
        ['18w − 7', false],
      ], 'The outer derivative is 2(3w − 7) and the inner derivative of 3w − 7 is 3; multiplying gives 6(3w − 7), which expands to 18w − 42.'),
      mcq('Why does a gradient check compare a hand-written gradient with (f(w + h) − f(w − h)) / 2h?', [
        ['The central difference approximates the true slope, so a mismatch reveals a bug', true],
        ['The central difference is exact, so it should replace the formula in training', false],
        ['The check makes training converge faster by averaging the two slope estimates', false],
        ['The check is required by NumPy before an array can hold a gradient value', false],
      ], 'A numerical estimate is slow and approximate but independent of your algebra, so agreement to many decimals means the formula is right; it is a test, not a training method.'),
    ],
    checkpoint: [
      mcq('For MSE with ŷ = w·x + b, which expression is ∂MSE/∂b?', [
        ['(2/n) Σ (ŷᵢ − yᵢ)', true],
        ['(2/n) Σ (ŷᵢ − yᵢ) · xᵢ', false],
        ['(1/n) Σ (ŷᵢ − yᵢ)²', false],
        ['(2/n) Σ (yᵢ − ŷᵢ) · b', false],
      ], 'b enters each prediction with coefficient 1, so the chain rule gives 2(ŷ − y) × 1 per row, averaged. The version with xᵢ is the derivative for w.'),
      mcq('The gradient of a loss at the current weights is (−3.0, 0.5). Which change moves downhill fastest?', [
        ['Increase the first weight and decrease the second', true],
        ['Decrease the first weight and increase the second', false],
        ['Increase both of the weights by the same amount', false],
        ['Leave both, since a mixed-sign gradient is zero', false],
      ], 'The gradient points uphill; downhill is its negative, (3.0, −0.5): raise the first weight and lower the second, mostly the first.'),
      mcq('Why does a sigmoid unit with input z = 8 learn very slowly?', [
        ['σ′(8) is close to zero, so its gradient is tiny', true],
        ['σ(8) is close to zero, so its output is ignored', false],
        ['Inputs above 5 make the sigmoid undefined there', false],
        ['The gradient at z = 8 is larger than at z = 0', false],
      ], 'σ(8) ≈ 0.9997, so σ′ = σ(1 − σ) ≈ 0.0003. A gradient that small barely moves the weights — the vanishing-gradient problem.'),
    ],
  },

  /* ── GRADIENT_DESCENT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_GRADIENT_DESCENT',
    notes: `The previous unit gave a model a way to know which way is downhill. **Gradient descent** is the
walk: compute the gradient, take a small step against it, repeat. It trains linear and logistic regression at
scale, every neural network, and gradient-boosted trees in a modified form. This unit writes it by hand, so
that when a library's loss "explodes" or "will not go down" you know what is happening inside.

## Two loss functions

**Mean squared error**, for predicting a number (₹, minutes, quintals):

    MSE = (1/n) Σ (ŷᵢ − yᵢ)²

Squaring makes every error positive and punishes big misses far more than small ones: an error of 10 costs 100,
an error of 2 costs 4.

**Log loss** (binary cross-entropy), for predicting a probability of a yes/no outcome:

    log loss = −(1/n) Σ [ yᵢ log pᵢ + (1 − yᵢ) log(1 − pᵢ) ]

For a row whose true label is 1, the cost is −log p: tiny when the model said p = 0.99 (0.0101), huge when it
said p = 0.01 (4.6052). Four loan applicants, three of whom defaulted (y = 1):

    p = np.array([0.9, 0.6, 0.2, 0.05]);  t = np.array([1, 1, 0, 1])
    ll = -(t * np.log(p) + (1 - t) * np.log(1 - p))
    ll.round(4)          # [0.1054 0.5108 0.2231 2.9957]
    ll.mean().round(4)   # 0.9588   (sklearn.metrics.log_loss gives the same)

One confident miss — p = 0.05 for someone who defaulted — costs more than the other three together. Log loss
rewards **honest probabilities**, not just right labels.

## The update rule

    w ← w − η · ∂L/∂w
    b ← b − η · ∂L/∂b

η (eta) is the **learning rate**: how big a step to take. Minus, because the gradient points uphill.

## Gradient descent, written by hand

Same delivery data as before (distance in km → minutes):

    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    y = np.array([14.0, 19.0, 26.0, 29.0, 37.0])

    def gd(lr, steps, w=0.0, b=0.0):
        for i in range(steps):
            err = w * x + b - y
            dw = 2 * np.mean(err * x)
            db = 2 * np.mean(err)
            w -= lr * dw
            b -= lr * db
        return w, b

The first three steps with lr = 0.05, starting from w = b = 0:

    step   dw       db      → w      b      MSE
    1     -172.4   -50.0     8.62   2.5    30.41
    2       32.24    6.72    7.008  2.164   8.128
    3       -5.24   -3.624   7.27   2.345   7.171

The first step overshoots (w jumps to 8.62, past the answer 5.6), the gradient flips sign, and the steps settle.
After 1,000 steps it lands on **w = 5.6000, b = 8.2000, MSE 0.88** — exactly what np.polyfit gave.

## The learning rate decides everything

    lr = 0.05     step 500: w=5.6003 b=8.1988 mse=0.8800       converged
    lr = 0.01     step 500: w=5.9146 b=7.0644 mse=1.1147       still walking
                  step 2000: w=5.6020 b=8.1929 mse=0.8800
    lr = 0.1      step 5:  w=41.8337  mse=15427.0140
                  step 20: w=-3744.7069 mse=179248375.0718     diverged

- **Too small**: correct but slow — 2,000 steps to get where 500 got.
- **Right**: fast and stable.
- **Too large**: every step overshoots by more than it corrects, so the weights swing wider and wider and the
  loss **explodes**. If your loss goes up, or becomes \`nan\` or \`inf\`, lower the learning rate first.

## Feature scale and the learning rate

Now predict flat price (₹ lakh) from area in **plain sq ft** (650 to 1,800):

    area  = np.array([650., 900., 1200., 1500., 1800.])
    price = np.array([42., 58., 75., 96., 112.])

With lr = 1e-6 the loss goes 33,354 → 171,107 → 877,813 → ... and ends in \`nan\` — diverged, because the
gradient for w is multiplied by area values in the thousands. With lr = 1e-7 it does not diverge, but after
1,000 steps b has barely moved from 0 and MSE is 1.454 instead of the best possible 0.886: one learning rate
cannot suit a weight on numbers in the thousands and an intercept on numbers near 1.

**Standardise** the feature — z = (area − mean) / std, mean 1,210, std 410.4 — and lr = 0.1 reaches MSE 0.8859
(the optimum) in 1,000 steps. This is why scikit-learn's gradient-based models (SGDRegressor, LogisticRegression,
MLPClassifier) are almost always preceded by a StandardScaler.

## The shortcut for linear regression: the normal equation

For MSE on a linear model, "gradient = 0" can be solved directly:

    θ = (XᵀX)⁻¹ Xᵀy

where X has a column of ones for the intercept:

    X = np.column_stack([np.ones_like(x), x])    # [[1, 1], [1, 2], ... ]
    np.linalg.solve(X.T @ X, X.T @ y)            # array([8.2, 5.6])  — b, then w

(\`np.linalg.solve\` is more stable than computing the inverse; \`np.linalg.lstsq\` is more stable still.)
scikit-learn's LinearRegression solves it directly in this spirit, which is why it needs no learning rate:

    from sklearn.linear_model import LinearRegression
    m = LinearRegression().fit(x.reshape(-1, 1), y)
    m.coef_, m.intercept_      # (array([5.6]), 8.2)

So why gradient descent at all? Solving needs the whole XᵀX matrix in memory and costs roughly the cube of the
number of features; gradient descent works on millions of rows a batch at a time, and works for losses (log loss,
neural networks) that have no closed-form answer.

## Batch, stochastic and mini-batch

The code above uses **all** rows for every step (batch gradient descent). **Stochastic** gradient descent (SGD)
uses one row per step — noisy but cheap; **mini-batch** uses, say, 32–512 rows. Deep learning is almost always
mini-batch. The noise is not all bad: it helps a network escape poor regions of a complicated loss surface.

## What to carry forward

- MSE for numbers, log loss for probabilities; log loss punishes confident mistakes hardest.
- Update: weight minus learning rate times gradient. Too large diverges; too small crawls.
- Scale features before gradient descent.
- Linear regression has a closed form; most models do not, so they descend.`,
    workedExample: `**Problem.** A crop-advisory start-up has five plots: fertiliser (kg per acre, already
standardised to z-scores) and yield (quintals per acre). Fit ŷ = w·z + b by gradient descent, choose a learning
rate, and confirm the answer.

**Step 1 — the data and the loss.**

    z = np.array([-1.414, -0.707, 0.0, 0.707, 1.414])
    q = np.array([15.0, 18.5, 20.0, 23.5, 26.0])

Loss: MSE = mean((w·z + b − q)²). Gradient: dw = 2·mean(err·z), db = 2·mean(err).

**Step 2 — reason about the learning rate before running anything.** z has mean 0 and standard deviation 1,
so both gradients are on the same scale. For MSE on standardised data a learning rate around 0.1 is a safe
start; anything above 1 is likely to diverge (the curvature here is about 2, and steps larger than 2/curvature
overshoot without settling).

**Step 3 — run it and watch the loss, not just the final answer.**

    w = b = 0.0
    for i in range(200):
        err = w * z + b - q
        w -= 0.1 * 2 * np.mean(err * z)
        b -= 0.1 * 2 * np.mean(err)

Because z has mean zero, b moves straight to the mean of q, 20.6, and w to the least-squares slope.

**Step 4 — confirm with the closed form.** np.polyfit(z, q, 1) gives the slope 3.819 and intercept 20.6;
gradient descent agrees to four decimals after 200 steps. When two independent methods agree, the code is
right.

**Step 5 — say what the numbers mean.** Yield rises about 3.8 quintals per acre for each standard deviation of
fertiliser, around a mean of 20.6. Convert back to kg if the agronomist asks: divide the slope by the
fertiliser's standard deviation in kg.

**What to take from it:** standardise, pick a moderate learning rate, plot or print the loss, and check against
a method you trust.`,
    mcqs: [
      mcq('A training loop prints losses 12.4, 48.9, 210.3, 1,004.7. What is the first thing to change?', [
        ['Lower the learning rate', true],
        ['Train for more steps', false],
        ['Raise the learning rate', false],
        ['Add more input features', false],
      ], 'A loss growing every step is the signature of steps that overshoot further each time. More steps make it worse; a smaller learning rate (and scaled features) fixes it.'),
      mcq('A borrower who defaulted (y = 1) was given p = 0.02 by the model. What is that row\'s log loss?', [
        ['About 3.91', true],
        ['About 0.02', false],
        ['About 0.98', false],
        ['About 0.31', false],
      ], 'For y = 1 the loss is −log p = −log 0.02 ≈ 3.91. A confident wrong probability is the most expensive mistake log loss can record.'),
      mcq('Why does scikit-learn\'s LinearRegression need no learning rate, while SGDRegressor does?', [
        ['It solves the least-squares problem directly instead of stepping', true],
        ['It always runs a fixed learning rate of 0.01 behind the scenes', false],
        ['It scales the features automatically, so any step size is safe', false],
        ['It only works with a single feature, where no steps are needed', false],
      ], 'Ordinary least squares has a closed-form solution (the normal equation, solved stably), so there is nothing to step. SGDRegressor descends the same loss iteratively.'),
    ],
    checkpoint: [
      mcq('With w = 2, a gradient ∂L/∂w = 4 and a learning rate of 0.1, what is w after one update?', [
        ['1.6', true],
        ['2.4', false],
        ['1.2', false],
        ['2.0', false],
      ], 'w ← w − η·gradient = 2 − 0.1 × 4 = 1.6. Subtracting moves against the gradient, which points uphill.'),
      mcq('Gradient descent on raw areas (650 to 1,800 sq ft) diverges at lr = 1e-6 and crawls at 1e-7. What fixes it?', [
        ['Standardise the area so a moderate learning rate suits every weight', true],
        ['Keep 1e-7 and run ten times as many steps until the loss is flat', false],
        ['Switch the loss from mean squared error to the mean absolute error', false],
        ['Multiply the area by 100 so the gradient becomes much larger', false],
      ], 'Raw areas make the slope\'s gradient thousands of times larger than the intercept\'s, so no single rate suits both. Standardised, lr = 0.1 converges in 1,000 steps.'),
      mcq('Which statement about log loss and accuracy is correct?', [
        ['Two models with equal accuracy can have very different log loss', true],
        ['A lower log loss always means a higher accuracy on the same data', false],
        ['Log loss only counts the rows that the model got wrong at 0.5', false],
        ['Log loss is the same as one minus accuracy, written as a log', false],
      ], 'Accuracy looks only at which side of 0.5 a probability falls; log loss scores the probability itself, so a model that is right but overconfident when wrong scores worse.'),
    ],
  },

  /* ── PROBABILITY_FOR_ML ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_PROBABILITY_FOR_ML',
    notes: `The statistics packs used probability to judge **whether a difference is real**. Machine learning uses
it differently: to say **how a model should learn** (likelihood), to turn evidence into a prediction (Bayes'
rule), and to output **a probability rather than a bare label** so the business can choose what to do with it.

## Likelihood: which parameter makes the data least surprising?

An NBFC's branch gave 10 loans last quarter; 3 defaulted. If the true default rate were p, the probability of
seeing exactly this sequence of outcomes is p³(1 − p)⁷ — the **likelihood** of p, given the data:

    for p in [0.1, 0.2, 0.3, 0.4, 0.5]:
        L = p**3 * (1 - p)**7
        print(p, f"{L:.6f}", round(np.log(L), 3))

    p     likelihood   log-likelihood
    0.1   0.000478     -7.645
    0.2   0.001678     -6.390
    0.3   0.002224     -6.109
    0.4   0.001792     -6.325
    0.5   0.000977     -6.931

The likelihood peaks at **p = 0.3**, the observed rate — the **maximum likelihood estimate**. Two things to
notice. Likelihood is not the probability that p is 0.3; it is how probable the *data* is if p were 0.3. And
we work with the **log**-likelihood because products of many small numbers underflow to zero, while sums of logs
do not.

## Every loss you have met is a likelihood in disguise

- **Log loss is the negative log-likelihood** of a Bernoulli model — each row is a yes/no with probability p.
  Minimising log loss *is* maximum likelihood. That is why logistic regression is trained on it.
- **MSE is the negative log-likelihood** (up to constants) when errors are assumed **normally distributed**
  with constant spread. Linear regression's least squares quietly assumes that. When errors are heavily skewed
  — delivery times with a long tail of 90-minute disasters — squared error lets those few rows dominate, and a
  different loss (absolute error, or modelling the log of the target) may suit better.

Choosing a loss is choosing an assumption about how the data is generated. Say which one you made.

## Bayes' rule as a classifier

    P(class | evidence) = P(evidence | class) · P(class) / P(evidence)

**posterior = likelihood × prior / evidence**. A UPI fraud rule flags **90%** of fraudulent payments and
**2%** of genuine ones. Fraud is **0.5%** of payments. A payment is flagged — how likely is fraud?

    prior, tpr, fpr = 0.005, 0.90, 0.02
    tpr * prior / (tpr * prior + fpr * (1 - prior))     # 0.1844

**18.4%.** The rule is "90% accurate on fraud", yet four out of five flagged payments are genuine, because
genuine payments outnumber fraud 199 to 1. Ignoring the prior — **base-rate neglect** — is the most common
probability mistake in ML reviews, and the reason a fraud model's precision can look shocking while its recall
is fine.

A second, independent signal multiplies the evidence:

    tpr**2 * prior / (tpr**2 * prior + fpr**2 * (1 - prior))   # 0.9105

Two flags take it to 91%. That "independent" is doing a lot of work: real signals are often correlated, and then
the true posterior is lower. **Naive Bayes** is exactly this — multiply each feature's likelihood as if they
were independent — and it works surprisingly well for text, where there are thousands of weak signals.

## Distributions a model assumes

| Model | Assumes | Where it bites |
|---|---|---|
| Linear regression (OLS) | errors roughly normal, constant spread | long-tailed targets (prices, delivery times) |
| Logistic regression | each label is Bernoulli with log-odds linear in the features | strongly non-linear effects |
| Gaussian Naive Bayes | each feature normal within each class, features independent | skewed or correlated features |
| Poisson regression | counts with variance equal to the mean | over-dispersed counts (complaints, claims) |

You will not always satisfy these. You should know when you are not, because that is when the probabilities a
model reports stop being trustworthy.

## Predict a probability, then decide

A model of loan default from EMI-to-income ratio (simulated: 400 repaid borrowers around 30%, 100 defaulters
around 48%, NumPy seed 7):

    from sklearn.naive_bayes import GaussianNB
    from sklearn.linear_model import LogisticRegression

    nb = GaussianNB().fit(X, y)
    nb.class_prior_                    # [0.8 0.2]   — the prior, learned from the data
    q = np.array([[35.0], [42.0], [55.0]])
    nb.predict_proba(q).round(3)       # [[0.877 0.123] [0.559 0.441] [0.018 0.982]]
    nb.predict(q)                      # [0. 0. 1.]

    lr = LogisticRegression().fit(X, y)
    lr.predict_proba(q).round(3)       # [[0.858 0.142] [0.517 0.483] [0.041 0.959]]
    (lr.predict_proba(q)[:, 1] >= 0.3).astype(int)    # [0 1 1]

\`predict\` uses a threshold of 0.5. But a borrower at 42% EMI-to-income has a **44–48%** chance of default —
"no" at 0.5, and a terrible loan for most NBFCs. The probability is the model's real output; the label is a
**business decision** made with a threshold. Lower it to 0.3 and the 42% borrower is flagged. Choosing that
threshold from the cost of a default versus the profit on a good loan is a classification-topic skill, and it
only works if the probabilities are honest — which is what log loss trains for.

## What to carry forward

- Likelihood asks which parameters make the observed data most probable; we maximise its log.
- Log loss is Bernoulli negative log-likelihood; MSE assumes normal errors.
- Bayes' rule: a rare class stays fairly unlikely even after strong evidence — never ignore the base rate.
- Keep the probability; apply the threshold as a separate, business-driven step.`,
    workedExample: `**Problem.** An e-commerce company's returns model flags orders likely to be returned. 8% of orders
are returned. The model flags 75% of orders that will be returned and 12% of those that will not. The warehouse
manager asks: "If an order is flagged, what are the odds it really comes back — and is the flag worth acting
on?"

**Step 1 — write down the three numbers and what they are.** Prior P(return) = 0.08. Likelihoods: P(flag |
return) = 0.75 (the model's recall), P(flag | kept) = 0.12 (its false-positive rate).

**Step 2 — think in counts; it is harder to get wrong.** Take 10,000 orders: 800 returned, 9,200 kept.
Flagged: 0.75 × 800 = 600 returns, and 0.12 × 9,200 = 1,104 kept orders. Total flagged: 1,704.

**Step 3 — the posterior.** P(return | flag) = 600 / 1,704 ≈ **0.352**. With Bayes' formula:
0.75 × 0.08 / (0.75 × 0.08 + 0.12 × 0.92) = 0.06 / 0.1704 ≈ 0.352.

**Step 4 — compare with doing nothing.** A random order is returned 8% of the time; a flagged one 35% of the
time — **4.4 times** as likely. That is useful, but two in three flagged orders are kept.

**Step 5 — turn it into a decision.** If the action is cheap (a "check your size" message before dispatch), act
on every flag: the 1,104 unnecessary messages cost little. If the action is expensive (a phone call costing ₹40),
compare ₹40 × 1,704 calls with the value of the returns prevented. The probability does not make the decision;
it makes the decision possible.

**What to take from it:** state the prior, convert to counts, and answer in the business's terms.`,
    mcqs: [
      mcq('In 10 loans with 3 defaults, why is the maximum likelihood estimate of the default rate 0.3?', [
        ['p = 0.3 makes the observed outcomes more probable than any other p', true],
        ['0.3 is the probability that the true default rate is exactly 0.3', false],
        ['The likelihood p³(1 − p)⁷ is equal to 0.3 when it is evaluated', false],
        ['Maximum likelihood always returns the midpoint of the range tried', false],
      ], 'Likelihood is the probability of the data given p; it peaks at the observed proportion, 3/10. It is not a probability about p itself.'),
      mcq('A rule flags 90% of fraud and 2% of genuine payments; fraud is 0.5% of payments. Why are most flagged payments genuine?', [
        ['Genuine payments are so numerous that 2% of them outnumber the fraud', true],
        ['A rule that catches 90% of fraud must be wrong on the remaining 10%', false],
        ['The rule is too weak; a better rule would always flag more fraud', false],
        ['Flagged payments are always genuine when the rule\'s recall is high', false],
      ], 'Per 1,000 payments: 4.5 frauds flagged versus about 19.9 genuine ones flagged, so P(fraud | flag) ≈ 18%. The base rate dominates.'),
      mcq('A model gives a borrower a 46% probability of default, and `predict()` returns 0. What should an analyst conclude?', [
        ['The label hides a high risk; the threshold should come from the business', true],
        ['The borrower is safe, because the model predicted the class "no default"', false],
        ['The probability is wrong, since it should agree with the predicted label', false],
        ['The model is broken, because a probability near 0.5 means it learned nothing', false],
      ], 'predict() applies a 0.5 threshold. A 46% default risk is far too high for most lenders; the threshold is a cost decision, not a fixed rule.'),
    ],
    checkpoint: [
      mcq('Training logistic regression by minimising log loss is equivalent to which procedure?', [
        ['Maximising the Bernoulli likelihood of the observed labels', true],
        ['Minimising the squared distance between labels and scores', false],
        ['Maximising the accuracy of the labels at a 0.5 threshold', false],
        ['Minimising the number of features with non-zero weights', false],
      ], 'Log loss is the negative log-likelihood of a Bernoulli model, so the weights that minimise it are the maximum-likelihood weights.'),
      mcq('8% of orders are returned. A model flags 75% of returns and 12% of kept orders. Roughly what share of flagged orders are returned?', [
        ['About 35%', true],
        ['About 75%', false],
        ['About 8%', false],
        ['About 88%', false],
      ], 'Per 10,000 orders, 600 returns and 1,104 kept orders are flagged: 600 / 1,704 ≈ 35%.'),
      mcq('Why do ML libraries sum log-probabilities instead of multiplying probabilities across rows?', [
        ['A product of thousands of small numbers underflows to zero', true],
        ['Logarithms make every probability larger than one in value', false],
        ['Multiplying probabilities is not allowed for independent rows', false],
        ['Summing logs gives a different maximum that is more accurate', false],
      ], 'The log is increasing, so the maximum is in the same place, and a sum of logs stays representable where the product would round to 0.0.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_DEBUGGING',
    notes: `Maths bugs in ML code rarely crash. The loop runs, a loss is printed, and the model is quietly wrong
or never trains. Eight faults from real notebooks — the symptom, the cause, and the fix. Every number below was
reproduced with NumPy 2.5 on the delivery data from this topic (x = distance 1–5 km, y = 14, 19, 26, 29, 37
minutes, best fit w = 5.6, b = 8.2, MSE 0.88).

## 1. The loss explodes to \`nan\`

**Symptom:** the loss prints 15,427 after 5 steps, 349,330 after 10, 179 million after 20, then \`nan\`.
**Cause:** the learning rate is too large. At lr = 0.1 every step overshoots the minimum by more than it
corrects, so the weights swing wider each time (w went 41.8, −158.8, 794.8, −3,744.7).
**Fix:** lower the learning rate (0.05 converges here) and print the loss every few steps so divergence is seen
in seconds, not after an hour. If a sensible rate still diverges, look at feature scale (fault 2).

## 2. The same code diverges on one dataset and works on another

**Symptom:** gradient descent fits distance in km fine, but on flat prices with area in sq ft (650–1,800) it
diverges at lr = 1e-6 and at lr = 1e-7 stops at MSE 1.45 with an intercept stuck near zero.
**Cause:** unscaled features. The gradient for the area weight is multiplied by values in the thousands; the
intercept's is not. No single learning rate suits both.
**Fix:** standardise features before gradient descent (\`StandardScaler\`, or (x − mean) / std computed on the
training data). With standardised area, lr = 0.1 reaches the optimum MSE of 0.886.

## 3. The loss rises steadily from the very first step

**Symptom:** no oscillation, just up: after 5 steps w = −355, b = −99, MSE 1.67 million.
**Cause:** a sign error — \`w += lr * dw\` instead of \`w -= lr * dw\`. The code is walking uphill.
**Fix:** subtract the gradient. A gradient check (fault 7) on the formula, plus "does the loss fall on step 1
with a tiny learning rate?", catches this immediately.

## 4. MSE is 126.32 for a model whose MSE is 0.88

**Symptom:** the hand-computed MSE disagrees wildly with \`sklearn.metrics.mean_squared_error\`.
**Cause:** shapes. Predictions came out with shape (5, 1) — a column — and y has shape (5,). \`pred - y\`
broadcasts to a (5, 5) matrix of every prediction minus every target, and its mean is meaningless.

    (pred - y).shape                     # (5, 5)
    np.mean((pred - y) ** 2)             # 126.32
    np.mean((pred.ravel() - y) ** 2)     # 0.88

**Fix:** \`ravel()\` or \`reshape(-1)\` predictions to 1-D, and print \`.shape\` of both sides whenever an
arithmetic result looks wrong. scikit-learn's \`predict\` returns (n,), but hand-written code and Keras often
return (n, 1).

## 5. Works on a sample, diverges on the full data

**Symptom:** the loop converges on 5 rows; on the same rows repeated 200 times (1,000 rows) w is
1.7 × 10¹⁶ after 5 steps.
**Cause:** the gradient uses \`np.sum\` instead of \`np.mean\`. A summed gradient grows with the number of rows,
so the effective learning rate is multiplied by n.
**Fix:** average the gradient (the (2/n) in the formula). Then the learning rate means the same thing on 1,000
rows as on 10 million.

## 6. Log loss is \`nan\` (or \`inf\`)

**Symptom:** the evaluation prints \`nan\` for log loss on a model that looks sensible.
**Cause:** some predicted probabilities are exactly 0 or 1 — from a hand-written sigmoid that rounded, a rule,
or a tree with pure leaves. log(0) is −∞, and 0 × −∞ is \`nan\`.
**Fix:** clip probabilities to [ε, 1 − ε] before taking logs, as \`sklearn.metrics.log_loss\` does internally.
With ε = 1e-15 the three-row example in this unit gives 11.548 instead of \`nan\` — a huge loss, correctly
telling you the model was certain and wrong.

## 7. The gradient check fails — but the gradient is right

**Symptom:** a numerical check of f(x) = x² at x = 3 returns 5.329 instead of 6.
**Cause:** the step h is too small. With a forward difference and h = 1e-15, floating-point rounding swamps
the change in f (h = 1e-12 gives 6.0005, h = 1e-5 gives 6.00001).
**Fix:** use the central difference (f(x + h) − f(x − h)) / 2h with h around 1e-5 to 1e-6, and compare with a
relative tolerance, not equality.

## 8. "The model is 95% accurate, so a flagged transaction is 95% likely to be fraud"

**Symptom:** operations staff complain that most flagged UPI payments are genuine, although the model "catches
90% of fraud with a 2% false-positive rate".
**Cause:** base-rate neglect. Fraud is 0.5% of payments; P(fraud | flagged) = 0.9 × 0.005 / (0.9 × 0.005 +
0.02 × 0.995) = **18.4%**.
**Fix:** report precision (what share of flags are real) next to recall, compute it at the real base rate, and
size the review team for the number of flags, not the number of frauds.

## A debugging order for any training loop

1. Shapes of X, y, predictions and weights. 2. Loss on step 1 with a tiny learning rate — it must fall.
3. Gradient check against a central difference. 4. Feature scales. 5. Only then, the learning rate.`,
    mcqs: [
      mcq('A hand-written MSE gives 126.32 while mean_squared_error gives 0.88 on the same predictions. What is the most likely cause?', [
        ['Predictions shaped (n, 1) broadcast against y shaped (n,)', true],
        ['The learning rate was too large while the model trained', false],
        ['scikit-learn divides by n − 1 rather than by n in MSE', false],
        ['The predictions were not rounded before squaring them', false],
      ], 'A column minus a 1-D array broadcasts to an n × n matrix, so the mean averages every prediction against every target. Flatten the predictions.'),
      mcq('After one step the weights move away from the answer and the loss rises steadily with no oscillation. Which line is wrong?', [
        ['w += lr * dw', true],
        ['w -= lr * dw', false],
        ['dw = 2 * np.mean(err * x)', false],
        ['err = w * x + b - y', false],
      ], 'Adding the gradient climbs uphill every step. The update must subtract it; the other lines are the correct gradient and error.'),
      mcq('Log loss on a validation set prints nan. What is the usual cause?', [
        ['Probabilities of exactly 0 or 1 were passed to the logarithm', true],
        ['The validation set contains more positive rows than negatives', false],
        ['The labels were stored as integers instead of float values', false],
        ['Log loss cannot be computed for a model with an intercept', false],
      ], 'log(0) is −∞ and 0 × −∞ is nan. Clip probabilities to [ε, 1 − ε]; sklearn.metrics.log_loss clips internally.'),
      mcq('A loop converges on 10 rows but diverges on 100,000 with the same learning rate. Which change fixes the cause?', [
        ['Average the gradient over rows instead of summing it', true],
        ['Use a learning rate that grows with each training step', false],
        ['Shuffle the 100,000 rows before running the full loop', false],
        ['Remove the intercept so there is one fewer parameter', false],
      ], 'A summed gradient scales with n, so the effective step is 10,000 times larger on the big dataset. The mean keeps the step size independent of n.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_PRACTICE',
    notes: `Six exercises, then an auto-graded program. Work each by hand or in a notebook first, then check the
answer. Every answer was computed with NumPy 2.5.

    import numpy as np

## Exercise 1 — Predictions as a matrix product

A pricing model for flats uses [area (100 sq ft), bedrooms, age (years), metro distance (km)] with weights
w = [5.5, 3, −0.4, −2] and intercept 12 (₹ lakh). Predict all three flats in one line:

    X = np.array([[10, 2, 5, 0.8], [14, 3, 1, 2.5], [7, 1, 20, 0.3]])

**Answer.** \`X @ w + 12\` → **[69.4, 92.6, 44.9]** lakh. Flat 1: 55 + 6 − 2 − 1.6 + 12 = 69.4.

## Exercise 2 — A gradient by hand

Three points (1, 3), (2, 5), (4, 9). Model ŷ = w·x + b at w = 1, b = 0. Compute the errors, the MSE and both
partial derivatives.

**Answer.** Errors ŷ − y = [−2, −3, −5]; MSE = (4 + 9 + 25)/3 = **12.667**.
∂/∂w = (2/3)(−2·1 − 3·2 − 5·4) = (2/3)(−28) = **−18.667**; ∂/∂b = (2/3)(−10) = **−6.667**. Both negative: increase
both weights.

## Exercise 3 — One step of gradient descent

From Exercise 2, take one step with learning rate 0.05. What are the new weights and the new MSE?

**Answer.** w = 1 + 0.05 × 18.667 = **1.9333**, b = 0 + 0.05 × 6.667 = **0.3333**; MSE falls from 12.667 to
**0.683**. (The true line is y = 2x + 1, so w is already close; b has further to go.)

## Exercise 4 — The normal equation

A crop trial: fertiliser (kg per acre) and yield (quintals per acre).

    f = np.array([20., 40., 60., 80., 100., 120.])
    q = np.array([14.1, 17.8, 20.2, 23.9, 25.8, 29.6])

Solve θ = (XᵀX)⁻¹Xᵀy with a column of ones, and predict the yield at 90 kg.

**Answer.**

    A = np.column_stack([np.ones_like(f), f])
    np.linalg.solve(A.T @ A, A.T @ q).round(4)     # [11.38, 0.1503]

Intercept **11.38**, slope **0.1503** quintals per kg; at 90 kg, 11.38 + 0.1503 × 90 ≈ **24.91** quintals.
np.polyfit(f, q, 1) gives the same, slope first. (Prediction at 90 kg is inside the tested range; at 300 kg it
would be an extrapolation the data cannot support.)

## Exercise 5 — Bayes for a credit flag

At an NBFC 4% of borrowers default. A scorecard flags 70% of future defaulters and 10% of those who repay. What
share of flagged borrowers default?

**Answer.** 0.7 × 0.04 / (0.7 × 0.04 + 0.1 × 0.96) = 0.028 / 0.124 = **22.6%** — 5.6 times the base rate, but
three in four flagged borrowers still repay. A flag should trigger a closer look, not an automatic rejection.

## Exercise 6 — Accuracy vs log loss

Five customers, true churn y = [1, 0, 1, 0, 0]. Model A: p = [0.8, 0.3, 0.6, 0.2, 0.1]. Model B:
p = [0.99, 0.01, 0.99, 0.01, 0.97]. Compare accuracy at 0.5 and log loss.

**Answer.** Accuracy: A **1.0**, B **0.8**. Log loss: A **0.2838**, B **0.7094**. B's one confident mistake
(0.97 for a customer who stayed costs −log 0.03 ≈ 3.51) outweighs its four near-perfect rows. If the retention
team ranks customers by probability, A's honest probabilities are worth more.

## The graded exercise

Below is an auto-graded program: fit a least-squares line in **plain Python** (no NumPy — the grader does not
have it), the way \`np.polyfit(x, y, 1)\` does. Use the closed form for one feature:

    slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²       intercept = ȳ − slope · x̄

then MSE and R² = 1 − SSE/SST. Test it on the delivery data from this topic: you should get slope 5.6000,
intercept 8.2000.`,
    mcqs: [
      mcq('In Exercise 1, what does the row [14, 3, 1, 2.5] predict with weights [5.5, 3, −0.4, −2] and intercept 12?', [
        ['92.6', true],
        ['97.6', false],
        ['80.6', false],
        ['87.6', false],
      ], '14×5.5 + 3×3 + 1×(−0.4) + 2.5×(−2) = 77 + 9 − 0.4 − 5 = 80.6, plus the intercept 12 gives 92.6 lakh.'),
      mcq('In Exercise 2, both partial derivatives are negative at w = 1, b = 0. What does that tell you about the next step?', [
        ['Increasing both w and b will reduce the loss', true],
        ['Decreasing both w and b will reduce the loss', false],
        ['The loss is already at its minimum for both', false],
        ['Only w should change, since b is the intercept', false],
      ], 'A negative partial derivative means the loss falls as that weight rises, and the update w − η·(negative) increases it.'),
      mcq('In Exercise 4, the fitted slope is 0.1503 quintals per kg. What does the model predict for 0 kg of fertiliser?', [
        ['About 11.4 quintals per acre', true],
        ['About 0.15 quintals per acre', false],
        ['About 14.1 quintals per acre', false],
        ['Zero, since nothing was applied', false],
      ], 'At 0 kg the prediction is the intercept, 11.38. That is an extrapolation below the smallest trial (20 kg), so treat it with care.'),
      mcq('In Exercise 5, 22.6% of flagged borrowers default. Which policy does that number support?', [
        ['Send flagged applications for manual review', true],
        ['Reject every flagged application outright', false],
        ['Ignore the flag, as most of them repay anyway', false],
        ['Approve flagged loans only at a lower amount', false],
      ], 'Flagged borrowers default at 5.6 times the base rate, so the flag is informative, but three in four repay — rejecting all of them would lose good customers.'),
      mcq('In Exercise 6, model B has lower accuracy and higher log loss than A. Which explanation is right?', [
        ['B gave 0.97 to a customer who stayed, a confident mistake log loss punishes', true],
        ['B\'s probabilities are closer to 0 and 1, which log loss always penalises', false],
        ['B has more correct predictions, but log loss only counts the incorrect ones', false],
        ['B used a different threshold, so its log loss cannot be compared with A\'s', false],
      ], 'B\'s near-certain correct rows cost almost nothing; its one confident wrong row costs about 3.5 on its own. Extreme probabilities are only penalised when they are wrong.'),
    ],
    assignment: {
      title: 'Fit a Line by Least Squares (plain Python)',
      description: 'Read (x, y) points from standard input and print the least-squares slope and intercept, the mean squared error and R², in plain Python with no NumPy — the closed form behind np.polyfit and LinearRegression.',
      instructions: `Write a Python program that reads points from standard input, fits the straight line
ŷ = slope · x + intercept that minimises the squared error, and reports how good the fit is. **Use only the
standard library** — NumPy and scikit-learn are not available.

**Input**

Each line holds two numbers separated by whitespace: \`x y\` (for example, a flat's area in hundreds of sq ft
and its price in ₹ lakh). Numbers may be negative or have decimals. **Blank lines are ignored.**

**What to compute**

With n points, x̄ and ȳ the means:

- slope = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²
- intercept = ȳ − slope · x̄
- MSE = (1/n) Σ (yᵢ − ŷᵢ)², the mean squared error of the fitted line on these points
- R² = 1 − SSE / SST, where SSE = Σ(yᵢ − ŷᵢ)² and SST = Σ(yᵢ − ȳ)²

**Output**

Four lines, every number rounded to **4 decimals** (\`f"{value:.4f}"\`):

    slope=<slope>
    intercept=<intercept>
    mse=<mse>
    r2=<r2>

Special cases:

- fewer than 2 points: print only \`Not enough points\`
- all x values equal (no line can be fitted): print only \`Cannot fit: all x values are equal\`
- all y values equal (SST is 0): print \`r2=undefined\` as the last line
- never print \`-0.0000\`; print \`0.0000\` instead

**Example**

Input:

    8 42
    12 61
    15 70
    18 85
    22 98

Output:

    slope=4.0000
    intercept=11.2000
    mse=2.1600
    r2=0.9942

(Each extra 100 sq ft adds ₹4 lakh; the line explains 99.4% of the variation in price.)

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot, including too
few points, a vertical set of points, a flat set of points and negative values — and scored on how many it
passes. Output is compared line by line. A reviewer uses the rubric for the design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including blank lines, fewer than two points, equal x values, equal y values and negative numbers.', maxPoints: 60 },
        { criterion: 'The closed form, implemented clearly', description: 'Means, slope and intercept are computed in a small function from the formulas given; MSE and R² reuse the fitted line rather than repeating the arithmetic.', maxPoints: 25 },
        { criterion: 'Clarity', description: 'Clear names, input parsing separate from the maths, special cases checked before dividing, and one formatting helper for the four-decimal output.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def fit_line(points):
    """Return (slope, intercept) of the least-squares line through a list of (x, y) pairs."""
    # TODO: compute the means, then the slope and intercept with the closed form
    ...


def main():
    points = []
    for line in sys.stdin:
        parts = line.split()
        if not parts:
            continue
        points.append((float(parts[0]), float(parts[1])))
    # TODO: handle fewer than 2 points and all-equal x values
    # TODO: fit the line, compute MSE and R-squared, and print the four lines
    #       with 4 decimals (r2=undefined when every y is the same)


main()
`,
        tests: [
          { input: '8 42\n12 61\n15 70\n18 85\n22 98\n', expectedOutput: 'slope=4.0000\nintercept=11.2000\nmse=2.1600\nr2=0.9942' },
          { input: '1 3\n2 5\n4 9\n', expectedOutput: 'slope=2.0000\nintercept=1.0000\nmse=0.0000\nr2=1.0000' },
          { input: '\n5.5 120\n\n6.0 120\n7.25 120\n', expectedOutput: 'slope=0.0000\nintercept=120.0000\nmse=0.0000\nr2=undefined' },
          { input: '7 30\n', expectedOutput: 'Not enough points', isHidden: true },
          { input: '3 10\n3 12\n3 15\n', expectedOutput: 'Cannot fit: all x values are equal', isHidden: true },
          { input: '1 14\n2 19\n3 26\n4 29\n5 37\n', expectedOutput: 'slope=5.6000\nintercept=8.2000\nmse=0.8800\nr2=0.9862', isHidden: true },
          { input: '-2 7.5\n0 4\n1.5 2.25\n3 -1\n4.5 -2.5\n6 -6\n', expectedOutput: 'slope=-1.6404\nintercept=4.2625\nmse=0.1580\nr2=0.9919', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_INTERVIEW_QUESTION',
    notes: `Entry-level data-science interviews in India — product companies, banks, analytics consultancies —
rarely ask for a proof. They ask you to explain the maths behind a model in plain words, then push on the
detail to see whether you understand it or memorised it. Three common questions, model answers, and the
follow-ups a good answer earns.

## 1. "Explain gradient descent. What does the learning rate do?"

**Model answer.** "A model has weights, and a loss that measures how wrong its predictions are for a given set
of weights. The gradient of the loss tells us, for each weight, which direction increases the loss and how
steeply. Gradient descent repeatedly moves every weight a small step in the opposite direction — downhill —
until the loss stops falling. The learning rate is the size of that step. Too small and training takes forever;
too large and each step overshoots the minimum, so the loss oscillates or explodes. In practice I standardise
the features, start with a common default, watch the training and validation loss curves, and lower the rate if
the loss rises or turns into nan."

**Follow-ups:**
- *"Batch versus stochastic versus mini-batch?"* Batch uses all rows per step — accurate but slow on big data;
  stochastic uses one row — cheap and noisy; mini-batch (32–512 rows) is the practical middle and what deep
  learning uses. The noise can even help escape poor regions.
- *"Does gradient descent always find the best answer?"* For convex losses — linear regression's MSE, logistic
  regression's log loss — any minimum is the global minimum, so yes with a suitable rate. Neural networks are
  not convex; it finds a good minimum, not a guaranteed best one.

## 2. "Why do we train logistic regression with log loss instead of mean squared error?"

**Model answer.** "Three reasons. First, log loss is the negative log-likelihood of a Bernoulli outcome, so
minimising it is maximum likelihood — it trains the model to output honest probabilities. Second, with a
sigmoid output, MSE makes the loss non-convex in the weights, so gradient descent can get stuck; log loss with
a sigmoid is convex. Third, the gradients: with MSE the gradient carries a factor σ′(z), which is nearly zero
when the model is confidently wrong — exactly when it most needs to learn. With log loss the gradient for each
row is simply (p − y)·x, which is largest when the model is most wrong."

**Follow-ups:**
- *"What does log loss do to a prediction of 0.99 for a negative case?"* It costs −log(0.01) ≈ 4.6, about 460
  times a correct 0.99 (0.01). Confident mistakes dominate the loss.
- *"So should I always report log loss?"* For training and comparing probability quality, yes; for the business,
  also report what they act on — precision and recall at the chosen threshold.

## 3. "Our fraud model catches 90% of fraud with a 2% false-positive rate. A transaction is flagged — what is the chance it is fraud?"

**Model answer.** "It depends on the base rate, which the question has not given — I would ask. Say fraud is
0.5% of transactions. In 100,000 transactions, 500 are fraud and 450 of those are flagged; 99,500 are genuine
and 2%, 1,990, are flagged. So of 2,440 flags, 450 are fraud — about 18%. The model is good, but genuine
transactions vastly outnumber fraud, so most flags are false alarms. That is Bayes' rule: the posterior depends
on the prior as much as on the test. Operationally it means sizing the review team for 2,440 flags, and
reporting precision alongside recall."

**Follow-ups:**
- *"How would you raise that 18%?"* A higher threshold (fewer, surer flags — at the cost of recall), better
  features, or a second, independent check on flagged transactions: with two independent 90%/2% signals the
  posterior is about 91%.
- *"What if fraud was 5%?"* 0.9 × 0.05 / (0.9 × 0.05 + 0.02 × 0.95) ≈ 70%. The same model looks very different on
  a different population — one reason a model is re-validated before rollout to a new market.

## How to answer maths questions well

Lead with the idea in one sentence, then the formula if asked, then a number. Interviewers trust a candidate who
can produce the 18% in their head far more than one who recites Bayes' theorem.`,
    mcqs: [
      mcq('An interviewer asks why MSE suits logistic regression badly. Which reason is about the gradient?', [
        ['With a sigmoid, MSE\'s gradient nearly vanishes when the model is confidently wrong', true],
        ['MSE cannot be computed for labels of 0 and 1, so the gradient is always undefined', false],
        ['MSE\'s gradient is always larger than log loss\'s, so training overshoots the minimum', false],
        ['MSE has no gradient for the intercept term, so only the slopes are ever updated', false],
      ], 'The MSE gradient carries σ′(z), which is near zero on the flat ends of the sigmoid; the log-loss gradient (p − y)x stays large when the model is badly wrong.'),
      mcq('Fraud is 5% of transactions, and a model flags 90% of fraud and 2% of genuine payments. Roughly what share of flags is fraud?', [
        ['About 70%', true],
        ['About 18%', false],
        ['About 90%', false],
        ['About 45%', false],
      ], '0.9 × 0.05 = 0.045 against 0.02 × 0.95 = 0.019, so 0.045 / 0.064 ≈ 70%. A higher base rate lifts precision for the same model.'),
      mcq('Asked whether gradient descent always finds the best weights, which answer is accurate?', [
        ['For convex losses like linear regression\'s MSE yes; for neural networks not guaranteed', true],
        ['Yes, for every model, provided it runs for enough steps with any learning rate', false],
        ['No; it only finds the best weights when the data has fewer rows than features', false],
        ['Only when the features are left unscaled, so each weight moves at its own speed', false],
      ], 'Convex losses have one minimum, so a suitable learning rate reaches it. Non-convex losses can have many; gradient descent finds a good one, not a guaranteed best.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_MATH_ML_CHECKPOINT',
    notes: `Ten questions across the topic: vectors and matrix shapes, derivatives and gradients, loss functions
and gradient descent, the normal equation, and likelihood and Bayes' rule. Several ask for a number — work it
out before looking at the options. Every value was computed with NumPy 2.5.`,
    checkpoint: [
      mcq('What does `np.linalg.norm(np.array([3, 4]))` return?', [
        ['5.0', true],
        ['7.0', false],
        ['25.0', false],
        ['12.0', false],
      ], 'The Euclidean norm is √(3² + 4²) = √25 = 5. 7 is the L1 norm, the sum of absolute values, not the Euclidean length.'),
      mcq('A feature matrix X has shape (1000, 8). What is the shape of `X.T @ X`, the matrix in the normal equation?', [
        ['(8, 8)', true],
        ['(1000, 1000)', false],
        ['(8, 1000)', false],
        ['(1000, 8)', false],
      ], 'X.T is (8, 1000) and X is (1000, 8); the product is (8, 8) — one row and column per feature, whatever the number of rows.'),
      mcq('Points (1, 2) and (2, 4); model ŷ = w·x + b starts at w = b = 0. After one gradient step on MSE with learning rate 0.1, what are w and b?', [
        ['w = 1.0, b = 0.6', true],
        ['w = 0.6, b = 1.0', false],
        ['w = −1.0, b = −0.6', false],
        ['w = 2.0, b = 0.0', false],
      ], 'Errors are [−2, −4]; ∂/∂w = 2·mean([−2, −8]) = −10 and ∂/∂b = 2·mean([−2, −4]) = −6. Subtracting 0.1 × the gradient gives w = 1.0, b = 0.6.'),
      mcq('A customer who stayed (y = 0) was given a churn probability of 0.9. What is that row\'s log loss?', [
        ['About 2.30', true],
        ['About 0.11', false],
        ['About 0.90', false],
        ['About 0.81', false],
      ], 'For y = 0 the loss is −log(1 − p) = −log 0.1 ≈ 2.30. (0.11 would be the loss if the customer had churned.)'),
      mcq('A training loss goes 9.1, 4.0, 6.2, 3.1, 5.0, 2.9, 4.4 — falling overall but bouncing every step. What does that suggest?', [
        ['The learning rate is a little too high; a smaller one would settle', true],
        ['The learning rate is far too low and needs to be multiplied by ten', false],
        ['The model has reached its minimum and training should stop now', false],
        ['The gradient formula has a sign error that sends it uphill', false],
      ], 'Overshooting the minimum from side to side makes the loss zig-zag. A sign error would rise steadily; too low a rate would fall smoothly and slowly.'),
      mcq('Which expression gives the least-squares coefficients θ of a linear model, with a column of ones in X?', [
        ['(XᵀX)⁻¹ Xᵀy', true],
        ['(XXᵀ)⁻¹ Xy', false],
        ['Xᵀy / n', false],
        ['(Xᵀy)⁻¹ XᵀX', false],
      ], 'Setting the MSE gradient to zero gives XᵀXθ = Xᵀy, so θ = (XᵀX)⁻¹Xᵀy. In code, solve the system rather than inverting.'),
      mcq('12 of 80 customers in a pilot churned. What is the maximum likelihood estimate of the churn rate?', [
        ['0.15', true],
        ['0.12', false],
        ['0.50', false],
        ['0.85', false],
      ], 'For a Bernoulli rate the likelihood p¹²(1 − p)⁶⁸ peaks at the observed proportion, 12 / 80 = 0.15.'),
      mcq('A condition affects 1% of people. A test detects 99% of cases and wrongly flags 1% of healthy people. What is P(condition | positive)?', [
        ['0.50', true],
        ['0.99', false],
        ['0.01', false],
        ['0.98', false],
      ], '0.99 × 0.01 = 0.0099 true positives against 0.01 × 0.99 = 0.0099 false ones, so half the positives have the condition.'),
      mcq('Minimising MSE for linear regression is the maximum-likelihood fit under which assumption about the errors?', [
        ['They are normal with a constant spread', true],
        ['They follow a Bernoulli distribution', false],
        ['They are always positive and skewed', false],
        ['They grow in proportion to the target', false],
      ], 'The normal log-likelihood is, up to constants, minus the sum of squared errors. Long-tailed or heteroscedastic errors break that link.'),
      mcq('At the current weights, every partial derivative of the training loss is zero. For linear regression, what does that mean?', [
        ['The weights are at the minimum of the loss', true],
        ['The learning rate has been set to zero', false],
        ['The model predicts the mean for every row', false],
        ['The model is overfitting the training data', false],
      ], 'MSE for linear regression is convex, so a point where the gradient is zero is the global minimum — the same weights the normal equation gives.'),
    ],
  },

  /* ══ DS_ML_WORKFLOW ══════════════════════════════════════════════════════════════════════ */

  /* ── FRAMING ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_FRAMING',
    notes: `Most failed ML projects fail before any model is trained: the team predicted the wrong thing, with
data that would not exist at prediction time, to move a number nobody cared about. Year 1 introduced supervised
learning as "learning a mapping from examples". Framing is deciding **what** mapping, **for whom**, and **how you
will know it worked**.

## First question: is ML the right tool?

Machine learning is worth its cost when **all** of these hold:

- There is a **pattern** to learn, and it is too complex or changes too often to write as rules.
- There is **data with the answer** — past examples labelled with what happened.
- A **decision** will change because of the prediction, often enough to matter.
- Being wrong sometimes is acceptable, and someone knows what a mistake costs.

Counter-examples worth saying aloud in a meeting:

- "Flag orders above ₹50,000 for review" — a rule. Write the \`if\`.
- "Predict GST on an invoice" — a formula. Compute it.
- "Predict which customers will churn" when the retention team has no budget to act — a model with no decision
  behind it is a dashboard nobody opens.
- "Predict demand for a product we have never sold" — no labelled history; start with judgement and
  comparables.

## Target, features, unit of prediction

Write three things down before touching data:

1. **The unit**: one prediction per *what*? Per customer per month, per order, per loan application.
2. **The target (label)**: precisely what is predicted, and **over what window**. "Churn" is not a target.
   "A prepaid customer with no recharge in the 30 days after the cutoff date" is.
3. **The features**: what is known **at the moment the prediction is made** — and nothing after it.

The third rule is what separates a model that works in a notebook from one that works in production.

## Building a label with a cutoff date

A telecom's recharge log, and a cutoff of 30 June 2024. Features use the 90 days **before** the cutoff; the
label looks at the 30 days **after** it:

    cutoff = pd.Timestamp("2024-06-30")
    hist   = r[(r.date <= cutoff) & (r.date > cutoff - pd.Timedelta(days=90))]
    future = r[(r.date > cutoff) & (r.date <= cutoff + pd.Timedelta(days=30))]

    feats = hist.groupby("customer_id").agg(recharges_90d=("amount", "size"),
                                            spend_90d=("amount", "sum"),
                                            last_recharge=("date", "max"))
    feats["days_since_last"] = (cutoff - feats.pop("last_recharge")).dt.days
    feats["churned"] = (~feats.index.isin(future.customer_id)).astype(int)

                 recharges_90d  spend_90d  days_since_last  churned
    customer_id
    C1                       2        478               49        0
    C2                       2        310               29        1
    C3                       3       2157               10        0

C2 recharged twice in the window, then nothing in July: churned. Every feature is computed from rows on or
before 30 June, exactly what would be known if the model ran on 30 June. Repeat this for several cutoff dates
and you have a training set that mimics production.

## Regression or classification?

| The business asks | Target | Task |
|---|---|---|
| "How long will this delivery take?" | minutes | regression |
| "What will this flat sell for?" | ₹ lakh | regression |
| "Will this borrower miss an EMI in 90 days?" | yes / no | binary classification |
| "Which of 12 categories is this support ticket?" | category | multi-class classification |
| "How many units will we sell next week?" | count | regression (often forecasting) |

Sometimes it is a choice. "Will the delivery be late?" (classification) loses information that "how many
minutes?" (regression) keeps; but if the only decision is "send an apology coupon or not", classification at the
promised time may be all you need. Decide from the decision.

## The metric the model must move

There are always **two** metrics:

- An **ML metric** to train and compare models: MAE, RMSE, log loss, ROC AUC, precision and recall.
- A **business metric** the model exists to move: retained revenue, fraud losses, delivery-time complaints,
  cost per loan collected.

Agree the business metric **first**, and how a prediction turns into an action: "the top 5% of customers by
churn risk get a ₹50 recharge bonus; success is more retained revenue than bonus spent, measured against a
held-out control group." Then the ML metric follows: here, how well the model **ranks** the top 5% — precision
in that slice — not overall accuracy.

## A one-page framing template

    Decision:        Who gets a retention offer each month
    Unit:            Prepaid customer, scored on the 1st of each month
    Target:          No recharge in the next 30 days (1 = churned)
    Features:        Recharge, usage and complaint history up to the scoring date
    Baseline:        Customers with no recharge in the last 25 days
    ML metric:       Precision in the top 5% by score; ROC AUC for model comparison
    Business metric: Retained revenue minus offer cost, versus a random control group
    Risks:           Offers given to people who would have stayed; seasonal patterns (festivals)

If you cannot fill in every line, you are not ready to train a model.`,
    workedExample: `**Problem.** The operations head of a food-delivery app says: "Customers complain about late
orders. Build an ML model for it." Frame it.

**Step 1 — find the decision.** Ask what would happen differently with a prediction. Two options emerge: (a)
show a more honest ETA at checkout, or (b) proactively send an apology coupon when an order is likely to be
more than 10 minutes late. The team chooses (a) first — it affects every order.

**Step 2 — unit and moment of prediction.** One prediction per order, **at the moment the customer places it**.
So features may only use what is known then: restaurant, its recent average preparation time, distance, time of
day, weather now, number of active riders nearby. Not the rider actually assigned (that happens later), and
certainly not the actual pickup time.

**Step 3 — target.** Delivery time in minutes from order placement to delivery: a **regression** target. The
"late" flag can be derived from it afterwards.

**Step 4 — metrics.** ML metric: **MAE** in minutes (easy to explain: "on average we are off by 4.2 minutes"),
plus the share of orders delivered within the shown ETA. Business metric: late-delivery complaints per 1,000
orders and order cancellations, compared in an A/B test between old and new ETAs.

**Step 5 — baseline.** The current ETA (distance ÷ average speed + a fixed 15 minutes) is the number to beat. A
model that cannot beat it is not shipped.

**Step 6 — risks.** Predicted ETAs that are too long lose orders; too short creates complaints. Rain and
festivals change everything, so the evaluation must include those days.

**What to take from it:** "build a model for late orders" became a precise regression task with a moment of
prediction, a baseline and a business test — before any data was opened.`,
    mcqs: [
      mcq('A bank wants every loan application above ₹25 lakh routed to a senior officer. Should this be an ML model?', [
        ['No; it is a fixed rule, and an if-statement does it exactly', true],
        ['Yes; a classifier will learn the ₹25 lakh boundary from data', false],
        ['Yes; any routing decision with past data benefits from a model', false],
        ['No; banks are not permitted to use any ML in loan processing', false],
      ], 'When the logic is known and stable, a rule is exact, explainable and free. ML earns its cost only where the pattern must be learned.'),
      mcq('A churn label is defined as "no recharge in the 30 days after the cutoff". Which feature breaks the framing?', [
        ['Number of recharges in the 15 days after the cutoff', true],
        ['Number of recharges in the 90 days before the cutoff', false],
        ['Days between the last recharge and the cutoff date', false],
        ['Complaints logged in the 60 days before the cutoff', false],
      ], 'Recharges after the cutoff overlap the label window: at scoring time they do not exist yet, and they nearly reveal the answer.'),
      mcq('An NBFC asks "which borrowers will miss an EMI in the next 90 days?". What kind of task is it?', [
        ['Binary classification, one prediction per borrower', true],
        ['Regression, predicting the EMI amount in rupees each month', false],
        ['Clustering, grouping borrowers by repayment style', false],
        ['Multi-class classification across the 90 days', false],
      ], 'The target is yes or no per borrower over a fixed window, which is binary classification; the probability can then drive the collection strategy.'),
    ],
    checkpoint: [
      ck(CON, 'A retention model scores customers on the 1st of each month. Which features may it use?', [
        ['Only data recorded up to the 1st, when the score is made', true],
        ['Any data in the warehouse on the day the model is trained', false],
        ['Data up to the end of the month, as the label covers it', false],
        ['Only the customer\'s profile, never their usage history', false],
      ], 'A feature is legitimate only if it would exist at the moment of prediction. Training on later data makes the notebook score impossible to reproduce live.'),
      ck(CON, 'A delivery app will use predictions to show an ETA at checkout. Which ML metric is easiest to explain to the business?', [
        ['Mean absolute error in minutes', true],
        ['ROC AUC of the predicted times', false],
        ['Log loss of the predicted times', false],
        ['The R² of minutes on a log scale', false],
      ], 'MAE is in the target\'s own units: "on average the ETA is off by 4 minutes". AUC and log loss are classification metrics.'),
      ck(CON, 'A model predicts which customers will churn, but the company has no way to contact them or change their plan. What is the framing problem?', [
        ['No decision changes because of the prediction, so it cannot add value', true],
        ['Churn is too rare an event for any supervised model to learn well', false],
        ['The target should be a regression on the number of days to churn', false],
        ['The model needs more features before the prediction can be useful', false],
      ], 'A prediction is only as useful as the action it changes. Without a lever, a good model produces a report and no business outcome.'),
    ],
  },

  /* ── SPLITS_LEAKAGE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_SPLITS_LEAKAGE',
    notes: `Year 1 set the rule: a model is judged on data it never saw, and the test set is touched once. This
unit is the practice — how to split for the problem in front of you, and how to find the leaks that make a model
look brilliant in the notebook and ordinary in production.

## The data used in this workflow topic

A telecom's prepaid customers, simulated so every result can be reproduced (NumPy seed 42, 2,000 customers,
10.7% churn, about 5% of \`data_gb\` missing):

    import numpy as np, pandas as pd

    def make_churn(n=2000, seed=42):
        rng = np.random.default_rng(seed)
        tenure = rng.integers(1, 61, n)
        plan = rng.choice(["basic", "value", "unlimited"], n, p=[0.5, 0.3, 0.2])
        circle = rng.choice(["KA", "MH", "TN", "DL", "UP"], n)
        recharge = np.round(rng.normal(250, 80, n).clip(99, 700) + np.where(plan == "unlimited", 200, 0))
        data_gb = np.round(rng.gamma(2.0, 6.0, n), 1)
        care = rng.poisson(0.8, n)
        z = (-1.2 - 0.05 * tenure + 0.55 * care - 0.004 * (recharge - 250) - 0.03 * data_gb
             + np.where(plan == "basic", 0.6, 0.0))
        churn = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
        df = pd.DataFrame({"tenure_months": tenure, "plan": plan, "circle": circle,
                           "monthly_recharge": recharge, "data_gb": data_gb,
                           "care_calls": care, "churned": churn})
        df.loc[rng.random(n) < 0.05, "data_gb"] = np.nan
        return df

    df = make_churn()
    X = df.drop(columns="churned");  y = df["churned"]

Churn rises with complaints to customer care and the basic plan, and falls with tenure, recharge and data use.
\`circle\` has **no** effect — useful later, when a model pretends it does.

## Train, validation, test

    from sklearn.model_selection import train_test_split

    X_tmp, X_test, y_tmp, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    X_train, X_val, y_train, y_val = train_test_split(X_tmp, y_tmp, test_size=0.25,
                                                      stratify=y_tmp, random_state=42)
    len(X_train), len(X_val), len(X_test)                  # (1200, 400, 400)
    y_train.mean(), y_val.mean(), y_test.mean()            # 0.107, 0.108, 0.108

- **Train** (60%): the model learns from it.
- **Validation** (20%): you compare models and settings on it. Cross-validation (later in this topic) often
  replaces a fixed validation set.
- **Test** (20%): **one** final, honest estimate. Every look at the test set that changes a decision makes it a
  little less honest.

\`stratify=y\` keeps the churn rate the same in every part. Without it, a random split gave 10.9% churn in train
and 10.0% in test — harmless here, but with 2% positives a test set can end up with almost none.
\`random_state\` makes the split reproducible; always set it.

## Split the way the model will be used

**Random split** assumes future rows look like a random sample of past rows. Often they do not.

**Time-based split** — when the model predicts the future (demand, churn next month, defaults next quarter),
train on the past and test on a later period:

    cut = pd.Timestamp("2024-10-01")
    train, test = d[d.date < cut], d[d.date >= cut]    # 9 months train, 3 months test

A random split here lets the model learn from October to predict September, which it will never be able to do
live. For repeated time-based evaluation, \`TimeSeriesSplit\` always trains on earlier rows and tests on later ones:

    from sklearn.model_selection import TimeSeriesSplit
    for tr, te in TimeSeriesSplit(n_splits=3).split(np.arange(12)):
        print(tr, te)
    # [0 1 2] [3 4 5]
    # [0 1 2 3 4 5] [6 7 8]
    # [0 1 2 3 4 5 6 7 8] [ 9 10 11]

**Group split** — when one entity has several rows (a customer's monthly snapshots, a patient's visits, several
listings of the same flat), all of its rows must land on the same side. 500 customers with 4 rows each:

    from sklearn.model_selection import GroupShuffleSplit
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    tr, te = next(gss.split(rows, groups=rows["customer_id"]))
    # 1,600 train rows, 400 test rows, 0 customers on both sides

A plain \`train_test_split\` on the same rows put **300 of the 500 customers** on both sides. The model then
"recognises" customers it has seen, and the test score measures memory, not prediction. (\`GroupKFold\` is the
cross-validation version.)

## Leakage: information the model would not have

**Leakage** is any route by which information about the target, or about the test set, reaches training. Its
signature is a score that is too good.

**Target leakage** — a feature that is a consequence of the outcome, or measured after it. A churn feature
"days since last recharge", computed on the day the data was extracted — 45 days after the cutoff — is large for
exactly the customers who churned. Adding it to the churn pipeline lifted test ROC AUC from **0.768 to 0.977**.
Nothing in the code is wrong; the feature simply would not exist at scoring time. Other classics: "loan written
off" when predicting default, "refund issued" when predicting returns, a "final diagnosis" code when predicting a
diagnosis.

**Train–test contamination** — anything fitted on all rows before splitting: a scaler, an imputer, a target
encoder, or **feature selection**. On pure noise (100 rows, 5,000 random features, random labels), selecting
the 20 "best" features on all the data and then cross-validating gave accuracy **0.85**. Doing the selection
inside each fold, with a pipeline, gave **0.48** — the coin-flip it really is:

    from sklearn.feature_selection import SelectKBest, f_classif
    from sklearn.pipeline import make_pipeline

    Xsel = SelectKBest(f_classif, k=20).fit_transform(Xn, yn)          # sees every row: leak
    cross_val_score(LogisticRegression(max_iter=1000), Xsel, yn, cv=5).mean()     # 0.85

    pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression(max_iter=1000))
    cross_val_score(pipe, Xn, yn, cv=5).mean()                                    # 0.48

A scaler fitted on all rows usually leaks only a little; target encoding and feature selection can leak a lot.
The cure is the same for all of them: **fit preprocessing on training data only**, which pipelines (two units on)
do for you.

**Duplicates and near-duplicates** across the split — the same listing scraped twice, the same customer under two
IDs — are the group problem in disguise. De-duplicate before splitting.

## A leak checklist

- For every feature: **when** is it recorded, and would it exist at prediction time?
- Is any feature suspiciously predictive on its own? Check single-feature AUC or importance.
- Are entities or time periods mixed across the split?
- Was anything fitted before the split?
- Is the score better than domain experts think possible? Suspect a leak before celebrating.`,
    mcqs: [
      mcq('A demand model for a grocery app will forecast next week\'s orders. How should its data be split?', [
        ['Train on earlier weeks and test on the most recent weeks', true],
        ['Shuffle all the weeks and hold out a random 20% of them', false],
        ['Stratify by order count so both sets have similar totals', false],
        ['Put weekends in the test set and weekdays in training', false],
      ], 'The model will always predict forward in time, so the test must too. A random split lets it learn from the future it is supposed to forecast.'),
      mcq('Selecting 20 of 5,000 random features on all rows, then cross-validating, gave accuracy 0.85 on random labels. Why?', [
        ['The selection saw the validation rows, so their noise was picked as signal', true],
        ['Logistic regression always scores well when it has twenty features', false],
        ['Cross-validation with five folds overestimates accuracy on small data', false],
        ['Random labels are learnable when the number of features is large', false],
      ], 'The features were chosen because they happened to correlate with those exact labels, including the validation folds. Inside a pipeline the same procedure scores 0.48.'),
      mcq('A housing dataset has several listings per flat (relisted at new prices). What split avoids an optimistic score?', [
        ['Group the split by flat ID, so each flat is on one side only', true],
        ['Stratify the split by price band, so both sides look similar', false],
        ['Drop the price column from the test rows before scoring them', false],
        ['Use a larger test set, so that the duplicates average out', false],
      ], 'A flat seen in training is easy to "predict" in test. GroupShuffleSplit or GroupKFold keeps all of its listings together.'),
    ],
    checkpoint: [
      ck(CON, 'A default model includes "number of collection calls made to the borrower". Why is that a problem?', [
        ['Collection calls happen because a borrower has already missed payments', true],
        ['Call counts are integers and must be scaled before any model uses them', false],
        ['The feature has too few distinct values to be useful in a classifier', false],
        ['Phone call data is never available for loan applicants in India', false],
      ], 'Collection activity is a consequence of the outcome being predicted, so it leaks the target and will not exist at application time.'),
      ck(CON, 'What does `stratify=y` do in `train_test_split`?', [
        ['Keeps the class proportions of y the same in both parts', true],
        ['Sorts the rows by y so that the test set gets the latest ones', false],
        ['Balances the classes so each part has as many 1s as 0s', false],
        ['Splits the data by time, using y as the date column', false],
      ], 'Stratification preserves the original class mix in each part; it does not rebalance. It matters most when positives are rare.'),
      ck(CON, 'A plain random split of 2,000 rows from 500 customers (4 rows each) puts 300 customers on both sides. What will the test score do?', [
        ['Overstate performance, since the model has already seen those customers', true],
        ['Understate performance, since each customer\'s rows are split in two', false],
        ['Stay unbiased, because a random split is always a fair estimate', false],
        ['Fail to compute, since a customer ID cannot be on both sides', false],
      ], 'Rows of the same customer are correlated, so the model partly memorises customers. GroupShuffleSplit put 0 customers on both sides.'),
    ],
  },

  /* ── BASELINES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_BASELINES',
    notes: `A model's score means nothing on its own. "89% accuracy" is excellent if the alternative is 60% and
worthless if predicting "no" for everyone gets 89%. A **baseline** is the score of the simplest thing that could
possibly work, computed **before** any real model. Every model must beat it, by enough to justify its cost.

## The dumbest classifier

On the churn data (10.7% churn), always predict "stays":

    from sklearn.dummy import DummyClassifier
    from sklearn.metrics import accuracy_score, recall_score

    num = ["tenure_months", "monthly_recharge", "care_calls"]
    X_train, X_test, y_train, y_test = train_test_split(df[num], df["churned"], test_size=0.2,
                                                        stratify=df["churned"], random_state=42)

    dummy = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
    p = dummy.predict(X_test)
    accuracy_score(y_test, p), recall_score(y_test, p)        # (0.892, 0.0)

**89.2% accuracy, and it finds no churners at all.** Now a logistic regression on the same three features:

    lr = LogisticRegression(max_iter=1000).fit(X_train, y_train)
    p2 = lr.predict(X_test)
    accuracy_score(y_test, p2), recall_score(y_test, p2)      # (0.895, 0.023)

0.3 points better than a model that does nothing, and it catches 1 churner in 43. Without the baseline, "89.5%
accuracy" would have gone into a deck. **Balanced accuracy** (the average of each class's recall) tells the truth
at once: 0.500 for the dummy, 0.512 for the model.

This does not mean logistic regression is useless here — its **probabilities** rank customers reasonably (ROC
AUC about 0.77 with all features), and a lower threshold catches many more churners. It means accuracy at 0.5 is
the wrong yardstick for a 10.7% class, and the baseline is what exposed that.

## A rule baseline

The retention team's current rule: call anyone with two or more care calls this month.

    rule = (X_test.care_calls >= 2).astype(int)
    accuracy_score(y_test, rule), recall_score(y_test, rule)   # (0.785, 0.349)

Lower accuracy than doing nothing, but it finds **35%** of churners. That is the real bar: a model must beat
**the rule the business already uses**, on the metric the business cares about. If a gradient-boosted model with
40 features finds 38% at the same number of calls, it may not be worth building, explaining and maintaining.

## Regression baselines

Delivery minutes for 1,500 simulated orders (distance, preparation time, rain; NumPy seed 1):

    from sklearn.dummy import DummyRegressor
    from sklearn.metrics import mean_absolute_error

    for s in ["mean", "median"]:
        base = DummyRegressor(strategy=s).fit(Xtr, ytr)
        mean_absolute_error(yte, base.predict(Xte))     # 7.62 for both

    LinearRegression().fit(Xtr, ytr)  →  MAE 3.04 minutes

Predicting the average delivery time (31.7 minutes) for every order is off by 7.6 minutes on average; a linear
model on three features cuts that to **3.0** — a 60% improvement worth reporting. The DummyRegressor's R² is 0
by construction on its training data (and near 0 on test), which is why **R² is itself "improvement over the mean
baseline"**.

## Forecasting baselines

For a time series, the classic baseline is **last value** ("next week = this week"):

    sales = pd.Series([120, 132, 128, 140, 151, 149, 160, 171])
    naive = sales.shift(1)
    (sales - naive).abs().iloc[1:].mean()       # 9.0 orders per week

A **seasonal naive** baseline ("same day last week", "same month last year") is often brutally hard to beat for
retail. Many published forecasting models lose to it.

## Which baseline to use

| Problem | Baselines to compute |
|---|---|
| Classification | most frequent class; stratified random; the current business rule |
| Regression | mean or median; a one-feature rule ("₹ per sq ft × area") |
| Forecasting | last value; seasonal naive; moving average |
| Ranking (top-k) | random order; sort by the single most obvious feature |

## Why baselines matter beyond the score

- They **catch bugs**: a model that loses to the dummy usually has a broken pipeline, shuffled labels or a
  leak in reverse.
- They **set expectations**: if the rule gets 35% recall and the best model 41%, everyone knows the value is
  incremental.
- They **win sometimes**: if a model barely beats a rule, ship the rule. It is cheaper, explainable and does not
  drift.`,
    mcqs: [
      mcq('1,000 loans, 60 defaults. What accuracy does always predicting "repays" achieve?', [
        ['94%', true],
        ['6%', false],
        ['50%', false],
        ['60%', false],
      ], '940 of 1,000 borrowers repay, so the constant "repays" prediction is right 94% of the time — while catching no defaults at all.'),
      mcq('A new churn model has 89.5% accuracy; the most-frequent dummy has 89.2%. What is the right conclusion?', [
        ['Accuracy cannot show its value; compare recall or AUC with the rule baseline', true],
        ['The model is excellent, since nearly 90% accuracy is a high score for churn', false],
        ['The model is useless and should be abandoned in favour of the dummy', false],
        ['The dummy must be leaking, because it scores almost as well as the model', false],
      ], 'With 10.7% positives, accuracy rewards predicting "no". The question is whether the model finds more churners than the team\'s rule for the same effort.'),
      mcq('A median DummyRegressor has MAE 7.6 minutes and a linear model has MAE 3.0. How should the result be reported?', [
        ['The model cuts the average error by about 60% versus predicting the median', true],
        ['The model is 3.0 minutes better than a baseline that predicts the median', false],
        ['The model explains 3.0 minutes of the variation in delivery time on test', false],
        ['The model and the baseline are equivalent, as both errors are under 10', false],
      ], '(7.6 − 3.0) / 7.6 ≈ 60%. The baseline turns an abstract MAE into an improvement the business can judge.'),
    ],
    checkpoint: [
      ck(CON, 'Which baseline should a weekly sales forecast for a clothing retailer be compared with first?', [
        ['The same week last year (a seasonal naive forecast)', true],
        ['A most-frequent DummyClassifier on the sales figures', false],
        ['The average of every week in the training history', false],
        ['A forecast of zero sales, the smallest possible value', false],
      ], 'Retail demand is strongly seasonal (festivals, sales); a seasonal naive forecast captures that for free and is often hard to beat.'),
      ck(CON, 'A fraud model scores below the most-frequent DummyClassifier on balanced accuracy. What should be checked first?', [
        ['The pipeline, for a bug such as misaligned labels or a broken feature', true],
        ['Whether a deeper model with more trees would improve the score', false],
        ['Whether the dummy has leaked information from the test set', false],
        ['Whether balanced accuracy is ever valid for fraud detection', false],
      ], 'A model should at least match a constant prediction. Losing to it usually means shuffled or misaligned labels, a wrong column, or a preprocessing error.'),
      ck(CON, 'A churn model finds 38% of churners for 100 calls; the current rule finds 35% for the same 100 calls. What does the baseline tell the team?', [
        ['The gain is small, so cost, explainability and upkeep decide whether to ship', true],
        ['The model is clearly better, so it should replace the rule immediately', false],
        ['The rule is better, because a rule can never be beaten by a model', false],
        ['Nothing, since a business rule is not a valid baseline for a model', false],
      ], 'A 3-point gain may not justify a model\'s maintenance and monitoring. The rule is the honest comparison, and sometimes the right thing to keep.'),
    ],
  },

  /* ── SKLEARN_API ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_SKLEARN_API',
    notes: `scikit-learn has hundreds of models and transformers, and they all behave the same way. Learn the
pattern once and every new estimator is a one-line change. This unit is that pattern.

## Estimators: configure, fit, predict

    from sklearn.linear_model import LogisticRegression

    model = LogisticRegression(C=1.0, max_iter=1000)    # 1. configure (hyperparameters)
    model.fit(X_train, y_train)                          # 2. learn (parameters)
    model.predict(X_test)                                # 3. use

Every estimator is a Python object. **Constructing** it only stores settings; nothing is learned.
**fit** learns from data and returns the estimator itself (so \`LogisticRegression().fit(X, y)\` works in one
line). **predict** uses what was learned.

Calling predict before fit raises \`NotFittedError\` — the library refusing to guess.

## Hyperparameters versus learned parameters

- **Hyperparameters** are set by you, before training: \`C\`, \`max_iter\`, \`max_depth\`, \`n_estimators\`. You
  choose them by validation (cross-validation unit).
- **Learned parameters** come from the data and end in an **underscore**: \`coef_\`, \`intercept_\`, \`classes_\`,
  \`feature_importances_\`. The underscore means "exists only after fit".

On the churn data with three numeric features:

    model.classes_              # [0 1]
    model.coef_.round(4)        # [[-0.0371 -0.0021  0.4574]]
    model.intercept_.round(3)   # [-0.951]
    model.n_features_in_        # 3
    list(model.feature_names_in_)   # ['tenure_months', 'monthly_recharge', 'care_calls']

Reading them: each extra care call adds 0.457 to the log-odds of churn — multiplies the odds by e^0.457 ≈ **1.58**.
Each extra month of tenure multiplies the odds by e^−0.037 ≈ 0.96. (The coefficients are per unit of each raw
feature, so they cannot be compared with each other for "importance" until the features are on one scale.)

\`get_params()\` and \`set_params()\` read and change hyperparameters — this is how search tools tune them:

    model.get_params()["C"]       # 1.0
    model.set_params(C=0.1)
    model.C                       # 0.1

## predict, predict_proba, score

    model.predict(X_test.head(3))                  # [0 0 0]
    model.predict_proba(X_test.head(3)).round(3)
    # [[0.777 0.223]
    #  [0.968 0.032]
    #  [0.729 0.271]]
    model.score(X_test, y_test)                    # 0.895 (accuracy for classifiers)

\`predict_proba\` returns one column per class, in the order of \`classes_\`; column 1 is P(churn). \`score\`
is accuracy for classifiers and R² for regressors — convenient, rarely the metric you should report. Use
\`sklearn.metrics\` for the one you chose when framing.

## Transformers: fit, then transform

Preprocessing objects follow the same pattern with **transform** instead of predict:

    from sklearn.preprocessing import StandardScaler

    sc = StandardScaler()
    Xs = sc.fit_transform(X_train)          # learns mean and std from TRAIN, then scales it
    sc.mean_.round(2)                       # [ 30.47 292.72   0.77]
    sc.scale_.round(2)                      # [ 17.45 111.2    0.85]
    Xs.mean(axis=0).round(3)                # [-0.  0. -0.]   (zero; "-0." is a rounding artefact)
    Xs.std(axis=0).round(3)                 # [1. 1. 1.]

    Xt = sc.transform(X_test)               # uses the TRAIN mean and std
    Xt.mean(axis=0).round(3)                # [0.008 0.018 0.07 ]

The test set's scaled means are close to 0 but not exactly — correctly so. **Never call fit (or fit_transform)
on test data**: that would scale it with its own statistics, which you would not have for a single new customer
in production.

## Swapping the model is one line

    from sklearn.tree import DecisionTreeClassifier
    tree = DecisionTreeClassifier(max_depth=3, random_state=42).fit(X_train, y_train)
    tree.feature_importances_.round(3)     # [0.511 0.268 0.222]
    tree.score(X_test, y_test)             # 0.892

Same fit, same predict, same score. Models with randomness (trees, forests, many solvers) take
\`random_state\`; set it, or your results will not reproduce.

## Reading the documentation

Each estimator's page lists, in order: **Parameters** (hyperparameters and defaults), **Attributes** (learned,
with underscores), **Methods**, and examples. Two habits save hours:

- Check **defaults** you did not set: \`LogisticRegression\` applies L2 regularisation with C = 1.0 by default —
  your "plain" logistic regression is regularised.
- Check the **version notes**: parameters are added, renamed and deprecated. Note your scikit-learn version
  (\`sklearn.__version__\`) in every notebook.

## The API in one table

| Object | Learns with | Uses with | Examples |
|---|---|---|---|
| Classifier | fit(X, y) | predict, predict_proba, score | LogisticRegression, RandomForestClassifier |
| Regressor | fit(X, y) | predict, score (R²) | LinearRegression, Ridge |
| Transformer | fit(X) | transform, fit_transform | StandardScaler, OneHotEncoder, SimpleImputer |
| Meta-estimator | fit(X, y) | whatever it wraps | Pipeline, GridSearchCV |`,
    mcqs: [
      mcq('After `model = LogisticRegression(C=0.5)`, which attribute does NOT exist yet?', [
        ['model.coef_', true],
        ['model.C', false],
        ['model.max_iter', false],
        ['model.penalty', false],
      ], 'Hyperparameters exist from construction. Attributes ending in an underscore are learned and appear only after fit.'),
      mcq('A logistic regression has coefficient 0.4574 for care_calls. What happens to the odds of churn for each extra call?', [
        ['They are multiplied by about 1.58', true],
        ['They increase by 0.4574 percentage points', false],
        ['They are multiplied by about 0.46', false],
        ['They increase by 45.74 percent exactly', false],
      ], 'Coefficients are on the log-odds scale, so one more call multiplies the odds by e^0.4574 ≈ 1.58 — a 58% increase in the odds, not in the probability.'),
      mcq('Why should a StandardScaler be fitted on the training set and only used to transform the test set?', [
        ['Production rows must be scaled with statistics learned before they arrived', true],
        ['Fitting on the test set would raise an error because it has fewer rows', false],
        ['The training set is larger, so its mean is always closer to zero', false],
        ['transform is faster than fit, so it saves time on the larger set', false],
      ], 'A single new customer has no mean or standard deviation of its own. Evaluation must imitate that by scaling test rows with the training statistics.'),
    ],
    checkpoint: [
      ck(CON, 'For a fitted binary classifier with classes_ = [0, 1], what is `predict_proba(X)[:, 1]`?', [
        ['The predicted probability of class 1 for each row', true],
        ['The predicted label of the second row in X', false],
        ['The probability of class 0 for every row', false],
        ['The model\'s overall confidence in its own accuracy', false],
      ], 'predict_proba has one column per class in the order of classes_, so column 1 is P(class 1).'),
      ck(CON, 'Which of these is a hyperparameter rather than a learned parameter?', [
        ['max_depth of a DecisionTreeClassifier', true],
        ['coef_ of a fitted LogisticRegression', false],
        ['mean_ of a fitted StandardScaler', false],
        ['feature_importances_ of a fitted tree', false],
      ], 'max_depth is chosen before training. The others end in an underscore because fit learns them from the data.'),
      ck(CON, 'What does `score(X, y)` return for a scikit-learn regressor?', [
        ['The R² of its predictions on X', true],
        ['The mean absolute error on X', false],
        ['The accuracy of its predictions', false],
        ['The root mean squared error on X', false],
      ], 'Regressors\' score is R²; classifiers\' is accuracy. For anything else, use a function from sklearn.metrics.'),
    ],
  },

  /* ── PIPELINES ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_PIPELINES',
    notes: `Real data has numbers with gaps, categories as text, and columns that need different treatment. The
leak unit showed that preprocessing fitted outside the split can fake a result; the scikit-learn API unit showed
that every step has fit and transform. A **Pipeline** puts preprocessing and model into **one estimator**, so
that fit learns everything from training data, predict applies exactly the same steps, and the whole thing can
be cross-validated and saved as one object.

## Different columns, different steps: ColumnTransformer

The churn data has four numeric columns (one with missing values) and two categorical ones:

    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.linear_model import LogisticRegression

    num_cols = ["tenure_months", "monthly_recharge", "data_gb", "care_calls"]
    cat_cols = ["plan", "circle"]

    pre = ColumnTransformer([
        ("num", Pipeline([("impute", SimpleImputer(strategy="median")),
                          ("scale", StandardScaler())]), num_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
    ])

    clf = Pipeline([("pre", pre), ("model", LogisticRegression(max_iter=1000))])
    clf.fit(X_train, y_train)          # X_train is the raw DataFrame, text and NaNs included

    clf.score(X_test, y_test)                                   # 0.9
    roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])      # 0.768

One \`fit\` call: the imputer learns the training medians, the scaler the training means and standard deviations,
the encoder the training categories, and then the model is fitted on the result. One \`predict\` call applies the
same learned steps to new rows.

## Look inside

    clf.named_steps["pre"].get_feature_names_out()
    # ['num__tenure_months' 'num__monthly_recharge' 'num__data_gb' 'num__care_calls'
    #  'cat__plan_basic' 'cat__plan_unlimited' 'cat__plan_value'
    #  'cat__circle_DL' 'cat__circle_KA' 'cat__circle_MH' 'cat__circle_TN' 'cat__circle_UP']

    clf.named_steps["pre"].transform(X_train).shape       # (1600, 12)
    clf.named_steps["pre"].named_transformers_["num"].named_steps["impute"].statistics_
    # [ 30. 279.  10.   1.]   — the training medians used to fill gaps

Six raw columns become 12 model inputs: four scaled numbers, three plan flags and five circle flags. Pairing the
names with the coefficients:

    num__tenure_months      -0.648        cat__plan_basic         0.563
    num__care_calls          0.374        cat__circle_TN          0.481
    num__data_gb            -0.280        cat__circle_DL         -0.328

Tenure, care calls and the basic plan behave as the data was built. But **circle has no effect in this data**,
yet TN gets +0.48 and DL −0.33: with roughly 300 training customers per circle, TN happened to get 51
churners and DL 25, and chance differences like that look like effects. Coefficients on small categories need uncertainty (or regularisation) before anyone builds a
"Tamil Nadu retention campaign" on them.

## New data, unseen categories, missing values

A new customer from Gujarat — a circle the training data never had — with missing data usage:

    new = pd.DataFrame([{"tenure_months": 3, "plan": "basic", "circle": "GJ",
                         "monthly_recharge": 149.0, "data_gb": np.nan, "care_calls": 3}])
    clf.predict_proba(new).round(3)        # [[0.473 0.527]]

The imputer fills \`data_gb\` with the training median (10.0), and \`handle_unknown="ignore"\` encodes GJ as all
zeros instead of crashing. Without it, OneHotEncoder raises an error on any category it has not seen — safe, but
a production outage when a new circle launches. Decide deliberately which you want.

## Why not pd.get_dummies?

    pd.get_dummies(train)   →  ['tenure_months', 'plan_basic', 'plan_unlimited', 'plan_value']
    pd.get_dummies(new)     →  ['tenure_months', 'plan_value']

\`get_dummies\` creates columns from **whatever values are in the frame it is given**. A single new row has one
plan, so it gets one plan column. scikit-learn then refuses:

    ValueError: The feature names should match those that were passed during fit.
    Feature names seen at fit time, yet now missing:
    - plan_basic
    - plan_unlimited

Worse, with NumPy arrays (no names) and the same number of columns, the columns can silently line up wrongly. A
fitted OneHotEncoder remembers the training categories and always produces the same columns in the same order.
Use get_dummies for exploration; use OneHotEncoder inside a pipeline for models.

## Why pipelines prevent leakage

When a pipeline is passed to \`cross_val_score\` or \`GridSearchCV\`, **the whole pipeline is re-fitted inside
each fold** — the imputer's medians, the scaler's means, the selected features, all from that fold's training
part only. The feature-selection leak in the splits unit (0.85 on noise) disappears (0.48) for exactly this
reason. Preprocessing written as separate notebook cells cannot do this.

## Saving and loading

    import joblib
    joblib.dump(clf, "churn_pipeline.joblib")
    loaded = joblib.load("churn_pipeline.joblib")      # a Pipeline, ready to predict on raw rows

The saved file contains the medians, the scaling, the categories and the model — everything needed to score a
raw row. Load it with the **same scikit-learn version** it was saved with; pickled models are not guaranteed to
load across versions.

## Shortcuts

\`make_pipeline(StandardScaler(), LogisticRegression())\` names steps automatically ("standardscaler",
"logisticregression"); \`make_column_transformer\` does the same for ColumnTransformer. Explicit names are easier
to tune and read — you will address them as \`model__C\` in the next unit.`,
    mcqs: [
      mcq('A pipeline\'s OneHotEncoder uses `handle_unknown="ignore"`. What happens to a category it never saw in training?', [
        ['It is encoded as all zeros in that column\'s one-hot block', true],
        ['It is mapped to the most frequent category in the training data', false],
        ['It raises an error, so the row cannot be scored at all', false],
        ['It is added as a new column and the model is re-fitted', false],
      ], '"ignore" produces zeros for every known category of that column. The default ("error") raises instead, which is safer but can stop production.'),
      mcq('Why does `pd.get_dummies` on a single new row break a model trained on get_dummies output?', [
        ['It creates columns only for values present in that row', true],
        ['It cannot process a DataFrame that has only one row', false],
        ['It returns booleans, which scikit-learn models reject', false],
        ['It sorts the rows, so predictions come back reordered', false],
      ], 'The new frame has one plan value, so it gets one plan column; the model expects all of them. A fitted OneHotEncoder remembers the training categories.'),
      mcq('A pipeline with imputer, scaler and model is passed to cross_val_score. Which statistics does each fold\'s scaler use?', [
        ['The mean and std of that fold\'s training part', true],
        ['The mean and std of the whole dataset', false],
        ['The mean and std of that fold\'s validation part', false],
        ['The mean and std from the first fold only', false],
      ], 'The whole pipeline is cloned and fitted on each fold\'s training rows, so nothing from the validation rows reaches preprocessing — the point of using a pipeline.'),
    ],
    checkpoint: [
      ck(CON, 'A ColumnTransformer one-hot encodes "plan" (3 values) and "circle" (5 values) and scales 4 numeric columns. How many features reach the model?', [
        ['12', true],
        ['6', false],
        ['8', false],
        ['15', false],
      ], 'Four scaled columns plus three plan indicators plus five circle indicators: 4 + 3 + 5 = 12, as get_feature_names_out lists.'),
      ck(CON, 'Which mistake does putting a SimpleImputer inside the pipeline prevent?', [
        ['Filling gaps with medians computed on rows the model is evaluated on', true],
        ['Leaving gaps in the data, which no model in scikit-learn can accept', false],
        ['Imputing a categorical column with the median of a numeric column', false],
        ['Running out of memory when the dataset has more than a million rows', false],
      ], 'Inside the pipeline the medians are learned from the training rows only, in every fold and in production — no information from evaluation rows leaks in.'),
      ck(CON, 'A pipeline was saved with joblib. What does the saved file contain?', [
        ['The fitted preprocessing steps and the fitted model together', true],
        ['Only the model\'s coefficients, without the preprocessing steps', false],
        ['The training data, so the model can be refitted when it loads', false],
        ['The Python source code of the notebook that trained the model', false],
      ], 'A fitted pipeline holds the imputer\'s medians, the scaler\'s statistics, the encoder\'s categories and the model, so it can score raw rows directly.'),
    ],
  },

  /* ── CROSS_VALIDATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_CROSS_VALIDATION',
    notes: `One validation split is one roll of the dice: with 43 churners in 400 rows, a lucky or unlucky split
moves the score by several points. **Cross-validation** averages over several splits, so you compare models on
signal rather than luck. **Hyperparameter search** uses it to choose settings. And the test set stays in its
envelope until the very end.

## k-fold cross-validation

Split the training data into k folds (usually 5). Train on k − 1, validate on the one left out, rotate, and
average the k scores:

    from sklearn.model_selection import cross_val_score, StratifiedKFold

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    s = cross_val_score(clf, X_train, y_train, cv=cv, scoring="roc_auc")
    s.round(3)            # [0.695 0.739 0.721 0.75  0.695]
    s.mean(), s.std()     # 0.72, 0.022

Report both numbers: **ROC AUC 0.720 ± 0.022**. The spread is the point: two models whose means differ by
0.003 are not distinguishable on this data.

\`clf\` is the whole pipeline from the previous unit, so each fold re-fits the imputer, scaler and encoder on its
own training part. Cross-validating a model on pre-scaled data would leak.

## Stratified versus plain k-fold

Churn rate in each validation fold:

    StratifiedKFold:   0.106 0.106 0.106 0.106 0.109
    KFold (no shuffle): 0.084 0.131 0.097 0.094 0.128

Stratified folds keep the class balance; plain folds wander from 8.4% to 13.1%, adding noise to every score. For
classification, \`cross_val_score\` with \`cv=5\` already uses stratified folds — pass an explicit splitter when
you want shuffling and a fixed \`random_state\`. Use \`GroupKFold\` when entities repeat and \`TimeSeriesSplit\`
for forecasting, as in the splits unit.

## GridSearchCV: try every combination

    from sklearn.model_selection import GridSearchCV

    grid = GridSearchCV(clf, {"model__C": [0.01, 0.1, 1, 10]}, cv=cv, scoring="roc_auc")
    grid.fit(X_train, y_train)
    grid.best_params_, grid.best_score_       # ({'model__C': 0.01}, 0.724)

     param_model__C  mean_test_score  std_test_score  rank_test_score
               0.01            0.724           0.021                1
               0.10            0.723           0.021                2
               1.00            0.720           0.022                3
              10.00            0.719           0.023                4

- Parameters of a step inside a pipeline are named **\`<step>__<param>\`** — two underscores. Writing \`"C"\`
  fails with \`ValueError: Invalid parameter 'C' for estimator Pipeline(...)\`.
- \`cv_results_\` is the full table; look at it, not just \`best_params_\`. Here all four values are within one
  standard deviation of each other: C barely matters for this model, and the "best" one won by noise.
- With the default \`refit=True\`, the search re-fits the best settings on **all** of X_train, so \`grid\` itself
  is the final model.

Only now, once, the test set:

    roc_auc_score(y_test, grid.predict_proba(X_test)[:, 1])       # 0.789

The test score (0.789) is **higher** than cross-validation (0.724). Nothing is wrong: 400 test rows with 43
churners is a small sample, and its AUC has a spread of a few points too. Report it as it is; do not go back and
"fix" anything because of it — that would turn the test set into a validation set.

## RandomizedSearchCV: sample when the grid is big

A random forest with three hyperparameters would need hundreds of grid combinations. Random search tries a fixed
number of random ones:

    from sklearn.model_selection import RandomizedSearchCV
    from sklearn.ensemble import RandomForestClassifier
    from scipy.stats import randint

    rf = Pipeline([("pre", pre), ("model", RandomForestClassifier(random_state=42))])
    rs = RandomizedSearchCV(rf, {"model__n_estimators": randint(100, 400),
                                 "model__max_depth": [3, 5, 8, None],
                                 "model__min_samples_leaf": randint(1, 30)},
                            n_iter=15, cv=cv, scoring="roc_auc", random_state=42, n_jobs=-1)
    rs.fit(X_train, y_train)
    rs.best_params_      # {'model__max_depth': 3, 'model__min_samples_leaf': 7, 'model__n_estimators': 221}
    rs.best_score_       # 0.696;  test ROC AUC 0.746

15 tries cover the important ranges reasonably; use distributions (\`randint\`, \`loguniform\` for C or learning
rates) instead of lists where you can. The forest (0.696 CV) does **not** beat the logistic regression (0.724
CV) — this data was generated from a logistic model, and the simpler model wins. Search does not guarantee a
complex model is worth it.

## The honest protocol

1. Split off the test set first (stratified, grouped or by time, as the problem requires).
2. On the training part only: cross-validate baselines and candidate pipelines; tune with search.
3. Choose **one** final pipeline — by CV score, its spread, and simplicity.
4. Evaluate it **once** on the test set and report that number.
5. For production, re-fit the chosen pipeline on all the data you have.

**Nested cross-validation** (a search inside each outer fold) estimates the performance of the whole "tune then
fit" procedure without a separate test set. It is expensive; use it when data is too small to spare a test set.

## Costs to keep in mind

Grid search over 4 values of C with 5 folds is 20 fits plus one refit. Add 4 values of a second parameter and
it is 80. \`n_jobs=-1\` uses all CPU cores. Start coarse (powers of 10), then refine around the best region.`,
    workedExample: `**Problem.** An NBFC's analyst has two candidate pipelines for loan default — logistic regression
and a gradient-boosted model — and 6,000 labelled loans from 2022–2023. The model will score 2024 applications.
Design the evaluation and choose.

**Step 1 — split by time, because the model predicts forward.** Train on loans **disbursed** January 2022 to
June 2023; hold out July–December 2023 as the test set. (Labels need a full 12 months of repayment history, so
the analyst checks that the latest test loans have matured enough to be labelled; immature ones are dropped, not
labelled "repaid".)

**Step 2 — cross-validate within the training period, also by time.** \`TimeSeriesSplit(n_splits=4)\` on loans
sorted by disbursal date, so each fold trains on earlier loans and validates on later ones.

**Step 3 — tune inside the pipelines.** \`GridSearchCV\` on \`model__C\` for the logistic regression;
\`RandomizedSearchCV\` with 20 iterations on learning rate, depth and number of trees for boosting. Scoring:
ROC AUC for ranking quality, because the credit team sets its own cut-off.

**Step 4 — read the results, not just the winner.** Suppose: logistic regression 0.781 ± 0.012; boosting 0.789 ±
0.019. The gap (0.008) is smaller than either spread. The analyst also checks the fold-by-fold scores: boosting
wins in two folds and loses in two.

**Step 5 — decide.** With no clear win, the simpler, explainable model is preferred for credit decisions, where
regulators and customers may ask why an application was declined. Logistic regression is chosen.

**Step 6 — the test set, once.** The chosen pipeline is re-fitted on all training loans and scored on July–
December 2023: say 0.774. That is the number in the report, together with the CV estimate.

**What to take from it:** the split mirrors how the model will be used, all tuning happens inside the training
period, and a difference smaller than its noise is not a reason to choose a more complex model.`,
    mcqs: [
      mcq('Five-fold CV gives model A 0.724 ± 0.021 and model B 0.720 ± 0.022 (ROC AUC). What should you conclude?', [
        ['The difference is within the noise; prefer the simpler or cheaper model', true],
        ['Model A is better and should be chosen, since its mean is the higher', false],
        ['Model B is better, because a lower mean comes with a lower variance', false],
        ['Neither model is usable, since a spread above 0.02 means it is unstable', false],
      ], 'A 0.004 gap against spreads of about 0.02 cannot separate the models. Simplicity, cost and explainability should decide.'),
      mcq('GridSearchCV on a Pipeline with a step named "model" fails on the grid {"C": [0.1, 1]}. What is the fix?', [
        ['Name the parameter "model__C" in the grid', true],
        ['Pass the grid to the model\'s own fit call', false],
        ['Move C into the ColumnTransformer\'s step', false],
        ['Replace the Pipeline with the model alone', false],
      ], 'Inside a pipeline, parameters are addressed as <step>__<param>. Removing the pipeline would bring back preprocessing leakage.'),
      mcq('After tuning, the test ROC AUC (0.789) is higher than the cross-validated score (0.724). What should happen next?', [
        ['Report the test score as it is, without tuning anything further', true],
        ['Re-tune on the test set, since it appears to be the better data', false],
        ['Discard the test score as a bug, because test cannot beat CV', false],
        ['Re-run the train/test split with a seed that gives closer scores', false],
      ], 'A 400-row test set has its own sampling noise. Changing the split or tuning after looking would turn the test set into a validation set.'),
    ],
    checkpoint: [
      ck(CON, 'GridSearchCV tries 3 values of C and 4 of max_iter with cv=5 and refit=True. How many fits does it run?', [
        ['61', true],
        ['60', false],
        ['12', false],
        ['17', false],
      ], '3 × 4 = 12 combinations, each fitted 5 times = 60, plus one refit of the best combination on all the training data = 61.'),
      ck(CON, 'Why is StratifiedKFold preferred over plain KFold for a churn model with 10% positives?', [
        ['Each fold keeps about 10% churners, so fold scores vary less', true],
        ['It doubles the number of churners so the classes are balanced', false],
        ['It splits customers by signup date, avoiding look-ahead leaks', false],
        ['It trains on the validation fold too, which uses more data', false],
      ], 'Plain folds wandered from 8.4% to 13.1% churn; stratified folds stayed at 10.6–10.9%, removing one source of noise from every score.'),
      ck(CON, 'In the honest protocol, when is the test set used?', [
        ['Once, after the final pipeline has been chosen', true],
        ['After every round of hyperparameter tuning', false],
        ['To choose between the two best candidate models', false],
        ['Before cross-validation, to check the split is fair', false],
      ], 'Any decision made by looking at the test score makes it optimistic. It is reserved for one final, reported estimate.'),
    ],
  },

  /* ── BIAS_VARIANCE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_BIAS_VARIANCE',
    notes: `Year 1 named the two failures: **overfitting** (learning the noise — great on training data, poor on
new data) and **underfitting** (too simple — poor on both). This unit makes them measurable, so you can tell
which one you have from numbers and curves, and choose the fix that actually helps.

## Bias and variance, informally

- **Bias** is error from a model too simple for the pattern — a straight line through a curve. More data does
  not help; the line is still a line.
- **Variance** is error from a model so flexible that it fits the particular sample — retrain on another sample
  and it changes a lot. More data and simpler models help.

Total error on new data ≈ bias² + variance + irreducible noise. Model complexity trades one against the other.
The noise floor you cannot beat.

## Seeing it: polynomial degree

Crop yield (quintals per acre) against seasonal rainfall (mm) for 40 farms, simulated with a curved relationship
— yield rises with rain then falls when it floods — plus noise with variance 2.25 (NumPy seed 3, half the farms
held out):

    for d in [1, 2, 4, 10]:
        m = make_pipeline(StandardScaler(), PolynomialFeatures(d), LinearRegression()).fit(Xtr, ytr)

    degree   train MSE   validation MSE   validation R²
    1          4.55          4.61             0.065
    2          1.69          2.86             0.419
    4          1.06          6.84            -0.388
    10         0.51        501.95          -100.92

- **Degree 1 — underfitting (high bias).** Train and validation are both bad and close together. The straight line
  is nearly flat because yield rises and then falls.
- **Degree 2 — about right.** Train error near the noise level, the lowest validation error.
- **Degree 4 and 10 — overfitting (high variance).** Training error keeps falling — the model is bending to the
  noise — while validation error explodes. Degree 10 has a validation R² of −101: far worse than predicting the
  mean, because a high-degree polynomial swings wildly at the edges (one validation farm has 402 mm of rain;
  the lowest in training is 503).

**Training error always falls with complexity.** That is why it can never be used to choose a model.

## Validation curves: one hyperparameter, two scores

\`validation_curve\` does this for any hyperparameter. A decision tree's depth on the churn data (5-fold stratified
CV, ROC AUC):

    from sklearn.model_selection import validation_curve
    tr, va = validation_curve(DecisionTreeClassifier(random_state=42), Xc, yc,
                              param_name="max_depth", param_range=[1, 2, 3, 4, 6, 8, 12, 20],
                              cv=cv, scoring="roc_auc")

    depth   train AUC   validation AUC
    1        0.646        0.639
    2        0.686        0.658
    3        0.716        0.649
    4        0.743        0.645
    6        0.814        0.618
    8        0.889        0.543
    12       0.976        0.552
    20       0.998        0.546

Validation peaks at depth 2–3, then falls while training AUC climbs towards 1.0. A depth-20 tree has memorised
the training customers (0.998) and is barely better than chance on new ones (0.546). **The gap between the two
curves is the diagnostic.**

## Learning curves: what more data would do

\`learning_curve\` trains on growing subsets and reports both scores:

    deep tree (max_depth=20)             stump (max_depth=1)
    rows   train   validation            rows   train   validation
    160    1.000   0.536                 160    0.583   0.532
    480    1.000   0.543                 480    0.628   0.623
    960    1.000   0.546                 960    0.660   0.614
    1600   0.998   0.546                 1600   0.646   0.639

- **High variance (deep tree):** a large, persistent gap; validation creeps up slowly as rows are added. More
  data would help a little; constraining the model helps far more.
- **High bias (stump):** the curves meet at a low level. More data does **nothing** — the curves have already
  converged. Only a more expressive model or better features will help.

## The fixes, matched to the diagnosis

| Diagnosis | Signs | Fixes that work | Fixes that don't |
|---|---|---|---|
| Underfitting | train and validation both poor, small gap | more flexible model, better features, less regularisation | more rows |
| Overfitting | train much better than validation | more data, simpler model, stronger regularisation (smaller C, larger alpha, lower max_depth, min_samples_leaf), fewer noisy features, ensembles that average (random forests) | training longer, adding features |
| Neither, but not good enough | small gap, mediocre level | better features, more informative data, reframing | tuning harder |

## Two traps

- **"Validation is better than training, so we are fine."** On small data, validation can beat training by
  chance (the pipeline in this topic had train AUC 0.737 and test 0.768). Look at the size of samples and the
  spread across folds before reading anything into a small reversed gap.
- **Over-tuning to validation.** Trying hundreds of settings and picking the best validation score overfits the
  validation set itself. The test set, used once, catches it.`,
    mcqs: [
      mcq('A model scores train MSE 4.55 and validation MSE 4.61, both far above the noise level. What is the diagnosis?', [
        ['Underfitting: the model is too simple for the pattern', true],
        ['Overfitting: the model has memorised the training data', false],
        ['A good fit: training and validation errors agree closely', false],
        ['Leakage: the validation set must overlap the training set', false],
      ], 'Both errors are high and close together — the signature of high bias. A closer match between the two is not a sign of a good model when both are poor.'),
      mcq('A depth-20 tree has training AUC 0.998 and validation AUC 0.546. Which change is most likely to help?', [
        ['Limit max_depth or raise min_samples_leaf', true],
        ['Train the same deep tree for many more epochs', false],
        ['Add more polynomial features to the data', false],
        ['Evaluate on the training set instead', false],
      ], 'A huge gap means high variance. Constraining the tree (or averaging many trees) reduces it; adding features or flexibility would widen the gap.'),
      mcq('A learning curve shows train and validation scores meeting at a low value as rows increase. Will collecting more data help?', [
        ['Very little; the model needs more capacity or better features', true],
        ['Yes; the curves meeting means more data is needed to separate them', false],
        ['Yes; validation always keeps improving as the training set grows', false],
        ['No, because the model is overfitting and must be simplified', false],
      ], 'Converged curves at a low level mean high bias. More rows give the same answer; a more expressive model or more informative features can raise the level.'),
    ],
    checkpoint: [
      ck(OVR, 'As a polynomial\'s degree rises from 2 to 10, training MSE falls from 1.69 to 0.51 and validation MSE rises from 2.86 to 501.95. What is happening?', [
        ['The model is fitting the noise in the training sample', true],
        ['The model is becoming too simple to capture the curve', false],
        ['The validation set has leaked into the training set', false],
        ['The learning rate is too large for the higher degree', false],
      ], 'Falling training error with exploding validation error is overfitting: the extra flexibility follows the training noise and swings wildly elsewhere.'),
      ck(OVR, 'Why can training error never be used to choose a model\'s complexity?', [
        ['It keeps falling as complexity rises, even while new-data error grows', true],
        ['It is computed on fewer rows than validation error in most splits', false],
        ['It is always higher than validation error for a well-fitted model', false],
        ['It is measured in different units from the validation error', false],
      ], 'A more flexible model can always fit its own training data at least as well, so training error rewards overfitting. Only held-out error can choose.'),
      ck(OVR, 'Which hyperparameter change reduces the variance of a logistic regression in scikit-learn?', [
        ['Decreasing C, which strengthens the regularisation', true],
        ['Increasing C, which strengthens the regularisation', false],
        ['Increasing max_iter so the solver runs for longer', false],
        ['Adding one-hot columns for every rare category', false],
      ], 'In scikit-learn C is the inverse of regularisation strength, so a smaller C shrinks the coefficients more and reduces variance.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_DEBUGGING',
    notes: `Workflow bugs are the most expensive kind: the code runs, the score is good, the model ships, and it
disappoints in production. Eight faults from real projects — the symptom, the cause, and the fix. Numbers come
from this topic's churn data (make_churn(), seed 42) with scikit-learn 1.9.

## 1. 0.977 ROC AUC on churn — in a problem where 0.77 is good

**Symptom:** adding one feature lifts test AUC from 0.768 to 0.977. The team celebrates.
**Cause:** target leakage. The feature, "days since last recharge", was computed on the day the data was
extracted, 45 days after the cutoff — so churners, who had stopped recharging, all have large values.
**Fix:** recompute every feature **as of the prediction date**; for each feature, write down when it is
recorded. A single feature that predicts almost perfectly on its own is a leak until proven otherwise.

## 2. The scaler (or imputer, or encoder) fitted on all the data

**Symptom:** cross-validated scores in the notebook are a little better than the same model's performance on
next month's data; feature selection or target encoding make the gap large.
**Cause:** \`StandardScaler().fit_transform(X)\` — or SelectKBest, or a target encoder — ran on the full dataset
before the split, so statistics from validation rows shaped the training. With feature selection on noise this
turned a coin-flip (0.48) into 0.85.
**Fix:** put every fitted step inside a Pipeline and cross-validate the pipeline. Search the notebook for
\`fit\` calls on anything other than training data.

## 3. The test score is better than the training score

**Symptom:** train ROC AUC 0.737, test 0.768. Someone suspects a bug.
**Cause:** usually none — a 400-row test set with 43 churners has a sampling spread of a few points, and
regularised models do not fit training data tightly. Real causes do exist and should be ruled out: test rows
duplicated from training (leak), a test period that happens to be easier, or a training metric computed with
dropout/augmentation in deep learning.
**Fix:** check for duplicates and overlap, compare the gap with the cross-validation spread, and do **not** tune
anything in response to the test score.

## 4. Predictions fail — or quietly go wrong — at predict time

**Symptom:** the model trained on \`pd.get_dummies(train)\` raises \`ValueError: The feature names should match
those that were passed during fit\` on a single new row. A colleague "fixed" it by converting to NumPy, and now
it predicts without errors — wrongly.
**Cause:** get_dummies creates columns from the values present. One new row produced \`['tenure_months',
'plan_value']\` instead of the four training columns; without names, mismatched columns can line up silently.
**Fix:** OneHotEncoder inside a pipeline (with \`handle_unknown\` chosen deliberately), saved with the model.

## 5. The model predicts only one class

**Symptom:** 90% accuracy, and the logistic regression pipeline predicts churn for 3 of 400 customers (recall
0.07).
**Cause:** class imbalance (10.7% churn) plus a 0.5 threshold. The model's probabilities rarely exceed 0.5, so
\`predict\` almost always says "stays".
**Fix:** judge with recall, precision, ROC AUC or balanced accuracy, not accuracy; choose a threshold from the
business cost, or use \`class_weight="balanced"\`. With balanced weights the same pipeline flags 157 customers and
recall rises to 0.744 — accuracy drops to 0.66, which is fine, because accuracy was never the goal.

## 6. A great random-split score, a poor launch

**Symptom:** a demand model with MAPE 8% in validation is at 25% in its first month live.
**Cause:** a random split on time-series data. The model learned from days after the ones it was tested on —
including the festival weeks it was "forecasting".
**Fix:** split by time (TimeSeriesSplit for CV) so validation always lies after training, and include a seasonal
naive baseline.

## 7. R² is negative on the test set

**Symptom:** R² 0.77 on training data, −0.39 on validation; a degree-10 version gives −101.
**Cause:** a negative R² means the model is **worse than predicting the mean** — not an arithmetic error.
Here, polynomial features overfit 20 training farms, and one validation farm lies outside the training range of
rainfall, where the polynomial swings wildly. In production the same symptom comes from distribution shift
(a new city, a new price range) or a broken feature pipeline.
**Fix:** compare with a DummyRegressor, check whether test inputs fall outside the training range, and reduce
complexity (degree 2 gives validation R² 0.42 here) or regularise.

## 8. "The best hyperparameters" change every time the notebook runs

**Symptom:** GridSearchCV picks C = 0.01 today and C = 1 tomorrow, with no code change.
**Cause:** no \`random_state\` on the CV splitter or the model, and scores that differ by less than their noise
(0.724 vs 0.720 with a spread of 0.022).
**Fix:** fix \`random_state\` everywhere, read \`cv_results_\` for the spread, and treat near-ties as ties — choose
the simpler or more regularised setting.

## A debugging order for any model that looks too good or too bad

1. Baseline: does it beat a dummy and the business rule? 2. Leakage: when is each feature recorded? 3. Split:
does it match how the model will be used (time, groups)? 4. Preprocessing: is everything inside the pipeline?
5. Metric: is it the one the decision needs?`,
    mcqs: [
      mcq('A churn model predicts "stays" for 397 of 400 customers and reports 90% accuracy. What is the first fix?', [
        ['Evaluate recall or AUC, and choose a threshold or class weights', true],
        ['Collect more data until the accuracy rises above ninety percent', false],
        ['Remove the minority class so the model is trained on one class', false],
        ['Switch to a decision tree, which never predicts only one class', false],
      ], 'With 10.7% churn, accuracy rewards predicting "no". Class weights or a lower threshold make the model flag churners; recall and AUC show whether it ranks them well.'),
      mcq('Validation R² is −0.39. What does that mean?', [
        ['The model predicts worse than the validation mean', true],
        ['The model explains 39% of the variation, reversed', false],
        ['The metric was computed with the arguments swapped', false],
        ['The target values in validation are mostly negative', false],
      ], 'R² = 1 − SSE/SST; it is negative when the model\'s squared error exceeds that of predicting the mean. It points to overfitting, shift or a broken pipeline.'),
      mcq('A notebook calls `StandardScaler().fit_transform(X)` and then `cross_val_score(model, X_scaled, y)`. What is wrong?', [
        ['Validation rows influenced the scaling used in training', true],
        ['StandardScaler cannot be used before cross-validation', false],
        ['fit_transform returns a DataFrame that CV cannot accept', false],
        ['The model will fail because its inputs are not scaled', false],
      ], 'The scaler saw every row before the folds were made, so each fold\'s training used statistics from its validation rows. Put the scaler in a pipeline.'),
      mcq('GridSearchCV picks a different best C on every run, with scores 0.724 and 0.720 and spreads around 0.02. What is the right response?', [
        ['Fix random_state and treat the near-tie as a tie, choosing the simpler setting', true],
        ['Run the search many times and keep the C that wins most often across the runs', false],
        ['Use the test set to break the tie, since the CV scores are too close to call', false],
        ['Increase the number of folds until one value of C wins by a clear margin', false],
      ], 'The difference is smaller than the noise; the choice barely matters. Reproducibility comes from fixed seeds, and the test set must not be used to tune.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_PRACTICE',
    notes: `Six exercises across the workflow. Work each in a notebook (or on paper, for the framing ones), then
compare with the answer. Numbers were computed with scikit-learn 1.9, pandas 3.0 and NumPy 2.5.

## Exercise 1 — Frame it

An insurance company says: "Use ML to reduce fraudulent health claims." Write the decision, unit, moment of
prediction, target, a baseline, an ML metric and a business metric.

**Answer (one good version).** Decision: which claims go to a manual investigator before payment. Unit: one
claim, scored **when it is submitted**. Target: claim later confirmed fraudulent by investigation (1/0) — noting
that only investigated claims have reliable labels. Baseline: the current red-flag rules. ML metric: precision in
the top N claims per day the investigators can handle, plus recall. Business metric: fraud amount prevented per
investigator-hour, versus the rules.

## Exercise 2 — Find the leaks

A model predicts whether a loan applicant will default within 12 months. Features: \`monthly_income\`,
\`existing_emis\`, \`cibil_score_at_application\`, \`num_late_payments_on_this_loan\`, \`loan_status\`,
\`collection_agency_assigned\`, \`city\`. Which are leaks?

**Answer.** \`num_late_payments_on_this_loan\`, \`loan_status\` and \`collection_agency_assigned\` all happen after
disbursal — they are consequences of the outcome. The other four are known at application time. (If
\`cibil_score\` were refreshed monthly rather than taken at application, it would leak too — check the timestamp.)

## Exercise 3 — The baseline

1,000 loans, 60 defaults. Model A has 94.5% accuracy and catches 15 of the 60 defaulters. What does the
most-frequent baseline score, and how would you describe Model A?

**Answer.** Always predicting "repays" scores **94%** accuracy and catches **0** defaulters. Model A is 0.5
points better on accuracy — which says little — but catches **25%** of defaulters (15 of 60). Report recall and
precision, and compare them with the current credit rule.

## Exercise 4 — Build the pipeline

E-commerce returns data (3,000 orders, NumPy seed 11): \`price\`, \`discount_pct\` (8% missing), \`category\` (5
values), \`payment_mode\` (COD, UPI, card), \`city_tier\` (3 values), target \`returned\` (24.1% returned). Build a
ColumnTransformer that imputes and scales the numbers and one-hot encodes the categories. How many columns does it
produce?

**Answer.**

    pre = ColumnTransformer([
        ("num", Pipeline([("impute", SimpleImputer(strategy="median")),
                          ("scale", StandardScaler())]), ["price", "discount_pct"]),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["category", "payment_mode", "city_tier"]),
    ])
    pre.fit_transform(X).shape      # (3000, 13)

2 numeric + 5 + 3 + 3 one-hot columns = **13**.

## Exercise 5 — Compare models with cross-validation

On the same data, 5-fold stratified CV (seed 0), ROC AUC, each model inside the pipeline:

    logistic regression     [0.69  0.63  0.675 0.64  0.649]   mean 0.657, std 0.022
    tree, max_depth=3       [0.632 0.628 0.654 0.632 0.63 ]   mean 0.635, std 0.010
    tree, no depth limit    [0.501 0.521 0.519 0.53  0.527]   mean 0.520, std 0.010

Which would you take forward, and what does the third row tell you?

**Answer.** Logistic regression: highest mean, and it beats the depth-3 tree in every fold. The unlimited tree is barely
above 0.5 — it has memorised the training folds (overfitting); limiting its depth to 3 lifts it to 0.635.
Returns depend on a few additive effects (fashion and footwear, COD, price), which suits a linear model.

## Exercise 6 — Diagnose from curves

A delivery-time regressor: training MAE 1.2 minutes, cross-validated MAE 6.8; the learning curve's validation MAE
fell from 8.1 to 6.8 as rows grew from 2,000 to 20,000 and is still falling. What is the diagnosis, and what two
things would you try?

**Answer.** High variance (overfitting): a large train–validation gap, with validation still improving as data
grows. Try (1) more data — the curve has not flattened — and (2) a more constrained model: stronger
regularisation, shallower trees or a larger min_samples_leaf. Not: more features or a more flexible model.`,
    mcqs: [
      mcq('In Exercise 2, why is `collection_agency_assigned` a leak for a default model scored at application?', [
        ['A collection agency is assigned only after the borrower stops paying', true],
        ['Collection agencies are assigned at random, so the feature is noise', false],
        ['The column is categorical, so it cannot be used in a classifier', false],
        ['It is a leak only when it is missing for more than 5% of the rows', false],
      ], 'Assignment happens after missed payments — a consequence of the outcome. It will never exist when an application is scored.'),
      mcq('In Exercise 3, model A has 94.5% accuracy against a 94% baseline. What is the most useful thing to report?', [
        ['It catches 15 of 60 defaulters, with its precision', true],
        ['It is 0.5 points more accurate than the baseline', false],
        ['It is accurate on nearly 95 in every 100 loans it scores', false],
        ['It misclassifies 55 of the 1,000 loans in total', false],
      ], 'Accuracy hides what matters with 6% defaults. Recall (25%) and precision describe what the credit team will actually experience.'),
      mcq('In Exercise 4, the ColumnTransformer outputs 13 columns from 5 inputs. Which encoding explains the count?', [
        ['2 scaled numbers, then 5 + 3 + 3 one-hot indicators', true],
        ['5 scaled inputs, plus 8 extra columns for missing values', false],
        ['2 numbers, then one integer code for each of the 11 values', false],
        ['13 principal components computed from the 5 input columns', false],
      ], 'Each categorical column becomes one indicator per category: 5 + 3 + 3 = 11, plus the two scaled numeric columns.'),
      mcq('In Exercise 5, the unlimited-depth tree scores 0.52 AUC in cross-validation. What does that indicate?', [
        ['It memorised the training folds and barely generalises', true],
        ['It is too simple to capture the effects in the data', false],
        ['The pipeline leaked validation rows into training', false],
        ['ROC AUC cannot be computed for a decision tree model', false],
      ], 'An unconstrained tree fits each training fold almost perfectly and scores near chance on held-out rows — high variance. Depth 3 lifts it to 0.635.'),
      mcq('In Exercise 6, training MAE is 1.2 and validation MAE 6.8 and still falling as data grows. Which pair of actions fits?', [
        ['Gather more rows and constrain the model', true],
        ['Add features and use a more flexible model', false],
        ['Stop collecting data and train for longer', false],
        ['Remove regularisation and lower the depth', false],
      ], 'A big gap with a still-improving validation curve is high variance: more data and a simpler or more regularised model both reduce it.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_INTERVIEW_QUESTION',
    notes: `Workflow questions are where entry-level data-science interviews separate candidates who have trained
models in tutorials from those who could be trusted with a real one. Three common questions, model answers, and
the follow-ups a good answer earns.

## 1. "Your model had 97% AUC in the notebook and performs much worse in production. What could have happened?"

**Model answer.** "I would check four things, roughly in order of how often I have seen them. **Leakage** — a
feature that would not exist at prediction time, like a status field updated after the outcome, or preprocessing
fitted on all rows before splitting. A 97% AUC on a hard problem makes me suspect this first. **The split** — a
random split on data that should be split by time or by customer lets the model learn the future or memorise
entities. **Training–serving skew** — features computed differently in the production code than in the notebook,
or categories encoded differently. **Distribution shift** — the population changed: a new city, a new product, a
festival season. I would compare feature distributions between training and live data, re-evaluate with a
time-based split, and recompute each feature exactly as of the prediction time."

**Follow-ups:**
- *"How would you prevent training–serving skew?"* One Pipeline object, saved with the model and loaded in
  production, so the same code transforms both; plus a check that compares live feature distributions with
  training.
- *"How would you detect shift after launch?"* Monitor input distributions (PSI or simple percentile checks) and,
  once labels arrive, the live metric against the validation estimate.

## 2. "What is cross-validation, and when is ordinary k-fold the wrong choice?"

**Model answer.** "Cross-validation splits the training data into k folds, trains on k − 1, validates on the
remaining one, rotates, and averages — so the estimate does not depend on one lucky split, and I also get its
spread. I use it to compare models and tune hyperparameters, with preprocessing inside a pipeline so it is
re-fitted per fold, and I keep a separate test set for the final number. Ordinary k-fold is wrong when rows are
not independent: for **time series**, where I need TimeSeriesSplit so validation is always after training; for
**grouped data**, like several rows per customer or per patient, where I need GroupKFold; and for rare classes I
want StratifiedKFold so each fold has some positives."

**Follow-ups:**
- *"Why not just use the test set to tune?"* Every decision based on it makes it optimistic; after enough tuning
  it measures how well I fit the test set, not new data.
- *"What is nested cross-validation?"* An outer CV loop for evaluation, with hyperparameter search inside each
  outer training fold — an honest estimate of "tune then fit" when data is too small for a test set.

## 3. "Training accuracy 98%, validation 71%. Walk me through what you do."

**Model answer.** "A 27-point gap is high variance — the model is overfitting. First I would make sure it is not
a split problem: duplicated entities or a validation set from a different period could also create a gap. Then I
would look at the learning curve. If validation is still rising with more data, more data helps. Either way I
would reduce complexity: stronger regularisation, shallower trees, a larger min_samples_leaf, fewer noisy or
high-cardinality features, or an averaging ensemble. I would tune that with cross-validation, and compare against
a baseline so I know 71% is better than something simple."

**Follow-ups:**
- *"What if both were 71%?"* Then it is high bias, or the features simply do not contain more signal: a more
  flexible model or better features — not more rows.
- *"Would you ever accept a model with a big gap?"* Yes, if its validation score is the best available and
  stable across folds — a gap is a symptom to investigate, not a disqualifier. Random forests often show near-
  perfect training scores and still generalise well.

## How to answer workflow questions well

Give a checklist, ordered by likelihood; name the specific tool (TimeSeriesSplit, Pipeline, learning_curve); and
end with how you would verify the fix.`,
    mcqs: [
      mcq('An interviewer describes a model whose notebook AUC was 0.97 and production AUC 0.70. Which cause should you raise first?', [
        ['Target leakage through a feature recorded after the outcome', true],
        ['The production servers have less memory than the notebook', false],
        ['The production model was trained with fewer decision trees', false],
        ['AUC is computed differently in production than in a notebook', false],
      ], 'A near-perfect offline score on a hard problem, followed by a collapse live, is the classic signature of leakage; check when each feature is recorded.'),
      mcq('Asked when ordinary k-fold cross-validation is wrong, which example is correct?', [
        ['Several rows per patient, where GroupKFold is needed instead', true],
        ['A balanced binary target, where only a holdout split is valid', false],
        ['A dataset of over 100,000 rows, where it is far too expensive', false],
        ['A regression target, where folds must always be stratified', false],
      ], 'Repeated entities make rows dependent; plain folds put a patient on both sides. Time series need TimeSeriesSplit for the same reason.'),
      mcq('Training and validation accuracy are both 71%. Which answer shows the right diagnosis?', [
        ['High bias: try a more flexible model or better features', true],
        ['High variance: add regularisation and collect more rows', false],
        ['Leakage: the matching scores mean the sets overlap', false],
        ['A perfect fit: equal scores mean no generalisation gap', false],
      ], 'No gap with a mediocre level points to a model that cannot capture the signal, or features that lack it. More data will not help.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_ML_WORKFLOW_CHECKPOINT',
    notes: `Ten questions across the topic: framing, splits and leakage, baselines, the scikit-learn API,
pipelines, cross-validation and search, and diagnosing over- and underfitting. Several give numbers or code —
work the answer out before you look at the options. Every value was computed with scikit-learn 1.9.`,
    checkpoint: [
      ck(CON, 'A "will this order be returned?" model is scored at checkout. Which feature is legitimate?', [
        ['Whether the customer chose cash on delivery', true],
        ['Whether the courier marked the order "refused"', false],
        ['Number of days the order took to be delivered', false],
        ['Whether a refund was initiated for the order', false],
      ], 'Only what is known at checkout can be used. Refusal, delivery time and refunds happen later, and the last two are consequences of a return.'),
      ck(CON, 'Patients have up to 6 visits each, and a model predicts readmission per visit. Which cross-validation splitter fits?', [
        ['GroupKFold with the patient ID as the group', true],
        ['KFold with shuffle=True and a random_state', false],
        ['StratifiedKFold on the readmission label', false],
        ['LeaveOneOut over every individual visit row', false],
      ], 'Visits of one patient are correlated; they must stay on one side of every split, which is what grouping by patient does.'),
      ck(CON, 'What does `DummyClassifier(strategy="most_frequent")` score on accuracy if 7% of transactions are fraud?', [
        ['93%', true],
        ['7%', false],
        ['50%', false],
        ['86%', false],
      ], 'It always predicts "not fraud", which is right for 93% of rows — and catches no fraud. Any fraud model must be judged on more than accuracy.'),
      ck(CON, 'In `Pipeline([("pre", pre), ("model", LogisticRegression())])`, how is C addressed in a parameter grid?', [
        ['"model__C"', true],
        ['"C"', false],
        ['"model.C"', false],
        ['"LogisticRegression__C"', false],
      ], 'Pipeline parameters are <step name>__<parameter>, with two underscores, using the name given to the step.'),
      ck(CON, 'A OneHotEncoder fitted with the default `handle_unknown="error"` meets a city it never saw. What happens?', [
        ['transform raises an error for that row', true],
        ['The city is encoded as a row of zeros', false],
        ['The city is mapped to the most common city', false],
        ['The encoder learns the new city silently', false],
      ], 'The default refuses unknown categories. "ignore" would encode them as all zeros; neither choice re-fits the encoder.'),
      ck(CON, 'Cross-validation gives ROC AUC [0.695, 0.739, 0.721, 0.75, 0.695]. How should it be reported?', [
        ['0.720 ± 0.022', true],
        ['0.750, the best fold', false],
        ['0.695, the worst fold', false],
        ['0.721, the middle fold', false],
      ], 'The mean of the five folds is 0.720 and their standard deviation 0.022. Reporting a single fold hides the spread that judges any comparison.'),
      ck(OVR, 'A validation curve for tree depth shows validation AUC peaking at depth 2–3 and falling after, while training AUC rises to 0.998. Which depth should be chosen?', [
        ['About 2 or 3, where validation peaks', true],
        ['20, where training AUC is the highest', false],
        ['1, the simplest tree that was tried', false],
        ['12, halfway between the two extremes', false],
      ], 'Choose by held-out score. Beyond depth 3 the tree fits training noise; depth 1 underfits.'),
      ck(OVR, 'A model\'s learning curves converge at a low score. What is the diagnosis?', [
        ['High bias; more data will not help much', true],
        ['High variance; more data is the main fix', false],
        ['Leakage; the two sets share many rows', false],
        ['Under-training; run more epochs to fix', false],
      ], 'Curves meeting at a low level mean the model is too simple or the features too weak; extra rows give the same answer.'),
      ck(OVR, 'A degree-10 polynomial has training R² 0.89 and validation R² −100.9; one validation input is below the training range. What is the best fix?', [
        ['Lower the degree or regularise, and check the input range', true],
        ['Raise the degree so the curve can reach the outlying point', false],
        ['Report the training R², as the validation set is unusual', false],
        ['Remove the outlying validation row and evaluate it again', false],
      ], 'High-degree polynomials overfit and swing wildly outside the training range. A simpler model (degree 2 gave R² 0.42) and awareness of extrapolation fix the cause.'),
      ck(OVR, 'Which change makes a random forest less prone to overfitting a small dataset?', [
        ['Raise min_samples_leaf so each leaf averages more rows', true],
        ['Remove the depth limit so every tree can grow fully', false],
        ['Reduce the number of trees in the forest to just one', false],
        ['Add one-hot columns for every rare customer ID in the data', false],
      ], 'Larger leaves smooth each tree\'s predictions and cut variance. Unlimited depth, a single tree or ID-like features all increase overfitting.'),
    ],
  },
];
