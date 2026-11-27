/**
 * Career-track content: dbt and ELT (DE_DBT), Data Engineer, batch DE2.
 *
 * Transforming data inside the warehouse with dbt: why ELT replaced most hand-run ETL, a dbt project's parts
 * (models, ref and source, materialisations, seeds), tests of every kind (generic, singular, unit tests, source
 * freshness), documentation and lineage, incremental models that survive late-arriving data, snapshots for Type 2
 * history, and the layout, macros, packages and CI that let a team share one project. It builds on DE1's "SQL as a
 * Pipeline Language" (layers by hand), "Upserts with MERGE and INSERT ... ON CONFLICT", "Idempotent, Restartable
 * Loads" and "Slowly Changing Dimensions" (the Type 2 load that dbt snapshots generate); those are referred to by
 * title, not re-taught.
 *
 * One fictional company runs through the topic: KhaanaKart, a Pune food-delivery app. Everything quoted from dbt was
 * produced by a real project run with dbt-core 1.12.6 and dbt-duckdb 1.11.1 on DuckDB 2.0 (Windows, synthetic data):
 * dbt run/test/build/snapshot/seed/show/ls/parse output, the failing tests, unit-test diffs, freshness results,
 * compiled SQL, incremental runs with new and late data, microbatch, snapshots, contracts and a deferred CI build.
 * dbt Cloud, dbt packages (dbt deps could not reach the package hub from the lab machine), CI YAML and
 * warehouse-specific configs (Snowflake, BigQuery, Redshift, Databricks) are written from the documentation and NOT
 * run; the notes say so.
 *
 * Skills: ETL_FUNDAMENTALS by default; DBT_INCREMENTAL is DATA_MODELLING. Checkpoint questions elsewhere that are
 * plainly about snapshots or modelling use ck('DATA_MODELLING', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_DE_DBT_BUNDLES: PilotBundle[] = [
  /* ── ELT_DBT ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_ELT_DBT',
    notes: `In "SQL as a Pipeline Language" you built raw, staging, intermediate and mart layers by hand: a script of CREATE OR
REPLACE statements, run in an order you kept in your head. That works for five tables. At fifty, someone adds a model
that reads a table before it has been rebuilt, and the dashboard is quietly a day behind. dbt exists to fix exactly
this.

## ETL, then ELT

The old pattern was **ETL**: extract from the sources, transform on a separate server (an ETL tool or a Python job),
load the finished tables into the warehouse. Columnar cloud warehouses (Redshift, Snowflake, BigQuery, Databricks
SQL; on Azure, Synapse and Fabric) changed the economics: storage is cheap, compute scales on demand, and SQL over
billions of rows is fast. So the order flipped to **ELT**: load the raw data as it is, then transform it inside the
warehouse with SQL. Raw stays available for replay, analysts can read the transformation logic, and one engine does
the work.

ELT needs discipline that a folder of scripts does not give you: run order, tests, documentation, environments,
code review. That is dbt's job.

## What dbt is, and is not

dbt ("data build tool") compiles SELECT statements into the DDL and DML the warehouse needs, runs them in dependency
order, tests the results and documents them. It does not extract or load (that is your Python from DE1, or a tool
such as Airbyte or Fivetran), it does not schedule (that is Airflow or Prefect, in the Orchestration topic), and it
has no compute of its own — every query runs in the warehouse.

**dbt Core** is the open-source command line used here. **dbt Cloud** (dbt Labs' hosted product) adds a browser IDE,
a scheduler and CI jobs; it is described from the documentation, not run. When this was written the dbt 1.12 CLI
also printed that a dbt v2 is available and is the default for new installations; this topic uses the v1 project
format, so read the upgrade guide before mixing the two.

## A project on a laptop

    python -m venv .venv && .venv\\Scripts\\activate
    pip install dbt-core dbt-duckdb
    dbt --version          # installed: 1.12.6 ... duckdb: 1.11.1

The adapter (dbt-duckdb, dbt-snowflake, dbt-bigquery, dbt-redshift, dbt-databricks) is what changes per warehouse;
the project stays almost the same. KhaanaKart's project:

    khaanakart/
      dbt_project.yml      name, folders, default configs
      profiles.yml         connections (usually ~/.dbt/, never in Git with passwords)
      models/staging/      stg_orders.sql, stg_payments.sql, _sources.yml
      models/intermediate/ int_orders_paid.sql
      models/marts/        fct_orders.sql, mart_restaurant_daily.sql
      tests/  snapshots/  macros/  seeds/
      target/              compiled SQL, manifest.json, run results (not committed)

The profile for DuckDB is a file path and a schema:

    khaanakart:
      target: dev
      outputs:
        dev: {type: duckdb, path: khaanakart.duckdb, schema: analytics, threads: 4}

## Models, source() and ref()

A model is one SELECT in one .sql file; the file name becomes the table or view name. Raw tables are declared once
as sources in YAML and read with source(); models read other models with ref():

    -- models/staging/stg_orders.sql
    select order_id, customer_id, restaurant_id,
           lower(trim(status))             as status,
           cast(amount_paise as bigint)    as amount_paise,
           cast(ordered_at as timestamptz) as ordered_at_utc
    from {{ source('raw', 'orders') }}

dbt compiled the last line to from "khaanakart"."raw"."orders". ref('stg_orders') compiles to the right schema for
whoever runs it — your dev schema, CI's, production's — and, more importantly, **records a dependency**. From every
ref and source dbt builds a directed acyclic graph (DAG) and runs models in that order. Never write a schema-qualified
table name for another model: dbt cannot see the dependency and may build the two in the wrong order.

## Materialisations

A config, per folder in dbt_project.yml or per model, decides what dbt creates:

    view         staging: cheap, always current, recomputed on read
    table        marts: fast to read, rebuilt in full every run
    ephemeral    no object; inlined as a CTE into the models that ref it
    incremental  only new or changed rows each run (lesson 3)

KhaanaKart's int_orders_paid is ephemeral, so the compiled fct_orders began with
with __dbt__cte__int_orders_paid as ( ... ). Use ephemeral for small helper steps; you cannot query or test it on its
own.

## Running it

    dbt run
    Found 6 models, 4 sources, 511 macros
    2 of 5 OK created sql view model analytics.stg_payments ......... [OK in 0.59s]
    ...
    4 of 5 OK created sql table model analytics.fct_orders .......... [OK in 0.44s]
    5 of 5 OK created sql table model analytics.mart_restaurant_daily [OK in 0.15s]
    Done. PASS=5 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=5

Six models, five built: the ephemeral one has nothing to create. The three staging views ran in parallel (four
threads); fct_orders waited for them because of ref.

## Selecting part of the graph

    dbt run --select stg_orders+          the model and everything downstream
    dbt run --select +mart_restaurant_daily   everything it depends on, then it
    dbt run --select marts.events         a folder, as a dotted path
    dbt build                             run + test + snapshot + seed, in DAG order

The other commands you will use daily: dbt compile (write the SQL to target/ without running), dbt show --select
model (preview rows), dbt ls (list what a selector matches), dbt seed (load small CSVs from seeds/ — KhaanaKart's
five-row city_tiers.csv printed INSERT 5), and dbt debug (check the connection).`,
    workedExample: `**Scenario.** KhaanaKart's restaurant dashboard is built by three SQL files that a cron job runs in alphabetical
order: build_daily.sql, clean_orders.sql, join_payments.sql. Alphabetical happens to be wrong, so the daily table
always reads yesterday's cleaned orders. Move it to dbt and let the graph decide the order.

**1. Declare the raw tables as sources.** models/staging/_sources.yml lists raw.orders, raw.payments,
raw.restaurants. Nothing in the project names a raw table any other way.

**2. One staging model per source table.** clean_orders.sql becomes stg_orders.sql: the SELECT only, no CREATE.
Casting, trimming and renaming stay here and nowhere else.

**3. Replace table names with ref.** join_payments.sql becomes int_orders_paid.sql:

    with paid as (
        select order_id, sum(amount_paise) as paid_paise
        from {{ ref('stg_payments') }}
        where payment_status = 'success'
        group by order_id
    )
    select o.*, cast(coalesce(p.paid_paise, 0) as bigint) as paid_paise
    from {{ ref('stg_orders') }} o
    left join paid p using (order_id)

Summing only successful payments matters: order KK-5002 has a failed card attempt and a successful UPI payment.

**4. The mart declares its grain.** fct_orders adds the IST business day,
cast(timezone('Asia/Kolkata', ordered_at_utc) as date); mart_restaurant_daily is one row per restaurant per IST day.

**5. Check the graph before running.**

    dbt ls --select +mart_restaurant_daily --resource-type model
    khaanakart.marts.fct_orders
    khaanakart.intermediate.int_orders_paid
    khaanakart.marts.mart_restaurant_daily
    khaanakart.staging.stg_orders
    khaanakart.staging.stg_payments
    khaanakart.staging.stg_restaurants

(dbt ls sorts by model name; the run order comes from the graph.)

**6. Run and look.** dbt run printed PASS=5, then dbt show --select mart_restaurant_daily:

    | restaurant_id | restaurant_name      | order_date_ist | orders | delivered | gmv_rupees |
    | R102          | Bombay Biryani House |     2026-10-25 |      1 |         1 |        450 |
    | R999          |                      |     2026-10-26 |      1 |         1 |        520 |

**Result.** The order of execution is now derived, not remembered, and a new model slots in by using ref. The blank
restaurant name for R999 is a data problem the next lesson's tests catch.`,
    mcqs: [
      mcq('A KhaanaKart model reads another model with from analytics.stg_orders instead of ref(\'stg_orders\'). It runs fine on the author\'s laptop. What is the real problem?', [
        ['dbt cannot see the dependency, so it may build the two models in the wrong order', true],
        ['dbt refuses to compile any model that names a schema directly in its FROM clause', false],
        ['The query is slower, because ref() lets the warehouse cache the referenced view', false],
        ['The model will be materialised as a view, whatever the folder config says', false],
      ], 'ref() both resolves the right schema for each environment and records an edge in the DAG; a hard-coded name does neither, so ordering and CI schemas break. dbt compiles hard-coded names happily, ref has nothing to do with caching, and materialisation comes from config.'),
      mcq('dbt run reports "Found 6 models" but creates only five objects, with no errors. What is the likeliest explanation?', [
        ['One model is ephemeral, so it is inlined as a CTE', true],
        ['One model failed silently and was skipped by dbt', false],
        ['One model is a view and views are never counted', false],
        ['One model has no tests, so dbt does not build it', false],
      ], 'Ephemeral models create nothing; their SQL is injected into the models that ref them. A failure would show ERROR, views are created and counted like tables, and tests never decide whether a model is built.'),
      mcq('In ELT, where does the transformation of KhaanaKart\'s raw orders into fct_orders actually execute?', [
        ['In the warehouse, which runs the SQL that dbt compiled', true],
        ['On the dbt process, which pulls rows into Python memory', false],
        ['In the extraction tool, before the raw data is loaded', false],
        ['On dbt Cloud servers, which hold a copy of the tables', false],
      ], 'dbt sends compiled SQL to the warehouse and the warehouse does the work; that is the point of ELT. dbt does not move rows through Python, extraction loads raw data untransformed, and dbt Cloud orchestrates runs rather than hosting the data.'),
    ],
    checkpoint: [
      mcq('Which statement about a dbt model is correct?', [
        ['It is one SELECT; dbt wraps it in the DDL for its materialisation', true],
        ['It is a CREATE TABLE statement that dbt runs in alphabetical order', false],
        ['It is a Python function that returns rows for dbt to load itself', false],
        ['It is a YAML block naming the source columns and their data types', false],
      ], 'You write only the SELECT; dbt generates CREATE VIEW, CREATE TABLE AS or a MERGE around it and runs models in DAG order. Python models exist on some adapters but are not the norm, and YAML describes models rather than defining them.'),
      mcq('KhaanaKart wants to rebuild fct_orders and every model that reads from it after a bug fix. Which command does that?', [
        ['dbt run --select fct_orders+', true],
        ['dbt run --select +fct_orders', false],
        ['dbt run --exclude fct_orders', false],
        ['dbt compile --select fct_orders', false],
      ], 'A trailing + selects the model and its descendants. A leading + selects its ancestors, --exclude leaves it out, and compile writes SQL without building anything.'),
      mcq('Which job belongs to dbt in an ELT pipeline?', [
        ['Turning loaded raw tables into tested models in the warehouse', true],
        ['Pulling changed rows out of the production database each night', false],
        ['Deciding at what time of night every pipeline step should start', false],
        ['Providing the compute that executes the transformation queries', false],
      ], 'dbt transforms and tests data already loaded. Extraction is the EL tool\'s job, scheduling is the orchestrator\'s, and the warehouse supplies the compute.'),
    ],
  },

  /* ── DBT_TESTS_DOCS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_DBT_TESTS_DOCS',
    notes: `A model that builds is not a model that is right. dbt's tests are queries that return the rows breaking an
assumption; zero rows is a pass. They run after each model in dbt build, and a failure stops everything downstream
— which is what you want: a wrong number should never reach the dashboard.

## Generic tests, in YAML

Four come with dbt: unique, not_null, accepted_values and relationships. In current dbt (1.10 and later) their
arguments sit under arguments:, and the key is data_tests (tests: is the older name):

    models:
      - name: stg_orders
        columns:
          - name: order_id
            data_tests: [unique, not_null]
          - name: status
            data_tests:
              - accepted_values:
                  arguments:
                    values: ['placed', 'delivered', 'cancelled']
          - name: restaurant_id
            data_tests:
              - relationships:
                  arguments:
                    to: ref('stg_restaurants')
                    field: restaurant_id

Written the old way (values: directly under accepted_values), dbt 1.12 still ran it but warned:
MissingArgumentsPropertyInGenericTestDeprecation ... Arguments to generic tests should be nested under the
arguments property.

## A real failure

KhaanaKart's dbt build printed:

    6 of 15 FAIL 1 accepted_values_stg_orders_status__placed__delivered__cancelled [FAIL 1]
    8 of 15 FAIL 1 relationships_stg_orders_restaurant_id__restaurant_id__ref_stg_restaurants_ [FAIL 1]
    13 of 15 SKIP relation analytics.fct_orders due to ephemeral model status 'skipped'
    15 of 15 SKIP relation analytics.mart_restaurant_daily
    [ERROR]: in test accepted_values_stg_orders_status__... (models\\staging\\_staging.yml)
      Got 1 result, configured to fail if != 0
    Done. PASS=10 WARN=0 ERROR=2 SKIP=3

Each test compiles to SQL you can run yourself (the path is printed). accepted_values became:

    with all_values as (
        select status as value_field, count(*) as n_records
        from "khaanakart"."analytics"."stg_orders" group by status
    )
    select * from all_values
    where value_field not in ('placed','delivered','cancelled')

Running it showed refunded, a status the app added last week. relationships found R999, a restaurant whose orders
arrived before the restaurant extract did. Two failures, two different decisions:

- **refunded is legitimate.** After checking with the product team, add it to the accepted values. The test did its
  job: someone now decides how refunds count in GMV.
- **R999 is an expected lag.** Fail the build and the whole dashboard stops for one restaurant. Downgrade it:

    - relationships:
        arguments: {to: ref('stg_restaurants'), field: restaurant_id}
        config:
          severity: warn

The next build: WARN 1 relationships_..., Done. PASS=18 WARN=1 ERROR=0. Other configs: warn_if / error_if
('>10' fails only above ten rows), where (test a subset), store_failures: true (keep failing rows in a table).

## Singular tests

Any SELECT in tests/ that returns the bad rows:

    -- tests/assert_delivered_orders_are_paid.sql
    select order_id, amount_paise, paid_paise
    from {{ ref('fct_orders') }}
    where status = 'delivered' and paid_paise <> amount_paise

Use them for business rules a generic test cannot say. Packages (lesson 4) add more generic tests — dbt_utils'
unique_combination_of_columns for a grain, for example.

## Unit tests: logic, not data

Data tests check today's data. Unit tests (dbt 1.8+) check a model's logic on rows you write, before it runs:

    unit_tests:
      - name: order_date_uses_ist_boundary
        model: fct_orders
        given:
          - input: ref('int_orders_paid')
            rows: ...  A at 18:20 UTC, B at 18:40 UTC
        expect:
          rows:
            - {order_id: A, order_date_ist: '2026-10-26'}
            - {order_id: B, order_date_ist: '2026-10-27'}

When someone "simplified" the timezone to UTC, the unit test printed:

    actual differs from expected:
    @@,order_id,order_date_ist
      ,A       ,2026-10-26
    → ,B       ,2026-10-27→2026-10-26

Run unit tests in development and CI, not in production: the inputs are fixed, so re-running them there adds nothing.

## Source freshness

A model can pass every test on yesterday's data. Freshness asks whether the raw tables are being loaded:

    - name: payments
      config:
        loaded_at_field: _loaded_at
        freshness:
          warn_after: {count: 2, period: hour}
          error_after: {count: 12, period: hour}

dbt source freshness compares max(_loaded_at) with now. With payments last loaded eight hours earlier:

    1 of 2 PASS freshness of raw.orders ...... [PASS in 0.05s]
    2 of 2 WARN freshness of raw.payments .... [WARN in 0.06s]

target/sources.json recorded max_loaded_at_time_ago_in_s: 28808 for payments and 1341 for orders. Run freshness
before the build in the scheduled job; it is the cheapest alarm a pipeline has.

## Documentation and lineage

description: on sources, models and columns, then:

    dbt docs generate     # Catalog written to ...\\target\\catalog.json
    dbt docs serve        # local site with the lineage graph

docs generate writes target/index.html, manifest.json (the project: every node and edge) and catalog.json (columns and
types read from the warehouse). The lineage graph is drawn from ref and source — another reason never to hard-code
a table name. The manifest is also what CI compares against (lesson 4).`,
    workedExample: `**Scenario.** Monday, 09:10. KhaanaKart's 07:00 scheduled dbt build failed; the restaurant dashboard still shows
Saturday. You have the log above. Restore the dashboard today without hiding a real problem.

**1. Read the summary, not the whole log.** PASS=10 ERROR=2 SKIP=3. Two tests failed on stg_orders; fct_orders and
mart_restaurant_daily were skipped. Nothing is wrong with the models themselves.

**2. Look at the failing rows.** Run the compiled SQL from target/compiled/.../accepted_values_stg_orders_status...sql
(or rerun with --store-failures). It returns one value: refunded, one order (KK-5007). The relationships test
returns R999.

**3. Decide each one with the owner.**
- refunded: the product team confirms it is a new, permanent status. Add it to accepted_values. Then check every
  model that filters on status: mart_restaurant_daily counts only delivered in GMV, so refunds are excluded — which
  finance confirms is right.
- R999: the restaurant extract runs at 06:00 and new restaurants appear a day late. Make the relationships test
  severity: warn, and let the mart show the order with a blank name rather than dropping it.

**4. Add the missing guard.** Nothing caught that a delivered order was unpaid. Add the singular test
assert_delivered_orders_are_paid.

**5. Rebuild.**

    dbt build
    ...WARN 1 relationships_stg_orders_restaurant_id__...
    15 of 19 PASS assert_delivered_orders_are_paid
    19 of 19 OK created sql table model analytics.mart_restaurant_daily
    Done. PASS=18 WARN=1 ERROR=0 SKIP=0

**6. Make the warning visible.** A warning nobody reads is a deleted test. Route dbt's warnings to the team channel
from the orchestrator, and open a ticket to run the restaurant extract before the build.

**Result.** The dashboard is back by 09:40 with refunds handled deliberately, the late restaurant visible as a
warning, and one more rule tested than on Friday.`,
    mcqs: [
      mcq('A dbt build fails with "Got 1 result, configured to fail if != 0" on an accepted_values test for status. What does the 1 mean?', [
        ['One distinct status value outside the list was found', true],
        ['One order row in the model has a NULL status column', false],
        ['One test out of all the tests in the project failed', false],
        ['One retry was attempted before the test was failed', false],
      ], 'The compiled test groups by the column and returns each value not in the list, so the count is distinct bad values (here, refunded). accepted_values does not flag NULLs by default, the count is per test, and dbt does not retry tests.'),
      mcq('New restaurants reach KhaanaKart\'s raw tables a day after their first orders, so a relationships test fails most mornings. What is the sensible change?', [
        ['Set the test\'s severity to warn and fix the extract order', true],
        ['Delete the relationships test, since it fails too often', false],
        ['Filter orders from unknown restaurants out of staging', false],
        ['Run the whole build twice so the second run will pass', false],
      ], 'A warning keeps the signal without stopping every dashboard, and the root cause is the extract schedule. Deleting the test loses the signal, filtering hides real orders and revenue, and re-running does not load the missing restaurant.'),
      mcq('What does a dbt unit test check that a not_null data test cannot?', [
        ['That the model\'s logic gives the expected output for rows you wrote', true],
        ['That the production table has no NULLs in any of its columns today', false],
        ['That the raw source has been loaded within the last few hours', false],
        ['That the model\'s compiled SQL runs faster than the previous version', false],
      ], 'Unit tests feed fixed inputs to a model and compare its output, so they test logic such as the IST date boundary. Data tests check the data that exists, freshness checks loading, and neither kind measures speed.'),
    ],
    checkpoint: [
      mcq('In dbt, what makes a singular test fail?', [
        ['Its SELECT returns at least one row', true],
        ['Its SELECT returns no rows at all', false],
        ['Its SELECT returns a NULL in a column', false],
        ['Its SELECT takes longer than a minute', false],
      ], 'A test query returns the rows that break the rule, so any row is a failure (configurable with warn_if and error_if). No rows is a pass, NULLs only matter if the query selects them, and time is not a test condition.'),
      mcq('The payments source has warn_after 2 hours and error_after 12 hours on _loaded_at. Its last load was 8 hours ago. What does dbt source freshness report?', [
        ['WARN for raw.payments', true],
        ['PASS for raw.payments', false],
        ['ERROR for raw.payments', false],
        ['SKIP for raw.payments', false],
      ], 'Eight hours is past the warn threshold and short of the error threshold, so it warns — exactly what KhaanaKart\'s run printed. It would pass under 2 hours and error over 12; sources are skipped only when no freshness is configured.'),
      mcq('Which file produced by dbt docs generate holds the columns and data types read from the warehouse?', [
        ['catalog.json', true],
        ['manifest.json', false],
        ['run_results.json', false],
        ['profiles.yml', false],
      ], 'catalog.json is built by querying the warehouse\'s metadata. manifest.json describes the project\'s nodes and edges, run_results.json records the last command\'s outcomes, and profiles.yml holds connections.'),
    ],
  },

  /* ── DBT_INCREMENTAL ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_DBT_INCREMENTAL',
    notes: `A table materialisation rebuilds the whole table every run. For KhaanaKart's order events — tens of millions of rows
a month — that means scanning everything to add one day. An incremental model builds in full once, then processes
only what is new. It is also where most silent dbt bugs live, because "what is new" is harder than it looks.

## The anatomy

    {{ config(materialized='incremental', unique_key='event_id',
              incremental_strategy='delete+insert') }}
    select event_id, order_id, status, event_ts, _loaded_at
    from {{ source('raw', 'order_events') }}
    {% if is_incremental() %}
    where _loaded_at > (select max(_loaded_at) from {{ this }})
    {% endif %}

is_incremental() is true only when the table exists and you did not pass --full-refresh. {{ this }} is the
existing table. unique_key says which rows replace which.

**Strategies** (how new rows are written):

    append          INSERT only; duplicates if the filter overlaps
    delete+insert   delete target rows whose key is in the batch, insert the batch
    merge           MERGE ... WHEN MATCHED UPDATE / WHEN NOT MATCHED INSERT
    microbatch      one query per time slice (dbt 1.9+), below
    insert_overwrite  replace whole partitions (BigQuery, Spark/Databricks)

dbt-duckdb compiled merge to MERGE INTO ... USING ... ON (... order_id = ... order_id) WHEN MATCHED THEN UPDATE BY
NAME WHEN NOT MATCHED THEN INSERT BY NAME; delete+insert to a DELETE ... WHERE (order_id) IN (select ...) followed by
an INSERT. Defaults differ by adapter (Snowflake and BigQuery default to merge, others to append or
delete+insert): set it explicitly. Snowflake, BigQuery and Databricks details are from the documentation, not run.

## Forgetting the filter

An append model with no is_incremental() block, run three times on 9 events:

    rows 9, events 9  ->  rows 18, events 9  ->  rows 27, events 9

No error, just tripled numbers. A unique test on event_id is the guard.

## Late data: what "new" means

KhaanaKart's delivery app buffers events when a rider's phone is offline. Batch 1 (loaded two hours ago) held events
up to 09:00. Batch 2 (loaded now) brings two new events and a late one: KK-6002 was picked up at 08:30, earlier than
the newest event already loaded. And a resend: KK-6001's 08:20 picked_up, again.

The model is order_status, one row per order with its latest status. Three versions, the same two runs:

**A. Filter on event time** — where event_ts > (select max(status_at) from {{ this }}):

    KK-6002  placed     08:05     missed: 08:30 is older than 09:00

**B. Filter on load time, rank only the batch** — where _loaded_at > max(_loaded_at):

    KK-6001  picked_up  08:20     went backwards from delivered 08:41
    KK-6002  picked_up  08:30

**C. Find the touched orders by load time, recompute them from all their events:**

    where order_id in (select order_id from {{ ref('fct_order_events') }}
                       where _loaded_at > (select max(loaded_through) from {{ this }}))
    qualify row_number() over (partition by order_id
                               order by event_ts desc, event_id desc) = 1

    KK-6001  delivered  08:41
    KK-6002  picked_up  08:30
    KK-6003  picked_up  09:25
    KK-6004  placed     09:30

Only C is right. The rules: select new rows by **when they arrived** (a load timestamp or sequence), not by when
they happened; and when the target is a state derived from many rows, recompute the affected keys from their full
history — the same "state must not go backwards" guard as in "Upserts with MERGE and INSERT ... ON CONFLICT". If you
have no load timestamp, a lookback window (event_ts > max - 3 days) is the usual compromise, with unique_key making
the overlap harmless.

## Schema changes

A column added to an incremental model's SELECT does not reach the existing table by default
(on_schema_change='ignore'): dbt ran OK and the column was simply absent. With 'fail' the run stopped: "The source and
target schemas on this incremental model are out of sync!" naming status_code. With 'append_new_columns' the column
was added — NULL on every existing row. To fill history, run with --full-refresh, which rebuilds from scratch (make
sure the source still holds all of it).

## Microbatch

dbt 1.9 added a strategy that slices by time itself:

    {{ config(materialized='incremental', incremental_strategy='microbatch',
              event_time='event_ts', batch_size='day', begin='2026-10-25', lookback=1) }}

The first run built three daily batches (Batch 1 of 3 ... 2026-10-25); the next run rebuilt today and yesterday
(lookback=1); dbt run --event-time-start 2026-10-25 --event-time-end 2026-10-26 backfilled one day. Each batch
compiled to where event_ts >= '2026-10-25 00:00:00+00:00' and event_ts < '2026-10-26 ...'. Upstream models need
event_time configured for that filter to be applied. A late event older than the lookback is still missed.

## Snapshots: Type 2 history, generated

"Slowly Changing Dimensions" wrote the close-and-insert Type 2 load by hand. A dbt snapshot generates it. dbt 1.9+
declares snapshots in YAML:

    snapshots:
      - name: restaurants_snapshot
        relation: source('raw', 'restaurants')
        config:
          schema: snapshots
          unique_key: restaurant_id
          strategy: timestamp
          updated_at: updated_at
          hard_deletes: invalidate

dbt snapshot adds dbt_scd_id, dbt_updated_at, dbt_valid_from and dbt_valid_to. The worked example runs it through a
change. Run snapshots on raw or staging data, before any logic: history you did not capture cannot be rebuilt.`,
    workedExample: `**Scenario.** KhaanaKart pays restaurants a commission that changes when they renegotiate. Finance needs the rate in
force when each order was placed, but raw.restaurants only holds today's row. Capture history with a snapshot.

**1. First snapshot (all restaurants at their 1 September values).**

    dbt snapshot
    2 of 2 OK snapshotted analytics_snapshots.restaurants_snapshot

Note the schema: analytics_snapshots, not snapshots. The custom schema goes through generate_schema_name, which by
default prefixes the target schema.

**2. Changes at the source.** R102 renegotiates 22% to 19% (updated_at 20 October); R104 moves to Navi Mumbai
(22 October); R105 leaves the platform and disappears from the extract.

**3. Second snapshot.**

    restaurant_id  city         commission_pct  dbt_valid_from       dbt_valid_to
    R102           Mumbai       22              2026-09-01 10:00:00  2026-10-20 09:00:00
    R102           Mumbai       19              2026-10-20 09:00:00  NaT
    R104           Mumbai       15              2026-09-01 10:00:00  2026-10-22 11:30:00
    R104           Navi Mumbai  15              2026-10-22 11:30:00  NaT
    R105           Pune         25              2026-09-01 10:00:00  2026-10-27 20:10:54

With strategy timestamp, valid_from comes from the source's updated_at — when the change happened. R105 was closed at
snapshot time because hard_deletes: invalidate; with the default (ignore) it would stay current for ever. A third
run with no changes left the row count at 7: snapshots are idempotent.

**4. The check strategy, for sources with no reliable updated_at.** check_cols: ['city', 'commission_pct'] on
stg_restaurants produced the same versions, but every dbt_valid_from was the snapshot's run time (20:10:54), not
20 October. Run it once a day and that is the precision you get.

**5. Current rows and the far-future date.** By default the current version has dbt_valid_to NULL. A separate
snapshot with dbt_valid_to_current: "cast('9999-12-31' as timestamp)" wrote 9999-12-31 instead, which suits the
half-open range join from "Slowly Changing Dimensions".

**6. Use it.** Join facts on the key and the time range. Joining on restaurant_id alone gave KK-5002 two rows — the
fan-out the modelling topic warned about. Build dim_restaurant from the snapshot (dbt_scd_id is a ready surrogate
key) rather than letting marts read the snapshot directly.

**Result.** History accumulates from the day the snapshot is added, so add it early.`,
    mcqs: [
      mcq('An incremental model filters where event_ts > (select max(event_ts) from {{ this }}). A rider\'s phone uploads a 08:30 event after 09:00 events were loaded. What happens?', [
        ['The 08:30 event is never picked up by any later run', true],
        ['The 08:30 event is picked up but placed after 09:00', false],
        ['dbt detects the gap and re-runs the model in full', false],
        ['The run fails with a unique_key violation error', false],
      ], 'Its event time is below the stored maximum, so the filter excludes it on every future run; filter on load time instead. dbt applies the WHERE you wrote, does no gap detection, and a filtered-out row cannot violate a key.'),
      mcq('KhaanaKart adds a column to an incremental model and runs dbt with the default on_schema_change. What happens to the table?', [
        ['The run succeeds and the new column is not added', true],
        ['The run fails, naming the column that is missing', false],
        ['The column is added and filled for every old row', false],
        ['dbt rebuilds the whole table to add the column', false],
      ], 'The default is ignore: dbt inserts only the existing columns and says nothing. fail stops the run, append_new_columns adds the column with NULLs for old rows, and only --full-refresh rebuilds and backfills.'),
      mcq('A restaurants source has no trustworthy updated_at column. Which snapshot strategy fits, and what is its cost?', [
        ['check on chosen columns; valid_from becomes the snapshot run time', true],
        ['timestamp on _loaded_at; changes are dated by the source system', false],
        ['check on all columns; dbt rebuilds the history from the raw data', false],
        ['timestamp on now(); every run creates a new version of each row', false],
      ], 'check compares column values between runs, so it works without updated_at, but a change is dated when the snapshot noticed it. A load time is not a business change time, no strategy can rebuild history that was never captured, and a timestamp that always changes would version every row every run.'),
    ],
    checkpoint: [
      mcq('In an incremental model, when is is_incremental() true?', [
        ['When the table already exists and --full-refresh was not given', true],
        ['On every run of a model configured as materialized=\'incremental\'', false],
        ['Only when the source has rows newer than the target\'s maximum', false],
        ['Only on the first run, while the target table is being created', false],
      ], 'It is false on the first build and on --full-refresh, so the model then selects everything. It does not look at the data, and the first run is exactly when it is false.'),
      mcq('order_status keeps one row per order with its latest status. A new batch contains an old resent event for an order already delivered. Which incremental logic keeps the order delivered?', [
        ['Recompute each touched order from all its events, then replace it', true],
        ['Rank only the new batch per order, then merge on the order_id key', false],
        ['Append the batch, and let dashboards pick the latest row per order', false],
        ['Filter the batch to events newer than the latest event in the table', false],
      ], 'Recomputing touched keys from full history means a resent or late event cannot win over a newer one. Ranking only the batch regressed KK-6001 to picked_up, appending pushes the problem to every reader, and an event-time filter drops late events altogether.'),
      mcq('A dbt snapshot uses strategy timestamp with updated_at. Where does dbt_valid_from for a new version come from?', [
        ['The source row\'s updated_at value', true],
        ['The time the snapshot command ran', false],
        ['The first time the row was loaded', false],
        ['The dbt_scd_id hash of the row', false],
      ], 'The timestamp strategy dates versions by the source\'s updated_at, so R102\'s new rate was valid from 20 October. The check strategy uses run time, load time is not used, and dbt_scd_id is an identifier, not a date.'),
    ],
  },

  /* ── DBT_PROJECT_PRACTICE ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_DBT_PROJECT_PRACTICE',
    notes: `One engineer can keep a dbt project in their head. Eight engineers and three analysts committing to it every day
need conventions, review and automated checks, or the project becomes the folder of scripts it replaced.

## Layers and names

The layout dbt Labs recommends, and most teams in India's product companies and GCCs follow:

    models/
      staging/<source>/     stg_<source>__<entity>.sql   one per source table, views
      intermediate/         int_<entity>_<verb>.sql      joins, dedup, business rules
      marts/<area>/         fct_<process>.sql, dim_<entity>.sql   tables for consumers

Rules that keep it clean:

- **Only staging reads source().** Everything else reads ref(). Swap a source and only one model changes.
- **Staging renames, casts and standardises; nothing else.** No joins, no aggregation (the same rule as in "SQL as
  a Pipeline Language").
- **Marts declare a grain** in their description, and a test proves it (unique on the key, or dbt_utils'
  unique_combination_of_columns).
- **Configure by folder** in dbt_project.yml (+materialized: view for staging, table for marts), and per model only
  for exceptions.
- **One YAML file per folder** (_staging.yml, _marts.yml) with descriptions and tests next to the models.

## Macros and Jinja, in moderation

dbt runs every model through Jinja before sending it to the warehouse. A macro is a reusable SQL snippet:

    {% macro paise_to_rupees(column_name, scale=2) -%}
        round({{ column_name }} / 100.0, {{ scale }})
    {%- endmacro %}

    {{ paise_to_rupees("coalesce(sum(f.amount_paise) filter (where f.status = 'delivered'), 0)") }} as gmv_rupees

compiled to round(coalesce(sum(...), 0) / 100.0, 2) as gmv_rupees. That is a good macro: one rule (how KhaanaKart
converts money), used everywhere. The bad ones generate whole models from loops and if-statements nobody can read
without compiling. Rule of thumb: if a reviewer must run dbt compile to understand a model, use less Jinja.

Jinja runs before SQL, everywhere in the file — including inside SQL comments. A ref written in a -- comment still
created a dependency, and dbt refused to run: Found a cycle: model.khaanakart.int_orders_paid --> ...fct_orders -->
...stg_cycle_demo. Comment Jinja out with {# ... #}.

## Packages

packages.yml pulls in other people's macros and tests; dbt deps installs them into dbt_packages/:

    packages:
      - package: dbt-labs/dbt_utils
        version: [">=1.3.0", "<2.0.0"]

dbt_utils (generate_surrogate_key, unique_combination_of_columns, date_spine) is in almost every project;
dbt_expectations adds Great-Expectations-style tests; codegen writes YAML boilerplate. From the documentation: dbt
deps could not reach hub.getdbt.com from the lab machine (a certificate error), so no package was run here. Pin
version ranges, commit package-lock.yml, and read a package's macros before trusting them.

## Contracts: a promise to consumers

A mart that a finance tool reads should not change shape by accident. An enforced contract makes dbt check the
model's columns and types before building it:

    - name: mart_restaurant_daily
      config:
        contract: {enforced: true}
      columns:
        - name: restaurant_id
          data_type: varchar
          constraints: [{type: not_null}]
        - name: gmv_rupees
          data_type: integer
        ...

The run failed before creating anything:

    This model has an enforced contract that failed.
    | column_name | definition_type | contract_type | mismatch_reason    |
    | gmv_rupees  | DOUBLE          | INTEGER       | data type mismatch |

Correcting the contract to double, it built. Contracts, versions and access (public or private models, groups) are
how larger teams share models across domains; versions and access are described from the documentation.

## Environments

profiles.yml holds one target per environment; the same code builds into different schemas:

    dev     schema dbt_<yourname>   your laptop
    ci      schema ci_pr_<number>   one per pull request, dropped afterwards
    prod    schema analytics        the scheduled job only

dbt run --target ci selects one. Credentials come from environment variables
(password: "{{ env_var('DBT_PASSWORD') }}"), never from Git.

## CI: build only what changed, against production

A full build on every pull request is slow on a real project. Slim CI compares the project with production's
manifest.json and builds only modified models and their descendants, reading everything else from production:

    dbt build --select state:modified+ --defer --state prod_artifacts/ --target ci

KhaanaKart changed one line of stg_payments. dbt ls --select state:modified+ listed stg_payments, int_orders_paid,
fct_orders, mart_restaurant_daily and their tests; the CI build ran 11 nodes, PASS=11, into ci_pr_142. The compiled
fct_orders read "ci_pr_142"."stg_payments" but "analytics"."stg_orders" — the unchanged model was deferred to
production instead of being rebuilt.

A GitHub Actions job runs this on each pull request (download the production manifest, dbt deps, the build,
SQLFluff for style); written from the documentation, not run here. In dbt Cloud, CI jobs do the same with a
setting. Production then runs dbt source freshness and dbt build on a schedule from the orchestrator, and saves its
manifest for the next pull request.`,
    workedExample: `**Scenario.** KhaanaKart's project grew to 140 models in a year. Reviews take days, a pull request last month broke
the finance export, and every CI run rebuilds everything in 25 minutes. Propose the changes, in order.

**1. Fix the layout.** Move models into staging/<source>/, intermediate/ and marts/<area>/. Rename to
stg_<source>__<entity>; the double underscore separates source from entity (stg_payu__payments). Set
materialisations per folder.

**2. Make every source enter once.** grep the models for source( outside staging; each hit becomes a staging model
or a ref. After this, swapping the payment gateway touches one folder.

**3. Protect what other teams read.** The finance export reads mart_restaurant_daily. Give it an enforced contract
and a grain test. Last month's break — a column silently changing type — now fails CI with the contract table shown
in the notes.

**4. Turn on Slim CI.** The production job uploads target/manifest.json after each successful run. The pull-request
job downloads it and runs:

    dbt build --select state:modified+ --defer --state prod_artifacts/ --target ci

In the lab, a one-line change to stg_payments built 11 nodes instead of the whole project, with unchanged parents
read from production.

**5. Write the rules down.** A short CONTRIBUTING.md: naming, "only staging reads sources", every model has a
description and a primary-key test, macros for business rules only, no hard-coded schemas. Add a CI check that
fails a model with no description or key test (a small Python script over manifest.json does it).

**6. Measure.** Time from pull request to merge, CI duration, and failed production runs per week, before and after.
Report the CI figure honestly: Slim CI's saving depends on how much of the DAG a typical change touches; a change
to a widely used staging model still rebuilds a lot.

**Result.** The project scales with the team: conventions make models findable, contracts protect consumers, and CI
builds what a change can affect.`,
    mcqs: [
      mcq('Which rule keeps a dbt project easy to change when KhaanaKart switches payment gateway?', [
        ['Only staging models call source(); all others use ref()', true],
        ['Every model calls source() directly for freshest data', false],
        ['Marts read raw tables, so staging can be skipped later', false],
        ['Intermediate models must be materialised as tables', false],
      ], 'If only staging touches sources, a new gateway means rewriting one staging folder while every downstream ref stays valid. Calling sources everywhere spreads the change across the project, marts on raw tables duplicate cleaning, and materialisation has nothing to do with it.'),
      mcq('A CI job runs dbt build --select state:modified+ --defer --state prod_artifacts/. A pull request changes only stg_payments. How does fct_orders get stg_orders?', [
        ['It reads production\'s stg_orders, because unchanged parents are deferred', true],
        ['CI rebuilds stg_orders first, since every parent of a model is selected', false],
        ['The build fails, because stg_orders does not exist in the CI schema', false],
        ['It reads an empty stg_orders that dbt creates in the CI schema first', false],
      ], '--defer resolves refs to unselected models using the production manifest, so the compiled SQL read "analytics"."stg_orders". state:modified+ selects descendants, not parents; without --defer the missing relation would be the problem.'),
      mcq('A model has a ref inside a -- SQL comment, and dbt reports "Found a cycle". Why?', [
        ['Jinja renders before SQL, so the commented ref still adds a graph edge', true],
        ['dbt reads comments as hints and builds the referenced model first', false],
        ['The warehouse executed the comment and tried to create the table', false],
        ['dbt treats a ref in a comment as a source() and loops on the source', false],
      ], 'Jinja does not know SQL comment syntax, so the ref is evaluated and recorded as a dependency; use a Jinja comment {# #}. dbt has no comment hints, the warehouse never sees the problem because parsing fails first, and ref is not turned into source.'),
    ],
    checkpoint: [
      mcq('Which naming follows the dbt Labs conventions for a staging model of the Razorpay payments table?', [
        ['stg_razorpay__payments', true],
        ['payments_razorpay_stage', false],
        ['fct_razorpay_payments', false],
        ['raw_razorpay_payments_v', false],
      ], 'Staging models are stg_<source>__<entity>, with a double underscore between source and entity. fct_ is for marts at a process grain, and the others hide the layer or the source.'),
      mcq('A mart read by the finance team must never change its columns or types by accident. What does dbt offer for this?', [
        ['An enforced model contract checked before the model is built', true],
        ['An ephemeral materialisation so that the mart cannot be queried', false],
        ['A snapshot of the mart taken after every single production run', false],
        ['A seed file listing the mart\'s columns for the finance team', false],
      ], 'With contract enforced, dbt compares the model\'s columns and types with the YAML and fails before building, as the gmv_rupees mismatch showed. Ephemeral models cannot be read at all, snapshots record history after the fact, and a seed is data, not a check.'),
      mcq('Where should dbt\'s production warehouse password live?', [
        ['In an environment variable read with env_var() in profiles.yml', true],
        ['In dbt_project.yml, so every environment shares one password', false],
        ['In a macro that returns it, so models can call it when needed', false],
        ['In profiles.yml committed to Git, so CI can always find it', false],
      ], 'profiles.yml can read secrets from the environment, and the CI system or orchestrator injects them. dbt_project.yml, macros and committed files all end up in Git and in every clone.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_DEBUGGING',
    notes: `Seven things that went wrong in KhaanaKart's dbt project, each reproduced with dbt-core 1.12.6 and dbt-duckdb
1.11.1. For each: the symptom, the cause, and the one change that fixes it. Read the message and the compiled SQL in
target/ before changing anything.

## 1. A model that refers to a model that does not exist

**Symptom.** dbt parse (or any command) stops at once:

    Compilation Error
      Model 'model.khaanakart.int_orders_paid' (models\\intermediate\\int_orders_paid.sql)
      depends on a node named 'stg_order' which was not found

**Cause.** A typo in ref('stg_order'). dbt resolves every ref while parsing, before anything runs.

**Fix.** ref('stg_orders'). Run dbt parse locally before pushing; it takes seconds and catches this class of error.

## 2. "Found a cycle" from a comment

**Symptom.** After an engineer left a note, dbt ls failed:

    Found a cycle: model.khaanakart.int_orders_paid --> model.khaanakart.fct_orders
                   --> model.khaanakart.stg_cycle_demo

**Cause.** The note was -- see {{ ref('stg_cycle_demo') }}. Jinja renders before SQL and ignores SQL comments, so the
ref created a real edge, and stg_cycle_demo itself read fct_orders.

**Fix.** Write Jinja comments as {# ... #}, and never let a staging model read a mart.

## 3. A unit test that cannot find its input

**Symptom.** dbt build:

    ERROR fct_orders::order_date_uses_ist_boundary
    Not able to get columns for unit test 'int_orders_paid' from relation
    "khaanakart"."analytics"."int_orders_paid" because the relation doesn't exist

and fct_orders, its tests and the mart were skipped.

**Cause.** int_orders_paid is ephemeral; there is no table for dbt to read the column types from when it builds the
fixture.

**Fix.** Give that input as SQL: format: sql with rows: | select 'A' as order_id, ... listing every column with its
type. The unit test then passed (13 of 19 PASS fct_orders::order_date_uses_ist_boundary).

## 4. The folder selector that selects nothing

**Symptom.** dbt run --select events printed: The selection criterion 'events' does not match any enabled nodes ...
Nothing to do.

**Cause.** A bare word is matched against model names. The models live in models/marts/events/.

**Fix.** --select marts.events (dotted path from models/) or --select path:models/marts/events. Check any selector
with dbt ls --select ... before running it in a job.

## 5. The snapshot that "is not there"

**Symptom.** dbt snapshot reported OK, but select * from snapshots.restaurants_snapshot failed: schema "snapshots"
does not exist.

**Cause.** The run log said it: OK snapshotted analytics_snapshots.restaurants_snapshot. A custom schema goes through
generate_schema_name, which by default joins the target schema and the custom one.

**Fix.** Query analytics_snapshots, or override generate_schema_name in macros/ so production uses the custom schema
as written. Read the relation name in the log before assuming one.

## 6. A new column that never arrives

**Symptom.** status_code was added to fct_order_events; dbt run said OK; the column is not in the table.

**Cause.** Incremental models default to on_schema_change='ignore'.

**Fix.** Decide deliberately. 'append_new_columns' added the column but left it NULL on all nine existing rows;
--full-refresh rebuilds and fills it; 'fail' turns the silent case into an error: "The source and target schemas on
this incremental model are out of sync!" naming the new column.

## 7. Delivered orders shown as picked up

**Symptom.** After a run, KK-6001 shows picked_up although it was delivered at 08:41.

**Cause.** The incremental model selected new rows by load time correctly, but ranked only the new batch and
replaced the order's row with the batch's winner — a resent 08:20 event.

**Fix.** Find the touched orders in the new load, then recompute those orders from all their events (lesson 3).
After the change, KK-6001 stayed delivered and the late KK-6002 pickup was picked up.

## The habit

Each fix was found by reading one line — the error, the relation name in the log, or the compiled SQL in
target/compiled/ and target/run/. When dbt surprises you, open the compiled SQL first.`,
    mcqs: [
      mcq('dbt reports "depends on a node named \'stg_order\' which was not found". When does this error appear?', [
        ['While parsing, before any model runs', true],
        ['Only after the upstream model fails', false],
        ['When the warehouse runs the SELECT', false],
        ['At the end, when tests are executed', false],
      ], 'Every ref is resolved when dbt builds the graph during parsing, so nothing runs. It is not caused by an upstream failure, the warehouse never sees the query, and tests come much later.'),
      mcq('A unit test on fct_orders fails with "Not able to get columns for unit test \'int_orders_paid\'". int_orders_paid is ephemeral. What fixes it?', [
        ['Provide that input with format: sql, selecting every column with its type', true],
        ['Materialise fct_orders as a view so the unit test can read it directly', false],
        ['Run dbt build twice so int_orders_paid exists for the second attempt', false],
        ['Delete the unit test and replace it with a not_null test on the date', false],
      ], 'Ephemeral models have no relation to read column types from, so the fixture must define them itself. fct_orders\' materialisation is not the issue, an ephemeral model never exists however often you run, and a not_null test cannot check the date logic.'),
      mcq('dbt snapshot logs "OK snapshotted analytics_snapshots.restaurants_snapshot" though the config says schema: snapshots. Why?', [
        ['generate_schema_name prefixes the custom schema with the target schema', true],
        ['dbt could not create the snapshots schema and fell back without saying', false],
        ['Snapshots always go to the target schema and ignore the schema config', false],
        ['DuckDB does not allow a schema named snapshots, so dbt renamed it', false],
      ], 'By default dbt builds <target_schema>_<custom_schema> so developers do not overwrite each other; override generate_schema_name to change it. There was no failure, the config was honoured through that macro, and the name is not reserved.'),
      mcq('An incremental model gets a new column; dbt run says OK but the column is missing from the table. Which setting turns this into a visible error?', [
        ['on_schema_change=\'fail\'', true],
        ['incremental_strategy=\'merge\'', false],
        ['full_refresh=false', false],
        ['unique_key=\'event_id\'', false],
      ], 'With fail, dbt stops with "source and target schemas ... are out of sync" and names the column. The strategy and unique key do not change schema handling, and full_refresh=false only blocks full rebuilds.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_PRACTICE',
    notes: `Eight exercises, easiest first. Write each answer before reading ours. Answers 3, 5 and 6 were run on the topic's
KhaanaKart project (dbt-core 1.12.6, dbt-duckdb 1.11.1).

## 1. Which materialisation? (easy)

Choose view, table, ephemeral or incremental: (a) stg_payments, a rename-and-cast over a small table; (b)
fct_order_events, 40 million rows a month, append-only; (c) a five-line helper that deduplicates refunds, used by
one mart; (d) mart_restaurant_daily, read by a dashboard 200 times a day.

**Answer.** (a) view; (b) incremental; (c) ephemeral; (d) table (or incremental if it grows large).

## 2. Write the source and the staging model (easy)

raw.riders has rider_id, NAME (text with spaces), city, joined_on as text 'YYYY-MM-DD'. Declare the source and write
stg_riders.

**Answer.**

    sources:
      - name: raw
        schema: raw
        tables:
          - name: riders

    select rider_id,
           trim(NAME)              as rider_name,
           lower(trim(city))       as city,
           cast(joined_on as date) as joined_on
    from {{ source('raw', 'riders') }}

## 3. Tests for a grain (easy)

fct_orders has one row per order. Which tests prove the grain and the key fields?

**Answer.** unique and not_null on order_id; not_null on order_date_ist; relationships from restaurant_id to the
restaurants model (severity warn if restaurants arrive late, as KhaanaKart's do). The build ran them as
unique_fct_orders_order_id, not_null_fct_orders_order_id and not_null_fct_orders_order_date_ist, all PASS.

## 4. Read the selector (medium)

What does each select? (a) +fct_orders; (b) fct_orders+; (c) +fct_orders+; (d) marts.events; (e)
state:modified+.

**Answer.** (a) fct_orders and all its ancestors; (b) fct_orders and all its descendants; (c) both directions; (d)
every model under models/marts/events/; (e) models changed compared with the --state manifest, plus their
descendants.

## 5. Predict the append (medium)

events_append_nofilter is incremental with incremental_strategy='append' and no is_incremental() block. The source
has 9 events. After a full refresh and two normal runs, how many rows, and how many distinct event_ids?

**Answer.** 27 rows, 9 distinct events: each run appends the whole source again. The run printed 9/9, then 18/9, then
27/9. Add the is_incremental() filter, or switch to delete+insert with unique_key='event_id'.

## 6. Late events (medium)

Batch 1 is loaded at 12:28 with events up to 09:00. Batch 2 is loaded at 14:34 with KK-6002 picked_up at 08:30. For
the filter where event_ts > (select max(status_at) from {{ this }}), what is KK-6002's status afterwards, and what
should the filter be?

**Answer.** Still placed: 08:30 is not after 09:00, so the event is never selected. Filter on arrival:
_loaded_at > (select max(loaded_through) from {{ this }}), and recompute the touched orders from all their events.
The corrected model showed KK-6002 picked_up at 08:30.

## 7. Choose a snapshot strategy (medium)

(a) raw.restaurants has a reliable updated_at set by the app. (b) A partner's daily CSV of restaurant ratings has no
timestamp. Strategy for each, and what valid_from will mean?

**Answer.** (a) timestamp on updated_at; valid_from is when the change happened. (b) check with check_cols:
['rating']; valid_from is when the snapshot run noticed the change, so daily precision at best.

## 8. Design the CI step (harder)

KhaanaKart's project has 140 models; full builds take 25 minutes. Write the pull-request command and say what the
production job must do for it to work.

**Answer.**

    dbt build --select state:modified+ --defer --state prod_artifacts/ --target ci

The production job must save its target/manifest.json after each successful run where CI can fetch it. --defer makes
unchanged parents resolve to production relations, so CI builds only what changed and what depends on it. Drop the
ci_pr_<n> schema after merging.`,
    mcqs: [
      mcq('A five-line helper that deduplicates refunds is used by one mart only and is never queried directly. Which materialisation fits?', [
        ['ephemeral', true],
        ['incremental', false],
        ['table', false],
        ['view', false],
      ], 'Ephemeral inlines it as a CTE, so no extra object exists in the warehouse. A table or view adds an object nobody reads, and incremental is for large append-heavy data.'),
      mcq('Which selector builds fct_orders together with all of its ancestors and all of its descendants?', [
        ['+fct_orders+', true],
        ['fct_orders+', false],
        ['+fct_orders', false],
        ['@fct_orders', false],
      ], 'A + on each side selects both directions. A trailing + gives descendants only, a leading + ancestors only, and @ selects descendants plus the ancestors of those descendants, which is wider than asked.'),
      mcq('An incremental append model with no is_incremental() filter has run three times over a 9-event source. How many rows does it hold?', [
        ['27, with 9 distinct event_ids', true],
        ['9, as dbt removes duplicates', false],
        ['18, as the first run is skipped', false],
        ['The run fails on the second load', false],
      ], 'Each run inserts the whole source again: 9, 18, 27. append never deduplicates, the first run builds the table rather than being skipped, and nothing errors without a unique test.'),
      mcq('A partner sends a daily ratings CSV with no timestamp column. Which snapshot configuration records rating changes?', [
        ['strategy: check with check_cols: [\'rating\']', true],
        ['strategy: timestamp with updated_at: rating', false],
        ['strategy: check with unique_key omitted', false],
        ['strategy: timestamp with updated_at: now()', false],
      ], 'check compares the chosen columns between runs, which is all you can do without a timestamp. A rating is not a timestamp, unique_key is always required, and now() would change every run and version every row.'),
      mcq('For Slim CI, what must the production job provide?', [
        ['Its target/manifest.json from the last successful run', true],
        ['A copy of every production table in the CI schema', false],
        ['The compiled SQL of every model as a separate file', false],
        ['A list of the models that changed in the pull request', false],
      ], 'state:modified compares the project with production\'s manifest, and --defer uses it to resolve unchanged parents. Copying tables defeats the purpose, compiled SQL is not what dbt compares, and dbt computes the changed models itself.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_INTERVIEW_QUESTION',
    notes: `Asked in analytics engineer and data engineer interviews at product companies, GCCs and fintechs in Bengaluru,
Hyderabad and Pune, often after you mention dbt on your CV. Say each answer aloud in about two minutes, then compare.
Interviewers listen for whether you know what dbt does under the hood, not only the commands.

## Q1. "What problem does dbt solve? Why not just schedule SQL scripts?"

**Model answer.** "dbt turns SQL transformations into a project. I write SELECTs; dbt wraps them in the right DDL,
works out the run order from ref and source, and runs them in the warehouse — so it is ELT, the compute is the
warehouse's. On top it gives tests that run after each model and stop downstream models on failure, documentation
and a lineage graph from the same references, environments so dev, CI and prod build into different schemas, and
incremental models and snapshots for large or historical data. With plain scripts, run order, testing and
environments are all manual, and they break as the team grows. dbt does not extract, load or schedule — that is an
EL tool and Airflow or similar."

**Follow-up.** "What does ref actually do?" — "At compile time it becomes the fully qualified relation for the
current target, and it records an edge in the DAG. That edge gives the run order, the lineage graph, selectors like
model+, and deferral in CI. Hard-coding a table name loses all of that."

## Q2. "How does an incremental model work, and how do you handle late-arriving data?"

**Model answer.** "First run, is_incremental() is false and it builds everything. Later runs filter to new rows
using {{ this }}, the existing table, and write them with a strategy — append, delete+insert, merge, or microbatch —
using unique_key to replace changed rows. Late data is the trap: if I filter on event time greater than the max
event time in the target, a late event is never picked up. So I filter on load time, or use a lookback window with
the unique key making the overlap safe. And if the model is a derived state, like latest status per order, I
recompute the touched keys from their full history, otherwise a resent old event can overwrite a newer state — I
reproduced exactly that on a lab project."

**Follow-up.** "When would you not use incremental?" — "When the table is small enough to rebuild quickly. A table
is simpler and always correct; incremental is an optimisation with real bug risk, so I only use it when the full
build is too slow or too expensive, and I keep --full-refresh possible."

## Q3. "What tests do you put on a dbt model?"

**Model answer.** "On every model, unique and not_null on the primary key — that proves the grain. accepted_values on
status-like columns and relationships on foreign keys, with severity warn where a known lag makes them fail
transiently. Singular tests for business rules, such as a delivered order's payments equalling its amount. Unit
tests for tricky logic like timezone boundaries, run in CI only. Source freshness before the build, so I do not
publish yesterday's data as today's. And for marts other teams consume, an enforced contract. When a test fails I
read the compiled SQL, find the rows, and decide with the data owner whether the data or the expectation is wrong."

**Follow-up.** "A test fails every morning and people ignore it. What do you do?" — "That is worse than no test.
Either fix the cause, change the severity with a clear owner for the warning, or set warn_if / error_if thresholds
that match reality. Ignored red builds train everyone to ignore real failures."

## Q4. "Explain dbt snapshots. How do they relate to SCD Type 2?"

**Model answer.** "A snapshot records how mutable source rows change over time — it generates the Type 2 table: each
version with dbt_valid_from and dbt_valid_to, and the current row with a NULL valid_to unless I set
dbt_valid_to_current. The timestamp strategy uses the source's updated_at, so versions are dated when the change
happened; the check strategy compares chosen columns and dates changes by snapshot run time. hard_deletes decides
whether deleted source rows are closed. I snapshot raw or staging data early, because history not captured cannot
be recreated, and build the dimension from the snapshot, joining facts on the key and the validity range."

**Follow-up.** "Two changes to a row happen between snapshot runs. What do you get?" — "Only the state at run time;
the intermediate version is lost. If that matters, capture changes from the source with CDC instead."`,
    mcqs: [
      mcq('An interviewer asks what ref() does beyond resolving a table name. Which answer is strongest?', [
        ['It records an edge in the DAG, driving run order, lineage and CI deferral', true],
        ['It caches the referenced model\'s results so that later queries are faster', false],
        ['It makes dbt copy the referenced table into the schema of the current model', false],
        ['It checks that the referenced model passed its tests during the last run', false],
      ], 'The dependency edge is what gives dbt its ordering, selectors, lineage and deferral. ref does no caching or copying, and test results are not consulted when ref compiles.'),
      mcq('Asked how to handle late-arriving events in an incremental model, which answer would an interviewer rate highest?', [
        ['Select new rows by load time or a lookback window, and recompute affected keys', true],
        ['Filter on the event time, then run a weekly full refresh to catch what was missed', false],
        ['Use the append strategy, since appending can never lose any of the late events', false],
        ['Increase the schedule to every five minutes, so events are rarely ever late', false],
      ], 'Selecting by arrival catches late rows and recomputing keys keeps state correct. A weekly refresh leaves a week of wrong numbers, append duplicates rather than fixes, and late data comes from sources such as offline phones, not from your schedule.'),
      mcq('A candidate is asked what a dbt snapshot records when a row changes twice between runs. What is accurate?', [
        ['Only the state at the snapshot run; the middle version is lost', true],
        ['Both versions, since dbt reads the database\'s change log first', false],
        ['Neither version, since snapshots skip rows changed more than once', false],
        ['Both versions, provided the strategy is check rather than timestamp', false],
      ], 'Snapshots compare the current source with the last captured state, so intermediate states are never seen; CDC is the answer when they matter. dbt reads no change log, and neither strategy can see a state that no longer exists.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DBT_CHECKPOINT',
    notes: `Ten questions across the topic: ELT and dbt projects, tests and documentation, incremental models and snapshots,
and running a project with a team. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('Why did transformation move from separate ETL servers into the warehouse (ELT)?', [
        ['Cloud warehouses run SQL on large data cheaply and keep raw data for replay', true],
        ['Warehouses cannot store raw data, so it has to be transformed before loading', false],
        ['ETL servers cannot run SQL, so transformations had to be rewritten in Python', false],
        ['ELT removes the need to test data, since the warehouse validates every row', false],
      ], 'Scalable, columnar warehouses made it practical to load raw data first and transform it with SQL where it lives. Warehouses store raw data happily, ETL tools often run SQL, and ELT needs tests as much as ETL does.'),
      mcq('A dbt model refers to another as analytics.stg_orders rather than through ref(). What breaks in CI?', [
        ['CI reads production\'s stg_orders, not the one built in the pull request', true],
        ['CI refuses to compile, as dbt rejects any hard-coded relation names', false],
        ['CI builds stg_orders twice, once for the name and once for the ref', false],
        ['Nothing breaks, since dbt rewrites the name to ref() while it parses', false],
      ], 'A hard-coded name always points at the production schema and adds no DAG edge, so CI tests a mix of new and old models. dbt compiles it without complaint, does not build anything twice, and never rewrites names.'),
      mcq('dbt build stops with an accepted_values failure on stg_orders.status. What happens to fct_orders, which is built from stg_orders?', [
        ['It is skipped, because a test on its parent failed', true],
        ['It builds, because tests run only after all models', false],
        ['It builds, but every row is flagged with a warning', false],
        ['It is dropped from the warehouse until fixed later', false],
      ], 'dbt build runs each model\'s tests straight after it and skips descendants when one fails, so wrong data does not flow on. dbt run then dbt test would build first; dbt never flags rows or drops existing tables on failure.'),
      mcq('A rule says every delivered order\'s successful payments must equal its amount. How is it best tested in dbt?', [
        ['A singular test in tests/ that selects the violating orders', true],
        ['A not_null test on paid_paise in the model\'s YAML file', false],
        ['An accepted_values test on the order\'s status column', false],
        ['A source freshness check on the raw payments table', false],
      ], 'A cross-column business rule is a SELECT of the rows that break it, which is a singular test. not_null and accepted_values check one column\'s values, and freshness checks loading, not correctness.'),
      mcq('Raw payments were last loaded nine hours ago, yet every dbt test passes. What would have flagged it?', [
        ['dbt source freshness with a loaded_at_field and limits', true],
        ['A unique test on payment_id in the staging model YAML', false],
        ['A unit test on stg_payments with a few fixed input rows', false],
        ['An enforced contract on the payments staging model', false],
      ], 'Freshness compares the newest load time with now, which is the only check that notices missing data. Tests on keys, unit tests and contracts all pass on stale but well-formed data.'),
      ck('DATA_MODELLING', 'An incremental model must catch events that arrive hours after they happened. Which filter selects them reliably?', [
        ['_loaded_at greater than the latest load time already processed', true],
        ['event_ts greater than the latest event_ts already in the table', false],
        ['event_ts greater than the current time minus one fixed minute', false],
        ['event_id greater than the largest event_id that is in the table', false],
      ], 'Arrival time grows even when event time does not, so late rows are selected. An event-time maximum skips late rows for ever, a one-minute window misses anything later, and ids are only safe if the source assigns them in arrival order, which offline devices break.'),
      ck('DATA_MODELLING', 'A team adds a column to a large incremental model and needs it filled for all historical rows. What should they run?', [
        ['dbt run --full-refresh for that model', true],
        ['dbt run with on_schema_change set to ignore', false],
        ['dbt run with append_new_columns, once only', false],
        ['dbt snapshot so history gets the column too', false],
      ], 'A full refresh rebuilds the table from the source, so every row gets the column (if the source still holds the history). ignore drops the column, append_new_columns adds it with NULLs for old rows, and a snapshot does not rebuild a model.'),
      ck('DATA_MODELLING', 'A restaurant leaves KhaanaKart and vanishes from the source. Which snapshot setting closes its current version?', [
        ['hard_deletes: invalidate', true],
        ['strategy: check', false],
        ['hard_deletes: ignore', false],
        ['unique_key: restaurant_id', false],
      ], 'invalidate sets dbt_valid_to on rows missing from the source, as R105\'s was. ignore (the default) leaves the row current for ever, and the strategy and unique key do not change how deletions are handled.'),
      mcq('Why is a macro such as paise_to_rupees() a good use of Jinja in a dbt project?', [
        ['One business rule is written once and used by every model', true],
        ['Macros run faster than SQL, as dbt executes them in Python', false],
        ['Macros let each model skip its tests when the logic is shared', false],
        ['Macros hide the SQL, so reviewers need not read every model', false],
      ], 'A macro centralises a rule like money conversion, and it compiles to plain SQL. It does not execute in Python at query time, does not affect tests, and hiding SQL from reviewers is the misuse to avoid.'),
      mcq('In a team\'s CI, what does --defer add to dbt build --select state:modified+ --state prod_artifacts/?', [
        ['Unbuilt parents resolve to production relations', true],
        ['Failed tests are deferred to the next nightly run', false],
        ['Changed models are built later, after the merge', false],
        ['The build waits until production finishes running', false],
      ], 'Deferral points refs to unselected models at production, so only changed models and their descendants are built. It does not postpone tests, builds or timing.'),
    ],
  },
];
