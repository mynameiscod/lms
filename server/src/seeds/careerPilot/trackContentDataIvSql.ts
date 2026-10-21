/**
 * Career-track content: the analyst SQL interview (Data Analytics + AI, batch A5, Year 4).
 *
 * DT_IV_SQL_DA — the SQL round of a data / business / product analyst interview: aggregation and join
 * traps, window functions, business-case queries written live, and the habits that make an
 * interviewer trust a query. Year 3 (DT_SQL_ANALYST, DT_SQL_WINDOWS) taught every idea here; these
 * units are the interview version — the question as it is asked, the answer that wins, the follow-up
 * and the trap — and they go past Year 3 into what it did not ask: SUM over no rows, many-to-many
 * row counts, SUM(DISTINCT) as a false fix, reconciliation joins, LAST_VALUE frames, gaps and
 * islands, filtering before a window, missing months, sequences, time zones and collation.
 *
 * Every result table and number below was produced by running the query (SQLite 3.50 standing in for
 * the server); where MySQL 8, PostgreSQL and SQL Server differ, the notes say so.
 *
 * Skills. The topic is multi-skill: SQL_AGGREGATION by default, IV_WINDOWS → SQL_WINDOW_FUNCTIONS by
 * attribution. Every checkpoint question names its skill with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const AGG = 'SQL_AGGREGATION';
const WIN = 'SQL_WINDOW_FUNCTIONS';

/** The interview dataset, described once and shown in every unit that uses it. */
const DATASET = `## The data used in this topic

DailyCart is a grocery-delivery app in Bengaluru. Interviewers describe tables in one line; these are
small enough to check every answer by eye.

    users(user_id, name, city, signup_date, referrer_id)
      1 Ananya   Bengaluru  2024-01-03  NULL
      2 Vikram   Bengaluru  2024-01-10  1
      3 Farah    Hyderabad  2024-01-15  NULL
      4 Joseph   Chennai    2024-02-02  1
      5 Ishita   NULL       2024-02-20  3
      6 Manoj    Hyderabad  2024-03-05  NULL

    orders(order_id, user_id, order_date, status, amount)
      101 1 2024-01-05 DELIVERED 450     107 4 2024-02-15 DELIVERED 410
      102 1 2024-01-20 DELIVERED 300     108 3 2024-02-28 RETURNED  620
      103 2 2024-01-12 CANCELLED 800     109 5 2024-03-02 DELIVERED 275
      104 3 2024-01-18 DELIVERED 620     110 1 2024-03-09 DELIVERED 520
      105 1 2024-02-03 DELIVERED 300     111 4 2024-03-11 DELIVERED 410
      106 2 2024-02-14 DELIVERED 950     112 2 2024-03-25 CANCELLED 640

    tickets(ticket_id, user_id, opened_on)     -- support tickets: user 1 has 2, users 2 and 3 have 1
    events(user_id, event_date, event)         -- add_to_cart / payment events in March
    logins(user_id, login_date)                -- one row per login (duplicates possible)

Delivered revenue is ₹4,235 from 9 orders by 5 users. Manoj (6) never ordered.`;

