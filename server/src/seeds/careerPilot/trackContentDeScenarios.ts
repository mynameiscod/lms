/**
 * Career-track placement content: Data Engineering Scenario Rounds (DE_SCENARIO_ROUNDS), Data Engineer, batch DE4.
 *
 * The rounds after the question-and-answer interview: a whiteboard pipeline design, a broken pipeline or wrong numbers
 * investigated aloud, a SQL-and-modelling take-home, and a Spark job optimised with the interviewer, then a timed set.
 * Each round unit walks one full scenario — what the interviewer is testing, the checks in order and what to say aloud,
 * how it is scored and how candidates fail — and refers back to the track's modelling, ingestion, SQL, Spark, dbt,
 * orchestration, streaming and quality topics by title rather than re-teaching them. Companies and data are fictional.
 *
 * Verified on a laptop: the wrong-numbers bug was reproduced in DuckDB 2.0 on 338,688 synthetic orders (796,540 order
 * versions, nine nightly extracts) and every table quoted is its real output; the take-home is a real dbt-core 1.12 +
 * dbt-duckdb project on synthetic raw files (dbt build output and the answer queries quoted as run); the Spark round's
 * plans and timings came from PySpark 3.5.9 in local mode (local[4]) on 4 million synthetic UPI transactions, run with
 * Spark's noop writer because Spark cannot write files on this Windows machine. Design-round capacity arithmetic and
 * every percentage were checked in Python. Kinesis, Airflow, Debezium and Athena are written from their documentation.
 * Default skill DATA_PIPELINES; SPARK_ROUND measures BATCH_STREAM_PROCESSING and SQL_MODELLING_TAKEHOME DATA_MODELLING;
 * elsewhere ck() names those skills.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_SCENARIO_ROUNDS_BUNDLES: PilotBundle[] = [
  /* ── PIPELINE_DESIGN_ROUND ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_PIPELINE_DESIGN_ROUND',
    notes: `Most data engineer loops — a product company in Bengaluru, a GCC in Hyderabad, a services firm's data practice in
Pune — have a round that starts "Design a pipeline for X." It runs 45 minutes on a whiteboard or a shared Excalidraw.
**The interviewer is testing whether you design to stated requirements — sources, freshness, volume, correctness — and
can defend each box with a reason and a cost.** A diagram with Kafka, Flink, Spark, Snowflake and Airflow and no numbers
scores below one with five boxes, a volume sum and "I chose micro-batch here because the requirement is 15 minutes."

You have the parts from *Data Formats*, *Ingesting from APIs*, *Extracting from Databases*, *Idempotent, Restartable
Loads*, *The Lakehouse and Medallion Layers*, *Batch, Micro-batch and Streaming* and *The AWS Data Stack*. This round is
putting them in order under questioning.

## The shape of 45 minutes

| Minutes | What you do |
|---|---|
| 0–7 | Requirements: sources, consumers, freshness, volume, correctness, team — ask, then write them in a corner |
| 7–12 | Numbers aloud: rows and bytes per day, peak rate, API calls |
| 12–25 | The diagram, one source at a time, through bronze, silver and gold |
| 25–40 | Deep dives the interviewer picks: late data, reruns, failure, cost |
| 40–45 | Risks, monitoring, what you would build next |

## A full round

**Interviewer:** "BazaarBee, a fictional Jaipur e-commerce marketplace, wants a data platform for its Diwali sale.
Design the pipelines."

**Candidate asks, and the interviewer answers.** Three sources: orders in PostgreSQL on RDS (300,000 a day normally,
3 million on a sale day, about 1 KB a row, statuses change for up to 7 days because of returns); app clickstream events
(40 million a day, 400 million on a sale day, about 0.5 KB each as JSON); a logistics partner's REST API for shipment
status (100 shipments per page, 10 requests a second allowed, an updated_since filter). Consumers: a sales dashboard
for the sale war-room, at most 15 minutes behind; finance's daily revenue by 07:00 IST, correct to the rupee and matched
to the payment gateway's settlement file; a data science team that wants daily features from clicks. Team: three data
engineers, AWS.

**Numbers, said aloud (checked in Python):**

    clicks, sale day:   400M x 0.5 KB = 200 GB/day of JSON; as Parquet, perhaps 20-40 GB (5-10x)
    clicks, rate:       400M / 86,400 s = 4,630 events/s average; assume 3x at peak = about 13,900/s
    orders, sale day:   3M x 1 KB = 3 GB/day; 35 rows/s average -- small
    logistics, full:    3M shipments / 100 per page = 30,000 calls; at 10/s = 50 minutes
    logistics, 15 min:  3M / 96 windows = 31,250 shipments = 313 calls = about 31 s (94 s at 3x peak)

"So orders are small but must be correct, clicks are big but only need to be daily, and the API is fine incrementally
but a full pull would not fit inside a 15-minute window. The only 15-minute requirement is the sales dashboard, and it
needs orders — not clicks. Clicks need a stream to absorb them, not stream processing."

**The design, one source at a time:**

    orders:    RDS read replica --(every 15 min, updated_at watermark, 10 min overlap)--> S3 bronze (raw rows + run_id)
               --> MERGE on order_id, latest updated_at wins --> silver.orders (Iceberg) --> gold.sales_15min
    clicks:    app SDK --> Kinesis Data Streams (on-demand) --> Firehose --> S3 bronze, Parquet, by hour
               --> hourly Spark job: dedupe on event_id --> silver.events --> daily dbt --> gold.click_features
    shipments: Python job every 15 min, updated_since cursor, backoff on 429 --> bronze JSON --> MERGE --> silver
    finance:   02:00 IST: dbt rebuilds gold.daily_revenue for the last 7 days (partition overwrite)
               --> reconciliation against the settlement file --> publish only if it matches
    run by Airflow (MWAA); Glue catalogue; Athena for ad-hoc and dbt; QuickSight on gold

**Defending the choices:**

- **Micro-batch, not CDC, for orders.** 15 minutes is the requirement; a watermark extract from the read replica with an
  overlap and a MERGE meets it with parts a team of three already knows. Say the condition that changes it: "If rows
  are hard-deleted or updated_at is not reliable, I'd move to log-based CDC with DMS or Debezium."
- **Kinesis to Firehose for clicks, no stream processing.** 13,900 events a second must be absorbed — that is the
  stream's job — but nobody needs them in under an hour. A shard takes up to 1,000 records or 1 MB a second, so
  provisioned mode would need about 14 shards plus headroom at peak; on-demand mode removes that sizing on sale day.
- **MERGE on order_id, not append.** Statuses change for 7 days, so silver holds one row per order; an append would
  count an order once per version ("Upserts with MERGE"). The overlap window means some rows arrive twice — MERGE makes
  that harmless.
- **Finance rebuilds 7 days every night.** Returns change past days; overwriting those partitions is idempotent, and
  the reconciliation gate stops a wrong number reaching finance.
- **Iceberg on S3 with Athena, not Redshift.** Three engineers, spiky use, pay per query; Redshift earns its place if
  dashboards with many concurrent users hit it all day. Azure equivalent: ADLS Gen2, Event Hubs, Data Factory, Synapse.

**Failure and operations, before being asked:** every load is safe to rerun for its interval; a uniqueness test on
silver.orders.order_id and a freshness alert at 30 minutes on gold.sales_15min; the clicks bucket has a lifecycle rule.
Cost drivers, not prices: Kinesis shard or on-demand hours and data, Athena bytes scanned (partition and Parquet keep
it down), MWAA environment hours, S3 storage.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Requirements | 15% | asks about freshness, volume and correctness before drawing; writes them down |
| Quantitative reasoning | 20% | volumes, rates and API time worked out aloud and used to decide |
| Architecture | 25% | each source traced to gold; grain and layer of every table stated |
| Correctness | 20% | idempotent loads, late and changed data, deduplication, a reconciliation gate |
| Trade-offs and operability | 20% | every major choice has a reason, a cost and the condition that would change it |

**Ways to lose:** drawing before asking; streaming everything because the sale "sounds real-time"; no numbers;
"append to the lake" for rows that change; never saying how a failed night is rerun; "Spark" for 3 GB a day; defending
a choice with "it's industry standard"; being thrown by a challenge instead of saying "fair — here is what changes."`,
    workedExample: `**Interviewer (deep dive): "Sale day is ten times normal. What breaks first, and what do you do the week before?"**

**Answered badly.** "Everything is serverless or managed, so it scales automatically. I'd just increase the Spark
cluster size to be safe."

Why it fails: it names no component and no number. Managed services have limits, and the bottleneck is rarely the one
you scale by reflex.

**Answered well.** "I'd go through each path with its sale-day number.

Clicks: 13,900 events a second at peak. Kinesis on-demand scales, but it adapts to recent peaks, so I'd check its
documented behaviour for a sudden jump or switch to provisioned with about 20 shards for the sale week. Firehose
flushes when its size or time buffer fills, so at ten times the rate it writes full-size files more often — more files,
none tiny, and the hourly job compacts them — fine.

Orders: 3 million rows a day is still small, but the 15-minute extract runs on the read replica, and on sale day the
replica is also serving the app's reads. I'd measure the extract's duration in a load test and keep its query on an
index on updated_at — a full scan of a growing table is what breaks first here.

Logistics: a 15-minute window needs about 94 seconds of calls at three times the average rate — fine — but if the
partner throttles, the job must back off and catch up next window, not fail the DAG.

Finance: the 02:00 rebuild of 7 days reads ten times more rows. I'd time it on a copy of last year's sale data.

The week before: replay last Diwali's volume through the staging environment, set freshness and lag alerts, freeze
schema changes on the orders table, and put the rerun steps for each job in the runbook."

Why it works: it walks every path with its own number, names the real bottleneck (the replica and its index, not
Spark), and turns "scale" into tests, alerts and a freeze.`,
    mcqs: [
      mcq('BazaarBee\'s only 15-minute requirement is the sales dashboard, which reads orders. What does that imply for the 400-million-a-day clickstream?', [
        ['It can land through a stream into S3 and be processed hourly or daily', true],
        ['It needs Spark Structured Streaming so the war-room sees every click live', false],
        ['It must be merged into the orders table every 15 minutes to stay in step', false],
        ['It should be pulled from the app\'s database once a night with a full extract', false],
      ], 'A stream absorbs the event rate, but no consumer needs clicks within minutes, so batch processing after landing meets every stated requirement at lower cost. Live stream processing would answer a requirement nobody gave, and clicks are neither part of the orders table nor stored in an app database.'),
      mcq('The logistics API returns 100 shipments per call and allows 10 calls a second. Why does the design pull with an updated_since cursor every 15 minutes rather than a full pull?', [
        ['A full pull of 3 million shipments needs 30,000 calls, 50 minutes', true],
        ['A full pull would return shipments in a random order every time', false],
        ['The API refuses any request that has no updated_since parameter', false],
        ['Cursors make the API return compressed pages that load faster', false],
      ], '3,000,000 / 100 = 30,000 calls, and at 10 a second that is 3,000 seconds — longer than the window. An incremental pull of one window\'s changes is about 313 calls. Ordering, compression and a mandatory parameter were never stated and do not drive the choice.'),
      mcq('Why does the design MERGE orders into silver on order_id instead of appending each 15-minute extract?', [
        ['Orders change status for days; an append would count every version', true],
        ['Appends are not supported on Iceberg tables stored in Amazon S3', false],
        ['MERGE reads less data from the read replica than an append does', false],
        ['Appending would break partition pruning on the order date column', false],
      ], 'Silver holds one row per order at its latest state; with an overlap window and later status changes, an append keeps several rows per order and inflates every sum. Iceberg supports appends, the extract reads the same rows either way, and pruning is unaffected by how rows are written.'),
    ],
    checkpoint: [
      mcq('Sale-day clicks are 400 million events a day at about 0.5 KB each. Which figure should the candidate say aloud?', [
        ['About 200 GB of JSON a day and roughly 4,600 events a second on average', true],
        ['About 20 GB of JSON a day and roughly 46,000 events a second on average', false],
        ['About 2 TB of JSON a day and roughly 460 events a second on average', false],
        ['About 200 MB of JSON a day and roughly 4,600 events a minute on average', false],
      ], '400,000,000 × 0.5 KB = 200,000,000 KB = 200 GB, and 400,000,000 / 86,400 s ≈ 4,630 events a second. The other options slip a factor of ten or confuse seconds with minutes, which would size the stream wrongly.'),
      mcq('The interviewer asks why the orders feed is not log-based CDC. Which reply defends the micro-batch choice best?', [
        ['15-minute extracts meet the requirement; CDC if deletes or updated_at fail us', true],
        ['CDC is not available for PostgreSQL on RDS, so micro-batch is the only route', false],
        ['Micro-batch can never miss a change, while CDC regularly loses some events', false],
        ['CDC would need a second database, which doubles the cost of the RDS setup', false],
      ], 'A good defence ties the choice to the requirement and names the condition that would change it. RDS PostgreSQL supports logical replication for DMS and Debezium, watermark extracts can miss hard deletes and badly maintained updated_at, and CDC reads the log rather than needing a second database.'),
      mcq('Finance needs daily revenue correct to the rupee by 07:00, and returns change orders for up to 7 days. Which design meets that?', [
        ['Rebuild the last 7 days\' partitions nightly, then reconcile before publishing', true],
        ['Append each night\'s new orders to gold once, then never touch older days', false],
        ['Compute revenue in the dashboard tool on every page view from bronze data', false],
        ['Rebuild the entire history of the revenue table from scratch every 15 minutes', false],
      ], 'Overwriting the window that can still change is idempotent and catches returns, and the reconciliation gate keeps a wrong number from reaching finance. Append-once misses returns, bronze holds duplicates and raw versions, and a full rebuild every 15 minutes costs far more than the requirement needs.'),
    ],
  },

  /* ── BROKEN_PIPELINE_ROUND ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_BROKEN_PIPELINE_ROUND',
    notes: `The broken-pipeline round is the data engineer's version of live troubleshooting: "The DAG failed at 3 a.m.", "This
dashboard is wrong", "This job took twice as long last night." It is spoken, and the interviewer answers each check
you ask for. **The panel scores the order of your checks and what each one rules out, not how fast you name a cause.**
A candidate who guesses "duplicates" in the first minute and is right scores below one who reconciles, walks the
layers and proves it — because at work the guess is wrong half the time.

The tools are from *Data Quality: What Can Go Wrong*, *Data Observability and Lineage*, *Idempotent, Restartable Loads*
and *Extracting from Databases*. This round is using them aloud, in an order you can defend.

## The method to say aloud

1. **Scope and confirm.** Which number, which days, compared with what truth? Reconcile per day before anything else.
2. **What changed?** Code, config, schedule, the source's behaviour. Most wrong numbers follow a change.
3. **Walk the layers backwards:** gold, silver, bronze, source. Find the first layer where the count is wrong.
4. **Check the grain there:** rows against distinct keys. Look at a few bad rows with their load metadata.
5. **One hypothesis with a prediction, then the fix, the backfill and the prevention.**

## A full round (reproduced in DuckDB on synthetic data)

**Interviewer:** "DabbaDrop, a fictional Mumbai food-delivery app. Wednesday 21 October, 09:30. Finance says the
dashboard's GMV for Sunday and Monday is about a quarter higher than the payment gateway's settlements. Every Airflow
run is green. Go."

**Candidate:** "Green runs mean nothing failed loudly, so this is a correctness problem. First I'd confirm and scope
it: gold against the orders source, per day, for the last week."

    order_date  source_orders  gold_orders  gmv_diff_pct
    2026-10-14          33323        33818           1.5
    2026-10-15          34665        35183           1.5
    2026-10-16          34847        35379           1.5
    2026-10-17          38851        40196           3.5
    2026-10-18          39481        49946          26.7
    2026-10-19          34077        42435          24.6
    2026-10-20          34177        32724          -4.2

"Three patterns, so maybe more than one cause: a steady 1.5% before Saturday, a jump of a quarter on Sunday and Monday,
and Tuesday *under*. I'll chase the big one first. Did anything change on Sunday or Monday?"

**Interviewer:** "On Monday the extract was changed. It used to pull orders *created* on the day; now it pulls rows
*updated* on the day, so refunds come through. The run for Monday's data was the first with the change."

**Candidate:** "Then I'd walk the layers for Sunday, counting rows and distinct order ids."

    layer          rows    ids
    source (OLTP)  42324   42324
    bronze         54490   42324
    silver         52836   42324

"Nothing is lost — every id is there — but bronze and silver hold more rows than orders. So the grain of silver is
broken: it should be one row per order. Per day:"

    created     rows   ids    extra
    2026-10-16  37453  37453      0
    2026-10-17  42531  41798    733
    2026-10-18  52836  42324  10512
    2026-10-19  44990  36630   8360
    2026-10-20  34616  34616      0

"Let me see a duplicated order with its load metadata."

    order_id  created_at           updated_at           status     rating  extract_date
    223492    2026-10-18 21:24:06  2026-10-18 22:01:18  DELIVERED  NULL    2026-10-18
    223492    2026-10-18 21:24:06  2026-10-19 13:38:34  DELIVERED  3       2026-10-19

"The same order twice: once from Sunday's created-on extract, again on Monday because the customer rated it, which
touched updated_at. The SELECT DISTINCT in silver keeps both because the rating differs. Hypothesis: the new filter
re-extracts every order updated on a later day — ratings and refunds — and silver appends. Prediction: the extracts
from Monday onwards contain orders created on earlier days."

    extract_date  rows   created_earlier
    2026-10-18    42324      0
    2026-10-19    47240  12225
    2026-10-20    45265  10649

"Confirmed. That also explains the other patterns. Saturday is a little high because late-night Saturday orders were
rated or refunded on Monday. Tuesday is low because orders whose last change — a late delivery, a rating, a refund —
came after midnight now carry Wednesday's updated_at and arrive in tonight's extract: Tuesday is provisional, not
wrong. And the old 1.5% is the reason for the change: refunds after the
extract were never captured. So the change was right; the load did not change with it."

**The fix, said in order:**

    -- silver keeps the latest version of each order
    select * from bronze_orders
    qualify row_number() over (partition by order_id order by updated_at desc, extract_date desc) = 1

Rebuilt from bronze, the gap against the source becomes:

    2026-10-14 1.51 | 15 1.53 | 16 1.52 | 17 1.56 | 18 0.0 | 19 0.09 | 20 -4.2

"Sunday and Monday are right. The four earlier days still carry the old refund gap: their refunds were never
extracted, so they need a one-off re-extract by updated_at for that window, then a rebuild. Tuesday fills in tonight.
In production I'd make silver a MERGE on order_id rather than a nightly rebuild, tell finance which days changed and
why, and add prevention: a uniqueness test on silver.order_id — it would have failed on Monday's run with 19,594
order ids appearing more than once — and a daily reconciliation against settlements that blocks publishing above a
threshold."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Method | 30% | confirms against a truth first; asks what changed; walks layers in order |
| Evidence | 25% | counts and grain checks read correctly; each check rules something out |
| Hypothesis and test | 20% | one cause stated with a prediction, then checked |
| Fix, backfill, prevention | 15% | the load fixed, affected days rebuilt, a test that would have caught it |
| Communication | 10% | thinks aloud; tells finance which numbers change and why |

**Ways to lose:** "add DISTINCT to the gold query" (it hides the symptom and DISTINCT did not even work here);
rerunning the DAG and hoping; blaming the source team before reconciling; fixing the load without backfilling the bad
days; missing that two other patterns exist; deleting the duplicates by hand in production.`,
    workedExample: `**Interviewer: "DabbaDrop's nightly dbt job took 40 minutes for months. Last night it took 85. Nothing was deployed. Go."**

**Answered badly.** "The warehouse is probably under load. I'd move the job to a bigger warehouse size and see if it
comes back to 40."

Why it fails: it changes the system before knowing where the time went, and it costs money every night if the cause
is somewhere else.

**Answered well.** "First, where did the time go? dbt writes the timing of every model to target/run_results.json, so
I'd compare last night's model timings with the night before and sort by the difference."

**Interviewer:** "fct_order_items went from 6 minutes to 49. Everything else is within a minute of normal."

"One model, so not the warehouse in general. Next: did its input grow, or did its plan change? It is incremental, so
I'd count the source rows its filter picked up — rows with updated_at after the table's previous maximum."

**Interviewer:** "Normally about 1.2 million. Last night, 36 million. The output table grew by the usual 1.2 million."

"So it read 30 times the input and wrote the normal output — rows were updated without really changing. That looks
like an upstream backfill touching updated_at on a month of rows. I'd ask the orders team whether they ran one."

**Interviewer:** "They did — a 30-day data fix, done once."

"Then the slow night is explained and should not repeat; I'd confirm tonight's run is back near 40 minutes. The
output is still correct, because the model merges on the key. Prevention: a volume monitor on the model's input that
alerts at, say, three times normal, so the next backfill is a message, not a mystery; and an agreement that upstream
backfills are announced in the data channel. If they become routine, the model could compare a row hash and skip rows
whose content did not change."

Why it works: time is located before anything is changed, input volume is separated from plan changes, the cause is
confirmed with its owner, correctness is checked, and the prevention is a monitor rather than a bigger warehouse.`,
    mcqs: [
      mcq('In DabbaDrop\'s round, every Airflow run is green but finance says GMV is a quarter too high. What should the candidate do first?', [
        ['Reconcile gold against the orders source per day, to confirm and scope it', true],
        ['Add DISTINCT to the gold revenue query so that any duplicates are removed', false],
        ['Rerun the last two nights of the DAG to see whether the numbers correct', false],
        ['Ask the source team to fix their export, since the pipeline itself passed', false],
      ], 'Green runs only say nothing failed loudly; a per-day reconciliation confirms the problem, sizes it and shows which days are affected — here it revealed three different patterns. DISTINCT hides symptoms, rerunning the same code reproduces the same numbers, and blaming the source comes before any evidence.'),
      mcq('For 18 October, the source has 42,324 orders, bronze has 54,490 rows with 42,324 distinct ids, and silver 52,836 rows. What does that show?', [
        ['No orders are missing; the one-row-per-order grain is broken', true],
        ['About 12,000 orders were lost between the source and bronze', false],
        ['Silver is correct because it has fewer rows than bronze holds', false],
        ['The source has duplicates that the extract copied into bronze', false],
      ], 'Equal distinct ids at every layer mean nothing was lost, while extra rows mean some orders appear more than once. Silver still has 10,512 extra rows, so fewer than bronze does not make it right, and the source has exactly one row per id.'),
      mcq('Silver used SELECT DISTINCT on the extracted rows, yet duplicates survived. Why?', [
        ['The two versions of an order differ in updated_at and rating, so both are distinct', true],
        ['DISTINCT only removes duplicates within a single extract file, never across days', false],
        ['DuckDB\'s DISTINCT ignores timestamp columns when it compares any two rows', false],
        ['DISTINCT needs an index on order_id before it can remove duplicate orders', false],
      ], 'DISTINCT removes rows that are identical in every column; a later version of the same order differs, so it stays. Deduplication must be by the key with a rule for which version wins, such as the latest updated_at. DISTINCT works across the whole input and needs no index.'),
    ],
    checkpoint: [
      mcq('After the fix, 18 and 19 October match the source but 14–17 October are still about 1.5% high. What is the right next step?', [
        ['Re-extract those days by updated_at to pick up their refunds, then rebuild', true],
        ['Accept 1.5% as normal noise, since every pipeline has some small difference', false],
        ['Subtract 1.5% from those days\' totals in gold so the dashboard agrees', false],
        ['Rerun the old created_at extract for those days, which held all refunds', false],
      ], 'The remaining gap is refunds that the old created-on extract never captured, so the data must be fetched and the days rebuilt. Treating it as noise or patching totals hides a known cause, and the old extract is exactly what missed them.'),
      mcq('In DabbaDrop\'s reconciliation, Tuesday 20 October is 4.2% below the source. What does the candidate conclude?', [
        ['Orders last changed after midnight arrive tonight, so Tuesday is provisional', true],
        ['The new extract loses 4.2% of orders permanently, so it must be reverted', false],
        ['The source over-counts Tuesday, since gold is the more trusted number', false],
        ['The dedup step removed real orders, so the QUALIFY clause is too strict', false],
      ], 'Under an updated-on filter, orders whose latest change falls after midnight are picked up by the next night\'s extract, so the newest day fills in later and should be labelled provisional. Nothing is lost for good, and the dedup ran after this gap already existed.'),
      mcq('Which test would have failed DabbaDrop\'s run on the first night of the extract change?', [
        ['A uniqueness test on silver.orders.order_id, which 19,594 ids broke', true],
        ['A not-null test on gold GMV, which every day of the dashboard passed', false],
        ['A row-count test that gold has at least one row for every order date', false],
        ['A freshness test that the extract finished before 03:00 IST each night', false],
      ], 'Silver\'s grain is one row per order, and a uniqueness test checks exactly that; it would have flagged 19,594 duplicated ids. The other tests all passed while the numbers were wrong — values were present, every date had rows, and the runs were on time.'),
    ],
  },

  /* ── SQL_MODELLING_TAKEHOME ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_SQL_MODELLING_TAKEHOME',
    notes: `Analytics engineering and many data engineering loops — start-ups, product companies, some GCC teams — send a
take-home: raw files, three business questions, "model it, write the transformations and tests, and a README. About
four hours; submit within 72." A 30-minute debrief follows. **Reviewers are testing whether they would merge your
work: is every table's grain declared and tested, did you find the traps in the data, are the answers right, and does
it run from the README?** More submissions fail on a duplicated row inflating an answer, or a README that does not
run, than on missing features.

You built every part already in *Dimensional Modelling*, *SQL as a Pipeline Language*, *ELT and dbt* and *Tests,
Documentation and Sources*. This unit is choosing which parts and presenting them.

## The brief

> PadhaiPal, a fictional Indore ed-tech start-up, sends four CSV files: learners, courses, enrolments and lesson events.
> Questions: (1) net revenue by course by month, (2) completion rate per course, (3) how many paid learners never
> started. Use any SQL engine. We will run your project.

## Hour one: profile before you model

Load the files as they are (dbt seeds into DuckDB here) and count the traps before writing a model. On the real files:

    trap                                      n
    learner rows with a repeated learner_id  12
    duplicate completion events             834
    enrolments for unknown courses            1
    refunded enrolments                      90

Plus two you see by eye: amount_paid is text with Indian digit grouping ("2,999"), and timestamps end in Z — UTC, while
the business reports in IST. Write each in the README's assumptions section as you find it.

## Declare the grains

| Table | Grain | Key |
|---|---|---|
| dim_learner | one row per learner (latest export wins) | learner_id |
| dim_course | one row per course | course_code |
| fct_enrolments | one row per enrolment, refunds kept with net revenue 0 | enrolment_id |
| fct_course_progress | one row per paid enrolment, with lessons completed | enrolment_id |

Staging models clean one source each; marts answer questions. Refunds stay as rows in the fact, because "how many
refunds" is the next question someone asks.

## The SQL reviewers read first

    -- stg_learners: the file holds re-exported rows, so keep the latest export
    select learner_id, lower(email) as email, city,
           strptime(signed_up_at, '%Y-%m-%dT%H:%M:%SZ') as signed_up_at_utc
    from {{ ref('raw_learners') }}
    qualify row_number() over (partition by learner_id order by exported_at desc) = 1

    -- stg_lesson_completions: the app retries, so keep the first completion per lesson
    select learner_id, course_code, lesson_no,
           min(strptime(event_ts, '%Y-%m-%dT%H:%M:%SZ')) as completed_at_utc
    from {{ ref('raw_lesson_events') }}
    where event_type = 'completed'
    group by 1, 2, 3

    -- fct_enrolments (part): money as an integer, the reporting date in IST
    cast(replace(amount_paid, ',', '') as integer) as amount_paid_rupees,
    cast(timezone('Asia/Kolkata', enrolled_at_utc at time zone 'UTC') as date) as enrolled_date_ist,
    case when status = 'paid' then amount_paid_rupees else 0 end as net_revenue_rupees

## Tests that prove the grain and the answer

A unique and not_null test on every key; accepted_values on status; relationships from the fact to both dimensions;
a uniqueness test on (learner, course, lesson) in completions; and one singular test that the mart's net revenue equals
the raw file's PAID amounts to the rupee. Without the QUALIFY, dbt said so at once:

    3 of 3 FAIL 12 unique_stg_learners_learner_id

With it, the full build (dbt-core 1.12, dbt-duckdb):

    20 of 26 WARN 1 relationships_fct_enrolments_course_code__course_code__ref_dim_course_
    Finished running 4 seeds, 4 table models, 14 data tests, 4 view models in ... (6.93s).
    Done. PASS=25 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=26

The one warning is the AI050 enrolment, kept on purpose at severity warn and explained in the README.

## The answers, with the checks that make them trustworthy

    course_code  month    paid  net_revenue_rupees        total_net_revenue 4506696, paid_enrolments 2004
    PY101        2026-07   149              209251
    PY101        2026-08   147              203253
    PY101        2026-09   154              215246
    PY101        2026-10     1                1499        <- 23:53 UTC on 30 Sept is 1 Oct in IST

Sixteen enrolments land in a different month in IST than in UTC; 498 change date. Completion rates ran from 38.0%
(WEB110) to 25.7% (ML300). Paid but never started: 245 of 2,003 (12.2%). Counting raw events instead of deduplicated
completions says 636 learners finished a course; the right number is 602 — the 834 retried events would have
overstated question 2.

## The README a reviewer can follow

1. **Run it** — Python version, pip install dbt-duckdb, dbt build, and where the answers query lives.
2. **The model** — the grain table above and the lineage in one line per model.
3. **Assumptions** — each trap, what you did, and what you would ask PadhaiPal.
4. **Answers** — the three tables, with the check behind each.
5. **Next** — what you would add with another day: an unknown-course member, incremental models, a CI build.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Correct answers | 25% | the three numbers right, traps handled, time zone and refunds deliberate |
| Model and grain | 25% | grains declared, facts and dimensions sensible, no fan-out |
| Tests | 20% | keys, relationships and a reconciliation; tests that would catch the traps |
| SQL quality | 15% | readable CTEs and models, one job per model, no SELECT * in marts |
| README and decisions | 15% | runs from a fresh clone; assumptions written down and defended |

**Ways to lose:** summing amount_paid as text or dropping the commas wrongly; counting events instead of completions;
reporting UTC months; one 300-line query instead of models; no tests, or only not_null; a README that says "run my
notebook"; silently dropping the AI050 row without telling anyone.`,
    workedExample: `**The debrief. Reviewer: "fct_course_progress has 2,003 rows but there are 2,004 paid enrolments. Where did one go?"**

**Answered badly.** "Probably a data issue in your file. The other 2,003 are correct, so it doesn't change the
completion rates much."

Why it fails: it does not know where the row went — and "it doesn't matter much" is exactly what reviewers listen
for. In a revenue table, the same carelessness is a finance incident.

**Answered well.** "It is enrolment 9999, for course AI050, which is not in the course file. fct_course_progress joins
dim_course to get the lesson count, so the inner join drops it. I chose that deliberately for progress — there is no
lesson count to measure against — but I kept the row in fct_enrolments, because PadhaiPal did receive ₹799, and the
revenue test reconciles to the raw file only because it is there. The relationships test flags it as a warning on every
build, and the README lists it under assumptions with the question I would ask: is AI050 a new course missing from the
export, or a test enrolment?"

**Reviewer:** "If this were production, would you keep it that way?"

"No. I'd add an unknown member to dim_course — a row with course_code 'UNKNOWN' or a surrogate key of -1 — and map
unmatched codes to it in staging, so joins never drop facts and the dashboard shows 'Unknown course: 1 enrolment'
instead of losing it. And I'd make the relationships test an error once the source team has fixed their export."

**Reviewer:** "Why is October in your revenue table at all? The data ends in September."

"It ends in September in UTC. Enrolment 6121 was at 23:53 UTC on 30 September, which is 05:23 on 1 October in IST, and
PadhaiPal reports in IST. Sixteen enrolments move month that way. I noted it in the README so nobody thinks October
started early."

Why it works: every number is accounted for, each choice has a reason and its cost, the production version is
different and better, and the candidate knows the data well enough to explain an odd row before being asked.`,
    mcqs: [
      mcq('PadhaiPal\'s raw learners file has 12 learner_id values that appear twice, the second export with a new city. What should stg_learners do?', [
        ['Keep one row per learner, the latest export, and note it in the README', true],
        ['Keep both rows, since each is a genuine record from the source export', false],
        ['Drop all 24 rows, since the duplicated learners cannot be trusted at all', false],
        ['Keep the first row seen, since the original export is the more reliable', false],
      ], 'The dimension\'s grain is one row per learner, and the exported_at column says which version is newer, so the latest wins and the assumption is written down. Keeping both fans out every join, dropping them loses their enrolments, and "first seen" ignores the evidence of which is current.'),
      mcq('Why does the take-home count completions from a deduplicated (learner, course, lesson) model rather than from raw lesson events?', [
        ['834 retried events would inflate it: 636 finishers instead of 602', true],
        ['Raw events are stored in UTC, so they cannot be counted until converted', false],
        ['Counting raw events is slower in DuckDB than counting a grouped model', false],
        ['Raw lesson events include enrolments that were refunded later on', false],
      ], 'The app sometimes sent the same completion twice, so counting events overstates progress; the grouped model has one row per lesson. Time zone, speed and refunds do not explain the gap — duplicates do.'),
      mcq('The revenue answer shows one PY101 enrolment in October although the data "ends in September". What is the explanation?', [
        ['23:53 UTC on 30 September is 1 October in IST, the business\'s reporting time', true],
        ['A late-loaded row was given the load date instead of the true enrolment date', false],
        ['The dbt model rounds every timestamp up to the next month boundary by default', false],
        ['DuckDB stores timestamps without a time zone, so it guessed the month wrongly', false],
      ], 'The source timestamps end in Z (UTC); converted to Asia/Kolkata, 23:53 on 30 September becomes 05:23 on 1 October, and sixteen enrolments change month that way. Nothing was loaded late, dbt does not round dates, and the conversion was explicit.'),
    ],
    checkpoint: [
      mcq('Which grain declaration fits PadhaiPal\'s fct_enrolments best?', [
        ['One row per enrolment, refunds kept with net revenue of 0', true],
        ['One row per learner, summing all of their course payments', false],
        ['One row per course per month, with paid enrolments counted', false],
        ['One row per lesson event, with the enrolment amount repeated', false],
      ], 'An enrolment is the business event being measured, and keeping refunds as rows lets later questions count them. A per-learner or per-month table is an aggregate that loses detail, and repeating the amount per lesson event fans out every revenue sum.'),
      mcq('A take-home\'s singular test checks that the mart\'s net revenue equals the raw file\'s PAID amounts. What does it protect against?', [
        ['A join or filter that silently drops or duplicates revenue rows', true],
        ['A raw file that arrives late, after the submission deadline passes', false],
        ['A NULL key in one dimension that the generic tests cannot detect', false],
        ['A reviewer running the project with a different DuckDB version', false],
      ], 'Reconciling a total to its source catches fan-outs and lost rows anywhere between the two — the failures generic column tests miss. Lateness, NULL keys (which not_null tests catch) and tool versions are different concerns.'),
      mcq('An enrolment\'s course_code is missing from the course file. Which production design keeps it in every report?', [
        ['An unknown member row in dim_course that unmatched codes map to', true],
        ['An inner join that drops the row, with a comment above the join', false],
        ['A filter in staging that removes enrolments for unknown courses', false],
        ['A NULL course_code in the fact so that the join fails quietly', false],
      ], 'Mapping unmatched keys to an "unknown" dimension row means joins never lose facts and the gap is visible in reports. Dropping or filtering the row loses money from revenue, and NULL keys still disappear in inner joins.'),
    ],
  },

  /* ── SPARK_ROUND ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_SPARK_ROUND',
    notes: `Spark-heavy teams — Databricks shops in Bengaluru, GCC data platforms in Hyderabad and Chennai, fintechs with big
transaction tables — often run a round that starts "This job is slow. Here is the code and the plan. What would you
change?" **The interviewer is testing whether you read the plan before touching the cluster, tie each fix to an
operator in it, change one thing at a time with a number, and check the answer did not change.** "Add more executors"
is the answer that ends the round early.

The parts are in *How Spark Works*, *Partitions, Shuffles and Joins*, *Data Skew, Caching and Tuning* and *Window
Functions, UDFs and Complex Types*. This round is using them aloud on someone else's job.

## The method to say aloud

1. **What does the job do, and how big is each input?** Rows, files, partitions, the small side of every join.
2. **Read the plan bottom-up.** Scan and pushed filters, Python operators, every Exchange, the join strategy, anything
   that cuts parallelism.
3. **Check the config** the job runs with — a setting copied in years ago is a common cause.
4. **Rank the fixes by what the plan says costs most**, then change one, time it, and confirm the result is identical.

## A full round (reproduced in local PySpark)

**Interviewer:** "PaisaPul, a fictional Pune UPI app, has a nightly job for the risk team: successful transactions
joined to merchants, with an amount band and the payer's PSP handle, written as one file. It used to take 20 minutes;
volumes have grown and it now takes over two hours. Here's the code."

    @F.udf(T.StringType())
    def amount_band(paise):
        r = paise / 100
        if r < 200: return "small"
        if r < 2000: return "medium"
        return "large"

    @F.udf(T.StringType())
    def psp_handle(vpa):
        return vpa.split("@")[1]

    t = txns.filter("status = 'SUCCESS'")
    t = t.withColumn("band", amount_band("amount_paise")).withColumn("handle", psp_handle("payer_vpa"))
    out = (t.join(merchants, "merchant_id")
            .select("txn_id", "txn_ts", "merchant_id", "category", "city", "amount_paise", "band", "handle")
            .coalesce(1))

**Candidate:** "First the sizes. How big are transactions and merchants?"

**Interviewer:** "In the lab copy: 4 million transactions in 8 Parquet files, 300,000 merchants in one 3.8 MB file.
Here is explain() — trimmed."

    Coalesce 1
    +- Project [txn_id, txn_ts, merchant_id, category, city, amount_paise, band, handle]
       +- SortMergeJoin [merchant_id], [merchant_id], Inner
          :- Sort [merchant_id ASC NULLS FIRST]
          :  +- Exchange hashpartitioning(merchant_id, 200)
          :     +- Project [..., pythonUDF0 AS band, pythonUDF1 AS handle]
          :        +- BatchEvalPython [amount_band(amount_paise), psp_handle(payer_vpa)]
          :           +- Filter ((isnotnull(status) AND (status = SUCCESS)) AND isnotnull(merchant_id))
          :              +- FileScan parquet [...] PushedFilters: [IsNotNull(status), EqualTo(status,SUCCESS), ...]
          +- Sort [merchant_id ASC NULLS FIRST]
             +- Exchange hashpartitioning(merchant_id, 200)
                +- FileScan parquet [merchant_id, category, city]

**Candidate, reading bottom-up:** "The scan is fine: the status filter is pushed into Parquet and only the needed
columns are read. Then **BatchEvalPython**: both UDFs are row-at-a-time Python, so every row is serialised to a Python
worker and back. Neither needs Python — an if-chain is F.when and a split is substring_index. Next, a **SortMergeJoin
with an Exchange on both sides** — 3.8 million rows shuffled and sorted to join a 3.8 MB table that should be
broadcast. Why didn't Spark broadcast it? I'd check the config."

**Interviewer:** "spark.sql.autoBroadcastJoinThreshold is -1. Someone set it two years ago to fix an out-of-memory
error. AQE is on."

**Candidate:** "-1 switches automatic broadcast off — and AQE cannot rescue it, because AQE's own broadcast threshold
defaults to the same setting; after the run the plan was still a SortMergeJoin. I'd leave the global setting alone for
now and broadcast merchants explicitly, selecting only the three columns we use. Last, **Coalesce 1** at the top.
coalesce avoids a shuffle, so Spark folds it into the stage above: everything after the last Exchange runs as one task.
Once the join is a broadcast there is no Exchange left, so scan, filter and join would all run in one task."

**One change at a time, same answer each time.** The lab job, timed with Spark's noop writer (Spark cannot write
files on this Windows laptop), median of four interleaved runs on a busy 4-core machine:

    v0 as found                          28.45 s  (fastest 18.88)
    v1 built-in functions for the UDFs    8.49 s  (fastest 6.43)
    v2 + broadcast(merchants), 3 columns  5.04 s  (fastest 3.15)
    v3 + no coalesce(1)                   2.29 s  (fastest 1.53)

Spark's status tracker showed v2's main stage running as 1 task and v3's as 4. The same 21 band-and-handle groups and 3,839,263 rows came out of the first and last versions. "Read the numbers
honestly: with 4 cores and 4 input files, coalesce(1) can cost at most a factor of four here. On the real cluster with
hundreds of cores it serialises the whole job, which is why the production job got worse as data grew. The UDFs were
the biggest single cost on the laptop; on the cluster, the one-task stage probably is."

**What to write instead of one file:** if the risk team truly needs a single file, repartition(1) at the end keeps
everything before it parallel and pays one shuffle; better, write a few files and give them the folder.

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Reading the plan | 30% | each costly operator named and explained: Python eval, exchanges, join, coalesce |
| Diagnosis | 20% | asks for sizes and config; finds why the broadcast did not happen |
| Fixes | 20% | each tied to an operator; built-ins before UDFs; broadcast only what is small |
| Evidence | 20% | one change at a time, timed, result checked identical; numbers read honestly |
| Communication | 10% | thinks aloud; says what would differ on the real cluster |

**Ways to lose:** "add executors" or "increase memory" before reading the plan; caching the transactions "to be safe";
repartition(1000) as a reflex; re-enabling the broadcast threshold globally without asking why it was disabled;
changing everything at once; claiming a speed-up without checking the output.`,
    workedExample: `**Interviewer (follow-up): "Good. Next year merchants grows to 50 million rows. Does your fix still hold?"**

**Answered badly.** "Yes, broadcast joins are always faster, so I'd keep the hint and give the executors more memory
if it fails."

Why it fails: a broadcast copies the table to every executor (and through the driver). A 50-million-row table is
hundreds of megabytes to gigabytes in memory — which is probably the out-of-memory error that made someone set the
threshold to -1 in the first place.

**Answered well.** "No — the hint is right for 300,000 rows and wrong for 50 million. At that size a sort-merge join is
the correct strategy, and the work becomes making the shuffle cheaper:

- **Prune and filter before the join.** Only merchant_id, category and city cross the shuffle, and only merchants that
  transacted — I could semi-join merchants to the day's distinct merchant_ids first, which is a small set.
- **Size the shuffle.** spark.sql.shuffle.partitions set for the real shuffle bytes — roughly 100–200 MB per
  partition — with AQE coalescing the small ones.
- **Watch for skew.** Transactions follow a few very large merchants; with AQE's skew join on, I'd check the task-time
  distribution for one long task and salt the hot keys if it shows.
- **Keep the hint conditional.** I would not hard-code the broadcast: I'd remove the -1 from the job, set an explicit
  threshold that fits our executors, and let the planner choose — and add a test or alert on the job's run time so the
  next change in data size is noticed.

And the UDF and coalesce fixes still hold at any size."

**Interviewer:** "Why did the original engineer set -1?"

"Probably a broadcast of something too large — perhaps a filtered table Spark thought was small, or the driver collecting
it. The fix for that is a hint on the right table or a sensible threshold, not switching broadcasts off for every join.
I'd look for the old incident before changing the global setting."

Why it works: it knows the limit of its own fix, ties each new step to the data's size and shape, and treats a
mysterious config value as evidence to understand rather than an obstacle to delete.`,
    mcqs: [
      mcq('In PaisaPul\'s plan, the status filter appears in the FileScan as PushedFilters: [EqualTo(status,SUCCESS)]. What does the candidate conclude about the scan?', [
        ['The filter runs in the Parquet reader, so the scan is not the problem', true],
        ['The filter runs after the join, so all 4 million rows are joined first', false],
        ['The filter is evaluated in Python, which is why BatchEvalPython appears', false],
        ['The filter disables column pruning, so every column of the file is read', false],
      ], 'Pushed filters are applied as Parquet row groups are read, and the ReadSchema shows only the needed columns, so the scan is already lean. The filter sits below the join, it is a built-in comparison, not Python, and pruning and pushdown work together.'),
      mcq('Why did AQE, which was enabled, not turn PaisaPul\'s SortMergeJoin into a broadcast join at run time?', [
        ['Its own broadcast threshold defaults to the global one, which was set to -1', true],
        ['AQE only changes join strategies when the job is written in Scala, not Python', false],
        ['AQE can coalesce partitions and split skew, but never changes a join strategy', false],
        ['The merchants file was 3.8 MB, which is above AQE\'s fixed 1 MB broadcast limit', false],
      ], 'spark.sql.adaptive.autoBroadcastJoinThreshold defaults to spark.sql.autoBroadcastJoinThreshold, so -1 disables the runtime switch too; the executed plan still showed a SortMergeJoin. AQE works the same from PySpark, it can convert sort-merge joins to broadcast, and there is no fixed 1 MB limit.'),
      mcq('What is the fastest correct replacement for the psp_handle UDF, which returns the part of a VPA after "@"?', [
        ['F.substring_index("payer_vpa", "@", -1)', true],
        ['A pandas UDF that calls str.split per batch', false],
        ['F.split("payer_vpa", "@") with no index taken', false],
        ['F.regexp_replace("payer_vpa", "@", "")', false],
      ], 'substring_index with -1 returns everything after the last "@" as a built-in, with no Python at all. A pandas UDF is faster than a plain UDF but still crosses into Python, split without an index returns an array, and regexp_replace only deletes the "@", keeping the user part.'),
    ],
    checkpoint: [
      mcq('In the lab, which single change cut PaisaPul\'s job time the most?', [
        ['Replacing the two Python UDFs with built-in functions', true],
        ['Broadcasting the 300,000-row merchants table to tasks', false],
        ['Removing coalesce(1) so the stage keeps four tasks', false],
        ['Raising spark.sql.shuffle.partitions from 200 to 400', false],
      ], 'Dropping BatchEvalPython took the median from about 28 seconds to about 8.5 — the largest step on a 4-core laptop. Broadcasting and removing coalesce(1) each roughly halved what was left, and the shuffle partition count was never the problem.'),
      ck('DATA_PIPELINES', 'PaisaPul\'s risk team insists on exactly one output file. Which approach keeps the job parallel?', [
        ['repartition(1) at the end, so only the final write is single-threaded', true],
        ['coalesce(1) at the end, since it avoids a shuffle and is always cheaper', false],
        ['Set spark.default.parallelism to 1 so the whole job writes one file', false],
        ['Write with 200 shuffle partitions and ask the team to pick one file', false],
      ], 'repartition(1) adds a shuffle, which is a stage boundary, so everything before it keeps its parallelism and only the last stage is one task. coalesce(1) folds into the stage above and serialises it, parallelism 1 serialises everything, and handing over 200 files ignores the requirement.'),
      mcq('Why should the candidate check that the first and last versions of the job return the same 21 groups and 3,839,263 rows?', [
        ['A faster job that changes the answer is a new bug, not an optimisation', true],
        ['Spark caches results between runs, so a matching count proves no caching', false],
        ['The noop writer drops rows at random, so the count shows how many were lost', false],
        ['Interviewers only accept timings that are reported together with row counts', false],
      ], 'Rewriting UDFs as built-ins or changing a join can quietly change results — a boundary written as <= instead of <, or a join that drops rows — so equality of output is part of the evidence. Nothing was cached, and the noop writer executes every row without writing it.'),
    ],
  },

  /* ── TIMED_SCENARIOS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_TIMED_SCENARIOS',
    notes: `Three scenario questions, **15 minutes each**, run like the real round. Ask a friend to read the prompt and answer
your questions with the facts given here and nothing more. Say your method first, then the checks or the design, then
the decision and what would change it. Compare with the model answer and score yourself on the rubric. Companies and
data are fictional.

## Scenario A — "The live order count that misses 3% every evening" (streaming)

**Prompt.** "ThaliGo's war-room screen shows orders per minute from a Spark Structured Streaming job. At night it
matches the orders database. Between 19:00 and 22:00 it is 3–4% low, every day. Walk me through it."

**Facts to give when asked.** The job groups by a 1-minute window on event_time with withWatermark("event_time",
"2 minutes"), output mode append. Events come from the rider and customer apps. Ingest lag (arrival time minus
event_time): median 8 seconds all day; 99th percentile 40 seconds at night and 6 minutes between 19:00 and 22:00, when
phones on weak networks buffer events. The query's progress reports numRowsDroppedByWatermark above zero only in the
evening.

**Model answer.**
1. **Scope:** low, not high, and only at peak — events are being lost or excluded, not duplicated.
2. **Mechanism:** with a 2-minute watermark, Spark finalises a window once the maximum event time seen passes the
   window's end plus 2 minutes, and drops rows that arrive later than that. A 6-minute p99 lag means the slowest few
   percent of evening events are always too late.
3. **Evidence:** numRowsDroppedByWatermark above zero in exactly those hours confirms it.
4. **Fix, with its cost:** widen the watermark to cover the lag — say 10 minutes — which holds more state and makes each
   final count later; or switch the screen to update mode so counts appear early and correct themselves. Either way,
   official numbers come from the batch layer, which counts every event in the lake.
5. **Prevent:** alert on dropped-row counts and lag percentiles; agree with the war-room what "live" means.

## Scenario B — "Every change to the payments ledger, in the lake within an hour" (design)

**Prompt.** "RupeeRail's ledger is a PostgreSQL table of UPI transactions. Rows are updated as a payment settles or
reverses, and some are deleted by a compliance process. Finance wants the lake to reflect every change within an hour,
with totals that never double-count. Design it."

**Model answer.**
1. **Requirements asked:** volume of changes, whether deletes must be reflected or kept as history, the hour as a hard
   limit or a target.
2. **Capture:** log-based CDC — Debezium reading the write-ahead log, or AWS DMS — because a watermark query cannot
   see deletes. An initial snapshot first, then changes.
3. **Transport:** a Kafka topic keyed by txn_id, so every change to one transaction stays in order in one partition.
4. **Apply:** a micro-batch job every few minutes MERGEs each batch into a Delta or Iceberg silver table on txn_id,
   applying a change only if its log position is newer than the stored one, and deleting rows on op = 'd'. Delivery
   is at-least-once; the MERGE makes replays harmless — that is what "never double-count" needs.
5. **Operate:** watch the replication slot — if the consumer stops, PostgreSQL keeps the WAL and the database disk
   fills; reconcile silver totals against the ledger daily; handle schema changes by alerting, not by guessing.

## Scenario C — "Two years of history for a new column" (orchestration)

**Prompt.** "A new column, settlement_bank, is added to RupeeRail's daily dbt model fct_settlements. Finance wants it
for two years of history. The daily Airflow DAG takes 3 minutes per day of data. How do you backfill without hurting
the nightly run?"

**Model answer.**
1. **Check it is safe to rerun:** each run overwrites its own day's partition, chosen from the run's data interval,
   not from the clock. If not, fix that first.
2. **Size it:** 730 daily runs × 3 minutes = 36.5 hours of work; four at a time is about 9.1 hours.
3. **Choose the shape:** the model is set-based SQL, so a rebuild per month — 24 runs — is fewer, larger statements;
   at an assumed 20 minutes each, two at a time, about 4 hours. Prove one month first and reconcile its row count and
   totals with the current table.
4. **Protect the nightly run:** a separate backfill run (the Airflow CLI or UI backfill) with max_active_runs and a
   pool capping concurrency, scheduled in the day; the nightly DAG keeps its own slots.
5. **Tell people:** finance gets the date when history is complete; a check confirms no day is missing.

## Rubric (each scenario, out of 20)

| Area | Points | Full marks when |
|---|---|---|
| Method and structure | 5 | steps named and in a sensible order |
| Technical accuracy | 5 | the mechanism explained — watermark, log position, interval — not just the fix |
| Correctness and safety | 5 | no data lost or double-counted; risky actions avoided |
| Operations and communication | 5 | monitoring, prevention, and who is told what |

40 or more across the three is a pass for most junior rounds; 50 or more is strong. A score below 3 in any area shows
what to practise next — most often *Technical accuracy*, where answers name the fix without the reason.`,
    mcqs: [
      mcq('In Scenario A, the evening p99 ingest lag is 6 minutes and the watermark is 2 minutes. What happens to an order event that arrives 5 minutes late?', [
        ['It is dropped once its window has been finalised, so the count is low', true],
        ['It is added to the next minute\'s window, so that minute is overcounted', false],
        ['It waits in Kafka until the watermark passes, then it is counted in full', false],
        ['It causes the job to fail, and the checkpoint then replays the window', false],
      ], 'In append mode, a window is emitted once the watermark passes its end, and rows later than the watermark are dropped — which matches a count that is only low at peak. Spark does not move late rows to another window, and lateness neither blocks the source nor fails the query.'),
      mcq('Why does Scenario B\'s model answer use log-based CDC instead of an updated_at watermark query?', [
        ['A watermark query cannot see deleted rows, and the ledger has deletes', true],
        ['A watermark query would need a lock on the ledger table while it reads', false],
        ['Log-based CDC delivers every change exactly once with no need for MERGE', false],
        ['PostgreSQL tables cannot hold an updated_at column for each transaction', false],
      ], 'A deleted row is simply gone, so a query can never return it; the write-ahead log records the delete. Reads need no table lock, CDC delivery is at-least-once so the idempotent MERGE is still needed, and updated_at columns are ordinary in PostgreSQL.'),
      mcq('In Scenario B, what makes "never double-count" true even though the pipeline delivers changes at least once?', [
        ['A MERGE on txn_id that applies a change only if its log position is newer', true],
        ['Kafka\'s retention setting, which removes a message after it has been read', false],
        ['Running a single consumer, so that no message can be processed twice', false],
        ['Appending every change to silver and summing only the newest partition', false],
      ], 'An idempotent sink makes a replayed change a no-op: the same key and log position produce the same row. Kafka retention is time- or size-based, not read-based; one consumer can still reprocess after a crash; and appending changes double-counts by design.'),
      mcq('Scenario C\'s daily DAG takes 3 minutes per day of data. Backfilling 730 days four runs at a time takes about how long?', [
        ['About 9.1 hours', true],
        ['About 36.5 hours', false],
        ['About 2.3 hours', false],
        ['About 18.3 hours', false],
      ], '730 × 3 = 2,190 minutes, or 36.5 hours of work; four at a time divides that by four, 547.5 minutes ≈ 9.1 hours. 36.5 hours is the serial figure, 18.3 assumes two at a time, and 2.3 hours divides by sixteen.'),
      mcq('Rehearsing Scenario A, Neha says "widen the watermark to 10 minutes" but cannot say why events were missing. Which rubric area loses most?', [
        ['Technical accuracy', true],
        ['Method and structure', false],
        ['Correctness and safety', false],
        ['Operations and communication', false],
      ], 'She has the fix but not the mechanism — that rows later than the watermark are dropped once a window is finalised — which is what Technical accuracy scores. Her steps may still be ordered and her fix safe; the rubric separates the areas to show what to practise.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SCENARIO_ROUNDS_CHECKPOINT',
    notes: `Ten scenario questions across the topic: the pipeline design round, the broken-pipeline round, the SQL-and-modelling
take-home and the Spark optimisation round. Answer each as you would aloud in the room: requirements and numbers before
boxes, a reconciliation before a theory, a declared grain before a query, and the plan before the cluster size.`,
    checkpoint: [
      mcq('A design-round prompt says "build a real-time pipeline" for a dashboard the sales head opens twice a day. What should the candidate do first?', [
        ['Ask how fresh the data must be and why, before choosing any tools', true],
        ['Draw Kafka and Flink, since "real-time" settles the architecture', false],
        ['Pick a nightly batch, since dashboards never need recent data', false],
        ['Estimate the cluster size needed for streaming every single event', false],
      ], 'The freshness requirement, stated as minutes or hours, decides between streaming, micro-batch and batch; "real-time" often means "this morning\'s numbers". Drawing tools first designs for a guess, and assuming batch or sizing a stream are equally premature.'),
      mcq('A design candidate wants to land 3 GB a day of orders with a 40-node Spark cluster. What is the strongest challenge?', [
        ['3 GB a day fits a SQL engine or one machine; Spark adds cost for no need', true],
        ['Spark cannot read from PostgreSQL, so the orders cannot reach the lake', false],
        ['40 nodes is too few, since Spark needs one node per gigabyte of input', false],
        ['Spark only processes streams, so a daily batch of orders is unsupported', false],
      ], 'Volume should pick the engine: a few gigabytes a day is comfortable for DuckDB, a warehouse or a single process, and a cluster is cost and operations without benefit. Spark reads JDBC sources, has no node-per-gigabyte rule, and is mainly a batch engine.'),
      mcq('In a wrong-numbers round, gold revenue is 25% high and runs are green. Bronze and silver have the right distinct order ids but more rows than orders. Where is the fault?', [
        ['In the load into silver, which no longer keeps one row per order', true],
        ['In the dashboard tool, which must be caching an older query result', false],
        ['In the source system, which must have created duplicate order ids', false],
        ['In the gold query\'s GROUP BY, which must be missing a date column', false],
      ], 'Correct distinct ids with extra rows mean the same orders appear several times, and the first layer where that is true is where the grain broke. A cache would not add rows, the source has one row per id, and the extra rows exist before gold runs.'),
      mcq('An incremental dbt model ran 8 times slower last night, but its output grew by the usual amount. Which check comes first?', [
        ['Count the input rows its incremental filter selected against a normal night', true],
        ['Move the model to a larger warehouse size and see if the time comes back', false],
        ['Run a full refresh of the model so that its history is rebuilt cleanly', false],
        ['Add an index on the output table\'s key to speed up the MERGE step', false],
      ], 'Normal output with a slow run points to much more input — an upstream backfill touching updated_at is common — and the input count proves or rules it out. A bigger warehouse and a full refresh are changes without a diagnosis, and warehouse tables are not indexed that way.'),
      ck('DATA_MODELLING', 'A take-home\'s fct_orders is joined to a dim_customer that holds two rows for some customers. What does a reviewer expect the candidate to have caught?', [
        ['The fan-out: revenue for those customers is doubled unless the dimension is deduplicated', true],
        ['Nothing: two rows per customer is normal for any Type 1 dimension that has been updated', false],
        ['A performance issue only: the totals stay right, but the join reads twice as many rows', false],
        ['The fact table\'s grain is wrong, so orders must be stored once per customer row', false],
      ], 'A join to a dimension with repeated keys multiplies fact rows, inflating every sum; a unique test on the dimension key catches it. Type 1 overwrites, keeping one row, the totals do change, and the fix belongs in the dimension, not the fact\'s grain.'),
      ck('DATA_MODELLING', 'Raw timestamps in a take-home end in "Z" and the business reports in IST. What should the model do?', [
        ['Store UTC, and derive the reporting date by converting to Asia/Kolkata', true],
        ['Strip the "Z" and treat the times as IST, since the business is in India', false],
        ['Report by UTC date, since converting time zones makes totals inaccurate', false],
        ['Add five and a half hours as text before casting each value to a date', false],
      ], 'Keeping the instant in UTC and converting explicitly for the reporting date gets month and day boundaries right — sixteen PadhaiPal enrolments changed month this way. Relabelling UTC as IST shifts every event, UTC dates misplace evening activity, and string arithmetic breaks on edge cases.'),
      ck('BATCH_STREAM_PROCESSING', 'A Spark plan shows BatchEvalPython above the FileScan. What does that tell the candidate?', [
        ['Python UDFs run here, sending each row to Python workers and back', true],
        ['The job was submitted from Python, so the whole plan runs in Python', false],
        ['A pandas UDF is vectorising the step, which is the fastest option', false],
        ['Spark is evaluating the filter in Python because it was not pushed down', false],
      ], 'BatchEvalPython is the operator for row-at-a-time Python UDFs: rows are serialised to Python worker processes and results returned, which is slow next to built-in functions. PySpark code still runs on the JVM, pandas UDFs show as ArrowEvalPython, and pushed filters appear in the FileScan.'),
      ck('BATCH_STREAM_PROCESSING', 'A 300,000-row dimension is joined with a SortMergeJoin, and the job config sets spark.sql.autoBroadcastJoinThreshold to -1. What is the fix?', [
        ['Broadcast the dimension with a hint, or restore a sensible threshold', true],
        ['Raise spark.sql.shuffle.partitions so the sort-merge join runs faster', false],
        ['Cache the dimension, which makes Spark choose a broadcast join instead', false],
        ['Turn AQE off, which lets the planner pick a broadcast join by itself', false],
      ], 'A threshold of -1 disables automatic broadcasts — and AQE\'s runtime switch to broadcast too, since its threshold defaults to the same value — so the small table is shuffled with the big one. A hint or a restored threshold removes both shuffles; more partitions or caching keep the sort-merge join.'),
      ck('BATCH_STREAM_PROCESSING', 'A job ends with coalesce(1) before writing, after a broadcast join and no shuffle. Why is it slow?', [
        ['coalesce is narrow, so the whole stage — scan, filter, join — runs as one task', true],
        ['coalesce forces a full shuffle of every row to a single executor before writing', false],
        ['coalesce(1) disables the broadcast join, so the plan falls back to a sort-merge', false],
        ['coalesce(1) makes Spark write each row to its own file, which floods storage', false],
      ], 'Because coalesce avoids a shuffle, Spark folds it into the stage above, so the work before it also runs in a single task. repartition(1) would shuffle and keep the upstream parallel; coalesce does not change the join strategy or create a file per row.'),
      ck('BATCH_STREAM_PROCESSING', 'In a Spark round, a candidate changes UDFs, the join and the write all at once, and the job gets faster. What has the candidate failed to show?', [
        ['Which change helped how much, and that the output stayed identical', true],
        ['That the cluster was large enough, since speed depends only on nodes', false],
        ['That the job uses Scala, since PySpark cannot be optimised in rounds', false],
        ['That AQE was turned off first, since AQE hides every plan problem', false],
      ], 'One change at a time, each timed and each checked for the same result, is what lets you explain the gain and trust it. Cluster size is not the only lever, PySpark DataFrame code compiles to the same plans as Scala, and AQE is a help rather than something to switch off.'),
    ],
  },
];
