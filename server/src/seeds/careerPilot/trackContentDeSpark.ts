/**
 * Career-track content: Apache Spark (DE_SPARK), Data Engineer, batch DE2.
 *
 * How Spark turns DataFrame code into distributed work, the PySpark DataFrame API and Spark SQL, partitions,
 * shuffles and join strategies, skew, caching and small files, windows, UDFs and nested data, and shipping a
 * tested Spark job to EMR, Databricks, Synapse or Fabric. It builds on the Data Analytics track's pandas lessons
 * ("groupby, agg and pivot_table", "Merging, Concatenating and Reshaping") and SQL windows ("Window Functions: OVER
 * and PARTITION BY", "Ranking: ROW_NUMBER, RANK and DENSE_RANK", "Running Totals, Moving Averages, LAG and LEAD"),
 * and on DE1's "Data Formats: CSV, JSON, Parquet and Avro", "Idempotent, Restartable Loads" and "Reading Query
 * Plans and Fixing Slow SQL"; those are referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: RideKaro, a Bengaluru ride-hailing app, with 3 million synthetic
 * rides for October 2026 (73 MB of Parquet), 1.95 million payment attempts, 300 zones and 60,001 drivers. Every
 * plan, row count, error message and timing quoted was produced by running PySpark 3.5.9 in local mode (local[4])
 * on one Windows laptop that was also busy with other work, so timings are medians of five interleaved runs, only
 * good for comparing with each other. Spark on Windows cannot write files without Hadoop's winutils, so outputs
 * were written with pandas/pyarrow/deltalake instead, and the notes say so. spark-submit on a cluster, EMR,
 * Databricks, Synapse and Fabric are written from their documentation and NOT run.
 *
 * Skills: BATCH_STREAM_PROCESSING by default; SPARK_IN_PRODUCTION is DATA_PIPELINES. Checkpoint questions
 * elsewhere that are plainly about shipping, testing or scheduling a job use ck('DATA_PIPELINES', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_SPARK_BUNDLES: PilotBundle[] = [
  /* ── SPARK_MODEL ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_SPARK_MODEL',
    notes: `pandas ("groupby, agg and pivot_table") works on one machine, in that machine's memory. When RideKaro's ride events
pass a few hundred million rows a month, one machine is no longer enough, and the work has to be split across
many. Spark is the engine most companies use for that split. You still write something that looks like pandas or
SQL; Spark decides how to cut it into pieces and where to run them.

## The cluster model

    driver       your program: builds the plan, splits it into tasks, collects results
    executors    worker processes (JVMs) on other machines; each runs tasks on its cores
    cluster mgr  hands out executors: YARN (EMR), Kubernetes, Databricks, or Spark's own
    local mode   driver and executors in one JVM on your laptop; local[4] = 4 task slots

Three words carry the rest of the topic:

- **Partition** — a slice of the data. One task processes one partition.
- **Stage** — tasks that can run without data moving between machines. A **shuffle** (data regrouped by key
  across the cluster) ends one stage and starts the next.
- **Job** — what one action triggers: one or more stages.

PySpark is a Python client for a JVM engine. Your Python builds a plan; the plan runs in the JVM. Built-in
functions never leave the JVM, which is why they are fast. A Python UDF does leave it (SPARK_UDFS_WINDOWS).

## Running it locally

pip install pyspark gives you Spark (3.5.9 here) but not Java: install a JDK the release supports (Spark 3.5 lists
Java 8, 11 and 17; this lab used JDK 19, which worked but is not on that list) and set JAVA_HOME. Two Windows
traps from this lab: Spark's launcher scripts need C:\\Windows\\System32 on PATH (without it, the session hung
with "The filename, directory name, or volume label syntax is incorrect"), and writing files fails without
Hadoop's winutils: "HADOOP_HOME and hadoop.home.dir are unset". Reading works. For writes, use WSL2 or a Docker
image ("Containers" from the years), or hand results to pandas/pyarrow, as this topic does.

    from pyspark.sql import SparkSession, functions as F
    spark = (SparkSession.builder.master("local[4]").appName("ridekaro")
             .config("spark.sql.session.timeZone", "UTC").getOrCreate())
    rides = spark.read.parquet("data/rides.parquet")
    rides.rdd.getNumPartitions()          # 4

## Transformations are lazy; actions run

    t = time.perf_counter()
    daily = (rides.filter(F.col("status") == "completed")
             .withColumn("ride_date", F.to_date(F.from_utc_timestamp("requested_at", "Asia/Kolkata")))
             .groupBy("city", "ride_date")
             .agg(F.count("*").alias("rides"), F.sum("fare_paise").alias("gmv_paise")))
    # 0.34 s — nothing was read
    daily.count()                         # 124 rows, 4.47 s — now it runs

filter, withColumn, select, groupBy, join are **transformations**: they return a new DataFrame describing work.
count, show, collect, toPandas and write are **actions**: they run it. Laziness lets Spark see the whole pipeline
before running any of it, so it can drop columns you never use and push filters into the file read.

One subtlety. Spark checks names and types eagerly: rides.select("fare_rupees") failed at once with
[UNRESOLVED_COLUMN.WITH_SUGGESTION] ... Did you mean one of the following? [\`fare_paise\`, ...]. Data errors wait
for an action. A Python function dividing fare by distance was defined without complaint; four rides have
distance 0, and the ZeroDivisionError appeared only when an aggregate ran, as a PythonException inside a task.
In production that means the failure surfaces in the step that finally reads the data, not the line that caused it.

## Reading the plan

daily.explain() printed (trimmed; read from the bottom up):

    AdaptiveSparkPlan isFinalPlan=false
    +- HashAggregate(keys=[city, ride_date], functions=[count(1), sum(fare_paise)])
       +- Exchange hashpartitioning(city, ride_date, 200)
          +- HashAggregate(keys=[city, ride_date], functions=[partial_count(1), partial_sum(fare_paise)])
             +- Project [city, fare_paise, cast(from_utc_timestamp(requested_at, Asia/Kolkata) as date)]
                +- Filter (isnotnull(status) AND (status = completed))
                   +- FileScan parquet [city,requested_at,status,fare_paise]
                      PushedFilters: [IsNotNull(status), EqualTo(status,completed)]

- **Column pruning.** The file has nine columns; ReadSchema lists four.
- **Predicate pushdown.** PushedFilters hands status = 'completed' to the Parquet reader, which can skip row
  groups using min/max statistics ("Partitioning, Clustering and Indexes").
- **Two-phase aggregation.** Each task first sums its own partition (partial_sum), so only one row per city and
  date per task crosses the network; the second HashAggregate finishes the job.
- **Exchange = shuffle = stage boundary.** hashpartitioning(..., 200) sends every key to one of 200 partitions.
- **AdaptiveSparkPlan isFinalPlan=false.** Adaptive Query Execution (AQE, on by default since 3.2) may still
  change this plan using real sizes measured at run time.

explain(True) adds the parsed, analysed and optimised logical plans — the optimiser (Catalyst) moving the filter
and dropping the five unused columns is visible between them. The same query written in Spark SQL against a
temporary view produced the same physical plan: the DataFrame API and SQL are two front ends to one engine.

## Jobs, stages and tasks, observed

With the status tracker, the count above ran as: a stage of **4 tasks** (one per input partition: scan, filter,
partial aggregate, write shuffle files), then a stage of **1 task** (read the shuffle, finish the aggregate). The
plan said 200 shuffle partitions; AQE measured the shuffle — a few kilobytes — and coalesced it to one. With AQE
switched off, a groupBy on city alone planned 200 reduce partitions, and 196 of them held no rows — there are
only four cities. That is the next lessons in
one line: the number of partitions decides the number of tasks, and the wrong number costs time.`,
    workedExample: `**Scenario.** A RideKaro analyst writes a notebook that builds the city-by-day GMV table and prints rides.count(),
completed.count() and daily.count() after each step "to check progress". It takes three times as long as the
same code without the prints. Explain why, and predict the work before running it.

**1. Count the actions.** Three count() calls are three actions, so three jobs. Spark keeps no results between
jobs unless told to (caching is SKEW_TUNING), so each count re-reads the Parquet file and re-runs every step
above it. The prints did not observe the pipeline; they ran it three times.

**2. Predict the stages for daily.count().** Read the plan from the bottom: FileScan, Filter, Project and the
partial HashAggregate need no data movement, so they are one stage. The Exchange is a shuffle, so the final
HashAggregate is a second stage. Tasks in stage 1 = input partitions = 4 (six 500,000-row row groups packed into
four splits: 1,000,000, 500,000, 1,000,000 and 500,000 rows). Tasks in stage 2 = 200 as planned, unless AQE
coalesces them.

**3. Check.** The status tracker reported job stages with 4 tasks, then 1 task — AQE coalesced the 200 planned
reduce partitions into one, because the shuffle held only 124 groups' partial sums. The row count was 124: four
cities times 31 days.

**4. Find the cheap check.** If the analyst wants a sanity number, one action on the final table is enough, and
an aggregate is better than collecting rows:

    daily.agg(F.sum("rides"), F.sum("gmv_paise")).show()

That returns one row and runs the pipeline once.

**5. The habit.** Before running anything slow, call explain() and count the Exchanges (shuffles) and the actions.
Every action is a full run from the source; every Exchange writes and reads shuffle files.

**Result.** The notebook drops two of its three counts and runs once. The same reasoning — actions trigger jobs,
Exchanges split stages, partitions set tasks — is how you read any slow Spark job.`,
    mcqs: [
      mcq('A PySpark notebook cell that filters, adds a column and groups 3 million rides finishes in 0.3 seconds, but the next cell, which calls show(), takes several seconds. Why?', [
        ['The first cell only built a plan; show() is the action that ran it', true],
        ['The first cell ran on all cores, while show() runs on the driver alone', false],
        ['show() re-sorts the full dataset before it prints the first 20 rows', false],
        ['Spark cached the data in the first cell and show() reloads the cache', false],
      ], 'filter, withColumn and groupBy are lazy transformations; nothing is read until an action such as show(), count() or write. show() still runs the plan on executors (with a small limit), it does not sort everything unless asked, and nothing is cached unless you call cache().'),
      mcq('In daily.explain(), what does the line "Exchange hashpartitioning(city, ride_date, 200)" tell you?', [
        ['Rows are shuffled by key into 200 partitions, ending a stage', true],
        ['The file is read with 200 tasks, one for each Parquet file', false],
        ['The aggregate is computed 200 times and then the results averaged', false],
      ], 'An Exchange redistributes rows across the cluster so equal keys meet: a shuffle, and a stage boundary. The read tasks come from input splits, not the shuffle setting, and the partial aggregate runs once per input partition before the shuffle.'),
      mcq('rides.select("fare_rupees") fails immediately with UNRESOLVED_COLUMN, but a UDF that divides by zero fails only when count() runs. Why the difference?', [
        ['Names and types are checked when the plan is built; data errors appear only when data is processed', true],
        ['select() is an action that reads the file, while withColumn() with a UDF stays lazy until count()', false],
        ['UDF errors are buffered by the driver and reported later, after the next action has completed', false],
        ['Spark validates column names on the executors first and only then the Python code in the UDFs', false],
      ], 'Analysis (resolving columns and types) is eager, so a misspelt column fails at once; evaluating expressions on rows happens in tasks during an action. select() is a transformation, the UDF error is raised inside a task, and column resolution happens on the driver.'),
    ],
    checkpoint: [
      mcq('A Spark job reads 4 input partitions, aggregates, and AQE coalesces the 200 shuffle partitions to 1. How many tasks run in total?', [
        ['5: four map tasks, then one reduce task', true],
        ['204: four map tasks and all 200 reduces', false],
        ['200: one for each configured partition', false],
        ['4: aggregation needs no second stage', false],
      ], 'One task per partition per stage: four for the scan-and-partial-aggregate stage and one for the coalesced reduce stage. Without AQE it would be 4 + 200; an aggregation always needs the shuffle stage.'),
      mcq('Which of these is an action rather than a transformation?', [
        ['df.toPandas()', true],
        ['df.groupBy("city")', false],
        ['df.withColumn("x", F.lit(1))', false],
        ['df.join(zones, "zone_id")', false],
      ], 'toPandas() brings rows to the driver, so it must run the plan. groupBy, withColumn and join return new lazy descriptions of work.'),
      mcq('A physical plan\'s FileScan line shows ReadSchema with 4 of the file\'s 9 columns and PushedFilters: [EqualTo(status,completed)]. What has the optimiser done?', [
        ['Pruned unused columns and pushed the filter into the Parquet read', true],
        ['Rewritten the Parquet file on disk keeping only the four columns', false],
        ['Cached the four columns in memory so the next query is faster', false],
        ['Split the file into four partitions, one for each column read', false],
      ], 'Column pruning reads only what the query uses, and filter pushdown lets the reader skip row groups by their statistics. Nothing is rewritten or cached, and partitions are slices of rows, not columns.'),
    ],
  },

  /* ── DATAFRAME_API ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_DATAFRAME_API',
    notes: `If you know pandas ("Selecting and Filtering Rows and Columns", "Merging, Concatenating and Reshaping") and SQL,
the PySpark DataFrame API is mostly new spelling. The differences that matter: DataFrames are immutable (every
call returns a new one), columns are expressions built with pyspark.sql.functions (import it as F), and nothing
runs until an action.

## Reading, with a schema

A six-line CSV of RideKaro ride events, with the mess real feeds have — a city with a trailing space and lower
case, an empty fare, and a fare of "abc":

    spark.read.option("header", True).csv(path).printSchema()
    # every column: string
    spark.read.option("header", True).option("inferSchema", True).csv(path)
    # fare_paise: string (because of "abc"), requested_at: timestamp

Without a schema every CSV column is a string; with inferSchema Spark reads the file an extra time to guess, and
one bad value turns a whole column into strings. In a pipeline, declare it:

    schema = "ride_id STRING, city STRING, status STRING, fare_paise LONG, requested_at TIMESTAMP"
    ev = spark.read.option("header", True).schema(schema).csv(path)

What happens to "abc" depends on the read mode:

    PERMISSIVE (default)  R4 and R6 both show fare_paise NULL — the empty one and the bad one,
                          indistinguishable
    FAILFAST              [MALFORMED_RECORD_IN_PARSING.WITHOUT_SUGGESTION] Malformed records are detected in
                          record parsing ... NumberFormatException: For input string: "abc"
    PERMISSIVE + a _corrupt_record STRING column in the schema (and the DataFrame cached
                          before filtering on it): R6 kept, with the raw line
                          "R6,Pune,completed,abc,2026-10-05T20:30:00Z"

The silent default is the dangerous one. Use FAILFAST for feeds that must be clean, or keep the corrupt-record
column and route those rows to a reject table, as "Data Formats: CSV, JSON, Parquet and Avro" recommended for
pandas. Parquet carries its own schema, which is one more reason the lake stores Parquet.

## select, filter, withColumn

    clean = (ev
        .withColumn("city", F.initcap(F.trim("city")))           # "bengaluru " -> "Bengaluru"
        .withColumn("fare_rupees", F.col("fare_paise") / 100)
        .withColumn("is_paid_ride", F.when(F.col("status") == "completed", True).otherwise(False))
        .filter(F.col("ride_id").isNotNull())
        .select("ride_id", "city", "status", "fare_rupees", "is_paid_ride"))

Conditions combine with & and |, each side in parentheses: (F.col("city") == "Pune") & (F.col("status") ==
"completed"). Python's and raises an error (DEBUGGING shows it). F.when ... otherwise is SQL's CASE WHEN.
filter and where are the same method; so are withColumnRenamed and an alias in select.

## groupBy and agg

    (rides.filter(F.col("status") == "completed")
          .groupBy("city")
          .agg(F.count("*").alias("rides"),
               F.round(F.sum("fare_paise") / 1e7, 2).alias("gmv_lakh_rupees"),
               F.round(F.avg("distance_km"), 2).alias("avg_km"),
               F.countDistinct("rider_id").alias("riders"))
          .orderBy(F.desc("rides"))).show()

    +---------+------+---------------+------+------+
    |     city| rides|gmv_lakh_rupees|avg_km|riders|
    |Bengaluru|901708|         1208.8|   6.0|358011|
    |Hyderabad|359961|          482.2|   6.0|237384|
    |  Chennai|270292|          362.7|  6.01|196728|
    |     Pune|269246|         360.59|  5.99|195837|

Money stays in integer paise until the last step; dividing by 1e7 gives lakh rupees for the report.

## Joins

    completed.join(payments, "ride_id")              # inner on a column name
    completed.join(payments, "ride_id", "left")      # left, right, full ("outer")
    completed.join(ok_payments, "ride_id", "left_anti")   # completed rides with NO success row
    completed.join(ok_payments, "ride_id", "left_semi")   # completed rides WITH one (no columns added)

The fan-out from "Reading Query Plans and Fixing Slow SQL" is the same here. 1,801,207 completed rides joined to
all 1,945,390 payment attempts gave 1,945,390 rows, because 144,183 rides had a failed attempt before the
successful one. Joined only to success rows: 1,801,207. The left_anti join returned 0 — every completed ride was
paid — which is a reconciliation check worth keeping in the job.

Joining on a string (or a list of names) keeps one copy of the key. Joining on an expression keeps both:
rides.join(zones, rides.zone_id == zones.zone_id) produced columns zone_id, city, zone_id, zone_name, city, and
select("city") failed with [AMBIGUOUS_REFERENCE] Reference \`city\` is ambiguous. Use the name form, or alias
the DataFrames (rides.alias("r")) and select F.col("r.city").

## Spark SQL on the same data

    rides.createOrReplaceTempView("rides"); payments.createOrReplaceTempView("payments")
    spark.sql("""
      SELECT p.method, count(*) AS rides,
             round(100 * count(*) / sum(count(*)) OVER (), 1) AS pct
      FROM rides r JOIN payments p ON r.ride_id = p.ride_id
      WHERE r.status = 'completed' AND p.pay_status = 'success'
      GROUP BY p.method ORDER BY rides DESC""").show()

    UPI 1261971 70.1 | cash 269874 15.0 | card 179190 9.9 | wallet 90172 5.0

The DataFrame version (join, groupBy, a sum over Window.partitionBy() for the total) returned the same four rows.
Choose per team: SQL for logic analysts must review, the DataFrame API when steps are built in loops or
functions. Mixing them in one job is normal; they compile to the same plans.

## Writing

The production form is one line:

    daily.write.mode("overwrite").partitionBy("ride_date").parquet("s3://ridekaro-lake/curated/daily/")

Spark writes one file per partition of the DataFrame into each folder, so the partition count you write with is
the file count (SKEW_TUNING). On this Windows laptop the write failed with the winutils error, so results were
handed to pandas instead: with spark.sql.execution.arrow.pyspark.enabled set to true, toPandas() of the four-row
summary took 5.31 s (the whole plan ran), and pyarrow and the deltalake package wrote Parquet and a Delta table
(version 0) from it. toPandas() is only for small results — it moves every row into the driver's memory.`,
    workedExample: `**Scenario.** Finance at RideKaro wants, per city, completed rides, GMV and the share paid by UPI — and the list of
completed rides that have no successful payment, if any. Write it with the DataFrame API, then check it with SQL.

**1. Read with schemas, filter early.**

    rides = spark.read.parquet("rides.parquet")
    pays = spark.read.parquet("payments.parquet")
    completed = rides.filter(F.col("status") == "completed").select("ride_id", "city", "fare_paise")
    ok = pays.filter(F.col("pay_status") == "success").select("ride_id", "method")

Selecting the needed columns early is a habit, though Catalyst would prune them anyway.

**2. Join on the key name, at the right grain.** ok has one row per ride (the success), so the join cannot fan
out. Joining to all of pays would have produced 1,945,390 rows instead of 1,801,207.

    j = completed.join(ok, "ride_id")
    summary = (j.groupBy("city")
                .agg(F.count("*").alias("rides"),
                     F.sum("fare_paise").alias("gmv_paise"),
                     F.round(100 * F.avg(F.when(F.col("method") == "UPI", 1).otherwise(0)), 1)
                      .alias("upi_pct")))

The average of a 1/0 flag is a share — the same trick as in SQL.

**3. Unpaid rides.** completed.join(ok, "ride_id", "left_anti") returned 0 rows. Keep the step: on the day a payment
feed is late, it returns rows, and the job can fail or alert instead of publishing GMV that includes unpaid rides.

**4. Check in SQL.** Register both as views and write the same query with GROUP BY city and AVG(CASE WHEN method =
'UPI' THEN 1 ELSE 0 END). Compare the two results with exceptAll in both directions; both returned 0 rows. The
result:

    city       rides   gmv_paise    upi_pct
    Bengaluru  901708  12087989934  70.1
    Chennai    270292   3626974794  70.0
    Hyderabad  359961   4822017101  70.0
    Pune       269246   3605904882  70.1

**5. Hand it over.** Four rows: toPandas() and write it with pyarrow, or, on a cluster, summary.write.mode
("overwrite").parquet(...).

**Result.** One join at the right grain, a reconciliation check that costs one more join, and a second
formulation to prove the first.`,
    mcqs: [
      mcq('A CSV of ride events is read with an explicit schema declaring fare_paise LONG, in the default mode. One row has fare_paise "abc". What does Spark do with that row?', [
        ['Keeps it, with fare_paise NULL and no error or warning', true],
        ['Fails the read with a NumberFormatException for "abc"', false],
        ['Drops the row and logs it in a separate bad-records file', false],
        ['Reads the whole fare_paise column as strings instead', false],
      ], 'PERMISSIVE mode turns unparsable values into NULL silently, so a bad fare looks the same as a missing one. FAILFAST would raise the error, dropping needs DROPMALFORMED, and the column type comes from your schema, so it does not fall back to strings.'),
      mcq('completed rides (1,801,207) are joined to all payment attempts on ride_id and the result has 1,945,390 rows. What is the right fix for a GMV report?', [
        ['Join only to the successful payment rows, one per ride', true],
        ['Use a left join so that no completed ride is ever lost', false],
        ['Call dropDuplicates() on the joined result before summing', false],
        ['Increase spark.sql.shuffle.partitions so keys are unique', false],
      ], 'Rides with a failed attempt before the successful one appear twice: fan-out. Filtering payments to one row per ride fixes the grain. A left join keeps the fan-out, dropDuplicates on all columns keeps both differing attempts, and partitioning never changes a join\'s result.'),
      mcq('After rides.join(zones, rides.zone_id == zones.zone_id), selecting "city" fails with AMBIGUOUS_REFERENCE. Which change fixes it most simply?', [
        ['Join on the name: rides.join(zones, "zone_id")', true],
        ['Run the select before the join instead of after it', false],
        ['Cast zone_id to the same type in both DataFrames', false],
        ['Use a left join instead of the default inner join', false],
      ], 'Both inputs have a city column; an expression join keeps every column of both sides, so the name is ambiguous. Joining on the name keeps one zone_id, and then you drop or rename the second city (or alias the DataFrames). Types and join type do not remove duplicate names.'),
    ],
    checkpoint: [
      mcq('Which filter correctly keeps completed rides in Pune?', [
        ['rides.filter((F.col("city") == "Pune") & (F.col("status") == "completed"))', true],
        ['rides.filter(F.col("city") == "Pune" and F.col("status") == "completed")', false],
        ['rides.filter(F.col("city") == "Pune" & F.col("status") == "completed")', false],
        ['rides.filter((F.col("city") == "Pune") && (F.col("status") == "completed"))', false],
      ], 'Column conditions combine with & and need parentheses because & binds tighter than ==. Python\'s and tries to turn a Column into a bool and fails, the unparenthesised & is evaluated in the wrong order, and && is not Python.'),
      mcq('Finance wants completed rides that have NO successful payment. Which join returns exactly those rides and only their columns?', [
        ['completed.join(ok_payments, "ride_id", "left_anti")', true],
        ['completed.join(ok_payments, "ride_id", "left_semi")', false],
        ['completed.join(ok_payments, "ride_id", "left")', false],
        ['completed.join(ok_payments, "ride_id", "full")', false],
      ], 'A left anti join keeps left rows with no match and adds no columns. Left semi keeps the rows that do match, a left join keeps all rows and needs a NULL filter afterwards, and a full join adds payment-only rows too.'),
      mcq('A team reads a 40-column CSV with option("inferSchema", True) in a nightly job. What is the main problem?', [
        ['An extra pass over the data, and types that change with the day\'s values', true],
        ['inferSchema only works for Parquet and silently ignores CSV inputs', false],
        ['Inferred schemas make all columns non-nullable, which fails on NULLs', false],
        ['The schema is inferred per partition, so partitions disagree on types', false],
      ], 'Inference reads the data to guess types, and one bad value (like "abc") makes a numeric column a string that night. Declaring the schema is cheaper and stable. It does work for CSV, inferred columns are nullable, and one schema is produced for the whole DataFrame.'),
    ],
  },

  /* ── PARTITIONS_SHUFFLES ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_PARTITIONS_SHUFFLES',
    notes: `Almost every slow Spark job is slow for one of three reasons: too few or too many partitions, a shuffle it did
not need, or a join done the expensive way. All three are visible in explain() before you run anything.

## Partitions on the way in

A partition is a slice of rows that one task processes. Reading Parquet, Spark cuts files into splits of at most
spark.sql.files.maxPartitionBytes (128 MB by default), and spreads small inputs across the available cores. The
73 MB rides file (six row groups of 500,000 rows) came in as 4 partitions holding 1,000,000, 500,000, 1,000,000
and 500,000 rows — four tasks for four cores. On a cluster with 40 cores, a 50 GB input gives roughly 400 splits,
so ten waves of tasks.

Two ways to change the count yourself:

    rides.repartition(8)        Exchange RoundRobinPartitioning(8)    full shuffle; can go up or down
    rides.repartition("city")   Exchange hashpartitioning(city, 200)  full shuffle by key
    rides.coalesce(2)           Coalesce 2                            no shuffle; merges, only down

coalesce is cheap because it glues neighbouring partitions together without moving rows between executors, but
it can only reduce, and it can leave uneven partitions. repartition costs a shuffle and gives even ones. Note that
repartition("city") still made 200 partitions — and with four cities, 196 of them are empty.

## Narrow and wide transformations

**Narrow**: each output partition needs one input partition — filter, select, withColumn, union, coalesce. The
plan for a filter plus a withColumn had no Exchange at all: one stage, marked *(1) (whole-stage code generation
fused the operators into one function).

**Wide**: an output partition needs rows from many input partitions — groupBy, distinct, join (unless
broadcast), orderBy, window with partitionBy, repartition. Each shows as an Exchange:

    distinct()          HashAggregate -> Exchange hashpartitioning(rider_id, 200) -> HashAggregate
    orderBy(time)       Exchange rangepartitioning(requested_at ASC, 200) -> Sort

A shuffle writes every row to local disk on the sending side, sends it over the network, and reads it back: the
most expensive thing Spark does. Reduce what crosses it — filter and select before wide steps, aggregate before
joining where the question allows.

## spark.sql.shuffle.partitions and AQE

Every shuffle produces spark.sql.shuffle.partitions partitions: 200 by default, whatever the data size. 200 is
too many for a laptop-sized aggregate and too few for a terabyte. A groupBy("zone_id") over 3 million rides (300
groups), median of five interleaved runs:

    AQE off, 200 shuffle partitions          1.29 s
    AQE off, 8 shuffle partitions            0.28 s
    AQE on, 200 configured (coalesced to 1)  1.13 s

Adaptive Query Execution looks at the real shuffle sizes after the map stage and merges small partitions:

    AdaptiveSparkPlan isFinalPlan=true
    +- HashAggregate(keys=[zone_id], functions=[sum(fare_paise)])
       +- AQEShuffleRead coalesced
          +- Exchange hashpartitioning(zone_id, 200)

The result had 1 partition. AQE fixes the reduce side, but the map side still wrote 200 blocks per task, which is
why setting a sensible number still won here. Rule of thumb: aim for shuffle partitions of roughly 100–200 MB;
keep AQE on (it is the default since Spark 3.2) and set spark.sql.shuffle.partitions for the job's real volume.

## Joins: broadcast or shuffle

    BroadcastHashJoin   the small side is sent whole to every executor; the big side does not move
    SortMergeJoin       both sides shuffled by the key and sorted, then merged
    ShuffledHashJoin    both shuffled, a hash table built per partition (chosen less often)

Spark broadcasts automatically when it estimates one side under spark.sql.autoBroadcastJoinThreshold (10 MB by
default). rides joined to the 300-row zones table:

    BroadcastHashJoin [zone_id], [zone_id], Inner, BuildRight
    :- FileScan parquet [ride_id, ..., zone_id, ...]
    +- BroadcastExchange HashedRelationBroadcastMode(...)
       +- FileScan parquet [zone_id, zone_name]

No Exchange on the rides side. rides joined to 1.95 million payments — both large:

    SortMergeJoin [ride_id], [ride_id], Inner
    :- Sort [ride_id ASC NULLS FIRST]
    :  +- Exchange hashpartitioning(ride_id, 200)
    +- Sort [ride_id ASC NULLS FIRST]
       +- Exchange hashpartitioning(ride_id, 200)

Two shuffles and two sorts. The 60,001-row drivers table was broadcast automatically too. With AQE and automatic
broadcast switched off, completed rides joined to drivers and summed by vehicle:

    SortMergeJoin                       10.70 s
    F.broadcast(drivers) hint            3.70 s       (same three rows of output)

When statistics are missing (a filtered or computed DataFrame, or a table read without stats), Spark may not know
the small side is small; F.broadcast(df) or the SQL hint /*+ BROADCAST(d) */ tells it. Do not broadcast something
large: it is copied to every executor's memory, and the driver collects it first.

