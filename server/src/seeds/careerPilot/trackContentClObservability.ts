/**
 * Career-track content: Observability and SRE (CL_OBSERVABILITY_SRE), Cloud & DevOps Engineer, batch CL3.
 *
 * Operating what the earlier topics shipped: the three signals and how to instrument a service (structured logs,
 * RED and USE, cardinality, OpenTelemetry in outline); CloudWatch metrics, Logs Insights, alarms and dashboards;
 * Prometheus, Alertmanager and Grafana on Kubernetes; SLIs, SLOs, error budgets and multiwindow burn-rate alerts;
 * on-call, incident roles and blameless postmortems; and the reliability patterns and capacity maths that keep a
 * service inside its SLO on a sale day. It builds on Year 3's "What Is Worth Logging", "Knowing Before a User Tells
 * You" and "Monitoring the Few Things That Matter" (the four signals, symptom alerts, thresholds from history,
 * runbooks), on CL2's "Packaging, Deploying and Testing Serverless Apps", "Probes, Resources, Autoscaling and
 * Rollouts" and "Release Strategies", and — for students who took it — the MLOps track's "Service Metrics:
 * Prometheus and Grafana"; all are referred to by title, not re-taught. Azure Monitor is named in a line;
 * CL_AZURE teaches it.
 *
 * One fictional company runs through the topic: PaySetu, a Bengaluru fintech whose payments-api takes UPI collect
 * requests from merchants, calls a payment service provider (PSP) and pays merchants out, in AWS Mumbai
 * (ap-south-1). Verified by running, in Python with prometheus_client 0.26, opentelemetry-sdk 1.45, boto3 1.43 and
 * moto 5.2: the structured log line and spans sharing a trace id, the exposition format, the series counts, the
 * counter-reset arithmetic, the CloudWatch metric, alarm, log-group, metric-filter and dashboard calls (moto does
 * not implement composite alarms, alarm history or JSON filter patterns, and does not evaluate alarms — those are
 * written from the documentation and the notes say so), the error-budget and burn-rate arithmetic and a 30-day
 * minute-level simulation of three alerting rules, the retry, jitter and circuit-breaker simulations, and the
 * capacity maths. Prometheus rules, Alertmanager config and the ServiceMonitor were parsed with PyYAML only.
 * PromQL, Logs Insights queries, Grafana, X-Ray and all CLI commands were written from the documentation and NOT
 * run. No prices: the notes describe each pricing model.
 *
 * Skills: OBSERVABILITY by default; the SLO lesson is SLI_SLO, the incidents lesson INCIDENT_MANAGEMENT and the
 * reliability lesson RELIABILITY_PATTERNS (trackSkillAttribution). Checkpoint questions plainly about another of
 * the topic's skills — including CAPACITY_PLANNING — use ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CL_OBSERVABILITY_SRE_BUNDLES: PilotBundle[] = [
  /* ── THREE_SIGNALS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_THREE_SIGNALS',
    notes: `PaySetu (fictional) is a Bengaluru fintech. Its **payments-api** takes UPI collect requests from 40,000 merchants,
calls a payment service provider (PSP), records the result in PostgreSQL, and a **payouts** worker settles money to
merchants every few minutes. It runs in AWS Mumbai (ap-south-1). Year 3's "What Is Worth Logging" and "Knowing
Before a User Tells You" gave you the four signals and the 3am test for a log line. This lesson is how an engineer
**instruments** a service so that a question nobody predicted can still be answered from the outside.

## Monitoring versus observability

Monitoring answers questions you thought of in advance: "is the error rate above 2%?". Observability is being able
to answer the ones you did not: "why are payments from one bank slow only for amounts above ₹10,000?" — without
shipping new code to find out. You get there by emitting three kinds of signal, each good at a different question.

    Signal    Answers                                 Shape                    Cost driver
    Metrics   Is something wrong? How much? Trend?   Numbers over time        number of series
    Logs      What exactly happened to this event?   One record per event     GB ingested and kept
    Traces    Where did the time go, across services? A tree of timed spans   spans kept (sampling)

Metrics are cheap to keep and fast to query, so they drive dashboards and alerts. Logs carry detail, so they
explain. Traces connect one request's work across payments-api, the PSP call and the database. An engineer who
only has logs greps for hours; one who only has metrics knows something is wrong but not what.

## Structured logs that join up

A log line is for a machine first. Emit one JSON object per event, with fixed field names, and put the **trace
id** in it so the log and the trace can be joined. This is real output from a Python logging formatter that reads
the current OpenTelemetry span:

    {"ts": "2026-10-27T15:52:57", "level": "WARNING", "msg": "psp call failed",
     "service": "payments-api", "trace_id": "21ebcbec186e584252fc392b80739b6f",
     "route": "/v1/payments", "status": 502, "merchant_id": "m_7781",
     "amount_paise": 49900, "psp": "psp-a", "duration_ms": 34}

- **Fields, not sentences.** status is a number you can filter on (status >= 500); "Payment failed with 502 from
  psp-a" is a string you can only search.
- **Identifiers belong in logs.** merchant_id and trace_id are fine here — each line is one event.
- **Never log what you must not keep.** Full VPAs, phone numbers, card numbers, OTPs and tokens stay out, or are
  masked. Under the DPDP Act personal data in logs is still personal data, and logs are copied to many places.
- **Levels mean something.** ERROR is "a human may need to act", WARNING "degraded but handled", INFO the
  boundaries (request in, call out), DEBUG off in production.

## RED for services, USE for resources

The four golden signals (latency, traffic, errors, saturation) are the summary. Two checklists make them concrete:

- **RED** — for anything that serves requests: **R**ate (requests per second), **E**rrors (failed requests per
  second, read as a ratio), **D**uration (a latency distribution, read as percentiles). One row of three panels per
  route of payments-api.
- **USE** — for every resource: **U**tilisation (busy share of time), **S**aturation (work waiting: queue depth,
  run queue, connection-pool waiters), **E**rrors (device or resource errors). Apply it to CPU, memory, disks, the
  DB connection pool, the payouts queue.

RED tells you users are hurting; USE tells you which resource is the cause.

## Cardinality: the bill you do not see coming

Every unique combination of metric name and label values is a separate **time series**, and series are what a
metrics system stores, indexes and charges for. payments-api counts requests by route, method and status code
on six pods:

    counter series: 1728                          (12 routes x 3 methods x 8 codes x 6 pods)
    histogram series: 576                         (12 routes x 6 pods x (6 buckets + _sum + _count))
    with merchant_id (40,000 merchants): 69120000

One innocent label — merchant_id — multiplies the counter by 40,000. Labels must be small, bounded sets (route
template, not the raw path with a payment id in it; status code; region). High-cardinality detail goes in logs and
traces, where one record per event is the normal cost. The same rule applies to CloudWatch, where each unique
combination of dimensions is a separately billed custom metric.

## Traces and OpenTelemetry in outline

A **trace** is one request's journey; each unit of work is a **span** with a start, a duration, attributes and a
parent. These spans were produced by the OpenTelemetry Python SDK for one payment:

    span db.insert payments           trace=21ebcbec.. parent=0996df..
    span POST psp.example/collect     trace=21ebcbec.. parent=0996df..
    span POST /v1/payments            trace=21ebcbec.. parent=-..

All three share the trace id that appears in the log line above; the two children point at the root span. Child
spans finish (and are exported) first.

**OpenTelemetry (OTel)** is the vendor-neutral standard for producing all three signals:

- an **API** your code (or a library's auto-instrumentation) calls, and an **SDK** that samples, batches and
  exports;
- **context propagation**: the W3C traceparent HTTP header carries the trace id to the next service, so the PSP
  adapter's spans join the same trace;
- the **Collector**, a separate process or sidecar that receives OTLP, filters, samples and forwards to one or
  more back ends — AWS X-Ray and CloudWatch (via the AWS Distro for OpenTelemetry), Prometheus, or a vendor;
- **resource attributes** such as service.name and deployment.environment on every signal.

Instrument once with OTel and the back end becomes a configuration choice. **Sampling** keeps tracing affordable:
head sampling decides at the start (keep 5% of requests), tail sampling decides after the trace finishes (keep
every error and every slow trace, plus a few healthy ones) — better evidence, but the Collector must hold whole
traces in memory to decide.

## What it costs

Logs are billed by volume ingested and stored, metrics by series (or custom metrics), traces by spans recorded or
scanned. A DEBUG log left on, a label with an id in it, or 100% trace sampling on a busy API are the three usual
surprises. Set log retention, review label sets in code review, and sample. Check each service's pricing page.
(The log line, spans and series counts above were produced in Python; no back end was involved.)`,
    workedExample: `**Scenario.** Merchants complain that "some UPI payments take eight seconds". The overall p99 latency
panel for payments-api looks normal. Find the cause using the three signals in the right order.

**1. Metrics: is it real, and where?** Split the duration histogram by route. /v1/payments p99 has risen from
0.9 s to 7.8 s since 14:10 IST; the other eleven routes are flat, which is why the all-routes p99 hid it. Rate is
normal and the error ratio is unchanged, so requests are slow, not failing. USE on the resources: CPU 35%, the DB
pool has no waiters — the service is not short of anything.

**2. Traces: where does the time go?** Filter traces for route /v1/payments with duration above 5 s. Every slow
trace has the same shape: db.insert takes 4 ms, and the span POST psp.example/collect takes about 7.5 s, made of
three child attempts — 2.5 s, 2.5 s and a quick success. The PSP is timing out and payments-api is retrying.

**3. Logs: the detail.** Take one slow trace id and query the logs for it. The warning lines show psp: "psp-a",
"timeout after 2500 ms", and the merchant ids are spread across all banks — so it is not one bank, it is the PSP
endpoint.

**4. Act on the evidence.** Tell the PSP's support desk (with timestamps and trace ids), and in the meantime route
new collect requests to the second PSP the contract allows. p99 falls back within minutes.

**5. Close the gap.** Add a histogram psp_call_duration_seconds labelled by psp (two values, bounded) and an alert
on its p99, so next time the dependency is named by a metric, not discovered by merchants.

**What made it fast:** a per-route metric that localised the problem, a trace that showed the retries, and a log
line that could be joined to that trace by its id.`,
    mcqs: [
      mcq('PaySetu wants a payments-api counter labelled by merchant_id so support can see each merchant\'s failures. With 40,000 merchants, what should the engineer propose instead?', [
        ['Keep merchant_id in structured logs and query failures per merchant there', true],
        ['Add merchant_id as a label but scrape the counter only once every five minutes', false],
        ['Add merchant_id as a label and drop the route label to keep the total series level', false],
        ['Store merchant_id as a histogram bucket boundary so it adds no new series at all', false],
      ], 'Each merchant would become its own series (tens of millions with the other labels), whatever the scrape interval. Dropping route loses a bounded, useful label to make room for an unbounded one. Per-event identifiers belong in logs (or traces), which are priced per event. Buckets are numeric thresholds, not identifiers.'),
      mcq('Which pairing of method and target is right for PaySetu\'s on-call dashboard?', [
        ['RED for payments-api\'s routes, USE for its DB connection pool', true],
        ['USE for payments-api\'s routes, RED for its DB connection pool', false],
        ['RED for both, since every component of the system serves requests', false],
        ['USE for both, since utilisation explains every user-facing symptom', false],
      ], 'RED (rate, errors, duration) describes request-serving things as users see them; USE (utilisation, saturation, errors) describes resources such as a connection pool, where waiters are the saturation signal. Mixing them up gives panels that answer the wrong question.'),
      mcq('A log line and a trace span for the same slow payment need to be joined during an incident. What makes that possible?', [
        ['The log line includes the trace id of the span that was active', true],
        ['Both are written to the same CloudWatch log group at the same time', false],
        ['The log line and span carry the same timestamp to the millisecond', false],
        ['The trace exporter copies every log line into the span\'s attributes', false],
      ], 'Correlation needs a shared identifier: putting the active trace id in each structured log line lets you go from a trace to its logs and back. Storage location and timestamps do not identify a request — many run at the same instant — and exporters do not copy logs into spans.'),
    ],
    checkpoint: [
      mcq('Which question is a trace best placed to answer for PaySetu?', [
        ['Which call inside one slow payment took most of its time', true],
        ['How many payments failed in the last hour across all banks', false],
        ['Whether the payouts queue has been growing for three days', false],
        ['What an individual merchant typed into the payment request', false],
      ], 'A trace is a tree of timed spans for one request, so it shows where that request spent its time. Counts over an hour and multi-day trends are metrics questions, and request contents are recorded (masked where needed) in logs.'),
      mcq('An engineer adds the raw request path, such as /v1/payments/pay_8Hx2Qm, as a metric label. What happens next?', [
        ['Each payment id creates a new series, and the metrics store grows without bound', true],
        ['The metric is rejected at once, because label values may not contain slashes', false],
        ['Nothing changes, because the metrics system merges similar paths on its own', false],
        ['Latency gets more accurate, since each payment now has its own percentile', false],
      ], 'Unbounded label values are a cardinality explosion: every id is a new series to store and index. Slashes are legal in label values and nothing merges paths automatically; use the route template (/v1/payments/{id}) as the label instead.'),
      mcq('What does OpenTelemetry\'s Collector add when services already use the OTel SDK?', [
        ['A place to batch, sample and route signals to one or more back ends', true],
        ['The trace id generation, which the SDK cannot do inside a process', false],
        ['A database that stores traces for the long term and serves queries', false],
        ['Automatic metric labels for every merchant, user and payment id seen', false],
      ], 'The Collector receives OTLP and processes and exports it — tail sampling, filtering, sending to X-Ray, Prometheus or a vendor — so back ends change by configuration. The SDK generates ids itself, the Collector is not a storage back end, and adding id labels would be a cardinality mistake.'),
    ],
  },

  /* ── CLOUDWATCH ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_CLOUDWATCH',
    notes: `PaySetu's payments-api runs on ECS Fargate behind an ALB, with RDS PostgreSQL and an SQS queue for payouts. Every one
of those services already sends numbers to **Amazon CloudWatch**; the job is to add what is missing, keep the
logs searchable and affordable, and alarm on what users feel. CL2's "Packaging, Deploying and Testing Serverless
Apps" listed the Lambda and SQS metrics to watch; this lesson is CloudWatch itself.

## Metrics: what identifies one

A metric is a **namespace** (AWS/ApplicationELB, AWS/RDS, or your own such as PaySetu/Payments), a **name**, and
a set of **dimensions** (name/value pairs). All three together identify it: PaymentsFailed with Service=
payments-api is a different metric from PaymentsFailed with no dimensions, and asking for one returns nothing from
the other. Every query and alarm must repeat the dimensions exactly — the commonest reason an alarm sits in
INSUFFICIENT_DATA for ever.

Data points have a **resolution** (standard, one minute; high resolution, down to one second), and queries ask for
a **statistic** over a **period**: Sum, Average, Minimum, Maximum, SampleCount or a percentile such as p99.

Built-in metrics worth knowing: the ALB's RequestCount, TargetResponseTime and HTTPCode_Target_5XX_Count; RDS
CPUUtilization, DatabaseConnections and FreeStorageSpace; SQS ApproximateAgeOfOldestMessage; ECS service CPU and
memory utilisation. EC2 does **not** report memory or disk use by itself — that needs the **CloudWatch agent**.

## Custom metrics

The business numbers only your code knows. This ran against moto (mock AWS):

    cw.put_metric_data(Namespace="PaySetu/Payments", MetricData=[
        {"MetricName": "PaymentsFailed",
         "Dimensions": [{"Name": "Service", "Value": "payments-api"}],
         "Timestamp": ts, "Value": 3, "Unit": "Count"}, ...])

    metrics: ['PaymentsFailed', 'PaymentsTotal']
    5-min period sum 15.0 max 3.0
    5-min period sum 126.0 max 40.0

Ten one-minute points (3 failures a minute, then 40 a minute for the last three) read back with Period=300: the
second five minutes shows the jump. Calling the API for every request is slow and costly; for high volume use the
**Embedded Metric Format (EMF)** — a JSON log line with a _aws block that CloudWatch Logs turns into metrics
asynchronously. Powertools for AWS Lambda writes EMF for you. Custom metrics are billed per metric (each unique
dimension combination), so the cardinality rule from "Logs, Metrics and Traces" applies with a price tag.

## Logs

Logs live in **log groups** (one per service: /paysetu/payments-api) made of **log streams** (one per task or
instance). The ECS awslogs driver and Lambda create them for you. Two settings to make on day one:

    logs.put_retention_policy(logGroupName="/paysetu/payments-api", retentionInDays=30)
    log group /paysetu/payments-api retention 30

The default is **never expire**, and storage is billed per GB-month. A **metric filter** turns matching log lines
into a metric you can alarm on:

    filterPattern='{ $.status >= 500 }'   ->  PaySetu/Payments PspErrors, value 1

The { $.field ... } syntax matches JSON fields — another reason to log JSON. (moto stored the filter but does not
evaluate JSON patterns; the pattern is from the documentation.) **Subscription filters** stream a log group to
Lambda, Kinesis Data Firehose or OpenSearch for longer-term or cheaper storage.

**Logs Insights** is the query language for investigating. Written from the documentation, not run:

    fields @timestamp, route, status, duration_ms, psp
    | filter route = "/v1/payments" and status >= 500
    | stats count(*) as failures by psp, bin(5m)
    | sort failures desc

    stats pct(duration_ms, 99) as p99 by route

JSON fields are discovered automatically. Insights is billed by data scanned, so always narrow the time range and
the log groups before running a query.

## Alarms

An alarm watches one metric (or a metric-math expression) and has three states: **OK**, **ALARM** and
**INSUFFICIENT_DATA**. Its parts:

- **Period** and **statistic** — each data point it evaluates (Sum over 60 s).
- **EvaluationPeriods** and **DatapointsToAlarm** — "3 out of 5" fires when three of the last five points breach,
  which ignores a single spike without waiting for five in a row.
- **TreatMissingData** — notBreaching, breaching, ignore or missing. A count metric that is simply absent when
  nothing failed should be notBreaching; a heartbeat that stops arriving should be breaching.
- **Actions** — usually an SNS topic that pages and posts to chat, on ALARM and on OK.

Alarm on the **error ratio**, not the error count, with metric math. This alarm was created in moto:

    Metrics=[{"Id": "failed", "MetricStat": {...PaymentsFailed, "Period": 60, "Stat": "Sum"}, "ReturnData": False},
             {"Id": "total",  "MetricStat": {...PaymentsTotal,  "Period": 60, "Stat": "Sum"}, "ReturnData": False},
             {"Id": "error_pct", "Expression": "100 * failed / total", "ReturnData": True}],
    Threshold=2.0, ComparisonOperator="GreaterThanThreshold", EvaluationPeriods=5, DatapointsToAlarm=3

    metric alarm payments-error-rate-high OK 3 of 5
    after set_alarm_state: ALARM - test the paging path

set_alarm_state forces a state temporarily so you can **test the paging path** before a real incident does (the
next evaluation puts it back). Moto does not evaluate alarms; in real CloudWatch a new alarm starts in
INSUFFICIENT_DATA until it has data.

- **Percentile alarms** use an extended statistic (p99 of the ALB's TargetResponseTime).
- **Anomaly detection** alarms learn a band from history — useful for traffic, which has a daily shape.
- **Composite alarms** combine alarms with a rule such as ALARM("payments-error-rate-high") OR
  ALARM("payments-p99-latency-high"), and page once instead of twice; the component alarms then notify nobody.
  (Moto does not implement composite alarms; written from the documentation.)

## Dashboards and X-Ray in outline

A dashboard is a JSON document (put_dashboard; moto listed ['paysetu-payments']). Keep it in Git with the alarms.
Top row: the RED panels for the main routes; below: USE for the pool, queue and database; one text widget linking
the runbook.

**AWS X-Ray** records traces: a **segment** per service, **subsegments** for calls to DynamoDB, SQS or an HTTP
endpoint, the X-Amzn-Trace-Id header carrying context, and a map of services with their latency and errors. The
default sampling rule records the first request each second and five per cent of the rest. New instrumentation
should use OpenTelemetry with the AWS Distro for OpenTelemetry (ADOT), which exports to X-Ray.

Azure's equivalent is Azure Monitor with Log Analytics (queried in KQL) and Application Insights; CL_AZURE covers
them. Pricing: custom metrics, API requests, log ingestion and storage, Insights scans, alarms and dashboards are
each billed — read the CloudWatch pricing page, and keep a budget alarm on.`,
    workedExample: `**Scenario.** PaySetu's only alarm is "ECS CPU above 80%". Last Saturday the PSP returned errors for 25
minutes while CPU sat at 30%, and merchants found out first. Replace it with alarms that page for user impact.

**1. Choose the signals.** Users feel failed payments and slow payments. The ALB already reports
HTTPCode_Target_5XX_Count, RequestCount and TargetResponseTime; payments-api also publishes PaymentsFailed and
PaymentsTotal (via EMF), which count a PSP decline returned as HTTP 200 with status "failed" — something the ALB
cannot see.

**2. Error ratio alarm.** Metric math 100 × failed ÷ total over 60-second periods, threshold 2%, 3 of 5 data
points, TreatMissingData notBreaching. A night with 40 requests and 2 failures is 5% — so add a guard: alarm only
when total exceeds 200 per minute (an expression such as IF(total > 200, 100*failed/total, 0)), and leave low-
traffic hours to a slower ticket alarm.

**3. Latency alarm.** p99 of TargetResponseTime above 1.5 s, 3 of 5 minutes.

**4. One page, not two.** A composite alarm "payments-user-impact" = error alarm OR latency alarm pages the
on-call through SNS; the two component alarms have no actions of their own.

**5. Keep CPU, demote it.** CPU becomes a dashboard panel and, at a sustained 85%, a ticket — a cause, not a
symptom.

**6. Test the path.** set_alarm_state to ALARM on the error alarm; the composite goes to ALARM and the phone
rings; on the next evaluation everything returns to OK. Record that the test was done.

**Result.** Replaying last Saturday's metrics, the error ratio crossed 2% four minutes after the PSP started
failing; the composite would have paged at minute seven, eighteen minutes before the first merchant e-mail.`,
    mcqs: [
      mcq('An alarm on PaySetu/Payments PaymentsFailed has stayed in INSUFFICIENT_DATA for a week, although the graph in the console shows data. The code publishes the metric with Service=payments-api. What is the likely fault?', [
        ['The alarm names the metric without the Service dimension', true],
        ['The alarm period is shorter than the metric\'s resolution', false],
        ['TreatMissingData is set to notBreaching instead of breaching', false],
        ['Custom metrics cannot be used by alarms until a day has passed', false],
      ], 'A metric is identified by namespace, name and all dimensions, so an alarm without Service=payments-api watches a different, empty metric. A period mismatch would still produce data, TreatMissingData changes how gaps are judged rather than causing permanent INSUFFICIENT_DATA, and custom metrics are usable at once.'),
      mcq('PaySetu wants to know which PSP caused most failures in five-minute buckets yesterday afternoon. Which tool fits?', [
        ['A Logs Insights query with stats count(*) by psp and bin(5m)', true],
        ['A metric filter created now, then graphed over yesterday\'s data', false],
        ['An anomaly detection alarm on the PaymentsFailed custom metric', false],
        ['X-Ray sampling rules set to keep every trace for that afternoon', false],
      ], 'Logs Insights queries the stored log lines after the fact and can group by any field. A metric filter only counts lines ingested after it is created, an alarm does not answer a historical breakdown, and sampling rules cannot go back in time.'),
      mcq('Why does PaySetu set an alarm to "3 out of 5" data points rather than "1 out of 1"?', [
        ['It ignores a single noisy minute but still fires within a few minutes', true],
        ['It makes the alarm cheaper, because only three points are evaluated', false],
        ['It is required for any alarm that publishes to an SNS topic as action', false],
        ['It keeps the alarm in ALARM for five periods after the problem clears', false],
      ], 'M out of N tolerates an isolated spike without waiting for N breaches in a row. It does not change the alarm\'s price, it is not an SNS requirement, and recovery is judged on the same evaluation window rather than holding ALARM artificially.'),
    ],
    checkpoint: [
      mcq('An engineer wants an alarm on memory use for PaySetu\'s EC2 batch hosts, but there is no memory metric in AWS/EC2. What is needed?', [
        ['The CloudWatch agent on the instances, which publishes memory', true],
        ['Detailed monitoring on the instances, which adds memory metrics', false],
        ['A metric filter on the instances\' system logs for memory lines', false],
        ['An anomaly detection band on the CPUUtilization metric instead', false],
      ], 'The hypervisor cannot see memory inside the guest, so EC2 does not report it; the CloudWatch agent collects it from the OS. Detailed monitoring only makes the existing metrics one-minute, a metric filter needs lines that report memory, and CPU says nothing reliable about memory.'),
      mcq('A log group created by ECS for payments-api has grown for two years and is a large line on the bill. What is the first change?', [
        ['Set a retention period, since the default is to keep logs forever', true],
        ['Delete the log streams of tasks that have stopped since last week', false],
        ['Lower the log level to ERROR so that new lines cost nothing at all', false],
        ['Turn on Logs Insights so the group is compressed when it is queried', false],
      ], 'New log groups never expire by default, so storage grows without limit; a retention policy fixes it going forward. Deleting stream by stream is manual and partial, ERROR-only logging still costs and loses useful detail, and Insights queries do not compress storage.'),
      mcq('PaySetu has separate CloudWatch alarms for error ratio and p99 latency, and an incident that breaches both sends two pages. What reduces this to one page without losing either signal?', [
        ['A composite alarm on "error OR latency" with the actions, components silent', true],
        ['Raising both thresholds so only one of the two alarms can breach at a time', false],
        ['Changing both alarms to TreatMissingData breaching so their states align', false],
        ['Deleting the latency alarm, because errors and latency always rise together', false],
      ], 'A composite alarm pages once when either condition holds, while the component alarms keep their state for diagnosis. Raising thresholds hides real incidents, TreatMissingData does not merge alarms, and slow-but-successful incidents exist, so latency must stay.'),
    ],
  },

  /* ── PROMETHEUS_GRAFANA ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_PROMETHEUS_GRAFANA',
    notes: `PaySetu is moving payments-api and the payouts worker to EKS (CL2's "Amazon EKS"). CloudWatch still watches the ALB,
RDS and SQS, but inside the cluster the standard is **Prometheus** for metrics and **Grafana** for dashboards. If
you took the MLOps track, "Service Metrics: Prometheus and Grafana" showed how one service exposes /metrics and how
histogram_quantile reads its buckets; this lesson is running Prometheus for a whole cluster and writing the
queries, rules and routing an on-call engineer depends on.

## How it fits together

- Prometheus **pulls**: every scrape interval (15–30 s) it fetches /metrics from each **target** and stores every
  sample as a time series. A target that cannot be scraped gets up == 0, which is itself a signal.
- On Kubernetes, targets are found by **service discovery** against the API server, not listed by hand.
- **Exporters** expose metrics for things you cannot change: **node-exporter** (node CPU, memory, disk),
  **kube-state-metrics** (object state: replicas, restarts, Pod phases, requests and limits), the kubelet's
  **cAdvisor** (per-container CPU, memory, throttling), and the **blackbox exporter** (probes an endpoint).
- **Rules** are evaluated by Prometheus on a schedule; firing alerts go to **Alertmanager**, which groups, routes,
  silences and sends them.
- **Grafana** queries Prometheus (and CloudWatch, and logs) and draws dashboards.

The usual install is the **kube-prometheus-stack** Helm chart: the Prometheus Operator, Prometheus, Alertmanager,
Grafana, node-exporter, kube-state-metrics and a set of default rules and dashboards. The operator adds custom
resources, so scrape targets are declared as objects (parsed with PyYAML; apiVersion and fields from the operator's
documentation):

    apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: payments-api
      namespace: payments
      labels:
        release: kube-prometheus-stack
    spec:
      selector:
        matchLabels:
          app: payments-api
      endpoints:
        - port: http
          path: /metrics
          interval: 30s

Two things must match or nothing is scraped and nothing errors: the **release** label must match the Prometheus
object's serviceMonitorSelector (by default the chart's own release name), and **port** names a *named* Service
port. Amazon Managed Service for Prometheus and Amazon Managed Grafana are the managed alternatives.

## The exposition format, three types

Real prometheus_client output (HELP lines and _created samples removed):

    # TYPE payout_queue_depth gauge
    payout_queue_depth{bank="bank-a"} 42.0
    # TYPE psp_call_seconds summary
    psp_call_seconds_count 2.0
    psp_call_seconds_sum 0.6000000000000001
    # TYPE psp_call_duration_seconds histogram
    psp_call_duration_seconds_bucket{le="0.25"} 1.0
    psp_call_duration_seconds_bucket{le="0.5"} 2.0
    psp_call_duration_seconds_bucket{le="1.0"} 2.0
    psp_call_duration_seconds_bucket{le="+Inf"} 2.0
    psp_call_duration_seconds_count 2.0
    psp_call_duration_seconds_sum 0.6000000000000001

A gauge goes up and down. The Python client's **summary** exports only a count and a sum — no quantiles — and
quantiles from summaries in other clients cannot be added across Pods anyway. Use **histograms** for latency;
their buckets add up across Pods.

## PromQL you will write every week

PromQL was written from the documentation; no Prometheus server was run.

    up{job="payments-api"}                                   # instant vector: one value per target
    http_requests_total{job="payments-api", code=~"5.."}[5m]  # range vector: 5 minutes of samples

Counters only go up, so you almost never graph them raw. **rate()** gives per-second increase over a window,
**increase()** the total increase, **irate()** uses only the last two samples (twitchy; avoid in alerts). All three
handle **counter resets** when a Pod restarts. Real arithmetic for samples 1000, 1150, 1300, 40, 190 taken every 15
seconds, with a restart between the third and fourth:

    naive last-first: -810  reset-aware increase: 490  per-second: 8.166666666666666

Prometheus treats a drop as a reset and counts the new value from zero. This is also why the rule is **rate, then
sum** — sum(rate(x[5m])), never rate(sum(x)[5m:]): when an old Pod's counter leaves the sum, the total falls, and
rate() treats that fall as a reset and spikes.

Queries for the cluster:

    # containers restarting
    increase(kube_pod_container_status_restarts_total{namespace="payments"}[1h]) > 3

    # memory use against the limit, per Pod
    sum by (pod) (container_memory_working_set_bytes{namespace="payments", container!=""})
      / sum by (pod) (kube_pod_container_resource_limits{namespace="payments", resource="memory"})

    # share of CPU periods throttled by the CPU limit
    sum by (pod) (rate(container_cpu_cfs_throttled_periods_total{namespace="payments"}[5m]))
      / sum by (pod) (rate(container_cpu_cfs_periods_total{namespace="payments"}[5m]))

    # a target that has vanished from discovery entirely
    absent(up{job="payments-api"})

Compare working_set, the figure eviction decisions use. Division matches series by labels, hence sum by (pod)
on both sides.

## Recording and alerting rules

    groups:
      - name: payments-api.rules
        interval: 30s
        rules:
          - record: route_code:http_requests:rate5m
            expr: sum by (route, code) (rate(http_requests_total{job="payments-api"}[5m]))
          - alert: PaymentsApiDown
            expr: up{job="payments-api"} == 0
            for: 2m
            labels: {severity: page}
            annotations:
              summary: "payments-api target {{ $labels.instance }} is not being scraped"
              runbook_url: "https://wiki.paysetu.example/runbooks/payments-api#down"
          - alert: PayoutQueueBacklog
            expr: max(payout_queue_depth) > 5000 and deriv(payout_queue_depth[15m]) > 0
            for: 15m
            labels: {severity: ticket}

**Recording rules** precompute expressions (named level:metric:operations) so panels and alerts share one
number. **for** keeps an alert pending until the condition has held that long. Alertmanager routes on **severity**.

## Alertmanager: routing, grouping, silencing

    route:
      receiver: team-tickets
      group_by: [alertname, service]
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
        - matchers: ['severity="page"']
          receiver: oncall-pager
          repeat_interval: 1h

Alerts sharing alertname and service arrive as **one** notification; pages go to the pager, the rest to the team
channel; **inhibition** mutes dependent alerts while a root alert fires; **silences** mute planned noise, always
with an expiry and a comment. Receiver keys and webhook URLs are secrets; keep them out of Git.

## Grafana dashboards that get used

One dashboard per service: RED panels from the recording rules on top, USE panels for the Pods (memory against
limit, throttling, restarts) below, then dependencies. Use **variables** (label_values(kube_pod_info, namespace))
instead of copied dashboards, and keep the JSON in Git, loaded by provisioning (the chart's sidecar picks up
ConfigMaps labelled grafana_dashboard: "1") so a rebuild loses nothing. Azure's managed equivalents are Azure
Monitor managed service for Prometheus and Azure Managed Grafana.

Cost: in-cluster Prometheus uses node memory and an EBS volume that grow with series count.`,
    workedExample: `**Scenario.** After the move to EKS, the payouts worker sometimes stalls for ten minutes; nobody is paged
and merchants ask where their money is. Build the queries and alerts that would have caught it.

**1. Is it being scraped at all?** In Prometheus's Targets page the worker is missing. Its Service has port 9100
unnamed, and the ServiceMonitor says port: metrics. Name the Service port metrics; the target appears with up 1.

**2. The symptom.** The worker is not request-driven, so RED does not fit; USE does — saturation is work waiting.
The worker exports payout_queue_depth (a gauge) and payouts_sent_total (a counter). Panels:

    max(payout_queue_depth)
    sum(rate(payouts_sent_total[5m]))

During a stall depth climbs from about 200 to 6,000 while the send rate drops to zero.

**3. The cause.** The resource panels for the worker Pod:

    sum by (pod) (rate(container_cpu_cfs_throttled_periods_total{namespace="payments", pod=~"payouts.*"}[5m]))
      / sum by (pod) (rate(container_cpu_cfs_periods_total{namespace="payments", pod=~"payouts.*"}[5m]))

shows 0.9 — the worker spends most periods throttled by a 200m CPU limit while it signs a large batch. Raise the
CPU request and limit after measuring, or split batches.

**4. Alerts.** A page when payouts stop: sum(rate(payouts_sent_total[10m])) == 0 and max(payout_queue_depth) > 100,
for 10 minutes. A ticket for the backlog rule above. A page when the worker vanishes: absent(up{job="payouts"}).

**5. Route them.** severity page goes to the on-call pager, ticket to #payments-alerts; both carry runbook_url.

**Result.** The stall would have paged within ten minutes of payouts stopping, and the dashboard names the
throttling without anyone running kubectl.`,
    mcqs: [
      mcq('A new ServiceMonitor for payments-api is applied, but Prometheus never lists the target and logs no error. The Service and Pods are healthy. What should be checked first?', [
        ['That its labels match Prometheus\'s serviceMonitorSelector and the port is a named Service port', true],
        ['That the Pods have a liveness probe, since Prometheus only scrapes Pods with passing probes', false],
        ['That the HPA has scaled to at least two replicas, since single Pods are skipped by discovery', false],
        ['That the scrape interval is under 15 seconds, since longer intervals are silently discarded', false],
      ], 'The operator only picks up ServiceMonitors its selector matches, and endpoints refer to a named port; either mismatch means silently no target. Probes and replica counts do not gate discovery, and a 30-second interval is normal.'),
      mcq('Two Pods each expose http_requests_total, and one restarts mid-window. Which query gives a correct total request rate?', [
        ['sum(rate(http_requests_total[5m]))', true],
        ['rate(sum(http_requests_total)[5m:])', false],
        ['sum(http_requests_total) / 300', false],
        ['irate(sum(http_requests_total)[5m:])', false],
      ], 'rate() must see each Pod\'s own counter so it can detect that Pod\'s reset; summing first turns the reset into a drop in the total, which rate misreads. Dividing a cumulative total by 300 gives nothing meaningful, and irate of a sum has both problems.'),
      mcq('Why does PaySetu use a histogram rather than the Python client\'s Summary for payments-api latency?', [
        ['Histogram buckets can be summed across Pods and turned into a p99', true],
        ['A Summary cannot record any values that are below one full second', false],
        ['Histograms create fewer series than a Summary for the same metric', false],
        ['Grafana is unable to display any metric of the Summary type at all', false],
      ], 'Buckets are counters that add up across Pods, so histogram_quantile works on the whole service; the Python Summary exports only count and sum. Summaries record any value, histograms create more series (one per bucket), and Grafana displays summaries fine.'),
    ],
    checkpoint: [
      mcq('Which exporter tells you how many replicas of a Deployment are available and how often containers have restarted?', [
        ['kube-state-metrics', true],
        ['node-exporter', false],
        ['blackbox exporter', false],
        ['cAdvisor', false],
      ], 'kube-state-metrics turns Kubernetes object state (replicas, restarts, phases, requests and limits) into metrics. node-exporter reports node hardware and OS, the blackbox exporter probes endpoints from outside, and cAdvisor reports container resource usage.'),
      mcq('An alert has for: 10m. Its expression becomes true at 14:00 and false at 14:06. What does Alertmanager receive?', [
        ['Nothing — the alert went to pending and never fired', true],
        ['One firing alert at 14:00 and a resolved one at 14:06', false],
        ['One firing alert at 14:10, as the clock had started', false],
        ['A pending notification that the on-call must confirm', false],
      ], 'With for, an alert is pending until the condition has held for the whole duration; it cleared after six minutes, so it never fired and nothing was sent. Pending alerts are not sent to Alertmanager at all.'),
      mcq('During planned database maintenance tonight, PaySetu expects payments-api errors for twenty minutes. How should alerting be handled?', [
        ['Create an Alertmanager silence with an expiry and a comment for the window', true],
        ['Delete the error alert rule and re-apply it from Git after the maintenance', false],
        ['Raise the alert\'s for duration to 30 minutes permanently to cover such work', false],
        ['Stop Prometheus during the window so that no alerts can be evaluated at all', false],
      ], 'A silence mutes matching notifications for a bounded time and records why, while Prometheus keeps evaluating. Deleting rules risks forgetting to restore them, a permanent longer for slows every real page, and stopping Prometheus also loses the data.'),
    ],
  },

  /* ── SLI_SLO ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_SLI_SLO',
    notes: `PaySetu's product head asks: "Is payments-api reliable enough?" The honest answer needs three things the team does
not yet have — a measure of what users experience, a target for it, and an agreement about what happens when the
target is missed. That is an SLI, an SLO and an error budget policy. They also fix alerting: instead of guessing
thresholds, you page when the target is in danger.

## SLIs: measure what users feel

A **service level indicator** is a ratio: **good events ÷ valid events**, as a percentage.

- **Availability** — share of valid payment requests that did not fail on the server side.
- **Latency** — share of requests answered within a threshold (95% under 0.5 s), not an average.
- **Freshness** — share of payouts settled within 10 minutes of being due (the worker's SLI).
- **Correctness** — share of ledger reconciliations that match (checked by a job).

Decide **valid** and **good** carefully. A 400 because a merchant sent a bad VPA is not the service failing —
exclude it. A 429 from your own rate limiter usually is a failure if a well-behaved client got it. A request that
succeeded after 9 seconds is not good for a latency SLI. Measure **as close to the user as you can**: the load
balancer's or API gateway's view includes the time your service never saw; a server's own metrics miss requests
that never reached it.

## SLOs and why not 100%

A **service level objective** is a target for an SLI over a window: "99.9% of valid /v1/payments requests succeed,
over a rolling 30 days". Real arithmetic for the allowance each target gives:

    SLO 99.00% over 30 days ->    432.0 min, over 28 days ->   403.2 min
    SLO 99.50% over 30 days ->    216.0 min, over 28 days ->   201.6 min
    SLO 99.90% over 30 days ->     43.2 min, over 28 days ->    40.3 min
    SLO 99.95% over 30 days ->     21.6 min, over 28 days ->    20.2 min
    SLO 99.99% over 30 days ->      4.3 min, over 28 days ->     4.0 min

Each extra nine costs far more engineering and money than the last, and users cannot tell 100% from 99.99% when
their own mobile network fails more often than that. Set the SLO a little **below** what the service achieves
today and what users have been happy with — not as an aspiration. A rolling window (28 or 30 days) is better for
operations than a calendar month, which resets on the 1st whatever happened on the 30th.

An **SLA** is a contract with consequences (credits, penalties) and should be looser than the internal SLO, so the
team is warned before the contract is breached.

## Error budgets

The **error budget** is 100% minus the SLO: what you are allowed to fail. Time-based figures above are intuitive;
for an API, count requests. At 90 million payment requests a month and 99.9%:

    request budget at 99.9% of 90M requests: 90000

90,000 failed requests is the budget for the window. Spending it on a risky migration is a legitimate choice;
spending it on avoidable incidents is not. The budget turns "move fast" against "be careful" into a number both
the product owner and the engineers can see.

## Burn rate

**Burn rate** is how fast you are spending the budget relative to plan: a burn rate of 1 spends exactly the
budget over the window; 2 spends it in half the window. With a 99.9% SLO, an error ratio of 1.44% is a burn rate
of 14.4. Real arithmetic over a 30-day window:

    burn 14.4x for   1 h consumes   2.0% of budget; budget gone in   50.0 h
    burn    6x for   6 h consumes   5.0% of budget; budget gone in  120.0 h
    burn    1x for  72 h consumes  10.0% of budget; budget gone in  720.0 h
    error ratio threshold at 99.9% and 14.4x: 0.0144  at 6x: 0.006

The numbers come from the Google SRE Workbook's recommendation: **page** when 2% of the budget is spent in an hour
(14.4x) or 5% in six hours (6x); open a **ticket** for slower burns such as 10% in three days.

## Multiwindow alerts, and why they beat a threshold

Each rule pairs a **long window** (is it significant?) with a **short window**, one-twelfth as long (is it still
happening?), so the alert fires quickly and also clears quickly after recovery. Written from the documentation:

    - record: slo:payments_errors:ratio_rate1h
      expr: |
        sum(rate(http_requests_total{job="payments-api",route="/v1/payments",code=~"5.."}[1h]))
        / sum(rate(http_requests_total{job="payments-api",route="/v1/payments"}[1h]))
    - alert: PaymentsBudgetFastBurn
      expr: |
        slo:payments_errors:ratio_rate1h > (14.4 * 0.001)
        and slo:payments_errors:ratio_rate5m > (14.4 * 0.001)
      labels: {severity: page}

(The 5m, 6h and 30m recording rules follow the same pattern; the rule file parsed with PyYAML.)

To see the difference, a simulation ran 30 days minute by minute at 2,000 requests a minute: a background error
ratio of 0.03%, one sharp incident (40 minutes at 5% errors) and one slow leak (two days at 0.4%). Real output:

    budget (requests): 86400  spent: 51415  -> 59.5%
    incident 1 spent: 4020 (4.7% of budget)
    incident 2 spent: 23086 (26.7% of budget)
    fast page 14.4x (1h & 5m)  inc1 first at +16 min, last +42  inc2 never   outside incidents: 0
    slow page 6x (6h & 30m)    inc1 never                       inc2 never   outside incidents: 0
    ticket 3x (1d & 2h)        inc1 never                       inc2 first at +1058 min outside incidents: 0
    naive 5m > 0.1%            inc1 first at +0 min, last +43   inc2 first at +1 min outside incidents: 10

Read it like an SRE. The fast-burn page caught the sharp incident in 16 minutes and stopped about three minutes
after it ended, with no false pages in a month. The slow leak burnt a quarter of the budget but never justified
waking anyone; the ticket rule raised it about 18 hours in, early enough to fix in working hours. The naive "error ratio above the SLO for five minutes"
was fastest — and also fired on ten quiet minutes of random noise, the kind of page that trains people to ignore
pages. For a latency SLO use the same pattern with good = requests in buckets le="0.5".

CloudWatch can do the same with metric-math alarms over two periods combined in a composite alarm, and CloudWatch
Application Signals offers SLO tracking; Azure Monitor has equivalent alert rules.

## When the budget runs out

An **error budget policy** is agreed with product **before** it is needed, and written down:

- Budget healthy: ship as normal; spend some on experiments and migrations.
- Budget below 25% remaining: risky releases need sign-off; reliability items move up the backlog.
- Budget exhausted: feature releases pause (security fixes and reliability work continue) until the rolling window
  recovers or the cause is fixed; the postmortem actions for the incidents that spent it come first.
- One incident spent more than 20% of the budget: it gets a postmortem, whatever its severity.

Low-traffic services make ratios jumpy — 2 failures in 40 night-time requests is 5%. Use longer windows, a minimum
request count before alerting, or synthetic traffic to keep the SLI meaningful.`,
    workedExample: `**Scenario.** Define SLOs for PaySetu's payments-api and payouts worker, with alerts and a policy, in one
page the product head will sign.

**1. User journeys.** Merchants care that a collect request is accepted and answered quickly, and that payouts
arrive on time. Three SLIs follow.

**2. SLIs, precisely.**
- Availability: good = /v1/payments responses that are not 5xx and not 429 from our limiter; valid = all
  /v1/payments requests except 4xx caused by the merchant's input. Measured at the ALB plus app metrics.
- Latency: good = /v1/payments answered within 0.8 s (a bucket edge is placed at 0.8 s so the ratio is exact).
- Freshness: good = payouts settled within 10 minutes of their due time; valid = all due payouts.

**3. Targets from history.** The last 90 days achieved 99.95% availability, 99.3% within 0.8 s and 99.7% fresh.
Proposed SLOs over a rolling 30 days: 99.9%, 99% and 99.5% — reachable, with room to ship.

**4. Budgets.** At 90 million requests a month the availability budget is 90,000 failed requests (43.2 minutes
of full outage). The latency budget is 900,000 slow requests.

**5. Alerts.** For each SLI: page at 14.4x over 1 h and 5 m, page at 6x over 6 h and 30 m, ticket at 1x over
3 days and 6 h. Each alert links to a runbook. Old CPU and memory pages become dashboard panels.

**6. Policy.** Below 25% remaining: release sign-off; exhausted: feature freeze for payments-api, reliability work
first; over 20% in one incident: postmortem.

**7. Review.** Monthly, product and engineering look at budget spent and adjust: a target that is never at risk
may be too loose, one always exhausted is either too tight or a sign of real debt.`,
    mcqs: [
      mcq('For PaySetu\'s availability SLI, how should a 400 response caused by a merchant sending an invalid VPA be counted?', [
        ['Excluded from valid events, since the service behaved correctly', true],
        ['Counted as a bad event, since the merchant\'s payment did not go through', false],
        ['Counted as a good event and a valid one, to raise the SLI a little', false],
        ['Counted twice as bad, since the merchant is likely to retry it later', false],
      ], 'An SLI measures the service\'s own failures; a correct rejection of bad input is the service working. Counting it as bad punishes the team for merchants\' mistakes, and counting it as good inflates the SLI. Retries are separate requests with their own outcomes.'),
      mcq('With a 99.9% SLO over 30 days, payments-api runs at a burn rate of 6 for six hours. How much of the error budget has gone?', [
        ['5% of the budget', true],
        ['6% of the budget', false],
        ['0.6% of the budget', false],
        ['36% of the budget', false],
      ], 'Budget consumed = burn rate × elapsed time ÷ window = 6 × 6 h ÷ 720 h = 0.05, or 5%. The other figures confuse the burn rate with a percentage of budget or multiply without dividing by the window.'),
      mcq('Why does the fast-burn alert pair a 1-hour window with a 5-minute window instead of using the 1-hour window alone?', [
        ['The short window lets the alert stop soon after the incident ends', true],
        ['The short window makes the alert fire before the hour has elapsed', false],
        ['Prometheus cannot store data longer than one hour without it', false],
        ['The pair halves the number of series Prometheus has to store', false],
      ], 'A 1-hour ratio stays high for up to an hour after recovery; requiring the 5-minute ratio too makes the alert resolve within minutes once errors stop. The long window still decides when it fires, retention is unrelated, and the pair adds recording rules rather than removing series.'),
    ],
    checkpoint: [
      mcq('PaySetu proposes an SLO of 100% availability for payments-api. What is the best response?', [
        ['Set it just below what users accept and the service achieves today', true],
        ['Accept it, since a payments service must never fail any request', false],
        ['Accept it, but measure the SLI only during office hours in India', false],
        ['Set it at 99.99% for every service so that all teams are consistent', false],
      ], 'A 100% target leaves no budget for change and is unachievable given networks and dependencies; SLOs come from user needs and history. Measuring only office hours hides real failures, and one target for every service ignores what each one\'s users need.'),
      mcq('PaySetu\'s error budget for the rolling 30 days is exhausted after two incidents. What does a typical error budget policy say happens next?', [
        ['Feature releases pause and reliability work comes first until it recovers', true],
        ['The SLO is lowered for the rest of the month so that the budget is positive', false],
        ['Nothing changes until the next calendar month begins and resets the budget', false],
        ['The on-call engineer for the two incidents is moved to another rotation', false],
      ], 'The policy, agreed in advance, shifts effort from features to reliability while the budget is spent. Moving the target after missing it makes the SLO meaningless, a rolling window does not reset on a date, and blaming individuals contradicts how SRE treats incidents.'),
      mcq('Which is a well-formed latency SLI for /v1/payments?', [
        ['Share of valid requests answered within 0.8 s, measured at the load balancer', true],
        ['Average response time of all requests over the day, measured inside the app', false],
        ['The p99 latency of the slowest Pod, sampled once every hour on the dashboard', false],
        ['CPU utilisation of the payments-api Pods while serving requests at peak time', false],
      ], 'An SLI is a ratio of good to valid events measured close to the user; "within 0.8 s" defines good. An average hides the tail, a once-an-hour sample of one Pod is not a ratio of events, and CPU is a cause metric, not what users experience.'),
    ],
  },

  /* ── INCIDENTS_POSTMORTEMS ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_INCIDENTS_POSTMORTEMS',
    notes: `Alerts are only half of operations. At 21:40 on a Friday the PaySetu fast-burn page fires: payments are failing.
What happens in the next hour — who does what, who tells whom, and what gets written afterwards — decides whether
the outage lasts 15 minutes or 90, and whether it happens again next month. This lesson is the human system around
the technical one.

## On-call that people can sustain

- **A rotation, written down.** Primary and secondary for each week, with a handover note (open issues, risky
  changes planned, silences in place). Teams spread across Bengaluru and another time zone can run follow-the-sun
  so nobody is paged at 3am routinely.
- **Every page is actionable.** If the on-call engineer looks and goes back to sleep, the alert is wrong: make it a
  ticket or delete it. Count pages per shift and review them weekly; a rotation with more than a couple of
  incidents per shift burns people out and they stop reading pages.
- **Escalation.** If the primary does not acknowledge in, say, five minutes, the secondary is paged, then the team
  lead. The paging tool (PagerDuty, Opsgenie, or an SNS-to-phone integration) enforces it.
- **Access before the incident.** The on-call can assume the break-glass role, reach the runbooks and the
  dashboards, and roll back a deployment — checked at handover, not discovered at 3am.

## Severity levels

Decide severity by **impact**, not by how interesting the cause is. PaySetu's table:

    SEV1  Payments or payouts failing or badly delayed for many merchants; data or money at risk
    SEV2  Major function degraded with a workaround (one PSP down, traffic moved to the other)
    SEV3  Minor or internal impact (reporting delayed, one merchant's integration failing)
    SEV4  No user impact yet; a risk found (certificate expiring in 10 days)

Severity sets who is woken, how often updates go out and whether a postmortem is mandatory (SEV1 and SEV2 always).
When in doubt, declare higher and downgrade — declaring is cheap, a late declaration is not.

## Roles

For a SEV1 or SEV2 the first responder **declares** the incident and the roles are filled:

- **Incident Commander (IC)** — owns the incident: sets priorities, assigns work, decides (roll back now?), keeps
  the timeline moving. The IC does **not** debug; the moment the IC is deep in logs, nobody is steering.
- **Operations / technical lead** — investigates and changes systems, with helpers the IC assigns.
- **Communications lead** — writes internal updates on a fixed cadence and the status page; handles the business
  and support teams so engineers are not interrupted.
- **Scribe** — records the timeline in the incident channel: what was seen, decided and done, with times in IST.

On a small team one person may hold two roles, but say it out loud: "I am IC and comms."

## The incident, in order

1. **Detect** — the page (or, worse, a merchant).
2. **Declare** — open #inc-2026-10-23-payments, start the call, name the IC, set severity.
3. **Triage** — what is the impact, since when, what changed? Deploys, config changes and dependency status first:
   most incidents follow a change.
4. **Mitigate** — stop the bleeding **before** understanding the cause: roll back the release, fail over to the
   second PSP, disable the feature flag, shed load. Root cause can wait; merchants cannot.
5. **Resolve** — the SLI is back inside the SLO, confirmed on the dashboard, not assumed.
6. **Follow up** — the postmortem and its actions.

## Communication

Internal updates every 30 minutes for a SEV1 even if nothing changed ("still investigating, next update 22:30").
A useful update says impact, what is being done, and when the next update comes:

    22:05 IST  SEV1 payments-api. Impact: ~18% of UPI collect requests failing since 21:38.
    Mitigation: rolled back release 2026.10.23-2 at 21:58; error ratio falling, now 4%.
    Next update 22:35 or sooner.

The public **status page** says the same in merchants' words, without internal names or guesses about cause. If an
incident is a security incident, the security team owns regulatory reporting (CERT-In's directions require certain
cyber incidents to be reported within six hours), and a fintech also has its regulator and partner banks to
inform — another reason the communications role exists.

## Runbooks

A runbook is linked from every alert's runbook_url and answers, for that alert: what it means, how to confirm
impact (the dashboard link and the query), the first safe actions (rollback command, PSP failover switch, how to
scale), when to escalate and to whom. Write them as checklists; test them in game days; update them in every
postmortem that found one wrong.

## Measuring incident response

**MTTD** (time to detect), **MTTA** (to acknowledge) and **MTTR** (to restore) are useful trends, but they are
averages of very different incidents and easy to game. Look at each SEV1's timeline instead: where did the minutes
go — detection, deciding to roll back, or the rollback itself?

## Blameless postmortems

A postmortem asks how the system allowed the failure, not who caused it. "Blameless" does not mean nobody did
anything; it means the question is "why did it make sense to them at the time, and what made the mistake easy?"
People who fear blame hide details, and a postmortem without details fixes nothing.

A template that works:

- **Summary** — two or three sentences.
- **Impact** — merchants and payments affected, duration, money delayed, **error budget consumed**.
- **Timeline** — from the scribe's notes, in IST, including detection and each decision.
- **Root cause and contributing factors** — usually several: the bug, the missing test, the alert that was too
  slow, the dashboard that hid it. "Human error" is never a root cause; ask what made the error possible.
- **What went well, what went badly, where we got lucky.**
- **Action items** — each with an owner, a priority, a due date and a ticket link.

## Actions that actually get done

Most postmortems fail at the last step: twelve vague actions ("improve monitoring"), no owners, never reviewed.
Instead:

- **Few and specific** — three to five, each testable: "add a canary stage with an alarm-based rollback to the
  payments-api pipeline", not "be more careful with deploys".
- **Balanced** across **prevent** (it cannot recur), **detect** (we would know sooner) and **mitigate** (it would
  hurt less).
- **Tracked in the normal backlog** with the incident's tag, and reviewed in a weekly operations meeting until
  closed. Under an error budget policy, these come before features.
- **Shared** — the document is read in a review meeting and published to engineering, so other teams learn too.`,
    workedExample: `**Scenario.** Friday 21:38 IST: PaySetu's payments start failing. Here is the incident as it should run,
and the postmortem extract that comes out of it.

**Timeline (from the scribe).**
- 21:38 Error ratio on /v1/payments rises to 18%.
- 21:54 PaymentsBudgetFastBurn pages Asha (primary). 21:55 acknowledged.
- 21:57 Asha declares SEV1, opens #inc-2026-10-23-payments, takes IC; pages Ravi (secondary) as ops lead and
  asks support lead Meera to run comms.
- 21:58 Ravi sees release 2026.10.23-2 went out at 21:35. IC decides: roll back now, investigate later.
- 22:04 Rollback complete; error ratio falling. 22:05 first update posted (above).
- 22:20 Error ratio 0.02% for 15 minutes; IC declares resolved; status page updated.

**Root cause and contributing factors.** The release changed the PSP client's TLS settings; one PSP endpoint
rejected the handshake. Contributing: the staging environment uses a PSP sandbox with different TLS settings, so
tests passed; the pipeline had no canary stage; the 1-hour burn alert took 16 minutes to fire.

**Impact.** 42 minutes, about 15,100 failed collect requests across 3,200 merchants, 17% of the month's error
budget. No money lost: failed collects were not debited.

**Went well:** decision to roll back within a minute of seeing the deploy; comms every 30 minutes. **Badly:** no
canary. **Lucky:** it happened on a Friday evening, not during the 11:00 peak.

**Actions.**
1. Canary stage with alarm-based rollback on payments-api (owner Ravi, P1, 2 weeks).
2. Synthetic TLS check against each production PSP endpoint from the pipeline before promotion (owner Asha, P1,
   1 week).
3. Add a deploy marker annotation to the payments dashboard (owner Meera, P2, 1 week).

**Note what is absent:** no "Ravi should have tested better". The system let an untestable change reach every
merchant at once; the actions change the system.`,
    mcqs: [
      mcq('Ten minutes into a SEV1, PaySetu\'s Incident Commander is reading stack traces in the logs to find the bug. What is wrong with this?', [
        ['Nobody is now coordinating, deciding or keeping communication going', true],
        ['The IC is not allowed to see production logs under the DPDP Act rules', false],
        ['Stack traces should only be read after the postmortem has been written', false],
        ['The IC should be restarting Pods instead, since that usually fixes it', false],
      ], 'The IC\'s job is to steer — assign work, decide on mitigation, keep comms flowing — and debugging absorbs them. Viewing logs is not illegal, diagnosis continues during the incident (by the ops lead), and restarting Pods without evidence is not the IC\'s role either.'),
      mcq('A release went out at 21:35 and payments began failing at 21:38. The cause is not yet understood. What should the team do first?', [
        ['Roll back the release, then investigate the cause with the pressure off', true],
        ['Keep the release running until the root cause is found and patched', false],
        ['Write the postmortem draft while the details are still fresh in mind', false],
        ['Raise the alert threshold so the page stops repeating during the work', false],
      ], 'Mitigation comes before diagnosis, and a recent change is the first suspect; rolling back usually restores service in minutes. Waiting for a fix prolongs the outage, the postmortem comes after resolution, and muting the alert hides the impact.'),
      mcq('Which postmortem action item is most likely to get done and make a difference?', [
        ['Add a canary stage with alarm-based rollback to payments-api — Ravi, P1, 2 weeks', true],
        ['Improve monitoring and testing for all services across the whole of engineering', false],
        ['Remind all engineers to be more careful when they deploy changes on a Friday', false],
        ['Investigate whether something like this could possibly happen again in future', false],
      ], 'A good action is specific, testable, owned and dated, and it changes the system. The others are vague, unowned, or rely on people trying harder, which is what blameless postmortems avoid.'),
    ],
    checkpoint: [
      mcq('One of PaySetu\'s two PSPs is down, but all payments are being routed to the other one and succeed, a little slower. Which severity fits PaySetu\'s table?', [
        ['SEV2 — a major function degraded, with a workaround in place', true],
        ['SEV1 — payments are involved, so every PSP issue is the top level', false],
        ['SEV4 — no payment has failed, so there is no impact on merchants', false],
        ['SEV3 — PSPs are third parties, so their outages are always minor', false],
      ], 'Severity follows impact: a major dependency is out but a workaround keeps payments working, which is SEV2 in the table. Topic alone does not make a SEV1, slower payments are impact, and third-party causes can still be severe.'),
      mcq('A postmortem lists the root cause as "engineer ran the wrong migration". What should the review ask instead?', [
        ['What made the wrong migration easy to run and hard to notice in time', true],
        ['Which engineer ran it, so that they can be retrained before the next one', false],
        ['Whether the engineer had been on call too often during that month', false],
        ['How many times that engineer has been involved in incidents before', false],
      ], 'Blameless analysis looks for the conditions that allowed the error — no dry run, no review, no guard on production — because fixing those prevents the next person making it. Questions focused on the individual drive details into hiding and change nothing in the system.'),
      mcq('During a SEV1, merchants and PaySetu\'s business team keep messaging the engineers fixing the problem. Which role exists to prevent this?', [
        ['The communications lead, who handles updates and stakeholders', true],
        ['The scribe, who answers questions while recording the timeline', false],
        ['The secondary on-call, who replies to merchants on the call', false],
        ['The Incident Commander, who should answer every message personally', false],
      ], 'The communications lead posts regular updates and fields stakeholders so responders can focus. The scribe records, the secondary is usually working the problem, and an IC answering every message stops steering the incident.'),
    ],
  },

  /* ── RELIABILITY_CAPACITY ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_RELIABILITY_CAPACITY',
    notes: `Every postmortem so far has the same shape: a dependency misbehaved and payments-api made it worse, or traffic
arrived and the system was not ready. This lesson is the patterns that stop one slow dependency becoming a full
outage, and the arithmetic that makes a sale day boring. A partner marketplace has announced a festive sale for
which PaySetu expects six times its normal peak.

## Timeouts on every call

A call without a timeout waits as long as the other side likes, holding a thread, a connection and a user. Set:

- a **connect timeout** (short, a few seconds: a host that does not accept a connection is down) and a **read
  timeout** (based on the dependency's real p99, plus margin);
- an **overall deadline** from the caller's budget: if the merchant's client gives up at 10 s, payments-api must
  finish everything — including retries — well inside that.

Library defaults are rarely right. boto3's are 60 seconds each; set them, with the retry mode, in a Config:

    from botocore.config import Config
    cfg = Config(connect_timeout=2, read_timeout=5, retries={"mode": "standard", "max_attempts": 3})
    sqs = boto3.client("sqs", region_name="ap-south-1", config=cfg)
    print(sqs.meta.config.connect_timeout, sqs.meta.config.read_timeout, sqs.meta.config.retries)

    2 5 {'mode': 'standard', 'total_max_attempts': 4}

Note the output: in botocore's retries config, max_attempts counts **retries**, so the total is four attempts.
Read what a library means by its numbers.

## Retries, carefully

Retry only **transient** failures (timeouts, 503, throttling), never 400s, and only operations that are
**idempotent**. A payment POST is not idempotent by nature: retrying a timed-out "debit ₹499" may debit twice. Make
it idempotent with an **idempotency key** the client sends and the server stores, so a repeat returns the first
result.

Retries multiply. Three layers each making up to three attempts:

    worst-case calls to the bottom service per user request: 27

A PSP that is struggling at 1,000 requests a second receives up to 27,000 — the retry storm that keeps it down.
Retry at **one** layer (usually the one closest to the failing call), cap attempts, and give the service a
**retry budget** (for example, retries at most 10% of requests). Retries do help with independent failures:

    attempts=1 P(all fail)=0.2000
    attempts=2 P(all fail)=0.0400
    attempts=3 P(all fail)=0.0080

— but a dependency that is down is not independent from one attempt to the next.

## Backoff with jitter

Wait longer after each failure (exponential backoff), with a cap:

    exponential delays: [0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 5.0]

If every client waits exactly that long, they all come back together. Simulated with 1,000 clients that all failed
at the same moment and retried three times:

    jitter=none: busiest 10 ms slot gets 1000 retries, distinct slots 3
    jitter=full: busiest 10 ms slot gets 169 retries, distinct slots 66

Without jitter, all 1,000 retries land in the same instant, three times over. **Full jitter** — sleep a random
time between 0 and the backoff — spreads them out (the first retry window is only 100 ms wide, so it is still
busy; later windows spread further). AWS SDKs add jitter for you; hand-written loops must do it themselves.

## Circuit breakers

A **circuit breaker** stops calling a dependency that is failing, fails fast instead, and tests it again after a
cool-down:

- **Closed** — calls go through; consecutive failures are counted.
- **Open** — after N failures, calls fail immediately without touching the dependency.
- **Half-open** — after the cool-down, one trial call; success closes the breaker, failure opens it again.

A simulation in Python: one request every 0.1 s for 100 s, the PSP down from 10 s to 70 s, breaker threshold 5
failures, cool-down 30 s. Real output:

    t= 10.4s CLOSED->OPEN
    t= 40.4s OPEN->HALF_OPEN
    t= 40.4s HALF_OPEN->OPEN
    t= 70.4s OPEN->HALF_OPEN
    t= 70.4s HALF_OPEN->CLOSED
    calls that reached the PSP: 402  failed fast without calling: 598
    without a breaker the PSP would get 1000 calls, of which 600 fail slowly

The PSP got five failing calls and one probe instead of 600 calls during its outage, and payments-api answered
those requests at once instead of holding them for a timeout each. What happens to a fast failure is the next
pattern.

## Degrade gracefully

- **Fallbacks** — route to the second PSP; show the last known balance with a "may be delayed" note; queue a
  payout and confirm later instead of failing.
- **Bulkheads** — separate connection pools (or separate services) per dependency, so a slow PSP cannot use every
  thread and starve the health check and the refund API.
- **Load shedding and rate limiting** — under overload, reject early with 429 or 503 (cheap) rather than accept
  everything and time out (expensive). Prioritise: shed analytics before payments.
- **Game days** — break things on purpose (block the PSP in staging, kill a Pod, fail an AZ with AWS Fault
  Injection Service) and watch whether the patterns work as designed.

## Load testing

Use **k6** or **Locust** (both scriptable) against a production-like environment, never production without an
agreement. Kinds: a **ramp** to find the knee where latency leaves the SLO; a **soak** at expected peak for hours
(leaks, pool exhaustion); a **spike** to see how autoscaling copes with a sudden jump. The output you need is
**throughput per instance at the latency SLO** — not the maximum before errors.

## Capacity planning for the sale

    sale-day peak rps: 7200  tasks at 60% target: 80  tasks with one AZ of three lost: 120
    in-flight requests at peak (L = lambda * W): 1800.0
    DB connections at 80 tasks: 800
    traffic after 6 months at 8%/month: x1.59

Read each line:

- Normal peak 1,200 rps × 6 = 7,200. Load tests showed 150 rps per task at the latency SLO; run tasks at 60% of
  that to leave **headroom** for bursts and autoscaling lag: 7,200 ÷ 90 = 80 tasks.
- Survive the loss of one of three AZs: the other two must carry everything, so 80 × 3 ÷ 2 = 120.
- **Little's law** (in-flight = arrival rate × time in system): 7,200 × 0.25 s = 1,800 requests in flight —
  that is how many threads, connections or async slots must exist somewhere.
- 80 tasks with a pool of 10 each is 800 database connections. Check the RDS instance's limit; use RDS Proxy or
  smaller pools before the database becomes the bottleneck.
- Growth compounds: 8% a month is 1.59× in six months.

Then the non-maths items: **service quotas** (Fargate vCPU, Lambda concurrency, EIPs) raised days in advance;
**scale ahead** with scheduled scaling rather than trusting reactive autoscaling for a step change; the PSP told
your expected rate; caches warmed; a change freeze around the sale; the on-call doubled with the runbooks rehearsed.`,
    workedExample: `**Scenario.** The partner marketplace's sale starts at 00:00 on a Sunday. Last year PaySetu's p99 went to 9
s for forty minutes because the PSP slowed down and payments-api held every connection. Write the plan.

**1. Numbers.** Normal peak 1,200 rps; expected 6×, so 7,200 rps, with the first ten minutes at up to 9,000 (a
spike when the sale opens). Load test: 150 rps per task at p99 0.8 s.

**2. Capacity.** 9,000 ÷ (150 × 0.6) = 100 tasks for the opening spike; with an AZ lost, 150. Scheduled scaling
raises the minimum to 120 at 23:00 and to 150 at 23:45, back to 60 at 04:00; target tracking handles the rest.
Fargate vCPU quota checked and raised a week before.

**3. Database.** 150 tasks × 10 connections is 1,500 — beyond what the RDS instance should hold. Put RDS Proxy in
front, cut the per-task pool to 5, and load-test the pair.

**4. The PSP.** Timeout 2 s connect, 3 s read (its p99 is 1.2 s); one retry at the PSP adapter only, full
jitter, idempotency key on every collect; a circuit breaker per PSP (5 failures, 30 s cool-down) whose open state
routes to the second PSP; a separate connection pool per PSP so one slow PSP cannot take the other down.

**5. Shed load in order.** Rate limit per merchant; under overload return 503 quickly for reporting endpoints
first, payments last.

**6. Prove it.** A game day the Sunday before: replay 9,000 rps against staging and block PSP-A for ten minutes.
Pass criteria: the payments SLI stays above 99.5% and p99 under 1 s.

**7. People.** Change freeze from Friday; two engineers on call; the runbook for "PSP slow" rehearsed.`,
    mcqs: [
      mcq('payments-api calls an internal ledger service that calls a database client; each of the three layers retries failed calls up to 3 times in total. The database is overloaded. What is the worst case per user request?', [
        ['27 calls reach the database, which deepens the overload', true],
        ['9 calls reach the database, since only two layers retry', false],
        ['3 calls reach the database, as retries do not multiply', false],
        ['1 call reaches the database, since retries are absorbed', false],
      ], 'Each layer multiplies the attempts of the layer below: 3 × 3 × 3 = 27. That amplification keeps an overloaded dependency down, which is why retries belong at one layer with a cap and a budget.'),
      mcq('Why does PaySetu add random jitter to its exponential backoff for PSP retries?', [
        ['So clients that failed together do not all retry at the same instant', true],
        ['So the total wait is shorter on average than plain exponential backoff', false],
        ['So that retries are counted separately in the latency histogram buckets', false],
        ['So the PSP can tell retries apart from first attempts by their timing', false],
      ], 'Without jitter, clients that failed at the same moment come back in synchronised waves; randomising the delay spreads the load. Full jitter does shorten the average wait, but that is a side effect, not the reason, and it has nothing to do with histograms or the PSP spotting retries.'),
      mcq('A circuit breaker around PSP-A is OPEN. What happens to a new payment request that would have used PSP-A?', [
        ['It fails fast without calling PSP-A, and a fallback can route it', true],
        ['It waits for the cool-down to end, then calls PSP-A as normal', false],
        ['It calls PSP-A with a longer timeout in case it has recovered', false],
        ['It is retried three times against PSP-A with full jitter backoff', false],
      ], 'Open means calls are not attempted; the request fails immediately, which frees resources and lets a fallback (the second PSP) handle it. Only after the cool-down does a single half-open trial call go through; longer timeouts and retries are exactly what the breaker avoids.'),
    ],
    checkpoint: [
      mcq('Which operation can payments-api safely retry after a read timeout without any extra design?', [
        ['GET /v1/payments/{id} to fetch a payment\'s current status', true],
        ['POST /v1/payments that asks the PSP to debit a customer', false],
        ['POST /v1/payouts that sends money to a merchant\'s bank', false],
        ['POST /v1/refunds that returns money to a customer account', false],
      ], 'A read is idempotent: repeating it changes nothing. The three POSTs move money, and a timeout does not tell you whether the first attempt succeeded, so retrying them needs an idempotency key first.'),
      ck('CAPACITY_PLANNING', 'Load tests show 150 rps per task at the latency SLO. Peak is 7,200 rps, tasks should run at 60% of tested capacity, and the service must survive losing one of three AZs. How many tasks?', [
        ['120 tasks', true],
        ['80 tasks', false],
        ['48 tasks', false],
        ['160 tasks', false],
      ], '7,200 ÷ (150 × 0.6) = 80 tasks for headroom, and losing one of three AZs leaves two-thirds, so 80 × 3 ÷ 2 = 120. 48 ignores headroom, 80 ignores the AZ loss, and 160 doubles instead of scaling by three-halves.'),
      ck('CAPACITY_PLANNING', 'PaySetu\'s payments-api receives 7,200 requests a second at peak and each spends 0.25 s in the service. By Little\'s law, about how many requests are in flight?', [
        ['1,800', true],
        ['28,800', false],
        ['7,200', false],
        ['250', false],
      ], 'Little\'s law: L = λ × W = 7,200 × 0.25 = 1,800 concurrent requests, which sizes threads, connections and async slots. 28,800 divides instead of multiplying, 7,200 is the arrival rate itself, and 250 confuses milliseconds with requests.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_DEBUGGING',
    notes: `Six failures from PaySetu's first months of running payments-api with real monitoring. In each, the monitoring
itself was the thing that was broken — the most dangerous kind of failure, because it is silent. For each: the
symptom, the cause and the one change that fixes it. Messages are in their documented forms; the CloudWatch
behaviour was checked against moto where moto implements it, and the Prometheus cases were reasoned from the
documentation and the arithmetic in this topic.

## 1. The alarm that never left INSUFFICIENT_DATA

**Symptom.** "payments-failed-high" has shown INSUFFICIENT_DATA since it was created. The PaymentsFailed graph in
the metrics console shows data every minute.

**Cause.** The code publishes PaymentsFailed with the dimension Service=payments-api; the alarm was created from a
copied template with no dimensions. A CloudWatch metric is identified by namespace, name and every dimension, so
the alarm watches a metric that has never received a data point.

**Fix.** Recreate the alarm with Dimensions=[{"Name": "Service", "Value": "payments-api"}], and alarm on
"INSUFFICIENT_DATA for more than an hour" for critical alarms so a broken alarm is itself noticed.

## 2. The 3am page about 50% errors

**Symptom.** The error-ratio alarm pages most nights between 02:00 and 05:00. Each time the dashboard shows 1 or 2
failures out of 3 or 4 requests, and nothing is wrong.

**Cause.** At night traffic is tiny, so one failure is a huge ratio. The alarm has no minimum volume.

**Fix.** Guard the expression — IF(total > 200, 100 * failed / total, 0) in CloudWatch metric math, or "and
sum(rate(...)) > 3" in PromQL — and cover quiet hours with a burn-rate rule on long windows, which needs many
failures to fire. Do not "fix" it by raising the threshold for the whole day.

## 3. A target that does not exist

**Symptom.** After moving the payouts worker to EKS, its Grafana panels say "No data". Prometheus's Targets page
does not list it at all — not as down, simply absent. No errors anywhere.

**Cause.** Two silent mismatches. The ServiceMonitor has the label team: payments, but the Prometheus object
selects ServiceMonitors with release: kube-prometheus-stack; and its endpoint says port: metrics while the
Service's port is unnamed.

**Fix.** Add the release label, name the Service port metrics, and add an alert on absent(up{job="payouts"}) so a
target that disappears is noticed. Check the operator's selectors with kubectl get prometheus -o yaml.

## 4. Traffic "spikes" on every deploy

**Symptom.** A Grafana panel of total requests per second jumps to many times real traffic whenever Pods roll,
although the ALB's RequestCount shows nothing unusual.

**Cause.** The panel query is rate(sum(http_requests_total)[5m:]) — sum first, then rate. When an old Pod
disappears and new Pods start from zero, the summed total falls; rate() reads any fall as a counter reset and
counts the whole new total as fresh increase, so the panel spikes.

**Fix.** sum(rate(http_requests_total[5m])): rate on each Pod's own counter, which handles that Pod's reset, then
sum. Better still, put it in a recording rule so every panel uses the same expression.

## 5. Prometheus running out of memory

**Symptom.** The Prometheus Pod is OOMKilled every few hours; the number of series has grown from 200,000 to 9
million in a week.

**Cause.** A new middleware labels http_requests_total by request.url.path. Every payment status lookup
(/v1/payments/pay_8Hx2Qm...) creates a new series, multiplied by method, code and Pod.

**Fix.** Label by the **route template** (/v1/payments/{id}), not the raw path. While the code fix ships, drop the
label at scrape time with a metric relabelling rule. Watch prometheus_tsdb_head_series and alert on its growth.

## 6. The PSP recovers, then falls over again

**Symptom.** PSP-A has a two-minute outage. It comes back, and within seconds fails again under a flood of
traffic — three times before it stays up. PaySetu's outgoing request rate to PSP-A during each recovery is about
20 times normal.

**Cause.** The mobile SDK retries 3 times, the API gateway integration retries, and the PSP adapter retries 3
times with a fixed 1-second delay. Retries multiply across layers and, with no jitter, arrive in synchronised
waves the moment the PSP returns.

**Fix.** Retry in one place (the adapter), at most once or twice, with exponential backoff and full jitter, behind
a circuit breaker that sends a single probe after the cool-down. Every collect carries an idempotency key, so the
remaining retries are safe.

## The habit

When an alert or panel looks wrong, distrust the monitoring before the system: check the metric's identity
(dimensions, labels), the query's shape (rate then sum, windows) and the volume behind a ratio.`,
    mcqs: [
      mcq('A CloudWatch alarm on a custom metric shows INSUFFICIENT_DATA for days while the metric is clearly being published. What is the first thing to compare?', [
        ['The alarm\'s dimensions with the dimensions the code publishes', true],
        ['The alarm\'s action SNS topic with the topic\'s subscriptions', false],
        ['The alarm\'s threshold with the highest value in the last day', false],
        ['The log group\'s retention with the alarm\'s evaluation period', false],
      ], 'A metric is identified by namespace, name and dimensions; an alarm with different dimensions watches an empty metric and never gets data. SNS subscriptions affect delivery, not state; a threshold changes OK versus ALARM, not INSUFFICIENT_DATA; and log retention is unrelated.'),
      mcq('An error-ratio alarm pages most nights on 1 failure in 3 requests. Which fix keeps daytime sensitivity?', [
        ['Require a minimum request volume before the ratio can alarm', true],
        ['Raise the threshold from 2% to 40% for every hour of the day', false],
        ['Switch the alarm to count failures instead of their ratio', false],
        ['Disable the alarm\'s actions between 01:00 and 06:00 each night', false],
      ], 'A volume guard ignores ratios computed from tiny samples while leaving the daytime threshold intact; long-window burn rules cover the night. A 40% threshold misses real daytime incidents, raw counts break at high traffic, and muting the night misses real night incidents.'),
      mcq('A panel showing rate(sum(http_requests_total)[5m:]) spikes to many times real traffic during each rollout. What is the corrected query?', [
        ['sum(rate(http_requests_total[5m]))', true],
        ['rate(sum(http_requests_total)[1h:])', false],
        ['abs(rate(sum(http_requests_total)[5m:]))', false],
        ['sum(irate(http_requests_total[5m])) * 300', false],
      ], 'Taking rate per Pod lets Prometheus handle each counter\'s reset; summing afterwards gives the true total. A longer subquery window still sums first, abs hides the error rather than fixing it, and irate × 300 is a twitchy two-sample estimate scaled to the wrong unit.'),
      mcq('Prometheus series grow from 200,000 to 9 million after a middleware change. What is the most likely cause?', [
        ['A label now carries raw URL paths that contain payment ids', true],
        ['The scrape interval was shortened from 30 seconds to 15 seconds', false],
        ['Two more replicas of payments-api were added by the autoscaler', false],
        ['Grafana dashboards started querying the data far more often', false],
      ], 'Unbounded label values create a new series for every id. A shorter interval stores more samples per series, not more series; two more Pods add a small, bounded number of series; and dashboard queries do not create series.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_PRACTICE',
    notes: `Nine exercises, easiest first. Work each on paper before reading the answer. The arithmetic was checked in
Python; the queries are written from the documentation.

## 1. Minutes of budget (easy)

PaySetu's refunds API has a 99.95% availability SLO over a rolling 28 days. How many minutes of full outage does
the budget allow?

**Answer.** 0.0005 × 28 × 1,440 = 20.16 minutes — about 20.

## 2. Requests of budget (easy)

The payouts API serves 12 million requests in 30 days with a 99.5% SLO. How many failed requests may it have?

**Answer.** 12,000,000 × 0.005 = 60,000.

## 3. Burn and consumption (easy)

SLO 99.9% over 30 days. For three hours the error ratio is 0.5%. What is the burn rate and how much budget was
spent?

**Answer.** Burn rate = 0.005 ÷ 0.001 = 5. Spent = 5 × 3 h ÷ 720 h = 2.1% of the budget.

## 4. A threshold from a burn rate (easy)

The payouts API has a 99.5% SLO. What error ratio corresponds to the 6x slow-burn page?

**Answer.** 6 × 0.005 = 0.03, so 3%. Note how a looser SLO gives a much higher page threshold than 0.6% at 99.9%.

## 5. Counting series (medium)

http_request_duration_seconds has 7 bucket boundaries plus +Inf, and labels route (10 values) and pod (4 Pods).
How many series does it create?

**Answer.** Per route-and-Pod combination: 8 bucket series + _sum + _count = 10. Combinations 10 × 4 = 40. Total
400 series. Adding a status label with 6 values would make it 2,400.

## 6. Write the latency SLI (medium)

Write PromQL for the share of /v1/payments requests answered within 0.5 s over 5 minutes; a bucket edge exists at
0.5.

**Answer.**

    sum(rate(http_request_duration_seconds_bucket{route="/v1/payments", le="0.5"}[5m]))
      / sum(rate(http_request_duration_seconds_count{route="/v1/payments"}[5m]))

Buckets are cumulative, so le="0.5" already counts everything at or below 0.5 s.

## 7. Will it alarm? (medium)

A CloudWatch alarm: threshold 2 (GreaterThanThreshold), 5 evaluation periods, 3 datapoints to alarm. The last five
points are 1.2, 2.5, 1.0, 2.6, 2.9. State?

**Answer.** Three points (2.5, 2.6, 2.9) breach, which meets 3 of 5: ALARM.

## 8. Retries (medium)

A dependency fails 10% of calls independently. (a) With 3 attempts in total, what share of requests still fails?
(b) If two layers each make 3 attempts and the dependency is fully down, how many calls does one request cause?

**Answer.** (a) 0.1³ = 0.001, so 0.1%. (b) 3 × 3 = 9 calls — and none of them can succeed, because a down
dependency's failures are not independent.

## 9. Sale-day tasks (harder)

Normal peak 1,000 rps; the sale is expected at 2×. Load tests give 120 rps per task at the SLO. Run at 70% of
tested capacity and survive the loss of one of three AZs. How many tasks? How many requests are in flight if each
takes 0.4 s?

**Answer.** 2,000 ÷ (120 × 0.7) = 23.8, round up to 24; with an AZ lost, 24 × 3 ÷ 2 = 36 tasks. Little's law:
2,000 × 0.4 = 800 requests in flight.`,
    mcqs: [
      mcq('A 99.9% SLO over 30 days sees a 30-minute full outage. Roughly how much of the error budget is used?', [
        ['About 69%', true],
        ['About 30%', false],
        ['About 3%', false],
        ['About 100%', false],
      ], 'The budget is 43.2 minutes, and 30 ÷ 43.2 ≈ 0.69. 30% treats minutes as a percentage, 3% is off by a factor of ten, and 100% would need about 43 minutes.'),
      mcq('What is the 14.4x fast-burn page threshold, as an error ratio, for a 99.9% SLO?', [
        ['1.44%', true],
        ['14.4%', false],
        ['0.144%', false],
        ['0.0144%', false],
      ], 'Threshold = burn rate × (1 − SLO) = 14.4 × 0.001 = 0.0144, which is 1.44%. The other answers shift the decimal point by one or two places.'),
      mcq('A histogram has 5 bucket boundaries plus +Inf and labels route (6 values) and pod (3 Pods). How many series?', [
        ['144', true],
        ['108', false],
        ['126', false],
        ['18', false],
      ], 'Each route-and-Pod pair has 6 bucket series plus _sum and _count, so 8; and 6 × 3 = 18 pairs; 18 × 8 = 144. 108 forgets _sum and _count, 126 forgets one bucket, and 18 counts only the label combinations.'),
      mcq('An alarm needs 3 of 5 points above 2. The last five points are 2.1, 1.0, 1.9, 2.4, 1.2. What is its state?', [
        ['OK, because only two of the five points breach', true],
        ['ALARM, because the most recent breach was 2.4', false],
        ['ALARM, because the average of the five is above 1.5', false],
        ['INSUFFICIENT_DATA, because two points are below 1.5', false],
      ], 'Only 2.1 and 2.4 exceed 2, which is two of five, short of three, so the alarm is OK. The latest breach alone does not decide, alarms do not average points, and INSUFFICIENT_DATA means missing data, not low values.'),
      mcq('Peak is 2,000 rps, each task handles 120 rps at the SLO, tasks run at 70%, and one of three AZs may fail. How many tasks?', [
        ['36', true],
        ['24', false],
        ['17', false],
        ['48', false],
      ], '2,000 ÷ 84 = 23.8, rounded up to 24 for headroom, then × 3 ÷ 2 = 36 to survive an AZ loss. 24 ignores the AZ, 17 ignores the headroom, and 48 doubles instead of scaling by three-halves.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_INTERVIEW_QUESTION',
    notes: `Asked in SRE, DevOps and cloud engineer interviews at product companies, fintechs, GCCs and start-ups in
Bengaluru, Hyderabad and Pune. Say each answer aloud in about two minutes, then compare. Interviewers listen for
whether you start from the user, use numbers, and act on evidence rather than habit.

## Q1. "What is the difference between logs, metrics and traces? When do you use each?"

**Model answer.** "Metrics are numbers over time — cheap to store and fast to query — so they drive dashboards and
alerts: is the error rate up, by how much, since when. Logs are one record per event, so they explain what
happened to a particular request; I log structured JSON with a trace id. Traces show one request's path across
services with timings, so they tell me where the time went. In an incident I go metrics first to localise —
which route, which dependency — then traces to see where a slow request spends time, then logs for the exact
error. I keep high-cardinality things like merchant or payment ids out of metric labels and in logs and traces."

**Follow-up.** "Your Prometheus is running out of memory." — "Check head series count and which metric grew. It is
almost always a label with unbounded values — raw paths, user ids. Fix the instrumentation to use the route
template, and drop the label with relabelling until the fix ships."

## Q2. "How would you set SLOs for a payments API?"

**Model answer.** "Start from what merchants experience: a collect request accepted, answered quickly, and payouts
on time. That gives availability, latency and freshness SLIs, each as good over valid events, measured at the load
balancer. Exclude errors that are the client's fault. Set targets from the last few months' performance and what
users accepted — say 99.9% availability and 99% under 0.8 s over a rolling 30 days. The budget is 0.1%, 43 minutes
or, at 90 million requests, 90,000 failures. Alert on burn rate — page at 14.4x over an hour with a five-minute
window, and at 6x over six hours — and agree an error budget policy with product: freeze features when it is gone."

**Follow-up.** "Why not alert when the error rate goes above 0.1%?" — "It fires on noise and on short blips that
barely touch the budget, and it does not distinguish a slow leak from a fire. Burn-rate alerts page only when the
budget is genuinely at risk, and the short window lets them clear quickly."

## Q3. "You are paged at 2am: payments error rate is high. Walk me through it."

**Model answer.** "Acknowledge, then check impact on the SLO dashboard: how many requests, since when, which
routes. If it is serious I declare an incident and say who is IC, even if it is me. Next, what changed: deploys,
config, feature flags, dependency status pages. If a release went out just before, I roll back first and
investigate after. If not, I split by dependency — PSP, database — using per-dependency metrics and traces. I
mitigate with what the runbook gives me: fail over to the second PSP, shed non-critical load. I post updates every
30 minutes. When the SLI is back inside the SLO for a while, I resolve, and a postmortem follows."

**Follow-up.** "The rollback did not help." — "Then the change was not the cause, or not the only one. I look at
dependencies and traffic: a PSP slowdown, a sudden traffic spike, database saturation. I escalate early rather
than late."

## Q4. "A downstream service is flaky. How do you make your service resilient to it?"

**Model answer.** "Timeouts first, from its real p99 and my caller's deadline. Retries only for transient errors on
idempotent operations — with idempotency keys for payments — at one layer only, with exponential backoff and
jitter and a retry budget. A circuit breaker so that when it is down we fail fast and stop hammering it, with a
fallback such as a second provider or a queued response. Separate connection pools so it cannot starve other
calls. Then I prove it with a game day that injects the failure."

**Follow-up.** "Why not just retry five times?" — "Retries multiply across layers and arrive together; five retries
at three layers is over a hundred calls per request on a service that is already struggling."`,
    mcqs: [
      mcq('An interviewer asks how you would start investigating a 2am page about high payment errors. Which answer is strongest?', [
        ['Check impact on the SLO dashboard, then what changed, and roll back a recent release first', true],
        ['Restart all payments-api Pods first, since a restart clears most transient faults quickly', false],
        ['Read the application logs from the start of the day to understand the full background', false],
        ['Wait for the error rate to settle for an hour before acting, to avoid needless changes', false],
      ], 'Strong answers size the impact, look for the recent change and mitigate before diagnosing. Restarting blindly destroys evidence and rarely fixes a bad release, reading a day of logs wastes the first minutes, and waiting spends error budget.'),
      mcq('Asked "why alert on burn rate rather than on error rate above the SLO?", which reasoning is right?', [
        ['Burn rate pages only when the budget is at real risk, ignoring brief noise', true],
        ['Burn rate needs no metrics, since it is computed from the incident tickets', false],
        ['Error-rate alerts cannot be expressed in PromQL or in CloudWatch metric math', false],
        ['Burn rate always fires earlier than any threshold on the raw error rate', false],
      ], 'Burn-rate rules tie paging to how fast the budget is being spent, so short blips do not page and real incidents do. They are computed from the same request metrics, raw error-rate alerts are easy to write, and a low raw threshold can fire earlier — that is the noise problem.'),
      mcq('A candidate says they would make a flaky dependency reliable by "retrying five times at every layer". What is the main flaw?', [
        ['Retries multiply across layers and overload the dependency further', true],
        ['Five retries is too few to cover a dependency that is fully down', false],
        ['Retries are not supported by HTTP clients unless the server allows', false],
        ['Retries make the latency histogram lose its percentile accuracy', false],
      ], 'At three layers, five retries means up to 6 × 6 × 6 = 216 calls per request, a storm on a struggling service. More retries do not help a down dependency, HTTP clients retry freely, and histograms record retries like any other latency.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_MINI_PROJECT',
    notes: `## The scenario

**PaySetu** (fictional) is a Bengaluru fintech. Its payments-api accepts UPI collect requests from 40,000
merchants, calls one of two payment service providers (PSPs), records each payment in PostgreSQL, and a payouts
worker settles money to merchants every few minutes. Last quarter it had three outages that merchants noticed
before PaySetu did; the longest lasted 70 minutes because nobody could tell whether the PSP or PaySetu was at
fault. A partner marketplace's festive sale is eight weeks away. You are the first SRE hire. Make the service
observable, give it SLOs and an on-call that works, and prove it survives a dependency failure.

## What you build on

You may use the starter service or write your own in Python (FastAPI or Flask, a few hundred lines):

- **payments-api** — POST /v1/payments (with an Idempotency-Key header), GET /v1/payments/{id}, GET /healthz.
  It calls a PSP over HTTP and writes to PostgreSQL.
- **psp-sim** — a fake PSP you control: normal latency 100–300 ms, and switches (an admin endpoint or environment
  variables) to make it slow, return 5xx, or refuse connections.
- **payouts** — a worker that reads due payouts from PostgreSQL and "sends" them through psp-sim.

Run it on **kind** with kube-prometheus-stack (Prometheus, Alertmanager, Grafana) — no cloud account needed. An
optional AWS part publishes the same SLI to CloudWatch in your own account: set a budget alarm before creating
anything, stay inside the Free Tier where possible, use 123456789012 and placeholder ARNs in everything you commit,
and tear it down at the end.

## Data you are given

- Normal weekday peak: 300 rps on POST /v1/payments in this scaled-down version; the sale is expected at 6×.
- Merchants' integration guide says their clients time out after 10 seconds.
- The last 90 days (provided as a CSV of per-minute request and error counts) achieved 99.94% availability and
  99.2% of requests within 0.8 s.

## Deliverables

1. **Instrumentation.** RED metrics per route with bounded labels (route template, method, code); a latency
   histogram with a bucket edge at your SLO threshold; per-PSP call duration and outcome; payouts queue depth and
   payouts settled per minute. Structured JSON logs with the trace id; OpenTelemetry traces through payments-api,
   psp-sim and the database, sent through a Collector. A short CARDINALITY.md that counts your series.
2. **Dashboards.** One Grafana dashboard per service as JSON in Git, loaded by provisioning: RED top row, SLO and
   budget remaining, PSP panels, USE panels for Pods and the connection pool, and deploy annotations.
3. **SLOs.** SLO.md defining two SLOs (availability and latency for /v1/payments) — and, as a stretch, payout
   freshness — with SLIs as good over valid events, exclusions justified, targets justified from the 90-day CSV,
   budgets in minutes and in requests, and an error budget policy signed off by "product" (a classmate).
4. **Alerts.** Recording rules and multiwindow burn-rate alerts (14.4x and 6x pages, a ticket rule) for both SLOs;
   absent() on every scrape target; Alertmanager routing pages and tickets to different receivers (use a webhook
   receiver you run locally — no real pager keys in Git). A Python script, check_burn.py, that replays the CSV
   plus a synthetic incident minute by minute and shows when each rule would have fired.
5. **Runbooks.** One per paging alert, linked from runbook_url: meaning, impact check, first safe actions, rollback
   and PSP failover steps, escalation.
6. **Resilience.** Timeouts from the 10-second client deadline; one retry at the PSP adapter with backoff and full
   jitter; idempotency keys honoured; a circuit breaker per PSP with failover to the second; a separate connection
   pool per PSP; load shedding for non-payment routes.
7. **Game day.** With a load generator (k6 or Locust) at 6× peak, break psp-sim (slow, then down) for 10 minutes.
   Record what fired, when, what the on-call (you) did, and what the SLIs did. Then write a **blameless postmortem**
   using this topic's template, with timeline, budget consumed and three to five owned, dated actions.
8. **Capacity plan.** CAPACITY.md: throughput per Pod at the latency SLO from a ramp test, Pods needed for the sale
   with headroom and the loss of a node, in-flight requests by Little's law, database connections, and what you
   would raise or scale ahead on EKS.

## Milestones

- **Week 1 — signals.** Metrics, logs and traces flowing; Prometheus scraping every target; first dashboard.
- **Week 2 — SLOs and alerts.** SLO.md, recording and alerting rules, Alertmanager routing, check_burn.py, runbooks.
- **Week 3 — resilience.** Timeouts, retries, breaker, failover, pools, shedding; load tests and the capacity plan.
- **Week 4 — game day and postmortem.** Run it, record it, write it up; final README with a diagram and a
  15-minute setup from a clean laptop.

## How it will be judged

A reviewer runs your setup, opens the dashboard, flips psp-sim to "down", and watches: does the right alert page,
once, within the time your burn-rate maths predicts, with a runbook that tells them what to do? Does payments-api
fail over instead of holding connections? Then they read SLO.md and the postmortem and ask "why" about every
number. A smaller system where every number is justified beats a large one copied from a tutorial. Never commit
real keys, webhook URLs, account ids or merchant data.`,
    assignment: {
      title: 'PaySetu: SLOs and On-Call for a Payments API',
      description: 'Instrument a payments API and its payouts worker with metrics, structured logs and traces; build Grafana dashboards; define availability and latency SLOs with error budgets and multiwindow burn-rate alerts; write runbooks; add timeouts, retries with jitter, idempotency, circuit breakers and failover; run a game day that breaks a payment provider under load; and write the blameless postmortem and a sale-day capacity plan.',
      instructions: `1. Run payments-api, psp-sim and payouts on a kind cluster with kube-prometheus-stack; instrument RED metrics with bounded labels, a latency histogram with a bucket edge at the SLO threshold, per-PSP metrics, queue depth, JSON logs with trace ids and OpenTelemetry traces through a Collector; write CARDINALITY.md.
2. Commit one Grafana dashboard per service as provisioned JSON with RED, SLO and budget, PSP, USE and deploy-annotation panels.
3. Write SLO.md: SLIs as good over valid events with justified exclusions, targets justified from the 90-day CSV, budgets in minutes and requests, and an error budget policy.
4. Add recording rules, 14.4x and 6x multiwindow burn-rate pages and a ticket rule for each SLO, absent() checks for every target, and Alertmanager routing to a local webhook receiver; write check_burn.py to replay the CSV plus a synthetic incident and report when each rule fires.
5. Write a runbook for every paging alert and link it from runbook_url.
6. Implement timeouts derived from the 10-second client deadline, one jittered retry at the PSP adapter, idempotency keys, a circuit breaker per PSP with failover, separate pools per PSP, and load shedding for non-payment routes.
7. Run a game day at 6× peak that makes psp-sim slow and then down for 10 minutes; record alerts, actions and SLIs; write a blameless postmortem with timeline, budget consumed and three to five owned, dated actions.
8. Write CAPACITY.md from a ramp test: per-Pod throughput at the latency SLO, Pods for the sale with headroom and node loss, Little's law, database connections, and scale-ahead steps for EKS. Finish with a README and diagram that let a reviewer run everything in 15 minutes.`,
      rubric: [
        { criterion: 'Instrumentation and dashboards', description: 'RED and USE metrics with bounded labels and a counted series budget; structured logs joined to traces by id; traces across services through a Collector; provisioned dashboards that answer "is it broken, where, since when" at a glance.', maxPoints: 20 },
        { criterion: 'SLOs and error budgets', description: 'User-facing SLIs as good over valid events with justified exclusions; targets derived from the data; budgets correctly computed in minutes and requests; a concrete error budget policy.', maxPoints: 20 },
        { criterion: 'Alerting and runbooks', description: 'Correct multiwindow burn-rate rules and recording rules, absent() checks, sensible Alertmanager routing and grouping; check_burn.py shows when each rule fires; every page has a usable runbook.', maxPoints: 20 },
        { criterion: 'Resilience patterns', description: 'Timeouts from the client deadline, a single jittered retry, idempotency keys, a working circuit breaker with failover, isolated pools and load shedding — each demonstrated, not just coded.', maxPoints: 15 },
        { criterion: 'Game day and postmortem', description: 'A recorded game day with real alert and SLI evidence, and a blameless postmortem with an accurate timeline, budget consumed and few, specific, owned and dated actions.', maxPoints: 15 },
        { criterion: 'Capacity plan and README', description: 'Capacity numbers derived from a load test with headroom, failure tolerance, Little\'s law and database limits; a README that gets a reviewer running in 15 minutes.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the game day, psp-sim is made fully unavailable for ten minutes at 6× peak. Which outcome shows the resilience work succeeded?', [
        ['PSP-A\'s breaker opens, payments fail over to PSP-B, and one fast-burn page fires', true],
        ['Every payment request waits for the full 10-second deadline and then succeeds', false],
        ['No alert fires at all, as the retries hide every failure from the SLIs', false],
        ['payments-api restarts its Pods until psp-sim comes back after ten minutes', false],
      ], 'The breaker should stop calls to the dead PSP and route to the other, and the SLO alerting should page once if the budget is burning. Waiting for the full deadline means no timeouts or breaker are working, silent retries would be a monitoring gap (or would overload PSP-B), and restarts are not a resilience mechanism.'),
      mcq('PaySetu\'s 90-day data shows 99.94% availability. Which availability SLO is best justified for SLO.md?', [
        ['99.9%, a little below what the service has achieved', true],
        ['99.99%, to push the team to improve the service', false],
        ['99.94%, exactly what the last 90 days achieved', false],
        ['99%, so that the budget can never be exhausted', false],
      ], 'A target just below achieved performance, which users have accepted, leaves a usable budget. 99.99% is aspirational and would be exhausted at once, an exact match leaves no margin for normal variation, and 99% is so loose that real incidents would never register.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CL_OBSERVABILITY_SRE_CHECKPOINT',
    notes: `Ten questions across the topic: the three signals, CloudWatch, Prometheus and Grafana, SLOs and error
budgets, incidents and postmortems, and reliability and capacity. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('PaySetu\'s merchants report slow payments, but the all-routes p99 panel looks normal. What should the engineer look at next?', [
        ['The latency histogram split by route, to localise the slow path', true],
        ['The average latency across all routes, which is more stable', false],
        ['The CPU utilisation panel, since slowness always starts there', false],
        ['The application logs for the whole day, read from the start', false],
      ], 'An aggregate can hide one slow route among many fast ones; splitting by route localises the problem before traces and logs. An average hides the tail even more, CPU is a cause that is often normal during dependency slowness, and reading a day of logs is slow and unfocused.'),
      mcq('A metric filter on a CloudWatch log group is created at 15:00 to count PSP errors. An engineer then graphs it for 09:00–17:00. What appears?', [
        ['Only errors in lines ingested after 15:00', true],
        ['Errors from 09:00, as the filter re-reads', false],
        ['Nothing at all until the next day begins', false],
        ['Every error ever logged in the log group', false],
      ], 'Metric filters apply to log events as they are ingested, so the metric starts when the filter was created. For earlier hours, query the stored logs with Logs Insights.'),
      mcq('Which PromQL expression gives the error ratio of payments-api over the last five minutes across all Pods?', [
        ['sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))', true],
        ['rate(sum(http_requests_total{code=~"5.."})[5m:]) / rate(sum(http_requests_total)[5m:])', false],
        ['sum(http_requests_total{code=~"5.."}) / sum(http_requests_total)', false],
        ['sum(irate(http_requests_total{code=~"5.."}[5m])) / count(http_requests_total)', false],
      ], 'Rate each Pod\'s counters over the window, then sum, then divide. Summing before rate breaks on resets, raw counters give the ratio since each process started rather than the last five minutes, and dividing by a count of series is meaningless.'),
      mcq('An Alertmanager route sends severity="page" to the pager and everything else to a chat channel, grouped by alertname and service. Twenty Pods of payments-api trigger the same alert at once. What does the on-call receive?', [
        ['One grouped page listing the affected Pods', true],
        ['Twenty separate pages, one for each Pod', false],
        ['Nothing, since grouping waits for an hour', false],
        ['One chat message, as groups go to chat only', false],
      ], 'Alerts sharing the group_by labels are combined into one notification after group_wait, sent to the route\'s receiver. Grouping exists to avoid twenty pages, group_wait is seconds not an hour, and the severity route still decides the receiver.'),
      ck('SLI_SLO', 'payments-api has a 99.9% SLO over 30 days and 90 million requests a month. A bad release causes 27,000 failed requests. How much of the budget did it use?', [
        ['30% of the error budget', true],
        ['3% of the error budget', false],
        ['0.03% of the error budget', false],
        ['27% of the error budget', false],
      ], 'The budget is 0.1% of 90 million, 90,000 requests, and 27,000 ÷ 90,000 = 0.3. 3% and 0.03% misplace the decimal, and 27% treats thousands of requests as a percentage.'),
      ck('SLI_SLO', 'Over a 30-day window with a 99.9% SLO, the payments error ratio sits at 0.6% for six hours. Which statement is correct?', [
        ['It is a 6x burn that spent 5% of the budget, so the slow-burn page fires', true],
        ['It is a 0.6x burn that spent 0.5% of the budget, so nothing should fire', false],
        ['It is a 60x burn that spent the whole budget, so the fast-burn page fires', false],
        ['It is a 6x burn that spent 36% of the budget, so the release must be frozen', false],
      ], 'Burn rate is 0.006 ÷ 0.001 = 6, and 6 × 6 h ÷ 720 h = 5% of the budget — exactly the slow-burn paging condition. The other options misread the ratio or forget to divide by the window.'),
      ck('INCIDENT_MANAGEMENT', 'Payments start failing three minutes after a configuration change to the PSP client. The cause is unclear. What should the Incident Commander direct first?', [
        ['Revert the configuration change, then investigate once the bleeding stops', true],
        ['Hold all changes until the root cause has been found and fully explained', false],
        ['Start the postmortem document so that the timeline is not forgotten later', false],
        ['Ask each engineer on the call to debug a different part of the system', false],
      ], 'Mitigation comes before diagnosis, and a change just before the failure is the first suspect; reverting it is fast and safe. Waiting for root cause prolongs the outage, the postmortem comes later (the scribe keeps the timeline), and unfocused debugging is not mitigation.'),
      ck('INCIDENT_MANAGEMENT', 'Which postmortem practice makes it most likely the same outage does not happen again?', [
        ['A few specific, owned, dated actions tracked to closure in a weekly review', true],
        ['A long list of every improvement idea anyone mentioned during the review', false],
        ['Naming the engineer who made the change, so they are careful next time', false],
        ['Publishing it only to the team involved, so that nobody else is alarmed', false],
      ], 'Actions get done when they are few, concrete, owned, dated and reviewed until closed. Long wish-lists are never finished, blame makes people hide details, and keeping it private stops other teams learning.'),
      ck('RELIABILITY_PATTERNS', 'PSP-A slows to 20-second responses, and payments-api, with no timeout, runs out of threads — even its health check and refunds fail. Which pair of patterns would have contained this?', [
        ['A short timeout on PSP calls and a separate connection pool for each PSP', true],
        ['More retries on PSP calls and a longer read timeout on the health check', false],
        ['A larger thread pool for the whole service and a bigger ECS task size', false],
        ['Turning off the health check and routing the refunds through PSP-A only', false],
      ], 'A timeout releases threads quickly, and a bulkhead (separate pool per dependency) stops one slow PSP consuming the capacity everything else needs. More retries add load, bigger pools only delay exhaustion, and disabling health checks hides the failure.'),
      ck('CAPACITY_PLANNING', 'Before a festive sale expected at 6× normal peak, which step matters most besides adding tasks?', [
        ['Raise service quotas and scale ahead on a schedule before the sale opens', true],
        ['Rely on reactive autoscaling alone, since it reacts within a few seconds', false],
        ['Lower the latency SLO for the day so that slow responses still count', false],
        ['Turn off all alerts during the sale to avoid paging the on-call engineer', false],
      ], 'A step change arrives faster than reactive scaling and can hit account quotas, so quotas are raised and capacity is scheduled in advance. Autoscaling lags behind a sudden spike, moving the SLO hides real impact, and the sale is when alerts matter most.'),
    ],
  },
];
