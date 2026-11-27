/**
 * Career-track content: Capstone: A Data Platform (DE_CAPSTONE), Data Engineer, batch DE3 — the track's capstone.
 * Nothing is re-taught; every unit points back to the lesson that taught the idea.
 *
 * The student scopes, builds, operates, presents and defends a data platform for one business, entirely on a laptop
 * with open-source tools (DuckDB, PySpark in local mode, dbt with DuckDB, Delta Lake through delta-rs, Prefect or
 * Airflow in Docker, a one-node Kafka in Docker or a simulated stream), with an optional deployment on AWS behind a
 * budget alarm and a teardown checklist. Option A (recommended, data generator provided) is Haatly, a fictional
 * Kolkata marketplace for handloom, home decor and festive wear; Option B is a lending app's ledger, Option C a
 * parcel-delivery company. All data is synthetic.
 *
 * Verified by running, on a Windows laptop (Python 3.13): the Haatly generator; interval ingestion from a local fake
 * API (http.server, cursor pages, injected 503s) and SQLite into bronze Delta, run twice; the silver step in PySpark
 * 3.5.9 local mode (explicit file lists from the Delta log; written with deltalake 1.6 because Spark cannot write files
 * here without winutils), run twice; dbt-core 1.12.6 + dbt-duckdb 1.11.1 on DuckDB 2.0 reading Delta through
 * delta_scan (staging, a timestamp snapshot, a point-in-time join, generic, custom and singular tests, a real failing
 * test and source freshness); the publish step and the post-publish checks; the whole day as a Prefect 3.9 flow; a
 * plain-Python simulation of a partitioned stream with a crash before commit and event-time windows with a watermark;
 * HMAC pseudonymisation. Every output quoted is real. NOT run: Airflow (no Windows support; the DAG was checked with
 * py_compile), a Kafka broker and confluent-kafka (the consumer was py_compiled; the client is not installed in the
 * lab venv), Docker Compose (the file was parsed with PyYAML), Terraform (parsed with python-hcl2, never applied), the
 * GitHub Actions workflow (parsed with PyYAML) and anything on AWS. No prices: only how each service bills.
 *
 * Attribution: the topic is [DATA_PIPELINES, DATA_MODELLING, ETL_FUNDAMENTALS, BATCH_STREAM_PROCESSING], default
 * DATA_PIPELINES; BUILD_PIPELINES declares DATA_PIPELINES and DATA_MODELLING, BUILD_OPERATE ETL_FUNDAMENTALS and
 * BATCH_STREAM_PROCESSING. Checkpoint questions on a skill other than DATA_PIPELINES name it with ck(); questions drawn
 * from the warehouse, quality and cloud lessons are tagged with the capstone skill they exercise.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const MODEL = 'DATA_MODELLING';
const ETL = 'ETL_FUNDAMENTALS';
const STREAM = 'BATCH_STREAM_PROCESSING';

export const TRACK_DE_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CAPSTONE_BRIEF',
    notes: `**A data hiring panel does not ask whether you know what a star schema is. It asks you to re-run last Tuesday
and show that nothing doubled — then asks why yesterday's revenue number changed this morning.** This capstone gives
you that demo. You will build a small but complete data platform for one real-looking business: data arriving from an
API, a database and a stream; a lakehouse with bronze, silver and gold; Spark for the heavy step; dbt models with
tests; an orchestrator with backfills; checks that stop bad data before anyone reads it; and, if you choose, the same
platform on AWS with a bill you can explain.

You have every piece already. DE1 gave you Data Modelling, Python for Ingestion and SQL for Data Engineers. DE2 gave
you Apache Spark, Warehouses and Lakehouses, and dbt and ELT. DE3 gave you Orchestration, Streaming, Data Quality and
Governance, and The Cloud Data Stack. The capstone joins them into one platform, and nothing in it is new.

## Three businesses, one standard

| | **Option A — Haatly (recommended, generator provided)** | **Option B — a lending app** | **Option C — a parcel-delivery company** |
|---|---|---|---|
| Who | A fictional Kolkata marketplace: 400 sellers of handloom, home decor and festive wear; Puja and Diwali sale days | A fictional Pune app that lends small amounts and collects EMIs by UPI AutoPay and NACH | A fictional Nagpur courier: shipments, hub scans, riders, cash-on-delivery |
| Sources | Orders API (cursor pages), operational PostgreSQL (sellers, products), a payments event stream | Loans database, payment-gateway webhooks as a stream, daily bank settlement CSVs | Shipments API, a hub-scan event stream, the rate-card database |
| Consumers | Seller dashboard by 07:00 IST; finance reconciliation; a live payments board on sale evenings | Collections dashboard; the ledger's daily trial balance; month-end reports | SLA dashboard; COD reconciliation; a live hub board |
| The hard question | "Yesterday's GMV changed this morning. Why, and who was told?" | "The ledger is off by Rs 1,200. Find it." | "A scan arrived three hours late. Which day's SLA does it count against?" |

All three are graded on the same rubric. **Option A is recommended**: the generator gives you two days of realistic
data with the problems built in (late status updates, an API retry duplicate, bad prices, a status value nobody told
you about, sellers changing tier mid-day), so every lesson has something to do. Option B must keep money in integer
paise and balance debits and credits to zero every day. **No real customer data** in any option.

## Sources, consumers and freshness for Haatly

Write these down before any code; they decide the design.

| Source | How it arrives | Volume (lab) | Change pattern |
|---|---|---|---|
| Orders API | GET /orders?updated_from&updated_to, 100 per page, cursor, occasional 503 | 12,000 orders on a normal day, 15,000 on a sale day | An order is re-sent each time its status changes |
| Ops database | PostgreSQL (SQLite in the slice): sellers, products | 400 sellers, 3,000 products | Rows updated in place, with updated_at |
| Payments | Events on a Kafka topic, key = order_id | About 1 a second on a sale evening | Append-only; can arrive late or twice |

| Consumer | Needs | Freshness |
|---|---|---|
| Seller dashboard | GMV and orders per seller per IST day, by seller tier | Yesterday complete by 07:00 IST |
| Finance | Every order line reconciled to the payments that paid for it | Daily, T+1 by 10:00 IST |
| Sale-evening board | Successful payments per five minutes | Within about five minutes |

Only the last one needs streaming. Everything else is a daily batch, and saying so is a design decision the panel
will like (Batch, Micro-batch and Streaming).

## The model, grain first

From Dimensional Modelling and Slowly Changing Dimensions:

- **fct_order_lines** — one row per order line (order_id + line_no), carrying the latest known status. Measures: qty,
  unit_price, line_amount (additive).
- **fct_payments** — one row per payment event, from the stream.
- **dim_seller** — **Type 2** on tier and city, because the seller dashboard reports sales by the tier the seller had
  *when the order was placed*.
- **dim_product** (Type 1), **dim_customer** (a pseudonymised key and the city only), **dim_date** on the IST day.
- **agg_daily_seller_sales** — the gold table the dashboard reads: IST day, seller, tier at the time, orders, GMV.

## The laptop platform

    docker compose: PostgreSQL (ops DB) | fake orders API (FastAPI) | Kafka, one node, KRaft
    ingest.py ──► lake/bronze (Delta, replace-by-interval)  ◄── payments consumer (merge on event_id)
    silver_spark.py (PySpark local) ──► lake/silver (Delta MERGE) + lake/quarantine
    dbt (dbt-duckdb, delta_scan) ──► staging ► snapshot ► marts + tests ──► publish.py ──► lake/gold (Delta)
    checks.py (reconcile, volume, freshness, quarantine rate) ──► alert
    Prefect flow or Airflow DAG (Docker) runs it per IST day; backfills re-run any range

Plan for a laptop with 8 GB of RAM: Spark at local[2] to local[4] with a 2 GB driver, and stop the containers you
are not using. On
Windows, run Spark and Airflow inside WSL2 or Docker: Spark needs winutils to write files on plain Windows, and
Airflow does not run on Windows at all.

## The optional cloud deployment

Same code, the lake on S3 instead of a folder (The AWS Data Stack; Querying the Lake: Glue Catalogue and Athena):

| Use | Bills | Avoid in the capstone |
|---|---|---|
| S3 for the lake, Glue Data Catalog for the tables, Athena for queries (workgroup with a per-query scan limit) | By storage and requests; Athena by data scanned; the catalogue by objects and requests above a free allowance | Provisioned Redshift, provisioned MSK, an always-on EMR cluster, NAT gateways — they bill every hour they exist |
| The Spark step as a Glue job or EMR Serverless, only in a time-boxed session | By compute time while the job runs | Leaving dev endpoints, notebooks or streams running between sessions |

AWS changed its Free Tier for accounts opened from July 2025 (credits, and a free or paid plan); older accounts have
the 12-month Free Tier. Read your own account's Free Tier and Billing pages, price each piece with the AWS Pricing
Calculator, and create a **budget alarm before anything else**. The cheapest honest deployment keeps compute on your
laptop and puts only the lake, the catalogue and Athena in AWS. Azure equivalents (ADLS Gen2, Synapse serverless SQL,
Data Factory) are accepted with the same discipline; say which in DECISIONS.md.

## Milestones (about five weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Plan | PLATFORM.md: sources, consumers, freshness, the model with grains, architecture, risks, out of scope |
| M2 — Pipelines | Bronze, silver and gold on Delta; the Spark step; dbt models with tests; every step safe to re-run |
| M3 — Operate | The orchestrated daily run; a backfill of a week; the payments stream into bronze without duplicates |
| M4 — Trust and cloud | Checks and alerts; lineage; personal data pseudonymised; optional AWS deployment and a cost report |
| M5 — Defend | A live backfill and a broken-data drill rehearsed; the teardown done |

## Risks to write down on day one

1. **Double counting.** Every retry and backfill runs a step again. Each write must replace or merge, never blindly
   append (Idempotent, Restartable Loads).
2. **Time zones.** The API speaks UTC; the business day is IST. A day boundary in the wrong zone moves five and a half
   hours of orders to another day.
3. **Silent bad data.** A new status value or a negative price must stop publishing, not flow into the dashboard.
4. **The bill.** Anything in the cloud that bills by the hour is created in a session and destroyed at its end.

## What "done" means

A reviewer clones the repository, runs \`docker compose up\` and \`make demo\`, and watches two days load; re-runs a
day and sees identical gold; breaks the data and watches the publish stop; opens the lineage graph; reads
DECISIONS.md and knows what production would change; and, if you deployed to AWS, sees the teardown checklist
completed with nothing left billing.`,
    workedExample: `**A one-page PLATFORM.md for Option A (abridged).**

**Business.** Haatly (fictional): a Kolkata marketplace, 400 sellers, about 12,000 orders a day and 15,000 on a sale
day; one order can hold lines from several sellers.

**Consumers and freshness.** Seller dashboard: yesterday's GMV and orders per seller, by the tier the seller had at
order time, complete by 07:00 IST. Finance: order lines reconciled to payments by 10:00 IST. Sale-evening board:
successful payments per five-minute window, within five minutes.

**One run = one IST day.** The orders API is pulled for updated_at in [day 00:00 IST, next day 00:00 IST), converted
to UTC; the ops database by updated_at in the same window. The daily run starts at 01:30 IST, leaving 90 minutes for
stragglers; anything later arrives as an update in the next day's window and is merged.

**Layers.** Bronze: raw JSON per interval, replaced on re-run. Silver: one row per order line at its latest version
(MERGE on order_id + line_no, newer updated_at wins), bad rows to quarantine with a reason. Gold: dbt marts, published
to Delta only after every test passes.

**Model.** fct_order_lines (grain: order line), fct_payments (grain: payment event), dim_seller Type 2 on tier and
city via a dbt snapshot, dim_product Type 1, dim_customer with an HMAC key, agg_daily_seller_sales.

**Stack.** Laptop: Docker Compose (PostgreSQL, fake API, Kafka KRaft), PySpark local[4], dbt-duckdb, deltalake,
Prefect. Optional AWS: S3 lake, Glue catalogue, Athena workgroup with a scan cutoff, budget alarm first; no hourly
services outside sessions.

**Checks that stop the publish.** dbt tests (unique and not-null keys, accepted statuses, positive amounts,
relationships, GMV reconciles to silver); after publish: reconciliation, volume against the day before, freshness,
quarantine rate under 0.5%.

**Not doing:** real payments, a BI tool beyond one dashboard, CDC from the ops database (watermark extracts are
enough at this volume; Debezium would be the next step), multi-region anything.`,
    mcqs: [
      mcq('Haatly\'s seller dashboard must report sales "by the tier the seller had when the order was placed". What does that decide in the model?', [
        ['dim_seller keeps Type 2 history on tier, and the fact joins to the version valid at order time', true],
        ['dim_seller is overwritten each night, and the dashboard filters out sellers whose tier changed', false],
        ['The tier is stored only on the gold table, recomputed from the current seller row every night', false],
        ['Tier changes are ignored, because a seller\'s tier is a dimension attribute and not a measure', false],
      ], 'Reporting by the value at event time needs history, which is what a Type 2 dimension keeps (Slowly Changing Dimensions), joined point-in-time on valid_from and valid_to. Overwriting or recomputing from today\'s row moves past sales to the new tier, and dropping changed sellers loses their sales altogether.'),
      mcq('A student lists Haatly\'s three consumers and proposes Kafka and Spark Structured Streaming for all of them. What should PLATFORM.md say instead?', [
        ['Only the sale-evening payments board needs minutes; the dashboard and finance need a daily batch', true],
        ['Streaming everything is right, since a stream can always be read as a batch later on if needed', false],
        ['Nothing should stream, because Kafka cannot run on a laptop and the capstone must stay local', false],
        ['The seller dashboard must stream, because a 07:00 deadline is too tight for any daily batch', false],
      ], 'Batch, Micro-batch and Streaming taught to choose by the freshness each consumer needs: streaming costs more to build and run, so it goes only where minutes matter. Kafka runs in Docker on a laptop, and a 07:00 deadline for yesterday leaves hours for a batch.'),
      mcq('Why does the Haatly brief define one pipeline run as "one IST day", with the API pulled for updated_at in that day converted to UTC?', [
        ['Every run covers a fixed window, so a retry or backfill of that day reads exactly the same rows', true],
        ['The API refuses requests whose time range is not exactly twenty-four hours long in UTC terms', false],
        ['IST windows let the pipeline skip the late updates, which keeps the bronze layer much smaller', false],
        ['Daily runs are cheaper than hourly ones on a laptop, and the IST choice keeps the logs readable', false],
      ], 'A run tied to an interval, never to "now", is what makes reruns and backfills reproducible (Retries, Backfills and Idempotent Tasks). The IST boundary matches the business day the dashboard reports. Late updates are not skipped: they land in the next day\'s window and are merged.'),
    ],
    checkpoint: [
      mcq('Haatly\'s orders API re-sends an order each time its status changes. What is the grain of fct_order_lines, and which version does it keep?', [
        ['One row per order line (order_id + line_no), at the latest known version', true],
        ['One row per API response, so every status change keeps a row of its own', false],
        ['One row per order, with the lines summed into a single amount per order', false],
        ['One row per seller per day, since sellers are what the dashboard shows', false],
      ], 'Declaring the grain comes first (Dimensional Modelling): the line is the most detailed level the business asks about, and the latest status is what the consumers report. Keeping every response belongs in bronze; summing to orders loses the seller on each line; a seller-day is an aggregate, not a fact grain.'),
      mcq('Which of Haatly\'s planned writes would make a retried run double-count orders?', [
        ['Appending each pull of the API to bronze without replacing that interval', true],
        ['Merging silver on order_id and line_no, keeping the newer updated_at row', false],
        ['Overwriting the gold aggregate from the tested dbt mart after each run', false],
        ['Replacing the interval\'s quarantine partition with this run\'s bad rows', false],
      ], 'A blind append writes the same rows again on every retry (Idempotent, Restartable Loads). A key-based merge, a full overwrite of a derived table and a partition replace all give the same result however many times they run.'),
      mcq('Haatly\'s student wants to put the platform on AWS. Which plan keeps the cost predictable?', [
        ['A budget alarm first; S3, the Glue catalogue and Athena kept; Spark jobs only in timed sessions', true],
        ['A provisioned Redshift cluster and an EMR cluster left running all month so demos start quickly', false],
        ['Everything in one account with no tags, then a look at the bill at the end of the month to see', false],
        ['Provisioned MSK for the payments stream, because a managed broker is cheaper than Kafka in Docker', false],
      ], 'Pieces that bill by use (S3, the catalogue, Athena) can stay; anything billed per hour is created in a session and destroyed (The Cloud Data Stack). Always-on clusters and brokers bill whether used or not, and a bill read at month end is too late to act on.'),
    ],
  },

  /* ── BUILD_PIPELINES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CAPSTONE_BUILD_PIPELINES',
    notes: `**The build half of the platform: ingestion from an API and a database, a Delta lakehouse with bronze, silver
and gold, Spark for the heavy step, and dbt models with tests that decide whether gold is published — every step
safe to run twice.** The skills come from Python for Ingestion (Ingesting from APIs, Extracting from Databases,
Idempotent, Restartable Loads), Apache Spark (The PySpark DataFrame API, Window Functions, UDFs and Complex Types),
Warehouses and Lakehouses (Open Table Formats, The Lakehouse and Medallion Layers) and dbt and ELT.

Everything quoted below was run on a laptop with Haatly's generator: the outputs are real. Your numbers will differ
if you change the seed.

## The repository

    haatly-platform/
      PLATFORM.md  DECISIONS.md  README.md  Makefile  docker-compose.yml  .env.example
      gen/gen.py                  synthetic data: orders feed, ops DB snapshots per night
      fake_api/                   FastAPI stand-in for the order service (cursor pages, random 503s)
      pipeline/ingest.py  silver_spark.py  publish.py  checks.py
      dbt/  dbt_project.yml  profiles.yml  models/{staging,marts}  snapshots/  tests/
      orchestration/  flow.py (Prefect)  dags/haatly_daily.py (Airflow)     (next unit)
      stream/  producer.py  payments_consumer.py                             (next unit)
      infra/  main.tf                                                        (next unit, optional)
      tests/  pytest for ingest and silver on tiny fixtures

## Step 0 — The data

The generator writes 34,001 order versions for 27,000 orders (12,000 on 19 October, 15,000 on 20 October, a sale day
with 20% off), 400 sellers and 3,000 products, plus one copy of the ops database per night so the extract sees the
database as it stood when the job ran. Built in, on purpose:

- 7,000 orders are re-sent later with a new status, some the next day (late updates).
- One order is sent twice, identically (a retry on the API's side).
- Three lines have a price of -499.00 and two have no seller.
- Five orders have the status \`rto\` (return to origin), which no document mentions.
- Six sellers move from silver to gold tier at 14:45 IST on 20 October.

Commit the generator and its seed, never the data.

## Step 1 — Ingest one interval into bronze

One run covers one IST day, converted to UTC for the API. The extractor retries 429 and 5xx with backoff and follows
the cursor until it ends (Ingesting from APIs):

    def get_with_retry(session, url, params, attempts=5):
        for i in range(attempts):
            r = session.get(url, params=params, timeout=10)
            if r.status_code in (429, 500, 502, 503, 504):
                time.sleep(min(0.05 * 2 ** i, 1.0)); continue
            r.raise_for_status(); return r.json()
        raise RuntimeError(f"gave up after {attempts} attempts")

Bronze keeps the raw JSON as a string next to the keys and batch metadata, partitioned by interval, and **replaces
only that interval** — so a retry or a backfill overwrites the day instead of adding to it:

    write_deltalake(path, table, mode="overwrite", partition_by=["_interval_date"],
                    predicate=f"_interval_date = '{day}'")

Run for both days, then the second day again:

    bronze.orders  interval=2026-10-19 pages=135 api_calls=158 rows=13476 table_version=0 table_rows=13476
    bronze.sellers interval=2026-10-19 rows=400
    bronze.orders  interval=2026-10-20 pages=206 api_calls=240 rows=20525 table_version=1 table_rows=34001
    bronze.sellers interval=2026-10-20 rows=6
    bronze.orders  interval=2026-10-20 pages=206 api_calls=240 rows=20525 table_version=2 table_rows=34001

The re-run created a new table version and the same 34,001 rows. The 23 extra calls on the 19th are 503s the retry
absorbed. The sellers extract takes rows whose updated_at falls in the window (Extracting from Databases), so the
second day brings only the six sellers that changed. Keep bronze raw: when a parsing bug is found in March, you
re-run silver from bronze instead of asking the source team for October again.

## Step 2 — Silver in Spark: parse, explode, keep the latest, quarantine

The heavy step parses JSON, explodes the nested lines and keeps one row per order line — work that grows with the
data and is the reason Spark is here. Spark reads exactly the files the Delta log says are live for that interval:

    files = DeltaTable(bronze_path).file_uris(file_pruning_predicate=f"_interval_date = '{day}'")
    raw = spark.read.parquet(*files)
    o = raw.select(F.from_json("payload", ORDER).alias("o")).select("o.*")
    lines = (o.select("order_id", "customer_id", "status", "payment_method",
                      F.to_timestamp("placed_at").alias("placed_at"),
                      F.to_timestamp("updated_at").alias("updated_at"), F.explode("items").alias("l"))
              .select("*", "l.line_no", "l.product_id", "l.seller_id", "l.qty",
                      F.col("l.unit_price").cast("decimal(12,2)").alias("unit_price")).drop("l"))
    w = Window.partitionBy("order_id", "line_no").orderBy(F.col("updated_at").desc())
    latest = lines.withColumn("rn", F.row_number().over(w)).where("rn = 1").drop("rn")
    reason = (F.when(F.col("seller_id").isNull(), "seller_id missing")
               .when(F.col("unit_price").isNull() | (F.col("unit_price") <= 0), "unit_price not positive")
               .when(F.col("qty") <= 0, "qty not positive"))

Prices arrive as strings and become decimal(12,2), never float: money that does not add up to the paisa fails
finance's reconciliation. On a real cluster, read Delta directly with the delta-spark package
(\`spark.read.format("delta")\`); on this Windows laptop Spark cannot write files without winutils, so the result
was collected and written with deltalake (delta-rs). Run it on WSL2 or in Docker and Spark can write Delta itself.

Silver is a **MERGE** on the line's key, where a newer version wins (Upserts with MERGE and INSERT ... ON CONFLICT):

    DeltaTable(silver).merge(good, predicate="t.order_id = s.order_id AND t.line_no = s.line_no",
                             source_alias="s", target_alias="t") \\
        .when_matched_update_all(predicate="s.updated_at > t.updated_at") \\
        .when_not_matched_insert_all().execute()

Real output, the 19th, the 20th, then the 20th again:

    interval 2026-10-19: bronze rows 13476, lines 26922, latest lines 24000, good 24000, quarantined 0
      merge: {'num_source_rows': 24000, 'num_target_rows_inserted': 24000, 'num_target_rows_updated': 0}
    interval 2026-10-20: bronze rows 20525, lines 40814, latest lines 34884, good 34880, quarantined 4
      quarantine: seller_id missing        1
      quarantine: unit_price not positive  3
      merge: {'num_source_rows': 34880, 'num_target_rows_inserted': 29820, 'num_target_rows_updated': 5060}
      silver.order_lines rows 53820, version 2
    interval 2026-10-20: ... merge: {'num_source_rows': 34880, 'num_target_rows_inserted': 0, 'num_target_rows_updated': 0}

Read it like a reviewer. The 5,060 updates are lines of 19 October orders whose status changed on the 20th: late
data, absorbed by the merge. Only one of the two "missing seller" lines is quarantined because the other order was
re-sent later with its seller filled in, and the latest version wins. The re-run changed nothing. Quarantined rows go
to their own Delta table with the reason and the interval, replaced per interval like bronze (Automated Checks with
Pandera, dbt Tests and Great Expectations): nothing is dropped silently, and the count is a monitored number.

**A trap worth seeing once.** A Delta table's folder holds old files that the log no longer points to. Counting
silver two ways:

    delta_scan rows         53820
    read_parquet(*) rows    77820

Reading the Parquet files directly counts every superseded version: 24,000 rows too many. Always read a Delta table
through the log (delta_scan in DuckDB, a Delta reader in Spark, the Glue/Athena Delta support in AWS), never with a
wildcard over the folder (Open Table Formats: Delta Lake and Apache Iceberg).

## Step 3 — dbt on the lakehouse

dbt-duckdb reads silver through the Delta log. The source declares where the data is and how fresh it must be:

    sources:
      - name: silver
        meta:
          external_location: "delta_scan('{{ var(\\"lake\\") }}/silver/{name}')"
        tables:
          - name: order_lines
            loaded_at_field: updated_at
            freshness:
              warn_after: {count: 26, period: hour}
              error_after: {count: 36, period: hour}
          - name: sellers

The profile loads the extension (\`extensions: [delta]\` under the duckdb output). Staging fixes names, types and
the business day — **in IST**, explicitly, because a bare cast of a UTC timestamp to a date uses whatever time zone
the session has:

    select
        order_id || '-' || line_no                          as order_line_key,
        order_id, line_no, customer_id, seller_id, product_id, status, payment_method,
        cast(timezone('Asia/Kolkata', placed_at) as date)   as order_date,
        placed_at, updated_at, qty, unit_price, line_amount
    from {{ source('silver', 'order_lines') }}

Seller history comes from a **snapshot** with the timestamp strategy, so a change is dated by when it happened in
the source, not by when the pipeline noticed (Incremental Models and Snapshots):

    snapshots:
      - name: sellers_snapshot
        relation: ref('stg_sellers')
        config:
          schema: snapshots
          unique_key: seller_id
          strategy: timestamp
          updated_at: updated_at

dim_seller renames dbt_valid_from and dbt_valid_to and closes open rows at 9999-12-31. The gold mart joins each line
to the seller version valid **when the order was placed**:

    select f.order_date, f.seller_id, d.tier as seller_tier,
           count(distinct f.order_id) as orders, sum(f.line_amount) as gmv
    from {{ ref('fct_order_lines') }} f
    join {{ ref('dim_seller') }} d
      on d.seller_id = f.seller_id
     and f.placed_at >= d.valid_from and f.placed_at < d.valid_to
    where f.status <> 'cancelled'
    group by all

Seller S0001 after both days: one row silver until 2026-10-20 14:45 IST, one row gold from then on; its sales split
83 seller-orders at silver and 24 at gold. The gold table has 806 rows for two days of 400 sellers because the six
sellers who changed tier have two rows on the 20th — one per tier. That is the point of Type 2.

**Tests** (Tests, Documentation and Sources): unique and not_null on order_line_key; accepted_values on status;
not_null and relationships on seller_id; a custom generic test \`positive_value\` on line_amount; not_null on gmv;
and a singular test that gold reconciles to silver to the paisa:

    with a as (select sum(gmv) as gmv from {{ ref('agg_daily_seller_sales') }}),
         s as (select sum(line_amount) as gmv from {{ source('silver', 'order_lines') }}
               where status <> 'cancelled')
    select a.gmv as agg_gmv, s.gmv as silver_gmv from a, s where a.gmv <> s.gmv

The 19th built clean. On the 20th, \`dbt build\` stopped:

    FAIL 1 accepted_values_fct_order_lines_status__placed__shipped__delivered__cancelled
    SKIP relation analytics.agg_daily_seller_sales
    SKIP test gmv_reconciles_to_silver
    Got 1 result, configured to fail if != 0
    Done. PASS=10 WARN=0 ERROR=1 SKIP=3 NO-OP=0 REUSED=0 TOTAL=14

One unexpected value: \`rto\`. dbt build runs tests in DAG order, so the mart that reads the failing model was
skipped — the dashboard kept showing yesterday's correct numbers instead of today's unexplained ones. The fix is a
conversation, not a code change: the operations team confirmed rto means a parcel returned undelivered, and finance
decided it is not revenue. Add it to accepted_values, exclude it from GMV if the business says so, and record the
decision in DECISIONS.md. Then:

    Done. PASS=14 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=14

## Step 4 — Publish gold only after the tests pass

publish.py copies the tested mart to the gold Delta table; the orchestrator runs it only when dbt build succeeded.
This is write-audit-publish: build somewhere private, test it, then expose it in one step.

    gold.daily_seller_sales version 0 rows 400       (after the 19th)
    gold.daily_seller_sales version 1 rows 806       (after the 20th, once the fix was in)

The 19th's GMV was 3,50,58,006.00 when first published and 3,30,54,132.00 after the 20th — because cancellations
of 19 October orders arrived on the 20th. **Yesterday's number changed, correctly.** That is the panel's hard
question, and the answer is: restatement is expected with late updates; the dashboard labels days that are still
open to change, and finance reconciles against the version as of a cut-off.

## Deliverables

1. PLATFORM.md from the Brief; DECISIONS.md (every choice, with what production would do differently).
2. The generator, docker-compose.yml, and a Makefile or README that loads two days from a clean clone.
3. ingest.py with retries, interval windows and replace-by-interval writes; pytest for the extractor against a fake
   API that returns 503s and a cursor.
4. silver_spark.py: parse, explode, latest-version, quarantine with reasons, MERGE; a pytest that runs the transform
   on a ten-row fixture with a local SparkSession.
5. The dbt project: sources with freshness, staging, the snapshot, fct, dim and agg models, every test above, and
   \`dbt docs generate\` output.
6. publish.py and a run log showing: both days, a failing test that blocked the publish, and the re-run of a day
   with identical silver and gold.

## Acceptance checks

- Running any day twice leaves bronze, silver, quarantine and gold row counts unchanged.
- The gold GMV equals the silver GMV for non-cancelled lines, to the paisa.
- No money column is a float anywhere from silver onwards.
- A new status value, a duplicate key or a non-positive amount fails dbt build and leaves gold untouched.
- Nothing reads a Delta table's folder with a wildcard.

## Common traps

- **Deduplicating on order_id alone.** An order has several lines; the key is order_id + line_no.
- **Ordering by ingestion time.** "Latest" means the source's updated_at, not when your job saw it.
- **A check-strategy snapshot in a backfill.** It dates every change at the run time, so a backfill of last month
  invents history; use the timestamp strategy when the source has a trustworthy updated_at.
- **Joining to the current dimension row.** Past sales move to today's tier; join on the validity window.`,
    mcqs: [
      mcq('Haatly\'s silver MERGE reported 5,060 updated rows on 20 October although every order placed that day was new. Where did the updates come from?', [
        ['Lines of 19 October orders whose status changed on the 20th and were re-sent by the API', true],
        ['The API retry duplicate, which the merge counted once per line in the repeated order', false],
        ['Quarantined lines from the 19th being moved back into silver after the fix was deployed', false],
        ['Spark re-reading the 19th\'s bronze files, because the interval filter used the UTC date', false],
      ], 'A status change re-sends the order with a newer updated_at, and the merge\'s "newer wins" rule updates the existing line: late data handled by design. The exact duplicate was removed by row_number before the merge, quarantine is never merged back automatically, and the Delta log filter returned only the 20th\'s files.'),
      mcq('After the 20 October run, Haatly\'s 19 October GMV had fallen by about 20 lakh rupees. What is the right response?', [
        ['Expected: cancellations of 19 October orders arrived later; label open days and reconcile at a cut-off', true],
        ['A bug: the 20th\'s run must never touch the 19th, so the gold table should be partitioned and frozen for good', false],
        ['Data loss: restore the gold table to version 0 with time travel and rerun the 20th on its own again', false],
        ['A test gap: add a dbt test that fails whenever a published day\'s GMV changes from its first value', false],
      ], 'Late updates restate earlier days, and the dashboard should say which days are still open (The Lakehouse and Medallion Layers). Freezing or rolling back would publish revenue for cancelled orders, and a test against any change would fail every correct restatement.'),
      mcq('Why does Haatly\'s dbt project build the seller history with strategy: timestamp on updated_at rather than strategy: check?', [
        ['A timestamp snapshot dates each change by the source\'s updated_at, so a backfill does not invent history', true],
        ['The check strategy cannot compare text columns such as tier and city, only numeric and date columns of a table', false],
        ['dbt-duckdb supports only the timestamp strategy, because DuckDB has no MERGE statement to run checks', false],
        ['Timestamp snapshots run faster on Delta sources, since they read only the files written that day', false],
      ], 'A check snapshot stamps a change with the time dbt ran, which is wrong for any run that is not on the day of the change (Incremental Models and Snapshots); the point-in-time join then puts orders on the wrong tier. Check compares any column type, and the adapter supports both strategies.'),
    ],
    assignment: {
      title: 'Capstone: Ingestion, the Lakehouse and dbt',
      description: 'Build the pipeline side of the data platform: interval ingestion from an API and a database into bronze, a Spark step that produces a deduplicated, quarantined silver layer with MERGE, dbt models with a Type 2 dimension and tests, and a gold layer published only when the tests pass — every step safe to re-run.',
      instructions: `Build the pipelines for the option you chose in the Brief, as described in this unit's notes, on your laptop
with Docker, PySpark, dbt-duckdb and deltalake. Submit a link to the repository (or a zip) and a short screen
recording of the run log.

**Submit:**

1. PLATFORM.md (sources, consumers, freshness, the model with every grain declared) and DECISIONS.md (each choice,
   with the production alternative).
2. The data generator with a fixed seed, docker-compose.yml, and a one-command way to load two days from a clean clone.
3. Ingestion: interval windows in the business time zone, retries with backoff, cursor pagination, replace-by-interval
   bronze writes; pytest against a fake API that fails sometimes.
4. The Spark step: parse, explode, latest version per key by the source's updated_at, quarantine with reasons, a MERGE
   into silver, money as decimals; a pytest on a tiny fixture.
5. The dbt project: sources with freshness, staging, a timestamp snapshot, fact, Type 2 dimension and gold aggregate
   with a point-in-time join; key, accepted-values, relationship, custom generic and reconciliation tests.
6. A run log that shows both days, a test failure that blocked the publish and how it was resolved, and one day re-run
   with unchanged counts at every layer.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Ingestion', description: 'Interval-bound extracts in the business time zone; retries and backoff on 429/5xx; cursor pagination to the end; incremental database extract; bronze kept raw and replaced per interval.', maxPoints: 20 },
        { criterion: 'Lakehouse layers on Delta', description: 'Bronze, silver, quarantine and gold with clear contracts; silver MERGE on the full key with newer-wins; reads through the Delta log only; decimals for money.', maxPoints: 20 },
        { criterion: 'The Spark step', description: 'JSON parsed with an explicit schema; nested lines exploded; latest version by a window; quarantine reasons; tested on a small fixture; runs in local mode and would run on a cluster unchanged.', maxPoints: 15 },
        { criterion: 'dbt models and the dimensional model', description: 'Declared grains; staging that fixes types and the business day; Type 2 seller history from a timestamp snapshot; point-in-time join; documented models.', maxPoints: 20 },
        { criterion: 'Tests and the publish gate', description: 'Key, accepted-values, relationship, positive-amount and reconciliation tests; source freshness; gold published only after dbt build passes; a blocked publish shown and resolved with the business.', maxPoints: 15 },
        { criterion: 'Re-runnability and honesty', description: 'Every step re-run with identical counts, shown in the log; restatements of earlier days explained; what ran locally and what is a stand-in is labelled.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_OPERATE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CAPSTONE_BUILD_OPERATE',
    notes: `**The operate half: the pipeline on a schedule with retries and backfills, one streaming feed that neither
loses nor double-counts, checks and alerts that catch silent failures, lineage and protected personal data — and,
optionally, the platform on AWS with a cost report and a teardown that leaves nothing billing.** It draws on
Orchestration (Retries, Backfills and Idempotent Tasks; Sensors, Data-Aware Scheduling and Alerts; Prefect and
Dagster in Practice), Streaming (Delivery Guarantees and Exactly-Once; Stream Processing with Spark Structured
Streaming), Data Quality and Governance, and The Cloud Data Stack.

## Part 1 — Orchestrate the day

The orchestrator is a thin layer over the scripts you already have: every step is a CLI that takes the IST day, so
moving from Prefect to Airflow is a wrapper, not a rewrite.

**On a laptop, Prefect.** The flow that ran the 20th end to end (Prefect 3.9, a temporary local server; abridged):

    @task(retries=3, retry_delay_seconds=[10, 30, 90])
    def ingest(day: str): return run([PY, "-I", "ingest.py", day])

    @task(retries=0)                      # a failing data test must stop the run, not be retried
    def dbt_build(): return run([DBT, "build", "--profiles-dir", "."], cwd="dbt")

    @flow(name="haatly-daily", log_prints=True)
    def haatly_daily(day: str):
        for step in (ingest(day), silver(day), dbt_build(), publish()):
            get_run_logger().info(step)
        print(checks(day))

    Task run 'ingest-4fc' - Finished in state Completed()
    Task run 'silver-5fc' - Finished in state Completed()
    Task run 'dbt_build-1ed' - Finished in state Completed()
    Task run 'publish-891' - Finished in state Completed()
    Flow run 'fragrant-hare' - merge: {'num_source_rows': 34880, 'num_target_rows_inserted': 0, 'num_target_rows_updated': 0}
    Flow run 'fragrant-hare' - gold.daily_seller_sales version 3 rows 806
    Task run 'checks-fe3' - Finished in state Completed()
    Flow run 'fragrant-hare' - Finished in state Completed()

The retry policy differs by step on purpose: the API flakes and recovers, so ingest retries; a failing dbt test is a
fact about the data, and retrying it only delays the alert.

**Or Airflow in Docker** (the official docker-compose for Airflow, on WSL2 if you are on Windows). The same pipeline
as an Airflow 3 DAG — written from the documentation and checked with py_compile, not run here:

    GOLD_SALES = Asset("s3://haatly-lake-dev/gold/daily_seller_sales")
    DAY = "{{ data_interval_start.in_timezone('Asia/Kolkata') | ds }}"

    @dag(
        dag_id="haatly_daily",
        schedule=CronDataIntervalTimetable("30 1 * * *", timezone="Asia/Kolkata"),
        start_date=pendulum.datetime(2026, 10, 1, tz="Asia/Kolkata"),
        catchup=False,
        max_active_runs=1,
        default_args={"owner": "data-platform", "retries": 2, "retry_delay": timedelta(minutes=3),
                      "retry_exponential_backoff": True, "execution_timeout": timedelta(minutes=40),
                      "on_failure_callback": alert_on_failure},
        tags=["haatly", "tier-1"],
    )
    def haatly_daily():
        ingest_orders = BashOperator(task_id="ingest_orders", retries=4,
                                     bash_command=f"python /opt/haatly/ingest.py {DAY}")
        silver = BashOperator(task_id="silver_spark", bash_command=f"python /opt/haatly/silver_spark.py {DAY}")
        dbt_build = BashOperator(task_id="dbt_build", retries=0,
                                 bash_command="cd /opt/haatly/dbt && dbt build --profiles-dir . --target prod")
        publish = BashOperator(task_id="publish_gold", outlets=[GOLD_SALES],
                               bash_command="python /opt/haatly/publish.py")
        ...
        ingest_orders >> silver >> dbt_build >> publish >> checks()

    haatly_daily()

The explicit CronDataIntervalTimetable makes the run that fires at 01:30 IST on the 21st cover the interval that
started at 01:30 on the 20th, and the business day comes from data_interval_start in IST — never from ds, which is a
UTC date (Airflow DAGs, Tasks and Operators). The publish task declares the gold table as an Asset, so a downstream
DAG (a dashboard refresh) can be scheduled on the data instead of on a guessed time. Airflow 2.x spells it Dataset and
imports from airflow.decorators; write down which version you ran.

**The backfill.** Generate a week, then re-run it twice. With Airflow 3:

    airflow backfill create --dag-id haatly_daily \\
        --from-date 2026-10-13 --to-date 2026-10-19 --max-active-runs 1 --reprocess-behavior completed

With Prefect, a loop over the days calling the flow is enough. max_active_runs 1 matters here: silver merges and the
snapshot are order-dependent, so days must run oldest first, one at a time. The evidence is a table of row counts
per layer after each pass — identical — and gold equal to the first pass.

## Part 2 — One streaming feed

The sale-evening board needs successful payments per five minutes. Run a one-node Kafka in Docker (KRaft mode, no
ZooKeeper; parsed with PyYAML, not run here):

    kafka:
      image: apache/kafka:3.9.0
      ports: ["9092:9092"]
      environment:
        KAFKA_NODE_ID: 1
        KAFKA_PROCESS_ROLES: broker,controller
        KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
        KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
        KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
        KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
        KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
        KAFKA_NUM_PARTITIONS: 6

Pin whatever current tag Docker Hub lists. The producer keys each event by order_id, so one order's events stay in
order in one partition (Apache Kafka: Topics, Partitions and Consumer Groups). The consumer writes a micro-batch to
bronze with a MERGE on event_id and **commits offsets only after the write lands** (confluent-kafka; py_compiled, not
run against a broker):

    consumer = Consumer({"bootstrap.servers": "localhost:9092", "group.id": "haatly-payments-bronze",
                         "auto.offset.reset": "earliest", "enable.auto.commit": False})
    consumer.subscribe(["payments"])
    while True:
        msgs = consumer.consume(num_messages=500, timeout=1.0)
        events = [json.loads(m.value()) for m in msgs if m.error() is None]
        if not events:
            continue
        (DeltaTable(SINK).merge(pa.Table.from_pylist(events), "t.event_id = s.event_id",
                                source_alias="s", target_alias="t")
            .when_not_matched_insert_all().execute())
        consumer.commit(asynchronous=False)

If your laptop cannot spare the memory, a **simulated** stream is accepted, labelled as such. The lab's simulation
(plain Python: three partitions, the same merge into Delta, a crash injected between the write and the commit):

    poll 1: 300 events, 300 new rows, committed offsets {0: 100, 1: 100, 2: 100}
    poll 2: 300 events, 300 new rows, committed offsets {0: 200, 1: 200, 2: 200}
    poll 3: 300 events written (300 new), CRASH before commit -> offsets not saved
    poll 4: 300 events, 0 new rows, committed offsets {0: 300, 1: 300, 2: 300}
    produced 1200, polls 6, rows in sink 1200, distinct event_ids 1200

At-least-once delivery re-sent 300 events; the idempotent sink turned that into exactly-once in effect (Delivery
Guarantees and Exactly-Once). The board then aggregates by **event time** in five-minute windows with a ten-minute
watermark — in Spark Structured Streaming, withWatermark("event_time", "10 minutes") and a window on event_time. The
simulation of the same rule:

    window 13:55-14:00 UTC  success Rs 499
    window 14:00-14:05 UTC  success Rs 126,421
    window 14:05-14:10 UTC  success Rs 127,816
    windows 7, late events dropped 2: [('pay-00227', '13:51:40', '13:55:39'), ('pay-00827', '14:06:40', '14:10:39')]

An event four minutes late still counted; two that were fourteen minutes late arrived after the watermark had closed
their window. They are not lost — they are in bronze, and the nightly batch, which does not need a watermark, counts
them. Say that in DECISIONS.md: the live board is approximate, the batch is the record.

## Part 3 — Checks, freshness and alerts

dbt tests guard the build. After publishing, checks.py asks the questions a consumer would and exits non-zero on any
failure, which fails the task and fires the alert:

    PASS  gold GMV = silver GMV                            67400316.80 vs 67400316.80
    PASS  orders published for the interval                28299 (day before: 21872)
    PASS  orders within 50%-200% of day before             ratio 1.29
    PASS  freshness: newest line < 2 h before interval end 0.02 h
    PASS  quarantine rate < 0.5% of lines                  4 of 53820

Reconciliation catches a broken join; the volume check catches a half-loaded day that every row-level test would
pass (Data Observability and Lineage); the quarantine rate catches a source that started sending garbage. Set
thresholds from your own history, and note that a sale day is a known spike: the ratio of 1.29 is the sale.

Freshness from the consumer's side: \`dbt source freshness\` run a week after the last load said

    ERROR STALE freshness of silver.order_lines

which is correct. Schedule it before the 07:00 deadline, so the team hears that the data is late before the
sellers do. Every alert names the run, the failing check and a runbook link; a check that pages must be one somebody
acts on.

## Part 4 — Lineage and governance

**Lineage.** \`dbt docs generate\` gives the model graph from sources to marts; add exposures for the dashboard so
"what breaks if silver.order_lines is late?" has an answer on screen. Airflow emits OpenLineage events through its
provider; describe it in outline if you used Prefect.

**Personal data.** customer_id is pseudonymised in silver with a keyed hash (HMAC-SHA256, key in a secrets manager
or an environment variable, never in the repository), so joins still work but the raw id never reaches gold:

    C004211 -> 45fa39ef02d1b5afe16f
    C004211 -> 45fa39ef02d1b5afe16f
    C051877 -> 5bd3157167e78a25b3d7

Same input, same key; nobody without the key can reverse it or rebuild it from a list of ids (Governance, Catalogues
and Personal Data). Write a one-page data inventory: which tables hold personal data, why, who may read them, how
long they are kept, and how a deletion request under the DPDP Act would be honoured — in outline, and check the
current rules.

## Part 5 — The cloud deployment (optional, bounded)

**Step 0: the budget, before anything else** (Terraform; parsed with python-hcl2, not applied):

    resource "aws_budgets_budget" "capstone" {
      name         = "haatly-capstone-monthly"
      budget_type  = "COST"
      limit_amount = var.monthly_budget_usd
      limit_unit   = "USD"
      time_unit    = "MONTHLY"
      notification {
        comparison_operator        = "GREATER_THAN"
        threshold                  = 100
        threshold_type             = "PERCENTAGE"
        notification_type          = "FORECASTED"
        subscriber_email_addresses = [var.alert_email]
      }
    }

Add an ACTUAL alert at 50% the same way. Billing data lags by hours: the alarm is a backstop, not a brake.

**The lake:** an S3 bucket with Block Public Access on and a lifecycle rule expiring Athena results; a Glue database;
an Athena workgroup that enforces its settings with a per-query scan limit, so a query without a partition filter
fails instead of scanning the lake:

    resource "aws_athena_workgroup" "capstone" {
      name          = "haatly-capstone"
      force_destroy = true
      configuration {
        enforce_workgroup_configuration = true
        bytes_scanned_cutoff_per_query  = 1073741824
        result_configuration {
          output_location = "s3://\${aws_s3_bucket.lake.bucket}/athena-results/"
        }
      }
    }

The pipeline writes Delta to s3:// paths with the same deltalake calls (credentials from your profile or an IAM role,
never in code); register gold for Athena and query it. If you run the Spark step in AWS, do it as a Glue job or on EMR
Serverless in a session you end the same day. CI checks it all on every pull request: pytest, dbt build on a fixture
lake, py_compile on the DAGs, terraform fmt -check and validate.

**The cost report** (one page): cost by service from Cost Explorer for the capstone tag, the biggest item and why,
what a month of production at real volume would cost from the Pricing Calculator (Athena by data scanned, S3 by
storage and requests, the compute by job time), and two savings with evidence — partition pruning measured as bytes
scanned before and after, and Parquet compaction (Performance and Cost in the Warehouse).

**The teardown checklist** (last):

1. Stop the stream and the orchestrator; confirm no scheduled job will write again.
2. Empty and delete the lake bucket (every object version if versioning was on), then \`terraform destroy\`.
3. Delete anything created outside Terraform: Glue jobs and their scripts, crawlers, EMR Serverless applications,
   CloudWatch log groups, Athena saved queries.
4. In the console, check S3, Glue, Athena, EMR and CloudWatch in every region you touched.
5. Keep the budget alarm for one more month and check the bill the next day.

## Deliverables

1. The flow or DAG with per-step retries, timeouts and a failure alert; a backfill of a week run twice with
   per-layer counts.
2. The stream: producer, consumer with commit-after-write and a merge sink; a crash test; event-time windows with a
   watermark; what happens to late events, in writing.
3. checks.py and dbt source freshness wired to alerts; one alert demonstrated by breaking the data on purpose.
4. The lineage graph with an exposure; the pseudonymisation; the data inventory.
5. Optional: Terraform for the AWS pieces, evidence of the budget alarm, the cost report and the completed teardown.

## Common traps

- **Retrying dbt test failures.** Three retries turn a two-minute alert into a twenty-minute one.
- **Auto-commit on the consumer.** Offsets can be committed before the write, and a crash loses events.
- **Backfilling days in parallel.** Merges and snapshots applied out of order produce a history that never existed.
- **A cloud resource "just for tonight".** It is still there on the bill next month.`,
    mcqs: [
      mcq('In Haatly\'s daily flow, ingest retries three times but dbt build has retries=0. Why the difference?', [
        ['API errors are often transient; a failing data test is a fact about the data and will fail again', true],
        ['dbt cannot be retried safely, because a second build would duplicate every row in the marts', false],
        ['Prefect allows retries only on the first task in a flow, so later tasks must set retries to 0', false],
        ['dbt build is the slowest step, so retrying it would push the run past the 07:00 deadline every day', false],
      ], 'Retries are for failures that can succeed next time, such as a 503 (Retries, Backfills and Idempotent Tasks). A failed accepted_values test fails identically on retry, so retrying only delays the alert. dbt table builds are idempotent, and Prefect allows retries on any task.'),
      mcq('Haatly\'s payments consumer crashed after writing a micro-batch to Delta but before committing offsets. What happens next, and why is it safe?', [
        ['The batch is delivered again, and the MERGE on event_id inserts none of it a second time', true],
        ['The batch is lost, because Kafka deletes records once a consumer group has fetched them', false],
        ['The broker notices the crash and rolls back the Delta write before redelivering the batch', false],
        ['The batch is skipped, because the next poll begins after the highest offset ever fetched', false],
      ], 'Uncommitted offsets mean the group re-reads from the last commit: at-least-once delivery (Delivery Guarantees and Exactly-Once). The idempotent sink makes the repeat harmless, as the lab\'s simulation showed with 0 new rows. Kafka keeps records for the retention period, and it knows nothing of your Delta table.'),
      mcq('Two payments arrived fourteen minutes late on Haatly\'s sale evening and were dropped by the live board\'s ten-minute watermark. What should DECISIONS.md say?', [
        ['The board is approximate by design; the events are in bronze and the nightly batch counts them', true],
        ['The watermark must be removed, since a dashboard that drops any payment cannot be trusted at all', false],
        ['Late events are a source defect, so the payments team must stop phones from sending them late', false],
        ['The two events are lost for good, which is the accepted price of choosing streaming over batch', false],
      ], 'A watermark bounds how long state is kept, trading completeness for latency (Stream Processing with Spark Structured Streaming). The raw events are still stored, so the batch record is complete. Without a watermark, state grows for ever; offline phones are normal and cannot be prevented.'),
    ],
    assignment: {
      title: 'Capstone: Orchestration, Streaming, Quality and the Cloud',
      description: 'Run the platform reliably: an orchestrated daily schedule with backfills, one streaming feed with no loss or double counting, checks and alerts, lineage and protected personal data, and optionally the platform on AWS with a cost report and a teardown.',
      instructions: `Operate the platform you built in the previous unit, as described in this unit's notes. Everything must work on
your laptop; the AWS deployment is optional and, if done, must start with a budget alarm and end with the teardown
checklist. Submit a link to the repository (or a zip) and the recordings.

**Submit:**

1. The Prefect flow or Airflow DAG: business-day intervals, per-step retries and timeouts, no retries on test
   failures, a failure alert; a week backfilled twice, with row counts per layer after each pass.
2. The streaming feed: producer keyed by entity, consumer with commits after the write, an idempotent sink, a
   recorded crash test, event-time windows with a watermark, and the handling of late events explained. A simulated
   stream is accepted if labelled.
3. Post-publish checks (reconciliation, volume, freshness, quarantine rate) and source freshness wired to an alert;
   one deliberately broken run and the alert it raised.
4. Lineage (dbt docs with an exposure, or OpenLineage), the pseudonymised customer key, and a one-page data
   inventory with retention and deletion.
5. Optional: Terraform for the AWS pieces, evidence of the budget alarm created first, the cost report, and the
   completed teardown checklist with the next day's billing page.

**Before you submit,** check every deliverable in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Orchestration and backfills', description: 'Thin orchestration over CLIs; intervals in the business time zone; retries where failures are transient and none on tests; timeouts and alerts; a week backfilled twice with identical counts.', maxPoints: 20 },
        { criterion: 'Streaming', description: 'Keyed producer; commit-after-write consumer; idempotent sink proven by a crash test; event-time windows with a watermark; late events reconciled by the batch.', maxPoints: 20 },
        { criterion: 'Quality, freshness and alerting', description: 'Reconciliation, volume, freshness and quarantine checks with thresholds from history; source freshness before the deadline; alerts that name the check and a runbook; one real alert shown.', maxPoints: 20 },
        { criterion: 'Lineage and governance', description: 'Lineage from source to dashboard; personal data pseudonymised with a keyed hash and the key outside the repository; a data inventory with access, retention and deletion.', maxPoints: 15 },
        { criterion: 'Cloud and cost (or a written plan if not deployed)', description: 'Budget alarm first; least-cost services; Athena scan limit; no hourly services left running; a cost report with a production estimate and evidenced savings.', maxPoints: 15 },
        { criterion: 'Teardown and honesty', description: 'Teardown checklist completed in order; simulated, local and cloud runs labelled; limits of the live board and the lab stated plainly.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CAPSTONE_DEFENCE',
    notes: `**A data hiring panel — usually a senior data engineer, an analytics engineering lead, sometimes the manager
of the data platform — wants to watch the platform behave, not hear it described.** Twelve minutes of demo, twenty
of questions. This unit is the script, two live drills, the questions and what a strong answer contains.

## The twelve-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The business and its consumers | Haatly, the three consumers and their freshness, why only one streams |
| 1:00–2:30 | The architecture and the model | One diagram; bronze, silver, gold; the grains; the Type 2 seller dimension |
| 2:30–4:30 | A day, live | Trigger one IST day; the orchestrator's graph; row counts per layer; gold published |
| 4:30–6:30 | **The live backfill** | Re-run three days; counts before and after are identical; why: replace-by-interval and MERGE |
| 6:30–8:30 | **The broken-data drill** | Inject a new status and a negative price; dbt build fails; publish skipped; the alert; the fix |
| 8:30–10:00 | Stream and lineage | The payments board; the crash test; the lineage graph from source to dashboard |
| 10:00–11:00 | Cost and governance | The cost report or the plan; the pseudonymised key; the teardown evidence |
| 11:00–12:00 | What you learnt | One thing that surprised you, and what you would build next |

Run the whole demo twice the day before. Record every live step: if Docker or Spark misbehaves on the day, say so,
play the recording and carry on — the panel is also watching how you handle a failure.

## The two drills, rehearsed

**The live backfill.** Prepare a one-line command and a query that prints counts per layer. Show the counts, run the
backfill, show the counts again. Then say the sentence the panel is waiting for: "Bronze replaces the interval, silver
merges on the line key with newer-wins, gold is rebuilt from tested models — so a re-run cannot double anything."

**The broken-data drill.** Keep a script that edits the generator's output for one day: an unknown status and a
negative price. Run the day. Show the quarantine count rising, dbt build failing on accepted_values, the mart and the
publish skipped, and the alert. Show the dashboard still on yesterday's correct numbers. Then resolve it the way the
notes did: who you would ask, what you would change, where the decision is recorded.

## The questions, and what a strong answer contains

1. **"Walk me through one order from the API to the dashboard."** Interval pull with retries; raw JSON in bronze;
   parsed, exploded, latest version, quarantine, merge in silver; staging, fact and the point-in-time seller join in
   dbt; tests; publish; checks.
2. **"Yesterday's GMV changed this morning. Why?"** Late cancellations restated it; that is correct; days still open
   are labelled; finance reconciles at a cut-off. Have the actual numbers ready.
3. **"What is the grain of your fact table, and why not one row per order?"** One row per order line: an order can
   span sellers and the dashboard is per seller.
4. **"How do you know a re-run does not double-count?"** Show it; then explain each layer's write mode.
5. **"Why Delta and not plain Parquet folders?"** Atomic commits, MERGE, time travel to debug a bad publish, and a
   log that tells readers which files are live — the 77,820 versus 53,820 count.
6. **"Why Spark at this volume? DuckDB would do."** Honestly: DuckDB would, today. Spark is there for the step that
   grows with the data, written so it runs on a cluster unchanged; say at what volume you would actually need it.
7. **"A seller changed tier at 14:45. Which tier do the morning's orders show?"** The old one: the Type 2 dimension
   and the validity-window join, dated by the source's updated_at.
8. **"Your consumer crashed mid-batch. What happens?"** Redelivery from the last committed offset; the merge on
   event_id makes it harmless; auto-commit would have risked loss.
9. **"Why does the live board disagree with the nightly numbers?"** The watermark drops very late events from the
   board; bronze keeps them; the batch is the record.
10. **"Who can see customer data?"** Only silver holds even the pseudonymised key; the raw id never leaves bronze;
    the key is outside the repository; access by role; retention and deletion written down.
11. **"What does this cost on AWS, and what would production cost?"** The capstone bill by service; the estimate
    from the calculator; the biggest driver; one saving you measured.
12. **"With two more weeks, what would you build?"** One thing tied to evidence — CDC with Debezium from the ops
    database, data contracts with the order team, incremental dbt models when the full rebuild gets slow.

## Rehearse with these

Answer each in under a minute, aloud: the grain of each fact table; what each layer's write mode is and why; the
broken-data drill's outcome in one sentence; the biggest line on the bill (or the plan) and how to cut it.

## After demo day

If you deployed to AWS, run the teardown checklist the same day and attach the next day's billing page. A platform
that rebuilds from a clean clone in one command is worth more than one that is still running.`,
    mcqs: [
      mcq('A panellist asks Haatly\'s student why the platform uses Delta instead of plain Parquet folders. Which answer is strongest?', [
        ['Atomic commits, MERGE and a log of live files; reading the folder directly counted 24,000 extra rows', true],
        ['Delta files are smaller than Parquet files, so the lake costs less to store on S3 and on a laptop', false],
        ['dbt cannot read Parquet folders, so a table format was needed before any of the models would build', false],
        ['Delta replaces the need for dbt tests, because its schema enforcement rejects every kind of bad row', false],
      ], 'Open Table Formats taught what the log buys: transactions, merges, time travel and the list of live files, shown by the real 77,820 versus 53,820 count. Delta stores data as Parquet, so it is not smaller; dbt-duckdb reads Parquet fine; schema enforcement checks types, not business rules.'),
      mcq('During the broken-data drill the dbt build fails on accepted_values. What should the student show next?', [
        ['The mart and the publish skipped, the dashboard still on yesterday\'s numbers, and the alert', true],
        ['The test being disabled for the day, so the drill can finish within the twelve minutes given', false],
        ['A manual UPDATE that changes the new status to "delivered", so the build passes on the retry', false],
        ['The gold table rolled back with time travel, because the failing build has already published it', false],
      ], 'The point of the drill is that bad data stops at the gate: dbt build skips everything downstream of a failing test, so gold was never written (Automated Checks with Pandera, dbt Tests and Great Expectations). Disabling the test or rewriting values hides the problem; nothing needs rolling back.'),
      mcq('The panel says "DuckDB would handle Haatly\'s volume. Why Spark?" Which reply shows the most judgement?', [
        ['Agreed for today; the step is written to run on a cluster unchanged, and I would move at a stated volume', true],
        ['Spark is always faster than DuckDB once more than one CPU core is available on the machine it runs on', false],
        ['DuckDB cannot read JSON, so Spark was required to parse the API payloads before anything else could run', false],
        ['Data engineer job descriptions list Spark, so every pipeline should use it whatever the data volume is', false],
      ], 'Panels reward honest trade-offs: at lab volume a single-node engine wins, and Spark earns its overhead when data outgrows one machine (How Spark Works: Drivers, Executors and Lazy Plans). DuckDB reads JSON well, and single-node engines often beat Spark on small data.'),
      mcq('Asked "Who can see customer data on your platform?", which answer holds up?', [
        ['Raw ids stay in bronze; silver on carries an HMAC key whose secret is outside Git; access is by role', true],
        ['Nobody can, because customer_id is hashed with SHA-256 without a key before it is written to bronze', false],
        ['Everyone on the data team can, since the data is synthetic and the DPDP Act applies only to real data', false],
        ['Only the dashboard can, because gold tables are read-only and every lower layer is deleted each night', false],
      ], 'A keyed hash keeps joins working while the raw id stays in one guarded layer (Governance, Catalogues and Personal Data). An unkeyed hash of a short id can be reversed by hashing every possible id; "synthetic" is true of the lab but the design must suit real data; deleting bronze would end the ability to reprocess.'),
      mcq('The panel asks why Haatly\'s live payments board and the next morning\'s numbers differ by two payments. What is the best answer?', [
        ['The board\'s watermark dropped two very late events; bronze kept them and the batch counted them', true],
        ['The board double-counted two payments because the consumer commits its offsets before writing', false],
        ['The nightly batch reads a sample of the stream, so small differences from the board are expected', false],
        ['Two payments failed to reach Kafka at all, so the batch must have read them from another source', false],
      ], 'Event-time windows close at the watermark, so events later than it are left out of the live result but not out of storage (Stream Processing with Spark Structured Streaming). The consumer commits after writing, the batch reads everything, and the events did reach Kafka.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole Data Engineer track — modelling, ingestion, SQL, Spark, the lakehouse,
dbt, orchestration, streaming, quality and the cloud — at the level a data hiring panel expects. Choose what you
would actually do, and be ready to say why.`,
    checkpoint: [
      ck(MODEL, 'A ride-hailing company wants trip revenue by the driver\'s city at the time of each trip, and drivers do move cities. What should the driver dimension be?', [
        ['Type 2 on city, with the trip fact joined to the row valid at the trip\'s time', true],
        ['Type 1 on city, overwritten each night so every report uses the latest city', false],
        ['Type 3 with a previous_city column, joined to the current driver row each time', false],
        ['No dimension at all: store the city only on the driver table in the app database', false],
      ], 'Reporting by the value at event time needs full history and a point-in-time join (Slowly Changing Dimensions). Type 1 rewrites history, Type 3 keeps only one previous value, and the app database keeps only the current city.'),
      ck(MODEL, 'An analyst sums account_balance across every day of a month and reports a figure thirty times too large. What kind of measure is the balance?', [
        ['Semi-additive: it adds across accounts but not across time', true],
        ['Fully additive: the sum is right and the analyst misread it', false],
        ['Non-additive: it can never be summed along any dimension', false],
        ['Derived: it must be recomputed from the transactions table', false],
      ], 'A balance is a snapshot, so across time you take the last value or an average, while across accounts on one day you may sum it (Dimensional Modelling: Facts, Dimensions and the Star Schema). It is not non-additive, because summing across accounts is valid.'),
      ck(ETL, 'An ingestion job pulls rows with updated_at greater than the last run\'s start time, and some rows committed during the previous run are never loaded. What is the fix?', [
        ['Use fixed intervals with a small overlap and an idempotent merge, so a straddling row is read again safely', true],
        ['Read the whole table every night instead, since incremental extracts can never be made reliable enough', false],
        ['Use the row\'s created_at instead of updated_at, because creation times are always committed in order', false],
        ['Run the job twice as often, so the window in which rows can be missed becomes half as long as before', false],
      ], 'Rows committed with an updated_at earlier than the extract\'s window end can be missed by a strict boundary; an overlap re-reads them and a merge makes the repeat harmless (Extracting from Databases; Idempotent, Restartable Loads). Full reads do not scale, created_at misses updates, and a shorter window still loses rows.'),
      ck(ETL, 'A dbt model that rebuilds three years of orders every night now takes two hours. Most rows never change after thirty days. What is the usual fix?', [
        ['An incremental model that reprocesses a recent lookback window and merges on the key', true],
        ['A view instead of a table, so nothing needs to be rebuilt each night by the pipeline', false],
        ['More threads in profiles.yml, so the single model is split across several connections', false],
        ['A snapshot of the orders table, which stores only the rows that changed since yesterday', false],
      ], 'An incremental model with a lookback for late data and a unique_key merge rebuilds only what can change (Incremental Models and Snapshots). A view moves the cost to every reader, threads parallelise models not one query, and snapshots record history rather than building facts.'),
      ck(STREAM, 'A Spark job joining 2 billion clicks to 300 users by user_id spends most of its time in one task. What is the likely cause and fix?', [
        ['Skew on a few users; broadcast the small side, or let adaptive execution split the hot partition', true],
        ['Too few executors; double the cluster size so every partition finishes in half the time it takes', false],
        ['Parquet input; convert the clicks to CSV so that Spark can split the files into more partitions', false],
        ['Lazy evaluation; call count() after each step so the plan executes in smaller separate pieces', false],
      ], 'One slow task among many is the signature of skew, and a 300-row side is small enough to broadcast, avoiding the shuffle entirely (Data Skew, Caching and Tuning; Partitions, Shuffles and Joins). More executors leave the one hot task as slow, CSV is worse, and extra actions add work.'),
      ck(STREAM, 'A streaming job counts orders per minute by processing time, and a network outage makes one minute show triple the real count. What should it use?', [
        ['Event-time windows with a watermark, so each order counts in the minute it happened', true],
        ['A shorter trigger interval, so that bursts are spread across more micro-batches', false],
        ['Exactly-once delivery from Kafka, so the burst of late events is dropped on arrival', false],
        ['A larger consumer group, so that the backlog is processed before the minute closes', false],
      ], 'Processing time counts when events arrive, so a backlog lands in one window; event time places them where they belong, with a watermark bounding lateness (Batch, Micro-batch and Streaming). Delivery guarantees do not drop late events, and neither triggers nor consumers change which window an event belongs to.'),
      mcq('A daily Airflow DAG was fixed after a bug and must reprocess the last 30 days. Each task replaces its day\'s partition. How should the reprocessing run?', [
        ['A backfill over the 30 intervals, oldest first, with limited concurrency', true],
        ['One manual run with the date range hard-coded into each task\'s code', false],
        ['Thirty runs triggered at once, so the reprocessing finishes in one hour', false],
        ['Delete the 30 days of data and wait for the next scheduled run to refill', false],
      ], 'A backfill reruns the tasks per interval with the same code and parameters, which is safe because each task replaces its partition (Retries, Backfills and Idempotent Tasks). Hard-coded ranges are untested code, thirty parallel runs overload sources and break order-dependent steps, and scheduled runs only process the newest interval.'),
      mcq('A nightly load reported success, but finance found that one region\'s orders were missing for a day. Every row-level test had passed. Which check would have caught it?', [
        ['A volume check comparing rows per region with recent days, failing the run on a sharp drop', true],
        ['A not_null test on region_id, so that rows without a region are reported by the dbt build', false],
        ['A unique test on order_id, since missing rows usually show up as duplicates somewhere else', false],
        ['A longer retry delay on the extract, so the region\'s source has time to come back up again', false],
      ], 'Missing rows break no row-level rule, so only a monitor of volume against history notices them (Data Observability and Lineage). not_null and unique look at rows that exist, and retries do not help a run that reported success.'),
      ck(ETL, 'Analysts at an Athena-based company keep running queries that scan the whole lake. Which change limits the damage without blocking legitimate work?', [
        ['A workgroup with a per-query scan cutoff, plus tables partitioned by date in Parquet', true],
        ['Removing Athena access for analysts and sending them CSV extracts by email instead', false],
        ['Turning on S3 versioning, so each query reads only the newest version of each file', false],
        ['Moving the lake to S3 Glacier, so the data that is rarely queried costs far less to store', false],
      ], 'Athena bills by data scanned, so partitions and a columnar format cut normal scans and the workgroup cutoff stops a runaway one (Querying the Lake: Glue Catalogue and Athena). Versioning does not change what a query reads, and Glacier objects cannot be queried directly.'),
      mcq('A pipeline team wants to "load first and fix it later" by publishing new data straight to the dashboard table and running dbt tests afterwards. What is the better design?', [
        ['Build and test in a staging location, then publish to the dashboard table only if every test passes', true],
        ['Keep publishing first, but email the dashboard users whenever a test fails after the data is live', false],
        ['Run the tests weekly instead of daily, so that publishing is never delayed by a failing data test', false],
        ['Drop the tests and rely on users to report wrong numbers, because they know the business best', false],
      ], 'Write-audit-publish keeps bad data away from consumers: the publish step depends on the tests (The Lakehouse and Medallion Layers; Tests, Documentation and Sources). Testing after publishing means users see wrong numbers first, and fewer tests only find problems later.'),
    ],
  },
];
