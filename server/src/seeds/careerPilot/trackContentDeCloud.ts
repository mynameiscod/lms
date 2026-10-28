/**
 * Career-track content: The Cloud Data Stack (DE_CLOUD_DATA), Data Engineer, batch DE3.
 *
 * The services a data platform actually runs on: the AWS data stack (S3 as the lake, IAM roles, the Glue catalogue and
 * Glue jobs, Athena, Redshift, EMR and Lake Formation), querying the lake through the Glue catalogue and Athena
 * (partitions, partition projection, bytes scanned, CTAS), the same platform on Azure (ADLS Gen2, Data Factory,
 * Synapse, Microsoft Fabric, Azure Databricks), and running it all as code with CI/CD, secrets and cost controls.
 * Warehouse internals, lake layout and table formats are taught in DE_WAREHOUSE_LAKEHOUSE ("Cloud Data Warehouses",
 * "Data Lakes and Object Storage", "Open Table Formats"), Spark in DE_SPARK and dbt in DE_DBT; they are referred to by
 * title, not re-taught. Students here have NOT taken the Cloud track, so the S3 and IAM basics are explained briefly.
 *
 * One fictional company runs through the topic: ThaliGo, a Hyderabad food-delivery app, with 1.5 million synthetic
 * October 2026 orders (31 daily partitions, 97.7 MB of Parquet). Verified by running on a laptop: boto3 against moto 5.2
 * (S3 buckets, prefixes, versioning and lifecycle, an IAM role for Glue with the AWS managed policy, Glue databases,
 * tables, partitions, crawlers and job runs, an Athena workgroup and start_query_execution, which moto accepts but does
 * not execute); every Athena-style query run in DuckDB 2.0 over the same Parquet for pruning and bytes read; Terraform
 * parsed with python-hcl2 8.1 and GitHub Actions YAML with PyYAML 6.0; the Glue job script checked with py_compile.
 * Real Athena results and billing, Redshift, EMR, Lake Formation and all of Azure are written from documentation and
 * marked as such. No prices: only how each service bills.
 *
 * Skills: DATA_WAREHOUSING by default; DATA_PLATFORM_OPS is CLOUD_STORAGE. Checkpoint questions elsewhere that are
 * plainly about S3, IAM, storage tiers or running the platform use ck('CLOUD_STORAGE', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_CLOUD_DATA_BUNDLES: PilotBundle[] = [
  /* ── AWS_DATA_STACK ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_AWS_DATA_STACK',
    notes: `ThaliGo is a fictional food-delivery app in Hyderabad. Its data team has run DuckDB and dbt on one server for a
year; now the company has signed with AWS and the CTO wants a platform diagram by Friday. You already know what a lake,
a warehouse and a table format are ("Data Lakes and Object Storage", "Cloud Data Warehouses"). This lesson puts AWS
names on those boxes and shows how they connect.

## The two AWS basics everything else needs

**Regions and accounts.** Every resource lives in one region: ap-south-1 is Mumbai, ap-south-2 Hyderabad. Keep the
lake and the engines that read it in the same region; cross-region reads are slower and data transfer between regions
is billed. Companies use separate AWS accounts for dev and prod so a mistake in one cannot touch the other.

**S3, the lake.** A bucket is a container with a globally unique name, created in one region. Inside it are objects,
each addressed by a key such as orders/order_date=2026-10-05/part-0000.parquet. There are no real folders: the slashes
are part of the key, and the console shows prefixes as folders. Objects can be up to 5 TB, reads after writes are
strongly consistent, new objects are encrypted at rest by default (SSE-S3; you can choose SSE-KMS with your own key),
and new buckets block public access by default. Storage classes (Standard, Intelligent-Tiering, Standard-IA, the
Glacier classes) trade storage cost against retrieval cost and speed; lifecycle rules move or expire objects by age.

**IAM, who may do what.** A policy is JSON: Effect, Action, Resource. A **role** is an identity with no password that
a service or person *assumes* to get short-lived credentials. A role has two policies: a **trust policy** (who may
assume it) and **permission policies** (what it may do). Glue jobs, Redshift COPY, EMR clusters and Lambda functions
all run as roles. The rule a data engineer lives by: no access keys in code, notebooks or config files — ever.

The lab created ThaliGo's Glue role with boto3 against moto (a library that mocks AWS locally):

    trust  = {"Effect": "Allow", "Principal": {"Service": "glue.amazonaws.com"}, "Action": "sts:AssumeRole"}
    role arn:aws:iam::123456789012:role/thaligo-glue-dev
    attached ['AWSGlueServiceRole']
    inline   ['read-orders']   # s3:ListBucket on the bucket, s3:GetObject on orders/*

Why both? The AWS managed policy AWSGlueServiceRole lets Glue write logs and use the catalogue, but its S3 object
access covers only buckets and paths named aws-glue-* (moto ships a copy of the policy; read it in the IAM console).
Your lake buckets need their own policy, scoped to the prefixes the job reads and writes.

## The stack, box by box

    box           AWS service                        what it is                                   bills by
    store         S3                                 objects in buckets                           GB-month + requests
    catalogue     Glue Data Catalog                  databases, tables, partitions (Hive-style)   objects stored + requests
    transform     Glue ETL jobs                      serverless Spark or Python jobs              DPU-hours, per second
                  EMR (on EC2, Serverless, on EKS)   managed Spark/Hive/Trino clusters            instance-hours or vCPU/GB-seconds
    query lake    Athena                             serverless SQL (Trino-based) over S3         data scanned, or provisioned DPUs
    warehouse     Redshift (provisioned/Serverless)  MPP SQL warehouse                            node-hours or RPU-hours, storage
    govern        Lake Formation                     table/column/row permissions on the catalog  permissions: no separate charge (docs)
    orchestrate   MWAA, Step Functions               managed Airflow, state machines              environment-hours, transitions

A few lines on each, from the AWS documentation:

- **Glue Data Catalog** is a Hive-metastore-compatible list of databases and tables: column types, the S3 location,
  the file format and the partitions. Athena, EMR, Redshift Spectrum and Glue jobs all read it, so a table defined
  once is queryable from all of them. Crawlers can infer tables from files; "Querying the Lake" shows when not to.
- **Glue ETL jobs** run your PySpark script on workers Glue provisions for the run (worker types such as G.1X;
  billing per second with a one-minute minimum on current versions). Job bookmarks remember which files were
  processed. Good for scheduled batch transforms with no cluster to look after.
- **EMR** gives you the Spark you learnt in "Spark in Production" with more control: EMR on EC2 (primary, core and
  task nodes; Spot instances suit task nodes), EMR Serverless (submit a job, pay for the vCPU and memory it uses), or
  EMR on EKS. Data stays in S3; clusters are transient — start, run, terminate.
- **Athena** runs SQL straight on S3 through the catalogue. No servers; you pay for bytes scanned, which is why the
  next lesson is all about partitions and Parquet.
- **Redshift** is the warehouse from "Cloud Data Warehouses": COPY loads Parquet from S3 using an IAM role, UNLOAD
  writes back, and Spectrum queries catalogue tables in S3 without loading them.
- **Lake Formation** centralises permissions on catalogue objects: grant an analyst role SELECT on orders except the
  customer_phone column, or only rows where city = 'Hyderabad', and Athena, Redshift Spectrum, EMR and Glue enforce
  it. LF-Tags let you grant by tag (pii = yes) instead of table by table.

## One order's journey through ThaliGo's platform

    RDS PostgreSQL (app)  --DMS change capture-->  s3://thaligo-lake-prod-raw/orders/ingest_date=.../*.json
    Glue job (hourly, role thaligo-glue-prod)  -->  s3://thaligo-lake-prod-curated/orders/order_date=.../*.parquet
                                                    + partitions added to Glue table thaligo_curated.orders
    Athena workgroup "analysts"                -->  ad-hoc SQL on thaligo_curated.orders
    Redshift Serverless + dbt                  -->  marts for dashboards (Spectrum or COPY from curated)
    Lake Formation                             -->  analysts see orders without customer_phone

The moto lab built the curated bucket and listed it the way any engine does, by prefix and delimiter:

    CommonPrefixes ['orders/order_date=2026-10-01/', 'orders/order_date=2026-10-02/', 'orders/order_date=2026-10-03/']
    Contents at that level ['orders/_SUCCESS']
    one day [('orders/order_date=2026-10-02/part-0000.parquet', 12065), (...part-0001.parquet', 12066)] KeyCount 2

## Choosing between the engines

- **Athena** for ad-hoc SQL on the lake and light scheduled SQL (CTAS). Nothing to run; cost follows bytes scanned.
- **Glue jobs** for scheduled Spark transforms of modest size by a small team. **EMR** when jobs are large, long, or
  need tuning, specific versions or Spot savings.
- **Redshift** when many analysts and dashboards hit the same modelled tables all day and need steady, fast SQL.

Many companies use all four. The skill is knowing which question each one answers. On Azure the same boxes are ADLS
Gen2, Data Factory, Synapse or Fabric, and Databricks; "The Azure Data Stack" maps them.`,
    workedExample: `**Scenario.** ThaliGo's requirements: (1) app orders from RDS PostgreSQL land in the lake within the hour; (2)
analysts explore a year of orders with SQL; (3) 40 dashboards refresh every 15 minutes in office hours; (4) the
data-science team runs a weekly Spark feature job over 18 months of orders; (5) customer phone numbers must not be
visible to analysts. Draw the platform, naming the service, the S3 path and the IAM role at each step.

**1. Land.** DMS replicates the orders table into s3://thaligo-lake-prod-raw/orders/ingest_date=YYYY-MM-DD/. DMS runs
as role thaligo-dms-prod, which may PutObject on that prefix only.

**2. Curate.** A Glue job, hourly, role thaligo-glue-prod: GetObject on raw/orders/*, Put/DeleteObject on
curated/orders/*, catalogue access via AWSGlueServiceRole. It deduplicates, types and writes Parquet partitioned by
order_date, then registers new partitions.

**3. Explore.** Athena workgroup analysts-prod, its results in s3://thaligo-athena-results-prod/, with a per-query
scan limit. Analysts assume role thaligo-analyst, which has no S3 write access at all.

**4. Dashboards.** Forty dashboards every 15 minutes is a steady load on the same few tables: dbt builds marts in
Redshift Serverless, and dashboards read the marts. Athena would also work if the marts were small Parquet tables;
the decision rests on concurrency and latency, and is worth revisiting after a month of real usage.

**5. Weekly Spark.** 18 months of orders, heavy joins and window functions: EMR Serverless, or a transient EMR
cluster with Spot task nodes, role thaligo-emr-ds reading curated/ and writing to a features/ prefix.

**6. Govern.** Register the curated bucket with Lake Formation; grant thaligo-analyst SELECT on orders with
customer_phone excluded. Analysts query the same table, and the column simply is not there for them.

Every arrow is a role with access to named prefixes. That table of roles is the first thing a security review asks for.`,
    mcqs: [
      mcq('A ThaliGo Glue job runs with only the AWS managed policy AWSGlueServiceRole attached. It fails reading s3://thaligo-lake-prod-raw/orders/. Why?', [
        ['That policy grants object access only to aws-glue-* buckets and paths', true],
        ['Glue jobs cannot read buckets that were created in another AWS account', false],
        ['The bucket must be made public before any Glue job is able to read it', false],
        ['AWSGlueServiceRole only works for crawlers and never for ETL Glue jobs', false],
      ], 'The managed policy covers Glue itself, logs and objects under aws-glue-* names, so lake buckets need a policy of their own scoped to their prefixes. Cross-account reads are possible with the right policies, public buckets are the wrong fix, and the policy is used by jobs as well as crawlers.'),
      mcq('Which pair describes an IAM role correctly?', [
        ['A trust policy says who may assume it; permission policies say what it can do', true],
        ['A permission policy says who may assume it; a trust policy lists its buckets', false],
        ['It holds a password and a long-lived access key for a service to log in with', false],
        ['It is a group of IAM users who share one set of S3 bucket permissions', false],
      ], 'A role has no password or long-lived keys; whoever the trust policy allows assumes it and gets temporary credentials limited by its permission policies. The two policies are not swapped, and a group of users is an IAM group, not a role.'),
      mcq('ThaliGo\'s data science team needs a weekly 18-month Spark job with tuned shuffle settings and Spot savings. Which service fits best?', [
        ['EMR, as a transient cluster or EMR Serverless', true],
        ['Athena, running the job as one large CTAS query', false],
        ['Redshift Serverless with a scheduled SQL query', false],
        ['Lake Formation with a weekly governed transform', false],
      ], 'EMR is managed Spark with control over configuration and instance types, including Spot for task nodes. Athena and Redshift run SQL, not the team\'s Spark code, and Lake Formation manages permissions rather than running jobs.'),
    ],
    checkpoint: [
      mcq('Which AWS service lets Athena, Redshift Spectrum, EMR and Glue jobs all see the same table definition for s3://thaligo-lake-prod-curated/orders/?', [
        ['The Glue Data Catalog', true],
        ['The S3 bucket policy', false],
        ['A Redshift external view', false],
        ['The Athena query history', false],
      ], 'The Glue Data Catalog stores databases, tables and partitions and is read by all four engines. A bucket policy only controls access, a Redshift view lives inside Redshift, and query history is a log, not a catalogue.'),
      ck('CLOUD_STORAGE', 'An S3 bucket has keys orders/order_date=2026-10-01/part-0000.parquet and orders/_SUCCESS. A list call with Prefix orders/ and Delimiter / returns what?', [
        ['The order_date=... prefixes as CommonPrefixes and orders/_SUCCESS in Contents', true],
        ['Every key under orders/, because S3 ignores the Delimiter on list operations', false],
        ['Only orders/_SUCCESS, since S3 has no folders and so lists no prefixes at all', false],
        ['An error, because a Prefix and a Delimiter cannot be given in the same request', false],
      ], 'With a delimiter, S3 rolls up keys that share the next path segment into CommonPrefixes and returns keys at that level in Contents, which is what the moto lab printed. The delimiter is honoured, prefixes are reported, and the two parameters are meant to be used together.'),
      mcq('Analysts must query ThaliGo\'s orders table but never see the customer_phone column, in Athena or in Redshift Spectrum. Where is that best enforced?', [
        ['A Lake Formation column grant on the catalogue table', true],
        ['A bucket policy that denies reading the phone column', false],
        ['A separate copy of the table without the phone column', false],
        ['A note in the data catalogue asking analysts not to look', false],
      ], 'Lake Formation permissions apply to catalogue tables and columns and are enforced by the engines that read them. S3 policies work on whole objects, not columns, a copy duplicates data and pipelines, and a note is not access control.'),
    ],
  },

  /* ── ATHENA_GLUE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_ATHENA_GLUE',
    notes: `ThaliGo's analysts now have Athena. In week one a single analyst's query scanned the whole of October twenty times
an afternoon, and the finance head asked why a "serverless" tool has a bill. This lesson is the working knowledge:
how Athena finds a table, how it decides which files to read, and what you pay for.

## How a query reaches the files

1. Athena looks up the table in the Glue Data Catalog: columns, format, the S3 location, the partition keys.
2. It works out which partitions match the WHERE clause and lists only those prefixes.
3. It reads the needed columns from those files (Parquet lets it skip the rest), runs the query on its Trino-based
   engine, and writes the result as a CSV file to the workgroup's S3 results location.

A table is just metadata. Declare one in SQL (or in Terraform, or with boto3 as the lab did):

    CREATE EXTERNAL TABLE thaligo_curated.orders (
      order_id string, order_ts timestamp, city string, restaurant_id string, customer_id string,
      items int, amount_paise bigint, payment_mode string, status string, delivery_minutes int,
      customer_note string)
    PARTITIONED BY (order_date string)
    STORED AS PARQUET
    LOCATION 's3://thaligo-lake-prod-curated/orders/';

## Partitions must be registered

A new folder in S3 is invisible to Athena until the catalogue knows about the partition. Three ways:

- ALTER TABLE orders ADD PARTITION (order_date = '2026-10-05') LOCATION 's3://.../order_date=2026-10-05/'; — exact;
  the job that writes the folder adds it (or calls glue.batch_create_partition, as the lab did).
- MSCK REPAIR TABLE orders; scans the whole location for key=value folders. Simple, but it gets slow as the table
  grows to thousands of partitions.
- **Partition projection**: no partitions in the catalogue at all; Athena computes them from table properties:

    TBLPROPERTIES (
      'projection.enabled' = 'true',
      'projection.order_date.type' = 'date',
      'projection.order_date.format' = 'yyyy-MM-dd',
      'projection.order_date.range' = '2024-01-01,NOW',
      'projection.order_date.interval' = '1',
      'projection.order_date.interval.unit' = 'DAYS',
      'storage.location.template' = 's3://thaligo-lake-prod-curated/orders/order_date=\${order_date}/')

  Per the Athena docs this is faster for highly partitioned tables and needs no maintenance; the catch is that only
  Athena understands it (Spark on EMR or Glue still reads the catalogue's partitions).

In moto, registering the same partition twice returned an error per item rather than failing the call, and a
partition filter expression worked on the catalogue:

    partitions before adding 0
    again errors [(['2026-10-01'], 'AlreadyExistsException')]
    filtered [['2026-10-02'], ['2026-10-03']]       # Expression="order_date >= '2026-10-02'"

## Crawlers: useful, not for everything

A Glue crawler reads sample files and creates or updates tables and partitions. It is handy for discovering a messy
raw source. For curated tables you designed, define the table yourself: crawlers can change column types when one
file looks different, split one dataset into many tables when files under a prefix have different schemas, and they
bill for their run time. Set SchemaChangePolicy to LOG on anything production reads, as the lab did:

    crawler READY {'ScheduleExpression': 'cron(30 1 * * ? *)', 'State': 'SCHEDULED'} {'UpdateBehavior': 'LOG', ...}
    second start: CrawlerRunningException ... Crawler with name thaligo-raw-order...

## What a query reads, measured

The same 1.5 million October orders, partitioned by order_date into 31 Parquet files (97.7 MB), were queried in
DuckDB 2.0, which prunes Hive partitions the way Athena does. EXPLAIN ANALYZE reported:

    query                                                   files opened   data read
    sum(amount) WHERE order_date = '2026-10-05'                1 of 31      249.5 kB
    sum(amount) WHERE order_date BETWEEN 10-01 AND 10-07       7 of 31        1.6 MB
    sum(amount) WHERE order_ts on 5 Oct (not the partition)   31 of 31        1.0 MB
    sum(amount), no filter                                    31 of 31        7.1 MB
    SELECT * WHERE order_date = '2026-10-05'                   1 of 31        3.1 MB
    SELECT * (whole month)                                    31 of 31       98.1 MB

And the same "city, sum(amount)" query over three copies of the data:

    raw CSV (191.6 MB file)        read 191.5 MB
    gzip CSV (70.2 MB file)        read  81.9 MB
    Parquet (95.4 MB file)         read   7.3 MB

The Parquet file is larger than the gzipped CSV here (a random customer_note column does not compress), yet the
query read a tenth as much, because a column store reads only city and amount_paise. Athena bills by bytes scanned
(per the docs, rounded up per MB with a 10 MB minimum per query; DDL statements and failed queries are not charged),
so the same habits apply: Parquet, partition filters, named columns.

The order_ts filter is the subtle row. It found the right rows by Parquet row-group statistics, but every file was
opened to read them. Engines prune folders only on partition columns, so tell analysts to filter on order_date.

## Partition keys declared as strings

Glue partition keys are often string. A string compares as text: in a lab table partitioned month=1 to month=12 (no
zero padding), WHERE month >= '9' returned only month 9, because '10' < '9' as text. With the column typed as an
integer, the same filter returned 9, 10, 11, 12. Zero-pad (month=09), use dates in yyyy-MM-dd form, or type the key.

## CTAS: let Athena write the summary table

    CREATE TABLE thaligo_consumption.daily_city
    WITH (format = 'PARQUET', external_location = 's3://thaligo-lake-prod-consumption/daily_city/',
          partitioned_by = ARRAY['order_date'])
    AS SELECT city, count(*) AS orders, sum(amount_paise) AS gmv_paise, order_date
       FROM thaligo_curated.orders
       WHERE status = 'DELIVERED' AND order_date BETWEEN '2026-10-01' AND '2026-10-31'
       GROUP BY city, order_date;

The partition column goes last in the SELECT, the external location must be empty, and one CTAS or INSERT INTO can
write at most 100 partitions (load more with further INSERT INTO statements). The lab's equivalent summary was 248
rows and 24.6 kB; a week by city from it read 7.4 kB against 1.9 MB from the base table.

## Workgroups: the guard rail

Put every team in an Athena workgroup with its own results location, a per-query data-scanned cutoff (the lab set
1 GiB), and EnforceWorkGroupConfiguration so users cannot override it. Workgroup-wide limits can alert through SNS
when a team's scanning over a period crosses a threshold.`,
    workedExample: `**Scenario.** A ThaliGo dashboard shows GMV by city for the last 7 days and refreshes every 15 minutes, 12 hours a
day: 48 runs a day. It queries thaligo_curated.orders directly. Work out what each run reads, then reduce it. Figures
are from DuckDB on the lab month (1.5 million orders); Athena's planner differs in detail but prunes the same way.

**1. As written.** WHERE order_ts >= current_timestamp - interval '7' day. order_ts is not the partition column, so
all 31 files were opened; row-group statistics skipped 24 of 31 groups and 4.3 MB was read, including the order_ts
column itself. On a year of history that is 365 partitions listed and opened on every run, and the statistics only
help while each file holds a tidy range of timestamps; one late-arriving batch spoils a file's min and max.

**2. Filter on the partition.** Add AND order_date >= date_format(current_date - interval '7' day, '%Y-%m-%d').
Seven files opened, 1.7 MB read, and that stays true however many years the table holds. The cost now follows the
window, not the table.

**3. Pre-aggregate.** A CTAS (then a daily INSERT INTO) builds daily_city, one row per city per day; the week reads
7.4 kB. Notice what the 10 MB minimum per query does: on the lab month, steps 2 and 3 are both billed as 10 MB a
run, 480 MB a day. The summary pays off at real volume. If production has thirty times the lab's orders, step 2 reads
about 51 MB a run (about 2.4 GB a day) while the summary still reads kilobytes billed as 10 MB.

**4. Guard.** Run the dashboard's service role in its own workgroup with a per-query cutoff a little above what the
query should need, so a broken filter fails loudly instead of scanning a year.`,
    mcqs: [
      mcq('A ThaliGo job writes s3://.../orders/order_date=2026-10-06/ at 01:00. At 09:00 Athena returns no rows for 6 October, with no error. What is the likely cause?', [
        ['The partition was never added to the catalogue, so Athena does not list it', true],
        ['S3 has not yet made the new files visible to readers in another service', false],
        ['Athena caches table listings for a day, so new data appears at midnight', false],
        ['The Parquet files are too small, so Athena skips them as empty files', false],
      ], 'Athena reads only partitions the catalogue knows (or projection computes); an unregistered folder returns zero rows quietly. S3 has been strongly consistent since 2020, there is no daily listing cache, and small files are read, just slowly.'),
      mcq('In the lab, a filter on order_ts for one day read 1.0 MB but opened 31 of 31 files, while order_date = \'2026-10-05\' opened 1. What explains the difference?', [
        ['Folder pruning works only on the partition column; order_ts used file statistics', true],
        ['order_ts is a timestamp, and engines cannot filter timestamps in Parquet files', false],
        ['The order_date filter used an index that Glue builds when partitions are added', false],
        ['The order_ts query had no WHERE clause, so it read every file in the table', false],
      ], 'Partitions are pruned before files are opened only on partition keys; the order_ts filter still skipped row groups by min/max statistics, after opening every footer. Timestamps filter fine, Glue builds no index, and the query did have a WHERE clause.'),
      mcq('ThaliGo\'s orders table has partition projection enabled. Which statement about it is true?', [
        ['Athena computes partitions from table properties, but Spark on EMR still needs catalogue partitions', true],
        ['Projection stores every partition in the Glue catalogue automatically, so MSCK REPAIR runs by itself', false],
        ['Projection makes Athena read only the newest partition unless the query names an older date', false],
      ], 'Projection replaces catalogue partitions for Athena only, which is its main catch. It does not write partitions to the catalogue, and it changes how partitions are found, not which ones a query reads.'),
    ],
    checkpoint: [
      mcq('Which change cuts the bytes Athena scans for SELECT city, sum(amount_paise) FROM orders WHERE order_date = \'2026-10-05\' GROUP BY city, on gzipped CSV files?', [
        ['Rewrite the table as Parquet so only two columns are read', true],
        ['Add LIMIT 10 so that Athena stops reading the files early', false],
        ['Compress the CSV files with a stronger gzip setting again', false],
        ['Run the query in a different workgroup with more capacity', false],
      ], 'A columnar format lets Athena read only city and amount_paise; in the lab Parquet read 7.3 MB against 81.9 MB for gzip CSV. LIMIT applies after the aggregate, better gzip still reads every column, and a workgroup changes limits and results location, not bytes.'),
      mcq('A Glue table is partitioned by month as a string, with folders month=1 to month=12. WHERE month >= \'9\' returns only September. Why?', [
        ['Strings compare as text, and \'10\', \'11\' and \'12\' sort before \'9\'', true],
        ['Athena prunes string partitions only on equality, never on ranges', false],
        ['Partitions 10 to 12 were never registered in the Glue catalogue yet', false],
        ['The >= operator cannot be applied to a column of type partition key', false],
      ], 'Text comparison goes character by character, so \'10\' < \'9\'; the lab showed exactly this, and an integer key returned 9 to 12. Ranges on string keys work, the partitions existed, and >= is allowed on partition keys.'),
      mcq('A CTAS writing daily_city partitioned by order_date for all of 2026 fails. What is the documented limit it most likely hit?', [
        ['One CTAS or INSERT INTO can write at most 100 partitions', true],
        ['A CTAS cannot write Parquet with partitioned_by set to a date', false],
        ['A CTAS may read only one partition of its source table per run', false],
        ['A CTAS result must fit in the workgroup\'s 10 MB query minimum', false],
      ], 'Athena limits CTAS and INSERT INTO to 100 partitions per statement, so a year of daily partitions is loaded in batches. Partitioned Parquet output is the normal use, sources are not limited to one partition, and the 10 MB figure is a billing minimum, not a size limit.'),
    ],
  },

  /* ── AZURE_DATA_STACK ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_AZURE_DATA_STACK',
    notes: `Half of the data engineering jobs advertised by GCCs in Hyderabad and Bengaluru say "Azure": banks, insurers and
retailers that run Microsoft everywhere. ThaliGo's parent group is one of them, and wants the same platform on Azure
for a sister brand. Everything you learnt on AWS carries across; the names, the identity model and the packaging change.
This lesson is written from Microsoft's documentation; nothing here was run against Azure.

## The map

    box           AWS                              Azure
    store         S3 bucket                        ADLS Gen2: storage account + container, hierarchical namespace
    identity      IAM role                         Microsoft Entra ID + managed identity, Azure RBAC roles
    catalogue     Glue Data Catalog                Unity Catalog (Databricks), Fabric/OneLake, Synapse metastore
    ingest        DMS, Glue, AppFlow               Data Factory (copy activity, connectors)
    transform     Glue jobs, EMR                   Azure Databricks, Synapse Spark, Fabric notebooks, ADF data flows
    query lake    Athena                           Synapse serverless SQL pool, Fabric SQL analytics endpoint
    warehouse     Redshift                         Synapse dedicated SQL pool, Fabric Warehouse
    stream        Kinesis, MSK                     Event Hubs (also speaks the Kafka protocol)
    govern        Lake Formation                   Unity Catalog grants, Microsoft Purview
    secrets       Secrets Manager                  Key Vault
    orchestrate   MWAA, Step Functions             Data Factory pipelines and triggers, Fabric pipelines

## ADLS Gen2: the lake

ADLS Gen2 is Azure Blob Storage with the **hierarchical namespace** switched on when the storage account is created.
That gives real directories: renaming or deleting a folder is one atomic metadata operation, not a copy of every
object as on S3, which Spark and Hive-style table commits benefit from. Paths look like:

    abfss://curated@thaligolakeprod.dfs.core.windows.net/orders/order_date=2026-10-05/part-0000.parquet
            container  storage account                   path

Access is Microsoft Entra ID (formerly Azure Active Directory) plus Azure RBAC roles such as Storage Blob Data Reader
or Contributor at account or container scope, with POSIX-style ACLs on directories for finer control. A **managed
identity** is Azure's answer to an IAM role: an identity Azure gives a resource (a Data Factory, a Databricks access
connector) so it can authenticate without a stored secret. Access tiers (hot, cool, cold, archive) and lifecycle
management rules play the part of S3 storage classes and lifecycle rules.

## Azure Data Factory: move and orchestrate

Data Factory (ADF) is the managed integration service. Its parts:

- **Linked services**: connections (a SQL Server, an ADLS account, a REST API), with secrets kept in Key Vault.
- **Datasets**: the shape and location of data in a linked service.
- **Activities**: Copy (the workhorse), Mapping Data Flow (visual transforms that run on managed Spark), and
  activities that call Databricks notebooks, stored procedures or other pipelines.
- **Pipelines and triggers**: schedule, tumbling window (fixed intervals with backfill and dependencies) and storage
  event triggers.
- **Integration runtimes**: the compute. The Azure IR runs in the cloud; a **self-hosted IR** is installed on a
  machine inside a company network to reach on-premises databases, a very common requirement at banks.

Billing, per the docs, follows activity runs and orchestration, data movement (DIU-hours for copies) and data-flow
compute (vCore-hours). ADF is good at moving data and calling things; heavy transformation belongs in Spark or SQL.

## Synapse Analytics

A Synapse workspace bundles:

- **Dedicated SQL pool**: the MPP warehouse (formerly SQL Data Warehouse), sized in DWUs, billed for its size while
  it runs, and pausable. Tables are distributed HASH, ROUND_ROBIN or REPLICATE — the same idea as Redshift's
  distribution styles.
- **Serverless SQL pool**: Athena's counterpart, SQL over files in the lake, billed per data processed:

    SELECT r.filepath(1) AS order_date, city, SUM(amount_paise) AS gmv_paise
    FROM OPENROWSET(
      BULK 'https://thaligolakeprod.dfs.core.windows.net/curated/orders/order_date=*/*.parquet',
      FORMAT = 'PARQUET') AS r
    WHERE r.filepath(1) >= '2026-10-25'
    GROUP BY r.filepath(1), city;

  filepath(1) returns the value matched by the first wildcard, and filtering on it is how serverless SQL skips
  folders: partition pruning without a catalogue.
