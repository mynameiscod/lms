import { SeedBook } from '../types';

/**
 * MLOps Engineer interview questions: the ML basics an MLOps fresher must know, then the
 * engineering around models — containers, CI/CD, pipelines, versioning, tracking, serving,
 * monitoring and deploying LLM applications. Code is Python 3, bash and YAML.
 */
const book: SeedBook = {
  slug: 'track-mlops',
  title: 'MLOps Engineer Interview Questions',
  kind: 'topic',
  subject: 'MLOps Engineer',
  description: 'The 40 questions MLOps freshers face: ML basics, Docker and CI/CD for models, pipelines, DVC and MLflow, model serving, drift monitoring and deploying LLM apps.',
  color: '#b45309',
  emblem: '⚙️',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['MLOPS'],
  order: 209,
  chapters: [
    {
      title: 'ML foundations for MLOps',
      questions: [
        {
          q: `What is MLOps and how is it different from DevOps?`,
          a: `**MLOps** is the set of practices that take a machine learning model from a notebook to a reliable production service and keep it healthy there. It borrows from DevOps (automation, CI/CD, monitoring, infrastructure as code) but adds problems that normal software does not have:

- **Data is an input to the build.** The same code with different data gives a different model, so data must be versioned too.
- **Experiments.** Many training runs with different parameters must be tracked and compared.
- **Models decay.** Software does not get worse by itself, but a model does when real-world data changes (drift), so it needs monitoring and retraining.
- **Testing is wider.** Besides unit tests you test data quality and model quality (accuracy thresholds, bias checks).

In short: DevOps ships code; MLOps ships **code + data + model** and keeps the model accurate over time.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Say "code + data + model" and mention drift; that shows you know why MLOps exists.`,
        },
        {
          q: `Explain the typical machine learning lifecycle end to end.`,
          a: `1. **Problem framing** – define the business goal and a measurable metric (e.g. reduce churn, measured by recall on churners).
2. **Data collection and validation** – pull data, check schema, missing values and ranges.
3. **Feature engineering** – clean, encode and scale data into features.
4. **Training** – fit candidate models, tune hyperparameters.
5. **Evaluation** – compare on a held-out test set against a baseline and an acceptance threshold.
6. **Registration** – store the chosen model with its version, metrics and lineage in a model registry.
7. **Deployment** – serve it as a batch job, REST API or streaming consumer.
8. **Monitoring** – track latency, errors, input drift and (when labels arrive) accuracy.
9. **Retraining** – triggered on a schedule or when monitoring shows decay, which loops back to step 2.

MLOps is about automating steps 2–9 so a model can be retrained and redeployed safely without manual notebook work.`,
          d: 'easy',
        },
        {
          q: `What is the difference between training, validation and test sets? What is data leakage?`,
          a: `- **Training set** – data the model learns from.
- **Validation set** – used during development to tune hyperparameters and pick the best model.
- **Test set** – touched only once at the end to estimate real-world performance.

**Data leakage** is when information that would not be available at prediction time sneaks into training, so offline scores look great but production results are poor. Common causes:

- Scaling or imputing using statistics from the **whole** dataset before splitting.
- A feature that is derived from the target (e.g. "refund_issued" when predicting complaints).
- Random splits on time-series data, so the model trains on the future.

\`\`\`python
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = Pipeline([("scale", StandardScaler()), ("clf", LogisticRegression())])
model.fit(X_train, y_train)   # scaler learns only from training data
\`\`\``,
          d: 'easy',
          tip: `Putting preprocessing inside a Pipeline is the standard answer to "how do you avoid leakage?"`,
        },
        {
          q: `Which metrics would you use for a classification model and why is accuracy not always enough?`,
          a: `Accuracy is misleading on **imbalanced data**. If 1% of transactions are fraud, a model that always says "not fraud" is 99% accurate and useless.

- **Precision** = TP / (TP + FP): of the items flagged positive, how many really were. Important when false alarms are costly (spam filter).
- **Recall** = TP / (TP + FN): of all real positives, how many we caught. Important when misses are costly (fraud, disease).
- **F1 score** – harmonic mean of precision and recall, one number for imbalanced problems.
- **ROC-AUC** – how well the model ranks positives above negatives across all thresholds.
- **Confusion matrix** – the raw TP/FP/TN/FN counts.

For regression you would use MAE, RMSE or R².

In MLOps these metrics become **gates**: a pipeline only registers or promotes a model if, for example, recall ≥ 0.85 and it beats the current production model.`,
          d: 'easy',
          at: 'Product companies, service companies',
        },
        {
          q: `What are overfitting and underfitting, and how do you detect them in a pipeline?`,
          a: `- **Overfitting** – the model memorises training data, including noise. Training score is high, validation score is much lower.
- **Underfitting** – the model is too simple to capture the pattern. Both training and validation scores are low.

**Detecting it automatically:** log both training and validation metrics for every run (e.g. to MLflow) and add a check that fails or warns when the gap is too large.

**Fixes for overfitting:** more data, regularisation (L1/L2), simpler model, fewer features, early stopping, dropout for neural networks, cross-validation for model selection.

**Fixes for underfitting:** a more complex model, better features, less regularisation, training longer.

\`\`\`python
train_acc = model.score(X_train, y_train)
val_acc = model.score(X_val, y_val)
if train_acc - val_acc > 0.10:
    raise ValueError(f"Possible overfitting: train={train_acc:.2f}, val={val_acc:.2f}")
\`\`\``,
          d: 'medium',
        },
        {
          q: `How do you make a training run reproducible?`,
          a: `Reproducible means someone else can rerun training later and get the same model (or one within a tiny tolerance). You need to pin every input:

1. **Code** – a Git commit hash.
2. **Data** – a version of the dataset (DVC hash, a dated snapshot, or a table version), never "whatever is in the bucket today".
3. **Environment** – pinned library versions (\`requirements.txt\` with exact versions or a lock file) and ideally a Docker image.
4. **Randomness** – fixed seeds for Python, NumPy and the framework.
5. **Configuration** – hyperparameters in a config file that is versioned, not typed in a notebook.
6. **Record it** – log all of the above with the run in an experiment tracker.

\`\`\`python
import random, numpy as np
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
# torch.manual_seed(SEED) if you use PyTorch
\`\`\`

GPU training can still be slightly non-deterministic, so teams accept a small metric tolerance.`,
          d: 'medium',
          tip: `List code, data, environment, seed, config; interviewers want the data part most.`,
        },
        {
          q: `What is the difference between batch inference and online (real-time) inference?`,
          a: `- **Batch inference** – the model scores a large set of records on a schedule (e.g. every night) and writes predictions to a table. Example: next-day churn scores for every customer. It is cheap, simple, tolerant of slow models, and easy to retry.
- **Online inference** – the model sits behind an API and answers each request in milliseconds. Example: fraud check during payment, product recommendations on page load. It needs low latency, autoscaling, and features available at request time.
- **Streaming inference** is in between: the model consumes events from a queue like Kafka and scores them continuously.

How to choose: if the business can wait hours for the answer, prefer batch; it is far easier to operate. Choose online only when the decision must be made while the user waits. A common mistake is building a real-time API when a nightly job would do.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `What is training–serving skew and how do feature stores help?`,
          a: `**Training–serving skew** is when the features the model sees in production differ from what it saw in training, even though the "same" feature name is used. Causes:

- Feature code written twice: once in Pandas for training, again in Java or SQL for the API, with small differences (rounding, time zones, missing-value handling).
- Training used values computed with future data that are not available at request time.
- Different data sources for offline and online.

The model's accuracy silently drops and no error is raised.

**Feature stores** (e.g. Feast, or managed ones on cloud platforms) define each feature **once** and serve it two ways: an **offline store** for building training sets with point-in-time correct joins, and a low-latency **online store** for serving. Because both read from one definition, the logic cannot drift apart.

Other defences: package preprocessing with the model (scikit-learn \`Pipeline\`), and log production inputs to compare with training distributions.`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'Linux, Docker and CI/CD for ML',
      questions: [
        {
          q: `Which Linux commands do you use most when debugging a model server or training job?`,
          a: `- \`ps aux | grep python\` / \`top\` / \`htop\` – is the process running, how much CPU and memory.
- \`nvidia-smi\` – GPU usage and memory on GPU machines.
- \`df -h\` and \`du -sh *\` – disk full (very common with checkpoints and Docker images).
- \`free -h\` – available RAM; out-of-memory kills show up in \`dmesg\`.
- \`tail -f app.log\` and \`grep -i error app.log\` – follow and search logs.
- \`ss -tulpn\` or \`netstat -tulpn\` – which process is listening on port 8000.
- \`curl localhost:8000/health\` – call the endpoint yourself.
- \`chmod\`, \`chown\` – fix permission problems on mounted volumes.
- \`nohup python train.py &\` or \`tmux\` – keep a long training job running after logout.

\`\`\`bash
df -h                       # is the disk full?
ss -tulpn | grep 8000       # is anything listening on 8000?
curl -s localhost:8000/health
\`\`\``,
          d: 'easy',
        },
        {
          q: `Why do we containerise ML models with Docker? Write a Dockerfile for a Python model API.`,
          a: `ML code depends on exact library versions (NumPy, scikit-learn, CUDA). Docker packages the code, the libraries and the OS layer into one **image** that runs the same on a laptop, CI and the cluster, ending "works on my machine" problems.

\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app

# install dependencies first so this layer is cached
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY model/model.joblib ./model/

# do not run as root
RUN useradd -m appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

Good practices: slim base image, copy \`requirements.txt\` before the code for layer caching, a \`.dockerignore\` to keep data and notebooks out, a non-root user, and pinned versions.`,
          d: 'easy',
          at: 'Product companies, service companies',
          tip: `Explain why requirements are copied before code (layer caching); it is a favourite follow-up.`,
        },
        {
          q: `Should the model file be baked into the Docker image or loaded at startup?`,
          a: `Both are used; know the trade-off.

**Baked into the image**
- The image is a complete, immutable artifact: image tag v1.4 always means the same model.
- Easy rollback (deploy the previous tag) and no runtime dependency on storage.
- But every new model needs a new image build, and large models make images huge.

**Loaded at startup** (from a model registry or object storage such as S3)
- One image can serve many model versions; set the version with an environment variable such as \`MODEL_URI\`.
- Faster model updates without rebuilding.
- But startup depends on the storage being reachable, and you must log exactly which version was loaded.

A common middle ground: small models are baked in; large models (LLMs, big deep nets) are downloaded at startup into a cached volume, with the exact version pinned, never "latest".`,
          d: 'medium',
        },
        {
          q: `What does CI/CD look like for an ML project compared with a normal app?`,
          a: `**CI (on every pull request)**
- Lint and unit tests for feature code and the API.
- **Data validation** tests on a small sample (schema, nulls, ranges).
- A quick **smoke training** on tiny data to prove the pipeline runs.
- Build the Docker image.

**CD / continuous training**
- A training pipeline runs on full data (on a schedule, on new data, or on merge).
- The new model is evaluated against a threshold **and** against the current production model.
- If it passes, it is registered and promoted to staging, then production — often with a manual approval or a canary rollout.

The main differences from app CI/CD: you test data and model quality, not only code; training is too slow and expensive to run on every commit; and the deployable artifact is the model plus the code that serves it. Some teams also add **CT (continuous training)** as a third loop.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `Write a GitHub Actions workflow that tests and builds a model-serving image.`,
          a: `\`\`\`yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: pytest -q tests/
      - name: Build image
        run: docker build -t model-api:\${{ github.sha }} .
      - name: Smoke test the container
        run: |
          docker run -d -p 8000:8000 --name api model-api:\${{ github.sha }}
          sleep 5
          curl --fail localhost:8000/health
\`\`\`

The image is tagged with the commit SHA, so every image traces back to exact code. On \`main\` a further step would push it to a registry (GHCR, ECR) using secrets stored in the repository settings, never hard-coded.`,
          d: 'medium',
          tip: `Tagging images with the commit SHA instead of "latest" is the detail that impresses.`,
        },
        {
          q: `What tests would you write for an ML system?`,
          a: `- **Unit tests** for feature functions: given a known input row, the output feature is exactly right (e.g. age bucket, text cleaning).
- **Data tests**: schema, allowed ranges, no unexpected nulls, no duplicate IDs. Tools: Great Expectations, Pandera, or plain pytest.
- **Model tests**: the trained model beats a baseline and meets a minimum metric on a fixed test set.
- **Behavioural tests**: invariance ("changing the name should not change a loan score") and directional checks ("higher income should not lower approval probability").
- **API tests**: the endpoint returns the right shape, rejects bad input with a 4xx, and meets a latency budget.

\`\`\`python
def test_age_bucket():
    assert age_bucket(17) == "under_18"
    assert age_bucket(18) == "18_25"

def test_model_beats_baseline(trained_model, test_data):
    X, y = test_data
    assert trained_model.score(X, y) >= 0.80
\`\`\``,
          d: 'medium',
        },
        {
          q: `What is Kubernetes and why is it used for ML workloads?`,
          a: `**Kubernetes** is a container orchestrator: you describe what should run (images, replicas, CPU/GPU/memory, ports) and it keeps the cluster in that state, restarting crashed containers and spreading load.

Key objects: **Pod** (one or more containers), **Deployment** (keeps N replicas running and does rolling updates), **Service** (stable network address), **HorizontalPodAutoscaler** (adds pods when CPU or request load rises), **Job/CronJob** (run-to-completion work such as batch scoring or training).

Why ML teams use it:
- Autoscaling model APIs with traffic.
- Scheduling GPU nodes for training and inference.
- Rolling, canary and blue-green deployments with easy rollback.
- A base for ML platforms such as Kubeflow and KServe.

For a fresher it is enough to know these objects and be able to read a Deployment YAML; deep cluster administration is usually a platform team's job.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `How do you keep secrets such as API keys and database passwords out of ML code and images?`,
          a: `Never put secrets in code, notebooks, Dockerfiles or Git — once committed they live in history forever, and images can be pulled and inspected.

Instead:
- Read them from **environment variables** at runtime: \`os.environ["DB_PASSWORD"]\`.
- In CI, store them as **encrypted CI secrets** (GitHub Actions secrets) and inject them into jobs.
- In Kubernetes, use **Secrets** mounted as env vars or files, ideally backed by a secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
- Prefer **short-lived credentials / IAM roles** over long-lived keys, so the pod gets access through its identity.
- Locally, use a \`.env\` file listed in \`.gitignore\`.
- Add a secret scanner (e.g. gitleaks or GitHub secret scanning) to CI.

If a key is ever committed, **rotate it immediately**; deleting the commit is not enough.`,
          d: 'hard',
          tip: `"Rotate the key" is the answer to "what if it was already pushed?"`,
        },
      ],
    },
    {
      title: 'Pipelines, versioning and experiment tracking',
      questions: [
        {
          q: `What is an ML pipeline and why not just run a notebook?`,
          a: `An **ML pipeline** splits the workflow into separate, automated steps — ingest → validate → feature engineering → train → evaluate → register — where each step has defined inputs and outputs.

Why not a notebook:
- Notebooks run cells in any order, hide state, and are hard to test or review.
- You cannot schedule, retry a single failed step, or run steps on different machines.
- There is no record of which data and code produced the model.

Pipelines give:
- **Reproducibility** – the same inputs give the same outputs.
- **Caching** – unchanged steps are skipped.
- **Automation** – run on a schedule or on new data.
- **Lineage** – which data and code produced which model.

Tools include Airflow, Kubeflow Pipelines, Prefect, ZenML, DVC pipelines and cloud services such as SageMaker Pipelines or Vertex AI Pipelines. Notebooks remain fine for exploration; the pipeline is what runs in production.`,
          d: 'easy',
        },
        {
          q: `Why is data versioning needed and how does DVC work?`,
          a: `A model is a product of code **and** data. Git handles code but not multi-GB datasets. Without data versioning you cannot answer "what data trained the model in production?" or reproduce a past result.

**DVC (Data Version Control)** works alongside Git:
- \`dvc add data/train.csv\` stores the file in a cache and creates a small \`data/train.csv.dvc\` pointer file containing its hash.
- You commit the pointer file to Git; the real data goes to **remote storage** (S3, GCS, Azure Blob, SSH) with \`dvc push\`.
- Checking out an old Git commit and running \`dvc pull\` (or \`dvc checkout\`) restores the matching data.

\`\`\`bash
dvc init
dvc remote add -d storage s3://my-bucket/dvc-store
dvc add data/train.csv
git add data/train.csv.dvc data/.gitignore
git commit -m "Track training data v1"
dvc push
\`\`\`

So one Git commit pins both the code and the exact data.`,
          d: 'easy',
          at: 'Product companies, startups',
          tip: `Say clearly: Git stores the small pointer file, the data lives in remote storage.`,
        },
        {
          q: `What is experiment tracking? Show how to log a run with MLflow.`,
          a: `During development you train dozens of models with different data, features and hyperparameters. **Experiment tracking** records for each run its parameters, metrics, code version and output artifacts so you can compare runs and reproduce the best one. Spreadsheets and file names like \`model_final_v3.pkl\` do not scale.

\`\`\`python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score

mlflow.set_experiment("churn")
with mlflow.start_run():
    params = {"n_estimators": 200, "max_depth": 8}
    model = RandomForestClassifier(**params, random_state=42).fit(X_train, y_train)
    f1 = f1_score(y_test, model.predict(X_test))

    mlflow.log_params(params)
    mlflow.log_metric("f1", f1)
    mlflow.sklearn.log_model(model, "model")
\`\`\`

The MLflow UI (\`mlflow ui\`) then shows every run side by side. Alternatives include Weights & Biases, Neptune and the trackers built into cloud ML platforms.`,
          d: 'easy',
        },
        {
          q: `What is a model registry and what stages or aliases does a model go through?`,
          a: `A **model registry** is the central catalogue of trained models. Each registered model (e.g. \`churn-classifier\`) has numbered **versions**, and each version records the run that produced it, its metrics, the data and code versions, and who approved it.

A model typically moves through: **candidate → staging (tested) → production → archived**. In recent MLflow versions the old fixed stages are deprecated in favour of **aliases** (e.g. \`@champion\`, \`@challenger\`) and tags, which you point at a version.

\`\`\`python
from mlflow import MlflowClient
client = MlflowClient()
client.set_registered_model_alias("churn-classifier", "champion", version=7)

# the serving code always loads whatever "champion" points to
model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
\`\`\`

Benefits: one source of truth, approvals and audit trail, and rollback is just moving the alias back to the previous version.`,
          d: 'medium',
          tip: `Mention that rollback = repointing the alias; no rebuild needed.`,
        },
        {
          q: `How would you define a reproducible pipeline with DVC stages?`,
          a: `DVC can describe pipeline steps in \`dvc.yaml\`. Each stage lists its command, dependencies and outputs, so \`dvc repro\` reruns only stages whose inputs changed.

\`\`\`yaml
stages:
  prepare:
    cmd: python src/prepare.py data/raw.csv data/clean.csv
    deps:
      - src/prepare.py
      - data/raw.csv
    outs:
      - data/clean.csv
  train:
    cmd: python src/train.py data/clean.csv models/model.joblib
    deps:
      - src/train.py
      - data/clean.csv
    params:
      - train.n_estimators
      - train.max_depth
    outs:
      - models/model.joblib
    metrics:
      - metrics.json:
          cache: false
\`\`\`

Hyperparameters live in \`params.yaml\`. \`dvc repro\` builds the graph, \`dvc.lock\` records the hash of every input and output, and \`dvc metrics diff\` compares the metrics with another commit. Commit \`dvc.yaml\`, \`dvc.lock\` and \`params.yaml\` to Git.`,
          d: 'medium',
        },
        {
          q: `What is Apache Airflow and how would you use it for a retraining pipeline?`,
          a: `**Airflow** is a workflow orchestrator. You write a **DAG** (directed acyclic graph) in Python, where each node is a task and edges are dependencies. The scheduler runs it on a schedule, retries failed tasks and shows status in a web UI.

\`\`\`python
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

with DAG("weekly_retrain", start_date=datetime(2025, 1, 1),
         schedule="@weekly", catchup=False) as dag:
    extract = PythonOperator(task_id="extract", python_callable=extract_data)
    validate = PythonOperator(task_id="validate", python_callable=validate_data)
    train = PythonOperator(task_id="train", python_callable=train_model)
    evaluate = PythonOperator(task_id="evaluate", python_callable=evaluate_and_register)

    extract >> validate >> train >> evaluate
\`\`\`

Good practice: keep tasks **idempotent** (rerunning gives the same result), pass large data through storage paths rather than between tasks, and let the heavy training run in a container or on a separate compute service, with Airflow only orchestrating.`,
          d: 'medium',
          at: 'Product companies, data platforms',
        },
        {
          q: `What is data validation and where does it sit in the pipeline?`,
          a: `**Data validation** checks that incoming data matches what the model expects **before** it is used for training or scoring. Bad data is one of the most common causes of bad models, and it rarely throws an error on its own.

Typical checks:
- **Schema** – expected columns and types.
- **Completeness** – null percentage below a limit.
- **Ranges and categories** – age between 0 and 120, country in a known list.
- **Uniqueness** – no duplicate primary keys.
- **Volume** – today's file is not suddenly 10% of the usual size.
- **Distribution** – statistics close to the training data.

It sits right after ingestion in the training pipeline (fail fast, do not train on broken data) and also at the serving API (reject or flag malformed requests).

\`\`\`python
assert set(EXPECTED_COLUMNS) <= set(df.columns), "missing columns"
assert df["age"].between(0, 120).all(), "age out of range"
assert df["customer_id"].is_unique, "duplicate ids"
\`\`\`

Libraries such as Great Expectations or Pandera make these checks declarative and produce reports.`,
          d: 'medium',
        },
        {
          q: `What is lineage and why does it matter for audits and debugging?`,
          a: `**Lineage** is the traceable chain from a prediction back to everything that produced it: prediction → model version → training run → code commit → dataset version → raw sources, plus the parameters and environment.

Why it matters:
- **Debugging** – if model v12 behaves badly, you can see exactly which data and code changed since v11.
- **Reproducibility** – you can rebuild the exact model.
- **Audits and regulation** – banks, insurance and healthcare must explain how a decision model was built; frameworks such as the EU AI Act push this further.
- **Data deletion requests** – if a user's data must be removed, lineage shows which models were trained on it and need retraining.

How to get it: tag runs with the Git SHA and data version, log them in MLflow (or a similar tracker), register models with links to their runs, and log the model version alongside every prediction in production. Lineage is cheap to record at training time and nearly impossible to recover afterwards.`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'Model serving, monitoring and LLM deployment',
      questions: [
        {
          q: `Build a simple model-serving API in Python with FastAPI.`,
          a: `\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
model = joblib.load("model/model.joblib")   # load once at startup, not per request
MODEL_VERSION = "churn-v7"

class Customer(BaseModel):
    tenure_months: int
    monthly_charges: float
    support_calls: int

@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}

@app.post("/predict")
def predict(c: Customer):
    features = [[c.tenure_months, c.monthly_charges, c.support_calls]]
    proba = float(model.predict_proba(features)[0][1])
    return {"churn_probability": proba, "model_version": MODEL_VERSION}
\`\`\`

Run with \`uvicorn main:app --host 0.0.0.0 --port 8000\`. Key points: Pydantic validates input and returns 422 on bad data; the model loads once; responses include the model version for traceability; a \`/health\` endpoint lets Kubernetes or a load balancer check the service.`,
          d: 'easy',
          at: 'Product companies, startups',
        },
        {
          q: `What should you monitor for a model in production?`,
          a: `Monitor at three levels:

1. **Service health** – request rate, latency (p50/p95/p99), error rate, CPU/GPU and memory. Same as any API; tools like Prometheus and Grafana.
2. **Data quality and drift** – missing values, out-of-range inputs, and whether the distribution of inputs and predictions has shifted from training.
3. **Model quality** – real accuracy, precision or business KPIs once ground-truth labels arrive (often days or weeks later, e.g. whether a loan defaulted).

Because labels are delayed, **input and prediction drift** act as early warning signs. A sudden shift in the share of "positive" predictions is often the first clue that something upstream broke.

Also log, for each prediction: a request ID, model version, inputs (respecting privacy rules) and output, so you can join with labels later and debug individual cases. Set alerts on thresholds rather than waiting for someone to check a dashboard.`,
          d: 'easy',
          tip: `Three layers: system, data, model. Note that labels arrive late.`,
        },
        {
          q: `Explain data drift and concept drift with examples. How do you detect drift?`,
          a: `- **Data drift (covariate shift)** – the distribution of inputs changes, but the relationship to the target is the same. Example: an app launches in a new city and the age mix of users changes.
- **Concept drift** – the relationship between inputs and target changes. Example: after a policy change, the same spending pattern no longer means fraud; during COVID, buying behaviour changed overnight.
- **Prediction drift** – the distribution of the model's outputs shifts, often a symptom of either.

**Detection:**
- Compare recent feature distributions with a training reference window using statistics such as **Population Stability Index (PSI)**, the **Kolmogorov–Smirnov test** for numeric features, or **chi-square** for categorical features.
- Track performance on labelled data when labels arrive — the only direct way to see concept drift.

\`\`\`python
from scipy.stats import ks_2samp
stat, p_value = ks_2samp(train_df["amount"], last_week_df["amount"])
if p_value < 0.01:
    print("Drift suspected in 'amount'")
\`\`\`

Tools like Evidently AI generate these reports. With huge samples, tiny harmless shifts become "significant", so set practical thresholds too.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `What are canary, shadow and A/B deployments for models?`,
          a: `All three reduce the risk of replacing a production model.

- **Shadow deployment** – the new model receives a copy of live traffic and its predictions are logged but **not** returned to users. You compare it with the current model on real data with zero user impact. Good first step.
- **Canary release** – a small share of real traffic (say 5%) goes to the new model. If errors, latency and metrics look fine, increase gradually to 100%; if not, roll back.
- **A/B test** – traffic is split (e.g. 50/50) for a fixed period to measure a **business** metric (click-through, conversion) with statistical significance.
- **Blue-green** – two full environments; switch all traffic at once, switch back instantly to roll back.

Typical order: offline evaluation → shadow → canary → full rollout, with an A/B test when the business impact must be proven. Always log the model version with each prediction so results can be compared.`,
          d: 'medium',
        },
        {
          q: `How do you reduce latency and cost of a model API?`,
          a: `- **Load the model once** at startup, never per request.
- **Right-size the model** – a smaller model or distilled version may be nearly as accurate and far faster.
- **Optimise the format** – export to ONNX and run with ONNX Runtime, or apply quantisation (e.g. float32 → int8) for neural networks.
- **Batching** – group requests so a GPU processes many at once (dynamic batching in Triton or similar servers).
- **Caching** – cache predictions for repeated inputs, and cache expensive feature lookups.
- **Async I/O** – fetch features from databases asynchronously.
- **Autoscaling** – scale replicas with traffic and scale down at night; use CPU for small models and save GPUs for models that need them.
- **Move work offline** – if predictions can be precomputed in batch, serve them from a key-value store instead of running the model live.

Measure first: profile where the time actually goes (feature fetch, preprocessing or the model) before optimising.`,
          d: 'medium',
        },
        {
          q: `What is different about deploying an LLM application compared with a classic ML model?`,
          a: `- **Often no training** – most teams call a hosted model through an API or run an open-weights model; the "model" work is prompts, retrieval (RAG) and orchestration code.
- **Prompts are code** – version prompts and templates in Git and test them, because a one-word change can change behaviour.
- **Evaluation is harder** – outputs are free text, so you use evaluation sets with expected answers, rule-based checks, human review, and LLM-as-judge scoring.
- **Cost and latency per token** – monitor tokens per request and spend; use caching, shorter prompts, smaller models for simple tasks, and streaming responses.
- **New failure modes** – hallucinations, prompt injection, leaking sensitive data, rate limits from the provider.
- **Observability** – log prompts, retrieved context, outputs, token counts and user feedback (respecting privacy) with tracing tools.
- **Self-hosting** needs GPUs and specialised inference servers such as vLLM or Hugging Face TGI.

The MLOps ideas remain — versioning, evaluation gates, monitoring, rollback — applied to prompts, retrieval indexes and model versions.`,
          d: 'medium',
          at: 'Product companies, AI startups',
          tip: `Saying "prompts are versioned and tested like code" shows LLMOps maturity.`,
        },
        {
          q: `How would you build and operate a RAG (retrieval-augmented generation) service in production?`,
          a: `**Indexing pipeline (offline):** load documents → split into chunks → create embeddings → store in a vector database (pgvector, OpenSearch, Qdrant, Pinecone and similar) with metadata such as source and access level. Run it as a scheduled pipeline so new documents are indexed, and version the index.

**Query path (online):** embed the question → retrieve the top-k chunks (filtered by the user's permissions) → put them into the prompt → call the LLM → return the answer with citations.

**Operating it:**
- An **evaluation set** of real questions with expected answers; measure retrieval quality (is the right chunk in the top k?) and answer quality before every change to chunking, embedding model or prompt.
- Monitor latency, token cost, empty-retrieval rate and thumbs-up/down feedback.
- If the embedding model changes, **re-embed the whole index**; vectors from different models are not comparable.
- Guard against prompt injection hidden in documents and never retrieve content the user is not allowed to see.

\`\`\`python
chunks = vector_store.search(embed(question), k=5, filter={"team": user.team})
prompt = build_prompt(question, chunks)
answer = llm.generate(prompt)
\`\`\``,
          d: 'hard',
        },
        {
          q: `When should a model be retrained, and how do you automate it safely?`,
          a: `**Triggers:**
- **Scheduled** – weekly or monthly, simple and predictable.
- **Performance-based** – when measured accuracy (once labels arrive) falls below a threshold.
- **Drift-based** – when input drift exceeds a limit.
- **New data volume** – after enough new labelled data accumulates.

**Safe automation:**
1. The trigger starts the training pipeline on a versioned data snapshot.
2. Data validation runs first; bad data stops the pipeline.
3. The new model is evaluated on a fixed holdout **and** a recent slice, and must beat the current champion by a margin and pass fairness and sanity checks.
4. It is registered as a challenger, then goes through shadow or canary.
5. Promotion may need human approval for high-risk use cases.
6. Rollback is one step: repoint to the previous version.

Retraining is not always the fix: if an upstream pipeline broke and is sending wrong values, retraining on broken data makes things worse. Investigate drift alerts before retraining.`,
          d: 'hard',
          tip: `Point out that drift caused by a broken upstream feed needs a data fix, not a retrain.`,
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Explain your MLOps capstone project end to end.`,
          a: `Use a clear structure, for example:

1. **Problem** – "Predict customer churn for a telecom dataset so the retention team can call at-risk customers each week."
2. **Data and versioning** – source, size, how it was tracked with DVC, and validation checks.
3. **Training and tracking** – models tried, metrics, and how runs were logged in MLflow; why you chose the final model (e.g. F1 0.78 vs baseline 0.61).
4. **Pipeline** – the steps (prepare → train → evaluate → register) and how they run (\`dvc repro\`, Airflow or a CI job).
5. **Serving** – FastAPI in Docker, deployed to a cloud VM or Kubernetes, with \`/health\` and \`/predict\`.
6. **CI/CD** – GitHub Actions running tests, building the image tagged with the commit SHA.
7. **Monitoring** – logs, latency, a drift report on recent inputs.
8. **What you would improve** – canary releases, feature store, automated retraining.

Have the architecture diagram ready and be honest about what was local or simulated.`,
          d: 'easy',
          tip: `Prepare a one-minute version and a five-minute version; end with what you would improve.`,
        },
        {
          q: `A model that was 92% accurate offline performs badly in production. How do you investigate?`,
          a: `Work from the cheapest checks to the deepest:

1. **Is it really the model?** Check the correct model version is deployed (versions in logs and \`/health\`).
2. **Training–serving skew** – take real production inputs, run them through the training preprocessing offline, and compare features with what the API computed. Look for different scaling, encodings, units, time zones or missing-value handling.
3. **Data leakage in training** – a feature that is not available at prediction time can make offline accuracy unrealistically high.
4. **Wrong evaluation** – a random split on time-ordered data, or a test set not representative of real users.
5. **Drift** – compare production input distributions with training data.
6. **Upstream data issues** – a column renamed, nulls appearing, a category code changed.
7. **Metric mismatch** – accuracy on balanced test data but heavily imbalanced real traffic.

Fix the root cause, add a test or monitor so it is caught automatically next time, then retrain if needed.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `Your Docker build for the training image takes 25 minutes and the image is 6 GB. How do you fix it?`,
          a: `- **Order layers for caching** – copy \`requirements.txt\` and install dependencies before copying source code, so code changes do not reinstall everything.
- **Use a \`.dockerignore\`** – exclude \`data/\`, \`.git\`, notebooks, checkpoints and virtual environments; large build contexts slow every build.
- **Do not bake data or checkpoints into the image** – mount or download them at runtime.
- **Slim base images** – \`python:3.11-slim\` instead of a full image; for GPU, pick the CUDA runtime image rather than the larger devel image unless you compile code.
- **Multi-stage builds** – compile or build wheels in one stage and copy only what is needed into the final stage.
- **\`pip install --no-cache-dir\`** and clean package-manager caches in the same \`RUN\` line.
- **CI layer caching** – enable Docker build cache in CI (e.g. \`docker/build-push-action\` with a cache backend).

Check \`docker history <image>\` to see which layers are biggest before changing anything.`,
          d: 'medium',
        },
        {
          q: `The nightly training pipeline failed at 2 a.m. and the dashboard shows yesterday's model. What do you do?`,
          a: `1. **Confirm production is safe.** A failed training run should leave the current production model serving; that is why promotion is a separate step. Check predictions are still flowing.
2. **Find the failing step** in the orchestrator UI (Airflow, CI logs) and read the logs for that task.
3. **Classify the failure:**
   - Data issue (validation failed, source file missing, schema changed) → contact the data owner; do not force-train on bad data.
   - Infrastructure issue (out of memory, disk full, spot instance taken away, credentials expired) → fix and retry.
   - Code issue (a new commit broke the step) → revert or fix with a test.
4. **Rerun** only the failed step, which is safe if tasks are idempotent.
5. **Communicate** to stakeholders if the fresh model or predictions will be late.
6. **Prevent recurrence** – add an alert, a check or retry logic, and write a short incident note.

Interviewers want to hear that you protect production first and do not skip validation to "make it green".`,
          d: 'medium',
        },
        {
          q: `Design an MLOps setup for a fresher-sized project: a sentiment model for product reviews.`,
          a: `Keep it simple but complete:

- **Repository** – \`src/\` (data prep, training, API), \`tests/\`, \`params.yaml\`, \`dvc.yaml\`, \`Dockerfile\`, \`.github/workflows/\`.
- **Data** – raw reviews tracked with DVC, remote in an S3/GCS bucket; a validation step checks text is non-empty and labels are valid.
- **Training** – a scikit-learn TF-IDF + logistic regression baseline first, maybe a small transformer later; every run logged to MLflow with params, metrics and the model.
- **Registry** – best model registered and aliased \`champion\` only if F1 beats the previous version.
- **Serving** – FastAPI \`/predict\` returning label, score and model version, packaged in Docker.
- **CI/CD** – GitHub Actions: lint, unit tests, data tests, image build and smoke test; deploy on merge to \`main\` to a small VM, a managed container service or a local Kubernetes (kind/minikube).
- **Monitoring** – request logs, latency, distribution of predicted labels, and a weekly drift report on review length and vocabulary.

Explain why you chose each piece; resist adding tools the project does not need.`,
          d: 'hard',
        },
        {
          q: `Prediction latency jumped from 40 ms to 900 ms after a deployment. How do you debug it?`,
          a: `1. **Correlate** – did the jump start exactly at the deployment? Compare model version, image tag and config between old and new.
2. **Roll back first if users are affected**, then investigate calmly.
3. **Break the time down** – add timing logs or tracing around feature fetch, preprocessing, model inference and post-processing to see which part grew.
4. **Common causes:**
   - The model is loaded inside the request handler instead of at startup.
   - The new model is much bigger (more trees, larger network) or runs on CPU instead of GPU.
   - A new feature calls a slow database or external API per request.
   - Fewer replicas or lower CPU limits, causing throttling or queuing in Kubernetes.
   - Thread settings: the framework uses too many or too few threads per worker.
5. **Reproduce locally** with a load-testing tool (Locust, k6) and the same inputs.
6. **Add a latency gate** to the pipeline (e.g. p95 < 100 ms in a load test) so it cannot happen again.`,
          d: 'hard',
          tip: `"Roll back first, investigate second" is the production mindset interviewers look for.`,
        },
        {
          q: `A stakeholder asks you to deploy an LLM chatbot to answer HR policy questions in two weeks. How would you approach it?`,
          a: `1. **Clarify scope** – which policies, who are the users, which languages, what must it never answer (salary of others, legal advice).
2. **Use RAG, not fine-tuning** – index the HR policy documents in a vector store and answer only from retrieved passages, with citations. This keeps answers current when policies change.
3. **Build an evaluation set** of 50–100 real questions with correct answers before tuning anything; measure retrieval hit rate and answer correctness.
4. **Guardrails** – a system prompt to stay within the documents and say "I don't know" otherwise; filter personal data; restrict documents by employee access level.
5. **Deploy** – a small API in a container, behind company login, with prompt templates versioned in Git.
6. **Observe** – log questions, retrieved chunks, answers, tokens and feedback; review the worst-rated answers weekly.
7. **Rollout** – pilot with the HR team first, then expand.

Be clear about limits: it assists, and HR remains the authority.`,
          d: 'hard',
        },
        {
          q: `Two data scientists say "my model is better" but their numbers came from different notebooks. How do you settle it?`,
          a: `The comparison is meaningless unless both models are evaluated the **same way**. Steps:

1. **Fix one evaluation dataset** – a versioned holdout set (via DVC or a snapshot) that neither model trained on, ideally reflecting recent production data.
2. **Fix the metric** – agree on the business-relevant one in advance (e.g. recall at 90% precision), not whichever looks best.
3. **Run both through the same evaluation script** in the pipeline, logging results to the same MLflow experiment with code and data versions.
4. **Check variance** – use cross-validation or several seeds; a 0.3% difference may be noise.
5. **Compare operational costs** – latency, model size, complexity of features, explainability.
6. If still close, run a **shadow or A/B test** on real traffic.

Longer-term fix: a shared training template and evaluation step so every model is automatically comparable. This turns opinion into a repeatable process, which is the heart of MLOps.`,
          d: 'hard',
        },
      ],
    },
  ],
};

export default book;