## The optimiser already moves some things

rides.join(payments, "ride_id").filter(F.col("city") == "Pune") — filter written after the join — produced a plan
with EqualTo(city,Pune) pushed into the rides FileScan, below the Exchange. Catalyst moves filters on one side's
columns before the join for you. It cannot remove a join you did not need or a fan-out in your keys; those are
your decisions ("Reading Query Plans and Fixing Slow SQL").`,
    workedExample: `**Scenario.** RideKaro's nightly "zone performance" job joins a month of rides (the real table: 900 million rows)
to zones (300 rows), drivers (60,000 rows) and payments (one row per attempt), then aggregates by city, zone and
vehicle. It takes 40 minutes. Read the plan and decide what to change, before touching the cluster size.

**1. Count the Exchanges.** explain() on the lab-sized version shows: zones as BroadcastHashJoin (no shuffle),
drivers as BroadcastHashJoin, payments as a SortMergeJoin with an Exchange on each side, and the groupBy's own
Exchange. So three shuffles, and the rides side crosses the network twice: once for the payments join and once,
as partial aggregates, for the groupBy.

**2. Ask whether payments must be joined at row level.** The report needs method share per zone. Pre-aggregate:
reduce payments to one success row per ride (ride_id, method) first — a smaller shuffle on the payments side —
or, if the report only needs counts by method, join an aggregate. Fewer columns crossing the shuffle matters as
much as fewer rows: select only ride_id, zone_id, driver_id, fare_paise from rides before the join.

