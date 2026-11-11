import { SeedBook } from '../types';

/**
 * Data Science + AI track interview questions.
 * Python examples use Python 3 with pandas and scikit-learn.
 */
const book: SeedBook = {
  slug: 'track-data-science',
  title: 'Data Science + AI Interview Questions',
  kind: 'topic',
  subject: 'Data Science + AI',
  description: 'The 40 questions data science freshers face: probability and statistics, ML foundations, supervised and unsupervised models, forecasting, deep learning, GenAI and ML case design.',
  color: '#7c3aed',
  emblem: '🧠',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['DATA_SCIENCE_AI'],
  order: 204,
  chapters: [
    {
      title: 'Probability, Statistics and Data Wrangling',
      questions: [
        {
          q: `Two fair dice are rolled. What is the probability that the sum is 7? What is the probability of getting at least one six?`,
          a: `There are 6 x 6 = 36 equally likely outcomes.

**Sum is 7**: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 outcomes, so P = 6/36 = **1/6**.

**At least one six**: easier with the complement. P(no six on one die) = 5/6, so P(no six on both) = 25/36. Therefore P(at least one six) = 1 - 25/36 = **11/36**.

You can verify by counting: the first die is six in 6 outcomes, the second in 6, and (6,6) is counted twice, so 6 + 6 - 1 = 11.

The complement trick ("at least one" = 1 - "none") is the most useful tool for these puzzles; interviewers often extend the question to "at least one six in four rolls" (1 - (5/6)^4, about 0.518).`,
          d: 'easy',
          at: 'Product companies, analytics firms',
          tip: `Say "I will use the complement" out loud; it shows a method rather than a memorised answer.`,
        },
        {
          q: `What are Type I and Type II errors?`,
          a: `In hypothesis testing:

- **Type I error (false positive)**: rejecting the null hypothesis when it is actually true. Its probability is the significance level **alpha** (often 0.05). Example: concluding a new drug works when it does not.
- **Type II error (false negative)**: failing to reject the null when it is false. Its probability is **beta**; **power** = 1 - beta (often targeted at 0.8). Example: missing a drug that really works.

In ML terms, a spam filter that sends a genuine email to spam makes a false positive; letting spam into the inbox is a false negative.

Which is worse depends on the cost. In cancer screening, a false negative (missing cancer) is far worse, so we accept more false positives. In a court, convicting an innocent person (false positive) is considered worse. Lowering alpha reduces Type I errors but increases Type II errors unless you collect more data.`,
          d: 'easy',
        },
        {
          q: `How do you handle missing values in a dataset before modelling?`,
          a: `First understand **why** values are missing: completely at random, related to other columns, or related to the missing value itself (high earners skipping the income field). The reason decides the method.

Options:

- **Drop rows** when very few are affected and the data is missing at random.
- **Drop the column** when most values are missing and it adds little.
- **Simple imputation**: median for skewed numbers, mean for symmetric ones, most frequent value or an "Unknown" category for categorical columns.
- **Model-based imputation**: KNN or iterative imputers that predict the value from other columns.
- **Missing indicator**: add a column \`income_missing = 1\`, because missingness can itself be predictive.
- Some models, such as gradient boosting in LightGBM or XGBoost, handle NaN natively.

\`\`\`python
from sklearn.impute import SimpleImputer
imputer = SimpleImputer(strategy="median", add_indicator=True)
X_train_imp = imputer.fit_transform(X_train)
X_test_imp = imputer.transform(X_test)   # reuse training medians
\`\`\`

Fit the imputer on training data only, otherwise test information leaks into training.`,
          d: 'easy',
          tip: `Mentioning "fit on train only" separates a real practitioner from someone who read a tutorial.`,
        },
        {
          q: `Explain Bayes' theorem with the classic medical test example.`,
          a: `**Bayes' theorem**: P(A | B) = P(B | A) x P(A) / P(B). It updates a prior belief with new evidence.

A disease affects 1% of people. A test detects it 99% of the time (sensitivity) and gives a false positive 5% of the time. You test positive. What is the chance you have the disease?

Imagine 10,000 people:

- 100 have the disease; 99 test positive.
- 9,900 do not; 5% of them = 495 test positive.
- Total positives = 99 + 495 = 594.

P(disease | positive) = 99 / 594 = about **16.7%**.

Most people guess 99% because they ignore the **base rate**: the disease is rare, so false positives from the large healthy group outnumber true positives. This is why rare-event models (fraud, rare disease) produce many false alarms even when they look accurate, and why a second confirmatory test is used.`,
          d: 'medium',
          at: 'Product companies, fintech',
          tip: `Use the "imagine 10,000 people" counting method; it is clearer and less error-prone than the formula.`,
        },
        {
          q: `What is the Central Limit Theorem and why does it matter in data science?`,
          a: `The **Central Limit Theorem (CLT)** says: if you take many random samples of size n from almost any population with a finite variance and compute each sample's mean, those sample means are approximately **normally distributed** when n is large enough (a common rule of thumb is n of 30 or more). The distribution is centred on the population mean, with standard deviation sigma / sqrt(n), called the **standard error**.

Why it matters:

- It lets us build **confidence intervals** and run **t-tests and z-tests** on means even when the raw data (order values, session times) is skewed.
- It explains why **A/B tests** on averages and proportions work with normal-based formulas.
- The sqrt(n) term shows that quadrupling the sample size only halves the uncertainty.

Caveats: very heavy-tailed data needs much larger samples, and the CLT is about the **sample mean**, not the individual data points; the raw data does not become normal.`,
          d: 'medium',
        },
        {
          q: `When would you use the binomial, Poisson and normal distributions? Give an example of each.`,
          a: `- **Binomial**: number of successes in n independent yes/no trials with the same probability p. Example: out of 1,000 users shown an ad with a 3% click rate, how many click? Mean = np = 30.
- **Poisson**: count of events in a fixed interval when events happen independently at a constant average rate lambda. Example: number of support tickets per hour (average 4), number of server errors per day. Mean = variance = lambda.
- **Normal**: continuous, symmetric, bell-shaped data, or sums and averages of many small effects. Example: measurement errors, heights, sample means (via the CLT).

Related ones worth naming: **Bernoulli** (a single yes/no trial), **exponential** (time between Poisson events, such as time until the next ticket), and **log-normal** (right-skewed positive data such as incomes and order values).

In practice, choosing the right distribution matters for simulations, anomaly thresholds and choosing models; for example, count targets are often modelled with Poisson regression.`,
          d: 'medium',
        },
        {
          q: `Write SQL to create model features per user: days since last purchase and number of orders in the last 30 days.`,
          a: `Assume \`orders(order_id, user_id, order_ts, amount)\` and a fixed snapshot date, so training features never use data from the future.

\`\`\`sql
-- PostgreSQL; snapshot = 2025-10-01
SELECT
  user_id,
  DATE '2025-10-01' - MAX(order_ts)::date                             AS days_since_last_order,
  COUNT(*) FILTER (WHERE order_ts >= DATE '2025-10-01' - INTERVAL '30 days') AS orders_30d,
  SUM(amount) FILTER (WHERE order_ts >= DATE '2025-10-01' - INTERVAL '90 days') AS spend_90d,
  COUNT(*)                                                             AS lifetime_orders
FROM orders
WHERE order_ts < DATE '2025-10-01'          -- only the past, relative to the snapshot
GROUP BY user_id;
\`\`\`

Points interviewers look for:

- The \`WHERE order_ts < snapshot\` filter prevents **leakage**: the label (for example, "churned in the next 60 days") is computed only from data after the snapshot.
- Users with no orders in a window get NULL sums; fill them with 0 in pandas.
- For training, repeat this for several snapshot dates to get more examples across seasons.

In MySQL, use \`SUM(CASE WHEN ... THEN 1 ELSE 0 END)\` instead of \`FILTER\`.`,
          d: 'medium',
          at: 'Product companies, fintech',
        },
        {
          q: `You toss a fair coin until you get two heads in a row. What is the expected number of tosses?`,
          a: `Use states and expected values.

- Let **E** be the expected tosses from the start (or right after a tail).
- Let **E1** be the expected tosses when the last toss was a head.

From the start: toss once. With probability 1/2 it is H (go to state E1), with 1/2 it is T (back to start):

E = 1 + (1/2) E1 + (1/2) E

From state E1: toss once. With 1/2 it is H (done), with 1/2 it is T (back to start):

E1 = 1 + (1/2)(0) + (1/2) E

Substitute: E = 1 + (1/2)(1 + E/2) + E/2, so E = 1.5 + 0.75E, giving 0.25E = 1.5 and **E = 6**.

A quick simulation confirms it:

\`\`\`python
import random

def tosses():
    n, last = 0, False
    while True:
        n += 1
        h = random.random() < 0.5
        if h and last:
            return n
        last = h

print(sum(tosses() for _ in range(100_000)) / 100_000)  # about 6
\`\`\``,
          d: 'hard',
          at: 'Product companies, quant and fintech firms',
          tip: `Offer to verify with a simulation; interviewers value checking your own answer.`,
        },
      ],
    },
    {
      title: 'ML Foundations',
      questions: [
        {
          q: `What is the difference between supervised, unsupervised and reinforcement learning?`,
          a: `- **Supervised learning** learns from **labelled** data: inputs with known outputs.
  - **Regression** predicts a number (house price, delivery time).
  - **Classification** predicts a class (spam or not, loan default or not).
- **Unsupervised learning** finds structure in **unlabelled** data.
  - **Clustering** (customer segments), **dimensionality reduction** (PCA), **anomaly detection**.
- **Reinforcement learning** trains an **agent** that takes actions in an environment and learns from **rewards** over time. Examples: game playing, robotics, some recommendation and pricing systems.

Also worth mentioning: **semi-supervised** learning (a few labels plus many unlabelled examples) and **self-supervised** learning, where labels come from the data itself, such as predicting the next word. Self-supervised pre-training is how large language models are trained, before fine-tuning steps that use human feedback.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `What is overfitting and underfitting? How do you detect and fix them?`,
          a: `- **Underfitting**: the model is too simple to capture the pattern. **High error on both training and validation** data. Example: a straight line fitted to clearly curved data.
- **Overfitting**: the model memorises noise in the training data. **Very low training error but much higher validation error**. Example: a deep decision tree that is 100% accurate on training data and 70% on new data.

Detect them by comparing training and validation scores, or by plotting learning curves.

Fixing **overfitting**:
- More training data, or data augmentation.
- Simpler model: fewer features, shallower trees, fewer layers.
- **Regularisation** (L1, L2, dropout), early stopping.
- Ensembles such as random forests that average many models.
- Cross-validation to tune hyperparameters honestly.

Fixing **underfitting**:
- A more flexible model, better or more features, less regularisation, training longer.`,
          d: 'easy',
          tip: `Quote the train vs validation score pattern; it is the one-line diagnosis interviewers want.`,
        },
        {
          q: `Why do we split data into training, validation and test sets?`,
          a: `- **Training set** (for example 70%): the model learns its parameters from it.
- **Validation set** (15%): used to compare models and tune hyperparameters such as tree depth or learning rate.
- **Test set** (15%): touched **once at the end** to estimate performance on truly unseen data.

If you tune on the test set, you slowly fit your choices to it, and the reported score becomes over-optimistic. The test set must stay a stand-in for the future.

\`\`\`python
from sklearn.model_selection import train_test_split

X_temp, X_test, y_temp, y_test = train_test_split(
    X, y, test_size=0.15, stratify=y, random_state=42)
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.1765, stratify=y_temp, random_state=42)  # about 15% of total
\`\`\`

Use \`stratify\` for classification so each split keeps the class balance. For time-based data, split **by time** (train on the past, test on the most recent period), never randomly. With small datasets, use cross-validation instead of a single validation split.`,
          d: 'easy',
        },
        {
          q: `Explain the bias-variance trade-off.`,
          a: `A model's expected error on new data can be split into three parts: **bias squared + variance + irreducible noise**.

- **Bias** is error from wrong assumptions; the model is too simple and misses the true pattern. High bias leads to **underfitting**. Example: linear regression on a strongly non-linear relationship.
- **Variance** is error from sensitivity to the particular training sample; the model changes a lot if you train it on slightly different data. High variance leads to **overfitting**. Example: a very deep decision tree or 1-nearest-neighbour.
- **Noise** cannot be removed by any model.

As model complexity increases, bias falls and variance rises. The goal is the complexity where total validation error is lowest.

How common techniques move along the trade-off:

- Regularisation, pruning and early stopping **reduce variance** (adding a little bias).
- **Bagging** (random forest) mainly reduces variance by averaging many high-variance trees.
- **Boosting** mainly reduces bias by adding weak learners that fix earlier errors.
- More training data reduces variance without increasing bias.`,
          d: 'medium',
          at: 'Product companies, analytics firms',
          tip: `Connect bagging to variance and boosting to bias; it is a common follow-up.`,
        },
        {
          q: `What is k-fold cross-validation? When should you use stratified or time-series splits instead?`,
          a: `**k-fold cross-validation** splits the training data into k equal folds (often 5). The model is trained k times, each time on k-1 folds and validated on the remaining fold. The average score is a more reliable estimate than a single split, and its standard deviation shows how stable the model is.

\`\`\`python
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(RandomForestClassifier(random_state=42), X, y,
                         cv=cv, scoring="f1")
print(scores.mean(), scores.std())
\`\`\`

Variants:

- **Stratified k-fold**: keeps class proportions in each fold. Use it for classification, especially with imbalance.
- **TimeSeriesSplit**: each fold trains on earlier data and validates on later data. Use it for any time-ordered data, otherwise the model sees the future.
- **GroupKFold**: keeps all rows of one group (one customer, one patient) in the same fold, so the model is not tested on people it has already seen.

Preprocessing (scaling, imputation) must happen **inside** each fold; wrapping it in a \`Pipeline\` does this automatically.`,
          d: 'medium',
        },
        {
          q: `Explain precision, recall and F1 score. When would you prefer precision over recall?`,
          a: `From the confusion matrix (TP, FP, FN, TN):

- **Precision** = TP / (TP + FP): of the items predicted positive, how many really are?
- **Recall** = TP / (TP + FN): of the actual positives, how many did we catch?
- **F1** = 2 x precision x recall / (precision + recall): the harmonic mean, useful when you need one number that balances both.

Example: a fraud model flags 100 transactions, 80 are fraud (precision 0.8). There were 200 frauds in total, so recall = 80/200 = 0.4.

When to prefer which:

- **Precision** matters when false positives are costly: spam filtering (do not lose genuine emails), recommending a product in a push notification, flagging accounts for manual block.
- **Recall** matters when missing a positive is costly: cancer screening, fraud detection where losses are large, safety defects.

Most classifiers output a probability; moving the **decision threshold** trades precision for recall. Choose the threshold from the business cost of each error, not the default 0.5.`,
          d: 'medium',
          at: 'Product companies, fintech, service companies',
        },
        {
          q: `What is regularisation? Compare L1 (Lasso) and L2 (Ridge).`,
          a: `**Regularisation** adds a penalty on large model weights to the loss function, which discourages overly complex models and reduces overfitting.

- **L2 / Ridge**: penalty = lambda x sum of squared weights. It **shrinks all weights towards zero** but rarely makes them exactly zero. Good when many features each contribute a little, and it handles correlated features well by spreading weight among them.
- **L1 / Lasso**: penalty = lambda x sum of absolute weights. It can push weights **exactly to zero**, so it performs **feature selection** and produces sparse, interpretable models. With highly correlated features it tends to pick one arbitrarily.
- **Elastic Net** combines both.

The strength (lambda, called \`alpha\` in scikit-learn's Ridge and Lasso, and \`C\` = inverse strength in LogisticRegression) is tuned by cross-validation.

\`\`\`python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LassoCV

model = make_pipeline(StandardScaler(), LassoCV(cv=5)).fit(X_train, y_train)
\`\`\`

Scale features first; otherwise the penalty treats features with large units unfairly.`,
          d: 'medium',
        },
        {
          q: `For an imbalanced problem such as fraud (0.5% positives), why is ROC-AUC sometimes misleading, and how do you handle the imbalance?`,
          a: `**ROC-AUC** plots true positive rate against false positive rate. With 99.5% negatives, even a small FPR means a huge number of false alarms in absolute terms, yet the ROC curve still looks excellent. **PR-AUC** (precision-recall curve, or average precision) focuses on the positive class and shows that weakness, so it is usually more informative for rare-event problems. Its baseline equals the positive rate (0.005), not 0.5.

Handling imbalance:

- **Choose the right metric**: PR-AUC, recall at a fixed precision, or expected cost (missed fraud amount vs review cost). Never accuracy.
- **Class weights**: \`class_weight="balanced"\` or \`scale_pos_weight\` in XGBoost, so errors on the rare class cost more.
- **Resampling** the training set only: undersample the majority or oversample the minority (SMOTE). Never resample the validation or test set.
- **Threshold tuning**: pick the threshold that meets the business constraint, for example "the review team can handle 500 alerts per day".
- **Calibration**: if probabilities are used directly, calibrate after reweighting.
- Treat it as **anomaly detection** if positives are extremely rare or keep changing.`,
          d: 'hard',
          at: 'Fintech, banks, product companies',
          tip: `Mention the capacity-based threshold (alerts per day); it shows business thinking.`,
        },
      ],
    },
    {
      title: 'Supervised and Unsupervised Learning',
      questions: [
        {
          q: `Why is logistic regression used for classification? How does it work?`,
          a: `Logistic regression predicts the **probability** of the positive class. It computes a linear score z = w.x + b and passes it through the **sigmoid** function, sigma(z) = 1 / (1 + e^(-z)), which maps any number to between 0 and 1. A threshold (default 0.5) turns the probability into a class.

It is trained by minimising **log loss** (binary cross-entropy), which heavily penalises confident wrong predictions. Mean squared error is not used because, combined with the sigmoid, it gives a non-convex loss.

Why it is popular:

- Fast, works well as a **baseline**.
- **Interpretable**: each coefficient is the change in log-odds per unit of the feature; e^w is an odds ratio.
- Outputs reasonably calibrated probabilities.

\`\`\`python
from sklearn.linear_model import LogisticRegression
clf = LogisticRegression(max_iter=1000).fit(X_train, y_train)
proba = clf.predict_proba(X_test)[:, 1]
\`\`\`

Despite the name it is a classifier. Its decision boundary is linear, so non-linear patterns need engineered features or a different model.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `How does a decision tree decide where to split? What are Gini impurity and entropy?`,
          a: `A decision tree repeatedly picks the feature and threshold that best separate the target, making child nodes as **pure** as possible.

For classification, purity is measured by:

- **Gini impurity** = 1 - sum of p_i squared. For a node with 50% / 50% classes, Gini = 0.5; a pure node has Gini = 0.
- **Entropy** = - sum of p_i log2(p_i). 50/50 gives 1 bit; a pure node gives 0. The reduction in entropy after a split is the **information gain**.

The tree tries candidate splits, computes the weighted impurity of the children and keeps the split with the largest decrease. For regression trees, the criterion is usually the reduction in **mean squared error**.

Gini and entropy usually choose very similar splits; Gini is slightly faster (no logarithm) and is scikit-learn's default.

Trees grow until a stopping rule (\`max_depth\`, \`min_samples_leaf\`) is met. Without limits a tree overfits, which is why single trees are pruned or combined into ensembles.`,
          d: 'easy',
        },
        {
          q: `Which machine learning algorithms need feature scaling, and which do not?`,
          a: `Scaling puts features on comparable ranges: **standardisation** (mean 0, SD 1) or **min-max** scaling (0 to 1).

**Need scaling**:
- **Distance-based**: KNN, K-means, SVM with RBF kernel. Otherwise salary in rupees (lakhs) dominates age in years.
- **Gradient-descent based**: linear and logistic regression trained with gradient descent, neural networks. Scaling makes training converge faster and more stably.
- **Regularised linear models**: the penalty should treat all coefficients fairly.
- **PCA**: otherwise the components just follow the features with the largest variance in raw units.

**Do not need scaling**:
- **Tree-based models**: decision trees, random forest, gradient boosting (XGBoost, LightGBM). Splits depend on the order of values, not their scale.
- Naive Bayes in most forms.

\`\`\`python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier

model = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=7))
\`\`\`

Fit the scaler on training data only; a pipeline guarantees that.`,
          d: 'easy',
          tip: `Group the answer as "distance, gradient, penalty: yes; trees: no" to sound structured.`,
        },
        {
          q: `What are the assumptions of linear regression, and what happens if they are violated?`,
          a: `1. **Linearity**: the target is a linear function of the features. Violation causes biased predictions; fix with transformations (log, polynomial terms) or a non-linear model.
2. **Independence of errors**: residuals are not correlated with each other. Often violated in time series; standard errors become wrong.
3. **Homoscedasticity**: residuals have constant variance across fitted values. A funnel shape in the residual plot means violation; try a log transform of the target or robust standard errors.
4. **Normality of residuals**: mainly needed for valid confidence intervals and p-values with small samples, not for the predictions themselves.
5. **No strong multicollinearity**: highly correlated features make coefficients unstable and hard to interpret. Check the **variance inflation factor (VIF)**; drop or combine features or use Ridge.

How to check: plot residuals against fitted values, a Q-Q plot of residuals, and VIF values.

If the goal is pure **prediction**, mild violations matter less; judge the model on validation error. If the goal is **interpretation** ("how much does each extra bedroom add?"), the assumptions matter much more.`,
          d: 'medium',
        },
        {
          q: `Compare random forest and gradient boosting.`,
          a: `Both are ensembles of decision trees, built differently.

| | Random forest | Gradient boosting (XGBoost, LightGBM, CatBoost) |
|---|---|---|
| Building | Many deep trees trained **in parallel** on bootstrap samples with random feature subsets (**bagging**) | Shallow trees trained **sequentially**, each fitting the errors (gradients) of the current ensemble (**boosting**) |
| Mainly reduces | Variance | Bias |
| Tuning | Few sensitive parameters, works well with defaults | More parameters (learning rate, number of trees, depth); can overfit if not tuned |
| Accuracy on tabular data | Very good | Often the best, wins many tabular competitions |
| Speed | Easy to parallelise | Sequential, but modern libraries are highly optimised |

Choose **random forest** for a robust, low-effort baseline. Choose **gradient boosting** when you can tune with cross-validation and early stopping and want maximum accuracy.

Both give feature importance; for explanations of individual predictions, use **SHAP** values rather than default impurity-based importance, which is biased towards high-cardinality features.`,
          d: 'medium',
          at: 'Product companies, analytics firms',
        },
        {
          q: `How does K-means clustering work, and how do you choose K?`,
          a: `**Algorithm**:

1. Choose K and place K initial centroids (scikit-learn uses the smarter **k-means++** initialisation).
2. Assign each point to its nearest centroid.
3. Move each centroid to the mean of its assigned points.
4. Repeat steps 2 and 3 until assignments stop changing.

It minimises the **within-cluster sum of squares (inertia)**.

**Choosing K**:

- **Elbow method**: plot inertia against K and look for the bend where adding clusters stops helping much.
- **Silhouette score** (from -1 to 1): how close each point is to its own cluster compared with the nearest other cluster. Higher is better.
- **Business sense**: can the marketing team actually run five different campaigns? Are clusters interpretable?

\`\`\`python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

for k in range(2, 9):
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X_scaled)
    print(k, round(km.inertia_), round(silhouette_score(X_scaled, km.labels_), 3))
\`\`\`

Limitations: scale features first, it assumes roughly round clusters of similar size, and outliers pull centroids. DBSCAN or Gaussian mixtures suit other shapes.`,
          d: 'medium',
          tip: `Bring up business interpretability when choosing K; pure metrics rarely settle it.`,
        },
        {
          q: `What is PCA? When would you use it?`,
          a: `**Principal Component Analysis** is an unsupervised technique that creates new features, **principal components**, which are linear combinations of the original features. The first component points in the direction of maximum variance in the data, the second captures the most remaining variance while being uncorrelated (orthogonal) to the first, and so on.

Uses:

- **Dimensionality reduction**: keep the few components that explain, say, 95% of the variance, to speed up models or reduce noise.
- **Visualisation**: project high-dimensional data to 2D to look for groups.
- **Handling multicollinearity**: components are uncorrelated.

\`\`\`python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

pca_pipe = make_pipeline(StandardScaler(), PCA(n_components=0.95))
X_reduced = pca_pipe.fit_transform(X_train)
print(pca_pipe[-1].explained_variance_ratio_)
\`\`\`

Caveats: always **standardise** first; PCA captures only **linear** structure; components are hard to explain to business users; and PCA ignores the target, so the highest-variance directions are not necessarily the most predictive. For visualisation of non-linear structure, t-SNE or UMAP are common.`,
          d: 'medium',
        },
        {
          q: `Explain step by step how gradient boosting works for regression, and name its key hyperparameters.`,
          a: `Gradient boosting builds an additive model F(x) = F0 + eta x h1(x) + eta x h2(x) + ... where each h is a small tree.

For squared-error regression:

1. **Start** with a constant prediction F0 = mean of y.
2. Compute **residuals** r = y - F(x). For squared error, residuals are exactly the negative gradient of the loss; for other losses (log loss, absolute error) we use the negative gradient in general, hence "gradient" boosting.
3. **Fit a small tree** h to predict the residuals from x.
4. **Update**: F(x) = F(x) + eta x h(x), where eta is the learning rate (for example 0.05).
5. Repeat steps 2 to 4 for M rounds.

Each tree corrects what the ensemble still gets wrong, so bias falls round by round.

Key hyperparameters:

- \`n_estimators\` (rounds) and \`learning_rate\`: smaller rate needs more trees but generalises better. Use **early stopping** on a validation set to choose the number of trees.
- \`max_depth\` or \`num_leaves\`: tree complexity and how many feature interactions are captured.
- \`subsample\` and \`colsample_bytree\`: row and column sampling, which adds randomness and reduces overfitting.
- Regularisation such as \`min_child_weight\`, \`reg_lambda\` (L2) and \`reg_alpha\` (L1) in XGBoost.`,
          d: 'hard',
          at: 'Product companies',
          tip: `Say "residuals are the negative gradient of squared error"; it explains the name in one line.`,
        },
      ],
    },
    {
      title: 'Time Series, Deep Learning, NLP and GenAI',
      questions: [
        {
          q: `What makes time series data different? Explain trend, seasonality and stationarity.`,
          a: `In time series, **order matters** and observations are correlated with their own past (autocorrelation), so you cannot shuffle rows or treat them as independent.

Components:

- **Trend**: long-term increase or decrease (a growing user base).
- **Seasonality**: patterns that repeat at a fixed period: daily (lunch-time food orders), weekly (weekend spikes), yearly (Diwali sales).
- **Cycles**: longer, irregular rises and falls, such as business cycles.
- **Noise**: random variation.

A **stationary** series has constant mean, variance and autocorrelation over time. Many classical models such as ARIMA assume stationarity. You make a series stationary by **differencing** (y_t - y_(t-1)), seasonal differencing, or a log transform to stabilise variance. The **Augmented Dickey-Fuller (ADF)** test checks for a unit root (a common type of non-stationarity).

\`\`\`python
from statsmodels.tsa.seasonal import seasonal_decompose
result = seasonal_decompose(sales_series, model="additive", period=7)
result.plot()
\`\`\``,
          d: 'easy',
        },
        {
          q: `What is a neural network? Explain neurons, activation functions and backpropagation simply.`,
          a: `A **neural network** is a stack of layers of simple units called **neurons**. Each neuron computes a weighted sum of its inputs plus a bias, z = w.x + b, then applies an **activation function**.

- **Activation functions** add non-linearity; without them, many layers would collapse into one linear model. **ReLU** (max(0, z)) is the default for hidden layers; **sigmoid** gives a probability for binary output; **softmax** gives class probabilities for multi-class output.
- **Forward pass**: inputs flow through layers to produce a prediction.
- **Loss**: measures how wrong the prediction is (cross-entropy for classification, MSE for regression).
- **Backpropagation**: uses the chain rule to compute the gradient of the loss with respect to every weight, working backwards from the output.
- **Gradient descent** (or variants like **Adam**) updates each weight a small step against its gradient; the **learning rate** sets the step size.

One pass over the whole training data is an **epoch**; data is processed in **mini-batches**. Common overfitting controls are dropout, weight decay and early stopping.`,
          d: 'easy',
          at: 'Product companies, AI startups',
        },
        {
          q: `What is the difference between TF-IDF and word embeddings for representing text?`,
          a: `**TF-IDF** (term frequency x inverse document frequency) turns each document into a sparse vector with one dimension per vocabulary word. A word scores high if it is frequent in this document but rare across all documents.

- Simple, fast, interpretable, a strong baseline with logistic regression for classification.
- No notion of meaning: "cheap" and "inexpensive" are unrelated dimensions, and word order is lost.

**Embeddings** are dense vectors (for example 384 or 768 numbers) learned so that texts with similar meaning are close together.

- **Word embeddings** (Word2Vec, GloVe) give one fixed vector per word.
- **Contextual / sentence embeddings** from transformer models (BERT-style encoders, sentence-transformers, embedding APIs) represent a word or a whole sentence based on its context, so "bank" in "river bank" and "bank loan" differ.
- They power **semantic search**, clustering, recommendations and RAG.

\`\`\`python
from sklearn.feature_extraction.text import TfidfVectorizer
vec = TfidfVectorizer(ngram_range=(1, 2), min_df=2)
X = vec.fit_transform(reviews)   # sparse matrix
\`\`\`

Start with TF-IDF as a baseline; move to embeddings when meaning and synonyms matter.`,
          d: 'easy',
        },
        {
          q: `How do you validate a forecasting model? Why should you not use a random train/test split?`,
          a: `A random split lets the model train on points **after** the ones it is tested on, so it effectively sees the future and the score is over-optimistic. Forecasting must mimic real use: train on the past, predict the future.

Correct approaches:

- **Hold-out by time**: train up to March, test on April to June.
- **Rolling-origin / walk-forward validation** (\`TimeSeriesSplit\`): train on months 1 to 12 and test on 13; train on 1 to 13 and test on 14; and so on. Average the errors.
- Match the **forecast horizon**: if the business needs forecasts 4 weeks ahead, evaluate 4-week-ahead errors.

Always compare with **baselines**:

- **Naive**: tomorrow = today.
- **Seasonal naive**: next Monday = last Monday.
- Moving average.

If your model cannot beat seasonal naive, it is not adding value.

Metrics: **MAE** (easy to explain), **RMSE** (punishes big misses), **MAPE** (percentage, but breaks when actual values are near zero), or WAPE / weighted MAPE for many items. Also check bias: does the model consistently over- or under-forecast?`,
          d: 'medium',
          at: 'Retail, e-commerce, supply chain analytics',
          tip: `Name the seasonal naive baseline; many candidates forget to compare against anything.`,
        },
        {
          q: `What do the p, d and q parameters mean in an ARIMA model?`,
          a: `**ARIMA(p, d, q)** = AutoRegressive Integrated Moving Average.

- **p (AR order)**: how many past values of the series are used as predictors. AR(2): y_t depends on y_(t-1) and y_(t-2).
- **d (differencing)**: how many times the series is differenced to make it stationary. d = 1 models changes instead of levels.
- **q (MA order)**: how many past forecast errors are used as predictors.

How to choose:

- **d**: difference until the ADF test suggests stationarity (usually 0 or 1).
- **p**: the PACF (partial autocorrelation) plot cuts off after lag p.
- **q**: the ACF plot cuts off after lag q.
- Or search automatically and compare **AIC** values, as auto-ARIMA tools do.

**SARIMA(p,d,q)(P,D,Q,s)** adds seasonal terms with period s (s = 7 for daily data with weekly seasonality, 12 for monthly data with yearly seasonality). **SARIMAX** adds external regressors such as price or holidays.

\`\`\`python
from statsmodels.tsa.statespace.sarimax import SARIMAX
model = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7)).fit(disp=False)
forecast = model.forecast(steps=14)
\`\`\``,
          d: 'medium',
        },
        {
          q: `When would you use a CNN, an RNN/LSTM or a Transformer?`,
          a: `- **CNN (Convolutional Neural Network)**: learns local patterns with filters that slide over the input and share weights. Natural for **images** (classification, detection, medical scans) and also used for audio spectrograms and some 1D signals. Transfer learning from pretrained models (ResNet, EfficientNet) is the usual starting point with small datasets.
- **RNN / LSTM / GRU**: process sequences one step at a time, carrying a hidden state. LSTMs and GRUs use gates to keep longer memory than plain RNNs. Historically used for text and time series; they are hard to parallelise and still struggle with very long dependencies.
- **Transformer**: uses **self-attention** so every position looks at every other position directly, and the whole sequence is processed in parallel. It is now the standard for **NLP** and LLMs, and Vision Transformers compete with CNNs on images. Cost grows with the square of sequence length.

For tabular data, gradient boosting usually beats all three. For a small time series problem, classical models or gradient boosting with lag features are often enough; deep models pay off with many related series or rich inputs.`,
          d: 'medium',
          at: 'AI startups, product companies',
        },
        {
          q: `What is Retrieval-Augmented Generation (RAG)? When would you choose RAG over fine-tuning an LLM?`,
          a: `**RAG** gives an LLM relevant, up-to-date information at question time instead of relying only on what it memorised in training.

Pipeline:

1. **Ingest**: split documents (policies, manuals, FAQs) into chunks, create **embeddings** and store them in a vector store (FAISS, pgvector, a managed vector database).
2. **Retrieve**: embed the user's question and fetch the most similar chunks, often combined with keyword search and a re-ranker.
3. **Generate**: put the chunks in the prompt with an instruction such as "answer only from the context and cite the source".

**Choose RAG when** knowledge changes often, must be traceable to sources, or is private company data. It is cheaper to update (re-index documents) and reduces hallucination.

**Choose fine-tuning when** you need to change the model's **behaviour or format**: a consistent style, a specific output structure, a narrow classification task, or a smaller cheaper model for one job. Fine-tuning is poor at adding facts that change.

They are often combined. Evaluate RAG separately on **retrieval quality** (did we fetch the right chunk?) and **answer quality** (faithfulness to the context, correctness).`,
          d: 'medium',
          at: 'AI startups, product companies, IT services AI practices',
          tip: `Say "RAG adds knowledge, fine-tuning changes behaviour"; it is the cleanest one-line distinction.`,
        },
        {
          q: `Explain self-attention in Transformers.`,
          a: `Self-attention lets each token in a sequence build its representation by looking at all other tokens and deciding how much each one matters.

For each token embedding x, the model computes three vectors with learned weight matrices:

- **Query** Q = x W_Q: what this token is looking for.
- **Key** K = x W_K: what this token offers.
- **Value** V = x W_V: the information it passes on.

Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V

1. Dot products of a token's query with every key give relevance scores.
2. Dividing by sqrt(d_k) keeps the scores from growing too large and saturating softmax.
3. Softmax turns scores into weights that sum to 1.
4. The output is the weighted sum of value vectors.

In "The animal did not cross the street because **it** was tired", attention lets "it" put high weight on "animal".

Other key parts: **multi-head attention** runs several attentions in parallel to capture different relationships; **positional encodings** add word-order information, since attention itself ignores order; decoder models such as GPT use a **causal mask** so a token cannot attend to future tokens. Each layer also has a feed-forward network, residual connections and layer normalisation.`,
          d: 'hard',
          at: 'AI startups, product companies',
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Explain your data science capstone project end to end.`,
          a: `Structure it like a mini case study, about two minutes:

1. **Problem and why it matters**: "Predict which loan applicants are likely to default, so the bank can review risky applications manually."
2. **Data**: source, size, target definition and class balance. "50,000 applications, 8% default."
3. **Preparation**: cleaning, missing values, feature engineering (debt-to-income ratio, past delinquencies), and how you **avoided leakage**.
4. **Modelling**: baseline first (logistic regression), then the improved model (LightGBM), validation scheme (stratified 5-fold), and the metric and why (PR-AUC, recall at a review capacity).
5. **Results**: numbers against the baseline. "Recall improved from 0.52 to 0.68 at the same precision."
6. **Explainability**: top drivers with SHAP.
7. **Deployment**: a FastAPI endpoint or Streamlit app, if built.
8. **Limitations and next steps**: data bias, drift, fairness checks.

Expect deep follow-ups on any line, especially "why this metric?" and "how did you validate?". Only claim work you actually did.`,
          d: 'easy',
          at: 'All companies',
          tip: `Always mention the baseline you beat; a score without a baseline means little.`,
        },
        {
          q: `Your fraud model has 99% accuracy. Is it a good model?`,
          a: `Not necessarily. If only 1% of transactions are fraud, a model that predicts "not fraud" for everything is also **99% accurate** while catching zero fraud. Accuracy is misleading for imbalanced data.

What to check instead:

- **Confusion matrix**: how many frauds were caught (TP) and missed (FN), and how many genuine transactions were blocked (FP).
- **Recall** on the fraud class and **precision** of the alerts.
- **PR-AUC**, which focuses on the rare class.
- **Business cost**: rupees of fraud prevented versus cost of reviewing false alerts and annoying genuine customers.
- Performance on a **later time period**, because fraud patterns change.

Then say what you would do: compare with the trivial baseline, use class weights, tune the threshold to the review team's capacity, and report recall at that operating point.`,
          d: 'easy',
          at: 'Fintech, banks, service companies',
        },
        {
          q: `How would you deploy a trained scikit-learn model as a REST API?`,
          a: `Save the **whole pipeline** (preprocessing + model) so serving applies exactly the same transformations as training, then wrap it in a small web service.

\`\`\`python
# train.py
import joblib
joblib.dump(pipeline, "model.joblib")

# app.py
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
model = joblib.load("model.joblib")   # load once at startup

class Applicant(BaseModel):
    income: float
    loan_amount: float
    tenure_months: int

@app.post("/predict")
def predict(a: Applicant):
    X = pd.DataFrame([a.model_dump()])        # Pydantic v2
    proba = float(model.predict_proba(X)[0, 1])
    return {"default_probability": proba, "model_version": "v1"}
\`\`\`

Run it with \`uvicorn app:app --host 0.0.0.0 --port 8000\`.

Production steps: pin library versions (a pickled model must be loaded with the same scikit-learn version), package it in a **Docker** image, validate inputs (Pydantic does this), log requests and predictions for monitoring, add a health endpoint, and deploy to a cloud service. For large offline scoring, a **batch job** is often simpler than an API.`,
          d: 'medium',
          at: 'Product companies, AI startups',
        },
        {
          q: `What is MLOps? What is model drift and how do you monitor a model in production?`,
          a: `**MLOps** applies DevOps practices to machine learning so models can be built, deployed and maintained reliably: version control for code **and** data, experiment tracking (MLflow, Weights and Biases), automated training pipelines, a model registry, CI/CD for models, and monitoring.

**Drift** is why models decay after deployment:

- **Data drift (covariate shift)**: input distributions change. New user segments, a new app version, inflation changing order values.
- **Concept drift**: the relationship between inputs and the target changes. Fraudsters adapt; customer behaviour changed after a policy change.

Monitoring:

- **Operational**: latency, error rate, throughput.
- **Input data**: missing-value rates, schema changes, distribution shift per feature (Population Stability Index, KS test).
- **Predictions**: distribution of scores and of predicted classes.
- **Actual performance**: once true labels arrive (often weeks later for churn or default), track precision, recall or error against the baseline.

Set alerts on these, and retrain on a schedule or when drift or performance thresholds are crossed. Validate the new model against the current one before switching, ideally with a shadow deployment or A/B test.`,
          d: 'medium',
          tip: `Distinguish data drift from concept drift with one example each.`,
        },
        {
          q: `ML system design: build a churn prediction system for a telecom company.`,
          a: `**1. Clarify the goal.** Who uses the output? The retention team calls or offers discounts to high-risk customers. Define churn (port-out or no recharge in 30 days for prepaid), the prediction window (next 30 days) and capacity (they can contact 20,000 customers a month).

**2. Data and labels.** Usage (calls, data, recharge history), billing, plan changes, network quality in the customer's area, complaints, tenure, device. Build monthly **snapshots**: features up to the snapshot date, label from the following 30 days.

**3. Features.** Trends matter more than levels: drop in data usage over 4 weeks, days since last recharge, number of complaints, dropped-call rate, competitor offers in the area.

**4. Model.** Logistic regression baseline, then gradient boosting. Time-based validation. Metric: **precision in the top 20,000** (what the team can act on), plus PR-AUC.

**5. Serving.** Monthly or weekly **batch scoring** written to a table; a CRM view with risk score and top SHAP reasons.

**6. Measure impact.** Predicting churn is not the goal; preventing it is. Keep a random **control group** that receives no offer, and compare churn. Consider **uplift modelling** to target customers who will respond to an offer, not just those likely to leave.

**7. Monitor** drift and retrain monthly.`,
          d: 'hard',
          at: 'Telecom, fintech, consulting',
          tip: `End with "prediction is not the goal, retention is": the control group and uplift points impress.`,
        },
        {
          q: `ML system design: design a product recommendation system for an e-commerce home page.`,
          a: `**Goal and metric.** Increase engagement and purchases. Offline metrics: recall@K, NDCG@K. Online: click-through rate, add-to-cart, revenue per session, measured with A/B tests.

**Data.** Implicit feedback (views, clicks, add-to-cart, purchases, weighted by strength), item metadata (category, brand, price, text, images), user context (location, device, time).

**Two-stage architecture**

1. **Candidate generation** (thousands to a few hundred items, fast): several sources combined
   - Collaborative filtering: matrix factorisation or a two-tower model producing user and item embeddings, searched with approximate nearest neighbours.
   - Item-to-item "also viewed / bought together".
   - Popular and trending items in the user's city, for **cold start**.
2. **Ranking** (hundreds to top 20, accurate): a gradient boosting or neural model predicting purchase probability using user, item and context features.

**Business rules after ranking:** remove out-of-stock and already-purchased items, ensure diversity across categories, apply promotions.

**Cold start:** new users get popular and trending items plus onboarding choices; new items use content-based similarity from metadata and embeddings.

**Serving:** precompute candidates in batch, rank in real time with a feature store; log impressions to avoid feedback loops. Retrain regularly.`,
          d: 'hard',
          at: 'E-commerce, product companies',
        },
        {
          q: `Your model performed very well offline but poorly after deployment. How do you debug it?`,
          a: `Work through the most likely causes in order:

1. **Data leakage during training**: a feature that would not be available at prediction time (for example "number of support calls", recorded after the customer already churned, or a status column updated after the event). Offline scores that look too good are the warning sign. Recheck each feature's timestamp.
2. **Training-serving skew**: features computed differently in production. Different code in SQL vs Python, different time zones, missing-value handling, category encodings in a different order, or a stale feature table. Log the live feature values and compare them with training values for the same entities.
3. **Wrong validation**: a random split on time-dependent data, or the same customers in train and test. Re-evaluate with a time-based split.
4. **Drift**: the population changed since the training period (new market, new product, seasonal effect). Compare feature distributions.
5. **Feedback loops**: the model's actions changed the data it now sees.
6. **Threshold or metric mismatch**: the business evaluates a different metric or class balance than you optimised.
7. **Plain bugs**: wrong model version loaded, columns reordered, a library version difference.

Fix the root cause, add automated checks for schema and distributions, and monitor live performance.`,
          d: 'hard',
          at: 'Product companies, fintech',
          tip: `Lead with leakage and training-serving skew; they cause most "great offline, bad online" stories.`,
        },
        {
          q: `ML case: forecast daily demand for each product in each store for a grocery chain.`,
          a: `**Clarify.** Forecast horizon (next 7 to 14 days, to drive replenishment), granularity (store x product x day: possibly millions of series), and what a wrong forecast costs: stock-outs lose sales; over-stock causes waste for perishables. Costs are asymmetric, so consider forecasting a high quantile, not just the mean.

**Data.** Sales history (note that sales are censored by stock-outs: zero sales may mean no stock), prices and promotions, holidays and festivals, weather, store attributes, product category, new product launches.

**Approach.**

- **Baselines**: seasonal naive (same weekday last week), moving averages.
- **Global gradient boosting model** (LightGBM) trained across all series with features: lags (7, 14, 28 days), rolling means, day of week, holiday flags, price and promotion, store and item IDs. A single global model learns shared patterns and handles thousands of series well.
- Classical per-series models (ETS, ARIMA) for a few important items, or as a comparison.
- **Intermittent demand** (many zeros) for slow movers needs special handling, such as Croston-style methods or zero-inflated targets.

**Validation.** Walk-forward backtests at the real horizon; metric WAPE at store-category level, plus bias.

**Deployment.** Nightly batch forecasts feeding the ordering system, with monitoring of error and overrides from store managers for known events.`,
          d: 'hard',
          at: 'Retail, e-commerce, supply chain analytics',
        },
      ],
    },
  ],
};

export default book;
