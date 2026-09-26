/**
 * T3_QUERY_PERF, T3_TRANSACTIONS_INTEGRITY and T3_CACHING_NOSQL — fifteen units. Year 3.
 * Finishes S07.
 *
 * ── THE THREE THINGS A GRADUATE DOES NOT KNOW ABOUT DATABASES ─────────────────────────────
 *
 * They can write a query. They cannot read a plan, they have never thought about two requests
 * arriving at once, and they believe a cache is free. Those are the three units that lead
 * their topics, and the rest of each topic supports them.
 *
 * READING_A_PLAN is first because it converts database performance from folklore into
 * measurement. Without it, a student's model of "slow query" is a feeling and their fix is to
 * add indexes until it improves, which is how a table ends up with eleven of them and a write
 * path nobody can explain.
 *
 * TWO_THINGS_AT_ONCE is the one that produces real financial damage. Read-modify-write across
 * two requests is the shape of every lost update ever shipped, and a graduate has literally
 * never run their code concurrently — every test they have written ran alone.
 *
 * The caching topic is written against the belief that caching is a free speed-up. The
 * invalidation unit is the point: putting something in a cache is easy and deciding when it
 * stops being true is the entire problem, and a student who has not been told this ships a
 * stale price.
 *
 * Attribution: QUERY_PERF defaults to QUERY_OPTIMIZATION with INDEXES_FOR_A_REASON on
 * DB_INDEXING; TRANSACTIONS defaults to DB_TRANSACTIONS with LET_THE_DATABASE_ENFORCE on
 * DB_DESIGN; CACHING_NOSQL defaults to CACHING with NOSQL_TRADEOFFS on NOSQL_CONCEPTS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DATA_BUNDLES: PilotBundle[] = [
  /* ══ T3_QUERY_PERF ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_QUERY_PERF_READING_A_PLAN',
    notes: `A query plan is the database telling you what it is about to do. It is the only
honest source on why a query is slow, and almost nobody reads one.

    EXPLAIN ANALYZE SELECT ... ;

**\`EXPLAIN\` alone gives the estimate. \`EXPLAIN ANALYZE\` runs it and gives the reality**,
and the gap between the two is one of the most useful things in the output.

## What to look at, in order

**1. The row counts, estimated against actual.** This is the first thing to check and the
thing beginners skip.

    Seq Scan on orders  (rows=100) (actual rows=2400000)

The planner thought it would get a hundred rows and got 2.4 million. **Every decision it made
downstream was based on that wrong number** — it chose a nested loop because a hundred
iterations is nothing, and it is now doing 2.4 million of them. The fix here is not an index,
it is statistics: run \`ANALYZE\`, and check whether autovacuum is keeping up.

**2. Scans.** \`Seq Scan\` reads the whole table. That is correct and fast for a small table or
when you genuinely want most rows; on a large table with a selective filter it is the problem.
\`Index Scan\` uses an index. \`Bitmap Heap Scan\` sits between the two and usually means the
index matched a lot of rows.

**3. Joins.** \`Nested Loop\` runs the inner side once per outer row — excellent when the outer
side is tiny, catastrophic otherwise. \`Hash Join\` builds a hash of one side; good for large
unsorted inputs. \`Merge Join\` needs both sides sorted.

**4. The time.** Each node shows its own cost. **Read from the inside out** — the innermost
node runs first, and the expensive one is usually a leaf rather than the top line.

**5. Sorts and their memory.** A \`Sort\` with \`Disk\` in it has spilled out of memory, and
that is often a bigger cost than the scan above it.

## The three patterns that cover most slow queries

**A sequential scan on a large table with a selective WHERE.** The index is missing, or the
query is written so the index cannot be used.

**A nested loop with a large outer side.** Usually a consequence of the bad row estimate in
point 1.

**Rows being discarded late.** \`Rows Removed by Filter: 2,399,000\`. You read 2.4 million rows
to return a thousand. Filter earlier, or index the filtered column.

## What makes an index unusable

These are the ones that catch people, and the query looks perfectly reasonable in each case:

    WHERE lower(email) = 'x'        -- function on the column
    WHERE created_at::date = '...'  -- a cast is a function
    WHERE name LIKE '%smith'        -- leading wildcard
    WHERE status != 'done'          -- negation matches most rows

The first two are fixable with an **expression index** on exactly that expression. The third
needs a different kind of index entirely. The fourth is usually not worth indexing at all.

## The habit

**Look at the plan before changing anything.** The instinct is to add an index and see if it
helps, and that is guessing — it is the same fiddling the debugging topic warns about, applied
to a database.

**And measure on realistic data.** A plan on a thousand rows tells you almost nothing about the
plan on ten million, because the planner will choose differently — often correctly.`,
    mcqs: [
      mcq('The first thing to check in a query plan is:',
        [['Estimated rows against actual rows', true],
          ['Whether a sequential scan appears', false],
          ['The total execution time reported', false],
          ['Which join strategy was chosen', false]],
        'A wrong estimate poisons every decision the planner made downstream.'),
      mcq('The planner expected 100 rows and got 2.4 million. The fix is usually:',
        [['Statistics — run ANALYZE and check autovacuum', true],
          ['An index on the filtered column', false],
          ['Rewriting the join as a subquery', false],
          ['Increasing the memory available for sorts', false]],
        'It chose a nested loop because 100 iterations is nothing.'),
      mcq('A nested loop join is catastrophic when:',
        [['The outer side is large', true],
          ['Both sides are already sorted', false],
          ['The inner side has no index', false],
          ['The join produces few output rows', false]],
        'It runs the inner side once per outer row.'),
      mcq('`WHERE lower(email) = \'x\'` cannot use a plain index on email because:',
        [['The function changes the value being compared', true],
          ['String comparison is case-sensitive by default', false],
          ['The index stores only the original casing', false],
          ['Equality on text is not indexable', false]],
        'An expression index on exactly that expression is the fix.'),
    ],
    checkpoint: [
      mcq('`Rows Removed by Filter: 2,399,000` means:',
        [['You read 2.4 million rows to return a thousand of them', true],
          ['The filter was applied before the scan ran', false],
          ['The index excluded those rows correctly', false],
          ['The query returned fewer rows than requested', false]],
        'Filter earlier, or index the filtered column.'),
      mcq('A plan node should be read:',
        [['From the inside out, since the innermost runs first', true],
          ['From the top down, following the query text', false],
          ['In the order the tables appear in the FROM', false],
          ['By total cost, highest first', false]],
        'The expensive node is usually a leaf rather than the top line.'),
      mcq('Testing a plan on a thousand rows is misleading because:',
        [['The planner chooses differently at ten million, often correctly', true],
          ['Small tables are always scanned sequentially', false],
          ['Indexes are not built until the table is large', false],
          ['Timings at that size are dominated by noise', false]],
        'Which is why realistic data matters more than a realistic query.'),
    ],
  },

  {
    unitCode: 'T3_QUERY_PERF_INDEXES_FOR_A_REASON',
    notes: `An index is a **trade: faster reads for slower writes and more disk.** Every index
is paid for on every insert, update and delete of that table, forever.

Students learn "add an index" as the fix for slow and stop there. The question is always *which
index, and is this query worth it.*

## What an index is

A sorted structure — usually a B-tree, from the trees topic — mapping values to row locations.
The database can binary-search it instead of reading every row. That is the entire mechanism.

## Which column

**The one in your WHERE clause, with high selectivity.** Selectivity is what proportion of rows
a typical value matches.

- \`email\` — nearly unique. Excellent index.
- \`status\` with four values — each matches 25% of the table. Usually **not worth it**: reading
  a quarter of a table through an index is often slower than scanning it, because index lookups
  are random access and a scan is sequential.
- \`is_deleted\` where 99% are false — bad as a plain index, but a **partial index**
  (\`WHERE is_deleted = false\`) is excellent, because it only holds the rows you actually
  query.

## Composite indexes and the order that matters

An index on \`(customer_id, created_at)\` can serve:

- \`WHERE customer_id = 5\` ✓
- \`WHERE customer_id = 5 AND created_at > '...'\` ✓
- \`WHERE created_at > '...'\` ✗ — **it cannot**

**The leftmost-prefix rule.** The index is sorted by the first column, then the second within
it — like a phone book by surname then first name. You can find every Patel, and every Patel
called Asha. You cannot find every Asha.

**So put the equality column first and the range column second.** Getting this backwards is the
commonest composite-index mistake.

## What it costs

**Writes.** Every insert updates every index on the table. A table with eight indexes does nine
writes per insert. This is why the write path on a heavily-indexed table is mysteriously slow,
and why nobody connects the two.

**Disk.** An index can be a substantial fraction of the table's size.

**Memory.** Indexes compete for the same cache as the data. A rarely-used index evicts pages
that a common query needed.

**A wrong choice.** A misleading index can be chosen by the planner over a better path.

## The ones to remove

**Unused indexes** — most databases track usage; check it. An index nobody reads is pure cost.

**Duplicate indexes.** \`(a)\` is redundant if \`(a, b)\` exists, by the leftmost-prefix rule.
This happens constantly, because two people added an index for two different queries.

## The rule

**Add an index for a specific query you have measured, and state the cost.** Not "this column
looks like it gets searched". Measure the query, add the index, measure again, and check the
write path did not fall off a cliff.

**And do it on realistic data.** On ten thousand rows nothing needs an index; on ten million,
the same query is a different problem entirely.`,
    mcqs: [
      mcq('An index on a status column with four values is usually not worth it because:',
        [['Reading a quarter of a table via random access beats a scan rarely', true],
          ['Small value sets cannot be indexed efficiently', false],
          ['The index would be larger than the table', false],
          ['The planner ignores low-cardinality indexes', false]],
        'Index lookups are random access; a sequential scan is sequential.'),
      mcq('An index on `(customer_id, created_at)` cannot serve:',
        [['A query filtering on created_at alone', true],
          ['A query filtering on customer_id alone', false],
          ['A query filtering on both columns', false],
          ['A query sorting by customer_id', false]],
        'Leftmost prefix: you can find every Patel, not every Asha.'),
      mcq('In a composite index, you should put:',
        [['The equality column first, the range column second', true],
          ['The most selective column first, always', false],
          ['The range column first, so it can be scanned', false],
          ['The columns in the order they appear in the query', false]],
        'Getting this backwards is the commonest composite-index mistake.'),
      mcq('A table with eight indexes does how many writes per insert?',
        [['Nine', true], ['Eight', false], ['Two', false], ['One', false]],
        'The row plus every index, which is why the write path is mysteriously slow.'),
    ],
    checkpoint: [
      mcq('A partial index is a good fit for:',
        [['A column where 99% of rows share one value', true],
          ['A column with nearly unique values', false],
          ['A column used in every join', false],
          ['A column that is frequently updated', false]],
        'It holds only the rows you actually query, rather than all of them.'),
      mcq('An index on `(a)` when `(a, b)` exists is:',
        [['Redundant, by the leftmost-prefix rule', true],
          ['Useful for queries that only need a', false],
          ['Faster than the composite for single-column lookups', false],
          ['Required if a is queried without b', false]],
        'And it happens constantly, because two people added two indexes.'),
      mcq('After adding an index you should also measure:',
        [['The write path', true],
          ['The disk space freed', false],
          ['The plan for unrelated queries', false],
          ['The memory used by the connection pool', false]],
        'The trade is faster reads for slower writes, so check both sides of it.'),
    ],
  },

  {
    unitCode: 'T3_QUERY_PERF_MEASURING_THE_FIX',
    notes: `You added an index. The plan changed. **That is not the same as being faster**, and
the number of optimisations that make nothing better is higher than anybody expects.

## What "faster" has to mean

**Before and after, on realistic data, measured the same way.**

Each of those three is load-bearing:

- **Before and after** — you need the before. Measuring only afterwards gives you a number with
  nothing to compare it to, and this is the step people skip.
- **Realistic data** — a query that is fast on 10,000 rows may be catastrophic on 10 million,
  and the planner may have chosen a different strategy at each size.
- **The same way** — same machine, same cache state, same conditions. A "fix" that is really a
  warm cache is very easy to ship.

## The caches that lie to you

Run a query twice and the second is faster. That is the **buffer cache**, not your change.

- Measure several times and take the median, discarding the first.
- Or clear the cache between runs, where you can.
- Or compare like with like — first run against first run.

**Some databases also cache the plan.** A prepared statement may keep using the old plan until
reconnected, so your index appears to do nothing at all.

## Measure the right thing

**The query, in isolation.** \`EXPLAIN ANALYZE\` gives you the database's own timing, without
network or serialisation.

**The request, end to end.** The query went from 200ms to 20ms; the request went from 2.1s to
1.9s. **You optimised 10% of the problem**, and the other 1.9 seconds is somewhere you have not
looked.

Both numbers matter and the second one decides whether the work was worth doing.

**The write path.** Did inserts slow down? On a write-heavy table an index that saves 150ms on
a read run once a minute and costs 2ms on a write run a thousand times a minute is a net loss —
and it will never show up in the read-focused measurement that justified it.

## The N+1, which is the commonest real problem

    for order in orders:            # 1 query
        print(order.customer.name)  # 1 query each — 500 more

**Symptom:** a page that is slow in proportion to how much is on it, with no single slow query
anywhere. Each query takes 2ms and there are five hundred of them.

**Fix:** one query with a join, or your ORM's eager loading.

**This is usually a much bigger win than any index**, and it is invisible to plan-reading
because every individual plan is fine. Count the queries per request — most frameworks can log
it, and the count is the diagnosis.

## What to report

> "The customer orders query on the dashboard: 2,400ms → 35ms on a copy of production data,
> median of ten runs. Page load 3.1s → 0.8s. Insert into orders went from 1.2ms to 1.4ms. Index
> is 340MB."

Both directions, a real dataset, and the cost stated. **That is what makes it a result rather
than a claim** — and it is the same standard the algorithms module applied to complexity
claims.`,
    mcqs: [
      mcq('The second run of a query being faster usually means:',
        [['The buffer cache is warm', true],
          ['The plan was recompiled more efficiently', false],
          ['The index finished building', false],
          ['The connection was already established', false]],
        'Take the median of several runs, discarding the first.'),
      mcq('A query going 200ms → 20ms while the request goes 2.1s → 1.9s means:',
        [['You optimised about 10% of the problem', true],
          ['The measurement was taken incorrectly', false],
          ['The remaining time is network latency', false],
          ['The improvement will compound under load', false]],
        'And the other 1.9 seconds is somewhere you have not looked.'),
      mcq('An N+1 problem is invisible to plan-reading because:',
        [['Each individual plan is perfectly fine', true],
          ['The queries are generated by the ORM', false],
          ['The plans are cached after the first', false],
          ['The queries run too quickly to log', false]],
        'Count the queries per request; the count is the diagnosis.'),
      mcq('An index saving 150ms once a minute and costing 2ms a thousand times a minute is:',
        [['A net loss, invisible to the measurement that justified it', true],
          ['A net gain, since reads matter more', false],
          ['Roughly neutral over a day', false],
          ['Worth keeping if the read is user-facing', false]],
        'Which is why the write path is part of the measurement.'),
    ],
    checkpoint: [
      mcq('A prepared statement may hide an index’s effect because:',
        [['The old plan is reused until reconnection', true],
          ['Prepared statements bypass the index', false],
          ['The parameters are cached with the plan', false],
          ['The statement is compiled before the index exists', false]],
        'Your index then appears to do nothing at all.'),
      mcq('The three load-bearing parts of "faster" are before and after, realistic data, and:',
        [['Measured the same way', true],
          ['Measured more than once', false],
          ['Measured in production', false],
          ['Measured end to end', false]],
        'Same machine, same cache state — a warm cache is very easy to ship as a fix.'),
      mcq('The step people most often skip is:',
        [['Taking the before measurement', true],
          ['Checking the plan after the change', false],
          ['Testing on a realistic dataset', false],
          ['Reporting the size of the index', false]],
        'And a number with nothing to compare it to is not a result.'),
    ],
  },

  {
    unitCode: 'T3_QUERY_PERF_DEBUGGING',
    notes: `Five database performance problems and the symptom that identifies each.

## 1. The N+1

**Symptom:** the page is slow in proportion to the number of items on it. No single query is
slow. **Diagnosis:** count the queries per request. Five hundred is the answer. **Fix:** a join
or eager loading. **Why it hides:** every plan is fine, so plan-reading finds nothing.

## 2. The index that exists and is not used

**Symptom:** you added it, the plan still shows a sequential scan. Four usual causes:

- **A function or cast on the column** — \`WHERE date(created_at) = ...\`. Use an expression
  index.
- **Stale statistics** — run \`ANALYZE\`.
- **Type mismatch** — an integer column compared with a string, which silently prevents index
  use in some databases and is very hard to spot.
- **The planner is right.** On a small table or an unselective filter, the scan genuinely is
  faster. Check the actual timings before arguing with it.

## 3. The lock nobody can see

**Symptom:** queries that are normally fast occasionally take thirty seconds, with no pattern.
**Cause:** something else holds a lock — a long transaction, a migration, a batch job. **Fix:**
query the database's lock view while it is happening. **The tell:** the slowness is bimodal —
fast or very slow, nothing between — which is the signature of waiting rather than working.

## 4. The query that got slower on its own

**Symptom:** it was fine for six months and is now slow, with no code change. **Causes, in
order of likelihood:** the table grew past the point where the planner's choice flips; the
statistics went stale; the data distribution changed — a customer who used to have 10 orders
now has 400,000, and the plan chosen for the average customer is wrong for them.

**That last one is worth remembering.** The plan is chosen for the typical case; the outlier
customer gets the wrong plan and only they are slow.

## 5. Connection pool exhaustion

**Symptom:** everything is slow, all at once, and the queries are all fast individually.
**Cause:** requests are queueing for a connection. **Common reason:** a long-running
transaction holding a connection, or a pool sized for a load you no longer have. **Tell:** time
spent *waiting* for a connection, which most pools can report and almost nobody looks at.

## The order to work through

1. **Count the queries** per request. N+1 is the most common by a distance.
2. **Find the slowest query** — the slow query log, if it is on.
3. **Read its plan.**
4. **Check for waiting** — locks and pool. Bimodal timings mean waiting.
5. **Only then** consider indexes and rewrites.

Most people start at 5, which is why the eleven-index table exists.`,
    mcqs: [
      mcq('The signature of waiting rather than working is:',
        [['Bimodal timings — fast or very slow, nothing between', true],
          ['Timings that grow steadily with the data', false],
          ['Timings that vary with the time of day', false],
          ['Timings that differ between replicas', false]],
        'Which points at a lock or a connection pool rather than the query.'),
      mcq('A query fine for six months and now slow, with no code change, is most likely:',
        [['The table grew past where the planner’s choice flips', true],
          ['An index that was dropped by a migration', false],
          ['A change in the database version', false],
          ['Increased load from other queries', false]],
        'Or stale statistics, or a distribution change — but growth is first.'),
      mcq('One customer being slow while everyone else is fine suggests:',
        [['The plan chosen for the typical case is wrong for them', true],
          ['Their data is corrupted in some way', false],
          ['They are hitting a different replica', false],
          ['Their queries are more complex', false]],
        'A customer who used to have 10 orders now has 400,000.'),
      mcq('"Everything is slow, and every query is individually fast" means:',
        [['Requests are queueing for a connection', true],
          ['The database server is out of memory', false],
          ['The slow query log is not enabled', false],
          ['A migration is running in the background', false]],
        'Look at time spent waiting for a connection, which almost nobody does.'),
    ],
    checkpoint: [
      mcq('The first step when a page is slow is:',
        [['Count the queries per request', true],
          ['Find and read the slowest plan', false],
          ['Check the indexes on the main table', false],
          ['Look at the database server load', false]],
        'N+1 is the most common cause by a distance, and it is invisible to plans.'),
      mcq('An added index still showing a sequential scan may mean:',
        [['The planner is right, and the scan is faster', true],
          ['The index has not finished building', false],
          ['The query needs a hint to use it', false],
          ['The table needs to be rewritten', false]],
        'Check the actual timings before arguing with it.'),
      mcq('An integer column compared with a string value:',
        [['Can silently prevent the index being used', true],
          ['Raises a type error in most databases', false],
          ['Is converted efficiently by the planner', false],
          ['Only matters for composite indexes', false]],
        'Very hard to spot, and it looks like a perfectly reasonable query.'),
    ],
  },

  {
    unitCode: 'T3_QUERY_PERF_PRACTICE',
    notes: `Two exercises. Both are about **the shape of the access pattern** rather than SQL
syntax, because that is what transfers — the same reasoning applies whether the store is
Postgres, MySQL or a document database.

The first is the N+1, simulated so you can count the lookups. The second is the leftmost-prefix
rule, made mechanical.`,
    coding: [
      {
        title: 'Count the queries, then remove them',
        description: `Two sections of input. First an integer n, then n lines of
\`order_id customer_id\`. Then an integer m, then m lines of \`customer_id name\`.

Print each order as \`order_id name\`, in input order, using the name \`unknown\` when the
customer is missing.

**Every call to \`lookup\` counts as a query.** The harness prints your query count after the
output, and the hidden cases require **at most 1** — the N+1 version makes n of them.`,
        starter: `import sys

data = [l.rstrip(chr(10)) for l in sys.stdin]
i = 0
n = int(data[i]); i += 1
orders = [data[i + k].split() for k in range(n)]; i += n
m = int(data[i]); i += 1
customers = [data[i + k].split() for k in range(m)]

queries = 0


def lookup(customer_id):
    global queries
    queries += 1
    for cid, name in customers:
        if cid == customer_id:
            return name
    return 'unknown'


# TODO: produce the lines, then print them, then print the query count.
# The naive loop calls lookup once per order. Do it in at most one.
`,
        language: 'python',
        tests: [
          { input: '2\no1 c1\no2 c2\n2\nc1 asha\nc2 ravi\n', expectedOutput: 'o1 asha\no2 ravi\nqueries=1' },
          { input: '1\no1 c9\n1\nc1 asha\n', expectedOutput: 'o1 unknown\nqueries=1' },
          { input: '0\n0\n', expectedOutput: 'queries=1' },
          { input: '3\na c1\nb c1\nc c2\n2\nc1 x\nc2 y\n', expectedOutput: 'a x\nb x\nc y\nqueries=1', isHidden: true },
        ],
      },
      {
        title: 'Which index serves which query',
        description: `Given an index and a set of queries, say which the index can serve.

First line: the index columns, space separated, in order. Then one query per line: the columns
used in equality conditions, space separated, in the order written in the query — which should
**not** matter.

For each query print \`yes\` if the index can serve it under the leftmost-prefix rule and
\`no\` otherwise. An index serves a query when the query's columns include a leftmost prefix of
the index and nothing outside the index.

A query using **fewer** columns than the index is fine, provided they are a leftmost prefix. A
query using a column the index does not have is \`no\`.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
index = lines[0]
queries = lines[1:]

# Leftmost prefix. The order the query WRITES the conditions in does not matter;
# the order of the INDEX columns does.
`,
        language: 'python',
        tests: [
          { input: 'customer_id created_at\ncustomer_id\n', expectedOutput: 'yes' },
          { input: 'customer_id created_at\ncreated_at\n', expectedOutput: 'no' },
          { input: 'customer_id created_at\ncreated_at customer_id\n', expectedOutput: 'yes' },
          { input: 'a b c\na b\na c\nb c\na b c\n', expectedOutput: 'yes\nno\nno\nyes' },
          { input: 'a\na b\n', expectedOutput: 'no', isHidden: true },
          { input: 'a b\n\n', expectedOutput: '', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Query Performance Practice',
      description: 'Remove an N+1, apply the leftmost-prefix rule, and read a real plan.',
      instructions: `Complete both exercises, then:

1. For the first: state the cost of the naive version and yours, in terms of n and m. Say what
   the real-world equivalent of your fix is — name the SQL and the ORM feature.
2. For the first: the N+1 is invisible to plan-reading. Say why, in one sentence, and say what
   you would look at instead.
3. For the second: explain in your own words why \`a c\` is \`no\` for an index on
   \`(a, b, c)\`. Use the phone-book analogy or better.
4. For the second: the query \`a b\` against index \`(a)\` is \`no\`. Say why, and say whether
   the index is *useless* for that query or merely insufficient — they are different, and the
   difference matters.

**Then, on a real database.** Use any local database with a table you can fill.

5. Create a table with at least 100,000 rows. Say how you generated them.
6. Run a selective query with no index. Capture the plan and the time.
7. Add an appropriate index. Capture the plan and the time again.
8. Report: the two plans, the two timings, and the index size.
9. Now measure the **write** path: time 1,000 inserts before and after the index. Report both.
10. State the trade in one sentence: what you bought and what you paid.`,
      rubric: [
        { criterion: 'N+1 removed', description: 'One lookup, correct output including missing customers and empty input.', maxPoints: 20 },
        { criterion: 'Leftmost prefix', description: 'Correct across all the cases, including the shorter index.', maxPoints: 20 },
        { criterion: 'Useless against insufficient', description: 'Distinguishes the two for the `a b` query on index `(a)`.', maxPoints: 15 },
        { criterion: 'A real plan, before and after', description: '100,000+ rows, both plans captured, both timings reported.', maxPoints: 25 },
        { criterion: 'The write path measured', description: '1,000 inserts timed before and after, both numbers given.', maxPoints: 10 },
        { criterion: 'The trade, in one sentence', description: 'What was bought and what was paid, with the numbers behind it.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
index = lines[0]
queries = lines[1:]
`,
        tests: [
          { input: 'customer_id created_at\ncustomer_id\n', expectedOutput: 'yes' },
          { input: 'customer_id created_at\ncreated_at\n', expectedOutput: 'no' },
          { input: 'a b c\na b\na c\nb c\na b c\n', expectedOutput: 'yes\nno\nno\nyes' },
          { input: 'a\na b\n', expectedOutput: 'no', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('An index on `(a)` cannot serve a query filtering on a and b because:',
        [['It is insufficient — b must still be checked against the rows', true],
          ['The leftmost prefix rule excludes extra columns', false],
          ['The planner will reject a partial match', false],
          ['b is not present, so the index is useless', false]],
        'Insufficient, not useless — the distinction the assignment asks about.'),
      mcq('The real-world fix for the N+1 exercise is:',
        [['A join, or the ORM’s eager loading', true],
          ['An index on the customer id column', false],
          ['A cache in front of the customer table', false],
          ['A batch size limit on the order query', false]],
        'One query instead of n, which is a bigger win than any index here.'),
      mcq('The order conditions are written in a query:',
        [['Does not matter; the index column order does', true],
          ['Must match the index column order', false],
          ['Determines which index is chosen', false],
          ['Affects the plan but not the result', false]],
        'Which is why the exercise sorts the query columns and not the index.'),
    ],
  },

  {
    unitCode: 'T3_QUERY_PERF_MINI_PROJECT',
    notes: `Make something genuinely slow, then make it fast, and prove both with numbers.

The brief requires **enough data that the problem is real**. Optimisation on ten thousand rows
is a simulation of optimisation: nothing is slow, every plan is a scan, and the planner makes
choices it would not make at scale. A million rows is where the subject becomes itself.

Budget around two hours, most of it generating data and measuring.`,
    assignment: {
      title: 'Mini Project — Make It Slow, Then Make It Fast',
      description: 'Build a realistically sized dataset, find the slow paths, fix them, and report both directions.',
      instructions: `**Part one — build something slow**

1. Create a schema with at least three related tables — say customers, orders, order_items.
2. Generate **at least one million rows** in the largest table. Say how, and how long it took.
3. Make the distribution realistic: most customers with few orders, a handful with thousands.
   **This matters** — a uniform distribution hides the outlier-customer problem entirely, which
   is one of the things this project should show you.
4. Write five queries a real application would run. At least one aggregate, one multi-table
   join, and one that filters on a date range.

**Part two — measure honestly**

5. Time all five. Median of at least five runs, discarding the first. Say how you controlled
   for caching.
6. Capture the plan for the slowest two.
7. For each of those, identify the expensive step and name it — sequential scan, nested loop
   with a large outer side, late filtering, a sort spilling to disk.

**Part three — fix them**

8. Fix the two slowest. For each, say what you changed and **why the plan says it should help**
   before you measure.
9. Re-measure. Report before and after.
10. **Report one thing that did not help**, or that helped less than you expected. If everything
    worked first time, say what you would have expected to go wrong — this question exists
    because optimisation usually involves at least one dead end, and a report without one has
    usually been tidied.

**Part four — the cost**

11. Time 1,000 inserts before and after all your indexes. Report both.
12. Report the total size of the indexes against the size of the tables.
13. Find an N+1 or create one: write application code that loops over results and queries
    inside the loop. Time it, fix it, time it again.
14. **The outlier customer.** Run your slowest query for a typical customer and for the
    customer with the most orders. Are the timings proportional? If not, say what the plan does
    differently.

**Submit** the schema, the generation script, the timing table, the two plans before and after,
and answers to 10–14.`,
      rubric: [
        { criterion: 'A realistic dataset', description: 'A million rows or more, with a skewed distribution, generated reproducibly.', maxPoints: 20 },
        { criterion: 'Honest measurement', description: 'Medians, caching controlled for, method stated.', maxPoints: 15 },
        { criterion: 'Plans read, steps named', description: 'The expensive step identified specifically in each.', maxPoints: 20 },
        { criterion: 'Predicted before measured', description: 'Says why the plan implies the fix will help, before the numbers.', maxPoints: 15 },
        { criterion: 'Something that did not help', description: 'A real dead end reported, or a credible expectation given.', maxPoints: 10 },
        { criterion: 'The write cost', description: 'Inserts timed both ways, index sizes given against table sizes.', maxPoints: 10 },
        { criterion: 'The outlier customer', description: 'Compared against a typical one, with the plan difference explained.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A uniform data distribution in the project would hide:',
        [['The outlier-customer problem', true],
          ['The cost of the indexes on writes', false],
          ['The N+1 in the application code', false],
          ['The effect of a warm buffer cache', false]],
        'Most customers with few orders and a handful with thousands is the realistic shape.'),
      mcq('The brief asks for something that did not help because:',
        [['Optimisation usually involves at least one dead end', true],
          ['Failed attempts are easier to explain', false],
          ['It shows the measurement was thorough', false],
          ['Most indexes turn out to be unnecessary', false]],
        'A report without one has usually been tidied.'),
      mcq('Optimising on ten thousand rows is a simulation because:',
        [['Nothing is slow and the planner chooses differently', true],
          ['Indexes are not used below a certain size', false],
          ['Timings are dominated by connection overhead', false],
          ['Small tables are always cached entirely', false]],
        'A million rows is where the subject becomes itself.'),
    ],
  },

  /* ══ T3_TRANSACTIONS_INTEGRITY ══════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_TWO_THINGS_AT_ONCE',
    notes: `Every test you have written ran alone. Production runs everything at once, and that
single difference is the source of the most expensive class of bug in this module.

## The lost update

    stock = db.query('SELECT stock FROM items WHERE id = 1')   # 10
    new_stock = stock - 1                                      # 9
    db.execute('UPDATE items SET stock = 9 WHERE id = 1')

Two requests run this at the same time. Both read 10. Both write 9. **Two items sold, one
deducted.**

This is **read-modify-write**, and it is the shape of nearly every concurrency bug you will
meet: overselling stock, double-spending credit, two users claiming one voucher, a counter that
drifts low over months.

**It is invisible in testing** because tests run one at a time.

## Three fixes, in increasing strength

**1. Do it in the database.**

    UPDATE items SET stock = stock - 1 WHERE id = 1 AND stock > 0

One statement. The database locks the row for its duration, so the decrement is atomic, and the
\`WHERE\` guard prevents going negative. **Check the affected row count** — zero means it did
not happen, and ignoring that is how the guard gets bypassed.

**This is the right answer far more often than students expect.** Reach for it first.

**2. Optimistic locking.** Add a version column:

    UPDATE items SET stock = 9, version = 6 WHERE id = 1 AND version = 5

If somebody else got there first, version is 6 already and zero rows update. You detect the
conflict and retry. **Good when conflicts are rare**, which is most of the time — no locks are
held, so nothing waits.

**3. Pessimistic locking.** \`SELECT ... FOR UPDATE\` locks the row until your transaction
ends. Others wait. **Correct, and it costs concurrency** — and a transaction that holds a lock
while calling an external API is how a system stops responding.

## Isolation levels, briefly

A transaction's isolation level decides which anomalies you tolerate:

- **Read committed** (the usual default) — you never see uncommitted data. **You can still lose
  updates**, which is the point that matters here: the default does not protect you from the
  example above.
- **Repeatable read** — rows you have read do not change under you. Prevents more, costs more.
- **Serializable** — behaves as if transactions ran one after another. Strongest, slowest, and
  it can abort your transaction with a serialisation failure that **you must be prepared to
  retry**.

**The practical point:** the default does not save you. Know what your database's default is,
and know that read-modify-write is unsafe under it.

## What to hold a transaction for

**As short as possible.** A transaction is a lock held.

    BEGIN
    UPDATE orders ...
    response = requests.post('https://payment-provider/...')   # <-- 3 seconds
    UPDATE payments ...
    COMMIT

Three seconds of lock, held on a network call that can hang. Under load the connection pool
fills with transactions waiting on a third party. **Do the external call outside the
transaction**, and design for the failure that then becomes possible — which is the
distributed-systems problem the API topic returns to.`,
    mcqs: [
      mcq('Read-modify-write across two requests produces:',
        [['A lost update — both read the same value and both write', true],
          ['A deadlock between the two transactions', false],
          ['A dirty read of uncommitted data', false],
          ['A constraint violation on the second write', false]],
        'Two items sold, one deducted, and no error anywhere.'),
      mcq('`UPDATE items SET stock = stock - 1 WHERE id = 1 AND stock > 0` is safe because:',
        [['The database locks the row for the statement’s duration', true],
          ['The WHERE clause is evaluated before the update', false],
          ['A single statement cannot be interrupted', false],
          ['The value is read and written in the same query', false]],
        'And check the affected row count — zero means it did not happen.'),
      mcq('Optimistic locking suits workloads where:',
        [['Conflicts are rare, so nothing waits', true],
          ['Conflicts are frequent and must be serialised', false],
          ['Transactions are long-running', false],
          ['The row is updated by many writers at once', false]],
        'No locks are held; you detect the conflict and retry.'),
      mcq('Read committed, the usual default, still allows:',
        [['Lost updates', true],
          ['Dirty reads', false],
          ['Reading uncommitted rows', false],
          ['Seeing a partially applied transaction', false]],
        'The default does not protect you from the example this unit opens with.'),
    ],
    checkpoint: [
      mcq('Calling a payment API inside a transaction is dangerous because:',
        [['A lock is held for the duration of a call that can hang', true],
          ['The API call cannot be rolled back', false],
          ['The transaction may time out and abort', false],
          ['The provider may see uncommitted data', false]],
        'Under load the connection pool fills with transactions waiting on a third party.'),
      mcq('Concurrency bugs are invisible in testing because:',
        [['Tests run one at a time', true],
          ['Test databases are smaller', false],
          ['Transactions are rolled back after each test', false],
          ['Test data lacks realistic contention', false]],
        'Every test a student has written ran alone; production runs everything at once.'),
      mcq('Serializable isolation requires the application to:',
        [['Be prepared to retry on a serialisation failure', true],
          ['Order its statements consistently', false],
          ['Hold transactions open for longer', false],
          ['Avoid reading rows it will later write', false]],
        'It is the strongest level and it can abort your transaction to keep its promise.'),
    ],
  },

  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_LET_THE_DATABASE_ENFORCE',
    notes: `A rule enforced in application code holds for the paths that go through that code. A
rule enforced by a constraint holds **always** — including the migration, the admin script, the
bug in another service and the manual fix at 2am.

## The check that does not hold

    if User.objects.filter(email=email).exists():
        raise ValidationError('taken')
    User.objects.create(email=email)

Two requests at once: both check, both find nothing, both create. **Duplicate email**, and you
have written the read-modify-write bug in a different costume.

    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

Now it is impossible. The second insert fails, and you catch the error and return the same
message you were going to return anyway.

**The pattern: let the database refuse, and handle the refusal.** Not "check then insert" —
that gap between the check and the insert is exactly where the second request lives.

## What to push into the database

**Unique.** Emails, usernames, an order number, "one active subscription per customer" —
usually with a partial unique index.

**Not null.** If it must always be present, say so. A nullable column that is never null in
practice makes every reader handle a case that cannot happen, and one day it can.

**Foreign keys.** An order with a customer_id pointing at nothing is a bug you will find
months later in a report. The constraint makes it impossible, and defines what happens on
delete — cascade, restrict, or set null. **Decide that deliberately.**

**Check constraints.** \`CHECK (quantity > 0)\`, \`CHECK (end_date > start_date)\`,
\`CHECK (status IN (...))\`. Cheap and absolute.

**Defaults.** \`created_at DEFAULT now()\` cannot be forgotten by a caller.

## Why this is better than application code

**It cannot be bypassed.** Not by another service, not by a migration, not by a script, not by
someone in a console. In a system of any age there is always another writer.

**It is atomic.** No gap between check and act.

**It is faster.** A unique index does the check as part of the insert, rather than a round trip.

**It documents the rule.** The schema states what is true. Application validation states what
one code path checks.

## What belongs in application code anyway

**Not everything.** Constraints are for invariants, and some rules are not invariants:

- **Rules that need external data.** "The card is valid" cannot be a constraint.
- **Rules that change with context.** A discount valid for one customer type and not another.
- **Rules that need a good error message.** A constraint violation is a database error, and
  users should not see it.

**So do both.** Validate in the application for the message, and constrain in the database for
the guarantee. The application check handles the common case politely; the constraint handles
the race and the script.

## The one thing to get right

**Catch the constraint violation and turn it into a sensible response.** Uncaught, the user sees
a 500 and you have traded a clean error for a crash. The constraint is the safety net, not the
user interface.`,
    mcqs: [
      mcq('"Check then insert" fails under concurrency because:',
        [['The gap between the check and the insert is where the second request lives', true],
          ['The check reads uncommitted data', false],
          ['The insert acquires a lock the check did not', false],
          ['The query cache returns a stale result', false]],
        'The read-modify-write bug in a different costume.'),
      mcq('A database constraint beats application validation mainly because:',
        [['It cannot be bypassed by another writer', true],
          ['It produces clearer error messages', false],
          ['It is easier to change later', false],
          ['It applies to reads as well as writes', false]],
        'In a system of any age there is always another writer.'),
      mcq('Which rule cannot be a database constraint?',
        [['The card is valid', true],
          ['The quantity is above zero', false],
          ['The end date is after the start date', false],
          ['The email is unique', false]],
        'It needs external data, which is one of the three cases for application code.'),
      mcq('The right approach is usually to:',
        [['Validate in the application and constrain in the database', true],
          ['Constrain in the database only', false],
          ['Validate in the application only', false],
          ['Choose one per rule, to avoid duplication', false]],
        'The application handles the common case politely; the constraint handles the race.'),
    ],
    checkpoint: [
      mcq('A nullable column that is never null in practice:',
        [['Makes every reader handle a case that cannot happen', true],
          ['Costs storage for the null marker', false],
          ['Prevents the column being indexed', false],
          ['Is harmless if the application always sets it', false]],
        'Until one day it can, and then the readers were right to check.'),
      mcq('A foreign key also requires you to decide:',
        [['What happens on delete', true],
          ['Which index the join will use', false],
          ['Whether the column may be null', false],
          ['How the constraint is named', false]],
        'Cascade, restrict or set null — deliberately, not by default.'),
      mcq('An uncaught constraint violation:',
        [['Trades a clean error for a 500', true],
          ['Rolls back more than intended', false],
          ['Leaves the transaction open', false],
          ['Bypasses the application validation', false]],
        'The constraint is the safety net, not the user interface.'),
    ],
  },

  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_DEADLOCKS',
    notes: `A deadlock is two transactions each waiting for a lock the other holds. Neither can
proceed, so the database kills one.

    -- transaction A            -- transaction B
    UPDATE accounts id=1        UPDATE accounts id=2
    UPDATE accounts id=2        UPDATE accounts id=1
    -- waits for B              -- waits for A

## The cause, and it is always the same

**Two transactions taking the same locks in different orders.**

That is the whole diagnosis. Every deadlock is this, however complicated the code looks, and
once you know it the fix follows immediately.

## The fix, and it is also always the same

**Take locks in a consistent order.**

    for account_id in sorted([from_id, to_id]):
        lock_and_update(account_id)

Now A and B both take 1 before 2. One waits briefly and then proceeds. No cycle, so no deadlock.

Sorting by primary key is the usual convention, and it is enough. The rule only has to be
consistent, not clever.

## Where they hide

**The lock is not always where you see it.** A foreign key means updating a child row can take
a lock on the parent. Two transactions updating different order_items can deadlock on the shared
order row, and nothing in either statement mentions locking.

**An index update takes locks too.** Two inserts into the same table can deadlock on index
pages, with no explicit locking anywhere.

**Different statements, same rows.** \`UPDATE ... WHERE status = 'x'\` and
\`UPDATE ... WHERE customer_id = 5\` can lock overlapping sets in different orders, because the
order rows are locked in is the order they are found in.

## Long transactions are the multiplier

A deadlock needs two transactions to overlap. **The longer they are, the likelier that is** —
and long transactions cause plenty on their own:

- **They hold locks**, so other work waits.
- **They hold a connection**, so the pool drains.
- **They prevent cleanup.** In some databases, an open transaction stops old row versions being
  reclaimed, and the table grows.

**The worst version is a transaction with a network call inside it.** Three seconds of holding
locks while a third party thinks about it, and every retry doubles the exposure.

## Handling one

**Deadlocks are normal, not exceptional.** In a busy system they happen; the database detects
the cycle and aborts one transaction with a specific error code.

**So retry.** The aborted transaction can usually just run again — with a small backoff, a
retry limit, and only for the deadlock error code specifically. Retrying a constraint violation
forever is a different bug.

**But look at them.** A deadlock every few days is normal. A deadlock every few minutes is a
lock-ordering problem you have not fixed, and the retry is hiding it.

## Reducing them

- **Consistent lock ordering.** The main fix.
- **Shorter transactions.** Less overlap.
- **Touch fewer rows.** A statement that locks a range locks everything in it.
- **Optimistic locking**, where it fits — no locks held, so no cycles possible.`,
    mcqs: [
      mcq('Every deadlock is caused by:',
        [['Two transactions taking the same locks in different orders', true],
          ['A transaction held open for too long', false],
          ['Too many concurrent writers on one table', false],
          ['An isolation level that is too strict', false]],
        'However complicated the code looks, that is the whole diagnosis.'),
      mcq('The standard fix is:',
        [['Take locks in a consistent order, such as by primary key', true],
          ['Shorten the transactions involved', false],
          ['Retry the aborted transaction', false],
          ['Lower the isolation level', false]],
        'The rule only has to be consistent, not clever.'),
      mcq('Two transactions updating different order_items can deadlock because:',
        [['A foreign key takes a lock on the shared parent row', true],
          ['The items table is locked as a whole', false],
          ['The statements are executed in the same order', false],
          ['Item updates are serialised by the database', false]],
        'Nothing in either statement mentions locking, which is why it hides.'),
      mcq('Long transactions increase deadlocks mainly by:',
        [['Increasing the chance that two overlap', true],
          ['Acquiring locks in a less predictable order', false],
          ['Consuming more of the connection pool', false],
          ['Preventing the database from detecting cycles', false]],
        'A deadlock needs two transactions to be live at the same moment.'),
    ],
    checkpoint: [
      mcq('The correct response to an occasional deadlock is:',
        [['Retry, with backoff and a limit, for that error code only', true],
          ['Lower the isolation level for that transaction', false],
          ['Serialise the operation through a queue', false],
          ['Log it and return an error to the user', false]],
        'Retrying every error forever is a different bug.'),
      mcq('A deadlock every few minutes indicates:',
        [['A lock-ordering problem the retry is hiding', true],
          ['Normal behaviour for a busy system', false],
          ['A connection pool that is too small', false],
          ['An isolation level that is too weak', false]],
        'Every few days is normal; every few minutes is a defect.'),
      mcq('An open transaction can make a table grow because:',
        [['Old row versions cannot be reclaimed while it lives', true],
          ['Uncommitted rows are written to disk anyway', false],
          ['The write-ahead log cannot be truncated', false],
          ['Indexes are rebuilt when it commits', false]],
        'One of the costs of a long transaction that has nothing to do with locking.'),
    ],
  },

  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_DEBUGGING',
    notes: `Five transaction failures. The first is the most expensive thing in this module
because it loses money and leaves no trace.

## 1. The lost update, in production only

**Symptom:** stock goes negative. A counter drifts low over months. Two users have the same
voucher. **Nothing in the logs is wrong** — every request succeeded.

**Cause:** read-modify-write, and two requests interleaved.

**Why it is not caught:** tests run one at a time, and the window is milliseconds.

**Detection:** reproduce it deliberately. Run the operation from twenty threads and check the
invariant afterwards. **If you have never run your code concurrently, you do not know whether
it is correct** — you know it works alone.

## 2. Work done outside the transaction

    with transaction.atomic():
        order.save()
    send_confirmation_email(order)     # outside
    charge_card(order)                 # outside

**Symptom:** an order exists with no payment, or an email for an order that was rolled back.
**Cause:** only part of the operation is inside the boundary. **Fix:** decide deliberately what
is in and what is out — and note that external calls genuinely should be outside, so the answer
is not "put everything in". It is that the *inconsistency* must be designed for: an outbox
table, a reconciliation job, or an idempotent retry.

## 3. The transaction that was never open

**Symptom:** a partial failure leaves half the work done. **Cause:** autocommit. Each statement
committed on its own, because the transaction was never actually started — a forgotten
decorator, a connection that autocommits by default, or an ORM that only opens one when you ask.

**Check it.** Do not assume your framework wraps requests in a transaction; many do not.

## 4. Swallowing the error and committing anyway

    try:
        risky_operation()
    except Exception:
        log.error('failed')
    # no re-raise, so the transaction commits

**Symptom:** silent partial writes. **Cause:** the exception was caught inside the transaction
and not re-raised, so nothing triggered the rollback. **Fix:** roll back explicitly, or
re-raise. **This is the swallowed-exception bug from the error design topic**, with a database
attached and a much higher price.

## 5. Retrying something that is not safe to retry

**Symptom:** double charges after a timeout. **Cause:** the request timed out, the client
retried, and the first one had actually succeeded. **Fix:** idempotency. A client-supplied key,
stored and checked, so the second attempt returns the first result instead of doing the work
again.

**A timeout is not a failure.** It is an *unknown*, and treating unknown as failed is what
creates duplicates.

## How to find these

**Run it concurrently, deliberately.** Twenty threads, same operation, check the invariant.
This one test finds most of number 1.

**Check the invariants directly in the database.** \`SELECT ... WHERE stock < 0\`. Sum the
ledger and compare with the balance. **Bugs of this class show up in the data long before
anybody reports them**, and a weekly query is cheap.

**Log transaction boundaries** while diagnosing. Begin, commit, rollback, with the request id.
Half of these become obvious the moment you can see where the boundaries actually were.`,
    mcqs: [
      mcq('The lost update leaves no trace in the logs because:',
        [['Every request succeeded', true],
          ['The failing request was rolled back', false],
          ['The error was caught and logged at debug', false],
          ['The update was applied to a replica', false]],
        'Nothing errored. The data is simply wrong.'),
      mcq('An exception caught inside a transaction and not re-raised:',
        [['Lets the transaction commit the partial work', true],
          ['Triggers an automatic rollback', false],
          ['Leaves the transaction open indefinitely', false],
          ['Is rolled back when the connection closes', false]],
        'The swallowed-exception bug with a database attached.'),
      mcq('A request that timed out should be treated as:',
        [['Unknown, not failed', true],
          ['Failed, and safe to retry', false],
          ['Succeeded, until proven otherwise', false],
          ['Failed, and requiring manual review', false]],
        'Treating unknown as failed is what creates double charges.'),
      mcq('The single most useful test for concurrency bugs is:',
        [['Run the operation from twenty threads and check the invariant', true],
          ['Run the suite with the database under load', false],
          ['Set the isolation level to serializable in tests', false],
          ['Add assertions inside the transaction', false]],
        'If you have never run your code concurrently, you know only that it works alone.'),
    ],
    checkpoint: [
      mcq('Idempotency is achieved by:',
        [['A client-supplied key, stored and checked', true],
          ['Retrying only once after a timeout', false],
          ['Making the operation a single statement', false],
          ['Rolling back before every retry', false]],
        'The second attempt returns the first result instead of doing the work again.'),
      mcq('`SELECT ... WHERE stock < 0` run weekly is worthwhile because:',
        [['These bugs show in the data before anybody reports them', true],
          ['It is faster than reviewing the application code', false],
          ['It detects constraint violations that were caught', false],
          ['It measures how often the race occurs', false]],
        'And the query is cheap.'),
      mcq('"A partial failure left half the work done" most often means:',
        [['No transaction was ever open', true],
          ['The isolation level was too weak', false],
          ['A deadlock aborted the transaction', false],
          ['The rollback itself failed', false]],
        'Autocommit, and an assumption that the framework wraps requests. Many do not.'),
    ],
  },

  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_PRACTICE',
    notes: `Two exercises that make concurrency visible without needing a database.

The first simulates interleaving deterministically, so the lost update is reproducible rather
than a one-in-a-thousand flake. The second is idempotency, which is the fix for the retry
problem and is worth having written once.`,
    coding: [
      {
        title: 'Survive the interleaving',
        description: `A stock counter, driven by a schedule that interleaves two requests on
purpose.

Read a starting stock, then a line of operations. Each operation is \`R\` (a request reads the
current stock) or \`W\` (the most recent reader writes back what it read, minus one). The
schedule is designed so a naive read-modify-write loses updates.

Print the final stock. **Stock must never go below 0**, and a write from a reader who read 0 is
ignored.

Model it so that the interleaving cannot lose an update: a write should apply a **decrement**,
not a remembered value.`,
        starter: `import sys

lines = sys.stdin.read().split(chr(10))
stock = int(lines[0])
ops = lines[1].split() if len(lines) > 1 else []

# R records that a reader has arrived. W applies that reader's write.
# A naive model stores the value read and writes it back minus one. Do not do that.
`,
        language: 'python',
        tests: [
          { input: '10\nR R W W\n', expectedOutput: '8' },
          { input: '10\nR W R W\n', expectedOutput: '8' },
          { input: '1\nR R W W\n', expectedOutput: '0' },
          { input: '0\nR W\n', expectedOutput: '0' },
          { input: '3\nR R R W W W\n', expectedOutput: '0', isHidden: true },
          { input: '5\n\n', expectedOutput: '5', isHidden: true },
        ],
      },
      {
        title: 'Make the retry safe',
        description: `Requests arrive with an idempotency key. Process each and print the
result. A repeated key must return the **first** result without doing the work again.

Read lines of \`key amount\`. The "work" is adding the amount to a running balance. For each
line print the balance **as it was after that key was first processed**.

    add 5      balance 5, print 5
    add 5      same key, print 5 again, balance stays 5
    top 3      balance 8, print 8

Keys are arbitrary strings. An empty input prints nothing.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# A repeated key must not do the work twice, and must return what it returned before.
`,
        language: 'python',
        tests: [
          { input: 'add 5\nadd 5\ntop 3\n', expectedOutput: '5\n5\n8' },
          { input: 'a 1\nb 2\na 99\n', expectedOutput: '1\n3\n1' },
          { input: '', expectedOutput: '' },
          { input: 'x 0\nx 0\n', expectedOutput: '0\n0', isHidden: true },
          { input: 'p -5\np -5\nq 5\n', expectedOutput: '-5\n-5\n0', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Transactions Practice',
      description: 'Make an interleaved update safe, implement idempotency, and reproduce a real race.',
      instructions: `Complete both exercises, then:

1. For the first: write out the naive version's behaviour on \`R R W W\` step by step, and say
   what final stock it produces and why.
2. For the first: name the SQL statement that achieves the same safety in one line, and say
   what you must check after running it.
3. For the second: say what the idempotency key must be scoped to. A key per client? Per
   endpoint? Globally? Argue for one.
4. For the second: say what should happen if the same key arrives with a **different** amount.
   There is more than one defensible answer — pick one and say why.

**Then, against a real database:**

5. Create a table with a counter and write the naive read-modify-write in application code.
6. Run it from at least 20 concurrent threads or processes, 100 times each. Report the final
   value against the expected value.
7. Fix it with a single atomic statement. Re-run the same test. Report the value.
8. Fix it a second way, with optimistic locking and a version column. Re-run. Report the value
   **and the number of retries** that occurred.
9. Say which of the two you would ship for this case, and what would change your answer.`,
      rubric: [
        { criterion: 'The interleaving survived', description: 'Correct across every schedule, including the floor at zero.', maxPoints: 20 },
        { criterion: 'Idempotency', description: 'Repeat keys return the original result, including zero and negative amounts.', maxPoints: 20 },
        { criterion: 'The naive trace', description: 'Step by step, with the wrong answer and why it happens.', maxPoints: 10 },
        { criterion: 'A real race, reproduced', description: '20+ concurrent writers, with the lost updates measured.', maxPoints: 25 },
        { criterion: 'Two fixes, both measured', description: 'Atomic and optimistic, with retry counts for the second.', maxPoints: 15 },
        { criterion: 'A defended choice', description: 'Which to ship, and what would change it.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        tests: [
          { input: 'add 5\nadd 5\ntop 3\n', expectedOutput: '5\n5\n8' },
          { input: 'a 1\nb 2\na 99\n', expectedOutput: '1\n3\n1' },
          { input: '', expectedOutput: '' },
          { input: 'p -5\np -5\nq 5\n', expectedOutput: '-5\n-5\n0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('Modelling a write as a decrement rather than a remembered value:',
        [['Makes the result independent of the interleaving', true],
          ['Is faster than storing the read value', false],
          ['Prevents the counter going below zero', false],
          ['Removes the need for a transaction', false]],
        'Which is exactly what the single SQL statement does.'),
      mcq('An idempotency key arriving with a different amount:',
        [['Has more than one defensible handling, and needs a decision', true],
          ['Should always be treated as a new request', false],
          ['Should always return the original result', false],
          ['Indicates a client bug and should error', false]],
        'The assignment asks the student to pick one and argue it.'),
      mcq('After an atomic decrement you must check:',
        [['The affected row count', true],
          ['The isolation level in force', false],
          ['Whether the transaction committed', false],
          ['The value that was written', false]],
        'Zero means it did not happen, and ignoring that bypasses the guard.'),
    ],
  },

  {
    unitCode: 'T3_TRANSACTIONS_INTEGRITY_MINI_PROJECT',
    notes: `Build something with money in it, break it with concurrency, and make it correct.

The brief is a ledger because a ledger has an invariant you can check absolutely: **the sum of
the entries equals the balance.** Most concurrency exercises have a fuzzy notion of correctness;
this one does not, and that is what makes the measurement honest.

Budget around two hours. Most of the value is in part two, where you prove your first version
is wrong.`,
    assignment: {
      title: 'Mini Project — A Ledger That Survives Concurrency',
      description: 'Build a transfer system, break it with concurrent writers, and make its invariant hold absolutely.',
      instructions: `**Build** an account ledger with:

- \`accounts(id, balance)\`
- \`entries(id, account_id, amount, created_at, transfer_id)\`
- \`transfer(from_id, to_id, amount)\` — two entries and two balance updates
- \`balance_of(account_id)\`

**The invariant:** for every account, the sum of its entries equals its balance. And across all
accounts, the total never changes — a transfer moves money, it does not create it.

**Part one — build it naively, on purpose**

1. Write \`transfer\` as read-modify-write in application code. Do not make it safe yet.
2. Write a checker that verifies both invariants and reports every violation.
3. Confirm it passes when run single-threaded. Show that.

**Part two — break it**

4. Run 20+ concurrent workers doing 100 random transfers each between 10 accounts.
5. Run the checker. **Report the violations**: how many accounts are wrong, by how much, and
   whether the total changed.
6. Explain precisely which interleaving produced it. Not "a race condition" — the actual
   sequence of reads and writes.

**Part three — fix it, three ways**

7. **Atomic statements.** Balance updates as single statements. Re-run, re-check, report.
8. **Pessimistic locking.** \`SELECT ... FOR UPDATE\`, in a **consistent order**. Re-run,
   re-check, report — and say what the order is and why it matters.
9. **Optimistic locking.** A version column and retries. Re-run, re-check, report, **and report
   the retry count**.

**Part four — measure and choose**

10. Time all three under the concurrent load. Report throughput.
11. Which had the most contention? Which was fastest? Are they the same one?
12. Deliberately introduce a deadlock in the pessimistic version by removing the ordering. Show
    the error. Then restore the ordering.
13. Add the constraint that a balance may never go negative. Where did you put it, and why
    there?
14. **Reconciliation.** Write a query that finds any account whose entries do not sum to its
    balance. Say how often you would run it in production and what you would do if it found
    something.

**Submit** the four implementations, the violation report from part two, the timing table, and
answers to 11–14.`,
      rubric: [
        { criterion: 'A ledger with a checkable invariant', description: 'Entries, balances, and a checker that reports violations precisely.', maxPoints: 15 },
        { criterion: 'Broken, and measured', description: 'Real concurrent load, with violations counted and quantified.', maxPoints: 20 },
        { criterion: 'The interleaving explained', description: 'The actual sequence of reads and writes, not "a race condition".', maxPoints: 15 },
        { criterion: 'Three working fixes', description: 'Atomic, pessimistic with ordering, optimistic with retries — all verified.', maxPoints: 25 },
        { criterion: 'The deadlock, produced', description: 'Ordering removed, error shown, ordering restored.', maxPoints: 10 },
        { criterion: 'Throughput compared', description: 'Timed under load, with contention and speed discussed honestly.', maxPoints: 10 },
        { criterion: 'Reconciliation', description: 'A real query, a frequency, and what to do when it finds something.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A ledger is chosen for this project because:',
        [['Its invariant can be checked absolutely', true],
          ['Financial code is the most realistic example', false],
          ['It has the highest contention of any workload', false],
          ['It requires all three locking strategies', false]],
        'The sum of the entries equals the balance — no fuzziness about correctness.'),
      mcq('"A race condition" is rejected as an explanation because:',
        [['The actual sequence of reads and writes is the answer', true],
          ['Races are not the only cause of violations', false],
          ['It does not identify which account was affected', false],
          ['The term is used imprecisely in most codebases', false]],
        'Naming the category is not diagnosing the instance.'),
      mcq('Reporting the retry count for optimistic locking matters because:',
        [['It measures the contention the approach is paying for', true],
          ['Retries indicate the implementation is wrong', false],
          ['It shows the version column is being used', false],
          ['High counts mean the locks are held too long', false]],
        'Optimistic locking is cheap when conflicts are rare, and the count says whether they are.'),
    ],
  },

  /* ══ T3_CACHING_NOSQL ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CACHING_NOSQL_WHAT_IS_SAFE_TO_CACHE',
    notes: `A cache trades **memory and correctness for speed**. The memory part is obvious. The
correctness part is the one people discover in production, and it is why "just add a cache" is
not a plan.

## What qualifies

Three conditions, and you need all three:

**1. Read more than written.** A value read a thousand times per write is an excellent
candidate. A value written as often as it is read is a terrible one — you are paying to
maintain a copy that is almost always about to be wrong.

**2. Expensive to produce.** A join across four tables, an aggregate over a million rows, a
call to a slow third party. **Caching a primary-key lookup is usually pointless** — the database
already caches that, and you have added a network hop and a consistency problem to save almost
nothing.

**3. Tolerant of being slightly stale.** The real question, and the one nobody asks: **what
breaks if this is five minutes out of date?**

- Product description — nothing. Cache it.
- Stock count shown on a page — mildly annoying if wrong. Cache it briefly.
- **Stock count used to decide whether an order can be placed — do not cache it.** That is a
  correctness decision, not a display.
- A user's permissions — a revoked admin who keeps access for ten minutes is a security
  incident. Cache carefully and short, and invalidate explicitly.

## The question to ask about every cached value

> **What is the worst thing that happens if this is wrong for the length of its TTL?**

If the answer is "somebody sees an old number", cache it. If it is "we sell something we do not
have" or "somebody sees data they should not", it is not a caching problem — it is a decision
about correctness that a cache is the wrong tool for.

## Choosing a TTL

- **Short (seconds).** Data that changes often, or where staleness matters. Still removes most
  of the load: a value requested a thousand times a second and cached for five seconds is
  computed once instead of five thousand times.
- **Medium (minutes).** Most things.
- **Long (hours).** Truly static — country lists, configuration, exchange rates that update
  daily.
- **Forever, with explicit invalidation.** Where you can reliably know when it changes.

**A short TTL is cheaper than people think**, and it is the honest default when you are unsure.
Most of the benefit comes from the first few seconds.

## Where the cache lives

- **In-process.** Fastest. Per instance, so ten servers means ten copies and ten different
  answers during invalidation.
- **Shared (Redis, Memcached).** One copy, consistent across instances, a network hop away.
- **HTTP / CDN.** For anything public and static. Free, and the request never reaches you.
- **Database query cache.** Mostly deprecated in modern databases, for the reasons this unit
  is about.

## The failure everyone meets

**The stampede.** A popular value expires. A thousand requests miss simultaneously. All thousand
compute it. The database, which was comfortable, falls over — **and the cache was what made
that traffic survivable in the first place**, so its expiry is the outage.

Mitigations: a lock so only one caller recomputes, refreshing shortly before expiry rather than
after, or jittering TTLs so a thousand keys do not expire together.

## The thing to remember

**A cache is not a fix for a slow query. It is a way to run a slow query less often.** If the
query is slow because it is wrong, the cache hides that until the moment the cache is empty —
which is a deploy, a restart or an eviction, and always at the worst time.`,
    mcqs: [
      mcq('Caching a primary-key lookup is usually pointless because:',
        [['The database already caches it, and you have added a hop', true],
          ['Primary keys change too frequently', false],
          ['The result is too small to be worth storing', false],
          ['Such lookups are rarely repeated', false]],
        'You added a network hop and a consistency problem to save almost nothing.'),
      mcq('The question to ask about a cached value is:',
        [['What is the worst thing if this is wrong for its TTL', true],
          ['How often is it read compared with written', false],
          ['How expensive is it to compute', false],
          ['How much memory will it consume', false]],
        'The other two are conditions; this is the one nobody asks.'),
      mcq('A stock count used to decide whether an order can be placed:',
        [['Should not be cached — it is a correctness decision', true],
          ['Should be cached with a very short TTL', false],
          ['Should be cached and invalidated on every sale', false],
          ['Should be cached per user session', false]],
        'Displaying it is one thing; deciding with it is another.'),
      mcq('A cache stampede is dangerous because:',
        [['The cache was what made that traffic survivable', true],
          ['The recomputation is slower than normal', false],
          ['The expired value may be served incorrectly', false],
          ['Many keys expire at the same moment', false]],
        'Its expiry is the outage, on a database that was comfortable a second earlier.'),
    ],
    checkpoint: [
      mcq('A five-second TTL on a value requested a thousand times a second:',
        [['Reduces five thousand computations to one', true],
          ['Is too short to provide any benefit', false],
          ['Guarantees the value is never stale', false],
          ['Costs more in invalidation than it saves', false]],
        'Most of the benefit comes from the first few seconds.'),
      mcq('An in-process cache across ten servers means:',
        [['Ten copies, and ten answers during invalidation', true],
          ['One copy, shared over the network', false],
          ['Consistent reads with a small delay', false],
          ['Cache misses only on the first server', false]],
        'Which is the main argument for a shared cache.'),
      mcq('"A cache is not a fix for a slow query" because:',
        [['It hides the problem until the cache is empty', true],
          ['Caches are slower than a tuned query', false],
          ['The query still runs on every write', false],
          ['Cached values cannot be indexed', false]],
        'And the cache is empty at a deploy, a restart or an eviction.'),
    ],
  },

  {
    unitCode: 'T3_CACHING_NOSQL_INVALIDATION',
    notes: `Putting something in a cache is easy. **Knowing when it stops being true is the
whole problem**, and it is why the old joke about naming things and cache invalidation has
survived.

## The four strategies

**1. Time based (TTL).** Expire after n seconds. **Simple, predictable, and always at least a
little wrong** — the value is stale for up to the TTL by design. Right for most things, and you
should reach for it first.

**2. Write-through.** Update the cache whenever you update the source. Always fresh, if every
writer goes through your code. **The failure:** another service, a migration or a manual fix
changes the database and the cache never hears about it. **In any system of age, there is
always another writer** — the same argument as the database-constraints unit.

**3. Explicit invalidation.** Delete the key when the thing changes. Precise, and the burden is
remembering every place that changes it. **The bug is always a forgotten one.**

**4. Event based.** The source emits a change event; caches listen. Scales properly, decouples
the writer from the cache, and costs infrastructure and eventual consistency.

## Why it is hard

**Knowing what to invalidate.** A product's price changes. That invalidates: the product page,
the category listing it appears in, the search results, the basket totals of everyone holding
it, the homepage "deals" block. **One write, six caches**, and you will forget the sixth.

**Multiple caches.** In-process on ten servers, the shared cache, the CDN, the browser. A
successful invalidation of one is not an invalidation.

**Partial failure.** You delete the key; the delete fails; nobody notices, because the system
carries on serving a stale value happily.

## The rules that make it manageable

**Prefer a short TTL to clever invalidation.** A thirty-second TTL is nearly always simpler and
more reliable than a web of explicit invalidations you have to maintain forever. **This is the
single most useful piece of advice in the unit.**

**Version the key rather than deleting it.**

    cache_key = f'product:{id}:v{product.updated_at.timestamp()}'

Now you never invalidate anything. The key changes when the data changes, old keys expire on
their own, and there is no delete to fail. It costs memory and removes an entire class of bug.

**Cache the computation, not the page.** Fine-grained keys mean a price change invalidates the
price, not the whole page.

**Never let the cache be the only copy.** A cache must be reconstructible from the source. The
moment something exists only in the cache, it is a database with no durability, no backups and
an eviction policy.

## Two more failures worth knowing

**The thundering herd on a cold cache.** You deploy and clear everything. Every request misses.
The database sees full traffic with no cache in front of it — and it has not seen full traffic
in months. **Warm the cache before taking traffic**, or clear it gradually.

**Negative results not cached.** A lookup for something that does not exist misses every time
and hits the database every time. Cache the "not found" too, briefly — and be aware this is
also a denial-of-service vector if an attacker can request arbitrary missing keys.`,
    mcqs: [
      mcq('The most useful piece of advice about invalidation is:',
        [['Prefer a short TTL to clever invalidation', true],
          ['Invalidate on write, from every writer', false],
          ['Use events so caches stay decoupled', false],
          ['Cache only values that rarely change', false]],
        'Simpler and more reliable than a web of invalidations you maintain forever.'),
      mcq('Versioning the cache key rather than deleting it:',
        [['Removes the delete, and so removes the delete failing', true],
          ['Uses less memory than explicit invalidation', false],
          ['Guarantees all caches update together', false],
          ['Avoids the need for a TTL at all', false]],
        'Old keys expire on their own, and an entire class of bug disappears.'),
      mcq('Write-through caching fails when:',
        [['Another writer changes the source directly', true],
          ['The cache write is slower than the database write', false],
          ['Two writers update the same key at once', false],
          ['The value is read before it is written', false]],
        'In any system of age there is always another writer.'),
      mcq('A cache must never be the only copy because:',
        [['It is a database with no durability and an eviction policy', true],
          ['Caches are slower to read than a database', false],
          ['Eviction would make the data inconsistent', false],
          ['Cached data cannot be queried flexibly', false]],
        'A cache must be reconstructible from the source, always.'),
    ],
    checkpoint: [
      mcq('One price change may require invalidating:',
        [['Several caches, and you will forget one', true],
          ['Only the product record itself', false],
          ['The whole cache, to be safe', false],
          ['Nothing, if a TTL is in use', false]],
        'Product page, listing, search, baskets, homepage — one write, six caches.'),
      mcq('Clearing the entire cache on deploy risks:',
        [['The database seeing full traffic with nothing in front of it', true],
          ['Stale values surviving the restart', false],
          ['Keys being versioned inconsistently', false],
          ['A longer deployment window', false]],
        'And it has not seen full traffic in months.'),
      mcq('Caching "not found" results:',
        [['Helps, but can become a denial-of-service vector', true],
          ['Is never worthwhile, since nothing is returned', false],
          ['Requires a longer TTL than positive results', false],
          ['Prevents the key being created later', false]],
        'An attacker requesting arbitrary missing keys fills the cache with nothing.'),
    ],
  },

  {
    unitCode: 'T3_CACHING_NOSQL_NOSQL_TRADEOFFS',
    notes: `"NoSQL is faster" and "NoSQL scales better" are both marketing. Every one of these
stores made **specific trades**, and the useful knowledge is what each gave up and what it
bought.

## What a document store gives you

**Schema flexibility.** Add a field without a migration. Genuinely valuable when the shape is
still moving, and much less valuable than it sounds once it settles — because **the schema does
not disappear, it moves into your application code**, where it is enforced inconsistently by
whoever remembers.

**Documents matching your objects.** An order with its items in one document, read in one
operation. No join, no mapping layer, and that is a real and immediate win when your access
pattern is always "the whole order".

**Horizontal scaling.** Sharding across machines is built in rather than bolted on.

## What it gives up

**Joins.** Fetching a document and then fetching related documents in application code is an
N+1, in a system whose design encourages it. The alternative is duplicating data across
documents, which means updating it in several places — and that is a consistency problem you
now own.

**Transactions across documents.** Modern document stores have them, with limits and costs.
The programming model does not want you to use them.

**Ad-hoc queries.** Relational databases answer questions nobody anticipated. Document stores
are excellent at the access patterns you designed for and awkward at the ones you did not —
and the reporting requirement you have not thought of yet is the one that hurts.

**Constraints.** No foreign keys, usually no check constraints. Everything the
database-constraints unit said about "the database cannot be bypassed" is gone, and validation
is back in application code where another writer can skip it.

## The trade in one sentence

> **Relational buys flexible querying and enforced integrity with a fixed schema and harder
> horizontal scaling. Document buys flexible shape and easy scaling with weaker integrity and
> queries limited to patterns you designed for.**

## When each is right

**Relational**, which is most of the time:

- The data is relational — and almost all business data is.
- You need ad-hoc queries and reporting.
- Integrity matters — money, bookings, anything auditable.
- You do not know all your access patterns yet. **This is the strongest argument and the most
  underrated one.**

**Document:**

- Genuinely document-shaped data: content, logs, events, configuration.
- The access pattern is fixed and known.
- Enormous write volume with simple access.
- The shape varies legitimately between records.

**Key-value:** sessions, caches, feature flags. Get and set by key and nothing else.

## The honest position on scaling

**Postgres on one reasonably sized machine handles more than most applications will ever
need** — tens of thousands of writes per second and terabytes of data. "We chose a document
store because we will need to scale" is a decision made on an assumption that is almost never
tested, and it trades away integrity and query flexibility today for a problem you probably
will not have.

**And the honest position on choosing:** most teams should use the relational database they
already know, until they have a specific problem it cannot solve — stated in numbers.`,
    mcqs: [
      mcq('Schema flexibility in a document store means the schema:',
        [['Moves into the application, enforced inconsistently', true],
          ['Is genuinely no longer needed', false],
          ['Is inferred automatically from the documents', false],
          ['Is validated at write time by the store', false]],
        'It does not disappear; it moves somewhere it is enforced by whoever remembers.'),
      mcq('Duplicating data across documents to avoid joins:',
        [['Creates a consistency problem you now own', true],
          ['Is the recommended pattern with no downside', false],
          ['Costs storage but nothing else', false],
          ['Is prevented by the store’s validation', false]],
        'Updating it in several places, correctly, every time.'),
      mcq('The strongest argument for relational is:',
        [['You do not know all your access patterns yet', true],
          ['It is faster for most workloads', false],
          ['It is more widely understood by teams', false],
          ['It scales further on a single machine', false]],
        'The reporting requirement you have not thought of yet is the one that hurts.'),
      mcq('"We chose a document store because we will need to scale" is weak because:',
        [['One Postgres machine handles more than most applications ever need', true],
          ['Document stores do not scale as claimed', false],
          ['Scaling is cheaper to add later', false],
          ['Horizontal scaling is rarely the bottleneck', false]],
        'It trades integrity and query flexibility today for a problem you probably will not have.'),
    ],
    checkpoint: [
      mcq('What does a document store give up that the constraints unit relied on?',
        [['Enforcement that cannot be bypassed', true],
          ['The ability to store related records', false],
          ['Atomic updates to a single record', false],
          ['Indexing of frequently queried fields', false]],
        'No foreign keys, usually no checks, and validation back in application code.'),
      mcq('Fetching a document and then its related documents is:',
        [['An N+1, in a system whose design encourages it', true],
          ['The intended access pattern for document stores', false],
          ['Equivalent in cost to a relational join', false],
          ['Avoided automatically by the driver', false]],
        'The alternative is duplication, which is the consistency problem again.'),
      mcq('The advice this unit ends on is:',
        [['Use the relational database you know until you have a numbered problem', true],
          ['Choose the store that matches your data shape', false],
          ['Start with a document store and migrate if needed', false],
          ['Use both, for the parts each suits', false]],
        'A specific problem it cannot solve, stated in numbers.'),
    ],
  },
];