- **Apache Spark pools** and **Synapse pipelines** (Data Factory inside the workspace).

Microsoft now points new analytics projects at Fabric; Synapse remains supported and is in production at many
companies you may join, so you need to read it.

## Microsoft Fabric

Fabric is a SaaS platform: one tenant-wide lake, **OneLake** (built on ADLS Gen2), with every item storing tables as
Delta Lake ("Open Table Formats" taught Delta). Items in a workspace include:

- **Lakehouse**: files plus Delta tables, read by Spark notebooks, and a read-only SQL analytics endpoint over them.
- **Warehouse**: T-SQL with full DML, also stored as Delta in OneLake.
- **Data Factory in Fabric**: pipelines and Dataflow Gen2.
- **Shortcuts**: point at data in ADLS, S3 or another workspace without copying it.
- **Power BI Direct Lake**: reports read the Delta tables in OneLake directly instead of importing a copy.

Billing is by **capacity**: you buy an F-SKU measured in capacity units, shared by every workload in it, pay-as-you-go
(pausable) or reserved; OneLake storage is billed separately. A runaway notebook slows everyone on that capacity, so
admins watch the capacity metrics app.

## Azure Databricks

Databricks on Azure is a first-party service: workspaces, clusters (all-purpose for notebooks, job compute for
scheduled runs, or serverless), Jobs for orchestration, and **Unity Catalog** for governance with three-level names
(catalog.schema.table), grants on tables, columns and rows, and lineage. Storage access goes through an access
connector's managed identity, registered as a storage credential and an external location:

    CREATE EXTERNAL LOCATION curated_orders
      URL 'abfss://curated@thaligolakeprod.dfs.core.windows.net/orders'
      WITH (STORAGE CREDENTIAL thaligo_lake_mi);
    GRANT SELECT ON TABLE thaligo.curated.orders TO \`analysts\`;

Billing is DBUs per hour at a rate set by the compute type, plus the Azure VMs underneath for classic compute
(serverless bundles both). The same Databricks runs on AWS, which is why its skills move between clouds easily.

## Which one would a team pick?

- Mostly SQL people, Power BI everywhere, small platform team: **Fabric**.
- Heavy Spark, ML, several clouds, strong engineers: **Databricks** on ADLS Gen2, ADF or Jobs to orchestrate.
- An existing Synapse estate: keep it running, and plan a move as Microsoft's guidance changes.

In an interview, map each to its AWS twin and give the deciding factor: that shows you understand the platform, not
just the product names.`,
    workedExample: `**Scenario.** ThaliGo's sister brand runs on Azure. Its orders sit in an on-premises SQL Server in the Hyderabad
office; its analysts use Power BI. Design the platform with the same zones as on AWS and say what plays the IAM role.

**1. Storage.** One storage account with hierarchical namespace, thaligosisterprod, containers raw, curated and
consumption. Lifecycle rule: raw to the cool tier after 30 days.

**2. Ingest.** Data Factory with a self-hosted integration runtime on a VM in the office network, because the cloud
cannot reach the SQL Server directly. A linked service to SQL Server, its password in Key Vault; a Copy activity
writes raw/orders/ingest_date=YYYY-MM-DD/ as Parquet every hour on a tumbling-window trigger, so missed hours are
backfilled in order.

**3. Transform.** Two reasonable answers, and the choice is the interview point:
- **Fabric**: a shortcut from a Fabric lakehouse to the curated container, notebooks build silver and gold Delta
  tables, Power BI reads gold in Direct Lake mode. Least to run, and analysts are already in Power BI.
- **Databricks**: Unity Catalog over the containers, Jobs run the notebooks, Power BI connects to a SQL warehouse.
  More control; more to administer.
For a small team with Power BI analysts, Fabric is the simpler choice.

**4. Identity.** Data Factory's managed identity gets Storage Blob Data Contributor on raw only. The Fabric workspace
identity (or the Databricks access connector) gets Reader on raw and Contributor on curated and consumption.
Analysts get workspace Viewer roles. No storage account keys anywhere: they are full access to the whole account.

**5. The AWS mapping, for the review.** ADLS Gen2 = S3, managed identity = IAM role, Data Factory + self-hosted IR =
DMS/Glue with network access, Fabric lakehouse + SQL endpoint = Glue catalogue + Athena, Key Vault = Secrets Manager.`,
    mcqs: [
      mcq('ThaliGo\'s sister brand must copy from a SQL Server inside its office network into ADLS Gen2. Which Data Factory piece makes that possible?', [
        ['A self-hosted integration runtime installed on a machine in that network', true],
        ['An Azure integration runtime with a larger number of data integration units', false],
        ['A storage event trigger on the raw container of the ADLS Gen2 account', false],
        ['A Mapping Data Flow that reads from the on-premises SQL Server directly', false],
      ], 'A self-hosted IR runs inside the private network and moves data out to Azure. The cloud Azure IR cannot reach the private server whatever its size, a storage trigger fires on files arriving, and data flows still need a runtime that can reach the source.'),
      mcq('What does turning on the hierarchical namespace give an ADLS Gen2 account that plain S3 lacks?', [
        ['Real directories with atomic rename and delete of a whole folder', true],
        ['Columnar storage, so that queries read only the columns they name', false],
        ['Automatic Delta Lake transactions for every file that is written', false],
        ['Public read access for every directory unless an ACL denies it', false],
      ], 'With the namespace on, directories are real objects, so renaming one is a metadata change rather than copying every file. Columns come from the file format, Delta transactions come from the table format, and storage is private by default.'),
      mcq('A bank\'s team on Synapse serverless SQL wants a query over order_date=*/ folders to read only the last week. What do they filter on?', [
        ['The value returned by filepath() for the order_date wildcard', true],
        ['The order_date column declared in a dedicated SQL pool table', false],
        ['A partition registered for each day with an ALTER TABLE ... ADD', false],
        ['The modified time of each file, read through a storage trigger', false],
      ], 'Serverless SQL prunes folders when the WHERE clause filters on filepath(n), the value matched by a wildcard in the BULK path. A dedicated pool table is a different engine, OPENROWSET needs no partition registration, and file times say when data was written, not its business date.'),
    ],
    checkpoint: [
      mcq('Which pair maps an AWS service to its closest Azure equivalent correctly?', [
        ['Athena to the Synapse serverless SQL pool', true],
        ['Glue Data Catalog to Azure Event Hubs', false],
        ['Redshift to Azure Data Factory pipelines', false],
        ['IAM roles to storage account access keys', false],
      ], 'Both Athena and serverless SQL run SQL directly on files in the lake and bill by data processed. Event Hubs is streaming like Kinesis, Data Factory moves and orchestrates rather than warehousing, and access keys are full-account secrets, the opposite of a scoped role; managed identity is the role equivalent.'),
      mcq('A Fabric capacity serves ThaliGo\'s sister brand. One analyst\'s badly written notebook runs for hours at peak time. What do other users notice?', [
        ['Everything on that capacity slows, since all workloads share its capacity units', true],
        ['Nothing, because each Fabric item gets its own isolated compute that is billed per item', false],
        ['Only that analyst\'s reports fail, as a capacity is split evenly between its users', false],
        ['Nothing until the month ends, when the overrun is added to the next capacity bill', false],
      ], 'Fabric bills and runs workloads on a shared capacity of capacity units, so one heavy job competes with every other item on it; admins watch the metrics app for this. Items are not isolated per user, capacity is not split per person, and the effect is immediate rather than a later bill.'),
      mcq('In Azure Databricks with Unity Catalog, how should a job get access to the curated ADLS Gen2 container?', [
        ['Through an access connector\'s managed identity, set up as a storage credential and external location', true],
        ['With the storage account key pasted into the notebook so the job can connect at runtime', false],
        ['By making the curated container public so that every cluster in the workspace can read it', false],
        ['With an analyst\'s personal login, since jobs run with the rights of whoever last edited them', false],
      ], 'Unity Catalog reaches storage through a managed identity registered as a storage credential, and grants control who may use it. Account keys give full access to the whole account and leak, public containers expose data, and personal logins tie production to one person.'),
    ],
  },

  /* ── DATA_PLATFORM_OPS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_DATA_PLATFORM_OPS',
    notes: `Six months in, ThaliGo's platform has 14 buckets, 40 Glue tables, 9 Glue jobs and an Athena workgroup per team. Half
were created by clicking in the console. Nobody can say which settings prod has that dev lacks, a job's IAM policy
was widened "for a test" and never narrowed, and the bill rose 40% in a month. This lesson is how a data platform is
run so none of that happens: infrastructure as code, CI for pipelines and dbt, separate environments, secrets kept
out of code, and cost controls set up before they are needed.

## Infrastructure as code with Terraform

Terraform describes resources in HCL files; terraform plan shows what would change; terraform apply makes it so; the
**state** file records what Terraform manages. ThaliGo's data platform, in part:

    resource "aws_s3_bucket" "lake" {
      for_each = toset(local.zones)                 # raw, curated, consumption
      bucket   = "thaligo-lake-\${var.env}-\${each.key}"
    }
    resource "aws_glue_catalog_database" "curated" { name = "thaligo_curated_\${var.env}" }
    resource "aws_athena_workgroup" "analysts" {
      name = "analysts-\${var.env}"
      configuration {
        enforce_workgroup_configuration = true
        bytes_scanned_cutoff_per_query  = var.athena_cutoff_bytes
        result_configuration { output_location = "s3://thaligo-athena-results-\${var.env}/analysts/" }
      }
    }

The lab parsed the full file (buckets, public access blocks, a lifecycle rule, the Glue database, IAM role, crawler,
workgroup and a budget) with python-hcl2, the way a policy check in CI might, and found a real mistake:

    resources: aws_s3_bucket.lake, aws_s3_bucket_public_access_block.lake, aws_s3_bucket_lifecycle_configuration.raw,
               aws_glue_catalog_database.curated, aws_iam_role.glue, aws_glue_crawler.raw_orders,
               aws_athena_workgroup.analysts, aws_budgets_budget.data_platform
    variables declared ['athena_cutoff_bytes', 'env', 'region']
    variables used     ['athena_cutoff_bytes', 'env', 'monthly_budget', 'region']
    problems ["variables used but not declared: ['monthly_budget']"]

terraform validate would also catch that (Terraform itself was not installed for this lab). Two things the parse
showed about such checks: python-hcl2 8.x keeps the quotes on labels (the raw key is '"aws_s3_bucket"', so strip
them), and it sees expressions, not values — the workgroup cutoff came back as the text \${var.athena_cutoff_bytes}.
To check real values, run terraform plan -out=plan.tfplan and inspect terraform show -json plan.tfplan.

Rules that keep it sane:

- **Remote state, locked.** State in an S3 bucket with versioning (the s3 backend's use_lockfile = true, Terraform
  1.10+, locks with a lock file; older setups used a DynamoDB table). State can contain secrets, so encrypt that
  bucket and restrict who can read it.
- **One state per environment**, ideally one AWS account per environment: the same code, a different dev.tfvars or
  prod.tfvars.
- **No console changes in prod.** If someone clicks, the next plan shows drift; fix it in code or import the
  resource.
- **Modules** for things you make many times: "a lake zone" (bucket, public access block, encryption, lifecycle,
  tags) as one module, so every new bucket comes out right.

## CI/CD for pipelines and dbt

On every pull request, GitHub Actions (or Azure DevOps) runs, fast to slow:

1. Lint and unit tests: ruff, sqlfluff, pytest on transformation functions ("Pipeline Code You Can Trust").
2. dbt in a throw-away schema: download production's manifest.json, then dbt build --select state:modified+ --defer
   --state prod-state builds and tests only changed models and their children, reading unchanged parents from prod.
3. Terraform: fmt -check, validate, plan, with the plan posted on the PR for review.

On merge: apply Terraform, upload Glue scripts to S3 with a version in the path, and let the orchestrator pick up the
new dbt code. Parsing the workflow file with PyYAML gave a lesson of its own:

    top-level keys ['name', True, 'permissions', 'jobs']

YAML 1.1 reads the bare key on as the boolean True, so a script checking wf["on"] finds nothing; GitHub reads it
correctly. The same rule turned python-version: 3.10 into the number 3.1 — quote versions in workflow files.

## Environments and secrets

- dev, staging (optional), prod: separate accounts or at least separate buckets, catalogue databases and roles,
  named by env. Pipelines take env as a parameter; nothing has "prod" hard-coded.
- **Secrets** (database passwords, API tokens) live in AWS Secrets Manager or SSM Parameter Store (Key Vault on
  Azure). Jobs read them at run time with their role; code and Terraform hold only the secret's name.
- **CI to cloud without keys**: GitHub Actions' OIDC token, exchanged for a role with aws-actions/configure-aws-
  credentials and permissions: id-token: write. No long-lived access keys stored in the repository's secrets.

## Keeping the bill under control

- **Tags on everything** (team, env, pipeline) via the provider's default_tags, activated as cost allocation tags,
  so Cost Explorer can break the bill down.
- **AWS Budgets** per team or env with alerts on forecasted spend, so you hear before the month ends.
- **Athena**: workgroup cutoffs, Parquet, partition filters ("Querying the Lake").
- **S3**: lifecycle rules (raw to a colder class, expire noncurrent versions, abort incomplete multipart uploads),
  Intelligent-Tiering where access is unpredictable.
- **Compute**: explicit timeouts on Glue jobs, right-sized workers, transient EMR clusters with auto-termination and
  Spot task nodes, Redshift Serverless usage limits or pausing a provisioned cluster at night.
- **The network surprise**: jobs in a private subnet reaching S3 through a NAT gateway pay NAT data-processing
  charges on every byte; an S3 gateway endpoint in the VPC routes that traffic without it.

The habit that matters is weekly: open Cost Explorer grouped by tag, name the top three line items, and ask whether
each is still worth it.`,
    workedExample: `**Scenario.** ThaliGo's AWS bill rose 40% in October. The data platform is tagged team=data. Find the cause and stop
it recurring.

**1. Locate.** Cost Explorer, filtered to team=data, grouped by service, October against September. The increase is
in three lines: Athena, EC2-Other and S3.

**2. Athena.** Group by workgroup (Athena publishes per-workgroup metrics to CloudWatch when enabled). The growth is
in analysts-prod, where a new dashboard filters on order_ts instead of order_date and scans every partition on each
refresh. Fix the filter; set a per-query cutoff on that workgroup, which had none because it was created in the
console.

**3. EC2-Other.** That line includes NAT gateway data processing. A new Glue job running in a private subnet copies
raw files from S3 through the NAT gateway. Add an S3 gateway endpoint to the VPC; the traffic stops going through NAT.

**4. S3.** Versioning is on for the raw bucket, which an hourly job overwrites, and no rule expires old versions. Add
NoncurrentVersionExpiration (the moto lab's rule kept 30 days) and AbortIncompleteMultipartUpload.

**5. Stop it recurring.** Import the console-made workgroup into Terraform with its cutoff; add the lifecycle rules
and the VPC endpoint to the lake module; add a CI check that fails any aws_athena_workgroup without
bytes_scanned_cutoff_per_query; set an AWS Budget on team=data with a forecast alert at 80%. Then write the three
causes into the team's runbook, because the next platform engineer will make the same mistakes otherwise.`,
    mcqs: [
      mcq('ThaliGo\'s CI parses main.tf with python-hcl2 and reads the Athena workgroup\'s cutoff as the text "${var.athena_cutoff_bytes}". How should the check see the real value?', [
        ['Run terraform plan -out and read the values from terraform show -json', true],
        ['Pass the file through python-hcl2 a second time to evaluate expressions', false],
        ['Read the value from the Terraform state file of the dev environment instead', false],
        ['Replace every variable in main.tf with a literal so parsing finds numbers', false],
      ], 'A parser sees expressions; the plan resolves variables and tfvars, and its JSON form shows the values that would be applied. Parsing again changes nothing, dev state describes dev rather than the change being reviewed, and hard-coding values defeats per-environment variables.'),
      mcq('A data team\'s GitHub Actions job needs to deploy to AWS. What is the recommended way to give it credentials?', [
        ['Exchange the workflow\'s OIDC token for a role, with id-token: write', true],
        ['Store an IAM user\'s access key and secret key as repository secrets', false],
        ['Put the access keys in the dbt profiles.yml so the job can read them', false],
        ['Make the target S3 bucket writable by anyone during the deploy step', false],
      ], 'OIDC gives the job short-lived role credentials and nothing long-lived to leak or rotate. Stored access keys work but are exactly the long-lived secret to avoid, keys in config files leak with the repository, and a public bucket is a breach waiting to happen.'),
      mcq('A dbt pull request changes one staging model. Which CI command builds and tests only what that change can affect?', [
        ['dbt build --select state:modified+ --defer --state prod-state', true],
        ['dbt build --full-refresh across every model in the whole project', false],
        ['dbt run --select staging, then dbt test with no selection at all', false],
        ['dbt compile, since compiling every model proves that all of them work', false],
      ], 'state:modified+ selects changed models and their descendants by comparing with production\'s manifest, and --defer reads unchanged parents from prod. A full refresh rebuilds everything slowly, running a folder misses children elsewhere, and compiling does not run or test anything.'),
    ],
    checkpoint: [
      mcq('Why should Terraform state for ThaliGo\'s data platform be kept in an encrypted, access-restricted, versioned S3 bucket with locking?', [
        ['State can hold secrets, must survive mistakes, and two applies must not run at once', true],
        ['Terraform refuses to plan unless its state bucket is in the same account as the lake', false],
        ['Keeping state locally is faster, but only remote state allows the use of modules', false],
        ['Encryption and locking are needed to speed up plan on platforms with many resources', false],
      ], 'State may contain secret values, versioning recovers a corrupted state, and locking stops concurrent applies. Terraform does not require the same account, modules work with local state, and encryption and locking are about safety, not speed.'),
      mcq('A Glue job in a private subnet copies 2 TB a month from S3. Its "EC2-Other" cost jumps. What is the likely cause and fix?', [
        ['NAT gateway data processing; add an S3 gateway endpoint to the VPC', true],
        ['S3 request charges; switch the bucket to the Glacier storage class', false],
        ['Glue DPU-hours; move the job from Glue onto an Athena CTAS query', false],
        ['EBS volumes; delete the job\'s temporary files after every run ends', false],
      ], 'Traffic from a private subnet to S3 via NAT is billed per GB processed under EC2-Other; a gateway endpoint routes it privately without NAT. Glacier makes reads costlier, DPU-hours appear under Glue, and Glue jobs do not leave EBS volumes behind.'),
      mcq('ThaliGo wants to hear about runaway spend before the month ends, not when the invoice arrives. What should it set up?', [
        ['An AWS Budget on its tags with an alert on forecasted spend', true],
        ['A monthly export of the invoice, reviewed at the next meeting', false],
        ['A Cost Explorer report opened only after the bill has arrived', false],
        ['An S3 lifecycle rule that deletes data when spending is high', false],
      ], 'Budgets can alert when forecasted spend for the period crosses a threshold, so the team acts mid-month. Invoice reviews and after-the-fact reports are too late, and lifecycle rules act on object age, not on spend.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_DEBUGGING',
    notes: `Six things that go wrong on ThaliGo's cloud data platform. For each: the symptom, the cause, and the one change that
fixes it. Cases 2, 3 and 5 were reproduced on a laptop (moto, DuckDB 2.0, PyYAML); the others are written from the AWS,
Spark and Glue documentation, and their error text is paraphrased. Read the error and the metadata before you change
code: on a cloud platform most failures are permissions, metadata or configuration, not logic.

## 1. The Glue job that cannot read its own lake

**Symptom.** A new Glue job fails on its first read of s3://thaligo-lake-prod-raw/orders/ with an S3 403 AccessDenied.
The role "has the Glue policy", and the crawler on an aws-glue-scripts bucket works fine.

**Cause.** The role has only the AWS managed policy AWSGlueServiceRole. Its object permissions cover buckets and paths
named aws-glue-* (moto's copy of the policy lists exactly arn:aws:s3:::aws-glue-*/* and arn:aws:s3:::*/*aws-glue-*/*).
ThaliGo's lake buckets are not named that way. If the bucket uses SSE-KMS with a customer key, the role also needs
kms:Decrypt on that key, or the same 403 appears.

