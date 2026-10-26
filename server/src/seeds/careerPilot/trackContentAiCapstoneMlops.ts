/**
 * Career-track content: Capstone: An ML Platform (AI_CAPSTONE_MLOPS), the AI tracks, batch AI4 — the MLOps
 * Engineer's capstone. Nothing is re-taught; every unit points back to where the track taught it.
 *
 * What makes it different from the other capstones: the deliverable is the PLATFORM around a model, not the
 * model. DS_CAPSTONE grades the modelling (an honest table, validation, interpretation); the AI capstones grade
 * an LLM product. Here the model may be a plain gradient-boosted classifier, and the grade goes to versioned
 * data, a validated and cached pipeline, lineage in a registry, a promotion rule, CI, a canaried release with a
 * gate, service and slice-level quality monitoring with late labels, retraining and a rehearsed rollback.
 *
 * Option A (recommended, data provided) is Rakshak, UPI fraud scoring for a payments app: 320,000 seeded payments
 * over 16 weeks, labels that arrive days late, and a collect-request scam that starts in week 13. Every number
 * quoted for Option A was produced by running the code in the scratch venv on a Windows laptop: DVC 3.67 (init,
 * add, dvc.yaml stages, repro caching, exp run -S), MLflow 3.17 on SQLite (runs, registry, aliases, tags,
 * rollback), pandera 0.35 (failing on a bad batch), scikit-learn 1.9.1, pandas 3.0.6, FastAPI 0.150 through
 * TestClient, prometheus_client 0.26 and Prefect 3.9 (a flow run on its temporary local server). The canary
 * release gate ran on simulated windows and says so. The GitHub Actions workflow and the Kubernetes manifest were
 * parsed and checked with PyYAML only (no runner, no cluster: kubectl's client dry-run needs an API server).
 * Terraform is named as a deliverable, with no HCL shown. Timings are one laptop's; only their ratios matter.
 *
 * Attribution: the topic is [ML_PIPELINES, CI_CD, MODEL_DEPLOYMENT, MODEL_MONITORING], default ML_PIPELINES;
 * BUILD_PIPELINE declares ML_PIPELINES and CI_CD, BUILD_SERVING MODEL_DEPLOYMENT and MODEL_MONITORING. Checkpoint
 * questions on a skill other than ML_PIPELINES name it with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PIPE = 'ML_PIPELINES';
const CICD = 'CI_CD';
const DEP = 'MODEL_DEPLOYMENT';
const MON = 'MODEL_MONITORING';

export const TRACK_AI_CAPSTONE_MLOPS_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_CAPSTONE_MLOPS_BRIEF',
    notes: `**In an MLOps interview nobody asks how good your model is. They ask what happens on the day it gets
worse.** This capstone builds the platform that keeps one real model working: data you can roll back, a pipeline
that rebuilds any version, a registry that promotes by rule, CI that tests all of it, a release that can be undone
in minutes, and monitoring that notices when the model fails one group of users while the overall number still
looks fine. The model itself can be simple — a gradient-boosted classifier is plenty. You are graded on everything
around it.

Everything you need was taught in the track: DVC, pipelines, reproducible runs, the registry and data validation
(ML Pipelines, Versioning and Reproducibility), CI, gated canary releases, Kubernetes and configuration (CI/CD and
Infrastructure for ML), and service metrics, quality monitoring, retraining and incidents (Model Monitoring,
Retraining and LLMOps), on top of Model Deployment and MLOps Basics and the years' Docker and CI/CD units.

## Three options, one standard

| | **Option A — Rakshak (recommended, data provided)** | **Option B — a grocery chain** | **Option C — a telecom** |
|---|---|---|---|
| The model | Fraud score for every UPI payment in a payments app | Weekly demand per store and item, for replenishment | Which prepaid users will stop recharging next month |
| Serving | Online, inside the payment flow | Batch every Sunday night, plus a read API for store apps | Daily batch scores, plus an online lookup for the call centre |
| Service level | p99 under 150 ms at the service; a decision always returned | Forecasts ready by 6 a.m. Monday for 400 stores | Scores ready by 7 a.m.; lookup p99 under 300 ms |
| When labels arrive | Fraud complaints, days to weeks later | Actual sales, a week later | Churn is known 30 days after the scoring date |
| The failure that hurts | A new scam the model cannot see; too many genuine users challenged | A festival week forecast like a normal week; stock-outs in one region | A tariff change makes last quarter's model stale |
| The hard question | "Overall recall looks fine — who is it failing?" | "Diwali moves every year. How does your pipeline know?" | "Your labels are 30 days old. How do you notice in week one?" |

All three are graded on the same rubric. **Option A is recommended**: the data is generated below, the labels
arrive late in a realistic way, and the scam that starts in week 13 gives your monitoring something real to catch.
You met a small fraud scorer in the lessons; this one is bigger, slower to label and changes under you. For B or C,
bring a public dataset or a generator with at least 12 weeks of dated rows, a label with a known delay, and at
least one change in the data partway through. For C you may reuse the churn model from Model Deployment and MLOps
Basics — the model is not what is graded. No real personal data: no real VPAs, phone numbers or account numbers.

## The Option A data, in numbers

320,000 payments from 2 March 2026 over 16 weeks (about 20,000 a week): P2M and P2P, merchant category, amount,
device age, payee account age, the payer's payments in the last 24 hours, the hour and whether the payment was an
approved **collect request**. 0.59% are fraud. Each fraud carries a **label lag**: the median complaint arrives 5
days later, and 13.9% take more than 14 days. From week 13 a collect-request scam starts — on the payer's own,
old device, in the daytime, to payee accounts a few weeks old — and the fraud rate among collect requests goes
from 0.40% to 2.59%. Your pipeline trains on early weeks; your monitoring has to catch the scam.

## Service levels and success metrics — fixed before you build

| What | Target (Option A) | Measured by |
|---|---|---|
| Fraud caught | Recall ≥ 0.45 with 1% of payments challenged, overall and per slice | Promotion rule on a frozen holdout; slice monitor on reported labels |
| Challenge rate | 1% ± 0.25 points | Alert rate per model version, live |
| Latency and availability | p99 ≤ 150 ms; every request gets a decision (model or fallback) | Prometheus histogram; fallback counter |
| Rebuild | Any registered version rebuilt from its git commit and data hash in one command | A second machine, timed |
| Release | Canary decided by a written gate; rollback in under 10 minutes | Release log; a rehearsed drill |
| Detection | A failing slice raises an alert within a day of its labels arriving | Slice monitor and alert rule |

## Risks to write down on day one

1. **Labels are late and incomplete.** A recent week looks cleaner than it is because its complaints have not
   arrived. Every quality number must say how mature its labels are.
2. **Fraudsters adapt.** A new pattern can hide inside a healthy overall recall. Slices are not optional.
3. **The threshold is part of the model.** A new model with the old cut-off can double the challenge rate.
4. **The payment must not wait for you.** If the model is down, a rule decides; nothing blocks a payment.
5. **Personal data.** Hash payer ids, keep VPAs and phone numbers out of logs and training files (DPDP Act).

## The reference architecture

    raw payments (DVC, remote bucket) ── validate (pandera) ── train ── evaluate      dvc.yaml, cached stages
                                                    │ MLflow run: params, metrics, git commit, data hash
                                                    ▼
                         registry  rakshak-fraud  v1 v2 v3 …  aliases @champion @previous @challenger
                                   promote.py: frozen holdout, overall + slices, threshold as a tag
    GitHub Actions: PR → tests + schema + smoke train   main → dvc repro → promote → dvc push
                                                    ▼
    release: image tagged by commit, MODEL_URI pinned to a version → canary (1 of 10 pods) → release gate
    Kubernetes: Deployment stable + canary, one Service, probes, requests and limits, HPA
    FastAPI /score → score, decision, model version; rules fallback; /metrics for Prometheus
    monitoring: latency, errors, challenge rate (Prometheus)  +  daily slice monitor on reported labels
    retraining: Prefect flow on schedule or on a slice alert → dvc repro → promote.py → canary again

## Milestones (about four weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Plan and data | PLATFORM.md written; data generated, tracked with DVC and pushed to a remote |
| M2 — Training side | Validated, cached pipeline; MLflow runs with lineage; promotion rule run three times |
| M3 — CI | Pull requests run tests, the schema and a smoke train; main promotes by rule |
| M4 — Serving side | API in a container, canary manifest, release gate, metrics, slice monitor, retraining flow |
| M5 — Drill and demo | A rollback and a scam-detection drill rehearsed and timed; the defence ready |

## What "done" means

A reviewer clones the repository, runs \`dvc pull\` and \`dvc repro\`, and gets the same model hash and holdout
numbers as your README; checks out an older tag and rebuilds that version too; then watches you release a model,
break it and roll it back. Anything less is a collection of scripts.`,
    workedExample: `**A one-page PLATFORM.md for Option A (abridged).**

**The model and its users.** Rakshak scores every UPI payment in a payments app. The top 1% by score get a step-up
check (device PIN again, or a call); the fraud-operations team of six reviews complaints. The model is a
HistGradientBoosting classifier on seven features; it is deliberately plain.

**Service levels.** p99 ≤ 150 ms at the service; a decision on every request (model or rules); challenge rate
1% ± 0.25; recall ≥ 0.45 at that rate, overall and per slice, on matured labels.

**Data.** Payments land daily in the bucket and are versioned with DVC; labels are fraud complaints that arrive
with a lag (median 5 days). A week counts as matured 21 days after it ends. Training uses weeks 1–8, tuning weeks
9–10; weeks 11–12 are a frozen holdout that no training or tuning ever sees.

**Pipeline.** dvc.yaml: validate (pandera schema: types, ranges, allowed categories, unique ids, a sanity check on
the fraud rate) → train (params.yaml, MLflow run tagged with git commit and data hash) → evaluate. Features are
built in one module that the API imports too.

**Promotion rule.** A candidate becomes champion only if it has lineage, its holdout recall is at least 0.40 and
no more than 0.02 below the champion's, and no slice with 20 or more frauds loses more than 0.10. The 1% threshold
and the slice recalls are stored as tags on the version. The old champion becomes @previous.

**CI/CD.** Pull requests: unit tests, the schema on a sample, a one-minute smoke train. Main: dvc repro and the
promotion rule. Release: an image tagged by commit, MODEL_URI pinned to a version number, one canary pod in ten;
the gate compares errors, p99, challenge rate and score distribution after 5,000 canary requests.

**Monitoring.** Prometheus: latency histogram, decisions by outcome, fallback count. Daily slice monitor: recall on
reported frauds over 28 days for P2P, P2M, collect, new device and risky categories, against the baselines
stored at promotion; alert when a slice with 15+ reported frauds drops more than 0.20.

**Retraining.** Every 28 days or on a slice alert, a Prefect flow runs the pipeline on a moved window and the same
promotion rule. A retrained model that loses the rule stays a challenger.

**Incidents.** Rollback = move @champion to @previous and redeploy the pinned version. Kill switch: the rules
fallback, toggled by configuration.

**Not doing:** a feature store, streaming features, GPU serving, a second model.`,
    mcqs: [
      mcq('A student proposes Rakshak with a deep neural network, a week of tuning and no rollback plan. What should the capstone plan change first?', [
        ['Use a plain model and spend the time on promotion, release, rollback and monitoring', true],
        ['Keep the network but add more tuning time, as accuracy is what the panel scores first', false],
        ['Drop the canary release, since a stronger model makes a staged rollout unnecessary', false],
        ['Replace the rollback plan with a longer offline evaluation of the network on holdout', false],
      ], 'The capstone grades the platform: rebuilds, rules, releases and monitoring. A better model with no way to undo a bad release fails the brief, and no amount of offline evaluation replaces a rollback.'),
      mcq('Why does the Option A plan keep weeks 11–12 as a frozen holdout instead of reusing the tuning weeks for promotion?', [
        ['Weeks used for tuning flatter every candidate tuned on them, so they cannot judge fairly', true],
        ['MLflow refuses to register a model whose evaluation weeks overlap the weeks used for tuning', false],
        ['DVC caches the tuning weeks, so their numbers would never change between two candidates', false],
        ['Weeks 11–12 have the collect-request scam in them, which makes them the hardest test set', false],
      ], 'A comparison between models must use data none of them was fitted or tuned on. MLflow and DVC enforce nothing about it, and the scam starts in week 13, not in the holdout.'),
      mcq('Which service-level statement belongs in Rakshak\'s plan?', [
        ['p99 under 150 ms, and a decision on every request from the model or the rules', true],
        ['Average latency of about 50 ms, measured once on the laptop before the demo', false],
        ['The model is retrained every night, so its accuracy is always the latest possible', false],
        ['Holdout accuracy above 99%, since only 0.59% of the payments are fraud anyway', false],
      ], 'A payment flow needs a tail-latency bound and a guaranteed answer. An average hides the slow tail, nightly retraining is a mechanism rather than a service level, and 99% accuracy is reached by flagging nothing.'),
    ],
    checkpoint: [
      ck(MON, 'Rakshak\'s week-16 recall looks better than week 13\'s, measured on the complaints received so far. What should the report say first?', [
        ['Week 16\'s labels are immature; frauds reported late are missing from its number', true],
        ['The model has improved by itself, because it has now seen more weeks of traffic', false],
        ['The scam has stopped, since fewer frauds were reported for week 16 than week 13', false],
        ['Week 13 must have had a data problem, since recall cannot fall and then rise again', false],
      ], 'With a median lag of 5 days and a long tail, the latest weeks are missing many frauds, and fast-reported ones may be easier to catch. A quality number must say how mature its labels are; a served model does not learn by itself.'),
      ck(PIPE, 'Rakshak\'s plan must let a reviewer rebuild model v2 three months later. What does the registry entry for v2 need?', [
        ['The git commit and DVC data hash of its run, plus its params, as tags', true],
        ['A copy of the training CSV stored as an artifact inside the registry', false],
        ['The date it was trained, so the same weeks can be found in the bucket', false],
        ['A screenshot of the MLflow run page taken just before promotion day', false],
      ], 'The commit pins code and dvc.yaml, the data hash pins the exact data in the DVC remote, and params pin the settings. A copied CSV duplicates storage without the code; a date does not identify data that can be corrected later.'),
      ck(DEP, 'If Rakshak\'s model service is unavailable during a payment, what should the plan say happens?', [
        ['A simple rules fallback decides, and every fallback decision is counted', true],
        ['The payment waits until the model service recovers, then it is scored', false],
        ['The payment is declined, since an unscored payment might be a fraud', false],
        ['The last score this payer received is reused for this new payment instead', false],
      ], 'A fraud check must not block or decline payments when it fails. A counted rules fallback keeps decisions flowing and makes the outage visible; reusing an old score ignores everything about the new payment.'),
    ],
  },

  /* ── BUILD_PIPELINE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_CAPSTONE_MLOPS_BUILD_PIPELINE',
    notes: `**The training side of the platform: any model version rebuilt from its commit and data, and promoted only
by rule.** Everything here was taught in ML Pipelines, Versioning and Reproducibility and Continuous Integration for
ML Code; this unit is the build brief. Option A's real outputs are shown so you know what "working" looks like.

## The repository

    rakshak/
      params.yaml  dvc.yaml  dvc.lock  requirements-serve.txt
      data/raw/txns.csv.dvc                 # the pointer in git; the data in the DVC remote
      src/make_data.py  schema.py  validate.py  features.py  metrics.py  train.py  evaluate.py  promote.py
      tests/  .github/workflows/ci.yml  PLATFORM.md  README.md

## Step 1 — Data under DVC

Run \`make_data.py\` once (seeded; Option A), then track it — never commit the CSV to git:

    git init && dvc init && dvc remote add -d storage s3://<your-bucket>/rakshak
    python src/make_data.py
    dvc add data/raw/txns.csv && git add data/raw/txns.csv.dvc data/raw/.gitignore && git commit -m "data v1"

    # data/raw/txns.csv.dvc
    outs:
    - md5: 04e7e5df19fe3ff65ae88ca4ffcc4ad0
      size: 23321737
      path: txns.csv

## Step 2 — The data contract

A pandera schema (Validating Data Before It Reaches a Model) is the first stage; bad data stops the pipeline:

    TXN_SCHEMA = pa.DataFrameSchema({
        "txn_id": pa.Column(str, unique=True),
        "mcc": pa.Column(str, pa.Check.isin(["grocery", "fuel", "food", "electronics",
                                              "gaming", "utilities", "travel", "p2p"])),
        "amount": pa.Column(float, pa.Check.in_range(1, 100_000)),
        "hour": pa.Column(int, pa.Check.in_range(0, 23)),
        "is_fraud": pa.Column(int, pa.Check.isin([0, 1])),
        # ... every column the model reads
    }, checks=[pa.Check(lambda d: d["is_fraud"].mean() < 0.05, error="fraud rate above 5%")])

A partner batch with amounts in paise, one "Gaming", one hour 24 and a repeated id, validated with
\`lazy=True\`, fails with every problem at once:

    amount  in_range(1, 100000)     10
    hour    in_range(0, 23)          1
    mcc     isin([...])              1
    txn_id  field_uniqueness         2

## Step 3 — The pipeline

    stages:
      validate:
        cmd: python src/validate.py
        deps: [data/raw/txns.csv, src/validate.py, src/schema.py]
        outs: [data/validated.parquet]
      train:
        cmd: python src/train.py
        deps: [data/validated.parquet, requirements-serve.txt, src/train.py, src/features.py, src/metrics.py]
        params: [data.train_weeks, data.valid_weeks, train, policy.alert_rate]
        outs: [models/model.joblib]
        metrics: [models/run.json: {cache: false}]
      evaluate:
        cmd: python src/evaluate.py
        deps: [data/validated.parquet, models/model.joblib, src/evaluate.py, src/features.py]
        params: [data.holdout_weeks, policy.alert_rate]
        metrics: [metrics.json: {cache: false}]

The first \`dvc repro\` took 2 min 36 s on a laptop (most of it MLflow creating its database and logging the
model). The second, with nothing changed:

    Stage 'validate' didn't change, skipping
    Stage 'train' didn't change, skipping
    Stage 'evaluate' didn't change, skipping
    Data and pipelines are up to date.

\`features.py\` is the only place features are computed, and the API imports it (Features: Training-Serving Skew
and Feature Stores).

## Step 4 — Training with lineage

\`train.py\` reads params.yaml, trains, and logs one MLflow run tagged with the commit and the data hash:

    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    data_md5 = yaml.safe_load(open("data/raw/txns.csv.dvc"))["outs"][0]["md5"]
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    with mlflow.start_run() as run:
        mlflow.log_params({**p["train"], "train_weeks": f"{lo}-{hi}"})
        mlflow.set_tags({"git_commit": commit, "data_md5": data_md5})
        mlflow.log_metric("valid_recall_at_1pct", rec)
        info = mlflow.sklearn.log_model(model, name="model", input_example=build_features(va.head(3)),
                                        skops_trusted_types=[TREE],      # reviewed: our own trees
                                        pip_requirements="requirements-serve.txt")

Two things the run taught us. MLflow 3.17 saves scikit-learn models with skops and **refused** the first run:
\`Untrusted types found in the file: ['sklearn.ensemble._hist_gradient_boosting.predictor.TreePredictor']\`.
Name only the type you reviewed — never everything \`get_untrusted_types()\` returns. And without
\`pip_requirements\`, MLflow inferred requirements from every installed package and spent over a minute on it,
pinning torch into a model that never imports it.

## Step 5 — The promotion rule

\`promote.py\` registers the candidate, stores its 1% threshold and slice recalls as version tags, scores
candidate and champion on the frozen holdout (weeks 11–12) and moves aliases only if the rule passes:

    if new["all"][1] < FLOOR:                                   # 0.40
        reasons.append(...)
    if new["all"][1] < old["all"][1] - TOLERANCE:               # 0.02
        reasons.append(...)
    for name, (n, r) in new.items():
        if n >= MIN_FRAUDS and r < old[name][1] - MAX_SLICE_DROP:   # 20 frauds, 0.10
            reasons.append(...)
    if reasons:
        c.set_registered_model_alias(NAME, "challenger", mv.version); sys.exit(1)
    c.set_registered_model_alias(NAME, "previous", champ_v.version)
    c.set_registered_model_alias(NAME, "champion", mv.version)

Three real runs. v1 (300 iterations, 31 leaves) had no champion to beat and passed the floor:

    v1 PROMOTED to champion (holdout recall 0.491, threshold 0.08439, commit 18451f8, data 04e7e5df)

\`dvc exp run -n shallow -S train.max_iter=40 -S train.max_leaf_nodes=7\` — the smaller model generalised better:

      slice P2P        n= 48  0.354 -> 0.458
      slice P2M        n=182  0.527 -> 0.549
      slice collect    n=  8  too few frauds to judge
      slice new_device n= 76  0.776 -> 0.868
      slice risky_mcc  n= 69  0.565 -> 0.609
    v2 PROMOTED to champion (holdout recall 0.530, threshold 0.06100, commit 6d9956b, data 04e7e5df)

An under-fitted "tiny" experiment (12 iterations, 3 leaves) was registered and kept as a challenger:

    v3 REJECTED: recall 0.448 vs champion 0.530; slice P2M recall 0.445 vs champion 0.549;
    slice new_device recall 0.697 vs champion 0.868; slice risky_mcc recall 0.333 vs champion 0.609

Note the collect slice: 8 frauds in the holdout, so the rule cannot judge it. Say so in the README — it is
exactly where the week-13 scam will hit.

## Step 6 — CI

    on:
      pull_request:
      push:
        branches: [main]
    jobs:
      test:            # pytest (features, schema, metrics, the promotion rule on fixtures) + a smoke train
      train-and-promote:
        needs: test
        if: github.event_name == 'push'
        environment: training
        steps: [checkout, setup-python, "dvc pull", "dvc repro", "python src/promote.py", "dvc push"]

Secrets come from \`\${{ secrets.DVC_KEY_ID }}\`-style references, never from the repository. We parsed the
workflow with PyYAML (it was not run). One trap: PyYAML reads the key \`on\` as the boolean True, so a structure
check must look for \`w[True]\`, not \`w["on"]\`.

## Deliverables

1. The repository above, with data in a DVC remote and \`dvc.lock\` committed.
2. MLflow runs and at least three registered versions, one rejected by the rule, with the outputs saved.
3. \`ci.yml\` and green runs on a pull request and on main (or, if you cannot run Actions, the same steps in
   a \`make ci\` target with its output).
4. \`PIPELINE.md\`: the stages, the rule and why each number in it was chosen, and a rebuild log from a second
   machine or a fresh clone.

## Acceptance checks

- A fresh clone plus \`dvc pull && dvc repro\` reproduces the model hash in dvc.lock and the holdout numbers.
- A bad batch stops the pipeline at validate, with a readable list of failures.
- Changing one param re-runs train and evaluate only.
- Every registered version has commit, data hash, threshold and slice tags; the rejected one is a challenger.

## Common traps

- **Experiments are not commits.** \`dvc exp run\` recorded commit 6d9956b for v2, but v2's params differ from
  that commit's params.yaml. Log the params in MLflow and commit the experiment (\`dvc exp branch\`) before
  promoting, or "rebuild v2" is impossible.
- **Re-running promote.py registers a duplicate.** Running it twice on the same run created two versions. Look
  for an existing version with the same run id first.
- **Tuning on the holdout.** Look at weeks 11–12 to choose hyperparameters once and they stop being a holdout.
- **A threshold left behind.** v1's 1% cut-off was 0.084, v2's 0.061. The cut-off must travel with the version.`,
    mcqs: [
      mcq('Rakshak\'s v2 came from `dvc exp run -S train.max_iter=40` and was promoted. A month later nobody can rebuild it from commit 6d9956b. Why?', [
        ['The experiment\'s params were never committed; that commit\'s params.yaml says 300 iterations', true],
        ['DVC deletes the cache of an experiment as soon as a later experiment has been run', false],
        ['MLflow stores the model only for 30 days unless the version is given an alias', false],
        ['Commit 6d9956b was made before the data was added, so its DVC pointer is missing', false],
      ], 'An experiment changes params in the workspace without a commit, so the recorded commit has different params. Commit the experiment (dvc exp branch) or log every param; DVC and MLflow do not expire experiments or models.'),
      mcq('A pull request changes only `src/evaluate.py`. What should `dvc repro` do on the CI runner that has the cache?', [
        ['Skip validate and train, and re-run only the evaluate stage', true],
        ['Re-run every stage, because any code change invalidates the cache', false],
        ['Re-run train and evaluate, since evaluation depends on the model', false],
        ['Run nothing until the data pointer file has changed in git as well', false],
      ], 'DVC re-runs a stage only when one of its own dependencies or params changed. evaluate.py is a dependency of evaluate alone; train\'s inputs are unchanged, so its cached model is reused.'),
      mcq('The rule rejected v3, and a teammate wants to set `@champion` on v3 by hand "because it is faster". What should the platform do?', [
        ['Allow alias moves only from the promotion job, and log who triggered it', true],
        ['Allow it, since aliases can be moved back if the faster model fails', false],
        ['Allow it if v3 scored higher on the validation weeks than v2 did', false],
        ['Delete v3 from the registry so the teammate cannot select it at all', false],
      ], 'A rule anyone can bypass is not a rule. Restricting who may move the champion alias keeps every promotion auditable; deleting the version loses the record of why it was rejected.'),
    ],
    assignment: {
      title: 'Capstone: Pipeline, Registry and CI',
      description: 'Version the data, build a validated and cached training pipeline with lineage in MLflow, promote models through the registry by a written rule, and test all of it in CI.',
      instructions: `Build the training side of the platform for the option you chose in the Brief, as described in this unit's
notes. Submit a repository link or a zip (without the data; the reviewer pulls it from your DVC remote or
regenerates it with the seed).

**Submit:**

1. The repository with \`dvc.yaml\`, \`dvc.lock\`, \`params.yaml\`, the \`.dvc\` pointer, \`src/\` and \`tests/\`.
2. \`PIPELINE.md\` — stages and their dependencies; the data contract; the promotion rule with the reason for
   every number; the output of three promotion runs, at least one rejected.
3. Evidence of lineage: a registry listing showing each version's commit, data hash, threshold and slice tags.
4. \`.github/workflows/ci.yml\` and the output of a pull-request run and a main run (or \`make ci\` output).
5. A rebuild log: a fresh clone, \`dvc pull\`, \`dvc repro\`, and the matching model hash and holdout numbers.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Versioned data and reproducibility', description: 'Data tracked with DVC and pushed to a remote; dvc.lock committed; a fresh clone rebuilds the same model hash and numbers; experiments committed before promotion.', maxPoints: 20 },
        { criterion: 'Pipeline and data contract', description: 'Validate, train and evaluate as cached stages with correct deps and params; a schema that fails bad batches with readable reasons; features computed in one shared module.', maxPoints: 20 },
        { criterion: 'Tracking and lineage', description: 'Every run in MLflow with params, metrics, git commit and data hash; the model logged with reviewed trusted types and pinned requirements; versions tagged.', maxPoints: 15 },
        { criterion: 'Promotion rule', description: 'Frozen holdout; floor, non-inferiority and slice checks with stated numbers; small slices reported as unjudgeable; threshold stored with the version; aliases champion, previous, challenger used correctly.', maxPoints: 25 },
        { criterion: 'Continuous integration', description: 'Tests for features, schema, metrics and the rule; a smoke train on a sample; promotion only on main; secrets referenced, never committed.', maxPoints: 15 },
        { criterion: 'Documentation', description: 'PIPELINE.md and README let a stranger run everything; known limits stated, including slices too small to judge.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_SERVING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_CAPSTONE_MLOPS_BUILD_SERVING',
    notes: `**The serving side: a pinned model behind an API, a canary decided by a written gate, metrics that page for
the right things, a slice monitor that catches the week-13 scam, and a retraining loop that cannot ship a worse
model.** This uses Kubernetes for Model Serving, Continuous Delivery for Models, Configuration and Secrets Across
Environments, Service Metrics: Prometheus and Grafana, Monitoring Model Quality, Retraining: When and How and When a
Model Breaks in Production. Serving with FastAPI and Docker came from Model Deployment and MLOps Basics.

## Step 1 — The API, with only the platform's additions

The model URI is a **version**, set by the release (\`models:/rakshak-fraud/2\`), never \`@champion\`: an alias
moved in the registry must not silently change what restarted pods load. The threshold comes from the version's
tag. A rules fallback answers if scoring fails, and everything is counted:

    LATENCY = Histogram("rakshak_score_seconds", "Time to score one payment", ["track"],
                        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25))
    DECISIONS = Counter("rakshak_decisions_total", "Scoring outcomes", ["track", "outcome"])

    @app.post("/score")
    def score(p: Payment):
        t0 = time.perf_counter()
        try:
            s = float(state["model"].predict_proba(build_features(pd.DataFrame([p.model_dump()])))[:, 1][0])
            flagged, outcome = s >= state["threshold"], "model"
        except Exception:
            s, flagged, outcome = None, rules_fallback(p), "fallback"
        DECISIONS.labels(TRACK, outcome if not flagged else outcome + "_flagged").inc()
        LATENCY.labels(TRACK).observe(time.perf_counter() - t0)
        return {"score": s, "step_up": flagged, "model_version": state["version"], "decided_by": outcome}

Through TestClient: a grocery payment scored 0.00099 (no step-up), a 2 a.m. ₹48,000 electronics payment from a
day-old device to a two-day-old payee scored 0.9987 (step-up), hour 24 got a 422, and \`/metrics\` showed
\`rakshak_decisions_total{outcome="model_flagged",track="stable"} 1.0\`. Separate \`/health/live\` and
\`/health/ready\` (ready only once the model is loaded) feed the probes.

**Measure latency before you size anything.** On our laptop one-row \`predict_proba\` had p50 18.3 ms and p99
92.7 ms; with \`OMP_NUM_THREADS=1\` it fell to p50 12.1 ms and p99 17.4 ms — the gradient-boosting library was
spinning up threads for a single row. Set it in the container and match the CPU request.

## Step 2 — The canary on Kubernetes

Two Deployments share the label \`app: rakshak\`; one Service selects that label, so traffic splits roughly by
pod count (9 stable, 1 canary):

    apiVersion: apps/v1
    kind: Deployment
    metadata: {name: rakshak-canary, labels: {app: rakshak, track: canary}}
    spec:
      replicas: 1
      selector: {matchLabels: {app: rakshak, track: canary}}
      template:
        metadata: {labels: {app: rakshak, track: canary}}
        spec:
          containers:
            - name: api
              image: registry.example.in/rakshak-api:6d9956b    # immutable tag = the commit
              env:
                - {name: MODEL_URI, value: "models:/rakshak-fraud/2"}
                - {name: TRACK, value: canary}
                - {name: OMP_NUM_THREADS, value: "1"}
                - name: MLFLOW_TRACKING_URI
                  valueFrom: {secretKeyRef: {name: mlflow, key: tracking_uri}}
              resources: {requests: {cpu: 500m, memory: 512Mi}, limits: {memory: 1Gi}}
              startupProbe: {httpGet: {path: /health/ready, port: 8000}, failureThreshold: 30, periodSeconds: 2}
              readinessProbe: {httpGet: {path: /health/ready, port: 8000}, periodSeconds: 5}
              livenessProbe: {httpGet: {path: /health/live, port: 8000}, periodSeconds: 10}

We checked it offline with PyYAML (selector labels are a subset of the pod labels; the Service selector matches
both tracks; all three probes and the resources present) — there was no cluster. Add an HPA on CPU for stable,
and the Terraform for the bucket, registry and cluster from Infrastructure as Code for ML.

## Step 3 — The release gate

After the canary takes traffic, a script reads the two tracks' numbers from Prometheus and decides:

    def gate(stable, canary, p99_budget_ms=150, min_requests=5_000):
        if canary.requests < min_requests:
            return "WAIT", [...]
        if c_err > max(2 * s_err, 0.001):                       fails.append("error rate ...")
        if canary.p99_ms > p99_budget_ms or canary.p99_ms > 1.2 * stable.p99_ms: fails.append("p99 ...")
        if not 0.75 <= c_alert / s_alert <= 1.25:               fails.append("alert rate ...")
        if psi(stable.scores, canary.scores) > 0.25:             fails.append("score PSI ...")
        return ("ROLLBACK", fails) if fails else ("PROMOTE", [...])

On four simulated canary windows against a stable window of 95,000 requests:

    too early     WAIT     only 1200 canary requests; need 5000
    healthy       PROMOTE  alert ratio 1.06, score PSI 0.004
    stale cutoff  ROLLBACK alert rate 0.0257 vs stable 0.0100; score PSI 0.43
    slow          ROLLBACK error rate 0.0018 vs stable 0.0004; p99 181 ms vs stable 92 ms (budget 150)

"Stale cutoff" is the classic: a new model whose scores sit higher, shipped with the old threshold, challenges 2.6%
of genuine users. Labels are weeks away, so the gate judges what it can see now — errors, latency, challenge rate
and the score distribution. Quality is the promotion rule's job and the slice monitor's.

## Step 4 — Monitoring that sees the scam

Prometheus alerts on symptoms: p99 from the histogram (\`histogram_quantile(0.99, sum by (le, track)
(rate(rakshak_score_seconds_bucket[5m])))\`), error and fallback rates, and challenge rate per track. Quality comes
from a daily job: recall on frauds **reported so far** in the last 28 days, by slice, against the baselines stored
on the version at promotion. As of 22 June 2026 (weeks 13–16 served by v2):

    champion v2  alert rate 0.0101  as of 2026-06-22
      all        reported 365  recall 0.458  baseline 0.530  ok
      P2P        reported 134  recall 0.254  baseline 0.458  ALERT
      P2M        reported 231  recall 0.576  baseline 0.549  ok
      collect    reported  85  recall 0.071  baseline 0.530  ALERT
      new_device reported 104  recall 0.817  baseline 0.868  ok
      risky_mcc  reported  95  recall 0.611  baseline 0.609  ok

The overall drop (0.53 to 0.46) is inside the alert margin; the collect slice has collapsed to 0.07. The job also
exposes the numbers as \`rakshak_recall_reported_28d{slice="collect"} 0.0705…\` for Grafana and the alert rule.
Collect had no baseline of its own (8 holdout frauds), so it was compared with the overall figure — say so.

## Step 5 — Retraining, and its limits

A Prefect flow decides and runs: on a slice alert or when the champion is 28 days old, it moves the window
(\`dvc exp run -S data.train_weeks=...\`), runs the pipeline and the same promotion rule:

    retraining because quality alert: collect, P2P
    would run: dvc repro, then promote.py

Then the honest part. Retraining on weeks 3–14 with the labels reported by 22 June (226 of weeks 13–14's 248 frauds)
and testing on weeks 15–16:

    champion (weeks 1-8)               recall all 0.428  collect 0.046 (n=65)
    retrained, labels as reported      recall all 0.436  collect 0.092 (n=65)
    retrained 3-14, 300 iters/31 leaves recall all 0.440  collect 0.108 (n=65)
    weeks 13-14 weighted 4x            recall all 0.416  collect 0.123 (n=65)

Retraining barely helped: the existing features cannot tell the scam from a genuine collect request. The fix is a
new feature (for example, how many collect requests the payee sent in the last hour) going through the pipeline,
and a temporary rule for collect requests to young payees in the meantime. Write that up in the incident review;
it is the best answer you will give at the defence.

## Step 6 — Runbook and drills

Rollback: \`set_registered_model_alias(NAME, "champion", previous.version)\` and redeploy the pinned version
(the run printed \`rolled back: champion -> v1, threshold 0.08439\`). Kill switch: a config flag that sends every
decision to the rules. Rehearse both, timed.

## Deliverables and acceptance checks

1. The API, Dockerfile and \`/metrics\`; tests through TestClient, including the fallback.
2. \`k8s/\` (stable, canary, Service, HPA) and \`release_gate.py\` with its four outcomes demonstrated.
3. Alert rules, a dashboard, the slice monitor and the retraining flow; \`RUNBOOK.md\` and a timed rollback.
4. \`INCIDENT.md\`: the week-13 scam as a blameless review — detection time, impact, what retraining did and did
   not fix, follow-ups.

## Common traps

- **\`@champion\` in the pod.** A registry change then deploys itself on the next restart, with no canary.
- **Liveness on the model.** A liveness probe that loads the model restarts pods during a slow start; use a
  startup probe.
- **Quality from immature labels.** Report label maturity next to every number.
- **Treating retraining as the fix.** If the features cannot see the pattern, a fresher model will not either.`,
    mcqs: [
      mcq('Rakshak\'s pods read `MODEL_URI=models:/rakshak-fraud@champion`. Someone moves the alias to v3 on a Friday. What happens, and what is the fix?', [
        ['Pods load v3 as they restart, skipping the canary; pin a version number in the release', true],
        ['Nothing changes, because pods resolve the alias only once when the image is first built', false],
        ['Every pod reloads v3 at once, which is safe because the promotion rule already passed', false],
        ['The pods crash, since an alias cannot be resolved at runtime from a running container', false],
      ], 'The alias is resolved whenever a pod starts, so restarts quietly roll out v3 with no gate. Pin the version in the manifest and let the release process change it; a manual alias move may not have passed the rule anyway.'),
      mcq('The canary shows a challenge rate of 2.6% against stable\'s 1.0%, with normal latency and errors. What is the most likely cause?', [
        ['The new model shipped with the old threshold, and its scores run higher', true],
        ['Fraud has risen sharply in the last hour on the canary pod\'s users only', false],
        ['The canary\'s Prometheus scrape interval is shorter, so it counts twice', false],
        ['The canary pod has less memory, so it rejects requests as step-ups', false],
      ], 'Each model has its own score scale, so a cut-off chosen for one does not suit another. Traffic is split at random between pods, so a fraud spike would show on both; the threshold belongs with the model version.'),
      mcq('Rakshak\'s slice monitor alerts on collect requests, and the retrained model lifts collect recall only from 0.046 to 0.092. What should the team do next?', [
        ['Add a feature that can see the scam, with a temporary rule meanwhile', true],
        ['Retrain every night instead, so the model catches up with the scam faster', false],
        ['Raise the challenge rate to 5% so that more collect frauds are flagged too', false],
        ['Remove the collect slice from monitoring, since the model cannot learn it', false],
      ], 'When fresher data barely helps, the features lack the signal. A new feature through the pipeline is the fix and a narrow rule limits losses; nightly retraining repeats the failure and a 5% challenge rate burdens every genuine user.'),
    ],
    assignment: {
      title: 'Capstone: Serving, Monitoring and Retraining',
      description: 'Serve the promoted model on Kubernetes through a gated canary release, instrument it, monitor its quality by slice with late labels, retrain by rule, and rehearse rollback and an incident.',
      instructions: `Build the serving side of the platform for your option, as described in this unit's notes. Submit a repository
link or a zip. Where you have no cluster, validate manifests offline and say so; where you have no live traffic,
simulate it and label the simulation.

**Submit:**

1. \`serve/\` — the API with a pinned model version, threshold from the registry, rules fallback, health endpoints
   and \`/metrics\`; a Dockerfile; tests including the fallback and an invalid input.
2. \`k8s/\` — stable and canary Deployments, Service, HPA, probes, requests and limits; how you validated them.
3. \`release_gate.py\` with WAIT, PROMOTE and ROLLBACK demonstrated, and the release steps in CI or a script.
4. Alert rules, a dashboard screenshot or JSON, the slice monitor with its output, and the retraining flow.
5. \`RUNBOOK.md\` with a timed rollback and kill-switch drill, and \`INCIDENT.md\` for the drift you detected.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Serving', description: 'Pinned model version; threshold from the version; one shared feature module; validated input; rules fallback counted; separate live and ready endpoints; latency measured and tuned.', maxPoints: 20 },
        { criterion: 'Kubernetes and release', description: 'Stable and canary Deployments behind one Service; probes, requests, limits and an HPA; immutable image tags; manifests validated; secrets from the cluster, not the image.', maxPoints: 20 },
        { criterion: 'Release gate', description: 'Written thresholds on errors, tail latency, challenge rate and score distribution; a minimum sample before deciding; promote and rollback both demonstrated.', maxPoints: 15 },
        { criterion: 'Monitoring', description: 'Service metrics and symptom alerts; slice-level quality on reported labels with maturity stated; baselines from promotion; the injected drift detected.', maxPoints: 20 },
        { criterion: 'Retraining', description: 'Scheduled and triggered retraining through the same pipeline and promotion rule; a rejected retrain leaves the champion unchanged; limits of retraining analysed.', maxPoints: 15 },
        { criterion: 'Runbook and incident review', description: 'Rollback and kill switch rehearsed and timed; a blameless review with detection time, impact, cause and follow-ups.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_CAPSTONE_MLOPS_DEFENCE',
    notes: `**An MLOps panel — a platform engineer, an ML engineer, sometimes an SRE — wants to see the platform move:
a release, a failure and a rollback, live.** Ten minutes of demo, twenty of questions. This unit gives the script,
the questions and what a strong answer holds.

## The ten-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The model and its service levels | Who is challenged and why; p99, challenge rate, recall by slice; "the model is deliberately plain" |
| 1:00–3:00 | Rebuild | Check out an old tag, \`dvc pull && dvc repro\`; the model hash and holdout numbers match the registry tags |
| 3:00–4:30 | Promotion | A candidate through promote.py: one promoted, one rejected with its reasons |
| 4:30–6:30 | Release | The canary takes traffic; the gate says WAIT, then PROMOTE; then a bad canary (stale threshold) ROLLBACK |
| 6:30–8:30 | Detection | The dashboard; the slice monitor flags collect requests while overall looks fine; the alert fires |
| 8:30–10:00 | Incident and limits | Rollback time; what retraining did and did not fix; the feature you would add next |

Record every live step beforehand. If something fails, say what failed, show the recording and carry on — a
platform engineer respects a calm failure more than a perfect demo.

## The questions, and what a strong answer contains

1. **"Rebuild the model you shipped in week 10."** The version's commit and data hash; \`git checkout\`,
   \`dvc pull\`, \`dvc repro\`; the same hash. Admit what is not bit-identical (thread counts, library builds) and
   what you pinned.
2. **"Why a frozen holdout and not the latest week?"** Comparisons must be on data no candidate was tuned on and
   on matured labels. Then admit its weakness: it ages, so retraining moves it on a schedule.
3. **"Why those numbers in your promotion rule?"** The floor from the service level; the 0.02 tolerance from the
   noise you measured; 20 frauds as the smallest slice you can judge. Mention a paired bootstrap as the better
   test.
4. **"Your collect slice had 8 holdout frauds. So the rule never checked it?"** Yes — and that is why the slice
   monitor exists. Larger holdout windows or oversampling the slice are the fixes.
5. **"Why pin a version and not use @champion in the pods?"** An alias move would deploy itself on restart with
   no canary.
6. **"What does your canary gate check, given labels arrive weeks later?"** Errors, p99, challenge rate, score
   distribution, after a minimum number of requests. Quality is judged before (promotion) and after (slices).
7. **"How long does a rollback take, and what exactly moves?"** The timed drill; the manifest goes back to the
   previous version and image; the alias follows for the record.
8. **"Overall recall dropped from 0.53 to 0.46. Why didn't that page anyone?"** It was within the margin; the
   collect slice did page. Show the alert.
9. **"Why didn't retraining fix it?"** The numbers: 0.046 to 0.092. The features cannot see the scam; the fix is a
   feature and a temporary rule.
10. **"What if the model service is down?"** The rules fallback, the counter and its alert; nothing blocks a
    payment.
11. **"How does training-serving skew get in, and how do you stop it?"** Two implementations of a feature; one
    shared module, plus a test that scores the same rows in both paths.
12. **"What does this platform cost, and what would you cut?"** Pods, storage, CI minutes and on-call time,
    stated in units you can price; what you would not build at this scale (a feature store, streaming).
13. **"Where is personal data?"** Hashed payer ids, no VPAs or phone numbers in logs or training files; who can
    read the bucket (DPDP Act).
14. **"What would change for an LLM feature?"** Versioning prompt, model and retrieval together; evaluation runs
    instead of labels; cost per request (LLMOps: Running LLM Applications).

## Rehearse with these

Answer each aloud in under a minute: your rebuild command; the four checks in your gate; how you would know the
fallback has been running all night; the one thing you would build next with two more weeks.`,
    mcqs: [
      mcq('During the demo the panel asks Rakshak\'s student to rebuild v2, and the hash differs from dvc.lock. What is the strongest response?', [
        ['Show what differs — params, library build or threads — and state which of them you pinned', true],
        ['Say that model hashes never match across machines, so the holdout numbers are what matters', false],
        ['Rebuild again on the same laptop until the hash matches, then present that run to the panel', false],
        ['Explain that DVC hashes include a timestamp, so each rebuild is expected to give a new hash', false],
      ], 'A reproducibility claim has to survive a check, and a failed one should be explained, not hidden. DVC hashes file contents, not times; hashes can match when params, versions and threads are pinned.'),
      mcq('A panellist says, "Your gate never looks at fraud recall, so how is it a quality gate?" Which reply is strongest?', [
        ['Recall needs labels weeks away; quality is gated at promotion and watched by slice afterwards', true],
        ['Recall is too noisy to use anywhere in the platform, so the gate uses latency as its proxy', false],
        ['The canary runs long enough to collect labels, so recall is included in its score PSI check', false],
        ['Recall cannot change between versions, because both were trained on the same weeks of data', false],
      ], 'A canary lasts hours and labels take days, so the gate checks what it can see now. Quality is covered offline by the promotion rule and online by the slice monitor; recall does change between versions.'),
      mcq('The slice monitor flagged collect requests, but the overall recall alert stayed silent. A panellist asks if the overall alert is broken. What is the best answer?', [
        ['No: the overall drop was within its margin while one slice collapsed, which slices exist to catch', true],
        ['Yes: the overall margin should be tightened until it fires on every slice that fails in future', false],
        ['Yes: overall recall should always fall at least as far as the worst slice does in the same window', false],
        ['No: the overall alert only fires on latency, so recall was never part of its check to begin with', false],
      ], 'A small slice can collapse while the total moves a little. Tightening the overall margin would page on noise; slice-level checks are how this failure is found.'),
      mcq('Asked "What would you build next with two more weeks?", which answer shows the most judgement for Rakshak?', [
        ['A payee-level collect-request feature, since the scam is invisible to the current features', true],
        ['A feature store, because every serious ML platform needs one sooner or later anyway', false],
        ['A switch to a deep model, because it may find the scam pattern without new features', false],
        ['Streaming features through Kafka, since streaming is faster than the current setup', false],
      ], 'The evidence says the features lack the signal, so the next step follows from the incident. A feature store or streaming may be justified later, at scale; a bigger model cannot use a signal absent from its inputs.'),
      mcq('A panellist asks why the 2.6% challenge-rate canary was rolled back when no fraud labels showed it was worse. What is the best reply?', [
        ['It challenged 2.6 times as many genuine users, a cost visible at once and against the SLO', true],
        ['Any canary that differs from stable on any metric must be rolled back, as a matter of policy', false],
        ['A higher challenge rate always means a lower recall, so the model was worse at catching fraud', false],
        ['It was rolled back because its p99 latency was too high, which the dashboard showed directly', false],
      ], 'The challenge rate is a service level: each extra challenge is friction for a genuine user. Some difference is normal, a higher challenge rate usually means higher, not lower, recall, and latency was normal in this case.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_CAPSTONE_MLOPS_CHECKPOINT',
    notes: `Ten scenario questions across the whole MLOps track — the Python, ML and DevOps foundations, pipelines and
versioning, CI/CD and infrastructure, and monitoring, retraining and LLMOps — at the level a hiring panel expects from
someone who has kept a model working in production. Choose what you would actually do, and be ready to say why.`,
    checkpoint: [
      ck(PIPE, 'A grocery chain\'s team commits its 4 GB sales parquet to git "so the data is versioned". Clones now take twenty minutes. What should they have done?', [
        ['Track the file with DVC, commit the small pointer, and push the data to a remote', true],
        ['Split the parquet into 100 MB files so git can store each of them without trouble', false],
        ['Keep the file out of version control and write its download date in the README', false],
        ['Compress the parquet with gzip before committing so the repository stays small', false],
      ], 'Git stores every version of a large file in every clone. DVC keeps a content hash in git and the data in a remote, so any commit restores its exact data; a date in a README restores nothing.'),
      ck(PIPE, 'A demand-forecasting pipeline computes "sales in the last 7 days" in SQL for training and in Python in the API. Live forecasts are poor though validation was good. What is the first thing to check?', [
        ['Whether the two implementations give the same value for the same store and day', true],
        ['Whether the model needs to be retrained on a longer history of weekly sales', false],
        ['Whether the API container has enough memory to hold the model during a request', false],
        ['Whether validation used enough stores to give a stable estimate of the error', false],
      ], 'Two implementations of one feature are the classic source of training-serving skew. Comparing them on the same rows finds it quickly; retraining on skewed inputs would not help.'),
      ck(PIPE, 'A telecom\'s nightly pipeline trains on whatever arrives. One night a partner sends recharge amounts in paise. What should stop a bad model being trained?', [
        ['A schema check with ranges as the first stage, failing the run before training', true],
        ['The promotion rule, which will reject the resulting model if it scores worse', false],
        ['A drift monitor on the live service, which will alert once the model ships', false],
        ['Retraining with stronger regularisation, so that the extreme amounts matter much less', false],
      ], 'Bad data should be stopped where it enters. The promotion rule might catch the result, or might not if the holdout is affected too, and live drift alerts come after users are affected.'),
      ck(CICD, 'An ML repository\'s CI runs only flake8. Which addition catches the most real failures for its cost?', [
        ['Unit tests for features, a data-contract test and a training smoke run on a sample', true],
        ['A full training run on the whole dataset for every pull request opened', false],
        ['A manual review of the notebook by a senior data scientist on each change', false],
        ['A rule that the model\'s accuracy printed in the pull request must always go up each time', false],
      ], 'Fast tests catch broken features, schemas and pipelines in minutes. A full training run per pull request is slow and costly, reviews miss runtime breakage, and a self-reported number is not a check.'),
      ck(CICD, 'A new churn model passed every offline check. How should it reach all users?', [
        ['A canary on a small share of traffic, a written gate, then full rollout', true],
        ['All users at once at night, when traffic is low and few users would notice', false],
        ['A copy to every pod by hand, so the team can watch each pod switch over', false],
        ['All users at once, keeping the previous model\'s files in the bucket', false],
      ], 'Offline checks cannot see serving bugs, latency or a wrong threshold. A canary limits who is affected and a gate makes the decision repeatable; old files in a bucket are not a tested rollback.'),
      ck(DEP, 'A model server on Kubernetes takes 90 seconds to load its model. Pods keep restarting during deploys. What is the likely cause and fix?', [
        ['The liveness probe fails during loading; add a startup probe with enough time', true],
        ['The memory limit is too high; lower it so the scheduler places pods faster', false],
        ['The Service selector is wrong; add the pod\'s track label to the selector', false],
        ['The image is too large; switch to an alpine base image so the pull is quicker', false],
      ], 'A liveness probe that fails while the model loads makes the kubelet kill the container, again and again. A startup probe holds the other probes off until loading finishes; selectors and images do not cause restarts.'),
      ck(DEP, 'A fraud model must score each payment within 150 ms, and a demand model must forecast 400 stores every Sunday. Which serving choice fits each?', [
        ['Online API for the payments; a scheduled batch job for the forecasts', true],
        ['A scheduled batch job for both, with the payments scored hourly', false],
        ['An online API for both, with stores calling the forecast on demand', false],
        ['Streaming for both, so that each model sees new data as soon as it arrives', false],
      ], 'A payment needs a decision inside its own flow; forecasts are needed once a week for a known list, which a batch job does cheaply. Hourly scoring is too late for a payment, and streaming adds cost neither needs.'),
      ck(MON, 'A loan model\'s defaults are known only after six months. What can its team monitor in the first week after a release?', [
        ['Input and score distributions, and early proxies such as the first EMI bounce', true],
        ['Nothing useful, so the team should wait for the six-month labels to arrive', false],
        ['The model\'s training accuracy, recomputed on the same data every day', false],
        ['The number of API calls each day, since volume shows whether the model is accurate', false],
      ], 'When labels are late, drift in inputs and scores and an early proxy give a signal now. Waiting six months is too slow, training accuracy never changes, and volume says nothing about quality.'),
      ck(MON, 'An LLM support assistant moves to a new prompt and the cost per request doubles while answers look the same. What should the release process have included?', [
        ['An evaluation run on a fixed set with cost and latency compared before rollout', true],
        ['A rule that prompts may only change in the first week of every month', false],
        ['A switch to the largest model, so quality never depends on the prompt', false],
        ['A manual reading of five answers by the prompt\'s author before the release', false],
      ], 'Prompt, model and retrieval are released together and evaluated on a fixed set for quality, cost and latency, as LLMOps taught. A calendar rule or five hand-read answers cannot catch a cost change; a larger model raises cost further.'),
      ck(MON, 'A bad model release doubled false declines for two hours before it was rolled back. What should the post-incident review focus on?', [
        ['Why it was not caught sooner, and which gate or alert would catch it next time', true],
        ['Which engineer approved the release, so that person can be retrained', false],
        ['How many customers complained, so the impact can be reported to the board', false],
        ['Whether the model should be replaced with a set of hand-written rules instead of ML', false],
      ], 'A blameless review looks for the missing control — a gate, an alert, a test — and adds it. Blaming a person hides the gap, and impact figures are part of the review, not its purpose.'),
    ],
  },
];