**3. Check the broadcast decisions survive production.** In production drivers is read through a view with a
filter, and the plan showed SortMergeJoin for it. Add F.broadcast(drivers) — in the lab, SortMergeJoin took 10.70 s
and the broadcast 3.70 s for the same result.

**4. Set the shuffle partitions for the volume.** If the payments join shuffles about 60 GB, 200 partitions means
300 MB each, larger than comfortable; set spark.sql.shuffle.partitions to about 400–600 and keep AQE on to merge
small ones.

**5. Measure one change at a time.** Before and after, from the Spark UI: number of stages, shuffle read and write
bytes per stage, task time distribution. Record the run time and the shuffle bytes.

**Result.** Most of the gain comes from not shuffling what does not need to move: broadcast the small tables,
pre-aggregate and prune the big one, and size the shuffle for the data.`,
    mcqs: [
      mcq('A job reads 3 million rides into 4 partitions and calls coalesce(2) before writing. What does the plan show, and why?', [
        ['"Coalesce 2" and no Exchange, because coalesce merges neighbouring partitions', true],
        ['An Exchange RoundRobinPartitioning(2), because any partition change must shuffle', false],
        ['An Exchange hashpartitioning(200), because shuffle partitions default to 200', false],
        ['Nothing at all, because coalesce only takes effect once the file is written', false],
      ], 'coalesce reduces partitions by merging existing ones in place, a narrow operation with no shuffle. repartition is the one that shows an Exchange, the 200 default applies to shuffles from wide operations, and coalesce appears in the plan like any other operator.'),
      mcq('rides (3 million rows) is joined to zones (300 rows). The plan shows BroadcastHashJoin with BuildRight. What does that mean for the rides data?', [
        ['Rides are not shuffled; each task probes a copy of zones', true],
        ['Rides are broadcast to every executor, then joined there', false],
        ['Both inputs are sorted by zone_id, then merged as streams', false],
        ['Zones are shuffled into 200 partitions to match the rides', false],
      ], 'The small build side (zones, on the right) is copied to every executor and each rides partition is joined where it sits. Broadcasting the 3-million-row side would be the mistake, sorting both sides is a sort-merge join, and a broadcast join has no shuffle.'),
      mcq('With AQE off, a groupBy over 300 zone values runs in 1.29 s with 200 shuffle partitions and 0.28 s with 8. Why is 200 slower here?', [
        ['Most of the 200 tasks have little or no data, but each still costs scheduling and shuffle blocks', true],
        ['With 200 partitions the aggregation is computed twice, once per stage, and then merged again', false],
        ['200 partitions force Spark to spill every partition to disk before reading it back for the sum', false],
        ['Only 8 partitions allow whole-stage code generation; 200 fall back to the slow interpreted path', false],
      ], 'Each partition is a task with fixed overhead and a shuffle block per map task; with 300 small groups most are nearly empty. The two-phase aggregate runs the same way at either setting, small partitions do not spill, and code generation does not depend on the partition count.'),
    ],
    checkpoint: [
      mcq('Which of these does NOT add an Exchange (shuffle) to the plan?', [
        ['df.filter("status = \'completed\'").withColumn("x", F.lit(1))', true],
        ['df.select("rider_id", "city").distinct().filter("city = \'Pune\'")', false],
        ['df.orderBy("requested_at").select("ride_id", "requested_at")', false],
        ['df.repartition(8).withColumn("fare_rupees", F.col("fare_paise") / 100)', false],
      ], 'filter and withColumn are narrow: each output partition comes from one input partition. distinct needs equal values together (hash exchange), orderBy needs a range exchange, and repartition is an explicit shuffle.'),
      mcq('A 60,000-row drivers DataFrame produced by a filter on a view is joined to rides with a SortMergeJoin. What is the usual fix?', [
        ['Hint it: rides.join(F.broadcast(drivers), "driver_id")', true],
        ['Raise spark.sql.shuffle.partitions from 200 to 2000', false],
        ['Call drivers.cache() so the join reads it from memory', false],
        ['Call rides.coalesce(1) so the join runs in one task', false],
      ], 'Spark could not tell the filtered side was small, so it shuffled both; the broadcast hint avoids shuffling rides (10.70 s to 3.70 s in the lab). More partitions keeps the shuffle, caching does not change the join strategy, and one task removes all parallelism.'),
      mcq('A plan shows "Exchange hashpartitioning(city, 200)" for repartition("city") on data with four cities. What will most of the partitions contain?', [
        ['Nothing: four hold the data and 196 are empty', true],
        ['An equal share of rows, spread round-robin', false],
        ['One city each, repeated across 50 partitions', false],
        ['All the rows, since every partition is a copy', false],
      ], 'Hash partitioning sends every row of a key to the same partition, so four keys fill at most four of the 200. Round-robin is repartition(n) without a column; a key never repeats across partitions, and partitions are disjoint slices.'),
    ],
  },

  /* ── SKEW_TUNING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_SKEW_TUNING',
    notes: `A stage finishes when its slowest task finishes. If one partition holds a hundred times more rows than the rest,
199 tasks end in seconds and one runs for minutes while the cluster idles. That is skew, and on real data it is
the most common reason a Spark job that "should take ten minutes" takes two hours.

## Finding it

In RideKaro's rides, 899,457 of 3,000,000 rides (30%) have driver_id D000000 — the placeholder the app writes when
no driver accepts. The next most frequent driver has 61 rides. Count your join keys before you blame the cluster:

    rides.groupBy("driver_id").count().orderBy(F.desc("count")).show(3)

Joining rides to drivers with a sort-merge join (broadcast disabled, standing in for a dimension too big to
broadcast) and counting rows per partition after the shuffle:

    rows per partition:  max 909,717   median 10,482   min 9,002   (200 partitions)

One task holds 87 times the median. In the Spark UI this shows as a stage whose task-duration summary has a max
far above the 75th percentile, and one task still running when the rest are done.

## Fix 0: is the hot key real?

Before any tuning trick, ask what the key means. The placeholder rides have no driver, yet the inner join matched
them to a placeholder row in drivers, whose vehicle happened to be "bike". The vehicle report said 1,601,840 bike
rides; without the placeholder it was 702,383. The skew was also a correctness bug: 899,457 unassigned rides were
counted as bike rides. Filter them out, or handle them in a separate branch and union the result. NULL keys are
the same story: a join drops them anyway, so filter them before the shuffle instead of after.

## Fix 1: adaptive skew join (AQE)

With AQE on, Spark measures each shuffle partition's size and, in a sort-merge join, splits a partition that is
both larger than spark.sql.adaptive.skewJoin.skewedPartitionFactor (5) times the median and larger than
skewedPartitionThresholdInBytes (256 MB by default), replicating the matching rows of the other side. The plan
then reads:

    SortMergeJoin(skew=true) [driver_id], [driver_id], Inner
    :- Sort ...
    :  +- AQEShuffleRead coalesced and skewed

Two lab findings worth knowing. First, it works on bytes, not rows: the skewed partition here was a few megabytes
after compression, so with the 256 MB default AQE did nothing, and it split it only when the threshold (and the
advisory partition size) were lowered to 4 MB — a laptop-scale stand-in for production sizes. Second, when the
query used only driver_id and fare_paise, the 900,000 identical placeholder rows compressed to almost nothing and
even 256 KB did not trigger a split: the task still processed 900,000 rows. Skew detection sees shuffle bytes.

## Fix 2: salting

Spread the hot key over N sub-keys. Add a random salt to the big side (only for the hot key, or for all keys),
and replicate the small side once per salt value:

    S = 16
    hot = F.col("driver_id") == "D000000"
    r_salt = rides.withColumn("salt", F.when(hot, (F.rand(7) * S).cast("int")).otherwise(F.lit(0)))
    d_salt = (drivers
        .withColumn("salts", F.when(hot, F.sequence(F.lit(0), F.lit(S - 1)))
                              .otherwise(F.array(F.lit(0))))
        .withColumn("salt", F.explode("salts")).drop("salts"))
    r_salt.join(d_salt, ["driver_id", "salt"])

drivers grew from 60,001 to 60,016 rows; the largest partition fell from 909,717 to 68,327 rows; the answer was
identical. (F.explode inside F.when fails with UNSUPPORTED_GENERATOR.NESTED_IN_EXPRESSIONS — build the array
first, then explode it.) Salting also fixes skewed aggregations: aggregate by (key, salt), then by key.

## What the timings said

Median of five interleaved runs on one busy 4-core laptop (minimums in brackets):

    sort-merge join, AQE off                   15.68 s  (8.92)
    AQE on, default 256 MB threshold           10.32 s  (5.63)  no skew split; coalescing helped
    AQE on, 4 MB threshold, skew=true           6.57 s  (4.78)
    salted x16, AQE off                        14.08 s  (9.01)
    placeholder filtered out, AQE off          12.16 s  (7.37)

Read this honestly: with only 4 task slots, one long task overlaps with the other 199, so skew costs less than on
a cluster, and salting's gain disappeared into the noise here. On a cluster with 200 slots, the stage time is the
largest task — 909,717 rows against 68,327 after salting is the number that predicts the gain there. AQE's split
won on the laptop too, because it also merged the small partitions.

## Caching: when it helps and when it hurts

df.cache() keeps a DataFrame after its first computation (MEMORY_AND_DISK for DataFrames: the storage level
printed as "Disk Memory Deserialized 1x Replicated"). The plan then reads InMemoryTableScan instead of the file.

    three reports from completed rides, no cache          4.21 s
    cache fill (one count)                               13.51 s
    the same three reports from the cache                 2.67 s
    used once: no cache 0.89 s; cache + count + use      14.13 s

