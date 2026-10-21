import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content for Data Science + AI. The track stands on Data Analytics + AI's SQL, pandas,
 * cleaning, EDA and statistics packs and Year 1's introduction to machine learning; these topics add
 * the machine learning a data scientist is hired for, then deep learning, NLP and GenAI, deployment and
 * the capstone. Skills are the AI_ML domain of the role catalogue (aiDataSecuritySkills.ts).
 *
 * Practice runs in notebooks with scikit-learn; the auto-graded exercises are plain Python (the grader
 * has no NumPy or scikit-learn), which suits implementing an algorithm from scratch.
 */

/** Batch S1: maths for ML, the ML workflow, regression and classification. */
export const TRACK_DS_S1: Record<string, TopicSeed> = {
  /* ── The maths machine learning uses ── */
  DS_MATH_ML: { category: 'UNIVERSAL', units: [
    u('VECTORS_MATRICES', 'Vectors and Matrices as Data', 'A row as a vector, a dataset as a matrix, dot products, matrix multiplication and norms — in NumPy, with what each means for a model.',
      ['Represent data as vectors and matrices and compute dot products and matrix products in NumPy'], 45),
    u('DERIVATIVES_GRADIENTS', 'Derivatives and Gradients, Intuitively', 'Slope as rate of change, derivatives of the functions models use, partial derivatives and the gradient as "which way is downhill".',
      ['Explain a derivative and a gradient and compute them for simple loss functions'], 40, { after: ['VECTORS_MATRICES'] }),
    u('GRADIENT_DESCENT', 'Loss Functions and Gradient Descent', 'Mean squared error and log loss, stepping against the gradient, the learning rate, and gradient descent written by hand.',
      ['Implement gradient descent for a simple model and choose a learning rate that converges'], 50, { after: ['DERIVATIVES_GRADIENTS'] }),
    u('PROBABILITY_FOR_ML', 'Probability for Machine Learning', 'Likelihood, Bayes’ rule as a classifier, distributions a model assumes, and predicting a probability rather than a label.',
      ['Use likelihood and Bayes’ rule to reason about what a classifier predicts'], 40, { after: ['GRADIENT_DESCENT'] }),
    ...ending('Maths for ML', 'PROBABILITY_FOR_ML', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── The ML workflow ── */
  DS_ML_WORKFLOW: { category: 'UNIVERSAL', units: [
    u('FRAMING', 'Framing a Machine Learning Problem', 'Is ML the right tool, the target and the features, regression vs classification, and the business metric the model must move.',
      ['Frame a business problem as an ML task with a target, features and a success metric — or say ML is the wrong tool'], 40),
    u('SPLITS_LEAKAGE', 'Train, Validation and Test Splits — and Leakage', 'Why a model is judged on data it never saw, time-based splits, group splits, and the leaks that make a model look brilliant.',
      ['Split data correctly for the problem and find a leak in a feature set'], 45, { after: ['FRAMING'] }),
    u('BASELINES', 'Baselines First', 'Dummy models, simple rules and last-value forecasts — the number every model has to beat.',
      ['Build a baseline and judge a model against it'], 30, { after: ['SPLITS_LEAKAGE'] }),
    u('SKLEARN_API', 'The scikit-learn API', 'Estimators, fit, predict and transform, hyperparameters vs learned parameters, and reading the documentation.',
      ['Train, predict with and inspect a scikit-learn model'], 40, { after: ['BASELINES'] }),
    u('PIPELINES', 'Pipelines and ColumnTransformer', 'Preprocessing and model as one object, different steps for numeric and categorical columns, and why it prevents leakage.',
      ['Build a scikit-learn Pipeline with a ColumnTransformer that preprocesses without leaking'], 45, { after: ['SKLEARN_API'] }),
    u('CROSS_VALIDATION', 'Cross-Validation and Hyperparameter Search', 'k-fold and stratified CV, GridSearchCV and RandomizedSearchCV, and keeping the test set untouched until the end.',
      ['Tune a model with cross-validated search and report an honest test score'], 45, { after: ['PIPELINES'] }),
    u('BIAS_VARIANCE', 'Overfitting, Underfitting and Bias–Variance', 'Training vs validation error, learning and validation curves, model complexity, and what more data does and does not fix.',
      ['Diagnose over- and underfitting from learning curves and choose the fix'], 40, { after: ['CROSS_VALIDATION'], skillKeys: ['ML_OVERFITTING'] }),
    ...ending('the ML Workflow', 'BIAS_VARIANCE', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── Regression ── */
  DS_REGRESSION: { category: 'UNIVERSAL', units: [
    u('LINEAR_REGRESSION', 'Linear Regression', 'Fitting a line by least squares, coefficients and what they mean, and the closed form vs gradient descent.',
      ['Fit and interpret a linear regression'], 45),
    u('MULTIPLE_REGRESSION', 'Multiple Regression and Its Assumptions', 'Several features, scaling, multicollinearity, residual plots and what the assumptions protect.',
      ['Fit a multiple regression, check its residuals and interpret coefficients with care'], 45, { after: ['LINEAR_REGRESSION'] }),
    u('REGULARISATION', 'Regularisation: Ridge, Lasso and Elastic Net', 'Penalising large coefficients, choosing alpha by cross-validation, and lasso as feature selection.',
      ['Regularise a regression and choose its strength by cross-validation'], 40, { after: ['MULTIPLE_REGRESSION'] }),
    u('REGRESSION_METRICS', 'Measuring a Regression Model', 'MAE, RMSE, R² and MAPE, which to report to whom, and errors on the original scale after a log transform.',
      ['Choose and interpret regression metrics for a business audience'], 35, { after: ['REGULARISATION'] }),
    u('NONLINEAR_REGRESSION', 'When the Relationship Is Not a Line', 'Polynomial features, interactions, and decision trees for regression.',
      ['Model a non-linear relationship and say what it costs in interpretability'], 40, { after: ['REGRESSION_METRICS'] }),
    ...ending('Regression', 'NONLINEAR_REGRESSION', { project: ['MINI_PROJECT', 'Mini Project — Predicting House Prices in Bengaluru', 'Clean a property-listings dataset, engineer area and location features, build a baseline, a regularised linear model and a tree model in pipelines, compare them with cross-validation, and report test error in ₹ with the features that drive price.'] }),
  ] },

  /* ── Classification ── */
  DS_CLASSIFICATION: { category: 'UNIVERSAL', units: [
    u('LOGISTIC_REGRESSION', 'Logistic Regression', 'The sigmoid, log loss, coefficients as odds, and a probability for every prediction.',
      ['Fit and interpret a logistic regression classifier'], 45),
    u('KNN_NAIVE_BAYES', 'k-Nearest Neighbours and Naive Bayes', 'Classifying by similarity, why scaling matters for kNN, and Naive Bayes for text.',
      ['Apply kNN and Naive Bayes and explain when each works'], 40, { after: ['LOGISTIC_REGRESSION'] }),
    u('DECISION_TREES', 'Decision Trees', 'Splits, Gini and entropy, depth and pruning, and reading a tree as rules.',
      ['Train a decision tree, control its depth, and read its rules'], 45, { after: ['KNN_NAIVE_BAYES'] }),
    u('IMBALANCE', 'Imbalanced Classes', 'Why 99% accuracy can be useless, class weights, resampling, and stratified splits.',
      ['Handle a heavily imbalanced target without fooling yourself'], 40, { after: ['DECISION_TREES'] }),
    u('THRESHOLDS', 'Probabilities and Thresholds', 'Turning a probability into a decision, the cost of each kind of error, and choosing a threshold for the business.',
      ['Choose a classification threshold from the costs of false positives and false negatives'], 40, { after: ['IMBALANCE'] }),
    ...ending('Classification', 'THRESHOLDS', { project: ['MINI_PROJECT', 'Mini Project — Predicting Customer Churn for a Telecom', 'Build a churn model for a telecom operator’s prepaid customers: framing, leakage checks, a baseline, logistic regression and a tree in pipelines, class imbalance handled, a threshold chosen from retention-offer costs, and a one-page summary for the retention team.'] }),
  ] },
};