export const TRACK_DATA_IV_SQL_BUNDLES: PilotBundle[] = [
  /* ── IV_AGGREGATES_JOINS ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_IV_AGGREGATES_JOINS',
    notes: `The first ten minutes of an analyst SQL round are almost always aggregation and joins. Nobody
fails because they cannot write GROUP BY; they fail because a NULL, a duplicate key or a second
one-to-many join quietly changes the number, and they never notice. The interviewer is watching for
one habit: **do you know how many rows you have, and what one row means, at every step?**

${DATASET}

## 1. "What do COUNT(*), COUNT(city) and COUNT(DISTINCT city) return on users?"

    SELECT COUNT(*), COUNT(city), COUNT(DISTINCT city) FROM users;
    → 6 | 5 | 3

**Model answer:** COUNT(*) counts rows (6). COUNT(city) counts non-NULL values (Ishita's NULL is
skipped, so 5). COUNT(DISTINCT city) counts distinct non-NULL values — Bengaluru, Hyderabad,
Chennai = 3.

**Follow-up:** "And SELECT city, COUNT(*) FROM users GROUP BY city?" — four groups, because GROUP BY
puts all NULLs into **one** group: (NULL, 1), (Bengaluru, 2), (Chennai, 1), (Hyderabad, 2). So
"number of cities" is 3 by COUNT(DISTINCT) but 4 by counting groups. Say which one the business
wants, and label the NULL group "Unknown" with COALESCE rather than letting it vanish from a chart.

**Trap:** saying COUNT(1) is faster than COUNT(*). On MySQL, PostgreSQL and SQL Server they are the
same plan; the real difference is COUNT(col), which changes the answer.

## 2. "Total refunded amount — there are no refunds yet. What does your query return?"

    SELECT SUM(amount), COUNT(*), AVG(amount) FROM orders WHERE status = 'REFUNDED';
    → NULL | 0 | NULL

**Model answer:** an aggregate with no GROUP BY always returns exactly **one** row. SUM, AVG, MIN and
MAX over zero rows are NULL; COUNT is 0. A dashboard tile showing "NULL" or blank looks broken, so
wrap it: \`COALESCE(SUM(amount), 0)\` → 0.

**Follow-up:** "With GROUP BY status?" — then there is no REFUNDED group at all: zero rows, not a row
with 0. To show REFUNDED as 0 you need a list of statuses (a lookup table or VALUES list) LEFT
JOINed to the aggregate.

## 3. "Each user's delivered revenue and number of support tickets, in one query."

The answer most candidates write:

    SELECT u.user_id, SUM(o.amount) AS revenue, COUNT(t.ticket_id) AS tickets
    FROM users u
    JOIN orders o       ON o.user_id = u.user_id AND o.status = 'DELIVERED'
    LEFT JOIN tickets t ON t.user_id = u.user_id
    GROUP BY u.user_id;

    user_id | revenue | tickets
    1       | 3140    | 8          ← should be 1570 and 2
    2       | 950     | 1
    4       | 820     | 0

Ananya has 4 delivered orders and 2 tickets. Both are children of users, so the join pairs every
order with every ticket: 4 × 2 = 8 rows, every amount counted twice, every ticket four times. This
is the **fan-out** (or "chasm") trap — two one-to-many joins from the same parent.

**The fix that wins:** aggregate each child to the parent's grain first, then join.

    WITH o AS (SELECT user_id, COUNT(*) AS n, SUM(amount) AS revenue
               FROM orders WHERE status = 'DELIVERED' GROUP BY user_id),
         t AS (SELECT user_id, COUNT(*) AS tickets FROM tickets GROUP BY user_id)
    SELECT u.user_id, COALESCE(o.revenue, 0) AS revenue, COALESCE(t.tickets, 0) AS tickets
    FROM users u
    LEFT JOIN o ON o.user_id = u.user_id
    LEFT JOIN t ON t.user_id = u.user_id;
    → user 1: revenue 1570, tickets 2 … user 6: 0, 0

**Follow-up — the false fix:** "Why not just SUM(DISTINCT o.amount)?" Because DISTINCT removes equal
**values**, not duplicated rows. Ananya has two genuine ₹300 orders, so SUM(DISTINCT o.amount) gives
₹1,270, not ₹1,570. COUNT(DISTINCT o.order_id) does fix the count — counting a key is safe, summing a
value is not.

## 4. "How many rows does this join return?"

    a.k: 1, 1, 1, 2, NULL        b.k: 1, 1, 2, 2, NULL
    SELECT COUNT(*) FROM a JOIN b ON a.k = b.k;        → 8
    SELECT COUNT(*) FROM a LEFT JOIN b ON a.k = b.k;   → 9
    SELECT COUNT(*) FROM a FULL JOIN b ON a.k = b.k;   → 10

**Model answer:** for each key, rows = (matches in a) × (matches in b): key 1 gives 3 × 2 = 6, key 2
gives 1 × 2 = 2, total 8. NULL never equals NULL, so the NULL rows match nothing. The LEFT JOIN adds
a's unmatched NULL row (9); the FULL JOIN also adds b's (10).

**Follow-up:** "How do you join on a column that may be NULL on both sides?" MySQL has the null-safe
operator \`a.k <=> b.k\`; PostgreSQL and SQL Server 2022 have \`a.k IS NOT DISTINCT FROM b.k\`. Then ask
whether NULL-to-NULL really is a match in the business sense — usually it is not.

## 5. "Users who have never had a delivered order."

    SELECT u.user_id FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM orders o
                      WHERE o.user_id = u.user_id AND o.status = 'DELIVERED');
    → 6

Equivalent: LEFT JOIN orders o ON o.user_id = u.user_id **AND o.status = 'DELIVERED'** WHERE
o.order_id IS NULL → 6.

**Trap:** \`LEFT JOIN orders o ON o.user_id = u.user_id WHERE o.status <> 'DELIVERED' OR o.order_id IS
NULL\` returns 2, 2, 3, 6. Vikram (2) appears twice because he has two cancelled orders — and he
**has** a delivered one. "Has some non-delivered order" is not "has no delivered order". The anti-join
must test the absence of the thing, not the presence of its opposite. (NOT IN breaks when the
subquery has a NULL — \`user_id NOT IN (SELECT referrer_id FROM users)\` returns 0 rows here because
referrer_id has NULLs; NOT EXISTS returns the 4 users nobody referred to.)

## 6. "Cancellation rate per user, in one pass."

    SELECT user_id, COUNT(*) AS orders,
           SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
           ROUND(100.0 * AVG(CASE WHEN status = 'CANCELLED' THEN 1.0 ELSE 0 END), 1) AS pct
    FROM orders GROUP BY user_id;
    → user 2: 3 orders, 2 cancelled, 66.7%; everyone else 0

**Trap:** \`COUNT(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)\` returns 12, not 2 — COUNT counts
every non-NULL value, and 0 is not NULL. Either SUM the 1/0, or COUNT with **no ELSE** (the missing
ELSE is NULL). PostgreSQL also has \`COUNT(*) FILTER (WHERE status = 'CANCELLED')\`.

## 7. "Find every order where our records and the bank's settlement file disagree."

    app_pay: (101, 450) (102, 300) (104, 620) (105, 300)
    bank:    (101, 450) (102, 300) (105, 330) (199, 500)

    SELECT COALESCE(a.order_id, b.order_id) AS order_id, a.amt AS app, b.amt AS bank
    FROM app_pay a FULL OUTER JOIN bank b ON a.order_id = b.order_id
    WHERE a.order_id IS NULL OR b.order_id IS NULL OR a.amt <> b.amt;
    → 104 | 620 | NULL      (we have it, bank does not)
      105 | 300 | 330       (amounts differ)
      199 | NULL | 500      (bank has it, we do not)

Reconciliation is a real analyst task in fintech and e-commerce, and it is the one place FULL OUTER
JOIN is the natural answer. **MySQL 8 has no FULL OUTER JOIN** — emulate it with a LEFT JOIN from app
to bank, UNION ALL the bank rows that have no app match (NOT EXISTS). PostgreSQL, SQL Server and
SQLite 3.39+ support it directly.

## How this part of the round is scored
Interviewers write down whether you **said the grain** ("one row per user"), whether you **checked the
row count** after a join, and whether you named the NULL case before they did. A correct query
explained in those terms beats a clever one explained in none.`,
    mcqs: [
      mcq("DailyCart has no orders with status 'REFUNDED'. What does SELECT SUM(amount), COUNT(*) FROM orders WHERE status = 'REFUNDED' return?",
        [["One row: NULL and 0", true],
          ["One row: 0 and 0", false],
          ["Zero rows, since nothing matched", false],
          ["One row: NULL and NULL", false]],
        "Without GROUP BY an aggregate query always returns one row. SUM over no rows is NULL, while COUNT is 0 — which is why dashboards wrap SUM in COALESCE(…, 0)."),
      mcq("Ananya's 4 delivered orders total ₹1,570, but after also joining her 2 support tickets, SUM(o.amount) shows ₹3,140. Which fix gives ₹1,570 reliably?",
        [["Aggregate orders and tickets in separate CTEs, then join each to users", true],
          ["Replace SUM(o.amount) with SUM(DISTINCT o.amount) in the same query", false],
          ["Divide SUM(o.amount) by COUNT(DISTINCT t.ticket_id) for each user", false],
          ["Add DISTINCT after SELECT so the duplicated rows collapse first", false]],
        "Two one-to-many joins pair every order with every ticket. Pre-aggregating each child to one row per user removes the fan-out. SUM(DISTINCT) drops her second genuine ₹300 order, and dividing breaks for users with no tickets."),
      mcq("Table a has join-key values 1, 1, 1, 2, NULL and table b has 1, 1, 2, 2, NULL. How many rows does a JOIN b ON a.k = b.k return?",
        [["8", true],
          ["9", false],
          ["10", false],
          ["5", false]],
        "Rows per key are the product of matches: key 1 gives 3 × 2 = 6 and key 2 gives 1 × 2 = 2. NULL = NULL is not true, so the NULL rows never match — 8 in total."),
    ],
    checkpoint: [
      ck(AGG, "To list users with no delivered order, a candidate writes users u LEFT JOIN orders o ON o.user_id = u.user_id WHERE o.status <> 'DELIVERED' OR o.order_id IS NULL. What is wrong?",
        [["It also returns users who have a delivered order plus some other order", true],
          ["It drops users who never ordered, because o.status is NULL for them", false],
          ["It is correct, but slower than NOT EXISTS on every database engine", false],
          ["It fails, since a LEFT JOIN cannot be combined with OR in the WHERE", false]],
        "The condition finds users with some non-delivered order, which is not the same as having no delivered order. Vikram has a delivered and two cancelled orders and is returned twice. NOT EXISTS on delivered orders is the correct anti-join."),
      ck(AGG, "DailyCart has 12 orders, 2 of them cancelled. What does COUNT(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) return, and why?",
        [["12, because COUNT counts the 0s too; only NULLs are skipped", true],
          ["2, because COUNT adds up the 1s produced by the CASE expression", false],
          ["10, because the ELSE 0 rows are the only ones being counted", false],
          ["An error, because COUNT cannot take a CASE expression argument", false]],
        "COUNT(expr) counts non-NULL values, and 0 is not NULL, so every row is counted. Use SUM of the 1/0 values, or COUNT with no ELSE so non-matching rows become NULL."),
      ck(AGG, "Finance wants every order where the app's payment records and the bank's settlement file disagree: missing on either side, or different amounts. On MySQL 8, which approach works?",
        [["A LEFT JOIN from app to bank, UNION ALL the bank rows with no app match", true],
          ["A FULL OUTER JOIN, which MySQL 8 supports with PostgreSQL's syntax", false],
          ["An INNER JOIN on order_id, filtered by WHERE a.amt <> b.amt alone", false],
          ["A CROSS JOIN of both files, keeping pairs whose amounts are unequal", false]],
        "MySQL 8 has no FULL OUTER JOIN, so it is emulated with a LEFT JOIN plus the anti-joined right side. An INNER JOIN would miss orders present in only one file, and a CROSS JOIN pairs unrelated orders."),
    ],
  },

  /* ── IV_WINDOWS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_IV_WINDOWS',
    notes: `Window functions are where analyst rounds separate candidates. Year 3 taught ranking, running
totals, LAG, cohorts and funnels; the interview asks the questions **around** them — why a function
returned that value, what the frame was, and what happened to rows a WHERE removed first.

Same DailyCart tables as the rest of this topic (users, orders with 12 rows, logins).

## 1. "Show each user's latest order amount on every one of their rows."

    SELECT order_id, amount,
           FIRST_VALUE(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS first_amt,
           LAST_VALUE(amount)  OVER (PARTITION BY user_id ORDER BY order_date) AS last_wrong,
           LAST_VALUE(amount)  OVER (PARTITION BY user_id ORDER BY order_date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_right
    FROM orders WHERE user_id = 1;

    order_id | amount | first_amt | last_wrong | last_right
    101      | 450    | 450       | 450        | 520
    102      | 300    | 450       | 300        | 520
    105      | 300    | 450       | 300        | 520
    110      | 520    | 450       | 520        | 520

**Model answer:** with ORDER BY and no frame, the frame is RANGE BETWEEN UNBOUNDED PRECEDING AND
CURRENT ROW, so the "last" row of the frame is the current row (plus its peers). FIRST_VALUE looks
correct by luck — the frame always starts at the top. Either widen the frame to UNBOUNDED FOLLOWING
or use FIRST_VALUE with ORDER BY order_date DESC.

**Follow-up:** "Same for MAX(amount) OVER (PARTITION BY user_id ORDER BY order_date)?" — it becomes a
running max, for the same reason. Drop the ORDER BY when you want the whole partition.

## 2. "Longest streak of consecutive login days per user" — gaps and islands

The trick: within a run of consecutive dates, date minus its row number is constant.

    WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
    g AS (
      SELECT user_id, login_date,
             julianday(login_date)
               - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
      FROM d)
    SELECT user_id, MIN(login_date) AS start_day, MAX(login_date) AS end_day, COUNT(*) AS days
    FROM g GROUP BY user_id, grp;

    user 1: 03-01 → 03-03 (3 days), 03-05 → 03-06 (2 days)
    user 2: 03-01 → 03-01 (1 day),  03-03 → 03-06 (4 days)

Longest streak: MAX(days) per user → user 1: 3, user 2: 4. The date arithmetic differs per engine:
MySQL \`DATE_SUB(login_date, INTERVAL rn DAY)\`, PostgreSQL \`login_date - rn::int\`, SQL Server
\`DATEADD(day, -rn, login_date)\`.

**The trap:** Vikram logged in twice on 6 March. Without the DISTINCT step the second row gets the next
row number, the difference shifts, and his streak splits into a wrong 2-day and 4-day pair. Always
deduplicate to one row per user per day first. (DENSE_RANK instead of ROW_NUMBER also works, if
you then count DISTINCT login_date; RANK does not — it skips a number after the tie and gives a
5-day streak.)

## 3. "Days since the user's previous order."

    julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY user_id ORDER BY order_date))

**Trap 1 — no PARTITION BY.** \`LAG(order_date) OVER (ORDER BY user_id, order_date)\` gives Vikram's
first order (103) Ananya's last order date (2024-03-09) instead of NULL, because the window runs
straight across users. Sorting by user_id is not partitioning by user_id.

**Trap 2 — WHERE runs first.** Window functions see only rows that survived WHERE.

    SELECT order_id, status, LAG(status) OVER (PARTITION BY user_id ORDER BY order_date)
    FROM orders WHERE status = 'CANCELLED';
    → 112's previous status shows CANCELLED

Vikram's real previous order before 112 was the delivered 106 — the WHERE removed it before LAG ran.
To ask "what came before each cancellation", compute LAG over all orders in a CTE, then filter:
112's previous status is then DELIVERED.

**Follow-up:** LAG(amount, 1, 0) — the third argument is the value used when there is **no** previous
row. It does not replace a previous row whose amount is NULL.

## 4. "Users whose most recent order was cancelled."

    WITH x AS (SELECT user_id, order_id, status,
                      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date DESC) AS rn
               FROM orders)
    SELECT user_id, order_id FROM x WHERE rn = 1 AND status = 'CANCELLED';
    → user 2, order 112

**Trap:** moving status = 'CANCELLED' into the CTE's WHERE answers a different question — "each
user's latest cancelled order" — and returns users whose latest order was delivered after an older
cancellation. On this data both give Vikram; on real data they diverge. Say which question you are
answering. You cannot write WHERE rn = 1 in the same SELECT: window functions are allowed only in
SELECT and ORDER BY, so you wrap in a CTE. Snowflake, BigQuery, Databricks and DuckDB add
\`QUALIFY rn = 1\`; MySQL, PostgreSQL and SQL Server do not have it.

## 5. "Split delivered orders into quartiles by amount" and "the median order"

    amounts: 275, 300, 300, 410, 410, 450, 520, 620, 950
    NTILE(4) OVER (ORDER BY amount) → buckets of 3, 2, 2, 2

NTILE spreads the remainder over the first buckets, and it splits ties (the two 410s could land in
different buckets on other data). For the median: PostgreSQL has \`PERCENTILE_CONT(0.5) WITHIN GROUP
(ORDER BY amount)\`; SQL Server has PERCENTILE_CONT only as a window function (with OVER); MySQL and
SQLite have none, so number the rows:

    WITH s AS (SELECT amount, ROW_NUMBER() OVER (ORDER BY amount) AS rn, COUNT(*) OVER () AS n
               FROM orders WHERE status = 'DELIVERED')
    SELECT AVG(amount) FROM s WHERE rn IN ((n + 1) / 2, (n + 2) / 2);   → 410

With n = 9 both expressions are 5 under integer division, so row 5 alone is the median; with an even
n they pick the middle two. (MySQL's / returns a decimal, so (n + 2) / 2 is 5.5 and simply matches
nothing — still row 5. Use DIV there to be explicit.)

PERCENT_RANK and CUME_DIST: for the 300s, PERCENT_RANK = (rank − 1)/(n − 1) = 1/8 = 0.125;
CUME_DIST = rows ≤ 300 / n = 3/9 = 0.333.

## 6. "What share of revenue comes from the top users?" — running share

    WITH r AS (SELECT user_id, SUM(amount) AS rev FROM orders
               WHERE status = 'DELIVERED' GROUP BY user_id)
    SELECT user_id, rev,
           ROUND(100.0 * SUM(rev) OVER (ORDER BY rev DESC ROWS UNBOUNDED PRECEDING)
                 / SUM(rev) OVER (), 1) AS cum_pct
    FROM r;
    → 1: 1570, 37.1 | 2: 950, 59.5 | 4: 820, 78.9 | 3: 620, 93.5 | 5: 275, 100.0

Three of five buyers make up 78.9% of revenue. Say ROWS, not the default RANGE — with two users on
equal revenue, RANGE would give both the same cumulative figure.

## How this part is scored
Name the partition, the order and the frame out loud before writing. Interviewers mark down "it
worked on my data" answers and mark up a candidate who says "ties would change this — I'd add
order_id as a tiebreaker".`,
    workedExample: `**Interviewer:** "We give a badge to users with a login streak of 4 or more days in March. Who gets it,
and what was the streak?"

**Step 1 — restate.** "One row per user per day, consecutive calendar days, longest run in March, keep
users whose longest run is at least 4. Multiple logins on one day count once."

**Step 2 — check the grain first.**

    SELECT user_id, login_date, COUNT(*) FROM logins
    GROUP BY user_id, login_date HAVING COUNT(*) > 1;
    → (2, 2024-03-06, 2)

"Vikram has a duplicate day, so I'll deduplicate before numbering."

**Step 3 — write it in steps.**

    WITH d AS (SELECT DISTINCT user_id, login_date FROM logins
               WHERE login_date >= '2024-03-01' AND login_date < '2024-04-01'),
    g AS (SELECT user_id, login_date,
                 julianday(login_date)
                   - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
          FROM d),
    runs AS (SELECT user_id, MIN(login_date) AS start_day, MAX(login_date) AS end_day,
                    COUNT(*) AS days
             FROM g GROUP BY user_id, grp)
    SELECT user_id, MAX(days) AS longest FROM runs
    GROUP BY user_id HAVING MAX(days) >= 4;
    → user 2, longest 4

**Step 4 — walk one user by hand.** Vikram's distinct days 1, 3, 4, 5, 6 March get row numbers 1–5;
day − rn is 29 Feb for the 1st and 1 Mar for the other four. Two islands, lengths 1 and 4.

**Step 5 — say what would break it.** "Without DISTINCT, his two 6 March rows get numbers 5 and 6,
and the run splits. If logins were timestamps I'd cast to date first, in the user's time zone — a
login at 1 a.m. IST is the previous day in UTC."

That shape — restate, check the grain, build in CTEs, trace one entity, name the breaking case — is
what a strong window answer sounds like.`,
    mcqs: [
      mcq("LAST_VALUE(amount) OVER (PARTITION BY user_id ORDER BY order_date) is meant to show each user's latest amount, but it returns each row's own amount. Why?",
        [["The default frame ends at the current row (and its peers)", true],
          ["LAST_VALUE needs DESC order to look at the latest order", false],
          ["PARTITION BY resets the function for every row in the table", false],
          ["LAST_VALUE ignores ORDER BY unless the column is indexed", false]],
        "With ORDER BY and no frame, the frame runs from the partition start to the current row, so its last row is the current one. Widen it to UNBOUNDED FOLLOWING, or use FIRST_VALUE with ORDER BY order_date DESC."),
      mcq("A login-streak query subtracts ROW_NUMBER from login_date to group consecutive days. One user logged in twice on 6 March and the streaks come out wrong. What is the fix?",
        [["Take DISTINCT user_id, login_date first, then number the rows", true],
          ["Use RANK instead of ROW_NUMBER, so equal dates share a number", false],
          ["Order by login_date DESC so duplicates fall at the end", false],
          ["Partition by login_date as well as by user_id", false]],
        "The duplicate day takes an extra row number, which shifts date − rn and splits the island. Deduplicating to one row per user per day fixes it. RANK gives the tie one number but then skips the next, which still miscounts."),
      mcq("SELECT order_id, LAG(status) OVER (PARTITION BY user_id ORDER BY order_date) FROM orders WHERE status = 'CANCELLED'. Vikram's orders are cancelled, delivered, cancelled. What does LAG show for his second cancelled order?",
        [["'CANCELLED', because WHERE removed his delivered order before LAG ran", true],
          ["'DELIVERED', because LAG reads the whole table before WHERE filters it", false],
          ["NULL, because LAG only sees rows from the same calendar month", false],
          ["An error, because a window function cannot follow a WHERE clause", false]],
        "Window functions are computed after WHERE, over the surviving rows only. To see the real previous order, compute LAG over all orders in a CTE and filter afterwards."),
    ],
    checkpoint: [
      ck(WIN, "Nine delivered order amounts, sorted, are 275, 300, 300, 410, 410, 450, 520, 620, 950. How many orders does NTILE(4) OVER (ORDER BY amount) put in bucket 1?",
        [["3", true],
          ["2", false],
          ["4", false],
          ["1", false]],
        "NTILE divides 9 rows into 4 buckets of 2 and gives the remainder of 1 to the first bucket, so the sizes are 3, 2, 2, 2."),
      ck(WIN, "Which of these databases lets an analyst filter on a window function directly with QUALIFY rn = 1, with no CTE or subquery?",
        [["Snowflake", true],
          ["MySQL 8", false],
          ["PostgreSQL 16", false],
          ["SQL Server 2022", false]],
        "QUALIFY exists in Snowflake, BigQuery, Databricks and DuckDB. MySQL, PostgreSQL and SQL Server allow window functions only in SELECT and ORDER BY, so the result is filtered in an outer query."),
      ck(WIN, "Per-user revenue sorted descending is 1570, 950, 820, 620, 275 (total 4235). Using a running SUM over ROWS UNBOUNDED PRECEDING divided by SUM(rev) OVER (), after how many users does the cumulative share first pass 75%?",
        [["3 users (78.9% cumulative)", true],
          ["2 users (59.5% cumulative)", false],
          ["4 users (93.5% cumulative)", false],
          ["1 user (37.1% cumulative)", false]],
        "The running totals are 1570, 2520, 3340, 3960 and 4235, giving 37.1%, 59.5%, 78.9%, 93.5% and 100%. The third user is the first to cross 75%."),
    ],
  },

  /* ── IV_CASE_QUERIES ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_IV_CASE_QUERIES',
    notes: `The middle of the round is a business question, not a SQL question: "how is month-on-month
growth?", "how many come back?", "who added to cart but never paid?". The interviewer is grading two
things at once — whether the query is right, and whether you **defined the metric** before writing it.
A query that answers an undefined question is graded as wrong even when it runs.

Same DailyCart tables (users, orders, events). Delivered orders are the revenue unless stated.

## 1. "Month-over-month growth in delivered revenue."

    WITH m AS (SELECT strftime('%Y-%m', order_date) AS mon, SUM(amount) AS rev
               FROM orders WHERE status = 'DELIVERED' GROUP BY mon)
    SELECT mon, rev, LAG(rev) OVER (ORDER BY mon) AS prev,
           ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY mon))
                 / NULLIF(LAG(rev) OVER (ORDER BY mon), 0), 1) AS mom_pct
    FROM m;

    2024-01 | 1370 | NULL | NULL
    2024-02 | 1660 | 1370 | 21.2
    2024-03 | 1205 | 1660 | -27.4

(Month bucketing per engine: MySQL DATE_FORMAT(order_date, '%Y-%m'), PostgreSQL date_trunc('month',
order_date), SQL Server DATETRUNC(month, …) in 2022 or DATEFROMPARTS(YEAR(d), MONTH(d), 1).)

**Follow-up 1 — the missing month.** If a month has no sales it has no row, and LAG silently compares
with the last month that **did** have sales. Build a calendar and LEFT JOIN to it:

    sales: Jan 300, Mar 450, Apr 300 (no February row)
    plain LAG:        Mar's prev = 300 (January!)
    with a calendar:  Feb 0 (−100%), Mar prev 0 → growth NULL, Apr −33.3%

(Calendar: a recursive CTE in SQLite/MySQL/PostgreSQL — PostgreSQL also has generate_series — or a
date dimension table, which every warehouse has.)

**Follow-up 2 — growth from zero.** March over a February of 0 is undefined, not "100%" and not
"infinite". NULLIF(prev, 0) makes it NULL; show it as "n/a" and report the absolute change.

**Trap:** \`(rev - prev) / prev\` with integer columns on PostgreSQL or SQL Server truncates to 0 —
multiply by 100.0 first.

## 2. "How long do users take to place a second order?"

    WITH r AS (SELECT user_id, order_date,
                      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date) AS rn
               FROM orders WHERE status = 'DELIVERED')
    SELECT user_id,
           MAX(CASE WHEN rn = 1 THEN order_date END) AS first_order,
           MAX(CASE WHEN rn = 2 THEN order_date END) AS second_order
    FROM r GROUP BY user_id;
    → Ananya: 01-05 → 01-20 (15 days); Joseph: 02-15 → 03-11 (25 days); 3 users have no second

**Follow-up:** "So the average is 20 days?" — only among the two who came back. Report it with the
denominator: "2 of 5 buyers placed a second order; for them the median gap was …". Averaging only
the survivors and calling it "time to second order" is the trap.

## 3. "Repeat-purchase rate."

    WITH c AS (SELECT user_id, COUNT(*) AS n FROM orders
               WHERE status = 'DELIVERED' GROUP BY user_id)
    SELECT COUNT(*) AS buyers, SUM(n >= 2) AS repeaters,
           ROUND(100.0 * SUM(n >= 2) / COUNT(*), 1) AS repeat_pct
    FROM c;
    → 5 buyers, 2 repeaters, 40.0%

**Say the definition:** repeaters over **buyers** (users with at least one delivered order) in the
period — not over all 6 sign-ups (33.3%), which mixes activation into retention. \`SUM(n >= 2)\` works in
MySQL and SQLite; PostgreSQL and SQL Server need \`SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END)\`.

## 4. "Users who did X but not Y" — one pass with HAVING

    SELECT user_id FROM events
    GROUP BY user_id
    HAVING SUM(event = 'add_to_cart') > 0 AND SUM(event = 'payment') = 0;
    → 2, 6

NOT EXISTS gives the same 2, 6. The HAVING form scales to "did A and B but not C" without extra
joins, and reads like the business rule.

**Trap:** \`WHERE event = 'add_to_cart' AND event <> 'payment'\` tests one row at a time — a single row
is never both, so it returns every carter. "Did not do Y" is a property of the **user**, so it must
be tested at user grain.

**Variant — "bought both":** \`WHERE product IN ('phone', 'case') GROUP BY user_id HAVING COUNT(DISTINCT
product) = 2\`. **Variant — "bought a phone and LATER a case":** HAVING cannot see order; self-join
with \`b.purchase_date > a.purchase_date\`. On a small example (user 1 phone then case, user 2 case then
phone, user 4 both on the same day) "both" returns 1, 2, 4 but "phone then later case" returns 1
only — ask whether same-day counts.

## 5. "Of each month's active buyers, how many were also active the month before?"

    WITH a AS (SELECT DISTINCT user_id, strftime('%Y-%m', order_date) AS mon
               FROM orders WHERE status = 'DELIVERED')
    SELECT cur.mon, COUNT(*) AS active, SUM(prev.user_id IS NOT NULL) AS returning_users
    FROM a cur
    LEFT JOIN a prev ON prev.user_id = cur.user_id
                    AND prev.mon = strftime('%Y-%m', date(cur.mon || '-01', '-1 month'))
    GROUP BY cur.mon;
    → Jan: 2 active, 0 returning | Feb: 3, 1 | Mar: 3, 2

The DISTINCT in the first step matters: Ananya has two January orders, and without it she would be
counted twice in January. (Avoid naming the column "returning" — it is a keyword in SQLite and
PostgreSQL.)

## 6. "Signup-to-first-order conversion within 30 days."

    SELECT COUNT(*) AS signups,
           SUM(EXISTS (SELECT 1 FROM orders o
                       WHERE o.user_id = u.user_id AND o.status = 'DELIVERED'
                         AND julianday(o.order_date) - julianday(u.signup_date) <= 30)) AS converted
    FROM users u;
    → 6 signups, 4 converted (66.7%)

Vikram converted after 35 days, Manoj never. **Follow-up:** "Manoj signed up on 5 March and the data
ends in March — is he a failure?" No: users who have not had 30 days yet must be **excluded** from
the denominator (a "mature cohort" filter), or the rate is biased down for recent sign-ups.

## How this part is scored
Before the first keyword: the metric, the grain, the time window, which statuses count, and the
denominator. Interviewers explicitly write down whether the candidate asked about cancelled orders
and incomplete periods.`,
    workedExample: `**Interviewer:** "Give me month-on-month growth in delivered revenue for January to April. Our
sales table is (sale_date, amount)."

**Step 1 — define.** "Growth = (this month − last month) / last month, delivered sales only, calendar
months. If a month had no sales I'll show it as 0, and growth from a 0 month as n/a."

**Step 2 — check whether every month exists.**

    SELECT strftime('%Y-%m', sale_date) AS mon, SUM(amount) FROM sales GROUP BY mon;
    → 2024-01 300 | 2024-03 450 | 2024-04 300

"February is missing, so a plain LAG would compare March with January. I'll generate the months."

**Step 3 — calendar, join, then LAG.**

    WITH RECURSIVE cal(mon) AS (
      SELECT '2024-01-01'
      UNION ALL SELECT date(mon, '+1 month') FROM cal WHERE mon < '2024-04-01'),
    m AS (SELECT strftime('%Y-%m-01', sale_date) AS mon, SUM(amount) AS rev
          FROM sales GROUP BY 1),
    f AS (SELECT cal.mon, COALESCE(m.rev, 0) AS rev
          FROM cal LEFT JOIN m ON m.mon = cal.mon)
    SELECT mon, rev, LAG(rev) OVER (ORDER BY mon) AS prev,
           ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY mon))
                 / NULLIF(LAG(rev) OVER (ORDER BY mon), 0), 1) AS mom_pct
    FROM f;

    2024-01-01 | 300 | NULL | NULL
    2024-02-01 | 0   | 300  | -100.0
    2024-03-01 | 450 | 0    | NULL      ← growth from zero is undefined
    2024-04-01 | 300 | 450  | -33.3

**Step 4 — explain it to the business.** "February had no sales at all — that is the story, not the
growth figures. March recovered to ₹450, and April fell 33% from March. I would check whether
February was a data gap (a broken pipeline) before anyone reads it as a real collapse."

**Step 5 — engine notes.** "On MySQL the calendar is the same recursive CTE with DATE_ADD; on
PostgreSQL I'd use generate_series; in a warehouse I'd join the date dimension."

The marks are in Steps 2 and 4: noticing the missing month, and saying what the numbers mean.`,
    mcqs: [
      mcq("Monthly revenue rows exist for January (300), March (450) and April (300); February had no sales and has no row. LAG(rev) OVER (ORDER BY mon) shows 300 as March's previous month. What should the query do?",
        [["Left join a month calendar so February appears as 0 first", true],
          ["Use LAG(rev, 2) for March, since one month is missing", false],
          ["Nothing, as comparing with the last month that had sales is right", false],
          ["Add PARTITION BY mon so each month is compared separately", false]],
        "LAG takes the previous row, not the previous calendar month. Generating every month and left joining the sales fills February with 0, so each month is compared with the one before it. A fixed LAG(rev, 2) breaks as soon as the gap moves."),
      mcq("After the calendar fix, February revenue is 0 and March is 450. What should the month-over-month growth figure for March show?",
        [["NULL (shown as n/a), by dividing by NULLIF(previous, 0)", true],
          ["100%, because revenue went from nothing to something", false],
          ["450%, because the change is 450 over a base of 1", false],
          ["0%, because division by zero returns zero in SQL", false]],
        "Growth from a zero base is undefined. NULLIF turns the zero denominator into NULL, so the result is NULL instead of a divide-by-zero error, and the report states the absolute change instead."),
      mcq("To find users who bought a phone and later a phone case, a candidate self-joins purchases a (phone) and b (case) on user_id. Which extra condition does the join need?",
        [["b.purchase_date > a.purchase_date on the case row", true],
          ["HAVING COUNT(DISTINCT product) = 2 after grouping", false],
          ["a.purchase_date = MIN(purchase_date) for that user", false],
          ["DISTINCT on product so a repeat buy is ignored", false]],
        "Order is the whole point, and only a row-to-row comparison of dates expresses 'later'. COUNT(DISTINCT product) = 2 finds users who bought both in any order, including the case first or on the same day."),
    ],
    checkpoint: [
      ck(AGG, "DailyCart has 6 signed-up users; 5 have a delivered order and 2 have two or more. An interviewer asks for the repeat-purchase rate. Which is the standard answer?",
        [["40%, as repeat buyers over users with at least one delivered order", true],
          ["33.3%, as repeat buyers over all six users who have signed up", false],
          ["66.7%, as repeat buyers divided by the three one-time buyers", false],
          ["2, the count of repeat buyers, since a rate needs a time window", false]],
        "Repeat rate measures whether buyers come back, so the denominator is buyers: 2 of 5 = 40%. Dividing by all sign-ups mixes in users who never activated, and repeaters over one-time buyers is a ratio, not a rate."),
      ck(AGG, "From events(user_id, event_date, event), which query returns users who added to cart but never paid?",
        [["GROUP BY user_id HAVING SUM(event = 'add_to_cart') > 0 AND SUM(event = 'payment') = 0", true],
          ["WHERE event = 'add_to_cart' AND event <> 'payment' GROUP BY user_id", false],
          ["WHERE event IN ('add_to_cart', 'payment') GROUP BY user_id HAVING COUNT(DISTINCT event) = 1", false],
          ["JOIN events p ON p.user_id = c.user_id AND p.event <> 'payment' GROUP BY c.user_id", false]],
        "'Never paid' is a property of the user, so it is tested after grouping by user. The WHERE version checks one row at a time and returns every carter; COUNT(DISTINCT event) = 1 also returns users who only paid. (PostgreSQL needs CASE inside SUM for the boolean.)"),
      ck(AGG, "Six users signed up; days from signup to first delivered order are 2, 35, 3, 13, 11, and one user never ordered. What is 30-day signup-to-first-order conversion?",
        [["66.7% (4 of 6)", true],
          ["80% (4 of 5)", false],
          ["83.3% (5 of 6)", false],
          ["100% (5 of 5)", false]],
        "Four users ordered within 30 days (2, 3, 13 and 11 days); the 35-day user converted too late and one never converted. Every sign-up is in the denominator: 4 / 6 = 66.7%."),
    ],
  },

  /* ── IV_QUERY_HYGIENE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_IV_QUERY_HYGIENE',
    notes: `"How do you know your number is right?" is asked in nearly every analyst loop, often by the
hiring manager rather than the SQL interviewer. A good answer is a list of concrete checks you
actually run — not "I'm careful". This unit is those checks, plus what an index does for an analyst's
query and how to talk about a slow one when you do not own the database.

Same DailyCart tables.

## 1. "What do you check after a join?"

**Model answer: the grain.** Before the join, say what one row is. After it, compare COUNT(*) with
COUNT(DISTINCT key) of the table whose grain you meant to keep.

    SELECT COUNT(*), COUNT(DISTINCT o.order_id)
    FROM orders o LEFT JOIN tickets t ON t.user_id = o.user_id;
    → 16 | 12

12 orders became 16 rows: the join changed the grain (Ananya's 4 orders × 2 tickets). Any SUM over
this result is wrong. **Follow-up:** "And for a source table?" — check the key is actually unique:

    SELECT user_id, login_date, COUNT(*) FROM logins
    GROUP BY user_id, login_date HAVING COUNT(*) > 1;
    → (2, 2024-03-06, 2)

**Trap:** fixing a doubled total with SELECT DISTINCT. It hides the symptom, and it also removes
legitimately identical rows. Find the join that multiplied, and aggregate before it.

## 2. "How do you check a total?"

Reconcile to a number you trust. Revenue by city should add back to total delivered revenue:

    SELECT SUM(rev) FROM (SELECT u.city, SUM(o.amount) AS rev
                          FROM orders o JOIN users u ON u.user_id = o.user_id
                          WHERE o.status = 'DELIVERED' GROUP BY u.city) x;
    → 4235 (matches the total)

Add \`AND u.city IS NOT NULL\` and it drops to 3960 — Ishita's ₹275 has disappeared from the report. A
breakdown that does not add up to its total means rows were lost (an inner join, a NULL filter) or
duplicated (a fan-out). Say this check out loud in the interview.

## 3. "How would you test this query?"

Build a tiny input where you know the answer, including the awkward cases, with a VALUES CTE:

    WITH t(user_id, d, status, amount) AS (VALUES
      (1, '2024-01-05', 'DELIVERED', 100),
      (1, '2024-01-05', 'DELIVERED', 100),   -- exact duplicate
      (2, '2024-01-06', 'CANCELLED',  50),   -- excluded status
      (3, '2024-01-07', 'DELIVERED', NULL))  -- missing amount
    SELECT COUNT(*), COUNT(amount), SUM(amount), COUNT(DISTINCT user_id)
    FROM t WHERE status = 'DELIVERED';
    → 3 | 2 | 200 | 2

Each output is predictable by hand, and each tells you something: the duplicate is counted twice,
the NULL amount is counted by COUNT(*) but not COUNT(amount). (SQL Server needs \`SELECT * FROM (VALUES
…) AS t(cols)\`; PostgreSQL and MySQL 8.0.19+ accept the CTE form — MySQL as VALUES ROW(…).)

## 4. "Write it so I can read it."

- One CTE per step, named for what it holds: \`delivered_orders\`, \`user_revenue\`, not \`t1\`, \`t2\`.
- State the grain in a comment at the top of each CTE: \`-- one row per user per month\`.
- Filter early; select only the columns you use (SELECT * on a wide fact table reads far more).
- Parenthesise mixed AND / OR. AND binds tighter:

      WHERE amount > 700 AND status = 'DELIVERED' OR status = 'RETURNED'   → 106, 108
      WHERE amount > 700 AND (status = 'DELIVERED' OR status = 'RETURNED') → 106

  The first also returns the ₹620 return, because it reads as (… AND …) OR status = 'RETURNED'.

## 5. Dates, time zones and text — the silent errors

**BETWEEN on a timestamp.** \`paid_at BETWEEN '2024-03-01' AND '2024-03-31'\` stops at 31 March
00:00:00; on a four-payment test set it returned 0 rows where the half-open
\`paid_at >= '2024-03-01' AND paid_at < '2024-04-01'\` returned 3. Use the half-open range, always.

**Time zones.** Most app databases store UTC; Indian finance reports in IST (UTC+5:30). A payment at
2024-03-31 19:00 UTC is 00:30 on 1 April in IST. "March by IST" in UTC terms is:

    paid_at >= '2024-02-29 18:30:00' AND paid_at < '2024-03-31 18:30:00'

On the test set that keeps 1 of the 3 "UTC March" payments — two moved to April. Ask which clock the
report uses; it changes month-end totals.

**Case and collation.** \`WHERE status = 'delivered'\` returned 0 rows on SQLite. On MySQL 8 the default
collation (utf8mb4_0900_ai_ci) is case-insensitive, so it would match all 9; SQL Server's usual
default collation is also case-insensitive; PostgreSQL compares exactly. Normalise with UPPER/TRIM in
cleaning, not in every query.

## 6. "This query is slow. What would you do?" — the index answer for analysts

An index is a sorted copy of one or more columns with pointers to the rows, so the database can
**seek** to the range it needs instead of scanning the table. What an analyst controls is whether the
query lets an index be used:

    -- index on orders(order_date)
    WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01'
      → SQLite plan: SEARCH orders USING INDEX ix_od (order_date>? AND order_date<?)
    WHERE strftime('%Y-%m', order_date) = '2024-03'
      → SQLite plan: SCAN orders

A function on the column (YEAR(), DATE(), DATE_FORMAT(), CAST) hides it from the index; a leading
wildcard (\`name LIKE '%an%'\`) also forces a scan. Then: read the plan (EXPLAIN in MySQL and
PostgreSQL, the execution plan in SQL Server), filter and aggregate before joining, and if the same
heavy query runs daily, ask the data engineers for a pre-aggregated table rather than adding indexes
to a production database yourself.

**Trap:** "add LIMIT 100 to make it faster". LIMIT on a GROUP BY query still aggregates every row
first; it only trims the output.

## How this is scored
Listing three real checks (grain, reconciliation, a hand-built test case) and one performance habit
(sargable filters, read the plan) is a strong answer. "I'd double-check it" is not.`,
    mcqs: [
      mcq("paid_at is a DATETIME. WHERE paid_at BETWEEN '2024-03-01' AND '2024-03-31' misses some March payments. Which ones?",
        [["Every payment on 31 March later than 00:00:00", true],
          ["Payments made on 1 March, since BETWEEN excludes its lower bound", false],
          ["Every payment whose paid_at value is NULL", false],
          ["Payments made in the last hour of each day", false]],
        "The end literal means 31 March at midnight, and BETWEEN is inclusive of both ends, so the rest of 31 March is excluded. The half-open form paid_at >= '2024-03-01' AND paid_at < '2024-04-01' includes the whole day."),
      mcq("DailyCart stores paid_at in UTC and finance reports in IST (UTC+5:30). A payment stored as 2024-03-31 19:00:00 belongs to which IST month?",
        [["April, since it is 00:30 on 1 April in IST", true],
          ["March, since the stored date is 31 March", false],
          ["March, since IST is behind UTC by 5:30", false],
          ["April, since IST is ahead of UTC by 19 hours", false]],
        "IST is 5 hours 30 minutes ahead of UTC, so 19:00 UTC on 31 March is 00:30 IST on 1 April. Month-end totals shift unless the filter is converted to the reporting time zone."),
      mcq("WHERE status = 'delivered' (lowercase) returns 9 rows on MySQL 8 but 0 rows on PostgreSQL for the same data, stored as 'DELIVERED'. Why?",
        [["MySQL's default collation is case-insensitive; PostgreSQL compares exactly", true],
          ["PostgreSQL stores all text in lowercase, so 'DELIVERED' no longer exists", false],
          ["MySQL converts every string literal to uppercase before comparing it", false],
          ["PostgreSQL needs double quotes, not single quotes, around string literals", false]],
        "MySQL 8's default utf8mb4_0900_ai_ci collation ignores case in comparisons; PostgreSQL's default comparison is exact. In PostgreSQL double quotes mark identifiers, not strings."),
    ],
    checkpoint: [
      ck(AGG, "After joining orders (12 rows) to tickets on user_id, COUNT(*) is 16 but COUNT(DISTINCT order_id) is 12. What does that tell you?",
        [["The join changed the grain: some orders now appear more than once", true],
          ["Four orders were lost in the join because those users had no ticket", false],
          ["The tickets table contains four duplicate ticket_id values", false],
          ["Nothing is wrong; COUNT(*) always exceeds a DISTINCT count", false]],
        "All 12 orders are still there, but 16 rows means some orders were repeated, one per matching ticket. Any SUM of order amounts over this result is inflated."),
      ck(AGG, "There is an index on orders(order_date). Which filter for March 2024 lets the database seek the index instead of scanning?",
        [["order_date >= '2024-03-01' AND order_date < '2024-04-01'", true],
          ["DATE_FORMAT(order_date, '%Y-%m') = '2024-03'", false],
          ["YEAR(order_date) = 2024 AND MONTH(order_date) = 3", false],
          ["CAST(order_date AS CHAR) LIKE '2024-03%'", false]],
        "A range on the bare column can be looked up in the sorted index. Wrapping the column in a function or a cast hides it from the index, so every row has to be computed and compared."),
      ck(AGG, "How does the database parse WHERE amount > 700 AND status = 'DELIVERED' OR status = 'RETURNED'?",
        [["(amount > 700 AND status = 'DELIVERED') OR status = 'RETURNED'", true],
          ["amount > 700 AND (status = 'DELIVERED' OR status = 'RETURNED')", false],
          ["It raises an error until parentheses are added around the OR", false],
          ["OR is applied first, because it appears last in the clause", false]],
        "AND binds tighter than OR, so every RETURNED order is included whatever its amount. On DailyCart that adds the ₹620 return (108) to the ₹950 order (106)."),
    ],
  },

  /* ── RAPID_FIRE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_RAPID_FIRE',
    notes: `A screening call or the first five minutes of the SQL round. One line each, then stop — the
interviewer asks for more if they want it.

1. **COUNT(*) vs COUNT(col)?** All rows / non-NULL values of col.
2. **SUM over zero rows?** NULL (COUNT gives 0). Wrap in COALESCE for a report.
3. **AVG with NULLs?** Ignores them — the denominator is the non-NULL count.
4. **Where do NULLs go in GROUP BY?** All into one group.
5. **Do NULL keys match in a join?** No — NULL = NULL is unknown. MySQL has <=>; PostgreSQL and SQL
   Server 2022 have IS NOT DISTINCT FROM.
6. **Rows from a join on a non-unique key?** For each key, matches on the left × matches on the right.
7. **Safest anti-join?** NOT EXISTS — NOT IN fails silently if the subquery has a NULL.
8. **Aggregate in WHERE?** Not allowed — that is what HAVING is for.
9. **Non-aggregate condition in HAVING?** Works on grouped columns, but belongs in WHERE (filters
   earlier).
10. **Conditional count?** SUM(CASE WHEN … THEN 1 ELSE 0 END), or COUNT(CASE WHEN … THEN 1 END);
    PostgreSQL: COUNT(*) FILTER (WHERE …).
11. **FULL OUTER JOIN in MySQL?** Not supported — LEFT JOIN UNION ALL the unmatched right rows.
12. **Where can a window function appear?** SELECT and ORDER BY only.
13. **How to filter on a window result?** Wrap it in a CTE or subquery; QUALIFY in Snowflake,
    BigQuery, Databricks, DuckDB.
14. **ROW_NUMBER / RANK / DENSE_RANK on 10, 10, 8?** 1, 2, 3 / 1, 1, 3 / 1, 1, 2.
15. **Default frame with ORDER BY?** RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (peers
    included).
16. **Default frame without ORDER BY?** The whole partition.
17. **Why does LAST_VALUE surprise people?** Its default frame ends at the current row.
18. **LAG(x, 1, 0) — the 0?** The value when there is no previous row, not a NULL replacement.
19. **NTILE(4) over 9 rows?** Buckets of 3, 2, 2, 2.
20. **Median in SQL?** PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x) in PostgreSQL (SQL Server: as a
    window function); MySQL — average the middle row(s) by ROW_NUMBER.
21. **Gaps-and-islands trick?** date − ROW_NUMBER is constant within a run (deduplicate days first).
22. **Running total per user?** SUM(x) OVER (PARTITION BY user ORDER BY date ROWS UNBOUNDED
    PRECEDING).
23. **Share of total in a grouped query?** SUM(x) / SUM(SUM(x)) OVER ().
24. **MoM growth?** (cur − LAG(cur)) / NULLIF(LAG(cur), 0) — after filling missing months.
25. **Repeat-rate denominator?** Buyers in the period, not all sign-ups.
26. **"Did X but not Y" in one pass?** GROUP BY user HAVING SUM(X) > 0 AND SUM(Y) = 0.
27. **"Bought both A and B"?** WHERE product IN (A, B) GROUP BY user HAVING COUNT(DISTINCT product) = 2.
28. **A date filter that can use an index?** A half-open range on the bare column.
29. **BETWEEN on timestamps?** Inclusive at both ends, and the end date means midnight — use >= and <.
30. **First check after any join?** COUNT(*) against COUNT(DISTINCT the key whose grain you meant to
    keep).`,
    mcqs: [
      mcq("Which function returns its first non-NULL argument and works the same on MySQL, PostgreSQL and SQL Server?",
        [["COALESCE(a, b)", true],
          ["IFNULL(a, b)", false],
          ["ISNULL(a, b)", false],
          ["NULLIF(a, b)", false]],
        "COALESCE is standard SQL and portable. IFNULL is MySQL/SQLite, ISNULL(a, b) is SQL Server (MySQL's ISNULL takes one argument), and NULLIF returns NULL when its two arguments are equal."),
      mcq("What does COUNT(DISTINCT city) do with the rows whose city is NULL?",
        [["Ignores them", true],
          ["Counts them as one value", false],
          ["Counts each NULL separately", false],
          ["Raises an error", false]],
        "COUNT(DISTINCT col) counts distinct non-NULL values, so NULL is not counted at all — unlike GROUP BY, which gives NULLs a group of their own."),
      mcq("In LAG(amount, 1, 0) OVER (PARTITION BY user_id ORDER BY order_date), what does the third argument do?",
        [["Value used when there is no previous row", true],
          ["Number of rows to skip backwards", false],
          ["Offset applied to the partition", false],
          ["Replaces NULL amounts in the window", false]],
        "The third argument is the default for rows where the offset falls outside the partition — the user's first order. A previous row whose amount is NULL still returns NULL."),
      mcq("What is PERCENT_RANK() for the lowest value in a partition?",
        [["0", true],
          ["1", false],
          ["1/n", false],
          ["NULL", false]],
        "PERCENT_RANK is (rank − 1) / (rows − 1), and the lowest value has rank 1, so it is always 0. CUME_DIST, by contrast, is never 0."),
      mcq("Apart from SELECT, in which other clause of a MySQL 8 query may a window function appear directly?",
        [["ORDER BY", true],
          ["WHERE", false],
          ["HAVING", false],
          ["GROUP BY", false]],
        "Window functions are computed after WHERE, GROUP BY and HAVING, so they may appear only in SELECT and ORDER BY. Filtering on one needs an outer query."),
    ],
  },

  /* ── MOCK ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_MOCK',
    notes: `## Interviewer's script — analyst SQL round (40 minutes)

**Setup (2 min).** "We're a quick-commerce app. Shared editor, any SQL dialect — tell me which. Think
aloud; I care about how you check your answer as much as the answer."

    users(user_id, city, signup_date)
    orders(order_id, user_id, created_at, status, discount)       -- created_at in UTC
    order_items(order_id, product_id, quantity, price)
    products(product_id, name, category)
    sessions(user_id, session_date)

**Q1 (5 min) — aggregation and fan-out.** "Last month's GMV and total discount by category."
- *Strong:* GMV = SUM(quantity × price) at item grain. Notices discount is **order-level**, so joining
  orders to items repeats each discount on every item row; allocates it (pro-rata by item value) or
  reports discount by order, not category — and says which. Uses a half-open created_at range.
- *OK:* correct GMV; fixes the discount when asked "does discount add up to the orders table?".
- *Weak:* SUM(o.discount) after the join; or SUM(DISTINCT o.discount).

**Q2 (5 min) — window.** "Top 3 products per city by units sold last month. If two tie for third, show
both."
- *Strong:* aggregate units per city and product, RANK() OVER (PARTITION BY city ORDER BY units DESC)
  in a CTE, filter rank <= 3. Explains RANK vs DENSE_RANK vs ROW_NUMBER for this tie rule.
- *Weak:* ORDER BY units DESC LIMIT 3 (top 3 overall, not per city); filters on the rank in WHERE of
  the same SELECT.

**Q3 (6 min) — retention.** "Week-1 retention for users who signed up in March: a session 7 to 13 days
after signup."
- *Strong:* states the window as [signup + 7, signup + 14) and the denominator as March sign-ups who
  have had 14 days; LEFT JOIN or EXISTS from users to sessions; COUNT(DISTINCT user_id) in the
  numerator. Mentions that users who signed up on 25 March are not yet mature at the start of April.
- *Weak:* counts sessions instead of users; uses calendar week numbers.

**Q4 (5 min) — X but not Y.** "Users who bought Dairy last month but never bought Fruits."
- *Strong:* GROUP BY user_id HAVING SUM(category = 'Dairy') > 0 AND SUM(category = 'Fruits') = 0 (or
  NOT EXISTS); asks whether "never" means ever or last month.
- *Weak:* WHERE category = 'Dairy' AND category <> 'Fruits'.

**Q5 (5 min) — debugging.** "This says average items per order is 1.4. The PM expected about 3."

    SELECT AVG(quantity) FROM order_items;

- *Strong:* it is the average **per line item** — sum quantity per order first, then average across
  orders: \`SELECT AVG(items) FROM (SELECT order_id, SUM(quantity) AS items FROM order_items GROUP BY
  order_id) x\`. Also asks whether cancelled orders should be excluded.
- *Weak:* rounds it differently; switches to the median without finding the grain error.

**Q6 (5 min) — performance.** "This runs for minutes on 50 million orders:
\`WHERE DATE(created_at) = CURRENT_DATE - 1\`."
- *Strong:* rewrite as a half-open range on created_at so an index can be used; adds that created_at
  is UTC, so "yesterday" for an Indian report starts at 18:30 UTC the day before; read the plan; ask
  for a daily aggregate table if this is a dashboard.
- *Weak:* "add LIMIT"; "add more indexes" with no reason.

**Q7 (5 min) — explaining.** "Your Q2 result shows Paneer is #1 in Pune but #9 in Delhi. Tell the city
head what that means."
- *Strong:* two sentences, a number, a caveat ("units, not revenue; last month only"), and a next
  step ("check whether Delhi has stock-outs on Paneer").

**Scoring.** Strong on Q1 (fan-out), Q3 (definition and denominator) and Q5 (grain), with no weak
answers, is a hire signal. Interviewers weight **checking** (row counts, totals, denominators) above
syntax; a candidate who catches their own fan-out unprompted scores higher than one who writes
faster.

## How to practise this
Do the round aloud against a timer, on a whiteboard or plain editor, without running anything. Then
write your queries against a small dataset you build yourself and check each claim you made.`,
    mcqs: [
      mcq("In mock Q1, orders carry an order-level discount and are joined to order_items to get each item's category. Why does SUM(o.discount) by category overstate discounts?",
        [["Each order's discount repeats on every item row of that order", true],
          ["SUM skips NULL discounts, so other orders are double counted", false],
          ["Category is a text column, so SUM groups it alphabetically", false],
          ["The join drops orders that have no items, which raises the total", false]],
        "The join changes the grain from order to item, so an order with four items contributes its discount four times. Allocate the discount to items, or report it at order grain."),
      mcq("AVG(quantity) FROM order_items gives 1.4 items per order, but the PM expected about 3. What went wrong?",
        [["It averages per line item; sum quantity per order first, then average", true],
          ["AVG ignores rows where quantity is 1, which pulls the mean down", false],
          ["AVG must be wrapped in ROUND, or it returns only the first decimal", false],
          ["It should use the median, since averages are distorted by big orders", false]],
        "Each row of order_items is one product line, not one order. Summing quantity per order and then averaging those totals answers 'items per order'."),
      mcq("Mock Q3 defines week-1 retention as a session 7 to 13 days after signup. Which session window matches that definition?",
        [["From signup_date + 7 days up to, not including, signup_date + 14 days", true],
          ["From signup_date up to, not including, signup_date + 7 days", false],
          ["DATEDIFF(session_date, signup_date) = 7, exactly one week later", false],
          ["Any session after signup_date, as long as it is within the same month", false]],
        "Days 7 through 13 inclusive is the half-open range [signup + 7, signup + 14). The first window is week 0, exactly-7 misses days 8 to 13, and a calendar-month rule ignores the signup date."),
      mcq("Mock Q6: a dashboard query on 50 million orders filters WHERE DATE(created_at) = CURRENT_DATE - 1 and takes minutes. What is the first change to suggest?",
        [["Rewrite it as a half-open range on created_at so an index can be used", true],
          ["Add LIMIT 1000 so the database stops scanning after 1,000 rows", false],
          ["Replace the WHERE with HAVING so filtering happens after grouping", false],
          ["Use SELECT DISTINCT so duplicate rows are removed before filtering", false]],
        "DATE() on the column hides it from an index, forcing a full scan. A range on the bare column can seek. LIMIT does not reduce the rows read for an aggregate, and HAVING filters later, not earlier."),
      mcq("Mock Q2 wants the top 3 products per city by units sold, and if two products tie for third, both must be shown. Which function fits?",
        [["RANK(), because tied products share a rank, so both thirds appear", true],
          ["ROW_NUMBER(), because each product gets a unique, gap-free position", false],
          ["NTILE(3), because it splits each city's products into three groups", false],
          ["COUNT(*) OVER, because it counts how many products each city sold", false]],
        "RANK gives tied products the same rank, so rank <= 3 returns both products tied at 3. ROW_NUMBER would drop one of them arbitrarily, and NTILE makes equal-size groups, not ranks."),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'DT_IV_SQL_DA_CHECKPOINT',
    notes: `Ten questions across the analyst SQL round: NULLs and grain in aggregation, time windows,
and window functions read row by row. Work each one on paper before choosing — the DailyCart tables
are the ones used throughout this topic.`,
    checkpoint: [
      ck(AGG, "DailyCart's users table has 6 rows: Bengaluru 2, Hyderabad 2, Chennai 1 and one user whose city is NULL. How many rows does SELECT city, COUNT(*) FROM users GROUP BY city return?",
        [["4, because the NULL cities form one group of their own", true],
          ["3, because GROUP BY drops rows whose city is NULL", false],
          ["6, because a nullable column is grouped one row per user", false],
          ["An error, because GROUP BY needs NOT NULL columns", false]],
        "GROUP BY treats all NULLs as one group, so the result has Bengaluru, Hyderabad, Chennai and a NULL row. COUNT(DISTINCT city), by contrast, would give 3."),
      ck(AGG, "SELECT user_id FROM orders GROUP BY user_id HAVING COUNT(*) >= 2 returns users 1, 2, 3 and 4, but only users 1 and 4 have two delivered orders. Which change fixes it?",
        [["Add WHERE status = 'DELIVERED' before the GROUP BY", true],
          ["Change HAVING COUNT(*) >= 2 to HAVING COUNT(status) >= 2", false],
          ["Change COUNT(*) to COUNT(DISTINCT user_id) in HAVING", false],
          ["Move COUNT(*) >= 2 from HAVING into the WHERE clause", false]],
        "The count includes cancelled and returned orders. Filtering rows to delivered orders before grouping makes COUNT(*) count only delivered ones. COUNT(status) still counts every non-NULL status."),
      ck(AGG, "Ananya's delivered orders are ₹450, ₹300, ₹300 and ₹520. After a fan-out join, a candidate 'fixes' her total with SUM(DISTINCT o.amount). What does it show?",
        [["₹1,270, because the second ₹300 order is dropped as a repeated value", true],
          ["₹1,570, because DISTINCT removes only the extra rows the ticket join made", false],
          ["₹3,140, because DISTINCT applies after SUM, so nothing changes at all", false],
          ["₹2,540, because DISTINCT keeps one copy of each ticket's set of rows", false]],
        "DISTINCT inside SUM works on values, not rows: 450 + 300 + 520 = 1,270. Two genuine orders of the same amount collapse into one, so it is not a fix for fan-out."),
      ck(AGG, "Delivered revenue is ₹1,370 in January, ₹1,660 in February and ₹1,205 in March. What is March's month-over-month change?",
        [["−27.4%", true],
          ["−12.0%", false],
          ["+37.8%", false],
          ["−37.8%", false]],
        "(1205 − 1660) / 1660 = −0.274. −12.0% compares March with January, and 37.8% divides by the wrong month (1660 / 1205 − 1)."),
      ck(AGG, "DailyCart's payments are stored in UTC. Which filter selects payments made in March 2024 by the IST clock (UTC+5:30)?",
        [["paid_at >= '2024-02-29 18:30:00' AND paid_at < '2024-03-31 18:30:00'", true],
          ["paid_at >= '2024-03-01 05:30:00' AND paid_at < '2024-04-01 05:30:00'", false],
          ["paid_at BETWEEN '2024-03-01' AND '2024-03-31'", false],
          ["paid_at >= '2024-03-01' AND paid_at < '2024-04-01'", false]],
        "IST midnight on 1 March is 18:30 UTC on 29 February (2024 is a leap year), and IST midnight on 1 April is 18:30 UTC on 31 March. Adding 5:30 instead of subtracting it shifts the window the wrong way."),
      ck(WIN, "One user's distinct login days in March are the 1st, 3rd, 4th, 5th and 6th. Using login_date − ROW_NUMBER() to find islands, how many groups appear and what is the longest streak?",
        [["2 groups; the longest streak is 4 days", true],
          ["5 groups; the longest streak is 1 day", false],
          ["1 group; the longest streak is 5 days", false],
          ["2 groups; the longest streak is 3 days", false]],
        "Row numbers 1 to 5 give date − rn of 29 Feb for the 1st and 1 Mar for the 3rd to 6th, so there are two islands, of 1 and 4 days."),
      ck(WIN, "LAG(order_date) OVER (ORDER BY user_id, order_date) is used for 'days since this user's previous order'. What goes wrong on each user's first order?",
        [["It returns the previous user's last order date instead of NULL", true],
          ["It returns NULL for every row except the very first in the table", false],
          ["It raises an error, as LAG needs PARTITION BY when ordering by two columns", false],
          ["It returns that user's own last order date, wrapping around", false]],
        "Without PARTITION BY user_id the window is one sequence across all users, so a user's first order looks back at the previous user's last order. Sorting by user is not partitioning by user."),
      ck(WIN, "Nine amounts are numbered with ROW_NUMBER() OVER (ORDER BY amount) and n = COUNT(*) OVER (). The median query averages rows WHERE rn IN ((n + 1) / 2, (n + 2) / 2) with integer division. Which rows are averaged?",
        [["Row 5 only, since both expressions give 5", true],
          ["Rows 4 and 5, averaged as the middle pair", false],
          ["Rows 5 and 6, since (n + 2) / 2 rounds up", false],
          ["Rows 4, 5 and 6, the middle third of nine", false]],
        "With n = 9, (9 + 1) / 2 = 5 and (9 + 2) / 2 = 11 / 2 = 5 under integer division, so the odd count picks the single middle row. With an even n the two expressions pick the middle pair."),
      ck(WIN, "To find users whose most recent order was cancelled, a candidate puts WHERE status = 'CANCELLED' inside the CTE and then keeps ROW_NUMBER() = 1 by order_date DESC. What does that return instead?",
        [["Each user's latest cancelled order, even if a later order was delivered", true],
          ["Nothing, because ROW_NUMBER cannot be computed after a WHERE filter", false],
          ["The same answer, because rn = 1 always marks each user's latest order", false],
          ["Every cancelled order, because the filter resets the row numbering", false]],
        "The WHERE removes delivered orders before numbering, so rn = 1 is the latest cancelled order, not the latest order. Number all orders first, then keep rn = 1 AND status = 'CANCELLED'."),
      ck(WIN, "For the amounts 275, 300, 300, 410, 410, 450, 520, 620, 950, what does CUME_DIST() OVER (ORDER BY amount) give each 300?",
        [["3/9 = 0.333, rows with amount ≤ 300 over all rows", true],
          ["2/9 = 0.222, the 300s' first row number over all rows", false],
          ["0.125, the rows ranked below it over n − 1 rows", false],
          ["1/9 = 0.111, the share of the single lowest value", false]],
        "CUME_DIST counts the rows with a value less than or equal to the current one (275, 300, 300) and divides by all 9. The 0.125 option is PERCENT_RANK, (2 − 1) / (9 − 1)."),
    ],
  },
];