Caching a cheap Parquet scan did not pay even for three reports: building the in-memory copy cost more than
re-reading columnar files with pruning. Cache when recomputation is expensive (a big join or a deduplication
used by several outputs), when the DataFrame is reused, and when it fits. Unpersist when done. Never cache "just in
case": it uses executor memory that joins and aggregations need.

## Files: too many, too small

The same rides written as 2,000 small Parquet files (108 MB, because every file repeats its metadata) and as 4
files (70 MB), read and aggregated:

    2,000 files: listing alone 12.56 s, 63 partitions; read + aggregate 14.01 s
    4 files:     listing 0.12 s, 4 partitions;        read + aggregate 0.47 s

Spark makes small files itself: a write produces one file per partition per output folder, so 200 shuffle
partitions written with partitionBy("ride_date") can make up to 200 files in every date folder. Fixes: repartition
by the partition column before writing (df.repartition("ride_date").write.partitionBy("ride_date")), coalesce
when the output is small, cap with maxRecordsPerFile, and compact table formats (Delta's OPTIMIZE, in
"Warehouses and Lakehouses"). Aim for files of 128 MB to 1 GB. (On this Windows laptop, Spark could not list a
folder without winutils — UnsatisfiedLinkError ... NativeIO$Windows.access0 — so the file lists were passed
explicitly; on Linux and in the cloud you pass the folder.)`,
    workedExample: `**Scenario.** RideKaro's "rides by vehicle type" job used to take 12 minutes on EMR and now takes 70. Nothing in the
code changed; the stage that joins rides to drivers has 199 tasks finishing in about 40 seconds and one running
for over an hour. Diagnose and fix it.

**1. Confirm skew from the evidence.** The stage's task summary (Spark UI) shows max duration far above the 75th
percentile, and that one task's shuffle read is much larger than the others'. That is skew, not a cluster
problem; more executors would not help, because one task cannot be split across them.

**2. Find the key.** Count the join key:

    rides.groupBy("driver_id").count().orderBy(F.desc("count")).show(3)
    D000000 899457 | D036401 61 | D019213 60

The app team confirms: since the last release, rides with no driver accepted are written with driver_id D000000
instead of NULL.

**3. Ask what the right answer is.** Those rides have no driver and no vehicle, yet the join matched them to the
placeholder row in drivers. The bike count was inflated from 702,383 to 1,601,840. The correct report excludes
them (or shows them as "unassigned"), so the first fix is a filter — correctness first:

    assigned = rides.filter(F.col("driver_id") != "D000000")

**4. Protect against the next hot key.** Make sure AQE's skew join is on and its threshold suits the data size.
On the cluster the defaults (factor 5, 256 MB) are sensible; in the lab, at 4 MB, the plan showed
SortMergeJoin(skew=true) and the run went from 15.68 s to 6.57 s (median of five). If a legitimately hot key
remains — an airport pickup zone in a zone join, a large corporate account — salt it as in the notes.

**5. Add a data check.** The real cause was an upstream change. Add a test to the pipeline: share of rides on any
single driver_id must stay below 1%. The night the app team changes the placeholder again, the check fails before
the job does.

**Result.** The vehicle report is correct again, the stage's largest task is back near the median, and the change
that caused it is now caught by a check rather than by a 70-minute run.`,
    mcqs: [
      mcq('A join stage has 199 tasks that finish in 40 seconds and one that runs for an hour. Which action is LEAST likely to help?', [
        ['Doubling the number of executors in the cluster', true],
        ['Counting rows per join key to find the hot value', false],
        ['Enabling AQE\'s skew join with a suitable threshold', false],
        ['Salting the hot key and replicating the small side', false],
      ], 'One task runs on one core; more executors only speed up the 199 short tasks that were already done. Finding the key, AQE skew splitting and salting all break up the oversized partition.'),
      mcq('AQE is on with default settings, yet a join over a hot key with 900,000 identical rows is not split. Why can that happen?', [
        ['Skew is judged by shuffle bytes, and those rows compressed below the 256 MB threshold', true],
        ['AQE never splits partitions in sort-merge joins; it only changes them into broadcasts', false],
        ['The hot key is a string, and AQE\'s skew handling only applies to numeric join columns', false],
        ['Skew splitting needs spark.sql.shuffle.partitions set to a value above 1,000 to apply', false],
      ], 'A partition must exceed both five times the median and the byte threshold; identical rows compress to very little, so the task still processes 900,000 rows without being split. AQE does split sort-merge joins (skew=true), key type does not matter, and there is no minimum partition count.'),
      mcq('Caching completed rides took 13.51 s; three reports then took 2.67 s instead of 4.21 s. What should the team conclude?', [
        ['Here the cache does not pay off; re-reading the Parquet columns was cheaper', true],
        ['Caching always pays off once a DataFrame is used three or more times in a job', false],
        ['The cache was wrong because MEMORY_AND_DISK is slower than recomputing the data', false],
        ['They should call cache() on the source rides too, so both reads are in memory', false],
      ], 'Building the cache cost 13.51 s to save about 1.5 s; caching pays when recomputation is expensive and reuse is high. There is no fixed reuse count, the storage level was not the problem, and caching more raises memory pressure.'),
    ],
    checkpoint: [
      mcq('Rides are salted with a random value 0–15 for the hot driver_id. What must happen to the drivers side for the join to stay correct?', [
        ['Its hot row is replicated 16 times, one per salt value', true],
        ['It is salted with an independent random value 0–15', false],
        ['Nothing; Spark matches a missing salt automatically', false],
        ['It is broadcast, and the salt column is ignored', false],
      ], 'Each salted ride must find a matching (driver_id, salt) row, so the small side needs every salt value for the hot key. Random salts on both sides would match by chance only, and Spark does not ignore a join column.'),
      mcq('Which reading of a plan proves AQE split a skewed partition in a join?', [
        ['SortMergeJoin(skew=true) above AQEShuffleRead coalesced and skewed', true],
        ['AdaptiveSparkPlan isFinalPlan=false at the very top of the plan', false],
        ['BroadcastHashJoin BuildRight replacing the earlier sort-merge join', false],
        ['Exchange hashpartitioning(driver_id, 200) on both sides of the join', false],
      ], 'skew=true and "skewed" in the shuffle read appear only when skew handling ran. isFinalPlan=false means the plan has not run yet, a broadcast switch is a different AQE optimisation, and the hash exchanges are in every sort-merge join.'),
      mcq('A daily job writes with df.write.partitionBy("ride_date") after a groupBy that used 200 shuffle partitions. Each date folder ends up with about 200 tiny files. What fixes it?', [
        ['Repartition by ride_date before the write, so each date is one task', true],
        ['Raise spark.sql.shuffle.partitions so that each file holds more rows', false],
        ['Call cache() on the DataFrame before writing so files are merged', false],
        ['Turn AQE off so that the shuffle partitions are not coalesced', false],
      ], 'Each task writes its own file in every folder it has rows for; grouping a date into one partition makes one file per date. More partitions makes more files, caching does not change the write, and AQE coalescing reduces small partitions rather than causing them.'),
    ],
  },

  /* ── SPARK_UDFS_WINDOWS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_SPARK_UDFS_WINDOWS',
    notes: `Window functions in Spark mean exactly what they mean in SQL ("Window Functions: OVER and PARTITION BY",
"Ranking: ROW_NUMBER, RANK and DENSE_RANK", "Running Totals, Moving Averages, LAG and LEAD"). This lesson is
the Spark spelling, what windows cost, and the two other things pipelines need constantly: user-defined functions,
and nested data from JSON.

## Windows in the DataFrame API

    from pyspark.sql import Window
    w = Window.partitionBy("ride_id").orderBy(F.desc("event_ts"), F.desc("seq"))
    latest = (events.withColumn("rn", F.row_number().over(w))
                    .filter("rn = 1").drop("rn"))

On eight ride events (R101 with a duplicated "completed" event, R102 cancelled, R103 still "accepted") it kept
three rows: R101 completed, R102 cancelled_rider, R103 accepted. The tie-breaker seq makes the choice
deterministic, exactly as in SQL. The plan shows the cost:

    Window [row_number() ...], [ride_id], [event_ts DESC, seq DESC]
    +- WindowGroupLimit [ride_id], ..., row_number(), 1, Final
       +- Sort [ride_id, event_ts DESC, seq DESC]
          +- Exchange hashpartitioning(ride_id, 200)
             +- WindowGroupLimit ..., row_number(), 1, Partial

A window with partitionBy is a shuffle by the partition key plus a sort. (Spark 3.5 also noticed the rn = 1 filter
and added WindowGroupLimit, which keeps only the top row per key before and after the shuffle.)

lag and a running sum for a driver's day:

    w_d = Window.partitionBy("driver_id").orderBy("start_ts")
    (trips.withColumn("prev_end", F.lag("end_ts").over(w_d))
          .withColumn("idle_min", (F.unix_timestamp("start_ts") - F.unix_timestamp("prev_end")) / 60)
          .withColumn("day_earnings", F.sum("fare_paise").over(
               w_d.rowsBetween(Window.unboundedPreceding, Window.currentRow))))

    D000417 08:02 idle NULL  21400 | 08:40 idle 9.0  40200 | 10:15 idle 70.0  66300
    D000902 08:10 idle NULL   9900 | 08:25 idle 3.0  40400

Top two zones per city by GMV used F.dense_rank() over Window.partitionBy("city").orderBy(F.desc("gmv")).
A 7-day rolling GMV over daily rows used a range frame on seconds:

    w7 = Window.orderBy(F.col("d").cast("timestamp").cast("long")).rangeBetween(-6 * 86400, 0)

## Two window traps

**The default frame with ties.** With orderBy and no frame, Spark (like SQL) uses RANGE BETWEEN UNBOUNDED
PRECEDING AND CURRENT ROW, so rows with equal order values are summed together:

    t  v   default frame   rowsBetween(unboundedPreceding, 0)
    1  10       10               10
    2  20       60               30
    2  30       60               60
    3  40      100              100

For running totals, say rowsBetween explicitly and order by something unique.

**No partitionBy.** The 7-day window above, and any Window.orderBy(...) without partitionBy, plans as Exchange
SinglePartition: every row goes to one task. Spark warns: "No Partition Defined for Window operation! Moving all
data to a single partition, this can cause serious performance degradation." A global row_number over 3 million
rides took 19.3 s that way. On 31 daily rows it is fine — aggregate first, then window. On raw events, partition
by something (city, date).

## Built-in functions before UDFs

pyspark.sql.functions has several hundred functions: string, date, regex, JSON, array, map, math, conditional.
Reach for them first, because they run inside the JVM, in compiled code. A Python UDF ships every row to a Python
worker process and back. Banding 1.8 million completed fares into low/mid/high, three ways, median of five:

    built-in F.when(...)                       0.38 s    plan: plain Project
    pandas UDF (Arrow, a Series at a time)     6.88 s    plan: ArrowEvalPython
    Python UDF (a row at a time)               6.94 s    plan: BatchEvalPython

Same counts from all three (low 1,238,655, mid 558,480, high 4,072). The pandas UDF is usually much faster than a
row-at-a-time UDF because it moves batches through Arrow and runs vectorised pandas code; here, on a trivial
function and a busy 4-core laptop, the cost of moving data to Python dominated both. Both were about 18 times
slower than the built-in. Look for BatchEvalPython or ArrowEvalPython in a plan: each is a trip out of the JVM.

When you need a UDF (a library call, a parser with no built-in equivalent), prefer the pandas UDF:

    @F.pandas_udf("string")
    def band_pd(paise: pd.Series) -> pd.Series:
        r = paise / 100
        out = pd.Series("high", index=paise.index)
        out[r < 400] = "mid"; out[r < 150] = "low"
        return out.where(paise.notna(), None)

**Declared types are trusted, not checked.** A UDF declared "int" that returned paise / 100 (a float in Python)
gave NULL for every row — 24900 became NULL, not 249 — with no error. Declared "double", it gave 249.0. Test UDFs
on a few rows and assert there are no unexpected NULLs.

## Nested data: structs, arrays and maps

Payment gateway webhooks arrive as JSON like:

    {"event_id": "E1", "ride": {"id": "R101", "city": "Bengaluru"},
     "payment": {"method": "UPI", "upi": {"handle": "@okaxis"}, "amount_paise": 24900},
     "lines": [{"type": "fare", "paise": 22900}, {"type": "toll", "paise": 2000}],
     "tags": {"promo": "DIWALI50", "app": "android"}}

Read with inference, Spark made ride and payment structs, lines an array of structs — and tags a struct with
fields app and promo, because it guesses objects are structs. With a declared schema, tags became
MapType(string, string), which is right for open-ended keys. A truncated line landed in _corrupt_record.

    wh.select("event_id",
              F.col("ride.id").alias("ride_id"), "ride.city", "payment.method",
              F.col("payment.upi.handle").alias("upi_handle"),
              F.col("tags")["promo"].alias("promo"),
              F.size("lines").alias("n_lines"))

    E1 R101 Bengaluru UPI  @okaxis DIWALI50 2
    E2 R102 Pune      card NULL    NULL     1
    E3 R103 Hyderabad UPI  @ybl    NULL     0
    NULL ...                                 -1     <- the corrupt line: size(NULL) is -1 in Spark 3.5

Struct fields are reached with dots; a missing nested field is NULL, not an error. F.explode("lines") gives one
row per line item — and silently drops E3, whose array is empty; F.explode_outer keeps it with NULLs. Exploding
a map gives key and value columns. For a JSON string column (a Kafka message value, the streaming topic),
F.from_json(col, schema) parses it into the same struct; F.to_json goes back.`,
    workedExample: `**Scenario.** RideKaro's payment-gateway webhooks land as JSON lines, one event per payment state change, with
