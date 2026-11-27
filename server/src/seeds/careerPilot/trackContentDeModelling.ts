/**
 * Career-track content: Data Modelling (DE_DATA_MODELLING), Data Engineer, batch DE1.
 *
 * How a data engineer shapes analytical data: why the app's database is the wrong shape for analysis (OLTP versus
 * OLAP, row versus column storage), normalisation revisited and when to break it, Kimball dimensional modelling
 * (grain, facts, dimensions, surrogate keys, star versus snowflake), slowly changing dimensions with a correct
 * Type 2 load, and the modern options (one big table, data vault in outline, medallion layers). It builds on the
 * years' "Storing a Fact in Exactly One Place" and "Keys, and How Tables Point at Each Other" (T2_DB_DESIGN) and
 * the Data Analytics track's SQL (CTEs, window functions); those are referred to, not re-taught. MERGE syntax
 * belongs to DE_SQL_ENGINEERING and dbt snapshots to DE_DBT; this topic points forward to them.
 *
 * Lessons follow Bazaarly, a fictional Bengaluru e-commerce marketplace; the mini project is Swaadly, a fictional
 * Hyderabad food-delivery company. Every query output quoted in the notes is real output from DuckDB 2.0 run from
 * Python on synthetic data (star schema, fan-out and semi-additive traps, the Type 2 load and its re-run, the
 * point-in-time fact lookup, the medallion pipeline and the data-vault reassembly); the project's data generator
 * was run too. Timings quoted are from one laptop and are there to show an order of magnitude, nothing more.
 *
 * Skills: the topic declares DATA_MODELLING only, so every checkpoint question measures it.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DE_DATA_MODELLING_BUNDLES: PilotBundle[] = [
  /* ── OLTP_VS_OLAP ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_OLTP_VS_OLAP',
    notes: `Bazaarly is a fictional e-commerce marketplace in Bengaluru. Its app writes every order to PostgreSQL. Two weeks
before the festive sale, the category heads ask a simple question: "revenue by category and city for September,
excluding cancellations". A developer runs it on the production database at 11 a.m. and checkout slows down for
every customer. Nothing was wrong with the SQL. The database was built for a different job.

## Two jobs, two shapes

**OLTP (online transaction processing)** is the app's database: place an order, update its status, debit a wallet.
**OLAP (online analytical processing)** is the reporting side: read millions of rows and summarise them.

    Question             OLTP (the app)                         OLAP (analytics)
    Typical query        one order, by key                      all orders in a month, grouped
    Rows per query       a handful                              millions
    Writes               many small inserts and updates         bulk loads by a pipeline
    Shape                normalised: many narrow tables         denormalised: facts and dimensions
    History              current state, updated in place        history kept, rarely updated
    Storage              row store (PostgreSQL, MySQL)          column store (Redshift, BigQuery, Parquet)
    Users                the app, thousands of concurrent       analysts, dashboards, ML jobs

The two queries below ran in DuckDB on a synthetic copy of Bazaarly's OLTP tables: 200,000 orders and 400,000
order lines in five normalised tables (categories, products, customers, orders, order_items).

The app's question touches two rows:

    SELECT o.order_id, o.status, i.line_no, p.sku, i.qty
    FROM orders o JOIN order_items i USING (order_id) JOIN products p USING (product_id)
    WHERE o.order_id = 1042 ORDER BY line_no;

     order_id    status  line_no  sku  qty
         1042 DELIVERED        1 P156    3
         1042 DELIVERED        2   P2    2

The category heads' question reads every order line and joins four tables:

    SELECT c.name AS category, cu.city, round(sum(i.qty * p.list_price) / 1e5, 1) AS revenue_lakh
    FROM order_items i JOIN orders o USING (order_id) JOIN products p USING (product_id)
    JOIN categories c USING (category_id) JOIN customers cu USING (customer_id)
    WHERE o.status <> 'CANCELLED' GROUP BY ALL ORDER BY revenue_lakh DESC LIMIT 5;

    category      city  revenue_lakh
     Mobiles      Pune         673.1
     Mobiles Bengaluru         669.9
     Mobiles    Jaipur         668.7
       Books Hyderabad         668.6
     Mobiles Hyderabad         662.3

On a production PostgreSQL with years of orders, that second query scans the whole table, competes with checkout
for CPU, memory and disk, and can hold back vacuum while it runs. Indexes do not save it: an index helps you find
a few rows, and this query wants all of them.

## Row stores and column stores

A **row store** keeps each row's values together on disk: perfect for "fetch order 1042 and all its fields". A
**column store** keeps each column's values together: perfect for "sum qty grouped by city", which needs two
columns out of twelve. Column stores also compress well, because a column of city names repeats a few values
millions of times, and they keep minimum and maximum values per block so a filter can skip whole blocks.

The same 400,000 wide order lines (twelve columns) were written as CSV and as Parquet, a columnar file format:

    wide.csv 42.8 MB
    wide.parquet 17.1 MB
    wide.csv best of 3: 306 ms
    wide.parquet best of 3: 5 ms

and DuckDB's plan for "SELECT city, sum(qty) ... GROUP BY city" on the Parquet file shows it read only the two
columns it needed:

    Parquet Scan
      Projections: city, qty

The CSV has to be parsed end to end, every column of every row. The exact milliseconds depend on the laptop; the
gap does not. Redshift, BigQuery, Snowflake, Synapse and the Parquet files in a data lake are all column stores
for this reason. (You meet Parquet in depth in "Data Formats" in the next topic.)

## Why not just report from the app database?

- **Load.** Analytical scans compete with customers. A read replica moves the load but keeps the OLTP shape.
- **History.** OLTP keeps current state. When an order goes from SHIPPED to DELIVERED the old status is gone, and
  when a seller moves city the old city is overwritten; "sales by the seller's city at the time" is unanswerable.
- **Many sources.** Revenue questions need orders (PostgreSQL), payments (a gateway's API), ads spend (a CSV from
  marketing) and returns (another service). No single app database holds them.
- **Stability.** The app team renames a column in a release and every report breaks. An analytical model is a
  contract that changes on its own schedule.
- **Shape.** Five joins for every question is slow for people, not just machines, and every join is a chance to
  double-count.

## Where a data engineer sits

    sources (app DBs, APIs, files, events)
       -> ingestion (extract, land raw)
       -> storage (data lake on S3, warehouse such as Redshift)
       -> modelling (clean, conform, facts and dimensions)
       -> consumers (dashboards, analysts, ML features, reverse ETL back into apps)

The data engineer owns the middle three arrows: getting data out without hurting the source, storing it cheaply
with history, and modelling it so the consumers get the right answer quickly. On AWS that is typically S3 plus
Glue or EMR plus Redshift or Athena; on Azure it is ADLS Gen2 plus Data Factory or Synapse plus a Fabric or
Synapse warehouse. The modelling ideas in this topic do not change between them.

You already know the OLTP side: "Storing a Fact in Exactly One Place" in Year 2 taught normal forms for a
database that applications write to. The rest of this topic is the other side of the line.`,
    workedExample: `**Scenario.** Bazaarly's platform team lists six workloads and asks where each should run: the production
PostgreSQL, a read replica of it, or the analytics warehouse.

**1. "Show a customer their last ten orders" in the app.** OLTP. A key lookup on an indexed customer_id, a few rows,
must be fresh to the second. Production primary.

**2. "Is this UPI payment already captured?" before shipping.** OLTP, and it must read its own writes, so the
primary, not a replica that may lag by seconds.

**3. A support agent's screen showing one order's history.** OLTP-shaped, read-only, can tolerate a second of lag:
the read replica is fine and keeps load off the primary.

**4. Daily revenue by category, city and day for the last two years.** OLAP. Millions of rows, grouped, needs
history the app overwrites (status changes, seller moves). Warehouse, on a model built for it.

**5. A data scientist's training set: every order with the customer's past 90-day spend.** OLAP. Wide scans over
history; warehouse or lake. Running it on the replica would also lag the replica for the support screen.

**6. The finance team's month-end reconciliation of orders against payment-gateway settlements.** OLAP, and it
needs two sources (the app DB and the gateway's files). Only the warehouse has both.

**The pattern.** Ask three questions of any workload: how many rows does it touch, does it need history the app
overwrites, and does it need more than one source? "Few, no, no" is OLTP. Any "yes" on the last two, or "millions"
on the first, belongs on the analytical side — which is why the next lessons are about shaping it.`,
    mcqs: [
      mcq('Bazaarly runs "revenue by category for two years" on its production PostgreSQL and checkout slows down. A colleague suggests adding an index on order date. Why will that not fix it?', [
        ['The query reads nearly every row, so an index for finding a few rows does not help', true],
        ['PostgreSQL cannot use indexes on any timestamp column during a GROUP BY query', false],
        ['Indexes only help UPDATE statements, never a SELECT that aggregates its rows', false],
        ['Creating that index would lock the orders table for all two years of the stored data', false],
      ], 'An index pays off when a query selects a small fraction of rows; a two-year aggregate selects almost all of them, so the planner scans anyway. Timestamp indexes are usable in PostgreSQL, indexes mainly help reads rather than updates, and index creation time is not tied to the data\'s date range.'),
      mcq('A query sums one column of a 40-column table of 500 million rows stored as Parquet. Which property of a column store does most to make it fast?', [
        ['It reads only the column it needs and skips the other 39 on disk', true],
        ['It keeps each row together so a full row is read in one disk seek', false],
        ['It builds a B-tree index on every column automatically at load time', false],
        ['It holds the whole table in memory once the first query has run', false],
      ], 'Columnar storage lets the engine read one column\'s pages and ignore the rest, and that column compresses well. Keeping rows together is the row-store layout, Parquet has no B-tree indexes (it has min/max statistics per block), and nothing guarantees the table stays in memory.'),
      mcq('Bazaarly\'s finance team asks for sales by each seller\'s city at the time of the sale. The app\'s sellers table stores only the current city. What does this tell you?', [
        ['The app keeps current state, so the analytical side has to keep the history', true],
        ['The report should be run on a read replica, where older city values are kept', false],
        ['The sellers table needs a third normal form fix before the report can be run', false],
        ['The report can be rebuilt from the production database\'s nightly backups', false],
      ], 'OLTP overwrites attributes in place, so history must be captured as it changes, which is what slowly changing dimensions do. A replica mirrors current state, normalisation does not add history, and digging through old backups is not a reporting design.'),
    ],
    checkpoint: [
      mcq('Which workload at a fintech app belongs on the OLTP database rather than the warehouse?', [
        ['Checking a wallet balance before approving a UPI payment of Rs 500', true],
        ['Monthly count of failed payments by bank and by hour across two years', false],
        ['A churn model training set built from every user\'s 12-month activity', false],
        ['Reconciling daily settlements from the gateway against ledger entries', false],
      ], 'A balance check before a payment is a single-key read that must be current to the second: classic OLTP. The other three scan history, and reconciliation also needs a second source the app database does not hold.'),
      mcq('Bazaarly writes the same 400,000 order lines as CSV and as Parquet. Why does "sum qty by city" run far faster on the Parquet file?', [
        ['Parquet stores columns separately and compressed, so only two are read', true],
        ['Parquet stores rows sorted by city, so the grouping needs no hashing', false],
        ['CSV files cannot be read by DuckDB without first loading into a table', false],
        ['Parquet files carry a precomputed sum for every column in the footer', false],
      ], 'The Parquet scan projected just city and qty, and compression made those columns small; the CSV had to be parsed completely. Parquet is not sorted by any column unless you write it that way, DuckDB reads CSV directly, and the footer holds min/max statistics, not sums.'),
      mcq('The app team renames orders.status to orders.order_state in a release. Which design keeps the dashboards working?', [
        ['Dashboards read an analytical model whose contract the data team maintains', true],
        ['Dashboards query the production tables directly through a read replica', false],
        ['Every dashboard keeps its own copy of the column name inside its own SQL query', false],
        ['The app team is told never to rename a column in the database again', false],
      ], 'A modelled layer is a stable interface: the pipeline maps order_state to the model\'s status column and dashboards never notice. A replica has the renamed column too, copies of SQL break one by one, and freezing the app schema is not a realistic contract.'),
    ],
  },

  /* ── NORMALISATION_REVISITED ─────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_NORMALISATION_REVISITED',
    notes: `In Year 2's "Storing a Fact in Exactly One Place" you normalised tables for an application. This lesson asks the
engineer's question: what does normalisation protect, what does it cost, and on which side of the OLTP/OLAP line
is each trade worth making?

## What the normal forms protect, in one paragraph

**1NF**: one value per cell, no repeating groups ("phone1, phone2, phone3" becomes a child table). **2NF**: every
non-key column depends on the whole key, not part of it (in order_items keyed by order and line, the product name
depends only on the product, so it moves out). **3NF**: no non-key column depends on another non-key column
(seller_city depends on seller_id, not on the order). Each step removes a way for the same fact to be stored twice,
and therefore a way for two copies to disagree. BCNF tightens 3NF for tables with overlapping candidate keys; in
practice 3NF is the working target for an operational schema.

## The anomalies, shown

Bazaarly's sellers used to download a flat export: one row per order line, with product, category and seller
details repeated on every row. Annapurna Steels (seller S12) moved from Coimbatore to Tiruppur, and a script
updated only the rows for the order it was handling that day:

    UPDATE flat_lines SET seller_city = 'Tiruppur' WHERE seller_id = 'S12' AND order_id = 5003;

    SELECT seller_id, seller_name, list(DISTINCT seller_city ORDER BY seller_city) AS cities
    FROM flat_lines GROUP BY ALL ORDER BY seller_id;

    seller_id        seller_name                 cities
          S12   Annapurna Steels [Coimbatore, Tiruppur]
          S40 Weavers Collective               [Jaipur]

One seller, two cities. That is an **update anomaly**. The other two: an **insertion anomaly** (you cannot record a
new seller until they have an order line to hang the row on) and a **deletion anomaly** (delete the only order of
a seller and the seller's details disappear with it).

In the normalised design the city lives in one row of sellers, and the same change is one row:

    rows changed in normalised sellers: [(1,)]
    rows changed in flat table: [(4,)]

Four rows here; in a real flat table with a seller's whole history it would be thousands, and each is a chance for
a partial update. For a database that thousands of app requests write to concurrently, normalisation is not
optional.

## What normalisation costs

Every fact stored once means every question re-assembles facts with joins. On the synthetic Bazaarly data
(400,000 order lines), the category-by-city revenue query ran both ways in DuckDB, best of five:

    normalised, 4 joins 24.0 ms
    one wide table, 0 joins 14.3 ms

Be honest about what that shows: in a modern columnar engine, joining small tables to a big one is cheap. The
real costs of a heavily normalised analytical model are elsewhere:

- **People.** An analyst writing the fifth five-join query of the day will eventually join on the wrong key.
- **Correctness.** Each join is a place to multiply rows (a fan-out) or drop rows (an inner join to a table with
  a missing key). You will debug both in this topic.
- **Scale and distribution.** At billions of rows across a cluster, joins between two large tables force data to
  move between machines (a shuffle, which you meet in the Spark topic). Joining a big table to small ones is fine;
  joining big to big repeatedly is what hurts.
- **History.** A normalised current-state schema has nowhere to keep the old value; adding history to every table
  multiplies the joins again.

## When denormalising is the right call

The anomalies above come from many writers changing shared facts. An analytical table has **one writer: the
pipeline**, which rebuilds or merges it in batch from normalised sources. If the pipeline copies category_name into
the product table, a rename in the source reaches every row on the next run, consistently. The anomaly risk that
justified normalisation largely disappears, and the join savings remain.

Rules of thumb that hold up at work:

- **Keep the source of truth normalised.** The app database stays in 3NF. Denormalise downstream, never in the app.
- **Flatten small hierarchies into dimensions.** Product -> subcategory -> category becomes columns of one product
  dimension. This is the star schema's main idea (next lesson).
- **Do not copy volatile, wide attributes into huge fact tables.** A customer's address copied into two billion
  order rows is expensive to store and to correct; keep it in a customer dimension and join.
- **Precompute what is asked every day.** A daily revenue table that dashboards hit hundreds of times is cheaper
  than re-aggregating order lines each time.
- **Write down who rebuilds it.** A denormalised table without an owning pipeline is the flat export again.

## Star versus snowflake, as a preview

A **snowflake schema** keeps dimensions normalised (product -> category -> department tables). A **star schema**
flattens each dimension into one table. Stars mean fewer joins and simpler SQL for a bit of repeated text in small
dimension tables, which is why most teams choose them; snowflaking is kept for a very large dimension with a
genuinely separate, shared sub-entity. Azure Synapse, Redshift and Power BI's modelling guidance all recommend star
schemas for this reason.`,
    workedExample: `**Scenario.** Bazaarly is building its first analytical model of order lines. For each candidate column, decide:
keep it in a separate table and join, or copy it into the table where it is used.

**1. category_name and department_name, into the product table.** Copy. Five hundred categories, a few thousand
products, renamed rarely; the pipeline rebuilds the product table nightly, so a rename reaches every row together.
This removes two joins from almost every query.

**2. customer's delivery address, into the order-line fact.** Keep separate. The fact will reach billions of rows,
addresses are long, and customers change them. The fact stores a customer key; the address sits once in the
customer dimension.

**3. order_date, broken into month, quarter, weekday, is_sale_day, into the fact.** Neither: build a date dimension
with one row per day and those columns, and give the fact a date key. Ten thousand days of rows replace repeating
five columns on every fact row, and "is_sale_day" can be corrected in one place.

**4. seller_city, into the product table.** No: a product can be sold by several sellers, so the city does not
depend on the product. Copying it would break 2NF in a way that is a modelling error, not a performance trade: it
gives wrong answers. It belongs on a seller dimension.

**5. The app's normalised orders and order_items tables.** Leave them exactly as they are. Denormalisation happens
in the analytical layer; changing the source schema to suit reports would bring back the anomalies for every write.

**The rule.** Copy a value when it is small, changes rarely, depends on the thing you copy it to, and one pipeline
owns refreshing it. Otherwise join.`,
    mcqs: [
      mcq('A flat table repeats each seller\'s city on every order line. A script updates the city only for today\'s orders. What has the team created?', [
        ['An update anomaly: one seller now appears with two different cities', true],
        ['A deletion anomaly: older order lines for that seller are now removed', false],
        ['An insertion anomaly: no new sellers can be added to the table today', false],
        ['A 1NF violation, because the city column now holds a list of values', false],
      ], 'Changing some copies of a repeated fact and not others is the update anomaly; the DuckDB query showed S12 with both Coimbatore and Tiruppur. No rows were deleted, inserting is unaffected by this change, and each cell still holds a single value.'),
      mcq('Why is denormalising a product dimension in the warehouse safer than denormalising the same columns in the app\'s database?', [
        ['In the warehouse one pipeline rewrites it in batch, so copies change together', true],
        ['Warehouses enforce foreign keys strictly, so any mismatched copies are rejected', false],
        ['Column stores deduplicate repeated text, so there is only one copy on disk', false],
        ['The app\'s database cannot store text columns longer than 255 characters', false],
      ], 'Anomalies come from many concurrent writers touching shared facts; a single pipeline that rebuilds the table applies a rename everywhere at once. Most warehouses do not enforce foreign keys, compression is not logical deduplication, and the text-length claim is false.'),
      mcq('In Bazaarly\'s test, the four-join query took 24.0 ms and the wide-table query 14.3 ms. What is the right conclusion?', [
        ['Joins to small tables are cheap here; the bigger costs are complexity and errors', true],
        ['Normalised models are always about twice as slow and should never be queried', false],
        ['The wide table is faster because DuckDB cannot use hash joins on integer keys', false],
        ['The result proves that every join should be removed from analytical models', false],
      ], 'A few milliseconds on 400,000 rows says joins to small dimensions cost little in a columnar engine; the case for fewer joins rests on analyst mistakes, fan-outs and large-to-large joins at scale. The ratio is not a law, DuckDB uses hash joins, and one benchmark does not justify removing every join.'),
    ],
    checkpoint: [
      mcq('Product, subcategory and category are separate tables in Bazaarly\'s warehouse, each joined in every report. Which change is the usual dimensional-modelling choice?', [
        ['Flatten them into one product dimension with subcategory and category columns', true],
        ['Split category further into its own department and division tables as well, for purity', false],
        ['Copy category names into every order-line row of the fact table instead', false],
        ['Keep the three tables and add a view that hides the joins from analysts', false],
      ], 'Flattening a small hierarchy into the dimension is what turns a snowflake into a star: fewer joins, simpler SQL, one place to change. Splitting further deepens the snowflake, copying text into a huge fact is the expensive kind of denormalisation, and a view hides the joins without removing them.'),
      mcq('Which column should NOT be copied into a product dimension, even though reports often filter on it?', [
        ['The seller\'s city, since one product can be sold by several sellers', true],
        ['The category name, since it changes rarely and is a property of the product', false],
        ['The brand name, since each product has one brand set by the catalogue team', false],
        ['The launch date, since each product launches once on a single date', false],
      ], 'Seller city does not depend on the product, so putting it there gives a product several conflicting values: a modelling error, not a trade-off. Category, brand and launch date are genuine attributes of the product and fine to keep on its dimension.'),
      mcq('Bazaarly\'s app database is in 3NF. A report developer asks to add a category_name column to the app\'s products table to save a join. What is the best answer?', [
        ['No; keep the app normalised and denormalise in the analytical layer instead', true],
        ['Yes; denormalising the source makes every downstream model simpler as well', false],
        ['Yes, provided a nightly job fixes any rows where the two names disagree', false],
        ['No; 3NF forbids any text column from appearing in more than one table', false],
      ], 'The app has many writers, so a duplicated name invites the update anomaly; the analytical layer, with one writing pipeline, is where copying is safe. A clean-up job admits the anomaly exists, and 3NF is about dependencies on keys, not a ban on text appearing twice.'),
    ],
  },

  /* ── DIMENSIONAL_MODELLING ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_DIMENSIONAL_MODELLING',
    notes: `Dimensional modelling, from Ralph Kimball's work, is still how most warehouses are shaped, including those built
with dbt on a lakehouse. It organises data around **business processes** (taking an order, a payment, a delivery)
into **fact tables** that record what happened, surrounded by **dimension tables** that describe who, what, where
and when.

## The four steps

1. **Choose the business process.** "Customers order products", not "the orders table". One process, one fact table.
2. **Declare the grain.** One sentence saying what one row means: "one row per product line on a customer order".
   This is the most important decision in the model; everything else must agree with it.
3. **Identify the dimensions.** Whatever describes a row at that grain: date, customer, product, seller.
4. **Identify the facts.** The numbers measured at that grain: quantity, gross amount, discount.

Choose the finest grain the source supports. You can always add up order lines to orders; you can never split an
order total back into products.

## Bazaarly's star

    dim_date      (date_key 20261002, full_date, month, day_name, is_sale_day)
    dim_customer  (customer_key, customer_id, city, city_tier)
    dim_product   (product_key, sku, product_name, category, brand)
    fact_order_line (date_key, customer_key, product_key, order_id, line_no,
                     qty, gross_amount, discount_amount)

The fact table is narrow and long: foreign keys plus numbers. Dimensions are wide and short: descriptive text that
people filter and group by. A slice of each, from the DuckDB build on synthetic data (400 orders, 800 lines):

     date_key  full_date   month day_name  is_sale_day
     20261001 2026-10-01 2026-10 Thursday        False
     20261002 2026-10-02 2026-10   Friday         True

     date_key  customer_key  product_key order_id  line_no  qty  gross_amount  discount_amount
     20260921             2            4     ORD1        1    3          5697           284.85
     20260921             2            5     ORD1        2    1           349            17.45

order_id has no table of its own: it is a **degenerate dimension**, an identifier kept on the fact for grouping and
tracing back to the source. The date dimension uses a readable integer key (yyyymmdd) by convention and carries
the calendar attributes people actually filter on, including business ones like is_sale_day that no date function
can compute.

Every question is now "join the fact to the dimensions you need, group by their columns, sum the facts":

    SELECT d.is_sale_day, p.category, count(DISTINCT f.order_id) AS orders,
           sum(f.qty) AS units, sum(f.gross_amount - f.discount_amount) AS net_revenue
    FROM fact_order_line f
    JOIN dim_date d USING (date_key) JOIN dim_product p USING (product_key)
    GROUP BY ALL ORDER BY d.is_sale_day DESC, net_revenue DESC;

     is_sale_day category  orders  units  net_revenue
            True  Mobiles      46    129   1112296.80
            True     Home      45    127    114818.40
            True  Fashion      31     67     48186.40
           False  Mobiles     194    510   5203615.50
           False     Home     195    516    550984.80
           False  Fashion     129    251    214366.55

## Additive, semi-additive and non-additive

- **Additive** facts sum across every dimension: qty, gross_amount, discount_amount.
- **Semi-additive** facts sum across some dimensions but not time. A daily stock snapshot is the classic one.
- **Non-additive** facts never sum: ratios, percentages, unit prices, and **distinct counts**.

Look at the orders column above. Sale-day orders by category add up to 46 + 45 + 31 = 122, but the real number of
sale-day orders is:

     is_sale_day  orders
            True      76

An order with a phone and a kurta counts once under Mobiles and once under Fashion. Store additive pieces (a
numerator and a denominator) and compute ratios and distinct counts at query time; never store "discount %" and
average it.

Stock on hand shows semi-additivity:

    wrong_sum_over_days  stock_on_3_oct  avg_per_product_day
                   1005             245                167.5

Adding three days of stock gives 1,005 units that never existed. Across products on one day, sum; across days, take
the closing value or the average.

## Three kinds of fact table

- **Transaction**: one row per event (an order line, a payment). The default.
- **Periodic snapshot**: one row per thing per period (stock per product per day, wallet balance per user per
  month). Dense, predictable, semi-additive.
- **Accumulating snapshot**: one row per process instance, updated as it moves through milestones (an order with
  placed, packed, shipped and delivered timestamps). Good for "how long between steps".

## Surrogate keys

Dimensions get their own integer key (customer_key) rather than reusing the source's id (customer_id). Reasons:
the same customer may come from two systems with different ids; a Type 2 dimension (next lesson) needs several rows
per customer, so customer_id stops being unique; integer joins are compact; and a reserved row such as key -1,
"Unknown", lets a fact load even when its customer has not arrived yet. Keep the source id as an ordinary column.

## Mixing grains: the fan-out

Bazaarly charges a platform fee of Rs 9 per order. That is an order-grain fact. Put it in a separate fact_order
table, or allocate it to lines. Joining an order-grain table to the line-grain fact and summing it double-counts:

     right_fee_total
              3600.0

     fanned_out_fee_total
                  7200.0

Each two-line order contributed its fee twice. Never put two grains in one fact table, and when you must join two
facts, aggregate each to a common grain first ("drill across").

## Conformed dimensions and the bus matrix

When orders, payments and returns all use the same dim_date, dim_customer and dim_product, reports across processes
line up: "returns as a share of sales by category" is a join at the category level. Those shared dimensions are
**conformed**. Teams plan them with a **bus matrix**: business processes as rows, dimensions as columns, ticks where
they apply. It is the cheapest architecture document a warehouse has.

## Star or snowflake

A star flattens each dimension into one table; a snowflake normalises dimensions into sub-tables. Prefer the star:
fewer joins, simpler SQL for analysts, and BI tools (Power BI, Tableau, QuickSight) model stars best. Snowflake a
dimension only when a large sub-entity is shared and maintained separately.`,
    workedExample: `**Scenario.** Bazaarly's payments team wants a model for UPI and card payments. Source tables: payments
(payment_id, order_id, method, bank, amount, status, attempted_at) and refunds (refund_id, payment_id, amount,
refunded_at). Questions: success rate by bank and hour; refund amount by method by week; payments per customer.

**1. Processes.** Two: payment attempts and refunds. They happen at different times with different numbers, so two
fact tables, not one.

**2. Grain.**
- fact_payment_attempt: one row per payment attempt (a customer may try three times before success).
- fact_refund: one row per refund issued.
Writing "one row per payment" would have been wrong: the attempts are the events, and the success-rate question
needs failures too.

**3. Dimensions.** dim_date and a time-of-day dimension (hour buckets), dim_customer (conformed with orders),
dim_payment_method (UPI, card, wallet, with network and type), dim_bank. status (SUCCESS, FAILED, PENDING) is a
small set of values: keep it as a column on the fact or in a tiny dimension. payment_id and order_id are degenerate
dimensions.

**4. Facts.** On attempts: amount (additive), and an is_success flag of 0 or 1 so that success rate is
sum(is_success) / count(*) computed at query time — never a stored percentage. On refunds: refund_amount (additive).

**5. Check the questions against the model.**
- Success rate by bank and hour: fact_payment_attempt joined to dim_bank and the time dimension. Yes.
- Refund amount by method by week: fact_refund needs a payment method key; copy it from the payment at load time.
  Yes, once that key is added.
- Payments per customer: count(DISTINCT payment_id) on successful attempts; a distinct count, computed, not summed
  from daily rows.

**6. Bus matrix line.** Payments uses Date, Time, Customer, Method, Bank; Refunds uses Date, Customer, Method;
Orders uses Date, Customer, Product, Seller. Date, Customer and Method are conformed, so "refunds as a share of
payments by method" works.`,
    mcqs: [
      mcq('A team declares the grain of a new fact table as "one row per order" but the source has product-level lines. Which question will the model be unable to answer?', [
        ['Units sold per product category on the sale days', true],
        ['Number of orders placed per city in each calendar month', false],
        ['Average order value by customer city tier', false],
        ['Orders that used a coupon, by day of the week', false],
      ], 'At order grain the products inside an order are lost, so units by category cannot be recovered. Orders by city, average order value and coupon usage are all properties of the whole order and remain answerable.'),
      mcq('Bazaarly stores a daily closing balance per merchant wallet. An analyst sums the balance column for the whole of September. What is wrong?', [
        ['A balance is semi-additive and must not be summed across days', true],
        ['A balance is non-additive and cannot be summed across merchants', false],
        ['Summing is correct; it gives the total money held in September', false],
        ['Balances are degenerate dimensions and should not be aggregated', false],
      ], 'Balances add up across merchants on one day but not across time; thirty days summed gives a figure that never existed. They can be summed across merchants, so they are not non-additive, and a balance is a measured number, not an identifier.'),
      mcq('Why does Bazaarly give dim_customer a surrogate customer_key instead of using the app\'s customer_id as the key?', [
        ['So one customer can have several historical rows and unknown members can exist', true],
        ['Because the app\'s customer_id values are not allowed to appear in a warehouse', false],
        ['Because surrogate keys make the dimension table smaller than the fact table', false],
        ['So that customers can be deleted from the source without affecting any reports', false],
      ], 'A surrogate key stays unique when a customer has several versions (Type 2) or comes from two systems, and lets a reserved -1 row stand for a not-yet-known customer. Source ids are kept as ordinary columns, table size is not the reason, and deletions are handled separately.'),
    ],
    checkpoint: [
      mcq('Bazaarly\'s sale-day orders by category add up to 122, but the sale-day order count is 76. What explains the gap?', [
        ['Distinct counts are not additive: an order spanning two categories counts twice', true],
        ['The fact table has duplicate rows for the sale days that should be deduplicated first', false],
        ['Cancelled orders were included in the category rows but not in the total', false],
        ['The date dimension marks some days as sale days twice, doubling the counts', false],
      ], 'count(DISTINCT order_id) per category counts an order once in each category it touches, so the per-category values cannot be added. No duplicates were loaded, both queries used the same rows, and the date dimension has one row per day.'),
      mcq('An order-level coupon_discount is joined onto order lines and summed; the total is about double the finance figure. Which fix keeps the model correct?', [
        ['Keep coupon_discount on an order-grain fact, or allocate it across the lines', true],
        ['Wrap the query in SELECT DISTINCT before summing the coupon discount column', false],
        ['Divide the summed discount by two, since most orders have two order lines', false],
        ['Replace the inner join with a left join so each order is counted only once', false],
      ], 'The double count is a grain mix: an order-level number repeated on every line. It belongs on an order-grain table or must be split across lines. DISTINCT drops genuinely equal amounts, dividing by two is wrong for one- and three-line orders, and a left join still repeats the value per line.'),
      mcq('Orders, payments and returns all join to the same dim_product and dim_date. What does that give Bazaarly?', [
        ['Conformed dimensions, so metrics from different processes line up by category', true],
        ['A snowflake schema, since three fact tables now share the same two dimensions', false],
        ['Degenerate dimensions, because the product key is stored on every fact table', false],
        ['A periodic snapshot, because all three facts can be read for the same date', false],
      ], 'Shared, identical dimensions are conformed, which is what makes "returns as a share of sales by category" a simple drill-across. Snowflaking is about normalising a dimension, a degenerate dimension is an id with no table, and a periodic snapshot is a kind of fact table.'),
    ],
  },

  /* ── SLOWLY_CHANGING ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_SLOWLY_CHANGING',
    notes: `Dimension attributes change: a seller moves city, a customer moves from Tier 2 to Tier 1, a restaurant changes its
commission plan. The app overwrites the old value. The warehouse has to decide, per attribute, whether history
matters. These choices are called slowly changing dimension (SCD) types.

## The types you will be asked about

- **Type 0, retain original.** Never changes: date of birth, signup date, first-order channel.
- **Type 1, overwrite.** Keep only the latest value; history is rewritten. Right for corrections ("Weavers
  Colective" fixed to "Weavers Collective") and for attributes nobody reports on historically.
- **Type 2, add a row.** Each change creates a new version with its own surrogate key and validity dates. Facts
  point at the version that was true when they happened. Right when "as it was at the time" matters: sales by the
  seller's city at the time of sale, commissions by the plan in force that day.
- **Type 3, add a column.** Keep current_city and previous_city. Only one step of history; useful for a one-off
  reorganisation ("compare sales under the old and new region map").
- Types 4 and 6 combine these (a separate history table; Type 1 + 2 + 3 together) and come up in interviews only
  by name.

Decide per column, not per table. Bazaarly's dim_seller treats seller_name as Type 1 and city and commission_tier
as Type 2.

## A Type 2 table

    seller_key   surrogate key, one per version
    seller_id    natural key from the source, repeats across versions
    seller_name, city, commission_tier
    row_hash     md5 of the Type 2 columns, to detect change cheaply
    valid_from   first day this version is true (inclusive)
    valid_to     first day it stops being true (exclusive); 9999-12-31 for the current row
    is_current   true on exactly one row per seller_id

Use **half-open ranges**: valid_from <= date < valid_to. The old row's valid_to equals the new row's valid_from, there
are no gaps, and no date matches two versions. The far-future date (rather than NULL) keeps the range comparison
simple.

## Loading it: three statements in one transaction

The stage table stg_seller holds today's full snapshot from the source. In DuckDB:

    BEGIN TRANSACTION;
    -- 1. Type 1 column: overwrite on every version
    UPDATE dim_seller d SET seller_name = s.seller_name
    FROM stg_seller s
    WHERE d.seller_id = s.seller_id AND d.seller_name IS DISTINCT FROM s.seller_name;
    -- 2. Type 2 columns changed: close the current version
    UPDATE dim_seller d SET valid_to = DATE '2026-10-01', is_current = false
    FROM stg_seller s
    WHERE d.seller_id = s.seller_id AND d.is_current
      AND d.row_hash <> md5(concat_ws('|', s.city, s.commission_tier));
    -- 3. New current version for changed and brand-new sellers
    INSERT INTO dim_seller (seller_id, seller_name, city, commission_tier, row_hash,
                            valid_from, valid_to, is_current)
    SELECT s.seller_id, s.seller_name, s.city, s.commission_tier,
           md5(concat_ws('|', s.city, s.commission_tier)), DATE '2026-10-01', DATE '9999-12-31', true
    FROM stg_seller s
    LEFT JOIN dim_seller d ON d.seller_id = s.seller_id AND d.is_current
    WHERE d.seller_id IS NULL;
    COMMIT;

seller_key comes from a sequence (DEFAULT nextval('seller_sk')). The order matters: step 2 makes changed sellers
"not current", so step 3's anti-join picks them up together with brand-new ones. After the 1 September load and the
1 October load (S12 moved to Tiruppur, S55 went GOLD, S40's name typo fixed, S77 new):

     seller_key seller_id        seller_name       city commission_tier valid_from   valid_to  is_current
              1       S12   Annapurna Steels Coimbatore          SILVER 2026-09-01 2026-10-01       False
              4       S12   Annapurna Steels   Tiruppur          SILVER 2026-10-01 9999-12-31        True
              2       S40 Weavers Collective     Jaipur            GOLD 2026-09-01 9999-12-31        True
              3       S55 Chai Point Traders       Pune          SILVER 2026-09-01 2026-10-01       False
              5       S55 Chai Point Traders       Pune            GOLD 2026-10-01 9999-12-31        True
              6       S77 Kolkata Book House    Kolkata          BRONZE 2026-10-01 9999-12-31        True

The name fix (Type 1) changed S40's row in place and created no version. Running the 1 October load a second time:

    rows before re-run: 6 after re-run: 6

The load is **idempotent**: nothing changed, so nothing happens. Two checks to keep in every pipeline: exactly one
current row per seller_id, and no overlapping ranges.

     seller_id  current_rows  versions
           S12             1         2
           S40             1         1
           S55             1         2
           S77             1         1

## Facts point at the version, by date

When loading facts, look up the version valid on the event date and store its surrogate key:

    SELECT o.order_id, d.seller_key, o.order_date, o.amount
    FROM stg_order o JOIN dim_seller d
      ON d.seller_id = o.seller_id AND o.order_date >= d.valid_from AND o.order_date < d.valid_to;

     order_id order_date  seller_key city_at_sale  amount
      ORD9001 2026-09-15           1   Coimbatore  1200.0
      ORD9002 2026-10-03           4     Tiruppur   800.0
      ORD9003 2026-10-04           5         Pune   500.0

Now one model answers two questions. **As it was** (join the fact to its version):

          city  sales
    Coimbatore 1200.0
      Tiruppur  800.0

**As it is** (join through seller_id to the current row): all of S12's sales under Tiruppur.

        city  sales
    Tiruppur 2000.0

Both are legitimate; the business must say which one a report means. What is never legitimate is joining facts to a
Type 2 dimension on the natural key alone, which matches every version:

     rows_from_natural_key_join  total
                              6 5000.0

against 3 orders worth 2,500. That double count is the most common Type 2 bug in real warehouses.

## Edge cases that decide whether the load is right

- **Late-arriving facts**: an order dated before the seller's first version finds no row. Map it to the -1
  "Unknown" member with a left join rather than dropping it, and repair it later.
- **Late-arriving dimension changes**: a change effective last week arrives today. Either accept "effective from
  load date" (simple, slightly wrong) or split the versions and re-point affected facts (correct, more work). Say
  which one the team chose.
- **Two changes in one day**: with a daily snapshot you only see the end-of-day state. If intraday history matters,
  capture changes from the source (change data capture, in the next topic) with timestamps.
- **Deletes**: a seller missing from today's snapshot is usually closed (valid_to set, is_current false, or an
  is_deleted flag), not deleted from the dimension, because facts still point at it.

DE_SQL_ENGINEERING shows the same load written as a single MERGE, and DE_DBT shows dbt snapshots, which generate
this logic for you. Understand the three statements first; then the tools are easy to check.`,
    workedExample: `**Scenario.** Bazaarly's customer dimension has city, city_tier, email, preferred_language, signup_date and
marketing_consent. Analysts want revenue by city tier at the time of the order. Decide each column's type, then
trace one customer through two loads.

**1. Types per column.**
- signup_date: Type 0, it never changes.
- email: Type 1. Nobody reports on old emails, and keeping them is a privacy cost under India's DPDP Act with no
  benefit.
- preferred_language: Type 1. Used for targeting now, not for history.
- city and city_tier: Type 2. "Revenue by tier at the time" is the stated requirement.
- marketing_consent: Type 2. Whether a message was allowed on the day it was sent is an audit question.

**2. Customer C204, first load on 1 August.** Snapshot: Warangal, Tier 2, Telugu, consent yes. The dimension gets
customer_key 9001, valid 2026-08-01 to 9999-12-31, current.

**3. Load on 1 September.** C204 moved to Hyderabad (Tier 1) and changed language to English.
- Step 1 (Type 1): preferred_language becomes English on key 9001 — every version, history rewritten.
- Step 2 (Type 2): row_hash of (city, tier, consent) differs, so key 9001 closes: valid_to 2026-09-01, not current.
- Step 3: insert key 9047, Hyderabad, Tier 1, English, valid 2026-09-01 to 9999-12-31, current.

**4. Facts.** An order on 20 August finds 9001 (20 Aug is within [1 Aug, 1 Sep)); an order on 1 September finds 9047
(the boundary day belongs to the new version only, because valid_to is exclusive).

**5. Report.** "Revenue by tier at the time" joins fact to dim on customer_key: August revenue lands in Tier 2,
September in Tier 1. "Revenue by current tier" joins through customer_id to is_current: all of it in Tier 1.

**6. Re-run safety.** Running the 1 September load again finds no differing hash and no missing current row, so it
changes nothing. That is the test to write before the pipeline goes live.`,
    mcqs: [
      mcq('A seller\'s name was misspelt at onboarding and is corrected a month later. How should the warehouse treat the seller_name column?', [
        ['Type 1, overwrite: a spelling fix is a correction, not real history', true],
        ['Type 2, add a version so reports show the misspelt name for August', false],
        ['Type 3, keep the misspelling in a previous_name column for audit', false],
        ['Type 0, keep the misspelt original because names must never change', false],
      ], 'Corrections should rewrite history so every report shows the right name; that is Type 1. A Type 2 version preserves an error nobody wants to see, a previous_name column has no use here, and Type 0 would keep the mistake for ever.'),
      mcq('In Bazaarly\'s Type 2 load, what goes wrong if the INSERT of new versions runs before the UPDATE that closes the old ones?', [
        ['Changed sellers get no new row and then lose their current row', true],
        ['Changed sellers get two current rows that both cover today', false],
        ['New sellers are inserted twice, once by each of the statements', false],
        ['Nothing, because both statements run inside one transaction', false],
      ], 'The INSERT only adds sellers with no current row; changed sellers still have one, so they are skipped, and the UPDATE then closes it — leaving no current version, as the DuckDB test showed. No duplicate current rows appear, new sellers are inserted once, and a transaction does not reorder statements.'),
      mcq('Why does Bazaarly\'s dim_seller use valid_to as the first day a version stops being true, rather than its last valid day?', [
        ['Half-open ranges leave no gaps and no date that matches two versions', true],
        ['DuckDB cannot compare a date column with the <= operator in a join', false],
        ['It saves one day of storage for every closed version in the table', false],
        ['Exclusive end dates make the current row easier to find than is_current', false],
      ], 'With valid_from <= d < valid_to, the old valid_to equals the new valid_from and every date maps to exactly one version. BETWEEN on both ends matched an order on the change day to two versions. DuckDB supports <=, storage is unaffected, and is_current remains the easy filter for the current row.'),
    ],
    checkpoint: [
      mcq('A fact table is joined to a Type 2 seller dimension using only seller_id. Three orders worth Rs 2,500 come out as six rows worth Rs 5,000. What is the fix?', [
        ['Store the version\'s seller_key on the fact at load time and join on it', true],
        ['Add SELECT DISTINCT so the extra versions collapse back to one row each', false],
        ['Filter the dimension to is_current so only the latest version can match', false],
        ['Group the result by seller_id and divide by the number of its versions', false],
      ], 'Facts should carry the surrogate key of the version valid on the event date, so each fact matches exactly one row. DISTINCT would merge genuinely equal orders, filtering to is_current silently restates history, and dividing by version counts is arithmetic papering over a wrong join.'),
      mcq('Finance wants commission reports by the plan that was in force on each order\'s date. Restaurants change plans a few times a year. Which SCD type fits commission_plan?', [
        ['Type 2, so each order points at the version valid on its date', true],
        ['Type 1, so every report uses the plan the restaurant has today', false],
        ['Type 3, with a previous_plan column alongside the current plan', false],
        ['Type 0, so the plan given at onboarding is kept unchanged always', false],
      ], 'Several changes a year, each needing to be matched to the orders it governed, is what Type 2 is for. Type 1 rewrites history, Type 3 keeps only one previous value and loses older plans, and Type 0 ignores every change.'),
      mcq('An order dated 28 August arrives for a seller whose first dimension version starts on 1 September. With an inner join the order vanishes. What should the load do?', [
        ['Left join and assign the -1 Unknown member, then repair it later', true],
        ['Drop the order, because it predates the seller in the warehouse', false],
        ['Change the order date to 1 September so that it finds a version', false],
        ['Extend the current version back to the start of the calendar year', false],
      ], 'A late-arriving fact must still be counted; pointing it at the Unknown member keeps totals right and flags it for repair. Dropping it loses revenue, rewriting the event date falsifies the fact, and stretching a version backwards invents history that may be wrong.'),
    ],
  },

  /* ── MODERN_MODELLING ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_MODERN_MODELLING',
    notes: `Kimball's star is not the only shape you will meet. Cheap columnar storage, lakehouses and dbt have made three
other ideas common: one big table, data vault, and medallion layers. They are not rivals to the star so much as
tools for different layers and different teams.

## One big table (OBT)

Join the fact to all its dimensions once, in the pipeline, and store the result as one wide table. Bazaarly's OBT
from the star in the last lesson:

    CREATE TABLE obt_order_line AS
    SELECT f.order_id, f.line_no, d.full_date, d.month, d.day_name, d.is_sale_day,
           c.customer_id, c.city, c.city_tier, p.sku, p.product_name, p.category, p.brand,
           f.qty, f.gross_amount, f.discount_amount, f.gross_amount - f.discount_amount AS net_amount
    FROM fact_order_line f JOIN dim_date d USING (date_key)
    JOIN dim_customer c USING (customer_key) JOIN dim_product p USING (product_key);

     rows  columns
      800       17

    SELECT city_tier, category, sum(net_amount) AS net FROM obt_order_line
    WHERE is_sale_day GROUP BY ALL ORDER BY net DESC LIMIT 3;

    city_tier category      net
       Tier 2  Mobiles 584745.6
       Tier 1  Mobiles 527551.2
       Tier 1     Home  60587.2

No joins, so analysts, BI tools and ML feature code find it easy, and columnar storage makes the repeated text
cheap. The costs: the grain is frozen (an OBT at order-line grain cannot hold an order-level fee without the
fan-out problem), dimension attributes are frozen at build time (if a product is recategorised the OBT is wrong
until rebuilt), every new attribute means a wider rebuild, and several OBTs for different teams drift apart.

The pattern that works: **build the star, then publish OBTs from it** for specific dashboards or feature sets. The
star stays the source of truth; the OBT is a disposable, rebuildable serving table.

## Data vault, in outline

Data vault (Dan Linstedt) models the integration layer for auditability and many changing sources:

- **Hubs**: one row per business key (a seller_id, an order_id), with a hash key, load time and record source.
- **Links**: one row per relationship between hubs (this order was sold by this seller).
- **Satellites**: descriptive attributes and their history, hanging off a hub or link, insert-only with load
  timestamps and a hash_diff to detect change.

Built in DuckDB from four clean orders:

     hubs_seller  hubs_order  links  sats
               3           4      4     4

and reassembled for a question:

    SELECT h.order_id, hs.seller_id, s.amount, s.status
    FROM hub_order h JOIN link_order_seller l USING (order_hk)
    JOIN hub_seller hs USING (seller_hk) JOIN sat_order_details s USING (order_hk);

    order_id seller_id  amount    status
        ORD1       S12  1499.0 DELIVERED
        ORD2       S40   899.0 DELIVERED
        ORD4       S55   349.5 CANCELLED
        ORD5       S55  2100.0 DELIVERED

Four joins for a question a star answers with one. That is the point: the vault is insert-only, keeps every
version from every source with its origin, absorbs new sources by adding satellites without changing existing
tables, and loads in parallel because hash keys need no lookups. It is **not** for analysts to query; teams put
stars (often called information marts) on top. You find vaults at banks, insurers and large enterprises with many
source systems and auditors, and dbt packages generate much of the code. For a startup with three sources it is
heavy machinery.

## Medallion layers: bronze, silver, gold

Medallion is an architecture for a lakehouse, popularised by Databricks, and it says where each kind of model
lives rather than what shape it has:

- **Bronze**: data as it arrived, plus load metadata. Append-only, replayable, rarely queried.
- **Silver**: cleaned, typed, deduplicated, conformed. Bad rows quarantined, not silently dropped.
- **Gold**: business-level tables: stars, aggregates, OBTs for dashboards and features.

A day of Bazaarly order events (six JSON lines: one exact duplicate, one amount of "abc", a city written
"bengaluru " with a space) through all three in DuckDB:

    bronze_rows
              6

    -- silver: TRY_CAST the amount, trim and fix the city's case, DISTINCT, cast the timestamp
    order_id      city  amount    status
        ORD1 Bengaluru  1499.0 DELIVERED
        ORD2 Bengaluru   899.0 DELIVERED
        ORD4 Hyderabad   349.5 CANCELLED
        ORD5 Hyderabad  2100.0 DELIVERED

    -- quarantine
    order_id raw_amount
        ORD3        abc

    -- gold: delivered revenue by IST date and city
    order_date      city  delivered_orders  revenue
    2026-10-02 Bengaluru                 2   2398.0
    2026-10-03 Hyderabad                 1   2100.0

ORD5 was placed at 00:20 IST on 3 October. Cast to a date in UTC it lands on 2 October:

      utc_date order_id
    2026-10-02     ORD5

Decide the business time zone once, in silver or gold, and write it down; an Indian company's "daily sales" means
IST days. Keeping bronze untouched is what lets you fix a silver rule and rebuild without asking the source to
resend anything.

Medallion and Kimball fit together: bronze and silver are the integration layers, and gold is where the stars and
OBTs live. On AWS the layers are usually S3 prefixes or Glue databases with Delta Lake or Iceberg tables (the
warehouse and lakehouse topic covers those); on Azure, ADLS Gen2 containers or Fabric lakehouses.

## Choosing for a team

    Situation                                         A sensible default
    Startup, one warehouse, analysts writing SQL      medallion layers, stars in gold, OBTs for top dashboards
    Many source systems, strict audit, big team       data vault in silver, stars as marts on top
    One dashboard, one source, a deadline             an OBT, with a note to build the star when a second one comes
    ML features                                       OBTs or feature tables built from the star at the right grain

Whatever you choose, three things do not change: declare the grain of every table, keep history where the
business needs it (Type 2), and make every layer rebuildable from the one beneath it.`,
    workedExample: `**Scenario.** A fictional ed-tech company, Padhaai, publishes board-exam practice results. On results day,
traffic jumps tenfold. Sources: the app's PostgreSQL (students, tests, attempts), a payment gateway's daily files,
and a CRM export of counsellor calls. The team is two data engineers and four analysts. Leadership wants a
dashboard of attempts and pass rates by state, board and test, plus a feature table for a "likely to buy a course"
model. Choose the modelling approach and lay out the layers.

**1. Rule out the extremes.** A data vault is built for many sources, auditors and big teams; three sources and two
engineers would spend months on hubs and satellites nobody queries. A single OBT straight from the app tables would
ship fast but has no place for payments and CRM at different grains, and would be rebuilt by hand for every new
question.

**2. Bronze.** Land each source unchanged, one table per source per day, with load time and file name: attempts from
an incremental extract, gateway files as delivered, CRM exports as delivered. Never edited.

**3. Silver.** Typed and deduplicated: attempts deduplicated on attempt_id (the app retries on results day), payments
reconciled to one row per payment, CRM calls with phone numbers masked. Timestamps converted to IST. Rows failing
type checks go to quarantine tables with the reason.

**4. Gold, stars.** fact_attempt at the grain "one row per student per test attempt", with dim_student (Type 2 on
board and state, since students switch boards), dim_test, dim_date. fact_payment at "one row per payment". Shared
dim_student and dim_date are conformed, so "pass rate of students who paid" is a drill-across.

**5. Gold, serving tables.** An OBT of attempts with student, test and date attributes for the results-day
dashboard, rebuilt every 15 minutes on that day. A feature table at the grain "one row per student per day" for
the model, built from the facts (attempts in the last 30 days, last score, days since last payment).

**6. What to write down.** The grain of every gold table, which dimension columns are Type 2, IST as the business
time zone, and that every layer rebuilds from the one below.`,
    mcqs: [
      mcq('Bazaarly recategorises 40 products from Home to Kitchen. Its star schema shows the change the next morning, but a dashboard built on an OBT still shows Home. Why?', [
        ['The OBT copied category at build time and has not been rebuilt since', true],
        ['OBTs cannot hold text columns, so the category is kept as an old code', false],
        ['The product dimension was not updated, but the star reads the source', false],
        ['The dashboard caches the old category because OBTs have no primary key', false],
      ], 'An OBT freezes dimension attributes when it is built, so it lags until its next rebuild; that is why OBTs should be generated from the star on a schedule. OBTs hold text fine, the star itself read the updated dimension, and the lack of a key does not create a cache.'),
      mcq('Which statement about a data vault is accurate?', [
        ['Satellites are insert-only and keep each version with its load time and source', true],
        ['Hubs hold the descriptive attributes and are updated in place on every single change', false],
        ['Analysts query the vault directly because it needs fewer joins than a star', false],
        ['Links replace foreign keys by storing the related row\'s attributes inline', false],
      ], 'Satellites carry attributes and history as insert-only rows with load timestamps and a hash_diff. Hubs carry only business keys, the vault needs more joins than a star (four for the order-seller question), and links hold hash keys of the related hubs, not their attributes.'),
      mcq('An order placed at 00:20 IST on 3 October appears under 2 October in a Bazaarly report. Where is the fix?', [
        ['Convert event times to IST before deriving dates, in silver or gold', true],
        ['Rewrite the raw event in bronze so its timestamp reads 3 October', false],
        ['Tell the app to send all timestamps as dates without a time part', false],
        ['Exclude every order placed between midnight and 05:30 from reports', false],
      ], 'Dates should be derived in the business time zone, decided once in a modelled layer; DuckDB showed the same instant is 2 October in UTC. Bronze must stay as received, dropping the time loses information, and excluding early-morning orders throws away real sales.'),
    ],
    checkpoint: [
      mcq('A row with amount "abc" arrives in Bazaarly\'s order feed. What should the silver layer do with it?', [
        ['Keep it out of silver and write it to a quarantine table with the raw value', true],
        ['Load it into silver with amount set to zero so the totals still add up', false],
        ['Drop it silently from silver, because bronze still has a copy if anybody asks later', false],
        ['Fail the whole day\'s load until the source system resends the file', false],
      ], 'Quarantining keeps silver clean and makes the bad row visible for a fix. Setting zero falsifies revenue, dropping silently hides a source problem, and failing everything for one row usually stops the business for a fixable defect (unless a threshold of bad rows is crossed).'),
      mcq('A two-engineer startup with three sources asks whether to build a data vault. What is the best advice?', [
        ['Probably not yet; medallion layers with stars in gold fit this team better', true],
        ['Yes; a vault is required before any star schema can be built on top of it', false],
        ['Yes; a vault needs fewer joins than a star, so analysts will be faster', false],
        ['No; data vaults only work on on-premise databases, never on cloud ones', false],
      ], 'A vault pays off with many sources, strict audit and big teams; for three sources it is heavy machinery. Stars do not require a vault underneath, a vault needs more joins rather than fewer, and vaults run perfectly well on cloud warehouses and lakehouses.'),
      mcq('Which layer of a medallion lakehouse is the right home for Bazaarly\'s star schema of order lines?', [
        ['Gold, where business-level facts and dimensions are served', true],
        ['Bronze, so the star stays as close as possible to the source', false],
        ['Silver, because the star is only a typed copy of each source', false],
        ['A separate layer, since medallion and Kimball cannot be combined', false],
      ], 'Gold holds business-level models such as stars and OBTs; bronze is raw and silver is cleaned and conformed source data. A star is more than a typed copy, and medallion and Kimball combine naturally — medallion says where, Kimball says what shape.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_DEBUGGING',
    notes: `Modelling bugs rarely throw errors. The query runs, the dashboard renders, and the number is wrong. Each case
below was reproduced in DuckDB on synthetic data; the outputs are real. For each, read the symptom, find the cause
before reading it, then check the fix.

## 1. The platform fee that doubled

**Symptom.** Finance says September platform fees were Rs 3,600. The dashboard says Rs 7,200.

    SELECT sum(o.platform_fee) AS fanned_out_fee_total
    FROM fact_order o JOIN fact_order_line l USING (order_id);

    fanned_out_fee_total
                  7200.0

**Cause.** platform_fee is an order-grain fact (Rs 9 per order). Joining it to the line-grain fact repeats it once
per line; every order in this data has two lines.

**Fix.** Sum it at its own grain (SELECT sum(platform_fee) FROM fact_order gives 3600.0), or allocate the fee to
lines in the pipeline so it becomes additive at line grain. When combining two facts, aggregate each to a shared
grain first, then join.

## 2. Revenue that doubled after the seller moved

**Symptom.** After S12 changed city, three orders worth Rs 2,500 show as Rs 5,000.

    SELECT count(*) AS rows_from_natural_key_join, sum(o.amount) AS total
    FROM stg_order o JOIN dim_seller d ON d.seller_id = o.seller_id;

     rows_from_natural_key_join  total
                              6 5000.0

**Cause.** dim_seller is Type 2; seller_id appears once per version, so each order matches every version of its
seller.

**Fix.** At fact load time, join on seller_id AND the date range, and store the resulting seller_key on the fact.
Reports join on seller_key. A test that fails if any fact joins to more than one dimension row would have caught it.

## 3. A change the load never noticed

**Symptom.** An onboarding script put a seller's tier into the city field (city 'GOLD', tier NULL). The source team
corrected it to (city NULL, tier 'GOLD'), and the Type 2 load created no new version. Digging in, the two different
attribute combinations produce the same row_hash.

    SELECT concat_ws('|', NULL, 'GOLD') AS a, concat_ws('|', 'GOLD', NULL) AS b,
           md5(concat_ws('|', NULL, 'GOLD')) = md5(concat_ws('|', 'GOLD', NULL)) AS same_hash;

       a    b  same_hash
    GOLD GOLD       True

**Cause.** concat_ws skips NULL arguments, so (city NULL, tier GOLD) and (city GOLD, tier NULL) both hash the string
"GOLD". A change between them is invisible.

**Fix.** Replace NULLs with a sentinel before hashing: md5(concat_ws('|', coalesce(city, '~'), coalesce(tier, '~'))).
With that, the same comparison returned same_after_fix = False. Hash every Type 2 column, in a fixed order, with
the same rule in every pipeline.

## 4. One order, two sellers

**Symptom.** An order placed on 1 October appears twice in the fact table, once under Coimbatore and once under
Tiruppur.

    ... JOIN dim d ON d.seller_id = o.seller_id
                  AND o.order_date BETWEEN d.valid_from AND d.valid_to

     order_id  seller_key       city
      ORD9100           1 Coimbatore
      ORD9100           4   Tiruppur

**Cause.** The dimension uses half-open ranges (the old valid_to equals the new valid_from, 2026-10-01), but BETWEEN
is inclusive at both ends, so the change day matches both versions.

**Fix.** o.order_date >= d.valid_from AND o.order_date < d.valid_to. Pick one convention for the whole warehouse and
put it in the model's documentation.

## 5. Orders that vanished

**Symptom.** A late batch of August orders is loaded, and the fact row count does not move.

    loaded
         0

**Cause.** The order is dated 28 August; the seller's first dimension version starts on 1 September. The fact load
uses an inner join, so the order finds no version and is dropped without an error.

**Fix.** Left join, and map misses to the reserved Unknown member:

    order_id  seller_key
     ORD8000          -1

Then alert on the count of -1 keys and repair them when the dimension catches up. Compare source and fact row
counts after every load; a silent drop is worse than a failure.

## 6. A seller with no current row

**Symptom.** After the 1 October load, S12 has one row, closed, and no current version; its new orders all go to -1.

     seller_key seller_id       city valid_from   valid_to  is_current
              1       S12 Coimbatore 2026-09-01 2026-10-01       False

**Cause.** The pipeline ran the INSERT of new versions before the UPDATE that closes changed ones. At insert time S12
still had a current row, so the anti-join skipped it; then the update closed that row.

**Fix.** Close changed rows first, then insert where no current row exists, inside one transaction. Add two checks
after every load: exactly one is_current row per seller_id, and no overlapping ranges.

## Habits that catch these early

- Reconcile one number against the source after every model change (row counts and a money total).
- Test uniqueness of the grain: SELECT order_id, line_no, count(*) ... HAVING count(*) > 1 must return nothing.
- Test that every fact key finds exactly one dimension row.
- When a total is exactly double, look for a join that fans out before looking anywhere else.`,
    mcqs: [
      mcq('A revenue total is exactly twice the finance figure after a new join was added to the model. What should you check first?', [
        ['Whether the new join matches more than one row per fact row', true],
        ['Whether the warehouse rounded DECIMAL values to whole rupees', false],
        ['Whether the BI tool cached a previous version of the dashboard', false],
        ['Whether the source sent the day\'s orders file twice by mistake', false],
      ], 'An exact multiple right after adding a join points to a fan-out: a grain mismatch or a natural-key join to a Type 2 dimension. Rounding would not double totals, a stale cache would not start doubling, and a resent file is possible but would not coincide with the model change.'),
      mcq('A Type 2 load hashes md5(concat_ws(\'|\', city, tier)). A seller goes from (NULL, GOLD) to (GOLD, NULL) and no version is created. Why?', [
        ['concat_ws skips NULLs, so both rows hash the same string', true],
        ['md5 returns NULL whenever any one of its inputs is NULL', false],
        ['DuckDB compares hashes case-insensitively by default', false],
        ['The pipe separator is not allowed inside concat_ws', false],
      ], 'concat_ws drops NULL arguments, so both combinations become "GOLD" and hash identically; coalescing NULLs to a sentinel fixes it. md5 of a non-NULL string is not NULL, string comparison is case-sensitive, and any separator is allowed.'),
      mcq('A fact load joins orders to dim_seller with BETWEEN valid_from AND valid_to, while the dimension sets the old valid_to equal to the new valid_from. Which orders are affected?', [
        ['Orders on a change day, which match both the old and the new version', true],
        ['Orders on the day before a change, which match no version at all', false],
        ['Only orders for sellers that have never changed since onboarding', false],
        ['Every order, because BETWEEN does not work with DATE columns in a join condition', false],
      ], 'BETWEEN includes both ends, so the shared boundary date belongs to two versions and the order is duplicated. The day before a change is inside the old version, unchanged sellers have one version, and BETWEEN works with dates.'),
      mcq('A late August order disappears from the fact table without an error. Which load design prevents a silent loss like this?', [
        ['A left join to the dimension, misses mapped to -1, and a row-count check', true],
        ['An inner join, with the dimension\'s first valid_from set to today', false],
        ['A validation rule rejecting any order dated before the last dimension load ran', false],
        ['A larger warehouse cluster so that late batches are processed first', false],
      ], 'A left join keeps the order, the Unknown member marks it for repair, and reconciling counts catches any other drop. An inner join is the cause, rejecting old orders loses real revenue, and compute size has nothing to do with join semantics.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_PRACTICE',
    notes: `Nine exercises, easiest first. Write your answer before reading ours. The SQL answers in exercises 7 and 8 were
run in DuckDB against the Type 2 seller dimension from the lesson, with one overlapping row planted to prove the
checks find it.

## 1. Write the grain (easy)

Write a one-sentence grain for each: (a) a ride-hailing app's trips; (b) UPI payment attempts; (c) daily stock in
each dark store of a quick-commerce app; (d) an ed-tech app's video watching.

**Answer.** (a) One row per completed or cancelled trip. (b) One row per payment attempt, including failures and
retries. (c) One row per product per dark store per day (a periodic snapshot). (d) One row per student per video per
viewing session — or, if the source only gives heartbeats, one row per heartbeat, aggregated later. A grain names
the event or the snapshot, not a table.

## 2. Classify the measures (easy)

For a food-delivery order fact: order_value, delivery_time_minutes, rating (1-5), discount_percent, items_count,
wallet_balance_after_order.

**Answer.** Additive: order_value, items_count. delivery_time_minutes: store it, but report it as an average (sum
divided by a count); a total of minutes across orders means nothing to anyone. rating: non-additive (average it).
discount_percent: non-additive; store discount_amount instead and compute the percentage.
wallet_balance_after_order: semi-additive at best and really belongs on a wallet snapshot, not on the order fact.

## 3. Facts or dimensions (easy)

Sort into fact columns, dimension attributes, or degenerate dimensions: restaurant cuisine, delivery fee, order_id,
rider vehicle type, customer signup month, tip amount, invoice number.

**Answer.** Facts: delivery fee, tip amount. Dimension attributes: cuisine (restaurant), vehicle type (rider), signup
month (customer). Degenerate: order_id, invoice number.

## 4. Spot the grain mix (medium)

A table has one row per order line with columns order_id, sku, qty, line_amount, delivery_fee, coupon_discount.
What will go wrong, and what should change?

**Answer.** delivery_fee and coupon_discount are order-level values repeated on each line, so sum() overstates them
by the number of lines (the platform fee in the lesson went from 3,600 to 7,200). Move them to an order-grain fact,
or allocate them to lines (for example, in proportion to line_amount, with the rounding remainder on the first line
so the lines add back to the order).

## 5. Choose SCD types (medium)

A customer dimension has: name, phone, city, loyalty_tier, KYC status, date_of_birth. The business reports revenue
by loyalty tier at the time and audits KYC status at each transaction.

**Answer.** name, phone: Type 1 (corrections; old phone numbers have no reporting use and are personal data you
should not keep longer than needed). city: Type 2 if regional reports need "at the time", otherwise Type 1 — ask.
loyalty_tier: Type 2 (stated requirement). KYC status: Type 2 (audit needs the status on the transaction date).
date_of_birth: Type 0, with corrections handled as Type 1.

## 6. Design a small star (medium)

A ride-hailing company in Bengaluru wants trips, revenue and cancellations by city zone, hour, vehicle type and
driver rating band. Design the star.

**Answer.** fact_trip, grain one row per trip request (so cancellations are rows too). Keys: date_key, time_key (hour
or minute), pickup_zone_key, drop_zone_key (the same dim_zone used twice, a role-playing dimension), driver_key,
rider_key, vehicle_type_key. Facts: fare, distance_km, duration_min, is_cancelled (0/1), surge_amount. driver_key
points at a Type 2 dim_driver with rating_band, so a trip carries the band at the time. trip_id is degenerate.

## 7. Write the Type 2 health checks (medium)

Write two queries that must return no rows after every load of dim_seller: one current row per seller, and no
overlapping validity ranges.

**Answer.**

    SELECT seller_id, count(*) FILTER (WHERE is_current) AS current_rows
    FROM dim_seller GROUP BY seller_id
    HAVING count(*) FILTER (WHERE is_current) <> 1;

    SELECT a.seller_id, a.seller_key AS key_a, b.seller_key AS key_b
    FROM dim_seller a JOIN dim_seller b
      ON a.seller_id = b.seller_id AND a.seller_key < b.seller_key
     AND a.valid_from < b.valid_to AND b.valid_from < a.valid_to;

With a planted bad row for S40 (valid 2026-09-20 to 2026-10-10), the first returned nothing and the second returned:

    seller_id  key_a  key_b
          S40      2      7

## 8. Find gaps with a window function (hard)

Ranges can also have gaps (one version ends on the 10th, the next starts on the 12th). Write a query using a window
function (you met LEAD in the Data Analytics track) that lists them.

**Answer.**

    SELECT seller_id, valid_from, valid_to,
           lead(valid_from) OVER (PARTITION BY seller_id ORDER BY valid_from) AS next_from
    FROM dim_seller
    QUALIFY next_from IS NOT NULL AND next_from <> valid_to;

On the same data it returned the S40 row whose next version did not start where it ended:

    seller_id valid_from   valid_to  next_from
          S40 2026-09-01 9999-12-31 2026-09-20

## 9. Pick the layer (hard)

For each, say bronze, silver or gold: (a) raw gateway settlement CSVs exactly as received; (b) payments deduplicated
on payment_id with amounts as DECIMAL; (c) daily revenue by city in IST; (d) an OBT feeding the CEO dashboard;
(e) rows with an unparseable amount.

**Answer.** (a) bronze. (b) silver. (c) gold. (d) gold, built from the gold star. (e) a quarantine table beside
silver, with the raw value and the reason, so the source team can fix it.`,
    mcqs: [
      mcq('A quick-commerce app records stock per product per dark store at 11 p.m. every night. What kind of fact table is this?', [
        ['A periodic snapshot, one row per product per store per day', true],
        ['A transaction fact, one row per stock movement into a store', false],
        ['An accumulating snapshot, updated as stock moves through stages', false],
        ['A factless fact, since stock levels are not measured events', false],
      ], 'A regular reading of a level per thing per period is a periodic snapshot, and its stock measure is semi-additive. Stock movements would be a transaction fact, an accumulating snapshot tracks milestones of one process, and a factless fact records events with no measures, not levels.'),
      mcq('A trip fact needs both the pickup zone and the drop zone. How is this usually modelled?', [
        ['One dim_zone used twice, through pickup_zone_key and drop_zone_key', true],
        ['Two separate tables, dim_pickup_zone and dim_drop_zone, kept in sync', false],
        ['One zone_key on the fact, with a flag column saying pickup or drop', false],
        ['Zone names copied as text into the fact, since there are two of them', false],
      ], 'A role-playing dimension is one table joined under different roles; the fact carries one key per role. Two copies drift apart, one key with a flag cannot hold both zones for the same trip, and copying text into a huge fact is the costly denormalisation.'),
      mcq('An order-level coupon of Rs 100 is allocated across three lines worth Rs 200, Rs 300 and Rs 500. What does a proportional allocation give the Rs 300 line?', [
        ['Rs 30, since that line is 30% of the order value', true],
        ['Rs 33.33, since the coupon splits evenly by line', false],
        ['Rs 100, since each line carries the full coupon', false],
        ['Rs 0, since coupons stay on the first line only', false],
      ], 'Rs 300 of a Rs 1,000 order is 30%, so it carries Rs 30 and the three lines add back to Rs 100. An even split ignores the stated rule, Rs 100 on every line is the fan-out the allocation exists to avoid, and putting the whole coupon on one line skews line-level margins.'),
      mcq('Which query finds Type 2 versions whose ranges overlap for the same seller?', [
        ['A self-join on seller_id where a.valid_from < b.valid_to and b.valid_from < a.valid_to', true],
        ['A GROUP BY seller_id HAVING count(*) > 1, which lists the sellers with several versions', false],
        ['A filter WHERE valid_to = DATE \'9999-12-31\', which lists the current version rows', false],
        ['A self-join on seller_key where a.valid_from = b.valid_from and both rows are current', false],
      ], 'Two ranges overlap exactly when each starts before the other ends, which the self-join tests; it found keys 2 and 7 for S40. Several versions are normal for Type 2, the far-future date marks current rows, and seller_key is unique per version so a self-join on it pairs a row with itself.'),
      mcq('An analyst stores discount_percent on each order line and averages it to report the sale\'s overall discount. Why is the result wrong?', [
        ['A plain average weights a Rs 50 line the same as a Rs 50,000 line', true],
        ['Percentages cannot be stored as numbers in a column-store warehouse', false],
        ['AVG ignores every line where the discount percentage is exactly zero', false],
        ['The average must be taken over orders, not lines, to be accurate', false],
      ], 'Ratios are non-additive: the overall discount is sum(discount_amount) / sum(gross_amount), which weights lines by value. Percentages store fine, AVG includes zeros (it skips NULLs), and averaging per order has the same weighting problem one level up.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_INTERVIEW_QUESTION',
    notes: `Data modelling comes up in nearly every data engineer interview in India, from service companies to product
startups and GCCs, usually as "design the warehouse for X" on a whiteboard. Interviewers listen for the grain first,
then history, then whether you can say what you would not build. Four questions, a model answer each, and the
follow-up a good answer earns.

## Q1. "Design a data model for a food-delivery app's orders."

**Model answer (about two minutes).** "I would start from the business processes rather than the app tables: orders,
deliveries and payments, each its own fact. For orders I would take the finest grain the source gives, one row per
item on an order, because order totals can be rolled up from lines but not the reverse. Dimensions: date and time of
day, customer, restaurant, item and delivery area. Facts at line grain: quantity, item amount and discount. Order-level
amounts like the delivery fee and the platform fee go on a separate order-grain fact so they are not double-counted.
Restaurants change commission plans and areas, so dim_restaurant would be Type 2 on those columns and facts would
carry the surrogate key of the version on the order date. Deliveries would be an accumulating snapshot with the
assigned, picked-up and delivered timestamps, so we can measure each step. Customer, date and restaurant are shared
across the three facts, which lets us compare cancellations with deliveries by area."

**Follow-up: "Your delivery_fee is on the order fact. The business asks for margin per item. Now what?"** Allocate the
fee to lines in the pipeline (proportional to item value, with the rounding remainder put on one line so lines add
back to the order) and document the rule; keep the order-grain fact too, because finance reconciles at order level.

## Q2. "What is a slowly changing dimension? How would you implement Type 2?"

**Model answer.** Explain Types 1, 2 and 3 in one line each, then: "For Type 2 I keep a surrogate key per version, the
natural key, valid_from and valid_to as a half-open range with a far-future date on the current row, an is_current
flag and a hash of the tracked columns. The load runs in one transaction: overwrite Type 1 columns, close current
rows whose hash changed, then insert new versions for changed and new keys. It is idempotent, so a re-run changes
nothing. Facts look up the version valid on the event date and store its key."

**Follow-up: "What if a change arrives a week late?"** Say the two options: treat it as effective from the load date
(simple, slightly wrong, document it) or split the version at the real effective date and re-point the facts in that
week (correct, needs a fact update). Mention that dbt snapshots record when the change was seen, not when it
happened, so late changes need an explicit decision either way.

## Q3. "Star schema or one big table?"

**Model answer.** "Both, in different layers. The star is the source of truth: grains are explicit, dimensions are
conformed and Type 2 history lives in one place. OBTs are serving tables built from the star for a particular
dashboard or feature set, because they are easy to query and columnar storage makes the repeated text cheap. An OBT
alone freezes attributes at build time and makes it hard to add a second grain, so I would not make it the only
model."

**Follow-up: "And snowflake?"** Snowflake only when a large sub-dimension is shared and maintained separately;
otherwise flatten hierarchies into the dimension, because every extra join is slower for analysts and BI tools.

## Q4. "What is the grain, and what happens if you get it wrong?"

**Model answer.** "The grain is what one row of a fact table means, stated before choosing columns. If it is too
coarse you cannot answer finer questions later; if two grains are mixed in one table, sums double-count — an
order-level fee on line rows is the usual example; and if it is never written down, two engineers load
incompatible rows into the same table. I check it with a uniqueness test on the grain's columns."

**Follow-up: "How do you test that in a pipeline?"** A query grouping by the grain columns with HAVING count(*) > 1
that must return nothing (a dbt unique test does the same), plus a reconciliation of row counts and money totals
against the source after every load.

## How to practise

Say each answer aloud against a timer, and draw the Q1 star on paper with keys and grain written above each fact.
Interviewers follow the thread you open, so open with the grain.`,
    mcqs: [
      mcq('An interviewer asks you to design a ride-hailing warehouse. What should you state first?', [
        ['The business processes and the grain of each fact table', true],
        ['The warehouse product and the size of cluster you would buy', false],
        ['The full list of columns in the app\'s production trips table', false],
        ['The dashboard tool and the colours of the main charts in it', false],
      ], 'Grain drives every other modelling decision, and interviewers listen for it first. Product and cluster size are platform choices for later, copying the app table skips the modelling, and dashboard design comes after the model exists.'),
      mcq('In a Type 2 answer, the interviewer asks why you keep a hash column. What is the best reply?', [
        ['It detects a change in any tracked column with one comparison', true],
        ['It replaces the surrogate key as the join key for the fact table', false],
        ['It encrypts personal data in the dimension to meet the DPDP Act', false],
        ['It lets the warehouse sort the dimension faster during queries', false],
      ], 'Comparing one hash of the tracked columns is cheaper and less error-prone than comparing each column. Facts still join on the surrogate key, md5 is not encryption and does not make personal data compliant, and it does not speed up sorting.'),
      mcq('An interviewer asks: "Why not one big table for everything?" Which answer shows the most judgement?', [
        ['Serve OBTs built from a star; alone they freeze attributes and mix grains', true],
        ['OBTs are always slower than stars, so they should never be built at all', false],
        ['OBTs are fine for everything, because storage is cheap and joins are slow', false],
        ['OBTs only work in Spark, so a warehouse team should not consider them', false],
      ], 'OBTs are useful serving tables but a poor sole source of truth; generating them from a star keeps their convenience without their drift. They are often faster, not slower, joins to small dimensions are cheap, and any SQL engine can build an OBT.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_MINI_PROJECT',
    notes: `## The scenario

Swaadly is a fictional food-delivery company in Hyderabad. Customers order from restaurants across Gachibowli,
Madhapur, Kukatpally, Banjara Hills, Secunderabad and Kondapur; riders deliver; Swaadly earns a commission from
restaurants (on a STANDARD or PREMIUM plan) plus delivery fees, and pays for coupons. Today every report is a
five-join query on a copy of the app database, and the numbers disagree between teams. You are the first data
engineer. Your job: design and build the warehouse model, load a month of data, and answer the leadership team's
five questions from your model alone.

## The data

Run this generator (DuckDB 2.0 from Python; it ran as written) to create the source database swaadly_src.duckdb
with five tables. Values are synthetic and random, so your counts will differ slightly from anyone else's.

    import duckdb
    con = duckdb.connect("swaadly_src.duckdb")
    con.sql("""CREATE OR REPLACE TABLE restaurants AS
    SELECT 'R' || lpad(i::VARCHAR, 3, '0') AS restaurant_id,
           ['Golconda Biryani','Deccan Dosa House','Lakdi Ka Pul Wok','Nawabi Handi',
            'Tank Bund Sweets'][1 + i % 5] || ' ' || i AS name,
           ['Banjara Hills','Gachibowli','Kukatpally','Madhapur','Secunderabad','Kondapur'][1 + i % 6] AS area,
           ['Biryani','South Indian','Chinese','North Indian','Desserts'][1 + i % 5] AS cuisine,
           CASE WHEN i % 7 = 0 THEN 'PREMIUM' ELSE 'STANDARD' END AS commission_plan
    FROM range(1, 61) r(i)""")
    con.sql("""CREATE OR REPLACE TABLE customers AS
    SELECT 'C' || i AS customer_id,
           ['Gachibowli','Madhapur','Kukatpally','Ameerpet','Uppal','LB Nagar'][1 + i % 6] AS area,
           DATE '2025-01-01' + CAST(i % 600 AS INTEGER) AS signup_date
    FROM range(1, 3001) r(i)""")
    con.sql("""CREATE OR REPLACE TABLE orders AS
    SELECT 'O' || i AS order_id, 'C' || (1 + CAST(random() * 2999 AS INTEGER)) AS customer_id,
           'R' || lpad((1 + CAST(random() * 59 AS INTEGER))::VARCHAR, 3, '0') AS restaurant_id,
           TIMESTAMP '2026-09-01 08:00' + to_minutes(CAST(random() * 60 * 24 * 30 AS BIGINT)) AS placed_at,
           CASE WHEN random() < 0.06 THEN 'CANCELLED' ELSE 'DELIVERED' END AS status,
           round(20 + random() * 40) AS delivery_fee,
           CASE WHEN random() < 0.3 THEN 75 ELSE 0 END AS coupon_discount,
           'D' || (1 + CAST(random() * 199 AS INTEGER)) AS rider_id
    FROM range(1, 20001) r(i)""")
    con.sql("""CREATE OR REPLACE TABLE order_items AS
    SELECT order_id, line_no, item_id, qty, unit_price FROM (
      SELECT o.order_id, k AS line_no, 'ITEM' || (1 + CAST(random() * 400 AS INTEGER)) AS item_id,
             1 + CAST(random() * 2 AS INTEGER) AS qty, round(80 + random() * 420) AS unit_price,
             random() AS keep
      FROM orders o, range(1, 4) r(k))
    WHERE line_no = 1 OR keep < 0.5""")
    con.sql("""CREATE OR REPLACE TABLE restaurant_changes AS SELECT * FROM (VALUES
      ('R007', DATE '2026-09-12', 'commission_plan', 'STANDARD'),
      ('R014', DATE '2026-09-18', 'area', 'Kondapur'),
      ('R021', DATE '2026-09-25', 'commission_plan', 'STANDARD'),
      ('R030', DATE '2026-09-20', 'cuisine', 'Chinese'))
      t(restaurant_id, effective_date, attribute, new_value)""")

You get 60 restaurants, 3,000 customers, 20,000 orders (about 6% cancelled) and about 40,000 order items, placed
between 1 September and the morning of 1 October 2026. placed_at is already in IST. restaurants holds each
restaurant's state on 1 September; restaurant_changes lists four changes during the month with their effective
dates. (Keep the random generation inside a subquery as shown: a random() written directly in a WHERE clause over
a cross join was evaluated once, not per row, and produced all or nothing.)

## What to build

**1. Design document (design.md).** The business processes you model (at least orders and order items; deliveries
are optional), a bus matrix, the declared grain of every fact table in one sentence each, every dimension with its
columns, which columns are Type 1 and which Type 2 and why, and the additive, semi-additive and non-additive measures.
Draw the star (a hand-drawn photo is fine).

**2. The model in DuckDB (build.sql or build.py).** At least:
- dim_date (one row per day, with day name, week, weekend flag), dim_customer, dim_restaurant as **Type 2** on area,
  cuisine and commission_plan (surrogate key, valid_from, valid_to half-open, is_current), and a -1 Unknown row in
  each dimension.
- fact_order_item at item grain and fact_order at order grain (delivery_fee and coupon_discount live here, or you
  allocate them to items and explain the rule).
- Facts carry the restaurant_key of the version valid on the order date.

**3. A repeatable Type 2 load.** Write the load as the three-step transaction from the lesson, run it once for the
1 September state, then apply restaurant_changes in effective-date order. Show that a second run changes nothing.

**4. Checks (checks.sql).** Each must return no rows: grain uniqueness on both facts, exactly one current row per
restaurant, no overlapping validity ranges, every fact key found in its dimension. Plus a reconciliation: total
delivered item value and order count from your facts equal the same numbers computed straight from the source.

**5. Five business questions, answered from your model only (answers.sql and a results table in the README).**
1. Delivered orders and item value (GMV) by restaurant area per week. For R014, which area gets its orders before
   and after 18 September?
2. GMV and commission plan in force: for R007 and R021, GMV under PREMIUM and under STANDARD in September.
3. Average order value and average items per order by cuisine (careful: averages of order-level numbers need the
   order grain).
4. Coupon cost as a share of GMV by restaurant area, without double-counting coupons.
5. The top five restaurants by repeat customers (customers with two or more delivered orders there), with the
   repeat share of their customers.

## Milestones

- **Day 1.** Generate the data, explore it, write the grain sentences and bus matrix. Get the design reviewed by a
  peer before writing SQL.
- **Day 2.** Build dimensions, including the Type 2 load and its re-run test.
- **Day 3.** Build both facts with point-in-time lookups; write and pass the checks and the reconciliation.
- **Day 4.** Answer the five questions; write the README with results and three decisions you would defend in an
  interview (for example, why coupons sit on fact_order, why area is Type 2).

## What reviewers look for

A grain stated before any column; no number that changes when it is joined; Type 2 history that matches
restaurant_changes exactly; checks that would catch a regression; and a README a teammate could rerun in ten
minutes. Stretch goals: a deliveries accumulating snapshot using rider_id with simulated picked-up and delivered
times; an OBT for a "restaurant partner dashboard" built from your star; the same model written as a small dbt
project once you reach the dbt topic.`,
    assignment: {
      title: 'Swaadly Warehouse: a Dimensional Model for Food Delivery in DuckDB',
      description: 'Design and build a star schema for a fictional Hyderabad food-delivery company: declared grains, an order-item and an order fact, conformed dimensions, a Type 2 restaurant dimension loaded repeatably, data checks and a reconciliation, and five business questions answered from the model alone.',
      instructions: `1. Run the generator from the brief to create swaadly_src.duckdb.
2. Write design.md: processes, bus matrix, one-sentence grain per fact, dimensions with columns, SCD type per column with reasons, measure additivity, and a star diagram.
3. Build dim_date, dim_customer and dim_restaurant (Type 2 on area, cuisine and commission_plan; half-open validity; -1 Unknown rows) and fact_order_item and fact_order in DuckDB.
4. Load dim_restaurant with the three-step transaction, apply restaurant_changes in date order, and show that a re-run changes nothing.
5. Write checks.sql: grain uniqueness, one current row per restaurant, no overlapping ranges, every fact key found; and a reconciliation of delivered GMV and order count against the source.
6. Answer the five business questions in answers.sql using only the model, and put the results in the README.
7. In the README, give setup steps, the results, and three modelling decisions you would defend in an interview.`,
      rubric: [
        { criterion: 'Design and grain', description: 'Processes and bus matrix are sensible; each fact has a precise one-sentence grain; order-level amounts are kept at order grain or allocated with a stated rule; measures are classified correctly.', maxPoints: 25 },
        { criterion: 'Type 2 dimension and load', description: 'dim_restaurant has surrogate keys, half-open validity, one current row per restaurant and an Unknown member; history matches restaurant_changes exactly; the load is transactional and a re-run changes nothing.', maxPoints: 25 },
        { criterion: 'Facts and point-in-time lookups', description: 'Facts carry the version key valid on the order date; no fact is dropped or duplicated by a join; the two grains are never mixed in one table.', maxPoints: 15 },
        { criterion: 'Checks and reconciliation', description: 'Every listed check exists and returns no rows; the reconciliation matches the source; at least one check is shown catching a planted error.', maxPoints: 15 },
        { criterion: 'Business answers', description: 'All five questions are answered correctly from the model, including the before-and-after for R014, the plan split for R007 and R021, averages at the right grain and coupons without double-counting.', maxPoints: 12 },
        { criterion: 'README and defence', description: 'Clear setup steps a teammate can follow in ten minutes, results tables, and three well-argued modelling decisions.', maxPoints: 8 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the Swaadly model, where should coupon_discount live so that question 4 does not double-count it?', [
        ['On fact_order at order grain, or allocated across items by a stated rule', true],
        ['On fact_order_item, repeated on each item row of the order it belongs to', false],
        ['On dim_customer, since a coupon is an attribute of the customer using it', false],
        ['On dim_restaurant, since the restaurant is the party that funds coupons', false],
      ], 'A coupon applies to an order, so it belongs at order grain or must be split across items so items add back to the order. Repeating it per item double-counts, and it is a measured amount on an event, not an attribute of a customer or restaurant (Swaadly pays for coupons in this scenario anyway).'),
      mcq('R007 moved from PREMIUM to STANDARD on 12 September. How should an order placed on 12 September be attributed?', [
        ['To the STANDARD version, since valid_from is inclusive', true],
        ['To the PREMIUM version, since valid_to is inclusive', false],
        ['To both versions, splitting the order value in half', false],
        ['To the Unknown member until the new plan has been confirmed', false],
      ], 'With half-open ranges the change day belongs to the new version: 12 September satisfies valid_from <= date for STANDARD and fails date < valid_to for PREMIUM. Inclusive valid_to would create a double match, splitting invents a rule, and Unknown is for keys with no version at all.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DE_DATA_MODELLING_CHECKPOINT',
    notes: `Ten questions across the topic: OLTP and OLAP, normalisation, dimensional modelling and grain, slowly changing
dimensions and their loads, and modern approaches. Answer without notes; the result shows which lesson to revisit.`,
    checkpoint: [
      mcq('A data engineer must pick between a row store and a column store for a table queried as "sum of three columns across 2 billion rows". Which is the better fit, and why?', [
        ['A column store, since it reads only the three columns it needs', true],
        ['A row store, since each row is stored together in one disk block', false],
        ['A row store, since B-tree indexes make full-table scans quicker', false],
        ['Either, since storage layout does not change how much is read', false],
      ], 'A column store reads just the needed columns, compressed, and skips blocks using min/max statistics. Row layout forces reading every column, B-tree indexes do not speed up a full aggregation, and layout is exactly what decides how much is read.'),
      mcq('In a 3NF app database, a customer\'s city is also copied onto each of their orders. Which problem is this most likely to cause?', [
        ['Orders for one customer showing different cities after a partial update', true],
        ['Orders that cannot be inserted until the customer has a city recorded on file', false],
        ['Queries that need an extra join between the customers and the orders', false],
        ['A customer\'s row vanishing when their last order is cancelled', false],
      ], 'Copies of a fact maintained by many writers drift apart: the update anomaly. Copying city onto orders does not block inserts, it removes a join rather than adding one, and it does not delete customers.'),
      mcq('Which grain statement is precise enough for a payments fact table?', [
        ['One row per payment attempt, including failed and retried attempts', true],
        ['One row for each payment, with all the useful columns we might need', false],
        ['The payments table from the app, loaded into the warehouse each day', false],
        ['Payment data summarised to a level that suits most of the dashboards', false],
      ], 'A grain names exactly what one row represents, including edge cases like retries. "Each payment" is ambiguous about attempts, copying the app table names a source rather than a grain, and "a level that suits dashboards" declares nothing.'),
      mcq('A daily snapshot fact stores each merchant\'s settled_balance. Which aggregation is meaningful across a month?', [
        ['The closing balance on the last day, or the average daily balance', true],
        ['The sum of settled_balance over every single day of that month, in rupees', false],
        ['The count of distinct balance values seen across the month', false],
        ['The sum over all the days, divided by the number of merchants', false],
      ], 'A balance is semi-additive: sum across merchants on a day, but across time take the closing value or an average. Summing over days counts the same money repeatedly, distinct values mean nothing, and dividing that sum by merchants is still the wrong total.'),
      mcq('Why should a warehouse dimension have its own surrogate key instead of the source system\'s id?', [
        ['Versions and multiple sources need a key that the source id cannot provide', true],
        ['Source ids are personal data and are never allowed to reach the warehouse', false],
        ['Surrogate keys let the warehouse skip loading the source id column at all', false],
        ['Surrogate keys are required by every BI tool before it can read any table', false],
      ], 'A Type 2 dimension has several rows per source id, the same entity may arrive from two systems, and an Unknown member needs a key of its own; a surrogate key handles all three. Source ids are usually kept as ordinary columns, are not inherently personal data, and BI tools have no such rule.'),
      mcq('Bazaarly needs "sales by seller tier at the time of sale" and "sales by seller tier today". Which design supports both?', [
        ['A Type 2 dimension, joined by version key or through to the current row', true],
        ['A Type 1 dimension, re-run each day so that both answers are up to date', false],
        ['A Type 3 dimension with current_tier and previous_tier columns on it', false],
        ['Two fact tables, one storing the old tier and one storing the new tier', false],
      ], 'Type 2 keeps every version: join on the stored version key for "at the time", or via the natural key to is_current for "today". Type 1 loses history, Type 3 keeps only one earlier value, and two fact tables duplicate the facts instead of modelling the attribute.'),
      mcq('A Type 2 load for dim_customer closes changed rows and inserts new versions in separate, untransacted steps. The job dies between them. What state is the table in?', [
        ['Changed customers have no current row until the job is rerun and finishes', true],
        ['Changed customers have two current rows, the old one and the new one', false],
        ['Nothing changed, since DuckDB rolls back every statement of a failed job', false],
        ['New customers are duplicated, because the insert ran twice in the job', false],
      ], 'Without a transaction the close is committed and the insert never ran, so changed customers have no current version and new facts fall to Unknown. Two current rows would need the insert to run without the close, separate statements commit individually, and nothing ran twice.'),
      mcq('Which statement about one big tables is accurate?', [
        ['They are easy to query but freeze dimension values until rebuilt', true],
        ['They need more joins at query time than the star they come from', false],
        ['They cannot be stored in Parquet because they are too wide', false],
        ['They make Type 2 dimensions unnecessary in the layers below', false],
      ], 'An OBT trades flexibility for convenience: no joins, but attribute values are those at build time. It has fewer joins, not more, wide tables are exactly what Parquet handles well, and history still has to be modelled underneath it.'),
      mcq('A bank with 40 source systems and strict auditors wants every historical value traceable to its source. Which approach suits its integration layer?', [
        ['A data vault of hubs, links and insert-only satellites with record sources', true],
        ['One big table rebuilt nightly from the latest snapshot of every source', false],
        ['A single star schema loaded directly from all 40 sources with Type 1 only', false],
        ['No integration layer; analysts query each source system when they need it', false],
      ], 'Data vault is designed for many sources, auditability and insert-only history, with stars as marts on top. A nightly OBT and Type 1 dimensions discard history, and querying 40 sources directly gives no consistent or auditable view.'),
      mcq('In a medallion lakehouse, a silver cleaning rule turns out to be wrong for the last three months. What makes fixing it cheap?', [
        ['Bronze kept the raw data, so silver and gold can be rebuilt from it', true],
        ['Gold tables store every raw column, so silver is not needed again', false],
        ['The source systems are asked to resend three months of their data', false],
        ['Silver tables are append-only, so the wrong rows can be left there', false],
      ], 'An untouched, replayable bronze layer means the fixed rule can be re-applied and everything downstream rebuilt. Gold holds business-level models, not raw data, asking sources to resend is slow and often impossible, and leaving wrong rows in silver keeps the error.'),
    ],
  },
];
