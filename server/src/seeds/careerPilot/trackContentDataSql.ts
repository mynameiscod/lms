/**
 * Career-track content: SQL for analysts (Data Analytics + AI, batch A1).
 *
 * DT_SQL_ANALYST — SQL written to answer business questions: restating the question, aggregation
 * patterns, joins that keep or double rows, CTEs, and dates, NULLs and messy text.
 * DT_SQL_WINDOWS — window functions and the analyst queries built on them: shares, ranking, running
 * totals, period-over-period change, cohorts, retention and funnels.
 *
 * The years already teach SELECT through joins, GROUP BY and design; this builds on them. Every result
 * table shown was produced by running the query (SQLite 3.50 standing in for the server); where MySQL,
 * PostgreSQL and SQL Server differ, the notes say so and show the forms. Both topics are single-skill,
 * so checkpoint questions carry no skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_DATA_SQL_BUNDLES: PilotBundle[] = [
  /* ══ DT_SQL_ANALYST ══════════════════════════════════════════════════════════════════════ */

  /* ── QUESTION_TO_QUERY ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_QUESTION_TO_QUERY',
    notes: `You already know how to write SELECT, WHERE, GROUP BY and JOIN. An analyst's real problem is
different: the manager does not hand you a query, they hand you a sentence — *"How are sales doing?"* —
and the work is turning that sentence into a question precise enough to have exactly one right answer.

## The data used through this topic

ShopKart is a small online store in Pune. Its database has four tables (they are small on purpose, so
you can check every answer by eye):

- **customers** (customer_id, name, city, signup_date) — 6 rows: Aarav and Kabir (Pune), Diya and
  Rohan (Mumbai), Meera (Chennai), Sneha (Delhi, signed up but never ordered).
- **products** (product_id, name, category, price) — 6 rows, including a Yoga Mat that has never sold.
- **orders** — one row per order:

      order_id | customer_id | order_date | status    | amount | discount
      ---------+-------------+------------+-----------+--------+---------
      1001     | 1           | 2024-01-07 | DELIVERED | 1200   | NULL
      1002     | 2           | 2024-01-22 | DELIVERED | 2500   | 200
      1003     | 1           | 2024-02-03 | CANCELLED | 700    | NULL
      1004     | 3           | 2024-02-14 | DELIVERED | 1500   | 100
      1005     | 2           | 2024-02-28 | DELIVERED | 3200   | NULL
      1006     | 4           | 2024-03-01 | RETURNED  | 1800   | NULL
      1007     | 1           | 2024-03-09 | DELIVERED | 950    | 50
      1008     | 5           | 2024-03-10 | DELIVERED | 2150   | NULL
      1009     | 3           | 2024-03-21 | DELIVERED | 1800   | NULL
      1010     | 2           | 2024-04-02 | DELIVERED | 3000   | 300
      1011     | 5           | 2024-04-15 | CANCELLED | 2500   | NULL
      1012     | 4           | 2024-04-18 | DELIVERED | 950    | NULL

- **order_items** (order_id, product_id, qty, unit_price) — one row per product line; 16 rows, because
  orders 1005, 1007, 1008 and 1012 have two lines each.

## Step 1: restate the question until it has one answer

"How are sales doing?" hides at least four decisions:

| Decision | Choices | What we pick (and say out loud) |
|---|---|---|
| What counts as a sale? | every order / only DELIVERED | DELIVERED — cancelled and returned orders earned nothing |
| Measured how? | order count / revenue in ₹ / units | both order count and revenue |
| Over what period, at what step? | daily / weekly / monthly | calendar month, Jan–Apr 2024 |
| Compared with what? | last month / target / last year | month against month |

The precise version: **"Delivered revenue (₹) and number of delivered orders, per calendar month,
January to April 2024."** Write that sentence at the top of your query as a comment. When the result
surprises someone, the disagreement is usually about the sentence, not the SQL.

## Step 2: know the grain of every table

The **grain** is what one row means. In orders, one row = one order. In order_items, one row = one
product line of an order. Mixing grains is the source of most wrong totals, so check before you trust a
table:

    SELECT COUNT(*) AS line_rows, COUNT(DISTINCT order_id) AS orders
    FROM order_items;

    line_rows | orders
    ----------+-------
    16        | 12

16 rows but 12 orders: order_items is *not* one row per order. Summing orders.amount after joining to it
would count some orders twice (the joins unit shows exactly how much).

## Step 3: write the query that answers the sentence

    -- Delivered revenue and orders per calendar month, Jan–Apr 2024
    SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,      -- MySQL
           COUNT(*)    AS orders,
           SUM(amount) AS revenue
    FROM orders
    WHERE status = 'DELIVERED'
    GROUP BY DATE_FORMAT(order_date, '%Y-%m')
    ORDER BY month;

    month   | orders | revenue
    --------+--------+--------
    2024-01 | 2      | 3700
    2024-02 | 2      | 4700
    2024-03 | 3      | 4900
    2024-04 | 2      | 3950

In SQL Server write \`FORMAT(order_date, 'yyyy-MM')\` (or \`DATETRUNC(month, order_date)\` on 2022+);
in PostgreSQL \`TO_CHAR(order_date, 'YYYY-MM')\` or \`DATE_TRUNC('month', order_date)\`. The dates unit
covers this properly.

## Step 4: reconcile before you report

Never send a number you have not cross-checked against a second, simpler query:

    SELECT status, COUNT(*) AS orders, SUM(amount) AS amount
    FROM orders GROUP BY status;

    status    | orders | amount
    ----------+--------+-------
    CANCELLED | 2      | 3200
    DELIVERED | 9      | 17250
    RETURNED  | 1      | 1800

The monthly orders add to 2 + 2 + 3 + 2 = 9 and the revenue to 3700 + 4700 + 4900 + 3950 = ₹17,250 —
both match the DELIVERED row. The three status rows add to 12 orders, which is every row in the table.
If either check had failed, a filter or a join would be dropping or duplicating rows.

## Habits that keep you honest

- Run \`SELECT COUNT(*)\` on every table you touch, and again after every join.
- Filter with an explicit list of statuses, never "everything except CANCELLED" — a new status such as
  RETURNED would silently slip in.
- Keep the question sentence, the query and the reconciliation together; that is what a reviewer asks
  for.`,
    workedExample: `**Brief from the marketing lead:** "Which city did best in March?"

**1. Make it precise.** "Did best" → delivered revenue in ₹ (marketing pays per city, so revenue is what
they mean — confirm it). "March" → 1 to 31 March 2024. Sentence: *Delivered revenue and delivered orders
per customer city, March 2024, highest revenue first.*

**2. Find the grain and the join.** City lives in customers (one row per customer), the money in orders
(one row per order). Joining orders → customers is many-to-one, so it cannot duplicate orders.

**3. Look at the raw rows first.**

    SELECT order_id, customer_id, status, amount
    FROM orders
    WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01';

    order_id | customer_id | status    | amount
    ---------+-------------+-----------+-------
    1006     | 4           | RETURNED  | 1800
    1007     | 1           | DELIVERED | 950
    1008     | 5           | DELIVERED | 2150
    1009     | 3           | DELIVERED | 1800

Four March orders, one RETURNED — so expect three rows to survive the status filter.

**4. Write the answer.**

    SELECT c.city, COUNT(*) AS orders, SUM(o.amount) AS revenue
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.status = 'DELIVERED'
      AND o.order_date >= '2024-03-01' AND o.order_date < '2024-04-01'
    GROUP BY c.city
    ORDER BY revenue DESC;

    city   | orders | revenue
    -------+--------+--------
    Pune   | 2      | 2750
    Mumbai | 1      | 2150

**5. Reconcile.** 2 + 1 = 3 orders and 2750 + 2150 = ₹4,900, the March figure from the monthly query.

**6. Report with the caveat.** "Pune led March with ₹2,750 from 2 delivered orders. Chennai had one
order (₹1,800) but it was returned, so it does not appear." The caveat is what stops a manager asking
"where is Chennai?" in the meeting.`,
    mcqs: [
      mcq('A manager asks ShopKart "how many customers do we have?". The customers table has 6 rows; 5 of them have placed an order and 5 have a delivered order. What should you do before answering?', [
        ['Ask whether they mean signed-up, ordering or delivered customers', true],
        ['Report 6, since a COUNT(*) on customers is always the right figure', false],
        ['Report 5, since customers who never ordered are not customers', false],
        ['Average the counts and report 5.5 as a compromise', false],
      ], 'The same word covers different definitions with different numbers. An analyst states the definition, and here the counts happen to differ, so the question has to be pinned down first.'),
      mcq('In ShopKart, `SELECT COUNT(*), COUNT(DISTINCT order_id) FROM order_items` returns 16 and 12. What does that tell you about the order_items table?', [
        ['Its grain is one row per product line, not per order', true],
        ['Four of its rows are duplicates that should be deleted', false],
        ['Four orders are missing from the orders table itself', false],
        ['The DISTINCT keyword has dropped four valid orders', false],
      ], 'Some orders have more than one product line, so the table has more rows than orders. That is correct data at a finer grain — and a warning that joining it to orders will repeat order rows.'),
      mcq('Why is "status IN (\'DELIVERED\')" safer than "status <> \'CANCELLED\'" when defining revenue at ShopKart?', [
        ['A new status such as RETURNED is excluded unless you add it on purpose', true],
        ['The <> operator cannot be used on text columns in MySQL or in SQL Server', false],
        ['IN runs faster because it is always read from an index', false],
        ['<> treats the word CANCELLED as case-sensitive in every database', false],
      ], 'An explicit list states what counts. "Everything except CANCELLED" silently includes any status added later — RETURNED orders were already being counted as revenue that way.'),
    ],
    checkpoint: [
      mcq('ShopKart\'s monthly delivered-revenue query returns 3700, 4700, 4900 and 3950 for January to April. Which check best confirms it lost and duplicated nothing?', [
        ['Their sum equals SUM(amount) for DELIVERED orders, ₹17,250', true],
        ['Each month\'s figure is larger than zero and also below ₹10,000', false],
        ['The query ran without an error in under a second', false],
        ['The months come out sorted in calendar order', false],
      ], 'Reconciling the breakdown against an independent total catches dropped and double-counted rows. Speed, sorting and plausible ranges say nothing about correctness.'),
      mcq('"Which city did best in March?" Which restatement can actually be answered with one query?', [
        ['Delivered revenue per customer city for 1–31 March 2024, highest first', true],
        ['The city that performed best for us across the month of March', false],
        ['The city with the most activity of any kind in March 2024', false],
        ['Which city our customers in March seemed happiest with', false],
      ], 'A precise restatement names the measure, the filter, the period and the ordering. "Best", "activity" and "happiest" each still need a definition before SQL can be written.'),
      mcq('A food-delivery table deliveries has one row per order. After joining it to delivery_ratings you get more rows than deliveries had. What is the most likely reason?', [
        ['Some orders have more than one rating row', true],
        ['The JOIN keyword removes the rows that have no match', false],
        ['delivery_ratings is missing its primary key column', false],
        ['The two tables use different character sets', false],
      ], 'An inner join can only drop or repeat rows. Getting more rows means some order matched several ratings, so the result is no longer one row per order and order-level sums would be inflated.'),
    ],
  },

  /* ── AGGREGATION_PATTERNS ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_AGGREGATION_PATTERNS',
    notes: `GROUP BY with one column and SUM is where the years left off. Analysts use a handful of patterns
on top of it every day. All examples use ShopKart's orders, customers, products and order_items.

## Grouping by more than one column

Each distinct combination of the GROUP BY columns becomes one row:

    SELECT c.city, o.status, COUNT(*) AS orders, SUM(o.amount) AS amount
    FROM orders o JOIN customers c ON c.customer_id = o.customer_id
    GROUP BY c.city, o.status
    ORDER BY c.city, o.status;

    city    | status    | orders | amount
    --------+-----------+--------+-------
    Chennai | DELIVERED | 1      | 950
    Chennai | RETURNED  | 1      | 1800
    Mumbai  | CANCELLED | 1      | 2500
    Mumbai  | DELIVERED | 4      | 10850
    Pune    | CANCELLED | 1      | 700
    Pune    | DELIVERED | 4      | 5450

Combinations that never occur (Chennai + CANCELLED) simply have no row; they are not shown as 0.

## WHERE filters rows, HAVING filters groups

"Customers with at least two delivered orders":

    SELECT customer_id, COUNT(*) AS delivered_orders, SUM(amount) AS revenue
    FROM orders
    WHERE status = 'DELIVERED'        -- row filter, before grouping
    GROUP BY customer_id
    HAVING COUNT(*) >= 2              -- group filter, after grouping
    ORDER BY revenue DESC;

    customer_id | delivered_orders | revenue
    ------------+------------------+--------
    2           | 3                | 8700
    3           | 2                | 3300
    1           | 2                | 2150

An aggregate cannot go in WHERE (WHERE runs before groups exist). A plain row condition *can* go in
HAVING, but put it in WHERE — fewer rows reach the grouping step.

## COUNT, COUNT(column) and COUNT(DISTINCT)

    SELECT COUNT(*) AS orders, COUNT(DISTINCT customer_id) AS buyers
    FROM orders WHERE status = 'DELIVERED';

    orders | buyers
    -------+-------
    9      | 5

COUNT(*) counts rows; COUNT(col) counts rows where col is not NULL; COUNT(DISTINCT col) counts different
non-NULL values. "How many customers bought?" is a DISTINCT question — 9 orders came from 5 people.

## Conditional aggregation: several measures in one pass

Put a CASE inside the aggregate. Each measure picks the rows it cares about:

    SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,                    -- MySQL
           COUNT(*) AS all_orders,
           SUM(CASE WHEN status = 'DELIVERED' THEN amount ELSE 0 END) AS delivered_revenue,
           COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)          AS cancelled,
           ROUND(100.0 * COUNT(CASE WHEN status <> 'DELIVERED' THEN 1 END) / COUNT(*), 1)
                                                                      AS not_delivered_pct
    FROM orders
    GROUP BY DATE_FORMAT(order_date, '%Y-%m')
    ORDER BY month;

    month   | all_orders | delivered_revenue | cancelled | not_delivered_pct
    --------+------------+-------------------+-----------+------------------
    2024-01 | 2          | 3700              | 0         | 0.0
    2024-02 | 3          | 4700              | 1         | 33.3
    2024-03 | 4          | 4900              | 0         | 25.0
    2024-04 | 3          | 3950              | 1         | 33.3

\`COUNT(CASE WHEN ... THEN 1 END)\` works because a CASE with no ELSE gives NULL, and COUNT skips NULLs.
\`SUM(CASE WHEN ... THEN 1 ELSE 0 END)\` is the equivalent written the other way. This one pattern
replaces several separate queries glued together in Excel.

## Rates and the integer-division trap

    SELECT COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) / COUNT(*) AS cancel_rate
    FROM orders;

In **SQL Server, PostgreSQL and SQLite** both sides are integers, so 2 / 12 is integer division and the
answer is **0**. MySQL's \`/\` always returns a decimal (0.1667; MySQL's integer division is \`DIV\`).
Write it so it is right everywhere — multiply by \`100.0\` first:

    SELECT ROUND(100.0 * COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) / COUNT(*), 1) AS cancel_pct
    FROM orders;      -- 16.7

## Percentage of a total

Each category's share of delivered revenue needs the grand total on every row. Without window functions
(next topic) use a scalar subquery:

    SELECT p.category,
           SUM(i.qty * i.unit_price) AS revenue,
           ROUND(100.0 * SUM(i.qty * i.unit_price) /
                 (SELECT SUM(i2.qty * i2.unit_price)
                  FROM order_items i2 JOIN orders o2 ON o2.order_id = i2.order_id
                  WHERE o2.status = 'DELIVERED'), 1) AS pct_of_total
    FROM order_items i
    JOIN orders o   ON o.order_id = i.order_id
    JOIN products p ON p.product_id = i.product_id
    WHERE o.status = 'DELIVERED'
    GROUP BY p.category
    ORDER BY revenue DESC;

    category    | revenue | pct_of_total
    ------------+---------+-------------
    Electronics | 5000    | 29.0
    Fashion     | 4500    | 26.1
    Grocery     | 4200    | 24.3
    Home        | 3550    | 20.6

Check: 5000 + 4500 + 4200 + 3550 = ₹17,250 (the delivered total) and the shares add to 100.0. Revenue
here is summed at the order_items grain (qty × unit_price), which is correct for a per-product split;
summing orders.amount after this join would not be.

## The GROUP BY rule

Every column in SELECT must be either in GROUP BY or inside an aggregate. MySQL with
ONLY_FULL_GROUP_BY (the default since 5.7) raises error 1055, SQL Server raises 8120 and PostgreSQL says
the column "must appear in the GROUP BY clause". Older MySQL quietly picked an arbitrary value — a wrong
answer with no error.`,
    workedExample: `**Brief:** "For each city, give me delivered revenue, the number of buyers, and the share of
orders that did not get delivered."

**1. Grain of the output:** one row per city. **Grain of the input:** orders (one row per order) joined
to customers for city — many-to-one, so no duplication.

**2. Each measure is a different filter over the same rows** — a job for conditional aggregation, not
three queries:

    SELECT c.city,
           SUM(CASE WHEN o.status = 'DELIVERED' THEN o.amount ELSE 0 END) AS delivered_revenue,
           COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.customer_id END) AS buyers,
           COUNT(*) AS all_orders,
           ROUND(100.0 * COUNT(CASE WHEN o.status <> 'DELIVERED' THEN 1 END) / COUNT(*), 1)
                AS not_delivered_pct
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    GROUP BY c.city
    ORDER BY delivered_revenue DESC;

**3. Work out what to expect from the city/status table in the notes.** Mumbai: 4 delivered (₹10,850)
from Diya and Rohan, 1 cancelled, so 5 orders and 1/5 = 20.0% not delivered. Pune: ₹5,450 from Aarav
and Kabir, 1 cancelled of 5 → 20.0%. Chennai: ₹950 from Meera, 1 returned of 2 → 50.0%.

    city    | delivered_revenue | buyers | all_orders | not_delivered_pct
    --------+-------------------+--------+------------+------------------
    Mumbai  | 10850             | 2      | 5          | 20.0
    Pune    | 5450              | 2      | 5          | 20.0
    Chennai | 950               | 1      | 2          | 50.0

**4. Reconcile:** 10850 + 5450 + 950 = ₹17,250 and 5 + 5 + 2 = 12 orders. Delhi is missing because
Sneha never ordered — mention it, or LEFT JOIN from customers if the manager wants every city listed.

Note \`COUNT(DISTINCT CASE ... THEN customer_id END)\`: distinct buyers among delivered orders only.
Plain \`COUNT(DISTINCT o.customer_id)\` would also count a customer whose only order was cancelled.`,
    mcqs: [
      mcq('In SQL Server, `SELECT SUM(CASE WHEN status = \'RETURNED\' THEN 1 ELSE 0 END) / COUNT(*) FROM orders` on ShopKart returns 0, though one of 12 orders was returned. Why?', [
        ['Both operands are integers, so the division truncates', true],
        ['CASE expressions always return 0 when used inside SUM', false],
        ['COUNT(*) ignores the RETURNED row while counting', false],
        ['SQL Server cannot compare a text column inside CASE', false],
      ], 'SUM of 1s and COUNT(*) are both integers, and SQL Server (like PostgreSQL) does integer division, so 1/12 is 0. Multiply by 100.0 first; MySQL\'s / would have given a decimal.'),
      mcq('Which query lists ShopKart customers whose delivered revenue is at least ₹3,000?', [
        ['WHERE status = \'DELIVERED\' GROUP BY customer_id HAVING SUM(amount) >= 3000', true],
        ['WHERE status = \'DELIVERED\' AND SUM(amount) >= 3000 GROUP BY customer_id', false],
        ['GROUP BY customer_id WHERE SUM(amount) >= 3000 AND status = \'DELIVERED\'', false],
        ['HAVING status = \'DELIVERED\' GROUP BY customer_id WHERE SUM(amount) >= 3000', false],
      ], 'The row filter goes in WHERE before GROUP BY, and the condition on the group total goes in HAVING after it. An aggregate is not allowed in WHERE, and WHERE cannot follow GROUP BY.'),
      mcq('ShopKart had 9 delivered orders from 5 different customers. Which expression gives the 5?', [
        ['COUNT(DISTINCT customer_id)', true],
        ['COUNT(customer_id)', false],
        ['SUM(DISTINCT customer_id)', false],
        ['COUNT(*) / COUNT(customer_id)', false],
      ], 'COUNT(DISTINCT customer_id) counts different buyers. COUNT(customer_id) counts non-NULL rows (9), and SUM(DISTINCT ...) adds the id numbers themselves.'),
    ],
    checkpoint: [
      mcq('A bank branch table visits has one row per walk-in with a purpose column. Which expression counts walk-ins whose purpose was \'LOAN\', inside a query grouped by branch?', [
        ['COUNT(CASE WHEN purpose = \'LOAN\' THEN 1 END)', true],
        ['COUNT(purpose = \'LOAN\')', false],
        ['COUNT(*) WHERE purpose = \'LOAN\'', false],
        ['COUNT(DISTINCT purpose) WHERE purpose = \'LOAN\'', false],
      ], 'CASE gives 1 for loan visits and NULL otherwise, and COUNT skips NULLs. COUNT(purpose = \'LOAN\') counts every non-NULL comparison, true or false, and the other two are not valid SQL.'),
      mcq('A college fee table is grouped by department, and SELECT also lists student_name without aggregating it. MySQL 8 with default settings raises error 1055. What is the fix that keeps one row per department?', [
        ['Remove student_name, or wrap it in an aggregate such as MAX()', true],
        ['Add DISTINCT right after SELECT so the error is suppressed', false],
        ['Move the department column into a HAVING clause', false],
        ['Switch off ONLY_FULL_GROUP_BY so MySQL picks a name', false],
      ], 'A department row has many students, so a single student_name is undefined. Either drop it or say which one you want with an aggregate; turning the check off just returns an arbitrary name.'),
      mcq('ShopKart\'s category shares are computed as 100.0 * category revenue / delivered total. The four shares sum to 100.0 but the category revenues add to ₹24,500, not ₹17,250. What is wrong?', [
        ['Revenue was summed from orders.amount after joining order_items', true],
        ['The 100.0 multiplier should have been written as the integer 100', false],
        ['ROUND was applied before the shares were added up', false],
        ['The categories should have been grouped with HAVING', false],
      ], 'Joining orders to order_items repeats each order once per line, so summing the order amount inflates the total (to ₹24,500 here). A per-product split must sum qty × unit_price at the line grain.'),
    ],
  },

  /* ── JOINS_FOR_ANALYSIS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_JOINS_FOR_ANALYSIS',
    notes: `You know INNER and LEFT JOIN from the years. For analysis the question is always the same: **after
this join, does every row still mean what I think it means, and did I keep the rows I need?** A join can
quietly lose rows or multiply them, and both give confident, wrong numbers.

## LEFT JOIN to keep everyone — and count the right thing

"Orders per customer, including customers with none":

    SELECT c.name, COUNT(o.order_id) AS orders
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.customer_id
    GROUP BY c.customer_id, c.name
    ORDER BY c.customer_id;

    name  | orders
    ------+-------
    Aarav | 3
    Diya  | 3
    Kabir | 2
    Meera | 2
    Rohan | 2
    Sneha | 0

Sneha has no orders; the LEFT JOIN keeps her with NULLs in every orders column. **COUNT(o.order_id)**
skips that NULL and gives 0. **COUNT(\*)** would count her one NULL-padded row and report **1** order —
a classic error in a "customers with zero orders" report.

## Anti-joins: finding what never happened

"Customers who have never ordered" and "products that have never sold" are questions about missing
rows. Two standard forms:

    -- LEFT JOIN ... IS NULL
    SELECT c.customer_id, c.name
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.customer_id
    WHERE o.order_id IS NULL;

    -- NOT EXISTS
    SELECT p.product_id, p.name
    FROM products p
    WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.product_id = p.product_id);

The first returns Sneha (6); the second returns the Yoga Mat (106). NOT EXISTS reads closest to the
English and lets you add conditions inside — "customers with no *delivered* order":

    SELECT c.customer_id, c.name
    FROM customers c
    WHERE NOT EXISTS (SELECT 1 FROM orders o
                      WHERE o.customer_id = c.customer_id AND o.status = 'DELIVERED');

**Avoid NOT IN with a subquery on a nullable column.** If the subquery returns even one NULL,
\`x NOT IN (...)\` is never true and the query returns no rows at all. NOT EXISTS has no such trap.

## The filter that turns a LEFT JOIN into an INNER JOIN

"Orders per customer in April, listing every customer":

    -- Wrong: the date filter in WHERE
    SELECT c.name, COUNT(o.order_id) AS april_orders
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.customer_id
    WHERE o.order_date >= '2024-04-01'
    GROUP BY c.customer_id, c.name;

    name  | april_orders
    ------+-------------
    Diya  | 1
    Meera | 1
    Rohan | 1

Only 3 rows: for Aarav, Kabir and Sneha the condition is either false or compares NULL, so WHERE throws
their rows away. Put a condition on the **right-hand** table in the **ON** clause:

    SELECT c.name, COUNT(o.order_id) AS april_orders
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.customer_id
                      AND o.order_date >= '2024-04-01'
    GROUP BY c.customer_id, c.name;

This returns all 6 customers, with 0 for Aarav, Kabir and Sneha.

## The join that multiplies rows (fan-out)

"Delivered revenue" is ₹17,250. Someone adds order_items to the query so they can filter by product
later:

    SELECT SUM(o.amount) AS revenue
    FROM orders o
    JOIN order_items i ON i.order_id = o.order_id
    WHERE o.status = 'DELIVERED';          -- 24500

Delivered orders have 13 item lines, so the 4 two-line orders (1005, 1007, 1008, 1012 — ₹7,250 between
them) are each counted twice: 17,250 + 7,250 = ₹24,500. The rule: **after joining to a "many" table, only
sum columns that live at that many-grain** (qty × unit_price), or keep the order grain and test the
many-side with EXISTS:

    -- Delivered orders containing at least one Home product, and their value
    SELECT COUNT(*) AS orders_with_home, SUM(o.amount) AS revenue
    FROM orders o
    WHERE o.status = 'DELIVERED'
      AND EXISTS (SELECT 1 FROM order_items i JOIN products p ON p.product_id = i.product_id
                  WHERE i.order_id = o.order_id AND p.category = 'Home');

    orders_with_home | revenue
    -----------------+--------
    4                | 7250

The join version of that question reports ₹9,400, because order 1008 has two Home lines.

## A checklist for every join

1. Before: row count of the driving table. After: row count again.
2. Which side is "many"? Only aggregate columns from the many side, or pre-aggregate it in a subquery.
3. Do I need rows with no match? LEFT JOIN from the table whose rows must all appear, and put conditions
   on the other table in ON.
4. Count with COUNT(right_table.key), never COUNT(\*), after a LEFT JOIN.

MySQL has no FULL OUTER JOIN (PostgreSQL and SQL Server do); emulate it with a LEFT JOIN UNION a RIGHT
JOIN if you ever need it.`,
    mcqs: [
      mcq('A report lists every ShopKart customer with COUNT(*) of their orders from a LEFT JOIN. Sneha, who never ordered, shows 1. What change makes her show 0?', [
        ['Count a column from orders, such as COUNT(o.order_id)', true],
        ['Change the LEFT JOIN into an INNER JOIN on customer_id', false],
        ['Add WHERE o.order_id IS NOT NULL before the GROUP BY', false],
        ['Use COUNT(DISTINCT c.customer_id) instead of COUNT(*)', false],
      ], 'The LEFT JOIN gives Sneha one row with NULL order columns; COUNT(*) counts that row, COUNT(o.order_id) skips the NULL. The INNER JOIN and the WHERE filter would remove her entirely.'),
      mcq('An analyst needs ShopKart products that have never appeared in order_items. Which query is correct?', [
        ['FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.product_id = p.product_id)', true],
        ['FROM products p JOIN order_items i ON i.product_id = p.product_id WHERE i.qty = 0', false],
        ['FROM products p JOIN order_items i ON i.product_id <> p.product_id', false],
        ['FROM order_items i LEFT JOIN products p ON p.product_id = i.product_id WHERE p.product_id IS NULL', false],
      ], 'NOT EXISTS keeps products with no matching item line (the Yoga Mat). The <> join pairs nearly everything, the qty = 0 filter looks at lines that exist, and the last query finds item lines with no product — the reverse question.'),
      mcq('Total delivered revenue at ShopKart is ₹17,250, but after joining order_items the same SUM(o.amount) gives ₹24,500. What exactly is the extra ₹7,250?', [
        ['The amounts of delivered orders that have two item lines', true],
        ['The value of the cancelled and the returned orders combined', false],
        ['The discounts that the join has stopped subtracting', false],
        ['Rows from order_items whose product no longer exists', false],
      ], 'Each order is repeated once per item line; the four two-line delivered orders (1005, 1007, 1008, 1012) add up to ₹7,250 and are counted a second time.'),
    ],
    checkpoint: [
      mcq('A retail chain runs: stores s LEFT JOIN sales x ON x.store_id = s.store_id WHERE x.sale_date = \'2024-06-01\'. Stores with no sale that day are missing. What is the fix?', [
        ['Move the date condition from WHERE into the ON clause', true],
        ['Change LEFT JOIN to RIGHT JOIN so stores are kept', false],
        ['Add GROUP BY s.store_id so every store gets a row', false],
        ['Replace the = on the date with a BETWEEN date condition', false],
      ], 'For a store with no sales the joined date is NULL, so the WHERE condition is not true and the row is dropped. In ON, the condition limits which sales match while every store is kept.'),
      mcq('At a college, `SELECT name FROM students WHERE student_id NOT IN (SELECT mentor_id FROM projects)` returns no rows, though many students mentor nothing. What is the likely cause?', [
        ['projects.mentor_id contains at least one NULL', true],
        ['NOT IN only works when the subquery returns one row', false],
        ['student_id and mentor_id need a declared foreign key', false],
        ['The subquery must be written with DISTINCT to work', false],
      ], 'x NOT IN (..., NULL) is never true, because x <> NULL is unknown. Use NOT EXISTS with a correlated condition, or filter mentor_id IS NOT NULL inside the subquery.'),
      mcq('orders (one row per order) is joined to payments, where an order can be paid in two instalments. Which total stays correct after the join?', [
        ['SUM(payments.amount_paid), the column at the payments grain', true],
        ['SUM(orders.order_value), since orders is the main table here', false],
        ['SUM(DISTINCT orders.order_value) to remove the repeats', false],
        ['COUNT(*), because it counts each order exactly once', false],
      ], 'After the join each row is one payment, so only payment-level columns sum correctly. Summing order_value repeats split orders, SUM(DISTINCT) also merges two different orders of equal value, and COUNT(*) counts payments.'),
    ],
  },

  /* ── SUBQUERIES_CTES ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_SUBQUERIES_CTES',
    notes: `Most real questions take more than one step: *"Which customers spend more than the average
customer?"* needs each customer's total first, then the average of those totals, then a comparison. A
**CTE** (common table expression, written with WITH) lets you name each step and read the query top to
bottom.

## A CTE is a named, temporary result

    WITH customer_totals AS (
        SELECT customer_id, SUM(amount) AS spent
        FROM orders
        WHERE status = 'DELIVERED'
        GROUP BY customer_id
    )
    SELECT c.name, t.spent,
           (SELECT AVG(spent) FROM customer_totals) AS avg_customer
    FROM customer_totals t
    JOIN customers c ON c.customer_id = t.customer_id
    WHERE t.spent > (SELECT AVG(spent) FROM customer_totals);

    name | spent | avg_customer
    -----+-------+-------------
    Diya | 8700  | 3450.0

The customer totals are 2150, 8700, 3300, 950 and 2150, so the average customer spent
17,250 / 5 = ₹3,450, and only Diya is above it. Note the difference from "orders above the average
**order**" (₹17,250 / 9 = ₹1,916.67) — which average you compare against is part of the question.

CTEs work in MySQL 8.0+, PostgreSQL and SQL Server (not MySQL 5.7). In SQL Server, the statement before
WITH must end with a semicolon, which is why you often see \`;WITH\`.

## Several steps, one after another

Each CTE can use the ones above it. "What share of buyers bought more than once?":

    WITH delivered AS (
        SELECT customer_id FROM orders WHERE status = 'DELIVERED'
    ),
    per_customer AS (
        SELECT customer_id, COUNT(*) AS n FROM delivered GROUP BY customer_id
    )
    SELECT COUNT(*) AS buyers,
           SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) AS repeat_buyers,
           ROUND(100.0 * SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS repeat_pct
    FROM per_customer;

    buyers | repeat_buyers | repeat_pct
    -------+---------------+-----------
    5      | 3             | 60.0

Debug a CTE chain by replacing the final SELECT with \`SELECT * FROM per_customer\` and checking each step.

## Scalar subqueries: one value

A subquery that returns one row and one column can stand wherever a value can:

    SELECT order_id, amount
    FROM orders
    WHERE status = 'DELIVERED'
      AND amount > (SELECT AVG(amount) FROM orders WHERE status = 'DELIVERED')
    ORDER BY amount DESC;

    order_id | amount
    ---------+-------
    1005     | 3200
    1010     | 3000
    1002     | 2500
    1008     | 2150

If a "scalar" subquery returns more than one row, the query fails at run time ("Subquery returns more
than 1 row" in MySQL, error 512 in SQL Server).

## IN and EXISTS subqueries: a list or a test

    SELECT name FROM customers
    WHERE customer_id IN (SELECT customer_id FROM orders WHERE status = 'CANCELLED');   -- Aarav, Rohan

## Correlated subqueries: re-run for each outer row

A correlated subquery refers to the outer row. "Each customer's most recent order":

    SELECT o.customer_id, o.order_id, o.order_date, o.amount
    FROM orders o
    WHERE o.order_date = (SELECT MAX(o2.order_date)
                          FROM orders o2
                          WHERE o2.customer_id = o.customer_id)
    ORDER BY o.customer_id;

    customer_id | order_id | order_date | amount
    ------------+----------+------------+-------
    1           | 1007     | 2024-03-09 | 950
    2           | 1010     | 2024-04-02 | 3000
    3           | 1009     | 2024-03-21 | 1800
    4           | 1012     | 2024-04-18 | 950
    5           | 1011     | 2024-04-15 | 2500

If a customer had two orders on the same latest date, both would appear; the window-functions topic
shows ROW_NUMBER, which picks exactly one.

## Which to use

- **CTE** when the question has named steps, or a step is used twice (customer_totals above).
- **Scalar subquery** for one comparison value.
- **EXISTS / NOT EXISTS** for "has / has never".
- **Correlated subquery** for small per-row lookups; on big tables a join or window function is
  usually faster.

A CTE is not stored anywhere; it exists only while the statement runs. If several reports need the same
step, that is a case for a view.`,
    workedExample: `**Brief:** "Of the customers who bought from us, what share came back for a second delivered
order? List who they are."

**1. Precise sentence:** Among customers with at least one DELIVERED order, the number and percentage
with two or more DELIVERED orders, and their names.

**2. Plan the steps (one CTE each):** delivered orders → orders per customer → the summary and the list.

**3. Check the middle step on its own:**

    WITH per_customer AS (
        SELECT customer_id, COUNT(*) AS n
        FROM orders WHERE status = 'DELIVERED'
        GROUP BY customer_id
    )
    SELECT * FROM per_customer;

    customer_id | n
    ------------+--
    1           | 2
    2           | 3
    3           | 2
    4           | 1
    5           | 1

Five buyers. Aarav (1) has two delivered orders even though one of his three orders was cancelled — the
filter is doing its job.

**4. The summary** (the query in the notes) returns 5 buyers, 3 repeat buyers, 60.0%.

**5. The list**, reusing the same CTE:

    WITH per_customer AS (
        SELECT customer_id, COUNT(*) AS n
        FROM orders WHERE status = 'DELIVERED'
        GROUP BY customer_id
    )
    SELECT c.name, p.n AS delivered_orders
    FROM per_customer p JOIN customers c ON c.customer_id = p.customer_id
    WHERE p.n >= 2
    ORDER BY p.n DESC, c.name;

    name  | delivered_orders
    ------+-----------------
    Diya  | 3
    Aarav | 2
    Kabir | 2

**6. Report:** "3 of our 5 buyers (60%) have come back for a second delivered order: Diya, Aarav and
Kabir." Say that "buyers" excludes Sneha, who signed up but never ordered — otherwise someone will
compute 3/6 = 50% and think your number is wrong.`,
    mcqs: [
      mcq('ShopKart\'s delivered customer totals are 2150, 8700, 3300, 950 and 2150. Using a CTE of those totals, which customers spend more than the average customer?', [
        ['Only Diya, whose ₹8,700 beats the ₹3,450 average', true],
        ['Diya and Kabir, both above the ₹1,916.67 average', false],
        ['Every customer except Meera, the lowest spender', false],
        ['Diya, Kabir, Aarav and Rohan, above the median', false],
      ], 'The average of the five customer totals is 17,250 / 5 = ₹3,450, and only 8,700 exceeds it. ₹1,916.67 is the average order, a different question.'),
      mcq('In SQL Server, `SELECT 1 AS x WITH t AS (SELECT 2 AS y) SELECT * FROM t` fails to parse. Why do SQL Server scripts often write ;WITH?', [
        ['The statement before WITH must be ended with a semicolon', true],
        [';WITH makes the CTE persist after the whole statement ends', false],
        ['SQL Server needs ;WITH to allow more than one CTE', false],
        ['The semicolon turns the CTE into a temporary table', false],
      ], 'WITH is also used in other SQL Server syntax, so a CTE must start a new statement; the previous one has to be terminated. ;WITH is just a defensive habit.'),
      mcq('`SELECT name FROM customers WHERE customer_id = (SELECT customer_id FROM orders WHERE status = \'CANCELLED\')` fails on ShopKart. What is wrong?', [
        ['Two orders are cancelled, so the = subquery returns two rows', true],
        ['A subquery may not filter on a text column like status', false],
        ['= cannot compare a column with the result of a subquery', false],
        ['customer_id must be listed in a GROUP BY clause before filtering', false],
      ], 'An = comparison needs a single value, but the subquery returns customer ids 1 and 5. Use IN for a list (it returns Aarav and Rohan).'),
    ],
    checkpoint: [
      mcq('A retail chain wants stores whose June sales beat the average store\'s June sales. Which structure answers it most clearly?', [
        ['A CTE of June sales per store, compared with the AVG of that CTE', true],
        ['A single GROUP BY store with HAVING SUM(sales) > AVG(sales)', false],
        ['A WHERE sales > AVG(sales) filter on the raw sales rows', false],
        ['A LEFT JOIN of stores to sales filtered on June', false],
      ], 'The comparison is against an average of store totals, so the totals must exist first; a CTE names that step. AVG(sales) in HAVING averages the rows inside each store, and WHERE cannot hold an aggregate.'),
      mcq('A college query uses: WHERE s.cgpa > (SELECT AVG(s2.cgpa) FROM students s2 WHERE s2.dept = s.dept). What does it return?', [
        ['Students above the average CGPA of their own department', true],
        ['Students above the average CGPA of the whole college', false],
        ['Departments whose average CGPA is above the whole college\'s', false],
        ['Only the single top student of each department', false],
      ], 'The subquery is correlated through s.dept, so it is evaluated per student against that student\'s department. That makes it a per-department comparison, not a college-wide one.'),
      mcq('An analyst runs WITH a AS (...), b AS (SELECT ... FROM a) SELECT ... FROM b and the final number looks wrong. What is the quickest way to find the faulty step?', [
        ['Replace the final SELECT with SELECT * FROM a, then b, and inspect', true],
        ['Rewrite the whole query using nested subqueries and compare', false],
        ['Add DISTINCT to every CTE and see if the number changes', false],
        ['Create each CTE as a permanent table and query those', false],
      ], 'Each CTE is a named intermediate result, so you can select from any step to check its rows and counts. That pinpoints the step where the numbers first go wrong.'),
    ],
  },

  /* ── DATES_NULLS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_DATES_NULLS',
    notes: `Two things make an analyst's SQL wrong without any error: dates handled carelessly and NULLs
misunderstood. Add messy text values and you have most data-cleaning work done inside a query.

## Grouping by month — the dialects differ

Date functions are the least standard part of SQL. To turn order_date into a month:

| Database | Month label (text) | First day of month (a date) |
|---|---|---|
| MySQL | \`DATE_FORMAT(order_date, '%Y-%m')\` | \`DATE_FORMAT(order_date, '%Y-%m-01')\` |
| SQL Server | \`FORMAT(order_date, 'yyyy-MM')\` | \`DATETRUNC(month, order_date)\` (2022+), or \`DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1)\` |
| PostgreSQL | \`TO_CHAR(order_date, 'YYYY-MM')\` | \`DATE_TRUNC('month', order_date)\` |

A real date (the first of the month) sorts and joins better than text, and charts treat it as time.
\`YEAR(order_date)\` and \`MONTH(order_date)\` work in both MySQL and SQL Server; PostgreSQL uses
\`EXTRACT(YEAR FROM order_date)\`.

## Filtering a period: use a half-open range

    WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01'

This is correct whether the column is DATE or DATETIME. \`BETWEEN '2024-03-01' AND '2024-03-31'\` on a
DATETIME column stops at **midnight** at the start of 31 March: a payment at 2024-03-31 18:45 is
outside it. Avoid \`WHERE MONTH(order_date) = 3\` too — it matches March of every year and stops an
index on order_date being used.

## Date arithmetic

Days from sign-up to first order, per customer:

    SELECT c.name, c.signup_date, MIN(o.order_date) AS first_order,
           DATEDIFF(MIN(o.order_date), c.signup_date) AS days_to_first     -- MySQL
    FROM customers c JOIN orders o ON o.customer_id = c.customer_id
    GROUP BY c.customer_id, c.name, c.signup_date;

    name  | signup_date | first_order | days_to_first
    ------+-------------+-------------+--------------
    Aarav | 2024-01-05  | 2024-01-07  | 2
    Diya  | 2024-01-20  | 2024-01-22  | 2
    Kabir | 2024-02-11  | 2024-02-14  | 3
    Meera | 2024-02-25  | 2024-03-01  | 5
    Rohan | 2024-03-02  | 2024-03-10  | 8

The argument order differs: MySQL \`DATEDIFF(later, earlier)\`; SQL Server \`DATEDIFF(day, earlier,
later)\`; PostgreSQL subtracts dates directly, \`later - earlier\`. (Meera's 5 days cross 29 February —
2024 is a leap year; the database handles that, which is why you never compute dates by hand.) Adding
time: MySQL \`DATE_ADD(d, INTERVAL 7 DAY)\`, SQL Server \`DATEADD(day, 7, d)\`, PostgreSQL
\`d + INTERVAL '7 days'\`.

## NULL in aggregates

ShopKart's discount column is NULL when no coupon was used (8 of the 12 orders):

    SELECT COUNT(*) AS orders, COUNT(discount) AS with_discount,
           SUM(discount) AS total_discount,
           AVG(discount) AS avg_discount,
           AVG(COALESCE(discount, 0)) AS avg_per_order
    FROM orders;

    orders | with_discount | total_discount | avg_discount | avg_per_order
    -------+---------------+----------------+--------------+--------------
    12     | 4             | 650            | 162.50       | 54.17

Aggregates skip NULLs. AVG(discount) is the average **among orders that used a coupon** (650 / 4).
AVG(COALESCE(discount, 0)) is the average **per order** (650 / 12). Both are legitimate; they answer
different questions, and you must say which one you report.

## NULL in comparisons and arithmetic

- \`WHERE discount <> 100\` returns 3 rows, not 11: for the 8 NULL rows the comparison is *unknown*, and
  WHERE keeps only *true*. Add \`OR discount IS NULL\` if those orders belong in the answer.
- Arithmetic with NULL gives NULL. \`SUM(amount - discount)\` silently skips every order without a coupon:

      month   | gross | net (with COALESCE) | SUM(amount - discount)
      --------+-------+---------------------+-----------------------
      2024-01 | 3700  | 3500                | 2300
      2024-02 | 4700  | 4600                | 1400
      2024-03 | 4900  | 4850                | 900
      2024-04 | 3950  | 3650                | 2700

  (delivered orders only). Write \`SUM(amount - COALESCE(discount, 0))\`.
- \`COALESCE(a, b, ...)\` returns the first non-NULL argument; it works in all three databases (SQL
  Server also has ISNULL, MySQL IFNULL).

## Avoiding division by zero with NULLIF

A bank's branch visits and accounts opened:

    SELECT branch, 100.0 * accounts_opened / NULLIF(visits, 0) AS conversion_pct
    FROM branch_day;

    branch  | conversion_pct
    --------+---------------
    Kothrud | 15.0
    Baner   | NULL
    Aundh   | 20.0

NULLIF(visits, 0) turns 0 into NULL, so Baner's rate is NULL ("no data") rather than an error. SQL
Server raises a divide-by-zero error without it; MySQL returns NULL anyway.

## Cleaning text inside the query

A leads table typed in by hand has city values \`'Pune'\`, \`' pune'\`, \`'PUNE '\`, \`'Mumbai'\`,
\`'mumbai'\` and \`'Hyderabad'\`. Grouping on the raw value can split one city into several rows — with a
case-sensitive comparison (PostgreSQL, SQLite) all six values differ. MySQL's and SQL Server's default
collations ignore case but still treat the leading space as a difference. Normalise explicitly, whatever
the database:

    SELECT UPPER(TRIM(city)) AS city, COUNT(*) AS leads
    FROM leads
    GROUP BY UPPER(TRIM(city));

    city      | leads
    ----------+------
    HYDERABAD | 1
    MUMBAI    | 2
    PUNE      | 3

Blank strings are not NULL. To treat both as "unknown":
\`COALESCE(NULLIF(TRIM(source), ''), 'unknown')\`. TRIM is in SQL Server from 2017; older versions use
\`LTRIM(RTRIM(x))\`. Cleaning in the query is fine for analysis; if the same fix is needed every week,
ask for it to be fixed at the source.`,
    mcqs: [
      mcq('ShopKart\'s discount column is NULL for 8 of 12 orders and the four coupons total ₹650. What does AVG(discount) return?', [
        ['162.5, the average over the 4 orders that used a coupon', true],
        ['54.17, the average over all 12 orders in the orders table', false],
        ['NULL, because the column contains NULL values', false],
        ['0, because NULLs are counted as zero discounts', false],
      ], 'AVG skips NULLs, so it divides 650 by the 4 non-NULL values. To average over every order, use AVG(COALESCE(discount, 0)), which gives 54.17.'),
      mcq('A payments table has a DATETIME paid_at. Which filter includes a payment made at 2024-03-31 18:45 and excludes April?', [
        ['paid_at >= \'2024-03-01\' AND paid_at < \'2024-04-01\'', true],
        ['paid_at BETWEEN \'2024-03-01\' AND \'2024-03-31\'', false],
        ['paid_at >= \'2024-03-01\' AND paid_at <= \'2024-03-31\'', false],
        ['paid_at > \'2024-02-29\' AND paid_at < \'2024-03-31\'', false],
      ], 'The date literal 2024-03-31 means midnight at the start of the 31st, so the BETWEEN and <= forms stop before 18:45. The half-open range up to 1 April includes the whole of 31 March.'),
      mcq('In SQL Server, which expression gives the number of days from signup_date to first_order?', [
        ['DATEDIFF(day, signup_date, first_order)', true],
        ['DATEDIFF(first_order, signup_date)', false],
        ['first_order - signup_date', false],
        ['DATEDIFF(signup_date, first_order, day)', false],
      ], 'SQL Server takes the unit first, then the start, then the end. DATEDIFF(later, earlier) is the MySQL form, and subtracting dates directly is PostgreSQL\'s.'),
    ],
    checkpoint: [
      mcq('A food-delivery report computes net revenue as SUM(amount - promo_discount). Orders without a promo have promo_discount NULL. What happens to them?', [
        ['They are left out of the total, because amount - NULL is NULL', true],
        ['They are counted at their full amount, as if the promo were 0', false],
        ['The whole SUM becomes NULL as soon as one row is NULL', false],
        ['The query fails with an error about NULL arithmetic', false],
      ], 'The subtraction yields NULL for those rows and SUM skips NULLs, so net revenue is badly understated. COALESCE(promo_discount, 0) fixes it.'),
      mcq('A leads table has city values \'Pune\', \' pune\' and \'PUNE \'. Which GROUP BY puts all three in one group in every major database?', [
        ['GROUP BY UPPER(TRIM(city))', true],
        ['GROUP BY DISTINCT city', false],
        ['GROUP BY city COLLATE NOCASE', false],
        ['GROUP BY LOWER(city)', false],
      ], 'TRIM removes the spaces and UPPER removes the case difference, so all three become PUNE. LOWER alone leaves the spaces; GROUP BY DISTINCT and COLLATE NOCASE are not portable.'),
      mcq('A college computes pass_pct = 100.0 * passed / appeared per subject; one subject had 0 students appear. Which expression avoids a divide-by-zero error in SQL Server?', [
        ['100.0 * passed / NULLIF(appeared, 0)', true],
        ['100.0 * passed / COALESCE(appeared, 0)', false],
        ['100.0 * passed / ISNULL(appeared, 1)', false],
        ['100.0 * NULLIF(passed, 0) / appeared', false],
      ], 'NULLIF(appeared, 0) turns the zero divisor into NULL, so the result is NULL instead of an error. COALESCE and ISNULL only replace NULLs, and appeared is 0, not NULL.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_DEBUGGING',
    notes: `An analyst's SQL rarely fails with an error. It returns a number that is a bit too high, a list
that is a bit too short, or a rate of zero — and somebody makes a decision on it. Below are eight faults
seen in real reports, each with the symptom you notice, the cause, and the one change that fixes it.
The examples use ShopKart's tables.

## 1. Revenue is too high after adding a join

**Symptom:** Delivered revenue was ₹17,250. After joining order_items "to filter by product later", the
same SUM(o.amount) shows ₹24,500.
**Cause:** fan-out. order_items has several rows per order (13 lines for 9 delivered orders), so each
two-line order's amount is summed twice.
**Fix:** sum a column at the line grain (\`SUM(i.qty * i.unit_price)\`), or keep the order grain and
test products with \`EXISTS\`. Always compare the row count before and after a join.

## 2. Customers with no orders vanish from a LEFT JOIN report

**Symptom:** "April orders for every customer" lists 3 customers; there are 6.
**Cause:** \`WHERE o.order_date >= '2024-04-01'\` is a condition on the right-hand table. For customers
without an April order it is not true, so WHERE removes them — the LEFT JOIN has become an inner join.
**Fix:** move the condition into ON: \`LEFT JOIN orders o ON o.customer_id = c.customer_id AND
o.order_date >= '2024-04-01'\`.

## 3. A customer with no orders shows 1 order

**Symptom:** Sneha, who never ordered, shows orders = 1.
**Cause:** \`COUNT(*)\` counts the NULL-padded row the LEFT JOIN produced for her.
**Fix:** \`COUNT(o.order_id)\` — counting a column from the right-hand table skips the NULL.

## 4. "Customers nobody referred" returns nothing

**Symptom:**

    SELECT customer_id FROM customers
    WHERE customer_id NOT IN (SELECT referred_by FROM referrals);   -- 0 rows

**Cause:** referred_by is NULL for customers who joined on their own. \`x NOT IN (1, 2, NULL)\` means
\`x <> 1 AND x <> 2 AND x <> NULL\`, and the last part is never true.
**Fix:** \`WHERE NOT EXISTS (SELECT 1 FROM referrals r WHERE r.referred_by = c.customer_id)\` — on this
data it returns customers 4, 5 and 6.

## 5. The cancellation rate is 0

**Symptom:** \`COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) / COUNT(*)\` shows 0 in SQL Server (and
PostgreSQL), though 2 of 12 orders were cancelled.
**Cause:** integer ÷ integer is integer division there; 2 / 12 truncates to 0. (MySQL's \`/\` returns
0.1667, so the same query "works" on MySQL and breaks when moved.)
**Fix:** \`100.0 * COUNT(...) / COUNT(*)\` → 16.7.

## 6. Net revenue is far too low

**Symptom:** January net revenue shows ₹2,300 though gross is ₹3,700 and only one ₹200 coupon was used.
**Cause:** \`SUM(amount - discount)\`: for orders with no coupon, discount is NULL, the subtraction is
NULL, and SUM skips the whole order.
**Fix:** \`SUM(amount - COALESCE(discount, 0))\` → ₹3,500.

## 7. Error 1055 (MySQL) / 8120 (SQL Server) after adding a column

**Symptom:** the query worked; you added c.name to SELECT and now it fails with "not in GROUP BY".
**Cause:** the query groups by customer_id, and name is neither grouped nor aggregated.
**Fix:** add it to GROUP BY (\`GROUP BY c.customer_id, c.name\`) — it is one value per customer anyway.
Do not switch off ONLY_FULL_GROUP_BY to make the error go away; on genuinely many-valued columns you
would get an arbitrary value.

## 8. The March total misses the last day

**Symptom:** a payments report for March shows ₹1,200, but finance says ₹2,100. paid_at is a DATETIME.
**Cause:** \`paid_at BETWEEN '2024-03-01' AND '2024-03-31'\` ends at 2024-03-31 00:00:00, so a ₹900
payment at 18:45 on 31 March is excluded.
**Fix:** a half-open range, \`paid_at >= '2024-03-01' AND paid_at < '2024-04-01'\`.

## How to debug a number you do not trust

1. Write the question as one sentence and check the query answers *that* sentence.
2. Count rows at every step: each table, after each join, after WHERE.
3. Reconcile against a simpler query (the total by status, the total without the join).
4. Look at five raw rows that should and five that should not be included.
5. Change one thing at a time, and re-run the reconciliation after each change.`,
    mcqs: [
      mcq('A report of delivered revenue per product category adds to more than total delivered revenue. The query joins orders, order_items and products and sums orders.amount. What is the fault?', [
        ['Summing an order-level amount after joining to order lines', true],
        ['Using an INNER JOIN where a LEFT JOIN was needed', false],
        ['Grouping by category rather than by product name', false],
        ['Leaving out a HAVING clause on the category total', false],
      ], 'Each order appears once per item line, so its amount is counted once per line. Sum qty × unit_price, which lives at the line grain, and the category totals reconcile.'),
      mcq('After a LEFT JOIN from branches to loans, `COUNT(*)` shows 1 loan for a bank branch that has none. Which change gives 0?', [
        ['COUNT(l.loan_id)', true],
        ['COUNT(DISTINCT b.branch_id)', false],
        ['SUM(1)', false],
        ['COUNT(*) - 1', false],
      ], 'The branch with no loans gets one row with NULL loan columns; COUNT of a loans column skips it. SUM(1) behaves like COUNT(*), and subtracting 1 breaks every branch that does have loans.'),
      mcq('An analyst\'s query `WHERE region <> \'North\'` returns fewer stores than expected. Some stores have region NULL. What is happening?', [
        ['NULL regions make the comparison unknown, so they are dropped', true],
        ['The <> operator also excludes regions that start with N', false],
        ['NULL regions are treated as equal to \'North\' by default in SQL', false],
        ['The query needs DISTINCT to show the NULL regions', false],
      ], 'NULL <> \'North\' is unknown, and WHERE keeps only true rows. Add OR region IS NULL if stores with no region should be included.'),
      mcq('A query that ran fine on MySQL returns a conversion rate of 0 for every campaign after moving to PostgreSQL. It computes paid_users / visitors. What is the cause?', [
        ['Both columns are integers, and PostgreSQL divides integers as integers', true],
        ['PostgreSQL always rounds every numeric division result to 0 decimal places', false],
        ['The column names are case-sensitive in PostgreSQL', false],
        ['PostgreSQL needs ROUND around a division to show decimals', false],
      ], 'MySQL\'s / always returns a decimal, but PostgreSQL (and SQL Server) truncate integer ÷ integer. Multiply by 100.0 or cast one side to a decimal type.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_PRACTICE',
    notes: `Six business questions on a food-delivery app in Hyderabad. Write each query yourself first, run
it on the data below (MySQL, PostgreSQL, SQL Server or SQLite), and only then compare with the answer.
Each answer gives the expected result so you can check your own.

## The data

    CREATE TABLE restaurants (rest_id INT, name VARCHAR(40), area VARCHAR(30));
    INSERT INTO restaurants VALUES
      (1,'Biryani House','Kondapur'), (2,'Dosa Corner','Madhapur'),
      (3,'Tandoor Point','Kondapur'), (4,'Green Bowl','Gachibowli');

    CREATE TABLE deliveries (order_id INT, rest_id INT, order_date DATE,
                             status VARCHAR(12), amount INT, tip INT);
    INSERT INTO deliveries VALUES
      (1,1,'2024-05-01','DELIVERED',450,20),
      (2,1,'2024-05-01','DELIVERED',600,NULL),
      (3,2,'2024-05-02','CANCELLED',180,NULL),
      (4,2,'2024-05-02','DELIVERED',220,10),
      (5,3,'2024-05-03','DELIVERED',800,50),
      (6,1,'2024-06-04','DELIVERED',520,NULL),
      (7,3,'2024-06-05','CANCELLED',650,NULL),
      (8,2,'2024-06-06','DELIVERED',260,NULL);

## Exercise 1 — revenue by area

Delivered orders and delivered revenue (₹) per area, highest revenue first.

    SELECT r.area, COUNT(*) AS orders, SUM(d.amount) AS revenue
    FROM deliveries d JOIN restaurants r ON r.rest_id = d.rest_id
    WHERE d.status = 'DELIVERED'
    GROUP BY r.area ORDER BY revenue DESC;

    area     | orders | revenue
    ---------+--------+--------
    Kondapur | 4      | 2370
    Madhapur | 2      | 480

Gachibowli does not appear: Green Bowl has no orders. Mention it.

## Exercise 2 — cancellation rate per restaurant

Orders and the percentage cancelled for each restaurant that has orders, highest rate first.

    SELECT r.name, COUNT(*) AS orders,
           ROUND(100.0 * COUNT(CASE WHEN d.status = 'CANCELLED' THEN 1 END) / COUNT(*), 1) AS cancel_pct
    FROM restaurants r JOIN deliveries d ON d.rest_id = r.rest_id
    GROUP BY r.rest_id, r.name
    ORDER BY cancel_pct DESC, r.name;

    name          | orders | cancel_pct
    --------------+--------+-----------
    Tandoor Point | 2      | 50.0
    Dosa Corner   | 3      | 33.3
    Biryani House | 3      | 0.0

## Exercise 3 — every restaurant, including the idle one

Each restaurant's delivered orders and revenue, showing 0 where there are none.

    SELECT r.name, COUNT(d.order_id) AS delivered_orders, COALESCE(SUM(d.amount), 0) AS revenue
    FROM restaurants r
    LEFT JOIN deliveries d ON d.rest_id = r.rest_id AND d.status = 'DELIVERED'
    GROUP BY r.rest_id, r.name
    ORDER BY revenue DESC;

    name          | delivered_orders | revenue
    --------------+------------------+--------
    Biryani House | 3                | 1570
    Tandoor Point | 1                | 800
    Dosa Corner   | 2                | 480
    Green Bowl    | 0                | 0

The status condition is in ON; in WHERE it would remove Green Bowl.

## Exercise 4 — no delivered order in June

Restaurants with no delivered order in June 2024.

    SELECT r.name
    FROM restaurants r
    WHERE NOT EXISTS (SELECT 1 FROM deliveries d
                      WHERE d.rest_id = r.rest_id AND d.status = 'DELIVERED'
                        AND d.order_date >= '2024-06-01' AND d.order_date < '2024-07-01')
    ORDER BY r.name;

    name
    -------------
    Green Bowl
    Tandoor Point

Tandoor Point did have a June order, but it was cancelled.

## Exercise 5 — two averages of tips

On delivered orders: the average tip among orders that were tipped, and the average tip per order.

    SELECT AVG(tip) AS avg_when_tipped, AVG(COALESCE(tip, 0)) AS avg_per_order, COUNT(tip) AS tipped
    FROM deliveries WHERE status = 'DELIVERED';

    avg_when_tipped | avg_per_order | tipped
    ----------------+---------------+-------
    26.67           | 13.33         | 3

(80 ÷ 3 and 80 ÷ 6, rounded.)

## Exercise 6 — above the average restaurant

Restaurants whose delivered revenue is above the average restaurant's delivered revenue (among
restaurants with delivered orders).

    WITH rest_rev AS (
        SELECT rest_id, SUM(amount) AS revenue
        FROM deliveries WHERE status = 'DELIVERED' GROUP BY rest_id
    )
    SELECT r.name, x.revenue
    FROM rest_rev x JOIN restaurants r ON r.rest_id = x.rest_id
    WHERE x.revenue > (SELECT AVG(revenue) FROM rest_rev);

    name          | revenue
    --------------+--------
    Biryani House | 1570

The average is (1570 + 480 + 800) / 3 = ₹950. If Green Bowl were counted as ₹0 the average would be
₹712.50 and Tandoor Point (₹800) would also qualify — say which definition you used.

**Stretch:** monthly delivered revenue — May ₹2,070 from 4 orders, June ₹780 from 2. Write it with
\`DATE_FORMAT(order_date, '%Y-%m')\` (MySQL) and \`FORMAT(order_date, 'yyyy-MM')\` (SQL Server).`,
    mcqs: [
      mcq('In the food-delivery data, why does Exercise 3 put d.status = \'DELIVERED\' in the ON clause rather than WHERE?', [
        ['In WHERE it would drop Green Bowl, which has no deliveries', true],
        ['ON is evaluated after GROUP BY, so the count is correct', false],
        ['A text comparison is not allowed inside a WHERE clause', false],
        ['ON makes the query run without needing the GROUP BY', false],
      ], 'Green Bowl\'s joined row has NULL status, which fails a WHERE filter, turning the LEFT JOIN into an inner join. In ON, the filter only limits which deliveries match.'),
      mcq('Tips on the six delivered orders are 20, NULL, 10, 50, NULL and NULL. What is AVG(COALESCE(tip, 0))?', [
        ['13.33', true],
        ['26.67', false],
        ['80', false],
        ['NULL', false],
      ], 'COALESCE turns the three NULLs into 0, so the total of 80 is divided by 6 orders. Plain AVG(tip) divides by the 3 tipped orders and gives 26.67.'),
      mcq('Restaurant delivered revenues are Biryani House 1570, Dosa Corner 480 and Tandoor Point 800. If Green Bowl is counted as ₹0, which restaurants are above the average restaurant?', [
        ['Biryani House and Tandoor Point', true],
        ['Biryani House only', false],
        ['All three restaurants with orders', false],
        ['Tandoor Point only', false],
      ], 'With four restaurants the average is 2850 / 4 = ₹712.50, so 1570 and 800 are above it. Leaving Green Bowl out gives ₹950 and only Biryani House qualifies.'),
      mcq('Why does Exercise 4 use NOT EXISTS with the status and June conditions inside the subquery?', [
        ['So a cancelled June order does not count as a delivered one', true],
        ['Because NOT EXISTS is the only anti-join MySQL supports', false],
        ['So that the subquery returns exactly one row per restaurant', false],
        ['Because dates cannot be compared outside a subquery', false],
      ], 'The test is "no delivered order in June", so both conditions belong in the subquery. Tandoor Point had a cancelled June order and must still be listed.'),
      mcq('Dosa Corner has 3 orders, one cancelled. Exercise 2 computes 100.0 * 1 / 3. What does it show after ROUND(..., 1)?', [
        ['33.3', true],
        ['33', false],
        ['0', false],
        ['0.3', false],
      ], '100.0 makes the arithmetic decimal, so 100.0 / 3 = 33.33..., rounded to 33.3. Without the 100.0, integer division in SQL Server or PostgreSQL would give 0.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_INTERVIEW_QUESTION',
    notes: `Analyst SQL interviews are usually a shared screen and a small schema like ShopKart's. The
interviewer cares less about whether you remember syntax than whether you **clarify the question,
reason about rows, and check your answer**. Think aloud. Here are three common questions with strong
answers and the follow-ups that come next.

## Question 1 — "Find customers who ordered in January but not in February."

**First, clarify:** "Does 'ordered' include cancelled orders?" This changes the answer on ShopKart.
Aarav ordered on 7 January and placed a February order that was cancelled.

**Model answer (counting delivered orders only):**

    SELECT c.name
    FROM customers c
    WHERE EXISTS (SELECT 1 FROM orders o
                  WHERE o.customer_id = c.customer_id AND o.status = 'DELIVERED'
                    AND o.order_date >= '2024-01-01' AND o.order_date < '2024-02-01')
      AND NOT EXISTS (SELECT 1 FROM orders o
                  WHERE o.customer_id = c.customer_id AND o.status = 'DELIVERED'
                    AND o.order_date >= '2024-02-01' AND o.order_date < '2024-03-01');

Result: **Aarav**. Counting every status instead, the result is **empty** — both January customers
(Aarav and Diya) placed something in February. Saying this out loud is the best part of the answer.

**Why EXISTS / NOT EXISTS:** each reads like the sentence, neither can duplicate customers, and NOT
EXISTS is safe with NULLs where NOT IN is not.

**Follow-ups:**
- *"Do it with a join."* LEFT JOIN a February subquery and keep rows where it is NULL.
- *"Now do it for every pair of consecutive months."* That is a window-function question (LAG over each
  customer's active months) — next topic.
- *"What if the table has 50 million rows?"* Indexes on (customer_id, order_date); half-open date ranges
  so the index can be used.

## Question 2 — "Explain WHERE versus HAVING, and the order a query runs in."

**Model answer:** "SQL is written SELECT-first but evaluated roughly as FROM and JOINs → WHERE →
GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. WHERE filters individual rows before grouping, so it
cannot use aggregates. HAVING filters groups after aggregation, so it is where conditions like
SUM(amount) > 5000 go."

Then give an example: "Customers with at least two delivered orders: status = 'DELIVERED' goes in WHERE,
COUNT(*) >= 2 in HAVING. On ShopKart that returns Diya, Kabir and Aarav."

**Follow-ups:**
- *"Can I use a SELECT alias in WHERE?"* No — WHERE runs before SELECT. ORDER BY can, because it runs
  after. MySQL also allows aliases in HAVING; SQL Server and PostgreSQL do not.
- *"Where does a window function fit?"* After HAVING, with the SELECT step — which is why you cannot
  filter on one in WHERE.
- *"Is a condition in HAVING without an aggregate wrong?"* It works but filters late; put row conditions
  in WHERE.

## Question 3 — "Revenue fell 19% in April. How would you investigate with SQL?"

**Model answer — decompose, don't guess.** ShopKart's delivered revenue went from ₹4,900 in March to
₹3,950 in April (−19.4%). Revenue = orders × average order value, so check both first:

    month   | orders | revenue | avg_order_value
    --------+--------+---------+----------------
    2024-03 | 3      | 4900    | 1633.33
    2024-04 | 2      | 3950    | 1975.00

"Order value went **up**; the fall is entirely fewer delivered orders. Next I look at why orders fell —
by status:" April has a ₹2,500 cancelled order (Rohan's earbuds); delivered, April would have been
₹6,450. "Then by category, city, and new versus returning customers, and I would check data issues —
did tracking or a status change on 15 April break something?"

**Follow-ups:**
- *"Which one query would you write first?"* Monthly orders, revenue and AOV by status, because it splits
  volume, value and cancellations in one view.
- *"How do you know it is not seasonal?"* Compare with April last year, or with the same weekday pattern.
- *"How do you present it?"* One sentence of cause, one chart, the numbers that support it, and what is
  still unknown.`,
    mcqs: [
      mcq('An interviewer asks for ShopKart customers who ordered in January but not February. Why should you first ask whether cancelled orders count?', [
        ['Aarav\'s only February order was cancelled, so the answer changes', true],
        ['Cancelled orders cannot be filtered with a NOT EXISTS subquery', false],
        ['Interviewers mark down any query with a status filter in it', false],
        ['The orders table records no dates for cancelled orders', false],
      ], 'Counting delivered orders the answer is Aarav; counting every status it is nobody. A definition that changes the result must be agreed before you write SQL.'),
      mcq('In which logical order does a database evaluate these clauses?', [
        ['FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY', true],
        ['SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY', false],
        ['FROM, GROUP BY, WHERE, SELECT, HAVING, ORDER BY', false],
        ['FROM, WHERE, SELECT, GROUP BY, ORDER BY, HAVING', false],
      ], 'Rows are gathered and filtered, then grouped and the groups filtered, then the select list is computed and sorted. That is why WHERE cannot use aggregates or SELECT aliases while ORDER BY can.'),
      mcq('Delivered revenue fell from ₹4,900 (3 orders) to ₹3,950 (2 orders). What does splitting it into orders × average order value tell you?', [
        ['Order value rose; the fall comes from fewer delivered orders', true],
        ['Order value fell; customers are buying cheaper products now', false],
        ['Both fell equally, so the cause is the overall market', false],
        ['Nothing, because average order value ignores cancellations', false],
      ], 'Average order value went from ₹1,633.33 to ₹1,975, so value per order rose. The decline is in the count of delivered orders, which points the investigation at volume and cancellations.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_ANALYST_CHECKPOINT',
    notes: `Ten questions on SQL written to answer business questions: restating the question and finding the
grain, grouped and conditional aggregation, joins that keep or multiply rows, CTEs and subqueries, and
dates and NULLs. Several give you a query and ask what it returns — work it out row by row rather than
guessing from the shape of the SQL.`,
    checkpoint: [
      mcq('A retail chain\'s sales table has one row per bill line (a bill can have many lines). The manager asks for "number of bills per store". Which expression is right?', [
        ['COUNT(DISTINCT bill_id) grouped by store', true],
        ['COUNT(*) grouped by store', false],
        ['SUM(DISTINCT bill_id) grouped by each store', false],
        ['COUNT(line_no) grouped by store', false],
      ], 'At line grain, COUNT(*) and COUNT(line_no) count lines, not bills. COUNT(DISTINCT bill_id) counts each bill once however many lines it has.'),
      mcq('ShopKart: `SELECT COUNT(*) FROM orders WHERE discount <> 100` — discount values are 200, 100, 50, 300 and eight NULLs. What does it return?', [
        ['3', true],
        ['11', false],
        ['4', false],
        ['12', false],
      ], 'Only 200, 50 and 300 make the comparison true. For the eight NULLs it is unknown and WHERE drops them, so 11 is what you get only after adding OR discount IS NULL.'),
      mcq('A bank wants, per branch, the number of accounts opened and the number of those that are SAVINGS, in one row per branch. Which query shape does that?', [
        ['GROUP BY branch with COUNT(*) and COUNT(CASE WHEN type = \'SAVINGS\' THEN 1 END)', true],
        ['GROUP BY branch, type with COUNT(*), then read off the SAVINGS rows for each branch', false],
        ['WHERE type = \'SAVINGS\' GROUP BY branch with COUNT(*) for both', false],
        ['GROUP BY branch HAVING type = \'SAVINGS\' with COUNT(*)', false],
      ], 'Conditional aggregation computes both measures over the same group. Filtering on SAVINGS in WHERE loses the total, grouping by type gives several rows per branch, and HAVING cannot test a non-grouped column.'),
      mcq('`SELECT c.name, COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = \'CANCELLED\' GROUP BY c.customer_id, c.name` on ShopKart. What does Sneha get?', [
        ['A row with 0', true],
        ['No row at all', false],
        ['A row with 1', false],
        ['A row with NULL', false],
      ], 'The LEFT JOIN keeps every customer and the status condition sits in ON, so Sneha gets a NULL-padded row. COUNT(o.order_id) skips the NULL and returns 0.'),
      mcq('An analyst computes repeat-buyer share as 3 repeat buyers out of 6 customers = 50%. ShopKart\'s report says 60%. Which explanation is right?', [
        ['The report divides by the 5 customers who bought; one never ordered', true],
        ['The report rounds 50% up to the nearest 10% for display', false],
        ['The report also counts the cancelled orders as repeat purchases by customers', false],
        ['The report double-counts Diya, who has three orders', false],
      ], 'Both are arithmetic on different denominators: 3/5 buyers versus 3/6 signed-up customers. The definition of the base has to be stated with the number.'),
      mcq('Which query finds food-delivery customers who have never placed an order and is safe even if orders.customer_id has NULLs?', [
        ['WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)', true],
        ['WHERE c.customer_id NOT IN (SELECT o.customer_id FROM orders o WHERE o.order_id > 0)', false],
        ['WHERE c.customer_id <> ALL (SELECT customer_id FROM orders)', false],
        ['JOIN orders o ON o.customer_id <> c.customer_id', false],
      ], 'NOT EXISTS only asks whether a matching row exists, so NULLs elsewhere do not matter. NOT IN and <> ALL return nothing once the list contains a NULL, and the <> join pairs almost every row.'),
      mcq('`WITH t AS (SELECT customer_id, SUM(amount) s FROM orders WHERE status = \'DELIVERED\' GROUP BY customer_id) SELECT COUNT(*) FROM t WHERE s > 2000` on ShopKart (totals 2150, 8700, 3300, 950, 2150). What is the result?', [
        ['4', true],
        ['3', false],
        ['5', false],
        ['2', false],
      ], 'Four totals exceed 2000: 2150, 8700, 3300 and 2150. Only Meera\'s ₹950 does not.'),
      mcq('A college admissions table stores applied_at as DATETIME. Which WHERE clause counts every application made during June 2024?', [
        ['applied_at >= \'2024-06-01\' AND applied_at < \'2024-07-01\'', true],
        ['applied_at BETWEEN \'2024-06-01\' AND \'2024-06-30\'', false],
        ['MONTH(applied_at) = 6', false],
        ['applied_at LIKE \'2024-06\'', false],
      ], 'The half-open range includes all of 30 June. BETWEEN stops at midnight starting 30 June, MONTH() = 6 also matches June of other years, and LIKE without a wildcard matches nothing.'),
      mcq('In PostgreSQL, a dashboard shows `SUM(converted) / COUNT(*)` as 0 for every campaign, where converted is 0 or 1 (an INTEGER). Which rewrite is correct?', [
        ['100.0 * SUM(converted) / COUNT(*)', true],
        ['ROUND(SUM(converted) / COUNT(*), 2)', false],
        ['SUM(converted) / COUNT(*) * 100', false],
        ['CAST(SUM(converted) / COUNT(*) AS DECIMAL)', false],
      ], 'Making one operand a decimal before dividing avoids integer division. Rounding, multiplying afterwards or casting the result all act on a quotient that has already been truncated.'),
      mcq('A food-delivery manager asks "Are weekend orders bigger?". Which restatement is ready to be written as SQL?', [
        ['Average delivered order value, Sat–Sun versus Mon–Fri, for May 2024', true],
        ['Whether customers order more food when they have more time', false],
        ['The day of the week that our weekend customers like best', false],
        ['How big weekend orders felt to our delivery partners', false],
      ], 'It names the measure, the filter, the comparison groups and the period, so one query can answer it. The others still need every one of those decisions.'),
    ],
  },

  /* ══ DT_SQL_WINDOWS ══════════════════════════════════════════════════════════════════════ */

  /* ── WINDOW_BASICS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_WINDOW_BASICS',
    notes: `GROUP BY answers "what is the total per customer?" by **collapsing** each customer's orders into
one row. Analysts constantly need the opposite: keep every order **and** show the customer's total
beside it, so each order can be compared with its group. That is what a window function does.

Window functions need MySQL 8.0+, PostgreSQL, or SQL Server (2005+ for PARTITION BY aggregates; ORDER BY
inside an aggregate's OVER, frames, LAG/LEAD and FIRST_VALUE need 2012+). The examples use ShopKart's
orders table from the previous topic.

## The same total, two ways

    -- GROUP BY: one row per customer
    SELECT customer_id, SUM(amount) AS customer_total
    FROM orders WHERE status = 'DELIVERED'
    GROUP BY customer_id;                       -- 5 rows

    -- Window: every order kept, the customer's total added
    SELECT order_id, customer_id, amount,
           SUM(amount) OVER (PARTITION BY customer_id) AS customer_total,
           ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer
    FROM orders
    WHERE status = 'DELIVERED'
    ORDER BY customer_id, order_id;

    order_id | customer_id | amount | customer_total | pct_of_customer
    ---------+-------------+--------+----------------+----------------
    1001     | 1           | 1200   | 2150           | 55.8
    1007     | 1           | 950    | 2150           | 44.2
    1002     | 2           | 2500   | 8700           | 28.7
    1005     | 2           | 3200   | 8700           | 36.8
    1010     | 2           | 3000   | 8700           | 34.5
    1004     | 3           | 1500   | 3300           | 45.5
    1009     | 3           | 1800   | 3300           | 54.5
    1012     | 4           | 950    | 950            | 100.0
    1008     | 5           | 2150   | 2150           | 100.0

Nine rows in, nine rows out. **PARTITION BY** says which rows form each order's window — here, the
orders of the same customer. The aggregate is computed over the window and written on every row of it.

## OVER () — the whole result is one window

    SELECT order_id, amount,
           SUM(amount) OVER () AS all_revenue,
           COUNT(*)    OVER () AS all_orders,
           AVG(amount) OVER () AS avg_order
    FROM orders WHERE status = 'DELIVERED';

Every row gets all_revenue = 17250, all_orders = 9 and avg_order = 1916.67. Dividing by
\`SUM(amount) OVER ()\` gives each row's share of the grand total without a subquery.

## Windows over a grouped result

A window function runs after GROUP BY, so it can wrap an aggregate. Category share of delivered revenue
— the scalar subquery from the previous topic, now one line:

    SELECT p.category,
           SUM(i.qty * i.unit_price) AS revenue,
           ROUND(100.0 * SUM(i.qty * i.unit_price)
                 / SUM(SUM(i.qty * i.unit_price)) OVER (), 1) AS pct_of_total
    FROM order_items i
    JOIN orders o   ON o.order_id = i.order_id
    JOIN products p ON p.product_id = i.product_id
    WHERE o.status = 'DELIVERED'
    GROUP BY p.category
    ORDER BY revenue DESC;

    category    | revenue | pct_of_total
    ------------+---------+-------------
    Electronics | 5000    | 29.0
    Fashion     | 4500    | 26.1
    Grocery     | 4200    | 24.3
    Home        | 3550    | 20.6

Read \`SUM(SUM(x)) OVER ()\` from the inside out: SUM(x) is each category's revenue (GROUP BY), and the
outer SUM ... OVER () adds those category totals across the whole result.

## Comparing each row with its group

    SELECT c.city, o.order_id, o.amount,
           AVG(o.amount) OVER (PARTITION BY c.city) AS city_avg,
           o.amount - AVG(o.amount) OVER (PARTITION BY c.city) AS diff_from_city_avg
    FROM orders o JOIN customers c ON c.customer_id = o.customer_id
    WHERE o.status = 'DELIVERED';

Pune's four delivered orders (1200, 1500, 950, 1800) average ₹1,362.50, so order 1009 shows +437.50 and
order 1007 shows −412.50.

## Where a window function runs — and why you cannot filter on it in WHERE

Logical order: FROM → WHERE → GROUP BY → HAVING → **window functions** → SELECT list → ORDER BY. WHERE
has already finished before the window is computed, so \`WHERE amount > AVG(amount) OVER (...)\` is an
error. Compute it in a CTE, then filter:

    WITH o AS (
        SELECT order_id, customer_id, amount,
               AVG(amount) OVER (PARTITION BY customer_id) AS cust_avg
        FROM orders WHERE status = 'DELIVERED'
    )
    SELECT order_id, customer_id, amount, cust_avg
    FROM o WHERE amount > cust_avg;

    order_id | customer_id | amount | cust_avg
    ---------+-------------+--------+---------
    1001     | 1           | 1200   | 1075.0
    1005     | 2           | 3200   | 2900.0
    1010     | 2           | 3000   | 2900.0
    1009     | 3           | 1800   | 1650.0

Also note: WHERE runs **before** the window. The status filter above means the averages are over
delivered orders only — move it and the numbers change.

## GROUP BY or a window?

- You want one row per group → GROUP BY.
- You want every row, with group figures beside it (shares, differences from average, ranks, running
  totals) → window function.`,
    workedExample: `**Brief:** "For each delivered order, show what share of that customer's spend it was, and flag
the orders bigger than the customer's usual order."

**1. Grain of the output:** one row per delivered order — so no GROUP BY; group figures come from
windows partitioned by customer.

**2. The measures:**
- customer's total: \`SUM(amount) OVER (PARTITION BY customer_id)\`
- share: \`100.0 * amount / that total\`
- customer's average order: \`AVG(amount) OVER (PARTITION BY customer_id)\`
- flag: a CASE comparing amount with that average.

**3. The query:**

    SELECT order_id, customer_id, amount,
           ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY customer_id), 1) AS pct_of_customer,
           CASE WHEN amount > AVG(amount) OVER (PARTITION BY customer_id)
                THEN 'above usual' ELSE '' END AS flag
    FROM orders
    WHERE status = 'DELIVERED'
    ORDER BY customer_id, order_id;

A window function *can* appear inside a CASE in the SELECT list — the restriction is only on WHERE,
GROUP BY and HAVING.

**4. Check against the table in the notes.** Diya (customer 2): 2500, 3200, 3000 → total 8700, average
2900. Shares 28.7 / 36.8 / 34.5 add to 100.0, and orders 1005 and 1010 are above ₹2,900. Customers 4 and
5 have one order each, so 100.0% and no flag — an order cannot be above its own average.

**5. Report:** four orders are above their customer's usual (1001, 1005, 1010, 1009). Say that a customer
with one order can never be flagged, so the flag means more for frequent buyers.`,
    mcqs: [
      mcq('ShopKart has 9 delivered orders from 5 customers. How many rows does `SELECT order_id, SUM(amount) OVER (PARTITION BY customer_id) FROM orders WHERE status = \'DELIVERED\'` return?', [
        ['9, one for each delivered order', true],
        ['5, one for each customer', false],
        ['1, the grand total of delivered revenue', false],
        ['14, the orders plus a subtotal per customer', false],
      ], 'A window function does not collapse rows: every delivered order stays, each carrying its customer\'s total. GROUP BY customer_id is what would return 5 rows.'),
      mcq('What does `SUM(SUM(revenue)) OVER ()` compute in a query that groups by category?', [
        ['The total of the category totals, on every category row', true],
        ['A running total of revenue across the categories', false],
        ['Each category\'s revenue counted twice over', false],
        ['An error, since aggregates cannot be nested', false],
      ], 'The inner SUM is the GROUP BY aggregate per category; the outer SUM ... OVER () adds those results across all rows. It is the usual way to get a share of the total from a grouped query.'),
      mcq('Why does `SELECT order_id FROM orders WHERE amount > AVG(amount) OVER ()` fail?', [
        ['Window functions are computed after WHERE has filtered rows', true],
        ['OVER () needs a PARTITION BY clause to be valid', false],
        ['AVG cannot be used as a window function, only SUM can', false],
        ['The amount column must be listed in a GROUP BY first', false],
      ], 'In logical order, WHERE runs before window functions exist, so it cannot reference one. Compute the average in a CTE or subquery and filter in the outer query.'),
    ],
    checkpoint: [
      mcq('A retail chain\'s store_sales has one row per store per day. Which expression puts each store\'s total for the whole period on every one of its daily rows?', [
        ['SUM(sales) OVER (PARTITION BY store_id)', true],
        ['SUM(sales) OVER (ORDER BY store_id)', false],
        ['SUM(sales) GROUP BY store_id', false],
        ['SUM(sales) OVER (PARTITION BY sale_date)', false],
      ], 'PARTITION BY store_id makes each store\'s days one window. ORDER BY store_id gives a running total across stores, and partitioning by date gives each day\'s total across stores.'),
      mcq('A college marks table has (student_id, subject, marks). Which query shows each mark beside that subject\'s class average without losing any rows?', [
        ['SELECT *, AVG(marks) OVER (PARTITION BY subject) FROM marks', true],
        ['SELECT subject, AVG(marks) FROM marks GROUP BY subject', false],
        ['SELECT *, AVG(marks) OVER (PARTITION BY student_id) FROM marks', false],
        ['SELECT *, AVG(marks) FROM marks GROUP BY student_id', false],
      ], 'Partitioning by subject averages over everyone who took that subject and keeps every row. GROUP BY collapses rows, and partitioning by student averages a student\'s own subjects.'),
      mcq('An analyst wants food-delivery orders above their restaurant\'s average value. Which approach works in MySQL 8, PostgreSQL and SQL Server?', [
        ['Compute AVG(amount) OVER (PARTITION BY rest_id) in a CTE, filter outside', true],
        ['Put AVG(amount) OVER (PARTITION BY rest_id) directly in the WHERE', false],
        ['Use HAVING amount > AVG(amount) OVER (PARTITION BY rest_id)', false],
        ['Add QUALIFY amount > AVG(amount) to the end of the query', false],
      ], 'Window functions can only be referenced after they are computed, so wrap them and filter in the outer query. QUALIFY exists only in some warehouses, not in these three databases.'),
    ],
  },

  /* ── RANKING ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_RANKING',
    notes: `"Top 3 products in each region", "each customer's second-biggest order", "keep only the latest
record per email" — all ranking questions, all solved with three window functions that differ only in
how they treat ties.

## The data

region_sales holds quarterly revenue (₹) per product per region for a retail chain:

    region | product | revenue
    -------+---------+--------
    North  | Earbuds | 52000
    North  | Kurta   | 48000
    North  | Cooker  | 48000
    North  | Rice    | 30000
    South  | Rice    | 61000
    South  | Earbuds | 45000
    South  | Bottle  | 22000
    South  | Kurta   | 22000
    West   | Kurta   | 70000
    West   | Earbuds | 55000
    West   | Rice    | 41000
    West   | Bottle  | 12000

## ROW_NUMBER, RANK and DENSE_RANK side by side

    SELECT product, revenue,
           ROW_NUMBER() OVER (ORDER BY revenue DESC, product) AS row_num,
           RANK()       OVER (ORDER BY revenue DESC)          AS rnk,
           DENSE_RANK() OVER (ORDER BY revenue DESC)          AS dense_rnk
    FROM region_sales
    WHERE region = 'North';

    product | revenue | row_num | rnk | dense_rnk
    --------+---------+---------+-----+----------
    Earbuds | 52000   | 1       | 1   | 1
    Cooker  | 48000   | 2       | 2   | 2
    Kurta   | 48000   | 3       | 2   | 2
    Rice    | 30000   | 4       | 4   | 3

- **ROW_NUMBER** — 1, 2, 3, 4 with no ties ever. Between tied rows the order is *arbitrary* unless you
  add a tie-breaker (here \`product\`), and it can change between runs.
- **RANK** — ties share a rank and the next rank is skipped (1, 2, 2, **4**), like a race result.
- **DENSE_RANK** — ties share a rank and nothing is skipped (1, 2, 2, **3**).

## Top N per group

Add PARTITION BY, rank inside a CTE, filter outside (a window function cannot be filtered in WHERE):

    WITH ranked AS (
        SELECT region, product, revenue,
               RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
        FROM region_sales
    )
    SELECT region, product, revenue, rnk
    FROM ranked
    WHERE rnk <= 2
    ORDER BY region, rnk, product;

    region | product | revenue | rnk
    -------+---------+---------+----
    North  | Earbuds | 52000   | 1
    North  | Cooker  | 48000   | 2
    North  | Kurta   | 48000   | 2
    South  | Rice    | 61000   | 1
    South  | Earbuds | 45000   | 2
    West   | Kurta   | 70000   | 1
    West   | Earbuds | 55000   | 2

Seven rows: North's tie for second keeps both products. With \`ROW_NUMBER() OVER (PARTITION BY region
ORDER BY revenue DESC, product)\` you get exactly two per region (6 rows) and Kurta is dropped because
"Cooker" sorts first — a rule you must be able to justify. **Which function is a business decision:** a
"top 2" bonus list probably includes ties (RANK); a dashboard with exactly two slots needs ROW_NUMBER.

With DENSE_RANK, "top 3 revenue levels" in South returns 4 rows: Rice (1), Earbuds (2), and Bottle and
Kurta tied at 3.

## Nth highest

"Each customer's second-biggest delivered order" at ShopKart:

    WITH ranked AS (
        SELECT customer_id, order_id, amount,
               DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS dr
        FROM orders WHERE status = 'DELIVERED'
    )
    SELECT customer_id, order_id, amount FROM ranked WHERE dr = 2;

    customer_id | order_id | amount
    ------------+----------+-------
    1           | 1007     | 950
    2           | 1010     | 3000
    3           | 1004     | 1500

Customers 4 and 5 have one delivered order each, so they have no second — no row, not NULL.

## Deduplicating with ROW_NUMBER

A customer import contains several rows per email; keep the most recently updated:

    email         | name    | city      | updated_at
    --------------+---------+-----------+-----------------
    aarav@mail.in | Aarav   | Pune      | 2024-01-05 10:00
    aarav@mail.in | Aarav S | Pune      | 2024-03-02 18:30
    diya@mail.in  | Diya    | Mumbai    | 2024-01-20 09:15
    kabir@mail.in | Kabir   | Pune      | 2024-02-11 11:00
    kabir@mail.in | Kabir   | Bengaluru | 2024-02-28 16:45
    kabir@mail.in | Kabir R | Bengaluru | 2024-02-20 08:00

    WITH ranked AS (
        SELECT email, name, city, updated_at,
               ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC) AS rn
        FROM customer_import
    )
    SELECT email, name, city, updated_at FROM ranked WHERE rn = 1;

    email         | name    | city      | updated_at
    --------------+---------+-----------+-----------------
    aarav@mail.in | Aarav S | Pune      | 2024-03-02 18:30
    diya@mail.in  | Diya    | Mumbai    | 2024-01-20 09:15
    kabir@mail.in | Kabir   | Bengaluru | 2024-02-28 16:45

ROW_NUMBER (not RANK) is right here: you want exactly one row per email even if two updates share a
timestamp — and then you add a tie-breaker so that "one" is always the same one.

## Overall top N without a window

For "top 3 orders overall", no partition is needed: MySQL and PostgreSQL \`ORDER BY amount DESC LIMIT 3\`;
SQL Server \`SELECT TOP 3 ... ORDER BY amount DESC\` (or \`TOP 3 WITH TIES\`); standard SQL, supported by
PostgreSQL and SQL Server 2012+, \`OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY\`. Per group, you need the window.`,
    mcqs: [
      mcq('In region_sales, North has Earbuds 52000, Kurta 48000, Cooker 48000 and Rice 30000. What rank does Rice get from RANK() and from DENSE_RANK() ordered by revenue descending?', [
        ['4 from RANK and 3 from DENSE_RANK', true],
        ['3 from RANK and 4 from DENSE_RANK', false],
        ['4 from both RANK and DENSE_RANK', false],
        ['3 from both RANK and DENSE_RANK', false],
      ], 'RANK skips a number after the two-way tie for second (1, 2, 2, 4); DENSE_RANK does not (1, 2, 2, 3).'),
      mcq('A top-2-per-region query uses RANK() and returns 7 rows for 3 regions. What explains the extra row?', [
        ['A tie for second place in one region keeps both products', true],
        ['RANK starts counting from 0, so it keeps three per region', false],
        ['The WHERE rnk <= 2 filter ran before the ranking', false],
        ['One region has a NULL revenue that ranks first', false],
      ], 'RANK gives tied rows the same rank, so both of North\'s 48000 products are rank 2. Use ROW_NUMBER with a tie-breaker if exactly two rows per group are required.'),
      mcq('To keep one row per email from a customer import, the latest by updated_at, which window function fits best?', [
        ['ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC)', true],
        ['RANK() OVER (PARTITION BY email ORDER BY updated_at DESC)', false],
        ['DENSE_RANK() OVER (ORDER BY email, updated_at DESC)', false],
        ['COUNT(*) OVER (PARTITION BY email ORDER BY updated_at)', false],
      ], 'ROW_NUMBER numbers every row uniquely within the email, so rn = 1 is exactly one row. RANK can return two rows when timestamps tie, and the other two do not restart per email as needed.'),
    ],
    checkpoint: [
      mcq('A food-delivery app wants the 3 highest-rated restaurants in each city, and exactly 3 even when ratings tie. Which ranking expression should the CTE use?', [
        ['ROW_NUMBER() OVER (PARTITION BY city ORDER BY rating DESC, rest_id)', true],
        ['RANK() OVER (PARTITION BY city ORDER BY rating DESC, reviews DESC)', false],
        ['DENSE_RANK() OVER (PARTITION BY city ORDER BY rating DESC)', false],
        ['ROW_NUMBER() OVER (ORDER BY city, rating)', false],
      ], 'ROW_NUMBER never ties, and the rest_id tie-breaker makes the choice repeatable. RANK and DENSE_RANK can return more than 3 rows per city, and the last option neither partitions by city nor sorts best first.'),
      mcq('ShopKart\'s delivered orders for Diya are 2500, 3200 and 3000. Using DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC), which order is her dr = 2?', [
        ['The ₹3,000 order, 1010', true],
        ['The ₹2,500 order, 1002', false],
        ['The ₹3,200 order, 1005', false],
        ['None, because she has three orders', false],
      ], 'Sorted descending her orders are 3200, 3000, 2500, so the second is ₹3,000. Customers with a single order would get no dr = 2 row.'),
      mcq('In SQL Server, which query returns the 5 largest loans at a bank branch?', [
        ['SELECT TOP 5 loan_id, amount FROM loans ORDER BY amount DESC', true],
        ['SELECT loan_id, amount FROM loans ORDER BY amount DESC LIMIT 5', false],
        ['SELECT loan_id, amount FROM loans WHERE ROWNUM <= 5', false],
        ['SELECT FIRST 5 loan_id, amount FROM loans ORDER BY amount', false],
      ], 'SQL Server uses TOP (or OFFSET ... FETCH). LIMIT is MySQL and PostgreSQL, ROWNUM is Oracle, and FIRST is not SQL Server syntax.'),
    ],
  },

  /* ── RUNNING_MOVING ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_RUNNING_MOVING',
    notes: `Put ORDER BY inside OVER and a window becomes **ordered**: each row can see the rows before it.
That gives running totals, moving averages, and "change from last period" — the three most requested
numbers on any business dashboard.

## The data

daily_sales for a cloud kitchen, 1–10 March 2024 (revenue in ₹):

    sale_date  | orders | revenue
    -----------+--------+--------
    2024-03-01 | 42     | 18400
    2024-03-02 | 55     | 23100
    2024-03-03 | 61     | 26800
    2024-03-04 | 38     | 15900
    2024-03-05 | 40     | 17200
    2024-03-06 | 44     | 19000
    2024-03-07 | 47     | 20500
    2024-03-08 | 70     | 31200
    2024-03-09 | 66     | 29400
    2024-03-10 | 58     | 24600

## Running total, moving average, previous and next

    SELECT sale_date, revenue,
           SUM(revenue) OVER (ORDER BY sale_date
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total,
           ROUND(AVG(revenue) OVER (ORDER BY sale_date
                ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 0)     AS avg_3day,
           revenue - LAG(revenue) OVER (ORDER BY sale_date)      AS change_vs_prev,
           LEAD(revenue) OVER (ORDER BY sale_date)               AS next_day
    FROM daily_sales;

    sale_date  | revenue | running_total | avg_3day | change_vs_prev | next_day
    -----------+---------+---------------+----------+----------------+---------
    2024-03-01 | 18400   | 18400         | 18400    | NULL           | 23100
    2024-03-02 | 23100   | 41500         | 20750    | 4700           | 26800
    2024-03-03 | 26800   | 68300         | 22767    | 3700           | 15900
    2024-03-04 | 15900   | 84200         | 21933    | -10900         | 17200
    2024-03-05 | 17200   | 101400        | 19967    | 1300           | 19000
    2024-03-06 | 19000   | 120400        | 17367    | 1800           | 20500
    2024-03-07 | 20500   | 140900        | 18900    | 1500           | 31200
    2024-03-08 | 31200   | 172100        | 23567    | 10700          | 29400
    2024-03-09 | 29400   | 201500        | 27033    | -1800          | 24600
    2024-03-10 | 24600   | 226100        | 28400    | -4800          | NULL

- The **frame** \`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW\` is this row and the two before it, so
  avg_3day on 3 March is (18400 + 23100 + 26800) / 3 = 22,766.67. On 1 and 2 March fewer rows exist, so
  the average is over 1 and 2 days — label or drop those rows.
- A **7-day** moving average is \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\`; on this data it is 20,129
  on 7 March and 22,543 on 10 March. It smooths the weekend spike (8–9 March) that makes daily numbers
  jumpy.
- **LAG(x)** is the previous row's x, **LEAD(x)** the next row's; the first LAG and last LEAD are NULL.
  \`LAG(x, 7)\` looks 7 rows back — "same day last week" on daily data.

## The default frame trap: ROWS versus RANGE

If you write \`SUM(amount) OVER (ORDER BY txn_date)\` with no frame, the default is \`RANGE BETWEEN
UNBOUNDED PRECEDING AND CURRENT ROW\`, and RANGE treats rows with **equal** ORDER BY values as one step:

    txn_date   | amount | default (RANGE) | ROWS frame
    -----------+--------+-----------------+-----------
    2024-03-01 | 500    | 500             | 500
    2024-03-02 | 300    | 1000            | 800
    2024-03-02 | 200    | 1000            | 1000
    2024-03-03 | 400    | 1400            | 1400

Both 2 March rows show 1000. That is right for "total up to and including this date" and wrong for a
per-transaction running balance. **Write the frame explicitly** whenever ORDER BY is in OVER, and make
the ORDER BY unique (add an id) if you want one step per row.

The same default bites when you meant a total: \`SUM(amount) OVER (PARTITION BY customer_id ORDER BY
order_date)\` is a *running* total per customer, not the customer's total. Leave ORDER BY out for a
plain group total.

## Month-over-month change

Aggregate first (CTE), then compare each month with the previous:

    WITH monthly AS (
        SELECT DATE_FORMAT(order_date, '%Y-%m-01') AS month, SUM(amount) AS revenue   -- MySQL
        FROM orders WHERE status = 'DELIVERED'
        GROUP BY DATE_FORMAT(order_date, '%Y-%m-01')
    )
    SELECT month, revenue,
           LAG(revenue) OVER (ORDER BY month) AS prev_month,
           ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
                 / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS mom_pct,
           SUM(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ytd
    FROM monthly
    ORDER BY month;

On ShopKart (months shown as YYYY-MM):

    month   | revenue | prev_month | mom_pct | ytd
    --------+---------+------------+---------+------
    2024-01 | 3700    | NULL       | NULL    | 3700
    2024-02 | 4700    | 3700       | 27.0    | 8400
    2024-03 | 4900    | 4700       | 4.3     | 13300
    2024-04 | 3950    | 4900       | -19.4   | 17250

NULLIF protects against a previous month of 0. If a month has **no rows at all**, LAG silently compares
with two months ago — join to a list of months first when gaps are possible.

## Per-entity sequences: PARTITION BY plus ORDER BY

Days since each customer's previous delivered order:

    SELECT customer_id, order_id, order_date,
           LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_order,
           DATEDIFF(order_date,
                    LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS days_since_prev  -- MySQL
    FROM orders WHERE status = 'DELIVERED';

Diya's orders (22 Jan, 28 Feb, 2 Apr) give gaps of 37 and 34 days; Aarav's two delivered orders are 62
days apart. Without PARTITION BY, LAG would hand Diya's first order Aarav's last date.

## Moving windows and missing days

\`ROWS BETWEEN 6 PRECEDING\` counts **rows**, not days. If a day has no row (the kitchen was shut), the
window silently spans 8 calendar days. Fix it by joining to a calendar of every date (with 0 revenue for
missing days), or use a date-based RANGE frame where supported — PostgreSQL 11+ and MySQL 8 accept
\`RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW\` (MySQL writes \`INTERVAL 6 DAY\`); SQL Server
supports only ROWS and UNBOUNDED/CURRENT ROW for RANGE.`,
    workedExample: `**Brief:** "Show monthly delivered revenue with growth versus last month, and the year-to-date
total, January to April 2024."

**1. Grain.** One row per month — so aggregate the orders into months first, then window over the
monthly rows. A window over the raw orders would give per-order LAG, not per-month.

**2. Month as a date, not text** (sorts and charts correctly): MySQL \`DATE_FORMAT(order_date,
'%Y-%m-01')\`, SQL Server \`DATEFROMPARTS(YEAR(order_date), MONTH(order_date), 1)\`, PostgreSQL
\`DATE_TRUNC('month', order_date)\`.

**3. The growth formula.** (this month − last month) / last month × 100, with NULLIF around the
divisor. Using 100.0 keeps it decimal in SQL Server and PostgreSQL.

**4. Run it** (the query in the notes) and check by hand:
- Feb: (4700 − 3700) / 3700 = 0.2703 → 27.0%
- Mar: (4900 − 4700) / 4700 = 0.0426 → 4.3%
- Apr: (3950 − 4900) / 4900 = −0.1939 → −19.4%
- YTD after April: 3700 + 4700 + 4900 + 3950 = 17,250, the full delivered total.

**5. Read it out:** "Growth slowed from 27% in February to 4% in March, and April fell 19%. Year to date
we are at ₹17,250." Then the follow-up you should expect: why April fell — which the analyst topic
answered: fewer delivered orders (one ₹2,500 order was cancelled), not smaller ones.

**6. One caution in the report:** January's growth is NULL, not 0 — there is no December in the data.
Show it as "–", never as 0%.`,
    mcqs: [
      mcq('In the cloud-kitchen data, revenue on 1, 2 and 3 March is 18400, 23100 and 26800. What does AVG(revenue) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) give on 2 March?', [
        ['20750, the average of 1 and 2 March', true],
        ['22766.67, the average of all three days', false],
        ['NULL, because a full three-day window does not exist', false],
        ['15333.33, treating the missing day as 0', false],
      ], 'The frame contains only the rows that exist: 1 and 2 March. (18400 + 23100) / 2 = 20750. Early rows have shorter windows, which is worth flagging in a report.'),
      mcq('A ledger has two transactions on 2 March (300 and 200). With SUM(amount) OVER (ORDER BY txn_date) and no frame, both rows show the same running total. Why?', [
        ['The default RANGE frame includes all rows with the same date', true],
        ['SUM ignores the second row that shares a date with the first', false],
        ['ORDER BY inside OVER sorts the rows by amount instead', false],
        ['Running totals need a PARTITION BY clause to step by row', false],
      ], 'Without an explicit frame, ORDER BY gives RANGE UNBOUNDED PRECEDING to CURRENT ROW, which treats peers (equal dates) together. ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW steps one row at a time.'),
      mcq('ShopKart\'s monthly delivered revenue is 3700, 4700, 4900 and 3950. What month-over-month change does LAG give for April?', [
        ['−19.4%', true],
        ['−24.1%', false],
        ['+19.4%', false],
        ['−950%', false],
      ], '(3950 − 4900) / 4900 = −0.194, so −19.4%. Dividing by April instead of March gives −24.1%, which is the wrong base.'),
    ],
    checkpoint: [
      mcq('A retail store wants each day\'s sales compared with the same weekday last week, from one row per day with no gaps. Which expression gives last week\'s figure?', [
        ['LAG(sales, 7) OVER (ORDER BY sale_date)', true],
        ['LAG(sales) OVER (ORDER BY sale_date)', false],
        ['LEAD(sales, 7) OVER (ORDER BY sale_date)', false],
        ['SUM(sales) OVER (ORDER BY sale_date ROWS 7 PRECEDING)', false],
      ], 'LAG with an offset of 7 looks seven rows back, which is the same weekday when there is one row per day. LEAD looks forward, and the SUM adds a whole week up.'),
      mcq('A bank computes days between each customer\'s transactions with LAG(txn_date) OVER (ORDER BY customer_id, txn_date). Some customers\' first transaction shows a gap. What is missing?', [
        ['PARTITION BY customer_id, so LAG stops at each customer', true],
        ['A ROWS frame, so LAG reads only the previous row', false],
        ['DESC on txn_date, so LAG reads the later transaction', false],
        ['A GROUP BY customer_id around the LAG expression', false],
      ], 'Without a partition the whole table is one sequence, so a customer\'s first row takes the previous customer\'s last date. Partitioning restarts LAG for each customer and leaves the first row NULL.'),
      mcq('A food-delivery dashboard shows a "7-day average" using ROWS BETWEEN 6 PRECEDING AND CURRENT ROW over daily rows, but the kitchen was closed on some days, which have no row. What is wrong?', [
        ['Those windows stretch over more than 7 calendar days', true],
        ['ROWS frames cannot be used together with an AVG function', false],
        ['The average now includes the following six days', false],
        ['Closed days are counted twice in the average', false],
      ], 'ROWS counts rows, not dates, so a missing day pulls in an extra earlier day. Join to a full calendar with 0 for closed days, or use a date-based RANGE frame where the database supports it.'),
    ],
  },

  /* ── COHORTS_RETENTION ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_COHORTS_RETENTION',
    notes: `Two analyses appear in almost every product and growth team: **cohort retention** ("of the people
who first ordered in January, how many came back in February, March, April?") and **funnels** ("of the
people who opened the menu, how many paid?"). Both are built from pieces you already have — MIN per
user, date arithmetic, conditional counts and windows.

## The data: a food-delivery app

app_orders(user_id, order_date) — 21 orders from 10 users, January to April 2024:

    user | orders
    -----+-----------------------------------------------
    1    | 03 Jan, 10 Feb, 05 Mar
    2    | 15 Jan, 20 Mar
    3    | 28 Jan
    4    | 09 Jan, 02 Feb, 20 Feb, 01 Apr
    5    | 04 Feb, 08 Mar
    6    | 14 Feb
    7    | 25 Feb, 01 Mar, 12 Apr
    8    | 03 Mar, 09 Apr
    9    | 17 Mar
    10   | 30 Mar, 31 Mar

## Step 1: each user's cohort

A user's **cohort** is the month of their first order:

    SELECT user_id, MIN(order_date) AS first_order
    FROM app_orders GROUP BY user_id;

Users 1–4 are the January cohort (4 users), 5–7 February (3), 8–10 March (3).

## Step 2: each active month as a "month number"

Month number = months between the first order's month and this order's month (0 = the first month).
Calendar months, not 30-day periods: 28 Jan → 2 Feb is month 1.

    -- MySQL and SQL Server
    (YEAR(order_date) * 12 + MONTH(order_date)) - (YEAR(first_order) * 12 + MONTH(first_order))
    -- PostgreSQL: the same with EXTRACT(YEAR FROM ...) and EXTRACT(MONTH FROM ...)

SQL Server's \`DATEDIFF(month, first_order, order_date)\` also counts calendar-month boundaries, so it
gives the same number. MySQL's \`TIMESTAMPDIFF(MONTH, ...)\` does **not** — it counts *complete* months, so
28 Jan → 2 Feb is 0. Use the YEAR*12+MONTH form.

## Step 3: count distinct active users per cohort and month

    WITH firsts AS (
        SELECT user_id, MIN(order_date) AS first_order
        FROM app_orders GROUP BY user_id
    ),
    activity AS (
        SELECT DISTINCT a.user_id,
               DATE_FORMAT(f.first_order, '%Y-%m') AS cohort,                  -- MySQL
               (YEAR(a.order_date) * 12 + MONTH(a.order_date))
             - (YEAR(f.first_order) * 12 + MONTH(f.first_order)) AS month_number
        FROM app_orders a JOIN firsts f ON f.user_id = a.user_id
    )
    SELECT cohort, month_number, COUNT(*) AS active_users,
           FIRST_VALUE(COUNT(*)) OVER (PARTITION BY cohort ORDER BY month_number) AS cohort_size,
           ROUND(100.0 * COUNT(*)
                 / FIRST_VALUE(COUNT(*)) OVER (PARTITION BY cohort ORDER BY month_number), 1) AS retention_pct
    FROM activity
    GROUP BY cohort, month_number
    ORDER BY cohort, month_number;

    cohort  | month_number | active_users | cohort_size | retention_pct
    --------+--------------+--------------+-------------+--------------
    2024-01 | 0            | 4            | 4           | 100.0
    2024-01 | 1            | 2            | 4           | 50.0
    2024-01 | 2            | 2            | 4           | 50.0
    2024-01 | 3            | 1            | 4           | 25.0
    2024-02 | 0            | 3            | 3           | 100.0
    2024-02 | 1            | 2            | 3           | 66.7
    2024-02 | 2            | 1            | 3           | 33.3
    2024-03 | 0            | 3            | 3           | 100.0
    2024-03 | 1            | 1            | 3           | 33.3

The **DISTINCT** in activity is essential: user 4 ordered twice in February and user 10 twice in March.
Without it the January cohort shows 3 "active users" in month 1 and the March cohort 4 users in a
3-user cohort.

## The same data as a retention triangle

Managers read retention as a grid — conditional aggregation pivots it:

    SELECT cohort,
           COUNT(CASE WHEN month_number = 0 THEN 1 END) AS m0,
           COUNT(CASE WHEN month_number = 1 THEN 1 END) AS m1,
           COUNT(CASE WHEN month_number = 2 THEN 1 END) AS m2,
           COUNT(CASE WHEN month_number = 3 THEN 1 END) AS m3
    FROM activity GROUP BY cohort ORDER BY cohort;

    cohort  | m0 | m1 | m2 | m3
    --------+----+----+----+---
    2024-01 | 4  | 2  | 2  | 1
    2024-02 | 3  | 2  | 1  | 0
    2024-03 | 3  | 1  | 0  | 0

Read across a row to see one cohort age; read down a column to compare cohorts at the same age. The 0s
at the bottom right are **not** churn — the data ends in April, so the March cohort cannot have a month
2 yet. Show those cells as blank, not 0%.

## Funnels

events(user_id, event, event_time) records steps in the ordering flow: view_menu → add_to_cart →
checkout → payment_success, for 8 users on one day.

**Simple funnel** — distinct users who reached each step, with conversion from the previous step and
from the top:

    WITH steps AS (
        SELECT 1 AS step_no, 'view_menu' AS step UNION ALL
        SELECT 2, 'add_to_cart' UNION ALL
        SELECT 3, 'checkout'    UNION ALL
        SELECT 4, 'payment_success'
    ),
    reached AS (
        SELECT s.step_no, s.step, COUNT(DISTINCT e.user_id) AS users
        FROM steps s LEFT JOIN events e ON e.event = s.step
        GROUP BY s.step_no, s.step
    )
    SELECT step, users,
           ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_no), 1) AS pct_of_previous,
           ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_no), 1) AS pct_of_top
    FROM reached ORDER BY step_no;

    step            | users | pct_of_previous | pct_of_top
    ----------------+-------+-----------------+-----------
    view_menu       | 8     | NULL            | 100.0
    add_to_cart     | 6     | 75.0            | 75.0
    checkout        | 5     | 83.3            | 62.5
    payment_success | 3     | 60.0            | 37.5

Count **users**, not events: user 4 added to cart twice and user 6 viewed the menu twice, so event counts
(9 views, 7 add-to-carts) overstate every step.

**Strict funnel** — a step counts only if it happened after the previous one. One row per user with
the first time of each step, then compare times:

    WITH per_user AS (
        SELECT user_id,
               MIN(CASE WHEN event = 'view_menu'       THEN event_time END) AS t_view,
               MIN(CASE WHEN event = 'add_to_cart'     THEN event_time END) AS t_cart,
               MIN(CASE WHEN event = 'checkout'        THEN event_time END) AS t_checkout,
               MIN(CASE WHEN event = 'payment_success' THEN event_time END) AS t_paid
        FROM events GROUP BY user_id
    )
    SELECT COUNT(t_view) AS viewed,
           COUNT(CASE WHEN t_cart > t_view THEN 1 END) AS carted,
           COUNT(CASE WHEN t_cart > t_view AND t_checkout > t_cart THEN 1 END) AS checked_out,
           COUNT(CASE WHEN t_cart > t_view AND t_checkout > t_cart AND t_paid > t_checkout
                      THEN 1 END) AS paid
    FROM per_user;

    viewed | carted | checked_out | paid
    -------+--------+-------------+-----
    8      | 5      | 4           | 2

The strict counts are lower: user 7 added to cart (from a reorder link) *before* viewing the menu, so a
strict funnel drops them at the cart step. Which funnel you report is a product decision — state it.`,
    mcqs: [
      mcq('In the food-delivery data, user 4 ordered on 9 Jan, 2 Feb, 20 Feb and 1 Apr. Which cohort and month numbers is user 4 active in?', [
        ['January cohort; months 0, 1 and 3', true],
        ['January cohort; months 0, 1, 1 and 3', false],
        ['February cohort; months 0 and 2', false],
        ['January cohort; months 0, 1 and 2', false],
      ], 'The first order is in January, so that is the cohort. February is month 1 (counted once, thanks to DISTINCT) and April is month 3; there was no March order.'),
      mcq('A retention query omits DISTINCT in the activity step and the March cohort shows 4 active users in month 0 though the cohort has 3 users. Why?', [
        ['A user who ordered twice in March is counted twice', true],
        ['A February user was moved into the March cohort', false],
        ['Month 0 also includes the next month\'s orders', false],
        ['COUNT(*) adds one for the cohort header row', false],
      ], 'Without DISTINCT, activity has one row per order, so user 10\'s two March orders count as two users. Retention must count distinct users per cohort and month.'),
      mcq('Why does the funnel query count DISTINCT user_id at each step rather than COUNT(*) of events?', [
        ['Users can repeat a step, which would inflate the step counts', true],
        ['COUNT(*) cannot be used together with a LEFT JOIN', false],
        ['DISTINCT makes the step order follow the event times', false],
        ['Event rows have no user_id unless DISTINCT is used', false],
      ], 'A funnel measures people. User 6 viewed the menu twice and user 4 added to cart twice, so event counts (9 and 7) overstate the 8 and 6 users.'),
    ],
    checkpoint: [
      mcq('In MySQL, a cohort query uses TIMESTAMPDIFF(MONTH, first_order, order_date) as the month number. A user who first ordered on 28 Jan and again on 2 Feb gets month 0 for February. Why?', [
        ['TIMESTAMPDIFF counts complete months, not calendar months', true],
        ['TIMESTAMPDIFF always rounds its result down to even months', false],
        ['MySQL counts months from 0 only in leap years like 2024', false],
        ['The arguments are reversed, so the result is negative', false],
      ], 'Only 5 days have passed, so no complete month has elapsed. Cohort month numbers are calendar months; use (YEAR*12 + MONTH) differences instead.'),
      mcq('A college\'s app retention triangle shows 0% in month 2 for the most recent cohort, whose students joined last month. How should the analyst present it?', [
        ['Leave the cell blank; that month has not happened yet for the cohort', true],
        ['Show 0%, since none of the students in that cohort were active in that month', false],
        ['Copy the previous cohort\'s month-2 rate as an estimate', false],
        ['Remove the most recent cohort from the triangle', false],
      ], 'Month 2 for a cohort that joined last month lies in the future, so there is no data rather than zero activity. Showing 0% suggests a churn that has not happened.'),
      mcq('A checkout funnel reports 1,000 users viewed, 400 carted, 300 checked out and 240 paid. What is checkout-to-payment conversion, and conversion from the top?', [
        ['80% from checkout, and 24% from the top', true],
        ['24% from checkout, and 80% from the top', false],
        ['60% from checkout, and 24% from the top', false],
        ['80% from checkout, and 60% from the top', false],
      ], '240 / 300 = 80% of those who checked out paid, and 240 / 1000 = 24% of those who viewed. In SQL these are LAG and FIRST_VALUE over the step order.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_DEBUGGING',
    notes: `Window-function bugs are rarely errors. A running total that jumps, a rank list that is one row
too long, a retention rate over 100% — they all look plausible at a glance. Seven faults, each with the
symptom, the cause and the fix. Check every window query with a hand calculation on two or three rows.

## 1. "Windowed functions can only appear in the SELECT or ORDER BY clauses"

**Symptom:** \`SELECT ... FROM orders WHERE ROW_NUMBER() OVER (ORDER BY amount DESC) <= 3\` fails (SQL
Server error 4108; MySQL and PostgreSQL give similar errors).
**Cause:** WHERE is evaluated before window functions are computed.
**Fix:** compute the rank in a CTE or subquery, then \`WHERE rn <= 3\` outside.

## 2. A running total jumps by two transactions at once

**Symptom:** two rows on 2 March both show a running balance of 1000; the previous row showed 500.
**Cause:** \`SUM(amount) OVER (ORDER BY txn_date)\` has no frame, so the default \`RANGE ... CURRENT ROW\`
includes all rows with the same date.
**Fix:** \`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, and a unique ORDER BY
(\`txn_date, txn_id\`) so the order of same-day rows is fixed.

## 3. "Share of customer spend" is 100% on every first order

**Symptom:** Diya's orders show 100.0%, 56.1% and 34.5%, which do not add to 100.
**Cause:** \`amount / SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date)\` — the ORDER BY
turned the customer total into a **running** total, so each order is divided by the spend so far.
**Fix:** remove ORDER BY from the OVER: \`SUM(amount) OVER (PARTITION BY customer_id)\` gives 28.7, 36.8
and 34.5, which add to 100.

## 4. Days-since-previous-order is wrong for each customer's first order

**Symptom:** Diya's first order shows a "previous order" dated 9 March — which is Aarav's.
**Cause:** \`LAG(order_date) OVER (ORDER BY customer_id, order_date)\` treats the whole table as one
sequence.
**Fix:** \`LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)\`; the first order of each
customer then correctly shows NULL.

## 5. "Top 2 per region" returns 3 rows for one region — or different rows each run

**Symptom A:** North returns Earbuds, Cooker and Kurta. **Cause:** RANK() gives the two ₹48,000 products
the same rank 2. **Fix:** decide whether ties belong in the answer; if exactly two, use ROW_NUMBER.
**Symptom B:** with ROW_NUMBER, the second North product is Cooker one day and Kurta the next.
**Cause:** ROW_NUMBER over tied values is arbitrary. **Fix:** add a tie-breaker to the ORDER BY
(\`revenue DESC, product\`) and say what it is.

## 6. Retention above what is possible

**Symptom:** the March cohort has 3 users but month 0 shows 4 active users (133%).
**Cause:** the activity step has one row per **order**, not per user per month, so a user with two
orders in a month counts twice.
**Fix:** \`SELECT DISTINCT user_id, cohort, month_number\` in the activity step (or COUNT(DISTINCT
user_id)).

## 7. A "7-day" moving average that covers 8 days

**Symptom:** the moving average dips oddly after a holiday. The kitchen was closed on 3 March and that
date has no row.
**Cause:** \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\` counts rows; with a missing date the seven rows
reach back eight or more days, and the closed day's zero is not in the average at all.
**Fix:** LEFT JOIN from a calendar table of every date and use COALESCE(revenue, 0), or a date-based
RANGE frame (PostgreSQL, MySQL 8). On a tiny example — revenue 100, 200, (closed), 300, 400 for 1–5
March — the 3-row average on 5 March is 300, but the true 3-day average (3, 4, 5 March) is
(0 + 300 + 400) / 3 = 233.33.

## A checking routine for window queries

1. Take one partition (one customer, one region) and compute the window value by hand.
2. Shares within a partition must add to 100; running totals must end at the group total.
3. Look at the first and last rows of each partition — that is where LAG, LEAD and frames go wrong.
4. Re-run and compare: if results change between runs, the ORDER BY in OVER is not unique.`,
    mcqs: [
      mcq('A bank statement query uses SUM(amount) OVER (PARTITION BY account_id ORDER BY txn_date) as the running balance. Two deposits on the same day show the same balance. Which change fixes it?', [
        ['ORDER BY txn_date, txn_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', true],
        ['Remove ORDER BY from the OVER clause entirely', false],
        ['Replace SUM with a running COUNT over the same window, partitioned by account', false],
        ['Add GROUP BY txn_date to the query', false],
      ], 'An explicit ROWS frame steps one row at a time, and the unique ORDER BY fixes the order of same-day rows. Removing ORDER BY gives the account total on every row instead.'),
      mcq('An order\'s share of its customer\'s spend is computed with SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date) as the divisor. What is the symptom?', [
        ['Every customer\'s first order shows 100%', true],
        ['Every share is exactly half its correct value', false],
        ['The query fails because ORDER BY is not allowed', false],
        ['Only the last order of each customer is returned', false],
      ], 'With ORDER BY the SUM becomes a running total, so the first order is divided by itself. Without ORDER BY the divisor is the customer\'s full total.'),
      mcq('A top-3-products-per-category query with ROW_NUMBER returns different products on different runs, though the data has not changed. What causes it?', [
        ['Ties in the ORDER BY inside OVER, with no tie-breaker column', true],
        ['ROW_NUMBER is random unless a PARTITION BY clause is given', false],
        ['The CTE is cached, and the cache is refreshed between runs', false],
        ['WHERE rn <= 3 is applied before ROW_NUMBER is computed', false],
      ], 'Rows with equal revenue can be numbered in any order, and the engine may choose differently each time. Adding a unique tie-breaker such as product_id makes the result repeatable.'),
      mcq('A funnel query counts events per step and reports 9 menu views and 7 add-to-carts, though only 8 users viewed the menu. What is the fix?', [
        ['Count DISTINCT user_id at each step', true],
        ['Use RANK() to number the events per user', false],
        ['Add ORDER BY event_time to the query', false],
        ['Filter out events that happened after midnight', false],
      ], 'Repeated actions by one user inflate event counts. A funnel step counts people, so each step needs COUNT(DISTINCT user_id).'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_PRACTICE',
    notes: `Six window-function exercises on a bank's branch data in Pune. Write each query, run it (MySQL 8,
PostgreSQL, SQL Server or SQLite 3.25+), and check your result against the one given.

## The data

Monthly deposits (₹ lakh) per branch, and a log of KYC phone-number updates:

    CREATE TABLE branch_deposits (branch VARCHAR(20), month CHAR(7), deposits INT);
    INSERT INTO branch_deposits VALUES
      ('Kothrud','2024-01',420), ('Kothrud','2024-02',380), ('Kothrud','2024-03',510),
      ('Baner','2024-01',300),   ('Baner','2024-02',450),   ('Baner','2024-03',450),
      ('Aundh','2024-01',510),   ('Aundh','2024-02',290),   ('Aundh','2024-03',330);

    CREATE TABLE kyc_updates (customer_id INT, phone VARCHAR(15), updated_on DATE);
    INSERT INTO kyc_updates VALUES
      (501,'98200 11111','2024-01-10'), (501,'98200 22222','2024-03-15'),
      (502,'98330 33333','2024-02-01'),
      (503,'97000 44444','2024-01-05'), (503,'97000 55555','2024-02-20'),
      (503,'97000 66666','2024-02-11');

## Exercise 1 — each month's share of the branch's quarter

    SELECT branch, month, deposits,
           SUM(deposits) OVER (PARTITION BY branch) AS branch_total,
           ROUND(100.0 * deposits / SUM(deposits) OVER (PARTITION BY branch), 1) AS pct_of_branch
    FROM branch_deposits ORDER BY branch, month;

Aundh: 510 / 290 / 330 of 1130 → 45.1, 25.7, 29.2. Baner: total 1200 → 25.0, 37.5, 37.5. Kothrud:
total 1310 → 32.1, 29.0, 38.9.

## Exercise 2 — the top branch each month

    WITH r AS (
        SELECT month, branch, deposits,
               RANK() OVER (PARTITION BY month ORDER BY deposits DESC) AS rnk
        FROM branch_deposits
    )
    SELECT month, branch, deposits FROM r WHERE rnk = 1 ORDER BY month;

    month   | branch  | deposits
    --------+---------+---------
    2024-01 | Aundh   | 510
    2024-02 | Baner   | 450
    2024-03 | Kothrud | 510

No month has a tie at the top, so RANK and ROW_NUMBER agree here. Say which you would use if two
branches tied.

## Exercise 3 — running total per branch

    SELECT branch, month, deposits,
           SUM(deposits) OVER (PARTITION BY branch ORDER BY month
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
    FROM branch_deposits ORDER BY branch, month;

Aundh 510 → 800 → 1130; Baner 300 → 750 → 1200; Kothrud 420 → 800 → 1310. Each branch's last running
value equals its total from Exercise 1 — check it.

## Exercise 4 — change from the previous month, per branch

    SELECT branch, month, deposits,
           deposits - LAG(deposits) OVER (PARTITION BY branch ORDER BY month) AS change
    FROM branch_deposits ORDER BY branch, month;

Aundh NULL, −220, +40; Baner NULL, +150, 0; Kothrud NULL, −40, +130. The January rows are NULL because
there is no December in the data — not 0.

## Exercise 5 — the latest phone number per customer

    WITH r AS (
        SELECT customer_id, phone, updated_on,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_on DESC) AS rn
        FROM kyc_updates
    )
    SELECT customer_id, phone, updated_on FROM r WHERE rn = 1 ORDER BY customer_id;

    customer_id | phone       | updated_on
    ------------+-------------+-----------
    501         | 98200 22222 | 2024-03-15
    502         | 98330 33333 | 2024-02-01
    503         | 97000 55555 | 2024-02-20

Customer 503's rows were not inserted in date order; ordering by updated_on, not by insertion, is what
makes 97000 55555 the answer.

## Exercise 6 — two-month moving average of total deposits

Total all branches per month, then average each month with the one before:

    SELECT month, SUM(deposits) AS total,
           ROUND(AVG(SUM(deposits)) OVER (ORDER BY month
                 ROWS BETWEEN 1 PRECEDING AND CURRENT ROW), 1) AS avg_2m
    FROM branch_deposits
    GROUP BY month ORDER BY month;

    month   | total | avg_2m
    --------+-------+-------
    2024-01 | 1230  | 1230.0
    2024-02 | 1120  | 1175.0
    2024-03 | 1290  | 1205.0

January's "average" is one month only — show or drop it, but do not present it as a two-month figure.`,
    mcqs: [
      mcq('In Exercise 4, Baner\'s deposits are 300, 450 and 450. What does deposits − LAG(deposits) show for Baner in March?', [
        ['0', true],
        ['150', false],
        ['NULL', false],
        ['450', false],
      ], 'LAG in March reads February\'s 450, and 450 − 450 = 0. NULL appears only in January, which has no previous row in the partition.'),
      mcq('Customer 503 has updates dated 5 Jan, 20 Feb and 11 Feb (inserted in that order). Which phone does Exercise 5 return?', [
        ['97000 55555, from the 20 February update', true],
        ['97000 66666, the last row that was inserted', false],
        ['97000 44444, from the first update', false],
        ['All three, because the dates are not in order', false],
      ], 'ROW_NUMBER orders by updated_on DESC, so the 20 February row is number 1 whatever the insertion order. Tables have no inherent row order to rely on.'),
      mcq('Kothrud\'s deposits are 420, 380 and 510. In Exercise 3, what is its running total in February?', [
        ['800', true],
        ['1310', false],
        ['380', false],
        ['890', false],
      ], 'The running total adds January and February: 420 + 380 = 800. The March row reaches the full 1310.'),
      mcq('Exercise 2 ranks branches within each month. What would change if Exercise 2 used PARTITION BY branch instead of PARTITION BY month?', [
        ['It would find each branch\'s best month, not each month\'s best branch', true],
        ['Nothing, since both list every branch and month once', false],
        ['It would fail, since month is not in a GROUP BY clause', false],
        ['It would rank every row as 1, since each branch becomes its own window', false],
      ], 'The partition decides what is compared. Partitioning by branch ranks a branch\'s three months against each other, answering a different question.'),
      mcq('In Exercise 6, why can AVG(SUM(deposits)) OVER (...) be used in a query with GROUP BY month?', [
        ['The window runs after grouping, over the monthly totals', true],
        ['SUM inside AVG is optimised away into a single average', false],
        ['GROUP BY is ignored when a window function is present', false],
        ['AVG and SUM cancel out, leaving the deposits column', false],
      ], 'GROUP BY produces one row per month with SUM(deposits); the window function is computed afterwards over those rows, so it averages each month\'s total with the previous month\'s.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_INTERVIEW_QUESTION',
    notes: `Window functions are the most common "harder" SQL interview topic for analysts. Interviewers ask
a small set of patterns and then push on ties, NULLs and edge cases. Talk through the steps and check a
row by hand before declaring a query done.

## Question 1 — "Find each customer's second-highest order."

**Clarify:** "If a customer's two biggest orders are equal, is the second-highest that same value or the
next different value? And customers with one order — skip them or show NULL?"

**Model answer (next different value, skip single-order customers):**

    WITH ranked AS (
        SELECT customer_id, order_id, amount,
               DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS dr
        FROM orders WHERE status = 'DELIVERED'
    )
    SELECT customer_id, order_id, amount FROM ranked WHERE dr = 2;

On ShopKart: customer 1 → order 1007 (₹950), 2 → 1010 (₹3,000), 3 → 1004 (₹1,500). Customers 4 and 5 have
one delivered order each and do not appear.

**Why DENSE_RANK:** with amounts 3000, 3000, 2500, DENSE_RANK makes 2500 the second-highest *value*;
ROW_NUMBER would return the second 3000; RANK would give 2500 rank 3 and return nothing for dr = 2.

**Follow-ups:**
- *"Without window functions?"* A correlated subquery: the MAX(amount) per customer among amounts below
  that customer's MAX.
- *"Top 3 products per category?"* Same pattern with PARTITION BY category and \`<= 3\`.
- *"Show NULL for single-order customers?"* LEFT JOIN customers to the dr = 2 result.

## Question 2 — "This table has duplicate rows per customer. Keep only the latest."

**Model answer:**

    WITH ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY email ORDER BY updated_at DESC, import_id DESC) AS rn
        FROM customer_import
    )
    SELECT * FROM ranked WHERE rn = 1;

"I use ROW_NUMBER because I need exactly one row per email; import_id breaks ties between identical
timestamps so the result is repeatable. Before deleting anything, I would count: rows, distinct emails,
and rows with rn > 1 — those three must agree."

**Follow-ups:**
- *"Delete the duplicates in place."* SQL Server can delete through the CTE (\`DELETE FROM ranked WHERE
  rn > 1\`). MySQL cannot; join the table to the ranked result on its key and delete where rn > 1. In
  production, do it in a transaction and check the count first.
- *"What if 'latest' isn't the best — say the latest row has a blank phone?"* Rank by quality first:
  \`ORDER BY CASE WHEN phone IS NULL THEN 1 ELSE 0 END, updated_at DESC\`.

## Question 3 — "Build monthly cohort retention."

**Model answer — say the steps before writing:**
1. Each user's first order month — \`MIN(order_date)\` per user.
2. Every month each user was active, as a month number since their first month (calendar months:
   YEAR*12+MONTH differences), **distinct** per user and month.
3. Count users per cohort and month number; divide by the cohort's month-0 count
   (\`FIRST_VALUE(COUNT(*)) OVER (PARTITION BY cohort ORDER BY month_number)\`).
4. Pivot to a triangle with conditional aggregation if a grid is wanted.

"On the food-delivery data the January cohort has 4 users, with 2, 2 and 1 active in months 1, 2 and 3
— 50%, 50%, 25% retention."

**Follow-ups:**
- *"Why is a newer cohort's month 2 empty, not 0?"* The month has not happened for them yet.
- *"Does a user with three orders in a month count three times?"* No — that is what DISTINCT prevents.
- *"How would you tell whether retention is improving?"* Compare cohorts at the same month number down a
  column, not cohorts at different ages.`,
    mcqs: [
      mcq('A customer\'s delivered order amounts are 3000, 3000 and 2500. With DENSE_RANK() ordered by amount descending, which amount has dr = 2?', [
        ['2500', true],
        ['3000', false],
        ['No row has dr = 2', false],
      ], 'DENSE_RANK gives both 3000s rank 1 and the next distinct value rank 2. RANK would number 2500 as 3, leaving no rank 2.'),
      mcq('Before deleting duplicate customer rows found with ROW_NUMBER, which check should an analyst run?', [
        ['Total rows minus rows with rn > 1 equals the count of distinct emails', true],
        ['The number of rows with rn = 1 is larger than the total rows', false],
        ['Every email appears in the ranked result at least twice', false],
        ['The ranked CTE returns the same columns as the table', false],
      ], 'Keeping one row per email must leave exactly as many rows as there are distinct emails; if the counts disagree, the partition or the filter is wrong and the delete would remove real data.'),
      mcq('In a cohort-retention answer, why is the month-0 count used as the denominator for every month of that cohort?', [
        ['Month 0 is when every user in the cohort was active, so it is the cohort size', true],
        ['Month 0 always has the most orders, so it gives the smallest and safest rate', false],
        ['The denominator must be the same for every cohort in the table', false],
        ['Month 0 has no NULL values, unlike the later months', false],
      ], 'By definition every user in the cohort ordered in their first month, so month 0 counts the cohort. Retention in month n is the share of those users still active.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_MINI_PROJECT',
    notes: `# An E-commerce Analysis in SQL

You are the analyst at ShopKart, now a few months older and much bigger. The category manager has sent
a brief: she wants six answers for a quarterly review, each backed by a query she can re-run. You will
write the SQL, check every number, and explain each result in plain English.

## The data

Use this schema (MySQL 8, PostgreSQL or SQL Server — say which):

    customers   (customer_id PK, name, city, region, signup_date)
    products    (product_id PK, name, category, list_price)
    orders      (order_id PK, customer_id FK, order_date, status, amount, discount)
                -- status: DELIVERED, CANCELLED, RETURNED; amount in ₹; discount NULL when no coupon
    order_items (order_id FK, product_id FK, qty, unit_price)
    events      (user_id, event, event_time)
                -- event: view_product, add_to_cart, checkout, payment_success

Load it with **at least 300 orders over at least 6 months**, from **at least 60 customers in 3 or more
regions**, and events for at least 100 users. Generate it any way you like — a Python script, an Excel
sheet exported to CSV, or INSERT statements — and include the script or file. Make the data realistic
enough to be interesting: some cancellations and returns, some customers with one order and some with
many, some NULL discounts, and at least one tie in product revenue.

**Before you trust any query, run it on ShopKart's 12-order sample from this track's lessons**, where
you know the answers: delivered revenue ₹17,250; repeat-buyer share 60% (3 of 5 buyers); top category
Electronics at ₹5,000 (29.0%); March's delivered revenue ₹4,900, Pune ₹2,750 and Mumbai ₹2,150.

## The six questions

1. **Revenue by month and category** — delivered revenue (from order lines) per month per category, with
   each category's share of the month.
2. **Top products per region** — the top 3 products by delivered revenue in each region. Decide how ties
   are handled, and say why.
3. **Repeat customers** — the share of buyers with two or more delivered orders, overall and per region.
4. **Month-over-month growth** — monthly delivered revenue with MoM % change and a running year-to-date
   total.
5. **Cohort retention** — monthly first-order cohorts, active users by month number, retention % and a
   triangle (m0, m1, m2, ...).
6. **Checkout funnel** — distinct users at each step, conversion from the previous step and from the
   top; then a strict version that requires the steps in time order, and a sentence on the difference.

## Deliverables

- \`schema.sql\` and your data generator or load files.
- \`analysis.sql\` — one clearly commented query per question, each starting with the question restated
  as one precise sentence.
- \`results.md\` (or a PDF) — each question's result table (first rows if long), a reconciliation check,
  and two or three sentences of interpretation a manager can act on.
- A short **assumptions** list: what counts as revenue, a buyer, a cohort, an active month, and how ties
  were broken.

## Acceptance criteria

- Every query runs without error on your chosen database, and on the 12-order sample gives the known
  answers above.
- Category revenue for any month adds up to that month's total delivered revenue, and category shares
  add to 100% (± rounding).
- Each region's top-3 list follows the stated tie rule; re-running gives the same rows.
- Each cohort's month-0 retention is 100% and no retention value exceeds 100%; future months for recent
  cohorts are blank, not 0%.
- Funnel steps never increase from one step to the next, and the strict funnel is never above the simple
  one at any step.
- Running year-to-date in the last month equals the total of delivered revenue.
- No query sums an order-level amount after joining to order_items.`,
    mcqs: [
      mcq('In the mini project, category revenue for March adds up to more than March\'s total delivered revenue. Which mistake is the most likely cause?', [
        ['Summing orders.amount after joining to order_items', true],
        ['Using DENSE_RANK instead of RANK for the categories', false],
        ['Formatting the month as text rather than as a date', false],
        ['Ordering the result by category name, not revenue', false],
      ], 'Joining orders to order lines repeats each order once per line, so an order-level amount is counted several times. Category revenue must come from qty × unit_price at the line grain.'),
      mcq('A cohort in the project shows 112% retention in month 1. Which acceptance check catches it, and what is the usual cause?', [
        ['"No retention above 100%"; users counted once per order, not once per month', true],
        ['"Funnel steps never increase"; events were counted instead of distinct users', false],
        ['"YTD equals total revenue"; a missing ROWS frame on the running sum', false],
        ['"Same rows on re-run"; a tie-breaker missing from ROW_NUMBER', false],
      ], 'Retention cannot exceed the cohort size. A value above 100% almost always means the activity step was not made distinct per user and month.'),
    ],
    assignment: {
      title: 'An E-commerce Analysis in SQL',
      description: 'A set of SQL queries over an orders, customers and products database answering a manager’s brief: revenue by month and category, top products per region, repeat-customer share, monthly cohort retention and a checkout funnel — each query explained and its result checked.',
      instructions: `Complete the analysis described in this unit's brief and submit a repository link or a zip.

**Submit:**

1. \`schema.sql\` and the script or files that load your data (at least 300 orders over 6 months, 60
   customers in 3+ regions, events for 100+ users).
2. \`analysis.sql\` with one commented query per question. Each starts with the question restated as a
   precise sentence and names the database it was run on.
3. \`results.md\` or a PDF: for each of the six questions, the result (or its first rows), the
   reconciliation you ran and its outcome, and a short interpretation for the manager.
4. An assumptions list: the definitions of revenue, buyer, cohort, active month and funnel step, and
   your tie-breaking rule for the top-3 products.
5. A screenshot or pasted output showing your queries on the 12-order ShopKart sample returning the
   known answers given in the brief.

**Before you submit, run every acceptance check in the brief** and record the result next to it.`,
      rubric: [
        { criterion: 'Correct results', description: 'All six queries run and answer the stated question; results on the 12-order sample match the known answers; no order-level amount is summed after a join to order_items.', maxPoints: 30 },
        { criterion: 'Window functions used well', description: 'Shares, top-N per region, MoM change, running totals, cohort retention and funnel conversion use appropriate window functions with correct PARTITION BY, ORDER BY and explicit frames; tie handling is deliberate and repeatable.', maxPoints: 25 },
        { criterion: 'Checks and reconciliation', description: 'Every acceptance criterion is run and recorded: category totals reconcile to monthly totals, retention never exceeds 100% with blank future cells, funnel steps never increase, YTD equals the total.', maxPoints: 20 },
        { criterion: 'Interpretation and assumptions', description: 'Each result has a clear, accurate business reading; definitions of revenue, buyer, cohort and active month are stated; caveats such as short windows and incomplete cohorts are mentioned.', maxPoints: 15 },
        { criterion: 'Readable SQL and data set-up', description: 'Queries are formatted, use CTEs with meaningful names and comments; the schema and data load are reproducible from the submission.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_SQL_WINDOWS_CHECKPOINT',
    notes: `Ten questions on window functions for analysis: windows that keep every row, PARTITION BY and
OVER (), ranking and ties, deduplication, running totals and frames, LAG and LEAD, cohort retention and
funnels. Several show a query and a few rows and ask what comes out — compute it by hand for one
partition before choosing.`,
    checkpoint: [
      mcq('A retail chain\'s monthly table has 4 stores × 12 months = 48 rows. How many rows does a query with RANK() OVER (PARTITION BY month ORDER BY sales DESC) return, with no WHERE?', [
        ['48', true],
        ['12', false],
        ['4', false],
        ['1', false],
      ], 'A window function adds a column without removing rows, so all 48 rows come back, each with its rank among the stores that month. Only a filter on the rank would reduce them.'),
      mcq('Marks in one class are 92, 88, 88 and 75. Ordered by marks descending, what are the ROW_NUMBER, RANK and DENSE_RANK values for the 75?', [
        ['4, 4 and 3', true],
        ['4, 3 and 3', false],
        ['3, 4 and 3', false],
        ['4, 4 and 4', false],
      ], 'ROW_NUMBER always counts 1 to 4. RANK skips after the tie (1, 2, 2, 4). DENSE_RANK does not skip (1, 2, 2, 3).'),
      mcq('Daily food-delivery orders are 120, 150, 90 and 140 for days 1 to 4. What is SUM(orders) OVER (ORDER BY day ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) on day 3?', [
        ['240', true],
        ['360', false],
        ['230', false],
        ['500', false],
      ], 'The frame is day 3 and the row before it: 150 + 90 = 240. Days 1–3 would give 360, and the running total to day 4 is 500.'),
      mcq('A bank\'s monthly deposits for one branch are 300, 450 and 450 for January to March. What does LEAD(deposits) OVER (ORDER BY month) give for March?', [
        ['NULL', true],
        ['450', false],
        ['0', false],
        ['300', false],
      ], 'LEAD looks at the next row, and March is the last row of the window, so there is none. LAG would have given February\'s 450.'),
      mcq('An analyst writes ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) in a query grouped by city. What does the column show?', [
        ['Each city\'s share of the total revenue in the result', true],
        ['Each city\'s share of its own region\'s revenue', false],
        ['A running percentage that reaches 100 at the last city', false],
        ['The same value, 100.0, on every city row', false],
      ], 'OVER () makes the whole grouped result one window, so the SUM is the grand total and each city is divided by it. A running share would need ORDER BY in the OVER.'),
      mcq('A customer table import has 3 rows for one email (updated 1 Jan, 5 Mar, 5 Mar). Ranking with RANK() OVER (PARTITION BY email ORDER BY updated_at DESC) and keeping rank 1 returns how many rows for that email?', [
        ['2', true],
        ['1', false],
        ['3', false],
        ['0', false],
      ], 'The two 5 March rows tie at rank 1, so both are kept. ROW_NUMBER with a tie-breaker is the right tool when exactly one row must survive.'),
      mcq('A college app\'s cohort table shows the January cohort with 200 users in month 0 and 70 active in month 2. What is month-2 retention?', [
        ['35%', true],
        ['70%', false],
        ['65%', false],
        ['28.6%', false],
      ], 'Retention is active users divided by the cohort size from month 0: 70 / 200 = 35%. 65% is the share that did not return.'),
      mcq('In a funnel, 500 users added to cart, 350 started checkout and 280 paid. What is pct_of_previous for the payment step, computed with LAG over the step order?', [
        ['80%', true],
        ['56%', false],
        ['70%', false],
        ['20%', false],
      ], 'LAG brings the checkout count (350) onto the payment row, and 280 / 350 = 80%. 56% is payment over add-to-cart, and 70% is checkout over add-to-cart.'),
      mcq('Monthly revenue for a retail chain is ₹12 lakh, ₹15 lakh and ₹12 lakh. What month-over-month change does the third month show?', [
        ['−20%', true],
        ['−25%', false],
        ['0%', false],
        ['+20%', false],
      ], 'MoM uses the previous month as the base: (12 − 15) / 15 = −20%. −25% divides by the current month, and 0% compares with the first month instead.'),
      mcq('Which query returns ShopKart customers whose latest delivered order was above ₹2,000, and runs in MySQL 8, PostgreSQL and SQL Server?', [
        ['A CTE with ROW_NUMBER() per customer by order_date DESC, then WHERE rn = 1 AND amount > 2000', true],
        ['WHERE ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) = 1 AND amount > 2000', false],
        ['GROUP BY customer_id HAVING MAX(order_date) AND amount > 2000', false],
        ['SELECT TOP 1 PER customer_id ... ORDER BY order_date DESC', false],
      ], 'The window must be computed in a CTE or subquery and filtered outside. A window function in WHERE is an error, the HAVING version is not valid logic, and TOP 1 PER is not SQL.'),
    ],
  },
];
