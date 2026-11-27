/**
 * Career-track content: CI/CD and Infrastructure for ML (MLOPS_CICD_INFRA), the AI tracks, batch AI4.
 *
 * Scope: continuous integration for ML code (feature tests, data contracts, a training smoke test, a GitHub
 * Actions workflow), continuous delivery for models (evaluation gates, shadow, canary, A/B, rollback),
 * Kubernetes for a model server (Deployment, Service, ConfigMap, requests and limits, probes, HPA), choosing
 * online, batch or streaming serving, Terraform for the platform's buckets, registry and cluster, and
 * configuration and secrets across dev, staging and production.
 *
 * Builds on the years' T3_CONTAINERS, T3_CICD_MONITORING (build once, tag by commit, what blocks a deploy),
 * T3_CLOUD_INFRA and T3_CLOUD_CONFIG (one build, three environments, secret managers), on DS_DEPLOYMENT
 * (saving models, FastAPI serving, Docker, health endpoints) and on MLOPS_PIPELINES (DVC, pandera, MLflow
 * registry aliases). Those get one sentence of reference, never a re-teach.
 *
 * One example runs through the topic: a UPI fraud scorer for a payments app (fraudml, a seeded synthetic
 * transaction generator, four features, a scaled logistic regression). Every Python snippet was run in the
 * scratch venv (Python 3.12, scikit-learn 1.9.1, pandas 3.0.6, pandera 0.35, pydantic-settings 2.16,
 * PyYAML 6.0.3, pytest 9.1): the pytest runs, the evaluation gate and its exit codes, the canary
 * simulation, the timing table (one laptop CPU, ratios matter) and the settings runs print what is shown.
 * The GitHub Actions workflow was parsed and checked with PyYAML, not run. The Kubernetes manifests were
 * checked offline with PyYAML and `kubectl kustomize` (no cluster exists). Terraform is not installed: the
 * HCL follows the documented syntax and the plan output shown is illustrative.
 *
 * Skills: CI_CD by default; KUBERNETES_FOR_ML is KUBERNETES, SERVING_PATTERNS is CLOUD_COMPUTE,
 * INFRA_AS_CODE is INFRA_AS_CODE and CONFIG_SECRETS is CONFIG_MANAGEMENT (trackSkillAttribution). The
 * CHECKPOINT names its non-default skills with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const CICD = 'CI_CD';
const K8S = 'KUBERNETES';
const CLOUD = 'CLOUD_COMPUTE';
const IAC = 'INFRA_AS_CODE';
const CFG = 'CONFIG_MANAGEMENT';

export const TRACK_MLOPS_CICD_INFRA_BUNDLES: PilotBundle[] = [
  /* ── CI_FOR_ML ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_CI_FOR_ML',
    notes: `You built a pipeline in Year 3: lint, test, build once, tag by commit. An ML repository needs all of that
and three more things, because a model can be broken in ways no ordinary test sees: a **feature function**
that quietly computes the wrong value, **data** that no longer matches what the code assumes, and a
**training run** that no longer finishes or no longer learns. CI for ML is the pipeline that catches those
on every pull request, in minutes, before anyone spends a GPU-hour on them.

The running example for this topic is a **UPI fraud scorer** for a payments app: a package \`fraudml\`
with a seeded synthetic transaction generator, four features (log amount, night-time, new payee, new
device) and a scaled logistic regression.

## Layer 1 — unit tests for feature code

Feature functions are ordinary code and are where most silent ML bugs live: an off-by-one on a boundary,
a NaN on an edge value, a function that mutates its input. Test the **boundaries**, not the happy path:

    import pandas as pd
    import pytest
    from fraudml.features import add_features

    def row(**kw):
        base = {"amount": 500.0, "hour": 14, "payee_age_days": 400, "new_device": False}
        base.update(kw)
        return pd.DataFrame([base])

    @pytest.mark.parametrize("hour, expected", [(4, 1), (5, 0), (22, 0), (23, 1)])
    def test_is_night_boundaries(hour, expected):
        assert add_features(row(hour=hour))["is_night"].item() == expected

    def test_new_payee_is_under_three_days():
        assert add_features(row(payee_age_days=2))["new_payee"].item() == 1
        assert add_features(row(payee_age_days=3))["new_payee"].item() == 0

    def test_negative_amount_does_not_produce_nan():
        assert add_features(row(amount=-10.0))["log_amount"].notna().all()

    def test_input_frame_is_not_mutated():
        df = row()
        add_features(df)
        assert list(df.columns) == ["amount", "hour", "payee_age_days", "new_device"]

The serving code must call **the same** \`add_features\` the training code calls. If serving has its own
copy, training–serving skew is one careless edit away; a test that pushes one row through both paths and
compares the vectors is cheap insurance.

## Layer 2 — data contracts

You wrote pandera schemas in the pipelines topic. In CI they do two jobs: the schema is validated against
a small **committed fixture**, and a test proves the schema actually **rejects** bad data — a schema that
accepts everything passes every run and protects nothing.

    import pandera.errors
    import pytest
    from fraudml.contract import TXN_SCHEMA
    from fraudml.data import make_upi_transactions

    def test_contract_rejects_bad_rows():
        df = make_upi_transactions(200)
        df.loc[0, "hour"] = 24
        df.loc[1, "amount"] = 0.0
        df.loc[2, "txn_id"] = df.loc[3, "txn_id"]
        with pytest.raises(pandera.errors.SchemaErrors) as exc:
            TXN_SCHEMA.validate(df, lazy=True)
        assert set(exc.value.failure_cases["column"]) == {"hour", "amount", "txn_id"}

\`lazy=True\` collects every failure instead of stopping at the first, so the CI log lists all three.

## Layer 3 — a training smoke test

Not "is the model good" — that is the evaluation gate's job, on real data, in the next unit. The smoke
test asks: **does training still run end to end, on a tiny seeded sample, and produce something sane?**

    def test_training_smoke(tmp_path):
        df = make_upi_transactions(2000, seed=1)
        start = time.perf_counter()
        model = train(df)
        assert time.perf_counter() - start < 30             # a smoke test, not a benchmark
        X = add_features(df)[FEATURES]
        proba = model.predict_proba(X)[:, 1]
        assert proba.shape == (2000,) and np.all((proba >= 0) & (proba <= 1))
        assert roc_auc_score(df["is_fraud"], proba) > 0.6    # learned *something*
        joblib.dump(model, tmp_path / "model.joblib")
        reloaded = joblib.load(tmp_path / "model.joblib")
        assert np.allclose(reloaded.predict_proba(X)[:, 1], proba)

Three rules make it trustworthy: **seed everything** (data and model), keep the quality bar **loose**
(this run scored 0.69 AUC, so 0.6 catches "learned nothing" without flaking), and include the
**save/load round trip**, because a model that trains but cannot be reloaded is not shippable.

Running the suite:

    $ pytest -v --durations=3
    tests/test_contract.py::test_generated_sample_meets_contract PASSED      [ 10%]
    tests/test_contract.py::test_contract_rejects_bad_rows PASSED            [ 20%]
    tests/test_features.py::test_is_night_boundaries[4-1] PASSED             [ 30%]
    ...
    tests/test_train_smoke.py::test_training_smoke PASSED                    [100%]
    0.29s call     tests/test_train_smoke.py::test_training_smoke
    ============================= 10 passed in 9.47s ==============================

## Layer 4 — the workflow

Two jobs: fast tests on every pull request, then a small training run plus the evaluation gate that
only starts if the tests passed (\`needs: test\`).

    name: fraud-model-ci
    on:
      pull_request:
        paths: ["fraudml/**", "tests/**", "requirements*.txt", ".github/workflows/ml-ci.yml"]
      push:
        branches: [main]
    concurrency:
      group: ml-ci-\${{ github.ref }}
      cancel-in-progress: true
    permissions:
      contents: read
    jobs:
      test:
        runs-on: ubuntu-latest
        timeout-minutes: 15
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-python@v5
            with: {python-version: "3.12", cache: pip, cache-dependency-path: "requirements*.txt"}
          - run: pip install -r requirements.txt -r requirements-dev.txt
          - run: ruff check .
          - run: pytest -q --durations=5
      train-and-gate:
        needs: test
        runs-on: ubuntu-latest
        timeout-minutes: 30
        steps:
          - uses: actions/checkout@v4
          # ...same Python setup...
          - run: python -m fraudml.train_cli --sample data/ci_sample.parquet --out artefacts/
          - run: python gate.py --candidate artefacts/metrics.json --champion champion_metrics.json
          - uses: actions/upload-artifact@v4
            if: always()
            with: {name: "candidate-\${{ github.sha }}", path: artefacts/}

Worth noticing: \`paths\` stops a README edit from triggering a training run; \`concurrency\` cancels the
stale run when you push again; \`timeout-minutes\` stops a hung training job eating runner minutes for six
hours; \`permissions: contents: read\` keeps the token minimal. Large data never lives in the repository —
the gate job pulls a pinned evaluation set with \`dvc pull\`, and cloud access uses OIDC
(\`permissions: id-token: write\` plus a role to assume) rather than a long-lived key stored as a secret.

## What does not belong in PR CI

Full training on the full dataset, hyper-parameter sweeps and GPU jobs. They are slow and expensive, and a
pull request that waits 90 minutes for feedback teaches people to batch changes. Run them on merge, on a
schedule, or on demand, and keep PR CI under about ten minutes.`,
    workedExample: `**Problem:** the fraud team's repository has one test (\`test_model_loads\`) and a notebook. Last month a
teammate changed the night-time feature from \`hour < 5 or hour >= 23\` to \`hour > 22\`, dropping hours 0–4.
Recall on night-time fraud fell, and nobody noticed for two weeks. Design the CI that would have caught it.

**Step 1 — name what can break.** Feature logic (this incident), the input data's shape and ranges, the
training code itself, the saved artefact, and model quality. Each needs a different check.

**Step 2 — map each to a layer, cheapest first.**

    feature logic   -> unit tests with boundary values          seconds, every PR
    data shape      -> pandera schema on a committed fixture    seconds, every PR
    training runs   -> seeded smoke test on 2,000 rows          seconds, every PR
    artefact        -> save/load round trip inside the smoke    seconds, every PR
    model quality   -> evaluation gate on the pinned eval set   minutes, after tests pass

**Step 3 — the test that catches this incident.** The parametrised boundary test with hours 4, 5, 22 and 23.
The changed code returns 0 for hour 4, so \`test_is_night_boundaries[4-1]\` fails with an assertion showing
\`0 == 1\`. The pull request cannot merge; the author sees the exact case in the log.

**Step 4 — why the smoke test alone would not.** The model still trains and still scores about 0.69 AUC
on synthetic data; the threshold of 0.6 passes. Smoke tests catch "broken", not "slightly worse".

**Step 5 — why the gate is the second net.** On the real evaluation set, the gate compares recall on the
\`night\` slice with the champion. A drop of several points blocks the release even if a boundary test had
been forgotten.

**Step 6 — make it a habit.** Branch protection requires the \`test\` job to pass before merge. A new feature
function without a boundary test fails review, the same as an API without a test.

The lesson: a quality metric averaged over everything hides a feature bug that hits one slice. Unit
tests on feature boundaries catch it in seconds, for free.`,
    mcqs: [
      mcq('A fraud team adds a pandera schema to CI, and it has passed on every pull request for three months. What should a reviewer check before trusting it?', [
        ['That a test feeds the schema deliberately bad rows and expects it to fail', true],
        ['That the schema file has not been edited since it was first committed', false],
        ['That the schema runs before the unit tests so its failures appear first', false],
        ['That the schema is applied to the production database on every PR run', false],
      ], 'A schema that never fails may simply accept everything. A negative test with bad rows proves it rejects what it should. An unchanged file or the order of steps says nothing about whether it works, and production data has no place in PR CI.'),
      mcq('Why does the fraud smoke test assert AUC above 0.6 when the real model scores far higher on real data?', [
        ['It checks that training learned something, without flaking on a small seeded sample', true],
        ['Synthetic data always scores lower, so 0.6 is the same bar as production quality', false],
        ['A lower bar lets the job finish sooner, because training stops early once AUC reaches 0.6', false],
      ], 'The smoke test exists to catch "broken" — training that no longer runs or learns nothing — quickly and reliably. Quality is judged by the evaluation gate on the pinned evaluation set. The threshold does not change how long training takes.'),
      mcq('A pull request that only edits README.md starts a 25-minute training job in the fraud repository. Which workflow change fixes that?', [
        ['A paths filter on the pull_request trigger listing the code and test folders', true],
        ['A concurrency group so that only one run of the workflow is active per branch at a time', false],
        ['A timeout-minutes value on the training job so it stops after ten minutes', false],
        ['A needs: test line so that training waits for the unit tests to finish', false],
      ], 'paths limits which changes trigger the workflow at all. Concurrency cancels older runs but still starts this one; a timeout cuts the job short rather than skipping it; needs only orders the jobs.'),
    ],
    checkpoint: [
      mcq('A teammate changed is_night from "hour < 5 or hour >= 23" to "hour > 22". Which CI check catches it on the pull request itself?', [
        ['A parametrised test asserting is_night for hours 4, 5, 22 and 23', true],
        ['The training smoke test, because AUC drops below the 0.6 bar', false],
        ['The pandera contract, because it rejects hour values above 22 in the input data', false],
      ], 'Hour 4 now returns 0, so the boundary test fails with the exact case. The smoke test still passes because the model still learns something, and the contract checks the input range 0–23, not the feature logic.'),
      mcq('Where should a full retraining on 18 months of UPI transactions run in the fraud team\'s delivery process?', [
        ['On merge to main, on a schedule or on demand, not on every pull request', true],
        ['On every pull request, so reviewers see the final metrics before merging', false],
        ['Only on a developer laptop, with the metrics pasted into the PR description', false],
      ], 'Full training is slow and expensive; on every PR it makes feedback take hours and pushes people to batch changes. Laptop runs are unreproducible and unaudited. Keep PR CI fast and run the heavy job on merge, a schedule or a manual trigger.'),
      mcq('The fraud CI job needs to read a pinned evaluation set from cloud storage. How should it get access?', [
        ['OIDC federation: the job assumes a narrow role, with no stored key', true],
        ['An access key pasted into the workflow YAML under an env block', false],
        ['An admin access key saved as a repository secret and shared by every job', false],
      ], 'OIDC gives the run a short-lived credential for one role, so there is nothing long-lived to leak or rotate. A key in YAML is committed in plain text, and an admin key shared with every job is far more access than reading one dataset needs.'),
    ],
  },

  /* ── CD_FOR_MODELS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_CD_FOR_MODELS',
    notes: `CI told you the code is not broken. **Continuous delivery for models** answers a harder question: is the
new model **better enough, everywhere that matters, to put in front of real payments** — and if it is not,
how few people does it hurt before you notice and undo it? Year 3 covered what blocks a deploy; here the
artefact is a model, so the gate measures behaviour, not just tests.

## Step 1 — the evaluation gate

A script that reads the candidate's metrics and the champion's, applies written rules, and **exits
non-zero** to block the pipeline. Rules come in three kinds: an absolute **floor**, a maximum **drop**
against the champion, and per-**slice** checks, because an average can rise while one group gets worse.

    RULES = {
        "recall_at_1pct_fpr": {"min": 0.55, "max_drop": 0.02},
        "auc": {"min": 0.80, "max_drop": 0.01},
        "p95_latency_ms": {"max": 40},
    }
    SLICES = ["new_device", "night", "amount_over_10k"]

    def check(cand, champ):
        failures = []
        for metric, rule in RULES.items():
            value = cand[metric]
            if "min" in rule and value < rule["min"]:
                failures.append(f"{metric}={value:.3f} below floor {rule['min']}")
            if "max" in rule and value > rule["max"]:
                failures.append(f"{metric}={value:.1f} above ceiling {rule['max']}")
            if "max_drop" in rule and champ[metric] - value > rule["max_drop"]:
                failures.append(f"{metric} fell {champ[metric] - value:.3f} vs champion")
        for s in SLICES:
            drop = champ["slices"][s] - cand["slices"][s]
            if drop > 0.03:
                failures.append(f"slice {s}: recall fell {drop:.3f} "
                                f"({champ['slices'][s]:.3f} -> {cand['slices'][s]:.3f})")
        return failures
    # main: print each failure, then sys.exit(1 if failures else 0)

Two candidates against the same champion:

    $ python gate.py --candidate good.json --champion champion_metrics.json; echo "exit code: $?"
    GATE PASS
    exit code: 0
    $ python gate.py --candidate bad.json --champion champion_metrics.json; echo "exit code: $?"
    GATE FAIL: slice new_device: recall fell 0.089 (0.701 -> 0.612)
    GATE BLOCKED (1 failure(s))
    exit code: 1

The "bad" candidate had **higher** overall recall and AUC than the champion. It was blocked because it
catches far less fraud on new devices — the most common account-takeover pattern. Without slices it ships.

Gate rules are a product decision written in code: agree them with the risk team, version them, and change
them by pull request, never by editing a threshold the night before a release.

## Step 2 — shadow

The candidate receives a **copy** of live traffic; its scores are logged but never used. Nobody is
affected, so it is the safe first contact with real data: you compare score distributions, decline rates
at the proposed threshold, latency and error rate with the champion's on the same requests. Shadow tells
you nothing about outcomes the model's decisions would have caused, and it doubles inference cost while it
runs, so it lasts days, not months.

## Step 3 — canary

A small share of **real decisions** go to the candidate. Routing must be **sticky** — hash the user id —
so one user does not flip between models, and the comparison is like for like. The plan is a ladder
(1% → 5% → 25% → 100%) with an automatic **rollback rule** checked every few minutes.

A simulation of the evening peak (2,000 scoring requests a minute; a bad model wrongly declines 4% of
genuine payments instead of 0.5%; rollback when the canary's decline rate is twice the stable arm's, once
the canary has at least 300 requests in a 5-minute window):

    big bang, noticed after 60 min   wrongly declined by the bad model: ~4,800 (4,200 more than the old model would have)
    canary 1% -> 5% -> 25%           wrongly declined by the bad model: 35 (auto-rollback at minute 20)
    canary 5% from the start         wrongly declined by the bad model: 20 (auto-rollback at minute 5)

Read the middle line carefully. At 1% the canary gets about 20 requests a minute — **100 per window, below
the 300 needed to decide** — so the 1% step decided nothing; the problem was caught only after the step
to 5%. A canary step too small to reach a decision is not caution, it is delay. Size each step so it
collects enough requests within its window.

Fraud labels (chargebacks) arrive **weeks** later, so a canary judges on fast **proxy** signals: decline
rate, score distribution, latency, errors, customer complaints. The real-recall check comes later, in
monitoring.

## Step 4 — A/B test

A canary asks "is it safe?"; an **A/B test** asks "is it better for the business?" — fraud losses per
lakh rupees processed, false-decline complaints — with a split held for long enough and a sample size
planned up front. Run it only after the canary has passed.

## Step 5 — rollback in minutes

Rollback must be a **rehearsed, one-command** change that does not need a rebuild:

- The model version is a **pointer**: an MLflow alias (\`champion\`), a \`MODEL_VERSION\` setting, or an image
  tag. Rolling back moves the pointer back to the last good version.
- The previous version's artefact and image still **exist** (immutable tags, retained registry versions).
- On Kubernetes, \`kubectl rollout undo deployment/fraud-scorer\` returns to the previous ReplicaSet.

If rollback means "retrain the old model", you do not have rollback. Tooling such as Argo Rollouts,
Flagger or a service mesh's weighted routing automates the ladder and the rollback rule; the logic above
is what they implement.`,
    workedExample: `**Problem:** a payments app's fraud team has a new candidate model. Write the release plan the on-call
engineer will follow, so that a bad model hurts as few customers as possible.

**1. Gate (in CI, before anything is deployed).** \`gate.py\` with the floors, the maximum drops and the three
slices from this unit. Exit 1 blocks the pipeline. Output and metrics are uploaded as build artefacts so a
reviewer can see why.

**2. Shadow — 3 days.** Mirror 100% of requests to the candidate; log scores only. Compare with the
champion on the same requests:

    decline rate at threshold 0.92     champion 0.48%   candidate 0.51%   OK (within 0.1 pt)
    p95 latency                        champion 22 ms   candidate 24 ms   OK (< 40 ms)
    score PSI vs champion scores       0.04                               OK (< 0.1)

(illustrative numbers.) If anything is off, stop here — no customer was affected.

**3. Canary ladder with an automatic rule.**

    step   share   minimum duration   requests per 5-min window at 2,000/min
    1      5%      30 min             ~500
    2      25%     2 h                ~2,500
    3      100%    -                  -

Rollback rule, checked every 5 minutes per arm: canary decline rate more than twice the stable arm's, or
canary 5xx above 0.5%, or p95 above 40 ms — once the window holds at least 300 canary requests. Why start
at 5% not 1%? At 2,000 requests a minute, 1% gives about 100 requests per window, below the 300 needed to
decide, so the step only adds delay.

**4. Rollback procedure** — one command, rehearsed in staging every release:

    kubectl rollout undo deployment/fraud-scorer -n risk

and point the registry alias \`champion\` back at the previous version so the next deploy does not
reintroduce the bad one.

**5. After 100%.** Keep the previous version deployable for 14 days. Recall is confirmed only when
chargebacks arrive (2–6 weeks); monitoring owns that check.

The plan names the numbers in advance. Nobody decides at 9 pm whether 0.9% declines "looks fine".`,
    mcqs: [
      mcq('A candidate fraud model beats the champion on overall recall and AUC, yet the gate blocks it. Which rule most plausibly fired?', [
        ['Recall on the new-device slice dropped more than the allowed margin', true],
        ['The gate always blocks a model whose overall AUC rises above 0.88', false],
        ['The candidate had a different number of features from the champion', false],
        ['The gate blocks any candidate that is trained on newer data than the last one', false],
      ], 'Slice checks exist because an average can rise while one important group gets worse — here new-device fraud, a common takeover pattern. No sensible gate blocks a higher AUC, and feature count or data freshness are not quality rules.'),
      mcq('A canary step sends 1% of 2,000 requests a minute to the candidate, and the rollback rule needs 300 canary requests per 5-minute window. What happens during that step?', [
        ['About 100 requests arrive per window, so the rule can never decide', true],
        ['The rule decides quickly, because 1% is the safest possible share', false],
        ['The canary is rolled back at once, because 100 is fewer than 300', false],
      ], '1% of 2,000 is 20 a minute, 100 per window — below the 300 minimum, so the step collects too little evidence to pass or fail. Small is not automatically safe if it cannot reach a decision. A short window is not grounds for rollback either.'),
      mcq('What does shadow deployment of a fraud model tell you that an offline evaluation cannot?', [
        ['How it scores live traffic, its latency and decline rate, at zero customer impact', true],
        ['How many chargebacks its own decline decisions would have prevented over the next month', false],
        ['Whether customers prefer its decisions to the champion model\'s decisions', false],
      ], 'Shadow scores real, current requests, so it shows live distributions, latency and the decline rate at the threshold — without using the decisions. Because its decisions are never applied, it cannot show their outcomes (prevented chargebacks) or customer preference; that needs a canary or an A/B test.'),
    ],
    checkpoint: [
      mcq('In a model-release pipeline, how does the evaluation gate stop a release?', [
        ['It exits with a non-zero status, which fails the pipeline step', true],
        ['It writes a warning line into the build log for reviewers to read', false],
        ['It deletes the candidate model file so later steps have nothing', false],
      ], 'CI systems treat a non-zero exit as a failed step and stop the jobs that depend on it. A warning is easily ignored, and deleting files is an obscure side effect that makes the failure harder to diagnose.'),
      mcq('Why must canary routing for the fraud scorer be keyed on a hash of the user id rather than chosen at random per request?', [
        ['Each user stays on one model, so arms compare cleanly and behaviour is consistent', true],
        ['Random routing would send far more than the planned share of traffic to the canary arm', false],
        ['A hash is required by Kubernetes, which cannot route requests at random', false],
      ], 'Sticky routing keeps one user on one model, so their experience does not flip and the per-arm comparison is not mixed. Random routing still delivers the planned share on average, and the routing logic lives in your service or mesh, not a Kubernetes rule.'),
      mcq('The team says "rollback means retraining last month\'s model if the new one misbehaves". What is wrong with that?', [
        ['Rollback must move a pointer to a stored version in minutes, not rebuild one', true],
        ['Retraining is fine, provided the same random seed and the same library versions are used', false],
        ['Rollback is unnecessary when the evaluation gate has already passed', false],
      ], 'Retraining takes hours and may not reproduce the old model exactly; meanwhile customers are hurt. Keep the previous artefact and image, and roll back by moving an alias, setting or Deployment revision. A passed gate reduces risk but does not remove it.'),
    ],
  },

  /* ── KUBERNETES_FOR_ML ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_KUBERNETES_FOR_ML',
    notes: `You can build an image of a model API (Year 3 and the deployment topic). **Kubernetes** is what runs
that image as many copies, restarts them when they die, sends traffic only to the ready ones, adds copies
at the evening peak and replaces them one at a time on a release. You describe the state you want in YAML;
controllers in the cluster keep making reality match it.

## The four objects a model server needs

- **Pod** — one or more containers scheduled together on a node, with an IP. You rarely write Pods
  directly.
- **Deployment** — "keep N identical Pods of this template running, and roll out changes gradually". It
  manages ReplicaSets; each release creates a new one, which is what makes \`rollout undo\` possible.
- **Service** — a stable name and virtual IP that load-balances across the Pods whose labels match its
  selector, and **only the Ready ones**.
- **ConfigMap** (and **Secret**) — configuration kept out of the image, injected as environment variables
  or files.

Add a **HorizontalPodAutoscaler** (HPA) to change the replica count with load.

## The fraud scorer, in one file

    apiVersion: v1
    kind: ConfigMap
    metadata: {name: fraud-scorer-config, namespace: risk}
    data:
      MODEL_URI: "s3://upi-risk-models/fraud/v14/model.joblib"
      MODEL_VERSION: "v14"
      DECLINE_THRESHOLD: "0.92"
    ---
    apiVersion: apps/v1
    kind: Deployment
    metadata: {name: fraud-scorer, namespace: risk}
    spec:
      replicas: 3
      revisionHistoryLimit: 5
      strategy:
        type: RollingUpdate
        rollingUpdate: {maxSurge: 1, maxUnavailable: 0}
      selector:
        matchLabels: {app: fraud-scorer}
      template:
        metadata:
          labels: {app: fraud-scorer, model-version: v14}
        spec:
          containers:
            - name: scorer
              image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/fraud-scorer:3f9c2a1
              ports: [{name: http, containerPort: 8000}]
              envFrom: [{configMapRef: {name: fraud-scorer-config}}]
              env:
                - name: FEATURE_STORE_TOKEN
                  valueFrom: {secretKeyRef: {name: fraud-scorer-secrets, key: feature-store-token}}
              resources:
                requests: {cpu: "500m", memory: "1Gi"}
                limits: {memory: "1536Mi"}
              startupProbe:   {httpGet: {path: /healthz, port: http}, periodSeconds: 5, failureThreshold: 24}
              readinessProbe: {httpGet: {path: /readyz, port: http}, periodSeconds: 5, failureThreshold: 3}
              livenessProbe:  {httpGet: {path: /healthz, port: http}, periodSeconds: 10, failureThreshold: 3}
    ---
    apiVersion: v1
    kind: Service
    metadata: {name: fraud-scorer, namespace: risk}
    spec:
      selector: {app: fraud-scorer}
      ports: [{name: http, port: 80, targetPort: http}]
    ---
    apiVersion: autoscaling/v2
    kind: HorizontalPodAutoscaler
    metadata: {name: fraud-scorer, namespace: risk}
    spec:
      scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: fraud-scorer}
      minReplicas: 3
      maxReplicas: 20
      metrics:
        - type: Resource
          resource: {name: cpu, target: {type: Utilization, averageUtilization: 60}}
      behavior:
        scaleDown: {stabilizationWindowSeconds: 300}

## Requests and limits

- A **request** is what the scheduler reserves; a Pod lands only on a node with that much free. It is also
  the denominator of HPA utilisation: 60% means 60% of the 500m **requested**. No CPU request, no CPU
  autoscaling — the HPA shows \`<unknown>\`.
- A **memory limit** is a hard ceiling: exceed it and the container is **OOMKilled** (exit code 137). Size it
  from measured peak memory — model plus a batch of requests plus every worker process (each Uvicorn or
  Gunicorn worker loads its own copy of the model).
- Many teams set **no CPU limit** on latency-sensitive services: a CPU limit throttles the container when it
  bursts, which shows up as p99 spikes. The request still guarantees the baseline.
- GPUs are requested as \`nvidia.com/gpu: 1\` under limits (with the device plugin installed); by default a
  GPU is not shared between Pods.

## Three probes, three questions

- **startupProbe** — "has it finished starting?" While it has not succeeded, the other two are switched
  off. Loading a large model can take a minute or two: 24 failures × 5 s gives it 120 s.
- **readinessProbe** — "should it get traffic now?" Failing it removes the Pod from the Service's
  endpoints; nothing restarts. \`/readyz\` returns 503 until the model is loaded and the feature store is
  reachable.
- **livenessProbe** — "is it stuck beyond recovery?" Failing it **restarts** the container. Keep it
  trivial; a liveness check that calls the feature store restarts every Pod when the feature store is slow,
  turning a dependency's hiccup into your outage.

## Rolling out and rolling back

\`maxUnavailable: 0, maxSurge: 1\` brings one new Pod up, waits for it to be Ready, then removes one old Pod
— capacity never drops during a release. Watch with \`kubectl rollout status deployment/fraud-scorer -n
risk\`; undo with \`kubectl rollout undo\`.

## Autoscaling arithmetic

The HPA computes desired = ceil(current × currentMetric ÷ target). Four Pods at 90% CPU against a 60%
target → ceil(4 × 90 ÷ 60) = **6**. The scale-down stabilisation window (300 s) stops it shrinking
the moment a burst ends and thrashing back up a minute later. HPA needs the metrics-server add-on; scaling
on requests per second or queue length needs a custom-metrics adapter or KEDA.

## Checking manifests without a cluster

A pipeline should reject a broken manifest before it reaches a cluster. Schema validators such as
kubeconform do that offline; your own rules can be a few lines of Python with PyYAML. For this topic the
manifest was checked with a script that verifies the selectors match the Pod labels, the container has a
CPU request and a memory limit, both probes exist, the image has a pinned tag and the Service's
\`targetPort\` names a real container port. On the file above it printed \`problems: none\`; with the CPU
request removed and \`targetPort: web\` it printed:

    problems: ['scorer: no CPU request, so the HPA cannot compute utilisation',
               'Service targetPort web is not a named container port']

and exited 1, failing the build.`,
    workedExample: `**Problem:** the fraud scorer loads a 600 MB model at start-up, which takes about 75 seconds. The first
manifest had one probe — liveness on \`/healthz\` with \`initialDelaySeconds: 10\` and \`failureThreshold: 3\`
every 10 s. Every Pod is in \`CrashLoopBackOff\`. Fix the manifest and size the Pod.

**Step 1 — read the symptom.** \`kubectl describe pod\` shows "Liveness probe failed: connection refused"
and "Container scorer failed liveness probe, will be restarted". The app is still loading at 10 s; three
failures later (about 40 s) the kubelet kills it, it starts loading again, forever.

**Step 2 — give start-up its own probe.**

    startupProbe:   {httpGet: {path: /healthz, port: http}, periodSeconds: 5, failureThreshold: 24}

24 × 5 s = 120 s of allowance, comfortably above 75 s, and liveness/readiness do not run until it
succeeds. Do not "fix" it by raising liveness's initial delay to 120 s: that hard-codes today's load time
into a probe whose job is something else, wastes up to two minutes before a Pod that hangs at start is
noticed, and breaks again when next quarter's model loads more slowly.

**Step 3 — separate readiness.** \`/readyz\` returns 503 until the model is in memory and a test score
succeeds; then 200. The Service sends no traffic to a Pod until then.

**Step 4 — size memory from measurement.** Measured peak resident memory of one worker under load:
about 900 MB (model plus request buffers). Two Uvicorn workers would be about 1.8 GB, so the team runs
**one worker per Pod** and scales Pods instead:

    resources:
      requests: {cpu: "500m", memory: "1Gi"}
      limits:   {memory: "1536Mi"}

The limit leaves headroom above the 900 MB peak; an OOMKill would show as exit code 137 and
\`Reason: OOMKilled\`.

**Step 5 — verify.** \`kubectl get pods -w\` shows each Pod \`0/1 Running\` for about 75 s, then \`1/1\`;
\`kubectl get endpoints fraud-scorer -n risk\` lists only Ready Pods.

The lesson: start-up, readiness and liveness are three different questions, and a model server, which is
slow to start, needs all three answered separately.`,
    mcqs: [
      mcq('The fraud scorer\'s readiness probe fails on one Pod because its feature-store connection dropped. What does Kubernetes do?', [
        ['Takes it out of the Service\'s endpoints until the probe passes; no restart', true],
        ['Restarts the container straight away, exactly as it does when a liveness probe fails', false],
        ['Deletes the Pod and schedules a replacement on a different node', false],
      ], 'A failed readiness probe removes the Pod from the Service endpoints only; it rejoins when the probe passes. Restarts come from liveness failures, and Pod replacement comes from the Deployment when a Pod is deleted or its node fails.'),
      mcq('An HPA targets 60% CPU. Five scorer Pods are averaging 84% CPU. How many replicas will it ask for?', [
        ['7', true],
        ['5', false],
        ['8', false],
        ['9', false],
      ], 'desired = ceil(current × current metric ÷ target) = ceil(5 × 84 ÷ 60) = ceil(7.0) = 7. Five would leave utilisation above target; 8 or 9 overshoot the formula (subject to min/max replicas).'),
      mcq('The fraud scorer runs four Uvicorn workers per Pod and is being OOMKilled. Each worker holds about 700 MB. What is the most likely cause?', [
        ['Each worker loads its own model copy, so the Pod needs about 2.8 GB plus headroom', true],
        ['The CPU limit is too low, which causes the kernel to kill the container', false],
        ['The readiness probe runs too often and allocates memory on every call', false],
        ['The Service sends traffic before the startup probe has passed, which leaks memory steadily', false],
      ], 'Worker processes do not share the Python heap, so memory grows with workers. OOMKilled (exit 137) is a memory-limit event; CPU limits throttle rather than kill. Probes and Service routing do not explain multi-gigabyte growth.'),
    ],
    checkpoint: [
      mcq('A liveness probe on the scorer calls the feature store. During a feature-store slowdown, every scorer Pod restarts. What is the fix?', [
        ['Make liveness check only the process itself; put dependencies in readiness', true],
        ['Raise the liveness failureThreshold so that the restarts take much longer to happen', false],
        ['Remove the readiness probe so the liveness probe is the only check', false],
      ], 'Liveness should answer "is this process stuck?", and a dependency problem is not cured by a restart. Readiness can include dependencies because failing it only removes traffic. A higher threshold delays the same cascade; removing readiness makes it worse.'),
      mcq('A rollout of a new scorer image must never reduce serving capacity, even briefly. Which RollingUpdate settings achieve that?', [
        ['maxUnavailable: 0 with maxSurge: 1', true],
        ['maxUnavailable: 1 with maxSurge: 0', false],
        ['maxUnavailable: 25% with maxSurge: 25%', false],
      ], 'maxUnavailable 0 forbids removing an old Pod before a new one is Ready, and maxSurge 1 allows one extra Pod during the rollout. The other settings allow capacity to dip below the desired count.'),
      mcq('After a Deployment is applied, its HPA reports the CPU target as <unknown>/60%. The metrics-server is healthy. What is missing?', [
        ['A CPU request on the container, which utilisation is measured against', true],
        ['A CPU limit on the container, which the HPA divides current usage by', false],
        ['A readinessProbe, without which the HPA ignores the Pods entirely', false],
      ], 'Utilisation is current usage as a share of the requested CPU, so without a request there is nothing to compute. Limits are not the denominator, and readiness affects traffic routing, not whether metrics can be read.'),
    ],
  },

  /* ── SERVING_PATTERNS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_SERVING_PATTERNS',
    notes: `"Deploy the model" hides a choice that decides most of the cost and complexity: **when** predictions are
made. Get it wrong and you run twenty Pods all day to compute numbers nobody reads until morning, or you
make a payment wait on a nightly job.

## Three patterns

**Online (request–response).** A caller waits for the answer: the UPI fraud score before the payment is
approved, a product ranking as the page loads. Needs a latency budget (often p99 under 50–100 ms for the
model's share), always-on capacity sized for the peak, and fresh features at request time.

**Batch.** Predictions for a known set of entities, computed on a schedule and written to a table: a
lender's nightly pre-approved credit limits for 40 lakh customers, a grocery chain's next-week demand
forecast per store and product. Cheapest per prediction, simplest to operate and to rerun; the
predictions are as stale as the last run.

**Streaming.** Events arrive continuously on a log such as Kafka; a consumer scores each one within
seconds, with no caller waiting: flagging a merchant whose refund rate spikes, updating a rider's ETA as
location pings arrive. Fresher than batch, cheaper than online for high-volume events nobody blocks on,
and harder to run (offsets, replays, exactly-once questions, state).

Ask four questions, in order:

1. **Does someone wait for the answer?** Yes → online. No → batch or streaming.
2. **How fresh must it be?** Hours or a day is fine → batch. Seconds to minutes → streaming.
3. **Are the inputs known in advance?** Scoring every customer → batch works. Scoring a payment that does
   not exist yet → it cannot.
4. **What does volume × latency cost?** Peak requests per second set the Pod count for online.

A common, strong answer is a **hybrid**: compute expensive features in batch or streaming, store them in
a feature store, and keep the online model small and fast.

## Batching is where the speed is

The fixed cost of one model call — Python overhead, input validation, a DataFrame per call — dwarfs the
arithmetic for a small model. Timing the fraud model's \`predict_proba\` for different batch sizes on one
laptop CPU:

    batch     1: 5.5671 ms per row
    batch    32: 0.1706 ms per row
    batch   256: 0.0254 ms per row
    batch  2048: 0.0028 ms per row

Per row, a 2,048-row batch is about **2,000 times** cheaper than single rows (the exact numbers vary run to
run; the ratio is the point). Batch jobs get this for free. Online services get some of it through
**dynamic (adaptive) batching**: the server holds requests for a few milliseconds and runs them as one
batch, trading a little latency for a lot of throughput. For deep models on a GPU, batching is the
difference between a busy GPU and an idle expensive one.

## Sizing an online service

**Little's law**: requests in service at once = arrival rate × time each takes. At a peak of 600 requests
a second taking 15 ms each, about 9 requests are in service at any moment. With 2 workers per Pod and a
60% utilisation target for headroom:

    busy workers at peak = 9.0; pods needed at 60% utilisation = 8

Size for the **peak** (UPI traffic has sharp evening and month-start peaks, and festival days far above a
normal Tuesday), and let the HPA scale down off-peak.

## Model servers, in outline

You can serve a scikit-learn model with the FastAPI app you already have, and for most tabular models
that is the right answer. Dedicated servers earn their place when you have many models, deep models or
GPUs:

- **BentoML** — package a model and its Python code as a service with adaptive batching, build an image,
  deploy anywhere.
- **KServe** — a Kubernetes custom resource (\`InferenceService\`) that runs standard model servers,
  scales to zero, and has a built-in canary percentage.
- **NVIDIA Triton** — high-throughput serving for PyTorch, ONNX and TensorRT models on GPUs, with dynamic
  batching and several models sharing one GPU.
- **Ray Serve** and **vLLM** for composed pipelines and LLMs, which the LLMOps unit returns to.

Pick by need, not fashion: one tabular model behind FastAPI on three Pods is cheaper to run and to debug
than a KServe installation.

## GPUs and cost

A GPU node costs many times a CPU node per hour. It pays only when the model is large enough that the
GPU's parallel arithmetic beats a CPU **and** you keep it busy — usually with batching. A gradient-boosted
fraud model on CPU at 15 ms is fine; a vision model checking KYC document photos may need a GPU, and
probably in batch, not online. Compare **cost per 1,000 predictions** = (node price per hour × nodes) ÷
(predictions per hour ÷ 1,000), using your cloud's current price page. Batch work can also use
spot/pre-emptible nodes at a large discount, because a killed job can simply be rerun; online serving
usually cannot.`,
    workedExample: `**Problem:** a Pune-based lender has three models. For each, choose the serving pattern and justify it.

**Model A — instant loan decision in the app.** The customer taps "Check eligibility" and waits on the
screen. About 30 requests a second at peak; the bureau pull is already 800 ms.

- Someone waits → **online**. The model's share of the budget is small next to the bureau call, so a
  scikit-learn model behind the existing FastAPI service on CPU Pods is enough.
- Sizing: 30 req/s × 20 ms = 0.6 requests in service; even with 60% headroom two Pods suffice. Run three
  for availability across zones.

**Model B — pre-approved top-up offers for 40 lakh existing borrowers**, shown when they open the app.

- Nobody waits for the computation; the input set (every borrower) is known; daily freshness is fine →
  **batch**. A nightly job reads the borrower table in chunks, scores with large batches, writes
  \`offer_score\` with the model version and run date, and the app reads the table.
- 40 lakh rows at a fraction of a millisecond per row in batches is minutes of CPU. Run it on spot nodes;
  if a node is reclaimed, rerun.
- Running this online, on every app open, would need always-on capacity for the morning peak and would
  recompute the same score many times a day.

**Model C — collections early warning**: flag a borrower when salary-credit SMS-derived events stop or
bounced auto-debits appear.

- No caller waits, but a day's delay matters to the collections team → **streaming**: a consumer on the
  repayment-events topic scores each event and writes alerts within a minute.
- Watch the operational extras: consumer lag as a metric, idempotent writes so a replay does not create
  duplicate alerts.

**Shared decision:** none of the three needs a GPU or a dedicated model server. Revisit if they add a
document-photo model for KYC, which would run in batch on a GPU node with large batches.

The lesson: start from "who waits, and how fresh must it be?", then size with Little's law — the
platform choice comes last.`,
    mcqs: [
      mcq('A grocery chain needs next-week demand forecasts for 1,200 stores × 8,000 products, used by planners every Monday morning. Which serving pattern fits?', [
        ['A scheduled batch job that writes the forecasts to a table on Sunday night', true],
        ['An online API that planners call for each product when they open a screen', false],
        ['A streaming consumer that scores every till receipt as the sale happens', false],
      ], 'Nobody waits on the computation, the set of store–product pairs is known, and weekly freshness is enough — the definition of batch. An online API would recompute on demand at higher cost, and per-receipt streaming answers a different question.'),
      mcq('Timing the fraud model shows a single-row call costing roughly 2,000 times more per row than a 2,048-row batch. What explains most of that gap?', [
        ['Fixed per-call overhead dominates when the arithmetic per row is tiny', true],
        ['The model applies more trees to single rows than to rows inside a batch', false],
        ['Single-row calls fall back to a slower solver inside scikit-learn', false],
      ], 'For a small model the arithmetic per row is negligible, and the per-call costs — Python dispatch, validation, building the input — are paid once per call regardless of size. The model and solver do not change with batch size.'),
      mcq('Using Little\'s law, a scorer receives 400 requests a second at peak and each takes 25 ms. Pods run 2 workers and are sized for 50% utilisation. How many Pods?', [
        ['10', true],
        ['5', false],
        ['20', false],
      ], 'In service at once = 400 × 0.025 = 10 requests. Each Pod at 50% utilisation absorbs 2 × 0.5 = 1, so 10 Pods. Five ignores the headroom; twenty halves the per-Pod capacity twice.'),
    ],
    checkpoint: [
      mcq('A payments app must score every UPI payment for fraud before it is approved. Which pattern is required, and why?', [
        ['Online, because the payment waits on the score and its inputs exist only then', true],
        ['Batch, because scoring every payment overnight is the cheapest choice', false],
        ['Streaming, because payments are events and every event should be scored from Kafka', false],
      ], 'The decision blocks the payment, and the transaction does not exist until it happens, so it cannot be precomputed. Overnight batch would approve first and score later; streaming scores without anyone waiting, which is too late for an approval.'),
      mcq('A KYC team wants a GPU for a document-photo model that checks 2 lakh uploads collected through the day. What makes the GPU spend worthwhile?', [
        ['Running large batches so the GPU stays busy, ideally on discounted nodes', true],
        ['Running each upload through the GPU the moment it arrives, one at a time', false],
        ['Keeping the GPU node running all day so the model stays warm for later', false],
      ], 'GPUs pay off when parallel arithmetic is kept busy, which batching provides; batch work can also use spot nodes because a killed job can rerun. One-at-a-time calls waste the hardware, and an idle warm GPU is pure cost.'),
      mcq('When is a dedicated model server such as Triton or KServe worth adopting over the existing FastAPI service?', [
        ['With many models, GPU deep models, or a need for features like scale-to-zero', true],
        ['As soon as any model is deployed, because FastAPI cannot serve models safely', false],
        ['Only when the model is written in a language other than Python', false],
      ], 'These servers bring dynamic batching, GPU sharing, multi-model management and canary routing — valuable at scale or on GPUs. A single tabular model is cheaper to run and debug behind FastAPI, which serves models perfectly well. Language is not the deciding factor.'),
    ],
  },

  /* ── INFRA_AS_CODE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_INFRA_AS_CODE',
    notes: `The fraud platform needs a bucket for model artefacts, a container registry for the scorer image and a
Kubernetes cluster to run it — in staging and in production, identical in shape. Created by clicking in a
console, they drift apart, nobody can say who changed what, and rebuilding after an accident is guesswork.
**Infrastructure as code** describes them in files that are reviewed, versioned and applied by a tool.
Year 3 showed the idea of one definition with a variables file per environment; this unit writes it in
**Terraform**, the most widely used tool for it. (Pulumi and the clouds' own tools — CloudFormation,
Bicep, Deployment Manager — follow the same model.)

The examples use AWS in Mumbai (\`ap-south-1\`); the concepts transfer directly to GCP or Azure providers.
Terraform was not installed where this unit was written: the HCL follows the documented syntax and the
plan output is illustrative.

## The four ideas

- **Provider** — a plugin that knows one platform's API (\`hashicorp/aws\`, \`hashicorp/google\`). Pin its
  version, so an upgrade is a deliberate change.
- **Resource** — one thing that should exist: a bucket, a repository. Terraform creates, updates or
  deletes it to match the file.
- **State** — Terraform's record of which real object each resource is. It is how Terraform knows a
  bucket already exists. It can contain sensitive values, so it lives in a locked, encrypted, remote
  backend — never in Git, never only on a laptop.
- **Plan and apply** — \`terraform plan\` compares the files, the state and reality, and prints what it
  would do; \`terraform apply\` does it. The plan is what humans review.

## The platform, in HCL

    terraform {
      required_version = ">= 1.11"
      required_providers {
        aws = { source = "hashicorp/aws", version = "~> 6.0" }
      }
      backend "s3" {
        bucket       = "upi-risk-tfstate"
        key          = "ml-platform/prod/terraform.tfstate"
        region       = "ap-south-1"
        encrypt      = true
        use_lockfile = true          # S3-native state locking, no DynamoDB table
      }
    }

    variable "env" {
      type = string
    }

    provider "aws" {
      region = "ap-south-1"
      default_tags {
        tags = { team = "risk-ml", env = var.env, managed_by = "terraform" }
      }
    }

    resource "aws_s3_bucket" "models" {
      bucket = "upi-risk-models-\${var.env}"
    }

    resource "aws_s3_bucket_versioning" "models" {
      bucket = aws_s3_bucket.models.id
      versioning_configuration {
        status = "Enabled"           # an overwritten model.joblib can be recovered
      }
    }

    resource "aws_s3_bucket_public_access_block" "models" {
      bucket                  = aws_s3_bucket.models.id
      block_public_acls       = true
      block_public_policy     = true
      ignore_public_acls      = true
      restrict_public_buckets = true
    }

    resource "aws_ecr_repository" "scorer" {
      name                 = "fraud-scorer"
      image_tag_mutability = "IMMUTABLE"   # tag 3f9c2a1 always means the same image
      image_scanning_configuration {
        scan_on_push = true
      }
    }

\`aws_s3_bucket.models.id\` is a **reference**: Terraform learns from it that the versioning resource depends
on the bucket and creates them in the right order.

## The cluster: use a module

A production EKS cluster is dozens of resources (control plane, node groups, IAM roles, security groups).
Write it through a well-maintained **module** and pin the module's version:

    module "eks" {
      source  = "terraform-aws-modules/eks/aws"
      version = "~> 21.0"

      name               = "risk-ml-\${var.env}"
      kubernetes_version = var.kubernetes_version
      vpc_id             = module.vpc.vpc_id
      subnet_ids         = module.vpc.private_subnets

      eks_managed_node_groups = {
        cpu = {
          instance_types = ["m6i.large"]
          min_size       = 2
          max_size       = 10
          desired_size   = 3
        }
      }
    }

Module input names change between major versions; read the README of the exact version you pin.

## Environments

The same code, a variables file each: \`staging.tfvars\` with \`env = "staging"\` and a small node group,
\`prod.tfvars\` with the production sizes, and a **separate state** (a different backend \`key\`, or
separate directories per environment) so that applying staging cannot touch production.

## Reading a plan

    Terraform will perform the following actions:

      # aws_ecr_repository.scorer must be replaced
    -/+ resource "aws_ecr_repository" "scorer" {
          ~ name = "fraud-scorer" -> "upi-fraud-scorer" # forces replacement
            ...
        }

    Plan: 1 to add, 0 to change, 1 to destroy.

The symbols matter: \`+\` create, \`-\` destroy, \`~\` update in place, \`-/+\` **destroy and recreate**.
Renaming an ECR repository cannot be done in place, so Terraform will delete it — and every image in it,
including the one production is running. A reviewer who reads "1 to destroy" on a registry stops the
change. Guards: \`lifecycle { prevent_destroy = true }\` on the bucket and registry, and \`moved\` blocks when
you only rename a resource's address in code.

## Changing infrastructure through review

- A pull request runs \`terraform fmt -check\`, \`terraform validate\` and \`terraform plan\`, and posts the
  plan for review.
- Merging runs \`terraform apply\` of **that reviewed plan** (\`plan -out\` then \`apply\` of the file), from CI
  with an OIDC role — not from a laptop, and gated by a required approval for production.
- Nobody changes managed resources in the console. If someone does, the next plan shows the difference
  as **drift**, and the team either adopts the change in code or lets the apply revert it.
- Model artefacts and images are **not** Terraform resources: Terraform owns the bucket and registry; the
  training pipeline and CI write what goes in them.`,
    workedExample: `**Problem:** a pull request for the fraud platform's production stack shows this plan. Review it.

    # aws_s3_bucket_versioning.models will be updated in-place
    ~ resource "aws_s3_bucket_versioning" "models" {
        ~ versioning_configuration {
            ~ status = "Enabled" -> "Suspended"
          }
      }

    # module.eks.module.eks_managed_node_group["cpu"].aws_eks_node_group.this[0] will be updated in-place
    ~ resource "aws_eks_node_group" "this" {
        ~ scaling_config {
            ~ max_size = 10 -> 30
          }
      }

    # aws_s3_bucket.reports will be created
    + resource "aws_s3_bucket" "reports" {
        + bucket = "upi-risk-reports-prod"
      }

    Plan: 1 to add, 2 to change, 0 to destroy.

(illustrative plan.)

**Step 1 — "0 to destroy" is not "safe".** No deletions, but an in-place update can still remove a
protection.

**Step 2 — versioning Enabled → Suspended.** New uploads to the model bucket would overwrite older objects
with no version kept, so a model that was overwritten could not be recovered for rollback or an audit.
Ask why. If the author wanted lower storage cost, the right change is a lifecycle rule that expires
**non-current** versions after, say, 90 days. **Request changes.**

**Step 3 — node group max 10 → 30.** Fine in principle (festival-season peaks), but it triples the worst-case
compute bill. Ask for the capacity reasoning (Little's law at the expected peak) and confirm budget
alerts exist. Approve if justified.

**Step 4 — new reports bucket.** Check that the same public-access block, encryption and tags apply. The
diff shows only the bucket: the access-block resource is missing. **Request changes**, or better, ask for
a small module \`secure_bucket\` that always creates the bucket with its protections, so this cannot be
forgotten again.

**Step 5 — after the fix.** Re-run the plan on the updated branch, approve, merge; CI applies the saved
plan with the production role after a second approval.

**Verdict:** two of three changes need work. The review was possible only because the change was
a plan in a pull request rather than three console clicks.`,
    mcqs: [
      mcq('A Terraform plan for the model registry shows "-/+ resource aws_ecr_repository.scorer" with a name change marked "forces replacement". What will apply do?', [
        ['Delete the repository with its images and create a new one under the new name', true],
        ['Rename the existing repository in place, keeping every image that it holds', false],
        ['Copy the images to a new repository first, then delete the old repository', false],
        ['Skip the change, because a repository rename cannot be expressed in Terraform', false],
      ], '-/+ means destroy then create. A registry cannot be renamed in place, and Terraform does not migrate contents, so every image is lost, including the one production runs. That is why the plan is reviewed and prevent_destroy guards exist.'),
      mcq('Why should Terraform state for the fraud platform live in a locked remote backend rather than a laptop or the Git repository?', [
        ['It is shared, locked against concurrent applies, and can hold sensitive values', true],
        ['Terraform refuses to run a plan when the state file sits on a local disk', false],
        ['A remote backend makes plans run faster because it caches provider plugins', false],
      ], 'Everyone and the CI job need the same state; a lock stops two applies racing; and state can contain secrets, so it must not be committed. Terraform does work with local state, and backends store state, not plugins.'),
      mcq('An engineer increased the scorer node group\'s size in the cloud console. What will the next terraform plan show?', [
        ['A change to set it back to the value in code, revealing the drift', true],
        ['Nothing, because Terraform only tracks resources that it created itself', false],
        ['An error, because state no longer matches reality and must be rebuilt', false],
      ], 'plan refreshes real values and compares them with the code, so the console edit appears as a change back to the coded value. The team then adopts it in code or lets apply revert it. Drift is not an error and needs no state rebuild.'),
    ],
    checkpoint: [
      mcq('A pull request changes the fraud model bucket\'s versioning from Enabled to Suspended, and the plan says "0 to destroy". What should the reviewer do?', [
        ['Request changes: overwritten models could no longer be recovered', true],
        ['Approve it, since a plan with nothing destroyed cannot lose any data', false],
        ['Approve it, since versioning matters only for buckets that are public', false],
      ], 'Suspending versioning means future overwrites replace objects with no history, losing rollback and audit ability. "0 to destroy" counts resources, not data protections. Versioning is about recovery, not public access.'),
      mcq('Which change belongs in Terraform for the fraud platform?', [
        ['Adding a lifecycle rule that expires non-current model versions after 90 days', true],
        ['Uploading model.joblib for version 15 into the model bucket after each training run', false],
        ['Pushing the scorer image tagged with the new commit into the registry', false],
      ], 'Terraform owns the infrastructure and its policies, such as a bucket lifecycle rule. Model artefacts and images are outputs of the training pipeline and CI; managing them as Terraform resources would tie every release to an infrastructure apply.'),
      mcq('Staging and production share one Terraform configuration. How should their state be arranged?', [
        ['Separate state per environment, so a staging apply cannot affect production', true],
        ['One shared state file for both, so the two environments always stay exactly identical', false],
        ['No state for staging, since only production resources need tracking', false],
      ], 'Separate state (different backend keys or directories) isolates the blast radius of each apply. A shared state couples them; and without state Terraform cannot know what it manages, so staging would be recreated or orphaned.'),
    ],
  },

  /* ── CONFIG_SECRETS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_CONFIG_SECRETS',
    notes: `One image of the fraud scorer runs in dev, staging and production (Year 3: one build, three environments;
the AI production unit: settings and SecretStr from the environment). What differs is **configuration**:
the model location, the decline threshold, log level, batch size and the feature-store token. This unit is
about doing that so that a wrong or missing value **fails at start-up**, a secret never leaks, and you can
**prove** what every replica is running.

## Layered settings with pydantic-settings

A base file holds what every environment shares; one file per environment overrides it; real environment
variables (from Kubernetes ConfigMaps and Secrets) override both. Secrets are never in any file.

    config/base.env      FRAUD_DECLINE_THRESHOLD=0.92   FRAUD_LOG_LEVEL=INFO   FRAUD_MAX_BATCH=64
    config/dev.env       FRAUD_MODEL_URI=file:///tmp/models/fraud/latest.joblib  FRAUD_LOG_LEVEL=DEBUG  FRAUD_DEBUG=true
    config/staging.env   FRAUD_MODEL_URI=s3://upi-risk-models-staging/fraud/v14/model.joblib
    config/prod.env      FRAUD_MODEL_URI=s3://upi-risk-models/fraud/v14/model.joblib

    import hashlib, json, os
    from typing import Literal
    from pydantic import SecretStr, model_validator
    from pydantic_settings import BaseSettings, SettingsConfigDict

    APP_ENV = os.environ.get("APP_ENV", "dev")

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_prefix="FRAUD_",
            env_file=("config/base.env", f"config/{APP_ENV}.env"),   # later files win
            extra="forbid",                 # an unknown key in a .env file is an error
            hide_input_in_errors=True,      # validation errors never echo values (secrets!)
        )
        env: Literal["dev", "staging", "prod"] = APP_ENV
        model_uri: str
        decline_threshold: float
        log_level: Literal["DEBUG", "INFO", "WARNING"] = "INFO"
        max_batch: int = 64
        debug: bool = False
        feature_store_token: SecretStr | None = None

        @model_validator(mode="after")
        def production_rules(self):
            if self.env != "dev":
                if self.debug:
                    raise ValueError("debug must be off outside dev")
                if not self.model_uri.startswith("s3://"):
                    raise ValueError("staging/prod must load the model from the registry bucket")
                if self.feature_store_token is None:
                    raise ValueError("FRAUD_FEATURE_STORE_TOKEN is required outside dev")
            return self

        def fingerprint(self) -> str:
            public = self.model_dump(exclude={"feature_store_token"})
            return hashlib.sha256(json.dumps(public, sort_keys=True).encode()).hexdigest()[:12]

Running it per environment (each line a fresh process):

    APP_ENV=dev      []                          -> dev file:///tmp/models/fraud/latest.joblib DEBUG debug= True token= None fp= c9b50bfb9e25
    APP_ENV=staging  []                          -> ValidationError: Value error, FRAUD_FEATURE_STORE_TOKEN is required outside dev
    APP_ENV=staging  ['FRAUD_FEATURE_STORE_TOKEN'] -> staging s3://upi-risk-models-staging/... INFO debug= False token= ********** fp= 7d7bf6aa980b
    APP_ENV=prod     ['FRAUD_FEATURE_STORE_TOKEN'] -> prod s3://upi-risk-models/... INFO debug= False token= ********** fp= 5a9fff2ce4bc
    APP_ENV=prod     ['FRAUD_DEBUG', ...]          -> ValidationError: Value error, debug must be off outside dev
    APP_ENV=prod     ['FRAUD_DECLINE_THRESHOLD', ...] -> prod ... fp= 694459c7c909

What this buys you:

- **Fail fast.** Staging without a token never starts; the Pod fails its start-up instead of declining
  payments at 2 am because the feature store returned 401.
- **Rules per environment in code.** Debug in production is impossible, not merely discouraged.
- **Secrets stay masked.** \`SecretStr\` prints \`**********\`; call \`.get_secret_value()\` only where the token
  is used.
- **A fingerprint.** The last line overrode the threshold to 0.85 and the fingerprint changed. Log it at
  start-up and expose it on \`/readyz\`: replicas reporting different fingerprints are running different
  configuration.

Two sharp edges were found by running this. First, \`extra="forbid"\` rejected a typo in a .env file
(\`FRAUD_DECLINE_TRESHOLD\` → "Extra inputs are not permitted"), but a misspelt **real environment
variable** was silently ignored and the default 0.92 used — so make important values required (no
default) rather than relying on typo detection. Second, without \`hide_input_in_errors=True\`, the
validation error printed \`input_value={... 'feature_store_token': 'fs-prod-91ab'}\` — the secret, in a log
line. Masking a field does not mask the error that echoes your input.

## Where secrets come from

In order of preference (Year 3 has the reasoning): fetched at runtime from a **secrets manager** (AWS
Secrets Manager, GCP Secret Manager, Vault) using the Pod's own cloud identity (on EKS, IAM roles for
service accounts or Pod Identity); or synced into a Kubernetes Secret by the **External Secrets
Operator** and injected with \`secretKeyRef\`. A plain Kubernetes Secret is base64-**encoded**, not
encrypted — anyone who can read Secrets in the namespace can read it, so restrict that with RBAC and
enable encryption at rest.

## Configuration drift

Drift is the running configuration differing from what the repository says. Its usual causes: someone
ran \`kubectl edit configmap\`; a value was changed in one environment's file but not another's; and — a
Kubernetes subtlety — **environment variables from a ConfigMap are read when the container starts**.
Edit the ConfigMap and running Pods keep the old value; Pods that restart later get the new one. The
replicas now disagree.

A drift check compares what is running with what Git says:

    fraud-scorer-7d9f-abcde OK
    fraud-scorer-7d9f-fghij DRIFT {'FRAUD_DECLINE_THRESHOLD': ('0.92', '0.85'), 'FRAUD_LOG_LEVEL': ('INFO', 'DEBUG')}

Prevent it rather than detect it: all changes by pull request; a GitOps controller (Argo CD, Flux) that
continuously applies the repository and reports differences; a **hash of the ConfigMap in the Pod
template's annotations** (Helm and Kustomize can generate it) so that changing configuration rolls the
Pods; and the threshold — a business decision — changed only through the same review and canary as a
model.`,
    workedExample: `**Problem:** after a festival weekend, the fraud team sees 3% of payments declined on some requests and
the normal 0.5% on others. Nothing was deployed. Find the cause using configuration tooling only.

**Step 1 — ask the replicas.** Each Pod exposes its settings fingerprint on \`/readyz\`:

    fraud-scorer-7d9f-abcde  fp=5a9fff2ce4bc
    fraud-scorer-7d9f-fghij  fp=d5307d26add0
    fraud-scorer-7d9f-klmno  fp=5a9fff2ce4bc

One Pod runs different configuration.

**Step 2 — diff it against Git.** The drift check prints:

    fraud-scorer-7d9f-fghij DRIFT {'FRAUD_DECLINE_THRESHOLD': ('0.92', '0.85'), 'FRAUD_LOG_LEVEL': ('INFO', 'DEBUG')}

A lower threshold declines more payments — the 3%.

**Step 3 — explain how only one Pod changed.** The cluster audit log shows a \`kubectl edit configmap
fraud-scorer-config\` on Friday night, made while debugging (threshold to 0.85, log level DEBUG). Running
Pods kept their start-up values. On Saturday one Pod was OOMKilled and restarted — and read the edited
ConfigMap. The others were never restarted.

**Step 4 — fix the incident.** Restore the ConfigMap from Git (\`kubectl apply -f\` of the repository
version), then \`kubectl rollout restart deployment/fraud-scorer -n risk\` so every Pod reads it. Confirm all
fingerprints are 5a9fff2ce4bc.

**Step 5 — fix the system.**

- Remove \`edit\` rights on ConfigMaps in the production namespace from humans; changes go through Git
  and Argo CD, which also reports the next out-of-band edit as "OutOfSync".
- Add a ConfigMap hash annotation to the Pod template so a configuration change always rolls every Pod.
- Alert when replicas of one Deployment report more than one fingerprint.
- Move the threshold behind the same review and canary as a model change — it changes who gets declined.

The lesson: configuration is part of the release. Untracked, it changes behaviour as much as a bad model
and is harder to find.`,
    mcqs: [
      mcq('A ConfigMap value used through envFrom is edited with kubectl, but the running scorer Pods keep the old value. Why?', [
        ['Environment variables are read when a container starts, not refreshed later', true],
        ['ConfigMap edits are queued and applied by Kubernetes at midnight each day', false],
        ['envFrom reads only ConfigMaps whose names end with the suffix -config', false],
      ], 'Environment variables are fixed at process start; existing containers keep their values until they restart. That is why a config change should roll the Pods (a hash annotation or rollout restart). Kubernetes has no nightly queue, and envFrom has no naming rule.'),
      mcq('The scorer\'s Settings use SecretStr for the token, yet a validation error in the logs shows the token in plain text. What fixes it?', [
        ['Set hide_input_in_errors=True so errors do not echo the input values', true],
        ['Change the field type from SecretStr to plain str so it is not special', false],
        ['Load the token from a .env file instead of from an environment variable', false],
      ], 'SecretStr masks the field when printed, but pydantic\'s error message includes the raw input dictionary unless hide_input_in_errors is set. A plain str is worse, and the source of the value does not change what the error prints.'),
      mcq('With env_prefix FRAUD_ and extra="forbid", an operator sets FRAUD_DECLINE_TRESHOLD=0.85 (a typo) as a real environment variable. What happens?', [
        ['The typo is ignored and the default threshold is used without any error', true],
        ['Start-up fails with an "Extra inputs are not permitted" validation error', false],
        ['pydantic-settings matches it to decline_threshold because it is close enough', false],
      ], 'extra="forbid" catches unknown keys in .env files, but unknown process environment variables are simply not read, so the default applies silently. That is why important values should be required, with no default. There is no fuzzy matching.'),
    ],
    checkpoint: [
      mcq('What does logging a hash of the non-secret settings at start-up let the fraud team do?', [
        ['Spot replicas of one service running different configuration at a glance', true],
        ['Encrypt the configuration so it cannot be read from the Pod spec', false],
        ['Recover the token value later on if the secrets manager is ever unavailable', false],
      ], 'Identical configuration gives an identical fingerprint, so a different value on one replica stands out immediately. A hash neither encrypts nor stores anything recoverable, and it deliberately excludes the secret.'),
      mcq('A Kubernetes Secret holds the feature-store token. Which statement about it is accurate?', [
        ['Its data is only base64-encoded; access control and encryption at rest protect it', true],
        ['Its data is encrypted with the cluster\'s key, so anyone in the team may be allowed to read it', false],
        ['It cannot be read back once created, so it is as safe as a secrets manager', false],
      ], 'base64 is an encoding, not encryption; anyone allowed to read Secrets in the namespace gets the value. RBAC restricts readers, and etcd encryption at rest must be enabled. Secrets can be read back, which is why a secrets manager with audit is preferred.'),
      mcq('Why should the fraud decline threshold be changed by pull request and canary rather than a direct ConfigMap edit?', [
        ['It changes who gets declined, so it carries the same risk as a model change', true],
        ['ConfigMaps cannot hold numbers, so the threshold must live in the image', false],
        ['Kubernetes forbids editing any ConfigMap that a running Deployment is currently using', false],
      ], 'A threshold change moves the decline rate as directly as a new model, so it deserves review, a record and a safe rollout. ConfigMaps hold strings that the app parses, and Kubernetes allows such edits — which is exactly how drift happens.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_DEBUGGING',
    notes: `Six failures from the fraud platform. For each, read the symptom, find the cause, and change only that.

## 1. The smoke test fails one run in ten

**Symptom:** \`test_training_smoke\` passes locally and fails intermittently in CI with
\`assert 0.58 > 0.6\`. Re-running "fixes" it, so people now re-run until green.

**Cause:** the test generated data with \`make_upi_transactions(2000)\` and no seed, and the model had no
\`random_state\`. With about 3.5% fraud, 2,000 rows hold about 70 positives; AUC on that few varies
between runs.

**Fix:** seed the data and the model (\`seed=1\`, \`random_state=0\`), so the test is deterministic, and
keep the bar at "learned something". A flaky test is worse than none: it trains people to ignore red.

## 2. The workflow never triggers on pull requests

**Symptom:** a new workflow file runs on push to main but never on pull requests. A teammate's
validation script, which loads the YAML with PyYAML and reads \`wf["on"]\`, raises \`KeyError: 'on'\`.

**Cause:** two different bugs. The workflow had \`pull_request\` nested under \`push:\` by indentation, so
GitHub saw only a push trigger. The script's KeyError is a separate trap: PyYAML follows YAML 1.1, where a
bare \`on\` is the boolean **True**. Parsing the real workflow showed:

    top-level keys: ['name', True, 'concurrency', 'permissions', 'jobs']

**Fix:** put \`pull_request\` and \`push\` at the same level under \`on:\`; in the script read
\`wf.get("on", wf.get(True))\`. GitHub's own parser handles \`on\` correctly — this is only a trap for
your tooling.

## 3. Every Pod is in CrashLoopBackOff after a model upgrade

**Symptom:** after moving from a 150 MB to a 600 MB model, Pods restart every 40 seconds; events say
"Liveness probe failed: connection refused".

**Cause:** liveness started 10 s after start with three 10 s failures allowed; loading now takes 75 s,
so the kubelet kills the container mid-load, forever.

**Fix:** add a \`startupProbe\` (24 × 5 s = 120 s) that holds off liveness and readiness until the app has
started. Do not increase the liveness delay: that hard-codes today's load time into the wrong probe.

## 4. The HPA never scales

**Symptom:** at the evening peak latency climbs, but \`kubectl get hpa\` shows \`cpu: <unknown>/60%\` and
three replicas.

**Cause:** the container had a memory request and limit but **no CPU request**. Utilisation is usage
divided by the request, so there is nothing to compute. (If every HPA in the cluster showed
\`<unknown>\`, the metrics-server would be the suspect instead.)

**Fix:** add \`requests: {cpu: "500m"}\` measured from load tests. The offline manifest check in CI now
rejects any Deployment with an HPA and no CPU request.

## 5. The canary "passed", then the full rollout raised declines

**Symptom:** a canary at 5% ran for an hour with decline rate equal to stable; at 100% declines doubled.

**Cause:** the canary routed by \`hash(merchant_id)\`, and the hash put almost all large-merchant traffic
in the stable arm. The new model's problem was with high-value payments, which the canary barely saw.

**Fix:** route by user (or payment) hash so each arm is a fair sample, check per-slice decline rates
(amount bands, new device) in the canary window, not just the overall rate, and run steps long enough to
cover the evening peak.

## 6. The token appears in the log aggregator

**Symptom:** a security scan finds the production feature-store token in logs from a failed start-up.

**Cause:** the settings validator raised \`debug must be off outside dev\`, and pydantic's error message
included \`input_value={... 'feature_store_token': 'fs-prod-91ab'}\`. \`SecretStr\` masks the field when it
is printed, not the raw input inside a validation error.

**Fix:** \`hide_input_in_errors=True\` in \`SettingsConfigDict\` (the error then reads
\`Value error, debug must be off outside dev [type=value_error]\`), rotate the leaked token at once, and
add a log-scanning rule for token patterns.`,
    mcqs: [
      mcq('A training smoke test fails about one run in ten with an AUC just under the threshold, and re-running makes it pass. What is the right fix?', [
        ['Seed the data and the model so every run computes the same result', true],
        ['Lower the threshold until the test no longer fails on any run', false],
        ['Mark the test as allowed to fail so it no longer blocks merges', false],
        ['Retry the test automatically up to three times inside the CI job', false],
      ], 'The flakiness comes from unseeded randomness on a small sample. Seeding makes it deterministic while keeping the check meaningful. A lower threshold, an allowed failure or automatic retries hide the problem and teach the team to ignore red builds.'),
      mcq('A validation script loads a GitHub Actions workflow with yaml.safe_load and gets KeyError on wf["on"]. What is happening?', [
        ['PyYAML reads the bare key on as the boolean True, as YAML 1.1 specifies', true],
        ['The workflow file is invalid, because GitHub requires the key to be quoted', false],
        ['safe_load skips any key that matches a Python keyword or a builtin', false],
      ], 'Under YAML 1.1 rules, on, yes and off are booleans, so the key becomes True. GitHub parses it as a string, so the workflow is fine; the script must read wf.get(True). on is not a Python keyword, and safe_load does not skip keys.'),
      mcq('A 5% canary showed no change in decline rate, but the full rollout doubled declines on high-value payments. Canary routing used a hash of merchant id. What went wrong?', [
        ['The canary arm was not a fair sample, so it barely saw high-value payments', true],
        ['5% is always too small for any canary to detect a doubling of declines', false],
        ['The model needed more time to warm up its cache before taking real traffic', false],
      ], 'Routing by merchant concentrated large merchants in one arm, so the canary never exercised the failing slice. Route by user or payment and compare per-slice rates. 5% can detect a doubling if the arm is representative, and warm-up does not explain a slice-specific rise.'),
      mcq('kubectl get hpa shows cpu <unknown>/60% for the scorer, while other services\' HPAs show real numbers. Which cause is most likely?', [
        ['The scorer container has no CPU request to measure usage against', true],
        ['The cluster metrics-server is down and is not reporting any Pod usage', false],
        ['The scorer Deployment has more replicas than the HPA maxReplicas value', false],
      ], 'Other HPAs work, so metrics-server is up; the scorer-specific cause is the missing CPU request, which utilisation needs as its denominator. Replica counts above max would be scaled down, not shown as unknown.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_PRACTICE',
    notes: `Ten exercises, from quick to involved. Answer each before reading the answer.

## 1. A boundary test (easy)

\`new_payee\` is 1 when \`payee_age_days < 3\`. Write the smallest test that would catch someone changing
\`<\` to \`<=\`.

**Answer:** assert the value at 2 is 1 and at 3 is 0. The change flips only day 3, so the day-3 assertion
fails. Testing 0 and 100 would miss it.

## 2. Order the jobs (easy)

A workflow has jobs \`lint\`, \`unit\`, \`smoke-train\`, \`gate\`, \`build-image\`. Which \`needs:\` lines make the
image build only after the gate passes, while lint and unit run in parallel?

**Answer:** \`smoke-train: needs: [lint, unit]\`, \`gate: needs: smoke-train\`, \`build-image: needs: gate\`.
Lint and unit have no \`needs\`, so they start together.

## 3. Write the gate rule (medium)

The champion's recall at 1% FPR is 0.612. The risk team allows at most a 2-point drop and never below
0.55. Which candidate values pass: 0.600, 0.590, 0.540?

**Answer:** 0.600 passes (drop 0.012). 0.590 fails (drop 0.022 > 0.02). 0.540 fails both rules.

## 4. Canary arithmetic (medium)

Peak traffic is 2,000 scoring requests a minute. The rollback rule needs at least 300 canary requests
in a 5-minute window. What is the smallest useful canary share?

**Answer:** 300 ÷ 5 = 60 a minute; 60 ÷ 2,000 = 3%. Below 3% a step cannot decide within one window.
Off-peak traffic is lower, so either use a higher share or longer windows at night.

## 5. HPA arithmetic (easy)

Six Pods at 45% CPU, target 60%, minReplicas 3. What does the HPA want?

**Answer:** ceil(6 × 45 ÷ 60) = ceil(4.5) = 5, applied after the scale-down stabilisation window.

## 6. Probe settings (medium)

A model takes up to 150 s to load. Write a startup probe with a 5 s period.

**Answer:** \`failureThreshold\` at least 30 (30 × 5 = 150 s); use 36 for headroom (180 s). Liveness stays
light and only starts after the startup probe passes.

## 7. Read the plan (medium)

A plan shows \`~ resource "aws_eks_node_group"\` with \`~ instance_types = ["m6i.large"] -> ["m6i.xlarge"]
# forces replacement\` and the summary "1 to add, 0 to change, 1 to destroy". What happens to running
Pods, and what would you ask?

**Answer:** the node group is replaced: nodes are drained and Pods move to new nodes. Ask whether the
PodDisruptionBudget keeps at least the minimum scorer Pods running and whether it is scheduled off-peak.
Safer still: add a new node group, move workloads, then remove the old one in a second change.

## 8. Choose the pattern (medium)

(a) A credit-card company's monthly statement insights for 60 lakh customers. (b) A food-delivery app's
"estimated delivery time" on the checkout screen. (c) Flagging a merchant whose refund rate spikes in the
last 15 minutes.

**Answer:** (a) batch — known set, monthly freshness. (b) online — the user waits. (c) streaming —
nobody waits, but minutes matter.

## 9. Which value wins? (easy)

\`base.env\` has \`FRAUD_LOG_LEVEL=INFO\`, \`prod.env\` has nothing for it, and the Deployment sets the
environment variable \`FRAUD_LOG_LEVEL=WARNING\`. What does production run with?

**Answer:** WARNING. Real environment variables beat .env files, and later .env files beat earlier ones.

## 10. Spot the drift risk (hard)

A team mounts their ConfigMap as a file under \`/etc/fraud/\` instead of \`envFrom\`, saying "now edits apply
without restarts". What is still wrong?

**Answer:** files mounted from a ConfigMap update eventually (not with \`subPath\`), but only if the app
re-reads them, and Pods update at slightly different times, so replicas disagree for a while. A
threshold change also skips review and canary. Keep changes in Git, roll Pods deliberately, and log the
fingerprint.`,
    mcqs: [
      mcq('A canary rule needs 300 requests per 5-minute window, and the off-peak night traffic is 500 requests a minute. What is the smallest canary share that can decide in one window?', [
        ['12%', true],
        ['3%', false],
        ['6%', false],
        ['60%', false],
      ], '300 ÷ 5 = 60 canary requests a minute; 60 ÷ 500 = 12%. The 3% answer uses peak traffic of 2,000 a minute, 6% halves the requirement, and 60% treats 300 as a per-minute requirement.'),
      mcq('The HPA for the scorer sees six Pods at 45% CPU against a 60% target, with minReplicas 3. What replica count will it settle on?', [
        ['5', true],
        ['3', false],
        ['4', false],
        ['6', false],
      ], 'ceil(6 × 45 ÷ 60) = ceil(4.5) = 5, after the scale-down stabilisation window. 3 is the floor, not the computed value; 4 rounds down; 6 ignores the low utilisation.'),
      mcq('Which pair of test values catches a change of new_payee from "payee_age_days < 3" to "payee_age_days <= 3"?', [
        ['2 expecting 1, and 3 expecting 0', true],
        ['0 expecting 1, and 100 expecting 0', false],
        ['1 expecting 1, and 2 expecting 1', false],
      ], 'The change only alters the result at exactly 3, so the test must include 3 (expecting 0) and a value just below. Values far from the boundary, or both below it, give the same answers before and after the change.'),
      mcq('A plan replaces the scorer\'s node group because its instance type changed. What is the safest way to make this change?', [
        ['Add a new node group, move the workloads, then remove the old group', true],
        ['Apply the plan at the evening peak so that problems are noticed quickly', false],
        ['Delete the old node group by hand in the console, then apply the plan', false],
      ], 'Creating the new group first keeps capacity throughout, and the old one is removed in a separate reviewed change. Doing it at peak maximises impact, and console deletions create drift and remove capacity before the replacement exists.'),
      mcq('base.env sets FRAUD_LOG_LEVEL=INFO, prod.env omits it, and the Pod has FRAUD_LOG_LEVEL=WARNING in its environment. Which level does the production scorer use?', [
        ['WARNING', true],
        ['INFO', false],
        ['DEBUG', false],
      ], 'pydantic-settings gives real environment variables priority over values from .env files, so WARNING wins. INFO would apply only if no environment variable were set, and DEBUG appears only in dev.env.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_INTERVIEW_QUESTION',
    notes: `Four questions that MLOps and ML platform interviews in Bengaluru and Hyderabad actually ask, with a model
answer and the follow-up a good answer earns.

## 1. "Walk me through CI/CD for an ML model you would build."

**Model answer:** "Two pipelines. CI on every pull request, under ten minutes: lint, unit tests on feature
functions with boundary values, a data-contract test with a pandera schema on a fixture — including a
negative test — and a seeded training smoke test with a save/load round trip. On merge, a training job on
pinned data produces a candidate with its metrics, and an evaluation gate compares it with the champion on
floors, maximum drops and slices, exiting non-zero to block. A passing candidate is registered and its
image built once, tagged by commit. CD then runs shadow, a canary ladder with an automatic rollback rule,
and promotion by moving the registry alias. Rollback is moving the alias or \`kubectl rollout undo\`, which
I would rehearse."

**Follow-up:** "Your gate passes, the canary passes, and two weeks later fraud losses are up. How?"
**Strong answer:** labels arrive late, so the canary judged on proxies; the evaluation set may not reflect
a new fraud pattern; or a slice not in the gate regressed. Fix: monitor recall as chargebacks arrive, add
the slice to the gate, and refresh the evaluation set on a schedule.

## 2. "A model takes two minutes to load. How do you run it on Kubernetes?"

**Model answer:** "A startupProbe that allows at least two minutes, so liveness doesn't kill it while
loading; readiness that returns 503 until the model is loaded and a test prediction succeeds, so the
Service routes nothing to it early; a trivial liveness that checks only the process. Memory request and
limit from measured peak — counting every worker, since each loads a copy. Rolling update with
maxUnavailable 0 so capacity holds, and an HPA with enough minimum replicas to absorb a spike while new
Pods take two minutes to become ready."

**Follow-up:** "Why not just scale from zero to save money?" **Strong answer:** a two-minute cold start
means the first requests wait or fail; for a payment path that is unacceptable. Scale-to-zero suits
batch or rarely called internal models; for those, the start-up cost is fine.

## 3. "Online, batch or streaming — how do you decide?"

**Model answer:** "Who waits, how fresh, and are the inputs known in advance. A payment fraud score —
someone waits, the payment does not exist beforehand — online. Pre-approved offers for every borrower —
nobody waits, daily is fine, set is known — batch, which is cheapest and easiest to rerun. Refund-spike
alerts — nobody waits but minutes matter — streaming. Often a hybrid: heavy features computed in batch or
streaming, stored, and a small online model. Then I size online with Little's law at the peak."

**Follow-up:** "The batch job takes nine hours and must finish in four." **Strong answer:** profile first;
then score in large batches rather than row by row, parallelise across workers or partitions, read only
needed columns, use spot nodes, and skip entities whose inputs did not change since the last run.

## 4. "How do you manage configuration and secrets across environments?"

**Model answer:** "One image everywhere. Settings from the environment, validated at start-up with
pydantic-settings: required values have no default, environment-specific rules in code — no debug in
production. Secrets from a secrets manager through the Pod's identity or External Secrets, never in
images, files or Git; masked in logs, including in validation errors. All changes by pull request and
GitOps; a ConfigMap hash in the Pod template so changes roll Pods; a fingerprint of non-secret config
exposed by each replica to detect drift."

**Follow-up:** "Someone hot-fixed a threshold with kubectl during an incident. Now what?" **Strong
answer:** restore from Git or commit the change properly, roll all Pods so replicas agree, write it up in
the incident review, and remove direct edit access in production so the next fix goes through the
pipeline — a fast path in Git, not around it.`,
    mcqs: [
      mcq('An interviewer asks why a canary that passed did not reveal a fraud model that lost recall. Which answer shows the best understanding?', [
        ['Chargeback labels arrive weeks later, so the canary could judge only proxy signals', true],
        ['The canary was too short, and any canary run for a full day reveals recall changes', false],
        ['Canaries only measure latency, so they can never show anything about model quality', false],
      ], 'Fraud outcomes are known only when chargebacks arrive, so a canary uses proxies (decline rate, score distribution) and recall must be confirmed by monitoring later. A day is still far too short for chargebacks, and canaries do measure decision behaviour, not just latency.'),
      mcq('In an interview you propose scale-to-zero for a payment fraud model with a two-minute load time. What is the strongest objection?', [
        ['The first payments after idle would wait minutes or fail on the payment path', true],
        ['Kubernetes cannot scale any Deployment below one replica in any configuration', false],
        ['Scale-to-zero needs a GPU node, which fraud models do not normally run on', false],
      ], 'A cold start of two minutes is unacceptable when a payment waits on the score. Scale-to-zero exists (KServe, KEDA) and needs no GPU, but it suits batch or rarely used internal models where a slow first call is acceptable.'),
      mcq('Asked how to bring a nine-hour batch scoring job under four hours, which first step does a strong candidate give?', [
        ['Profile the job to find where the time goes before changing anything', true],
        ['Move the job to a GPU node, since GPUs make all scoring faster', false],
        ['Convert it into an online API that scores each customer on request', false],
      ], 'Without profiling you may optimise the wrong step — often row-by-row scoring or reading unneeded columns. A GPU does not help a small tabular model, and an online API changes the product and its cost rather than fixing the job.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_CICD_INFRA_CHECKPOINT',
    notes: `Ten questions across the topic: CI for ML code, gated and canaried releases, Kubernetes for a model server,
serving patterns and sizing, Terraform, and configuration and secrets. Several give numbers or a log
line; work the answer out before reading the options.`,
    checkpoint: [
      mcq('Which check belongs in pull-request CI for a fraud model, rather than in the release gate on the full evaluation set?', [
        ['A seeded smoke test that trains on 2,000 rows and reloads the saved model', true],
        ['A comparison of slice recall with the champion on 18 months of labels', false],
        ['A week-long shadow run that compares live decline rates with the champion', false],
      ], 'PR CI must be fast and deterministic, so it checks that training still runs and the artefact reloads. Slice comparison on full labelled data is the release gate\'s job, and shadow runs happen after deployment.'),
      mcq('A gate prints "slice night: recall fell 0.041" and exits with status 1. What happens next in a correctly built pipeline?', [
        ['The jobs that depend on the gate do not run, so nothing is released', true],
        ['The model is released with a warning attached to the registry entry', false],
        ['The pipeline retrains with a new seed until the slice check passes', false],
      ], 'A non-zero exit fails the step, and dependent jobs (registering, building, deploying) are skipped. A warning that still releases defeats the gate, and retraining until it passes is fishing for a lucky result.'),
      mcq('At 1,500 scoring requests a minute, a canary step at 2% must collect 300 requests per decision. How long is each decision window at minimum?', [
        ['10 minutes', true],
        ['2 minutes', false],
        ['5 minutes', false],
      ], '2% of 1,500 is 30 canary requests a minute, so 300 needs 10 minutes. Shorter windows hold 60 or 150 requests, too few for the rule to decide.'),
      ck(K8S, 'A scorer Pod shows "Reason: OOMKilled" and exit code 137 after a release that raised Uvicorn workers from 1 to 3. What is the fix?', [
        ['Raise the memory limit to cover every worker\'s model copy, or go back to fewer workers', true],
        ['Raise the CPU limit instead, because exit code 137 means the container ran out of CPU time', false],
        ['Add a readiness probe, because the Pod received traffic before the model was loaded', false],
      ], 'Each worker process loads its own copy of the model, so tripling workers roughly triples memory past the limit. Exit 137 with OOMKilled is the memory limit; CPU limits throttle rather than kill, and readiness does not change memory use.'),
      ck(K8S, 'Which probe should answer "has the model finished loading?" for a server that needs 90 seconds to start?', [
        ['A startupProbe, which holds off the liveness and readiness checks until it succeeds', true],
        ['A livenessProbe with a long initial delay, so that slow model loads are never restarted', false],
        ['No probe at all, because Kubernetes waits for the container process to settle', false],
      ], 'The startup probe exists for slow starts and disables the others until it passes. A long liveness delay hard-codes load time into the wrong check, and without probes Kubernetes routes traffic the moment the container starts.'),
      ck(CLOUD, 'A lender scores 40 lakh borrowers for pre-approved offers that the app shows when it opens. Which design is cheapest and simplest?', [
        ['A nightly batch job writing scores to a table that the app reads', true],
        ['An online endpoint the app calls for a fresh score on every open', false],
        ['A streaming job scoring each borrower whenever any event arrives', false],
      ], 'The set is known, freshness of a day is fine and nobody waits on the computation, so batch scoring in large chunks is cheapest and easy to rerun. Online scoring recomputes the same answer many times on always-on capacity, and streaming adds complexity for no gain.'),
      ck(IAC, 'A Terraform plan summary reads "Plan: 1 to add, 0 to change, 1 to destroy" for a change that only renamed a resource block in code. What prevents the destroy?', [
        ['A moved block mapping the old address to the new one', true],
        ['Running terraform apply twice so the second run undoes it', false],
        ['Deleting the state file so Terraform forgets the old name', false],
      ], 'A moved block tells Terraform the object is the same, only its address changed, so it updates state instead of destroying and recreating. A second apply cannot undo a deletion, and deleting state makes Terraform try to create everything again.'),
      ck(IAC, 'Who should run terraform apply for production changes to the fraud platform?', [
        ['CI, applying the reviewed saved plan with a role, after an approval', true],
        ['The engineer who wrote the change, from their laptop, after merging', false],
        ['Anyone on the team, as long as they apply during office hours', false],
      ], 'Applying the saved, reviewed plan from CI ensures what was approved is what runs, with an auditable identity and no personal credentials. Laptop applies may use a different plan, different versions and broad personal access.'),
      ck(CFG, 'The scorer\'s replicas report two different settings fingerprints after nobody deployed anything. What is the most likely explanation?', [
        ['The ConfigMap was edited, and only Pods restarted since then read the new values', true],
        ['The fingerprint is random per Pod, so different values are expected and normal', false],
        ['Two different images are running, since config cannot differ within one image', false],
      ], 'Environment variables from a ConfigMap are read at start, so an edit reaches only Pods that restart afterwards and replicas disagree. The fingerprint is a deterministic hash of settings, and one image can run with different configuration — that is the point of external config.'),
      ck(CFG, 'Which setting stops a missing feature-store token from surfacing as failed payments at 2 am rather than at deploy time?', [
        ['A required field, validated by pydantic-settings when the service starts', true],
        ['A default token value in the image, replaced later by the real one', false],
        ['A try/except around each feature-store call that logs the failure and carries on', false],
      ], 'Making the token required (and checked by an environment rule) fails start-up, so the Pod never becomes ready and the release stops. A default token is a secret in the image, and catching the error per call only moves the failure to customer traffic.'),
    ],
  },
];
