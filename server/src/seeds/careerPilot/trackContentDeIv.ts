/**
 * Career-track placement content: Data Engineer Interview Questions (DE_IV), Data Engineer, batch DE4.
 *
 * Year-4 interview versions of what the track taught: data modelling (DE_DATA_MODELLING), ingestion and pipeline
 * design (DE_PYTHON_INGESTION, DE_SQL_ENGINEERING), Apache Spark (DE_SPARK), warehouses, lakehouses and table formats
 * (DE_WAREHOUSE_LAKEHOUSE, DE_CLOUD_DATA), and orchestration and streaming (DE_ORCHESTRATION, DE_STREAMING). Each set
 * gives the question, what the interviewer is testing, a model answer to say aloud, the follow-up a good answer earns
 * and the weak answer that loses the round. The topics' own INTERVIEW_QUESTION units already ask the grain, Type 2,
 * star versus one big table, API ingestion, idempotency, incremental extracts, Parquet, MERGE, lazy evaluation,
 * shuffles, skew, caching, Delta's log, medallion design, warehouse bills, logical dates, backfills, Kafka consumer
 * groups, exactly-once and watermarks; these sets ask the next questions a panel asks, and refer back instead.
 *
 * Context: data engineer, analytics engineer and ETL roles for freshers at product companies, GCCs, IT services and
 * start-ups in Bengaluru, Hyderabad, Pune and Chennai. What was run (Python 3.13, synthetic data): every SQL query in
 * DuckDB 2.0; PySpark 3.5.9 in local mode for plans, partition counts, join choices, UDF timings, windows and
 * dropDuplicates; deltalake 1.6 for time travel, restore, schema merge, compaction, vacuum dry runs and MERGE file
 * metrics; Kafka key placement with kafka-python's murmur2 (the Java client's hash). Not run: Airflow, a Kafka broker,
 * Redshift, BigQuery and Snowflake — those answers are written from the documentation.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions name it with
 * ck(); the CHECKPOINT unit spreads its ten over the five skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_IV_BUNDLES: PilotBundle[] = [
  /* ── IV_MODELLING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_IV_MODELLING',
    notes: `Almost every data engineer loop in India has a modelling slot: a whiteboard at a GCC in Hyderabad, a shared
document at a Bengaluru start-up, or a "design the tables for X" question in the middle of a SQL round at a services
company. The topic's own interview set ("Data Modelling") already drilled the grain, Type 2, star versus one big
table and designing an orders model. Once you have said "grain first", the panel goes one level down, and these are
the questions it asks next. The SQL below ran in DuckDB on small synthetic tables; the outputs are real.

## Q1. "Can I add up every number in a fact table?"

**Testing:** additive, semi-additive and non-additive measures, and whether you have been burnt by them.

**Model answer.** "No. An order amount is **additive**: it sums across every dimension. A wallet or account
**balance** is **semi-additive**: it sums across wallets on one day, never across days. Ratios and averages, such as
average delivery time or a discount percentage, are **non-additive**: store the parts, the total minutes and the count,
and divide at query time." A daily balance snapshot for two wallets, 1 to 3 October:

    snapshot_date  wallet  balance
    2026-10-01     W1       500.00     W2  1000.00
    2026-10-02     W1       300.00     W2  1000.00
    2026-10-03     W1       800.00     W2   200.00

    sum(balance) over the three days       -> 3800.0   (meaningless)
    sum(balance) on 2026-10-03             -> 1000.0   (total held on that day)
    W1: avg daily balance 533.33, closing balance 800.00
    W2: avg daily balance 733.33, closing balance 200.00

"For a month, finance wants either the closing balance, the last snapshot in the period (arg_max(balance,
snapshot_date) in DuckDB), or the average daily balance. I would document which one each report uses."

**Follow-up:** "Where would you store the average delivery time for a dashboard?" — "I would not store the average.
I store total delivery minutes and delivered orders at the fact's grain, and the BI layer divides. An average of
daily averages is wrong whenever days have different volumes."

**Weak answer:** "Everything numeric is a measure, so SUM works."

## Q2. "Transaction fact, periodic snapshot or accumulating snapshot — when do you use each?"

**Testing:** whether you know the three fact table types and can match them to a business question.

**Model answer.** "A **transaction fact** has one row per event, such as a payment or an order line, and is
insert-only. A **periodic snapshot** has one row per entity per period, such as the wallet balance at the end of each
day or the stock on hand per store per day, because you cannot rebuild state cheaply from millions of events every
time someone asks. An **accumulating snapshot** has one row per process instance that is **updated** as it moves
through milestones: an order with placed, accepted, picked-up and delivered timestamps, so the time between steps is a
column subtraction. In a warehouse I update it with MERGE; on a lake, a Delta or Iceberg MERGE, or I rebuild it from
the event table each run if it is small enough."

**Follow-up:** "Your accumulating snapshot has five date columns. Five date dimensions?" — "One dim_date playing
five roles: placed_date_key, delivered_date_key and so on all point at it, and I expose role-named views such as
delivered_date for BI tools that cannot alias. That is a **role-playing dimension**."

**Weak answer:** "One fact table with all the columns, and the dashboard filters it."

## Q3. "Why not use the source system's ID as the dimension's key?"

**Testing:** surrogate keys, and what happens to a fact that arrives before its dimension row.

**Model answer.** "The natural key stays in the dimension as an attribute, but facts join on a **surrogate key** for
three reasons: Type 2 needs one key per version, and the natural key repeats; two sources can use the same ID for
different things, or change ID formats after a migration; and a narrow integer key keeps the fact table small. It also
lets me have special rows: -1 for 'unknown' and -2 for 'not applicable'."

**Follow-up:** "An order arrives for restaurant R12, which is not in dim_restaurant yet. What does your load do?" —
"It must not drop the order. An inner join silently loses it:"

    inner join: rows 2, amount 750.0          (O3 for R12, 620.0, is gone)
    left join with coalesce(restaurant_sk, -1):
    O1  1  450.0
    O2  2  300.0
    O3 -1  620.0

"Either point it at the unknown row and re-key it when R12 arrives, or insert an **inferred member** for R12 with
just its natural key and fill its attributes on the next dimension load. The revenue total stays right either way,
and a count of facts on -1 is a quality check worth alerting on."

**Weak answer:** "Use an inner join so only valid restaurants get in."

## Q4. "What is a factless fact table? Give me a real one."

**Testing:** whether you can model events that have no number, and ask the 'what did not happen' question.

**Model answer.** "A fact table with keys and no measures, recording that something happened, or could have. An
ed-tech platform's attendance: one row per student, class and date attended. The useful partner is a **coverage**
table, enrolment, that says what could have happened. Then 'who was enrolled but absent' is an anti-join:"

    select e.class_id, e.student_id
    from fact_enrolment e
    left join fact_attendance a
      on a.student_id = e.student_id and a.class_id = e.class_id
     and a.class_date = date '2026-10-27'
    where a.student_id is null;

    class_id  student_id
    C1        S2
    C2        S1

"The measure is count(*). The attendance table alone can never tell you who was absent."

**Follow-up:** "Promotions that ran but sold nothing?" — "Same pattern: a coverage fact of which products were on
promotion in which store each day, anti-joined with sales."

## Q5. "An order can carry two promo codes. How do you report revenue by promo code?"

**Testing:** many-to-many relationships and the double counting they cause.

**Model answer.** "A **bridge table** between the order fact and dim_promo, one row per order and promo, with a
**weighting factor** that sums to 1 per order. Without weights, joining through the bridge repeats an order once per
code. Two orders, O1 for 900 with FEST50 and NEWUSER, O2 for 400 with FEST50:"

    true revenue                       1300.0
    sum(amount) after joining bridge   2200.0
    promo     unweighted   weighted
    FEST50        1300.0     850.00
    NEWUSER        900.0     450.00

"Weighted totals add back to 1300. Unweighted is still right for 'revenue of orders that used FEST50', so I name the
two columns differently and say which question each answers. The weights are a business rule (equal split, or by
discount value) and I get finance to agree it."

**Follow-up:** "Why not just put promo_code_1 and promo_code_2 columns on the fact?" — "It breaks the day someone
uses three, and 'revenue by promo' becomes a union of two columns."

## Q6. "A customer's loyalty tier changes every few days. Do you make it Type 2?"

**Testing:** rapidly changing attributes, and not applying Type 2 by reflex.

**Model answer.** "Not on dim_customer. With 20 million customers and a tier that changes weekly, Type 2 would add
millions of versions a month and every customer join gets slower. The options: move the fast-changing attributes
into a small **mini-dimension**, one row per combination of tier and spend band, with its key on the fact, so each
order records the band at the time; or record the tier on the fact itself if it is one column; or keep a periodic
snapshot of customer tiers per day if the business asks 'how many Gold customers did we have each week'. Slow
attributes such as city stay Type 2 on dim_customer."

**Follow-up:** "How do you decide Type 1 or Type 2 per column?" — "I ask the business whether a report for last year
should show the old value or the new one. A corrected spelling is Type 1; a city or a commission plan is Type 2."

## How you are judged

Strong answers name the pattern, show the query or the numbers that prove it, and say what they would check after
the load. Weak answers draw tables before saying what one row means, or sum whatever is numeric.`,
    workedExample: `**Question: "We are a UPI wallet. Users top up, pay merchants and get refunds. Finance wants month-end
balances per user and the money moved each day. Model it."**

**A weak answer (heard often):**

"One table, wallet_transactions, with user, type, amount and timestamp. Month-end balance is the sum of all
transactions up to that date."

What the panel hears: correct in theory, unusable in practice. Summing 18 months of events for 30 million wallets
every time finance opens a report is slow and costly, and one missing event makes every later balance wrong.

**A strong answer:**

"Two processes, two facts.

First, **fact_wallet_txn**, a transaction fact at the grain of one ledger entry: a top-up, a payment or a refund. Keys:
date, time of day, wallet, merchant (-2 'not applicable' for top-ups), payment instrument. Measure: signed amount, so a
debit is negative. It is insert-only; a refund is a new row, never an update, because the ledger must reconcile with
the bank's settlement file.

Second, **fact_wallet_balance_daily**, a periodic snapshot at the grain of one wallet per day: opening balance,
credits, debits and closing balance. The daily load computes today's closing balance as yesterday's closing plus
today's net movement, and checks it against the ledger's running total for a sample of wallets.

The balances are **semi-additive**. Summing closing balances across wallets for one date gives the float the company
holds, which finance needs for the escrow account. Summing across dates means nothing, so month-end balance is the
snapshot row on the last day of the month, and average balance is avg() over the month's rows. I would name the
columns closing_balance and say in the documentation that it must not be summed over time.

dim_wallet would be Type 2 on KYC level, because limits depend on it and an audit asks what the limit was on the day
of a payment. The user's app version is noise; Type 1 or not stored.

To check it: per-day reconciliation of total credits and debits against the bank settlement, and a test that today's
opening balance equals yesterday's closing balance for every wallet."

**Why it scores:** two grains stated, the right fact type for each question, the semi-additive trap named before the
interviewer asks, refunds as new rows, and the checks that make finance trust the numbers.`,
    mcqs: [
      mcq('A dashboard shows "total balance held" for a payments app by summing the daily balance snapshot over the last 30 days. What is wrong?', [
        ['Balances are semi-additive, so summing across days counts the same money again', true],
        ['Balances are non-additive, so they can only be averaged and never summed at all', false],
        ['The snapshot should have been a transaction fact, which can always be summed', false],
        ['Nothing, as long as the snapshot has exactly one row per wallet per day', false],
      ], 'A balance sums correctly across wallets on one date but not across dates: the same rupee is counted on every day it sits in the wallet. It is semi-additive rather than non-additive (summing on one date is valid), and converting it to events does not answer a balance question cheaply.'),
      mcq('An order fact table uses an inner join to dim_restaurant to look up the surrogate key. A new restaurant’s first orders arrive an hour before the restaurant row does. What happens?', [
        ['Those orders are silently dropped, so revenue is understated until a full reload', true],
        ['The load fails with a foreign key error, which stops the whole nightly pipeline at once', false],
        ['Those orders are loaded with a null key, so they show under a blank restaurant', false],
        ['The orders wait in the join until the restaurant row arrives and then load', false],
      ], 'An inner join simply has no match for them, so they vanish without an error. Warehouses rarely enforce foreign keys during loads, a null key would come from a left join, and a batch join does not wait. Map them to an unknown row (-1) or an inferred member instead.'),
      mcq('An order can use several promo codes. Joining fact_order to a promo bridge table, revenue by promo adds up to more than total revenue. What is the standard fix?', [
        ['A weighting factor on the bridge that sums to 1 for each order', true],
        ['A DISTINCT on the order amount before the revenue is summed up', false],
        ['Keeping only the first promo code an order used and dropping the rest', false],
        ['Moving the promo code onto dim_customer as a Type 2 attribute', false],
      ], 'Each order is repeated once per code; multiplying by a weight that sums to 1 per order makes the totals add back. DISTINCT on amounts merges different orders that happen to share a value, dropping codes loses data, and a promo is not a customer attribute.'),
    ],
    checkpoint: [
      ck('DATA_MODELLING', 'An ed-tech platform records one row per student per class attended. The academic team asks which enrolled students missed yesterday’s class. What do you need?', [
        ['An enrolment coverage table, anti-joined with the attendance rows', true],
        ['A measure column on attendance holding 1 for present and 0 for absent', false],
        ['A Type 2 student dimension that tracks every change of enrolled class', false],
        ['A count of attendance rows per class compared with yesterday’s count', false],
      ], 'Attendance is a factless fact; absence is the difference between what could happen (enrolment) and what did. A 0 row would need an absence event to create it, a Type 2 dimension records attribute history rather than events, and a count says how many, not who.'),
      ck('DATA_MODELLING', 'A food-delivery model has placed, accepted, picked-up and delivered timestamps for each order, and the business wants the time between each step. Which fact table type fits?', [
        ['An accumulating snapshot, one row per order updated at each milestone', true],
        ['A periodic snapshot, one row per order for each day it stays active', false],
        ['A transaction fact with one row per order and no later updates allowed', false],
        ['A factless fact recording that each milestone was reached for an order', false],
      ], 'An accumulating snapshot holds one row per process instance and fills in milestone dates as they happen, so durations are column differences. A daily periodic row per order wastes space, an insert-only row cannot record later milestones, and a factless fact has no durations.'),
      ck('DATA_MODELLING', 'A loyalty tier for 20 million customers changes every week. A teammate proposes making it a Type 2 column on dim_customer. What is the better design?', [
        ['A small mini-dimension for tier, keyed on the fact, with slow columns Type 2', true],
        ['Type 2 as proposed, with a nightly job that merges any versions older than a month', false],
        ['Type 1 on the tier, since history of a weekly attribute is never needed', false],
        ['A separate dimension table per tier, so each one stays small and fast', false],
      ], 'Rapidly changing attributes would multiply Type 2 versions of a huge dimension; a mini-dimension records the tier at the time of each fact cheaply. Merging versions destroys history, Type 1 discards a question the business does ask, and a table per tier breaks every query across tiers.'),
    ],
  },

  /* ── IV_PIPELINES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_IV_PIPELINES',
    notes: `The pipeline round is where a panel finds out whether you have run a pipeline or only written one. The topic sets
in "Python for Ingestion" and "SQL for Data Engineers" already covered an hourly API pull, what idempotent means, an
incremental extract from a replica, Parquet against CSV, a daily load that is safe to repeat and MERGE against ON
CONFLICT. The questions below are the ones that follow: they start where the happy path ends. The SQL ran in DuckDB
2.0 and the Spark check in PySpark 3.5 local mode; the outputs are real.

## Q1. "ETL or ELT? When would you still transform before loading?"

**Testing:** whether you can reason about where a transformation runs instead of reciting a definition.

**Model answer.** "Most teams now do ELT: land the raw data in the lake or warehouse, then transform it there with
SQL or dbt, because warehouse compute scales, the raw copy lets us rebuild any model, and analysts can read the SQL.
I still transform **before** loading in three cases. Personal data that must not land in clear text, such as phone
numbers or Aadhaar-like IDs, gets masked or tokenised in the ingestion step, because once it is in the raw zone it is
in backups and logs too. Formats the warehouse cannot parse well, such as fixed-width bank files or deeply nested
XML, are parsed in Python or Spark first. And very large, noisy sources, such as clickstream, are filtered or
compacted before a warehouse that bills by data stored or scanned has to hold them."

**Follow-up:** "So in your project, where does each T run?" — Answer for your own project, specifically: "Parsing
and masking in the Python ingestion job, deduplication and typing in the silver layer in Spark, business logic in dbt
models." A vague "everything is in dbt" invites the next question about the PII column.

**Weak answer:** "ETL is old, ELT is modern."

## Q2. "Your incremental load by updated_at has been missing rows. How can that happen?"

**Testing:** whether you know why a watermark that looks correct still loses data.

**Model answer.** "Four usual causes. A transaction that started before the extract but **committed after it**
carries an older updated_at than the watermark; the next run's > filter skips it. Rows written with the **same
timestamp** as the watermark, when the filter is strictly greater. A bulk update or a backfill on the source that
**did not touch updated_at**. And a **time zone or clock mismatch** between the app writing the column and the job
reading it." A reproduction of the first:

    run 1 at 10:00:06 reads A1 (10:00:01), A2 (10:00:05) -> watermark 10:00:05
    A3, stamped 09:59:58 by a long transaction, commits at 10:00:07
    run 2, updated_at > watermark                 -> ['A4']
    run 2, updated_at > watermark - 10 minutes    -> ['A1', 'A2', 'A3', 'A4']

"The fix is a **lookback window**, re-reading a few minutes before the watermark, with the load deduplicating on the
key so re-read rows do nothing, plus an upper bound of now minus a minute so in-flight rows are left for next time.
To catch what still slips through, a daily reconciliation of row counts per day between source and target."

**Follow-up:** "How big should the lookback be?" — "Longer than the longest transaction the source runs. I would
ask the application team, check the database's long-running transaction metrics, and pick a margin above it. If
nobody can bound it, that is an argument for CDC."

## Q3. "You are starting CDC on a 500 GB table that is already live. How do you avoid missing or doubling changes?"

**Testing:** the snapshot-to-stream handover, which is where CDC projects lose data.

**Model answer.** "The change log only has changes from the moment the replication slot exists, so the order is:
create the slot first, so the database keeps every change from that point; then take the initial snapshot; then
apply the stream from the slot's start. Debezium does this for you: snapshot rows arrive with op r, then the
stream continues from the recorded position. Done by hand, or after a connector restart that re-sends events,
changes can appear twice, so the apply must be **idempotent and ordered by log position**, not by timestamp. Within one batch I keep the
latest event per key by LSN, then MERGE with a guard:"

    merge into dim_customer t
    using (select * from cdc_batch
           qualify row_number() over (partition by customer_id order by lsn desc) = 1) s
    on t.customer_id = s.customer_id
    when matched and s.op = 'd' then delete
    when matched and s.lsn > t.lsn then update set city = s.city, lsn = s.lsn
    when not matched and s.op <> 'd' then insert values (s.customer_id, s.city, s.lsn);

"Batch: customer 2 updated twice (lsn 205, 207), customer 4 created then updated (206, 209), customer 3 deleted
(208). The result is 2 = Coimbatore at 207, 3 gone, 4 = Mangaluru at 209; applying the same batch again changed
nothing."

**Follow-up:** "The connector was down for a day. What do you check first?" — "The replication slot. While a slot is
not consumed, PostgreSQL keeps all WAL for it, so the database disk grows. If the slot was dropped to save the disk,
the gap is lost and I need a fresh snapshot."

## Q4. "The upstream team added a column and changed amount to a string. What happens to your pipeline?"

**Testing:** schema drift, and whether you know that the dangerous failures are silent.

**Model answer.** "It depends on the reader, and the worst case is that nothing fails. In DuckDB, two daily Parquet
files, the second with a new payment_mode column:"

    read_parquet([d1, d2])                        -> order_id, amount   (payment_mode silently dropped)
    read_parquet([d1, d2], union_by_name = true)  -> order_id, amount, payment_mode (NULL for d1)
    d1 has amount INTEGER, d3 has amount '450.00' -> union_by_name gives amount VARCHAR

"So I do three things. I land raw data as it comes, without trusting its schema. I validate at the boundary of
silver against an explicit, versioned schema: new columns are allowed and logged, removed or retyped columns fail the
load loudly and quarantine the file. And I push for a **data contract** with the producing team, so a breaking change
is a pull request that I review, not a surprise at 2 a.m."

**Follow-up:** "Which file formats handle evolution best?" — "Avro has explicit rules: a new field with a default can
be read from old data. Parquet stores the schema per file, so the reader reconciles. Table formats such as Delta and
Iceberg keep the table's schema in metadata and reject mismatched writes unless you ask for evolution."

## Q5. "An order event for 1 October reaches you on 5 October. Where does it go, and how are the daily numbers fixed?"

**Testing:** event time against load time in batch pipelines, and incremental recomputation.

**Model answer.** "The raw layer is partitioned by **ingestion date**, so the file lands in 5 October's folder and
nothing about the past is rewritten. Silver is partitioned by **event date**, so the row goes to 1 October. Gold
daily aggregates are then rebuilt for **every event date present in the batch**, not just today:"

    affected dates: 2026-10-01, 2026-10-05
    event_date  orders  gmv
    2026-10-01       3  850.0      (was 2 and 700.0)
    2026-10-04       1  300.0      (untouched)
    2026-10-05       1  700.0

"Delete those dates and insert them again in one transaction, or overwrite those partitions. A rebuild for 'today
only' would leave 1 October wrong for ever."

**Follow-up:** "Finance closed September's books. A September refund arrives in October." — "Then it belongs to a
policy, not a query: either restate September and tell finance, or book it in October as an adjustment row. I would
ask before choosing, and model it so both views are possible."

## Q6. "Why does Spark read our 10 GB .csv.gz file with a single task?"

**Testing:** splittable and non-splittable compression, which decides parallelism.

**Model answer.** "Gzip is a single stream: you cannot start decompressing in the middle, so one task must read the
whole file. Plain CSV can be split at byte offsets. With maxPartitionBytes set to 4 MB, the same 400,000 rows:"

    trips.csv     13.2 MB  -> 4 partitions
    trips.csv.gz   4.0 MB  -> 1 partition

"The fix is at the source or the first step: ask for many smaller gzip files, or a splittable format, and convert to
Parquet once in bronze. Parquet compresses each column chunk inside the file with snappy or zstd, so the file stays
splittable by row group whatever codec it uses."

**Follow-up:** "Then why not repartition right after reading?" — "That helps everything after the read, but the read
and decompression of 10 GB is still one task on one core, and the repartition adds a shuffle."

## How you are judged

Strong answers name the failure mode before the interviewer does, show how they would detect it, and make the fix
re-runnable. Weak answers describe the happy path again in more detail.`,
    workedExample: `**Question: "Our nightly settlement pipeline failed at 3 a.m. The bank's file arrived at 2:55, the load step
crashed with a parse error on row 412,880, and the morning reports show yesterday's numbers. Talk me through it."**

**A weak answer (heard often):**

"I would fix the parsing code so it skips bad rows and rerun the pipeline."

What the panel hears: skipping rows in a money file, without knowing why they were bad, and no thought for what the
crashed run already wrote.

**A strong answer:**

"First, what state are we in? The load crashed partway, so I check whether it wrote anything for yesterday's
partition. If the load replaces the partition in one transaction, nothing was committed and a rerun is safe; if it
appends in chunks, there may be partial rows and the rerun must replace the partition, not append.

Second, why row 412,880? A parse error near the end of a file that arrived five minutes before the run makes me
suspect the file was still being written when we read it. I compare the file's current size and row count with what
the job saw. If they differ, the cause is the trigger, not the parser: the job started on the file's arrival rather
than on the bank's completion marker or a stable size.

If the file is complete and the row is really malformed, I look at it. A comma inside an unquoted merchant name is a
format problem for the bank to fix; meanwhile I quarantine that row with its reason, load the rest, and tell finance
that one settlement is held back, with its amount, so the totals reconcile.

Then I rerun for that date only, through the orchestrator, and check counts and totals against the bank's control
record (most settlement files carry a trailer with the row count and sum).

Afterwards: wait for a _SUCCESS marker or a trailer check before parsing; make the load replace its partition in
one transaction; send malformed rows to a quarantine table and alert on any; and add a reconciliation check that
fails the run if our total differs from the trailer."

**Why it scores:** it establishes what was written before rerunning, finds the likely real cause (reading a
half-written file), never silently drops money rows, and reconciles against the source's own control totals.`,
    mcqs: [
      mcq('An incremental extract uses WHERE updated_at > :last_watermark, and the watermark is the maximum updated_at seen. Rows written by long transactions keep going missing. What is the most targeted fix?', [
        ['Re-read a lookback window before the watermark and deduplicate on the key', true],
        ['Change the filter to >= so that rows on the boundary timestamp are kept', false],
        ['Set the watermark to the job’s own start time instead of the data’s maximum value', false],
        ['Run the extract every minute so fewer transactions fall between runs', false],
      ], 'A late-committing transaction carries a timestamp older than the watermark, so only re-reading a window before it catches the row, and key-based deduplication makes the overlap harmless. >= fixes only equal timestamps, the job’s clock makes the gap worse, and running more often still skips those rows.'),
      mcq('Two daily Parquet files are read together in DuckDB with read_parquet([...]) and no options. The second file has an extra column, payment_mode. What happens?', [
        ['The query succeeds and payment_mode is silently left out of the result', true],
        ['The query fails with an error saying the two schemas do not match', false],
        ['payment_mode appears, with NULL for every row from the first file', false],
        ['DuckDB reads only the second file, because it has the wider schema', false],
      ], 'Without union_by_name, DuckDB took the first file’s schema and dropped the new column without an error, which is why drift checks belong in the pipeline. NULL-filling is what union_by_name = true does, and DuckDB does not pick one file over the other.'),
      mcq('A batch brings 2,000 new orders for today and 40 late orders for three earlier dates. The gold daily-revenue table is rebuilt only for today. What is the result?', [
        ['Today is right, and the three earlier dates stay short for ever', true],
        ['Every date is right, because silver already holds the late rows', false],
        ['Today is overstated, because the 40 late orders are counted in it', false],
        ['The rebuild fails, because the batch contains several event dates', false],
      ], 'Silver has the late rows under their own event dates, but gold for those dates is never recomputed, so it stays wrong. Gold must be rebuilt for every event date in the batch. The late orders are not counted in today, and several dates in a batch are normal.'),
    ],
    checkpoint: [
      ck('ETL_FUNDAMENTALS', 'A partner sends one 12 GB .csv.gz file each night, and the Spark job’s first stage runs as a single task for 40 minutes. What is the cause?', [
        ['Gzip cannot be split, so one task must decompress the whole file', true],
        ['spark.sql.shuffle.partitions is set far too low for a file of that size', false],
        ['CSV is always read by one task, whatever compression it uses', false],
        ['The executor has too little memory to hold the file in one go', false],
      ], 'A gzip stream must be decompressed from the start, so the read cannot be divided; plain CSV, or many smaller files, would give many tasks. Shuffle partitions apply after a shuffle, not to the read, uncompressed CSV is split by byte ranges, and memory does not change the task count.'),
      ck('ETL_FUNDAMENTALS', 'You are adding CDC to a large live table. In which order do you set it up so that no change is lost?', [
        ['Create the replication slot, take the snapshot, then apply the stream', true],
        ['Take the snapshot, create the replication slot, then apply the stream', false],
        ['Apply the stream first, then take the snapshot to fill in older rows', false],
        ['Take the snapshot twice and keep the rows that differ between the two', false],
      ], 'The slot must exist before the snapshot so every change from that moment is kept; any change seen twice is absorbed by an LSN-ordered, idempotent apply. Creating the slot after the snapshot loses the changes in between, and the other orders have no defined starting point.'),
      ck('ETL_FUNDAMENTALS', 'A compliance review finds customers’ phone numbers in clear text in the raw zone of an ELT platform. What is the right change?', [
        ['Mask or tokenise the phone numbers in the ingestion step, before landing', true],
        ['Mask the phone numbers in the dbt staging models that read the raw zone', false],
        ['Restrict the raw zone to engineers and leave the data in it as it is', false],
        ['Delete the raw zone after each run so the phone numbers never persist', false],
      ], 'Once clear-text personal data lands, it is in backups, logs and every copy; protecting it means transforming before load, which is the case where ETL still beats ELT. Masking later leaves raw exposed, access limits do not remove the data, and deleting raw loses the ability to rebuild.'),
    ],
  },

  /* ── IV_SPARK ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_IV_SPARK',
    notes: `Spark is the round most likely to have a laptop in it: the interviewer shares code or a query plan and asks you to
read it. The Apache Spark topic's interview set already asked what lazy evaluation is, what a shuffle is, how to
handle a skewed task and when to cache. These are the questions that come next, and they test whether you can predict
what Spark will do with a piece of code. Everything below ran in PySpark 3.5.9 in local mode on 2 million synthetic
ride-hailing trips; the plans and numbers are real, though times on a laptop are only a guide.

## Q1. "How many shuffles will this job do?"

**Testing:** whether you can see narrow and wide transformations in code, before running it.

    (trips.filter(F.col("status") == "COMPLETED")
          .withColumn("fare_after_gst", F.round(F.col("fare") * 1.05, 2))
          .groupBy("city_id").agg(F.sum("fare_after_gst").alias("gmv"))
          .join(cities, "city_id")
          .orderBy(F.desc("gmv")))

**Model answer.** "filter and withColumn are **narrow**: each output partition comes from one input partition, so
they run in the same stage as the scan. groupBy is **wide**: one shuffle, by city_id, with a partial aggregate before
it. The join with a 20-row cities table should be a broadcast, so no shuffle there. orderBy is a second shuffle, by
range of gmv." The executed plan agrees:

    Sort [gmv DESC]
    +- Exchange rangepartitioning(gmv DESC, 200)                    <- shuffle 2
       +- BroadcastHashJoin [city_id], [city_id], Inner, BuildRight
          :- HashAggregate(keys=[city_id], functions=[sum(...)])
          :  +- Exchange hashpartitioning(city_id, 200)              <- shuffle 1
          :     +- HashAggregate(... partial_sum ...)
          :        +- Project / Filter / FileScan parquet
          +- BroadcastExchange                                       <- not a shuffle

"Three Exchange nodes, two shuffles. The BroadcastExchange sends the small table to every executor whole."

**Follow-up:** "Does the final orderBy cost anything beyond the shuffle?" — "Range partitioning needs to know the
boundaries, so Spark samples the data first, which is an extra job. If the result only feeds a write, I drop the sort,
or sort within partitions."

**Weak answer:** "Spark decides at run time, so you cannot know."

## Q2. "When does Spark broadcast a join, and when can it not?"

**Testing:** the broadcast threshold, join sides, and the ways a broadcast fails.

**Model answer.** "It broadcasts automatically when it estimates one side below spark.sql.autoBroadcastJoinThreshold,
10 MB by default (10485760 bytes here); with AQE it can also switch to a broadcast at run time once it has measured a
shuffle's output. A broadcast() hint forces it. But the side you can broadcast depends on the join type: for a left
outer join only the right side can be the build side." Tested on the 20-row cities table and 2 million trips:

    trips LEFT JOIN broadcast(cities)    -> BroadcastHashJoin ... LeftOuter, BuildRight
    broadcast(cities) LEFT JOIN trips    -> SortMergeJoin ... LeftOuter   (hint ignored)
    cities LEFT JOIN broadcast(trips)    -> BroadcastHashJoin ... BuildRight (2 million rows broadcast)

"The second is the trap: the hint is silently ignored. The third is worse: the hint is obeyed and the big table is
collected to the driver and copied to every executor."

**Follow-up:** "A broadcast join failed with a timeout or a driver out-of-memory. Why?" — "The broadcast table is
built on the driver first, so a table that is small on disk but large in memory, or a stale size estimate, can blow
the driver's memory; spark.sql.broadcastTimeout, 300 seconds by default, can expire if the side being broadcast is
itself expensive to compute. I would drop the hint or the threshold for that join, or materialise the small side first."

## Q3. "Why did my job write 200 tiny files?"

**Testing:** where partition counts come from.

**Model answer.** "A file read makes partitions by size, up to spark.sql.files.maxPartitionBytes, 128 MB by default;
our 19.6 MB file read as 4 partitions on 4 cores. After a shuffle, the count is spark.sql.shuffle.partitions, 200 by
default, whatever the data size. A write produces at least one file per partition with data:"

    read partitions:                 4
    after groupBy, AQE off:        200
    after groupBy, AQE on:           1      (coalesced: the result was small)

"With adaptive query execution on, which is the default in Spark 3.2 and later, Spark coalesces small shuffle
partitions. If AQE was off, or the files are still small, I set shuffle partitions from the data (roughly 100 to 200
MB per partition), or repartition by the output's partition column before the write so each date gets a few
well-sized files. maxRecordsPerFile caps files from the other side."

**Follow-up:** "Why do small files matter if the job finished?" — "Every reader pays: one task, one open and one
metadata read per file. The next job, Athena and the Delta log all slow down, and object stores charge per request."

## Q4. "Why is a Python UDF slow, and what do you use instead?"

**Testing:** what crosses the JVM-Python boundary, and what Catalyst can no longer see.

**Model answer.** "Spark runs on the JVM. A row-at-a-time Python UDF ships every row to a Python worker process,
deserialises it, calls the function and ships the result back. And the optimiser cannot look inside it, so a filter on
a UDF cannot be pushed into the Parquet scan." On 2 million rows, banding fares as HIGH or LOW:

    built-in F.when(F.col("fare") >= 500, ...)   median 1.33 s
    Python @udf, same logic                      median 19.12 s
    plan node for the UDF: BatchEvalPython

"First choice is a built-in function: when, regexp_extract, date functions, higher-order functions for arrays.
Second is a **pandas UDF**, which moves data in Arrow batches and runs vectorised code. A plain Python UDF is the last
resort, for logic that exists only in a Python library."

**Follow-up:** "The UDF calls a pretrained model to score each row." — "Then a pandas UDF, or mapInPandas, that loads
the model once per batch or per executor, not per row."

## Q5. "An executor was killed: 'Container killed for exceeding memory limits'. What do you check?"

**Testing:** where Spark memory goes, and telling executor problems from driver problems.

**Model answer.** "That message comes from the cluster manager, YARN on EMR, when the container's total memory, heap
plus **overhead**, went over its limit. Overhead covers off-heap memory and Python workers, and defaults to 10% of
executor memory with a 384 MB minimum, which is often too little for PySpark with pandas UDFs. So I check: is it one
task, which points to skew or one huge partition, or every executor? Are partitions too large, say 2 GB each because
shuffle partitions is too low for the data? Is there a pandas UDF or a big broadcast? Fixes in that order: more and
smaller partitions, fixing skew, raising spark.executor.memoryOverhead, and only then bigger executors."

**Follow-up:** "And if the driver dies instead?" — "Something brought data to the driver: collect(), toPandas() on a
large result, or a big broadcast. spark.driver.maxResultSize, 1 GB by default, exists to stop that. The fix is to
write the result to storage instead of collecting it."

## Q6. "Deduplicate ride events, keeping the latest status per trip."

**Testing:** whether you know that dropDuplicates does not keep a chosen row.

**Model answer.** "dropDuplicates(['trip_id']) keeps an arbitrary row per key, whichever it meets first after the
shuffle. To keep the latest, rank with a window and filter." Five events, two trips:

    dropDuplicates(["trip_id"])            -> T1 REQUESTED, T2 CANCELLED
    row_number() over (partition by trip_id
                       order by ts desc) = 1 -> T1 COMPLETED, T2 CANCELLED

"T1 came out as REQUESTED, which is wrong and would differ between runs. I add a tie-breaker to the ordering, such
as an event sequence number, so two events with the same timestamp still give one deterministic answer."

**Follow-up:** "Is the window version more expensive?" — "Both shuffle by trip_id. The window also sorts within each
partition. For a latest-row query that is the price of a correct answer; max_by(status, ts) in a groupBy aggregate
(F.max_by in PySpark 3.3 and later) avoids the sort."

## How you are judged

Strong answers predict the plan, then check it with explain(). Weak answers list configuration names without saying
which number they would look at first.`,
    workedExample: `**Question: the interviewer shares this job and its plan. "It runs for 50 minutes on the full data. What would
you change?"**

    @F.udf(T.BooleanType())
    def is_completed(s):
        return s == "COMPLETED"

    (trips.filter(is_completed("status"))
          .join(cities, "city_id")
          .groupBy("city").agg(F.sum("fare").alias("gmv")))

Plan (trimmed; produced with autoBroadcastJoinThreshold set to -1, as it was in the team's config, and AQE off):

    HashAggregate(keys=[city], functions=[sum(fare)])
    +- Exchange hashpartitioning(city, 200)
       +- SortMergeJoin [city_id], [city_id], Inner
          :- Sort +- Exchange hashpartitioning(city_id, 200)
          :     +- Filter pythonUDF0
          :        +- BatchEvalPython [is_completed(status)]
          :           +- FileScan parquet ... PushedFilters: [IsNotNull(city_id)]
          +- Sort +- Exchange hashpartitioning(city_id, 200)
                +- FileScan parquet [city_id, city]

**A weak answer:** "Add more executors and cache trips."

**A strong answer:**

"Three things in the plan.

One: the filter is a Python UDF, so it shows as BatchEvalPython, every row goes out to Python and back, and
PushedFilters has only IsNotNull(city_id): the status filter is not pushed into the scan. It is a plain equality, so
F.col('status') == 'COMPLETED' does the same thing natively and lets Parquet skip row groups.

Two: the join with a 20-row cities table is a SortMergeJoin, which shuffles and sorts all of trips by city_id. That
is because broadcasting is disabled in the config. I would broadcast cities explicitly, which removes two Exchanges and
two Sorts, and ask why the threshold was set to -1; probably someone hit a driver memory error once.

Three: what is left is one shuffle for the groupBy, with a partial aggregate before it, which is unavoidable.

After the change the plan is FileScan with the pushed filter, BroadcastHashJoin, partial aggregate, one Exchange,
final aggregate. On the lab's 2 million rows both versions give the same 20 city totals. I would compare the stage
times and shuffle bytes in the Spark UI before and after on the real data, not trust the plan alone."

**Why it scores:** it reads specific plan nodes (BatchEvalPython, PushedFilters, SortMergeJoin) as evidence, fixes
causes in order of size, asks why the config was set, and proposes to measure the change.`,
    mcqs: [
      mcq('A job reads trips, filters, adds a column, groups by city_id, joins a 20-row cities table and sorts by revenue. With broadcast joins enabled, how many shuffle Exchanges appear in the plan?', [
        ['Two: one for the groupBy and one for the final sort', true],
        ['One: only the groupBy moves rows between executors', false],
        ['Three: the groupBy, the join and the final sort each shuffle', false],
        ['Four: the filter and the new column each add another one', false],
      ], 'groupBy needs a hash shuffle and orderBy a range shuffle; the small table is broadcast, which is a BroadcastExchange rather than a shuffle. The sort is not free, a broadcast join does not shuffle the big side, and filter and withColumn are narrow.'),
      mcq('A developer writes broadcast(small_dim).join(big_fact, "key", "left") to speed up a left join. What does Spark do?', [
        ['Ignores the hint and uses a sort-merge join, since the left side cannot be built', true],
        ['Broadcasts small_dim as asked, since hints always override the join type', false],
        ['Raises an AnalysisException saying the hint is not valid for this join type', false],
        ['Swaps the sides and turns the left join into a right join to use the hint', false],
      ], 'In a left outer join every left row must appear, so Spark can only build the hash table on the right; the hint on the left side is silently ignored and the plan shows SortMergeJoin. It does not error, and it never changes the join’s meaning to honour a hint.'),
      mcq('dropDuplicates(["trip_id"]) on ride events returns REQUESTED for a trip that was later COMPLETED. Why?', [
        ['It keeps whichever row it meets first per key, not the latest one', true],
        ['It keeps the alphabetically first value of each remaining column', false],
        ['It keeps the earliest timestamp, because events are sorted by time', false],
        ['It drops the newest events first to save memory during the shuffle', false],
      ], 'dropDuplicates gives no guarantee about which row survives; the result can change between runs. To keep the latest, rank with row_number over a window ordered by time descending, or use max_by. It does not sort by any column, by time or alphabetically.'),
    ],
    checkpoint: [
      ck('BATCH_STREAM_PROCESSING', 'With adaptive query execution turned off, a daily job groups 30 MB of data and writes it out as 200 small Parquet files. Where does the number 200 come from?', [
        ['spark.sql.shuffle.partitions, which sets the partitions after a shuffle', true],
        ['spark.sql.files.maxPartitionBytes, which splits the input into 200 parts', false],
        ['The executor count, since Spark writes one file for each executor core', false],
        ['The Parquet row group size, which caps each file at 200 thousand rows', false],
      ], 'After a shuffle Spark uses spark.sql.shuffle.partitions, 200 by default, regardless of data size; AQE would coalesce them. maxPartitionBytes governs file reads, files per write follow partitions rather than cores, and row groups live inside a file.'),
      ck('BATCH_STREAM_PROCESSING', 'A PySpark job filters with a Python UDF that only checks status == "COMPLETED". The plan shows BatchEvalPython and no status filter in PushedFilters. What is the best change?', [
        ['Replace it with F.col("status") == "COMPLETED", which Spark can push down', true],
        ['Turn it into a pandas UDF so the rows travel to Python in Arrow batches', false],
        ['Cache the DataFrame before the filter so the UDF reads it from memory', false],
        ['Raise spark.executor.memoryOverhead so that the Python workers can run faster', false],
      ], 'A built-in expression runs in the JVM and lets the Parquet scan skip data, so it removes both costs. A pandas UDF is faster than a row UDF but still opaque to the optimiser, caching adds work, and overhead memory prevents kills rather than speeding work up.'),
      ck('BATCH_STREAM_PROCESSING', 'On EMR, one executor is repeatedly killed with “Container killed by YARN for exceeding memory limits” while the other executors are fine. What do you check first?', [
        ['Whether one task gets a skewed or oversized partition, in the stage’s task metrics', true],
        ['Whether spark.driver.maxResultSize is too low for the size of the job’s result', false],
        ['Whether the cluster has too few executors for the number of input files', false],
        ['Whether the job caches too many DataFrames for the driver to keep track of', false],
      ], 'One executor failing while the others are fine points to one heavy task: skew or a huge partition. Comparing max and median task input and shuffle read confirms it. maxResultSize concerns the driver, executor count does not concentrate memory in one task, and caching is held by executors, not tracked by the driver.'),
    ],
  },

  /* ── IV_WAREHOUSE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_IV_WAREHOUSE',
    notes: `Warehouse and lakehouse questions are where a panel checks that you understand storage, not just SQL. The
"Warehouses and Lakehouses" interview set already asked warehouse versus lake versus lakehouse, how Delta gets ACID on
S3, a medallion design for UPI data and a doubled Snowflake bill, and the cloud topic asked about a slow Athena table
and an Athena bill. These are the next questions. The Parquet and Delta outputs below are real, from pyarrow and
deltalake 1.6 on synthetic UPI data; Redshift, BigQuery and Snowflake behaviour is from their documentation.

## Q1. "Why is a columnar warehouse fast for SUM(amount) and slow at updating one row?"

**Testing:** whether you understand what columnar storage changes, in both directions.

**Model answer.** "Columnar storage keeps each column's values together, compressed, in large immutable blocks:
Parquet column chunks, Snowflake micro-partitions, Redshift blocks. A query that touches two columns reads only those
two, and min/max statistics per block let it skip blocks." One million synthetic UPI transactions in Parquet:

    column      compressed  share
    txn_id         5.09 MB  17.7%
    txn_date       0.63 MB   2.2%
    payer_vpa      7.24 MB  25.2%
    amount         5.53 MB  19.3%
    status         0.15 MB   0.5%
    note          10.05 MB  35.0%
    total         28.68 MB

"Sum of amount by status reads about 5.7 MB of 28.7, a fifth. Status, with three values, compresses to almost
nothing. The other direction: updating one row means rewriting the whole block or file that holds it, because the
blocks are immutable. That is why warehouses want batched loads and MERGEs, not row-by-row updates from an app."

**Follow-up:** "So should an app write to the warehouse directly?" — "No. The app writes to its OLTP database, and
changes reach the warehouse in batches or micro-batches. Thousands of single-row inserts make thousands of tiny
blocks or files, which are slow to read and, in Snowflake or BigQuery, expensive to write."

## Q2. "How do Redshift distribution styles and sort keys work, and how would you choose them?"

**Testing:** whether you can place data across nodes for the joins you run.

**Model answer.** "A Redshift cluster spreads each table's rows over node slices. **KEY** distributes by a column's
hash, so two tables distributed on the same join key join locally without moving rows. **ALL** copies a small table to
every node, useful for small dimensions. **EVEN** spreads rows round-robin when there is no good key. **AUTO**, the
default, lets Redshift choose and change it as the table grows. For a fact joined most often to a large customer
dimension, I would distribute both on customer_key; small dimensions ALL or AUTO. A **sort key**, usually the date,
orders rows on disk so zone maps let range filters skip blocks."

**Follow-up:** "And on Snowflake or BigQuery?" — "There are no distribution styles to set. Snowflake organises data
into micro-partitions automatically and lets you add a **clustering key** on very large tables; BigQuery has
**partitioning** by a date, timestamp or integer column and **clustering** on up to four columns. In all three the idea
is the same as a sort key: put rows that are queried together in the same blocks."

**Weak answer:** "Use DISTKEY on the primary key of every table."

## Q3. "Yesterday someone overwrote a Delta table with one day's data. How do you get the table back?"

**Testing:** time travel and restore in a table format, and what limits them.

**Model answer.** "Every commit is a version in the transaction log, and old files stay until VACUUM removes them. I
look at the history, check the last good version, and restore it." On a small silver_payments table:

    version  operation  mode
    2        WRITE      Overwrite      <- the bad write, 1 row left
    1        MERGE                     <- the last good state
    0        WRITE      ErrorIfExists

    DeltaTable(path, version=1)  -> T1 SUCCESS 100.0, T2 SUCCESS 250.0, T3 SUCCESS 80.0
    dt.restore(1)                -> new version 3, 3 rows
                                    {'numRemovedFile': 1, 'numRestoredFile': 1}

"Restore is itself a new commit, so the bad version stays in history for the post-mortem. In Spark SQL the same is
RESTORE TABLE silver_payments TO VERSION AS OF 1. Then I check what read the table in between: anything built from
the bad version must be rebuilt."

**Follow-up:** "What if the bad write was two weeks ago?" — "Then it depends on VACUUM. The default retention is seven
days; files older than that may have been deleted, and the old versions are in the log but unreadable. Time travel is
a safety net within the retention window, not a backup. To prevent it: overwrite writes only through a pipeline that
passes a partition predicate, and table permissions that do not let people write by hand."

## Q4. "Delta Lake, Iceberg and Hudi — how do they differ?"

**Testing:** whether you know the formats beyond their names, and can say why a team picks one.

**Model answer.** "All three keep a metadata layer beside Parquet files that says which files make up each version,
which gives ACID commits, time travel and schema evolution on object storage. **Delta Lake** keeps an ordered log of
JSON commits with periodic checkpoints, and is at home on Databricks and Spark. **Iceberg** keeps a tree of metadata
files, manifest lists and manifests, tracks columns by ID so renames are safe, and has **hidden partitioning**: you
partition by days(ts) and queries that filter on ts prune without knowing the partition column. Many engines support
it: Spark, Trino, Flink, Snowflake, Athena. **Hudi** started for record-level upserts and incremental pulls, common in
CDC-heavy platforms. The choice is usually made by the platform: Databricks favours Delta; AWS and multi-engine
shops often choose Iceberg."

**Follow-up:** "Copy-on-write or merge-on-read?" — "Copy-on-write rewrites every file that holds a changed row: slow
writes, fast reads. Merge-on-read writes the changes separately, as Delta deletion vectors, Iceberg delete files or
Hudi log files, and readers combine them: fast writes, slower reads until compaction. Frequent small updates favour
merge-on-read; read-heavy gold tables favour copy-on-write."

## Q5. "A new column appears in the source. What does your Delta table do?"

**Testing:** schema enforcement versus schema evolution.

**Model answer.** "By default Delta **enforces** the schema: a write with an extra column fails rather than silently
changing the table. With deltalake in Python:"

    append with a new 'channel' column
    -> SchemaMismatchError: Cannot cast schema, number of fields does not match: 4 vs 3
    append with schema_mode="merge"
    -> succeeds; T1, T2, T3 get channel = NULL, T10 has channel = QR

"In Spark it is the mergeSchema option on the write, or autoMerge for MERGE. I allow merging for additive changes in
bronze, where I want to keep everything, and keep enforcement on silver and gold, where a new column should be a
reviewed change."

**Follow-up:** "And renaming a column?" — "Parquet files identify columns by name, so a rename would orphan the old
data. Delta needs column mapping enabled, a table protocol upgrade, before RENAME COLUMN works; Iceberg tracks
columns by ID so it can rename directly. Changing a type usually means rewriting the table."

## Q6. "200 people open the same dashboard at 9 a.m. View, table or materialised view underneath it?"

**Testing:** cost and freshness trade-offs in a warehouse.

**Model answer.** "A plain **view** re-runs its query for every dashboard load: 200 times the scan, every morning. A
**table** built by the pipeline, say a dbt model materialised as a table or incremental, is computed once after the
load and is cheap to read; its freshness is the pipeline's schedule. A **materialised view** is maintained by the
warehouse itself, refreshed automatically or on demand, and the optimiser can even rewrite queries to use it. I use one
when the base table changes often and the dashboard needs fresher data than the batch schedule, and the query fits the
warehouse's restrictions, which are real: Snowflake's materialised views cannot contain joins, for example. Most
gold tables I would build as tables in dbt, because the logic and tests stay in one place. And for repeated identical
queries, the warehouse's result cache already helps."

**Follow-up:** "How would you prove the change saved money?" — "Query history: total bytes scanned or credits used by
the dashboard's queries for a week before and after, from INFORMATION_SCHEMA.JOBS in BigQuery or QUERY_HISTORY in
Snowflake."

## How you are judged

Strong answers explain the storage mechanism, then the trade-off, then how they would measure it. Weak answers
name a feature ("we would use Z-order") without saying what it skips or what it costs.`,
    workedExample: `**Question: "Our nightly MERGE into the silver orders Delta table, partitioned by order_date, takes longer
every week, though each night's batch is about the same size. Why, and what would you change?"**

**A weak answer (heard often):**

"The table is growing, so we need a bigger cluster. Maybe run OPTIMIZE."

What the panel hears: no idea what MERGE actually reads.

**A strong answer:**

"A MERGE first finds the target files that might contain a matching key, then rewrites the files that do. If the ON
condition is only order_id = s.order_id, the engine cannot rule out any partition, so it scans every file in the
table to find matches. As the table grows, the scan grows, even though the batch does not.

I tried this on a small copy: 30 daily partitions, one file each, and a batch of 150 updates for the last two days.

    ON t.order_id = s.order_id
      files scanned 30, skipped 0, files rewritten 2, rows updated 150
    ON t.order_id = s.order_id AND t.order_date IN ('2026-10-26', '2026-10-27')
      files scanned 2, skipped 28, files rewritten 2, rows updated 150

Same result, a fifteenth of the files read. On a year of data the difference is 365 partitions against two.

So the fix: build the list of dates present in the batch and add them to the merge condition, as a literal IN list, so
partition pruning works. That is safe only if the batch's dates are complete, which they are because order_date never
changes for an order.

Second, small files. Each nightly MERGE rewrites the touched files, and late updates touch older days, so partitions
fill with small rewritten files. I would run compaction on recently touched partitions after the load, and VACUUM
weekly with the seven-day retention.

Third, check whether the source batch has duplicate keys. A MERGE with two source rows for one target row fails or,
on some engines, does double work.

I would compare files scanned and run time before and after in the MERGE's metrics, not assume."

**Why it scores:** it explains what a MERGE scans, shows the number that proves it (files scanned 30 against 2),
adds the predicate only where it is safe, and puts maintenance on a schedule.`,
    mcqs: [
      mcq('In a 1-million-row Parquet file of UPI transactions, the amount and status columns together are about a fifth of the bytes. Why does SUM(amount) GROUP BY status read about a fifth of the file?', [
        ['Parquet stores each column separately, so only those two chunks are read', true],
        ['Parquet keeps a precomputed total for each column in the file’s footer', false],
        ['Status has three values, so only a third of the rows need to be read', false],
        ['Compression makes every column the same size, so any two are a fifth', false],
      ], 'Column projection reads only the referenced column chunks, here amount and status. Footers hold min, max and counts, not totals; the number of distinct values changes how well a column compresses, not which rows are read; and column sizes vary widely.'),
      mcq('A Redshift fact table and a large customer dimension are joined on customer_key in most queries. Which distribution design avoids moving rows at query time?', [
        ['DISTSTYLE KEY on customer_key for both tables', true],
        ['DISTSTYLE ALL for the fact table and EVEN for customers', false],
        ['DISTSTYLE EVEN for both, so every slice has equal rows', false],
        ['A sort key on customer_key, with distribution left EVEN', false],
      ], 'Distributing both tables on the join key puts matching rows on the same slice, so the join is local. ALL on a large fact copies it to every node, EVEN forces redistribution at join time, and a sort key orders rows within a slice but does not co-locate them.'),
      mcq('A Delta table was overwritten by mistake at version 7. What does RESTORE TABLE ... TO VERSION AS OF 6 do?', [
        ['Writes a new version that points back at version 6’s files', true],
        ['Deletes versions 7 onwards from the transaction log entirely', false],
        ['Copies version 6’s rows into a new table beside the old one', false],
        ['Rolls the table back and runs VACUUM on the newer files', false],
      ], 'Restore is a new commit (version 8 here) whose file list matches version 6, so history, including the bad write, remains for review. It does not edit or truncate the log, does not create a second table, and does not vacuum anything.'),
    ],
    checkpoint: [
      ck('DATA_WAREHOUSING', 'After 200 small appends, dt.optimize.compact() reports 200 files removed and 1 added, yet the table’s folder still holds 201 Parquet files. Why is that?', [
        ['Compaction only marks old files removed in the log; VACUUM deletes them', true],
        ['Compaction failed partway, so the old files were never actually replaced', false],
        ['The new file is a copy, and the 200 originals stay as a permanent backup', false],
        ['Delta keeps every file for ever unless the table itself is dropped', false],
      ], 'OPTIMIZE commits a new version listing the compacted file; the old files remain because earlier versions still reference them, until VACUUM removes those older than the retention period. The metrics show a successful commit, the originals are not permanent, and VACUUM does delete them.'),
      ck('DATA_WAREHOUSING', 'A team wants to rename a column in a large Delta table without rewriting it. What is needed?', [
        ['Column mapping enabled on the table, which upgrades its protocol', true],
        ['Only an ALTER TABLE RENAME COLUMN, which Delta always supports', false],
        ['A schema_mode="merge" write whose data carries the new column name instead', false],
        ['A VACUUM, so that old files with the old name are removed first', false],
      ], 'Parquet identifies columns by name, so Delta needs column mapping to rename without rewriting files. Without it RENAME COLUMN is refused, a merge write would add a second column rather than rename, and VACUUM deletes unreferenced files and would destroy history.'),
      ck('DATA_WAREHOUSING', 'A MERGE into a date-partitioned Delta table matches only on order_id, and its metrics show 30 files scanned and 28 of them without a match. What change cuts the scan?', [
        ['Add the batch’s order dates to the ON condition so partitions are pruned', true],
        ['Run OPTIMIZE before every MERGE so each partition has one larger file', false],
        ['Partition the table by order_id so each MERGE touches only its keys', false],
        ['Cache the target table in memory before the MERGE runs each night', false],
      ], 'Without a partition predicate the engine must look in every file for matching keys; adding the dates in the batch lets it skip the other partitions (2 scanned instead of 30 in the lab). Compaction reduces files, not partitions; partitioning by order_id creates millions of tiny partitions; and caching does not avoid the scan.'),
    ],
  },

  /* ── IV_ORCH_STREAM ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_IV_ORCH_STREAM',
    notes: `Orchestration and streaming come up together because both are about running pipelines without a person
watching. The topic sets already asked about a failed 3 a.m. DAG, the logical date, a year's backfill and choosing an
orchestrator, and about consumer groups, exactly-once, watermarks and a five-minute lake pipeline. These are the
questions that follow. Airflow could not be run on the lab machine (Windows) and no Kafka broker ran; the Airflow
answers follow the Airflow 2.x and 3.x documentation, Kafka key placement used kafka-python's murmur2 (the Java
client's default hash), and the windows were computed by PySpark 3.5.9 for real.

## Q1. "What are Airflow's components, and where does my DAG file's code actually run?"

**Testing:** whether you know the moving parts well enough to debug them.

**Model answer.** "The **scheduler** decides which task instances are due and hands them to the **executor**; the
executor runs them on **workers**: local processes, Celery workers or Kubernetes pods. A **DAG processor** parses the
DAG files (part of the scheduler by default in Airflow 2, a separate component in Airflow 3). The **metadata
database** holds DAG runs, task states and XComs. The **webserver**, the API server in Airflow 3, serves the UI, and the
**triggerer** runs deferred tasks. My DAG file runs in two places: its top-level code runs every time the file is
parsed, every 30 seconds or so; the code inside tasks runs on a worker when the task runs."

**Follow-up:** "So what must never be at the top level of a DAG file?" — "Anything slow or with side effects: a
database query, an API call, reading a large config from S3. It runs on every parse, slows the scheduler, and an
error there makes the whole DAG disappear from the UI as an import error. Put it inside a task."

**Weak answer:** "Airflow runs the Python file at the scheduled time."

## Q2. "Team A's DAG must run only after Team B's DAG has loaded the orders table. How do you connect them?"

**Testing:** cross-DAG dependencies and the trade-offs of each.

**Model answer.** "Three options. An **ExternalTaskSensor** in A waits for a task in B with the matching logical
date. It works, but both DAGs must agree on schedules, or I map dates with execution_delta. A
**TriggerDagRunOperator** at the end of B starts A, which couples B to its consumers. Best in current Airflow is
**data-aware scheduling**: B's load task declares an outlet, a Dataset in Airflow 2.4+ or an Asset in Airflow 3, and A
is scheduled on that dataset. A runs when the data is updated, and neither team needs to know the other's
schedule. For a dbt-centred platform, Dagster's assets work the same way."

**Follow-up:** "What does dataset scheduling not tell you?" — "Whether the update was complete or correct, or which
day's data it was. The event says 'the task that writes orders succeeded'. A should still check the partition it needs
exists and passes its quality checks."

## Q3. "Tasks sit in 'queued' or 'scheduled' for an hour while workers look idle. Why?"

**Testing:** concurrency limits in Airflow.

**Model answer.** "Something caps concurrency before the worker. In order: **parallelism**, the limit on running task
instances across the whole installation (32 by default); **max_active_tasks** and **max_active_runs** per DAG;
**pools**: every task takes a slot from a pool, default_pool has 128 slots by default, and a pool sized for an API's
rate limit queues everything else in it; and with Celery, the worker concurrency. A common cause is sensors in poke
mode holding slots while they wait, so the tasks that would produce the data cannot start."

**Follow-up:** "How do you fix the sensor case?" — "Make the sensors deferrable, so the wait runs in the triggerer and
holds no slot, or use reschedule mode, which frees the slot between checks. Give sensors their own small pool, and set
a timeout on every sensor so a missing file fails the run instead of waiting for ever."

## Q4. "How does Kafka guarantee ordering, and what breaks it?"

**Testing:** keys, partitions and the limits of ordering.

**Model answer.** "Kafka orders messages **within a partition** only. The producer picks the partition from the key's
hash, so all events with one key, say one order_id, land in one partition and are read in order. There is no order
across partitions. Three things break it: sending without a key, so events for one order spread over partitions;
producer retries with several requests in flight and idempotence off; and **adding partitions**, which changes where
existing keys go." Hashing 10,000 restaurant keys with murmur2:

    keys that change partition going 6 -> 8: 7512 of 10000 (75.1%)
    rest_42: partition 4 of 6, partition 2 of 8

"After the change, new events for rest_42 go to a different partition than its old ones, so a consumer can read them
out of order. I would size partitions for expected peak consumers up front, and if I must add them, do it at a quiet
time, or move to a new topic and switch consumers over."

**Follow-up:** "We need a global order of all events." — "Then one partition, which means one consumer and a hard
throughput ceiling. Usually the business needs order per entity, not global order, and I would confirm that first."

## Q5. "Consumer lag on one partition keeps growing while the others are near zero. What is going on?"

**Testing:** reading lag as a symptom, per partition.

**Model answer.** "Lag is the latest offset minus the group's committed offset, per partition. All partitions
lagging means the consumers are too slow overall. One partition lagging means something about that partition: a **hot
key**, such as one big restaurant chain sending a large share of events to one partition; or a **poison message** the
consumer fails on and retries for ever, so its offset never moves; or the consumer that owns it is stuck, for example in
a long GC pause or a slow external call. I look at the offset: if it is not moving at all, it is a poison message or a
stuck consumer; if it moves slowly, it is volume."

**Follow-up:** "What happens if the lag becomes longer than the topic's retention?" — "The broker deletes the old
segments, retention is seven days by default, before we read them. When the consumer asks for an offset that no
longer exists, auto.offset.reset decides: 'latest' skips to the end and loses the data silently, 'earliest' starts at
the oldest offset still kept. That is data loss either way, so I alert on lag in time, not only in messages, and send
poison messages to a dead-letter topic instead of retrying them for ever."

## Q6. "Tumbling, sliding and session windows: what is the difference, and which would you use?"

**Testing:** whether you can choose a window from the business question.

**Model answer.** "A **tumbling** window is fixed and non-overlapping: orders per 5 minutes. A **sliding** (hopping)
window is fixed but overlapping: a 5-minute window every minute, for a smoother 'last five minutes' number. A
**session** window is defined by a gap of inactivity, so its length varies: a user's browsing session." Six order
events for one restaurant, at 19:01:10, 19:03:40, 19:04:59, 19:06:00, 19:21:00 and 19:23:30, in PySpark:

    tumbling 5 min:             19:00-19:05  3 | 19:05-19:10  1 | 19:20-19:25  2
    sliding 5 min every 1 min:  19:00-19:05  3 | 19:01-19:06  3 | 19:02-19:07  3 |
                                19:03-19:08  3 | 19:04-19:09  2 | ... 17 windows in all
    session, 10-minute gap:     19:01:10-19:16:00  4 | 19:21:00-19:33:30  2

"Each event falls in five sliding windows, so they cost five times the state of tumbling windows. A session closes
10 minutes after its last event, which is why the first session ends at 19:16:00."

**Follow-up:** "You change the streaming query's aggregation and restart it from the same checkpoint. What happens?"
— "The checkpoint holds offsets and the state of the old aggregation. Spark's documentation lists changes to
stateful operations as not allowed between restarts; the query fails or the state is wrong. A change like that
needs a new checkpoint and a plan for the gap: reprocess from a known offset, or backfill from the lake."

## How you are judged

Strong answers say which component or number they would look at and what each value would mean. Weak answers stay at
the level of definitions.`,
    workedExample: `**Question: "Our live dashboard of orders per 5 minutes, from Spark Structured Streaming, always shows about 3%
fewer orders than the next morning's batch report for the same windows. Which is right, and what would you do?"**

**A weak answer (heard often):**

"The streaming job is losing data. I would switch the dashboard to the batch numbers."

What the panel hears: a guess, and a fix that removes the reason the dashboard exists.

**A strong answer:**

"Probably both are right about different things. I would test three explanations, most likely first.

**Late events beyond the watermark.** Rider phones lose signal and send events minutes later. If the watermark is,
say, 5 minutes, events later than that are dropped from their window, while the batch job, which runs on all the data
the next morning, counts them. I would count events whose arrival time minus event time is more than the watermark,
per window, in the lake's raw copy. If that is about 3%, this is the cause.

**Event time versus processing time.** If the streaming job windows on arrival time and the batch on event time, the
same order lands in different windows, and counts per window differ even if the totals match. I check which timestamp
each job's window uses.

**Duplicates or cancellations handled differently.** If the batch report deduplicates on order_id and the stream does
not, the stream would be higher, not lower, so this direction rules it out, unless the batch includes orders the
stream filters out, such as test orders.

If it is late data, the fix is a decision, not a bug fix: a longer watermark means more state and later final numbers;
a shorter one means faster, slightly low numbers. Many teams label the live number as provisional and let the batch
recompute restate it. I would show the lateness distribution, for example 97% within 5 minutes and 99.5% within 15, and
let the business choose.

Whatever we choose, I add a daily reconciliation check comparing the two per window, with an alert if the gap moves
outside its usual range."

**Why it scores:** it treats the difference as evidence, ranks hypotheses, uses the direction of the gap to rule one
out, and turns the fix into a trade-off the business can choose.`,
    mcqs: [
      mcq('An Airflow DAG file queries a database at module level to build its list of tasks. What problem does that cause?', [
        ['The query runs on every parse of the file, slowing the scheduler and the database', true],
        ['The query runs once when the DAG is first deployed, so new rows are never seen', false],
        ['The query runs on the worker for each task, so it repeats for every task instance', false],
        ['The query is skipped entirely, because Airflow only executes code inside tasks', false],
      ], 'Top-level code runs whenever the DAG processor parses the file, about every 30 seconds, and an exception there becomes an import error that hides the DAG. It is not run once at deploy, it is not run per task instance, and Airflow does not skip it.'),
      mcq('A Kafka topic with 6 partitions, keyed by restaurant_id, is increased to 8 partitions. What happens to the existing keys?', [
        ['Most of them map to a new partition, so per-key order can break', true],
        ['None move, since Kafka remembers each key’s first partition', false],
        ['Only the newest keys move, so old ones keep their ordering', false],
        ['All the old messages are copied over to the new partitions', false],
      ], 'The partition is hash(key) mod the partition count, so changing the count remaps keys: 75.1% of 10,000 keys moved going from 6 to 8. Kafka keeps no key-to-partition table and never moves existing messages, so a key’s new events can be read before its old ones.'),
      mcq('One partition’s consumer lag rises steadily while its committed offset has not changed for two hours. What is the likeliest cause?', [
        ['A poison message the consumer keeps failing on and retrying', true],
        ['Too few partitions for the topic’s total incoming volume', false],
        ['A hot key sending most traffic into that single partition', false],
        ['A retention period that is too short for the consumer group', false],
      ], 'An offset that does not move at all means the consumer is stuck on one record; a hot key would still move the offset, only slowly. Too few partitions would make every partition lag, and retention deletes old data rather than stopping a consumer.'),
    ],
    checkpoint: [
      ck('DATA_PIPELINES', 'Team A’s DAG must run after Team B’s DAG updates the orders table, and the two run on different schedules. Which approach couples them least?', [
        ['B’s load declares the table as a dataset or asset, and A is scheduled on it', true],
        ['A uses an ExternalTaskSensor on B’s load task with the same logical date', false],
        ['B ends with a TriggerDagRunOperator that starts A whenever B succeeds', false],
        ['A is scheduled an hour after B’s usual finish time, with some margin', false],
      ], 'Data-aware scheduling lets A react to the data update without knowing B’s schedule or B knowing about A. The sensor needs matching logical dates, the trigger puts A’s existence into B’s code, and a time offset breaks whenever B runs late.'),
      ck('DATA_PIPELINES', 'During a backfill, Airflow tasks sit in the queued state while the Celery workers are idle, and dozens of S3 sensors are running in poke mode. What fixes it?', [
        ['Make the sensors deferrable or use reschedule mode, with timeouts', true],
        ['Add more Celery workers so there are enough for the sensors too', false],
        ['Lower the sensors’ poke_interval so that each check ends sooner', false],
        ['Set catchup=False on the DAG so the backfill stops creating any more runs', false],
      ], 'Poke-mode sensors hold slots for their whole wait, so the producing tasks cannot start; deferring or rescheduling frees the slots, and timeouts stop endless waits. Adding workers can be eaten by more sensors, a shorter interval does not release the slot, and catchup does not affect a backfill you started.'),
      ck('DATA_PIPELINES', 'A dashboard needs “orders in the last 5 minutes”, refreshed every minute. Which Spark window fits?', [
        ['window(ts, "5 minutes", "1 minute"), a sliding window', true],
        ['window(ts, "1 minute"), a tumbling one-minute window', false],
        ['window(ts, "5 minutes"), a tumbling five-minute window', false],
        ['session_window(ts, "5 minutes"), a session window', false],
      ], 'A 5-minute window that slides every minute gives a fresh last-five-minutes figure each minute. One-minute tumbling windows answer a different question, five-minute tumbling windows update only every five minutes, and a session window’s length depends on gaps in activity.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_RAPID_FIRE',
    notes: `A screening call for a data engineer or analytics engineer role: a recruiter with a list, or an engineer giving you
fifteen minutes before deciding on a full round. Thirty questions, one correct line each, at speaking pace. Cover the
answer, say yours aloud, then check. If you need more than ten seconds, go back to that question set.

## Data modelling

1. **Grain?** — What one row of a fact table means, stated before any column is chosen.
2. **Fact or dimension: delivery_fee?** — A measure on a fact; the restaurant's name is a dimension attribute.
3. **Semi-additive example?** — A balance or stock level: sums across accounts, not across days.
4. **Surrogate key?** — A warehouse-generated key per dimension row (per version in Type 2), not the source's ID.
5. **Conformed dimension?** — One dimension, such as date or customer, shared by several facts with the same keys and meaning.
6. **Role-playing dimension?** — One dimension used several times by a fact: order date, delivery date, refund date all pointing at dim_date.

## ETL and pipelines

7. **Idempotent load?** — Running it twice gives the same result as running it once.
8. **ETL versus ELT?** — Transform before loading, or load raw and transform inside the warehouse.
9. **Watermark?** — The highest updated_at (or ID) already loaded; the next run reads above it, with a lookback.
10. **CDC?** — Reading inserts, updates and deletes from the database's log (WAL, binlog), for example with Debezium or AWS DMS.
11. **Is .csv.gz splittable?** — No; one task reads each gzip file. Parquet is splittable by row group.
12. **Dead-letter or quarantine table?** — Where bad rows go, with the reason, instead of failing the load or dropping them.

## Spark

13. **Transformation versus action?** — A transformation builds the plan lazily; an action (count, collect, write) runs it.
14. **Narrow versus wide?** — Narrow: each output partition from one input partition. Wide: needs a shuffle (groupBy, join, distinct).
15. **Default shuffle partitions?** — 200 (spark.sql.shuffle.partitions); AQE can coalesce them.
16. **Default broadcast threshold?** — 10 MB (spark.sql.autoBroadcastJoinThreshold).
17. **repartition versus coalesce?** — repartition shuffles to any number of partitions; coalesce only merges partitions, without a full shuffle.
18. **Why avoid Python UDFs?** — Rows cross to Python and back, and the optimiser cannot push filters through them.

## Warehouses and lakehouses

19. **Why columnar for analytics?** — Reads only the columns a query uses, compresses well, skips blocks by min/max.
20. **Partitioning versus clustering?** — Partitioning splits data into separate units by a column; clustering sorts within them so blocks can be skipped.
21. **Medallion layers?** — Bronze raw as received, silver cleaned and conformed, gold business-ready aggregates and models.
22. **Delta time travel limit?** — Only as far back as VACUUM retention keeps the files: 7 days by default.
23. **Copy-on-write versus merge-on-read?** — Rewrite files on update (fast reads) or write changes separately and merge at read time (fast writes).
24. **Materialised view?** — A query result the warehouse stores and keeps up to date, trading storage and refresh cost for faster reads.

## Orchestration and streaming

25. **DAG?** — A directed acyclic graph of tasks and their dependencies, with a schedule.
26. **catchup?** — Whether Airflow creates runs for every missed interval since start_date.
27. **XCom?** — Small values passed between tasks through the metadata database; pass paths, not data.
28. **Kafka ordering?** — Guaranteed only within a partition; same key, same partition.
29. **Consumer lag?** — Latest offset minus the group's committed offset, per partition.
30. **Watermark in streaming?** — How long to wait for late events before a window is final; later events are dropped.

## Two questions you may also get

- **"Which tools have you used in production?"** — Say what you have built with, and how far. "I built a dbt project
  on DuckDB with tests and CI, and ran PySpark locally on 3 million rows" is better than a list of ten tools. The
  Data Engineering Candidate topic covers the resume line.
- **"SQL or Python, which is stronger?"** — Answer honestly, then show the other is usable. Most data engineer
  screens include a timed SQL test; the SQL rounds in Year 4 prepare it.

## Scoring

26+ correct and quick: strong. 20 to 25: go back to the sets your misses came from. Below 20, or "everything numeric
can be summed", or "dropDuplicates keeps the latest": redo the question sets before the next screening call.`,
    mcqs: [
      mcq('Rapid fire: “What is spark.sql.shuffle.partitions set to by default?”', [
        ['200', true],
        ['64', false],
        ['The executor core count', false],
        ['The number of input files', false],
      ], 'Spark uses 200 partitions after a shuffle unless configured otherwise; adaptive query execution can coalesce them at run time. Input files and maxPartitionBytes decide read partitions, not shuffle partitions, and the core count does not set it.'),
      mcq('Rapid fire: “Kafka guarantees message order across what?”', [
        ['Within one partition of a topic', true],
        ['Across all partitions of a topic', false],
        ['Across every topic on one broker', false],
        ['Within one consumer group’s reads', false],
      ], 'Order is per partition; the key decides the partition, so per-key order holds. There is no order across partitions or topics, and a consumer group reading several partitions sees them interleaved.'),
      mcq('Rapid fire: “Which one of these is a semi-additive measure?”', [
        ['A savings account’s month-end balance', true],
        ['The rupee amount on one order line', false],
        ['The quantity of items on an order', false],
        ['The delivery fee charged on each order', false],
      ], 'A balance sums across accounts on one date but not across dates, which is what semi-additive means. Amounts, quantities and fees are events that add up across every dimension, including time.'),
      mcq('Rapid fire: “What does medallion’s silver layer hold?”', [
        ['Cleaned, typed, deduplicated and conformed records', true],
        ['Raw files exactly as the source system sent them', false],
        ['Aggregated tables shaped for one dashboard each', false],
        ['Backups of gold tables kept for disaster recovery', false],
      ], 'Silver is the cleaned, conformed version of bronze, still at record level. Raw as-received data is bronze, report-shaped aggregates are gold, and the layers are not backups of each other.'),
      mcq('Rapid fire: “What does catchup=True do for a new daily DAG with a start_date 30 days ago?”', [
        ['It creates a run for every missed daily interval since the start_date', true],
        ['It runs only the most recent interval and skips the 29 before it', false],
        ['It retries every failed task from the previous thirty days once', false],
        ['It waits for the next scheduled time before creating any run', false],
      ], 'With catchup on, the scheduler fills every interval between start_date and now, here about 30 runs. Running only the latest interval is what catchup=False does, retries are a separate setting, and with a start_date in the past Airflow does not wait for the next tick before creating runs.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_MOCK',
    notes: `The interviewer's script for a 45-minute technical round for a fresher data engineer: at a product company in
Bengaluru, a GCC in Hyderabad, or the data practice of an IT services firm in Pune. Have a friend read the interviewer's
lines, or record yourself and score it against the notes. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about one pipeline you built, in two minutes."

- **Strong:** the source and the consumer, **the grain and the volume** ("one row per order line, 3 million rows a
  month"), **how it reruns safely**, **one thing that broke and how you found it**, and how fresh the data is.
- **Weak:** a list of tools, "Spark, Kafka, Airflow, dbt, Snowflake", with no decisions and no numbers.

## Q1 — Modelling (8 min)

"We run a ride-hailing app. Product wants trips, cancellations and driver earnings in the warehouse. Design it."

- **Strong:** names the **processes** first (trips, cancellations, driver payouts) and **a grain for each**; trip
  fact at one row per trip with fare, distance and duration; an **accumulating snapshot** if they want time from
  request to pickup; **driver earnings as its own fact** because payouts happen weekly, not per trip; driver and city
  dimensions, **Type 2 on the driver's vehicle category**; **dim_date in several roles**.
- **OK:** a star with one trip fact, grain stated.
- **Weak:** copies the app's tables, or starts listing columns before saying what a row is.

Follow-up: "A trip can have two riders splitting the fare." — A **bridge** between trip and rider with a weight, or
a fact at trip-rider grain; says which questions each answers.

## Q2 — Pipelines (8 min)

"The trips table in the app's Postgres is 400 GB, with an updated_at column. Get it into the lake every hour."

- **Strong:** a **read replica**, incremental by updated_at **with a lookback** and an upper bound, keyset pages,
  deduplicated **upsert by trip_id with a version guard**; raw kept by ingestion date; says watermarks **miss hard
  deletes** and that **CDC with a slot created before the snapshot** is the step up; a daily **row-count
  reconciliation**.
- **Weak:** "SELECT * every hour and overwrite the table."

Follow-up: "Rows are going missing." — **Late-committing transactions**, strict > on equal timestamps, updates that
skip updated_at, time zones.

## Q3 — Spark (10 min)

The interviewer shares a plan with a **SortMergeJoin** between a 2-billion-row trips table and a 300-row cities
table, a **BatchEvalPython** node and **200 output files of 3 MB**.

- **Strong:** **broadcast the cities table** and ask why it was not broadcast automatically (threshold disabled, or
  a missing size estimate); **replace the UDF with a built-in** so the filter is pushed down; **repartition by the
  output partition column** or turn on AQE before the write; then **measure** in the Spark UI.
- **OK:** finds one of the three.
- **Weak:** "Increase executors and memory."

Follow-up: "After the change one task takes 20 minutes." — **Skew**: count rows per key, look for nulls or a
placeholder city, AQE skew join, salting.

## Q4 — Warehouse (8 min)

"Our gold table, rebuilt nightly with a MERGE into Delta, has started taking three hours. Also, yesterday someone
overwrote it by mistake."

- **Strong:** the MERGE scans every file because **the ON condition has no partition predicate**; add the batch's
  dates; **compact** recently touched partitions; for the overwrite, **history then RESTORE to the last good
  version**, check what read the bad version, and **lock down manual writes**; mentions the **VACUUM retention**
  limit on time travel.
- **Weak:** "Re-run the whole pipeline from the start to rebuild it."

## Q5 — Orchestration and streaming (8 min)

"The finance DAG must start after the payments stream has landed all of yesterday's events. Payment events can
arrive up to 30 minutes late."

- **Strong:** yesterday is complete only when the **stream's watermark has passed midnight plus the allowed
  lateness**; the streaming job writes a **completeness marker or updates a dataset/asset**; the finance DAG is
  **scheduled on that dataset** or waits with a **deferrable sensor with a timeout**; finance's load is **idempotent
  for the day**, so a late correction can rerun it; an alert if the marker is not there by a deadline.
- **Weak:** "Schedule the finance DAG at 1 a.m.; that should be enough time."

## Close (2 min)

"What would you change in your pipeline if you had another week?" — **Strong:** one specific gap, such as no
reconciliation, a manual backfill or no alert on freshness, and how you would know the fix worked.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Modelling | Processes, grains, fact types, bridge | One star, grain stated | Copies app tables |
| Pipelines | Lookback, upsert, deletes, reconcile | Incremental, no edge cases | Full reload hourly |
| Spark | Broadcast, built-in, files, measure | One fix | More executors |
| Warehouse | Pruned MERGE, compaction, restore | Restore only | Rebuild everything |
| Orchestration and streaming | Completeness signal, dataset, idempotent | Sensor with timeout | Fixed clock time |

Hire bar for a fresher: 11 or more out of 15, with no 1 in Pipelines or Warehouse. A destructive instinct, such as
overwriting a production table to "fix" it, costs more than an honest "I have not done that; here is how I would find
out".`,
    mcqs: [
      mcq('In the mock’s Q3, the plan shows a SortMergeJoin between 2 billion trips and a 300-row cities table. What should the candidate say first?', [
        ['Broadcast the cities table, and ask why it was not broadcast automatically', true],
        ['Salt the city_id key, because a join on a small table is always skewed', false],
        ['Cache the trips table, so the join can read it from executor memory', false],
        ['Raise spark.sql.shuffle.partitions so that the sort-merge join is spread wider', false],
      ], 'A 300-row table should be broadcast, which removes the shuffle and sort of 2 billion rows; asking why it was not uncovers a disabled threshold or missing statistics. Salting fixes skew that has not been shown, caching does not remove the shuffle, and more partitions only spread the same shuffle.'),
      mcq('In the mock’s Q5, why does “schedule the finance DAG at 1 a.m.” score a 1?', [
        ['A clock time cannot know whether the stream has finished the day', true],
        ['Airflow cannot schedule a DAG at any time between midnight and 2 a.m.', false],
        ['Finance DAGs must always run at the end of the business day instead', false],
        ['The DAG would run before the payments topic has been created that day', false],
      ], 'Whether yesterday is complete depends on the stream’s progress and the allowed lateness, not on the time; a completeness marker or dataset event says so, and a fixed time breaks the first night the stream lags. There is no such Airflow restriction, no rule about finance timing, and topics persist across days.'),
      mcq('In the mock’s Q1, a trip can be shared by two riders who split the fare. Which design keeps revenue by rider correct?', [
        ['A bridge from trip to rider with weights that sum to 1 for each trip', true],
        ['Two rider keys on the trip fact, rider_key_1 and rider_key_2, side by side', false],
        ['The trip fact duplicated once per rider, with the full fare on each row', false],
        ['A rider dimension with Type 2 rows for every trip a rider has shared', false],
      ], 'A weighted bridge (or a fact at trip-rider grain with the fare split) lets fares add back to the trip total. Two key columns break with a third rider, duplicating rows with the full fare double-counts revenue, and Type 2 tracks attribute changes, not relationships.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_IV_CHECKPOINT',
    notes: `Ten questions across the data engineer interview sets: data modelling, ETL and pipelines, Spark, warehouses and
lakehouses, and orchestration and streaming. Each is asked the way a panel asks it. Read the numbers or the plan in the
question before you choose.`,
    checkpoint: [
      ck('DATA_MODELLING', 'A dashboard reports average delivery time per city per month by averaging the daily averages stored in a summary table. Why does a reviewer object?', [
        ['Days with different order volumes are weighted equally, so the result is skewed', true],
        ['An average can never be stored in a table, only computed at the moment of reading', false],
        ['Delivery time is semi-additive, so it may only be summed across the cities', false],
        ['The summary table should be Type 2, so that old averages are kept as history', false],
      ], 'An average of averages ignores how many orders each day had; storing total minutes and order counts and dividing at query time gives the true figure. Averages can be stored, they are just not combinable; delivery time is non-additive rather than semi-additive; and Type 2 is about dimension history.'),
      ck('DATA_MODELLING', 'A fact table’s restaurant_key column holds -1 for 0.4% of yesterday’s orders. What does that most likely mean?', [
        ['Those orders arrived before their restaurant rows and point to the unknown row', true],
        ['Those restaurants were deleted, so their orders were marked as invalid sales', false],
        ['Those orders failed the load and are stored only as placeholders for a rerun', false],
        ['The surrogate key sequence overflowed and wrapped around to a negative value', false],
      ], 'Mapping unmatched natural keys to an unknown member keeps the facts and their amounts while the dimension catches up; the count on -1 is worth monitoring and re-keying. Deleted restaurants keep their rows, a failed load writes nothing, and key sequences do not wrap at such small values.'),
      ck('ETL_FUNDAMENTALS', 'An hourly extract reads WHERE updated_at > :watermark. A daily reconciliation shows the lake a few rows short of the source on busy days. What is the most likely cause?', [
        ['Transactions that commit after the extract with an older updated_at', true],
        ['The lake’s Parquet files compress some rows away on busy days', false],
        ['The extract reads from a read replica rather than the primary', false],
        ['The watermark is stored as a timestamp rather than as a string', false],
      ], 'A long transaction stamps its rows when it starts but makes them visible when it commits, possibly after the extract moved the watermark past them; a lookback window with deduplication catches them. Compression never drops rows, replica lag would delay rows rather than lose them for good, and the type of the stored watermark is not the issue.'),
      ck('ETL_FUNDAMENTALS', 'A batch contains orders for today and late orders for two earlier dates. Gold daily totals are rebuilt with DELETE and INSERT. Which dates should the rebuild cover?', [
        ['Every distinct event date that appears in the batch', true],
        ['Only today, since the earlier dates were already loaded', false],
        ['The whole table, since late data can affect any date', false],
        ['Today and yesterday, as a fixed two-day lookback window', false],
      ], 'Rebuilding exactly the event dates present in the batch corrects them and touches nothing else. Today alone leaves the earlier dates wrong, a full rebuild is correct but wastes work every run, and a fixed two-day window misses anything later than that.'),
      ck('BATCH_STREAM_PROCESSING', 'In a Spark left outer join, trips LEFT JOIN cities, the cities table has 20 rows. Which side can Spark broadcast?', [
        ['The cities side, since a left join can build only on its right side', true],
        ['The trips side, since the larger table is always the one that gets broadcast', false],
        ['Either side, as long as a broadcast() hint is placed on that table', false],
        ['Neither side, because outer joins cannot use broadcast hash joins', false],
      ], 'In a left outer join every left row must be emitted, so the hash table is built from the right side; with 20 rows cities is ideal. Spark broadcasts the small side, not the large one; a hint on the left of a left join is ignored; and outer joins do use broadcast hash joins.'),
      ck('BATCH_STREAM_PROCESSING', 'A team must keep the latest status per trip from an event table. Which PySpark approach is correct?', [
        ['row_number() over a window by trip_id ordered by time descending, then rn = 1', true],
        ['dropDuplicates(["trip_id"]) after ordering the DataFrame by time descending', false],
        ['groupBy("trip_id").agg(F.first("status")) right after reading the event table', false],
        ['distinct() on trip_id and status, then keeping the last row for each trip', false],
      ], 'A ranked window gives a deterministic latest row (add a tie-breaker for equal times). dropDuplicates keeps an arbitrary row even after an orderBy, first() depends on row order after a shuffle, and distinct keeps every status, with no defined last row.'),
      ck('DATA_WAREHOUSING', 'Someone overwrote a Delta table by mistake ten days ago, and VACUUM runs nightly with the default retention. What can you expect when you try to restore?', [
        ['The old version is in the log, but its data files may already be deleted', true],
        ['The restore will work, since the transaction log keeps every version’s data', false],
        ['The restore will work, since VACUUM never deletes files from older versions', false],
        ['The old version will be gone from the log, so no trace of it is left at all', false],
      ], 'Default retention is seven days, so files needed only by versions older than that are eligible for deletion; the log entry remains but cannot be read. The log stores metadata, not data, VACUUM deletes exactly such files, and log entries outlive the data files.'),
      ck('DATA_WAREHOUSING', 'Which change to a Delta table does schema enforcement reject by default, unless schema evolution is asked for on the write?', [
        ['Appending rows that carry an extra column the table does not have', true],
        ['Appending rows whose values are all present and of the right types', false],
        ['Running a MERGE whose source columns match the target exactly', false],
        ['Reading an older version of the table through time travel', false],
      ], 'An extra column on write fails with a schema mismatch until schema_mode="merge" (or mergeSchema in Spark) allows it. Matching appends and MERGEs pass, and reading old versions is not a write at all.'),
      ck('DATA_PIPELINES', 'An Airflow DAG has disappeared from the UI and shows as an import error after a change to a helper module it imports at the top of the file. Where is the problem?', [
        ['In top-level code that fails when the DAG processor parses the file', true],
        ['In a task’s Python callable, which failed on a worker during a run', false],
        ['In the metadata database, which lost the DAG’s record after the change', false],
        ['In the executor, which refuses DAGs whose imports have changed recently', false],
      ], 'Imports and module-level code run whenever the file is parsed; an exception there makes the DAG fail to load at all. A failing task callable shows as a failed task in a visible DAG, the database does not drop DAGs, and executors do not inspect imports.'),
      ck('DATA_PIPELINES', 'A Kafka consumer group falls eight days behind on a topic with the default retention, and then auto.offset.reset is triggered. What has happened?', [
        ['Its committed offsets point at data already deleted by retention', true],
        ['The broker paused the group because it had fallen too far behind', false],
        ['The topic was compacted, which reset every committed offset to zero', false],
        ['A rebalance moved the group’s partitions to another topic’s offsets', false],
      ], 'Once retention deletes segments past the committed offset, the consumer asks for an offset that no longer exists and the reset policy decides where to resume, losing data either way. Brokers do not pause slow groups, compaction keeps offsets, and rebalances move partitions between consumers, not topics.'),
    ],
  },
];
