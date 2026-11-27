import { SeedBook } from '../types';

/**
 * Data Engineer track interview questions.
 * Python examples use Python 3; Spark examples use PySpark 3; Airflow examples use Airflow 2.4+ syntax.
 */
const book: SeedBook = {
  slug: 'track-data-engineering',
  title: 'Data Engineer Interview Questions',
  kind: 'topic',
  subject: 'Data Engineer',
  description: 'The 40 questions data engineer freshers face: data modelling and SQL, Python, Linux and Docker, ETL, Spark and lakehouse, dbt, Airflow, Kafka, data quality and scenario rounds.',
  color: '#1e293b',
  emblem: '🛢️',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['DATA_ENGINEERING'],
  order: 205,
  chapters: [
    {
      title: 'Databases, SQL and Data Modelling',
      questions: [
        {
          q: `What is the difference between OLTP and OLAP systems?`,
          a: `| | OLTP (Online Transaction Processing) | OLAP (Online Analytical Processing) |
|---|---|---|
| Purpose | Run the business: place orders, transfer money | Analyse the business: reports, dashboards, ML |
| Queries | Many small reads and writes on a few rows | Fewer, large scans and aggregations over millions of rows |
| Design | Normalised (3NF) to avoid update anomalies | Denormalised star schemas for fast reads |
| Storage | Row-oriented | Usually column-oriented |
| Examples | MySQL, PostgreSQL, Oracle, SQL Server behind an app | Snowflake, BigQuery, Redshift, Synapse, Databricks SQL |
| Data | Current state | History over months or years |

A data engineer's core job is moving data from OLTP systems (and APIs, files, events) into the OLAP platform reliably. Running heavy analytics directly on the production OLTP database slows down the app for real users, which is why a separate warehouse or lakehouse exists.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `Explain fact and dimension tables, and the difference between a star schema and a snowflake schema.`,
          a: `- A **fact table** stores measurable events at a defined grain: one row per order line, with numeric **measures** (quantity, amount) and **foreign keys** to dimensions.
- A **dimension table** stores descriptive context used to filter and group: date, customer, product, store.

**Star schema**: the fact table sits in the centre and each dimension is a single, denormalised table joined directly to it. For example, \`dim_product\` contains product name, category and brand in one table.

**Snowflake schema**: dimensions are normalised into sub-tables, such as \`dim_product\` > \`dim_category\` > \`dim_department\`.

| | Star | Snowflake |
|---|---|---|
| Joins | Fewer, simpler queries | More joins |
| Storage | Some repeated text | Less redundancy |
| BI tools | Preferred (Power BI, Tableau) | Acceptable |

Most modern warehouses prefer the **star schema**, because storage is cheap and columnar compression handles repeated values well, while simpler joins help both performance and analysts.`,
          d: 'easy',
          at: 'Service companies, analytics firms',
          tip: `Always state the grain of the fact table first; interviewers look for that word.`,
        },
        {
          q: `Why are warehouse tables often denormalised when databases teach normalisation?`,
          a: `**Normalisation** (1NF, 2NF, 3NF) splits data into many related tables so each fact is stored once. In OLTP systems this prevents update anomalies: change a customer's address in one place and it is correct everywhere. Writes are small and frequent, so this design fits.

In a **warehouse**, the workload is the opposite: data is loaded in batches and then **read** many times by large analytical queries. Here, many joins are expensive and confusing for analysts. So we **denormalise**:

- Dimensions carry descriptive attributes together (product with its category and brand).
- Wide "one big table" models are sometimes built for specific dashboards.

Trade-offs of denormalisation:

- More storage, though columnar compression reduces the cost.
- Updates must be handled by the pipeline (rebuild or merge), not by the app.
- Risk of inconsistency if the transformation logic is wrong, so it needs tests.

So both are correct, for different workloads: normalise for transactions, denormalise for analytics.`,
          d: 'easy',
        },
        {
          q: `What are Slowly Changing Dimensions? Explain SCD Type 1, 2 and 3.`,
          a: `Dimension attributes change over time (a customer moves from Pune to Bengaluru). An **SCD type** decides how history is kept.

- **Type 1, overwrite**: update the row in place. No history. Use for corrections (fixing a spelling).
- **Type 2, add a new row**: close the old row and insert a new one, so every version is kept. Facts link to the version that was valid when they happened.
- **Type 3, add a column**: keep \`previous_city\` and \`current_city\`. Only one level of history.

SCD Type 2 table:

| customer_sk | customer_id | city | valid_from | valid_to | is_current |
|---|---|---|---|---|---|
| 101 | C7 | Pune | 2023-01-10 | 2025-06-30 | false |
| 245 | C7 | Bengaluru | 2025-07-01 | 9999-12-31 | true |

Note the **surrogate key** (\`customer_sk\`): the business key \`C7\` repeats, so facts must reference the surrogate key to point to the right version. Type 2 is the most asked about, because "sales by customer city at the time of purchase" needs it.`,
          d: 'medium',
          at: 'Service companies, consulting, product companies',
          tip: `Draw the Type 2 table with valid_from, valid_to and is_current; it answers most follow-ups.`,
        },
        {
          q: `What is the grain of a fact table? What are additive, semi-additive and non-additive measures?`,
          a: `The **grain** is exactly what one row of the fact table represents, for example "one row per order line per day". Declaring it first is the most important modelling step: it decides which dimensions apply and prevents mixing levels (order header totals with line items), which causes double counting.

Measures by how they can be summed:

- **Additive**: can be summed across all dimensions. Quantity sold, sales amount.
- **Semi-additive**: can be summed across some dimensions but **not time**. Account balance or inventory on hand: adding the balance for every day of the month is meaningless; use the end-of-period or average value instead.
- **Non-additive**: cannot be summed at all. Ratios and percentages such as margin % or conversion rate, and distinct counts. Store the numerator and denominator as additive measures and compute the ratio at query time.

Common fact table types: **transaction** facts (one row per event), **periodic snapshot** facts (one row per account per day, where semi-additive measures live) and **accumulating snapshot** facts (one row per order that is updated as it moves through milestones).`,
          d: 'medium',
        },
        {
          q: `How do indexing and partitioning help query performance in databases and warehouses?`,
          a: `**Indexes** (OLTP databases such as PostgreSQL and MySQL) are B-tree structures that let the database find rows without scanning the whole table, like a book's index. They speed up \`WHERE\`, \`JOIN\` and \`ORDER BY\` on indexed columns, but slow down inserts and updates and use storage. A composite index on \`(customer_id, order_date)\` helps queries that filter on customer_id first.

**Partitioning** splits a large table into parts by a column, usually a date. A query with \`WHERE order_date = '2025-10-01'\` reads only that partition (**partition pruning**).

In cloud warehouses and lakes, which are columnar and mostly do not use traditional indexes:

- **Partitioning** by date (BigQuery partitioned tables, folder partitions in a data lake).
- **Clustering / sort keys** to co-locate related rows inside partitions (BigQuery clustering, Snowflake clustering keys, Redshift sort keys, Delta Lake Z-ordering or liquid clustering).

Choose partition columns that queries actually filter on and that have moderate cardinality. Partitioning by user ID creates millions of tiny partitions and hurts performance.`,
          d: 'medium',
        },
        {
          q: `Write SQL to remove duplicates from a staging table, keeping only the latest record per order_id.`,
          a: `Raw data often contains the same record several times (retries, CDC updates). Keep the most recent version using \`ROW_NUMBER\`:

\`\`\`sql
WITH ranked AS (
  SELECT *,
         ROW_NUMBER() OVER (
           PARTITION BY order_id
           ORDER BY updated_at DESC, ingested_at DESC
         ) AS rn
  FROM staging_orders
)
SELECT *
FROM ranked
WHERE rn = 1;
\`\`\`

Snowflake, BigQuery and Databricks support a shorter form:

\`\`\`sql
SELECT *
FROM staging_orders
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1;
\`\`\`

Points to mention:

- Add a **tie-breaker** column (\`ingested_at\` or a file offset), otherwise rows with the same \`updated_at\` are picked randomly and the result changes between runs.
- \`SELECT DISTINCT\` only removes rows that are identical in every column, which is rarely the case.
- Use the deduplicated result as the input to a \`MERGE\` into the target table.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `Write a MERGE statement that loads changes into an SCD Type 2 customer dimension.`,
          a: `A common pattern uses a staged "changes" set that contains each changed customer twice: once to close the old row and once to insert the new version.

\`\`\`sql
-- Snowflake / Databricks style; stg_customers holds today's snapshot
MERGE INTO dim_customer AS t
USING (
  -- rows that will update (close) the current version
  SELECT s.customer_id AS merge_key, s.* FROM stg_customers s
  UNION ALL
  -- changed customers again, with NULL key, so they fall into INSERT
  SELECT NULL AS merge_key, s.*
  FROM stg_customers s
  JOIN dim_customer d
    ON d.customer_id = s.customer_id AND d.is_current
  WHERE d.city <> s.city OR d.segment <> s.segment
) AS src
ON t.customer_id = src.merge_key AND t.is_current
WHEN MATCHED AND (t.city <> src.city OR t.segment <> src.segment) THEN
  UPDATE SET is_current = FALSE, valid_to = CURRENT_DATE - 1
WHEN NOT MATCHED THEN
  INSERT (customer_id, city, segment, valid_from, valid_to, is_current)
  VALUES (src.customer_id, src.city, src.segment, CURRENT_DATE, DATE '9999-12-31', TRUE);
\`\`\`

- Existing customer with changes: the first branch closes the old row; the NULL-key copy inserts the new version.
- New customer: no match, so it is inserted.
- Unchanged customer: matched, but the change condition is false, so nothing happens.

Surrogate keys come from an identity column. Use null-safe comparisons if attributes can be NULL. In dbt, **snapshots** implement this pattern for you.`,
          d: 'hard',
          at: 'Product companies, consulting',
          tip: `Mention that dbt snapshots generate SCD2 automatically; it shows you know the modern toolset.`,
        },
      ],
    },
    {
      title: 'Python, Linux and Docker for Data Engineers',
      questions: [
        {
          q: `Which Linux commands do you use most when working with data files and pipelines?`,
          a: `Inspecting files:

\`\`\`bash
head -n 5 orders.csv            # first lines, check the header
tail -f /var/log/etl/job.log    # follow a log while a job runs
wc -l orders.csv                # row count
du -sh /data/raw/*              # folder sizes
ls -lh                          # file sizes and permissions
\`\`\`

Searching and quick transforms:

\`\`\`bash
grep -c "ERROR" job.log                       # count errors
cut -d',' -f1 orders.csv | sort | uniq -d     # duplicate IDs in column 1
awk -F',' 'NR > 1 { s += $4 } END { print s }' orders.csv   # sum of column 4
zcat events.json.gz | head                    # read compressed files
\`\`\`

Operations: \`ps aux | grep python\` and \`kill\` for processes, \`chmod\` and \`chown\` for permissions, \`scp\` or \`rsync\` to copy files, \`ssh\` to reach servers, \`df -h\` for disk space, \`top\` or \`htop\` for memory and CPU, and \`crontab -e\` to schedule a script.

Note that \`cut\` and \`awk\` split on every comma, so they break on quoted CSV fields that contain commas; use Python or a proper CSV tool for those.`,
          d: 'easy',
          at: 'Service companies, product companies',
        },
        {
          q: `What is Docker? What is the difference between an image and a container?`,
          a: `**Docker** packages an application together with its runtime, libraries and configuration so it runs the same way on a laptop, a CI server and the cloud. It removes "works on my machine" problems, which are common in data work with many Python dependencies and drivers.

- An **image** is a read-only template built from a **Dockerfile**: base OS layer, Python, your packages and code. Images are versioned with tags and stored in a registry (Docker Hub, Amazon ECR, Azure Container Registry).
- A **container** is a running instance of an image, with its own isolated filesystem, processes and network. You can run many containers from one image.

\`\`\`bash
docker build -t orders-etl:1.0 .
docker run --rm -e DB_URL="postgresql://..." orders-etl:1.0
docker ps          # running containers
docker logs <id>
\`\`\`

Unlike a virtual machine, a container shares the host's kernel, so it starts in seconds and uses less memory. Data engineers use Docker to run ETL jobs on Kubernetes or managed container services, run Airflow tasks with the Docker or Kubernetes operators, and spin up local Postgres, Kafka or Airflow with Docker Compose.`,
          d: 'easy',
        },
        {
          q: `When would you use pandas and when would you use Spark?`,
          a: `**pandas** runs on a **single machine** and holds the whole DataFrame in memory.

- Best for data that fits comfortably in RAM (a rough guide: up to a few GB on a typical machine).
- Fast to write, rich API, great for exploration, small daily jobs and API ingestion.
- Fails or slows badly when data outgrows memory.

**Spark** (PySpark) runs **distributed** across a cluster and processes data in partitions.

- Best for large data (tens of GB to TB), joins between big tables, and lakehouse work on Databricks, EMR or similar platforms.
- Lazy evaluation and a query optimiser plan the whole job.
- More overhead: cluster start-up, shuffles, harder debugging. Using Spark on 50 MB of data is slower and more expensive than pandas.

Middle options worth naming: **Polars** and **DuckDB** process data larger than pandas comfortably on one machine using columnar, multi-threaded engines; and pushing the transformation into the warehouse with SQL (ELT, often via dbt) avoids moving data at all.

The right answer depends on data size, growth and where the data already lives.`,
          d: 'easy',
          tip: `Naming DuckDB or Polars as a middle option shows you follow current tooling.`,
        },
        {
          q: `How do you process a CSV file that is too large to fit in memory using Python?`,
          a: `Stream it in pieces instead of loading everything at once.

**pandas in chunks**:

\`\`\`python
import pandas as pd

totals = {}
for chunk in pd.read_csv("orders_20gb.csv", chunksize=500_000,
                         usecols=["region", "amount"],
                         dtype={"region": "category", "amount": "float64"}):
    for region, amt in chunk.groupby("region", observed=True)["amount"].sum().items():
        totals[region] = totals.get(region, 0) + amt
print(totals)
\`\`\`

**A generator** for row-by-row work with constant memory:

\`\`\`python
import csv

def valid_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["amount"]:
                yield row
\`\`\`

Other techniques:

- Read only the needed columns (\`usecols\`) and use smaller dtypes (\`category\`, \`int32\`).
- Convert the file once to **Parquet**, which is compressed and columnar, then read only required columns.
- Use **DuckDB** or **Polars**, which query large files directly: \`duckdb.sql("SELECT region, SUM(amount) FROM 'orders.csv' GROUP BY region")\`.
- For truly large or recurring jobs, use Spark or load into the warehouse.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `Write a Dockerfile for a Python ETL script.`,
          a: `\`\`\`dockerfile
FROM python:3.12-slim

# Do not write .pyc files; show logs immediately
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

# Run as a non-root user
RUN useradd --create-home etl
USER etl

ENTRYPOINT ["python", "-m", "src.load_orders"]
\`\`\`

Good practices to explain:

- A **slim** base image keeps the image small; pin the Python version.
- Copy \`requirements.txt\` before the code so dependency installation is **cached** and rebuilds are fast.
- Pin package versions in \`requirements.txt\` for reproducible builds.
- **Never bake secrets** (database passwords, API keys) into the image. Pass them at runtime through environment variables or a secrets manager.
- Add a \`.dockerignore\` to exclude \`.git\`, virtual environments and local data files.
- Write logs to stdout so the platform (Kubernetes, ECS, Airflow) can collect them.`,
          d: 'medium',
        },
        {
          q: `What does it mean for a pipeline to be idempotent? How do you make a Python load job idempotent?`,
          a: `A job is **idempotent** if running it once or several times for the same input gives the **same final result**. This matters because jobs fail halfway and get retried, and Airflow backfills rerun past dates. A non-idempotent job that simply appends rows creates duplicates on every rerun.

Techniques:

- **Delete-then-insert by partition**: for the run date, delete that day's rows and insert them again, in one transaction.
- **MERGE / upsert** on a business key instead of a plain INSERT.
- **Overwrite a partition** in the lake (\`insert overwrite\` for that date) rather than appending.
- Use the **logical run date** passed by the scheduler, not \`datetime.now()\`, so a rerun of 1 October processes 1 October again.

\`\`\`python
from sqlalchemy import create_engine, text

def load_day(engine, df, run_date):
    with engine.begin() as conn:                      # one transaction
        conn.execute(text("DELETE FROM fact_orders WHERE order_date = :d"),
                     {"d": run_date})
        df.to_sql("fact_orders", conn, if_exists="append", index=False)
\`\`\`

If the insert fails, the transaction rolls back and the old data remains, so a retry is always safe.`,
          d: 'medium',
          at: 'Product companies',
          tip: `Use the phrase "rerun-safe"; then show delete-insert in one transaction.`,
        },
        {
          q: `How would you ingest data from a paginated REST API reliably in Python?`,
          a: `\`\`\`python
import time
import requests

def fetch_all(base_url, token, updated_since):
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {token}"
    page, rows = 1, []
    while True:
        for attempt in range(5):
            resp = session.get(base_url, params={
                "page": page, "per_page": 100, "updated_since": updated_since,
            }, timeout=30)
            if resp.status_code == 429 or resp.status_code >= 500:
                time.sleep(2 ** attempt)          # exponential backoff
                continue
            resp.raise_for_status()
            break
        else:
            raise RuntimeError(f"Page {page} failed after retries")
        batch = resp.json()["data"]
        if not batch:
            return rows
        rows.extend(batch)
        page += 1
\`\`\`

Key points:

- **Pagination**: page numbers, offsets or a cursor / next-page token; cursors are safer when data changes during extraction.
- **Retries with backoff** for rate limits (HTTP 429) and server errors; respect a \`Retry-After\` header if present.
- **Timeouts** on every request.
- **Incremental extraction** with \`updated_since\` (a watermark saved after each successful run).
- Land the **raw JSON** first (in object storage), then transform, so you can reprocess without calling the API again.
- Keep the token in a secrets manager, never in code.`,
          d: 'medium',
        },
        {
          q: `A cron job sometimes runs again before the previous run finishes, and both write to the same table. How do you fix it?`,
          a: `Overlapping runs cause duplicate rows, lock waits or half-written data. Fix it at several levels:

**1. Prevent concurrent runs with a lock.** On Linux, \`flock\` holds a lock file for the duration of the command; a second run exits immediately if the lock is taken:

\`\`\`bash
# crontab: every 15 minutes, skip if the previous run is still going
*/15 * * * * /usr/bin/flock -n /tmp/orders_etl.lock /opt/etl/run_orders.sh >> /var/log/etl/orders.log 2>&1
\`\`\`

**2. Make the job idempotent.** Even with a lock, failures and manual reruns happen. Use MERGE or delete-insert per time window inside a transaction, so a repeated run cannot duplicate data.

**3. Find out why it is slow.** Runtime grew past the schedule interval: growing data volume, a missing index, full loads instead of incremental. Fix the cause or lengthen the interval.

**4. Use a real orchestrator for important pipelines.** Airflow can limit concurrent runs of a DAG (\`max_active_runs=1\`), adds retries, timeouts, alerting and run history, none of which cron provides.

Also add an alert when a run exceeds its expected duration.`,
          d: 'hard',
          at: 'Product companies, service companies',
        },
      ],
    },
    {
      title: 'ETL/ELT, Spark and the Lakehouse',
      questions: [
        {
          q: `What is the difference between ETL and ELT? Why has ELT become common?`,
          a: `- **ETL (Extract, Transform, Load)**: data is transformed on a separate processing server or tool (Informatica, SSIS, custom Python or Spark) **before** loading into the warehouse.
- **ELT (Extract, Load, Transform)**: raw data is loaded first into the warehouse or lakehouse, and transformations run **inside** it, typically with SQL, often managed by **dbt**.

Why ELT became common:

- Cloud warehouses (Snowflake, BigQuery, Redshift, Databricks) separate storage and compute and scale easily, so transforming inside them is fast.
- Keeping **raw data** means you can rebuild models when business logic changes, without re-extracting from sources.
- SQL transformations are accessible to analytics engineers and analysts.
- Managed ingestion tools (Fivetran, Airbyte, cloud-native connectors) make the EL part easy.

ETL is still used when data must be cleaned or masked **before** it lands (personal data, compliance), for heavy non-SQL processing, or when the target system has limited compute. Many real platforms mix both.`,
          d: 'easy',
          at: 'Service companies, product companies, consulting',
        },
        {
          q: `Why is Parquet preferred over CSV for analytics?`,
          a: `**Parquet** is a **columnar**, compressed, binary file format with an embedded schema.

| | CSV | Parquet |
|---|---|---|
| Layout | Row by row, plain text | Column by column, in row groups |
| Schema and types | None; everything is text, types guessed on read | Stored in the file (int, decimal, timestamp, nested) |
| Size | Large | Often several times smaller thanks to encoding and compression (Snappy, ZSTD) |
| Reading 3 of 50 columns | Must read every byte | Reads only those 3 columns (**column pruning**) |
| Filtering | Full scan | Min/max statistics per row group let engines skip data (**predicate pushdown**) |

Result: analytical queries on Parquet are much faster and cheaper, especially in cloud services that charge by data scanned.

CSV still has uses: human-readable exports, small interchange files and systems that only accept CSV. **Delta Lake** and **Apache Iceberg** tables store their data as Parquet files and add a transaction log on top. ORC and Avro are other formats worth knowing: ORC is columnar like Parquet; Avro is row-based and common for Kafka messages.`,
          d: 'easy',
          tip: `Say "column pruning and predicate pushdown"; those two terms are what the interviewer wants to hear.`,
        },
        {
          q: `Explain Spark's architecture: driver, executors, lazy evaluation, transformations and actions.`,
          a: `- The **driver** runs your program, builds the execution plan and schedules work.
- **Executors** are processes on worker nodes that run **tasks** on partitions of the data and keep data in memory or on disk.
- A **cluster manager** (YARN, Kubernetes, Spark standalone or a managed platform such as Databricks) allocates the resources.

**Transformations** (\`select\`, \`filter\`, \`withColumn\`, \`join\`, \`groupBy\`) describe a new DataFrame but do not run anything. **Actions** (\`count\`, \`show\`, \`collect\`, \`write\`) trigger execution.

This is **lazy evaluation**: Spark waits until an action, then the **Catalyst optimiser** rewrites the whole plan, for example pushing filters down to the Parquet reader and pruning unused columns.

\`\`\`python
from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("orders").getOrCreate()
orders = spark.read.parquet("s3://lake/raw/orders/")        # lazy
daily = (orders.filter(F.col("status") == "DELIVERED")      # lazy
               .groupBy("order_date").agg(F.sum("amount").alias("revenue")))
daily.write.mode("overwrite").parquet("s3://lake/gold/daily_revenue/")  # action
\`\`\`

An action becomes a **job**, split into **stages** at shuffle boundaries, and each stage into one **task** per partition.`,
          d: 'easy',
          at: 'Product companies, service companies, Databricks partners',
        },
        {
          q: `What is the difference between a full load and an incremental load? What is CDC?`,
          a: `- **Full load**: copy the entire source table on every run and replace the target. Simple and always consistent, but slow and expensive for big tables. Fine for small dimension tables.
- **Incremental load**: copy only new or changed rows since the last successful run.

Common incremental methods:

- **Watermark column**: \`WHERE updated_at > :last_watermark\`; store the highest value loaded and use it next time. Requires a reliable, always-updated timestamp. It misses **hard deletes**, and rows updated during extraction can slip through, so many teams re-read a small overlap window and deduplicate.
- **Auto-increment ID** for append-only tables.
- **CDC (Change Data Capture)**: read the database's transaction log (MySQL binlog, PostgreSQL WAL, SQL Server CDC) to capture every insert, update and **delete** in order, with low load on the source. Tools include **Debezium** (often publishing to Kafka), AWS DMS and many managed connectors.

Incremental loads are then applied to the target with **MERGE** (upsert, plus delete handling) so reruns stay idempotent.`,
          d: 'medium',
          at: 'Product companies, consulting',
        },
        {
          q: `What are narrow and wide transformations in Spark, and why are shuffles expensive?`,
          a: `- **Narrow transformation**: each output partition depends on **one** input partition. Examples: \`filter\`, \`select\`, \`withColumn\`, \`map\`. No data moves between executors, and Spark pipelines several narrow steps into one stage.
- **Wide transformation**: an output partition needs data from **many** input partitions. Examples: \`groupBy\`, \`join\` (except broadcast joins), \`distinct\`, \`orderBy\`, \`repartition\`. This requires a **shuffle**.

A shuffle is expensive because Spark must:

1. Write intermediate data to local disk on each executor.
2. Send it over the **network** so all rows with the same key end up on the same partition.
3. Serialise and deserialise it, and read it back.

Each shuffle also creates a stage boundary.

How to reduce shuffle cost:

- **Filter and select columns early** so less data moves.
- Use **broadcast joins** when one side is small.
- Avoid unnecessary \`orderBy\`, \`distinct\` or \`repartition\`.
- Tune \`spark.sql.shuffle.partitions\` or rely on **Adaptive Query Execution (AQE)**, enabled by default in Spark 3.2+, which coalesces small shuffle partitions at runtime.

Check the Spark UI's stage view for shuffle read and write sizes.`,
          d: 'medium',
        },
        {
          q: `What does Delta Lake add on top of Parquet files? What is a lakehouse?`,
          a: `A plain folder of Parquet files has no transactions: a failed job leaves half-written files, concurrent writers corrupt data, and updating a single row means rewriting files manually.

**Delta Lake** adds a **transaction log** (\`_delta_log\`) next to the Parquet files, which gives:

- **ACID transactions**: readers see either the old or the new version, never a partial write.
- **MERGE, UPDATE, DELETE**: upserts and GDPR-style deletes.
- **Schema enforcement and evolution**: bad schemas are rejected; new columns can be added deliberately.
- **Time travel**: query an older version (\`VERSION AS OF 12\`) for audits, debugging or rollback.
- **Performance features**: file compaction (\`OPTIMIZE\`), data skipping and clustering.

\`\`\`sql
MERGE INTO silver.orders t
USING bronze_orders_today s
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
\`\`\`

A **lakehouse** combines cheap, open data lake storage (S3, ADLS, GCS) with warehouse features such as transactions, governance and fast SQL, using table formats like **Delta Lake**, **Apache Iceberg** or **Apache Hudi**. A common layout is the **medallion architecture**: bronze (raw), silver (cleaned, conformed) and gold (business-level aggregates).`,
          d: 'medium',
          at: 'Databricks partners, product companies, consulting',
          tip: `Mention the medallion layers (bronze, silver, gold); most lakehouse projects use them.`,
        },
        {
          q: `What is the small files problem in a data lake? Explain repartition vs coalesce.`,
          a: `**Small files problem**: thousands of tiny files (a few KB each) instead of fewer large ones. Each file adds metadata overhead, file listing time and a separate open/read operation, so queries become slow even when the total data is small. Causes include streaming micro-batches, over-partitioning (by hour and city and category) and writing with too many Spark partitions.

Fixes:

- Target file sizes in the range of about **128 MB to 1 GB**.
- Compact regularly: Delta Lake's \`OPTIMIZE\`, Iceberg's rewrite procedures, or a compaction job.
- Partition by a column with moderate cardinality (date), not high-cardinality ones.
- Control the number of output partitions before writing.

**repartition(n)** performs a full **shuffle** and produces n roughly equal partitions. It can increase or decrease the number, and can partition by a column: \`df.repartition("order_date")\`.

**coalesce(n)** only **decreases** the number of partitions by merging existing ones **without a full shuffle**, so it is cheaper, but partitions can end up uneven, and a very small n reduces parallelism in the stages before the write.

\`\`\`python
df.coalesce(8).write.mode("overwrite").parquet("s3://lake/gold/daily_summary/")
\`\`\``,
          d: 'medium',
        },
        {
          q: `A Spark join job gets stuck with one task running far longer than the others. What is happening and how do you fix it?`,
          a: `This is almost always **data skew**: a few keys have far more rows than the rest, so the partition holding them is huge. For example, in an orders-to-customers join, a placeholder \`customer_id = 'GUEST'\` or NULL may hold 30% of all rows. One task processes that partition while the others finish quickly, and it may spill to disk or run out of memory.

**Confirm**: in the Spark UI, look at the stage's task metrics. Max duration and shuffle read size far above the median indicate skew. Count rows per key to find the hot keys.

**Fixes**:

1. **Broadcast join** if one side is small: Spark sends the small table to every executor and avoids the shuffle entirely.
   \`orders.join(F.broadcast(dim_store), "store_id")\`
2. **Adaptive Query Execution** skew join handling (\`spark.sql.adaptive.skewJoin.enabled\`, on with AQE in Spark 3) splits oversized partitions automatically.
3. **Handle junk keys separately**: filter out NULL or placeholder keys, process them separately, then union the results.
4. **Salting**: add a random number 0 to N-1 to the skewed key on the large side, replicate the matching rows on the other side N times with each salt value, join on (key, salt), then aggregate.
5. Pre-aggregate before the join to reduce rows.`,
          d: 'hard',
          at: 'Product companies, Databricks partners',
          tip: `Explain how you confirmed skew in the Spark UI before naming a fix.`,
        },
      ],
    },
    {
      title: 'dbt, Airflow, Kafka, Data Quality and Cloud',
      questions: [
        {
          q: `What is Apache Airflow? Explain DAGs, tasks, operators and the scheduler with a small example.`,
          a: `**Airflow** is an open-source **orchestrator**: it schedules pipelines, runs steps in the right order, retries failures and shows the history of every run. Pipelines are written in Python.

- **DAG**: a Directed Acyclic Graph of tasks with a schedule.
- **Task**: one step, for example "extract orders".
- **Operator**: a template for a task: \`BashOperator\`, \`PythonOperator\`, \`SQLExecuteQueryOperator\`, cloud-provider operators, sensors that wait for a file or event.
- **Scheduler**: triggers DAG runs and queues tasks when dependencies are met; **workers** execute them.

\`\`\`python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="daily_orders",
    start_date=datetime(2025, 1, 1),
    schedule="@daily",
    catchup=False,
    default_args={"retries": 2, "retry_delay": timedelta(minutes=5)},
) as dag:
    extract = BashOperator(task_id="extract", bash_command="python extract.py {{ ds }}")
    load = BashOperator(task_id="load", bash_command="python load.py {{ ds }}")
    transform = BashOperator(task_id="dbt_run", bash_command="dbt run --select orders")

    extract >> load >> transform
\`\`\`

\`{{ ds }}\` is the run's logical date, which keeps reruns idempotent. Airflow orchestrates; heavy processing should run in Spark, the warehouse or containers, not on Airflow workers.`,
          d: 'easy',
          at: 'Product companies, service companies',
        },
        {
          q: `What is dbt and why do data teams use it?`,
          a: `**dbt (data build tool)** handles the **T in ELT**. You write transformations as \`SELECT\` statements in SQL files (**models**); dbt turns them into tables or views in the warehouse (Snowflake, BigQuery, Redshift, Databricks, Postgres and others).

Key features:

- **ref()**: \`select * from {{ ref('stg_orders') }}\` declares dependencies, so dbt builds models in the right order and draws a lineage graph.
- **sources**: declare raw tables, and check their freshness.
- **Materialisations**: view, table, incremental, ephemeral.
- **Tests**: built-in \`unique\`, \`not_null\`, \`accepted_values\`, \`relationships\`, plus custom SQL tests.
- **Documentation**: generated from YAML descriptions, with lineage.
- **Jinja and macros** for reusable SQL; **snapshots** for SCD Type 2.

\`\`\`yaml
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: status
        tests:
          - accepted_values:
              values: ['PLACED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
\`\`\`

Why teams use it: software engineering practices for SQL, meaning version control in Git, code review, testing, environments (dev and prod) and CI, instead of scattered stored procedures.`,
          d: 'easy',
          tip: `Explain ref() first: dependency order and lineage come from it.`,
        },
        {
          q: `Explain Kafka topics, partitions, offsets and consumer groups.`,
          a: `**Apache Kafka** is a distributed, durable **event log** used to move streams of events (clicks, payments, CDC changes) between systems in real time.

- **Producer**: an application that writes events.
- **Topic**: a named stream, such as \`orders\`. Events are retained for a configured time or size, not deleted when read.
- **Partition**: a topic is split into partitions, spread across **brokers**. Each partition is an ordered, append-only log. Ordering is guaranteed **only within a partition**, so events with the same key (for example \`order_id\`) are sent to the same partition to keep their order.
- **Offset**: the position of an event within a partition. Consumers commit offsets to record how far they have read, so they can resume after a restart or replay from an earlier point.
- **Consumer group**: consumers sharing a group ID split the partitions between them; each partition is read by one consumer in the group at a time. More partitions allow more parallel consumers. Different groups (analytics, fraud service) each read the full stream independently.
- **Replication**: each partition has copies on several brokers for fault tolerance.

For a data engineer, Kafka typically feeds a streaming job (Spark Structured Streaming, Flink) or a sink connector into the lakehouse.`,
          d: 'easy',
          at: 'Product companies, fintech',
        },
        {
          q: `Write an incremental dbt model. How does it work on the first run and later runs?`,
          a: `\`\`\`sql
-- models/marts/fct_orders.sql
{{
  config(
    materialized = 'incremental',
    unique_key = 'order_id',
    incremental_strategy = 'merge'
  )
}}

select
    order_id,
    customer_id,
    order_status,
    amount,
    updated_at
from {{ ref('stg_orders') }}

{% if is_incremental() %}
  -- only rows changed since the latest row already in this table,
  -- with a small overlap for late-arriving updates
  where updated_at > (select max(updated_at) - interval '3 days' from {{ this }})
{% endif %}
\`\`\`

- **First run** (or with \`--full-refresh\`): the table does not exist, \`is_incremental()\` is false, so dbt builds it from all rows.
- **Later runs**: \`is_incremental()\` is true, so only recent rows are selected, and dbt **merges** them into the existing table on \`unique_key\`: matching rows are updated, new rows inserted.
- \`{{ this }}\` refers to the model's own existing table.

The overlap window plus \`unique_key\` makes the model safe for late updates and reruns. Supported strategies (merge, delete+insert, insert_overwrite, append) depend on the warehouse adapter, and interval syntax differs by warehouse. Run a full refresh when the logic changes.`,
          d: 'medium',
          at: 'Product companies, analytics engineering teams',
        },
        {
          q: `In Airflow, what are catchup, backfill, retries and sensors? How do you design DAGs that are safe to rerun?`,
          a: `- **catchup**: when \`True\`, if a DAG's \`start_date\` is in the past, the scheduler creates a run for every missed interval. Usually set \`catchup=False\` unless you want history processed automatically.
- **Backfill**: deliberately running a DAG for a past date range, for example after fixing a bug (\`airflow dags backfill\` in Airflow 2, or clearing past task instances in the UI).
- **Retries**: \`retries\` and \`retry_delay\` (optionally exponential backoff) handle temporary failures such as network issues.
- **Sensors**: tasks that wait for a condition, like a file arriving in S3 or another DAG finishing. Use \`mode="reschedule"\` or deferrable sensors so a waiting sensor does not occupy a worker slot.

Designing for safe reruns:

- Each run processes only its own **data interval**, using templated dates like \`{{ ds }}\` or \`{{ data_interval_start }}\`, never "now".
- Writes are **idempotent**: overwrite the partition or MERGE.
- Tasks are **atomic**: write to a temp location, then swap or commit.
- Set \`max_active_runs\` to avoid overlapping runs when tasks are not independent, plus \`execution_timeout\` and failure alerts.
- Pass small metadata via XCom, not datasets.`,
          d: 'medium',
          tip: `Tie every answer back to the data interval; it is the core idea behind safe Airflow DAGs.`,
        },
        {
          q: `What data quality checks do you build into a pipeline, and where do they go?`,
          a: `**Dimensions of quality and example checks**

- **Freshness**: the latest \`updated_at\` is within 2 hours; today's partition exists.
- **Volume**: row count within an expected range compared with the last 7 days (catches a source that suddenly sent half the data).
- **Completeness**: key columns not NULL.
- **Uniqueness**: primary keys unique.
- **Validity**: values in allowed sets or ranges (status in a known list, amount at least 0, valid dates).
- **Referential integrity**: every \`fact.customer_id\` exists in \`dim_customer\`.
- **Reconciliation**: totals match the source system (sum of amount per day).
- **Schema**: expected columns and types are present.

**Where**

1. On **ingestion** (bronze): schema and volume checks; quarantine bad records instead of failing the whole load when appropriate.
2. After **transformation** (silver and gold): uniqueness, relationships, business rules.
3. **Before publishing** to dashboards: block the release if critical tests fail.

**Tools**: dbt tests, Great Expectations, Soda, Delta Lake constraints and expectations in Databricks pipelines, or plain SQL checks in Airflow tasks.

Classify checks as **blocking** (stop the pipeline) or **warning** (alert only), and route alerts to an owner.`,
          d: 'medium',
          at: 'Product companies, consulting',
        },
        {
          q: `Name the main cloud data services on AWS, Azure and GCP and what each does.`,
          a: `| Purpose | AWS | Azure | GCP |
|---|---|---|---|
| Object storage (data lake) | S3 | Azure Data Lake Storage Gen2 (Blob Storage) | Cloud Storage |
| Data warehouse | Redshift | Synapse Analytics / Microsoft Fabric warehouse | BigQuery |
| Managed ETL / integration | Glue | Data Factory | Dataflow, Cloud Data Fusion |
| Managed Spark | EMR, Glue | Databricks on Azure, Synapse Spark | Dataproc |
| Streaming | Kinesis, Amazon MSK (Kafka) | Event Hubs | Pub/Sub |
| Managed Airflow | MWAA | Data Factory Workflow Orchestration Manager | Cloud Composer |
| Data catalog / governance | Glue Data Catalog, Lake Formation | Microsoft Purview | Dataplex |
| Serverless SQL on files | Athena | Synapse serverless SQL | BigQuery external tables |

**Cross-cloud platforms**: **Snowflake** (warehouse) and **Databricks** (lakehouse, Spark) run on all three.

In an interview, say which one you have hands-on experience with and explain one pipeline end to end, for example S3 > Glue > Redshift, or ADLS > Data Factory > Databricks > Power BI. Also mention the basics that apply everywhere: IAM roles instead of keys in code, encryption, private networking, and cost control by partitioning and stopping idle clusters.`,
          d: 'medium',
          at: 'Service companies, consulting, cloud partners',
          tip: `Depth in one cloud beats a list of all three; name one real pipeline you built.`,
        },
        {
          q: `Compare batch and stream processing. What do at-least-once and exactly-once delivery mean?`,
          a: `**Batch** processes a bounded set of data on a schedule (hourly, nightly). Simpler to build, test and rerun; cheaper; latency of minutes to hours. Suits most reporting and ML training.

**Streaming** processes unbounded events continuously as they arrive (Kafka with Spark Structured Streaming, Flink, Kafka Streams). Latency of seconds. Needed for fraud detection, live tracking, alerts and real-time personalisation. Harder: state management, late and out-of-order events (handled with **event time**, **windows** and **watermarks**), and costlier always-on infrastructure. Do not choose streaming unless the business needs the latency.

**Delivery guarantees**

- **At-most-once**: an event may be lost, never duplicated (offset committed before processing).
- **At-least-once**: no loss, but **duplicates** are possible after a failure and retry (process, then commit). The most common default.
- **Exactly-once**: each event affects the result once. Achieved with transactional or idempotent writes plus checkpointing: Kafka's idempotent producers and transactions, Spark Structured Streaming checkpoints with an idempotent or transactional sink such as Delta Lake, Flink checkpoints with transactional sinks.

Practical answer: design consumers to be **idempotent** (upsert by event ID), which makes at-least-once delivery produce exactly-once results.`,
          d: 'hard',
          at: 'Product companies, fintech',
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Explain the data pipeline you built in your capstone project.`,
          a: `Describe it as a flow, then defend the choices:

1. **Business goal**: "Daily sales and delivery dashboards for a food delivery dataset."
2. **Sources**: "Orders from PostgreSQL, restaurant data from a REST API, delivery events as JSON files."
3. **Ingestion**: how and how often. "Incremental extraction by \`updated_at\` watermark, raw files landed in S3 as Parquet, partitioned by date."
4. **Transformation**: "PySpark for cleaning and deduplication into silver tables; dbt models in the warehouse for a star schema: \`fct_orders\`, \`dim_restaurant\`, \`dim_date\`."
5. **Orchestration**: "Airflow DAG with retries and a failure alert."
6. **Quality**: "dbt tests for unique and not-null keys, row-count checks against the source."
7. **Serving**: "Power BI dashboard on the gold tables."
8. **Scale and numbers**: data volume, run time, cost.
9. **What you would improve**: CDC, data contracts, CI for dbt.

Draw the architecture on the whiteboard if allowed. Expect "why Spark and not pandas?", "what happens if the job runs twice?" and "how do you handle late data?". Only claim what you built.`,
          d: 'easy',
          at: 'All companies',
          tip: `Have an answer ready for "what happens if it runs twice?"; it is the most common follow-up.`,
        },
        {
          q: `Your daily pipeline failed at 3 AM and the business dashboard is due at 9 AM. What do you do?`,
          a: `1. **Assess and communicate early.** Check the orchestrator (Airflow UI) to see which task failed and when. Tell stakeholders the dashboard may be delayed, with an expected time. Silence is worse than a delay.
2. **Read the logs.** Common causes: source unavailable or credentials expired, schema change in the source, out-of-memory, disk full, a data quality check that blocked bad data, or a timeout.
3. **Decide quickly.**
   - Temporary issue (network, source restarted): **rerun** the failed task. Because tasks are idempotent, reruns are safe.
   - Bad data blocked by a quality check: do not force it through. Find the bad records, quarantine them if the business agrees, or publish yesterday's data with a clear "data as of" note.
   - Code or schema problem: apply a minimal, reviewed fix, then rerun.
4. **Verify** the output: row counts, totals and freshness, before telling stakeholders it is ready.
5. **Afterwards**: write a short post-mortem (root cause, impact, fix) and add prevention, such as an alert earlier in the night, a schema check, or a retry policy.

Interviewers look for calm prioritisation, communication and not publishing wrong numbers under time pressure.`,
          d: 'easy',
        },
        {
          q: `A daily job that used to take 30 minutes now takes 4 hours. How do you find and fix the problem?`,
          a: `**Find what changed**

- Data volume: did input grow steadily or jump suddenly? Has the job silently switched from incremental to full load (lost watermark)?
- Code or config changes: recent deployments, a new join, a library or cluster size change.
- Environment: shared cluster busy, warehouse queueing, source database slow.

**Locate the slow step.** Compare task durations in Airflow. For Spark, open the Spark UI: which stage is slow, shuffle sizes, task skew, spills to disk. For SQL, look at the query profile or \`EXPLAIN\` plan.

**Typical causes and fixes**

- **Full scans**: add partition filters so only new partitions are read; fix the incremental logic.
- **Join explosion**: duplicate keys multiplying rows; deduplicate before the join.
- **Skew**: a hot key on one task; broadcast join, AQE, or salting.
- **Small files**: thousands of tiny files to list and open; compact them.
- **Missing index** or statistics on the source query.
- **Under-sized resources** or memory spills; tune partitions or resize, after fixing the logic.

Add runtime monitoring and an alert when duration exceeds a threshold, so the next slowdown is caught on day one, not after weeks.`,
          d: 'medium',
          at: 'Product companies, service companies',
        },
        {
          q: `Analysts report duplicate rows in a warehouse fact table. How do you investigate and fix it?`,
          a: `**1. Confirm and measure.**

\`\`\`sql
SELECT order_id, COUNT(*) AS copies
FROM fct_orders
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY copies DESC;
\`\`\`

Check which load dates the duplicates came from and whether whole rows or only keys repeat.

**2. Find the cause.** Common ones:

- The job **appends** and was **rerun** (retry, backfill), so the same day was loaded twice.
- Source sends the same record several times (CDC updates, API retries) and there is no deduplication.
- A **join** to a dimension with duplicate keys multiplied rows (for example SCD2 rows joined without \`is_current\` or date-range conditions).
- Overlapping incremental windows without a MERGE.

**3. Fix the data.** Rebuild the affected partitions, or delete duplicates keeping the latest version with \`ROW_NUMBER()\`. Inform analysts which dates were affected.

**4. Prevent it.**

- Make loads idempotent: MERGE on the business key, or delete-insert per partition.
- Deduplicate in staging with a tie-breaker.
- Add a **uniqueness test** (dbt \`unique\`) that blocks publishing.
- Validate join keys are unique on the dimension side.`,
          d: 'medium',
        },
        {
          q: `Design a pipeline that moves e-commerce orders from a production MySQL database into a warehouse for daily dashboards.`,
          a: `**Requirements**: daily freshness (by 7 AM), 5 million orders growing 20% a year, no load on the production database during business hours, history of changes, dashboards in Power BI.

**Architecture**

1. **Extract**: read from a **read replica**, never the primary. Incremental by \`updated_at\` with a small overlap window, or **CDC** from the binlog (Debezium or a managed connector) to capture deletes and every update. Small dimensions (categories, stores) can be full loads.
2. **Land raw**: write extracts as **Parquet** to object storage (S3 or ADLS), partitioned by load date: the **bronze** layer, immutable, so anything can be reprocessed.
3. **Load and transform** (ELT): load into the warehouse or lakehouse; **dbt** models for staging (types, renames, dedup), then a **star schema**: \`fct_order_items\` at order-line grain, \`dim_customer\` (SCD Type 2 via dbt snapshots), \`dim_product\`, \`dim_date\`.
4. **Orchestrate**: an Airflow DAG at 2 AM: extract > load > dbt run > dbt test > refresh the Power BI dataset. Retries, SLAs and alerts.
5. **Quality**: row-count reconciliation with the source, unique and not-null keys, freshness checks; failing critical tests stop publication.
6. **Security**: masked personal data (phone, email), least-privilege service accounts, secrets in a vault.

**Scaling path**: switch to CDC and more frequent micro-batches if the business later needs hourly data.`,
          d: 'hard',
          at: 'Product companies, consulting',
          tip: `Start with requirements (freshness, volume, history); the design should follow from them.`,
        },
        {
          q: `Design a real-time clickstream pipeline that powers a live dashboard of active users and top products.`,
          a: `**Requirements**: about 5,000 events per second at peak, dashboard latency under 1 minute, also keep all raw events for later analysis.

**Architecture**

1. **Collection**: web and app SDKs send events (view, add_to_cart, purchase) to a lightweight collector API that validates the schema and publishes to **Kafka** (or a managed equivalent: Kinesis, Event Hubs, Pub/Sub). Key by \`session_id\` to keep each session's events ordered.
2. **Schema management**: a schema registry with Avro or Protobuf so producers cannot break consumers.
3. **Stream processing**: Spark Structured Streaming or Flink:
   - Parse, filter bots, deduplicate by \`event_id\`.
   - Use **event time** with **watermarks** (for example 10 minutes) to handle late, out-of-order mobile events.
   - **Windowed aggregations**: active users per minute (approximate distinct counts are fine), top products by views in a 5-minute sliding window.
4. **Sinks**:
   - Aggregates to a low-latency store (a real-time OLAP database such as Apache Druid, Pinot or ClickHouse, or a cache) that the dashboard queries.
   - Raw events to the lakehouse (Delta or Iceberg, partitioned by date) via the same stream, for batch analytics and ML.
5. **Reliability**: checkpointing, idempotent sinks, consumer lag monitoring, a dead-letter topic for malformed events.

Mention trade-offs: exact distinct counts cost more than approximate (HyperLogLog), and retention settings affect replay ability.`,
          d: 'hard',
          at: 'Product companies, e-commerce',
        },
        {
          q: `The source team renamed a column and added new ones without telling you, and the pipeline broke. How do you handle schema changes?`,
          a: `**Immediate fix**

- Identify the change from the error and the raw data, update the mapping (\`cust_id\` to \`customer_id\`), backfill the failed partitions, and verify. Because raw data is kept in the bronze layer, no data is lost.

**Make the pipeline resilient**

- **Detect early**: a schema check at ingestion compares incoming columns and types with the expected schema and alerts before transformations fail.
- **Decide rules per change type**:
  - **New column**: usually safe; allow it in bronze (schema evolution, for example Delta Lake \`mergeSchema\`) but do not expose it downstream until modelled.
  - **Removed or renamed column, or type change**: breaking; stop the load for that table and alert, rather than silently filling NULLs.
- **Explicit column selection** in staging models (no \`SELECT *\`), so new columns do not leak into reports.
- Use formats with schema support (Parquet, Avro with a schema registry).

**Prevent it organisationally**

- **Data contracts**: an agreed schema, owner and change process between the source team and the data team, with breaking changes versioned and announced.
- Add the data team as reviewers for schema migrations in the source repository, or run contract tests in the source team's CI.`,
          d: 'hard',
          at: 'Product companies, consulting',
          tip: `Use the term "data contract"; it is the modern answer interviewers look for.`,
        },
        {
          q: `Late-arriving data and backfills: a month of orders was loaded with a bug. How do you reprocess safely, and how do you handle records that arrive days late?`,
          a: `**Backfilling the buggy month**

1. **Fix and test** the logic on one day in a dev environment; compare results with expected totals.
2. **Make sure jobs are idempotent and partition-based**: each run overwrites or MERGEs only its own date partition, so reprocessing replaces bad data instead of duplicating it.
3. **Run the backfill per day** through the orchestrator (Airflow backfill or clearing past runs), with limited parallelism so the source and warehouse are not overloaded.
4. **Rebuild downstream** tables that depend on those dates (aggregates, dbt models) in dependency order.
5. **Validate**: reconcile daily counts and totals with the source; then tell consumers what changed. Time travel (Delta Lake, Snowflake) lets you compare with or roll back to the old version.

**Late-arriving data** (a mobile app uploads events after 3 days offline; a payment status updates a week later):

- Partition by **event date** but load by **ingestion time**; reprocess a **lookback window** (for example the last 3 to 7 days) on each run using MERGE.
- In streaming, use **watermarks** to decide how long to wait for late events.
- **Late dimension members**: insert a placeholder "unknown" dimension row and update it when the real record arrives.
- Document the expected delay so analysts know recent days may still change.`,
          d: 'hard',
          at: 'Product companies, fintech',
        },
      ],
    },
  ],
};

export default book;