duplicates on retries. Finance wants one row per ride with the final payment method, the total toll paid, and
the promo code if any. Build it without a single Python UDF.

**1. Declare the schema.** Inference would turn tags into a struct whose fields change with each day's data; a
declared MapType keeps it stable, and a declared schema avoids a second pass over the files.

**2. Flatten what you need.**

    flat = wh.select(F.col("ride.id").alias("ride_id"), "event_id",
                     F.col("payment.method").alias("method"),
                     F.col("tags")["promo"].alias("promo"),
                     "lines", F.col("received_at"))

**3. Sum tolls from the array without exploding.** Higher-order functions work on arrays in the JVM:

    flat = flat.withColumn("toll_paise", F.aggregate(
        F.filter("lines", lambda l: l["type"] == "toll"),
        F.lit(0).cast("long"), lambda acc, l: acc + l["paise"]))

(F.filter and F.aggregate here are Spark's array functions, not Python's. The lambdas become Spark expressions;
they are not Python UDFs and the plan shows no EvalPython.) Exploding and grouping back would give the same
result through an extra shuffle.

**4. Keep the latest event per ride.**

    w = Window.partitionBy("ride_id").orderBy(F.desc("received_at"), F.desc("event_id"))
    final = flat.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn", "lines")

**5. Check.** On four sample webhooks (E1 delivered twice by a gateway retry) the output was three rows: R101 UPI,
toll 2000, DIWALI50; R102 card, toll 0, NULL; R103 UPI, toll 0 — E3's empty lines array summed to 0, which
F.explode would have lost entirely. The plan contained no EvalPython node. Count rows in and out per ride,
and assert no ride has a NULL method.

**Result.** Structs by dot, maps by key, arrays with higher-order functions, and the dedup window from SQL —
all inside the JVM.`,
    mcqs: [
      mcq('A running total uses F.sum("v").over(Window.partitionBy("k").orderBy("t")). Two rows share t = 2 with v = 20 and 30, after a row with v = 10. What does each t = 2 row show?', [
        ['60 for both, because the default frame includes rows tied on t', true],
        ['30 and then 60, because the frame counts the rows one at a time', false],
        ['20 and 30, because a running sum restarts at every new value', false],
        ['An error, because orderBy needs unique values in a window', false],
      ], 'With orderBy and no explicit frame, the frame is RANGE up to the current row, which includes all peers with the same t. rowsBetween(unboundedPreceding, 0) gives 30 then 60. Running sums do not restart, and ties are allowed.'),
      mcq('A plan contains "BatchEvalPython [band_py(fare_paise)]". What does it tell you about the job?', [
        ['Every row is sent out of the JVM to a Python worker and back', true],
        ['The function was compiled to JVM code by Catalyst for speed', false],
        ['The UDF runs on the driver, after the executors finish', false],
        ['The rows are processed in Arrow batches as pandas Series', false],
      ], 'BatchEvalPython is a row-at-a-time Python UDF: serialisation to a Python process and back. Catalyst cannot compile Python, UDFs run on executors, and Arrow batches show as ArrowEvalPython (a pandas UDF).'),
      mcq('A UDF is declared with return type "int" and returns paise / 100. On 24900 it returns NULL. What happened?', [
        ['Python returned a float, which does not match the declared int, so Spark gave NULL', true],
        ['The division overflowed the int range for large fares, so Spark replaced it with NULL', false],
        ['UDFs return NULL whenever their input column is a long rather than an int value', false],
        ['Spark rounds floats down to int, and 249.0 rounded down is NULL in Spark SQL rules', false],
      ], 'A Python UDF\'s result must match its declared type; a float for an int column becomes NULL silently. 249 does not overflow, long inputs are fine, and Spark does not round UDF results.'),
    ],
    checkpoint: [
      mcq('Webhook rows have lines, an array of line items. Some events have an empty array. Which call keeps those events, with NULL line fields?', [
        ['F.explode_outer("lines")', true],
        ['F.explode("lines")', false],
        ['F.flatten("lines")', false],
        ['F.array_distinct("lines")', false],
      ], 'explode_outer emits one row with NULLs for an empty or NULL array; explode drops the event (E3 vanished in the lab). flatten merges nested arrays and array_distinct removes duplicates; neither makes rows.'),
      mcq('Why does Window.orderBy("requested_at") on 3 million raw rides, with no partitionBy, run slowly?', [
        ['All rows are moved to a single partition and one task processes them', true],
        ['Spark sorts the data 200 times, once for each shuffle partition', false],
        ['The window is recomputed for each row, so the cost is quadratic', false],
        ['Windows without partitionBy fall back to a Python implementation', false],
      ], 'The plan shows Exchange SinglePartition and Spark warns about moving all data to one partition; the lab\'s global row_number took 19.3 s. Sorting is done once, frames are computed incrementally, and nothing falls back to Python.'),
      mcq('Payment webhooks have a "tags" object whose keys vary from merchant to merchant. How should it be declared in the schema?', [
        ['As MapType(StringType(), StringType()), read with tags["promo"]', true],
        ['As a StructType listing every key seen in last month\'s files', false],
        ['As StringType, parsed later with a Python UDF on each row', false],
        ['As ArrayType(StringType()), one element for every tag value', false],
      ], 'A map holds open-ended keys and is queried by key; a struct fixes the field list (inference makes one, which changes with the data). A UDF parser is slow, and an array loses the key names.'),
    ],
  },

  /* ── SPARK_IN_PRODUCTION ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_SPARK_IN_PRODUCTION',
    notes: `A notebook that worked once is not a job. A job runs every night without you, for a date it is given, on a
cluster you did not start, and fails loudly when something is wrong. This lesson turns the RideKaro city-day
query into one, tests it, and says where it can run. It applies "Pipeline Code You Can Trust: Config, Logging and
Tests" and "Idempotent, Restartable Loads" to Spark.

## Shape of a job

A package ridekaro_jobs/ with daily_rides.py, and tests/ with conftest.py and test_daily_rides.py. The
transforms are plain functions, DataFrame in and DataFrame out, with no reading, writing or SparkSession
inside them:

    def latest_per_ride(events: DataFrame) -> DataFrame:
        w = Window.partitionBy("ride_id").orderBy(F.desc("event_ts"), F.desc("seq"))
        return events.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")

    def build(events: DataFrame, run_date: str) -> DataFrame:
        rides = add_ist_date(latest_per_ride(events))
        return daily_city(rides.filter(F.col("ride_date") == F.lit(run_date).cast("date")))

main() is the only place that touches the outside world:

    def main(argv=None) -> int:
        p = argparse.ArgumentParser()
        p.add_argument("--input", required=True)
        p.add_argument("--output", required=True)
        p.add_argument("--run-date", required=True)     # from the orchestrator, never "today"
        a = p.parse_args(argv)
        spark = (SparkSession.builder.appName(f"daily_rides_{a.run_date}")
                 .config("spark.sql.sources.partitionOverwriteMode", "dynamic").getOrCreate())
        out = build(spark.read.parquet(a.input), a.run_date)
        if out.count() == 0:
            print(f"no completed rides for {a.run_date}; refusing to overwrite", file=sys.stderr)
            return 1
        out.write.mode("overwrite").partitionBy("ride_date").parquet(a.output)
        return 0

Three production decisions are in those lines:

- **The date is a parameter.** A backfill of 1–7 October is seven runs with seven dates; nothing reads the clock.
- **Dynamic partition overwrite.** With the default (static) mode, mode("overwrite") with partitionBy replaces
  the whole output folder — every other day is deleted. With partitionOverwriteMode=dynamic, only the ride_date
  folders present in this run's output are replaced. That makes the run idempotent per day. (Delta Lake's
  replaceWhere does the same for tables; "Warehouses and Lakehouses" covers it.)
- **A guard before writing.** An empty result for a busy city means an upstream failure, not a quiet day; the job
  exits non-zero and the orchestrator alerts.

No master in the code: local[4] in tests, the cluster manager's choice in production.

## Testing Spark code

conftest.py makes one session for all tests — starting a JVM takes seconds — with small shuffle partitions so
tiny test data does not run 200 empty tasks:

    @pytest.fixture(scope="session")
    def spark():
        s = (SparkSession.builder.master("local[2]")
             .config("spark.sql.shuffle.partitions", "2")
             .config("spark.sql.session.timeZone", "UTC").getOrCreate())
        yield s
        s.stop()

Tests build DataFrames by hand, with the cases that break jobs — duplicates, ties, the IST day boundary:

    def T(*a):
        # naive datetimes are read in the LAPTOP's timezone; make them UTC explicitly
        return dt.datetime(*a, tzinfo=dt.timezone.utc)

    def test_ist_day_boundary(spark):
        # 18:45 UTC on 5 Oct is 00:15 IST on 6 Oct
        ev = spark.createDataFrame([
            ("R1", "Pune", "completed", 24900, T(2026, 10, 5, 18, 45), T(2026, 10, 5, 19, 10), 3),
            ("R2", "Pune", "completed", 18000, T(2026, 10, 5, 12, 0), T(2026, 10, 5, 12, 30), 3),
            ("R3", "Pune", "cancelled_rider", 0, T(2026, 10, 5, 19, 0), T(2026, 10, 5, 19, 2), 2),
        ], COLS)
        expected = spark.createDataFrame([("Pune", dt.date(2026, 10, 6), 1, 24900)],
                                         "city string, ride_date date, rides long, gmv_paise long")
        assert_same_rows(build(ev, "2026-10-06"), expected)

Three things went wrong while writing these tests, and each is worth knowing:

- **pyspark.testing would not import.** PySpark 3.5's assertDataFrameEqual lives in a package that imports
  pandas-on-Spark, which still used np.NaN — removed in NumPy 2.0 — so collection failed with "AttributeError:
  np.NaN was removed in the NumPy 2.0 release". Pin numpy below 2 in the test environment, use the chispa library,
  or write the small helper this lab used:

      def assert_same_rows(actual, expected):
          assert actual.schema.simpleString() == expected.schema.simpleString()
          assert sorted(actual.collect()) == sorted(expected.collect())

- **Schemas differed only in nullability.** Comparing the schema objects failed although both printed
  struct<city:string,ride_date:date,rides:bigint,gmv_paise:bigint>: count() is non-nullable, a hand-built column
  is nullable. Compare names and types, unless nullability is part of the contract.
- **Naive datetimes moved the day.** With plain dt.datetime(2026, 10, 5, 18, 45), the IST test returned no rows:
  PySpark converted the naive value using the laptop's local timezone (IST), so it became 13:15 UTC, still 5
  October in IST. Timezone-aware values fixed it. The same test on a CI server set to UTC would have passed, which
  is exactly the kind of test that lies.

The final run: 2 passed, plus one test kept deliberately wrong to see the failure message ("At index 0 diff:
... gmv_paise=24900) != Row(... gmv_paise=25000)"), in 20.81 s, mostly JVM start-up.

## Submitting

From the Spark documentation, not run here:

    spark-submit --master yarn --deploy-mode cluster \\
      --py-files ridekaro_jobs.zip \\
      --conf spark.sql.adaptive.enabled=true \\
      --conf spark.sql.shuffle.partitions=400 \\
      --executor-memory 8g --executor-cores 4 --num-executors 10 \\
      run_daily_rides.py --input s3://ridekaro-lake/raw/ride_events/ \\
        --output s3://ridekaro-lake/curated/fct_rides_daily/ --run-date 2026-10-06

- **cluster vs client mode.** In cluster mode the driver runs on the cluster, so closing your laptop does not
  kill the job; client mode keeps the driver where you submitted (notebooks, debugging).
- **Your code** ships as --py-files (a zip or wheel). Third-party packages need to exist on every executor: a
  packed virtual environment passed with --archives (the Spark docs show venv-pack and conda-pack), a container
  image, or the platform's library feature.
- **Sizing** starts from the data: input size divided by about 128 MB gives the scan tasks; executors times cores
  is how many run at once. Tune from the Spark UI's stage view, not by guessing.
- **Logs** go to the cluster manager; enable event logs (spark.eventLog.enabled) so the history server can show
  a finished job's stages and skew after the cluster is gone.

## Where Spark runs

    Amazon EMR             Spark on EC2 clusters you size, or EMR Serverless (submit a job, no
                           cluster); steps or the orchestrator submit jobs; S3 for data
    AWS Glue               serverless Spark jobs with a catalog and its own job wrapper; billed per
                           capacity-unit time; good for scheduled ETL without cluster work
    Databricks             managed Spark on AWS, Azure and GCP, notebooks, Delta Lake, Jobs with job
                           clusters (cheaper per hour than all-purpose clusters left running)
    Azure Synapse          Spark pools next to SQL pools, in the Azure workspace
    Microsoft Fabric       Spark notebooks and jobs over OneLake / Lakehouse tables
    Kubernetes             spark-submit --master k8s://...; the most control and the most work

Pricing on all of them is compute time: instance hours (EMR on EC2), vCPU and memory per second (EMR Serverless),
capacity units (Glue, Fabric), or DBUs plus the cloud VMs (Databricks). Idle clusters are the classic waste —
use job clusters or serverless for scheduled jobs and auto-termination for interactive ones. Read the current
pricing pages; figures change.

The code in this topic runs on all of them; only the submit step and the paths change.`,
    workedExample: `**Scenario.** A bug in RideKaro's fare parsing was fixed on 8 October. fct_rides_daily must be rebuilt for 1–7
October on EMR Serverless, without touching any other day, and the team must be able to prove the rebuild changed
only those days. (Commands from the AWS and Spark documentation; not run here.)

