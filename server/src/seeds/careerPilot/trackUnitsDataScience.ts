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

/** Batch S2: ensembles, evaluation and interpretability, feature engineering, and unsupervised learning. */
export const TRACK_DS_S2: Record<string, TopicSeed> = {
  /* ── Ensembles ── */
  DS_ENSEMBLES: { category: 'UNIVERSAL', units: [
    u('BAGGING_FORESTS', 'Bagging and Random Forests', 'Many trees on bootstrapped samples, random feature subsets, out-of-bag error, and why averaging reduces variance.',
      ['Train and tune a random forest and explain why it beats a single tree'], 45),
    u('BOOSTING', 'Boosting: Learning from Mistakes', 'Gradient boosting as adding small trees that fix the residuals, learning rate and number of trees, and AdaBoost in brief.',
      ['Explain gradient boosting and train a boosted model with scikit-learn'], 45, { after: ['BAGGING_FORESTS'] }),
    u('XGBOOST_LIGHTGBM', 'XGBoost and LightGBM', 'The libraries that win on tables, their key parameters, categorical support, and the scikit-learn-style API.',
      ['Train XGBoost and LightGBM models and set their key parameters sensibly'], 45, { after: ['BOOSTING'] }),
    u('TUNING_EARLY_STOPPING', 'Tuning Ensembles and Early Stopping', 'Which parameters matter, randomised search, early stopping on a validation set, and not overfitting the validation set.',
      ['Tune a boosted model efficiently with early stopping and honest validation'], 40, { after: ['XGBOOST_LIGHTGBM'] }),
    u('CHOOSING_MODELS', 'Choosing a Model for Tabular Data', 'Linear vs trees vs boosting, interpretability vs accuracy, training cost, and stacking — and when the simple model wins.',
      ['Choose a model family for a tabular problem and justify it'], 35, { after: ['TUNING_EARLY_STOPPING'] }),
    ...ending('Ensembles', 'CHOOSING_MODELS', { project: ['MINI_PROJECT', 'Mini Project — Loan Default Prediction for an NBFC', 'Predict default on personal loans for a non-banking finance company: leakage checks, a logistic baseline, a random forest and a tuned LightGBM with early stopping, comparison on PR-AUC, and a short note on which applicants the model would decline and why.'] }),
  ] },

  /* ── Evaluation and interpretability ── */
  DS_EVALUATION: { category: 'UNIVERSAL', units: [
    u('CLASSIFIER_METRICS', 'Classifier Metrics in Depth', 'Precision, recall and F1, ROC-AUC vs PR-AUC, which to use when positives are rare, and the confusion matrix as money.',
      ['Choose and interpret the right classifier metric for an imbalanced business problem'], 45),
    u('LIFT_GAINS', 'Lift, Gains and Business Value', 'Ranking customers by score, lift and cumulative gains charts, and turning model quality into rupees.',
      ['Explain a model’s value to the business with lift, gains and expected profit'], 40, { after: ['CLASSIFIER_METRICS'] }),
    u('CALIBRATION', 'Calibration: Can You Trust the Probability?', 'Reliability curves, Brier score, Platt and isotonic calibration, and when calibrated probabilities matter.',
      ['Check and fix a model’s calibration'], 40, { after: ['LIFT_GAINS'] }),
    u('VALIDATION_STRATEGY', 'Validation Strategy', 'Time-series splits, group k-fold, nested cross-validation, and a validation set that looks like the future.',
      ['Design a validation strategy that matches how the model will be used'], 40, { after: ['CALIBRATION'] }),
    u('INTERPRETABILITY', 'Explaining a Model', 'Permutation importance, partial dependence, SHAP values for one prediction and for the model, and their traps.',
      ['Explain what drives a model overall and for one prediction, and say where the explanation misleads'], 45, { after: ['VALIDATION_STRATEGY'] }),
    u('ERROR_ANALYSIS', 'Error Analysis and Fairness', 'Where the model is wrong, slicing errors by segment, fairness across groups, and what to do about a model that fails one group.',
      ['Find where a model fails by segment and check it for unfair errors'], 40, { after: ['INTERPRETABILITY'] }),
    ...ending('Model Evaluation', 'ERROR_ANALYSIS', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── Feature engineering ── */
  DS_FEATURE_ENG: { category: 'UNIVERSAL', units: [
    u('ENCODING', 'Encoding Categories', 'One-hot, ordinal and target encoding, high-cardinality columns, and target encoding without leaking the label.',
      ['Encode categorical features correctly, including high-cardinality ones, without leakage'], 45),
    u('SCALING_TRANSFORMS', 'Scaling, Transforms and Binning', 'Standard and robust scaling, log and power transforms for skewed features, and when binning helps.',
      ['Scale and transform numeric features for the model that will use them'], 35, { after: ['ENCODING'] }),
    u('DATES_TEXT', 'Features from Dates and Text', 'Day of week, recency and seasonality from timestamps, and bag-of-words and TF-IDF from text.',
      ['Engineer useful features from dates and short text'], 40, { after: ['SCALING_TRANSFORMS'] }),
    u('MISSING_IN_MODELS', 'Missing Values Inside a Model', 'Imputers in pipelines, missing-indicator features, and models that handle missing values themselves.',
      ['Handle missing values inside a pipeline so training and prediction agree'], 35, { after: ['DATES_TEXT'] }),
    u('AGGREGATES', 'Aggregate Features from Transactions', 'Customer-level counts, sums, recency and trends from event tables — computed only from data before the prediction date.',
      ['Build customer-level features from transactions without using the future'], 45, { after: ['MISSING_IN_MODELS'] }),
    u('FEATURE_SELECTION', 'Feature Selection', 'Filter, wrapper and model-based selection, and why selecting features before the split leaks.',
      ['Select features inside cross-validation and explain why outside it leaks'], 35, { after: ['AGGREGATES'] }),
    ...ending('Feature Engineering', 'FEATURE_SELECTION', { minutes: [40, 60, 35, 40] }),
  ] },

  /* ── Unsupervised learning ── */
  DS_UNSUPERVISED: { category: 'UNIVERSAL', units: [
    u('KMEANS', 'k-Means Clustering', 'Centroids and assignments, choosing k with the elbow and silhouette, scaling, and what k-means assumes.',
      ['Cluster data with k-means, choose k, and know when its assumptions fail'], 45),
    u('HIERARCHICAL_DBSCAN', 'Hierarchical Clustering and DBSCAN', 'Dendrograms and linkage, density-based clusters, noise points, and clusters that are not round.',
      ['Choose between k-means, hierarchical clustering and DBSCAN for a dataset'], 40, { after: ['KMEANS'] }),
    u('PCA', 'Dimensionality Reduction with PCA', 'Principal components, explained variance, PCA for visualisation and compression, and what it throws away.',
      ['Reduce dimensions with PCA and interpret explained variance'], 45, { after: ['HIERARCHICAL_DBSCAN'] }),
    u('SEGMENTATION', 'Customer Segmentation in Practice', 'RFM features, clustering customers, naming and profiling segments, and checking that segments are stable and useful.',
      ['Segment customers and turn clusters into profiles a marketing team can use'], 45, { after: ['PCA'] }),
    u('ANOMALY_DETECTION', 'Anomaly Detection', 'Isolation Forest, distance- and density-based scores, choosing a contamination rate, and checking flagged cases with people.',
      ['Flag unusual records with an anomaly detector and validate what it flags'], 40, { after: ['SEGMENTATION'] }),
    ...ending('Unsupervised Learning', 'ANOMALY_DETECTION', { project: ['MINI_PROJECT', 'Mini Project — Segmenting Customers of a Retail Chain', 'Build RFM and basket features for a retail chain’s loyalty members, cluster them, choose and defend k, profile and name each segment, check stability across months, and recommend one action per segment.'] }),
  ] },
};

/** Batch S3: time series and forecasting, deep learning, and NLP and generative AI for data science. */
export const TRACK_DS_S3: Record<string, TopicSeed> = {
  /* ── Time series and forecasting ── */
  DS_TIME_SERIES: { category: 'UNIVERSAL', units: [
    u('TS_BASICS', 'Time Series: Trend, Seasonality and Stationarity', 'What makes time data different, decomposition, weekly and festival seasonality, autocorrelation and stationarity.',
      ['Decompose a time series and describe its trend, seasonality and autocorrelation'], 45),
    u('BASELINE_FORECASTS', 'Baseline Forecasts', 'Naive, seasonal-naive and moving-average forecasts — the numbers every forecasting model must beat.',
      ['Build baseline forecasts and use them as the bar for any model'], 35, { after: ['TS_BASICS'] }),
    u('ETS_ARIMA', 'Exponential Smoothing and ARIMA', 'Holt-Winters, ARIMA and SARIMA in statsmodels, choosing orders, and reading the residuals.',
      ['Fit exponential-smoothing and ARIMA models and judge them by their residuals and errors'], 50, { after: ['BASELINE_FORECASTS'] }),
    u('ML_FORECASTING', 'Forecasting with Machine Learning', 'Lag and rolling features, calendar and holiday features, gradient boosting for many series, and never using the future.',
      ['Turn forecasting into supervised learning with lag features, without leaking the future'], 45, { after: ['ETS_ARIMA'] }),
    u('FORECAST_EVALUATION', 'Evaluating Forecasts', 'MAE, MAPE and its traps, weighted errors, rolling-origin backtests, and prediction intervals.',
      ['Backtest a forecast honestly and report its error and uncertainty'], 40, { after: ['ML_FORECASTING'] }),
    ...ending('Time Series', 'FORECAST_EVALUATION', { project: ['MINI_PROJECT', 'Mini Project — Forecasting Daily Orders for a Cloud Kitchen', 'Forecast the next 28 days of orders for each outlet of a cloud-kitchen brand: baselines, a seasonal model and a gradient-boosted model with lag and festival features, a rolling backtest, prediction intervals, and a staffing recommendation.'] }),
  ] },

  /* ── Deep learning ── */
  DS_DEEP_LEARNING: { category: 'UNIVERSAL', units: [
    u('NEURONS_LAYERS', 'Neurons, Layers and Activations', 'A neuron as weighted sum plus activation, multilayer networks, ReLU, sigmoid and softmax, and why depth helps.',
      ['Explain how a multilayer network turns inputs into a prediction'], 40),
    u('BACKPROP', 'How a Network Learns: Backpropagation', 'Loss, gradients flowing backwards through layers, the chain rule as intuition, and mini-batch gradient descent.',
      ['Explain backpropagation and mini-batch training without the heavy algebra'], 40, { after: ['NEURONS_LAYERS'] }),
    u('PYTORCH_BASICS', 'PyTorch Basics', 'Tensors, autograd, nn.Module, a DataLoader, and the training loop written out step by step.',
      ['Build and train a small network in PyTorch with a clear training loop'], 50, { after: ['BACKPROP'], skillKeys: ['DL_TRAINING'] }),
    u('TRAINING_WELL', 'Training Networks Well', 'Optimisers and learning rates, batch size, overfitting, dropout and weight decay, early stopping, and reading loss curves.',
      ['Diagnose and fix a network that will not train or that overfits'], 45, { after: ['PYTORCH_BASICS'], skillKeys: ['DL_TRAINING'] }),
    u('CNN_TRANSFER', 'Images: CNNs and Transfer Learning', 'Convolutions and pooling as intuition, and fine-tuning a pretrained image model on a small dataset.',
      ['Fine-tune a pretrained image model and explain why transfer learning works'], 45, { after: ['TRAINING_WELL'] }),
    u('SEQUENCES', 'Sequences: From RNNs to Transformers', 'Why order matters, RNNs and LSTMs in brief, attention, and why transformers took over.',
      ['Explain how sequence models evolved to transformers and what attention does'], 40, { after: ['CNN_TRANSFER'] }),
    ...ending('Deep Learning', 'SEQUENCES', { project: ['MINI_PROJECT', 'Mini Project — Classifying Product Images with Transfer Learning', 'Fine-tune a pretrained image model to sort an e-commerce seller’s product photos into categories: a train/validation split by product, augmentation, a frozen-then-unfrozen schedule, a confusion matrix, and the misclassified images explained.'] }),
  ] },

  /* ── NLP and generative AI for data science ── */
  DS_NLP_GENAI: { category: 'UNIVERSAL', units: [
    u('TEXT_PREP', 'Working with Text', 'Tokenisation, cleaning without destroying meaning, Hinglish and mixed scripts, and TF-IDF with a linear model as the baseline.',
      ['Prepare text and build a TF-IDF baseline classifier'], 40),
    u('EMBEDDINGS', 'Embeddings and Similarity', 'Word and sentence embeddings, cosine similarity, semantic search and clustering of text.',
      ['Use sentence embeddings for similarity, search and clustering'], 45, { after: ['TEXT_PREP'], skillKeys: ['VECTOR_EMBEDDINGS'] }),
    u('TRANSFORMERS', 'Transformers and Hugging Face', 'Attention as intuition, encoder vs decoder models, tokenizers, and Hugging Face pipelines for classification and extraction.',
      ['Run and explain transformer models for text tasks with Hugging Face'], 45, { after: ['EMBEDDINGS'] }),
    u('FINE_TUNE_OR_PROMPT', 'Fine-Tune, Prompt or Train from Scratch?', 'When a TF-IDF model is enough, when to fine-tune a small transformer, when to prompt an LLM, and what each costs.',
      ['Choose between a classic model, a fine-tuned transformer and a prompted LLM for a text task'], 40, { after: ['TRANSFORMERS'] }),
    u('LLMS_FOR_DS', 'LLMs in a Data Scientist’s Work', 'Zero- and few-shot labelling, structured extraction, synthetic data and its risks, and evaluating an LLM against a labelled set.',
      ['Use an LLM for labelling or extraction and measure it against a labelled sample'], 45, { after: ['FINE_TUNE_OR_PROMPT'] }),
    u('RAG_BASICS', 'Retrieval-Augmented Generation, Briefly', 'Answering from your own documents: chunking, embedding, retrieving and grounding — and how a data scientist evaluates it.',
      ['Explain RAG and evaluate a simple retrieval-augmented answerer'], 40, { after: ['LLMS_FOR_DS'] }),
    ...ending('NLP and GenAI', 'RAG_BASICS', { project: ['MINI_PROJECT', 'Mini Project — Classifying Support Tickets Three Ways', 'Classify a fintech app’s support tickets with a TF-IDF model, a fine-tuned small transformer and a prompted LLM; compare accuracy, cost per thousand tickets and latency on the same held-out set; and recommend one with reasons.'] }),
  ] },
};

/** Batch S4: putting a model into use — deployment and MLOps basics — and the capstone. */
export const TRACK_DS_S4: Record<string, TopicSeed> = {
  /* ── Deployment and MLOps basics ── */
  DS_DEPLOYMENT: { category: 'UNIVERSAL', units: [
    u('SAVING_MODELS', 'Saving and Loading Models Safely', 'joblib, pickle and why loading one is running code, skops, saving the whole pipeline, and pinning library versions.',
      ['Save and reload a full pipeline safely and reproducibly'], 35),
    u('SERVING_API', 'Serving a Model with FastAPI', 'A prediction endpoint, validating input with Pydantic, loading the model once, batch vs single predictions, and testing it.',
      ['Serve a trained pipeline behind a validated FastAPI endpoint and test it'], 45, { after: ['SAVING_MODELS'] }),
    u('STREAMLIT_DEMO', 'A Demo App with Streamlit', 'Inputs, a prediction and an explanation on one page, caching the model, and what a demo is not.',
      ['Build a Streamlit demo of a model for a non-technical audience'], 35, { after: ['SERVING_API'] }),
    u('EXPERIMENT_TRACKING', 'Experiment Tracking with MLflow', 'Logging parameters, metrics and artefacts, comparing runs, and registering the model you ship.',
      ['Track experiments with MLflow and choose a model to ship from logged runs'], 40, { after: ['STREAMLIT_DEMO'], skillKeys: ['EXPERIMENT_TRACKING'] }),
    u('MONITORING_DRIFT', 'Monitoring and Drift', 'Data drift and concept drift, PSI and distribution checks, delayed labels, and when to retrain.',
      ['Monitor a deployed model for drift and decide when it needs retraining'], 40, { after: ['EXPERIMENT_TRACKING'], skillKeys: ['MODEL_MONITORING'] }),
    u('DOCKER_CLOUD', 'Packaging and Deploying', 'A Docker image for the API, configuration from the environment, deploying to a cloud host, and a health check.',
      ['Containerise a model API and deploy it with configuration kept out of the code'], 40, { after: ['MONITORING_DRIFT'] }),
    ...ending('Model Deployment', 'DOCKER_CLOUD', { project: ['MINI_PROJECT', 'Mini Project — Deploying the Churn Model', 'Take the churn model from S1: track the experiments in MLflow, save the chosen pipeline, serve it with FastAPI and Pydantic validation, add tests and a Streamlit demo, containerise it, and write a monitoring plan with drift checks and a retraining rule.'] }),
  ] },

  /* ── The capstone ── */
  DS_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: Problem, Data and Plan', 'A real prediction problem from lending, retail, health or agriculture: the question, the data, the metric that matters to the business, and a plan.',
      ['Scope an end-to-end ML project and write a plan you can deliver in the time'], 45),
    u('BUILD_MODEL', 'Capstone Build — The Model', 'Data preparation, features without leakage, a baseline, two or three model families, honest validation, interpretation and error analysis.',
      ['Deliver a validated, interpreted model that beats a baseline on the metric that matters'], 300, { unitType: 'PROJECT', after: ['BRIEF'] }),
    u('BUILD_DEPLOY_AI', 'Capstone Build — Deployment and the GenAI Feature', 'The model behind an API with a demo, experiment tracking, a monitoring plan, and one GenAI feature that earns its place — measured.',
      ['Deploy the model and add a measured GenAI feature to the product'], 240, { unitType: 'PROJECT', after: ['BUILD_MODEL'], skillKeys: ['MODEL_DEPLOYMENT', 'DL_TRANSFORMERS'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A ten-minute presentation, the model card, and the questions a panel asks about data, leakage, metrics, fairness and deployment.',
      ['Present the capstone and defend every modelling decision under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_DEPLOY_AI'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show data-science judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};
