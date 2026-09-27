/**
 * T4_DB_ENGINEERING and T4_API_ENGINEERING — fourteen units. Module P03, days 16-17.
 *
 * ── WHAT SEPARATES THESE FROM THE BRIDGE DAYS THAT COVERED THE SAME WORDS ─────────────────
 *
 * P02's database day taught what a join is. This one is about why a query is slow and what an
 * index costs. P02's API day taught what a status code means. This one is about designing an
 * endpoint that is still correct when the caller is hostile.
 *
 * The distinction is between using the thing and being responsible for it, and it is the
 * distinction a technical round is probing when it moves past the first answer. Anybody can
 * write a join; the follow-up is what separates.
 *
 * ── THE TWO DAYS ARE PAIRED DELIBERATELY ──────────────────────────────────────────────────
 *
 * An endpoint's performance is nearly always a query, and a query's access pattern is nearly
 * always decided by an endpoint. Teaching them on consecutive days lets the API day assume the
 * index discussion, which is where the honest version of "make this faster" lives.
 *
 * ── AUTHENTICATION AND AUTHORIZATION GET ONE UNIT BETWEEN THEM, ON PURPOSE ────────────────
 *
 * Not because they are small, but because the only thing a fourth-year reliably gets wrong is
 * treating them as one question. Two hundred words separating them is worth more than a day
 * spent on token formats, and the security module in P03 covers the rest.
 *
 * Attribution: T4_DB_ENGINEERING defaults to DB_INDEXING with the transactions unit on
 * DB_TRANSACTIONS, the plans unit on QUERY_OPTIMIZATION and the project on DB_DESIGN;
 * T4_API_ENGINEERING to API_DESIGN with the authn/authz unit on AUTHORIZATION, the hostile
 * callers unit on AUTHENTICATION and the project on REST_APIS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BUILD_DATA_BUNDLES: PilotBundle[] = [
  /* ══ T4_DB_ENGINEERING ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_DB_ENGINEERING_SCHEMA_AND_INDEXES',
    notes: `**Normalising far enough and no further**, and the write cost every index quietly
adds.

## What normalisation is actually preventing

**One fact stored in two places, which will disagree.** A customer's address on every order row
means updating an address means updating every order, and missing one means the system now holds
two answers.

**That is the whole argument.** Third normal form is a formalisation of it, and the practical
version — "is this fact stored once?" — catches most of what matters.

## When denormalising is right

**When the read cost is real and the write cost is not.** A count you display on every page,
recomputed from a million rows each time, is a reasonable thing to store — provided you have
decided who updates it and what happens if it drifts.

**Denormalising without answering those two questions is not a trade; it is a bug scheduled for
later.**

## What an index actually is

**A second structure the database maintains alongside your table**, ordered by the column you
named, with pointers back to the rows.

**So reads on that column get fast** — the database can binary search instead of scanning.

**And every write gets slower**, because the index has to be kept correct. An insert now writes
in two places, and so does a delete.

## Which columns deserve one

**Those in a WHERE clause on a large table.** **Those you join on.** **Those you order by, when
the result is large.**

**Not:** a column with two distinct values, where the index cannot narrow anything. **Not:** a
small table, where scanning is faster than the indirection anyway.

## The measurement

**Before and after, on realistic data.** An index that helps on ten thousand rows and hurts on
ten million is not a surprising outcome, and neither is one that the planner declines to use.`,
    mcqs: [
      mcq('The practical argument for normalisation is that duplicating a fact means the copies will:',
        [['Disagree, once one of them is updated', true],
         ['Consume more storage than is strictly needed', false],
         ['Be slower to read than a single copy would be', false],
         ['Require an index on each of the tables involved', false]],
        'Every duplicate is a place an update can be missed, and once one is missed the system holds two answers to the same question.'),
      mcq('Adding an index makes writes slower because each insert or delete must now:',
        [['Update the index as well as the table', true],
         ['Acquire a lock on the entire table being written', false],
         ['Recompute the statistics the planner relies upon', false],
         ['Be checked against the uniqueness of the column', false]],
        'An index is a second ordered structure. Keeping it correct is work paid on every write, which is the cost traded for faster reads.'),
      mcq('A column with only two distinct values is a poor index candidate because the index cannot:',
        [['Narrow the search enough to be worth it', true],
         ['Be built at all on a low-cardinality column', false],
         ['Be used by the planner for equality comparisons', false],
         ['Store pointers back to the rows efficiently here', false]],
        'Matching one of two values still selects roughly half the table, so the indirection costs more than the scan it was meant to avoid.'),
    ],
    checkpoint: [
      mcq('Storing a count that is expensive to recompute is a reasonable trade only once you have decided:',
        [['Who updates it and what happens if it drifts', true],
         ['Which index the stored column will require next', false],
         ['Whether the source rows will ever be deleted', false],
         ['How often the page displaying it is actually loaded', false]],
        'Denormalising without an update path and a drift answer is not a trade at all — it is a second source of truth scheduled to disagree.'),
      mcq('An index that helps at ten thousand rows and hurts at ten million most likely does so because at scale:',
        [['The write cost outgrows the read benefit', true],
         ['The index no longer fits within the available memory', false],
         ['The planner stops recognising the column as indexed', false],
         ['The column’s distribution of values becomes uniform', false]],
        'Write volume typically grows with the table, and an index whose reads were marginal is then paying maintenance on every insert for little gain.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_TRANSACTIONS',
    notes: `**Two writes that must not separate**, and what a partial failure actually looks
like.

## Atomicity, practically

**Both happen or neither does.** Deduct from one account, add to another. If the process dies
between them, without a transaction the money has left one place and arrived nowhere.

**The failure is not theoretical and it is not rare.** Processes are killed, connections drop,
deploys happen mid-request.

## What a transaction does not give you

**Protection from your own logic.** A transaction that commits the wrong values commits them
atomically.

**Protection across systems.** A database transaction cannot roll back an email you sent or a
payment API you called. Anything outside the database is outside the guarantee, which is why
**side effects belong after the commit, not inside it.**

## Isolation, in the terms that matter

**Two transactions running at once can interfere**, and the isolation level decides how much.
The one worth understanding is the lost update: both read a value, both add to it, both write,
and one increment vanishes.

**The fix is not a longer transaction.** It is doing the arithmetic in the database —
\`SET count = count + 1\` rather than reading, adding and writing back — or taking an explicit
lock.

## Keep them short

**A transaction holds locks for its lifetime.** One that spans a network call to a third party
holds them for as long as that takes, and under load the queue behind it is the outage.

## Idempotency, which is the other half

**A retry must not double the effect.** Give the operation a key the caller supplies, record it,
and refuse the second attempt with the same key. **Retries are inevitable; making them safe is a
design decision made once.**`,
    mcqs: [
      mcq('A transaction cannot roll back an email that was sent, which means side effects belong:',
        [['After the commit, not inside the transaction', true],
         ['Inside it, so they share the same atomicity', false],
         ['In a separate transaction opened alongside it', false],
         ['Before it, so that failure prevents the write', false]],
        'The guarantee stops at the database boundary. An external effect triggered inside a transaction happens even when the transaction rolls back.'),
      mcq('Two transactions each read a counter, add one, and write it back. The result is:',
        [['One increment lost', true],
         ['Both increments applied in sequence correctly', false],
         ['An error raised on the second write attempt', false],
         ['A deadlock, which the database then resolves', false]],
        'Both read the same starting value, so the second write overwrites the first. This is the lost update, and it is why read-modify-write is unsafe.'),
      mcq('A transaction that spans a call to a third-party API is dangerous chiefly because it:',
        [['Holds its locks for as long as that call takes', true],
         ['Cannot be rolled back once the call has been made', false],
         ['Exceeds the maximum duration the database permits', false],
         ['Prevents the connection from being reused by others', false]],
        'Locks are held for the transaction’s lifetime. Under load, the queue waiting behind a slow external call is what becomes the outage.'),
    ],
    checkpoint: [
      mcq('The right fix for a lost update is usually to:',
        [['Do the arithmetic in the database itself', true],
         ['Hold the transaction open for a longer period', false],
         ['Retry the operation whenever a conflict occurs', false],
         ['Read the value a second time before writing it', false]],
        'An in-database increment is a single atomic operation with no window between read and write. Reading again merely narrows the window.'),
      mcq('Making an operation idempotent with a caller-supplied key matters because retries are:',
        [['Inevitable, so they must be made safe once', true],
         ['Rare, but expensive when they do occur at all', false],
         ['Configurable, so the count can be set to zero', false],
         ['Only issued by clients that were poorly written', false]],
        'Networks time out and clients retry whether or not you planned for it. Deciding once that a repeat is harmless is cheaper than handling each case.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_QUERY_PLANS',
    notes: `**Why a query is slow, from its plan rather than from guessing.**

## Reading a plan at the level that is useful

**You are looking for three things**, and you do not need to understand the rest:

**A sequential scan on a large table.** The database read every row. Sometimes correct — for a
query returning most of the table it is the fastest option — and usually the answer.

**A row count estimate far from reality.** The planner chose its strategy from that estimate, so
a wrong estimate means a wrong strategy, and the fix is statistics rather than the query.

**A nested loop over a large outer set.** For each of many rows, another lookup. Fine when the
outer set is small and catastrophic when it is not.

## The commonest causes of a scan where an index exists

**A function applied to the column.** \`WHERE lower(email) = ...\` cannot use an index on
\`email\`. The index holds the original values, not the lowered ones.

**A type mismatch.** Comparing an integer column to a string may coerce, and the coercion
frequently disqualifies the index.

**A leading wildcard.** \`LIKE '%smith'\` cannot use an ordered structure, because the ordering
is by the start of the value.

## Fixing without changing the result

**That constraint is the whole exercise.** A faster query returning different rows has not been
optimised; it has been broken.

**So check the row count before and after**, every time. Same count and same rows, or the work
is not done.

## When the fix is not in the query

**Sometimes it is the schema**, sometimes an index, sometimes the query is doing something the
application should not be asking for at all — pagination that fetches everything and discards
most of it, for instance.`,
    mcqs: [
      mcq('`WHERE lower(email) = ...` cannot use an index on the email column because the index holds:',
        [['The original values, not the lowered ones', true],
         ['Only a hash of the value, which differs by case', false],
         ['Pointers, which a function call cannot follow now', false],
         ['A sorted copy that excludes any modified entries', false]],
        'An index is ordered by the stored value. Applying a function produces values the index knows nothing about, so it cannot be used.'),
      mcq('A row count estimate far from reality means the fix is most likely in the:',
        [['Statistics, rather than in the query itself', true],
         ['Index, which is missing on the filtered column', false],
         ['Schema, which stores the data inefficiently here', false],
         ['Query, which requests more rows than it needs to', false]],
        'The planner chose its strategy from the estimate. A wrong estimate means a reasonable planner made an unreasonable choice, and refreshing statistics fixes that.'),
      mcq('A faster query that returns different rows has been:',
        [['Broken, rather than optimised', true],
         ['Optimised, provided the difference is very small', false],
         ['Improved, since speed was the stated objective here', false],
         ['Partially optimised, and needs a correctness pass', false]],
        'Optimisation means the same result computed more cheaply. Changing the result is a different operation and needs a different justification.'),
    ],
    checkpoint: [
      mcq('A nested loop in a plan is catastrophic specifically when the:',
        [['Outer set is large', true],
         ['Inner table has no index on its join column', false],
         ['Two tables are of approximately equal size', false],
         ['Join condition involves more than one column', false]],
        'The inner lookup is repeated once per outer row. With a small outer set that is cheap; with a large one it multiplies into the dominant cost.'),
      mcq('Checking the row count before and after an optimisation is necessary because the constraint being honoured is that the result must be:',
        [['Identical, not merely similar', true],
         ['Produced more quickly than it was before', false],
         ['Ordered the same way it was ordered before', false],
         ['Obtainable without adding any new indexes', false]],
        'The count is the cheapest available check on identity. A change that quietly altered the rows would otherwise be reported as a success.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_DEBUGGING',
    notes: `**Databases that are correct and slow, and databases that are fast and wrong.**

## Slow

**Get the plan first.** Everything else is guessing, and guessing about databases is unusually
unreliable because the planner's decisions are not visible from the query text.

**Then check whether the query is being asked at all sensibly.** The commonest performance fault
in application code is not a slow query — it is a thousand fast ones, issued in a loop, one per
row of a result set. **That is the N+1**, and no amount of indexing fixes it. The fix is to ask
for what you need in one query.

## Wrong

**A join at the wrong level**, inflating an aggregate. Count the rows.

**A NULL comparison** silently excluding rows. Check for \`!=\` against a nullable column.

**A missing ORDER BY**, so "the first row" is whichever the database felt like.

**A transaction boundary in the wrong place**, so a read sees half of somebody else's write.

## The one that looks like corruption

**Two code paths writing the same fact.** The value keeps changing back, and it looks like
something is undoing your write. It is: another path, writing the value it computed before yours.

**This is what denormalising without deciding on an owner produces**, and it is why that decision
is part of the trade rather than an afterthought.

## The technique

**Reproduce with a query, not through the application.** If the query alone is wrong, the
application is innocent and the search has halved.`,
    mcqs: [
      mcq('A thousand fast queries issued one per row of a result set is:',
        [['The N+1, which indexing does not fix', true],
         ['A connection pool problem rather than a query one', false],
         ['Acceptable, since each individual query is fast', false],
         ['Fixed by adding an index on the joined column', false]],
        'The cost is the round trips, not the queries. Each is fast and there are a thousand, so the fix is asking for everything in one.'),
      mcq('A value that keeps reverting after being written most likely indicates:',
        [['Another code path writing the same fact', true],
         ['A transaction that was never actually committed', false],
         ['A cache returning a stale copy of the value', false],
         ['An index that has become inconsistent with the table', false]],
        'Two owners of one fact is what produces this. It looks like corruption and is two code paths each writing what it computed.'),
      mcq('Reproducing a suspected data fault with a query rather than through the application:',
        [['Halves the search by clearing one of the two', true],
         ['Is faster to execute than the application path is', false],
         ['Avoids the caching layer that the application uses', false],
         ['Gives access to the plan, which the application hides', false]],
        'If the query alone is wrong, the application is innocent. If it is right, the fault is above the database, and either answer removes half the problem.'),
    ],
    checkpoint: [
      mcq('Guessing about database performance is unusually unreliable because the planner’s decisions are:',
        [['Not visible from the query text', true],
         ['Different on every execution of the same query', false],
         ['Documented only for the more common query shapes', false],
         ['Made after the results have already been returned', false]],
        'The same SQL can produce entirely different strategies depending on statistics, size and indexes. Only the plan reports which one was chosen.'),
      mcq('"The first row" being inconsistent between runs indicates a query that is missing:',
        [['An ORDER BY, so no order was promised', true],
         ['A LIMIT, which is what selects the first row', false],
         ['An index on the column being selected first', false],
         ['A transaction, so reads are not repeatable here', false]],
        'Without an explicit ordering the engine may return rows in any order, and that order can change with the plan, the cache or the data.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_PRACTICE',
    notes: `**Making queries faster without making them wrong.**

## The routine

**Measure. Get the plan. Change one thing. Measure again. Check the rows are identical.**

Five steps, and the last one is the one that gets skipped. A query that got faster and quietly
returns nine hundred rows where it returned a thousand has not been optimised.

## What is being drilled

**Reading a plan for the three things that matter** — a scan on a large table, a bad estimate, a
nested loop over a large outer set — and ignoring the rest.

**Recognising the disqualifiers.** A function on the column, a type mismatch, a leading
wildcard. Each stops an index being used and each is invisible unless you are looking.

**Noticing the N+1**, which is an application fault wearing a database costume.

## What good looks like

**You can say why it was slow before you change anything.** Optimising by trying things is
slower than reading the plan, and it produces changes nobody can justify afterwards.

## The interview version

**"This query is slow. What do you do?"** The expected first answer is "look at the plan", and
surprisingly few candidates give it. Most begin suggesting indexes, which is an answer to a
question nobody has established yet.`,
    mcqs: [
      mcq('The step most often skipped when optimising a query is:',
        [['Checking the rows returned are identical', true],
         ['Measuring the original query before changing it', false],
         ['Reading the plan before making any modification', false],
         ['Changing only one thing between measurements taken', false]],
        'Speed is what was being pursued, so it is what gets verified. A quietly altered result set is the failure this step exists to catch.'),
      mcq('Asked what to do about a slow query, the expected first answer is:',
        [['Look at the plan', true],
         ['Add an index on the filtered column', false],
         ['Check how large the table has grown to be', false],
         ['Rewrite the query to avoid the join entirely', false]],
        'Everything else is a guess until the plan says what the database actually did. Suggesting an index first answers a question nobody has asked yet.'),
    ],
    checkpoint: [
      mcq('Being able to say why a query was slow before changing anything matters because optimising by trial produces changes that:',
        [['Nobody can justify afterwards', true],
         ['Are slower to arrive at than reading the plan', false],
         ['Tend to break correctness more often than not', false],
         ['Cannot be reverted if they turn out to be wrong', false]],
        'A change made because it happened to help cannot be defended, generalised, or safely carried to the next slow query.'),
      mcq('The N+1 is described as an application fault wearing a database costume because the individual queries are:',
        [['Fast, and there are simply too many of them', true],
         ['Slow, but only because the schema is denormalised', false],
         ['Correct, but issued against the wrong table each time', false],
         ['Cached, so the database never actually executes them', false]],
        'Nothing is wrong with any one query. The fault is the loop that issues them, which lives in the application rather than the database.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_INTERVIEW_QUESTION',
    notes: `**"How would you make this faster?"** — asked about a query, a schema, or an endpoint
that is really a query.

## The order to answer in

**"What does the plan say?"** first, always. It signals that you know the answer is measurable
rather than guessable, and it is the answer most candidates skip.

**Then: what is this query for?** Sometimes the fastest version is not asking it. An endpoint
fetching every row to display twenty of them is a pagination problem, not an index problem.

**Then the specifics.** An index, if a scan is narrowing to few rows. A schema change, if the
same expensive join happens on every request. A cache, if the data is read constantly and
changes rarely — and say what stale means before proposing one.

## The follow-up that is always coming

**"What does that cost?"** Every one of those has a cost, and naming it before being asked is
the strongest move available.

An index costs writes. Denormalising costs consistency. A cache costs correctness for a window
you have to define.

## The trap

**Suggesting a cache first.** It is the answer that sounds sophisticated and defers the problem
rather than solving it, and an interviewer will ask what happens when it is stale. **If you
cannot answer that, the cache was not a proposal.**

## The related question

**"This table has a hundred million rows and queries are slowing down."** Same structure, and the
additional right answer is asking what the access pattern is — because partitioning, archiving
and an index are all correct for different patterns.`,
    mcqs: [
      mcq('The strongest first response to "how would you make this faster" is:',
        [['Asking what the plan says', true],
         ['Proposing an index on the filtered column', false],
         ['Asking how many rows the table currently holds', false],
         ['Suggesting a cache in front of the query result', false]],
        'It signals the answer is measurable rather than guessable, and it is the step most candidates skip in favour of proposing a fix.'),
      mcq('Proposing a cache without saying what stale means is weak because the interviewer will ask:',
        [['What happens when it is stale', true],
         ['How much memory the cache will consume overall', false],
         ['Which caching technology you would choose to use', false],
         ['Whether the cache should be local or distributed', false]],
        'A cache trades correctness for speed over a defined window. Without defining the window, the proposal has not specified what it is trading.'),
      mcq('An endpoint fetching every row to display twenty is best described as:',
        [['A pagination problem, not an index problem', true],
         ['An index problem that pagination would also help', false],
         ['A caching problem, since the rows change rarely', false],
         ['A schema problem caused by a missing relationship', false]],
        'The query is doing work nobody asked for. No index makes fetching a million unwanted rows fast, because the fastest version is not fetching them.'),
    ],
    checkpoint: [
      mcq('Naming the cost of your proposal before being asked is strong because every option here:',
        [['Has one, and most candidates omit it', true],
         ['Is rejected unless its cost is stated upfront', false],
         ['Costs roughly the same amount in practice anyway', false],
         ['Requires approval from somebody else on the team', false]],
        'An index costs writes, denormalising costs consistency, a cache costs correctness. Volunteering the cost shows the trade was understood rather than the fix recalled.'),
      mcq('For a hundred-million-row table, partitioning, archiving and indexing are each correct depending on the:',
        [['Access pattern the queries actually have', true],
         ['Database engine that the system is built on', false],
         ['Rate at which the table is currently growing', false],
         ['Budget available for additional infrastructure', false]],
        'Each addresses a different shape of query. Without knowing which rows are actually wanted, recommending one over another is a guess.'),
    ],
  },
  {
    unitCode: 'T4_DB_ENGINEERING_MINI_PROJECT',
    notes: `**Take a schema and a slow query, and make it fast with the measurements to prove
it.**

## The brief

**Generate a realistic amount of data** — a million rows is enough and is achievable in a few
minutes with a generator script. Ten rows teaches nothing, because at ten rows every strategy is
instant.

**Write a query that is genuinely slow** against it. A join with a filter on an unindexed column
is the standard starting point.

## The work

**Record the plan and the timing.** Then make one change at a time — an index, a rewrite, a
schema adjustment — recording the plan, the timing and the row count after each.

**The row count is the correctness check** and it must not move.

## The part that is easy to skip

**Measure the write cost too.** Time a batch of inserts before and after your index. That number
is the other half of the trade and almost nobody produces it, which is why "add an index" is
offered so freely.

## What to submit

**A table: change, plan summary, read time, write time, row count.** One row per change.

**And a paragraph on which change you would actually keep**, given both columns. Frequently it is
not the one that made reads fastest.

## Why this is the mini project

**Because the whole topic is a trade**, and a trade cannot be understood from one side. Having
measured the write cost once changes how you answer the interview question for the rest of your
career.`,
    assignment: {
      title: 'A slow query, made fast, with both sides measured',
      description: 'Generate realistic data, make a genuinely slow query fast, and measure the write cost as well as the read improvement.',
      instructions: `**Generate realistic data.** A million rows, from a small generator script.
Ten rows teaches nothing because every strategy is instant at that size.

**Write a query that is genuinely slow** against it — a join with a filter on an unindexed
column is a reliable starting point. Record its plan and its timing.

**Then make one change at a time**: an index, a rewrite, a schema adjustment. After each, record
the plan, the read timing, and the row count. **The row count must not move** — that is the
correctness check, and a faster query returning different rows has been broken rather than
optimised.

**Measure the write cost too.** Time a batch of inserts before and after each index. This is the
half almost nobody produces, and it is why "add an index" is offered so freely.

**Submit:** the generator script, the queries, a table with one row per change giving the change,
a plan summary, the read time, the write time and the row count, and a paragraph on which change
you would actually keep given both columns. It is frequently not the one that made reads fastest.`,
      rubric: [
        { criterion: 'Realistic data volume', description: 'Enough rows that the strategies actually differ, produced by a script that is submitted with the work.', maxPoints: 20 },
        { criterion: 'Both sides measured', description: 'Read timings and write timings are both recorded, before and after each change.', maxPoints: 30 },
        { criterion: 'Correctness held', description: 'Row counts are reported after every change and are unchanged throughout.', maxPoints: 25 },
        { criterion: 'A justified recommendation', description: 'The final paragraph chooses a change on the basis of both columns rather than on read speed alone.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Generating a million rows rather than ten matters because at ten rows:',
        [['Every strategy is instant, so nothing is learned', true],
         ['The planner refuses to build an index at all', false],
         ['The measurements are dominated by network latency', false],
         ['Transactions behave differently than they would at scale', false]],
        'Strategy differences only appear when the work is large enough to measure. Small data makes a scan and an index lookup indistinguishable.'),
      mcq('Measuring the write cost is described as the half almost nobody produces, which is why:',
        [['"Add an index" is offered so freely', true],
         ['Indexes are added more often than they are removed', false],
         ['Write performance is rarely a real constraint here', false],
         ['Database documentation omits the write cost entirely', false]],
        'The read benefit is visible immediately and the write cost is spread across every future insert, so only one side of the trade is ever seen.'),
      mcq('The change you would actually keep is frequently not the one that made reads fastest because:',
        [['The read gain may not justify the write cost', true],
         ['The fastest change is usually the hardest to maintain', false],
         ['Planners eventually stop choosing the fastest strategy', false],
         ['Read speed matters less than correctness in all cases', false]],
        'A large read improvement bought with a large write penalty is a bad trade on a write-heavy table, and that only becomes visible once both are measured.'),
    ],
  },

  /* ══ T4_API_ENGINEERING ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_API_ENGINEERING_DESIGNING_AN_ENDPOINT',
    notes: `**An endpoint whose errors are as usable as its successes**, which is where most API
design actually fails.

## Four decisions, made deliberately

**The resource.** A noun, plural, and stable. \`/orders/4471\`. Not \`/getOrder?id=4471\`, which
puts the verb in two places and the identifier somewhere a cache cannot see it.

**The method.** GET reads and changes nothing. POST creates. PUT replaces the whole thing. PATCH
changes part. DELETE removes. **The meanings are not suggestions** — caches, retries and crawlers
all rely on them.

**The status code.** 200 for a read, 201 with a location for a creation, 204 when there is
genuinely nothing to return, 400 for a malformed request, 404 for a thing that is not there, 409
for a conflict with current state.

**The error body.** One shape, used everywhere. A code the client can branch on, a message a
human can read, and — where it applies — which field was wrong.

## Why the error shape matters more than the success shape

**Because every client has to handle it and nobody documents it.** An API returning a bare string
on one error, a JSON object on another and an HTML page on a third forces every caller to write
defensive parsing, and they will get it wrong.

**One shape, always, including for unexpected failures.**

## Versioning, briefly

**Adding a field is safe.** Removing one, renaming one, or changing a type is not, and needs a
new version or a deprecation period.

**Clients should ignore fields they do not recognise**, which is what makes the first case safe —
and you cannot rely on every client doing so, which is why the second case needs the version.`,
    mcqs: [
      mcq('`/getOrder?id=4471` is worse than `/orders/4471` partly because it puts the identifier:',
        [['Somewhere a cache cannot easily see it', true],
         ['In a position that is harder for clients to build', false],
         ['After the verb, which reverses the reading order', false],
         ['In a query string, which has a length limit set', false]],
        'Path segments identify resources and are cached as such. A query parameter is less usefully addressable, and the verb duplicates the method.'),
      mcq('Returning a different error shape for different failures forces every caller to:',
        [['Write defensive parsing, and get it wrong', true],
         ['Handle each of the status codes individually', false],
         ['Retry until a recognisable shape is returned', false],
         ['Log the raw response rather than interpreting it', false]],
        'The client cannot know which shape is coming, so it must handle all of them. One consistent shape removes that burden entirely.'),
      mcq('Adding a field to a response is safe because clients are expected to:',
        [['Ignore fields they do not recognise', true],
         ['Validate the response against a published schema', false],
         ['Request a specific version for every call made', false],
         ['Re-read the documentation before each release', false]],
        'Tolerant reading is what makes backwards-compatible evolution possible. Removals and renames break that, which is why they need a version.'),
    ],
    checkpoint: [
      mcq('201 differs from 200 in that 201 additionally implies:',
        [['Something was created, and says where', true],
         ['The request took longer than a read would have', false],
         ['The response body contains the full new resource', false],
         ['The operation is safe to repeat with the same body', false]],
        'It reports a creation and carries a location for the new resource, which a plain 200 does not commit to either way.'),
      mcq('The error shape matters more than the success shape chiefly because it is:',
        [['Handled by every client and documented by nobody', true],
         ['Returned more frequently than success in practice', false],
         ['Harder to design correctly than a success body', false],
         ['The only part of the API that clients can rely on', false]],
        'Success shapes get documented and exercised. Error shapes are discovered in production by each client separately, which is where the cost lands.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_AUTHN_VERSUS_AUTHZ',
    notes: `**Who you are, and what you may do.** Two questions, and the only thing a fourth-year
reliably gets wrong is treating them as one.

## The split

**Authentication establishes identity.** A token, a session, a signature. It answers "who is
calling". Failing it is a **401**.

**Authorization establishes permission.** This identity, this action, this object. Failing it is
a **403**.

**A system can be perfectly authenticated and completely unauthorised.** Every logged-in user is
authenticated; almost none of them may delete your order.

## The bug this distinction prevents

**Checking identity and forgetting the object.**

    GET /orders/4471

The caller is authenticated. The handler loads order 4471 and returns it. **Nobody asked whether
4471 belongs to this caller.** Change the number and you have somebody else's order.

**This is the single most common real vulnerability in student projects and in production
systems**, and it has a name — insecure direct object reference — because of how often it occurs.

## Where the check belongs

**On the server, beside the data access.** Not in the interface, which only decides what to
display; not in the client, which the caller controls entirely.

**The reliable pattern is to make it impossible to skip:** load the object scoped to the caller
in the first place. \`orders.where(id=4471, customer=caller)\` returns nothing for the wrong
caller, and there is no separate check to forget.

## Roles are not the whole answer

**"Admins may do anything" is a role check** and covers the coarse cases. **Ownership is a
per-object question** and no role list answers it.`,
    mcqs: [
      mcq('An authenticated caller requests `/orders/4471`, which belongs to somebody else, and receives it. The missing check was:',
        [['Authorization for that specific object', true],
         ['Authentication, which the token failed to establish', false],
         ['Rate limiting, which would have blocked the probing', false],
         ['Input validation on the identifier in the path', false]],
        'Identity was established and permission was never asked. This is insecure direct object reference, and it is among the most common real vulnerabilities.'),
      mcq('Loading an object scoped to the caller rather than loading it and then checking is preferred because it:',
        [['Cannot be forgotten on a new code path', true],
         ['Performs better than a separate check would', false],
         ['Returns a clearer error message to the caller', false],
         ['Allows the check to be tested independently', false]],
        'A separate check is a step somebody can omit when adding an endpoint. Scoping the query makes the wrong answer unreachable rather than merely forbidden.'),
      mcq('A role check such as "admins may do anything" does not cover ownership because ownership is:',
        [['A per-object question no role list answers', true],
         ['Checked by the authentication layer rather than roles', false],
         ['Only relevant for users who lack any role at all', false],
         ['Enforced by the database rather than the application', false]],
        'Roles describe categories of user. Whether this particular record belongs to this particular caller is a fact about the data, not about the role.'),
    ],
    checkpoint: [
      mcq('The correct status code when a known caller may not perform an action is:',
        [['403, because identity was established', true],
         ['401, because the request must be authenticated', false],
         ['404, to avoid revealing that the object exists', false],
         ['400, because the request was not a valid one', false]],
        '401 invites the caller to identify themselves; 403 says identity was established and is insufficient. Using 401 here sends them to re-authenticate pointlessly.'),
      mcq('Putting an authorization check only in the interface fails because the interface:',
        [['Only decides what to display, not what is allowed', true],
         ['Runs too late in the request to prevent the action', false],
         ['Cannot access the information needed to decide it', false],
         ['Is shared between users with different permissions', false]],
        'The client is under the caller’s control and the API can be called directly. A hidden button is a presentation choice, not a control.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_HOSTILE_CALLERS',
    notes: `**Still correct when the caller is confused, or hostile.** These are the same problem
and the second is just the first done deliberately.

## What arrives that you did not plan for

**A missing required field.** **A field of the wrong type** — a string where a number belongs, an
array where an object does. **An extra field** you have never heard of. **A number far outside
any sensible range**, including negative where only positive makes sense. **A body that is not
valid JSON at all.** **No body, on a request that requires one.**

**Every one of those arrives in production within the first week.**

## Validate at the boundary, once

**One place per endpoint, before any logic runs.** A schema, a validation library, or explicit
checks — the mechanism matters far less than there being exactly one of them.

**Scattered validation is what produces an endpoint that is safe on three paths and not the
fourth**, and finding which is nobody's idea of an afternoon.

## Reject with something usable

**Which field, and what was wrong with it.** "Invalid request" costs the caller an hour of
guessing and costs you a support conversation.

**Do not echo the value back in the error** without thought — that is how a malicious payload
ends up rendered in somebody's log viewer or admin panel.

## The limits nobody sets until it hurts

**A maximum body size.** Without one, a caller can send a gigabyte.

**A maximum page size.** \`?limit=1000000\` is a denial of service you built yourself.

**A rate limit.** The cheapest protection there is against both abuse and a buggy client in a
retry loop.

## The principle underneath

**Never trust the client**, and that includes your own. Your mobile app is a client, it can be
old, it can be modified, and it can have a bug that sends the same request nine hundred times.`,
    mcqs: [
      mcq('`?limit=1000000` with no maximum page size is best described as:',
        [['A denial of service you built yourself', true],
         ['A performance problem to address when it occurs', false],
         ['A client error that should return a 400 response', false],
         ['Acceptable, since few callers will actually use it', false]],
        'One request can exhaust memory or hold a connection indefinitely. The limit costs one line and removes the whole category.'),
      mcq('Scattered validation across an endpoint’s code paths produces an endpoint that is:',
        [['Safe on three paths and not the fourth', true],
         ['Slower, because checks are repeated unnecessarily', false],
         ['Harder to document for the callers who use it', false],
         ['Inconsistent in the error messages it returns', false]],
        'Each path was written separately and one was written without the check. Validating once at the boundary makes the unchecked path impossible.'),
      mcq('Echoing a rejected value back in an error message without thought risks the payload being:',
        [['Rendered in a log viewer or admin panel', true],
         ['Stored permanently in the application database', false],
         ['Retried automatically by the offending client', false],
         ['Interpreted as valid input on the second attempt', false]],
        'Error text is read by humans in tools that may render it. A malicious payload reflected there reaches an audience the endpoint never intended.'),
    ],
    checkpoint: [
      mcq('"Never trust the client" includes your own mobile app because it:',
        [['Can be old, modified, or simply buggy', true],
         ['Is written by a different team within the company', false],
         ['Communicates over a network you do not control', false],
         ['Cannot be updated as quickly as the server can be', false]],
        'Old versions stay installed, binaries can be modified, and a retry bug ships like any other. First-party does not mean well-behaved.'),
      mcq('An error saying "invalid request" without naming the field costs the caller:',
        [['An hour of guessing, and you a support conversation', true],
         ['Nothing, since the request must be corrected anyway', false],
         ['A retry, which will fail in exactly the same manner', false],
         ['Access to the endpoint until the issue is resolved', false]],
        'The server already knows which field failed and why. Withholding it converts a five-second fix into an investigation for somebody else.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_DEBUGGING',
    notes: `**Endpoints that work for you and not for the caller.**

## Split it in two, immediately

**Reproduce with curl.** If curl works and the client does not, the difference is in what the
client sent. If curl fails too, the endpoint is at fault and the client is innocent.

**That one step halves the problem** and takes thirty seconds, and it is skipped constantly.

## What the difference usually is

**A header.** Content-Type, Accept, or an authorization header that is present in one and not the
other.

**Encoding.** A form body labelled as JSON, or a JSON body sent as form data.

**A field name.** \`user_id\` against \`userId\`. The server reports a missing required field,
which is accurate and unhelpful.

**An environment.** The client is pointing at staging, or at a cached DNS entry for the old host.

## Faults on the server side

**The 500 that is actually a 400.** An unhandled exception caused by bad input. The caller sees
a server error, retries, and gets it again — and the log says nothing because the handler died
before logging anything useful.

**The endpoint that works alone and fails under concurrency.** Shared state, a connection not
returned to the pool, a non-idempotent operation being retried.

## Log enough to answer the question later

**Method, path, status, duration, and a request id.** Without those four you cannot answer "what
happened to my request at 14:02", which is the question you will be asked.

**And log the request id back to the caller in the response**, so they can quote it. That single
habit turns a support conversation from an investigation into a lookup.`,
    mcqs: [
      mcq('curl succeeds where the client fails, with the same URL and body. The difference is therefore in:',
        [['The headers the client is sending', true],
         ['The server, which treats clients differently', false],
         ['The network path between client and server', false],
         ['The response, which the client misinterprets', false]],
        'Same URL and same body leaves headers as the remaining variable, and Content-Type or an authorization header is nearly always the one.'),
      mcq('A 500 caused by bad input is worse than a 400 for the caller because they will:',
        [['Retry, and receive exactly the same failure', true],
         ['Be unable to see any error message at all', false],
         ['Have their request logged as a server incident', false],
         ['Be rate limited after several failed attempts', false]],
        '5xx signals a transient server problem, so a well-behaved client retries. The input is still wrong, so the retry fails identically and wastes both sides.'),
      mcq('Returning the request id to the caller in the response turns a support conversation into:',
        [['A lookup rather than an investigation', true],
         ['A faster escalation to the responsible team', false],
         ['An automated process requiring no human at all', false],
         ['A shorter exchange about reproduction steps', false]],
        'With the id quoted, the exact request is found immediately. Without it, the first hour is spent establishing which request is being discussed.'),
    ],
    checkpoint: [
      mcq('An endpoint that works alone and fails under concurrency most likely involves:',
        [['Shared state or a non-idempotent retry', true],
         ['A database index that is missing on a key column', false],
         ['A timeout that is set too low for the workload', false],
         ['Validation that is too strict for parallel requests', false]],
        'Concurrency exposes assumptions about exclusive access. Shared mutable state and operations that cannot safely repeat are the two standard causes.'),
      mcq('The four things worth logging on every request are method, path, status and:',
        [['A duration and a request id to correlate by', true],
         ['The full request body for later reproduction', false],
         ['The authenticated user’s complete profile data', false],
         ['The name of the server that handled the call', false]],
        'Duration finds the slow ones and the id joins the lines belonging to one request. The body risks logging secrets and is rarely needed in full.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_PRACTICE',
    notes: `**Endpoints written to be called by somebody who is wrong.**

## What is being drilled

**Validating once, at the boundary**, until doing it anywhere else feels odd.

**Choosing the status code from what actually happened**, rather than returning 200 with an
error inside the body — which is a surprisingly common habit and defeats every piece of
tooling that reads status codes.

**Scoping data access to the caller**, so the authorization check cannot be forgotten.

## The exercises

Each gives you a working endpoint and a list of things a caller might send. **Make it correct for
all of them**, and correct means a sensible status and a usable message, not merely "does not
crash".

## The habit that carries

**Write the error cases first.** Decide what 400 means for this endpoint, what 404 means, what
409 means, before writing the success path. The success path is usually the easy part and it is
what everybody writes first, which is why the error paths end up improvised.

## Time yourself

**These are small.** Slowness here is usually re-deciding the error shape for each endpoint, which
is itself the lesson: decide the shape once for the whole API and reuse it.`,
    mcqs: [
      mcq('Returning 200 with an error inside the body defeats tooling because monitoring and clients branch on:',
        [['The status code, which now says success', true],
         ['The response time, which is unaffected by errors', false],
         ['The content type, which remains JSON regardless', false],
         ['The request path, which does not indicate failure', false]],
        'Proxies, dashboards, retry logic and alerting all read the status. Hiding a failure behind 200 makes it invisible to every one of them.'),
      mcq('Writing the error cases before the success path is recommended because the success path is:',
        [['The easy part, and is written first by everybody', true],
         ['Dependent on the errors being defined beforehand', false],
         ['Harder to change once the errors are in place', false],
         ['Usually specified more precisely by the requirements', false]],
        'Because it is easy and obvious it gets all the attention, and the error paths are then improvised at the end under time pressure.'),
    ],
    checkpoint: [
      mcq('"Correct for a bad request" means a sensible status and a usable message rather than:',
        [['Merely not crashing', true],
         ['Returning the same shape as a successful call', false],
         ['Logging the failure for later investigation', false],
         ['Rejecting the request before it reaches any logic', false]],
        'Not crashing is the floor. The caller needs to know what was wrong and what to change, which is what makes the response usable.'),
      mcq('Re-deciding the error shape for each endpoint is slow, and the lesson is to decide it:',
        [['Once for the whole API, and reuse it', true],
         ['Per resource, so each one can be tailored to it', false],
         ['At the client, which knows what it needs to see', false],
         ['Late, once the endpoints have all been written', false]],
        'One shape everywhere is what lets every caller write the handling once. Per-endpoint shapes are the cost that falls on everybody downstream.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_INTERVIEW_QUESTION',
    notes: `**"Design an endpoint for X."** Nearly always the warm-up before a system-design round,
and it is scored on completeness rather than cleverness.

## Cover these, in this order

**The resource and the method.** Say the path aloud. \`POST /orders\`.

**The request.** What is required, what is optional, what types.

**The success response.** Status, and what comes back. 201 and the created resource, with its
location.

**The errors.** This is the part that separates candidates. What does a malformed body return?
A valid body referring to a product that does not exist? A duplicate submission? **Name three
error cases unprompted and you are ahead of most people in the process.**

**Authorization.** Who may call this, and — critically — which objects may they affect. Say the
ownership check out loud.

**One operational concern.** Rate limiting, idempotency, or a page size limit. Any one of them
signals you have run something in production or have thought about what happens when you do.

## The follow-ups that are coming

**"What if the client retries?"** Idempotency key. Have the answer ready; it is asked almost
every time for anything that creates.

**"What if there are a million of these?"** Pagination with a maximum, and a cursor rather than
an offset if the data changes while they page.

**"How would you change it without breaking existing clients?"** Add fields, never remove or
rename; version when you must.

## The failure mode

**Designing only the happy path and stopping.** It takes ninety seconds and leaves two thirds of
the question unanswered, and the interviewer is unlikely to prompt for all of it.`,
    mcqs: [
      mcq('The part of an endpoint design answer that most separates candidates is:',
        [['Naming several error cases unprompted', true],
         ['Choosing the most appropriate resource name', false],
         ['Explaining the serialisation format to be used', false],
         ['Describing the database schema behind the endpoint', false]],
        'The happy path is quick and everybody gives it. Error cases are where thought is visible, and most candidates wait to be asked.'),
      mcq('"What if the client retries?" is asked almost every time for anything that creates, and the expected answer is:',
        [['An idempotency key supplied by the caller', true],
         ['A rate limit that prevents rapid repeat calls', false],
         ['A unique constraint that rejects the second one', false],
         ['A timeout long enough that retries are unnecessary', false]],
        'A caller-supplied key lets the server recognise a repeat and return the original result, which is the only approach that is safe across network failures.'),
      mcq('Changing an endpoint without breaking existing clients means you may:',
        [['Add fields, but not remove or rename them', true],
         ['Rename fields, provided the types are unchanged', false],
         ['Remove optional fields that nobody is using now', false],
         ['Change a field’s type if the values still parse', false]],
        'Tolerant clients ignore unknown fields, so additions are safe. Anything a client currently reads is part of the contract until a version says otherwise.'),
    ],
    checkpoint: [
      mcq('Mentioning rate limiting, idempotency or a page size limit signals that a candidate has:',
        [['Thought about what happens in production', true],
         ['Memorised a checklist of API design concerns', false],
         ['Worked on a system with unusually high traffic', false],
         ['Read the specification for the HTTP protocol', false]],
        'These are the concerns that only become obvious once something is running and being called by people you do not control.'),
      mcq('Designing only the happy path fails chiefly because the interviewer is:',
        [['Unlikely to prompt for all the remaining parts', true],
         ['Specifically assessing the error handling only', false],
         ['Required to score each section of the answer', false],
         ['Expecting the answer to take a set amount of time', false]],
        'The question is open and completeness is part of what is scored. Waiting to be asked means the unasked parts are simply missing.'),
    ],
  },
  {
    unitCode: 'T4_API_ENGINEERING_MINI_PROJECT',
    notes: `**Build an API that survives a caller trying to break it.**

## The brief

**Three or four endpoints over a real schema**, with authentication, ownership-scoped
authorization, and one consistent error shape.

**Then write the client that attacks it**, which is the actual exercise.

## The attack script

**A script that sends everything wrong you can think of**, and asserts the response:

Missing fields. Wrong types. A negative quantity. A gigantic page size. A body that is not JSON.
Another user's object id. **No token, an expired token, and somebody else's token.** The same
create request twice.

**Each of those should produce a specific status and a usable message**, and your script asserts
which. That makes it a test suite rather than a demonstration.

## What you will find

**The ownership check you forgot on one endpoint.** Almost everybody has one, which is why the
script tests every endpoint with another user's id rather than just the obvious one.

**The 500 that should be a 400.** An unhandled exception on malformed input.

**The endpoint that happily accepts a negative number** and produces a nonsensical total.

## What to submit

**The API, the attack script, and a note on what the script found on its first run** — before you
fixed anything.

**That first-run list is the most valuable part of the submission**, and the temptation to fix
quietly and report a clean run is exactly what to resist.`,
    assignment: {
      title: 'An API, and the client that attacks it',
      description: 'Build a small authenticated API with ownership-scoped authorization, then write a script that attacks it and assert every response.',
      instructions: `**Build three or four endpoints over a real schema**, with authentication,
authorization scoped to object ownership, and one consistent error shape used everywhere.

**Then write the client that attacks it.** A script that sends everything wrong you can think of
and asserts the response status and body for each: missing fields, wrong types, a negative
quantity, a huge page size, a body that is not JSON, another user's object id, no token, an
expired token, somebody else's token, and the same create request twice.

Asserting the responses is what makes it a test suite rather than a demonstration. **Test every
endpoint with another user's id**, not just the obvious one — the forgotten ownership check is
almost never on the endpoint you would guess.

**Submit:** the API, the attack script, and a note listing what the script found on its **first
run, before you fixed anything**. That list is the most valuable part of the submission, and
fixing quietly to report a clean first run is exactly what to resist.`,
      rubric: [
        { criterion: 'Ownership-scoped authorization', description: 'Data access is scoped to the caller rather than checked separately, and every endpoint is exercised with another user’s identifier.', maxPoints: 30 },
        { criterion: 'One consistent error shape', description: 'Every failure, including unexpected ones, returns the same structure with a usable message.', maxPoints: 20 },
        { criterion: 'The attack script asserts', description: 'Each hostile request has an expected status and body that the script checks, rather than merely being sent.', maxPoints: 30 },
        { criterion: 'The first-run findings are reported', description: 'The note lists what was actually broken before fixing, honestly, rather than presenting a clean run.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The attack script tests every endpoint with another user’s id rather than only the obvious one because the forgotten check is:',
        [['Almost never on the endpoint you would guess', true],
         ['Usually on the endpoint that was written first', false],
         ['Only detectable when several are tested at once', false],
         ['Present on every endpoint until it is added once', false]],
        'The obvious endpoint gets the attention and the check. It is the secondary one, added later in a hurry, that goes without.'),
      mcq('Reporting what the script found on its first run, before fixing, is the most valuable part because it shows:',
        [['What was genuinely wrong rather than a clean result', true],
         ['How quickly the problems were subsequently resolved', false],
         ['That the script was written before the API was built', false],
         ['The total number of test cases the script contains', false]],
        'A clean run proves only that the script and the code agree now. The first-run list is evidence the script was capable of finding something.'),
      mcq('Asserting the response rather than merely sending the request is what makes the script:',
        [['A test suite rather than a demonstration', true],
         ['Faster to run against a deployed environment', false],
         ['Capable of running without a live database present', false],
         ['Reusable against other APIs with similar endpoints', false]],
        'Sending hostile input shows the server does not crash. Asserting the status and message shows it responded correctly, which is the actual requirement.'),
    ],
  },
];
