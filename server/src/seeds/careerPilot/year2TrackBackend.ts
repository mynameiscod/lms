/**
 * T2_TRACK_BACKEND — thirteen units. Year 2, direction track.
 *
 * ── WHAT THIS TRACK ASSUMES AND WHAT IT ADDS ──────────────────────────────────────────────
 *
 * Every student arriving here has had the backbone: HTTP, APIs as a contract, SQL, schema design
 * and secure coding. This track is not those topics again from a backend angle. It is the work of
 * assembling them into a service that other people depend on — where a feature has a correct place
 * to live, a bad request gets an answer a client can act on, and a failure at 2am can be diagnosed
 * from the logs alone.
 *
 * Examples are Python and Flask, with Postgres, because that is what the year has used. The
 * concepts are framework-independent and the units say so where a reader might assume otherwise.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BACKEND_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_BACKEND_ARCHITECTURE',
    notes: `A backend is not one program with routes at the top. It is a small number of layers with
rules about what may live in each, and knowing those rules means every new feature has an obvious
home.

**The layers, outermost first:**

    routes/        what URL maps to what handler
    handlers/      read the request, call a service, shape the response
    services/      the business rules — the part that is actually your application
    repositories/  all database access, and nothing else
    models/        the shapes your domain is made of

**What each is allowed to know:**

| Layer | Knows about | Must not know about |
|---|---|---|
| Handler | HTTP, services | SQL, business rules |
| Service | Models, repositories | HTTP, requests, responses |
| Repository | SQL, models | Business rules, HTTP |

**The handler should be boring.** Four or five lines: parse, call, respond.

    @bp.post("/orders")
    def create_order():
        payload = OrderRequest.parse(request.get_json())
        order = order_service.place(payload, current_user)
        return jsonify(order.to_dict()), 201

Everything interesting happened inside \`place\`, which can be called from a script, a scheduled job
or a test without a web server anywhere near it.

**The repository exists so SQL has one home.** When a query is wrong, or a column is renamed, or a
table needs an index, there is exactly one place to look. Handlers that run their own queries make
that impossible within a month.

**Where a new feature goes, decided in one question:** is this a rule about the domain? Service. Is
it about reading or writing data? Repository. Is it about HTTP? Handler. Almost every feature
answers clearly.

**Do not build layers you do not need yet.** A service that only forwards to a repository is
acceptable — it is a place for the rules that will arrive — but five layers on a project with three
endpoints is ceremony.

**The test, and it is the same one as in the clean code topic:** can you call your core logic from a
plain script? If not, the layering exists in the folder names only.`,
    mcqs: [
      mcq('A handler in a well-layered backend should:',
        [['Parse the request, call a service, shape the response', true],
          ['Contain the validation and business rules', false],
          ['Run its own queries for simple reads', false],
          ['Handle authorisation and persistence', false]],
        'Four or five boring lines; everything interesting is inside the service.'),
      mcq('A service must not know about:',
        [['HTTP requests and responses', true],
          ['The models it operates on', false],
          ['The repositories it calls', false],
          ['The business rules it enforces', false]],
        'That is what lets it run from a script, a job or a test.'),
      mcq('All database access lives in repositories so that:',
        [['A wrong query or renamed column has one place to look', true],
          ['Queries can be cached centrally', false],
          ['The database can be swapped easily', false],
          ['Transactions are handled automatically', false]],
        'Handlers running their own queries make that impossible within a month.'),
      mcq('A service that only forwards to a repository is:',
        [['Acceptable — a home for rules that will arrive', true],
          ['Always unnecessary indirection', false],
          ['A sign the layering is wrong', false],
          ['Required by the architecture', false]],
        'Five layers on three endpoints is the version that is ceremony.'),
    ],
    checkpoint: [
      mcq('The question that decides where a new feature goes is:',
        [['Is it a rule, data access, or HTTP?', true],
          ['Which file is it most similar to?', false],
          ['Which layer has the fewest lines?', false],
          ['Where will it be easiest to test?', false]],
        'Almost every feature answers that clearly.'),
      mcq('If the core logic cannot be called from a plain script, then:',
        [['The layering exists in the folder names only', true],
          ['The service layer needs more methods', false],
          ['The tests need a fixture for the app', false],
          ['A dependency injection framework is needed', false]],
        'Directory names prove nothing about coupling.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_ROUTING',
    notes: `Routing is the public surface of your service. Once clients depend on it, changing it
breaks their code, so it is worth ten minutes of thought before the first endpoint exists.

**Group routes by resource**, in their own module:

    # routes/orders.py
    bp = Blueprint("orders", __name__, url_prefix="/api/v1/orders")

    @bp.get("")              GET    /api/v1/orders
    @bp.post("")             POST   /api/v1/orders
    @bp.get("/<int:id>")     GET    /api/v1/orders/42
    @bp.patch("/<int:id>")
    @bp.delete("/<int:id>")

**Version from the first day.** \`/api/v1/\` costs nothing now and is the only way to make a breaking
change later without breaking every caller at once. Adding a version after clients exist is the
change nobody wants to make.

**Typed path parameters** — \`<int:id>\` rather than \`<id>\` — give you a 404 for
\`/orders/abc\` instead of an exception inside your handler, and remove a validation step.

**Query parameters carry the optional things:** filters, paging, sorting. Parse them with defaults
and bounds, in one place:

    page = clamp(int(request.args.get("page", 1)), 1, 10_000)
    per_page = clamp(int(request.args.get("per_page", 20)), 1, 100)

**Cap \`per_page\`.** Without it, \`?per_page=1000000\` is an unauthenticated denial of service
against your own database.

**Nesting shows ownership, one level:** \`/orders/42/items\`. Beyond one level, give the inner thing
its own top-level route.

**Trailing slashes** cause a surprising amount of confusion. Pick one convention, configure the
framework to redirect the other, and document it.

**Register a 404 and a 405 handler** that return your standard JSON error shape. A framework's
default HTML error page arriving at a JSON client is an unpleasant surprise for whoever is consuming
you.

**Keep the route file readable.** Somebody should be able to open it and see the entire public
surface of the service in one screen — which is also the fastest documentation you will ever
produce.`,
    mcqs: [
      mcq('Adding `/api/v1/` from the first day matters because:',
        [['It is the only way to make a breaking change later without breaking everyone', true],
          ['Frameworks require a version prefix', false],
          ['It improves routing performance', false],
          ['Clients expect it by convention', false]],
        'Adding a version after clients exist is the change nobody wants to make.'),
      mcq('`<int:id>` rather than `<id>` in a route gives you:',
        [['A 404 for a non-numeric id instead of an exception', true],
          ['Faster lookups in the router', false],
          ['Automatic conversion to a model', false],
          ['Protection against injection', false]],
        'It also removes a validation step from the handler.'),
      mcq('Failing to cap `per_page` allows:',
        [['An unauthenticated denial of service against your database', true],
          ['Clients to bypass authentication', false],
          ['Rows to be returned out of order', false],
          ['Duplicate results across pages', false]],
        'Clamp it, with a default and a maximum.'),
      mcq('Registering custom 404 and 405 handlers prevents:',
        [['An HTML error page arriving at a JSON client', true],
          ['Unhandled exceptions in handlers', false],
          ['Routes being registered twice', false],
          ['Clients calling undocumented endpoints', false]],
        'Your standard error shape should apply to framework errors too.'),
    ],
    checkpoint: [
      mcq('Resource nesting should go no deeper than:',
        [['One level, then its own top-level route', true],
          ['Two levels for owned resources', false],
          ['Three levels, matching the data model', false],
          ['As deep as the relationships require', false]],
        '/orders/42/items is fine; deeper is a design signal.'),
      mcq('A readable route file doubles as:',
        [['The fastest documentation you will write', true],
          ['The specification for the tests', false],
          ['A dependency map of the service', false],
          ['A record of the versioning history', false]],
        'One screen showing everything the service offers.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_VALIDATION',
    notes: `Everything arriving from a client is untrusted, and the difference between a service that
is pleasant to use and one that is not is largely in how it refuses things.

**Validate at the boundary, once**, and pass clean data inward:

    @dataclass
    class OrderRequest:
        product_id: int
        quantity: int
        note: str | None = None

        @classmethod
        def parse(cls, body):
            errors = {}
            if not isinstance(body, dict):
                raise ValidationError({"_": "expected a JSON object"})
            ...
            if errors:
                raise ValidationError(errors)
            return cls(...)

Behind that boundary, the service can assume its inputs are the right type and in range — which is
what makes the service layer clean.

**Check in this order: presence, type, range, meaning.** A quantity must exist, be an integer, be
between 1 and 100, and be available in stock. The last is a business rule and belongs in the
service; the first three are validation and belong here.

**Report every error at once.** Returning the first failure means a client fixes one field, resubmits,
and discovers another. Collect them:

    {
      "error": "validation_failed",
      "fields": {
        "quantity": "must be between 1 and 100",
        "product_id": "required"
      }
    }

**Say which field and what is wrong.** "Invalid input" tells a client nothing, and every support
conversation that follows is your time.

**400 for a malformed request, 422 for one that is well-formed and semantically wrong.** Either is
defensible; being consistent is not optional.

**Never trust a client-supplied identity or price.** \`customer_id\` in a body is a suggestion; the
authenticated user is the fact. A price from the client is a discount the customer awarded
themselves.

**Unknown fields are a decision.** Ignoring them is forgiving and hides typos; rejecting them catches
\`quanity\` immediately. Rejecting is usually better for an internal API, forgiving for a public one.

**A schema library** — pydantic, marshmallow — does most of this, with types and error collection
included. Write it by hand once to understand what it is doing, then use the library.`,
    mcqs: [
      mcq('Validation should check in the order:',
        [['Presence, type, range, then meaning', true],
          ['Type, presence, meaning, then range', false],
          ['Meaning first, since it is most important', false],
          ['All at once, collecting every error', false]],
        'The last one is a business rule and belongs in the service.'),
      mcq('Returning only the first validation error means:',
        [['The client fixes one field and discovers another', true],
          ['The response is faster to produce', false],
          ['Errors cannot be localised', false],
          ['Clients retry more often', false]],
        'Collect them and return the set.'),
      mcq('A `customer_id` supplied in a request body should be treated as:',
        [['A suggestion; the authenticated user is the fact', true],
          ['Authoritative, if the request is authenticated', false],
          ['Valid after a type check', false],
          ['Required for the request to be processed', false]],
        'The same applies to any price the client sends.'),
      mcq('Rejecting unknown fields rather than ignoring them:',
        [['Catches a client typo like "quanity" immediately', true],
          ['Is required by the HTTP specification', false],
          ['Improves parsing performance', false],
          ['Is always the right choice', false]],
        'Usually better for an internal API, forgiving for a public one.'),
    ],
    checkpoint: [
      mcq('Validating at the boundary lets the service layer:',
        [['Assume its inputs are typed and in range', true],
          ['Skip its own error handling entirely', false],
          ['Return HTTP status codes directly', false],
          ['Avoid database constraints', false]],
        'Which is what keeps the service clean.'),
      mcq('The value of writing validation by hand once is:',
        [['Understanding what the library does', true],
          ['Avoiding an extra dependency', false],
          ['Better performance than a library', false],
          ['More precise error messages', false]],
        'Then use pydantic or marshmallow.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_PERSISTENCE',
    notes: `The repository layer is where your service meets its database, and getting its shape right
early saves an unpleasant month later.

**A repository takes and returns domain objects, not rows:**

    class OrderRepository:
        def __init__(self, conn):
            self.conn = conn

        def by_id(self, order_id: int) -> Order | None:
            row = self.conn.execute(
                "SELECT id, customer_id, total, status FROM orders WHERE id = %s",
                (order_id,),
            ).fetchone()
            return Order.from_row(row) if row else None

        def save(self, order: Order) -> Order:
            ...

**Returning \`None\` rather than raising** is usually right for a lookup: "not found" is an ordinary
outcome, and the caller decides whether it is an error.

**Parameters, always.** Every query, without exception — this is the one rule from the security topic
that applies on every line you write here.

**Connections.** Use a pool, take a connection per request, and return it in a teardown that runs
even when the handler raises. A connection leaked per error exhausts the pool under load, and the
symptom — everything hanging — looks nothing like the cause.

**Transactions belong in the service**, not the repository. The repository does not know that
creating an order and decrementing stock must succeed together; the service does. So the service
opens the transaction and calls two repositories inside it.

**Migrations, from the first day.** Schema changes go in numbered files, applied in order, checked
into Git:

    migrations/
      001_create_orders.sql
      002_add_status_index.sql
      003_orders_add_note.sql

A schema that exists only in somebody's local database cannot be recreated, and the day you need to
is the day you need it most. Use a migration tool if your stack has one; a directory of numbered SQL
files run by a script is entirely adequate at this size.

**Never write a migration that cannot be run twice**, or that loses data without a separate,
deliberate step.

**ORM or raw SQL** is a real choice. An ORM removes boilerplate and hides cost, which is why the
N+1 problem is so common in ORM codebases. Raw SQL is explicit and more typing. Either is fine; not
knowing which queries your code runs is not.`,
    mcqs: [
      mcq('A repository method should return:',
        [['Domain objects, not database rows', true],
          ['Raw rows, for the service to interpret', false],
          ['Dictionaries matching the table columns', false],
          ['JSON ready for the response', false]],
        'The translation belongs at that boundary, once.'),
      mcq('Transactions belong in the service layer because:',
        [['Only it knows which operations must succeed together', true],
          ['Repositories cannot open transactions', false],
          ['It keeps the repository interface smaller', false],
          ['Handlers would otherwise manage them', false]],
        'The service opens one and calls two repositories inside it.'),
      mcq('A connection leaked on every error results in:',
        [['The pool exhausting, with everything hanging', true],
          ['Queries returning stale data', false],
          ['Transactions being committed twice', false],
          ['An immediate error on the next request', false]],
        'The symptom looks nothing like the cause.'),
      mcq('A schema that exists only in a local database:',
        [['Cannot be recreated when you most need to', true],
          ['Is acceptable during development', false],
          ['Can be extracted from the ORM models', false],
          ['Is recoverable from a database backup', false]],
        'Numbered migration files, in Git, from the first day.'),
    ],
    checkpoint: [
      mcq('Returning `None` from a lookup rather than raising is right because:',
        [['Not found is ordinary; the caller decides', true],
          ['Exceptions are expensive in Python', false],
          ['Repositories should never raise', false],
          ['It simplifies the type signature', false]],
        'Whether it is an error depends on the caller.'),
      mcq('The risk an ORM introduces, more than raw SQL, is:',
        [['Not knowing which queries actually run', true],
          ['SQL injection through generated queries', false],
          ['Inability to use transactions', false],
          ['Schema drift from the migrations', false]],
        'Which is why N+1 is so common in ORM codebases.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_CRUD_API',
    notes: `Five endpoints over one resource, each done properly. It sounds routine and almost nobody
gets all five right first time.

**Create** — 201, with the created object and a \`Location\` header:

    @bp.post("")
    def create():
        payload = OrderRequest.parse(request.get_json())
        order = service.place(payload, g.user)
        resp = jsonify(order.to_dict())
        resp.status_code = 201
        resp.headers["Location"] = f"/api/v1/orders/{order.id}"
        return resp

**Read one** — 200 with the object, 404 if absent, **404 rather than 403 if it belongs to somebody
else**, so you do not confirm its existence.

**List** — 200 with paging metadata, never an unbounded array:

    {"data": [...], "page": 1, "per_page": 20, "total": 143}

**Update** — PATCH for a partial change, and only the fields supplied. Return 200 with the updated
object so the client does not need a second request. 404 if it does not exist; 409 if the change
conflicts with the current state.

**Delete** — 204 with no body when it worked, 404 if it was not there. Decide between a soft delete
(a \`deleted_at\` column, recoverable, and every query must then exclude it) and a hard delete
(gone). Soft is usually right for anything a customer created; whichever you choose, apply it
consistently.

**The consistency that makes an API usable:** the same error shape everywhere, the same date format,
the same field naming, the same paging structure on every list. A caller learns your conventions once
and then guesses the rest correctly.

**Every endpoint checks ownership**, not just the read. A PATCH that updates any order by id is the
same vulnerability as a GET that reads any order by id, and it is more damaging.

**The five failure paths to test**, for every endpoint: missing, not yours, malformed body, invalid
values, and not authenticated. That is twenty-five tests for one resource, and it is the difference
between an endpoint that works and an endpoint that holds.`,
    mcqs: [
      mcq('A successful create should return:',
        [['201, the object, and a Location header', true],
          ['200 with the new id in the body', false],
          ['204, since the client has the data', false],
          ['201 with an empty body', false]],
        'Location tells the caller where the new resource lives.'),
      mcq('Requesting a resource belonging to somebody else should return:',
        [['404, so its existence is not confirmed', true],
          ['403, which is more accurate', false],
          ['401, to prompt re-authentication', false],
          ['400, since the request is invalid', false]],
        'A 403 tells the caller they found something real.'),
      mcq('A list endpoint should never return:',
        [['An unbounded array with no paging metadata', true],
          ['An empty array when nothing matches', false],
          ['Results sorted by creation date', false],
          ['A total count alongside the data', false]],
        'Paging from the first version; adding it later breaks callers.'),
      mcq('A PATCH conflicting with the current state should return:',
        [['409', true], ['400', false], ['422', false], ['404', false]],
        '404 is for absent; 409 is for clashing with what exists.'),
    ],
    checkpoint: [
      mcq('Ownership must be checked on:',
        [['Every endpoint, including update and delete', true],
          ['Read endpoints, where data is exposed', false],
          ['Delete endpoints, which are destructive', false],
          ['Endpoints that return more than one record', false]],
        'A PATCH that updates any order is worse than a GET that reads one.'),
      mcq('The five failure paths to test per endpoint are:',
        [['Missing, not yours, malformed, invalid, unauthenticated', true],
          ['Timeout, conflict, malformed, missing, duplicate', false],
          ['Unauthorised, forbidden, missing, slow, invalid', false],
          ['Empty, large, malformed, duplicate, concurrent', false]],
        'Twenty-five tests for one resource, and worth every one.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_AUTHENTICATION',
    notes: `Logging a user in, and keeping them logged in, done in a way that survives a stolen
database.

**Registration:**

    def register(email: str, password: str) -> User:
        if len(password) < 12:
            raise ValidationError({"password": "must be at least 12 characters"})
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
        return repo.create(email=email.lower().strip(), password_hash=hashed)

**Normalise the email** — lowercase and trimmed — and make the column UNIQUE, or you will discover
two accounts for one person.

**Login:**

    def login(email: str, password: str) -> str:
        user = repo.by_email(email.lower().strip())
        if user is None or not bcrypt.checkpw(password.encode(), user.password_hash):
            raise AuthError("invalid email or password")     # the same message either way
        return issue_token(user)

**The same message for both cases**, or you have built an endpoint that tells an attacker which
emails are registered. Ideally the same timing too, which means doing the hash comparison even when
the user is absent.

**Rate limit login.** Five attempts per email per fifteen minutes, and a limit per IP. Without it,
your login endpoint is an offer to try every password in a leaked list.

**Tokens or sessions.** A token, signed and short-lived, is stateless and scales; a server-side
session is revocable instantly. For a first backend a token with a 15–60 minute expiry, plus a
longer-lived refresh token stored server-side, gives you most of both.

**Middleware puts the user on the request**, once, for every protected route:

    @bp.before_request
    def authenticate():
        token = bearer_token(request)
        if token is None:
            abort(401)
        g.user = verify(token)      # raises 401 if expired or tampered

**Never write your own token format or hashing.** Use a maintained JWT library and bcrypt, scrypt or
Argon2. Every home-made version of either has been broken, usually in the same handful of ways.

**And send everything over HTTPS.** A token on a plain connection is a password anybody on the path
can read.`,
    mcqs: [
      mcq('Login must return the same message for a wrong password and an unknown email because:',
        [['Otherwise it reveals which emails are registered', true],
          ['It simplifies the client code', false],
          ['Different messages slow the response', false],
          ['The HTTP status is the same anyway', false]],
        'Ideally the timing matches too, which means hashing regardless.'),
      mcq('Rate limiting the login endpoint prevents it from being:',
        [['An offer to try every password in a leaked list', true],
          ['Used from more than one device', false],
          ['Called without a valid token', false],
          ['Overloaded by legitimate users', false]],
        'Per email and per IP, both.'),
      mcq('Emails should be normalised and the column made UNIQUE because:',
        [['Otherwise one person ends up with two accounts', true],
          ['Databases cannot index mixed-case text', false],
          ['It is required for password reset', false],
          ['Tokens are keyed on the email', false]],
        'Lowercase and trimmed, at the boundary.'),
      mcq('Writing your own token format is discouraged because:',
        [['Every home-made version has been broken in the same ways', true],
          ['Libraries are faster', false],
          ['Custom formats cannot be verified', false],
          ['Clients expect a standard format', false]],
        'The same applies to hashing.'),
    ],
    checkpoint: [
      mcq('A short-lived access token plus a server-side refresh token gives you:',
        [['Most of the benefits of tokens and of sessions', true],
          ['Instant revocation of the access token', false],
          ['Statelessness with no storage at all', false],
          ['Protection against token theft', false]],
        'Scale from the token, revocability from the refresh side.'),
      mcq('Authentication middleware should:',
        [['Put the verified user on the request', true],
          ['Check permissions for each endpoint', false],
          ['Re-issue the token on every request', false],
          ['Be called explicitly inside each handler', false]],
        'Permissions are authorisation, which is the next unit.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_AUTHORISATION',
    notes: `Authentication established who is calling. Authorisation decides what they may do, and it
is where the most damaging backend bugs live.

**Two kinds of rule, and you need both:**

**Ownership** — this record belongs to this user:

    order = repo.by_id(order_id)
    if order is None or order.customer_id != g.user.id:
        abort(404)

**Role** — this user may perform this kind of action:

    if not g.user.has_role("admin"):
        abort(403)

**Check it in the service, not the handler.** A rule enforced in one handler is a rule that does not
apply to the background job, the admin script or the second endpoint somebody adds next month. The
service is the only layer everything goes through.

**Never take the role from the request.** It comes from your own record of the user, loaded server
side. A role in a request body, or read from a field the client can set, means the client assigns
their own permissions.

**The filtered-list bug.** Ownership on a single record is obvious; on a list it is easy to forget:

    repo.all_orders()                    # every customer's orders
    repo.orders_for(customer_id)         # what you meant

Make the repository method require the scope, so that forgetting it is a type error rather than a
data leak.

**Do not return more than the caller may see.** A response containing fields the interface hides has
disclosed them; the API response is what was actually sent.

**Write the permission matrix down** — who may do what to which resource — before implementing it.
Half of all authorisation bugs are cases nobody had decided, rather than checks nobody wrote.

| | Own order | Others' orders | Any order |
|---|---|---|---|
| Customer | read, cancel | — | — |
| Support | read | read | — |
| Admin | read | read | read, edit, delete |

**Test it with two accounts and a script.** Take every request one user can make and replay it as
the other. Anything that succeeds is a finding, and this single exercise catches more real bugs than
any amount of careful reading.`,
    mcqs: [
      mcq('Authorisation should be enforced in the service because:',
        [['It is the only layer every caller goes through', true],
          ['Handlers cannot access the user object', false],
          ['It keeps the handler shorter', false],
          ['Framework middleware runs too early', false]],
        'A rule in one handler does not apply to the job or the next endpoint.'),
      mcq('The easily forgotten authorisation bug is:',
        [['A list endpoint not scoped to the caller', true],
          ['A single record without an ownership check', false],
          ['An admin endpoint without a role check', false],
          ['A delete endpoint returning 204', false]],
        'Make the repository require the scope so forgetting it fails loudly.'),
      mcq('A role supplied in the request body means:',
        [['The client assigns their own permissions', true],
          ['The role must be validated against a list', false],
          ['The token has been tampered with', false],
          ['The session needs refreshing', false]],
        'It comes from your own record of the user, loaded server side.'),
      mcq('Writing the permission matrix before implementing it prevents:',
        [['Cases nobody decided, which are half of these bugs', true],
          ['Checks being written in the wrong layer', false],
          ['Roles proliferating over time', false],
          ['Ownership being confused with roles', false]],
        'Undecided is a commoner cause than unwritten.'),
    ],
    checkpoint: [
      mcq('Returning fields the interface does not display is:',
        [['A disclosure, since the response was actually sent', true],
          ['Acceptable, as the client filters them', false],
          ['A performance issue rather than a security one', false],
          ['Fine if the fields are not sensitive', false]],
        'Whatever is in the response has been given away.'),
      mcq('The two-account replay test catches:',
        [['More bugs than careful reading does', true],
          ['Injection flaws in queries', false],
          ['Missing rate limits', false],
          ['Token expiry problems', false]],
        'Every request one user can make, replayed as the other.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_API_TESTING',
    notes: `Testing an API means sending real requests to your application and checking the whole
response — the status, the body, and what changed in the database.

    def test_create_order_returns_201(client, auth_headers):
        resp = client.post("/api/v1/orders",
                           json={"product_id": 1, "quantity": 2},
                           headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json["quantity"] == 2
        assert resp.headers["Location"].endswith(f"/orders/{resp.json['id']}")

**Most frameworks give you a test client** that exercises the real routing, middleware and
serialisation without a running server, which is exactly the right level for this.

**The failure paths are the tests that matter**, and there are five per endpoint:

    def test_create_order_rejects_zero_quantity(client, auth_headers): ...   # 400
    def test_create_order_requires_auth(client): ...                        # 401
    def test_get_other_users_order_is_404(client, auth_headers): ...        # 404
    def test_patch_cancelled_order_conflicts(client, auth_headers): ...     # 409
    def test_create_order_rejects_malformed_json(client, auth_headers): ... # 400

**Assert the status and the body.** A test checking only the status passes when the endpoint returns
201 with the wrong object.

**Check the side effect, not just the response.** After a create, the row should exist; after a
delete, it should not. A handler that returns 201 and never writes is a real bug and a green test
without this.

**A fresh database per test**, or a transaction rolled back afterwards. Tests that share state pass
in one order and fail in another, and chasing that costs more than the isolation would have.

**Build fixtures for the tedious parts:** a client, an authenticated user, a second user for the
ownership tests, and a seeded product. Tests with twelve lines of setup do not get written.

**Test the boundary of external services with stubs**, so your suite does not call a payment provider
and does not fail when their sandbox is down.

**What not to test:** the framework's routing, the database's correctness, or a getter. Test your
rules and your failure paths, which is where your bugs are.`,
    mcqs: [
      mcq('A test that checks only the status code:',
        [['Passes when the endpoint returns the wrong object', true],
          ['Is sufficient for create endpoints', false],
          ['Tests the routing adequately', false],
          ['Catches most handler bugs', false]],
        'Assert the status and the body.'),
      mcq('Checking the database after a create catches:',
        [['A handler that returns 201 and never writes', true],
          ['A validation rule that is too strict', false],
          ['A missing ownership check', false],
          ['An incorrect status code', false]],
        'A real bug that passes a response-only test.'),
      mcq('Tests should use a fresh database or a rolled-back transaction because:',
        [['Shared state passes in one order and fails in another', true],
          ['It makes tests run faster', false],
          ['Frameworks require isolation', false],
          ['It avoids needing fixtures', false]],
        'Chasing order-dependent failures costs more than the isolation.'),
      mcq('Fixtures matter because:',
        [['Tests needing twelve lines of setup do not get written', true],
          ['They make assertions clearer', false],
          ['They are required by most test runners', false],
          ['They replace the need for stubs', false]],
        'A client, two users and a seeded product cover most cases.'),
    ],
    checkpoint: [
      mcq('External services should be stubbed in tests so that:',
        [['The suite never fails on their outages', true],
          ['Responses can be made faster', false],
          ['Credentials are not needed in CI', false],
          ['The integration is tested more thoroughly', false]],
        'Their sandbox being down should not fail your build.'),
      mcq('Which is not worth testing?',
        [['The framework\'s own routing', true],
          ['Your validation rules', false],
          ['Your ownership checks', false],
          ['Your error responses', false]],
        'Test your rules and your failure paths.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_LOGGING',
    notes: `At two in the morning, with a user reporting a failure that happened twenty minutes ago,
your logs are the only evidence there is.

**Log structured events, not sentences:**

    logger.info("order_created", extra={
        "order_id": order.id, "customer_id": user.id,
        "total": order.total, "request_id": g.request_id,
    })

Fields can be filtered and counted; prose cannot. "Created order 4821 for customer 92" reads nicely
and cannot answer "how many orders failed for this customer today".

**A request id on every line** is the single most valuable thing in this unit. Generate one per
request, attach it to every log line, and return it in the response and in error bodies. A user who
reports "error reference a4f2c1" has just handed you their entire request in one search.

**What to log per request:** method, path, status, duration, user id, request id. One line in, one
line out, and that alone answers most operational questions.

**What to log inside:** decisions and failures. "Payment declined", "stock check failed",
"retrying after timeout". Not every step — a log per line of code is noise nobody reads.

**Never log:** passwords, tokens, card numbers, personal data. Logs are copied, shipped to third
parties and read by many people. Redact at the point of writing, because doing it afterwards is not
possible.

**The levels, used properly:** DEBUG for development, INFO for events worth a record, WARNING for
something recoverable that may matter, ERROR for a failed operation with the exception attached,
CRITICAL for a service that cannot continue.

**Log the exception, not just the message:**

    logger.exception("order_creation_failed", extra={"request_id": g.request_id})

Inside an exception handler, that records the full traceback. \`logger.error(str(e))\` throws away
the line number, which is the part you needed.

**Health and readiness endpoints** — \`/health\` returning quickly, and a readiness check that
confirms the database is reachable — are what monitoring uses to know whether you are alive, and
they cost five lines.`,
    mcqs: [
      mcq('The single most valuable thing to include on every log line is:',
        [['A request id, also returned to the user', true],
          ['The full request body', false],
          ['The name of the handler', false],
          ['The server hostname', false]],
        'An error reference hands you the whole request in one search.'),
      mcq('Structured fields beat prose log messages because:',
        [['They can be filtered and counted', true],
          ['They take less storage', false],
          ['They are easier to read', false],
          ['They avoid logging sensitive data', false]],
        '"How many failed for this customer today" needs fields.'),
      mcq('`logger.exception(...)` inside a handler differs from `logger.error(str(e))` by:',
        [['Recording the full traceback', true],
          ['Escalating the severity level', false],
          ['Suppressing the original exception', false],
          ['Adding the request context automatically', false]],
        'The line number is the part you needed.'),
      mcq('Redacting sensitive data must happen:',
        [['At the point the log line is written', true],
          ['In the log aggregation pipeline', false],
          ['When the logs are reviewed', false],
          ['Only for production environments', false]],
        'Logs are copied and shipped; doing it afterwards is not possible.'),
    ],
    checkpoint: [
      mcq('The per-request log line should contain:',
        [['Method, path, status, duration, ids', true],
          ['The request body and the response body', false],
          ['Every query executed during the request', false],
          ['The handler name and the stack depth', false]],
        'One line in, one line out, answering most operational questions.'),
      mcq('A readiness endpoint differs from a health endpoint by:',
        [['Confirming the database is reachable', true],
          ['Returning more detail about the service', false],
          ['Requiring authentication', false],
          ['Running only at startup', false]],
        'Health says the process is alive; readiness says it can serve.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_DOCUMENTATION',
    notes: `An API nobody can use without asking you is an API with one user. Documentation is what
makes it a service rather than a private program.

**The table another engineer needs, per endpoint:**

| | |
|---|---|
| Method and path | \`POST /api/v1/orders\` |
| What it does | Creates an order for the authenticated customer |
| Auth | Bearer token required |
| Request body | Fields, types, required or optional, constraints |
| Success | 201, the order object, \`Location\` header |
| Errors | 400 validation, 401 no token, 409 out of stock |
| Example | A real request and a real response |

**The example is what people actually read.** A curl command they can paste, with a realistic
response beside it, answers more questions than a field table:

    curl -X POST https://api.example.com/api/v1/orders \\
      -H "Authorization: Bearer $TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"product_id": 42, "quantity": 2}'

**Document the errors, not only the success.** Every client has to handle failure, and an
undocumented 409 becomes a support conversation.

**OpenAPI generated from the code** is the version that stays true. A hand-written document drifts
within weeks, because nobody updates documentation while fixing a bug. If your framework can produce
a specification from your route definitions and schemas, use it — and the interactive page it
generates doubles as a way for people to try the API.

**Document the things that are not in the schema:** rate limits, paging defaults and maximums, date
formats, authentication lifetime, and what is idempotent. Those are the questions people ask, and
none of them appear in a type definition.

**A changelog** matters as soon as anybody depends on you. What changed, when, and whether it breaks
anything.

**The test of your documentation:** hand it to somebody, without speaking, and ask them to create an
order. Watch where they stop. That is the most useful twenty minutes you will spend on it, and it is
the same test as the README from the portfolio topic.`,
    mcqs: [
      mcq('The part of API documentation people actually read is:',
        [['A working example they can paste', true],
          ['The field table for the request body', false],
          ['The authentication overview', false],
          ['The list of status codes', false]],
        'A curl command and a realistic response beside it.'),
      mcq('OpenAPI generated from the code is preferred to a hand-written document because:',
        [['Hand-written documentation drifts within weeks', true],
          ['It is more detailed', false],
          ['It is required by most clients', false],
          ['It validates requests automatically', false]],
        'Nobody updates documentation while fixing a bug.'),
      mcq('Which is not in a schema and must be documented separately?',
        [['Rate limits and paging maximums', true],
          ['Field types', false],
          ['Required fields', false],
          ['Response object shape', false]],
        'Also date formats, token lifetime, and what is idempotent.'),
      mcq('Documenting error responses matters because:',
        [['Every client has to handle failure', true],
          ['It reduces the number of errors', false],
          ['Status codes are otherwise ambiguous', false],
          ['It is required for OpenAPI validity', false]],
        'An undocumented 409 becomes a support conversation.'),
    ],
    checkpoint: [
      mcq('The test of API documentation is:',
        [['Watching somebody use it without help', true],
          ['Reviewing it against the route definitions', false],
          ['Checking every endpoint is listed', false],
          ['Validating the OpenAPI specification', false]],
        'Where they stop is what needs rewriting.'),
      mcq('A changelog becomes necessary as soon as:',
        [['Anybody else depends on your API', true],
          ['The API reaches version two', false],
          ['The team grows beyond one person', false],
          ['A breaking change is planned', false]],
        'What changed, when, and whether it breaks anything.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_DEBUGGING',
    notes: `Backend problems arrive as a symptom somebody else noticed. These are the shapes, and what
each narrows it to.

**500 on one request and not others.** Data-dependent: a null where code assumed a value, an unusual
character, a record in a state nobody expected. The request id in the error response leads to the
log line with the traceback, which is why the last unit mattered.

**Everything slow, suddenly.** Check in this order: is the database under load, is a dependency
timing out, is the connection pool exhausted, did traffic increase. A pool exhausted by leaked
connections presents as everything hanging with a quiet database, which is a distinctive signature.

**One endpoint slow, and slower with more data.** N+1 queries or a missing index. Count the queries
per request — most frameworks can log them — and if the count grows with the number of rows
returned, it is N+1.

**Works locally, fails deployed.** Configuration, almost always: a missing environment variable, a
different database version, a migration not applied, a file path that exists only on your machine.

**401 from a client that has a valid token.** The header is missing, malformed, or the clock has
drifted enough to make a short-lived token appear expired.

**Intermittent failures.** Concurrency: two requests writing the same row, a read-then-write race, a
cache and a database disagreeing. Reproduce with two simultaneous requests rather than one.

**Data that is wrong rather than missing.** Trace it backwards from the database: is the row wrong,
or the query, or the serialisation? Each answer eliminates two thirds of the code.

**The tools:**

    tail -f app.log | grep <request_id>      # everything from one request
    EXPLAIN ANALYZE <the query>              # what the database actually did
    SELECT count(*) FROM pg_stat_activity;   # how many connections are open

**And the first question, always: what changed?** A deploy, a configuration change, a data migration,
a dependency upgrade, or a change in traffic. A system that worked yesterday and fails today usually
had something done to it.`,
    mcqs: [
      mcq('A 500 on one request but not others points at:',
        [['Something in that request\'s data', true],
          ['A memory leak in the process', false],
          ['A misconfigured route', false],
          ['An expired credential', false]],
        'The request id leads straight to the traceback.'),
      mcq('Everything hanging while the database looks idle suggests:',
        [['The connection pool is exhausted', true],
          ['A slow query blocking others', false],
          ['A network partition', false],
          ['A full disk on the server', false]],
        'A distinctive signature, usually from connections leaked on errors.'),
      mcq('Query count growing with the number of rows returned indicates:',
        [['An N+1 query problem', true],
          ['A missing index', false],
          ['A transaction held too long', false],
          ['A cache miss on every row', false]],
        'Most frameworks can log the queries per request.'),
      mcq('"Works locally, fails deployed" is almost always:',
        [['Configuration', true],
          ['A framework version difference', false],
          ['A concurrency problem', false],
          ['A missing dependency', false]],
        'A variable, a migration, or a path that exists only on your machine.'),
    ],
    checkpoint: [
      mcq('The first diagnostic question for a system that worked yesterday is:',
        [['What changed?', true],
          ['What do the logs say?', false],
          ['Is the database healthy?', false],
          ['Has traffic increased?', false]],
        'A deploy, a config change, a migration, an upgrade, or traffic.'),
      mcq('Intermittent failures usually indicate:',
        [['Concurrency between requests', true],
          ['An unreliable network', false],
          ['Insufficient memory', false],
          ['A flaky dependency', false]],
        'Reproduce with two simultaneous requests rather than one.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_PRACTICE',
    notes: `No new ideas. Build endpoints until the shape of a correct one is automatic.

**Do these, each as a small service or added to an existing one:**

1. **A complete resource.** Five endpoints, correct status codes, paging, ownership on all five, and
   twenty-five failure tests.
2. **Add auth to something unprotected.** Take a service with open endpoints and add registration,
   login, middleware and per-endpoint ownership.
3. **Break your own ownership.** Write a script that logs in as two users and replays every request
   as the other. Fix everything it finds.
4. **Fix an N+1.** Build a list endpoint that fetches a related record per row, measure the query
   count, replace it with one join, and measure again.
5. **Write a migration** that adds a column, backfills it, and adds a constraint — in the right order,
   so it can run against a live table.
6. **Handle a dependency failure.** Call an external service from an endpoint, then point it at a
   dead address and make your endpoint degrade rather than hang.
7. **Add request ids and structured logs**, then answer three questions from the logs alone: what did
   this user do, how many requests failed today, which endpoint is slowest.
8. **Document one resource** and have somebody use it without speaking to you.

**Record for each:** what you built, what was wrong on the first attempt, and the measurement where
there is one.

**The standard this set is aiming at:** an endpoint is not finished when it returns the right thing
for the right input. It is finished when it returns the right thing for every wrong input as well.`,
    mcqs: [
      mcq('The N+1 exercise requires you to:',
        [['Measure the query count before and after the fix', true],
          ['Rewrite the endpoint with an ORM', false],
          ['Add an index to the related table', false],
          ['Cache the related records', false]],
        'The measurement is the evidence; the join is the fix.'),
      mcq('A migration that adds a column, backfills and adds a constraint must:',
        [['Run in that order so it works on a live table', true],
          ['Be split into three separate deployments', false],
          ['Add the constraint before backfilling', false],
          ['Lock the table for the whole operation', false]],
        'The constraint cannot be added while violating rows exist.'),
      mcq('The two-account replay script is written because:',
        [['Manual checking misses ownership gaps', true],
          ['It is faster than writing tests', false],
          ['It documents the permission matrix', false],
          ['It tests authentication as well', false]],
        'Every request one user can make, replayed as the other.'),
      mcq('Pointing an external call at a dead address tests:',
        [['Whether your endpoint degrades rather than hangs', true],
          ['Whether the retry policy is correct', false],
          ['Whether the timeout is long enough', false],
          ['Whether the error is logged', false]],
        'Hanging is the failure this exercise is designed to expose.'),
      mcq('An endpoint is finished when it:',
        [['Returns the right thing for every wrong input too', true],
          ['Returns the right thing for valid input', false],
          ['Has a test for its success path', false],
          ['Is documented and deployed', false]],
        'The standard the whole set is aiming at.'),
    ],
    checkpoint: [
      mcq('Answering "which endpoint is slowest" from logs alone requires:',
        [['Duration recorded on every request line', true],
          ['A profiler attached to the process', false],
          ['Database query logging enabled', false],
          ['An external monitoring service', false]],
        'Which is why the per-request line includes it.'),
      mcq('Having somebody use your documentation without speaking to you reveals:',
        [['Exactly which step is missing or unclear', true],
          ['Whether the API design is good', false],
          ['Whether the examples are correct', false],
          ['How long onboarding takes', false]],
        'Watch where they stop.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_BACKEND_MINI_PROJECT',
    notes: `A complete backend service, built the way a team would expect, and defensible endpoint by
endpoint.

**Why a whole service rather than more endpoints.** The track has taught the pieces; this proves you
can assemble them into something with consistent conventions, where authorisation holds everywhere,
the failure behaviour is uniform, and a stranger can run it and use it.

**What is being assessed:** that the layering is real, that every endpoint enforces ownership, that
the failure paths are tested, that the logs would let you diagnose a problem you did not witness, and
that the documentation stands without you.

**Build it in this order:**

1. **Design the API first** — resources, endpoints, request and response shapes, error format — and
   write it down before any code.
2. **Schema and migrations**, with constraints.
3. **One resource end to end**, all five endpoints, tested, before building the second.
4. **Authentication, then authorisation**, with the permission matrix written first.
5. **Logging, health, and the failure behaviour.**
6. **Documentation**, tested on a person.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — A Backend Service Somebody Can Depend On',
      description: 'Build a complete, layered backend API with authentication, authorisation on every endpoint, tested failure paths, useful logs and documentation a stranger can follow.',
      instructions: `**The brief**

Build a backend service with **at least three related resources** and real rules between them.
Examples: a lending library, a small order system, a ticketing service, a booking system for a
shared space.

There is no frontend requirement. This is an API.

**Requirements**

1. **An API design document written first**: resources, endpoints, request and response shapes, the
   error format, and the permission matrix.
2. **Layering**: routes, handlers, services, repositories, models — with business logic callable
   without HTTP, proved by a test that does exactly that.
3. **A schema with migrations**, numbered and in Git, including constraints and at least one index
   you can justify.
4. **Full CRUD on each resource**, with correct status codes, paging on every list, and consistent
   conventions throughout.
5. **Authentication** with hashed passwords, rate-limited login, and tokens.
6. **Authorisation on every endpoint**, ownership and roles, enforced in the service layer.
7. **Validation at the boundary**, collecting every error, with a consistent error body.
8. **At least forty tests**, including five failure paths per endpoint and the two-account ownership
   replay.
9. **Structured logging** with request ids, plus health and readiness endpoints.
10. **One external dependency** called with a timeout, degrading gracefully when unavailable.
11. **Documentation** with an example request and response per endpoint, and every error documented.

**What to submit**

1. The repository, running from a clean clone with a README.
2. The **API design document**, with a note on what changed during the build.
3. The **permission matrix**, and the test output proving it holds.
4. The **test report**: what is covered, what is not, and why.
5. A **log sample** from a real run, including one failing request traced by its request id.
6. A **demonstration with the external dependency unavailable.**
7. A **short write-up** (400–500 words): the design decision you would reverse; the failure path you
   had not considered until you wrote its test; what you would need before putting this in front of
   real users.

**Constraints**

- No business rule in a handler.
- No unparameterised query anywhere.
- No secret in the repository; no personal data in a log line.

**Where the marks are.** Authorisation and failure behaviour. A CRUD API that works for one
well-behaved user is a week-one exercise; one where every endpoint refuses correctly and every
failure is diagnosable is a service.`,
      rubric: [
        {
          criterion: 'Architecture',
          description: 'Real layering with logic callable without HTTP; consistent conventions; a new feature would have an obvious home.',
          maxPoints: 20,
        },
        {
          criterion: 'Correctness of the API',
          description: 'Status codes right including creation, conflict and absence; paging everywhere; validation collecting all errors with a consistent body.',
          maxPoints: 20,
        },
        {
          criterion: 'Authentication and authorisation',
          description: 'Passwords hashed, login rate-limited, ownership and roles enforced in the service on every endpoint, matrix proved by the replay test.',
          maxPoints: 25,
        },
        {
          criterion: 'Failure behaviour and observability',
          description: 'Forty or more tests including failure paths; graceful degradation of the external dependency; request-id logging that traces a failure end to end.',
          maxPoints: 25,
        },
        {
          criterion: 'Documentation and write-up',
          description: 'Every endpoint documented with examples and errors; honest account of a reversible decision and of production readiness.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
