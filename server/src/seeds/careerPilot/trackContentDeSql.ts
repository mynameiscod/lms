/**
 * Career-track content: SQL for Data Engineers (DE_SQL_ENGINEERING), Data Engineer, batch DE1.
 *
 * What a data engineer adds to the SQL students already write: SQL organised as a pipeline (layers, tables
 * versus views, rebuilds that are safe to repeat), loading changed rows with INSERT ... ON CONFLICT and MERGE,
 * laying out large tables so queries skip data (partitions, sort order, min/max statistics, PostgreSQL
 * partitioning and BRIN), and reading analytical query plans to fix slow pipeline SQL. It builds on the Data
 * Analytics track's "Subqueries and CTEs" and "Ranking: ROW_NUMBER, RANK and DENSE_RANK", the years' "Reading a
 * Query Plan", "Adding an Index for a Reason" and "Proving the Change Helped", and DE1's "Extracting from
 * Databases" and "Idempotent, Restartable Loads"; those are referred to by title, not re-taught.
 *
 * One fictional company runs through the topic: ZipBasket, a Bengaluru quick-commerce app. Every result,
 * error message, plan and timing quoted was produced by running it: DuckDB 2.0 (Python), PostgreSQL 18 through
 * PGlite (the real PostgreSQL engine compiled to WebAssembly; its timings are only good for comparing with
 * each other), SQLite 3.50, and sqlglot 30 for dialect translations. The partitioning and plan timings are on
 * 20 million synthetic orders on a laptop (4 threads, median of warm runs). MySQL, SQL Server, Snowflake,
 * BigQuery and Redshift syntax is written from their documentation and NOT run; the notes say so.
 *
 * Skills: SQL_AGGREGATION by default; PARTITIONING_INDEXES and QUERY_PLANS are DATA_WAREHOUSING. Checkpoint
 * questions elsewhere that are plainly about layout or plans use ck('DATA_WAREHOUSING', ...), and the reverse.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_SQL_ENGINEERING_BUNDLES: PilotBundle[] = [
  /* ── SQL_FOR_PIPELINES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_SQL_FOR_PIPELINES',
    notes: `An analyst's query answers one question once. A data engineer's SQL runs every night for years, feeds
other tables, and is edited by people who did not write it. You already have the tools — CTEs from "Subqueries
and CTEs", deduplicating with ROW_NUMBER from "Ranking: ROW_NUMBER, RANK and DENSE_RANK". This lesson is how to
arrange them into a pipeline.

## Layers, each with one job

    raw           exactly as landed: strings, duplicates, bad values; never edited
    staging       one model per source table: rename, cast, trim, standardise; no joins
    intermediate  joins, deduplication, business rules ("the final status of an order")
    mart          one declared grain, read by dashboards and other teams

The rule that keeps this maintainable: cast and clean once, in staging, and nowhere else. If three marts each
do CAST(amount_paise AS BIGINT) and lower(trim(status)), the fourth will forget. (The dbt topic turns these
layers into a project; the SQL is the same.)

## ZipBasket's orders, as a pipeline

ZipBasket's app lands order events as text: ' Placed ', 'DELIVERED', amounts in paise as strings, times in UTC.
Ten raw rows, one of them an exact duplicate. Staging is a view that only fixes types and text:

    CREATE OR REPLACE VIEW stg_order_events AS
    SELECT order_id, store_id, customer_id,
           lower(trim(status))            AS status,
           CAST(amount_paise AS BIGINT)   AS amount_paise,
           CAST(event_ts AS TIMESTAMPTZ)  AS event_ts_utc
    FROM raw_order_events;

The intermediate table keeps one row per order — the latest event — and the time it was placed:

    CREATE OR REPLACE TABLE int_orders AS
    WITH ranked AS (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY order_id
                                  ORDER BY event_ts_utc DESC, status) AS rn,
               MIN(event_ts_utc) OVER (PARTITION BY order_id)          AS placed_at_utc
        FROM stg_order_events
    )
    SELECT order_id, store_id, customer_id, status AS final_status, amount_paise, placed_at_utc,
           CAST(timezone('Asia/Kolkata', placed_at_utc) AS DATE) AS order_date_ist
    FROM ranked
    WHERE rn = 1;

DuckDB printed:

    order_id store_id final_status  amount_paise   placed_at_utc        order_date_ist
     ZB-1001   BLR-07    delivered         34900   2026-10-05 17:40:12  2026-10-05
     ZB-1002   BLR-07    cancelled         12000   2026-10-05 18:30:00  2026-10-06
     ZB-1003   BLR-07    delivered         56000   2026-10-05 19:10:00  2026-10-06

Two decisions are visible. The tie-breaker "status" after event_ts_utc makes the result deterministic when two
events share a timestamp — without it, a re-run can pick a different row. And the business day is India's:
18:30 UTC is midnight IST, so ZB-1002 belongs to 6 October. Bucketing by the UTC date, or by the last event's
time instead of the placing time, moves orders between days and nobody notices until finance reconciles.

The mart then declares its grain — one row per store per IST day — and aggregates:

    store_id order_date_ist  orders  delivered  gmv_rupees  cancel_pct
      BLR-07     2026-10-05       1          1       349.0         0.0
      BLR-07     2026-10-06       2          1       560.0        50.0
      HYD-02     2026-10-06       2          2       323.5         0.0

## Tests are queries that should return nothing

Two checks run after every build. A grain test — any row it returns is a bug:

    SELECT store_id, order_date_ist, COUNT(*) FROM mart_store_daily
    GROUP BY ALL HAVING COUNT(*) > 1;              -- returned []

And a reconciliation: distinct orders in raw against the sum of orders in the mart — (5, 5) here. When they
differ, the pipeline stops before a dashboard shows the number.

## View, table or materialised view

    view               stored query; always current; recomputed on every read
    table (CTAS)       stored result; fast to read; stale until rebuilt
    materialised view  stored result plus a refresh command (PostgreSQL:
                       REFRESH MATERIALIZED VIEW; warehouses refresh some automatically)

After one more raw event arrived, the staging view showed 6 orders and the int_orders table still 5. That is the
trade: views suit thin staging logic; anything expensive or read many times becomes a table rebuilt on a
schedule, and the schedule is what the orchestrator owns.

## SQL someone else can maintain

- Name every column on INSERT: INSERT INTO t (a, b) SELECT a, b. A SELECT * into a target breaks — or silently
  shifts columns — the day the source adds one.
- One CTE per step, named for what it holds (deduped_events, not cte2).
- Half-open date ranges: order_date >= '2026-10-01' AND order_date < '2026-11-01'.
- Comments say why ("UTC 18:30 is the IST day boundary"), not what.

## Dialects, and why you run translated SQL

QUALIFY (filter on a window result) exists in DuckDB, Snowflake, BigQuery and Databricks, not in PostgreSQL,
MySQL or SQL Server. sqlglot translated the dedup for PostgreSQL correctly:

    SELECT order_id, status FROM (SELECT order_id, status, ROW_NUMBER() OVER (PARTITION BY order_id
      ORDER BY event_ts_utc DESC NULLS LAST) AS _w FROM stg_order_events) AS _t WHERE _w = 1

It even added NULLS LAST, because DuckDB puts NULLs last by default and PostgreSQL puts them first on DESC. But it
passed CREATE OR REPLACE TABLE through to PostgreSQL unchanged, and PostgreSQL answered: syntax error at or near
"TABLE". A translator gives you a draft; the database decides.`,
    workedExample: `**Scenario.** ZipBasket's nightly job builds fct_store_daily for yesterday. On 7 October the job failed after
its insert, the orchestrator retried it, and the dashboard showed every store's orders doubled. Make the load
safe to repeat, and prove it.

**1. Reproduce.** The load was a plain append:

    INSERT INTO fct_store_daily
    SELECT store_id, order_date_ist, COUNT(*),
           SUM(amount_paise) FILTER (WHERE final_status = 'delivered')
    FROM int_orders WHERE order_date_ist = DATE '2026-10-06' GROUP BY ALL;

Run twice in DuckDB:

    store_id order_date_ist  orders  gmv_paise
      BLR-07     2026-10-06       2      56000
      BLR-07     2026-10-06       2      56000
      HYD-02     2026-10-06       1      23450
      HYD-02     2026-10-06       1      23450

**2. Fix: replace the day, atomically.** The unit of work is one day, so the load deletes that day and inserts
it again inside one transaction:

    BEGIN TRANSACTION;
    DELETE FROM fct_store_daily WHERE order_date_ist = DATE '2026-10-06';
    INSERT INTO fct_store_daily (store_id, order_date_ist, orders, gmv_paise)
    SELECT ... same SELECT ...;
    COMMIT;

**3. Prove it.** Run three times; the table is the same as after one run:

    store_id order_date_ist  orders  gmv_paise
      BLR-07     2026-10-06       2      56000
      HYD-02     2026-10-06       1      23450

The transaction matters: if the INSERT fails after the DELETE, the rollback brings the old day back instead of
leaving a hole. (In Redshift and MySQL, TRUNCATE commits implicitly, so use DELETE inside a transaction there.)

**4. Rebuilding a whole table in PostgreSQL.** There is no CREATE OR REPLACE TABLE. The usual "build
mart__new, DROP the old one, RENAME" failed on PGlite with: cannot drop table mart_store_daily because other
objects depend on it — a dashboard view selected from it. What worked inside one transaction: build
mart__new, TRUNCATE mart_store_daily, INSERT from mart__new, DROP mart__new. The view kept working and showed
the new rows.

**Result.** The date is a parameter from the orchestrator, the step replaces exactly its own slice, and a retry
is harmless. The same idea at row level, where changed rows trickle in, is the next lesson: MERGE.`,
    mcqs: [
      mcq('ZipBasket stores event times in UTC. An order placed at 2026-10-05 18:45 UTC should count towards which business day?', [
        ['6 October, because 18:45 UTC is 00:15 IST on the next day', true],
        ['5 October, because the warehouse should always report in UTC', false],
        ['5 October, because the order was placed before UTC midnight', false],
        ['Whichever date its last status event happened to fall on', false],
      ], 'IST is UTC+5:30, so anything from 18:30 UTC onwards is the next Indian day. Reporting in UTC moves late-evening orders to the wrong day for an Indian business, and the last event (say delivery) is not when the order was placed.'),
      mcq('A staging model, a dedup step and a mart all clean status with lower(trim(status)). What is the pipeline-design fix?', [
        ['Clean it once in staging and have later layers read the clean column', true],
        ['Wrap the expression in a SQL function so each layer calls the function', false],
        ['Add a CHECK constraint to the raw table so bad values are rejected', false],
        ['Clean it only in the mart, since that is what dashboards will read', false],
      ], 'Staging exists so cleaning happens once and everything downstream trusts it. A function still relies on every layer remembering to call it, raw data is never rejected or edited, and cleaning only in the mart leaves the intermediate joins working on dirty values.'),
      mcq('An intermediate model keeps the latest event per order with ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY event_ts DESC). Two events for one order share the same event_ts. What is the risk?', [
        ['Which row wins is not defined, so re-runs can differ', true],
        ['ROW_NUMBER gives both rows 1, so the order is kept twice', false],
        ['The query fails with an error about duplicate sort keys', false],
        ['The order is dropped, since neither row is ranked first', false],
      ], 'ROW_NUMBER always numbers rows 1, 2, … but on a tie the order between them is arbitrary, so a rebuild can choose the other row. Add a tie-breaker column. It is RANK that gives ties the same number, ties do not raise errors, and one row always gets 1.'),
    ],
    checkpoint: [
      mcq('Which statement belongs in a staging model rather than an intermediate or mart model?', [
        ['CAST(amount_paise AS BIGINT) AS amount_paise', true],
        ['JOIN stores s ON s.store_id = o.store_id', false],
        ['SUM(amount_paise) GROUP BY store_id, order_date', false],
        ['QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ...) = 1', false],
      ], 'Staging renames, casts and standardises one source table. Joins and deduplication are intermediate work, and aggregation to a grain belongs in the mart.'),
      mcq('A nightly step does INSERT INTO fct_store_daily SELECT ... for yesterday. After an orchestrator retry, yesterday\'s numbers are doubled. Which change makes the step safe to retry?', [
        ['Delete yesterday\'s rows and insert them again inside one transaction', true],
        ['Add SELECT DISTINCT to the query so duplicate rows are never inserted', false],
        ['Turn off retries in the orchestrator so that the step runs only once', false],
        ['Add a mart view that groups by store and day to hide the duplicates', false],
      ], 'Replacing the day atomically gives the same result however many times it runs. DISTINCT only removes duplicates within one run, disabling retries trades double counts for missing days, and a grouping view sums the doubled rows rather than hiding them.'),
      mcq('A pipeline must run against PostgreSQL. A DuckDB model uses CREATE OR REPLACE TABLE and QUALIFY. What should the engineer expect?', [
        ['Both need rewriting; neither exists in PostgreSQL', true],
        ['Only QUALIFY needs rewriting for PostgreSQL to run it', false],
        ['Both run, since PostgreSQL accepts DuckDB\'s syntax', false],
        ['Only CREATE OR REPLACE TABLE needs to be rewritten', false],
      ], 'PostgreSQL has neither: CREATE OR REPLACE TABLE is a syntax error and QUALIFY must become a subquery (or DISTINCT ON). A translator may convert one and pass the other through unchanged, which is why translated SQL is run before it ships.'),
    ],
  },

  /* ── UPSERTS_MERGE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_UPSERTS_MERGE',
    notes: `In "Extracting from Databases" you pulled only the rows changed since a watermark. Now they must land in a table
that holds the current state of every order: insert the new ones, update the changed ones, remove the deleted
ones — and leave the table identical if the same batch is loaded twice.

## The batch

ZipBasket's orders table holds three orders. Tonight's extract has five rows, and each is a trap:

    target orders                          batch (with op: I insert, U update, D delete)
    ZB-2001 placed     10:00               ZB-2001 packed     10:20 U
    ZB-2002 placed     10:05               ZB-2001 delivered  10:41 U   two rows, one key
    ZB-2003 delivered  09:30               ZB-2002 placed     10:01 U   older than the target
                                           ZB-2003 delivered  09:30 D   deleted at source
                                           ZB-2004 placed     10:50 I   new

## INSERT ... ON CONFLICT

PostgreSQL (9.5+), SQLite (3.24+) and DuckDB share this form. EXCLUDED is the row that failed to insert:

    INSERT INTO orders (order_id, status, amount_paise, updated_at)
    SELECT DISTINCT ON (order_id) order_id, status, amount_paise, updated_at
    FROM batch WHERE op <> 'D'
    ORDER BY order_id, updated_at DESC
    ON CONFLICT (order_id) DO UPDATE
    SET status = EXCLUDED.status, amount_paise = EXCLUDED.amount_paise,
        updated_at = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at > orders.updated_at;

Three details carry the correctness:

- **A unique constraint or primary key on the conflict column.** Without one, PostgreSQL refuses: "there is no
  unique or exclusion constraint matching the ON CONFLICT specification"; DuckDB: "The specified columns as
  conflict target are not referenced by a UNIQUE/PRIMARY KEY CONSTRAINT or INDEX".
- **One source row per key.** DISTINCT ON (PostgreSQL) or QUALIFY ROW_NUMBER() (DuckDB, Snowflake, BigQuery)
  keeps the newest. Skip it and PostgreSQL stops: "ON CONFLICT DO UPDATE command cannot affect row a second
  time". DuckDB did not stop — it accepted both ZB-2001 rows and kept whichever came first: with the batch in
  ascending time order the table ended on "packed", an older status. A silent wrong answer is worse than an error.
- **The WHERE guard.** Without it, ZB-2002's late-arriving 10:01 row overwrote the newer 10:05 one in DuckDB.
  With it, ZB-2002 stays at 10:05: rows can arrive out of order, state must not go backwards.

ON CONFLICT cannot delete, so the D row needs its own DELETE. MERGE does all three in one statement.

## MERGE

Standard SQL, in PostgreSQL 15+, SQL Server, Oracle, Snowflake, BigQuery, Databricks and DuckDB:

    MERGE INTO orders AS t
    USING (
        SELECT DISTINCT ON (order_id) *
        FROM batch
        ORDER BY order_id, updated_at DESC
    ) AS s
    ON t.order_id = s.order_id
    WHEN MATCHED AND s.op = 'D' THEN DELETE
    WHEN MATCHED AND s.updated_at > t.updated_at THEN
        UPDATE SET status = s.status, amount_paise = s.amount_paise,
                   updated_at = s.updated_at
    WHEN NOT MATCHED AND s.op <> 'D' THEN
        INSERT (order_id, status, amount_paise, updated_at)
        VALUES (s.order_id, s.status, s.amount_paise, s.updated_at)
    RETURNING merge_action(), t.order_id;

PostgreSQL 18 returned:

    UPDATE ZB-2001 | DELETE ZB-2003 | INSERT ZB-2004       (3 rows)

and the table became ZB-2001 delivered 10:41, ZB-2002 placed 10:05, ZB-2004 placed 10:50. Run again with the same
batch: 0 rows affected, table unchanged — that is the idempotence test, and it is worth automating.

The WHEN clauses are tried in order and the first match wins, so the delete clause must come before the update
clause. Swapped, a newer D row for store BLR-07 was UPDATEd to "closed" instead of deleted — in PostgreSQL and
DuckDB alike, with no warning. (An unconditional WHEN MATCHED placed first is at least rejected: "unreachable
WHEN clause specified after unconditional WHEN clause".) RETURNING with merge_action() needs PostgreSQL 17+; DuckDB also returned the actions. Without dedup,
MERGE fails everywhere tested: PostgreSQL "MERGE command cannot affect row a second time", DuckDB "MERGE INTO
command cannot affect the same target row more than once".

## Three ways deletes arrive

1. **A change feed with an operation flag** (CDC, the streaming topic): WHEN MATCHED AND s.op = 'D' THEN DELETE.
2. **Soft deletes:** the source sets is_deleted; the target keeps the row with deleted_at, so downstream models
   can still explain last month's revenue. Often the better choice in a warehouse.
3. **A full snapshot:** anything missing from today's complete copy was deleted. WHEN NOT MATCHED BY SOURCE THEN
   DELETE does it (PostgreSQL 17+, SQL Server, DuckDB, Databricks). Running it with a snapshot of only
   ZB-2001 and ZB-2004, PostgreSQL deleted ZB-2002 and ZB-2003. Correct for a complete snapshot — and a disaster
   if someone points it at an incremental batch, which by design omits every unchanged row.

## The same idea in other databases

Written from each product's documentation, not run:

    MySQL       INSERT ... VALUES (...) AS new
                ON DUPLICATE KEY UPDATE status = new.status   (8.0.19+; no MERGE)
    SQL Server  MERGE ... ; (end the statement with a semicolon)
    Snowflake   MERGE; by default it errors on a nondeterministic match
    BigQuery    MERGE; a target row matching several source rows is an error

sqlglot could not make this portable. Asked for MySQL, it emitted ON CONFLICT(CASE WHEN order_id IS NULL ...)
— not MySQL. Asked for SQLite, it wrote ON CONFLICT(order_id NULLS LAST), which SQLite rejected: "unsupported use
of NULLS LAST". Upserts are where dialects differ most; write each one by hand and run it.

SQLite has its own catch: INSERT INTO orders SELECT * FROM batch ON CONFLICT ... failed with near "DO": syntax
error, because the parser reads ON as a join condition. Adding WHERE true after the SELECT fixed it.`,
    workedExample: `**Scenario.** ZipBasket's customer profiles change in the app; a nightly extract lands changed rows in
cust_batch with an op flag. Load them into customers_current so it is right after one run and unchanged after
two.

**The data.**

    customers_current                         cust_batch
    C1 Pune    gold   10-01 10:00             C1 Mumbai  gold   10-02 08:00 U
    C2 Delhi   silver 10-01 11:00             C2 Delhi   gold   09-30 12:00 U   older
    C3 Chennai basic  10-01 09:00             C3 Chennai basic  10-02 07:00 D
                                              C4 Kochi   basic  10-02 09:00 I
                                              C4 Kochi   silver 10-02 09:30 U   same key

**1. Predict before running.** C1 updates to Mumbai. C2's row is older than the target, so it is ignored — the
guard prevents a downgrade to stale data. C3 is deleted. C4 appears twice; after dedup only the 09:30 silver row
remains, and it is inserted.

**2. The statement.** The MERGE from the notes, with the customer columns:

    MERGE INTO customers_current AS t
    USING (SELECT DISTINCT ON (customer_id) * FROM cust_batch
           ORDER BY customer_id, updated_at DESC) AS s
    ON t.customer_id = s.customer_id
    WHEN MATCHED AND s.op = 'D' THEN DELETE
    WHEN MATCHED AND s.updated_at > t.updated_at THEN
        UPDATE SET city = s.city, tier = s.tier, updated_at = s.updated_at
    WHEN NOT MATCHED AND s.op <> 'D' THEN
        INSERT VALUES (s.customer_id, s.city, s.tier, s.updated_at)
    RETURNING merge_action(), t.customer_id;

**3. Run it (PostgreSQL 18 via PGlite).**

    UPDATE C1 | DELETE C3 | INSERT C4
    C1 Mumbai gold   2026-10-02 08:00
    C2 Delhi  silver 2026-10-01 11:00
    C4 Kochi  silver 2026-10-02 09:30

**4. Run it again.** RETURNING printed nothing: zero rows touched. C1 and C4 match with equal timestamps, so
the guard skips them; C3 is gone, and a D row for a missing key matches no clause.

**5. What could still go wrong.** Two updates with the same updated_at for one key — dedup then picks either.
Order by a source sequence (a log position or version number) as the tie-breaker when the source provides one.

**Result.** Prediction and output agree, and the second run is a no-op. Put that second run in the pipeline's
tests.`,
    mcqs: [
      mcq('A MERGE into orders fails in PostgreSQL with "MERGE command cannot affect row a second time". What is the right fix?', [
        ['Deduplicate the source to one row per key before the MERGE', true],
        ['Add a primary key on order_id to the target table and retry', false],
        ['Split the MERGE into a separate UPDATE and an INSERT step', false],
        ['Run the MERGE once for each row so that no row clashes', false],
      ], 'Two source rows matched one target row; keep the newest per key with DISTINCT ON or ROW_NUMBER. A primary key does not change the source, separate UPDATE and INSERT steps still meet both rows, and row-by-row loops are slow and order-dependent.'),
      mcq('An upsert has no WHERE EXCLUDED.updated_at > orders.updated_at guard. A delayed 10:01 update for ZB-2002 arrives after the 10:05 one was loaded. What happens?', [
        ['The older 10:01 values overwrite the newer 10:05 row', true],
        ['The database rejects the row as a conflict and fails', false],
        ['The database keeps the 10:05 row since it is newer', false],
        ['Both versions are stored as two rows for ZB-2002', false],
      ], 'DO UPDATE applies whatever arrives last in load order, so state goes backwards. The conflict is handled, not rejected; the database does not compare timestamps unless you tell it to; and the primary key prevents a second row.'),
      mcq('A team uses MERGE ... WHEN NOT MATCHED BY SOURCE THEN DELETE on its nightly incremental batch of changed rows. What will it do?', [
        ['Delete every target row that did not change that day', true],
        ['Delete only rows that the source marked with op = D', false],
        ['Fail, since NOT MATCHED BY SOURCE needs a full table', false],
        ['Nothing, because an incremental batch has no deletes', false],
      ], 'NOT MATCHED BY SOURCE means "in the target, not in the source", and an incremental batch leaves out every unchanged row. It is only safe with a complete snapshot. It ignores op flags, and the database cannot know the batch is partial, so it does not fail.'),
    ],
    checkpoint: [
      mcq('A PostgreSQL upsert fails with "there is no unique or exclusion constraint matching the ON CONFLICT specification". What is missing?', [
        ['A unique constraint or primary key on the conflict column', true],
        ['A DISTINCT ON in the SELECT that feeds the INSERT', false],
        ['A WHERE clause after DO UPDATE comparing timestamps', false],
        ['A transaction around the INSERT ... ON CONFLICT', false],
      ], 'ON CONFLICT needs a unique index or constraint to detect the conflict. Dedup and the timestamp guard are correctness steps that do not create one, and a transaction does not change how conflicts are detected.'),
      mcq('A MERGE lists WHEN MATCHED AND s.updated_at > t.updated_at THEN UPDATE before WHEN MATCHED AND s.op = \'D\' THEN DELETE. A newer row marked D arrives for BLR-07. What happens?', [
        ['BLR-07 is updated, since the first clause that matches wins', true],
        ['BLR-07 is deleted, because DELETE outranks UPDATE in a MERGE', false],
        ['The MERGE fails, since two clauses match the same target row', false],
        ['BLR-07 is skipped, because a D row may not update the target', false],
      ], 'WHEN clauses are checked in order and only the first matching one runs; PostgreSQL and DuckDB both updated BLR-07 to the D row\'s values. There is no priority by action, overlapping conditional clauses are allowed, and nothing stops a D row from matching the update clause.'),
      mcq('A MySQL target needs the same insert-or-update. Which statement is correct for MySQL 8?', [
        ['INSERT ... ON DUPLICATE KEY UPDATE', true],
        ['INSERT ... ON CONFLICT DO UPDATE', false],
        ['MERGE INTO ... WHEN MATCHED THEN', false],
        ['UPSERT INTO ... USING ... ON KEY', false],
      ], 'MySQL uses ON DUPLICATE KEY UPDATE and has no MERGE. ON CONFLICT is PostgreSQL, SQLite and DuckDB syntax, and UPSERT INTO is not a MySQL statement.'),
    ],
  },

  /* ── PARTITIONING_INDEXES ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_PARTITIONING_INDEXES',
    notes: `"Adding an Index for a Reason" was about finding a few rows in an operational table. Analytical tables are read
differently: millions of rows per query, a few columns, almost always a date range. Speed and cost then depend on
one thing — how much data the engine can skip without reading it. You decide that when you lay the table out.

## Three ways an engine skips data

1. **Partition pruning.** The table is split by a column's value (a folder per month on S3, a partition per month
   in PostgreSQL). A filter on that column rules out whole partitions before anything is opened.
2. **Min/max statistics per block.** Parquet keeps the minimum and maximum of every column for each row group
   (about 122,880 rows in DuckDB's writer); Redshift has zone maps; Snowflake has micro-partitions. A block whose
   range cannot match the filter is skipped. This only works if similar values sit together — if the data is
   sorted or clustered.
3. **Indexes.** B-trees for selective lookups in OLTP. Analytical engines mostly do not use them for scans.

## An experiment: 20 million orders, four layouts

A year of synthetic ZipBasket orders (1 Oct 2025 to 30 Sep 2026, 8 cities) was written with DuckDB 2.0 four ways:

    unsorted   one Parquet file, rows in random order          461 MB
    sorted     one Parquet file, sorted by order time          390 MB
    by_month   Hive folders yr=2026/mon=9/, 12 files            450 MB
    by_day     Hive folders order_date=2026-09-15/, 365 files   431 MB

Each query summed GMV by city; median of six warm runs, 4 threads, on a laptop:

    query                 unsorted   sorted   by_month   by_day
    one day (15 Sep)        177 ms    34 ms      44 ms   130 ms
    one month (Sep)         136 ms    32 ms      34 ms   151 ms
    whole year              141 ms   147 ms     243 ms   425 ms

EXPLAIN ANALYZE shows why. For the one-day query on the unsorted file:

    Filters: order_date = '2026-09-15'::DATE
    Row Groups Scanned: 163 / 163
    Data Read: 221.8 MB

and on the sorted file:

    Row Groups Scanned: 2 / 163
    Data Read: 1.3 MB

Same rows, same answer. In the unsorted file every row group spans the whole year, so min/max statistics rule
nothing out. Sorting alone (no partitions) gave the fastest date queries and the smallest file, because sorted
columns compress better.

The by_day layout pruned perfectly — "Scanning Files: 1/365", 274 kB read — yet took 130 ms, because finding and
opening 365 files costs more than the reading. The whole-year query on it was three times slower than on one
file. That is the small-files problem, and on S3 it is worse: every file is a request and a listing. Engines
that bill by bytes scanned (Athena, BigQuery on-demand) turn "221.8 MB versus 1.3 MB" directly into money.

## The filter must be written so skipping can work

Same sorted file, same answers, different WHERE clauses:

    order_ts + INTERVAL 330 MINUTE >= TIMESTAMP '2026-09-15 00:00' AND ... < '2026-09-16 00:00'   889 ms  163/163
    order_ts >= TIMESTAMP '2026-09-14 18:30' AND order_ts < TIMESTAMP '2026-09-15 18:30'          33 ms    2/163
    strftime(order_date, '%Y-%m') = '2026-09'                                                 1,318 ms  163/163
    order_date >= DATE '2026-09-01' AND order_date < DATE '2026-10-01'                            42 ms

Arithmetic or a function on the column hides it from the statistics; move the arithmetic to the constants (the
IST day becomes a UTC range). DuckDB rewrote CAST(order_ts AS DATE) = DATE '2026-09-15' into a range by itself
(2/163), and it pruned Hive folders even through strftime (30/365 files). Other engines do less: do not rely on it.

The partition column itself must be in the filter. In by_month, WHERE order_date in September read all 12 files
(the statistics then skipped most row groups: 14/175); WHERE yr = 2026 AND mon = 9 opened one file. Partition by
the column people filter on, under the name they filter by — usually the event date itself.

## Choosing a layout

- **Partition by the column nearly every query filters on**, usually the event date. Never by something with
  millions of values (customer_id): that is millions of tiny files.
- **Pick the granularity from the data size.** Aim for files in the tens to hundreds of megabytes; at 55,000 rows
  a day, ZipBasket's daily files were about 1 MB — too small. Monthly folders fit; or no folders and a sort.
- **Sort or cluster within partitions** by the next most common filter (city, store_id).
- **Retention follows partitions.** Dropping a month is a metadata change; deleting its rows is a scan.

## PostgreSQL partitioning

Declarative range partitions (run on PostgreSQL 18 in PGlite, 600,000 rows):

    CREATE TABLE orders (order_id bigint, order_date date NOT NULL, city text,
                         amount_paise int) PARTITION BY RANGE (order_date);
    CREATE TABLE orders_2026_09 PARTITION OF orders
        FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE orders_default PARTITION OF orders DEFAULT;

    EXPLAIN SELECT ... WHERE order_date = DATE '2026-09-15'
    ->  Seq Scan on orders_2026_09 orders          (one partition)

With WHERE date_trunc('month', order_date) = DATE '2026-09-01' the plan listed all four partitions. A value only
known at run time (a subquery) was pruned during execution; the plan showed the others as "(never executed)".
Without a DEFAULT partition, a row outside every range fails: no partition of relation "t" found for row.
Dropping July's partition took 6 ms; DELETE of the equivalent 202,182 rows took 257 ms (WebAssembly timings —
compare them, do not quote them).

For an append-only table where time only grows, a BRIN index stores min/max per block range. On 1 million
events it was 24 kB against 21 MB for a B-tree on the same column, and it served an hour's range scan.

## In the warehouses

From the documentation, not run: BigQuery uses PARTITION BY DATE(order_ts) CLUSTER BY city, store_id, and
require_partition_filter can refuse queries that would scan every partition. Snowflake micro-partitions
automatically; a CLUSTER BY key helps very large tables, and the query profile shows partitions scanned against
total. Redshift uses a SORTKEY (zone maps) and a DISTKEY or DISTSTYLE ALL for small dimensions. Athena reads Hive
folders on S3 registered in the Glue catalog. Azure Synapse dedicated pools hash-distribute tables. Delta Lake
and Iceberg layouts come in "Warehouses and Lakehouses".`,
    workedExample: `**Scenario.** ZipBasket's analysts query orders on S3 through Athena: 80% of queries are "one day or one week,
by city or store"; finance runs a monthly close; data science reads a whole year once a quarter. About 20 million
orders a year today, growing. Choose the layout.

**1. Size first.** 20 million rows were about 400–460 MB of Parquet: roughly 37 MB a month, 1.2 MB a day.

**2. Daily partitions are too small.** In the experiment, by_day answered one day in 130 ms against 34–44 ms for
the alternatives, and the whole year in 425 ms against 141–147 ms — 365 files to list and open. On S3 that gap
grows with every request.

**3. Monthly partitions, sorted inside.** Write folders yr=/mon=, and inside each, sort by order time and then
city. A day's query then prunes to one folder and, through the row-group statistics, to a few row groups. A full
year is twelve files.

**4. Make filters hit the layout.** Give analysts a view or a documented rule: filter on yr and mon (or on a
single order_month column used as the partition) and on order_ts as a plain range. Show them the difference:
order_date in September read 12 files, yr = 2026 AND mon = 9 read one.

**5. Revisit with growth.** If volume grows a hundredfold, one month becomes about 3.7 GB; switch to daily
partitions then, because each day's file would be around 120 MB. The rule is file size, not habit.

**6. Retention.** Orders older than seven years are removed by deleting whole month folders (and their catalog
partitions), never by rewriting files.

**7. Check it worked.** For each common query, run EXPLAIN ANALYZE (or read Athena's "data scanned") before and
after, and record files and bytes read, as "Proving the Change Helped" asked.

**Result.** Partition by month, sort by time then city inside, filter on the partition columns: a typical query
reads a few megabytes instead of the whole table.`,
    mcqs: [
      mcq('A Parquet file holds a year of orders in random order. A one-day query reports "Row Groups Scanned: 163 / 163". What change lets min/max statistics skip row groups?', [
        ['Rewrite the file sorted by order date', true],
        ['Add more threads to the DuckDB session', false],
        ['Raise the row group size to 1 million', false],
        ['Compress the file with a stronger codec', false],
      ], 'Statistics skip a row group only if its min/max range excludes the value; random order makes every range span the year. Threads read the same data faster without skipping, bigger row groups skip even less, and compression does not change the ranges.'),
      mcq('A table of 55,000 orders a day is written as one Parquet folder per day. Day queries are fine, but year-long scans are three times slower than on one file. Why?', [
        ['Listing and opening hundreds of tiny files costs more than reading them', true],
        ['Partition pruning is switched off whenever a query has no WHERE clause', false],
        ['Daily folders store the date column again inside every file, twice', false],
        ['Hive partitioning only works for queries that read under a month', false],
      ], 'Per-file overhead dominates when files are about a megabyte: the small-files problem. Without a filter there is simply nothing to prune, the partition column lives in the path rather than the file, and Hive partitioning works for any range.'),
      mcq('Orders are partitioned in folders yr=/mon=. A query filters WHERE order_date >= \'2026-09-01\' AND order_date < \'2026-10-01\'. How many folders does the engine have to open?', [
        ['All of them; the filter is not on yr or mon', true],
        ['Only September\'s, since the dates imply it', false],
        ['None, since order_date is not stored at all', false],
        ['Only the most recent one, by default rules', false],
      ], 'The engine does not know that mon is derived from order_date, so every folder is a candidate; row-group statistics may then skip blocks inside them. Filter on the partition columns. order_date is stored in the files, and there is no "most recent folder" default.'),
    ],
    checkpoint: [
      mcq('An orders table on S3 is sorted by order_ts. Which filter for one IST day lets row-group statistics skip data?', [
        ['order_ts >= \'2026-09-14 18:30\' AND order_ts < \'2026-09-15 18:30\'', true],
        ['order_ts + INTERVAL 330 MINUTE BETWEEN \'2026-09-15\' AND \'2026-09-16\'', false],
        ['strftime(order_ts + INTERVAL 330 MINUTE, \'%Y-%m-%d\') = \'2026-09-15\'', false],
        ['CAST(order_ts + INTERVAL 330 MINUTE AS VARCHAR) LIKE \'2026-09-15%\'', false],
      ], 'Putting the IST shift on the constants keeps the column bare, so its min/max can be compared; it read 2 of 163 row groups. Arithmetic or a function applied to order_ts forced a scan of all 163.'),
      mcq('Which column is the worst choice for partitioning a 5-billion-row UPI transactions table?', [
        ['payer_id, with tens of millions of distinct payers', true],
        ['txn_date, which nearly every query filters on', false],
        ['txn_month, if daily partitions would be too small', false],
        ['txn_date, with merchant_id used as a sort key', false],
      ], 'High-cardinality partition keys create millions of tiny partitions and files. Date or month suits time-filtered queries, and sorting by merchant inside date partitions is the usual clustering choice.'),
      mcq('A PostgreSQL events table is append-only and queried by time range. Why consider a BRIN index on its timestamp?', [
        ['It is tiny, because it keeps one min/max per block range', true],
        ['It finds a single row faster than any B-tree could do', false],
        ['It removes the need for partitions on very large tables', false],
        ['It keeps rows sorted by timestamp as new rows are added', false],
      ], 'BRIN summarises ranges of blocks, so it was 24 kB against 21 MB for a B-tree, and works because time order matches physical order. B-trees win for single-row lookups, BRIN does not replace partition-level retention, and it does not reorder rows.'),
    ],
  },

  /* ── QUERY_PLANS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_QUERY_PLANS',
    notes: `"Reading a Query Plan" taught PostgreSQL's plans: estimates against actuals, scans, the three join methods,
reading from the inside out. A pipeline engineer meets two more things: analytical engines (DuckDB here; Snowflake,
BigQuery, Redshift and Spark show the same ideas in their own screens) and the slow steps of a nightly job, which
are usually about too much data rather than a missing index.

## EXPLAIN and EXPLAIN ANALYZE in DuckDB

The question: September GMV of dark stores by city, on 20 million orders and 4,000 stores. EXPLAIN (estimates,
nothing runs) and EXPLAIN ANALYZE (runs it) gave, trimmed from DuckDB's boxes and read from the bottom:

    Table Scan orders   Filters: order_date >= '2026-09-01'
                        Dynamic Filters: optional: store_id IN PRF(store_id)
                        Row Groups Scanned: 163 / 163
                        est ~4,000,000     actual 163,955 rows
    Table Scan stores   Filters: store_type = 'dark_store'
                        est ~2,000         actual 400 rows
    Hash Join INNER     Conditions: CAST(store_id AS BIGINT) = store_id
                        est ~1,760,950     actual 163,955 rows
    Hash Group By       actual 4 rows
    Total Time: 0.176s  (median of warm runs: 89 ms)

What it says:

- **The build side is the small one.** A hash join builds a hash table from one input (here the 400 stores, the
  right-hand child in DuckDB's tree) and streams the other through it. A huge build side is a memory problem.
- **The join filtered the scan.** "Dynamic Filters" is a filter built from the 400 store ids at run time and
  pushed into the orders scan — modern engines do this, which is one reason to join to a filtered dimension.
- **Nothing was skipped.** 163 of 163 row groups: the table is not ordered by date (last lesson).
- **Estimates were off tenfold** — about 1.76 million join rows expected, 163,955 produced; harmless here, a
  wrong join order or memory grant elsewhere.
- **A type mismatch.** orders.store_id is INTEGER and stores.store_id BIGINT, so every row is cast. Fix the types in
  staging.
- **Operator times are added up across threads,** which is why the scan showed 590 ms inside a 0.176 s query.
  Compare operators with each other, and the total with the total.

## The join that multiplies rows

GMV by city joined orders to payments "to be sure they were paid". Some orders have a failed attempt and then a
successful one, so two payment rows:

    Table Scan orders   Filters: status = 'delivered'   18,399,158 rows
    Table Scan payments                                 20,580,390 rows
    Hash Join INNER     order_id = order_id             18,951,458 rows

A join's output larger than the side you meant to keep is the signal ("Joins for Analysis, and the Rows They Lose
or Double" in plan form). GMV came out 1,516,276,513,399 paise instead of 1,472,118,421,004 — 3% too high —
and slow:

    join to payments (wrong)                  1,905 ms
    EXISTS (... pay_status = 'success')       2,116 ms   correct
    no join; status = 'delivered' already     75 ms      correct
    means paid

The fastest fix was removing a join the question did not need.

## The usual causes of a slow analytical step

    cause                              evidence in the plan                fix
    reads columns it does not need     scan projections list everything   name the columns
    filter hides the column            all row groups/partitions scanned   bare column, range on constants
    data not laid out for the filter   163/163 row groups                  sort / partition (last lesson)
    join fan-out                       join output > input                 fix the key or pre-aggregate
    exact distinct on huge data        heavy aggregate                     approximate, if allowed
    sorting everything                 Order By on all rows                ORDER BY ... LIMIT (Top N)
    spills                             Disk / Batches / bytes spilled      less data in, or more memory

Measured on the same 20 million rows: SELECT * of one city's 2.5 million orders took 0.907 s in EXPLAIN
ANALYZE against 0.213 s for two columns (and 10.1 s against 2.0 s to fetch into Python). COUNT(DISTINCT
customer_id) took 627 ms for 2,996,178; approx_count_distinct 59 ms for 2,972,102 — 0.8% off, fine for a
dashboard, wrong for billing. The top ten orders by amount: 13 ms with LIMIT 10 (a Top N operator), 2,088 ms
sorting all 20 million.

## Spills, in PostgreSQL

With work_mem = 1MB, sorting 500,000 rows (PostgreSQL 18, PGlite):

    Sort Method: external merge  Disk: 12752kB
    Buffers: ... temp read=3187 written=3211

With work_mem = 64MB: Sort Method: quicksort  Memory: 23818kB. A GROUP BY over 300,000 customers at 1MB showed
HashAggregate ... Batches: 17  Disk Usage: 15160kB. Fixes, in order: send less data into the sort or aggregate;
raise memory for that job's session only (SET work_mem inside the job, never globally on a shared server);
then a bigger warehouse. Snowflake's query profile reports bytes spilled to local and remote storage; Redshift's
SVL_QUERY_SUMMARY has is_diskbased (documentation, not run).

## Extract queries hurt the source

An incremental extract — WHERE updated_at > watermark — on a 500,000-row OLTP table without an index:

    Seq Scan on orders   Rows Removed by Filter: 496800   Buffers: shared hit=3712

and with an index on updated_at: Index Scan ... Buffers: shared hit=28 read=9 for the same 3,200 rows. Agree
that index with the application team; every night's extract otherwise reads the production table in full.

## A routine

1. EXPLAIN ANALYZE on realistic data. 2. Find the operator with the most time or rows. 3. At every join, compare
rows in with rows out. 4. At every scan, compare what was read with what was needed. 5. Check estimates against
actuals. 6. Change one thing and measure again.`,
    workedExample: `**Scenario.** The dark-store GMV step in ZipBasket's nightly job takes 89 ms on 20 million rows today, but
the table grows by 55,000 rows a day and the same pattern runs for 30 reports. Make it read less.

**1. Plan first.** From the notes: the orders scan read 163/163 row groups for a one-month filter, and the join
cast every store_id.

**2. Hypothesis.** The table was loaded in arrival order mixed across dates, so every row group spans the year.
Rewriting it ordered by date should let the statistics skip eleven months.

**3. One change.** In DuckDB:

    CREATE OR REPLACE TABLE orders_by_date AS
    SELECT * FROM orders ORDER BY order_date, store_id;

(12.5 s for 20 million rows; in production, the nightly load would append in date order, and the lakehouse
topic covers compaction.)

**4. Measure.** Median of warm runs, same query, same answer for all four cities:

    orders           89 ms   Row Groups Scanned: 163 / 163
    orders_by_date   15 ms   Row Groups Scanned:  14 / 163

**5. The second change, separately.** stores rebuilt with store_id as INTEGER: the join condition became plain
store_id = store_id. Time: 15 ms against 15 ms — no measurable gain at this size. Keep it anyway, for correctness
and because casts in joins add up at a billion rows; but report it honestly as "no speed change".

**6. Report.** "Dark-store September GMV: 89 ms to 15 ms on 20 million rows (median of six), from row groups
read 163 to 14 after loading orders sorted by date. Store-id type fix: no measured change. Same results."

**Result.** One plan, one hypothesis, one change at a time, both numbers before and after.`,
    mcqs: [
      mcq('A DuckDB plan shows a hash join whose output is 18,951,458 rows while the orders scan feeding it produced 18,399,158. The other side is payments. What does this suggest?', [
        ['Some orders have more than one payment row, so they are counted twice', true],
        ['The hash table spilled to disk, which duplicated rows as it read back', false],
        ['The estimate was wrong, so the engine produced extra rows to correct it', false],
        ['The join used the wrong build side, which always adds rows to output', false],
      ], 'Output greater than the side you meant to keep means the key repeats on the other side: fan-out, and inflated sums. Spilling, estimates and the choice of build side change speed, never the result.'),
      mcq('In PostgreSQL, EXPLAIN ANALYZE of a nightly sort shows "Sort Method: external merge  Disk: 12752kB". What is the first thing to try?', [
        ['Send fewer rows and columns into the sort', true],
        ['Raise work_mem for the whole server at once', false],
        ['Add a B-tree index on every sorted column', false],
        ['Run ANALYZE so estimates are refreshed first', false],
      ], 'The sort spilled because its input did not fit in work_mem; shrinking the input fixes the cause. Raising work_mem globally multiplies memory across every connection, indexes rarely remove a big analytical sort, and fresh statistics do not change the memory needed.'),
      mcq('EXPLAIN ANALYZE in DuckDB reports a scan taking 590 ms in a query whose total time is 0.176 s. What explains it?', [
        ['Operator times add up across threads', true],
        ['The profiler counts the scan twice over', false],
        ['The total excludes the time for the scan', false],
        ['The scan was cached and timed separately', false],
      ], 'With four threads each spending time in the scan, the per-operator figure is a sum of thread time and can exceed wall-clock time. The total is wall-clock and includes the scan, and nothing is counted twice or cached separately.'),
    ],
    checkpoint: [
      mcq('A DuckDB hash join\'s condition reads CAST(store_id AS BIGINT) = store_id. What does it reveal about the data?', [
        ['The two store_id columns have different types', true],
        ['The planner is unable to use a hash join here', false],
        ['One of the tables has NULLs in its store_id', false],
        ['The store_id values overflow a 32-bit integer', false],
      ], 'The engine casts one side to compare INTEGER with BIGINT; the fix is consistent types in staging. The plan is a hash join, NULLs do not cause casts, and the cast widens the smaller type rather than signalling overflow.'),
      mcq('GMV joins orders to payments, and some orders have two payment rows. Which rewrite gives the correct total fastest when every delivered order is known to be paid?', [
        ['Drop the join and sum delivered orders alone', true],
        ['Use SELECT DISTINCT over the joined result', false],
        ['Add a filter pay_status = \'success\' in the join', false],
        ['Switch the join from INNER to a LEFT JOIN', false],
      ], 'If delivered already means paid, the join adds nothing but duplicates; removing it took 75 ms against 1,905 ms. DISTINCT can merge genuinely different orders with equal values, a success filter still double counts an order with two successful rows, and a LEFT JOIN keeps the fan-out.'),
      mcq('An incremental extract WHERE updated_at > :watermark shows "Seq Scan ... Rows Removed by Filter: 496800" on the production database. What is the fix?', [
        ['Agree an index on updated_at with the application team', true],
        ['Extract the whole table each night and filter it later', false],
        ['Run the extract during peak hours so it ends sooner', false],
        ['Rewrite the filter as updated_at::date > :watermark', false],
      ], 'An index lets the extract read the few changed rows (37 buffers instead of 3,712). A full extract reads even more, peak hours hurt users, and casting the column makes an index unusable.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_DEBUGGING',
    notes: `Six things that go wrong with pipeline SQL at ZipBasket. For each: the symptom, the cause, and the one change
that fixes it. Every error message and number below came from running the broken version — PostgreSQL 18 in
PGlite, or DuckDB 2.0. Read the message and the row counts before touching the SQL.

## 1. The upsert that fails on its first night

**Symptom.** A new store dimension load fails at once:

    INSERT INTO dim_store VALUES ('BLR-07','HSR') ON CONFLICT (store_id) DO UPDATE ...
    ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification

**Cause.** dim_store was created with CREATE TABLE AS SELECT, which copies columns and data but no constraints.
There is nothing for the conflict to be detected against.

**Fix.** ALTER TABLE dim_store ADD PRIMARY KEY (store_id) — after checking the existing rows have no duplicate
store_id, or the ALTER fails. The same upsert then updated BLR-07 to HSR. Create target tables with explicit DDL,
keys included, rather than CTAS.

## 2. MERGE fails, but only on sale days

**Symptom.** On a festive-sale night: ERROR: MERGE command cannot affect row a second time. Normal nights pass.

**Cause.** The extract window holds every change since the last run. On a quiet night each order changes once in
that window; on sale day many orders go placed, packed, out for delivery, delivered within it, so the batch has
several rows per order_id.

**Fix.** Deduplicate in the USING clause — DISTINCT ON (order_id) ... ORDER BY order_id, updated_at DESC, plus a
tie-breaker — so each key arrives once. A test batch with two rows for one key belongs in the pipeline's tests;
quiet-day data never exercises it.

## 3. The dimension that grows by one row every night

**Symptom.** dim_customer has 1,000 more rows than there are customers, and the gap grows each day.

**Cause.** Some source rows have a NULL email, and email is the merge key. NULL = NULL is not true, so those rows
never match and are inserted again on every run. PostgreSQL, three runs of the same batch: '<NULL>' rows went
1, 2, 3 while a@x.in stayed at 1.

**Fix.** A business key must not be NULL. Send rows without a key to a reject table and alert; key on something
that always exists (customer_id). ON t.email IS NOT DISTINCT FROM s.email does stop the growth — it was 1 row
after three runs — but it merges every customer without an email into one row, which is usually wrong too.

## 4. "cannot drop table ... because other objects depend on it"

**Symptom.** The rebuild script — build mart__new, DROP mart, RENAME — starts failing the week someone adds a
dashboard: ERROR: cannot drop table mart_store_daily because other objects depend on it.

**Cause.** A view now selects from the mart, and PostgreSQL will not drop a table a view depends on.

**Fix.** Not DROP ... CASCADE, which silently deletes the dashboard's view. In one transaction: TRUNCATE the
mart, INSERT from the new build, DROP the build table. The view kept working and showed the new rows.

## 5. Order status goes backwards

**Symptom.** Support sees orders shown as "packed" that customers received an hour ago.

**Cause.** Two faults, both reproduced in DuckDB. The upsert had no guard, so a late-arriving 10:01 update
overwrote the 10:05 state of ZB-2002. And the batch was not deduplicated: DuckDB's ON CONFLICT accepted two rows
for ZB-2001 without an error and kept the first — with the batch in time order, the older "packed".

**Fix.** Deduplicate to the newest row per key, and add WHERE EXCLUDED.updated_at > orders.updated_at (or the
same condition on MERGE's WHEN MATCHED). Re-run: ZB-2001 delivered, ZB-2002 stays at 10:05.

## 6. The IST report that reads the whole table

**Symptom.** A "yesterday in India" report on the sorted orders table takes 889 ms; similar reports take 30 ms.

**Cause.** The filter shifts the column: order_ts + INTERVAL 330 MINUTE >= '2026-09-15'. EXPLAIN ANALYZE shows
Row Groups Scanned: 163 / 163. In PostgreSQL the same mistake — date_trunc('month', order_date) = '2026-09-01' —
put every partition in the plan.

**Fix.** Shift the constants instead: order_ts >= '2026-09-14 18:30' AND order_ts < '2026-09-15 18:30'. 33 ms,
2 / 163 row groups, same total.

## The habit

Each fix changed one thing, and the evidence came first: the error text, a row count across runs, a plan line.
Running a load twice on a copy and comparing is the single most useful test a data engineer can write.`,
    mcqs: [
      mcq('dim_customer gains rows every night although no new customers arrive. The MERGE joins ON t.email = s.email. What should you check first?', [
        ['Whether some source rows have a NULL email', true],
        ['Whether the MERGE runs inside a transaction', false],
        ['Whether the target has an index on its email', false],
        ['Whether the batch is sorted by updated_at first', false],
      ], 'NULL never equals NULL, so keyless rows never match and are inserted again each run. A transaction, an index or the sort order of the batch does not change how NULL keys compare.'),
      mcq('A rebuild fails with "cannot drop table mart_store_daily because other objects depend on it". Which fix keeps the dashboard working?', [
        ['TRUNCATE and INSERT from the new build inside one transaction', true],
        ['Use DROP TABLE ... CASCADE so the dependent objects are removed', false],
        ['Rename the old table first so the DROP step no longer applies', false],
        ['Drop the dashboard\'s view before every run and never recreate it', false],
      ], 'Replacing the rows keeps the table, so the view still depends on a valid object. CASCADE deletes the view, renaming moves the dependency with the table, and dropping the view breaks the dashboard.'),
      mcq('An upsert has worked for months and suddenly fails only on a festive-sale night with "ON CONFLICT DO UPDATE command cannot affect row a second time". Why that night?', [
        ['More orders changed several times within one extract window', true],
        ['The sale traffic caused the unique index on orders to fill up', false],
        ['The batch was too large, so PostgreSQL split it into two parts', false],
        ['The orders table was locked by the app during the sale period', false],
      ], 'The error means one key appeared twice in the batch; busy days put several status changes for one order in the same window. Indexes do not fill up, PostgreSQL does not split statements, and locks cause waits or timeouts, not this error.'),
      mcq('A filter order_ts + INTERVAL 330 MINUTE >= \'2026-09-15\' scans every row group of a table sorted by order_ts. What is the fix?', [
        ['Shift the constants: compare order_ts with a UTC range', true],
        ['Add a B-tree index on order_ts to the analytical table', false],
        ['Store order_ts in IST so that no shifting is ever needed', false],
        ['Increase the row group size so fewer groups are scanned', false],
      ], 'Keeping the column bare lets min/max statistics skip row groups (2 of 163 instead of 163). Analytical scans do not use B-trees this way, storing local time creates new problems with other regions and boundaries, and bigger row groups skip less.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_PRACTICE',
    notes: `Eight exercises, easiest first. Write each answer before reading ours. Answers 2 and 4 were run on PostgreSQL 18
(PGlite) and match the outputs shown; the layout arithmetic was checked in Python.

## 1. Which layer? (easy)

Place each in raw, staging, intermediate or mart: (a) CAST(event_ts AS TIMESTAMPTZ); (b) the JSON response from
the payments API, exactly as received; (c) one row per store per IST day with GMV; (d) keeping the latest event
per order; (e) lower(trim(city)).

**Answer.** (a) staging; (b) raw; (c) mart; (d) intermediate; (e) staging.

## 2. An upsert with a guard (easy)

products(sku PRIMARY KEY, price_paise, updated_at) holds ATTA-5KG at 26500, updated 09:00. A feed sends ATTA-5KG at
24900 (08:00) and DAL-1KG at 15800 (08:30). Write the PostgreSQL upsert so older prices never win. What does the
table hold afterwards?

**Answer.**

    INSERT INTO products (sku, price_paise, updated_at)
    VALUES ('ATTA-5KG', 24900, '2026-10-20 08:00'), ('DAL-1KG', 15800, '2026-10-20 08:30')
    ON CONFLICT (sku) DO UPDATE
    SET price_paise = EXCLUDED.price_paise, updated_at = EXCLUDED.updated_at
    WHERE EXCLUDED.updated_at > products.updated_at;

One row affected. ATTA-5KG stays at 26500 (09:00); DAL-1KG is inserted at 15800.

## 3. QUALIFY in PostgreSQL (easy)

Rewrite for PostgreSQL, two ways: SELECT * FROM stg_payments QUALIFY ROW_NUMBER() OVER (PARTITION BY payment_id
ORDER BY updated_at DESC, seq DESC) = 1.

**Answer.** (1) SELECT DISTINCT ON (payment_id) * FROM stg_payments ORDER BY payment_id, updated_at DESC, seq
DESC. (2) Wrap it: SELECT * FROM (SELECT *, ROW_NUMBER() OVER (...) AS rn FROM stg_payments) x WHERE rn = 1 —
and drop rn from the output if the target has fixed columns.

## 4. Predict a MERGE (medium)

stores_current: BLR-07 open and BLR-11 open, both 10-01 09:00. Batch: BLR-07 closed 10-02 22:00 op D; BLR-11 paused
10-02 10:00 op U; HYD-04 open 10-02 08:00 op I. The MERGE lists WHEN MATCHED AND s.updated_at > t.updated_at THEN
UPDATE first, then WHEN MATCHED AND s.op = 'D' THEN DELETE, then WHEN NOT MATCHED THEN INSERT. Result?

**Answer.** UPDATE BLR-07, UPDATE BLR-11, INSERT HYD-04 — BLR-07 is not deleted; it becomes "closed", because the
update clause matched first. Move the DELETE clause first. (Exactly what PostgreSQL and DuckDB returned.)

## 5. Make each filter prunable (medium)

The table is sorted by order_ts and partitioned by order_date. Rewrite: (a) WHERE year(order_date) = 2026 AND
month(order_date) = 9; (b) WHERE CAST(order_ts AS VARCHAR) LIKE '2026-09-15%'; (c) WHERE date_trunc('month',
order_date) = DATE '2026-09-01'.

**Answer.** (a) and (c): order_date >= DATE '2026-09-01' AND order_date < DATE '2026-10-01'. (b) order_ts >=
TIMESTAMP '2026-09-15 00:00' AND order_ts < TIMESTAMP '2026-09-16 00:00'. In each, the column is bare and the
range is half-open; the strftime form took 1,318 ms against 42 ms for the range in the lesson's run.

## 6. Choose a partition grain (medium)

A UPI switch's analytics table receives 2 billion transactions a year; queries filter on a day or a week and
often on merchant_id. In the lesson's data, 20 million rows were about 430 MB of Parquet. Partition by day, month,
or merchant_id?

**Answer.** About 21.5 bytes a row, so 2,000,000,000 / 365 ≈ 5.5 million rows and about 118 MB a day: daily
partitions give healthy file sizes. Sort (cluster) by merchant_id inside each day. Never partition by merchant_id
— hundreds of thousands of merchants make tiny files, and most queries filter by date anyway.

## 7. Read the plan (medium)

    Table Scan orders     Filters: status = 'delivered'    18,399,158 rows
    Table Scan payments                                    20,580,390 rows
    Hash Join INNER       order_id = order_id              18,951,458 rows
    Hash Group By         SUM(amount_paise)                8 rows

What is wrong, and what two fixes would you consider?

**Answer.** The join produces more rows than the delivered orders it was meant to keep: some orders have several
payment rows, so their amounts are summed twice. Fix 1: drop the join if delivered already implies paid (75 ms,
correct, in the lesson). Fix 2: if payment matters, use EXISTS for a successful payment, or pre-aggregate
payments to one row per order before joining.

## 8. A spilling aggregate (harder)

A nightly PostgreSQL step shows: HashAggregate ... Batches: 17 Memory Usage: 2257kB Disk Usage: 15160kB, under
work_mem = 1MB, grouping 500,000 rows into 300,000 customers. Give two fixes in the order you would try them.

**Answer.** First reduce the input: only the columns the aggregate needs, only the rows the step needs (yesterday,
not all time), or aggregate an already-aggregated table. Then raise memory for this job only: SET work_mem =
'64MB' in the job's session — the sort in the lesson went from external merge (12,752 kB on disk) to an in-memory
quicksort at 64MB. Not globally: work_mem applies per operation per connection.`,
    mcqs: [
      mcq('Where does lower(trim(city)) belong in a layered pipeline?', [
        ['In the staging model for that source', true],
        ['In each mart that groups by the city', false],
        ['In the raw table, by updating the rows', false],
        ['In the dashboard\'s calculated field', false],
      ], 'Standardising text is staging work, done once so every later model trusts it. Repeating it in marts drifts, raw data stays untouched, and a dashboard fix helps one chart only.'),
      mcq('products holds ATTA-5KG at 26500 updated 09:00. A guarded upsert receives ATTA-5KG at 24900 updated 08:00. What is stored afterwards?', [
        ['26500, because the incoming row is older and fails the guard', true],
        ['24900, because DO UPDATE always applies the incoming values', false],
        ['Both prices, as two rows that share the sku ATTA-5KG for now', false],
        ['Nothing, as the statement fails on the older incoming value', false],
      ], 'The WHERE EXCLUDED.updated_at > products.updated_at guard skips stale updates; the run affected only the new DAL-1KG row. Without the guard 24900 would win, the primary key forbids two rows, and a failed guard is a skip, not an error.'),
      mcq('A UPI table gets about 5.5 million rows (about 118 MB of Parquet) a day, queried by day and merchant. Which layout fits?', [
        ['Partition by day; sort by merchant_id inside', true],
        ['Partition by merchant_id; sort by the date', false],
        ['Partition by hour so that each file is small', false],
        ['One partition per year, with nothing sorted', false],
      ], 'A day is a healthy file size and matches the main filter; sorting by merchant lets statistics skip blocks within a day. Merchant partitions and hourly partitions create many small files, and an unsorted yearly partition prunes nothing.'),
      mcq('Which rewrite of WHERE year(order_date) = 2026 AND month(order_date) = 9 lets partition pruning and statistics work?', [
        ['order_date >= \'2026-09-01\' AND order_date < \'2026-10-01\'', true],
        ['order_date BETWEEN \'2026-09-01\' AND \'2026-09-30 23:59\'', false],
        ['CAST(order_date AS VARCHAR) LIKE \'2026-09%\'', false],
        ['date_trunc(\'month\', order_date) = \'2026-09-01\'', false],
      ], 'A half-open range on the bare column can be compared with partition bounds and min/max statistics. Mixing a time into a date BETWEEN is fragile, and the cast and date_trunc forms hide the column again.'),
      mcq('A plan shows an orders scan of 18.4 million rows feeding a join to payments that outputs 18.95 million rows. What is the likely consequence for SUM(amount_paise)?', [
        ['It is too high, because some orders are counted more than once', true],
        ['It is too low, since the hash join drops orders without a match', false],
        ['It is correct; the extra rows come from the payments-only side', false],
        ['It is correct but slower, since only performance is affected', false],
      ], 'Output above the input means repeated keys on the payments side, so those orders\' amounts are summed again — 3% too high in the lesson. An inner join can drop unmatched orders too, but that would lower the count, not raise it; and an inner join emits no payments-only rows.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_INTERVIEW_QUESTION',
    notes: `Asked in data engineer and analytics engineer interviews at product companies, GCCs and fintechs in Bengaluru,
Hyderabad and Pune, usually after a SQL coding round. Say each answer aloud in about two minutes, then compare.
Interviewers listen for whether you think about re-runs, duplicates and data volume — not just whether the query
returns the right rows once.

## Q1. "How do you make a daily load idempotent?"

**Model answer.** "Idempotent means running it twice gives the same table as running it once — retries and
backfills depend on it. The load processes a slice it is given, usually a date passed in by the orchestrator, not
'now'. For aggregate tables I replace the slice: delete that date and insert it, inside one transaction, or
overwrite the date partition. For entity tables I MERGE on the business key: deduplicate the batch to one row per
key, update only if the incoming updated_at is newer, insert new keys, and handle deletes from the op flag. Then I
test it: run the load twice on a copy and compare row counts and a checksum. A plain INSERT append is the thing I
avoid — one retry doubles the numbers."

**Follow-up.** "What if the target is Redshift and you use TRUNCATE?" — "TRUNCATE commits the transaction in
Redshift, so a failure after it leaves the table empty. I would use DELETE in the transaction, or load a staging
table and swap."

## Q2. "MERGE versus INSERT ... ON CONFLICT — and what goes wrong with each?"

**Model answer.** "ON CONFLICT is PostgreSQL, SQLite and DuckDB; it needs a unique constraint on the conflict
columns, and it inserts or updates — it cannot delete. MERGE is standard SQL — PostgreSQL 15 and later, SQL
Server, Snowflake, BigQuery, Databricks — and can insert, update and delete in one statement, with conditions per
clause, checked in order. Both break when the source has two rows for one key: PostgreSQL raises 'cannot affect
row a second time', and some engines silently keep one of them, which is worse. So I always deduplicate the
source with a deterministic tie-breaker, and guard updates with a timestamp or version so late data does not
overwrite newer state. MySQL has neither; it uses ON DUPLICATE KEY UPDATE."

**Follow-up.** "How do you handle deletes if the source has no op flag?" — "Compare against a full snapshot:
MERGE with WHEN NOT MATCHED BY SOURCE THEN DELETE, but only when the batch is guaranteed complete. Often a soft
delete is better, so history still reconciles."

## Q3. "A query on a 2 TB table in Athena is slow and expensive. What do you do?"

**Model answer.** "Athena bills by data scanned, so first I look at how much it scans and why. Usually the table
is not partitioned by the column the query filters on, or the query filters in a way that defeats pruning — a
function on the partition column, or a filter on a date while the partitions are year and month columns. Fixes:
partition by date at a grain that keeps files in the tens to hundreds of megabytes, sort within partitions by the
next filter, convert CSV or JSON to Parquet so only needed columns are read, compact small files, and select only
the needed columns. On a lab copy I measured a one-day query reading 221.8 MB from an unsorted Parquet file and
1.3 MB from the same data sorted. Then I would re-run and compare data scanned before and after."

**Follow-up.** "Why not partition by customer_id, since many queries filter on it?" — "Millions of partitions of
tiny files. Partition by date and cluster or sort by customer_id inside, or, on BigQuery, cluster by it."

## Q4. "Walk me through debugging a slow SQL step in a nightly pipeline."

**Model answer.** "First, is it slow because data grew, or did something change? I compare run times over the last
weeks. Then EXPLAIN ANALYZE on realistic data, never on a sample. I look for the operator with the most time or
rows; at every join I compare rows in and out — an output bigger than the side I meant to keep is fan-out, which
is a correctness bug as well; at every scan I compare what was read with what was needed — partitions, row
groups, bytes; and whether estimates are far from actuals. Spills show as disk in the sort or aggregate. I change
one thing — a filter rewrite, a sort order, removing a join — and measure the same way again, then write down the
before and after."

**Follow-up.** "The plan looks fine, but it is still slow." — "Then the time is outside the query: waiting for a
lock or a warehouse queue, the orchestrator, or moving the result. I check queue time and the end-to-end timing,
not just the query's own."`,
    mcqs: [
      mcq('Asked "How do you make a daily load idempotent?", which answer would an interviewer rate highest?', [
        ['Replace the given date\'s slice atomically, or MERGE on a key with dedup and a guard', true],
        ['Use INSERT with SELECT DISTINCT, so that a re-run never adds the same row twice', false],
        ['Turn off retries in the orchestrator, so the load can only run once each night', false],
        ['Load into a new table every night and let dashboards read the newest one by name', false],
      ], 'Idempotence comes from replacing a defined slice or merging on a key, and saying how you test it. DISTINCT works only within one run, disabling retries trades duplicates for gaps, and table-per-night shifts the problem to every reader.'),
      mcq('An interviewer asks why you deduplicate the source before a MERGE. Which reason is accurate?', [
        ['Two source rows for one key either fail the MERGE or leave an undefined winner', true],
        ['MERGE runs much faster with a sorted source, and dedup sorts the source rows', false],
        ['MERGE cannot read from a subquery, so the dedup must create a separate table', false],
        ['Deduplication removes NULL keys, which MERGE would otherwise reject with an error', false],
      ], 'PostgreSQL raises "cannot affect row a second time" and some engines silently pick one row, so dedup with a tie-breaker is about correctness. Speed is not the reason, USING accepts a subquery, and NULL keys are not removed by dedup — they need their own handling.'),
      mcq('Asked how to cut the cost of an Athena query on a large table, what should a strong answer start with?', [
        ['How much data it scans, and whether partitions and columns let it skip data', true],
        ['Moving the table to a larger Athena cluster so the scan finishes faster', false],
        ['Adding B-tree indexes on the filtered columns of the table stored in S3', false],
      ], 'Athena bills per data scanned, so the fix is reading less: partition pruning, sorting, Parquet and fewer columns. Paying for more compute does not reduce the data a query scans, and tables on S3 do not take B-tree indexes.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_SQL_ENGINEERING_CHECKPOINT',
    notes: `Ten questions across the topic: SQL as a pipeline, upserts and MERGE, partitioning and layout, and reading plans
to fix slow SQL. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('Raw order events arrive with status values like \' Placed \' and \'DELIVERED\'. Where should they be standardised?', [
        ['Once, in the staging model that reads the raw table', true],
        ['In the raw table itself, with an UPDATE after loading', false],
        ['In each mart, wherever the status is grouped or filtered', false],
        ['In the BI tool, as a calculated field on every chart', false],
      ], 'Staging cleans and types each source once so every later layer trusts it. Raw stays as received for replay, and repeating the fix in marts or charts drifts.'),
      mcq('A step builds fct_store_daily for a date passed in by the orchestrator. Which design lets a backfill re-run any date safely?', [
        ['Delete that date\'s rows and insert them again in one transaction', true],
        ['Append that date\'s rows, then deduplicate the table every weekend', false],
        ['Compute the date from CURRENT_DATE so each run sees its own day', false],
        ['Insert only if the table has no rows yet for any date at all', false],
      ], 'Replacing exactly the given slice atomically is idempotent and works for any date. Weekend dedup leaves wrong numbers for days, CURRENT_DATE breaks backfills, and an empty-table check stops every load after the first.'),
      mcq('Batch rows can arrive out of order. Which part of an upsert keeps an older update from overwriting newer state?', [
        ['WHERE EXCLUDED.updated_at > target.updated_at on the update', true],
        ['ORDER BY updated_at on the SELECT that feeds the INSERT', false],
        ['A primary key on the business key of the target table', false],
        ['ON CONFLICT DO NOTHING in place of the DO UPDATE clause', false],
      ], 'The guard compares the incoming row with what is stored. Sorting the batch does not help with rows that arrive on a later night, the key only detects the conflict, and DO NOTHING stops all updates, new ones included.'),
      mcq('A full daily snapshot of active stores is loaded with MERGE. Which clause removes stores that have closed and vanished from the snapshot?', [
        ['WHEN NOT MATCHED BY SOURCE THEN DELETE', true],
        ['WHEN NOT MATCHED BY TARGET THEN DELETE', false],
        ['WHEN MATCHED AND s.op = \'D\' THEN DELETE', false],
        ['ON CONFLICT (store_id) DO DELETE FROM', false],
      ], 'BY SOURCE means present in the target but missing from the source — exactly the vanished stores, and safe only because the snapshot is complete. BY TARGET rows exist only in the source and can only be inserted, a snapshot has no op flags, and ON CONFLICT has no delete action.'),
      mcq('The same MERGE is run twice with the same batch. What should the second run report?', [
        ['Zero rows affected', true],
        ['The same row count', false],
        ['Twice the row count', false],
        ['An error on each key', false],
      ], 'With dedup and an updated_at guard, nothing qualifies the second time — PostgreSQL returned no rows. The same count again would mean it rewrites rows every run, and duplicates or errors mean it is not idempotent.'),
      ck('DATA_WAREHOUSING', 'An analytics table of 20 million orders a year is about 430 MB of Parquet. Which partitioning keeps files a healthy size?', [
        ['By month, with rows sorted by order time inside', true],
        ['By day, so that one day is always a single file', false],
        ['By customer_id, since analysts look up customers', false],
        ['By hour, so that the latest data lands quickly', false],
      ], 'A month is about 37 MB here, while a day is about 1 MB; in the lesson the daily layout was three times slower for a year. Customer or hourly partitions create far smaller files still.'),
      ck('DATA_WAREHOUSING', 'A table is partitioned by order_date. Which WHERE clause lets the engine prune partitions for September?', [
        ['order_date >= \'2026-09-01\' AND order_date < \'2026-10-01\'', true],
        ['date_trunc(\'month\', order_date) = DATE \'2026-09-01\'', false],
        ['strftime(order_date, \'%Y-%m\') = \'2026-09\'', false],
        ['extract(month FROM order_date) = 9 AND extract(year FROM order_date) = 2026', false],
      ], 'A range on the bare partition column can be compared with partition bounds. PostgreSQL listed every partition for the date_trunc form; some engines can prune through a function, but you cannot rely on it.'),
      ck('DATA_WAREHOUSING', 'An EXPLAIN ANALYZE shows "Row Groups Scanned: 163 / 163" for a one-day filter on a year of data. What does it tell you?', [
        ['No row group\'s min/max range excluded that day', true],
        ['The query ran out of memory and reread the data', false],
        ['The day\'s rows were spread over 163 partitions', false],
        ['The engine has no statistics for the date column', false],
      ], 'Every row group\'s range included the day, typically because the data is not sorted by date, so statistics could not skip any. It is not a memory signal, row groups are not partitions, and statistics exist but cannot help unsorted data.'),
      ck('DATA_WAREHOUSING', 'A DuckDB plan shows the join output above the row count of the orders scan it was meant to keep. What is the right next step?', [
        ['Check the other side for repeated join keys', true],
        ['Raise memory so the hash join stops spilling', false],
        ['Run ANALYZE so the estimates become accurate', false],
        ['Swap the build and probe sides of the join', false],
      ], 'More rows out than in means one key matches several rows on the other side: fan-out, and inflated totals. Memory, statistics and build side affect speed, never the number of rows a join returns.'),
      ck('DATA_WAREHOUSING', 'A PostgreSQL sort in a nightly job reports "Sort Method: external merge  Disk: 12752kB". Which change is safest on a shared server?', [
        ['SET work_mem higher in that job\'s session only', true],
        ['Raise work_mem in postgresql.conf for everyone', false],
        ['Add an index on every column in the ORDER BY', false],
        ['Run VACUUM FULL on the table before each run', false],
      ], 'A session-level setting gives this job memory without multiplying it across every connection; reducing the input is the other good fix. A global raise can exhaust memory, indexes rarely replace large analytical sorts, and VACUUM FULL does not change sort memory.'),
    ],
  },
];
