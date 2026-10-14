/**
 * Career-track content, batch P4: Django, the Django ORM, DRF and FastAPI at interview depth
 * (JT_IV_DJANGO), for Python Full Stack + AI.
 *
 * The students have already built a Django 5 + MySQL backend with the ORM, a DRF API secured with
 * Simple JWT, pytest-django tests, and a separate FastAPI AI service. The track's Django topics taught
 * all of that; this topic is what an interviewer asks once they know you have used it: the order a
 * request moves through middleware, why signals hide business logic, when a queryset really hits the
 * database, N+1 and its two fixes, F and Q, annotate vs aggregate, atomic blocks and row locks,
 * migrations on a table that is live, DRF's validation order, scoping get_queryset, JWT rotation and
 * blacklisting, Pydantic's 422, async def vs def, Depends, and what breaks at ten times the users.
 *
 * Each question-set unit declares one skillKey (DJANGO, DJANGO_REST or FASTAPI), so its checkpoint
 * questions name none; the topic CHECKPOINT names the skill each question measures. Stack: Python 3.12,
 * Django 5.2, DRF 3.15+, djangorestframework-simplejwt 5, FastAPI with Pydantic v2, MySQL 8. Every
 * behaviour stated as fact here was run against Django 5.2 / DRF 3.18 / FastAPI 0.14x.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_IV_DJANGO_BUNDLES: PilotBundle[] = [
  /* ── IV_DJANGO_CORE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_DJANGO_CORE',
    notes: `Django internals questions sound like trivia ("what is middleware?") and are used to find out
whether you have only followed a tutorial or can say what the framework does with a request. Each
answer below is what a strong candidate says in about a minute, then the follow-up the interviewer is
setting up, then the answers that lose marks.

## 1. Walk me through what happens to one HTTP request in Django.

**Strong answer.** Gunicorn (or \`runserver\`) calls Django's WSGI handler, which builds an
\`HttpRequest\`. The request goes **down** through \`MIDDLEWARE\` in list order, the URL resolver
matches \`urlpatterns\` top to bottom and picks a view, any \`process_view\` hooks run, the view runs
and returns an \`HttpResponse\`, and the response goes back **up** through the middleware in reverse
order before the handler hands it to the server.

    MIDDLEWARE = [A, B, C]

    request  ->  A  ->  B  ->  C  ->  view
    response <-  A  <-  B  <-  C  <-

**Follow-up.** "If B returns a response without calling \`get_response\`, who sees it?" — only A, on
the way out. C and the view never run. That is exactly how a rate-limit or maintenance middleware
short-circuits a request.

**Wrong answers.** "Middleware runs in the same order on the way out" (it is reversed); "the URL
resolver runs before middleware" (middleware runs first — that is why \`SecurityMiddleware\` can redirect
to HTTPS before any URL is matched).

## 2. Why does the order of the default middleware matter? Give one concrete example.

**Strong answer.** Each one depends on something an earlier one added. \`AuthenticationMiddleware\`
sets \`request.user\` from the session, so it must come **after** \`SessionMiddleware\`.
\`CorsMiddleware\` from django-cors-headers must sit **above** \`CommonMiddleware\`, or a redirect
from \`CommonMiddleware\` goes out without CORS headers and the browser reports a CORS error that is
really a slash redirect. \`SecurityMiddleware\` goes first, so the HTTPS redirect happens before any work.

**Wrong answer.** "Order only matters for performance."

## 3. What is the difference between a project and an app, and why does INSTALLED_APPS order matter?

**Strong answer.** The project is the configuration — settings, root URLconf, WSGI/ASGI entry point.
An app is a Python package with models, migrations, admin and an \`AppConfig\`; the project lists it in
\`INSTALLED_APPS\`. Order matters where Django searches apps in turn: templates and static files with
the same path are taken from the **first** app that has them, and management commands with the same
name likewise. In the track the apps were split by domain — \`accounts\`, \`catalog\`, \`orders\` —
not by layer.

**Follow-up.** "Where do you connect signal receivers?" — in \`AppConfig.ready()\`, importing the
receivers module there; never at the top of \`models.py\` of another app, which risks importing models
before the registry is ready.

## 4. How should settings differ between development and production, and how do you load them?

**Strong answer.** Secrets and environment-specific values (\`SECRET_KEY\`, database password,
\`DEBUG\`, \`ALLOWED_HOSTS\`) come from environment variables, never from the repository. Either one
\`settings.py\` that reads the environment, or \`settings/base.py\` with \`dev.py\` and \`prod.py\`,
picked by \`DJANGO_SETTINGS_MODULE\`. Settings are read once at startup; code must never assign to
\`settings.X\` at runtime — in tests use \`override_settings\` or pytest-django's \`settings\` fixture.

**Wrong answer.** "Set \`DEBUG = os.environ.get('DEBUG')\`" — the string \`"False"\` is truthy, so
production runs with DEBUG on. Parse it: \`os.environ.get("DEBUG") == "1"\`.

## 5. What are signals, and why do experienced teams avoid them for business logic?

**Strong answer.** Signals (\`pre_save\`, \`post_save\`, \`post_delete\`, custom ones) let a receiver
run when something happens without the sender knowing about it. They run **synchronously, in the same
thread and the same transaction** as the \`save()\` that sent them. The problems: the logic is invisible
at the call site ("why did saving an order send an SMS?"), the order between receivers is not
something you should depend on, and they silently **do not fire** for \`QuerySet.update()\`,
\`bulk_create()\` and \`bulk_update()\`.

    # orders/services.py — the explicit version
    def place_order(user, cart):
        with transaction.atomic():
            order = Order.objects.create(user=user, total=cart.total)
            ...
            transaction.on_commit(lambda: send_confirmation.delay(order.id))
        return order

**Follow-up.** "So when *is* a signal right?" — decoupling from code you do not own: reacting to
\`user_logged_in\` from \`django.contrib.auth\`, or a reusable app that must not import yours.

**Wrong answers.** "Signals run asynchronously in the background" (they do not); "post_save fires on
every write" (not on \`update()\` or bulk operations).

## 6. A post_save receiver sends an email. The transaction later rolls back. What happens?

**Strong answer.** The email is already sent, for an order that no longer exists — the receiver ran
inside the transaction. Anything with a side effect outside the database (email, payment call, queue
message) belongs in \`transaction.on_commit(...)\`, which runs only if the outermost atomic block
commits and is dropped on rollback.

## 7. What is the Django admin good for, and what is it not?

**Strong answer.** An internal tool for trusted staff — content editors, support — generated from the
models, with permissions per model and action. It is not the customer-facing product, and it is not
a substitute for an API. At scale its traps are query-shaped: a \`list_display\` that touches a
foreign key runs one query per row (fix with \`list_select_related\`), and a \`ForeignKey\` to a
100,000-row table renders a 100,000-option dropdown (fix with \`raw_id_fields\` or
\`autocomplete_fields\`).

**Follow-up.** "How do you secure it?" — staff-only accounts with minimal permissions, a non-obvious
URL is a small extra, HTTPS, and ideally restricted by network or SSO in a real company.

## 8. WSGI or ASGI — which does your Django app run on, and does it matter?

**Strong answer.** The track's API runs under Gunicorn with WSGI: one request per worker at a time,
which suits a CRUD API on MySQL. ASGI (Uvicorn) lets Django serve async views and long-lived
connections, but the ORM is still mostly synchronous, so an async Django view gains little unless it
waits on many network calls. That is one reason the AI features live in a separate FastAPI service.

## 9. What does manage.py check do, and when have you used it?

**Strong answer.** Runs the system check framework: model and admin configuration errors, URL
problems, and with \`--deploy\` the security settings for production. It runs automatically before
\`runserver\` and \`migrate\`; in CI, \`check --deploy --fail-level WARNING\` with production
settings stops a deploy that has \`DEBUG = True\`.`,
    mcqs: [
      mcq('MIDDLEWARE is [Security, Session, Auth, AuditLog, Throttle], and Throttle returns a 429 without calling get_response. Which middleware sees that 429 response on its way out?', [
        ['None, because a short-circuited response skips every layer', false],
        ['AuditLog, Auth, Session and Security, in that order', true],
        ['Security, Session, Auth and AuditLog, in that order', false],
        ['Only Security, since it is the first one in the list', false],
      ], 'A middleware that returns early stops the request going further down, but the response still travels back up through every layer above it, in reverse list order.'),
      mcq('A placement portal has a post_save receiver on Application that calls an SMS API. A recruiter bulk-shortlists 300 applications with Application.objects.filter(...).update(status="SHORTLISTED"). How many SMS messages go out?', [
        ['300, one per row the update changed', false],
        ['One, because the update is a single statement', false],
        ['None, because update() sends no save signals', true],
      ], 'QuerySet.update() runs one SQL UPDATE and never calls save(), so pre_save and post_save are not sent. Relying on the signal silently loses every notification on bulk paths.'),
      mcq('Production reads DEBUG = os.environ.get("DJANGO_DEBUG", False) and the server sets DJANGO_DEBUG=0. What is DEBUG at runtime?', [
        ['The string "0", which Python treats as true', true],
        ['False, as Django parses "0" into a boolean', false],
        ['The integer 0, which Python treats as false', false],
        ['None, because the variable is read too late', false],
      ], 'Environment variables are always strings; any non-empty string, including "0" and "False", is truthy. Settings code must compare the string explicitly, e.g. == "1".'),
    ],
    checkpoint: [
      mcq('A receiver on post_save for Order emails the customer. In checkout, order.save() is followed inside the same atomic block by a payment call that raises. What does the customer experience?', [
        ['No email, as the receiver waits for the commit', false],
        ['An email for an order that was rolled back', true],
        ['An email, then a second one cancelling the order', false],
        ['No email, since the exception cancels the signal', false],
      ], 'Signals run synchronously inside the transaction, so the email is sent before the rollback. Side effects outside the database belong in transaction.on_commit, which is skipped on rollback.'),
      mcq('With the default middleware plus corsheaders.middleware.CorsMiddleware placed last, the React app calls /api/orders (no trailing slash) and gets a CORS error. What is going on?', [
        ['CORS_ALLOWED_ORIGINS ignores ports, so it rejects localhost:5173', false],
        ['CommonMiddleware redirects to the slash URL before CORS headers are added', true],
        ['The browser refuses to follow any redirect sent back by a Django API', false],
      ], 'The URL 404s, and CommonMiddleware replaces that response with a 301 to /api/orders/ on the way out, after CorsMiddleware (lower in the list) has already run; the redirect carries no CORS headers. CorsMiddleware belongs above CommonMiddleware.'),
      mcq('The admin changelist for Application shows 100 rows with list_display = ["student", "drive", "status"], where student and drive are foreign keys. The page runs 201 queries. Which single change fixes it?', [
        ['raw_id_fields = ["student", "drive"]', false],
        ['list_per_page = 20 instead of 100', false],
        ['ordering = ["student", "drive"]', false],
        ['list_select_related = ["student", "drive"]', true],
      ], 'Each displayed foreign key is fetched per row (2 x 100 + 1). list_select_related adds the JOINs to the changelist query. raw_id_fields changes the edit form widget, not the list.'),
    ],
  },

  /* ── IV_ORM ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_ORM',
    notes: `ORM questions are where interviewers separate "I used the ORM" from "I know what SQL my code
sends". Have the query count of each snippet ready — the numbers below were measured with
\`CaptureQueriesContext\` on Django 5.2.

## 1. When does a QuerySet actually hit the database?

**Strong answer.** QuerySets are **lazy**: \`filter()\`, \`exclude()\`, \`order_by()\`, \`annotate()\`
and slicing without a step only build SQL. The query runs when the QuerySet is **evaluated**:
iteration, \`list()\`, \`len()\`, \`bool()\` / \`if qs:\`, \`repr()\` in the shell, slicing with a
step, or a method that returns a value — \`get()\`, \`first()\`, \`count()\`, \`exists()\`,
\`aggregate()\`. After evaluation the results are cached on that QuerySet object.

    qs = Order.objects.filter(status="OPEN").order_by("-id")   # 0 queries
    qs[0]; qs[0]                                               # 2 queries: each index is a new LIMIT 1
    rows = list(qs); qs[0]                                     # 1 query: [0] reads the cache
    qs.count()                                                 # 0 now: count() uses the cache once it is filled

**Follow-up.** "Then why does \`qs.filter(...)\` after \`list(qs)\` hit the database again?" —
every chained method returns a **new** QuerySet with an empty cache.

**Wrong answers.** "\`filter()\` runs the query"; "\`count()\` always runs \`SELECT COUNT\`" (not if
the QuerySet is already evaluated).

## 2. What is the N+1 problem, and when do you use select_related versus prefetch_related?

**Strong answer.** One query loads N rows, then touching a relation on each row runs one more query
per row. Six orders, each reading \`order.customer.name\`, ran **7** queries.

- \`select_related("customer")\` — for **forward ForeignKey and OneToOne**: one query with a SQL JOIN.
  Six orders: **1** query.
- \`prefetch_related("orders")\` — for **many-to-many and reverse ForeignKey**: a second query with
  \`WHERE customer_id IN (...)\`, joined in Python. Three customers with their orders: **2** queries.

A JOIN on a to-many relation would duplicate the parent row per child, which is why prefetch uses a
separate query.

**Follow-up.** "You prefetched orders, then wrote \`c.orders.filter(total__gt=100)\` in the loop.
How many queries?" — the filter ignores the prefetch cache: 1 + 1 + one per customer (5 for three
customers). Use \`Prefetch("orders", queryset=Order.objects.filter(total__gt=100), to_attr="big")\`.

**How you found it.** Django Debug Toolbar, \`connection.queries\` with DEBUG on, or a test with
\`django_assert_num_queries\` that fails when someone reintroduces the loop.

## 3. What do F and Q objects do?

**Strong answer.** \`F("field")\` refers to a column's value **in the database**, so the arithmetic
happens in SQL: \`Product.objects.filter(pk=7, stock__gte=1).update(stock=F("stock") - 1)\` is one
atomic UPDATE with no read-modify-write race, and its return value (rows updated, 0 or 1) tells you
whether stock was available. \`Q\` builds conditions combined with \`|\` (OR), \`&\` (AND) and \`~\`
(NOT): \`Order.objects.filter(Q(total__gte=500) | ~Q(status="OPEN"))\`.

**Follow-up.** "After \`o.total = F('total') + 10; o.save()\`, what is \`o.total\`?" — still the
expression object (\`CombinedExpression\`), not a number, until \`o.refresh_from_db()\`.

## 4. annotate versus aggregate?

**Strong answer.** \`aggregate()\` collapses the whole QuerySet into **one dict**:
\`Order.objects.aggregate(s=Sum("total"))\` → \`{"s": 910}\`. \`annotate()\` adds a computed value
**to each row**: \`Customer.objects.annotate(n=Count("orders"))\` → each customer with \`n\`, by
GROUP BY. \`values("status").annotate(n=Count("id"))\` groups by status instead.

**Follow-up — the trap.** Two annotations over two different to-many joins multiply each other:

    Customer.objects.annotate(n_orders=Count("orders"), n_tags=Count("orders__tags"))
    # a customer with 2 orders, each with 2 tags  ->  n_orders = 4   (wrong)
    Count("orders", distinct=True)                  ->  n_orders = 2

Use \`distinct=True\` for Count, or a \`Subquery\` for Sum/Avg, which \`distinct\` cannot fix.

## 5. How do transactions work in Django? What does ATOMIC_REQUESTS do?

**Strong answer.** By default Django runs in **autocommit**: each query commits on its own.
\`with transaction.atomic():\` opens a transaction (a savepoint when nested); it commits if the block
exits normally and rolls back if an exception leaves it. \`ATOMIC_REQUESTS = True\` wraps every view
in one — simple, but it holds a transaction for the whole request, including slow external calls.

**Follow-up — the trap.** Catching a database error *inside* an atomic block and carrying on:

    with transaction.atomic():
        try:
            User.objects.create(username="asha")      # IntegrityError: duplicate
        except IntegrityError:
            pass
        User.objects.count()   # TransactionManagementError: can't execute queries until the end of the 'atomic' block

Wrap the risky statement in its **own** nested \`atomic()\` (a savepoint) and catch outside that.

## 6. How do you stop two students booking the last interview slot at the same time?

**Strong answer.** Either make the write conditional (\`update(...)\` with a filter and check the row
count), or lock the row:

    with transaction.atomic():
        slot = Slot.objects.select_for_update().get(pk=slot_id)   # SELECT ... FOR UPDATE
        if slot.booked_by_id:
            raise SlotTaken()
        slot.booked_by = student
        slot.save()

The second transaction waits at the \`SELECT ... FOR UPDATE\` until the first commits, then sees the
slot as taken. \`select_for_update\` evaluated outside an atomic block on MySQL raises
\`TransactionManagementError\` (SQLite silently ignores it, which hides the bug in local tests).
\`nowait=True\` fails fast instead of waiting; \`skip_locked=True\` suits a job queue.

**Wrong answer.** "Check \`if slot.booked_by is None\` and save" — both requests pass the check.

## 7. How do you add a column or change a table that is live with a million rows?

**Strong answer.** Think about the deploy, not only the SQL. Run \`sqlmigrate\` to see what will
execute. Additive changes go first: add the column **nullable** (or with \`db_default\`, Django 5.0+),
deploy code that writes it, **backfill in batches** in a data migration or a management command, then
a later migration makes it NOT NULL. Renames and drops follow **expand–contract**: during a rolling
deploy old code is still running against the new schema, so a renamed column breaks it — add the new
column, write both, switch reads, then drop the old one in a later release. Never edit a migration
that has already run anywhere; add a new one.

**Follow-up.** "Data migrations — what must they import?" — the historical model,
\`apps.get_model("orders", "Order")\`, never the current model class, and a reverse function (or
\`RunPython.noop\`) so the migration can be rolled back.

## 8. When would you leave the ORM and write SQL?

**Strong answer.** Rarely, and still parameterised: a reporting query with window functions the ORM
expresses badly, or a bulk operation. \`Model.objects.raw()\` or \`connection.cursor()\` with
\`%s\` placeholders — never an f-string, which is SQL injection.

## 9. What does iterator() change?

**Strong answer.** It streams rows without filling the QuerySet cache, so exporting 2 million rows does
not hold 2 million model objects in memory. It cannot be combined usefully with a second pass over the
same QuerySet, because nothing is cached.`,
    workedExample: `**The question.** "This endpoint lists a placement drive's 50 applications with the student's
name, college and skill tags. It takes 1.4 s and the database is quiet. Talk me through it."

    def drive_applications(request, drive_id):
        apps = Application.objects.filter(drive_id=drive_id)
        return JsonResponse([{
            "student": a.student.name,
            "college": a.student.college.name,
            "tags": [t.name for t in a.student.tags.all()],
        } for a in apps], safe=False)

**Step 1 — count before guessing.** Say you would wrap the call in \`CaptureQueriesContext\` or open the
Debug Toolbar. Then count on the whiteboard: 1 query for applications, then per application one for
\`student\`, one for \`college\`, one for \`tags\`: **1 + 50 x 3 = 151** queries. Each is fast; 151
round trips to MySQL are not.

**Step 2 — choose the fix per relation.**

    apps = (Application.objects
            .filter(drive_id=drive_id)
            .select_related("student__college")       # forward FKs: one JOIN query
            .prefetch_related("student__tags"))        # many-to-many: one more IN query

That is **2** queries whatever the number of applications. Explain *why* tags are prefetched: a JOIN
on a many-to-many would repeat each application row once per tag.

**Step 3 — return less.** The list needs three fields; \`only()\` or \`values()\` on large tables cuts
the row width. Add an index on \`Application(drive_id)\` if the filter scans — \`ForeignKey\` already
creates one, so check with \`EXPLAIN\` rather than assume.

**Step 4 — keep it fixed.** A pytest-django test:

    def test_drive_list_is_two_queries(client, drive_with_50_apps, django_assert_num_queries):
        with django_assert_num_queries(2):
            client.get(f"/api/drives/{drive_with_50_apps.id}/applications/")

**What earns the marks.** Counting first, naming JOIN vs IN-query and why, and the test that stops the
regression. "Add caching" as the first answer is weak — it hides 151 queries rather than removing them.`,
    mcqs: [
      mcq('qs = Slot.objects.filter(open=True); then the view checks if qs: and afterwards returns qs.count(). How many queries run?', [
        ['One, because if qs fills the cache that count() reuses', true],
        ['Two, because count() always sends a COUNT query', false],
        ['Zero, because neither line evaluates a lazy QuerySet', false],
        ['Two, because if qs runs an EXISTS query, not a SELECT', false],
      ], 'bool(qs) evaluates the QuerySet and caches every row; count() on an evaluated QuerySet returns len of the cache without a query. If only existence is needed, qs.exists() is cheaper than loading every row.'),
      mcq('Customer.objects.annotate(n_orders=Count("orders"), n_items=Count("orders__items")) gives Ravi n_orders=6, though he has 2 orders with 3 items each. What is the fix for n_orders?', [
        ['Swap the order of the two annotate arguments', false],
        ['Use aggregate() instead of annotate() for both', false],
        ['Count("orders", distinct=True)', true],
        ['Add .order_by("id") before annotate()', false],
      ], 'Both counts run over the same JOIN of orders and items, so each order is counted once per item: 2 x 3 = 6. distinct=True counts unique order ids; Sum and Avg need a Subquery instead.'),
      mcq('Inside with transaction.atomic(): a view catches IntegrityError from Coupon.objects.create(code=dup) and then calls Coupon.objects.count(). What happens on MySQL?', [
        ['count() returns, since the error was already handled', false],
        ['The block silently commits only the rows before the error', false],
        ['Django retries the create() with a fresh savepoint', false],
        ['TransactionManagementError until the atomic block ends', true],
      ], 'A database error inside atomic marks the transaction as broken; Django refuses further queries in that block. The fix is a nested atomic() around the risky create, so only its savepoint rolls back.'),
    ],
    checkpoint: [
      mcq(`How many queries does this run for 3 customers who each have 2 orders?

    for c in Customer.objects.prefetch_related("orders"):
        big = list(c.orders.filter(total__gt=100))`, [
        ['5: the customer query, the prefetch, then one per filter', true],
        ['2: the customer query and one prefetch for all orders', false],
        ['4: the customer query and one filter query per customer', false],
        ['7: one for customers and one per order that is loaded', false],
      ], 'filter() on a prefetched relation builds a new QuerySet and ignores the prefetch cache, so the prefetch is wasted and each customer runs another query. Prefetch(..., queryset=..., to_attr=...) does the filter in the prefetch.'),
      mcq('Two students call book(slot_id) together. It runs slot = Slot.objects.get(pk=slot_id); if not slot.booked_by_id: slot.booked_by = me; slot.save() inside transaction.atomic(). What is the outcome on MySQL?', [
        ['The second save raises IntegrityError, protecting the slot', false],
        ['Both can pass the check; the later save overwrites the first', true],
        ['atomic() serialises the two calls, so only one passes the check', false],
      ], 'A transaction alone does not lock rows that are only read. Both read an empty slot, both save, and the last write wins silently. select_for_update() or a conditional update() makes it safe.'),
      mcq('A migration adds resume_score = IntegerField() (NOT NULL, no default) to a 2-million-row Application table that the old code keeps writing during a rolling deploy. What is the safe plan?', [
        ['Add it NOT NULL with default=0 in one migration and deploy at once', false],
        ['Edit the initial migration so the column was always there', false],
        ['Add it nullable, backfill in batches, then a later NOT NULL step', true],
        ['Run makemigrations on the server so it matches production data', false],
      ], 'Old code does not write the new column, so a NOT NULL column without a database default breaks its inserts during the deploy. Nullable first, backfill in batches, then tighten, keeps every version working; editing applied migrations breaks other environments.'),
    ],
  },

  /* ── IV_DRF ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_DRF',
    notes: `DRF questions test whether you know what the framework does between the JSON coming in and the
model being saved — and whether you design the API for the React client that calls it.

## 1. Serializer or ModelSerializer — what is the difference, and when do you use plain Serializer?

**Strong answer.** A \`ModelSerializer\` generates fields from the model (types, \`max_length\`,
\`required\` from \`blank\`/defaults, \`read_only\` for the auto primary key), adds validators such as
\`UniqueValidator\` for \`unique=True\`, and gives default \`create()\` and \`update()\`. A plain
\`Serializer\` declares everything by hand. I use plain \`Serializer\` for input that is not a model:
a login request, a "bulk shortlist" action, or a response combining several models.

**Follow-up.** "How do you see what a ModelSerializer generated?" — \`print(repr(OrderSerializer()))\`
lists every generated field with its arguments.

**Wrong answer.** \`fields = "__all__"\` "to save time" — it exposes every new column you add later,
including ones like \`is_staff\` on a user model.

## 2. In what order does DRF validate, and what happens when one field fails?

**Strong answer.** \`is_valid()\` runs, per field: type conversion (\`to_internal_value\`) → the
field's \`validators=[...]\` → \`validate_<field>()\`. Then serializer-level \`validators\` (like
\`UniqueTogetherValidator\`), then \`validate(self, attrs)\`. **All fields** are checked so the client
gets every field error in one response, but if any field fails, \`validate()\` is **not called**.

    class SlotBooking(serializers.Serializer):
        start = serializers.DateTimeField()
        end = serializers.DateTimeField()
        def validate(self, attrs):                     # cross-field rules live here
            if attrs["end"] <= attrs["start"]:
                raise serializers.ValidationError("end must be after start")
            return attrs

**Follow-up.** "Can you read \`serializer.data\` before \`is_valid()\`?" — no; with \`data=\` passed
DRF asserts that you call \`is_valid()\` first (use \`initial_data\` for the raw input). \`save()\`
before \`is_valid()\` is also an assertion error.

## 3. What does save() do, and how do you set the owner of a new object?

**Strong answer.** \`save()\` calls \`create(validated_data)\` if the serializer has no instance and
\`update(instance, validated_data)\` if it has one. Extra keyword arguments are merged in:
\`serializer.save(owner=self.request.user)\` in \`perform_create\`. The owner field is read-only in
the serializer, so a client can never set it.

## 4. PUT and PATCH in DRF?

**Strong answer.** PUT goes to \`update()\` with \`partial=False\`: every required field must be sent.
PATCH calls it with \`partial=True\`: missing fields are left as they are. A PUT with only
\`{"total": 5}\` fails with "This field is required" for the required fields left out.

## 5. APIView, generics or ViewSet with a router — how do you choose?

**Strong answer.** \`ModelViewSet\` + \`DefaultRouter\` for standard CRUD on a resource: list, create,
retrieve, update, partial_update, destroy and the URLs, in a few lines. Extra endpoints with
\`@action(detail=True, methods=["post"])\` — e.g. \`/applications/7/shortlist/\`. Generic views
(\`ListCreateAPIView\`) when a resource only supports some operations. Plain \`APIView\` for an
endpoint that is not CRUD on one model. A viewset is no faster; it is just less code for the common
case.

**Follow-up.** "How do you use a different serializer for list and detail?" — override
\`get_serializer_class()\` and branch on \`self.action\`.

## 6. Why do you override get_queryset instead of setting queryset?

**Strong answer.** \`get_queryset()\` runs per request, so it can use \`self.request.user\` to scope the
data (\`Order.objects.filter(user=self.request.user)\`) and add \`select_related\` for the serializer's
nested fields. A list view **never** calls object permissions, so scoping the queryset is what stops a
student listing another student's applications.

## 7. How do you paginate and filter a list endpoint?

**Strong answer.** Set \`DEFAULT_PAGINATION_CLASS\` and \`PAGE_SIZE\` (without \`PAGE_SIZE\` nothing
is paginated). \`PageNumberPagination\` returns \`count\`, \`next\`, \`previous\`, \`results\` — the
\`count\` costs a \`COUNT(*)\` per request, and deep pages use a large \`OFFSET\`.
\`CursorPagination\` needs a stable, unique ordering and gives no total or page jumps, but stays fast
on huge tables and does not skip or repeat rows when new ones arrive — the right choice for a feed.
Filtering with django-filter's \`DjangoFilterBackend\` and \`filterset_fields\`, \`SearchFilter\` for
text, \`OrderingFilter\` with an explicit \`ordering_fields\` whitelist.

## 8. How would you version this API?

**Strong answer.** Version only for breaking changes; additive fields need no version. DRF has
\`URLPathVersioning\` (\`/api/v1/...\`), \`AcceptHeaderVersioning\` and others; the view reads
\`request.version\` and picks a serializer. URL versioning is the easiest to see in logs and to route.
Run v1 and v2 side by side and give clients a deprecation date.

## 9. How do you return a useful error shape?

**Strong answer.** DRF already turns \`ValidationError\` into 400 with a field-to-messages dict. For
consistency across the API, a custom \`EXCEPTION_HANDLER\` wraps every error as, for example,
\`{"error": {"code": ..., "message": ..., "fields": {...}}}\`, so the React client has one parser.

## 10. Nested writes — how do you create an order with its items in one POST?

**Strong answer.** DRF does not write nested serializers by default; override \`create()\`, pop the
items, create the parent and children inside \`transaction.atomic()\`, and \`bulk_create\` the items.
Validate the item list in the nested serializer so the 400 points at the bad line.`,
    mcqs: [
      mcq('A serializer has qty with validators=[positive], validate_qty() and validate(). A POST sends {"qty": "x"}. Which of them run?', [
        ['positive and validate_qty, then validation stops', false],
        ['None of them: the type conversion fails first', true],
        ['validate() only, since cross-field checks run first', false],
        ['All three, so every message can be returned', false],
      ], 'Type conversion runs before a field\'s validators and validate_<field>; "x" is not a valid integer, so the field fails there, and validate() is skipped because a field has an error.'),
      mcq('An OrderSerializer (ModelSerializer) is used in a ModelViewSet. A client PUTs {"total": 5} to /orders/9/, while customer is a required field. What comes back?', [
        ['200, with only total changed and customer left as it was', false],
        ['200, with customer set to null because it was not sent', false],
        ['400, saying customer is required', true],
        ['405, as a viewset maps PUT to partial_update only', false],
      ], 'PUT calls update with partial=False, so required fields left out fail validation. PATCH (partial_update) sets partial=True and leaves unsent fields untouched.'),
      mcq('A feed of job postings is read by thousands of students while recruiters add postings every minute. Which pagination fits best?', [
        ['PageNumberPagination with a page size of 20', false],
        ['LimitOffsetPagination with a limit of 20', false],
        ['No pagination, since the client filters by date', false],
        ['CursorPagination ordered by a unique created key', true],
      ], 'Offset-based pages shift when new rows arrive, so students see repeats or miss postings, and deep offsets get slow. A cursor on a stable, unique ordering stays consistent and fast.'),
    ],
    checkpoint: [
      mcq(`A student calls GET /api/applications/ and sees every student's applications. What is the fix?

    class ApplicationViewSet(viewsets.ModelViewSet):
        queryset = Application.objects.all()
        serializer_class = ApplicationSerializer
        permission_classes = [IsAuthenticated, IsOwner]   # IsOwner checks obj.student == request.user`, [
        ['Add IsOwner to DEFAULT_PERMISSION_CLASSES as well', false],
        ['Make IsOwner.has_permission return False for the list', false],
        ['Filter by request.user in get_queryset()', true],
      ], 'has_object_permission is only called from get_object(), which list never uses. Scoping get_queryset to the user makes the list, and every detail lookup, see only the caller\'s rows.'),
      mcq('serializer = SlotSerializer(data=request.data); then the code logs serializer.data before calling is_valid(). What happens?', [
        ['It logs the raw input as sent by the client', false],
        ['An AssertionError tells you to call is_valid() first', true],
        ['It logs an empty dict until validation has run', false],
        ['It logs the validated data with defaults filled in', false],
      ], 'With data= passed, DRF refuses to build .data before is_valid() and raises an AssertionError; .initial_data holds the raw input if you need to log it.'),
      mcq('In a ModelViewSet, the list must show a short serializer and retrieve a detailed one. Where does that choice belong?', [
        ['get_serializer_class(), branching on self.action', true],
        ['Two routers registered with one prefix and basename', false],
        ['get_queryset(), returning different fields', false],
      ], 'get_serializer_class runs per request and self.action names the viewset action (list, retrieve, ...). get_queryset controls which rows, not their representation.'),
    ],
  },

  /* ── IV_AUTH_SECURITY ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_AUTH_SECURITY',
    notes: `Security questions check two things: that you know where authentication and permissions run in
a DRF request, and that you can name the attack each setting defends against.

## 1. Sessions or JWT — which did you use and why?

**Strong answer.** Sessions: the server stores the session, the browser holds an opaque cookie,
logout deletes the server-side session — revocation is instant, but every request reads the session
store and the cookie brings CSRF into play. JWT: the token itself carries the user id and expiry,
signed with the server's key; any instance verifies it without a lookup, which suits a React SPA and a
separate FastAPI service that both need to know the user. The price is revocation: a signed token is
valid until it expires. The track used Simple JWT with a short-lived access token and a refresh token.

**Wrong answers.** "JWT is more secure" (it is a trade-off, not an upgrade); "the JWT is encrypted"
(it is base64url-encoded and signed — anyone can read the payload).

## 2. How do Simple JWT's access and refresh tokens work, and what do rotation and blacklisting add?

**Strong answer.** The client logs in at \`/api/token/\` and gets an access token (default lifetime
**5 minutes**) and a refresh token (default **1 day**). It sends \`Authorization: Bearer <access>\`
on each request; when access expires it posts the refresh token to \`/api/token/refresh/\`.
\`ROTATE_REFRESH_TOKENS = True\` returns a **new** refresh token on each refresh;
\`BLACKLIST_AFTER_ROTATION = True\` records the old one so it cannot be reused — that needs
\`rest_framework_simplejwt.token_blacklist\` in \`INSTALLED_APPS\` and \`migrate\`. Both are \`False\`
by default.

**Follow-up.** "A user's laptop is stolen. How do you log them out?" — blacklist their outstanding
refresh tokens (\`OutstandingToken\` → \`BlacklistedToken\`), and accept that the current access token
works until it expires — which is why it is short. For instant cut-off, a per-user token version
claim checked on each request.

## 3. Where should the React app keep the tokens?

**Strong answer.** \`localStorage\` is readable by any script on the page, so one XSS leaks the
token. A safer pattern: access token in memory, refresh token in an \`HttpOnly\`, \`Secure\`,
\`SameSite\` cookie scoped to the refresh path — and then that endpoint needs CSRF thinking, because
the browser sends the cookie automatically. Whatever the storage, XSS is fixed by not rendering
untrusted HTML.

## 4. How do DRF permissions work? has_permission versus has_object_permission?

**Strong answer.** After authentication, \`check_permissions\` calls each class's
\`has_permission(request, view)\` — all must allow. \`has_object_permission(request, view, obj)\` runs
only when the view calls \`get_object()\` — retrieve, update, destroy. **List and create never call
it.** So "users see only their own orders" is \`get_queryset()\` filtering by
\`request.user\`; the object permission guards edits on detail routes.

    class IsOwnerOrReadOnly(BasePermission):
        def has_object_permission(self, request, view, obj):
            return request.method in SAFE_METHODS or obj.owner_id == request.user.id

**Follow-up.** "Another user requests /orders/42/, which is not theirs. 403 or 404?" — with
\`get_queryset\` scoped, \`get_object\` raises **404**: you do not confirm the order exists.

## 5. An unauthenticated request gets 403 instead of 401. Why?

**Strong answer.** DRF returns 401 only if the first authentication class provides a
\`WWW-Authenticate\` header. \`JWTAuthentication\` does (\`Bearer\`), so a missing token gives 401.
With \`SessionAuthentication\` first it does not, so the same request gets 403.

## 6. When does CSRF matter in a DRF API?

**Strong answer.** CSRF exists because the browser attaches **cookies** automatically to a forged
request from another site. DRF's views are exempt from Django's CSRF middleware, but
\`SessionAuthentication\` enforces CSRF itself for authenticated requests. A request authenticated
only by an \`Authorization: Bearer\` header cannot be forged that way, because another site cannot make
the browser add that header. So a JWT-in-header API needs no CSRF token; a cookie-authenticated one
does.

## 7. What is CORS, and what does it not protect?

**Strong answer.** A browser rule: a page from \`https://app.example.in\` may read responses from
\`https://api.example.in\` only if the API says so in \`Access-Control-Allow-Origin\`. The API sets it
with django-cors-headers (\`CORS_ALLOWED_ORIGINS\`, exact scheme, host and port), with
\`CorsMiddleware\` high in \`MIDDLEWARE\`. It protects **users' browsers**, not the API: curl and
Postman ignore CORS entirely, so it is never a substitute for authentication.

**Wrong answer.** \`CORS_ALLOW_ALL_ORIGINS = True\` "to fix the error" in production.

## 8. What do you check before deploying Django?

**Strong answer.** \`python manage.py check --deploy\` with production settings. It flags, among
others: \`DEBUG\` True (W018), empty \`ALLOWED_HOSTS\` (W020), a weak or \`django-insecure-\`
\`SECRET_KEY\` (W009), no \`SECURE_SSL_REDIRECT\` (W008), no \`SECURE_HSTS_SECONDS\` (W004), and
cookies without \`SESSION_COOKIE_SECURE\` / \`CSRF_COOKIE_SECURE\` (W012, W016). Behind a proxy that
terminates TLS, also \`SECURE_PROXY_SSL_HEADER\`, or the SSL redirect loops.

## 9. How are passwords stored?

**Strong answer.** Django hashes with PBKDF2-SHA256 by default (Argon2 or bcrypt optional), with a
random salt per password and many iterations, and upgrades the hash on the next login when the
iteration count rises. Never store or log the password; serializers mark it \`write_only\` and call
\`set_password()\` / \`create_user()\`.

## 10. What stops someone brute-forcing the login endpoint?

**Strong answer.** DRF throttling (\`ScopedRateThrottle\` with a \`login\` scope), backed by a
**shared** cache like Redis — a per-process \`LocMemCache\` lets each Gunicorn worker count separately.
Plus generic error messages that do not reveal whether the email exists.`,
    workedExample: `**The question.** "A student says another student can change the status of her application.
Here is the code. Find the bug, fix it, and tell me how you'd prove it's fixed."

    class ApplicationViewSet(viewsets.ModelViewSet):
        queryset = Application.objects.all()
        serializer_class = ApplicationSerializer      # fields include "student" and "status"
        permission_classes = [IsAuthenticated]

**Step 1 — trace a malicious request.** Meena is logged in. \`PATCH /api/applications/31/\` with
\`{"status": "WITHDRAWN"}\`: \`IsAuthenticated\` passes, \`get_object()\` finds application 31 in
\`Application.objects.all()\`, no object permission runs, the serializer accepts \`status\`. Saved.
Worse, \`GET /api/applications/\` lists every student's applications.

**Step 2 — fix in three layers.**

    class ApplicationViewSet(viewsets.ModelViewSet):
        serializer_class = ApplicationSerializer
        permission_classes = [IsAuthenticated, IsOwner]

        def get_queryset(self):                                   # 1. scope the data
            return Application.objects.filter(student=self.request.user)

        def perform_create(self, serializer):                      # 2. server sets the owner
            serializer.save(student=self.request.user)

    class ApplicationSerializer(serializers.ModelSerializer):
        class Meta:
            model = Application
            fields = ["id", "drive", "student", "status"]
            read_only_fields = ["student", "status"]               # 3. students cannot set status

The status change becomes a recruiter-only \`@action\` with its own permission class.

**Step 3 — say why each layer is needed.** \`get_queryset\` covers list and makes other people's rows
404 on detail routes; \`IsOwner\` documents intent and protects any view that forgets to scope;
\`read_only_fields\` stops a student promoting herself to \`SELECTED\` on her own application.

**Step 4 — prove it.** Two tests with two users: Meena's PATCH to Asha's application returns 404 and
the row is unchanged; Asha's PATCH of \`status\` on her own application leaves \`status\` unchanged.
A test that only checks the happy path would have passed the broken code.`,
    mcqs: [
      mcq('A DRF project uses only SessionAuthentication. An anonymous client calls an IsAuthenticated endpoint. Which status does it get?', [
        ['401, because no credentials were sent with the request', false],
        ['403, as this class sends no WWW-Authenticate header', true],
        ['302, a redirect to the admin login page', false],
        ['400, because the CSRF token is missing', false],
      ], 'DRF uses 401 only when the first authentication class supplies a WWW-Authenticate header; SessionAuthentication does not, so the failure is reported as 403. JWTAuthentication first would give 401.'),
      mcq('Simple JWT is installed with default settings. A client refreshes twice with the same refresh token. What happens on the second call?', [
        ['It fails, because a refresh token is single-use', false],
        ['It fails, because the first call blacklisted it', false],
        ['It succeeds and also returns a new refresh token', false],
        ['It succeeds, returning only a new access token', true],
      ], 'ROTATE_REFRESH_TOKENS and BLACKLIST_AFTER_ROTATION are both False by default, so the same refresh token keeps working until its 1-day expiry and only an access token comes back.'),
      mcq('A recruiter dashboard on https://hire.example.in calls https://api.example.in with a Bearer token in the Authorization header, never cookies. Does the API need CSRF protection on these calls?', [
        ['Yes, every POST in Django must carry a CSRF token', false],
        ['Yes, because the two sites share a parent domain', false],
        ['No, as a forged page cannot add that header', true],
      ], 'CSRF relies on the browser attaching credentials automatically. A cross-site form or script cannot make the browser send your Authorization header, so header-only token auth is not exposed to CSRF.'),
    ],
    checkpoint: [
      mcq('ApplicationViewSet scopes get_queryset to request.user. Meena requests GET /api/applications/31/, which belongs to Asha. What does she get, and why is that good?', [
        ['403, telling her the application exists but is not hers', false],
        ['404, revealing nothing about whether it exists', true],
        ['200 with an empty body, as the serializer hides fields', false],
        ['401, because her token does not cover that object', false],
      ], 'get_object() looks the id up in the scoped queryset, does not find it and raises 404. Not confirming that another user\'s record exists is the safer answer.'),
      mcq('Production sets CORS_ALLOWED_ORIGINS = ["https://app.example.in"]. An attacker scripts requests to the API with curl and a stolen token. What does the CORS setting do?', [
        ['Rejects them, as curl sends no matching Origin header', false],
        ['Rejects them after the first preflight request fails', false],
        ['Nothing, since only browsers enforce CORS', true],
        ['Rejects them unless the token is in a cookie', false],
      ], 'CORS is a browser policy about which pages may read responses. Non-browser clients ignore it, so authentication and permissions are what protect the API.'),
      mcq('The team adds rest_framework_simplejwt.token_blacklist to INSTALLED_APPS, turns on rotation and blacklisting, and deploys. Every login now returns 500 with "table does not exist". What was missed?', [
        ['Running migrate for the token_blacklist app', true],
        ['A Redis cache to hold the revoked tokens', false],
        ['A longer ACCESS_TOKEN_LIFETIME for rotation', false],
        ['A SIGNING_KEY separate from the SECRET_KEY', false],
      ], 'With the app installed, issuing a refresh token records it as an OutstandingToken row, so login itself writes to the tables of that app; until its migrations run there is nowhere to write and every login fails.'),
    ],
  },

  /* ── IV_FASTAPI ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_FASTAPI',
    notes: `FastAPI questions usually start with "why did you use two frameworks?". Have that answer ready,
then show you know what FastAPI does with a request that Django does not.

## 1. Why does your project use both Django and FastAPI?

**Strong answer.** Different jobs. Django + DRF owns the **business data**: users, drives,
applications, the admin, migrations, permissions — synchronous CRUD on MySQL, where Django's batteries
save weeks. The AI features — resume feedback, the interview-practice agent — call an LLM, stream
tokens back over SSE and hold connections open for 10–60 seconds. That is I/O-bound waiting, which
async FastAPI under Uvicorn handles on one event loop, whereas a Gunicorn sync worker would be blocked
for the whole call. A separate service also scales and deploys on its own, and an LLM outage cannot
take down login. The two share the user through the same JWT signing key.

**Follow-up.** "When would you build everything in FastAPI?" — a small API with no admin and little
relational modelling, or a team already on SQLAlchemy. "Everything in Django?" — few AI calls,
short ones, behind a queue.

**Wrong answer.** "FastAPI is faster, so it is better." It is faster at waiting on I/O; for CRUD the
database dominates.

## 2. How does FastAPI validate a request, and what is a 422?

**Strong answer.** The type hints on the endpoint and the Pydantic models *are* the validation. The
body, path and query parameters are parsed and validated before the function runs; on failure FastAPI
returns **422 Unprocessable Entity** with a \`detail\` list — one entry per error with \`type\`,
\`loc\` (e.g. \`["body", "qty"]\`), \`msg\` and \`input\` — and the function never runs.

    class Feedback(BaseModel):
        resume_id: int
        role: str = Field(min_length=2)

Pydantic v2 is lax by default: \`"5"\` becomes \`5\` and \`5.0\` is accepted for an \`int\`, but
\`5.5\` and \`"five"\` are 422s. Unknown fields are ignored unless the model forbids extras.

**Follow-up.** "How do you hide fields from the response?" — \`response_model=FeedbackOut\`: FastAPI
validates the return value and drops anything not in the model, so returning a dict with an internal
\`prompt\` key does not leak it.

## 3. async def or def for an endpoint?

**Strong answer.** \`async def\` endpoints run **on the event loop**; plain \`def\` endpoints run in a
**threadpool**. So: \`async def\` when everything inside is awaited (\`httpx.AsyncClient\`, the
\`openai\` async client). \`def\` when the code calls blocking libraries (PyMySQL, \`requests\`,
\`time.sleep\`). The mistake is a blocking call inside \`async def\`: it freezes the loop for every
request. Measured: five concurrent requests to an \`async def\` that calls \`time.sleep(1)\` took
**5 s**; with \`await asyncio.sleep(1)\` **1 s**; a plain \`def\` with \`time.sleep(1)\` about **1 s**.

**Follow-up.** "You must call a blocking SDK from an async endpoint?" —
\`await run_in_threadpool(fn, ...)\` (or \`asyncio.to_thread\`), or make the endpoint \`def\`.

## 4. What does Depends do?

**Strong answer.** Dependency injection per request: a function (or class) whose result is passed in —
the current user from the JWT, a database session, settings, an LLM client. Dependencies can depend
on others, and within one request a dependency used twice is **called once** and cached. A dependency
with \`yield\` runs its cleanup after the response — closing the session.

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def current_user(token: str = Depends(oauth2_scheme)) -> User: ...

    @app.post("/feedback")
    async def feedback(body: Feedback, user: User = Depends(current_user)): ...

## 5. How do you test a FastAPI service?

**Strong answer.** \`TestClient(app)\` (or \`httpx.AsyncClient\` with \`ASGITransport\` for async
tests), and \`app.dependency_overrides[get_llm] = lambda: FakeLLM()\` to replace the real LLM or the
real user lookup — no network, no API key, deterministic answers. Clear the overrides after each test.
Assert on 422 bodies for bad input and on the streamed chunks for SSE.

## 6. How do you stream an LLM answer to the browser?

**Strong answer.** \`StreamingResponse\` over an async generator with
\`media_type="text/event-stream"\`, yielding \`data: ...\n\n\` lines as tokens arrive from the
provider's streaming API. Set a timeout on the upstream call, handle the client disconnecting, and
make sure no proxy buffers the response (Nginx \`proxy_buffering off\` for that path).

## 7. How do errors work?

**Strong answer.** \`raise HTTPException(status_code=404, detail="Resume 7 not found")\` returns
\`{"detail": "Resume 7 not found"}\`. For your own exception types, \`@app.exception_handler(LLMTimeout)\`
maps them to 503 with a consistent body. Unhandled exceptions are 500s — and a provider's rate limit
should become 429 or 503 to your client, not a 500.

## 8. How does the FastAPI service know who the user is?

**Strong answer.** It verifies the same JWT the Django API issued — same algorithm and key (or the
public key with RS256) — in a \`current_user\` dependency, reads the user id claim, and rejects expired
tokens with 401. It does not call Django on every request; that would couple the services again.`,
    mcqs: [
      mcq('A FastAPI model has qty: int. Which request body is accepted under Pydantic v2 default (lax) mode?', [
        ['{"qty": 5.5}', false],
        ['{"qty": "five"}', false],
        ['{"qty": "5"}', true],
        ['{"qty": null}', false],
      ], 'Lax mode converts a numeric string like "5" (and an integral float like 5.0) to an int. 5.5 would lose data, "five" cannot be parsed, and null is not an int, so those are 422.'),
      mcq('An endpoint declares user=Depends(current_user) and db=Depends(get_db), and current_user itself also depends on get_db. How many times does get_db run per request?', [
        ['Twice, once for each place it is declared', false],
        ['Once; FastAPI caches a dependency per request', true],
        ['Once per worker process, then it is reused', false],
      ], 'Within one request FastAPI resolves each dependency once and reuses the value (use_cache=True by default). A yield dependency\'s cleanup then runs once after the response.'),
      mcq('In tests, the resume-feedback endpoint must not call the real LLM. What is the idiomatic way?', [
        ['Set the API key to an empty string in the test settings', false],
        ['Monkeypatch the endpoint function after app startup', false],
        ['Run the tests with the network disabled for the process', false],
        ['Override the get_llm dependency with a fake client', true],
      ], 'app.dependency_overrides[get_llm] = lambda: FakeLLM() swaps the dependency for every endpoint that uses it, giving fast, deterministic tests; an empty key only turns the call into an error.'),
    ],
    checkpoint: [
      mcq(`Five users call this endpoint at the same moment on one Uvicorn worker. About how long does the last one wait?

    @app.get("/summary")
    async def summary(id: int):
        text = requests.get(f"{DJANGO}/api/resumes/{id}/").text   # takes ~1 s
        return {"chars": len(text)}`, [
        ['About 1 second, as each request has its own thread', false],
        ['About 5 seconds, as the blocking call holds the loop', true],
        ['About 1 second, since requests is non-blocking under async', false],
        ['They fail with 422, because the call is not awaited', false],
      ], 'requests is blocking; inside async def it runs on the event loop and stops every other request until it returns, so they run one after another. httpx.AsyncClient with await, or a plain def endpoint, fixes it.'),
      mcq('POST /feedback sends {"resume_id": 7} but the model also requires role: str. What does FastAPI return, and does the function body run?', [
        ['400 with "role is required"; the body does not run', false],
        ['422 with a detail entry at ["body", "role"]; no body run', true],
        ['200, with role set to None, and the body runs', false],
      ], 'Validation happens before the endpoint is called. A missing required field produces a 422 whose detail lists the error type "missing" with loc ["body", "role"].'),
      mcq('The endpoint has response_model=FeedbackOut (fields: score, tips) and returns a dict that also holds the internal key "prompt". What does the client receive?', [
        ['A 500, because the dict has a key the model lacks', false],
        ['score, tips and prompt, as a dict is returned as is', false],
        ['score and tips only; prompt is filtered out', true],
        ['A 422, because the response failed validation', false],
      ], 'FastAPI validates the return value against response_model and serialises only its fields, so extra keys are dropped. That is how internal data is kept out of responses.'),
    ],
  },

  /* ── IV_ARCHITECTURE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_IV_ARCHITECTURE',
    notes: `The last part of a backend round leaves the framework: how you run it, where the slow work goes,
and what you would change when the load grows. There is no single right design; the interviewer
scores whether your reasons match the numbers.

## 1. How does your Django app run in production?

**Strong answer.** Nginx (or the platform's load balancer) terminates TLS and serves static files (or
WhiteNoise does), and forwards to **Gunicorn**, which runs several **worker processes**, each running
Django under WSGI. Gunicorn's defaults are one sync worker and a 30-second timeout; the usual starting
point is \`(2 x CPU cores) + 1\` workers. A sync worker serves one request at a time, so with 5 workers
the sixth simultaneous slow request waits.

**Follow-up.** "What happens when a request takes 45 seconds?" — Gunicorn's master kills the worker
at the 30 s \`--timeout\` (\`WORKER TIMEOUT\` in the log) and the client gets a 502 from Nginx. The
answer is not a bigger timeout but moving the slow work out of the request.

## 2. Where does slow work go?

**Strong answer.** Into a **background job queue**: Celery or RQ with Redis as the broker. The view
saves the request, enqueues a task with the **id** (not the model object), returns 202 or the
created row, and the worker does the work — PDF generation, sending 500 emails, re-scoring resumes.
Enqueue inside \`transaction.on_commit\`, or the worker may look for a row that is not committed yet.
Tasks must be **idempotent** because they are retried.

## 3. Why is the AI feature a separate service?

**Strong answer.** An LLM call takes seconds to a minute and is mostly waiting. Inside a Gunicorn sync
worker it would block that worker the whole time, and a few concurrent users would exhaust them and
hit the 30 s timeout. The FastAPI service under Uvicorn waits asynchronously, streams tokens over SSE,
has its own timeouts, retries and rate limits towards the provider, and is scaled and deployed alone.
If the provider is down, the Django side still serves logins and applications.

## 4. What do you cache, and where?

**Strong answer.** Read-heavy, slow-changing data: the list of open placement drives, a company's
profile, computed dashboards. Django's cache framework with **Redis** (\`RedisCache\` is built in since
Django 4.0) shared by all workers and servers; \`cache.get_or_set(key, fn, timeout)\` for computed
values, invalidated on write or kept short. \`LocMemCache\` is per process — with 4 workers there are
4 different caches, so invalidation and rate limits silently misbehave. Do not cache per-user,
permission-dependent responses under a shared key.

**Follow-up.** "Cache or fix the query?" — fix the query first (N+1, missing index); cache what is
still expensive after that.

## 5. How do you test this system?

**Strong answer.** A pyramid: many pytest unit tests for services and serializers; pytest-django API
tests with \`APIClient\` against a real MySQL in CI (SQLite hides \`select_for_update\` and collation
differences); query-count tests on list endpoints; FastAPI tests with \`dependency_overrides\` and a
fake LLM; a few end-to-end tests of the critical path (login → apply → see status) against the
deployed stack.

## 6. What breaks first at ten times the users?

**Strong answer.** Go layer by layer with numbers:

- **Database connections.** 4 servers x 9 workers, each with a connection — plus Celery workers —
  approaches MySQL's default \`max_connections\` of 151. \`CONN_MAX_AGE\` reuses connections; a pooler
  or fewer, async workers helps.
- **Queries that were fine at 1x.** An N+1 of 50 becomes thousands; a full scan on 2 million rows
  appears in the slow query log. Indexes and \`EXPLAIN\`.
- **Per-process state.** \`LocMemCache\`, in-memory rate limits, uploads saved to the local disk —
  wrong as soon as there are two servers. Redis, and media on object storage (S3).
- **Scheduled jobs** running once *per server* instead of once.
- **The LLM provider's rate limits and cost** — queue, cap per user, cache identical prompts.

**Wrong answer.** "Add more servers" — more Django servers make the database bottleneck worse.

## 7. How do you know something is wrong in production?

**Strong answer.** Structured logs with a request id passed from Nginx through Django to the FastAPI
service; error tracking (Sentry); metrics on p95 latency, error rate, queue length and DB connections;
a health endpoint that checks the database. Alerts on symptoms users feel — latency and errors — not on
CPU alone.

## 8. Monolith or microservices?

**Strong answer.** A modular Django monolith (apps by domain, services modules, no cross-app imports of
internals) plus **one** separate service where the runtime needs differ — the AI service. Splitting
more creates network calls, distributed transactions and deploy coordination a small team cannot
afford. Split when a part has a different scaling, failure or ownership profile, and say which one.`,
    mcqs: [
      mcq('Gunicorn runs 5 sync workers with the default timeout. Six users each trigger a resume-scoring view that takes 40 seconds. What happens?', [
        ['All six finish in about 40 s, as Gunicorn spawns a sixth worker', false],
        ['Workers are killed at 30 s, so the users see 502 errors', true],
        ['The sixth request runs on a thread inside the first worker', false],
        ['Each request finishes, but takes 240 s in total', false],
      ], 'Gunicorn defaults to a 30-second timeout and does not add workers on demand; sync workers serve one request each, and any request over 30 s gets its worker killed. Slow work belongs in a background job.'),
      mcq('A view creates an Interview row and calls send_invite.delay(interview.id) inside transaction.atomic(). Sometimes the Celery task fails with DoesNotExist. Why, and what fixes it?', [
        ['The worker ran before the commit; enqueue in on_commit', true],
        ['Celery cannot serialise ids; pass the model object', false],
        ['The worker uses another database; set ATOMIC_REQUESTS', false],
      ], 'The task can start before the transaction commits, so the worker\'s query cannot see the row. transaction.on_commit(lambda: send_invite.delay(id)) enqueues only after the commit.'),
      mcq('A login throttle of 5 per minute uses DRF throttling with the default LocMemCache, and production runs 4 Gunicorn workers on 2 servers. Roughly how many attempts per minute can one attacker make?', [
        ['5, as the throttle is enforced per user account', false],
        ['10, as each server keeps one shared count', false],
        ['Unlimited, since LocMemCache ignores throttle keys', false],
        ['Up to about 40, because each process counts alone', true],
      ], 'LocMemCache lives inside each process, so each of the 8 worker processes keeps its own count of 5. A shared cache such as Redis makes the limit apply across all of them.'),
    ],
    checkpoint: [
      mcq('After a 10x growth in users, the API starts failing with MySQL "Too many connections". There are 6 servers x 9 Gunicorn workers plus 60 Celery workers. What is the first thing to reason about?', [
        ['Total connections against max_connections (151 by default)', true],
        ['The size of the InnoDB buffer pool relative to RAM', false],
        ['Whether the tables use utf8mb4 rather than utf8mb3', false],
        ['The number of indexes on the busiest table', false],
      ], 'Each worker process holds its own connection: 54 web plus 60 Celery is already near 151 before admin and cron connections. The fix is in connection management (pooling, fewer processes), not in indexes or storage.'),
      mcq('The open-drives list is cached with cache_page(600) using Redis. A recruiter closes a drive, and students keep seeing it as open. What is the right fix?', [
        ['Switch to LocMemCache so each worker refreshes on its own', false],
        ['Delete or update the cached key when a drive changes', true],
        ['Remove caching and add another Gunicorn worker instead', false],
      ], 'A cache with a long timeout serves stale data until it expires. Invalidating the key on write (or a short timeout) keeps it correct; per-process caches make staleness worse, not better.'),
      mcq('The team moves uploads, sessions and the cache off the single server to scale out to three servers behind a load balancer. Which piece of per-server state still breaks?', [
        ['Static files built by collectstatic into every image', false],
        ['JWT verification, which needs the issuing server', false],
        ['Database migrations run once in the deploy pipeline', false],
        ['A cron job in each server\'s crontab, now run 3 times', true],
      ], 'Scheduled jobs defined per machine run once per server, so a daily email goes out three times. Static files are identical in every image, and JWTs verify on any server with the key.'),
    ],
  },

  /* ── RAPID_FIRE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_RAPID_FIRE',
    notes: `A screening call: thirty questions, one line each, about ten seconds per answer. Say the line,
stop, and let them ask for more. Hesitating on these costs more than a slightly imperfect answer.

**Django**

1. *Middleware order on the response?* — Reversed: last in the list sees it first.
2. *Where do you register signal receivers?* — In \`AppConfig.ready()\`.
3. *Does \`update()\` fire post_save?* — No; nor do \`bulk_create\` and \`bulk_update\`.
4. *Signals sync or async?* — Synchronous, same thread, same transaction.
5. *Side effect after commit?* — \`transaction.on_commit\`.
6. *Admin list doing one query per row?* — \`list_select_related\`.
7. *Huge FK dropdown in the admin?* — \`raw_id_fields\` or \`autocomplete_fields\`.
8. *Is a QuerySet evaluated by \`filter()\`?* — No; by iteration, \`len\`, \`bool\`, \`list\` and the like.

**ORM**

9. *Forward FK in a loop?* — \`select_related\`, one JOIN.
10. *Many-to-many or reverse FK in a loop?* — \`prefetch_related\`, one extra IN query.
11. *Race-free decrement?* — \`update(stock=F("stock") - 1)\` with a filter.
12. *OR in a filter?* — \`Q(a) | Q(b)\`.
13. *One total for the table?* — \`aggregate()\`, which returns a dict.
14. *A value per row?* — \`annotate()\`.
15. *Two Counts over two joins look doubled?* — \`distinct=True\`.
16. *Lock a row?* — \`select_for_update()\` inside \`atomic()\`.
17. *Model in a data migration?* — \`apps.get_model(...)\`, the historical model.
18. *See a migration's SQL?* — \`sqlmigrate app 0007\`.

**DRF**

19. *Order of validation?* — Field conversion, field validators, \`validate_<field>\`, then \`validate()\`.
20. *PUT vs PATCH in DRF?* — \`partial=False\` vs \`partial=True\`.
21. *Who calls \`has_object_permission\`?* — \`get_object()\`; never list.
22. *Scope data to the user?* — \`get_queryset()\`.
23. *Set the owner?* — \`serializer.save(owner=request.user)\` in \`perform_create\`.
24. *Feed pagination?* — \`CursorPagination\`.

**Auth and FastAPI**

25. *Simple JWT default access lifetime?* — 5 minutes; refresh 1 day.
26. *Blacklisting needs?* — \`token_blacklist\` in INSTALLED_APPS and its migrations.
27. *Header-only JWT and CSRF?* — Not needed; nothing is sent automatically.
28. *FastAPI validation failure?* — 422 with a \`detail\` list.
29. *Blocking call in \`async def\`?* — Freezes the event loop; use \`def\` or a threadpool.
30. *Replace a dependency in tests?* — \`app.dependency_overrides\`.
31. *Gunicorn default timeout?* — 30 seconds.
32. *Pre-deploy check?* — \`manage.py check --deploy\`.`,
    mcqs: [
      mcq('Screening question: which call sends no query when run on its own line?', [
        ['Order.objects.filter(status="OPEN").exists()', false],
        ['Order.objects.filter(status="OPEN")[:10]', true],
        ['Order.objects.filter(status="OPEN").count()', false],
        ['Order.objects.filter(status="OPEN").first()', false],
      ], 'Slicing without a step adds LIMIT to the lazy QuerySet and returns another unevaluated QuerySet. exists(), count() and first() each run their query immediately.'),
      mcq('Quick one: you need each placement drive with how many applications it has. Which call?', [
        ['Drive.objects.aggregate(n=Count("applications"))', false],
        ['Drive.objects.prefetch_related("applications")', false],
        ['Drive.objects.annotate(n=Count("applications"))', true],
      ], 'annotate adds a GROUP BY count to every drive row; aggregate collapses all drives into one dict, and prefetch loads every application into memory just to count them.'),
      mcq('Rapid fire: in DRF, which method runs for GET /api/applications/7/ but never for GET /api/applications/?', [
        ['has_permission', false],
        ['get_queryset', false],
        ['get_serializer_class', false],
        ['has_object_permission', true],
      ], 'Retrieve calls get_object(), which calls check_object_permissions; list runs has_permission and get_queryset but never examines individual objects.'),
      mcq('One line: with default Simple JWT settings, how long is a fresh access token valid?', [
        ['5 minutes', true],
        ['15 minutes', false],
        ['1 hour', false],
        ['1 day', false],
      ], 'ACCESS_TOKEN_LIFETIME defaults to timedelta(minutes=5) and REFRESH_TOKEN_LIFETIME to timedelta(days=1); most projects set their own values explicitly.'),
      mcq('Fast: FastAPI receives a query parameter limit=500 for limit: int = Query(10, le=100). What status comes back?', [
        ['200, with limit clamped to 100', false],
        ['400 Bad Request', false],
        ['422 Unprocessable Entity', true],
        ['500, because the constraint raised', false],
      ], 'Query constraints are validated like body fields; a value above le=100 fails validation and FastAPI answers 422 without calling the endpoint. Nothing is silently clamped.'),
      mcq('Screening question: with no --timeout flag, after how many seconds does Gunicorn kill a silent worker?', [
        ['60', false],
        ['120', false],
        ['10', false],
        ['30', true],
      ], 'Gunicorn\'s --timeout defaults to 30 seconds; a sync worker busy on one request longer than that is killed and restarted, and the proxy reports a 502 to the client.'),
    ],
  },

  /* ── MOCK ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_MOCK',
    notes: `**Format.** A 35-minute technical round two with a backend engineer, on Django, DRF and the FastAPI
service. Do it with a friend reading this script, or record yourself answering aloud. The interviewer
scores each answer strong, OK or weak, using the signals below.

## Opening (3 minutes)

"Tell me about the backend of your capstone — just the shape."

- **Strong:** 60 seconds, a clear chain — React → DRF API on Django 5 + MySQL with Simple JWT →
  a FastAPI AI service for the LLM features, sharing the JWT key → deployed with Gunicorn and Uvicorn
  behind Nginx. One sentence on why two services.
- **OK:** correct pieces, but a list of libraries rather than a flow.
- **Weak:** "I used Django" and nothing about how the parts connect.

## Q1. Middleware (3 minutes)

"Your rate-limit middleware returns 429 early. Which middleware still sees the response?"

- **Strong:** the ones above it, in reverse order; the view and those below never run. Adds why
  \`CorsMiddleware\` sits near the top.
- **Weak:** "all of them" or "none of them".

## Q2. The ORM (5 minutes)

"This list endpoint runs 151 queries for 50 rows." (Show the drive-applications snippet.)

- **Strong:** counts the queries aloud, uses \`select_related\` for the FK chain and
  \`prefetch_related\` for the many-to-many, explains JOIN vs IN, mentions a query-count test.
- **OK:** knows both methods but mixes up which relation needs which.
- **Weak:** "add caching" or "add an index" without counting.

**Follow-up.** "Now add the number of applications per drive." — \`annotate(Count(...))\`; strong
candidates mention \`distinct=True\` if another count joins in.

## Q3. Concurrency (6 minutes) — whiteboard

"Fifty students hit 'book' for the last mock-interview slot at 10:00:00. Write \`book_slot\`."

- **Strong:** \`transaction.atomic()\` + \`select_for_update()\`, or a conditional
  \`update(...)\` checking the returned row count; explains what the second transaction does; returns
  409 to the losers.
- **OK:** uses \`atomic()\` alone and believes it locks — corrects it when asked "what does the second
  request read?".
- **Weak:** read, check, save with no lock.

## Q4. DRF (5 minutes)

"A student can see other students' applications. Find it." (Show the unscoped \`ModelViewSet\`.)

- **Strong:** \`has_object_permission\` never runs on list; scope \`get_queryset\`; owner from
  \`perform_create\`; \`status\` read-only; 404 not 403 on someone else's id.
- **OK:** adds a permission class only.
- **Weak:** filters in the React app.

## Q5. Auth (4 minutes)

"How does a logged-out user stay logged out with JWT?"

- **Strong:** short access token, refresh rotation and blacklisting (and what they need installed),
  accepts the access token lives until expiry, knows where the tokens are stored and why.
- **Weak:** "delete the token in localStorage" as the whole answer.

## Q6. FastAPI (5 minutes)

"Why FastAPI for the AI part? And what is wrong here?"

    @app.post("/feedback")
    async def feedback(body: Feedback):
        reply = openai_sync_client.chat.completions.create(...)   # blocking, ~8 s
        return {"text": reply.choices[0].message.content}

- **Strong:** I/O-bound streaming fits async; spots the blocking call in \`async def\` freezing the loop
  for everyone; fixes with the async client and \`await\`, or a \`def\` endpoint; mentions a timeout and
  a 503 when the provider fails.
- **OK:** good reason for FastAPI, misses the blocking call until hinted.
- **Weak:** "FastAPI is faster than Django".

## Q7. Scale (4 minutes)

"Ten times the users next placement season. What breaks first?"

- **Strong:** DB connections vs \`max_connections\`, N+1 and slow queries, per-process state (LocMem
  cache, local uploads, cron per server), LLM rate limits and cost — with a fix for each.
- **Weak:** "add servers".

## Close (2 minutes)

"Any questions for me?" — ask how they deploy, how they handle migrations on big tables, or what
on-call looks like. Never "no".

**Scoring.** Five or more strong with no weak → clear pass. A weak on concurrency or on data scoping is
usually a fail for a backend role, because those bugs lose bookings or leak data.`,
    mcqs: [
      mcq('In Q3, a candidate wraps "read the slot, check it, save it" in transaction.atomic() and says the transaction prevents double booking. How is that scored?', [
        ['Strong, because atomic() makes the whole function serial', false],
        ['OK if corrected: reads take no lock, so both can book', true],
        ['Weak, because transactions should never be used here', false],
      ], 'atomic() gives all-or-nothing, not mutual exclusion: two transactions both read an unbooked slot. The rubric scores it OK when the candidate fixes it with select_for_update or a conditional update once asked what the second request reads.'),
      mcq('For Q6, which fix to the feedback endpoint earns a strong score?', [
        ['Raise the Uvicorn timeout so the 8-second call can finish', false],
        ['Run more Uvicorn workers so one blocked loop matters less', false],
        ['Cache the LLM reply for each resume in a global dict', false],
        ['Await the async client, with a timeout and a 503 on failure', true],
      ], 'The bug is a blocking call on the event loop; awaiting the async client lets other requests proceed. More workers only spread the damage, and a per-process dict cache is neither shared nor correct for new input.'),
      mcq('In Q4 the candidate adds an IsOwner object permission and stops. What does the interviewer probe next?', [
        ['Whether the list endpoint still returns other students\' rows', true],
        ['Whether IsOwner should be written as a function instead', false],
        ['Whether the permission class needs a database index', false],
        ['Whether the JWT access token carries the student\'s college roll number', false],
      ], 'Object permissions run only through get_object(), so the list still leaks every application. A strong candidate scopes get_queryset without being asked.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_DJANGO_CHECKPOINT',
    notes: `Ten questions across the whole round: Django's request path, the ORM, DRF, auth, FastAPI and how
the system runs. Each is a scenario or a snippet of the kind an interviewer puts in front of you. Work
out what the framework actually does before you look at the options; if two seem right, ask which one
the framework guarantees.`,
    checkpoint: [
      ck('DJANGO', `How many queries does this view run for 20 orders, each with a customer?

    orders = Order.objects.select_related("customer").filter(status="PAID")
    names = [o.customer.name for o in orders]
    total = orders.count()`, [
        ['1, because count() reuses the evaluated cache', true],
        ['2, because count() always sends its own COUNT query', false],
        ['21, because select_related only applies to filter()', false],
        ['22, one for orders, one per customer and one count', false],
      ], 'select_related joins the customer into the one SELECT, and once the comprehension has evaluated the QuerySet, count() answers from the cache without a query.'),
      ck('DJANGO', 'Stock is decremented by Product.objects.filter(pk=pid, stock__gte=1).update(stock=F("stock") - 1). The call returns 0. What does that mean?', [
        ['The update failed and must be retried in a loop', false],
        ['Nothing was left in stock, so no row matched', true],
        ['The F expression could not be applied to an int', false],
        ['The row was locked by another transaction', false],
      ], 'update() returns the number of rows changed. With the stock__gte=1 filter, 0 means the condition was false at the moment of the UPDATE: sold out. This is the race-free alternative to read-check-save.'),
      ck('DJANGO', 'A service saves an Application, then a post_save receiver in another app enqueues an email task. Reviewers keep missing this when reading place_application(). What is the better design?', [
        ['Move the receiver into the same app so it is easier to find', false],
        ['Use pre_save instead so the email goes before the write', false],
        ['Call the email step explicitly, via on_commit, in the service', true],
      ], 'Business steps hidden in signals are invisible at the call site and skipped by bulk paths. An explicit call inside the service, deferred with on_commit, is readable and runs only after a successful commit.'),
      ck('DJANGO_REST', `What does a POST with {"start": "2026-11-02T10:00", "end": "x"} return?

    class SlotSerializer(serializers.Serializer):
        start = serializers.DateTimeField()
        end = serializers.DateTimeField()
        def validate(self, attrs):
            if attrs["end"] <= attrs["start"]:
                raise serializers.ValidationError("end must be after start")
            return attrs`, [
        ['400 with "end must be after start"', false],
        ['400 with both the field error and the validate() error', false],
        ['500, because validate() reads a key that is missing', false],
        ['400 with only a datetime format error on end', true],
      ], 'end fails type conversion, so it has a field error, and DRF does not call validate() when any field failed. The client gets the format error for end only.'),
      ck('DJANGO_REST', 'A ModelViewSet has get_queryset filtered by request.user and IsAuthenticated. Asha sends DELETE /api/applications/55/, which is Ravi\'s. What happens?', [
        ['404; the scoped queryset never finds row 55', true],
        ['403; IsAuthenticated rejects deletes of others', false],
        ['204; delete skips get_queryset and uses the id', false],
        ['405; ModelViewSet does not allow DELETE by default', false],
      ], 'destroy() calls get_object(), which looks the pk up in get_queryset(). Ravi\'s row is not in Asha\'s queryset, so the lookup raises 404 and nothing is deleted.'),
      ck('DJANGO_REST', 'Simple JWT runs with ROTATE_REFRESH_TOKENS and BLACKLIST_AFTER_ROTATION on. An attacker replays a refresh token that the real user already used once. What happens?', [
        ['It works until the original 1-day expiry', false],
        ['It is refused, since that token was blacklisted', true],
        ['It works one more time and is blacklisted after that', false],
        ['It is refused only if the access token expired', false],
      ], 'When the user refreshed, rotation issued a new refresh token and blacklisting recorded the old one; the replayed token is now rejected. The access token already issued still lives until its own expiry.'),
      ck('FASTAPI', 'A FastAPI endpoint is declared def score(...) (not async) and calls PyMySQL, which blocks for 200 ms. Under concurrent load, what happens to other requests?', [
        ['They wait, as def endpoints run on the event loop', false],
        ['They fail with 503 until the query finishes', false],
        ['They proceed, since def endpoints run in a threadpool', true],
        ['They proceed only if each one opens its own process', false],
      ], 'FastAPI runs plain def endpoints in a worker threadpool, so a blocking call occupies one thread while the event loop keeps serving others. The danger is a blocking call inside async def.'),
      ck('FASTAPI', 'The AI service and the Django API both need the logged-in user. What is the cleanest way for FastAPI to identify them?', [
        ['Call Django\'s /api/me/ endpoint on every request', false],
        ['Read the user id from a query parameter sent by React', false],
        ['Share the Django session table through the same MySQL', false],
        ['Verify the same JWT in a current_user dependency', true],
      ], 'Verifying the signed token locally keeps the services independent and fast. Calling Django per request couples them, and a client-supplied user id is trivially forged.'),
      ck('DJANGO', 'Resume scoring takes about 50 seconds and runs inside a Django view under Gunicorn sync workers with default settings. What do users see, and what is the fix?', [
        ['502s after 30 s; move scoring to a background job', true],
        ['A slow page; raise the Gunicorn timeout to 120 s', false],
        ['422s from Gunicorn; split the request into chunks', false],
      ], 'The default 30-second timeout kills the worker mid-request and the proxy returns 502. Raising the timeout keeps workers blocked for longer; a Celery or RQ job with a status endpoint frees them.'),
      ck('DJANGO', 'Production passes manage.py check --deploy except one warning: SECURE_SSL_REDIRECT is not set, and Nginx terminates TLS before Gunicorn. After setting it to True, every page loops on redirects. What is missing?', [
        ['SECURE_HSTS_SECONDS, so the browser stops redirecting', false],
        ['SECURE_PROXY_SSL_HEADER, so Django trusts the proxy header', true],
        ['SESSION_COOKIE_SECURE, so the cookie survives the redirect', false],
        ['CSRF_TRUSTED_ORIGINS, so the redirected request is allowed', false],
      ], 'Gunicorn receives plain HTTP from Nginx, so Django thinks every request is insecure and redirects again. SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") with Nginx setting that header tells Django the original scheme.'),
    ],
  },
];
