/**
 * Career-track content: Warehouses and Lakehouses (DE_WAREHOUSE_LAKEHOUSE), Data Engineer, batch DE2.
 *
 * Where analytical data lives and what it costs to read: how a cloud warehouse stores and runs queries (columnar
 * storage, storage separated from compute, Redshift, BigQuery and Snowflake and their billing models), a data lake on
 * object storage that stays usable, open table formats (Delta Lake in depth, Apache Iceberg from the docs), the
 * engineering of medallion layers, and performance and cost control. It builds on "Operational and Analytical Data"
 * and the medallion outline in "Modern Modelling" (DE_DATA_MODELLING) and on partitioning, pruning and the first
 * small-files measurement in "Partitioning and Layout" (DE_SQL_ENGINEERING); those are referred to, not re-taught.
 * Athena and the Glue catalogue in depth belong to DE_CLOUD_DATA, and dbt to DE_DBT.
 *
 * Lessons follow PayNest, a fictional UPI payments app in Bengaluru, on synthetic data. Every output quoted from
 * DuckDB 2.0, pyarrow and deltalake 1.6 (delta-rs) was produced by running the code on a laptop; timings are there to
 * show an order of magnitude, nothing more. Redshift, BigQuery, Snowflake and Iceberg specifics are written from their
 * documentation and are marked as such; no prices are given, only how each service bills.
 *
 * Skills: the topic declares DATA_WAREHOUSING only, so every checkpoint question measures it.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DE_WAREHOUSE_LAKEHOUSE_BUNDLES: PilotBundle[] = [
  /* ── WAREHOUSE_ARCH ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_WAREHOUSE_ARCH',
    notes: `PayNest is a fictional UPI payments app in Bengaluru. Its analysts have outgrown a PostgreSQL read replica, and
the CTO asks the data team a direct question: "Redshift, BigQuery or Snowflake — and what will it cost us?" You met
the reason analytics needs a column store in "Operational and Analytical Data". This lesson opens the box: how a cloud
warehouse stores a table, runs a query on it, and turns that work into a bill.

## Three layers in every cloud warehouse

- **Storage.** Tables are kept as compressed columnar files on durable storage, cut into blocks, each block carrying
  metadata (row count, min and max of every column). Snowflake calls the blocks micro-partitions (50–500 MB of
  uncompressed data each, per its docs); BigQuery uses its own format, Capacitor; Redshift RA3 nodes keep data in
  managed storage backed by S3.
- **Compute.** A query is split into pieces that run in parallel on many workers: massively parallel processing
  (MPP). Snowflake gives you virtual warehouses, BigQuery gives you slots, Redshift gives you nodes or (Serverless)
  RPUs.
- **Services.** Catalog, optimiser, transactions, access control, the result cache. You rarely see this layer; you
  see its effects — a repeated query answered instantly, a block skipped because its min/max cannot match.

## Columnar storage, measured

A synthetic month of PayNest transactions — 5 million rows, 12 columns — written as one Parquet file with DuckDB 2.0
is 361.2 MB. pyarrow reads the size of every column from the file's footer:

    column                  MB  share
    remarks              167.3  46.3%
    payer_vpa             41.3  11.4%
    txn_ts                39.0  10.8%
    payee_vpa             38.6  10.7%
    amount_paise          24.3   6.7%
    txn_id                20.0   5.5%
    merchant_id           20.0   5.5%
    app_version            5.7   1.6%
    city                   1.9   0.5%
    merchant_category      1.9   0.5%
    device_os              0.7   0.2%
    status                 0.5   0.1%

A free-text remarks column is nearly half the table; eight distinct city names compress to 1.9 MB for 5 million rows.
A column store reads only the columns a query names, so the bytes a query touches are the sum of its columns:

    SELECT *                                    361.1 MB
    SELECT city, sum(amount_paise) GROUP BY      26.2 MB    (DuckDB EXPLAIN ANALYZE: Data Read 26.4 MB)

That arithmetic is what BigQuery's dry run reports before you run a query, and on its on-demand model it is what you
pay for. Two consequences follow. **SELECT * is the most expensive thing an analyst can type.** And **LIMIT does not
save bytes** on a columnar warehouse: BigQuery's docs state that LIMIT does not reduce bytes billed. Even DuckDB, which
can stop early, read 35.7 MB for SELECT * ... LIMIT 10 on one thread and 284.2 MB on eight, because every thread
starts by decompressing whole column chunks of a row group.

## Storage separated from compute

Old warehouses tied disks to servers: more data meant more servers, and every team queued on the same cluster. Cloud
warehouses keep one copy of the data on cheap storage and attach compute to it on demand. That gives you:

- **Scale each independently.** A 10 TB table does not need a big cluster if it is queried once a day.
- **Isolation.** The nightly load runs on one warehouse, dashboards on another, both reading the same tables.
- **Pay for compute only while it runs.** Suspend at night; resume when a query arrives.

Bigger compute is not automatically cheaper or faster. DuckDB's thread count stands in for warehouse size here (an
analogy, not a benchmark): median of five runs on the 5-million-row file.

    query                               threads   time    thread-seconds
    distinct payers per merchant           1     2.23 s       2.23
                                           2     1.61 s       3.23
                                           4     0.80 s       3.21
                                           8     0.58 s       4.64
    sum by merchant (light)                1     1.49 s       1.49
                                           8     0.93 s       7.46

The heavy query got 3.8 times faster for twice the thread-seconds. The light one got 1.6 times faster for five
times the thread-seconds: it had little work to split. On a warehouse billed per size per hour, thread-seconds are the
bill. Size up for queries that are compute-bound, not for ones that are small or waiting on something else.

## The three, compared (from their documentation)

    Redshift (AWS)
      Compute    provisioned clusters of RA3 nodes, or Redshift Serverless measured in RPUs
      Billing    provisioned: per node per hour while the cluster exists; Serverless: per RPU-hour while
                 queries run; managed storage per GB-month; Spectrum (querying S3) per data scanned
      You tune   distribution style and key (how rows spread across nodes), sort keys, WLM queues
    BigQuery (Google Cloud)
      Compute    serverless slots; you never see a server
      Billing    on-demand: per TiB processed by each query (a 10 MB minimum per table referenced);
                 or capacity: editions with slots billed per slot-hour, autoscaling; storage per GB-month,
                 cheaper for partitions untouched for 90 days, logical or physical (compressed) bytes
      You tune   partitioning, clustering, maximum bytes billed, reservations
    Snowflake (on AWS, Azure or GCP)
      Compute    virtual warehouses in T-shirt sizes; each size up doubles the credits per hour
      Billing    credits per second while a warehouse runs, with a 60-second minimum each time it starts;
                 storage per TB-month (compressed); cloud services charged only above a share of compute
      You tune   warehouse size, AUTO_SUSPEND, multi-cluster for concurrency, clustering keys

Azure's equivalents are Synapse (dedicated SQL pools sized in DWUs, or serverless SQL billed per data processed) and
Microsoft Fabric's warehouse on capacity units; "The Azure Data Stack" covers them.

## What actually drives the bill

Every model reduces to one of two shapes: **bytes scanned × a rate** (BigQuery on-demand, Spectrum, Athena) or
**compute time × size × a rate** (Snowflake, Redshift, BigQuery capacity), plus storage, which is usually the small
part. So the levers are the same everywhere: read fewer bytes (columns, partitions, clustering), keep compute busy
only while useful (auto-suspend, right size), and do not compute the same answer twice (summary tables, caches).
"Performance and Cost in the Warehouse" works through each with evidence.

A sensible default for a fresher's first decision: an AWS company starts on Redshift Serverless or a lakehouse with
Athena; a Google Cloud company on BigQuery; a company on several clouds, or wanting the least administration, on
Snowflake. All three are SQL warehouses with the same ideas underneath; your modelling and SQL carry across.`,
    workedExample: `**Scenario.** PayNest has three workloads: a nightly ELT job (about 40 minutes of heavy transformations), a
board of ten dashboards refreshed every 5 minutes from 08:00 to 22:00, and six analysts running ad-hoc queries
mostly in office hours. Explain to the CTO what each would cost on two billing models, in terms of what is billed,
not in rupees.

**1. On-demand, bytes scanned (BigQuery on-demand).** Cost = TiB processed × the rate on the pricing page.
- ELT: bytes read by each step; predictable, but every full rebuild reads whole tables.
- Dashboards: 10 boards × 12 refreshes an hour × 14 hours = 1,680 queries a day. If each reads the base transactions
  table's city and amount columns (26.2 MB in the lab month) that is about 44 GB a day for one month of data; a year
  of history is twelve times more. Pointing them at a daily summary table cuts this to almost nothing.
- Analysts: the risk is SELECT * on the widest table — 361 MB per query on the lab month, mostly the remarks column.

**2. Compute time (a Snowflake warehouse).** Cost = credits per hour for the size × hours running.
- ELT on its own warehouse, resumed for 40 minutes and suspended after: billed for about 40 minutes.
- Dashboards: a query every 5 minutes with AUTO_SUSPEND at 10 minutes means the warehouse never suspends — 14 hours
  of credits a day for perhaps a few minutes of real work. AUTO_SUSPEND = 60 and summary tables, or a shared
  warehouse, fix it.
- Analysts: a small warehouse that suspends after a minute idle; size it up only for a query that is compute-bound.

**3. The recommendation.** Separate warehouses (or reservations) per workload, so the dashboards cannot slow the
ELT and each cost is visible. Summary tables for dashboards. A rule and a training session against SELECT *. And a
query-history report every week: "Performance and Cost in the Warehouse" shows how to build it.`,
    mcqs: [
      mcq('A PayNest analyst runs SELECT * FROM upi_txn LIMIT 10 on BigQuery\'s on-demand model to "just peek" at a 2 TB table. What is billed?', [
        ['The bytes of every column across the whole table, since LIMIT does not cut bytes billed', true],
        ['Only the ten rows returned, because BigQuery stops reading once the limit is met', false],
        ['Nothing at all, because preview queries with a LIMIT are always free on BigQuery', false],
        ['Only the first partition of the table, because LIMIT restricts the scan to it', false],
      ], 'On-demand billing counts bytes in the referenced columns, and the docs say LIMIT does not reduce them. The console\'s table preview tab is free, but a query with LIMIT is not; nor does LIMIT restrict a scan to one partition.'),
      mcq('In the lab, eight threads made the light "sum by merchant" query only 1.6 times faster for five times the thread-seconds. What does this suggest about sizing a Snowflake warehouse up?', [
        ['It pays only when the query has enough compute work to split', true],
        ['A larger warehouse always halves the time at the same total cost', false],
        ['A larger warehouse reads fewer bytes, so it is always the cheaper one', false],
        ['Size makes no difference, since Snowflake bills per query, not per size', false],
      ], 'Each size up doubles credits per hour, so it is worth it only if the time drops by about half or more, which happens for compute-heavy work. Light queries do not split well, size does not change bytes read, and Snowflake bills by warehouse time and size.'),
      mcq('Which pair correctly matches a warehouse with how its compute is billed?', [
        ['Snowflake: credits per second while a warehouse runs, with a minimum per start', true],
        ['BigQuery on-demand: per hour that the project\'s slots are reserved for it', false],
        ['Redshift Serverless: per node per hour while the cluster exists, used or not', false],
        ['Snowflake: per TiB scanned by each query, whatever the warehouse size is', false],
      ], 'Snowflake bills warehouse time per second with a 60-second minimum each time it starts. BigQuery on-demand bills bytes processed (slot-hours are the capacity model), per-node hourly billing is provisioned Redshift, and per-TiB scanning is BigQuery on-demand, not Snowflake.'),
    ],
    checkpoint: [
      mcq('PayNest\'s nightly load and its dashboards slow each other down on one warehouse. What does separating storage from compute let the team do?', [
        ['Give each workload its own compute reading the same single copy of the tables', true],
        ['Copy the tables into a second warehouse for the dashboards and sync them nightly', false],
        ['Move the dashboards onto the storage layer so that they need no compute at all', false],
        ['Run the load and the dashboards in the same cluster but on alternating days', false],
      ], 'With storage separate, several compute clusters (warehouses, reservations) can read one copy of the data, so workloads are isolated without duplicating tables. A copy adds sync work and lag, every query needs compute, and alternating days is not isolation.'),
      mcq('A 5-million-row table is 361 MB; its remarks column is 167 MB and city plus amount_paise together are 26 MB. Roughly what does SELECT city, sum(amount_paise) ... GROUP BY city read?', [
        ['About 26 MB, the two named columns only', true],
        ['About 361 MB, the whole file every time', false],
        ['About 194 MB, everything except remarks', false],
        ['About 167 MB, the largest single column', false],
      ], 'A column store reads only the columns a query references; DuckDB reported 26.4 MB read. The whole file is SELECT *, and neither remarks nor "everything except it" is touched by this query.'),
      mcq('A Snowflake warehouse with AUTO_SUSPEND = 600 seconds serves a dashboard that runs a two-second query every five minutes from 08:00 to 22:00. Roughly how long is it billed for each day?', [
        ['About fourteen hours, because it never sits idle for ten minutes', true],
        ['About six minutes, the sum of the two-second queries in the day', false],
        ['Nearly three hours, a 60-second minimum for each of 168 starts', false],
        ['Nothing, since dashboard queries are answered from the result cache', false],
      ], 'The warehouse is never idle for 600 seconds, so it stays up and bills all fourteen hours. The 60-second minimum applies per resume, but it never suspends; the result cache only helps if the query and the data are unchanged, and fresh data defeats it.'),
    ],
  },

  /* ── DATA_LAKES ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_DATA_LAKES',
    notes: `A warehouse decides how data is stored for you. A data lake hands you the storage — S3 on AWS, ADLS Gen2 on Azure —
and lets any engine read any file in it: Spark, Athena, DuckDB, a Python script, an ML job. That freedom is why every
data platform has one, and why so many become swamps. This lesson lays out a lake that stays usable as it grows.

## Object storage is not a file system

- **Keys, not folders.** s3://paynest-lake/curated/upi_txn/txn_date=2026-10-05/part-0.parquet is one object whose key
  contains slashes. "Folders" are prefixes; listing a prefix returns at most 1,000 keys per request.
- **No cheap rename.** Renaming a "folder" on S3 is a copy and a delete of every object in it. ADLS Gen2 with the
  hierarchical namespace switched on has real directories and atomic renames, which some engines rely on.
- **Whole objects.** You write an object in one piece; you cannot append to one or edit a row in place. Updating
  data means writing new files — the problem the next lesson's table formats solve.
- **Consistency.** S3 has been strongly consistent for reads after writes and listings since December 2020, so the old
  "the new file is not listed yet" bugs are gone; partial reads of a folder that is still being written are not.

## Zones and paths

Most lakes keep the same stages, under whatever names the company uses:

    raw (landing)   exactly what arrived: JSON, CSV, API responses; never edited; long retention
    curated         typed, cleaned, deduplicated Parquet or table-format tables, partitioned
    consumption     aggregates and extracts for a team, a dashboard, a model

(The lakehouse lesson calls these bronze, silver and gold and adds table-format rules to each.) Use one bucket or
container per zone and environment — paynest-lake-prod-raw, paynest-lake-prod-curated — so access and lifecycle
rules can differ, and a path convention everyone can guess:

    s3://paynest-lake-prod-raw/upi_switch/transactions/ingest_date=2026-10-05/batch-0412.json.gz
         bucket(zone, env)     source     dataset      Hive-style partition    file

Lowercase, no spaces, source before dataset, partition keys as key=value so engines can read them as columns, and
the raw zone partitioned by when data **arrived** (ingest_date), because that is what you replay by.

## A local lake, queried

Fourteen days of synthetic PayNest transactions (2.8 million rows) were written by DuckDB with
PARTITION_BY (txn_date) into a lake/ folder: 14 files of about 3.9 MB each, at paths like
lake/curated/upi_txn/txn_date=2026-10-05/data_0.parquet. Reading with hive_partitioning = true turns txn_date into a
DATE column, and EXPLAIN ANALYZE shows what each filter opened:

    WHERE txn_date = DATE '2026-10-05'                  Scanning Files: 1/14    Data Read:  1.0 MB
    WHERE txn_date BETWEEN '2026-10-05' AND '2026-10-11' Scanning Files: 7/14   Data Read:  6.9 MB
    WHERE txn_ts in 5 Oct (not the partition column)    every file listed       Data Read:  2.4 MB
    no filter                                                                    Data Read: 13.8 MB

Pruning by folder works only on the partition column, as "Partitioning and Layout" showed; the txn_ts filter still
saved bytes through each file's min/max statistics but had to open every file to find that out.

## Schema on read, and where it bites

A warehouse checks types when you load (schema on write). Raw files in a lake are given a schema only when someone
reads them. On 2 October PayNest's app team changed amount from a number to a formatted string and added a field:

    day 1: {"txn_id": "T0", "amount": 120.5, "city": "Pune"}
    day 2: {"txn_id": "T9", "amount": "1,250.00", "city": "Pune", "upi_lite": true}

DuckDB's read_json_auto typed day 1's amount as DOUBLE. Reading both days with union_by_name = true, amount became
JSON (numbers and strings mixed) and upi_lite appeared as NULL for day 1. The first report that summed it failed:

    Conversion Error: Failed to cast value to numerical: "1,250.00" when casting from source column amount

The lake accepted the change silently; the failure surfaced in a consumer's report days later. Three defences: parse
raw into curated with explicit types and send rows that fail to a reject table rather than letting every reader
guess; keep curated in Parquet or a table format, where the schema travels with the data; and agree a data contract
with the producing team, so a type change is announced, not discovered.

## The small-files problem, measured on a lake

A streaming job that writes one file per minute produces 1,440 files a day. The same 7 days of transactions (1.4
million rows) were written two ways with pyarrow:

    layout                files    total size   average file   rows per file
    one file per minute  10,080       50.0 MB        5.0 kB             139
    one file per day          7       28.3 MB    4,046.3 kB         200,000

    query (DuckDB, 4 threads, median of 5)     per minute    per day
    week, SUM by city                             1,471 ms      32 ms
    one day, SUM by city                            350 ms      14 ms
    count(*)                                      1,217 ms       5 ms

The minute layout is 77% larger — each 5 kB file carried a 1,363-byte footer and compressed poorly — and 46 times
slower for the week. On S3 it is worse: at least 11 LIST calls and 10,080 GET requests against 1 and 7, each one paid for and each
with network latency. Fixes, in order: write bigger batches where the freshness need allows; run a compaction job
that rewrites a day's small files into a few large ones once the day is complete; or use a table format whose
OPTIMIZE command does it safely while readers keep reading. Aim for files in the tens to hundreds of megabytes.

## A catalogue turns files into tables

Without a catalogue every reader must know the path, format, schema and partitions. The AWS Glue Data Catalog (or a
Hive metastore, or Databricks Unity Catalog) stores them once under a table name, so Athena, Spark on EMR and Redshift
Spectrum all read upi_txn the same way. Crawlers, partition projection and Athena's billing are covered in "Querying
the Lake: Glue Catalogue and Athena"; Azure's equivalent is a Synapse or Fabric lakehouse catalogue over ADLS Gen2.

## How a lake becomes a swamp

    symptom                                               prevention
    nobody knows who owns s3://.../tmp_rahul_final2/       an owner and a purpose per dataset, in the catalogue
    three copies of transactions, all different            one curated table per entity; others are views
    paths that no one can guess                             a written path convention, checked in CI
    personal data in raw, readable by everyone              zone-level access (Lake Formation, ADLS ACLs), PII tagging
    storage bill that only grows                            lifecycle rules: raw to cheaper tiers, then expiry
    readers break when a producer changes a field           typed curated layer, rejects table, data contracts

A lake stays useful when every file has an owner, a schema, a place in a known layout, and a retention rule.`,
    workedExample: `**Scenario.** PayNest's lake today: one bucket, paynest-data, with folders named by whoever created them —
upi/, UPI_new/, txns-2026/, rahul_test/. Analysts find 40,000 JSON files per day from the UPI switch, written every
two seconds, and Athena queries on them are slow and expensive. Design the replacement.

**1. Buckets per zone and environment.** paynest-lake-prod-raw, -curated, -consumption, and the same three for dev.
Raw is writable only by ingestion jobs and readable by the data team; curated readable by analysts; consumption by
the BI tool and ML roles.

**2. Raw layout.** s3://paynest-lake-prod-raw/upi_switch/transactions/ingest_date=YYYY-MM-DD/hour=HH/... The switch
keeps writing small files there — raw is the record of what arrived, not something analysts query.

**3. Curated layout.** A job each hour (and a final one after midnight) reads the raw hour, parses with explicit
types, writes rejects to upi_txn_rejects with the reason, and writes curated/upi_txn partitioned by txn_date (the
event's IST date, the column analysts filter on) as Parquet. At a few million rows a day that is one to a few files
of tens of megabytes per day, not 40,000.

**4. Check the file sizes.** In the lab, a minute-per-file layout was 77% larger and 46 times slower for a week's
query than a file per day. At 40,000 files a day the raw zone is worse still, which is why nobody queries it.

**5. Catalogue and ownership.** Register curated tables in the Glue Data Catalog with an owner, a description and
the partition column. Delete rahul_test/ after asking Rahul.

**6. Lifecycle.** Raw moves to an infrequent-access tier after 30 days and is kept as long as compliance says (a
payments regulator may require years); curated is kept; consumption extracts expire after 90 days.

**Result.** Analysts query curated/upi_txn by date and read megabytes; raw remains a faithful, replayable record.`,
    mcqs: [
      mcq('A raw zone holds files at s3://paynest-lake-prod-raw/upi_switch/transactions/. Which partition key suits the raw zone best?', [
        ['ingest_date, when the batch arrived, because replays are done by arrival', true],
        ['txn_date, the business date analysts filter on in nearly every query', false],
        ['payer_vpa, so that each customer\'s raw events sit together for lookups', false],
        ['No partitions at all, because raw files are never read by anything again', false],
      ], 'Raw is replayed by what arrived when, and arrival is known at write time even for late events. txn_date suits the curated layer, payer_vpa creates millions of tiny prefixes, and raw is read again whenever a curated rule changes.'),
      mcq('Reading two days of raw JSON with union_by_name, DuckDB fails with \'Failed to cast value to numerical: "1,250.00"\'. What happened?', [
        ['The producer changed amount to a formatted string, and the lake accepted it unchecked', true],
        ['union_by_name always converts every column into text when files are being combined', false],
        ['The second day\'s file was corrupt, so DuckDB could not read the amount field', false],
        ['DuckDB cannot read JSON files that are stored in Hive-style partitioned folders', false],
      ], 'Schema on read means a type change in the producer lands silently and fails in the first consumer that casts. union_by_name only unifies columns (here amount became JSON because types mixed), the file parsed fine, and DuckDB read the partitioned JSON without trouble.'),
      mcq('The same week of data took 1,471 ms as 10,080 one-minute files and 32 ms as 7 daily files. What is the main cause?', [
        ['Per-file cost: opening, listing and footers for thousands of tiny files', true],
        ['The minute files were sorted differently, so statistics did not prune', false],
        ['The daily files were compressed with a faster codec than the minute ones', false],
        ['DuckDB caches only the first thousand files it reads during a query', false],
      ], 'With 139 rows per file the overhead of each file dominates; the files were also 77% larger in total. Both layouts were sorted by time and written by pyarrow with the same codec, and there is no thousand-file cache.'),
    ],
    checkpoint: [
      mcq('An engineer wants to "rename" a curated folder holding 50,000 objects on S3. What actually happens?', [
        ['Each object is copied to a new key and the old one deleted', true],
        ['S3 updates one folder entry, so the rename is instant and atomic', false],
        ['S3 refuses, because prefixes that hold objects cannot be changed', false],
        ['Only the newest objects move; older ones keep their original keys', false],
      ], 'S3 has no directories, only keys, so a rename is a copy and delete per object, slow and not atomic. ADLS Gen2 with a hierarchical namespace does have atomic directory renames, which is one difference between the two.'),
      mcq('Curated transactions are partitioned by txn_date. Which filter lets the engine skip whole folders?', [
        ['WHERE txn_date = DATE \'2026-10-05\'', true],
        ['WHERE txn_ts >= \'2026-10-05 00:00\'', false],
        ['WHERE city = \'Pune\' AND amount > 0', false],
        ['WHERE ingest_date = \'2026-10-05\'', false],
      ], 'Only a filter on the partition column itself prunes folders: 1 of 14 files in the lab. A txn_ts filter can still skip data inside files by statistics but lists every file; city and amount are not partition columns; ingest_date is the raw zone\'s key, not this table\'s.'),
      mcq('A stream writes 1,440 files a day into the curated zone, and queries are slow. Which fix keeps the stream\'s freshness?', [
        ['Compact each finished day into a few large files', true],
        ['Partition the table by minute instead of by day', false],
        ['Turn off the column statistics in the Parquet footer', false],
        ['Query the raw JSON instead of the curated Parquet', false],
      ], 'Compaction rewrites a completed day into large files while new data keeps arriving in small ones, so readers get both freshness and speed. Minute partitions make more tiny files, statistics are what make skipping work, and raw JSON is slower still.'),
    ],
  },

  /* ── TABLE_FORMATS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_TABLE_FORMATS',
    notes: `Plain Parquet folders have four problems. A reader can see a folder while a job is half-way through writing it.
Updating one row means rewriting files and hoping nobody reads in between. Nothing stops a file with a different
schema landing next to the others. And finding the files means listing the storage. Open table formats — Delta Lake,
Apache Iceberg, Apache Hudi — fix all four the same way: **a log of metadata beside the data files says which files
make up the table at each version, and a commit is one atomic step that adds a new version.**

## Delta Lake, opened up

The examples use deltalake 1.6 (delta-rs, the Rust implementation with a Python API; no Spark needed) on a table
of PayNest wallet balances.

    from deltalake import DeltaTable, write_deltalake
    write_deltalake("delta_wallets", v0)              # 3 wallets: W1, W2, W3

The folder now holds one Parquet file and _delta_log/00000000000000000000.json, one JSON action per line
(shortened here):

    commitInfo  {"operation": "WRITE", "operationParameters": {"mode": "ErrorIfExists"},
                 "operationMetrics": {"num_added_files": 1, "num_added_rows": 3, ...}}
    protocol    {"minReaderVersion": 1, "minWriterVersion": 2}
    metaData    {"id": "ca395c92...", "partitionColumns": [], "schemaString": "{\\"type\\":\\"struct\\",...}"}
    add         {"path": "part-00000-edec31c0-...-c000.snappy.parquet", "size": 1438, "dataChange": true,
                 "stats": {"numRecords": 3, "minValues": {"wallet_id": "W1", "balance_paise": 2000, ...},
                           "maxValues": {"wallet_id": "W3", "balance_paise": 150000, ...}, "nullCount": {...}}}

That is the whole idea. **The table at version N is the set of files added and not yet removed in commits 0..N.**
A reader replays the log (or the latest checkpoint — delta-rs wrote 00000000000000000099.checkpoint.parquet and
_last_checkpoint after 100 commits in the lab, so a reader never replays hundreds of JSON files) and gets the exact
list of files, with min/max statistics to skip them without opening them. A writer that fails before writing its
commit file leaves orphan Parquet files that no version references: readers never see them.

## MERGE on a lake

A batch arrives: W2's new balance, a new wallet W5, and an **older** update for W1 that must not win.

    (dt.merge(source=batch, predicate="t.wallet_id = s.wallet_id", source_alias="s", target_alias="t")
       .when_matched_update_all(predicate="s.updated_at > t.updated_at")
       .when_not_matched_insert_all()
       .execute())

    {'num_source_rows': 3, 'num_target_rows_inserted': 1, 'num_target_rows_updated': 1,
     'num_target_rows_copied': 2, 'num_target_files_added': 1, 'num_target_files_removed': 1}

W1 kept 150000, W2 became 52000, W5 was inserted. Commit 2 contains one add and one remove: the file holding the
matched rows was **rewritten**, untouched rows (copied: 2) included. That is copy-on-write; on a big table a MERGE
touching a few rows in many files rewrites all those files, which is why you partition and cluster the target by
the merge key's natural locality (date, for transactions). Newer Delta versions can use deletion vectors, and
Iceberg v2 delete files, to mark rows deleted without rewriting (merge-on-read), at the cost of more work for readers
until compaction. The guard and the deduplication come from "Upserts and MERGE" and matter just as much here: a
source with two rows for W3 failed with

    MERGE matched a target row with multiple source rows that satisfy duplicate relevant WHEN MATCHED clauses

## Time travel

Every old version is still readable while its files exist:

    DeltaTable("delta_wallets", version=0).to_pandas()     # W2 back at 2000, no W4 or W5
    -- Spark SQL / Databricks:  SELECT * FROM wallets VERSION AS OF 0
    --                          SELECT * FROM wallets TIMESTAMP AS OF '2026-10-01 10:00'

Use it to audit ("what did the table say when the report ran?"), to reproduce an ML training set, and to undo a bad
load (Spark's RESTORE TABLE ... TO VERSION AS OF). dt.history() lists every commit with its operation:

    5 DELETE  {'predicate': "wallet_id = 'W4'"}
    4 WRITE   {'mode': 'Append'}      (versions 1 and 3 are appends too)
    2 MERGE   {'matchedPredicates': '[{"actionType":"update","predicate":"t.updated_at < s.updated_at"}]'}
    0 WRITE   {'mode': 'ErrorIfExists'}

## Schema enforcement and evolution

Appending a batch with a new column kyc_tier was refused:

    SchemaMismatchError: Cannot cast schema, number of fields does not match: 5 vs 4

With schema_mode="merge" the column was added in version 3 and older rows read it as null. Enforcement is about
casting to the table's schema, not about refusing anything unusual: a balance_paise sent as the string '100' was
cast to the table's long and appended, while '1,250' failed with Cast error: Cannot cast string '1,250' to value of
Int64 type. So evolution is opt-in per write (do it deliberately, never by default in a job), and type checks still
belong in your silver logic. Renaming or dropping columns needs column mapping in Delta; Iceberg tracks columns by ID
and supports both natively.

## Compaction and VACUUM

The small-files problem returns on a table that receives micro-batches. A day of 1.2 million transactions appended
in 240 batches gave version 239 with 240 active files (23.1 MB). Then:

    dt.optimize.compact()    {'numFilesAdded': 1, 'numFilesRemoved': 240, 'partitionsOptimized': 1}

Version 240 has one active file of 11.4 MB (the 240 small ones totalled 23.1 MB; the default target size is 100 MB) and the
same 1,200,000 rows and total; the query went from 109 ms to 80 ms. OPTIMIZE
commits with dataChange false on its actions, so streaming readers know nothing new arrived. But the 240 old
files were still on disk: removed files stay, because older versions point at them. VACUUM deletes files that no
version within the retention period needs:

    dt.vacuum(retention_hours=0, dry_run=False)
    Invalid retention period, minimum retention for vacuum is configured to be greater than 168 hours, got 0 hours

    dt.vacuum(retention_hours=0, enforce_retention_duration=False, dry_run=False)    # removed 241 files (240 + 1 superseded later)
    DeltaTable("delta_upi", version=10)  ->  FileNotFoundError: Object at location ... not found

The 7-day default exists for a reason: **time travel works only as far back as VACUUM retention allows**, and a
long-running reader can still be using old files. Set retention from the oldest version you need to read.

## Concurrency

Two writers commit by each trying to create the next log file, say 00000000000000000006.json. Exactly one succeeds;
the other re-reads what changed and retries if the changes do not conflict (optimistic concurrency). That needs
"create only if absent" from the storage. Local disks and ADLS have it; on S3, delta-rs documents a locking provider
(DynamoDB) for multiple writers — check the current docs before running two writers against one S3 table.

## Apache Iceberg (from its documentation; not run here)

Same goal, different metadata tree:

    catalog  ->  metadata.json (schema, partition spec, list of snapshots)
             ->  manifest list (one per snapshot)  ->  manifests (data files + partition values + column stats)
             ->  data files (Parquet)

A commit writes new metadata and atomically swaps the catalog's pointer (Glue, a REST catalog, Nessie, Hive), so the
catalog is essential rather than optional. Two features stand out. **Hidden partitioning**: PARTITIONED BY
(days(txn_ts)) — queries filter on txn_ts and Iceberg prunes; nobody needs to know a txn_date column exists.
**Partition evolution**: change daily to hourly partitions for new data without rewriting the old. Maintenance is
explicit: expire_snapshots (the VACUUM equivalent for history), rewrite_data_files (compaction), remove_orphan_files.
Athena, Glue, EMR, Trino, Flink, Snowflake and BigQuery read and write Iceberg; AWS offers managed Iceberg tables
in S3 Tables. **Hudi** focuses on record-level upserts and incremental pulls, common in CDC-heavy platforms.

    choose Delta     on Databricks or Fabric, or Spark-centred teams; delta-rs for Python jobs
    choose Iceberg   many engines on one table (Athena + Spark + Snowflake), AWS-native lakes
    either way       both are open; Delta UniForm can also publish Iceberg metadata for Iceberg readers`,
    workedExample: `**Scenario.** PayNest's merchant settlement table lives as Parquet on S3, rebuilt every night by a job that deletes
the folder and writes it again. Three incidents last month: a dashboard showed zero settlements for 14 minutes
while the folder was empty; a corrected batch could not be applied without a full rebuild; and finance asked what
the table said on 30 September and nobody knew. Move it to a table format and show what changes.

**1. Atomic replacement.** Write settlements as a Delta table and replace a day's rows with
write_deltalake(path, df, mode="overwrite", predicate="settle_date = '2026-10-05'"). The commit is one log file;
until it lands, readers see the previous version. No empty window.

**2. Corrections by MERGE.** A corrected batch merges on (merchant_id, settle_date) with a guard on updated_at,
after deduplicating the batch. The commit metrics (rows inserted, updated, copied; files added, removed) go into the
job's log so a strange run is visible.

**3. "What did it say on 30 September?"** Find the version from dt.history() timestamps, then
DeltaTable(path, version=v). For that to work for a month-end audit, VACUUM retention must cover at least the
audit window, so set it to 35 days and accept the storage of the old files.

**4. Maintenance.** OPTIMIZE once a day after the load (the nightly MERGE leaves small rewritten files), VACUUM
weekly with the 35-day retention. Both run as tasks in the orchestrator, not by hand.

**5. Concurrency.** Only the nightly job writes; the correction job is scheduled after it, so no locking provider is
needed yet. If a second writer appears, configure one first.

**6. Readers.** Spark and DuckDB read Delta directly; for Athena, register the table in the Glue catalogue (Athena
reads Delta Lake tables) or publish Iceberg metadata. Test the reader before announcing the change.`,
    mcqs: [
      mcq('A Delta MERGE updates one row and inserts one. Its metrics show num_target_rows_copied: 2 and one file added, one removed. What do the copied rows tell you?', [
        ['Unchanged rows in the rewritten file were copied into the new one', true],
        ['Two source rows were duplicates and were copied to a reject file', false],
        ['Two rows were written to both the old file and the new file at once', false],
        ['Two target rows were copied into the log for the time-travel history', false],
      ], 'Copy-on-write rewrites every file that holds a matched row, so its untouched rows are copied into the replacement; the old file is "removed" in the log but stays on disk for time travel. Duplicate source keys make MERGE fail, and the log holds actions and statistics, not row copies.'),
      mcq('After VACUUM with retention set to zero, DeltaTable(path, version=10) fails with FileNotFoundError. Why?', [
        ['Version 10 is still in the log, but VACUUM deleted the data files it lists', true],
        ['VACUUM rewrites the log, so version 10 now points to the compacted file', false],
        ['Time travel is turned off whenever a table has been compacted with OPTIMIZE', false],
        ['The log for version 10 was cleaned up and replaced by a checkpoint file', false],
      ], 'VACUUM removes files no longer referenced by versions inside the retention window; with zero retention that includes every file version 10 needs. It does not rewrite log entries, OPTIMIZE does not disable time travel, and checkpoints summarise the log rather than deleting versions.'),
      mcq('In Apache Iceberg, a table is PARTITIONED BY (days(txn_ts)). How should analysts filter to get partition pruning?', [
        ['On txn_ts itself; Iceberg maps the filter to the hidden day partitions', true],
        ['On a txn_date column, which Iceberg adds to the table for that purpose', false],
        ['On the partition folder name, such as txn_ts_day=2026-10-05, in the path', false],
        ['Pruning is not possible, as days() hides the partition from the planner', false],
      ], 'Hidden partitioning records the transform in metadata, so a filter on txn_ts prunes without a separate date column. Iceberg adds no visible txn_date column, queries do not filter on paths, and hiding the partition from users is not hiding it from the planner.'),
    ],
    checkpoint: [
      mcq('What makes a commit to a Delta table atomic for readers?', [
        ['Creating the next numbered log file, which readers trust as the version list', true],
        ['Writing all new Parquet files in a single call to the object store', false],
        ['Locking the table folder so readers wait until the writer has finished', false],
        ['Renaming the data folder to a new name once the files are all written', false],
      ], 'Readers build the table from the log, so files written before the commit file exists are invisible, and the commit itself is one file. Object stores have no multi-file atomic write, Delta readers do not wait on locks, and S3 renames are copies.'),
      mcq('A job appends a batch with an extra column to a Delta table and gets "Cannot cast schema, number of fields does not match: 5 vs 4". The column is expected and approved. What is the right change?', [
        ['Append that batch with schema_mode="merge" so the column is added', true],
        ['Drop the table and recreate it from scratch with the fifth column', false],
        ['Write the batch to a separate Parquet folder next to the table', false],
        ['Set schema_mode="merge" as the default for every write in all jobs', false],
      ], 'Opt-in evolution adds the column in a new version, with old rows reading null. Recreating loses history, a side folder is invisible to the table\'s readers, and evolving by default lets every accidental column or typo into the schema.'),
      mcq('Finance must be able to see any settlement table version from the last 30 days. What does that require of VACUUM?', [
        ['A retention period of at least 30 days', true],
        ['Running VACUUM every day without fail', false],
        ['Never running OPTIMIZE on that table', false],
        ['A checkpoint written every ten commits', false],
      ], 'Time travel needs the files of the old versions, and VACUUM keeps only files needed within its retention window. Running VACUUM often with a long retention is fine, OPTIMIZE adds a version without breaking older ones, and checkpoints speed up reading the log without keeping files.'),
    ],
  },

  /* ── MEDALLION ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_MEDALLION',
    notes: `"Modern Modelling" introduced bronze, silver and gold: raw as it arrived, cleaned and conformed, business-ready. A
**lakehouse** is a lake whose tables are in an open table format, so the same files serve warehouse-style SQL, BI and
ML. This lesson is the engineering behind the three layers: what contract each layer keeps, how data moves between
them incrementally and re-runnably, and how gold knows what to recompute when a late correction arrives.

## A contract per layer

    layer   write pattern                     key and grain                     who reads it
    bronze  append only, never updated        none; one row per record received engineers, replays
    silver  MERGE (upsert) on a business key  one row per entity (txn_id)        engineers, analysts, ML
    gold    overwrite affected slices         the business grain (merchant, day) BI, finance, ML features

Each layer also has a retention rule (bronze often longest, for replay and audit), access rule (bronze may hold
personal data; analysts start at silver), and checks (silver: types, keys unique, rejects counted; gold:
reconciles to silver). The examples below run on Delta tables written with deltalake 1.6 and transformed with
DuckDB, on PayNest's UPI events. Every UPI transaction emits events: PENDING, then SUCCESS, sometimes REVERSED later.

## Bronze: keep everything, including mistakes

Each landing appends the payload exactly as received, plus where and when it came from:

    payload (JSON string) | source_file | ingested_at

Batch 1 has four events, one with amount "abc"; batch 2 has three events. The source system then resent batch 2 by
mistake, and bronze took it: **10 rows in 3 versions**. That is correct. Bronze is a record of what arrived; the
duplicate is removed in silver, and bronze lets you prove it was the source's mistake.

## Silver: incremental, typed, one row per transaction

Silver reads only bronze rows ingested after its last watermark, parses them, rejects what does not parse, and folds
the events to one row per txn_id: **txn_ts is the first event's time** (when the payment started), **status is the
latest event's status**. Then a MERGE that updates only the status columns, and only if the incoming status is newer:

    SELECT txn_id, any_value(merchant) AS merchant, any_value(amount) AS amount,
           min(event_ts) AS txn_ts,
           CAST(timezone('Asia/Kolkata', min(event_ts)) AS DATE) AS txn_date_ist,
           arg_max(status, event_ts) AS status, max(event_ts) AS status_ts
    FROM (SELECT DISTINCT * FROM parsed WHERE amount IS NOT NULL)
    GROUP BY txn_id

    .when_matched_update(updates={"status": "s.status", "status_ts": "s.status_ts"},
                         predicate="s.status_ts > t.status_ts")
    .when_not_matched_insert_all()

    txn_id merchant amount  txn_ts                     txn_date_ist  status    status_ts
        U1       M7 450.00  2026-10-04 23:58:00+05:30  2026-10-04    SUCCESS   2026-10-05 00:01:00+05:30
        U2       M7 120.00  2026-10-05 10:00:00+05:30  2026-10-05    REVERSED  2026-10-06 09:30:00+05:30
        U4       M9 999.00  2026-10-05 12:00:00+05:30  2026-10-05    SUCCESS   2026-10-05 12:00:00+05:30
        U5       M9  75.50  2026-10-06 09:00:00+05:30  2026-10-06    SUCCESS   2026-10-06 09:00:00+05:30

    silver merge  {'num_source_rows': 4, 'num_target_rows_inserted': 4, 'num_target_rows_updated': 0}
    rejects       [{'txn_id': 'U3', 'raw_amount': 'abc', 'source_file': 'upi-switch/batch_1.jsonl',
                    'reason': 'amount not numeric'}]
    re-run        {'num_target_rows_inserted': 0, 'num_target_rows_updated': 0}

Note U1: started at 23:58 on 4 October, succeeded at 00:01 on the 5th. Which day it belongs to is a business rule
(here: when it started), written down once, in silver. The re-run changed nothing: the layer is idempotent, so a
retry or an accidental double run is harmless. Silver has Delta's change data feed switched on
(configuration={"delta.enableChangeDataFeed": "true"}) for the next step.

## Gold: recompute only what changed

Gold is successful GMV per merchant per IST day, rebuilt for a list of dates with a predicate overwrite, which
replaces just those dates in one commit:

    write_deltalake(GOLD, g, mode="overwrite", predicate="txn_date_ist = '2026-10-05'")

    txn_date_ist merchant  txns    gmv
      2026-10-04       M7     1 450.00
      2026-10-05       M9     1 999.00
      2026-10-06       M9     1  75.50

On 7 October the switch reverses U4. Bronze appends one event; silver's watermark picks up that one row; the MERGE
updates one row. Which gold dates are now wrong? Silver's change feed says exactly:

    dt.load_cdf(starting_version=2)
    txn_id   status  txn_date_ist     _change_type  _commit_version
        U4  SUCCESS    2026-10-05  update_preimage                2
        U4 REVERSED    2026-10-05 update_postimage                2

Gold rebuilt only 2026-10-05; its history shows WRITE with predicate txn_date_ist = '2026-10-05', and 5 October now
has no row for M9. Two details made this correct. The MERGE did not touch txn_ts, so the reversal on the 7th did not
move the transaction to the 7th ("Debugging Warehouses and Lakehouses" shows what happens when it does). And the
affected dates came from the pre- and post-images, so a change that moved a row between dates would rebuild both.

## Serving BI and ML from the same platform

- **BI** reads gold through a SQL engine over the lake: Athena or Redshift Spectrum on AWS, Databricks SQL, Synapse
  serverless or Fabric on Azure, or by loading gold into a warehouse. Dashboards never read bronze.
- **ML** reads silver or gold feature tables and **pins the version** it trained on. The model trained on silver
  version 1 saw U4 as SUCCESS; silver version 2 says REVERSED. Store the table version (or Iceberg snapshot ID) with
  the model, and DeltaTable(path, version=1) rebuilds the exact training set months later — as long as VACUUM
  retention covers it.
- **Exploration** by analysts happens in silver; anything a second team relies on is promoted to gold with a grain,
  an owner and tests.

## Mistakes that break the layers

- Gold reading bronze directly "because it is faster to build": now two places parse the raw payload, differently.
- Deduplicating or fixing data in bronze: replay is gone, and so is the evidence.
- Silver as a straight copy of bronze with types: duplicates and event streams leak to every consumer.
- Full rebuilds of every layer every hour: correct but expensive; incremental bronze-to-silver and affected-slice
  gold are the norm once data grows.
- Extra layers ("platinum", "silver-plus") instead of clear contracts for three.`,
    workedExample: `**Scenario.** PayNest adds a second source: merchant settlements, delivered by the bank as a CSV file once a day
around 06:00, sometimes resent with corrections. Settlements must reconcile with successful transactions per
merchant per day, and finance wants a gold table that shows mismatches. Design the flow through the layers.

**1. Bronze.** bronze.settlement_files: one row per CSV line as text, plus source_file, file checksum and
ingested_at. Resends land again; nothing is overwritten.

**2. Silver.** silver.settlements at the grain one row per (merchant_id, settle_date). Each run reads bronze rows
after the watermark, parses with explicit types (amount as DECIMAL(14,2), dates in the bank's format), sends failures
to silver.settlement_rejects with the reason, keeps the latest file's row when a resend corrects a value (order by
ingested_at), and MERGEs with a guard on the file's ingested_at. Change data feed on.

**3. Gold.** gold.merchant_reconciliation at the grain one row per merchant per day: GMV from silver.upi_txn
(successful, by txn_date_ist), settled amount from silver.settlements, and the difference. Affected dates come from
both silver tables' change feeds: a reversal changes GMV for its transaction date; a resend changes a settlement
date. Rebuild those dates with a predicate overwrite.

**4. Checks.** Silver: (merchant_id, settle_date) unique, rejects under 0.1% of lines or the run fails. Gold: total
GMV across merchants equals silver's total for the same dates.

**5. Serving.** Finance reads gold.merchant_reconciliation from the BI tool through the SQL engine; a fraud model
reads silver.upi_txn pinned to a version recorded with each training run.

**6. Replay test.** Delete silver.settlements in dev, re-run from bronze, and compare with production: same rows. If
not, a rule depends on something other than bronze, and that is a bug.`,
    mcqs: [
      mcq('The UPI switch resends yesterday\'s batch by mistake. What should PayNest\'s bronze table do with it?', [
        ['Append it like any batch; silver removes the duplicates downstream', true],
        ['Reject the batch at the door because its checksum was already seen', false],
        ['Overwrite yesterday\'s rows in bronze with the resent copy of them', false],
        ['MERGE it into bronze on txn_id so that each event is stored once', false],
      ], 'Bronze is append-only and records what arrived, which also proves the source resent it; silver deduplicates. Rejecting or overwriting loses the record, and merging turns bronze into silver and breaks replay.'),
      mcq('Silver\'s MERGE updates only status and status_ts on a match. Why not when_matched_update_all()?', [
        ['A later event would overwrite txn_ts and move the payment to another day', true],
        ['update_all is slower, since it rewrites more files than a column update', false],
        ['update_all cannot be combined with a predicate on the WHEN MATCHED clause', false],
        ['update_all would also insert new rows, creating duplicates of txn_id', false],
      ], 'The incoming batch holds only the new event, so its "first event time" is the reversal time; updating every column would overwrite the true start time. Both forms rewrite the same files, update_all accepts a predicate, and inserts come only from the NOT MATCHED clause.'),
      mcq('U4 is reversed two days after it happened. How does the gold job know which dates to rebuild?', [
        ['From silver\'s change data feed: the pre- and post-image rows carry the dates', true],
        ['By rebuilding today\'s date only, since the reversal arrived today', false],
        ['By comparing the row counts of bronze and gold for each date in the table', false],
        ['From the bronze ingested_at column, which records the affected payment dates', false],
      ], 'The change feed lists exactly the silver rows that changed, with their txn_date_ist before and after. Today\'s date is wrong (the payment belongs to the 5th), row counts miss amount changes, and ingested_at is arrival time, not the payment\'s date.'),
    ],
    checkpoint: [
      mcq('Which layer should analysts exploring a new question start from, and why?', [
        ['Silver, because it is typed, deduplicated and still at full detail', true],
        ['Bronze, because it is closest to the source and so the most accurate', false],
        ['Gold, because every question can be answered from aggregated tables', false],
        ['Whichever layer is fastest for that query, as all three hold the same', false],
      ], 'Silver is clean and detailed, so exploration does not repeat parsing or hit duplicates. Bronze has duplicates and raw types, gold holds only the questions already modelled, and the layers deliberately hold different things.'),
      mcq('A fraud model was trained on silver.upi_txn in August. In November the team must reproduce the exact training set. What makes that possible?', [
        ['The table version recorded at training time, within VACUUM retention', true],
        ['Re-running the silver job for August with today\'s code and data', false],
        ['A copy of gold for August, since gold summarises silver accurately', false],
        ['The bronze table alone, read as it is today with August\'s filter', false],
      ], 'Time travel to the recorded version returns exactly the rows the model saw, provided the files have not been vacuumed. Today\'s code and late corrections change the result, gold lacks the row detail, and bronze needs the same silver logic to become a training set.'),
      mcq('A silver job re-runs over the same bronze rows and reports 0 inserted and 0 updated. What does this show?', [
        ['The layer is idempotent, so retries are safe', true],
        ['The job failed to read the bronze table rows', false],
        ['The MERGE guard has rejected every valid row', false],
        ['Silver must be truncated before every re-run', false],
      ], 'Deduplication, a key-based MERGE and a newer-only guard make a repeat change nothing, which is the goal. The first run inserted the rows, the guard skips only stale updates, and truncating would throw that safety away.'),
    ],
  },

  /* ── WAREHOUSE_COST ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_WAREHOUSE_COST',
    notes: `"Cloud Data Warehouses" reduced every bill to bytes scanned × a rate, or compute time × size × a rate. This lesson
is the toolkit for both, in the order a data engineer uses it: find where the money goes, then read less, compute
less often, and put limits in place so one query cannot surprise you. Partitioning and pruning were measured in
"Partitioning and Layout"; here the focus is clustering, precomputation, controls and evidence.

## 1. Find the expensive queries first

Every warehouse keeps a query history with the work each query did (names from the docs):

    BigQuery   region-xx.INFORMATION_SCHEMA.JOBS          total_bytes_billed, total_slot_ms, user_email, query
    Snowflake  SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY      warehouse_name, execution_time, bytes_scanned
               ...ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY credits used per warehouse per hour
    Redshift   SYS_QUERY_HISTORY                           elapsed_time, query_text, user_id
    Athena     query history per workgroup                 data scanned per query

Group by a fingerprint of the query text, not by individual runs, because cost comes from repetition. A synthetic
week of PayNest's job history (2,331 jobs, 159.9 TB billed), grouped with DuckDB:

    SELECT md5(query_text)[1:8] AS query_hash, any_value(user_name) AS user_name, count(*) AS runs,
           round(sum(bytes_billed) / 1e12, 1) AS tb_billed,
           round(100 * sum(bytes_billed) / sum(sum(bytes_billed)) OVER (), 1) AS pct_of_week
    FROM jobs WHERE start_time >= TIMESTAMP '2026-10-01' AND start_time < TIMESTAMP '2026-10-08'
    GROUP BY query_hash ORDER BY tb_billed DESC;

    query_hash      user_name  runs  tb_billed  pct_of_week
      e5e97613 ml_feature_job   168       68.9         43.1     hourly join of silver.upi_txn to merchants
      a71dbfbe  analyst_karan    60       57.0         35.6     SELECT * ... WHERE txn_date = ?
      f1100cc5   analyst_riya    35       33.3         20.8     SELECT * ... LIMIT 100
      bb43a5a4  analyst_meena    12        0.6          0.4
      9dee7704  analyst_karan    40        0.1          0.1
      dddfacc3   dash_service  2016        0.0          0.0     the dashboard, on a gold table

Three query shapes are 99.5% of the bill; the dashboard that runs 2,016 times costs nothing because it reads a small
gold table. Fix the top of the list, not everything.

## 2. Read less: partition, then cluster

Partitioning prunes by one coarse column. **Clustering** sorts data within partitions by the columns queries filter
on next, so min/max statistics skip blocks. The lab version: a week of transactions (1,166,677 rows) as a Delta
table of 16 files, then counting from the log's per-file statistics how many files could hold a value:

    layout                               files   may hold merchant 4242   may hold city = Pune
    16 appends, unsorted                    16           16                       16
    Z-ORDER BY (merchant_id)                18            1                       18
    Z-ORDER BY (merchant_id, city)          19           13                        3

Ordering by merchant cut a merchant lookup to 1 file in 18. Adding city to the Z-order helped city queries but gave
back most of the merchant skipping. Clustering on several columns shares the benefit; choose the one or two columns
that the expensive queries filter on, high-cardinality first, and leave a six-value column like city to partitions
or to nothing. (Z-order here is delta-rs's dt.optimize.z_order; the counts are what any engine would skip using the
same statistics.)

In the warehouses, from the docs: BigQuery CLUSTER BY up to four columns, re-clustered automatically and free;
Snowflake clustering keys for very large tables, maintained by automatic clustering, which consumes credits — check
SYSTEM$CLUSTERING_INFORMATION before and after; Redshift sort keys (compound, or AUTO) feed its zone maps; Delta's
newer liquid clustering and Iceberg sort orders do the same on the lake.

## 3. Compute less often: summary tables and materialised views

A dashboard asks "GMV by city and category for the last 7 days" all day. On the 5-million-row month:

    against the transactions table   194 ms   Data Read 75.2 MB
    against a daily summary table      5 ms   Data Read 34.4 kB     (1,920 rows, 19 kB on disk)

Same 64 result rows, checked equal. The summary is a gold table rebuilt after each load — the medallion pattern.
Materialised views do this inside the warehouse (from the docs): BigQuery refreshes them incrementally and can
rewrite queries on the base table to use them; Redshift has auto refresh and automatic query rewriting; Snowflake
materialised views (an Enterprise-edition feature) are kept current by a background service that bills credits, and
are limited to one table. Each costs refresh compute and storage. A gold table you rebuild on your own schedule is
often simpler and good enough; an MV earns its place when the base table changes all day and queries must be
current.

Result caches are the free version: BigQuery, Snowflake and Redshift all return a repeated identical query from
cache while the underlying data is unchanged (BigQuery keeps results for about a day). Non-deterministic functions
like CURRENT_TIMESTAMP() or a table that changes every five minutes defeat the cache.

## 4. Put limits in place

From the docs; set them on day one, not after the first bad month:

- **BigQuery**: maximum bytes billed on a query or as a default (the query fails instead of running); custom quotas
  per user or project per day; require_partition_filter on large partitioned tables.
- **Snowflake**: AUTO_SUSPEND on every warehouse (60 seconds for most), STATEMENT_TIMEOUT_IN_SECONDS, and resource
  monitors that notify or suspend a warehouse at a credit quota.
- **Redshift**: Serverless base and maximum capacity and usage limits on RPU-hours; on provisioned clusters, query
  monitoring rules in WLM that log or abort runaway queries.
- **Athena**: per-query and per-workgroup data usage controls.
- **All**: an AWS Budgets (or Azure cost alert, GCP budget) alert on the account, and a weekly top-queries report.

## 5. Prove it

For each change, record the before and after from the same history table: bytes billed or slot-ms or credits, for
the same query fingerprint over a comparable week. "We added clustering" is a claim; "query e5e97613 went from 410 GB
to 9 GB per run" is evidence.`,
    workedExample: `**Scenario.** PayNest's BigQuery bill for October is twice September's. You have the job history above. Write the
plan, in the order you would do it.

**1. Confirm where.** The top three fingerprints are 99.5% of bytes billed in the week. Nothing else matters yet.

**2. e5e97613, the ML feature job (43.1%).** It joins all of silver.upi_txn to merchants every hour, reading about
410 GB a run, to compute features that change only for new transactions. Fix: make the feature table incremental —
each hour process only transactions whose txn_date is today or yesterday (the table is partitioned by txn_date, so
the filter prunes), and MERGE into the feature table. Expected: a run reads two partitions instead of all.

**3. a71dbfbe, SELECT * for one day (35.6%).** The partition filter works, but SELECT * reads every column,
including the remarks and VPA columns that are most of the bytes. Fix: talk to Karan; give him a view with the
twelve columns he uses; set maximum bytes billed as a default for analyst queries so a mistake fails instead of
billing.

**4. f1100cc5, SELECT * ... LIMIT 100 (20.8%).** A peek that reads the whole table every time, because LIMIT does not
reduce bytes billed. Fix: show Riya the free table preview, and set require_partition_filter on silver.upi_txn so a
query without a date filter is refused.

**5. Leave the dashboard alone.** It runs 2,016 times a week and costs nothing, because it reads a small gold table.
That is the pattern to copy.

**6. Measure.** Next week, the same grouped query on INFORMATION_SCHEMA.JOBS: bytes per fingerprint before and after.
Then a budget alert at 120% of the new normal.`,
    mcqs: [
      mcq('PayNest\'s job history shows a dashboard query that ran 2,016 times in a week and an ML job that ran 168 times. Which should the cost review look at first?', [
        ['Whichever has the larger total bytes billed across all of its runs', true],
        ['The dashboard query, because 2,016 runs must cost the most overall', false],
        ['The ML job, because hourly jobs are always the most expensive ones', false],
        ['Neither; only queries that failed or timed out show up as a cost', false],
      ], 'Cost is runs × bytes per run, so rank fingerprints by their total; here the dashboard read a tiny gold table and cost nothing, while the ML job was 43.1%. Run count alone and schedule alone both mislead, and successful queries are the ones billed.'),
      mcq('After Z-ORDER BY (merchant_id, city), a merchant lookup could skip far fewer files than after Z-ORDER BY (merchant_id) alone. What is the lesson?', [
        ['Each column added to a Z-order dilutes the skipping for the others', true],
        ['Z-ordering by two columns is broken and should never be used', false],
        ['City should have been listed first, as order fixes the problem', false],
        ['Z-ordering by two columns always needs twice as many output files', false],
      ], 'Multi-column clustering shares locality between columns, so each gets less of it; in the lab merchant lookups went from 1 of 18 files to 13 of 19. It is not broken and can suit two equally important filters, column order in a Z-order is not a fix, and the file count barely changed.'),
      mcq('Which control makes a BigQuery query fail instead of billing for an unexpectedly large scan?', [
        ['Setting maximum bytes billed on the query or as a default', true],
        ['Adding LIMIT 1000 to the end of every analyst\'s query', false],
        ['Turning off the result cache for the analysts\' project', false],
        ['Creating a reservation, so queries cannot exceed it', false],
      ], 'Maximum bytes billed rejects a query whose estimate exceeds the limit, before it runs. LIMIT does not reduce bytes billed, the cache only makes repeats free, and a reservation caps slots (speed), not the size of what a query reads.'),
    ],
    checkpoint: [
      mcq('A dashboard on the 5-million-row transactions table read 75.2 MB per refresh; the same answer from a daily summary read 34.4 kB. What is the summary\'s main cost?', [
        ['Rebuilding it after every load, and staleness between rebuilds', true],
        ['It returns slightly different totals because of rounding errors', false],
        ['It must be refreshed before every query or it returns an error', false],
        ['Dashboards cannot read it, so it needs a separate BI connection', false],
      ], 'A precomputed table costs a rebuild per load and is only as fresh as its last rebuild. The lab checked the results were identical, a stale summary still answers (that is the risk), and dashboards read it like any table.'),
      mcq('A Snowflake account\'s credits jumped after automatic clustering was switched on for a large, frequently updated table. Why might that be?', [
        ['Automatic clustering runs as a background service that consumes credits', true],
        ['Clustering keys make every query scan all micro-partitions of the table', false],
        ['Clustered tables are stored uncompressed and are billed at a higher rate', false],
        ['Clustering disables the result cache for every query on that table', false],
      ], 'Snowflake documents automatic clustering as a serverless service billed in credits, and heavy updates mean more reclustering. Clustering is meant to reduce scanning, storage stays compressed, and the cache is unaffected by clustering.'),
      mcq('Which evidence best proves that a clustering change reduced cost?', [
        ['The same query fingerprint\'s bytes or credits per run, before and after', true],
        ['A single run of the query that was faster on the day after the change', false],
        ['The table\'s storage size in the console, before and after the change', false],
        ['A note from the analyst saying that the dashboard feels faster now', false],
      ], 'Comparing a fingerprint\'s billed work over comparable periods isolates the change. One run is noise (caches, load), storage size says nothing about bytes scanned per query, and a feeling is not a measurement.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_DEBUGGING',
    notes: `Six things that go wrong in PayNest's lakehouse. For each: the symptom, the cause, and the one change that fixes it.
Every error message and output below came from running the broken version with deltalake 1.6 and DuckDB 2.0 on a
laptop. Read the message, the commit metrics and the log before changing code.

## 1. The audit query that cannot find its files

**Symptom.** Finance asks what the settlement table said ten versions ago. DeltaTable(path, version=10) fails:

    FileNotFoundError: Object at location ...\\delta_upi\\txn_date=2026-10-05\\part-00000-5680fecf-...parquet not found

**Cause.** Version 10 is still in the log, but its data files are gone. Someone ran VACUUM with
retention_hours=0 and enforce_retention_duration=False to "save space" after an OPTIMIZE — 241 files deleted. The
library had refused the first attempt: "minimum retention for vacuum is configured to be greater than 168 hours".

**Fix.** There is none for the lost versions; restore from a backup if one exists. For the future: VACUUM only with a
retention that covers the oldest version anyone must read (audit window, ML reproducibility, long-running readers),
and never override the safety check in a scheduled job.

## 2. The load that fails on one day only

**Symptom.** The wallet-balance append has run for months; on 3 October it fails:

    Exception: Cast error: Cannot cast string '1,250' to value of Int64 type

**Cause.** The producer started sending balance_paise as a string. On earlier days the strings happened to be plain
digits ('100'), and delta-rs cast them to the table's long silently, so nobody noticed the change. The first value
with a thousands separator failed.

**Fix.** Parse explicitly before the write: TRY_CAST after removing separators, rows that still fail to a rejects
table with the reason. And tell the producing team: the contract changed without notice, which is the real defect.

## 3. MERGE fails after a retry

**Symptom.** The wallet MERGE fails after the ingestion step retried:

    MERGE matched a target row with multiple source rows that satisfy duplicate relevant WHEN MATCHED clauses

**Cause.** The retried ingestion put two rows for W3 in the batch. A MERGE cannot decide which one wins.

**Fix.** Deduplicate the source to one row per key before the MERGE, newest first with a tie-breaker:
QUALIFY row_number() OVER (PARTITION BY wallet_id ORDER BY updated_at DESC, seq DESC) = 1. A test batch with two
rows for one key belongs in the job's tests.

## 4. Revenue moves to the wrong day after a reversal

**Symptom.** U4, a payment made on 5 October, is reversed on the 7th. Afterwards silver shows U4 under 7 October, and
the gold rebuild touches two dates. The change feed:

    txn_id   status  txn_date_ist     _change_type  _commit_version
        U4  SUCCESS    2026-10-05  update_preimage                2
        U4 REVERSED    2026-10-07 update_postimage                2
    affected dates ['2026-10-05', '2026-10-07']

**Cause.** Silver's MERGE used when_matched_update_all(). The incremental batch held only the reversal event, so its
"first event time" was the 7th, and update_all overwrote txn_ts and txn_date_ist along with the status.

**Fix.** Update only the columns a later event may change: when_matched_update(updates={"status": "s.status",
"status_ts": "s.status_ts"}, predicate="s.status_ts > t.status_ts"). Re-run: the post-image keeps 2026-10-05, and
only that date is rebuilt.

## 5. The incremental job that re-reads yesterday

**Symptom.** Silver's incremental run on 7 October should pick up one new bronze row; it picks up four, and run
time grows every day. The results are still right.

**Cause.** The watermark filter was written as ingested_at > TIMESTAMPTZ '2026-10-06 20:05' with no zone. DuckDB
reads a zone-less literal in the session's time zone, which on this laptop was Asia/Calcutta, so the cutoff was
14:35 UTC instead of 20:05 UTC, and batch 2 (ingested 20:00 and 20:05 UTC) came back. The idempotent MERGE hid the
mistake: 0 inserted, 1 updated.

**Fix.** Store the watermark as a UTC timestamp with its zone and compare with an explicit offset:
TIMESTAMPTZ '2026-10-06 20:05+00'. The run then read exactly one row. Idempotence is a safety net, not a substitute
for a correct filter.

## 6. The table that gets slower every week

**Symptom.** Queries on silver.upi_events get slower each week though daily volume is flat.

**Cause.** A streaming job appends every six minutes: 240 files a day, about 96 kB each. dt.history() shows 240 WRITE
commits a day and no OPTIMIZE. The lab day of 240 appends was 23.1 MB in 240 files; compacted, 11.4 MB in one file.

**Fix.** Schedule OPTIMIZE for each completed day (dt.optimize.compact(), or OPTIMIZE ... WHERE on Spark) and VACUUM
weekly with a retention that respects case 1. Compaction commits with dataChange false, so streaming readers ignore it.

## The habit

The log answers most lakehouse questions: history() for what ran, the commit metrics for what each write did, the
change feed for what changed. Read them before you read the code.`,
    mcqs: [
      mcq('A Delta append that has worked for months fails with "Cannot cast string \'1,250\' to value of Int64 type". Why did earlier days succeed?', [
        ['Plain-digit strings like \'100\' were cast to the long column silently', true],
        ['Earlier days were written with schema_mode="merge", which allows text', false],
        ['The table\'s column type changed from string to long on that same day', false],
        ['delta-rs skips type checks on appends to tables under a thousand rows', false],
      ], 'Writes are cast to the table schema, so castable strings passed and hid the producer\'s change until a separator appeared. schema_mode="merge" adds columns rather than accepting other types, the table schema was unchanged, and there is no size-based exemption.'),
      mcq('Silver shows a payment made on 5 October under 7 October after a reversal arrived on the 7th. What is the most likely cause?', [
        ['The MERGE updated every column, including txn_ts, from the new event', true],
        ['The change data feed was not enabled on the silver table at the time', false],
        ['Gold was rebuilt with a predicate overwrite for the wrong IST date', false],
        ['Bronze stored the event with the wrong ingested_at timestamp value', false],
      ], 'update_all copied the reversal batch\'s derived start time over the true one. The change feed reports changes but does not cause them, gold reads silver\'s date, and ingested_at plays no part in txn_date_ist.'),
      mcq('An incremental silver run reads four rows instead of one, and its watermark filter is ingested_at > TIMESTAMPTZ \'2026-10-06 20:05\'. What should you check?', [
        ['Which time zone the engine applies to a literal without an offset', true],
        ['Whether the bronze table needs an OPTIMIZE before incremental reads', false],
        ['Whether the MERGE guard on status_ts is comparing the wrong columns', false],
        ['Whether DuckDB caches the previous run\'s result for the same filter', false],
      ], 'DuckDB read the zone-less literal in the session zone (Asia/Calcutta), moving the cutoff 5.5 hours earlier. Compaction does not change which rows match, the guard acts after the read, and there is no result cache that would add rows.'),
      mcq('After an overnight VACUUM, reading version 10 of a Delta table fails with FileNotFoundError. What prevents this in future?', [
        ['A VACUUM retention that covers the oldest version anyone needs', true],
        ['Running OPTIMIZE after VACUUM, so the old versions are rebuilt', false],
        ['Writing a checkpoint every ten commits so versions are preserved', false],
        ['Reading old versions by timestamp rather than by version number', false],
      ], 'VACUUM deletes files outside the retention window, so the window must match the audit and reproducibility needs. OPTIMIZE does not restore deleted files, checkpoints summarise the log only, and a timestamp read needs the same files.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_PRACTICE',
    notes: `Eight exercises, easiest first. Write each answer before reading ours. Exercises 3, 4 and 6 match outputs from
deltalake 1.6 and DuckDB 2.0 in the lessons; the arithmetic in the others was checked in Python.

## 1. Bytes a query reads (easy)

A transactions table's columns, compressed: remarks 167 MB, payer_vpa 41 MB, txn_ts 39 MB, payee_vpa 39 MB,
amount_paise 24 MB, merchant_id 20 MB, city 2 MB, status 0.5 MB. Estimate the bytes read by (a) SELECT * (b) SELECT
city, sum(amount_paise) WHERE status = 'SUCCESS' GROUP BY city (c) the same as (b) with LIMIT 3.

**Answer.** (a) about 333 MB, every column listed. (b) city + amount_paise + status = about 26.5 MB: columns in the
WHERE clause count too. (c) the same 26.5 MB on a columnar warehouse; LIMIT applies after the scan and aggregation,
and BigQuery's docs say it does not reduce bytes billed.

## 2. A lake path (easy)

Write the raw-zone path for the UPI switch's settlement files that arrived on 6 October 2026, batch 3, in the
production environment, and the curated path for the parsed table partitioned by settlement date.

**Answer.** s3://paynest-lake-prod-raw/upi_switch/settlements/ingest_date=2026-10-06/batch-0003.csv.gz and
s3://paynest-lake-prod-curated/upi_switch/settlements/settle_date=2026-10-05/part-....parquet — raw by arrival,
curated by the business date, key=value folders, lowercase, source before dataset.

## 3. Read a commit (easy)

A commit file holds commitInfo with "operation": "MERGE", then one add and one remove. Before it the table had one
active file. How many active files are there after it, and what happened physically?

**Answer.** One. The file holding the matched rows was rewritten into a new file (copy-on-write); the old file is
marked removed in the log but stays on disk until VACUUM, so the previous version can still be read.

## 4. Predict a guarded MERGE (medium)

wallets: W1 150000 at 10-01 09:00, W2 2000 at 10-01 09:00. Batch: W1 1 at 09-30 23:00; W2 52000 at 10-02 08:00; W5 700
at 10-02 08:05. MERGE with when_matched_update_all(predicate="s.updated_at > t.updated_at") and
when_not_matched_insert_all(). Final balances and the inserted and updated counts?

**Answer.** W1 150000 (the incoming row is older and fails the guard), W2 52000, W5 700. Inserted 1, updated 1 —
exactly what the lesson's run reported.

## 5. Choose VACUUM retention (medium)

Silver is read by: a dashboard (current version), a fraud model retrained monthly that must be reproducible for 6
months, and a weekly audit that may look back 14 days. What retention, and what is the cost?

**Answer.** At least about 183 days, set by the model, unless you snapshot each training set elsewhere (write it to
its own table or record and copy it). Cost: storage for every file superseded in that window. A common alternative is
14 days on silver plus a saved copy of each training set, which is often cheaper.

## 6. Which layer? (medium)

Place each in bronze, silver or gold: (a) the bank's settlement CSV line as text with its file name; (b) one row per
txn_id with the latest status; (c) GMV per merchant per IST day; (d) a row with amount "abc" and the reason; (e) a
feature table at one row per customer per day.

**Answer.** (a) bronze; (b) silver; (c) gold; (d) silver's rejects table, beside silver; (e) gold.

## 7. Small files (medium)

A stream writes one Parquet file a minute, about 5 kB each, into curated transactions partitioned by day. How many
files does a 30-day month hold, and how many LIST requests does listing that month's prefix need at minimum? What do
you change?

**Answer.** 30 × 1,440 = 43,200 files; at 1,000 keys per request, 44 LIST calls, and then 43,200 GETs to read them.
Compact each finished day into one or a few files (OPTIMIZE on a table format, or a compaction job), so the month is
30 to a few hundred files of megabytes each. Keep minute files only for the current day.

## 8. A warehouse that never sleeps (harder)

A Snowflake warehouse with AUTO_SUSPEND = 300 serves two dashboards: one refreshes every 4 minutes from 09:00 to 21:00,
one every 15 minutes all day. Each query takes a few seconds. For how long each day is the warehouse running? Give
two fixes.

**Answer.** From 09:00 to 21:00 queries come every 4 minutes, less than 300 seconds apart: 12 hours of running time.
Outside those hours a query every 15 minutes starts it, it runs for the query plus 5 minutes of idle, then suspends:
about 12 hours × 4 an hour = 48 resumes, roughly 5 minutes each — about 4 more hours. Around 16 hours billed for
minutes of work. Fixes: AUTO_SUSPEND = 60; point both dashboards at a small gold table so each refresh is tiny; and
refresh the 4-minute dashboard only as often as its data changes.`,
    mcqs: [
      mcq('SELECT city, sum(amount_paise) FROM txn WHERE status = \'SUCCESS\' GROUP BY city. Which columns does a columnar warehouse read?', [
        ['city, amount_paise and status', true],
        ['city and amount_paise only', false],
        ['Every column in the table', false],
        ['status only, then the rest', false],
      ], 'Columns in WHERE count as much as those in SELECT, because the filter must be evaluated on every row. Leaving out status undercounts, and only SELECT * reads every column.'),
      mcq('A wallets MERGE has the guard s.updated_at > t.updated_at. W1 holds 150000 updated at 09:00; the batch has W1 at 1 updated at 23:00 the previous day. What happens to W1?', [
        ['Nothing changes, because the incoming row is older than W1\'s', true],
        ['W1 is set to 1, because a MERGE always applies the latest batch', false],
        ['The MERGE fails, since a guard cannot reject a matched row', false],
        ['A second W1 row is inserted, as the guarded match did not apply', false],
      ], 'A matched row that fails the clause\'s predicate is simply left alone; that is how late, stale updates are ignored. The guard is the point of the clause, it raises no error, and NOT MATCHED applies only to keys absent from the target.'),
      mcq('A bronze-silver-gold platform has a table of rows that failed to parse, each with the reason. Where does it belong?', [
        ['Beside silver, written by the silver job', true],
        ['In bronze, replacing the original rows', false],
        ['In gold, so that finance can review it', false],
        ['Nowhere; bad rows should be dropped', false],
      ], 'The job that parses into silver produces the rejects, and keeping them beside silver makes them visible and fixable. Bronze must stay as received, gold is for business tables, and silent drops hide source problems.'),
      mcq('A one-file-per-minute stream fills a 30-day month in a curated table. About how many LIST requests does listing that month\'s prefix need?', [
        ['44, at 1,000 keys per request for 43,200 files', true],
        ['30, one request for each daily partition folder', false],
        ['1, because a prefix is listed in a single call', false],
        ['1,440, one request for each minute of a day', false],
      ], 'S3 returns at most 1,000 keys per list request, so 43,200 keys need 44 pages. Folders are not listed in one call each unless they hold under 1,000 keys, and a prefix with many keys is never a single call.'),
      mcq('A Snowflake warehouse with AUTO_SUSPEND = 300 serves a dashboard that queries every 4 minutes for 12 hours. Which change cuts the hours billed most directly?', [
        ['Lower AUTO_SUSPEND to 60 seconds', true],
        ['Resize the warehouse up one size', false],
        ['Add a cluster for more concurrency', false],
        ['Raise AUTO_SUSPEND to 900 seconds', false],
      ], 'With a 60-second suspend the warehouse sleeps between refreshes four minutes apart, so it bills roughly a minute or so per refresh instead of the whole 12 hours. A larger size doubles the hourly rate, more clusters add compute, and a longer suspend keeps it awake even more.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_INTERVIEW_QUESTION',
    notes: `Asked in data engineer interviews at product companies, GCCs and fintechs in Bengaluru, Hyderabad and Pune,
usually in the system-design or "tell me about your platform" round. Say each answer aloud in about two minutes,
then compare. Interviewers listen for trade-offs and mechanisms — how a commit is atomic, what the bill depends on —
not for a list of product names.

## Q1. "Warehouse, lake or lakehouse — what would you build for us?"

**Model answer.** "It depends on who reads the data and how. A warehouse — Redshift, BigQuery, Snowflake — gives
analysts SQL, performance and governance with the least engineering, but stores data in its own format and bills
for compute or bytes scanned. A lake on S3 or ADLS is cheap, holds any format and lets Spark, ML jobs and SQL engines
share it, but plain files have no transactions, so updates and schema changes are hard. A lakehouse puts an open
table format, Delta or Iceberg, on the lake: ACID commits, MERGE, time travel and schema enforcement, read by SQL
engines and Spark alike. For a payments company with analysts, a fraud-ML team and growing volume, I would land raw
data in the lake, keep silver and gold as Delta or Iceberg tables, and serve BI either through a SQL engine on the
lake or by loading gold into a warehouse if the analysts are already there. I would decide by the existing cloud,
the team's skills and who pays for what."

**Follow-up.** "Isn't running both a lake and a warehouse twice the cost?" — "Storage is the cheap part; the
question is duplicated pipelines. Keep one source of truth, the lake's silver, and treat warehouse tables as gold
outputs built from it. Many teams do that, and some later drop the warehouse once the lake's SQL engine is enough."

## Q2. "How does Delta Lake give you ACID on S3, which has no transactions?"

**Model answer.** "Through a log. Next to the Parquet files is _delta_log, one JSON file per commit with add and
remove actions, plus the schema, the protocol and per-file statistics. The table at version N is the set of files
added and not removed up to N. A writer writes its Parquet files first — invisible, because no commit lists them —
then creates the next numbered log file. Creating that file is the atomic step, and only one writer can create a
given number, so concurrent writers use optimistic concurrency: the loser re-reads, checks for conflicts and retries.
Readers replay the log from the latest checkpoint and never see a half-written version. That also gives time travel,
since old versions' files stay until VACUUM."

**Follow-up.** "What does S3 need to support for multiple writers?" — "An atomic 'create only if absent' for the log
file. Some deployments use a DynamoDB-based lock for that; I would check what the library supports today before
allowing two writers on one S3 table."

## Q3. "Design bronze, silver and gold for UPI transactions with late status changes."

**Model answer.** "Bronze appends every event as received, with source file and ingested_at, never updated, so I can
replay and prove what arrived. Silver reads bronze incrementally by a watermark on ingested_at, parses with explicit
types, writes failures to a rejects table, and folds events to one row per txn_id: the start time from the first
event, the status from the latest. It MERGEs on txn_id, updating only status columns, and only if the incoming status
is newer, so it is idempotent and late events do not move the transaction's date. Gold is successful GMV per merchant
per IST day, rebuilt only for affected dates with a predicate overwrite. To find those dates I read silver's change
data feed: the pre- and post-image rows carry the dates."

**Follow-up.** "A reversal arrives for a payment from two months ago. What happens?" — "Bronze appends it, silver
updates one row, the change feed names that old date, and gold rebuilds that one day. Dashboards for that day
change, so finance should see a note of restated days — the change feed gives the list."

## Q4. "Our Snowflake (or BigQuery) bill doubled. What do you do?"

**Model answer.** "Find where first: the query history — ACCOUNT_USAGE.QUERY_HISTORY and WAREHOUSE_METERING_HISTORY
on Snowflake, INFORMATION_SCHEMA.JOBS on BigQuery — grouped by query fingerprint and by warehouse, because repeated
queries drive cost. Usually a few fingerprints are most of it. Then the fix depends on the cause: a warehouse that
never suspends because a dashboard keeps it awake — lower AUTO_SUSPEND, point the dashboard at a summary table; full
scans — partition filters, clustering, selecting fewer columns; a job recomputing history every hour — make it
incremental. Then limits: resource monitors or maximum bytes billed, and a budget alert. And I would measure the same
fingerprints the next week to prove the change worked."

**Follow-up.** "Would a bigger warehouse help?" — "Only for compute-bound queries. Each size up doubles the rate, so
it pays only if the time halves; for small or I/O-bound queries it just costs more."`,
    mcqs: [
      mcq('Asked "How does Delta Lake give ACID on S3?", which answer would an interviewer rate highest?', [
        ['A commit is the creation of the next log file listing added and removed files', true],
        ['S3 provides transactions across objects, and Delta simply switches them on', false],
        ['Delta keeps a database server beside the bucket that locks the table on writes', false],
        ['Delta writes each file twice and compares the copies before readers see them', false],
      ], 'The log is the mechanism: readers trust only committed log entries, and creating one file is atomic. S3 has no multi-object transactions, there is no lock server in the format (some deployments add a lock for concurrent writers), and double writes are not how it works.'),
      mcq('In a medallion design question, the interviewer asks how gold knows which days to rebuild after late corrections. Which answer is strongest?', [
        ['Read silver\'s change data feed and rebuild the dates in its pre- and post-images', true],
        ['Rebuild the whole of gold every hour, since that is always simplest and correct', false],
        ['Rebuild only today\'s partition, because corrections are applied on arrival day', false],
        ['Compare bronze and gold row counts for each day and rebuild days that differ', false],
      ], 'The change feed names exactly the changed rows with their dates before and after, so only those slices are rebuilt. Full rebuilds work but grow expensive, today\'s date misses corrections to old payments, and row counts miss amount and status changes.'),
      mcq('Asked whether a bigger Snowflake warehouse would cut a doubled bill, what should a strong candidate say?', [
        ['Only for compute-bound queries, since each size up doubles the hourly rate', true],
        ['Yes, because bigger warehouses finish sooner and so are always cheaper', false],
        ['No, because Snowflake bills per query, so warehouse size has no effect', false],
      ], 'Doubling the rate pays only if run time halves, which happens for queries with enough parallel work. Bigger is not always cheaper, and Snowflake bills warehouse time and size, not per query.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_WAREHOUSE_LAKEHOUSE_CHECKPOINT',
    notes: `Ten questions across the topic: cloud warehouses and billing, data lakes, open table formats, medallion layers,
and cost control. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('On BigQuery\'s on-demand model, what does a query cost depend on?', [
        ['The bytes in the columns it references, across what it does not prune', true],
        ['The number of rows it returns to the client after the LIMIT is applied', false],
        ['The wall-clock time it runs for, multiplied by the warehouse size used', false],
        ['A fixed charge per query, however much or little data it needs to read', false],
      ], 'On-demand bills bytes processed in referenced columns, after partition pruning. Rows returned and LIMIT do not reduce it, time × size is the Snowflake or capacity model, and there is no flat per-query charge.'),
      mcq('Why can several Snowflake warehouses, or BigQuery reservations, work on the same tables without copying them?', [
        ['Storage is separate from compute, so any compute reads the one stored copy', true],
        ['Each warehouse keeps its own replica, synchronised by the services layer', false],
        ['Tables are locked to one warehouse at a time, and the others take turns', false],
        ['The tables are cached in memory on each warehouse when it first starts up', false],
      ], 'Cloud warehouses keep one copy on shared storage and attach independent compute to it, which gives workload isolation. There are no per-warehouse replicas or turn-taking, and local caches are an optimisation, not where the table lives.'),
      mcq('A raw zone receives JSON whose amount field switched from a number to a formatted string. Where should the problem be caught?', [
        ['In the job that parses raw into curated, with rejects and an alert', true],
        ['In each dashboard query, by casting amount wherever it is summed', false],
        ['In the raw zone, by editing the files to restore the numeric format', false],
        ['Nowhere; the lake accepts any schema, so readers adapt to changes', false],
      ], 'Schema on read means the first explicit parse is the place to type, reject and alert, once. Casting in every query repeats and drifts, raw must stay as received, and "readers adapt" is how a lake becomes a swamp.'),
      mcq('A day\'s data arrives as 1,440 small files. Querying a week is about 46 times slower than with one file per day. What is the standard fix?', [
        ['Compact each completed day into a few large files', true],
        ['Add more threads so the files are read in parallel', false],
        ['Store the files as CSV, which has no footer overhead', false],
        ['Partition by minute so that each file has a folder', false],
      ], 'Compaction removes per-file overhead (listing, opening, footers) while keeping the data. More threads still pay that overhead, CSV is larger and unprunable, and minute folders add listings.'),
      mcq('A Delta table\'s version 7 lists files A and B. Version 8 is a MERGE that rewrote B into C. Which files does a reader of version 8 use, and which stay on disk?', [
        ['Reads A and C; B stays on disk until VACUUM removes it', true],
        ['Reads A, B and C; the log merges B and C when it is read', false],
        ['Reads C only; A is rewritten too, in every MERGE commit', false],
        ['Reads A and C; B is deleted from disk within the commit', false],
      ], 'Version 8 is version 7 plus add C, remove B, so A and C; B is only marked removed so version 7 stays readable. A MERGE rewrites only files with matched rows, and physical deletion is VACUUM\'s job.'),
      mcq('What does Iceberg\'s partition evolution allow that plain Hive-style folders do not?', [
        ['Changing the partition scheme for new data without rewriting old data', true],
        ['Partitioning on a column with millions of values without small files', false],
        ['Reading partitions without any catalogue or metadata files at all', false],
        ['Updating a single row in place inside an existing Parquet data file', false],
      ], 'Iceberg records the partition spec in metadata per snapshot, so old files keep the old scheme and new ones use the new one. High cardinality still makes small files, Iceberg depends on its catalogue, and Parquet files are never edited in place.'),
      mcq('PayNest\'s silver transactions table must stay correct when a status-change event arrives days late. Which MERGE design does that?', [
        ['Match on txn_id; update status only if the incoming status time is newer', true],
        ['Insert every incoming event as a new row and let gold pick the latest one', false],
        ['Overwrite the whole silver table from the latest bronze batch on each run', false],
        ['Match on txn_id and update every column from the incoming batch each time', false],
      ], 'A key-based MERGE with a newer-only guard on the status columns is idempotent and keeps the start time intact. Inserting events makes silver an event log, overwriting from one batch loses everything else, and updating every column moves the payment\'s date.'),
      mcq('A gold table is rebuilt for a list of dates with write_deltalake(..., mode="overwrite", predicate=...). What does the predicate do?', [
        ['Replaces only the rows matching it, in one commit', true],
        ['Filters the new data before an append to the table', false],
        ['Overwrites the whole table, then deletes other dates', false],
        ['Checks that the new rows satisfy it, or the write fails', false],
      ], 'A predicate overwrite removes the matching rows and adds the new ones atomically, leaving other dates untouched. It is not an append filter, never empties the whole table, and is not a validation rule.'),
      mcq('A dashboard runs 2,000 times a week but costs almost nothing, while three analyst query shapes are 99% of the bill. What does this tell you about cost reviews?', [
        ['Rank query fingerprints by total cost, not by how often they run', true],
        ['Frequent queries are always cheap, so they never need to be reviewed', false],
        ['Analyst access should be removed, since analysts drive most of the cost', false],
        ['Dashboards should be run more often, since they make the warehouse cheaper', false],
      ], 'Total cost is runs × work per run; the dashboard is cheap because it reads a small gold table, not because it is frequent. A frequent query on a big table can dominate, and removing analysts or adding refreshes does not address the expensive shapes.'),
      mcq('Which pair is a correct guard against a surprise warehouse bill?', [
        ['BigQuery maximum bytes billed; Snowflake resource monitors', true],
        ['BigQuery LIMIT clauses; Snowflake larger warehouse sizes', false],
        ['BigQuery result cache off; Snowflake AUTO_SUSPEND switched off', false],
        ['BigQuery SELECT * views; Snowflake multi-cluster warehouses', false],
      ], 'Maximum bytes billed refuses oversized queries, and resource monitors notify or suspend at a credit quota. LIMIT does not reduce bytes and bigger sizes cost more, turning off cache or auto-suspend raises cost, and SELECT * views and extra clusters add work.'),
    ],
  },
];