**1. Confirm the job is safe to repeat.** It takes --run-date, filters to that IST day, and writes with
partitionOverwriteMode=dynamic, so a run for 3 October replaces only ride_date=2026-10-03. Run the unit tests first:
the IST boundary test is the one that matters for a date-scoped rebuild.

**2. Package once.** Zip ridekaro_jobs/ and upload it with the entry script:

    s3://ridekaro-artifacts/jobs/v42/ridekaro_jobs.zip
    s3://ridekaro-artifacts/jobs/v42/run_daily_rides.py     # imports main() and calls it

A versioned path means the backfill runs the exact code that was reviewed.

**3. Submit one run per date.**

    aws emr-serverless start-job-run --application-id $APP_ID \\
      --execution-role-arn $ROLE_ARN \\
      --job-driver '{"sparkSubmit": {
          "entryPoint": "s3://ridekaro-artifacts/jobs/v42/run_daily_rides.py",
          "entryPointArguments": ["--input", "s3://ridekaro-lake/raw/ride_events/",
                                  "--output", "s3://ridekaro-lake/curated/fct_rides_daily/",
                                  "--run-date", "2026-10-03"],
          "sparkSubmitParameters": "--py-files s3://ridekaro-artifacts/jobs/v42/ridekaro_jobs.zip"}}'

In practice the orchestrator does this — a backfill over a date range (the orchestration topic) — so retries,
concurrency limits and alerts come for free.

**4. Prove what changed.** Before the backfill, snapshot per-day totals (date, rides, gmv_paise) for the whole
month; after it, compare. Expected: 1–7 October differ, every other day identical. A difference on 9 October means
something other than the intended slice was overwritten — the classic cause is a job running with static
overwrite mode, which would have deleted every day not in the output.

**5. Record it.** The run IDs, the code version (v42), the dates, and the before/after table go in the incident
ticket.

**Result.** A rebuild is seven independent, repeatable runs of tested code, and the evidence that nothing else moved
is a two-column comparison.`,
    mcqs: [
      mcq('A job writes df.write.mode("overwrite").partitionBy("ride_date").parquet(path) for one run date, with Spark\'s default settings. What happens to the other dates already in path?', [
        ['They are deleted, because static overwrite replaces the whole output path', true],
        ['They are kept, because only the folders present in this output are rewritten', false],
        ['They are merged with the new rows, because Parquet files are appendable', false],
        ['The write fails, because overwrite cannot be combined with partitionBy', false],
      ], 'The default partitionOverwriteMode is static: overwrite clears the target first. Setting it to dynamic replaces only the partitions the run writes. Parquet files are not appended to, and overwrite with partitionBy is allowed.'),
      mcq('A Spark test builds rows with dt.datetime(2026, 10, 5, 18, 45) and expects the IST date 6 October. It passes in CI but fails on a developer laptop in India. Why?', [
        ['Naive datetimes are converted using the machine\'s local timezone', true],
        ['The laptop\'s Spark version formats dates in a different pattern', false],
        ['CI runs with more shuffle partitions, which changes the grouping', false],
        ['IST has daylight saving, so the offset differs by time of year', false],
      ], 'PySpark interprets a naive datetime in the Python process\'s local timezone, so 18:45 became 18:45 IST (13:15 UTC) on the laptop and stayed on 5 October. Use timezone-aware values. Partitions never change results, and India has no daylight saving.'),
      mcq('Why is a transform written as def build(events: DataFrame, run_date: str) -> DataFrame, with reading and writing left to main()?', [
        ['Tests can call it on small hand-built DataFrames, and backfills can pass any date', true],
        ['Catalyst only optimises functions that return a DataFrame, never the code inside main()', false],
        ['spark-submit requires every job to expose a function named build to run it', false],
        ['Returning a DataFrame makes Spark cache it, so the write step will be faster', false],
      ], 'Pure transforms are testable without files and reusable for any date. Catalyst optimises whatever plan is built regardless of function boundaries, spark-submit runs a script with no naming rule, and returning a DataFrame does not cache it.'),
    ],
    checkpoint: [
      ck('DATA_PIPELINES', 'A nightly Spark job is submitted in client mode from an engineer\'s laptop and dies whenever the laptop sleeps. What should change?', [
        ['Submit in cluster mode, so the driver runs on the cluster', true],
        ['Add more executors so the job finishes before the sleep', false],
        ['Use coalesce(1) so the driver has less data to manage', false],
        ['Cache the input DataFrame so the driver can resume it', false],
      ], 'In client mode the driver lives where you submitted; when it dies the job dies. Cluster mode (or an orchestrator submitting from a server) fixes it. More executors, coalescing and caching do not move the driver.'),
      ck('DATA_PIPELINES', 'A PySpark job uses the requests and pyarrow libraries inside a pandas UDF. On the cluster it fails with ModuleNotFoundError on executors only. What is the fix?', [
        ['Ship the packages to executors: a packed venv via --archives, an image, or platform libraries', true],
        ['Install the libraries on the driver machine only, since executors read imports from the driver', false],
        ['Add the library names to --py-files so that Spark downloads them onto each executor at start', false],
        ['Move the imports to the top of the file so Spark serialises the modules along with the job', false],
      ], 'UDF code runs in Python workers on every executor, which need the packages installed. Executors do not import from the driver, --py-files ships files you give it (not package names to download), and modules are not serialised with the job.'),
      ck('DATA_PIPELINES', 'A team runs a few scheduled Spark jobs a night on AWS and has no one to manage clusters. Which choice fits best?', [
        ['EMR Serverless or Glue jobs, which run without a standing cluster', true],
        ['A large always-on EMR cluster sized for the busiest night of the year', false],
        ['A self-managed Spark on Kubernetes setup on EC2 machines they patch', false],
        ['Running spark-submit in local mode on one large EC2 instance nightly', false],
      ], 'Serverless options bill for the job\'s run time and need no cluster administration. An always-on cluster wastes idle hours, Kubernetes is the most operational work, and local mode cannot scale beyond one machine.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_DEBUGGING',
    notes: `Six things that go wrong in RideKaro's Spark code. For each: the symptom, the cause, and the one change that fixes
it. Every message, count and time below came from running the broken version on PySpark 3.5.9 in local mode.
Read the error class in square brackets first — Spark 3.4+ names its errors — and then the first line of the
Python traceback that points at your code, not the hundred lines of JVM stack in between.

## 1. A filter that will not even build

**Symptom.**

    rides.filter(F.col("city") == "Pune" and F.col("status") == "completed")
    PySparkValueError: [CANNOT_CONVERT_COLUMN_INTO_BOOL] Cannot convert column into bool:
    please use '&' for 'and', '|' for 'or', '~' for 'not' when building DataFrame boolean expressions.

**Cause.** Python's and asks each side for True or False; a Column is an expression, not a value. The "fix" of
swapping in & without parentheses fails differently — F.col("city") == "Pune" & F.col("status") == "completed"
raised Py4JError: An error occurred while calling o47.and — because & binds tighter than ==, so Python tried
"Pune" & F.col("status") first.

**Fix.** (F.col("city") == "Pune") & (F.col("status") == "completed"): 269,246 rows. Or a SQL string:
rides.filter("city = 'Pune' AND status = 'completed'").

## 2. The job that dies at the very end

**Symptom.** A step that "just exports the rides to check them" fails after every task has finished:

    Total size of serialized results of 2 tasks (15.9 MiB) is bigger than spark.driver.maxResultSize (8.0 MiB)

(The limit was lowered to 8 MB to reproduce this on a laptop; the default is 1 GB. On a cluster with real data the
same code either hits that limit or runs the driver out of memory.)

**Cause.** collect() — and toPandas() — bring every row to the driver, one process with a fixed amount of memory.
Three columns of 3 million rides is already megabytes; a month of real events is gigabytes.

**Fix.** Do the work in Spark and bring back only the result: rides.groupBy("city").count().collect() returned
four rows. If the rows themselves are the output, write them (df.write.parquet) instead of collecting them. Raising
maxResultSize only moves the cliff.

## 3. Days that do not match finance

**Symptom.** The daily ride report has a row for 30 September in an October dataset, and every day's count is
slightly different from the finance system's.

**Cause.** The session timezone is UTC (as it should be) and the code grouped by F.to_date("requested_at"), the UTC
date. Rides between 00:00 and 05:30 IST belong to the previous UTC day. Completed rides on 5 October: 58,075 by
UTC date, 57,949 by IST date (the synthetic data is spread evenly through the day; real ride-hailing evening
peaks move far more).

**Fix.** F.to_date(F.from_utc_timestamp("requested_at", "Asia/Kolkata")): the dates then ran 1 to 31 October.
Keep spark.sql.session.timeZone fixed (UTC) in every job and convert to IST explicitly, once, where the business
day is decided.

## 4. dropDuplicates keeps the wrong row

**Symptom.** After deduplicating ride events, some rides show "accepted" although the rider was charged.

**Cause.** events.dropDuplicates(["ride_id"]) keeps one row per ride — whichever comes first in the partition, not
the latest. On four events (R1 accepted then completed; R2 requested then cancelled) it kept R1 accepted and R2
cancelled_rider: one right by luck, one wrong.

**Fix.** Choose the row explicitly: row_number() over Window.partitionBy("ride_id").orderBy(F.desc("event_ts"),
F.desc("seq")), keep rn = 1. dropDuplicates is only for rows that are identical in every column you care about.

## 5. A row number that runs on one core

**Symptom.** A step that numbers all rides by request time takes far longer than everything else, and the log
shows:

    WARN WindowExec: No Partition Defined for Window operation! Moving all data to a single partition,
    this can cause serious performance degradation.

**Cause.** Window.orderBy("requested_at") with no partitionBy: the plan has Exchange SinglePartition, so 3 million
rows went to one task — 19.3 s, on a laptop; on a cluster, one executor's memory.

**Fix.** Ask whether a global number is needed. Per-city or per-day numbering partitions the window. If you need
a unique id, F.monotonically_increasing_id() is unique (not consecutive) without a shuffle. If you need a rank of
a small aggregate, aggregate first, then window.

## 6. The plan that takes ten seconds to build

**Symptom.** A feature step adds 150 derived columns in a for loop with withColumn. The cell takes seconds before
any job starts, and grows slower as columns are added.

**Cause.** Each withColumn creates a new DataFrame and the analyser re-processes the growing plan every time.
Building 150 columns that way took 9.84 s; nothing had run yet.

**Fix.** One select with a list of expressions:

    df.select("*", *[(F.col("fare_paise") + i).alias(f"c{i}") for i in range(150)])

0.38 s to build the same plan. (withColumns, with a dict, does the same in Spark 3.3+.)

## The habit

Each fix came from reading the error class, the plan, or a row count — not from changing settings until it worked.
When a Spark job misbehaves: read the first Python frame of the traceback, run explain(), count rows per key and
per partition, and check the timezone.`,
    mcqs: [
      mcq('A step ends with "Total size of serialized results ... is bigger than spark.driver.maxResultSize". The code ends in rides.select(...).collect(). What is the right fix?', [
        ['Aggregate or write in Spark, and collect only a small result', true],
        ['Raise spark.driver.maxResultSize until the error message goes away', false],
        ['Add more executors so each task returns a smaller result', false],
        ['Repartition into more partitions before calling collect()', false],
      ], 'collect() moves every row into the driver; the fix is not to need them there. A higher limit only moves the failure to driver memory, and more executors or partitions split the same total across more tasks without reducing it.'),
      mcq('A daily report grouped by F.to_date("requested_at") shows a 30 September row for October data. The session timezone is UTC. What is wrong?', [
        ['It groups by the UTC date; IST early-morning rides fall on the previous day', true],
        ['The Parquet reader shifts every timestamp by the laptop\'s local timezone', false],
        ['to_date truncates timestamps to midnight IST and loses the first few hours', false],
        ['Timestamps were stored as strings, so the dates sort in the wrong order', false],
      ], 'Rides from 00:00 to 05:30 IST on 1 October are still 30 September in UTC. Convert with from_utc_timestamp(..., "Asia/Kolkata") before taking the date. The reader keeps instants as stored, to_date uses the session zone (UTC here), and the column was a real timestamp.'),
      mcq('events.dropDuplicates(["ride_id"]) leaves some rides as "accepted" when they were completed. Why?', [
        ['It keeps an arbitrary row per ride, not the latest event', true],
        ['It keeps the first row by event_ts, which is the oldest', false],
        ['It keeps the row with the smallest status alphabetically', false],
        ['It drops every ride that has more than one event row', false],
      ], 'dropDuplicates on a subset keeps whichever row it meets first in each partition; there is no ordering. Choose explicitly with row_number over a window ordered by event time and a tie-breaker. It does not sort by time or status, and it keeps one row rather than dropping the ride.'),
      mcq('A loop adds 150 columns with withColumn and takes about 10 seconds before any Spark job starts. What change helps?', [
        ['Build all the columns in one select with a list', true],
        ['Call cache() after every withColumn in the loop', false],
        ['Raise spark.sql.shuffle.partitions for the step', false],
        ['Use a pandas UDF to add the columns as a batch', false],
      ], 'Each withColumn re-analyses a growing plan; one select builds one projection (0.38 s against 9.84 s in the lab). Caching runs jobs and makes it slower, shuffle partitions are irrelevant before execution, and a UDF adds Python overhead.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_PRACTICE',
    notes: `Eight exercises, easiest first. Write each answer, then compare. The PySpark answers were run on the RideKaro data
from the lessons (3 million rides, 1.95 million payment attempts) and match the outputs shown; the sizing
arithmetic was checked in Python.

