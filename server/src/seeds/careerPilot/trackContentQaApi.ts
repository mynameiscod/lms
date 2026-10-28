/**
 * Career-track content: API Testing (QA_API_TESTING), QA / SDET, batch QA2.
 *
 * Testing an HTTP API as a QA engineer or SDET does at work: deciding what to test (status, headers, body, schema,
 * side effects, negatives, idempotency, pagination, errors), Postman and Newman, API suites in Python with requests,
 * pytest and jsonschema, authentication and authorisation tests from the defender's side, contract testing and
 * service mocks, and REST Assured for Java teams. It builds on the years' "Resources, and the Shape of a Good API",
 * "Proving Who Is Calling", "Errors, Retries and Rate Limits", "Answers Programs Can Act On", the Python Full Stack
 * track's "Fixtures and Parametrised Tests" and "Mocking and Isolating Code", and this track's "Equivalence Partitions
 * and Boundary Values"; REST, HTTP and pytest basics are referred to by title, not re-taught.
 *
 * One demo app runs through the topic: DabbaDash, a fictional Bengaluru food-ordering API (Flask) with five planted
 * defects: POST /orders answers 200 with no Location (BUG-1), quantity 0 or negative accepted (BUG-2), any logged-in
 * customer can read or cancel another customer's order (BUG-3), the order detail returns total_paise as a string
 * while the list returns a number (BUG-4, schema drift), and menu page 2 repeats the last item of page 1 (BUG-5).
 * Every pytest, requests, jsonschema, responses and hypothesis output quoted is real output from Python 3.13, Flask
 * 3.1 (Werkzeug 3.1), requests 2.34, jsonschema 4.26, responses 0.26, hypothesis 6.170 and pytest 9.1 against that app
 * and its fixed build, on synthetic data. A plain-Java JDK HttpClient check was compiled and run with JDK 19. Not run:
 * Postman, Newman, Pact (pact-python and Pact JVM), REST Assured, TestNG and Maven, which were written from their
 * documentation and are marked as such; the Postman collection was parsed and its test scripts were executed by a
 * small stand-in runner (not Newman) against the app.
 *
 * Skills: API_TESTING by default; checkpoint questions that are plainly about REST design itself (method semantics,
 * status-code meaning, pagination contracts) use ck('REST_APIS', ...).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_QA_API_TESTING_BUNDLES: PilotBundle[] = [
  /* ── API_TEST_DESIGN ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_API_TEST_DESIGN',
    notes: `DabbaDash is a Bengaluru start-up that delivers South Indian breakfasts and biryani. Its Android app, its web app and
two restaurant partners all talk to one orders API. When that API is wrong, every screen is wrong at once, and the
cheapest place to catch it is the API itself: no browser, no rendering, tests that run in milliseconds.

You already know what a resource, a method and a status code are ("Resources, and the Shape of a Good API",
"Answers Programs Can Act On"). This lesson is about the tester's side: given an API, which tests does it need?

## The API under test

    POST /auth/login             -> token, valid for 900 seconds
    GET  /menu?page=&per_page=   -> one page of menu items (public)
    POST /orders                 -> place an order (items, address)
    GET  /orders, /orders/{id}   -> my orders, one order
    POST /orders/{id}/cancel     -> only while PLACED
    POST /orders/{id}/pay        -> calls the UPI payment provider
    GET  /admin/orders           -> support staff only

Money is in paise, as integers. Errors come back as {"error": {"code": ..., "message": ...}}.

## Explore before you automate

Ten minutes with requests in a Python shell (or Postman) teaches you more than the spec. Placing a biryani:

    POST /orders: 200 application/json Location=None
        {"address":"Flat 4B, Koramangala","created_at":"2026-10-28T07:39:20Z","id":101,
         "items":[{"item_id":6,"name":"Chicken Biryani","price_paise":22000,"qty":1}],
         "status":"PLACED","total_paise":22000}

A resource was created, so the spec (and HTTP) says 201 Created with a Location header. Then quantity -2:

    POST /orders qty -2: 200 ...  "qty":-2 ... "total_paise":-44000

A negative bill. Quantity 21 was rejected with 400, so somebody wrote the upper check and forgot the lower one.

## What every API test can check

1. **Status code**: the exact one the contract promises. "Not 500" is not a test.
2. **Headers**: Content-Type is application/json (including on errors), Location after a create, Allow on 405,
   Cache-Control on private data.
3. **Body values**: the fields that matter for this case, with literal expected values (2 x 9000 + 3000 = 21000).
4. **Body shape**: every field present, with the right type, and nothing extra; a JSON Schema does this in one
   line (the next-but-one lesson).
5. **Side effects**: read the state back. After a cancel, GET shows CANCELLED; after a failed payment, the order
   is still PLACED.
6. **What must not happen**: no second order on a retry, no change to another customer's data.

## Test ideas per endpoint

For each endpoint, walk the same list. For POST /orders:

- **Positive**: one item, several items, the maximum quantity, an address with Devanagari or a comma.
- **Negative, per field**: partitions and boundaries from "Equivalence Partitions and Boundary Values". qty: 0, 1,
  20, 21, -1, "2" (a string), 2.5, missing. address: missing, blank, 200 and 201 characters. items: empty list,
  unknown item_id, not a list.
- **Malformed requests**: a body that is not JSON, the wrong Content-Type, an empty body.
- **Auth**: no token (401), an expired token (401), a customer on a support-only endpoint (403), one customer
  touching another's order (the AUTH lesson).
- **State**: cancel a cancelled order (409), pay for a cancelled order (409).
- **Idempotency**: the same request sent twice.

## Idempotency: what happens on a retry?

GET, PUT and DELETE are idempotent by definition: doing them twice leaves the same state as doing them once. POST
is not, and on a slow 4G connection the app will retry. DabbaDash accepts an Idempotency-Key header: the same key
from the same user must return the same order instead of creating a second one. The test sends the request twice
and then counts the orders in GET /orders. Counting is the point: two 201s with different ids look healthy.

## Pagination: no gaps, no repeats

Walk every page and collect the ids. The DabbaDash menu has 12 items, 5 per page:

    menu p1 ids: [1, 2, 3, 4, 5]
    menu p2 ids: [5, 6, 7, 8, 9]

Item 5 appears twice: page 2 starts one item early. Each page looks fine on its own; only the walk across pages
shows it, and the test asserts both that no id repeats and that the ids collected are exactly 1 to 12. Also test the edges: page 0, per_page above
the limit (50), a page past the end (an empty list, not an error), and what happens when an item is added while
someone is paging.

## Error responses are part of the contract

A client parses errors too. A wrong method gave this:

    PUT /orders/101: 405 text/html; charset=utf-8
        <!doctype html> <title>405 Method Not Allowed</title> ...

The status and the Allow header (HEAD, OPTIONS, GET) were right, but the body was the framework's HTML page, not
the JSON envelope every other error uses. The Android app's error parser would crash on it. That one was not even
planted; it is the default behaviour of the framework, which is exactly the kind of thing a tester finds.

## Where to start when time is short

Order the list by risk, as in "Test Plans, Test Strategy and Risk-Based Testing": money (totals, payments,
negative amounts), other people's data (authorisation), then the flows used most (place, read, cancel), then
everything else. On DabbaDash that order found the negative bill and the cross-customer read on day one.`,
    workedExample: `**Scenario.** Design the tests for POST /orders before writing any code, and decide what each one asserts.

**Step 1: read the contract.** 201 with a Location header and the order body; items is a non-empty list of
{item_id, qty} with qty 1 to 20; address 1 to 200 characters after trimming; total_paise = sum of qty x price;
errors are 400 VALIDATION_ERROR; no token is 401.

**Step 2: list the cases, one claim each.**

    ID   Case                               Expect
    O1   2 x Masala Dosa + 1 Filter Coffee  201, Location /orders/{id}, total 21000, status PLACED
    O2   same body, schema                  matches the order schema (types, no extra fields)
    O3   qty 0 / -1 / 21 / "2"              400 VALIDATION_ERROR, error envelope
    O4   unknown item 999 / no items        400 VALIDATION_ERROR
    O5   blank address / 201 characters    400 VALIDATION_ERROR
    O6   body "items=2", text/plain         400
    O7   same Idempotency-Key twice         same id, one order in GET /orders
    O8   no token                           401 UNAUTHENTICATED

Notice the expected values are literal (21000, not "the computed total"): a test that recomputes the total with
the app's own formula would share the app's bug.

**Step 3: decide what not to assert.** created_at changes every run and id depends on order of tests, so assert
their shape (a timestamp pattern, an integer) rather than their value.

**Step 4: run it against the build.** Automated in pytest (the Python lesson shows how), the first run printed:

    FAILED test_place_order_returns_201_with_location - assert 200 == 201
    FAILED test_invalid_order_is_rejected_with_400[qty-zero]
    FAILED test_invalid_order_is_rejected_with_400[qty-negative]

Two defects from eight cases: the wrong status (BUG-1) and the missing lower bound (BUG-2). qty 21, the string "2",
the unknown item and both addresses passed, which is useful too: they prove the validation that does exist works.

**What to say in a review.** "I test every field at its boundaries and assert exact codes and literal values; the
qty boundary at 1 was missing, and the API billed minus Rs 440."`,
    mcqs: [
      mcq('POST /orders on DabbaDash returns 200 with the new order in the body and no Location header. Why is that a defect?', [
        ['The contract and HTTP say a create answers 201 with a Location pointing at the new resource', true],
        ['A 200 response must never carry a body, so the client will not be able to read the order', false],
        ['POST requests may only answer 202, because the order is processed in the background', false],
        ['The body should be empty after a create and the client should call GET /orders straight away', false],
      ], '201 Created plus a Location header is what DabbaDash promises and what clients rely on to find the new order. A 200 may carry a body, 202 is for work accepted but not done, and nothing requires a create to return an empty body.'),
      mcq('Walking DabbaDash menu pages with per_page=5 gives page 1 ids [1, 2, 3, 4, 5] and page 2 ids [5, 6, 7, 8, 9]. What does that show?', [
        ['An offset bug: page 2 starts one item early, so item 5 is returned on two different pages', true],
        ['Nothing yet: overlap between pages is normal when per_page is an odd number such as 5', false],
        ['The menu has a duplicate item 5 stored twice in the database and needs cleaning', false],
        ['Page 2 is cached from an older request and will correct itself after a refresh', false],
      ], 'A correct offset for page 2 is (2-1) x 5 = 5, so it should start at item 6; starting at item 5 shows it to the user twice. Overlap is never normal for offset paging, the ids show one item 5 returned twice rather than two stored rows, and nothing in the API caches.'),
      mcq('Which check proves that sending POST /orders twice with the same Idempotency-Key did not create two orders?', [
        ['Count that order id in GET /orders after both calls', true],
        ['Check that both responses had a 2xx status code', false],
        ['Check that the second call was faster than the first', false],
        ['Check that both responses have the same total_paise', false],
      ], 'Only the stored state shows how many orders exist; the test counts the id in the customer\'s list. Two 2xx responses are exactly what a double order also looks like, timing proves nothing, and two separate orders would have the same total too.'),
    ],
    checkpoint: [
      mcq('A PUT to /orders/101 returns 405 with an Allow header, but the body is an HTML page while every other DabbaDash error is a JSON envelope. How should a tester treat it?', [
        ['As a defect: clients parse error bodies too, and this one breaks their parser', true],
        ['As correct, because 405 and the Allow header are all the HTTP standard requires', false],
        ['As a test problem: the request should have been sent with an Accept of text/html', false],
        ['As out of scope, because no client is ever meant to send PUT to that route', false],
      ], 'The error format is part of the contract, and an app that expects {"error": ...} fails on HTML. The status and Allow header were right, but that does not make the body acceptable; Accept headers do not excuse it, and clients do send wrong methods, for example after a refactor.'),
      mcq('qty 21 is rejected with 400 but qty -2 is accepted and the order total becomes -44000 paise. Which test design idea would have found this first?', [
        ['Testing both boundaries of the valid range, at 0 and 1 as well as at 20 and 21', true],
        ['Testing many random valid quantities between 1 and 20 to cover the middle well', false],
        ['Testing the response time of POST /orders under a load of a few hundred users', false],
        ['Testing that the response schema has qty as an integer field on every line', false],
      ], 'Each boundary of a range needs its own pair of values; the upper one was checked by the developer, the lower one was not. Values in the middle never reach the defect, load says nothing about validation, and -2 is still an integer, so a schema check passes it.'),
      mcq('An API test asserts the full response body with ==, including created_at and id, and fails on every run. What is the better design?', [
        ['Assert values that matter literally, and check volatile fields by type or pattern', true],
        ['Freeze the database so that ids and timestamps are the same on every single run', false],
        ['Remove created_at and id from the API response so that the test can compare bodies', false],
        ['Retry the test until the id happens to match the value saved in the expected file', false],
      ], 'Totals, status and items get literal expected values; ids and timestamps change by design, so their shape is checked instead. Freezing the database is fragile, changing the API to suit a test is backwards, and retrying for a matching id is not a test.'),
    ],
  },

  /* ── POSTMAN ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_POSTMAN',
    notes: `Many Indian QA teams meet an API first in Postman: the developer shares a collection, the tester adds checks, and
someone wires it into the pipeline with Newman. It is the fastest way to explore an API and a reasonable way to keep
a small regression pack. This lesson builds the DabbaDash collection.

**What was run.** Postman and Newman were not installed for this course. The collection and environment below were
written from the Postman documentation, parsed as JSON, and their test scripts were executed against DabbaDash by a
small stand-in runner that implements the few pm calls used. The outputs are real outputs of that stand-in, not of
Newman. Run the collection in Postman yourself and compare.

## Collections, folders and requests

A **collection** is an ordered list of requests, optionally in folders ("Auth", "Orders", "Negative"). It is saved
as JSON (schema v2.1), so it can live in Git next to the code and be reviewed like code. Each request has a method,
a URL, headers, a body and scripts.

## Variables and their scopes

Never type a host or a token into a request. Use {{base_url}} and {{asha_token}}. Postman resolves a variable from
the narrowest scope that defines it:

- **Local** (set in a script for this run), **data** (a row of a CSV or JSON data file),
- **environment** (local, QA, staging: one file each), **collection**, **global**.

The environment for a laptop:

    { "name": "DabbaDash local",
      "values": [
        { "key": "base_url", "value": "http://127.0.0.1:5187", "enabled": true },
        { "key": "asha_email", "value": "asha@example.test", "enabled": true },
        { "key": "asha_password", "value": "asha-pass-1", "type": "secret", "enabled": true } ] }

Only synthetic accounts go in a shared environment. Real credentials stay out of Git; in CI they are passed with
newman's --env-var option from the pipeline's secret store.

## Test scripts

Each request can have a pre-request script (runs before it is sent) and a test script (runs on the response). The
pm object gives you the response and Chai-style assertions:

    pm.test('login returns 200', () => pm.response.to.have.status(200));
    const body = pm.response.json();
    pm.test('token is present', () => pm.expect(body.access_token).to.be.a('string').and.not.empty);
    pm.collectionVariables.set('asha_token', body.access_token);

That last line is **chaining**: the login stores the token, and every later request sends
Authorization: Bearer {{asha_token}}. The "Place an order" test stores order_id the same way, and "Read the order
back" uses {{order_id}}.

The place-order checks:

    pm.test('created is 201', () => pm.response.to.have.status(201));
    pm.test('Location points at the order', () => pm.response.to.have.header('Location'));
    pm.test('body matches the order schema', () =>
        pm.response.to.have.jsonSchema(JSON.parse(pm.collectionVariables.get('order_schema'))));
    pm.test('total is 2 x 9000 paise', () => pm.expect(order.total_paise).to.eql(18000));

pm.response.to.have.jsonSchema validates with Ajv in current Postman versions; older collections use tv4, which
Postman has deprecated. Keep one name per test and one claim per test, so a red line says what broke.

## The run against the buggy build

    -> Place an order  POST http://127.0.0.1:5187/orders [200, 14ms]
      x created is 201: expected response to have status code 201 but got 200
      x Location points at the order: expected response to have header Location
      v body matches the order schema
      v total is 2 x 9000 paise
    -> Reject quantity zero  POST http://127.0.0.1:5187/orders [200, 9ms]
      x qty 0 is 400: expected response to have status code 400 but got 200
      x error code is VALIDATION_ERROR: Cannot read properties of undefined (reading 'code')
    -> Read the order back  GET http://127.0.0.1:5187/orders/101 [200, 9ms]
      x same schema as on create: data.total_paise should be integer
    assertions: 12 executed, 5 failed

Against the fixed build the same file printed "assertions: 12 executed, 0 failed". Look at the fourth failure: once
the status was wrong, the next assertion crashed on a missing field. Guard dependent checks
(if (pm.response.code === 400) ...) or accept that one defect may show as two red lines.

## Data-driven runs

The Collection Runner and Newman can iterate one request over a data file. A CSV with columns qty,expected_status
(0,400 / 1,201 / 20,201 / 21,400) and a test script that reads pm.iterationData.get('expected_status') turns the
boundary list from the last lesson into one request run four times.

## Newman in CI

Newman is the command-line runner for collections (npm install -g newman, or npx newman). From the docs:

    newman run DabbaDash.postman_collection.json \\
      -e local.postman_environment.json \\
      --env-var "asha_password=$ASHA_PASSWORD" \\
      -d qty_cases.csv \\
      -r cli,junit --reporter-junit-export results/newman.xml

Newman exits with a non-zero code when any assertion fails, so a CI step fails the build; the JUnit XML is what the
CI server shows as a test report. --bail stops at the first failure, -n repeats the run. Postman also ships its own
CLI (postman collection run) for teams on Postman's cloud workspaces.

## Where Postman stops

Postman is excellent for exploring, sharing and a smoke pack. It gets painful for complex setup and teardown,
for factories that create data per test, for reuse across hundreds of tests, and for reviewing logic hidden in
dozens of small scripts. Teams usually keep a small collection for smoke and documentation, and write the
regression suite in code: the next lesson.`,
    mcqs: [
      mcq('A DabbaDash collection must run on a laptop, on QA and on staging without edits. What should hold the host name?', [
        ['An environment variable such as {{base_url}}, one environment file per target', true],
        ['A global variable that each tester edits by hand before starting the next run', false],
        ['The URL typed into every request, with a find-and-replace before each run', false],
        ['A pre-request script with an if-else chain that checks the machine name', false],
      ], 'Environments exist for exactly this: the same requests resolved against a different base_url per target, with the file chosen at run time (-e in Newman). Hand-edited globals and find-and-replace break silently, and machine-name logic hides configuration in scripts.'),
      mcq('In the collection, "Read the order back" calls {{base_url}}/orders/{{order_id}}. Where does order_id come from?', [
        ['The place-order test script saves it with pm.collectionVariables.set', true],
        ['Postman fills in the id of the last created resource on its own', false],
        ['The environment file holds a fixed id that exists on every server', false],
        ['Newman passes it in with a --env-var flag on the command line', false],
      ], 'Chaining is explicit: a test script reads the id from the response and stores it for later requests. Postman does not guess ids, a fixed id in the environment breaks on a fresh database, and --env-var is for values known before the run, such as secrets.'),
      mcq('Newman runs the collection in CI and two assertions fail. What makes the CI step itself fail?', [
        ['Newman exits with a non-zero code when any assertion has failed', true],
        ['The JUnit reporter deletes its XML file when there are failures', false],
        ['Postman sends a failure e-mail that the CI server watches for', false],
        ['CI reads the console output and searches for the word failed', false],
      ], 'CI servers fail a step on a non-zero exit code, and Newman returns one when tests fail. The JUnit file is written either way so the report can show the failures, and nothing depends on e-mail or text searching.'),
    ],
    checkpoint: [
      mcq('A tester wants qty 0, 1, 20 and 21 tested against POST /orders in Postman without four copies of the request. What is the right tool?', [
        ['A data file with a row per case, read through pm.iterationData in the test script', true],
        ['Four folders that each contain a copy of the request with a different body inside', false],
        ['A pre-request script that picks one random quantity between 0 and 21 on each run', false],
        ['A global variable that the tester edits before each of four manual runs of the request', false],
      ], 'The runner and Newman (-d) iterate a request over the rows of a CSV or JSON file, so one request covers all boundaries and each row carries its expected status. Copies drift apart, random choice is not repeatable, and manual edits are not a regression pack.'),
      mcq('After the status check fails on "Reject quantity zero", the next test fails with "Cannot read properties of undefined (reading \'code\')". What does that second failure mean?', [
        ['It follows from the first: the 200 body has no error object for the script to read', true],
        ['The JSON parser in Postman crashed and the collection needs to be exported again', false],
        ['The error envelope of the API was renamed, which is a second and separate defect', false],
        ['The environment is missing a variable named code that the test script refers to', false],
      ], 'With BUG-2 the API accepted qty 0 and returned an order, so pm.response.json().error is undefined; one defect shows as two red lines. Postman parsed the body fine, the envelope is unchanged on real errors, and code is a field, not a variable.'),
      mcq('A team keeps its DabbaDash regression suite as 400 Postman requests with long test scripts and finds it hard to review and reuse. What is the usual direction?', [
        ['Keep a small Postman smoke pack and move the regression suite into code', true],
        ['Split the 400 requests into more folders and add more environment files', false],
        ['Stop automated API tests and rely on exploratory sessions in Postman only', false],
        ['Convert every Postman test script to a pre-request script instead', false],
      ], 'Postman shines for exploring, sharing and smoke checks; factories, shared helpers and code review suit a code framework such as pytest. More folders and environments do not fix reuse, dropping automation loses regression safety, and pre-request scripts run before the response exists.'),
    ],
  },

  /* ── PYTHON_API_TESTS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_PYTHON_API_TESTS',
    notes: `The DabbaDash regression suite is pytest with requests: 31 tests that start the API, log in, place orders, check
schemas and tear everything down, in about seven seconds. You know pytest, fixtures and parametrize from "pytest:
Writing and Running Tests" and "Fixtures and Parametrised Tests"; here they are put together for an API.

## Layout

    tests/
      conftest.py        base_url, users, place_order factory, provider stub
      schemas.py         JSON Schemas for order, error, menu page
      test_orders.py     create, validation, idempotency, cancel, pagination
      test_auth.py       401, 403, expiry, another customer's order
      test_payments.py   provider success, decline, timeout, 500

## Where the API comes from

On a shared QA server, base_url comes from an environment variable. For this course the session fixture starts the
app in a thread on a free port, so every run gets a fresh API with an injectable clock:

    class LiveServer:
        def __init__(self, app):
            self.srv = make_server("127.0.0.1", 0, app, threaded=True)
            self.url = f"http://127.0.0.1:{self.srv.server_port}"
            threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    @pytest.fixture(scope="session")
    def base_url(clock, provider):
        app = create_app(bugs=os.environ.get("BUGS", "1") == "1", clock=clock, payment_url=provider.url)
        srv = LiveServer(app)
        yield srv.url
        srv.stop()

Port 0 asks the operating system for any free port, so two runs never collide. The requests go over real HTTP, the
same as a client's.

## Sessions and users

A requests.Session keeps headers and connections between calls. A login helper returns a session that already
carries the token:

    def login(base_url, email, password):
        s = requests.Session()
        r = s.post(f"{base_url}/auth/login", json={"email": email, "password": password}, timeout=5)
        assert r.status_code == 200, r.text
        s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
        return s

    @pytest.fixture
    def asha(base_url):
        return login(base_url, "asha@example.test", "asha-pass-1")

Two details: json= (not data=) so the body is JSON with the right Content-Type, and a timeout on every call, because
requests waits for ever by default. The fixtures are function-scoped on purpose; the debugging unit shows what a
session-scoped token did to this suite.

## A factory for data

    @pytest.fixture
    def place_order(base_url):
        def place(session, items=None, address="Flat 4B, Koramangala, Bengaluru 560034"):
            items = items or [{"item_id": 2, "qty": 2}, {"item_id": 4, "qty": 1}]
            r = session.post(f"{base_url}/orders", json={"items": items, "address": address}, timeout=5)
            assert r.ok, f"could not place order: {r.status_code} {r.text}"
            return r.json()
        return place

The helper asserts only r.ok. Whether the create answers 201 is one test's claim
(test_place_order_returns_201_with_location); if every helper demanded 201, BUG-1 would fail thirty tests and hide
everything else.

## Assertions that explain themselves

    def test_invalid_order_is_rejected_with_400(base_url, asha, items, address):
        r = asha.post(f"{base_url}/orders", json={"items": items, "address": address})
        assert r.status_code == 400, f"got {r.status_code} {r.text[:60]}"
        validate(r.json(), ERROR)
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"

parametrize with pytest.param(..., id="qty-zero") gives each case a name in the report, so the failure line reads
test_invalid_order_is_rejected_with_400[qty-zero], and the message shows what came back.

## Schemas with jsonschema

    ORDER = {
        "type": "object",
        "required": ["id", "status", "items", "total_paise", "address", "created_at"],
        "properties": {
            "id": {"type": "integer"},
            "status": {"enum": ["PLACED", "PAID", "CANCELLED"]},
            "items": {"type": "array", "minItems": 1, "items": LINE},
            "total_paise": {"type": "integer", "minimum": 0},
            "created_at": {"type": "string", "pattern": r"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$"},
            ...
        },
        "additionalProperties": False,
    }

required catches a missing field, type catches drift, enum catches a new status nobody told the app about, and
additionalProperties: False catches a field that leaked out (a user_id, an internal cost). One schema serves the
create, the detail and every item of the list.

## The run

Against the buggy build:

    test_auth.py ......FFF
    test_orders.py F.FF........F.F...
    test_payments.py ....
    FAILED test_auth.py::test_customer_cannot_read_another_customers_order
    FAILED test_auth.py::test_customer_cannot_cancel_another_customers_order
    FAILED test_auth.py::test_another_customers_order_and_a_missing_one_look_the_same
    FAILED test_orders.py::test_place_order_returns_201_with_location - assert 200 == 201
    FAILED test_orders.py::test_invalid_order_is_rejected_with_400[qty-zero]
    FAILED test_orders.py::test_invalid_order_is_rejected_with_400[qty-negative]
    FAILED test_orders.py::test_order_detail_matches_the_same_schema
    FAILED test_orders.py::test_menu_pages_do_not_overlap_and_cover_everything
    8 failed, 23 passed in 9.92s

All five planted defects, each named by its test. Against the fixed build: 31 passed in 7.16s. With pytest-xdist
(-n 4) the fixed suite took 20.65s: four workers each start their own servers, so for a suite this small parallel
runs cost more than they save. Measure before you parallelise.`,
    workedExample: `**Scenario.** The Android team reports that the order screen sometimes shows "Rs NaN". The list screen is fine.
Find out why with a test, not with a guess.

**Step 1: write the test the bug suggests.** If the detail screen breaks and the list does not, compare the two
endpoints' shapes against the same schema:

    def test_order_detail_matches_the_same_schema(base_url, asha, place_order):
        order = place_order(asha)
        r = asha.get(f"{base_url}/orders/{order['id']}")
        assert r.status_code == 200
        validate(r.json(), ORDER)

**Step 2: run it.**

    E   jsonschema.exceptions.ValidationError: '21000' is not of type 'integer'
    E   Failed validating 'type' in schema['properties']['total_paise']:
    E       {'type': 'integer', 'minimum': 0}
    E   On instance['total_paise']:
    E       '21000'

The detail endpoint sends total_paise as a string. The list sends 21000. Same field, two types: schema drift,
usually from a refactor of one serializer and not the other. JavaScript's "21000" / 100 still works, which is why
the web app never noticed; the Android model parses it strictly and falls back to NaN.

**Step 3: report with evidence.**

    Title: GET /orders/{id} returns total_paise as a string; list returns an integer
    Severity: Major (wrong amount on the order screen); Priority: P1 for the next app release
    Expected: integer paise in both, per the order schema
    Actual: "21000" in detail, 21000 in list
    Evidence: the failing test and its jsonschema message

**Step 4: keep the guard.** The same ORDER schema now validates the create, the detail and every item in the list,
so any endpoint that drifts fails the suite. After the fix the test passed, along with the other 30.

**Why a schema rather than one assertion.** assert isinstance(body["total_paise"], int) would have caught this
field. The schema catches the next drift too, in a field nobody thought to check.`,
    mcqs: [
      mcq('Every DabbaDash test uses a helper that places an order. Why does the helper assert r.ok rather than r.status_code == 201?', [
        ['The 201 is one test\'s claim; demanding it everywhere would turn one bug into thirty failures', true],
        ['A helper function is not allowed to contain any assert statements under the rules of pytest', false],
        ['r.ok also checks that the response body matches the schema, which makes it a stricter check', false],
        ['201 responses cannot be read by requests until r.raise_for_status() has been called on them', false],
      ], 'With BUG-1 the API answers 200; a helper demanding 201 would fail every test that needs an order and bury the other defects. pytest allows asserts anywhere, r.ok only means status below 400, and requests reads 201 bodies normally.'),
      mcq('A DabbaDash API test calls requests.get(url) with no timeout, and the CI job hangs for an hour when the server stalls. What is the fix?', [
        ['Pass a timeout on every call, because requests waits indefinitely by default', true],
        ['Wrap the call in a try block that catches requests.ConnectionError only', false],
        ['Switch to a requests.Session, which applies a 30-second timeout by default', false],
        ['Add a retry decorator so that the call is attempted again three more times', false],
      ], 'requests has no default timeout, so a stalled server blocks the test until the CI job is killed; timeout=5 turns that into a clear failure. A stall raises nothing to catch, Session has no default timeout either, and retries on a hung call never get to run.'),
      mcq('Which schema keyword would catch the API starting to return an internal field such as user_id inside each order?', [
        ['"additionalProperties": false on the order object', true],
        ['"required" listing every field the client needs', false],
        ['"minProperties" set to the number of known fields', false],
        ['"type": "object" on the order and on every line', false],
      ], 'additionalProperties false rejects any field not declared in properties, which is how a leaked user_id would show up. required checks for missing fields, minProperties is satisfied by extra fields, and an object with an extra field is still an object.'),
    ],
    checkpoint: [
      mcq('The detail endpoint returns "total_paise": "21000" while the list returns 21000. Which test catches this, and keeps catching similar drift?', [
        ['Validating every endpoint\'s order body against one shared JSON Schema', true],
        ['Asserting that the detail total equals the list total for the same order', false],
        ['Asserting that the response status code of the detail endpoint is 200', false],
        ['Asserting that the detail body contains a key named total_paise', false],
      ], 'One schema applied to the create, detail and list items fails on any type change, in any field. Comparing totals in Python with == says "21000" != 21000 but only for that field, a 200 says nothing about the body, and the key is present in both.'),
      mcq('A DabbaDash test posts the order with data={...} instead of json={...}, and the API answers 400 "Body must be a JSON object". What happened?', [
        ['requests sent it form-encoded, so the API received no JSON body', true],
        ['The API refuses any order that contains more than one line item', false],
        ['The JSON was valid, but the Authorization header was dropped', false],
        ['requests sent the body as JSON with a misspelled field name', false],
      ], 'data= with a dict form-encodes it (items=item_id&items=qty...) under application/x-www-form-urlencoded, so the server sees no JSON. json= serialises the body and sets Content-Type: application/json. The other options do not match a "not a JSON object" error.'),
      mcq('Why do the DabbaDash test cases use pytest.param(..., id="qty-zero") rather than plain tuples?', [
        ['The failure line names the case, so a reader knows which input broke without opening the code', true],
        ['pytest refuses to run parametrised tests whose arguments contain lists and dicts unless ids are set', false],
        ['ids make pytest run the parametrised cases in parallel across several worker processes', false],
        ['ids are needed so that each case gets its own fresh database and logged-in session', false],
      ], 'test_invalid_order_is_rejected_with_400[qty-zero] says what failed at a glance; without ids pytest makes up names like items0-address0. Lists and dicts run fine without ids, parallelism comes from xdist, and fixtures are per test regardless of ids.'),
    ],
  },

  /* ── AUTH_SECURITY_API ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_AUTH_SECURITY_API',
    notes: `The most expensive API bugs are not crashes. They are a customer seeing someone else's address, or cancelling
someone else's dinner, with a perfectly healthy 200. This lesson is about proving that DabbaDash enforces who may
call it and what each caller may touch.

**Ground rules.** Everything here is done on an app you own or an environment you are explicitly authorised to test,
with synthetic test accounts. These are checks that the defences exist, not attacks: no payload lists, no tools
pointed at systems you do not own. Scanning with OWASP ZAP is covered, with the same rules, in "Security Testing
Basics for QA".

You know the difference between authentication (who is calling) and authorisation (what they may do) from "Proving
Who Is Calling" and "Who You Are, and What You May Do". The tests follow that split.

## Authentication: is the caller who they say?

    no token                          -> 401 UNAUTHENTICATED
    "Bearer not-a-real-token"         -> 401 INVALID_TOKEN
    a valid token with one character changed -> 401 INVALID_TOKEN
    wrong password vs unknown email   -> the same 401 and the same body

The last check matters: if "wrong password" and "no such user" give different messages, anyone can find out which
phone numbers or emails have accounts. The test compares the two responses whole:

    assert r.status_code == r2.status_code == 401
    assert r.json() == r2.json()

## Expiry, without waiting fifteen minutes

DabbaDash tokens live 900 seconds. A test that sleeps 900 seconds will never run in CI. The app takes its clock as a
dependency, and the test suite passes a fake one it can move:

    def test_token_stops_working_at_expiry(base_url, asha, clock):
        assert asha.get(f"{base_url}/orders").status_code == 200
        clock.advance(899)
        assert asha.get(f"{base_url}/orders").status_code == 200
        clock.advance(1)
        r = asha.get(f"{base_url}/orders")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "TOKEN_EXPIRED"

899 and 900 are the boundary pair, exactly as in test design. If your team's API has no injectable clock, ask for a
test configuration with a short token lifetime (say 5 seconds) on the QA environment; that is a reasonable request.

## Function-level authorisation: may this role call this endpoint?

Write the matrix of roles against endpoints and test every cell that should be refused:

    endpoint             anonymous  customer  support
    GET  /menu           200        200       200
    POST /orders         401        201       (not used)
    GET  /admin/orders   401        403       200

On DabbaDash a customer on /admin/orders got 403 FORBIDDEN and support got 200. 401 means "I do not know who you
are"; 403 means "I know, and the answer is no". A customer getting 401 on an admin route is a wrong code; a
customer getting 200 is a serious defect.

## Object-level authorisation: may this user touch this object?

This is the first item of the OWASP API Security Top 10 (2023): Broken Object Level Authorization. The endpoint is
allowed, but the object belongs to someone else. The test needs two users:

    def test_customer_cannot_read_another_customers_order(base_url, asha, ravi, place_order):
        order = place_order(asha)
        r = ravi.get(f"{base_url}/orders/{order['id']}")
        assert r.status_code == 404, f"ravi read order {order['id']} of asha: {r.status_code}"

On the buggy build:

    E   AssertionError: ravi read order 101 of asha: 200
    FAILED test_auth.py::test_customer_cannot_cancel_another_customers_order - assert 200 == 404

Ravi could read Asha's order, address included, and cancel it. Order ids are sequential (101, 102...), so any
customer who edits a number in a URL meets this. Test every verb on every object endpoint (read, cancel, pay), not
just GET.

**404 or 403?** DabbaDash answers 404 for an order you do not own, so a stranger cannot even confirm it exists. The
test checks that "someone else's" and "does not exist" are indistinguishable:

    theirs = ravi.get(f"{base_url}/orders/{order['id']}")
    missing = ravi.get(f"{base_url}/orders/999999")
    assert (theirs.status_code, theirs.json()) == (missing.status_code, missing.json())

Some teams prefer 403; either is defensible if it is written in the contract and applied everywhere. What is never
acceptable is 200. And support staff, who may read any order, get their own positive test.

## Property-level authorisation: may the caller set this field?

Clients send JSON; some servers copy every field into the record (mass assignment, API3 in the same list). A test
sends fields the client must not control:

    POST /orders {"items": [...], "address": "Flat 4B", "status": "PAID", "total_paise": 1, "user_id": 2}
    -> 201  status PLACED, total_paise 22000, no user_id in the body

DabbaDash ignored all three, which is the right behaviour; the test stays, so a future refactor that copies the
request body into the order is caught. The response side matters too: additionalProperties: False in the order
schema fails if an internal field such as user_id leaks out.

## Input handling

From the defender's side, "input handling" means: every field is validated for type, range and length; bad input
gives a 400 with the error envelope, never a 500 or a stack trace; and huge or malformed bodies are refused cleanly.
The DabbaDash negative suite already covers types, ranges and lengths, and found qty 0 and -2 accepted. Add one
check that no error response contains a traceback or a file path, and raise any 500 you can produce from input as a
defect: a 500 means the input reached code that did not expect it.

## What to record

Every auth defect gets two accounts named in the steps, the exact request and response, and a note of what data was
exposed. Treat such reports as confidential, and retest after the fix with the same two users.`,
    workedExample: `**Scenario.** DabbaDash adds POST /orders/{id}/pay. Before release, prove that only the order's owner can pay
for it and that nobody can pay for a cancelled order.

**Step 1: the matrix for the new endpoint.**

    caller                      expected
    no token                    401
    Asha, her PLACED order      200, status PAID
    Ravi, Asha's order          404, and Asha's order still PLACED, provider never called
    Asha, her CANCELLED order   409 INVALID_STATE, provider never called

**Step 2: write the cross-user test so it checks the state, not just the code.**

    def test_customer_cannot_pay_for_another_customers_order(base_url, asha, ravi, place_order, provider):
        order = place_order(asha)
        r = ravi.post(f"{base_url}/orders/{order['id']}/pay", json={"upi_vpa": "ravi@okdabba"})
        assert r.status_code == 404
        assert provider.app.config["CALLS"] == []
        assert asha.get(f"{base_url}/orders/{order['id']}").json()["status"] == "PLACED"

The provider stub records every collect request it receives, so the test can prove no money moved: a 404 with a
charge behind it would be the worst outcome of all.

**Step 3: run it on both builds.** The pay endpoint shares the owner lookup with read and cancel. On the buggy build:

    test_auth.py:63: in test_customer_cannot_pay_for_another_customers_order
    E   assert 200 == 404

Ravi's call went through to the provider and Asha's order was paid from Ravi's UPI handle. On the fixed build all
three assertions pass. That is the pattern to look for: an authorisation check written once and reused, or missing
once and missing everywhere. With this test and the mass-assignment test added, the suite is 33 tests: 9 failed,
24 passed on the buggy build and 33 passed on the fixed one.

**Step 4: name it in the report.** "Broken object-level authorisation on /orders/{id}, /cancel and /pay: any
logged-in customer can read, cancel or pay for any order by id. Accounts used: asha@example.test, ravi@example.test
(QA)."`,
    mcqs: [
      mcq('A logged-in DabbaDash customer calls GET /admin/orders. Which response is correct?', [
        ['403, because the caller is known but the role is not allowed', true],
        ['401, because the token does not carry the support role', false],
        ['404, because admin routes must stay hidden from customers', false],
        ['200 with an empty list, as the customer has no admin data', false],
      ], 'The caller authenticated successfully, so the answer is "known, and not allowed": 403. 401 means the identity itself is missing or invalid, 404 for a whole route is unusual and not what DabbaDash specifies, and 200 with an empty list hides a broken role check.'),
      mcq('Ravi, logged in, calls GET /orders/101, which belongs to Asha, and receives 200 with her address. What kind of defect is it?', [
        ['Broken object-level authorisation: the object was not checked against its owner', true],
        ['Broken authentication: Ravi\'s token was accepted although it was not his own token', false],
        ['Function-level authorisation: customers should never be allowed to call GET /orders', false],
        ['Input validation: the order id should have been rejected as an invalid parameter', false],
      ], 'Ravi is correctly authenticated and may call the endpoint; the defect is that the order is not checked against the caller (OWASP API1, BOLA). His token is his own, customers do use GET /orders/{id} for their own orders, and 101 is a perfectly valid id.'),
      mcq('Token lifetime is 900 seconds. How should the expiry test avoid waiting 15 minutes?', [
        ['Inject a controllable clock and move it to 899 and then 900 seconds', true],
        ['Call time.sleep(900) inside a test that is marked as slow and run nightly', false],
        ['Edit the expires_in field of the token response before the next call', false],
        ['Skip the test, since token expiry is the identity provider\'s concern', false],
      ], 'A fake clock makes the test instant and lets it check both sides of the boundary exactly. Sleeping fifteen minutes is slow and still imprecise, editing the response body does not change what the server stored, and expiry enforcement is the API\'s job to test.'),
    ],
    checkpoint: [
      mcq('DabbaDash answers 404 when Ravi requests Asha\'s order. Which test best proves the 404 reveals nothing about whether the order exists?', [
        ['Compare the status and body for Asha\'s order with those for an id that does not exist', true],
        ['Check that the 404 body does not contain the words forbidden or permission anywhere', false],
        ['Check that Asha herself still receives 200 when she requests the very same order', false],
        ['Check that the response time is under 500 ms for both Asha and Ravi requesting it', false],
      ], 'If "someone else\'s" and "missing" responses are identical, a stranger learns nothing. Scanning for words misses other differences, Asha\'s 200 is a separate positive test, and response time is not what this question is about (though a large timing gap could also leak).'),
      mcq('A test sends {"status": "PAID", "total_paise": 1} along with a normal DabbaDash order body. What is it checking?', [
        ['That the server ignores fields the client must not control (mass assignment)', true],
        ['That the server accepts payment details inside the order creation request', false],
        ['That the total of the order is rounded to the nearest whole rupee on create', false],
        ['That the JSON parser on the server tolerates unknown fields in a request', false],
      ], 'Status and total are server-owned; if a client can set them, it can create a paid order for one paisa (OWASP API3). The test passed on DabbaDash: PLACED and 22000. Payment goes through /pay, rounding is unrelated, and tolerating unknown fields is not the risk being tested.'),
      mcq('Which statement about testing authorisation on DabbaDash is right?', [
        ['Every verb on every object endpoint needs a second-user test, not just GET', true],
        ['One second-user test on GET /orders/{id} is enough, since the check is shared', false],
        ['Authorisation is tested by the security team, so API tests should leave it out', false],
        ['Authorisation only needs testing when the ids in the URLs are sequential numbers', false],
      ], 'On the buggy build read, cancel and pay were all open; a shared check can be missing from one route or bypassed by another. Assuming sharing is how gaps survive, security reviews do not replace regression tests, and random ids only slow guessing, they do not add a check.'),
    ],
  },

  /* ── CONTRACTS_MOCKS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_CONTRACTS_MOCKS',
    notes: `DabbaDash's orders service calls a UPI payment provider. Its Android app calls the orders service. Testing all three
together on a shared environment is slow, breaks when any one is down, and cannot make the provider time out on
demand. This lesson tests each piece alone, then uses a contract to make sure the pieces still fit.

## Three ways to replace a dependency

1. **Mock in-process.** Intercept the HTTP call inside the test process. In Python the responses library patches
   requests; you met the idea with unittest.mock in "Mocking and Isolating Code".
2. **A stub server.** A small fake service on a port, configured per test. DabbaDash's fake_provider is a 30-line
   Flask app; WireMock, MockServer and Prism (which serves an OpenAPI file) are the common tools.
3. **A contract.** A machine-checked record of what the consumer needs from the provider, verified against the real
   provider in its own pipeline.

## Mocking the provider with responses

The payment call is requests.post(f"{payment_url}/v1/collect", json=..., timeout=3). The test points the app at a
fake URL and tells responses what to return:

    @responses.activate
    def test_success_sends_the_right_request_and_marks_paid(client, order):
        responses.post(COLLECT, json={"payment_id": "pay_0001", "status": "SUCCESS"})
        r = client.post(f"/orders/{order['id']}/pay", json={"upi_vpa": "asha@okdabba"})
        assert r.status_code == 200 and r.get_json()["status"] == "PAID"
        assert json.loads(responses.calls[0].request.body) == {
            "amount_paise": 44000, "vpa": "asha@okdabba", "reference": f"DD-{order['id']}"}

Two things are checked: what the service did with the answer, and what it sent. The second half is the part
people forget; a mock that never looks at the request passes even when the amount sent is wrong.

The real value is in failures you cannot produce with the real provider:

    @pytest.mark.parametrize("mock, expected", [
        pytest.param(dict(json={"payment_id": "pay_0002", "status": "FAILED"}), 402, id="declined"),
        pytest.param(dict(status=500, json={"message": "internal"}), 502, id="provider-500"),
        pytest.param(dict(body="<html>gateway</html>", status=200), 502, id="html-not-json"),
        pytest.param(dict(body=requests.ConnectionError("refused")), 503, id="connection-refused"),
        pytest.param(dict(body=requests.Timeout("read timed out")), 503, id="timeout"),
    ])

Each case also asserts the order is still PLACED. The run:

    test_provider_failures_leave_the_order_unpaid[declined] PASSED
    test_provider_failures_leave_the_order_unpaid[provider-500] PASSED
    test_provider_failures_leave_the_order_unpaid[html-not-json] PASSED
    test_provider_failures_leave_the_order_unpaid[connection-refused] PASSED
    test_provider_failures_leave_the_order_unpaid[timeout] PASSED
    7 passed in 4.56s

## What a mock cannot tell you

The mock returns what you told it. If the provider changes "SUCCESS" to "success" next month, every mocked test
stays green and production stops marking orders paid. The same problem runs the other way: the Android team mocks
the orders service in their tests, and when the orders service drifts (BUG-4, total_paise as a string) their mocks
still send integers. Mocks are only as true as the last time someone checked them against the real thing.

## Consumer-driven contracts

Contract testing closes that gap. The idea, as Pact implements it:

1. The **consumer** (the Android app's API client) writes tests against a Pact mock server. Each interaction says:
   given this provider state, for this request, I need a response with these fields of these types. Running them
   produces a contract file (a "pact").
2. The pact is published to a **broker** (Pact Broker or PactFlow).
3. The **provider** (orders service) runs verification in its own pipeline: for each interaction it sets up the
   provider state, replays the request against the real service, and checks the response meets the consumer's
   expectations.
4. Before deploying either side, can-i-deploy asks the broker whether the versions about to meet have a verified
   contract.

Two principles make it work. Match on **type and shape, not exact values** (an integer like 22000, not 22000
itself), so the provider can use any data. And the consumer only lists **what it uses**; the provider may add
fields without breaking anyone.

## The idea, run by hand

Pact was not installed for this course, so the same mechanism was written in about 90 lines of Python: a contract
file from the Android team and a verifier that sets up each provider state, replays the request in-process and
applies type, regex and each-like matchers. An excerpt of the contract:

    "providerState": "asha has a placed order",
    "request": {"method": "GET", "path": "/orders/{order_id}", "as": "asha"},
    "response": {"status": 200, "body": {
        "id": {"match": "type", "example": 101},
        "status": {"match": "regex", "regex": "^(PLACED|PAID|CANCELLED)$"},
        "total_paise": {"match": "type", "example": 22000},
        "items": {"match": "eachLike", "example": {"name": "Chicken Biryani", "qty": 1}}}}

Verification against the buggy orders service:

    FAIL a customer reads one of their orders
          body.total_paise: expected int like 22000, got '22000'
    FAIL a customer reads an order that is not theirs
          status: expected 404, got 200
    dabba-android -> orders-api: 0 passed, 2 failed

and against the fixed build, "2 passed, 0 failed". The provider's pipeline would have stopped the schema drift
before the Android release, without either team running the other's code.

## With pact-python (from the documentation, not run)

pact-python 3 writes the consumer side roughly like this; check the current documentation before you copy it:

    from pact import Pact, match

    pact = Pact("dabba-android", "orders-api").with_specification("V4")
    (pact.upon_receiving("a customer reads one of their orders")
         .given("asha has a placed order")
         .with_request("GET", "/orders/101")
         .will_respond_with(200)
         .with_body({"id": match.int(101), "total_paise": match.int(22000)}))

    with pact.serve() as srv:
        assert get_order(srv.url, 101).total_paise == 22000
    pact.write_file("pacts")

## Choosing

Mock the provider in the service's own tests to cover every failure path quickly. Use a stub server when a test
needs real HTTP (timeouts, a browser test). Add a contract wherever two teams deploy independently. Keep a handful
of end-to-end smoke tests on a real environment for the wiring that neither can see.`,
    workedExample: `**Scenario.** The UPI provider sometimes takes 10 seconds to answer. Prove that DabbaDash gives up after its
3-second timeout, tells the customer to retry, and does not mark the order paid.

**Step 1: a stub that can be slow on request.** The fake provider is a Flask app with a MODE setting; in "slow" mode
it sleeps 4 seconds before answering. It runs on a free port in a session fixture, and an autouse fixture resets it
to "success" before every test, so one test's mode cannot leak into the next.

**Step 2: the test.**

    def test_slow_provider_gives_503_not_a_hang(base_url, asha, place_order, provider):
        provider.app.config["MODE"] = "slow"
        order = place_order(asha)
        r = asha.post(f"{base_url}/orders/{order['id']}/pay", json={"upi_vpa": "asha@okdabba"}, timeout=10)
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "PAYMENT_PROVIDER_UNAVAILABLE"
        assert r.elapsed.total_seconds() < 5

The client timeout (10 s) is longer than the app's (3 s) on purpose: the test is about the app's timeout, so the
test must wait long enough for the app to give up first.

**Step 3: run it.** It passed; pytest --durations showed

    3.07s call     test_payments.py::test_slow_provider_gives_503_not_a_hang

which is the 3-second timeout plus a little. If the app had no timeout, the call would have taken the full 4
seconds of the stub, and the elapsed assertion would have failed.

**Step 4: why a stub server here and not responses?** responses can raise requests.Timeout instantly, and the
in-process test does that too. It proves the app handles the exception. The stub proves the timeout is actually
configured: that is a different claim, and only real waiting on a real socket tests it.

**One more assertion worth adding.** Check the order is still PLACED afterwards, and remember the real-world
follow-up: the provider may have collected the money after DabbaDash gave up, so the team needs a reconciliation
job, and that job needs its own tests.`,
    mcqs: [
      mcq('A responses mock returns SUCCESS for the provider call, and the test only checks that the order became PAID. What can still be wrong?', [
        ['The service may have sent the wrong amount or reference to the provider', true],
        ['The responses library may have let the request reach the real provider', false],
        ['The order may have been marked PAID before responses received the call', false],
        ['The mock may have returned a status code other than the one it was given', false],
      ], 'A mock answers whatever it is asked, so the test must also inspect responses.calls to verify what was sent (amount_paise 44000, the right reference). responses blocks unmatched real calls, the order changes only after the reply, and the mock returns exactly what was registered.'),
      mcq('All DabbaDash payment tests mock the provider, and all pass. The provider renames "SUCCESS" to "success". What happens?', [
        ['Mocked tests stay green while production stops marking orders paid', true],
        ['Mocked tests fail at once, because responses checks the real provider', false],
        ['The Python requests library raises an error on the unexpected value', false],
        ['Nothing, because the comparison of status strings ignores letter case', false],
      ], 'Mocks repeat what the test author wrote, so they cannot notice a change in the real service; a contract verified against the provider, or a smoke test against it, can. responses never contacts the real service, requests does not inspect JSON values, and the code compares with != "SUCCESS".'),
      mcq('In consumer-driven contract testing, who runs the verification against the real orders service?', [
        ['The provider\'s pipeline, replaying each consumer interaction', true],
        ['The consumer\'s pipeline, calling the shared QA environment', false],
        ['The broker, which calls every provider on a nightly schedule', false],
        ['A QA engineer, by importing the pact file into Postman', false],
      ], 'The consumer\'s tests produce the pact; the provider verifies it in its own build, against its real code, with provider states set up. The consumer never needs the provider running, the broker stores and reports but does not call services, and manual Postman runs are not verification.'),
    ],
    checkpoint: [
      mcq('Why does a contract match total_paise by type, with 22000 only as an example, rather than by exact value?', [
        ['The provider may use any data, and the consumer only needs an integer there', true],
        ['Exact values cannot be stored inside a pact file in JSON format', false],
        ['Type matching runs faster when the provider verification starts', false],
        ['The broker rejects pacts that contain literal numbers in bodies', false],
      ], 'The consumer depends on the shape, not on one order\'s amount; exact values would force the provider to reproduce identical data and make the contract brittle. Pact files can hold literals, speed is not the reason, and brokers accept any valid pact.'),
      mcq('Which situation most needs a stub server rather than an in-process mock of the payment provider?', [
        ['Proving the app\'s 3-second timeout is really set, by making the provider slow', true],
        ['Checking that a declined payment returns 402 and leaves the order unpaid', false],
        ['Checking that a provider 500 is reported to the caller as a 502 response', false],
        ['Checking the JSON body the service sends to the provider on a payment', false],
      ], 'Only real waiting on a socket shows whether a timeout is configured; an in-process mock raises Timeout instantly whatever the setting. Declines, 500s and the request body are all covered quickly by responses in-process.'),
      mcq('The Android team and the orders team deploy independently. Which practice stops schema drift reaching the app?', [
        ['A consumer contract that the orders pipeline verifies before every deploy', true],
        ['More mocks of the orders service in the test suite of the Android app', false],
        ['A weekly manual regression run of the app against the staging service', false],
        ['A rule that the orders team must not change any response field at all', false],
      ], 'Verification in the provider\'s pipeline (plus can-i-deploy) fails the orders build the moment it breaks what Android uses, as the hand-run verifier did for total_paise. More mocks hide drift, weekly manual runs are late, and freezing every field blocks harmless additions.'),
    ],
  },

  /* ── REST_ASSURED ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_REST_ASSURED',
    notes: `Many service companies and banks in India run their automation in Java: Selenium with TestNG for the UI ("Selenium
with Java" in this track) and REST Assured for APIs. Interviews for those roles ask for it by name. The good news:
nothing about what to test changes. This lesson writes the DabbaDash tests again in Java.

**What was run.** There was no Maven, REST Assured or TestNG on the machine used for this course. The REST Assured
and TestNG code below was written from their documentation and was not compiled against the libraries; treat it as
a careful sketch and run it in your own project. The plain-Java check at the end uses only the JDK and was compiled
and run against DabbaDash with JDK 19; its output is real.

## The project

A Maven project with four test dependencies, added from Maven Central at their current versions:

    io.rest-assured:rest-assured               (the DSL)
    io.rest-assured:json-schema-validator      (matchesJsonSchemaInClasspath)
    com.fasterxml.jackson.core:jackson-databind (turns Map bodies into JSON)
    org.testng:testng                          (the runner)

Schemas go under src/test/resources/schemas, so order.json is found on the classpath.

## given / when / then

REST Assured reads like the test cases you designed: given a request, when it is sent, then the response matches.

    import static io.restassured.RestAssured.given;
    import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
    import static org.hamcrest.Matchers.*;

    @Test(groups = "smoke")
    public void placeOrderReturns201WithLocation() {
        given().spec(asha)
            .body(Map.of("items", List.of(Map.of("item_id", 2, "qty", 2)),
                         "address", "Flat 4B, Koramangala"))
        .when().post("/orders")
        .then().log().ifValidationFails()
            .statusCode(201)
            .header("Location", startsWith("/orders/"))
            .body("status", equalTo("PLACED"))
            .body("total_paise", equalTo(18000))
            .body(matchesJsonSchemaInClasspath("schemas/order.json"));
    }

body("total_paise", ...) takes a GPath expression: "items[0].qty", "items.name" (all names), "error.code".
log().ifValidationFails() prints the request and response only when something fails, which is what you want in CI.

## A request specification instead of copy-paste

    private static final String BASE = System.getProperty("baseUrl", "http://127.0.0.1:5187");
    private RequestSpecification asha, ravi;

    private String login(String email, String password) {
        return given().baseUri(BASE).contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
            .when().post("/auth/login")
            .then().statusCode(200)
            .extract().path("access_token");
    }

    @BeforeClass
    public void setUp() {
        asha = new RequestSpecBuilder().setBaseUri(BASE).setContentType(ContentType.JSON)
            .addHeader("Authorization", "Bearer " + login("asha@example.test", "asha-pass-1")).build();
        ravi = new RequestSpecBuilder().setBaseUri(BASE).setContentType(ContentType.JSON)
            .addHeader("Authorization", "Bearer " + login("ravi@example.test", "ravi-pass-2")).build();
    }

This is the Java version of the Python login fixture: one place knows how to log in, every test reuses the spec.
The base URL comes from a system property (mvn test -DbaseUrl=...), never hard-coded per environment.

## Negative cases with a DataProvider

TestNG's @DataProvider is parametrize:

    @DataProvider(name = "badQuantities")
    public Object[][] badQuantities() {
        return new Object[][] { {0}, {-1}, {21} };
    }

    @Test(dataProvider = "badQuantities", groups = "regression")
    public void invalidQuantityIs400(int qty) {
        given().spec(asha)
            .body(Map.of("items", List.of(Map.of("item_id", 2, "qty", qty)), "address", "Flat 4B"))
        .when().post("/orders")
        .then().statusCode(400).body("error.code", equalTo("VALIDATION_ERROR"));
    }

## Extracting values and the two-user test

    @Test(groups = "regression")
    public void customerCannotReadAnotherCustomersOrder() {
        int id = given().spec(asha)
                .body(Map.of("items", List.of(Map.of("item_id", 6, "qty", 1)), "address", "Flat 4B"))
            .when().post("/orders")
            .then().extract().path("id");
        given().spec(ravi).when().get("/orders/{id}", id).then().statusCode(404);
    }

extract().path(...) pulls a value out for the next call, like the Postman variable chain. "/orders/{id}" with id as
an argument fills a path parameter and encodes it properly.

## Running

    mvn test -DbaseUrl=http://127.0.0.1:5187 -Dgroups=smoke

Surefire runs the TestNG tests; groups select smoke or regression, and the surefire reports (XML and HTML) go to
CI. Allure has a REST Assured filter that attaches every request and response to the report.

## The same checks with only the JDK (compiled and run)

To check the logic without the libraries, the four key checks were written with java.net.http.HttpClient (Java 11+).
The heart of it:

    HttpResponse<String> created = send("POST", "/orders", asha,
        "{\\"items\\":[{\\"item_id\\":2,\\"qty\\":2}],\\"address\\":\\"Flat 4B, Koramangala\\"}");
    check("place order is 201", created.statusCode() == 201, "got " + created.statusCode());

Against the buggy build:

    FAIL place order is 201 -> got 200
    FAIL total_paise is a JSON number -> got "18000"
    FAIL another customer gets 404 -> got 200
    PASS no token is 401
    3 check(s) failed

and against the fixed build, four PASS lines and "all checks passed". Writing JSON by hand in strings and pulling
fields out with a regular expression is exactly the pain REST Assured removes; it is also a useful interview
answer to "what does REST Assured give you over plain HttpClient?"

## Python or Java?

Use whatever the rest of the team's automation uses, so one framework, one report and one set of helpers serve
everyone. The design (literal expected values, schemas, two-user tests, mocks for dependencies) is identical.`,
    mcqs: [
      mcq('In REST Assured, how do you assert that the error code in {"error": {"code": "VALIDATION_ERROR"}} is right?', [
        ['.body("error.code", equalTo("VALIDATION_ERROR"))', true],
        ['.body(equalTo("error.code=VALIDATION_ERROR"))', false],
        ['.header("error.code", equalTo("VALIDATION_ERROR"))', false],
        ['.statusCode(equalTo("VALIDATION_ERROR"))', false],
      ], 'body(path, matcher) evaluates a GPath expression on the JSON body, and error.code walks into the nested object. body(matcher) alone compares the whole body text, header() reads HTTP headers, and statusCode takes the numeric status.'),
      mcq('What is the TestNG equivalent of pytest.mark.parametrize for running invalidQuantityIs400 with 0, -1 and 21?', [
        ['A @DataProvider that returns the values, named in @Test(dataProvider = ...)', true],
        ['Three separate @Test methods, each with one hard-coded quantity in its body', false],
        ['A @BeforeMethod that changes a shared quantity field before each invocation', false],
        ['A groups attribute listing the three quantities on the @Test annotation', false],
      ], 'A data provider supplies rows of arguments and TestNG invokes the test once per row, reporting each. Copying methods duplicates code, mutating shared fields in @BeforeMethod couples tests, and groups select tests rather than supplying data.'),
      mcq('Why does the REST Assured suite build a RequestSpecification for each user in @BeforeClass?', [
        ['Base URI, content type and token are set once and reused by every test', true],
        ['REST Assured refuses to send a request unless a specification is given', false],
        ['A specification makes every test in the class run in parallel threads', false],
        ['TestNG needs a specification object to generate its HTML reports', false],
      ], 'The spec is the Java form of a login fixture: one place knows the base URL and how to authenticate. given() works without a spec, parallelism is a TestNG setting, and reports do not depend on specs.'),
    ],
    checkpoint: [
      mcq('A REST Assured test fails in CI and the log shows nothing about the request or response. Which addition helps most without flooding passing runs?', [
        ['.log().ifValidationFails() in the then() part of the test', true],
        ['.log().all() in the given() part of every test in the suite', false],
        ['A System.out.println of the base URI before each test runs', false],
        ['Running the whole suite again locally with a debugger attached', false],
      ], 'ifValidationFails prints the request and response only for failing assertions, so CI logs stay readable. log().all() prints everything for every test, printing the base URI says little, and a local debugger may not reproduce a CI-only failure.'),
      mcq('The plain-JDK check printed FAIL total_paise is a JSON number -> got "18000". What would the REST Assured equivalent be?', [
        ['.body("total_paise", isA(Integer.class)) or a JSON schema match on the body', true],
        ['.body("total_paise", equalTo("18000")) so that the string form is accepted', false],
        ['.header("Content-Type", containsString("json")) on the order detail response', false],
        ['.statusCode(200) followed by extract().asString() on the order detail response', false],
      ], 'The defect is a type change, so the assertion must check the type: a Hamcrest isA matcher or, better, the shared order schema. equalTo("18000") would bless the bug, Content-Type says nothing about field types, and extracting a string asserts nothing.'),
      mcq('A team\'s UI automation is Selenium with Java and TestNG. Which choice for their new API tests is usually best?', [
        ['REST Assured with TestNG, sharing the reports and helpers', true],
        ['Python with pytest, because API testing is easier there', false],
        ['Postman only, because Java API tests are hard to read', false],
        ['JMeter, because it can also send requests to REST APIs', false],
      ], 'Staying in one language and runner gives one CI setup, one report and shared utilities. pytest is great but splits the team\'s tooling here, Postman alone is weak for a regression suite, and JMeter is a load-testing tool.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_DEBUGGING',
    notes: `Six things that went wrong while building the DabbaDash API tests. In most of them the API was fine and the test, the
environment or the mock was not; two of them made a test pass that should have failed, which is the worst kind.
Every message below is real output from requests, pytest, jsonschema, responses or Werkzeug.

## 1. A 404 for a route that exists

**Symptom.** The Postman stand-in runner logged in against http://127.0.0.1:5055 and got:

    -> Login as Asha  POST http://127.0.0.1:5055/auth/login [404, 609ms]
    SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON

The route exists; the in-process tests had just passed against it. The server's own log showed no request at all.

**Cause.** Another local process was already answering on port 5055, so the request never reached DabbaDash. On a
team this is the same mistake as pointing at the wrong environment: a stale base_url, a teammate's server, staging
instead of QA.

**Fix.** Read the evidence before the code: the server's access log (no line means it was not your server), the
Server header, and a health endpoint that returns the app's name and version. Start test servers on port 0 (any
free port) as the pytest fixture does, and print base_url at the start of every run. After moving to an unused
port, the same collection ran: "assertions: 12 executed, 5 failed", the five being real defects.

## 2. JSONDecodeError instead of a useful failure

**Symptom.**

    requests.exceptions.JSONDecodeError: Expecting value: line 1 column 1 (char 0)

**Cause.** The test called r.json() on a response that was not JSON. Here it was a PUT that the API does not
support: 405 text/html; charset=utf-8, Allow: HEAD, OPTIONS, GET. A typo in the path (/order/101) gives the same
crash with a 404 HTML page.

**Fix.** Assert the status code first, with the body in the message, so the failure says what came back:

    assert r.status_code == 200, f"{r.status_code} {r.headers.get('Content-Type')} {r.text[:200]}"

And report the HTML error body itself as a defect if the contract promises JSON errors everywhere.

## 3. A valid order rejected as "not a JSON object"

**Symptom.** A test that builds a correct order gets 400 {'error': {'code': 'VALIDATION_ERROR', 'message': 'Body must
be a JSON object'}}.

**Cause.** requests.post(url, data={...}). With data=, a dict is form-encoded:

    sent Content-Type: application/x-www-form-urlencoded | body sent: items=item_id&items=qty&address=Flat+4B

The nested list was flattened into nonsense and no JSON was sent.

**Fix.** json={...}: it serialises the body and sets Content-Type: application/json. Print r.request.headers and
r.request.body when a request is rejected; they show what really went over the wire.

## 4. Passes alone, fails in the suite

**Symptom.** test_orders.py alone: 18 passed. The whole suite:

    AssertionError: could not place order: 401 {"error":{"code":"TOKEN_EXPIRED","message":"Token has expired"}}
    22 failed, 9 passed in 2.61s

**Cause.** To save logins, someone made the asha fixture session-scoped. test_auth.py runs first and its expiry test
moves the shared fake clock 900 seconds forward. Every later test reused Asha's now-expired token.

**Fix.** Function-scoped login fixtures (logging in costs milliseconds), or reset the clock in the expiry test's
teardown. A test that changes shared state (the clock, a feature flag, a config) must put it back. Run the suite in
random order now and then (pytest-randomly) to find these couplings before CI does.

## 5. A schema that can never fail

**Symptom.** The schema test has never failed, even on the build where total_paise was a string.

**Cause.** A typo:

    broken = {"type": "object", "required": ["id"], "proprties": {"total_paise": {"type": "integer"}}}
    validate({"id": 101, "total_paise": "22000"}, broken)
    -> broken schema: drifted body PASSED validation

JSON Schema ignores keywords it does not know, so "proprties" is silently ignored and nothing is checked.

**Fix.** Spell it properties, and prove every schema can fail: keep one test that validates a known-bad body and
expects ValidationError. With the fix: '22000' is not of type 'integer'.

## 6. A timeout test that passes for the wrong reason

**Symptom.** The test "provider timeout gives 503" passes. Then someone notices the mocked URL is
https://pay.example.test/v1/colect.

**Cause.** The mock never matched. responses refused the real call with its own ConnectionError, which the app also
turns into 503:

    status: 503 PAYMENT_PROVIDER_UNAVAILABLE | calls recorded: 1
    what really happened: ConnectionError Connection refused by Responses - the call doesn't match any registered mock.

**Fix.** Make the mock prove it was used. With RequestsMock(assert_all_requests_are_fired=True) the same test fails:

    Not all requests have been executed [('POST', 'https://pay.example.test/v1/colect')]

or assert on responses.calls[0].request.url. Any test whose expected outcome is "an error" deserves a second
assertion that the error came from where you think.`,
    mcqs: [
      mcq('A login request to the QA API returns a Werkzeug 404 HTML page, but the route exists and the API\'s own log shows no request. What should the tester check first?', [
        ['Which server is answering at that base URL and port', true],
        ['Whether the login route was renamed in the last deploy', false],
        ['Whether the password in the environment file has expired', false],
        ['Whether the JSON body is missing a required email field', false],
      ], 'No log line means the request never reached this API, so something else is listening there or the base URL is wrong. A renamed route or a bad body would be logged by the API, and a wrong password gives 401, not 404.'),
      mcq('The DabbaDash suite fails with 22 errors, all "401 TOKEN_EXPIRED", but each file passes alone. What is the most likely cause?', [
        ['A shared login token plus a test that moves the shared clock forward', true],
        ['The API is overloaded when the whole suite runs, so tokens get dropped', false],
        ['pytest runs files in parallel by default and the logins overwrite each other', false],
        ['The token lifetime on the server is shorter than the total run time of the suite', false],
      ], 'A session-scoped token reused after the expiry test advanced the fake clock 900 seconds explains a TOKEN_EXPIRED error that appears only in the full run. Load does not expire tokens, pytest runs serially unless xdist is used, and the whole suite takes seconds, not fifteen minutes.'),
      mcq('A jsonschema test has passed for months, including on a build where total_paise was a string. What should be checked?', [
        ['That the schema has no misspelled keywords, by validating a known-bad body', true],
        ['That jsonschema was upgraded to its newest release on every CI machine', false],
        ['That the API returns Content-Type application/json for the order body', false],
        ['That the test calls validate() before the status code is asserted', false],
      ], 'Unknown keywords such as "proprties" are ignored, so the schema checks nothing; one negative test with a deliberately bad body proves the schema can fail. Upgrades, content type and assertion order would not make a correct schema accept a string.'),
      mcq('A test expecting 503 on a provider timeout passes, but the mocked URL has a typo. Why did it pass?', [
        ['The unmatched call raised a ConnectionError, which the app also maps to 503', true],
        ['responses matches URLs by prefix only, so the typo still matched the mock', false],
        ['The real provider was reached and happened to be timing out at that moment', false],
        ['The test client retried the request and the second attempt matched the mock', false],
      ], 'responses refuses unmatched requests with its own ConnectionError, and DabbaDash turns any ConnectionError into 503, so the expected outcome appeared for the wrong reason. Matching is on the full URL, responses blocks real network calls, and nothing retried.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_PRACTICE',
    notes: `Eight exercises on DabbaDash. Try each before reading the answer. All code was run against the app.

## 1. Pick the status code (easy)

What should DabbaDash answer? (a) an order is created; (b) qty is "two"; (c) no token; (d) a customer calls
/admin/orders; (e) Ravi requests Asha's order; (f) cancel an order that is already CANCELLED; (g) the payment
provider does not answer within 3 seconds; (h) the provider answers with an HTML page; (i) the provider declines.

**Answer.** (a) 201 with Location; (b) 400 VALIDATION_ERROR (some APIs use 422; follow the contract and be
consistent); (c) 401; (d) 403; (e) 404, per DabbaDash's contract; (f) 409 INVALID_STATE; (g) 503; (h) 502; (i) 402.
The point is not memorising codes but checking the exact one the contract promises.

## 2. Boundaries for paging (easy)

GET /menu takes page (at least 1) and per_page (1 to 50). List the values to test.

**Answer.** per_page 0, 1, 50, 51; page 0, 1, a page past the end, and a non-number ("two"). Expected: 400 for 0,
51 and "two"; 200 otherwise. A page past the end is not an error: page 4 of 12 items at 5 per page returned 200
{'items': [], 'page': 4, 'per_page': 5, 'total': 12}.

## 3. Walk the pages (medium)

Write a test that proves the pages neither repeat nor miss an item.

**Answer.**

    def test_menu_pages_do_not_overlap_and_cover_everything(base_url, anon):
        seen = []
        for page in (1, 2, 3):
            r = anon.get(f"{base_url}/menu", params={"page": page, "per_page": 5})
            validate(r.json(), MENU_PAGE)
            seen += [m["id"] for m in r.json()["items"]]
        assert len(seen) == len(set(seen)), f"repeated ids: {seen}"
        assert sorted(seen) == list(range(1, 13))

On the buggy build: AssertionError: repeated ids: [1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12].

## 4. A schema for a menu item (medium)

**Answer.**

    ITEM = {"type": "object", "required": ["id", "name", "price_paise", "veg"],
            "properties": {"id": {"type": "integer"}, "name": {"type": "string", "minLength": 1},
                           "price_paise": {"type": "integer", "minimum": 0}, "veg": {"type": "boolean"}},
            "additionalProperties": False}

All 12 items validated. Probing it: {"id": True} gives "True is not of type 'integer'" and {"veg": 1} gives "1 is
not of type 'boolean'", so jsonschema keeps booleans and integers apart. But {"price_paise": 9000.0} passed: JSON
Schema counts a number with a zero fraction as an integer. If 9000.0 must be rejected, assert
isinstance(value, int) in Python as well.

## 5. Let the computer find the boundary (hard)

Write a property-based test with hypothesis: any qty from -1000 to 1000 is accepted only if it is 1 to 20.

**Answer.**

    @settings(max_examples=200, deadline=None)
    @given(qty=st.integers(min_value=-1000, max_value=1000))
    def test_qty_outside_1_to_20_is_rejected_and_inside_is_accepted(qty):
        r = c.post("/orders", headers=H, json={"items": [{"item_id": 1, "qty": qty}], "address": "Flat 4B"})
        if 1 <= qty <= 20:
            assert r.status_code in (200, 201)
            assert r.get_json()["total_paise"] == qty * 4000
        else:
            assert r.status_code == 400, f"qty={qty} accepted with total {r.get_json().get('total_paise')}"

On the buggy build hypothesis found a failure and shrank it to the smallest example:

    E   AssertionError: qty=0 accepted with total 0
    E   Failing test case: test_qty_outside_1_to_20_is_rejected_and_inside_is_accepted(
    E       qty=0,

On the fixed build: 1 passed. (c is a Flask test client, so 200 runs take about three seconds.)

## 6. A Postman check for a state rule (easy)

Write the test script for "cancel an already cancelled order".

**Answer.**

    pm.test('second cancel is 409', () => pm.response.to.have.status(409));
    pm.test('code is INVALID_STATE', () => pm.expect(pm.response.json().error.code).to.eql('INVALID_STATE'));

The request before it in the collection cancels the same {{order_id}} once and expects 200.

## 7. Idempotency (medium)

**Answer.**

    def test_same_idempotency_key_does_not_create_a_second_order(base_url, asha):
        body = {"items": [{"item_id": 6, "qty": 1}], "address": ADDR}
        key = {"Idempotency-Key": "a1f9c2e0-retry-test"}
        first = asha.post(f"{base_url}/orders", json=body, headers=key)
        second = asha.post(f"{base_url}/orders", json=body, headers=key)
        assert second.json()["id"] == first.json()["id"]
        mine = asha.get(f"{base_url}/orders").json()["items"]
        assert [o["id"] for o in mine].count(first.json()["id"]) == 1

Follow-ups worth a test: the same key from a different user must not return Asha's order, and the same key with a
different body should be refused rather than silently replayed (ask what the contract says).

## 8. Two users, one cancel (medium)

**Answer.**

    def test_customer_cannot_cancel_another_customers_order(base_url, asha, ravi, place_order):
        order = place_order(asha)
        r = ravi.post(f"{base_url}/orders/{order['id']}/cancel")
        assert r.status_code == 404
        assert asha.get(f"{base_url}/orders/{order['id']}").json()["status"] == "PLACED"

The second assertion is the important one: on the buggy build Ravi got 200 and Asha's dinner was cancelled.`,
    mcqs: [
      mcq('DabbaDash\'s payment provider answers 200 with an HTML page instead of JSON. Which status should DabbaDash return to its own client?', [
        ['502, because the upstream service sent an unusable answer', true],
        ['200, because the provider did technically answer with 200', false],
        ['400, because the request to the provider must have been bad', false],
        ['503, because the provider service is down for maintenance', false],
      ], '502 Bad Gateway means an upstream answered with something unusable, which is what DabbaDash does (PAYMENT_PROVIDER_ERROR). Passing on 200 would claim success, 400 blames the client who did nothing wrong, and 503 is for an upstream that did not answer at all.'),
      mcq('GET /menu?page=4&per_page=5 on a 12-item menu returns 200 with an empty items list. How should the tester treat it?', [
        ['As correct: a page past the end is an empty page, not an error', true],
        ['As a defect: it should be 404 because page 4 does not exist', false],
        ['As a defect: it should repeat the last page so the list is not empty', false],
        ['As a defect: it should be 400 because 4 is above the page limit', false],
      ], 'Most paging contracts, including DabbaDash\'s, return an empty list past the end so clients can stop when items is empty. 404 is a possible design but not this contract, repeating data would mislead clients, and there is no upper limit on page, only on per_page.'),
      mcq('A menu item schema says price_paise is integer, and {"price_paise": 9000.0} passes validation. Why?', [
        ['JSON Schema counts a number with a zero fraction as an integer', true],
        ['jsonschema converts every number to an int before checking it', false],
        ['The minimum keyword overrides the type keyword on that field', false],
        ['Python reads 9000.0 from JSON as the integer 9000 automatically', false],
      ], 'Since draft 6, JSON Schema defines integer by value, so 9000.0 qualifies; an extra isinstance(value, int) check rejects it if the contract forbids it. jsonschema does not convert values, minimum and type are both applied, and json.loads gives a float for 9000.0.'),
      mcq('The hypothesis test on qty failed and reported qty=0. Why 0, when it tried many negative numbers too?', [
        ['hypothesis shrinks a failing input to the simplest example that still fails', true],
        ['hypothesis tries values in order from zero upwards and stops at the first one', false],
        ['Negative values were filtered out by the strategy before any were tried', false],
        ['The API only fails on exactly zero and accepts every negative quantity', false],
      ], 'After finding any failure, hypothesis searches for a smaller failing input and reports that, which is why it printed qty=0. It generates values in a varied order, the strategy included -1000 to 1000, and the buggy API accepted negatives too (qty -2 gave a total of -44000).'),
      mcq('In practice exercise 8, why does the test read Asha\'s order back after Ravi\'s cancel attempt?', [
        ['A 404 alone does not prove the order was left unchanged', true],
        ['Ravi\'s token expires right after the cancel attempt', false],
        ['The cancel endpoint never returns a usable status code', false],
        ['Reading it back resets the order to PLACED for later tests', false],
      ], 'An API can refuse with the right code and still have changed the data; checking Asha\'s order is still PLACED proves the defence held. Token lifetime is unrelated, the cancel endpoint returns proper codes, and a GET changes nothing.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_INTERVIEW_QUESTION',
    notes: `Four questions that come up in QA and SDET interviews at product companies, GCCs and service companies, with an
answer that scores well and the follow-up a good interviewer asks next. Say each aloud in about two minutes.

## Q1. "Here is POST /orders. How would you test it?"

**Model answer.** "First I would read the contract: request fields and their rules, success code, error format,
who may call it. Then I group the tests. Positive: one item, several items, the maximum quantity, and I assert 201,
the Location header, the total as a literal value and the body against a JSON schema. Negative, per field, with
partitions and boundaries: quantity 0, 1, 20, 21, a string, missing; address blank and at its length limit; empty
items; an unknown item; a body that is not JSON. Auth: no token, an expired token, and the order must not be
visible or changeable by another customer. Then behaviour: what a retry with the same idempotency key does, and
that the order shows up in GET /orders. I would prioritise money and other people's data first. On a demo app I
tested, that order of work found a negative total for quantity -2 and a customer able to read another's order."

**Follow-up.** "What would you not assert?" — "Values that change by design, like ids and timestamps; I check their
type and format instead. And I would not recompute the total with the same formula the code uses, I would use a
literal expected value."

## Q2. "What is the difference between 401 and 403, and how do you test that a user cannot see someone else's data?"

**Model answer.** "401 means the server does not know who I am: no token, an invalid one or an expired one. 403
means it knows and the answer is no, like a customer on an admin endpoint. For other people's data I need two test
accounts. I create an order as user A and request it as user B, and I do that for every verb on the resource: read,
update, cancel, pay. I expect 404 or 403, whichever the contract says, and I always read the object back as A to
prove nothing changed. This is the top item in the OWASP API Security Top 10, broken object-level authorisation,
and it is easy to miss because every response looks healthy. I only run these checks on systems we own or are
authorised to test."

**Follow-up.** "Why might an API return 404 rather than 403 there?" — "So a stranger cannot even confirm that the
object exists. I test that by comparing the response for someone else's object with the response for an id that
does not exist; they should be identical."

## Q3. "Postman or code? How do your API tests run in CI?"

**Model answer.** "Both, for different jobs. Postman is great for exploring and sharing an API and for a small smoke
collection; Newman runs that collection in the pipeline and fails the build with a non-zero exit code, with a JUnit
report for the CI server. The regression suite I keep in code, pytest with requests in my case, because fixtures,
data factories, shared helpers and code review scale better than hundreds of small scripts. In CI the suite takes
its base URL and secrets from the pipeline, starts from known test data, runs in a few minutes and publishes a
report. For a Java team the same suite would be REST Assured with TestNG."

**Follow-up.** "How do you keep the suite fast as it grows?" — "Create data through the API rather than the UI,
keep each test independent so it can run in parallel, mock slow third parties in the service-level tests, and
measure: on a small suite I found parallel workers made it slower, because each started its own server."

## Q4. "What is contract testing, and how is it different from mocking?"

**Model answer.** "A mock replaces a dependency with answers I wrote, which lets me test failures like timeouts
quickly; but the mock is only as true as the last time someone compared it with the real service. A
consumer-driven contract records what the consumer needs, field names and types, and the provider verifies that
contract against its real code in its own pipeline. If the provider changes a field type, its build fails before
the consumer sees it. Pact is the common tool, with a broker to share contracts and a can-i-deploy check. I use
mocks for the many failure cases, contracts where teams deploy independently, and a few end-to-end smoke tests."

**Follow-up.** "Why match by type rather than by exact value?" — "So the provider can verify with any data it
likes; the consumer cares that total is an integer, not that it is 22000."`,
    mcqs: [
      mcq('Asked how to test that one customer cannot see another\'s order, which answer shows the strongest understanding?', [
        ['Two accounts, every verb on the order, and a read-back as the owner afterwards', true],
        ['A single account that tries order ids one above and one below its own order', false],
        ['A scan of the API with a security tool, then a review of the tool\'s report', false],
      ], 'Object-level authorisation needs a second identity, coverage of every verb (read, cancel, pay) and proof that the owner\'s data did not change. One account probing nearby ids misses verbs and state, and a scanner cannot know which orders belong to whom.'),
      mcq('An interviewer asks what you would not assert in an API response. Which answer is best?', [
        ['Ids and timestamps by value; check their type and format instead', true],
        ['The status code, since the response body already shows the result', false],
        ['Error messages, since only the success path matters for users', false],
      ], 'Ids and timestamps change by design, so exact comparisons make tests fail every run; checking shape keeps them useful. The status code is a core claim, and error responses are part of the contract clients depend on.'),
      mcq('Asked "mocks or contracts?", which answer would a senior SDET give?', [
        ['Mocks for failure cases, contracts where teams deploy independently, plus a few end-to-end smoke tests', true],
        ['Contracts everywhere, since they make mocks unnecessary in every service-level test of the system', false],
        ['Mocks everywhere, since contracts only matter when two companies share one API across their systems', false],
      ], 'Each tool covers a different risk: mocks make rare failures cheap to test, contracts catch drift between independently deployed services, and smoke tests check the real wiring. Contracts do not replace failure-path mocks, and drift happens between teams in one company too.'),
    ],
  },

  /* ── MINI_PROJECT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_MINI_PROJECT',
    notes: `## The brief

You join the QA team at a fictional food-ordering start-up for its "Diwali Dhamaka" sale. The orders API takes
several times its normal traffic during the sale; a wrong total or a cross-customer leak would be front-page news on
social media within the hour. Your job: an API test suite that a teammate can run with one command, a Postman
collection the developers can use, and defect reports for what you find.

You will test an API you run locally on your own machine. Either build it yourself from the specification below in
Flask or FastAPI (about 200 lines, as DabbaDash is), or ask a classmate to build it and plant at least five defects
without telling you; they write the list of planted defects down in advance and seal it (a sealed file in a private
repository, or with your mentor). Testing your own planted bugs is weaker practice, because you know where to look,
so pair up if you can.

## The service under test

    POST /auth/login                    {email, password} -> {access_token, token_type, expires_in}
    GET  /restaurants                   paged list, public
    GET  /restaurants/{id}/menu         paged list of items, public
    POST /orders                        {restaurant_id, items: [{item_id, qty}], address, coupon?}
    GET  /orders, GET /orders/{id}      the caller's orders only
    POST /orders/{id}/cancel            only while PLACED or ACCEPTED
    POST /orders/{id}/pay               {upi_vpa}, calls the payment provider (with a 3-second timeout)
    PATCH /restaurant/orders/{id}       restaurant staff: ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY
    GET  /admin/orders                  support role only

Rules to test: qty 1 to 10 per item; one restaurant per order; coupon DIWALI50 gives 50% off up to Rs 150 on orders
of Rs 299 or more; delivery fee Rs 30 below Rs 199; all money in integer paise; errors as
{"error": {"code", "message"}}; Idempotency-Key supported on POST /orders and /pay; restaurant staff may only see
and change their own restaurant's orders.

## Data

Synthetic only: at least three customers, two restaurants with one staff account each, one support account, and a
menu of 15 to 20 items with prices that make the coupon and delivery boundaries reachable. Emails at example.test,
phone numbers from an agreed fake range, no real names of real people.

## Deliverables

1. **Test design** (TEST_DESIGN.md): the endpoint inventory, a risk ranking, partitions and boundaries for every
   field, the coupon and delivery rules as a decision table, the order states and allowed transitions, and the
   role-by-endpoint authorisation matrix.
2. **pytest suite**: fixtures for base URL, users and data factories; positive, negative (parametrised with ids),
   auth (401, 403, expiry with a controllable clock or a short QA lifetime), object-level authorisation for every
   verb with two users, mass-assignment checks, idempotency, pagination walks, and JSON Schemas for every response
   type including errors, each schema proven able to fail.
3. **Payment provider**: mocked with responses (success, decline, 500, non-JSON, connection error, timeout) and
   one stub-server test that proves the real 3-second timeout.
4. **A consumer contract**: for the two or three calls the mobile app makes, written as a contract file and verified
   against the provider, by hand as in the lesson or with Pact.
5. **Postman collection and environment**: a smoke pack of 8 to 12 requests with chained variables and test
   scripts, committed as JSON, with the Newman command (and its JUnit output if you can install Newman).
6. **Defect reports**: one per defect, with the exact request, response, expected result, severity and priority,
   and the test that reproduces it.
7. **README**: how to start the API and run everything with one command, plus the run output.
8. **Results**: the suite run against the build with defects and, if the builder provides one, against the fixed
   build; then the sealed list opened and compared with what you found.

## Milestones (about two and a half hours of focused work, spread over a week)

- **Day 1**: build or receive the API; explore it by hand; write the endpoint inventory and the risk ranking.
- **Day 2**: test design: partitions, decision table, state model, auth matrix.
- **Day 3**: the pytest framework and the positive and negative tests; first defects reported.
- **Day 4**: auth tests, schemas, idempotency and pagination; payment mocks and the stub timeout test.
- **Day 5**: the contract, the Postman collection, the README; open the sealed list and write the comparison.

## What reviewers look for

A suite that runs green on a correct build and red, with readable messages, on a broken one; tests that each make
one claim; literal expected values; no test depending on another's data; two-user tests that read state back; and
honesty about what was not tested and which planted defects you missed, with the technique that would have caught
each. Keep the authorisation work on your own local app: these are defensive checks, not attacks on anyone's
system.`,
    assignment: {
      title: 'Diwali Sale Readiness: An API Test Suite for a Food-Ordering Service',
      description: 'For a food-ordering API you run locally, with defects planted by someone else, design and automate positive, negative, authorisation, schema, idempotency and pagination tests in pytest; mock the payment provider and prove its timeout with a stub; verify a consumer contract; add a Postman smoke collection for Newman; and report every defect with evidence.',
      instructions: `1. Build the service from the specification in the brief, or receive it from a classmate with at least five planted defects sealed in advance; use synthetic data only.
2. Explore every endpoint by hand and write TEST_DESIGN.md: inventory, risk ranking, partitions and boundaries per field, the coupon and delivery decision table, the order state model and the role-by-endpoint authorisation matrix.
3. Build the pytest framework: base URL from configuration, function-scoped user fixtures, data factories, timeouts on every request, and shared JSON Schemas for every response type (each with a test proving it can fail).
4. Automate positive and parametrised negative tests with readable ids, idempotency and pagination walks, and state-transition tests that read the state back.
5. Automate authentication (401 cases, expiry at the boundary) and authorisation: 403 per the matrix, object-level checks for every verb with two users, and mass-assignment checks.
6. Mock the payment provider with responses for six outcomes, and add one stub-server test that proves the 3-second timeout with elapsed time.
7. Write a consumer contract for the mobile app's calls and verify it against the provider, by hand or with Pact; show it failing on a deliberately drifted field.
8. Commit a Postman smoke collection (8 to 12 requests, chained variables, test scripts) and environment, with the Newman command and its output if available.
9. Write a defect report for every defect found, open the sealed list, compare found against planted, explain each miss, and finish with a release recommendation for the sale.`,
      rubric: [
        { criterion: 'Test design and risk', description: 'A complete inventory and risk ranking; correct partitions and boundaries; a decision table for coupon and delivery fee; a state model; and a full authorisation matrix that drives the tests.', maxPoints: 15 },
        { criterion: 'pytest framework quality', description: 'Clean fixtures and factories, configuration from the environment, timeouts, readable parametrised ids, one claim per test, literal expected values, and a suite that runs with one command.', maxPoints: 20 },
        { criterion: 'Validation, schema and behaviour tests', description: 'Boundary and type negatives for every field, schemas for every response including errors and proven able to fail, idempotency, pagination walks and state transitions with read-back.', maxPoints: 20 },
        { criterion: 'Authentication and authorisation', description: 'Token cases and expiry at the boundary, 403 per the matrix, two-user object-level tests on every verb with state checks, and mass-assignment checks, all on the student\'s own local app.', maxPoints: 20 },
        { criterion: 'Mocks, contract and Postman', description: 'Six provider outcomes mocked with request assertions, a real timeout test on a stub, a verified consumer contract that fails on drift, and a working Postman smoke collection.', maxPoints: 15 },
        { criterion: 'Defects and honesty', description: 'Actionable defect reports with exact requests and responses; a precise found-versus-planted comparison with the technique that would have caught each miss; a clear release recommendation.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('The planted-defect list for the mini project is sealed before you start testing. Why?', [
        ['So the found-versus-planted comparison is honest and shows what your tests miss', true],
        ['So that the builder of the API is not able to fix the defects before you report them', false],
        ['So the API can be deployed to a public server for the duration of the project', false],
        ['So that your Postman collection can be generated automatically from the defect list', false],
      ], 'A list written in advance cannot be adjusted to match what you found, so the comparison measures your test design, including the misses. It has nothing to do with fixing speed, public deployment (everything runs locally) or generating collections.'),
      mcq('The coupon rule is "50% off up to Rs 150 on orders of Rs 299 or more". Which pair of order values tests the threshold?', [
        ['Rs 298.99 and Rs 299.00', true],
        ['Rs 150.00 and Rs 300.00', false],
        ['Rs 299.00 and Rs 600.00', false],
        ['Rs 0.00 and Rs 299.00', false],
      ], 'A boundary is tested on both sides at the smallest step, which in paise is 29899 and 29900. 150 is the cap on the discount, not the threshold; 600 tests the cap (50% of 600 = 300, capped at 150), and 0 is far from the edge.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'QA_API_TESTING_CHECKPOINT',
    notes: `Ten questions across the topic: what to test in an API, Postman and Newman, pytest with requests and jsonschema,
authentication and authorisation, contracts and mocks, and REST Assured. Answer without notes; the result shows
which lesson to revisit.`,
    checkpoint: [
      mcq('An API test for POST /orders checks only that the status is not 500. What is the main weakness?', [
        ['It passes for a wrong code such as 200 instead of 201, or 200 for invalid input', true],
        ['It fails whenever the server is slow, because 500 also covers server timeouts', false],
        ['It cannot run in CI, because the status code is only available inside Postman', false],
        ['It checks too much at once, since a status code covers the headers and body too', false],
      ], 'A test must assert the exact code the contract promises; "not 500" passed for both BUG-1 (200 on create) and BUG-2 (200 for qty 0). Slowness is not a 500, status codes are available to any client, and the status says nothing about headers or body.'),
      ck('REST_APIS', 'Which DabbaDash operation is not idempotent by HTTP\'s definition, and so needs an Idempotency-Key for safe retries?', [
        ['POST /orders, which creates a new order on each call', true],
        ['GET /orders/{id}, which reads one order of the caller', false],
        ['DELETE on a resource that was already deleted earlier', false],
        ['PUT replacing an order\'s address with the same value', false],
      ], 'GET, PUT and DELETE leave the same state however many times they are repeated; POST creates a new resource each time, so a retry on a slow network can double an order. A key lets the server recognise the retry and return the first result.'),
      ck('REST_APIS', 'A paginated endpoint returns {"items": [...], "page": 2, "per_page": 5, "total": 12}. What should page 2 contain if the API is correct?', [
        ['Items 6 to 10, with no item that also appears on page 1', true],
        ['Items 5 to 9, so that the client can see one item of overlap', false],
        ['Items 6 to 12, because the last page absorbs the remainder', false],
        ['Items 1 to 10, because each page includes all earlier pages', false],
      ], 'Offset paging puts items (page - 1) x per_page + 1 to page x per_page on each page: 6 to 10 here, with 11 and 12 on page 3. Overlap is the DabbaDash defect, the remainder goes on its own last page, and cumulative pages are not how offset paging works.'),
      mcq('In a Postman collection, how should the token from the login request reach the requests after it?', [
        ['The login test script stores it in a variable that later requests reference', true],
        ['Each later request logs in again inside its own pre-request script body', false],
        ['The token is pasted into the environment file before every collection run', false],
        ['Newman reads the token from the response and adds it to each request alone', false],
      ], 'Chaining through a variable set in the test script (pm.collectionVariables.set) is the standard pattern, and requests use Bearer {{asha_token}}. Logging in before every request is slow and noisy, pasted tokens expire, and Newman does not manage tokens on its own.'),
      mcq('Which practice keeps one bug from failing every test in a pytest API suite?', [
        ['Helpers assert only what they need, and one named test owns each claim', true],
        ['Every helper asserts the full response, so failures are found earlier', false],
        ['All tests share a single session-scoped order to reduce API calls made', false],
        ['Assertions are wrapped in try blocks so that the suite reaches the end', false],
      ], 'If the order helper demanded 201, BUG-1 would have failed thirty tests and hidden the rest; with r.ok in the helper, one test reported it. Full-response helpers spread one failure everywhere, a shared order couples tests, and swallowing assertions hides defects.'),
      mcq('A test validates every order response against a schema with "additionalProperties": false. What new defect class does that catch?', [
        ['Internal fields such as user_id or a cost price leaking into responses', true],
        ['A wrong total caused by multiplying quantity by the wrong item price', false],
        ['Orders that are returned to a different customer than the one who owns them', false],
        ['Slow responses that exceed the latency agreed with the mobile app team', false],
      ], 'Rejecting undeclared fields exposes data the API was never meant to return. A wrong total is still an integer, a cross-customer response has the same shape, and schemas do not measure time.'),
      mcq('Asha\'s token works at 899 seconds and must fail at 900. How is this best tested?', [
        ['Inject a fake clock and check both sides of the 900-second boundary', true],
        ['Sleep 900 seconds in a test that runs only in the nightly build job', false],
        ['Decode the token in the test and compare its expiry claim with now', false],
        ['Ask the identity team to confirm that expiry is configured correctly', false],
      ], 'A controllable clock tests the server\'s enforcement exactly and instantly, as test_token_stops_working_at_expiry does. Sleeping is slow and imprecise, reading the claim tests the token, not the server\'s check, and asking is not testing.'),
      mcq('Ravi\'s attempt to pay for Asha\'s order returns 404. Which extra assertion makes the test trustworthy?', [
        ['The provider received no collect call and Asha\'s order is still PLACED', true],
        ['The 404 body contains the message "No such order" in exactly that text', false],
        ['Ravi can still pay for his own orders afterwards using the same token', false],
        ['The response arrives faster than a successful payment would take', false],
      ], 'The danger is money moving or state changing behind a correct-looking refusal; checking the provider calls and the order state proves neither happened. The message text, Ravi\'s own payments and timing are separate questions.'),
      mcq('Why do teams that already mock a downstream service also add a consumer-driven contract?', [
        ['Mocks cannot detect when the real service changes; the contract is verified against it', true],
        ['Contracts run faster than mocks, so they replace the slow mocked tests in CI', false],
        ['Mocks cannot simulate error responses, while contracts can describe every error', false],
        ['Contracts let the consumer call the real provider in its own unit tests', false],
      ], 'A mock repeats what its author wrote, so drift such as total_paise becoming a string goes unnoticed; the provider verifying the consumer\'s contract fails its own build instead. Mocks are fast and simulate errors well, and contracts exist precisely so the consumer does not need the real provider.'),
      ck('REST_APIS', 'A customer requests an admin-only endpoint with a valid token. Which status code describes the refusal?', [
        ['403 Forbidden', true],
        ['401 Unauthorized', false],
        ['400 Bad Request', false],
        ['405 Method Not Allowed', false],
      ], 'The server knows who is calling and refuses on permission, which is 403. 401 is for missing or invalid credentials, 400 for a malformed request, and 405 for a method the route does not support at all.'),
    ],
  },
];
