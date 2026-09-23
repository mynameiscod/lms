/**
 * T2_DB_QUERY and T2_DB_DESIGN — nineteen units. Year 2.
 *
 * ── WHERE THIS SITS ───────────────────────────────────────────────────────────────────────
 *
 * Year 1 taught SELECT, INSERT and a single WHERE. Year 2 teaches the questions a real table is
 * asked: per-group totals, rows that span tables, paging that does not repeat itself, and querying
 * from application code with parameters rather than string building.
 *
 * The design topic is the half that decides whether the queries are even possible. A schema that
 * stores a fact twice produces data that disagrees with itself, and no amount of careful querying
 * repairs that afterwards.
 *
 * Examples are written in standard SQL, with PostgreSQL where a dialect must be chosen.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATABASE_BUNDLES: PilotBundle[] = [
  /* ── T2_DB_QUERY ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DB_QUERY_FILTERING',
    notes: `A filter that is nearly right is worse than one that is obviously wrong, because nobody
notices. Most of this unit is about the cases where SQL does not behave the way English does.

**Combining conditions:**

    SELECT * FROM orders
    WHERE status = 'paid'
      AND total > 1000
      AND created_at >= '2026-01-01';

**AND binds tighter than OR**, which is the commonest filter bug in existence:

    WHERE status = 'paid' OR status = 'pending' AND total > 1000

reads as \`paid\` **or** (\`pending\` and over 1000) — so every paid order of any size comes back.
Parenthesise whenever both appear:

    WHERE (status = 'paid' OR status = 'pending') AND total > 1000

**The shorthands:**

    WHERE status IN ('paid', 'pending')            -- one of a set
    WHERE total BETWEEN 500 AND 1000               -- inclusive at both ends
    WHERE email LIKE '%@gmail.com'                 -- pattern; % is any run of characters
    WHERE name ILIKE 'a%'                          -- case-insensitive, in PostgreSQL

**NULL is the trap.** NULL means "unknown", and comparing anything with an unknown gives unknown,
not true:

    WHERE discount != 0        -- rows where discount IS NULL do NOT come back
    WHERE discount IS NULL     -- the only way to ask
    WHERE discount IS NOT NULL

A report that quietly loses every row with a missing value is the classic version of this bug.
\`COALESCE(discount, 0) != 0\` is how you say "treat missing as zero".

**Dates.** Comparing a timestamp column to a plain date silently means midnight:

    WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01'   -- the whole of March

Writing \`<= '2026-03-31'\` loses everything that happened during the last day.

**Check the count before you trust the filter.** Run it without the filter, then with, and ask
whether the difference is the size you expected. A filter returning 4 rows where you expected 400
is easy to spot; one returning 396 is not.`,
    mcqs: [
      mcq('`WHERE status = \'paid\' OR status = \'pending\' AND total > 1000` returns:',
        [['Every paid order, plus pending orders over 1000', true],
          ['Only paid and pending orders over 1000', false],
          ['Only pending orders over 1000', false],
          ['A syntax error, since OR and AND cannot be mixed', false]],
        'AND binds tighter than OR, so the size condition applies only to pending.'),
      mcq('`WHERE discount != 0` does not return rows where discount is NULL because:',
        [['Comparing with an unknown gives unknown, not true', true],
          ['NULL is treated as zero in comparisons', false],
          ['The column must be indexed for NULLs to match', false],
          ['!= excludes NULL by SQL standard exception', false]],
        'IS NULL is the only way to ask, or COALESCE to treat it as a value.'),
      mcq('To get every row from March, the safe filter is:',
        [['created_at >= \'2026-03-01\' AND created_at < \'2026-04-01\'', true],
          ['created_at BETWEEN \'2026-03-01\' AND \'2026-03-31\'', false],
          ['created_at <= \'2026-03-31\'', false],
          ['created_at LIKE \'2026-03%\'', false]],
        'Comparing a timestamp to a plain date means midnight, so the last day is lost.'),
      mcq('`WHERE total BETWEEN 500 AND 1000` includes:',
        [['Both 500 and 1000', true],
          ['Neither 500 nor 1000', false],
          ['500 but not 1000', false],
          ['1000 but not 500', false]],
        'BETWEEN is inclusive at both ends, which surprises people expecting a half-open range.'),
    ],
    checkpoint: [
      mcq('The habit that catches a nearly-right filter is:',
        [['Comparing the row count with and without it', true],
          ['Running the query twice to check it is stable', false],
          ['Adding an index to the filtered column', false],
          ['Rewriting the filter using IN instead of OR', false]],
        'A filter returning 396 of 400 rows is invisible without that comparison.'),
      mcq('`COALESCE(discount, 0) != 0` expresses:',
        [['Treat a missing discount as zero, then compare', true],
          ['Return only rows where discount is missing', false],
          ['Set every missing discount to zero in the table', false],
          ['Compare discount to zero, ignoring NULL rows', false]],
        'COALESCE substitutes a value for NULL inside the query only.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_SORTING_PAGING',
    notes: `Rows come back in whatever order the database found convenient. If you want an order,
you ask for one — always.

    SELECT name, total FROM orders
    ORDER BY total DESC, name ASC
    LIMIT 20 OFFSET 40;          -- rows 41 to 60

**Sorting on more than one column** matters when the first has ties: without the second, two rows
with the same total can come back in either order, and in a different order next time.

**Which is exactly the paging bug.** \`LIMIT 20 OFFSET 20\` runs a *new* query; if the sort is not
total, the database may order the ties differently and a row appears on both page 1 and page 2, or
on neither.

**The fix: always sort on something unique**, usually by adding the primary key:

    ORDER BY total DESC, id ASC

**NULLs in a sort** go last by default in PostgreSQL when descending, first when ascending — which
is rarely what a report wants:

    ORDER BY delivered_at DESC NULLS LAST

**OFFSET gets slower the deeper you go.** \`OFFSET 100000\` makes the database find and discard a
hundred thousand rows before returning twenty. For anything large, page by the last value you saw
instead:

    SELECT * FROM orders
    WHERE (total, id) < (:last_total, :last_id)
    ORDER BY total DESC, id DESC
    LIMIT 20;

That is **keyset paging**. It stays fast at any depth, and it cannot skip or repeat a row even
while new rows arrive — at the cost of losing "jump to page 50".

| | OFFSET paging | Keyset paging |
|---|---|---|
| Jump to arbitrary page | Yes | No |
| Speed at depth | Degrades | Constant |
| Stable while data changes | No | Yes |

**Sorting text is not alphabetical the way you expect.** Uppercase and lowercase, accents and other
languages sort by collation rules, so \`'Zebra'\` may come before \`'apple'\`. \`ORDER BY LOWER(name)\`
is the usual fix for a display list.`,
    mcqs: [
      mcq('Without an ORDER BY, the order of returned rows is:',
        [['Whatever the database found convenient, and may change', true],
          ['The order the rows were inserted in', false],
          ['Ordered by primary key by default', false],
          ['Undefined only for tables with an index', false]],
        'If you want an order, you always ask for one.'),
      mcq('A row appearing on both page 1 and page 2 of a paged list is caused by:',
        [['A sort that is not unique, so ties order differently', true],
          ['An OFFSET larger than the row count', false],
          ['A LIMIT that is too small for the page', false],
          ['Rows being inserted between the two queries only', false]],
        'Adding the primary key to the ORDER BY makes the sort total.'),
      mcq('Keyset paging is preferred to OFFSET for large tables because:',
        [['It stays fast at any depth and cannot skip rows', true],
          ['It allows jumping to an arbitrary page', false],
          ['It requires no ORDER BY clause', false],
          ['It returns rows in insertion order', false]],
        'The trade is losing "jump to page 50".'),
      mcq('`ORDER BY delivered_at DESC NULLS LAST` is used because:',
        [['The default position of NULLs is rarely what a report wants', true],
          ['NULLs cannot be sorted without it', false],
          ['It makes the sort faster on indexed columns', false],
          ['It excludes NULL rows from the results', false]],
        'Being explicit is cheaper than discovering the default in production.'),
    ],
    checkpoint: [
      mcq('`LIMIT 20 OFFSET 100000` is slow because the database:',
        [['Finds and discards a hundred thousand rows first', true],
          ['Re-sorts the table for every page requested', false],
          ['Locks the table while counting the offset', false],
          ['Cannot use an index with a large OFFSET', false]],
        'The work grows with how deep the page is.'),
      mcq('`ORDER BY LOWER(name)` is commonly used because:',
        [['Text sorts by collation, so case can surprise you', true],
          ['LOWER makes the sort use an index', false],
          ['Names must be stored in lowercase', false],
          ['It removes accented characters before sorting', false]],
        'Otherwise Zebra can appear before apple.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_AGGREGATES',
    notes: `Aggregate functions collapse many rows into one number. The functions are simple; what
NULL does to them is where the mistakes live.

    SELECT COUNT(*)        AS orders,
           SUM(total)      AS revenue,
           AVG(total)      AS average,
           MIN(created_at) AS first_order,
           MAX(total)      AS largest
    FROM orders
    WHERE status = 'paid';

**\`COUNT(*)\` counts rows. \`COUNT(column)\` counts rows where that column is not NULL.** The
difference is a real and useful one:

    SELECT COUNT(*)            AS customers,      -- 500
           COUNT(phone)        AS with_phone,     -- 380
           COUNT(DISTINCT city) AS cities         -- 12
    FROM customers;

**Every other aggregate ignores NULL entirely**, and this is what catches people:

    AVG(rating)    -- the average of the ratings that exist

If 200 of 500 customers never rated anything, that average is over 300 values, not 500. Whether
that is right depends entirely on the question — "average rating given" yes, "average satisfaction
of our customers" no. Say which you meant:

    AVG(COALESCE(rating, 0))   -- unrated counts as zero
    SUM(total) / COUNT(*)      -- spread across everybody

**Integer division truncates** in most databases: \`SUM(passed) / COUNT(*)\` on integers gives 0
where you wanted 0.42. Cast one side: \`SUM(passed)::numeric / COUNT(*)\`.

**An aggregate over no rows** returns NULL for SUM, AVG, MIN and MAX — and 0 for COUNT. A dashboard
showing "NULL" instead of "0" for a quiet day is this, and \`COALESCE(SUM(total), 0)\` is the fix.

**Rounding for display, not for storage:**

    ROUND(AVG(total), 2)

**Check an aggregate by narrowing it.** Run it for one customer you can count by hand. If the total
for that one customer is wrong, the total for everybody is wrong in the same way, and it is far
easier to see.`,
    mcqs: [
      mcq('`COUNT(phone)` differs from `COUNT(*)` in that it:',
        [['Counts only rows where phone is not NULL', true],
          ['Counts distinct phone values', false],
          ['Counts rows where phone is not empty text', false],
          ['Is identical, but slower', false]],
        'A genuinely useful difference when asking how many records are complete.'),
      mcq('`AVG(rating)` where 200 of 500 customers never rated gives:',
        [['The average over the 300 ratings that exist', true],
          ['The average over all 500, treating missing as zero', false],
          ['NULL, because some values are missing', false],
          ['An error, unless NULLs are excluded first', false]],
        'Which answer is correct depends on whether you meant "rating given" or "satisfaction".'),
      mcq('`SUM(total)` over a filter matching no rows returns:',
        [['NULL', true], ['0', false], ['An empty result set', false], ['An error', false]],
        'COUNT returns 0; the others return NULL, which is why dashboards show NULL on a quiet day.'),
      mcq('`SUM(passed) / COUNT(*)` on integer columns often returns 0 because:',
        [['Integer division truncates the fractional part', true],
          ['COUNT(*) is larger than SUM by definition', false],
          ['NULL values are counted as zero', false],
          ['Aggregates cannot be divided without a cast', false]],
        'Cast one side to numeric to get the fraction you wanted.'),
    ],
    checkpoint: [
      mcq('`COALESCE(SUM(total), 0)` is used to:',
        [['Show zero rather than NULL when nothing matched', true],
          ['Ignore rows with a NULL total', false],
          ['Round the sum to the nearest whole number', false],
          ['Prevent the sum from overflowing', false]],
        'The difference between a dashboard reading 0 and one reading NULL.'),
      mcq('The quickest way to check an aggregate is correct is:',
        [['Run it for one record you can verify by hand', true],
          ['Run it twice and compare the results', false],
          ['Compare it against COUNT(*)', false],
          ['Add an index and re-run it', false]],
        'A wrong total for one customer is wrong for everybody, and far easier to see.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_GROUP_BY',
    notes: `GROUP BY answers "per" questions: revenue per month, orders per customer, errors per
endpoint. It is where SQL stops being a filter and starts being a report.

    SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent
    FROM orders
    WHERE status = 'paid'
    GROUP BY customer_id
    ORDER BY spent DESC;

**The rule that explains most errors:** every column in the SELECT must either be in the GROUP BY or
be inside an aggregate. \`SELECT customer_id, name, COUNT(*)\` fails unless \`name\` is grouped too,
because the database cannot know which of several names to show.

**WHERE and HAVING are not interchangeable:**

    SELECT customer_id, SUM(total) AS spent
    FROM orders
    WHERE status = 'paid'        -- filters ROWS, before grouping
    GROUP BY customer_id
    HAVING SUM(total) > 10000;   -- filters GROUPS, after aggregating

The order the database works in is: **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY**. That
order explains two things beginners find arbitrary: why HAVING can use an aggregate and WHERE
cannot, and why an alias defined in SELECT cannot be used in WHERE.

**Prefer WHERE where you can.** Filtering rows before grouping is cheaper than grouping everything
and discarding groups afterwards.

**Grouping by an expression** is how you get periods:

    SELECT DATE_TRUNC('month', created_at) AS month, SUM(total)
    FROM orders
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month;

**The missing-group trap.** A month with no orders does not appear at all — a chart drawn straight
from this quietly skips it. Generating the full list of periods and joining to it is the fix, and
recognising that you need to is the point.

**Grouping on several columns** gives you every combination that exists:

    GROUP BY country, status`,
    mcqs: [
      mcq('`SELECT customer_id, name, COUNT(*) ... GROUP BY customer_id` fails because:',
        [['The database cannot know which name to show for the group', true],
          ['COUNT(*) cannot be used alongside plain columns', false],
          ['name must be aliased before grouping', false],
          ['GROUP BY accepts only one column', false]],
        'Every selected column must be grouped or aggregated.'),
      mcq('HAVING differs from WHERE in that it filters:',
        [['Groups, after aggregation', true],
          ['Rows, before aggregation', false],
          ['Columns rather than rows', false],
          ['The final sorted output only', false]],
        'Which is why HAVING can use an aggregate and WHERE cannot.'),
      mcq('An alias defined in SELECT cannot be used in WHERE because:',
        [['WHERE runs before SELECT', true],
          ['Aliases exist only in the client', false],
          ['WHERE cannot reference computed values', false],
          ['The alias is not unique across the query', false]],
        'FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY is the order of evaluation.'),
      mcq('A month with no orders is missing from a grouped monthly report because:',
        [['Grouping produces only the periods that have rows', true],
          ['DATE_TRUNC skips empty periods deliberately', false],
          ['The ORDER BY removes empty groups', false],
          ['HAVING filters out zero-count groups by default', false]],
        'Generate the list of periods and join to it when the gap matters.'),
    ],
    checkpoint: [
      mcq('Filtering with WHERE rather than HAVING where possible is preferred because:',
        [['Fewer rows are grouped, so it is cheaper', true],
          ['HAVING cannot use indexes at all', false],
          ['WHERE allows more conditions', false],
          ['HAVING is not supported everywhere', false]],
        'Discarding rows before grouping beats discarding groups after.'),
      mcq('`GROUP BY country, status` produces one row for:',
        [['Each combination of country and status that exists', true],
          ['Each country, with statuses listed', false],
          ['Each status, across all countries', false],
          ['Every possible pairing, including empty ones', false]],
        'Only combinations present in the data appear.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_JOINS',
    notes: `Data is split across tables on purpose. A join is how you ask a question that spans them.

    SELECT o.id, o.total, c.name, c.city
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.status = 'paid';

**The four you need:**

| Join | Keeps |
|---|---|
| \`INNER JOIN\` (or just \`JOIN\`) | Rows with a match on both sides |
| \`LEFT JOIN\` | Every row from the left, matched or not |
| \`RIGHT JOIN\` | Every row from the right — rare; write it as a LEFT the other way round |
| \`FULL JOIN\` | Everything from both sides |

**The most important consequence:** an INNER JOIN silently drops rows. Orders whose customer was
deleted vanish from the report, and nobody notices because the report looks fine. If every order
must appear, you need a LEFT JOIN.

**LEFT JOIN gives NULL for the missing side**, which is also how you find the gaps:

    SELECT c.name
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE o.id IS NULL;             -- customers who have never ordered

That "LEFT JOIN plus IS NULL" pattern is worth memorising; it answers every "which ones have none"
question.

**The accidental cross join.** Forget the ON condition and the database pairs every row with every
row: a thousand customers and a thousand orders gives a million rows. If a query suddenly returns an
absurd number of rows, look at the join conditions first.

**Row multiplication is subtler and more common.** Joining a customer to their five orders gives
five rows, so \`SUM(c.credit_limit)\` now counts that limit five times. Aggregate before joining, or
count distinctly:

    COUNT(DISTINCT c.id)

**Filtering a LEFT JOIN in WHERE turns it into an inner join**, because the NULL rows fail the
condition. Put the condition in the ON clause instead:

    LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid'`,
    mcqs: [
      mcq('An INNER JOIN between orders and customers silently drops:',
        [['Orders whose customer no longer exists', true],
          ['Customers with more than one order', false],
          ['Orders with a NULL total', false],
          ['Duplicate rows from either table', false]],
        'The report looks fine, which is what makes it dangerous.'),
      mcq('To list customers who have never ordered, you use:',
        [['A LEFT JOIN with a WHERE ... IS NULL on the right side', true],
          ['An INNER JOIN with a COUNT of zero', false],
          ['A FULL JOIN with HAVING COUNT(*) = 0', false],
          ['A cross join filtered by customer id', false]],
        'The pattern answers every "which ones have none" question.'),
      mcq('A query suddenly returning an absurd number of rows usually means:',
        [['A join condition is missing, producing a cross join', true],
          ['The LIMIT clause was omitted', false],
          ['An index is missing on the joined column', false],
          ['The tables need to be vacuumed', false]],
        'Every row paired with every row: a thousand each gives a million.'),
      mcq('`SUM(c.credit_limit)` after joining customers to their orders is wrong because:',
        [['The limit is counted once per matching order', true],
          ['SUM cannot be used across joined tables', false],
          ['NULL limits are excluded from the sum', false],
          ['The join changes the column type', false]],
        'Aggregate before joining, or use COUNT DISTINCT where it applies.'),
    ],
    checkpoint: [
      mcq('Putting `o.status = \'paid\'` in the WHERE clause of a LEFT JOIN:',
        [['Turns it into an inner join, dropping unmatched rows', true],
          ['Filters only the matched rows, keeping the rest', false],
          ['Has the same effect as putting it in ON', false],
          ['Is required, since ON accepts only key conditions', false]],
        'The NULL rows fail the condition, so they disappear.'),
      mcq('A RIGHT JOIN is rarely written because:',
        [['The same query reads better as a LEFT JOIN reversed', true],
          ['It is slower than a LEFT JOIN', false],
          ['It is not supported by PostgreSQL or MySQL', false],
          ['It cannot be combined with WHERE', false]],
        'Keeping every join left-handed makes a long query far easier to read.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_SUBQUERIES',
    notes: `Some questions need two steps: work something out, then use it. A subquery is a query
used as a value, a list or a table.

**As a value:**

    SELECT name, total FROM orders
    WHERE total > (SELECT AVG(total) FROM orders);

**As a list:**

    SELECT name FROM customers
    WHERE id IN (SELECT customer_id FROM orders WHERE total > 5000);

**As a table** — the one that unlocks real reports, because you can aggregate an aggregate:

    SELECT AVG(spent) FROM (
      SELECT customer_id, SUM(total) AS spent
      FROM orders GROUP BY customer_id
    ) AS per_customer;

"The average amount a customer spends" cannot be written with a single GROUP BY, and this is why.

**EXISTS is usually better than IN** for "has any", because it stops at the first match and handles
NULL sanely:

    SELECT name FROM customers c
    WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

**\`NOT IN\` with NULLs returns nothing at all.** If the subquery produces even one NULL, every
comparison is unknown and the whole result is empty. \`NOT EXISTS\` does not have this problem, and
is the reason most style guides prefer it.

**CTEs make two-step queries readable.** A \`WITH\` clause names each step:

    WITH per_customer AS (
      SELECT customer_id, SUM(total) AS spent
      FROM orders WHERE status = 'paid'
      GROUP BY customer_id
    ), top_spenders AS (
      SELECT * FROM per_customer WHERE spent > 10000
    )
    SELECT c.name, t.spent
    FROM top_spenders t
    JOIN customers c ON c.id = t.customer_id
    ORDER BY t.spent DESC;

Same result as nesting, read top to bottom instead of inside out. For anything you will return to,
write the CTE — it is the difference between a query a colleague can change and one they rewrite.`,
    mcqs: [
      mcq('"The average amount a customer spends" needs a subquery because:',
        [['You must aggregate per customer, then average those totals', true],
          ['AVG cannot be used with a WHERE clause', false],
          ['GROUP BY cannot be combined with AVG', false],
          ['The two tables must be joined first', false]],
        'Aggregating an aggregate is exactly what a subquery-as-table is for.'),
      mcq('`NOT IN` with a subquery that can produce NULL returns:',
        [['No rows at all', true],
          ['The same rows as NOT EXISTS', false],
          ['Rows where the value is NULL only', false],
          ['An error about NULL comparison', false]],
        'Every comparison becomes unknown, which is why NOT EXISTS is preferred.'),
      mcq('EXISTS is often preferred to IN for "has any" because it:',
        [['Stops at the first match and handles NULL sanely', true],
          ['Returns the matched rows as well', false],
          ['Works without an ON condition', false],
          ['Can be indexed while IN cannot', false]],
        'Both correctness and cost point the same way.'),
      mcq('A CTE is preferred to nesting mainly because:',
        [['It reads top to bottom rather than inside out', true],
          ['It runs faster in every database', false],
          ['It allows aggregates that nesting cannot', false],
          ['It avoids the need for joins', false]],
        'The difference between a query a colleague can change and one they rewrite.'),
    ],
    checkpoint: [
      mcq('A subquery used in place of a table must be:',
        [['Given an alias', true],
          ['Limited to one row', false],
          ['Free of aggregate functions', false],
          ['Written as a CTE instead', false]],
        'Without a name there is nothing for the outer query to refer to.'),
      mcq('`WHERE total > (SELECT AVG(total) FROM orders)` uses the subquery as:',
        [['A single value', true],
          ['A list of values', false],
          ['A table to join against', false],
          ['A condition evaluated per row', false]],
        'It must return exactly one row and one column, or the query fails.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_APP_CRUD',
    notes: `Querying from application code is where the security of the whole system is decided, and
the rule is short: **never build SQL by joining strings.**

**The vulnerable version**, which is how most breaches in this category happen:

    # NEVER
    cur.execute("SELECT * FROM users WHERE email = '" + email + "'")

Given \`email = "' OR '1'='1"\`, that query returns every user. Given something worse, it drops the
table.

**The safe version.** The placeholders are not string substitution — the database receives the
query and the values separately, so a value can never be read as SQL:

    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    cur.execute(
      "INSERT INTO orders (customer_id, total, status) VALUES (%s, %s, %s) RETURNING id",
      (customer_id, total, 'pending'),
    )

**The four operations, from code:**

    # Read
    cur.execute("SELECT id, name FROM customers WHERE city = %s", (city,))
    rows = cur.fetchall()

    # Create
    cur.execute("INSERT INTO customers (name, email) VALUES (%s, %s) RETURNING id", (name, email))
    new_id = cur.fetchone()[0]

    # Update — the WHERE clause is not optional
    cur.execute("UPDATE customers SET city = %s WHERE id = %s", (city, customer_id))

    # Delete
    cur.execute("DELETE FROM customers WHERE id = %s", (customer_id,))

**An UPDATE or DELETE without a WHERE changes every row**, and there is no undo outside a
transaction. Run the SELECT with the same WHERE first, look at what comes back, and only then
change the verb.

**Connections are expensive**, so real applications use a pool rather than connecting per query. Use
a context manager so the connection is returned even when something raises.

**Fetch what you need.** \`SELECT *\` over a million rows into a list is how an application runs out
of memory; select the columns you use, and page or iterate.

**The N+1 problem**, which Year 2 should recognise by name: one query for the list, then one more
per row inside the loop. A hundred customers becomes a hundred and one queries. One join, or one
query with \`WHERE id = ANY(%s)\`, replaces the lot.`,
    mcqs: [
      mcq('Parameterised queries prevent injection because:',
        [['The query and the values travel separately to the database', true],
          ['The library escapes dangerous characters in the string', false],
          ['The database rejects queries containing quotes', false],
          ['The values are encrypted before sending', false]],
        'A value can never be re-read as SQL, whatever it contains.'),
      mcq('Running an UPDATE without a WHERE clause:',
        [['Changes every row in the table', true],
          ['Is rejected by most databases', false],
          ['Changes only the first matching row', false],
          ['Requires confirmation before running', false]],
        'Run the SELECT with the same WHERE first, then change the verb.'),
      mcq('The N+1 problem is:',
        [['One query for the list, then one more per row', true],
          ['One query returning one row too many', false],
          ['A join producing duplicated rows', false],
          ['A transaction that commits N times', false]],
        'A join, or one query with a list of ids, replaces the lot.'),
      mcq('`SELECT *` over a very large table from application code risks:',
        [['Loading more into memory than the process can hold', true],
          ['Locking the table for other readers', false],
          ['Returning columns in a random order', false],
          ['Bypassing the index entirely', false]],
        'Select the columns you use, and page or iterate.'),
    ],
    checkpoint: [
      mcq('`cur.execute("... WHERE email = \'" + email + "\'")` is dangerous because:',
        [['A crafted value becomes part of the SQL itself', true],
          ['String concatenation is slow in Python', false],
          ['The quotes may be mismatched at runtime', false],
          ['The query cannot use an index', false]],
        'An email of "\' OR \'1\'=\'1" returns every user.'),
      mcq('Applications use a connection pool because:',
        [['Opening a connection per query is expensive', true],
          ['Databases limit each query to one connection', false],
          ['Pools prevent SQL injection', false],
          ['Transactions require more than one connection', false]],
        'Use a context manager so connections return even when something raises.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_DEBUGGING',
    notes: `A wrong query rarely announces itself. It returns rows, and they look plausible. These
are the shapes of "plausible but wrong".

**1. Fewer rows than expected.** Almost always an INNER JOIN dropping unmatched rows, or a NULL
failing a comparison. Remove the join and count; add it back and count again. The difference is what
the join is throwing away.

**2. More rows than expected.** Row multiplication from a join to a table with several matching
rows, or a missing join condition. \`SELECT COUNT(*)\` before and after adding each join tells you
which one did it.

**3. Totals that are too large.** The same multiplication, now summed. A customer joined to five
orders has their credit limit counted five times.

**4. NULL where a number should be.** An aggregate over zero rows. \`COALESCE\` it.

**5. Nothing at all from a \`NOT IN\`.** A NULL in the subquery. Switch to \`NOT EXISTS\`.

**6. The filter that lost the last day.** \`<= '2026-03-31'\` against a timestamp.

**The method, in order:**

1. **Run the pieces.** Take the subquery out and run it alone. Take one join off at a time.
2. **Count at each stage.** The step where the count changes unexpectedly is the bug.
3. **Check one known record by hand.** Pick a customer you can verify, and follow them through.
4. **Read the query aloud** as an English sentence. Most wrong queries sound wrong when spoken.

**\`EXPLAIN\` for slowness rather than wrongness:**

    EXPLAIN ANALYZE SELECT ...;

Look for a sequential scan on a large table where you expected an index, and for a row estimate wildly
different from the actual count — that usually means statistics are stale or the filter is not what
the planner thinks it is.

**Before running a destructive statement**, always run it as a SELECT with the identical WHERE, and
wrap the real thing in a transaction you can roll back.`,
    mcqs: [
      mcq('A query returning fewer rows than expected most often means:',
        [['An inner join is dropping unmatched rows', true],
          ['The LIMIT is set too low', false],
          ['An index is missing on the filter column', false],
          ['The table needs re-analysing', false]],
        'Remove the join, count, add it back, count again.'),
      mcq('The most reliable way to find which join broke a query is to:',
        [['Count rows before and after adding each join', true],
          ['Run EXPLAIN on the finished query', false],
          ['Rewrite the joins as subqueries', false],
          ['Add DISTINCT and compare the results', false]],
        'The step where the count changes unexpectedly is the bug.'),
      mcq('In `EXPLAIN ANALYZE` output, a warning sign is:',
        [['A sequential scan on a large table you expected to be indexed', true],
          ['Any use of a nested loop join', false],
          ['A sort appearing in the plan', false],
          ['More than three plan nodes', false]],
        'Also a row estimate wildly different from the actual count.'),
      mcq('Reading a query aloud as an English sentence helps because:',
        [['Most wrong queries sound wrong when spoken', true],
          ['It slows you down enough to spot typos', false],
          ['SQL is designed to be read aloud', false],
          ['It reveals missing indexes', false]],
        'The cheapest check in the list, and a surprisingly effective one.'),
    ],
    checkpoint: [
      mcq('Before running a DELETE, the safe step is to:',
        [['Run a SELECT with the identical WHERE clause', true],
          ['Back up the whole database beforehand', false],
          ['Add a LIMIT to the DELETE', false],
          ['Run it on a copy of the table', false]],
        'And wrap the real statement in a transaction you can roll back.'),
      mcq('A total that is several times too large is usually caused by:',
        [['Row multiplication from a join, then summed', true],
          ['An integer overflow in the sum', false],
          ['NULL values counted as large numbers', false],
          ['A missing GROUP BY clause', false]],
        'The credit limit counted once per matching order.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_PRACTICE',
    notes: `No new ideas. Enough queries against a real dataset that the shapes become automatic.

**Get a dataset with at least four related tables and several thousand rows** — a sample e-commerce
or library schema, or one you generate. Toy data with ten rows hides every bug in this topic.

**Answer these, and check each one by hand:**

1. The ten customers who have spent the most, with their order counts.
2. Revenue per month for the last year, with empty months showing as zero.
3. Customers who have never ordered.
4. Customers who ordered last year but not this year.
5. The most popular product in each category.
6. Orders whose total does not match the sum of their line items.
7. The average number of items per order.
8. The average amount a customer spends, and the median if your database supports it.
9. Products never ordered.
10. The day of the week with the most orders.

**For each, record:**

| Question | The query | What you got wrong first | How you verified it |
|---|---|---|---|

**Verification is the exercise.** Anybody can produce a number; the skill is knowing it is right.
Cross-check with a smaller version, count by hand, or compute it a second way and compare.

**The mistakes this set is built to expose:** the inner join that drops rows, the missing month, the
double-counted total, the empty \`NOT IN\`, and paging that repeats a row. If you finish without
meeting at least three of those, your dataset is too small or too clean.`,
    mcqs: [
      mcq('Practising on a ten-row toy table is inadequate because:',
        [['It hides the bugs this topic is about', true],
          ['Queries run too fast to time', false],
          ['Joins behave differently on small tables', false],
          ['Aggregates need a minimum row count', false]],
        'Dropped rows and doubled totals are invisible at that size.'),
      mcq('"Revenue per month with empty months showing as zero" requires:',
        [['Generating the list of months and joining to it', true],
          ['A HAVING clause allowing zero counts', false],
          ['COALESCE on the SUM alone', false],
          ['Grouping by month and ordering ascending', false]],
        'Grouping alone produces only the months that have rows.'),
      mcq('"Orders whose total does not match their line items" is a query that:',
        [['Compares a stored value against a computed one', true],
          ['Requires a full outer join', false],
          ['Cannot be written without a CTE', false],
          ['Needs a subquery in the SELECT clause', false]],
        'The kind of check that finds real data corruption.'),
      mcq('The most valuable column in the practice record is:',
        [['How you verified the answer', true],
          ['How long the query took to write', false],
          ['Which database you used', false],
          ['The number of rows returned', false]],
        'Anybody can produce a number; the skill is knowing it is right.'),
      mcq('If you finish this set without meeting a dropped-row or doubled-total bug:',
        [['The dataset is probably too small or too clean', true],
          ['The queries were written correctly first time', false],
          ['The database optimised the problems away', false],
          ['The exercise has been completed properly', false]],
        'Meeting the bugs is the point of the exercise.'),
    ],
    checkpoint: [
      mcq('Cross-checking a result by computing it a second way is valuable because:',
        [['Two methods agreeing is real evidence it is right', true],
          ['It is faster than checking by hand', false],
          ['It exercises more of the SQL syntax', false],
          ['It confirms the whole database is consistent', false]],
        'One number on its own is a claim, not evidence.'),
      mcq('"Customers who ordered last year but not this year" combines:',
        [['A grouped filter with a NOT EXISTS', true],
          ['Two inner joins on the same table', false],
          ['A cross join filtered by year', false],
          ['An aggregate inside a WHERE clause', false]],
        'Each half is straightforward; putting them together is the exercise.'),
    ],
  },

  {
    unitCode: 'T2_DB_QUERY_MINI_PROJECT',
    notes: `A reporting layer over a real schema: a set of questions answered correctly, from
application code, with the verification written down.

**Why reporting.** It is the commonest database work a junior developer is actually given, and it is
where wrong answers survive longest — a dashboard has no test that says "this number is a lie".

**What is being assessed:** that the queries are correct at the edges (missing periods, absent
relationships, NULLs), that they are run safely from code with parameters, and that you can show
each number is right rather than assert it.

**Build it in this order:**

1. **Load a real dataset** of a few thousand rows across related tables.
2. **Write the questions in English first**, precisely — "average spend per customer, counting
   customers who have never ordered as zero" is a different question from one that does not.
3. **Write each query**, and verify it before moving on.
4. **Wrap them in code** with parameters and a connection that is always released.
5. **Handle the edges deliberately**: empty periods, no rows, NULLs.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Reporting Layer You Can Defend',
      description: 'Answer a set of real reporting questions over a multi-table dataset, from application code, with each number verified rather than assumed.',
      instructions: `**The brief**

Take a dataset with **at least four related tables and a few thousand rows** — a sample e-commerce,
library, clinic or transport schema — and build a small reporting module over it.

**Requirements**

1. **At least eight reports**, including at least one of each:
   - A per-period report with no gaps (empty periods present, as zero)
   - A per-group report with a HAVING filter
   - A report spanning three or more tables
   - A "which ones have none" report
   - A data-integrity check that finds rows that disagree with each other
2. **Every query parameterised**, with no SQL built by string joining anywhere.
3. **A command-line interface**: choose the report, pass a date range or other filter.
4. **Correct edge behaviour**: no rows produces zero and an empty table, not a crash or a NULL.
5. **A verification note per report** — how you know the number is right.
6. **One slow query made fast**, with before and after timings and the reason.

**What to submit**

1. The code, and the schema plus loading script for the dataset.
2. A **report catalogue**: for each, the English question, the SQL, and the verification note.
3. The **performance note**: the slow query, \`EXPLAIN ANALYZE\` before and after, the change made
   and the timings.
4. Sample **output** for each report, including at least one run that returns nothing.
5. A **short write-up** (300–400 words): the query that was wrong in a way you nearly missed and
   how you caught it; one question you had to rephrase before it could be answered; what you would
   add if this had to run daily without supervision.

**Constraints**

- No ORM. Raw SQL, so that the SQL is the work.
- No results computed in application code that SQL should have produced.
- Every destructive statement, if any, inside a transaction.

**Where the marks are.** The verification notes and the integrity check. A dashboard that is
confidently wrong is worse than no dashboard, and showing your numbers are right is the skill this
unit exists for.`,
      rubric: [
        {
          criterion: 'Query correctness',
          description: 'Eight reports answering their questions exactly, including gaps, absent relationships and NULLs handled deliberately.',
          maxPoints: 30,
        },
        {
          criterion: 'Verification',
          description: 'A credible note per report showing how the number was checked, not asserted; the integrity check finds real disagreement.',
          maxPoints: 25,
        },
        {
          criterion: 'Safe database access',
          description: 'Parameterised queries throughout, connections always released, no SQL assembled from strings, sensible fetching.',
          maxPoints: 20,
        },
        {
          criterion: 'Performance work',
          description: 'One query measurably improved, with EXPLAIN output before and after and an explanation of why the change helped.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Honest account of a near-miss, a question that needed rephrasing, and what daily unsupervised running would require.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_DB_DESIGN ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DB_DESIGN_ENTITIES',
    notes: `Design starts before any SQL is written, by deciding what the system is actually about.

**Read the brief and look for the nouns.**

    "A library lends books to members. A member may borrow up to five books at a time.
     Each loan has a due date, and a fine is charged for late returns."

The nouns that have their own identity and their own facts become entities: **Book**, **Member**,
**Loan**, **Fine**. "Due date" is not an entity — it is a fact about a loan.

**The test for an entity:** can you point at one, and does it have facts of its own that are not
facts about something else? A due date fails that test. A loan passes it.

**Attributes are the facts each entity holds**, and each needs a type and a nullability decision:

    Member: id, name, email, joined_on, membership_expires_on
    Book:   id, title, isbn, published_year, copies_owned
    Loan:   id, book_id, member_id, borrowed_on, due_on, returned_on

**\`returned_on\` being nullable is the design.** NULL means "not yet returned", which is how you
find the outstanding loans. Recognising which columns are genuinely optional is a large part of
getting a schema right.

**The distinction people get wrong: a book versus a copy of a book.** The library owns three copies
of one title; a loan is of a *copy*, not of a title. If the brief says "a member may borrow up to
five books", you need to know which is meant. Ask.

**Things that look like attributes but are entities.** An address on a customer is fine until a
customer needs two. A single "category" column is fine until a product needs three. When a fact can
repeat, it is an entity of its own.

**Write the entities and their attributes down before you write CREATE TABLE.** Ten minutes on
paper prevents a migration later, and the migration is always harder than the ten minutes.`,
    mcqs: [
      mcq('The test for whether something is an entity is:',
        [['You can point at one and it has facts of its own', true],
          ['It appears more than once in the brief', false],
          ['It needs to be stored in the database', false],
          ['It has a natural unique identifier', false]],
        'A due date fails that test; a loan passes it.'),
      mcq('`returned_on` being nullable on a loan encodes:',
        [['That the loan is still outstanding', true],
          ['That the date was not recorded properly', false],
          ['That returns are optional for members', false],
          ['That the column is not yet used', false]],
        'Which columns are genuinely optional is a large part of getting a schema right.'),
      mcq('An address stored as columns on a customer becomes a problem when:',
        [['A customer needs more than one address', true],
          ['The address contains unusual characters', false],
          ['Two customers share an address', false],
          ['The address changes over time only', false]],
        'When a fact can repeat, it is an entity of its own.'),
      mcq('"A member may borrow up to five books" is ambiguous because:',
        [['It could mean five titles or five physical copies', true],
          ['It does not say over what period', false],
          ['Members may be of different types', false],
          ['Books may be reserved as well as borrowed', false]],
        'Ask, before the schema encodes the wrong answer.'),
    ],
    checkpoint: [
      mcq('Writing entities and attributes on paper before CREATE TABLE is worth it because:',
        [['A migration later is always harder than the ten minutes', true],
          ['SQL syntax is easier to write from written notes', false],
          ['It is required by most design tools', false],
          ['It produces documentation for the team', false]],
        'Design decisions are cheapest before any data exists.'),
      mcq('In the library brief, "due date" is:',
        [['An attribute of a loan', true],
          ['An entity in its own right', false],
          ['An attribute of a book', false],
          ['A relationship between member and book', false]],
        'It is a fact about something else, not a thing with facts of its own.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_KEYS_AND_RELATIONSHIPS',
    notes: `Keys are how a database knows one row from another, and how tables point at each other.

**A primary key identifies a row uniquely, and never changes.**

    CREATE TABLE members (
      id         BIGSERIAL PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL
    );

**Prefer a surrogate key** — a generated id — over a natural one like an email. Emails change,
national identifiers turn out to be reusable, and "we will use the ISBN" fails the day a book has
two. Keep the natural identifier as a UNIQUE column, which gives you the uniqueness without making
every other table depend on it.

**A foreign key points at another table\'s primary key:**

    CREATE TABLE loans (
      id         BIGSERIAL PRIMARY KEY,
      book_id    BIGINT NOT NULL REFERENCES books(id),
      member_id  BIGINT NOT NULL REFERENCES members(id),
      borrowed_on DATE NOT NULL,
      due_on      DATE NOT NULL,
      returned_on DATE
    );

**The three shapes, and where the key goes:**

| Relationship | Implementation |
|---|---|
| One-to-many (a member has many loans) | Foreign key on the **many** side |
| Many-to-many (a book has many authors, an author many books) | A **join table** with both keys |
| One-to-one (a user has one profile) | Foreign key on either side, with UNIQUE |

**The join table** is the one people miss:

    CREATE TABLE book_authors (
      book_id   BIGINT NOT NULL REFERENCES books(id),
      author_id BIGINT NOT NULL REFERENCES authors(id),
      PRIMARY KEY (book_id, author_id)
    );

The composite primary key prevents the same pairing twice. A join table can carry its own facts too
— \`author_order\`, \`contribution\` — and often should.

**\`ON DELETE\` decides what happens when the parent goes:**

    REFERENCES members(id) ON DELETE RESTRICT   -- refuse while loans exist (usually right)
    REFERENCES loans(id)   ON DELETE CASCADE    -- delete the children too (right for owned rows)

\`CASCADE\` on the wrong relationship deletes a customer and silently takes their entire order
history with them. Default to RESTRICT, and use CASCADE only where the child genuinely cannot exist
alone.`,
    mcqs: [
      mcq('A surrogate key is preferred to an email as primary key because:',
        [['Natural identifiers change, and everything depends on the key', true],
          ['Text keys cannot be indexed efficiently', false],
          ['Emails are not guaranteed unique', false],
          ['Foreign keys must be numeric', false]],
        'Keep the email as a UNIQUE column, which gives uniqueness without the dependency.'),
      mcq('In a one-to-many relationship, the foreign key goes on:',
        [['The many side', true],
          ['The one side', false],
          ['A separate join table', false],
          ['Either side, as convenient', false]],
        'A loan points at its member; a member cannot point at many loans in one column.'),
      mcq('A join table for many-to-many usually has:',
        [['A composite primary key of both foreign keys', true],
          ['No primary key at all', false],
          ['A single foreign key and a type column', false],
          ['One row per parent entity', false]],
        'It prevents the same pairing being recorded twice.'),
      mcq('`ON DELETE CASCADE` on the wrong relationship results in:',
        [['Deleting a parent silently removing its history', true],
          ['A foreign key violation on every delete', false],
          ['Orphaned rows in the child table', false],
          ['The delete being refused', false]],
        'Default to RESTRICT; use CASCADE only where the child cannot exist alone.'),
    ],
    checkpoint: [
      mcq('A one-to-one relationship is implemented with:',
        [['A foreign key plus a UNIQUE constraint', true],
          ['A join table with both keys', false],
          ['Two foreign keys pointing at each other', false],
          ['A shared primary key sequence', false]],
        'Without the UNIQUE it is just a one-to-many that happens to have one row.'),
      mcq('A join table carrying `author_order` shows that:',
        [['A join table can hold facts about the pairing', true],
          ['The relationship is really one-to-many', false],
          ['The composite key must be dropped', false],
          ['Ordering cannot be stored elsewhere', false]],
        'Facts that belong to the pairing, not to either side, live there.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_NORMALISATION',
    notes: `Normalisation is one idea with a formal name: **store each fact in exactly one place.**
Everything else follows from it.

**The problem, in a single table:**

| order_id | customer_name | customer_email | product | price |
|---|---|---|---|---|
| 1 | Asha Rao | asha@mail.com | Keyboard | 1200 |
| 2 | Asha Rao | asha@mail.com | Mouse | 600 |
| 3 | Asha Rao | asha@gmail.com | Monitor | 9000 |

Three problems, and they have names:

- **Update anomaly** — Asha changes her email and you must update every row. Row 3 shows what
  happens when one is missed: the database now holds two answers to one question, and neither is
  marked as wrong.
- **Insert anomaly** — a customer who has not ordered cannot be recorded at all.
- **Delete anomaly** — delete the last order and the customer disappears.

**The fix** is to split by what the fact is about:

    customers(id, name, email)
    products(id, name, price)
    orders(id, customer_id, created_at)
    order_items(order_id, product_id, quantity, unit_price)

**The practical rule**, which gets you the first three normal forms without the vocabulary: every
column must be a fact about the key, the whole key, and nothing but the key. If a column describes
something other than what the row is about, it belongs in another table.

**\`unit_price\` on \`order_items\` is not a mistake.** The price of a product today is a fact about
the product; the price *paid* is a fact about that order line, and it must not change when the
product is repriced next month. Recognising a historical fact from a current one is the judgement
this topic is really teaching.

**When to denormalise.** Deliberately, after measuring, for a read that is genuinely too slow — and
with something that keeps the copy correct. A cached \`order_total\` that nothing recalculates drifts
away from the truth, and a total that disagrees with its own line items is worse than a slow query.

**Normalise first.** Denormalisation is an optimisation, and optimising a design you have not
measured is the same mistake in every part of this course.`,
    mcqs: [
      mcq('The single idea behind normalisation is:',
        [['Store each fact in exactly one place', true],
          ['Keep tables as small as possible', false],
          ['Avoid joins wherever you can', false],
          ['Give every table a numeric key', false]],
        'The normal forms are that idea, formalised.'),
      mcq('An update anomaly is:',
        [['Changing a fact requires updating many rows, and one is missed', true],
          ['A row that cannot be inserted without a parent', false],
          ['A delete that removes more than intended', false],
          ['Two rows with the same primary key', false]],
        'The database then holds two answers, neither marked as wrong.'),
      mcq('Storing `unit_price` on an order line is correct because:',
        [['The price paid is a fact about the order, not the product today', true],
          ['It avoids a join when displaying an order', false],
          ['Product prices cannot be indexed', false],
          ['Normalisation does not apply to numbers', false]],
        'Telling a historical fact from a current one is the judgement here.'),
      mcq('Denormalisation should be applied:',
        [['After measuring, with something that keeps the copy correct', true],
          ['At design time, to avoid joins later', false],
          ['Whenever a query involves three or more tables', false],
          ['Only in tables that are never updated', false]],
        'A cached total that drifts is worse than a slow query.'),
    ],
    checkpoint: [
      mcq('"Every column is a fact about the key, the whole key and nothing but the key" summarises:',
        [['The first three normal forms', true],
          ['Referential integrity', false],
          ['The purpose of indexes', false],
          ['Transaction isolation levels', false]],
        'It gets you there without the formal vocabulary.'),
      mcq('An insert anomaly in the single-table example means:',
        [['A customer who has not ordered cannot be recorded', true],
          ['Two orders cannot share a customer', false],
          ['A product cannot be inserted twice', false],
          ['New rows require a primary key value to exist', false]],
        'The table can only record customers as a side effect of orders.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_CONSTRAINTS',
    notes: `Application code is one way in. Constraints hold whatever the code does, whoever wrote it,
and whatever runs at three in the morning from a script nobody remembers.

    CREATE TABLE loans (
      id          BIGSERIAL PRIMARY KEY,
      book_id     BIGINT NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
      member_id   BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
      borrowed_on DATE NOT NULL DEFAULT CURRENT_DATE,
      due_on      DATE NOT NULL,
      returned_on DATE,
      CONSTRAINT due_after_borrow CHECK (due_on > borrowed_on),
      CONSTRAINT return_after_borrow CHECK (returned_on IS NULL OR returned_on >= borrowed_on)
    );

**What each one buys:**

| Constraint | Prevents |
|---|---|
| \`NOT NULL\` | A required fact going missing |
| \`UNIQUE\` | Two members with one email |
| \`CHECK\` | A negative quantity, a due date before the loan, a status outside the allowed set |
| \`FOREIGN KEY\` | A loan pointing at a book that does not exist |
| \`DEFAULT\` | Repeating the same value everywhere in code |

**Why not just validate in the application?** Because validation is per code path and constraints
are per database. Six months from now there is an admin panel, a bulk import and a migration script,
and the constraint is the only one of the three that was there first.

**Name your constraints.** The error message quotes the name, and \`due_after_borrow\` tells you
what happened where \`loans_check1\` does not.

**Constraints as documentation.** Somebody reading the schema learns the rules of the business:
that a loan must be returned after it was borrowed, that emails are unique, that a status must be
one of four values. That is often the clearest statement of those rules anywhere in the system.

**Adding a constraint to an existing table fails if the data already violates it** — which is the
constraint doing its job, and the moment you discover how much bad data has quietly accumulated.
Find the offending rows, decide what they should be, fix them, then add the constraint.

**What constraints do not replace:** they are the last line, not the first. A user still needs a
clear message rather than a database error, so the application validates too — for the message, not
for the guarantee.`,
    mcqs: [
      mcq('Constraints are preferred to application validation alone because:',
        [['Validation is per code path; a constraint covers every one', true],
          ['Constraints produce better error messages', false],
          ['Application validation cannot check uniqueness', false],
          ['Constraints run faster than code', false]],
        'The admin panel, the import and the migration script all come later.'),
      mcq('`CHECK (due_on > borrowed_on)` encodes:',
        [['A business rule, enforced whatever the code does', true],
          ['An index on both date columns', false],
          ['A default value for due_on', false],
          ['A foreign key between the two columns', false]],
        'It is also often the clearest statement of that rule anywhere in the system.'),
      mcq('Naming a constraint `due_after_borrow` matters because:',
        [['The error message quotes the name', true],
          ['Unnamed constraints cannot be dropped', false],
          ['It makes the check run faster', false],
          ['Names are required for CHECK constraints', false]],
        'loans_check1 tells whoever hits it nothing at all.'),
      mcq('Adding a constraint that the existing data violates:',
        [['Fails, revealing bad data that had accumulated', true],
          ['Succeeds, applying only to new rows', false],
          ['Deletes the offending rows automatically', false],
          ['Is silently ignored by the database', false]],
        'Find the rows, decide what they should be, fix them, then add it.'),
    ],
    checkpoint: [
      mcq('Applications still validate input even with constraints in place because:',
        [['A user needs a clear message, not a database error', true],
          ['Constraints do not cover required fields', false],
          ['Database checks run only on commit', false],
          ['Constraints cannot be trusted across versions', false]],
        'The application validates for the message; the database guarantees the rule.'),
      mcq('`returned_on DATE` with no NOT NULL expresses:',
        [['That the loan may not have been returned yet', true],
          ['That the column is not used by the application', false],
          ['That returns are recorded in another table', false],
          ['That the date is optional to record when returning', false]],
        'Nullability is a design decision, not an oversight.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_INDEXES',
    notes: `An index is a sorted structure the database keeps beside a table so it can find rows
without reading all of them. It is the difference between a query that takes two seconds and one
that takes two milliseconds — and it is not free.

    CREATE INDEX idx_loans_member ON loans(member_id);
    CREATE INDEX idx_orders_created ON orders(created_at);

**Without an index**, finding one row in a million means reading a million rows: a *sequential
scan*. With one, the database jumps straight there.

**What to index:**

- Columns in \`WHERE\` clauses that run often
- Foreign keys — almost always worth it, and frequently forgotten
- Columns you \`ORDER BY\` on large tables
- Columns in \`JOIN\` conditions

**What it costs.** Every \`INSERT\`, \`UPDATE\` and \`DELETE\` must update every index on the table,
and each index takes disk space. A table with twelve indexes is slow to write to, and most of the
twelve are usually unused.

**Primary keys and UNIQUE constraints are indexed automatically.** Foreign keys are **not**, in
PostgreSQL and MySQL — which surprises people, and is the single most commonly missing index in a
real schema.

**A composite index has an order, and the order matters:**

    CREATE INDEX idx_orders_cust_date ON orders(customer_id, created_at);

That helps a query filtering on \`customer_id\` alone, or on both. It does **not** help one
filtering on \`created_at\` alone — like a phone book sorted by surname then first name, which is
useless for finding everybody called Asha.

**An index cannot be used if you wrap the column in a function:**

    WHERE LOWER(email) = 'asha@mail.com'      -- the index on email is not used
    CREATE INDEX idx_email_lower ON customers(LOWER(email));   -- unless you index the expression

**Measure, do not guess:**

    EXPLAIN ANALYZE SELECT * FROM loans WHERE member_id = 42;

A "Seq Scan" on a large table where you filtered on an indexed column means the index is not being
used — usually because of a function, a type mismatch, or a filter that matches most of the table
anyway. On a small table a sequential scan is genuinely faster, and the planner is right.`,
    mcqs: [
      mcq('The cost of an index is paid:',
        [['On every insert, update and delete, plus disk space', true],
          ['Once, when the index is created', false],
          ['Only on queries that do not use it', false],
          ['Only when the table is rebuilt', false]],
        'A table with twelve indexes is slow to write to, and most are usually unused.'),
      mcq('In PostgreSQL and MySQL, foreign key columns are:',
        [['Not indexed automatically, and commonly forgotten', true],
          ['Indexed automatically with the constraint', false],
          ['Indexed only if declared NOT NULL', false],
          ['Indexed as part of the primary key index', false]],
        'The single most commonly missing index in a real schema.'),
      mcq('An index on `(customer_id, created_at)` does not help a query filtering on:',
        [['created_at alone', true],
          ['customer_id alone', false],
          ['both columns together', false],
          ['customer_id with an ORDER BY created_at', false]],
        'Like a phone book sorted by surname: useless for finding everybody called Asha.'),
      mcq('`WHERE LOWER(email) = \'asha@mail.com\'` ignores an index on email because:',
        [['The stored values are not what is being compared', true],
          ['Text columns cannot use indexes for equality', false],
          ['LOWER prevents the planner from running', false],
          ['The comparison value is not indexed', false]],
        'Index the expression itself if that is how you query it.'),
    ],
    checkpoint: [
      mcq('A sequential scan on a small table is:',
        [['Often genuinely faster, and the planner is right', true],
          ['Always a sign of an index that is missing', false],
          ['A sign that statistics are stale', false],
          ['Prevented by adding any index', false]],
        'Reading a hundred rows beats jumping through an index to reach them.'),
      mcq('Before adding an index you should:',
        [['Measure with EXPLAIN ANALYZE', true],
          ['Add it to every filtered column first', false],
          ['Check the table has fewer than ten indexes', false],
          ['Rebuild the table statistics', false]],
        'Guessing at indexes produces the twelve-index table nobody can write to.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_TRANSACTIONS',
    notes: `Some operations are only correct if all of them happen. A transaction is how you say so.

    BEGIN;
      UPDATE accounts SET balance = balance - 5000 WHERE id = 1;
      UPDATE accounts SET balance = balance + 5000 WHERE id = 2;
    COMMIT;

If the process dies between those two statements without a transaction, five thousand rupees have
left one account and arrived nowhere. Inside a transaction, neither happened.

**From code**, with the rollback automatic on an exception:

    with conn:                  # commits on success, rolls back on exception
        with conn.cursor() as cur:
            cur.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, src))
            cur.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, dst))

**ACID**, which you will be asked about:

- **Atomicity** — all of it or none of it
- **Consistency** — constraints hold at the end
- **Isolation** — concurrent transactions do not see each other's half-finished work
- **Durability** — once committed, it survives a crash

**Where a second year meets this for real: two people at once.** Two requests read a stock count of
1, both decide there is enough, and both sell it. The read-then-write pattern is the bug, and the
fix is to let the database do the arithmetic, or to lock:

    UPDATE stock SET count = count - 1 WHERE product_id = %s AND count > 0;
    -- zero rows affected means somebody else got there first

    SELECT count FROM stock WHERE product_id = %s FOR UPDATE;   -- lock until commit

**Keep transactions short.** A transaction holds locks until it ends, so calling an external API in
the middle of one blocks everybody else for as long as that call takes. Do the slow work first,
then open the transaction.

**A deadlock** is two transactions each holding what the other wants. Databases detect it and kill
one, which your code must be ready to retry. Updating rows in a consistent order across the
application makes them rare.

**Not everything needs one.** A single statement is already atomic. Transactions are for the cases
where two or more changes must stand or fall together.`,
    mcqs: [
      mcq('Atomicity guarantees that:',
        [['Either all statements take effect, or none do', true],
          ['Concurrent transactions cannot see each other', false],
          ['Committed data survives a crash', false],
          ['Constraints are checked on every statement', false]],
        'The half-finished transfer is the classic example.'),
      mcq('Two requests both selling the last item in stock is caused by:',
        [['Reading the count, then writing based on it', true],
          ['A missing index on the stock table', false],
          ['A transaction held open too long', false],
          ['A foreign key without a constraint', false]],
        'Let the database do the arithmetic, or lock the row.'),
      mcq('`UPDATE stock SET count = count - 1 WHERE product_id = %s AND count > 0` is safe because:',
        [['The check and the change happen in one statement', true],
          ['It runs inside an implicit transaction', false],
          ['It locks the whole table while running', false],
          ['It cannot produce a negative value by type', false]],
        'Zero rows affected tells you somebody else got there first.'),
      mcq('Calling an external API inside a transaction is a problem because:',
        [['Locks are held for as long as the call takes', true],
          ['The API response cannot be rolled back', false],
          ['Transactions time out after one second', false],
          ['The database cannot make network calls', false]],
        'Do the slow work first, then open the transaction.'),
    ],
    checkpoint: [
      mcq('A deadlock is resolved by the database:',
        [['Killing one transaction, which the code should retry', true],
          ['Waiting until one of them eventually commits', false],
          ['Rolling back both transactions', false],
          ['Escalating to a table lock', false]],
        'Updating rows in a consistent order makes deadlocks rare.'),
      mcq('A single UPDATE statement needs no explicit transaction because:',
        [['It is already atomic on its own', true],
          ['Updates cannot fail partway through', false],
          ['The database retries it automatically', false],
          ['Constraints guarantee its correctness', false]],
        'Transactions are for two or more changes that must stand or fall together.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_DEBUGGING',
    notes: `Schema problems do not crash. They accumulate, quietly, and are discovered months later
by somebody asking a question the data cannot answer.

**The symptoms, and what each one means:**

**1. The same fact stored in two places, disagreeing.** A customer name on both \`customers\` and
\`orders\`, and they differ. A normalisation failure. Find how many rows disagree first — it tells
you how long it has been happening.

    SELECT COUNT(*) FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.customer_name <> c.name;

**2. Orphaned rows.** Loans pointing at books that no longer exist — a missing foreign key, and
every query joining those tables has been silently dropping rows since.

    SELECT COUNT(*) FROM loans l LEFT JOIN books b ON b.id = l.book_id WHERE b.id IS NULL;

**3. Impossible values.** Negative quantities, due dates before the loan, a status nobody recognises.
A missing CHECK constraint. Count them, decide what they should have been, fix, then add the
constraint.

**4. Duplicates that should be impossible.** Two members with one email — a missing UNIQUE.

    SELECT email, COUNT(*) FROM members GROUP BY email HAVING COUNT(*) > 1;

**5. A column that is NULL for most rows.** Usually a sign that one table is really two: half the
rows are one kind of thing and half another.

**6. Columns named \`field1\`, \`extra\`, \`notes2\`.** Something was added without a design decision, and
whatever is in them is now load-bearing.

**The diagnostic routine:** for each relationship, count the orphans. For each column that should be
unique, count the duplicates. For each rule the business believes, write it as a query and count the
violations. A schema that passes all three is in better shape than most production systems.

**Fixing is a migration, and migrations are one-way.** Take a backup, write the fix as a script
rather than by hand, run it on a copy first, and add the constraint that prevents the problem
returning — otherwise you will be doing this again next year.`,
    mcqs: [
      mcq('The same fact stored in two places and disagreeing indicates:',
        [['A normalisation failure', true],
          ['A missing index', false],
          ['A transaction that was not committed', false],
          ['An incorrect join in the application', false]],
        'Count the disagreeing rows first: it tells you how long it has been happening.'),
      mcq('Orphaned child rows mean that:',
        [['A foreign key constraint is missing', true],
          ['The parent table needs an index', false],
          ['A transaction rolled back partially', false],
          ['The join was written as LEFT rather than INNER', false]],
        'Every query joining those tables has been silently dropping rows.'),
      mcq('A column that is NULL for most rows often means:',
        [['One table is really two kinds of thing', true],
          ['The column should be indexed', false],
          ['The default value was never set', false],
          ['The application stopped writing it', false]],
        'Half the rows are one sort of record and half another.'),
      mcq('After fixing bad data, adding the constraint matters because:',
        [['Otherwise the same problem returns', true],
          ['The fix cannot be committed without it', false],
          ['Constraints repair existing rows', false],
          ['It speeds up the affected queries', false]],
        'Otherwise you will be doing this again next year.'),
    ],
    checkpoint: [
      mcq('The diagnostic routine for a suspect schema counts:',
        [['Orphans, duplicates, and violations of each business rule', true],
          ['Rows, columns and indexes in each table', false],
          ['Slow queries in the last day', false],
          ['NULLs in every column', false]],
        'A schema passing all three is in better shape than most production systems.'),
      mcq('Columns named `field1` and `notes2` suggest that:',
        [['Something was added without a design decision', true],
          ['The table has been normalised too far', false],
          ['The schema was generated by a tool', false],
          ['The columns are no longer used', false]],
        'And whatever is in them is now load-bearing.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_PRACTICE',
    notes: `No new ideas. Enough schemas designed that the shapes become automatic.

**Design each of these from the brief alone**, then critique your own design against the questions
below:

1. **A clinic** — patients, doctors, appointments, prescriptions. A prescription belongs to an
   appointment; a patient may see several doctors.
2. **A school** — students, courses, terms, enrolments, grades. A student takes a course in a term
   and may repeat it.
3. **A food delivery service** — restaurants, menus, orders, order items, drivers, deliveries. Menu
   prices change; past orders must not.
4. **A version-controlled document system** — documents, versions, authors, comments. A comment is
   on a particular version.
5. **A booking system for a co-working space** — members, rooms, bookings, recurring bookings.

**For each, produce:** the tables with columns and types, the keys, the constraints, and three
queries the design must support.

**Then interrogate it:**

- Which facts are stored more than once, and why?
- What happens when a price, a name or an address changes — does history stay correct?
- What can be deleted, and what happens to its children?
- Which columns are nullable, and what does NULL mean for each?
- Which business rule is not enforced by any constraint?
- Which question would be impossible to answer with this design?

**The recurring bookings case is deliberately hard.** Storing every occurrence, or storing a rule
and generating them, are both defensible, and the trade-off — editing one occurrence versus querying
a date range — is the actual lesson. Write down which you chose and why.

**The mistake this set exposes:** designing for the data you have rather than the questions you will
be asked. Write the three queries first, and let them argue with the schema.`,
    mcqs: [
      mcq('"Menu prices change; past orders must not" requires:',
        [['The price paid stored on the order line', true],
          ['A timestamp on the menu table', false],
          ['Prices stored as text to prevent rounding', false],
          ['A separate table for historical prices only', false]],
        'The price paid is a fact about the order, not about the product today.'),
      mcq('The hardest part of the recurring booking design is:',
        [['Whether to store occurrences or a rule that generates them', true],
          ['Choosing between date and timestamp types', false],
          ['Whether rooms need their own table', false],
          ['Indexing the bookings table correctly', false]],
        'Editing one occurrence versus querying a range is the real trade-off.'),
      mcq('A comment being "on a particular version" means the foreign key points at:',
        [['The version, not the document', true],
          ['The document, with a version column', false],
          ['Both, through a join table', false],
          ['The author, who links to the version', false]],
        'What the fact is about decides where the key goes.'),
      mcq('Writing the three supported queries before finalising a schema helps because:',
        [['The questions argue with the design while it is still cheap', true],
          ['Queries determine the index strategy', false],
          ['It documents the schema for other developers', false],
          ['Table names follow from the queries', false]],
        'Designing for the data you have rather than the questions you will be asked is the mistake.'),
      mcq('"Which business rule is not enforced by any constraint?" is asked to find:',
        [['Rules that exist only in somebody\'s head or one code path', true],
          ['Constraints that slow down writes', false],
          ['Columns that should be indexed', false],
          ['Tables that need normalising further', false]],
        'Those are the rules the data will eventually violate.'),
    ],
    checkpoint: [
      mcq('"What does NULL mean in this column?" should have:',
        [['A single, documented answer per column', true],
          ['The same answer across the whole schema', false],
          ['No answer, since NULL means unknown', false],
          ['An answer only for foreign key columns', false]],
        'Not yet returned, not applicable and not recorded are three different things.'),
      mcq('Critiquing your own design with "what happens when a name changes?" tests:',
        [['Whether history remains correct after an update', true],
          ['Whether the column is indexed', false],
          ['Whether the name is unique', false],
          ['Whether the update itself is fast enough', false]],
        'It is the question that finds most normalisation errors.'),
    ],
  },

  {
    unitCode: 'T2_DB_DESIGN_MINI_PROJECT',
    notes: `A schema designed from a brief, built, loaded with realistic data, and defended against
the questions it will actually be asked.

**Why a brief rather than a diagram.** Real design starts from a description written by somebody who
is not thinking about databases, containing ambiguities they did not notice. Finding those and
asking about them is half the job.

**What is being assessed:** that the schema stores each fact once, that history survives changes,
that the rules are enforced by constraints rather than hope, and that you can explain a trade-off you
chose rather than one you stumbled into.

**Build it in this order:**

1. **Read the brief, list the ambiguities**, and write down the interpretation you chose for each.
2. **Entities, attributes, relationships** — on paper.
3. **Write the queries the design must support**, before the tables exist.
4. **Create the schema** with keys, constraints and the indexes you can justify.
5. **Load realistic data** — a few thousand rows, including awkward cases.
6. **Run the queries**, and the integrity checks.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Schema You Can Defend',
      description: 'Design, build and load a database from an ambiguous brief, enforce its rules with constraints, and defend the trade-offs you chose.',
      instructions: `**The brief**

Choose one, or bring your own of similar size:

- **A clinic**: patients, doctors, appointments, prescriptions, repeat prescriptions. A doctor works
  at more than one branch. A prescription may be repeated for six months.
- **A course platform**: students, courses, cohorts, enrolments, assessments, grades. A student may
  repeat a course in a later cohort, and the old grade must remain.
- **A delivery service**: restaurants, menus, orders, items, drivers, deliveries, ratings. Menu
  prices change weekly. A driver may carry several orders on one trip.

**Requirements**

1. **At least six tables**, including one many-to-many with its own attributes.
2. **A written list of the ambiguities** in the brief and the interpretation you chose for each.
3. **Constraints carrying the rules**: NOT NULL, UNIQUE, CHECK and foreign keys with a deliberate
   ON DELETE choice per relationship, explained.
4. **History that survives change**: at least one fact whose past value must not move when the
   present one does.
5. **Realistic data**, a few thousand rows, including awkward cases: cancelled, missing, repeated,
   deleted parents.
6. **Six queries the design must support**, written before the schema and passing after.
7. **Three integrity checks** that return zero rows on a healthy database.
8. **Indexes you can justify**, with the measurement that justified each.

**What to submit**

1. The schema as a \`.sql\` file, and the loading script.
2. The **ambiguity list**, with your interpretation and why.
3. The **query set**, with output.
4. The **integrity checks**, with output showing zero rows.
5. A **design defence** (400–500 words): the hardest modelling decision and what you traded; one
   thing you would design differently at ten times the size; the business rule you could not enforce
   with a constraint and what protects it instead.

**Constraints**

- No single table carrying two kinds of thing.
- No fact stored twice without a written justification.
- Every relationship has a deliberate ON DELETE decision.

**Where the marks are.** The ambiguity list and the design defence. Anybody can produce tables from a
diagram; recognising what the brief did not say, and choosing deliberately, is what separates a
designer from a typist.`,
      rubric: [
        {
          criterion: 'Schema quality',
          description: 'Six or more tables, each fact stored once, a many-to-many with its own attributes, sensible types and nullability with meaning.',
          maxPoints: 30,
        },
        {
          criterion: 'Rules enforced',
          description: 'Constraints carrying real business rules, named; deliberate ON DELETE per relationship; integrity checks returning zero rows.',
          maxPoints: 25,
        },
        {
          criterion: 'History and correctness',
          description: 'Past values survive present changes; awkward data loaded; the six queries answer their questions exactly.',
          maxPoints: 20,
        },
        {
          criterion: 'Ambiguity handling',
          description: 'The brief interrogated rather than transcribed, with interpretations chosen and justified.',
          maxPoints: 15,
        },
        {
          criterion: 'Design defence',
          description: 'A real trade-off explained, a scaling limitation identified, and honesty about the rule no constraint could carry.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
