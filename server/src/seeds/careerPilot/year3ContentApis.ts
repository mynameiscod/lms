/**
 * T3_API_DESIGN, T3_AUTH and T3_API_HARDENING — seventeen units. Year 3. Finishes S08.
 *
 * ── THE MODULE WHERE MISTAKES BECOME PUBLIC ───────────────────────────────────────────────
 *
 * An API is a one-way door the moment somebody integrates with it, and an authorization gap is
 * a breach rather than a bug. Both facts shape how these topics are written: the API units are
 * about decisions you cannot take back, and the auth units are about the checks that are
 * missed rather than the mechanisms that are complicated.
 *
 * BROKEN_ACCESS_CONTROL gets its own unit because changing the id in the URL is the simplest
 * real attack there is, it requires no tools, and it is consistently at the top of the OWASP
 * list. A graduate who has authenticated a request and never authorized one has built exactly
 * this hole, and they have built it while believing security was handled.
 *
 * The ordering inside T3_AUTH is deliberate: authentication first because it is the thing
 * students think of as "login", then the observation that proving who you are says nothing
 * about what you may do. That sentence is the whole module.
 *
 * PAGINATION_AND_FILTERING carries the offset trap, which is the most common scalability
 * mistake in a list endpoint and is invisible until page 5,000.
 *
 * Attribution: T3_API_DESIGN is all API_DESIGN (REST_APIS is evidenced elsewhere). T3_AUTH
 * defaults to AUTHENTICATION with the two authorization units overridden. T3_API_HARDENING
 * defaults to WEB_SECURITY with the documentation unit on API_DESIGN.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const APIS_BUNDLES: PilotBundle[] = [
  /* ══ T3_API_DESIGN ══════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_API_DESIGN_RESOURCES_AND_SHAPES',
    notes: `An API is a promise. Once somebody integrates with it, **you cannot change it
without their cooperation** — and you do not control when they give it. Design accordingly.

## Resources are nouns

    GET  /orders/812              not  /getOrder?id=812
    POST /orders                  not  /createOrder
    GET  /customers/5/orders      not  /getOrdersForCustomer?id=5

The method is the verb. The path is the thing. This is not ceremony: it means a caller can
guess your API from one example, and it means caches, proxies and tooling behave correctly,
because they understand \`GET\` and cannot know that \`/getOrder\` is safe to repeat.

## Nesting: one level, usually

\`/customers/5/orders\` is fine. \`/customers/5/orders/812/items/9/discounts\` is not — it is
long, it is fragile, and it requires the caller to know a hierarchy that may change.

**Nest to express ownership, then stop.** Once a resource has its own id, expose it directly:
\`/order-items/9\`.

## The shape a caller actually wants

    { "id": 812, "customer_id": 5, "status": "shipped" }

Every caller now makes a second request for the customer's name. **You have built an N+1 into
your API**, and each of those round trips costs far more than a join would have.

    { "id": 812, "status": "shipped",
      "customer": { "id": 5, "name": "Asha Rao" },
      "item_count": 3, "total": 4999 }

The caller renders the list without a second call. **Design the response for the screen that
will use it**, not for the shape of your table.

**And the opposite failure is real too:** returning the entire object graph makes a slow,
enormous response where most callers wanted three fields. The usual answer is a sensible
default with optional expansion — \`?include=items\` — rather than guessing.

## Consistency beats correctness

Pick a convention and never deviate. \`snake_case\` or \`camelCase\`; dates as ISO 8601 with a
time zone, always; money as integer minor units, always; a list endpoint always returning an
object with a \`data\` key rather than a bare array.

**A caller learns your API once.** An inconsistency costs every caller, forever, and it cannot
be fixed later without breaking them — which is why this is worth caring about more than the
choice itself.

**Money as integers.** \`4999\` and a currency, not \`49.99\`. Floating point and money is a
bug you will not find until reconciliation.

**Dates with a time zone.** \`2024-03-01T14:30:00Z\`, never \`01/03/2024\` — which is two
different days depending on the reader's country.

## What to decide before the first caller

- **Ids.** Sequential integers leak how many you have and let people enumerate. UUIDs do not,
  and are bigger and unsortable. Decide once; you cannot change it afterwards.
- **A version in the path.** \`/v1/\` costs nothing today and is the difference between a new
  version and a breaking change.
- **Errors.** One shape, used everywhere.
- **The list envelope.** A bare array cannot gain pagination metadata without breaking
  everybody. \`{"data": [...]}\` can.

**Every one of these is a one-way door.** They are worth an hour before the API is public, and
they are essentially unfixable a year later.`,
    mcqs: [
      mcq('`GET /orders/812` is preferred over `/getOrder?id=812` partly because:',
        [['Caches and proxies understand GET and cannot know /getOrder is safe', true],
          ['It is shorter to type in a browser', false],
          ['Query parameters are less reliable than paths', false],
          ['It follows the convention most frameworks expect', false]],
        'And a caller can guess the rest of your API from one example.'),
      mcq('Returning only `customer_id` on an order:',
        [['Builds an N+1 into your API', true],
          ['Keeps the response focused and small', false],
          ['Lets the caller decide what to fetch', false],
          ['Avoids duplicating data across responses', false]],
        'Each round trip costs far more than the join would have.'),
      mcq('Returning a bare array from a list endpoint:',
        [['Cannot gain pagination metadata without breaking callers', true],
          ['Is harder for clients to parse correctly', false],
          ['Prevents the response being cached', false],
          ['Makes the response larger than necessary', false]],
        'An envelope with a data key can grow; an array cannot.'),
      mcq('A monetary amount in an API response should be represented as:',
        [['Integer minor units with a currency', true],
          ['A decimal string with two places', false],
          ['A floating point number', false],
          ['A formatted string for display', false]],
        'Floating point and money is a bug you find at reconciliation.'),
    ],
    checkpoint: [
      mcq('Deep nesting such as `/customers/5/orders/812/items/9` is avoided because:',
        [['It forces the caller to know a hierarchy that may change', true],
          ['Long URLs are truncated by some clients', false],
          ['It prevents the resource being cached', false],
          ['It requires more database joins to serve each request', false]],
        'Nest to express ownership, then expose the resource directly by its own id.'),
      mcq('Consistency is said to beat correctness because:',
        [['A caller learns the API once, and inconsistency costs them forever', true],
          ['Conventions are arbitrary anyway', false],
          ['Consistent APIs are easier to document', false],
          ['Correct conventions differ between programming languages', false]],
        'And an inconsistency cannot be fixed later without breaking people.'),
      mcq('Sequential integer ids in a public API:',
        [['Leak how many you have and allow enumeration', true],
          ['Are slower to index than UUIDs', false],
          ['Cannot be used across multiple services', false],
          ['Break if the database is ever sharded', false]],
        'A one-way door: decide before the first caller, because you cannot change it after.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_VERSIONING',
    notes: `Once somebody integrates, **you no longer control when your API changes.** They do.

That is the whole problem, and every technique here exists to work around it.

## Changes that are safe

**Additive changes break nobody, if callers are written sanely:**

- Adding a new field to a response.
- Adding a new optional request field.
- Adding a new endpoint.
- Adding a new value to an enum — **usually**, and only if callers were told to tolerate
  unknown values. If they wrote a switch with no default, this breaks them.

## Changes that break people

- Removing or renaming a field.
- Changing a type. \`"total": 49.99\` to \`"total": 4999\` looks like a correction and is a
  breaking change.
- Making an optional request field required.
- Changing what an existing value means. **This is the worst one**, because it breaks silently:
  nothing errors, and every caller's numbers are now wrong.
- Changing a status code, or the shape of an error.
- Tightening validation. Callers were sending something you accepted; now you do not.

## How to version

**In the path** — \`/v1/orders\`. Visible, easy to route, easy to log, obvious in a bug report.
It is the pragmatic default and its only real cost is aesthetic.

**In a header** — \`Accept: application/vnd.api.v2+json\`. Purer, and harder to test by hand,
harder to see in logs, and easier for a caller to get wrong.

**Not at all**, by only making additive changes. Genuinely possible for a long time and it is
the cheapest option while it lasts.

**Version the API, not each endpoint.** Per-endpoint versions produce a matrix nobody can hold
in their head.

## Deprecating something

**Time, not surprise.** People need to plan, and they have their own priorities.

1. **Announce.** Say what is going, what to use instead, and by when. A concrete date.
2. **Warn in the response.** A \`Deprecation\` and a \`Sunset\` header, so it shows up in the
   caller's logs rather than only in an email somebody deleted.
3. **Measure.** Log who is still calling it. **This is the step people skip, and it is the one
   that lets you act** — without it, turning the endpoint off is a decision made blind.
4. **Contact the remaining callers.** By the deadline, there should be few enough to email
   individually.
5. **Then turn it off.** Ideally with a brownout first: return errors for an hour, restore, and
   see who complains. Far better than finding out at the permanent switch-off.

**Six to twelve months is normal for a public API.** Internal APIs can move faster, and only
because you can see and talk to every caller.

## The expand-and-contract pattern

The safe way to make a breaking change, and it works for APIs and databases alike:

1. **Expand.** Add the new field alongside the old. Populate both.
2. **Migrate.** Callers move at their own pace. Both work.
3. **Contract.** When nobody uses the old one — which you know, because you measured — remove
   it.

Slower, and it never breaks anybody, which is the trade.`,
    mcqs: [
      mcq('Which breaking change is worst because it fails silently?',
        [['Changing what an existing value means', true],
          ['Removing a field from the response', false],
          ['Making an optional field required', false],
          ['Changing a status code', false]],
        'Nothing errors, and every caller’s numbers are quietly wrong.'),
      mcq('Adding a new value to an enum breaks callers who:',
        [['Wrote a switch with no default case', true],
          ['Cache the list of valid values', false],
          ['Validate responses against a schema', false],
          ['Store the value in a typed column', false]],
        'Safe only if callers were told to tolerate unknown values.'),
      mcq('The deprecation step people skip is:',
        [['Measuring who is still calling it', true],
          ['Announcing the date in advance', false],
          ['Adding a warning header', false],
          ['Providing a replacement endpoint', false]],
        'Without it, turning the endpoint off is a decision made blind.'),
      mcq('The expand-and-contract pattern works by:',
        [['Running old and new together until nobody uses the old', true],
          ['Versioning each endpoint independently', false],
          ['Redirecting old calls to the new shape', false],
          ['Deprecating the old one immediately on release', false]],
        'Slower, and it never breaks anybody.'),
    ],
    checkpoint: [
      mcq('Versioning in the path rather than a header is usually preferred because:',
        [['It is visible in logs and bug reports', true],
          ['It is more correct under the HTTP specification', false],
          ['Headers cannot express a version reliably', false],
          ['It allows per-endpoint versioning', false]],
        'Its only real cost is aesthetic.'),
      mcq('A brownout before switching an endpoint off:',
        [['Returns errors for a period, to see who complains', true],
          ['Rate-limits remaining callers gradually', false],
          ['Redirects calls to the replacement endpoint', false],
          ['Serves a deprecation warning in the body', false]],
        'Far better than finding out at the permanent switch-off.'),
      mcq('`"total": 49.99` becoming `"total": 4999` is:',
        [['A breaking change, however much it looks like a correction', true],
          ['An additive change, since the field itself still exists', false],
          ['Safe if the documentation is updated', false],
          ['Safe if callers parse it as a number', false]],
        'A type and meaning change, and callers will silently show wrong amounts.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_PAGINATION_AND_FILTERING',
    notes: `Every list endpoint needs three things. Getting them wrong is invisible in
development and painful in production.

## Pagination is not optional

An endpoint returning everything works until somebody has fifty thousand records, and then it
times out, exhausts memory, or ships a 40MB response.

**Paginate from the first day.** Adding it later is a breaking change; having it from the start
costs nothing.

**Always have a default limit**, and a maximum. Without a maximum, \`?limit=1000000\` is a
denial-of-service anyone can perform by accident.

## Offset pagination, and why it fails

    GET /orders?limit=20&offset=9980

Simple, and every caller understands it. **Two problems, both real:**

**It gets slower the deeper you go.** \`OFFSET 9980\` makes the database find and discard 9,980
rows before returning 20. At page 5,000 you are reading a hundred thousand rows to return
twenty, and the cost grows linearly with the page number.

**It skips and duplicates.** Between page 1 and page 2, somebody inserts a record. Everything
shifts by one, and an item that was at position 20 is now at 21 — so it appears on page 2 as
well, and the one that moved off is never seen. **On a busy list this is not rare.**

## Cursor pagination

    GET /orders?limit=20&after=eyJpZCI6ODEyfQ

The cursor encodes where you stopped — an id, or a timestamp plus an id to break ties. The
query becomes:

    WHERE (created_at, id) < (:cursor_time, :cursor_id) ORDER BY created_at DESC, id DESC
    LIMIT 20

**Constant cost at any depth**, and no skips or duplicates, because the position is defined by
the data rather than by a count.

**The costs:** you cannot jump to page 47, and you cannot show "page 3 of 200" without a
separate count. For an infinite scroll or an API consumer walking every record, neither
matters. For an admin table with numbered pages, offset may genuinely be the right answer.

**Choose by the use case**, and be aware that "page 3 of 200" is a requirement that costs you
the good pagination.

## Filtering

    GET /orders?status=shipped&created_after=2024-01-01&customer_id=5

**Decide what is filterable and index those columns.** A filter on an unindexed column on a
large table is a sequential scan that any caller can trigger.

**Do not build a generic query language** unless that is your product. \`?filter=status eq
'shipped' and total gt 100\` is a parser, an injection risk and an unbounded performance
surface, and somebody will write a filter that scans everything.

## Sorting

Allow it on a named, indexed set of fields. **Validate against a whitelist** — passing the sort
field into SQL is a textbook injection, and it is one of the few places where the parameter
genuinely has to reach the query as an identifier rather than a value.

**Always add a tiebreaker.** \`ORDER BY created_at DESC\` with two identical timestamps has no
defined order, so the same row can appear on two pages. \`ORDER BY created_at DESC, id DESC\`
is total, and it is what makes cursor pagination correct.`,
    mcqs: [
      mcq('Offset pagination gets slower with depth because:',
        [['The database finds and discards every skipped row', true],
          ['The result set is re-sorted for each page', false],
          ['Later pages are less likely to be cached', false],
          ['The index becomes less selective deeper in', false]],
        'At page 5,000 you read a hundred thousand rows to return twenty.'),
      mcq('Offset pagination can show the same record twice because:',
        [['An insert shifts everything by one between pages', true],
          ['The sort order is not deterministic', false],
          ['The offset is calculated on the client', false],
          ['Pages overlap by one row by design', false]],
        'And the row that moved off the boundary is never seen at all.'),
      mcq('Cursor pagination cannot easily:',
        [['Jump to page 47', true],
          ['Handle records inserted during paging', false],
          ['Maintain a stable order', false],
          ['Work on a large table', false]],
        '"Page 3 of 200" is a requirement that costs you the good pagination.'),
      mcq('A sort parameter must be validated against a whitelist because:',
        [['It reaches the query as an identifier, not a value', true],
          ['Unsorted columns have no index', false],
          ['Clients may request too many sort fields', false],
          ['The parameter affects the pagination cursor', false]],
        'One of the few places a parameter genuinely cannot be bound safely.'),
    ],
    checkpoint: [
      mcq('A maximum limit is required because:',
        [['`?limit=1000000` is a denial of service anyone can trigger', true],
          ['Clients cannot handle large responses', false],
          ['The database imposes its own row limit per query anyway', false],
          ['It keeps the response time predictable', false]],
        'By accident, usually, which is what makes it common.'),
      mcq('`ORDER BY created_at DESC` with duplicate timestamps:',
        [['Has no defined order, so a row can appear on two pages', true],
          ['Falls back to primary key order automatically', false],
          ['Returns the rows in insertion order', false],
          ['Is rejected by most databases', false]],
        'Add a tiebreaker; it is also what makes cursor pagination correct.'),
      mcq('A generic filter query language is discouraged because:',
        [['It is a parser, an injection risk and unbounded performance', true],
          ['Callers find it harder to use than a fixed set of filters', false],
          ['It cannot express common filters efficiently', false],
          ['It prevents the responses being cached', false]],
        'Unless a query language is your product, name the filters you support.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_ERRORS_A_CALLER_CAN_ACT_ON',
    notes: `An error response has one job: **tell the caller what to do next.** Most fail it.

    HTTP 500
    {"error": "An error occurred"}

Retry? Fix the request? Contact someone? The caller cannot tell, so they will guess, and their
guess is usually to retry — which is exactly wrong if the request was malformed.

## Status codes, used properly

The class is the most important part, because it answers the "what do I do" question before
the body is read:

**4xx — the caller's problem. Do not retry the same request unchanged.**

- **400** — malformed. Bad JSON, missing required field, wrong type.
- **401** — not authenticated. No credential, or an invalid one. Log in.
- **403** — authenticated, not allowed. **Logging in again will not help**, which is exactly
  why this is a different code from 401 — and confusing the two sends users round a login loop.
- **404** — no such resource. Also the right answer for a resource that exists and that this
  caller may not know about, because 403 tells them it exists.
- **409** — conflict. The state has moved: already cancelled, version mismatch.
- **422** — well-formed but semantically invalid. An end date before a start date.
- **429** — too many requests. **Include \`Retry-After\`**, and the caller can behave.

**5xx — your problem. Retrying may work.**

- **500** — something broke. Never leak a stack trace; it is an information disclosure.
- **503** — temporarily unavailable. Also takes \`Retry-After\`.
- **504** — a dependency timed out.

**The classification decides retry behaviour.** Returning 500 for a validation error makes
well-behaved clients retry a request that can never succeed, which is how a bad deploy turns
into a traffic storm.

## A body worth returning

    {
      "error": {
        "code": "insufficient_stock",
        "message": "Only 2 units of SKU-4421 remain.",
        "details": { "sku": "SKU-4421", "requested": 5, "available": 2 },
        "request_id": "req_01HX3..."
      }
    }

- **\`code\`** — stable, machine-readable. Callers branch on this; **they must never have to
  parse the message**, because you will reword it.
- **\`message\`** — human-readable, for a developer's log.
- **\`details\`** — structured, so the client can show a useful message of its own.
- **\`request_id\`** — so a support conversation can find the exact request in your logs. It is
  the cheapest field here and the most valuable one in an incident.

**One shape everywhere.** A caller writes error handling once.

## Validation errors need every failure

    {"error": {"code": "validation_failed",
      "details": {"fields": [
        {"field": "email", "code": "invalid_format"},
        {"field": "age", "code": "out_of_range", "min": 18}]}}}

Returning only the first failure makes a form submit five times to discover five problems.

## What not to do

- **Leaking internals.** A SQL error or a stack trace tells an attacker your schema and your
  versions.
- **200 with an error inside.** Every piece of tooling — proxies, monitors, retry libraries —
  is now blind to your failures.
- **A different shape per endpoint.** The caller writes five error handlers.
- **Codes you invent as you go.** Keep a list; it is part of the API.`,
    mcqs: [
      mcq('403 is distinct from 401 because:',
        [['Logging in again will not help', true],
          ['The credential was valid but expired', false],
          ['The resource does not exist for this caller', false],
          ['It indicates a server-side policy failure', false]],
        'Confusing the two sends users round a login loop.'),
      mcq('Returning 500 for a validation error causes:',
        [['Well-behaved clients to retry a request that can never succeed', true],
          ['The error to be logged at the wrong level', false],
          ['The caller to see an unhelpful message', false],
          ['Monitoring to miss the failure entirely', false]],
        'Which is how a bad deploy turns into a traffic storm.'),
      mcq('Callers should branch on:',
        [['A stable machine-readable code', true],
          ['The human-readable message', false],
          ['The HTTP status code alone', false],
          ['The structured details object', false]],
        'You will reword the message, and anybody parsing it breaks.'),
      mcq('Returning 200 with an error inside the body:',
        [['Blinds every proxy, monitor and retry library', true],
          ['Is acceptable for partial successes', false],
          ['Simplifies client-side error handling', false],
          ['Avoids triggering unnecessary alerts', false]],
        'The status code is the part the infrastructure reads.'),
    ],
    checkpoint: [
      mcq('A 429 response should include:',
        [['Retry-After', true], ['A rate limit policy document', false],
          ['The caller’s current usage total', false], ['A 503 in the body', false]],
        'So the caller can behave rather than guess.'),
      mcq('The cheapest and most valuable field in an error body during an incident is:',
        [['The request id', true], ['The error code', false],
          ['The structured details', false], ['The timestamp', false]],
        'It lets a support conversation find the exact request in your logs.'),
      mcq('Returning only the first validation failure:',
        [['Makes a form submit five times to find five problems', true],
          ['Is standard practice for REST APIs', false],
          ['Reduces the size of the error response substantially', false],
          ['Prevents leaking the validation rules', false]],
        'Return every failure, structured by field.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_DEBUGGING',
    notes: `Five API problems. Two are design mistakes that only show at scale; three are
failures of the contract.

## 1. The chatty API

**Symptom:** the client is slow and every individual endpoint is fast. **Cause:** rendering one
screen takes eleven calls, each with its own round trip. **This is the N+1 you built into
someone else's client**, and it is invisible from your monitoring, which sees eleven fast
requests. **Fix:** design the response for the screen, or provide an expansion parameter.
**Diagnosis:** count the requests per screen, from the client's network tab.

## 2. The offset that got slow

**Symptom:** page 1 is instant, page 500 takes nine seconds, and there is no slow query in the
log because nobody goes that deep — except the integration partner walking every record at 3am.
**Fix:** cursor pagination. **Tell:** response time correlates with the page number.

## 3. The breaking change nobody meant to make

**Symptom:** a partner's integration fails and nothing was deployed to their side.
**Causes, all common:** a field renamed in a refactor; serialisation changed by a library
upgrade; validation tightened; a nullable field that now is null for the first time.

**Fix:** a contract test. A test that asserts the exact shape of your responses, which fails
when the shape changes — so the change becomes a decision rather than an accident.

## 4. The inconsistent error shape

**Symptom:** the caller's error handling works for some endpoints and not others. **Cause:**
one endpoint returns \`{"error": "..."}\`, another \`{"message": "..."}\`, a third a plain
string, and the framework's own 404 returns HTML. **The last one is the one people miss** —
your unhandled routes and your framework's defaults are part of your API whether you designed
them or not.

## 5. The timeout with no idempotency

**Symptom:** duplicate orders. **Cause:** your response was slow, the client timed out and
retried, and the first request had succeeded. **Fix:** an idempotency key — the same fix as the
transactions topic, and the same underlying truth: **a timeout is an unknown, not a failure.**

## Diagnosing an API problem

**Reproduce it with \`curl\`.** Remove the client entirely. Half of all "the API is broken"
reports are the client sending something other than what its author believes.

**Log the request id and return it.** When a caller reports a problem, ask for the id, and you
are looking at the exact request in seconds rather than searching by timestamp.

**Log the response status by endpoint.** A sudden rise in 400s means a caller changed
something — or you tightened validation. A rise in 404s often means someone is enumerating ids,
which is the next topic's subject.`,
    mcqs: [
      mcq('A chatty API is invisible from your monitoring because:',
        [['It sees eleven fast requests, which look healthy', true],
          ['The calls come from a cached client', false],
          ['Client-side timing is not reported', false],
          ['The slowness is in the network, not the server', false]],
        'Count the requests per screen from the client side instead.'),
      mcq('Response time correlating with the page number is the tell for:',
        [['Offset pagination on a large table', true],
          ['A missing index on the sort column', false],
          ['A cache that only covers early pages', false],
          ['A client fetching too many pages at once', false]],
        'And nobody notices until a partner walks every record at 3am.'),
      mcq('A contract test protects against:',
        [['A refactor or library upgrade changing the response shape', true],
          ['A caller sending an invalid request', false],
          ['A dependency timing out under load', false],
          ['An endpoint becoming slow at scale', false]],
        'The change becomes a decision rather than an accident.'),
      mcq('Which inconsistent error source do people most often miss?',
        [['The framework’s own 404 returning HTML', true],
          ['One endpoint using a different key name', false],
          ['A handler returning a plain string', false],
          ['Validation errors using a nested shape', false]],
        'Your unhandled routes are part of your API whether you designed them or not.'),
    ],
    checkpoint: [
      mcq('Reproducing an API problem with curl first:',
        [['Removes the client, which is wrong half the time', true],
          ['Is faster than reading through the client code', false],
          ['Bypasses any client-side caching', false],
          ['Produces a cleaner error message', false]],
        'Half of "the API is broken" is the client sending something else.'),
      mcq('A sudden rise in 404s often means:',
        [['Somebody is enumerating ids', true],
          ['A route was removed in a deploy', false],
          ['A client is using a stale base URL', false],
          ['The database lost some records', false]],
        'Which is why sequential ids in a public API are a decision worth making carefully.'),
      mcq('Duplicate orders after a slow response are fixed by:',
        [['An idempotency key', true],
          ['A longer client timeout', false],
          ['A unique constraint on the order table', false],
          ['Disabling client retries', false]],
        'The same fix as the transactions topic, for the same reason.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_PRACTICE',
    notes: `Two exercises on the two things that go wrong at scale: pagination and error
classification.

Neither needs a web framework. Both are about the decision rather than the plumbing, which is
what transfers.`,
    coding: [
      {
        title: 'Cursor pagination that does not skip',
        description: `Records are given as \`id timestamp\` lines, already sorted newest first
by \`(timestamp, id)\` descending. Then a final line: \`limit cursor\`, where cursor is either
\`-\` for the first page or \`<timestamp>:<id>\` meaning "everything strictly after this
position".

Print the ids on that page, space separated, then the next cursor as \`<timestamp>:<id>\` on
its own line, or \`end\` when there are no more records.

An empty page prints an empty line, then \`end\`.

The comparison is on the **pair**, not on the timestamp alone — that tiebreaker is what makes
this correct when two records share a timestamp.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
records = [(int(t), int(i)) for i, t in [(r[0], r[1]) for r in lines[:-1]]]
limit, cursor = lines[-1][0], lines[-1][1]

# Compare on (timestamp, id), not timestamp alone.
`,
        language: 'python',
        tests: [
          { input: '5 100\n4 90\n3 80\n2 70\n1 60\n2 -\n', expectedOutput: '5 4\n90:4' },
          { input: '5 100\n4 90\n3 80\n2 70\n1 60\n2 90:4\n', expectedOutput: '3 2\n70:2' },
          { input: '5 100\n4 90\n3 80\n2 70\n1 60\n2 70:2\n', expectedOutput: '1\nend' },
          { input: '5 100\n4 90\n10 -\n', expectedOutput: '5 4\nend' },
          { input: '7 50\n6 50\n5 50\n2 -\n', expectedOutput: '7 6\n50:6', isHidden: true },
          { input: '7 50\n6 50\n5 50\n2 50:6\n', expectedOutput: '5\nend', isHidden: true },
        ],
      },
      {
        title: 'Classify the failure',
        description: `Given a failure description, print the status code that should be
returned and whether the caller should retry, as \`<code> <retry|no-retry>\`.

Input is one word per line, the failure kind:

- \`malformed_json\` → 400 no-retry
- \`missing_credential\` → 401 no-retry
- \`not_permitted\` → 403 no-retry
- \`unknown_resource\` → 404 no-retry
- \`already_cancelled\` → 409 no-retry
- \`end_before_start\` → 422 no-retry
- \`rate_limited\` → 429 retry
- \`unhandled_exception\` → 500 retry
- \`dependency_timeout\` → 504 retry
- anything else → 500 retry

One line of output per line of input.`,
        starter: `import sys

kinds = [l.strip() for l in sys.stdin if l.strip()]

# The class decides the retry advice. Map deliberately rather than by guesswork.
`,
        language: 'python',
        tests: [
          { input: 'malformed_json\nrate_limited\n', expectedOutput: '400 no-retry\n429 retry' },
          { input: 'not_permitted\n', expectedOutput: '403 no-retry' },
          { input: 'end_before_start\nunknown_resource\n', expectedOutput: '422 no-retry\n404 no-retry' },
          { input: '', expectedOutput: '' },
          { input: 'something_odd\n', expectedOutput: '500 retry', isHidden: true },
          { input: 'already_cancelled\ndependency_timeout\nmissing_credential\n', expectedOutput: '409 no-retry\n504 retry\n401 no-retry', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'API Design Practice',
      description: 'Cursor pagination, error classification, and a critique of a real API.',
      instructions: `Complete both exercises, then answer:

1. For the first: the tests include three records sharing a timestamp. Say what happens with a
   cursor on the timestamp alone, concretely — which record is skipped or repeated.
2. For the first: say what your endpoint cannot do that an offset one can, and name one product
   requirement that would force you back to offset.
3. For the second: explain why 403 and 404 are both defensible for a resource that exists and
   that the caller may not see. Pick one and say when you would choose the other.
4. For the second: a client receives 500 and retries three times with no backoff. Say what
   happens to a server that is already struggling, and what the client should do instead.

**Then, on a real API.** Pick any public API with documentation.

5. Find its pagination. Which style? Is there a maximum limit? What happens with no limit?
6. Find its error format. Is there a machine-readable code? Is the shape consistent across at
   least three different error types? Show them.
7. Find one thing you would design differently, and say what it would cost them to change now.
   That second half is the point — naming a one-way door they are standing on.`,
      rubric: [
        { criterion: 'Cursor pagination', description: 'Correct across pages, including the shared-timestamp cases and the end.', maxPoints: 20 },
        { criterion: 'The tiebreaker explained', description: 'Says concretely which record is skipped without it.', maxPoints: 15 },
        { criterion: 'Error classification', description: 'Correct codes and retry advice, including the unknown kind.', maxPoints: 20 },
        { criterion: '403 against 404', description: 'Both defended, one chosen, with the other’s case named.', maxPoints: 15 },
        { criterion: 'A real API examined', description: 'Pagination and error format found and reported with evidence.', maxPoints: 20 },
        { criterion: 'A one-way door named', description: 'One design change, with what it would cost them now.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

kinds = [l.strip() for l in sys.stdin if l.strip()]
`,
        tests: [
          { input: 'malformed_json\nrate_limited\n', expectedOutput: '400 no-retry\n429 retry' },
          { input: 'not_permitted\n', expectedOutput: '403 no-retry' },
          { input: '', expectedOutput: '' },
          { input: 'something_odd\n', expectedOutput: '500 retry', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A cursor on the timestamp alone, with three records sharing one:',
        [['Skips or repeats records at the page boundary', true],
          ['Returns them in an arbitrary but complete order', false],
          ['Fails with an ambiguous cursor error', false],
          ['Works, since timestamps are usually unique', false]],
        'The pair is what makes the position unambiguous.'),
      mcq('A client retrying a 500 three times with no backoff:',
        [['Multiplies load on a server that is already struggling', true],
          ['Is the correct behaviour for a 5xx', false],
          ['Risks duplicating the request only if it succeeded', false],
          ['Has no effect, since the server is failing anyway', false]],
        'Exponential backoff with jitter, and a limit.'),
      mcq('An unrecognised failure kind should map to:',
        [['500, because you do not know it is the caller’s fault', true],
          ['400, as the safest default', false],
          ['503, since the state of the request is unknown', false],
          ['422, pending classification', false]],
        'Blaming the caller for something you have not classified is worse than owning it.'),
    ],
  },

  {
    unitCode: 'T3_API_DESIGN_MINI_PROJECT',
    notes: `Design and build an API, then have somebody who has not seen it try to use it from
your documentation alone.

**That last step is the project.** Everything before it is preparation. An API you designed is
always usable by you, and the only honest test is whether a stranger can call it correctly from
what you wrote down.

Budget around two hours, and arrange the reviewer in advance.`,
    assignment: {
      title: 'Mini Project — An API Somebody Else Can Use',
      description: 'Design, build and document an API, then watch somebody use it from the documentation alone.',
      instructions: `**Build** a small API for a real domain — a library, a booking system, an
issue tracker. At least:

- A list endpoint with pagination, filtering and sorting.
- A detail endpoint.
- A create endpoint with validation.
- An update endpoint.
- One action endpoint that is not plain CRUD — cancel, publish, approve.

**Part one — the decisions, written down before you code**

1. Id scheme, and why.
2. Naming convention and date format.
3. The error shape, as a concrete example.
4. The list envelope.
5. Pagination style, with the trade-off you accepted.
6. Version strategy.

Half a page. These are the one-way doors.

**Part two — build it**

7. Implement all five. Validation must return **every** failure, structured by field.
8. Errors must use one shape everywhere — **including the framework's own 404 and 500**. Check
   what your framework returns for an unhandled route and make it match.
9. Include a request id in every response and every log line.

**Part three — the test that matters**

10. Write documentation: every endpoint, its parameters, its response shape, its errors, and a
    working example call for each.
11. **Give it to somebody who has not seen the project.** Ask them to perform three tasks you
    specify — create something, list it with a filter, and trigger a validation error
    deliberately.
12. **Watch. Do not help.** Write down every question they ask and every place they get stuck.
13. Fix the documentation. Say what you changed.

**Part four — the breaking change**

14. Now make a breaking change: rename a field, or change its type.
15. Do it with expand-and-contract so that a caller using the old shape keeps working. Show
    both working.
16. Say how you would know when it was safe to remove the old field, specifically.

**Submit** the decision half-page, the API, the documentation before and after, the list of
questions your reviewer asked, and the expand-and-contract change.`,
      rubric: [
        { criterion: 'Decisions written first', description: 'Six one-way doors, decided and justified before the code.', maxPoints: 15 },
        { criterion: 'Five working endpoints', description: 'Including pagination, filtering, and a non-CRUD action.', maxPoints: 20 },
        { criterion: 'One error shape, everywhere', description: 'Including the framework’s own 404 and 500, checked.', maxPoints: 15 },
        { criterion: 'A real reviewer, unhelped', description: 'Three tasks, questions recorded, no assistance given.', maxPoints: 25 },
        { criterion: 'Documentation fixed from evidence', description: 'Changes traceable to where the reviewer got stuck.', maxPoints: 15 },
        { criterion: 'Expand and contract', description: 'Both shapes working, and a specific removal criterion.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The reviewer step is the project because:',
        [['An API you designed is always usable by you', true],
          ['External review catches security problems', false],
          ['It validates the documentation format', false],
          ['It simulates a real integration partner', false]],
        'The only honest test is whether a stranger can call it from what you wrote.'),
      mcq('The brief asks you to check your framework’s own 404 because:',
        [['Unhandled routes are part of your API whether you designed them or not', true],
          ['Frameworks often return the wrong status code', false],
          ['It is required for the documentation to be considered complete', false],
          ['404 responses are the most commonly received', false]],
        'One error shape everywhere means everywhere.'),
      mcq('"How would you know it was safe to remove the old field?" is asking for:',
        [['Measurement of who is still using it', true],
          ['A deprecation period of a fixed length', false],
          ['Confirmation from the documented callers', false],
          ['A version bump that excludes it', false]],
        'Without measurement, removal is a decision made blind.'),
    ],
  },

  /* ══ T3_AUTH ════════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_AUTH_SESSIONS_AND_TOKENS',
    notes: `HTTP is stateless. Every request arrives as though it were the first, so something
must travel with each one to say who is calling.

**Two approaches, and the difference is where the state lives.**

## Sessions

The server stores the session; the client holds only an opaque id.

    Cookie: session=a8f3c9...     →     server looks it up

**What you get:**

- **Revocation is instant.** Delete the row; the next request fails. This is the property
  tokens struggle with and it is worth a lot.
- **The id carries no information.** Nothing leaks if it is seen.
- **You can change what a session means** without reissuing anything.

**What it costs:**

- **A lookup per request.** Usually a cache hit, so cheap, but it is a dependency on the
  session store being up.
- **Shared state across servers.** Ten instances need one store, and a session in one
  instance's memory means a user who logs in and then hits another server is logged out.

## Tokens (JWT and similar)

The token carries the claims, signed. The server verifies the signature and trusts the contents.

    Authorization: Bearer eyJhbGciOi...

**What you get:**

- **No lookup.** Verify the signature and read the claims. Genuinely stateless.
- **Works across services** without a shared session store.

**What it costs, and this is the part that is undersold:**

- **You cannot revoke it.** It is valid until it expires, and the server has no record of it to
  delete. A leaked token with a 24-hour expiry is 24 hours of access you cannot stop.
- **Claims are stale.** A user demoted from admin keeps admin until their token expires,
  because the token says admin and the server believes it.
- **It is bigger**, on every request.
- **It is readable.** Signed, not encrypted. **Anyone can decode it and read the claims**, so
  it must contain nothing secret.

## Choosing

**A single web application → sessions.** Simpler, revocable, and the lookup is not your
bottleneck. This is the right default and it is chosen less often than it should be, because
tokens sound more modern.

**Several services, or a mobile client → tokens**, with **short expiry and a refresh mechanism**
to get revocation back. That combination is the next unit.

**The common mistake:** choosing tokens for a single web app, then discovering that logout does
not work — because there is nothing to delete — and building a server-side blocklist of revoked
tokens. At which point you have a session with extra steps.

## Where the credential is kept, in a browser

This matters more than the choice above.

**An \`HttpOnly\` cookie** cannot be read by JavaScript, so an XSS flaw cannot steal it. It is
sent automatically, which means you must handle CSRF — with \`SameSite\` and a token.

**\`localStorage\`** is readable by any JavaScript on the page. **An XSS anywhere on your
domain — including in a third-party script you included — takes every user's credential.**

**\`HttpOnly\` cookies are the safer default**, and "store the JWT in localStorage" is an
extremely common piece of advice that trades a real vulnerability for convenience.`,
    mcqs: [
      mcq('The fundamental difference between sessions and tokens is:',
        [['Where the state lives', true],
          ['Whether the credential is encrypted', false],
          ['How long the credential lasts', false],
          ['Whether cookies are involved', false]],
        'Server-side and looked up, or carried by the client and verified.'),
      mcq('A JWT cannot be revoked because:',
        [['The server has no record of it to delete', true],
          ['The signature cannot be invalidated', false],
          ['The client controls when it is sent', false],
          ['Revocation would require re-encrypting it', false]],
        'Valid until it expires, whatever you would like to happen.'),
      mcq('A JWT must contain nothing secret because:',
        [['It is signed, not encrypted, and anyone can decode it', true],
          ['It is stored in the browser where scripts can read it', false],
          ['It is logged by proxies along the way', false],
          ['Its claims are cached by the client', false]],
        'Signing proves it was not altered; it does not hide anything.'),
      mcq('Building a blocklist of revoked tokens means:',
        [['You have a session with extra steps', true],
          ['You have the best of both approaches', false],
          ['Revocation now works as intended', false],
          ['The tokens no longer need short expiry', false]],
        'A lookup per request, which is the thing tokens were chosen to avoid.'),
    ],
    checkpoint: [
      mcq('Storing a token in localStorage means:',
        [['Any XSS on your domain takes every user’s credential', true],
          ['The token survives a browser restart safely', false],
          ['CSRF protection is no longer required', false],
          ['The token cannot be sent to other origins', false]],
        'Including an XSS in a third-party script you included.'),
      mcq('An HttpOnly cookie requires you to handle:',
        [['CSRF, because it is sent automatically', true],
          ['XSS, because scripts can read it', false],
          ['Token refresh, because it cannot expire', false],
          ['Cross-origin requests, which it blocks', false]],
        'SameSite and a token; the trade for the XSS protection.'),
      mcq('The right default for a single web application is:',
        [['Sessions', true], ['Tokens in localStorage', false],
          ['Tokens in a cookie', false], ['Basic authentication', false]],
        'Simpler and revocable; tokens get chosen because they sound more modern.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_EXPIRY_AND_REFRESH',
    notes: `**A credential that never expires is a credential you can never take back.**

Every leak becomes permanent: a token in a screenshot, a session id in a log, an API key in a
public repository. Without expiry, the only remedy is finding and deleting each one — and you
will not find them all.

## Two competing pressures

**Short expiry is safer.** A leaked credential is useful for minutes.

**Short expiry is annoying.** Logging in every fifteen minutes makes people avoid your product,
or write the password down.

**The resolution is two credentials:**

- **An access token, short-lived** — minutes. Sent with every request. If it leaks, it is
  nearly worthless.
- **A refresh token, long-lived** — days or weeks. Sent **only** to the refresh endpoint,
  stored more carefully, and **revocable**, because the server does keep a record of it.

The access token gives you statelessness on the hot path; the refresh token gives you
revocation. You check the database once per refresh rather than once per request.

## Rotation, and what it detects

**Issue a new refresh token each time one is used, and invalidate the old one.**

This does something clever. If an attacker steals a refresh token and uses it, the legitimate
user's next refresh presents a token that has already been used — **and a reused refresh token
is proof of theft.** You cannot tell which party is the attacker, so you revoke the whole
family and force a re-login.

That is a genuine detection mechanism, obtained for very little.

## Revocation

**What must be revocable:** a leaked credential, a user's sessions on logout, everything on a
password change, a compromised account, a departing employee's access.

**How:**

- **Sessions** — delete the record. Immediate.
- **Refresh tokens** — delete the record. Immediate for future refreshes.
- **Access tokens** — you cannot. **You wait for expiry**, which is precisely why it is short.

**So "log out everywhere" means:** delete all refresh tokens and all sessions, and accept that
existing access tokens remain valid for their few remaining minutes. State that window in your
security documentation rather than implying an immediacy you do not have.

## Where the clock bites

**Expiry is checked against a clock.** If two servers disagree, tokens are rejected as
not-yet-valid or accepted after expiry. **Run NTP**, and allow a small tolerance — thirty
seconds is usual.

**Expressed how:** \`exp\` as an absolute UTC timestamp, never "3600 seconds from when you
received it", which drifts.

## Other credentials with the same rule

**API keys.** Long-lived by nature and therefore the most dangerous thing you issue. Give them
scopes, let users rotate them, show them once, and **record last-used** so unused ones can be
found and removed.

**Password reset links.** Short — fifteen minutes. **Single use**, invalidated on use. These
end up in email, in logs, and in browser history.

**Email verification links.** Longer is acceptable, but still single use.

## The rule

**Everything expires. Everything can be revoked. Nothing is permanent.** If you cannot answer
"how would we take this back?", the design is not finished.`,
    mcqs: [
      mcq('The access and refresh token split exists to:',
        [['Get statelessness on the hot path and revocation at refresh', true],
          ['Reduce the size of the credential sent each time', false],
          ['Allow different scopes for different endpoints', false],
          ['Support multiple devices per user', false]],
        'One database check per refresh, rather than one per request.'),
      mcq('Refresh token rotation detects theft because:',
        [['A reused refresh token is proof somebody has a copy', true],
          ['The attacker cannot generate a valid new token', false],
          ['The old token is logged when invalidated', false],
          ['The refresh endpoint records the client address', false]],
        'You cannot tell which party is the attacker, so you revoke the family.'),
      mcq('"Log out everywhere" cannot immediately stop:',
        [['Existing access tokens, until they expire', true],
          ['Refresh tokens, which must expire naturally', false],
          ['Server-side sessions, which are cached', false],
          ['API keys, which have no expiry', false]],
        'Which is precisely why the access token is short.'),
      mcq('Expiry should be expressed as:',
        [['An absolute UTC timestamp', true],
          ['A duration from issue', false],
          ['A duration from receipt', false],
          ['A version number the server tracks', false]],
        'A relative duration drifts, and the clock is what enforces it.'),
    ],
    checkpoint: [
      mcq('A password reset link should be:',
        [['Short-lived and single use', true],
          ['Long-lived so the user has time', false],
          ['Reusable until the password changes', false],
          ['Valid until the next login attempt', false]],
        'They end up in email, in logs and in browser history.'),
      mcq('Recording last-used on an API key allows you to:',
        [['Find and remove the ones nobody uses', true],
          ['Detect when a key has been shared', false],
          ['Rotate keys automatically on a schedule', false],
          ['Rate-limit by key rather than by address', false]],
        'Long-lived by nature, so the unused ones are pure exposure.'),
      mcq('Servers disagreeing about the time causes:',
        [['Tokens rejected as not-yet-valid, or accepted after expiry', true],
          ['Signatures failing to verify', false],
          ['Refresh tokens rotating too early', false],
          ['Sessions being looked up in the wrong session store', false]],
        'Run NTP, and allow about thirty seconds of tolerance.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_AUTHORIZATION',
    notes: `**Authentication proves who you are. Authorization decides what you may do.** They
are different questions, and a graduate who has done the first and not the second has built a
system where every logged-in user can do everything.

That sentence is the module. The rest is where the check has to live.

## Where the check must be

**On every request, at the point the data is accessed.** Not at the door, and not in the user
interface.

    @app.get('/orders/<id>')
    def get_order(id):
        order = Order.get(id)          # <-- fetched before any check
        return order.to_json()

Authenticated, so the user is real. **Nothing checks whether this order is theirs.** Change the
id and read anybody's order.

    def get_order(id):
        order = Order.get(id)
        if order.customer_id != current_user.id and not current_user.is_staff:
            abort(404)
        return order.to_json()

**404, not 403** — 403 confirms the order exists, which is information the caller should not
have.

## Why "check at the door" fails

Checking once at login and then trusting the session is wrong for three reasons:

**Permissions change mid-session.** An admin demoted at 10am keeps admin until they log out.

**Not every route goes through the door.** A background job, an internal service, a new
endpoint somebody added last week.

**The check is about the resource, not the user.** "Is this user an admin" is answerable at
login. "May this user see *this order*" is not — it depends on which order, and that is only
known at the moment of the request.

## Hiding the button is not authorization

The UI hides what a user may not do. **That is usability, not security.** The API is callable
directly, and anybody can open the network tab and repeat a request with a different id.

**Every check must exist on the server.** The UI check is a convenience on top of it.

## Where to put it so it is not forgotten

The risk is not a wrong check; it is a **missing** one, on the endpoint added in a hurry.

**Deny by default.** A framework where an endpoint is protected unless explicitly marked public
fails safe. One where an endpoint is public unless marked protected fails open, and the failure
is silent.

**Scope at the query.** This is the strongest pattern:

    Order.filter(customer_id=current_user.id, id=id)

There is no moment at which the wrong order is in memory. **You cannot forget to check, because
the check is the query** — and a new endpoint using the same scoped accessor inherits it.

**Centralise the rules.** \`can_view(user, order)\` in one place, called everywhere, rather than
the condition copied into fourteen handlers where thirteen get updated.

## Testing it

**Test the negative case.** Almost every suite tests that the owner can see their order.
Very few test that a stranger cannot.

    def test_other_users_order_is_not_visible():
        response = client.get(f'/orders/{other_persons_order.id}', as_user=me)
        assert response.status_code == 404

**Write one of these for every endpoint that returns anything belonging to somebody.** It is
the highest-value test in the whole suite, and it is the one nobody writes.`,
    mcqs: [
      mcq('Authorization must be checked:',
        [['On every request, where the data is accessed', true],
          ['Once at login, and cached in the session', false],
          ['At the API gateway, before routing', false],
          ['In the user interface and the API equally', false]],
        'Permissions change, not every route goes through the door, and it depends on the resource.'),
      mcq('Returning 404 rather than 403 for someone else’s order:',
        [['Avoids confirming that the order exists', true],
          ['Is required by the HTTP specification', false],
          ['Prevents the client from retrying', false],
          ['Is simpler to implement consistently', false]],
        '403 is information the caller should not have.'),
      mcq('Scoping the query is the strongest pattern because:',
        [['There is no moment when the wrong record is in memory', true],
          ['It performs better than a separate check', false],
          ['It keeps the authorization logic near the data', false],
          ['It works the same across all frameworks', false]],
        'You cannot forget the check, because the check is the query.'),
      mcq('Hiding a button in the UI is:',
        [['Usability, not security', true],
          ['Sufficient when combined with authentication', false],
          ['A valid defence-in-depth layer on its own', false],
          ['Security, provided the API is not public', false]],
        'Anyone can open the network tab and repeat the request.'),
    ],
    checkpoint: [
      mcq('A framework that makes endpoints public unless marked protected:',
        [['Fails open, and fails silently', true],
          ['Is more flexible for internal services', false],
          ['Requires more explicit configuration', false],
          ['Is safer for endpoints that serve static data', false]],
        'Deny by default is the property you want.'),
      mcq('The highest-value test almost nobody writes is:',
        [['That a stranger cannot see somebody else’s record', true],
          ['That an admin can see every record', false],
          ['That an unauthenticated request is rejected', false],
          ['That permissions are cached correctly', false]],
        'Every suite tests the owner can see theirs; very few test the negative.'),
      mcq('"May this user see this order?" cannot be answered at login because:',
        [['It depends on which order, known only at request time', true],
          ['Permissions are stored separately from the session', false],
          ['The order may not exist yet', false],
          ['Login does not establish the user’s role', false]],
        'Resource-level authorization is a different question from role-level.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_BROKEN_ACCESS_CONTROL',
    notes: `Change the id in the URL. That is the attack. **No tools, no exploit, no
cleverness** — and it is consistently at the top of the OWASP list, because it is
extraordinarily common and completely trivial.

    /orders/812     →     /orders/813

If you see somebody else's order, the application is broken. It is called an **insecure direct
object reference**, and every graduate who has authenticated a request and never authorized one
has built it.

## Where it hides

**In URLs.** \`/invoices/4471\`, \`/users/9/profile\`, \`/documents/download/113\`.

**In request bodies.** \`{"account_id": 5, "amount": 100}\` — change \`account_id\` to somebody
else's. People check paths and forget bodies.

**In hidden form fields.** They are not hidden. They are in the HTML.

**In API responses that then get trusted.** The client is sent a customer id and sends it back;
the server trusts it because "we sent it".

**In file downloads.** \`/files/report-2024-03.pdf\` — try February. Try another customer's
name. Sequential or guessable filenames are the same bug with a different surface.

**In "internal" endpoints.** \`/admin/users\` without a check, on the assumption nobody knows
it exists. Somebody will.

## Testing for it, which takes ten minutes

**This is a thing you can actually do on your own project this afternoon.**

1. Create two accounts, A and B.
2. As A, create some data. Note the ids.
3. Log in as B.
4. Request A's resources by id. Every endpoint.
5. **Anything you can see or change is a vulnerability.**

Then repeat with: no credential at all; an expired one; ids in request bodies rather than
paths; and \`PUT\`/\`DELETE\` as well as \`GET\` — **write endpoints are checked less often
than read ones**, and the consequences are worse.

## The fixes

**Scope every query to the caller.** As the previous unit said: \`Order.filter(customer_id=
current_user.id, id=id)\`. The wrong record is never loaded.

**Never take an identity from the request.** \`current_user.id\` comes from the verified
credential, never from a body field. If a request contains \`"user_id"\`, ask why — the server
already knows who is calling.

**Unguessable ids help and do not fix it.** A UUID makes enumeration impractical, and it is
defence in depth, not a control: the id still leaks in a shared link, a screenshot, a referrer
header. **An application secured only by unguessable ids is one leaked URL from a breach.**

**404 rather than 403** for resources the caller should not know about.

## The one to write down

**Automate the two-account test.** For every endpoint that returns something belonging to
somebody, a test that B cannot see A's. It is tedious to write once and it makes this entire
class of vulnerability impossible to reintroduce — which is worth more than any amount of
carefulness, because carefulness does not survive a hurried Friday.`,
    mcqs: [
      mcq('An insecure direct object reference is exploited by:',
        [['Changing an id in the request', true],
          ['Intercepting and replaying a token', false],
          ['Injecting a value into a query', false],
          ['Guessing a password for another account', false]],
        'No tools, no cleverness, and top of the OWASP list.'),
      mcq('Which surface do people most often forget to check?',
        [['Ids in request bodies', true],
          ['Ids in the URL path', false],
          ['Ids in query parameters', false],
          ['Ids in the session cookie', false]],
        'Paths get checked; bodies get trusted because "we sent it".'),
      mcq('Unguessable ids are:',
        [['Defence in depth, not a control', true],
          ['A complete fix for this class of bug', false],
          ['Only useful for public-facing resources', false],
          ['Equivalent to scoping the query', false]],
        'An application secured only by them is one leaked URL from a breach.'),
      mcq('Write endpoints matter more than read ones here because:',
        [['They are checked less often and the consequences are worse', true],
          ['They are harder to scope by the caller', false],
          ['They cannot return 404 without leaking', false],
          ['They bypass the query layer more often', false]],
        'Test PUT and DELETE as well as GET.'),
    ],
    checkpoint: [
      mcq('The two-account test consists of:',
        [['Creating data as A, then requesting it as B', true],
          ['Comparing permissions between two roles', false],
          ['Testing with and without a credential', false],
          ['Running the suite as two different users', false]],
        'Anything B can see or change is a vulnerability, and it takes ten minutes.'),
      mcq('A `user_id` field in a request body should prompt:',
        [['The question of why, since the server knows the caller', true],
          ['Validation that it is a valid user', false],
          ['A check that it matches the session that was presented', false],
          ['Logging for audit purposes', false]],
        'Identity comes from the verified credential, never from the request.'),
      mcq('Automating the two-account test is worth the tedium because:',
        [['Carefulness does not survive a hurried Friday', true],
          ['It is faster than manual testing each release', false],
          ['It documents the authorization rules', false],
          ['It satisfies most compliance requirements', false]],
        'It makes the whole class impossible to reintroduce.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_DEBUGGING',
    notes: `Five authentication and authorization failures. The first two are silent, which is
what makes them dangerous.

## 1. The missing check

**Symptom:** none. Everything works. The application is broken and nothing tells you.

**Cause:** an endpoint added without an authorization check, usually in a hurry, usually by
someone who assumed the framework handled it.

**Detection:** the two-account test, automated. **There is no symptom to notice**, so detection
has to be deliberate — this is the only bug in this module that will never announce itself.

## 2. The check that always passes

    if user.role == 'admin' or True:     # left from debugging
    if not user.can_edit:                 # can_edit is a method, not called
        abort(403)

The second is the nasty one. **A bound method is always truthy**, so \`not user.can_edit\` is
always false and the check never fires. It looks completely correct.

**Detection:** a test that asserts the *denied* case. A check nobody has seen deny anything has
not been tested.

## 3. The 401/403 confusion

**Symptom:** users bounce round a login loop. They log in, get sent back to login, log in
again.

**Cause:** returning 401 for a permission failure. The client sees 401, assumes the credential
is bad, and redirects to login — where the user authenticates successfully and is refused
again.

**Fix:** 401 means *who are you*; 403 means *not you*.

## 4. The token that will not validate

Work through these in order: the **clock** (servers disagreeing produces "not yet valid" and
"expired" on a fresh token); the **key** (rotated, or a different instance has a different
one); the **algorithm** (a mismatch, and note that accepting \`alg: none\` is a known
catastrophic vulnerability); **encoding** (a missing \`Bearer \` prefix, or whitespace); and
**expiry**, which is usually just correct.

## 5. Permissions cached too long

**Symptom:** a user's access change does not take effect. A revoked admin is still an admin.

**Cause:** permissions loaded at login into the session or token, and not rechecked.

**Fix:** check at the point of use, or expire the cache in seconds rather than hours.
**Ask "how long can a revoked permission remain effective?" and make sure the answer is
acceptable** — not zero, necessarily, but known.

## Investigating safely

**Never log credentials.** Not the token, not the session id, not the password, not in debug
mode. A debug log in production containing tokens is a breach with a paper trail.

**Log the decision, not the credential.** \`auth_denied user_id=5 resource=order:812
reason=not_owner request_id=...\` — everything you need, nothing sensitive.

**Log denials at a level somebody sees.** A rise in denials means either a bug or somebody
probing, and both are worth knowing about within the hour.`,
    mcqs: [
      mcq('The missing authorization check is dangerous because:',
        [['There is no symptom; everything works', true],
          ['It only fails under concurrent load', false],
          ['It produces a misleading error', false],
          ['It is hard to fix once deployed', false]],
        'Detection has to be deliberate, because nothing will announce it.'),
      mcq('`if not user.can_edit:` where can_edit is a method:',
        [['Never fires, because a bound method is truthy', true],
          ['Raises an attribute error at runtime', false],
          ['Always fires, because the method is not called', false],
          ['Works correctly in most frameworks', false]],
        'It looks completely correct, which is what makes it nasty.'),
      mcq('Returning 401 for a permission failure causes:',
        [['A login loop, since the client thinks the credential is bad', true],
          ['The request to be retried automatically', false],
          ['The session to be invalidated', false],
          ['The user to see a generic error', false]],
        '401 means who are you; 403 means not you.'),
      mcq('Accepting `alg: none` on a token is:',
        [['A known catastrophic vulnerability', true],
          ['Acceptable for internal services', false],
          ['A performance optimisation with a caveat', false],
          ['Only a problem if the key is weak', false]],
        'It means anybody can mint a valid token.'),
    ],
    checkpoint: [
      mcq('A check nobody has seen deny anything:',
        [['Has not been tested', true],
          ['Is probably placed correctly', false],
          ['Indicates the permissions are too broad', false],
          ['Should be logged when it passes', false]],
        'Test the denied case; it is the one that matters.'),
      mcq('What should be logged for an authorization failure?',
        [['The decision, the user, the resource and the reason', true],
          ['The token itself, so that it can be inspected later', false],
          ['The session id, for correlation', false],
          ['The full request, including headers', false]],
        'Everything you need and nothing sensitive.'),
      mcq('A rise in denials is worth alerting on because:',
        [['It means either a bug or somebody probing', true],
          ['It indicates the permission model is wrong', false],
          ['It predicts an increase in support tickets', false],
          ['It correlates with failed deployments', false]],
        'Both are worth knowing about within the hour.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_PRACTICE',
    notes: `Two exercises on the checks rather than the cryptography. Neither asks you to
implement a signature algorithm — you should not write your own, and the decisions are where
the bugs are.`,
    coding: [
      {
        title: 'Scope it to the caller',
        description: `Records are \`id owner\` lines. Then a final line: \`caller role
requested_id\`, where role is \`user\` or \`staff\`.

Print the record's owner if the caller may see it, and \`404\` if not — **including when the
record does not exist**, because the two cases must be indistinguishable.

A \`user\` may see only their own records. A \`staff\` caller may see any that exist.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
records = {r[0]: r[1] for r in lines[:-1]}
caller, role, requested = lines[-1]

# Absent and forbidden must be indistinguishable from outside.
`,
        language: 'python',
        tests: [
          { input: '1 asha\n2 ravi\nasha user 1\n', expectedOutput: 'asha' },
          { input: '1 asha\n2 ravi\nasha user 2\n', expectedOutput: '404' },
          { input: '1 asha\n2 ravi\nasha user 9\n', expectedOutput: '404' },
          { input: '1 asha\n2 ravi\nmina staff 2\n', expectedOutput: 'ravi' },
          { input: '1 asha\nmina staff 9\n', expectedOutput: '404', isHidden: true },
          { input: '1 asha\nasha user 1\n', expectedOutput: 'asha', isHidden: true },
        ],
      },
      {
        title: 'Decide the status',
        description: `Given a request's credential state and its permission state, print the
status code.

Read lines of \`credential permission\`, where credential is \`none\`, \`invalid\`, \`expired\`
or \`valid\`, and permission is \`allowed\`, \`denied\` or \`unknown_resource\`.

Rules:

- Credential \`none\`, \`invalid\` or \`expired\` → **401**, whatever the permission says.
- Valid credential, \`allowed\` → **200**.
- Valid credential, \`denied\` → **404**, because the caller must not learn the resource
  exists.
- Valid credential, \`unknown_resource\` → **404**.

Note that the last two produce the same answer deliberately. That is the point of the
exercise.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Authentication is decided before authorization. Two different cases give one answer.
`,
        language: 'python',
        tests: [
          { input: 'valid allowed\n', expectedOutput: '200' },
          { input: 'valid denied\n', expectedOutput: '404' },
          { input: 'none allowed\n', expectedOutput: '401' },
          { input: 'expired allowed\nvalid unknown_resource\n', expectedOutput: '401\n404' },
          { input: '', expectedOutput: '' },
          { input: 'invalid denied\n', expectedOutput: '401', isHidden: true },
          { input: 'valid unknown_resource\nvalid denied\n', expectedOutput: '404\n404', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Authentication and Authorization Practice',
      description: 'Scope access to the caller, classify statuses, and run the two-account test on real code.',
      instructions: `Complete both exercises, then:

1. For the first: explain why "record does not exist" and "record is not yours" must return the
   same thing. Give a concrete example of what an attacker learns if they differ.
2. For the first: rewrite your solution so the authorization is expressed **as the lookup**
   rather than as a check after it. Say which version you would ship and why.
3. For the second: say why a valid credential with a denied permission is 404 here, when 403
   exists for exactly that case. Name a situation where 403 would be the better answer.
4. For the second: say what an endpoint should return when the credential is valid, the
   resource exists, and the caller is allowed — but the *action* is not permitted for them.

**Then, on real code.** Use a project of yours, or an open-source one you can run.

5. Run the two-account test. Create two users, create data as A, and request it as B. Cover
   every endpoint that returns anything owned by somebody. Record what you tried.
6. Repeat with no credential at all, and with ids in **request bodies** rather than paths.
7. Repeat for \`PUT\` and \`DELETE\`, not only \`GET\`.
8. Report what you found. **If you found nothing, say what you covered** — that is a finding
   too, and a report that says "no issues" without saying what was tested is worth nothing.
9. Write one automated test for the negative case on one endpoint. Show it passing, then remove
   the authorization check and show it failing.`,
      rubric: [
        { criterion: 'Scoped correctly', description: 'Owner, staff, absent and forbidden all behave, indistinguishably where required.', maxPoints: 20 },
        { criterion: 'Authorization as the lookup', description: 'Rewritten as a scoped query, with a reasoned choice between the two.', maxPoints: 15 },
        { criterion: 'Status classification', description: 'Correct, including the two cases that deliberately agree.', maxPoints: 15 },
        { criterion: '404 against 403 argued', description: 'Why 404 here, and a named situation where 403 is better.', maxPoints: 15 },
        { criterion: 'The two-account test, run', description: 'Real endpoints, bodies as well as paths, writes as well as reads.', maxPoints: 20 },
        { criterion: 'A negative test that fails when unguarded', description: 'Shown passing, then failing with the check removed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
records = {r[0]: r[1] for r in lines[:-1]}
caller, role, requested = lines[-1]
`,
        tests: [
          { input: '1 asha\n2 ravi\nasha user 1\n', expectedOutput: 'asha' },
          { input: '1 asha\n2 ravi\nasha user 2\n', expectedOutput: '404' },
          { input: '1 asha\n2 ravi\nasha user 9\n', expectedOutput: '404' },
          { input: '1 asha\nmina staff 9\n', expectedOutput: '404', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('"Does not exist" and "not yours" must be indistinguishable because:',
        [['Otherwise the caller learns which ids are real', true],
          ['The two cases share the same handler', false],
          ['403 is reserved for authentication failures', false],
          ['It simplifies the client’s error handling', false]],
        'Which lets an attacker enumerate the resources without seeing any of them.'),
      mcq('Showing a negative test failing once the check is removed proves:',
        [['The test is actually testing the authorization', true],
          ['The check was placed in the right layer', false],
          ['The endpoint is covered by the suite', false],
          ['The framework does not enforce it separately', false]],
        'A test you have never seen fail may be testing nothing.'),
      mcq('A report saying "no issues found" without saying what was tested:',
        [['Is worth nothing', true],
          ['Is acceptable if every endpoint was covered', false],
          ['Should be accompanied by the tooling used', false],
          ['Indicates the scope was too narrow', false]],
        'Which is why question 8 asks for the coverage either way.'),
    ],
  },

  {
    unitCode: 'T3_AUTH_MINI_PROJECT',
    notes: `Build authentication and authorization properly, then attack it.

**The attacking half is the project.** Building a login form is a tutorial; finding out that
your own logout does not revoke anything is an education, and the brief is designed so that a
student who does the work honestly will find at least one real hole in their own system.

Budget around two hours, and do not skip part three.`,
    assignment: {
      title: 'Mini Project — Build It, Then Break It',
      description: 'Implement authentication and resource-level authorization, then attack your own system and report what you find.',
      instructions: `**Build** a small application with at least two roles and resources that
belong to users.

**Part one — authentication**

1. Registration and login. **Passwords hashed with a slow, salted algorithm** — bcrypt, argon2
   or scrypt. Not SHA-256. Say which you used and why speed is a weakness here.
2. Sessions or tokens — choose, and write down why, using the trade-offs from the unit.
3. Expiry. State the lifetime and justify it.
4. Logout that actually revokes. **Prove it**: capture a credential, log out, replay the
   credential, and show the result.
5. If you chose tokens: implement refresh, and state exactly how long a revoked user retains
   access. The honest answer is not zero.

**Part two — authorization**

6. Two roles with genuinely different permissions.
7. Resource-level checks: a user sees only their own records.
8. **Express the check as the query** wherever you can, rather than as a check after the
   fetch. Show one example of each and say which you prefer.
9. Return 404 rather than 403 where the caller should not learn a resource exists, and say
   where you deliberately did not.

**Part three — attack it**

Work through these and **report each result honestly**, including the ones that succeed
against you:

10. **The two-account test.** Every endpoint. Paths, bodies, GET and PUT and DELETE.
11. **No credential.** Every endpoint.
12. **Expired credential.** Every endpoint.
13. **Tampered credential.** Change one character. Change the role claim if you used a token.
14. **A user id in a request body.** Does anything trust it?
15. **Enumeration.** Can you tell a real id from a fake one by the response, the status or the
    timing?
16. **Logout.** Does the credential still work? Does it work on another device?

**Part four — report**

17. What did you find? **A project that finds nothing has usually not attacked itself
    properly** — say what you covered and why you are confident.
18. Fix everything you found. Show the fix and the re-test.
19. Write one automated test per issue found, so it cannot come back.
20. Name one thing you know is still weak, and what you would do about it with more time.

**Submit** the application, the attack log with results, the fixes, the regression tests, and
answer 20.`,
      rubric: [
        { criterion: 'Authentication done properly', description: 'Slow salted hashing, a justified credential choice, stated expiry.', maxPoints: 15 },
        { criterion: 'Logout that revokes, proven', description: 'Credential captured, replayed after logout, result shown.', maxPoints: 15 },
        { criterion: 'Resource-level authorization', description: 'Scoped queries where possible, with 404 used deliberately.', maxPoints: 20 },
        { criterion: 'A real attack log', description: 'All seven attacks attempted, every result recorded including successes.', maxPoints: 25 },
        { criterion: 'Fixes and regression tests', description: 'Each issue fixed, re-tested, and covered by a test.', maxPoints: 15 },
        { criterion: 'A known weakness named', description: 'One honest remaining gap, with what would be done about it.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Passwords need a deliberately slow hash because:',
        [['Speed helps an attacker who has the hashes', true],
          ['Slow hashing prevents timing attacks on login', false],
          ['Fast hashes cannot be salted effectively', false],
          ['It limits how often users can change passwords', false]],
        'SHA-256 is fast, which is a feature everywhere else and a weakness here.'),
      mcq('"A project that finds nothing has usually not attacked itself properly" means:',
        [['The report must say what was covered, not just the conclusion', true],
          ['Every system has at least one vulnerability somewhere', false],
          ['The attacks listed are too easy to pass', false],
          ['Self-assessment is unreliable in security', false]],
        'The same standard as question 8 in the practice unit.'),
      mcq('Being asked to state how long a revoked user keeps access:',
        [['Forces an honest answer about the access token window', true],
          ['Tests whether refresh was implemented', false],
          ['Checks that the expiry was configured correctly', false],
          ['Measures the revocation propagation delay', false]],
        'The honest answer is not zero, and the unit says so.'),
    ],
  },

  /* ══ T3_API_HARDENING ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_API_HARDENING_VALIDATE_AT_THE_BOUNDARY',
    notes: `**Never trust a request.** Not from your own mobile app, not from your own frontend,
not from an internal service. Anything that arrives over the network was composed by someone
you cannot see.

"But our app only sends valid data" — **your app is not the only thing that can send a
request.** Anyone can use curl.

## Validate at the boundary, once

The entry point — the handler, the deserialiser, the schema. Not scattered through the code,
and not deep inside the domain where half the paths miss it.

**Inside the boundary, the data is trusted because it was checked.** That is the property that
makes the rest of the code simple, and it only holds if the boundary is real.

## What to check

**Presence.** Required fields are there.

**Type.** A string where a string belongs. \`"5"\` and \`5\` are different, and a language that
coerces silently will happily compare them wrongly later.

**Range and length.** A quantity between 1 and 1,000. A name under 200 characters. **Every
string needs a maximum length** — without one, a 50MB name field is a denial of service that
costs the attacker nothing.

**Format.** Email, date, UUID, enum membership.

**Semantic rules.** End after start. Quantity within stock. These are 422 rather than 400.

**Unexpected fields.** Reject, or ignore deliberately. Accepting whatever arrives is how a
\`{"is_admin": true}\` in a profile update becomes a privilege escalation — the **mass
assignment** bug, and it is common in frameworks that map request bodies onto models
automatically.

## Reject, do not sanitise

**Sanitising is guessing at intent.** Stripping \`<script>\` from input leaves
\`<scr<script>ipt>\`, which becomes \`<script>\` after your strip. Rejecting is unambiguous and
it is simpler.

**Sanitising also corrupts valid data.** A user genuinely called "O'Brien" should not become
"OBrien".

**Escape at output, according to the context**, rather than sanitising at input. The same
string is escaped differently for HTML, for an attribute, for a URL and for SQL — and only the
output site knows which.

## The injection rule

**Never build a query or command by concatenating input.**

    cursor.execute(f"SELECT * FROM users WHERE email = '{email}'")   # never
    cursor.execute("SELECT * FROM users WHERE email = %s", [email])  # parameterised

Parameterised queries are not escaping. The value never becomes part of the statement, so
there is nothing to escape out of. **This is true for SQL, for shell commands, for LDAP, for
template rendering and for anything else that parses a string.**

The one place a parameter genuinely cannot be bound is an **identifier** — a table or column
name, as in the sort field from the pagination unit. That is the case for a whitelist, and it
is the only one.

## Validate the boring things too

**Content type.** A handler expecting JSON should refuse anything else rather than crash.

**Size.** A maximum body size, enforced before parsing. Parsing a 2GB JSON body to discover it
is too large is the attack.

**Nesting depth.** Deeply nested JSON can exhaust the stack in some parsers.

**Numbers.** Very large integers, negative where only positive makes sense, \`NaN\` and
infinity from a JSON float.

## Where it belongs

**A schema, declared once**, is better than hand-written checks scattered through a handler.
It is enforced consistently, it can generate documentation, and it fails the same way every
time.

**And it is not a substitute for database constraints.** Validation is the polite error;
constraints are the guarantee. The constraints unit made this argument from the other side.`,
    mcqs: [
      mcq('"Our app only sends valid data" fails because:',
        [['Your app is not the only thing that can send a request', true],
          ['The app may have bugs in its own validation', false],
          ['Requests can be corrupted in transit', false],
          ['Older app versions may still be in use', false]],
        'Anyone can use curl.'),
      mcq('Accepting unexpected fields in a request body risks:',
        [['Mass assignment, such as an is_admin field', true],
          ['Larger requests than necessary', false],
          ['Schema drift between client and server', false],
          ['Validation errors on unknown keys', false]],
        'Common in frameworks that map bodies onto models automatically.'),
      mcq('Rejecting is preferred over sanitising because:',
        [['Sanitising guesses at intent and can be defeated', true],
          ['Rejecting produces a clearer error message', false],
          ['Sanitising is slower on large inputs', false],
          ['Rejecting is required by most frameworks', false]],
        'Strip <script> and <scr<script>ipt> becomes <script>.'),
      mcq('Parameterised queries are safe because:',
        [['The value never becomes part of the statement', true],
          ['The driver escapes the value correctly', false],
          ['The database validates the type first', false],
          ['The query is compiled before the value arrives', false]],
        'There is nothing to escape out of, which is different from escaping.'),
    ],
    checkpoint: [
      mcq('Every string field needs a maximum length because:',
        [['A 50MB value is a denial of service that costs nothing', true],
          ['Databases reject over-long values inconsistently', false],
          ['Long strings slow down the validation', false],
          ['It prevents injection in text fields', false]],
        'Free for the attacker, expensive for you.'),
      mcq('Escaping belongs:',
        [['At output, according to the context', true],
          ['At input, before storage', false],
          ['In the database layer', false],
          ['Wherever the string is first constructed', false]],
        'HTML, attribute, URL and SQL escape differently, and only output knows which.'),
      mcq('The only place a value genuinely cannot be parameterised is:',
        [['An identifier, such as a column name', true],
          ['A value inside a LIKE pattern', false],
          ['A value in an IN clause', false],
          ['A value used in an ORDER BY direction', false]],
        'Which is the one legitimate case for a whitelist.'),
    ],
  },

  {
    unitCode: 'T3_API_HARDENING_RATE_LIMITING',
    notes: `One caller can take down a service, and usually does it by accident: a retry loop
with no backoff, a script left running, a badly written integration polling every 100ms.

**Rate limiting protects you from one caller, deliberate or not.** The accidental case is far
more common than the malicious one.

## What it protects

**Capacity.** One caller cannot consume what everybody else needs.

**Expensive operations.** A report that takes four seconds should not be callable a thousand
times a minute.

**Credentials.** Unlimited login attempts is a brute-force invitation.

**Cost.** Anything that calls a paid third party, sends email or SMS, or runs an expensive
computation is money leaving on each request.

**Data.** An enumeration attack — walking every id — is slow if a caller gets 100 requests a
minute and immediate if they do not.

## Where to limit

**By API key or user** — the right unit for an authenticated API. Fair and easy to reason
about.

**By IP** — the only option before authentication, and a blunt one: everybody behind one office
or mobile network shares it, so the limit must be generous enough to be nearly useless against
a determined attacker.

**By endpoint** — login should be much tighter than a product listing. A single global limit is
either too loose for login or too tight for browsing.

**Globally** — a backstop so total load stays survivable whatever the mix.

**Usually several at once.** They protect different things.

## The algorithms, briefly

**Fixed window** — 100 requests per minute, counted per clock minute. Simple, and it has a
boundary problem: 100 at 10:00:59 and 100 at 10:01:00 is 200 in one second, legitimately.

**Sliding window** — counts the last 60 seconds continuously. No boundary problem, slightly
more state.

**Token bucket** — tokens refill at a steady rate; each request spends one. **Allows a burst up
to the bucket size and then settles to the refill rate**, which matches real usage patterns
better than any fixed count. Usually the right choice.

## Respond properly

    HTTP 429 Too Many Requests
    Retry-After: 30
    X-RateLimit-Limit: 100
    X-RateLimit-Remaining: 0
    X-RateLimit-Reset: 1709301600

**\`Retry-After\` is the important one.** Without it the client guesses, and a client guessing
usually retries immediately — which is the behaviour you were trying to prevent.

**Publish the limits in your documentation**, so a well-behaved integration can pace itself
rather than discovering the limit by hitting it.

## Two things that go wrong

**Limiting the wrong thing.** A limit per IP behind a load balancer sees the balancer's address
and rate-limits everybody as one caller. **Read the forwarded-for header — and validate it**,
since a caller can send whatever they like in it.

**Limiting yourself.** Health checks, internal services and your own frontend hitting the same
limits as the public. Exempt them deliberately, and know what you exempted.

## What it is not

**Not a substitute for capacity**, and not a substitute for authorization. A rate limit slows
an attacker down; it does not stop one who is patient, and 100 requests a minute is 144,000 a
day. If the data matters, the access check is what protects it — rate limiting only buys time.`,
    mcqs: [
      mcq('The most common reason a single caller overwhelms a service is:',
        [['An accident — a retry loop or a script left running', true],
          ['A deliberate denial-of-service attempt', false],
          ['A misconfigured load balancer', false],
          ['A sudden increase in legitimate traffic', false]],
        'The accidental case is far more common than the malicious one.'),
      mcq('Token bucket is usually preferred because:',
        [['It allows a burst and then settles to a steady rate', true],
          ['It uses less state than a sliding window', false],
          ['It has no boundary problem at the window edge', false],
          ['It is simpler to implement than fixed window', false]],
        'Which matches how real clients actually behave.'),
      mcq('Rate limiting by IP behind a load balancer:',
        [['Sees the balancer and limits everybody as one caller', true],
          ['Works correctly if the balancer preserves the source', false],
          ['Is more accurate than limiting by API key', false],
          ['Only fails for clients using a proxy', false]],
        'Read the forwarded-for header, and validate it, since callers can forge it.'),
      mcq('Omitting `Retry-After` from a 429 tends to cause:',
        [['Immediate retries, which is the behaviour you were preventing', true],
          ['Clients giving up permanently', false],
          ['Requests being queued by the client', false],
          ['The limit being interpreted as a server error', false]],
        'A client guessing usually guesses "now".'),
    ],
    checkpoint: [
      mcq('Login should have a tighter limit than a product listing because:',
        [['Unlimited attempts is a brute-force invitation', true],
          ['Login is more expensive to serve', false],
          ['Listings are usually cached', false],
          ['Failed logins consume more server resources', false]],
        'A single global limit is too loose for one or too tight for the other.'),
      mcq('Rate limiting is not a substitute for authorization because:',
        [['100 requests a minute is 144,000 a day', true],
          ['Limits can be bypassed by changing address', false],
          ['Authorization failures still consume capacity', false],
          ['Limits do not apply to authenticated callers', false]],
        'It slows a patient attacker; it does not stop one.'),
      mcq('Publishing your rate limits in the documentation:',
        [['Lets a well-behaved integration pace itself', true],
          ['Discourages abuse by making limits visible', false],
          ['Is required for the headers to be meaningful', false],
          ['Reduces the number of 429 responses logged', false]],
        'Rather than discovering the limit by hitting it.'),
    ],
  },

  {
    unitCode: 'T3_API_HARDENING_DOCUMENTING_AN_API',
    notes: `API documentation has one job: **another engineer makes a successful call without
asking you anything.**

If they have to ask, the documentation failed, however complete it looks — and the measure is
their success, not your coverage.

## What every endpoint needs

**What it does**, in one sentence. *"Creates an order for the authenticated customer."*

**The method and path**, with parameters named and typed — which are required, which optional,
what the defaults are.

**The request body**, as a **real example**, not a type listing. A worked example is understood
in seconds; a schema takes a minute and leaves questions.

**The response**, as a real example with realistic values. \`"name": "string"\` tells a reader
nothing; \`"name": "Asha Rao"\` tells them the shape and the convention at once.

**The errors it can return.** Every status, every code, and what the caller should do about
each. **This is the section most often missing and the one people need most**, because the
happy path is guessable and the failures are not.

**A working example call.** A \`curl\` they can paste, with placeholders clearly marked.

## Generated or written

**Generated from the code** — OpenAPI from annotations or types. **It cannot go out of date**,
which is its enormous advantage, and it tends to produce accurate shapes with no explanation of
why anything exists.

**Written by hand** — better prose, better examples, better explanation of the model. And it
drifts from the code the first time somebody is in a hurry.

**Both, usually.** Generate the reference; write the guide. The reference answers "what are the
fields"; the guide answers "how do I place an order", which no generator can produce.

## The parts a generator cannot write

**Getting started.** How to obtain a credential, what the base URL is, the first call to make.

**The model.** What an order *is* in your system, and how it relates to a customer and a
payment. **A reader who does not have your mental model cannot use a field list.**

**Common workflows.** "To place an order: create a cart, add items, then check out." Three
endpoints in an order that nothing in the reference implies.

**Limits and rules.** Rate limits, page sizes, what is idempotent, what is eventually
consistent.

**Changes.** A changelog, so an integrator can see what moved.

## Keeping it true

**Examples should be tested.** An example in your documentation that no longer works is worse
than none, because the reader debugs their own code first. Extracting examples and running them
in CI is unusual and it is the only mechanism that actually works.

**Generate what you can** from the code, for the same reason.

**And the real test is the same one as the README:** hand it to somebody who has never used the
API and ask them to make three calls. Watch. Every question they ask is a defect, and fifteen
minutes of this finds more than an hour of rereading.`,
    mcqs: [
      mcq('The measure of good API documentation is:',
        [['Another engineer calls it successfully without asking you', true],
          ['Every endpoint and field is covered', false],
          ['It is generated from the code and cannot drift', false],
          ['It includes examples for every parameter', false]],
        'Their success, not your coverage.'),
      mcq('The section most often missing and most needed is:',
        [['The errors, and what to do about each', true],
          ['The authentication requirements', false],
          ['The response field types', false],
          ['The rate limits that apply', false]],
        'The happy path is guessable; the failures are not.'),
      mcq('A real example value beats a type listing because:',
        [['It shows the shape and the convention at once', true],
          ['It is shorter to include', false],
          ['Types can be inferred from the example', false],
          ['Schemas are harder to keep current', false]],
        '"name": "string" tells a reader nothing.'),
      mcq('What can a generator not produce?',
        [['What an order is, and how it relates to a customer', true],
          ['The list of fields in a response', false],
          ['Which parameters are required', false],
          ['The status codes an endpoint returns', false]],
        'A reader without your mental model cannot use a field list.'),
    ],
    checkpoint: [
      mcq('An out-of-date example in documentation is worse than none because:',
        [['The reader debugs their own code first', true],
          ['It suggests the API is unmaintained', false],
          ['It cannot be distinguished from a working one', false],
          ['It will be copied into production code', false]],
        'Which is why running the examples in CI is the only mechanism that works.'),
      mcq('"To place an order: create a cart, add items, then check out" belongs in:',
        [['The guide, since no reference implies the sequence', true],
          ['The reference entry for the checkout endpoint', false],
          ['The getting-started section only', false],
          ['A code sample rather than prose', false]],
        'Three endpoints in an order nothing in the reference states.'),
      mcq('The real test of API documentation is:',
        [['Watching a stranger make three calls from it', true],
          ['Reviewing it against the endpoint list', false],
          ['Generating it and checking for gaps', false],
          ['Having a teammate proofread it', false]],
        'The same test as the README, and it finds more in fifteen minutes than an hour of rereading.'),
    ],
  },
];
