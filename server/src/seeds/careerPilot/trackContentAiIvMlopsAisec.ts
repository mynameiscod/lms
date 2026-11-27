/**
 * Career-track placement content: MLOps Interview Questions (AI_IV_MLOPS) and AI Security Interview
 * Questions (AI_IV_AISEC), the AI tracks, batch AI6.
 *
 * Year-4 interview versions of the MLOps specialism (MLOPS_PIPELINES, MLOPS_CICD_INFRA, MLOPS_MONITORING:
 * DVC and registries, evaluation gates and canaries, Kubernetes probes and the HPA, late labels, slices,
 * paired-bootstrap promotion and LLMOps releases) and the AI Security specialism (AISEC_LLM_THREATS,
 * AISEC_ASSURANCE, AISEC_DEFENCES). Each interview set gives the question, what the interviewer is
 * testing, a spoken model answer, the follow-up and the weak answer; nothing is re-taught.
 *
 * The AI security track is defence-focused: the units are about building, testing and proving defences
 * in your own system — test plans, defence regression suites with canary markers, block rates with
 * intervals and over-blocking, evaluation tools in CI, verifying fixes, and governance. The slug
 * IV_RED_TEAMING is kept but the unit is "Security Testing and Assurance Questions". Attack classes are
 * named in one sentence only where a defence needs them; there are no payloads or attack instructions.
 *
 * Attribution: both topics are multi-skill. Each IV_* unit declares one skill and its checkpoint
 * questions name it with ck(); each CHECKPOINT unit spreads its ten over the topic's skills. Practice
 * mcqs name none. All arithmetic (HPA, Little's law, canary windows, false-positive volumes, Wilson
 * intervals) was computed in Python.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_AI_IV_MLOPS_AISEC_BUNDLES: PilotBundle[] = [
  /* ══ AI_IV_MLOPS ═══════════════════════════════════════════════════════════════════════ */

  /* ── IV_PIPELINES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_IV_PIPELINES',
    notes: `An MLOps round at a product company, a GCC's ML platform team or an AI startup in Bengaluru,
Hyderabad or Pune usually opens here: "how was this model built, and could you build it again?".
Freshers lose this round by describing a notebook. You built a DVC pipeline, an MLflow registry with
aliases, pandera checks and a point-in-time join in the MLOps topics; the panel wants to hear that
you can **reason** about them. Each question has what is being tested, a model answer to say aloud,
the follow-up a good answer earns, and the weak answer that ends the conversation.

## Q1. "What does it mean for a training run to be reproducible?"

**Testing:** whether you know reproducibility is a list of recorded inputs, not a feeling.

**Model answer.** "A run is reproducible when I can name every input that shaped it and get the same
model again. That is five things: the code commit, the exact data version (a hash, not a folder name),
the configuration file, the locked environment, and the random seeds. I record all five on the run in
MLflow, so the model version in the registry points back to them. And I prove it: re-run from a clean
clone and compare the metrics and, where possible, the predictions."

**Follow-up:** "Same seed, same data, different numbers on a GPU — why?" Non-deterministic GPU kernels,
thread scheduling, a library upgrade, or rows read in a different order from an unsorted query.

**Weak answer:** "We save the model file and the notebook." Neither says which data it saw.

## Q2. "Why not keep the training data in Git?"

**Testing:** whether you understand what DVC actually does.

**Model answer.** "Git stores every version of every file in full history and slows to a crawl on
gigabytes. DVC puts a small pointer file in Git — the hash and size of the data — and keeps the bytes
in a cache and a remote store such as S3. Checking out an old commit and running dvc pull brings back
exactly the data that commit pointed to. So the code and the data version move together through one
Git history."

**Follow-up:** "A new joiner clones the repo and the data folder is empty." They need dvc pull and
read access to the remote; the pointer is in Git, the bytes are not.

**Weak answer:** "Git LFS and DVC are the same thing." LFS stores files; DVC adds pipelines and
experiments on top of the versioning.

## Q3. "Design the training pipeline for a model retrained monthly."

**Testing:** stages, dependencies and caching, not a single script.

**Model answer.** "I split it into stages — extract, validate, featurise, train, evaluate — each with
declared dependencies, parameters and outputs. DVC builds the DAG from those and reruns only the stages
whose inputs changed, so changing a training parameter does not redo featurisation. Parameters live in
params.yaml, not in edited code. The evaluate stage writes a metrics file and the registry step only runs
after a gate passes."

**Follow-up:** "Two stages write the same output path — what happens?" DVC refuses: one output can have
only one producing stage; give each stage its own output.

**Weak answer:** "One train.py that does everything, run by cron."

## Q4. "What does a model registry give you over a folder of pickles?"

**Testing:** promotion as a process with an audit trail.

**Model answer.** "Each registered version carries its lineage — the run, the data hash, the metrics,
the signature — and the service loads by alias, such as champion, rather than by file path. Promotion
becomes an explicit act: someone or a pipeline moves the alias after a gate, and the history shows who
moved it and when. Rollback is moving the alias back. A folder of pickles has none of that, and loading
an unknown pickle runs code."

**Follow-up:** "Who should be allowed to move the production alias?" A pipeline service account after a
gate, or a named reviewer — not every data scientist.

**Weak answer:** "The registry stores the latest model."

## Q5. "The new model scores AUC 0.781; the champion 0.776. Promote?"

**Testing:** noise, slices and a rule written in advance.

**Model answer.** "Not on that number alone. First: same holdout, neither model trained on it? Then is a
0.005 gain outside the noise — I would run a paired bootstrap on the difference. Then the slices: an
overall gain can hide a drop on new customers. And the rule — the margin and the slice limits — should
have been agreed before the run. If it passes, it goes to shadow or canary, not straight to everyone."

**Follow-up:** "The interval is [−0.004, +0.014]." Not proven better; promote only if there is another
reason (cheaper, fresher data) and it passes a non-inferiority margin.

**Weak answer:** "Yes, it is higher."

## Q6. "What do you validate before training?"

**Testing:** layers of checks and what fails the pipeline.

**Model answer.** "Three layers. Schema — columns, types, allowed values — as a pandera schema in code.
Ranges and nulls — an income cannot be negative, a CIBIL score lies in its known range or is missing
explicitly. Distribution against a reference — PSI or a share-of-nulls comparison with recent history.
Schema and range failures stop the pipeline; distribution changes warn and need a person to look."

**Follow-up:** "What check would have caught a feature silently set to zero?" A history check on each
feature's zero and null share per week.

**Weak answer:** "We check for nulls."

## Q7. "What is training-serving skew, and how do you prevent it?"

**Testing:** both causes, not just one.

**Model answer.** "The model sees a feature computed one way in training and another way in serving.
Cause one: two implementations — SQL offline, Python online — that disagree on an edge such as time
zones or rounding. Cause two: time travel — training rows built with values that were not known at the
event time. I prevent the first with one shared feature function or a feature store, and the second with
point-in-time joins. I check it by logging served features and comparing them with recomputed offline
values for the same requests."

**Follow-up:** "How do you detect it after launch?" Live score distribution far from the validation one
on day one, before any real drift could have happened.

**Weak answer:** "It is the same as data drift."

## Q8. "What is a point-in-time join?"

**Testing:** whether you can prevent leakage in training data by construction.

**Model answer.** "For each training event I take the feature value as it was known at the event's
timestamp, not the latest value in the table. In pandas that is merge_asof on the timestamp, by entity,
looking backwards. Without it a loan application from January can get a bureau score refreshed in March
— after the default — and the model learns from the future. Offline AUC goes up and production
disappoints."

**Follow-up:** "What does a feature store add?" The same definitions served online and joined
point-in-time offline, plus a registry of features — worth it with many models sharing features.

**Weak answer:** "A join on customer ID."

## Q9. "When would you bring in an orchestrator such as Airflow or Prefect?"

**Testing:** knowing what DVC is not.

**Model answer.** "DVC makes a pipeline reproducible inside a repository. An orchestrator runs work on a
schedule across machines with retries, timeouts, alerts and a history of runs. For a monthly retrain I
would have Prefect or Airflow trigger the DVC pipeline, handle failures and notify the team. One model
retrained by hand does not need an orchestrator yet."

**Weak answer:** "Airflow replaces DVC."

## How you are judged

Strong answers name the mechanism, a failure it prevents and a check that proves it. Weak answers name a
tool and stop.`,
    workedExample: `**Question: "A model in production is behaving oddly. Show me how you would find out exactly how it
was built."**

**A weak answer (heard often):**

"I would open the training notebook and check the code, then look at the data folder to see what was
used, and maybe ask the person who trained it. If needed I would retrain it to compare."

What the panel hears: no lineage. The notebook may have changed since; the data folder holds today's
data; the person may have left. "Retrain it to compare" produces a different model.

**A strong answer:**

"I start from what is serving. The service loads by alias, so I ask the registry which version the
production alias points to — say version 14 — and when it was moved and by whom.

Version 14 links to its MLflow run. On the run I find the five inputs: the Git commit, the data hash
logged from the DVC pointer file, the params file, the environment lock and the seed. I also find its
gate result: the metrics and slice numbers it was promoted on.

To rebuild it, I check out that commit, run dvc pull to fetch exactly that data, recreate the
environment from the lock file, and run dvc repro. If the metrics match the run's logged metrics, I have
the model as built. If they do not match, that is a finding in itself — something unrecorded affected
training.

Then I compare: the features the service is receiving now (from the request log) against the training
data's distribution, and the serving feature code against the training feature code at that commit.
Oddness in production is usually skew or drift, and now I can tell which."

**Why it scores:** it moves from the running service to the registry, the run, the recorded inputs and a
rebuild with a check — and it ends with a diagnosis plan, not just archaeology.`,
    mcqs: [
      mcq('An interviewer asks what the small .dvc file committed to Git actually holds. Which answer is right?', [
        ['A compressed copy of the whole dataset, small enough for Git to keep', false],
        ['A hash and size of the data, pointing into the cache and remote', true],
        ['The SQL query that regenerates the dataset from the warehouse', false],
        ['A list of the commits that changed the data since the last run', false],
      ], 'The pointer file records the content hash (and size) of the tracked data; the bytes live in the DVC cache and a remote store. That is why a fresh clone needs dvc pull. It is not a compressed copy and not a query.'),
      mcq('In a DVC pipeline of featurise then train, which change makes dvc repro rerun only the train stage?', [
        ['Editing the raw CSV that the featurise stage lists as a dependency', false],
        ['Renaming the Git branch that the pipeline is being run from', false],
        ['Editing a value in params.yaml that only the train stage declares', true],
        ['Deleting the lock file so DVC has to rebuild its view of the DAG', false],
      ], 'DVC reruns a stage when one of its declared dependencies or parameters changes. A parameter only train declares leaves featurise cached. Changing the raw CSV invalidates featurise and everything downstream; a branch name is not an input.'),
      mcq('A candidate scores AUC 0.781 against the champion’s 0.776 on the same holdout. What should an answer to “promote it?” start from?', [
        ['Whether 0.005 is beyond noise, by a paired bootstrap', true],
        ['Promote, because any gain on a clean holdout is a real improvement', false],
        ['Reject, because a new model needs at least one full point of AUC', false],
        ['Promote, provided the candidate was trained on fresher data than it', false],
      ], 'A half-point difference may be noise. A paired bootstrap on the difference, plus slice checks and a rule agreed in advance, decides. A fixed one-point rule ignores sample size; fresher data alone is not evidence of being better.'),
    ],
    checkpoint: [
      ck('ML_PIPELINES', 'An auditor asks you to rebuild exactly the credit model trained last March. Which recorded set makes that possible?', [
        ['The final model file plus the AUC it scored on the holdout set', false],
        ['The training notebook exported as HTML with every output cell shown', false],
        ['Git commit, data hash, params file, locked environment and seed', true],
        ['The MLflow run’s metrics and the name of the person who ran it', false],
      ], 'Rebuilding needs every input: code (commit), data (hash), configuration, environment and randomness. A model file and its score describe the output, not how to produce it; a notebook export does not pin the data.'),
      ck('ML_PIPELINES', 'Training computes a 30-day average balance in SQL; serving recomputes it in Python with dates rounded to UTC. Offline AUC is 0.82 but live behaviour is poor from day one. What is it, and the fix?', [
        ['Training-serving skew; one shared feature implementation for both', true],
        ['Concept drift; retrain weekly so the model follows new behaviour', false],
        ['Overfitting; regularise until offline and live AUC agree again', false],
        ['Label leakage; drop the balance feature from training and serving', false],
      ], 'Two implementations that disagree on an edge case (here the date boundary) feed the model different values than it learnt from. Poor behaviour from day one, before drift could happen, points to skew. The fix is one feature definition used in both places.'),
      ck('ML_PIPELINES', 'Training rows for a default model join each application to the latest bureau score in the table. What is wrong?', [
        ['Nothing, as long as the join is inner and drops missing customers', false],
        ['The score should be bucketed before the join rather than after it', false],
        ['Customer ID is a weak key; joining on name and birth date is safer', false],
        ['It can use a score refreshed after the application — a time leak', true],
      ], 'The latest score may have been refreshed after the application date, even after the default, so the model learns from the future. A point-in-time (as-of) join takes the value known at the event time.'),
    ],
  },

  /* ── IV_DELIVERY ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_IV_DELIVERY',
    notes: `"Walk me through CI/CD for a model" is asked in almost every MLOps and ML platform round. The
panel wants two separate pipelines in your answer — CI for the code, CD for the model — and the gate,
shadow, canary and rollback you built for the UPI fraud scorer in the CI/CD topic, explained with
numbers.

## Q1. "What do you test in an ML repository on every pull request?"

**Testing:** whether you know what is cheap, deterministic and worth blocking a merge on.

**Model answer.** "Four layers. Unit tests for feature functions, including the boundaries — a
payment of exactly ten thousand rupees, a missing device ID. Data contracts: the schema the code expects
from upstream, checked on a small fixture. A training smoke test: train on a couple of thousand
synthetic rows in seconds and assert the pipeline runs end to end and beats a trivial baseline. And lint
and type checks. All of it runs in a few minutes on a normal runner."

**Follow-up:** "Your smoke test fails one run in ten." It is not seeded, or it asserts a metric threshold
too tight for a tiny sample; seed it and assert a loose bound.

**Weak answer:** "We retrain the model on every PR to check accuracy."

## Q2. "What does not belong in PR CI?"

**Testing:** judgement about cost, time and data.

**Model answer.** "Full retraining on production data, GPU sweeps, anything that touches real customer
data, and anything slower than about ten minutes. Those belong in a separate training pipeline triggered
on merge or on a schedule. PR CI must be fast and deterministic, or people learn to ignore it."

**Weak answer:** "Everything should run on every PR to be safe."

## Q3. "What is an evaluation gate?"

**Testing:** rules in code that can block a release.

**Model answer.** "A script that compares the candidate's metrics with written rules and exits non-zero
to block the pipeline. Three kinds of rule: an absolute floor, a maximum drop against the champion, and
per-slice checks — because the overall number can rise while new-device fraud recall falls. Latency
belongs in it too. The thresholds are agreed with the business and changed only by pull request."

**Follow-up:** "Who owns the thresholds?" The risk or product owner signs them off; engineering
implements them.

**Weak answer:** "We check that accuracy is above 90%."

## Q4. "Shadow, canary and A/B — what is the difference?"

**Testing:** what each one can and cannot tell you.

**Model answer.** "Shadow sends a copy of live traffic to the candidate and logs its scores without using
them — safe, but it tells you nothing about outcomes and doubles inference cost. Canary routes a small,
growing share of real decisions to it with an automatic rollback rule — it answers 'is it safe?'. An A/B
test holds a split long enough to answer 'is it better for the business?' with a planned sample size. I
run them in that order."

**Weak answer:** "Canary and A/B are the same thing."

## Q5. "How big should each canary step be?"

**Testing:** whether a step can actually reach a decision.

**Model answer.** "Big enough to collect the sample the rollback rule needs inside its window. If the
rule needs 300 canary requests in five minutes and peak traffic is 2,000 a minute, a 1% step sees about
100 requests per window — it decides nothing; it only delays. A 5% step sees about 500 and can decide.
So I size steps from the rule and the traffic, not from habit."

**Follow-up:** "Why route by a hash of the user ID?" Sticky routing: a user stays on one model, and the
two arms compare like for like.

**Weak answer:** "Always start at 1% to be safe."

## Q6. "Fraud labels arrive weeks later. How can a canary judge anything?"

**Testing:** proxy signals.

**Model answer.** "On fast proxies: decline rate, score distribution, latency, error rate and customer
complaints, compared between the arms on the same minutes. The true recall check comes later in
monitoring. A canary that compares decline rates catches a model that wrongly blocks genuine payments
within minutes."

## Q7. "How do you roll back a model in minutes?"

**Testing:** rollback by design, not by heroics.

**Model answer.** "The model version is a pointer the service reads — a registry alias, a MODEL_VERSION
setting or an image tag — so rollback is one command and no rebuild. The previous version stays
available, the feature code stays backward compatible, and we rehearse it. Rollback that needs a rebuild
at 2 a.m. is not a plan."

**Follow-up:** "The canary passed, then the full rollout raised declines." The canary's slice of users or
hours was not representative, or the step was too small to decide; compare the arms by segment.

## Q8. "Why Terraform for ML infrastructure?"

**Testing:** infrastructure as reviewed code.

**Model answer.** "Buckets, the registry database, the cluster and IAM are declared in files, reviewed in
pull requests, and applied from a plan everyone can read. The same modules with different variables give
dev, staging and production, so they do not drift apart. Remote state with locking stops two people
applying at once."

**Weak answer:** "So we do not need the console."

## Q9. "How do you handle configuration and secrets across environments?"

**Testing:** build once, configure per environment, never bake secrets.

**Model answer.** "One image for all environments. Settings come in layers — defaults in code, an
environment file, then environment variables — validated by pydantic-settings at startup so a wrong
value fails fast. Secrets come from a secret manager at runtime, never from the image, the repository or
the logs."

**Weak answer:** "A separate .env file committed for each environment."`,
    workedExample: `**Question: "Walk me through CI/CD for a fraud model you would build."**

**A weak answer:**

"I would use GitHub Actions. When someone pushes code, it retrains the model, and if accuracy is good it
deploys to Kubernetes. If something goes wrong we can redeploy the old version."

What is wrong: one pipeline doing everything, accuracy on a fraud model (where 99.6% of payments are
genuine), no slices, no staged rollout, and a rollback that means a rebuild.

**A strong answer:**

"Two pipelines. **CI** on every pull request: feature unit tests at the boundaries, a data contract check
against a fixture, a seeded training smoke test on synthetic rows, lint and types. Under ten minutes; it
blocks the merge.

**CD** for models, triggered when the training pipeline registers a candidate. Step one is the
**evaluation gate**: recall at a fixed false-positive rate above a floor, no more than a set drop against
the champion, the same check on slices like new devices and night-time payments, and a p95 latency
ceiling. It exits non-zero on failure.

Step two is **shadow** for a few days on copied traffic: score distribution, decline rate at the planned
threshold, latency. Step three is a **canary** with sticky routing by user, a ladder sized so each step
reaches the sample the rollback rule needs, and an automatic rollback if the canary's decline rate is
double the stable arm's. Fraud labels arrive weeks later, so the canary watches proxies and monitoring
checks real recall later.

**Rollback** is moving the registry alias back — one command, rehearsed, no rebuild. The infrastructure
itself is Terraform, and secrets come from a secret manager at runtime."

**Why it scores:** it separates code from model, names the gate's three kinds of rule, explains what each
release stage can and cannot show, and makes rollback a design property.`,
    mcqs: [
      mcq('Which job belongs in the pull-request CI of a fraud model’s repository?', [
        ['Full retraining on a year of production payment transactions', false],
        ['A GPU hyperparameter sweep over forty candidate configurations', false],
        ['Scoring yesterday’s live traffic with the branch’s model build', false],
        ['A seeded smoke test on 2,000 synthetic rows', true],
      ], 'PR CI must be fast, deterministic and free of customer data. A smoke test proves the pipeline runs end to end. Full retraining, sweeps and live-data scoring belong in the training pipeline, not on every pull request.'),
      mcq('A canary step gets 1% of 2,000 requests a minute, and the rollback rule needs 300 canary requests in a 5-minute window. What does this step achieve?', [
        ['About 100 requests per window, so it cannot reach a decision', true],
        ['About 300 requests per window, exactly what the rule requires', false],
        ['About 600 requests per window, twice what the rule needs', false],
        ['A decision within one minute, since any traffic share suffices', false],
      ], '1% of 2,000 is 20 requests a minute, 100 in five minutes — a third of the 300 the rule needs. A step that cannot decide is delay, not caution; 5% (about 500 per window) could decide.'),
      mcq('Why is canary traffic routed by a hash of the user ID rather than randomly per request?', [
        ['Random routing is not supported by service meshes or ingresses', false],
        ['Each user stays on one model, so the arms compare like for like', true],
        ['It sends the users with the most fraud history to the new model', false],
        ['Hashing encrypts the user ID before the model can ever read it', false],
      ], 'Sticky routing keeps each user on one arm, so a user does not flip between models mid-session and the two arms see comparable populations. Meshes support random splits; hashing here is for assignment, not encryption.'),
    ],
    checkpoint: [
      ck('CI_CD', 'A candidate beats the champion on overall recall and AUC, but its recall on new-device payments fell from 0.70 to 0.61. The gate allows a 0.03 slice drop. What should happen?', [
        ['Promoted, because the overall metrics rose and slices are advisory', false],
        ['Shadowed for a month, then promoted if the overall gain still holds', false],
        ['Blocked: the slice fell 0.09, past its 0.03 limit', true],
        ['Blocked only if the overall AUC gain is smaller than the slice drop', false],
      ], 'Slice rules exist because an average can rise while an important group gets worse. A 0.09 fall breaks the 0.03 limit, so the gate exits non-zero. Trading the slice against the overall gain defeats the purpose of the rule.'),
      ck('CI_CD', 'Rolling back the fraud model takes 40 minutes because the image must be rebuilt with the old weights. Which design change fixes that?', [
        ['A second CI pipeline that can rebuild an image in under ten minutes', false],
        ['Make the version a pointer, such as an alias, that the service reads', true],
        ['Stop canarying, so there is never a half-released version to undo', false],
        ['Keep the weights in the Git repository next to the service’s own code', false],
      ], 'When the service loads the version a pointer names, rollback is moving the pointer back — one command, no build. A faster rebuild still leaves a rebuild in the critical path; dropping canaries removes a safety step.'),
      ck('CI_CD', 'Which secret-handling design for dev, staging and production is right?', [
        ['One image per environment, each with its own secrets in a layer', false],
        ['A .env file per environment committed to a private repository', false],
        ['Secrets passed as build arguments so the Pod never sees them', false],
        ['One image; secrets read at runtime from a secret manager', true],
      ], 'Build once and inject configuration per environment; secrets come from a secret manager at runtime. Image layers and build arguments persist in the image history, and a private repository is still a copy of the secret.'),
    ],
  },

  /* ── IV_SERVING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_IV_SERVING',
    notes: `Serving questions separate people who deployed a model once from people who could run one. Expect
arithmetic — Little's law, the HPA formula — and Kubernetes details you met in the CI/CD and
infrastructure topic: requests and limits, the three probes, rollouts. Answer with the number, then
the reason.

## Q1. "Online, batch or streaming — how do you choose?"

**Testing:** deciding from the need for freshness, not from fashion.

**Model answer.** "I ask when the score is needed and what triggers it. If a user is waiting — a UPI
payment being approved — it is online, with a latency budget. If nobody needs the score before the next
morning — re-ranking collections for two crore loan accounts — it is a scheduled batch job writing to a
table, far cheaper per row. If the score must react to a stream of events within seconds but no user is
waiting — flagging a merchant whose refund rate is spiking — it is a streaming consumer."

**Weak answer:** "Online, because real-time is better."

## Q2. "Why does batching matter so much?"

**Testing:** fixed cost per call.

**Model answer.** "Each model call has fixed overhead — Python, validation, building a frame — that
dwarfs the arithmetic for a small model. Scoring rows in batches spreads that overhead; per row, a large
batch can be orders of magnitude cheaper than single rows. Batch jobs get that free; online servers get
part of it with dynamic batching, holding requests for a few milliseconds to run them together."

**Follow-up:** "What does dynamic batching cost?" A little added latency per request, set by the
maximum wait.

## Q3. "Size the service: 600 requests a second at peak, 15 ms each."

**Testing:** Little's law and headroom.

**Model answer.** "Requests in service at once equal arrival rate times time in service: 600 × 0.015 = 9.
With two workers per Pod and a 60% utilisation target for headroom, I need 9 ÷ (2 × 0.6) = 7.5, so 8
Pods at peak. I size for the evening and month-start peaks, and festival days, and let the autoscaler
shrink it off-peak."

**Weak answer:** "We would load test and see."  (Load testing is right — but bring the estimate first.)

## Q4. "Which Kubernetes objects does a model server need?"

**Testing:** the minimum set and why.

**Model answer.** "A Deployment for the Pods and their rollout, a Service for a stable address, a
ConfigMap for settings and a Secret for credentials, and a HorizontalPodAutoscaler. On the container:
resource requests, which the scheduler reserves and the HPA uses as its denominator, a memory limit sized
from measured peak, and three probes."

## Q5. "The model takes two minutes to load. How do you run it?"

**Testing:** startup, readiness and liveness.

**Model answer.** "A startupProbe with room for the load — say a 5-second period and 24 failures, two
minutes — during which the other probes are off. A readinessProbe on an endpoint that returns 503 until
the model is loaded, so no traffic reaches a cold Pod. A trivial livenessProbe that only says the process
is responsive — never one that calls the feature store, or a slow dependency restarts every Pod."

**Follow-up:** "And rollouts?" maxUnavailable 0, maxSurge 1: a new Pod must be Ready before an old one
goes, so capacity never drops.

## Q6. "Four Pods sit at 90% CPU and the HPA target is 60%. What happens?"

**Testing:** the HPA formula and its preconditions.

**Model answer.** "Desired replicas = ceil(current × current metric ÷ target) = ceil(4 × 90 ÷ 60) = 6. The
percentage is of the CPU **request**, so without a request the HPA shows unknown and never scales; it
also needs the metrics server. Scale-down waits out a stabilisation window so it does not thrash."

**Weak answer:** "It adds one Pod at a time."

## Q7. "After an upgrade every Pod exits with code 137. Why?"

**Testing:** reading an OOMKill.

**Model answer.** "137 is a kill signal, almost always the OOM killer: the container passed its memory
limit. Each Uvicorn or Gunicorn worker loads its own copy of the model, so a 1.4 GB model with four
workers needs more than 5.6 GB, before request buffers. Fix by fewer workers, a larger limit from measured
peak, or a smaller model format."

## Q8. "When would you use KServe, Triton or BentoML instead of FastAPI?"

**Testing:** picking by need.

**Model answer.** "One tabular model behind FastAPI on a few Pods is cheaper to run and debug. A dedicated
server earns its place with many models, deep models on GPUs needing dynamic batching, scale-to-zero, or
built-in canaries — Triton for GPU throughput, KServe for Kubernetes-native model services, BentoML to
package and batch, vLLM for LLMs."

## Q9. "When is a GPU worth it?"

**Testing:** cost and utilisation.

**Model answer.** "When the model is large enough that the GPU's speed-up beats its much higher hourly
cost — deep models, LLMs — and only if it stays busy, which needs batching. A GPU idle at 10% utilisation
is the most expensive way to serve a logistic regression. I measure cost per thousand predictions on
both."`,
    workedExample: `**Question: "A model takes two minutes to load. How do you run it on Kubernetes?"**

**A weak answer:**

"I would set initialDelaySeconds to 120 on the liveness probe so Kubernetes waits for it, and add more
replicas so there is always one available."

What is wrong: a long initial delay also delays detecting a genuinely stuck Pod after every restart; it
says nothing about traffic reaching a Pod that has not loaded; and "more replicas" does not stop a rollout
from replacing them all with cold Pods.

**A strong answer:**

"Three probes, each answering one question.

**Startup:** has it finished starting? A startupProbe with periodSeconds 5 and failureThreshold 24 gives
it 120 seconds. While it has not succeeded, liveness and readiness are not checked, so the kubelet does
not kill a Pod that is just loading.

**Readiness:** should it get traffic now? A /readyz endpoint returns 503 until the model is in memory and
the feature store is reachable. Until it passes, the Pod is not in the Service's endpoints.

**Liveness:** is it stuck beyond recovery? A trivial /healthz that only checks the process responds. It
must not call the feature store — if the store slows, every Pod would restart and a slow dependency would
become an outage.

**Rollout:** maxUnavailable 0, maxSurge 1, so each new Pod must be Ready before an old one is removed;
capacity never drops during a two-minute load. **Resources:** a memory limit sized from the measured peak
of all workers' copies of the model, and a CPU request so the HPA can work. If cold starts hurt during
scale-up, I keep a minimum replica count that covers the normal peak."

**Why it scores:** every setting is tied to the failure it prevents, and the answer covers the rollout,
which is where two-minute loads actually bite.`,
    mcqs: [
      mcq('Four Pods of a model server average 90% CPU against an HPA target of 60%. How many replicas does the HPA ask for?', [
        ['5, because it adds one Pod each time the target is crossed', false],
        ['8, because it doubles the Pods whenever CPU passes target', false],
        ['6, because ceil(4 × 90 ÷ 60) is 6', true],
        ['4, until a five-minute stabilisation window has elapsed', false],
      ], 'The HPA computes ceil(current replicas × current metric ÷ target) = ceil(360 ÷ 60) = 6. It does not add one at a time or double. The 300-second stabilisation window applies to scaling down, not up.'),
      mcq('A scorer sees 400 requests a second at peak, each taking 20 ms. With 2 workers per Pod and a 50% utilisation target, how many Pods are needed?', [
        ['8 — eight requests in service, needing sixteen workers', true],
        ['4 — eight requests in service at two workers per Pod', false],
        ['16 — one Pod for every busy worker at the peak load', false],
        ['2 — at 20 ms each worker handles fifty requests a second', false],
      ], 'Little’s law: 400 × 0.020 = 8 requests in service at once. At 50% utilisation that needs 16 workers, and at 2 per Pod that is 8 Pods. Four Pods would run the workers at 100% with no headroom.'),
      mcq('A model server’s liveness probe calls the feature store. What happens when the feature store slows down for a minute?', [
        ['The Pods leave the Service’s endpoints until the store recovers', false],
        ['Nothing, as liveness probes are only checked during start-up', false],
        ['The HPA adds Pods to make up for the slower feature calls', false],
        ['Every Pod fails liveness and restarts at once', true],
      ], 'A failed liveness probe restarts the container. Tying it to a dependency means a slow feature store restarts every Pod at once. Removing Pods from endpoints is what readiness does; liveness should only check the process itself.'),
    ],
    checkpoint: [
      ck('MODEL_DEPLOYMENT', 'A model takes 100 seconds to load, and the liveness probe restarts it in a loop. Which setting gives it room without weakening liveness later?', [
        ['A startupProbe with periodSeconds 5 and failureThreshold 24', true],
        ['A startupProbe with periodSeconds 5 and failureThreshold 3', false],
        ['A readinessProbe with no failure threshold set at all', false],
        ['A livenessProbe on /predict so it waits for a real prediction', false],
      ], 'A startup probe of 24 × 5 s allows 120 seconds; liveness and readiness are held off until it succeeds, after which liveness keeps its normal sensitivity. Three failures allows only 15 seconds; a probe that runs a prediction makes liveness depend on the model path.'),
      ck('MODEL_DEPLOYMENT', 'Each night a bank re-scores 2 crore loan accounts for collections priority; nobody needs a score before the next morning. Which serving pattern fits?', [
        ['An online API called two crore times overnight by a script', false],
        ['A streaming consumer scoring each account as an event lands', false],
        ['A GPU model server with dynamic batching running all day', false],
        ['A scheduled batch job that writes the scores to a table', true],
      ], 'No one is waiting and freshness is daily, so batch is cheapest: large batches spread the fixed per-call cost and no server sits idle. An online API pays per-request overhead two crore times; streaming suits event-driven, seconds-fresh needs.'),
      ck('MODEL_DEPLOYMENT', 'After an upgrade every Pod exits with code 137. The new model is 1.4 GB and the Pod runs 4 Uvicorn workers under a 4 GiB memory limit. Most likely cause?', [
        ['The startup probe failed because the model loaded too slowly', false],
        ['OOMKilled: four workers each load the model, past the 4 GiB limit', true],
        ['The image tag was wrong, so Kubernetes could not pull the image', false],
        ['The HPA scaled the whole Deployment to zero right after the upgrade', false],
      ], 'Exit code 137 means the process was killed, typically by the OOM killer. Each worker holds its own copy: 4 × 1.4 GB is about 5.6 GB, above the limit. A failed probe restarts with a different reason; a bad tag shows ImagePullBackOff.'),
    ],
  },

  /* ── IV_MONITORING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_IV_MONITORING',
    notes: `Monitoring questions are where interviewers find out whether you have operated a model or only
trained one. The running example from the monitoring topic — a UPI fraud scorer whose labels arrive
weeks late — is exactly what fintech and payments panels in India ask about. LLMOps questions now
appear in the same round.

## Q1. "What do you monitor on a model service?"

**Testing:** two layers, service and model.

**Model answer.** "Service first: request rate, error ratio, latency percentiles from a histogram, and
saturation — CPU, memory, queue length. Then the model: input feature distributions and null shares, the
score distribution and flag rate per slice, and quality — recall and precision on mature labels. Alerts
page on symptoms users feel, such as p95 latency or error ratio; model-quality signals usually go to a
daily review, not a 2 a.m. page."

**Follow-up:** "Why a histogram rather than an average latency?" Averages hide the slow tail; a p95 or
p99 from histogram buckets shows it.

## Q2. "Our fraud labels arrive 30–60 days late. How do you monitor quality?"

**Testing:** label maturity.

**Model answer.** "Recent weeks look too good: fraud not yet reported looks like no fraud, so recall and
the fraud rate both flatter the model. I measure the reporting delay once, choose a maturity cut-off — say
only weeks that ended 35 or more days ago — and compute quality only on those, stating the cut-off and
the share of eventual labels already in. For recent weeks I watch proxies."

**Weak answer:** "We compute accuracy every day."

## Q3. "Overall recall went up. Is the model fine?"

**Testing:** slices and denominators.

**Model answer.** "Not necessarily. The overall number is a weighted average; a small slice can fall off a
cliff inside it. If a new scam hits collect requests, which are a small share of frauds, their recall can
halve while the total rises. So I report a short, fixed list of slices — channel, new versus existing
customers, app version, amount band — always with the denominators, and pool weeks for small slices."

**Follow-up:** "Why not check a hundred slices?" You will find a 'failure' by chance every week.

## Q4. "What can you watch before labels arrive?"

**Testing:** proxies and their limits.

**Model answer.** "Flag rate and score distribution per slice, manual-review hit rate (reviewers label
within hours), customer complaints per lakh payments, and independent rules firing. A proxy tells me where
to look, not that the model is wrong."

## Q5. "A drift alert fires. What do you do?"

**Testing:** drift as a question.

**Model answer.** "Drift is a question, not a verdict. A festival sale moves amounts a lot and the model is
fine; a new scam in a small slice may barely move overall drift. I pair the alert with the matching
slice's quality once labels mature and check the pipeline for a data bug first. I record the outcome so
the next alert is read faster."

## Q6. "Retrain on a schedule or when drift is detected?"

**Testing:** neither promotes automatically.

**Model answer.** "Both: a schedule as the heartbeat — it keeps the pipeline working — and triggers for
extra runs when a mature slice drops or a big upstream change lands. Neither promotes on its own. Every
run produces a challenger, and a gate decides. 'Retrain whenever drift fires' retrains on harmless
shifts and, when the shift is a data bug, learns the bug."

## Q7. "How do you compare champion and challenger?"

**Testing:** a fair comparison and a rule written first.

**Model answer.** "Both score the same newest mature window that neither trained on. Because they score
the same rows, I use a paired bootstrap on the difference — PR-AUC or recall at the review budget, since
fraud is rare — overall and per slice. The promotion rule, with its margins, is written before the run.
A pass goes to canary, not straight to production."

## Q8. "Your model blocks risky payments. What does that do to the next training set?"

**Testing:** the feedback loop.

**Model answer.** "Blocked payments never get an outcome, so the model shapes its own training data. I
keep a small, risk-approved random sample of borderline payments that go to manual review instead of being
auto-decided, so there are labels where the model is unsure."

## Q9. "What changes when the 'model' is an LLM application?"

**Testing:** the release, not the model, is the unit.

**Model answer.** "The answer depends on the prompt, the provider's model, parameters, retrieval settings
and tools, so I version all of them together as a release with one id and tag every trace with it. Each
release runs a scripted eval set with cost per request. In production I watch cost, latency, refusal and
'I don't know' rates, guardrail hits and feedback per release. And the provider can change the model under
an alias, so I pin where possible and run the eval nightly."

## Q10. "The model is making bad decisions in production. Walk me through the incident."

**Testing:** a runbook and a blameless review.

**Model answer.** "Stabilise first: a kill switch or fallback — rules only, or the previous version — that
takes effect in seconds. Then roll back the right thing: the model, the feature pipeline or the threshold,
whichever changed. Communicate with one incident lead. Afterwards, a blameless review: timeline, root
cause, why monitoring did or did not catch it, and actions with owners."`,
    workedExample: `**Question: "Our UPI fraud model's labels arrive 30–60 days late. How would you monitor it?"**

**A weak answer:**

"I would track accuracy and AUC on a dashboard every day and set an alert if they drop. I would also check
data drift with PSI and retrain when it goes above 0.2."

What is wrong: daily accuracy on a 0.4% fraud rate means nothing; daily AUC on immature labels flatters
the model; and retraining on every drift alert learns festival sales and data bugs alike.

**A strong answer:**

"I would split it by what I can know when.

**Today:** service health — error ratio and p95 latency, which page. Then label-free signals per slice
(P2P, merchant QR, collect requests; new versus existing devices): flag rate, score distribution, manual
review hit rate, complaints per lakh payments. These tell me where to look.

**After maturity:** I measure the reporting delay once — say 97% of eventual frauds are reported within 35
days — and compute recall at the blocking threshold and PR-AUC weekly only on weeks older than that, per
slice, with the fraud counts printed beside each number. Small slices get pooled weeks or an interval.

**Drift:** PSI on inputs as a prompt to look, paired with the slice's quality once it matures.

**Retraining:** a monthly scheduled challenger plus triggered runs when a mature slice drops. Each one
faces a gate — a paired bootstrap against the champion on the same mature holdout, overall and per slice —
and a canary.

**Labels:** a small random review sample of borderline payments so blocked payments do not starve the next
training set."

**Why it scores:** it respects label delay, uses slices with denominators, treats drift as a question and
connects monitoring to a guarded retraining loop.`,
    mcqs: [
      mcq('Fraud reported so far for last week is 0.03%, against a usual 0.5%. A manager calls it a win for the new model. What is the best reply?', [
        ['The model has improved, so the blocking threshold can be raised', false],
        ['Last week’s labels have not arrived yet; judge mature weeks', true],
        ['Fraudsters have moved to another app, so retraining can be skipped', false],
        ['The drop proves the data pipeline broke and must be rolled back', false],
      ], 'Fraud is reported days or weeks later, so the newest weeks always look clean. Quality is judged only on weeks past the maturity cut-off. Concluding improvement, displacement or a pipeline bug from immature labels is premature.'),
      mcq('Overall weekly recall rose from 0.71 to 0.73, while merchant-QR recall fell from 0.66 to 0.38 on 41 frauds. What does this show?', [
        ['The slice change is noise, since the overall recall went up', false],
        ['The model should be retrained only on the slice that fell', false],
        ['A small slice can collapse inside a rising overall metric', true],
        ['Accuracy should replace recall when a slice is this small', false],
      ], 'The overall figure is a weighted average; a slice with a small share of frauds can halve without moving it much. With 41 frauds a drop from 0.66 to 0.38 is large enough to act on. Accuracy on a rare class hides it further.'),
      mcq('An LLM assistant’s nightly eval pass rate falls from 0.91 to 0.83 and nobody on the team released anything. What should be checked first?', [
        ['Whether the provider changed the model behind an unpinned alias', true],
        ['Whether the eval set drifted since the previous night’s run', false],
        ['Whether token prices rose, making the model answer shorter', false],
        ['Whether the vector index was rebuilt from the same documents', false],
      ], 'With no release of yours, the likeliest change is upstream: a provider updating the model behind an alias. That is why the nightly eval exists. A fixed eval set does not drift; prices do not change answers; an identical rebuild should not move scores.'),
    ],
    checkpoint: [
      ck('MODEL_MONITORING', 'Champion and challenger are scored on the same 60,000 newest mature payments. Why compare them with a paired bootstrap rather than two separate intervals?', [
        ['Both models’ luck on each resample cancels, so the difference is tighter', true],
        ['Separate intervals cannot be computed for PR-AUC on rare classes', false],
        ['A paired bootstrap needs far fewer resamples than other methods', false],
        ['It removes the need for a holdout window neither model trained on', false],
      ], 'Resampling the same rows for both models makes their errors move together, so the interval on the difference is much narrower than two overlapping intervals suggest. It still needs an untouched holdout; PR-AUC intervals can be computed separately.'),
      ck('MODEL_MONITORING', 'A PSI alert fires on payment amount during a festival sale, and mature-slice quality is unchanged. What is the right action?', [
        ['Retrain at once, since any drift alert means the model is stale', false],
        ['Raise the PSI threshold permanently so festival alerts stop', false],
        ['Roll back to the previous model version until the sale is fully over', false],
        ['Record it as a benign shift, keep watching slices, do not retrain', true],
      ], 'Drift is a prompt to look. Here the input moved but quality did not, so the model is fine; recording the outcome speeds up the next read. Retraining would learn a temporary pattern; raising the threshold permanently blinds you to real shifts.'),
      ck('MODEL_MONITORING', 'A fraud model blocks payments it scores high, so those never get an outcome. What keeps the next training set honest?', [
        ['Labelling every blocked payment as fraud, as the model blocked it', false],
        ['A small, risk-approved random sample of borderline cases sent to review', true],
        ['Dropping blocked payments from training, as they have no labels', false],
        ['Training only on payments from before the model was deployed', false],
      ], 'Sending a random sample of borderline payments to manual review produces labels where the model is uncertain, breaking the loop in which the model decides its own training data. Labelling blocks as fraud bakes in its errors; dropping them biases the data.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_RAPID_FIRE',
    notes: `A screening call for an MLOps or ML platform role: thirty questions in about twelve minutes, one
correct line each. Cover the answer, say yours aloud, then check.

## Pipelines and versioning

1. **What does a .dvc pointer file hold?** — The data's hash and size, not the data.
2. **Command to fetch the data for the current commit?** — dvc pull.
3. **What makes DVC rerun a stage?** — A changed dependency, parameter or command.
4. **Five inputs of a reproducible run?** — Commit, data hash, config, environment, seed.
5. **What a registry alias is for?** — The service loads by alias; moving it promotes or rolls back.
6. **Leak caused by joining the latest feature value?** — Time travel; use a point-in-time join.
7. **pandas function for an as-of join?** — merge_asof.
8. **Two causes of training-serving skew?** — Two implementations; time travel.
9. **Which validation failures stop the pipeline?** — Schema and range; distribution shifts warn.
10. **Check that catches a feature silently zeroed?** — Zero and null share against history.

## Delivery

11. **What runs on every PR?** — Unit tests, data contract, seeded smoke test, lint.
12. **Three kinds of gate rule?** — Floor, max drop vs champion, per-slice.
13. **How does a gate block a pipeline?** — It exits non-zero.
14. **Shadow answers?** — How it behaves on live inputs, with no effect on users.
15. **Canary answers?** — Is it safe on real decisions?
16. **A/B answers?** — Is it better for the business?
17. **Why sticky canary routing?** — One user, one model; like-for-like arms.
18. **1% of 2,000 req/min over 5 min?** — 100 requests.
19. **Rollback in one command needs?** — The version as a pointer, no rebuild.
20. **Where do secrets come from?** — A secret manager at runtime.

## Serving

21. **Little's law?** — In service = arrival rate × time in service.
22. **HPA formula?** — ceil(current × metric ÷ target).
23. **HPA shows unknown — usual cause?** — No CPU request, or no metrics server.
24. **Probe whose failure restarts the container?** — Liveness.
25. **Exit code 137?** — Killed, usually OOM.

## Monitoring and LLMOps

26. **Why recent fraud rates look low?** — Labels have not arrived yet.
27. **Metric for a rare-class model's comparison?** — PR-AUC or recall at the review budget.
28. **Compare two models on the same rows with?** — A paired bootstrap.
29. **The unit you version in an LLM app?** — The release: prompt, model, params, retrieval, tools.
30. **Defence against a provider changing the model?** — Pin it, and run the eval nightly.

## Scoring

26+ correct and quick: strong. 20–25: revisit the sets your misses came from. Below 20, or "retrain
whenever drift fires", or "the liveness probe should check the database": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: “What must a container declare for a CPU-based HPA to compute utilisation?”', [
        ['A CPU limit', false],
        ['A memory limit', false],
        ['A CPU request', true],
        ['A readiness probe', false],
      ], 'HPA utilisation is current usage divided by the CPU request. With no request it cannot compute a percentage and shows unknown. A limit is a ceiling, not the denominator.'),
      mcq('Rapid fire: “Which release stage changes no user’s outcome at all?”', [
        ['Shadow', true],
        ['Canary', false],
        ['A/B test', false],
        ['Blue-green switch', false],
      ], 'In shadow the candidate scores a copy of live traffic and its outputs are only logged. Canary, A/B and blue-green all let the new model make real decisions for some users.'),
      mcq('Rapid fire: “Requests arrive at 300 a second and each takes 40 ms. How many are in service at once?”', [
        ['7.5', false],
        ['12', true],
        ['40', false],
        ['300', false],
      ], 'Little’s law: 300 × 0.040 = 12 requests in service on average. That figure, divided by workers per Pod and the utilisation target, gives the Pod count.'),
      mcq('Rapid fire: “Which probe takes a Pod out of the Service without restarting it?”', [
        ['Liveness', false],
        ['Startup', false],
        ['Scale-down', false],
        ['Readiness', true],
      ], 'A failed readiness probe removes the Pod from the Service’s endpoints so it gets no traffic; nothing restarts. A failed liveness probe restarts the container.'),
      mcq('Rapid fire: “What should a scheduled retraining run produce?”', [
        ['A new production model', false],
        ['A challenger for the gate', true],
        ['A drift report only', false],
        ['A new feature store', false],
      ], 'Every run, scheduled or triggered, produces a challenger; a gate and a canary decide whether it replaces the champion. Automatic promotion is how a broken data week reaches production.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_MOCK',
    notes: `The interviewer's script for a 40-minute MLOps round for a fresher or 0–2 year ML platform role at a
fintech or a GCC. Have a friend read the interviewer's lines, or record yourself and score it against
the notes below. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about the MLOps project you are proudest of, in two minutes."

- **Strong:** the model and the decision it supports, how it is trained (pipeline, data versioning),
  how it is released (gate, canary), how it is watched (slices, late labels), and one thing that went
  wrong and what changed.
- **Weak:** a list of tools — "MLflow, DVC, Docker, Kubernetes, Grafana" — with no decisions.

## Q1 — Reproducibility (6 min)

"Three months after release, compliance asks you to show exactly how the production loan model was
built. Go."

- **Strong:** alias → registry version → run → commit, **data hash**, params, environment lock, seed →
  rebuild from a clean clone with dvc pull and dvc repro → compare metrics with the logged ones.
- **OK:** mentions MLflow and Git but not the data version.
- **Weak:** "I would find the notebook."

Follow-up: "The rebuilt metrics differ by 0.003." — **Something unrecorded influenced training**:
unseeded randomness, a library version outside the lock, unsorted data. Find it; do not shrug.

## Q2 — Delivery (8 min)

"A retrained UPI fraud model is ready. Take it from the registry to 100% of traffic."

- **Strong:** **gate** (floor, max drop, slices, latency) → **shadow** (score and decline-rate
  distributions, latency) → **canary** with sticky routing, steps sized to reach the rollback rule's
  sample, automatic rollback on decline rate → monitoring for real recall later → **rollback = moving an
  alias**.
- **OK:** canary with sensible percentages, no gate slices.
- **Weak:** "deploy and watch the dashboard".

Follow-up: "Traffic is 2,000 a minute; the rule needs 300 canary requests in 5 minutes. Is a 1% step
useful?" — No: about 100 per window; start at 5%.

## Q3 — Serving (8 min)

"Peak is 600 requests a second at 15 ms each. Two workers per Pod. Size it, and tell me what goes in
the Deployment."

- **Strong:** 600 × 0.015 = **9** in service; at 60% target, 9 ÷ 1.2 = 7.5 → **8 Pods**; CPU request for
  the HPA; memory limit from measured peak of all workers; **startup, readiness, liveness** each with
  its job; maxUnavailable 0.
- **Weak:** "Start with 3 replicas and autoscale."

Follow-up: "Pods restart whenever the feature store is slow." — **Liveness is calling a dependency**;
move that check to readiness.

## Q4 — Monitoring (8 min)

"Fraud labels take up to 60 days. The dashboard shows last week's fraud rate at a tenth of normal."

- **Strong:** **immature labels**; maturity cut-off; quality only on mature weeks per slice with
  denominators; proxies now (flag rate per slice, review hit rate, complaints).
- **Weak:** "The model is working well."

Follow-up: "Mature recall is flat overall but collect requests halved." — **A slice failure**: new
pattern; triggered retrain → challenger → paired bootstrap per slice → canary; meanwhile a rule or a
lower threshold for that slice.

## Q5 — LLMOps (5 min)

"Our support assistant's cost per day tripled overnight. Nothing was deployed."

- **Strong:** cost per request by **release id** and by conversation; long conversations or an agent loop;
  a retrieval change upstream; provider-side change; a usage spike from one tenant or an abuse pattern;
  the budget alert at 80% should have fired; a max-token and step cap.
- **Weak:** "Switch to a cheaper model."

## Close (2 min)

"What would you improve in your own project?" — **Strong:** one concrete gap and how they would
measure the fix.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Reproducibility | Five inputs and a rebuild check | Partial lineage | Notebook |
| Delivery | Gate with slices, staged release, pointer rollback | Canary only | Direct deploy |
| Serving | Correct arithmetic and probes | Rough sizing | Guess |
| Monitoring | Maturity, slices, proxies | Drift only | Accuracy dashboard |
| LLMOps | Release id and cost breakdown | Some cost idea | Cheaper model |

Hire bar: 11 or more out of 15 with no 1 in delivery or monitoring. One confident wrong statement —
"retrain automatically whenever drift fires" or "liveness should check the database" — costs more than
an honest "I have not done that, but I would…".`,
    mcqs: [
      mcq('In the mock’s Q1, the rebuilt model’s metrics differ from the logged run by 0.003. What does a strong candidate conclude?', [
        ['The difference is too small to matter, so the rebuild counts', false],
        ['The original run must have been trained on a GPU, so ignore it', false],
        ['The registry has corrupted the stored metrics, which should be fixed', false],
        ['An unrecorded input — a seed, a version, row order — shaped the run', true],
      ], 'A faithful rebuild from the recorded inputs should reproduce the metrics. A difference means something influenced training that was not recorded; finding it is the point of the exercise.'),
      mcq('In the mock’s Q3, Pods restart every time the feature store slows down. What is the fix?', [
        ['Move the feature-store check from the liveness probe to readiness', true],
        ['Raise the liveness probe’s failure threshold to a hundred', false],
        ['Add a CPU limit so the Pod cannot be starved during slowdowns', false],
        ['Increase the HPA’s maximum replicas so more Pods are available', false],
      ], 'Liveness failures restart containers, so liveness must not depend on another service. A readiness check on the feature store takes Pods out of traffic without restarting them. A huge threshold also stops liveness catching real hangs.'),
      mcq('In the mock’s Q4, mature recall is flat overall, but collect-request recall halved. What should follow?', [
        ['Lower the threshold for every channel until total recall rises again', false],
        ['Wait a quarter to see whether the slice recovers without action', false],
        ['A triggered challenger, judged per slice, while a stopgap covers it', true],
        ['Swap recall for accuracy, which is steadier on small slices', false],
      ], 'A slice failure is a new pattern the model misses. A triggered retrain produces a challenger that must beat the champion per slice under the gate and then canary, while a rule or slice threshold limits harm meanwhile.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_MLOPS_CHECKPOINT',
    notes: `Ten questions across the MLOps interview sets: pipelines and versioning, delivery, serving and
monitoring. Each is asked the way a panel asks it. Do the arithmetic before you choose.`,
    checkpoint: [
      ck('ML_PIPELINES', 'A new joiner clones the repository, runs the pipeline and gets “data/raw/loans.csv does not exist”. What is missing?', [
        ['A dvc pull from the remote, which needs read access to its storage', true],
        ['A git lfs install, since DVC stores the bytes in Git LFS objects', false],
        ['A fresh dvc init, because each clone needs its own DVC project', false],
        ['Rerunning the extract stage, as data is never shared between clones', false],
      ], 'Git holds only the pointer; the bytes live in the DVC remote. dvc pull fetches the version the commit points to. DVC does not use LFS, and dvc init would create a new project rather than fetch data.'),
      ck('ML_PIPELINES', 'Which behaviour shows that a model registry is being used as a promotion process rather than as storage?', [
        ['Each new run is registered and replaces the latest version at once', false],
        ['The service loads by file path from the newest artefact directory', false],
        ['Every data scientist may move the production alias when they like', false],
        ['An alias moves only after a gate, with a record of who moved it', true],
      ], 'Promotion means an explicit, controlled move of the alias the service reads, with an audit trail. Auto-replacing the latest version or loading by path skips the gate; letting anyone move the alias skips the control.'),
      ck('CI_CD', 'A gate script prints its failures but always exits with code 0. What is the consequence?', [
        ['The pipeline carries on, so a failing candidate can still be released', true],
        ['The pipeline halts, since CI parses the printed failure text', false],
        ['Nothing, because gate results are only read by a human reviewer', false],
        ['The canary rolls back automatically when it sees the failures', false],
      ], 'CI systems decide on exit codes, not on printed text. A gate that always exits 0 blocks nothing; it must exit non-zero on failure for the release to stop.'),
      ck('CI_CD', 'The canary passed at 5%, then the full rollout raised wrongful declines at month-start. What is the most useful first check?', [
        ['Whether the gate’s AUC floor was set high enough for the release', false],
        ['Whether the training data held enough month-start transactions', false],
        ['The arms’ decline rates by segment and hour', true],
        ['Whether the HPA scaled the new Pods fast enough at month-start', false],
      ], 'A canary that passed and a rollout that failed means the canary’s population or hours did not represent the full traffic — month-start salary payments, say. Comparing the arms by segment shows where they diverge. The gate floor, training coverage and scaling are later questions.'),
      ck('MODEL_DEPLOYMENT', 'Six Pods run at 45% CPU against an HPA target of 60%. What does the HPA want, and when does it act?', [
        ['5 Pods, after the scale-down stabilisation window has passed', true],
        ['4 Pods, immediately, since usage is a quarter below the target', false],
        ['6 Pods, as the HPA never scales down while there is any traffic', false],
        ['3 Pods, halving the count whenever usage is under the target', false],
      ], 'ceil(6 × 45 ÷ 60) = ceil(4.5) = 5. Scale-down waits out the stabilisation window (300 seconds by default) so a brief lull does not cause thrashing.'),
      ck('MODEL_DEPLOYMENT', 'During a rolling update with maxUnavailable 0 and maxSurge 1, new Pods take two minutes to become Ready. What happens to capacity?', [
        ['It drops by one Pod for two minutes at every step of the rollout', false],
        ['It never drops; each old Pod goes only after a new one is Ready', true],
        ['It drops to zero briefly while the Service updates its endpoints', false],
        ['It doubles for the whole rollout, as every new Pod starts at once', false],
      ], 'maxSurge 1 adds one extra Pod; maxUnavailable 0 forbids removing an old one until the new one passes readiness. The rollout is slower but serving capacity never falls.'),
      ck('MODEL_DEPLOYMENT', 'A small logistic-regression scorer runs on a GPU node at 8% utilisation. What does a cost review recommend?', [
        ['Keep the GPU and add dynamic batching to raise its utilisation', false],
        ['Move it to a larger GPU so latency falls even further at peak', false],
        ['Move it to CPU Pods, after comparing cost per prediction', true],
        ['Keep it on the GPU, because GPUs are always faster for inference', false],
      ], 'A small linear model gains little from a GPU, and an idle GPU is the most expensive way to serve it. Measuring cost per thousand predictions on both confirms the move. Batching helps busy deep models, not this one.'),
      ck('MODEL_MONITORING', 'Mature-week recall at the blocking threshold is 0.69 overall. One slice shows 0.20 on 5 frauds. How should it be reported?', [
        ['Flag it as a failure and trigger a retrain for that one slice at once', false],
        ['Drop the slice from the report, since small slices are not useful', false],
        ['Replace it with that slice’s accuracy, which is steadier', false],
        ['Show the denominator, pool weeks or give an interval before acting', true],
      ], 'Five frauds give a very noisy recall; one more catch moves it by 0.2. Printing the denominator and pooling weeks or adding an interval prevents acting on noise, without hiding the slice.'),
      ck('MODEL_MONITORING', 'An LLM release changed only retrieval top-k from 6 to 4, and one previously correct eval answer now fails. Why keep top-k inside the release spec?', [
        ['So the regression is traced to retrieval, not blamed on the model', true],
        ['Because providers charge per retrieved chunk as well as per token', false],
        ['Because top-k must be identical across every release ever made', false],
        ['So the eval can skip cases whose sources rank below the top four', false],
      ], 'A release id that covers prompt, model, parameters and retrieval settings lets a regression be attributed to the setting that changed. Without it, a retrieval change looks like a model problem.'),
      ck('MODEL_MONITORING', 'A new fraud model is causing wrongful declines in production. What comes first in the incident?', [
        ['A blameless review with the full timeline and every root cause', false],
        ['A retrain on the last week of data to correct the behaviour', false],
        ['A kill switch or fallback that stops the harm within seconds', true],
        ['A deeper dashboard so the declines can be studied by slice', false],
      ], 'Stabilise first: a kill switch, fallback rules or the previous version stops customer harm now. Diagnosis, rollback of the right component and the blameless review follow; retraining in the middle of an incident adds risk.'),
    ],
  },

  /* ══ AI_IV_AISEC ═══════════════════════════════════════════════════════════════════════ */

  /* ── IV_LLM_THREATS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_IV_LLM_THREATS',
    notes: `AI security roles in India — product-security teams at fintechs and SaaS companies, GCC security
engineering groups, the AI practices of service companies — open with threats to an LLM product the
interviewer describes. They are not asking you to attack anything. They want to hear that you can look at
a design, say what could go wrong, how bad it would be and what control belongs where. You built this in
the LLM threats topic: the OWASP categories, threat models, leakage paths, permission-filtered retrieval
and the AI supply chain.

## Q1. "Which OWASP LLM risks matter for our product?"

**Testing:** using the list as a lens on a design, not reciting it.

**Model answer.** "I would map your design features to the categories rather than walk all ten. If the
assistant reads documents or emails you did not write, prompt injection and poisoning apply. Personal
data in the context means sensitive information disclosure. Tools that send, book or pay mean excessive
agency. Output rendered as markdown or HTML means improper output handling. One vector index for many
customers means vector and embedding weaknesses. Then I rank by likelihood times impact — assuming
injection will sometimes succeed and scoring what it could then reach."

**Follow-up:** "Which would you fix first?" Whatever turns a fooled model into real damage: tool
permissions and cross-tenant retrieval before wording in the system prompt.

**Weak answer:** "All ten are important; we would add a guardrail."

## Q2. "How is LLM application security different from web security?"

**Testing:** where the old instincts still apply and where they stop.

**Model answer.** "Four differences. There is no grammar boundary between instructions and data, so
there is no parser-level fix like parameterised SQL — controls are architectural. The attacker need not
be your user: anyone who can write a document the assistant reads takes part. Behaviour is
probabilistic, so a weakness that shows up one time in ten is still a weakness and testing reports rates.
And the classic bugs come back — XSS, SSRF, broken access control — with the model producing the
dangerous output, so web security knowledge is half of most fixes."

## Q3. "Threat-model an assistant that reads employees' email and creates calendar invites."

**Testing:** trust boundaries around the model.

**Model answer.** "I draw the data flows: user, app, model, mailbox, calendar API, logs. The model is not a
trust boundary — everything it reads from email is untrusted, and its output is untrusted input to the
calendar call. I walk STRIDE over each flow: spoofed senders, tampered meeting details, invites leaking
data to outside addresses, unbounded loops. The highest risk is an email steering a tool call, so the
controls are: invites to external addresses need the user's confirmation, the tool runs with the user's
own rights, and once untrusted text is in the session, outbound tools are restricted."

**Weak answer:** "Add a line to the prompt telling the model to ignore instructions in emails."

## Q4. "Our system prompt says never reveal salaries to non-HR users. Is that enough?"

**Testing:** a request versus a control.

**Model answer.** "No. A sentence in a prompt is a request to the model, not access control, and the model
can be talked out of it or simply err. If showing salaries to a user would hurt, those records must never
reach the model's context for that user: filter retrieval by the user's permissions, taken from the
session, before the model sees anything."

**Follow-up:** "What else should never be in a system prompt?" Credentials, API keys, and the only copy of
a business rule; assume the system prompt can be read.

## Q5. "Where can sensitive data leak in a RAG assistant?"

**Testing:** paths beyond the answer.

**Model answer.** "Six places: the system prompt; personal data placed in the context; logs, traces and
evaluation datasets — often copied to vendors; shared caches keyed without the user or tenant; the answer
itself, including links or images whose URLs carry data out; and, for fine-tuned models, what the weights
memorised. Controls follow the path: minimise what enters the context, redact before logging with a
retention limit, key caches by tenant and permission set, and strip or allow-list outbound links."

**Follow-up:** "Under the DPDP Act, what changes?" Purpose limitation and minimisation apply to prompts
and logs as to any processing; a leak of personal data is a breach with notification duties.

## Q6. "Why do retrieval and tools widen the attack surface?"

**Testing:** indirect injection, explained in a sentence, then defences.

**Model answer.** "Indirect injection means instructions arrive inside content the system retrieves — a
web page, an email, a tool result — rather than from the user. A chatbot that is fooled says something
wrong; an agent that is fooled acts. Defences: record the provenance of every chunk, treat non-first-party
content as tainted, remove or gate outbound tools once a session is tainted, give each tool the narrowest
permission, and confirm writes with the user."

## Q7. "How do you stop one customer's documents reaching another customer?"

**Testing:** tenant isolation as a design decision.

**Model answer.** "Identity comes from the authenticated session, never from anything the model says. Every
chunk carries tenant and permission metadata at ingestion, and retrieval filters on them before ranking —
or each tenant gets its own index or collection for stronger isolation. Permissions are kept in sync when
someone leaves a group. I prove it with a matrix test: each test user, each document class, expected
visible or not."

**Weak answer:** "The model is told which tenant the user belongs to."

## Q8. "A data scientist wants to load a checkpoint from a public hub. What do you check?"

**Testing:** model files as code.

**Model answer.** "A pickle-based file can run code when it is loaded, so I prefer a data-only format such
as safetensors. I pin the exact revision by hash so the file cannot change under us, check who publishes
it, scan it, and load untrusted files only in an isolated environment without credentials. The same
thinking covers datasets, adapters, packages and MCP servers: pin, review, keep an inventory."

## Q9. "What is unbounded consumption, and what controls it?"

**Testing:** cost and availability as security.

**Model answer.** "Requests that burn compute or money without limit — very long inputs, agent loops, a
free endpoint scraped at volume. Controls: input and output token caps, a step limit on agents, per-user
and per-tenant quotas and rate limits, and a cost alert per day."`,
    workedExample: `**Question: "How do you stop a multi-tenant HR assistant from showing one company's leave balances to
another company's users?"**

**A weak answer:**

"I would put the company name in the system prompt and instruct the model to only answer about that
company. I would also add a guardrail that checks the answer does not mention other companies."

What is wrong: both controls sit after the data has already reached the model. The prompt is a request; the
output check is a filter that will miss records it does not recognise. Nothing stops retrieval from
returning another tenant's chunks.

**A strong answer:**

"I make isolation a property of retrieval, not of the model's behaviour.

**Identity:** the tenant and user come from the authenticated session token. Nothing the model outputs
can change them.

**Ingestion:** every chunk is stored with its tenant ID and permission groups. Documents that arrive
without that metadata are rejected, not indexed with a default.

**Retrieval:** the query is filtered by tenant and the user's groups before ranking. For customers with
strict contracts I would use a separate collection per tenant, so a missing filter cannot cross the line.

**Caches and logs:** any semantic cache is keyed by tenant and permission set; logs are tagged by tenant
and access to them is restricted.

**Proof:** a permission matrix test in CI — test users from two tenants and several roles, each querying
for documents they should and should not see — asserting on the retrieved chunk IDs, not on the wording
of the answer. It runs on every change to retrieval code.

**Residual risk:** an admin misconfiguring groups; covered by syncing permissions from the HR system and
reviewing them."

**Why it scores:** the control is placed before the model, identity is not negotiable, and the answer ends
with a test that proves isolation rather than a hope.`,
    mcqs: [
      mcq('A summariser reads supplier emails and can also send email. Which control most reduces the impact if an email steers the model?', [
        ['A system-prompt line telling it never to obey instructions in emails', false],
        ['Gating outbound email once untrusted text is in context', true],
        ['A larger model, which is assumed to follow instructions less readily', false],
        ['Logging every summary so that misuse can be investigated afterwards', false],
      ], 'Once untrusted text is in the session, restricting outbound tools limits what a fooled model can do. A prompt line is only a request, a larger model is still fallible, and logging helps after the harm, not before.'),
      mcq('A semantic cache returns stored answers for similar questions across all users of a multi-tenant assistant. What is the security problem?', [
        ['One tenant’s cached answer can be served to another tenant', true],
        ['Cached answers are always stale, so users receive outdated policies', false],
        ['The cache raises token costs because every hit is billed twice', false],
        ['Similar questions cannot be detected without a vector database', false],
      ], 'If the cache key ignores tenant and permissions, one user’s answer — containing their data — is served to another. The cache key must include tenant and permission set. Staleness and cost are operational issues, not this leak.'),
      mcq('Which statement about the system prompt is a sound design assumption?', [
        ['It is hidden from users, so business rules placed there stay private', false],
        ['It can be encrypted so the model reads it but users cannot see it', false],
        ['It can be read by users, so it must hold no secrets or sole controls', true],
        ['It is safe if it ends with an instruction never to reveal itself', false],
      ], 'System-prompt leakage is a listed risk: assume it can be extracted. So it must not contain credentials or the only copy of an access rule. The model must read it in plain form, and a “do not reveal” line is a request, not a control.'),
    ],
    checkpoint: [
      ck('LLM_SECURITY', 'An assistant shows a user salary records because the retriever returned them and the prompt said “only HR may see salaries”. Where should the fix go?', [
        ['A stronger instruction in the system prompt, repeated at the end', false],
        ['An output classifier that blocks answers containing salary numbers', false],
        ['Retrieval filtered by the session user’s permissions before the model', true],
        ['A fine-tuned model trained to refuse salary questions from non-HR staff', false],
      ], 'Access control must decide what enters the context. Filtering retrieval by the authenticated user’s permissions means the model never sees records the user may not see. Prompts, classifiers and fine-tuning all act after the data has been exposed.'),
      ck('LLM_SECURITY', 'A team wants to load a pickle-format model file from a public hub into a service with cloud credentials. What is the main risk?', [
        ['The weights may be slightly less accurate than the published claims', false],
        ['Loading the file can execute code, with the service’s credentials', true],
        ['The file may be too large to fit in the service’s memory limit', false],
        ['The hub may revoke the licence after the model is in production', false],
      ], 'Pickle deserialisation can run arbitrary code at load time. Loaded inside a service with credentials, that code inherits them. Prefer data-only formats such as safetensors, pin the revision by hash, and load untrusted files in isolation.'),
      ck('LLM_SECURITY', 'In an AI threat model, why is the model drawn inside the untrusted zone rather than as a trust boundary?', [
        ['Any text it reads can steer its output, so it enforces nothing', true],
        ['Models are hosted by third parties, and only on-premise ones are trusted', false],
        ['Models change version often, so their behaviour is not worth modelling', false],
        ['Trust boundaries apply only to networks, never to software components', false],
      ], 'Because instructions and data share one channel, anything the model reads can influence it. So its output is untrusted input to the next component, and enforcement belongs in code around it. Hosting location does not change this.'),
    ],
  },

  /* ── IV_RED_TEAMING (Security Testing and Assurance) ───────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_IV_RED_TEAMING',
    notes: `Security testing and assurance questions check whether you can **prove** that the defences in your
own AI system work — and say honestly how well. A panel for an AI security or product-security role
asks how you plan tests for a system you own, turn findings into a regression suite, measure block rates
with intervals, use evaluation tools in CI, and verify fixes. This is the assurance topic you studied:
answers are about building and measuring defences, never about breaking someone else's system.

## Q1. "How do you plan security testing for an AI assistant your team built?"

**Testing:** a plan that names controls and pass criteria.

**Model answer.** "I start from the threat model and list each control we rely on — permission-filtered
retrieval, the tool gateway, confirmation on writes, output encoding, redaction in logs, quotas. For each
control I write what would show it working and what would show it failing, the pass criterion with a
number, and the evidence to keep. Tests run in a separate environment with synthetic data and test
accounts, never against real customers. The plan says who signs off and what blocks a release."

**Follow-up:** "Why a separate environment?" So tests cannot touch real personal data or trigger real
actions, and so results are reproducible.

**Weak answer:** "We try some prompts and see if anything bad happens."

## Q2. "What is a defence regression suite?"

**Testing:** turning every known weakness into a test.

**Model answer.** "Every weakness we have found or that the threat model predicts becomes a test case that
asserts the control holds — for example, a document with an embedded instruction should not lead to any
outbound tool call. Cases use harmless canary markers, such as a made-up code word, instead of real
secrets, so a failure is easy to detect and safe to log. The suite runs in CI on every change to prompts,
retrieval, tools or model, and fails the build when a control stops working."

**Follow-up:** "Why assert on actions rather than on the words of the answer?" Actions — a tool call, an
external link, a record outside the user's permission — are what cause harm and can be checked exactly.

## Q3. "Outputs vary between runs. How do you test anything?"

**Testing:** rates, not screenshots.

**Model answer.** "I run each case many times at the production settings and report a rate with its
sample size: blocked 47 of 50, not 'it worked'. I fix what I can — the release id, the retrieved
documents, the parameters — and record the rest, so a failing case can be rerun."

## Q4. "Your defence blocked every case in 20 trials. What can you claim?"

**Testing:** honest intervals.

**Model answer.** "Very little. Zero failures in 20 trials gives a 95% upper bound on the failure rate of
about 16% — the Wilson interval, or roughly three divided by n. To claim the failure rate is below about
1.3% I would need around 300 trials with no failure. So I state the claim with its interval, and size the
trials to the claim the business needs."

**Follow-up:** "Before a fix, 12 of 200 cases got through; after, 0 of 300. Is the fix real?" Yes —
before is 6% with an interval of about 3.5% to 10.2%; after, the upper bound is about 1.3%. The
intervals do not overlap.

## Q5. "How do you measure over-blocking?"

**Testing:** the cost side of every defence.

**Model answer.** "With a benign set run at the same time as the harmful one — real user questions,
including sensitive-but-legitimate ones and Hinglish and regional-language phrasing. I report both rates
together. A fix that raises the block rate by refusing far more genuine questions is not an improvement:
at 50,000 genuine questions a day, a 2% false-block rate is 1,000 people turned away daily."

**Weak answer:** "We only measure how many bad requests are blocked."

## Q6. "What do evaluation tools like promptfoo or garak give you, and what do they miss?"

**Testing:** reading tools critically.

**Model answer.** "They give breadth and repeatability: many generated cases, scoring and a report, and
they fit in CI. promptfoo is good for application-level assertions against our own test cases; garak-style
scanners probe a model or endpoint across known weakness categories. But their judges make mistakes, so I
review a sample of verdicts; they do not know our business rules or permissions; and they mostly see one
reply, not a multi-step agent's actions. A clean scan proves the tested cases passed, nothing more."

## Q7. "How do you rate the severity of an AI finding?"

**Testing:** impact, rate and reach.

**Model answer.** "Impact: what data or action the weakness reaches — another tenant's records or a payment
is critical, odd wording is low. Likelihood: the measured rate and how easy the conditions are — who can
place the content, whether login is needed. A weakness reaching customer data at a 2% rate is still high,
because at volume it will happen. I record the release id, settings, inputs and rate so the owner can
reproduce it."

## Q8. "A developer says the finding is fixed. How do you verify it?"

**Testing:** fix in depth and retest.

**Model answer.** "I check that the fix is in the right layer — permissions or the tool gateway, not only a
new sentence in the prompt. Then I rerun the original cases at the original sample size, plus variants
the fix might not cover, plus the benign set to check over-blocking. The fixed cases join the regression
suite. I report the before and after rates with intervals and any residual risk."

## Q9. "What do you do if a test turns up real personal data?"

**Testing:** professional conduct.

**Model answer.** "Stop that line of testing, do not copy or share the data, record only what is needed to
describe the issue, and report it through the agreed channel at once. It is now an incident, and the
DPDP duties may apply."`,
    workedExample: `**Question: "We added an input classifier to block injected instructions in uploaded documents. How
would you prove it works?"**

**A weak answer:**

"I would upload a few documents with instructions in them and check whether the classifier blocks them. If
all of them are blocked, the defence works and we can ship."

What is wrong: a handful of trials proves almost nothing, nothing measures what the classifier wrongly
blocks, and "works" is not a number anyone can hold the team to.

**A strong answer:**

"First I would say what 'works' means: the outcome we care about is no unauthorised tool call or data
outside the user's permissions after reading an uploaded document — the classifier is one layer towards
that, so I test the outcome as well as the classifier.

**Cases:** a harmful set built from our threat model — instructions hidden in different document types and
positions — each carrying a harmless canary marker, and a benign set of real uploads: policies, invoices,
documents that legitimately contain words like 'ignore' or 'instructions', in English, Hindi and mixed
scripts.

**Measurement:** each case run enough times at production settings. I report the block rate with a 95%
interval and the false-block rate on the benign set. If the business wants 'fewer than 1 in 100 get
through', I need about 300 clean trials to support it.

**End to end:** with the classifier switched off, do the other layers — taint rules, the tool gateway,
confirmations — still prevent the harmful action? That tells us whether the classifier is defence in depth
or a single point of failure.

**In CI:** the cases become a regression suite that fails the build when the rate passes its threshold.

**Report:** before and after rates with intervals, the false-block cost in users per day, known gaps, and
the date of the next review."

**Why it scores:** it defines success as an outcome, measures both sides with honest intervals, tests the
layers independently and leaves a regression suite behind.`,
    mcqs: [
      mcq('A defence regression suite needs test cases that show whether retrieved text can leak a secret. What should the cases carry?', [
        ['A copy of a real production API key so that the test is realistic', false],
        ['A harmless canary marker that is easy to detect and safe to log', true],
        ['A customer’s real account details taken from a support ticket', false],
        ['Nothing — leaks are judged by reading the answers by hand only', false],
      ], 'A made-up canary marker makes a failure exact to detect and harmless if it appears in logs or reports. Real keys or customer data in tests create the very exposure the suite is meant to prevent.'),
      mcq('A new guard raises the harmful-case block rate from 90% to 98%, but its false-block rate on genuine questions rises from 0.5% to 6%. How should this be reported?', [
        ['As a clear improvement, since the block rate rose by eight points', false],
        ['As a failure, since any rise in false blocks makes a guard unusable', false],
        ['As a trade-off, reporting both rates and users affected', true],
        ['As inconclusive, since false blocks cannot be measured reliably', false],
      ], 'Every defence has a cost. Reporting both rates — with intervals and in terms of users turned away per day — lets the owner decide. Calling it a pure win hides the cost; calling it a failure ignores the gain.'),
      mcq('An automated scanner run against the assistant’s endpoint reports zero failures. What can the team claim?', [
        ['That the cases it tried passed, within the accuracy of its judges', true],
        ['That the assistant is secure against every known class of attack', false],
        ['That manual testing and the permission matrix can now be dropped', false],
        ['That multi-step tool behaviour has been tested along with replies', false],
      ], 'A scanner covers the cases it generates and scores them with imperfect judges. It does not know your permissions or business rules and usually sees single replies, not agent actions. A clean run is evidence about those cases only.'),
    ],
    checkpoint: [
      ck('MODEL_RED_TEAMING', 'A guard blocked all 20 test cases. Using the rule of three or a Wilson interval, what is the 95% upper bound on its failure rate?', [
        ['About 15–16%, so 20 clean trials support only a weak claim', true],
        ['0%, because no failure was seen in any of the trials', false],
        ['About 5%, the usual significance level for such a test', false],
        ['About 1%, since twenty trials is a standard sample size', false],
      ], 'With zero failures in n trials, the 95% upper bound is roughly 3/n (15%) — the Wilson interval gives about 16%. Seeing no failures does not show the rate is zero; about 300 clean trials are needed to support “below about 1%”.'),
      ck('MODEL_RED_TEAMING', 'Before a fix, 12 of 200 harmful cases got through; after it, 0 of 300. What is the honest conclusion?', [
        ['The fix cut the rate from about 6% (3.5–10%) to below about 1.3%', true],
        ['The fix proves the weakness is gone, since nothing got through', false],
        ['No conclusion is possible, because the two samples differ in size', false],
        ['The fix helped by exactly 6 points, with no uncertainty to report', false],
      ], '12/200 is 6% with a Wilson interval of roughly 3.5% to 10.2%; 0/300 has an upper bound near 1.3%. The intervals do not overlap, so the improvement is real, but “gone” overclaims. Different sample sizes are handled by the intervals.'),
      ck('MODEL_RED_TEAMING', 'A developer “fixed” a data-leak finding by adding a sentence to the system prompt. What should verification check first?', [
        ['That the original cases pass at least once when rerun by hand', false],
        ['That the new sentence is grammatical and placed at the very end', false],
        ['That it sits in an enforcing layer; then a full-sample rerun', true],
        ['That the scanner’s overall score has improved since the last release', false],
      ], 'A prompt sentence is a request to the model, not a control. Verification checks the fix is in permissions, the gateway or output handling, then reruns the original cases and variants at the original sample size, plus the benign set.'),
    ],
  },

  /* ── IV_DEFENCES ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_IV_DEFENCES',
    notes: `Defence and governance questions decide most AI security interviews, because building defences is
the job. Expect design questions with trade-offs — latency, false positives, user friction — and a
governance question at the end for anyone dealing with a bank, insurer or healthcare client. You built
these in the defences topic: defence in depth, guardrail engineering, safe output handling, abuse
monitoring and AI governance.

## Q1. "What does defence in depth look like for an LLM application?"

**Testing:** layers that do not depend on the model behaving.

**Model answer.** "I assume the model will sometimes be fooled and make sure that a fooled model cannot do
much. Least privilege: each tool gets the narrowest permission, and it acts with the user's rights.
Separation: trusted instructions and untrusted content are kept apart, with provenance on every chunk.
For risky flows, the quarantined-model pattern: one model reads untrusted text but has no tools, and a
privileged component never takes instructions from that text. Confirmations for writes, payments and
external sends. Output handling, monitoring and quotas around it all. No single filter carries the
weight."

**Follow-up:** "Why is no single filter enough?" Classifiers are probabilistic, attackers adapt, and a
filter in front of an over-privileged agent leaves the impact unchanged when it misses.

## Q2. "Where do guardrails sit in the request flow?"

**Testing:** checks at the right points.

**Model answer.** "Input checks on the user's message — abuse, personal data, scope. Retrieval checks —
provenance, permissions, content from untrusted sources flagged. Tool-call checks at the gateway —
allow-list, argument validation, taint rules, confirmation. Output checks — personal data, unsafe links,
citations present, format valid. Cheap deterministic checks run everywhere; slower model-based checks run
where the risk justifies them, in parallel where possible."

## Q3. "A guard model adds latency. How do you decide whether to keep it?"

**Testing:** cost of a control.

**Model answer.** "I measure three things on our own traffic: the extra latency at p95, the harmful cases
it stops that other layers would not, and its false-block rate. A guard that adds noticeable delay to every
request and stops little that the gateway would not is a poor trade. Options: run it in parallel with
generation, run it only on high-risk flows, or use a smaller classifier first and the large guard only on
uncertain cases."

## Q4. "What does a 2% false-positive rate mean in practice?"

**Testing:** base rates.

**Model answer.** "At 50,000 genuine questions a day it blocks about 1,000 real users every day — each of
them a support ticket or a lost customer. Since harmful requests are rare, most blocks may be false. So I
report false blocks in users per day, test on Hinglish and regional-language questions where classifiers
are often weaker, and give blocked users a route to a human."

## Q5. "How do you test the guards themselves?"

**Testing:** guards are software with error rates.

**Model answer.** "A labelled set of harmful and benign examples from our own domain, with precision and
recall reported per category and language. The set grows with every incident and false-block complaint,
and runs in CI so a guard update cannot quietly get worse. When the guard's underlying model changes, I
rerun the full set before switching."

## Q6. "Why is model output untrusted input?"

**Testing:** classic injection through a new door.

**Model answer.** "Because whatever influenced the model can shape its output, and the next component
treats that output as data or code. Rendered as HTML, it can carry script — so I encode it and sanitise
markdown. Images and links can carry data out in their URLs — so I allow-list domains or strip external
images. Generated SQL runs with a read-only role on allow-listed tables, or better, the model fills
parameters of fixed queries. Generated shell commands are not run at all, or only in a sandbox with no
network or secrets."

## Q7. "How do you design confirmations that actually protect users?"

**Testing:** human approval that cannot be bypassed.

**Model answer.** "The confirmation shows the exact action and arguments — amount, recipient, date — not
the model's summary of them. It is issued and checked by the application, so the model cannot approve on
the user's behalf. And it is reserved for consequential actions, otherwise users click yes without
reading."

## Q8. "How would you detect abuse of a public AI assistant?"

**Testing:** signals, limits and privacy.

**Model answer.** "Signals per user and tenant: guardrail hits, refusal spikes, unusually long inputs,
token use far above normal, tool calls outside the usual pattern, many near-identical requests. Controls:
rate limits, quotas, step caps, and a review queue. Logs keep what investigation needs — release id,
decision, hashed user id, redacted text — with a retention limit, not every raw prompt forever."

## Q9. "What is in your AI incident runbook?"

**Testing:** response under pressure.

**Model answer.** "A kill switch per tool and per feature that works in seconds; a rollback to the previous
release; preserving evidence — traces for the release id and time window; a named incident lead; notifying
the data protection officer when personal data may be involved, because the DPDP Act has breach-reporting
duties; and a blameless review that ends with new regression tests."

## Q10. "How do you govern AI risk in an organisation?"

**Testing:** frameworks as working practice.

**Model answer.** "An inventory of every AI system with its owner, data and risk level. NIST AI RMF gives the
cycle — govern, map, measure, manage — and ISO/IEC 42001 is a certifiable management system around it.
For each system: a system card stating purpose, data, evaluations, known limits and controls; a risk
review before launch and on major change; and periodic audits. India's DPDP duties — purpose, consent,
minimisation, breach notification — apply to the data flowing through prompts and logs."`,
    workedExample: `**Question: "Our support assistant renders answers as markdown and can look up a customer's orders.
What would you change to make its output safe?"**

**A weak answer:**

"I would add an output guardrail that checks the response for anything harmful, and tell the model in the
system prompt not to include links."

What is wrong: "anything harmful" is not a specification, the prompt instruction is a request, and nothing
addresses how the browser will treat the output.

**A strong answer:**

"I treat the output as untrusted input to the browser and to anything downstream.

**Rendering:** markdown is rendered by a sanitising renderer that strips raw HTML and script, so output can
never become active content in the page.

**Images and links:** external images are not loaded — an image URL can carry data out the moment the page
renders it — and links are allowed only to an allow-list of our own domains; others are shown as plain
text.

**Data in the answer:** order lookups return only the signed-in customer's orders, enforced by the lookup
service from the session, so the answer cannot contain someone else's data whatever the model writes. A
redaction check removes full card or account numbers that should never be shown.

**Tests:** regression cases whose retrieved content tries to introduce an external image, a script tag or
another customer's order ID, each with a canary marker; the suite asserts on the rendered HTML and the
lookup calls, and runs in CI.

**Monitoring:** counts of stripped links and blocked images per release; a sudden rise is a signal worth a
look."

**Why it scores:** each control sits where it can enforce something, the browser's behaviour is handled
explicitly, and every claim comes with a test.`,
    mcqs: [
      mcq('In the quarantined-model pattern, what is the one property that must hold?', [
        ['The model reading untrusted text has no tools or say over them', true],
        ['The model that reads untrusted text is larger and better aligned', false],
        ['Both models read the same context so their answers can be compared', false],
        ['The privileged model reads the untrusted text only after filtering', false],
      ], 'The pattern works because whatever reads untrusted content has no privileges, and the privileged side never takes instructions from that content. A bigger model or a filter in front still lets untrusted text steer a privileged component.'),
      mcq('An assistant writes SQL from user questions for a reporting page. Which design is safest?', [
        ['Run the generated SQL as the application’s database owner account', false],
        ['Run it after a regex check that rejects the words DROP and DELETE', false],
        ['Run it under a read-only role limited to allow-listed tables', true],
        ['Run it only if the model states the query is safe in its reply', false],
      ], 'Generated SQL is untrusted. A read-only role limited to allow-listed tables bounds the damage, and having the model fill parameters of fixed queries removes most of it. Keyword blocklists are easy to miss; the model’s self-assessment is not a control.'),
      mcq('A payments assistant asks “Confirm transfer?” and the user clicks yes. What makes this confirmation meaningful?', [
        ['The prompt is phrased politely so that users take it more seriously', false],
        ['It shows the exact amount and payee, and the app verifies it', true],
        ['The model summarises the transfer in its own words before asking', false],
        ['It appears for every action, so users get used to confirming things', false],
      ], 'A confirmation protects only if the user sees the real arguments and the model cannot approve on their behalf. A model-written summary can be wrong or steered, and confirming everything trains users to click without reading.'),
    ],
    checkpoint: [
      ck('AI_GUARDRAILS', 'A safety classifier has a 2% false-block rate and the assistant gets 50,000 genuine questions a day. What is the daily cost to report?', [
        ['About 100 genuine users blocked, which is negligible at this scale', false],
        ['About 1,000 genuine users blocked every day', true],
        ['About 10,000 genuine users blocked every day', false],
        ['None, since false blocks only affect harmful requests', false],
      ], '2% of 50,000 is 1,000 genuine users turned away daily. Because harmful requests are rare, many of all blocks may be false, so the cost is reported in users per day alongside the harmful-case block rate.'),
      ck('AI_GUARDRAILS', 'An assistant’s markdown answers may include images. Why should external images be stripped or allow-listed?', [
        ['External images slow down page rendering for users on mobile', false],
        ['Images break the layout of the chat window on small screens', false],
        ['Providers bill extra tokens for every image an answer refers to', false],
        ['An image URL can carry data to an outside server as the page loads it', true],
      ], 'When the browser renders an image it requests the URL, and data placed in that URL reaches whoever controls the server — no click needed. Stripping external images or allow-listing domains closes that channel.'),
      ck('AI_GUARDRAILS', 'A large guard model adds about 400 ms at p95 and catches little that the tool gateway does not. What is the best next step?', [
        ['Keep it on every request, since more layers always mean more safety', false],
        ['Remove all guards and rely only on the prompt’s safety instructions', false],
        ['Run it only on risky flows or in parallel with generation', true],
        ['Replace the tool gateway with the guard model to save a component', false],
      ], 'Controls have costs. Measuring what the guard uniquely stops shows it adds little on most traffic; running it on risky flows, in parallel, or behind a cheap classifier keeps its value while cutting delay. The gateway is an enforcing layer and stays.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_RAPID_FIRE',
    notes: `A screening call for an AI security or product-security role: thirty short questions, one correct line
each, about twelve minutes. Cover the answer, say yours aloud, then check.

## Threats and design

1. **Root of most LLM application risks?** — Prompt injection: instructions and data share one channel.
2. **Indirect injection, in one line?** — Instructions arriving in content the system retrieves.
3. **Is the model a trust boundary?** — No; its output is untrusted input.
4. **Is a "never reveal" line in the system prompt a control?** — No, it is a request.
5. **What must never be in a system prompt?** — Secrets and the only copy of an access rule.
6. **Where does a RAG permission check belong?** — In retrieval, before the model sees anything.
7. **Where does the user's identity come from?** — The authenticated session, never the model.
8. **Cache key for a multi-tenant semantic cache?** — Includes tenant and permission set.
9. **Why is a pickle model file risky?** — Loading it can run code.
10. **Safer weight format?** — safetensors, pinned by revision hash.
11. **Denial of wallet?** — Unbounded consumption that burns money.

## Testing and assurance

12. **Test environment for security tests?** — Separate, with synthetic data and test accounts.
13. **What a defence regression suite asserts on?** — Actions and data, not wording.
14. **What test cases carry instead of real secrets?** — Harmless canary markers.
15. **When does the suite run?** — On every change to prompt, retrieval, tools or model.
16. **How results are reported?** — As rates with sample sizes and intervals.
17. **95% upper bound with 0 failures in n trials?** — About 3/n.
18. **Clean trials needed to claim under 1%?** — About 300.
19. **The other rate always reported?** — False blocks on a benign set.
20. **What a clean scanner run proves?** — Only that the tried cases passed.
21. **Verifying a fix?** — Right layer, rerun at full sample, variants, benign set.

## Defences and governance

22. **Defence in depth assumes?** — The model will sometimes be fooled.
23. **Quarantined-model rule?** — The model reading untrusted text has no tools.
24. **Taint rule?** — Untrusted text in context restricts outbound tools.
25. **Generated SQL runs as?** — A read-only role on allow-listed tables.
26. **Why strip external images?** — Their URLs can carry data out.
27. **A good confirmation shows?** — Exact action and arguments, verified by the app.
28. **2% false blocks on 50,000 genuine requests?** — 1,000 users a day.
29. **NIST AI RMF functions?** — Govern, map, measure, manage.
30. **ISO/IEC 42001 is?** — A certifiable AI management system standard.

## Scoring

26+ correct and quick: strong. 20–25: revisit the sets your misses came from. Below 20, or "the system
prompt tells it not to", or "it passed the scan, so it is secure": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: “Where must document-level permissions be enforced in a RAG assistant?”', [
        ['In the system prompt', false],
        ['In retrieval, before the model', true],
        ['In an output classifier afterwards', false],
        ['In the model’s fine-tuning', false],
      ], 'Enforcement must decide what enters the context. Filtering retrieval by the session user’s permissions means the model never sees what the user may not see; prompts, classifiers and fine-tuning act too late.'),
      mcq('Rapid fire: “A guard passed 0 of 100 harmful cases through. What is the rough 95% upper bound on its miss rate?”', [
        ['0%', false],
        ['1%', false],
        ['10%', false],
        ['3%', true],
      ], 'With zero failures in n trials the 95% upper bound is about 3/n: 3/100 = 3% (the Wilson interval gives about 3.7%). Zero observed failures is not a zero rate.'),
      mcq('Rapid fire: “What should a test case for a leak carry instead of a real secret?”', [
        ['A canary marker', true],
        ['An expired key', false],
        ['A masked card number', false],
        ['Nothing at all', false],
      ], 'A made-up canary marker is exact to detect and harmless if it leaks into logs. Expired keys and masked real data still expose real material and are not reliably detectable.'),
      mcq('Rapid fire: “Which NIST AI RMF function covers testing and tracking a system’s risks?”', [
        ['Govern', false],
        ['Map', false],
        ['Measure', true],
        ['Manage', false],
      ], 'Measure covers analysing, assessing and tracking AI risks, including testing. Govern sets culture and policy, Map establishes context, and Manage prioritises and acts on risks.'),
      mcq('Rapid fire: “Model output will be shown in a web page. Treat it as?”', [
        ['Trusted, since our model wrote it', false],
        ['Untrusted input to encode', true],
        ['Safe if the prompt says so', false],
        ['Safe once it is short enough', false],
      ], 'Whatever influenced the model can shape its output, so it is untrusted input to the browser: encode it and sanitise markdown. Origin, prompt wording and length do not make it safe.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_MOCK',
    notes: `The interviewer's script for a 40-minute AI security round for a fresher or 0–2 year product-security
or AI security role. The scenario: an insurer's claims assistant built with RAG over policy documents
and claim files, with tools to look up a claim and to request documents from the customer by email.
Have a friend read the interviewer's lines, or record yourself. The words in bold are what the panel
notes down.

## Opening (3 min)

"Tell me about your AI security capstone in two minutes."

- **Strong:** the product, the main risks found in the threat model, the controls built, how they were
  tested (a regression suite, rates with intervals), the before-and-after numbers, and the residual risk.
- **Weak:** "I tried a lot of prompts and the model refused most of them."

## Q1 — Threats (8 min)

"Here is the claims assistant. Threat-model it."

- **Strong:** data flows and **trust boundaries** (claim files and customer emails are untrusted; the
  model is not a boundary); the risks mapped from features — **injection through uploaded documents**,
  **disclosure of another customer's claim**, **excessive agency** in the email tool, output handling,
  logs holding health and identity data; ranked by likelihood × impact.
- **OK:** a correct list of OWASP categories without ranking.
- **Weak:** "Prompt injection; add a guardrail."

Follow-up: "Which one first?" — Cross-customer disclosure and the email tool, because a fooled model
there **reaches data or acts**.

## Q2 — Access control (6 min)

"How do you make sure an agent handling one customer never sees another customer's claim?"

- **Strong:** identity from the **session**; claim lookups enforced by the claims service with the user's
  rights; documents indexed with customer and role metadata and **filtered before retrieval**; a
  **permission matrix test** in CI.
- **Weak:** "Tell the model which customer it is talking to."

## Q3 — Defences (8 min)

"A customer uploads a document containing hidden instructions. Walk me through what stops harm."

- **Strong:** provenance marks the content untrusted; **taint** restricts the email tool; emails go only to
  the customer on file and show the **exact content for confirmation**; output is **sanitised**, external
  images and links stripped; an input classifier as one layer, not the only one; monitoring counts.
- **Weak:** "The classifier would catch it."

## Q4 — Testing and assurance (8 min)

"How would you prove those defences work, and keep them working?"

- **Strong:** a test plan naming each control; a **regression suite** with **canary markers** in a separate
  environment, asserting on tool calls and retrieved records; runs **in CI**; block rates with
  **intervals** (e.g. 0/300 supports "under about 1.3%"); a **benign set** for over-blocking; scanner
  results read critically.
- **Weak:** "We tested it and nothing got through."

Follow-up: "The guard blocked 20 of 20. Ship?" — **Twenty trials bound the miss rate only below about
16%**; run more, and check the other layers hold with the guard off.

## Q5 — Governance and incidents (5 min)

"Leadership asks whether the assistant is safe to launch."

- **Strong:** the system card (purpose, data, evaluations, limits, controls), the **residual risks** with
  numbers and owners, the monitoring and **kill switches**, the incident runbook including **DPDP breach
  duties** for health and identity data, and a review date.
- **Weak:** "Yes, it is secure."

## Close (2 min)

"What would you do in your first month here?" — **Strong:** inventory the AI systems and their owners,
get the regression suites into CI for the riskiest one, and agree on how results are reported.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Threats | Ranked by reach and impact | Category list | One buzzword |
| Access control | Session identity, filter before model, matrix test | Filter, no test | Prompt instruction |
| Defences | Layers that hold if the model is fooled | One good layer | Classifier only |
| Assurance | Suite in CI, intervals, over-blocking | Some measurement | "Nothing got through" |
| Governance | Residual risk, runbook, DPDP | Partial | "It is secure" |

Hire bar: 11 or more of 15 with no 1 in access control or assurance. A candidate who says "I would test
only systems we own or are authorised to test, and I would tell you the rate, not a screenshot" is
showing the judgement the role needs.`,
    mcqs: [
      mcq('In the mock’s Q3, why is the input classifier described as “one layer, not the only one”?', [
        ['Classifiers miss some cases; the other layers must still hold', true],
        ['Classifiers are too slow to be used on documents a customer uploads', false],
        ['Classifiers are banned for personal data under the DPDP Act', false],
        ['Classifiers only work in English, so they are useless in India', false],
      ], 'Any classifier has a miss rate. Defence in depth means the tool restrictions, confirmations and output handling still prevent harm when it misses. Speed, law and language coverage are real concerns but not the reason here.'),
      mcq('In the mock’s Q4 follow-up, a guard blocked 20 of 20 harmful cases. What is the strongest answer to “ship?”', [
        ['Yes — a perfect score on every case shows the guard is reliable', false],
        ['No — the guard must be replaced, since 20 cases is too few to use', false],
        ['Yes, provided an automated scanner also reports no failures', false],
        ['Not on that alone: 20 trials bound misses only below ~16%; test more', true],
      ], 'Zero failures in 20 trials gives a 95% upper bound around 16%. More trials, a benign set and a check that other layers hold with the guard off are needed. The guard is not necessarily bad; the evidence is thin.'),
      mcq('In the mock’s Q2, which control actually stops the agent seeing another customer’s claim?', [
        ['A system-prompt line naming the customer the agent is helping', false],
        ['Claims-service lookups using the session’s identity', true],
        ['An output check that removes claim numbers from every answer', false],
        ['A fine-tuned model that has learnt to stay with one customer', false],
      ], 'Only the service holding the data can enforce who may see it, using identity from the authenticated session. Prompt lines and fine-tuning ask the model to behave; output checks act after the data was exposed.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_IV_AISEC_CHECKPOINT',
    notes: `Ten questions across the AI security interview sets: threats and design, security testing and
assurance, and defences and governance. Each is phrased the way a panel asks it. Do the arithmetic
before you choose.`,
    checkpoint: [
      ck('LLM_SECURITY', 'Which design feature most directly exposes an assistant to the “excessive agency” risk?', [
        ['Answers rendered as markdown inside the company’s customer web portal', false],
        ['One vector index shared by every customer of the product', false],
        ['Tools that can send emails, book slots or move money for users', true],
        ['A public endpoint offered on a free tier with no login', false],
      ], 'Excessive agency is about what the model can do: functionality, permissions and autonomy. Markdown rendering maps to output handling, a shared index to vector weaknesses and a free endpoint to unbounded consumption.'),
      ck('LLM_SECURITY', 'A multi-tenant assistant must keep each company’s documents apart. Which control is strongest?', [
        ['Tenant-filtered retrieval from the session, or per-tenant indexes', true],
        ['A system prompt that names the tenant and forbids mentioning others', false],
        ['An output classifier that blocks other companies’ names in answers', false],
        ['Asking users to state their company at the start of each chat', false],
      ], 'Isolation must be enforced before the model sees data, with the tenant taken from authentication. Separate indexes are stronger still. Prompts and classifiers act after exposure; a user’s claim about their company is not identity.'),
      ck('LLM_SECURITY', 'Logs of an AI assistant hold full prompts with customers’ Aadhaar numbers and are kept forever. What fixes this?', [
        ['Encrypting the log files and keeping every prompt indefinitely', false],
        ['Moving the logs to a different cloud region with cheaper storage', false],
        ['Turning off all logging so that nothing about requests is kept', false],
        ['Redacting identifiers before logging, with a retention limit', true],
      ], 'Minimisation and storage limits mean logging what investigation needs, with identifiers redacted, for a set period. Encryption does not reduce what is held; no logging leaves incidents uninvestigable.'),
      ck('MODEL_RED_TEAMING', 'Why should a defence regression suite assert on tool calls and retrieved records rather than on the answer’s wording?', [
        ['Actions and records can be checked exactly; wording varies', true],
        ['Wording is never relevant to security, so it is not worth logging', false],
        ['Tool calls are cheaper to generate than answers in the test runs', false],
        ['Regulators require tests to check actions and ignore the answers', false],
      ], 'Harm comes from what the system does and exposes, and those can be asserted precisely even when wording changes. Wording still matters (leaked canary markers are checked), but as a secondary signal.'),
      ck('MODEL_RED_TEAMING', 'A team wants to claim its guard misses fewer than 1 in 100 harmful cases at 95% confidence. With no failures observed, roughly how many trials are needed?', [
        ['About 30', false],
        ['About 100', false],
        ['About 1,000', false],
        ['About 300', true],
      ], 'With zero failures the 95% upper bound is about 3/n, so n ≈ 300 brings it to 1%. A hundred trials supports only “under about 3%”; a thousand is more than this claim needs.'),
      ck('MODEL_RED_TEAMING', 'Security tests of your own assistant need data. What should the test environment use?', [
        ['A copy of production, so that the tests see realistic customer records', false],
        ['Synthetic data and test accounts, separate from production systems', true],
        ['Production itself at night, when fewer customers are using it', false],
        ['Real records of employees who have agreed to take part in testing', false],
      ], 'Tests must not expose or act on real personal data, and must be reproducible. Synthetic data and test accounts in a separate environment do both. Copies of production still hold personal data; testing in production can trigger real actions.'),
      ck('MODEL_RED_TEAMING', 'A fix raised the harmful-case block rate, and the same run shows genuine-question blocks rising from 1% to 7%. What should the report say?', [
        ['That the fix is a success, since it blocks more harmful requests', false],
        ['Both rates with intervals and the users affected, as a trade-off', true],
        ['Only the block rate, as false blocks belong to the product team', false],
        ['That the test is invalid, since benign rates should never change', false],
      ], 'A defence’s value and cost are reported together so owners can decide. Hiding the over-blocking makes the fix look free; it is not — at scale a six-point rise turns away many genuine users each day.'),
      ck('AI_GUARDRAILS', 'An agent’s confirmation dialog shows the model’s summary of a payment rather than the actual amount and payee. What is the weakness?', [
        ['A steered or mistaken model can describe a different payment than it makes', true],
        ['Users find summaries harder to read than the raw amount and payee', false],
        ['Summaries add latency, which makes users abandon the payment', false],
        ['The summary uses tokens, raising the cost of each transfer', false],
      ], 'The confirmation must show the exact arguments the application will execute, issued and checked by the app. A model-written summary can differ from the real action, so the user approves something they did not see.'),
      ck('AI_GUARDRAILS', 'A reporting assistant runs model-generated SQL. Which control limits damage the most?', [
        ['A blocklist rejecting queries that contain DROP or DELETE', false],
        ['A prompt telling the model to write only SELECT statements', false],
        ['A check that the query is shorter than a set number of characters', false],
        ['A read-only database role restricted to allow-listed tables', true],
      ], 'The database enforces a read-only role and table allow-list whatever SQL arrives. Keyword blocklists miss variants, prompts are requests, and length says nothing about what a query does.'),
      ck('AI_GUARDRAILS', 'An AI system processes customers’ health data for an insurer. Which governance step comes first?', [
        ['Choosing a certification body for an ISO/IEC 42001 audit', false],
        ['Listing it in an inventory with owner, data and risk level', true],
        ['Publishing a model card with the provider’s benchmark scores', false],
        ['Switching to a model hosted inside India for the whole system', false],
      ], 'Governance starts from knowing what systems exist, who owns them, what data they use and how risky they are. Risk reviews, system cards, audits and hosting decisions all follow from that inventory.'),
    ],
  },
];