## 1. Transformation or action? (easy)

Which of these start a job: (a) rides.filter("city = 'Pune'"); (b) rides.count(); (c) rides.join(zones,
"zone_id"); (d) rides.write.parquet(path); (e) rides.groupBy("city"); (f) rides.toPandas(); (g) rides.cache()?

**Answer.** (b), (d) and (f). (a), (c) and (e) are transformations; (g) only marks the DataFrame for caching —
the cache fills on the next action.

## 2. Count the shuffles (easy)

rides.filter(...).join(zones, "zone_id").groupBy("city").agg(F.sum("fare_paise")).orderBy("city") — zones is 300
rows. How many Exchanges will the plan have?

**Answer.** Two (plus a broadcast). zones is broadcast (BroadcastExchange, no shuffle of rides), the groupBy adds
hashpartitioning(city), and orderBy adds rangepartitioning(city). AQE may coalesce both to tiny partition
counts, but they are still shuffles.

## 3. Write it in both APIs (easy)

Completed rides per city with average distance, in the DataFrame API and in Spark SQL.

**Answer.**

    rides.filter(F.col("status") == "completed").groupBy("city") \\
         .agg(F.count("*").alias("rides"), F.round(F.avg("distance_km"), 2).alias("avg_km"))

    SELECT city, count(*) AS rides, round(avg(distance_km), 2) AS avg_km
    FROM rides WHERE status = 'completed' GROUP BY city

Both: Bengaluru 901,708 / 6.0; Hyderabad 359,961 / 6.0; Chennai 270,292 / 6.01; Pune 269,246 / 5.99.

## 4. Choose the join (medium)

For each, broadcast or sort-merge? (a) rides (900 million rows) to zones (300 rows); (b) rides to payments (1
billion rows); (c) rides to a drivers table of 2 million rows, about 150 MB.

**Answer.** (a) Broadcast — automatic. (b) Sort-merge: both are large. (c) Usually sort-merge by default (above
the 10 MB threshold); a broadcast of 150 MB is possible with the hint if executors have the memory, and is often
faster — measure it. Never broadcast the big side.

## 5. Size the shuffle (medium)

A groupBy shuffles about 120 GB. AQE is on. What would you set spark.sql.shuffle.partitions to, and why?

**Answer.** About 600–1,200, for partitions of 100–200 MB (120 GB / 200 MB = 600). The default 200 gives 600 MB
partitions, which spill and run slowly; AQE can merge partitions that are too small but cannot split partitions
that are too big for aggregation (only skewed join partitions).

## 6. Find and fix the skew (medium)

A join of rides to drivers has one task of 909,717 rows and a median of 10,482. Write the query that finds the
cause, and give two fixes.

**Answer.** rides.groupBy("driver_id").count().orderBy(F.desc("count")).show(3) — D000000 has 899,457 rides, the
"no driver" placeholder. Fix 1: filter or separately handle the placeholder (it also corrected bike rides from
1,601,840 to 702,383). Fix 2: AQE skew join with a suitable threshold (skew=true in the plan), or salting with the
drivers side replicated per salt value.

## 7. Latest status per ride (medium)

Ride events can repeat and two can share a timestamp. Keep the latest per ride, deterministically.

**Answer.**

    w = Window.partitionBy("ride_id").orderBy(F.desc("event_ts"), F.desc("seq"))
    latest = events.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")

On the lesson's eight events: R101 completed, R102 cancelled_rider, R103 accepted. Not dropDuplicates.

## 8. Replace the UDF (harder)

A job uses a Python UDF: return "airport" if zone_name starts with "KIA", "late_night" if the IST hour is 0–4,
else "regular". Rewrite it with built-ins and say how you would show the gain.

**Answer.**

    ist_hour = F.hour(F.from_utc_timestamp("requested_at", "Asia/Kolkata"))
    F.when(F.col("zone_name").startswith("KIA"), "airport") \\
     .when(ist_hour < 5, "late_night").otherwise("regular")

Show it with explain() (BatchEvalPython gone) and a timing of both on the same data: in the lesson's fare-band
test, the built-in took 0.38 s against 6.94 s for the Python UDF. Check the counts per category match before
switching.`,
    mcqs: [
      mcq('rides.cache() is called, then nothing else. How much data is in memory?', [
        ['None yet; the cache fills on the next action', true],
        ['All of rides, read eagerly at the cache call', false],
        ['Only the schema and a sample of the rows', false],
        ['Only the partitions that fit in driver memory', false],
      ], 'cache() is lazy: it marks the DataFrame, and the first action that computes it stores the partitions on executors. Nothing is read at the call, no sample is taken, and cached data lives on executors, not the driver.'),
      mcq('A groupBy shuffles about 120 GB and spark.sql.shuffle.partitions is left at 200. Which setting is more sensible?', [
        ['About 600 to 1,200, giving partitions of roughly 100–200 MB', true],
        ['8, one for each executor, so each task handles one large slice', false],
        ['20,000, so that every partition stays under 10 MB in size', false],
        ['200 is always fine because AQE will split partitions that are too big', false],
      ], 'Size partitions for 100–200 MB: 120 GB / 200 MB is 600. Eight tasks of 15 GB would spill and lose parallelism, 20,000 tiny tasks waste scheduling, and AQE merges small partitions (and splits skewed joins) but does not split oversized aggregation partitions.'),
      mcq('Which query is the fastest way to find out why one join task holds 900,000 rows?', [
        ['Count rows per join key and look at the top few', true],
        ['Rerun the job with twice the number of executors', false],
        ['Read the executor logs for out-of-memory messages', false],
        ['Run explain(True) and read the optimised logical plan', false],
      ], 'A per-key count names the hot key directly (D000000 in the lab). More executors do not split one task, logs show symptoms not causes, and the plan is the same for skewed and even data.'),
      mcq('A plan for rides joined to a 300-row zones table, then grouped by city and ordered by city, shows how many shuffle Exchanges?', [
        ['Two: one for the groupBy and one for the orderBy', true],
        ['Three: one each for the join, groupBy and orderBy', false],
        ['One: Spark merges the groupBy and orderBy shuffles', false],
        ['None: AQE removes shuffles for small final results', false],
      ], 'zones is broadcast, so the join adds a BroadcastExchange but no shuffle of rides; groupBy adds a hash exchange and orderBy a range exchange. They are not merged, and AQE coalesces partitions without removing the exchanges.'),
      mcq('A Python UDF tags rides as "airport", "late_night" or "regular". What should replace it?', [
        ['F.when chains on startswith and the IST hour, checked against the old counts', true],
        ['A pandas UDF with the same logic, since pandas UDFs are compiled by Spark', false],
        ['The same Python UDF, cached so it is only evaluated once per ride id', false],
        ['A broadcast of the rides table so the UDF can run on the driver instead', false],
      ], 'Built-in expressions stay in the JVM and remove the EvalPython step; compare category counts before switching. Pandas UDFs are faster than row UDFs but still leave the JVM and are not compiled, caching does not remove the UDF cost, and nothing should broadcast the big table.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_INTERVIEW_QUESTION',
    notes: `Asked in data engineer interviews at product companies, GCCs and IT services firms in Bengaluru, Hyderabad, Pune and
Chennai — often in a round where the interviewer shares a Spark UI screenshot or a slow job's code. Say each answer
aloud in about two minutes, then compare. Interviewers listen for mechanism (what moves where) and for evidence
(how you would know), not for a list of settings.

## Q1. "What happens when you run a PySpark job? Explain transformations, actions and lazy evaluation."

**Model answer.** "My code runs in the driver and only builds a logical plan; filter, select, join and groupBy are
transformations that return new DataFrames without reading anything. When an action runs — count, collect, write —
Catalyst analyses and optimises the plan, pushing filters into the file scan and pruning columns, then turns it
into a physical plan. The plan is cut into stages at every shuffle; each stage runs one task per partition on the
executors. So one action is one job, made of stages, made of tasks. Laziness is what lets Spark optimise the whole
pipeline — and it also means errors in data appear only at the action, and every action recomputes from the source
unless I cache. In a lab I saw a 3-million-row aggregate defined in 0.3 seconds and run in about 4.5."

**Follow-up.** "So is everything lazy?" — "Analysis is eager: a misspelt column fails immediately with an
AnalysisException. Execution is lazy. And with AQE, parts of the physical plan are decided at run time, after
shuffle sizes are measured."

## Q2. "What is a shuffle, and how do you reduce it?"

**Model answer.** "A shuffle redistributes rows across executors so that equal keys meet — groupBy, distinct,
join, orderBy, window partitionBy, repartition. Each map task writes its output to local disk by target partition,
and reduce tasks fetch their pieces over the network. It is the most expensive operation and shows as Exchange in
the plan. To reduce it: broadcast small tables instead of sort-merge joins; filter and select before wide
operations; aggregate before joining when the question allows; avoid repartitioning without a reason; and size
spark.sql.shuffle.partitions for the data, around 100 to 200 MB a partition, with AQE on to coalesce small ones.
On a laptop test, broadcasting a 60,000-row dimension took a join from about 10.7 to 3.7 seconds."

**Follow-up.** "repartition or coalesce before a write?" — "coalesce to reduce the file count cheaply when the
data is already reasonably balanced; repartition, by the output partition column, when I need even files or one
file set per partition value. coalesce(1) on big data puts all the work in one task."

## Q3. "One task in a stage runs for an hour while the others finish in a minute. What do you do?"

**Model answer.** "That is skew. I confirm it in the Spark UI — max task duration and shuffle read far above the
median — then count rows per key on the join or group key. Often the hot key is junk: NULLs, a placeholder like
'unknown', a test account. Then the fix is to filter it or handle it separately, and it is frequently a
correctness bug too. If the key is real, I check AQE's skew join is on — it splits partitions bigger than five
times the median and above a byte threshold — and if that is not enough, or it is an aggregation, I salt the key:
a random suffix on the big side and the small side replicated per suffix, or a two-step aggregation. More
executors do not help; one task runs on one core."

**Follow-up.** "AQE is on but it did not split the partition. Why?" — "It judges by shuffle bytes, not rows. If
the hot partition compresses below the threshold, nothing happens even though the task processes millions of
rows. I would lower the threshold for that job, or salt."

## Q4. "When would you cache a DataFrame — and when not?"

