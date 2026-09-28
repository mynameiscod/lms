/**
 * The Backend Engineering specialization track — sixteen units. Module P06.
 *
 * ── WHAT THIS TRACK ASSUMES AND WHAT IT ADDS ──────────────────────────────────────────────
 *
 * P03 already taught API design, authentication, authorization, indexes and transactions to
 * every student. This track is not a second pass at those. It is the depth past them: designing
 * the API and the schema as one decision, making an operation safe to retry, finding the query
 * costing the request, and knowing exactly when a cache will be wrong.
 *
 * The distinction is deliberate. A backend specialisation that repeated the universal module
 * would leave a student with a month spent and nothing a Backend interviewer could not have
 * asked in the general round.
 *
 * ── THE THING THIS DIRECTION IS ACTUALLY HIRED FOR ────────────────────────────────────────
 *
 * Behaviour under conditions that did not occur in development: load, concurrency, partial
 * failure, retries, and callers who are wrong. Everything below is oriented at that, which is
 * why the quality topic is about cost and correctness under pressure rather than about tests.
 *
 * Attribution: T4_BACKEND_DEPTH defaults to API_DESIGN with the layout unit on
 * SERVER_SIDE_BASICS; T4_BACKEND_BUILD to REST_APIS with auth on AUTHENTICATION and consistency
 * on DB_TRANSACTIONS; T4_BACKEND_QUALITY to QUERY_OPTIMIZATION with the caching unit on CACHING;
 * T4_BACKEND_PROOF to API_DESIGN with the specialization interview on TECHNICAL_EXPLANATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_BACKEND_BUNDLES: PilotBundle[] = [
  /* ══ T4_BACKEND_DEPTH ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BACKEND_DEPTH_API_AND_SCHEMA_TOGETHER',
    notes: `**They constrain each other.** Designing one and then the other is how services end up
with awkward endpoints nobody can explain.

## The tension, concretely

**The API wants to return what the caller needs in one call.** The schema wants each fact stored
once. Those pull in opposite directions the moment a response spans three tables.

**Design the API first and the schema becomes a denormalised mirror of your response shapes**,
which is fine until a second consumer wants a different shape.

**Design the schema first and the API becomes a thin CRUD layer over tables**, which pushes the
joining into every client and means changing a table breaks all of them.

## The resolution

**Design them together, from the access patterns.** What does the caller actually do, how often,
and with what? That question constrains both, and it is the only one that constrains both.

## What this looks like in practice

**List the operations.** "Show a customer's last ten orders with the item count." That is one
call, and it tells you the API shape and the index you will need.

**Then check the schema supports each without a pathological query.** If one operation needs five
joins and runs on every page load, either the schema is wrong for this access pattern or that
operation needs a different answer — a stored aggregate, a different endpoint, a cache with a
stated staleness.

## The resource shape question

**An API resource is not a table.** An order resource may assemble from three tables, and should
if that is what the caller means by an order. Tables are storage; resources are the domain the
caller talks about.

**Getting those confused is why some APIs require six calls to render one screen.**`,
    mcqs: [
      mcq('Designing the schema first and exposing it directly tends to produce an API that:',
        [['Pushes the joining into every client', true],
         ['Returns more data than any caller actually needs', false],
         ['Cannot support more than one consumer at a time', false],
         ['Requires denormalisation to perform acceptably', false]],
        'A thin CRUD layer over tables means each client assembles the domain object itself, so a table change breaks all of them at once.'),
      mcq('The question that constrains both the API and the schema is:',
        [['What the caller does, how often, and with what', true],
         ['Which normal form the schema should satisfy', false],
         ['How many tables the domain naturally divides into', false],
         ['Which serialisation format the clients will expect', false]],
        'Access patterns are the only input that both sides must respect. Everything else constrains one and leaves the other free to diverge.'),
    ],
    checkpoint: [
      mcq('An API that requires six calls to render one screen usually results from confusing:',
        [['Tables with resources', true],
         ['Authentication with authorization concerns', false],
         ['Reads with writes in the endpoint design', false],
         ['Pagination with filtering on the same endpoint', false]],
        'Resources are the domain the caller talks about and may assemble from several tables. Exposing storage directly makes the client do the assembly.'),
      mcq('An operation needing five joins on every page load means either the schema is wrong for this access pattern or that operation needs:',
        [['A different answer, such as a stored aggregate', true],
         ['An index on each of the joined columns involved', false],
         ['To be moved into a background job instead', false],
         ['To be split across several smaller endpoints', false]],
        'The options are changing the storage, precomputing, or accepting staleness. Adding indexes does not remove the structural cost of the joins.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_DEPTH_SERVICE_ARCHITECTURE',
    notes: `**Routing, handlers, services, data access — and what belongs in each** so the next
change is cheap.

## The four layers and their one job each

**Routing.** Maps a request to a handler. No logic.

**Handler.** Parses and validates the request, calls one service function, shapes the response.
**It should be boring and short.** A handler with business rules in it is the commonest structural
fault in a service.

**Service.** The business logic, working in domain terms, knowing nothing about HTTP. This is
where the rules live and it is the layer that should be testable with plain values.

**Data access.** Queries. Knows nothing about business rules.

## The test for whether a piece of logic is in the right place

**Could it be reached from somewhere that is not HTTP?** A scheduled job, an import, an admin
tool. If yes, it belongs in the service layer, and putting it in the handler means the second
caller copies it.

## Why the service layer must not know about HTTP

**Because status codes are a transport concern.** A service returning a 404 has made the rule
untestable without a web framework and unusable from a job.

**Raise a domain error — "order not found" — and let the handler map it to a status.** One mapping
in one place, and the rules stay portable.

## Where the transaction boundary goes

**In the service, around one business operation.** Not in the handler, which does not know what
constitutes an operation, and not in data access, which is too fine.

## What this buys

**The rules are testable with plain values**, which means they actually get tested; and the same
rule serves the endpoint, the job and the admin tool without duplication.`,
    mcqs: [
      mcq('A handler containing business rules is the commonest structural fault in a service because the rule is then:',
        [['Reachable only through HTTP', true],
         ['Executed before the request is fully validated', false],
         ['Duplicated across the routing configuration too', false],
         ['Unable to access the data layer beneath it', false]],
        'A job, an import or an admin tool cannot call it, so the second caller reimplements it and the two copies drift.'),
      mcq('A service returning a 404 rather than a domain error makes the rule:',
        [['Untestable without a web framework', true],
         ['Slower, because status mapping is repeated', false],
         ['Inconsistent with the other services in the system', false],
         ['Dependent on the routing layer being configured', false]],
        'The status code is a transport concern. Embedding it couples the business rule to HTTP and makes it unusable from anything else.'),
    ],
    checkpoint: [
      mcq('The test for whether logic belongs in the service layer is whether it could be reached from:',
        [['Somewhere that is not HTTP', true],
         ['More than one endpoint in the same service', false],
         ['A client written in a different language', false],
         ['The data access layer without a round trip', false]],
        'Anything a scheduled job or an admin tool might need is business logic. Logic that is genuinely about the request itself belongs in the handler.'),
      mcq('The transaction boundary belongs in the service layer because the handler does not know:',
        [['What constitutes one business operation', true],
         ['Which tables the operation will write to', false],
         ['How long the operation is likely to take', false],
         ['Whether the caller is authorised for it yet', false]],
        'A business operation may span several data-access calls. Only the layer expressing the operation knows where it begins and ends.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_DEPTH_PRACTICE',
    notes: `**Applying both ideas to a service you did not design.**

## The drill

**Take an existing API** — an open-source service, or something you built earlier. Produce:

**The access patterns**, inferred from the endpoints. What does the caller actually do?

**Where the layers are**, and where they leak. Business rules in handlers, HTTP in services, SQL
in either.

**One resource that is really a table**, and what a client has to do because of it.

**One operation that would be expensive** at ten times the data, and why.

## The second half

**Redesign one endpoint** from the access pattern rather than from the table, and say what it
would cost to change — including the clients that would need updating.

**That last part is the realistic bit.** A better design that breaks every caller is a proposal,
not an improvement, and knowing the migration cost is what makes it a real recommendation.

## What good looks like

**You can point at a specific endpoint and say what a client has to do to work around it.** That
is the concrete form of "the API and schema were designed separately", and it is far more
convincing than describing the principle.`,
    mcqs: [
      mcq('A better endpoint design that breaks every caller is described as:',
        [['A proposal, not an improvement', true],
         ['An improvement that requires a version bump', false],
         ['Acceptable if the clients are internal only', false],
         ['The correct approach where the design was wrong', false]],
        'Until the migration cost is accounted for, the recommendation is incomplete. Knowing that cost is what makes it actionable rather than aspirational.'),
      mcq('The concrete form of "the API and schema were designed separately" is being able to point at an endpoint and say:',
        [['What a client has to do to work around it', true],
         ['Which normal form the underlying tables violate', false],
         ['How many tables the endpoint reads from at once', false],
         ['Which layer of the service contains its logic', false]],
        'A workaround forced on the caller is the observable consequence. Describing the principle without one is an assertion the listener must accept.'),
    ],
    checkpoint: [
      mcq('Inferring the access patterns from an existing API’s endpoints tells you:',
        [['What the callers actually do with the service', true],
         ['Which endpoints receive the most traffic overall', false],
         ['How the schema was normalised when it was built', false],
         ['Whether the API follows REST conventions properly', false]],
        'The endpoint set is a record of what somebody needed. Reading it that way is how you evaluate whether the design serves those needs.'),
      mcq('Layer leaks to look for include business rules in handlers, HTTP in services, and:',
        [['SQL in either of them', true],
         ['Validation in the data access layer itself', false],
         ['Logging spread across all four of the layers', false],
         ['Error handling duplicated between two layers', false]],
        'Queries belong in data access. SQL appearing in a handler or a service couples the business logic directly to the storage shape.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_DEPTH_INTERVIEW_QUESTION',
    notes: `**"Walk me through how you would design the API and the data model for X."**

## The order that works

**Access patterns first.** "What does a caller actually do?" Say this out loud before drawing
anything. It is the question most candidates skip and it is what the rest follows from.

**Then the resources**, in the caller's vocabulary rather than the storage's.

**Then the schema** that supports those operations without a pathological query.

**Then the awkward one** — the operation that does not fit cleanly — and say what you would do
about it. There is always one, and volunteering it is a strong signal.

## The follow-ups

**"What if this endpoint is called a thousand times a second?"** Caching with a stated staleness,
a read replica, or precomputation. Name the cost of whichever you choose.

**"What if two callers update the same order at once?"** Optimistic concurrency with a version, or
a lock. Have an answer; this is asked constantly for anything with writes.

**"How would you add a field without breaking clients?"** Additive change, tolerant readers, and
a version only when you must remove or rename.

## The depth marker

**Whether you mention failure.** A design described as though every call succeeds is a diagram.
Mentioning what happens when the database is unavailable, or a downstream call times out, is what
distinguishes somebody who has run a service.

## What loses marks

**Starting from the tables.** It is the instinct of somebody who learned databases before APIs,
and it produces a design the caller has to work around.`,
    mcqs: [
      mcq('The question most candidates skip and the rest follows from is:',
        [['What does a caller actually do', true],
         ['Which database will the service use', false],
         ['How many requests per second are expected', false],
         ['What authentication mechanism is required', false]],
        'Access patterns constrain both the resources and the schema. Without them, both are designed against assumptions nobody has stated.'),
      mcq('Volunteering the operation that does not fit cleanly is a strong signal because:',
        [['There is always one, and most candidates hide it', true],
         ['It demonstrates knowledge of database normalisation', false],
         ['The interviewer will otherwise ask about it anyway', false],
         ['It shows the design was tested against real data', false]],
        'Every real design has an awkward case. Naming it shows the design was examined rather than presented, and that the candidate is not performing completeness.'),
    ],
    checkpoint: [
      mcq('The depth marker in this question is whether the candidate mentions:',
        [['Failure, such as a downstream call timing out', true],
         ['Specific database products and their trade-offs', false],
         ['The serialisation format used for the responses', false],
         ['How the service would be deployed and scaled up', false]],
        'A design where every call succeeds is a diagram. Accounting for unavailability and timeouts is what distinguishes somebody who has operated a service.'),
      mcq('"What if two callers update the same order at once?" is asked constantly for anything with writes, and the expected answers are a lock or:',
        [['Optimistic concurrency using a version', true],
         ['A queue that serialises all the writes', false],
         ['A retry with exponential backoff applied', false],
         ['A transaction with the highest isolation level', false]],
        'A version checked on write detects the conflict without holding a lock, which is the standard approach for user-facing updates.'),
    ],
  },

  /* ══ T4_BACKEND_BUILD ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BACKEND_BUILD_AUTH_IN_PRACTICE',
    notes: `**How a request proves who it is**, where the check belongs, and the endpoint everybody
forgets.

## Sessions and tokens

**A session** is a server-side record with an identifier in a cookie. Revoking it is immediate —
delete the record.

**A token** carries its claims and is verified by signature. No lookup, which is why it scales;
**and revoking it before expiry is the hard problem**, because the server is not consulting
anything.

**The trade is revocation against a lookup per request**, and knowing that is the whole of the
interview answer.

## Keep tokens short-lived

**Because revocation is hard, expiry is the control.** A fifteen-minute access token with a
longer-lived refresh token that IS looked up gives you both — scale on the common path, revocation
where it matters.

## Where the check belongs

**In middleware, for authentication.** One place, applied by default, so a new endpoint is
protected without anybody remembering.

**Beside the data, for authorization.** Ownership is per-object and cannot be middleware, which is
why the scoped-query approach matters — it is the only version that a new endpoint cannot omit.

## The endpoint everybody forgets

**The one added last.** An export, a detail view, a "resend" action. The main flow got the
attention; this did not.

**So test every endpoint with another user's identifier.**

## Storing credentials

**A password is hashed with a slow algorithm designed for it**, never encrypted and never a fast
general-purpose hash. This is settled; the only question is which of the two or three correct
choices you use.

## What a token must not contain

**Anything secret.** The payload is encoded, not encrypted — anybody holding it can read it. It is
signed, so it cannot be altered, and it is entirely visible.`,
    mcqs: [
      mcq('The trade between a session and a token is revocation against:',
        [['A lookup per request', true],
         ['The size of the credential being transmitted', false],
         ['Support for clients that cannot store cookies', false],
         ['The cost of verifying the signature each time', false]],
        'A session is consulted and can be deleted; a token is self-contained and scales, which is precisely why it cannot be withdrawn before expiry.'),
      mcq('A token’s payload is encoded rather than encrypted, which means it is:',
        [['Entirely visible to anybody holding it', true],
         ['Readable only with the server’s signing key', false],
         ['Protected against reading but not against replay', false],
         ['Safe for secrets provided the signature is checked', false]],
        'Signing prevents alteration and does nothing for confidentiality. Anything in the payload is readable by the client and by anybody who intercepts it.'),
    ],
    checkpoint: [
      mcq('Authentication belongs in middleware and authorization does not, because ownership is:',
        [['Per-object, which middleware cannot know', true],
         ['Checked after the response has been prepared', false],
         ['Handled entirely by the database permissions', false],
         ['Different for every endpoint in the service', false]],
        'Middleware sees the request, not which record is about to be loaded. Scoping the query is the version a new endpoint cannot forget.'),
      mcq('Short-lived access tokens with a longer refresh token that is looked up gives you:',
        [['Scale on the common path and revocation where it matters', true],
         ['Two independent credentials for different clients', false],
         ['Protection against a token being intercepted at all', false],
         ['The ability to issue tokens without a database', false]],
        'The frequent request avoids a lookup and the infrequent refresh does not, so revocation becomes possible within the access token’s lifetime.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_BUILD_TRANSACTIONS_AND_CONSISTENCY',
    notes: `**Transactions, idempotency, and the retry that charged somebody twice.**

## The retry is not hypothetical

**A client times out and retries.** The first request succeeded; the client never saw the
response. Without protection, the operation happened twice.

**This is the single most common real correctness failure in a payment or ordering system**, and
it is caused by the network rather than by anybody's code being wrong.

## Idempotency, concretely

**The caller supplies a key** — a UUID they generate per logical operation.

**The server records it with the result**, inside the same transaction as the operation.

**A second request with the same key returns the first result** rather than doing the work again.

**Two properties make it correct:** the key is recorded atomically with the effect, and the stored
result is returned rather than a success message, so the retry is indistinguishable from the
original.

## What a transaction does not cover

**Anything outside the database.** An email sent inside a transaction that rolls back has still
been sent. **Side effects go after the commit**, and if they must be reliable, they go through a
record the commit wrote — an outbox row a separate process picks up.

## Keeping them short

**Locks are held for the transaction's lifetime.** A transaction spanning a call to a payment
provider holds them for however long that takes, and the queue behind it is the outage.

## Lost updates

**Read, modify, write is unsafe under concurrency.** Two callers read the same value, both add,
one increment vanishes.

**Do the arithmetic in the database**, or use a version column and reject the stale write. Both
are one line; reading twice is not a fix.`,
    mcqs: [
      mcq('The duplicate charge caused by a client timing out and retrying is caused by:',
        [['The network, rather than by faulty code', true],
         ['A missing transaction around the operation', false],
         ['The server processing requests out of order', false],
         ['An isolation level that is set too permissively', false]],
        'The first request succeeded and the response was lost. Nothing in the code was wrong, which is why the protection must be designed in deliberately.'),
      mcq('An idempotency key must be recorded in the same transaction as the operation so that:',
        [['The key and the effect cannot separate', true],
         ['The key can be looked up more efficiently', false],
         ['The key expires when the transaction commits', false],
         ['A concurrent request is blocked until it finishes', false]],
        'If the effect committed and the key did not, a retry repeats the work. Atomicity between them is what makes the guarantee hold.'),
    ],
    checkpoint: [
      mcq('An email that must be sent reliably after a commit should go through:',
        [['A record the commit wrote, picked up separately', true],
         ['A second transaction opened immediately after', false],
         ['The same transaction, with a rollback handler', false],
         ['A retry loop in the request handler itself', false]],
        'An outbox row is written atomically with the operation and processed afterwards, so the send survives a crash between commit and delivery.'),
      mcq('An idempotent retry should return the stored result rather than a success message so that the retry is:',
        [['Indistinguishable from the original request', true],
         ['Faster than reprocessing the operation would be', false],
         ['Logged differently from a first-time request', false],
         ['Rejected if the original result has expired', false]],
        'The client cannot tell whether its first attempt arrived, so the second response must be the same as the first would have been.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_BUILD_MINI_PROJECT',
    notes: `**A service worth calling: authenticated, over a real schema, correct for a confused
or hostile client.**

## The brief

**Three or four endpoints** over a schema with at least one relationship. Authentication.
Ownership-scoped authorization. One consistent error shape. **One operation that is safe to
retry.**

## The retry requirement is the point

**Pick something that must not happen twice** — a payment, an order, a booking — and make it
idempotent with a caller-supplied key.

**Then prove it.** Send the same request twice and assert the second returns the first result and
did not repeat the effect. That assertion is the deliverable.

## What must be demonstrable

**Another user's identifier returns nothing**, on every endpoint including the one you added last.

**A malformed body returns 400 with a usable message**, not a 500.

**The duplicate request does not duplicate the effect.**

**A test fails when the code it covers is removed.**

## What to submit

**The service, a script that exercises all four properties, and a note** on which of them you got
wrong first time.

**That last part is not decoration.** Most people get the ownership check wrong on one endpoint
and the idempotency wrong on the first attempt, and reporting it honestly is worth more than a
clean account.`,
    assignment: {
      title: 'A service that survives a retry',
      description: 'Build an authenticated API with ownership-scoped authorization and one operation made genuinely safe to retry, and prove all four properties.',
      instructions: `Build three or four endpoints over a schema with at least one relationship,
with authentication, ownership-scoped authorization, and one consistent error shape.

**Then pick one operation that must not happen twice** — a payment, an order, a booking — and make
it idempotent with a caller-supplied key. Record the key inside the same transaction as the
effect, and return the stored result on a repeat.

**Prove all four of these with a script that asserts, not merely sends:**
another user's identifier returns nothing on **every** endpoint, including the one you added last;
a malformed body returns 400 with a usable message rather than a 500;
sending the same request twice does not duplicate the effect and returns the same result;
and a test fails when the code it covers is removed.

**Submit:** the service, the script, and a note saying which of the four you got wrong on your
first attempt. Most people get the ownership check wrong on one endpoint and the idempotency
wrong initially, and reporting that honestly is worth more than a clean account.`,
      rubric: [
        { criterion: 'Idempotency is real', description: 'The key is recorded atomically with the effect and a repeat returns the stored result rather than reprocessing.', maxPoints: 30 },
        { criterion: 'Ownership scoped everywhere', description: 'Every endpoint, including the last one added, returns nothing for another user’s identifier.', maxPoints: 25 },
        { criterion: 'The script asserts', description: 'All four properties have expected outcomes that the script checks, rather than requests it merely issues.', maxPoints: 25 },
        { criterion: 'Honest account of what went wrong', description: 'The note names what failed on the first attempt rather than presenting a clean result.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Proving idempotency requires asserting that the second request returns the first result and:',
        [['Did not repeat the effect', true],
         ['Completed faster than the first request did', false],
         ['Was logged as a duplicate by the server', false],
         ['Returned a different status code from the first', false]],
        'Returning the same body while having processed twice is the failure the whole mechanism exists to prevent, so both halves must be checked.'),
      mcq('Reporting which property you got wrong first time is worth more than a clean account because it:',
        [['Shows the script was capable of finding something', true],
         ['Demonstrates that the work took real effort', false],
         ['Gives the reviewer a defect to verify independently', false],
         ['Indicates the requirements were difficult to meet', false]],
        'A clean run proves only that the code and the script agree. Evidence the script caught a real fault is what establishes it was a test.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_BUILD_DEBUGGING',
    notes: `**An endpoint that was fine with a hundred rows and is not with a hundred thousand.**

## Find where the time goes, do not guess

**Measure first.** Which endpoint, which request, how long. Then within it: the query, the
serialisation, the downstream call, or the loop.

**The four usual answers**, roughly in order of frequency:

**The N+1.** A thousand fast queries, one per row. No index fixes this; the fix is asking for
everything in one query.

**A missing index** on a filter or join column that was fine at small size.

**Serialising more than is needed.** Loading and converting a thousand rows to return twenty.

**A downstream call inside a loop.** Same shape as the N+1, over the network, and far worse.

## The plan, for the query case

**Read it for three things:** a sequential scan on a large table, an estimate far from reality, a
nested loop over a large outer set. Everything else can be ignored at this level.

## The fix that is not in the query

**Sometimes the request should not be asking.** Fetching every row to display twenty is a
pagination problem, and no amount of indexing makes fetching a million unwanted rows fast.

## Verify the fix

**Same rows, faster.** Count before and after. A faster endpoint returning different data has
been broken rather than optimised, and it is a surprisingly easy mistake to make while adding a
join or a limit.

## What to record

**The measurement, the cause, the change, the measurement after.** Four items, and they are the
same four an interviewer asks for.`,
    mcqs: [
      mcq('A downstream call inside a loop is the same shape as an N+1 but far worse because it is:',
        [['Over the network, so each one costs more', true],
         ['Untraceable in the database query logs', false],
         ['Retried automatically, multiplying the requests', false],
         ['Unaffected by adding an index anywhere', false]],
        'A local query round trip is sub-millisecond; a network call is tens of milliseconds. The same multiplication applies to a much larger constant.'),
      mcq('Loading and converting a thousand rows to return twenty is a fault in:',
        [['Serialisation and the query asking for too much', true],
         ['The index, which is not narrowing the result set', false],
         ['The client, which should request fewer rows', false],
         ['The connection pool, which is being exhausted', false]],
        'The work is done on rows nobody will see. The fix is limiting in the query rather than making the unnecessary work faster.'),
    ],
    checkpoint: [
      mcq('Counting rows before and after an optimisation catches the mistake of:',
        [['A faster endpoint returning different data', true],
         ['An index that the planner declines to use', false],
         ['A cache returning a stale result to the caller', false],
         ['A query that fails intermittently under load', false]],
        'Adding a join or a limit while optimising can quietly change the result set, and speed was what was being watched.'),
      mcq('The four items to record are the measurement, the cause, the change and the measurement after, which are also:',
        [['The four an interviewer asks for', true],
         ['Required by most incident review processes', false],
         ['The minimum for a reproducible benchmark', false],
         ['What the profiler reports automatically anyway', false]],
        'The interview question about making something faster wants exactly this structure, so recording it during the work means the answer already exists.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_BUILD_INTERVIEW_QUESTION',
    notes: `**"Tell me about a service you built. What happens when it fails?"**

## Why the second half is the question

**Anybody can describe a service.** What separates a backend candidate is whether they have
thought about the conditions that did not occur in development: load, concurrency, partial
failure, retries.

## Have answers ready for these

**"What if the database is unavailable?"** Fail fast with a clear error rather than hanging.
Timeouts on every external call, because a call without one waits forever and the queue behind it
is the outage.

**"What if a client retries?"** Idempotency key. Asked almost every time.

**"What if two requests update the same row?"** Version column or a lock.

**"What if a downstream service is slow rather than down?"** The harder case, and worth having:
slow is worse than down because the failure is not detected and connections accumulate. A timeout
converts slow into down, which is the point of having one.

## The depth marker

**Timeouts.** A candidate who mentions them unprompted has almost certainly operated something.
They are the single most common missing piece in student services and the cause of the most
dramatic failures.

## Your own service

**Name one thing you got wrong.** A missing timeout, a duplicated operation, an ownership check
you forgot. **Specific beats impressive**, and an account with a real fault in it is more
credible than one without.

## What loses marks

**"It did not fail."** Either it was never used, or it failed and nobody noticed, and both are
worse than a fault you can describe.`,
    mcqs: [
      mcq('A slow downstream service is worse than one that is down because the failure is:',
        [['Not detected, and connections accumulate', true],
         ['Harder to reproduce in a test environment', false],
         ['Intermittent, so retries sometimes succeed', false],
         ['Reported as success by the calling service', false]],
        'A down service fails fast and is noticed. A slow one holds resources while appearing to work, until the pool is exhausted and everything fails.'),
      mcq('A timeout is valuable chiefly because it converts:',
        [['Slow into down, which is detectable', true],
         ['An error into a retryable condition', false],
         ['A synchronous call into an asynchronous one', false],
         ['A partial failure into a complete rollback', false]],
        'Undetected slowness accumulates resources. Forcing a definite failure is what allows the system to shed load and report a problem.'),
    ],
    checkpoint: [
      mcq('Mentioning timeouts unprompted is the depth marker because they are the most common missing piece in student services and the cause of:',
        [['The most dramatic failures', true],
         ['The majority of reported security issues', false],
         ['Most of the latency in a typical request', false],
         ['The difficulty in testing service integrations', false]],
        'Without one, a slow dependency exhausts the connection pool and takes down a service that was itself working correctly.'),
      mcq('"It did not fail" is a weak answer because either it was never used or:',
        [['It failed and nobody noticed', true],
         ['The service was too simple to have failure modes', false],
         ['The candidate did not operate it themselves', false],
         ['The monitoring was not configured to detect it', false]],
        'Anything serving real traffic fails sometimes. A claim of no failures usually means there was nothing watching for them.'),
    ],
  },

  /* ══ T4_BACKEND_QUALITY ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BACKEND_QUALITY_CACHING_AND_ITS_COSTS',
    notes: `**What to cache, for how long, and the stale answer that is worse than a slow one.**

## The question to answer before caching anything

**What does wrong look like here, and for how long is it acceptable?**

A product description five minutes stale is fine. A bank balance five minutes stale is a support
call. **Same mechanism, completely different answer**, and it is decided by the domain rather than
by the technology.

## What caches well

**Read constantly, changes rarely, and tolerates being slightly wrong.** All three. Missing the
third is the usual mistake.

## The three invalidation strategies

**Time.** Expire after N seconds. Simple, predictable, and stale for up to N.

**On write.** Delete the entry when the underlying data changes. Fresher, and requires every
writer to remember — so a second writer added later quietly breaks it.

**Versioned keys.** Include a version in the key; a write bumps the version and old entries become
unreachable. **More robust, because nothing has to remember to delete.**

## The failure modes worth knowing

**Stampede.** A popular entry expires and a thousand requests all recompute it at once. The fix is
one recomputing while the others wait or serve stale.

**Caching an error.** A failure gets stored and served for the next ten minutes. Cache successes
only, deliberately.

**Caching per-user data under a shared key.** The most serious one: somebody else's data returned
to the wrong person. It is a caching bug and an authorization incident at the same time.

## Where the cache goes

**Closest to the expensive thing, and no closer to the user than correctness allows.** A cache in
front of a query is easy to reason about; one in front of a whole response is faster and far
easier to get wrong.`,
    mcqs: [
      mcq('Caching per-user data under a shared key is the most serious failure mode because it is:',
        [['A caching bug and an authorization incident at once', true],
         ['Harder to detect than a stale entry would be', false],
         ['Impossible to fix without clearing the whole cache', false],
         ['Likely to affect every user of the system equally', false]],
        'The wrong person receives somebody else’s data. The consequence is a data exposure rather than merely an out-of-date response.'),
      mcq('Versioned keys are more robust than deleting on write because nothing has to:',
        [['Remember to delete the old entry', true],
         ['Hold a lock while the update is applied', false],
         ['Recompute the value before it is requested', false],
         ['Know which keys depend on the changed data', false]],
        'A writer added later cannot break it by forgetting. Bumping the version makes every stale entry unreachable without enumerating them.'),
    ],
    checkpoint: [
      mcq('The three properties something needs to cache well are read constantly, changes rarely, and:',
        [['Tolerates being slightly wrong', true],
         ['Is expensive to compute from its source', false],
         ['Is identical for every user of the system', false],
         ['Fits within the available cache memory', false]],
        'The third is the one most often missed. A value that must be exact is not cacheable whatever its read frequency or cost.'),
      mcq('A cache stampede happens when a popular entry expires and:',
        [['A thousand requests recompute it at once', true],
         ['The cache evicts other entries to make room', false],
         ['Writers and readers contend for the same key', false],
         ['The recomputed value differs between requests', false]],
        'Every concurrent request misses simultaneously and hits the expensive source. One recomputing while others wait or serve stale is the fix.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_QUALITY_HARDER_FAULT',
    notes: `**A service that passes every test it has and is still wrong.**

## The shape

**Correct in isolation, wrong under concurrency or over time.** The tests run one request at a
time against a fresh database, which is exactly the condition under which these faults do not
appear.

## The five to know

**The lost update.** Two requests read, both modify, both write. One change disappears. No error.

**The non-idempotent retry.** A timeout and a retry produce two orders. The tests never time out.

**The connection leak.** A path that does not return a connection to the pool. Works for hours,
then everything fails at once — and the failure is nowhere near the leak.

**The unbounded query.** No limit, and it was fine until one customer had fifty thousand rows.
One request now consumes all the memory.

**The cached authorization decision.** A permission is checked once and cached; the permission is
revoked and the cache is not.

## Why the test suite cannot see any of them

**Every one requires either concurrency, a timeout, accumulated state, or real data volume.** A
test suite deliberately eliminates all four, because that is what makes tests fast and repeatable.

## How to find them

**Ask what the tests are holding constant**, and vary it. Run two requests at once. Kill the
connection mid-request. Run the same request a thousand times. Load a customer with fifty thousand
rows.

**Each of those takes minutes and each finds a class of fault that no amount of unit testing
will.**`,
    mcqs: [
      mcq('A connection leak is difficult to diagnose chiefly because the failure appears:',
        [['Nowhere near the path that leaks', true],
         ['Only after the service has been restarted', false],
         ['As a slow response rather than an error', false],
         ['Intermittently, depending on the request order', false]],
        'The pool is exhausted by accumulation, so whatever request arrives when the last connection goes is the one that fails, and it is usually innocent.'),
      mcq('The test suite cannot see these faults because it deliberately eliminates concurrency, timeouts, accumulated state and volume, which is what makes tests:',
        [['Fast and repeatable', true],
         ['Easy for a newcomer to understand quickly', false],
         ['Independent of the environment they run in', false],
         ['Capable of running without a real database', false]],
        'Determinism is the property being bought, and these four are precisely the sources of non-determinism that the faults require.'),
    ],
    checkpoint: [
      mcq('The technique for finding this family is to ask what the tests are holding constant and then:',
        [['Vary it deliberately', true],
         ['Add assertions that check it stays constant', false],
         ['Document it as an assumption of the suite', false],
         ['Write integration tests covering the same paths', false]],
        'Each held-constant condition is an unexamined assumption. Running two requests at once, or loading fifty thousand rows, tests it directly.'),
      mcq('A cached authorization decision becomes a fault when:',
        [['The permission is revoked and the cache is not', true],
         ['Two users share the same permission set', false],
         ['The cache is shared across several services', false],
         ['The permission check itself is slow to perform', false]],
        'The revocation is the event the cache does not observe, so access continues for as long as the entry survives.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_QUALITY_PRACTICE',
    notes: `**Reviewing, testing and hardening a service without being told what to look for.**

## The drill

**A service, no issue report, thirty minutes.** Produce findings ordered by consequence.

## The backend review checklist

**Does every external call have a timeout?** The most commonly missing thing, and the most
consequential.

**Is any operation not safe to retry?** If yes, is that deliberate and documented?

**Is any query unbounded?** No limit anywhere is a memory failure waiting for a large customer.

**Is any endpoint loading without scoping to the caller?**

**Is any decision cached that can be revoked?**

**Does any error path leak a stack trace or a connection?**

Six questions, twenty minutes, any service.

## The part that is hard

**None of these produce a failing test.** You are reading for what would happen under conditions
the tests do not create, which is a different activity from reading for correctness and has to be
done deliberately.

## Writing it up

**Consequence first, then likelihood.** "One customer with fifty thousand rows will exhaust
memory" is actionable. "This query has no limit" is an observation that the author may reasonably
consider theoretical.

## Why this is the practice unit for the topic

**Because backend quality is almost entirely about conditions that did not occur in
development**, and the only way to build the habit is to look for them repeatedly on code that
appears to work.`,
    mcqs: [
      mcq('The most commonly missing and most consequential item on the backend review checklist is:',
        [['A timeout on every external call', true],
         ['A limit on every query that returns rows', false],
         ['An idempotency key on every write operation', false],
         ['Authorization scoped on every data access', false]],
        'Without one, a slow dependency exhausts the connection pool and takes down a service that was otherwise working correctly.'),
      mcq('"One customer with fifty thousand rows will exhaust memory" is more actionable than "this query has no limit" because the second may be considered:',
        [['Theoretical, and reasonably deprioritised', true],
         ['Incorrect, if the data volume stays small', false],
         ['A style preference rather than a real defect', false],
         ['Already covered by the database’s own limits', false]],
        'An observation without a consequence competes badly against work that is specified. Naming what happens makes it a cost rather than a note.'),
    ],
    checkpoint: [
      mcq('Reading for what would happen under conditions the tests do not create is a different activity from reading for correctness because it must be:',
        [['Done deliberately, since nothing prompts it', true],
         ['Performed by somebody other than the author', false],
         ['Carried out against the running system instead', false],
         ['Repeated after every change to the service', false]],
        'No failing test draws attention to it. Without a deliberate pass asking these questions, the conditions are simply never considered.'),
      mcq('Backend quality is described as almost entirely about conditions that:',
        [['Did not occur in development', true],
         ['The specification failed to describe fully', false],
         ['Only appear once the service is deployed', false],
         ['Depend on the database engine being used', false]],
        'Load, concurrency, partial failure and retries are absent from a developer’s machine and present in production, which is where the faults live.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_QUALITY_INTERVIEW_QUESTION',
    notes: `**"This endpoint is slow. Walk me through what you do."**

## The order

**"What does slow mean, and for which requests?"** Average or worst case, all requests or some,
always or under load. Asking this first signals that you know the answer differs.

**"Where is the time going?"** Measure before guessing. The query, the serialisation, a downstream
call, or a loop.

**Then the specific fix**, with its cost.

## The four causes, and the follow-up each invites

**N+1** — fix by asking once. Follow-up: "what if you need nested data?" A single query with a
join, or two queries and assembling in memory, and knowing both is the answer.

**Missing index** — follow-up: "what does that cost?" Writes.

**Unbounded query** — follow-up: "how do you paginate?" Cursor rather than offset when data
changes while paging, because offset skips or repeats rows.

**Downstream slowness** — follow-up: "what if you cannot make it faster?" Timeout, cache with a
stated staleness, or make the call asynchronous and return a result later.

## The strongest single move

**Naming the cost of your own proposal before being asked.** An index costs writes. A cache costs
correctness for a defined window. Asynchrony costs a simpler contract with the caller.

## The trap

**Proposing a cache first.** It sounds sophisticated, defers the problem, and the next question is
what happens when it is stale. **If you have not defined staleness, it was not a proposal.**

## The related question

**"How would you find out which endpoint is slow in production?"** They are checking whether
anything was ever measured. Request duration logging with a request id, and percentiles rather
than averages — an average hides the worst ten percent, which is where complaints come from.`,
    mcqs: [
      mcq('Asking "what does slow mean, and for which requests" first signals that you know:',
        [['The answer differs depending on the case', true],
         ['The measurement has probably not been taken', false],
         ['Performance questions are usually underspecified', false],
         ['The interviewer expects a clarifying question here', false]],
        'Average and worst case have different causes and different fixes. Treating them as one question produces an answer to neither.'),
      mcq('Percentiles are preferred to averages for request duration because an average hides:',
        [['The worst ten percent, where complaints come from', true],
         ['Requests that failed before completing at all', false],
         ['The difference between reads and writes in the mix', false],
         ['Variation caused by the time of day or the load', false]],
        'A fast majority pulls the mean down while a slow tail is what users experience and report. The tail is the number that matters.'),
    ],
    checkpoint: [
      mcq('Cursor pagination is preferred to offset when data changes while paging because offset:',
        [['Skips or repeats rows as the data shifts', true],
         ['Becomes slower as the offset grows larger', false],
         ['Cannot be combined with an ordering clause', false],
         ['Requires the total row count to be computed', false]],
        'An insertion or deletion before the current offset shifts everything, so the next page starts in the wrong place. A cursor is anchored to a row.'),
      mcq('The strongest single move in this answer is naming:',
        [['The cost of your own proposal before being asked', true],
         ['The measurement tool you would use to profile it', false],
         ['Several possible causes before choosing between them', false],
         ['A similar problem you have solved previously', false]],
        'Every fix has a cost, and volunteering it demonstrates the trade was understood rather than the solution recalled.'),
    ],
  },

  /* ══ T4_BACKEND_PROOF ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_BACKEND_PROOF_ADVANCED_CHALLENGE',
    notes: `**A requirement where consistency and speed genuinely conflict. Pick one, build it,
justify it.**

## The brief

Something with a real tension. **Inventory with a limited stock count** is the canonical one: two
customers buying the last item at the same moment.

**The strict answer** is a transaction or a lock that serialises the check and the decrement.
Correct, and it becomes a bottleneck under load.

**The relaxed answer** is optimistic — allow the write, detect the conflict, compensate. Faster,
and somebody occasionally receives an apology instead of a product.

**Both are used in production by serious companies.** The choice depends on what the business can
tolerate, which is the thing worth understanding.

## Build one, properly

**Including the case that makes it hard.** For the strict version, show what happens under
concurrent load. For the relaxed version, show the compensation path actually working.

**A submission that only demonstrates the happy path has not built the interesting half.**

## What the justification must contain

**What you optimised for**, and why it is right for this domain.

**What somebody experiences when it goes wrong.** Concretely — a failed checkout, or an apology
email. This is the part that makes it a business decision rather than a technical preference.

**What would change your mind.** "If stock were unlimited I would relax it. If each item were
unique I would not."

## Why this is the advanced challenge for backend

**Because it is the question the direction exists to answer.** Anybody can build an endpoint. What
a backend engineer is hired for is knowing what to do when correctness and throughput pull in
opposite directions and somebody has to choose.`,
    assignment: {
      title: 'A trade-off you have to choose',
      description: 'Build one requirement where consistency and speed genuinely conflict, including the case that makes it hard, and justify the choice in business terms.',
      instructions: `Pick a requirement with real tension between correctness and throughput.
Inventory with limited stock is the canonical one: two customers buying the last item at the same
moment.

**Both answers are legitimate.** The strict version serialises the check and the decrement and
becomes a bottleneck. The relaxed version allows the write, detects the conflict and compensates,
and somebody occasionally receives an apology rather than a product. Both are used in production
by serious companies.

**Build one properly, including the case that makes it hard.** For the strict version, demonstrate
behaviour under concurrent load. For the relaxed version, demonstrate the compensation path
actually running. A submission showing only the happy path has not built the interesting half.

**Submit:** the implementation, evidence of the hard case working, and a justification of no more
than a page covering what you optimised for and why it suits this domain, **what somebody
experiences when it goes wrong** in concrete terms, and what would change your mind.`,
      rubric: [
        { criterion: 'The hard case is demonstrated', description: 'Concurrent load or the compensation path is actually shown working, not described.', maxPoints: 30 },
        { criterion: 'The failure is described in human terms', description: 'The justification says what a person experiences when it goes wrong, not only what the system does.', maxPoints: 25 },
        { criterion: 'The rejected option is treated fairly', description: 'The alternative is presented as legitimate rather than dismissed.', maxPoints: 20 },
        { criterion: 'A condition that would reverse the choice', description: 'A concrete circumstance is given under which the other approach becomes correct.', maxPoints: 25 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Describing what somebody experiences when it goes wrong makes this a business decision rather than a:',
        [['Technical preference', true],
         ['Performance optimisation exercise only', false],
         ['Question about which database to select', false],
         ['Matter for the operations team to resolve', false]],
        'The trade is ultimately about which failure the business can tolerate, and that can only be weighed once the failure is described in human terms.'),
      mcq('A submission demonstrating only the happy path has not built:',
        [['The interesting half of the problem', true],
         ['Enough of the system to be assessed at all', false],
         ['The error handling the requirement specified', false],
         ['The performance characteristics that were claimed', false]],
        'Both designs work when nothing contends. The entire point of the exercise is the behaviour under the condition that creates the tension.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_PROOF_SPECIALIZATION_INTERVIEW',
    notes: `**A full interview on backend engineering alone.**

## Where it starts

**Your own service.** What it does, what it stores, who calls it. They are establishing that
something real exists before probing it.

## Where it goes

**"Walk me through a request."** Every layer, in order, and what each one is responsible for.
**A candidate who cannot do this did not build it**, and it is asked early for exactly that
reason.

**"What happens when the database is down?"** Timeouts, fail fast, a clear error. Not a hang.

**"Two callers update the same row."** Version or lock.

**"The client retried."** Idempotency key.

**"This endpoint is slow."** Measure, then the four causes.

**"How would you change the schema without downtime?"** The three-deploy sequence: tolerate both
shapes, migrate, remove the tolerance.

## The depth markers

**Timeouts, mentioned unprompted.** **Idempotency, mentioned before being asked.** **Percentiles
rather than averages.** Any one of those signals experience beyond coursework.

## The failure mode

**Describing the happy path fluently and having nothing for the failure questions.** It is the
commonest shape, and it reads as somebody who built something that worked once rather than
something that ran.

## How to prepare

**Three stories: a design decision, a performance problem you found and fixed, and a correctness
bug caused by concurrency or a retry.** The third is the one that marks a backend candidate out,
and the one almost nobody has ready.`,
    mcqs: [
      mcq('"Walk me through a request" is asked early because a candidate who cannot do it:',
        [['Did not build the service', true],
         ['Will struggle with the later questions too', false],
         ['Has probably worked only on the frontend', false],
         ['Needs the diagram in front of them to answer', false]],
        'Anybody who built it has traced a request many times while debugging. Inability to do so is the clearest available signal.'),
      mcq('Of the three stories to prepare, the one that marks a backend candidate out and that almost nobody has ready is:',
        [['A correctness bug from concurrency or a retry', true],
         ['A performance problem found and then fixed', false],
         ['A design decision with a rejected alternative', false],
         ['A migration performed without any downtime', false]],
        'It requires having operated something under real conditions, which is exactly what the direction is hired for and what coursework does not produce.'),
    ],
    checkpoint: [
      mcq('The commonest failure shape in this round is describing the happy path fluently and having nothing for the failure questions, which reads as somebody who built something that:',
        [['Worked once rather than something that ran', true],
         ['Was designed by somebody else on the team', false],
         ['Was too small to encounter real problems', false],
         ['They have not looked at for a long time', false]],
        'Fluency about the success path is consistent with a completed project. The failure questions are what distinguish built from operated.'),
      mcq('Changing a schema without downtime uses the three-deploy sequence: tolerate both shapes, migrate, and:',
        [['Remove the tolerance', true],
         ['Roll back the tolerating version afterwards', false],
         ['Verify the migration against a backup copy', false],
         ['Switch traffic to the new schema at once', false]],
        'Each step is independently reversible. Removing the tolerance last is what makes every intermediate state safe to roll back from.'),
    ],
  },
  {
    unitCode: 'T4_BACKEND_PROOF_CHECKPOINT',
    notes: `**Whether backend engineering is demonstrable.**

## What the track asked for

**Designing** — an API and a schema together, from access patterns.

**Building** — an authenticated service with ownership scoped and one operation safe to retry.

**Operating** — finding where time goes, knowing what a cache costs, and what happens under
concurrency.

**Choosing** — a consistency-against-speed decision, justified in terms of what a person
experiences when it is wrong.

## The bar

**The fourth one is the direction.** The first three are competence. Knowing what to do when
correctness and throughput conflict, and being able to defend it, is what the role is hired for.

## What a reviewer looks at

**The retry proof.** A script demonstrating that a duplicate request does not duplicate the
effect is the single most convincing artefact in this track, because almost no student project
has one.

**The trade-off justification**, because it is where judgement is visible.

## If this does not pass

**Usually the gap is operating rather than building.** The service works and nothing has ever
been measured, no concurrent case tested, no timeout set. That is a targeted week rather than a
repeated month.

## What this feeds

**Mock 5** on backend depth. **The portfolio**, where the retry proof and the justification are
the two pieces worth showing. **P14's production project**, which assumes a service that can be
operated rather than merely run.`,
    checkpoint: [
      mcq('The single most convincing artefact in this track is:',
        [['A script proving a duplicate request does not duplicate the effect', true],
         ['A schema diagram showing the normalised design', false],
         ['A benchmark comparing two query implementations', false],
         ['Documentation covering every endpoint in the service', false]],
        'Almost no student project handles retries at all, so demonstrating it separates the work immediately and shows production thinking.'),
      mcq('The capability this direction is hired for, beyond competence, is knowing what to do when:',
        [['Correctness and throughput conflict', true],
         ['A service must be migrated to a new database', false],
         ['The API contract needs to change for clients', false],
         ['Several teams need to modify the same service', false]],
        'Building endpoints is widespread. Choosing between consistency and speed with a defensible justification is the scarce judgement.'),
      mcq('When this checkpoint does not pass, the usual gap is:',
        [['Operating rather than building', true],
         ['Schema design rather than endpoint design', false],
         ['Authentication rather than authorization work', false],
         ['Writing tests rather than writing the service', false]],
        'The service typically works and has never been measured, load-tested or timed out. That is a targeted week, not a repeated month.'),
      mcq('P14’s production project assumes from this track a service that can be:',
        [['Operated rather than merely run', true],
         ['Deployed to more than one environment', false],
         ['Extended by somebody who did not build it', false],
         ['Scaled horizontally without code changes', false]],
        'P14 requires logging, monitoring and deliberate failure handling, all of which presuppose that operating the thing was part of building it.'),
    ],
  },
];
