import { SeedBook } from '../types';

/**
 * Data Analytics + AI track interview questions.
 * SQL examples use one small schema (PostgreSQL / MySQL 8 compatible):
 *   customers(customer_id, name, city, signup_date)
 *   orders(order_id, customer_id, order_date, amount, region)
 */
const book: SeedBook = {
  slug: 'track-data-analytics',
  title: 'Data Analytics + AI Interview Questions',
  kind: 'topic',
  subject: 'Data Analytics + AI',
  description: 'The 40 questions analyst freshers face: Excel and Power BI, analyst SQL rounds, pandas and A/B testing, business metrics, AI for analysts and case interviews.',
  color: '#0369a1',
  emblem: '📊',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['DATA_ANALYTICS_AI'],
  order: 203,
  chapters: [
    {
      title: 'Excel and Power BI',
      questions: [
        {
          q: `What is the difference between VLOOKUP, INDEX-MATCH and XLOOKUP?`,
          a: `All three find a value in one column and return a related value from another.

- **VLOOKUP** searches only the **first column** of a range and returns a column by number: \`=VLOOKUP(A2, Products!A:D, 3, FALSE)\`. It cannot look left, and inserting a column breaks the column number. Always pass \`FALSE\` for an exact match.
- **INDEX-MATCH** combines two functions: \`=INDEX(Products!C:C, MATCH(A2, Products!A:A, 0))\`. It can look in any direction and does not break when columns move.
- **XLOOKUP** (Excel 365 / 2021) replaces both: \`=XLOOKUP(A2, Products!A:A, Products!C:C, "Not found")\`. Exact match is the default, it looks left or right, has a built-in "not found" value and can search from the bottom.

In interviews, say you prefer XLOOKUP where available and INDEX-MATCH for older Excel versions.`,
          d: 'easy',
          at: 'Service companies, analytics firms',
          tip: `Mention the exact-match argument; a missing FALSE in VLOOKUP is the most common lookup bug.`,
        },
        {
          q: `What is a pivot table? How would you show monthly sales by region?`,
          a: `A **pivot table** summarises a large table without formulas: you drag fields into **Rows**, **Columns**, **Values** and **Filters**, and Excel groups and aggregates for you.

For monthly sales by region:

1. Convert the data to a table (\`Ctrl + T\`) so new rows are included on refresh.
2. Insert > PivotTable.
3. Put **Region** in Rows, **Order Date** in Columns (right-click > Group > Months and Years), and **Amount** in Values as Sum.
4. Add a **Slicer** for product category if the user wants to filter.

Useful extras: "Show Values As > % of Row Total" for share, "Show Values As > % Difference From" for month-over-month change, and a Pivot Chart for a quick visual. Remember to **Refresh** after the source data changes.`,
          d: 'easy',
          tip: `Say "I convert the range to a Table first"; it shows you have used pivots on real, growing data.`,
        },
        {
          q: `What is the difference between relative, absolute and mixed cell references?`,
          a: `When you copy a formula, Excel shifts its references unless you lock them with \`$\`.

- **Relative** \`A2\`: both row and column shift. Copying \`=A2*B2\` down gives \`=A3*B3\`.
- **Absolute** \`$A$2\`: nothing shifts. Use it for a fixed cell such as a tax rate: \`=B2*$F$1\`.
- **Mixed** \`$A2\` or \`A$2\`: only one part is locked. \`$A2\` keeps column A but lets the row move; \`A$2\` keeps row 2 but lets the column move.

Mixed references are useful in a grid, for example a multiplication table \`=$A2*B$1\` copied across and down. Press **F4** while editing a reference to cycle through the four forms.`,
          d: 'easy',
          at: 'Service companies, KPO and analytics firms',
        },
        {
          q: `In Power BI, what is a star schema and why is it recommended for the data model?`,
          a: `A **star schema** has one central **fact table** of events or transactions (orders, with amount and quantity) surrounded by **dimension tables** that describe them (Date, Customer, Product, Store). Each dimension connects to the fact with a **one-to-many** relationship, usually with single-direction filtering from dimension to fact.

Why Power BI prefers it:

- **Simpler, correct DAX**: filters flow cleanly from dimensions to facts, so measures like \`Total Sales\` work across any slicer.
- **Performance**: the VertiPaq engine compresses narrow fact tables and small dimensions very well.
- **Usability**: report builders find fields in clearly named dimension tables.

Avoid one huge flat table (repeated text, slow) and avoid many-to-many or bidirectional relationships unless you really need them, because they create ambiguous filter paths. Always add a dedicated, marked **Date table**.`,
          d: 'medium',
          tip: `Draw it: fact in the middle, Date/Customer/Product around it, arrows pointing to the fact.`,
        },
        {
          q: `What is the difference between a calculated column and a measure in DAX?`,
          a: `- A **calculated column** is computed **row by row when data refreshes** and stored in the model. It uses **row context** and can be used in slicers, rows and filters. Example: \`Profit = Sales[Amount] - Sales[Cost]\`.
- A **measure** is computed **at query time** for whatever filters the visual applies. It is not stored, and it aggregates. Example:

\`\`\`dax
Total Sales = SUM ( Sales[Amount] )
Profit Margin % = DIVIDE ( [Total Profit], [Total Sales] )
\`\`\`

Rules of thumb:

- If you need to **slice or group by** the value (an age band, a category), use a calculated column (or better, create it in Power Query).
- If you need a **number that changes with filters** (totals, ratios, YTD), use a measure.

Ratios must be measures: a calculated column for margin, summed in a visual, gives a wrong total. Too many calculated columns also increase model size.`,
          d: 'medium',
          tip: `Use DIVIDE instead of "/" in measures; it handles divide-by-zero safely.`,
        },
        {
          q: `Explain row context, filter context and what CALCULATE does in DAX.`,
          a: `- **Filter context** is the set of filters active when a measure is evaluated: slicers, the row and column of a matrix, page filters. \`SUM(Sales[Amount])\` in the "South, 2025" cell only sees those rows.
- **Row context** means "the current row". It exists in calculated columns and inside iterators such as \`SUMX\`, \`FILTER\`. Row context does **not** filter other tables by itself.

**CALCULATE** evaluates an expression in a **modified filter context**. It can add, replace or remove filters, and it turns any row context into a filter (context transition).

\`\`\`dax
South Sales = CALCULATE ( [Total Sales], Region[Name] = "South" )

% of All Regions =
DIVIDE ( [Total Sales], CALCULATE ( [Total Sales], ALL ( Region ) ) )
\`\`\`

The second measure uses \`ALL\` to remove the region filter, so each region is divided by the grand total. Most "my measure shows the same number everywhere" bugs come from misunderstanding these two contexts.`,
          d: 'hard',
          tip: `The % of total example with ALL is the classic follow-up; practise writing it from memory.`,
        },
        {
          q: `What is Power Query and what cleaning steps do you usually apply in it?`,
          a: `**Power Query** is the data preparation layer in both Excel and Power BI. You connect to sources (Excel, CSV, SQL Server, SharePoint, web APIs) and build a list of **applied steps** in the M language. Every refresh replays the same steps, so cleaning is repeatable, unlike manual edits.

Common steps:

- Remove unwanted columns and blank or duplicate rows.
- Set correct **data types** (dates, decimals) early.
- **Trim** and **Clean** text, fix case, replace values ("Bengaluru" vs "Bangalore").
- **Split** columns (full name into first and last) and **Unpivot** month columns into rows.
- **Merge** queries (like a SQL join) and **Append** queries (stack monthly files).
- Add conditional or custom columns.

Doing transformations here keeps the data model small and DAX simple. Where possible, let filters "fold" back to the database (query folding) so a SQL source does the heavy work.`,
          d: 'medium',
          at: 'Analytics and consulting firms',
        },
        {
          q: `How do you calculate Year-to-Date sales and sales vs the same period last year in Power BI?`,
          a: `Time intelligence functions need a proper **Date table**: one row per day with no gaps, related to the fact table's date, and marked as a date table (Table tools > Mark as date table).

\`\`\`dax
Total Sales = SUM ( Sales[Amount] )

Sales YTD = TOTALYTD ( [Total Sales], 'Date'[Date] )

Sales LY = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )

YoY Growth % = DIVIDE ( [Total Sales] - [Sales LY], [Sales LY] )
\`\`\`

For an Indian financial year ending 31 March, pass the year-end date: \`TOTALYTD([Total Sales], 'Date'[Date], "31/3")\` (the string follows your locale's date format).

Put these measures in a matrix with Year and Month from the Date table, not from the fact table, or the functions will not work correctly.`,
          d: 'medium',
          tip: `Mentioning the April–March financial year shows you understand Indian business reporting.`,
        },
      ],
    },
    {
      title: 'SQL for Analysts',
      questions: [
        {
          q: `What is the difference between INNER JOIN and LEFT JOIN? Find customers who have never placed an order.`,
          a: `- **INNER JOIN** returns only rows that match in both tables.
- **LEFT JOIN** returns every row from the left table; where there is no match, the right-side columns are \`NULL\`.

Customers who never ordered are the left rows with no match:

\`\`\`sql
SELECT c.customer_id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
\`\`\`

An equivalent form uses \`NOT EXISTS\`:

\`\`\`sql
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
\`\`\`

A common mistake is filtering the right table in \`WHERE\` (for example \`WHERE o.region = 'South'\`) after a LEFT JOIN, which silently turns it into an inner join. Put such conditions in the \`ON\` clause instead.`,
          d: 'easy',
          at: 'Product companies, analytics firms',
        },
        {
          q: `What is the difference between WHERE and HAVING?`,
          a: `- **WHERE** filters **rows before grouping**. It cannot use aggregate functions.
- **HAVING** filters **groups after** \`GROUP BY\`, so it can use \`SUM\`, \`COUNT\` and so on.

Regions with more than 10 lakh revenue in 2025:

\`\`\`sql
SELECT region, SUM(amount) AS revenue
FROM orders
WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01'  -- row filter
GROUP BY region
HAVING SUM(amount) > 1000000;                                      -- group filter
\`\`\`

Logical order of a query: \`FROM\` > \`JOIN\` > \`WHERE\` > \`GROUP BY\` > \`HAVING\` > \`SELECT\` > \`ORDER BY\` > \`LIMIT\`. Filtering in WHERE whenever possible is also faster, because fewer rows reach the grouping step.`,
          d: 'easy',
          tip: `Use a date range instead of YEAR(order_date) = 2025 so an index on order_date can still be used.`,
        },
        {
          q: `What is the difference between COUNT(*), COUNT(column) and COUNT(DISTINCT column)?`,
          a: `- \`COUNT(*)\` counts **all rows**, including rows with NULLs.
- \`COUNT(column)\` counts rows where that column is **not NULL**.
- \`COUNT(DISTINCT column)\` counts **unique non-NULL** values.

\`\`\`sql
SELECT
  COUNT(*)                    AS total_orders,
  COUNT(region)               AS orders_with_region,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE order_date >= '2025-10-01' AND order_date < '2025-11-01';
\`\`\`

This matters in metrics: "orders" is \`COUNT(*)\`, but "buyers" is \`COUNT(DISTINCT customer_id)\`. Mixing them up is a classic analyst error that inflates user counts. Also note that \`AVG(column)\` ignores NULLs, so the average is taken over non-NULL rows only.`,
          d: 'easy',
        },
        {
          q: `Find the top 3 customers by revenue in each region. Explain ROW_NUMBER, RANK and DENSE_RANK.`,
          a: `Window functions rank rows **within a partition** without collapsing them.

\`\`\`sql
WITH customer_revenue AS (
  SELECT region, customer_id, SUM(amount) AS revenue
  FROM orders
  GROUP BY region, customer_id
),
ranked AS (
  SELECT *,
         DENSE_RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rnk
  FROM customer_revenue
)
SELECT region, customer_id, revenue
FROM ranked
WHERE rnk <= 3
ORDER BY region, rnk;
\`\`\`

For revenues 900, 800, 800, 700:

| Function | Result |
|---|---|
| ROW_NUMBER | 1, 2, 3, 4 (ties broken arbitrarily) |
| RANK | 1, 2, 2, 4 (gap after a tie) |
| DENSE_RANK | 1, 2, 2, 3 (no gap) |

You cannot filter a window function in \`WHERE\` of the same query, which is why the ranking goes in a CTE first. Ask the interviewer how ties should be handled; that decides the function.`,
          d: 'medium',
          at: 'Product companies, e-commerce, fintech',
          tip: `Ask "how should ties be handled?" before choosing the function; interviewers like that question.`,
        },
        {
          q: `Write a query for monthly revenue, a running total, and month-over-month growth %.`,
          a: `\`\`\`sql
WITH monthly AS (
  SELECT DATE_TRUNC('month', order_date) AS month,   -- PostgreSQL
         SUM(amount) AS revenue
  FROM orders
  GROUP BY 1
)
SELECT month,
       revenue,
       SUM(revenue) OVER (ORDER BY month)           AS running_total,
       LAG(revenue) OVER (ORDER BY month)           AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS mom_growth_pct
FROM monthly
ORDER BY month;
\`\`\`

- \`SUM() OVER (ORDER BY month)\` gives a cumulative total.
- \`LAG()\` reads the previous row's value; \`LEAD()\` reads the next.
- \`NULLIF(x, 0)\` avoids division by zero; the first month's growth is NULL.

In MySQL, replace \`DATE_TRUNC\` with \`DATE_FORMAT(order_date, '%Y-%m-01')\`. Watch out for months with no orders: they are missing rows, so LAG compares with the wrong month unless you join to a calendar table.`,
          d: 'medium',
          at: 'Product companies, analytics firms',
        },
        {
          q: `What is a CTE? When would you use one instead of a subquery?`,
          a: `A **Common Table Expression** is a named, temporary result defined with \`WITH\` and used in the query that follows.

\`\`\`sql
WITH first_orders AS (
  SELECT customer_id, MIN(order_date) AS first_order_date
  FROM orders
  GROUP BY customer_id
)
SELECT DATE_TRUNC('month', first_order_date) AS month,
       COUNT(*) AS new_customers
FROM first_orders
GROUP BY 1
ORDER BY 1;
\`\`\`

Why analysts use CTEs:

- **Readability**: a long analysis becomes named steps (clean > aggregate > rank) that read top to bottom.
- **Reuse**: one CTE can be referenced several times in the same query.
- **Recursion**: \`WITH RECURSIVE\` walks hierarchies such as manager chains or category trees.

Performance is usually similar to a subquery; modern engines inline CTEs. Use a temp table instead if a heavy intermediate result is reused across many separate queries.`,
          d: 'medium',
        },
        {
          q: `How do NULLs behave in SQL comparisons and aggregates, and how do you handle them?`,
          a: `\`NULL\` means "unknown", not zero or empty string.

- Any comparison with NULL gives unknown: \`region = NULL\` and \`region <> 'South'\` are **never true** for NULL rows. Use \`IS NULL\` / \`IS NOT NULL\`.
- Aggregates (\`SUM\`, \`AVG\`, \`COUNT(col)\`, \`MIN\`, \`MAX\`) **ignore NULLs**. \`AVG\` of (100, NULL, 200) is 150, not 100.
- \`NOT IN\` with a subquery that returns a NULL returns **no rows**. Prefer \`NOT EXISTS\`.

\`\`\`sql
SELECT COALESCE(region, 'Unknown') AS region,
       SUM(COALESCE(amount, 0))    AS revenue
FROM orders
GROUP BY COALESCE(region, 'Unknown');
\`\`\`

\`COALESCE\` returns the first non-NULL value. Decide deliberately: replacing a missing amount with 0 changes averages, so for metrics like "average order value" it is often better to exclude NULLs and report how many rows were missing.`,
          d: 'medium',
          tip: `The NOT IN plus NULL trap is a favourite trick question; explain why NOT EXISTS is safer.`,
        },
        {
          q: `Write a monthly cohort retention query: of customers who first ordered in a month, what % ordered again in each later month?`,
          a: `\`\`\`sql
WITH firsts AS (
  SELECT customer_id, DATE_TRUNC('month', MIN(order_date)) AS cohort_month
  FROM orders
  GROUP BY customer_id
),
activity AS (
  SELECT DISTINCT o.customer_id, f.cohort_month,
         DATE_TRUNC('month', o.order_date) AS active_month
  FROM orders o
  JOIN firsts f ON f.customer_id = o.customer_id
),
indexed AS (
  SELECT cohort_month, customer_id,
         (EXTRACT(YEAR FROM active_month) - EXTRACT(YEAR FROM cohort_month)) * 12
       + (EXTRACT(MONTH FROM active_month) - EXTRACT(MONTH FROM cohort_month)) AS month_number
  FROM activity
)
SELECT cohort_month, month_number,
       COUNT(DISTINCT customer_id) AS active_customers,
       ROUND(100.0 * COUNT(DISTINCT customer_id)
             / FIRST_VALUE(COUNT(DISTINCT customer_id))
               OVER (PARTITION BY cohort_month ORDER BY month_number), 1) AS retention_pct
FROM indexed
GROUP BY cohort_month, month_number
ORDER BY cohort_month, month_number;
\`\`\`

Month 0 is always 100%. Pivot the output (Excel or Power BI matrix) into the familiar triangle: cohorts as rows, month numbers as columns. Read it down a column to see whether newer cohorts retain better than older ones.`,
          d: 'hard',
          at: 'Product companies, fintech, e-commerce',
          tip: `Explain the steps (first month, activity, month index, divide by cohort size) before writing code.`,
        },
      ],
    },
    {
      title: 'Python, pandas and Statistics',
      questions: [
        {
          q: `What is the difference between mean, median and mode? When is the median a better summary?`,
          a: `- **Mean**: the sum divided by the count. Uses every value, so it is pulled by extreme values.
- **Median**: the middle value after sorting. Not affected by outliers.
- **Mode**: the most frequent value; the only one that works for categories (most common city).

Use the **median for skewed data**. If 9 employees earn ₹5 lakh and the founder earns ₹5 crore, the mean salary is about ₹54.5 lakh, which describes nobody, while the median is ₹5 lakh. Salaries, house prices, order values and session durations are usually right-skewed, so analysts report the median (or both).

When mean is much greater than median, the data is right-skewed; when mean is less than median, it is left-skewed.`,
          d: 'easy',
          at: 'Service companies, analytics firms',
        },
        {
          q: `How do you load a CSV in pandas, inspect it and handle missing values?`,
          a: `\`\`\`python
import pandas as pd

df = pd.read_csv("orders.csv", parse_dates=["order_date"])

df.head()            # first rows
df.info()            # columns, dtypes, non-null counts
df.describe()        # numeric summary
df.isna().sum()      # missing values per column
df.duplicated().sum()

df = df.drop_duplicates()
df["region"] = df["region"].fillna("Unknown")
df["amount"] = df["amount"].fillna(df["amount"].median())
df = df.dropna(subset=["customer_id"])   # rows unusable without a customer
\`\`\`

How to choose:

- **Drop** rows when the missing field is essential and only a few rows are affected.
- **Fill** with a constant ("Unknown"), the median (skewed numbers) or a group-wise value such as the median per category.
- **Keep and flag** when missingness itself means something (no coupon used).

Always report how many rows you dropped or filled, so stakeholders trust the numbers.`,
          d: 'easy',
        },
        {
          q: `How do groupby and merge work in pandas? Show revenue per region with region names from another table.`,
          a: `\`groupby\` is pandas' GROUP BY; \`merge\` is its JOIN.

\`\`\`python
import pandas as pd

orders = pd.DataFrame({
    "region_id": [1, 1, 2, 3],
    "amount": [500, 300, 700, 200],
})
regions = pd.DataFrame({"region_id": [1, 2, 3], "name": ["South", "North", "West"]})

summary = (
    orders.merge(regions, on="region_id", how="left")
          .groupby("name", as_index=False)
          .agg(revenue=("amount", "sum"), orders=("amount", "count"))
          .sort_values("revenue", ascending=False)
)
print(summary)
\`\`\`

\`how\` can be \`"inner"\`, \`"left"\`, \`"right"\` or \`"outer"\`, just like SQL. After a merge, check the row count: if it grew unexpectedly, the right table had duplicate keys. Passing \`validate="many_to_one"\` makes pandas raise an error in that case.`,
          d: 'easy',
          tip: `Mention validate= or checking len(df) after a merge; silent row explosions are a real-world bug.`,
        },
        {
          q: `What is standard deviation? How do you detect outliers?`,
          a: `**Standard deviation** measures how spread out values are around the mean. Small SD means values are close to the mean; large SD means they vary widely. For roughly **normal** data, about 68% of values lie within 1 SD of the mean, 95% within 2 SD and 99.7% within 3 SD.

Two common outlier rules:

- **Z-score**: flag values more than 3 SD from the mean. Works for roughly normal data.
- **IQR rule**: Q1 and Q3 are the 25th and 75th percentiles, IQR = Q3 - Q1. Flag values below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR. Robust for skewed data; this is what a box plot shows.

\`\`\`python
q1, q3 = df["amount"].quantile([0.25, 0.75])
iqr = q3 - q1
outliers = df[(df["amount"] < q1 - 1.5 * iqr) | (df["amount"] > q3 + 1.5 * iqr)]
\`\`\`

Do not delete outliers automatically. A ₹2 lakh order may be a bulk B2B purchase (real) or a typo (fix it). Investigate first.`,
          d: 'medium',
        },
        {
          q: `Explain hypothesis testing and the p-value in simple words.`,
          a: `Hypothesis testing checks whether a difference in data is likely real or just random noise.

1. **Null hypothesis (H0)**: there is no difference (the new checkout page has the same conversion as the old one).
2. **Alternative (H1)**: there is a difference.
3. Choose a **significance level**, usually alpha = 0.05.
4. Run the right test (t-test for means, chi-square or z-test for proportions) and get a **p-value**.

The **p-value** is the probability of seeing a result at least this extreme **if H0 were true**. A p-value of 0.02 means: if the pages truly performed the same, a gap this large would appear only 2% of the time by chance. Since 0.02 < 0.05, we reject H0.

What it is **not**: it is not the probability that H0 is true, and it says nothing about the size of the effect. Always report the effect size and a confidence interval too, for example "+1.2 percentage points (95% CI 0.3 to 2.1)".`,
          d: 'medium',
          at: 'Product companies, fintech',
          tip: `Saying what a p-value is NOT is the fastest way to sound confident in a stats round.`,
        },
        {
          q: `What is the difference between correlation and causation? Give an example.`,
          a: `**Correlation** means two variables move together. **Causation** means changing one actually changes the other.

Example: cities with more ice-cream sales have more drowning cases. Ice cream does not cause drowning; **hot weather** (a confounder) drives both.

A business example: customers who use the mobile app spend 40% more than web-only customers. That does not prove the app makes people spend more. Loyal, high-spending customers are more likely to install the app in the first place (**selection bias**).

How to get closer to causation:

- Run a **randomised A/B test**, the gold standard.
- If you cannot, use quasi-experiments: before/after with a control group (difference-in-differences), or compare similar matched groups.
- Check for confounders and reverse causation before recommending action.

The Pearson correlation coefficient ranges from -1 to +1 and only measures **linear** relationships; a value near 0 does not rule out a curved relationship.`,
          d: 'medium',
        },
        {
          q: `How would you design an A/B test for a new "Buy Now" button?`,
          a: `1. **Hypothesis**: the new button increases checkout conversion.
2. **Primary metric**: conversion rate (orders / visitors to the product page). Add **guardrail metrics** such as average order value, refunds and page load time.
3. **Unit and randomisation**: randomise by **user** (not by session) so one person always sees the same version; split 50/50.
4. **Sample size**: decide the minimum detectable effect first. With a 4% baseline, detecting a lift to 4.4% at 5% significance and 80% power needs on the order of 40,000 users per group. Use a power calculator.
5. **Duration**: run at least one or two full weeks to cover weekday/weekend behaviour, and fix the end date in advance.
6. **Sanity checks**: confirm the split really is 50/50 (sample ratio mismatch) and that both groups look similar.
7. **Analyse**: two-proportion z-test or chi-square, report lift with a confidence interval, check guardrails, then decide.

Do not stop the test early just because it looks significant on day 3.`,
          d: 'medium',
          at: 'Product companies, e-commerce, fintech',
          tip: `Always name a guardrail metric; it shows you think beyond the one number being tested.`,
        },
        {
          q: `What are common pitfalls in A/B testing, such as peeking, multiple testing and Simpson's paradox?`,
          a: `- **Peeking**: checking the p-value daily and stopping when it dips below 0.05 greatly inflates false positives. Fix the sample size in advance or use a sequential testing method designed for repeated looks.
- **Multiple testing**: testing 20 metrics or 20 segments at alpha 0.05 will produce about one "significant" result by pure chance. Pre-register one primary metric and apply a correction (Bonferroni, or control the false discovery rate) for the rest.
- **Simpson's paradox**: a trend in every segment reverses when segments are combined, because the groups have different mixes. Example: variant B converts better on both mobile and desktop, but worse overall, because B received far more mobile traffic, which converts lower. Check that randomisation is balanced and look at segment results.
- **Novelty effect**: users click a new design because it is new; the lift fades in later weeks.
- **Sample ratio mismatch**: a 50/50 test that ends 52/48 signals a bug in assignment or logging, and the result should not be trusted.
- **Network effects**: in marketplaces, treated users can affect control users.`,
          d: 'hard',
          at: 'Product companies',
        },
      ],
    },
    {
      title: 'Business Metrics, Storytelling and AI for Analysts',
      questions: [
        {
          q: `What is a KPI? How is it different from a metric? Give KPIs for an e-commerce business.`,
          a: `A **metric** is any measured number (page views, number of SKUs). A **KPI (Key Performance Indicator)** is one of the few metrics tied directly to a business goal that leaders track and act on. All KPIs are metrics; most metrics are not KPIs.

Good KPIs are specific, measurable, have a target and an owner, and are reviewed regularly.

E-commerce KPIs:

- **GMV / revenue** and **number of orders**
- **Conversion rate** = orders / sessions
- **Average Order Value (AOV)** = revenue / orders
- **Customer Acquisition Cost (CAC)**
- **Repeat purchase rate** or retention
- **Return / cancellation rate**
- **Delivery on time %** for operations

A useful habit: pair a growth KPI with a quality KPI, for example orders with cancellation rate, so a team cannot improve one by damaging the other.`,
          d: 'easy',
          at: 'E-commerce, consulting, analytics firms',
        },
        {
          q: `Define DAU, MAU, stickiness, churn rate and conversion rate.`,
          a: `- **DAU / MAU**: unique users active in a day / in the last 30 days. Define "active" clearly (opened the app vs placed an order).
- **Stickiness** = DAU / MAU. A ratio of 0.5 means the average monthly user is active about 15 days a month. Messaging apps score high; travel apps score low, and that is fine.
- **Churn rate** = customers lost in a period / customers at the start of the period. Monthly churn of 5% means losing about 46% of customers in a year if not replaced (1 - 0.95^12).
- **Retention rate** = 1 - churn, or the % of a cohort still active after N days.
- **Conversion rate** = users who completed the goal / users who could have. Always state the denominator: visitors, sign-ups, or cart users give very different numbers.

The most common interview trap is an undefined denominator or an undefined "active". Clarify both before calculating.`,
          d: 'easy',
        },
        {
          q: `What is funnel analysis? How would you analyse an app's sign-up funnel?`,
          a: `A **funnel** tracks users through ordered steps toward a goal and shows where they drop off.

Sign-up funnel example:

| Step | Users | Step conversion |
|---|---|---|
| App opened | 10,000 | |
| Sign-up started | 6,000 | 60% |
| OTP verified | 4,200 | 70% |
| Profile completed | 3,800 | 90% |
| First order | 1,500 | 39% |

How to analyse:

1. Compute **step-to-step** and **overall** conversion (here 15%).
2. Find the biggest drop: OTP verification (30% lost) and first order.
3. **Segment** the weak step by device, OS version, city, traffic source. If OTP failure is concentrated on one telecom operator or Android version, it is likely a technical problem.
4. Look at time between steps.
5. Propose fixes (auto-read OTP, WhatsApp OTP, first-order coupon) and validate with an A/B test.

Count each user once per step and require steps in order, or the funnel will be inflated.`,
          d: 'easy',
          tip: `Always segment the worst step; "where" and "for whom" matter more than the overall number.`,
        },
        {
          q: `What are CAC and LTV? Why does the LTV to CAC ratio matter?`,
          a: `- **CAC (Customer Acquisition Cost)** = total sales and marketing spend in a period / new customers acquired. ₹10 lakh spent, 2,000 new customers: CAC = ₹500.
- **LTV (Lifetime Value)** is the gross profit a customer brings over their whole relationship. A simple version: average monthly gross profit per customer / monthly churn rate. ₹100 margin per month and 5% churn gives LTV of about ₹2,000.

**LTV : CAC** shows whether growth is profitable. Here it is 2,000 / 500 = 4. A common rule of thumb is that around 3 or more is healthy; below 1 means the company loses money on every customer it buys. Also look at the **payback period**: CAC / monthly margin = 5 months here.

Caveats to mention: use **gross margin**, not revenue; compute CAC **per channel**, because blended CAC hides expensive channels; and LTV for a young company is an estimate, so calculate it from cohort data rather than assuming churn stays constant.`,
          d: 'medium',
          at: 'Startups, fintech, consulting',
        },
        {
          q: `How do you design a dashboard and tell a story with data for a business manager?`,
          a: `Start from the **decision**, not the data. Ask: who uses it, how often, and what will they do differently after looking at it?

Design principles:

- **Top row: 3 to 5 KPI cards** with comparison (vs target, vs last month) so the status is clear in 5 seconds.
- **Then the "why"**: trends over time (line chart), breakdowns (sorted bar charts), and drill-downs or filters by region and product.
- **Right chart for the job**: line for trends, bar for comparisons, avoid pie charts with many slices and 3D charts.
- **Clean**: consistent colours, red/green only for good/bad, clear titles that state the insight ("South revenue down 12% due to fewer orders"), units and date range shown.

For a storytelling presentation, use **context, insight, recommendation**:

1. What happened (revenue fell 8% in October).
2. Why (fewer repeat orders in Tier-2 cities after a delivery fee increase).
3. What to do and the expected impact.

Lead with the conclusion; managers have little time.`,
          d: 'medium',
          tip: `Write chart titles as findings, not labels. It is the single biggest upgrade to any dashboard.`,
        },
        {
          q: `How can a data analyst use AI tools such as ChatGPT, Copilot in Excel or Power BI Copilot responsibly?`,
          a: `Useful applications:

- **Drafting code**: SQL queries, pandas transformations, DAX measures and Excel formulas from a plain-English description.
- **Explaining** unfamiliar code or error messages.
- **Text work**: summarising survey comments, categorising feedback, drafting the narrative for a report.
- **Ideation**: suggesting hypotheses to investigate or chart types to try.

Responsible use:

- **Verify everything**. LLMs can produce plausible but wrong SQL (wrong join, wrong date filter) and invent column names. Run the query, check row counts and reconcile totals with a known number.
- **Protect data**. Do not paste customer personal data, financials or confidential data into public tools. Use the company-approved enterprise tool and share only schemas or sample/masked rows.
- **Understand before you ship**. You must be able to explain every formula in your dashboard.
- **Disclose** where AI helped, according to company policy.

The analyst remains responsible for the numbers; AI speeds up the work but does not own the result.`,
          d: 'medium',
          at: 'Product companies, consulting firms',
        },
        {
          q: `You ask an LLM to write SQL for "monthly active customers". How do you check that the generated query is correct?`,
          a: `Treat AI-generated SQL like code from a new teammate: review and test it.

1. **Give context in the prompt**: the actual table and column names, the SQL dialect, and the exact definition ("active = at least one completed order in the calendar month; exclude cancelled orders").
2. **Read the logic**: correct table, join type, date filter, \`COUNT(DISTINCT customer_id)\` instead of \`COUNT(*)\`, status filter applied, time zone handled.
3. **Test on known numbers**: compare one month with an existing trusted report or a manual count on a small sample.
4. **Edge cases**: customers with orders on the last day of the month, NULL customer IDs, test accounts, refunds.
5. **Sanity checks**: is the trend plausible? Did one month jump 10x? Is the result less than the total customer count?
6. **Performance**: check the query plan on large tables.

Common LLM mistakes are hallucinated columns, missing status filters, wrong date boundaries (\`<= '2025-10-31'\` on a timestamp drops the last day) and counting orders instead of customers.`,
          d: 'medium',
          tip: `The timestamp '<= last day' bug is a great concrete example to mention.`,
        },
        {
          q: `You have 50,000 customer reviews. How would you use an LLM to categorise them by theme and sentiment, and how would you check quality?`,
          a: `**Approach**

1. **Define the label set first** with the business: themes such as Delivery, Product quality, Price, App issues, Customer support, Other; sentiment Positive / Neutral / Negative.
2. **Prompt** the model with the labels, short definitions and a few examples, and ask for structured JSON output (\`{"theme": ..., "sentiment": ...}\`) so results can be parsed.
3. **Run in batches** through the company-approved API, with retries, and store the raw output. Mask names, phone numbers and order IDs before sending.
4. Load the labels into SQL or Power BI and report theme volume and negative share over time.

**Quality checks**

- Hand-label a random sample of 200 to 300 reviews and measure **accuracy per theme** against the model; review the confusion between similar themes.
- Track the share of invalid outputs and of "Other"; a large "Other" means the label set is missing a theme.
- Re-check a sample regularly, because new issues (a new app bug) appear over time.

Compare cost and speed with a simpler baseline (keyword rules or a small classifier). If the LLM is only slightly better, the cheaper method may be enough.`,
          d: 'hard',
          at: 'Product companies, e-commerce',
        },
      ],
    },
    {
      title: 'Scenarios and project questions',
      questions: [
        {
          q: `Walk me through your capstone or portfolio analytics project.`,
          a: `Use a clear structure and keep it to about two minutes:

1. **Business problem**: "A retail chain wanted to know why repeat purchases were falling."
2. **Data**: sources, size and period. "Two years of orders, about 3 lakh rows, plus customer and product tables."
3. **Cleaning**: what was wrong and how you fixed it. "Removed 2% duplicate orders, standardised city names, excluded test accounts."
4. **Analysis**: tools and methods. "SQL for cohort retention, pandas for RFM segmentation, Power BI dashboard with drill-down."
5. **Insight**: one or two specific findings with numbers. "Customers whose first order was delayed by more than 3 days had 35% lower 90-day retention."
6. **Recommendation and impact**: what you would do and how you would measure it.
7. **What you would improve**: a limitation you are aware of.

Be ready for follow-ups: "why that metric?", "how did you validate the numbers?", "show me the SQL". Only claim what you actually did.`,
          d: 'easy',
          at: 'All companies',
          tip: `End with one number-backed insight; it is what the interviewer will remember.`,
        },
        {
          q: `What data quality checks do you do before starting an analysis?`,
          a: `A short, repeatable checklist:

- **Completeness**: row counts by day or month (missing days?), NULL counts per column.
- **Uniqueness**: duplicates on the primary key (order_id appearing twice).
- **Validity**: values in expected ranges (no negative quantities, dates not in the future, valid status values).
- **Consistency**: totals match the source system or a finance report; the same customer has the same city across tables; categories spelled the same way.
- **Timeliness**: is the latest date the one you expect? A pipeline that stopped two days ago will make "today" look like a drop.
- **Joins**: row counts before and after each join, to catch duplicates or lost rows.

\`\`\`sql
SELECT order_id, COUNT(*) FROM orders GROUP BY order_id HAVING COUNT(*) > 1;
SELECT MIN(order_date), MAX(order_date), COUNT(*) FROM orders;
\`\`\`

Write down every assumption and exclusion. If stakeholders see your number differ from another report, that note explains why in seconds.`,
          d: 'easy',
        },
        {
          q: `Your revenue number does not match the finance team's report. How do you reconcile it?`,
          a: `Assume a definition difference before assuming a bug, and work through it systematically:

1. **Compare definitions**: gross or net of discounts, taxes (GST included or not), returns and cancellations, shipping fees.
2. **Compare time logic**: order date vs invoice date vs delivery date; time zone (UTC timestamps vs IST); financial calendar.
3. **Compare scope**: which countries, channels, B2B orders, test or employee orders.
4. **Compare sources**: finance often uses the ERP; you may be using an app database or warehouse copy that lags or misses late updates.
5. **Narrow down**: break both numbers by month, then by region or channel, until you find the slice where they differ. Then compare at order level for that slice.
6. **Document and align**: agree on one definition with finance, write it down, and add a note to the dashboard.

A typical answer: "the gap was 4%; it came from cancelled orders that finance excludes and from orders placed after 6:30 PM IST on the last day of the month, which fall into the next month in UTC."`,
          d: 'medium',
          at: 'Consulting, analytics firms, product companies',
        },
        {
          q: `A Power BI report takes 30 seconds to load. How do you make it faster?`,
          a: `Diagnose before changing things: use **Performance Analyzer** in Power BI Desktop to see which visual is slow and whether time goes to the DAX query or rendering. DAX Studio gives more detail.

Common fixes:

- **Model**: move to a star schema, remove unused columns (especially high-cardinality ones such as GUIDs and timestamps with seconds), split date-time into date and time, use integer keys.
- **Reduce data**: import only needed history, aggregate to daily level if no one needs individual transactions, use incremental refresh for large tables.
- **DAX**: replace heavy \`FILTER(ALL(...))\` patterns with simple column filters in CALCULATE, use variables (\`VAR\`) to avoid repeated calculations, avoid row-by-row iterators over huge tables when a plain SUM works.
- **Calculated columns**: push them to Power Query or the source database.
- **Report**: fewer visuals per page (each visual sends a query), avoid huge tables with thousands of rows, limit bidirectional relationships.
- **Storage mode**: for DirectQuery, make sure the source has proper indexes, or switch to Import or composite models.`,
          d: 'medium',
          tip: `Saying "I would open Performance Analyzer first" shows a measure-then-fix habit.`,
        },
        {
          q: `Case interview: an e-commerce company's sales dropped 20% last month. How would you investigate?`,
          a: `**1. Clarify and verify.** Which metric (GMV, orders, net revenue)? Compared with last month or the same month last year? Is the data complete, or did a tracking or pipeline issue cause it?

**2. Check external and seasonal causes.** Did last month have a festival sale (Diwali, Big Billion Days) that makes this month look low? Competitor campaign, holidays, weather, regulatory change?

**3. Decompose the metric.** Revenue = visitors x conversion rate x average order value. Find which part fell.

- **Traffic down**: break by channel (paid, organic, app push). Marketing budget cut? SEO ranking drop? App update broke notifications?
- **Conversion down**: check the funnel step by step. Payment failures, out-of-stock items, price increase, site errors on a specific browser or app version.
- **AOV down**: product mix shift, fewer high-value categories, discounts.

**4. Segment.** Region, city tier, device, new vs returning customers, category. A drop concentrated in one place points to a specific cause.

**5. Conclude.** Give the most likely cause backed by data, a recommendation and how you would monitor the fix.

Talk through your structure out loud; the framework matters more than guessing the answer.`,
          d: 'hard',
          at: 'Product companies, e-commerce, consulting',
          tip: `Start by checking the data itself; many real "drops" are broken tracking.`,
        },
        {
          q: `An A/B test shows the new checkout increased conversion by 2%, but revenue per user fell. What do you recommend?`,
          a: `First confirm both results are real: check significance and confidence intervals for both metrics, sample ratio mismatch and whether the test ran long enough. Revenue per user is noisy; the fall may not be significant.

If both effects are real, find the mechanism:

- **AOV fell**: did the new design hide add-ons, remove the "frequently bought together" section, or push users towards cheaper items? Compare AOV and items per order between groups.
- **Mix change**: the extra converters may be low-intent users buying small items. Conversion rises while average spend drops.
- **Discounts**: does the new flow apply coupons more prominently?
- **Segments**: maybe new users improved and repeat users got worse.

Then decide using the business goal. If the company is optimising for **profit**, compute revenue or gross margin per visitor for each group; that combines conversion and AOV in one number. If the goal is acquiring customers who may become valuable later, a conversion gain can still be worth it; estimate long-term value from the cohort.

Possible recommendation: keep the new flow but restore the cross-sell element, and run a follow-up test.`,
          d: 'hard',
          at: 'Product companies',
        },
        {
          q: `Marketing ran a discount in Karnataka only, with no A/B test. How would you measure its impact?`,
          a: `A simple before/after comparison is misleading, because sales also change with season and trends. Build a **comparison group**.

**Difference-in-differences**

1. Choose control states that behaved like Karnataka before the campaign, for example Tamil Nadu and Telangana, and check that their weekly sales trends were parallel in the months before.
2. Measure the change from before to during the campaign in Karnataka, and the same change in the control states.
3. Impact = (Karnataka after - Karnataka before) - (control after - control before).

If Karnataka grew 18% and the controls grew 6% over the same weeks, the estimated lift is about 12 percentage points.

**Then check**

- Profitability: incremental gross margin minus discount cost, not just extra revenue.
- **Pull-forward**: did sales dip after the campaign because people bought early?
- **Cannibalisation**: would these customers have bought anyway at full price?
- Spillover to neighbouring states.

State the limitations clearly and recommend a proper randomised test for the next campaign.`,
          d: 'hard',
          at: 'E-commerce, FMCG analytics, consulting',
          tip: `Name the method (difference-in-differences) and the parallel-trends check; that is what earns credit.`,
        },
        {
          q: `Your manager asks you to "find which customers are likely to churn" by next week. How do you approach it as an analyst?`,
          a: `**1. Define churn** with the business: no order in 60 days? Subscription cancelled? The definition decides everything else.

**2. Build features** in SQL per customer as of a cut-off date: recency (days since last order), frequency, monetary value, change in order frequency over the last 3 months, complaints or refunds, delivery delays, discount dependence, tenure.

**3. Start simple.** An RFM segmentation or rules ("high-value customers whose order gap is twice their usual gap") is quick, explainable and often good enough for a first campaign.

**4. If a model is needed**, train a logistic regression or a tree-based model on historical data: features before the cut-off, label = churned in the following 60 days. Never use information from after the cut-off (data leakage). Evaluate with precision and recall on a later time period.

**5. Make it usable**: a ranked list or Power BI page with churn risk and the top reasons per customer, so the retention team knows whom to call and why.

**6. Measure**: hold out a random group from the retention campaign to prove it actually reduced churn.`,
          d: 'hard',
          at: 'Telecom, fintech, subscription businesses',
        },
      ],
    },
  ],
};

export default book;