**Fix.** An inline or customer-managed policy: s3:ListBucket on the bucket (conditioned on the prefix), GetObject on
raw/orders/*, Put/DeleteObject on curated/orders/*, kms:Decrypt and GenerateDataKey on the lake key. Never fix it with
s3:* on *: that is how a job ends up able to delete every bucket in the account.

## 2. Yesterday's data is not there, and nothing failed

**Symptom.** The hourly job succeeded and the files for 6 October are in S3, but Athena returns zero rows for that day.

**Cause.** The job wrote the folder and never told the catalogue. In the moto lab the table had files in three
folders and the catalogue said "partitions before adding 0"; only batch_create_partition made them queryable.

**Fix.** The writing job registers the partition (ALTER TABLE ... ADD PARTITION, or glue.batch_create_partition and
ignore AlreadyExistsException on reruns), or the table uses partition projection. MSCK REPAIR TABLE works as a stopgap
but slows down as partitions grow. Add a check: rows for yesterday > 0, or alert.

## 3. "Since September" returns only September

**Symptom.** A settlements query with WHERE year = '2026' AND month >= '9' returns September only. October to December
have data.

**Cause.** The partition key is a string and the folders are month=1 ... month=12. As text, '10' < '9'. The lab
reproduced it: string month >= '9' returned [('9',)]; typed as an integer, month >= 9 returned 9, 10, 11 and 12.

**Fix.** Zero-pad partition values (month=09) or use one date key in yyyy-MM-dd form; declare the key type correctly
in the catalogue. Until then, compare with CAST(month AS integer) >= 9 — correct, though some engines then cannot
prune partitions on it.

## 4. A one-day rerun deleted the whole month

**Symptom.** An engineer reran the Glue job for 5 October. Afterwards the curated orders table has only 5 October; the
other 30 days' folders are gone.

**Cause.** The job writes with mode("overwrite").partitionBy("order_date"). In Spark's default static mode, an
overwrite replaces every partition under the path, not just the ones in the DataFrame. The scheduled hourly runs
always contained all affected days, so nobody noticed until a single-day rerun.

**Fix.** Set spark.sql.sources.partitionOverwriteMode to dynamic before the write, so only partitions present in the
output are replaced (the lesson's Glue script does this), or write to a table format and use a predicate overwrite or
MERGE ("Open Table Formats"). Turn on bucket versioning on curated; the lab's bucket showed old versions and delete
markers kept after a delete, which is what lets you recover.

## 5. CI says the workflow has no trigger; the build uses Python 3.1

**Symptom.** A home-made CI check that every workflow runs on pull_request fails: wf["on"] raises KeyError. Separately,
setup-python fails because version 3.1 cannot be found, though the file says 3.10.

**Cause.** Both are YAML 1.1 rules in PyYAML (and in the YAML GitHub reads for values). Parsing the real file:

    top-level keys ['name', True, 'permissions', 'jobs']
    {'python-version': 3.1}

The bare key on is read as the boolean True; 3.10 is a float, which is 3.1.

**Fix.** In the checker, read wf.get("on", wf.get(True)). In workflow files, quote versions: python-version: "3.10".
For indentation mistakes PyYAML's error names the line: "expected <block end>, but found '<block sequence start>' ...
line 5, column 6".

## 6. The crawler that made 31 tables

**Symptom.** After a nightly crawler run over raw/orders/, the catalogue has tables orders, ingest_date_2026_10_02,
ingest_date_2026_10_03 and so on, and the curated job's Athena query fails with HIVE_PARTITION_SCHEMA_MISMATCH on
older days.

**Cause.** On 2 October the app team changed amount from a number to a string. Files under the prefix no longer
looked like one dataset, so the crawler grouped them differently (per the Glue docs it creates separate tables when
schemas are not similar enough). Each partition also stores its own schema; when the table's column type changed but
older partitions kept the old one, Athena reported the mismatch.

**Fix.** Do not crawl tables you designed: define curated tables in Terraform or DDL, with SchemaChangePolicy LOG on any
crawler kept for discovery. Handle the type change in the parse step with a rejects table ("Data Lakes and Object
Storage" showed this). For the mismatch, make every partition's schema match the table (recreate the partitions, or
use partition projection, where partitions inherit the table schema).`,
    mcqs: [
      mcq('A Glue job\'s role has AWSGlueServiceRole and a policy granting s3:GetObject on the lake. Reads still fail with 403 on an SSE-KMS bucket. What is missing?', [
        ['kms:Decrypt on the bucket\'s customer-managed KMS key', true],
        ['s3:PutObject on the raw prefix that the job reads from', false],
        ['A public access block turned off for the lake bucket', false],
        ['A Glue connection to S3 created in the job definition', false],
      ], 'Reading an object encrypted with a customer KMS key needs decrypt permission on the key as well as GetObject. A reader needs no PutObject, turning off public access protections is unrelated and dangerous, and S3 needs no Glue connection.'),
      mcq('An engineer reran ThaliGo\'s Glue job for one day and every other date folder in curated/orders vanished. What setting would have prevented it?', [
        ['spark.sql.sources.partitionOverwriteMode set to dynamic', true],
        ['A job bookmark, so that processed files are not read again', false],
        ['A larger number of G.1X workers assigned to the job run', false],
        ['SchemaChangePolicy set to LOG on the curated crawler', false],
      ], 'In static mode an overwrite with partitionBy replaces everything under the path; dynamic mode replaces only partitions present in the output. Bookmarks govern which input is read, worker count affects speed, and crawler policy is about catalogue updates.'),
      mcq('A CI script reading a GitHub Actions workflow with PyYAML gets KeyError for wf["on"]. Why?', [
        ['YAML 1.1 parses the bare key on as the boolean True', true],
        ['GitHub workflows store their triggers under "trigger"', false],
        ['PyYAML drops any keys that are shorter than three letters', false],
        ['The on block is valid only when it is written in JSON form', false],
      ], 'The lab printed the top-level keys as name, True, permissions, jobs: on became True. Workflows do use on, PyYAML keeps short keys, and the YAML form is the normal one.'),
      mcq('After a crawler ran over a prefix where one day\'s files had a different schema, Athena fails with HIVE_PARTITION_SCHEMA_MISMATCH. What is the lasting fix?', [
        ['Define the curated table in code and keep crawlers off it', true],
        ['Run the crawler more often, so the schema catches up sooner', false],
        ['Delete the Athena query results bucket and run the query again', false],
        ['Switch the workgroup to a different engine version for that table', false],
      ], 'A designed table should not have its schema rewritten by inference; partitions then share the declared schema. Running the crawler more often repeats the problem, the results bucket holds outputs not metadata, and the engine version does not fix mismatched partition schemas.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_PRACTICE',
    notes: `Eight exercises, easiest first. Write each answer before reading ours. Exercises 3 and 8 use the column sizes and
billing rules from "Querying the Lake"; the arithmetic was checked in Python.

## 1. An S3 key (easy)

ThaliGo's curated rider-payout table for 7 October 2026, part 3, in prod. Write the full S3 URI.

**Answer.** s3://thaligo-lake-prod-curated/payouts/payout_date=2026-10-07/part-0003.parquet — bucket by zone and env,
dataset, a key=value partition with a zero-padded date, Parquet.

## 2. A least-privilege policy (easy)

A Glue job reads raw/orders/ and writes curated/orders/. Raw and curated are different buckets. List the IAM
statements its role needs for S3, and the trust policy principal.

**Answer.** Trust: Service glue.amazonaws.com, Action sts:AssumeRole. Permissions: s3:ListBucket on
arn:aws:s3:::thaligo-lake-prod-raw with condition s3:prefix orders/*; s3:GetObject on .../raw/orders/*;
s3:ListBucket on the curated bucket (prefix orders/*); s3:PutObject and s3:DeleteObject on .../curated/orders/*; plus
kms:Decrypt and kms:GenerateDataKey on the lake key if it is SSE-KMS. Nothing on *.

## 3. Bytes for a query (easy)

October's orders as Parquet, by column: customer_note 54.0 MB, order_ts 10.9, customer_id 9.0, order_id 7.3,
amount_paise 6.7, restaurant_id 4.1, delivery_minutes 1.1, city 0.6, items 0.6, payment_mode 0.4, status 0.3. Partitioned
by order_date (31 days, even volume). Estimate the bytes read by: (a) SELECT payment_mode, sum(amount_paise) WHERE
status = 'DELIVERED' GROUP BY payment_mode over the month; (b) the same for one day; (c) SELECT * for one day.

**Answer.** (a) payment_mode + amount_paise + status = 7.4 MB. (b) about 7.4 / 31 = 0.24 MB, but billed as Athena's 10 MB
minimum. (c) 95 / 31 ≈ 3.1 MB, which is what the lab measured for SELECT * on one day.

## 4. Partition projection (medium)

The table is partitioned by city (eight known cities) and order_date. Write the projection properties.

**Answer.**

    'projection.enabled' = 'true',
    'projection.city.type' = 'enum',
    'projection.city.values' = 'Ahmedabad,Bengaluru,Chennai,Delhi,Hyderabad,Kolkata,Mumbai,Pune',
    'projection.order_date.type' = 'date',
    'projection.order_date.format' = 'yyyy-MM-dd',
    'projection.order_date.range' = '2024-01-01,NOW',
    'storage.location.template' = 's3://.../orders/city=\${city}/order_date=\${order_date}/'

A query must filter both keys or Athena projects every combination; add a city whose folder is missing and Athena
reads nothing for it, without error.

## 5. A year through CTAS (medium)

Build daily_city for all of 2026, partitioned by order_date, in Athena. How many statements, and which?

**Answer.** 365 daily partitions at 100 per statement: four. A CTAS for 1 January to 10 April (100 days), then INSERT
INTO for 11 April to 19 July, 20 July to 27 October, and 28 October to 31 December (100, 100 and 65 days).

## 6. Map it to Azure (medium)

Give the Azure service for: S3 curated bucket; IAM role of a Glue job; Glue Data Catalog for Spark users; Athena;
Secrets Manager; Kinesis.

**Answer.** ADLS Gen2 container (hierarchical namespace on); a managed identity with an RBAC role such as Storage Blob
Data Contributor; Unity Catalog in Databricks (or the Fabric lakehouse); Synapse serverless SQL or the Fabric SQL
analytics endpoint; Key Vault; Event Hubs.

## 7. Review the Terraform (medium)

A pull request adds an aws_athena_workgroup for the finance team, with a result_configuration and nothing else in
configuration, and uses var.finance_budget in a budget resource with no variable block. What does review say, and what
does CI catch?

**Answer.** No bytes_scanned_cutoff_per_query and no enforce_workgroup_configuration: finance can scan the whole lake
per query and override the results location. finance_budget is used but undeclared: terraform validate fails, as the
lab's parse found for monthly_budget. A policy check should fail any workgroup without a cutoff.

## 8. The dashboard bill (harder)

A dashboard sends 200 Athena queries a day, each scanning about 2 MB of a partitioned Parquet table. The team says
"that is only 400 MB a day". What is billed, and does a summary table that cuts each query to 50 kB help the bill?

**Answer.** Each query is billed at the 10 MB minimum: 200 × 10 MB = 2 GB a day, five times what they think. Cutting
to 50 kB changes nothing billed (still 10 MB each). What helps is fewer queries: refresh as often as the data changes,
or let the BI tool cache. The summary table becomes worthwhile when queries scan well above 10 MB.`,
    mcqs: [
      mcq('A dashboard\'s Athena queries each scan about 2 MB. What does Athena bill for each one, per its documented model?', [
        ['10 MB, the minimum per query', true],
        ['2 MB, rounded up to the next MB', false],
        ['Nothing, under 10 MB is not billed', false],
        ['1 GB, the workgroup\'s cutoff size', false],
      ], 'Athena rounds up to the MB with a 10 MB minimum per query, so small queries are billed as 10 MB. Rounding to 2 MB ignores the minimum, small queries are not free, and a cutoff is a limit, not a billed amount.'),
      mcq('ThaliGo must load 365 daily partitions into a new Athena table with CTAS. What is the least number of statements that works?', [
        ['Four: one CTAS and three INSERT INTO', true],
        ['One CTAS covering the whole year', false],
        ['365, one statement for each day', false],
        ['Two: one CTAS and one INSERT INTO', false],
      ], 'Each CTAS or INSERT INTO may write at most 100 partitions, so 365 needs 100 + 100 + 100 + 65. One statement exceeds the limit, one per day works but is wasteful, and two statements reach only 200 partitions.'),
      mcq('A table uses partition projection with city as an enum of eight values. Orders start arriving for Indore. What happens to Indore\'s rows in Athena?', [
        ['They are invisible until Indore is added to the enum values', true],
        ['They appear at once, because projection lists the S3 folders', false],
        ['The query fails with an error naming the unknown partition', false],
        ['They are read under the last city listed in the enum values', false],
      ], 'With projection Athena generates partitions only from the configured values, so an unlisted city is simply never read, without error. Projection does not list S3, it raises no error for data it does not know, and rows are never reassigned to another city.'),
      mcq('Which statements does a Glue job that only reads raw/orders/ need on the raw bucket?', [
        ['s3:ListBucket on the bucket for orders/*, and s3:GetObject on orders/*', true],
        ['s3:* on the raw bucket, because a Glue job needs full control of it', false],
        ['s3:GetObject on every bucket in the account, since its path may change', false],
        ['s3:PutObject on orders/*, so it can write its bookmarks beside the data', false],
      ], 'Listing is a bucket-level action limited by a prefix condition, and reading needs GetObject on the objects. Full control and account-wide access break least privilege, and bookmarks are kept by Glue, not written into the raw prefix.'),
      mcq('On Azure, what plays the part of the IAM role a Glue job runs as?', [
        ['A managed identity with an Azure RBAC role', true],
        ['A storage account access key in Key Vault', false],
        ['A shared access signature in the pipeline', false],
        ['An Entra ID user with a long-lived password', false],
      ], 'A managed identity is an identity Azure gives a resource, with no secret to store, granted RBAC roles at the right scope. Access keys give full account access, SAS tokens are secrets that expire and leak, and a user with a password is a person\'s account, not a workload identity.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_INTERVIEW_QUESTION',
    notes: `Asked in data engineer interviews at GCCs, product companies and IT services firms in Hyderabad, Bengaluru and Pune,
usually in the system-design round or as "walk me through your project's architecture". Say each answer aloud in about
two minutes. Interviewers want the flow of data, the identity at each step and what drives cost — not a list of
logos.

## Q1. "Design a data lake on AWS for our order data. Walk me through it."

**Model answer.** "Orders are in an RDS PostgreSQL database. I would use DMS to capture changes into an S3 raw bucket,
partitioned by ingest date, kept as received. An hourly Glue job — Spark — reads new raw files, deduplicates on
order_id, types the columns and writes Parquet into a curated bucket partitioned by order date, registering new
partitions in the Glue Data Catalog. Analysts query curated tables with Athena in a workgroup that has a per-query
scan limit; for dashboards with steady concurrency, dbt builds marts in Redshift Serverless. Every component runs as
an IAM role with access only to its prefixes, buckets are encrypted with KMS and block public access, and Lake
Formation hides PII columns like the customer's phone from analysts. Everything is in Terraform, with dev and prod
in separate accounts."

**Follow-up.** "How do you handle late-arriving updates to an order?" — "Raw is append-only, so nothing is lost. In
curated I would use a table format, Iceberg or Delta, and MERGE on order_id, updating only status columns when the
event is newer, as in 'The Lakehouse and Medallion Layers'. Athena supports MERGE on Iceberg tables."

## Q2. "Our Athena bill tripled. What do you check?"

**Model answer.** "First where: Athena's per-workgroup metrics and the query history, sorted by data scanned. Usually
a handful of queries are most of it. Then the usual causes: CSV or JSON instead of Parquet; filters on a timestamp
column instead of the partition key, so every partition is read; SELECT star on wide tables; dashboards refreshing far
more often than the data changes. Fixes are Parquet, partition filters, a summary table built with CTAS, and a
per-query data scanned cutoff enforced on each workgroup so mistakes fail instead of billing. I would also remember the
10 MB minimum: thousands of tiny queries add up."

**Follow-up.** "Would partition projection reduce the bill?" — "Not directly: it speeds up planning on tables with
many partitions and removes partition maintenance. Bytes scanned depend on the filters and the format."

## Q3. "Glue, EMR or Databricks — how would you choose?"

**Model answer.** "All three run Spark. Glue is serverless: no clusters, billed per DPU-hour, good for scheduled
transforms of moderate size by a small team, with limited tuning. EMR gives full control of Spark versions, instance
types and Spot, with EC2, Serverless or EKS deployment; better for large or long jobs where cost tuning matters.
Databricks adds a managed workspace with notebooks, Delta, Unity Catalog and Jobs, and runs on AWS and Azure; it suits
teams doing a lot of Spark and ML who want one platform. I would decide on team skills, how much tuning the workload
needs, and whether the company is multi-cloud."

**Follow-up.** "We are an Azure shop. Does your AWS experience help?" — "Yes: the concepts map one to one. ADLS Gen2
for S3, managed identities for IAM roles, Data Factory for ingestion, Synapse serverless or Fabric's SQL endpoint for
Athena, Databricks or Fabric for Spark. What changes is the identity model, Entra ID and RBAC, which I would learn
first."

## Q4. "How do you deploy changes to a data platform safely?"

**Model answer.** "Infrastructure in Terraform with remote, locked state, one state per environment. Every pull request
runs lint and unit tests, a dbt build of only modified models and their children in a temporary schema using
state:modified+ with defer, and a Terraform plan posted on the PR. Merges apply to dev, then prod after approval.
CI authenticates to AWS with OIDC, not stored keys; jobs read secrets from Secrets Manager at run time. Nothing is
changed by hand in prod; drift shows up in the next plan."

**Follow-up.** "A bad dbt model reached prod and broke a dashboard. What now?" — "Revert the merge so the next run
builds the previous version, rerun the affected models, and tell the dashboard's owners. Then add the missing test to
CI so the same failure is caught on a pull request next time."`,
    mcqs: [
      mcq('An interviewer asks whether partition projection cuts an Athena bill. Which answer is most accurate?', [
        ['Not directly; it speeds planning, and bytes depend on filters and format', true],
        ['Yes, because projected partitions are scanned without any charge at all', false],
        ['Yes, because projection compresses the data stored in each partition', false],
        ['No, because projection forces Athena to scan every partition each time', false],
      ], 'Projection replaces catalogue partition lookups, which helps planning on large tables; what is scanned still follows the WHERE clause and the file format. It does not make scans free, does not compress data, and does not force full scans.'),
      mcq('In a lake design answer, which detail most shows an interviewer you have run a platform, not just read about it?', [
        ['Naming the IAM role and the S3 prefixes each component may access', true],
        ['Listing as many AWS service names as possible in the first minute', false],
        ['Saying that the cloud scales automatically, so design does not matter', false],
        ['Recommending Redshift for every workload, since it is the warehouse', false],
      ], 'Identity and scope at each step is what a real platform review asks for. A list of services without flow says little, scaling does not replace design, and one engine for every workload ignores cost and fit.'),
      mcq('Asked how your AWS skills transfer to an Azure team, which mapping is right?', [
        ['Managed identities for IAM roles, ADLS Gen2 for S3', true],
        ['Event Hubs for Athena, Key Vault for the Glue catalog', false],
        ['Data Factory for Redshift, Fabric capacity for IAM', false],
      ], 'A managed identity is Azure\'s workload identity like an IAM role, and ADLS Gen2 is the lake storage like S3. Event Hubs is streaming and Key Vault holds secrets; Data Factory moves data and Fabric capacity is compute billing, not identity.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_CLOUD_DATA_CHECKPOINT',
    notes: `Ten questions across the topic: the AWS data stack, the Glue catalogue and Athena, the Azure data stack, and running a
platform with Terraform, CI/CD and cost controls. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      ck('CLOUD_STORAGE', 'Why does ThaliGo give its Glue job an IAM role rather than putting an access key in the job script?', [
        ['A role gives short-lived credentials scoped by policy, with no secret in code to leak', true],
        ['Access keys do not work with Glue at all, so a role is the only option that will run', false],
        ['A role makes the job faster, because Glue caches the role\'s credentials on workers', false],
        ['Access keys expire every hour, so jobs that use them fail when they run for longer', false],
      ], 'A role is assumed for temporary credentials limited by its policies, so nothing secret sits in the script. Keys could technically be used, roles do not speed jobs up, and long-lived access keys do not expire hourly, which is exactly why they are dangerous.'),
      mcq('Which engine fits ad-hoc SQL by analysts directly over ThaliGo\'s Parquet files in S3, with no servers to manage?', [
        ['Athena, reading tables from the Glue Data Catalog', true],
        ['EMR on EC2, with a cluster kept running all day', false],
        ['DMS, replicating the files into a database first', false],
        ['Lake Formation, which runs the queries it governs', false],
      ], 'Athena is serverless SQL over S3 through the catalogue. A long-running EMR cluster is servers to manage, DMS replicates databases rather than querying files, and Lake Formation enforces permissions but does not execute queries.'),
      mcq('A query filters WHERE order_date BETWEEN \'2026-10-01\' AND \'2026-10-07\' on a table partitioned by order_date with 31 daily partitions. What does the engine read?', [
        ['The seven matching partitions only, and only the columns the query needs', true],
        ['All 31 partitions, then it discards the rows outside the week afterwards', false],
        ['The seven partitions in full, every column, because partitions are units', false],
        ['Only the first partition, since the BETWEEN range starts on that date', false],
      ], 'Partition pruning removes non-matching folders before reading, and Parquet limits the read to referenced columns; the lab opened 7 of 31 files. Reading everything is what happens without a partition filter, partitions are not read whole in a columnar format, and BETWEEN covers the full range.'),
      mcq('New day folders appear in S3 every night, but Athena returns nothing for them unless someone runs MSCK REPAIR TABLE. What is the cleanest permanent fix?', [
        ['Have the writing job add each partition, or use partition projection', true],
        ['Run MSCK REPAIR TABLE before every analyst query on the table', false],
        ['Write all days into one folder so there are no partitions to add', false],
        ['Schedule a crawler every five minutes to keep partitions current', false],
      ], 'Registering the partition as part of the write, or computing partitions with projection, removes the gap. Repairing before every query is slow and fragile, dropping partitions loses pruning, and frequent crawlers cost money and can change schemas.'),
      mcq('Which statement about Athena billing on the per-query model is correct?', [
        ['It bills data scanned, with a 10 MB minimum per query', true],
        ['It bills per row returned to the client, with no minimum per query', false],
        ['It bills per hour that the workgroup stays enabled', false],
        ['It bills the full table size for any query that runs', false],
      ], 'Per the docs, Athena charges for bytes scanned, rounded up per MB with a 10 MB minimum. Rows returned do not matter, workgroups have no hourly charge, and partition and column pruning mean queries rarely scan the full table.'),
      mcq('ThaliGo\'s sister brand on Azure wants Spark, Delta tables and fine-grained grants, on a platform that also runs on AWS. Which fits?', [
        ['Azure Databricks with Unity Catalog', true],
        ['Azure Data Factory copy activities', false],
        ['A Synapse dedicated SQL pool on its own, sized in DWUs', false],
        ['Event Hubs with a Kafka endpoint', false],
      ], 'Databricks provides Spark and Delta, Unity Catalog provides grants, and the same platform runs on AWS. Data Factory moves data, a dedicated SQL pool is a SQL warehouse without Spark, and Event Hubs is streaming ingestion.'),
      mcq('In ADLS Gen2, why does a Spark job\'s commit by folder rename work better than it does on plain S3?', [
        ['With the hierarchical namespace a rename is one atomic metadata change', true],
        ['ADLS Gen2 copies folders faster than S3 because it uses larger blocks', false],
        ['ADLS Gen2 stores Parquet in a columnar layout that renames can skip', false],
        ['Renames on ADLS Gen2 are free, while S3 bills each renamed object', false],
      ], 'Real directories make a rename atomic and quick, whereas S3 must copy and delete every object. Block size and file format are unrelated, and the difference is in atomicity and work done, not in a per-rename charge.'),
      ck('CLOUD_STORAGE', 'A raw bucket has versioning on and an hourly job overwrites its files. Storage grows every month though the data does not. What fixes it?', [
        ['A lifecycle rule that expires noncurrent versions after a set number of days', true],
        ['Turning on a public access block so that old versions stop being kept', false],
        ['Moving the bucket to another region with cheaper storage for old versions', false],
        ['Turning off encryption so that each version takes less space to store', false],
      ], 'Each overwrite keeps the previous object as a noncurrent version; NoncurrentVersionExpiration removes them after the window you choose. Public access settings, region and encryption do not affect version retention.'),
      ck('CLOUD_STORAGE', 'Which practice keeps dev and prod data platforms from drifting apart?', [
        ['The same Terraform code with per-environment variables and separate state', true],
        ['Building prod in the console, then copying its settings into dev by hand', false],
        ['One shared state file for both environments, so they are always identical', false],
        ['Applying changes to prod first, then fixing dev when someone notices issues', false],
      ], 'Identical code with different variables and separate state keeps environments alike yet independent. Hand copying drifts, one shared state couples dev and prod so one mistake hits both, and prod-first reverses the safety order.'),
      ck('CLOUD_STORAGE', 'An Athena workgroup for analysts has a results location but no other settings. What should be added so a bad query cannot scan the whole lake?', [
        ['A per-query data scanned cutoff, enforced over client-side settings', true],
        ['A larger results bucket, so long outputs can finish writing in time', false],
        ['A second workgroup for the same analysts, with identical settings', false],
        ['A rule that deletes query results after one day in the bucket', false],
      ], 'BytesScannedCutoffPerQuery with EnforceWorkGroupConfiguration cancels any query that scans past the limit. Bucket size, a duplicate workgroup and result expiry do nothing to limit what a query scans.'),
    ],
  },
];
