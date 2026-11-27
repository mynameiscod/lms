/**
 * Career-track placement content for Data Science + AI, Year 4: machine learning at interview depth
 * (DS_IV_ML).
 *
 * In Year 3 the student built every one of these models — regression and classification, ensembles,
 * evaluation and calibration, features and clustering, PyTorch, transformers and RAG, FastAPI, MLflow
 * and drift — and the NBFC two-wheeler-loan capstone. These units are the interview version: the
 * questions a panel asks, the answer that earns the follow-up, the follow-up and the trap. They go a
 * level deeper than Year 3 and never re-ask its questions: the bias–variance sum with the bias squared,
 * lasso and ridge in closed form on orthonormal features, the edge of a 10% neighbourhood in ten
 * dimensions, XGBoost's −G / (H + λ) leaf weight and split gain by hand, separable logistic regression,
 * support vectors and gamma, AUC as a pairwise count, the constant-prediction log loss a model must
 * beat, precision under a prevalence shift, why isotonic calibration can move AUC and Platt cannot,
 * hashing collisions, the dummy trap, PCA eigenvalues of a correlated pair, inverted dropout, LoRA's
 * parameter count, quadratic attention, temperature, training–serving skew, shadow and canary
 * releases, selective labels and A/B testing a model whose labels arrive a year late.
 *
 * Every number was computed (Python, NumPy, SciPy, scikit-learn 1.9): the lasso and ridge
 * coefficients by direct minimisation, the AUC with roc_auc_score, the boosting leaf weights and
 * gains, the hashing collision share, the eigenvalues and the softmax probabilities.
 *
 * Attribution: DS_IV_ML is multi-skill. Each IV_* unit declares one skill and its checkpoint
 * questions name it; the CHECKPOINT unit spreads its ten over the topic's six skills. Practice mcqs
 * name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DS_IV_ML_BUNDLES: PilotBundle[] = [
  /* ── IV_FUNDAMENTALS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_FUNDAMENTALS',
    notes: `Every ML interview in India — product company, fintech, GCC or consultancy — opens with
fundamentals, usually in the first ten minutes. The panel is not checking that you can define
overfitting; Year 3 covered that. It is checking whether you can **reason** with the ideas: read a
pair of train and validation numbers, say which knob to turn and why, and survive the follow-up.
Each question below has the answer that earns the follow-up, the follow-up, and the trap.

## Q1. "Explain the bias–variance trade-off."

**Strong answer.** "At any input, the expected squared error of a model — averaged over the training
sets I might have drawn — splits into three parts: **bias²** (how far the average prediction is from
the truth), **variance** (how much the prediction moves from one training set to another) and
**irreducible noise** (the label's own randomness). Simple models have high bias and low variance;
flexible models the opposite. Regularisation, more data and ensembling are ways to move along or
beat that curve."

**Follow-up:** "A model's bias at a point is 2, its variance 3 and the noise variance 1. Expected
squared error?" — 2² + 3 + 1 = **8**. The bias is squared; the variance already is a square.

**Trap:** saying "high bias = overfitting". Bias is underfitting; variance is overfitting.

## Q2. "Train AUC 0.99, validation 0.74. What do you do?"

**Strong answer.** "That gap is variance. In order: check for leakage first — a gap can also be a
feature that exists only in training — then regularise (shallower trees, larger min_samples_leaf,
stronger L2), get more rows if they are cheap, reduce features, or average models. I would plot a
learning curve to see whether validation is still rising with data."

**Follow-up:** "And train 0.72, validation 0.71, target 0.80?" — bias. More data will not help
(the curves have met); add informative features, interactions, or a more flexible model.

## Q3. "L1 or L2 — what is the difference, really?"

**Strong answer.** "Both shrink coefficients to trade a little bias for less variance. L2 shrinks
every coefficient **proportionally** and never to exactly zero; L1 subtracts a constant and sets
small ones to **exactly zero**, so it selects features. With orthonormal features you can see it in
closed form: ridge gives β/(1 + λ), lasso gives sign(β)·max(|β| − λ, 0)." With OLS coefficients 3.0,
0.4 and −1.2: ridge (λ = 1) gives 1.5, 0.2, −0.6; lasso (λ = 0.5) gives 2.5, 0, −0.7.

**Follow-up:** "Bayesian view?" — ridge is the MAP estimate under a Gaussian prior on the
weights, lasso under a Laplace prior. "Correlated features?" — lasso picks one of a correlated group
almost arbitrarily; ridge spreads the weight; elastic net does both.

**Trap:** forgetting that the penalty depends on the scale of each feature — standardise first.

## Q4. "What is the curse of dimensionality?"

**Strong answer.** "As dimensions grow, space grows so fast that data become sparse and distances
stop discriminating. In a 10-dimensional unit hypercube with uniform data, a sub-cube holding 10% of
the points needs an edge of 0.1^(1/10) ≈ **0.79** — a 'local' neighbourhood spans most of every axis.
In 100 dimensions the edge is 0.98. kNN and any distance-based method suffer first."

**Follow-up:** "Then why do models work on 10,000 TF-IDF columns?" — real data lie near a much
lower-dimensional structure, and linear models with regularisation do not need local
neighbourhoods.

## Q5. "Parametric vs non-parametric?"

**Strong answer.** "A parametric model has a fixed number of parameters whatever the data size —
logistic regression has one weight per feature. A non-parametric one grows with the data: kNN keeps
every row, a tree adds leaves. That matters in production: kNN's memory and prediction latency grow
with the training set."

## Q6. "Why does early stopping regularise?"

**Strong answer.** "Starting from small weights, gradient descent moves them gradually; stopping
early limits how far they travel — for a linear model it behaves much like an L2 penalty whose
strength is set by the number of steps."

## Q7. "Can you overfit a validation set?"

**Strong answer.** "Yes — every decision taken by looking at it (features, hyperparameters, the
threshold) leaks a little of it into the model. That is why a final test set is touched once, and
why nested CV exists."

## How you are judged

Strong candidates turn every concept into a **diagnosis and an action** with numbers. Weak ones
recite definitions and freeze at "so what would you change?".`,
    mcqs: [
      mcq('A model’s bias at one input is 2 (its average prediction is 2 too high), its variance there is 3 and the noise variance is 1. What is its expected squared error at that input?', [
        ['8 — bias squared plus variance plus noise', true],
        ['6 — bias plus variance plus the noise term', false],
        ['7 — bias squared plus variance, noise excluded', false],
        ['4 — only the squared bias matters at one input', false],
      ], 'Expected squared error = bias² + variance + noise = 4 + 3 + 1 = 8. Adding the bias unsquared gives 6; leaving out the noise gives 7 — but noise is part of the error any model makes.'),
      mcq('Data are spread uniformly in a 10-dimensional unit hypercube. What edge length must a smaller cube have to contain 10% of the points?', [
        ['About 0.10, because the volume share equals the edge', false],
        ['About 0.32, the square root of the 10% volume share', false],
        ['About 0.79, so a “local” region spans most of each axis', true],
        ['About 0.50, half of each axis in every one of the ten axes', false],
      ], 'Volume is edge¹⁰, so edge = 0.1^(1/10) ≈ 0.794. A neighbourhood holding a tenth of the data covers about 79% of every axis — which is why distance-based methods weaken as dimensions grow.'),
      mcq('An interviewer asks why kNN is called non-parametric and why that matters for serving it. Which answer is right?', [
        ['It stores the training rows, so memory and latency grow with data', true],
        ['It has no hyperparameters at all, so it cannot be tuned in any way', false],
        ['It makes no assumptions, so it cannot overfit the training rows', false],
        ['It has one weight per row, learnt once by gradient descent', false],
      ], 'Non-parametric means the model’s size grows with the data: kNN keeps every training row and searches them at prediction time. It does have a hyperparameter (k), and with k = 1 it overfits badly.'),
    ],
    checkpoint: [
      ck('ML_OVERFITTING', 'With orthonormal features, OLS gives coefficients 3.0, 0.4 and −1.2. What does lasso give when it minimises ½‖y − Xβ‖² + 0.5‖β‖₁?', [
        ['2.5, 0 and −0.7', true],
        ['1.5, 0.2 and −0.6', false],
        ['2.5, −0.1 and −0.7', false],
        ['3.0, 0 and −1.2', false],
      ], 'With orthonormal X, lasso soft-thresholds each OLS coefficient: sign(β)·max(|β| − 0.5, 0). So 3.0 → 2.5, 0.4 → 0 and −1.2 → −0.7. The values 1.5, 0.2 and −0.6 are ridge’s β/(1 + λ) with λ = 1.'),
      ck('ML_OVERFITTING', 'A kNN classifier’s k is raised from 1 to 50. How do bias and variance move?', [
        ['Bias rises and variance falls, as each prediction averages more rows', true],
        ['Bias falls and variance rises, as each prediction sees more of the data', false],
        ['Both fall, since more neighbours always means a better estimate', false],
        ['Neither moves; k only changes how quickly predictions are computed', false],
      ], 'Averaging 50 neighbours makes predictions stable from one training set to the next (lower variance) but smooths over local structure (higher bias). k = 1 is the most flexible, highest-variance setting.'),
      ck('ML_OVERFITTING', 'The training set for the same model class is doubled. Which part of the expected error mostly shrinks?', [
        ['The bias, since more rows let a straight line bend to fit curves', false],
        ['The variance, since the fit depends less on which rows were drawn', true],
        ['The noise, since more rows average the label errors away for good', false],
        ['All three, each in proportion to the square root of the row count', false],
      ], 'More data mainly reduces variance. A linear model stays linear however many rows it sees, so its bias is unchanged, and the irreducible noise is a property of the labels, not of the sample size.'),
    ],
  },

  /* ── IV_ALGORITHMS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_ALGORITHMS',
    notes: `"Explain how X works" is the core of an ML round. The interviewer then pushes: "and when does
it fail?", "how is it different from Y?", "what would you tune first?". Year 3 taught you to use these
models; here is how to explain them at the depth a panel expects, with the failure mode that proves
you have actually run them.

## Q1. "How does logistic regression work, and when does it break?"

**Strong answer.** "It models the log-odds as a linear function of the features, passes it through
the sigmoid to get a probability, and is fitted by minimising log loss (maximum likelihood). The
boundary is linear in the features, so curved patterns need transformed or interaction features."

**Follow-up:** "What if one feature separates the classes perfectly?" — without a penalty there is
no finite optimum: the weight grows without limit as the solver pushes probabilities towards 0 and
1, and you get convergence warnings. A penalty (scikit-learn's default L2) fixes it.

**Trap:** "logistic regression is a classification algorithm, so it outputs classes". It outputs
probabilities; the threshold is a separate decision.

## Q2. "How does a decision tree choose splits, and what are its weaknesses?"

**Strong answer.** "Greedily: at each node it tries every feature and threshold and keeps the one
that most reduces impurity (Gini or entropy for classification, squared error for regression). Its
splits are **axis-aligned**, so a diagonal boundary like x1 = x2 becomes a staircase of many splits.
A single deep tree has high variance — small changes in the data change the top splits."

## Q3. "Random forest vs gradient boosting?"

**Strong answer.** "A forest grows deep, low-bias trees on bootstrap samples with random feature
subsets and **averages** them — it reduces variance. Boosting adds shallow trees **sequentially**,
each fitted to the errors of the current ensemble — it reduces bias, and can overfit as trees are
added, so it needs a learning rate and early stopping."

**Follow-up:** "What does XGBoost add?" — a second-order step. For each row it uses the gradient g
and the Hessian h of the loss; a leaf's weight is **−G / (H + λ)** (sums over the leaf's rows), and a
split's gain is ½[G_L²/(H_L + λ) + G_R²/(H_R + λ) − G²/(H + λ)] − γ. For log loss, g = p − y and
h = p(1 − p). See the worked example.

## Q4. "Explain SVM."

**Strong answer.** "It finds the boundary with the widest margin. With a soft margin, C trades
margin width against violations. Only the **support vectors** — points on or inside the margin —
define the boundary; a point far on the correct side can be deleted without changing it. Kernels
(RBF) give curved boundaries; gamma sets how local each point's influence is."

**Follow-up:** "RBF SVM with train 1.00, validation 0.61?" — gamma and C too high; lower both.
Scale the features first: RBF distances are dominated by large-unit columns.

## Q5. "kNN — and why would you not deploy it on 50 lakh rows?"

**Strong answer.** "Predict by the majority (or mean) of the k nearest training rows. Training is
just storing the data; **prediction** scans all of it. At scale you need an approximate
nearest-neighbour index (FAISS, HNSW) or a different model."

## Q6. "Naive Bayes — why is it naive, and when is it fine?"

**Strong answer.** "It assumes features are independent given the class, so the likelihood is a
product of per-feature terms. The assumption is false for words, but classification only needs the
**ranking** of classes right, so it works well for text with little data. Its probabilities are
overconfident — do not use them as risk estimates without calibration."

**Follow-up:** "20% of messages are spam; 'lottery' appears in 50% of spam and 5% of genuine
messages. P(spam | lottery)?" — 0.2 × 0.5 / (0.2 × 0.5 + 0.8 × 0.05) = 0.10 / 0.14 = **5/7 ≈ 0.71**.

## Q7. "Which algorithm would you start with for a tabular credit model?"

**Strong answer.** "A regularised logistic regression as the baseline (and maybe the deployed model,
for explainability), then gradient-boosted trees. On tabular data boosting is usually the strongest
single model; neural networks rarely beat it."

## How you are judged

The panel wants mechanism, failure mode and a choice — not a list of definitions. Being able to
compute one boosting step on paper is a strong signal.`,
    workedExample: `**Question: "Show me one XGBoost step by hand. Four loans start at p = 0.5 (log-odds 0); labels
are 1, 1, 1, 0. Log loss, λ = 1, γ = 0, learning rate 0.3."**

1. **Gradients and Hessians.** g = p − y gives −0.5, −0.5, −0.5, +0.5; h = p(1 − p) = 0.25 each.
   Totals: G = −1.0, H = 1.0.
2. **One leaf for everyone.** w = −G / (H + λ) = 1.0 / 2.0 = **+0.5** in log-odds. Without λ it would
   be 1.0 — λ shrinks leaf weights, exactly like ridge.
3. **Compare two splits.**
   - Split A: {1, 1} | {1, 0}. Left G = −1.0, H = 0.5; right G = 0, H = 0.5.
     Gain = ½[1.0/1.5 + 0/1.5 − 1.0/2.0] = ½[0.667 − 0.5] = **0.083**.
   - Split B: {1, 1, 1} | {0}. Left G = −1.5, H = 0.75; right G = +0.5, H = 0.25.
     Gain = ½[2.25/1.75 + 0.25/1.25 − 0.5] = ½[1.286 + 0.2 − 0.5] = **0.493**.
   XGBoost picks B. If γ were 0.5, neither split would be made.
4. **Leaf weights for B.** Left: 1.5/1.75 = 0.857; right: −0.5/1.25 = −0.4.
5. **Apply the learning rate.** New log-odds: 0.3 × 0.857 = 0.257 → p = 0.564 for the three
   defaulters' leaf; 0.3 × (−0.4) = −0.12 → p = 0.470 for the other.
6. **Say what it means.** "Each round moves probabilities a small, regularised step in the
   direction the loss's curvature says is best; λ, γ and the learning rate are three separate
   brakes on overfitting."

What earns the hire: the formulas used correctly, the role of λ and γ named, and the final
probabilities converted back from log-odds.`,
    mcqs: [
      mcq('Four rows start at p = 0.5 with labels 1, 1, 1 and 0 under log loss. With λ = 1, what weight does XGBoost give a single leaf holding all four?', [
        ['+0.5 in log-odds, from −G / (H + λ) = 1 / 2', true],
        ['+1.0 in log-odds, from −G / H with λ ignored', false],
        ['+0.25 in probability, from the mean residual', false],
        ['−0.5 in log-odds, as the gradient sum is negative', false],
      ], 'g = p − y gives a sum G = −1.0, and h = p(1 − p) gives H = 1.0. The leaf weight −G / (H + λ) = 1.0 / 2.0 = 0.5. The minus sign in the formula turns the negative gradient sum into a positive step.'),
      mcq('A logistic regression with no penalty is fitted on data that one feature separates perfectly. What happens?', [
        ['It converges to a weight of exactly 1 and an intercept of exactly 0', false],
        ['The weight grows without limit and the solver hits its iteration cap', true],
        ['It fails at once with a singular-matrix error from its Hessian matrix', false],
        ['It returns all-zero weights, since the loss is flat at the start', false],
      ], 'On separable data the log loss keeps falling as the weight grows, pushing probabilities towards 0 and 1, so there is no finite optimum. The solver stops at max_iter with a convergence warning; an L2 penalty restores a finite solution.'),
      mcq('20% of messages are spam. The word “lottery” appears in 50% of spam and 5% of genuine messages. What is P(spam | lottery) from Naive Bayes on that word alone?', [
        ['1/2, the word’s rate among spam', false],
        ['10/11, about 0.91', false],
        ['1/10, the ratio of the two rates', false],
        ['5/7, about 0.71', true],
      ], 'P(spam | word) = 0.2 × 0.5 / (0.2 × 0.5 + 0.8 × 0.05) = 0.10 / 0.14 = 5/7. Ignoring the 20% prior gives 0.5 / 0.55 = 10/11, which overstates it.'),
    ],
    checkpoint: [
      ck('ML_SUPERVISED', 'In a soft-margin SVM, a correctly classified point far outside the margin is deleted and the model is refitted. What happens to the boundary?', [
        ['Nothing — it is not a support vector, so the boundary stays put', true],
        ['It shifts toward that class, since every point pulls on the line', false],
        ['The margin widens, since there is one fewer point to separate', false],
        ['It moves slightly, because C is scaled by the number of points', false],
      ], 'Only support vectors (points on or inside the margin) have non-zero weight in the SVM solution. A point well outside the margin on the correct side contributes nothing, so removing it leaves the boundary unchanged.'),
      ck('ML_SUPERVISED', 'An RBF-kernel SVM on scaled features has training accuracy 1.00 and validation accuracy 0.61. Which change is most likely to help?', [
        ['Raise gamma and C so the boundary fits the points more tightly', false],
        ['Lower gamma and C so the boundary becomes smoother', true],
        ['Remove the feature scaling so distances use the raw units', false],
        ['Raise C alone so that fewer margin violations are allowed', false],
      ], 'High gamma makes each point’s influence very local and high C punishes every violation — together they memorise the training set. Lowering both gives a smoother boundary that generalises better.'),
      ck('ML_SUPERVISED', 'A kNN model built on 50 lakh rows must answer each request within 20 ms. What is the core problem, and the usual fix?', [
        ['Training is slow; refit it weekly on a smaller sample of the rows', false],
        ['k is too small; raising k to 500 makes each prediction much quicker', false],
        ['Prediction scans every stored row; use an approximate neighbour index', true],
        ['Distances overflow; storing the features as float16 fixes the search', false],
      ], 'kNN does its work at prediction time: an exact search compares the query with every stored row. Approximate nearest-neighbour indexes (FAISS, HNSW) answer in milliseconds; a larger k only adds work.'),
    ],
  },

  /* ── IV_EVALUATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_EVALUATION',
    notes: `Evaluation is where interviewers separate people who have shipped a model from people who
have trained one. Year 3 covered the metrics; the panel now asks what a number **means**, when it
lies, and what you would have done differently. Expect at least one leakage story.

## Q1. "What does ROC AUC actually measure?"

**Strong answer.** "The probability that a randomly chosen positive gets a higher score than a
randomly chosen negative. It depends only on the **ranking**, not on the probability values, so any
monotonic transform of the scores leaves it unchanged."

**Follow-up:** "Compute it: defaulters score 0.9, 0.6, 0.4; non-defaulters 0.7, 0.3, 0.2, 0.1."
— count the 3 × 4 = 12 pairs where the defaulter is higher: 4 + 3 + 3 = 10, so AUC = **10/12 ≈ 0.83**.

**Trap:** "AUC 0.75 means 75% accuracy." It does not; accuracy depends on a threshold.

## Q2. "ROC or PR curve?"

**Strong answer.** "ROC uses TPR and FPR, which do not depend on prevalence. Precision does: the same
model at TPR 0.80 and FPR 0.05 has precision 0.08 / (0.08 + 0.045) = **0.64** at 10% prevalence and
0.016 / (0.016 + 0.049) ≈ **0.25** at 2%. When positives are rare and the cost is in false alarms,
the PR curve shows what the operations team will feel."

## Q3. "What is a good log loss?"

**Strong answer.** "It is only meaningful against the baseline of predicting the base rate for
everyone: −[p ln p + (1 − p) ln(1 − p)]. At a 10% default rate that is **0.325**. A model at 0.34 is
worse than the constant — even if its AUC is decent, its probabilities are badly calibrated."

## Q4. "How do you calibrate, and does it change AUC?"

**Strong answer.** "Platt scaling fits a sigmoid on the scores; isotonic fits a non-decreasing step
function. Platt is strictly increasing, so AUC is **exactly** unchanged. Isotonic can map different
scores to the same value, creating ties, so AUC can move slightly. Calibrate on data the model was
not trained on."

## Q5. "Which cross-validation would you use?"

**Strong answer.** "It mirrors how the model will be used: stratified k-fold for i.i.d. rows with
a rare class; GroupKFold when one entity has many rows; time-based splits when the model predicts the
future. With small data (a few hundred rows), **repeated** stratified k-fold with both models on the
same folds gives a more stable comparison than one split. Leave-one-out has low bias but high
variance and is expensive."

## Q6. "Tell me about a leakage you caught."

**Strong answer — a real story told in four lines:** the feature, why it leaked, how you found it
and what changed. Example: "A pincode default-rate feature was computed over 2022–2025 and the model
was validated on 2025 loans, so the feature contained the validation loans' own outcomes. I rebuilt
it from loans that had matured before each application date; validation AUC dropped from 0.81 to
0.76, which was the honest number."

**Follow-up:** "How do you find leakage in general?" — features that are too good alone, importance
on something that should not matter, a big gap between random-split and out-of-time scores, and
asking for every feature "would I know this at decision time?".

## Q7. "Your model's CV is 0.82 but out-of-time is 0.74. What happened?"

**Strong answer.** "Either the world changed (drift between the periods) or something leaks within
a period. I would compare the two by month, check feature distributions, and rebuild the
validation as a rolling time split."

## How you are judged

Numbers worked aloud, the baseline named for every metric, and validation that matches deployment.`,
    workedExample: `**Question: "Our fraud model has ROC AUC 0.90. At our threshold it has TPR 0.80 and FPR 0.05 on
the validation set, where fraud is 10%. In production fraud is 2%. The ops head asks how many alerts
will be real."**

1. **Separate what moves from what does not.** TPR and FPR are computed within each class, so at the
   same threshold they stay 0.80 and 0.05 if the score distributions per class do not change. ROC
   AUC stays 0.90. Precision does not stay.
2. **Per 1,000 validation transactions** (100 fraud): 80 caught, 0.05 × 900 = 45 false alarms.
   Precision 80 / 125 = **0.64**.
3. **Per 1,000 production transactions** (20 fraud): 16 caught, 0.05 × 980 = 49 false alarms.
   Precision 16 / 65 ≈ **0.25**. Three of every four alerts are genuine customers.
4. **Alert volume.** 125 alerts per 1,000 in validation; 65 per 1,000 in production — so fewer alerts,
   but most are wrong. Staff the review team for 65 per 1,000.
5. **What to do.** Choose the threshold on the production prevalence (or reweight the validation
   set to 2%), report precision at the threshold the team will use, and if calibrated probabilities
   are needed, recalibrate — a model calibrated at 10% will overstate risk at 2%.
6. **One line for the ops head:** "Ranking quality is the same; at 2% fraud, one alert in four is
   fraud, about 65 alerts per 1,000 transactions."

What earns the hire: knowing which metrics depend on prevalence, and translating the result into
alert counts the operations team can plan with.`,
    mcqs: [
      mcq('Defaulters receive scores 0.9, 0.6 and 0.4; non-defaulters 0.7, 0.3, 0.2 and 0.1. What is the ROC AUC?', [
        ['3/7, about 0.43', false],
        ['10/12, about 0.83', true],
        ['11/12, about 0.92', false],
        ['2/3, about 0.67', false],
      ], 'AUC is the share of positive–negative pairs ranked correctly. 0.9 beats all 4 non-defaulters, 0.6 beats 3 and 0.4 beats 3: 10 of the 3 × 4 = 12 pairs, so 10/12 ≈ 0.833 (roc_auc_score agrees).'),
      mcq('On a 10% default rate, a model has validation log loss 0.34. What is the right reading?', [
        ['It is good: any log loss below 0.693 beats a coin flip, so it has learnt', false],
        ['It is good: log loss below 1 means the probabilities are well calibrated', false],
        ['It cannot be judged without the model’s accuracy at a 0.5 threshold', false],
        ['It is poor: predicting 0.10 for every loan scores about 0.325, better', true],
      ], 'The baseline is the constant base-rate prediction: −(0.1 ln 0.1 + 0.9 ln 0.9) ≈ 0.325. A log loss of 0.34 is worse than knowing only the base rate — usually a sign of miscalibrated probabilities.'),
      mcq('Platt scaling leaves ROC AUC exactly unchanged. Why can isotonic calibration change it slightly?', [
        ['Its step function maps different scores to the same value, making ties', true],
        ['It refits the model’s trees, so the ranking of the rows is relearnt', false],
        ['It changes the class balance of the very data on which AUC is computed', false],
        ['It clips all scores to between 0.05 and 0.95, reordering the extremes', false],
      ], 'Isotonic regression is non-decreasing, not strictly increasing: flat steps give several different scores the same calibrated value, and ties count as half in AUC. Platt’s sigmoid is strictly increasing, so the order is preserved exactly.'),
    ],
    checkpoint: [
      ck('ML_EVALUATION', 'A fraud model has TPR 0.80 and FPR 0.05 at its threshold. Fraud is 10% of the validation set but 2% in production. What happens to precision?', [
        ['It stays at 0.64, since TPR and FPR do not depend on prevalence', false],
        ['It rises from 0.64 to about 0.80, since there are fewer frauds', false],
        ['It falls from 0.64 to about 0.25, while the ROC curve is unchanged', true],
        ['It falls from 0.80 to 0.16, scaled by the ratio of the two prevalences', false],
      ], 'Per 1,000: at 10%, 80 TP and 45 FP give 0.64; at 2%, 16 TP and 49 FP give about 0.25. TPR and FPR are within-class rates, so ROC is unchanged, but precision depends on how many negatives there are.'),
      ck('ML_EVALUATION', 'A “pincode default rate” feature was computed over all loans from 2022 to 2025, and the model is validated on 2025 loans. What is wrong?', [
        ['Pincodes are categorical and so cannot be turned into a rate', false],
        ['The rate contains the validation loans’ own and later outcomes', true],
        ['The rate should be computed on 2025 alone to stay up to date', false],
        ['Nothing — aggregate features are safe because they are averaged', false],
      ], 'Each validation loan’s outcome is inside the rate used to predict it, and so are outcomes that matured after its application date. The feature must be built only from loans whose outcomes were known before each application.'),
      ck('ML_EVALUATION', 'With 600 labelled rows, two models must be compared. Which validation gives the most reliable comparison?', [
        ['One 80/20 split, since repeated folds keep reusing the same rows', false],
        ['Repeated stratified 5-fold, scoring both models on identical folds', true],
        ['Leave-one-out, since it always has the lowest-variance estimate', false],
        ['Training-set accuracy, since 600 rows are too few to hold any out', false],
      ], 'A single split on 600 rows is noisy. Repeating stratified k-fold and comparing the models fold by fold (paired) averages out split luck. Leave-one-out has low bias but high variance, and training accuracy measures memorisation.'),
    ],
  },

  /* ── IV_FEATURES_UNSUP ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_FEATURES_UNSUP',
    notes: `Feature and unsupervised questions test judgement more than recall: there is rarely one right
encoding or one right k, and the panel wants to hear the trade-off and how you would check it. Year 3
built the encoders, scalers, k-means, PCA and DBSCAN; this is the interview layer on top.

## Q1. "How would you encode a categorical feature?"

**Strong answer.** "Depends on cardinality, order and the model. Few unordered values → one-hot;
ordered → ordinal codes in the real order; many values → target encoding with smoothing and
out-of-fold fitting, frequency encoding, or the **hashing trick**; trees can also take native
categoricals (LightGBM)."

**Follow-up:** "Hashing has collisions — how bad?" — 1,000 merchant IDs into 1,024 buckets: each
merchant expects about 999/1,024 ≈ 0.98 others in its bucket, so P(alone) ≈ e^−0.98 ≈ 0.38 and about
**62%** share a bucket. Collisions are common unless buckets far outnumber values. The benefit:
new IDs need no refit.

## Q2. "One-hot with or without dropping a column?"

**Strong answer.** "For a linear model with an intercept, keeping all k columns makes them sum to
the intercept column — perfect multicollinearity, so OLS has no unique solution (the dummy trap).
Drop one, or use regularisation, which picks a unique answer. Trees do not care."

## Q3. "Which scaler, and when?"

**Strong answer.** "Scale for distance-based and gradient-based models (kNN, SVM, k-means, PCA,
regularised linear models, neural networks); not for trees. StandardScaler is the default;
**MinMaxScaler is fragile to outliers** — one ₹5 crore income squeezes every ordinary income under
₹5 lakh into 0–0.01. RobustScaler (median and IQR) or a log transform handles heavy tails."

## Q4. "Explain PCA, and when it hurts."

**Strong answer.** "PCA finds orthogonal directions of maximum variance — the eigenvectors of the
covariance matrix, with eigenvalues as their variances. Two standardised features correlated at 0.8
have eigenvalues 1.8 and 0.2, so PC1 explains **90%**. It hurts when the target lives in a
low-variance direction: PCA never looks at the target."

## Q5. "k-means — assumptions and alternatives?"

**Strong answer.** "It minimises within-cluster squared distance, so it prefers spherical, similar-
sized clusters and is sensitive to scale and outliers; it gives hard assignments. A **Gaussian
mixture** gives each point a probability per cluster and allows elliptical shapes; DBSCAN finds
arbitrary shapes and noise; hierarchical gives a dendrogram for small data."

**Follow-up:** "A customer sits between two segments. What does the business see?" — k-means
forces a choice; a GMM can say 55% / 45%, which is useful for borderline targeting.

## Q6. "t-SNE or UMAP shows three clusters. What can you conclude?"

**Strong answer.** "That nearby points in the plot were neighbours in the original space. Distances
**between** clusters and cluster sizes in a t-SNE plot are not meaningful, and the picture changes
with perplexity. I would never choose segments from it."

## Q7. "How do you know a segmentation is good?"

**Strong answer.** "Stable on resamples, interpretable profiles, and above all **actionable**: the
segments respond differently to something the business can do."

## How you are judged

Name the trade-off, give the number that shows you know its size, and say how you would check it.`,
    mcqs: [
      mcq('1,000 merchant IDs are hashed into 1,024 buckets. Roughly what share of merchants share a bucket with at least one other?', [
        ['About 2%, since there are more buckets than merchants', false],
        ['None, since 1,024 buckets hold 1,000 IDs one per bucket', false],
        ['About 62% — collisions stay common even with spare buckets', true],
        ['About 98%, since almost every bucket is shared by many IDs', false],
      ], 'Each merchant expects 999/1,024 ≈ 0.98 others in its bucket, so it is alone with probability (1 − 1/1,024)^999 ≈ 0.38. About 62% collide. Hashing is random placement, not a one-to-one assignment.'),
      mcq('A linear regression with an intercept one-hot encodes city into all four of its columns, dropping none. What is the problem?', [
        ['Each city gets the same coefficient, so the city effect averages out', false],
        ['The four columns sum to the intercept column, so OLS has no unique fit', true],
        ['Trees cannot split on one-hot columns, so the model loses the city effect', false],
        ['Nothing — keeping every column is required for OLS to fit the data', false],
      ], 'The dummies add to 1 on every row, exactly the intercept column, so XᵀX is singular and infinitely many coefficient sets fit equally well (the dummy trap). Drop one category or add a penalty.'),
      mcq('Two standardised features have a correlation of 0.8. What share of their total variance does the first principal component explain?', [
        ['80%, which is the correlation itself', false],
        ['64%, which is the squared correlation', false],
        ['50%, as both features have variance 1', false],
        ['90%, from eigenvalues of 1.8 and 0.2', true],
      ], 'The correlation matrix [[1, 0.8], [0.8, 1]] has eigenvalues 1 + 0.8 and 1 − 0.8. PC1 explains 1.8 / 2 = 90% of the variance.'),
    ],
    checkpoint: [
      ck('ML_FEATURE_ENGINEERING', 'Features are reduced with PCA to the components holding 95% of the variance before a churn model, and validation AUC falls. Why can that happen?', [
        ['PCA ignores the target, and a low-variance direction can carry the signal', true],
        ['PCA always removes the intercept, which the model needs to compute AUC', false],
        ['PCA makes the features correlated, which breaks a logistic regression', false],
        ['95% is far too much variance; only about half should ever be kept', false],
      ], 'PCA ranks directions by variance, not by usefulness for the label. The dropped 5% may be exactly where churners differ. Principal components are uncorrelated, not correlated.'),
      ck('ML_FEATURE_ENGINEERING', 'A t-SNE plot shows two segments far apart and a third lying close to one of them. What can you say about the third?', [
        ['It is a sub-segment of the nearer one and they should be merged', false],
        ['Little — t-SNE keeps local neighbours, not gaps between clusters', true],
        ['It is the most distinct group, since t-SNE magnifies the outliers', false],
        ['Its area on the plot is proportional to the number of its members', false],
      ], 't-SNE preserves which points are neighbours; the distances between clusters and the cluster sizes on the plot are not reliable and change with perplexity. Conclusions about segments need the original features.'),
      ck('ML_FEATURE_ENGINEERING', 'Income has one row at ₹5 crore, and every other row is under ₹5 lakh. After MinMaxScaler, what do the ordinary rows look like?', [
        ['Spread evenly from 0 to 1, since MinMax works on the ranks', false],
        ['Centred at 0 with unit variance, as with a StandardScaler', false],
        ['Unchanged, since MinMax scaling only affects the extreme rows', false],
        ['Squashed into about 0 to 0.01, losing almost all their spread', true],
      ], 'MinMax divides by the range, which the ₹5 crore row sets: ₹5 lakh / ₹5 crore = 0.01. Every ordinary income lands between 0 and 0.01. A log transform or RobustScaler copes with heavy tails.'),
    ],
  },

  /* ── IV_DL_NLP ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_DL_NLP',
    notes: `Even for a classic data-science role, panels now ask deep-learning and LLM questions — partly to
check depth, partly to see whether you will reach for an LLM when a logistic regression would do.
Year 3 built a network in PyTorch, fine-tuned a transformer and built a RAG system; here is the
interview layer.

## Q1. "Explain backpropagation."

**Strong answer.** "A forward pass computes the loss; the backward pass applies the chain rule layer
by layer from the loss to the inputs, reusing each layer's local derivative, so the gradient of every
weight costs about one more forward pass. The optimiser then updates the weights."

**Follow-up:** "Why do deep networks train badly without care?" — vanishing gradients (products
of small derivatives, sigmoid saturation) and exploding gradients (products of large ones). Fixes:
ReLU-family activations, careful initialisation, normalisation layers, **residual connections**
(an identity path for the gradient) and gradient clipping.

**Trap:** "ReLU has no gradient problems." Its derivative is 0 for negative inputs, so units can
die.

## Q2. "How do you stop a network overfitting?"

**Strong answer.** "More data or augmentation, weight decay, dropout, early stopping, a smaller
model, or transfer learning from a pretrained one." **Follow-up:** "How does dropout work at test
time?" — with inverted dropout at rate p, kept activations are multiplied by 1/(1 − p) during
training (1.25 at p = 0.2) so expected values match; at test time nothing is dropped or scaled.

## Q3. "What is transfer learning, and what is LoRA?"

**Strong answer.** "Start from a model pretrained on a large dataset and adapt it: train a new head
on frozen features, or fine-tune some or all layers with a small learning rate. **LoRA** freezes the
weights and learns a low-rank update BA: for a 4,096 × 4,096 matrix with rank 8 that is
2 × 4,096 × 8 = **65,536** trainable parameters instead of 16,777,216 — about 0.4%."

## Q4. "Explain a transformer."

**Strong answer.** "Tokens become embeddings plus position information. Each layer has multi-head
self-attention — every token's query is compared with every token's key, softmax-weighted, and used
to mix values — then a feed-forward block, with residuals and normalisation. The attention score
matrix is n × n, so going from 2,000 to 8,000 tokens makes it **16 times** larger."

**Follow-up:** "What does temperature do?" — divides the logits before softmax. Logits 2, 1, 0
give the top token 0.67 at T = 1, **0.87** at T = 0.5 and 0.51 at T = 2. Even T = 0 is not always
bit-for-bit deterministic on a hosted API.

## Q5. "What is an embedding?"

**Strong answer.** "A learnt dense vector where similar items are close. A vocabulary of 30,000
tokens in 768 dimensions is a 23,040,000-parameter lookup table. Sentence embeddings power search,
deduplication and clustering."

## Q6. "When is an LLM the wrong tool?"

**Strong answer.** "Structured, tabular prediction (credit default from 40 fields — boosted trees
are cheaper, faster, calibratable and auditable); exact calculations and rules; high-volume
low-latency scoring; anything where an unverifiable answer is unacceptable. An LLM fits unstructured
text: summarising, extracting, drafting — with checks."

**Follow-up:** "Your RAG answers cite the right documents but invent numbers. Fix?" — constrain the
answer to quoted retrieved text, check that every figure appears in the sources, measure
faithfulness on an evaluation set, and let it say "not found".

## How you are judged

Mechanism, the number that proves you understand its size, and judgement about when not to use it.`,
    mcqs: [
      mcq('With inverted dropout at rate p = 0.2, what happens to the activations that are kept during training?', [
        ['They are multiplied by 0.8 to match the share of units kept', false],
        ['They are multiplied by 1.25 so their expected value is unchanged', true],
        ['They are left as they are, and weights are scaled at test time', false],
        ['They are renormalised to unit variance across the whole mini-batch', false],
      ], 'Inverted dropout scales kept units by 1/(1 − p) = 1.25 during training, so nothing changes at inference. Scaling weights at test time is the older, non-inverted scheme.'),
      mcq('LoRA adds a rank-8 update to a 4,096 × 4,096 weight matrix. How many trainable parameters is that, against full fine-tuning of the matrix?', [
        ['65,536 against 16,777,216 — about 0.4%', true],
        ['32,768 against 16,777,216 — about 0.2%', false],
        ['4,096 against 16,777,216 — about 0.02%', false],
        ['131,072 against 16,777,216 — about 0.8%', false],
      ], 'The update is B (4,096 × 8) times A (8 × 4,096): 2 × 4,096 × 8 = 65,536 parameters, against 4,096² = 16,777,216, which is 0.39%.'),
      mcq('A model’s context window grows from 2,000 to 8,000 tokens. How does the size of each attention score matrix change?', [
        ['4 times larger, since it grows with n', false],
        ['2 times larger, since it grows with log n', false],
        ['16 times larger, since it is n × n', true],
        ['Unchanged, since each head is a fixed size', false],
      ], 'Every token attends to every token, so the score matrix is n × n: (8,000 / 2,000)² = 16. This quadratic cost is why long-context models use tricks such as FlashAttention or sparse attention.'),
    ],
    checkpoint: [
      ck('NEURAL_NETWORKS', 'A model’s logits for three tokens are 2, 1 and 0. At temperature 0.5, what probability does the top token get?', [
        ['About 0.67', false],
        ['About 0.51', false],
        ['About 0.95', false],
        ['About 0.87', true],
      ], 'Dividing by T = 0.5 gives logits 4, 2 and 0; softmax gives e⁴ / (e⁴ + e² + 1) ≈ 0.867. At T = 1 the top token gets 0.665 and at T = 2 about 0.506: lower temperature sharpens the distribution.'),
      ck('NEURAL_NETWORKS', 'An NBFC wants a default probability for each application from 40 structured fields, scored 2 lakh times a day. Why is an LLM the wrong first choice?', [
        ['Boosted trees are cheaper, faster, calibratable and auditable here', true],
        ['LLMs cannot read numbers, so the 40 fields would be ignored entirely', false],
        ['LLMs can only classify text, so they cannot output a probability', false],
        ['An LLM would need the full training data in every single prompt', false],
      ], 'For tabular prediction, gradient-boosted trees or a scorecard give better accuracy per rupee, millisecond latency, calibrated probabilities and explanations a regulator accepts. LLMs can read numbers; they are just the wrong tool here.'),
      ck('NEURAL_NETWORKS', 'Gradient norms jump from about 3 to 4,000 on some batches and the loss turns NaN. Which fix targets the cause directly?', [
        ['Add more dropout, since a NaN loss is a sign of overfitting', false],
        ['Clip the gradient norm, for example at 1.0, and lower the rate', true],
        ['Remove the validation set, since it produces the NaN values', false],
        ['Switch to sigmoid activations, which bound each layer’s output', false],
      ], 'Huge gradient spikes are exploding gradients: one update throws the weights to extreme values and the loss overflows. Clipping caps the step size; a lower learning rate helps too. Sigmoids bring vanishing gradients instead.'),
    ],
  },

  /* ── IV_DEPLOYMENT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_IV_DEPLOYMENT',
    notes: `For ML-engineer roles and most fintech data-science roles, a third of the ML round is about what
happens after the notebook. Year 3 served the capstone with FastAPI, tracked it in MLflow and checked
drift; the panel now asks what goes wrong in production and how you would know.

## Q1. "Batch or real-time serving?"

**Strong answer.** "Batch when the decision can wait and the features are available in bulk — a
nightly collections priority list for lakhs of loans. Real-time when the decision is made in the
user's flow — an instant loan approval at a two-wheeler dealer. Real-time needs features available
at request time with low latency, which is usually the harder part."

## Q2. "What is training–serving skew?"

**Strong answer.** "The same feature computed differently in training and serving. Example:
avg_txn_30d in training came from end-of-day tables that **included** the application day; at
serving it excludes today. The model learnt on a feature it never sees live. Fixes: compute features
once in shared code or a feature store, log the served features, and compare their distribution
with training."

**Trap:** calling it concept drift. Nothing in the world changed; the pipeline did.

## Q3. "How do you monitor a model whose labels come 90 days later?"

**Strong answer.** "From day one: input drift (PSI per feature), missing and out-of-range rates, the
prediction distribution, approval rate by segment, latency and errors. When labels mature: AUC,
calibration (predicted vs actual default) by cohort. Early **proxy** labels (30+ DPD at 3 months)
bridge the gap."

## Q4. "Types of drift?"

**Strong answer.** "Covariate shift — P(x) changes, P(y | x) holds. Label (prior) shift — P(y)
changes, P(x | y) holds. Concept drift — P(y | x) itself changes, so the model is wrong even on
familiar inputs. Each needs a different response: reweighting, recalibration, or retraining."

## Q5. "How do you release a new model safely?"

**Strong answer.** "**Shadow** first — the new model scores live traffic with no effect on users, so
I see real inputs, latency and failures and compare its decisions with the live model's. Then a
**canary** — a small share of traffic, watched closely, with instant rollback. Then an A/B test if
the business effect matters. The registry keeps the previous version one command away."

## Q6. "How would you A/B test a credit model?"

**Strong answer.** "Randomise by applicant, not by request; agree the primary metric (approval rate
at a fixed expected-loss budget, or profit) and guardrails (default proxy, complaints); defaults
mature over 12 months, so read early proxies and keep a holdout to confirm on real defaults."

**Follow-up:** "What about selective labels?" — you only see outcomes for approved applicants, so a
model retrained only on them can grow blind to the rejected region. Keep a small, governed
exploration band or use reject-inference carefully.

## Q7. "When do you retrain?"

**Strong answer.** "On a schedule matched to how fast the data move, or on a trigger (drift or a
performance drop), and always through a gate: the candidate must beat the live model on recent data
and its decision changes must be reviewed before it is promoted."

## How you are judged

Concrete failure modes with a detection and a fix — not tool names.`,
    mcqs: [
      mcq('In training, avg_txn_30d came from end-of-day tables that include the day of the application; at serving it excludes that day. What is this?', [
        ['Concept drift: the link between features and default has changed', false],
        ['Label shift: the default rate has moved since training finished', false],
        ['Training–serving skew: one feature means two things in each place', true],
        ['Overfitting: the model memorised the training-day transactions', false],
      ], 'Nothing in the world changed; the feature is computed differently in the two pipelines. The cure is shared feature code (or a feature store) and comparing logged serving features with training ones.'),
      mcq('What does a shadow deployment show that an offline backtest cannot?', [
        ['Live inputs, latency and failures on real traffic, with no user impact', true],
        ['The new model’s causal effect on business outcomes such as revenue or losses', false],
        ['Labels for the new model’s decisions, months before they would mature', false],
        ['A guarantee that the new model treats every customer group equally', false],
      ], 'In shadow mode the new model scores real requests but its output is not used, so you see real input data, latency, errors and disagreement with the live model. Causal effects need an A/B test, and labels still take their time.'),
      mcq('A lender’s model sees default outcomes only for the applicants it approved. What can retraining on that data alone do over time?', [
        ['Learn only from approved applicants and grow blind to the rejected', true],
        ['Become perfectly calibrated, since every observed label is accurate', false],
        ['Approve more risky applicants, since rejected rows count as repaid', false],
        ['Nothing — the approved applicants are a random sample of everyone', false],
      ], 'This is the selective-labels problem: the training data cover only the region the old model approved, so the new model has no evidence about the rest. A small, governed exploration band or careful reject inference addresses it.'),
    ],
    checkpoint: [
      ck('MODEL_DEPLOYMENT', 'A new credit model is A/B tested against the live one, but defaults show only after 12 months. Which plan is sound?', [
        ['Randomise by applicant, read early proxies, confirm on real defaults', true],
        ['Randomise by request, and stop at two weeks when significance appears', false],
        ['Compare approval rates only, since those are visible on the first day', false],
        ['Skip the test and deploy, since offline AUC already shows it is better', false],
      ], 'The unit is the applicant (a person must get one model), early delinquency such as 30+ DPD at 3 months gives a timely signal, and a holdout confirms on true defaults. Approval rate alone says nothing about losses.'),
      ck('MODEL_DEPLOYMENT', 'Labels arrive 90 days after each loan is scored. What can be monitored from the first day?', [
        ['AUC and calibration, computed on the applications scored today', false],
        ['Input drift, prediction spread, missing rates and approval rate', true],
        ['Only latency and error counts, since nothing else exists yet', false],
        ['Default rate by segment, estimated from the model’s own scores', false],
      ], 'Without labels you cannot compute AUC or calibration, but feature distributions, missing and out-of-range rates, the score distribution and decision rates are all available at once — along with latency and errors.'),
      ck('MODEL_DEPLOYMENT', 'Monthly retraining raises validation AUC each time, yet the live approval rate swings by ±8 points from month to month. What is missing?', [
        ['A larger validation set, so that AUC is estimated more precisely', false],
        ['A gate comparing candidate and live models on decisions, not only AUC', true],
        ['A faster retraining cadence, such as weekly, to catch drift sooner', false],
        ['A deeper model, since larger models are more stable between runs', false],
      ], 'AUC measures ranking; the business sees decisions. A release gate should compare the candidate with the live model on recent data — approval rate, expected loss and which applicants flip — before promotion.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_RAPID_FIRE',
    notes: `A screening call: thirty ML questions in about ten minutes, one correct line each. Cover the
answer, say yours out loud, then check.

## Fundamentals

1. **Expected squared error splits into?** — Bias² + variance + noise.
2. **High bias means?** — Underfitting.
3. **More data mostly reduces?** — Variance.
4. **Penalty that gives exact zeros?** — L1 (lasso).
5. **Ridge as a Bayesian estimate?** — MAP with a Gaussian prior.
6. **Edge of a cube holding 10% of uniform data in 10-D?** — About 0.79.
7. **Is kNN parametric?** — No; it stores the data.

## Algorithms

8. **What does logistic regression model linearly?** — The log-odds.
9. **Unpenalised logistic regression on separable data?** — Weights diverge.
10. **Shape of a tree's boundary?** — Axis-aligned steps.
11. **Bagging mainly cuts?** — Variance.
12. **Boosting mainly cuts?** — Bias.
13. **XGBoost leaf weight?** — −G / (H + λ).
14. **Points that define an SVM boundary?** — Support vectors.
15. **High gamma in an RBF SVM?** — Very local influence; overfitting.
16. **Naive Bayes' naive assumption?** — Features independent given the class.

## Evaluation

17. **AUC as a probability?** — P(random positive outranks random negative).
18. **Does ROC depend on prevalence?** — No; precision does.
19. **Constant log loss at a 10% base rate?** — About 0.325.
20. **Calibration that never changes AUC?** — Platt scaling.
21. **CV when one customer has many rows?** — GroupKFold.

## Features and unsupervised

22. **Dummy trap?** — All k dummies plus an intercept are collinear.
23. **Scaler hurt most by one outlier?** — MinMaxScaler.
24. **PC1 share for two features with r = 0.8?** — 90%.
25. **Soft-assignment alternative to k-means?** — Gaussian mixture.

## Deep learning, NLP and deployment

26. **ReLU derivative for negative input?** — 0.
27. **Inverted dropout scale at p = 0.2?** — 1.25 in training.
28. **Attention cost in sequence length?** — Quadratic.
29. **Same feature computed two ways?** — Training–serving skew.
30. **P(y | x) changes?** — Concept drift.

## Scoring

25+ correct and quick: strong. 20–24: revise the misses. Under 20, or "AUC 0.8 means 80% accuracy",
or "boosting reduces variance": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: “Beyond the gradient, what does XGBoost’s leaf-weight formula use from the loss?”', [
        ['The second derivative, the Hessian', true],
        ['The loss value at each training row', false],
        ['The learning rate of the previous tree', false],
        ['The share of rows that fall in the leaf', false],
      ], 'XGBoost takes a second-order (Newton) step: the leaf weight is −G / (H + λ), with G the sum of gradients and H the sum of Hessians over the leaf’s rows.'),
      mcq('Rapid fire: “Averaging many deep trees on bootstrap samples mainly reduces which error component?”', [
        ['Bias', false],
        ['Variance', true],
        ['Irreducible noise', false],
        ['All three equally', false],
      ], 'Bagging averages high-variance, low-bias trees; averaging cuts variance while leaving bias about the same. Noise cannot be reduced by any model.'),
      mcq('Rapid fire: “What is the derivative of ReLU for a negative input?”', [
        ['1', false],
        ['0.5', false],
        ['0', true],
        ['−1', false],
      ], 'ReLU is max(0, x): flat at 0 for negative inputs, so its derivative there is 0 — which is how units can “die” and stop learning.'),
      mcq('Rapid fire: “How many parameters does an embedding table of 30,000 tokens by 768 dimensions hold?”', [
        ['23,040,000', true],
        ['30,768', false],
        ['2,304,000', false],
        ['230,400,000', false],
      ], 'An embedding table has one learnt vector per token: 30,000 × 768 = 23,040,000 parameters.'),
      mcq('Rapid fire: “P(y) changes but P(x | y) stays the same. Which kind of drift is it?”', [
        ['Covariate shift', false],
        ['Concept drift', false],
        ['Label (prior) shift', true],
        ['Training–serving skew', false],
      ], 'Label shift is a change in the class balance with each class looking the same. Covariate shift changes P(x) with P(y | x) fixed; concept drift changes P(y | x) itself.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_MOCK',
    notes: `The interviewer's script for a 45-minute ML round for an entry data-scientist role at a
fintech or NBFC. Do it with a friend reading the interviewer's lines, or record yourself. The
scoring notes are what a panel writes down.

## Opening (3 min)

"Walk me through the model in your capstone in two minutes."

- **Strong:** the decision it supports (approve or review a two-wheeler loan), the label and
  its window, the baseline, the model and its validation, one honest number, and what you would
  change.
- **Weak:** a list of libraries and an accuracy figure.

## Q1 — Fundamentals (6 min)

"Your gradient-boosted model has train AUC 0.97 and validation 0.78. What do you do?"

- **Strong:** leakage check first (a feature too good to be true, time-split vs random split), then
  regularise — fewer leaves, larger min_child_samples, lower learning rate with early stopping,
  subsampling — and a learning curve.
- **OK:** "regularise", with one specific setting.
- **Weak:** "add more trees".

## Q2 — Algorithms (8 min)

"Explain how gradient boosting builds its second tree. Then: why might the risk team still prefer
logistic regression?"

- **Strong:** the second tree fits the negative gradients (y − p in log-odds space for log loss) of
  the first model, its leaf values are shrunk by the learning rate and added; XGBoost uses
  −G / (H + λ). For the risk team: monotonic, explainable coefficients, stable over time, easy to
  audit, usually only a few AUC points behind.
- **Weak:** "it fixes the mistakes of the first tree", nothing more.

## Q3 — Evaluation (8 min)

"Default rate is 6%. The model has AUC 0.79 and log loss 0.24. Is it good? What would you show the
credit head?"

- **Strong:** compares log loss with the constant baseline (−[0.06 ln 0.06 + 0.94 ln 0.94] ≈ 0.227),
  notes 0.24 is **worse** — the probabilities need calibration even though the ranking is useful —
  then shows approval rate and expected bad rate at two or three cut-offs, by month out of time.
- **OK:** AUC with a sensible comparison, no calibration.
- **Weak:** "AUC 0.79 is good."

## Q4 — Features (6 min)

"Dealer ID has 3,000 values. How do you use it?"

- **Strong:** out-of-fold target encoding with smoothing, or LightGBM native categoricals with
  min_data_per_group; a separate bucket for new dealers; watches for dealer-level leakage (one
  dealer's fraud wave in both train and validation).
- **Weak:** one-hot 3,000 columns into a logistic regression with no regularisation.

## Q5 — Deep learning and LLMs (5 min)

"Would you use an LLM anywhere in this product?"

- **Strong:** not for the risk score; yes for drafting the officer's note or extracting fields from
  documents, with checks that every figure in the draft comes from the application.
- **Weak:** "fine-tune an LLM on the loan table".

## Q6 — Deployment (7 min)

"Three months after launch, approvals have fallen 10 points with no code change. Investigate."

- **Strong:** prediction distribution vs launch, feature drift by feature (PSI), missing rates
  (a bureau field arriving empty?), segment mix (new dealers, new geography), training–serving skew
  in a recently changed upstream table; then recalibration or retraining through a gate.
- **Weak:** "retrain the model".

## Scoring

Hire bar: strong on Q1 and Q3, at least OK elsewhere, no confident wrong statement. "AUC is high so
the probabilities are right" or "add more trees to fix overfitting" outweighs two OK answers.`,
    mcqs: [
      mcq('In the mock’s Q3, the default rate is 6% and the model’s log loss is 0.24. What does the constant-prediction baseline show?', [
        ['It scores about 0.227, so the model’s probabilities need calibrating', true],
        ['It scores about 0.693, so the model is far better than the baseline', false],
        ['It scores about 0.060, so the model is four times worse than chance', false],
        ['It cannot be computed without knowing the model’s AUC on the data', false],
      ], 'Predicting 0.06 for everyone gives −(0.06 ln 0.06 + 0.94 ln 0.94) ≈ 0.227. A log loss of 0.24 is worse, so although AUC 0.79 shows useful ranking, the probabilities are miscalibrated. 0.693 is the coin-flip loss at 50/50.'),
      mcq('In the mock’s Q1, which first step best handles train AUC 0.97 against validation 0.78?', [
        ['Add 500 more trees so the ensemble can average the noise away', false],
        ['Check for leakage, then regularise with fewer leaves and early stopping', true],
        ['Report the training AUC, since it reflects the model’s real capacity', false],
        ['Drop the validation set and use cross-validation on the training rows instead', false],
      ], 'A large gap is variance or leakage. Leakage must be ruled out first; then boosting is regularised by limiting tree size, lowering the learning rate with early stopping and subsampling. More trees in boosting can worsen overfitting.'),
      mcq('In the mock’s Q2, what does the second tree of a gradient-boosted classifier with log loss fit?', [
        ['The labels again, with misclassified rows given double weight', false],
        ['The first tree’s leaf values, so they can be smoothed toward 0', false],
        ['The negative gradients, y − p, of the first model’s predictions', true],
        ['A random half of the features, chosen afresh for this new tree', false],
      ], 'Gradient boosting fits each tree to the negative gradient of the loss at the current predictions; for log loss in log-odds space that is y − p. Reweighting misclassified rows is AdaBoost.'),
      mcq('In the mock’s Q4, a dealer ID has 3,000 values and a logistic regression is planned. Which plan is strongest?', [
        ['One-hot all 3,000 dealers and fit the model with no penalty at all', false],
        ['Drop the dealer ID, since high-cardinality columns never help a model', false],
        ['Use dealer IDs as integers 1 to 3,000 so the model gets one column', false],
        ['Out-of-fold smoothed target encoding, plus a bucket for new dealers', true],
      ], 'Smoothed target encoding fitted out of fold gives one informative column without leaking each row’s own label; a separate value handles dealers not seen in training. Integer codes impose a meaningless order.'),
      mcq('In the mock’s Q6, approvals fell 10 points three months after launch with no code change. What should be checked first?', [
        ['The prediction distribution and feature drift, including missing rates', true],
        ['The model’s hyperparameters, since they may have changed on their own', false],
        ['The training AUC, recomputed on the original training data from scratch', false],
        ['Nothing — a fall in approvals is a sign the model is working as planned', false],
      ], 'A shift in decisions without a code change points to the inputs: compare score and feature distributions with launch, look for fields arriving empty, segment-mix changes and upstream table changes, then decide on recalibration or retraining.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DS_IV_ML_CHECKPOINT',
    notes: `Ten questions across the topic — fundamentals, algorithms, evaluation, features, deep learning
and deployment. Each is the kind of thing an interviewer asks across the table. Work the numbers
before you choose.`,
    checkpoint: [
      ck('ML_OVERFITTING', 'Why is early stopping of gradient descent described as a form of regularisation?', [
        ['It limits how far weights move from their start, much like an L2 penalty', true],
        ['It removes the features with the smallest gradients from the model', false],
        ['It averages the weights from every epoch, which reduces the variance', false],
        ['It lowers the learning rate each epoch until the loss stops falling', false],
      ], 'Starting from small weights, each step moves them a little; stopping early caps the distance travelled. For linear models this behaves much like an L2 penalty whose strength falls as more steps are taken.'),
      ck('ML_OVERFITTING', 'A ridge model is tuned over λ from 0.01 to 100 and validation error is U-shaped. What dominates the error at the smallest λ?', [
        ['Bias, because the coefficients are shrunk almost to zero', false],
        ['Variance, because the fit is nearly unpenalised and chases noise', true],
        ['Noise, because a small penalty adds random error to the labels', false],
        ['Neither, because ridge error does not depend on λ at the ends', false],
      ], 'Small λ means little shrinkage: the coefficients follow the particular training sample, so variance dominates. Large λ shrinks them toward zero and bias dominates. The bottom of the U balances the two.'),
      ck('ML_SUPERVISED', 'Why can a single decision tree need many splits to learn the boundary x1 = x2?', [
        ['Its splits are axis-aligned, so a diagonal becomes a staircase', true],
        ['It can split on each feature only once along any root-to-leaf path', false],
        ['Gini impurity cannot be computed for features on the same scale', false],
        ['Trees need scaled features before they can learn diagonal lines', false],
      ], 'Each split tests one feature against a threshold, giving boundaries parallel to the axes. A diagonal must be approximated by many small steps; a linear model or an x1 − x2 feature learns it at once.'),
      ck('ML_SUPERVISED', 'Why does a random forest mainly reduce variance while gradient boosting mainly reduces bias?', [
        ['Forests average deep trees; boosting adds shallow trees fitted to errors', true],
        ['Forests use shallow trees; boosting uses deep trees on bootstrap samples', false],
        ['Forests use the Hessian of the loss; boosting uses only the raw labels', false],
        ['Forests train trees one after another; boosting trains them at once', false],
      ], 'Averaging many low-bias, high-variance deep trees cancels their variance. Boosting starts from a weak, high-bias model and adds shallow trees that each correct the remaining error, reducing bias step by step.'),
      ck('ML_EVALUATION', 'A default model has ROC AUC 0.75. Which statement about it is correct?', [
        ['75% of its predictions are correct at a 0.5 threshold', false],
        ['75% of defaulters are caught at the default threshold', false],
        ['Its predicted probabilities are within 25 points of the true rates', false],
        ['A random defaulter outranks a random payer 75% of the time', true],
      ], 'AUC is the probability that a randomly chosen positive gets a higher score than a randomly chosen negative. It says nothing about accuracy or recall at a threshold, or about calibration.'),
      ck('ML_EVALUATION', 'Models A and B both have AUC 0.80. A’s probabilities are calibrated; B’s all lie between 0.45 and 0.55. Which suits setting loss provisions?', [
        ['A, because only calibrated probabilities can be used as expected rates', true],
        ['B, because a narrow band of scores is a sign of a more stable model', false],
        ['Either, because equal AUC means equal value for any business use', false],
        ['Neither, because provisions can only be set from accuracy figures', false],
      ], 'Equal AUC means equal ranking, but provisions multiply probabilities by exposures, so the probabilities must match observed default rates. B’s compressed scores would put nearly every loan at about 50% risk.'),
      ck('ML_FEATURE_ENGINEERING', 'Customers sit between two spending segments, and marketing wants to know how borderline each one is. Which method gives that directly?', [
        ['k-means, since its cluster centres show the distance to every segment', false],
        ['A Gaussian mixture, giving each customer a probability per segment', true],
        ['DBSCAN, since it marks borderline customers with the label −1', false],
        ['PCA, since the first component sorts customers by how borderline', false],
      ], 'A Gaussian mixture gives soft assignments — for example 55% / 45% — and allows elliptical clusters. k-means gives hard labels; DBSCAN’s −1 means noise, not borderline; PCA does not cluster.'),
      ck('NEURAL_NETWORKS', 'Why do residual (skip) connections help a 50-layer network to train?', [
        ['They give the gradient an identity path, so it does not vanish layer by layer', true],
        ['They halve the parameter count, so there is less to learn in each layer', false],
        ['They replace the activation functions, so the network becomes linear', false],
        ['They add dropout between layers, which prevents the model overfitting', false],
      ], 'With y = x + F(x), the derivative includes an identity term, so gradients reach early layers without being multiplied down through every layer. That is what made very deep networks such as ResNets trainable.'),
      ck('NEURAL_NETWORKS', 'A RAG assistant for loan officers retrieves the right policy pages but invents figures in its answers. What is the best first fix?', [
        ['Raise the temperature so that the model explores more answers', false],
        ['Fine-tune the model on the policy pages until it memorises them', false],
        ['Require figures quoted from the retrieved text and check faithfulness', true],
        ['Retrieve twice as many pages so the model has more context to use', false],
      ], 'Retrieval is working; generation is not grounded. Constrain answers to quoted source text, verify that every figure appears in the retrieved pages, let the model say “not found”, and measure faithfulness on an evaluation set.'),
      ck('MODEL_DEPLOYMENT', 'A new model is first sent 5% of live traffic before full rollout. What is that canary step for?', [
        ['To catch errors, latency and odd outputs on real traffic with rollback ready', true],
        ['To measure the model’s long-term business effect with full statistical power', false],
        ['To collect labels for retraining before the full rollout of the new model', false],
        ['To compare its offline AUC with the live model on the same validation set', false],
      ], 'A canary exposes a small share of users so problems — crashes, slow responses, strange score distributions — affect few people and can be rolled back. 5% of traffic is usually too little for a powered business test.'),
    ],
  },
];
