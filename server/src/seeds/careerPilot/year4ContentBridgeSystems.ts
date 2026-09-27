/**
 * T4_BR_DATABASE, T4_BR_WEB_API, T4_BR_ENGINEERING and T4_BR_INTEGRATION — sixteen units.
 * Module P02, days 7-10. This completes the ten-day bridge.
 *
 * ── DAY 10 IS THE ONLY ONE THAT BUILDS ANYTHING ───────────────────────────────────────────
 *
 * Nine days of repair and one day of assembly, and the ratio is deliberate. A bridge that ended
 * each topic with a mini project would spend the whole ten days on three of them; a bridge that
 * never assembled anything would leave a student who can answer questions about four subjects
 * and has not once had to make them work together.
 *
 * T4_BR_INTEGRATION is therefore the only PROJECT unit in P02, and it is the one that decides
 * whether the bridge worked. Somebody who can write a query, call an API, commit on a branch and
 * write a test, but cannot make one small thing that does all four, has not finished the bridge
 * whatever their four topic checkpoints said.
 *
 * ── WHY THE DATABASE AND API DAYS ARE NOT "WEB DEVELOPMENT" ───────────────────────────────
 *
 * Every direction needs them. A data student queries, an ML student calls an inference endpoint,
 * a security student attacks both, and a mobile student talks to a server. Nothing in these two
 * days is framework-specific for that reason — a request, a response, a status code, a join and
 * a transaction are what the rest of Year 4 assumes, and they are assumed of everybody.
 *
 * ── THE ENGINEERING DAY IS ABOUT RECOVERY, NOT COMMANDS ───────────────────────────────────
 *
 * Git, testing and the shell are each worth a term on their own and get a third of a day here.
 * What that third is spent on is the part a student is actually stuck by: the commands that get
 * you out of trouble, the test that fails for the right reason, and enough shell to run things
 * and read what they printed. Not the full command surface, which is looked up and always will be.
 *
 * Attribution: T4_BR_DATABASE defaults to SQL_BASICS with JOINS on SQL_JOINS; T4_BR_WEB_API to
 * HTTP with REST_AND_JSON on REST_APIS; T4_BR_ENGINEERING to GIT_FUNDAMENTALS with its units
 * spread across GIT_BRANCHING, TESTING_FUNDAMENTALS and SHELL_COMMANDS; T4_BR_INTEGRATION to
 * PROBLEM_SOLVING with DEBUGGING_IT on DEBUGGING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BRIDGE_SYSTEMS_BUNDLES: PilotBundle[] = [
  /* ══ T4_BR_DATABASE ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_DATABASE_TABLES_AND_ROWS',
    notes: `**A key is a promise**, and most database confusion is a promise that was never made.

## What a primary key actually guarantees

**That this value identifies exactly one row, and is never null.** That is the whole promise, and
everything else — joins, updates, deletes that hit one row — depends on it.

**Without one, there is no way to name a row.** An UPDATE with no unique identifier either
changes several rows or changes none, and which of those happened is not obvious afterwards.

## The four operations

\`INSERT\`, \`SELECT\`, \`UPDATE\`, \`DELETE\`. Everything else is a variation.

**Two of them are dangerous without a WHERE clause**, and the danger is asymmetric: an UPDATE or
DELETE that matches everything cannot be undone by running it again.

## NULL is not a value

\`NULL = NULL\` is not true. It is unknown, which is neither true nor false, and comparisons
involving it quietly drop rows from results. **\`WHERE status != 'done'\` does not return rows
where status is NULL**, which surprises everybody exactly once.

Use \`IS NULL\` and \`IS NOT NULL\`, which are the only comparisons that behave.

## Counting

\`COUNT(*)\` counts rows. \`COUNT(column)\` counts rows where that column is not null. **They
differ, and the difference is usually the answer to "why is my total wrong".**`,
    mcqs: [
      mcq('`WHERE status != \'done\'` omits rows whose status is NULL because NULL comparisons are:',
        [['Unknown, which is neither true nor false', true],
         ['False, so the row is excluded from the results', false],
         ['True, but the row is filtered out at a later stage', false],
         ['Errors, which the engine suppresses and skips over', false]],
        'Three-valued logic means a comparison with NULL yields unknown, and only rows where the condition is true are returned.'),
      mcq('`COUNT(*)` and `COUNT(column)` differ by the number of rows where that column is:',
        [['Null, which COUNT(column) does not count', true],
         ['Zero, which is treated as absent by the count', false],
         ['Duplicated, since COUNT(column) removes duplicates', false],
         ['Empty text, which counts as missing for this purpose', false]],
        'COUNT of an expression counts non-null results. It is the standard cause of two totals from the same table disagreeing.'),
      mcq('An UPDATE with no WHERE clause is more dangerous than a SELECT with none because it:',
        [['Cannot be undone by running it again', true],
         ['Locks the table for much longer than a read does', false],
         ['Returns no output, so the mistake is not visible yet', false],
         ['Affects the indexes as well as the row data itself', false]],
        'A read with no filter is merely noisy. A write with none has replaced the previous values, and nothing in the statement remembers them.'),
    ],
    checkpoint: [
      mcq('A table has no primary key and an UPDATE is needed for one specific row. The problem is that:',
        [['There is no reliable way to name that row', true],
         ['Updates are forbidden on tables without a key set', false],
         ['The update will be slower than it needs to be here', false],
         ['The row cannot be read back after it is updated now', false]],
        'Identifying a row is what the key is for. Without it the WHERE clause matches on data that may not be unique, so the update is a guess.'),
      mcq('Two reports of the same table disagree on a total. The first thing to compare is whether they used:',
        [['COUNT(*) or COUNT of a nullable column', true],
         ['The same ordering when reading through the table', false],
         ['The same database connection to run their queries', false],
         ['An index, which can change the totals that are seen', false]],
        'It is the most common cause by a distance, and it is invisible unless somebody checks which form of COUNT each report used.'),
    ],
  },
  {
    unitCode: 'T4_BR_DATABASE_JOINS',
    notes: `**More rows than you expected means the join condition was wrong**, and it is the
single most common SQL bug in a placement submission.

## Why the count goes up

**A join produces one row per matching PAIR.** A customer with three orders appears three times.
That is correct, and it means any \`SUM\` over customer columns afterwards has tripled that
customer's contribution.

**The fix is not to remove duplicates.** It is to aggregate at the right level, or to join to an
already-aggregated subquery.

## Inner against left

**Inner keeps only rows that matched.** A customer with no orders disappears entirely, which is
right for "customers who ordered" and wrong for "orders per customer, including zero".

**Left keeps everything on the left, with NULLs where nothing matched.** Then
\`COUNT(orders.id)\` gives 0 for those customers and \`COUNT(*)\` gives 1, which is the trap.

## The habit

**Count the rows before and after.** If the count changed and you did not expect it to, stop.
Thirty seconds now, against an hour of wondering why a total is 40% too high.

## Joining on the wrong column

**Produces either far too many rows or none at all**, and the second is easier to notice. Zero
rows from a join that should return data is almost always a type mismatch or a column that names
something else entirely.`,
    mcqs: [
      mcq('After joining customers to orders, a SUM over a customer column is too high. The cause is that each customer row:',
        [['Repeats once per order that matched it', true],
         ['Is counted twice because of the join’s direction', false],
         ['Includes orders from other customers in its total', false],
         ['Is duplicated by an index used to satisfy the join', false]],
        'The join multiplies the customer row by its matching orders, so anything summed from the customer side is multiplied with it.'),
      mcq('A LEFT JOIN is used to count orders per customer, including those with none. `COUNT(*)` returns 1 for those customers because:',
        [['The row exists, with NULLs on the right side', true],
         ['COUNT(*) treats a null row as a single valid match', false],
         ['The left join inserts a placeholder row for each one', false],
         ['COUNT(*) counts customers rather than orders in this case', false]],
        'LEFT JOIN keeps the left row and fills the right with NULLs. COUNT(*) counts that row; COUNT(orders.id) correctly reports zero.'),
      mcq('A join that should return data returns no rows at all. The likeliest cause is:',
        [['The join condition names columns that do not correspond', true],
         ['A missing index, which prevents the match being found', false],
         ['The tables being too large for the join to complete now', false],
         ['A WHERE clause applied before the join is carried out', false]],
        'Zero rows means nothing matched, which is usually a type mismatch or a column that happens to have a plausible name and different contents.'),
    ],
    checkpoint: [
      mcq('The row count changed unexpectedly after adding a join. The correct response is to:',
        [['Stop and find out why before going further', true],
         ['Add DISTINCT, which removes the extra rows again', false],
         ['Continue, since the extra rows are usually harmless', false],
         ['Switch to a left join, which preserves the count here', false]],
        'DISTINCT hides the symptom and can remove legitimately distinct rows. The count changing is information about the join, not noise.'),
      mcq('"Customers who have never ordered" requires:',
        [['A left join, filtered to where the right is null', true],
         ['An inner join, which excludes the matched customers', false],
         ['A right join from orders back to the customers table', false],
         ['Two queries, since one join cannot express this at all', false]],
        'The left join keeps every customer and NULLs mark the ones with no match. Filtering on that NULL is the standard anti-join idiom.'),
    ],
  },
  {
    unitCode: 'T4_BR_DATABASE_DEBUGGING',
    notes: `**Queries that return the wrong rows without complaining.**

## The four symptoms

**Too many rows.** A join multiplying, or a missing condition. Count before and after.

**Too few rows.** An inner join where a left was needed, or a NULL comparison quietly excluding
things.

**A wrong total.** Almost always the "too many rows" case one step later, after an aggregate has
been applied on top of the duplication.

**Right rows, wrong order.** No \`ORDER BY\`. A database returns rows in whatever order is
convenient, and that order can change between runs on the same data.

## The technique

**Take the aggregate off and look at the rows.** A \`SUM\` that is wrong tells you nothing; the
forty rows it summed tell you everything, and usually at a glance.

**Then add the pieces back one at a time.** Join, look. Filter, look. Group, look. The step where
the count goes wrong is the step with the bug.

## The one that is not a query bug

**Comparing a number stored as text.** \`WHERE id = '10'\` against an integer column may work, or
be slow, or return nothing, depending on the database. Types in the schema and types in the query
should agree.`,
    mcqs: [
      mcq('An aggregate returns a wrong total. The most informative first step is to:',
        [['Remove the aggregate and inspect the rows', true],
         ['Add a GROUP BY to break the total down further', false],
         ['Check the column types used in the aggregation now', false],
         ['Re-run the query to confirm the result is consistent', false]],
        'The aggregate has compressed the evidence into one number. The underlying rows usually show the duplication immediately.'),
      mcq('The same query returns rows in a different order on a second run. This means the query:',
        [['Has no ORDER BY, so no order was promised', true],
         ['Was affected by another transaction running at once', false],
         ['Used an index on the first run and not on the second', false],
         ['Returned different rows, not merely a different order', false]],
        'Without ORDER BY the engine is free to return rows however it likes, and that can change with the plan, the cache or the data.'),
      mcq('Building a query back up one clause at a time locates a bug because the step where the count changes is:',
        [['The step that introduced the fault', true],
         ['The step that is slowest and needs an index added', false],
         ['The step where the schema and query types diverge', false],
         ['Always the join, which is where faults usually are', false]],
        'Each clause is a hypothesis about the data. Adding them singly turns an opaque wrong answer into a specific one that can be reasoned about.'),
    ],
    checkpoint: [
      mcq('A query returns fewer rows than expected and no error. Before suspecting the join, check for:',
        [['A comparison against a column that holds NULLs', true],
         ['An index that is missing on the filtered column', false],
         ['A LIMIT clause left over from earlier testing work', false],
         ['A transaction that has not yet been committed to it', false]],
        'NULL comparisons evaluate to unknown and silently exclude rows. It costs nothing to check and explains the symptom more often than a join does.'),
      mcq('`WHERE id = \'10\'` against an integer column is risky chiefly because its behaviour:',
        [['Varies between databases, and can be silent', true],
         ['Always fails, and the error message is a clear one', false],
         ['Is correct but noticeably slower than a typed one', false],
         ['Depends on whether the column has an index on it', false]],
        'Some engines coerce, some refuse, some coerce and skip the index. Matching the types in the query to the schema removes the question.'),
    ],
  },
  {
    unitCode: 'T4_BR_DATABASE_PRACTICE',
    notes: `**Queries, written quickly, checked against the rows.**

## What is being drilled

**Getting the join level right**, so an aggregate afterwards means what it should.

**Choosing inner or left from what the question asks**, not from habit.

**Handling NULL deliberately** rather than discovering it in a result.

## The routine

**Write the query. Run it without the aggregate. Count the rows. Then aggregate.**

That is four steps for something that feels like one, and it catches the duplication bug before
it becomes a wrong number in a report somebody trusts.

## What good looks like

**You can say what the row count should be before you run it**, and you notice when it is not.
That is the whole skill; everything else is syntax that can be looked up.

## Where these questions come from

**Every written round has SQL**, and it is usually a join with an aggregate, because that is where
candidates separate. The syntax is universally known and the level of aggregation is not.`,
    mcqs: [
      mcq('Predicting the row count before running a query is valuable because it makes the duplication bug:',
        [['Visible immediately rather than in a total', true],
         ['Impossible, since the join is then written correctly', false],
         ['Easier to explain to whoever reviews the query later', false],
         ['Unnecessary to check, because the count is now known', false]],
        'An unexpected count is the earliest signal the join is at the wrong level, and it appears before any aggregate has hidden it.'),
      mcq('Written rounds favour a join with an aggregate because candidates separate on:',
        [['The level the aggregation is applied at', true],
         ['The syntax, which many candidates do not know well', false],
         ['The speed at which they can type a long query out', false],
         ['Whether they remember the less common join types used', false]],
        'Join syntax is universally known. Whether a SUM is being taken over duplicated rows is the judgement the question is actually testing.'),
    ],
    checkpoint: [
      mcq('A question asks for average order value per customer, including customers with no orders. The average for those customers should be:',
        [['Explicitly decided, since there is nothing to average', true],
         ['Zero, which is what the aggregate returns by default', false],
         ['Excluded, because an average of nothing is not defined', false],
         ['Null, which every database handles the same way here', false]],
        'No orders means no values, so the answer is a choice between NULL, zero and omission. Letting the engine decide is how reports disagree.'),
      mcq('Running a query without its aggregate first is recommended because the rows show:',
        [['Whether the join produced what you expected', true],
         ['How long the query will take once aggregated later', false],
         ['Which index the database has chosen for the query', false],
         ['Whether the column types match across the two tables', false]],
        'The aggregate compresses everything into one number. Looking first is the only cheap way to see the shape it was computed from.'),
    ],
  },

  /* ══ T4_BR_WEB_API ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_WEB_API_REQUEST_AND_RESPONSE',
    notes: `**The status code is the first thing to read, not the last.**

## What actually travels

**A request** is a method, a path, some headers and sometimes a body. **A response** is a status
code, some headers and usually a body. That is the whole protocol at the level Year 4 needs.

## The codes that matter, as families

**2xx — it worked.** **3xx — look elsewhere.** **4xx — your request was wrong.** **5xx — the
server broke.**

**The 4xx/5xx split is the one that changes what your code should do.** A 4xx will fail again
identically no matter how many times you retry; a 5xx might not. Code that treats every failure
the same has thrown that distinction away.

## The three 4xx worth knowing apart

**400** — the request was malformed. **401** — we do not know who you are. **403** — we know, and
you may not. **404** — there is no such thing.

401 and 403 are constantly confused, and the difference is authentication against authorisation.

## Headers are not decoration

\`Content-Type\` tells the other side how to read the body. Sending JSON without it, or sending a
form body while claiming JSON, produces a 400 that looks inexplicable until you look at the
header.

## Methods carry meaning

\`GET\` should not change anything. \`POST\` creates, \`PUT\` replaces, \`DELETE\` removes. A GET
that modifies data will be called by a crawler eventually, and then it will be a story.`,
    mcqs: [
      mcq('The distinction that should change what your code does on failure is between:',
        [['4xx and 5xx, since only one may succeed on retry', true],
         ['400 and 404, which mean quite different things here', false],
         ['3xx and 4xx, since one of them can still be followed', false],
         ['2xx and 3xx, because both indicate a working server', false]],
        'A 4xx will fail identically however often it is repeated. A 5xx may be transient, so it is the only family where retrying is reasonable.'),
      mcq('401 differs from 403 in that 401 means the server:',
        [['Does not know who you are', true],
         ['Knows who you are and refuses the action', false],
         ['Cannot find the resource you asked it for now', false],
         ['Received a request it could not parse properly', false]],
        'Authentication against authorisation. 401 invites you to identify yourself; 403 says identity was established and is not sufficient.'),
      mcq('A GET request that changes server state is a problem mainly because:',
        [['Crawlers and caches will call it unprompted', true],
         ['The specification forbids a body on a GET request', false],
         ['GET requests cannot carry enough data to do so well', false],
         ['Browsers will refuse to issue the request at all then', false]],
        'Anything may follow a GET without being asked — a prefetcher, a crawler, a cache warmer — because GET promises to be safe.'),
    ],
    checkpoint: [
      mcq('An API returns 400 on a request that looks correct. Before changing the body, check the:',
        [['Content-Type header against what you actually sent', true],
         ['Authentication token, which may have expired by now', false],
         ['Endpoint path, which may have been renamed recently', false],
         ['Request method, which may not be allowed on this path', false]],
        'A mismatch between the declared type and the actual body is the standard cause of an inexplicable 400, and it is invisible in the body itself.'),
      mcq('Client code retries every failed request three times. On a 401 this is:',
        [['Wasted, because nothing about it will change', true],
         ['Sensible, since tokens are sometimes refreshed in time', false],
         ['Harmful, because repeated 401s lock the account out', false],
         ['Correct, because the specification recommends retrying', false]],
        'The credentials are the problem and repeating the identical request does not alter them. Refreshing the token would; retrying will not.'),
    ],
  },
  {
    unitCode: 'T4_BR_WEB_API_REST_AND_JSON',
    notes: `**Handling the response that is not 200**, which is where most integration bugs live.

## The shape of a REST call

A resource has a path. A method says what you want done to it. The body carries data in, the
response carries data out, and **both are JSON often enough that it is worth assuming and
checking**.

## Parsing what you did not expect

**A response body is not guaranteed to be JSON**, especially when something went wrong. A 500
frequently returns an HTML error page, and calling \`.json()\` on it raises an exception far away
from the actual problem.

**Check the status first, then parse.** In that order, always.

## Missing fields

**\`data["user"]["name"]\` raises when \`user\` is absent**, and absent is normal — an optional
field, a partial response, a different API version. \`data.get("user", {}).get("name")\` does not.

Being lenient about what you read and strict about what you send is the habit that makes
integrations stop breaking.

## What a good error path looks like

    r = requests.get(url)
    if r.status_code != 200:
        # log the code AND the body, then decide
        ...

**Logging the code without the body** is the most common half-measure, and the body is usually
where the server explained what was wrong.`,
    mcqs: [
      mcq('Calling `.json()` on a response before checking the status raises confusingly because an error response is often:',
        [['HTML rather than the JSON that was expected', true],
         ['Empty, which parses to null without any error', false],
         ['JSON with a different structure from the success one', false],
         ['Compressed, and needs decoding before it is parsed', false]],
        'Server error pages are frequently HTML. The parse failure then points at the parsing line rather than at the request that actually failed.'),
      mcq('`data.get("user", {}).get("name")` is preferred to chained indexing because a missing field then:',
        [['Yields None rather than raising an exception', true],
         ['Is filled in with a default from the API schema', false],
         ['Causes the request to be retried automatically now', false],
         ['Is logged, so the absence can be investigated later', false]],
        'Optional and absent fields are normal in an API response. Chained indexing turns every one of them into a crash at an unhelpful place.'),
      mcq('Logging a failed request’s status code without its body loses:',
        [['The server’s own explanation of what was wrong', true],
         ['The timestamp, which is needed to correlate the logs', false],
         ['The request path, which the code alone does not give', false],
         ['The retry count, which decides whether to try again', false]],
        'A 400 says the request was wrong; the body usually says which field and why. Logging only the code discards the useful half.'),
    ],
    checkpoint: [
      mcq('An integration works in testing and fails intermittently in production. The most likely cause among these is:',
        [['An optional field that is sometimes absent', true],
         ['A network route that differs between the environments', false],
         ['A rate limit that testing never came close to hitting', false],
         ['A JSON library version difference between the two', false]],
        'Test data is usually complete. Real responses omit optional fields, and chained indexing turns that into a crash on the subset of requests that omit them.'),
      mcq('"Lenient in what you read, strict in what you send" means that an unexpected extra field in a response should be:',
        [['Ignored, rather than treated as an error', true],
         ['Rejected, since it was not part of the contract', false],
         ['Logged as a warning and the response then discarded', false],
         ['Stored, in case a later version starts requiring it', false]],
        'An API adding a field is a normal, backwards-compatible change. A client that fails on it breaks every time the server improves.'),
    ],
  },
  {
    unitCode: 'T4_BR_WEB_API_DEBUGGING',
    notes: `**Integrations that fail in ways the error message does not explain.**

## Find out what was actually sent

**Print the request.** URL, method, headers, body — exactly as it went out. Most integration bugs
are visible at a glance here and invisible in the code, because the code is what produced your
incorrect belief about it.

## The usual causes, in order

**The wrong URL.** A missing slash, a path segment from a different environment, a base URL that
still points at staging.

**The wrong Content-Type.** Claiming JSON and sending a form body, or the reverse.

**Missing or stale authentication.** A 401 when a token has expired looks identical to a 401 from
a token that was never sent.

**A field name that differs by one character** — \`user_id\` against \`userId\` — which the
server reports as a missing required field rather than as an unknown one.

## Reproduce outside your program

**\`curl\` the same request.** If curl works and your code does not, the difference is in what
your code sent, and you have halved the problem. If curl fails too, the problem is the request or
the server, and your code is innocent.

That single step resolves most of these faster than anything else available.`,
    mcqs: [
      mcq('Reproducing a failing API call with curl is useful chiefly because it:',
        [['Separates your code from the request itself', true],
         ['Shows the server response in a more readable form', false],
         ['Bypasses any client library bugs that may be present', false],
         ['Provides timing information the client does not give', false]],
        'It splits the problem in two. Whichever side reproduces the failure is the side worth reading, and that is half the search gone.'),
      mcq('A server reports a required field as missing when the field was sent as `userId` instead of `user_id`. From the server’s view the field was:',
        [['Absent, because it looks only for the name it knows', true],
         ['Present, but the value failed validation on its type', false],
         ['Duplicated, since both spellings arrived in the body', false],
         ['Renamed, which the server logs as a schema mismatch', false]],
        'The server matches on an exact key. An unrecognised key is ignored and the expected one is simply not there, so the message is technically accurate.'),
      mcq('Printing the outgoing request is more useful than re-reading the client code because the code:',
        [['Is what produced the belief that is wrong', true],
         ['May be using a library that alters it before sending', false],
         ['Is usually longer than the request that it produces', false],
         ['Does not show which environment configuration was used', false]],
        'You already read it and concluded what it sends. Only the actual request settles a disagreement between that conclusion and reality.'),
    ],
    checkpoint: [
      mcq('curl succeeds with the same URL and body where your program gets a 400. The difference is therefore in:',
        [['The headers your program is sending', true],
         ['The server, which is treating the clients differently', false],
         ['The network path, which differs between the two calls', false],
         ['The response, which your program is misinterpreting it', false]],
        'Same URL and same body leaves the headers as the difference, and Content-Type or an auth header is nearly always the one.'),
      mcq('A 401 from an expired token and a 401 from a missing token look identical. Distinguishing them requires:',
        [['Logging whether a token was attached at all', true],
         ['Requesting a new token and comparing the results', false],
         ['Checking the response body for an expiry timestamp', false],
         ['Comparing the response headers between the two cases', false]],
        'The server will not tell you which it was. Recording on the client side whether a credential was present is what separates the two.'),
    ],
  },
  {
    unitCode: 'T4_BR_WEB_API_PRACTICE',
    notes: `**Calls made, responses handled, failures included.**

## What is being drilled

**Checking the status before parsing**, every time, until it is not a decision.

**Reading optional fields safely**, so an absent one is a value rather than a crash.

**Doing something sensible on failure** — not a bare \`except: pass\`, and not a crash either.

## The three-line habit

    r = call()
    if not ok(r): handle(r)
    data = parse(r)

**Every integration you write for the rest of your career has this shape.** The exercises here
are about making it automatic so that under time pressure you do not skip the middle line, which
is the one everybody skips.

## What a bare except costs

**It catches the bug you did not know about** along with the failure you were expecting, and then
hides it. A program that swallows everything is harder to debug than one that crashes, because a
crash at least says where.

## The mindset

**Assume the call fails.** Roughly one in a few hundred will, and code written on the assumption
that it will not is code that works until the demo.`,
    coding: [
      {
        title: 'Summarising a batch of responses',
        description: `Each input line is \`<status> <body>\`, where body is a single word and may
be the literal \`-\` meaning an empty body.

For each line, print \`ok <body>\` when the status is 2xx, and \`fail <status>\` otherwise.
Then print \`ok=N fail=M\`.

Treat a 2xx with a body of \`-\` as a failure too — a successful status with nothing in it is not
a usable answer.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]
`,
        language: 'python',
        tests: [
          { input: '200 alice\n404 -\n201 bob\n', expectedOutput: 'ok alice\nfail 404\nok bob\nok=2 fail=1' },
          { input: '200 -\n500 x\n', expectedOutput: 'fail 200\nfail 500\nok=0 fail=2' },
          { input: '204 done\n', expectedOutput: 'ok done\nok=1 fail=0', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('A bare `except: pass` around an API call is worse than letting it crash because it:',
        [['Hides bugs you did not know were there', true],
         ['Is slower, since exceptions are expensive to catch', false],
         ['Prevents the request from being retried afterwards', false],
         ['Makes the code longer without adding any behaviour', false]],
        'It catches everything, including the unrelated failure you would have wanted to see. A crash at least names the line.'),
      mcq('The line most often skipped under time pressure in an integration is the:',
        [['Status check between calling and parsing', true],
         ['Timeout, which is left at its default value instead', false],
         ['Logging of the request before it is actually sent out', false],
         ['Retry, which is added later when failures are noticed', false]],
        'Calling and parsing feel like one action. The check between them is the step that gets dropped and the one that makes failures legible.'),
    ],
    checkpoint: [
      mcq('Code written assuming an API call always succeeds typically works until:',
        [['It meets real traffic, where a fraction fail', true],
         ['The API version changes and the contract moves on', false],
         ['The authentication token reaches its expiry date', false],
         ['The volume of requests exceeds the server’s limit', false]],
        'Failures are a small proportion, so small test volumes see none. The first real load is the first time the missing path is exercised.'),
      mcq('A 2xx response with an empty body should be treated as:',
        [['Decided deliberately, not assumed successful', true],
         ['Successful, because the status code says it worked', false],
         ['A failure, in every case, since nothing was returned', false],
         ['A retry candidate, because the body may arrive later', false]],
        'A 204 legitimately has no body and a 200 that should have one does not. Which of those it is depends on the endpoint, so it is a choice.'),
    ],
  },

  /* ══ T4_BR_ENGINEERING ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_ENGINEERING_GIT_AND_BRANCHES',
    notes: `**The three commands that get you out of trouble**, which is what a bridge day on Git
is actually for.

## The model, briefly

**A commit is a snapshot with a parent.** A branch is a moving label pointing at one. Merging
creates a commit with two parents. Almost everything confusing about Git is clearer once those
three sentences are load-bearing rather than memorised.

## Getting out of trouble

**\`git status\`** — first, always. It tells you what state you are in, and most panic comes from
not knowing.

**\`git stash\`** — put uncommitted work aside safely. You needed to switch branches and it would
not let you; this is why.

**\`git reflog\`** — the thing that makes almost nothing permanent. It records where HEAD has
been, including commits no branch points at any more. **A "lost" commit is usually one reflog
away.**

## Conflicts

**A conflict is not an error.** It is Git saying two changes touched the same lines and it will
not choose for you.

**What you must not do is keep your own side to make it go away.** That silently deletes
somebody's work, the tests may still pass because their tests went with it, and nobody finds out
until later.

**Read both sides. Understand what each was for. Write the version that has both.**

## Commit messages

**Say why, not what.** The diff already says what. "Fix bug" tells the person reading it in six
months nothing they could not see.`,
    mcqs: [
      mcq('A commit that no branch points at any more can usually be recovered through:',
        [['git reflog, which records where HEAD has been', true],
         ['git status, which lists any unreferenced commits', false],
         ['git stash, which retains the previous commit state', false],
         ['git merge, replaying the branch that once held it', false]],
        'The reflog keeps a local history of HEAD movements, so a commit orphaned by a reset or a bad rebase is still reachable by its hash.'),
      mcq('Resolving a conflict by keeping your own side is dangerous chiefly because:',
        [['The other change disappears without any trace', true],
         ['Git records the resolution as an unresolved conflict', false],
         ['The merge commit will have only one parent afterwards', false],
         ['The other branch cannot then be merged again later', false]],
        'The resulting commit looks like a normal merge. Their work is gone and their tests went with it, so the suite stays green.'),
      mcq('A commit message should say why rather than what because the what is:',
        [['Already visible in the diff itself', true],
         ['Usually too long to fit in a message line', false],
         ['Recorded separately in the branch name used', false],
         ['Obvious to whoever is reviewing it right now', false]],
        'The diff is a complete record of what changed. The reasoning behind it exists nowhere else and is what a reader in six months needs.'),
    ],
    checkpoint: [
      mcq('You have uncommitted work and need to switch branches urgently. The safe command is:',
        [['git stash, which sets the work aside intact', true],
         ['git checkout --force, which switches immediately now', false],
         ['git reset --hard, which returns to a clean state', false],
         ['git clean, which removes the untracked files first', false]],
        'Stash preserves the work and can be reapplied. The other three all discard uncommitted changes, which is unrecoverable.'),
      mcq('After a merge conflict is resolved and the tests pass, the work of the other author may still be:',
        [['Deleted, if their tests were deleted with it', true],
         ['Present, since Git preserves both sides always', false],
         ['Flagged by Git as an unresolved conflict region', false],
         ['Recoverable only by reverting the merge commit', false]],
        'A green suite proves nothing when the tests for the removed code were removed too. Only reading both sides during the resolution catches it.'),
    ],
  },
  {
    unitCode: 'T4_BR_ENGINEERING_TESTS_AND_SHELL',
    notes: `**A test that passes before the fix is a comment**, and writing the failing one first
is the only thing that proves otherwise.

## Why the order matters

**Write the test. Watch it fail. Then fix.** If it does not fail, it was not testing what you
thought, and you have learned that in ten seconds rather than never.

**A test written after a fix tends to assert what the code now does**, which is a tautology
dressed as verification.

## What a good test asserts

**A returned value, against an expected one.** Not "it ran without an error" — a function that
returns the wrong answer runs perfectly.

**One thing.** A test that checks six things fails as one, and you do not know which of the six.

## Enough shell to be unblocked

**Running things and seeing output.** \`python x.py\`, redirecting output to a file, piping into
\`grep\` to find the line you want in a thousand.

**Knowing where you are.** \`pwd\`, \`ls\`, and the fact that a relative path is relative to where
you ran the command, not to where the file lives. **That single misunderstanding accounts for a
large share of "it cannot find the file".**

**Exit codes.** \`echo $?\` after a command says whether it succeeded. Scripts and pipelines are
built on this, and a command that printed an error and returned zero is a bug in that command.`,
    mcqs: [
      mcq('A test written after the fix and never seen to fail has verified that:',
        [['The code does what the code does', true],
         ['The bug is fixed under the tested conditions', false],
         ['The function returns a value of the correct type', false],
         ['The fix did not break any of the existing behaviour', false]],
        'Asserting the current behaviour is circular. Only seeing the test fail without the fix shows it is sensitive to the bug at all.'),
      mcq('"It cannot find the file" when the path looks correct is usually because a relative path resolves from:',
        [['Where the command was run, not where the file is', true],
         ['The user’s home directory, regardless of position', false],
         ['The location of the interpreter that is executing it', false],
         ['The root of the repository the script belongs to now', false]],
        'The working directory is whatever shell you launched from. Running the same script from two directories gives two different resolutions.'),
      mcq('A test that asserts six things is worse than six tests because when it fails you:',
        [['Do not know which of the six broke', true],
         ['Cannot re-run it without fixing all six first', false],
         ['Lose the coverage of the five that still pass now', false],
         ['Have to read the whole test to find the assertion', false]],
        'A failure names the test, not the assertion within it. Splitting them turns one ambiguous red into a specific one.'),
    ],
    checkpoint: [
      mcq('A command prints an error message and returns exit code zero. This is:',
        [['A bug in that command, which scripts will trust', true],
         ['Normal, since warnings are printed to standard error', false],
         ['Expected whenever the error was recoverable by itself', false],
         ['Only a problem when the command is used in a pipeline', false]],
        'Scripts branch on the exit code. A command that fails and reports success will be treated as having worked by everything downstream.'),
      mcq('A test asserting "it ran without raising" misses the case where the function:',
        [['Returns a wrong answer perfectly smoothly', true],
         ['Raises an exception that is caught internally', false],
         ['Takes far longer to run than it ought to take', false],
         ['Modifies global state that the test does not check', false]],
        'Most bugs are wrong answers rather than crashes. A test that only checks for absence of exceptions cannot see any of them.'),
    ],
  },
  {
    unitCode: 'T4_BR_ENGINEERING_DEBUGGING',
    notes: `**Things that work on your machine and nowhere else.**

## The four causes, in order of frequency

**A relative path.** It resolves from the working directory, and yours was different.

**An environment variable** that is set in your shell and in nobody else's. Usually a database
URL, an API key or a locale.

**A dependency that is installed globally on your machine** and is not listed anywhere, so a
fresh checkout does not have it.

**A file that is not committed.** A config, a fixture, a \`.env\`. It exists for you and does not
exist at all.

## The test that finds all four

**Clone into a fresh directory and run it.** Not your working copy — a new clone, from what is
actually committed. Anything missing shows up in the first ten seconds, and this is the single
most useful thing you can do before claiming something works.

## Reading somebody else's failure

**Ask what is different, not what is wrong.** The code is identical; it works for you. So the
difference is in the environment, the data or the invocation, and asking which of the three
narrows it immediately.

## The shell part

**\`echo $VAR\` before assuming it is set.** An unset variable expands to nothing, so a command
built from it silently becomes a different command rather than failing.`,
    mcqs: [
      mcq('The single most effective check before claiming a project works is to:',
        [['Clone it fresh and run it from there', true],
         ['Run the full test suite on your working copy', false],
         ['Review the diff of everything that is committed', false],
         ['Ask a colleague to read through the setup steps', false]],
        'A fresh clone contains exactly what is committed. Uncommitted files, global installs and local configuration all reveal themselves at once.'),
      mcq('An unset environment variable used in a shell command causes the command to:',
        [['Run, with that part of it simply missing', true],
         ['Fail immediately with an undefined variable error', false],
         ['Use the value from the parent shell if there is one', false],
         ['Prompt for a value before the command is executed', false]],
        'Expansion replaces an unset variable with nothing, so the command is still valid and does something other than what was intended.'),
      mcq('Debugging somebody else’s failure of your working code starts by asking what is:',
        [['Different between their run and yours', true],
         ['Wrong with the code that you have written here', false],
         ['Missing from the instructions you gave them first', false],
         ['Unusual about the input that they are supplying it', false]],
        'The code is a constant across both runs, so it cannot be the difference. Environment, data and invocation are the only variables left.'),
    ],
    checkpoint: [
      mcq('A fresh clone fails on a missing module that is present on your machine. The dependency was:',
        [['Installed globally and never declared anywhere', true],
         ['Removed from the requirements file by another commit', false],
         ['Installed at a version the fresh clone cannot obtain', false],
         ['Present but not importable from the fresh directory', false]],
        'It works for you because your machine happens to have it. Nothing in the repository says it is needed, so no other checkout will.'),
      mcq('A script works when run from its own directory and fails from the repository root. The cause is:',
        [['A relative path resolved against the working directory', true],
         ['An import that depends on the script’s own location', false],
         ['A permission that differs between the two directories', false],
         ['An environment variable set only in one of the shells', false]],
        'Relative paths resolve from where the command was invoked. Running from elsewhere changes what the same path string points at.'),
    ],
  },
  {
    unitCode: 'T4_BR_ENGINEERING_PRACTICE',
    notes: `**Branch, test, run, and find out what went wrong.**

## What is being drilled

**Working on a branch by reflex**, not on main because it was already checked out.

**Writing the failing test first** on every exercise here, without exception.

**Running things from the terminal** and reading the output, including the exit code.

## The loop this builds

**Branch. Write the failing test. Make it pass. Run the suite. Commit with a message that says
why.**

That is five steps and it becomes one motion with practice. Every one of them is skipped by
somebody under pressure, and each skip has a specific cost: work lost, a test that proves
nothing, a broken commit, a message nobody can use.

## What is not being drilled

**Command memorisation.** The full surface of Git is looked up, by everybody, forever. What
cannot be looked up is the habit of committing before you experiment, and that is what these
exercises are for.

## The interview version

**"Tell me about a time a merge went wrong."** A real answer involves what you did, what you
almost did, and what you check now because of it.`,
    mcqs: [
      mcq('The value of committing before experimenting is that it makes the experiment:',
        [['Reversible, whatever happens to the work', true],
         ['Faster, because the diff is smaller afterwards', false],
         ['Visible to colleagues while it is in progress now', false],
         ['Testable, since the suite runs against commits only', false]],
        'A commit is a point you can return to. Without one, an experiment that goes badly takes the working state with it.'),
      mcq('What these exercises drill that cannot be looked up is:',
        [['The habit, rather than the command syntax', true],
         ['The exact flags each of the commands accepts', false],
         ['The order in which the commands must be issued', false],
         ['The difference between the merge and rebase models', false]],
        'Every part of the command surface is documented and will be looked up forever. Branching before starting is a reflex, and reflexes are built by repetition.'),
    ],
    checkpoint: [
      mcq('A student writes the fix first and the test afterwards, and the test passes immediately. They should:',
        [['Undo the fix and confirm the test then fails', true],
         ['Accept it, since a passing test is the goal here', false],
         ['Write a second test to cover the same behaviour too', false],
         ['Add assertions until one of them eventually fails', false]],
        'Reverting is the only cheap way to show the test is sensitive to the bug. A test that passes both with and without the fix tests nothing.'),
      mcq('Asked about a merge that went wrong, the answer that reads as real includes:',
        [['What you check now because of it', true],
         ['The names of the branches that were involved', false],
         ['The Git commands used to resolve the conflict', false],
         ['How long the resolution took you to complete it', false]],
        'A changed habit is evidence the experience landed. Commands and names are available to anybody who has read about merges.'),
    ],
  },

  /* ══ T4_BR_INTEGRATION ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BR_INTEGRATION_PLANNING_THE_TASK',
    notes: `**Breaking a task down before opening the editor**, which is the first thing a
technical interview watches you do.

## Four or five verbs

A one-line brief decomposes into a handful of steps. **Write them down.** Each one becomes a
function, each function returns something, and the last one assembles the answer.

## Sequence them so each can be checked

**The order that matters is not the order things happen in the finished program.** It is the order
in which each piece can be VERIFIED before the next depends on it.

Read the data and print it. Confirm it. Then transform it, and print that. Confirm it. Then store
it. **A mistake in step one found at step four costs the three steps in between.**

## Name what you are unsure about

**Every task has one part you do not yet know how to do.** Identifying it in the planning minute
means you meet it deliberately with the rest working, rather than at the end with everything else
half-finished.

## Why this is worth two minutes on a short task

**Because the two minutes are constant and the saving is not.** On the task you get right first
time it was overhead. On the one you do not, a bug in a named step is found in a minute and a bug
in an undivided blob is found in twenty.`,
    mcqs: [
      mcq('Steps should be sequenced by the order in which each can be:',
        [['Verified before the next one depends on it', true],
         ['Executed when the finished program eventually runs', false],
         ['Written, from the easiest through to the hardest one', false],
         ['Explained to somebody reviewing the finished work', false]],
        'Verification order localises faults. A mistake in the first step found at the fourth has to be searched for through all three in between.'),
      mcq('Identifying the unfamiliar part of a task during planning means you meet it:',
        [['Deliberately, with everything else working', true],
         ['Sooner, which leaves more time to research it fully', false],
         ['Later, once the familiar parts are all completed', false],
         ['With help, since it can be flagged to somebody early', false]],
        'Meeting the unknown last, by accident, means debugging it while everything around it is also unproven. Isolating it is what makes it tractable.'),
      mcq('Two minutes of planning on a short task is justified because the saving is:',
        [['Variable, while the two minutes are constant', true],
         ['Certain, since planning always shortens the work', false],
         ['Proportional to how long the task would have taken', false],
         ['Only realised when somebody else reads the code', false]],
        'On the task that goes right it was pure overhead. On the one that does not it converts a twenty-minute search into a one-minute one.'),
    ],
    checkpoint: [
      mcq('A task is written as one undivided block and has a bug. Compared with four named steps, the search space is:',
        [['The whole block, with nowhere obvious to cut', true],
         ['The same, since the code is identical in length', false],
         ['Smaller, because there are fewer interfaces to check', false],
         ['Larger only when the block exceeds about fifty lines', false]],
        'Named steps can be checked independently, which halves and halves again. An undivided block offers no place to make the first cut.'),
      mcq('In a technical interview, planning aloud before coding is watched because it shows:',
        [['How the candidate decomposes an unfamiliar problem', true],
         ['That the candidate has seen this problem type before', false],
         ['Whether the candidate can type quickly under pressure', false],
         ['How much of the language syntax they have memorised', false]],
        'Decomposition is the transferable skill. Whether they happen to know this problem says nothing about the next one they will meet at work.'),
    ],
  },
  {
    unitCode: 'T4_BR_INTEGRATION_BUILDING_IT',
    notes: `**One small thing that touches everything the bridge taught.**

## The brief

Something that reads from a database, calls or serves an HTTP endpoint, is committed on a branch,
and has at least one test that fails without the code.

**Small.** A single table, a single endpoint, a single test. The point is not the size, it is that
all four layers are present and have to agree.

## Why all four at once

**Because each of the last nine days checked one layer in isolation**, and a layer that works
alone tells you nothing about the seam. Nearly all real bugs are at the seams: the shape the
database returns not matching what the endpoint expects, the test passing against data the
endpoint never sees.

## Build it in verifiable order

**Data first, and look at it.** Then the endpoint, and call it by hand. Then the test. Then
commit.

**Committing last is the mistake.** Commit after each step that works; the branch is free and the
alternative is losing a working state to an experiment.

## What finishing means

**A fresh clone of your branch runs it**, and the test fails if you remove the code. Anything less
and the bridge has not been demonstrated, whatever the individual days said.`,
    assignment: {
      title: 'The bridge integration task',
      description: 'One small thing that reads from a database, serves or calls an HTTP endpoint, lives on a branch and has a test that fails without the code.',
      instructions: `Build something small that touches all four layers the bridge covered.

**Scope it to one table, one endpoint and one test.** The size is not the point; the four layers
having to agree with each other is.

**Build it in verifiable order.** Get the data and look at it. Add the endpoint and call it by
hand. Write the test and watch it fail before the code makes it pass. Commit after each step that
works, on a branch, with messages that say why.

**Submit:** the branch, a README that gets a stranger from a fresh clone to a running copy, and
three or four sentences on the seam that gave you the most trouble and what the cause turned out
to be.

You are finished when a fresh clone of your branch runs it, and the test fails if you remove the
code it covers.`,
      rubric: [
        { criterion: 'All four layers present', description: 'Data, an HTTP endpoint, version control and a test are each genuinely exercised rather than nominally included.', maxPoints: 25 },
        { criterion: 'The test is real', description: 'It asserts a value, and it fails when the code under test is removed.', maxPoints: 25 },
        { criterion: 'Runs from a fresh clone', description: 'Nothing required is uncommitted, globally installed or set only in the author’s shell.', maxPoints: 25 },
        { criterion: 'Account of the seam', description: 'A specific description of where two layers disagreed and what the cause was, rather than a description of the feature.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('The reason for building across all four layers at once is that a layer working alone says nothing about the:',
        [['Seam, where nearly all the real bugs are', true],
         ['Performance, which only shows under a real load', false],
         ['Correctness of the layer below it in the stack', false],
         ['Time the whole task will take to finish properly', false]],
        'Each bridge day verified one layer in isolation. What has never been checked is whether two of them agree about a shape.'),
      mcq('Committing only at the end of the task risks:',
        [['Losing a working state to an experiment', true],
         ['A merge conflict with somebody else’s branch', false],
         ['A commit message that is too long to be useful', false],
         ['The branch diverging too far from the main one', false]],
        'Without an intermediate commit there is no point to return to. An experiment that goes badly takes the working version with it.'),
    ],
    checkpoint: [
      mcq('The task is finished when a fresh clone runs it AND:',
        [['The test fails when the code is removed', true],
         ['The test passes on the author’s machine reliably', false],
         ['Every layer has at least one test written for it', false],
         ['The README describes each of the four layers used', false]],
        'A passing test proves nothing on its own. Sensitivity to the code is the property that makes it a test rather than a comment.'),
      mcq('The most likely place for this task to break is where:',
        [['The database shape and the endpoint disagree', true],
         ['The test framework and the language version clash', false],
         ['The branch and the main line have diverged too far', false],
         ['The endpoint and the HTTP client use different verbs', false]],
        'The seam between storage and the interface is where an assumption on each side was made independently and never compared.'),
    ],
  },
  {
    unitCode: 'T4_BR_INTEGRATION_DEBUGGING_IT',
    notes: `**Which of the four layers is actually wrong**, rather than changing all of them.

## Bisect the stack, not the code

**Check the data directly.** Query it. Is what you expect actually there?

**Check the endpoint by hand.** curl it. Does it return what the data says it should?

**Check the test's assumptions.** What data does it set up, and is that the data the endpoint
sees?

**Three checks, and after them you know which layer owns the bug.** That is faster than reading
any of them, and it is the technique that scales to systems too large to hold in your head.

## The seam failures

**The database returns a string where the code expects a number.** Frequently from a column type
nobody looked at.

**The endpoint returns a field the client reads under a different name.** \`user_id\` against
\`userId\` again.

**The test sets up data the endpoint never sees**, because it wrote to a different database, or
inside a transaction that was rolled back.

## The trap

**A bug that appears in one layer is frequently caused in another.** The endpoint returning null
is a symptom; the cause is a query matching nothing. Fixing the endpoint to handle null makes the
symptom go away and leaves the cause in place, and it will surface again somewhere worse.`,
    mcqs: [
      mcq('Checking the data, the endpoint and the test separately before reading any code identifies:',
        [['Which layer owns the bug', true],
         ['Which line within the layer is actually wrong', false],
         ['Whether the bug is worth fixing at this stage yet', false],
         ['How long the fix is likely to take you to complete', false]],
        'Three cheap checks narrow four layers to one. Reading code to find the same answer costs far more and is less reliable.'),
      mcq('An endpoint returns null and is changed to handle null gracefully. If the cause was a query matching nothing, this:',
        [['Hides the symptom and leaves the cause', true],
         ['Fixes the problem, since the endpoint now behaves well', false],
         ['Is correct, because endpoints should handle null anyway', false],
         ['Moves the failure to the client, which is then fixed', false]],
        'Handling null is good practice and is not the fix. The query still matches nothing, and that will surface again somewhere with less tolerance.'),
      mcq('A test passes but the endpoint fails in reality. A likely cause is that the test data was:',
        [['Written somewhere the endpoint does not read', true],
         ['Larger than the endpoint can process in one request', false],
         ['Formatted differently from what real clients send it', false],
         ['Created after the endpoint had already been called', false]],
        'A separate test database, or a transaction rolled back at the end, both leave the test asserting against data the running endpoint never sees.'),
    ],
    checkpoint: [
      mcq('The value of bisecting the stack rather than reading code is that it scales to systems that are:',
        [['Too large to hold in your head at once', true],
         ['Written in languages you are unfamiliar with yet', false],
         ['Maintained by several teams working in parallel', false],
         ['Deployed across more than one physical machine', false]],
        'Reading requires understanding the whole. Bisecting requires only being able to observe at boundaries, which stays possible at any size.'),
      mcq('A column typed as text returns "5" where the code expects 5. This is a fault in:',
        [['The seam, where two assumptions were never compared', true],
         ['The database, which should have used a numeric type', false],
         ['The code, which should convert whatever it receives', false],
         ['The query, which should have cast the column itself', false]],
        'Each side is internally consistent and they were designed independently. Naming it a seam fault is what leads to checking the other seams too.'),
    ],
  },
  {
    unitCode: 'T4_BR_INTEGRATION_CHECKPOINT',
    notes: `**Whether the fundamentals the rest of Year 4 assumes are actually there.**

## What this measures

**Not the ten days.** Whether you could now open the engineering build, which assumes all of
this and teaches none of it.

## The bar

**You can write a small program that reads input, computes over all of it and prints the right
thing.** **You can choose a container from what the problem does most.** **You can write a
query, call an endpoint, work on a branch and write a test that fails for the right reason.**
**And you can put those together into one small thing that works.**

That is the bar. It is not high and it is not negotiable, because P03 starts from clean code and
design patterns and there is no way to teach those to somebody still fighting a for loop.

## If this does not pass

**The honest answer may be Year 1 rather than a slower Year 4.** The ladder behind somebody with
no programming at all is hundreds of units and this bridge is forty. Saying so is kinder than
spending a placement year discovering it.

**If it nearly passes**, the gap is usually one specific area and the remaining days of the bridge
can be spent there rather than spread evenly.

## If it passes

**The bridge is done and does not reappear.** The engineering build opens, and the placement
practice has already been running alongside since the first week.`,
    checkpoint: [
      mcq('A student passes every individual bridge topic and cannot complete the integration task. The correct reading is that they:',
        [['Have the pieces and not the seams', true],
         ['Were lucky on the individual topic checkpoints', false],
         ['Need the whole bridge repeated from the beginning', false],
         ['Should proceed, since the topics are what matter here', false]],
        'Layers in isolation and layers together are different capabilities, and the second is what every later module needs. It is a specific gap, not a general one.'),
      mcq('A student fails the bridge broadly, across every topic. The honest recommendation is:',
        [['Year 1, rather than a slower version of Year 4', true],
         ['Repeating the bridge with more time for each day', false],
         ['Proceeding, with extra support during the build', false],
         ['Focusing on placement practice while they catch up', false]],
        'The ladder behind a total beginner is hundreds of units and the bridge is forty. A placement year is not long enough to also be a first year.'),
      mcq('A student passes the bridge. The placement practice at this point has:',
        [['Already been running alongside it for weeks', true],
         ['Not yet started, and begins after the build finishes', false],
         ['Been paused during the bridge and now resumes again', false],
         ['Been replaced by the bridge work for the same days', false]],
        'The spec requires placement practice to be continuous. It interleaves from early on rather than waiting for the teaching track to reach an end.'),
      mcq('The bridge bar is set at "could you open the engineering build" rather than at a fixed score because P03:',
        [['Assumes all of this and teaches none of it', true],
         ['Is graded against a different standard entirely', false],
         ['Varies in difficulty depending on the direction chosen', false],
         ['Can be attempted more than once without a penalty', false]],
        'The bridge exists only to make the next module openable. A score would be arbitrary; whether the prerequisite holds is the real question.'),
    ],
  },
];