**Model answer.** "When it is expensive to compute and reused by several actions in the same job — a cleaned,
deduplicated, joined dataset that feeds three outputs. Cache is lazy, filled by the next action, stored on
executors as MEMORY_AND_DISK for DataFrames, and I unpersist it when done. Not when it is used once, and not for a
cheap columnar scan: in a test, filling a cache took 13.5 seconds to save about 1.5 seconds across three reports,
because re-reading pruned Parquet columns was cheap. Caching also takes executor memory away from shuffles and
joins. And for reuse across jobs, I write a table instead — a cache dies with the application."`,
    mcqs: [
      mcq('An interviewer asks what triggers a Spark job to actually run. Which answer is complete and correct?', [
        ['An action; transformations only build a plan that runs when an action needs it', true],
        ['Each transformation runs a small job, and actions only collect what was computed', false],
        ['The plan runs when the SparkSession is created, and actions only display results', false],
        ['Jobs run on a timer every few seconds, processing whatever transformations exist', false],
      ], 'Transformations are lazy and actions (count, write, collect) trigger jobs. Transformations do not run jobs one by one, creating a session reads nothing, and Spark batch jobs are not run on a timer.'),
      mcq('Asked how to fix a skewed join, which answer would an interviewer rate highest?', [
        ['Find the hot key first; filter it if junk, else AQE skew join or salting', true],
        ['Add executors and memory until the slow task fits and finishes on time', false],
        ['Set spark.sql.shuffle.partitions to 10,000 so the hot key is spread out', false],
      ], 'Diagnosis first, then the fix that matches the cause. One task cannot use more executors, and more partitions cannot split a single key: all its rows hash to the same partition.'),
      mcq('An interviewer asks why AQE might not split a skewed partition. Which explanation is accurate?', [
        ['It decides by shuffle bytes, and a compressed hot partition can fall under the threshold', true],
        ['It only acts on aggregations and never changes a sort-merge join between two big tables', false],
        ['It needs the cost-based optimiser and table statistics to be computed before the job runs', false],
      ], 'Skew detection compares partition sizes in bytes against the median factor and a threshold; rows that compress well can escape it. AQE does split sort-merge joins, and it uses runtime shuffle statistics rather than precomputed table statistics.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_MINI_PROJECT',
    notes: `## The brief

RideKaro, a ride-hailing company in Bengaluru, Hyderabad, Chennai and Pune, wants a nightly Spark job that turns a
month of raw ride and payment events into three curated tables that finance and operations can trust. The current
prototype is a notebook: it double-counts some rides, puts late-night rides on the wrong day, and its vehicle report
takes forever on one stage. You will rebuild it as a tested PySpark job, find and fix a skewed join, write
partitioned Parquet, and report run times before and after tuning, with the plans that explain them.

## The data you generate

Write gen_data.py with numpy and pyarrow (seeded, so a reviewer gets identical files). October 2026, IST.

- **ride_events** (about 6 million rows, Parquet, several files): ride_id, rider_id, driver_id, city, zone_id,
  status (requested, accepted, completed, cancelled_rider, cancelled_driver, no_driver), event_ts (UTC), seq,
  distance_km, fare_paise. Every ride has 1–3 status events. Plant: 1% of events duplicated exactly; 0.5% of rides
  with two events sharing an event_ts (seq breaks the tie); rides with status no_driver carry driver_id D000000
  (about 30% of rides); 2% of events arrive with event_ts in the last 90 minutes of the IST day.
- **payments** (about 2 million rows): ride_id, attempt, method (UPI, card, cash, wallet), pay_status (success,
  failed), amount_paise, paid_at. About 8% of completed rides have a failed attempt before the success; plant 200
  completed rides with no successful payment.
- **drivers** (60,001 rows including D000000) and **zones** (300 rows, including four airport zones whose
  zone_name starts with "KIA").
- **webhooks** (JSON lines, 50,000 rows): nested payment-gateway events with a lines array (fare, toll, platform
  fee), a tags map with an optional promo code, and 20 truncated lines.

## What the job produces

1. **fct_rides** — one row per ride: final status (latest event, deterministic), IST ride_date, city, zone,
   driver_id (NULL for unassigned), vehicle, fare, paid flag, payment method of the successful attempt, toll from
   the webhook lines, promo.
2. **agg_city_day** — one row per city per IST day: completed rides, GMV, UPI share, unpaid completed rides.
3. **agg_vehicle_day** — one row per vehicle type per IST day, excluding unassigned rides — the report that was
   wrong and slow.

Write each as Parquet partitioned by ride_date. On Linux, WSL2 or Docker, use Spark's writer with dynamic partition
overwrite. On Windows without winutils, write with pyarrow (pq.write_to_dataset with partition_cols) or the
deltalake package from toPandas() of each day's slice, and say so in the README.

## Deliverables

- ridekaro_jobs/ — pure transform functions (DataFrame in, DataFrame out) and a main(argv) taking --input,
  --output and --run-date; a guard that refuses to write an empty day.
- tests/ — pytest with a session-scoped SparkSession: dedup with duplicates and ties, the IST boundary (timezone-
  aware datetimes), a ride with only a failed payment, an empty webhook lines array, the placeholder driver.
- reconcile.py — rides in raw versus fct_rides, GMV in fct_rides versus agg_city_day, unpaid rides equal to the
  200 planted.
- PERFORMANCE.md — for the vehicle report: explain() before and after, rows per partition after the join (max,
  median), and run times as the median of five interleaved runs, with the machine described honestly.
- README.md — how to generate data, run tests, run the job for one date and for a range, and the decisions you
  made.

## Milestones

**Day 1 — data and baseline.** Generator done; load everything; print schemas; count events, rides, duplicates and
the placeholder share. Write the notebook-style version of the vehicle report and time it: this is your "before".

**Day 2 — correctness.** Latest event per ride with a window and a tie-breaker; IST dates with
from_utc_timestamp; payments joined at one row per ride; webhooks parsed with a declared schema (a map for tags),
tolls summed with F.filter and F.aggregate; reconciliation passing. Tests green.

**Day 3 — performance.** Read every plan. Broadcast zones and drivers where it helps; prune columns before joins;
set shuffle partitions for the data. Diagnose the vehicle report's skew: rows per partition, then the hot key.
Fix it three ways and time each: (a) handle unassigned rides separately (also the correctness fix); (b) AQE skew
join with a threshold suited to your data (show skew=true in the plan); (c) salting with the drivers side
replicated. No Python UDFs anywhere, or justify one with a timing.

**Day 4 — package and present.** Partitioned output, idempotent per date (run a date twice and show the files and
totals are unchanged), README, PERFORMANCE.md, and a three-minute explanation of the slowest stage before and after.

## What a strong submission looks like

- The vehicle report's numbers change when unassigned rides are handled — and the README says why the old numbers
  were wrong, not only that the new job is faster.
- Timings are reported with medians and spread, from interleaved runs, with the plan line that explains each gain.
  "It got faster" without a plan is not evidence.
- The job can run any date, twice, without changing anything the second time.
- Tests fail for the right reason when you break the code (try it: remove the tie-breaker).

## Hints

- spark.sql.session.timeZone = UTC in the job and the tests; convert to IST once.
- On a 4-core laptop, skew costs less than on a cluster because the long task overlaps the others: report rows per
  partition as well as time — that is the number that predicts the cluster gain.
- If AQE does not split your skewed partition, check its compressed size against
  spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes before concluding anything.`,
    assignment: {
      title: 'RideKaro Rides: a Tested, Tuned PySpark Job',
      description: 'Build a PySpark job for a fictional Bengaluru ride-hailing company that cleans, deduplicates and joins a month of synthetic ride, payment and webhook events into three IST-day tables, fixes a skewed join, writes partitioned Parquet idempotently, and reports run times before and after tuning with the plans that explain them.',
      instructions: `1. Write gen_data.py (seeded) to create ride_events, payments, drivers, zones and webhooks with every planted problem in the brief.
2. Build ridekaro_jobs/ with pure transforms and main(argv) taking --input, --output and --run-date, with an empty-day guard.
3. Produce fct_rides, agg_city_day and agg_vehicle_day at the stated grains, using IST dates, deterministic dedup and no unjustified Python UDFs.
4. Write pytest tests for duplicates and ties, the IST boundary, failed-only payments, empty webhook arrays and the placeholder driver.
5. Write reconcile.py and show it passing; show it failing when you remove the dedup step.
6. Diagnose the vehicle report's skew (rows per partition, hot key) and fix it by separate handling, by AQE skew join (skew=true in the plan) and by salting; time each as the median of five interleaved runs.
7. Write partitioned Parquet (Spark's writer, or pyarrow/deltalake on Windows, stated in the README) and prove a second run for the same date changes nothing.
8. Submit the repository with README.md and PERFORMANCE.md (plans, partition statistics, timings, machine description).`,
      rubric: [
        { criterion: 'Correctness of the tables', description: 'Latest status per ride is deterministic; IST dates are right at the boundary; payments joined without fan-out; unassigned rides excluded from the vehicle report; webhook tolls and promos parsed correctly; reconciliation passes and catches a planted error.', maxPoints: 30 },
        { criterion: 'Skew diagnosis and fixes', description: 'Rows per partition and the hot key shown; three fixes implemented; skew=true visible for AQE; salted join gives the same answer; the effect of each fix is explained with the plan and partition statistics.', maxPoints: 20 },
        { criterion: 'Performance evidence', description: 'Plans before and after for each change; broadcast and pruning decisions justified; shuffle partitions sized for the data; timings are medians of interleaved runs with spread and an honest machine description.', maxPoints: 15 },
        { criterion: 'Job structure and idempotence', description: 'Pure transforms, a date-parameterised main, an empty-day guard, dynamic partition overwrite or an equivalent; a repeated run for the same date leaves files and totals unchanged.', maxPoints: 15 },
        { criterion: 'Tests', description: 'Session-scoped SparkSession, timezone-aware test data, the listed edge cases covered, and tests that fail when the logic is broken.', maxPoints: 12 },
        { criterion: 'README and explanation', description: 'A teammate can generate data, run tests and run the job in fifteen minutes; decisions and the old report\'s error are explained clearly.', maxPoints: 8 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the project, the vehicle report changes after unassigned rides are handled separately. What should the README say about the old numbers?', [
        ['They were wrong: placeholder rides were counted under the placeholder driver\'s vehicle', true],
        ['They were right, and the new job only reorganises the work to make it run faster', false],
        ['They were wrong because AQE was off, which made the sort-merge join silently drop many rows', false],
        ['They differ only by rounding, because the salted join adds random noise to sums', false],
      ], 'The placeholder D000000 matched a real-looking drivers row, so about 900,000 rides with no driver were reported as one vehicle type. AQE and salting change speed, never results, and salting is exact.'),
      mcq('The project asks for timings as the median of five interleaved runs on a described machine. Why interleaved?', [
        ['Background load then affects every variant alike, so comparisons stay fair', true],
        ['Spark caches the plan after one run, so later runs of the same variant are free', false],
        ['Interleaving forces AQE to re-plan, which makes all the runs the same', false],
        ['Running a variant five times in a row would fail with a shuffle error', false],
      ], 'On a shared laptop the load changes minute to minute; round-robin runs spread that noise across all variants, and the median resists outliers. Plans are not cached into free runs, AQE re-plans every run anyway, and repeated runs do not fail.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SPARK_CHECKPOINT',
    notes: `Ten questions across the topic: how Spark runs your code, the DataFrame API, partitions, shuffles and joins, skew
and caching, windows, UDFs and nested data, and shipping a job. Answer without notes; the result shows which
lesson to revisit.`,
    checkpoint: [
      mcq('A notebook prints rides.count(), completed.count() and daily.count() while building a pipeline. Nothing is cached. How many times is the source read?', [
        ['Three, once for each action', true],
        ['Once, shared by all the counts', false],
        ['Twice, since counts are cached', false],
        ['None, counts use file metadata', false],
      ], 'Each action is a separate job that recomputes its plan from the source unless a DataFrame is cached. Spark does not share work across actions automatically, and these counts follow filters and aggregations, so metadata cannot answer them.'),
      mcq('Which plan line shows that a filter was handed to the Parquet reader?', [
        ['PushedFilters: [IsNotNull(status), EqualTo(status,completed)]', true],
        ['Filter (isnotnull(status) AND (status = completed)) in a stage', false],
        ['AdaptiveSparkPlan isFinalPlan=false at the top of the plan', false],
        ['Exchange hashpartitioning(status, 200) below the aggregate', false],
      ], 'PushedFilters on the FileScan means the reader can skip row groups using statistics. A Filter operator alone runs after rows are read, isFinalPlan is about AQE, and an Exchange is a shuffle.'),
      mcq('completed rides joined to all payment attempts produce more rows than there are completed rides. What is the cause?', [
        ['Some rides have more than one payment row', true],
        ['The join used a broadcast of the wrong side', false],
        ['AQE added rows while coalescing partitions', false],
        ['The shuffle duplicated rows across partitions', false],
      ], 'A key repeated on the other side multiplies rows: failed attempts before a success. Join strategy, AQE and shuffles change performance, never the number of rows a join returns.'),
      mcq('A 300-row zones table is joined to 900 million rides. What should the physical plan show?', [
        ['BroadcastHashJoin, with no Exchange on the rides side', true],
        ['SortMergeJoin, with an Exchange and Sort on both sides', false],
        ['A Cartesian product, filtered afterwards by zone_id', false],
        ['ShuffledHashJoin, with zones shuffled into 200 parts', false],
      ], 'The small table is broadcast to every executor, so rides stay where they are. A sort-merge join would shuffle 900 million rows for no reason; a Cartesian product is never needed for an equi-join.'),
      mcq('With AQE off, which setting decides how many partitions a groupBy produces?', [
        ['spark.sql.shuffle.partitions', true],
        ['spark.sql.files.maxPartitionBytes', false],
        ['spark.default.parallelism only', false],
        ['spark.sql.autoBroadcastJoinThreshold', false],
      ], 'Every DataFrame shuffle produces spark.sql.shuffle.partitions partitions (200 by default). maxPartitionBytes sets input splits, default.parallelism applies to RDD operations, and the broadcast threshold only affects join strategy.'),
      mcq('A join stage has one task with 909,717 rows and a median of 10,482. The hot key is a placeholder for rides with no driver. What is the best first fix?', [
        ['Handle the placeholder rides separately, since they should not join a driver', true],
        ['Raise spark.sql.shuffle.partitions so the hot key is spread across partitions', false],
        ['Cache the rides DataFrame so the large task reads its rows from memory', false],
        ['Double the executor memory so the large task does not spill to the disk', false],
      ], 'A placeholder key is usually both the skew and a correctness bug; filtering it fixes both. All rows of one key hash to one partition whatever the count, caching does not split a task, and more memory only makes the long task fail less.'),
      mcq('A DataFrame is used by exactly one action and is cheap to read from Parquet. What does calling cache() on it do?', [
        ['Adds the cost of building the cache without any reuse to repay it', true],
        ['Speeds up the single action, since memory is faster than the disk', false],
        ['Nothing, since Spark ignores cache() on DataFrames read from files', false],
        ['Makes the result persist for the next day\'s run of the same job', false],
      ], 'In the lab a single use took 0.89 s without cache and 14.13 s with cache, count and use. Spark does honour cache(), and a cache lives only as long as the application.'),
      mcq('Which is the fastest way to label fares as low, mid or high in PySpark?', [
        ['F.when(...).when(...).otherwise(...) on the fare column', true],
        ['A pandas UDF that returns the label as a pandas Series', false],
        ['A Python UDF declared with a string return type', false],
        ['toPandas(), label in pandas, then createDataFrame', false],
      ], 'Built-in expressions run in the JVM: 0.38 s against about 6.9 s for both UDF kinds in the lab. Collecting to pandas moves all rows through the driver and does not scale.'),
      mcq('An ordered window has no partitionBy and runs over all raw events. What does the plan show?', [
        ['Exchange SinglePartition, sending every row to one task', true],
        ['Exchange hashpartitioning by the orderBy column, 200 ways', false],
        ['BroadcastExchange of the events to every executor', false],
        ['No Exchange at all, since windows are narrow operations', false],
      ], 'Without partitionBy every row belongs to one window, so Spark moves all data to a single partition and warns about it. Hash partitioning needs a partition key, events are not broadcast, and windows with partitionBy are wide too.'),
      ck('DATA_PIPELINES', 'A nightly job overwrites a ride_date-partitioned Parquet table for one run date. Which setting keeps the other dates intact?', [
        ['spark.sql.sources.partitionOverwriteMode set to dynamic', true],
        ['spark.sql.adaptive.enabled set to true for the session', false],
        ['spark.sql.shuffle.partitions set to the number of days', false],
        ['mode("append") with partitionBy and a dedup afterwards', false],
      ], 'Dynamic mode replaces only the partitions present in the output; static (the default) clears the whole path. AQE and shuffle partitions do not affect overwrite scope, and append makes retries double-count until some later dedup runs.'),
    ],
  },
];
