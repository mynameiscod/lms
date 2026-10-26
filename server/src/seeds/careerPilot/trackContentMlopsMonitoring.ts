/**
 * Career-track content: Model Monitoring, Retraining and LLMOps (MLOPS_MONITORING), the AI tracks,
 * batch AI4. MLOps Engineer track.
 *
 * Scope: instrumenting a model service with Prometheus metrics and alerting on its latency and errors;
 * monitoring real-world model quality when labels arrive late and slices hide failures; retraining
 * loops that cannot ship a worse model (champion versus challenger with a paired bootstrap); operating
 * an LLM application through a release registry of prompt + model + retrieval config, scripted eval
 * runs and cost per request; and handling a model incident end to end with a blameless review.
 *
 * Builds on DS_DEPLOYMENT (FastAPI serving, MLflow registry aliases, data/concept drift and PSI — not
 * re-taught), the years' T3_CICD_MONITORING (symptom alerts, thresholds from history, runbooks), and the
 * AI core's AI_PRODUCTION (tracing, cost per request, prompt canaries) and AI_EVAL_SAFETY (eval sets,
 * CI gate, comparing prompts). One running example: a payments app's UPI fraud-scoring model.
 *
 * Run in the scratch venv with prometheus_client 0.26, FastAPI 0.150 (TestClient, never a live server),
 * pandas 3.0.6, NumPy 2.5.4 and scikit-learn 1.9.1; every printed output shown is real. The latency in
 * the service demo comes from a seeded fake clock so the numbers are reproducible. Prometheus, Grafana
 * and Alertmanager are NOT installed: PromQL is written from the documentation and checked by computing
 * the same numbers in Python from the scraped buckets; alert-rule YAML was parsed with PyYAML only. The
 * LLM eval run uses a fake model (usage estimated as characters / 4) and made-up price units.
 *
 * Skills: MODEL_MONITORING by default; SERVICE_METRICS is OBSERVABILITY and LLMOPS is ML_EVALUATION
 * (trackSkillAttribution). Checkpoint questions plainly about another of the three use ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const MON = 'MODEL_MONITORING';
const OBS = 'OBSERVABILITY';
const EVAL = 'ML_EVALUATION';

export const TRACK_MLOPS_MONITORING_BUNDLES: PilotBundle[] = [
  /* ── SERVICE_METRICS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_SERVICE_METRICS',
    notes: `A fraud model that scores every UPI payment sits on the payment path: if it is slow, payments are slow; if
it errors, the app either blocks good payments or lets everything through. Before anyone asks "is the model
still accurate?" (the next lesson), the service has to be **observably healthy**. The years' CI/CD and
monitoring topic gave you the rule — start with error rate and p95 latency on the main path, alert on
symptoms, thresholds from history, a runbook per alert. This lesson is how you build that for a model
service with **Prometheus**, and how to read the numbers without fooling yourself.

## How Prometheus works, in four lines

- Your service keeps **counters, gauges and histograms** in memory and serves them as plain text at \`/metrics\`.
- The Prometheus server **scrapes** that endpoint every 15–30 s and stores each number as a time series.
- **PromQL** turns series into answers: rates, ratios, percentiles. Grafana draws them; **alerting rules**
  evaluate them and hand firing alerts to Alertmanager, which pages someone.
- Your code never pushes. If the scrape fails, that itself is a signal (\`up == 0\`).

## Instrumenting the FastAPI service

    from prometheus_client import (CollectorRegistry, Counter, Histogram, Gauge,
                                   generate_latest, CONTENT_TYPE_LATEST)

    registry = CollectorRegistry()
    REQUESTS = Counter("model_requests", "Prediction requests by outcome",
                       ["endpoint", "model_version", "status"], registry=registry)
    LATENCY = Histogram("model_request_duration_seconds", "Time to answer a prediction request",
                        ["endpoint"], buckets=(0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.5),
                        registry=registry)
    DECISIONS = Counter("model_decisions", "Decisions the model made", ["decision"], registry=registry)
    MODEL_INFO = Gauge("model_info", "The model this process is serving", ["model_version"],
                       registry=registry)
    MODEL_INFO.labels(MODEL_VERSION).set(1)

    @app.middleware("http")
    async def observe(request: Request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)
        start = clock()
        try:
            response = await call_next(request)
            status = str(response.status_code)
        except Exception:
            status = "500"
            response = JSONResponse({"detail": "internal error"}, status_code=500)
        LATENCY.labels(request.url.path).observe(clock() - start)
        REQUESTS.labels(request.url.path, MODEL_VERSION, status).inc()
        return response

    @app.get("/metrics")
    def metrics():
        return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)

Choices that matter: latency is a **histogram**, not an average (averages hide the slow tail); every
request is counted **with its status**, so the error rate is a ratio of two counters; \`model_version\` is a
label, so a dashboard can split by version during a canary. \`clock\` is \`time.perf_counter\` in production —
in the demo it is a seeded fake clock so the numbers below are reproducible.

## What the scrape returns

After 2,000 requests through FastAPI's TestClient, \`GET /metrics\` printed (excerpt):

    # TYPE model_requests_total counter
    model_requests_total{endpoint="/predict",model_version="fraud-2026-09-r3",status="200"} 2000.0
    # TYPE model_request_duration_seconds histogram
    model_request_duration_seconds_bucket{endpoint="/predict",le="0.05"} 689.0
    model_request_duration_seconds_bucket{endpoint="/predict",le="0.1"} 1763.0
    model_request_duration_seconds_bucket{endpoint="/predict",le="0.2"} 1995.0
    model_request_duration_seconds_bucket{endpoint="/predict",le="0.3"} 2000.0
    model_request_duration_seconds_bucket{endpoint="/predict",le="+Inf"} 2000.0
    model_request_duration_seconds_count{endpoint="/predict"} 2000.0
    model_request_duration_seconds_sum{endpoint="/predict"} 130.4763705068949
    model_decisions_total{decision="allow"} 1308.0
    model_decisions_total{decision="review"} 689.0
    model_info{model_version="fraud-2026-09-r3"} 1.0

The counter gained \`_total\`; buckets are **cumulative** (\`le\` = "less than or equal"). The client also
emits \`_created\` timestamps, which you can ignore.

## The PromQL, and checking it without Prometheus

Prometheus is not installed on the course machine, so these queries are written from the documentation and
the numbers were checked by doing the same arithmetic in Python on two scrapes.

    # p95 latency over the last 5 minutes
    histogram_quantile(0.95,
      sum by (le) (rate(model_request_duration_seconds_bucket{endpoint="/predict"}[5m])))

    # error ratio over the last 5 minutes
    sum(rate(model_requests_total{endpoint="/predict", status=~"5.."}[5m]))
      / sum(rate(model_requests_total{endpoint="/predict"}[5m]))

\`rate()\` is "increase per second over the window", so both queries describe **only the last five minutes**.
\`histogram_quantile\` finds the bucket holding the 95th-percentile rank and interpolates linearly inside it.

Then 1,000 more requests with a slow feature-store call (8% took 0.4–1.2 s) and 3% timeouts:

    window p95 from bucket deltas 0.6220
    cumulative p95 since start    0.1778
    window p95 exact              0.6842
    window error rate 28/1000 = 0.0280
    cumulative error rate 28/3000 = 0.0093

Two lessons. **The window matters:** from the cumulative counters the incident is invisible (0.18 s, 0.9%);
the deltas — what \`rate()\` computes — show it (0.62 s, 2.8%). **Buckets are approximations:** on the
healthy window the bucket estimate was 0.159 s against an exact 0.120 s, because the answer fell in the wide
0.1–0.2 bucket. Put bucket edges **at your SLO thresholds** (0.3 s here), and the question "what share of
requests finished within 0.3 s?" is exact: 0.931 in the bad window.

## Alerts that page for the right things

    - alert: FraudModelSlow
      expr: endpoint:model_request_duration_seconds:p95_5m{endpoint="/predict"} > 0.3
      for: 10m
      labels: {severity: page}
      annotations:
        runbook_url: "https://wiki.example.in/runbooks/fraud-model#slow"

Page on the user-facing symptoms — p95 above the SLO, error ratio above 1%, **no traffic at all**
(\`absent()\` or a zero rate: a dead scorer looks like a quiet night). Send model-behaviour shifts such as
"block rate doubled versus the same hour last week" (\`offset 1w\`) as **tickets**, not pages. Precompute
the expensive expressions as **recording rules** so dashboards and alerts agree.

## Traps

- **Label cardinality.** Never label by \`user_id\`, \`txn_id\` or a raw score: each value is a new series and
  Prometheus falls over. Labels are small fixed sets: endpoint, status, model_version, decision.
- **Several worker processes.** Under gunicorn/uvicorn workers each process has its own counters; use the
  client's multiprocess mode (\`PROMETHEUS_MULTIPROC_DIR\`) or scrape each worker.
- **Averages.** \`_sum / _count\` is a mean — useful for capacity, useless for "are users waiting?".`,
    workedExample: `**Task: the fraud model's dashboard shows p95 latency of 0.18 s and an error rate of 0.9% "today", yet the
payments team says checkout was slow for twenty minutes after lunch. Who is right?**

**Step 1 — find what the panel computes.** The panel query is
\`histogram_quantile(0.95, sum by (le) (model_request_duration_seconds_bucket))\` — no \`rate()\`. It reads
the cumulative buckets since the process started, so a 20-minute incident is diluted into hours of good
traffic. That is exactly the 0.1778 versus 0.6220 gap from the demo.

**Step 2 — fix the query.**

    histogram_quantile(0.95,
      sum by (le) (rate(model_request_duration_seconds_bucket{endpoint="/predict"}[5m])))

Over the incident it reads above 0.6 s; the payments team was right.

**Step 3 — check the error ratio the same way.** With \`rate()\` over 5 minutes the incident shows 2.8%
failures; the "0.9% today" was the cumulative 28/3000.

**Step 4 — why did nobody get paged?** The alert rule used the same cumulative expression, so it never
crossed 0.3 s. Move both expressions into recording rules and point the panel and the alert at them, so
they can never disagree again.

**Step 5 — the cause.** Splitting the latency histogram is not possible by dependency, so add one: a
histogram \`feature_store_duration_seconds\`. Next time the panel shows which call is slow without anyone
reading logs.

**What to tell the payments team:** "You were right — p95 was above 0.6 s for about twenty minutes and 2.8%
of requests failed, caused by feature-store timeouts. Our panel and alert averaged over the whole day;
they now use five-minute windows and the alert would have paged within ten minutes."`,
    mcqs: [
      mcq('A fraud model\'s latency histogram has buckets at 0.1, 0.2 and 0.5 s, and the SLO is "95% of requests under 0.3 s". What change makes the SLO check exact?', [
        ['Add a bucket boundary at 0.3 s so the share under the SLO is read directly', true],
        ['Switch the histogram to a summary so the p95 is computed inside every worker', false],
        ['Raise the scrape interval to five seconds so the buckets fill in more detail', false],
        ['Divide the histogram _sum by _count and compare that average with 0.3 s', false],
      ], 'histogram_quantile interpolates inside a bucket, so an answer between 0.2 and 0.5 is a guess. A bucket edge at 0.3 makes "share at or below 0.3 s" an exact ratio of two counters. Summaries cannot be aggregated across workers, scrape interval does not change bucket edges, and the mean hides the tail.'),
      mcq('After an incident, the cumulative p95 since process start is 0.18 s while a 5-minute window over the incident gives 0.62 s. Which number describes what users felt during the incident?', [
        ['The 5-minute window, because rate() looks only at requests in that window', true],
        ['The cumulative figure, because it uses every request and so has less noise', false],
        ['Neither, because a histogram cannot give a percentile without the raw data', false],
        ['Their average of about 0.40 s, which balances the two different viewpoints', false],
      ], 'Cumulative buckets mix the incident with hours of healthy traffic. rate() over a window turns them into the distribution of recent requests only. The bucket estimate is approximate but meaningful; averaging two percentiles means nothing.'),
      mcq('An engineer wants to see which customers get slow scores and adds a customer_id label to the latency histogram. What is the problem?', [
        ['Each customer becomes its own set of series, and Prometheus memory explodes', true],
        ['Histograms in prometheus_client refuse any label other than the endpoint name', false],
        ['The customer_id would be hashed by Prometheus, so it could not be read back', false],
        ['Labels on histograms are dropped by rate(), so the label would never show up', false],
      ], 'Every distinct label value creates new time series — with crores of customers that is unbounded cardinality. Per-customer detail belongs in logs or traces. Histograms accept any labels, Prometheus does not hash them, and rate() keeps labels.'),
    ],
    checkpoint: [
      ck(OBS, 'Which alert on the fraud-scoring service is most likely to page someone for a real problem rather than noise?', [
        ['Error ratio on /predict above 1% for five minutes', true],
        ['CPU on any scoring pod above 80% for one minute', false],
        ['Any single request on /predict slower than 2 s', false],
        ['Memory of the scoring process above 1 GB at all', false],
      ], 'Error ratio on the user path is a symptom users feel, and the duration requirement filters single spikes. CPU and memory are causes that are often harmless, and one slow request is not an incident.'),
      ck(OBS, 'A dashboard panel computes p95 latency with histogram_quantile over the raw _bucket series, with no rate(). What does the panel actually show?', [
        ['The p95 of every request since each process started', true],
        ['The p95 of the last scrape interval, about 15 seconds', false],
        ['The p95 of the last five minutes, the default window', false],
        ['Nothing at all, since PromQL rejects the expression', false],
      ], 'Bucket counters are cumulative since process start; without rate() or increase() the quantile describes all of history and hides recent incidents. There is no implicit five-minute window, and the query is valid, which is why the mistake survives.'),
      ck(OBS, 'The fraud scorer stops receiving traffic because a gateway route was deleted, and no alert fires. Which rule would have caught it?', [
        ['An alert on a zero request rate or an absent series for 10 minutes', true],
        ['An alert on error ratio above 1%, which rises when traffic stops', false],
        ['An alert on p95 latency above 0.3 s, which climbs with no requests', false],
        ['An alert on the model_info gauge going from 1 down to 0 at once', false],
      ], 'With no requests there are no errors and no slow requests, so ratio and latency alerts stay silent (a ratio over zero traffic is empty, not high). model_info stays 1 while the process runs. Only an explicit "no traffic" rule sees silence.'),
    ],
  },

  /* ── MODEL_QUALITY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_MODEL_QUALITY',
    notes: `A service can be perfectly healthy — 60 ms, zero errors — while its model quietly lets fraud through.
Data science's deployment topic taught drift (PSI, KS, prediction drift) and why concept drift needs
labels. This lesson is the operational part: **how to measure real quality when labels arrive weeks late,
and how a healthy overall number can hide a broken slice**. It runs on 12 weeks of simulated scores from
the payments app's UPI fraud model: 7.2 lakh transactions in three channels — P2P transfers, merchant QR
payments (P2M_QR), and collect requests.

## Labels arrive late, and "recent" looks too good

A fraud label exists only when a customer complains or a bank raises a chargeback — days or weeks after the
payment. Counting the frauds known so far, per week, on the monitoring date:

    Fraud rate per week, % - reported so far vs eventually
            reported  eventual
    13 Jul      0.50      0.54
    20 Jul      0.42      0.49
    27 Jul      0.36      0.46
    03 Aug      0.29      0.49
    10 Aug      0.18      0.48
    17 Aug      0.03      0.50

Fraud did not fall; the labels have not arrived. Any metric on recent weeks inherits this: recall looks
artificially high (few known frauds to miss) and the fraud rate looks like a success story. Rule: **only
judge mature data** — rows whose label window has closed. Measure the reporting delay once (here most
reports land within a month), choose a maturity cut-off, and report it next to every quality number:

    Mature rows (whole weeks ended >= 35 days ago): 420,000; share of their frauds already reported: 97.2%

## The overall number hides the failure

Recall at the blocking threshold (0.5) on mature weeks, before and after week 6:

    Recall at threshold 0.5, by slice
    channel    ALL    P2P  P2M_QR  COLLECT
    wk 1-5   0.687  0.697   0.672    0.645
    wk 6-7   0.706  0.696   0.817    0.351

    Reported frauds (the denominators)
    channel   ALL  P2P  P2M_QR  COLLECT
    wk 1-5   1450  983     360      107
    wk 6-7    571  381     153       37

Overall recall went **up**. Meanwhile recall on collect requests nearly halved: a new collect-request scam
started in week 6 and the model catches about a third of it. Collect requests are 4% of traffic and under 7%
of frauds, so their collapse moves the overall figure by less than the week-to-week noise (the weekly
overall recall wandered between 0.659 and 0.716). The overall metric is a weighted average; a small slice
can fall off a cliff inside it.

The code is ordinary pandas:

    def recall(g):
        return (g["flagged"] & g["label"]).sum() / g["label"].sum()

    res = m.groupby(["period", "channel"]).apply(recall, include_groups=False).unstack()

**Always print the denominators.** 37 frauds is enough to see a drop from 0.65 to 0.35, but a slice with
six frauds will swing wildly on noise; for small slices, pool several weeks or show an interval.

## Choosing slices

Slice by what the business or the fraudsters can change: channel, new versus existing customers, app version,
region or language, bank, amount band, device type. Keep the list fixed and short (5–10 slicing columns);
searching hundreds of slices every week will always "find" a failure by chance. Add a slice when an incident
teaches you one.

## While you wait: proxy metrics

Labels for the last five weeks do not exist yet. What you can watch today, per slice:

    Flag rate %, by week and channel (needs no labels)
    channel    P2P  P2M_QR  COLLECT
    01 Jun   0.470   0.284    0.536
    29 Jun   0.437   0.297    0.896
    06 Jul   0.470   0.347    0.411
    13 Jul   0.556   0.376    0.450
    10 Aug   0.450   0.338    0.498
    17 Aug   0.512   0.221    0.166

Collect's flag rate averaged 0.64% in weeks 1–5 and 0.38% from week 6 — a hint visible weeks before the
labels, but noisy week to week. Good proxies for fraud: flag rate and score distribution per slice,
customer complaints per lakh payments, manual-review hit rate (reviewers label within hours), and rules that
fire independently of the model. A proxy tells you **where to look**, not that the model is wrong.

## Read drift results with care

Drift on an input (from the deployment topic) is a question, not a verdict. The collect scam produced **no
input drift worth noticing** overall — 4% of traffic, a fraction of which changed. Conversely a festival
sale shifts amounts massively and the model is fine. Pair every drift alert with the matching slice's
quality once labels mature, and record the outcome so the next alert is read faster.

## A monitoring job, written down

Weekly, scheduled (a Prefect flow or a cron job): load scores joined to labels, keep mature rows, compute
recall and precision at the threshold plus PR-AUC overall and per slice with denominators, compare with the
last four mature weeks, and open a ticket when a slice with enough positives drops by more than an agreed
margin. Daily: flag rate and score distribution per slice. Store the results as a table, not just a chart, so
the retraining job (next lesson) can read them.`,
    workedExample: `**Task: the risk head of a lender asks, "the default model's AUC this quarter is 0.81, same as last quarter —
can we skip the model review?" You own the monitoring.**

**Step 1 — check maturity.** A personal-loan default is labelled at 90 days past due, so a loan disbursed
this quarter cannot be labelled yet. The 0.81 was computed on loans disbursed 6–9 months ago. Say so: "this
AUC describes the borrowers of two quarters ago."

**Step 2 — slice it.** Compute AUC and the default rate per slice on the same mature window:

    slice                    loans   defaults  AUC
    salaried, metro          41,200    1,030   0.83
    salaried, tier-2/3       18,900      640   0.80
    self-employed            9,700       520   0.74   (last quarter 0.80)
    new-to-credit            3,100       270   0.66   (last quarter 0.77)

The overall 0.81 hides a large fall for new-to-credit borrowers (270 defaults — enough to trust the drop)
and a smaller one for the self-employed.

**Step 3 — look for the cause.** The new-to-credit share doubled after a partnership with a gig-work
platform; those borrowers have thin bureau files and the model leans on bureau features they lack.

**Step 4 — proxies for the recent, unlabelled quarter.** Early-delinquency (a missed first EMI) is known within
35 days. It is running at 2.1× last year's level for new-to-credit loans: the problem is getting bigger.

**Step 5 — what to recommend.** No skipping the review. Tighten the approval threshold for the
new-to-credit slice now (a policy change, reversible), start a retraining run with the partnership's loans,
and add "new-to-credit" as a permanent monitored slice with an early-delinquency alert.

**The sentence for the risk head:** "Overall AUC is unchanged because most borrowers are salaried; for
new-to-credit borrowers it fell from 0.77 to 0.66 on 270 defaults, and early delinquency says this
quarter is worse."`,
    mcqs: [
      mcq('On 24 Aug the reported fraud rate for the week of 17 Aug is 0.03% against about 0.5% for June weeks. What is the most likely explanation?', [
        ['Most frauds from that week have not been reported yet, so its labels are immature', true],
        ['The model blocked so much fraud that week that fraudsters moved to another app', false],
        ['A fall that large proves concept drift, and the model needs retraining this week', false],
        ['The fraud rate is seasonal, and August is always the quietest month of the year', false],
      ], 'Fraud labels arrive through complaints and chargebacks over weeks. A one-week-old cohort has almost none of its labels, so its fraud rate is low by construction. The fix is a maturity cut-off, not a celebration or a retrain.'),
      mcq('Overall recall rose from 0.687 to 0.706, while collect-request recall fell from 0.645 to 0.351 on 37 frauds. Why did the overall number not show the fall?', [
        ['Collect requests are a small share of the frauds, so their drop barely moves the total', true],
        ['Recall is computed per transaction, so the slices do not contribute to the overall value', false],
        ['The collect drop is noise, because a recall based on 37 frauds can never be trusted', false],
        ['Overall recall uses a different threshold from slice recall in the monitoring job', false],
      ], 'Overall recall is a weighted average over slices, weighted by their frauds. A slice with under 7% of frauds can halve while the total rises on noise elsewhere. 37 positives is small but a 30-point drop is well outside its noise.'),
      mcq('Weekly monitoring checks 400 slice combinations and alerts on any slice whose recall drops by 10 points. What will happen?', [
        ['Many alerts will fire on small slices by chance, and the team will stop reading them', true],
        ['Every alert will point at real model failures, because 400 checks cover every possible case', false],
        ['No alerts will fire, because slices with few frauds are dropped by pandas groupby', false],
        ['The alerts will be correct but late, because more slices mean slower computation', false],
      ], 'Many small slices plus a fixed threshold is a multiple-comparisons problem: some will cross it by luck every week. Keep a short, fixed list of meaningful slices, require a minimum number of positives, and show intervals.'),
    ],
    checkpoint: [
      ck(MON, 'Fraud labels for a UPI model mostly arrive within 30 days. Which data should the weekly recall report be computed on?', [
        ['Weeks whose label window has closed, with the share already reported shown', true],
        ['The most recent week only, because it reflects the model now in production', false],
        ['All weeks equally, since recall ignores the transactions without any label', false],
        ['The training data, because it has complete labels for every transaction', false],
      ], 'Immature weeks under-count frauds and so overstate recall. Using only mature weeks, with label completeness reported, gives an honest number. Training data says nothing about production.'),
      ck(MON, 'Before labels arrive, which signal best hints that the fraud model is failing on collect requests specifically?', [
        ['The collect slice\'s flag rate and score distribution against previous weeks', true],
        ['The PSI of the transaction amount computed over all channels together, each day', false],
        ['The overall model AUC computed on the most recent week of transactions', false],
        ['The service\'s p95 latency on /predict split by the payment channel label', false],
      ], 'A per-slice proxy that needs no labels — how often the model flags collect requests, and how their scores are distributed — is what moved here. Overall PSI is dominated by large channels, recent AUC is unlabelled, and latency is service health.'),
      ck(MON, 'A slice shows recall falling from 0.70 to 0.40, but it contains only 5 known frauds this month. What is the right move?', [
        ['Pool more weeks or show an interval before treating the drop as real', true],
        ['Retrain immediately, since a 30-point fall is too large to be noise', false],
        ['Delete the slice from monitoring, since small slices are never useful', false],
        ['Lower the global threshold until the slice recall returns to 0.70', false],
      ], 'With 5 positives, one or two misses swing recall by 20–40 points. Pooling weeks or computing an interval shows whether the drop is real. Small slices can matter a lot, so deleting them is wrong, and moving the global threshold changes everyone\'s experience.'),
    ],
  },

  /* ── RETRAINING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_RETRAINING',
    notes: `The monitoring job found it: a collect-request scam the fraud model misses. The fix is a retrain — but a
retraining loop is also the easiest way to ship a **worse** model automatically, every week, with nobody
looking. This lesson designs the loop so that cannot happen. The pipeline machinery (DVC, a validated
pipeline, the MLflow registry and its aliases) is the pipelines topic; here we decide **when** to retrain,
**what** to train on, and **how** to decide that the new model may replace the old one.

## Scheduled, triggered, or both

- **Scheduled** (weekly, monthly): simple, keeps the pipeline exercised so it works on the day you need it, and
  keeps the model close to recent behaviour. Cost: compute, and a stream of near-identical candidates.
- **Triggered**: a mature slice drops, a large upstream change lands (a new product, a new region), drift that
  the quality data confirms. Faster response to real change.
- **In practice, both**: a schedule as the heartbeat, triggers for extra runs — and **neither promotes
  automatically**. Every run produces a challenger; a gate decides.

A pure "retrain whenever drift fires" loop fails both ways: it retrains on harmless shifts (a festival sale)
and, when the shift is a data bug, it learns the bug.

## Choosing the training window

Recent data is more representative; older data has more fraud examples and more mature labels. A sliding
window (the last N mature weeks) is the common choice; the rows newer than the maturity cut-off are excluded
because their labels are incomplete — training on them teaches the model that recent frauds are legitimate.

One more fraud-specific trap: **blocked payments never get an outcome**. A payment the model blocked cannot
turn out to be fraud or not, so the model's own decisions shape its next training set. Teams keep a small,
risk-approved random sample of borderline payments that go to manual review instead of being auto-decided,
so there are labels where the model is unsure.

## Guarding against training on bad data

Before training, validate the window the same way the pipelines topic validated its input (schema, ranges,
null shares) — and add **comparisons against history**: each feature's null share, zero share and mean per
week against the previous weeks. Why it matters, in numbers: a refactor of the feature pipeline silently set
\`new_device\` to 0 for every row. The challenger trained on that data, scored on the newest labelled weeks:

    new_device rate by week: [0.05, 0.048, 0.049, 0.05, 0.051, 0.051, 0.049, 0.049, 0.049, 0.049]
      | in broken window: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    broken-data challenger - champion: +0.067  95% CI [+0.016, +0.116]
      P2P      champ 0.087  bad 0.032  diff -0.056 [-0.102, -0.018]
      P2M_QR   champ 0.096  bad 0.017  diff -0.085 [-0.149, -0.036]
      COLLECT  champ 0.062  bad 0.593  diff +0.526 [+0.366, +0.661]

Overall, the broken model **beats** the champion with an interval clear of zero — it learned the new scam,
so collect improves hugely — while it has forgotten that a new device signals fraud and is clearly worse on
P2P and QR, which carry most of the money. An overall-only gate would have promoted it. A one-line check
("new_device non-zero share is 0.0, history 0.05") stops it before training even starts.

## Champion versus challenger, done properly

Score both models on the **same** newest mature window that **neither** trained on (here weeks 8–9; the
champion trained on weeks 0–4, the challenger on 2–7). Because both score the same rows, compare them with a
**paired bootstrap**: resample rows, recompute both metrics on each resample, keep the difference.

    def paired_bootstrap(y, a, b, B=1000, seed=0):
        r = np.random.default_rng(seed); n = len(y); diffs = []
        for _ in range(B):
            i = r.integers(0, n, n)
            if y[i].sum() == 0:
                continue
            diffs.append(average_precision_score(y[i], b[i]) - average_precision_score(y[i], a[i]))
        return np.mean(diffs), np.percentile(diffs, [2.5, 97.5])

On 80,000 holdout payments with 295 frauds (HistGradientBoostingClassifier for both):

    PR-AUC champion 0.078  challenger 0.209
    challenger - champion: +0.128  95% CI [+0.085, +0.170]
      P2P      frauds  153  champ 0.087  chall 0.102  diff +0.014 [-0.016, +0.041]
      P2M_QR   frauds   83  champ 0.096  chall 0.072  diff -0.025 [-0.082, +0.027]
      COLLECT  frauds   59  champ 0.062  chall 0.633  diff +0.568 [+0.424, +0.686]
    champion   recall in top 400 reviewed: 0.153
    challenger recall in top 400 reviewed: 0.258

PR-AUC, not ROC-AUC, because fraud is rare (0.37% here) and the ops team acts on the top of the list; the
last two lines put it in their terms — with a review budget of 0.5% of payments, the challenger finds 26% of
fraud instead of 15%. The **paired** interval is much tighter than comparing two separate intervals, because
both models' luck on each resample cancels.

## The promotion rule, written before the run

1. Training data passed validation and history checks.
2. Overall: the lower end of the 95% interval on the difference is above 0 (better), or above an agreed
   non-inferiority margin when the run has another reason to exist.
3. Every monitored slice with enough positives: the lower end is above a **slice margin** (say −0.03). The
   good challenger's QR interval [−0.082, +0.027] is uncertain, not proven worse; with 83 frauds the rule
   says: promote **to canary**, watch QR's flag and review rates closely. The broken challenger's P2P
   [−0.102, −0.018] fails outright.
4. Operational checks: latency and model size within budget, the same feature list as serving.
5. Then the registry alias moves to a **canary** or shadow, and the full move happens only after its live
   proxies look normal.

Write the rule down with the margins **before** looking at results. A rule chosen after seeing the numbers
always lets the new model through.

## Continuous training, end to end

    weekly (or on trigger):
      extract mature window  ->  validate + history checks  ->  train challenger (tracked in MLflow)
      ->  score champion + challenger on newest mature holdout  ->  paired bootstrap, overall + slices
      ->  gate  ->  alias "challenger" / canary  ->  live proxies OK  ->  alias "production"
      every step logs its inputs and verdict; a failed gate is a normal outcome, not an error

Run it as a scheduled flow (the pipelines topic shows Prefect); store every gate decision with its numbers so
the next incident review can see why a model was or was not promoted.`,
    workedExample: `**Task: a grocery chain's demand-forecasting model (per store, per item, next 7 days) is retrained every Sunday
and promoted automatically if its validation MAPE is lower. After Diwali, store managers complain of empty
shelves. Redesign the loop.**

**Step 1 — what went wrong.** The Sunday after Diwali, the window included the festival week. The
challenger learned festival-level demand, its validation MAPE (measured on a random 20% of the same
window) was lower, and it was promoted — then over-forecast some items and, after the planners cut
orders to compensate, under-forecast staples.

**Step 2 — fix the comparison.** Score champion and challenger on the **most recent complete week**, which
neither trained on, not a random split of the training window. Use a metric the business feels: weighted
absolute error in units, plus the share of store-items that would have stocked out.

**Step 3 — add slices.** Staples, perishables, festival items; metro and tier-2 stores. A paired bootstrap
over store-days per slice; staples must not get worse by more than 2%.

**Step 4 — handle known events.** Add a holiday-calendar feature, so festivals are explained rather than
absorbed into the baseline, and mark festival weeks in the holdout so a challenger is never judged only on a
festival week.

**Step 5 — validate the data.** Check weekly sales per store against history; a store whose POS was down
for two days must not teach the model that demand fell.

**Step 6 — keep a human in the loop for now.** The gate's report (overall, per slice, intervals) goes to the
planning lead, who approves the alias move for the first three months; automate once the gate has agreed
with them every time.

**What changes:** the loop still runs weekly, but "lower validation MAPE" is replaced by "not worse on any
key slice, better overall, on the newest week neither model saw".`,
    mcqs: [
      mcq('A challenger beats the champion overall with a 95% interval of [+0.016, +0.116] in PR-AUC, but its P2P interval is [−0.102, −0.018]. What should the gate do?', [
        ['Block it: a large slice is clearly worse, whatever the overall gain', true],
        ['Promote it, since the overall interval lies entirely above zero now', false],
        ['Promote it to the P2P slice only, where most of the money moves', false],
        ['Rerun the bootstrap with a new seed until the P2P interval clears', false],
      ], 'An interval wholly below zero means a real regression on P2P, which carries most of the volume; an overall gain from another slice cannot pay for it. Rerunning with new seeds until it passes is result-shopping.'),
      mcq('Why is a paired bootstrap preferred over computing a separate interval for each model and checking for overlap?', [
        ['Both models are scored on the same resampled rows, so shared luck cancels out', true],
        ['A paired bootstrap needs fewer resamples, so the comparison runs much faster', false],
        ['Separate intervals cannot be computed for PR-AUC, only for ROC-AUC in practice', false],
        ['Overlap tests always favour the champion, while paired tests favour challengers', false],
      ], 'Hard and easy rows affect both models together; pairing removes that common variation, so the interval on the difference is much tighter. Overlapping separate intervals can hide a real, consistent difference.'),
      mcq('A fraud model\'s retraining window includes payments from the last 10 days. What is the problem?', [
        ['Their fraud labels are incomplete, so recent frauds are learned as legitimate', true],
        ['Ten days of payments are too few rows for a gradient boosting model to fit well', false],
        ['Recent rows always drift, so they must be excluded from every training set', false],
        ['The champion was trained without them, so the comparison becomes unpaired', false],
      ], 'Rows newer than the label-maturity cut-off still look non-fraudulent because the reports have not arrived; the model learns those frauds as good payments. Recent data is valuable once mature.'),
    ],
    checkpoint: [
      ck(MON, 'A team retrains its churn model automatically every time a feature\'s PSI crosses 0.25 and promotes the result. What is the main risk?', [
        ['A data bug that causes the drift gets learned and shipped with no comparison', true],
        ['Retraining too often wastes compute, which is the only real cost of the loop', false],
        ['PSI cannot be computed on the churn features, so the trigger never fires', false],
        ['The model gets too accurate on recent data and loses its calibration', false],
      ], 'Drift is as often a pipeline bug as a real change; retraining on it and promoting without a gate ships the bug. Compute cost is secondary. Triggers are fine if a validated comparison decides promotion.'),
      ck(MON, 'Which holdout makes a champion-versus-challenger comparison fair?', [
        ['The newest mature weeks, after both models\' training windows', true],
        ['A random 20% split of the challenger\'s own training window', false],
        ['The champion\'s original test set from when it was first built', false],
        ['The weeks where the drift alert first fired in production', false],
      ], 'The same unseen, most recent, fully labelled data for both. A random split of the challenger\'s window leaks its period into evaluation, the old test set says nothing about today, and alert weeks are a biased choice.'),
      ck(MON, 'A fraud model blocks high-risk payments outright. Why does that complicate retraining?', [
        ['Blocked payments never show whether they were fraud, so labels are missing there', true],
        ['Blocked payments are stored in a separate database that the pipeline is unable to read', false],
        ['Blocking changes the latency profile, which drifts the training features later', false],
        ['Blocked payments are always fraud, so the model learns nothing new from them', false],
      ], 'The model\'s decisions remove outcomes exactly where it is confident, biasing the next training set. A small risk-approved sample sent to review instead keeps labels flowing. Not every blocked payment is fraud.'),
    ],
  },

  /* ── LLMOPS ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_LLMOPS',
    notes: `The AI core already gave you the pieces: traces that record the prompt version (Running AI Applications),
an eval set run by pytest and a CI gate (Evaluating and Guarding LLM Applications), sticky canaries and
rollback by config. **LLMOps is running those pieces as one operating system for an application** — the
same job MLOps does for a classic model, with different moving parts.

## What changes from classic MLOps

| | Classic model (the fraud scorer) | LLM application (a loan FAQ assistant) |
|---|---|---|
| What you version | Training data, code, the trained artefact | Prompt, provider model, parameters, retrieval config, tools |
| Who changes the model | You, by retraining | Often the provider, behind an alias |
| Ground truth | Labels, even if late | Rarely; eval sets, judges, user feedback |
| Cost | Fixed compute per prediction | Tokens per request, varies with every prompt change |
| Failure mode | Wrong score, silently | Confident wrong text, a refusal storm, a cost spike |

The consequence: the **release** is the unit you version, evaluate, monitor and roll back — not "the model".

## A release registry

Hash everything that changes an answer into one id, so a trace, an eval result and a cost line can all say
exactly what produced them:

    def release(prompt_id, model, temperature, top_k, max_tokens):
        spec = {"prompt_id": prompt_id,
                "prompt_sha": hashlib.sha256(PROMPTS[prompt_id].encode()).hexdigest()[:12],
                "model": model, "temperature": temperature,
                "retrieval_top_k": top_k, "max_tokens": max_tokens}
        spec["release_id"] = "rel-" + hashlib.sha256(
            json.dumps(spec, sort_keys=True).encode()).hexdigest()[:8]
        return spec

    REGISTRY = {r["release_id"]: r for r in [
        release("loan-faq-v3", "provider-large", 0.0, 6, 300),
        release("loan-faq-v4", "provider-small", 0.0, 4, 200)]}
    ALIASES = {"production": "rel-dffa8f67", "candidate": "rel-632238b9"}

It printed:

    rel-dffa8f67 {'prompt_id': 'loan-faq-v3', 'prompt_sha': 'dc200197d0fe', 'model': 'provider-large', ...}
    rel-632238b9 {'prompt_id': 'loan-faq-v4', 'prompt_sha': 'f4d3fa13a39b', 'model': 'provider-small', ...}

The prompt's **hash** is in the spec, so editing the prompt text without renaming it still produces a new
release id. Aliases work like the MLflow registry aliases from the deployment topic: the service reads the
\`production\` alias, a rollback moves the alias back. (MLflow 3 also ships a prompt registry; the idea is the
same, keep the release spec in the repo either way.)

## A scripted eval run per release

The run loops over the eval set, builds each prompt with that release's retrieval settings, calls the model,
scores the answer and computes **cost per request** as tokens × price per million. Here the model is a fake
that reports usage as characters / 4 and prices are made-up units — read real usage from the provider's
\`response.usage\` and real prices from its price page:

    PRICE = {"provider-large": {"in": 10.0, "out": 30.0}, "provider-small": {"in": 1.0, "out": 4.0}}
    cost = (tokens_in * PRICE[m]["in"] + tokens_out * PRICE[m]["out"]) / 1e6

On eight cases (six answerable, two that must get "I don't know"):

    production rel-dffa8f67  pass 6/8 = 0.750  tokens in/out per request 165/36  cost/request 2.728 milli-units
       FAIL: Do you offer gold loans?
       FAIL: What is the interest rate for a car loan?
       cost per 1 lakh requests: 272.8 price units

    candidate  rel-632238b9  pass 7/8 = 0.875  tokens in/out per request 141/14  cost/request 0.197 milli-units
       FAIL: What is the maximum loan amount?
       cost per 1 lakh requests: 19.7 price units

Read it like an operator. The candidate fixes both out-of-scope questions (v3 guessed; v4 says "I don't
know") and costs about 14× less per request. But it **broke one answer that used to work** — and not because of
the prompt or the smaller model: the release also cut \`retrieval_top_k\` from 6 to 4, and the section with
the maximum loan amount ranked sixth. Without the retrieval setting inside the release, this regression would
be blamed on the model. Fix the retrieval (or keep top_k at 6, which is a new release id) and rerun; eight
cases is a smoke test, the real gate is the eval topic's full set and its comparison on disagreeing cases.

## Monitoring an LLM app in production

Tag every trace and every metric with \`release_id\`. Then, per release:

- **Cost:** tokens in and out per request, cost per request (p50 and p95 — one long conversation can cost
  50 normal ones), cost per day against a budget with an alert at 80%.
- **Latency:** time to first token and total, per release; a provider slowdown shows here first.
- **Quality without labels:** "I don't know" rate, refusal rate, guardrail hits, thumbs-down rate, escalation
  to a human — each per release, compared with the previous release on the same days of the week.
- **Online evaluation:** run the cheap deterministic checks (citation present, valid JSON, no PII) on every
  response, and an LLM judge on a 1–2% daily sample; the judge's agreement with humans was checked in the
  eval topic and must be rechecked when the judge model changes.
- **Drift in the questions:** cluster or tag incoming questions weekly; a new cluster ("UPI autopay mandate
  failed") is new scope with no eval cases yet — add cases from it.

## Who changes the model under you

A provider can update the model behind an alias. Pin a dated model where the provider allows it; when it
cannot be pinned, run the eval set **nightly** against production config so an unannounced change shows up
as a pass-rate drop with no release of yours. Treat a deprecation notice as a scheduled release: new
release id, full eval, canary.`,
    workedExample: `**Task: the loan FAQ assistant's cost per day jumped 3× overnight. Nothing was deployed. Find out why and
decide what to do.**

**Step 1 — split cost by release.** The cost panel groups by \`release_id\`: all traffic is on rel-dffa8f67,
the production alias, as yesterday. So no release changed. Cost per request p50 is flat; **p95 tripled**.

**Step 2 — which requests got expensive?** Sorting yesterday's traces by cost: the top 2% are conversations
of 15–40 turns, all sending the full history every turn. They started after the app team added a "continue
chatting" button — a product change outside the LLM release.

**Step 3 — size it.** Input tokens per request in those conversations grow with each turn, so cost grows
roughly with the square of the turn count. A 30-turn chat costs as much as a few hundred single questions.

**Step 4 — options, as releases.**

- rel-A: keep the last 6 turns plus a running summary (prompt change + a summarisation call).
- rel-B: same, on the small model for the summary only.

Both go through the eval run first. Add multi-turn cases to the eval set, since there were none — that is
why nobody noticed the long-conversation behaviour.

**Step 5 — guardrails on cost.** Add a per-conversation token budget (stop and offer a human after it), a
per-day cost alert at 80% of budget, and a p95 cost-per-request panel next to p50.

**What to write in the incident channel:** "Cost rose because long conversations resend full history since
the new button; no model or prompt change. Mitigation: per-conversation token cap tonight; fix through
release rel-A after eval tomorrow."`,
    mcqs: [
      mcq('A release spec hashes the prompt id, model name and parameters but not the prompt text. An engineer edits the prompt file in place. What goes wrong?', [
        ['The edited prompt runs under the old release id, so traces and evals misattribute it', true],
        ['The service fails to start, because the registry rejects any unregistered prompt edit', false],
        ['Nothing goes wrong, because the prompt id already identifies which template was used', false],
        ['The provider rejects the request, since the prompt no longer matches its stored hash', false],
      ], 'If the text is not part of the hash, two different prompts share one release id: results, costs and incidents are recorded against the wrong thing. Hash the content, not just the name. Nothing in the service or provider would notice.'),
      mcq('The candidate release passes both out-of-scope questions but fails "What is the maximum loan amount?" which production passed. The candidate changed prompt, model and top_k from 6 to 4. What should be checked first?', [
        ['Whether the needed section is still retrieved with top_k at 4', true],
        ['Whether the smaller model is too weak to read the loan amounts', false],
        ['Whether the new prompt forbids answering numeric questions', false],
        ['Whether the eval set was scored with the wrong expected fact', false],
      ], 'Retrieval is the cheapest thing to check and the change most likely to remove an answer completely: if the section is not in the context, no prompt or model can answer from it. In the run, the section ranked sixth, so top_k = 4 dropped it.'),
      mcq('Which signal best warns that the provider changed the model behind an alias overnight, with no release of yours?', [
        ['A nightly eval run against the production config dropping in pass rate', true],
        ['The service\'s p95 latency staying within its usual range overnight', false],
        ['The token count per request matching yesterday\'s average exactly', false],
        ['The HTTP error rate from the provider remaining under one percent', false],
      ], 'A silent model change usually keeps the API healthy; only behaviour moves. Running a fixed eval set on a schedule against unchanged config isolates the provider as the cause. Latency, tokens and error rate can all stay normal.'),
    ],
    checkpoint: [
      ck(EVAL, 'A candidate LLM release improves eval pass rate from 0.750 to 0.875 on eight cases and costs 14x less. What should happen before switching production?', [
        ['Run the full eval set, inspect regressions, then canary', true],
        ['Switch now, since both quality and cost are clearly better', false],
        ['Switch only if all eight cases pass on a second identical run', false],
        ['Switch only after the provider confirms its model is unchanged', false],
      ], 'Eight cases is a smoke test: one case is 12.5 points. The full set, a look at every case the candidate newly fails, and a canary on live traffic are what make the switch safe. Rerunning eight cases or a provider note adds little.'),
      ck(EVAL, 'An LLM judge scores a 2% daily sample of production answers. The team swaps the judge to a cheaper model. What must be redone?', [
        ['Check the new judge\'s agreement with human labels before trusting its scores', true],
        ['Nothing, since the judge prompt is unchanged and so its scores are comparable', false],
        ['Rescore all historical traces with the new judge before any new sample runs', false],
        ['Raise the sample to 10%, since a cheaper judge needs more data to be accurate', false],
      ], 'A judge is a measuring instrument; a new model can be stricter, looser or biased differently. Recheck agreement on a human-labelled set first. Rescoring history is optional, and a larger sample does not fix a biased judge.'),
      ck(MON, 'Cost per request p50 is flat but p95 tripled overnight for the loan FAQ assistant. What does that pattern point to?', [
        ['A minority of requests became much more expensive, such as long conversations', true],
        ['The provider raised its price per token for every request made by the app', false],
        ['A new release with a longer system prompt was rolled out to all of the users', false],
        ['The cache stopped working, so every request now pays the full model call cost', false],
      ], 'A price rise, a longer prompt or a cache failure would move the median too. A flat p50 with a jumping p95 means most requests are unchanged and a tail got expensive — find it in the most costly traces.'),
    ],
  },

  /* ── ML_INCIDENTS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_ML_INCIDENTS',
    notes: `Sooner or later a model breaks in production: a release scores everyone as fraud, a feature pipeline sends
zeros, an LLM release starts promising loan rates it has no authority to promise. The difference between a
bad hour and a bad week is what you prepared **before**: a runbook, a way to roll back, a kill switch, a
fallback, and a habit of writing reviews that fix the system rather than blame a person.

## Model incidents are different

- **Silent.** The service returns 200 with wrong answers; the first alert may be a business metric
  (blocked payments, complaints) or a human.
- **Several things can be "the release":** the model artefact, a feature's computation, the threshold, the
  prompt, the retrieval index, the provider's model. Rollback must exist for each.
- **Harm accumulates.** Every wrongly blocked UPI payment is a customer who could not pay; every missed fraud
  is money lost. Mitigate first, diagnose second.

## The runbook

One page per service, linked from every alert. For the fraud scorer:

    Fraud scorer runbook
    1. Is it the service? Check the dashboard: error ratio, p95, traffic. Not model quality yet.
    2. Is it the model? Block rate and review rate by channel vs same hour last week;
       model_version label: did a release go out in the last 24 h?
    3. Mitigate (no approval needed for these):
       a. Roll back the model:  move the registry alias "production" to the previous version, restart pods.
       b. Roll back a feature:  set feature flag FEATURE_<name>=previous, or pin the feature view version.
       c. Kill switch:          MODEL_MODE=rules  (rules decisions, model not called).
    4. Tell people: #payments-incidents, risk on-call. Every 30 min until resolved.
    5. Diagnose only once harm has stopped. Keep the bad version and its inputs for the review.

Write it **before** the incident, and practise it: a rollback nobody has tried is a hope, not a plan.

## Kill switches and fallbacks

A **fallback** happens automatically when the model cannot answer; a **kill switch** is a human decision to
stop using the model even though it answers. Both need a pre-agreed alternative. For fraud: simple rules
signed off by the risk team.

    def flags():
        return {"mode": os.environ.get("MODEL_MODE", "model")}   # model | rules

    @app.post("/score")
    def score(t: Txn):
        if flags()["mode"] == "rules":
            return {"decision": rules_decision(t), "source": "rules:kill-switch"}
        try:
            p = model_score(t)
        except Exception:
            return {"decision": rules_decision(t), "source": "rules:fallback"}
        return {"decision": "block" if p >= 0.8 else "review" if p >= 0.5 else "allow", "source": "model"}

Through TestClient, for one risky payment: normal \`{'decision': 'block', 'source': 'model'}\`; with the model
failing \`{'decision': 'review', 'source': 'rules:fallback'}\`; with the switch on
\`{'decision': 'review', 'source': 'rules:kill-switch'}\`. Three things make this work: the switch is read
**per request** (in production from a config service, not an environment variable that needs a restart),
the response says **which path decided** (so dashboards can count fallbacks), and the fallback has been
reviewed by the business — fail-open (allow everything) and fail-closed (block everything) are both business
decisions with costs, not engineering defaults.

## Rolling back the right thing

| What changed | Roll back by |
|---|---|
| Model artefact | Move the registry alias to the previous version (the pipelines topic) |
| Threshold | Config change; thresholds live in config, versioned like code |
| A feature's logic | Feature flag or pinned feature-view version; a model cannot be "rolled back" out of bad inputs |
| Prompt / LLM release | Move the \`production\` release alias back (the LLMOps lesson) |
| Provider model | Pin the previous dated version, or switch to the fallback provider |

The trap: rolling back the model when the **feature** is broken. The previous model gets the same bad
inputs and is just as wrong. Check the inputs before choosing what to roll back.

## Severity, roles and communication

Agree severity in advance (SEV1: payments blocked or money lost now; SEV2: degraded, workaround exists;
SEV3: no user impact yet). For SEV1/2 name an **incident commander** (decides, does not debug), a
**communications** owner, and the people fixing. Keep a timeline as you go — timestamps of every alert,
decision and change. The review is written from it.

## The blameless post-incident review

"Blameless" does not mean nobody is accountable; it means asking **why the system allowed the mistake**,
because the next person will make the same one. The review contains:

- **Summary and impact:** what users experienced, for how long, with numbers (payments wrongly declined,
  rupees of fraud missed).
- **Timeline:** detection, mitigation, resolution — and the gap between when it started and when anyone knew.
- **Contributing factors:** usually several. "The engineer deployed a bad model" is never the root cause;
  "the gate compared overall PR-AUC only, so a slice regression passed" is.
- **What went well:** the kill switch worked in 4 minutes. Keep doing that.
- **Actions:** few, specific, owned, dated. "Be more careful" is not an action; "add a per-channel
  non-regression check to the promotion gate, owner Priya, by 15 Nov" is.

Track the time-to-detect and time-to-mitigate across incidents. Those two numbers, more than any single fix,
tell you whether the monitoring in this topic is working.`,
    workedExample: `**Incident: at 10:40 on a Saturday the payments app's support queue fills with "my UPI payment to a shop was
declined". You are on call for the fraud scorer.**

**10:42 — confirm the symptom.** The service dashboard is green: 0.2% errors, p95 70 ms. The decision
panel is not: block rate on P2M_QR is 4.1% against 0.3% at the same hour last Saturday. P2P and collect
are normal. It is a model-behaviour incident, SEV1 (customers cannot pay merchants).

**10:44 — what changed?** No model release in 72 h (the model_version label is unchanged). The feature
pipeline deployed at 10:15: a change to how \`merchant_age_days\` is computed.

**10:46 — choose the rollback.** Rolling back the model would not help: the model is unchanged and the
input is wrong. Roll back the **feature**: set the feature flag to the previous computation.

**10:52 — verify.** P2M_QR block rate falls to 0.35% within five minutes. Keep the incident open for an hour
of normal traffic; post updates every 30 minutes.

**The review (excerpt):**

    Impact: 10:15–10:52, about 18,400 merchant payments declined that the model
      would normally have allowed; no fraud loss attributable.
    Detection: 25 min, by customers, not by alerts.
    Contributing factors:
      1. merchant_age_days changed units from days to months; the feature pipeline
         had no check on its range against the previous day.
      2. The block-rate alert used a 1 h window with "for: 30m", so it could not
         fire before ~11:15.
      3. Feature pipeline releases were not announced in the model on-call channel.
    Went well: feature flag rollback took 6 minutes from decision to effect.
    Actions:
      - Range and distribution check on every feature vs the previous day, failing the
        pipeline (owner: data platform, 7 Nov)
      - Per-channel block-rate alert, 10 min window, page at 3x baseline (owner: ML on-call, 31 Oct)
      - Feature pipeline releases post to #fraud-model (owner: data platform, 31 Oct)

Notice that no action says "be careful with units". Each one makes the same mistake **impossible or
loud**.`,
    mcqs: [
      mcq('The fraud scorer\'s block rate on merchant payments jumps 13x right after a feature-pipeline deploy; the model version has not changed in three days. What should be rolled back?', [
        ['The feature pipeline change, because the model is receiving wrong inputs', true],
        ['The model to its previous registry version, since the decisions are wrong', false],
        ['The decision threshold, raising it until the block rate returns to normal', false],
        ['Nothing yet, until the root cause is fully proved in a written review', false],
      ], 'The inputs changed, not the model; an older model would receive the same bad feature. Raising the threshold distorts every channel and hides the bug. With customers unable to pay, mitigate first — the review comes after.'),
      mcq('The fraud service\'s fallback returns "allow" for every payment when the model errors. Who should decide whether that is acceptable?', [
        ['The risk and business owners, since fail-open accepts fraud loss to keep payments flowing', true],
        ['The on-call engineer during each incident, depending on how severe the outage looks', false],
        ['Nobody needs to, because the fallback only runs when the model is unavailable', false],
        ['The infrastructure team, because the fallback runs inside the service container', false],
      ], 'Fail-open and fail-closed trade fraud loss against blocked customers — a business decision to make calmly in advance, not at 3am. It matters exactly because outages happen.'),
      mcq('A draft incident review lists one root cause: "Engineer deployed a feature change without checking units." What is wrong with it?', [
        ['It blames a person and leaves the system that allowed the mistake unchanged', true],
        ['It is too long; a review should name only the service that failed and stop', false],
        ['It should name the engineer\'s manager, since managers own every deployment', false],
        ['Nothing, since naming the cause clearly is the purpose of an incident review', false],
      ], 'Blameless reviews ask why the system permitted the error — no range check on the feature, an alert that could not fire in time. Fixing those protects against the next person making the same mistake; blaming one person fixes nothing.'),
    ],
    checkpoint: [
      ck(MON, 'What is the difference between a fallback and a kill switch for a model service?', [
        ['A fallback triggers automatically on model failure; a kill switch is a human choice', true],
        ['A fallback is used for LLM apps only, while kill switches are for classic ML scorers', false],
        ['A kill switch stops the whole service, while a fallback restarts the model pods', false],
        ['They are the same mechanism with two names used by different teams in practice', false],
      ], 'The fallback covers "the model cannot answer"; the kill switch covers "the model answers, but we no longer trust it". Both route to the same pre-agreed alternative, and neither stops the service.'),
      ck(MON, 'The kill switch for the fraud scorer reads an environment variable at startup. Why is that a weak design?', [
        ['Flipping it needs a restart or redeploy, which is slow in an incident', true],
        ['Environment variables cannot hold the value "rules" on Linux hosts', false],
        ['Reading the variable at startup makes every request noticeably slower', false],
        ['The model loads before the variable, so the switch can never apply', false],
      ], 'A kill switch must take effect in seconds without a deploy. Read it per request from a config or flag service. Environment variables can hold any string and reading one costs nothing.'),
      ck(MON, 'Across the last six model incidents, which two numbers best show whether monitoring is improving?', [
        ['Time to detect and time to mitigate', true],
        ['Number of alerts and number of dashboards', false],
        ['Lines of runbook and pages of reviews', false],
        ['Model AUC and service p95 latency', false],
      ], 'Detection and mitigation time measure what monitoring and runbooks are for: finding harm fast and stopping it. More alerts or documents can make things worse, and AUC and latency are properties of one model, not of the operation.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_DEBUGGING',
    notes: `Monitoring bugs are dangerous in a particular way: the system looks fine **because** the monitor is broken.
Each case below is real in shape — the symptom someone reported, the cause, and the smallest fix. Read the
symptom and guess the cause before reading on.

## 1. The p95 panel is empty

**Symptom.** A new Grafana panel for the fraud scorer's p95 shows "No data", though \`/metrics\` clearly
has the histogram.

    histogram_quantile(0.95,
      sum by (endpoint) (rate(model_request_duration_seconds_bucket[5m])))

**Cause.** \`histogram_quantile\` needs the \`le\` label to know the bucket edges. \`sum by (endpoint)\` threw
it away, so every bucket was added into one number with no edges.

**Fix.** Keep \`le\` in the grouping: \`sum by (le, endpoint) (...)\`. Whenever you aggregate buckets, \`le\`
must survive.

## 2. Request counts jump up and down between scrapes

**Symptom.** \`model_requests_total\` sometimes **decreases** between scrapes, and \`rate()\` shows bursts that
never happened. The service runs under gunicorn with four uvicorn workers.

**Cause.** Each worker process has its own in-memory registry. Each scrape lands on whichever worker answers,
so Prometheus sees four different counters taking turns; every "decrease" looks like a counter reset to it.

**Fix.** Use prometheus_client's multiprocess mode — set \`PROMETHEUS_MULTIPROC_DIR\` to an empty directory
before the workers start and serve \`/metrics\` from a \`MultiProcessCollector\` — or run one worker per container
and let Prometheus scrape each pod.

## 3. Precision "collapsed" in the last two weeks

**Symptom.** The weekly quality report shows fraud-model precision at 0.62 for mature weeks and 0.21 for the
last two weeks. Risk wants an emergency retrain.

    recent["precision"] = (recent.flagged & recent.label).sum() / recent.flagged.sum()

**Cause.** Immature labels. A flagged payment counts as a false positive until its fraud report arrives,
and most reports for the last two weeks have not arrived. Precision is biased **down**, recall **up**.

**Fix.** Report quality only on weeks past the maturity cut-off (with the label completeness), and show recent
weeks as proxies only — flag rate, manual-review confirmation rate. No retrain on this evidence.

## 4. The challenger won offline and lost in production

**Symptom.** The retraining job reported PR-AUC 0.31 for the challenger against 0.20 for the champion and
promoted it. Two weeks later, mature-label recall is lower than before.

    challenger = fit(data[data.week.between(2, 9)])
    hold = data[data.week.isin([8, 9])]

**Cause.** The holdout weeks 8–9 are **inside** the challenger's training window. It was scored partly on
rows it had memorised; the champion, trained earlier, was not. The comparison was rigged in its favour.

**Fix.** The holdout must be strictly later than **both** models' training data (here, train the challenger
on weeks 2–7), and the job should assert it: \`assert hold.week.min() > train.week.max()\`.

## 5. Two prompt releases score exactly the same

**Symptom.** The LLM eval run gives identical pass rates, tokens and per-case outputs for the production
and candidate releases, though their prompts are visibly different.

    key = hashlib.sha256(f"{model}|{question}".encode()).hexdigest()
    if key in cache: return cache[key]

**Cause.** The eval's reply cache is keyed by model and question only. Both releases use the same model, so
the candidate was served the production release's cached answers.

**Fix.** Key the cache by **release id** (which includes the prompt hash, parameters and retrieval config)
plus the input. Any cache in front of a model must include everything that changes the output.

## 6. The kill switch was flipped, and nothing happened for 9 minutes

**Symptom.** During an incident the on-call engineer set \`MODEL_MODE=rules\` in the deployment config.
Decisions kept coming from the model until the rollout finished restarting every pod.

**Cause.** The service read the variable once at import time into a module constant.

**Fix.** Read the switch per request from a flag or config service (cached for a few seconds at most), and
include \`source\` in every response so a dashboard can confirm the switch took effect.`,
    mcqs: [
      mcq('A p95 panel built with sum by (endpoint) over rate() of the _bucket series shows no data. What is the minimal fix?', [
        ['Add le to the sum by clause so the bucket edges survive', true],
        ['Replace rate() with irate() so recent buckets are used', false],
        ['Change 0.95 to 95, the percentile form PromQL expects', false],
        ['Query the _count series instead of the bucket series', false],
      ], 'histogram_quantile needs the le label to know where each bucket ends; dropping it in the aggregation leaves nothing to interpolate. irate changes the window, PromQL takes quantiles as 0–1, and _count has no distribution in it.'),
      mcq('Under four gunicorn workers, model_requests_total sometimes falls between scrapes. Why?', [
        ['Each worker keeps its own counter and the scrape hits a different worker each time', true],
        ['Prometheus compacts its old samples, which lowers the counters during scraping periods', false],
        ['Counters in prometheus_client reset to zero every time the /metrics page is read', false],
        ['The status label changes per request, so values move between two separate series', false],
      ], 'Separate processes mean separate in-memory registries; successive scrapes read different ones and look like resets. Multiprocess mode or one process per scraped target fixes it. Reading /metrics does not reset anything.'),
      mcq('Fraud-model precision reads 0.21 on the last two weeks against 0.62 on mature weeks. What is the most likely cause?', [
        ['Recent flagged payments look like false positives until their fraud reports arrive', true],
        ['The model became far less precise, and an emergency retrain is the correct next step', false],
        ['Fraudsters changed tactics, so the model is now flagging many more good payments', false],
        ['The threshold drifted, because thresholds move as the score distribution changes', false],
      ], 'With immature labels, true frauds that were correctly flagged have no label yet and count against precision. Judge only mature weeks; a threshold is fixed config and cannot drift by itself.'),
      mcq('A retraining job trains the challenger on weeks 2–9 and evaluates both models on weeks 8–9. What is wrong?', [
        ['The challenger is evaluated on rows it trained on, so its score is inflated', true],
        ['Two weeks is too short a holdout for any fraud model to be compared fairly', false],
        ['The champion should be evaluated on its own training weeks for fairness', false],
        ['Nothing, as long as both models are scored with the same PR-AUC metric', false],
      ], 'Overlap between training and evaluation data favours the model that saw the rows. The holdout must follow both training windows. Using the same metric does not fix leakage, and scoring a model on its training data is worse still.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_PRACTICE',
    notes: `Work each one on paper first, then check the answer. Numbers are small on purpose.

## 1. A p95 from bucket deltas (easy)

Over five minutes the \`/predict\` bucket counters increased by: le=0.1 → 700, le=0.2 → 920, le=0.3 → 980,
le=+Inf → 1000. Estimate p95 the way \`histogram_quantile\` does.

**Answer.** Rank = 0.95 × 1000 = 950, which falls in the 0.2–0.3 bucket (920 below it, 980 at its top).
p95 ≈ 0.2 + 0.1 × (950 − 920) / (980 − 920) = 0.2 + 0.05 = **0.25 s**. Share within 0.3 s is exact:
980 / 1000 = 98%.

## 2. Write the error-ratio query (easy)

Write PromQL for the share of \`/predict\` requests returning 5xx over 5 minutes. If 30 of 2,400 requests in that
window failed, what does it return?

**Answer.**

    sum(rate(model_requests_total{endpoint="/predict", status=~"5.."}[5m]))
      / sum(rate(model_requests_total{endpoint="/predict"}[5m]))

The per-second rates share the same window, so the ratio is 30 / 2400 = **0.0125** (1.25%).

## 3. Count the series (medium)

A counter has labels endpoint (3 values), status (5) and model_version (2). A histogram with 8 finite buckets
has the label endpoint. How many series do they produce? What happens if someone adds customer_id with
50 lakh values to the histogram?

**Answer.** Counter: 3 × 5 × 2 = **30**. Histogram: per endpoint 9 bucket series (8 + Inf) + _sum + _count =
11, × 3 = **33**. With customer_id: 33 × 50,00,000 = **16.5 crore** series — Prometheus will not survive it.
Per-customer detail goes in logs or traces.

## 4. Correct for immature labels (medium)

From past data, 60% of frauds are reported within 7 days, 85% within 21 and 97% within 35. Last week's
transactions (7 days old) show a reported fraud rate of 0.20%. Estimate the eventual rate. Why is this only
a rough check?

**Answer.** 0.20% / 0.60 ≈ **0.33%**. Rough because the delay curve itself can change (a new scam may be
reported faster or slower), so use it to sanity-check proxies, never as the quality number.

## 5. A slice inside the total (medium)

Mature month, frauds caught / frauds: P2P 300/400, QR 140/200, collect 20/60. Last month collect was 40/60 and
the others identical. Compute overall recall both months.

**Answer.** Now (300 + 140 + 20) / 660 = **0.697**; last month 480 / 660 = **0.727**. Collect fell 33 points,
overall 3 — inside normal month-to-month noise for many teams' dashboards.

## 6. Promote or not? (medium)

Paired bootstrap of PR-AUC (challenger − champion) on the newest mature month: +0.012, 95% interval
[−0.004, +0.028]. Every slice's interval includes zero; the agreed non-inferiority margin is −0.01. What do you
decide?

**Answer.** Not shown better (the interval includes 0), but shown **not worse by more than the margin** (lower
bound −0.004 > −0.01). Promote only if it brings something else you want — fresher data before a known
seasonal shift, a removed broken feature — otherwise keep the champion and avoid churn.

## 7. Cost per request and per day (easy)

An LLM release averages 1,800 input and 250 output tokens per request. Prices: 2.0 units per million input
tokens and 8.0 per million output. Traffic is 3 lakh requests a day. Cost per request and per day?

**Answer.** (1,800 × 2.0 + 250 × 8.0) / 10⁶ = 5,600 / 10⁶ = **0.0056** units per request; × 3,00,000 =
**1,680 units a day**. Output is 12% of the tokens but 36% of the cost.

## 8. Which rollback? (medium)

For each, say what you roll back: (a) block rate triples right after a new model version is promoted;
(b) block rate triples after a feature-pipeline deploy, model unchanged; (c) an LLM assistant starts answering
in English to Hindi questions after a prompt release; (d) answers change overnight with no release of yours.

**Answer.** (a) Move the model alias back. (b) Roll back the feature (flag or pinned version) — an older model
would get the same bad input. (c) Move the release alias back to the previous release. (d) Pin the provider's
previous dated model, or switch to the fallback provider; confirm with the nightly eval run.

## 9. Which alert pages? (easy)

Classify as page, ticket or dashboard: p95 above SLO for 10 min; PSI 0.3 on amount; disk 85% and rising;
CPU 70%; no requests for 10 min; mature-week collect recall down 25 points.

**Answer.** Page: p95, no requests. Ticket: PSI (investigate), collect recall (owner investigates, maybe
retrain), disk at 85% and rising (a leading indicator — page only if it will fill tonight). Dashboard: CPU 70%.`,
    mcqs: [
      mcq('Bucket deltas over 5 minutes are le=0.1: 700, le=0.2: 920, le=0.3: 980, +Inf: 1000. What p95 does histogram_quantile estimate?', [
        ['0.25 s', true],
        ['0.30 s', false],
        ['0.20 s', false],
        ['0.95 s', false],
      ], 'Rank 950 lies in the 0.2–0.3 bucket; linear interpolation gives 0.2 + 0.1 × (950 − 920)/(980 − 920) = 0.25 s. 0.3 s is the bucket edge, 0.2 s the bucket below, and 0.95 confuses the quantile with a latency.'),
      mcq('Frauds caught per channel are P2P 300/400, QR 140/200 and collect 20/60. What is the overall recall?', [
        ['About 0.70', true],
        ['About 0.59', false],
        ['About 0.75', false],
        ['About 0.33', false],
      ], 'Overall recall pools the counts: (300 + 140 + 20)/(400 + 200 + 60) = 460/660 ≈ 0.70. Averaging the three slice recalls gives 0.59, which ignores slice sizes; 0.75 and 0.33 are single slices.'),
      mcq('A paired bootstrap gives challenger − champion PR-AUC of +0.012 with interval [−0.004, +0.028] and a non-inferiority margin of −0.01. What has been shown?', [
        ['Not worse beyond the margin, but not shown better', true],
        ['Clearly better, because the mean difference is positive', false],
        ['Clearly worse, because the interval dips below zero', false],
        ['Nothing, since bootstrap intervals cannot be compared', false],
      ], 'The interval includes zero, so improvement is unproven; its lower end is above −0.01, so a meaningful regression is ruled out at the agreed margin. A positive mean alone proves nothing.'),
      mcq('An LLM release averages 1,800 input and 250 output tokens; prices are 2.0 and 8.0 units per million. What does one request cost?', [
        ['0.0056 units', true],
        ['0.0041 units', false],
        ['0.0149 units', false],
        ['0.0164 units', false],
      ], '(1,800 × 2.0 + 250 × 8.0)/1,000,000 = (3,600 + 2,000)/1,000,000 = 0.0056. Pricing every token at the input rate gives 0.0041; swapping the two prices gives 0.0149; pricing every token at the output rate gives 0.0164.'),
      mcq('60% of frauds are reported within 7 days. A week-old cohort shows 0.20% reported fraud. What is a rough estimate of its eventual fraud rate?', [
        ['About 0.33%', true],
        ['About 0.20%', false],
        ['About 0.12%', false],
        ['About 0.80%', false],
      ], 'If 60% have arrived, eventual ≈ 0.20/0.60 ≈ 0.33%. Taking 0.20% as final ignores the delay; multiplying by 0.6 goes the wrong way; 0.80% has no basis. It is a sanity check only, since the delay curve can change.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_INTERVIEW_QUESTION',
    notes: `MLOps interviews at Indian fintechs, e-commerce and SaaS companies test monitoring with an open scenario.
They listen for three things: you separate **service health** from **model quality**, you know labels are
late and slices hide failures, and you never ship a model or prompt you have not compared. Answer aloud,
two minutes each.

## Q1. "Our UPI fraud model's labels arrive 30–60 days late. How would you monitor it?"

**Model answer.** "Three layers. First, service health in Prometheus: request rate, error ratio and p95
latency from a histogram, alerting on symptoms with a duration, plus a no-traffic alert. Second, daily
signals that need no labels: input quality checks, drift on the key features, and per-slice proxies — flag
rate and score distribution by channel, the manual-review confirmation rate, complaint rate. Third, real
quality on mature data only: once a week's label window has closed, recall and precision at the threshold and
PR-AUC, overall and per slice with denominators, compared with the last few mature weeks. I'd report label
completeness next to every number, because recent weeks always look too good on recall and too bad on
precision."

**Follow-up: "Overall recall is fine but one channel halved. What now?"** "Check the denominator first — is it
enough positives to trust? If yes, look at what changed for that channel: a new scam pattern, a product
change, a feature that is missing for it. Mitigate for that slice if the harm is large — a tighter threshold
or a rule for that channel — and start a retrain whose acceptance test includes that slice."

## Q2. "The p95 latency alert fires at 2am. Walk me through it."

**Model answer.** "I open the runbook from the alert. I confirm the symptom on the dashboard with a short
window — is it all endpoints or \`/predict\` only, all pods or one? Then I look at what changed: a release in
the last few hours (\`model_version\` label, deploy log), a dependency — the feature store histogram — or
traffic volume. If it is a release, roll back first and diagnose after. If it is a dependency, the fallback
should be serving; I check the \`source\` counts. Once it is stable I note the timeline for the review."

**Follow-up: "How did you choose the histogram buckets?"** "Around the SLO. If the SLO is 300 ms, there is a
bucket edge at 0.3 so the share of requests within SLO is exact, with a few edges either side for the
p50 and p99. Interpolated percentiles inside a wide bucket can be off by tens of milliseconds."

## Q3. "Do you retrain on a schedule or when drift is detected?"

**Model answer.** "Usually both, with a gate. A schedule gives fresh data and keeps the pipeline exercised so it
works when we need it. Triggers — a mature slice dropping, a big upstream change — start an extra run. But
neither path promotes automatically: the training data is validated first, then the challenger and champion
are scored on the same newest mature window that neither trained on, with a paired bootstrap interval on the
difference and a no-regression check per slice. Only then does the registry alias move, and it goes out as a
canary."

**Follow-up: "Drift fired but the challenger is no better. What do you do?"** "Keep the champion. Drift is a
question, not a verdict. Record that the shift happened and the model coped, and reset the drift reference if
the change is permanent so the alert does not fire forever."

## Q4. "What is different about running an LLM app versus a classic model?"

**Model answer.** "The release is a bundle — prompt, provider model, parameters, retrieval config, tools — and
it can change without retraining, sometimes without us, when the provider updates a model. There are rarely
labels, so quality comes from eval sets, judges checked against humans and user signals. Cost is per request
and moves with every prompt change. So I version the whole bundle with a hash, run the eval set per release
and nightly, tag every trace with the release id, and watch cost per request p50 and p95."

**Follow-up: "Cost tripled overnight with no release. Where do you look?"** "Split by release to confirm
nothing changed, then compare p50 with p95. If only the tail moved, find the most expensive traces — usually
long conversations or a retry loop."`,
    mcqs: [
      mcq('An interviewer asks how to monitor a fraud model with labels 30–60 days late. Which answer is strongest?', [
        ['Service health, label-free daily proxies per slice, and quality on mature weeks only', true],
        ['Daily AUC on yesterday\'s predictions, with retraining whenever it drops by a point', false],
        ['PSI on every feature daily, retraining automatically whenever any PSI is above 0.25', false],
        ['Latency and error rate only, because the model quality cannot be known until later', false],
      ], 'The strong answer layers service health, proxies that need no labels, and mature-label quality with slices. Yesterday\'s AUC has no labels, PSI-triggered auto-retraining ships untested models, and ignoring quality until labels arrive leaves weeks blind.'),
      mcq('In an interview, after drift fires you show the challenger is no better than the champion. What is the expected answer?', [
        ['Keep the champion, record the shift, and reset the drift reference if it is permanent', true],
        ['Promote the challenger anyway, since it was trained on data after the drift began', false],
        ['Retrain again with a larger model until the challenger finally beats the champion', false],
        ['Turn off the drift alert for that feature, since it fired without hurting the model', false],
      ], 'Drift that does not hurt performance is information, not a reason to swap models. Promoting an unproven model adds risk, retraining until something wins is overfitting the holdout, and muting the alert loses future signal.'),
      mcq('An interviewer asks how you chose histogram buckets for a 300 ms latency SLO. What is the best reply?', [
        ['An edge at 0.3 s for an exact SLO share, plus edges near p50 and p99', true],
        ['The library\'s default buckets, which already suit every model service', false],
        ['Ten equal-width buckets between zero and the slowest request seen so far', false],
        ['A single bucket at 0.3 s, since that is the only number the SLO needs', false],
      ], 'A boundary at the SLO makes the within-SLO share exact; extra edges keep the other percentiles reasonable. Defaults ignore your SLO, equal widths waste resolution, and one bucket makes every percentile meaningless.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'MLOPS_MONITORING_CHECKPOINT',
    notes: `Ten questions across the topic: service metrics and alerts, model quality with late labels and slices,
retraining against a champion, LLMOps releases and cost, and incidents. Answer without notes; each wrong
answer points to the lesson to revisit.`,
    checkpoint: [
      ck(OBS, 'Why is a model service\'s request latency recorded as a Prometheus histogram rather than as a gauge holding the average?', [
        ['Percentiles over any window can be computed from it and aggregated across pods', true],
        ['Histograms use less memory than gauges, because they store only a single number', false],
        ['Gauges cannot be scraped by Prometheus when labels are attached to them', false],
        ['An average gauge is exact, but it updates too slowly for the dashboards', false],
      ], 'Histogram buckets are counters that rate() and sum by (le) turn into percentiles for any window and any set of pods. An average hides the slow tail and cannot be combined correctly. Histograms store several series, and gauges scrape fine.'),
      ck(OBS, 'Which PromQL gives the 5-minute error ratio for /predict?', [
        ['sum(rate(model_requests_total{status=~"5.."}[5m])) / sum(rate(model_requests_total[5m]))', true],
        ['sum(model_requests_total{status=~"5.."}) / sum(model_requests_total) over the last 5m', false],
        ['rate(sum(model_requests_total{status=~"5.."})[5m]) / rate(sum(model_requests_total)[5m])', false],
      ], 'rate() must be applied to each counter series first, then summed; the ratio of the two rates is the error share in the window. Raw counter sums are cumulative since start, and rate() of a sum is invalid PromQL and mishandles counter resets.'),
      ck(MON, 'The weekly report shows fraud recall of 0.92 for last week against 0.70 for older weeks. What is the most likely reading?', [
        ['Last week\'s labels are immature, so few frauds are known yet to be missed', true],
        ['The model improved after recent traffic taught it the new fraud patterns', false],
        ['Fraud fell last week, so the remaining frauds were easier for it to catch', false],
        ['The threshold is now lower, which raised recall and lowered the precision', false],
      ], 'Frauds the model missed often arrive later as complaints; in a week-old cohort they are mostly unreported, so recall is inflated. A deployed model does not learn from traffic, and nothing says the threshold changed.'),
      ck(MON, 'Collect-request recall fell from 0.645 to 0.351 while overall recall rose slightly. What should the monitoring job have done?', [
        ['Report recall per fixed slice with denominators and flag the slice drop', true],
        ['Report only the overall recall, because slices are too noisy to be useful', false],
        ['Retrain overnight, since any recall drop in a slice proves concept drift', false],
        ['Raise the global threshold, since the overall recall rose and can afford it', false],
      ], 'A short fixed list of slices with their positive counts is exactly what catches a failure hidden in a weighted average. Slices with enough positives are informative; automatic retraining and global threshold moves are not monitoring actions.'),
      ck(MON, 'A retrained fraud challenger beats the champion overall with a 95% interval of [+0.085, +0.170] in PR-AUC, but QR\'s interval is [−0.082, +0.027]. What is the sound decision?', [
        ['Promote if the agreed per-slice margin allows the QR uncertainty, and canary it', true],
        ['Reject it outright, because any slice interval dipping below zero proves a regression', false],
        ['Promote it with no canary, since the overall interval is far above zero anyway', false],
        ['Ignore the QR slice, because the overall interval already includes that slice', false],
      ], 'An interval that includes zero is uncertainty, not proven regression; the agreed margin decides whether it is acceptable, and a canary watches it live. Skipping the slice check or the canary removes the safety net.'),
      ck(MON, 'A retraining pipeline should refuse to train when which of these is true?', [
        ['A feature\'s share of non-zero values is 0% where it was 5% every week before', true],
        ['The newest data is one week newer than the data the champion was trained on', false],
        ['The challenger uses the same hyperparameters as the current champion model', false],
        ['The training window overlaps the champion\'s training window by a few weeks', false],
      ], 'A feature suddenly all zeros is a pipeline bug; training on it teaches the model to ignore that feature, and offline metrics may not show it. Fresh data, unchanged hyperparameters and overlapping training windows are normal.'),
      ck(EVAL, 'An LLM release registry hashes prompt text, model, parameters and retrieval settings into one id. What does that make possible?', [
        ['Tying each trace, eval result and cost line to exactly what produced it', true],
        ['Running prompt changes in production with no evaluation being necessary', false],
        ['Guaranteeing that the provider never changes the model behind the name', false],
        ['Caching every answer forever, since a release id never needs to expire', false],
      ], 'One content-hashed id lets you compare releases, attribute regressions and roll back precisely. It does not replace evaluation, cannot stop provider changes, and caches still need expiry when underlying documents change.'),
      ck(EVAL, 'An LLM app\'s release changed the prompt, the model and the retrieval top_k at once, and one previously correct answer broke. What is the lesson for the next release?', [
        ['Change and evaluate one part at a time, or at least compare each part\'s effect', true],
        ['Never change the model and the prompt in the same quarter of the year at all', false],
        ['Always increase top_k with every release, since more context is always safer', false],
        ['Drop the case from the eval set, since a single case is too small to matter', false],
      ], 'Bundled changes make a regression hard to attribute; isolating them (or ablating) shows which part caused it. A blanket calendar rule is arbitrary, larger top_k costs tokens and can add noise, and deleting failing cases hides regressions.'),
      ck(MON, 'An LLM assistant\'s cost per request p95 tripled while p50 stayed flat and no release went out. Where should the investigation start?', [
        ['The most expensive traces, to see which kind of request grew', true],
        ['The provider\'s price page, since prices must have increased', false],
        ['The prompt file, since the system prompt must have got longer', false],
        ['The cache hit rate, since a cold cache raises every request', false],
      ], 'A tail moving alone means a subset of requests became expensive — long conversations, retries, huge documents. Price, prompt length and cache changes would move the median as well.'),
      ck(MON, 'During an incident, merchant payments are blocked after a feature-pipeline change; the model is unchanged. What is the first action?', [
        ['Roll back the feature change or flip the kill switch, then diagnose', true],
        ['Roll back the model, since the decisions it makes are now wrong', false],
        ['Write the post-incident review while the facts are still fresh', false],
        ['Retrain the model on today\'s data so it learns the new feature', false],
      ], 'Stop the harm first, at the layer that changed: the feature (or route around the model with the kill switch). An older model gets the same bad input, the review comes after, and retraining on a broken feature bakes the bug in.'),
    ],
  },
];
