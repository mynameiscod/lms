/**
 * Career-track content: ML Pipelines, Versioning and Reproducibility (MLOPS_PIPELINES), the AI tracks, batch AI4.
 *
 * The first MLOps topic. DS_DEPLOYMENT already taught saving a model safely (skops), MLflow tracking with a data hash,
 * a registry alias and the 2-to-3 changes, PSI drift and Docker; DS_ML_WORKFLOW taught scikit-learn Pipelines, splits
 * and leakage. This topic does not re-teach them. It is about the layer around one training run: versioning data with
 * DVC, pipelines as cached stages, reproducible runs, the registry as a promotion process, validation gates, and
 * features computed identically in training and serving.
 *
 * One model runs through the topic: a personal-loan credit-risk model for an NBFC (make_loans(): 8,000 synthetic
 * applications, a time split at 2025-10-01, StandardScaler + OneHotEncoder + LogisticRegression). Every output shown
 * was produced by running the code with DVC 3.67, MLflow 3.17 on a local SQLite store, pandera 0.35, Prefect 3.9,
 * scikit-learn 1.9.1, pandas 3.0.6 and NumPy 2.5.4 on a Windows laptop (paths printed by DVC are shown with forward
 * slashes). Feast and Great Expectations were not run: feature stores are taught conceptually, with point-in-time
 * correctness shown as a runnable pandas merge_asof example. Airflow appears only in outline.
 *
 * Three skills: ML_PIPELINES (default), MODEL_VERSIONING (DATA_VERSIONING, MODEL_REGISTRY) and EXPERIMENT_TRACKING
 * (REPRODUCIBLE_TRAINING), following trackSkillAttribution.ts. Checkpoint questions name their skill with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PIPE = 'ML_PIPELINES';
const VER = 'MODEL_VERSIONING';
const EXP = 'EXPERIMENT_TRACKING';

export const TRACK_MLOPS_PIPELINES_BUNDLES: PilotBundle[] = [
  /* ── DATA_VERSIONING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_DATA_VERSIONING',
    notes: `An NBFC in Pune scores personal-loan applications with a model trained in March. In August the RBI's
inspection team asks a fair question: "Show us how the model that rejected this applicant was built." The code is in
Git. The data was \`loans_final_v3_FIXED.csv\` on somebody's laptop, since overwritten twice. Nobody can rebuild the
model, so nobody can explain it. A model is a function of **code + data + configuration + environment**; Git versions
only the first. This unit versions the second.

## Why Git alone does not work

Git stores every version of every file in full history and diffs text line by line. A 500 MB Parquet file changed
weekly makes the repository unusable within a month, and GitHub refuses files over 100 MB. Git LFS moves the bytes to
a server but is tied to your Git host's storage and quota, and knows nothing about pipelines. Copying folders with
dates in their names loses the link between a model and its data — the thing the auditor asked for.

## DVC: Git for the pointer, storage for the bytes

**DVC** (Data Version Control) keeps a small text file in Git that points at the data by its **content hash**, and
keeps the data itself in a cache and a **remote** (S3, GCS, Azure Blob, an SSH box, or a shared folder). Start in an
existing Git repository:

    git init && dvc init                 # creates .dvc/ (config, cache settings); commit it
    python make_loans.py data/raw/loans.csv
    dvc add data/raw/loans.csv

    8000 rows, default rate 0.148
    To track the changes with git, run:
        git add data/raw/.gitignore data/raw/loans.csv.dvc

\`dvc add\` hashed the file, moved a copy into \`.dvc/cache\`, and wrote two small files. The pointer
\`data/raw/loans.csv.dvc\` is:

    outs:
    - md5: c32f5763409bd7f0855bd81e62eb7baf
      size: 563776
      hash: md5
      path: loans.csv

and \`data/raw/.gitignore\` now contains \`/loans.csv\`, so Git never sees the bytes. Commit the pointer, tag it, and
send the bytes to the remote:

    dvc remote add -d storage s3://nbfc-ml-data/credit-risk     # here: a local folder
    git add data/raw/loans.csv.dvc data/raw/.gitignore .dvc/config
    git commit -m "loans v1" && git tag data-v1
    dvc push

    1 file pushed

In the remote the file is stored under its hash (\`files/md5/c3/2f5763...\`). Identical content is stored once,
whatever it is called, so ten branches pointing at the same data cost nothing extra.

## Changing the data, and going back

Next month the warehouse export grows to 9,000 rows. Overwrite the file, then:

    dvc add data/raw/loans.csv          # new hash written into loans.csv.dvc
    git commit -am "loans v2" && git tag data-v2 && dvc push

To rebuild last month's model you need last month's data. Two steps, always both:

    git checkout data-v1 -- data/raw/loans.csv.dvc    # the pointer goes back
    dvc checkout                                       # the bytes follow the pointer
    M       data/raw/loans.csv
    wc -l data/raw/loans.csv  ->  8001

\`git checkout\` alone moves only the pointer; the workspace still holds the 9,000-row file and \`dvc status\` reports
\`modified: data/raw/loans.csv\`. That mismatch is the commonest DVC mistake — and the reason many teams add the
\`post-checkout\` hook from \`dvc install\`, which runs \`dvc checkout\` for you.

A teammate with a fresh clone runs \`git clone ... && dvc pull\` and gets exactly the bytes the pointer names; we ran
it and DVC printed \`5 files fetched and 4 files added\` (the raw data plus the pipeline outputs of the next unit).

## Tying a model to its data

Versioning data is only useful when every model records **which** data it came from. Three habits:

- **Commit the pointer in the same commit as the code that trained on it.** Then one Git SHA names code and data.
- **Track the model file with DVC too** (\`dvc add models/model.skops\`, or as a pipeline output — next unit), so
  the artefact is versioned the same way.
- **Log the data hash and the Git commit with the run** (you logged a SHA-256 of the file in the DS deployment
  unit). With DVC the md5 in the \`.dvc\` file is the canonical ID — log that one so the run and the repository agree.

With all three, "how was this model built?" has a mechanical answer: commit \`fc49ee0\` → \`loans.csv.dvc\` md5
\`c32f5763…\` → \`dvc checkout\` → the exact rows.

## What DVC is not

- **Not a database or a lake.** It versions files and directories. For tables that change by row, use the
  warehouse's own time travel (Delta Lake, Iceberg, BigQuery snapshots) and record the snapshot ID instead — the
  same idea, a pointer that names immutable data.
- **Not access control.** Whoever can read the remote bucket can read every version. Personal data under the DPDP
  Act needs bucket permissions, encryption and a retention plan; a deleted customer's row survives in old versions
  unless you purge them, which is a deliberate, documented operation.
- **Not free of storage cost.** Every version of a 2 GB file is another 2 GB. Version the raw extracts and the
  final model; let intermediate files be regenerated by the pipeline (next unit) rather than pushed by hand.

## Opinions worth holding

Version **raw** data that you cannot regenerate, never the cleaned copy you can. Keep the remote in the same cloud
account as training. Name tags after what changed (\`data-2025-09-bureau-refresh\`), not \`final2\`. And make
\`dvc pull && dvc repro\` the only documented way to build a model, so the rebuild is tested every day rather than
discovered to be impossible during an audit.`,
    workedExample: `**Task: an auditor names application APP104217, rejected on 14 August by model version 7. Rebuild that model
and show its training data.**

**Step 1 — From the model to the run.** The registry entry for version 7 has a \`run_id\`; the run's tags hold
\`git_commit = 3e1a9c2\` and \`data_md5 = 9b51…\`. (No such tags? Then this is the first fix to make, before anything
else.)

**Step 2 — From the commit to the data.** \`git checkout 3e1a9c2\` restores the code, \`params.yaml\` and the
pointer \`data/raw/loans.csv.dvc\`. Check the pointer's md5 equals the run's \`data_md5\`: if it does not, the run was
trained on uncommitted data and the trail is broken — say so plainly in the audit response.

**Step 3 — Fetch the bytes.** \`dvc pull\` downloads the file the pointer names from the remote. If the remote
has been cleaned with \`dvc gc\` and the version is gone, nothing can rebuild it; this is why \`gc\` is run only with
\`--all-tags --all-commits\` and why release tags are never deleted.

**Step 4 — Rebuild and compare.** Run the training command recorded for that commit (\`dvc repro\`), score
APP104217, and compare the probability with the one logged at decision time. Equal to several decimals: you have
reproduced the decision. Different: the environment differs (next-but-one unit) — compare library versions.

**Step 5 — Answer the question asked.** The rows used for training, the features the applicant had, the score,
the threshold, and the commit that implemented the policy — all from immutable, named versions.

**What to say:** "Every model version points to a commit, and every commit points to its data by hash. I
checked out the commit, pulled the data, rebuilt the model and reproduced the score the applicant received."`,
    mcqs: [
      mcq('After `git checkout data-v1 -- data/raw/loans.csv.dvc`, `dvc status` reports `modified: data/raw/loans.csv`. What has happened?', [
        ['The pointer is back at v1 but the workspace still holds the v2 bytes until dvc checkout', true],
        ['The v1 data has been deleted from the cache, so DVC can no longer restore that version', false],
        ['Someone edited loans.csv by hand after the checkout, which DVC reports as a modification', false],
        ['Git restored the v1 bytes but DVC has not yet recomputed the md5 hash of the restored file', false],
      ], 'Git versions only the small .dvc pointer. The data follows the pointer when you run dvc checkout (or dvc pull on a fresh clone); until then the workspace file and the pointer disagree.'),
      mcq('Why do teams keep a 600 MB weekly Parquet extract in DVC instead of committing it to Git?', [
        ['Git keeps every full version in history and hosts reject large files; DVC keeps only a hash in Git', true],
        ['Git cannot store binary files at all, so Parquet must go through DVC or it is silently dropped', false],
        ['DVC compresses Parquet to a tenth of its size, which Git has no way of doing for binary content', false],
        ['Committing data to Git breaks the scikit-learn pipeline because Git changes the line endings', false],
      ], 'Git can store binaries, but every version stays in history forever and hosts cap file size. DVC puts a content-hash pointer in Git and the bytes in a remote, de-duplicated by hash.'),
      mcq('A team runs `dvc gc --workspace` to free space in the remote, then cannot rebuild the model behind last quarter\'s release. Why?', [
        ['gc removed every cached version not used by the current workspace, including the release\'s data', true],
        ['gc rewrote the hashes in every old .dvc file, so the pointers no longer match the remote objects', false],
        ['gc only clears the local cache, so the cause must be someone deleting the bucket by mistake', false],
        ['gc changes the remote layout, and older versions of DVC can no longer read the new folder names', false],
      ], 'Garbage collection keeps only what the named scope references. Scoped to the workspace, it deletes old versions; release data survives only if gc keeps all tags and commits (and you push before running it).'),
    ],
    checkpoint: [
      ck(VER, 'A data scientist overwrites `data/raw/loans.csv`, retrains and commits only `train.py`. Which part of the model\'s history is now unrecoverable?', [
        ['Which rows the model was trained on, because no new pointer was added or committed', true],
        ['The code that trained it, because DVC removes train.py from Git when the data changes', false],
        ['The hyperparameters, because they are stored only inside the DVC cache and not in Git', false],
        ['Nothing at all, because DVC records every overwrite of a tracked file automatically', false],
      ], 'DVC versions a file only when you run dvc add (or a pipeline stage) and commit the new pointer. An overwrite with no new pointer leaves the old hash in Git and the new bytes unrecorded.'),
      ck(VER, 'Which record lets you rebuild the exact training data of registered model version 7?', [
        ['The run\'s Git commit, whose .dvc pointer holds the data hash, plus a remote that still has it', true],
        ['The filename of the CSV logged as a parameter, together with the date the run was started', false],
        ['The test AUC logged to the run, which identifies the data because no two datasets match it', false],
        ['The pickle of the model, since a fitted model contains a copy of the rows it was trained on', false],
      ], 'Filenames are reused and metrics do not identify data. A commit pins the pointer, the pointer pins the bytes by content hash, and the remote must still hold that object.'),
      ck(VER, 'Two branches each add the same 2 GB bureau file under different names. How much does the DVC remote store?', [
        ['About 2 GB once, because objects are addressed by the hash of their content', true],
        ['About 4 GB, one full copy for each path that points at the file in a branch', false],
        ['Nothing extra, since DVC stores only the difference from the previous file', false],
        ['About 2 GB per branch per commit, as DVC snapshots the whole data directory', false],
      ], 'DVC is content-addressed: identical bytes hash identically and are stored once, whatever the paths. It does not store diffs, so a changed file is stored again in full.'),
    ],
  },

  /* ── PIPELINE_DESIGN ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_PIPELINE_DESIGN',
    notes: `The credit-risk model began as a notebook: load, validate, add features, split, train, evaluate — 40 cells run
top to bottom, most of the time. Notebooks hide three problems: cells run out of order, every change reruns
everything (or, worse, only what you remembered to rerun), and nobody can schedule a notebook reliably at 2 a.m. A
**pipeline** fixes all three by making each step a **stage** with declared inputs and outputs.

## Stages, dependencies and a DAG

Split the notebook into scripts, each reading files and writing files:

| Stage | Reads | Writes |
|---|---|---|
| validate | \`data/raw/loans.csv\` | \`reports/validation.json\` |
| prepare | raw data, validation report, \`prepare.test_from\` | \`data/prepared/\` (train and test Parquet) |
| train | \`train.parquet\`, the \`train\` params | \`models/model.skops\` |
| evaluate | model, \`test.parquet\`, \`evaluate.min_auc\` | \`reports/metrics.json\` |

The arrows from outputs to inputs form a **directed acyclic graph**. Two rules make it work: a stage reads only what
it declares, and it writes only its own outputs. A script that quietly reads \`config.json\` it did not declare will
not rerun when that file changes — the cache will serve a stale model.

## The pipeline in DVC

Parameters live in \`params.yaml\`, never as constants edited inside scripts:

    prepare:
      test_from: "2025-10-01"
    train:
      C: 1.0
      seed: 42
    evaluate:
      min_auc: 0.70

and \`dvc.yaml\` declares the stages (two shown; validate and evaluate follow the same pattern):

    stages:
      prepare:
        cmd: python src/prepare.py
        deps: [src/prepare.py, data/raw/loans.csv, reports/validation.json]
        params: [prepare.test_from]
        outs: [data/prepared]
      train:
        cmd: python src/train.py
        deps: [src/train.py, data/prepared/train.parquet]
        params: [train]
        outs: [models/model.skops]

Note the **script itself** is a dependency: change the code and the stage reruns. \`evaluate\` writes its numbers
under \`metrics:\` with \`cache: false\`, so the small JSON stays in Git where a diff can show it. \`dvc repro\` runs
whatever is out of date:

    Running stage 'validate':   validation ok: 8000 rows
    Running stage 'prepare':    train 6058 rows, test 1942 rows
    Running stage 'train':      trained on 6058 rows
    Running stage 'evaluate':   test AUC 0.7694
    Generating lock file 'dvc.lock'

\`dvc.lock\` records the md5 of every dependency, parameter value and output of the run. Commit it: it is the exact
recipe of this model. Run \`dvc repro\` again with nothing changed:

    Stage 'validate' didn't change, skipping
    Stage 'prepare' didn't change, skipping
    Stage 'train' didn't change, skipping
    Stage 'evaluate' didn't change, skipping
    Data and pipelines are up to date.

Now raise the gate to \`min_auc: 0.72\`. Only the stage that depends on it reruns:

    Stage 'train' didn't change, skipping
    Running stage 'evaluate':   test AUC 0.7694

and \`dvc params diff\` shows exactly what changed against the last commit:

    Path         Param             HEAD    workspace
    params.yaml  evaluate.min_auc  0.7     0.72

This **caching** is the everyday payoff: on a real pipeline, feature engineering takes 40 minutes and evaluation
30 seconds, and you never pay the 40 minutes to try a new threshold. If DVC has seen an output before (same
dependency hashes), it restores it from the cache instead of recomputing.

## Experiments without branches

\`dvc exp run\` runs the pipeline with changed parameters and records the result without a commit:

    dvc exp run --set-param train.C=0.05 -n c-005
    dvc exp run --set-param train.C=10 -n c-10
    dvc exp show --md

    | Experiment          | test_auc | train.C | train.seed |
    | master              | 0.7694   | 1       | 42         |
    | ├── 10b56aa [c-10]  | 0.7694   | 10      | 42         |
    | └── 3e02148 [c-005] | 0.769    | 0.05    | 42         |

(Columns trimmed.) One trap we hit: after \`exp run\`, DVC prints *"Experiment results have been applied to your
workspace"* — \`params.yaml\` now says \`C: 10\`. Restore it, or promote the winner deliberately with
\`dvc exp branch c-005 tune-c\`. For dozens of runs with rich comparisons, log to MLflow from \`train.py\` as well;
DVC and MLflow overlap here and many teams use DVC for the data and pipeline, MLflow for runs and the registry.

## Orchestrators: when "run the stages" is not enough

DVC answers *what is out of date and how is it built*. It is not a scheduler: it does not run at 2 a.m., retry a
flaky warehouse query, or alert anyone. That is an **orchestrator**'s job.

- **Prefect** — plain Python functions decorated as \`@task\` and \`@flow\`, with retries and caching. It runs
  locally with no server set up (a temporary one starts for you):

        @task(retries=2, retry_delay_seconds=5)
        def extract(month: str) -> str: ...

        @task(cache_policy=INPUTS + TASK_SOURCE, cache_expiration=timedelta(days=1))
        def features(path: str) -> pd.DataFrame: ...

        @flow(log_prints=True)
        def monthly_features(month: str = "2025-11"):
            df = features(extract(month))

  Running the flow twice printed \`Task run 'features-0ff' - Finished in state Completed()\` the first time and
  \`Finished in state Cached(type=COMPLETED)\` the second: the same inputs and the same task source skip the work.
  Deploy it to a work pool with a schedule and you have the 2 a.m. run.
- **Airflow** — the long-standing standard in data teams: DAGs of operators on a scheduler, huge operator library,
  heavier to run. If the company's data platform already runs Airflow, put the ML pipeline there.
- **Kubeflow Pipelines / Vertex AI Pipelines / SageMaker Pipelines** — each step in its own container on a cluster
  or managed service; worth it when steps need different machines (a GPU for training, a big-memory box for
  features).

How to choose: one repository, one team, runs started by people or CI → **DVC pipelines**. Scheduled runs,
retries, many small Python steps → **Prefect** (calling \`dvc repro\` or the stage scripts). An existing data platform
→ **its** orchestrator. A pipeline is code either way; the orchestrator is how it gets run, and keeping the stage
scripts orchestrator-agnostic (files in, files out, parameters from YAML) keeps the choice reversible.`,
    workedExample: `**Task: a grocery chain's demand-forecast notebook takes 55 minutes end to end. The data scientist changes the
forecast horizon and reruns everything three times a day. Turn it into a pipeline.**

**Step 1 — Find the stages from the data, not the cells.** List every file the notebook reads and every
intermediate it builds: the sales extract (20 min to pull), store-day features (25 min), the trained model (8 min),
the evaluation (2 min). Each costly intermediate becomes a stage output.

**Step 2 — Move constants into params.yaml.** The horizon (14 days), the training window, the model settings.
Each stage declares only the parameters it uses — \`horizon\` belongs to train and evaluate, not to the extract, so
changing it does not re-pull sales.

**Step 3 — Write dvc.yaml with honest dependencies.** \`features\` depends on \`src/features.py\` and the extract;
\`train\` on the features, its script and \`train.*\` params. Run \`dvc dag\` and check the graph has the shape you
expect.

**Step 4 — Measure the payoff.** A horizon change now reruns train and evaluate: 10 minutes instead of 55. A code
change to the feature script reruns features, train and evaluate: 35 minutes, and nobody forgets to.

**Step 5 — Schedule it.** The extract must run nightly after the POS data lands. A Prefect flow with a retried
extract task calls the stage scripts and \`dvc push\`es the outputs; the schedule lives in the deployment, not in
someone's laptop.

**Step 6 — Guard the shortcuts.** One stage read a holiday calendar it did not declare. When the calendar was
updated nothing reran. Declaring it as a dependency fixed it — the cache is only as correct as the dependencies.

**What to say:** "The notebook became four stages with declared inputs and parameters, so a change reruns only what
it affects, and a scheduler runs the nightly part with retries."`,
    mcqs: [
      mcq('You change only `evaluate.min_auc` in params.yaml and run `dvc repro`. Which stages run?', [
        ['Only evaluate, because it is the only stage that declares that parameter', true],
        ['All four stages, since params.yaml is one file and any edit to it is a change', false],
        ['Train and evaluate, because evaluation always retrains the model it is scoring', false],
        ['None until you commit params.yaml, because DVC reads parameters from Git only', false],
      ], 'DVC tracks parameters by key, not by file. Only stages that declared evaluate.min_auc are out of date, so validate, prepare and train are skipped.'),
      mcq('A train stage reads `holidays.csv` but its dvc.yaml entry does not list it. The calendar is updated. What happens on `dvc repro`?', [
        ['Train is skipped and the cached model, built on the old calendar, is used as if current', true],
        ['DVC notices the file was opened at run time and reruns train with the new calendar file', false],
        ['The repro fails with an error naming holidays.csv as an undeclared dependency of train', false],
        ['Train reruns because DVC hashes every file in the repository before deciding what to run', false],
      ], 'DVC decides from declared deps only; it does not trace file reads. An undeclared input silently serves stale outputs, which is why dependencies must be complete.'),
      mcq('Which job needs an orchestrator such as Prefect or Airflow rather than `dvc repro` alone?', [
        ['Running the pipeline nightly after the data lands, retrying a flaky extract and alerting on failure', true],
        ['Skipping the train stage when nothing it depends on has changed since the previous successful run', false],
        ['Recording the md5 of every input, parameter and output of the run so the model can be rebuilt later', false],
        ['Showing a table that compares the parameters and metrics of several runs of the same pipeline', false],
      ], 'Caching, the lock file and experiment tables are DVC features. Scheduling, retries and alerts are what an orchestrator adds.'),
    ],
    checkpoint: [
      ck(PIPE, 'Why should `src/train.py` itself be listed among the train stage\'s dependencies?', [
        ['So that a change to the training code reruns the stage instead of reusing the old model', true],
        ['So that DVC can copy the script into the cache and run it on another machine later', false],
        ['So that the script is excluded from Git, since DVC now versions it like the data', false],
        ['So that the stage can import pandas, which DVC resolves through the dependency list', false],
      ], 'A stage is out of date when any declared dependency changes. If the code is not declared, editing it leaves the cached model in place.'),
      ck(PIPE, 'After `dvc exp run --set-param train.C=10`, a teammate commits and later finds params.yaml says C: 10. Why?', [
        ['dvc exp run applied the experiment\'s parameters and results to the workspace', true],
        ['DVC rewrites params.yaml with the best parameter found by its own search', false],
        ['The lock file overrides params.yaml whenever a newer experiment exists', false],
        ['Git merged the experiment ref into master automatically on that commit', false],
      ], 'The last experiment run is applied to the workspace. Restore params.yaml or keep the winner deliberately with dvc exp branch or dvc exp apply.'),
      ck(PIPE, 'A team on one repository retrains when a data scientist asks, through CI. Which setup fits best?', [
        ['DVC stages run by dvc repro in CI, adding an orchestrator only when schedules are needed', true],
        ['Kubeflow Pipelines on a new Kubernetes cluster, so that each stage runs in its own pod', false],
        ['Airflow with a scheduler and workers, since ML pipelines always need a scheduler to run', false],
        ['A single notebook run from CI with papermill, which keeps the cells in their right order', false],
      ], 'With no schedule and one team, DVC alone gives caching and a lock file. A cluster or Airflow adds operating cost for nothing; a notebook keeps the stale-rerun problems.'),
    ],
  },

  /* ── REPRODUCIBLE_TRAINING ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_REPRODUCIBLE_TRAINING',
    notes: `"Reproducible" has a testable meaning: someone else, on another machine, next quarter, runs one command and gets
the same model — the same predictions to many decimal places, or differences you can explain. DVC pinned the data
and the steps. Four more things decide whether a rerun matches: **randomness**, **configuration**, the
**environment**, and a **record** of all of it.

## Randomness: seed it, and know what a seed does not fix

We trained the same random forest four times on the credit data and hashed its predictions:

    forest  no seed  -> 1d56e770f1c1
    forest  no seed  -> 84d06ce1b1b2
    forest  seed 42  -> 1af86e7710fd
    forest  seed 42  -> 1af86e7710fd

    rf = RandomForestClassifier(n_estimators=100, min_samples_leaf=20, random_state=42, n_jobs=-1)

Without \`random_state\` every run is a different model. In scikit-learn pass \`random_state\` to every estimator,
splitter and CV object that takes one (\`train_test_split\`, \`StratifiedKFold(shuffle=True)\`, the model) — a global
\`np.random.seed\` is not enough and is shared state other code can disturb. In PyTorch, \`torch.manual_seed\`,
seeded DataLoader workers and \`torch.use_deterministic_algorithms(True)\` get you most of the way on CPU; on GPU
some kernels are non-deterministic and the setting either slows them or raises an error.

What a seed does **not** fix:

- **Row order.** Same seed, same rows, shuffled order, SGD classifier: the largest coefficient difference was
  **0.398**. Anything that reads data without a defined order (a SQL query without \`ORDER BY\`, a directory listing,
  a parallel read) changes the model. Sort by a stable key before training.
- **Library versions.** A new scikit-learn can change a default (a solver, a tolerance) or a numerical routine.
  Same seed, different version, different model — legitimately.
- **Hardware and threads.** Floating-point addition is not associative; summing in a different order across 8 or
  16 threads, or on a different BLAS, gives last-digit differences. Compare predictions with a tolerance
  (\`np.allclose(a, b, atol=1e-6)\`), not with \`==\`.

Also: one seed is one sample. If seed 1 gives AUC 0.771 and seed 2 gives 0.764, the honest result is a range. Report
the spread across a few seeds before claiming an improvement of 0.003.

## Configuration as a file, not as edited code

A run should be fully described by a file you can diff, not by "I changed line 42 and ran it":

    run_name: logreg-foir
    seed: 42
    data: {path: loans.csv, test_from: "2025-10-01"}
    features:
      numeric: [age, monthly_income, loan_amount, tenure_months, cibil_score, existing_emis, foir]
      categorical: [employment_type, city_tier]
    model: {C: 1.0}

    cfg = yaml.safe_load(open(sys.argv[1]))     # python train_tracked.py foir.yaml

The feature list belongs in the config: "which features did version 4 use?" is the question you will be asked.
Hydra or OmegaConf add composition and command-line overrides when configs multiply; a YAML file and
\`yaml.safe_load\` (never \`yaml.load\`, which can construct arbitrary objects) is enough to start.

## The environment, pinned

\`pip install scikit-learn\` today and in six months installs different versions. Pin exactly:

- a lock file — \`uv lock\`, \`pip-compile\` (pip-tools) or \`poetry.lock\` — committed next to the code;
- the Python minor version (\`.python-version\`, or the base image tag);
- a container image built from both for training (the DS deployment unit built one for serving; reuse the habit).

Then the environment is part of the commit, and "it worked on my laptop" becomes a diff of two lock files.

## Record what the run depended on

The training script logs a manifest to MLflow with every run (you logged params and a data hash before; this is
the complete set):

    data_md5 = hashlib.md5(open(data_path, "rb").read()).hexdigest()
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    dirty = bool(subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout.strip())

    with mlflow.start_run(run_name=cfg["run_name"]):
        mlflow.log_params({"C": cfg["model"]["C"], "seed": cfg["seed"], "test_from": cfg["data"]["test_from"],
                           "features": ",".join(num + cat)})
        mlflow.set_tags({"data_md5": data_md5, "git_commit": commit, "git_dirty": dirty,
                         "python": platform.python_version(), "sklearn": version("scikit-learn")})
        mlflow.log_dict(cfg, "config.yaml")
        mlflow.sklearn.log_model(pipe, name="model", signature=infer_signature(X_test, p),
                                 pip_requirements=[f"scikit-learn=={version('scikit-learn')}",
                                                   f"pandas=={version('pandas')}"])

The **\`git_dirty\`** tag matters: a run from uncommitted code has a commit hash that does not describe it. Many teams
make the training script refuse to log to the shared server when the tree is dirty. The signature records the input
columns and types, so a serving app can reject a mismatched request.

## Prove it: re-run and compare

Reproducibility is claimed only after a rerun. The same config, run twice on the same commit and data:

    logreg-full: test AUC 0.7694  run 4782b30f  data c32f5763
    logreg-full: test AUC 0.7694  run c6243d89  data c32f5763

Two different run IDs, same data hash, same metric. The stronger check compares predictions on a fixed scoring
set within a tolerance; put that check in CI on a small sample so a dependency bump that changes the model is
noticed the day it lands, not during an audit. The mini project asks you to do this on a second machine.`,
    workedExample: `**Task: a colleague's retrained fraud model scores AUC 0.912; your rerun of "the same" code gives 0.897. Find out
why before anyone picks a number.**

**Step 1 — Compare the manifests, not the code.** Pull both runs from MLflow and diff params and tags. The
\`data_md5\` matches. \`git_commit\` matches but the colleague's run has \`git_dirty = True\`.

**Step 2 — Recover the dirty change.** \`git diff\` on the colleague's machine shows a local edit: the
\`StratifiedKFold\` had \`shuffle=True\` without a \`random_state\`, and early stopping was set from the validation
fold. Each run took a different split.

**Step 3 — Measure the noise honestly.** Fix the CV seed and run five model seeds: AUC 0.899–0.906. The colleague's
0.912 was a lucky split; yours, a slightly unlucky one. The real number is about 0.902 ± 0.003.

**Step 4 — Rule out the environment.** Both runs logged \`sklearn = 1.9.1\` and the same Python. Had they differed,
you would rebuild in the locked environment before comparing anything else.

**Step 5 — Fix the process.** Seeds in the config, the CV object seeded, the training script refuses to log when
the tree is dirty, and a five-seed spread is reported with every candidate.

**What to say:** "The two numbers weren't comparable: one run came from uncommitted code with an unseeded split.
With seeds fixed, the model is 0.902 plus or minus 0.003, and we now record enough to see that from the runs alone."`,
    mcqs: [
      mcq('Same data, same seed, same SGD settings, but the rows arrive in a different order. Why do the coefficients differ by up to 0.398?', [
        ['SGD updates row by row, so the order of rows changes the path and the result', true],
        ['The seed applies only to the first epoch, after which updates use the clock', false],
        ['StandardScaler fits different means when the order of the rows is changed', false],
        ['scikit-learn re-sorts the rows by label first, so the classes swap positions', false],
      ], 'Stochastic gradient descent applies one update per sample in order. A seed fixes its own shuffling, not the input order you supply, so sort data by a stable key before training.'),
      mcq('Why should a run log a `git_dirty` tag alongside the commit hash?', [
        ['A commit hash does not describe code that had uncommitted edits when it ran', true],
        ['MLflow refuses to save a model unless the repository is marked clean or dirty', false],
        ['The tag tells DVC to push the uncommitted files to the remote before training', false],
        ['Dirty runs are trained in debug mode, which makes their metrics look worse', false],
      ], 'If the working tree had changes, checking out the logged commit gives different code. The tag flags runs whose recorded commit cannot reproduce them.'),
      mcq('Two reruns on different laptops agree to 1e-9 but not exactly. What is the sensible conclusion?', [
        ['The run is reproducible; floating-point sums in different orders differ in the last digits', true],
        ['The run is not reproducible, because a reproducible model must give bit-identical outputs', false],
        ['One laptop has a faulty CPU, since IEEE arithmetic is identical on every machine and BLAS', false],
        ['The seed was not applied on one laptop; a seeded run always gives identical floating point', false],
      ], 'Different thread counts and BLAS builds sum in different orders. Compare with a stated tolerance; differences far larger than that point to data, code or version changes.'),
    ],
    checkpoint: [
      ck(EXP, 'A new candidate beats the champion by 0.003 AUC on one seed. What should be logged before anyone calls it better?', [
        ['The spread of the metric over several seeds, compared with the 0.003 gap', true],
        ['The single best seed of the candidate, since that is the model to deploy', false],
        ['The model\'s training AUC, which shows whether it learned the data better', false],
        ['The number of rows in each fold, since more rows means a stabler estimate', false],
      ], 'One seed is one sample. If seeds alone move the metric by more than 0.003, the gain is noise; report mean and spread across seeds.'),
      ck(EXP, 'Which set of records lets someone rebuild a run months later without asking its author?', [
        ['Commit and dirty flag, data hash, config file, seeds and pinned package versions', true],
        ['The run name, the metrics, a screenshot of the notebook and the author\'s name', false],
        ['The model file alone, since a fitted model includes everything that built it', false],
        ['The data hash and the metrics, because together they identify the training run', false],
      ], 'Rebuilding needs the code version, the data, the configuration, the randomness and the environment. Metrics and screenshots describe the outcome, not the recipe.'),
      ck(EXP, 'Why load training settings from a YAML config instead of editing constants in train.py before each run?', [
        ['The config is logged with the run and diffed, so each run\'s settings are explicit', true],
        ['YAML loads faster than Python constants, which shortens long training jobs', false],
        ['MLflow can only record parameters that were read from a YAML file at start', false],
        ['Editing train.py would change its hash and stop DVC tracking the data file', false],
      ], 'A config file is an artefact you can log, diff and rerun. Edited constants leave no record of which values produced which model.'),
    ],
  },

  /* ── MODEL_REGISTRY ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_MODEL_REGISTRY',
    notes: `In the DS deployment unit you registered a model and pointed an alias at it. That is the mechanism. This unit is the
**process** around it: what each version must carry, how a new model earns the \`@champion\` alias, who is allowed to
move it, and how fast you can move it back. For a lender, the registry is where "which model decided this loan, and
who approved it?" gets answered.

## What a version must carry

A registered version is useful only if it leads back to everything that made it. Register from the run, and copy the
lineage onto the version as tags so it is visible without opening the run:

    def register(run_name, alias):
        r = run_of(run_name)                                   # latest run with that name
        model_id = r.outputs.model_outputs[0].model_id          # MLflow 3: the run's logged model
        mv = mlflow.register_model(f"models:/{model_id}", NAME,
                                   tags={"run_name": run_name, "data_md5": r.data.tags["data_md5"],
                                         "git_commit": r.data.tags["git_commit"]})
        client.set_registered_model_alias(NAME, alias, mv.version)
        return mv

(In a training script you would pass \`info.model_uri\` from \`log_model\` straight to \`register_model\`.) Following an
alias back to its origin is then one call each way:

    @champion -> v3, run 6fe0632f, data c32f5763, commit 3da8ee08, C=1.0, test_auc 0.7694

Version → run → commit and data hash → \`git checkout\` + \`dvc pull\`. That chain is **lineage**, and the audit question
from the first unit is answered by walking it.

## Champion and challenger

Use aliases for roles, not for history:

- **\`@champion\`** — what production loads (\`models:/credit-risk@champion\`).
- **\`@challenger\`** — the candidate being evaluated, perhaps in shadow mode.
- **\`@previous-champion\`** — the last good model, kept for one-step rollback.

Version numbers only go up; they are the history. Aliases move; they are the decisions. Never load "the latest
version" in production — the newest model is not the approved one.

## A promotion rule, written as code

"The challenger looks better" is not a rule. Write the rule before you see the numbers, and make it code:

    def promotion_decision(min_gain=0.005, max_slice_drop=0.01, max_calib_gap=0.05):
        champ, cm = metrics_of("champion")
        chall, xm = metrics_of("challenger")
        reasons = []
        if champ.tags["data_md5"] != chall.tags["data_md5"]:
            reasons.append("evaluated on different data; not comparable")
        gain = xm["test_auc"] - cm["test_auc"]
        if gain < min_gain:
            reasons.append(f"overall gain {gain:+.4f} < {min_gain}")
        for k in [k for k in cm if k.startswith("test_auc_")]:
            if cm[k] - xm.get(k, 0.0) > max_slice_drop:
                reasons.append(f"{k[9:]} slice AUC drops {cm[k] - xm[k]:.4f}")
        for k in [k for k in xm if k.startswith("calib_gap_")]:
            if abs(xm[k]) > max_calib_gap:
                reasons.append(f"{k[10:]} slice mis-calibrated by {xm[k]:+.3f}")
        return champ, chall, gain, reasons

Training logged, per employment type, the AUC and the **calibration gap** (mean predicted default minus actual default
rate). We ran three candidates on the same data and commit:

| Run | Test AUC | Gig AUC | Gig calibration gap |
|---|---|---|---|
| logreg-base (no FOIR) | 0.7567 | 0.7787 | −0.032 |
| logreg-foir | 0.7694 | 0.8011 | −0.037 |
| logreg-foir-no-emp (FOIR, no employment type) | 0.7662 | 0.8010 | −0.067 |

With \`logreg-base\` as champion:

    champion v1 (logreg-base) vs challenger v2 (logreg-foir-no-emp): gain +0.0095
      REJECT: gig slice mis-calibrated by -0.067
    champion v1 (logreg-base) vs challenger v3 (logreg-foir): gain +0.0126
      PROMOTED v3; v1 kept as @previous-champion

Look at why v2 failed. Its overall gain passed, and its gig-slice **AUC** (0.8010) was as good as anyone's — because
inside the gig slice, employment type is the same for every row, so dropping the feature cannot change the ranking
there. What it changes is the **level**: the model no longer knows gig workers default more, and under-predicts their
risk by 6.7 percentage points. For a lender that is underpricing a whole segment. Ranking metrics per slice miss this;
calibration per slice catches it. The first version of our rule used a 0.03 calibration limit — and rejected every
model, because the gig slice is small (about 200 test rows) and noisy. Thresholds need the same honesty about noise
as metrics do.

Promotion, when the rule passes, is three alias moves:

    client.set_registered_model_alias(NAME, "previous-champion", champ.version)
    client.set_registered_model_alias(NAME, "champion", chall.version)
    client.delete_registered_model_alias(NAME, "challenger")

and rollback is one:

    prev = client.get_model_version_by_alias(NAME, "previous-champion")
    client.set_registered_model_alias(NAME, "champion", prev.version)      # @champion -> v1

## Who may promote

In a regulated setting the person who trained the model should not approve it. A workable split:

- The **pipeline** registers every evaluated model as \`@challenger\` and runs the rule, writing the verdict and its
  reasons onto the version as tags or the description.
- A **reviewer** (model risk, or a senior engineer outside the project) approves; only their role can set
  \`@champion\`. Managed registries — Databricks Unity Catalog, SageMaker, Vertex AI — enforce this with permissions;
  self-hosted MLflow needs authentication enabled or the alias move done by a CI job that requires an approval.
- Every move is logged: who, when, from which version to which, and why.

Low-risk models (a product recommender) can promote automatically when the rule passes; credit, fraud and anything
that affects a person's access to money should not.

## What else belongs on a version

The evaluation data's identity (the test window and its hash), the threshold the business uses with the model, the
model's known limitations ("not validated for applicants under 21"), and the signature. Write them when the version is
created; nobody adds them later.`,
    workedExample: `**Task: a UPI fraud team retrains weekly. Last Tuesday a new version went live and false declines doubled.
Redesign their registry process so this cannot happen silently again.**

**Step 1 — Find out what happened.** The serving app loaded \`models:/upi-fraud/latest\`. The weekly job registered
version 31, and production picked it up without anyone deciding. Its overall AUC was higher; its threshold had been
tuned on a different week's data.

**Step 2 — Roll back first.** Pin the app to an alias and set \`@champion\` on version 30. False declines return to
normal within the reload. Diagnose afterwards.

**Step 3 — Introduce roles.** The job now registers each model as \`@challenger\`. \`@champion\` is moved only by
\`promote.py\`, run by CI after the rule passes and a fraud-ops lead approves the pull request that triggers it.

**Step 4 — Write the rule around the business.** For fraud the costly errors are false declines (customers
abandoning payments) and missed fraud (losses). Rule: on the same evaluation week, recall at the operating threshold
must not fall, false-decline rate must not rise by more than 0.1 percentage points, and the merchant-category slices
must not degrade by more than a set amount. The threshold travels with the version as a tag.

**Step 5 — Shadow before promoting.** The challenger scores live traffic in shadow for three days; its decisions are
logged, not acted on, and compared with the champion's.

**Step 6 — Make rollback boring.** \`@previous-champion\` is always set; a one-command rollback is in the runbook,
practised once a quarter.

**What to say:** "Production now loads an alias that only an approved promotion moves. The rule is code, compares
on the same data and the metrics the business pays for, and rollback is one alias move."`,
    mcqs: [
      mcq('Challenger v2 drops employment type. Its gig-slice AUC matches the champion\'s, yet the rule rejects it. Why?', [
        ['It under-predicts the gig slice\'s default rate, which slice calibration catches and AUC cannot', true],
        ['Its overall AUC gain fell below the rule\'s minimum, so the slice checks were never reached', false],
        ['It was evaluated on different data from the champion, so the comparability check failed it', false],
        ['Its gig-slice AUC fell by more than 0.01, which the per-slice AUC check is designed to catch', false],
      ], 'Inside one employment type the dropped feature is constant, so ranking there is unchanged. The level of predicted risk shifts, and only a calibration-gap check per slice sees that.'),
      mcq('Why should a production service load `models:/credit-risk@champion` rather than the newest version?', [
        ['The newest version is only the latest trained, while the alias marks the approved one', true],
        ['MLflow deletes older versions automatically, so the newest is the only one available', false],
        ['Loading by alias is faster, because MLflow caches aliased models in server memory', false],
        ['The newest version has no signature until it is aliased, so it cannot score requests', false],
      ], 'Every retrain creates a new version. If production follows "newest", training is deployment. An alias separates the two, so only a deliberate promotion changes what serves.'),
      mcq('The first promotion rule used a 0.03 per-slice calibration limit and rejected every model, including the champion\'s own retrain. What was wrong?', [
        ['The gig slice has about 200 test rows, so its noise alone exceeds 0.03; the limit must allow for it', true],
        ['Calibration cannot be measured per slice, so the limit should be applied only to the overall rate', false],
        ['A limit of 0.03 is too loose and let biased models through; it should have been set nearer 0.01', false],
        ['The calibration gap should be measured on training data, where it is near zero for every model', false],
      ], 'Small slices have noisy rates. A threshold tighter than the slice\'s own sampling noise rejects good models; set limits with that noise in view, or require more data before judging.'),
    ],
    checkpoint: [
      ck(VER, 'After promoting version 6, live false declines double. What is the fastest safe action?', [
        ['Move @champion back to the version held by @previous-champion and investigate afterwards', true],
        ['Retrain a new model on this week\'s data and register it as soon as that training completes', false],
        ['Edit the decision threshold inside the serving code until false declines come back down', false],
        ['Delete version 6 from the registry so that the service falls back to an older version', false],
      ], 'A kept previous champion makes rollback one alias move. Retraining or code edits take time and add risk; deleting a version does not tell the service which one to load.'),
      ck(VER, 'Which arrangement fits promoting a credit-risk model at a regulated lender?', [
        ['The pipeline proposes a challenger; a separate reviewer\'s role alone can move @champion', true],
        ['The data scientist who trained the model moves @champion once the metrics look better', false],
        ['Any version whose test AUC is higher than the champion\'s is promoted automatically', false],
        ['The newest registered version is served, and older versions are kept only for audit', false],
      ], 'Separating proposer and approver, with permissions enforcing it and every move logged, is what model-risk governance expects. Automatic promotion on AUC skips slices and comparability.'),
      ck(VER, 'What should a registered model version carry so that its lineage can be followed without asking anyone?', [
        ['The run ID with the Git commit and data hash, the evaluation window and the threshold used', true],
        ['The name of the person who trained it and the date it was registered in the model registry', false],
        ['A copy of the training data inside the version, so that the data travels with the model file', false],
        ['The model\'s test AUC in the version name, so that the best version can be found by sorting', false],
      ], 'Lineage means reaching the exact code, data and evaluation. Names and dates do not identify them, copying data duplicates it, and metrics in names invite promotion by sorting.'),
    ],
  },

  /* ── DATA_VALIDATION ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_DATA_VALIDATION',
    notes: `Models fail quietly. A credit model given incomes in thousands of rupees instead of rupees does not raise an
error — it computes a debt-to-income ratio a thousand times too high, scores everyone as risky, and the sales team
finds out a week later when approvals collapse. The cheapest place to catch this is **before** the data reaches
training or scoring, with checks that **stop the pipeline**. The DS deployment unit validated single API requests
with Pydantic and measured drift after the fact; this unit validates whole batches inside the pipeline.

## Three layers of checks

1. **Schema** — the columns exist, with the right types; IDs are unique; required fields are not null.
2. **Values** — ranges and allowed sets per column (\`cibil_score\` 300–900, \`tenure_months\` in
   {12, 24, 36, 48, 60}), plus **cross-field rules** (a loan is not 60 times the monthly income).
3. **Distribution** — the batch looks like the data the model was trained on: means, category shares,
   PSI against a reference, the label rate.

Layers 1 and 2 have right answers and should **fail hard**. Layer 3 is judgement and usually **warns**, with a hard
stop only for extreme shifts.

## pandera: schemas as code

    import pandera.pandas as pa

    schema = pa.DataFrameSchema(
        {
            "application_id": pa.Column(str, unique=True),
            "age": pa.Column(int, pa.Check.in_range(18, 75)),
            "monthly_income": pa.Column(float, pa.Check.gt(0)),
            "loan_amount": pa.Column(float, pa.Check.in_range(10_000, 5_000_000)),
            "tenure_months": pa.Column(int, pa.Check.isin([12, 24, 36, 48, 60])),
            "cibil_score": pa.Column(int, pa.Check.in_range(300, 900)),
            "employment_type": pa.Column(str, pa.Check.isin(["salaried", "self_employed", "gig"])),
            "defaulted": pa.Column(int, pa.Check.isin([0, 1])),
        },
        checks=[pa.Check(lambda d: d.loan_amount <= 60 * d.monthly_income, name="loan_within_60x_income"),
                pa.Check(lambda d: d.defaulted.mean() < 0.40, name="default_rate_below_40pct")],
        strict=False, coerce=False,
    )

(Since pandera 0.24 the pandas API is imported from \`pandera.pandas\`; older tutorials use \`import pandera as pa\`.)
We broke a batch the way real batches break — a bureau timeout sentinel of \`-1\`, a new upstream casing
\`"Salaried"\`, a duplicated ID, and incomes switched to thousands — and validated with \`lazy=True\`, which
collects every failure instead of stopping at the first:

    try:
        schema.validate(bad, lazy=True)
    except pa.errors.SchemaErrors as e:
        print(e.failure_cases.groupby("check")["index"].nunique())

    field_uniqueness                                 2
    in_range(300, 900)                               1
    isin(['salaried', 'self_employed', 'gig'])       1
    loan_within_60x_income                        2000

Read it carefully. The column checks caught the sentinel, the casing and the duplicate (both rows of the pair).
The income change passed \`monthly_income > 0\` — every value was still positive. Only the **cross-field rule**
caught it, failing all 2,000 rows. Per-column ranges miss unit changes; relationships between columns catch them.

\`coerce=False\` is deliberate: coercion would turn the string \`"45000"\` into a number and hide that the upstream
type changed. Coerce at a boundary you own, never to make a failing check pass.

## Distribution checks against a reference

Save the training data's profile with the model (quantile edges, category shares, label rate) and compare each new
batch. PSI from the deployment unit works per feature:

    next week, same source   PSI cibil 0.007  PSI income 0.002
    new DSA partner          PSI cibil 0.424  PSI income 0.002

A new direct-selling agent brought thinner-file applicants 40 points lower on CIBIL. Every value is in range, the
schema passes, and PSI 0.42 — far above the usual 0.25 "significant" line — is the only signal. Is that a bug? No:
it is real applicants the model has seen few of. The right response is a warning to the risk team and closer
monitoring, not a pipeline failure. Decide in advance which shifts **block** and which **warn**, and write it
down.

## Wiring it into the pipeline

In the DVC pipeline the validate stage runs first and \`prepare\` depends on its report:

    try:
        schema.validate(df, lazy=True)
    except pa.errors.SchemaErrors as e:
        print(e.failure_cases[["column", "check", "failure_case"]].head(10).to_string(index=False))
        sys.exit(f"validation failed: {len(e.failure_cases)} problems")

A non-zero exit stops \`dvc repro\` (and a Prefect task, and a CI job): nothing downstream runs on bad data, and the
last good model stays in place. Write the failure cases somewhere a human will see them — a CI log, a Slack alert —
because a gate nobody reads gets disabled.

In **scoring**, the trade-off is different: a whole nightly batch should not fail because 3 of 50,000 rows are
bad. Quarantine the failing rows (score them later or route them to manual review), score the rest, and alert if
the quarantined share passes a threshold such as 1%.

## Tools

- **pandera** — schemas in Python next to your code, works with pandas, Polars and PySpark; good default.
- **Great Expectations** — "expectation suites" with generated HTML data docs and many built-in checks; heavier,
  popular in data-platform teams. Same idea, more ceremony.
- **Pydantic** — per-record validation at an API boundary; not built for batch statistics.
- Warehouse-side tests (dbt tests) — when the data is produced in SQL, check it where it is produced too.

Whichever you use, the schema is a **contract** with whoever produces the data. Keep it in the repository, review
changes to it, and tell the producer when you tighten it.`,
    workedExample: `**Task: the nightly scoring batch at a two-wheeler lender predicted an average default rate of 34% last night
against the usual 9%, and the decision engine rejected almost everyone. Find out where validation should have caught it.**

**Step 1 — Look at the inputs, not the model.** Compare yesterday's batch with the reference profile: \`cibil_score\`
median 0 against 731. 61% of rows have \`cibil_score = 0\`.

**Step 2 — Find the cause.** The bureau API changed its "no record" response from null to 0. The ingestion job
wrote the 0 straight through. The model, which never saw a score below 300 in training, read 0 as the worst
credit history possible and extrapolated far beyond anything it had learned.

**Step 3 — Why did no check fire?** The schema said \`Column(int)\`, with no range. Zero is an int.

**Step 4 — Add the checks that would have caught it.** \`in_range(300, 900)\` with \`nullable=True\` (a missing
score is legitimate and the model handles it); a batch-level check that the null-or-zero share stays under 10%; a
distribution check on the output — the predicted default rate against its 30-day band.

**Step 5 — Decide block versus warn.** Range failures above 1% of rows block the batch; the output-rate check
warns the risk team, who can halt disbursals.

**Step 6 — Fix upstream too.** Ingestion maps the bureau's "no record" to null explicitly, and the bureau
contract change is logged as an incident.

**What to say:** "Zero was a valid int, so the schema passed. A range check and a share-of-missing check at the
start of the pipeline would have stopped the batch before a single approval went out."`,
    mcqs: [
      mcq('Incomes arrive in thousands of rupees instead of rupees. Which pandera check in the unit\'s schema caught it?', [
        ['The cross-field rule that a loan amount is at most 60 times the monthly income', true],
        ['The check that monthly_income is greater than zero, since the values became tiny', false],
        ['The uniqueness check on application_id, which changed when the incomes were scaled', false],
        ['The default-rate check, because the label rate shifts whenever income is rescaled', false],
      ], 'Divided incomes are still positive, so the column check passes. The loan-to-income relationship broke for every row; cross-field rules catch unit changes that per-column ranges miss.'),
      mcq('Why validate a training batch with `lazy=True`?', [
        ['It collects every failing check and row instead of stopping at the first one', true],
        ['It postpones validation until the model is trained, so training is not delayed', false],
        ['It samples a fraction of the rows, which keeps validation fast on large batches', false],
        ['It converts failing values to the schema\'s types instead of raising an exception', false],
      ], 'Without lazy, pandera raises on the first error and you fix problems one at a time. Lazy validation reports all failure cases together in failure_cases.'),
      mcq('PSI on cibil_score is 0.42 after a new loan-sourcing partner starts sending applicants; all values are in range. What should the pipeline do?', [
        ['Warn the risk team and monitor closely, since these are real applicants rather than bad data', true],
        ['Fail the pipeline, because any PSI above 0.25 means the data contains a bug to be fixed', false],
        ['Drop the new partner\'s rows from scoring until the model has been retrained to cover them', false],
        ['Ignore it, because PSI matters only when the schema check has also failed on that batch', false],
      ], 'A shift with valid values is a change in the population, not a contract breach. It deserves attention and maybe retraining, but blocking would stop legitimate business.'),
    ],
    checkpoint: [
      ck(PIPE, 'Why is `coerce=False` a sensible default in a pandera schema guarding a training pipeline?', [
        ['Coercion would silently convert a changed upstream type and hide the change', true],
        ['Coercion is not supported for integer columns in the current pandera release', false],
        ['Coercion makes validation many times slower on a batch of 100,000 rows', false],
        ['Coercion deletes rows whose values cannot be converted to the declared type', false],
      ], 'If "45000" arrives as a string, coercing makes the check pass and hides that the producer changed the type. Fail, find out why, then coerce at a boundary you own if appropriate.'),
      ck(PIPE, 'In a nightly scoring batch of 50,000 applications, 3 rows fail the range checks. What is the usual design?', [
        ['Quarantine the 3 rows, score the rest, and alert if the failed share passes a threshold', true],
        ['Fail the whole batch so that no application is scored until the 3 rows are fixed', false],
        ['Clip the 3 rows into range and score them, so that every application gets a score', false],
        ['Score all 50,000 rows and attach a warning flag to the 3 that failed validation', false],
      ], 'Scoring should not stop for a handful of bad rows, and bad rows should not get a score. Quarantine them and alert when the failure rate shows a systemic problem.'),
      ck(PIPE, 'Where should the validate stage sit in the credit-risk DVC pipeline?', [
        ['First, with prepare depending on its report so that bad data stops every later stage', true],
        ['After train, so that validation can use the model\'s predictions to find the bad rows', false],
        ['After evaluate, where the test AUC shows whether the incoming data was of good quality', false],
        ['In parallel with train, so that validation does not slow down the training run at all', false],
      ], 'A gate protects only what comes after it. Making prepare depend on the validation output means a failure stops the pipeline before any model is built on bad data.'),
    ],
  },

  /* ── FEATURE_STORES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_FEATURE_STORES',
    notes: `A model is trained on features computed one way and served with features computed another. The offline AUC is
excellent; the live approvals are poor; every component "works". This is **training-serving skew**, and it is the
most common reason a model that tested well disappoints in production. It has two main causes: the feature is
**computed differently** in the two places, or the training data used values that **did not exist yet** at the
moment the prediction would have been made.

## Cause 1: two implementations of one feature

The data scientist computes \`foir\` (fixed obligations to income ratio) in pandas:

    df["foir"] = (df.existing_emis + df.loan_amount / df.tenure_months) / df.monthly_income

The loan-origination service, written in Java by another team, computes it from the applicant's **declared**
income where training used **verified** income, and leaves out the new loan's EMI. Same name, different number.
Nothing errors. The model sees systematically lower FOIRs in production and approves more risky applicants.

Fixes, best first:

1. **One implementation.** Put feature logic inside the model artefact (a scikit-learn \`Pipeline\` with a
   \`FunctionTransformer\` or a custom transformer, as the DS units taught), so the server sends raw fields and the
   model computes the features itself.
2. **One shared library** imported by both the training job and the serving code, tested once.
3. **A feature store**, when many models and teams share features (below).
4. Whatever you choose, **log the features actually served** and compare their distribution with the training
   features each day. Skew shows up as a gap between those two, before it shows up in defaults.

## Cause 2: time travel in training data

The bureau sends a monthly snapshot per customer, including \`missed_emis_6m\`. To build training data, the obvious
join takes each customer's **latest** snapshot. But "latest" is *today's* value — recorded months **after** the
application. Defaulters, by then, have been missing EMIs on this very loan. The feature quietly contains the label.

We simulated 4,000 applications (Jan–Oct 2025) and monthly snapshots. For one customer who applied on 11 May 2025
and later defaulted:

     customer_id snapshot_date  missed_emis_6m
              14    2025-09-01               1
              14    2025-10-01               0
              14    2025-11-01               1
              14    2025-12-01               1
    naive value: 1 | point-in-time value: 0 from 2025-05-01

The **point-in-time** value is the last snapshot strictly **before** the application date. In pandas that is
\`merge_asof\`:

    # Wrong: the latest value we have today, whenever it was recorded.
    latest = snaps.sort_values("snapshot_date").groupby("customer_id").tail(1)
    naive = apps.merge(latest[["customer_id", "missed_emis_6m"]], on="customer_id")

    # Right: the last snapshot strictly before the application date.
    pit = pd.merge_asof(apps.sort_values("applied_on"), snaps.sort_values("snapshot_date"),
                        left_on="applied_on", right_on="snapshot_date", by="customer_id",
                        allow_exact_matches=False)

Both inputs must be sorted on their time keys; \`by=\` matches within each customer; \`allow_exact_matches=False\`
excludes a snapshot stamped the same day (was it known at 10 a.m. when the application came in? Unless you know,
assume not). Then train a logistic regression on \`cibil_score\` and \`missed_emis_6m\`, time-split at August:

    naive model, offline test AUC:      0.876
    naive model, on serving-time values: 0.680
    point-in-time model, offline AUC:    0.687

The naive model looks brilliant offline (0.876) because its test set leaks too. In production it receives the value
known at application time and scores **0.680** — slightly worse than the honest model, and nobody planned for the
drop. The point-in-time model's 0.687 is the number you could have promised the business.

Rules that prevent this:

- Every feature table has an **event time** (when the value became true) and ideally a **created time** (when it
  landed in your system — bureau files arrive days late). Join on what was *available*, not what was *true*.
- Every training row has a **prediction time**. Features are joined **as of** that time.
- Suspect any feature whose offline importance is much higher than domain sense suggests. Ask "when is this known?"

## What a feature store does

A **feature store** (Feast is the open-source reference; Tecton, Databricks, Vertex AI and SageMaker have managed
ones) makes these rules the default:

- **Definitions as code** — an entity (\`customer_id\`), a source with an event-timestamp column, and feature views
  that name features and their freshness (TTL). One definition serves training and serving.
- **Offline store** — the history (a warehouse or Parquet). Its main call builds training data with a
  point-in-time join: you pass an "entity dataframe" of \`customer_id\` and \`event_timestamp\` rows, and it returns
  each feature as of each timestamp — the \`merge_asof\` above, at scale, for every feature view.
- **Online store** — the latest value per entity in a low-latency store (Redis, DynamoDB), loaded by
  **materialisation** jobs, read at serving time in milliseconds.
- **A registry** of features so teams find and reuse them instead of recomputing "customer's 90-day spend" five ways.

## What it costs, and when it is worth it

A feature store is another system to run: materialisation jobs that can fail or lag, an online database to size and
pay for, definitions to keep in sync, and engineers who understand it. For one or two models scored in batch, a
well-tested feature module plus point-in-time joins in SQL or pandas is enough. It starts paying off when:

- several models share features and teams keep reimplementing them;
- online scoring needs fresh aggregates in milliseconds (UPI fraud scoring on the last 10 minutes of transactions);
- skew incidents have already happened and keep happening.

Choose it for those reasons, not because an architecture diagram had a box for it.`,
    workedExample: `**Task: a payments app's UPI fraud model scores 0.94 AUC offline but catches far less fraud live. Diagnose before
anyone retrains.**

**Step 1 — Compare served features with training features.** The service logs its inputs. For
\`txn_count_10min\` the training median is 3, the served median 1. For \`device_age_days\` the two match.

**Step 2 — Find how each was computed.** Training: a SQL window over the transactions table, counting the
customer's transactions in the 10 minutes **around** each transaction — \`BETWEEN ts - 5 min AND ts + 5 min\`. Fraud
comes in bursts, so the window counted the burst that followed. Serving: a Redis counter of the last 10 minutes
**before** the transaction. Two definitions, and the training one looked into the future.

**Step 3 — Measure the damage honestly.** Rebuild training features as of each transaction time (strictly before
it). The retrained model scores 0.88 offline — lower, and now true.

**Step 4 — Remove the second implementation.** Define the 10-minute count once. In a feature store, a streaming
feature view feeds both the online store and the offline history; without one, a shared function used by the
stream processor and the backfill job, with a test that both give the same counts on a recorded day.

**Step 5 — Add the monitor.** Daily: served-feature distribution against training distribution, per feature, with
an alert on PSI above 0.2.

**What to say:** "The offline score was inflated by a window that saw the future, and serving computed the feature
differently anyway. One definition, point-in-time training data and a served-versus-trained monitor fix the cause,
not the symptom."`,
    mcqs: [
      mcq('Why did the naive model in the unit score 0.876 offline but 0.680 on serving-time feature values?', [
        ['Its feature used snapshots recorded after the application, which partly encode the default', true],
        ['The serving data had more customers, so the model\'s coefficients no longer applied to it', false],
        ['merge_asof added noise to the feature that the logistic regression could not learn around', false],
        ['The test period was shorter than the training period, which always lowers the measured AUC', false],
      ], 'The latest snapshot came months after the application, when defaulters were already missing EMIs on this loan. That information does not exist at decision time, so the live score drops.'),
      mcq('What does `allow_exact_matches=False` do in the unit\'s merge_asof call?', [
        ['It excludes a snapshot stamped on the same day as the application from the join', true],
        ['It drops applications that have no snapshot at all before their application date', false],
        ['It requires customer_id to match exactly, rather than joining nearest customers', false],
        ['It rounds both timestamps to the day before comparing them for the backward join', false],
      ], 'By default merge_asof accepts a right row with an equal key. Excluding it is the safe choice when you cannot tell whether a same-day value was known at prediction time.'),
      mcq('A bank has one batch-scored credit model and no online features. Is a feature store worth adopting now?', [
        ['Probably not; a tested feature module with point-in-time joins gives most of the benefit', true],
        ['Yes, because without a feature store, point-in-time correct training data is impossible', false],
        ['Yes, because batch scoring needs an online store to read the latest feature values from', false],
        ['No, because feature stores only work with deep learning models and not logistic models', false],
      ], 'Point-in-time joins can be written in SQL or pandas. A feature store pays off with shared features across models, fresh online aggregates or recurring skew; otherwise it is an extra system to run.'),
    ],
    checkpoint: [
      ck(PIPE, 'Training used verified income for FOIR; the origination service uses declared income. What is this problem called?', [
        ['Training-serving skew: one feature computed two different ways in two places', true],
        ['Concept drift: the link between FOIR and default changing as the economy shifts', false],
        ['Label leakage: the target value having been used to compute one of the features', false],
        ['Data drift: the distribution of applicants changing after the model was deployed', false],
      ], 'The world has not changed; the two systems compute the feature differently. That gap between training and serving computation is skew, and it needs one implementation.'),
      ck(PIPE, 'Bureau files for a month land in your warehouse 5 days after month end. Which timestamp should training joins respect?', [
        ['When each value became available in your system, not only when it was true', true],
        ['When the value was true at the bureau, since that is the correct business date', false],
        ['When the training job runs, so that every row has the most recent feature value', false],
        ['When the loan was disbursed, since that is the date the outcome window begins', false],
      ], 'At decision time you could only use what had arrived. Joining on the as-of-true date lets training use values that were still in transit, a subtler form of the same leak.'),
      ck(PIPE, 'In a feature store, what is the offline store\'s main job when you build training data?', [
        ['A point-in-time join returning each feature as of each training row\'s timestamp', true],
        ['Serving the latest feature value per customer to the API within a few milliseconds', false],
        ['Training the model on the stored features and registering the result as a version', false],
        ['Validating each incoming batch against a schema and blocking rows that break it', false],
      ], 'The offline store holds history and answers "what was this feature as of time t" for many rows. Low-latency reads are the online store; training and validation are other components.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_DEBUGGING',
    notes: `Pipeline failures come in two kinds: the loud ones that print an error, and the quiet ones where everything runs and
the answer is wrong. The quiet ones cost more. Six real cases, each with the symptom, the cause and the smallest
fix. The error messages are the ones DVC 3.67, pandera 0.35, pandas 3 and MLflow 3.17 printed when we reproduced them.

## 1. A fresh clone cannot get the data

**Symptom.** A new teammate runs \`git clone\` and \`dvc pull\`:

    ERROR: failed to pull data from the cloud - Checkout failed for following targets:
    data/loans.csv
    Is your cache up to date?

**Cause.** The author ran \`dvc add\` and committed the pointer, but never ran \`dvc push\`. The bytes exist only in
the author's local \`.dvc/cache\`. Git has the pointer; the remote has nothing for it to point at.

**Fix.** The author runs \`dvc push\`. To prevent it: \`dvc install\` adds Git hooks, including a pre-push hook that
runs \`dvc push\` whenever you \`git push\`; and CI that starts from a clean runner with \`dvc pull\` fails the same day
somebody forgets.

## 2. The model did not change when the feature list did

**Symptom.** A data scientist removes \`city_tier\` from \`features.yaml\`, runs \`dvc repro\`, and every stage says
"didn't change, skipping". The metrics are identical to the last run.

**Cause.** \`train.py\` reads \`features.yaml\`, but the train stage declares only \`src/train.py\` and the training
data. DVC decides from declared dependencies; it does not watch which files a script opens.

**Fix.** Declare it — add \`features.yaml\` to \`deps\`, or better, move the feature list into \`params.yaml\` under
\`train.features\` so \`dvc params diff\` shows it. Then audit every \`open(...)\` and \`read_*\` in the stage scripts
against their \`deps\`.

## 3. Two stages write to the same place

**Symptom.** After adding a stage, \`dvc repro\` refuses to run anything:

    ERROR: The output paths:
    'out'('a')
    'out/x.txt'('b')
    overlap and are thus in the same tracked directory.

**Cause.** Stage \`a\` declares the whole directory \`out\` as its output, and stage \`b\` declares a file inside it.
Each output must have exactly one producer, or DVC cannot know which stage to rerun to rebuild it.

**Fix.** Give each stage its own directory (\`out/a/\`, \`out/b/\`), or have \`a\` declare its individual files.
Downstream stages may still depend on a file inside another stage's output directory — reading is fine, writing is
not.

## 4. A missing CIBIL score breaks validation twice

**Symptom.** Two applications arrive with no bureau score. Validation fails:

    SchemaError: non-nullable series 'cibil_score' contains null values

Someone adds \`nullable=True\`, and it fails again:

    SchemaError: expected series 'cibil_score' to have type int64, got float64

**Cause.** pandas' classic \`int64\` cannot hold a missing value, so \`read_csv\` silently turns the whole column into
\`float64\` the moment one value is empty. The schema asked for \`int\`.

**Fix.** Decide that a missing score is legitimate (new-to-credit applicants exist), then use pandas' nullable
integer type in both places:

    df = pd.read_csv(path, dtype={"cibil_score": "Int64"})
    "cibil_score": pa.Column("Int64", pa.Check.in_range(300, 900), nullable=True)

Do not reach for \`coerce=True\` to make the float pass; you would hide the next type change too. And make sure the
model's pipeline has an imputer for the field, or the gate passes rows the model cannot score.

## 5. The point-in-time join crashes

**Symptom.**

    ValueError: left keys must be sorted

**Cause.** \`pd.merge_asof\` requires both frames sorted by their time keys. The applications came from a query
ordered by customer, not by date.

**Fix.** \`apps.sort_values("applied_on")\` and \`snaps.sort_values("snapshot_date")\` before the join, and sort the
result back afterwards if order matters. Do not "fix" it by switching to a plain \`merge\` on customer — that brings
back the latest-snapshot leak from the feature-store unit.

## 6. The new model was promoted, but the service still serves the old one

**Symptom.** The registry shows \`@champion\` on version 4. Logged responses still carry \`model_version: 3\`.

**Cause.** Two things, often together. The service loads \`models:/credit-risk/3\` — a pinned version number — so
moving the alias changes nothing. Or it loads \`models:/credit-risk@champion\` correctly but **only at startup**, and
no one restarted it.

**Fix.** Load by alias, return the resolved version in every response (you did this in the DS deployment unit), and
make promotion trigger a rolling restart or a reload endpoint. Check after promotion: the version in live responses
must match the alias within minutes, and an alert should fire if it does not.

## The habit behind all six

Before changing anything, write down what you expected to run or load and what actually did. Most pipeline bugs are a
mismatch between the **declared** world (dvc.yaml, the schema, the alias) and the **real** one (files read, dtypes
produced, the model in memory).`,
    mcqs: [
      mcq('A teammate\'s `dvc pull` ends with "Checkout failed for following targets: data/loans.csv". The pointer is in Git. What is the most likely cause?', [
        ['The author committed the .dvc file but never ran dvc push, so the remote lacks the bytes', true],
        ['The teammate\'s Git version is too old to read .dvc files that were written by DVC 3', false],
        ['The CSV is too large for DVC, which refuses to pull any file above 100 MB in size', false],
        ['The teammate must run dvc add data/loans.csv before pulling, to register the file', false],
      ], 'Git carries the pointer; the remote must carry the object. Without dvc push the object exists only in the author\'s local cache, so checkout has nothing to restore.'),
      mcq('After adding `nullable=True` for cibil_score, pandera says "expected int64, got float64". What is the right fix?', [
        ['Read the column as pandas\' nullable Int64 and declare the schema column as Int64', true],
        ['Set coerce=True so that pandera converts the float column back into int64 values', false],
        ['Fill the missing scores with 0 before validating, so that the column stays an int', false],
        ['Remove the dtype from the schema so that any numeric column type is accepted', false],
      ], 'One missing value turns an int64 column into float64. The nullable Int64 dtype holds integers and missing values; coercion or a filler value hides the real data instead.'),
      mcq('dvc repro refuses to run, saying the outputs `out` and `out/x.txt` overlap. What does DVC require?', [
        ['Each output path must belong to exactly one stage, not nested inside another\'s', true],
        ['Every stage must write its outputs to a directory that already exists in Git', false],
        ['Outputs must be files rather than directories, so out has to be listed by file', false],
        ['Stages that share outputs must be merged into one stage with a single command', false],
      ], 'DVC must know which stage rebuilds each path. Nested outputs from two stages are ambiguous; separate directories or individually declared files resolve it. Directory outputs are allowed.'),
      mcq('The registry\'s @champion now points to version 4, but live responses still say version 3. Which cause fits best?', [
        ['The service pins version 3 by number, or loaded the alias at startup and was not restarted', true],
        ['MLflow takes up to a day to propagate alias changes to clients that load models remotely', false],
        ['Version 4 failed to register, so MLflow silently kept the alias on the previous version', false],
        ['Aliases apply only to new runs, so existing model versions must be re-registered first', false],
      ], 'Alias moves take effect immediately in the registry; a service sees them only if it loads by alias and reloads. Returning the resolved version in each response exposes the mismatch.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_PRACTICE',
    notes: `Eight exercises, easiest first. Do each before reading its answer. The pipeline is the credit-risk one from the
topic: validate → prepare → train → evaluate, with params.yaml holding \`prepare.test_from\`, \`train.C\`,
\`train.seed\` and \`evaluate.min_auc\`.

## 1. What reruns? (warm-up)

For each change, name the stages \`dvc repro\` runs: (a) \`train.C\` from 1.0 to 0.5; (b) a new raw data file
added with \`dvc add\`; (c) a comment added to \`src/prepare.py\`.

**Answer.** (a) train and evaluate. (b) all four. (c) prepare reruns — its code changed — but it writes byte-identical
Parquet files, so train and evaluate are **skipped**. We ran it:

    Running stage 'prepare':
    train 6831 rows, test 2169 rows
    Stage 'train' didn't change, skipping
    Stage 'evaluate' didn't change, skipping

DVC compares the **hashes** of dependencies, not timestamps, so an unchanged output stops the cascade.

## 2. Write a stage

Add a \`features\` stage between prepare and train that runs \`python src/features.py\`, reads the prepared
directory, uses the parameter \`features.foir_cap\`, and writes \`data/features/\`. Update train.

**Answer.**

    features:
      cmd: python src/features.py
      deps: [src/features.py, data/prepared]
      params: [features.foir_cap]
      outs: [data/features]
    train:
      cmd: python src/train.py
      deps: [src/train.py, data/features/train.parquet]
      params: [train]
      outs: [models/model.skops]

The script, the input directory and the parameter are all declared; train now depends on the features output, not
the prepared data.

## 3. Rebuild last quarter's model

Release tag \`model-2025q2\` built the model now under audit. List the commands to rebuild it in a clean clone.

**Answer.** \`git clone <repo> && cd <repo>\`, \`git checkout model-2025q2\`, create the environment from the lock
file at that commit, \`dvc pull\`, \`dvc repro\`. Then compare: \`git status\` and \`dvc status\` should show nothing
changed, because the checked-out files hash to what \`dvc.lock\` recorded. If \`dvc repro\` wants to rerun a stage, a
dependency differs from the lock — a file \`dvc pull\` missed, or a script whose line endings Git rewrote on Windows
(\`core.autocrlf\`) — find it before trusting anything. DVC does not notice a different *environment*, so to prove
the model itself is reproducible, run \`dvc repro --force train evaluate\` and check the metrics and a prediction
fingerprint match the release.

## 4. Seed everything

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2)
    cv = StratifiedKFold(n_splits=5, shuffle=True)
    search = RandomizedSearchCV(HistGradientBoostingClassifier(), dist, n_iter=20, cv=cv)

Which calls need a seed, and what else must be fixed for a rerun to match?

**Answer.** All four objects: \`train_test_split(random_state=...)\`, \`StratifiedKFold(random_state=...)\`,
\`RandomizedSearchCV(random_state=...)\` (it samples candidates) and \`HistGradientBoostingClassifier(random_state=...)\`
(early stopping takes a random validation split). Also: the order of the input rows (sort by \`application_id\`),
the library versions (lock file), and the seed values themselves in the config, not in the code.

## 5. Read the drift numbers

The weekly batch gives PSI on \`cibil_score\` of 0.007 one week and 0.424 the next, when a new sourcing partner went
live. All values pass the schema. What do you do in each case?

**Answer.** 0.007: nothing; it is noise. 0.424: a large shift with valid values — real, different applicants. Warn the
risk team, report the new partner's segment separately, watch its early repayment signals, and consider retraining
with its data once outcomes exist. Do not fail the pipeline: nothing is broken.

## 6. A point-in-time join by hand

Applications: C1 on 10 Mar, C2 on 15 Mar, C3 on 1 Apr, C1 again on 1 Jun. Balance snapshots: C1 on 1 Feb (12,000),
1 Mar (9,500), 1 Jun (4,000); C2 on 1 Mar (56,000), 1 Apr (61,000). With \`merge_asof(..., by="customer_id",
allow_exact_matches=False)\`, what balance does each application get?

**Answer.** We ran it:

    customer_id applied_on      as_of  avg_balance
             C1 2025-03-10 2025-03-01       9500.0
             C2 2025-03-15 2025-03-01      56000.0
             C3 2025-04-01        NaT          NaN
             C1 2025-06-01 2025-03-01       9500.0

C1 in June gets 9,500 — the 1 June snapshot is excluded because it carries the same date. C3 has no history, so
NaN: the model must handle "no balance known" (an imputer plus a missing-indicator), not drop the row.

## 7. Apply a promotion rule

Rule: promote when the challenger's test AUC beats the champion's by at least 0.005, no employment-type slice loses
more than 0.01 AUC, and no slice's predicted default rate is off the actual by more than 0.05. Champion: AUC 0.7567.
Challenger A: AUC 0.7662, gig slice calibration gap −0.067. Challenger B: AUC 0.7694, worst gap −0.037, no slice AUC
lower. Decide each.

**Answer.** A: the gain is +0.0095, but the gig slice under-predicts defaults by 6.7 points — reject. (A dropped
\`employment_type\`, so it cannot know gig workers default more; slice AUC could not show it, because within one
slice the missing feature is constant.) B: +0.0126, slices fine — promote, keeping the old champion as
\`@previous-champion\`.

## 8. Choose the orchestration

(a) One analyst, one model, retrained by hand quarterly. (b) Features rebuilt every night after a warehouse load,
with retries and Slack alerts. (c) A company whose data platform already runs 300 Airflow DAGs.

**Answer.** (a) DVC pipeline, run in CI on demand. (b) Prefect (or similar) scheduling the stage scripts, with
retries on the extract. (c) Airflow — run the ML pipeline where operations already watch pipelines. In all three the
stage scripts stay the same.`,
    mcqs: [
      mcq('A comment is added to src/prepare.py and its outputs come out byte-identical. Why are train and evaluate skipped?', [
        ['DVC compares content hashes of dependencies, and their inputs did not change', true],
        ['DVC never reruns a stage that comes after one which was triggered by a comment', false],
        ['DVC compares modification times and the Parquet files kept their old timestamps', false],
        ['DVC reruns only the first stage in a chain unless the -f flag is given to repro', false],
      ], 'Prepare ran, but its outputs hash the same as before, so every downstream dependency is unchanged. Hash-based caching stops the cascade where content stops changing.'),
      mcq('Why does HistGradientBoostingClassifier need its own random_state even when the CV splitter is seeded?', [
        ['Its early stopping draws a random validation split from the training data', true],
        ['It shuffles the feature columns at random before it builds every new tree', false],
        ['Its histogram bins are positioned at random quantiles of each feature column', false],
        ['It initialises the leaf values of every tree from a random normal draw first', false],
      ], 'With early stopping on (the default on larger datasets) it holds out a random validation fraction. Seeding the splitter does not seed that internal split.'),
      mcq('In exercise 6, C3 applied on 1 April with no snapshot history. What should the training pipeline do with that row?', [
        ['Keep it, with an imputer and a missing indicator, since new customers also apply live', true],
        ['Drop it, because rows that have missing features make the model training unreliable', false],
        ['Fill it with C3\'s first snapshot taken after 1 April, which is the nearest available', false],
        ['Fill it with the overall average balance and add nothing, so the row looks normal', false],
      ], 'Customers without history apply in production too, so the model must learn how to score them. Using a later snapshot leaks the future; a plain average hides the missingness signal.'),
      mcq('Challenger A gains 0.0095 AUC but under-predicts the gig slice\'s default rate by 0.067. Why did slice AUC not reveal this?', [
        ['Within the gig slice employment type is constant, so dropping it leaves ranking inside unchanged', true],
        ['The gig slice is too small for AUC to be calculated, so the check was skipped for that slice', false],
        ['AUC measures calibration directly, and the 0.067 gap was within the tolerance of the rule', false],
        ['Slice AUC is only computed for slices that make up more than half of the test applications', false],
      ], 'AUC measures ranking within the slice. A feature constant in the slice does not affect that ranking, but it shifts the slice\'s level of risk — which a calibration check catches.'),
      mcq('The rebuilt model from tag model-2025q2 makes `dvc repro` rerun the train stage. What does that tell you?', [
        ['Some recorded dependency differs from the lock file, so find it before trusting the rebuild', true],
        ['DVC always retrains on a fresh clone, because the model file is never pushed to a remote', false],
        ['The rebuild succeeded, since a rerun proves the training code still works on that data', false],
        ['The lock file is out of date and should simply be regenerated by running repro again', false],
      ], 'If code, data and parameters match dvc.lock, nothing reruns. A rerun means a dependency hash differs — a file, a parameter or data — and the rebuild is not yet the recorded model.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_INTERVIEW_QUESTION',
    notes: `MLOps interviews at Indian product companies and GCCs rarely ask "what is DVC?". They give a situation from
their own history and listen for whether you think in versions, gates and evidence. Four questions that come up,
each with a strong answer and the follow-up a good answer earns.

## Q1. "A model in production is behaving oddly. How do you find out exactly how it was built?"

**Strong answer.** "I start from what is serving: the registry alias the service loads, say \`credit-risk@champion\`,
resolves to a version, and the version points to a training run. From the run I read the Git commit, whether the
tree was dirty, the data hash, the config and the package versions. I check out that commit, \`dvc pull\` the data
the pointer names, and rebuild in the locked environment. Then I score a few logged production requests with the
rebuilt model and compare with what was served. If they match, the model is what we think and the problem is the
data or the world. If they differ, something between training and serving changed — usually features or versions."

**Follow-up:** *"And if the run has no data hash?"* — "Then we cannot prove which data it used. I would say that
honestly, rebuild from the most likely snapshot and compare predictions on logged requests to see if it matches,
and make the hash mandatory: the training script refuses to log a run without one."

## Q2. "Design the training pipeline for a credit-risk model that is retrained monthly."

**Strong answer.** Structure it as stages with the gates in the right places:

1. **Extract** a snapshot of applications whose outcome window has closed (12 months for a 12-month default
   label), versioned by snapshot ID or DVC.
2. **Validate**: schema and ranges fail hard; distribution shifts against the last training set warn.
3. **Features** with point-in-time joins to bureau and repayment history, using one feature module shared with
   serving.
4. **Train** from a config file with seeds, logging the full manifest to MLflow.
5. **Evaluate** on an out-of-time test month: AUC, calibration, and the same metrics per segment (employment type,
   city tier, new-to-credit).
6. **Register** as \`@challenger\`; a promotion rule compares it with the champion on the same evaluation data.
7. **Promote** by moving the alias — automatically if every rule passes and a risk reviewer approves, because
   credit models are regulated decisions.

"I'd run it with DVC for the stages and caching, and a scheduler — Prefect, or the company's Airflow — to trigger it
monthly and alert on failure."

**Follow-up:** *"Why out-of-time rather than a random split?"* — "Because the model will score next month's
applicants. A random split mixes months, so it overstates performance when the applicant mix or the economy shifts.
Out-of-time tests the thing we actually do."

## Q3. "What is training-serving skew, and how have you prevented it?"

**Strong answer.** "Skew is when the model sees a feature computed one way in training and another way in serving —
different code, different source fields, or training values that were not yet known at prediction time. The fixes
are one implementation of each feature, point-in-time joins for training data, and logging the features we serve so
we can compare their distribution with training every day. The time-travel case is the dangerous one, because it
inflates offline metrics: a feature that uses data from after the decision looks like a great predictor and then
collapses live."

Give a concrete example — the latest-snapshot join that turned an honest 0.69 AUC into a misleading 0.88 is the kind
of detail that convinces.

**Follow-up:** *"Would you introduce a feature store?"* — "Only for a reason: many models sharing features, online
aggregates needed in milliseconds, or skew incidents we keep having. For a single batch model, a tested feature
module and point-in-time SQL do the job without another system to operate."

## Q4. "Your colleague's retrained model has AUC 0.781; the champion has 0.776. Do you promote it?"

**Strong answer.** "Not on that number alone. First, were they evaluated on the same data — same test window, same
rows? If not, the numbers do not compare. If they were, is 0.005 more than seed-to-seed noise? I'd check the spread
over a few seeds or a bootstrap on the test set. Then slices: an overall gain can hide a loss on a segment, and a
segment-level calibration check catches a model that dropped a feature like employment type. Finally the rule should
be written down before the comparison, with the minimum gain, the slice limits and who signs off, so the decision is
not argued case by case. If it passes, I move \`@challenger\` to \`@champion\`, keep the old version as
\`@previous-champion\`, and rollback is one alias move."

**Follow-up:** *"Who should be allowed to move the alias?"* — "Not the person who trained the model, for a credit
model. The pipeline proposes; a reviewer in risk or a model-validation team approves, and the registry's
permissions enforce it. Every alias change is logged with who and why."

## How these are scored

Interviewers listen for: **lineage** you can follow end to end, **gates** that stop bad data and bad models
automatically, **honest comparisons** (same data, noise, slices), and **operability** — rollback, alerts, who
approves. Name tools when they help, but the reasoning is what gets the offer.`,
    mcqs: [
      mcq('An interviewer asks how to confirm that a rebuilt model is the one in production. Which answer is strongest?', [
        ['Score logged production requests with the rebuilt model and compare with the served outputs', true],
        ['Check that the rebuilt model file has the same name and byte size as the production model file', false],
        ['Compare the rebuilt model\'s test AUC with the AUC the original run logged at training time', false],
        ['Retrain on the latest data and confirm that the new model\'s AUC is close to the original', false],
      ], 'Matching predictions on real logged inputs shows the artefact behaves identically. Names and sizes prove little, a similar AUC can come from a different model, and retraining on new data rebuilds something else.'),
      mcq('Why does a strong answer on monthly credit-risk retraining insist on an out-of-time test month?', [
        ['The model scores future applicants, and a random split overstates how well it will do on them', true],
        ['Random splits are not supported by scikit-learn when the dataset has a date column inside it', false],
        ['Regulators forbid random splits for credit models, so out-of-time testing is a legal requirement', false],
        ['Out-of-time tests always show higher AUC, which makes the model easier to get promoted quickly', false],
      ], 'Out-of-time evaluation mirrors deployment: train on the past, score the future. Random splits leak period effects across the boundary and inflate the estimate.'),
      mcq('When asked "would you add a feature store?", which reply shows the judgement interviewers look for?', [
        ['Only for shared features, online freshness or recurring skew; otherwise a tested module suffices', true],
        ['Yes, always, because point-in-time correctness cannot be achieved by any other practical method', false],
        ['No, never, because feature stores add latency that no real-time model is able to tolerate at all', false],
        ['Yes, as soon as there is more than one feature, since each feature then needs its own registry', false],
      ], 'The strong answer ties the tool to a need and an operating cost. Point-in-time joins are possible without one; online stores exist precisely to serve low-latency features.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_MINI_PROJECT',
    notes: `# Mini Project — A Reproducible Credit-Risk Training Pipeline

An NBFC that lends ₹50,000–₹10 lakh personal loans to salaried, self-employed and gig workers retrains its
credit-risk model every month. Today that means one data scientist, one notebook and a folder of CSVs. The RBI's
model-risk guidance expects the lender to show how any model in use was built, and the head of risk wants three
things: any past model rebuilt on demand, no model trained on broken data, and no model promoted because someone
liked its number. You will build the training side that delivers all three, and prove it by rebuilding from scratch
on a **second machine** (a second laptop, a cloud VM, a CI runner or a fresh container — not the same folder).

## The data

Use \`make_loans()\` from the topic (8,000 applications in 2025 with \`application_id\`, \`applied_on\`, \`age\`,
\`monthly_income\`, \`loan_amount\`, \`tenure_months\`, \`cibil_score\`, \`existing_emis\`, \`employment_type\`,
\`city_tier\`, \`defaulted\`). Generate three monthly **raw extracts** that arrive one after another:

    from make_loans import make_loans
    v1 = make_loans(8000, 7)                                    # the first extract
    v2 = make_loans(9000, 7)                                    # a month later, more rows
    v3 = make_loans(9000, 21)
    v3.loc[v3.sample(frac=0.02, random_state=1).index, "cibil_score"] = -1    # bureau timeout sentinel
    v3["monthly_income"] = v3["monthly_income"] / 1000                         # income now in thousands

Treat each as a new version of the same file, \`data/raw/loans.csv\`. Extract 3 is broken twice on purpose; a real one
would not announce it.

## What to build

1. **Version the data.** A Git repository with DVC initialised and a remote (a shared folder, S3, GCS or Azure Blob —
   anything your second machine can reach). Add extract 1, commit the pointer, tag it, push. Repeat for 2 and 3.
2. **The pipeline as code.** \`dvc.yaml\` with at least \`validate → prepare → train → evaluate\`, every script, input
   and parameter declared; \`params.yaml\` holding the split date, model settings, seeds and the gates.
   \`prepare\` computes \`foir\` and splits **out of time** (train before 1 October, test from 1 October).
3. **A validation gate.** A pandera schema with column types, ranges and allowed values, at least one cross-field rule
   and a batch-level rule; \`lazy=True\`; failure cases written to a report; a non-zero exit that stops the pipeline.
   A separate distribution check (PSI per numeric feature against the extract-1 reference) that **warns** above
   0.25.
4. **Reproducible training.** Configuration from \`params.yaml\`; every random component seeded; rows sorted by
   \`application_id\`; a lock file for the environment; the training script logs to MLflow the params, the config,
   the data md5 from the \`.dvc\` pointer, the Git commit and dirty flag, Python and library versions, overall and
   per-\`employment_type\` AUC and calibration gap, and the model with a signature and pinned requirements. It refuses
   to log when the tree is dirty.
5. **Registry and a promotion rule.** Register each evaluated model as \`@challenger\`. Write the rule as code in
   \`promote.py\` — minimum overall gain, a per-slice AUC limit, a per-slice calibration limit, and a
   same-evaluation-data check — and move \`@champion\` only when it passes, keeping \`@previous-champion\`. Add
   \`rollback.py\`. Record in the version's tags why it was promoted or rejected.
6. **The rebuild.** On the second machine: clone, create the environment from the lock file, \`dvc pull\`, check out
   the extract-2 tag, \`dvc repro\`. Compare the rebuilt model with the original: metrics equal, and predictions on
   the test set equal within \`atol=1e-9\`.

## Milestones

| Day | Milestone |
|---|---|
| 1 | Repository, DVC and remote; extract 1 versioned and pushed; \`validate\` and \`prepare\` stages run |
| 2 | \`train\` and \`evaluate\` with MLflow logging; \`dvc repro\` skips unchanged stages; first model registered as champion |
| 3 | Extract 2 versioned; retrain; promotion rule decides; a \`dvc exp run\` sweep over \`C\` with the results compared |
| 4 | Extract 3: the gate stops the pipeline; fix nothing upstream — document what it caught; rebuild on the second machine |

## Common traps

- Pushing the pointer without \`dvc push\`: your second machine finds out first. Install the hooks.
- A script reading a file it does not declare — the cache serves a stale model and you will not notice.
- Taking \`data_md5\` from your own hash of the file in a different way from DVC's, so the run and the pointer disagree.
- Evaluating the challenger on a different test window from the champion. The rule must refuse that.
- Comparing rebuilt and original predictions with \`==\` on floats and declaring failure over the last digit.
- Letting the income-in-thousands extract through because every income was still positive.

## Deliverables

1. The **repository**: \`dvc.yaml\`, \`dvc.lock\`, \`params.yaml\`, \`src/\` (validate, prepare, train, evaluate),
   \`promote.py\`, \`rollback.py\`, the environment lock file, \`.dvc/config\` with the remote, and the three tagged
   data versions.
2. **\`REPRODUCE.md\`** — the exact commands for a stranger to rebuild any tagged model, and a log of your
   second-machine rebuild: the machine, the commands, the metrics from both machines and the maximum absolute
   prediction difference.
3. **\`DECISIONS.md\`** — the promotion rule and why each threshold; each model version with the rule's verdict; what
   the gate caught in extract 3 (which checks, how many rows) and whether each issue should block or warn; the PSI
   table for every extract.
4. A screenshot of \`dvc exp show\` and of the MLflow registry showing the aliases.

## Acceptance criteria

- \`git checkout <tag> && dvc pull && dvc repro\` on a clean clone rebuilds that model; the rebuild log shows metrics
  equal and predictions within tolerance on another machine.
- A change to one parameter reruns only the stages that use it — shown in a pasted \`dvc repro\` output.
- Extract 3 makes the pipeline exit non-zero at \`validate\`, with both the sentinel and the unit change identified;
  no model is trained on it.
- Every MLflow run carries the data hash from the pointer, the commit, the dirty flag and versions; no dirty run exists
  on the shared store.
- The promotion rule is code, is applied to every candidate, refuses non-comparable evaluations, and its verdicts
  are recorded; rollback is one command.`,
    mcqs: [
      mcq('In the project, extract 3 divides incomes by 1,000 and adds -1 CIBIL sentinels. What should happen on `dvc repro`?', [
        ['The validate stage exits non-zero, naming both problems, and no later stage runs at all', true],
        ['The pipeline trains on it but marks the model as experimental in MLflow for later review', false],
        ['Prepare rescales incomes and drops the sentinel rows, then training continues as normal', false],
        ['The PSI check warns about incomes and the model is trained, since every value is positive', false],
      ], 'Both are contract breaches: a sentinel outside the range and a unit change caught by the cross-field rule. The gate must stop the pipeline; silently repairing guesses at the producer\'s intent.'),
      mcq('Why must the rebuild happen on a second machine rather than in a copy of the same folder?', [
        ['A copy shares the local cache, environment and untracked files, hiding what was never recorded', true],
        ['DVC refuses to run repro twice in folders that are located on the same physical disk drive', false],
        ['MLflow can only register one model version per machine, so the copy would overwrite it', false],
        ['A second machine produces bit-identical floating point, which a second folder cannot do', false],
      ], 'The test is whether the recorded versions are enough. Same machine means the same cache, installed packages and stray files, so a missing push or an unpinned package goes unnoticed.'),
    ],
    assignment: {
      title: 'A Reproducible Credit-Risk Training Pipeline',
      description: 'Build the training side of a lender\'s credit-risk model so that any past model can be rebuilt, broken data never reaches training, and promotion follows a written rule: DVC-versioned data and a cached pipeline, a pandera validation gate, reproducible MLflow-tracked training, a registry with champion and challenger aliases, and a rebuild on a second machine.',
      instructions: `Complete the project described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. The repository: \`dvc.yaml\`, \`dvc.lock\`, \`params.yaml\`, \`src/\` with the validate, prepare, train and evaluate
   scripts, \`promote.py\`, \`rollback.py\`, the environment lock file, the DVC remote configured, and the three
   extracts as tagged data versions.
2. \`REPRODUCE.md\` — the commands to rebuild any tagged model from a clean clone, and the log of your second-machine
   rebuild with metrics from both machines and the maximum absolute prediction difference.
3. \`DECISIONS.md\` — the promotion rule with a reason for each threshold, the verdict for every model version, what
   the gate caught in extract 3 and whether each check blocks or warns, and the PSI table per extract.
4. Screenshots of \`dvc exp show\` and of the MLflow registry with its aliases.

**Before you submit,** go through the acceptance criteria in the brief and note each result at the end of
REPRODUCE.md (for example: "Rebuild of data-v2 on <machine>: test AUC … on both; max |Δp| …; extract 3 stopped at
validate with … failures").`,
      rubric: [
        { criterion: 'Versioned data and a cached pipeline', description: 'Three extracts tagged and pushed with DVC; every stage declares its scripts, inputs, parameters and outputs; a parameter change reruns only dependent stages, shown in output; a dvc exp sweep compared.', maxPoints: 25 },
        { criterion: 'Validation gate', description: 'A pandera schema with types, ranges, allowed values, a cross-field and a batch-level rule; lazy validation with a failure report; extract 3 stops the pipeline with both problems named; PSI warnings separated from hard failures.', maxPoints: 20 },
        { criterion: 'Reproducible, recorded training', description: 'Config-driven, seeded, ordered training in a locked environment; each run logs the pointer\'s data hash, commit, dirty flag, versions, slice metrics and a signed model; dirty runs refused.', maxPoints: 20 },
        { criterion: 'Registry and promotion rule', description: 'Challenger and champion aliases; a coded rule with gain, slice-AUC, slice-calibration and comparability checks; verdicts recorded on the versions; previous champion kept; rollback in one command.', maxPoints: 20 },
        { criterion: 'Second-machine rebuild', description: 'A clean clone on another machine rebuilds a tagged model; metrics match and predictions agree within a stated tolerance; REPRODUCE.md lets a stranger repeat it.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_PIPELINES_CHECKPOINT',
    notes: `Ten questions across the topic: versioning data with DVC, pipelines and caching, reproducible runs, the registry and
promotion, validation gates, and training-serving skew. Several describe a situation from a real team — decide what
you would do before reading the options.`,
    checkpoint: [
      ck(VER, 'A teammate cloned the repo, ran `git checkout data-v1`, and is training on 9,000 rows instead of v1\'s 8,000. What was skipped?', [
        ['dvc checkout, so the workspace still holds the newer bytes the old pointer does not name', true],
        ['dvc add, so the v1 data was never versioned in the first place and cannot be restored', false],
        ['git pull, so the v1 tag points at a commit that their local repository does not contain', false],
        ['dvc gc, so the cache still holds both versions and DVC picked the newer of the two files', false],
      ], 'Git moved the pointer; the data follows only on dvc checkout (or dvc pull for missing objects). Until then the workspace and the pointer disagree.'),
      ck(PIPE, 'Feature engineering takes 40 minutes; you only want to try a new decision threshold. What makes that fast in a DVC pipeline?', [
        ['The threshold is a declared parameter of evaluate only, so earlier stages are skipped', true],
        ['DVC runs every stage in parallel, so the 40-minute feature stage overlaps with evaluation', false],
        ['DVC samples one tenth of the data when only a parameter has changed since the last run', false],
        ['The lock file lets you edit the threshold inside dvc.lock and skip running the pipeline', false],
      ], 'Stages rerun only when their declared dependencies or parameters change. Keeping the threshold a parameter of evaluate alone leaves features and training cached.'),
      ck(EXP, 'Two runs of the same config on the same commit give AUC 0.7694 and 0.7651. Data hashes match. What should you check next?', [
        ['Unseeded random components and the order of input rows, then package versions', true],
        ['The MLflow server version, since newer servers round logged metrics differently', false],
        ['The size of the remote cache, as a full cache can change which data is pulled', false],
        ['Nothing, as differences of this size are normal floating-point noise in training', false],
      ], 'Same code and data with a 0.004 difference points to randomness or input order; last-digit float noise is many orders smaller. Versions come next if the run record shows a difference.'),
      ck(VER, 'What does moving the `@champion` alias from version 5 to version 6 change in a correctly built serving app?', [
        ['The app serves version 6 after its next load, with no code or config change', true],
        ['Version 5 is deleted from the registry so that it can no longer be loaded', false],
        ['The app must be redeployed with a new image that contains the version 6 file', false],
        ['Nothing until version 6 is also moved to the Production stage in the registry', false],
      ], 'The app loads models:/name@champion, so the alias decides the version. Old versions stay available for rollback; stages are deprecated in favour of aliases.'),
      ck(VER, 'A challenger beats the champion by 0.02 AUC, but was evaluated on September while the champion used August. What should the rule do?', [
        ['Refuse the comparison until both are evaluated on the same data window', true],
        ['Promote it, because a gain of 0.02 is larger than any seed-to-seed noise', false],
        ['Promote it, because the more recent evaluation month is the more relevant', false],
        ['Reject the challenger permanently, since its evaluation broke the process', false],
      ], 'Different months can differ in difficulty by more than 0.02. A rule compares like with like; the fix is to evaluate both on the same window, not to judge either model.'),
      ck(PIPE, 'Every monthly income in a new batch is a thousand times too small, but all are positive. Which check is designed to catch it?', [
        ['A cross-field rule, such as the loan amount staying within 60 times the monthly income', true],
        ['A non-null check on monthly_income, since rescaled values are recorded as missing', false],
        ['A uniqueness check on application_id, which detects any batch that was reprocessed', false],
        ['A type check that monthly_income is a float, since rescaling changes its type to int', false],
      ], 'Per-column positivity passes. The relationship between columns breaks for every row, and a distribution check would flag it too; the cross-field rule fails hard.'),
      ck(PIPE, 'Training joins each application to the customer\'s latest bureau snapshot as of today. Why is offline AUC misleading?', [
        ['Snapshots after the application can reflect the default itself, which is unknown at decision time', true],
        ['The latest snapshot is often missing, and missing values always lower the measured offline AUC', false],
        ['Bureau data is too noisy to help, so any measured AUC from it reflects only random variation', false],
        ['Today\'s snapshot is more accurate than older ones, so the live model will score even higher', false],
      ], 'Defaulters miss EMIs after the loan starts, so later snapshots carry the outcome. In the unit this inflated offline AUC to 0.876 against 0.680 on serving-time values.'),
      ck(PIPE, 'When does adopting a feature store such as Feast clearly pay for its operating cost?', [
        ['When several models share features and some need fresh values online in milliseconds', true],
        ['When a single model is scored in a nightly batch from one warehouse table of features', false],
        ['When the team wants to version raw training extracts so that old models can be rebuilt', false],
        ['When validation must stop the pipeline whenever an incoming batch breaks the schema', false],
      ], 'Shared definitions, point-in-time history and an online store solve multi-model reuse and low-latency freshness. Versioning extracts is DVC\'s job and validation is pandera\'s.'),
      ck(EXP, 'A run was logged from a working tree with uncommitted changes. Why is its git_commit tag not enough to rebuild it?', [
        ['The code that actually ran differs from the code stored at that commit', true],
        ['MLflow stores the commit of the tracking server, not of the training code', false],
        ['Git rewrites the commit hash when uncommitted changes are committed later', false],
        ['The commit does not include params.yaml, which DVC keeps outside of Git', false],
      ], 'A dirty tree means local edits ran that the commit does not contain. Record the dirty flag and refuse to log such runs to the shared store.'),
      ck(PIPE, 'A team must retrain nightly after a warehouse load, retry a flaky extract and alert on failure. What should they add to the DVC pipeline?', [
        ['An orchestrator such as Prefect or Airflow that schedules and retries the stages', true],
        ['A second dvc.yaml that runs the same stages again whenever the first one has failed', false],
        ['The dvc exp run command in a loop, since experiments retry automatically on failure', false],
        ['A feature store, whose materialisation jobs also schedule and retry model training', false],
      ], 'DVC decides what is out of date and how to build it; it does not schedule, retry or alert. An orchestrator adds those around the same stage scripts.'),
    ],
  },
];
